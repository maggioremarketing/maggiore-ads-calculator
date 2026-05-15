/**
 * Maggiore Ads Calculator v4
 * Sin ROI/Revenue. KPIs: CPM · Impresiones · CPC · Clics · CVR · Leads · CPA
 * Simulación por canal con inputs amarillos siempre visibles post-cálculo.
 */

const Calculator = (() => {

  function fmtMetric(val) {
    if (!val || val === 0) return 0;
    if (val < 0.01) return parseFloat(val.toFixed(4));
    if (val < 1)    return parseFloat(val.toFixed(3));
    return parseFloat(val.toFixed(2));
  }

  function calcChannel(channelId, industryId, objectiveId, budgetUSD, months, overrides = {}) {
    const ch  = BENCHMARKS.channels[channelId];
    if (!ch) return null;
    const ind     = ch.industries[industryId];
    const objMult = BENCHMARKS.objectiveMultipliers[objectiveId];
    if (!ind || !objMult) return null;

    const totalBudget = budgetUSD * months;

    const cpm = overrides.cpm ?? ind.cpm;
    const ctr = overrides.ctr ?? ind.ctr;
    const cvrBench    = ind.cvr * objMult.cvrMult;
    const cvrEffective = overrides.cvr !== undefined ? overrides.cvr : cvrBench;

    const impressions = Math.round((totalBudget / cpm) * 1000 * objMult.reachMult);
    const clicks      = overrides.cpc !== undefined
      ? Math.round(totalBudget / overrides.cpc)
      : Math.round(impressions * (ctr / 100));
    const conversions = Math.round(clicks * (cvrEffective / 100));
    const cpa         = conversions > 0 ? totalBudget / conversions : ind.cpa * objMult.cpaMult;
    const cpcReal     = clicks > 0 ? totalBudget / clicks : (overrides.cpc ?? ind.cpc);
    const cpmReal     = impressions > 0 ? (totalBudget / impressions) * 1000 : cpm;

    const badgeColor = ch.channelColor === '#010101'
      ? (ch.channelColorAlt || '#EE1D52') : ch.channelColor;

    return {
      channelId,
      channelName:    ch.name,
      channelColor:   badgeColor,
      channelIcon:    ch.icon,
      budgetUSD:      totalBudget,
      impressions,
      clicks,
      conversions,
      conversionLabel: BENCHMARKS.objectives.find(o => o.id === objectiveId)?.conversionLabel || 'Leads',
      cpa:            parseFloat(cpa.toFixed(2)),
      cpaCLP:         Math.round(cpa * BENCHMARKS.usdToClp),
      cpc:            fmtMetric(cpcReal),
      cpm:            fmtMetric(cpmReal),
      ctr:            parseFloat(ctr.toFixed(2)),
      cvr:            parseFloat(cvrEffective.toFixed(2)),
      benchmarkCPC:   fmtMetric(ind.cpc),
      benchmarkCPM:   fmtMetric(ind.cpm),
      benchmarkCVR:   parseFloat(cvrBench.toFixed(2)),
      hasOverride:    Object.keys(overrides).length > 0,
    };
  }

  function calculate({ channels, industryId, objectiveId, budgetUSD, months, currencyMode, overrides = {} }) {
    const budgetPerChannel = budgetUSD / channels.length;
    const results = channels
      .map(chId => calcChannel(chId, industryId, objectiveId, budgetPerChannel, months, overrides[chId] || {}))
      .filter(Boolean);

    if (!results.length) return null;

    const totalImpressions = results.reduce((s, c) => s + c.impressions, 0);
    const totalClicks      = results.reduce((s, c) => s + c.clicks, 0);
    const totalConversions = results.reduce((s, c) => s + c.conversions, 0);
    const totalBudget      = budgetUSD * months;
    const avgCPA           = totalConversions > 0 ? totalBudget / totalConversions : 0;
    const avgCPM           = totalImpressions > 0 ? (totalBudget / totalImpressions) * 1000 : 0;
    const avgCPC           = totalClicks > 0 ? totalBudget / totalClicks : 0;
    const avgCVR           = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      channels: results,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalBudget,
      totalBudgetCLP: Math.round(totalBudget * BENCHMARKS.usdToClp),
      avgCPA:         parseFloat(avgCPA.toFixed(2)),
      avgCPACLP:      Math.round(avgCPA * BENCHMARKS.usdToClp),
      avgCPM:         fmtMetric(avgCPM),
      avgCPC:         fmtMetric(avgCPC),
      avgCVR:         parseFloat(avgCVR.toFixed(2)),
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

  // ── Formateo ──
  function fmt(val, type = 'number') {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (type === 'currency-usd') return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    if (type === 'currency-clp') return '$' + Math.round(val).toLocaleString('es-CL');
    if (type === 'percent')      return (val >= 0 ? '+' : '') + val.toFixed(1) + '%';
    return val.toLocaleString('es-CL');
  }

  function fmtCurrency(usd, clp, cur) {
    return cur === 'CLP' ? fmt(clp, 'currency-clp') : fmt(usd, 'currency-usd');
  }

  // ── Init ──
  function init() {
    populateSelects();
    bindEvents();
    document.getElementById('results-section').style.display = 'none';
  }

  function populateSelects() {
    const indSel = document.getElementById('industry');
    BENCHMARKS.industries.forEach(ind => {
      const o = document.createElement('option');
      o.value = ind.id; o.textContent = ind.name;
      indSel.appendChild(o);
    });
    state.industryId = BENCHMARKS.industries[0]?.id;

    const objSel = document.getElementById('objective');
    BENCHMARKS.objectives.forEach(obj => {
      const o = document.createElement('option');
      o.value = obj.id; o.textContent = obj.name;
      objSel.appendChild(o);
    });
    state.objectiveId = BENCHMARKS.objectives[0]?.id;
  }

  function bindEvents() {
    document.getElementById('industry').addEventListener('change', e => {
      state.industryId = e.target.value;
      if (state.overrides && Object.keys(state.overrides).length) runCalculation(true);
      else state.overrides = {};
    });
    document.getElementById('objective').addEventListener('change', e => {
      state.objectiveId = e.target.value;
      state.overrides = {};
    });

    // Budget
    const budgetEl = document.getElementById('budget');
    budgetEl.addEventListener('input', () => {
      const cur = state.currencyMode;
      const raw = parseFloat(budgetEl.value) || 0;
      state.budgetUSD = cur === 'CLP' ? raw / BENCHMARKS.usdToClp : raw;
      updateBudgetDisplay();
    });

    // Currency toggle
    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currencyMode = btn.dataset.currency;
        const budgetEl = document.getElementById('budget');
        if (state.currencyMode === 'CLP') {
          budgetEl.value = Math.round(state.budgetUSD * BENCHMARKS.usdToClp);
          budgetEl.step = 1000;
        } else {
          budgetEl.value = state.budgetUSD;
          budgetEl.step = 100;
        }
        updateBudgetDisplay();
      });
    });

    // Channels
    document.querySelectorAll('.channel-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = btn.dataset.channel;
        const active = new Set(state.channels);
        if (active.has(ch)) { if (active.size > 1) active.delete(ch); }
        else active.add(ch);
        state.channels = [...active];
        document.querySelectorAll('.channel-toggle').forEach(b => {
          b.classList.toggle('active', state.channels.includes(b.dataset.channel));
        });
      });
    });

    // Calculate
    document.getElementById('btn-calculate').addEventListener('click', () => {
      state.overrides = {};
      runCalculation(false);
    });

    // Reset sim
    document.getElementById('btn-reset-sim').addEventListener('click', () => {
      state.overrides = {};
      runCalculation(true);
    });
  }

  function updateBudgetDisplay() {
    const el = document.getElementById('budget-display');
    if (!el) return;
    if (state.currencyMode === 'USD') {
      el.textContent = '≈ ' + fmt(Math.round(state.budgetUSD * BENCHMARKS.usdToClp), 'currency-clp') + ' CLP';
    } else {
      el.textContent = '≈ ' + fmt(state.budgetUSD, 'currency-usd') + ' USD';
    }
  }

  function runCalculation(keepOverrides) {
    const errorEl = document.getElementById('error-msg');
    if (!state.channels.length) { errorEl.textContent = 'Selecciona al menos un canal.'; return; }
    if (!state.industryId || !state.objectiveId) { errorEl.textContent = 'Completa todos los campos.'; return; }
    errorEl.textContent = '';

    if (!keepOverrides) state.overrides = {};

    const r = calculate({
      channels:    state.channels,
      industryId:  state.industryId,
      objectiveId: state.objectiveId,
      budgetUSD:   state.budgetUSD,
      months:      1,
      currencyMode: state.currencyMode,
      overrides:   state.overrides,
    });

    if (!r) { errorEl.textContent = 'Error al calcular. Verifica los campos.'; return; }

    renderKPIs(r);
    renderSimCards(r);

    document.getElementById('results-section').style.display = 'block';
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderKPIs(r) {
    const cur = r.currencyMode;
    const hasOverrides = Object.values(state.overrides).some(ov => Object.keys(ov).length > 0);

    document.getElementById('res-cpm').textContent        = fmtCurrency(r.avgCPM, Math.round(r.avgCPM * BENCHMARKS.usdToClp), cur);
    document.getElementById('res-impressions').textContent = fmt(r.totalImpressions);
    document.getElementById('res-cpc').textContent        = fmtCurrency(r.avgCPC, Math.round(r.avgCPC * BENCHMARKS.usdToClp), cur);
    document.getElementById('res-clicks').textContent     = fmt(r.totalClicks);
    document.getElementById('res-cvr').textContent        = r.avgCVR.toFixed(2) + '%';
    document.getElementById('res-conv-label').textContent = r.conversionLabel;
    document.getElementById('res-conversions').textContent = fmt(r.totalConversions);
    document.getElementById('res-cpa').textContent        = fmtCurrency(r.avgCPA, r.avgCPACLP, cur);

    const badge = document.getElementById('sim-badge');
    badge.style.display = hasOverrides ? 'flex' : 'none';
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
          <span class="sim-card-budget">${fmtCurrency(ch.budgetUSD, Math.round(ch.budgetUSD * BENCHMARKS.usdToClp), r.currencyMode)} / mes</span>
        </div>
        <div class="sim-fields">
          <div class="sim-field">
            <label class="sim-field-label ${ov.cpc !== undefined ? 'sim-edited' : ''}">CPC</label>
            <div class="sim-field-wrap">
              ${ov.cpc !== undefined ? `<span class="sim-bench">bench: $${ch.benchmarkCPC}</span>` : ''}
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cpc"
                value="${ov.cpc !== undefined ? ov.cpc : ch.cpc}" min="0.01" step="0.01" />
            </div>
          </div>
          <div class="sim-field">
            <label class="sim-field-label ${ov.cpm !== undefined ? 'sim-edited' : ''}">CPM</label>
            <div class="sim-field-wrap">
              ${ov.cpm !== undefined ? `<span class="sim-bench">bench: $${ch.benchmarkCPM}</span>` : ''}
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cpm"
                value="${ov.cpm !== undefined ? ov.cpm : ch.cpm}" min="0.01" step="0.01" />
            </div>
          </div>
          <div class="sim-field">
            <label class="sim-field-label ${ov.cvr !== undefined ? 'sim-edited' : ''}">CVR %</label>
            <div class="sim-field-wrap">
              ${ov.cvr !== undefined ? `<span class="sim-bench">bench: ${ch.benchmarkCVR}%</span>` : ''}
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cvr"
                value="${ov.cvr !== undefined ? ov.cvr : ch.cvr}" min="0.01" step="0.01" />
              <span class="sim-unit">%</span>
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.sim-input').forEach(input => {
      input.addEventListener('change', onSimChange);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onSimChange.call(input); } });
    });
  }

  function onSimChange() {
    const channelId = this.dataset.channel;
    const metric    = this.dataset.metric;
    const value     = parseFloat(this.value);
    if (isNaN(value) || value <= 0) return;
    if (!state.overrides[channelId]) state.overrides[channelId] = {};
    state.overrides[channelId][metric] = value;
    runCalculation(true);
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', () => Calculator.init());
