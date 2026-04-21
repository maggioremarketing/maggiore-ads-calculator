/**
 * Maggiore Ads Calculator — Lógica de Cálculo + Modo Simulación
 */

// ─────────────────────────────────────────────────────────────
// CALCULATOR CORE
// ─────────────────────────────────────────────────────────────
const Calculator = (() => {

  /**
   * Calcula métricas para un canal. Acepta overrides opcionales
   * para el modo simulación (cpc, cpm, cvr personalizados).
   */
  function calcChannel(channelId, industryId, objectiveId, budgetUSD, months, overrides = {}) {
    const ch  = BENCHMARKS.channels[channelId];
    if (!ch) return null;
    const ind     = ch.industries[industryId];
    const objMult = BENCHMARKS.objectiveMultipliers[objectiveId];
    if (!ind || !objMult) return null;

    const totalBudget = budgetUSD * months;

    // Métricas base — se reemplazan si hay override del usuario
    const cpm = overrides.cpm ?? ind.cpm;
    const ctr = overrides.ctr ?? ind.ctr;

    // CVR: si el usuario pone override, lo usamos directo como tasa final (sin multiplicar).
    // Si es el benchmark, aplicamos el multiplicador del objetivo.
    const cvrBench    = ind.cvr * objMult.cvrMult;  // benchmark efectivo con objetivo
    const cvrEffective = overrides.cvr !== undefined ? overrides.cvr : cvrBench;

    // Cálculos
    const impressions = Math.round((totalBudget / cpm) * 1000 * objMult.reachMult);
    const clicks      = Math.round(impressions * (ctr / 100));
    const conversions = Math.round(clicks * (cvrEffective / 100));
    const cpa         = conversions > 0 ? totalBudget / conversions : ind.cpa * objMult.cpaMult;
    const cpcReal     = clicks > 0 ? totalBudget / clicks : (overrides.cpc ?? ind.cpc);
    const cpmReal     = impressions > 0 ? (totalBudget / impressions) * 1000 : cpm;
    const estimatedRevenue = totalBudget * ind.roiMultiplier;
    const roi         = ((estimatedRevenue - totalBudget) / totalBudget) * 100;

    const badgeColor = ch.channelColor === '#010101'
      ? (ch.channelColorAlt || '#EE1D52')
      : ch.channelColor;

    // Formato inteligente para CPC/CPM: más decimales si el valor es < 1
    function fmtMetric(val) {
      if (val < 0.01) return parseFloat(val.toFixed(4));
      if (val < 1)    return parseFloat(val.toFixed(3));
      return parseFloat(val.toFixed(2));
    }

    return {
      channelId,
      channelName:       ch.name,
      channelColor:      badgeColor,
      channelIcon:       ch.icon,
      budgetUSD:         totalBudget,
      budgetCLP:         Math.round(totalBudget * BENCHMARKS.usdToClp),
      impressions,
      clicks,
      conversions,
      conversionLabel:   BENCHMARKS.objectives.find(o => o.id === objectiveId)?.conversionLabel || 'Conversiones',
      cpa:               parseFloat(cpa.toFixed(2)),
      cpaCLP:            Math.round(cpa * BENCHMARKS.usdToClp),
      cpc:               fmtMetric(cpcReal),
      cpcCLP:            Math.round(cpcReal * BENCHMARKS.usdToClp),
      cpm:               fmtMetric(cpmReal),
      cpmCLP:            Math.round(cpmReal * BENCHMARKS.usdToClp),
      ctr:               parseFloat(ctr.toFixed(2)),
      cvr:               parseFloat(cvrEffective.toFixed(2)),  // valor final, lo que ve el usuario
      roi:               parseFloat(roi.toFixed(1)),
      estimatedRevenue:  parseFloat(estimatedRevenue.toFixed(2)),
      estimatedRevenueCLP: Math.round(estimatedRevenue * BENCHMARKS.usdToClp),
      roiMultiplier:     ind.roiMultiplier,
      // Benchmarks efectivos (con multiplicador de objetivo, para comparar en modo simulación)
      benchmarkCPC:      fmtMetric(ind.cpc),
      benchmarkCPM:      fmtMetric(ind.cpm),
      benchmarkCVR:      parseFloat(cvrBench.toFixed(2)),
      benchmarkCTR:      ind.ctr,
      // Flags
      hasOverride:       Object.keys(overrides).length > 0,
    };
  }

  function calculate({ channels, industryId, objectiveId, budgetUSD, months, currencyMode, overrides = {} }) {
    if (!channels || channels.length === 0) return null;
    const budgetPerChannel = budgetUSD / channels.length;
    const results = channels
      .map(chId => calcChannel(chId, industryId, objectiveId, budgetPerChannel, months, overrides[chId] || {}))
      .filter(Boolean);
    if (results.length === 0) return null;

    const totals = results.reduce((acc, r) => ({
      budgetUSD:           acc.budgetUSD + r.budgetUSD,
      budgetCLP:           acc.budgetCLP + r.budgetCLP,
      impressions:         acc.impressions + r.impressions,
      clicks:              acc.clicks + r.clicks,
      conversions:         acc.conversions + r.conversions,
      estimatedRevenue:    acc.estimatedRevenue + r.estimatedRevenue,
      estimatedRevenueCLP: acc.estimatedRevenueCLP + r.estimatedRevenueCLP,
    }), { budgetUSD:0, budgetCLP:0, impressions:0, clicks:0, conversions:0, estimatedRevenue:0, estimatedRevenueCLP:0 });

    totals.cpa    = totals.conversions > 0 ? parseFloat((totals.budgetUSD / totals.conversions).toFixed(2)) : 0;
    totals.cpaCLP = Math.round(totals.cpa * BENCHMARKS.usdToClp);
    totals.roi    = parseFloat((((totals.estimatedRevenue - totals.budgetUSD) / totals.budgetUSD) * 100).toFixed(1));
    totals.ctr    = parseFloat((results.reduce((s,r) => s + r.ctr, 0) / results.length).toFixed(2));
    totals.cvr    = parseFloat((results.reduce((s,r) => s + r.cvr, 0) / results.length).toFixed(2));
    totals.cpm    = parseFloat((results.reduce((s,r) => s + r.cpm, 0) / results.length).toFixed(2));
    totals.cpmCLP = Math.round(totals.cpm * BENCHMARKS.usdToClp);
    totals.cpc    = parseFloat((results.reduce((s,r) => s + r.cpc, 0) / results.length).toFixed(2));
    totals.cpcCLP = Math.round(totals.cpc * BENCHMARKS.usdToClp);

    const bestChannel = [...results].sort((a, b) => a.cpa - b.cpa)[0];
    const hasAnyOverride = results.some(r => r.hasOverride);

    return { channels: results, totals, bestChannel, currencyMode, industryId, objectiveId, months, hasAnyOverride };
  }

  return { calculate, calcChannel };
})();


