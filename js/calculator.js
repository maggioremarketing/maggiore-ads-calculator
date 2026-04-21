/**
 * Maggiore Ads Calculator - Lógica de Cálculo
 */

const Calculator = (() => {

  /**
   * Calcula los resultados para un canal específico
   * @param {string} channelId - ID del canal (meta, google, tiktok, linkedin)
   * @param {string} industryId - ID de la industria
   * @param {string} objectiveId - ID del objetivo de campaña
   * @param {number} budgetUSD - Presupuesto mensual en USD
   * @param {number} months - Duración en meses
   * @returns {object} Resultados calculados
   */
  function calcChannel(channelId, industryId, objectiveId, budgetUSD, months) {
    const ch = BENCHMARKS.channels[channelId];
    if (!ch) return null;

    const ind = ch.industries[industryId];
    const objMult = BENCHMARKS.objectiveMultipliers[objectiveId];

    if (!ind || !objMult) return null;

    const totalBudget = budgetUSD * months;

    // Impresiones
    const impressions = Math.round((totalBudget / ind.cpm) * 1000 * objMult.reachMult);

    // Clicks
    const clicks = Math.round(impressions * (ind.ctr / 100));

    // Conversiones (leads / ventas / visitas según objetivo)
    const conversions = Math.round(clicks * (ind.cvr / 100) * objMult.cvrMult);

    // CPA ajustado al objetivo
    const cpa = conversions > 0
      ? (totalBudget / conversions)
      : ind.cpa * objMult.cpaMult;

    // ROI proyectado
    // Se estima el valor generado según multiplicador de retorno de la industria
    const estimatedRevenue = totalBudget * ind.roiMultiplier;
    const roi = ((estimatedRevenue - totalBudget) / totalBudget) * 100;

    // CPC real
    const cpcReal = clicks > 0 ? totalBudget / clicks : ind.cpc;

    // CPM real
    const cpmReal = impressions > 0 ? (totalBudget / impressions) * 1000 : ind.cpm;

    return {
      channelId,
      channelName: ch.name,
      channelColor: ch.color,
      channelColorAlt: ch.colorAlt || ch.color,
      channelIcon: ch.icon,
      budgetUSD: totalBudget,
      budgetCLP: Math.round(totalBudget * BENCHMARKS.usdToClp),
      impressions,
      clicks,
      conversions,
      conversionLabel: BENCHMARKS.objectives.find(o => o.id === objectiveId)?.conversionLabel || 'Conversiones',
      cpa: parseFloat(cpa.toFixed(2)),
      cpaCLP: Math.round(cpa * BENCHMARKS.usdToClp),
      cpc: parseFloat(cpcReal.toFixed(2)),
      cpm: parseFloat(cpmReal.toFixed(2)),
      ctr: ind.ctr,
      cvr: parseFloat((ind.cvr * objMult.cvrMult).toFixed(2)),
      roi: parseFloat(roi.toFixed(1)),
      estimatedRevenue: parseFloat(estimatedRevenue.toFixed(2)),
      estimatedRevenueCLP: Math.round(estimatedRevenue * BENCHMARKS.usdToClp),
      roiMultiplier: ind.roiMultiplier,
      // Referencia benchmark
      benchmarkCPA: parseFloat((ind.cpa * objMult.cpaMult).toFixed(2)),
      benchmarkCPC: ind.cpc,
    };
  }

  /**
   * Calcula resultados para todos los canales seleccionados
   */
  function calculate({ channels, industryId, objectiveId, budgetUSD, months, currencyMode }) {
    if (!channels || channels.length === 0) return null;

    // Distribuir presupuesto entre canales seleccionados
    const budgetPerChannel = budgetUSD / channels.length;

    const results = channels
      .map(chId => calcChannel(chId, industryId, objectiveId, budgetPerChannel, months))
      .filter(Boolean);

    if (results.length === 0) return null;

    // Totales consolidados
    const totals = results.reduce((acc, r) => ({
      budgetUSD:          acc.budgetUSD + r.budgetUSD,
      budgetCLP:          acc.budgetCLP + r.budgetCLP,
      impressions:        acc.impressions + r.impressions,
      clicks:             acc.clicks + r.clicks,
      conversions:        acc.conversions + r.conversions,
      estimatedRevenue:   acc.estimatedRevenue + r.estimatedRevenue,
      estimatedRevenueCLP: acc.estimatedRevenueCLP + r.estimatedRevenueCLP,
    }), {
      budgetUSD: 0, budgetCLP: 0,
      impressions: 0, clicks: 0, conversions: 0,
      estimatedRevenue: 0, estimatedRevenueCLP: 0,
    });

    totals.cpa = totals.conversions > 0
      ? parseFloat((totals.budgetUSD / totals.conversions).toFixed(2))
      : 0;
    totals.cpaCLP = Math.round(totals.cpa * BENCHMARKS.usdToClp);

    totals.roi = parseFloat(
      (((totals.estimatedRevenue - totals.budgetUSD) / totals.budgetUSD) * 100).toFixed(1)
    );

    totals.ctr = results.length > 0
      ? parseFloat((results.reduce((s, r) => s + r.ctr, 0) / results.length).toFixed(2))
      : 0;

    // Canal más eficiente (menor CPA)
    const bestChannel = [...results].sort((a, b) => a.cpa - b.cpa)[0];

    return {
      channels: results,
      totals,
      bestChannel,
      currencyMode,
      industryId,
      objectiveId,
      months,
    };
  }

  return { calculate, calcChannel };
})();

