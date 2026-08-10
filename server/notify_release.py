#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DreamEupho 发售通知脚本 — 向愿望单邮箱批量发送发售通知
用法：
  1. 配置 SMTP（环境变量或编辑下方 CONFIG）
  2. python3 notify_release.py [--dry-run] [--limit N]
     --dry-run  只列出将发送的邮箱，不真正发送
     --limit N  本次最多发送 N 封（分批用）
  发送成功后将邮箱标记 notified=1；失败的不标记，下次重跑重试。
"""
import json
import os
import smtplib
import sqlite3
import sys
import time
from email.header import Header
from email.mime.text import MIMEText
from email.utils import formataddr

# ---- SMTP 配置（发售前填写真实值，或用环境变量） ----
CONFIG = {
    'smtp_host': os.environ.get('WL_SMTP_HOST', ''),      # 如 smtp.163.com
    'smtp_port': int(os.environ.get('WL_SMTP_PORT', 465)),
    'smtp_user': os.environ.get('WL_SMTP_USER', ''),      # 发件邮箱账号
    'smtp_pass': os.environ.get('WL_SMTP_PASS', ''),      # 授权码/密码
    'use_ssl': os.environ.get('WL_SMTP_SSL', '1') == '1',
    'from_name': 'DreamEupho 梦想悠风',
    'from_addr': os.environ.get('WL_FROM', ''),
    'subject': '《吹响吧！上低音号》三年级篇同人视觉小说 · 正式发售',
    'body': '''亲爱的朋友：

感谢你加入 DreamEupho 的愿望单！

好消息：《吹响吧！上低音号》三年级篇同人视觉小说《通向未来的旋律》
现已正式发售！

下载与更多信息请访问：
https://temp.dreameupho.com
https://dreameupho.itch.io/sound-a-melody-toward-the-future

感谢你的支持与等待！
—— DreamEupho 梦想悠风制作组
''',
}
DB = os.environ.get('WISHLIST_DB', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wishlist.db'))


def get_emails(limit=None):
    conn = sqlite3.connect(DB)
    sql = 'SELECT email FROM wishlist WHERE notified = 0 ORDER BY created_at'
    if limit:
        sql += ' LIMIT %d' % int(limit)
    rows = conn.execute(sql).fetchall()
    conn.close()
    return [r[0] for r in rows]


def mark_sent(email):
    conn = sqlite3.connect(DB)
    conn.execute('UPDATE wishlist SET notified = 1 WHERE email = ?', (email,))
    conn.commit()
    conn.close()


def send_one(smtp, email):
    msg = MIMEText(CONFIG['body'], 'plain', 'utf-8')
    msg['Subject'] = Header(CONFIG['subject'], 'utf-8')
    msg['From'] = formataddr((str(Header(CONFIG['from_name'], 'utf-8')), CONFIG['from_addr']))
    msg['To'] = email
    smtp.sendmail(CONFIG['from_addr'], [email], msg.as_string())


def main():
    dry = '--dry-run' in sys.argv
    limit = None
    for a in sys.argv:
        if a.startswith('--limit'):
            limit = sys.argv[sys.argv.index(a) + 1]

    if not CONFIG['smtp_host'] or not CONFIG['from_addr']:
        print('请先配置 SMTP（环境变量 WL_SMTP_HOST/WL_SMTP_USER/WL_SMTP_PASS/WL_FROM，或编辑脚本 CONFIG）')
        sys.exit(1)

    emails = get_emails(limit)
    print('待通知邮箱 %d 个%s' % (len(emails), '（dry-run）' if dry else ''))
    if not emails:
        return

    if dry:
        for e in emails:
            print('  [dry]', e)
        return

    try:
        smtp = smtplib.SMTP_SSL(CONFIG['smtp_host'], CONFIG['smtp_port'], timeout=30) if CONFIG['use_ssl'] else smtplib.SMTP(CONFIG['smtp_host'], CONFIG['smtp_port'], timeout=30)
        smtp.login(CONFIG['smtp_user'], CONFIG['smtp_pass'])
    except Exception as e:
        print('SMTP 连接/登录失败:', e)
        sys.exit(1)

    ok = fail = 0
    for e in emails:
        try:
            send_one(smtp, e)
            mark_sent(e)
            ok += 1
            print('  已发送:', e)
        except Exception as ex:
            fail += 1
            print('  发送失败:', e, '->', ex)
        time.sleep(0.3)  # 礼貌间隔
    smtp.quit()
    print('完成：成功 %d，失败 %d' % (ok, fail))


if __name__ == '__main__':
    main()
