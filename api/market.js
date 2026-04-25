// api/market.js
// Vercel serverless function — corre en servidor, sin restricciones CORS
// Llama a Yahoo Finance y devuelve los datos al frontend

export default async function handler(req, res) {
  // Permitir CORS desde cualquier origen (es tu web personal)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    };

    // Fetch URTH (2 años para calcular SMA200 y drawdown)
    const urthUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/URTH?interval=1d&range=2y';
    const vixUrl  = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d';
    const v2txUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EV2TX?interval=1d&range=5d';

    const [urthResp, vixResp, v2txResp] = await Promise.all([
      fetch(urthUrl,  { headers }),
      fetch(vixUrl,   { headers }),
      fetch(v2txUrl,  { headers }),
    ]);

    if (!urthResp.ok) throw new Error('URTH fetch failed: ' + urthResp.status);
    if (!vixResp.ok)  throw new Error('VIX fetch failed: '  + vixResp.status);

    const urthData = await urthResp.json();
    const vixData  = await vixResp.json();
    const v2txData = v2txResp.ok ? await v2txResp.json() : null;

    // Procesar URTH
    const urthResult = urthData.chart.result[0];
    const prices     = urthResult.indicators.quote[0].close.filter(Boolean);
    const urthPrice  = prices[prices.length - 1];
    const last200    = prices.slice(-200);
    const sma200     = last200.reduce((a, b) => a + b, 0) / last200.length;
    const ath        = Math.max(...prices);
    const drawdown   = (urthPrice / ath - 1) * 100;

    // Timestamp último dato
    const timestamps = urthResult.timestamp;
    const lastTs     = timestamps[timestamps.length - 1];
    const lastDate   = new Date(lastTs * 1000).toLocaleDateString('es-ES');

    // Procesar VIX
    const vixPrices = vixData.chart.result[0].indicators.quote[0].close.filter(Boolean);
    const vix       = vixPrices[vixPrices.length - 1];

    // Procesar VSTOXX (^V2TX) — opcional, no falla si no está disponible
    let vstoxx = null;
    try {
      if (v2txData?.chart?.result?.[0]) {
        const v2txPrices = v2txData.chart.result[0].indicators.quote[0].close.filter(Boolean);
        vstoxx = v2txPrices[v2txPrices.length - 1];
      }
    } catch (_) {}

    res.status(200).json({
      urthPrice,
      sma200,
      drawdown,
      vix,
      vstoxx,
      lastDate,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
