/**
 * Maggiore Ads Calculator v4
 */
const Calculator = (() => {

  function fmtMetric(val) {
    if (!val || val === 0) return 0;
    if (val < 0.01) return parseFloat(val.toFixed(4));
    if (val < 1)    return parseFloat(val.toFixed(3));
    return parseFloat(val.toFixed(2));
  }

  function calcChannel(channelId, industryId, objectiveId, budgetUSD, overrides) {
    const ch      = BENCHMARKS.channels[channelId];
    const ind     = ch && ch.industries[industryId];
    const objMult = BENCHMARKS.objectiveMultipliers[objectiveId];
    if (!ch || !ind || !objMult) return null;

    const cpm          = overrides.cpm ?? ind.cpm;
    const ctr          = overrides.ctr ?? ind.ctr;
    const cvrBench     = ind.cvr * objMult.cvrMult;
    const cvrEffective = overrides.cvr !== undefined ? overrides.cvr : cvrBench;

    const impressions = Math.round((budgetUSD / cpm) * 1000 * objMult.reachMult);
    const clicks      = overrides.cpc !== undefined
      ? Math.round(budgetUSD / overrides.cpc)
      : Math.round(impressions * (ctr / 100));
    const conversions = Math.round(clicks * (cvrEffective / 100));
    const cpa         = conversions > 0 ? budgetUSD / conversions : ind.cpa * objMult.cpaMult;
    const cpcReal     = clicks > 0 ? budgetUSD / clicks : (overrides.cpc ?? ind.cpc);
    const cpmReal     = impressions > 0 ? (budgetUSD / impressions) * 1000 : cpm;

    return {
      channelId,
      channelName:    ch.name,
      channelColor:   ch.color,
      channelIcon:    ch.icon,
      budgetUSD,
      impressions,
      clicks,
      conversions,
      conversionLabel: objMult.label,
      cpa:            parseFloat(cpa.toFixed(2)),
      cpaCLP:         Math.round(cpa * BENCHMARKS.usdToClp),
      cpc:            fmtMetric(cpcReal),
      cpm:            fmtMetric(cpmReal),
      cvr:            parseFloat(cvrEffective.toFixed(2)),
      benchmarkCPC:   fmtMetric(ind.cpc),
      benchmarkCPM:   fmtMetric(ind.cpm),
      benchmarkCVR:   parseFloat(cvrBench.toFixed(2)),
    };
  }

  function calculate({ channels, industryId, objectiveId, budgetUSD, currencyMode, overrides }) {
    const budgetPerChannel = budgetUSD / channels.length;
    const results = channels
      .map(chId => calcChannel(chId, industryId, objectiveId, budgetPerChannel, overrides[chId] || {}))
      .filter(Boolean);
    if (!results.length) return null;

    const totalImpressions = results.reduce((s, c) => s + c.impressions, 0);
    const totalClicks      = results.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = results.reduce((s, c) => s + c.conversions, 0);
    const avgCPM  = totalImpressions > 0 ? (budgetUSD / totalImpressions) * 1000 : 0;
    const avgCPC  = totalClicks > 0 ? budgetUSD / totalClicks : 0;
    const avgCVR  = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const avgCPA  = totalConversions > 0 ? budgetUSD / totalConversions : 0;

    return {
      channels: results,
      totalImpressions,
      totalClicks,
      totalConversions,
      budgetUSD,
      avgCPM:  fmtMetric(avgCPM),
      avgCPC:  fmtMetric(avgCPC),
      avgCVR:  parseFloat(avgCVR.toFixed(2)),
      avgCPA:  parseFloat(avgCPA.toFixed(2)),
      avgCPACLP: Math.round(avgCPA * BENCHMARKS.usdToClp),
      conversionLabel: results[0]?.conversionLabel || 'Leads',
      currencyMode,
    };
  }

  // ── Estado ──
  const state = {
    channels: ['meta', 'google'],
    industryId: null,
    objectiveId: null,
    budgetUSD: 1000,
    currencyMode: 'USD',
    overrides: {},
  };

  function fmt(val, type) {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (type === 'usd') return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (type === 'clp') return '$' + Math.round(val).toLocaleString('es-CL');
    if (type === 'pct') return Number(val).toFixed(2) + '%';
    return Number(val).toLocaleString('es-CL');
  }

  function fmtMoney(usd, clp, cur) {
    return cur === 'CLP' ? fmt(clp, 'clp') : fmt(usd, 'usd');
  }

  function init() {
    // Populate selects
    const indSel = document.getElementById('industry');
    BENCHMARKS.industries.forEach(ind => {
      const o = document.createElement('option');
      o.value = ind.id;
      o.textContent = ind.label;
      indSel.appendChild(o);
    });
    state.industryId = BENCHMARKS.industries[0].id;

    const objSel = document.getElementById('objective');
    BENCHMARKS.objectives.forEach(obj => {
      const o = document.createElement('option');
      o.value = obj.id;
      o.textContent = obj.label;
      objSel.appendChild(o);
    });
    state.objectiveId = BENCHMARKS.objectives[0].id;

    bindEvents();
    document.getElementById('results-section').style.display = 'none';
  }

  function bindEvents() {
    document.getElementById('industry').addEventListener('change', e => {
      state.industryId = e.target.value;
    });
    document.getElementById('objective').addEventListener('change', e => {
      state.objectiveId = e.target.value;
      state.overrides = {};
    });

    const budgetEl = document.getElementById('budget');
    budgetEl.addEventListener('input', () => {
      const raw = parseFloat(budgetEl.value) || 0;
      state.budgetUSD = state.currencyMode === 'CLP' ? raw / BENCHMARKS.usdToClp : raw;
      updateBudgetDisplay();
    });

    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currencyMode = btn.dataset.currency;
        budgetEl.value = state.currencyMode === 'CLP'
          ? Math.round(state.budgetUSD * BENCHMARKS.usdToClp)
          : state.budgetUSD;
        budgetEl.step = state.currencyMode === 'CLP' ? 1000 : 100;
        updateBudgetDisplay();
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

    document.getElementById('btn-reset-sim').addEventListener('click', () => {
      state.overrides = {};
      runCalculation();
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

    const r = calculate({
      channels:    state.channels,
      industryId:  state.industryId,
      objectiveId: state.objectiveId,
      budgetUSD:   state.budgetUSD,
      currencyMode: state.currencyMode,
      overrides:   state.overrides,
    });

    if (!r) { errorEl.textContent = 'Error al calcular.'; return; }

    renderKPIs(r);
    renderSimCards(r);

    const sec = document.getElementById('results-section');
    sec.style.display = 'block';
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderKPIs(r) {
    const cur = r.currencyMode;
    document.getElementById('res-cpm').textContent         = fmtMoney(r.avgCPM, Math.round(r.avgCPM * BENCHMARKS.usdToClp), cur);
    document.getElementById('res-impressions').textContent = fmt(r.totalImpressions);
    document.getElementById('res-cpc').textContent         = fmtMoney(r.avgCPC, Math.round(r.avgCPC * BENCHMARKS.usdToClp), cur);
    document.getElementById('res-clicks').textContent      = fmt(r.totalClicks);
    document.getElementById('res-cvr').textContent         = fmt(r.avgCVR, 'pct');
    document.getElementById('res-conv-label').textContent  = r.conversionLabel;
    document.getElementById('res-conversions').textContent = fmt(r.totalConversions);
    document.getElementById('res-cpa').textContent         = fmtMoney(r.avgCPA, r.avgCPACLP, cur);

    const hasOv = Object.values(state.overrides).some(ov => Object.keys(ov).length > 0);
    const badge = document.getElementById('sim-badge');
    badge.style.display = hasOv ? 'flex' : 'none';
  }

  function renderSimCards(r) {
    const container = document.getElementById('sim-container');
    container.innerHTML = '';

    r.channels.forEach(ch => {
      const ov = state.overrides[ch.channelId] || {};
      const card = document.createElement('div');
      card.className = 'sim-card';
      card.innerHTML = `
        <div class="sim-card-header">
          <span class="sim-card-icon">${ch.channelIcon}</span>
          <span class="sim-card-name">${ch.channelName}</span>
          <span class="sim-card-budget">${fmtMoney(ch.budgetUSD, Math.round(ch.budgetUSD * BENCHMARKS.usdToClp), r.currencyMode)} / mes</span>
        </div>
        <div class="sim-fields">
          <div class="sim-field">
            <label class="sim-field-label${ov.cpc !== undefined ? ' sim-edited' : ''}">CPC</label>
            ${ov.cpc !== undefined ? `<span class="sim-bench">bench: $${ch.benchmarkCPC}</span>` : ''}
            <div class="sim-field-wrap">
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cpc"
                value="${ov.cpc !== undefined ? ov.cpc : ch.cpc}" min="0.01" step="0.01" />
            </div>
          </div>
          <div class="sim-field">
            <label class="sim-field-label${ov.cpm !== undefined ? ' sim-edited' : ''}">CPM</label>
            ${ov.cpm !== undefined ? `<span class="sim-bench">bench: $${ch.benchmarkCPM}</span>` : ''}
            <div class="sim-field-wrap">
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cpm"
                value="${ov.cpm !== undefined ? ov.cpm : ch.cpm}" min="0.01" step="0.01" />
            </div>
          </div>
          <div class="sim-field">
            <label class="sim-field-label${ov.cvr !== undefined ? ' sim-edited' : ''}">CVR %</label>
            ${ov.cvr !== undefined ? `<span class="sim-bench">bench: ${ch.benchmarkCVR}%</span>` : ''}
            <div class="sim-field-wrap">
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cvr"
                value="${ov.cvr !== undefined ? ov.cvr : ch.cvr}" min="0.01" step="0.01" />
              <span class="sim-unit">%</span>
            </div>
          </div>
        </div>`;
      container.appendChild(card);
    });

    container.querySelectorAll('.sim-input').forEach(input => {
      input.addEventListener('change', function() {
        const v = parseFloat(this.value);
        if (isNaN(v) || v <= 0) return;
        if (!state.overrides[this.dataset.channel]) state.overrides[this.dataset.channel] = {};
        state.overrides[this.dataset.channel][this.dataset.metric] = v;
        runCalculation();
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.dispatchEvent(new Event('change')); }
      });
    });
  }

  return { init };
})();

// Init — scripts at bottom of body so DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Calculator.init());
} else {
  Calculator.init();
}
