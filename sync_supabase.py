"""
Supabase Database Verification & Sync Tool
=========================================
Checks the Supabase connection and syncs local risk assessment history into the Supabase table.
"""

import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
LOCAL_HISTORY_FILE = "risk_history.json"


def check_and_sync():
    print("=" * 60)
    print("Corporate Risk Radar — Supabase Diagnostic & Sync")
    print("=" * 60)

    if not SUPABASE_URL:
        print("\n[!] SUPABASE_URL is currently empty in .env!")
        print("\nTo fix this:")
        print("1. Open your Supabase Dashboard: https://supabase.com/dashboard")
        print("2. Select your project -> Go to 'Project Settings' -> 'API'")
        print("3. Copy the 'Project URL' (e.g., https://your-project-id.supabase.co)")
        print("4. Paste it into your .env file as:")
        print("   SUPABASE_URL=https://your-project-id.supabase.co")
        print("5. Run the SQL script 'supabase_schema.sql' in your Supabase SQL Editor.")
        print("6. Run this script again: python sync_supabase.py\n")
        return False

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    print(f"\n[+] Testing connection to: {SUPABASE_URL}...")
    try:
        url = f"{SUPABASE_URL}/rest/v1/company_risk_history?select=count"
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            print("  [OK] Successfully connected to table 'company_risk_history'!")
        elif res.status_code == 404:
            print("  [!] Connection reached Supabase, but table 'company_risk_history' does not exist yet.")
            print("      Please run the SQL commands in 'supabase_schema.sql' via your Supabase SQL Editor.")
            return False
        else:
            print(f"  [!] Supabase returned status {res.status_code}: {res.text}")
            return False
    except Exception as e:
        print(f"  [!] Connection failed: {e}")
        return False

    # Sync local history into Supabase if file exists
    if os.path.exists(LOCAL_HISTORY_FILE):
        try:
            with open(LOCAL_HISTORY_FILE, "r", encoding="utf-8") as f:
                records = json.load(f)
            print(f"\n[+] Found {len(records)} local records in {LOCAL_HISTORY_FILE}. Syncing to Supabase...")
            synced = 0
            for r in records:
                row = {
                    "company_name": r.get("company_name", "Unknown"),
                    "timestamp": r.get("timestamp"),
                    "overall_risk_score": int(r.get("overall_risk_score", 0)),
                    "risk_level": r.get("risk_level", "Low"),
                    "escalated_threats_count": int(r.get("escalated_threats_count", 0)),
                    "noise_items_count": int(r.get("noise_items_count", 0)),
                    "score_rationale": r.get("score_rationale", ""),
                }
                write_res = requests.post(
                    f"{SUPABASE_URL}/rest/v1/company_risk_history",
                    json=row,
                    headers=headers,
                    timeout=5,
                )
                if write_res.status_code in [200, 201]:
                    synced += 1
            print(f"  [OK] Successfully synced {synced}/{len(records)} records to Supabase table!")
        except Exception as e:
            print(f"  [!] Sync error: {e}")

    return True


if __name__ == "__main__":
    check_and_sync()
