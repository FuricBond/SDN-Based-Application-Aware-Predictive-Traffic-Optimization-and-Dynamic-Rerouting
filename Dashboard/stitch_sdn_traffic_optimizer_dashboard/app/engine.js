/* ================================================================
   SDN Traffic Optimizer — Centralized State Engine v2.0
   ----------------------------------------------------------------
   RULES:
     • Zero layout changes — HTML is NEVER touched by this file
     • All mutations go through updateUI() → per-module updaters
     • CSS variables are the bridge to the topology SVG
     • data-bind attributes are the bridge to text nodes
     • Existing LOG_MESSAGES / appendLiveLog are extended, not replaced
   ================================================================ */

/* ================================================================
   1. GLOBAL STATE OBJECT
   ================================================================ */
window.SDN_STATE = {
  status:          'NORMAL',   // 'NORMAL' | 'CONGESTED' | 'REROUTING'
  congestion:      false,
  rerouting:       false,
  // activePath: real Mininet link IDs on the active forwarding path
  activePath:      ['h1-s1', 's1-s2', 's2-s4', 's4-h2'],
  // oldPath: alternate path through s3 (congested branch)
  oldPath:         ['h1-s1', 's1-s3', 's3-s4', 's4-h2'],
  // congestedNode: data-node ID of the congested switch (null when NORMAL)
  congestedNode:   null,
  affectedSwitch:  's3',
  load:            24,         // %
  packetLoss:      0.02,       // %
  latency:         4.2,        // ms
  confidence:      98.4,       // %
  rerouteCount:    8,
  suspiciousActivity: 1284,
  throughput:      8.2,        // Gbps
  _simRunning:     false,
  _graphHistory:   [65, 45, 85, 72, 92, 55, 30],
};

/* ================================================================
   NODE MAP — Maps Mininet identifiers to topology data-node IDs.
   Since we now use real names everywhere, this is a direct 1:1 map.
   Kept as a lookup table for engine.js consumers.
   ================================================================ */
window.NODE_MAP = {
  h1: 'h1',   // source host
  s1: 's1',   // switch 1 (hub)
  s2: 's2',   // switch 2 (primary path)
  s3: 's3',   // switch 3 (alternate / congested)
  s4: 's4',   // switch 4 (merger)
  h2: 'h2',   // destination host
};

/* ================================================================
   2. MASTER UPDATE ENGINE
   ================================================================ */
function updateUI() {
  updateDashboard();
  updateTopology();
  updateOptimization();
  updateSecurity();
  updateHardware();
  updateSidebar();
  _updateNavbarChip();
  if (window.updateChart) window.updateChart(); // Link Load Trend canvas (chart.js)
}
window.updateUI       = updateUI;       // consumed by demo.js
window.updateTopology = updateTopology; // consumed by demo.js runStep()

/* ================================================================
   3. DASHBOARD UPDATER
   ================================================================ */
function updateDashboard() {
  const s = window.SDN_STATE;

  /* --- Neural Engine Status tri-state indicator --- */
  const statusPanels = document.querySelectorAll('#page-dashboard .flex.gap-3 > div');
  // panel[0]=NORMAL, panel[1]=CONGESTED, panel[2]=REROUTING
  if (statusPanels.length >= 3) {
    const configs = {
      NORMAL:    { idx: 0, bg: '#001d07',           border: 'rgba(74,225,118,0.2)',   barBg: '#4ae176',           barShadow: '0 0 8px rgba(74,225,118,0.5)',   textColor: '#4ae176' },
      CONGESTED: { idx: 1, bg: 'rgba(57,0,3,0.6)',  border: 'rgba(235,65,65,0.3)',    barBg: '#eb4141',           barShadow: '0 0 8px rgba(235,65,65,0.5)',    textColor: '#eb4141' },
      REROUTING: { idx: 2, bg: 'rgba(120,77,4,0.4)',border: 'rgba(245,158,11,0.3)',   barBg: '#f59e0b',           barShadow: '0 0 8px rgba(245,158,11,0.5)',   textColor: '#f59e0b' },
    };
    const active = configs[s.status] || configs.NORMAL;
    statusPanels.forEach((panel, i) => {
      const isActive = (i === active.idx);
      panel.style.opacity    = isActive ? '1' : '0.3';
      panel.style.background = isActive ? active.bg    : '#060e20';
      panel.style.border     = isActive ? `1px solid ${active.border}` : '1px solid rgba(69,70,77,0.1)';
      const bar  = panel.querySelector('div');
      const span = panel.querySelector('span');
      if (bar && isActive)  { bar.style.background  = active.barBg; bar.style.boxShadow = active.barShadow; }
      if (bar && !isActive) { bar.style.background  = '#334155';    bar.style.boxShadow = 'none'; }
      if (span && isActive) span.style.color = active.textColor;
    });
  }

  /* --- Latency KPI --- */
  const latEl = document.querySelector('#page-dashboard [data-bind="system-latency"]');
  if (latEl) {
    const val = s.latency.toFixed(2) + 'ms';
    const color = s.status === 'CONGESTED' ? '#eb4141' : s.status === 'REROUTING' ? '#f59e0b' : '#4ae176';
    latEl.textContent = val;
    latEl.style.color = color;
  }

  /* --- Congestion KPI text + bar --- */
  const congEl = document.querySelector('#page-dashboard [data-bind="congestion-state"]');
  if (congEl) {
    congEl.innerHTML = s.load.toFixed(1) + '<span class="text-lg font-medium text-slate-500">%</span>';
    congEl.style.color = s.load > 75 ? '#eb4141' : '#dae2fd';
    const bar = congEl.closest('.col-span-12')?.querySelector('.bg-primary, .h-full');
    if (bar) { bar.style.width = s.load + '%'; bar.style.background = s.load > 75 ? '#eb4141' : '#4ae176'; }
  }

  /* --- Rerouting count --- */
  const rrEl = document.querySelector('#page-dashboard [data-bind="reroute-state"]');
  if (rrEl) {
    rrEl.textContent = String(s.rerouteCount).padStart(2, '0');
    rrEl.style.color = s.status === 'REROUTING' ? '#f59e0b' : '#dae2fd';
  }

  /* --- Throughput --- */
  const thEl = document.querySelector('#page-dashboard [data-bind="flow-throughput"]');
  if (thEl) thEl.innerHTML = s.throughput.toFixed(1) + '<span class="text-lg font-medium text-slate-500"> Gbps</span>';

  /* --- Confidence --- */
  const cfEl = document.querySelector('#page-dashboard [data-bind="confidence-score"]');
  if (cfEl) cfEl.textContent = s.confidence.toFixed(1) + '%';

  /* --- Active Path visualizer (dashboard path strip) --- */
  _updateDashPathStrip();
}

