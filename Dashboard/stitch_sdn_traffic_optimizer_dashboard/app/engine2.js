/* ================================================================
   SDN Traffic Optimizer — Intelligence Enhancement Layer v2.1
   ----------------------------------------------------------------
   Stacks on top of engine.js. engine.js must load first.
   RULES:
     • Zero HTML structure changes
     • All new UI injected via JS with guard checks (idempotent)
     • Wraps updateUI() from engine.js to call enhance_updateUI()
     • Predictive graph replaces random push in engine.js
     • Smart simulation overrides simulateNetworkFlow()
   ================================================================ */

/* ================================================================
   GUARD — Wait for engine.js SDN_STATE to be present
   ================================================================ */
(function waitForEngine() {
  if (typeof window.SDN_STATE === 'undefined') {
    setTimeout(waitForEngine, 50);
    return;
  }
  initEnhancementLayer();
})();

function initEnhancementLayer() {

/* ================================================================
   SECTION 1 — NEW STATE FIELDS
   ================================================================ */
const S = window.SDN_STATE;
// Extend state with new intelligence fields
Object.assign(S, {
  activeFlows:    14,
  reroutedFlows:  0,
  decisionScore:  97,
  systemFlowStage: 0,   // 0=Hardware → 1=Security → 2=Opt → 3=Topo → 4=Dashboard
  _graphTarget:   30,   // predictive graph target value
  _graphCurrent:  [65, 45, 85, 72, 92, 55, 30],
});

/* ================================================================
   SECTION 2 — INJECT GLOBAL ENHANCEMENT CSS
   ================================================================ */
const _css = document.createElement('style');
_css.textContent = `
/* ---- State Transition Timeline ---- */
#sdn-timeline {
  display:flex; align-items:center; gap:0;
  padding: 14px 20px; border-radius:12px;
  background:#060e20; margin-bottom:24px;
  border:1px solid rgba(69,70,77,0.15);
  position:relative; overflow:hidden;
}
#sdn-timeline::before {
  content:''; position:absolute; top:0; left:0; right:0; bottom:0;
  background: linear-gradient(90deg, rgba(74,225,118,0.03) 0%, transparent 100%);
  pointer-events:none;
}
.tl-step {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  position:relative; flex:1; cursor:default;
}
.tl-step-icon {
  width:32px; height:32px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:13px; font-weight:700; font-family:'Space Grotesk',sans-serif;
  border:2px solid rgba(69,70,77,0.3); background:#0b1326;
  transition: all 0.4s ease; position:relative; z-index:1;
}
.tl-step-label {
  font-family:'Space Grotesk',sans-serif; font-size:9px; font-weight:700;
  letter-spacing:0.12em; text-transform:uppercase; color:#475569;
  transition: color 0.4s ease;
}
.tl-connector {
  flex:1; height:2px; background:rgba(69,70,77,0.2);
  position:relative; top:-8px; margin-top:8px;
  transition: background 0.5s ease;
}
.tl-connector.active { background: linear-gradient(90deg,#4ae176,rgba(74,225,118,0.3)); }
.tl-connector.congested { background: linear-gradient(90deg,#eb4141,rgba(235,65,65,0.2)); }
.tl-connector.rerouting { background: linear-gradient(90deg,#f59e0b,rgba(245,158,11,0.2)); }

.tl-step.state-done .tl-step-icon {
  border-color:#4ae176; background:rgba(74,225,118,0.12); color:#4ae176;
  box-shadow:0 0 14px rgba(74,225,118,0.3);
}
.tl-step.state-done .tl-step-label { color:#4ae176; }
.tl-step.state-active .tl-step-icon {
  border-color:#f59e0b; background:rgba(245,158,11,0.1); color:#f59e0b;
  box-shadow:0 0 16px rgba(245,158,11,0.4);
  animation: tlPulse 1s ease infinite;
}
.tl-step.state-active .tl-step-label { color:#f59e0b; }
.tl-step.state-congested .tl-step-icon {
  border-color:#eb4141; background:rgba(235,65,65,0.12); color:#eb4141;
  box-shadow:0 0 16px rgba(235,65,65,0.4);
  animation: tlPulse 0.7s ease infinite;
}
.tl-step.state-congested .tl-step-label { color:#eb4141; }
.tl-step.state-pending .tl-step-icon { border-color:rgba(69,70,77,0.2); color:#334155; }

@keyframes tlPulse {
  0%,100% { transform:scale(1); }
  50%      { transform:scale(1.08); }
}

/* ---- Flow Intelligence Panel ---- */
#flow-intel-panel {
  border-radius:12px; padding:16px 20px;
  background:#171f33; border:1px solid rgba(74,225,118,0.08);
  transition: border-color 0.4s ease;
}
.flow-stat-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; }
.flow-stat-label { font-family:'Space Grotesk',sans-serif; font-size:10px; text-transform:uppercase; letter-spacing:0.12em; color:#475569; }
.flow-stat-value { font-family:'Manrope',sans-serif; font-size:20px; font-weight:800; transition:color 0.4s ease; }
.flow-stat-bar { height:3px; border-radius:2px; margin-top:4px; transition:width 0.6s ease, background 0.4s ease; }

/* ---- System Flow Indicator ---- */
#system-flow-bar {
  display:flex; align-items:center; gap:0;
  padding:8px 12px; border-radius:10px;
  background:#060e20; border:1px solid rgba(69,70,77,0.1);
  margin-bottom:20px; font-family:'Space Grotesk',sans-serif;
}
.sf-stage {
  font-size:9px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
  padding:4px 8px; border-radius:6px; color:#334155;
  transition: all 0.4s ease; white-space:nowrap;
}
.sf-stage.active { color:#4ae176; background:rgba(74,225,118,0.1); }
.sf-stage.congested { color:#eb4141; background:rgba(235,65,65,0.08); }
.sf-stage.rerouting { color:#f59e0b; background:rgba(245,158,11,0.08); }
.sf-arrow { color:#1e293b; font-size:10px; padding:0 2px; }

/* ---- Validation Checks (Optimization) ---- */
#ctrl-validation {
  margin-top:12px; padding:12px; border-radius:10px;
  background:rgba(6,14,32,0.6);
}
.val-check {
  display:flex; align-items:center; gap:8px;
  padding:4px 0; font-family:'Space Grotesk',sans-serif; font-size:11px; color:#475569;
  transition: color 0.3s ease;
}
.val-check.pass { color:#4ae176; }
.val-check.fail { color:#eb4141; }
.val-check-dot {
  width:7px; height:7px; border-radius:50%; flex-shrink:0;
  background:rgba(69,70,77,0.3); transition:background 0.3s ease;
}
.val-check.pass .val-check-dot { background:#4ae176; box-shadow:0 0 5px rgba(74,225,118,0.5); }
.val-check.fail .val-check-dot { background:#eb4141; box-shadow:0 0 5px rgba(235,65,65,0.5); }
#ctrl-decision-score {
  display:flex; align-items:baseline; gap:4px;
  font-family:'Manrope',sans-serif; font-weight:800;
  font-size:26px; color:#4ae176; transition:color 0.4s ease;
}
#ctrl-decision-score span { font-size:11px; font-family:'Space Grotesk',sans-serif; color:#475569; }

/* ---- SVG path animation overlays ---- */
.topo-old-path  { stroke-dasharray:8 6; stroke:#45464d; stroke-width:2; opacity:0.5; transition:opacity 0.6s ease; }
.topo-new-path  { stroke:#4ae176; stroke-width:3; }
.topo-blink     { animation:nodeBlinkRed 0.5s ease infinite; }
@keyframes nodeBlinkRed {
  0%,100% { opacity:1; }
  50%      { opacity:0.2; }
}
@keyframes pathFadeIn {
  from { stroke-dashoffset:100; opacity:0; }
  to   { stroke-dashoffset:0;   opacity:1; }
}

/* ---- Hardware port highlight ---- */
.hw-port-critical {
  background:rgba(235,65,65,0.15) !important;
  border-left:3px solid #eb4141 !important;
  transition: all 0.5s ease;
}
.hw-port-warning {
  background:rgba(245,158,11,0.1) !important;
  border-left:3px solid #f59e0b !important;
}
.hw-port-normal { border-left:3px solid transparent !important; }

/* ---- Log story icons ---- */
.log-icon { display:inline-block; margin-right:4px; font-size:11px; }
`;
document.head.appendChild(_css);

/* ================================================================
   SECTION 3 — INJECT: STATE TRANSITION TIMELINE (Dashboard)
   ================================================================ */
function injectTimeline() {
  if (document.getElementById('sdn-timeline')) return;
  const dashHeader = document.querySelector('#page-dashboard header');
  if (!dashHeader) return;

  const tl = document.createElement('div');
  tl.id = 'sdn-timeline';
  tl.innerHTML = `
    <div class="tl-step" id="tl-normal">
      <div class="tl-step-icon">✓</div>
      <div class="tl-step-label">Normal</div>
    </div>
    <div class="tl-connector" id="tl-conn-1"></div>
    <div class="tl-step" id="tl-congested">
      <div class="tl-step-icon">⚠</div>
      <div class="tl-step-label">Congestion</div>
    </div>
    <div class="tl-connector" id="tl-conn-2"></div>
    <div class="tl-step" id="tl-rerouting">
      <div class="tl-step-icon">↻</div>
      <div class="tl-step-label">Rerouting</div>
    </div>
    <div class="tl-connector" id="tl-conn-3"></div>
    <div class="tl-step" id="tl-stable">
      <div class="tl-step-icon">↗</div>
      <div class="tl-step-label">Stable</div>
    </div>`;
  dashHeader.after(tl);
}

function updateTimeline() {
  const s = window.SDN_STATE;
  const steps = {
    normal:    document.getElementById('tl-normal'),
    congested: document.getElementById('tl-congested'),
    rerouting: document.getElementById('tl-rerouting'),
    stable:    document.getElementById('tl-stable'),
  };
  const conn1 = document.getElementById('tl-conn-1');
  const conn2 = document.getElementById('tl-conn-2');
  const conn3 = document.getElementById('tl-conn-3');
  if (!steps.normal) return;

  const clearAll = () => {
    Object.values(steps).forEach(el => { el.className = 'tl-step state-pending'; });
    [conn1, conn2, conn3].forEach(c => { if(c) c.className = 'tl-connector'; });
  };

  clearAll();
  if (s.status === 'NORMAL') {
    steps.normal.className    = 'tl-step state-done';
    steps.congested.className = 'tl-step state-pending';
    steps.rerouting.className = 'tl-step state-pending';
    steps.stable.className    = 'tl-step state-done';
    if (conn1) conn1.className = 'tl-connector active';
    if (conn3) conn3.className = 'tl-connector active';
  } else if (s.status === 'CONGESTED') {
    steps.normal.className    = 'tl-step state-done';
    steps.congested.className = 'tl-step state-congested';
    steps.rerouting.className = 'tl-step state-pending';
    steps.stable.className    = 'tl-step state-pending';
    if (conn1) conn1.className = 'tl-connector congested';
  } else if (s.status === 'REROUTING') {
    steps.normal.className    = 'tl-step state-done';
    steps.congested.className = 'tl-step state-done';
    steps.rerouting.className = 'tl-step state-active';
    steps.stable.className    = 'tl-step state-pending';
    if (conn1) conn1.className = 'tl-connector rerouting';
    if (conn2) conn2.className = 'tl-connector rerouting';
  }
}

/* ================================================================
   SECTION 4 — INJECT: FLOW INTELLIGENCE PANEL (Dashboard)
   ================================================================ */
function injectFlowIntelPanel() {
  if (document.getElementById('flow-intel-panel')) return;
  // Insert after the KPI row (after the terminal log section)
  const logPanel = document.querySelector('#page-dashboard .rounded-xl.border.overflow-hidden.shadow-2xl');
  if (!logPanel) return;

  const panel = document.createElement('div');
  panel.id = 'flow-intel-panel';
  panel.style.cssText = 'margin-top:24px';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="material-symbols-outlined" style="font-size:16px;color:#4ae176">device_hub</span>
        <span style="font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.12em">Flow Intelligence</span>
      </div>
      <span id="flow-intel-badge" style="font-family:'Space Grotesk',sans-serif;font-size:9px;font-weight:700;padding:3px 8px;border-radius:99px;background:rgba(74,225,118,0.1);color:#4ae176;border:1px solid rgba(74,225,118,0.2)">SYSTEM STABLE</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      <div>
        <div class="flow-stat-label">Active Flows</div>
        <div id="fi-active-flows" class="flow-stat-value" style="color:#dae2fd">14</div>
        <div id="fi-active-bar" class="flow-stat-bar" style="width:70%;background:#4ae176"></div>
      </div>
      <div>
        <div class="flow-stat-label">Rerouted</div>
        <div id="fi-rerouted-flows" class="flow-stat-value" style="color:#dae2fd">0</div>
        <div id="fi-reroute-bar" class="flow-stat-bar" style="width:0%;background:#f59e0b"></div>
      </div>
      <div>
        <div class="flow-stat-label">Drop Rate</div>
        <div id="fi-drop-rate" class="flow-stat-value" style="color:#dae2fd">0.02%</div>
        <div id="fi-drop-bar" class="flow-stat-bar" style="width:2%;background:#eb4141"></div>
      </div>
    </div>
    <div id="fi-status-msg" style="margin-top:12px;font-family:'Space Grotesk',sans-serif;font-size:10px;color:#334155;font-style:italic">
      All flows routed via optimal path. No intervention required.
    </div>`;
  logPanel.after(panel);
}

function updateFlowPanel() {
  const s = window.SDN_STATE;
  const afEl   = document.getElementById('fi-active-flows');
  const rrEl   = document.getElementById('fi-rerouted-flows');
  const drEl   = document.getElementById('fi-drop-rate');
  const abEl   = document.getElementById('fi-active-bar');
  const rbEl   = document.getElementById('fi-reroute-bar');
  const dbEl   = document.getElementById('fi-drop-bar');
  const msgEl  = document.getElementById('fi-status-msg');
  const badge  = document.getElementById('flow-intel-badge');
  const panel  = document.getElementById('flow-intel-panel');
  if (!afEl) return;

  // Active flows fluctuate
  if (s.status === 'CONGESTED') {
    s.activeFlows   = Math.min(20, s.activeFlows + Math.floor(Math.random() * 3));
    s.reroutedFlows = Math.min(s.activeFlows, s.reroutedFlows + Math.floor(Math.random() * 4 + 1));
  } else if (s.status === 'REROUTING') {
    s.reroutedFlows = Math.min(s.activeFlows, s.reroutedFlows + Math.floor(Math.random() * 2));
  } else {
    s.activeFlows   = Math.max(10, s.activeFlows + Math.floor((Math.random() - 0.4) * 2));
    s.reroutedFlows = Math.max(0,  s.reroutedFlows - 1);
  }

  const dropPct = s.status === 'CONGESTED' ? (s.packetLoss * 8).toFixed(2) : s.packetLoss.toFixed(2);
  const rtPct   = s.activeFlows > 0 ? Math.round(s.reroutedFlows / s.activeFlows * 100) : 0;

  afEl.textContent = s.activeFlows;
  rrEl.textContent = s.reroutedFlows;
  drEl.textContent = dropPct + '%';

  const colorAF = s.activeFlows > 18 ? '#f59e0b' : '#dae2fd';
  const colorRR = s.reroutedFlows > 0 ? '#f59e0b' : '#dae2fd';
  const colorDR = parseFloat(dropPct) > 0.5 ? '#eb4141' : '#dae2fd';
  afEl.style.color = colorAF;
  rrEl.style.color = colorRR;
  drEl.style.color = colorDR;

  if (abEl) { abEl.style.width = Math.min(100, s.activeFlows * 5) + '%'; }
  if (rbEl) { rbEl.style.width = rtPct + '%'; rbEl.style.background = rtPct > 30 ? '#eb4141' : '#f59e0b'; }
  if (dbEl) { dbEl.style.width = Math.min(100, parseFloat(dropPct) * 50) + '%'; }

  const msgs = {
    NORMAL:    'All flows routed via optimal path. No intervention required.',
    CONGESTED: `Traffic anomaly detected → ${s.reroutedFlows} flows queued for rerouting via [${s.activePath.join('→')}].`,
    REROUTING: `Rerouting active. ${s.reroutedFlows}/${s.activeFlows} flows migrated to backup path. Threat mitigated via rerouting.`,
  };
  if (msgEl) msgEl.textContent = msgs[s.status] || msgs.NORMAL;

  const badges = {
    NORMAL:    { text: 'SYSTEM STABLE',    bg: 'rgba(74,225,118,0.1)',  color: '#4ae176', border: 'rgba(74,225,118,0.2)' },
    CONGESTED: { text: 'ANOMALY DETECTED', bg: 'rgba(235,65,65,0.1)',   color: '#eb4141', border: 'rgba(235,65,65,0.25)' },
    REROUTING: { text: 'REROUTING ACTIVE', bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', border: 'rgba(245,158,11,0.2)' },
  };
  const b = badges[s.status] || badges.NORMAL;
  if (badge) {
    badge.textContent = b.text;
    badge.style.background = b.bg;
    badge.style.color      = b.color;
    badge.style.border     = `1px solid ${b.border}`;
  }
  if (panel) panel.style.borderColor = b.border;
}

/* ================================================================
   SECTION 5 — INJECT: SYSTEM FLOW INDICATOR (above everything on
   Dashboard)
   ================================================================ */
function injectSystemFlowBar() {
  if (document.getElementById('system-flow-bar')) return;
  const dashPage = document.getElementById('page-dashboard');
  if (!dashPage) return;

  const bar = document.createElement('div');
  bar.id = 'system-flow-bar';
  bar.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:12px;color:#334155;margin-right:6px">account_tree</span>
    <span class="sf-stage" id="sf-hw">Hardware</span>
    <span class="sf-arrow">›</span>
    <span class="sf-stage" id="sf-sec">Security</span>
    <span class="sf-arrow">›</span>
    <span class="sf-stage" id="sf-opt">Optimization</span>
    <span class="sf-arrow">›</span>
    <span class="sf-stage" id="sf-topo">Topology</span>
    <span class="sf-arrow">›</span>
    <span class="sf-stage" id="sf-dash">Dashboard</span>
    <span style="margin-left:auto;font-size:9px;color:#1e293b;font-family:'Space Grotesk',sans-serif">System Data Flow</span>`;
  // Insert as very first child of dashboard page
  dashPage.insertBefore(bar, dashPage.firstChild);
}

function updateSystemFlowBar() {
  const s = window.SDN_STATE;
  const stages = ['sf-hw', 'sf-sec', 'sf-opt', 'sf-topo', 'sf-dash'];
  stages.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'sf-stage';
  });

  // Advance stage every 2s during simulation
  if (s.status !== 'NORMAL') {
    s.systemFlowStage = (s.systemFlowStage + 1) % 5;
    const activeId = stages[s.systemFlowStage];
    const el = document.getElementById(activeId);
    if (el) el.className = `sf-stage ${s.status === 'CONGESTED' ? 'congested' : 'rerouting'}`;
  } else {
    // In normal, all stages glow softly
    stages.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'sf-stage active';
    });
    s.systemFlowStage = 0;
  }
}

