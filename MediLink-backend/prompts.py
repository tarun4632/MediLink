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

CHAT_SYSTEM_INSTRUCTION = """You are MediLink follow-up assistant. The patient already received an initial assessment at this kiosk.

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


def build_chat_context(patient_data: dict, bmi: float, assessment: dict) -> str:
    patient_block = build_patient_context(patient_data, bmi)
    assessment_block = (
        f"Initial assessment severity: {assessment.get('severity')}\n"
        f"Summary: {assessment.get('summary')}\n"
        f"Likely causes: {', '.join(assessment.get('likely_causes', []))}\n"
        f"Advice: {assessment.get('advice')}"
    )
    return f"{CHAT_SYSTEM_INSTRUCTION}\n\n{patient_block}\n\n{assessment_block}"
