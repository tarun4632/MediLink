import json
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import chromadb

SESSION_TTL_HOURS = 2
COLLECTION_NAME = 'consultations'

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        data_dir = os.environ.get(
            'CHROMA_PATH',
            str(Path(__file__).resolve().parent / 'chroma_data'),
        )
        Path(data_dir).mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=data_dir)
        _collection = _client.get_or_create_collection(name=COLLECTION_NAME)
    return _collection


def _build_metadata(user_id: str, patient_data: dict, assessment: dict, created_at: datetime) -> dict:
    symptoms = patient_data.get('symptoms', '')
    return {
        'user_id': user_id or 'anonymous',
        'created_at': created_at.isoformat(),
        'patient_name': patient_data.get('name') or 'Unknown',
        'severity': assessment.get('severity', 'unknown'),
        'symptoms_preview': symptoms[:200],
    }


def _serialize_payload(session: dict) -> str:
    return json.dumps(
        {
            'patient_data': session['patient_data'],
            'bmi': session['bmi'],
            'assessment': session['assessment'],
            'messages': session['messages'],
        }
    )


def _parse_record(session_id: str, metadata: dict, document: str) -> dict:
    payload = json.loads(document)
    return {
        'session_id': session_id,
        'user_id': metadata.get('user_id', ''),
        'patient_data': payload['patient_data'],
        'bmi': payload['bmi'],
        'assessment': payload['assessment'],
        'messages': payload['messages'],
        'created_at': datetime.fromisoformat(metadata['created_at']),
        'metadata': metadata,
    }


def _fetch_record(session_id: str) -> dict | None:
    collection = _get_collection()
    result = collection.get(ids=[session_id], include=['documents', 'metadatas'])
    if not result['ids']:
        return None
    return _parse_record(session_id, result['metadatas'][0], result['documents'][0])


def _save_record(session_id: str, session: dict, metadata: dict) -> None:
    collection = _get_collection()
    collection.upsert(
        ids=[session_id],
        documents=[_serialize_payload(session)],
        metadatas=[metadata],
    )


def create_session(
    patient_data: dict,
    bmi: float,
    assessment: dict,
    user_id: str = 'anonymous',
) -> tuple[str, list[dict]]:
    session_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    welcome = (
        f"I've reviewed your preliminary assessment (severity: {assessment['severity']}). "
        'Ask me any follow-up health questions.'
    )
    messages = [{'role': 'assistant', 'content': welcome}]
    session = {
        'patient_data': patient_data,
        'bmi': bmi,
        'assessment': assessment,
        'messages': messages,
    }
    metadata = _build_metadata(user_id, patient_data, assessment, created_at)
    _save_record(session_id, session, metadata)
    return session_id, messages


def get_session(session_id: str) -> dict | None:
    record = _fetch_record(session_id)
    if not record:
        return None
    if _is_expired(record['created_at']):
        return None
    return record


def get_consultation(session_id: str) -> dict | None:
    return _fetch_record(session_id)


def append_message(session_id: str, role: str, content: str) -> None:
    record = get_session(session_id)
    if not record:
        raise KeyError('Session not found or expired.')
    record['messages'].append({'role': role, 'content': content})
    session = {
        'patient_data': record['patient_data'],
        'bmi': record['bmi'],
        'assessment': record['assessment'],
        'messages': record['messages'],
    }
    _save_record(session_id, session, record['metadata'])


def list_user_history(user_id: str) -> list[dict]:
    if not user_id:
        return []
    collection = _get_collection()
    result = collection.get(where={'user_id': user_id}, include=['metadatas'])
    history = []
    for session_id, metadata in zip(result['ids'], result['metadatas']):
        history.append(
            {
                'session_id': session_id,
                'created_at': metadata.get('created_at'),
                'patient_name': metadata.get('patient_name', 'Unknown'),
                'severity': metadata.get('severity', 'unknown'),
                'symptoms_preview': metadata.get('symptoms_preview', ''),
                'active': not _is_expired(datetime.fromisoformat(metadata['created_at'])),
            }
        )
    history.sort(key=lambda item: item['created_at'], reverse=True)
    return history


def _is_expired(created_at: datetime) -> bool:
    return datetime.utcnow() - created_at > timedelta(hours=SESSION_TTL_HOURS)
