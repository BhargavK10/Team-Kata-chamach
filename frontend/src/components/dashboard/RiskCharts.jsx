import { Activity } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Interactive3D } from '../effects/CursorEffects.jsx'

const tierColors = {
  'Low Risk': '#69db7c',
  'Moderate Risk': '#ffd43b',
  'High Risk': '#ffa94d',
  'Critical Risk': '#ff6b6b',
  'Unassessed / Feeds': '#625c6d',
}

export function RiskDistribution({ companies = [] }) {
  const counts = {
    'Low Risk': 0,
    'Moderate Risk': 0,
    'High Risk': 0,
    'Critical Risk': 0,
    'Unassessed / Feeds': 0,
  }

  for (const c of companies) {
    if (c.riskLevel) {
      const key = `${c.riskLevel} Risk`
      if (counts[key] !== undefined) counts[key] += 1
      else counts['Unassessed / Feeds'] += 1
    } else {
      counts['Unassessed / Feeds'] += 1
    }
  }

  const distribution = Object.entries(counts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      color: tierColors[name] || '#8caeff',
      value,
    }))

  if (!distribution.length) {
    distribution.push({ name: 'Monitored', color: '#8caeff', value: companies.length })
  }

  return (
    <Interactive3D className="panel chart-panel distribution-panel" intensity={1.8}>
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">PORTFOLIO BREAKDOWN</span>
          <h3>Risk Tiers Distribution</h3>
        </div>
      </div>
      <div className="distribution-content">
        <div className="donut-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={distribution} dataKey="value" innerRadius="70%" outerRadius="92%" paddingAngle={5} stroke="none">
                {distribution.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#17151f', border: '1px solid #302c3a', borderRadius: 10, color: '#fff' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            <strong>{companies.length}</strong>
            <span>entities</span>
          </div>
        </div>
        <div className="legend">
          {distribution.map((item) => (
            <div className="legend-row" key={item.name}>
              <span>
                <i style={{ background: item.color }} />
                {item.name}
              </span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-footnote">Classified by cumulative risk index R = 100 × (1 - e<sup>-k∑I</sup>).</div>
    </Interactive3D>
  )
}

export function RiskTrend({ trend = [] }) {
  const dailyTrend = trend.map((point) => ({ ...point, label: point.date.slice(5) }))
  return (
    <Interactive3D className="panel chart-panel trend-panel" intensity={1.8}>
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">STREAM VOLUME · 7 DAYS</span>
          <h3>Signal Activity History</h3>
        </div>
        <div className="trend-summary">
          <span>Total</span>
          <strong>{dailyTrend.reduce((sum, day) => sum + day.articleCount, 0)}</strong>
        </div>
      </div>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyTrend} margin={{ top: 12, right: 6, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="riskArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a789ff" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#a789ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#292631" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#777382', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#777382', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#17151f', border: '1px solid #302c3a', borderRadius: 10, color: '#fff' }} />
            <Area type="monotone" dataKey="articleCount" name="Articles" stroke="#aa8fff" strokeWidth={2.4} fill="url(#riskArea)" activeDot={{ r: 4, fill: '#c1aafa', stroke: '#17151f', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">
        <Activity size={13} /> Daily incoming signal volume across all monitored entities.
      </div>
    </Interactive3D>
  )
}
