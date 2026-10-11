"""
Corporate Risk Analysis Engine (News + Complaints -> Gemini -> 0-100 Score)
=============================================================================
Step 1: Input target keyword / company name.
Step 2: Fetch 5 news articles with descriptions (Google News RSS / NewsAPI).
Step 3: Fetch 5 consumer complaints (CFPB Public API).
Step 4: Structure into prompt requesting 0-100 overall score + item-level classification.
Step 5: Return structured JSON suitable for backend storage and UI graph plotting.
"""

import os
import re
import html
import json
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import List, Dict, Any

import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types

from models import CompanyRiskAssessment
from prompts import SYSTEM_CONTEXT, EXECUTION_RULES, OUTPUT_SCHEMA

load_dotenv()


# =====================================================================
# STEP 2: Fetch 5 News Articles per Keyword
# =====================================================================
def fetch_news_articles(keyword: str, max_articles: int = 5) -> List[Dict[str, str]]:
    """
    Fetches up to 5 news articles with title, date, source, and a short description.
    Uses Google News RSS (100% free, no API key required).
    Falls back to NewsAPI.org if NEWS_API_KEY is in .env.
    """
    articles = []

    # Optional NewsAPI.org integration
    news_api_key = os.getenv("NEWS_API_KEY")
    if news_api_key:
        try:
            url = f"https://newsapi.org/v2/everything?q={urllib.parse.quote(keyword)}&pageSize={max_articles}&apiKey={news_api_key}"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                for art in res.json().get("articles", [])[:max_articles]:
                    articles.append({
                        "title": art.get("title", "No Title"),
                        "source": art.get("source", {}).get("name", "News"),
                        "date": (art.get("publishedAt") or "")[:10] or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        "description": (art.get("description") or art.get("content") or "No description")[:250],
                    })
                return articles
        except Exception:
            pass

    # Default: Google News RSS
    try:
        query = urllib.parse.quote(keyword)
        rss_url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
        response = requests.get(rss_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        
        if response.status_code == 200:
            root = ET.fromstring(response.content)
            items = root.findall(".//item")[:max_articles]
            
            for item in items:
                title = item.find("title").text if item.find("title") is not None else "No Title"
                pub_date = item.find("pubDate").text if item.find("pubDate") is not None else ""
                try:
                    dt = datetime.strptime(pub_date[:16], "%a, %d %b %Y")
                    date_str = dt.strftime("%Y-%m-%d")
                except Exception:
                    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

                raw_desc = item.find("description").text if item.find("description") is not None else ""
                clean_desc = re.sub(r"<[^>]+>", " ", raw_desc)
                clean_desc = html.unescape(clean_desc).strip()
                if not clean_desc or clean_desc == title:
                    clean_desc = f"Public news coverage regarding {keyword}: {title}"

                source = "Google News"
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    title = parts[0]
                    source = parts[1]

                articles.append({
                    "title": title,
                    "source": source,
                    "date": date_str,
                    "description": clean_desc[:250],
                })
    except Exception as e:
        print(f"  [!] Error fetching news: {e}")

    return articles


# =====================================================================
# STEP 3: Fetch 5 Complaints per Keyword (CFPB Public API)
# =====================================================================
def fetch_complaints(keyword: str, max_complaints: int = 5) -> List[Dict[str, str]]:
    """
    Fetches up to 5 complaints from the free public CFPB Consumer Complaint Database API.
    """
    complaints = []

    try:
        query = urllib.parse.quote(keyword)
        api_url = f"https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?search_term={query}&size={max_complaints}"
        res = requests.get(api_url, timeout=12)

        if res.status_code == 200:
            hits = res.json().get("hits", {}).get("hits", [])
            for hit in hits:
                src = hit.get("_source", {})
                complaint_id = hit.get("_id", "N/A")
                company = src.get("company", keyword)
                date_received = (src.get("date_received") or "")[:10] or "N/A"
                issue = src.get("issue", "Consumer Dispute")
                sub_issue = src.get("sub_issue") or ""
                narrative = src.get("complaint_what_happened") or ""

                desc_parts = [f"Issue: {issue}"]
                if sub_issue:
                    desc_parts.append(f"Sub-issue: {sub_issue}")
                if narrative:
                    desc_parts.append(f"Details: {narrative.replace(chr(10), ' ').strip()[:180]}...")
                desc = " | ".join(desc_parts)

                complaints.append({
                    "complaint_id": complaint_id,
                    "company": company,
                    "source": "CFPB Consumer Complaints",
                    "date": date_received,
                    "description": desc,
                })
    except Exception as e:
        print(f"  [!] Error fetching complaints: {e}")

    return complaints


# =====================================================================
# STEP 4: Build Formatted Prompt for Gemini
# =====================================================================
def build_assessment_prompt(company_name: str, items: List[Dict[str, str]]) -> str:
    """Builds the prompt instructing Gemini to evaluate items and assign a 0-100 overall score."""
    items_block = ""
    for i, it in enumerate(items, 1):
        items_block += f"""
--- Item #{i} ---
Target Company: {company_name}
Data Source: {it['source']}
Timestamp: {it['date']}
Raw Content: {it['text']}
"""

    iso_now = datetime.now(timezone.utc).isoformat()

    return f"""[System Context]
{SYSTEM_CONTEXT}

You are evaluating public data (5 news articles and 5 consumer complaints) for '{company_name}'.
Current Assessment Timestamp: {iso_now}

{EXECUTION_RULES}

[Public Items to Evaluate]
{items_block}

{OUTPUT_SCHEMA}
"""


# =====================================================================
# STEP 5: Call Gemini & Return CompanyRiskAssessment
# =====================================================================
def assess_company_risk(keyword: str) -> CompanyRiskAssessment:
    """
    Main pipeline function:
    1. Fetches 5 news + 5 complaints.
    2. Calls Gemini with fallback models.
    3. Returns parsed CompanyRiskAssessment containing the 0-100 score and item evaluations.
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise ValueError("GEMINI_API_KEY is not configured in .env")

    client = genai.Client(api_key=gemini_key)

    # 1. Fetch 5 news
    news = fetch_news_articles(keyword, max_articles=5)
    
    # 2. Fetch 5 complaints
    complaints = fetch_complaints(keyword, max_complaints=5)

    items_to_analyze = []
    for art in news:
        items_to_analyze.append({
            "source": art["source"],
            "date": art["date"],
            "text": f"{art['title']}. {art['description']}",
        })
    for comp in complaints:
        items_to_analyze.append({
            "source": comp["source"],
            "date": comp["date"],
            "text": f"Complaint ID {comp['complaint_id']}: {comp['description']}",
        })

    if not items_to_analyze:
        raise RuntimeError(f"No public data could be retrieved for keyword: '{keyword}'")

    prompt = build_assessment_prompt(keyword, items_to_analyze)

    # Candidate models for reliability
    candidate_models = ["gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-3.8-flash"]

    import time
    for model_name in candidate_models:
        for attempt in range(3):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CompanyRiskAssessment,
                        system_instruction=SYSTEM_CONTEXT,
                        temperature=0.0,
                    ),
                )
                raw_json = response.text.strip()
                return CompanyRiskAssessment.model_validate_json(raw_json)
            except Exception as e:
                err_str = str(e)
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    time.sleep(2)
                else:
                    break

    raise RuntimeError("Failed to obtain assessment across available Gemini models.")


# =====================================================================
# CLI EXECUTION
# =====================================================================
def main():
    import sys
    keyword = sys.argv[1] if len(sys.argv) > 1 else "Wells Fargo"

    print("=" * 65)
    print(f" FETCHING & EVALUATING CORPORATE RISK FOR: '{keyword}'")
    print("=" * 65)

    assessment = assess_company_risk(keyword)

    # Output pure JSON
    json_output = assessment.model_dump_json(indent=2)

    # Print summary banner
    print(f"\nTarget Company:      {assessment.company_name}")
    print(f"Timestamp:           {assessment.timestamp}")
    print(f"Overall Risk Score:  {assessment.overall_risk_score} / 100")
    print(f"Risk Level Tier:     {assessment.risk_level.upper()}")
    print(f"Threats Escalated:   {assessment.escalated_threats_count} of {assessment.total_evaluated_items}")
    print(f"Noise Filtered:      {assessment.noise_items_count}")
    print(f"Rationale:           {assessment.score_rationale}\n")

    print("-" * 65)
    print("ACTUAL RAW JSON OUTPUT (Strict Schema for UI Graph / Backend):")
    print("-" * 65)
    print(json_output)

    # Save to disk
    out_file = f"risk_assessment_{keyword.replace(' ', '_').lower()}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(json_output)
    print(f"\n[Saved to {out_file}]")


if __name__ == "__main__":
    main()
