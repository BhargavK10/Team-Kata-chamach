import { ArrowUpRight, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function RecentAlerts({ articles = [] }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel-heading"><div><span className="panel-kicker">PUBLISHED HEADLINES · 7 DAYS</span><h3>Keyword-matched articles</h3></div><span className="alert-count">{articles.length} links</span></div>
      <div className="alerts-list">
        {articles.length ? articles.map((article, index) => <div key={`${article.companyId}-${article.articleId ?? index}`} className="alert-row">
          <Link className="alert-icon alert-high" aria-label={`Open ${article.companyName} report`} to={`/company/${article.companyId}`}><ShieldAlert size={16} /></Link>
          <span className="alert-copy"><strong>{article.title}</strong><small>{article.companyName} · {article.publisher} · {new Date(article.publishedAt).toLocaleDateString()}</small></span>
          <a href={article.url} target="_blank" rel="noreferrer" aria-label="Open original article" title="Open original article"><ArrowUpRight size={15} className="alert-arrow" /></a>
        </div>) : <div className="empty-alerts">No risk-keyword headlines found in the current news snapshot.</div>}
      </div>
    </section>
  )
}
