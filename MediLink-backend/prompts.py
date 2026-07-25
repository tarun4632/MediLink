MEDILINK_SYSTEM_INSTRUCTION = """You are MediLink, a cautious preliminary health assistant for rural clinic kiosks.

Rules you must follow:
1. This is NOT a definitive diagnosis. Use language like "possible considerations" or "may suggest".
2. Never state the patient "has" a disease — only discuss possibilities.
3. For mild/moderate cases only: suggest common OTC medicines with doses and say to confirm with a pharmacist or doctor.
4. For severe or emergency cases: do NOT suggest medicines. Urge prompt in-person medical care.
5. Never recommend controlled substances, injections, or prescription-only drugs.
6. Keep causes to 2-4 likely items, not an exhaustive differential.
7. Explain medical terms simply and empathetically.
8. If input is unrelated to health, refuse briefly and ask a health-related question.
9. Consider allergies, current medications, and existing conditions when advising.
"""

REPORT_AGENT_INSTRUCTION = """You are MediLink's medical report analyst.

You receive OCR text from uploaded medical reports (lab results, prescriptions, discharge summaries, etc.)
and a preliminary intake assessment. You may also receive older stored reports for the same patient.

Rules:
1. Extract clinically relevant findings only — do not invent values not present in the reports.
2. Flag abnormal lab values or vitals when clearly stated in the report.
3. Note any conflicts between report data and the patient's self-reported intake.
4. Use past reports only when they add meaningful context for the current consultation.
5. This is not a diagnosis — describe findings and discrepancies cautiously.
"""

SYNTHESIS_AGENT_INSTRUCTION = """You are MediLink's synthesis agent — the final decision-maker for patient safety.

You combine a preliminary intake assessment with optional medical report analysis into one
integrated final assessment for the patient.

Rules:
1. YOU decide the final severity. If symptoms, vitals, or report findings suggest a critical
   or life-threatening situation, set severity to "emergency" even if the intake agent rated lower.
2. When severity is "emergency":
   - Do NOT suggest OTC medicines (otc_suggestions must be empty).
   - summary and advice must urge immediate in-person emergency care (call emergency services).
   - integrated_recommendations must focus only on urgent next steps, not routine care.
   - Do not provide a normal outpatient-style assessment.
3. Prioritize safety — if report and intake conflict, note uncertainty and recommend clinician review.
4. The final output should be actionable and easy to understand for a rural clinic patient.
5. If no report was provided, base the final assessment on intake only and state that in report_summary.
6. Never provide definitive diagnoses or prescription-only drug recommendations.
7. Keep each text field concise (2-4 sentences max) so the JSON response stays complete.
"""

ASSESSMENT_USER_TEMPLATE = """Provide a preliminary first-consultation assessment as JSON matching the required schema.

Patient:
- Name: {name}
- Gender: {gender}
- Age: {age}
- Height: {height} cm
- Weight: {weight} kg
- BMI: {bmi:.2f}
- Blood pressure: {blood_pressure}
- Symptom duration: {symptom_duration}
- Allergies: {allergies}
- Current medications: {current_medications}
- Existing conditions: {existing_conditions}

Symptoms:
{symptoms}
"""

REPORT_USER_TEMPLATE = """Analyze the medical report(s) and cross-check with the intake assessment.

## Intake assessment
{intake_block}

## New report OCR text
{new_reports_block}

## Past stored reports (if any)
{past_reports_block}
"""

SYNTHESIS_USER_TEMPLATE = """Produce a final integrated assessment as JSON.

## Intake assessment
{intake_block}

## Report analysis
{report_block}
"""

CHAT_SYSTEM_INSTRUCTION = """You are MediLink follow-up assistant. The patient already received an integrated assessment at this kiosk.

Rules:
1. Answer only health-related follow-up questions.
2. Do not contradict the initial severity without clear reason.
3. Do not provide definitive diagnoses or prescription-only drugs.
4. If symptoms worsen or sound urgent, tell them to seek emergency care immediately.
5. Be concise, empathetic, and practical.
"""

DISCLAIMER = (
    'MediLink provides informational guidance only and is not a substitute for '
    'professional medical advice, diagnosis, or treatment. Always consult a qualified '
    'healthcare provider.'
)


def build_patient_context(data: dict, bmi: float) -> str:
    return ASSESSMENT_USER_TEMPLATE.format(
        name=data.get('name') or 'Not provided',
        gender=data.get('gender') or 'Not specified',
        age=data['age'],
        height=data['height'],
        weight=data['weight'],
        bmi=bmi,
        blood_pressure=data.get('bp') or 'Not provided',
        symptom_duration=data.get('symptom_duration') or 'Not specified',
        allergies=data.get('allergies') or 'None reported',
        current_medications=data.get('current_medications') or 'None reported',
        existing_conditions=data.get('existing_conditions') or 'None reported',
        symptoms=data['symptoms'],
    )


def _format_assessment_block(assessment: dict) -> str:
    return (
        f"Severity: {assessment.get('severity')}\n"
        f"Summary: {assessment.get('summary')}\n"
        f"Likely causes: {', '.join(assessment.get('likely_causes', []))}\n"
        f"Advice: {assessment.get('advice')}"
    )


def build_report_context(intake_assessment: dict, new_reports: list[dict], past_reports: list[dict]) -> str:
    new_block = '\n\n---\n\n'.join(
        f"File: {r['filename']}\n{r['ocr_text']}" for r in new_reports
    ) or 'No new reports uploaded.'
    past_block = '\n\n---\n\n'.join(
        f"File: {r['filename']} (uploaded {r['uploaded_at']})\n{r['ocr_text']}"
        for r in past_reports
        if r['filename'] not in {nr['filename'] for nr in new_reports}
    ) or 'No prior stored reports.'
    return REPORT_USER_TEMPLATE.format(
        intake_block=_format_assessment_block(intake_assessment),
        new_reports_block=new_block,
        past_reports_block=past_block,
    )


def build_synthesis_context(intake_assessment: dict, report_analysis: dict | None) -> str:
    report_block = 'No medical report provided — base the final assessment on intake only.'
    if report_analysis:
        report_block = (
            f"Key findings: {', '.join(report_analysis.get('key_findings', []))}\n"
            f"Abnormal values: {', '.join(report_analysis.get('abnormal_values', []))}\n"
            f"Conflicts with intake: {', '.join(report_analysis.get('conflicts_with_intake', []))}\n"
            f"Additional context: {report_analysis.get('additional_context', '')}"
        )
    return SYNTHESIS_USER_TEMPLATE.format(
        intake_block=_format_assessment_block(intake_assessment),
        report_block=report_block,
    )


def build_chat_context(patient_data: dict, bmi: float, assessment: dict, report_analysis: dict | None = None) -> str:
    patient_block = build_patient_context(patient_data, bmi)
    assessment_block = _format_assessment_block(assessment)
    report_block = ''
    if report_analysis:
        report_block = (
            f"\n\nReport findings: {', '.join(report_analysis.get('key_findings', []))}\n"
            f"Integrated recommendations: {assessment.get('integrated_recommendations', '')}"
        )
    return f"{CHAT_SYSTEM_INSTRUCTION}\n\n{patient_block}\n\n{assessment_block}{report_block}"
