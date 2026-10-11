import pg from 'pg';
const { Pool } = pg;

export function createRepository({ databaseUrl = process.env.DATABASE_URL, allowInMemory = process.env.ALLOW_IN_MEMORY === 'true' } = {}) {
  if (!databaseUrl) {
    if (!allowInMemory) throw new Error('DATABASE_URL is missing and ALLOW_IN_MEMORY is not true.');
    return createMemoryRepository();
  }
  const pool = new Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 3000 });
  pool.on('error', (error) => console.error('[postgres] idle client error:', error.message));
  return {
    mode: 'postgres',
    async health() { await pool.query('SELECT 1'); return true; },
    async saveBatch({ company, articles, events, score, summary }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO companies(id,name,aliases) VALUES($1,$2,$3::jsonb)
          ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, aliases=EXCLUDED.aliases, updated_at=NOW()`, [company.id, company.name, JSON.stringify(company.aliases)]);
        for (const article of articles) {
          await client.query(`INSERT INTO documents(id,company_id,url,title,source,published_at,content_hash,snippet,content,text_limited)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title, source=EXCLUDED.source, published_at=COALESCE(EXCLUDED.published_at,documents.published_at), content_hash=EXCLUDED.content_hash, snippet=EXCLUDED.snippet, content=EXCLUDED.content, text_limited=EXCLUDED.text_limited`,
          [article.document_id, company.id, article.url, article.title, article.source, article.published_at ?? null, article.content_hash, article.snippet, article.content, article.text_limited]);
        }
        for (const event of score.events) {
          await client.query(`INSERT INTO risk_events(company_id,document_id,event_key,category,severity,event_status,is_relevant,event_title,summary,evidence,event_date,confidence,resolution_evidence,source_quality,risk_contribution,duplicate)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
            ON CONFLICT(company_id,document_id,event_key) DO UPDATE SET category=EXCLUDED.category,severity=EXCLUDED.severity,event_status=EXCLUDED.event_status,is_relevant=EXCLUDED.is_relevant,event_title=EXCLUDED.event_title,summary=EXCLUDED.summary,evidence=EXCLUDED.evidence,event_date=EXCLUDED.event_date,confidence=EXCLUDED.confidence,resolution_evidence=EXCLUDED.resolution_evidence,source_quality=EXCLUDED.source_quality,risk_contribution=EXCLUDED.risk_contribution,duplicate=EXCLUDED.duplicate,updated_at=NOW()`,
          [company.id, event.document_id, event.event_key, event.category, event.severity, event.event_status, event.is_relevant, event.event_title, event.summary, event.evidence, event.event_date || null, event.confidence, event.resolution_evidence, event.source_quality, event.risk_contribution, event.duplicate]);
        }
        await client.query('INSERT INTO risk_snapshots(company_id,risk_index,risk_level,summary,event_count) VALUES($1,$2,$3,$4,$5)', [company.id, score.risk_index, score.risk_level, summary, score.events.filter((e) => e.risk_contribution > 0).length]);
        const previous = await client.query('SELECT risk_index, calculated_at FROM risk_snapshots WHERE company_id=$1 ORDER BY calculated_at DESC OFFSET 1 LIMIT 1', [company.id]);
        await client.query('COMMIT');
        return { previous_risk_index: previous.rows[0]?.risk_index ?? null, previous_calculated_at: previous.rows[0]?.calculated_at ?? null };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    async listCompanies() {
      const result = await pool.query(`SELECT c.id,c.name,s.risk_index,s.risk_level,s.summary,s.calculated_at
        FROM companies c LEFT JOIN LATERAL (SELECT * FROM risk_snapshots WHERE company_id=c.id ORDER BY calculated_at DESC LIMIT 1) s ON TRUE ORDER BY c.name`);
      return result.rows;
    },
    async getCompany(id) {
      const [company, snapshots, events] = await Promise.all([
        pool.query('SELECT id,name,aliases FROM companies WHERE id=$1', [id]),
        pool.query('SELECT risk_index,risk_level,summary,calculated_at FROM risk_snapshots WHERE company_id=$1 ORDER BY calculated_at DESC LIMIT 30', [id]),
        pool.query('SELECT event_key,category,severity,event_status,event_title,summary,evidence,confidence,risk_contribution,duplicate,created_at FROM risk_events WHERE company_id=$1 ORDER BY created_at DESC LIMIT 100', [id]),
      ]);
      if (!company.rows[0]) return null;
      return { ...company.rows[0], history: snapshots.rows.reverse(), events: events.rows };
    },
    async close() { await pool.end(); },
  };
}

function createMemoryRepository() {
  const companies = new Map();
  const histories = new Map();
  return {
    mode: 'memory',
    async health() { return true; },
    async saveBatch({ company, articles, events, score, summary }) {
      const old = histories.get(company.id) ?? [];
      companies.set(company.id, { id: company.id, name: company.name, aliases: company.aliases, risk_index: score.risk_index, risk_level: score.risk_level, summary, calculated_at: new Date().toISOString() });
      histories.set(company.id, [...old, { risk_index: score.risk_index, risk_level: score.risk_level, summary, calculated_at: new Date().toISOString(), events: score.events }]);
      return { previous_risk_index: old.at(-1)?.risk_index ?? null, previous_calculated_at: old.at(-1)?.calculated_at ?? null };
    },
    async listCompanies() { return [...companies.values()]; },
    async getCompany(id) {
      const company = companies.get(id); if (!company) return null;
      const history = histories.get(id) ?? [];
      return { ...company, history: history.slice(-30), events: history.at(-1)?.events ?? [] };
    },
    async close() {},
  };
}