/* Animate the h1→s1→s2→s4→h2 strip based on state */
function _updateDashPathStrip() {
  const s = window.SDN_STATE;
  const isCongest = s.status === 'CONGESTED';
  // Strip node order: h1(0) — s1(1) — s2(2) — s4(3) — h2(4)
  const nodeEls = document.querySelectorAll('#page-dashboard .flex.items-center.justify-between.px-2.py-6 > div');
  nodeEls.forEach((n, i) => {
    const circle = n.querySelector('div');
    if (!circle) return;
    if (i === 0 || i === 4) { // h1, h2 — always green
      circle.style.borderColor = '#4ae176';
      circle.style.color       = '#4ae176';
      circle.style.boxShadow   = '0 0 15px rgba(74,225,118,0.2)';
    } else if (s.status === 'REROUTING' || s.status === 'NORMAL') { // s1, s2, s4 on active path
      circle.style.borderColor = '#4ae176';
      circle.style.color       = s.status === 'REROUTING' ? '#f59e0b' : '#4ae176';
      circle.style.boxShadow   = s.status === 'REROUTING' ? '0 0 12px rgba(245,158,11,0.3)' : '0 0 15px rgba(74,225,118,0.15)';
    } else { // CONGESTED — dim intermediate
      circle.style.borderColor = 'rgba(69,70,77,0.5)';
      circle.style.color       = '#64748b';
      circle.style.boxShadow   = 'none';
    }
  });

  // Inject or update s3 alert badge next to path strip during congestion
  let badge = document.getElementById('s3-alert-badge');
  const pathContainer = document.querySelector('#page-dashboard .flex.items-center.justify-between.px-2.py-6');
  if (pathContainer && !badge) {
    // Inject once into the parent container
    const wrapper = pathContainer.closest('div');
    if (wrapper) {
      badge = document.createElement('div');
      badge.id = 's3-alert-badge';
      badge.innerHTML = '<span class="material-symbols-outlined" style="font-size:12px">warning</span> s3 congested (eth2)';
      wrapper.appendChild(badge);
    }
  }
  if (badge) badge.classList.toggle('visible', isCongest);
}

/* ================================================================
   4. TOPOLOGY UPDATER — Class-based SVG state management
      Reads from SDN_STATE only. Never creates its own state.
      Controls [data-link] and [data-node] SVG elements via CSS classes.

      VISUAL STATE MACHINE:
        NORMAL    → primary path GREEN, s3 branch STANDBY
        CONGESTED → primary path GREEN, s1–s3/s3–s4 RED + s3 RED
        REROUTING → old-path (s1–s3/s3–s4) — GREY DASHED (fade out)
                     new-path (h1–s1–s2–s4–h2) — GREEN (glowing)
        NORMAL    → only new path visible, no red
   ================================================================ */
