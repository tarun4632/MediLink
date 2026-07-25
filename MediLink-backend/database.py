import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from werkzeug.security import check_password_hash, generate_password_hash

SESSION_TTL_DAYS = 7
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,32}$')


def get_db_path() -> str:
    return os.environ.get(
        'DATABASE_PATH',
        str(Path(__file__).resolve().parent / 'medilink.db'),
    )


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
            '''
        )
        _seed_demo_user(conn)


def _seed_demo_user(conn: sqlite3.Connection) -> None:
    username = os.environ.get('DEMO_USERNAME', 'demo')
    password = os.environ.get('DEMO_PASSWORD', 'MediLink@123')
    existing = conn.execute(
        'SELECT id FROM users WHERE username = ? COLLATE NOCASE',
        (username,),
    ).fetchone()
    if existing:
        return
    conn.execute(
        'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
        (username, generate_password_hash(password), datetime.utcnow().isoformat()),
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
            cursor = conn.execute(
                'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
                (
                    username.strip(),
                    generate_password_hash(password),
                    datetime.utcnow().isoformat(),
                ),
            )
        except sqlite3.IntegrityError:
            raise ValueError('Username already exists.') from None
        return {'id': cursor.lastrowid, 'username': username.strip()}


def authenticate_user(username: str, password: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            'SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE',
            (username.strip(),),
        ).fetchone()
        if not row or not check_password_hash(row['password_hash'], password):
            return None
        return {'id': row['id'], 'username': row['username']}


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS)).isoformat()
    with get_connection() as conn:
        conn.execute(
            'INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
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
            WHERE s.token = ?
            ''',
            (token,),
        ).fetchone()
        if not row:
            return None
        if datetime.fromisoformat(row['expires_at']) < datetime.utcnow():
            conn.execute('DELETE FROM auth_sessions WHERE token = ?', (token,))
            return None
        return {'id': row['id'], 'username': row['username']}


def revoke_session(token: str) -> None:
    with get_connection() as conn:
        conn.execute('DELETE FROM auth_sessions WHERE token = ?', (token,))
