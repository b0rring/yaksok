import hashlib
import json
import os
import secrets

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from services.db import conn

# 계정·보호자 연동(상대 허락 필요)·약 기록 동기화·커뮤니티 (프로토타입: 서버 SQLite, 간단한 아이디·비밀번호 로그인).
router = APIRouter()
ROLES = ("patient", "guardian", "doctor")
CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 헷갈리는 글자(0 O 1 I)를 뺀 6자리 고유 코드


def _hash(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000).hex()


def _new_code(c) -> str:
    while True:
        code = "".join(secrets.choice(CODE_CHARS) for _ in range(6))
        if not c.execute("SELECT 1 FROM users WHERE code = ?", (code,)).fetchone():
            return code


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
        code = _new_code(c)
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


# ── 보호자 연동: 환자와 보호자가 서로의 고유 코드로 연결을 요청하고, 상대가 허락하면 연결된다 ──
EMPTY = {"plans": [], "logs": [], "visits": []}


class LinkIn(BaseModel):
    code: str


def _pair(c, a: int, b: int):
    return c.execute(
        "SELECT * FROM links WHERE (patient_id = ? AND guardian_id = ?) OR (patient_id = ? AND guardian_id = ?)", (a, b, b, a)
    ).fetchone()


@router.post("/me/code")
def new_code(authorization: str | None = Header(None)):
    """고유 코드를 새로 받는다 (코드가 남에게 알려졌을 때). 이미 연결된 사람은 그대로다."""
    u = me(authorization)
    with conn() as c:
        code = _new_code(c)
        c.execute("UPDATE users SET code = ? WHERE id = ?", (code, u["id"]))
    return {"code": code}


@router.post("/links")
def add_link(b: LinkIn, authorization: str | None = Header(None)):
    u = me(authorization)
    if u["role"] not in ("patient", "guardian"):
        raise HTTPException(403, "환자와 보호자 계정만 연결할 수 있어요")
    with conn() as c:
        t = c.execute("SELECT * FROM users WHERE code = ?", (b.code.strip().upper(),)).fetchone()
        if not t:
            raise HTTPException(404, "이 코드의 계정을 찾지 못했어요")
        if t["id"] == u["id"]:
            raise HTTPException(422, "내 코드예요. 상대의 코드를 넣어 주세요")
        if {u["role"], t["role"]} != {"patient", "guardian"}:
            raise HTTPException(422, "환자와 보호자끼리만 연결할 수 있어요")
        pid, gid = (u["id"], t["id"]) if u["role"] == "patient" else (t["id"], u["id"])
        row = _pair(c, pid, gid)
        out = {"id": t["id"], "name": t["name"], "role": t["role"]}
        if row:
            if row["status"] == "active":
                raise HTTPException(409, "이미 연결돼 있어요")
            if row["requester"] == u["id"]:
                raise HTTPException(409, "이미 요청했어요. 상대가 허락하면 연결돼요")
            # 상대가 먼저 요청해 둔 경우: 서로 원하는 것이므로 바로 연결한다
            c.execute("UPDATE links SET status = 'active' WHERE patient_id = ? AND guardian_id = ?", (pid, gid))
            return {**out, "status": "active"}
        c.execute("INSERT INTO links (patient_id, guardian_id, status, requester) VALUES (?, ?, 'pending', ?)", (pid, gid, u["id"]))
        return {**out, "status": "pending"}


