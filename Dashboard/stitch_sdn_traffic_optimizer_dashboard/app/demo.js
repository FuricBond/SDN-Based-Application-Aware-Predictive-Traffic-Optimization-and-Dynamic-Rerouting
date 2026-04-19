/* ================================================================
   SDN Traffic Optimizer — Guided Demo & Presentation Layer v1.0
   ----------------------------------------------------------------
   Loads last, after engine.js and engine2.js.
   Rules:
     • Zero HTML structure changes
     • Self-contained: everything injected via JS
     • Uses existing SDN_STATE, triggerCongestion(), resetNormal()
     • All DOM checks are idempotent (safe to re-run)
   ================================================================ */

(function waitForDemo() {
  if (typeof window.SDN_STATE === 'undefined' || typeof window.updateUI === 'undefined') {
    setTimeout(waitForDemo, 80);
    return;
  }
  initDemoLayer();
})();

/* ================================================================
   DEMO STEP DEFINITIONS
   Each step targets a page, sets state, fires logs, explains itself
   ================================================================ */
const DEMO_STEPS = [
  {
    id: 1,
    phase: 'MONITORING',
    title: 'System Normal',
    subtitle: 'Baseline established',
    page: 'dashboard',
    state: 'NORMAL',
    badgeTxt: 'MONITORING',
    badgeColor: '#4ae176',
    highlightSelector: '#page-dashboard .grid.grid-cols-12.gap-6.mb-6:first-of-type',
    explain:
      'The SDN controller is operating normally. h1 is sending traffic to h2 via the ' +
      'optimal low-latency path h1→s1→s2→s4→h2. Flow table is synchronized. No intervention required.',
    logs: [
      ['INFO',    '[INFO] Monitoring traffic on h1→s1→s2→s4→h2. All nodes responding within SLA thresholds.'],
      ['INFO',    '[INFO] Flow table synchronized. 14 active flows. Latency: 4.2ms.'],
    ],
  },
  {
    id: 2,
    phase: 'DETECTION',
    title: 'Congestion at s3',
    subtitle: 'Hardware root cause',
    page: 'hardware',
    state: 'CONGESTED',
    badgeTxt: 'ROOT CAUSE',
    badgeColor: '#eb4141',
    highlightSelector: '#page-hardware',
    explain:
      'Hardware monitoring detects buffer saturation on switch s3 (port eth2). ' +
      'Load exceeded 87% — the root cause of this congestion event. Path h1→s1→s3→s4→h2 is degraded.',
    logs: [
      ['WARN',   '[WARN] Congestion detected at s3 port eth2 — buffer at 87%, latency spike 38.4ms.'],
      ['ERROR',  '[INFO] Evaluating alternate paths. Primary path h1→s1→s3→s4→h2 degraded.'],
    ],
  },
  {
    id: 3,
    phase: 'DETECTION',
    title: 'Anomaly Flagged at s3',
    subtitle: 'Security Sentinel active',
    page: 'security',
    state: 'CONGESTED',
    badgeTxt: 'ANOMALY',
    badgeColor: '#eb4141',
    highlightSelector: '#page-security .col-span-12.lg\\:col-span-4',
    explain:
      'The Security Sentinel detects an abnormal traffic spike from switch s3. ' +
      '1,300+ suspicious events flagged. DDoS vector analysis initiated. ' +
      'Alert escalated to the SDN controller Optimization Engine.',
    logs: [
      ['WARN',   '[WARN] Traffic spike detected at switch s3 port eth2. Suspicious events: 1,300+.'],
      ['ERROR',  '[INFO] Anomaly confirmed. Security Sentinel escalating to controller.'],
    ],
  },
  {
    id: 4,
    phase: 'DECISION',
    title: 'Controller Decides',
    subtitle: 'Explainable AI path selection',
    page: 'optimization',
    state: 'CONGESTED',
    badgeTxt: 'DECIDING',
    badgeColor: '#f59e0b',
    highlightSelector: '#page-optimization section.lg\\:col-span-5',
    explain:
      'The SDN controller evaluates candidate paths. Decision Score: 94/100. ' +
      'Path [h1,s1,s2,s4,h2] selected — lowest latency (18.2ms), sufficient capacity. ' +
      'Old path [h1,s1,s3,s4,h2] deprecated. Validation: Hysteresis ✔ Cooldown ✔.',
    logs: [
      ['EXEC',   '[INFO] Evaluating alternate paths. s3 congested — switching to s2 path.'],
      ['EXEC',   '[EXEC] Rerouting via s2. Path [h1,s1,s2,s4,h2] selected. Decision Score: 94. Validation: PASS.'],
    ],
  },
  {
    id: 5,
    phase: 'ACTION',
    title: 'Rerouting Active',
    subtitle: 'Topology path transition',
    page: 'topology',
    state: 'REROUTING',
    badgeTxt: 'REROUTING',
    badgeColor: '#f59e0b',
    highlightSelector: '#page-topology section.lg\\:col-span-8',
    explain:
      'Traffic is being redirected from the congested path [h1,s1,s3,s4,h2] to [h1,s1,s2,s4,h2]. ' +
      'The s1–s3 and s3–s4 links fade from red to grey-dashed. The new active path h1→s1→s2→s4→h2 ' +
      'lights up green. s3 fades out. Watch the 550ms transition — the controller rerouted live.',
    logs: [
      ['EXEC',   '[EXEC] Rerouting via s2. Path [h1→s1→s2→s4→h2] deployed. Old path [h1→s1→s3→s4→h2] deprecated.'],
      ['EXEC',   '[EXEC] Flow table updated on controller. 9 flows migrated to s2 path.'],
    ],
  },
  {
    id: 6,
    phase: 'RESULT',
    title: 'System Stabilized',
    subtitle: 'Autonomous recovery complete',
    page: 'dashboard',
    state: 'NORMAL',
    badgeTxt: 'STABLE',
    badgeColor: '#4ae176',
    highlightSelector: '#page-dashboard',
    explain:
      'Rerouting complete. Traffic is now flowing via h1→s1→s2→s4→h2. Latency restored to 4.2ms. ' +
      'All 14 flows stable. The SDN controller detected, decided, and resolved the s3 congestion event ' +
      'in under 9 seconds — with zero manual intervention.',
    logs: [
      ['SUCCESS', '[SUCCESS] Traffic stabilized. Path [h1→s1→s2→s4→h2] active. Latency: 4.2ms.'],
      ['INFO',    '[INFO] Post-reroute health check complete. All nodes operational. s3 cleared.'],
    ],
  },
];

