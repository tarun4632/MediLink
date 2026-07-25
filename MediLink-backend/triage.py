EMERGENCY_KEYWORDS = [
    'chest pain',
    'heart attack',
    'stroke',
    'cannot breathe',
    "can't breathe",
    'difficulty breathing',
    'severe bleeding',
    'unconscious',
    'passed out',
    'seizure',
    'suicidal',
    'suicide',
    'overdose',
    'paralysis',
    'sudden numbness',
    'face drooping',
    'slurred speech',
    'severe allergic reaction',
    'anaphylaxis',
    'choking',
]


def detect_emergency(symptoms: str) -> tuple[bool, list[str]]:
    text = symptoms.lower()
    matched = [keyword for keyword in EMERGENCY_KEYWORDS if keyword in text]
    return bool(matched), matched


def build_emergency_assessment(matched_keywords: list[str]) -> dict:
    triggers = ', '.join(matched_keywords)
    return {
        'severity': 'emergency',
        'summary': (
            'Your symptoms may indicate a medical emergency. '
            'Do not wait for online advice.'
        ),
        'likely_causes': [
            'Symptoms matched urgent-care red flags in our screening.',
        ],
        'recommended_tests': [
            'Seek immediate in-person emergency evaluation.',
        ],
        'advice': (
            f'Possible emergency indicators detected ({triggers}). '
            'Call your local emergency number or go to the nearest emergency department now. '
            'Do not drive yourself if you feel unsafe.'
        ),
        'otc_suggestions': [],
        'see_doctor_when': 'Immediately — this is not suitable for self-care or OTC treatment.',
        'limitations': 'This kiosk cannot provide emergency care or remote diagnosis.',
    }
