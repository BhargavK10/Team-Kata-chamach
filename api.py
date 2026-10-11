"""
Corporate Risk Assessment REST API
===================================
Provides endpoints for:
1. Triggering live risk analysis for any company keyword.
2. Returning the 0-100 overall risk score and detailed items.
3. Providing time-series data for frontend UI charts/graphs.
"""

import json
import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import CompanyRiskAssessment
from fetch_and_analyze import assess_company_risk

app = FastAPI(
    title="Corporate Risk Analysis API",
    version="1.0.0",
    description="Automated public data risk assessment engine with 0-100 score for UI visualization.",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed for specific frontends
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage cache / history file for time-series UI plotting
HISTORY_FILE = "risk_history.json"


def load_history() -> List[dict]:
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_record(record: dict):
    history = load_history()
    history.append(record)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)


class AnalyzeRequest(BaseModel):
    company: str


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Corporate Risk Analysis API",
        "endpoints": {
            "get_score": "GET /api/risk-score?company={company_name}",
            "post_analyze": "POST /api/analyze",
            "get_graph_data": "GET /api/history?company={company_name}",
        },
    }


@app.get("/api/risk-score", response_model=CompanyRiskAssessment)
def get_risk_score(company: str = Query(..., description="Target company or keyword, e.g. 'Wells Fargo'")):
    """
    Fetches 5 news articles + 5 public complaints for the given company,
    calls Gemini, calculates the 0-100 overall risk score, and stores it for UI plotting.
    """
    try:
        assessment = assess_company_risk(company)
        # Store for time-series graph plotting
        save_record({
            "company_name": assessment.company_name,
            "timestamp": assessment.timestamp,
            "overall_risk_score": assessment.overall_risk_score,
            "risk_level": assessment.risk_level,
            "escalated_threats_count": assessment.escalated_threats_count,
            "noise_items_count": assessment.noise_items_count,
        })
        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze", response_model=CompanyRiskAssessment)
def analyze_company(request: AnalyzeRequest):
    """POST endpoint for backend systems to trigger analysis."""
    return get_risk_score(company=request.company)


@app.get("/api/history")
def get_graph_data(company: Optional[str] = Query(None, description="Filter by company name")):
    """
    Returns time-series data points formatted for frontend charting libraries (Chart.js, Recharts, ApexCharts):
    Format:
    [
      { "timestamp": "2026-10-11T14:30:00Z", "company_name": "Wells Fargo", "overall_risk_score": 45 },
      ...
    ]
    """
    history = load_history()
    if company:
        history = [h for h in history if h.get("company_name", "").lower() == company.lower()]
    return history


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
