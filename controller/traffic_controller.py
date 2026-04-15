# -*- coding: utf-8 -*-

from collections import deque
import time

from ryu.base import app_manager
from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, DEAD_DISPATCHER
from ryu.controller.handler import MAIN_DISPATCHER, set_ev_cls
from ryu.lib import hub
from ryu.lib.packet import arp
from ryu.lib.packet import ether_types
from ryu.lib.packet import ethernet
from ryu.lib.packet import packet
from ryu.ofproto import ofproto_v1_3
from ryu.topology import event
from ryu.topology.api import get_link, get_switch


class TrafficController(app_manager.RyuApp):

    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    def __init__(self, *args, **kwargs):
        super(TrafficController, self).__init__(*args, **kwargs)

        # Learning
        self.mac_to_port = {}
        self.global_mac = {}

        # Topology
        self.adjacency = {}
        self.switch_ports = {}
        self.interior_ports = {}
        self.access_ports = {}
        self.active_paths = {}

        # Monitoring
        self.datapaths = {}
        self.port_stats = {}
        self.link_load = {}
        self.traffic_history = {}

        self.congestion_threshold = 1000000
        self.min_congestion_load = 50000
        self.start_time = time.time()
        self.reroute_warmup = 10
        self.last_reroute_time = 0
        self.reroute_cooldown = 10
        self.flow_refresh_interval = 9

        self.monitor_thread = hub.spawn(self.monitor)

    # ---------------- FLOW INSTALL ----------------
    def add_flow(self, datapath, priority, match, actions,
                 idle_timeout=60, hard_timeout=120):
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        inst = [parser.OFPInstructionActions(
            ofproto.OFPIT_APPLY_ACTIONS, actions)]

        mod = parser.OFPFlowMod(
            datapath=datapath,
            priority=priority,
            idle_timeout=idle_timeout,
            hard_timeout=hard_timeout,
            match=match,
            instructions=inst
        )
        datapath.send_msg(mod)

    def delete_flow(self, datapath, priority, match):
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        mod = parser.OFPFlowMod(
            datapath=datapath,
            command=ofproto.OFPFC_DELETE_STRICT,
            priority=priority,
            out_port=ofproto.OFPP_ANY,
            out_group=ofproto.OFPG_ANY,
            match=match
        )
        datapath.send_msg(mod)

    # ---------------- TOPOLOGY ----------------
    def refresh_topology(self):
        switch_list = get_switch(self, None)
        link_list = get_link(self, None)

        self.switch_ports = {}
        self.interior_ports = {}
        self.access_ports = {}
        self.adjacency = {}

        for switch in switch_list:
            dpid = switch.dp.id
            ports = set()
            for port in switch.ports:
                ports.add(port.port_no)
            self.switch_ports[dpid] = ports
            self.interior_ports[dpid] = set()
            self.adjacency[dpid] = {}

        for link in link_list:
            src = link.src
            dst = link.dst

            self.adjacency.setdefault(src.dpid, {})
            self.adjacency.setdefault(dst.dpid, {})

            self.adjacency[src.dpid][dst.dpid] = src.port_no
            self.interior_ports.setdefault(src.dpid, set()).add(src.port_no)
            self.interior_ports.setdefault(dst.dpid, set()).add(dst.port_no)

        for dpid, ports in self.switch_ports.items():
            interior = self.interior_ports.get(dpid, set())
            self.access_ports[dpid] = set(
                [port for port in ports if port not in interior]
            )

    def get_path(self, src_dpid, dst_dpid):
        if src_dpid == dst_dpid:
            return [src_dpid]

        if src_dpid not in self.adjacency or dst_dpid not in self.adjacency:
            return None

        visited = set([src_dpid])
        queue = deque([(src_dpid, [src_dpid])])

        while queue:
            current, path = queue.popleft()

            for neighbor in self.adjacency.get(current, {}):
                if neighbor in visited:
                    continue

                next_path = path + [neighbor]

                if neighbor == dst_dpid:
                    return next_path

                visited.add(neighbor)
                queue.append((neighbor, next_path))

        return None

    def get_output_port(self, current_dpid, dst_dpid, dst_port):
        if current_dpid == dst_dpid:
            return dst_port

        path = self.get_path(current_dpid, dst_dpid)

        if not path or len(path) < 2:
            return None

        next_hop = path[1]
        return self.adjacency.get(current_dpid, {}).get(next_hop)

    def get_path_cost(self, path):
        if not path or len(path) < 2:
            return 0

        cost = 0
        for index in range(len(path) - 1):
            dpid = path[index]
            next_hop = path[index + 1]
            out_port = self.adjacency.get(dpid, {}).get(next_hop)
            if out_port is None:
                return None
            cost += self.link_load.get((dpid, out_port), 0)
        return cost

    def get_alternate_path(self, src_dpid, dst_dpid, current_path):
        if not current_path or len(current_path) < 2:
            return None

        best_path = None
        best_cost = None

        for index in range(len(current_path) - 1):
            avoid_src = current_path[index]
            avoid_dst = current_path[index + 1]

            visited = set([src_dpid])
            queue = deque([(src_dpid, [src_dpid])])

            while queue:
                current, path = queue.popleft()

                for neighbor in self.adjacency.get(current, {}):
                    if current == avoid_src and neighbor == avoid_dst:
                        continue

                    if neighbor in visited:
                        continue

                    next_path = path + [neighbor]

                    if neighbor == dst_dpid:
                        if next_path != current_path:
                            path_cost = self.get_path_cost(next_path)
                            if path_cost is not None:
                                if best_cost is None or path_cost < best_cost:
                                    best_path = next_path
                                    best_cost = path_cost
                        continue

                    visited.add(neighbor)
                    queue.append((neighbor, next_path))

        return best_path

    def install_path_flows(self, src_mac, dst_mac, path=None):
        if src_mac not in self.global_mac or dst_mac not in self.global_mac:
            return False

        src_dpid, src_port = self.global_mac[src_mac]
        dst_dpid, dst_port = self.global_mac[dst_mac]

        if path is None:
            path = self.get_path(src_dpid, dst_dpid)
        if not path:
            return False

        for index, dpid in enumerate(path):
            datapath = self.datapaths.get(dpid)
            if datapath is None:
                return False

            parser = datapath.ofproto_parser

            if index == 0:
                in_port = src_port
            else:
                prev_dpid = path[index - 1]
                in_port = self.adjacency[dpid][prev_dpid]

            if index == len(path) - 1:
                out_port = dst_port
            else:
                next_dpid = path[index + 1]
                out_port = self.adjacency[dpid][next_dpid]

            actions = [parser.OFPActionOutput(out_port)]
            match = parser.OFPMatch(
                in_port=in_port,
                eth_src=src_mac,
                eth_dst=dst_mac
            )
            self.add_flow(datapath, 10, match, actions, idle_timeout=60)

        return True

    def controlled_flood(self, src_dpid, in_port, data):
        queue = deque([(src_dpid, None)])
        visited = set([src_dpid])

        while queue:
            current_dpid, parent_dpid = queue.popleft()
            datapath = self.datapaths.get(current_dpid)
            if datapath is None:
                continue

            parser = datapath.ofproto_parser
            ofproto = datapath.ofproto
            actions = []
            excluded_ports = set()

            if parent_dpid is None:
                excluded_ports.add(in_port)
            else:
                parent_port = self.adjacency.get(current_dpid, {}).get(parent_dpid)
                if parent_port is not None:
                    excluded_ports.add(parent_port)

            for port_no in sorted(self.access_ports.get(current_dpid, [])):
                if port_no in excluded_ports:
                    continue
                actions.append(parser.OFPActionOutput(port_no))

            for neighbor_dpid, port_no in sorted(self.adjacency.get(current_dpid, {}).items()):
                if neighbor_dpid == parent_dpid or neighbor_dpid in visited:
                    continue

                actions.append(parser.OFPActionOutput(port_no))
                visited.add(neighbor_dpid)
                queue.append((neighbor_dpid, current_dpid))

            if not actions:
                continue

            out = parser.OFPPacketOut(
                datapath=datapath,
                buffer_id=ofproto.OFP_NO_BUFFER,
                in_port=ofproto.OFPP_CONTROLLER,
                actions=actions,
                data=data
            )
            datapath.send_msg(out)

    def can_reroute(self):
        now = time.time()

        if (now - self.start_time) < self.reroute_warmup:
            return False

        if (now - self.last_reroute_time) < self.reroute_cooldown:
            return False

        return True

    def reroute_flows(self):
        if not self.can_reroute():
            return

        now = time.time()
        rerouted = False

        for flow_key, flow_info in self.active_paths.items():
            src_mac, dst_mac = flow_key

            if src_mac not in self.global_mac or dst_mac not in self.global_mac:
                continue

            if not isinstance(flow_info, dict):
                continue

            src_dpid, _src_port = self.global_mac[src_mac]
            dst_dpid, _dst_port = self.global_mac[dst_mac]

            current_path = flow_info.get('path')
            if not current_path:
                current_path = self.get_path(src_dpid, dst_dpid)
            if not current_path:
                continue

            new_path = self.get_alternate_path(src_dpid, dst_dpid, current_path)
            if not new_path or new_path == current_path:
                continue

            old_cost = self.get_path_cost(current_path)
            new_cost = self.get_path_cost(new_path)

            if old_cost is None or new_cost is None:
                continue

            if old_cost <= (new_cost * 1.1):
                continue

            reverse_path = list(reversed(new_path))

            success = self.install_path_flows(src_mac, dst_mac, path=new_path)
            reverse = self.install_path_flows(dst_mac, src_mac, path=reverse_path)

            if success and reverse:
                self.active_paths[(src_mac, dst_mac)] = {
                    'timestamp': now,
                    'path': new_path
                }
                self.active_paths[(dst_mac, src_mac)] = {
                    'timestamp': now,
                    'path': reverse_path
                }
                rerouted = True

        if rerouted:
            self.last_reroute_time = now

    # ---------------- SWITCH CONNECT ----------------
    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features_handler(self, ev):

        datapath = ev.msg.datapath
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        # TABLE MISS → send to controller
        match = parser.OFPMatch()
        actions = [parser.OFPActionOutput(ofproto.OFPP_CONTROLLER,
                                         ofproto.OFPCML_NO_BUFFER)]
        self.add_flow(datapath, 0, match, actions)
        self.refresh_topology()

    @set_ev_cls(event.EventSwitchEnter)
    @set_ev_cls(event.EventSwitchLeave)
    @set_ev_cls(event.EventLinkAdd)
    @set_ev_cls(event.EventLinkDelete)
    def topology_change_handler(self, ev):
        self.refresh_topology()

    # ---------------- PACKET HANDLER ----------------
    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def packet_in_handler(self, ev):

        msg = ev.msg
        datapath = msg.datapath
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        dpid = datapath.id
        self.mac_to_port.setdefault(dpid, {})

        if dpid not in self.adjacency:
            self.refresh_topology()

        in_port = msg.match['in_port']

        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocol(ethernet.ethernet)

        if eth is None:
            return

        # Ignore LLDP & IPv6
        if eth.ethertype in [ether_types.ETH_TYPE_LLDP,
                             ether_types.ETH_TYPE_IPV6]:
            return

        src = eth.src
        dst = eth.dst

        # ---------------- LEARNING ----------------
        if in_port in self.access_ports.get(dpid, set()):
            self.mac_to_port[dpid][src] = in_port
            self.global_mac[src] = (dpid, in_port)

            self.logger.info("Learning MAC %s at switch %s port %s",
                             src, dpid, in_port)

        arp_pkt = pkt.get_protocol(arp.arp)

        if arp_pkt:
            if self.access_ports.get(dpid):
                self.controlled_flood(dpid, in_port, msg.data)
            else:
                actions = [parser.OFPActionOutput(ofproto.OFPP_FLOOD)]
                out = parser.OFPPacketOut(
                    datapath=datapath,
                    buffer_id=ofproto.OFP_NO_BUFFER,
                    in_port=in_port,
                    actions=actions,
                    data=msg.data
                )
                datapath.send_msg(out)
            return

        # ---------------- FORWARDING ----------------
        if dst in self.global_mac:
            dst_dpid, dst_port = self.global_mac[dst]
            out_port = self.get_output_port(dpid, dst_dpid, dst_port)
        else:
            out_port = None

        if out_port is None:
            out_port = ofproto.OFPP_FLOOD

        actions = [parser.OFPActionOutput(out_port)]

        # ---------------- FLOW INSTALL ----------------
        if out_port != ofproto.OFPP_FLOOD:
            flow_key = (src, dst)
            now = time.time()
            flow_info = self.active_paths.get(flow_key)
            flow_timestamp = None

            if isinstance(flow_info, dict):
                flow_timestamp = flow_info.get('timestamp')

            if (flow_info is None or flow_timestamp is None or
                    (now - flow_timestamp) > self.flow_refresh_interval):
                path = self.get_path(self.global_mac[src][0], self.global_mac[dst][0])

                if path:
                    success = self.install_path_flows(src, dst, path=path)
                    reverse = self.install_path_flows(dst, src, path=list(reversed(path)))
                else:
                    success = False
                    reverse = False

                if success and reverse:
                    self.active_paths[flow_key] = {
                        'timestamp': now,
                        'path': path
                    }
                    self.active_paths[(dst, src)] = {
                        'timestamp': now,
                        'path': list(reversed(path))
                    }

        # SEND PACKET
        out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=ofproto.OFP_NO_BUFFER,
            in_port=in_port,
            actions=actions,
            data=msg.data
        )
        datapath.send_msg(out)

    # ---------------- SWITCH REGISTER ----------------
    @set_ev_cls(ofp_event.EventOFPStateChange,
                [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def state_change_handler(self, ev):

        datapath = ev.datapath

        if ev.state == MAIN_DISPATCHER:
            if datapath.id not in self.datapaths:
                self.logger.info("Register datapath: %016x", datapath.id)
                self.datapaths[datapath.id] = datapath
        elif ev.state == DEAD_DISPATCHER:
            if datapath.id in self.datapaths:
                self.logger.info("Unregister datapath: %016x", datapath.id)
                del self.datapaths[datapath.id]

    # ---------------- MONITOR ----------------
    def monitor(self):
        while True:
            for dp in self.datapaths.values():
                self.request_stats(dp)
            hub.sleep(5)

    # ---------------- REQUEST STATS ----------------
    def request_stats(self, datapath):
        parser = datapath.ofproto_parser

        req = parser.OFPPortStatsRequest(
            datapath,
            0,
            datapath.ofproto.OFPP_ANY
        )
        datapath.send_msg(req)

    # ---------------- HANDLE STATS ----------------
    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def port_stats_reply_handler(self, ev):

        body = ev.msg.body

        for stat in body:

            port = stat.port_no

            if port == 4294967294:
                continue

            rx = stat.rx_bytes
            tx = stat.tx_bytes

            key = (ev.msg.datapath.id, port)

            if key not in self.port_stats:
                self.port_stats[key] = (rx, tx)
                continue

            prev_rx, prev_tx = self.port_stats[key]

            load = (rx - prev_rx) + (tx - prev_tx)

            self.link_load[key] = load

            # HISTORY
            self.traffic_history.setdefault(key, [])
            self.traffic_history[key].append(load)

            if len(self.traffic_history[key]) > 3:
                self.traffic_history[key].pop(0)

            # ---------------- CONGESTION ----------------
            if (load > self.congestion_threshold and
                    load > self.min_congestion_load):
                self.logger.info(
                    "CONGESTION DETECTED at Switch %s Port %s Load %s",
                    ev.msg.datapath.id, port, load
                )
                if hasattr(self, 'reroute_flows') and self.can_reroute():
                    self.reroute_flows()
                    self.last_reroute_time = time.time()

            # ---------------- PREDICTION ----------------
            if len(self.traffic_history[key]) == 3:
                predicted = sum(self.traffic_history[key]) / 3.0

                if predicted > self.congestion_threshold * 0.8:
                    self.logger.info(
                        "PREDICTED CONGESTION at Switch %s Port %s Load %s",
                        ev.msg.datapath.id, port, predicted
                    )

            self.port_stats[key] = (rx, tx)

            self.logger.info(
                "Switch %s | Port %s | RX %d | TX %d | Load %d",
                ev.msg.datapath.id, port, rx, tx, load
            )