/* ================================================================
   SECTION 6 — ENHANCED CONTROLLER DECISION PANEL (Optimization)
   ================================================================ */
function injectControllerValidation() {
  if (document.getElementById('ctrl-validation')) return;
  const confSection = document.querySelector('#page-optimization .flex.items-center.justify-between.mt-6');
  if (!confSection) return;

  // Add decision score above confidence
  const scoreDiv = document.createElement('div');
  scoreDiv.style.cssText = 'margin-bottom:16px';
  scoreDiv.innerHTML = `
    <div style="font-family:'Space Grotesk',sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#475569;margin-bottom:4px">Decision Score</div>
    <div id="ctrl-decision-score">97 <span>/ 100</span></div>`;
  confSection.before(scoreDiv);

  // Validation checks
  const validDiv = document.createElement('div');
  validDiv.id = 'ctrl-validation';
  validDiv.innerHTML = `
    <div style="font-family:'Space Grotesk',sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#334155;margin-bottom:8px">Validation Checks</div>
    <div class="val-check pass" id="vc-path"><div class="val-check-dot"></div>Path Validity</div>
    <div class="val-check pass" id="vc-hysteresis"><div class="val-check-dot"></div>Hysteresis Guard</div>
    <div class="val-check pass" id="vc-cooldown"><div class="val-check-dot"></div>Cooldown Elapsed</div>
    <div class="val-check pass" id="vc-capacity"><div class="val-check-dot"></div>Capacity Sufficient</div>`;
  confSection.after(validDiv);
}

