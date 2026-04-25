import { LM, eur, pct, fN, f4 } from '../utils.js'

export default function VerdictPanel({ result, cfg, mktRaw, dark }) {
  if (!result) {
    const cardBg  = dark ? '#2c2c2e' : 'white'
    const border  = dark ? '#3a3a3c' : '#e5e5ea'
    const textSub = dark ? '#8e8e93' : '#6e6e73'
    const steps = [
      { n: '1', label: 'Pulsa', detail: '⟳ Fetch para cargar URTH, SMA200, Drawdown y VIX automáticamente' },
      { n: '2', label: 'Introduce', detail: 'VSTOXX manualmente si lo tienes (opcional)' },
      { n: '3', label: 'Añade', detail: 'tu reserva táctica para activar el protocolo completo' },
    ]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>📡</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: dark ? '#f5f5f7' : '#1d1d1f' }}>Sin datos aún</div>
              <div style={{ fontSize: 13, color: textSub, marginTop: 2 }}>El veredicto aparecerá aquí al instante</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: dark ? '#3a3a3c' : '#f2f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: textSub, flexShrink: 0 }}>{s.n}</div>
                <div style={{ paddingTop: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: dark ? '#f5f5f7' : '#1d1d1f' }}>{s.label} </span>
                  <span style={{ fontSize: 14, color: textSub }}>{s.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { level, invFinal, excesoFinal, rationTier, rationAlert, reservaPost,
    objReserva, protocoloActivo, cResInc, hasCartera, breakEven, pctRec,
    totalParts, newParts, isFirst, coverMonths, conds, levels, invRes } = result
  const meta = LM[level] || LM['0-1']
  const { hasVstoxx } = mktRaw

  const bg      = dark ? meta.bgD     : meta.bg
  const bord    = dark ? meta.borderD : meta.border
  const cardBg  = dark ? '#2c2c2e' : 'white'
  const cardBorder = dark ? '#3a3a3c' : '#e5e5ea'
  const textSub  = dark ? '#8e8e93' : '#6e6e73'
  const textMain = dark ? '#f5f5f7' : '#1d1d1f'

  const condItems = [
    { l: 'VIX',       ok: !conds.cVixP, detail: conds.cVixP ? 'Pánico' : 'Normal',   neu: false },
    { l: 'VSTOXX',    ok: !conds.cVstP, detail: conds.cVstP ? 'Pánico' : hasVstoxx ? 'Normal' : 'N/A', neu: !hasVstoxx },
    { l: 'Drawdown',  ok: !conds.cDDm,  detail: conds.cDDs ? 'Severo' : conds.cDDm ? 'Moderado' : 'Normal', neu: false },
    { l: 'Tendencia', ok: !conds.cBear, detail: conds.cBear ? 'Bajista' : 'Alcista',  neu: false },
    { l: 'Reserva',   ok: result.reservaCompleta, detail: result.reservaCompleta ? 'Completa' : cResInc ? 'Incompleta' : 'Sin datos', neu: !result.reservaPost },
  ]

  const alertStyle = (type) => ({
    background: type === 'crit' ? (dark ? '#2d1515' : '#fef2f2') : type === 'warn' ? (dark ? '#2d1a0a' : '#fff7ed') : (dark ? '#0f172a' : '#eff6ff'),
    border: '1px solid ' + (type === 'crit' ? (dark ? '#7f1d1d' : '#fecaca') : type === 'warn' ? (dark ? '#7c2d12' : '#fed7aa') : (dark ? '#1e3a5f' : '#bfdbfe')),
    color: type === 'crit' ? '#ef4444' : type === 'warn' ? '#f97316' : (dark ? '#60a5fa' : '#1d4ed8'),
    borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500, marginTop: 8,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: bg, border: '1.5px solid ' + bord, borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: textSub, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Nivel activo</div>
          {!protocoloActivo && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, background: dark ? '#292100' : '#fef9c3', border: '1px solid ' + (dark ? '#713f12' : '#fde68a'), color: '#ca8a04', borderRadius: 6, padding: '2px 8px' }}>Protocolo inactivo</span>}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: meta.color, letterSpacing: '-0.5px', marginBottom: 16 }}>
          {level} — {meta.label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { l: 'Invertir este mes', v: eur(invFinal), c: textMain, big: true },
            { l: 'De flujo de caja',  v: eur(cfg.dcaBase), c: '#22c55e' },
            { l: 'De reserva',        v: eur(excesoFinal), c: excesoFinal > 0 ? '#f97316' : textSub },
          ].map(({ l, v, c, big }) => (
            <div key={l}>
              <div style={{ fontSize: 10, fontWeight: 600, color: textSub, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: big ? 20 : 16, fontWeight: 700, color: c }}>{v}</div>
            </div>
          ))}
        </div>
        {reservaPost != null && (
          <div style={{ marginTop: 12, background: dark ? 'rgba(0,0,0,0.3)' : 'white', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: textSub }}>Reserva tras la operación</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: reservaPost < objReserva * 0.25 ? '#ef4444' : reservaPost < objReserva * 0.5 ? '#eab308' : '#22c55e' }}>
                {eur(reservaPost)}
              </span>
              {coverMonths != null && <span style={{ fontSize: 11, color: textSub, marginLeft: 8 }}>· {fN(coverMonths, 1)} meses cobertura Niv.3</span>}
            </div>
          </div>
        )}
        {rationTier === 3 && <div style={alertStyle('crit')}>🔴 Racionamiento crítico — la operación agotaría la reserva. Inversión reducida al mínimo.</div>}
        {rationTier === 2 && <div style={alertStyle('warn')}>⚠ Racionamiento activo — inversión ÷2 para proteger la reserva táctica.</div>}
        {rationAlert && rationTier === 0 && <div style={alertStyle('info')}>Reserva por debajo del {cfg.rationWarn}% del objetivo. Sin racionamiento aún.</div>}
        {level === '-1' && !cResInc && <div style={alertStyle('info')}>Mercado en euforia — inversión reducida. Momento de acumular reserva.</div>}
        {level === '-1' && cResInc && <div style={alertStyle('info')}>Nivel -1 + Reserva incompleta: {eur(invFinal)} a inversión + {eur(invRes)} a reserva.</div>}
        {!protocoloActivo && <div style={alertStyle('info')}>Reserva no aportada — introduce el saldo de tu reserva táctica.</div>}
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: textSub, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px', marginBottom: 6 }}>Señales de mercado</div>
        <div style={{ background: cardBg, border: '1px solid ' + cardBorder, borderRadius: 16, overflow: 'hidden' }}>
          {condItems.map(({ l, ok, detail, neu }, i, arr) => {
            const dot = neu ? '#8e8e93' : ok ? '#22c55e' : '#ef4444'
            const detailColor = neu ? textSub : ok ? '#22c55e' : '#ef4444'
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid ' + cardBorder : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 15, color: textMain }}>{l}</span>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: detailColor }}>{detail}</span>
              </div>
            )
          })}
        </div>
      </div>

      {hasCartera && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: textSub, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px', marginBottom: 6 }}>Tu cartera</div>
          {/* Métricas destacadas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[
              { l: 'Break-Even', v: isFirst ? eur(breakEven) : eur(breakEven), sub: 'precio medio ponderado' },
              { l: pctRec != null ? 'Recuperación necesaria' : 'Posición', v: pctRec != null ? pct(pctRec) : isFirst ? '1ª aportación' : 'En positivo', vc: pctRec != null ? '#eab308' : '#22c55e', sub: pctRec != null ? 'para alcanzar break-even' : '' },
            ].map(({ l, v, vc, sub }) => (
              <div key={l} style={{ background: cardBg, border: '1px solid ' + cardBorder, borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: textSub, marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: vc || textMain }}>{v}</div>
                {sub && <div style={{ fontSize: 11, color: textSub, marginTop: 2 }}>{sub}</div>}
              </div>
            ))}
          </div>
          {/* Filas iOS */}
          <div style={{ background: cardBg, border: '1px solid ' + cardBorder, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { l: 'Participaciones nuevas', v: f4(newParts) },
              { l: 'Total participaciones',  v: f4(totalParts) },
            ].map(({ l, v }, i, arr) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid ' + cardBorder : 'none' }}>
                <span style={{ fontSize: 15, color: textMain }}>{l}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: textSub }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
