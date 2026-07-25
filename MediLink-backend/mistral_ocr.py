import base64
import mimetypes
import os

from mistralai.client import Mistral

MAX_FILE_BYTES = 10 * 1024 * 1024
OCR_MODEL = 'mistral-ocr-latest'

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'}
MIME_BY_EXTENSION = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
}

_client = None


def get_client() -> Mistral:
    global _client
    if _client is None:
        api_key = os.environ.get('MISTRAL_API_KEY')
        if not api_key:
            raise ValueError('Set MISTRAL_API_KEY in MediLink-backend/.env')
        _client = Mistral(api_key=api_key)
    return _client


def _get_extension(filename: str) -> str:
    return os.path.splitext(filename.lower())[1]


def _get_mime_type(filename: str) -> str:
    ext = _get_extension(filename)
    if ext in MIME_BY_EXTENSION:
        return MIME_BY_EXTENSION[ext]
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or 'application/octet-stream'


def is_allowed_report_file(filename: str) -> bool:
    return _get_extension(filename) in ALLOWED_EXTENSIONS


def extract_document_text(filename: str, file_bytes: bytes) -> dict:
    if not is_allowed_report_file(filename):
        allowed = ', '.join(sorted(ALLOWED_EXTENSIONS))
        raise ValueError(f'Unsupported file type for {filename}. Allowed: {allowed}')
    if len(file_bytes) > MAX_FILE_BYTES:
        raise ValueError(f'{filename} exceeds the 10 MB limit.')
    if not file_bytes:
        raise ValueError(f'{filename} is empty.')

    mime_type = _get_mime_type(filename)
    encoded = base64.b64encode(file_bytes).decode('utf-8')
    client = get_client()
    response = client.ocr.process(
        model=OCR_MODEL,
        document={
            'type': 'document_url',
            'document_url': f'data:{mime_type};base64,{encoded}',
        },
    )

    pages = getattr(response, 'pages', None) or []
    text_parts = []
    for page in pages:
        markdown = getattr(page, 'markdown', None) or ''
        if markdown.strip():
            text_parts.append(markdown.strip())

    full_text = '\n\n'.join(text_parts).strip()
    if not full_text:
        raise ValueError(f'No text could be extracted from {filename}.')

    return {
        'text': full_text,
        'page_count': len(pages) or 1,
    }


def extract_pdf_text(filename: str, file_bytes: bytes) -> dict:
    """Backward-compatible alias."""
    return extract_document_text(filename, file_bytes)
