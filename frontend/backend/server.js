import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { dataDirectory, db } from './database.js'
import { writeNewsCsvExports } from './csvExports.js'
import { getNewsJob, startNewsImport } from './newsImport.js'

const scrypt = promisify(scryptCallback)
const PORT = Number(process.env.API_PORT) || 4179
const SESSION_DAYS = 7
const rateLimits = new Map()
const companyColors = ['#a4e66d', '#f3ba70', '#8caeff', '#ff797f', '#bf9aff', '#7dd9c1', '#e4a3cf']

const selectCompanyRows = db.prepare(`
  SELECT c.company_id, c.name, c.ticker, c.sector, c.country,
    COUNT(DISTINCT CASE WHEN a.published_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') THEN ca.article_id END) AS article_count,
    COUNT(DISTINCT CASE WHEN a.published_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') AND a.headline_signal != 'General coverage' THEN ca.article_id END) AS risk_keyword_count,
    MAX(CASE WHEN a.published_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') THEN a.published_at END) AS latest_published_at,
    crr.overall_risk_score, crr.risk_level, crr.escalated_threats_count, crr.noise_items_count
  FROM companies c
  LEFT JOIN company_articles ca ON ca.company_id = c.company_id
  LEFT JOIN news_articles a ON a.article_id = ca.article_id
  LEFT JOIN company_risk_reports crr ON crr.company_id = c.company_id
  GROUP BY c.company_id
  ORDER BY c.name
`)
const selectCompanyArticles = db.prepare(`
  SELECT a.article_id AS articleId, a.title, a.publisher, a.publisher_url AS publisherUrl,
    a.published_at AS publishedAt, a.url, a.headline_signal AS headlineSignal,
    a.matched_terms AS matchedTerms
  FROM company_articles ca
  JOIN news_articles a ON a.article_id = ca.article_id
  WHERE ca.company_id = ? AND a.published_at >= ?
  ORDER BY a.published_at DESC
  LIMIT ?
`)
const selectRecentAlerts = db.prepare(`
  SELECT c.company_id AS companyId, c.name AS companyName, c.ticker,
    a.title, a.publisher, a.published_at AS publishedAt, a.url,
    a.headline_signal AS headlineSignal, a.matched_terms AS matchedTerms
  FROM company_articles ca
  JOIN companies c ON c.company_id = ca.company_id
  JOIN news_articles a ON a.article_id = ca.article_id
  WHERE a.headline_signal != 'General coverage' AND a.published_at >= ?
  ORDER BY a.published_at DESC
  LIMIT 8
`)

const LOGODEV_PUB_KEY = process.env.LOGODEV_PUBLISHABLE_KEY || 'pk_H-lf1z_7R36u6_YQr-7nnA'

