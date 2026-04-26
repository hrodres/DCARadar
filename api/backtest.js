// api/backtest.js
// Simula el protocolo DCA mes a mes con datos reales de Yahoo Finance
// y lo compara contra DCA puro y benchmark (lump sum + DCA puro)

function runProtocol(urthPrice, sma200, drawdown, vix, reserva, cfg) {
  const { dcaBase, multReserva, multN3p, multN3, multN2, multN01, multN1i,
    vixPanic, vixEuph, ddMod, ddSev, ddEuph, rationBrake } = cfg

  const objReserva = dcaBase * multReserva
  const cResInc    = reserva < objReserva

  const cVixP = vix > vixPanic
  const cDDm  = drawdown < ddMod
  const cDDs  = drawdown < ddSev
  const cBear = urthPrice < sma200
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
    if (postOp <= 0)                                         { invFinal = dcaBase;                  rationTier = 3 }
    else if (postOp < objReserva * (rationBrake / 100))     { invFinal = dcaBase + excesoBase / 2; rationTier = 2 }
  }

  const excesoFinal = Math.max(0, invFinal - dcaBase)
  const reservaPost = Math.max(0, reserva - excesoFinal + invRes)

  return { level, invFinal, excesoFinal, invRes, reservaPost, rationTier }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  // Parámetros de configuración desde query string
  const cfg = {
    dcaBase:     parseFloat(req.query.dcaBase    || '500'),
    multReserva: parseFloat(req.query.multReserva || '8'),
    multN3p:     parseFloat(req.query.multN3p    || '4'),
    multN3:      parseFloat(req.query.multN3     || '3'),
    multN2:      parseFloat(req.query.multN2     || '2'),
    multN01:     parseFloat(req.query.multN01    || '1'),
    multN1i:     parseFloat(req.query.multN1i    || '0.5'),
    vixPanic:    parseFloat(req.query.vixPanic   || '30'),
    vixEuph:     parseFloat(req.query.vixEuph    || '13'),
    ddMod:       parseFloat(req.query.ddMod      || '-10'),
    ddSev:       parseFloat(req.query.ddSev      || '-20'),
    ddEuph:      parseFloat(req.query.ddEuph     || '-0.5'),
    rationBrake: parseFloat(req.query.rationBrake || '25'),
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    }

    // Fetch histórico: URTH desde su inicio (~2012), VIX últimos 15 años
    const urthUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/URTH?interval=1d&range=max'
    const vixUrl  = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=15y'

    const [urthResp, vixResp] = await Promise.all([
      fetch(urthUrl, { headers }),
      fetch(vixUrl,  { headers }),
    ])

    if (!urthResp.ok) throw new Error('URTH: ' + urthResp.status)
    if (!vixResp.ok)  throw new Error('VIX: '  + vixResp.status)

    const urthJson = await urthResp.json()
    const vixJson  = await vixResp.json()

    const urthResult = urthJson.chart.result[0]
    const vixResult  = vixJson.chart.result[0]

    const urthTs    = urthResult.timestamp
    const urthClose = urthResult.indicators.quote[0].close
    const vixTs     = vixResult.timestamp
    const vixClose  = vixResult.indicators.quote[0].close

    // Arrays diarios limpios
    const urthDaily = urthTs
      .map((t, i) => ({ ts: t, close: urthClose[i] }))
      .filter(d => d.close != null)

    // VIX lookup por clave año-mes-día
    const vixMap = {}
    vixTs.forEach((t, i) => {
      if (vixClose[i] != null) {
        const d = new Date(t * 1000)
        vixMap[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = vixClose[i]
      }
    })

    // Primer día de trading de cada mes
    const seenMonths = new Set()
    const monthly    = []

    for (let i = 0; i < urthDaily.length; i++) {
      const d  = new Date(urthDaily[i].ts * 1000)
      const mk = `${d.getFullYear()}-${d.getMonth()}`
      if (seenMonths.has(mk)) continue
      seenMonths.add(mk)

      let vix = null
      for (let off = 0; off <= 5 && !vix; off++) {
        const dt = new Date(d)
        dt.setDate(dt.getDate() + off)
        vix = vixMap[`${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`]
      }

      monthly.push({
        dateStr:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        urthPrice: urthDaily[i].close,
        vix:       vix || 18,
        idx:       i,
      })
    }

    // Simulación
    const objReserva  = cfg.dcaBase * cfg.multReserva
    let allTimeHigh   = 0
    let reserva       = objReserva   // empieza con reserva completa

    let partsP = 0, capitalP = 0
    let partsDCA = 0, capitalDCA = 0
    let partsLump = 0, capitalLump = 0

    const levelCount = { '3+': 0, '3': 0, '2': 0, '0-1': 0, '-1': 0 }
    const events     = []
    let firstDate    = null, lastDate = null

    for (const m of monthly) {
      const closesUpTo = urthDaily.slice(0, m.idx + 1).map(d => d.close)
      allTimeHigh = Math.max(allTimeHigh, m.urthPrice)
      if (closesUpTo.length < 200) continue   // SMA200 necesita al menos 200 días

      if (!firstDate) {
        firstDate  = m.dateStr
        // Benchmark: lump sum de la reserva inicial en el primer mes disponible
        partsLump  = objReserva / m.urthPrice
        capitalLump = objReserva
      }
      lastDate = m.dateStr

      const sma200 = closesUpTo.slice(-200).reduce((a, b) => a + b, 0) / 200
      const dd     = ((m.urthPrice - allTimeHigh) / allTimeHigh) * 100

      const r = runProtocol(m.urthPrice, sma200, dd, m.vix, reserva, cfg)

      partsP   += r.invFinal / m.urthPrice
      capitalP += r.invFinal
      reserva   = r.reservaPost

      partsDCA  += cfg.dcaBase / m.urthPrice
      capitalDCA += cfg.dcaBase

      partsLump  += cfg.dcaBase / m.urthPrice
      capitalLump += cfg.dcaBase

      levelCount[r.level] = (levelCount[r.level] || 0) + 1

      if (r.level !== '0-1') {
        events.push({
          date:    m.dateStr,
          level:   r.level,
          price:   +m.urthPrice.toFixed(2),
          vix:     +m.vix.toFixed(1),
          dd:      +dd.toFixed(1),
          inv:     Math.round(r.invFinal),
          excess:  Math.round(r.excesoFinal),
          reserva: Math.round(reserva),
          ration:  r.rationTier,
        })
      }
    }

    // Precio del último dato URTH para valoración final
    const lastPrice = urthDaily.at(-1).close

    const valP    = partsP    * lastPrice
    const valDCA  = partsDCA  * lastPrice
    const valLump = partsLump * lastPrice

    const retP    = (valP    - capitalP)    / capitalP    * 100
    const retDCA  = (valDCA  - capitalDCA)  / capitalDCA  * 100
    const retLump = (valLump - capitalLump) / capitalLump * 100

    const months = Object.values(levelCount).reduce((a, b) => a + b, 0)

    res.status(200).json({
      period: `${firstDate} → ${lastDate}`,
      months,
      urthInicio: +urthDaily.find((_, i) => {
        // Primer día usado en la simulación
        const d = new Date(urthDaily[i].ts * 1000)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === firstDate
      })?.close.toFixed(2),
      urthFin: +lastPrice.toFixed(2),
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
        note:    `4.000 € lump sum al inicio + ${Math.round(cfg.dcaBase)} €/mes`,
      },
      alpha:     +( retP - retLump).toFixed(1),
      alphaDCA:  +(retP - retDCA).toFixed(1),
      levelDist: levelCount,
      events,
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