function updateTopology() {
  const s = window.SDN_STATE;

  /* 4a. CSS variables for any legacy neon-pulse selectors */
  const root = document.documentElement.style;
  if (s.status === 'CONGESTED') {
    root.setProperty('--active-path-color', '#eb4141');
    root.setProperty('--node-critical',     '#eb4141');
  } else if (s.status === 'REROUTING') {
    root.setProperty('--active-path-color', '#4ae176');
    root.setProperty('--node-critical',     '#f59e0b');
  } else {
    root.setProperty('--active-path-color', '#4ae176');
    root.setProperty('--node-critical',     '#eb4141');
  }

  /* 4b. Choose the class for nodes/links ON the active path */
  const newPathClass  = s.status === 'REROUTING' ? 'rerouting' : 'active';
  const oldPathClass  = 'old-path'; // grey dashed — only during REROUTING

  // Primary forwarding path link IDs
  const primaryLinks  = ['h1-s1', 's1-s2', 's2-s4', 's4-h2'];
  // Congested branch link IDs
  const altLinks      = ['s1-s3', 's3-s4'];

  /* 4c. Reset all links to standby */
  document.querySelectorAll('#page-topology [data-link]').forEach(link => {
    link.classList.remove('active', 'congested', 'standby', 'rerouting', 'old-path');
    link.classList.add('standby');
  });

  /* 4d. Apply link states based on current SDN_STATE.status */
  if (s.status === 'NORMAL') {
    // Primary path: active (green)
    primaryLinks.forEach(id => _setLinkClass(id, 'active'));
    // Alternate branch: standby (grey)
    altLinks.forEach(id => _setLinkClass(id, 'standby'));

  } else if (s.status === 'CONGESTED') {
    // Primary path: still active (green) — traffic still going through
    primaryLinks.forEach(id => _setLinkClass(id, 'active'));
    // Congested branch: RED pulsing
    altLinks.forEach(id => _setLinkClass(id, 'congested'));

  } else if (s.status === 'REROUTING') {
    // Animated transition:
    //   Step 1 (immediate): fade congested branch to old-path (grey dashed)
    altLinks.forEach(id => _setLinkClass(id, 'old-path'));
    //   Step 2 (after 500ms delay): light up new path green
    primaryLinks.forEach(id => _setLinkClass(id, 'standby')); // brief standby first
    setTimeout(() => {
      primaryLinks.forEach(id => _setLinkClass(id, 'rerouting'));
    }, 550);
  }

  /* 4e. Reset ALL nodes to standby */
  document.querySelectorAll('#page-topology [data-node]').forEach(nodeG => {
    const circle = nodeG.querySelector('circle');
    const text   = nodeG.querySelector('text');
    if (circle) { circle.classList.remove('active','congested','standby','rerouting'); circle.classList.add('standby'); }
    if (text)   { text.classList.remove('active','congested','standby','rerouting');   text.classList.add('standby'); }
  });

  /* 4f. Apply node states */
  const _activeNodeIds = _getNodesOnActivePath(primaryLinks);

  if (s.status === 'NORMAL') {
    _activeNodeIds.forEach(id => _setNodeClass(id, 'active'));

  } else if (s.status === 'CONGESTED') {
    _activeNodeIds.forEach(id => _setNodeClass(id, 'active'));
    // s3 node — red
    _setNodeClass('s3', 'congested');

  } else if (s.status === 'REROUTING') {
    // Instant: set s3 to standby (fade from red)
    _setNodeClass('s3', 'standby');
    // Immediate: grey out old intermediate nodes
    _setNodeClass('s2', 'standby');
    // After delay: light up full new path green
    setTimeout(() => {
      _activeNodeIds.forEach(id => _setNodeClass(id, 'rerouting'));
    }, 550);
  }

  /* 4g. h1 and h2 are ALWAYS active (they are the hosts) */
  if (s.status !== 'CONGESTED') { // during congestion keep them green too
    setTimeout(() => {
      ['h1','h2'].forEach(id => {
        const nodeG = document.querySelector(`#page-topology [data-node="${id}"]`);
        if (!nodeG) return;
        const cls = s.status === 'REROUTING' ? 'rerouting' : 'active';
        const circle = nodeG.querySelector('circle');
        const text   = nodeG.querySelector('text');
        if (circle) { circle.classList.remove('active','congested','standby','rerouting'); circle.classList.add(cls); }
        if (text)   { text.classList.remove('active','congested','standby','rerouting');   text.classList.add(cls); }
      });
    }, s.status === 'REROUTING' ? 550 : 0);
  } else {
    ['h1','h2'].forEach(id => _setNodeClass(id, 'active'));
  }

  /* 4h. Topology event log entry on status change */
  const tbody = document.querySelector('#page-topology table tbody');
  if (tbody && s._lastTopoStatus !== s.status) {
    s._lastTopoStatus = s.status;
    const now = _ts();
    const msgs = {
      CONGESTED: { type: 'Load Alert',    node: 'S3',             msg: `Congestion on s3 port eth2 (${s.load.toFixed(0)}% utilization). Path degraded.`, badge: '<span class="badge-warning px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>' },
      REROUTING: { type: 'Path Re-Route', node: 'CONTROLLER',     msg: `Rerouting: [h1→s1→s3→s4→h2] → [h1→s1→s2→s4→h2]. s2 path active.`, badge: '<span class="badge-rerouting px-2 py-0.5 rounded text-[10px] font-bold">IN PROGRESS</span>' },
      NORMAL:    { type: 'Health Check',  node: 'CONTROLLER',     msg: 'All nodes operational. Path h1→s1→s2→s4→h2 stable. Latency within bounds.', badge: '<span class="badge-active px-2 py-0.5 rounded text-[10px] font-bold">STABLE</span>' },
    };
    const m = msgs[s.status] || msgs.NORMAL;
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom:1px solid rgba(69,70,77,0.05);animation:fadeIn 0.4s ease';
    tr.innerHTML = `<td class="py-3 text-slate-400">${now}</td><td class="py-3">${m.type}</td><td class="py-3">${m.node}</td><td class="py-3 text-on-surface">${m.msg}</td><td class="py-3">${m.badge}</td>`;
    tbody.insertBefore(tr, tbody.firstChild);
    while (tbody.children.length > 6) tbody.removeChild(tbody.lastChild);
  }
}

/* Set link class helper — finds the element and swaps class */
function _setLinkClass(linkId, cls) {
  const el = document.querySelector(`#page-topology [data-link="${linkId}"]`);
  if (!el) return;
  el.classList.remove('active','congested','standby','rerouting','old-path');
  el.classList.add(cls);
}

/* Set node class helper — applies to circle + text inside [data-node] */
function _setNodeClass(nodeId, cls) {
  const nodeG = document.querySelector(`#page-topology [data-node="${nodeId}"]`);
  if (!nodeG) return;
  const circle = nodeG.querySelector('circle');
  const text   = nodeG.querySelector('text');
  if (circle) { circle.classList.remove('active','congested','standby','rerouting'); circle.classList.add(cls); }
  if (text)   { text.classList.remove('active','congested','standby','rerouting');   text.classList.add(cls); }
}

