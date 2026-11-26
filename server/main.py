import os

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.chat import answer
from services.organize import organize
from services.scan import scan
from services.visit import summarize_visit

load_dotenv()
app = FastAPI(title="약속")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok"}


# AI 호출은 몇 초 걸리는 동기 함수라 async가 아닌 일반 def로 둬서 서버가 다른 요청(/health)을 계속 받게 한다.
@app.post("/scan")
def scan_image(file: UploadFile):
    return scan(file.file.read())


@app.post("/visit")
def visit(file: UploadFile):
    return summarize_visit(file.file.read())


class ChatIn(BaseModel):
    question: str
    drugs: list[str] = []  # 앱에 등록된 약 이름 (질문에 약 이름이 없을 때 대상)


@app.post("/chat")
def chat(body: ChatIn):
    return answer(body.question, body.drugs)


class OrganizeIn(BaseModel):
    condition: str = ""
    drugs: list[dict]  # [{name, effect, how, caution, avoid}] — 빈 칸을 AI가 채운다


@app.post("/organize")
def organize_drugs(body: OrganizeIn):
    return organize(body.condition, body.drugs)


@app.get("/config")
def config():
    # 카카오 지도 JS 키는 원래 웹에 공개되는 값이라 앱에 알려 준다 (사용할 사이트 주소는 카카오 개발자 콘솔에 등록)
    return {"kakaoKey": os.getenv("KAKAO_JS_KEY", "")}
