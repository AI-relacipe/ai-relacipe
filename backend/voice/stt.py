import os
import subprocess
import tempfile

import torch
import whisper

_model = None

def get_model():
    global _model
    if _model is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _model = whisper.load_model("small", device=device)
    return _model

def to_wav(audio_path: str) -> str:
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp.close()
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", tmp.name],
            check=True, capture_output=True
        )
    except FileNotFoundError:
        os.remove(tmp.name)
        raise RuntimeError("ffmpeg가 설치되어 있지 않습니다. 'brew install ffmpeg' 또는 'apt install ffmpeg'로 설치해주세요.")
    except subprocess.CalledProcessError as e:
        os.remove(tmp.name)
        raise RuntimeError(f"ffmpeg 변환 실패: {e.stderr.decode() if e.stderr else '알 수 없는 오류'}")
    return tmp.name

def transcribe(audio_path: str) -> str:
    wav_path = None
    try:
        wav_path = to_wav(audio_path)
        model = get_model()
        result = model.transcribe(wav_path, language="ko", fp16=torch.cuda.is_available())
        return result["text"].strip()
    finally:
        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)