/* ================================================================
   TOOLTIP DEFINITIONS
   Injected onto existing elements via data-tip attribute
   ================================================================ */
const TOOLTIPS = [
  { sel: '[data-bind="system-latency"]',            tip: 'End-to-end network latency measured across active path (target: <10ms)' },
  { sel: '[data-bind="confidence-score"]',          tip: 'Controller confidence in current routing decision (0–100%)' },
  { sel: '[data-bind="congestion-state"]',          tip: 'Percentage of network links exceeding 70% utilization threshold' },
  { sel: '[data-bind="reroute-state"]',             tip: 'Total autonomous rerouting events since controller startup' },
  { sel: '#ctrl-decision-score',                    tip: 'AI-scored path selection quality: considers latency, load, and hysteresis' },
  { sel: '#vc-hysteresis',                          tip: 'Hysteresis guard: prevents rapid path flapping (min 30s between changes)' },
  { sel: '#vc-cooldown',                            tip: 'Cooldown elapsed: ensures rerouting is not triggered too frequently' },
  { sel: '#vc-path',                                tip: 'Validates that the selected alternate path has no loops and sufficient bandwidth' },
  { sel: '#vc-capacity',                            tip: 'Checks that the alternate path can absorb the redirected traffic load' },
  { sel: '[data-bind="suspicious-activity"]',       tip: 'Count of packets flagged by the anomaly detection engine this cycle' },
  { sel: '[data-bind="packet-drops"]',              tip: 'Packet drop rate: >0.5% triggers rerouting consideration' },
  { sel: '#flow-intel-panel #fi-active-flows',      tip: 'Total active OpenFlow entries currently managed by the controller' },
  { sel: '#flow-intel-panel #fi-rerouted-flows',    tip: 'Flows currently rerouted away from the congested path' },
  { sel: '#sdn-timeline',                           tip: 'Live state machine: tracks the system through Normal → Congestion → Rerouting → Stable' },
  { sel: '#heatmap-grid',                           tip: 'Per-port latency heatmap: green=normal, red=critical. Click a cell for port details' },
];

const PRIMARY_PATH_LINKS = ['h1-s1', 's1-s2', 's2-s4', 's4-h2'];
const BACKUP_PATH_LINKS  = ['h1-s1', 's1-s3', 's3-s4', 's4-h2'];

