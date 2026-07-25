import json
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, g, jsonify, request, stream_with_context
from flask_cors import CORS

from auth import require_auth
from database import (
    authenticate_user,
    create_session as create_auth_session,
    create_user,
    init_db,
    revoke_session,
)
from gemini_client import generate_assessment, generate_chat_reply, stream_chat_reply
from prompts import DISCLAIMER, build_chat_context, build_patient_context
from sessions import append_message, create_session, get_consultation, get_session, list_user_history
from triage import build_emergency_assessment, detect_emergency

load_dotenv(Path(__file__).resolve().parent / '.env')

app = Flask(__name__)
CORS(app)
init_db()

REQUIRED_FIELDS = ['gender', 'age', 'height', 'weight', 'bp', 'symptoms']


def calculate_bmi(height_cm: float, weight_kg: float) -> float:
    height_m = height_cm / 100
    return weight_kg / (height_m ** 2)


def validate_patient_data(data: dict) -> str | None:
    if not data:
        return 'Request body is required.'
    for field in REQUIRED_FIELDS:
        if not str(data.get(field, '')).strip():
            return f'Missing required field: {field}'
    try:
        age = float(data['age'])
        height = float(data['height'])
        weight = float(data['weight'])
        if age <= 0 or height <= 0 or weight <= 0:
            return 'Age, height, and weight must be positive numbers.'
    except (TypeError, ValueError):
        return 'Age, height, and weight must be valid numbers.'
    return None


def build_patient_payload(data: dict) -> dict:
    return {
        'name': data.get('name', '').strip(),
        'gender': data.get('gender', '').strip(),
        'age': data['age'],
        'height': data['height'],
        'weight': data['weight'],
        'bp': data.get('bp', '').strip(),
        'symptoms': data.get('symptoms', '').strip(),
        'symptom_duration': data.get('symptom_duration', '').strip(),
        'allergies': data.get('allergies', '').strip(),
        'current_medications': data.get('current_medications', '').strip(),
        'existing_conditions': data.get('existing_conditions', '').strip(),
    }


def _session_belongs_to_user(record: dict | None, username: str) -> bool:
    return bool(record and record.get('user_id') == username)


@app.route('/auth/signup', methods=['POST'])
def signup():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    try:
        user = create_user(username, password)
        token = create_auth_session(user['id'])
        return jsonify(token=token, username=user['username']), 201
    except ValueError as exc:
        return jsonify(error=str(exc)), 400


