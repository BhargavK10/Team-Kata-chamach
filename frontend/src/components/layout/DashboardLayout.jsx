import { useEffect, useState } from 'react'
import { Bell, ChevronDown, Menu, Radar, Search, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../../services/authService.js'
import { getSession } from '../../services/authService.js'
import Brand from '../Brand.jsx'
import { Interactive3D } from '../effects/CursorEffects.jsx'

function Sidebar({ companies, selected, onToggle, mobileOpen, onClose }) {
  const [companyFilter, setCompanyFilter] = useState('')
  const filteredCompanies = companies.filter((company) =>
    `${company.name} ${company.ticker} ${company.id}`.toLowerCase().includes(companyFilter.trim().toLowerCase()),
  )
  return (
    <>
      {mobileOpen && <button className="mobile-scrim" aria-label="Close sidebar" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top"><Brand /><button className="icon-button sidebar-close" aria-label="Close sidebar" onClick={onClose}><X size={18} /></button></div>
        <div className="side-section-label">WORKSPACE</div>
        <NavLink end to="/dashboard" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Radar size={17} /> Risk overview <span className="side-link-arrow">↗</span></NavLink>
        <div className="company-heading"><span>MONITORED COMPANIES</span><span className="count-pill">{companies.length}</span></div>
        <label className="sidebar-filter"><Search size={13} /><input aria-label="Filter companies" placeholder="Filter companies..." value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} /></label>
        <label className="all-companies"><input type="checkbox" checked={!selected.length} onChange={() => onToggle('all')} /><span>All companies</span></label>
        <div className="company-list">
          {filteredCompanies.map((company) => <label className="company-row" key={company.id}>
            <input type="checkbox" checked={selected.includes(company.id)} onChange={() => onToggle(company.id)} />
            <span className="risk-dot" style={{ '--company-color': company.color || '#a98aff' }} />
            <span className="company-row-name">{company.ticker}<small>{company.name}</small></span>
            <span className={`risk-mini ${company.riskKeywordCount ? 'risk-high' : company.articleCount ? 'risk-med' : ''}`}>{company.articleCount}</span>
          </label>)}
          {!filteredCompanies.length && <span className="sidebar-no-results">No companies match.</span>}
        </div>
        <div className="sidebar-foot"><span className="live-indicator" /> Publisher headline data</div>
      </aside>
    </>
  )
}

export default function DashboardLayout({ children, companies = [], selected = [], onToggle = () => {}, title = 'Risk overview', subtitle = 'A clear view of what is changing across your portfolio.' }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState({ name: 'Guest analyst', email: '' })
  const navigate = useNavigate()
  useEffect(() => {
    getSession().then((session) => { if (session) setProfile(session) }).catch((failure) => console.warn('Could not restore COR.P ANALYSIS session:', failure.message))
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
      <Sidebar companies={companies} selected={selected} onToggle={onToggle} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="workspace">
        <header className="dashboard-header">
          <button className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><i>/</i><strong>{title}</strong></div>
          <div className="header-actions">
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <div className="profile-area">
              <button className="profile-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}><span className="avatar">{profile.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span className="profile-name">{profile.name}<small>{profile.email || 'Risk analyst'}</small></span><ChevronDown size={15} /></button>
              {profileOpen && <div className="profile-menu"><Link to="/">Home</Link><button onClick={signOut}>Sign out</button></div>}
            </div>
          </div>
        </header>
        <main className="dashboard-main">
          <div className="page-heading"><div><span className="eyebrow">NEWS MONITORING <span className="mock-tag">7 DAY WINDOW</span></span><h1>{title}</h1><p>{subtitle}</p></div><span className="date-chip"><span className="live-indicator" /> Last 7 days</span></div>
          {children}
          <footer className="dashboard-footer">COR.P ANALYSIS <span>·</span> News metadata and headline-keyword indicators only. Not verified risk assessments or financial advice.</footer>
        </main>
      </div>
    </div>
  )
}
