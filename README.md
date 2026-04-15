# FlowSense SDN: Application-Aware Predictive Traffic Optimization and Dynamic Rerouting

## Overview

FlowSense SDN is a software-defined networking project focused on intelligent traffic optimization in multi-switch OpenFlow environments. The system combines topology awareness, path computation, congestion monitoring, and controlled rerouting to demonstrate how an SDN controller can adapt forwarding behavior while preserving network stability.

This repository is designed for demonstration, experimentation, and academic or resume-ready presentation of SDN-based traffic engineering using Ryu and Mininet.

## Features

- Topology-aware forwarding using discovered switches, links, and access ports
- Dynamic path computation across a multi-switch Mininet topology
- Congestion detection through OpenFlow port statistics
- Traffic engineering with controlled rerouting and stability-first safeguards
- Application-aware experimentation using `pingall` and `iperf`
- Demo-friendly logging for rerouting and congestion visibility

## Tech Stack

- Python
- Ryu SDN Framework
- Mininet
- OpenFlow 1.3
- Open vSwitch

## Project Structure

- `controller/` - Ryu controller implementations
- `topology/` - Mininet topology definitions
- `monitoring/` - monitoring-related components
- `routing/` - routing and path-selection logic
- `screenshots/` - demo images and output captures
- `README.md` - project overview and usage guide
- `.gitignore` - ignore rules for local artifacts
- `requirements.txt` - Python dependencies

## How to Run

Start the controller:

```bash
PYTHONPATH=. ryu-manager --observe-links controller/traffic_controller_advance.py
```

In a separate terminal, start Mininet:

```bash
sudo mn --custom topology/multi_switch_topology.py --topo multiswitch --controller remote --switch ovsk,protocols=OpenFlow13 --link tc
```

## Testing Steps

Run the following from the Mininet CLI:

```bash
pingall
h2 iperf -s &
h1 iperf -c 10.0.0.2 -t 20
pingall
```

Expected behavior:

- `pingall` succeeds before traffic generation
- `iperf` runs successfully between hosts
- `pingall` remains stable after traffic generation

## Demo Output

Typical demo output includes congestion and rerouting logs such as:

```text
DEMO CONGESTION TRIGGERED
REROUTING flow 00:00:00:00:00:01 -> 00:00:00:00:00:02 from path [1, 2, 4] to path [1, 3, 4]
```

Add screenshots of Mininet output, controller logs, and rerouting behavior in the `screenshots/` directory.

## Outcome

This project demonstrates a clean and practical SDN workflow for:

- discovering network topology
- computing forwarding paths
- detecting congestion
- shifting traffic safely when an alternate path is meaningfully better

The result is a professional, demo-friendly SDN project that is easy to understand, easy to run, and suitable for presentations, portfolios, and technical discussions.
