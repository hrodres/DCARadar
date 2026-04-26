export const pf = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n }
export const fN = (v, d = 2) => typeof v === 'number' && !isNaN(v) ? v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'
export const eur = (v) => fN(v) + ' €'
export const usd = (v) => fN(v) + ' $'
export const pct = (v) => fN(v) + '%'
export const f4  = (v) => fN(v, 4)
export const todayStr = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
export const escHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')

export const LM = {
  '3+': { color: '#ef4444', bg: '#fef2f2', bgD: '#2d1515', border: '#fecaca', borderD: '#7f1d1d', label: 'CRASH' },
  '3':  { color: '#f97316', bg: '#fff7ed', bgD: '#2d1a0a', border: '#fed7aa', borderD: '#7c2d12', label: 'PLENO' },
  '2':  { color: '#eab308', bg: '#fefce8', bgD: '#292100', border: '#fde68a', borderD: '#713f12', label: 'REFUERZO' },
  '0-1':{ color: '#22c55e', bg: '#f0fdf4', bgD: '#0f1f13', border: '#bbf7d0', borderD: '#14532d', label: 'BASE' },
  '-1': { color: '#3b82f6', bg: '#eff6ff', bgD: '#0f172a', border: '#bfdbfe', borderD: '#1e3a5f', label: 'EUFORIA' },
}

export const PROFILES = {
  conservador:   { label: 'Conservador',   multN3p: 2, multN3: 2, multN2: 1.5, multN01: 1, multN1i: 0.5, desc: 'Reserva pequeña o horizonte corto' },
  moderado:      { label: 'Moderado',      multN3p: 4, multN3: 3, multN2: 2,   multN01: 1, multN1i: 0.5, desc: 'Equilibrio riesgo/oportunidad — recomendado' },
  agresivo:      { label: 'Agresivo',      multN3p: 6, multN3: 4, multN2: 2,   multN01: 1, multN1i: 0.5, desc: 'Reserva amplia y horizonte largo' },
  personalizado: { label: 'Personalizado', multN3p: 4, multN3: 3, multN2: 2,   multN01: 1, multN1i: 0.5, desc: 'Configura tus propios valores' },
}

export const DEF_CFG = {
  activo: '', dcaBase: 500, multReserva: 8,
  rationWarn: 50, rationBrake: 25,
  vixPanic: 30, vixEuph: 13, vstPanic: 30, vstEuph: 13,
  ddMod: -10, ddSev: -20, ddEuph: -0.5,
  profile: 'moderado', ...PROFILES.moderado,
}

export function calc(mktRaw, portRaw, cfg) {
  const { urthPrice, sma200, drawdown, vix, vstoxx, hasVstoxx } = mktRaw
  const { reserva, hasReserva, navEur, capital, parts } = portRaw
  const { dcaBase, multReserva, multN3p, multN3, multN2, multN01, multN1i,
    vixPanic, vixEuph, vstPanic, vstEuph, ddMod, ddSev, ddEuph, rationWarn, rationBrake } = cfg

  const objReserva = dcaBase * multReserva
  const reservaCompleta = hasReserva && reserva >= objReserva
  const protocoloActivo = hasReserva

  const cVixP  = vix > vixPanic
  const cVstP  = hasVstoxx && vstoxx > vstPanic
  const cDDm   = drawdown < ddMod
  const cDDs   = drawdown < ddSev
  const cBear  = urthPrice < sma200
  const cEuph  = (vix < vixEuph || (hasVstoxx && vstoxx < vstEuph)) && drawdown >= ddEuph
  const cResInc = hasReserva && reserva < objReserva

  let n3p, n3, n2, nm1, n01
  if (protocoloActivo) {
    n3p = (cVixP || cVstP) && cDDm && cBear && cDDs
    n3  = (cVixP || cVstP) && cDDm && cBear && !cDDs && drawdown >= ddSev
    n2  = (cVixP || cVstP || cDDm) && cBear && !n3 && !n3p
    nm1 = cEuph
    n01 = !n3p && !n3 && !n2 && !nm1
  } else {
    n3p = false; n3 = false; n2 = false; nm1 = false; n01 = true
  }

  let level, mult
  if (n3p)      { level = '3+';  mult = multN3p }
  else if (n3)  { level = '3';   mult = multN3  }
  else if (n2)  { level = '2';   mult = multN2  }
  else if (nm1) { level = '-1';  mult = cResInc ? multN1i : multN01 }
  else          { level = '0-1'; mult = multN01 }

  const invCalc    = dcaBase * mult
  const excesoBase = Math.max(0, invCalc - dcaBase)
  const invRes     = (level === '-1' && cResInc) ? dcaBase * (1 - multN1i) : 0

  let invFinal = invCalc, rationTier = 0, rationAlert = false
  if (hasReserva && excesoBase > 0) {
    rationAlert = reserva < objReserva * (rationWarn / 100)
    const postOp = reserva - excesoBase
    if (postOp <= 0)                                     { invFinal = dcaBase;                    rationTier = 3 }
    else if (postOp < objReserva * (rationBrake / 100)) { invFinal = dcaBase + excesoBase / 2;   rationTier = 2 }
  }

  const excesoFinal    = Math.max(0, invFinal - dcaBase)
  const reservaPostRaw = hasReserva ? reserva - excesoFinal + invRes : null
  const reservaPost    = reservaPostRaw != null ? Math.max(0, reservaPostRaw) : null
  const reservaAgotada = reservaPostRaw != null && reservaPostRaw < 0

  const hasCartera = navEur > 0
  const isFirst    = hasCartera && capital === 0 && parts === 0
  const newParts   = hasCartera ? invFinal / navEur : 0
  const totalParts = parts + newParts
  const breakEven  = totalParts > 0 ? (capital + invFinal) / totalParts : 0
  const pctRec     = (hasCartera && !isFirst && navEur < breakEven) ? ((breakEven - navEur) / navEur) * 100 : null

  const costeExtraN3 = dcaBase * (multN3 - multN01)
  const coverMonths  = (reservaPost != null && costeExtraN3 > 0) ? reservaPost / costeExtraN3 : null

  return {
    level, mult, invFinal, invCalc, excesoFinal, invRes,
    rationTier, rationAlert, reservaAgotada,
    objReserva, cResInc, reservaCompleta, protocoloActivo,
    conds: { cVixP, cVstP, cDDm, cDDs, cBear, cEuph, cResInc },
    levels: { n3p, n3, n2, n01, nm1 },
    hasCartera, isFirst, newParts, totalParts, breakEven, pctRec,
    reservaPost, coverMonths,
    dcaPure: dcaBase * multN01,
  }
}
