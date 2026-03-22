import torch
import subprocess
import tempfile
import os
from transformers import pipeline

MODEL_NAME = "superb/wav2vec2-base-superb-er"

_pipe = None

def get_pipe():
    global _pipe
    if _pipe is None:
        device = 0 if torch.cuda.is_available() else -1
        _pipe = pipeline("audio-classification", model=MODEL_NAME, device=device)
    return _pipe

def to_wav(audio_path: str) -> str:
    """webm/ogg 등을 wav로 변환"""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp.close()
    subprocess.run(
        ["ffmpeg", "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", tmp.name],
        check=True, capture_output=True
    )
    return tmp.name

def analyze_emotion(audio_path: str) -> dict:
    wav_path = None
    try:
        wav_path = to_wav(audio_path)
        pipe = get_pipe()
        results = pipe(wav_path)
        top = results[0]
        return {"label": top["label"], "score": round(top["score"], 3)}
    finally:
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)
