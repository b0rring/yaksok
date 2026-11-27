import sqlite3
from contextlib import contextmanager
from pathlib import Path

# 프로토타입 저장소: 서버 안의 SQLite 파일 하나 (외부 DB 서비스·키가 필요 없다). 파일은 git에 올리지 않는다.
PATH = Path(__file__).parent.parent / "data" / "yaksok.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, login_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
  salt TEXT NOT NULL, pw TEXT NOT NULL, code TEXT UNIQUE NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS links (
  patient_id INTEGER NOT NULL, guardian_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', requester INTEGER, UNIQUE(patient_id, guardian_id)
);
CREATE TABLE IF NOT EXISTS snap (user_id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated TEXT DEFAULT CURRENT_TIMESTAMP, rev INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL, user_id INTEGER NOT NULL, body TEXT NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


@contextmanager
def conn():
    PATH.parent.mkdir(exist_ok=True)
    c = sqlite3.connect(PATH)
    c.row_factory = sqlite3.Row
    c.executescript(SCHEMA)
    # 예전에 만든 DB 파일에 새 칸 붙이기 (이미 있으면 넘어간다). 예전 연결은 허락 없이 이어진 것이라 그대로 '연결됨'으로 둔다.
    for sql in ("ALTER TABLE snap ADD COLUMN rev INTEGER NOT NULL DEFAULT 0", "ALTER TABLE links ADD COLUMN status TEXT NOT NULL DEFAULT 'active'", "ALTER TABLE links ADD COLUMN requester INTEGER"):
        try:
            c.execute(sql)
        except sqlite3.OperationalError:
            pass
    try:
        yield c
        c.commit()
    finally:
        c.close()