const KNOWN_DOMAINS = {
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'AMZN': 'amazon.com',
  'NVDA': 'nvidia.com',
  'GOOGL': 'google.com',
  'META': 'meta.com',
  'BRK.B': 'berkshirehathaway.com',
  'LLY': 'lilly.com',
  'AVGO': 'broadcom.com',
  'JPM': 'jpmorganchase.com',
  'TSLA': 'tesla.com',
  'WMT': 'walmart.com',
  'XOM': 'exxonmobil.com',
  'V': 'visa.com',
  'MA': 'mastercard.com',
  'UNH': 'unitedhealthgroup.com',
  'ORCL': 'oracle.com',
  'COST': 'costco.com',
  'PG': 'pg.com',
  'JNJ': 'jnj.com',
  'HD': 'homedepot.com',
  'NFLX': 'netflix.com',
  'ABBV': 'abbvie.com',
  'BAC': 'bankofamerica.com',
  'WFC': 'wellsfargo.com',
  'BA': 'boeing.com',
  'CVX': 'chevron.com',
  'KO': 'coca-cola.com',
  'PEP': 'pepsico.com',
  'TMO': 'thermofisher.com',
  'ADBE': 'adobe.com',
  'CSCO': 'cisco.com',
  'INTC': 'intel.com',
  'AMD': 'amd.com',
  'QCOM': 'qualcomm.com',
  'IBM': 'ibm.com',
  'TXN': 'ti.com',
  'CRM': 'salesforce.com',
  'CAT': 'caterpillar.com',
  'GE': 'ge.com',
  'DIS': 'disney.com',
  'MCD': 'mcdonalds.com',
  'NKE': 'nike.com',
  'SBUX': 'starbucks.com',
  'PFE': 'pfizer.com',
  'MRK': 'merck.com',
  'ABT': 'abbott.com',
  'BMY': 'bms.com',
  'AMGN': 'amgen.com',
  'GILD': 'gilead.com',
  'C': 'citigroup.com',
  'MS': 'morganstanley.com',
  'GS': 'goldmansachs.com',
  'AXP': 'americanexpress.com',
  'BLK': 'blackrock.com',
  'SCHW': 'schwab.com',
  'USB': 'usbank.com',
  'PNC': 'pnc.com',
  'T': 'att.com',
  'VZ': 'verizon.com',
  'TMUS': 't-mobile.com',
  'CMCSA': 'comcastcorporation.com',
  'UPS': 'ups.com',
  'FDX': 'fedex.com',
  'RTX': 'rtx.com',
  'LMT': 'lockheedmartin.com',
  'HON': 'honeywell.com',
  'UNP': 'up.com',
  'DE': 'deere.com',
  'COP': 'conocophillips.com',
  'SLB': 'slb.com',
  'EOG': 'eogresources.com',
  'NEE': 'nexteraenergy.com',
  'DUK': 'duke-energy.com',
  'SO': 'southerncompany.com',
  'LIN': 'linde.com',
  'APD': 'airproducts.com',
  'SHW': 'sherwin-williams.com',
  'PLD': 'prologis.com',
  'AMT': 'americantower.com',
  'EQIX': 'equinix.com',
  'SPG': 'simon.com',
  'O': 'realtyincome.com'
}

function getCompanyLogoUrl(ticker, name) {
  const domain = KNOWN_DOMAINS[ticker] || `${(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
  return `https://img.logo.dev/${domain}?token=${LOGODEV_PUB_KEY}`
}

function companyDto(row) {
  const articleCount = Number(row.article_count)
  const riskKeywordCount = Number(row.risk_keyword_count)
  const hasRiskScore = row.overall_risk_score !== null && row.overall_risk_score !== undefined
  const riskScore = hasRiskScore ? Number(row.overall_risk_score) : null
  const riskLevel = row.risk_level || (riskScore !== null ? (riskScore <= 24 ? 'Low' : riskScore <= 49 ? 'Moderate' : riskScore <= 74 ? 'High' : 'Critical') : null)
  const category = riskLevel ? `${riskLevel} Risk` : (!articleCount ? 'No coverage' : riskKeywordCount ? 'Risk keywords' : 'Coverage')
  return {
    id: row.company_id,
    name: row.name,
    ticker: row.ticker,
    sector: row.sector,
    country: row.country,
    articleCount,
    riskKeywordCount,
    riskScore,
    riskLevel,
    escalatedThreatsCount: row.escalated_threats_count !== null ? Number(row.escalated_threats_count) : null,
    noiseItemsCount: row.noise_items_count !== null ? Number(row.noise_items_count) : null,
    color: companyColors[row.ticker.charCodeAt(0) % companyColors.length],
    latestPublishedAt: row.latest_published_at,
    category,
    logoUrl: getCompanyLogoUrl(row.ticker, row.name),
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(data))
}

async function readBody(request, limit = 1024 * 1024) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw Object.assign(new Error('Request body must contain valid JSON.'), { status: 400 })
  }
}

