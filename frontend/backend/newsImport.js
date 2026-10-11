import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { db } from './database.js'
import { writeNewsCsvExports } from './csvExports.js'
import { fetchCompanyNews } from './newsProvider.js'

const companies = db.prepare('SELECT company_id, name, ticker FROM companies ORDER BY name').all()
const upsertArticle = db.prepare(`
  INSERT INTO news_articles
    (url, title, publisher, publisher_url, published_at, headline_signal, matched_terms, fetched_at)
  VALUES (@url, @title, @publisher, @publisherUrl, @publishedAt, @headlineSignal, @matchedTerms, @fetchedAt)
  ON CONFLICT(url) DO UPDATE SET
    title = excluded.title,
    publisher = excluded.publisher,
    publisher_url = excluded.publisher_url,
    published_at = excluded.published_at,
    headline_signal = excluded.headline_signal,
    matched_terms = excluded.matched_terms,
    fetched_at = excluded.fetched_at
`)
const getArticleId = db.prepare('SELECT article_id FROM news_articles WHERE url = ?')
const attachArticle = db.prepare('INSERT OR IGNORE INTO company_articles (company_id, article_id) VALUES (?, ?)')
const saveFetchStatus = db.prepare(`
  INSERT INTO company_news_fetches (company_id, status, fetched_at, error)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(company_id) DO UPDATE SET
    status = excluded.status,
    fetched_at = excluded.fetched_at,
    error = excluded.error
`)

const jobs = new Map()
let activeJobId = null
let latestJobId = null

export function getNewsJob(jobId) {
  if (jobId) return jobs.get(jobId) ?? null
  return jobs.get(activeJobId ?? latestJobId) ?? null
}

export function getNewsRefreshState() {
  return getNewsJob()
}

export function startNewsImport({ days = 7 } = {}) {
  if (activeJobId) return { job: jobs.get(activeJobId), started: false }
  if (!Number.isInteger(days) || days < 1 || days > 7) {
    throw new Error('News refresh window must be between 1 and 7 days.')
  }
  const id = randomUUID()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  db.prepare('DELETE FROM news_articles WHERE published_at < ?').run(cutoff)
  const job = {
    id,
    status: 'running',
    days,
    total: companies.length,
    completed: 0,
    articleCount: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
  }
  jobs.set(id, job)
  activeJobId = id
  latestJobId = id
  void runJob(job)
  return { job, started: true }
}

async function runJob(job) {
  const requestDelay = Math.max(1000, Number(process.env.NEWS_REQUEST_DELAY_MS) || 1200)
  let stoppedByRateLimit = false

  try {
    for (const [index, company] of companies.entries()) {
      const fetchedAt = new Date().toISOString()
      try {
        const results = await fetchCompanyNews(company, { days: job.days })
        const save = db.transaction((articles) => {
          for (const article of articles) {
            upsertArticle.run({
              ...article,
              matchedTerms: JSON.stringify(article.matchedTerms),
              fetchedAt,
            })
            const articleId = getArticleId.get(article.url)?.article_id
            if (articleId) attachArticle.run(company.company_id, articleId)
          }
        })
        save(results)
        saveFetchStatus.run(company.company_id, 'fetched', fetchedAt, '')
        job.articleCount += results.length
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown news provider error.'
        saveFetchStatus.run(company.company_id, 'failed', fetchedAt, message.slice(0, 500))
        job.errors.push({ companyId: company.company_id, message })
        if (error?.status === 429) {
          stoppedByRateLimit = true
          break
        }
      } finally {
        job.completed += 1
        writeNewsCsvExports(job.days)
      }

      if (index < companies.length - 1) await delay(requestDelay)
    }

    if (stoppedByRateLimit) {
      job.status = 'paused_rate_limit'
      job.message = 'The news provider rate-limited this refresh. Previously saved article data remains available; retry after the provider cooldown.'
    } else if (job.errors.length === 0) {
      job.status = 'completed'
    } else {
      job.status = 'completed_with_errors'
      job.message = 'Some company feeds could not be refreshed. See errors for details.'
    }
  } catch (error) {
    job.status = 'failed'
    job.message = error instanceof Error ? error.message : 'News refresh failed.'
  } finally {
    job.completedAt = new Date().toISOString()
    try {
      job.export = writeNewsCsvExports(job.days)
    } catch (error) {
      job.status = 'failed'
      job.message = `Could not write CSV exports: ${error instanceof Error ? error.message : 'unknown error'}`
    }
    activeJobId = null
  }
}
