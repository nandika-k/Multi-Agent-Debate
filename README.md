# Multi-Agent Debate

This project now has a FastAPI backend in [backend](C:/Users/nkarn/Code/Classes/CS485_ThrivingInTheAgeOfAI/Multi_Agent_Debate/backend) and a Vite + React frontend in [frontend](C:/Users/nkarn/Code/Classes/CS485_ThrivingInTheAgeOfAI/Multi_Agent_Debate/frontend).

## Local Development

1. Set up the backend:

```bash
backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

2. Start the backend from `backend/`:

```bash
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

3. Install the frontend dependencies from `frontend/`:

```bash
npm install
```

4. Start the frontend dev server from `frontend/`:

```bash
npm run dev
```

The frontend proxies `/api` requests to `http://127.0.0.1:8000` during development. To point it at another backend, set `VITE_API_BASE_URL`.

## Frontend Commands

From `frontend/`:

```bash
npm run dev
npm run test:run
npm run build
```
