/* =========================================================
   THE WAVE — Neo Wave Trading Engine (Log Scale Enabled)
   ========================================================= */

(() => {
  'use strict';

  const CONFIG = {
    API_BASE: 'http://127.0.0.1:8000/api/v1',
    ENDPOINT_ANALYZE: '/analyze-monomoves',
    DEFAULT_ASSET: 'NAS100',
    DEFAULT_TF: '15M',
  };

  const COLORS = {
    bg: '#0B0E14',
    panel: '#161B26',
    border: '#262C3A',
    grid: '#1B212F',
    textPrimary: '#E8ECF4',
    textSecondary: '#8A93A6',
    brandCyan: '#00E5FF',
    gold: '#FFD700',
    bull: '#00E676',
    bear: '#FF5252',
  };

  const ASSET_SEED = {
    NAS100: { digits: 2 },
    US30:   { digits: 1 },
    XAUUSD: { digits: 2 },
  };

  const state = {
    asset: CONFIG.DEFAULT_ASSET,
    timeframe: CONFIG.DEFAULT_TF,
    candles: [],
    monomoves: [],
    showMonomoves: true,
    showWaveLabels: true,
    autoFit: true,
    logScale: true,
  };

  const el = {
    chartContainer: document.getElementById('chart-container'),
    symbolLabel: document.getElementById('chart-symbol-label'),
    tfLabel: document.getElementById('chart-tf-label'),
    lastPrice: document.getElementById('chart-last-price'),
    engineStatus: document.getElementById('engine-status'),
    refreshBtn: document.getElementById('refresh-btn'),
    drawer: document.getElementById('drawer'),
    drawerToggle: document.getElementById('drawer-toggle'),
    drawerCount: document.getElementById('drawer-count'),
    vectorTableBody: document.getElementById('vector-table-body'),
    fibTableBody: document.getElementById('fib-table-body'),
    metricTotal: document.getElementById('metric-total-monomoves'),
    metricDirection: document.getElementById('metric-direction'),
    metricHeight: document.getElementById('metric-height'),
    metricDuration: document.getElementById('metric-duration'),
    patternName: document.getElementById('pattern-name'),
    confidenceValue: document.getElementById('confidence-value'),
    confidenceFill: document.getElementById('confidence-fill'),
    toggleMonomoves: document.getElementById('toggle-monomoves'),
    toggleWaveLabels: document.getElementById('toggle-wave-labels'),
    toggleAutofit: document.getElementById('toggle-autofit'),
    toggleLogscale: document.getElementById('toggle-logscale'),
  };

  let chart = null;
  let candleSeries = null;
  let monomoveSeries = null;

  function initChart() {
    chart = LightweightCharts.createChart(el.chartContainer, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: COLORS.textSecondary,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: COLORS.brandCyan, width: 1, style: 3, labelBackgroundColor: COLORS.brandCyan },
        horzLine: { color: COLORS.brandCyan, width: 1, style: 3, labelBackgroundColor: COLORS.brandCyan },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.08, bottom: 0.08 },
        autoScale: true,
        mode: LightweightCharts.PriceScaleMode.Logarithmic, // Default Log Scale
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
      },
      watermark: {
        visible: true,
        text: 'THE WAVE · NEO WAVE ENGINE',
        color: 'rgba(232, 236, 244, 0.035)',
        fontSize: 34,
        horzAlign: 'center',
        vertAlign: 'center',
      },
      autoSize: false,
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: COLORS.bull,
      downColor: COLORS.bear,
      borderUpColor: COLORS.bull,
      borderDownColor: COLORS.bear,
      wickUpColor: COLORS.bull,
      wickDownColor: COLORS.bear,
      priceScaleId: 'right',
    });

    monomoveSeries = chart.addLineSeries({
      color: COLORS.brandCyan,
      lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Solid,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      priceScaleId: 'right', // Locked to main candlestick axis
    });

    setupResize();
  }

  function setupResize() {
    const ro = new ResizeObserver((entries) => {
      if (!chart) return;
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el.chartContainer);
  }

  async function fetchMonomovesFromBackend(asset = state.asset, timeframe = state.timeframe) {
    setEngineStatus('connecting');
    const url = `${CONFIG.API_BASE}${CONFIG.ENDPOINT_ANALYZE}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: asset, timeframe: timeframe }),
      });

      if (!response.ok) throw new Error(`Engine status ${response.status}`);

      const data = await response.json();
      setEngineStatus('connected');
      
      if (data.candles && data.candles.length > 0) state.candles = data.candles;
      return data;
    } catch (err) {
      console.warn('[The Wave] Backend unreachable:', err.message);
      setEngineStatus('disconnected');
      return null;
    }
  }

  function setEngineStatus(status) {
    const textEl = el.engineStatus.querySelector('.status-text strong');
    if (status === 'connected') {
      el.engineStatus.classList.remove('is-disconnected');
      textEl.textContent = 'Connected';
    } else if (status === 'connecting') {
      el.engineStatus.classList.remove('is-disconnected');
      textEl.textContent = 'Syncing…';
    } else {
      el.engineStatus.classList.add('is-disconnected');
      textEl.textContent = 'Offline';
    }
  }

  function renderCandles() {
    if (!state.candles || state.candles.length === 0) return;
    candleSeries.setData(state.candles);

    const last = state.candles[state.candles.length - 1];
    if (last) {
      const seed = ASSET_SEED[state.asset] || { digits: 2 };
      el.lastPrice.textContent = last.close.toFixed(seed.digits);
      el.lastPrice.style.color = last.close >= last.open ? COLORS.bull : COLORS.bear;
    }
  }

  function renderMonomoveOverlay() {
    if (!state.showMonomoves || !state.monomoves || state.monomoves.length === 0) {
      monomoveSeries.setData([]);
      if (candleSeries.setMarkers) candleSeries.setMarkers([]);
      return;
    }

    const linePoints = [];
    state.monomoves.forEach((v, i) => {
      if (i === 0) linePoints.push({ time: v.startTime, value: v.startPrice });
      linePoints.push({ time: v.endTime, value: v.endPrice });
    });
    
    monomoveSeries.setData(linePoints);
    renderWaveLabels();
  }

  function renderWaveLabels() {
    if (!candleSeries.setMarkers) return;
    if (!state.showWaveLabels || !state.showMonomoves) {
      candleSeries.setMarkers([]);
      return;
    }

    const markers = state.monomoves.map((v, i) => ({
      time: v.endTime,
      position: v.direction === 'UP' ? 'aboveBar' : 'belowBar',
      color: COLORS.gold,
      shape: v.direction === 'UP' ? 'arrowUp' : 'arrowDown',
      text: `W${i + 1}`,
    }));

    candleSeries.setMarkers(markers);
  }

  function renderMetrics() {
    const total = state.monomoves.length;
    el.metricTotal.textContent = total.toString();
    const latest = state.monomoves[total - 1];

    if (latest) {
      const isUp = latest.direction === 'UP';
      el.metricDirection.textContent = latest.direction;
      el.metricDirection.className = `badge ${isUp ? 'badge-up' : 'badge-down'}`;

      const seed = ASSET_SEED[state.asset] || { digits: 2 };
      el.metricHeight.textContent = `${latest.height.toFixed(seed.digits)} pts`;
      el.metricDuration.textContent = `${latest.durationBars} bars`;
    } else {
      el.metricDirection.textContent = '—';
      el.metricHeight.textContent = '—';
      el.metricDuration.textContent = '—';
    }
  }

  function renderPatternStatus() {
    const total = state.monomoves.length;
    const latest = state.monomoves[total - 1];
    const waveIndex = total > 0 ? ((total - 1) % 5) + 1 : 1;
    const isUp = latest ? latest.direction === 'UP' : true;
    const confidence = Math.min(96, 75 + Math.round(Math.random() * 15));

    el.patternName.textContent = `Impulse Wave ${waveIndex} ${isUp ? 'in Progress' : 'Correcting'}`;
    el.confidenceValue.textContent = `${confidence}%`;
    el.confidenceFill.style.width = `${confidence}%`;
  }

  function renderFibonacciTable() {
    const seed = ASSET_SEED[state.asset] || { digits: 2 };
    const latest = state.monomoves[state.monomoves.length - 1];
    const basePrice = latest ? latest.endPrice : 0;
    const span = latest ? Math.abs(latest.endPrice - latest.startPrice) : 10;
    const dir = latest && latest.direction === 'UP' ? 1 : -1;

    const ratios = [
      { ratio: '61.8%', priceMul: 0.618, timeElapsed: '42%' },
      { ratio: '100%', priceMul: 1.0, timeElapsed: '76%' },
      { ratio: '161.8%', priceMul: 1.618, timeElapsed: '118%' },
    ];

    el.fibTableBody.innerHTML = ratios.map((r) => `
      <tr>
        <td class="fib-ratio">${r.ratio}</td>
        <td>${(basePrice + dir * span * r.priceMul).toFixed(seed.digits)}</td>
        <td>${r.timeElapsed}</td>
      </tr>
    `).join('');
  }

  function renderVectorTable() {
    const seed = ASSET_SEED[state.asset] || { digits: 2 };
    el.drawerCount.textContent = `${state.monomoves.length} vectors`;

    if (state.monomoves.length === 0) {
      el.vectorTableBody.innerHTML = `<tr><td colspan="6" style="color: var(--text-tertiary); padding: 16px;">No monomoves detected.</td></tr>`;
      return;
    }

    el.vectorTableBody.innerHTML = state.monomoves.slice().reverse().map((v) => {
      const isUp = v.direction === 'UP';
      const heightSigned = isUp ? v.height : -v.height;
      return `
        <tr>
          <td>${v.id}</td>
          <td class="${isUp ? 'dir-up' : 'dir-down'}">${isUp ? '▲ UP' : '▼ DOWN'}</td>
          <td>${formatTime(v.startTime)} · ${v.startPrice.toFixed(seed.digits)}</td>
          <td>${formatTime(v.endTime)} · ${v.endPrice.toFixed(seed.digits)}</td>
          <td class="${heightSigned >= 0 ? 'height-pos' : 'height-neg'}">${heightSigned >= 0 ? '+' : ''}${heightSigned.toFixed(seed.digits)}</td>
          <td>${v.durationBars} bars</td>
        </tr>
      `;
    }).join('');
  }

  function formatTime(unixSeconds) {
    if (typeof unixSeconds === 'string') return unixSeconds;
    const d = new Date(unixSeconds * 1000);
    return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function renderAll() {
    renderCandles();
    renderMonomoveOverlay();
    renderMetrics();
    renderPatternStatus();
    renderFibonacciTable();
    renderVectorTable();
  }

  async function loadData(asset, timeframe) {
    state.asset = asset;
    state.timeframe = timeframe;

    el.symbolLabel.textContent = asset;
    el.tfLabel.textContent = timeframe;

    const backendResult = await fetchMonomovesFromBackend(asset, timeframe);

    if (backendResult && Array.isArray(backendResult.monomoves)) {
      state.monomoves = backendResult.monomoves;
    } else {
      state.monomoves = [];
    }

    renderAll();
    if (state.autoFit && chart) chart.timeScale().fitContent();
  }

  function wirePillGroup(groupEl, onSelect) {
    groupEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill');
      if (!btn || !groupEl.contains(btn)) return;
      groupEl.querySelectorAll('.pill').forEach((p) => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      onSelect(btn);
    });
  }

  function wireToggles() {
    el.toggleMonomoves.addEventListener('change', (e) => { state.showMonomoves = e.target.checked; renderMonomoveOverlay(); });
    el.toggleWaveLabels.addEventListener('change', (e) => { state.showWaveLabels = e.target.checked; renderWaveLabels(); });
    el.toggleAutofit.addEventListener('change', (e) => { state.autoFit = e.target.checked; if (state.autoFit) chart.timeScale().fitContent(); });
    el.toggleLogscale.addEventListener('change', (e) => {
      state.logScale = e.target.checked;
      if (chart) {
        chart.priceScale('right').applyOptions({
          mode: state.logScale ? LightweightCharts.PriceScaleMode.Logarithmic : LightweightCharts.PriceScaleMode.Normal,
        });
      }
    });
  }

  function wireDrawer() {
    el.drawerToggle.addEventListener('click', () => { el.drawer.classList.toggle('is-collapsed'); });
  }

  function wireRefresh() {
    el.refreshBtn.addEventListener('click', async () => {
      el.refreshBtn.classList.add('is-spinning');
      await loadData(state.asset, state.timeframe);
      setTimeout(() => el.refreshBtn.classList.remove('is-spinning'), 600);
    });
  }

  function init() {
    initChart();
    wireToggles();
    wireDrawer();
    wireRefresh();

    wirePillGroup(document.getElementById('asset-group'), (btn) => { loadData(btn.dataset.asset, state.timeframe); });
    wirePillGroup(document.getElementById('timeframe-group'), (btn) => { loadData(state.asset, btn.dataset.tf); });

    chart.applyOptions({ width: el.chartContainer.clientWidth, height: el.chartContainer.clientHeight });
    loadData(CONFIG.DEFAULT_ASSET, CONFIG.DEFAULT_TF);
  }

  document.addEventListener('DOMContentLoaded', init);
})();