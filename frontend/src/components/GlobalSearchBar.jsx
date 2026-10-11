import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Building2, CornerDownLeft, Newspaper, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchCompanies } from '../services/searchService.js'

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ companies: [], keywords: [] })
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const rootRef = useRef(null)
  const navigate = useNavigate()
  const total = results.companies.length + results.keywords.length + (results.articles?.length ?? 0)

  useEffect(() => {
    let alive = true
    if (!query.trim()) {
      setResults({ companies: [], keywords: [] })
      setLoading(false)
      setError('')
      return undefined
    }
    setLoading(true)
    const timer = window.setTimeout(() => {
      searchCompanies(query)
        .then((data) => { if (alive) { setResults(data); setError('') } })
        .catch(() => { if (alive) setError('Search is temporarily unavailable.') })
        .finally(() => { if (alive) setLoading(false) })
    }, 100)
    return () => { alive = false; window.clearTimeout(timer) }
  }, [query])

  useEffect(() => {
    function onOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onOutside)
    return () => document.removeEventListener('pointerdown', onOutside)
  }, [])

  function choose(index = active) {
    const company = results.companies[index]
    if (company) {
      setOpen(false)
      navigate(`/company/${company.id}`)
    } else {
      const keywordIndex = index - results.companies.length
      const keyword = results.keywords[keywordIndex]
      if (keyword) setQuery(keyword)
      else {
        const article = results.articles?.[keywordIndex - results.keywords.length]
        if (article) {
          setOpen(false)
          navigate(`/company/${article.companyId}`)
        }
      }
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') setOpen(false)
    if (event.key === 'ArrowDown' && total) { event.preventDefault(); setActive((value) => (value + 1) % total); setOpen(true) }
    if (event.key === 'ArrowUp' && total) { event.preventDefault(); setActive((value) => (value - 1 + total) % total); setOpen(true) }
    if (event.key === 'Enter' && total) { event.preventDefault(); choose() }
  }

  return (
    <div className="search-wrap" ref={rootRef}>
      <div className={`global-search interactive-surface${open ? ' search-focused' : ''}`}>
        <Search size={19} />
        <input
          aria-label="Search companies, risk categories, or alerts"
          aria-expanded={open && Boolean(query)}
          aria-controls="global-search-results"
          aria-activedescendant={open && total ? `search-result-${active}` : undefined}
          role="combobox"
          aria-autocomplete="list"
          placeholder="Search companies, risk categories, alerts..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true) }}
          onKeyDown={onKeyDown}
        />
        {query && <button className="icon-button search-clear" aria-label="Clear search" onClick={() => { setQuery(''); setOpen(false) }}><X size={16} /></button>}
        <kbd className="search-shortcut">⌘ K</kbd>
      </div>
      {open && query.trim() && (
        <div className="search-dropdown" id="global-search-results" role="listbox" aria-label="Search results">
          {loading && <div className="search-state">Searching company and news index…</div>}
          {error && <div className="search-state error-text">{error}</div>}
          {!loading && !error && total === 0 && <div className="search-state">No companies or matching risk topics found.</div>}
          {!loading && results.companies.map((company, index) => (
            <button
              key={company.id}
              id={`search-result-${index}`}
              role="option"
              aria-selected={active === index}
              className={`search-result ${active === index ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span className="result-icon"><Building2 size={16} /></span>
              <span><strong>{company.name}</strong><small>{company.ticker} · {company.sector} · {company.articleCount} headlines · {company.category}</small></span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          {!loading && results.keywords.map((keyword, offset) => {
            const index = results.companies.length + offset
            return <button key={keyword} id={`search-result-${index}`} role="option" aria-selected={active === index} className={`search-result keyword-result ${active === index ? 'active' : ''}`} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}>
              <span className="result-icon"><Search size={15} /></span><span><strong>{keyword}</strong><small>Risk topic</small></span><CornerDownLeft size={14} />
            </button>
          })}
          {!loading && results.articles?.map((article, offset) => {
            const index = results.companies.length + results.keywords.length + offset
            return <button key={`${article.companyId}-${article.url}`} id={`search-result-${index}`} role="option" aria-selected={active === index} className={`search-result ${active === index ? 'active' : ''}`} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}>
              <span className="result-icon"><Newspaper size={15} /></span><span><strong>{article.title}</strong><small>{article.companyName} · {article.publisher}</small></span><ArrowUpRight size={15} />
            </button>
          })}
          {!loading && total > 0 && <div className="search-hint"><span>↑↓ to navigate</span><span>↵ to select</span><span>esc to close</span></div>}
        </div>
      )}
    </div>
  )
}
