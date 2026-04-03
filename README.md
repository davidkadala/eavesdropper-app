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
|-- Dockerfile
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

- backend on Google Cloud Run
- frontend on Firebase Hosting

### Deploy Backend to Cloud Run

This repo includes a [Dockerfile](/c:/Users/Hp/Documents/Eavesdropper%20App/Dockerfile#L1) that:

- uses Python `3.11.9`
- installs `ffmpeg`
- installs backend dependencies
- runs `uvicorn backend.main:app`

#### 1. Install and initialize Google Cloud CLI

Follow the official setup guide:

- https://cloud.google.com/sdk/docs/install

Then log in:

```bash
gcloud auth login
```

#### 2. Set your Google Cloud project

```bash
gcloud config set project YOUR_PROJECT_ID
```

#### 3. Enable required APIs

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com
```

#### 4. Create Firestore for monthly usage tracking

The backend uses Firestore to store monthly usage totals so the free-tier guard survives restarts and scaling.

Create Firestore in Native mode in your Google Cloud / Firebase project before deploying the backend.

#### 5. Deploy the backend

From the project root, run:

```bash
gcloud run deploy eavesdropper-backend ^
  --source . ^
  --region us-central1 ^
  --platform managed ^
  --allow-unauthenticated ^
  --memory 2Gi ^
  --cpu 1 ^
  --set-env-vars WHISPER_MODEL=tiny,FRONTEND_ORIGINS=https://your-firebase-app.web.app,https://your-firebase-site.firebaseapp.com
```

If you are using Bash instead of PowerShell/cmd line continuation, use:

```bash
gcloud run deploy eavesdropper-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --set-env-vars WHISPER_MODEL=tiny,FRONTEND_ORIGINS=https://your-firebase-app.web.app,https://your-firebase-site.firebaseapp.com
```

Why `2Gi`:

- Render free ran out of memory
- Whisper `tiny` still needs room for Python, Torch, ffmpeg, and transcription work
- Cloud Run lets you choose a larger memory size

Monthly free-tier guard:

- the backend tracks monthly request count, vCPU-seconds, and GiB-seconds in Firestore
- once usage reaches the configured threshold, transcription requests are blocked
- the default threshold is `0.8`, which means `80%`
- the API returns: `free usage limits reached, try again next month`

After deployment, note your backend URL. It will look similar to:

```text
https://eavesdropper-backend-xxxxx-uc.a.run.app
```

### Deploy Frontend to Firebase Hosting

This repo includes:

- [firebase.json](/c:/Users/Hp/Documents/Eavesdropper%20App/firebase.json#L1)
- [frontend/.env.example](/c:/Users/Hp/Documents/Eavesdropper%20App/frontend/.env.example#L1)

Before building the frontend for production, create `frontend/.env` and point it to your Cloud Run backend:

```bash
VITE_API_BASE_URL=https://your-cloud-run-url.a.run.app
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

Usage-guard environment variables:

```bash
FREE_USAGE_THRESHOLD_RATIO=0.8
USAGE_GUARD_ENABLED=true
CLOUD_RUN_MEMORY_GIB=2
CLOUD_RUN_VCPU_COUNT=1
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

If the deployed backend fails on startup or transcription, check:

- Cloud Run service logs
- memory setting is high enough, such as `2Gi`
- the deployed service URL is included in frontend config
- the Firebase URLs are included in `FRONTEND_ORIGINS`
