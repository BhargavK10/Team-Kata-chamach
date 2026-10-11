import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Interactive3D } from '../effects/CursorEffects.jsx'

export default function MetricCard({ label, value, detail, tone = 'purple', change }) {
  return (
    <Interactive3D className={`metric-card metric-${tone}`} intensity={2.4}>
      <div className="metric-top"><span>{label}</span><span className="metric-indicator" /></div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom"><span>{detail}</span>{change && <span className={change > 0 ? 'change-up' : 'change-down'}>{change > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(change)}%</span>}</div>
    </Interactive3D>
  )
}
