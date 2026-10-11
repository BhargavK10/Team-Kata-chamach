import { useEffect, useState } from 'react'
import { Bell, ChevronDown, Menu, Radar, Search, X, ShieldAlert, TrendingUp } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { logout, getSession } from '../../services/authService.js'
import Brand from '../Brand.jsx'
import CompanyLogo from '../common/CompanyLogo.jsx'

function Sidebar({ companies = [], selected = [], onToggle = () => {}, mobileOpen, onClose }) {
  const [companyFilter, setCompanyFilter] = useState('')
  const filteredCompanies = companies.filter((company) =>
    `${company.name} ${company.ticker} ${company.id} ${company.sector}`.toLowerCase().includes(companyFilter.trim().toLowerCase()),
  )

  return (
    <>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close sidebar" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`} style={{ overflowY: 'auto' }}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button sidebar-close" aria-label="Close sidebar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="side-section-label" style={{ marginTop: '16px' }}>WORKSPACE</div>
        <NavLink end to="/dashboard" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <Radar size={16} /> Risk Scoreboard <span className="side-link-arrow">↗</span>
        </NavLink>

        <div className="company-heading" style={{ marginTop: '20px' }}>
          <span>ALL COMPANIES</span>
          <span className="count-pill">{companies.length}</span>
        </div>

        <label className="sidebar-filter">
          <Search size={13} />
          <input
            aria-label="Search all companies"
            placeholder="Search all 101 companies..."
            value={companyFilter}
            onChange={(event) => setCompanyFilter(event.target.value)}
          />
        </label>

        {/* CLICKABLE NAVIGATION LIST FOR ALL COMPANIES */}
        <div className="company-list" style={{ marginTop: '8px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '4px' }}>
          {filteredCompanies.map((company) => {
            const hasRisk = company.riskScore !== null && company.riskScore !== undefined
            const tierColor = company.riskScore >= 50 ? '#ff6b6b' : company.riskScore >= 25 ? '#ffd43b' : '#69db7c'

            return (
              <Link
                to={`/company/${company.id}`}
                className="company-row"
                key={company.id}
                onClick={onClose}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CompanyLogo company={company} size="sm" />
                <span className="company-row-name">
                  <strong>{company.ticker}</strong>
                  <small title={company.name}>{company.name}</small>
                </span>
                <span
                  className="risk-mini"
                  style={{
                    fontWeight: 'bold',
                    color: hasRisk ? tierColor : '#8caeff',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '2px 5px',
                    borderRadius: '4px',
                  }}
                >
                  {hasRisk ? `${company.riskScore}` : `${company.articleCount || 0} feeds`}
                </span>
              </Link>
            )
          })}
          {!filteredCompanies.length && <span className="sidebar-no-results">No companies match query.</span>}
        </div>

        <div className="sidebar-foot" style={{ marginTop: 'auto' }}>
          <span className="live-indicator" /> Live Risk Feed Active
        </div>
      </aside>
    </>
  )
}

export default function DashboardLayout({
  children,
  companies = [],
  selected = [],
  onToggle = () => {},
  title = 'Risk Scoreboard',
  subtitle = 'Continuous public threat detection across all monitored corporate entities.',
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState({ name: 'Risk Analyst', email: '' })
  const navigate = useNavigate()

  useEffect(() => {
    getSession()
      .then((session) => {
        if (session) setProfile(session)
      })
      .catch(() => {})
  }, [])

  async function signOut() {
    try {
      await logout()
    } finally {
      navigate('/')
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        companies={companies}
        selected={selected}
        onToggle={onToggle}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="workspace">
        <header className="dashboard-header">
          <button
            className="icon-button menu-toggle"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            style={{ display: 'flex', cursor: 'pointer' }}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <i>/</i>
            <strong>{title}</strong>
          </div>
          <div className="header-actions">
            <button className="icon-button notification-button" aria-label="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <div className="profile-area">
              <button
                className="profile-button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
              >
                <span className="avatar">
                  {profile.name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="profile-name">
                  {profile.name}
                  <small>{profile.email || 'Senior Analyst'}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <Link to="/">Home</Link>
                  <button onClick={signOut}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">CORPORATE RISK RADAR <span className="mock-tag">ACTIVE MONITORING</span></span>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <span className="date-chip">
              <span className="live-indicator" /> Live Stream
            </span>
          </div>
          {children}
          <footer className="dashboard-footer">
            COR.P ANALYSIS · Automated corporate risk radar evaluating public unstructured feeds.
          </footer>
        </main>
      </div>
    </div>
  )
}