// ─────────────────────────────────────────────────────────────
// UI CONTROLLER
// ─────────────────────────────────────────────────────────────
const UI = (() => {

  let state = {
    budget: 1000,
    currency: 'USD',
    months: 1,
    industry: 'retail',
    objective: 'leads',
    channels: ['meta', 'google'],
    results: null,
    // Overrides por canal para modo simulación {meta: {cpc:0.5, cvr:3}, ...}
    overrides: {},
    simMode: false,
  };

  // ── Formato ──
  function fmt(value, type = 'number') {
    if (type === 'currency-usd') return new Intl.NumberFormat('es-CL', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(value);
    if (type === 'currency-clp') return new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP', maximumFractionDigits:0 }).format(value);
    if (type === 'percent')  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    if (type === 'number')   return new Intl.NumberFormat('es-CL').format(Math.round(value));
    return value;
  }

  function fmtC(usd, clp, cur) {
    return cur === 'CLP' ? fmt(clp, 'currency-clp') : fmt(usd, 'currency-usd');
  }

  function roiColor(roi) {
    if (roi >= 200) return '#00C896';
    if (roi >= 100) return '#7ED957';
    if (roi >= 50)  return '#FFD166';
    if (roi >= 0)   return '#FF9F1C';
    return '#EF476F';
  }

  function budgetInUSD() {
    const raw = parseFloat(document.getElementById('budget').value) || 0;
    return state.currency === 'CLP' ? raw / BENCHMARKS.usdToClp : raw;
  }

  function updateBudgetDisplay() {
    const raw = parseFloat(document.getElementById('budget').value) || 0;
    const label = document.getElementById('budget-display');
    label.textContent = state.currency === 'CLP'
      ? fmt(raw, 'currency-clp') + ' / mes'
      : fmt(raw, 'currency-usd') + ' / mes';
  }

  function getSelectedChannels() {
    return Array.from(document.querySelectorAll('.channel-toggle.active')).map(el => el.dataset.channel);
  }

  function showError(msg) {
    const el = document.getElementById('error-msg');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    setTimeout(() => { if (el) el.style.display = 'none'; }, 3000);
  }

  // ── Cálculo principal ──
  function runCalculation(keepOverrides = false) {
    const channels = getSelectedChannels();
    if (channels.length === 0) { showError('Selecciona al menos un canal.'); return; }

    state.channels  = channels;
    state.budget    = budgetInUSD();
    state.industry  = document.getElementById('industry').value;
    state.objective = document.getElementById('objective').value;
    state.months    = parseInt(document.getElementById('months').value) || 1;
    if (!keepOverrides) state.overrides = {};

    const results = Calculator.calculate({
      channels:    state.channels,
      industryId:  state.industry,
      objectiveId: state.objective,
      budgetUSD:   state.budget,
      months:      state.months,
      currencyMode: state.currency,
      overrides:   state.overrides,
    });

    if (!results) { showError('No se pudo calcular. Verifica los parámetros.'); return; }
    state.results = results;
    renderResults(results);
  }

  // ── Render principal ──
  function renderResults(r) {
    const cur = state.currency;
    const section = document.getElementById('results-section');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const t = r.totals;

    // KPIs globales
    document.getElementById('res-impressions').textContent = fmt(t.impressions);
    document.getElementById('res-clicks').textContent      = fmt(t.clicks);
    document.getElementById('res-conversions').textContent = fmt(t.conversions);
    document.getElementById('res-conv-label').textContent  = r.channels[0]?.conversionLabel || 'Conversiones';
    document.getElementById('res-cpa').textContent         = fmtC(t.cpa, t.cpaCLP, cur);
    document.getElementById('res-cpm').textContent         = fmtC(t.cpm, t.cpmCLP, cur);
    document.getElementById('res-revenue').textContent     = fmtC(t.estimatedRevenue, t.estimatedRevenueCLP, cur);
    document.getElementById('res-budget').textContent      = fmtC(t.budgetUSD, t.budgetCLP, cur);

    const roiEl = document.getElementById('res-roi');
    roiEl.textContent  = fmt(t.roi, 'percent');
    roiEl.style.color  = roiColor(t.roi);

    if (r.bestChannel) {
      document.getElementById('best-channel-name').textContent = r.bestChannel.channelName;
      document.getElementById('best-channel-cpa').textContent  = cur === 'CLP'
        ? fmt(r.bestChannel.cpaCLP, 'currency-clp')
        : fmt(r.bestChannel.cpa, 'currency-usd');
    }

    // Modo simulación badge
    const simBadge = document.getElementById('sim-badge');
    if (r.hasAnyOverride) {
      simBadge.style.display = 'inline-flex';
    } else {
      simBadge.style.display = 'none';
    }

    renderBars(r, cur);
    renderChannelTable(r, cur);
  }

  // ── Barras por canal con métricas editables ──
  function renderBars(r, cur) {
    const container = document.getElementById('bars-container');
    container.innerHTML = '';
    const maxConv = Math.max(...r.channels.map(c => c.conversions), 1);
    const maxROI  = Math.max(...r.channels.map(c => c.roi), 1);

    r.channels.forEach(ch => {
      const convPct = Math.round((ch.conversions / maxConv) * 100);
      const roiPct  = Math.min(Math.round((ch.roi / maxROI) * 100), 100);
      const cpaDisplay = cur === 'CLP' ? fmt(ch.cpaCLP, 'currency-clp') : fmt(ch.cpa, 'currency-usd');
      const ov = state.overrides[ch.channelId] || {};

      // Indicador de si la métrica está sobreescrita
      const cpcEdited = ov.cpc  !== undefined;
      const cpmEdited = ov.cpm  !== undefined;
      const cvrEdited = ov.cvr  !== undefined;

      const card = document.createElement('div');
      card.className = 'bar-card';
      card.dataset.channel = ch.channelId;

      card.innerHTML = `
        <div class="bar-header">
          <span class="bar-ch-name">${ch.channelIcon} ${ch.channelName}</span>
          <span class="bar-roi" style="color:${roiColor(ch.roi)}">${fmt(ch.roi, 'percent')} ROI</span>
        </div>

        <!-- Métricas editables -->
        <div class="sim-metrics" id="sim-${ch.channelId}">
          <div class="sim-row">
            <span class="sim-label ${cpcEdited ? 'sim-edited' : ''}">CPC</span>
            <div class="sim-input-wrap">
              ${cpcEdited ? `<span class="sim-bench">bench: $${ch.benchmarkCPC}</span>` : ''}
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cpc"
                value="${parseFloat(ch.cpc.toFixed(2))}" min="0.01" step="0.01"
                title="Edita para simular cambio de CPC">
            </div>
          </div>
          <div class="sim-row">
            <span class="sim-label ${cpmEdited ? 'sim-edited' : ''}">CPM</span>
            <div class="sim-input-wrap">
              ${cpmEdited ? `<span class="sim-bench">bench: $${ch.benchmarkCPM}</span>` : ''}
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cpm"
                value="${parseFloat(ch.cpm.toFixed(2))}" min="0.01" step="0.01"
                title="Edita para simular cambio de CPM">
            </div>
          </div>
          <div class="sim-row">
            <span class="sim-label ${cvrEdited ? 'sim-edited' : ''}">Conv. %</span>
            <div class="sim-input-wrap">
              ${cvrEdited ? `<span class="sim-bench">bench: ${ch.benchmarkCVR}%</span>` : ''}
              <input type="number" class="sim-input" data-channel="${ch.channelId}" data-metric="cvr"
                value="${parseFloat(ch.cvr.toFixed(2))}" min="0.01" step="0.01"
                title="Edita para simular cambio en tasa de conversión">
              <span class="sim-unit">%</span>
            </div>
          </div>
        </div>

        <!-- Barras -->
        <div class="bar-group">
          <div class="bar-label-row">
            <span>${ch.conversionLabel}</span>
            <span>${fmt(ch.conversions)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${convPct}%;background:${ch.channelColor}"></div>
          </div>
        </div>
        <div class="bar-group">
          <div class="bar-label-row">
            <span>ROI Proyectado</span>
            <span style="color:${roiColor(ch.roi)}">${fmt(ch.roi, 'percent')}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${roiPct}%;background:linear-gradient(90deg,${ch.channelColor},${roiColor(ch.roi)})"></div>
          </div>
        </div>
        <div class="bar-footer">
          <div class="bar-stat"><span>CPA</span><strong>${cpaDisplay}</strong></div>
          <div class="bar-stat"><span>CTR</span><strong>${ch.ctr}%</strong></div>
          <div class="bar-stat"><span>Impr.</span><strong>${fmt(ch.impressions)}</strong></div>
        </div>
      `;
      container.appendChild(card);
    });

    // Listeners en inputs de simulación
    container.querySelectorAll('.sim-input').forEach(input => {
      input.addEventListener('change', onSimInputChange);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); onSimInputChange.call(input); } });
    });
  }

  // ── Handler de cambio en simulación ──
  function onSimInputChange() {
    const channelId = this.dataset.channel;
    const metric    = this.dataset.metric;
    const value     = parseFloat(this.value);
    if (isNaN(value) || value <= 0) return;

    if (!state.overrides[channelId]) state.overrides[channelId] = {};
    state.overrides[channelId][metric] = value;

    // Recalcular sin resetear overrides
    runCalculation(true);
  }

  // ── Tabla con CPC y CVR ──
  function renderChannelTable(r, cur) {
    const tbody = document.getElementById('channel-table-body');
    tbody.innerHTML = '';

    r.channels.forEach(ch => {
      const tr = document.createElement('tr');
      const badgeColor = ch.channelColor;
      tr.innerHTML = `
        <td>
          <span class="ch-badge" style="background:${badgeColor}22;color:${badgeColor};border:1px solid ${badgeColor}55">
            ${ch.channelIcon} ${ch.channelName}
          </span>
        </td>
        <td>${fmtC(ch.budgetUSD, ch.budgetCLP, cur)}</td>
        <td>${fmt(ch.impressions)}</td>
        <td>${fmt(ch.clicks)}</td>
        <td>${fmt(ch.conversions)}</td>
        <td>${fmtC(ch.cpc, ch.cpcCLP, cur)}</td>
        <td>${fmtC(ch.cpm, ch.cpmCLP, cur)}</td>
        <td>${ch.cvr}%</td>
        <td>${fmtC(ch.cpa, ch.cpaCLP, cur)}</td>
        <td style="color:${roiColor(ch.roi)};font-weight:600">${fmt(ch.roi, 'percent')}</td>
        <td>${fmtC(ch.estimatedRevenue, ch.estimatedRevenueCLP, cur)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ── Reset simulación ──
  function resetSimulation() {
    state.overrides = {};
    runCalculation(false);
  }

  // ── Init ──
  function init() {
    // Poblar industrias
    const indSel = document.getElementById('industry');
    BENCHMARKS.industries.forEach(ind => {
      const opt = document.createElement('option');
      opt.value = ind.id; opt.textContent = ind.label;
      if (ind.id === state.industry) opt.selected = true;
      indSel.appendChild(opt);
    });

    // Poblar objetivos
    const objSel = document.getElementById('objective');
    BENCHMARKS.objectives.forEach(obj => {
      const opt = document.createElement('option');
      opt.value = obj.id; opt.textContent = obj.label;
      if (obj.id === state.objective) opt.selected = true;
      objSel.appendChild(opt);
    });

    // Budget display
    document.getElementById('budget').addEventListener('input', updateBudgetDisplay);
    updateBudgetDisplay();

    // Currency toggle
    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currency = btn.dataset.currency;
        updateBudgetDisplay();
      });
    });

    // Channel toggles
    document.querySelectorAll('.channel-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        if (getSelectedChannels().length === 0) btn.classList.add('active');
      });
    });

    // Botón calcular
    document.getElementById('btn-calculate').addEventListener('click', () => runCalculation(false));

    // Botón reset simulación
    document.getElementById('btn-reset-sim').addEventListener('click', resetSimulation);

    // Enter en inputs
    document.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') runCalculation(false); });
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', UI.init);
