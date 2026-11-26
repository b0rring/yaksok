import json

from fastapi import HTTPException

from services import edrug, llm

FIELDS = ["effect", "how", "caution", "avoid"]
ASK = "의사나 약사에게 물어보세요."

SCHEMA = {
    "type": "object",
    "properties": {
        "drugs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"name": {"type": "string"}, **{f: {"type": "string"} for f in FIELDS}},
                "required": ["name", *FIELDS],
            },
        }
    },
    "required": ["drugs"],
}

PROMPT = """사용자가 직접 적은 약 정보입니다. 의료 지식이 없는 노약자가 읽을 내용이라 쉬운 우리말로 정리해 주세요.

- 약마다 effect(무엇에 쓰는 약인지), how(먹는 법), caution(조심할 점), avoid(같이 먹으면 안 되는 것)를 한두 문장으로 쓰세요.
- 사용자가 이미 적은 항목은 그대로 두고, 비어 있는 항목만 약 이름과 적힌 내용을 바탕으로 채우세요.
- 약마다 따로 판단하세요. 약 이름만 봐도 일반적으로 알려진 내용(효능, 보통의 먹는 법, 일반적인 주의)은 채우고,
  그 약이 무엇인지 모르거나 확실하지 않은 칸만 지어내지 말고 "{ask}"라고 쓰세요. 한 약을 모른다고 다른 약까지 건너뛰지 마세요.
- 병명이 적혀 있으면 참고만 하세요. 진단하거나 복용량을 정하거나 새 약을 권하지 마세요.

병명: {condition}
약 목록(JSON):
{drugs}"""


def _fallback(d: dict, off: dict | None) -> dict:
    # AI 키가 없을 때: 식약처 공식 문장으로 빈 칸을 채우고, 없으면 "물어보세요"
    take = lambda s: (s or ASK)[:200]
    guess = {
        "effect": take(off and off["efcy"]),
        "how": take(off and off["use"]),
        "caution": take(off and (off["warn"] or off["atpn"])),
        "avoid": take(off and off["intrc"]),
    }
    return {f: d.get(f) or guess[f] for f in FIELDS}


def organize(condition: str, drugs: list[dict]) -> dict:
    """사용자가 적은 약 정보(빈 칸 포함)를 AI가 쉬운 말로 채운다. 이미 적은 칸은 절대 바꾸지 않는다."""
    drugs = [{"name": str(d.get("name", "")).strip()[:60], **{f: str(d.get(f, "")).strip()[:500] for f in FIELDS}} for d in drugs[:10]]
    drugs = [d for d in drugs if d["name"]]
    if not drugs:
        raise HTTPException(422, "약 이름을 적어 주세요")
    official = [edrug.lookup(d["name"]) for d in drugs]

    filled: list[dict] = [{} for _ in drugs]
    if llm.enabled():
        text = llm.ask(PROMPT.format(ask=ASK, condition=condition.strip()[:30] or "모름", drugs=json.dumps(drugs, ensure_ascii=False)), [], SCHEMA)
        try:
            ai = json.loads(text).get("drugs", [])
        except json.JSONDecodeError:
            raise HTTPException(502, "AI 응답을 읽지 못했어요")
        # 순서가 같다고 가정하지 않고 이름으로 맞춘다
        filled = [next((a for a in ai if isinstance(a, dict) and a.get("name") == d["name"]), {}) for d in drugs]

    out = []
    for d, a, off in zip(drugs, filled, official):
        base = _fallback(d, off) if not a else {f: d[f] or str(a.get(f) or "").strip() or ASK for f in FIELDS}
        out.append({"name": d["name"], **base, "official": off})
    return {"drugs": out}
