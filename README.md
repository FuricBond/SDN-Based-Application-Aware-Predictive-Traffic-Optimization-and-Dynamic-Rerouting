# SDN Traffic Optimizer

An SDN traffic-engineering project built with Ryu, Mininet, OpenFlow 1.3, and Open vSwitch. The repository demonstrates topology-aware forwarding, port-stat monitoring, congestion detection, and dynamic rerouting across a multi-switch lab topology.

The main implementation lives in `controller/traffic_controller_advance.py`, which is the most feature-complete controller in the repo. A simpler baseline controller is also included for comparison and experimentation.

## What This Project Does

- Learns host MAC locations across multiple OpenFlow switches
- Discovers switch-to-switch links and access ports dynamically
- Computes end-to-end paths through the topology
- Installs forwarding rules hop by hop
- Monitors port statistics to estimate link load
- Detects congestion and predicts rising load from recent samples
- Reroutes active flows onto an alternate path when it is meaningfully better
- Includes a dashboard prototype for presenting the project visually

## Repository Layout

- `controller/traffic_controller_advance.py` - advanced controller with congestion-triggered rerouting and demo mode
- `controller/traffic_controller.py` - baseline controller with dynamic path installation and simpler reroute logic
- `topology/multi_switch_topology.py` - Mininet topology with four switches and two hosts
- `Dashboard/stitch_sdn_traffic_optimizer_dashboard/` - static dashboard prototype and design assets
- `screenshots/` - place demo screenshots and captures here
- `requirements.txt` - Python dependency list currently tracked in the repo

## Topology

The provided Mininet topology creates:

- 2 hosts: `h1`, `h2`
- 4 OpenFlow 1.3 switches: `s1`, `s2`, `s3`, `s4`
- 2 parallel host-to-host paths: `s1 -> s2 -> s4` and `s1 -> s3 -> s4`

This parallel-path layout makes it easy to demonstrate path selection and rerouting behavior.

## Controller Variants

### `traffic_controller_advance.py`

This is the recommended controller to run for demos. It adds:

- controlled ARP flooding
- topology refresh on switch and link events
- periodic port-stats polling every 5 seconds
- traffic history tracking per switch port
- predicted congestion logging from recent load samples
- reroute warmup and cooldown timers
- alternate-path selection that avoids the congested link
- demo mode that artificially boosts load on one link to make rerouting easier to observe

### `traffic_controller.py`

This version is a lighter implementation that still supports:

- topology discovery
- path computation
- flow installation
- link-load tracking
- simpler alternate-path selection

Use it if you want a smaller controller for learning or side-by-side comparison.

## Prerequisites

You will need these installed in your SDN lab environment:

- Python 3
- Ryu
- Mininet
- Open vSwitch
- OpenFlow 1.3-capable switches in Mininet

The repo currently tracks only `ryu` in `requirements.txt`, so Mininet and Open vSwitch should be installed separately on the system where you run the demo.

## Setup

Install the Python dependency:

```bash
pip install -r requirements.txt
```

If Ryu is not available on your path after installation, use the Python environment where it is installed.

## Run the Project

Start the advanced controller:

```bash
PYTHONPATH=. ryu-manager --observe-links controller/traffic_controller_advance.py
```

In a second terminal, start Mininet with the custom topology:

```bash
sudo mn --custom topology/multi_switch_topology.py --topo multiswitch --controller remote --switch ovsk,protocols=OpenFlow13 --link tc
```

## Demo Workflow

From the Mininet CLI, a simple demo sequence is:

```bash
pingall
h2 iperf -s &
h1 iperf -c 10.0.0.2 -t 20
pingall
```

What to watch for in the controller logs:

- MAC learning events
- datapath registration
- per-port RX, TX, and computed load
- `DEMO CONGESTION TRIGGERED`
- `CONGESTION DETECTED`
- `PREDICTED CONGESTION`
- `REROUTING flow ...`

Because the advanced controller enables `demo_mode`, it intentionally inflates load on one link to make congestion and rerouting visible during a short demo.

## Expected Behavior

- Initial connectivity should work with `pingall`
- Flows should be installed after host learning completes
- Port statistics should begin appearing once switches are registered
- During sustained traffic, the controller should detect or predict congestion
- If a valid alternate path has lower measured cost, the controller should reroute the active flow

## Dashboard

The `Dashboard/stitch_sdn_traffic_optimizer_dashboard/` directory contains a static dashboard prototype for presenting the project. To view it locally, open:

- `Dashboard/stitch_sdn_traffic_optimizer_dashboard/index.html`

This dashboard is useful for demonstration and portfolio presentation, but it is not currently wired into the Ryu controller as a live monitoring frontend.

## Notes and Limitations

- The controller logic is intended for a lab or demo environment, not production networking
- Rerouting decisions are based on simple measured load and short traffic history windows
- The advanced controller currently uses a demo congestion trigger to make behavior easier to observe
- Empty directories such as `monitoring/`, `routing/`, and `tests/` are present but do not yet contain active implementation in this snapshot

## Screenshots and Evidence

You can store demo artifacts in `screenshots/`, such as:

- Mininet CLI output
- controller log captures
- rerouting evidence
- dashboard screenshots

## Tech Stack

- Python
- Ryu
- Mininet
- Open vSwitch
- OpenFlow 1.3