/* Helper: returns the set of data-node IDs implicitly touched by a set of link IDs */
function _getNodesOnActivePath(linkIds) {
  const nodeSet = new Set();
  // link format: "nodeA-nodeB" (case-insensitive match to data-node attributes)
  linkIds.forEach(linkId => {
    // split on first capital letter boundary or hyphen
    const parts = linkId.split('-');
    // edge01-coreA  => ['edge01', 'coreA'] => ['edge01', 'core_a']
    if (parts.length >= 2) {
      const a = _normNodeId(parts[0]);
      const b = _normNodeId(parts.slice(1).join('-'));
      if (a) nodeSet.add(a);
      if (b) nodeSet.add(b);
    }
  });
  return nodeSet;
}

/* Normalize link segment string to data-node attribute value.
   With real Mininet naming these are already canonical — pass through. */
function _normNodeId(seg) {
  const map = {
    'h1': 'h1', 'h2': 'h2',
    's1': 's1', 's2': 's2', 's3': 's3', 's4': 's4',
  };
  return map[seg.toLowerCase()] || null;
}

/* ================================================================
   5. OPTIMIZATION UPDATER
   ================================================================ */
function updateOptimization() {
  const s = window.SDN_STATE;

  /* --- Path Result panel --- */
  const oldVectorEl  = document.querySelector('#page-optimization .flex-1:first-child p.font-mono');
  const newVectorEl  = document.querySelector('#page-optimization .flex-1.glow-primary p.font-mono');
  if (oldVectorEl) oldVectorEl.textContent = `${(s.latency * 2.4 + 8).toFixed(0)}ms latency`;
  if (newVectorEl) newVectorEl.textContent = `${s.latency.toFixed(1)}ms latency`;

  /* --- Controller Decision panel --- */
  const reasonEl = document.querySelector('#page-optimization [style*="border-left:4px solid #4ae176"] p.text-sm');
  const actionEl = document.querySelector('#page-optimization .solid-card p.text-sm');
  const confEl   = document.querySelector('#page-optimization .text-2xl.font-headline.font-extrabold.text-primary');
  const confBar  = confEl?.closest('section')?.querySelector('.w-24 .h-full');

  if (reasonEl) {
    const reasons = {
      NORMAL:    `System stable. No rerouting required. Latency at ${s.latency.toFixed(1)}ms.`,
      CONGESTED: `High load detected on switch s3 port eth2 (${s.load.toFixed(0)}% utilization). Rerouting advised.`,
      REROUTING: `Rerouted traffic from [h1,s1,s3,s4,h2] to [h1,s1,s2,s4,h2]. Evaluating stability.`,
    };
    reasonEl.textContent = reasons[s.status] || reasons.NORMAL;
  }
  if (actionEl) {
    const actions = {
      NORMAL:    'Monitoring all flows on h1→s1→s2→s4→h2. No action required.',
      CONGESTED: `Evaluating alternate paths. Switch s3 congested (${s.load.toFixed(0)}%). Switching to s2 path.`,
      REROUTING: `Active path: [h1→s1→s2→s4→h2]. s3 isolated. Flow table updated on controller.`,
    };
    actionEl.textContent = actions[s.status] || actions.NORMAL;
  }
  if (confEl)  confEl.textContent  = s.confidence.toFixed(1) + '%';
  if (confBar) { confBar.style.width = s.confidence + '%'; }

  /* --- Live graph bar update (append new bar, shift left) --- */
  _pushOptimizationBar();
}

let _graphInterval = null;
function _pushOptimizationBar() {
  const s = window.SDN_STATE;
  const bars = document.querySelectorAll('#page-optimization section.lg\\:col-span-7 .chart-bar > div');
  if (!bars.length) return;

  // Shift all bar heights left by 1
  const newVal = s.status === 'CONGESTED' ? (75 + Math.random() * 20).toFixed(0)
               : s.status === 'REROUTING' ? (50 + Math.random() * 30).toFixed(0)
               : (20 + Math.random() * 40).toFixed(0);
  s._graphHistory.push(parseFloat(newVal));
  s._graphHistory.shift();

  bars.forEach((bar, i) => {
    const h = s._graphHistory[i] ?? 50;
    const isHigh = h > 75;
    bar.style.height     = h + '%';
    bar.style.background = isHigh ? 'rgba(235,65,65,0.5)' : i === bars.length - 1 ? '#4ae176' : 'rgba(74,225,118,0.4)';
    bar.style.transition = 'height 0.6s ease, background 0.3s ease';
  });
}

/* ================================================================
   6. SECURITY UPDATER
   ================================================================ */
function updateSecurity() {
  const s = window.SDN_STATE;

  /* --- Suspicious activity counter --- */
  const suspEl = document.querySelector('#page-security [data-bind="suspicious-activity"]');
  if (suspEl) {
    if (s.congestion) s.suspiciousActivity += Math.floor(Math.random() * 80 + 20);
    else if (s.suspiciousActivity > 1284) s.suspiciousActivity = Math.max(1284, s.suspiciousActivity - 15);
    suspEl.textContent = s.suspiciousActivity.toLocaleString();
    suspEl.style.color = s.congestion ? '#eb4141' : '#dae2fd';
  }

  /* --- Packet drops --- */
  const pdEl = document.querySelector('#page-security [data-bind="packet-drops"]');
  if (pdEl) {
    const pd = s.congestion ? (s.packetLoss * 8).toFixed(2) : s.packetLoss.toFixed(2);
    pdEl.textContent = pd + '%';
    pdEl.style.color = parseFloat(pd) > 0.5 ? '#eb4141' : '#dae2fd';
  }

  /* --- Anomaly alert panel --- */
  const anomalyPanel = document.querySelector('#page-security .col-span-12.lg\\:col-span-4');
  if (anomalyPanel) {
    const title = anomalyPanel.querySelector('h3');
    const desc  = anomalyPanel.querySelector('p.text-sm');
    if (s.congestion) {
      anomalyPanel.style.background = '#390003';
      if (title) title.style.color  = '#eb4141';
      if (desc)  desc.textContent   = `Traffic spike detected at switch ${s.affectedSwitch}. Congestion: ${s.load.toFixed(0)}%. Rerouting triggered. Monitoring for DDoS vector.`;
    } else if (s.rerouting) {
      anomalyPanel.style.background = 'rgba(120,77,4,0.5)';
      if (title) title.style.color  = '#f59e0b';
      if (desc)  desc.textContent   = `Rerouting active via [${s.activePath.join('→')}]. Traffic moved from s3 to s2 path. Security posture stable.`;
    } else {
      anomalyPanel.style.background = 'rgba(57,0,3,0.15)';
      if (title) title.style.color  = '#eb4141';
      if (desc)  desc.textContent   = 'No active anomalies detected. Path h1→s1→s2→s4→h2 stable. All baseline patterns within normal range.';
    }
  }

  /* --- Inject security log row --- */
  _appendSecurityLog();
}

