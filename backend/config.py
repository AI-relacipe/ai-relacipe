import os

from dotenv import load_dotenv

load_dotenv()

# LLM 모델
LLM_MODEL = os.getenv("LLM_MODEL", "claude-haiku-4-5-20251001")
