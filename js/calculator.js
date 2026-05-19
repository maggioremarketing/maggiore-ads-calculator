/**
 * Maggiore Ads Calculator v6
 * KPIs: CPM🟡 · Impresiones🟢 · CTR🟡 · CPC🟢 · Clics🟢 · CVR🟡 · Leads🟢 · CPA🟢
 * Sliders + inputs en tarjetas amarillas. Sin sección de canales separada.
 */
const Calculator = (() => {

  function fmtMetric(val) {
    if (!val || val === 0) return 0;
    if (val < 0.01) return parseFloat(val.toFixed(4));
    if (val < 1)    return parseFloat(val.toFixed(3));
    return parseFloat(val.toFixed(2));
  }

  // Calcula con parámetros agregados (overrides afectan todos los canales)
  function calcAggregate(budgetUSD, channels, industryId, objectiveId, overrides) {
    // Promediar benchmarks de los canales seleccionados
    let sumCPM = 0, sumCTR = 0, sumCVR = 0, sumCPA = 0;
    let count = 0;
    channels.forEach(chId => {
      const ch  = BENCHMARKS.channels[chId];
      const ind = ch && ch.industries[industryId];
      const obj = BENCHMARKS.objectiveMultipliers[objectiveId];
      if (!ind || !obj) return;
      sumCPM += ind.cpm;
      sumCTR += ind.ctr;
      sumCVR += ind.cvr * obj.cvrMult;
      sumCPA += ind.cpa * obj.cpaMult;
      count++;
    });
    if (!count) return null;

    const obj = BENCHMARKS.objectiveMultipliers[objectiveId];
    const benchCPM = sumCPM / count;
    const benchCTR = sumCTR / count;
    const benchCVR = sumCVR / count;

    // Usar override si existe, si no el benchmark
    const cpm = overrides.cpm !== undefined ? overrides.cpm : benchCPM;
    const ctr = overrides.ctr !== undefined ? overrides.ctr : benchCTR;
    const cvr = overrides.cvr !== undefined ? overrides.cvr : benchCVR;

    const impressions = Math.round((budgetUSD / cpm) * 1000 * obj.reachMult);
    const clicks      = Math.round(impressions * (ctr / 100));
    const conversions = Math.round(clicks * (cvr / 100));
    const cpc         = clicks > 0 ? budgetUSD / clicks : 0;
    const cpa         = conversions > 0 ? budgetUSD / conversions : (sumCPA / count);

    return {
      impressions, clicks, conversions,
      budgetUSD,
      cpm: fmtMetric(cpm),
      ctr: parseFloat(ctr.toFixed(2)),
      cpc: fmtMetric(cpc),
      cvr: parseFloat(cvr.toFixed(2)),
      cpa: parseFloat(cpa.toFixed(2)),
      cpaCLP: Math.round(cpa * BENCHMARKS.usdToClp),
      benchCPM: fmtMetric(benchCPM),
      benchCTR: parseFloat(benchCTR.toFixed(2)),
      benchCVR: parseFloat(benchCVR.toFixed(2)),
    };
  }

  const state = {
    channels: ['meta', 'google'],
    industryId: null,
    objectiveId: null,
    budgetUSD: 1000,
    currencyMode: 'USD',
    overrides: {},   // { cpm, ctr, cvr }
    lastResult: null,
  };

  function fmt(val, type) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (type === 'usd') return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (type === 'clp') return '$' + Math.round(val).toLocaleString('es-CL');
    if (type === 'pct') return Number(val).toFixed(2) + '%';
    return Number(val).toLocaleString('es-CL');
  }
  function fmtMoney(usd, clp, cur) { return cur === 'CLP' ? fmt(clp, 'clp') : fmt(usd, 'usd'); }

  function init() {
    // Populate selects
    const indSel = document.getElementById('industry');
    BENCHMARKS.industries.forEach(ind => {
      const o = document.createElement('option');
      o.value = ind.id; o.textContent = ind.label;
      indSel.appendChild(o);
    });
    state.industryId = BENCHMARKS.industries[0].id;

    const objSel = document.getElementById('objective');
    BENCHMARKS.objectives.forEach(obj => {
      const o = document.createElement('option');
      o.value = obj.id; o.textContent = obj.label;
      objSel.appendChild(o);
    });
    state.objectiveId = BENCHMARKS.objectives[0].id;

    bindFormEvents();
    bindSliderEvents();
    document.getElementById('results-section').style.display = 'none';
  }

  function bindFormEvents() {
    document.getElementById('industry').addEventListener('change', e => {
      state.industryId = e.target.value;
      state.overrides = {};
      if (state.lastResult) runCalculation();
    });
    document.getElementById('objective').addEventListener('change', e => {
      state.objectiveId = e.target.value;
      state.overrides = {};
      if (state.lastResult) runCalculation();
    });

    const budgetEl = document.getElementById('budget');
    budgetEl.addEventListener('input', () => {
      const raw = parseFloat(budgetEl.value) || 0;
      state.budgetUSD = state.currencyMode === 'CLP' ? raw / BENCHMARKS.usdToClp : raw;
      updateBudgetDisplay();
      if (state.lastResult) runCalculation();
    });

    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currencyMode = btn.dataset.currency;
        const budgetEl = document.getElementById('budget');
        budgetEl.value = state.currencyMode === 'CLP'
          ? Math.round(state.budgetUSD * BENCHMARKS.usdToClp) : state.budgetUSD;
        budgetEl.step = state.currencyMode === 'CLP' ? 1000 : 100;
        updateBudgetDisplay();
        if (state.lastResult) renderKPIs(state.lastResult);
      });
    });

    document.querySelectorAll('.channel-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = btn.dataset.channel;
        const active = new Set(state.channels);
        if (active.has(ch)) { if (active.size > 1) active.delete(ch); }
        else active.add(ch);
        state.channels = [...active];
        document.querySelectorAll('.channel-toggle').forEach(b =>
          b.classList.toggle('active', state.channels.includes(b.dataset.channel))
        );
      });
    });

    document.getElementById('btn-calculate').addEventListener('click', () => {
      state.overrides = {};
      runCalculation();
    });

    // Ticket promedio — recalculate ROAS on input
    const ticketInput = document.getElementById('input-ticket');
    if (ticketInput) {
      ticketInput.addEventListener('input', () => {
        if (state.lastResult) renderROAS(state.lastResult);
      });
    }


    // PDF Export
    const exportBtn = document.getElementById('btn-export-pdf');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportPDF);
    }

    document.getElementById('btn-reset-sim').addEventListener('click', () => {
      state.overrides = {};
      runCalculation();
    });
  }

  function bindSliderEvents() {
    // CPM
    bindCPMSlider();
    // CTR
    bindSliderPair('ctr', 'slider-ctr', 'input-ctr');
    // CVR
    bindSliderPair('cvr', 'slider-cvr', 'input-cvr');
  }


  // CPM slider — handles USD/CLP conversion
  function bindCPMSlider() {
    const slider = document.getElementById('slider-cpm');
    const input  = document.getElementById('input-cpm');

    function cpmDisplayToUSD(v) {
      return state.currencyMode === 'CLP' ? v / BENCHMARKS.usdToClp : v;
    }
    function cpmUSDToDisplay(v) {
      return state.currencyMode === 'CLP' ? Math.round(v * BENCHMARKS.usdToClp) : v;
    }

    slider.addEventListener('input', () => {
      const displayVal = parseFloat(slider.value);
      input.value = displayVal;
      state.overrides.cpm = cpmDisplayToUSD(displayVal);
      runCalculation();
    });

    input.addEventListener('change', () => {
      const displayVal = parseFloat(input.value);
      if (isNaN(displayVal) || displayVal <= 0) return;
      const usdVal = cpmDisplayToUSD(displayVal);
      slider.value = Math.min(Math.max(displayVal, parseFloat(slider.min)), parseFloat(slider.max));
      state.overrides.cpm = usdVal;
      runCalculation();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.dispatchEvent(new Event('change')); }
    });

    // Expose update function for currency switches
    window._syncCPMDisplay = function(cpmUSD) {
      const displayVal = cpmUSDToDisplay(cpmUSD);
      const isClp = state.currencyMode === 'CLP';
      // Adjust slider range for CLP
      slider.min  = isClp ? 500  : 1;
      slider.max  = isClp ? 50000 : 50;
      slider.step = isClp ? 500  : 0.5;
      input.step  = isClp ? 500  : 0.5;
      if (document.activeElement !== input) input.value = displayVal;
      if (!slider.matches(':active')) slider.value = Math.min(Math.max(displayVal, parseFloat(slider.min)), parseFloat(slider.max));
    };
  }

  function bindSliderPair(metric, sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input  = document.getElementById(inputId);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      input.value = val;
      state.overrides[metric] = val;
      runCalculation();
    });

    input.addEventListener('change', () => {
      const val = parseFloat(input.value);
      if (isNaN(val) || val <= 0) return;
      slider.value = Math.min(Math.max(val, parseFloat(slider.min)), parseFloat(slider.max));
      state.overrides[metric] = val;
      runCalculation();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.dispatchEvent(new Event('change')); }
    });
  }

  function updateBudgetDisplay() {
    const el = document.getElementById('budget-display');
    if (!el) return;
    el.textContent = state.currencyMode === 'USD'
      ? '≈ ' + fmt(Math.round(state.budgetUSD * BENCHMARKS.usdToClp), 'clp') + ' CLP'
      : '≈ ' + fmt(state.budgetUSD, 'usd') + ' USD';
  }

  function runCalculation() {
    const errorEl = document.getElementById('error-msg');
    if (!state.channels.length) { errorEl.textContent = 'Selecciona al menos un canal.'; return; }
    errorEl.textContent = '';

    const r = calcAggregate(state.budgetUSD, state.channels, state.industryId, state.objectiveId, state.overrides);
    if (!r) { errorEl.textContent = 'Error al calcular.'; return; }

    // Attach currency and conversion label
    r.currencyMode = state.currencyMode;
    const objMult = BENCHMARKS.objectiveMultipliers[state.objectiveId];
    r.conversionLabel = objMult ? objMult.label : 'Leads';
    state.lastResult = r;

    renderKPIs(r);
    renderROAS(r);
    renderProjectionTable();

    const sec = document.getElementById('results-section');
    if (sec.style.display === 'none') {
      sec.style.display = 'block';
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderKPIs(r) {
    const cur = r.currencyMode;
    const hasOv = Object.keys(state.overrides).length > 0;

    // Green values
    document.getElementById('res-impressions').textContent = fmt(r.impressions);
    document.getElementById('res-cpc').textContent         = fmtMoney(r.cpc, Math.round(r.cpc * BENCHMARKS.usdToClp), cur);
    document.getElementById('res-clicks').textContent      = fmt(r.clicks);
    document.getElementById('res-conv-label').textContent  = r.conversionLabel;
    document.getElementById('res-conversions').textContent = fmt(r.conversions);
    document.getElementById('res-cpa').textContent         = fmtMoney(r.cpa, r.cpaCLP, cur);

    // Display values in cards
    document.getElementById('res-cpm').textContent = cur === 'CLP'
      ? fmt(Math.round(r.cpm * BENCHMARKS.usdToClp), 'clp')
      : fmt(r.cpm, 'usd');
    document.getElementById('res-ctr').textContent = fmt(r.ctr, 'pct');
    document.getElementById('res-cvr').textContent = fmt(r.cvr, 'pct');

    // Sync sliders and inputs without triggering events
    if (window._syncCPMDisplay) window._syncCPMDisplay(r.cpm); else syncSliderInput('slider-cpm', 'input-cpm', r.cpm);
    syncSliderInput('slider-ctr', 'input-ctr', r.ctr);
    syncSliderInput('slider-cvr', 'input-cvr', r.cvr);

    // Reset button
    const resetBtn = document.getElementById('btn-reset-sim');
    resetBtn.style.display = hasOv ? 'inline-block' : 'none';
    const exportBtn = document.getElementById('btn-export-pdf');
    if (exportBtn) exportBtn.style.display = 'inline-block';

    // Highlight edited cards
    ['cpm','ctr','cvr'].forEach(m => {
      const card = document.getElementById('card-' + m);
      if (card) card.classList.toggle('kpi-edited', state.overrides[m] !== undefined);
    });
  }

  function syncSliderInput(sliderId, inputId, val) {
    const slider = document.getElementById(sliderId);
    const input  = document.getElementById(inputId);
    if (slider && !slider.matches(':active')) slider.value = Math.min(Math.max(val, parseFloat(slider.min)), parseFloat(slider.max));
    if (input  && document.activeElement !== input) input.value = val;
  }


  function renderROAS(r) {
    const ticketEl = document.getElementById('input-ticket');
    const roasCard = document.getElementById('roas-card');
    const roasVal  = document.getElementById('res-roas');

    const ticketRaw = parseFloat(ticketEl ? ticketEl.value : '');
    if (!ticketEl || isNaN(ticketRaw) || ticketRaw <= 0) {
      if (roasCard) roasCard.style.display = 'none';
      var ps = document.getElementById('projection-table-section');
      if (ps) ps.style.display = 'none';
      return;
    }

    // Always use state.budgetUSD (always in USD regardless of display mode)
    const budgetUSD = state.budgetUSD;

    // Ticket: convert to USD if in CLP mode
    const ticketUSD = state.currencyMode === 'CLP'
      ? ticketRaw / BENCHMARKS.usdToClp
      : ticketRaw;

    const conversions = r ? r.conversions : 0;
    const revenue = conversions * ticketUSD;
    const roas    = budgetUSD > 0 ? revenue / budgetUSD : 0;

    if (roasCard) roasCard.style.display = 'flex';
    if (roasVal)  roasVal.textContent = roas.toFixed(2) + 'x';
    renderProjectionTable();
  }


  async function exportPDF() {
    const btn = document.getElementById('btn-export-pdf');
    const original = btn.textContent;
    btn.textContent = 'Generando...';
    btn.disabled = true;

    try {
      const section = document.getElementById('results-section');
      const canvas = await html2canvas(section, {
        scale: 2,
        backgroundColor: '#0a0a0a',
        useCORS: true,
        logging: false,
        windowWidth: section.scrollWidth,
        windowHeight: section.scrollHeight,
      });

      // Download as PNG
      const link = document.createElement('a');
      const now = new Date().toISOString().slice(0, 10);
      link.download = 'proyeccion-maggiore-' + now + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch(e) {
      alert('Error al exportar. Intenta de nuevo.');
      console.error(e);
    } finally {
      btn.textContent = original;
      btn.disabled = false;
    }
  }


  function renderProjectionTable() {
    try {
    var ticketEl  = document.getElementById('input-ticket');
    var tableSection = document.getElementById('projection-table-section');
    var tbody = document.getElementById('projection-tbody');
    if (!tableSection || !tbody || !state.lastResult) return;

    var ticketRaw = parseFloat(ticketEl ? ticketEl.value : '');
    if (!ticketEl || isNaN(ticketRaw) || ticketRaw <= 0) {
      tableSection.style.display = 'none';
      return;
    }

    var cur = state.currencyMode;
    var ticketUSD = cur === 'CLP' ? ticketRaw / BENCHMARKS.usdToClp : ticketRaw;
    var baseBudget = state.budgetUSD;

    // Investment scale multipliers — current budget highlighted
    var multipliers = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

    tbody.innerHTML = '';

    multipliers.forEach(function(mult) {
      var budget = baseBudget * mult;
      var r = calcAggregate(budget, state.channels, state.industryId, state.objectiveId, state.overrides);
      if (!r) return;

      var revenue  = r.conversions * ticketUSD;
      var roas     = budget > 0 ? revenue / budget : 0;
      var isCurrent = mult === 1;

      var tr = document.createElement('tr');
      if (isCurrent) tr.style.cssText = 'background:rgba(66,184,180,0.12);font-weight:700;';

      function cell(val, green) {
        var td = document.createElement('td');
        td.textContent = val;
        if (green) td.style.color = '#78db43';
        if (isCurrent) td.style.fontWeight = '700';
        return td;
      }

      var budgetDisplay = cur === 'CLP'
        ? '$' + Math.round(budget * BENCHMARKS.usdToClp).toLocaleString('es-CL') + ' CLP'
        : '$' + budget.toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0}) + ' USD';

      var revenueUSD = revenue;
      var revenueDisplay = cur === 'CLP'
        ? '$' + Math.round(revenueUSD * BENCHMARKS.usdToClp).toLocaleString('es-CL') + ' CLP'
        : '$' + revenueUSD.toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0}) + ' USD';

      var cpaDisplay = cur === 'CLP'
        ? '$' + Math.round(r.cpa * BENCHMARKS.usdToClp).toLocaleString('es-CL')
        : '$' + r.cpa.toFixed(2);

      tr.appendChild(cell(isCurrent ? budgetDisplay + ' ★' : budgetDisplay, false));
      tr.appendChild(cell(r.impressions.toLocaleString('es-CL'), false));
      tr.appendChild(cell(r.clicks.toLocaleString('es-CL'), false));
      tr.appendChild(cell(r.conversions.toLocaleString('es-CL'), true));
      tr.appendChild(cell(cpaDisplay, false));
      tr.appendChild(cell(revenueDisplay, true));
      tr.appendChild(cell(roas.toFixed(2) + 'x', roas >= 1));
      tbody.appendChild(tr);
    });

    tableSection.style.display = 'block';
    } catch(e) { console.error('Projection table error:', e); }
  }

  return { init, renderProjectionTable, getState: () => state, calcAggregate };
})();

// Expose for inline calls
window.renderProjectionTable = function() {
  try { Calculator.renderProjectionTable(); } catch(e) { console.error('PT error:', e); }
};
window.calcAggregate = function(b,c,i,o,ov) { return Calculator.calcAggregate(b,c,i,o,ov); };
window.getCalcState  = function() { return Calculator.getState(); };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Calculator.init());
} else {
  Calculator.init();
}
