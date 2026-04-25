import { pf } from '../utils.js'

export default function NumInput({ label, value, onChange, unit, step, hint, optional, accent, dark }) {
  const cur = pf(value)
  const dec = step < 1 ? (String(step).split('.')[1]?.length || 1) : 0
  const adj = (dir) => {
    const next = Math.round((cur + dir * step) * 1e8) / 1e8
    onChange(dec > 0 ? next.toFixed(dec) : String(next))
  }
  const textMain = dark ? '#f5f5f7' : '#1d1d1f'
  const textSub  = dark ? '#8e8e93' : '#6e6e73'
  const border   = dark ? '#3a3a3c' : '#e5e5ea'
  const btnBg    = dark ? '#3a3a3c' : '#f2f2f7'
  const btnColor = dark ? '#ebebf5' : '#1d1d1f'

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', gap: 12 }}>
      {/* Label + hint */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: accent || textMain, fontWeight: 400 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: textSub, marginTop: 1 }}>{hint}</div>}
      </div>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
        <button onClick={() => adj(-1)} style={{ width: 32, height: 32, borderRadius: '10px 0 0 10px', border: '1px solid ' + border, borderRight: 'none', background: btnBg, color: btnColor, cursor: 'pointer', fontFamily: 'inherit', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>&minus;</button>
        <div style={{ display: 'flex', alignItems: 'center', background: dark ? '#2c2c2e' : 'white', border: '1px solid ' + border, borderLeft: 'none', borderRight: 'none', padding: '0 6px', height: 32 }}>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            placeholder="—"
            onChange={e => onChange(e.target.value)}
            style={{ width: 64, background: 'transparent', border: 'none', color: textMain, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
          />
          {unit && <span style={{ fontSize: 13, color: textSub, marginLeft: 2 }}>{unit}</span>}
        </div>
        <button onClick={() => adj(1)} style={{ width: 32, height: 32, borderRadius: '0 10px 10px 0', border: '1px solid ' + border, borderLeft: 'none', background: btnBg, color: btnColor, cursor: 'pointer', fontFamily: 'inherit', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
      </div>
    </div>
  )
}
