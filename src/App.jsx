import { useState, useCallback } from 'react'
import { pf, fN, eur, usd, pct, f4, todayStr, escHtml, LM, PROFILES, DEF_CFG, calc } from './utils.js'
import NumInput from './components/NumInput.jsx'
import VerdictPanel from './components/VerdictPanel.jsx'

// ── PDF ───────────────────────────────────────────────────────────────────────

function generatePDF(result, mktRaw, portRaw, cfg, fetchDate, dark) {
  const { level, invFinal, excesoFinal, rationTier, reservaPost, objReserva,
    hasCartera, breakEven, pctRec, totalParts, newParts, isFirst,
    coverMonths, dcaPure, mult, protocoloActivo, conds, levels } = result
  const { urthPrice, sma200, drawdown, vix, vstoxx, hasVstoxx } = mktRaw
  const { reserva, hasReserva, navEur, capital, parts } = portRaw
  const meta = LM[level] || LM['0-1']
  const date = todayStr()
  const activo = escHtml(cfg.activo || 'Activo de referencia: URTH (MSCI World)')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>DCA Radar — ${date}</title>
<style>
  @page { margin: 2cm 2.5cm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1d1d1f; font-size: 11px; line-height: 1.5; background: white; }
  
  .header { border-bottom: 2px solid #1d1d1f; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header-title { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .header-sub { font-size: 11px; color: #6e6e73; margin-top: 2px; }
  .header-date { text-align: right; font-size: 11px; color: #6e6e73; }
  
  .verdict { background: ${meta.bg}; border: 1.5px solid ${meta.border}; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
  .verdict-level { font-size: 26px; font-weight: 700; color: ${meta.color}; letter-spacing: -0.5px; margin-bottom: 12px; }
  .verdict-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .vblock-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #6e6e73; margin-bottom: 3px; }
  .vblock-value { font-size: 18px; font-weight: 700; white-space: nowrap; }
  
  .alert { border-radius: 6px; padding: 8px 12px; font-size: 11px; margin-bottom: 10px; font-weight: 500; }
  .alert-crit { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
  .alert-warn { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; }
  .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
  .alert-ok   { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
  
  .section { margin-bottom: 18px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #6e6e73; border-bottom: 1px solid #e5e5ea; padding-bottom: 4px; margin-bottom: 8px; }
  
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  
  .kv { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f5f5f7; }
  .kv-k { color: #6e6e73; }
  .kv-v { font-weight: 600; white-space: nowrap; }
  
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 600; margin-right: 4px; margin-bottom: 4px; }
  .badge-ok   { background: #d1fae5; color: #065f46; }
  .badge-warn { background: #fee2e2; color: #991b1b; }
  .badge-neu  { background: #f3f4f6; color: #6b7280; }
  
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; padding: 5px 8px; background: #f5f5f7; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6e6e73; }
  td { padding: 5px 8px; border-bottom: 1px solid #f5f5f7; }
  tr.active td { background: ${meta.bg}; font-weight: 600; color: ${meta.color}; }
  tr:nth-child(even):not(.active) td { background: #fafafa; }
  
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e5ea; font-size: 9px; color: #aeaeb2; line-height: 1.6; }
  .footer strong { color: #6e6e73; }
  
  .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-title">DCA Radar</div>
    <div class="header-sub">Auditoría táctica mensual${activo ? ' · ' + activo : ''}</div>
  </div>
  <div class="header-date">
    <div style="font-size:13px;font-weight:700">${date}</div>
    ${fetchDate ? '<div>Datos de mercado: ' + fetchDate + '</div>' : ''}
    <div style="margin-top:3px;display:inline-block;background:${meta.bg};border:1px solid ${meta.border};border-radius:4px;padding:2px 8px;font-weight:600;color:${meta.color}">${level} — ${meta.label}</div>
  </div>
</div>

<div class="verdict">
  <div class="verdict-level">${level} — ${meta.label}</div>
  <div class="verdict-grid">
    <div>
      <div class="vblock-label">Invertir este mes</div>
      <div class="vblock-value" style="color:#1d1d1f">${eur(invFinal)}</div>
    </div>
    <div>
      <div class="vblock-label">De nómina / flujo</div>
      <div class="vblock-value" style="color:#16a34a">${eur(cfg.dcaBase)}</div>
    </div>
    <div>
      <div class="vblock-label">De reserva táctica</div>
      <div class="vblock-value" style="color:${excesoFinal > 0 ? '#ea580c' : '#6e6e73'}">${eur(excesoFinal)}</div>
    </div>
    ${reservaPost != null ? `<div>
      <div class="vblock-label">Reserva tras operación</div>
      <div class="vblock-value" style="color:${reservaPost < objReserva * 0.25 ? '#dc2626' : reservaPost < objReserva * 0.5 ? '#ca8a04' : '#16a34a'}">${eur(reservaPost)}</div>
    </div>` : ''}
  </div>
</div>

${rationTier === 3 ? '<div class="alert alert-crit">🔴 Racionamiento crítico — la operación agotaría la reserva táctica. Inversión reducida al mínimo (DCA × 0.5).</div>' : ''}
${rationTier === 2 ? '<div class="alert alert-warn">⚠ Racionamiento activo — la operación dejaría la reserva por debajo del ' + cfg.rationBrake + '% del objetivo. Inversión dividida entre 2.</div>' : ''}
${result.rationAlert && rationTier === 0 ? '<div class="alert alert-info">Reserva por debajo del ' + cfg.rationWarn + '% del objetivo. Sin racionamiento aún — vigilar evolución.</div>' : ''}
${!protocoloActivo ? '<div class="alert alert-info">Protocolo táctico inactivo — reserva ' + (hasReserva ? 'incompleta (' + eur(portRaw.reserva) + ' de ' + eur(objReserva) + ')' : 'no aportada') + '. Aplicando DCA base.</div>' : ''}
${level === '-1' && !result.cResInc ? '<div class="alert alert-info">Mercado en euforia — inversión reducida. Momento de acumular reserva táctica.</div>' : ''}

<div class="section">
  <div class="section-title">Estado del mercado</div>
  <div style="margin-bottom:6px">
    ${[
      { l: 'VIX ' + fN(vix), ok: !conds.cVixP },
      { l: 'VSTOXX ' + (hasVstoxx ? fN(vstoxx) : 'n/a'), ok: !conds.cVstP, neu: !hasVstoxx },
      { l: conds.cDDs ? 'DD Severo' : conds.cDDm ? 'DD Moderado' : 'DD Normal ' + pct(drawdown), ok: !conds.cDDm },
      { l: conds.cBear ? 'Bajista' : 'Alcista', ok: !conds.cBear },
      { l: 'Reserva ' + (hasReserva ? (result.reservaCompleta ? 'completa' : 'incompleta') : 'n/a'), ok: result.reservaCompleta, neu: !hasReserva },
    ].map(({ l, ok, neu }) => `<span class="badge ${neu ? 'badge-neu' : ok ? 'badge-ok' : 'badge-warn'}">${neu ? '○' : ok ? '✓' : '✗'} ${l}</span>`).join('')}
  </div>
</div>

<div class="grid2">
  <div class="section">
    <div class="section-title">Datos de mercado</div>
    ${[
      ['URTH Precio', usd(urthPrice)],
      ['SMA 200 (200 sesiones)', usd(sma200)],
      ['Tendencia', urthPrice > sma200 ? 'Alcista ▲' : 'Bajista ▼'],
      ['Drawdown vs máximo', pct(drawdown)],
      ['VIX', fN(vix) + (vix > cfg.vixPanic ? ' — PÁNICO' : vix < cfg.vixEuph ? ' — euforia' : ' — normal')],
      ['VSTOXX', hasVstoxx ? fN(vstoxx) + (vstoxx > cfg.vstPanic ? ' — PÁNICO' : vstoxx < cfg.vstEuph ? ' — euforia' : ' — normal') : 'No aportado'],
    ].map(([k, v]) => `<div class="kv"><span class="kv-k">${k}</span><span class="kv-v">${v}</span></div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">Operación del mes</div>
    ${[
      ['DCA base', eur(cfg.dcaBase)],
      ['Multiplicador activo', '× ' + mult],
      ['Inversión calculada', eur(result.invCalc)],
      ['Racionamiento', rationTier > 0 ? 'Sí — nivel ' + rationTier : 'No aplica'],
      ['Inversión final', eur(invFinal)],
      ['De flujo de caja', eur(cfg.dcaBase)],
      ['De reserva táctica', eur(excesoFinal)],
      ...(coverMonths != null ? [['Cobertura reserva (Niv. 3)', fN(coverMonths, 1) + ' meses']] : []),
    ].map(([k, v]) => `<div class="kv"><span class="kv-k">${k}</span><span class="kv-v">${v}</span></div>`).join('')}
  </div>
</div>

${hasCartera ? `
<div class="section">
  <div class="section-title">Cartera tras la operación</div>
  <div class="grid3">
    <div>
      ${[
        ['NAV del fondo', eur(navEur)],
        ['Capital previo', eur(capital)],
        ['Participaciones previas', f4(parts)],
      ].map(([k, v]) => `<div class="kv"><span class="kv-k">${k}</span><span class="kv-v">${v}</span></div>`).join('')}
    </div>
    <div>
      ${[
        ['Nuevas participaciones', f4(newParts)],
        ['Total participaciones', f4(totalParts)],
        ['Capital total', eur(capital + invFinal)],
      ].map(([k, v]) => `<div class="kv"><span class="kv-k">${k}</span><span class="kv-v">${v}</span></div>`).join('')}
    </div>
    <div>
      ${[
        ['Break-Even', isFirst ? eur(breakEven) + ' (= NAV)' : eur(breakEven)],
        ['NAV actual', eur(navEur)],
        ['% Recuperación necesaria', pctRec != null ? pct(pctRec) : isFirst ? 'N/A — 1ª aportación' : '✓ NAV > Break-Even'],
      ].map(([k, v]) => `<div class="kv"><span class="kv-k">${k}</span><span class="kv-v">${v}</span></div>`).join('')}
    </div>
  </div>
</div>` : ''}

<div class="section">
  <div class="section-title">Matriz de niveles</div>
  <table>
    <thead>
      <tr><th>Nivel</th><th>Condición de activación</th><th>Multiplicador</th><th>Inversión</th><th>Estado</th></tr>
    </thead>
    <tbody>
      ${[
        { lbl: '3+ Crash',   active: levels.n3p, lvl: '3+',  mult: cfg.multN3p, cond: 'Pánico VIX/VSTOXX + DD severo + Tendencia bajista' },
        { lbl: '3 Pleno',    active: levels.n3,  lvl: '3',   mult: cfg.multN3,  cond: 'Pánico VIX/VSTOXX + DD moderado + Tendencia bajista' },
        { lbl: '2 Refuerzo', active: levels.n2,  lvl: '2',   mult: cfg.multN2,  cond: 'Señal de pánico/DD + Tendencia bajista' },
        { lbl: '0-1 Base',   active: levels.n01, lvl: '0-1', mult: cfg.multN01, cond: 'Sin señales de alerta — mercado normal' },
        { lbl: '-1 Euforia', active: levels.nm1, lvl: '-1',  mult: cfg.multN1i, cond: 'VIX/VSTOXX en euforia + DD cerca de máximos' },
      ].map(row => {
        const rm = LM[row.lvl] || LM['0-1']
        return `<tr class="${row.active ? 'active' : ''}">
          <td style="font-weight:${row.active ? 700 : 400};color:${row.active ? rm.color : 'inherit'}">${row.active ? '▶ ' : ''}${row.lbl}</td>
          <td style="color:#6e6e73">${row.cond}</td>
          <td>× ${row.mult}</td>
          <td>${eur(cfg.dcaBase * row.mult)}</td>
          <td>${row.active ? '<strong style="color:' + rm.color + '">ACTIVO</strong>' : '—'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
</div>

<div class="footer">
  <strong>DCA Radar</strong>${activo ? ' · ' + activo : ''}<br>
  Herramienta de cálculo personal. No constituye asesoramiento financiero ni recomendación de inversión.<br>
  La inversión en fondos implica riesgo de pérdida de capital. Verifique siempre con su bróker antes de operar.
</div>

<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Permite ventanas emergentes para exportar el PDF.'); return }
  w.document.write(html)
  w.document.close()
}

// ── Copy to Sheets ────────────────────────────────────────────────────────────
function copySheets(result, mktRaw, portRaw, cfg) {
  const { level, invFinal, excesoFinal, reservaPost, hasCartera,
    newParts, totalParts, breakEven, pctRec, dcaPure } = result
  const { drawdown, vix, vstoxx, hasVstoxx } = mktRaw
  const { navEur } = portRaw
  const meta = LM[level] || LM['0-1']

  const cols = [
    todayStr(),
    level + ' — ' + meta.label,
    cfg.activo || 'URTH',
    navEur > 0 ? fN(navEur) : '',
    fN(invFinal),
    fN(cfg.dcaBase),
    fN(excesoFinal),
    reservaPost != null ? fN(reservaPost) : '',
    hasCartera ? f4(newParts) : '',
    hasCartera ? f4(totalParts) : '',
    hasCartera ? fN(breakEven) : '',
    pct(drawdown),
    fN(vix),
    hasVstoxx ? fN(vstoxx) : '',
    hasCartera && pctRec != null ? pct(pctRec) : '',
  ]

  const header = 'Fecha\tNivel\tActivo\tNAV\tInversión\tNómina\tReserva usada\tReserva post\tPart.nuevas\tPart.total\tBreak-Even\tDrawdown\tVIX\tVSTOXX\t%Recuperación'

  navigator.clipboard.writeText(cols.join('\t'))
    .then(() => alert('✓ Fila copiada al portapapeles.\n\nPégala en Google Sheets con Ctrl+V.\n\nCabeceras para la primera fila:\n' + header))
    .catch(() => alert('No se pudo copiar. Comprueba los permisos del navegador.'))
}

// ── Main App ──────────────────────────────────────────────────────────────────
function Card({ children, cardBg, cardBorder, style: sx = {} }) {
  return (
    <div style={{ background: cardBg, border: '1px solid ' + cardBorder, borderRadius: 14, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...sx }}>
      {children}
    </div>
  )
}

function SectionTitle({ text, color }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>{text}</div>
}
export default function App() {
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches || false)
  const [tab, setTab]   = useState('auditoria')
  const [cfg, setCfg]   = useState(DEF_CFG)

  // Market
  const [mkt, setMkt]   = useState({ urthPrice: '', sma200: '', drawdown: '', vix: '', vstoxx: '' })
  const [fs, setFs]     = useState('idle')
  const [ferr, setFerr] = useState('')
  const [fetchDate, setFetchDate] = useState('')

  // Portfolio
  const [navEur,  setNavEur]  = useState('')
  const [reserva, setReserva] = useState('')
  const [capital, setCapital] = useState('')
  const [parts,   setParts_]  = useState('')

  const [copied, setCopied] = useState(false)

  const updCfg = (k, v) => setCfg(c => {
    const next = { ...c, [k]: typeof v === 'string' ? v : pf(v) }
    // If multiplier changed, switch to custom profile
    if (['multN3p','multN3','multN2','multN01','multN1i','multN1r'].includes(k)) {
      next.profile = 'personalizado'
    }
    return next
  })

  const applyProfile = (id) => {
    const p = PROFILES[id]
    if (!p) return
    setCfg(c => ({ ...c, profile: id, ...p }))
  }

  // Auto-fetch
  const doFetch = useCallback(async () => {
    setFs('loading'); setFerr('')
    try {
      const r = await fetch('/api/market')
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setMkt(m => ({
        urthPrice: String(Math.round(d.urthPrice * 100) / 100),
        sma200:    String(Math.round(d.sma200    * 100) / 100),
        drawdown:  String(Math.round(d.drawdown  * 100) / 100),
        vix:       String(Math.round(d.vix       * 100) / 100),
        vstoxx:    d.vstoxx != null ? String(Math.round(d.vstoxx * 100) / 100) : m.vstoxx,
      }))
      setFetchDate(d.lastDate || todayStr())
      setFs('ok')
    } catch (e) { setFs('error'); setFerr(e.message) }
  }, [])

  // Derived
  const hasVstoxx   = mkt.vstoxx !== '' && pf(mkt.vstoxx) > 0
  const mktComplete = ['urthPrice','sma200','drawdown','vix'].every(k => mkt[k] !== '' && !isNaN(pf(mkt[k])))
  const hasReserva  = reserva !== '' && !isNaN(pf(reserva))

  const mktRaw = {
    urthPrice: pf(mkt.urthPrice), sma200: pf(mkt.sma200),
    drawdown:  pf(mkt.drawdown),  vix:    pf(mkt.vix),
    vstoxx:    pf(mkt.vstoxx),    hasVstoxx,
  }
  const portRaw = {
    reserva: pf(reserva), hasReserva,
    navEur:  pf(navEur),
    capital: capital !== '' ? pf(capital) : 0,
    parts:   parts   !== '' ? pf(parts)   : 0,
  }

  const result = mktComplete ? calc(mktRaw, portRaw, cfg) : null

  // Theme colors
  const T = {
    pageBg:   dark ? '#1c1c1e' : '#f2f2f7',
    hdrBg:    dark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
    hdrBorder:dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    cardBg:   dark ? '#2c2c2e' : 'white',
    cardBorder:dark ? '#3a3a3c' : '#e5e5ea',
    text:     dark ? '#f5f5f7' : '#1d1d1f',
    textSub:  dark ? '#8e8e93' : '#6e6e73',
    tabBg:    dark ? '#3a3a3c' : '#f2f2f7',
    tabActive: dark ? '#48484a' : 'white',
  }

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
      background: tab === id ? T.tabActive : 'transparent',
      color: tab === id ? T.text : T.textSub,
      boxShadow: tab === id ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
      transition: 'all 0.15s',
    }}>{label}</button>
  )

  const sectionTitle = (t) => <SectionTitle text={t} color={T.textSub} />
  const cardProps = { cardBg: T.cardBg, cardBorder: T.cardBorder }

  return (
    <div style={{ minHeight: '100vh', background: T.pageBg, color: T.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif", fontSize: 14 }}>
      <style>{`
        *{box-sizing:border-box}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        details summary{list-style:none;cursor:pointer}
        details summary::-webkit-details-marker{display:none}
        @media(max-width:680px){
          .two-col{grid-template-columns:1fr!important}
          .mobile-dock{display:flex!important}
          .hdr-actions{display:none!important}
          .hdr-row{flex-wrap:nowrap!important;gap:6px!important}
          .main-content{padding-bottom:80px!important}
        }
        @media(min-width:681px){
          .mobile-dock{display:none!important}
        }
      `}</style>

      {/* HEADER */}
      <div style={{ background: T.hdrBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid ' + T.hdrBorder, padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Left: title + badge debajo */}
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>DCA Radar</div>
            <div style={{ fontSize: 11, color: T.textSub, marginTop: 2 }}>Auditoría táctica mensual</div>
          </div>
          {/* Right: siempre visible — acciones + dark + tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {result && (
              <div className="hdr-actions" style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { copySheets(result, mktRaw, portRaw, cfg); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ background: copied ? (dark ? '#0f1f13' : '#f0fdf4') : T.cardBg, border: '1px solid ' + (copied ? '#16a34a' : T.cardBorder), color: copied ? '#22c55e' : T.text, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? '✓' : '⊞'} Sheets
                </button>
                <button onClick={() => generatePDF(result, mktRaw, portRaw, cfg, fetchDate, dark)}
                  style={{ background: T.text, color: T.pageBg, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↓ PDF
                </button>
              </div>
            )}
            <button onClick={() => setDark(d => !d)} style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 8, padding: '6px 10px', fontSize: 14, cursor: 'pointer', color: T.text }}>
              {dark ? '☀️' : '🌙'}
            </button>
            <div style={{ display: 'flex', gap: 3, background: T.tabBg, borderRadius: 10, padding: 3 }}>
              {tabBtn('auditoria', 'Auditoría')}
              {tabBtn('config', '⚙ Config')}
            </div>
          </div>
        </div>
      </div>

      <div className="main-content" style={{ maxWidth: 1060, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── AUDITORÍA ── */}
        {tab === 'auditoria' && (
          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,420px) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Market card */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mercado</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {fs === 'ok' && fetchDate && <span style={{ fontSize: 11, color: T.textSub }}>a {fetchDate}</span>}
                    <button onClick={doFetch} disabled={fs === 'loading'} style={{
                      background: fs === 'ok' ? (dark ? '#0f1f13' : '#f0fdf4') : T.text,
                      border: '1px solid ' + (fs === 'ok' ? '#16a34a' : 'transparent'),
                      color: fs === 'ok' ? '#22c55e' : T.pageBg,
                      borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                      cursor: fs === 'loading' ? 'wait' : 'pointer', fontFamily: 'inherit',
                    }}>
                      {fs === 'loading' ? '⟳' : fs === 'ok' ? '✓ Refrescar' : '⟳ Fetch'}
                    </button>
                  </div>
                </div>
                {fs === 'error' && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8, padding: '0 4px' }}>Error: {ferr}</div>}
                <Card {...cardProps} style={{ padding: '0 16px' }}>
                  {[
                    { label: 'URTH Precio', value: mkt.urthPrice, onChange: v => setMkt(m => ({ ...m, urthPrice: v })), unit: '$', step: 0.5 },
                    { label: 'SMA 200', value: mkt.sma200, onChange: v => setMkt(m => ({ ...m, sma200: v })), unit: '$', step: 0.5 },
                    { label: 'Drawdown', value: mkt.drawdown, onChange: v => setMkt(m => ({ ...m, drawdown: v })), unit: '%', step: 0.1, hint: 'Negativo, ej: −1.3' },
                    { label: 'VIX', value: mkt.vix, onChange: v => setMkt(m => ({ ...m, vix: v })), step: 0.1, hint: 'cboe.com' },
                    { label: 'VSTOXX', value: mkt.vstoxx, onChange: v => setMkt(m => ({ ...m, vstoxx: v })), step: 0.1, hint: 'optional', optional: true },
                  ].map((f, i, arr) => (
                    <div key={f.label} style={{ borderBottom: i < arr.length - 1 ? '1px solid ' + T.cardBorder : 'none' }}>
                      <NumInput dark={dark} {...f} />
                    </div>
                  ))}
                  {mkt.urthPrice && mkt.sma200 && (
                    <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid ' + T.cardBorder }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: pf(mkt.urthPrice) > pf(mkt.sma200) ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: pf(mkt.urthPrice) > pf(mkt.sma200) ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                        {pf(mkt.urthPrice) > pf(mkt.sma200) ? 'Tendencia alcista' : 'Tendencia bajista'}
                      </span>
                    </div>
                  )}
                </Card>
              </div>

              {/* Portfolio card */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px', marginBottom: 6 }}>Cartera</div>
                <Card {...cardProps} style={{ padding: '0 16px' }}>
                  {[
                    { label: 'Reserva táctica', value: reserva, onChange: setReserva, unit: '€', step: 100, hint: 'Objetivo: ' + eur(cfg.dcaBase * cfg.multReserva) },
                    { label: 'NAV del fondo', value: navEur, onChange: setNavEur, unit: '€', step: 0.1, hint: 'Precio de una participación', optional: true },
                    { label: 'Capital invertido', value: capital, onChange: setCapital, unit: '€', step: 100, optional: true },
                    { label: 'Participaciones', value: parts, onChange: setParts_, step: 0.1, optional: true },
                  ].map((f, i, arr) => (
                    <div key={f.label} style={{ borderBottom: i < arr.length - 1 ? '1px solid ' + T.cardBorder : 'none' }}>
                      <NumInput dark={dark} {...f} />
                    </div>
                  ))}
                </Card>
              </div>

              {/* Sources */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 4px' }}>
                {[
                  { l: 'URTH + VIX', url: 'https://finance.yahoo.com/quote/URTH/', filled: fs === 'ok' },
                  { l: 'VSTOXX', url: 'https://live.deutsche-boerse.com/indices/euro-stoxx-50-volatility-vstoxx', filled: hasVstoxx },
                ].map(s => {
                  const ok = s.filled
                  return (
                    <a key={s.l} href={s.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ok ? (dark ? '#0f1f13' : '#f0fdf4') : T.cardBg, border: '1px solid ' + (ok ? '#16a34a' : T.cardBorder), borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: ok ? '#22c55e' : T.textSub, textDecoration: 'none' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? '#22c55e' : T.textSub, flexShrink: 0 }} />
                      {s.l} ↗
                    </a>
                  )
                })}
                <span style={{ fontSize: 12, color: T.textSub, alignSelf: 'center' }}>NAV: consulta tu bróker</span>
              </div>
            </div>

            {/* RIGHT — Verdict */}
            <VerdictPanel result={result} cfg={cfg} mktRaw={mktRaw} dark={dark} />
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab === 'config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>

            {/* Activo + DCA */}
            <Card {...cardProps}>
              {sectionTitle('General')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>Nombre del activo (para PDF)</label>
                  <input value={cfg.activo} onChange={e => updCfg('activo', e.target.value)} placeholder="Ej: Vanguard Global Stock EUR Acc / IWDA / VWCE"
                    style={{ width: '100%', background: dark ? '#3a3a3c' : 'white', border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: T.text, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid ' + T.cardBorder }}>
                  {[
                    { label: 'DCA Base mensual',     value: cfg.dcaBase,     onChange: v => updCfg('dcaBase', v),     unit: '€', step: 50,  hint: 'Actualizar cada enero por IPC' },
                    { label: 'Multiplicador reserva', value: cfg.multReserva, onChange: v => updCfg('multReserva', v), step: 1,   hint: 'Objetivo: ' + eur(cfg.dcaBase * cfg.multReserva) },
                    { label: 'Alerta reserva %',      value: cfg.rationWarn,  onChange: v => updCfg('rationWarn', v),  step: 5,   hint: 'Aviso temprano' },
                    { label: 'Freno reserva %',       value: cfg.rationBrake, onChange: v => updCfg('rationBrake', v), step: 5,   hint: 'Activa racionamiento ÷2' },
                  ].map((f, i, arr) => (
                    <div key={f.label} style={{ padding: '0 16px', background: T.cardBg, borderBottom: i < arr.length - 1 ? '1px solid ' + T.cardBorder : 'none' }}>
                      <NumInput dark={dark} {...f} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Profiles */}
            <Card {...cardProps}>
              {sectionTitle('Perfil de multiplicadores')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                {Object.entries(PROFILES).map(([id, p]) => (
                  <button key={id} onClick={() => applyProfile(id)} style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    border: '2px solid ' + (cfg.profile === id ? (id === 'conservador' ? '#22c55e' : id === 'moderado' ? '#3b82f6' : id === 'agresivo' ? '#ef4444' : T.cardBorder) : T.cardBorder),
                    background: cfg.profile === id ? (dark ? '#1c2a3a' : '#f0f6ff') : T.cardBg,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.4 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ background: T.pageBg, borderRadius: 16, overflow: 'hidden', border: '1px solid ' + T.cardBorder }}>
                {[
                  { l: 'Nivel 3+ Crash ×',  k: 'multN3p', c: '#ef4444' },
                  { l: 'Nivel 3 Pleno ×',   k: 'multN3',  c: '#f97316' },
                  { l: 'Nivel 2 Refuerzo ×',k: 'multN2',  c: '#eab308' },
                  { l: 'Nivel 0-1 Base ×',  k: 'multN01', c: '#22c55e' },
                  { l: 'Nivel -1 Inv. ×',   k: 'multN1i', c: '#3b82f6' },
                  { l: 'Nivel -1 Res. ×',   k: 'multN1r', c: '#8b5cf6' },
                ].map(({ l, k, c }, i, arr) => (
                  <div key={k} style={{ padding: '0 16px', background: T.cardBg, borderBottom: i < arr.length - 1 ? '1px solid ' + T.cardBorder : 'none' }}>
                    <NumInput dark={dark} label={l} value={cfg[k]} onChange={v => updCfg(k, v)} step={0.5} hint={'= ' + eur(cfg.dcaBase * cfg[k])} accent={c} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Thresholds */}
            <Card {...cardProps}>
              {sectionTitle('Umbrales de señal')}
              <div style={{ fontSize: 12, color: T.textSub, marginBottom: 12, lineHeight: 1.5 }}>
                Valores validados históricamente. Modifica solo si tienes una razón clara.
              </div>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid ' + T.cardBorder }}>
                {[
                  { l: 'Pánico VIX >',     k: 'vixPanic', s: 1 },
                  { l: 'Euforia VIX <',    k: 'vixEuph',  s: 1 },
                  { l: 'Pánico VSTOXX >',  k: 'vstPanic', s: 1 },
                  { l: 'Euforia VSTOXX <', k: 'vstEuph',  s: 1 },
                  { l: 'DD Moderado < %',  k: 'ddMod',    s: 1, hint: 'ej: −10' },
                  { l: 'DD Severo < %',    k: 'ddSev',    s: 1, hint: 'ej: −20' },
                  { l: 'Euforia DD >= %',  k: 'ddEuph',   s: 0.1, hint: 'ej: −0.5' },
                ].map(({ l, k, s, hint: h }, i, arr) => (
                  <div key={k} style={{ padding: '0 16px', background: T.cardBg, borderBottom: i < arr.length - 1 ? '1px solid ' + T.cardBorder : 'none' }}>
                    <NumInput dark={dark} label={l} value={cfg[k]} onChange={v => updCfg(k, v)} step={s} hint={h} />
                  </div>
                ))}
              </div>
            </Card>

            <button onClick={() => setCfg(DEF_CFG)} style={{ background: 'transparent', border: '1px solid ' + T.cardBorder, color: T.textSub, padding: '8px 18px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, alignSelf: 'flex-start' }}>
              Restaurar valores por defecto
            </button>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: dark ? '#48484a' : '#aeaeb2', lineHeight: 1.5 }}>
            Uso personal · No asesoramiento financiero · La inversión conlleva riesgo de pérdida de capital
          </div>
        </div>
      </div>

      {/* MOBILE DOCK */}
      {result && (() => {
        const meta = LM[result.level] || LM['0-1']
        return (
          <div className="mobile-dock" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: dark ? meta.bgD : meta.bg, borderTop: '2px solid ' + (dark ? meta.borderD : meta.border), padding: '10px 16px', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 200 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.textSub, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Nivel · Invertir</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: meta.color }}>{result.level} · {eur(result.invFinal)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { copySheets(result, mktRaw, portRaw, cfg); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                style={{ background: copied ? '#16a34a' : T.cardBg, border: '1px solid ' + T.cardBorder, color: copied ? 'white' : T.text, borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {copied ? '✓' : '⊞'}
              </button>
              <button onClick={() => generatePDF(result, mktRaw, portRaw, cfg, fetchDate, dark)}
                style={{ background: T.text, color: T.pageBg, border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                PDF
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
