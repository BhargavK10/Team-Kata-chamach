"""
Corporate Risk Models
Automated Corporate Risk Radar
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class RiskCategory(str, Enum):
    LEGAL_LITIGATION = "Legal/Litigation"
    REGULATORY_COMPLIANCE = "Regulatory/Compliance"
    OPERATIONAL_SUPPLY_CHAIN = "Operational/Supply Chain"
    EXECUTIVE_GOVERNANCE = "Executive Governance"
    NOISE = "Noise"


class RiskAnalysisInput(BaseModel):
    company_name: str = Field(description="Name of the target company")
    source_type: str = Field(description="Data source type (e.g., News, CFPB Complaints)")
    date: str = Field(description="Timestamp or date string of the raw item")
    raw_text: str = Field(description="Raw unstructured text content to analyze")


class ScoredEvent(BaseModel):
    """
    Evaluated public event with rating from Gemini.
    """
    analyzed_company: str = Field(description="Target company analyzed")
    source_type: str = Field(description="Source of the data")
    risk_category: str = Field(
        description="One of: 'Legal/Litigation', 'Regulatory/Compliance', 'Operational/Supply Chain', 'Executive Governance', 'Noise'"
    )
    severity_score: int = Field(
        ge=0,
        le=5,
        description="Severity: 0 for Noise, 1-5 for corporate threat level",
    )
    confidence: float = Field(
        default=0.90,
        ge=0.0,
        le=1.0,
        description="Confidence in extraction and threat fidelity (0-1)",
    )
    threat_summary: str = Field(
        description="Concise 1-sentence explanation of the threat, or 'Routine update' if Noise."
    )
    key_entities: List[str] = Field(
        default_factory=list,
        description="Regulators, competitors, executives, or agencies mentioned",
    )
    escalate_to_index: bool = Field(
        default=False,
        description="True if severity_score > 0, False otherwise",
    )
    # Legacy alias fields for backward compatibility
    scaled_impact: float = Field(default=0.0)
    recency: float = Field(default=1.0)
    novelty: float = Field(default=1.0)
    source_quality: float = Field(default=0.85)
    is_duplicate: bool = Field(default=False)

    @model_validator(mode="after")
    def validate_rules(self) -> "ScoredEvent":
        if self.risk_category == RiskCategory.NOISE.value:
            self.severity_score = 0
            if not self.threat_summary:
                self.threat_summary = "Routine update"
        elif self.severity_score == 0:
            self.severity_score = 1

        self.escalate_to_index = self.severity_score > 0
        self.scaled_impact = float(self.severity_score * 20)
        return self


# Backward-compatible alias
RiskAnalysisOutput = ScoredEvent


class HistoricalRiskPoint(BaseModel):
    date: str = Field(description="Date label, e.g. YYYY-MM-DD")
    risk_score: int = Field(description="0-100 risk score on that date")
    threat_count: int = Field(default=0)


class CompanyRiskAssessment(BaseModel):
    """
    Top-level assessment schema:
    Direct rolling 0-100 score + plain language explanation + historical trajectory.
    """
    company_name: str = Field(description="Target company analyzed")
    ticker: Optional[str] = Field(default="", description="Stock ticker symbol")
    timestamp: str = Field(description="ISO timestamp of the risk assessment")
    overall_risk_score: int = Field(
        ge=0,
        le=100,
        description="Rolling Corporate Risk Index from 0 (Completely Safe) to 100 (Existential Threat/Crisis)",
    )
    risk_level: str = Field(
        description="Risk level tier: 'Low' (0-24), 'Moderate' (25-49), 'High' (50-74), or 'Critical' (75-100)"
    )
    score_rationale: str = Field(
        description="Plain-language explanation of why company risk is rising, supported by relevant context."
    )
    total_evaluated_items: int = Field(default=10, description="Total count of public items evaluated")
    escalated_threats_count: int = Field(description="Number of items where escalate_to_index is True")
    noise_items_count: int = Field(description="Number of items classified as Noise")
    history_points: List[HistoricalRiskPoint] = Field(
        default_factory=list,
        description="Historical risk score trajectory from previous days for UI line chart",
    )
    analyzed_items: List[ScoredEvent] = Field(
        description="Evaluated items with ratings and threat summaries"
    )
    ai_model_used: str = Field(
        default="Gemini 2.5 Flash",
        description="The AI engine or fallback used, e.g. 'Google Gemini (gemini-flash-latest)' or 'Rule-Based Heuristic Fallback'",
    )
