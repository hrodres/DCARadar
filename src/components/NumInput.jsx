import { pf } from '../utils.js'

export default function NumInput({ label, value, onChange, unit, step, hint, optional, accent, dark }) {
  const cur = pf(value)
  const dec = step < 1 ? (String(step).split('.')[1]?.length || 1) : 0
  const adj = (dir) => {
    const next = Math.round((cur + dir * step) * 1e8) / 1e8
    onChange(dec > 0 ? next.toFixed(dec) : String(next))
  }
  const c = dark ? { bg: '#3a3a3c', border: '#48484a', text: '#f5f5f7', sub: '#8e8e93', btn: '#48484a' }
                 : { bg: 'white',   border: '#e5e5ea', text: '#1d1d1f', sub: '#aeaeb2', btn: '#f5f5f7' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: accent || (dark ? '#8e8e93' : '#6e6e73'), textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
        {optional && <span style={{ fontSize: 10, color: c.sub }}>opcional</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: c.bg, border: '1px solid ' + c.border, borderRadius: 10, padding: '8px 10px' }}>
        <button onClick={() => adj(-1)} style={{ minWidth: 32, minHeight: 32, borderRadius: 7, border: '1px solid ' + c.border, background: c.btn, color: c.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>&minus;</button>
        <input type="text" inputMode="decimal" value={value} placeholder="—"
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', color: c.text, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', outline: 'none', minWidth: 0, textAlign: 'center' }} />
        <button onClick={() => adj(1)} style={{ minWidth: 32, minHeight: 32, borderRadius: 7, border: '1px solid ' + c.border, background: c.btn, color: c.text, cursor: 'pointer', fontFamily: 'inherit', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>+</button>
        {unit && <span style={{ fontSize: 12, color: c.sub, flexShrink: 0 }}>{unit}</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: c.sub }}>{hint}</div>}
    </div>
  )
}
