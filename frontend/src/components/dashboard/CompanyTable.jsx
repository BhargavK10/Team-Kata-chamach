import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Interactive3D } from '../effects/CursorEffects.jsx'

export default function CompanyTable({ companies }) {
  const maxArticleCount = Math.max(1, ...companies.map((company) => company.articleCount))
  return (
    <Interactive3D className="panel companies-panel" intensity={1.4}>
      <div className="panel-heading"><div><span className="panel-kicker">TRACKED ENTITIES</span><h3>News coverage by company</h3></div><span className="muted-count">{companies.length} monitored</span></div>
      <div className="company-table">
        <div className="table-head"><span>COMPANY</span><span>SECTOR</span><span>ARTICLES</span><span>HEADLINE MATCHES</span><span /></div>
        {companies.map((company) => <Link to={`/company/${company.id}`} className="table-row" key={company.id}>
          <span className="table-company"><span className="company-monogram" style={{ '--company-color': company.color || '#b699fa' }}>{company.ticker.slice(0, 1)}</span><span><strong>{company.name}</strong><small>{company.ticker}</small></span></span>
          <span className="sector-cell">{company.sector}</span>
          <span className="risk-score"><span>{company.articleCount}</span><span className="score-track"><i style={{ width: `${company.articleCount / maxArticleCount * 100}%`, background: company.color || '#b699fa' }} /></span></span>
          <span><span className={`status-pill status-${company.category.toLowerCase().replace(/\s+/g, '-')}`}><i />{company.category}</span></span>
          <ArrowUpRight className="row-arrow" size={16} />
        </Link>)}
      </div>
      <div className="chart-footnote">Headline keyword matches flag coverage for review; they do not indicate verified risk.</div>
    </Interactive3D>
  )
}
