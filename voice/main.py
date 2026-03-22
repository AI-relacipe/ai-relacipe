import os
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from stt import transcribe
from emotion import analyze_emotion

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
    expose_headers=["*"],
)


@app.post("/voice")
async def voice(file: UploadFile = File(...)):
    """음성 파일을 받아 STT + 감정 분석 결과 반환"""
    suffix = os.path.splitext(file.filename)[-1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        text = transcribe(tmp_path)
        emotion = analyze_emotion(tmp_path)
    finally:
        os.remove(tmp_path)

    return {"text": text, "emotion": emotion}


@app.get("/health")
def health():
    return {"ok": True}
