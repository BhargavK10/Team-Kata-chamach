# Corporate Risk Analysis Engine

Automated public data risk intelligence engine that fetches news & complaints, filters market noise, and prompts Gemini to produce an **Overall Risk Score (0–100)** and individual threat classifications.

---

## 📁 Repository Structure

```
├── fetch_and_analyze.py   # Core pipeline: fetches 5 news + 5 complaints -> Gemini -> 0-100 Score
├── api.py                 # REST API endpoints for your backend & frontend UI graphs
├── models.py              # Pydantic schemas (CompanyRiskAssessment, RiskAnalysisOutput)
├── prompts.py             # System context, rules, and scoring prompt
├── requirements.txt       # Dependencies
└── .env                   # GEMINI_API_KEY configuration
```

---

## 🚀 1. Run the Pipeline Directly

To run the pipeline and generate the risk assessment for any company:

```powershell
.\.venv\Scripts\python.exe fetch_and_analyze.py "Wells Fargo"
```

*(Replace `"Wells Fargo"` with any target company or keyword).*

### Actual Output Sample:
```json
{
  "company_name": "Wells Fargo",
  "timestamp": "2026-10-11T09:03:31.919257+00:00",
  "overall_risk_score": 35,
  "risk_level": "Moderate",
  "score_rationale": "Wells Fargo exhibits moderate risk driven by an active federal administration probe into its homeownership lending practices alongside recurring CFPB consumer grievances. The remaining market media represents routine financial coverage, limiting immediate systemic disruption.",
  "total_evaluated_items": 10,
  "escalated_threats_count": 6,
  "noise_items_count": 4,
  "analyzed_items": [
    {
      "analyzed_company": "Wells Fargo",
      "source_type": "TheGrio",
      "risk_category": "Regulatory/Compliance",
      "severity_score": 3,
      "key_entities": ["Trump administration", "Wells Fargo"],
      "threat_summary": "Federal administration scrutiny and probe into Wells Fargo lending initiatives presents compliance and reputational risk.",
      "escalate_to_index": true
    },
    {
      "analyzed_company": "Wells Fargo",
      "source_type": "Barchart.com",
      "risk_category": "Noise",
      "severity_score": 0,
      "key_entities": ["Wells Fargo"],
      "threat_summary": "Routine update",
      "escalate_to_index": false
    }
  ]
}
```

---

## 🌐 2. REST API Endpoints (For Backend & UI Graph Integration)

Start the REST API server:
```powershell
.\.venv\Scripts\python.exe api.py
```
Server runs at `http://localhost:8000`.

### Endpoints:

#### 1. Evaluate Risk & Get Score (0–100)
- **Method:** `GET /api/risk-score?company={company_name}`
- **Example:** `GET http://localhost:8000/api/risk-score?company=Wells+Fargo`
- **Response:** Complete JSON object containing `overall_risk_score`, `risk_level`, `score_rationale`, and all 10 evaluated items.

#### 2. Trigger via POST (For Backend Pipelines)
- **Method:** `POST /api/analyze`
- **Body:**
  ```json
  { "company": "Wells Fargo" }
  ```

#### 3. Time-Series Data for Frontend UI Graphs
- **Method:** `GET /api/history?company={company_name}`
- **Response:** Array of historical assessment scores ready for charting libraries (Chart.js, Recharts, ApexCharts):
  ```json
  [
    {
      "timestamp": "2026-10-11T09:03:31Z",
      "company_name": "Wells Fargo",
      "overall_risk_score": 35,
      "risk_level": "Moderate"
    }
  ]
  ```

---

## 🗄️ Database Schema Suggestion (For Backend Engineer)

To persist this data for long-term historical plotting:

```sql
CREATE TABLE company_risk_scores (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    overall_risk_score INT NOT NULL CHECK (overall_risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(50) NOT NULL,
    score_rationale TEXT,
    escalated_threats INT DEFAULT 0,
    noise_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_payload JSONB
);
```