function initDemoLayer() {

/* ================================================================
   SECTION 1 — INJECT DEMO CSS
   ================================================================ */
const style = document.createElement('style');
style.textContent = `
/* ---- Demo Panel (floating bottom-right) ---- */
#sdn-demo-panel {
  position:fixed; bottom:24px; right:24px; z-index:9000;
  width:340px; border-radius:16px;
  background:#060e20; border:1px solid rgba(74,225,118,0.15);
  box-shadow:0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,225,118,0.05);
  font-family:'Space Grotesk',sans-serif;
  transition:all 0.35s cubic-bezier(0.4,0,0.2,1);
  overflow:hidden;
}
#sdn-demo-panel.collapsed { width:52px; height:52px; border-radius:50%; cursor:pointer; }
#demo-panel-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 16px; border-bottom:1px solid rgba(255,255,255,0.04);
  cursor:pointer;
}
#demo-panel-header:hover { background:rgba(255,255,255,0.02); }
.demo-step-badge {
  font-size:9px; font-weight:700; padding:3px 8px; border-radius:99px;
  letter-spacing:0.1em; text-transform:uppercase;
  transition:all 0.4s ease;
}
#demo-panel-body { padding:16px; }
#demo-step-title {
  font-size:14px; font-weight:700; color:#dae2fd; margin-bottom:4px;
  transition:all 0.3s ease;
}
#demo-step-subtitle { font-size:10px; color:#475569; margin-bottom:12px; }
#demo-step-progress {
  display:flex; gap:4px; margin-bottom:14px;
}
.demo-pip {
  flex:1; height:3px; border-radius:2px; background:#1e293b;
  transition:all 0.4s ease;
}
.demo-pip.done    { background:#4ae176; }
.demo-pip.active  { background:#f59e0b; animation:pipPulse 1s ease infinite; }
.demo-pip.fail    { background:#eb4141; }
@keyframes pipPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

#demo-controls { display:flex; gap:8px; margin-bottom:14px; }
.demo-btn {
  flex:1; padding:8px 0; border-radius:10px; border:none; cursor:pointer;
  font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:700;
  letter-spacing:0.05em; text-transform:uppercase; transition:all 0.2s ease;
  display:flex; align-items:center; justify-content:center; gap:5px;
}
.demo-btn:hover { transform:translateY(-1px); }
.demo-btn:active { transform:scale(0.96); }
#btn-demo-prev  { background:rgba(45,52,73,0.8); color:#64748b; }
#btn-demo-next  { background:rgba(74,225,118,0.15); color:#4ae176; border:1px solid rgba(74,225,118,0.2); flex:2; }
#btn-demo-next.rerouting { background:rgba(245,158,11,0.15); color:#f59e0b; border-color:rgba(245,158,11,0.2); }
#btn-demo-next.congested { background:rgba(235,65,65,0.12); color:#eb4141; border-color:rgba(235,65,65,0.2); }
#btn-demo-next.stable { background:rgba(74,225,118,0.2); color:#4ae176; border-color:rgba(74,225,118,0.3); }
#btn-demo-reset { background:rgba(45,52,73,0.5); color:#475569; }
#btn-demo-auto  { background:rgba(245,158,11,0.1); color:#f59e0b; border:1px solid rgba(245,158,11,0.15); flex:1.5; }
#btn-demo-auto.running { background:rgba(235,65,65,0.1); color:#eb4141; border-color:rgba(235,65,65,0.2); }

/* ---- Demo Mode row ---- */
#demo-mode-toggle-row {
  display:flex; align-items:center; justify-content:space-between;
  padding-top:12px; border-top:1px solid rgba(255,255,255,0.04);
  margin-top:4px;
}

/* ---- Explanation Overlay (floating pill) ---- */
#sdn-explain-overlay {
  position:fixed; top:76px; left:50%; transform:translateX(-50%);
  z-index:8900; min-width:400px; max-width:620px;
  background:#0b1326; border:1px solid rgba(74,225,118,0.12);
  border-radius:12px; padding:12px 18px;
  box-shadow:0 8px 32px rgba(0,0,0,0.5);
  display:none; animation:slideDown 0.3s ease;
  font-family:'Space Grotesk',sans-serif;
}
@keyframes slideDown { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
#explain-phase-tag {
  font-size:9px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase;
  margin-bottom:6px; display:flex; align-items:center; gap:6px;
}
#explain-phase-dot { width:6px; height:6px; border-radius:50%; display:inline-block; }
#explain-text { font-size:12px; line-height:1.6; color:#94a3b8; }
#explain-close-btn {
  position:absolute; top:8px; right:12px; background:none; border:none;
  color:#475569; cursor:pointer; font-size:16px; line-height:1;
  transition:color 0.2s;
}
#explain-close-btn:hover { color:#dae2fd; }

/* ---- Module Highlight Ring ---- */
.demo-module-ring {
  outline:2px solid rgba(74,225,118,0.5) !important;
  outline-offset:3px;
  box-shadow:0 0 0 4px rgba(74,225,118,0.06), 0 0 24px rgba(74,225,118,0.12) !important;
  transition:all 0.4s ease;
  animation:ringPulse 2s ease infinite;
}
.demo-module-ring.congested-ring {
  outline-color:rgba(235,65,65,0.5) !important;
  box-shadow:0 0 0 4px rgba(235,65,65,0.06), 0 0 24px rgba(235,65,65,0.12) !important;
}
.demo-module-ring.rerouting-ring {
  outline-color:rgba(245,158,11,0.5) !important;
  box-shadow:0 0 0 4px rgba(245,158,11,0.06), 0 0 24px rgba(245,158,11,0.12) !important;
}
@keyframes ringPulse {
  0%,100% { outline-color:rgba(74,225,118,0.5); }
  50%      { outline-color:rgba(74,225,118,0.2); }
}

/* ---- Sidebar Nav Pulse (active module highlight during demo) ---- */
.nav-item.demo-active {
  background:rgba(74,225,118,0.15) !important;
  color:#4ae176 !important;
  box-shadow:inset 0 0 12px rgba(74,225,118,0.1);
  animation:navGlow 1.5s ease infinite;
}
.nav-item.demo-active.congested-nav {
  background:rgba(235,65,65,0.1) !important;
  color:#eb4141 !important;
  border-right-color:#eb4141 !important;
}
.nav-item.demo-active.rerouting-nav {
  background:rgba(245,158,11,0.1) !important;
  color:#f59e0b !important;
  border-right-color:#f59e0b !important;
}
@keyframes navGlow {
  0%,100% { box-shadow:inset 0 0 12px rgba(74,225,118,0.1); }
  50%      { box-shadow:inset 0 0 20px rgba(74,225,118,0.2); }
}

/* ---- Step Description Card ---- */
#demo-explain-card {
  background:rgba(23,31,51,0.6); border-radius:10px;
  padding:10px 12px; margin-bottom:12px;
  border:1px solid rgba(69,70,77,0.15);
  font-size:11px; line-height:1.65; color:#64748b;
  min-height:52px; transition:all 0.35s ease;
}
#demo-explain-card strong { color:#94a3b8; }

/* ---- Tooltip Engine ---- */
#sdn-tooltip {
  position:fixed; z-index:9999; pointer-events:none;
  background:#0b1326; border:1px solid rgba(74,225,118,0.2);
  border-radius:8px; padding:6px 10px; max-width:260px;
  font-family:'Space Grotesk',sans-serif; font-size:10px; line-height:1.5;
  color:#94a3b8; box-shadow:0 8px 24px rgba(0,0,0,0.5);
  opacity:0; transition:opacity 0.15s ease;
  word-wrap:break-word;
}
#sdn-tooltip.visible { opacity:1; }

/* ---- Explain Mode badges ---- */
.explain-badge {
  display:none; font-family:'Space Grotesk',sans-serif;
  font-size:9px; color:#334155; font-style:italic;
  padding:2px 0; margin-top:2px; line-height:1.4;
}
body.explain-mode .explain-badge { display:block; }

/* ---- Demo Start Banner (when no demo running) ---- */
#demo-start-banner {
  padding:14px; border-radius:12px; margin-bottom:14px;
  background:rgba(74,225,118,0.06); border:1px solid rgba(74,225,118,0.1);
  text-align:center;
}
#demo-start-banner p { font-size:10px; color:#475569; line-height:1.5; margin-top:6px; }
#btn-demo-start {
  width:100%; padding:11px; border-radius:12px; border:none; cursor:pointer;
  background:linear-gradient(135deg,rgba(74,225,118,0.9),rgba(0,110,47,0.8));
  color:#fff; font-family:'Space Grotesk',sans-serif; font-weight:700;
  font-size:13px; letter-spacing:0.05em; transition:all 0.2s ease;
  display:flex; align-items:center; justify-content:center; gap:8px;
  box-shadow:0 4px 16px rgba(74,225,118,0.2);
}
#btn-demo-start:hover { box-shadow:0 6px 24px rgba(74,225,118,0.35); transform:translateY(-1px); }
#btn-demo-start .material-symbols-outlined { font-size:18px; }

/* ---- Toggle switch (Explain Mode) ---- */
.demo-toggle { position:relative; display:inline-block; width:36px; height:20px; }
.demo-toggle input { opacity:0; width:0; height:0; }
.demo-toggle-slider {
  position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0;
  background:#1e293b; border-radius:20px; transition:0.3s;
  border:1px solid rgba(69,70,77,0.3);
}
.demo-toggle-slider::before {
  content:''; position:absolute;
  height:14px; width:14px; left:2px; bottom:2px;
  background:#475569; border-radius:50%; transition:0.3s;
}
.demo-toggle input:checked + .demo-toggle-slider { background:rgba(74,225,118,0.3); border-color:rgba(74,225,118,0.4); }
.demo-toggle input:checked + .demo-toggle-slider::before { transform:translateX(16px); background:#4ae176; }

/* ---- Phase indicator breadcrumb ---- */
#demo-phase-crumb {
  display:flex; gap:4px; align-items:center; margin-bottom:10px;
}
.phase-crumb-item {
  font-size:8px; font-weight:700; padding:2px 7px; border-radius:99px;
  letter-spacing:0.1em; text-transform:uppercase; transition:all 0.3s ease;
  background:rgba(30,41,59,0.8); color:#1e293b;
}
.phase-crumb-item.active-monitoring  { background:rgba(74,225,118,0.12); color:#4ae176; }
.phase-crumb-item.active-detection   { background:rgba(235,65,65,0.1);   color:#eb4141; }
.phase-crumb-item.active-decision    { background:rgba(245,158,11,0.1);  color:#f59e0b; }
.phase-crumb-item.active-action      { background:rgba(245,158,11,0.1);  color:#f59e0b; }
.phase-crumb-item.active-result      { background:rgba(74,225,118,0.2);  color:#4ae176; }
.phase-crumb-sep { font-size:8px; color:#1e293b; }

/* ---- Auto-mode timer bar ---- */
#auto-timer-bar {
  height:2px; border-radius:1px; background:#4ae176; width:0%;
  transition:width linear; margin-top:8px;
  box-shadow:0 0 6px rgba(74,225,118,0.4);
}
`;
document.head.appendChild(style);

/* ================================================================
   SECTION 2 — BUILD DEMO PANEL
   ================================================================ */
const panel = document.createElement('div');
panel.id = 'sdn-demo-panel';
panel.innerHTML = `
  <div id="demo-panel-header">
    <div style="display:flex;align-items:center;gap:8px">
      <span class="material-symbols-outlined" style="font-size:18px;color:#4ae176">play_circle</span>
      <span style="font-size:12px;font-weight:700;color:#dae2fd;letter-spacing:0.04em">Guided Demo</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <span id="demo-step-badge" class="demo-step-badge" style="background:rgba(74,225,118,0.1);color:#4ae176;border:1px solid rgba(74,225,118,0.2)">READY</span>
      <span id="demo-collapse-btn" class="material-symbols-outlined" style="font-size:16px;color:#475569;cursor:pointer" title="Collapse">remove</span>
    </div>
  </div>
  <div id="demo-panel-body">

    <!-- Start Banner (shown when no demo running) -->
    <div id="demo-start-banner">
      <div style="font-size:11px;font-weight:700;color:#4ae176;margin-bottom:4px">
        <span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle">school</span>
        SDN Controller Demo — 6 Steps
      </div>
      <p>Walk through Problem → Detection → Decision → Action → Result</p>
      <button id="btn-demo-start" style="margin-top:10px">
        <span class="material-symbols-outlined">play_arrow</span>
        Start Guided Demo
      </button>
    </div>

    <!-- Active Step UI (hidden until demo starts) -->
    <div id="demo-active-ui" style="display:none">

      <!-- Phase breadcrumb -->
      <div id="demo-phase-crumb">
        <span class="phase-crumb-item" id="pc-monitoring">Monitoring</span>
        <span class="phase-crumb-sep">›</span>
        <span class="phase-crumb-item" id="pc-detection">Detection</span>
        <span class="phase-crumb-sep">›</span>
        <span class="phase-crumb-item" id="pc-decision">Decision</span>
        <span class="phase-crumb-sep">›</span>
        <span class="phase-crumb-item" id="pc-action">Action</span>
        <span class="phase-crumb-sep">›</span>
        <span class="phase-crumb-item" id="pc-result">Result</span>
      </div>

      <!-- Progress pips -->
      <div id="demo-step-progress"></div>
      <div style="display:flex;justify-content:space-between;margin-top:4px;margin-bottom:10px">
        <span id="demo-step-count" style="font-size:9px;color:#334155">Step 1 of 6</span>
        <span id="demo-step-title-sm" style="font-size:9px;color:#475569"></span>
      </div>

      <!-- Step explain card -->
      <div id="demo-explain-card"></div>

      <!-- Nav controls -->
      <div id="demo-controls">
        <button class="demo-btn" id="btn-demo-prev">
          <span class="material-symbols-outlined" style="font-size:14px">arrow_back</span>
        </button>
        <button class="demo-btn" id="btn-demo-next">
          <span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span>
          Next Step
        </button>
        <button class="demo-btn" id="btn-demo-reset">
          <span class="material-symbols-outlined" style="font-size:14px">restart_alt</span>
        </button>
      </div>

      <!-- Auto mode -->
      <button class="demo-btn" id="btn-demo-auto" style="width:100%;margin-bottom:10px">
        <span class="material-symbols-outlined" style="font-size:14px">fast_forward</span>
        Auto Mode (full sequence)
      </button>
      <div id="auto-timer-bar"></div>
    </div><!-- /demo-active-ui -->

    <!-- Explain Mode toggle (always visible) -->
    <div id="demo-mode-toggle-row">
      <div>
        <div style="font-size:10px;font-weight:700;color:#475569">Explain Mode</div>
        <div style="font-size:9px;color:#1e293b;margin-top:2px">Show labels on UI elements</div>
      </div>
      <label class="demo-toggle">
        <input type="checkbox" id="explain-mode-checkbox">
        <span class="demo-toggle-slider"></span>
      </label>
    </div>

  </div><!-- /demo-panel-body -->
`;
document.body.appendChild(panel);

/* ================================================================
   SECTION 3b — INJECT FLOW TRACKER BAR
   ================================================================ */
(function injectFlowTracker() {
  if (document.getElementById('sdn-flow-tracker')) return;
  // Flow phases: label, tracker-class suffix, step indices (0-indexed)
  const phases = [
    { label: 'Normal',     cls: '',           steps: [0] },
    { label: 'Congestion', cls: 'fs-congested', steps: [1] },
    { label: 'Detection',  cls: 'fs-congested', steps: [2] },
    { label: 'Decision',   cls: 'fs-rerouting', steps: [3] },
    { label: 'Rerouting',  cls: 'fs-rerouting', steps: [4] },
    { label: 'Stable',     cls: 'fs-stable',    steps: [5] },
  ];
  const tracker = document.createElement('div');
  tracker.id = 'sdn-flow-tracker';
  tracker.innerHTML = phases.map((p, i) =>
    (i > 0 ? '<span class="flow-sep">›</span>' : '') +
    `<div class="flow-step" id="ft-step-${i}">${p.label}</div>`
  ).join('');
  document.body.appendChild(tracker);
  // Store phase config for updater
  tracker._phases = phases;
})();

function updateFlowTracker(currentStepIdx) {
  const tracker = document.getElementById('sdn-flow-tracker');
  if (!tracker) return;
  const phases = tracker._phases || [
    { steps: [0] }, { steps: [1] }, { steps: [2] },
    { steps: [3] }, { steps: [4] }, { steps: [5] },
  ];
  const colorMap = [
    '', 'fs-congested', 'fs-congested', 'fs-rerouting', 'fs-rerouting', 'fs-stable'
  ];
  phases.forEach((p, i) => {
    const el = document.getElementById(`ft-step-${i}`);
    if (!el) return;
    const stepIdx = p.steps[0];
    el.className = 'flow-step';
    if (currentStepIdx > stepIdx) {
      el.classList.add('fs-done');
    } else if (currentStepIdx === stepIdx) {
      el.classList.add('fs-active');
      if (colorMap[i]) el.classList.add(colorMap[i]);
    }
  });
}

/* ================================================================
   SECTION 3 — BUILD EXPLANATION OVERLAY
   ================================================================ */
const overlay = document.createElement('div');
overlay.id = 'sdn-explain-overlay';
overlay.innerHTML = `
  <button id="explain-close-btn" title="Dismiss">✕</button>
  <div id="explain-phase-tag">
    <span id="explain-phase-dot"></span>
    <span id="explain-phase-label"></span>
    <span style="margin-left:auto;font-size:9px;color:#1e293b" id="explain-step-num"></span>
  </div>
  <div id="explain-text"></div>
`;
document.body.appendChild(overlay);

/* ================================================================
   SECTION 4 — BUILD UNIVERSAL TOOLTIP ENGINE
   ================================================================ */
const tooltip = document.createElement('div');
tooltip.id = 'sdn-tooltip';
document.body.appendChild(tooltip);

let _ttTimeout;
function showTooltip(e, text) {
  tooltip.textContent = text;
  tooltip.classList.add('visible');
  moveTooltip(e);
}
function moveTooltip(e) {
  const x = e.clientX + 14;
  const y = e.clientY - 40;
  const w = tooltip.offsetWidth;
  const vw = window.innerWidth;
  tooltip.style.left = (x + w > vw - 10 ? vw - w - 14 : x) + 'px';
  tooltip.style.top  = Math.max(70, y) + 'px';
}
function hideTooltip() { tooltip.classList.remove('visible'); }

function wireTooltips() {
  TOOLTIPS.forEach(({ sel, tip }) => {
    document.querySelectorAll(sel).forEach(el => {
      if (el.dataset.tipWired) return;
      el.dataset.tipWired = '1';
      el.setAttribute('data-tip', tip);
      el.style.cursor = 'help';
      el.addEventListener('mouseenter', e => showTooltip(e, tip));
      el.addEventListener('mousemove',  moveTooltip);
      el.addEventListener('mouseleave', hideTooltip);
    });
  });
}

// Re-wire every 2s to catch dynamically injected elements
setInterval(wireTooltips, 2000);
setTimeout(wireTooltips, 800);

/* ================================================================
   SECTION 5 — DEMO STATE MACHINE
   ================================================================ */
let _demoActive   = false;
let _currentStep  = 0;   // 0-indexed into DEMO_STEPS
let _autoInterval = null;
let _autoRunning  = false;
let _lastRingEl   = null;

function buildPips() {
  const container = document.getElementById('demo-step-progress');
  if (!container) return;
  container.innerHTML = '';
  DEMO_STEPS.forEach((_, i) => {
    const pip = document.createElement('div');
    pip.className = 'demo-pip';
    pip.id = `pip-${i}`;
    container.appendChild(pip);
  });
}

function updatePips() {
  DEMO_STEPS.forEach((step, i) => {
    const pip = document.getElementById(`pip-${i}`);
    if (!pip) return;
    pip.className = 'demo-pip ' +
      (i < _currentStep ? 'done' : i === _currentStep ? 'active' : '');
  });
}

function applyPhaseCrumb(phase) {
  ['monitoring','detection','decision','action','result'].forEach(p => {
    const el = document.getElementById(`pc-${p}`);
    if (el) el.className = 'phase-crumb-item';
  });
  const el = document.getElementById(`pc-${phase.toLowerCase()}`);
  if (el) el.className = `phase-crumb-item active-${phase.toLowerCase()}`;
}

function updateNextBtn(step) {
  const btn = document.getElementById('btn-demo-next');
  if (!btn) return;
  const colorMap = {
    NORMAL: '',
    CONGESTED: 'congested',
    REROUTING: 'rerouting',
  };
  btn.className = `demo-btn ${colorMap[step.state] || ''}`;
  const isLast = _currentStep === DEMO_STEPS.length - 1;
  btn.innerHTML = isLast
    ? `<span class="material-symbols-outlined" style="font-size:14px">check_circle</span> Finish Demo`
    : `<span class="material-symbols-outlined" style="font-size:14px">arrow_forward</span> Next Step`;
}

function clearModuleHighlight() {
  if (_lastRingEl) {
    _lastRingEl.classList.remove('demo-module-ring','congested-ring','rerouting-ring');
    _lastRingEl = null;
  }
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('demo-active','congested-nav','rerouting-nav');
  });
}