// ──────────────────────────────────────────────────────────────────────────────
// UI Controller
// ──────────────────────────────────────────────────────────────────────────────

const UI = (() => {

  // Estado de la aplicación
  let state = {
    budget: 1000,
    currency: 'USD',
    months: 1,
    industry: 'retail',
    objective: 'leads',
    channels: ['meta', 'google'],
    results: null,
  };

  function fmt(value, type = 'number') {
    if (type === 'currency-usd') {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    }
    if (type === 'currency-clp') {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
    }
    if (type === 'percent') {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    }
    if (type === 'number') {
      return new Intl.NumberFormat('es-CL').format(Math.round(value));
    }
    return value;
  }

  function fmtCurrency(valueUSD, valueCLP, currency) {
    return currency === 'CLP'
      ? fmt(valueCLP, 'currency-clp')
      : fmt(valueUSD, 'currency-usd');
  }

  function budgetInUSD() {
    const raw = parseFloat(document.getElementById('budget').value) || 0;
    if (state.currency === 'CLP') {
      return raw / BENCHMARKS.usdToClp;
    }
    return raw;
  }

  function updateBudgetDisplay() {
    const raw = parseFloat(document.getElementById('budget').value) || 0;
    const label = document.getElementById('budget-display');
    if (state.currency === 'CLP') {
      label.textContent = fmt(raw, 'currency-clp') + ' / mes';
    } else {
      label.textContent = fmt(raw, 'currency-usd') + ' / mes';
    }
  }

  function getSelectedChannels() {
    return Array.from(document.querySelectorAll('.channel-toggle.active'))
      .map(el => el.dataset.channel);
  }

  function runCalculation() {
    const channels = getSelectedChannels();
    if (channels.length === 0) {
      showError('Selecciona al menos un canal para calcular.');
      return;
    }

    state.channels = channels;
    state.budget = budgetInUSD();
    state.industry = document.getElementById('industry').value;
    state.objective = document.getElementById('objective').value;
    state.months = parseInt(document.getElementById('months').value) || 1;

    const results = Calculator.calculate({
      channels: state.channels,
      industryId: state.industry,
      objectiveId: state.objective,
      budgetUSD: state.budget,
      months: state.months,
      currencyMode: state.currency,
    });

    if (!results) {
      showError('No se pudo calcular. Verifica los parámetros.');
      return;
    }

    state.results = results;
    renderResults(results);
  }

  function showError(msg) {
    const el = document.getElementById('error-msg');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    setTimeout(() => { if (el) el.style.display = 'none'; }, 3000);
  }

  function roiColor(roi) {
    if (roi >= 200) return '#00C896';
    if (roi >= 100) return '#7ED957';
    if (roi >= 50)  return '#FFD166';
    if (roi >= 0)   return '#FF9F1C';
    return '#EF476F';
  }

  function renderResults(r) {
    const cur = state.currency;
    const section = document.getElementById('results-section');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Totales
    const t = r.totals;
    document.getElementById('res-impressions').textContent   = fmt(t.impressions);
    document.getElementById('res-clicks').textContent        = fmt(t.clicks);
    document.getElementById('res-conversions').textContent   = fmt(t.conversions);
    document.getElementById('res-conv-label').textContent    = r.channels[0]?.conversionLabel || 'Conversiones';
    document.getElementById('res-cpa').textContent           = fmtCurrency(t.cpa, t.cpaCLP, cur);
    document.getElementById('res-revenue').textContent       = fmtCurrency(t.estimatedRevenue, t.estimatedRevenueCLP, cur);
    document.getElementById('res-budget').textContent        = fmtCurrency(t.budgetUSD, t.budgetCLP, cur);

    // ROI con color
    const roiEl = document.getElementById('res-roi');
    const roiVal = t.roi;
    roiEl.textContent = fmt(roiVal, 'percent');
    roiEl.style.color = roiColor(roiVal);

    // Mejor canal
    if (r.bestChannel) {
      document.getElementById('best-channel-name').textContent = r.bestChannel.channelName;
      document.getElementById('best-channel-cpa').textContent =
        cur === 'CLP'
          ? fmt(r.bestChannel.cpaCLP, 'currency-clp')
          : fmt(r.bestChannel.cpa, 'currency-usd');
    }

    // Tabla de canales
    renderChannelTable(r, cur);

    // Barras comparativas
    renderBars(r, cur);
  }

  function renderChannelTable(r, cur) {
    const tbody = document.getElementById('channel-table-body');
    tbody.innerHTML = '';

    r.channels.forEach(ch => {
      const tr = document.createElement('tr');
      const budDisplay = cur === 'CLP'
        ? fmt(ch.budgetCLP, 'currency-clp')
        : fmt(ch.budgetUSD, 'currency-usd');
      const cpaDisplay = cur === 'CLP'
        ? fmt(ch.cpaCLP, 'currency-clp')
        : fmt(ch.cpa, 'currency-usd');
      const revDisplay = cur === 'CLP'
        ? fmt(ch.estimatedRevenueCLP, 'currency-clp')
        : fmt(ch.estimatedRevenue, 'currency-usd');

      // Usar colorAlt si el color principal es demasiado oscuro para fondo oscuro
      const badgeColor = ch.channelColor === '#010101' ? (ch.channelColorAlt || '#EE1D52') : ch.channelColor;
      tr.innerHTML = `
        <td>
          <span class="ch-badge" style="background:${badgeColor}22;color:${badgeColor};border:1px solid ${badgeColor}55">
            ${ch.channelIcon} ${ch.channelName}
          </span>
        </td>
        <td>${budDisplay}</td>
        <td>${fmt(ch.impressions)}</td>
        <td>${fmt(ch.clicks)}</td>
        <td>${fmt(ch.conversions)}</td>
        <td>${cpaDisplay}</td>
        <td style="color:${roiColor(ch.roi)};font-weight:600">${fmt(ch.roi, 'percent')}</td>
        <td>${revDisplay}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderBars(r, cur) {
    const container = document.getElementById('bars-container');
    container.innerHTML = '';

    // Encontrar máximo para escalar barras (por conversiones)
    const maxConv = Math.max(...r.channels.map(c => c.conversions), 1);
    const maxROI  = Math.max(...r.channels.map(c => c.roi), 1);

    r.channels.forEach(ch => {
      const convPct = Math.round((ch.conversions / maxConv) * 100);
      const roiPct  = Math.min(Math.round((ch.roi / maxROI) * 100), 100);
      const cpaDisplay = cur === 'CLP'
        ? fmt(ch.cpaCLP, 'currency-clp')
        : fmt(ch.cpa, 'currency-usd');

      const card = document.createElement('div');
      card.className = 'bar-card';
      card.innerHTML = `
        <div class="bar-header">
          <span class="bar-ch-name">${ch.channelIcon} ${ch.channelName}</span>
          <span class="bar-roi" style="color:${roiColor(ch.roi)}">${fmt(ch.roi, 'percent')} ROI</span>
        </div>
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
          <div class="bar-stat"><span>CVR</span><strong>${ch.cvr}%</strong></div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function init() {
    // Poblar industrias
    const indSel = document.getElementById('industry');
    BENCHMARKS.industries.forEach(ind => {
      const opt = document.createElement('option');
      opt.value = ind.id;
      opt.textContent = ind.label;
      if (ind.id === state.industry) opt.selected = true;
      indSel.appendChild(opt);
    });

    // Poblar objetivos
    const objSel = document.getElementById('objective');
    BENCHMARKS.objectives.forEach(obj => {
      const opt = document.createElement('option');
      opt.value = obj.id;
      opt.textContent = obj.label;
      if (obj.id === state.objective) opt.selected = true;
      objSel.appendChild(opt);
    });

    // Slider de presupuesto
    const budgetInput = document.getElementById('budget');
    budgetInput.addEventListener('input', updateBudgetDisplay);
    updateBudgetDisplay();

    // Toggle de moneda
    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currency = btn.dataset.currency;
        updateBudgetDisplay();
      });
    });

    // Toggle de canales
    document.querySelectorAll('.channel-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const active = getSelectedChannels();
        // Al menos 1 canal
        if (active.length === 0) btn.classList.add('active');
      });
    });

    // Botón calcular
    document.getElementById('btn-calculate').addEventListener('click', runCalculation);

    // Enter en cualquier input
    document.querySelectorAll('select, input').forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') runCalculation(); });
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', UI.init);