function _appendSecurityLog() {
  const s = window.SDN_STATE;
  const container = document.querySelector('#page-security .space-y-3');
  if (!container) return;

  const msgs = {
    CONGESTED: { badge: 'badge-critical', label: '[CRITICAL]', color: '#eb4141', text: `Congestion detected at switch ${s.affectedSwitch} port eth2: ${s.load.toFixed(0)}% utilization.` },
    REROUTING: { badge: 'badge-rerouting', label: '[EXEC]',    color: '#f59e0b', text: `Rerouting via [${s.activePath.join('→')}]. s3 isolated. Security monitoring active.` },
    NORMAL:    { badge: 'badge-active',   label: '[INFO]',     color: '#4ae176', text: 'Monitoring traffic on h1→s1→s2→s4→h2. Baseline stable.' },
  };
  const m = msgs[s.status] || msgs.NORMAL;

  const row = document.createElement('div');
  row.className = 'flex items-center gap-4 p-3 rounded-xl transition-colors';
  row.style.cssText = 'background:#171f33;animation:fadeIn 0.4s ease';
  row.innerHTML = `<span class="font-label text-xs text-secondary shrink-0">${_ts()}</span>
    <span class="text-xs font-bold shrink-0" style="color:${m.color}">${m.label}</span>
    <span class="text-sm text-on-surface truncate">${m.text}</span>
    <span class="ml-auto text-[10px] font-label px-2 py-0.5 rounded-full ${m.badge}">${s.status}</span>`;
  container.insertBefore(row, container.firstChild);
  while (container.children.length > 4) container.removeChild(container.lastChild);
}

/* ================================================================
   7. HARDWARE UPDATER
   ================================================================ */
function updateHardware() {
  const s = window.SDN_STATE;

  /* --- Switch status items — highlight affectedSwitch (s3) --- */
  const switchItems = document.querySelectorAll('#page-hardware .rounded-xl.p-4.flex.items-center.justify-between');
  switchItems.forEach(item => {
    const labelEl   = item.querySelector('span.font-label.font-bold');
    const statusEl  = item.querySelector('.text-right p:first-child');
    const tempEl    = item.querySelector('.text-right p:last-child');
    if (!labelEl) return;
    const sw = labelEl.textContent.trim().toLowerCase(); // 's1','s2','s3','s4'
    if (sw === s.affectedSwitch) {
      item.style.borderLeft = '4px solid #eb4141';
      if (statusEl) { statusEl.textContent = s.status === 'NORMAL' ? 'OPERATIONAL' : 'WARNING'; statusEl.style.color = s.status === 'NORMAL' ? '#4ae176' : '#eb4141'; }
      const temp = s.status === 'CONGESTED' ? Math.min(82, 58 + Math.floor(s.load / 5)) : 58;
      if (tempEl) tempEl.textContent = `Temp: ${temp}°C`;
    } else {
      item.style.borderLeft = '';
      if (statusEl) { statusEl.textContent = 'OPERATIONAL'; statusEl.style.color = '#4ae176'; }
    }
  });

  /* --- Port load KPI --- */
  const portLoadEl = document.querySelector('#page-hardware [data-bind="avg-port-load"]');
  if (portLoadEl) {
    const pl = s.status === 'CONGESTED' ? Math.min(98, s.load + 35) : s.status === 'REROUTING' ? s.load + 15 : s.load;
    portLoadEl.textContent = pl.toFixed(1);
    portLoadEl.style.color = pl > 80 ? '#eb4141' : pl > 60 ? '#f59e0b' : '#4ae176';
  }

  /* --- Interface saturation --- */
  const satEl = document.querySelector('#page-hardware [data-bind="interface-saturation"]');
  if (satEl) {
    const sat = s.congestion ? (14.2 + Math.random() * 8).toFixed(1) : '14.2';
    satEl.textContent = sat;
    satEl.style.color = parseFloat(sat) > 18 ? '#eb4141' : '#eb4141'; // keep red per design
  }

  /* --- Heatmap refresh: re-colour cells based on load --- */
  _refreshHeatmap();

  /* --- Hardware logs --- */
  _appendHardwareLog();
}

