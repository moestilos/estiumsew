#!/usr/bin/env python3
"""
estiumsew – Tienda artesanal de Fani Mateos
────────────────────────────────────────────
Ejecutar:  python3 server.py
Abrir:     http://localhost:3000
Admin:     http://localhost:3000/admin

Sin dependencias externas – solo Python 3.6+
"""

import http.server
import sqlite3
import json
import hashlib
import hmac
import base64
import uuid
import mimetypes
import pathlib
import os
import io
import urllib.parse
import threading
import time
import re

# ─── CONFIG ───────────────────────────────────────────────────────────────────
PORT        = int(os.environ.get("PORT", 3000))
BASE_DIR    = pathlib.Path(__file__).parent.resolve()
DB_PATH     = BASE_DIR / "estiumsew.db"
UPLOADS_DIR = BASE_DIR / "uploads"
PUBLIC_DIR  = BASE_DIR / "public"
SECRET_KEY  = os.environ.get("SECRET_KEY", "estiumsew_2026_fani_secret")

ADMIN_USER  = "fani"
ADMIN_PASS  = "estiumsew2026"   # ← cambia esto si quieres otra contraseña

# ─── DATABASE ─────────────────────────────────────────────────────────────────
_db_lock = threading.Lock()

def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    UPLOADS_DIR.mkdir(exist_ok=True)
    (PUBLIC_DIR / "admin").mkdir(parents=True, exist_ok=True)

    with _db_lock:
        conn = get_db()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS productos (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre  TEXT    NOT NULL,
                desc_   TEXT    NOT NULL DEFAULT '',
                precio  TEXT    NOT NULL DEFAULT 'Consultar',
                cat     TEXT    NOT NULL DEFAULT 'Artesanía',
                imagen  TEXT    DEFAULT NULL,
                wide    INTEGER DEFAULT 0,
                orden   INTEGER DEFAULT 0,
                creado  TEXT    DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS admin (
                id      INTEGER PRIMARY KEY,
                usuario TEXT NOT NULL UNIQUE,
                pass_h  TEXT NOT NULL
            );
        """)

        # Admin por defecto
        ph = _hash_pass(ADMIN_PASS)
        conn.execute(
            "INSERT OR IGNORE INTO admin (id, usuario, pass_h) VALUES (1,?,?)",
            (ADMIN_USER, ph)
        )
        conn.commit()

        # Productos de ejemplo si la tabla está vacía
        if conn.execute("SELECT COUNT(*) FROM productos").fetchone()[0] == 0:
            _seed(conn)

        conn.close()
    print("  ✓ Base de datos lista")

def _hash_pass(pw):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), b"estiumsew_salt", 100_000).hex()

def _seed(conn):
    rows = [
        ("Funda portátil Hibisco 🌺",
         "Funda para portátil hecha a mano con tela estampada de hibiscos. "
         "Protección acolchada, cierres de calidad y acabados cuidados.",
         "Consultar", "Fundas",    None, 0, 1),
        ("Tote Magnolia 🩷",
         "Bolsa tote de tela resistente con estampado floral de magnolias. "
         "Asas reforzadas, perfecta para el día a día.",
         "Consultar", "Bolsas",    None, 0, 2),
        ("Porta bocadillos 💙",
         "Porta bocadillos reutilizable de tela con cierre seguro. "
         "Lavable a máquina y con estampados únicos.",
         "Consultar", "Cocina",    None, 0, 3),
        ("Maxi Crisantelmo 🫶🏼",
         "Bolsa maxi con estampado de crisantemos. Gran capacidad, "
         "forro interior y varios compartimentos.",
         "Consultar", "Bolsas",    None, 1, 4),
        ("Midi Maravilla ❤️‍🔥",
         "Bolsa midi con estampado de maravillas en tonos cálidos. "
         "Tamaño ideal para el mercado o la playa.",
         "8 €",       "Bolsas",    None, 0, 5),
        ("Neceser Crisantelmo 🩵",
         "Neceser con estampado de crisantemos en azul pastel. "
         "Interior impermeable y cierre de cremallera.",
         "10 €",      "Neceseres", None, 0, 6),
        ("Set Maravilla + Jazmín ❤️‍🔥",
         "Set de bolsa y neceser a juego con estampado de maravillas y jazmín. "
         "Regalo perfecto.",
         "8 € · 5 €", "Sets",      None, 0, 7),
        ("Tote Magnolia con iniciales 🌸",
         "Tote Magnolia personalizado con tus iniciales bordadas. "
         "Pídelo con tus letras.",
         "Consultar", "Bolsas",    None, 0, 8),
        ("Neceser Mimosa 🌼",
         "Neceser grande con estampado de mimosas amarillas. "
         "Perfecto para viajes o el día a día.",
         "9 €",       "Neceseres", None, 1, 9),
        ("Llavero Peonía 🩷",
         "Llavero de tela con estampado de peonías. "
         "Mini y adorable, hecho a mano con amor.",
         "2,5 €",     "Accesorios",None, 0, 10),
        ("Duffle bag Orquídea 🤎",
         "Bolsa de deporte artesanal con estampado de orquídeas. "
         "Amplia, resistente y con estilo.",
         "Consultar", "Bolsas",    None, 0, 11),
    ]
    conn.executemany(
        "INSERT INTO productos (nombre,desc_,precio,cat,imagen,wide,orden) VALUES (?,?,?,?,?,?,?)",
        rows
    )
    conn.commit()

# ─── AUTH ──────────────────────────────────────────────────────────────────────
def _make_token(uid):
    payload = base64.urlsafe_b64encode(
        json.dumps({"id": uid, "ts": int(time.time())}).encode()
    ).decode().rstrip("=")
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

def _verify_token(token):
    if not token:
        return None
    try:
        payload, sig = token.rsplit(".", 1)
        expected = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        pad = "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload + pad).decode())
        if time.time() - data["ts"] > 86_400 * 7:   # 7 días
            return None
        return data
    except Exception:
        return None

# ─── MULTIPART PARSER ─────────────────────────────────────────────────────────
def _parse_multipart(headers, body):
    ct = headers.get("Content-Type", headers.get("content-type", ""))
    if "boundary=" not in ct:
        return {}, {}
    boundary = ct.split("boundary=", 1)[1].strip().encode()
    fields, files = {}, {}
    for part in body.split(b"--" + boundary)[1:]:
        if part.strip() in (b"", b"--", b"--\r\n"):
            continue
        if b"\r\n\r\n" not in part:
            continue
        hdr_raw, content = part.split(b"\r\n\r\n", 1)
        if content.endswith(b"\r\n"):
            content = content[:-2]
        hdr = hdr_raw.decode("utf-8", errors="replace")
        nm = re.search(r'name="([^"]+)"', hdr)
        if not nm:
            continue
        name = nm.group(1)
        fn = re.search(r'filename="([^"]*)"', hdr)
        if fn:
            ct2 = re.search(r"Content-Type:\s*(\S+)", hdr, re.I)
            files[name] = {
                "filename": fn.group(1),
                "content": content,
                "content_type": ct2.group(1) if ct2 else "application/octet-stream",
            }
        else:
            fields[name] = content.decode("utf-8", errors="replace")
    return fields, files

# ─── PLACEHOLDER SVG ──────────────────────────────────────────────────────────
def _placeholder_svg(emoji="🧵", color1="#F3EDE4", color2="#E8C4B8"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{color1}"/>
      <stop offset="100%" stop-color="{color2}"/>
    </linearGradient>
  </defs>
  <rect fill="url(#g)" width="400" height="400"/>
  <text x="200" y="230" text-anchor="middle" font-size="90" font-family="serif">{emoji}</text>
</svg>""".encode()

# ─── PRODUCT → DICT ───────────────────────────────────────────────────────────
def _row_to_dict(row):
    p = dict(row)
    p["imagen_url"] = f"/uploads/{p['imagen']}" if p.get("imagen") else None
    return p

# ─── HANDLER ──────────────────────────────────────────────────────────────────
class Handler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        pass   # silenciamos logs del servidor por defecto

    # helpers ──────────────────────────────────────────────────────────────────
    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()
        self.wfile.write(body)

    def _err(self, msg, status=400):
        self._send_json({"error": msg}, status)

    def _read_body(self):
        n = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(n) if n else b""

    def _token(self):
        auth = self.headers.get("Authorization", "")
        return auth[7:] if auth.startswith("Bearer ") else None

    def _auth(self):
        d = _verify_token(self._token())
        if not d:
            self._err("No autorizado", 401)
        return d

    def _serve_file(self, path):
        p = pathlib.Path(path)
        if not p.is_file():
            self._err("No encontrado", 404)
            return
        mime, _ = mimetypes.guess_type(str(p))
        data = p.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime or "application/octet-stream")
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    # OPTIONS (CORS preflight) ─────────────────────────────────────────────────
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()

    # GET ──────────────────────────────────────────────────────────────────────
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/") or "/"

        if path == "/api/products":
            with _db_lock:
                conn = get_db()
                rows = conn.execute(
                    "SELECT * FROM productos ORDER BY orden, id"
                ).fetchall()
                conn.close()
            self._send_json({"products": [_row_to_dict(r) for r in rows]})

        elif path.startswith("/uploads/"):
            fname = pathlib.Path(path[9:]).name   # strip any path traversal
            fpath = UPLOADS_DIR / fname
            if fpath.is_file():
                mime, _ = mimetypes.guess_type(str(fpath))
                data = fpath.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", mime or "image/jpeg")
                self.send_header("Cache-Control", "max-age=31536000, immutable")
                self.send_header("Content-Length", len(data))
                self.end_headers()
                self.wfile.write(data)
            else:
                svg = _placeholder_svg()
                self.send_response(200)
                self.send_header("Content-Type", "image/svg+xml")
                self.send_header("Content-Length", len(svg))
                self.end_headers()
                self.wfile.write(svg)

        elif path in ("/", ""):
            self._serve_file(PUBLIC_DIR / "index.html")

        elif path == "/admin":
            self._serve_file(PUBLIC_DIR / "admin" / "login.html")

        elif path == "/admin/dashboard":
            self._serve_file(PUBLIC_DIR / "admin" / "dashboard.html")

        else:
            fp = PUBLIC_DIR / path.lstrip("/")
            if fp.is_file():
                self._serve_file(fp)
            else:
                self._err("No encontrado", 404)

    # POST ─────────────────────────────────────────────────────────────────────
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")

        if path == "/api/auth/login":
            body = self._read_body()
            try:
                data = json.loads(body)
            except Exception:
                self._err("JSON inválido"); return
            usuario = data.get("usuario", "")
            passwd  = data.get("password", "")

            with _db_lock:
                conn = get_db()
                row = conn.execute(
                    "SELECT * FROM admin WHERE usuario=?", (usuario,)
                ).fetchone()
                conn.close()

            if not row:
                self._err("Credenciales incorrectas", 401); return
            ph = _hash_pass(passwd)
            if not hmac.compare_digest(ph, row["pass_h"]):
                self._err("Credenciales incorrectas", 401); return

            token = _make_token(row["id"])
            self._send_json({"token": token, "usuario": usuario})

        elif path == "/api/admin/products":
            if not self._auth(): return
            ct   = self.headers.get("Content-Type", "")
            body = self._read_body()
            if "multipart/form-data" in ct:
                fields, files = _parse_multipart(self.headers, body)
            else:
                try: fields = json.loads(body)
                except Exception: fields = {}
                files = {}

            nombre = fields.get("nombre", "").strip()
            if not nombre:
                self._err("El nombre es obligatorio"); return

            imagen = self._save_image(files.get("imagen"))

            with _db_lock:
                conn = get_db()
                cur = conn.execute(
                    "INSERT INTO productos (nombre,desc_,precio,cat,imagen,wide,orden) VALUES (?,?,?,?,?,?,?)",
                    (nombre,
                     fields.get("desc_", "").strip(),
                     fields.get("precio", "Consultar").strip() or "Consultar",
                     fields.get("cat",    "Artesanía").strip(),
                     imagen,
                     1 if fields.get("wide") in ("1","true",True) else 0,
                     int(fields.get("orden", 0)))
                )
                conn.commit()
                row = conn.execute("SELECT * FROM productos WHERE id=?", (cur.lastrowid,)).fetchone()
                conn.close()
            self._send_json({"product": _row_to_dict(row)}, 201)

        elif path == "/api/auth/change-password":
            if not self._auth(): return
            body = self._read_body()
            try: data = json.loads(body)
            except Exception: self._err("JSON inválido"); return

            nueva = data.get("nueva", "").strip()
            if len(nueva) < 6:
                self._err("La contraseña debe tener al menos 6 caracteres"); return

            ph = _hash_pass(nueva)
            with _db_lock:
                conn = get_db()
                conn.execute("UPDATE admin SET pass_h=? WHERE id=1", (ph,))
                conn.commit()
                conn.close()
            self._send_json({"ok": True})

        else:
            self._err("No encontrado", 404)

    # PUT ──────────────────────────────────────────────────────────────────────
    def do_PUT(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        m = re.match(r"^/api/admin/products/(\d+)$", path)
        if not m:
            self._err("No encontrado", 404); return
        if not self._auth(): return
        prod_id = int(m.group(1))

        ct   = self.headers.get("Content-Type", "")
        body = self._read_body()
        if "multipart/form-data" in ct:
            fields, files = _parse_multipart(self.headers, body)
        else:
            try: fields = json.loads(body)
            except Exception: fields = {}
            files = {}

        with _db_lock:
            conn = get_db()
            ex = conn.execute("SELECT * FROM productos WHERE id=?", (prod_id,)).fetchone()
            if not ex:
                conn.close()
                self._err("Producto no encontrado", 404); return
            ex = dict(ex)

            # Nueva imagen si se envió
            nueva_img = self._save_image(files.get("imagen"))
            if nueva_img and ex["imagen"]:
                old = UPLOADS_DIR / ex["imagen"]
                if old.exists(): old.unlink(missing_ok=True)
            imagen = nueva_img or ex["imagen"]

            wide_val = ex["wide"]
            if "wide" in fields:
                wide_val = 1 if fields["wide"] in ("1","true",True) else 0

            conn.execute(
                "UPDATE productos SET nombre=?,desc_=?,precio=?,cat=?,imagen=?,wide=?,orden=? WHERE id=?",
                (fields.get("nombre", ex["nombre"]).strip() or ex["nombre"],
                 fields.get("desc_",  ex["desc_"]).strip(),
                 fields.get("precio", ex["precio"]).strip() or "Consultar",
                 fields.get("cat",    ex["cat"]).strip(),
                 imagen, wide_val,
                 int(fields.get("orden", ex["orden"])),
                 prod_id)
            )
            conn.commit()
            row = conn.execute("SELECT * FROM productos WHERE id=?", (prod_id,)).fetchone()
            conn.close()
        self._send_json({"product": _row_to_dict(row)})

    # DELETE ───────────────────────────────────────────────────────────────────
    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        m = re.match(r"^/api/admin/products/(\d+)$", path)
        if not m:
            self._err("No encontrado", 404); return
        if not self._auth(): return
        prod_id = int(m.group(1))

        with _db_lock:
            conn = get_db()
            row = conn.execute("SELECT imagen FROM productos WHERE id=?", (prod_id,)).fetchone()
            if not row:
                conn.close()
                self._err("Producto no encontrado", 404); return
            if row["imagen"]:
                p = UPLOADS_DIR / row["imagen"]
                if p.exists(): p.unlink(missing_ok=True)
            conn.execute("DELETE FROM productos WHERE id=?", (prod_id,))
            conn.commit()
            conn.close()
        self._send_json({"ok": True})

    # ─── helpers ──────────────────────────────────────────────────────────────
    def _save_image(self, file_info):
        if not file_info or not file_info.get("filename"):
            return None
        ext = pathlib.Path(file_info["filename"]).suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        (UPLOADS_DIR / fname).write_bytes(file_info["content"])
        return fname


# ─── ENTRY POINT ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"""
  ╔══════════════════════════════════════╗
  ║   🧵  estiumsew  ·  Fani Mateos     ║
  ╠══════════════════════════════════════╣
  ║  Tienda   →  http://localhost:{PORT}    ║
  ║  Admin    →  http://localhost:{PORT}/admin ║
  ║  Usuario  →  {ADMIN_USER:<26} ║
  ║  Clave    →  {ADMIN_PASS:<26} ║
  ╚══════════════════════════════════════╝
    """)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  👋 Servidor detenido.\n")
