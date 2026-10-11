import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Interactive3D } from '../effects/CursorEffects.jsx'

export default function CompanyTable({ companies }) {
  return (
    <Interactive3D className="panel companies-panel" intensity={1.4}>
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">MONITORED ENTITIES</span>
          <h3>Corporate Risk Index &amp; Feeds</h3>
        </div>
        <span className="muted-count">{companies.length} companies</span>
      </div>
      <div className="company-table">
        <div className="table-head">
          <span>COMPANY</span>
          <span>SECTOR</span>
          <span>RISK INDEX (R)</span>
          <span>TIER / STATUS</span>
          <span />
        </div>
        {companies.map((company) => {
          const hasScore = company.riskScore !== null && company.riskScore !== undefined
          const score = hasScore ? company.riskScore : null
          const tier = company.riskLevel || (hasScore ? (score <= 24 ? 'Low' : score <= 49 ? 'Moderate' : score <= 74 ? 'High' : 'Critical') : null)
          const tierColor = tier === 'Critical' ? '#ff6b6b' : tier === 'High' ? '#ffa94d' : tier === 'Moderate' ? '#ffd43b' : tier === 'Low' ? '#69db7c' : '#777382'
          const pillClass = tier ? `status-${tier.toLowerCase()}` : `status-${company.category.toLowerCase().replace(/\s+/g, '-')}`

          return (
            <Link to={`/company/${company.id}`} className="table-row" key={company.id}>
              <span className="table-company">
                <span className="company-monogram" style={{ '--company-color': company.color || '#b699fa' }}>
                  {company.ticker.slice(0, 1)}
                </span>
                <span>
                  <strong>{company.name}</strong>
                  <small>{company.ticker} · {company.country}</small>
                </span>
              </span>
              <span className="sector-cell">{company.sector}</span>
              <span className="risk-score">
                <span style={{ fontWeight: 'bold', color: hasScore ? tierColor : '#8e8a9d' }}>
                  {hasScore ? `${score}/100` : `${company.articleCount} feeds`}
                </span>
                <span className="score-track">
                  <i style={{ width: `${hasScore ? score : Math.min(100, company.articleCount * 10)}%`, background: hasScore ? tierColor : company.color || '#b699fa' }} />
                </span>
              </span>
              <span>
                <span className={`status-pill ${pillClass}`}>
                  <i />{tier ? `${tier} Risk` : company.category}
                </span>
              </span>
              <ArrowUpRight className="row-arrow" size={16} />
            </Link>
          )
        })}
      </div>
      <div className="chart-footnote">Click any company to open the 5-dimension event breakdown and mathematical audit trail.</div>
    </Interactive3D>
  )
}
