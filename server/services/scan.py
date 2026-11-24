import json
import os
from pathlib import Path

MOCK = Path(__file__).parent.parent / "mock" / "drugs.json"


def scan(image: bytes) -> list[dict]:
    # 키가 없으면 가짜 응답. 실제 OCR → e약은요 → LLM 연결은 키가 정해지면 여기에 추가.
    # ponytail: 키가 있어도 아직 mock만 반환
    if not (os.getenv("OCR_API_KEY") and os.getenv("MFDS_API_KEY") and os.getenv("LLM_API_KEY")):
        return json.loads(MOCK.read_text(encoding="utf-8"))
    return json.loads(MOCK.read_text(encoding="utf-8"))
