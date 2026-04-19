/* ================================================================
   SDN Traffic Optimizer — Link Load Trend Chart      (chart.js)
   ----------------------------------------------------------------
   Pure Canvas 2D. Zero external dependencies. Zero framework.
   Zero monkey-patching.

   Integration contract:
     • engine.js → updateUI() calls  window.updateChart()  directly
     • DOMContentLoaded calls         window.initChart()    to start

   Public API:         initChart()    updateChart()
   Internal only:      _drawChart()   _animLoop()
   ================================================================ */

/* ──────────────────────────────────────────────────────────────────
   1.  MODULE-LEVEL STATE
   20-point sliding window, pre-filled so the graph is never blank.
────────────────────────────────────────────────────────────────── */
const _WINDOW = 20;                             // number of data points kept

/* Raw target values — pushed by updateChart(), read by _drawChart() */
let _data   = Array(_WINDOW).fill(30);

/* Smoothed render buffer — lerped toward _data each animation frame */
let _smooth = Array(_WINDOW).fill(30);

/* Canvas / context refs  */
let _canvas = null;
let _ctx    = null;

/* Animation loop handle */
let _rafId  = null;

/* Noise phase for subtle idle oscillation */
let _phase  = 0;

/* State colour palette */
const _COLORS = {
  NORMAL:    { stroke: '#4ae176', glow: 'rgba(74,225,118,0.55)',  fill0: 'rgba(74,225,118,0.22)', fill1: 'rgba(74,225,118,0)' },
  CONGESTED: { stroke: '#ef4444', glow: 'rgba(239,68,68,0.60)',   fill0: 'rgba(239,68,68,0.22)',  fill1: 'rgba(239,68,68,0)'  },
  REROUTING: { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.55)',  fill0: 'rgba(245,158,11,0.20)', fill1: 'rgba(245,158,11,0)' },
};
// STABLE is visually identical to NORMAL
_COLORS.STABLE = _COLORS.NORMAL;

/* ──────────────────────────────────────────────────────────────────
   2.  initChart()
   Called once from DOMContentLoaded. Finds the canvas, resizes it
   correctly for device-pixel-ratio, and starts the RAF loop.
────────────────────────────────────────────────────────────────── */
function initChart() {
  _canvas = document.getElementById('link-load-canvas');
  if (!_canvas) return;   // guard: optimization section not in DOM yet

  _ctx = _canvas.getContext('2d');
  _sizeCanvas();

  window.addEventListener('resize', _sizeCanvas);

  /* Seed with SDN_STATE._graphHistory if it exists */
  const hist = (window.SDN_STATE && window.SDN_STATE._graphHistory) || [];
  hist.forEach(v => {
    _data.push(Math.max(4, Math.min(98, v)));
    _data.shift();
  });
  _smooth = [..._data];   // start smooth buffer aligned with data

  _animLoop();            // begin continuous render loop
}

/* ──────────────────────────────────────────────────────────────────
   3.  updateChart()
   Called by engine.js → updateUI() on every SDN state cycle.
   Generates the next data point from SDN_STATE and slides the window.
────────────────────────────────────────────────────────────────── */
function updateChart() {
  /* Lazy init: canvas might not have been ready at DOMContentLoaded */
  if (!_canvas) {
    initChart();
    if (!_canvas) return;
  }

  const S = window.SDN_STATE;
  if (!S) return;

  /* ── Pick base load target from current state ── */
  let base;
  switch (S.status) {
    case 'CONGESTED':  base = 85; break;
    case 'REROUTING':  base = 50; break;
    case 'STABLE':     base = 30; break;
    default:           base = 30; break;   // 'NORMAL'
  }

  /* Blend toward SDN_STATE.load for extra realism */
  if (typeof S.load === 'number') {
    base = base * 0.4 + S.load * 0.6;
  }

  /* Add slight randomness so the line feels live */
  const jitter = Math.random() * 8 - 4;    // ±4 %
  const next   = Math.max(4, Math.min(98, base + jitter));

  /* Slide the window */
  _data.push(next);
  _data.shift();

  /* Update the live value badge */
  _updateBadge(Math.round(next), S.status || 'NORMAL');
}

