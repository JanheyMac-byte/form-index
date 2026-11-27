"""Same-origin private archive service for the Mind Atlas static site."""
import argparse
import getpass
import hashlib
import os
import re
import secrets
import sqlite3
import time
import unicodedata
from ipaddress import ip_address
from pathlib import Path
from urllib.parse import urlsplit

from flask import Flask, abort, g, jsonify, request, send_file
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash
from waitress import serve

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
PUBLIC = os.getenv("ARCHIVE_PUBLIC_URL", "").rstrip("/")
DATA = Path(os.getenv("ARCHIVE_DATA", ROOT / ".archive-data" / ("live" if PUBLIC else "local"))).resolve()
if DATA.is_relative_to(DOCS):
    raise RuntimeError("存档目录必须位于公开网页目录之外。")
if PUBLIC and (urlsplit(PUBLIC).scheme != "https" or not urlsplit(PUBLIC).hostname):
    raise RuntimeError("ARCHIVE_PUBLIC_URL 需要使用 HTTPS。")
BLOBS = DATA / "media"
BLOBS.mkdir(mode=0o700, parents=True, exist_ok=True)
os.chmod(DATA, 0o700)
MAX_FILE = 100 * 1024**2
COOKIE = "__Host-form_session" if PUBLIC else "form_archive_session"
app = Flask(__name__, static_folder=str(DOCS), static_url_path="")
app.config.update(MAX_CONTENT_LENGTH=MAX_FILE + 65536, MAX_FORM_PARTS=8,
                  TRUSTED_HOSTS=[urlsplit(PUBLIC).hostname] if PUBLIC else ["localhost", "127.0.0.1"])
DUMMY_HASH = generate_password_hash(secrets.token_urlsafe(32))


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DATA / "archive.sqlite3", timeout=15)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys=ON")
    return g.db


@app.teardown_appcontext
def close_db(_error):
    if "db" in g:
        g.db.close()


