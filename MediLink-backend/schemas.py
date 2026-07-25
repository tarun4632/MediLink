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