function highlightModule(step) {
  clearModuleHighlight();

  // Nav item highlight
  const navEl = document.querySelector(`[data-page="${step.page}"]`);
  if (navEl) {
    navEl.classList.add('demo-active');
    if (step.state === 'CONGESTED') navEl.classList.add('congested-nav');
    if (step.state === 'REROUTING') navEl.classList.add('rerouting-nav');
  }

  // Wait for page navigation before highlighting section
  setTimeout(() => {
    const target = step.highlightSelector
      ? document.querySelector(step.highlightSelector)
      : document.getElementById(`page-${step.page}`);
    if (target) {
      target.classList.add('demo-module-ring');
      if (step.state === 'CONGESTED') target.classList.add('congested-ring');
      if (step.state === 'REROUTING') target.classList.add('rerouting-ring');
      _lastRingEl = target;
    }
  }, 350);
}

function showExplainOverlay(step) {
  const ov    = document.getElementById('sdn-explain-overlay');
  const dot   = document.getElementById('explain-phase-dot');
  const label = document.getElementById('explain-phase-label');
  const text  = document.getElementById('explain-text');
  const num   = document.getElementById('explain-step-num');
  if (!ov) return;

  const phaseColors = {
    MONITORING: '#4ae176', DETECTION: '#eb4141',
    DECISION: '#f59e0b',   ACTION: '#f59e0b', RESULT: '#4ae176',
  };
  const col = phaseColors[step.phase] || '#4ae176';
  dot.style.background   = col;
  dot.style.boxShadow    = `0 0 6px ${col}`;
  label.textContent      = step.phase;
  label.style.color      = col;
  text.textContent       = step.explain;
  num.textContent        = `Step ${step.id} / ${DEMO_STEPS.length}`;
  ov.style.display       = 'block';
}