function updateControllerDecision() {
  const s = window.SDN_STATE;
  const scoreEl = document.getElementById('ctrl-decision-score');
  if (scoreEl) {
    s.decisionScore = s.status === 'CONGESTED' ? Math.round(88 + Math.random() * 8)
                    : s.status === 'REROUTING' ? Math.round(93 + Math.random() * 5)
                    : Math.round(95 + Math.random() * 4.5);
    scoreEl.innerHTML = `${s.decisionScore} <span>/ 100</span>`;
    scoreEl.style.color = s.decisionScore < 90 ? '#f59e0b' : '#4ae176';
  }

  const checks = {
    'vc-path':       s.status !== 'CONGESTED',
    'vc-hysteresis': true,
    'vc-cooldown':   s.status === 'NORMAL',
    'vc-capacity':   s.status !== 'CONGESTED',
  };
  Object.entries(checks).forEach(([id, pass]) => {
    const el = document.getElementById(id);
    if (el) el.className = `val-check ${pass ? 'pass' : 'fail'}`;
  });
}

/* ================================================================
   SECTION 7 — PREDICTIVE GRAPH ENGINE
   Replaces random bar push with state-pattern values
   ================================================================ */
function _predictiveBarValue() {
  const s = window.SDN_STATE;
  const prev = s._graphCurrent[s._graphCurrent.length - 1] ?? 30;

  let target;
  if (s.status === 'CONGESTED') {
    // Spike: rapidly approaches 85–100
    target = Math.min(100, prev + 8 + Math.random() * 6);
  } else if (s.status === 'REROUTING') {
    // Gradual decay
    target = Math.max(25, prev - 5 - Math.random() * 5);
  } else {
    // Smooth mean-reverting noise around 35%
    const mean  = 32;
    const delta = (mean - prev) * 0.15 + (Math.random() - 0.5) * 8;
    target = Math.max(10, Math.min(65, prev + delta));
  }
  return parseFloat(target.toFixed(1));
}

