import os
import re
import secrets
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json
from psycopg.errors import UniqueViolation
from werkzeug.security import check_password_hash, generate_password_hash

SESSION_TTL_DAYS = 7
CONSULTATION_TTL_HOURS = 2
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,32}$')


def _get_database_url() -> str:
    url = os.environ.get('DATABASE_URL', '').strip()
    if not url:
        raise ValueError('DATABASE_URL is required. Set your Neon Postgres connection string.')
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    return url


@contextmanager
def get_connection():
    with psycopg.connect(
        _get_database_url(),
        row_factory=dict_row,
        connect_timeout=10,
    ) as conn:
        yield conn
        conn.commit()


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TIMESTAMPTZ NOT NULL
            );

            CREATE TABLE IF NOT EXISTS medical_reports (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                ocr_text TEXT NOT NULL,
                page_count INTEGER NOT NULL DEFAULT 0,
                uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS consultations (
                id UUID PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                patient_data JSONB NOT NULL,
                bmi DOUBLE PRECISION NOT NULL,
                intake_assessment JSONB NOT NULL,
                report_analysis JSONB,
                final_assessment JSONB NOT NULL,
                messages JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_medical_reports_user_id ON medical_reports(user_id);
            CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
            '''
        )
        _seed_demo_user(conn)


def _seed_demo_user(conn) -> None:
    username = os.environ.get('DEMO_USERNAME', 'demo')
    password = os.environ.get('DEMO_PASSWORD', 'MediLink@123')
    row = conn.execute(
        'SELECT id FROM users WHERE LOWER(username) = LOWER(%s)',
        (username,),
    ).fetchone()
    if row:
        return
    conn.execute(
        'INSERT INTO users (username, password_hash) VALUES (%s, %s)',
        (username, generate_password_hash(password)),
    )


def validate_username(username: str) -> str | None:
    cleaned = (username or '').strip()
    if not USERNAME_PATTERN.match(cleaned):
        return 'Username must be 3-32 characters (letters, numbers, underscore only).'
    return None


def validate_password(password: str) -> str | None:
    if not password or len(password) < 8:
        return 'Password must be at least 8 characters.'
    return None


def create_user(username: str, password: str) -> dict:
    error = validate_username(username)
    if error:
        raise ValueError(error)
    error = validate_password(password)
    if error:
        raise ValueError(error)

    with get_connection() as conn:
        try:
            row = conn.execute(
                '''
                INSERT INTO users (username, password_hash)
                VALUES (%s, %s)
                RETURNING id, username
                ''',
                (username.strip(), generate_password_hash(password)),
            ).fetchone()
        except UniqueViolation:
            raise ValueError('Username already exists.') from None
        return {'id': row['id'], 'username': row['username']}


def authenticate_user(username: str, password: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            'SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER(%s)',
            (username.strip(),),
        ).fetchone()
        if not row or not check_password_hash(row['password_hash'], password):
            return None
        return {'id': row['id'], 'username': row['username']}


def create_auth_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS)
    with get_connection() as conn:
        conn.execute(
            'INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (%s, %s, %s)',
            (token, user_id, expires_at),
        )
    return token


def get_user_by_token(token: str) -> dict | None:
    if not token:
        return None
    with get_connection() as conn:
        row = conn.execute(
            '''
            SELECT u.id, u.username, s.expires_at
            FROM auth_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = %s
            ''',
            (token,),
        ).fetchone()
        if not row:
            return None
        expires_at = row['expires_at']
        if expires_at.tzinfo:
            expires_at = expires_at.replace(tzinfo=None)
        if expires_at < datetime.utcnow():
            conn.execute('DELETE FROM auth_sessions WHERE token = %s', (token,))
            return None
        return {'id': row['id'], 'username': row['username']}


def revoke_session(token: str) -> None:
    with get_connection() as conn:
        conn.execute('DELETE FROM auth_sessions WHERE token = %s', (token,))


def save_report(user_id: int, filename: str, ocr_text: str, page_count: int) -> dict:
    with get_connection() as conn:
        row = conn.execute(
            '''
            INSERT INTO medical_reports (user_id, filename, ocr_text, page_count)
            VALUES (%s, %s, %s, %s)
            RETURNING id, filename, page_count, uploaded_at
            ''',
            (user_id, filename, ocr_text, page_count),
        ).fetchone()
        return {
            'id': row['id'],
            'filename': row['filename'],
            'page_count': row['page_count'],
            'uploaded_at': row['uploaded_at'].isoformat(),
            'ocr_text': ocr_text,
        }


def list_user_reports(user_id: int, limit: int = 10) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            '''
            SELECT id, filename, ocr_text, page_count, uploaded_at
            FROM medical_reports
            WHERE user_id = %s
            ORDER BY uploaded_at DESC
            LIMIT %s
            ''',
            (user_id, limit),
        ).fetchall()
    return [
        {
            'id': row['id'],
            'filename': row['filename'],
            'ocr_text': row['ocr_text'],
            'page_count': row['page_count'],
            'uploaded_at': row['uploaded_at'].isoformat(),
        }
        for row in rows
    ]


def _default_messages(final_assessment: dict) -> list[dict]:
    severity = final_assessment.get('severity', 'unknown')
    return [{
        'role': 'assistant',
        'content': (
            f"I've reviewed your assessment (severity: {severity}). "
            'Ask me any follow-up health questions.'
        ),
    }]


def create_consultation(
    user_id: int,
    patient_data: dict,
    bmi: float,
    intake_assessment: dict,
    final_assessment: dict,
    report_analysis: dict | None = None,
) -> tuple[str, list[dict]]:
    session_id = str(uuid.uuid4())
    messages = _default_messages(final_assessment)
    expires_at = datetime.utcnow() + timedelta(hours=CONSULTATION_TTL_HOURS)
    with get_connection() as conn:
        conn.execute(
            '''
            INSERT INTO consultations (
                id, user_id, patient_data, bmi, intake_assessment,
                report_analysis, final_assessment, messages, expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            (
                session_id,
                user_id,
                Json(patient_data),
                bmi,
                Json(intake_assessment),
                Json(report_analysis) if report_analysis else None,
                Json(final_assessment),
                Json(messages),
                expires_at,
            ),
        )
    return session_id, messages


def _row_to_consultation(row: dict) -> dict:
    return {
        'session_id': str(row['id']),
        'user_id': row['user_id'],
        'patient_data': row['patient_data'],
        'bmi': row['bmi'],
        'intake_assessment': row['intake_assessment'],
        'report_analysis': row['report_analysis'],
        'final_assessment': row['final_assessment'],
        'assessment': row['final_assessment'],
        'messages': row['messages'],
        'created_at': row['created_at'],
        'expires_at': row['expires_at'],
    }


def get_consultation(session_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            'SELECT * FROM consultations WHERE id = %s',
            (session_id,),
        ).fetchone()
    if not row:
        return None
    return _row_to_consultation(row)


def get_session(session_id: str) -> dict | None:
    record = get_consultation(session_id)
    if not record:
        return None
    expires_at = record['expires_at']
    if expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=None)
    if expires_at < datetime.utcnow():
        return None
    return record


def append_message(session_id: str, role: str, content: str) -> None:
    record = get_session(session_id)
    if not record:
        raise KeyError('Session not found or expired.')
    messages = list(record['messages'])
    messages.append({'role': role, 'content': content})
    with get_connection() as conn:
        conn.execute(
            'UPDATE consultations SET messages = %s WHERE id = %s',
            (Json(messages), session_id),
        )


def _is_active(expires_at) -> bool:
    if expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=None)
    return expires_at >= datetime.utcnow()


def list_user_consultations(user_id: int, limit: int = 20) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            '''
            SELECT id, patient_data, final_assessment, created_at, expires_at
            FROM consultations
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            ''',
            (user_id, limit),
        ).fetchall()

    history = []
    for row in rows:
        patient_data = row['patient_data'] or {}
        final_assessment = row['final_assessment'] or {}
        symptoms = patient_data.get('symptoms', '')
        history.append({
            'session_id': str(row['id']),
            'created_at': row['created_at'].isoformat(),
            'patient_name': patient_data.get('name') or 'Consultation',
            'severity': final_assessment.get('severity', 'unknown'),
            'symptoms_preview': symptoms[:200],
            'active': _is_active(row['expires_at']),
        })
    return history


def get_consultation_for_user(session_id: str, user_id: int) -> dict | None:
    record = get_consultation(session_id)
    if not record or record.get('user_id') != user_id:
        return None
    record['active'] = _is_active(record['expires_at'])
    return record
