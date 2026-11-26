import json
from pathlib import Path

from fastapi import HTTPException

from services import edrug, llm

MOCK = Path(__file__).parent.parent / "mock" / "drugs.json"
SLOTS = ["morning", "noon", "evening"]

SCHEMA = {
    "type": "object",
    "properties": {
        "drugs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "effect": {"type": "string"},
                    "how": {"type": "string"},
                    "caution": {"type": "string"},
                    "avoid": {"type": "string"},
                },
                "required": ["name", "effect", "how", "caution", "avoid"],
            },
        },
        "condition": {"type": "string"},
        "guess": {"type": "boolean"},
        "schedule": {
            "type": "object",
            "properties": {
                "slots": {"type": "array", "items": {"type": "string", "enum": SLOTS}},
                "days": {"type": "integer"},
            },
            "required": ["slots", "days"],
        },
    },
    "required": ["drugs", "schedule"],
}

PROMPT = """이 사진은 약 봉투, 처방전 또는 약 사진입니다. 노약자가 읽을 내용이라 쉬운 우리말로 써 주세요.

- drugs: 사진에 보이는 약마다 한 개. name은 보이는 약 이름과 용량을 그대로 적고, 읽을 수 없으면 추측하지 말고 빼세요.
  effect는 무엇에 쓰는 약인지, how는 먹는 법, caution은 조심할 점, avoid는 같이 먹으면 안 되는 것을 각각 한두 문장으로 쓰세요.
  확실하지 않은 내용은 지어내지 말고 "의사나 약사에게 물어보세요."라고 쓰세요.
- condition: 이 약들을 무슨 병·증상 때문에 처방받았는지 짧은 우리말 명사로(예: 편도염, 고혈압, 감기). 봉투·처방전에 병명이나 증상이 적혀 있으면
  그대로 쓰고 guess=false. 적혀 있지 않으면 약들의 효능으로 가장 가능성 높은 것을 쓰고 guess=true. 짐작도 어려우면 condition을 빈 글자로 두고 guess=false.
- schedule: 봉투나 처방전에 인쇄된 복용법에서 읽으세요. slots는 아침=morning, 점심=noon, 저녁=evening, days는 복용 일수입니다.
  인쇄된 복용법이 없으면 slots=["morning"], days=7로 두세요.
- 약이 보이지 않는 사진이면 drugs를 빈 배열로 두세요.
- 진단을 하거나 새 처방을 만들지 마세요."""

SOURCE_MOCK = "식약처 e약은요 (시연용 예시 데이터)"
SOURCE_AI = "AI가 사진을 읽어 정리한 내용이에요. 정확한 복용법은 의사나 약사에게 확인하세요."


def image_mime(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def with_official(result: dict) -> dict:
    # 읽은 약마다 식약처 e약은요 공식 설명을 붙인다 (못 찾으면 None → 앱이 "AI가 읽은 설명"이라고 표시)
    for d in result["drugs"]:
        d["official"] = edrug.lookup(d["name"])
    return result


def scan(image: bytes) -> dict:
    # GEMINI_API_KEY가 없으면 시연용 mock, 있으면 Gemini가 사진을 읽는다 (글자 읽기 + 쉬운 말 정리를 한 번에).
    if not llm.enabled():
        return with_official({**json.loads(MOCK.read_text(encoding="utf-8")), "source": SOURCE_MOCK})

    text = llm.ask(PROMPT, [(image, image_mime(image))], SCHEMA)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(502, "AI 응답을 읽지 못했어요")
    if not data.get("drugs"):
        raise HTTPException(422, "사진에서 약을 찾지 못했어요")
    sched = data.get("schedule") or {}
    slots = [s for s in sched.get("slots", []) if s in SLOTS] or ["morning"]
    days = max(1, min(int(sched.get("days") or 7), 90))
    condition = str(data.get("condition") or "").strip()[:20]
    return with_official(
        {
            "drugs": data["drugs"],
            "schedule": {"slots": slots, "days": days},
            "source": SOURCE_AI,
            "condition": condition,
            "guess": bool(data.get("guess")) and bool(condition),
        }
    )