function updatePredictiveGraph() {
  const s = window.SDN_STATE;
  const bars = document.querySelectorAll('#page-optimization section.lg\\:col-span-7 .chart-bar > div');
  if (!bars.length) return;

  const newVal = _predictiveBarValue();
  s._graphCurrent.push(newVal);
  s._graphCurrent.shift();
  // Keep in sync with engine.js _graphHistory
  s._graphHistory = [...s._graphCurrent];

  bars.forEach((bar, i) => {
    const h = s._graphCurrent[i] ?? 30;
    const isSpike   = h > 80;
    const isWarning = h > 60 && h <= 80;
    let bg;
    if (isSpike)   bg = s.status === 'REROUTING' ? 'rgba(245,158,11,0.6)' : 'rgba(235,65,65,0.6)';
    else if (isWarning) bg = 'rgba(245,158,11,0.4)';
    else if (i === bars.length - 1) bg = '#4ae176';
    else bg = 'rgba(74,225,118,0.35)';

    bar.style.height     = h + '%';
    bar.style.background = bg;
    bar.style.transition = 'height 0.8s cubic-bezier(0.4,0,0.2,1), background 0.4s ease';
    if (isSpike) bar.style.boxShadow = '0 0 8px rgba(235,65,65,0.3)';
    else bar.style.boxShadow = 'none';
  });
}

