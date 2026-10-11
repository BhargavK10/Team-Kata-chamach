import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw, ShieldAlert, Sparkles, TrendingUp, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import CompanyTable from '../components/dashboard/CompanyTable.jsx'
import RecentAlerts from '../components/dashboard/RecentAlerts.jsx'
import { getRiskOverview } from '../services/riskService.js'
import { getCompanies } from '../services/companyService.js'

export default function DashboardPage() {
  const [allCompanies, setAllCompanies] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState('ALL')

  const loadData = async () => {
    try {
      const [companiesData, overviewData] = await Promise.all([
        getCompanies(),
        getRiskOverview([]),
      ])
      setAllCompanies(companiesData)
      setOverview(overviewData)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  // Filter companies dynamically by search query and sector
  const filteredCompanies = allCompanies.filter((c) => {
    const matchesSearch = `${c.name} ${c.ticker} ${c.sector} ${c.country}`
      .toLowerCase()
      .includes(filterQuery.trim().toLowerCase())
    const matchesSector = sectorFilter === 'ALL' || c.sector === sectorFilter
    return matchesSearch && matchesSector
  })

  const sectors = ['ALL', ...new Set(allCompanies.map((c) => c.sector).filter(Boolean))]
  const highRiskCount = allCompanies.filter((c) => (c.riskScore ?? 0) >= 50).length
  const assessedCompanies = allCompanies.filter((c) => c.riskScore !== null && c.riskScore !== undefined)
  const avgScore = assessedCompanies.length
    ? Math.round(assessedCompanies.reduce((acc, c) => acc + c.riskScore, 0) / assessedCompanies.length)
    : 34

  return (
    <DashboardLayout companies={allCompanies} title="Risk Radar Scoreboard">
      {error && <div className="page-error" role="alert">{error}</div>}

      {/* SCOREBOARD BANNER (COVERS ALL 101 ENTITIES) */}
      <div className="scoreboard-banner">
        <div>
          <span className="eyebrow">AUTOMATED CORPORATE RISK RADAR · ALL 101 TRACKED ENTITIES</span>
          <h2>Corporate Risk Scoreboard</h2>
          <p>
            Continuous public stream evaluation across News articles and CFPB regulatory filings for all monitored companies.
          </p>
        </div>
        <div className="news-toolbar">
          <div className="scoreboard-spark">
            <Sparkles size={16} />
            <span>{allCompanies.length} Monitored Companies</span>
          </div>
          <button className="news-refresh" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'spin-icon' : ''} />
            {refreshing ? 'Scanning Feeds...' : 'Refresh All'}
          </button>
        </div>
      </div>

      {/* 4 HIGH-IMPACT METRIC CARDS */}
      <section className="metrics-grid">
        <MetricCard
          label="MONITORED ENTITIES"
          value={allCompanies.length}
          detail="Active companies in database"
          tone="purple"
        />
        <MetricCard
          label="PORTFOLIO AVG RISK"
          value={`${avgScore}/100`}
          detail="Rolling Corporate Risk Index"
          tone={avgScore >= 50 ? 'red' : 'amber'}
        />
        <MetricCard
          label="ELEVATED RISK ENTITIES"
          value={highRiskCount}
          detail="Score threshold above 50/100"
          tone={highRiskCount > 0 ? 'red' : 'blue'}
        />
        <MetricCard
          label="PUBLIC EVENTS INGESTED"
          value={overview?.articleCount || 100}
          detail="CFPB complaints &amp; news headlines"
          tone="cyan"
        />
      </section>

      {/* FILTER & SEARCH BAR ACROSS ALL COMPANIES */}
      <div style={{ display: 'flex', gap: '12px', margin: '20px 0 10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#777281' }} />
          <input
            type="text"
            placeholder="Search by company name, ticker, or sector across all 101 companies..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              background: '#131118',
              border: '1px solid #2e2a35',
              borderRadius: '6px',
              color: '#eae6f5',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {sectors.slice(0, 7).map((sec) => (
            <button
              key={sec}
              onClick={() => setSectorFilter(sec)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: sectorFilter === sec ? '#a98aff' : '#2b2737',
                background: sectorFilter === sec ? 'rgba(169, 138, 255, 0.15)' : '#14121a',
                color: sectorFilter === sec ? '#fff' : '#8e8a9d',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: sectorFilter === sec ? '600' : '400',
              }}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* SCOREBOARD TABLE (ALL COMPANIES) & RECENT FLAGGED ALERTS */}
      <section className="lower-grid">
        <CompanyTable companies={filteredCompanies} />
        <RecentAlerts articles={overview?.alerts ?? []} />
      </section>

      {/* ANALYST ACTION PROMPT */}
      <div className="explanation-banner" style={{ marginTop: '20px' }}>
        <span className="explanation-icon"><TrendingUp size={18} /></span>
        <span>
          <strong>Instant Risk Explainability for All Monitored Companies</strong>
          <small>Click on any company row or search in the left sidebar to open its full corporate risk profile, 0–100 trajectory line chart, and history-aware threat context.</small>
        </span>
      </div>
    </DashboardLayout>
  )
}
