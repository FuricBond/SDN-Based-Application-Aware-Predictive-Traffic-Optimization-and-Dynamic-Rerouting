# SDN Traffic Optimizer

SDN Traffic Optimizer is a software-defined networking project focused on topology-aware forwarding, congestion detection, and safe traffic engineering in OpenFlow networks. The project uses a Ryu controller and a Mininet-based multi-switch topology to demonstrate dynamic path computation and controlled rerouting behavior.

## Features

- Topology awareness using discovered switches, links, access ports, and adjacency maps
- Path computation for end-to-end forwarding across a multi-switch network
- Congestion detection from OpenFlow port statistics
- Traffic engineering with controlled rerouting and hysteresis-based decision making
- Stable host learning and path installation for bidirectional flows

## Technologies

- Python
- Ryu SDN Framework
- Mininet
- OpenFlow 1.3

## Project Structure

- `controller/` - Ryu controller implementations
- `topology/` - Mininet topology definitions
- `monitoring/` - monitoring-related code and assets
- `routing/` - routing-related modules
- `logs/` - runtime logs and generated outputs

## How To Run

Start the Ryu controller:

```bash
ryu-manager controller/traffic_controller_advance.py
```

In another terminal, start Mininet with the project topology:

```bash
sudo mn --custom topology/multi_switch_topology.py --topo multiswitch --controller remote --switch ovsk,protocols=OpenFlow13 --link tc
```

## Basic Validation

Inside the Mininet CLI:

```bash
pingall
h2 iperf -s &
h1 iperf -c 10.0.0.2 -t 20
pingall
```

## Notes

- Use the advanced controller for congestion-aware traffic engineering demonstrations.
- Demo and rerouting behavior depend on the active topology and observed port statistics.
- Ignore virtual environments, logs, and compiled Python artifacts when committing.
