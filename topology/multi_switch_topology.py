from mininet.topo import Topo


class MultiSwitchTopo(Topo):

    def build(self):
        link_opts = dict(bw=10, delay='5ms')

        # Hosts with deterministic MAC addresses.
        h1 = self.addHost('h1', mac='00:00:00:00:00:01')
        h2 = self.addHost('h2', mac='00:00:00:00:00:02')

        # Switches using OpenFlow 1.3.
        s1 = self.addSwitch('s1', protocols='OpenFlow13')
        s2 = self.addSwitch('s2', protocols='OpenFlow13')
        s3 = self.addSwitch('s3', protocols='OpenFlow13')
        s4 = self.addSwitch('s4', protocols='OpenFlow13')

        # Host-to-switch links.
        self.addLink(h1, s1, **link_opts)
        self.addLink(h2, s4, **link_opts)

        # Inter-switch links.
        self.addLink(s1, s2, **link_opts)
        self.addLink(s1, s3, **link_opts)
        self.addLink(s2, s4, **link_opts)
        self.addLink(s3, s4, **link_opts)


topos = {'multiswitch': (lambda: MultiSwitchTopo())}