function runStep(stepIdx, opts = {}) {
  if (stepIdx < 0 || stepIdx >= DEMO_STEPS.length) return;
  _currentStep = stepIdx;
  const step = DEMO_STEPS[stepIdx];
  const S = window.SDN_STATE;

  /* ---- 1. Apply exact state for EACH step ---- */
  if (stepIdx === 0) {
    // STEP 1: NORMAL — full system baseline
    S.status = 'NORMAL';  S.congestion = false; S.rerouting = false;
    S.congestedNode = null; S._lastTopoStatus = null; // force topology log refresh
    S.activePath = ['h1-s1', 's1-s2', 's2-s4', 's4-h2'];
    S.oldPath    = ['h1-s1', 's1-s3', 's3-s4', 's4-h2'];
    S.load = 24;  S.latency = 4.2;  S.confidence = 98.4; S._simRunning = false;

  } else if (stepIdx === 1) {
    // STEP 2: CONGESTION detected at s3
    S.status = 'CONGESTED'; S.congestion = true; S.rerouting = false;
    S.congestedNode = 's3'; S._lastTopoStatus = null;
    S.activePath = ['h1-s1', 's1-s2', 's2-s4', 's4-h2'];
    S.load = 87; S.latency = 38.4; S.confidence = 91.2;
    S._graphHistory.push(87); S._graphHistory.shift();

  } else if (stepIdx === 2) {
    // STEP 3: DETECTION — security anomaly flagged (still congested state)
    S.status = 'CONGESTED'; S.congestion = true; S.rerouting = false;
    S.congestedNode = 's3';
    S.load = 87; S.latency = 38.4; S.confidence = 91.2;
    S.suspiciousActivity = 1284;

  } else if (stepIdx === 3) {
    // STEP 4: DECISION — controller evaluating (still congested, decision in progress)
    S.status = 'CONGESTED'; S.congestion = true; S.rerouting = false;
    S.congestedNode = 's3';
    S.load = 87; S.latency = 38.4; S.confidence = 94.0; // confidence rises

  } else if (stepIdx === 4) {
    // STEP 5: REROUTING — path switch executing
    S.status = 'REROUTING'; S.rerouting = true; S.congestion = true;
    S.activePath = ['h1-s1', 's1-s2', 's2-s4', 's4-h2'];
    S.oldPath    = ['h1-s1', 's1-s3', 's3-s4', 's4-h2'];
    S.congestedNode = 's3'; S._lastTopoStatus = null;
    S.load = 42; S.latency = 18.2; S.confidence = 96.7;
    S.rerouteCount += 1;
    S._graphHistory.push(42); S._graphHistory.shift();

  } else if (stepIdx === 5) {
    // STEP 6: STABLE — rerouting complete
    S.status = 'NORMAL'; S.congestion = false; S.rerouting = false;
    S.congestedNode = null; S._lastTopoStatus = null;
    S.activePath = ['h1-s1', 's1-s2', 's2-s4', 's4-h2'];
    S.oldPath    = ['h1-s1', 's1-s3', 's3-s4', 's4-h2'];
    S.load = 24; S.latency = 4.2; S.confidence = 98.8; S._simRunning = false;
    S._graphHistory.push(28); S._graphHistory.shift();
  }

  /* ---- 2. Navigate to correct page FIRST ---- */
  if (typeof window.SDN?.navigate === 'function') window.SDN.navigate(step.page);

  /* ---- 3. Update all UI modules ---- */
  if (typeof window.updateUI === 'function') window.updateUI();

  /* ---- 4. Force topology update AFTER page render (topology SVG must be visible) ---- */
  const topoDelay = step.page === 'topology' ? 120 : 0;
  setTimeout(() => {
    if (typeof window.updateTopology === 'function') window.updateTopology();
  }, topoDelay);

  /* ---- 5. Update flow tracker bar ---- */
  updateFlowTracker(stepIdx);

  /* ---- 6. Highlight module ---- */
  highlightModule(step);

  /* ---- 7. Show explanation overlay ---- */
  showExplainOverlay(step);

  /* ---- 8. Update demo panel ---- */
  const badge = document.getElementById('demo-step-badge');
  if (badge) {
    badge.textContent       = step.badgeTxt;
    badge.style.background  = step.badgeColor + '22';
    badge.style.color       = step.badgeColor;
    badge.style.borderColor = step.badgeColor + '40';
  }
  const titleEl = document.getElementById('demo-step-title-sm');
  if (titleEl) titleEl.textContent = step.title;
  const countEl = document.getElementById('demo-step-count');
  if (countEl) countEl.textContent = `Step ${step.id} of ${DEMO_STEPS.length}`;
  const cardEl = document.getElementById('demo-explain-card');
  if (cardEl) cardEl.innerHTML = `<strong>${step.title}</strong> — ${step.explain}`;
  applyPhaseCrumb(step.phase);
  updatePips();
  updateNextBtn(step);

  /* ---- 9. Fire narrative logs ---- */
  if (!opts.silent) {
    step.logs.forEach((([lvl, txt], i) => {
      setTimeout(() => {
        if (typeof window.SDN?.storyLog === 'function') window.SDN.storyLog(lvl, txt);
        else _fallbackLog(lvl, txt);
      }, i * 800);
    }));
  }

  /* ---- 10. Prev button state ---- */
  const prevBtn = document.getElementById('btn-demo-prev');
  if (prevBtn) prevBtn.style.opacity = stepIdx === 0 ? '0.3' : '1';
}

