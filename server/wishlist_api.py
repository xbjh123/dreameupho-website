#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DreamEupho 综合 API — 纯标准库，零依赖
公共端点：
  POST /api/wishlist          { "email" } -> 200 {ok,duplicate} / 400 {ok:false,error}
  GET  /api/wishlist/count    -> 200 {ok,count}
  GET  /api/news              -> 200 {ok, news:[{id,title,date,tag,content}]} 资讯列表
  GET  /api/health
管理端点（需 Bearer Token，ADMIN_TOKEN 环境变量）：
  POST   /api/admin/news       { title, date, tag, content(markdown) } -> 发布资讯
  DELETE /api/admin/news?id=X  删除资讯
  GET    /api/admin/wishlist   -> { ok, count, emails:[...] } 愿望单数量与邮箱
  GET    /api/admin/stats      -> { ok, wishlist_count, news_count }
数据：SQLite（愿望单 wishlist 表 + 资讯 news 表）
用法：
  python3 site_api.py [port] [host]     默认 8090 / 127.0.0.1
  环境变量：WISHLIST_DB、ADMIN_TOKEN
"""
import json
import os
import re
import sqlite3
import sys
import time
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB = os.environ.get('WISHLIST_DB', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wishlist.db'))
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', '')
EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
MAX_EMAIL_LEN = 254
RATE_LIMIT = 5
RATE_WINDOW = 3600
MAX_NEWS_CONTENT = 20000   # 资讯 md 最大长度

_ratelimit = {}


def get_db():
    conn = sqlite3.connect(DB)
    conn.execute('''CREATE TABLE IF NOT EXISTS wishlist (
        email TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        notified INTEGER NOT NULL DEFAULT 0
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        tag TEXT DEFAULT '',
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
    )''')
    conn.commit()
    return conn


def rate_limited(ip):
    now = time.time()
    ts = [t for t in _ratelimit.get(ip, []) if now - t < RATE_WINDOW]
    if len(ts) >= RATE_LIMIT:
        _ratelimit[ip] = ts
        return True
    ts.append(now)
    _ratelimit[ip] = ts
    return False


def check_admin(headers):
    """校验管理 Token：Authorization: Bearer <t> 或 X-Admin-Token: <t>"""
    if not ADMIN_TOKEN:
        return 'not_configured'
    auth = headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        t = auth[7:].strip()
    else:
        t = headers.get('X-Admin-Token', '').strip()
    return 'ok' if t and secrets.compare_digest(t, ADMIN_TOKEN) else 'unauthorized'


def read_json_body(self):
    length = int(self.headers.get('Content-Length', 0))
    raw = self.rfile.read(length) if length > 0 else b''
    raw = raw.lstrip(b'\xef\xbb\xbf')
    return json.loads(raw.decode('utf-8')) if raw else {}


class Handler(BaseHTTPRequestHandler):
    server_version = 'DreamEuphoSiteAPI/1.0'

    def _send(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token')
        self.send_header('Content-Length', '0')
        self.end_headers()

    # ---------- GET ----------
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/health':
            self._send(200, {'ok': True, 'service': 'site-api'})
        elif path == '/api/wishlist/count':
            conn = get_db()
            n = conn.execute('SELECT COUNT(*) FROM wishlist').fetchone()[0]
            conn.close()
            self._send(200, {'ok': True, 'count': n})
        elif path == '/api/news':
            conn = get_db()
            rows = conn.execute('SELECT id, title, date, tag, content FROM news ORDER BY date DESC, id DESC').fetchall()
            conn.close()
            news = [{'id': r[0], 'title': r[1], 'date': r[2], 'tag': r[3], 'content': r[4]} for r in rows]
            self._send(200, {'ok': True, 'news': news})
        elif path == '/api/admin/stats':
            auth = check_admin(self.headers)
            if auth != 'ok':
                self._send(401 if auth == 'unauthorized' else 503, {'ok': False, 'error': auth})
                return
            conn = get_db()
            wc = conn.execute('SELECT COUNT(*) FROM wishlist').fetchone()[0]
            nc = conn.execute('SELECT COUNT(*) FROM news').fetchone()[0]
            conn.close()
            self._send(200, {'ok': True, 'wishlist_count': wc, 'news_count': nc})
        elif path == '/api/admin/wishlist':
            auth = check_admin(self.headers)
            if auth != 'ok':
                self._send(401 if auth == 'unauthorized' else 503, {'ok': False, 'error': auth})
                return
            conn = get_db()
            rows = conn.execute('SELECT email, created_at FROM wishlist ORDER BY created_at DESC').fetchall()
            count = len(rows)
            conn.close()
            self._send(200, {'ok': True, 'count': count, 'emails': [{'email': r[0], 'created_at': r[1]} for r in rows]})
        else:
            self._send(404, {'ok': False, 'error': 'not_found'})

    # ---------- POST ----------
    def do_POST(self):
        path = self.path.split('?')[0]
        if path == '/api/wishlist':
            self._handle_wishlist()
        elif path == '/api/admin/news':
            auth = check_admin(self.headers)
            if auth != 'ok':
                self._send(401 if auth == 'unauthorized' else 503, {'ok': False, 'error': auth})
                return
            self._handle_admin_news()
        else:
            self._send(404, {'ok': False, 'error': 'not_found'})

    def _handle_wishlist(self):
        ip = self.client_address[0]
        if rate_limited(ip):
            self._send(429, {'ok': False, 'error': 'rate_limited'})
            return
        try:
            data = read_json_body(self)
            email = str(data.get('email', '')).strip().lower()
        except Exception:
            self._send(400, {'ok': False, 'error': 'bad_request'})
            return
        if not EMAIL_RE.match(email) or len(email) > MAX_EMAIL_LEN:
            self._send(400, {'ok': False, 'error': 'invalid_email'})
            return
        conn = get_db()
        try:
            conn.execute('INSERT INTO wishlist (email, created_at) VALUES (?, ?)',
                         (email, time.strftime('%Y-%m-%d %H:%M:%S')))
            conn.commit()
            duplicate = False
        except sqlite3.IntegrityError:
            duplicate = True
        conn.close()
        self._send(200, {'ok': True, 'duplicate': duplicate})

    def _handle_admin_news(self):
        try:
            data = read_json_body(self)
            title = str(data.get('title', '')).strip()
            date = str(data.get('date', '')).strip()
            tag = str(data.get('tag', '')).strip()
            content = str(data.get('content', '')).strip()
        except Exception:
            self._send(400, {'ok': False, 'error': 'bad_request'})
            return
        if not title or not content:
            self._send(400, {'ok': False, 'error': 'missing_fields'})
            return
        if len(content) > MAX_NEWS_CONTENT:
            self._send(400, {'ok': False, 'error': 'content_too_long'})
            return
        if not date:
            date = time.strftime('%Y-%m-%d')
        conn = get_db()
        cur = conn.execute(
            'INSERT INTO news (title, date, tag, content, created_at) VALUES (?, ?, ?, ?, ?)',
            (title, date, tag, content, time.strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()
        nid = cur.lastrowid
        conn.close()
        self._send(200, {'ok': True, 'id': nid})

    # ---------- DELETE ----------
    def do_DELETE(self):
        path = self.path.split('?')[0]
        if path == '/api/admin/news':
            auth = check_admin(self.headers)
            if auth != 'ok':
                self._send(401 if auth == 'unauthorized' else 503, {'ok': False, 'error': auth})
                return
            from urllib.parse import parse_qs, urlparse
            qs = parse_qs(urlparse(self.path).query)
            nid = qs.get('id', [''])[0]
            if not nid.isdigit():
                self._send(400, {'ok': False, 'error': 'invalid_id'})
                return
            conn = get_db()
            conn.execute('DELETE FROM news WHERE id = ?', (int(nid),))
            conn.commit()
            conn.close()
            self._send(200, {'ok': True})
        else:
            self._send(404, {'ok': False, 'error': 'not_found'})

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
    host = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('WISHLIST_HOST', '127.0.0.1')
    if not ADMIN_TOKEN:
        sys.stderr.write('WARNING: ADMIN_TOKEN 未设置，管理端点不可用（请设置环境变量 ADMIN_TOKEN）\n')
    server = ThreadingHTTPServer((host, port), Handler)
    print('Site API listening on %s:%d, DB=%s' % (host, port, DB), flush=True)
    server.serve_forever()
