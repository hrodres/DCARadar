import { describe, it, expect } from 'vitest'
import { calc, escHtml, pf } from './utils.js'

const CFG = {
  dcaBase: 500, multReserva: 8,
  multN3p: 4, multN3: 3, multN2: 2, multN01: 1, multN1i: 0.5, multN1r: 0.5,
  vixPanic: 30, vixEuph: 13, vstPanic: 30, vstEuph: 13,
  ddMod: -10, ddSev: -20, ddEuph: -0.5,
  rationWarn: 50, rationBrake: 25,
}
const FULL_RESERVE = { reserva: 4000, hasReserva: true, navEur: 0, capital: 0, parts: 0 }
const NO_RESERVE   = { reserva: 0,    hasReserva: false, navEur: 0, capital: 0, parts: 0 }
const INC_RESERVE  = { reserva: 2000, hasReserva: true,  navEur: 0, capital: 0, parts: 0 }

const mkt = (urthPrice, sma200, drawdown, vix, vstoxx = 0) => ({
  urthPrice, sma200, drawdown, vix, vstoxx, hasVstoxx: vstoxx > 0,
})

describe('escHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(escHtml("it's & \"fine\"")).toBe('it&#39;s &amp; &quot;fine&quot;')
  })
  it('returns plain strings unchanged', () => {
    expect(escHtml('Vanguard Global')).toBe('Vanguard Global')
  })
})

describe('pf', () => {
  it('parses comma as decimal separator', () => expect(pf('1,5')).toBe(1.5))
  it('returns 0 for non-numeric input', () => expect(pf('abc')).toBe(0))
})

describe('calc — protocolo inactivo', () => {
  it('sin reserva → nivel 0-1, DCA base', () => {
    const r = calc(mkt(100, 80, -3, 18), NO_RESERVE, CFG)
    expect(r.level).toBe('0-1')
    expect(r.invFinal).toBe(500)
    expect(r.protocoloActivo).toBe(false)
  })

  it('incluso con condiciones de crash, sin reserva → 0-1', () => {
    const r = calc(mkt(50, 80, -25, 40), NO_RESERVE, CFG)
    expect(r.level).toBe('0-1')
  })
})

describe('calc — reserva incompleta (protocolo activo con racionamiento)', () => {
  it('mercado normal + reserva incompleta → protocolo activo, nivel 0-1', () => {
    const r = calc(mkt(100, 80, -3, 18), INC_RESERVE, CFG)
    expect(r.protocoloActivo).toBe(true)
    expect(r.cResInc).toBe(true)
    expect(r.level).toBe('0-1')
    expect(r.invFinal).toBe(500)
  })

  it('crisis + reserva incompleta → protocolo activo, nivel elevado, racionamiento', () => {
    // INC_RESERVE: reserva=2000, objReserva=4000. Crash: VIX=35, DD=-25, bajista
    // nivel 3+: invCalc=2000, excesoBase=1500, postOp=500 < 1000(25%) → tier 2
    // invFinal = dcaBase(500) + excesoBase/2(750) = 1250
    const r = calc(mkt(50, 80, -25, 35), INC_RESERVE, CFG)
    expect(r.protocoloActivo).toBe(true)
    expect(r.level).toBe('3+')
    expect(r.rationTier).toBe(2)
    expect(r.invFinal).toBe(1250)
  })
})

describe('calc — nivel 3+ CRASH', () => {
  it('VIX pánico + DD severo + bajista → 3+', () => {
    const r = calc(mkt(50, 80, -25, 35), FULL_RESERVE, CFG)
    expect(r.level).toBe('3+')
    expect(r.mult).toBe(4)
    expect(r.invFinal).toBe(2000)
    expect(r.conds.cVixP).toBe(true)
    expect(r.conds.cDDs).toBe(true)
    expect(r.conds.cBear).toBe(true)
  })

  it('VSTOXX pánico (sin VIX) + DD severo + bajista → 3+', () => {
    const r = calc(mkt(50, 80, -25, 18, 35), FULL_RESERVE, CFG)
    expect(r.level).toBe('3+')
    expect(r.conds.cVixP).toBe(false)
    expect(r.conds.cVstP).toBe(true)
  })
})

describe('calc — nivel 3 PLENO', () => {
  it('VIX pánico + DD moderado (no severo) + bajista → 3', () => {
    const r = calc(mkt(50, 80, -15, 35), FULL_RESERVE, CFG)
    expect(r.level).toBe('3')
    expect(r.mult).toBe(3)
    expect(r.invFinal).toBe(1500)
    expect(r.conds.cDDm).toBe(true)
    expect(r.conds.cDDs).toBe(false)
  })
})

