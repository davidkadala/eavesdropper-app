# Frontend

React frontend for the Eavesdropper transcription app.

## Run

1. Install dependencies with `npm install`
2. Start the FastAPI backend with `uvicorn backend.main:app --reload`
3. Start the frontend with `npm run dev`

## Optional environment variable

Create a `.env` file inside `frontend` if you want to point at a different API base URL:

`VITE_API_BASE_URL=http://127.0.0.1:8000`
