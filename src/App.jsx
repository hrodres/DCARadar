import { useState, useCallback } from 'react'
import { pf, fN, eur, usd, pct, f4, todayStr, escHtml, LM, PROFILES, DEF_CFG, calc } from './utils.js'
import NumInput from './components/NumInput.jsx'
import VerdictPanel from './components/VerdictPanel.jsx'

// ── PDF ───────────────────────────────────────────────────────────────────────

async function generatePDF(result, mktRaw, portRaw, cfg, fetchDate, dark) {
  const { level, invFinal, excesoFinal, rationTier, reservaPost, objReserva,
    hasCartera, breakEven, pctRec, totalParts, newParts, isFirst,
    coverMonths, mult, protocoloActivo, conds, levels } = result
  const { urthPrice, sma200, drawdown, vix, vstoxx, hasVstoxx } = mktRaw
  const { reserva, hasReserva, navEur, capital, parts } = portRaw
  const meta = LM[level] || LM['0-1']
  const date = todayStr()
  const activo = escHtml(cfg.activo || 'URTH — MSCI World')
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const pdfTitle = `DCARadar_Informe_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`

  const kv = (k, v, bold) => `<div class="kv"><span class="kv-k">${k}</span><span class="kv-v"${bold ? ' style="font-size:12px"' : ''}>${v}</span></div>`

  const sigRows = [
    { l: 'VIX',      val: fN(vix),           ctx: `pánico >${cfg.vixPanic} · euforia <${cfg.vixEuph}`, ok: !conds.cVixP, neu: false, st: conds.cVixP ? 'Pánico' : 'Normal' },
    { l: 'VSTOXX',   val: hasVstoxx ? fN(vstoxx) : '—', ctx: hasVstoxx ? `pánico >${cfg.vstPanic} · euforia <${cfg.vstEuph}` : 'No introducido', ok: !conds.cVstP, neu: !hasVstoxx, st: conds.cVstP ? 'Pánico' : hasVstoxx ? 'Normal' : 'N/A' },
    { l: 'Drawdown', val: pct(drawdown),      ctx: `moderado <${cfg.ddMod}% · severo <${cfg.ddSev}%`, ok: !conds.cDDm, neu: false, st: conds.cDDs ? 'Severo' : conds.cDDm ? 'Moderado' : 'Normal' },
    { l: 'Tendencia',val: `${usd(urthPrice)} vs SMA200 ${usd(sma200)}`, ctx: '', ok: !conds.cBear, neu: false, st: conds.cBear ? 'Bajista ▼' : 'Alcista ▲' },
    { l: 'Reserva',  val: hasReserva ? `${eur(reserva)} · obj ${eur(objReserva)}` : '—', ctx: `${cfg.multReserva}× DCA base`, ok: result.reservaCompleta, neu: !hasReserva, st: result.reservaCompleta ? 'Completa' : hasReserva ? 'Incompleta' : 'N/A' },
  ]

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${pdfTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1d1d1f; font-size: 10px; line-height: 1.45; background: white; }

  .hdr { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1d1d1f; padding-bottom: 9px; margin-bottom: 12px; }
  .hdr-title { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
  .hdr-sub { font-size: 9.5px; color: #6e6e73; margin-top: 2px; }
  .hdr-right { text-align: right; font-size: 9.5px; color: #6e6e73; }
  .level-badge { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; background: ${meta.bg}; border: 1px solid ${meta.border}; color: ${meta.color}; }

  .verdict { background: ${meta.bg}; border: 1.5px solid ${meta.border}; border-radius: 7px; padding: 11px 16px; margin-bottom: 10px; }
  .verdict-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .vl { font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #6e6e73; margin-bottom: 2px; }
  .vv { font-size: 15px; font-weight: 700; white-space: nowrap; }

  .alert { border-radius: 5px; padding: 5px 10px; font-size: 9.5px; font-weight: 500; margin-bottom: 7px; }
  .alert-crit { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
  .alert-warn { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; }
  .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

  .cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
  .cols3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .sec { margin-bottom: 12px; }
  .sec-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6e6e73; border-bottom: 1px solid #e5e5ea; padding-bottom: 3px; margin-bottom: 6px; }

  .kv { display: flex; justify-content: space-between; align-items: baseline; padding: 3px 0; border-bottom: 1px solid #f5f5f7; gap: 6px; }
  .kv-k { color: #6e6e73; flex-shrink: 0; }
  .kv-v { font-weight: 600; white-space: nowrap; }

  .sig { display: grid; grid-template-columns: 60px 1fr auto; gap: 6px; align-items: baseline; padding: 3px 0; border-bottom: 1px solid #f5f5f7; }
  .sig-l { font-weight: 600; }
  .sig-ctx { color: #aeaeb2; font-size: 8.5px; }
  .sig-st { font-weight: 600; font-size: 9px; white-space: nowrap; }
  .ok  { color: #15803d; }
  .bad { color: #dc2626; }
  .neu { color: #6e6e73; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  th { text-align: left; padding: 4px 6px; background: #f5f5f7; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6e6e73; }
  td { padding: 4px 6px; border-bottom: 1px solid #f5f5f7; }
  tr.act td { background: ${meta.bg}; font-weight: 700; color: ${meta.color}; }

  .footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e5e5ea; font-size: 8.5px; color: #aeaeb2; }
</style>
</head>
<body>

<div class="hdr">
  <div>
    <div class="hdr-title">DCA Radar</div>
    <div class="hdr-sub">Auditoría táctica mensual · ${activo}</div>
  </div>
  <div class="hdr-right">
    <div>${date}${fetchDate ? ' · Mercado: ' + fetchDate : ''}</div>
    <div class="level-badge">${level} — ${meta.label}</div>
  </div>
</div>

<div class="verdict">
  <div class="verdict-grid">
    <div><div class="vl">Invertir este mes</div><div class="vv" style="color:#1d1d1f">${eur(invFinal)}</div></div>
    <div><div class="vl">De flujo de caja</div><div class="vv" style="color:#16a34a">${eur(cfg.dcaBase)}</div></div>
    <div><div class="vl">De reserva táctica</div><div class="vv" style="color:${excesoFinal > 0 ? '#ea580c' : '#6e6e73'}">${eur(excesoFinal)}</div></div>
    ${reservaPost != null ? `<div><div class="vl">Reserva tras operación</div><div class="vv" style="color:${reservaPost < objReserva * 0.25 ? '#dc2626' : reservaPost < objReserva * 0.5 ? '#ca8a04' : '#16a34a'}">${eur(reservaPost)}</div></div>` : ''}
  </div>
</div>

${rationTier === 3 ? '<div class="alert alert-crit">🔴 Racionamiento crítico — reserva insuficiente para el exceso. Inviertes solo el DCA base.</div>' : ''}
${rationTier === 2 ? '<div class="alert alert-warn">⚠ Racionamiento activo — reserva baja. Exceso reducido a la mitad, DCA base garantizado.</div>' : ''}
${result.rationAlert && rationTier === 0 ? '<div class="alert alert-info">Reserva por debajo del ' + cfg.rationWarn + '% del objetivo. Sin racionamiento aún.</div>' : ''}
${!protocoloActivo ? '<div class="alert alert-info">Reserva no aportada — protocolo inactivo. Aplicando DCA base.</div>' : ''}
${level === '-1' && !result.cResInc ? '<div class="alert alert-info">Mercado en euforia — reserva completa. Continúa con el DCA base.</div>' : ''}
${level === '-1' && result.cResInc ? '<div class="alert alert-info">Nivel -1 + Reserva incompleta: ' + eur(invFinal) + ' a inversión + ' + eur(result.invRes) + ' a reserva.</div>' : ''}

<div class="cols2">
  <div class="sec">
    <div class="sec-title">Señales de mercado</div>
    ${sigRows.map(({ l, val, ctx, ok, neu, st }) => `
      <div class="sig">
        <span class="sig-l">${l}</span>
        <span class="sig-ctx">${val}${ctx ? ' · ' + ctx : ''}</span>
        <span class="sig-st ${neu ? 'neu' : ok ? 'ok' : 'bad'}">${neu ? '○' : ok ? '✓' : '✗'} ${st}</span>
      </div>`).join('')}
  </div>

  <div class="sec">
    <div class="sec-title">Operación del mes</div>
    ${kv('DCA base mensual', eur(cfg.dcaBase))}
    ${kv('Multiplicador nivel ' + level, '× ' + mult)}
    ${rationTier > 0 ? kv('Racionamiento', 'Nivel ' + rationTier) : ''}
    ${kv('Inversión final', eur(invFinal), true)}
    ${kv('De flujo de caja', eur(cfg.dcaBase))}
    ${kv('De reserva táctica', eur(excesoFinal))}
    ${coverMonths != null ? kv('Cobertura reserva (Niv.3)', fN(coverMonths, 1) + ' meses') : ''}
  </div>
</div>

<div class="sec">
  <div class="sec-title">Matriz de niveles</div>
  <table>
    <thead><tr><th>Nivel</th><th>Condición</th><th>Mult</th><th>Inversión</th><th>Umbrales activos</th></tr></thead>
    <tbody>
      ${[
        { lbl: '3+ Crash',   active: levels.n3p, lvl: '3+',  m: cfg.multN3p, cond: 'VIX/VSTOXX pánico + DD severo + bajista',   thr: `VIX>${cfg.vixPanic} · DD<${cfg.ddSev}%` },
        { lbl: '3 Pleno',    active: levels.n3,  lvl: '3',   m: cfg.multN3,  cond: 'VIX/VSTOXX pánico + DD moderado + bajista', thr: `VIX>${cfg.vixPanic} · DD<${cfg.ddMod}%` },
        { lbl: '2 Refuerzo', active: levels.n2,  lvl: '2',   m: cfg.multN2,  cond: 'Señal pánico o DD moderado + bajista',      thr: `VIX>${cfg.vixPanic} o DD<${cfg.ddMod}%` },
        { lbl: '0-1 Base',   active: levels.n01, lvl: '0-1', m: cfg.multN01, cond: 'Sin señales de alerta',                     thr: '—' },
        { lbl: '-1 Euforia', active: levels.nm1, lvl: '-1',  m: cfg.multN1i, cond: 'VIX/VSTOXX euforia + DD cerca de máximos', thr: `VIX<${cfg.vixEuph} · DD>${cfg.ddEuph}%` },
      ].map(row => {
        const rm = LM[row.lvl] || LM['0-1']
        return `<tr class="${row.active ? 'act' : ''}">
          <td>${row.active ? '▶ ' : ''}${row.lbl}</td>
          <td style="color:#6e6e73">${row.cond}</td>
          <td>× ${row.m}</td>
          <td>${eur(cfg.dcaBase * row.m)}</td>
          <td style="color:#aeaeb2;font-size:8.5px">${row.thr}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
</div>

${hasCartera ? `
<div class="sec">
  <div class="sec-title">Cartera tras la operación</div>
  <div class="cols3">
    <div>
      ${kv('NAV del fondo', eur(navEur))}
      ${kv('Capital previo', eur(capital))}
      ${kv('Participaciones previas', f4(parts))}
    </div>
    <div>
      ${kv('Nuevas participaciones', f4(newParts))}
      ${kv('Total participaciones', f4(totalParts))}
      ${kv('Capital total', eur(capital + invFinal))}
    </div>
    <div>
      ${kv('Break-Even', isFirst ? eur(breakEven) + ' (= NAV)' : eur(breakEven))}
      ${kv('NAV actual', eur(navEur))}
      ${kv('Recuperación necesaria', pctRec != null ? pct(pctRec) : isFirst ? 'N/A — 1ª aportación' : '✓ En positivo')}
    </div>
  </div>
</div>` : ''}

<div class="footer">DCA Radar · Herramienta de cálculo personal · No constituye asesoramiento financiero · La inversión conlleva riesgo de pérdida de capital</div>`

  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)

  const { default: html2pdf } = await import('html2pdf.js')
  await html2pdf().set({
    margin:      [15, 20],
    filename:    pdfTitle + '.pdf',
    html2canvas: { scale: 2, useCORS: true },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).from(container).save()
  document.body.removeChild(container)
}

// ── Copy to Sheets ────────────────────────────────────────────────────────────
function copySheets(result, mktRaw, portRaw, cfg) {
  const { level, invFinal, excesoFinal, reservaPost, hasCartera,
    newParts, totalParts, breakEven, pctRec, mult, rationTier } = result
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
    '×' + mult,
    rationTier > 0 ? 'Nivel ' + rationTier : '',
  ]

  const header = 'Fecha\tNivel\tActivo\tNAV\tInversión\tNómina\tReserva usada\tReserva post\tPart.nuevas\tPart.total\tBreak-Even\tDrawdown\tVIX\tVSTOXX\t%Recuperación\tMultiplicador\tRacionamiento'

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
    if (['multN3p','multN3','multN2','multN01','multN1i'].includes(k)) {
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
                      {fs === 'loading' ? '⟳' : '⟳ Actualizar'}
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
                    { label: 'Reserva táctica', value: reserva, onChange: setReserva, unit: '€', step: 100, hint: 'Objetivo: ' + eur(cfg.dcaBase * cfg.multReserva) + ' · Mantener en fondo monetario' },
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
                  { l: 'Nivel -1 Euforia ×', k: 'multN1i', c: '#3b82f6' },
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