function enforceRateLimit(request) {
  const ip = request.socket.remoteAddress ?? 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const current = rateLimits.get(ip) ?? { count: 0, expiresAt: now + windowMs }
  if (now >= current.expiresAt) {
    current.count = 0
    current.expiresAt = now + windowMs
  }
  current.count += 1
  rateLimits.set(ip, current)
  if (current.count > 15) throw Object.assign(new Error('Too many authentication attempts. Try again in 15 minutes.'), { status: 429 })
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function readBearerToken(request) {
  const match = request.headers.authorization?.match(/^Bearer ([\da-f]{64})$/i)
  return match?.[1] ?? null
}

function findSession(request) {
  const token = readBearerToken(request)
  if (!token) return null
  const now = new Date().toISOString()
  const session = db.prepare(`
    SELECT u.user_id AS id, u.name, u.email, s.expires_at AS expiresAt
    FROM sessions s JOIN users u ON u.user_id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(tokenHash(token), now)
  if (!session) return null
  return { ...session, token }
}

async function hashPassword(password, salt) {
  return scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
}

async function createSession(response, user) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now.toISOString())
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(tokenHash(token), user.id, expiresAt, now.toISOString())
  sendJson(response, 200, { user: { name: user.name, email: user.email }, token, expiresAt })
}

function articleDto(row) {
  let matchedTerms
  try {
    matchedTerms = JSON.parse(row.matchedTerms)
  } catch {
    matchedTerms = []
  }
  return { ...row, matchedTerms }
}

function buildTrend(days) {
  const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
  const rows = db.prepare(`
    SELECT substr(a.published_at, 1, 10) AS date, COUNT(*) AS articleCount
    FROM company_articles ca JOIN news_articles a ON a.article_id = ca.article_id
    WHERE a.published_at >= ?
    GROUP BY substr(a.published_at, 1, 10)
  `).all(start.toISOString())
  const counts = new Map(rows.map((row) => [row.date, Number(row.articleCount)]))
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return { date, articleCount: counts.get(date) ?? 0 }
  })
}

async function route(request, response, url) {
  const { pathname, searchParams } = url

  if (request.method === 'GET' && pathname === '/api/health') {
    const companyCount = db.prepare('SELECT COUNT(*) AS count FROM companies').get().count
    const articleCount = db.prepare('SELECT COUNT(*) AS count FROM news_articles').get().count
    return sendJson(response, 200, {
      status: 'ok',
      companyCount,
      articleCount,
      newsRefresh: getNewsJob(),
      newsSource: 'Google News RSS',
      dataWindowDays: 7,
    })
  }

  if (request.method === 'POST' && pathname === '/api/auth/signup') {
    enforceRateLimit(request)
    const body = await readBody(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (name.length < 2 || name.length > 100) return sendJson(response, 400, { error: 'Name must be between 2 and 100 characters.' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return sendJson(response, 400, { error: 'Enter a valid email address.' })
    if (password.length < 8 || password.length > 256) return sendJson(response, 400, { error: 'Password must be between 8 and 256 characters.' })
    const salt = randomBytes(16).toString('hex')
    const passwordHash = (await hashPassword(password, salt)).toString('hex')
    try {
      const result = db.prepare('INSERT INTO users (name, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(name, email, passwordHash, salt, new Date().toISOString())
      return createSession(response, { id: Number(result.lastInsertRowid), name, email })
    } catch (error) {
      if (error.message?.includes('UNIQUE constraint failed: users.email')) return sendJson(response, 409, { error: 'An account with this email already exists.' })
      throw error
    }
  }

  if (request.method === 'POST' && pathname === '/api/auth/login') {
    enforceRateLimit(request)
    const body = await readBody(request)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const user = db.prepare('SELECT user_id AS id, name, email, password_hash, password_salt FROM users WHERE email = ? COLLATE NOCASE').get(email)
    const suppliedHash = user ? await hashPassword(password, user.password_salt) : Buffer.alloc(64)
    const storedHash = user ? Buffer.from(user.password_hash, 'hex') : Buffer.alloc(64)
    if (!user || suppliedHash.length !== storedHash.length || !timingSafeEqual(suppliedHash, storedHash)) {
      return sendJson(response, 401, { error: 'Email or password is incorrect.' })
    }
    return createSession(response, user)
  }

  if (request.method === 'GET' && pathname === '/api/auth/me') {
    const session = findSession(request)
    if (!session) return sendJson(response, 401, { error: 'Sign in to continue.' })
    return sendJson(response, 200, { user: { name: session.name, email: session.email }, expiresAt: session.expiresAt })
  }

  if (request.method === 'POST' && pathname === '/api/auth/logout') {
    const session = findSession(request)
    if (session) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(session.token))
    return sendJson(response, 200, { ok: true })
  }

  if (request.method === 'GET' && pathname === '/api/companies') {
    return sendJson(response, 200, {
      companies: selectCompanyRows.all().map(companyDto),
      source: 'data/companies.csv',
      disclaimer: 'Headline counts and keyword matches are news metadata, not verified corporate risk assessments.',
    })
  }

  if (request.method === 'GET' && pathname === '/api/risk/overview') {
    const ids = (searchParams.get('companyIds') ?? '').split(',').filter(Boolean).slice(0, 100)
    const all = selectCompanyRows.all().map(companyDto)
    const selected = ids.length ? all.filter((company) => ids.includes(company.id)) : all
    const companyIds = selected.map((company) => company.id)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const alertRows = selectRecentAlerts.all(cutoff).filter((article) => !ids.length || ids.includes(article.companyId))
    const totals = db.prepare(`
      SELECT COUNT(DISTINCT a.article_id) AS article_count,
        COUNT(DISTINCT CASE WHEN a.headline_signal != 'General coverage' THEN a.article_id END) AS risk_keyword_count
      FROM company_articles ca JOIN news_articles a ON a.article_id = ca.article_id
      WHERE a.published_at >= ?
      ${companyIds.length ? `AND ca.company_id IN (${companyIds.map(() => '?').join(',')})` : ''}
    `).get(cutoff, ...(companyIds.length ? companyIds : []))
    return sendJson(response, 200, {
      companies: selected,
      averageArticleCount: selected.length ? Math.round(selected.reduce((sum, company) => sum + company.articleCount, 0) / selected.length * 10) / 10 : 0,
      companiesWithCoverage: selected.filter((company) => company.articleCount > 0).length,
      companiesWithRiskKeywords: selected.filter((company) => company.riskKeywordCount > 0).length,
      articleCount: Number(totals.article_count),
      riskKeywordArticleCount: Number(totals.risk_keyword_count),
      alerts: alertRows.map(articleDto),
      trend: buildTrend(7),
      disclaimer: 'Article volume and title-keyword matches are not a verified risk score or a statement of fact.',
    })
  }

  if (request.method === 'GET' && pathname === '/api/search') {
    const query = (searchParams.get('q') ?? '').trim().slice(0, 100).toLowerCase()
    if (!query) return sendJson(response, 200, { companies: [], keywords: [] })
    const companies = selectCompanyRows.all()
      .filter((row) => [row.name, row.company_id, row.ticker, row.sector, row.country].some((value) => value.toLowerCase().includes(query)))
      .slice(0, 20)
      .map(companyDto)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const termRows = db.prepare(`
      SELECT DISTINCT a.headline_signal, a.matched_terms
      FROM news_articles a
      WHERE a.published_at >= ? AND (lower(a.title) LIKE ? OR lower(a.headline_signal) LIKE ? OR lower(a.matched_terms) LIKE ?)
      LIMIT 20
    `).all(cutoff, `%${query}%`, `%${query}%`, `%${query}%`)
    const knownKeywords = ['regulatory', 'legal', 'operational', 'financial', 'investigation', 'lawsuit', 'recall', 'layoff', 'breach', 'fraud', 'safety', 'strike', 'warning', 'antitrust']
    const keywords = [...new Set([
      ...knownKeywords.filter((term) => term.includes(query)),
      ...termRows.map((row) => row.headline_signal).filter((term) => term !== 'General coverage'),
      ...termRows.flatMap((row) => {
        try { return JSON.parse(row.matched_terms) } catch { return [] }
      }),
    ])]
    const articles = db.prepare(`
      SELECT c.company_id AS companyId, c.name AS companyName, c.ticker,
        a.title, a.publisher, a.published_at AS publishedAt, a.url
      FROM news_articles a
      JOIN company_articles ca ON ca.article_id = a.article_id
      JOIN companies c ON c.company_id = ca.company_id
      WHERE a.published_at >= ? AND lower(a.title) LIKE ?
      ORDER BY a.published_at DESC
      LIMIT 8
    `).all(cutoff, `%${query}%`)
    return sendJson(response, 200, { companies, keywords, articles })
  }

  const companyMatch = pathname.match(/^\/api\/companies\/([a-z0-9-]+)$/)
  if (request.method === 'GET' && companyMatch) {
    const company = selectCompanyRows.all().find((row) => row.company_id === companyMatch[1])
    if (!company) return sendJson(response, 404, { error: 'Company not found.' })
    return sendJson(response, 200, { company: companyDto(company) })
  }

  const companyNewsMatch = pathname.match(/^\/api\/companies\/([a-z0-9-]+)\/news$/)
  if (request.method === 'GET' && companyNewsMatch) {
    const company = db.prepare('SELECT company_id FROM companies WHERE company_id = ?').get(companyNewsMatch[1])
    if (!company) return sendJson(response, 404, { error: 'Company not found.' })
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const rows = selectCompanyArticles.all(company.company_id, cutoff, 50).map(articleDto)
    const riskKeywordCount = rows.filter((article) => article.headlineSignal !== 'General coverage').length
    return sendJson(response, 200, {
      articles: rows,
      articleCount: rows.length,
      riskKeywordCount,
      source: 'Google News RSS',
      disclaimer: 'Headlines are publisher content. Review the source before drawing conclusions.',
    })
  }

  const companyReportMatch = pathname.match(/^\/api\/companies\/([a-z0-9-]+)\/report$/)
  if (request.method === 'GET' && companyReportMatch) {
    const company = db.prepare('SELECT company_id, name, ticker FROM companies WHERE company_id = ?').get(companyReportMatch[1])
    if (!company) return sendJson(response, 404, { error: 'Company not found.' })
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const events = selectCompanyArticles.all(company.company_id, cutoff, 10).map((article) => ({
      date: article.publishedAt,
      title: article.title,
      text: `${article.publisher} · source article`,
      url: article.url,
    }))

    // 1. Check if we already have a recent stored risk report in SQLite
    let storedReport = db.prepare('SELECT * FROM company_risk_reports WHERE company_id = ?').get(company.company_id)
    let aiAssessment = null

    if (storedReport) {
      let items = []
      try { items = JSON.parse(storedReport.analyzed_items_json) } catch {}
      aiAssessment = {
        company_name: company.name,
        timestamp: storedReport.calculated_at,
        overall_risk_score: storedReport.overall_risk_score,
        risk_level: storedReport.risk_level,
        score_rationale: storedReport.score_rationale,
        cumulative_impact_sum: storedReport.cumulative_impact_sum,
        sensitivity_k: storedReport.sensitivity_k,
        total_evaluated_items: storedReport.total_evaluated_items,
        escalated_threats_count: storedReport.escalated_threats_count,
        noise_items_count: storedReport.noise_items_count,
        analyzed_items: items,
      }
    }

    // 2. If not stored, query the Python Risk Analysis Engine (running on port 8000) and save it
    if (!aiAssessment) {
      try {
        const pythonRes = await fetch(`http://127.0.0.1:8000/api/risk-score?company=${encodeURIComponent(company.name)}`, { signal: AbortSignal.timeout(20000) })
        if (pythonRes.ok) {
          aiAssessment = await pythonRes.json()
          // Save in company_risk_reports
          db.prepare(`
            INSERT INTO company_risk_reports (
              company_id, overall_risk_score, risk_level, score_rationale,
              cumulative_impact_sum, sensitivity_k, total_evaluated_items,
              escalated_threats_count, noise_items_count, analyzed_items_json, calculated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(company_id) DO UPDATE SET
              overall_risk_score = excluded.overall_risk_score,
              risk_level = excluded.risk_level,
              score_rationale = excluded.score_rationale,
              cumulative_impact_sum = excluded.cumulative_impact_sum,
              sensitivity_k = excluded.sensitivity_k,
              total_evaluated_items = excluded.total_evaluated_items,
              escalated_threats_count = excluded.escalated_threats_count,
              noise_items_count = excluded.noise_items_count,
              analyzed_items_json = excluded.analyzed_items_json,
              calculated_at = excluded.calculated_at
          `).run(
            company.company_id,
            aiAssessment.overall_risk_score,
            aiAssessment.risk_level,
            aiAssessment.score_rationale,
            aiAssessment.cumulative_impact_sum ?? 0.0,
            aiAssessment.sensitivity_k ?? 0.6,
            aiAssessment.total_evaluated_items ?? 10,
            aiAssessment.escalated_threats_count,
            aiAssessment.noise_items_count,
            JSON.stringify(aiAssessment.analyzed_items ?? []),
            aiAssessment.timestamp || new Date().toISOString()
          )
        }
      } catch (e) {
        console.warn(`[api] Python risk engine query for ${company.name} failed:`, e.message)
      }
    }

    return sendJson(response, 200, {
      companyId: company.company_id,
      companyName: company.name,
      status: aiAssessment ? 'verified_ai_assessment' : 'pending_analysis',
      message: aiAssessment ? aiAssessment.score_rationale : 'AI risk engine evaluating public feeds for this entity. Refresh in a few seconds.',
      overallRiskScore: aiAssessment ? aiAssessment.overall_risk_score : null,
      riskLevel: aiAssessment ? aiAssessment.risk_level : null,
      cumulativeImpactSum: aiAssessment ? aiAssessment.cumulative_impact_sum : null,
      sensitivityK: aiAssessment ? aiAssessment.sensitivity_k : 0.6,
      totalEvaluatedItems: aiAssessment ? aiAssessment.total_evaluated_items : null,
      escalatedThreatsCount: aiAssessment ? aiAssessment.escalated_threats_count : null,
      noiseItemsCount: aiAssessment ? aiAssessment.noise_items_count : null,
      analyzedItems: aiAssessment ? aiAssessment.analyzed_items : [],
      historyPoints: aiAssessment?.history_points || [],
      aiModelUsed: aiAssessment?.ai_model_used || (aiAssessment ? 'Google Gemini' : 'Evaluating'),
      events,
    })
  }

  if (request.method === 'GET' && pathname === '/api/news/status') {
    const counts = db.prepare(`
      SELECT COUNT(*) AS companyCount,
        SUM(CASE WHEN status = 'fetched' THEN 1 ELSE 0 END) AS fetchedCompanyCount,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCompanyCount,
        MAX(fetched_at) AS lastFetchedAt
      FROM company_news_fetches
    `).get()
    return sendJson(response, 200, { ...counts, job: getNewsJob(), source: 'Google News RSS', windowDays: 7 })
  }

  if (request.method === 'POST' && pathname === '/api/news/refresh') {
    if (!findSession(request)) return sendJson(response, 401, { error: 'Sign in to refresh news data.' })
    const body = await readBody(request)
    const days = body.days === undefined ? 7 : Number(body.days)
    if (!Number.isInteger(days) || days < 1 || days > 7) {
      return sendJson(response, 400, { error: 'News refresh window must be between 1 and 7 days.' })
    }
    const { job, started } = startNewsImport({ days })
    return sendJson(response, started ? 202 : 409, { job, started })
  }

  if (request.method === 'GET' && pathname === '/api/exports/company-news.csv') {
    const exportPath = path.join(dataDirectory, 'company_news_snapshot.csv')
    sendNewsExportsIfMissing()
    response.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="company_news_snapshot.csv"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    return response.end(readFileSync(exportPath))
  }

  if (request.method === 'GET' && pathname === '/api/exports/news-articles.csv') {
    sendNewsExportsIfMissing()
    response.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="news_articles.csv"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    })
    return response.end(readFileSync(path.join(dataDirectory, 'news_articles.csv')))
  }

  return sendJson(response, 404, { error: 'API route not found.' })
}

function sendNewsExportsIfMissing() {
  writeNewsCsvExports(7)
}

function writeNewsExportsIfMissing() {
  writeNewsCsvExports(7)
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5181')
    .split(',')
    .map((value) => value.trim())
  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    return response.end()
  }

  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    await route(request, response, url)
  } catch (error) {
    console.error('[api]', error)
    sendJson(response, Number(error.status) || 500, {
      error: Number(error.status) ? error.message : 'An unexpected server error occurred.',
    })
  }
})

writeNewsExportsIfMissing()
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Risk Radar API listening on http://localhost:${PORT}`)
  if (process.env.NEWS_AUTO_REFRESH !== 'false') {
    const { job, started } = startNewsImport({ days: 7 })
    if (started) console.log(`Started 7-day news import for ${job.total} companies.`)
  }
})

function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
