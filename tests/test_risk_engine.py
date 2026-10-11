import json
import pytest
from models import RiskAnalysisInput, RiskAnalysisOutput, RiskCategory
from engine import RiskAnalysisEngine


def test_models_noise_enforcement():
    # If category is Noise, severity must be 0 and escalate_to_index must be False
    output = RiskAnalysisOutput(
        analyzed_company="Acme Corp",
        source_type="News",
        risk_category=RiskCategory.NOISE.value,
        severity_score=3,  # Validator should reset this to 0
        key_entities=[],
        threat_summary="",
        escalate_to_index=True,  # Validator should reset this to False
    )
    assert output.severity_score == 0
    assert output.escalate_to_index is False
    assert output.threat_summary == "Routine update"


def test_models_threat_enforcement():
    # If category is NOT Noise, escalate_to_index must be True and severity >= 1
    output = RiskAnalysisOutput(
        analyzed_company="Acme Corp",
        source_type="DOJ Press Release",
        risk_category=RiskCategory.LEGAL_LITIGATION.value,
        severity_score=4,
        key_entities=["DOJ"],
        threat_summary="DOJ antitrust lawsuit filed.",
        escalate_to_index=False,  # Validator should set to True
    )
    assert output.severity_score == 4
    assert output.escalate_to_index is True


def test_heuristic_noise_classification():
    engine = RiskAnalysisEngine(provider="heuristic")
    item = RiskAnalysisInput(
        company_name="Acme Corp",
        source_type="Bloomberg",
        date="2026-10-11",
        raw_text="Acme Corp shares up 2.4% following quarterly earnings beat.",
    )
    result = engine.analyze(item)
    assert result.risk_category == RiskCategory.NOISE.value
    assert result.severity_score == 0
    assert result.escalate_to_index is False
    assert result.threat_summary == "Routine update"


def test_heuristic_legal_classification():
    engine = RiskAnalysisEngine(provider="heuristic")
    item = RiskAnalysisInput(
        company_name="TechCorp",
        source_type="Reuters",
        date="2026-10-11",
        raw_text="The DOJ and FTC served antitrust subpoenas and filed a major lawsuit against TechCorp.",
    )
    result = engine.analyze(item)
    assert result.risk_category == RiskCategory.LEGAL_LITIGATION.value
    assert result.severity_score >= 3
    assert result.escalate_to_index is True
    assert "DOJ" in result.key_entities or "FTC" in result.key_entities


def test_heuristic_regulatory_classification():
    engine = RiskAnalysisEngine(provider="heuristic")
    item = RiskAnalysisInput(
        company_name="HealthPlus",
        source_type="FDA Bulletin",
        date="2026-10-11",
        raw_text="The FDA ordered an urgent nationwide recall and opened an enforcement probe against HealthPlus.",
    )
    result = engine.analyze(item)
    assert result.risk_category == RiskCategory.REGULATORY_COMPLIANCE.value
    assert result.severity_score >= 3
    assert result.escalate_to_index is True
    assert "FDA" in result.key_entities


def test_heuristic_operational_classification():
    engine = RiskAnalysisEngine(provider="heuristic")
    item = RiskAnalysisInput(
        company_name="LogiFlow",
        source_type="Security Report",
        date="2026-10-11",
        raw_text="A massive ransomware attack caused a complete factory shutdown across all LogiFlow facilities.",
    )
    result = engine.analyze(item)
    assert result.risk_category == RiskCategory.OPERATIONAL_SUPPLY_CHAIN.value
    assert result.severity_score >= 4
    assert result.escalate_to_index is True


def test_heuristic_governance_classification():
    engine = RiskAnalysisEngine(provider="heuristic")
    item = RiskAnalysisInput(
        company_name="InnoTech",
        source_type="WSJ",
        date="2026-10-11",
        raw_text="InnoTech CFO Sarah Jenkins resigns amid internal fraud and embezzlement investigation.",
    )
    result = engine.analyze(item)
    assert result.risk_category == RiskCategory.EXECUTIVE_GOVERNANCE.value
    assert result.severity_score >= 3
    assert result.escalate_to_index is True
    assert "Sarah Jenkins" in result.key_entities


def test_output_json_schema_exact_keys():
    engine = RiskAnalysisEngine(provider="heuristic")
    item = RiskAnalysisInput(
        company_name="TestCo",
        source_type="Feed",
        date="2026-10-11",
        raw_text="CEO John Doe ousted amid internal fraud.",
    )
    result = engine.analyze(item)
    data = json.loads(result.model_dump_json())

    expected_keys = {
        "analyzed_company",
        "source_type",
        "risk_category",
        "severity_score",
        "key_entities",
        "threat_summary",
        "escalate_to_index",
    }
    assert expected_keys.issubset(set(data.keys()))
