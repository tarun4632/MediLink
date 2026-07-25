from functools import wraps

from flask import g, jsonify, request

from database import get_user_by_token


def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify(error='Authentication required.'), 401

        token = auth_header.removeprefix('Bearer ').strip()
        user = get_user_by_token(token)
        if not user:
            return jsonify(error='Invalid or expired session. Please log in again.'), 401

        g.current_user = user
        return view(*args, **kwargs)

    return wrapped
