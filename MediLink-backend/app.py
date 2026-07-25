import json
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, Response, g, jsonify, request, stream_with_context
from flask_cors import CORS

from auth import require_auth
from database import (
    append_message,
    authenticate_user,
    create_auth_session,
    create_consultation,
    create_user,
    get_consultation_for_user,
    get_session,
    init_db,
    list_user_consultations,
    list_user_reports,
    revoke_session,
    save_report,
)
from gemini_client import (
    generate_assessment,
    generate_chat_reply,
    generate_final_assessment,
    generate_report_analysis,
    stream_chat_reply,
)
from mistral_ocr import extract_document_text, is_allowed_report_file
from prompts import DISCLAIMER, build_chat_context, build_patient_context
from triage import build_emergency_assessment, detect_emergency

load_dotenv(Path(__file__).resolve().parent / '.env')

app = Flask(__name__)
CORS(app)

try:
    init_db()
except Exception as exc:
    print(f'Database init warning: {exc}')

REQUIRED_FIELDS = ['gender', 'age', 'height', 'weight', 'bp', 'symptoms']
MAX_REPORT_FILES = 3


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


def _parse_form_data() -> dict:
    if request.is_json:
        return request.get_json(silent=True) or {}
    if request.form:
        return {key: request.form.get(key, '') for key in request.form}
    if request.data:
        try:
            payload = json.loads(request.data)
            if isinstance(payload, dict):
                return payload
        except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
            pass
    return {}


def _session_belongs_to_user(record: dict | None, user_id: int) -> bool:
    return bool(record and record.get('user_id') == user_id)


def _emergency_to_final(emergency_assessment: dict) -> dict:
    return {
        **emergency_assessment,
        'report_summary': 'Not applicable — emergency triage triggered.',
        'integrated_recommendations': emergency_assessment.get('advice', ''),
        'data_gaps': [],
    }


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
    data = _parse_form_data()
    error = validate_patient_data(data)
    if error:
        return jsonify(error=error), 400

    patient_data = build_patient_payload(data)
    bmi = calculate_bmi(float(patient_data['height']), float(patient_data['weight']))
    user_id = g.current_user['id']

    report_files = request.files.getlist('reports')
    if len(report_files) > MAX_REPORT_FILES:
        return jsonify(error=f'Maximum {MAX_REPORT_FILES} files allowed.'), 400

    new_reports = []
    try:
        for report_file in report_files:
            if not report_file or not report_file.filename:
                continue
            if not is_allowed_report_file(report_file.filename):
                return jsonify(
                    error='Only PDF and image files are supported (pdf, jpg, png, webp, gif, bmp, tiff).',
                ), 400
            file_bytes = report_file.read()
            ocr_result = extract_document_text(report_file.filename, file_bytes)
            saved = save_report(
                user_id,
                report_file.filename,
                ocr_result['text'],
                ocr_result['page_count'],
            )
            new_reports.append(saved)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    except Exception as exc:
        return jsonify(error=f'OCR processing failed: {exc}'), 502

    is_emergency, matched_keywords = detect_emergency(patient_data['symptoms'])
    if is_emergency:
        intake_assessment = build_emergency_assessment(matched_keywords)
        final_assessment = _emergency_to_final(intake_assessment)
        session_id, chat_messages = create_consultation(
            user_id, patient_data, bmi, intake_assessment, final_assessment,
        )
        return jsonify(
            session_id=session_id,
            emergency=True,
            active=True,
            matched_keywords=matched_keywords,
            intake_assessment=intake_assessment,
            report_analysis=None,
            final_assessment=final_assessment,
            assessment=final_assessment,
            has_reports=bool(new_reports),
            chat_messages=chat_messages,
            disclaimer=DISCLAIMER,
        )

    try:
        prompt = build_patient_context(patient_data, bmi)
        intake_assessment = generate_assessment(prompt)
    except Exception as exc:
        return jsonify(error=f'Intake assessment failed: {exc}'), 502

    report_analysis = None
    if new_reports:
        try:
            past_reports = list_user_reports(user_id, limit=10)
            report_analysis = generate_report_analysis(intake_assessment, new_reports, past_reports)
        except Exception as exc:
            return jsonify(error=f'Report analysis failed: {exc}'), 502

    try:
        final_assessment = generate_final_assessment(intake_assessment, report_analysis)
    except Exception as exc:
        return jsonify(error=f'Final assessment failed: {exc}'), 502

    is_emergency = final_assessment.get('severity') == 'emergency'
    if is_emergency:
        final_assessment['otc_suggestions'] = []

    session_id, chat_messages = create_consultation(
        user_id,
        patient_data,
        bmi,
        intake_assessment,
        final_assessment,
        report_analysis,
    )
    return jsonify(
        session_id=session_id,
        emergency=is_emergency,
        active=True,
        matched_keywords=[],
        intake_assessment=intake_assessment,
        report_analysis=report_analysis,
        final_assessment=final_assessment,
        assessment=final_assessment,
        has_reports=bool(new_reports),
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
    if not _session_belongs_to_user(session, g.current_user['id']):
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
        session['final_assessment'],
        session.get('report_analysis'),
    )

    try:
        reply = generate_chat_reply(system_instruction, session['messages'], message)
    except Exception as exc:
        return jsonify(error=f'AI chat failed: {exc}'), 502

    append_message(session_id, 'user', message)
    append_message(session_id, 'assistant', reply)

    updated = get_session(session_id)
    return jsonify(
        reply=reply,
        messages=updated['messages'] if updated else session['messages'],
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
    if not _session_belongs_to_user(session, g.current_user['id']):
        return jsonify(error='Session not found.'), 404

    system_instruction = build_chat_context(
        session['patient_data'],
        session['bmi'],
        session['final_assessment'],
        session.get('report_analysis'),
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
    return jsonify(history=list_user_consultations(g.current_user['id']))


@app.route('/history/<session_id>', methods=['GET'])
@require_auth
def history_detail(session_id):
    record = get_consultation_for_user(session_id, g.current_user['id'])
    if not record:
        return jsonify(error='Consultation not found.'), 404
    return jsonify(
        session_id=record['session_id'],
        created_at=record['created_at'].isoformat() if hasattr(record['created_at'], 'isoformat') else record['created_at'],
        patient_data=record['patient_data'],
        bmi=record['bmi'],
        intake_assessment=record['intake_assessment'],
        report_analysis=record['report_analysis'],
        final_assessment=record['final_assessment'],
        assessment=record['final_assessment'],
        messages=record['messages'],
        active=record['active'],
        has_reports=bool(record.get('report_analysis')),
        emergency=record['final_assessment'].get('severity') == 'emergency',
        disclaimer=DISCLAIMER,
    )


if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(debug=debug, port=port)
