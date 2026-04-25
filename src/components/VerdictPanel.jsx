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
        {!protocoloActivo && <div style={alertStyle('info')}>{cResInc ? 'Reserva incompleta — protocolo inactivo. Aplicando DCA base.' : 'Reserva no aportada — introduce el saldo de tu reserva táctica.'}</div>}
      </div>

      <div style={{ background: cardBg, border: '1px solid ' + cardBorder, borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: textSub, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Señales de mercado</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {condItems.map(({ l, ok, detail, neu }) => {
            const bg2 = neu ? (dark ? '#3a3a3c' : '#f3f4f6') : ok ? (dark ? '#0f1f13' : '#d1fae5') : (dark ? '#2d1515' : '#fee2e2')
            const col = neu ? textSub : ok ? '#22c55e' : '#ef4444'
            return (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, background: bg2, borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ fontSize: 12, color: col }}>{neu ? '○' : ok ? '✓' : '✗'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: col }}>{l}</span>
                <span style={{ fontSize: 11, color: textSub }}>{detail}</span>
              </div>
            )
          })}
        </div>
      </div>

      {hasCartera && (
        <div style={{ background: cardBg, border: '1px solid ' + cardBorder, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: textSub, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Tu cartera</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { l: 'Nuevas participaciones', v: f4(newParts) },
              { l: 'Total participaciones',  v: f4(totalParts) },
              { l: 'Break-Even',             v: isFirst ? eur(breakEven) + ' (= NAV)' : eur(breakEven) },
              { l: '% Recuperación', v: pctRec != null ? pct(pctRec) : isFirst ? 'N/A — 1ª aportación' : '✓ NAV > Break-Even', vc: pctRec != null ? '#eab308' : '#22c55e' },
            ].map(({ l, v, vc }) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid ' + cardBorder }}>
                <span style={{ fontSize: 12, color: textSub }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: vc || textMain }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <details>
        <summary style={{ fontSize: 12, color: textSub, cursor: 'pointer', padding: '4px 0', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          ▸ Matriz completa de niveles
        </summary>
        <div style={{ marginTop: 8, background: cardBg, border: '1px solid ' + cardBorder, borderRadius: 12, padding: '12px 14px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 380 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid ' + cardBorder }}>
                {['Nivel', 'Estado', '×', 'Inversión'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: textSub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { lbl: '3+ Crash',   active: levels.n3p, lvl: '3+',  mult: cfg.multN3p },
                { lbl: '3 Pleno',    active: levels.n3,  lvl: '3',   mult: cfg.multN3  },
                { lbl: '2 Refuerzo', active: levels.n2,  lvl: '2',   mult: cfg.multN2  },
                { lbl: '0-1 Base',   active: levels.n01, lvl: '0-1', mult: cfg.multN01 },
                { lbl: '-1 Euforia', active: levels.nm1, lvl: '-1',  mult: cfg.multN1i },
              ].map((row, i) => {
                const rm = LM[row.lvl] || LM['0-1']
                const rowBg = row.active ? (dark ? rm.bgD : rm.bg) : i % 2 === 0 ? cardBg : (dark ? '#3a3a3c' : '#fafafa')
                return (
                  <tr key={row.lbl} style={{ background: rowBg, borderBottom: '1px solid ' + cardBorder }}>
                    <td style={{ padding: '8px', fontWeight: row.active ? 700 : 400, color: row.active ? rm.color : textMain }}>
                      {row.active && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: rm.color, marginRight: 6 }} />}
                      {row.lbl}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {row.active
                        ? <span style={{ background: dark ? rm.bgD : rm.bg, color: rm.color, border: '1px solid ' + (dark ? rm.borderD : rm.border), borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Activo</span>
                        : <span style={{ color: textSub }}>—</span>}
                    </td>
                    <td style={{ padding: '8px', color: textSub }}>×{row.mult}</td>
                    <td style={{ padding: '8px', fontWeight: row.active ? 700 : 400, color: row.active ? textMain : textSub }}>{eur(cfg.dcaBase * row.mult)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