/* ================================================================
   SECTION 8 — TOPOLOGY PATH ANIMATION
   Adds visual "old path → new path" storytelling to SVG
   ================================================================ */
function updateTopologyStory() {
  const s = window.SDN_STATE;
  const svg = document.querySelector('#page-topology svg');
  if (!svg) return;

  // The congested link (EDGE_01→CORE_B) has class error-pulse
  const congestedLink = svg.querySelector('path.error-pulse');
  // Active path links have class neon-pulse
  const activePaths   = svg.querySelectorAll('path.neon-pulse');
  // CORE_B node circle
  const coreBGroup    = svg.querySelector('g[transform="translate(300, 300)"]');
  const coreAGroup    = svg.querySelector('g[transform="translate(300, 100)"]');

  if (s.status === 'CONGESTED') {
    // Flash congested link bright red
    if (congestedLink) {
      congestedLink.style.stroke      = '#eb4141';
      congestedLink.style.strokeWidth = '5';
      congestedLink.style.opacity     = '1';
    }
    // Blink CORE_B
    if (coreBGroup) coreBGroup.classList.add('topo-blink');
    // Fade active paths to amber
    activePaths.forEach(p => {
      p.style.stroke = '#f59e0b';
      p.style.strokeWidth = '2';
      p.style.opacity = '0.7';
    });
    // Update CSS var
    document.documentElement.style.setProperty('--active-path-color', '#f59e0b');
  } else if (s.status === 'REROUTING') {
    // Show old path as dashed gray
    if (congestedLink) {
      congestedLink.style.stroke      = '#45464d';
      congestedLink.style.strokeWidth = '2';
      congestedLink.style.strokeDasharray = '6 4';
      congestedLink.style.opacity     = '0.4';
    }
    // Blink stop on CORE_B
    if (coreBGroup) coreBGroup.classList.remove('topo-blink');
    // New path glows green with animation
    activePaths.forEach(p => {
      p.style.stroke = '#4ae176';
      p.style.strokeWidth = '3';
      p.style.opacity = '1';
      p.style.strokeDasharray = '10 5';
      p.style.filter = 'drop-shadow(0 0 10px #4ae176)';
    });
    document.documentElement.style.setProperty('--active-path-color', '#4ae176');
  } else {
    // NORMAL restore
    if (congestedLink) {
      congestedLink.style.stroke      = '#eb4141';
      congestedLink.style.strokeWidth = '4';
      congestedLink.style.strokeDasharray = '';
      congestedLink.style.opacity     = '1';
    }
    if (coreBGroup) coreBGroup.classList.remove('topo-blink');
    activePaths.forEach(p => {
      p.style.stroke = '#4ae176';
      p.style.strokeWidth = '3';
      p.style.strokeDasharray = '10 5';
      p.style.filter = '';
    });
    document.documentElement.style.setProperty('--active-path-color', '#4ae176');
  }

  // Node info panel: update affected switch
  const hostnameEl = document.querySelector('#page-topology .font-headline.text-lg.font-bold.text-on-surface');
  const statusEl   = document.querySelector('#page-topology .flex.items-center.gap-2.text-primary.font-bold');
  if (hostnameEl) hostnameEl.textContent = s.status !== 'NORMAL' ? `${s.affectedSwitch.toUpperCase()}-ETH2` : 'CORE-AS-091';
  if (statusEl) {
    const dot = statusEl.querySelector('span.w-2');
    const txt = statusEl.childNodes[statusEl.childNodes.length - 1];
    const color = s.status === 'CONGESTED' ? '#eb4141' : s.status === 'REROUTING' ? '#f59e0b' : '#4ae176';
    statusEl.style.color = color;
    if (dot) dot.style.background = color;
    if (txt && txt.nodeType === 3) txt.textContent = s.status === 'CONGESTED' ? 'Critical' : s.status === 'REROUTING' ? 'Rerouting' : 'Healthy';
  }
}