/* ──────────────────────────────────────────────────────────────────
   4.  _drawChart()
   Pure render function. Called every RAF frame.
   Reads _smooth[] — never mutates state.
────────────────────────────────────────────────────────────────── */
function _drawChart() {
  if (!_ctx || !_canvas) return;

  /* Logical pixel size (DPR correction applied in _sizeCanvas) */
  const dpr = window.devicePixelRatio || 1;
  const W   = _canvas.width  / dpr;
  const H   = _canvas.height / dpr;

  /* Derive colour from SDN_STATE.status */
  const status = (window.SDN_STATE && window.SDN_STATE.status) || 'NORMAL';
  const pal    = _COLORS[status] || _COLORS.NORMAL;

  /* ── 4a. Clear ── */
  _ctx.clearRect(0, 0, W, H);

  /* ── 4b. Background ── */
  _ctx.fillStyle = '#0b1326';
  _ctx.beginPath();
  if (_ctx.roundRect) {
    _ctx.roundRect(0, 0, W, H, 10);
  } else {
    _ctx.rect(0, 0, W, H);
  }
  _ctx.fill();

  /* ── 4c. Layout constants ── */
  const PX = 14;   // horizontal padding
  const PY = 18;   // vertical padding (top + bottom)
  const n  = _smooth.length;
  if (n < 2) return;

  const stepX = (W - PX * 2) / (n - 1);

  /* Map value (0–100) → canvas Y (inverted: 100% = top, 0% = bottom) */
  const toY = v => PY + (1 - v / 100) * (H - PY * 2);

  /* Build point array */
  const pts = _smooth.map((v, i) => ({ x: PX + i * stepX, y: toY(v) }));

  /* ── 4d. Subtle grid lines ── */
  _ctx.save();
  _ctx.setLineDash([3, 6]);
  _ctx.lineWidth   = 1;
  _ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  _ctx.fillStyle   = 'rgba(255,255,255,0.13)';
  _ctx.font        = '9px "Space Grotesk", monospace';
  [25, 50, 75].forEach(pct => {
    const gy = toY(pct);
    _ctx.beginPath();
    _ctx.moveTo(PX, gy);
    _ctx.lineTo(W - PX, gy);
    _ctx.stroke();
    _ctx.fillText(pct + '%', PX + 3, gy - 3);
  });
  _ctx.restore();

  /* ── 4e. Gradient fill under line ── */
  const grad = _ctx.createLinearGradient(0, PY, 0, H - PY);
  grad.addColorStop(0,   pal.fill0);
  grad.addColorStop(1,   pal.fill1);

  _ctx.beginPath();
  _ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    _ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
  }
  _ctx.lineTo(pts[pts.length - 1].x, H - PY);
  _ctx.lineTo(pts[0].x, H - PY);
  _ctx.closePath();
  _ctx.fillStyle = grad;
  _ctx.fill();

  /* ── 4f. Glow pass: draw line twice (blurred then sharp) ── */
  for (let pass = 0; pass < 2; pass++) {
    _ctx.save();
    if (pass === 0) {
      _ctx.shadowBlur  = 14;
      _ctx.shadowColor = pal.glow;
      _ctx.lineWidth   = 3.5;
    } else {
      _ctx.shadowBlur  = 0;
      _ctx.lineWidth   = 2;
    }
    _ctx.strokeStyle = pal.stroke;
    _ctx.lineJoin    = 'round';
    _ctx.lineCap     = 'round';
    _ctx.beginPath();
    _ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      _ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    _ctx.stroke();
    _ctx.restore();
  }

  /* ── 4g. Live dot at the latest point ── */
  const tip = pts[pts.length - 1];

  /* Outer ring */
  _ctx.beginPath();
  _ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
  _ctx.fillStyle = pal.fill0;
  _ctx.fill();

  /* Inner filled dot with glow */
  _ctx.save();
  _ctx.shadowBlur  = 10;
  _ctx.shadowColor = pal.stroke;
  _ctx.beginPath();
  _ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
  _ctx.fillStyle = pal.stroke;
  _ctx.fill();
  _ctx.restore();
}

/* ──────────────────────────────────────────────────────────────────
   5.  _animLoop()
   Continuous requestAnimationFrame loop for silky-smooth lerping.
   Data changes only on updateChart() calls (~2 s) but the render
   interpolates every frame so there are no sudden jumps.
────────────────────────────────────────────────────────────────── */
function _animLoop() {
  /* Lerp smooth buffer toward raw data */
  const LERP = 0.09;   // higher = faster catch-up
  for (let i = 0; i < _data.length; i++) {
    _smooth[i] += (_data[i] - _smooth[i]) * LERP;
  }

  /* Idle micro-oscillation so the line never looks "frozen" */
  _phase += 0.025;
  const mid = Math.floor(_smooth.length / 2);
  _smooth[mid] = _smooth[mid] + Math.sin(_phase) * 0.2;

  _drawChart();
  _rafId = requestAnimationFrame(_animLoop);
}

/* ──────────────────────────────────────────────────────────────────
   6.  _sizeCanvas()
   Sets canvas physical pixels = CSS pixels × devicePixelRatio.
   MUST be called on init and on window resize.
────────────────────────────────────────────────────────────────── */
function _sizeCanvas() {
  if (!_canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const rect = _canvas.getBoundingClientRect();
  _canvas.width  = Math.round(rect.width  * dpr);
  _canvas.height = Math.round(rect.height * dpr);
  _ctx = _canvas.getContext('2d');   // re-acquire after resize
  _ctx.scale(dpr, dpr);
  _drawChart();   // immediate repaint
}

/* ──────────────────────────────────────────────────────────────────
   7.  _updateBadge()
   Updates the live % pill overlaid on the chart area.
────────────────────────────────────────────────────────────────── */
function _updateBadge(value, status) {
  const pal   = _COLORS[status] || _COLORS.NORMAL;
  const dot   = document.getElementById('chart-live-dot');
  const val   = document.getElementById('chart-live-val');
  if (dot) { dot.style.background = pal.stroke; dot.style.boxShadow = `0 0 8px ${pal.stroke}`; }
  if (val) { val.textContent = value + '%'; val.style.color = pal.stroke; }
}

/* ──────────────────────────────────────────────────────────────────
   8.  EXPOSE PUBLIC API
   engine.js guards both calls with  if (window.xxx)  so these
   must be on window before the first updateUI() fires.
────────────────────────────────────────────────────────────────── */
window.initChart   = initChart;
window.updateChart = updateChart;

/* ──────────────────────────────────────────────────────────────────
   9.  SELF-INITIALISE on DOMContentLoaded
   chart.js is loaded synchronously after engine2.js, so
   SDN_STATE is always available by the time this runs.
────────────────────────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChart);
} else {
  /* DOM already parsed (script is deferred or at end of <body>) */
  initChart();
}