function _refreshHeatmap() {
  const s  = window.SDN_STATE;
  const cells = document.querySelectorAll('#heatmap-grid > div');
  cells.forEach((cell, i) => {
    // Port 5, 15, 31 are the "alert" ports
    const isAlert = [4, 14, 30].includes(i);
    let latency;
    if (isAlert) {
      latency = s.status === 'CONGESTED' ? 200  : s.status === 'REROUTING' ? 120 : 45;
    } else {
      latency = 1 + Math.random() * (s.status === 'CONGESTED' ? 15 : 4);
    }
    const bg = latency > 80 ? 'rgba(235,65,65,0.8)'
             : latency > 30 ? 'rgba(235,65,65,0.45)'
             : latency > 10 ? 'rgba(74,225,118,0.7)'
             : latency > 5  ? 'rgba(74,225,118,0.5)'
             :                'rgba(74,225,118,0.2)';
    cell.style.background  = bg;
    cell.style.transition  = 'background 0.6s ease';
    cell.title = `Port ${String(i+1).padStart(2,'0')}: ${latency.toFixed(0)}ms${latency > 30 ? ' — ALERT' : ''}`;
  });
}

function _appendHardwareLog() {
  const s = window.SDN_STATE;
  const container = document.querySelector('#page-hardware .overflow-y-auto.font-mono');
  if (!container) return;
  const msgs = {
    CONGESTED: { color: '#eb4141', level: 'ALERT:', text: `[WARN] Congestion at switch ${s.affectedSwitch} port eth2 (${s.load.toFixed(0)}% load). CRC errors rising.` },
    REROUTING: { color: '#f59e0b', level: 'EXEC:',  text: `[EXEC] Rerouting via s2. Flow table updated on s1. s3 isolated from active path.` },
    NORMAL:    { color: '#60a5fa', level: 'INFO:',  text: `[INFO] Monitoring traffic on h1→s1→s2→s4→h2. Load: ${s.load.toFixed(0)}%.` },
  };
  const m = msgs[s.status] || msgs.NORMAL;
  const p = document.createElement('p');
  p.style.animation = 'fadeIn 0.3s ease';
  p.innerHTML = `<span style="color:#bec6e0">[${_ts()}]</span> <span style="color:${m.color}" class="font-bold">${m.level}</span> ${m.text}`;
  container.insertBefore(p, container.firstChild);
  while (container.children.length > 12) container.removeChild(container.lastChild);
}

/* ================================================================
   8. SIDEBAR UPDATER — system health pulse
   ================================================================ */
function updateSidebar() {
  const s = window.SDN_STATE;
  const pulseDot  = document.querySelector('#app-sidebar .pulse-dot');
  const pulseText = document.querySelector('#app-sidebar .text-primary.font-bold');
  const pulseDesc = document.querySelector('#app-sidebar .text-\\[9px\\]');

  const configs = {
    NORMAL:    { dotColor: '#4ae176', shadow: '0 0 6px rgba(74,225,118,0.6)',   text: 'All Systems Normal',         desc: 'Controller: Responsive' },
    CONGESTED: { dotColor: '#eb4141', shadow: '0 0 8px rgba(235,65,65,0.8)',    text: `Congestion: ${s.affectedSwitch.toUpperCase()}`, desc: 'Controller: Alert Raised' },
    REROUTING: { dotColor: '#f59e0b', shadow: '0 0 8px rgba(245,158,11,0.8)',   text: 'Rerouting Active',           desc: `Path: [${s.activePath.join('→')}]` },
  };
  const c = configs[s.status] || configs.NORMAL;
  if (pulseDot)  { pulseDot.style.background = c.dotColor; pulseDot.style.boxShadow = c.shadow; }
  if (pulseText) { pulseText.textContent = c.text; pulseText.style.color = c.dotColor; }
  if (pulseDesc) pulseDesc.textContent   = c.desc;

  // Sidebar health panel border
  const healthPanel = pulseDot?.closest('div');
  if (healthPanel) {
    healthPanel.style.borderColor = s.status === 'NORMAL' ? 'rgba(74,225,118,0.08)'
                                  : s.status === 'CONGESTED' ? 'rgba(235,65,65,0.2)'
                                  : 'rgba(245,158,11,0.2)';
  }
}

/* ================================================================
   9. STATE TRANSITION SIMULATION
   ================================================================ */
let _simTimeout1, _simTimeout2, _simTimeout3;

function simulateNetworkFlow() {
  const s = window.SDN_STATE;
  if (s._simRunning) return;
  s._simRunning = true;

  // Clear any running sim
  clearTimeout(_simTimeout1); clearTimeout(_simTimeout2); clearTimeout(_simTimeout3);

  // 0 → 3s: Congestion phase
  _systemLog('WARN',    `[INFO] Monitoring traffic on h1→s1→s2→s4→h2. Anomaly detected on ${s.affectedSwitch}-eth2. Buffer at ${s.load}%.`);
  _simTimeout1 = setTimeout(() => {
    s.status          = 'CONGESTED';
    s.congestion      = true;
    s.load            = 87;
    s.latency         = 38.4;
    s.confidence      = 91.2;
    s.congestedNode   = window.NODE_MAP[s.affectedSwitch] || null; // 'core_b'
    s._graphHistory.push(91);
    s._graphHistory.shift();
    updateUI();
    _systemLog('WARN',  `[WARN] Congestion detected at ${s.affectedSwitch} port eth2 — buffer at ${s.load}%, latency spike ${s.latency}ms.`);
    _systemLog('ERROR', `[INFO] Evaluating alternate paths. Primary path h1→s1→s3→s4→h2 degraded.`);
  }, 3000);

  // 3 → 6s: Rerouting phase
  _simTimeout2 = setTimeout(() => {
    s.status          = 'REROUTING';
    s.rerouting       = true;
    s.activePath      = ['h1-s1', 's1-s2', 's2-s4', 's4-h2'];
    s.oldPath         = ['h1-s1', 's1-s3', 's3-s4', 's4-h2'];
    s.latency         = 18.2;
    s.confidence      = 96.7;
    s.rerouteCount   += 1;
    s._graphHistory.push(55);
    s._graphHistory.shift();
    updateUI();
    _systemLog('EXEC',  '[EXEC] Rerouting via s2. Path [h1→s1→s2→s4→h2] deployed. Old path [h1→s1→s3→s4→h2] deprecated.');
  }, 6000);

  // 6 → 9s: Normal restored
  _simTimeout3 = setTimeout(() => {
    s.status          = 'NORMAL';
    s.congestion      = false;
    s.rerouting       = false;
    s.congestedNode   = null;
    s.load            = 24;
    s.latency         = 4.2;
    s.confidence      = 98.4 + Math.random() * 1.4;
    s._graphHistory.push(28);
    s._graphHistory.shift();
    s._simRunning     = false;
    updateUI();
    _systemLog('SUCCESS', '[SUCCESS] Traffic stabilized. Path [h1\u2192s1\u2192s2\u2192s4\u2192h2] active. Latency: ' + s.latency.toFixed(1) + 'ms.');
  }, 9000);
}