describe('calc — nivel 2 REFUERZO', () => {
  it('VIX pánico + bajista + DD normal → 2', () => {
    const r = calc(mkt(50, 80, -5, 35), FULL_RESERVE, CFG)
    expect(r.level).toBe('2')
    expect(r.mult).toBe(2)
    expect(r.invFinal).toBe(1000)
  })

  it('solo DD moderado + bajista (sin VIX) → 2', () => {
    const r = calc(mkt(50, 80, -12, 20), FULL_RESERVE, CFG)
    expect(r.level).toBe('2')
    expect(r.conds.cVixP).toBe(false)
    expect(r.conds.cDDm).toBe(true)
  })

  it('sin tendencia bajista, VIX pánico no activa nivel 2', () => {
    const r = calc(mkt(100, 80, -5, 35), FULL_RESERVE, CFG)
    expect(r.level).toBe('0-1')
  })
})

describe('calc — nivel 0-1 BASE', () => {
  it('mercado normal → 0-1', () => {
    const r = calc(mkt(100, 80, -3, 20), FULL_RESERVE, CFG)
    expect(r.level).toBe('0-1')
    expect(r.invFinal).toBe(500)
  })
})

describe('calc — nivel -1 EUFORIA', () => {
  it('VIX bajo + DD cerca de máximos → -1', () => {
    const r = calc(mkt(100, 80, -0.3, 12), FULL_RESERVE, CFG)
    expect(r.level).toBe('-1')
    expect(r.mult).toBe(1) // multN01 porque cResInc=false
    expect(r.invFinal).toBe(500)
    expect(r.conds.cEuph).toBe(true)
  })

  it('euforia requiere drawdown cerca de máximos', () => {
    const r = calc(mkt(100, 80, -5, 12), FULL_RESERVE, CFG)
    expect(r.level).toBe('0-1') // drawdown < ddEuph(-0.5) → no euforia
  })

  it('VSTOXX bajo activa euforia aunque VIX sea normal', () => {
    const r = calc(mkt(100, 80, -0.3, 20, 12), FULL_RESERVE, CFG)
    expect(r.level).toBe('-1')
  })
})

describe('calc — racionamiento', () => {
  const CFG_SMALL = { ...CFG, multReserva: 3 } // objReserva = 1500

  it('tier 2: postOp < 25% objReserva → recorta solo el exceso a la mitad', () => {
    // reserva=1600, excesoBase=1500(nivel3+) → postOp=100 < 375(25%)
    // invFinal = dcaBase(500) + excesoBase/2(750) = 1250
    const port = { reserva: 1600, hasReserva: true, navEur: 0, capital: 0, parts: 0 }
    const r = calc(mkt(50, 80, -25, 35), port, CFG_SMALL)
    expect(r.rationTier).toBe(2)
    expect(r.invFinal).toBe(1250)
  })

  it('tier 3: postOp <= 0 → inversión mínima = DCA base (nunca por debajo)', () => {
    // reserva=1500, excesoBase=1500 → postOp=0
    const port = { reserva: 1500, hasReserva: true, navEur: 0, capital: 0, parts: 0 }
    const r = calc(mkt(50, 80, -25, 35), port, CFG_SMALL)
    expect(r.rationTier).toBe(3)
    expect(r.invFinal).toBe(500) // dcaBase, nunca dcaBase * 0.5
  })

  it('rationAlert true cuando reserva < rationWarn% del objetivo', () => {
    // reserva=1900 < objReserva*50%(2000) → rationAlert=true, sin racionamiento aún
    const port = { reserva: 1900, hasReserva: true, navEur: 0, capital: 0, parts: 0 }
    const r = calc(mkt(100, 80, -3, 20), port, CFG)
    expect(r.rationAlert).toBe(true)
    expect(r.rationTier).toBe(0) // mercado normal, sin exceso
  })

  it('sin alerta cuando reserva >= rationWarn% del objetivo', () => {
    const port = { reserva: 4000, hasReserva: true, navEur: 0, capital: 0, parts: 0 }
    const r = calc(mkt(100, 80, -3, 20), port, CFG)
    expect(r.rationAlert).toBe(false)
    expect(r.rationTier).toBe(0)
  })
})

describe('calc — cartera', () => {
  it('calcula breakEven y nuevas participaciones', () => {
    const port = { ...FULL_RESERVE, navEur: 100, capital: 1000, parts: 10 }
    const r = calc(mkt(100, 80, -3, 20), port, CFG)
    expect(r.hasCartera).toBe(true)
    expect(r.newParts).toBeCloseTo(5)        // 500/100
    expect(r.totalParts).toBeCloseTo(15)
    expect(r.breakEven).toBeCloseTo(100)     // (1000+500)/15
  })

  it('primera aportación: isFirst=true', () => {
    const port = { ...FULL_RESERVE, navEur: 100, capital: 0, parts: 0 }
    const r = calc(mkt(100, 80, -3, 20), port, CFG)
    expect(r.isFirst).toBe(true)
    expect(r.pctRec).toBeNull()
  })

  it('pctRec se calcula cuando NAV < breakEven', () => {
    const port = { ...FULL_RESERVE, navEur: 80, capital: 1000, parts: 10 }
    const r = calc(mkt(80, 60, -3, 20), port, CFG)
    expect(r.pctRec).toBeGreaterThan(0)
  })
})
