import { Activity } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Interactive3D } from '../effects/CursorEffects.jsx'

const colors = { 'No coverage': '#625c6d', Coverage: '#8caeff', 'Risk keywords': '#ff9a84' }

export function RiskDistribution({ companies = [] }) {
  const distribution = Object.entries(colors).map(([name, color]) => ({
    name,
    color,
    value: companies.filter((company) => company.category === name).length,
  }))
  return (
    <Interactive3D className="panel chart-panel distribution-panel" intensity={1.8}>
      <div className="panel-heading"><div><span className="panel-kicker">7 DAY NEWS WINDOW</span><h3>Company coverage</h3></div><button className="panel-more" aria-label="Coverage chart information">•••</button></div>
      <div className="distribution-content">
        <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" innerRadius="70%" outerRadius="92%" paddingAngle={5} stroke="none">{distribution.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ background: '#17151f', border: '1px solid #302c3a', borderRadius: 10, color: '#fff' }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{companies.length}</strong><span>companies</span></div></div>
        <div className="legend">{distribution.map((item) => <div className="legend-row" key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.value}</strong></div>)}</div>
      </div>
      <div className="chart-footnote">Coverage categories are based on retrieved headlines.</div>
    </Interactive3D>
  )
}

export function RiskTrend({ trend = [] }) {
  const dailyTrend = trend.map((point) => ({ ...point, label: point.date.slice(5) }))
  return (
    <Interactive3D className="panel chart-panel trend-panel" intensity={1.8}>
      <div className="panel-heading"><div><span className="panel-kicker">PUBLISHED ARTICLE VOLUME · 7 DAYS</span><h3>News coverage trend</h3></div><div className="trend-summary"><span>Articles</span><strong>{dailyTrend.reduce((sum, day) => sum + day.articleCount, 0)}</strong></div></div>
      <div className="trend-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyTrend} margin={{ top: 12, right: 6, left: -22, bottom: 0 }}><defs><linearGradient id="riskArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a789ff" stopOpacity={0.25} /><stop offset="100%" stopColor="#a789ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#292631" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#777382', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#777382', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#17151f', border: '1px solid #302c3a', borderRadius: 10, color: '#fff' }} /><Area type="monotone" dataKey="articleCount" name="Articles" stroke="#aa8fff" strokeWidth={2.4} fill="url(#riskArea)" activeDot={{ r: 4, fill: '#c1aafa', stroke: '#17151f', strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div>
      <div className="chart-footnote"><Activity size={13} /> Daily articles matched to the tracked company feeds.</div>
    </Interactive3D>
  )
}