/* ================================================================
   10. MANUAL DEMO CONTROL — "Trigger Congestion" button
       Injected into sidebar bottom section
   ================================================================ */
(function injectDemoControls() {
  // Wait for DOM ready (engine loads after DOMContentLoaded)
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  // Build the demo control panel
  const panel = document.createElement('div');
  panel.id = 'demo-control-panel';
  panel.style.cssText = 'padding:0 16px;margin-bottom:12px';
  panel.innerHTML = `
    <div style="border-top:1px solid rgba(255,255,255,0.04);padding-top:12px;margin-bottom:8px">
      <p style="font-size:9px;font-family:'Space Grotesk',sans-serif;color:#475569;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px">Demo Controls</p>
    </div>
    <button id="btn-trigger-congestion"
      style="width:100%;padding:9px 0;border-radius:12px;font-size:12px;font-weight:700;
             font-family:'Space Grotesk',sans-serif;cursor:pointer;border:none;transition:all 0.2s ease;
             display:flex;align-items:center;justify-content:center;gap:6px;
             background:rgba(235,65,65,0.12);color:#eb4141;border:1px solid rgba(235,65,65,0.2)">
      <span class="material-symbols-outlined" style="font-size:15px">bolt</span>
      Trigger Congestion
    </button>
    <button id="btn-reset-normal"
      style="width:100%;padding:9px 0;border-radius:12px;font-size:12px;font-weight:700;
             font-family:'Space Grotesk',sans-serif;cursor:pointer;border:none;transition:all 0.2s ease;
             display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;
             background:rgba(74,225,118,0.1);color:#4ae176;border:1px solid rgba(74,225,118,0.2)">
      <span class="material-symbols-outlined" style="font-size:15px">check_circle</span>
      Reset Normal
    </button>
    <button id="btn-run-sim"
      style="width:100%;padding:9px 0;border-radius:12px;font-size:12px;font-weight:700;
             font-family:'Space Grotesk',sans-serif;cursor:pointer;border:none;transition:all 0.2s ease;
             display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;
             background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.2)">
      <span class="material-symbols-outlined" style="font-size:15px">play_circle</span>
      Auto Simulate
    </button>`;

  // Insert BEFORE the "Deploy Config" button section
  const deploySection = sidebar.querySelector('.px-4.mt-auto');
  if (deploySection) sidebar.insertBefore(panel, deploySection);
  else sidebar.appendChild(panel);

  // Button events
  document.getElementById('btn-trigger-congestion').addEventListener('click', triggerCongestion);
  document.getElementById('btn-reset-normal').addEventListener('click', resetNormal);
  document.getElementById('btn-run-sim').addEventListener('click', () => simulateNetworkFlow());
})();

/* Called immediately on click — no simulation delay */
function triggerCongestion() {
  const s = window.SDN_STATE;
  if (s._simRunning) { clearTimeout(_simTimeout1); clearTimeout(_simTimeout2); clearTimeout(_simTimeout3); s._simRunning = false; }
  s.status        = 'CONGESTED';
  s.congestion    = true;
  s.rerouting     = false;
  s.load          = 87;
  s.latency       = 38.4;
  s.confidence    = 91.2;
  s.congestedNode = window.NODE_MAP[s.affectedSwitch] || null; // 'core_b'
  updateUI();
  _systemLog('WARN',  `Manual trigger: CONGESTED state on ${s.affectedSwitch.toUpperCase()} (${s.congestedNode}). Load at ${s.load}%.`);
  _systemLog('ERROR', 'Packet drop rate elevated. Controller evaluating reroute options.');
}

function resetNormal() {
  clearTimeout(_simTimeout1); clearTimeout(_simTimeout2); clearTimeout(_simTimeout3);
  const s = window.SDN_STATE;
  s.status        = 'NORMAL';
  s.congestion    = false;
  s.rerouting     = false;
  s.congestedNode = null;
  s.load          = 24;
  s.latency       = 4.2;
  s.confidence    = 98.4;
  s._simRunning   = false;
  updateUI();
  _systemLog('SUCCESS', 'Manual reset: All systems restored to NORMAL state.');
}

/* ================================================================
   11. STATE-AWARE LOG SYSTEM (extends existing appendLiveLog)
       Writes to dashboard-log AND injects state-specific messages
   ================================================================ */
