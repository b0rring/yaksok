import json

from fastapi import HTTPException

from services import edrug, llm

SCHEMA = {
    "type": "object",
    "properties": {"answer": {"type": "string"}, "found": {"type": "boolean"}},
    "required": ["answer", "found"],
}
NAMES_SCHEMA = {"type": "object", "properties": {"names": {"type": "array", "items": {"type": "string"}}}, "required": ["names"]}

NOT_FOUND = "공식 정보에서 이 약을 찾지 못했어요. 정확한 내용은 의사나 약사에게 물어보세요."
NOT_IN_INFO = "공식 정보에 없는 내용이에요. 의사나 약사에게 물어보세요."

PROMPT = """다음은 식약처 e약은요 공식 정보입니다. 질문에 답하세요.

규칙:
- 아래 공식 정보에 있는 내용만으로, 노약자가 읽을 쉬운 우리말 두세 문장으로 답하세요.
- 공식 정보에 답이 없으면 found를 false로 하고 answer에 "{not_in_info}"라고만 쓰세요.
- 진단하거나, 복용량을 바꾸라고 하거나, 새 약을 권하지 마세요. 걱정되는 증상은 의사나 약사에게 물어보라고 덧붙이세요.

[공식 정보]
{info}

[질문]
{question}"""


def _names_in(question: str) -> list[str]:
    """질문에서 약 이름을 뽑는다 (AI가 있을 때만)."""
    if not llm.enabled():
        return []
    try:
        data = json.loads(llm.ask(f"다음 질문에 나온 약 이름만 뽑아 주세요. 없으면 빈 배열.\n질문: {question}", [], NAMES_SCHEMA))
        return [n for n in data.get("names", []) if isinstance(n, str)]
    except (HTTPException, json.JSONDecodeError):
        return []


def answer(question: str, drugs: list[str]) -> dict:
    q = question.strip()[:300]
    if not q:
        raise HTTPException(422, "질문이 비었어요")
    drugs = [d for d in drugs if edrug.clean(d)][:20]

    # 대상 약: 질문에 나온 등록 약 → 질문 속 약 이름 → (둘 다 없으면) 등록한 약들
    names = [d for d in drugs if edrug.clean(d) in q] or _names_in(q) or drugs
    infos = [i for n in names[:3] if (i := edrug.lookup(n))]
    if not infos:
        return {"answer": NOT_FOUND, "sources": [], "demo": False}

    demo = any(i["demo"] for i in infos)
    sources = [i["name"] for i in infos]
    if not llm.enabled():  # AI 키가 없으면 공식 효능 문장을 그대로 보여준다 (시연용)
        return {"answer": "\n".join(f"{i['name']}: {i['efcy']}" for i in infos), "sources": sources, "demo": True}

    info = "\n\n".join(
        f"약 이름: {i['name']}\n효능: {i['efcy']}\n사용법: {i['use']}\n주의사항: {i['warn']} {i['atpn']}\n상호작용: {i['intrc']}\n부작용: {i['se']}\n보관법: {i['deposit']}"[:2000]
        for i in infos
    )
    text = llm.ask(PROMPT.format(not_in_info=NOT_IN_INFO, info=info, question=q), [], SCHEMA)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(502, "AI 응답을 읽지 못했어요")
    return {"answer": data.get("answer") or NOT_IN_INFO, "sources": sources, "demo": demo}
