/**
 * DCA Radar — Backtesting
 * Uso: node backtest.js
 *
 * Simula el protocolo mes a mes desde 2013 con datos reales de URTH y VIX
 * y lo compara contra un DCA puro de 500€/mes.
 *
 * Parámetros en CFG (ajusta si cambias tu configuración).
 */

const https = require('https')

// ─── Configuración ────────────────────────────────────────────────────────────

const CFG = {
  dcaBase:    500,
  multReserva: 8,          // objReserva = 4000 €
  multN3p: 4, multN3: 3, multN2: 2, multN01: 1, multN1i: 0.5,
  vixPanic: 30, vixEuph: 13,
  ddMod: -10, ddSev: -20, ddEuph: -0.5,
  rationWarn: 50, rationBrake: 25,
}

// ─── Fetch ─────────────────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' } }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { reject(new Error(d.slice(0, 300))) } })
    }).on('error', reject)
  })
}

async function fetchDaily(symbol, from, to) {
  const p1 = Math.floor(new Date(from).getTime() / 1000)
  const p2 = Math.floor(new Date(to).getTime() / 1000)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${p1}&period2=${p2}&interval=1d`
  const j = await fetchJSON(url)
  const r = j?.chart?.result?.[0]
  if (!r) throw new Error(`Sin datos para ${symbol}: ${JSON.stringify(j).slice(0, 200)}`)
  const ts = r.timestamp
  const cl = r.indicators.quote[0].close
  return ts.map((t, i) => ({ date: new Date(t * 1000), close: cl[i] })).filter(d => d.close != null)
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sma(arr, n) {
  if (arr.length < n) return null
  return arr.slice(-n).reduce((a, b) => a + b, 0) / n
}

function fmt(n, d = 0) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d })
}

// ─── Lógica del protocolo (réplica de utils.js calc()) ────────────────────────

function protocol(urthPrice, sma200, drawdown, vix, reserva) {
  const { dcaBase, multReserva, multN3p, multN3, multN2, multN01, multN1i,
    vixPanic, vixEuph, ddMod, ddSev, ddEuph, rationWarn, rationBrake } = CFG

  const objReserva = dcaBase * multReserva
  const cResInc    = reserva < objReserva

  const cVixP  = vix > vixPanic
  const cDDm   = drawdown < ddMod
  const cDDs   = drawdown < ddSev
  const cBear  = urthPrice < sma200
  const cEuph  = vix < vixEuph && drawdown >= ddEuph

  const n3p = cVixP && cDDm && cBear && cDDs
  const n3  = cVixP && cDDm && cBear && !cDDs && drawdown >= ddSev
  const n2  = (cVixP || cDDm) && cBear && !n3 && !n3p
  const nm1 = cEuph
  // n01 = everything else

  let level, mult
  if (n3p)      { level = '3+';  mult = multN3p }
  else if (n3)  { level = '3';   mult = multN3 }
  else if (n2)  { level = '2';   mult = multN2 }
  else if (nm1) { level = '-1';  mult = cResInc ? multN1i : multN01 }
  else          { level = '0-1'; mult = multN01 }

  const invCalc    = dcaBase * mult
  const excesoBase = Math.max(0, invCalc - dcaBase)
  const invRes     = (level === '-1' && cResInc) ? dcaBase * (1 - multN1i) : 0

  let invFinal = invCalc, rationTier = 0
  if (excesoBase > 0) {
    const postOp = reserva - excesoBase
    if (postOp <= 0)                                          { invFinal = dcaBase;                  rationTier = 3 }
    else if (postOp < objReserva * (rationBrake / 100))      { invFinal = dcaBase + excesoBase / 2; rationTier = 2 }
  }

  const excesoFinal    = Math.max(0, invFinal - dcaBase)
  const reservaPostRaw = reserva - excesoFinal + invRes
  const reservaPost    = Math.max(0, reservaPostRaw)

  return { level, mult, invFinal, excesoFinal, invRes, reservaPost, rationTier }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const FROM = '2012-01-01'
  const TO   = new Date().toISOString().split('T')[0]

  console.log(`\nDescargando datos ${FROM} → ${TO} ...`)

  const [urthRaw, vixRaw] = await Promise.all([
    fetchDaily('URTH', FROM, TO),
    fetchDaily('^VIX', FROM, TO),
  ])

  console.log(`URTH: ${urthRaw.length} sesiones | VIX: ${vixRaw.length} sesiones`)

  // VIX lookup por fecha ISO
  const vixMap = {}
  for (const d of vixRaw) {
    vixMap[d.date.toISOString().slice(0, 10)] = d.close
  }

  // Primer día de trading de cada mes
  const seenMonths = new Set()
  const monthly = []
  for (let i = 0; i < urthRaw.length; i++) {
    const d = urthRaw[i]
    const mk = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}`
    if (seenMonths.has(mk)) continue
    seenMonths.add(mk)

    // Busca VIX ese día o ±3 días
    const dateStr = d.date.toISOString().slice(0, 10)
    let vix = vixMap[dateStr]
    if (!vix) {
      for (let off = 1; off <= 3 && !vix; off++) {
        const d1 = new Date(d.date); d1.setDate(d1.getDate() + off)
        const d2 = new Date(d.date); d2.setDate(d2.getDate() - off)
        vix = vixMap[d1.toISOString().slice(0, 10)] || vixMap[d2.toISOString().slice(0, 10)]
      }
    }
    monthly.push({ mk, dateStr, urthPrice: d.close, vix: vix || 18, idx: i })
  }

  // Calcula SMA200 y drawdown para cada punto mensual
  const objReserva = CFG.dcaBase * CFG.multReserva
  let allTimeHigh  = 0
  const simData    = []

  for (const m of monthly) {
    const prices = urthRaw.slice(0, m.idx + 1).map(d => d.close)
    allTimeHigh  = Math.max(allTimeHigh, m.urthPrice)
    if (prices.length < 200) continue     // Necesitamos 200 días para SMA200
    const s200   = sma(prices, 200)
    const dd     = ((m.urthPrice - allTimeHigh) / allTimeHigh) * 100
    simData.push({ ...m, sma200: s200, drawdown: dd })
  }

  console.log(`Meses con datos completos: ${simData.length}`)
  console.log(`Período efectivo: ${simData[0].dateStr} → ${simData.at(-1).dateStr}\n`)

  // ── Simulación ──────────────────────────────────────────────────────────────

  // Protocolo
  let reserva   = objReserva   // empieza con reserva completa
  let partsP    = 0
  let capitalP  = 0

  // DCA puro (500€/mes)
  let partsDCA  = 0
  let capitalDCA = 0

  // DCA puro + 4000€ lump sum al inicio (benchmark más justo)
  let partsLump  = simData[0] ? objReserva / simData[0].urthPrice : 0
  let capitalLump = objReserva

  const rows = []
  const levelCount = {}

  for (const m of simData) {
    const r = protocol(m.urthPrice, m.sma200, m.drawdown, m.vix, reserva)

    // Protocolo: dcaBase viene de nómina, exceso de reserva
    partsP   += r.invFinal / m.urthPrice
    capitalP += r.invFinal
    reserva   = r.reservaPost

    // DCA puro
    partsDCA  += CFG.dcaBase / m.urthPrice
    capitalDCA += CFG.dcaBase

    // Lump sum + DCA puro
    partsLump  += CFG.dcaBase / m.urthPrice
    capitalLump += CFG.dcaBase

    levelCount[r.level] = (levelCount[r.level] || 0) + 1

    rows.push({
      date:        m.dateStr,
      price:       m.urthPrice,
      sma200:      m.sma200,
      dd:          m.drawdown,
      vix:         m.vix,
      level:       r.level,
      inv:         r.invFinal,
      excess:      r.excesoFinal,
      reserva,
      rationTier:  r.rationTier,
      valP:        partsP * m.urthPrice,
      capP:        capitalP,
      valDCA:      partsDCA * m.urthPrice,
      capDCA:      capitalDCA,
      valLump:     partsLump * m.urthPrice,
      capLump:     capitalLump,
    })
  }

  const last    = rows.at(-1)
  const n       = rows.length
  const retP    = ((last.valP   - last.capP)   / last.capP)   * 100
  const retDCA  = ((last.valDCA - last.capDCA) / last.capDCA) * 100
  const retLump = ((last.valLump - last.capLump) / last.capLump) * 100

  // Cuánto creció 1 parte: protocolo vs DCA puro (normalizado)
  const partsPerEuro_P   = partsP   / capitalP
  const partsPerEuro_DCA = partsDCA / capitalDCA

  console.log('═══════════════════════════════════════════════════════')
  console.log('  RESULTADOS DEL BACKTESTING — DCA Radar')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Período : ${simData[0].dateStr} → ${simData.at(-1).dateStr}`)
  console.log(`  Meses   : ${n}`)
  console.log(`  URTH inicio: $${fmt(simData[0].urthPrice, 2)}  →  fin: $${fmt(simData.at(-1).urthPrice, 2)}`)
  console.log()

  console.log('  ┌────────────────────────────────────────────────────┐')
  console.log('  │  PROTOCOLO DCA (500€/mes + reserva 4000€)          │')
  console.log('  ├────────────────────────────────────────────────────┤')
  console.log(`  │  Capital desplegado : ${fmt(last.capP)} €`.padEnd(55) + '│')
  console.log(`  │  Valor cartera      : ${fmt(last.valP)} €`.padEnd(55) + '│')
  console.log(`  │  Rentabilidad       : ${fmt(retP, 1)}%`.padEnd(55) + '│')
  console.log(`  │  Reserva final      : ${fmt(last.reserva)} €`.padEnd(55) + '│')
  console.log(`  │  Partes acumuladas  : ${fmt(partsP, 4)}`.padEnd(55) + '│')
  console.log('  └────────────────────────────────────────────────────┘')
  console.log()
  console.log('  ┌────────────────────────────────────────────────────┐')
  console.log('  │  DCA PURO (500€/mes, sin protocolo)                │')
  console.log('  ├────────────────────────────────────────────────────┤')
  console.log(`  │  Capital desplegado : ${fmt(last.capDCA)} €`.padEnd(55) + '│')
  console.log(`  │  Valor cartera      : ${fmt(last.valDCA)} €`.padEnd(55) + '│')
  console.log(`  │  Rentabilidad       : ${fmt(retDCA, 1)}%`.padEnd(55) + '│')
  console.log(`  │  Partes acumuladas  : ${fmt(partsDCA, 4)}`.padEnd(55) + '│')
  console.log('  └────────────────────────────────────────────────────┘')
  console.log()
  console.log('  ┌────────────────────────────────────────────────────┐')
  console.log('  │  DCA PURO + 4000€ lump sum al inicio (benchmark)   │')
  console.log('  ├────────────────────────────────────────────────────┤')
  console.log(`  │  Capital desplegado : ${fmt(last.capLump)} €`.padEnd(55) + '│')
  console.log(`  │  Valor cartera      : ${fmt(last.valLump)} €`.padEnd(55) + '│')
  console.log(`  │  Rentabilidad       : ${fmt(retLump, 1)}%`.padEnd(55) + '│')
  console.log(`  │  Partes acumuladas  : ${fmt(partsLump, 4)}`.padEnd(55) + '│')
  console.log('  └────────────────────────────────────────────────────┘')
  console.log()

  // Alpha real: partes por euro desplegado (ajustado por capital)
  const alphaRet   = retP - retLump
  const alphaLabel = alphaRet >= 0 ? `+${fmt(alphaRet, 1)}%` : `${fmt(alphaRet, 1)}%`
  console.log(`  ALPHA vs benchmark lump+DCA : ${alphaLabel}`)
  console.log(`  (mismo capital total, diferente timing)`)
  console.log()

  // Distribución de niveles
  console.log('  ─── Distribución de niveles ───────────────────────')
  const levelOrder = ['3+', '3', '2', '0-1', '-1']
  for (const lv of levelOrder) {
    const c = levelCount[lv] || 0
    const bar = '█'.repeat(Math.round(c / n * 30))
    console.log(`  ${lv.padStart(3)}  ${String(c).padStart(3)} meses (${fmt(c / n * 100, 0).padStart(3)}%)  ${bar}`)
  }
  console.log()

  // Eventos de racionamiento
  const rationRows = rows.filter(r => r.rationTier > 0)
  if (rationRows.length) {
    console.log(`  ─── Racionamiento (${rationRows.length} eventos) ──────────────────`)
    for (const r of rationRows) {
      console.log(`  ${r.date}  Tier ${r.rationTier}  reserva: ${fmt(r.reserva)} €  VIX: ${fmt(r.vix, 1)}`)
    }
    console.log()
  }

  // Meses de crisis notables (nivel 2+)
  const crisisRows = rows.filter(r => ['3+', '3', '2'].includes(r.level))
  if (crisisRows.length) {
    console.log(`  ─── Meses de nivel 2+ (${crisisRows.length} activaciones) ────────────`)
    console.log('  Fecha       Nivel  Precio   SMA200   DD%     VIX    Inv    Exceso')
    for (const r of crisisRows) {
      console.log(
        `  ${r.date}  ${r.level.padStart(3)}   $${fmt(r.price, 2).padStart(7)}  $${fmt(r.sma200, 2).padStart(7)}  ${fmt(r.dd, 1).padStart(6)}%  ${fmt(r.vix, 1).padStart(5)}  ${fmt(r.inv).padStart(5)}€  ${fmt(r.excess).padStart(5)}€`
      )
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n')
}

main().catch(e => {
  console.error('\nError:', e.message)
  process.exit(1)
})
