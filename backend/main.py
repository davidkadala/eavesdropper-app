import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .transcription_program import TranscriptionService
from .usage_tracker import FreeUsageLimitError


app = FastAPI(
    title="Transcription API",
    description="Upload an audio file and get a Whisper transcription.",
    version="1.0.0",
)

service = TranscriptionService()


def _allowed_origins() -> list[str]:
    configured = os.getenv("FRONTEND_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    if origins:
        return origins

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TranscriptionResponse(BaseModel):
    filename: str
    text: str
    detected_language: str | None = None
    model: str
    document_filename: str
    document_download_url: str


@app.get("/")
def read_root() -> dict[str, str]:
    return {
        "message": "Transcription API is running.",
        "docs": "/docs",
        "model": service.model_name,
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    model_status = "loaded" if service.model is not None else "not_loaded"
    return {"status": "ok", "model": service.model_name, "model_status": model_status}


@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> TranscriptionResponse:
    try:
        result = await service.transcribe_upload(file)
        return TranscriptionResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FreeUsageLimitError as exc:
        raise HTTPException(status_code=429, detail="free usage limits reached, try again next month") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc


@app.get("/downloads/{document_name}")
def download_transcript(document_name: str) -> FileResponse:
    document_path = (service.export_dir / document_name).resolve()
    export_root = service.export_dir.resolve()

    if export_root not in document_path.parents or not document_path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")

    return FileResponse(
        path=document_path,
        filename=document_path.name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
