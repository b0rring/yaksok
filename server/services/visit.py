import json
from pathlib import Path

MOCK = Path(__file__).parent.parent / "mock" / "visit.json"


def summarize_visit(image: bytes) -> dict:
    # ponytail: OCR/LLM 키가 정해지기 전까지 항상 mock. 키 연결은 여기에.
    return json.loads(MOCK.read_text(encoding="utf-8"))
