import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Download, RefreshCw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout.jsx'
import GlobalSearchBar from '../components/GlobalSearchBar.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import { RiskDistribution, RiskTrend } from '../components/dashboard/RiskCharts.jsx'
import CompanyTable from '../components/dashboard/CompanyTable.jsx'
import RecentAlerts from '../components/dashboard/RecentAlerts.jsx'
import { getRiskOverview } from '../services/riskService.js'
import { getCompanies } from '../services/companyService.js'
import { getNewsStatus } from '../services/newsService.js'
import { apiRequest } from '../services/apiClient.js'

export default function DashboardPage() {
  const [selected, setSelected] = useState([])
  const [companies, setCompanies] = useState([])
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [newsStatus, setNewsStatus] = useState(null)
  const [refreshError, setRefreshError] = useState('')
  const [snapshotVersion, setSnapshotVersion] = useState(0)
  const lastSnapshot = useRef('')

  useEffect(() => {
    let mounted = true
    const poll = async () => {
      try {
        const data = await getNewsStatus()
        if (!mounted) return
        setNewsStatus(data)
        const isRunning = data.job?.status === 'running'
        const snapshotKey = isRunning ? '' : `${data.lastFetchedAt ?? 'initial'}:${data.fetchedCompanyCount ?? 0}`
        if (snapshotKey && lastSnapshot.current !== snapshotKey) {
          lastSnapshot.current = snapshotKey
          if (data.lastFetchedAt) setSnapshotVersion((version) => version + 1)
        }
      } catch (failure) {
        if (mounted) setError(failure.message)
      }
    }
    poll()
    const interval = window.setInterval(poll, 3000)
    return () => { mounted = false; window.clearInterval(interval) }
  }, [])

  useEffect(() => {
    let mounted = true
    Promise.all([getCompanies(), getRiskOverview(selected)])
      .then(([companyList, data]) => {
        if (mounted) {
          setCompanies(companyList)
          setOverview(data)
          setError('')
        }
      })
      .catch((failure) => { if (mounted) setError(failure.message) })
    return () => { mounted = false }
  }, [selected, snapshotVersion])

  function toggle(id) {
    setSelected((current) => {
      if (id === 'all' || (companies.length && companies.every((company) => current.includes(company.id)) && current.length === companies.length)) return []
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    })
  }

  async function refreshNews() {
    setRefreshError('')
    try {
      const result = await apiRequest('/news/refresh', { method: 'POST', body: JSON.stringify({ days: 7 }) })
      setNewsStatus((current) => ({ ...current, job: result.job }))
    } catch (failure) {
      setRefreshError(failure.message)
    }
  }

  const items = overview?.companies ?? []
  const isSingle = items.length === 1
  const isCompare = items.length > 1 && selected.length > 0
  const title = isSingle ? items[0].name : isCompare ? 'Company comparison' : 'Corporate Risk Scoreboard'

  return (
    <DashboardLayout companies={companies} selected={selected} onToggle={toggle} title="Risk overview">
      <div className="dashboard-search-area"><GlobalSearchBar /><span>Search 101 tracked companies, sectors, headline categories, and published headlines</span></div>
      {error && <div className="page-error" role="alert">{error}</div>}
      {isSingle ? <div className="selection-banner"><span><strong>{items[0].ticker}</strong> coverage selected</span><Link to={`/company/${items[0].id}`}>Open news report <ArrowRight size={14} /></Link></div> : isCompare ? <div className="selection-banner"><span><strong>{items.length}</strong> companies selected for comparison</span><span>Counts represent retrieved headlines in the current snapshot.</span></div> : <div className="scoreboard-banner"><div><span className="eyebrow">PUBLISHED NEWS · LAST 7 DAYS</span><h2>Corporate News Scoreboard</h2><p>Track publisher headlines and headline-keyword matches across the company universe.</p></div><div className="news-toolbar"><div className="scoreboard-spark"><Sparkles size={16} /><span>{newsStatus?.job?.status === 'running' ? `${newsStatus.job.completed}/${newsStatus.job.total} feeds fetched` : `${newsStatus?.fetchedCompanyCount ?? 0}/${companies.length} feeds updated`}</span></div><button className="news-refresh" onClick={refreshNews} disabled={newsStatus?.job?.status === 'running'}><RefreshCw size={13} className={newsStatus?.job?.status === 'running' ? 'spin-icon' : ''} />{newsStatus?.job?.status === 'running' ? 'Refreshing' : 'Refresh 7 days'}</button><div className="csv-links"><a href="/api/exports/company-news.csv"><Download size={12} />Company CSV</a><a href="/api/exports/news-articles.csv"><Download size={12} />Articles CSV</a></div>{refreshError && <span className="refresh-error" role="alert">{refreshError}</span>}</div></div>}
      <section className="metrics-grid">
        <MetricCard label={isSingle ? 'COMPANY HEADLINES' : 'COMPANIES MONITORED'} value={isSingle ? items[0].articleCount : companies.length} detail={isSingle ? 'Retrieved in the 7-day window' : 'Company universe from CSV'} tone="purple" />
        <MetricCard label="COMPANIES WITH COVERAGE" value={overview?.companiesWithCoverage ?? 0} detail="At least one matching article" tone="red" />
        <MetricCard label="ARTICLES RETRIEVED" value={overview?.articleCount ?? 0} detail="Unique article links · last 7 days" tone="blue" />
        <MetricCard label="RISK-KEYWORD HEADLINES" value={overview?.riskKeywordArticleCount ?? 0} detail="Headline terms only · review source" tone="amber" />
      </section>
      <section className="charts-grid"><RiskDistribution companies={items} /><RiskTrend trend={overview?.trend ?? []} /></section>
      <section className="lower-grid"><CompanyTable companies={items} /><RecentAlerts articles={overview?.alerts ?? []} /></section>
      <div className="explanation-banner"><span className="explanation-icon"><Sparkles size={17} /></span><span><strong>Headline keyword matches are review cues</strong><small>Automated title matching is not a verified risk classification, legal finding, or statement of fact.</small></span><span className="coming-soon">SOURCE-LINKED</span></div>
    </DashboardLayout>
  )
}