function startDemo() {
  _demoActive = true;
  document.getElementById('demo-start-banner').style.display = 'none';
  document.getElementById('demo-active-ui').style.display   = 'block';
  // Show flow tracker bar
  const tracker = document.getElementById('sdn-flow-tracker');
  if (tracker) tracker.style.display = 'flex';
  buildPips();
  runStep(0);
  if (typeof window.SDN?.storyLog === 'function') {
    window.SDN.storyLog('INFO', '[INFO] Guided Demo started. Step 1/6: System Monitoring — path h1→s1→s2→s4→h2 active.');
  }
}

function nextStep() {
  if (!_demoActive) { startDemo(); return; }
  if (_currentStep >= DEMO_STEPS.length - 1) { resetDemo(); return; }
  runStep(_currentStep + 1);
}

function prevStep() {
  if (!_demoActive || _currentStep <= 0) return;
  runStep(_currentStep - 1);
}

function resetDemo() {
  stopAutoMode();
  clearModuleHighlight();
  _demoActive  = false;
  _currentStep = 0;

  // Reset state
  const S = window.SDN_STATE;
  S.status = 'NORMAL'; S.congestion = false; S.rerouting = false;
  S.activePath = [...PRIMARY_PATH_LINKS];
  S.oldPath    = [...BACKUP_PATH_LINKS];
  S.congestedNode = null;
  S.load = 24; S.latency = 4.2; S.confidence = 98.4; S._simRunning = false;
  if (typeof window.updateUI === 'function') window.updateUI();
  if (typeof window.SDN?.navigate === 'function') window.SDN.navigate('dashboard');

  // Reset panel
  const badge = document.getElementById('demo-step-badge');
  if (badge) { badge.textContent='READY'; badge.style.background='rgba(74,225,118,0.1)'; badge.style.color='#4ae176'; badge.style.borderColor='rgba(74,225,118,0.2)'; }
  document.getElementById('demo-start-banner').style.display = 'block';
  document.getElementById('demo-active-ui').style.display    = 'none';
  document.getElementById('sdn-explain-overlay').style.display = 'none';

  // Hide flow tracker bar
  const tracker = document.getElementById('sdn-flow-tracker');
  if (tracker) { tracker.style.display = 'none'; updateFlowTracker(-1); }

  if (typeof window.SDN?.storyLog === 'function') window.SDN.storyLog('INFO', '[INFO] Demo reset. System restored to NORMAL state. Path h1→s1→s2→s4→h2 active.');
}

