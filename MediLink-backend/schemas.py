from typing import Literal

from pydantic import BaseModel, Field


class OtcSuggestion(BaseModel):
    name: str
    dose: str
    note: str = Field(description='Short usage note or caution')


class AssessmentResult(BaseModel):
    severity: Literal['mild', 'moderate', 'severe', 'emergency']
    summary: str = Field(description='Brief preliminary assessment in plain language')
    likely_causes: list[str] = Field(description='2-4 possible considerations, not definitive diagnoses')
    recommended_tests: list[str]
    advice: str
    otc_suggestions: list[OtcSuggestion] = Field(
        default_factory=list,
        description='OTC options only for mild/moderate; empty for severe/emergency',
    )
    see_doctor_when: str
    limitations: str = Field(description='What this assessment cannot determine')


class ReportAnalysis(BaseModel):
    key_findings: list[str] = Field(description='Important findings from the medical report(s)')
    abnormal_values: list[str] = Field(description='Lab values or vitals outside normal range, if any')
    conflicts_with_intake: list[str] = Field(
        description='Discrepancies between report data and patient intake',
    )
    additional_context: str = Field(description='Relevant context from reports not captured in intake')


class FinalAssessment(BaseModel):
    severity: Literal['mild', 'moderate', 'severe', 'emergency']
    summary: str
    likely_causes: list[str]
    recommended_tests: list[str]
    advice: str
    otc_suggestions: list[OtcSuggestion] = Field(default_factory=list)
    see_doctor_when: str
    limitations: str
    report_summary: str = Field(description='Summary of medical report findings, or N/A if no report')
    integrated_recommendations: str = Field(
        description='Combined recommendation using intake and report data',
    )
    data_gaps: list[str] = Field(description='Missing information that limits the assessment')
