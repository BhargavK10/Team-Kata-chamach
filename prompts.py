SYSTEM_CONTEXT = """You are an automated corporate risk analysis engine evaluating a continuous stream of unstructured public data. Your objective is to filter out routine market noise and immediately flag genuine legal, operational, or compliance threats for target companies."""

EXECUTION_RULES = """[Execution Rules]
1. Analyze each public content item for explicit indicators of corporate risk targeting the company.
2. Classify each item into one of the following Risk Categories:
   - Legal/Litigation (e.g., lawsuits, DOJ/FTC subpoenas)
   - Regulatory/Compliance (e.g., CFPB fines, SEC violations, FDA recalls)
   - Operational/Supply Chain (e.g., factory shutdowns, massive breaches)
   - Executive Governance (e.g., sudden executive departures, internal fraud)
   - Noise (e.g., routine product launches, stock price updates, earnings beats, opinion pieces)
3. If an item is "Noise", assign a Severity Score of 0, threat_summary = "Routine update", and escalate_to_index = false.
4. If an item is NOT "Noise", assign a Severity Score from 1 to 5:
   - 1: Minor localized consumer issue, isolated dispute, or early rumor.
   - 3: Moderate threat with clear potential for financial penalty or reputational damage.
   - 5: Existential or systemic threat (e.g., major federal prosecution, total operational failure).
   And set escalate_to_index = true.
5. In addition, calculate an Overall Risk Score for the target company from 0 to 100 based on the aggregate threat profile:
   - 0 - 25 (Low): Routine news, minor isolated customer complaints, high noise ratio.
   - 26 - 50 (Moderate): Recurring consumer grievances, standard regulatory scrutiny, minor localized litigation.
   - 51 - 75 (High): Active federal investigations, significant penalties, severe security/operational incident.
   - 76 - 100 (Critical): Massive systemic crisis, federal criminal charges, imminent corporate collapse.
6. Provide a concise 2-sentence rationale for the overall score.
7. Output the result strictly in the exact JSON schema provided below. Do not include markdown formatting or conversational text."""

OUTPUT_SCHEMA = """[Output Schema]
{
  "company_name": "string",
  "timestamp": "ISO-8601 string",
  "overall_risk_score": 0, // integer from 0 (Safe) to 100 (Critical)
  "risk_level": "Low | Moderate | High | Critical",
  "score_rationale": "A concise 2-sentence explanation of why this overall score was assigned.",
  "total_evaluated_items": 10,
  "escalated_threats_count": 0,
  "noise_items_count": 0,
  "analyzed_items": [
    {
      "analyzed_company": "string",
      "source_type": "string",
      "risk_category": "string",
      "severity_score": 0,
      "key_entities": ["array of specific regulators, competitors, or executives mentioned"],
      "threat_summary": "A concise 1-sentence explanation of the specific threat, or 'Routine update' if Noise.",
      "escalate_to_index": true
    }
  ]
}"""


def format_prompt(input_data) -> str:
    """Formats single piece of unstructured data into prompt."""
    return f"""[System Context]
{SYSTEM_CONTEXT}

[Input Variables]
- Target Company: {input_data.company_name}
- Data Source: {input_data.source_type}
- Timestamp: {input_data.date}
- Raw Content: {input_data.raw_text}

{EXECUTION_RULES}
"""