@app.route('/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    if not username or not password:
        return jsonify(error='Username and password are required.'), 400

    user = authenticate_user(username, password)
    if not user:
        return jsonify(error='Invalid username or password.'), 401

    token = create_auth_session(user['id'])
    return jsonify(token=token, username=user['username'])


@app.route('/auth/logout', methods=['POST'])
@require_auth
def logout():
    token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
    revoke_session(token)
    return jsonify(message='Logged out.')


@app.route('/health', methods=['GET'])
def health():
    return jsonify(status='ok')


@app.route('/assessment', methods=['POST'])
@require_auth
def assessment():
    data = request.json or {}
    error = validate_patient_data(data)
    if error:
        return jsonify(error=error), 400

    patient_data = build_patient_payload(data)
    bmi = calculate_bmi(float(patient_data['height']), float(patient_data['weight']))
    user_id = g.current_user['username']

    is_emergency, matched_keywords = detect_emergency(patient_data['symptoms'])
    if is_emergency:
        assessment_result = build_emergency_assessment(matched_keywords)
        session_id, chat_messages = create_session(patient_data, bmi, assessment_result, user_id)
        return jsonify(
            session_id=session_id,
            emergency=True,
            matched_keywords=matched_keywords,
            assessment=assessment_result,
            chat_messages=chat_messages,
            disclaimer=DISCLAIMER,
        )

    try:
        prompt = build_patient_context(patient_data, bmi)
        assessment_result = generate_assessment(prompt)
    except Exception as exc:
        return jsonify(error=f'AI assessment failed: {exc}'), 502

    session_id, chat_messages = create_session(patient_data, bmi, assessment_result, user_id)
    return jsonify(
        session_id=session_id,
        emergency=False,
        matched_keywords=[],
        assessment=assessment_result,
        chat_messages=chat_messages,
        disclaimer=DISCLAIMER,
    )


@app.route('/chat', methods=['POST'])
@require_auth
def chat():
    data = request.json or {}
    session_id = data.get('session_id')
    message = (data.get('message') or '').strip()

    if not session_id:
        return jsonify(error='session_id is required.'), 400
    if not message:
        return jsonify(error='message is required.'), 400

    session = get_session(session_id)
    if not session:
        return jsonify(error='Session not found or expired. Please submit the form again.'), 404
    if not _session_belongs_to_user(session, g.current_user['username']):
        return jsonify(error='Session not found.'), 404

    is_emergency, matched_keywords = detect_emergency(message)
    if is_emergency:
        reply = (
            'Your message suggests a possible medical emergency. '
            'Please seek immediate in-person care or call your local emergency number. '
            f'Indicators detected: {", ".join(matched_keywords)}.'
        )
        append_message(session_id, 'user', message)
        append_message(session_id, 'assistant', reply)
        updated = get_session(session_id)
        return jsonify(
            reply=reply,
            messages=updated['messages'] if updated else session['messages'],
            disclaimer=DISCLAIMER,
        )

    system_instruction = build_chat_context(
        session['patient_data'],
        session['bmi'],
        session['assessment'],
    )

    try:
        reply = generate_chat_reply(system_instruction, session['messages'], message)
    except Exception as exc:
        return jsonify(error=f'AI chat failed: {exc}'), 502

    append_message(session_id, 'user', message)
    append_message(session_id, 'assistant', reply)

    return jsonify(
        reply=reply,
        messages=session['messages'],
        disclaimer=DISCLAIMER,
    )


@app.route('/chat/stream', methods=['POST'])
@require_auth
def chat_stream():
    data = request.json or {}
    session_id = data.get('session_id')
    message = (data.get('message') or '').strip()

    if not session_id:
        return jsonify(error='session_id is required.'), 400
    if not message:
        return jsonify(error='message is required.'), 400

    session = get_session(session_id)
    if not session:
        return jsonify(error='Session not found or expired. Please submit the form again.'), 404
    if not _session_belongs_to_user(session, g.current_user['username']):
        return jsonify(error='Session not found.'), 404

    system_instruction = build_chat_context(
        session['patient_data'],
        session['bmi'],
        session['assessment'],
    )

    is_emergency, matched_keywords = detect_emergency(message)

    def event_stream():
        append_message(session_id, 'user', message)
        full_reply = ''

        try:
            if is_emergency:
                full_reply = (
                    'Your message suggests a possible medical emergency. '
                    'Please seek immediate in-person care or call your local emergency number. '
                    f'Indicators detected: {", ".join(matched_keywords)}.'
                )
                yield f'data: {json.dumps({"delta": full_reply})}\n\n'
            else:
                for chunk in stream_chat_reply(system_instruction, session['messages'][:-1], message):
                    full_reply += chunk
                    yield f'data: {json.dumps({"delta": chunk})}\n\n'

            append_message(session_id, 'assistant', full_reply)
            updated = get_session(session_id)
            yield f'data: {json.dumps({"done": True, "messages": updated["messages"]})}\n\n'
        except Exception as exc:
            session['messages'].pop()
            yield f'data: {json.dumps({"error": f"AI chat failed: {exc}"})}\n\n'

    response = Response(
        stream_with_context(event_stream()),
        mimetype='text/event-stream',
    )
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['X-Accel-Buffering'] = 'no'
    return response


@app.route('/history', methods=['GET'])
@require_auth
def history_list():
    return jsonify(history=list_user_history(g.current_user['username']))


@app.route('/history/<session_id>', methods=['GET'])
@require_auth
def history_detail(session_id):
    record = get_consultation(session_id)
    if not record or not _session_belongs_to_user(record, g.current_user['username']):
        return jsonify(error='Consultation not found.'), 404
    return jsonify(
        session_id=session_id,
        created_at=record['created_at'].isoformat(),
        patient_data=record['patient_data'],
        bmi=record['bmi'],
        assessment=record['assessment'],
        messages=record['messages'],
        active=get_session(session_id) is not None,
        disclaimer=DISCLAIMER,
    )


@app.route('/generate_report', methods=['POST'])
@require_auth
def generate_report():
    """Legacy endpoint — redirects to structured assessment flow."""
    response = assessment()
    if isinstance(response, tuple):
        payload, status = response
        return payload, status
    payload = response.get_json()
    if payload.get('error'):
        return jsonify(error=payload['error']), 400
    assessment_data = payload.get('assessment', {})
    report_lines = [
        f"**Severity:** {assessment_data.get('severity', 'unknown')}",
        '',
        assessment_data.get('summary', ''),
        '',
        '**Possible considerations:**',
        *[f'- {item}' for item in assessment_data.get('likely_causes', [])],
        '',
        '**Recommended tests:**',
        *[f'- {item}' for item in assessment_data.get('recommended_tests', [])],
        '',
        assessment_data.get('advice', ''),
        '',
        DISCLAIMER,
    ]
    return jsonify(report='\n'.join(report_lines), assessment=payload.get('assessment'))


if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(debug=debug, port=port)
