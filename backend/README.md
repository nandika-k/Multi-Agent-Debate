# Multi-Agent Debate Backend

## Setup

1. Create `backend/.env` from `backend/.env.example`
2. Set `OPENAI_API_KEY` if `DEBATE_ENABLE_LIVE_GENERATION=true`
3. Install runtime dependencies:

```bash
backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

4. Install test dependencies when needed:

```bash
backend\venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
```

## Run

From `backend`:

```bash
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Test

From the project root:

```bash
backend\venv\Scripts\python.exe -m pytest backend\tests
```