/* ================================================================
   SECTION 9 — HARDWARE CAUSE VISUALIZATION
   Highlights s3-eth2 as the root cause port
   ================================================================ */
function updateHardwareCause() {
  const s = window.SDN_STATE;
  // Find all interface rows in hardware page
  const interfaceRows = document.querySelectorAll('#page-hardware .space-y-3 > div, #page-hardware .space-y-4 > div');
  interfaceRows.forEach(row => {
    const txt = row.textContent;
    if (!txt) return;
    const sw = s.affectedSwitch;  // 's3'
    if (txt.toLowerCase().includes(sw.toLowerCase())) {
      if (s.status === 'CONGESTED') {
        row.classList.add('hw-port-critical');
        row.classList.remove('hw-port-warning', 'hw-port-normal');
      } else if (s.status === 'REROUTING') {
        row.classList.add('hw-port-warning');
        row.classList.remove('hw-port-critical', 'hw-port-normal');
      } else {
        row.classList.add('hw-port-normal');
        row.classList.remove('hw-port-critical', 'hw-port-warning');
      }
    }
  });

  // Also update the port interface bars inside switch cards
  const portBars = document.querySelectorAll('#page-hardware .w-full.h-1.rounded-full');
  portBars.forEach((bar, i) => {
    const fill = bar.querySelector('div');
    if (!fill) return;
    if (s.status === 'CONGESTED' && i % 3 === 0) {
      // Simulate some ports at critical load
      const pct = Math.min(100, 80 + Math.random() * 18);
      fill.style.width      = pct + '%';
      fill.style.background = '#eb4141';
      fill.style.boxShadow  = '0 0 6px rgba(235,65,65,0.5)';
      fill.style.transition = 'width 0.8s ease, background 0.4s ease';
    } else if (s.status === 'REROUTING') {
      const pct = Math.max(25, parseFloat(fill.style.width) - 5);
      fill.style.width      = pct + '%';
      fill.style.background = '#f59e0b';
      fill.style.boxShadow  = 'none';
    } else {
      fill.style.background = '#4ae176';
      fill.style.boxShadow  = 'none';
    }
  });
}