function _systemLog(level, text) {
  const logContainer = document.getElementById('dashboard-log');
  if (!logContainer) return;

  const colors = { INFO: '#60a5fa', WARN: '#facc15', ERROR: '#eb4141', SUCCESS: '#4ae176', EXEC: '#4ae176' };
  const color = colors[level] || '#bec6e0';
  const ts = _ts();

  const row = document.createElement('div');
  row.className = 'flex gap-4 mt-1';
  row.style.cssText = 'animation:fadeIn 0.3s ease';
  if (level === 'ERROR' || level === 'WARN') {
    row.style.background = level === 'ERROR' ? 'rgba(57,0,3,0.2)' : 'rgba(120,77,4,0.12)';
    row.style.borderRadius = '6px';
    row.style.padding = '2px 4px';
    row.style.marginLeft = '-4px';
  }
  row.innerHTML = `<span class="text-slate-600 shrink-0">[${ts}]</span><span><span style="color:${color}" class="font-bold">${level}:</span> ${text}</span>`;
  logContainer.appendChild(row);

  while (logContainer.children.length > 22) logContainer.removeChild(logContainer.firstChild);
  logContainer.scrollTop = logContainer.scrollHeight;

  // Scroll highlight: flash latest row
  row.style.outline = `1px solid ${color}22`;
  setTimeout(() => { row.style.outline = 'none'; }, 1200);
}

/* ================================================================
   12. PERIODIC LIVE DATA FLUCTUATION (every 2s)
       Keeps numbers alive between state transitions
   ================================================================ */
setInterval(() => {
  const s = window.SDN_STATE;
  if (s.status === 'NORMAL') {
    s.load      = Math.max(10, Math.min(35, s.load + (Math.random() - 0.5) * 4));
    s.latency   = Math.max(2, Math.min(8, s.latency + (Math.random() - 0.5) * 0.8));
    s.throughput = Math.max(6, Math.min(12, s.throughput + (Math.random() - 0.5) * 0.5));
  } else if (s.status === 'CONGESTED') {
    s.load      = Math.max(80, Math.min(97, s.load + (Math.random() - 0.3) * 5));
    s.latency   = Math.max(28, Math.min(55, s.latency + (Math.random() - 0.4) * 3));
  } else if (s.status === 'REROUTING') {
    s.load      = Math.max(30, Math.min(60, s.load - Math.random() * 3));
    s.latency   = Math.max(10, Math.min(25, s.latency - Math.random() * 1.5));
  }
  updateUI();
  _pushOptimizationBar();
}, 2000);

/* ================================================================
   13. NAVBAR STATUS INDICATOR (injects a status chip into navbar)
   ================================================================ */
(function injectNavbarStatus() {
  const navbar = document.getElementById('app-navbar');
  if (!navbar) return;
  const chip = document.createElement('div');
  chip.id = 'navbar-status-chip';
  chip.style.cssText = `
    display:flex;align-items:center;gap:6px;
    padding:4px 12px;border-radius:9999px;
    font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:700;
    letter-spacing:0.1em;text-transform:uppercase;
    background:rgba(74,225,118,0.1);color:#4ae176;
    border:1px solid rgba(74,225,118,0.2);
    transition:all 0.4s ease;`;
  chip.innerHTML = `<span id="navbar-chip-dot" style="width:6px;height:6px;border-radius:50%;background:#4ae176;box-shadow:0 0 5px rgba(74,225,118,0.8)"></span>
    <span id="navbar-chip-text">NETWORK NORMAL</span>`;

  // Insert between brand and desktop nav links
  const brandDiv = navbar.querySelector('.flex.items-center.gap-3:first-child');
  if (brandDiv) brandDiv.appendChild(chip);
})();

function _updateNavbarChip() {
  const s    = window.SDN_STATE;
  const chip = document.getElementById('navbar-status-chip');
  const dot  = document.getElementById('navbar-chip-dot');
  const text = document.getElementById('navbar-chip-text');
  if (!chip) return;
  const cfg = {
    NORMAL:    { bg: 'rgba(74,225,118,0.1)', color: '#4ae176', border: 'rgba(74,225,118,0.2)', dot: '#4ae176', shadow: '0 0 5px rgba(74,225,118,0.8)', label: 'NETWORK NORMAL' },
    CONGESTED: { bg: 'rgba(235,65,65,0.12)', color: '#eb4141', border: 'rgba(235,65,65,0.25)', dot: '#eb4141', shadow: '0 0 6px rgba(235,65,65,0.9)', label: `CONGESTED: ${s.affectedSwitch.toUpperCase()}` },
    REROUTING: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)', dot: '#f59e0b', shadow: '0 0 6px rgba(245,158,11,0.8)', label: 'REROUTING ACTIVE' },
  };
  const c = cfg[s.status] || cfg.NORMAL;
  chip.style.background  = c.bg;
  chip.style.color       = c.color;
  chip.style.borderColor = c.border;
  if (dot)  { dot.style.background  = c.dot; dot.style.boxShadow = c.shadow; }
  if (text) text.textContent = c.label;
}

/* Wrap the original updateUI to always update the navbar chip */
// NOTE: _updateNavbarChip() is called at the end of updateUI directly.

/* ================================================================
   14. INIT — Run initial updateUI and wire global API
   ================================================================ */
// Extend the existing window.SDN object (defined in the router script)
if (window.SDN) {
  window.SDN.triggerCongestion = triggerCongestion;
  window.SDN.resetNormal       = resetNormal;
  window.SDN.simulate          = simulateNetworkFlow;
  window.SDN.state             = window.SDN_STATE;
}

// Run first update after a short delay to let DOM fully settle
setTimeout(() => {
  updateUI();
  _updateNavbarChip();
  _systemLog('INFO', 'SDN State Engine v2.0 initialized. All modules synchronized.');
  _systemLog('INFO', `Initial path: [${window.SDN_STATE.activePath.join('→')}]. Latency: ${window.SDN_STATE.latency}ms.`);
}, 400);

/* ================================================================
   UTILITY
   ================================================================ */
function _ts() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
}
