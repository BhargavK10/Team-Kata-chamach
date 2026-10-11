# Corporate Risk Radar — processing service MVP

Node.js + Express + Gemini structured extraction + PostgreSQL. Designed for hackathon iteration, not production financial decisions.

## Requirements
- Node.js 22+
- Gemini API key from Google AI Studio
- PostgreSQL 15+ (optional for a quick local smoke test; in-memory mode is not persistent)

## Setup
```bash
cp .env.example .env
# edit GEMINI_API_KEY and DATABASE_URL
npm install
```

Create the database (example):
```bash
createdb risk_radar
psql "$DATABASE_URL" -f src/db/schema.sql
```

Run:
```bash
npm run dev
```

If you don't have Postgres ready yet, keep `ALLOW_IN_MEMORY=true` in `.env`. The API will run but data is lost on restart. Gemini is still required for `/api/risk/process`.

## API
- `GET /` service metadata
- `GET /api/risk/health` service/database health
- `POST /api/risk/process` classify and score one company's article batch
- `GET /api/risk/companies` latest snapshots
- `GET /api/risk/companies/:id` company history and recent events

Example:
```bash
curl -s http://localhost:8080/api/risk/process \
  -H 'Content-Type: application/json' \
  --data-binary @tests/sample-request.json | jq
```

## Input contract
```json
{
  "company": { "id": "company_001", "name": "Example Financial Ltd", "aliases": ["EFL"] },
  "articles": [{
    "url": "https://publisher.example/article",
    "title": "Headline",
    "snippet": "Short text if full content is unavailable",
    "content": "Optional full text",
    "source": "Publisher",
    "published_at": "2026-10-11T08:30:00Z",
    "keyword": "regulatory investigation"
  }]
}
```
Each article needs either `url` or stable `id`, and at least one of `content` or `snippet`. `published_at` must be ISO-8601 with timezone if supplied.

## Current limitations to know before demo
1. The scorer currently scores the incoming batch; the next iteration should load existing active events and aggregate the historical state before writing the snapshot. The snapshot API stores history, but it is not yet the source of scoring state.
2. Event grouping uses category + normalized title. For a hackathon MVP, review collisions and missed duplicates using real examples.
3. Source-quality weights and aggregation constant are provisional, not calibrated. Treat the index as a transparent signal, not default probability or share-price prediction.
4. Gemini output is schema-validated, but still needs curated evaluation against labelled examples.
5. Do not use model confidence as truth. Keep source URLs and evidence visible in the UI.

## Run tests
```bash
npm test
```
