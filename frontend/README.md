# COR.P ANALYSIS

React + Vite frontend with a local Node.js API, SQLite user database, and a seven-day headline metadata importer for 101 tracked public companies.

## Run

```sh
npm install
npm run dev
```

The development command starts the API on `http://localhost:4179` and Vite on `http://localhost:5182` (bound to all local interfaces to avoid collisions with other development servers). Vite proxies `/api` requests to the backend. The SQLite database is created at `.data/risk-radar.sqlite`; override it with `DATABASE_PATH` in the environment or a local `.env` file based on `.env.example`.

Sign-up and sign-in are handled by the API. Passwords are salted and hashed with Node's built-in scrypt implementation. The backend stores users and expiring sessions in SQLite. Do not expose this development API publicly without adding production-grade HTTPS, secret/session management, account recovery, and deployment controls.

## News collection and CSV exports

`data/companies.csv` is the tracked-company universe (101 rows). On backend start, the importer queries Google News RSS for each company over the most recent seven days. Requests are sequential and throttled; a provider rate limit pauses the import rather than continuing to send requests. Refresh can also be started from the dashboard after signing in.

The importer persists headline, publisher, published timestamp, Google News article link, publisher URL, and a transparent keyword-match label in SQLite. It does not download article bodies, verify a story, or make a legal, financial, or corporate-risk finding. The headline term list and categories are simple matching heuristics; review the linked source and its publication context.

CSV exports are written under `data/` and refreshed as feeds are processed:

- `company_news_snapshot.csv`: one row for every tracked company, including article counts, the most recent headline/link where available, and a feed status.
- `news_articles.csv`: source-attributed article metadata, one row per company/article relationship.

Download the exports from the dashboard, or use `GET /api/exports/company-news.csv` and `GET /api/exports/news-articles.csv`. Before the initial import completes, the company snapshot is still available and clearly marks feeds that have not been fetched. If a provider returns HTTP 429, wait for its cooldown and start a new refresh.

## API

- `GET /api/health`
- `GET /api/companies` and `GET /api/companies/:companyId`
- `GET /api/risk/overview?companyIds=...`
- `GET /api/search?q=...`
- `GET /api/companies/:companyId/news`
- `GET /api/companies/:companyId/report`
- `GET /api/news/status`
- `POST /api/news/refresh` (requires a signed-in session; `{ "days": 7 }`)
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- CSV download routes listed above

The “risk keyword headline” count is only a review cue derived from headline text. It is not a risk score, verified fact, or investment recommendation.
