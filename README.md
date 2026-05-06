# Counter

A debate simulation platform where AI agents argue both sides of a topic. You give it a topic, it normalizes it into a formal resolution, researches evidence from the web, then runs a full structured debate (opening, crossfire, rebuttal, closing) with real-time streaming to the frontend.

The backend is FastAPI + SQLite, the frontend is Vite + React + TypeScript.

**Live demo:** [counter-multi-agent-debate.vercel.app](https://counter-multi-agent-debate.vercel.app/)

## Prerequisites

- Python 3.10+
- Node.js 18+
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- A Google Gemini API key (required as a fallback when Groq is unavailable)

## Setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd Counter
```

### 2. Set up the backend

Create a virtual environment and install dependencies from `backend/`:

```bash
cd backend
python -m venv venv
```

On Windows:
```bash
venv\Scripts\pip install -r requirements.txt
```

On Mac/Linux:
```bash
venv/bin/pip install -r requirements.txt
```

Copy the example env file and fill in your API key:

```bash
cp .env.example .env
```

Edit `backend/.env`:
```
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
DEBATE_ENABLE_LIVE_GENERATION=true
DEBATE_ENABLE_LIVE_RETRIEVAL=true
```

Both keys are required. Groq is the primary model provider and Gemini is the fallback when Groq is unavailable.

### 3. Set up the frontend

From `frontend/`:

```bash
cd frontend
npm install
```

## Running Locally

You need both the backend and frontend running at the same time.

**Start the backend** from `backend/`:

On Windows:
```bash
venv\Scripts\python -m uvicorn app.main:app --reload
```

On Mac/Linux:
```bash
venv/bin/python -m uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`. The SQLite database gets created automatically on first run.

**Start the frontend** from `frontend/`:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` requests to the backend automatically.

Open `http://localhost:5173` in your browser.

## Environment Variables

All backend config lives in `backend/.env`.

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | - | Groq API key (primary model provider) |
| `GOOGLE_API_KEY` | - | Google Gemini API key (required fallback when Groq is unavailable) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | - | GCP service account JSON for text-to-speech |
| `DEBATE_GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model to use |
| `DEBATE_ENABLE_LIVE_GENERATION` | `true` | Toggle AI generation |
| `DEBATE_ENABLE_LIVE_RETRIEVAL` | `true` | Toggle web search for evidence |
| `DEBATE_ENABLE_TTS` | `true` | Toggle text-to-speech |

For the frontend, set `VITE_API_BASE_URL` in `frontend/.env` if you want to point it at a different backend (e.g. the deployed one on Render).

## Frontend Commands

From `frontend/`:

```bash
npm run dev        # start dev server
npm run build      # build for production
npm run preview    # preview the production build
```

## Project Structure

```
Counter/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── api/debates.py       # API routes
│   │   ├── services/            # debate logic, research, TTS
│   │   ├── models/              # Pydantic models
│   │   └── db/repository.py     # SQLite layer
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts               # backend client
    │   ├── useDebateStream.ts   # SSE hook
    │   └── components/
    └── package.json
```
