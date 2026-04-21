/**
 * Maggiore Ads Calculator - Benchmarks por Industria
 * Datos de referencia para Chile / LATAM (2024-2025)
 * Fuentes: Meta Business Insights, Google Ads Benchmarks, WordStream, Statista
 */

const BENCHMARKS = {
  industries: [
    { id: 'retail', label: 'Retail / E-commerce' },
    { id: 'realestate', label: 'Inmobiliaria / Real Estate' },
    { id: 'education', label: 'Educación' },
    { id: 'healthcare', label: 'Salud / Clínicas' },
    { id: 'finance', label: 'Finanzas / Seguros' },
    { id: 'b2b', label: 'B2B / Servicios Empresariales' },
    { id: 'food', label: 'Gastronomía / Restaurantes' },
    { id: 'travel', label: 'Turismo / Viajes' },
    { id: 'beauty', label: 'Belleza / Cosmética' },
    { id: 'auto', label: 'Automotriz' },
  ],

  objectives: [
    { id: 'awareness', label: 'Reconocimiento de Marca', conversionLabel: 'Interacciones' },
    { id: 'traffic', label: 'Tráfico al Sitio Web', conversionLabel: 'Visitas' },
    { id: 'leads', label: 'Generación de Leads', conversionLabel: 'Leads' },
    { id: 'sales', label: 'Ventas / Conversiones', conversionLabel: 'Ventas' },
  ],

  /**
   * Métricas por canal e industria
   * CPM: Costo por mil impresiones (USD)
   * CPC: Costo por click (USD)
   * CTR: Click-through rate (%)
   * CVR: Conversion rate (%)
   * CPA: Costo por adquisición / acción (USD)
   * roiMultiplier: Multiplicador de retorno (por cada $1 invertido)
   */
  channels: {
    meta: {
      name: 'Meta Ads',
      icon: '📘',
      color: '#1877F2',
      description: 'Facebook + Instagram',
      industries: {
        retail:      { cpm: 7.5,  cpc: 0.55, ctr: 1.8, cvr: 2.5, cpa: 22,  roiMultiplier: 3.2 },
        realestate:  { cpm: 11.0, cpc: 1.40, ctr: 1.3, cvr: 1.0, cpa: 140, roiMultiplier: 4.5 },
        education:   { cpm: 7.0,  cpc: 0.85, ctr: 1.5, cvr: 3.5, cpa: 24,  roiMultiplier: 2.8 },
        healthcare:  { cpm: 10.0, cpc: 1.00, ctr: 1.1, cvr: 2.0, cpa: 50,  roiMultiplier: 2.5 },
        finance:     { cpm: 14.0, cpc: 2.20, ctr: 0.8, cvr: 1.5, cpa: 147, roiMultiplier: 3.8 },
        b2b:         { cpm: 12.0, cpc: 1.60, ctr: 1.0, cvr: 2.0, cpa: 80,  roiMultiplier: 3.0 },
        food:        { cpm: 6.5,  cpc: 0.45, ctr: 2.2, cvr: 3.5, cpa: 13,  roiMultiplier: 2.4 },
        travel:      { cpm: 9.5,  cpc: 0.90, ctr: 1.4, cvr: 1.8, cpa: 50,  roiMultiplier: 3.5 },
        beauty:      { cpm: 8.0,  cpc: 0.65, ctr: 1.9, cvr: 2.8, cpa: 23,  roiMultiplier: 3.0 },
        auto:        { cpm: 12.5, cpc: 1.50, ctr: 1.2, cvr: 1.2, cpa: 125, roiMultiplier: 4.0 },
      }
    },
    google: {
      name: 'Google Ads',
      icon: '🔍',
      color: '#4285F4',
      description: 'Search + Display + YouTube',
      industries: {
        retail:      { cpm: 5.0,  cpc: 1.00, ctr: 4.5, cvr: 3.5, cpa: 29,  roiMultiplier: 3.8 },
        realestate:  { cpm: 8.0,  cpc: 4.00, ctr: 3.0, cvr: 2.0, cpa: 200, roiMultiplier: 5.5 },
        education:   { cpm: 6.0,  cpc: 2.00, ctr: 4.0, cvr: 5.0, cpa: 40,  roiMultiplier: 3.2 },
        healthcare:  { cpm: 8.5,  cpc: 2.80, ctr: 3.5, cvr: 3.5, cpa: 80,  roiMultiplier: 3.0 },
        finance:     { cpm: 12.0, cpc: 6.00, ctr: 2.5, cvr: 2.0, cpa: 300, roiMultiplier: 4.5 },
        b2b:         { cpm: 9.0,  cpc: 3.50, ctr: 3.0, cvr: 2.5, cpa: 140, roiMultiplier: 3.8 },
        food:        { cpm: 4.5,  cpc: 1.20, ctr: 5.0, cvr: 5.5, cpa: 22,  roiMultiplier: 2.6 },
        travel:      { cpm: 7.0,  cpc: 1.80, ctr: 4.5, cvr: 3.0, cpa: 60,  roiMultiplier: 4.0 },
        beauty:      { cpm: 6.5,  cpc: 1.40, ctr: 4.0, cvr: 3.8, cpa: 37,  roiMultiplier: 3.3 },
        auto:        { cpm: 9.5,  cpc: 3.20, ctr: 3.5, cvr: 1.8, cpa: 178, roiMultiplier: 5.0 },
      }
    },
    tiktok: {
      name: 'TikTok Ads',
      icon: '🎵',
      color: '#010101',
      colorAlt: '#ff0050',
      description: 'Video & In-Feed Ads',
      industries: {
        retail:      { cpm: 9.5,  cpc: 0.60, ctr: 1.5, cvr: 1.8, cpa: 33,  roiMultiplier: 2.5 },
        realestate:  { cpm: 10.0, cpc: 1.20, ctr: 1.1, cvr: 0.8, cpa: 188, roiMultiplier: 3.0 },
        education:   { cpm: 8.0,  cpc: 0.75, ctr: 1.3, cvr: 2.5, cpa: 30,  roiMultiplier: 2.2 },
        healthcare:  { cpm: 9.0,  cpc: 0.90, ctr: 0.9, cvr: 1.5, cpa: 60,  roiMultiplier: 2.0 },
        finance:     { cpm: 11.0, cpc: 1.80, ctr: 0.7, cvr: 1.0, cpa: 180, roiMultiplier: 2.8 },
        b2b:         { cpm: 10.5, cpc: 1.40, ctr: 0.8, cvr: 1.2, cpa: 117, roiMultiplier: 2.3 },
        food:        { cpm: 7.5,  cpc: 0.40, ctr: 2.0, cvr: 3.0, cpa: 13,  roiMultiplier: 2.0 },
        travel:      { cpm: 9.0,  cpc: 0.80, ctr: 1.3, cvr: 1.5, cpa: 53,  roiMultiplier: 2.8 },
        beauty:      { cpm: 8.5,  cpc: 0.55, ctr: 1.7, cvr: 2.5, cpa: 22,  roiMultiplier: 2.6 },
        auto:        { cpm: 11.0, cpc: 1.30, ctr: 1.0, cvr: 0.9, cpa: 144, roiMultiplier: 3.2 },
      }
    },
    linkedin: {
      name: 'LinkedIn Ads',
      icon: '💼',
      color: '#0A66C2',
      description: 'Sponsored Content & InMail',
      industries: {
        retail:      { cpm: 25.0, cpc: 5.50, ctr: 0.4, cvr: 1.5, cpa: 367, roiMultiplier: 2.0 },
        realestate:  { cpm: 28.0, cpc: 7.00, ctr: 0.5, cvr: 1.8, cpa: 389, roiMultiplier: 4.0 },
        education:   { cpm: 22.0, cpc: 6.00, ctr: 0.5, cvr: 4.0, cpa: 150, roiMultiplier: 3.5 },
        healthcare:  { cpm: 25.0, cpc: 6.50, ctr: 0.4, cvr: 2.5, cpa: 260, roiMultiplier: 3.0 },
        finance:     { cpm: 30.0, cpc: 8.00, ctr: 0.5, cvr: 2.0, cpa: 400, roiMultiplier: 4.5 },
        b2b:         { cpm: 26.0, cpc: 7.50, ctr: 0.6, cvr: 3.5, cpa: 214, roiMultiplier: 4.2 },
        food:        { cpm: 22.0, cpc: 5.00, ctr: 0.4, cvr: 1.0, cpa: 500, roiMultiplier: 1.8 },
        travel:      { cpm: 24.0, cpc: 6.00, ctr: 0.5, cvr: 1.5, cpa: 400, roiMultiplier: 3.0 },
        beauty:      { cpm: 23.0, cpc: 5.50, ctr: 0.4, cvr: 1.2, cpa: 458, roiMultiplier: 2.2 },
        auto:        { cpm: 27.0, cpc: 7.00, ctr: 0.5, cvr: 1.5, cpa: 467, roiMultiplier: 3.8 },
      }
    }
  },

  /**
   * Ajuste por objetivo de campaña sobre el CVR y CPA base
   */
  objectiveMultipliers: {
    awareness: { cvrMult: 0.3,  cpaMult: 0.4,  reachMult: 1.8, label: 'Impresiones' },
    traffic:   { cvrMult: 0.7,  cpaMult: 0.7,  reachMult: 1.2, label: 'Visitas' },
    leads:     { cvrMult: 1.0,  cpaMult: 1.0,  reachMult: 1.0, label: 'Leads' },
    sales:     { cvrMult: 0.85, cpaMult: 1.3,  reachMult: 0.9, label: 'Ventas' },
  },

  // Tipo de cambio referencial (actualizable)
  usdToClp: 950,
};

// Exponer globalmente
window.BENCHMARKS = BENCHMARKS;