/* ================================================================
   SECTION 10 — SECURITY ↔ OPTIMIZATION NARRATIVE LINK
   Shows cross-module status message
   ================================================================ */
function updateSecurityOptLink() {
  const s = window.SDN_STATE;
  // Find the "Isolate Source" button area or anomaly panel desc
  const btn = document.querySelector('#page-security button');
  const secLinkEl = document.getElementById('sec-opt-link');

  if (!secLinkEl) {
    const anomalyPanel = document.querySelector('#page-security .col-span-12.lg\\:col-span-4');
    if (anomalyPanel) {
      const linkDiv = document.createElement('div');
      linkDiv.id = 'sec-opt-link';
      linkDiv.style.cssText = `
        margin-top:10px; padding:8px 12px; border-radius:8px;
        font-family:'Space Grotesk',sans-serif; font-size:10px; font-weight:600;
        display:flex; align-items:center; gap:6px;
        background:rgba(6,14,32,0.6); color:#334155;
        border:1px solid rgba(69,70,77,0.1); transition:all 0.4s ease;`;
      linkDiv.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:13px">sync_alt</span>
        <span id="sec-opt-link-text">Linked to Optimization Engine</span>`;
      anomalyPanel.appendChild(linkDiv);
    }
  } else {
    const txt = document.getElementById('sec-opt-link-text');
    const cfg = {
      CONGESTED: { text: 'Traffic anomaly detected → rerouting initiated', color: '#eb4141', bg: 'rgba(57,0,3,0.4)', border: 'rgba(235,65,65,0.2)' },
      REROUTING: { text: 'Threat mitigated via rerouting — path [' + s.activePath.join('→') + ']', color: '#f59e0b', bg: 'rgba(120,77,4,0.2)', border: 'rgba(245,158,11,0.2)' },
      NORMAL:    { text: 'All systems normal. No anomalies linked to optimization.', color: '#4ae176', bg: 'rgba(6,14,32,0.6)', border: 'rgba(74,225,118,0.08)' },
    };
    const c = cfg[s.status] || cfg.NORMAL;
    secLinkEl.style.color            = c.color;
    secLinkEl.style.background       = c.bg;
    secLinkEl.style.borderColor      = c.border;
    if (txt) txt.textContent         = c.text;
  }
}

/* ================================================================
   SECTION 11 — SMART DEMO SIMULATION (overrides basic simulate)
   ================================================================ */
let _s1, _s2, _s3, _s4;
const SWITCHES = ['s2', 's3', 's4'];

function smartSimulate() {
  const s = window.SDN_STATE;
  if (s._simRunning) return;
  s._simRunning = true;
  clearTimeout(_s1); clearTimeout(_s2); clearTimeout(_s3); clearTimeout(_s4);

  // Randomize affected switch
  s.affectedSwitch = SWITCHES[Math.floor(Math.random() * SWITCHES.length)];
  const spikeLoad  = 75 + Math.floor(Math.random() * 20);  // 75–95%
  const spikeDelay = 2500 + Math.floor(Math.random() * 2000); // 2.5–4.5s
  const rerouteDelay = spikeDelay + 2500 + Math.floor(Math.random() * 1500);
  const recoverDelay = rerouteDelay + 2000 + Math.floor(Math.random() * 2000);

  // Phase 0 — WARN
  _storyLog('INFO', `Monitoring nominal. Load on ${s.affectedSwitch}: ${s.load.toFixed(0)}%. Checking buffer thresholds.`);
  setTimeout(() => _storyLog('WARN', `High buffer utilisation on ${s.affectedSwitch}-eth2. Approaching threshold.`), 800);

  // Phase 1 — CONGESTED
  _s1 = setTimeout(() => {
    s.status     = 'CONGESTED';
    s.congestion = true;
    s.load       = spikeLoad;
    s.latency    = 30 + Math.random() * 15;
    s.confidence = 88 + Math.random() * 5;
    s._graphCurrent.push(spikeLoad);
    s._graphCurrent.shift();
    s._graphHistory = [...s._graphCurrent];
    _enhanceUpdateUI();
    _storyLog('WARN',  `CONGESTED: ${s.affectedSwitch.toUpperCase()} load at ${spikeLoad}%. Latency ${s.latency.toFixed(1)}ms.`);
    setTimeout(() => _storyLog('ERROR', `Packet loss threshold exceeded on ${s.affectedSwitch}-eth3. Triggering reroute decision.`), 700);
  }, spikeDelay);

  // Phase 2 — REROUTING
  _s2 = setTimeout(() => {
    s.status       = 'REROUTING';
    s.rerouting    = true;
    s.activePath   = [1, 2, 4];
    s.oldPath      = [1, 3, 4];
    s.latency      = 15 + Math.random() * 8;
    s.confidence   = 94 + Math.random() * 4;
    s.rerouteCount += 1;
    s._graphCurrent.push(55 + Math.random() * 15);
    s._graphCurrent.shift();
    s._graphHistory = [...s._graphCurrent];
    _enhanceUpdateUI();
    _storyLog('EXEC',    `Rerouting path [${s.activePath.join('→')}] deployed. Old path [${s.oldPath.join('→')}] deprecated.`);
    setTimeout(() => _storyLog('EXEC', `Flow table updated on controller. ${s.rerouteCount} events logged.`), 900);
  }, rerouteDelay);

  // Phase 3 — NORMAL
  _s3 = setTimeout(() => {
    s.status     = 'NORMAL';
    s.congestion = false;
    s.rerouting  = false;
    s.load       = 18 + Math.random() * 12;
    s.latency    = 3 + Math.random() * 3;
    s.confidence = 97 + Math.random() * 2;
    s._simRunning = false;
    s._graphCurrent.push(20 + Math.random() * 15);
    s._graphCurrent.shift();
    s._graphHistory = [...s._graphCurrent];
    _enhanceUpdateUI();
    _storyLog('SUCCESS', `System restored. Path [${s.activePath.join('→')}] stable. Latency: ${s.latency.toFixed(1)}ms.`);
    setTimeout(() => _storyLog('INFO', 'Pulse check: All instances operational.'), 600);
  }, recoverDelay);
}

/* Route the demo control buttons to smartSimulate */
setTimeout(() => {
  const runBtn = document.getElementById('btn-run-sim');
  if (runBtn) {
    runBtn.onclick = () => smartSimulate();
    runBtn.title   = 'Runs a randomised congestion→reroute→restore sequence';
  }
}, 600);

/* ================================================================
   SECTION 12 — STORY LOG SYSTEM (extends _systemLog)
   Adds icons and coloured left-border per level
   ================================================================ */
const LOG_ICONS = { INFO:'🔵', WARN:'🟡', ERROR:'🔴', EXEC:'⚡', SUCCESS:'✅' };
function _storyLog(level, text) {
  const logContainer = document.getElementById('dashboard-log');
  if (!logContainer) return;

  const colors = { INFO: '#60a5fa', WARN: '#facc15', ERROR: '#eb4141', SUCCESS: '#4ae176', EXEC: '#4ae176' };
  const bgMap   = { WARN: 'rgba(120,77,4,0.15)', ERROR: 'rgba(57,0,3,0.2)' };
  const color = colors[level] || '#bec6e0';
  const bg    = bgMap[level]  || 'transparent';
  const icon  = LOG_ICONS[level] || '';
  const ts    = _enhanceTs();

  const row = document.createElement('div');
  row.className = 'flex gap-4 mt-1';
  row.style.cssText = `animation:fadeIn 0.3s ease;background:${bg};border-radius:6px;padding:${bg !== 'transparent' ? '2px 4px' : '0'};`;
  if (bg !== 'transparent') row.style.marginLeft = '-4px';

  row.innerHTML = `<span style="color:#334155;flex-shrink:0">[${ts}]</span><span><span style="color:${color};font-weight:700">${icon} ${level}:</span> ${text}</span>`;
  logContainer.appendChild(row);

  while (logContainer.children.length > 25) logContainer.removeChild(logContainer.firstChild);
  logContainer.scrollTop = logContainer.scrollHeight;

  // Flash border highlight
  row.style.outline = `1px solid ${color}22`;
  setTimeout(() => { row.style.outline = 'none'; }, 1400);
}

/* ================================================================
   SECTION 13 — MASTER ENHANCE_UPDATEUI (wraps engine.js updateUI)
   ================================================================ */
const _engine1UpdateUI = window.updateUI || (() => {});

function _enhanceUpdateUI() {
  _engine1UpdateUI();             // call engine.js updateUI
  updateTimeline();
  updateFlowPanel();
  updateSystemFlowBar();
  updateControllerDecision();
  updatePredictiveGraph();
  updateTopologyStory();
  updateHardwareCause();
  updateSecurityOptLink();
}

// Override the global updateUI so the 2s interval in engine.js
// also calls our enhancements automatically
window.updateUI = _enhanceUpdateUI;

/* ================================================================
   SECTION 14 — INIT INJECTIONS + FIRST RENDER
   ================================================================ */
setTimeout(() => {
  injectTimeline();
  injectFlowIntelPanel();
  injectSystemFlowBar();
  injectControllerValidation();
  _enhanceUpdateUI();
  _storyLog('INFO', 'Intelligence Layer v2.1 loaded. Predictive graph active.');
  _storyLog('INFO', `Active path [${window.SDN_STATE.activePath.join('→')}]. All ${window.SDN_STATE.activeFlows} flows nominal.`);
}, 650);

/* Expose via SDN global */
if (window.SDN) {
  window.SDN.smartSimulate = smartSimulate;
  window.SDN.storyLog      = _storyLog;
}

/* ================================================================
   UTILITY
   ================================================================ */
function _enhanceTs() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
}

} // end initEnhancementLayer
