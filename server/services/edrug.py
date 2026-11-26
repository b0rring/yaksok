import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path

# 식약처 e약은요(의약품개요정보) 조회. MFDS_API_KEY(공공데이터포털)가 없으면 시연용 예시(mock/edrug.json)를 쓴다.
# 실제 키로 확인함(2026-11-26): 주소와 serviceKey·type=json은 맞고, 응답은 {"header":..., "body":{"items":[...]}} 모양이다.
# 네트워크·키·형식 오류는 조용히 "없음"(None)으로 처리한다.
URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"
MOCK = Path(__file__).parent.parent / "mock" / "edrug.json"
TIMEOUT_S = 10

# 응답 필드 → 우리가 쓰는 이름
FIELDS = {
    "efcy": "efcyQesitm",  # 효능
    "use": "useMethodQesitm",  # 사용법
    "warn": "atpnWarnQesitm",  # 주의사항 경고
    "atpn": "atpnQesitm",  # 주의사항
    "intrc": "intrcQesitm",  # 상호작용
    "se": "seQesitm",  # 부작용
    "deposit": "depositMethodQesitm",  # 보관법
}


def enabled() -> bool:
    return bool(os.getenv("MFDS_API_KEY"))


def clean(name: str) -> str:
    """'타이레놀정 500mg' → '타이레놀정' (용량 앞까지만)"""
    return re.split(r"\s*\d", name.strip())[0].strip()


def _text(v) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", v or "")).strip()


def _items(data: dict) -> list:
    body = data.get("body") or (data.get("response") or {}).get("body") or {}  # 실제 응답은 바깥 "response" 없이 body가 바로 온다
    items = body.get("items")
    if isinstance(items, dict):  # {"item": [...]} 모양일 수도 있다
        items = items.get("item", items)
    if isinstance(items, dict):
        items = [items]
    return items if isinstance(items, list) else []


def _pick(it: dict) -> dict:
    out = {"name": _text(it.get("itemName")), "company": _text(it.get("entpName")), "demo": False}
    out.update({k: _text(it.get(v)) for k, v in FIELDS.items()})
    return out


def _best(items: list, query: str) -> dict:
    # 검색어와 이름이 가장 가까운 것: 검색어로 시작 > 바로 뒤가 제형·용량(정, 500…) > 이름이 짧은 것
    # ("타이레놀" → 어린이타이레놀산·타이레놀콜드-에스정보다 타이레놀정500밀리그람)
    def rank(it: dict):
        name = it.get("itemName") or ""
        rest = name[len(query):] if name.startswith(query) else ""
        return (not name.startswith(query), query not in name, not re.match(r"(정|캡슐|시럽|액|산)?\d", rest), len(name))

    return min(items, key=rank)


def _fetch(query: str) -> dict | None:
    # 포털에서 받은 키가 이미 URL 인코딩된 것(Encoding 키)일 수도 있어서 한 번 풀고 다시 인코딩한다
    key = urllib.parse.unquote(os.getenv("MFDS_API_KEY", ""))
    qs = urllib.parse.urlencode({"serviceKey": key, "itemName": query, "type": "json", "numOfRows": 10, "pageNo": 1})
    try:
        with urllib.request.urlopen(f"{URL}?{qs}", timeout=TIMEOUT_S) as r:
            items = _items(json.loads(r.read().decode("utf-8")))
    except Exception:  # 네트워크·키·형식 오류는 모두 "공식 정보 없음"으로 (키 같은 상세는 노출하지 않는다)
        return None
    return _pick(_best(items, query)) if items else None


def lookup(name: str) -> dict | None:
    """약 이름으로 공식 설명을 찾는다. 없으면 None."""
    n = clean(name)
    if len(n) < 2:
        return None
    if not enabled():
        mock = json.loads(MOCK.read_text(encoding="utf-8"))
        hit = next((v for k, v in mock.items() if k in n or n in k), None)
        return {**hit, "demo": True} if hit else None
    # 먼저 그대로, 안 나오면 끝의 제형(정·캡슐·시럽…)을 뗀 이름으로 한 번 더
    for q in dict.fromkeys([n, re.sub(r"(정|캡슐|시럽|현탁액|액|산)$", "", n)]):
        if len(q) >= 2 and (found := _fetch(q)):
            return found
    return None
