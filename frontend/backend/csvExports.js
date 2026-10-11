import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { dataDirectory, db } from './database.js'

function csvValue(value) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function createCsv(headers, rows) {
  return `${[headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n')}\r\n`
}

export function writeNewsCsvExports(days = 7) {
  mkdirSync(dataDirectory, { recursive: true })
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const companies = db.prepare(`
    SELECT c.company_id, c.name, c.ticker, c.sector, c.country,
      f.status AS fetch_status, f.fetched_at,
      COUNT(a.article_id) AS article_count,
      SUM(CASE WHEN a.headline_signal != 'General coverage' THEN 1 ELSE 0 END) AS risk_keyword_count
    FROM companies c
    LEFT JOIN company_news_fetches f ON f.company_id = c.company_id
    LEFT JOIN company_articles ca ON ca.company_id = c.company_id
    LEFT JOIN news_articles a ON a.article_id = ca.article_id AND a.published_at >= ?
    GROUP BY c.company_id
    ORDER BY c.name
  `).all(cutoff)

  const latestArticle = db.prepare(`
    SELECT a.title, a.url, a.publisher, a.published_at
    FROM company_articles ca
    JOIN news_articles a ON a.article_id = ca.article_id
    WHERE ca.company_id = ? AND a.published_at >= ?
    ORDER BY a.published_at DESC
    LIMIT 1
  `)
  const snapshotRows = companies.map((company) => {
    const latest = latestArticle.get(company.company_id, cutoff)
    return [
      company.company_id,
      company.name,
      company.ticker,
      company.sector,
      company.country,
      Number(company.article_count),
      Number(company.risk_keyword_count || 0),
      latest?.title ?? '',
      latest?.publisher ?? '',
      latest?.published_at ?? '',
      latest?.url ?? '',
      company.fetch_status ?? 'not_fetched',
      company.fetched_at ?? '',
      `Google News RSS; article metadata only; last ${days} days`,
    ]
  })
  const articles = db.prepare(`
    SELECT c.company_id, c.name AS company_name, c.ticker,
      a.title, a.publisher, a.published_at, a.url, a.publisher_url,
      a.headline_signal, a.matched_terms, a.fetched_at
    FROM company_articles ca
    JOIN companies c ON c.company_id = ca.company_id
    JOIN news_articles a ON a.article_id = ca.article_id
    WHERE a.published_at >= ?
    ORDER BY a.published_at DESC, c.name
  `).all(cutoff)
  const articleRows = articles.map((article) => [
    article.company_id,
    article.company_name,
    article.ticker,
    article.title,
    article.publisher,
    article.published_at,
    article.url,
    article.publisher_url,
    article.headline_signal,
    article.matched_terms,
    article.fetched_at,
  ])

  const snapshotPath = path.join(dataDirectory, 'company_news_snapshot.csv')
  const articlesPath = path.join(dataDirectory, 'news_articles.csv')
  writeFileSync(snapshotPath, createCsv(
    ['company_id', 'company_name', 'ticker', 'sector', 'country', `articles_last_${days}d`, `risk_keyword_headlines_last_${days}d`, 'latest_headline', 'publisher', 'published_at', 'article_url', 'fetch_status', 'fetched_at', 'data_scope'],
    snapshotRows,
  ))
  writeFileSync(articlesPath, createCsv(
    ['company_id', 'company_name', 'ticker', 'headline', 'publisher', 'published_at', 'article_url', 'publisher_url', 'headline_signal', 'matched_risk_terms', 'fetched_at'],
    articleRows,
  ))
  return { snapshotPath, articlesPath, companyCount: companies.length, articleCount: articles.length }
}
