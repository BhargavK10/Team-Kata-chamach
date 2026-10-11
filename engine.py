import json
import os
import re
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

from models import RiskCategory, RiskAnalysisInput, RiskAnalysisOutput
from prompts import SYSTEM_CONTEXT, EXECUTION_RULES, format_prompt

# Load environment variables from .env if present
load_dotenv()


class RiskAnalysisEngine:
    """Automated corporate risk analysis engine."""

    def __init__(
        self,
        provider: str = "auto",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """
        Initialize the Risk Analysis Engine.

        :param provider: 'gemini', 'openai', 'heuristic', or 'auto'
        :param api_key: Optional API key override
        :param model: Optional model name override
        """
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model

        if self.provider == "auto":
            if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
                self.provider = "gemini"
            elif os.getenv("OPENAI_API_KEY"):
                self.provider = "openai"
            else:
                self.provider = "heuristic"

        self._init_client()

    def _init_client(self):
        if self.provider == "gemini":
            from google import genai

            key = self.api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            self.client = genai.Client(api_key=key)
            self.model = self.model or "gemini-3.8-flash"
        elif self.provider == "openai":
            from openai import OpenAI

            key = self.api_key or os.getenv("OPENAI_API_KEY")
            self.client = OpenAI(api_key=key)
            self.model = self.model or "gpt-4o-mini"
        elif self.provider == "heuristic":
            self.client = None
        else:
            raise ValueError(f"Unsupported provider: {self.provider}. Use 'gemini', 'openai', or 'heuristic'.")

    def analyze(self, item: RiskAnalysisInput) -> RiskAnalysisOutput:
        """Analyze an item and return structured RiskAnalysisOutput."""
        if self.provider == "gemini":
            return self._analyze_gemini(item)
        elif self.provider == "openai":
            return self._analyze_openai(item)
        else:
            return self._analyze_heuristic(item)

    def _analyze_gemini(self, item: RiskAnalysisInput) -> RiskAnalysisOutput:
        from google.genai import types

        prompt = format_prompt(item)
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RiskAnalysisOutput,
                system_instruction=SYSTEM_CONTEXT,
                temperature=0.0,
            ),
        )
        raw_text = response.text.strip()
        return RiskAnalysisOutput.model_validate_json(raw_text)

    def _analyze_openai(self, item: RiskAnalysisInput) -> RiskAnalysisOutput:
        prompt = format_prompt(item)
        completion = self.client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_CONTEXT},
                {"role": "user", "content": prompt},
            ],
            response_format=RiskAnalysisOutput,
            temperature=0.0,
        )
        return completion.choices[0].message.parsed

    def _analyze_heuristic(self, item: RiskAnalysisInput) -> RiskAnalysisOutput:
        """
        Rule-based heuristic evaluator for offline/mock testing and zero-dependency environments.
        """
        text = item.raw_text.lower()
        company = item.company_name.lower()

        # Known Regulatory bodies and entities
        regulator_patterns = [
            r"\bDOJ\b", r"\bFTC\b", r"\bSEC\b", r"\bCFPB\b", r"\bFDA\b",
            r"\bEPA\b", r"\bEU Commission\b", r"\bFCA\b", r"\bFCC\b"
        ]
        entities_found = set()
        for pat in regulator_patterns:
            matches = re.findall(pat, item.raw_text, re.IGNORECASE)
            for m in matches:
                entities_found.add(m.upper())

        # Check for noise patterns first
        noise_keywords = [
            "launches", "announced new product", "unveils", "quarterly earnings beat",
            "stock rises", "shares up", "price target raised", "opinion:", "editorial",
            "press release: new partnership", "q3 revenue tops estimates", "conference keynote"
        ]
        is_noise_indicator = any(kw in text for kw in noise_keywords)

        # Risk categories and indicators
        legal_keywords = [
            "lawsuit", "sued", "suing", "subpoena", "court", "antitrust",
            "class action", "patent infringement", "injunction", "indictment"
        ]
        regulatory_keywords = [
            "fine", "fined", "investigation", "probe", "violation", "penalty",
            "recall", "sanction", "enforcement action", "non-compliance", "cfpb", "sec probe"
        ]
        operational_keywords = [
            "data breach", "ransomware", "hack", "factory shutdown", "outage",
            "supply chain halt", "explosion", "fire destroys", "critical vulnerability"
        ]
        governance_keywords = [
            "resigns amid", "stepped down after", "ousted", "internal fraud",
            "embezzlement", "accounting irregularities", "whistleblower", "executive departure"
        ]

        # Entity regex for executive titles
        exec_matches = re.findall(
            r"\b(?:CEO|CFO|COO|CTO|Chairman|Director)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
            item.raw_text,
        )
        for em in exec_matches:
            entities_found.add(em)

        category = RiskCategory.NOISE
        severity = 0
        threat_summary = "Routine update"

        # Match risks
        if any(kw in text for kw in governance_keywords):
            category = RiskCategory.EXECUTIVE_GOVERNANCE
            severity = 3
            if any(term in text for term in ["fraud", "embezzlement", "irregularities", "ousted"]):
                severity = 4
            threat_summary = f"Executive governance turmoil and leadership integrity concerns for {item.company_name}."
        elif any(kw in text for kw in legal_keywords):
            category = RiskCategory.LEGAL_LITIGATION
            severity = 3
            if any(term in text for term in ["antitrust", "criminal", "massive", "doj"]):
                severity = 5
            threat_summary = f"{item.company_name} faces legal litigation issues involving {', '.join(entities_found) if entities_found else 'claims'}."
        elif any(kw in text for kw in operational_keywords):
            category = RiskCategory.OPERATIONAL_SUPPLY_CHAIN
            severity = 4
            threat_summary = f"Operational disruption and security incident affecting {item.company_name}."
        elif any(kw in text for kw in regulatory_keywords) or "cfpb" in item.source_type.lower():
            category = RiskCategory.REGULATORY_COMPLIANCE
            if any(term in text for term in ["record fine", "nationwide recall", "criminal probe", "systemic", "sec probe"]):
                severity = 5
                threat_summary = f"Severe regulatory compliance enforcement action initiated against {item.company_name}."
            elif any(term in text for term in ["fine", "investigation", "penalty", "violation", "probe", "lawsuit"]):
                severity = 3
                threat_summary = f"Regulatory scrutiny and compliance inquiry targeting {item.company_name}."
            else:
                # Individual consumer regulatory grievance logged with federal bureau
                severity = 2
                threat_summary = f"Federal regulatory consumer dispute filed with CFPB regarding {item.company_name} operations."
        elif is_noise_indicator:
            category = RiskCategory.NOISE
            severity = 0
            threat_summary = "Routine update"
        else:
            # Check for general business threats
            negative_sentiment = ["drops", "falls", "slumps", "cuts", "lays off", "downgrade", "crisis", "warning", "strike", "halt"]
            if any(w in text for w in negative_sentiment):
                category = RiskCategory.OPERATIONAL_SUPPLY_CHAIN
                severity = 2
                threat_summary = f"Adverse operational or business development reported for {item.company_name}."
            else:
                category = RiskCategory.NOISE
                severity = 0
                threat_summary = "Routine update"

        # Build verified output
        return RiskAnalysisOutput(
            analyzed_company=item.company_name,
            source_type=item.source_type,
            risk_category=category.value,
            severity_score=severity,
            key_entities=list(entities_found),
            threat_summary=threat_summary,
            escalate_to_index=severity > 0,
        )