/* Auto mode */
const AUTO_STEP_MS = 4500;
function startAutoMode() {
  if (_autoRunning) { stopAutoMode(); return; }
  _autoRunning = true;
  if (!_demoActive) startDemo();
  const btn = document.getElementById('btn-demo-auto');
  if (btn) { btn.classList.add('running'); btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">stop</span> Stop Auto'; }
  _advanceAuto();
}

function _advanceAuto() {
  if (!_autoRunning) return;
  if (_currentStep >= DEMO_STEPS.length - 1) { stopAutoMode(); return; }
  const bar = document.getElementById('auto-timer-bar');
  if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; setTimeout(() => { bar.style.transition = `width ${AUTO_STEP_MS}ms linear`; bar.style.width = '100%'; }, 30); }
  _autoInterval = setTimeout(() => { nextStep(); _advanceAuto(); }, AUTO_STEP_MS);
}

function stopAutoMode() {
  _autoRunning = false;
  clearTimeout(_autoInterval);
  const btn = document.getElementById('btn-demo-auto');
  if (btn) { btn.classList.remove('running'); btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">fast_forward</span> Auto Mode (full sequence)'; }
  const bar = document.getElementById('auto-timer-bar');
  if (bar) { bar.style.width = '0%'; }
}

/* ================================================================
   SECTION 6 — BUTTON WIRING
   ================================================================ */
setTimeout(() => {
  document.getElementById('btn-demo-start')?.addEventListener('click', startDemo);
  document.getElementById('btn-demo-next')?.addEventListener('click', nextStep);
  document.getElementById('btn-demo-prev')?.addEventListener('click', prevStep);
  document.getElementById('btn-demo-reset')?.addEventListener('click', resetDemo);
  document.getElementById('btn-demo-auto')?.addEventListener('click', startAutoMode);
  document.getElementById('explain-close-btn')?.addEventListener('click', () => {
    document.getElementById('sdn-explain-overlay').style.display = 'none';
  });

  /* Collapse/Expand panel */
  const colBtn = document.getElementById('demo-collapse-btn');
  let _collapsed = false;
  colBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    _collapsed = !_collapsed;
    const body = document.getElementById('demo-panel-body');
    if (body) body.style.display = _collapsed ? 'none' : '';
    colBtn.textContent = _collapsed ? 'add' : 'remove';
    panel.style.width = _collapsed ? '220px' : '340px';
  });

  /* Explain Mode toggle */
  document.getElementById('explain-mode-checkbox')?.addEventListener('change', (e) => {
    document.body.classList.toggle('explain-mode', e.target.checked);
    if (e.target.checked) injectExplainLabels();
  });

  /* Wire existing Demo Controls sidebar buttons to demo mode */
  const simBtn = document.getElementById('btn-run-sim');
  if (simBtn) simBtn.addEventListener('click', startDemo, { capture: true });
}, 700);

