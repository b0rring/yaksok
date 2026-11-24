import json
from pathlib import Path

MOCK = Path(__file__).parent.parent / "mock" / "drugs.json"


def scan(image: bytes) -> dict:
    # ponytail: OCR/e약은요/LLM 키가 정해지기 전까지 항상 mock. 키 연결은 여기에.
    # 반환: drugs(약 카드) + schedule(복용 시간대 slots, 기간 days)
    return json.loads(MOCK.read_text(encoding="utf-8"))
