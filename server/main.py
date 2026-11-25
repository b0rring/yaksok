from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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
