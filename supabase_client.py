"""
Supabase & Local Persistent Client for Corporate Risk Radar
============================================================
Handles storing and retrieving time-series risk score snapshots:
1. Supabase REST API (when SUPABASE_URL and SUPABASE_KEY are provided)
2. Local persistent fallback (risk_history.json)
"""

import json
import os
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_f5rE-XTDJhWX6FVYTqwFkQ_z-P5kL16")
LOCAL_HISTORY_FILE = "risk_history.json"


def _headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def save_risk_snapshot(record: Dict[str, Any]) -> bool:
    """
    Saves a time-stamped risk assessment snapshot to Supabase and local storage.
    """
    company_name = record.get("company_name", "Unknown")
    timestamp = record.get("timestamp") or datetime.now(timezone.utc).isoformat()
    score = int(record.get("overall_risk_score", 0))
    tier = record.get("risk_level", "Low")
    threats = int(record.get("escalated_threats_count", 0))
    noise = int(record.get("noise_items_count", 0))
    explanation = record.get("score_rationale", "")

    row = {
        "company_name": company_name,
        "timestamp": timestamp,
        "overall_risk_score": score,
        "risk_level": tier,
        "escalated_threats_count": threats,
        "noise_items_count": noise,
        "score_rationale": explanation,
    }

    # 1. Save to local fallback JSON
    history = get_company_history()
    history.append(row)
    try:
        with open(LOCAL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"  [!] Error writing local history: {e}")

    # 2. Save to Supabase table `company_risk_history` if URL is configured
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL}/rest/v1/company_risk_history"
            res = requests.post(url, json=row, headers=_headers(), timeout=5)
            if res.status_code in [200, 201]:
                return True
            else:
                print(f"  [!] Supabase write status {res.status_code}: {res.text[:120]}")
        except Exception as e:
            print(f"  [!] Supabase write exception: {e}")

    return True


def get_company_history(company_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieves time-series historical records for the line chart.
    Tries Supabase first, then falls back to local history.
    """
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            url = f"{SUPABASE_URL}/rest/v1/company_risk_history?select=*&order=timestamp.asc"
            if company_name:
                url += f"&company_name=eq.{requests.utils.quote(company_name)}"
            res = requests.get(url, headers=_headers(), timeout=5)
            if res.status_code == 200:
                data = res.json()
                if data:
                    return data
        except Exception:
            pass

    # Local fallback
    if os.path.exists(LOCAL_HISTORY_FILE):
        try:
            with open(LOCAL_HISTORY_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
                if company_name:
                    records = [r for r in records if company_name.lower() in r.get("company_name", "").lower()]
                return records
        except Exception:
            return []
    return []
