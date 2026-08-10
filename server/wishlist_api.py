#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DreamEupho 愿望单 API — 纯标准库，零依赖
- POST /api/wishlist  { "email": "..." }  -> 200 {ok:true} / 400 {ok:false,error}
- GET  /api/wishlist/count                  -> 200 {ok:true,count:N}
- 数据存 SQLite：email 主键去重，notified 标记发售通知是否已发
用法：
  python3 wishlist_api.py [port]     默认 8090
  DB 路径：环境变量 WISHLIST_DB，默认 ./wishlist.db
"""
import json
import os
import re
import sqlite3
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB = os.environ.get('WISHLIST_DB', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wishlist.db'))
EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
MAX_EMAIL_LEN = 254
RATE_LIMIT = 5          # 每 IP 每窗口最大请求数
RATE_WINDOW = 3600      # 窗口秒数（1 小时）

_ratelimit = {}  # ip -> [timestamps]


def get_db():
    conn = sqlite3.connect(DB)
    conn.execute('''CREATE TABLE IF NOT EXISTS wishlist (
        email TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        notified INTEGER NOT NULL DEFAULT 0
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


class Handler(BaseHTTPRequestHandler):
    server_version = 'DreamEuphoWishlist/1.0'

    def _send(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/wishlist/count':
            conn = get_db()
            n = conn.execute('SELECT COUNT(*) FROM wishlist').fetchone()[0]
            conn.close()
            self._send(200, {'ok': True, 'count': n})
        elif self.path == '/api/health':
            self._send(200, {'ok': True, 'service': 'wishlist'})
        else:
            self._send(404, {'ok': False, 'error': 'not_found'})

    def do_POST(self):
        if self.path != '/api/wishlist':
            self._send(404, {'ok': False, 'error': 'not_found'})
            return
        ip = self.client_address[0]
        if rate_limited(ip):
            self._send(429, {'ok': False, 'error': 'rate_limited'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length) if length > 0 else b''
            raw = raw.lstrip(b'\xef\xbb\xbf')  # 兼容 UTF-8 BOM
            data = json.loads(raw.decode('utf-8')) if raw else {}
            email = str(data.get('email', '')).strip().lower()
        except Exception as e:
            sys.stderr.write('POST parse error: %r\n' % (e,))
            self._send(400, {'ok': False, 'error': 'bad_request'})
            return
        if not EMAIL_RE.match(email) or len(email) > MAX_EMAIL_LEN:
            self._send(400, {'ok': False, 'error': 'invalid_email'})
            return
        conn = get_db()
        try:
            conn.execute('INSERT INTO wishlist (email, created_at) VALUES (?, ?)', (email, time.strftime('%Y-%m-%d %H:%M:%S')))
            conn.commit()
            duplicate = False
        except sqlite3.IntegrityError:
            duplicate = True
        conn.close()
        self._send(200, {'ok': True, 'duplicate': duplicate})

    def log_message(self, fmt, *args):
        sys.stderr.write('%s - %s\n' % (self.address_string(), fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
    host = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('WISHLIST_HOST', '127.0.0.1')
    server = ThreadingHTTPServer((host, port), Handler)
    print('Wishlist API listening on %s:%d, DB=%s' % (host, port, DB), flush=True)
    server.serve_forever()
