# Eavesdropper App

Eavesdropper is a full-stack audio transcription app with:

- a `FastAPI` backend that transcribes uploaded audio locally with Whisper
- a `React + Vite` frontend for choosing files, tracking transcription state, reading the transcript, and downloading a Word document

## Features

- Upload supported audio files from the browser
- Transcribe audio with OpenAI Whisper
- Show transcription progress state in the UI
- Preview the transcribed text in the app
- Download the transcript as a `.docx` file

## Project Structure

```text
Eavesdropper App/
|-- backend/
|   |-- main.py
|   |-- transcription_program.py
|   |-- requirements.txt
|   `-- exports/
|-- frontend/
|   |-- src/
|   |-- package.json
|   `-- README.md
|-- render.yaml
|-- firebase.json
`-- README.md
```

## Requirements

Before running the project, make sure you have:

- Python 3.11.9
- Node.js and npm
- `ffmpeg` and `ffprobe` installed and available on your system `PATH`

## Backend Setup

From the project root:

```bash
pip install -r backend/requirements.txt
```

Start the backend:

```bash
uvicorn backend.main:app --reload
```

The backend will run on:

```text
http://127.0.0.1:8000
```

Useful backend routes:

- `GET /health` - backend health check
- `POST /transcribe` - upload audio for transcription
- `GET /downloads/{document_name}` - download generated `.docx` file
- `GET /docs` - FastAPI interactive API docs

## Frontend Setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

Or run it from the project root without changing directory:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

The frontend runs on:

```text
http://127.0.0.1:5173
```

## Deployment

This project is structured to support:

- backend on Render
- frontend on Firebase Hosting

### Deploy Backend to Render

This repo includes `render.yaml` for a Render web service.

Render settings used by this project:

- Build command: `pip install -r backend/requirements.txt`
- Start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

Important environment variables for Render:

- `PYTHON_VERSION=3.11.9`
- `WHISPER_MODEL=tiny`
- `FRONTEND_ORIGINS=https://your-firebase-app.web.app,https://your-firebase-site.firebaseapp.com`

After deployment, note your Render backend URL. It will look similar to:

```text
https://your-service-name.onrender.com
```

### Deploy Frontend to Firebase Hosting

This repo includes:

- `firebase.json`
- `.firebaseignore`
- `frontend/.env.example`

Before building the frontend for production, create `frontend/.env` and point it to your Render backend:

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Then build the frontend:

```bash
npm --prefix frontend install
npm --prefix frontend run build
```

Initialize Firebase Hosting if you have not already:

```bash
firebase login
firebase init hosting
```

When prompted during Firebase setup:

- use the existing `firebase.json`
- set the public directory to `frontend/dist`
- configure it as a single-page app

Then deploy:

```bash
firebase deploy
```

## How It Works

1. The user selects an audio file in the frontend.
2. The frontend sends the file to `POST /transcribe`.
3. The backend converts the uploaded audio to WAV.
4. Whisper transcribes the audio locally.
5. The backend generates a `.docx` transcript and saves it in `backend/exports/`.
6. The frontend shows the transcript and provides a download button for the Word file.

## Supported Audio Formats

The backend currently accepts:

- `.mp3`
- `.wav`
- `.opus`
- `.m4a`
- `.aac`
- `.ogg`
- `.flac`

## Environment Notes

The backend supports setting the Whisper model with an environment variable:

```bash
WHISPER_MODEL=tiny
```

If `WHISPER_MODEL` is not set, it defaults to:

```text
tiny
```

The frontend can optionally point to a different backend URL by creating `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Output Files

Generated Word documents are saved in:

```text
backend/exports/
```

Each transcription response includes:

- the original filename
- the transcribed text
- detected language
- model name
- generated document filename
- document download URL

## Development Notes

- The frontend uses a simple, task-focused UI for transcription.
- The backend uses local Whisper inference with lazy model loading.
- The frontend proxies API requests to the backend during local development.
- The backend uses `FRONTEND_ORIGINS` for production CORS configuration.

## Troubleshooting

If `npm run dev` fails from the project root, use:

```bash
npm --prefix frontend run dev
```

If transcription fails, check:

- the backend is running on port `8000`
- `ffmpeg` and `ffprobe` are installed
- the uploaded file format is supported
- the required Python packages are installed

If the download button does not work, check that:

- transcription completed successfully
- the generated file exists in `backend/exports/`
- the backend is still running
