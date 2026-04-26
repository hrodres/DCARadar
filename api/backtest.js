// api/backtest.js
// Usa datos mensuales de Yahoo Finance (no hay límite de rango para interval=1mo).
// SMA10 meses ≈ SMA200 días (200 días / ~21 días por mes).

function runProtocol(urthPrice, sma10, drawdown, vix, reserva, cfg) {
  const { dcaBase, multReserva, multN3p, multN3, multN2, multN01, multN1i,
    vixPanic, vixEuph, ddMod, ddSev, ddEuph, rationBrake } = cfg

  const objReserva = dcaBase * multReserva
  const cResInc    = reserva < objReserva

  const cVixP = vix > vixPanic
  const cDDm  = drawdown < ddMod
  const cDDs  = drawdown < ddSev
  const cBear = urthPrice < sma10
  const cEuph = vix < vixEuph && drawdown >= ddEuph

  const n3p = cVixP && cDDm && cBear && cDDs
  const n3  = cVixP && cDDm && cBear && !cDDs && drawdown >= ddSev
  const n2  = (cVixP || cDDm) && cBear && !n3 && !n3p
  const nm1 = cEuph

  let level, mult
  if (n3p)      { level = '3+'; mult = multN3p }
  else if (n3)  { level = '3';  mult = multN3  }
  else if (n2)  { level = '2';  mult = multN2  }
  else if (nm1) { level = '-1'; mult = cResInc ? multN1i : multN01 }
  else          { level = '0-1'; mult = multN01 }

  const invCalc    = dcaBase * mult
  const excesoBase = Math.max(0, invCalc - dcaBase)
  const invRes     = (level === '-1' && cResInc) ? dcaBase * (1 - multN1i) : 0

  let invFinal = invCalc, rationTier = 0
  if (excesoBase > 0) {
    const postOp = reserva - excesoBase
    if (postOp <= 0)                                        { invFinal = dcaBase;                  rationTier = 3 }
    else if (postOp < objReserva * (rationBrake / 100))    { invFinal = dcaBase + excesoBase / 2; rationTier = 2 }
  }

  const excesoFinal = Math.max(0, invFinal - dcaBase)
  const reservaPost = Math.max(0, reserva - excesoFinal + invRes)

  return { level, invFinal, excesoFinal, invRes, reservaPost, rationTier }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const cfg = {
    dcaBase:     parseFloat(req.query.dcaBase     || '500'),
    multReserva: parseFloat(req.query.multReserva || '8'),
    multN3p:     parseFloat(req.query.multN3p     || '4'),
    multN3:      parseFloat(req.query.multN3      || '3'),
    multN2:      parseFloat(req.query.multN2      || '2'),
    multN01:     parseFloat(req.query.multN01     || '1'),
    multN1i:     parseFloat(req.query.multN1i     || '0.5'),
    vixPanic:    parseFloat(req.query.vixPanic    || '30'),
    vixEuph:     parseFloat(req.query.vixEuph     || '13'),
    ddMod:       parseFloat(req.query.ddMod       || '-10'),
    ddSev:       parseFloat(req.query.ddSev       || '-20'),
    ddEuph:      parseFloat(req.query.ddEuph      || '-0.5'),
    rationBrake: parseFloat(req.query.rationBrake || '25'),
  }

  // Filtro de período opcional (YYYY-MM)
  const fromYM = req.query.from || null   // ej: "2019-01"
  const toYM   = req.query.to   || null   // ej: "2022-12"

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    }

    // interval=1mo da todo el histórico sin límite de rango
    const urthUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/URTH?interval=1mo&range=max'
    const vixUrl  = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1mo&range=max'

    const [urthResp, vixResp] = await Promise.all([
      fetch(urthUrl, { headers }),
      fetch(vixUrl,  { headers }),
    ])

    if (!urthResp.ok) throw new Error('URTH: ' + urthResp.status)
    if (!vixResp.ok)  throw new Error('VIX: '  + vixResp.status)

    const urthJson = await urthResp.json()
    const vixJson  = await vixResp.json()

    const urthResult = urthJson?.chart?.result?.[0]
    const vixResult  = vixJson?.chart?.result?.[0]
    if (!urthResult) throw new Error('Sin datos URTH')
    if (!vixResult)  throw new Error('Sin datos VIX')

    // Arrays mensuales limpios
    const urthMonthly = urthResult.timestamp
      .map((t, i) => {
        const d = new Date(t * 1000)
        return {
          ym:    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          close: (urthResult.indicators.adjclose?.[0]?.adjclose?.[i]) ??
                 (urthResult.indicators.quote[0].close[i]),
        }
      })
      .filter(d => d.close != null && d.close > 0)

    // VIX lookup por año-mes
    const vixMap = {}
    vixResult.timestamp.forEach((t, i) => {
      const v = (vixResult.indicators.adjclose?.[0]?.adjclose?.[i]) ??
                (vixResult.indicators.quote[0].close[i])
      if (v != null && v > 0) {
        const d = new Date(t * 1000)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        vixMap[ym] = v
      }
    })

    // Simulación
    const SMA_N      = 10          // 10 meses ≈ SMA200 días
    const objReserva = cfg.dcaBase * cfg.multReserva

    let allTimeHigh = 0
    let reserva     = objReserva

    let partsP = 0, capitalP = 0
    let partsDCA = 0, capitalDCA = 0
    let partsLump = 0, capitalLump = 0

    const levelCount = { '3+': 0, '3': 0, '2': 0, '0-1': 0, '-1': 0 }
    const events     = []
    let firstDate    = null, lastDate = null
    let firstPrice   = null

    for (let i = 0; i < urthMonthly.length; i++) {
      const m     = urthMonthly[i]
      const price = m.close
      allTimeHigh = Math.max(allTimeHigh, price)   // ATH siempre sobre histórico completo

      if (i < SMA_N - 1) continue    // Necesitamos SMA_N meses de histórico

      // Filtro de período: solo simular dentro del rango solicitado
      if (fromYM && m.ym < fromYM) continue
      if (toYM   && m.ym > toYM)   continue

      const sma10 = urthMonthly.slice(i - SMA_N + 1, i + 1)
                      .reduce((s, x) => s + x.close, 0) / SMA_N
      const dd    = ((price - allTimeHigh) / allTimeHigh) * 100
      const vix   = vixMap[m.ym] || 18

      if (!firstDate) {
        firstDate  = m.ym
        firstPrice = price
        partsLump  = objReserva / price
        capitalLump = objReserva
      }
      lastDate = m.ym

      const r = runProtocol(price, sma10, dd, vix, reserva, cfg)

      partsP   += r.invFinal / price
      capitalP += r.invFinal
      reserva   = r.reservaPost

      partsDCA  += cfg.dcaBase / price
      capitalDCA += cfg.dcaBase

      partsLump  += cfg.dcaBase / price
      capitalLump += cfg.dcaBase

      levelCount[r.level] = (levelCount[r.level] || 0) + 1

      if (r.level !== '0-1') {
        events.push({
          date:    m.ym,
          level:   r.level,
          price:   +price.toFixed(2),
          vix:     +vix.toFixed(1),
          dd:      +dd.toFixed(1),
          inv:     Math.round(r.invFinal),
          excess:  Math.round(r.excesoFinal),
          reserva: Math.round(reserva),
          ration:  r.rationTier,
        })
      }
    }

    const lastPrice = urthMonthly.at(-1).close
    const valP    = partsP    * lastPrice
    const valDCA  = partsDCA  * lastPrice
    const valLump = partsLump * lastPrice

    const retP    = capitalP    > 0 ? (valP    - capitalP)    / capitalP    * 100 : 0
    const retDCA  = capitalDCA  > 0 ? (valDCA  - capitalDCA)  / capitalDCA  * 100 : 0
    const retLump = capitalLump > 0 ? (valLump - capitalLump) / capitalLump * 100 : 0

    const months = Object.values(levelCount).reduce((a, b) => a + b, 0)

    res.status(200).json({
      period:     `${firstDate} → ${lastDate}`,
      months,
      urthInicio: firstPrice  ? +firstPrice.toFixed(2)  : null,
      urthFin:    lastPrice   ? +lastPrice.toFixed(2)   : null,
      protocol: {
        capital: Math.round(capitalP),
        value:   Math.round(valP),
        ret:     +retP.toFixed(1),
        reserva: Math.round(reserva),
        parts:   +partsP.toFixed(4),
      },
      pureDCA: {
        capital: Math.round(capitalDCA),
        value:   Math.round(valDCA),
        ret:     +retDCA.toFixed(1),
        parts:   +partsDCA.toFixed(4),
      },
      benchmark: {
        capital: Math.round(capitalLump),
        value:   Math.round(valLump),
        ret:     +retLump.toFixed(1),
        parts:   +partsLump.toFixed(4),
        note:    `${Math.round(objReserva).toLocaleString('es-ES')} € lump sum al inicio + ${Math.round(cfg.dcaBase)} €/mes`,
      },
      alpha:    +(retP - retLump).toFixed(1),
      alphaDCA: +(retP - retDCA).toFixed(1),
      levelDist: levelCount,
      events,
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
