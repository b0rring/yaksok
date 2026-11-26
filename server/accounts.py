import hashlib
import json
import os
import secrets

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from services.db import conn

# 계정·보호자 연동·약 기록 동기화·커뮤니티 (프로토타입: 서버 SQLite, 간단한 아이디·비밀번호 로그인).
router = APIRouter()
ROLES = ("patient", "guardian", "doctor")
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 헷갈리는 글자(0 O 1 I)를 뺀 6자리 고유 코드


def _hash(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()


def _user_out(u) -> dict:
    return {"id": u["id"], "login_id": u["login_id"], "name": u["name"], "role": u["role"], "code": u["code"]}


def me(authorization: str | None) -> dict:
    token = (authorization or "").removeprefix("Bearer ").strip()
    with conn() as c:
        row = c.execute("SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?", (token,)).fetchone()
    if not row:
        raise HTTPException(401, "로그인이 필요해요")
    return dict(row)


def _session(c, user_id: int) -> str:
    token = secrets.token_urlsafe(24)
    c.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    return token


class Signup(BaseModel):
    login_id: str
    name: str
    role: str
    password: str
    invite: str = ""  # 의사 가입용 초대 코드 (시연용 인증)


class Login(BaseModel):
    login_id: str
    password: str


@router.post("/auth/signup")
def signup(b: Signup):
    lid, name = b.login_id.strip().lower(), b.name.strip()
    if b.role not in ROLES:
        raise HTTPException(422, "역할을 골라 주세요")
    if len(lid) < 3 or len(b.password) < 4 or not name:
        raise HTTPException(422, "아이디 3자 이상, 비밀번호 4자 이상, 이름을 적어 주세요")
    # 의사 인증: 실제 면허 확인 서비스가 없어서 시연용 초대 코드로 대신한다 (server/.env의 DOCTOR_INVITE, 기본 DOCTOR-DEMO)
    if b.role == "doctor" and b.invite.strip() != os.getenv("DOCTOR_INVITE", "DOCTOR-DEMO"):
        raise HTTPException(403, "의사 초대 코드가 맞지 않아요")
    salt = secrets.token_hex(8)
    with conn() as c:
        if c.execute("SELECT 1 FROM users WHERE login_id = ?", (lid,)).fetchone():
            raise HTTPException(409, "이미 있는 아이디예요")
        while True:
            code = "".join(secrets.choice(CODE_CHARS) for _ in range(6))
            if not c.execute("SELECT 1 FROM users WHERE code = ?", (code,)).fetchone():
                break
        cur = c.execute(
            "INSERT INTO users (login_id, name, role, salt, pw, code) VALUES (?,?,?,?,?,?)", (lid, name, b.role, salt, _hash(b.password, salt), code)
        )
        u = c.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
        return {"token": _session(c, u["id"]), "user": _user_out(u)}


@router.post("/auth/login")
def login(b: Login):
    with conn() as c:
        u = c.execute("SELECT * FROM users WHERE login_id = ?", (b.login_id.strip().lower(),)).fetchone()
        if not u or u["pw"] != _hash(b.password, u["salt"]):
            raise HTTPException(401, "아이디나 비밀번호가 맞지 않아요")
        return {"token": _session(c, u["id"]), "user": _user_out(u)}


@router.get("/me")
def get_me(authorization: str | None = Header(None)):
    return _user_out(me(authorization))


# ── 보호자 연동: 보호자가 환자의 고유 코드를 입력하면 연결된다 ──
class LinkIn(BaseModel):
    code: str


@router.post("/links")
def add_link(b: LinkIn, authorization: str | None = Header(None)):
    u = me(authorization)
    if u["role"] != "guardian":
        raise HTTPException(403, "보호자 계정만 연결할 수 있어요")
    with conn() as c:
        p = c.execute("SELECT * FROM users WHERE code = ? AND role = 'patient'", (b.code.strip().upper(),)).fetchone()
        if not p:
            raise HTTPException(404, "이 코드의 환자를 찾지 못했어요")
        c.execute("INSERT OR IGNORE INTO links (patient_id, guardian_id) VALUES (?, ?)", (p["id"], u["id"]))
        return {"id": p["id"], "name": p["name"]}


@router.get("/links")
def list_links(authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        pats = c.execute("SELECT u.id, u.name FROM links l JOIN users u ON u.id = l.patient_id WHERE l.guardian_id = ?", (u["id"],)).fetchall()
        guards = c.execute("SELECT u.id, u.name FROM links l JOIN users u ON u.id = l.guardian_id WHERE l.patient_id = ?", (u["id"],)).fetchall()
    return {"patients": [dict(r) for r in pats], "guardians": [dict(r) for r in guards]}


@router.delete("/links/{other_id}")
def remove_link(other_id: int, authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        c.execute("DELETE FROM links WHERE (patient_id = ? AND guardian_id = ?) OR (patient_id = ? AND guardian_id = ?)", (other_id, u["id"], u["id"], other_id))
    return {"ok": True}


# ── 약 기록 동기화: 환자 앱이 기기 안의 복약 계획·기록·진료 기록을 서버에 올리고, 연결된 보호자가 읽는다 ──
class Snapshot(BaseModel):
    plans: list = []
    logs: list = []
    visits: list = []


@router.put("/sync")
def push_sync(b: Snapshot, authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        c.execute(
            "INSERT INTO snap (user_id, data, updated) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = CURRENT_TIMESTAMP",
            (u["id"], json.dumps(b.model_dump(), ensure_ascii=False)),
        )
    return {"ok": True}


@router.get("/patients/{pid}/data")
def patient_data(pid: int, authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        if not c.execute("SELECT 1 FROM links WHERE patient_id = ? AND guardian_id = ?", (pid, u["id"])).fetchone():
            raise HTTPException(403, "연결된 환자가 아니에요")
        p = c.execute("SELECT name FROM users WHERE id = ?", (pid,)).fetchone()
        s = c.execute("SELECT data, updated FROM snap WHERE user_id = ?", (pid,)).fetchone()
    data = json.loads(s["data"]) if s else {"plans": [], "logs": [], "visits": []}
    return {"name": p["name"], "updated": s["updated"] if s else None, **data}


# ── 커뮤니티: 글 목록·글 보기·댓글. 의사 댓글에는 role=doctor로 "의사" 배지를 단다 ──
class PostIn(BaseModel):
    title: str
    body: str


class CommentIn(BaseModel):
    body: str


@router.get("/posts")
def posts():
    with conn() as c:
        rows = c.execute(
            "SELECT p.id, p.title, substr(p.body, 1, 100) AS body, p.created, u.name, u.role, "
            "(SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments "
            "FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT 50"
        ).fetchall()
    return [dict(r) for r in rows]


@router.post("/posts")
def add_post(b: PostIn, authorization: str | None = Header(None)):
    u = me(authorization)
    title, body = b.title.strip()[:80], b.body.strip()[:2000]
    if not title or not body:
        raise HTTPException(422, "제목과 내용을 적어 주세요")
    with conn() as c:
        cur = c.execute("INSERT INTO posts (user_id, title, body) VALUES (?, ?, ?)", (u["id"], title, body))
        return {"id": cur.lastrowid}


@router.get("/posts/{pid}")
def get_post(pid: int):
    with conn() as c:
        p = c.execute("SELECT p.*, u.name, u.role FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?", (pid,)).fetchone()
        if not p:
            raise HTTPException(404, "글을 찾지 못했어요")
        cs = c.execute("SELECT c.id, c.body, c.created, u.name, u.role FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.id", (pid,)).fetchall()
    return {**{k: p[k] for k in ("id", "title", "body", "created", "name", "role")}, "comments": [dict(r) for r in cs]}


@router.post("/posts/{pid}/comments")
def add_comment(pid: int, b: CommentIn, authorization: str | None = Header(None)):
    u = me(authorization)
    body = b.body.strip()[:1000]
    if not body:
        raise HTTPException(422, "댓글을 적어 주세요")
    with conn() as c:
        if not c.execute("SELECT 1 FROM posts WHERE id = ?", (pid,)).fetchone():
            raise HTTPException(404, "글을 찾지 못했어요")
        c.execute("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)", (pid, u["id"], body))
    return {"ok": True}
