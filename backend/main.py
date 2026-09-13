from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="臺醫通 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/stt")
async def upload_for_stt(file: UploadFile = File(...)):
    if not file.content_type or not (
        file.content_type.startswith("audio/")
        or file.content_type in {"application/octet-stream", "video/webm"}
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Expected audio file, got content_type={file.content_type}",
        )

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio file")

    original_name = file.filename or "recording.webm"
    dest = UPLOAD_DIR / original_name
    dest.write_bytes(raw)

    wav_path = None
    convert_warning = None
    try:
        wav_path = _to_wav_16k_mono(dest)
    except Exception as exc:
        convert_warning = str(exc)

    return {
        "ok": True,
        "filename": original_name,
        "bytes": len(raw),
        "content_type": file.content_type,
        "saved_as": str(dest),
        "wav": str(wav_path) if wav_path else None,
        "convert_warning": convert_warning,
        "transcript": None,
        "note": "檔案已上傳。STT 尚未接上。",
    }


def _to_wav_16k_mono(src: Path) -> Path:
    from pydub import AudioSegment

    audio = AudioSegment.from_file(src)
    audio = audio.set_frame_rate(16000).set_channels(1)
    wav_path = src.with_suffix(".wav")
    audio.export(wav_path, format="wav")
    return wav_path