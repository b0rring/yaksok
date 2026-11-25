import base64
import os

from fastapi import HTTPException

# 무료 구간에서 이미지·음성을 모두 받는 빠른 모델. 바꾸려면 server/.env의 GEMINI_MODEL.
DEFAULT_MODEL = "gemini-3.5-flash-lite"
TIMEOUT_S = 30  # 한 번에 기다릴 최대 시간(초)
ATTEMPTS = 2


def enabled() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


def ask(prompt: str, media: list[tuple[bytes, str]], schema: dict) -> str:
    """프롬프트와 사진·음성(바이트, MIME)을 Gemini에 보내고 schema에 맞는 JSON 문자열을 돌려준다."""
    from google import genai

    parts = [{"type": "text", "text": prompt}] + [
        {
            "type": "image" if mime.startswith("image/") else "audio",
            "data": base64.b64encode(data).decode(),
            "mime_type": mime,
        }
        for data, mime in media
    ]
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))  # 변수로 붙잡아 둬야 요청 중에 닫히지 않는다
    # 구글 쪽 응답이 가끔 오래 걸려서(기본값은 무한 대기) 시간 제한을 두고 한 번 더 시도한다.
    for attempt in range(ATTEMPTS):
        try:
            interaction = client.interactions.create(
                model=os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
                input=parts,
                response_format={"type": "text", "mime_type": "application/json", "schema": schema},
                timeout=TIMEOUT_S,
            )
            break
        except Exception as e:  # SDK의 오류 클래스가 비공개라 넓게 잡고, 키 같은 상세 정보는 돌려주지 않는다
            if attempt == ATTEMPTS - 1:
                raise HTTPException(502, f"AI 호출 실패: {type(e).__name__} {getattr(e, 'status_code', '')}")
    return interaction.output_text