@router.get("/links")
def list_links(authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        rows = c.execute(
            "SELECT l.status, l.requester, l.patient_id, l.guardian_id, p.name AS pn, g.name AS gn FROM links l "
            "JOIN users p ON p.id = l.patient_id JOIN users g ON g.id = l.guardian_id WHERE l.patient_id = ? OR l.guardian_id = ?",
            (u["id"], u["id"]),
        ).fetchall()
    out = {"patients": [], "guardians": [], "incoming": [], "outgoing": []}
    for r in rows:
        mine_is_patient = r["patient_id"] == u["id"]
        other = {"id": r["guardian_id"], "name": r["gn"], "role": "guardian"} if mine_is_patient else {"id": r["patient_id"], "name": r["pn"], "role": "patient"}
        if r["status"] == "active":
            out["guardians" if mine_is_patient else "patients"].append({"id": other["id"], "name": other["name"]})
        else:
            out["outgoing" if r["requester"] == u["id"] else "incoming"].append(other)
    return out


@router.post("/links/{other_id}/accept")
def accept_link(other_id: int, authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        row = _pair(c, u["id"], other_id)
        if not row or row["status"] != "pending" or row["requester"] == u["id"]:
            raise HTTPException(404, "받은 요청이 없어요")
        c.execute("UPDATE links SET status = 'active' WHERE patient_id = ? AND guardian_id = ?", (row["patient_id"], row["guardian_id"]))
    return {"ok": True}


@router.delete("/links/{other_id}")
def remove_link(other_id: int, authorization: str | None = Header(None)):
    """연결 끊기, 받은 요청 거절, 보낸 요청 취소가 모두 이것이다."""
    u = me(authorization)
    with conn() as c:
        c.execute("DELETE FROM links WHERE (patient_id = ? AND guardian_id = ?) OR (patient_id = ? AND guardian_id = ?)", (other_id, u["id"], u["id"], other_id))
    return {"ok": True}


# ── 약 기록 동기화: 환자의 복약 계획·기록·진료 기록은 서버에도 한 부 있다. 환자 본인 기기와 연결된 보호자가 같이 읽고 고친다 ──
# rev: 저장할 때마다 1 올라가는 번호. 쓰는 쪽이 "내가 본 번호(base)"를 같이 보내고, 그새 남이 고쳤으면(번호가 다르면) 저장하지 않고 최신본을 돌려준다.
class Snapshot(BaseModel):
    plans: list = []
    logs: list = []
    visits: list = []
    base: int | None = None  # None이면 번호를 따지지 않고 덮어쓴다


def _read_snap(c, uid: int):
    s = c.execute("SELECT data, updated, rev FROM snap WHERE user_id = ?", (uid,)).fetchone()
    if not s:
        return {k: [] for k in EMPTY}, 0, None
    return json.loads(s["data"]), s["rev"], s["updated"]


def _write_snap(uid: int, b: Snapshot):
    with conn() as c:
        c.execute("BEGIN IMMEDIATE")  # ponytail: SQLite 쓰기 잠금으로 번호 검사와 저장을 한꺼번에. 사용자가 늘면 DB를 바꿔야 한다
        data, rev, _ = _read_snap(c, uid)
        if b.base is not None and b.base != rev:
            return {"ok": False, "rev": rev, "data": data}
        new = {"plans": b.plans, "logs": b.logs, "visits": b.visits}
        c.execute(
            "INSERT INTO snap (user_id, data, updated, rev) VALUES (?, ?, CURRENT_TIMESTAMP, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = CURRENT_TIMESTAMP, rev = excluded.rev",
            (uid, json.dumps(new, ensure_ascii=False), rev + 1),
        )
        return {"ok": True, "rev": rev + 1, "data": new}


def _guardian_of(c, pid: int, gid: int):
    if not c.execute("SELECT 1 FROM links WHERE patient_id = ? AND guardian_id = ? AND status = 'active'", (pid, gid)).fetchone():
        raise HTTPException(403, "연결된 환자가 아니에요")


@router.get("/sync")
def get_sync(authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        data, rev, updated = _read_snap(c, u["id"])
    return {"rev": rev, "updated": updated, "data": data}


@router.put("/sync")
def push_sync(b: Snapshot, authorization: str | None = Header(None)):
    return _write_snap(me(authorization)["id"], b)


@router.get("/patients/{pid}/data")
def patient_data(pid: int, authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        _guardian_of(c, pid, u["id"])
        p = c.execute("SELECT name FROM users WHERE id = ?", (pid,)).fetchone()
        data, rev, updated = _read_snap(c, pid)
    return {"name": p["name"], "rev": rev, "updated": updated, "data": data}


@router.put("/patients/{pid}/data")
def put_patient_data(pid: int, b: Snapshot, authorization: str | None = Header(None)):
    u = me(authorization)
    with conn() as c:
        _guardian_of(c, pid, u["id"])
    return _write_snap(pid, b)


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
