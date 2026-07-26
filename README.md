# MediLink

**Offline/online AI health kiosk for remote clinics**

MediLink is a full-stack health kiosk that helps rural patients describe symptoms, upload medical reports, receive structured AI assessments, and continue with follow-up chat. It is designed for low-connectivity environments: kiosks can operate with limited internet while the online pipeline adds OCR-backed report analysis and multi-agent LLM synthesis when connectivity is available.

**Live demo:** [medilink.tarunj.in](https://medilink.tarunj.in)

---

## Features

- **Patient intake** — structured form for vitals, symptoms, allergies, medications, and conditions
- **Emergency triage** — keyword screening plus final synthesis-agent escalation for critical cases
- **Multi-agent assessment pipeline**
  1. **Intake agent** — preliminary assessment from patient symptoms (Gemini)
  2. **Report agent** — cross-checks OCR text from uploaded reports against intake (Gemini)
  3. **Synthesis agent** — integrated final recommendation with safety-focused severity decision (Gemini)
- **Medical report OCR** — PDF and image upload via Mistral OCR (max 3 files, 10 MB each)
- **Follow-up chat** — real-time streaming responses over SSE
- **Consultation history** — view, resume, and continue active sessions
- **Secure auth** — signup/login with bearer-token sessions stored in Postgres
- **Three-column UI** — history sidebar, intake form, and sticky results panel with assessment + chat tabs

---

## Tech Stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React, Vite, Tailwind CSS, Axios, React Router |
| Backend | Flask, Gunicorn, Pydantic |
| LLM | Google Gemini (`google-genai`) |
| OCR | Mistral OCR |
| Database | Neon Postgres (`psycopg`) |
| Deployment | Vercel (frontend), Render (backend) |

Early experiments in `Prototypes/` use LangChain and Chainlit; the production app uses a custom Flask + Gemini pipeline.

---

## Project Structure

```
MediLink/
├── MediLink-frontend/     # React SPA (Vite)
│   ├── src/
│   │   ├── pages/         # Home, Login, Signup, Form
│   │   ├── components/    # OutputPanel, ChatPanel, CombinedReport, etc.
│   │   ├── context/       # AuthContext
│   │   └── api/           # Axios client
│   └── vercel.json
├── MediLink-backend/      # Flask API
│   ├── app.py             # Routes and orchestration
│   ├── gemini_client.py   # LLM calls (intake, report, synthesis, chat)
│   ├── mistral_ocr.py     # PDF/image OCR
│   ├── database.py        # Postgres schema and consultation storage
│   ├── prompts.py         # System prompts and templates
│   ├── schemas.py         # Pydantic response models
│   ├── triage.py          # Emergency keyword detection
│   └── auth.py            # Bearer token middleware
└── Prototypes/            # Early LangChain / Chainlit prototypes
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Gemini API key](https://aistudio.google.com/apikey)
- [Mistral API key](https://console.mistral.ai/) (for OCR)
- [Neon Postgres](https://neon.tech) database URL

### 1. Clone the repository

```bash
git clone https://github.com/tarun4632/MediLink.git
cd MediLink
```

### 2. Backend setup

```bash
cd MediLink-backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edit `MediLink-backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
MISTRAL_API_KEY=your_mistral_api_key
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
FLASK_PORT=5000
FLASK_DEBUG=true
```

Start the API:

```bash
python app.py
```

The backend runs at `http://127.0.0.1:5000`. Tables are created automatically on startup.

**Demo account** (seeded on first run):

- Username: `demo`
- Password: `MediLink@123`

### 3. Frontend setup

In a new terminal:

```bash
cd MediLink-frontend
npm install
cp .env.example .env
```

Edit `MediLink-frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:5000
```

Start the dev server:

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/signup` | No | Create account |
| `POST` | `/auth/login` | No | Login, returns bearer token |
| `POST` | `/auth/logout` | Yes | Revoke session |
| `POST` | `/assessment` | Yes | Submit intake (JSON or multipart with reports) |
| `POST` | `/chat` | Yes | Follow-up chat (non-streaming) |
| `POST` | `/chat/stream` | Yes | Follow-up chat (SSE streaming) |
| `GET` | `/history` | Yes | List past consultations |
| `GET` | `/history/<session_id>` | Yes | View or resume a consultation |

Protected routes require:

```http
Authorization: Bearer <token>
```

---

## Assessment Flow

```
Patient form (+ optional PDF/images)
        │
        ▼
  Emergency keyword triage ──► critical? ──► emergency response
        │
        ▼
  Mistral OCR (if files uploaded)
        │
        ▼
  Agent 1: Intake assessment
        │
        ▼
  Agent 2: Report analysis (if reports present)
        │
        ▼
  Agent 3: Final synthesis
        │
        ▼
  Save to Postgres + enable follow-up chat (2-hour active session)
```

---

## Deployment

### Frontend (Vercel)

| Setting | Value |
|---------|-------|
| Root Directory | `MediLink-frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com
```

### Backend (Render)

| Setting | Value |
|---------|-------|
| Root Directory | `MediLink-backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app` |

Environment variables:

```env
GEMINI_API_KEY=...
MISTRAL_API_KEY=...
DATABASE_URL=postgresql://...
FLASK_DEBUG=false
```

### Database (Neon)

Schema is initialized automatically via `database.py` on backend startup. No separate migration step is required.

---

## Environment Variables

### Backend (`MediLink-backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `MISTRAL_API_KEY` | Yes | Mistral API key for OCR |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `GEMINI_MODEL` | No | Default: `gemini-3.1-flash-lite` |
| `GEMINI_TEMPERATURE` | No | Default: `0.3` |
| `FLASK_PORT` | No | Default: `5000` |
| `FLASK_DEBUG` | No | Default: `true` locally |
| `DEMO_USERNAME` | No | Default: `demo` |
| `DEMO_PASSWORD` | No | Default: `MediLink@123` |

### Frontend (`MediLink-frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend base URL (no trailing slash) |

---

## Disclaimer

MediLink provides **informational guidance only** and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider. In a medical emergency, call your local emergency number immediately.

---

## License

This project is for educational and demonstration purposes.