/* ================================================================
   SECTION 7 — EXPLAIN MODE: INJECT LABELS ONTO KEY UI ELEMENTS
   ================================================================ */
function injectExplainLabels() {
  const labels = [
    { sel: '#page-dashboard [data-bind="system-latency"]',        label: 'Current end-to-end path delay' },
    { sel: '#page-dashboard [data-bind="congestion-state"]',      label: 'Link utilization %. >75% = alert' },
    { sel: '#page-dashboard [data-bind="reroute-state"]',         label: 'Total path changes this session' },
    { sel: '#ctrl-decision-score',                                 label: 'AI confidence in path decision' },
    { sel: '#vc-hysteresis',                                       label: 'Prevents rapid path flapping' },
    { sel: '#vc-cooldown',                                         label: 'Minimum delay between reroutes' },
    { sel: '#sdn-timeline',                                        label: 'State machine: tracks system lifecycle' },
    { sel: '#flow-intel-panel #fi-active-flows',                   label: 'OpenFlow entries on controller' },
    { sel: '#system-flow-bar',                                     label: 'Data pipeline direction in this SDN system' },
  ];
  labels.forEach(({ sel, label }) => {
    document.querySelectorAll(sel).forEach(el => {
      if (el.dataset.explainInjected) return;
      el.dataset.explainInjected = '1';
      const badge = document.createElement('div');
      badge.className = 'explain-badge';
      badge.textContent = `↑ ${label}`;
      el.parentNode?.insertBefore(badge, el.nextSibling);
    });
  });
}

/* ================================================================
   SECTION 8 — PANEL DRAG (makes demo panel moveable)
   ================================================================ */
(function makeDraggable() {
  const header = document.getElementById('demo-panel-header');
  if (!header) return;
  let dragging = false, ox = 0, oy = 0;
  header.style.cursor = 'grab';
  header.addEventListener('mousedown', (e) => {
    if (e.target.id === 'demo-collapse-btn') return;
    dragging = true;
    ox = e.clientX - panel.getBoundingClientRect().left;
    oy = e.clientY - panel.getBoundingClientRect().top;
    header.style.cursor = 'grabbing';
    panel.style.transition = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const x = e.clientX - ox;
    const y = e.clientY - oy;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, x)) + 'px';
    panel.style.top  = Math.max(64, Math.min(window.innerHeight - panel.offsetHeight, y)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
    header.style.cursor = 'grab';
    panel.style.transition = 'all 0.35s cubic-bezier(0.4,0,0.2,1)';
  });
})();

/* ================================================================
   SECTION 9 — KEYBOARD SHORTCUTS
   ================================================================ */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight' || e.key === 'n') nextStep();
  if (e.key === 'ArrowLeft'  || e.key === 'p') prevStep();
  if (e.key === 'Escape') resetDemo();
  if (e.key === 'a') startAutoMode();
});

/* ================================================================
   UTILITY — fallback log if storyLog not yet available
   ================================================================ */
function _fallbackLog(level, text) {
  const container = document.getElementById('dashboard-log');
  if (!container) return;
  const colors = { INFO:'#60a5fa', WARN:'#facc15', ERROR:'#eb4141', SUCCESS:'#4ae176', EXEC:'#4ae176' };
  const row = document.createElement('div');
  row.className = 'flex gap-4 mt-1';
  const ts = new Date(); const t = `${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}:${String(ts.getSeconds()).padStart(2,'0')}`;
  row.innerHTML = `<span style="color:#334155">[${t}]</span><span><span style="color:${colors[level]||'#ccc'};font-weight:700">${level}:</span> ${text}</span>`;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

/* ================================================================
   SECTION 10 — EXPOSE DEMO API
   ================================================================ */
if (window.SDN) {
  window.SDN.demo = {
    start: startDemo,
    next:  nextStep,
    prev:  prevStep,
    reset: resetDemo,
    auto:  startAutoMode,
    goTo:  (i) => runStep(i),
  };
}

/* ================================================================
   INIT
   ================================================================ */
setTimeout(() => {
  wireTooltips();
  // Show tutorial hint in log
  if (typeof window.SDN?.storyLog === 'function') {
    window.SDN.storyLog('INFO', 'Demo Layer loaded. Click "Start Guided Demo" in the panel (bottom-right) to begin.');
  }
}, 900);

} // end initDemoLayer
