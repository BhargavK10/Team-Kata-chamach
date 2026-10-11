from enum import Enum
from typing import List
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


class RiskAnalysisOutput(BaseModel):
    analyzed_company: str = Field(description="Target company analyzed")
    source_type: str = Field(description="Source of the data")
    risk_category: str = Field(
        description="One of: 'Legal/Litigation', 'Regulatory/Compliance', 'Operational/Supply Chain', 'Executive Governance', 'Noise'"
    )
    severity_score: int = Field(
        ge=0,
        le=5,
        description="0 for Noise; 1 to 5 for corporate risks based on severity",
    )
    key_entities: List[str] = Field(
        default_factory=list,
        description="Specific regulators, competitors, executives, or agencies mentioned",
    )
    threat_summary: str = Field(
        description="A concise 1-sentence explanation of the specific threat, or 'Routine update' if Noise."
    )
    escalate_to_index: bool = Field(
        description="True if severity_score > 0, False otherwise"
    )

    @model_validator(mode="after")
    def enforce_rules(self) -> "RiskAnalysisOutput":
        # Rule 3: If category is Noise, assign Severity Score 0
        if self.risk_category == RiskCategory.NOISE.value:
            self.severity_score = 0
            if not self.threat_summary or self.threat_summary.strip() == "":
                self.threat_summary = "Routine update"

        # Rule 4: If category is NOT Noise, severity must be 1 to 5
        elif self.severity_score == 0:
            self.severity_score = 1

        # Rule: escalate_to_index is true if severity_score > 0
        self.escalate_to_index = self.severity_score > 0
        return self


class CompanyRiskAssessment(BaseModel):
    """
    Top-level assessment schema containing the 0-100 overall score
    and the breakdown of all analyzed items for plotting on UI graphs.
    """
    company_name: str = Field(description="Target company analyzed")
    timestamp: str = Field(description="ISO timestamp of the risk assessment")
    overall_risk_score: int = Field(
        ge=0,
        le=100,
        description="Aggregate risk score from 0 (Completely Safe) to 100 (Existential Threat/Crisis)",
    )
    risk_level: str = Field(
        description="Risk level tier: 'Low' (0-25), 'Moderate' (26-50), 'High' (51-75), or 'Critical' (76-100)"
    )
    score_rationale: str = Field(
        description="A concise 2-sentence explanation of why this overall risk score was assigned."
    )
    total_evaluated_items: int = Field(default=10, description="Total count of public items evaluated")
    escalated_threats_count: int = Field(description="Number of items where escalate_to_index is True")
    noise_items_count: int = Field(description="Number of items classified as Noise")
    analyzed_items: List[RiskAnalysisOutput] = Field(
        description="Detailed list of all evaluated items (5 news + 5 complaints)"
    )
