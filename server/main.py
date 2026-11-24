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


@app.post("/scan")
async def scan_image(file: UploadFile):
    return {"drugs": scan(await file.read()), "source": "식약처 e약은요"}


@app.post("/visit")
async def visit(file: UploadFile):
    return summarize_visit(await file.read())
