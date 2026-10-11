import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, ArrowUpRight, CalendarDays, FileText, Newspaper, ShieldAlert, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DashboardLayout from '../components/layout/DashboardLayout.jsx'
import { Interactive3D } from '../components/effects/CursorEffects.jsx'
import { getCompanies, getCompanyById } from '../services/companyService.js'
import { getCompanyReport } from '../services/reportService.js'
import { getCompanyNews } from '../services/newsService.js'

function buildDailyArticleCounts(articles) {
  const dayCount = 7
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (dayCount - 1))
  const daily = new Map()
  for (const article of articles) {
    const day = article.publishedAt.slice(0, 10)
    daily.set(day, (daily.get(day) ?? 0) + 1)
  }
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000)
    return { label: date.toISOString().slice(5, 10), articleCount: daily.get(date.toISOString().slice(0, 10)) ?? 0 }
  })
}

function categoryCount(articles, category) {
  return articles.filter((article) => article.headlineSignal?.includes(category)).length
}

export default function CompanyPage() {
  const { companyId } = useParams()
  const [company, setCompany] = useState(null)
  const [companies, setCompanies] = useState([])
  const [report, setReport] = useState(null)
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getCompanyById(companyId), getCompanyReport(companyId), getCompanyNews(companyId), getCompanies()])
      .then(([companyData, reportData, newsData, companyList]) => {
        if (!active) return
        setCompany(companyData)
        setCompanies(companyList)
        setReport(reportData)
        setNews(newsData)
        setError('')
      })
      .catch((failure) => { if (active) setError(failure.message || 'Company details are temporarily unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [companyId])

  const articles = news?.articles ?? []
  const dailyCounts = useMemo(() => buildDailyArticleCounts(articles), [articles])
  const publishers = new Set(articles.map((article) => article.publisher)).size
  const riskKeywordCount = articles.filter((article) => article.headlineSignal !== 'General coverage').length

  if (loading) return <DashboardLayout companies={companies} title="Company report"><div className="loading-report"><span className="spinner" /> Loading company news data…</div></DashboardLayout>
  if (error || !company) return <DashboardLayout companies={companies} title="Company report"><div className="not-found-card"><ShieldAlert size={24} /><h2>Report unavailable</h2><p>{error || 'Company was not found.'}</p><Link className="button button-small" to="/dashboard">Back to dashboard</Link></div></DashboardLayout>

  return (
    <DashboardLayout companies={companies} title="Company report" subtitle="Publisher-linked headlines collected within the selected 7-day window.">
      <Link className="back-dashboard" to="/dashboard"><ArrowLeft size={15} /> Back to news overview</Link>
      <div className="company-hero">
        <div className="company-identity"><span className="company-monogram large" style={{ '--company-color': company.color || '#b699fa' }}>{company.ticker.slice(0, 1)}</span><div><span className="eyebrow">{company.ticker} <i>·</i> {company.sector} <i>·</i> {company.country}</span><h1>{company.name}</h1><p>Tracked company from the local company-universe CSV. No financial or legal facts are inferred from headlines.</p></div></div>
        <div className="company-hero-score">
          <span className="panel-kicker">GEMINI RISK SCORE (0–100)</span>
          <strong>{report?.overallRiskScore !== undefined && report?.overallRiskScore !== null ? `${report.overallRiskScore}/100` : company.articleCount}</strong>
          <span className={`status-pill ${report?.riskLevel ? `status-${report.riskLevel.toLowerCase()}` : `status-${company.category.toLowerCase().replace(/\s+/g, '-')}`}`}>
            <i />{report?.riskLevel ? `${report.riskLevel} Risk` : company.category}
          </span>
          <small className="score-caveat">{report?.overallRiskScore !== null ? 'Evaluated by Gemini AI' : 'News-source metadata only'}</small>
        </div>
      </div>
      <section className="detail-metrics">
        <Interactive3D className="panel detail-metric" intensity={2}><span>ARTICLES RETRIEVED</span><strong>{news?.articleCount ?? 0}</strong><small>Unique source links</small></Interactive3D>
        <Interactive3D className="panel detail-metric" intensity={2}><span>THREATS ESCALATED</span><strong>{report?.escalatedThreatsCount ?? riskKeywordCount}</strong><small>Confirmed risk indicators</small></Interactive3D>
        <Interactive3D className="panel detail-metric" intensity={2}><span>NOISE FILTERED</span><strong>{report?.noiseItemsCount ?? publishers}</strong><small>Routine market updates</small></Interactive3D>
      </section>
      <section className="detail-content-grid">
        <Interactive3D className="panel detail-chart-panel" intensity={1.5}>
          <div className="panel-heading"><div><span className="panel-kicker">PUBLISHED ARTICLE COUNTS</span><h3>7-day coverage history</h3></div><span className="mock-tag">RSS METADATA</span></div>
          <div className="detail-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyCounts} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}><defs><linearGradient id="companyArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={company.color || '#b699fa'} stopOpacity={0.25} /><stop offset="100%" stopColor={company.color || '#b699fa'} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#292631" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#777382', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#777382', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#17151f', border: '1px solid #302c3a', borderRadius: 10, color: '#fff' }} /><Area type="monotone" dataKey="articleCount" name="Articles" stroke={company.color || '#b699fa'} fill="url(#companyArea)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
          <div className="chart-footnote"><Activity size={13} /> Daily article counts from the collected publisher feed.</div>
        </Interactive3D>
        <Interactive3D className="panel placeholder-panel" intensity={1.8}>
          <div className="panel-heading"><div><span className="panel-kicker">GEMINI AI RISK ASSESSMENT</span><h3>Risk Score & Threat Profile</h3></div><Sparkles size={17} /></div>
          <div className="placeholder-content">
            <span className="placeholder-icon" style={{ fontSize: '18px', fontWeight: 'bold' }}>{report?.overallRiskScore ?? '—'}</span>
            <strong style={{ fontSize: '14px', marginTop: '8px' }}>{report?.riskLevel ? `${report.riskLevel} Risk Tier` : 'Evaluating Risk Profile...'}</strong>
            <p style={{ marginTop: '6px' }}>{report?.message}</p>
          </div>
        </Interactive3D>
      </section>
      <section className="detail-content-grid second-detail-grid">
        <Interactive3D className="panel evidence-panel" intensity={1.6}><div className="panel-heading"><div><span className="panel-kicker">ARTICLE SOURCES</span><h3>Retrieved headlines</h3></div><span className="mock-tag">{articles.length} LINKS</span></div>
          <div className="evidence-list">{articles.length ? articles.slice(0, 10).map((article) => <a className="evidence-row" key={article.articleId ?? article.url} href={article.url} target="_blank" rel="noreferrer"><FileText size={16} /><span><strong>{article.title}</strong><small>{article.publisher} · {new Date(article.publishedAt).toLocaleString()} · {article.headlineSignal}</small></span><ArrowUpRight size={14} /></a>) : <div className="news-placeholder"><strong>No recent articles retrieved</strong><p>Refresh the news snapshot after signing in to collect publisher-linked headlines.</p></div>}</div>
        </Interactive3D>
        <Interactive3D className="panel placeholder-panel news-panel" intensity={1.5}><div className="panel-heading"><div><span className="panel-kicker">HEADLINE CLASSIFICATION</span><h3>Keyword matches</h3></div><Newspaper size={17} /></div>
          <p className="news-placeholder">These matches are generated from titles only and are not fact-checking or risk judgments.</p>
          {['Regulatory', 'Legal', 'Operational', 'Financial'].map((category) => <div className="news-placeholder" key={category}><strong>{category}</strong><p>{categoryCount(articles, category)} matching article titles in this snapshot.</p></div>)}
        </Interactive3D>
      </section>
      <section className="detail-content-grid second-detail-grid bottom-detail-grid">
        <Interactive3D className="panel ai-panel" intensity={1.5}>
          <div className="panel-heading"><div><span className="panel-kicker">RISK EXPLANATION</span><h3>Gemini AI Analysis & Rationale</h3></div><Sparkles size={17} /></div>
          <p>{report?.message ?? 'AI risk engine evaluating continuous feeds.'}</p>
          <span className="status-pill status-risk-keywords" style={{ marginTop: '10px', display: 'inline-block' }}>{report?.status === 'verified_ai_assessment' ? 'VERIFIED BY GEMINI' : 'ANALYZING'}</span>
        </Interactive3D>
        <Interactive3D className="panel timeline-panel" intensity={1.5}><div className="panel-heading"><div><span className="panel-kicker">ARTICLE TIMELINE</span><h3>Recent publications</h3></div><CalendarDays size={17} /></div><div className="timeline">{report?.events?.length ? report.events.map((event) => <div className="timeline-item" key={`${event.url}-${event.date}`}><i /><span><small>{new Date(event.date).toLocaleString()}</small><strong>{event.title}</strong><p><a href={event.url} target="_blank" rel="noreferrer">{event.text} ↗</a></p></span></div>) : <div className="empty-alerts">No article timeline is available for this company.</div>}</div></Interactive3D>
      </section>
      <p className="company-data-disclaimer">{news?.disclaimer}</p>
    </DashboardLayout>
  )
}
