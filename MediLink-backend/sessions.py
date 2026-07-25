"""Session storage backed by ChromaDB (persistent consultations + chat history)."""

from chroma_store import (
    append_message,
    create_session,
    get_consultation,
    get_session,
    list_user_history,
)

__all__ = [
    'append_message',
    'create_session',
    'get_consultation',
    'get_session',
    'list_user_history',
]
