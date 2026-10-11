import initSqlJs from 'sql.js'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const dataDirectory = path.join(projectRoot, 'data')
const databaseDirectory = path.join(projectRoot, '.data')
mkdirSync(databaseDirectory, { recursive: true })

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(databaseDirectory, 'risk-radar.sqlite')
mkdirSync(path.dirname(databasePath), { recursive: true })

const require = createRequire(import.meta.url)
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
const SQL = await initSqlJs({ locateFile: () => wasmPath })
const sqlite = existsSync(databasePath)
  ? new SQL.Database(new Uint8Array(readFileSync(databasePath)))
  : new SQL.Database()
let transactionDepth = 0

function saveDatabase() {
  if (transactionDepth) return
  const temporaryPath = `${databasePath}.tmp`
  writeFileSync(temporaryPath, Buffer.from(sqlite.export()))
  renameSync(temporaryPath, databasePath)
}

function bindParameters(args) {
  if (args.length !== 1) return args
  const value = args[0]
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      /^[\W]/.test(key) ? key : `@${key}`,
      item,
    ]))
  }
  return args
}

export const db = {
  exec(sql) {
    sqlite.exec(sql)
    saveDatabase()
  },
  pragma(sql) {
    if (/^\s*journal_mode\b/i.test(sql)) return
    sqlite.exec(`PRAGMA ${sql}`)
    saveDatabase()
  },
  prepare(sql) {
    return {
      all(...args) {
        const statement = sqlite.prepare(sql)
        try {
          statement.bind(bindParameters(args))
          const rows = []
          while (statement.step()) rows.push(statement.getAsObject())
          return rows
        } finally {
          statement.free()
        }
      },
      get(...args) {
        const statement = sqlite.prepare(sql)
        try {
          statement.bind(bindParameters(args))
          return statement.step() ? statement.getAsObject() : undefined
        } finally {
          statement.free()
        }
      },
      run(...args) {
        sqlite.run(sql, bindParameters(args))
        const changes = sqlite.getRowsModified()
        const lastInsertRowid = sqlite.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] ?? 0
        saveDatabase()
        return { changes, lastInsertRowid }
      },
    }
  },
  transaction(callback) {
    return (...args) => {
      sqlite.run('BEGIN')
      transactionDepth += 1
      try {
        const result = callback(...args)
        sqlite.run('COMMIT')
        transactionDepth -= 1
        saveDatabase()
        return result
      } catch (error) {
        sqlite.run('ROLLBACK')
        transactionDepth -= 1
        throw error
      }
    }
  },
  close() {
    saveDatabase()
    sqlite.close()
  },
}

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    company_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    sector TEXT NOT NULL,
    country TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS news_articles (
    article_id INTEGER PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    publisher TEXT NOT NULL,
    publisher_url TEXT NOT NULL DEFAULT '',
    published_at TEXT NOT NULL,
    headline_signal TEXT NOT NULL,
    matched_terms TEXT NOT NULL DEFAULT '[]',
    fetched_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS company_articles (
    company_id TEXT NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES news_articles(article_id) ON DELETE CASCADE,
    PRIMARY KEY (company_id, article_id)
  );
  CREATE INDEX IF NOT EXISTS idx_articles_published_at ON news_articles(published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_company_articles_company ON company_articles(company_id);
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS company_news_fetches (
    company_id TEXT PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS company_risk_reports (
    company_id TEXT PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
    overall_risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    score_rationale TEXT NOT NULL,
    cumulative_impact_sum REAL NOT NULL DEFAULT 0.0,
    sensitivity_k REAL NOT NULL DEFAULT 0.6,
    total_evaluated_items INTEGER NOT NULL,
    escalated_threats_count INTEGER NOT NULL,
    noise_items_count INTEGER NOT NULL,
    analyzed_items_json TEXT NOT NULL DEFAULT '[]',
    calculated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
`)

function seedCompanies() {
  const rows = readFileSync(path.join(dataDirectory, 'companies.csv'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(','))
  if (rows.length < 100) throw new Error(`Company seed must contain at least 100 companies; found ${rows.length}.`)

  const insert = db.prepare(`
    INSERT INTO companies (company_id, name, ticker, sector, country)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(company_id) DO UPDATE SET
      name = excluded.name,
      ticker = excluded.ticker,
      sector = excluded.sector,
      country = excluded.country
  `)
  const seed = db.transaction((companies) => {
    for (const row of companies) {
      if (row.length !== 5 || row.some((field) => !field.trim())) {
        throw new Error(`Invalid company row in data/companies.csv: ${row.join(',')}`)
      }
      insert.run(...row.map((field) => field.trim()))
    }
  })
  seed(rows)
}

seedCompanies()