with app.app_context():
    db().executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL, developer INTEGER NOT NULL DEFAULT 0);
        CREATE UNIQUE INDEX IF NOT EXISTS one_developer ON users(developer) WHERE developer=1;
        CREATE TABLE IF NOT EXISTS usernames(user INTEGER PRIMARY KEY REFERENCES users(id),
            display TEXT NOT NULL, normalized TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user INTEGER NOT NULL REFERENCES users(id),
            expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS attempts(bucket TEXT PRIMARY KEY, total INTEGER NOT NULL, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, owner INTEGER NOT NULL REFERENCES users(id),
            title TEXT NOT NULL, kind TEXT NOT NULL, mime TEXT, url TEXT, size INTEGER NOT NULL, created INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS owner_items ON items(owner,created);
    """)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def email_address(value):
    value = str(value).strip().lower()
    if len(value) > 254 or not re.fullmatch(r"[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+", value):
        abort(400, "请输入有效邮箱。")
    return value


def password_value(value):
    if not isinstance(value, str) or not 10 <= len(value) <= 128:
        abort(400, "密码需要 10 至 128 个字符。")
    return value


def fields():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400, "请求格式有误。")
    return data


@app.before_request
def protect_writes():
    # A custom header requires a preflight across origins. The API never enables CORS.
    if request.path.startswith("/api/") and request.method == "POST":
        if request.path != "/api/items" or request.is_json:
            request.max_content_length = 16384
        origin = PUBLIC or request.host_url.rstrip("/")
        if request.headers.get("X-Archive-Request") != "1" or request.headers.get("Origin") != origin:
            abort(403, "请从存档页面操作。")


@app.after_request
def private_response(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.path.startswith("/api/") or request.path == "/archive.html":
        response.headers["Cache-Control"] = "private, no-store"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; media-src 'self'; object-src 'none'; base-uri 'none'; "
            "frame-ancestors 'none'; form-action 'self'"
            if request.path == "/archive.html" else "default-src 'none'; sandbox; frame-ancestors 'none'")
    return response


@app.errorhandler(HTTPException)
def api_error(exc):
    if request.path.startswith("/api/"):
        msg = exc.description
        if exc.code == 413:
            msg = "文件超过 100 MB。"
        return jsonify(error=msg), exc.code
    return exc


@app.get("/assets/porcelain-brain.bin.gz")
def sculpture_geometry():
    # The model loader decompresses this asset itself.
    return send_file(DOCS / "assets" / "porcelain-brain.bin.gz", mimetype="application/gzip")


@app.get("/")
def home():
    return app.send_static_file("index.html")


def user(required=True):
    token = request.cookies.get(COOKIE, "")
    row = db().execute("""SELECT u.id,u.email,u.developer,n.display AS username FROM sessions s JOIN users u ON u.id=s.user
                        LEFT JOIN usernames n ON n.user=u.id
                        WHERE s.token=? AND s.expires>?""", (digest(token), time.time())).fetchone()
    if required and not row:
        abort(401, "请先登录。")
    return row


def signed_in(uid):
    token = secrets.token_urlsafe(32)
    life = 7 * 86400
    with db():
        db().execute("DELETE FROM sessions WHERE expires<=? OR token=?", (time.time(), digest(request.cookies.get(COOKIE, ""))))
        db().execute("INSERT INTO sessions VALUES(?,?,?)", (digest(token), uid, int(time.time()) + life))
    response = jsonify(ok=True)
    response.set_cookie(COOKIE, token, max_age=life, httponly=True, secure=bool(PUBLIC), samesite="Lax", path="/")
    return response


def limit(scope, key, maximum):
    now = int(time.time())
    bucket = digest(scope + ":" + key)
    with db():
        db().execute("DELETE FROM attempts WHERE expires<=?", (now,))
        total = db().execute("""INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(bucket)
                              DO UPDATE SET total=total+1 RETURNING total""", (bucket, now+600)).fetchone()[0]
    if total > maximum:
        abort(429, "操作较频繁，请稍后再试。")


@app.get("/api/session")
def session_info():
    account = user(False)
    return jsonify(user=dict(account) if account else None, verifyEmail=False)


def create_user(email, password):
    try:
        return db().execute("INSERT INTO users(email,password) VALUES(?,?)",
                            (email, generate_password_hash(password))).lastrowid
    except sqlite3.IntegrityError:
        abort(409, "该邮箱已有账号，请登录。")


def save_username(uid, value):
    name = unicodedata.normalize("NFKC", value).strip() if isinstance(value, str) else ""
    if not 1 <= len(name) <= 24 or any(unicodedata.category(char).startswith("C") for char in name):
        abort(400, "用户名需要 1 至 24 个可显示字符。")
    try:
        db().execute("""INSERT INTO usernames VALUES(?,?,?) ON CONFLICT(user) DO UPDATE
                        SET display=excluded.display,normalized=excluded.normalized""",
                     (uid, name, name.casefold()))
    except sqlite3.IntegrityError:
        abort(409, "这个用户名已有人使用，请换一个。")
    return name


@app.post("/api/username")
def rename_user():
    uid = user()["id"]
    with db():
        name = save_username(uid, fields().get("username"))
    return jsonify(username=name)


@app.post("/api/register")
def register():
    limit("register", request.remote_addr or "", 18)
    data = fields()
    email = email_address(data.get("email", ""))
    password = password_value(data.get("password"))
    with db():
        uid = create_user(email, password)
        save_username(uid, data.get("username"))
    return signed_in(uid)


@app.post("/api/login")
def login():
    data = fields()
    email = email_address(data.get("email", ""))
    limit("login-ip", request.remote_addr or "", 100)
    limit("login", email, 15)
    password = str(data.get("password", ""))[:129]
    row = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not check_password_hash(row["password"] if row else DUMMY_HASH, password) or not row:
        abort(401, "邮箱或密码有误。")
    return signed_in(row["id"])


@app.post("/api/logout")
def logout():
    with db():
        db().execute("DELETE FROM sessions WHERE token=?", (digest(request.cookies.get(COOKIE, "")),))
    response = jsonify(ok=True)
    response.delete_cookie(COOKIE, path="/", secure=bool(PUBLIC), httponly=True, samesite="Lax")
    return response


@app.get("/api/owners")
def owners():
    if not user()["developer"]:
        abort(403, "需要开发者权限。")
    return jsonify([dict(row) for row in db().execute("SELECT u.id,u.email,n.display AS username FROM users u LEFT JOIN usernames n ON n.user=u.id ORDER BY u.email")])


@app.get("/api/items")
def items():
    account = user()
    owner = request.args.get("owner", str(account["id"]))
    if owner != str(account["id"]) and not account["developer"]:
        abort(403, "只能查看自己的存档。")
    rows = db().execute("SELECT id,title,kind,url,created FROM items WHERE owner=? ORDER BY created DESC,rowid DESC", (owner,))
    return jsonify([dict(row) for row in rows])


def media_type(head):
    for prefix, mime in [(b"\xff\xd8\xff", "image/jpeg"), (b"\x89PNG\r\n\x1a\n", "image/png"),
                         (b"GIF87a", "image/gif"), (b"GIF89a", "image/gif")]:
        if head.startswith(prefix):
            return mime
    if head.startswith(b"RIFF") and head[8:12] == b"WEBP":
        return "image/webp"
    if head[4:8] == b"ftyp" and head[8:12] in (b"isom", b"iso2", b"mp41", b"mp42", b"M4V ", b"avc1"):
        return "video/mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3") and b"webm" in head[:256]:
        return "video/webm"
    abort(415, "支持 JPG、PNG、WebP、GIF、MP4 和 WebM。")


@app.post("/api/items")
def add_item():
    account = user()
    iid = secrets.token_hex(16)
    url = mime = None
    size = 0
    path = BLOBS / iid
    try:
        if request.is_json:
            data = fields()
            url = str(data.get("url", "")).strip()
            try:
                parts = urlsplit(url)
                host = (parts.hostname or "").encode("idna").decode()
                if ":" in host or re.fullmatch(r"[0-9.]+", host):
                    ip_address(host)
                valid = (parts.scheme in ("http", "https") and host and
                         (":" in host or re.fullmatch(r"[a-zA-Z0-9.-]+", host)) and
                         parts.port != 0 and parts.username is None and parts.password is None)
            except (ValueError, UnicodeError):
                valid = False
            if not valid or len(url)>2048 or re.search(r"[\s\\\x00-\x1f]", url):
                abort(400, "请填写完整的 HTTP 或 HTTPS 网址。")
            title = str(data.get("title", "")).strip() or parts.hostname
            kind = "website"
        else:
            file = request.files.get("file")
            if not file:
                abort(400, "请选择一个文件。")
            mime = media_type(file.stream.read(256))
            file.stream.seek(0)
            kind = mime.split("/")[0]
            title = request.form.get("title", "").strip() or Path(file.filename).stem[:120] or "未命名"
            file.save(path)
            size = path.stat().st_size
            if size > MAX_FILE:
                abort(413)
        if not 1 <= len(title) <= 120:
            abort(400, "标题最多 120 个字符。")
        with db():
            db().execute("BEGIN IMMEDIATE")
            count, used = db().execute("SELECT COUNT(*),COALESCE(SUM(size),0) FROM items WHERE owner=?", (account["id"],)).fetchone()
            if count >= 1000 or used + size > 2 * 1024**3:
                abort(409, "已达到账号存档容量上限。")
            db().execute("INSERT INTO items VALUES(?,?,?,?,?,?,?,?)",
                         (iid, account["id"], title, kind, mime, url, size, int(time.time())))
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return jsonify(id=iid), 201


@app.get("/api/media/<iid>")
def media(iid):
    account = user()
    row = db().execute("SELECT id,mime FROM items WHERE id=? AND mime IS NOT NULL AND (owner=? OR ?=1)",
                       (iid, account["id"], account["developer"])).fetchone()
    if not row:
        abort(404, "文件不存在。")
    return send_file(BLOBS / row["id"], mimetype=row["mime"], conditional=True, etag=False)


@app.post("/api/items/<iid>/remove")
def remove_item(iid):
    account = user()
    with db():
        row = db().execute("DELETE FROM items WHERE id=? AND owner=? RETURNING id,mime",
                           (iid, account["id"])).fetchone()
        if not row:
            abort(404, "存档不存在。")
    if row["mime"]:
        (BLOBS / row["id"]).unlink(missing_ok=True)
    return jsonify(ok=True)


def setup_developer():
    email = email_address(input("开发者邮箱："))
    pw = password_value(getpass.getpass("设置密码（已有账号请输入原密码）："))
    with db():
        db().execute("BEGIN IMMEDIATE")
        existing = db().execute("SELECT * FROM users WHERE developer=1").fetchone()
        if existing and existing["email"] != email:
            raise SystemExit("已设置开发者账号。")
        row = db().execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        if row and not check_password_hash(row["password"], pw):
            raise SystemExit("原账号密码不匹配。")
        if not row and pw != getpass.getpass("再次输入密码："):
            raise SystemExit("两次密码不一致。")
        uid = row["id"] if row else create_user(email, pw)
        db().execute("UPDATE users SET developer=1 WHERE id=?", (uid,))
        db().execute("DELETE FROM sessions WHERE user=?", (uid,))
    print("开发者账号已设置，请在存档页登录。")


if __name__ == "__main__":
    args = argparse.ArgumentParser()
    args.add_argument("action", choices=["serve", "developer"], nargs="?", default="serve")
    args.add_argument("--port", type=int, default=8746)
    options = args.parse_args()
    if options.action == "developer":
        with app.app_context():
            setup_developer()
    else:
        serve(app, host="127.0.0.1", port=options.port, threads=8,
              max_request_body_size=MAX_FILE+65536)
