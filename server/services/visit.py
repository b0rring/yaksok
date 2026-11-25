import json
from pathlib import Path

from fastapi import HTTPException

from services import llm
from services.scan import image_mime

MOCK = Path(__file__).parent.parent / "mock" / "visit.json"

SCHEMA = {
    "type": "object",
    "properties": {
        "hospital": {"type": "string"},
        "reason": {"type": "string"},
        "summary": {"type": "string"},
        "transcript": {"type": "string"},
    },
    "required": ["hospital", "reason", "summary", "transcript"],
}

PROMPT = """첨부는 진료 중 의사 선생님 말씀을 녹음한 음성, 또는 의사 소견서·진료 확인서 사진입니다. 노약자가 읽을 내용이라 쉬운 우리말로 써 주세요.

- transcript: 음성이면 들리는 말을 그대로 받아쓰고, 사진이면 적힌 글을 그대로 옮기세요. 알아들을 수 없는 부분은 지어내지 말고 빼세요.
- hospital: 병원 이름. 말이나 글에 나오지 않으면 "병원"이라고 쓰세요.
- reason: 병원에 간 이유를 한 줄로.
- summary: 의사 선생님 말씀의 핵심(몸 상태, 조심할 것, 약, 다음 진료)을 두세 문장으로.
- 말이나 글에 없는 내용은 절대 넣지 마세요. 진단을 새로 하거나 처방을 만들지 마세요."""


def _is_image(data: bytes) -> bool:
    return data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n" or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")


def _audio_mime(data: bytes) -> str:
    if data[:4] == b"RIFF":
        return "audio/wav"
    if data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3"):
        return "audio/mp3"
    if data[:4] == b"OggS":
        return "audio/ogg"
    return "audio/m4a"  # 아이폰 녹음(expo-audio)은 m4a


def summarize_visit(media: bytes) -> dict:
    # 진료 녹음(음성) 또는 의견서(사진) → 받아쓰기·요약을 Gemini 한 번으로. 키가 없으면 mock.
    if not llm.enabled():
        return json.loads(MOCK.read_text(encoding="utf-8"))

    mime = image_mime(media) if _is_image(media) else _audio_mime(media)
    text = llm.ask(PROMPT, [(media, mime)], SCHEMA)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(502, "AI 응답을 읽지 못했어요")
    if not (data.get("summary") or "").strip():
        raise HTTPException(422, "말씀을 알아듣지 못했어요")
    return {k: data.get(k, "") for k in ("hospital", "reason", "summary", "transcript")}
