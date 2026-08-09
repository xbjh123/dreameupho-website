# DreamEupho 梦想悠风 — 宣传网站

《吹响吧！上低音号》三年级篇同人衍生视觉小说（DreamEupho 梦想悠风）的官方宣传网站。

**标语**：通向未来的旋律♪ ｜ A Melody Toward the Future

## 技术栈

- 纯静态 HTML/CSS/JS，**无构建步骤**，克隆即可运行
- 双语（中/英）主页 + 13 语言招募页（下拉切换，数据在 `data/recruit-i18n.json`）
- 数据与展示分离：`data/` 下 JSON 数据，页面 JS 渲染
- 苹果式滚动动画（Hero 视差消退、滚动驱动渐进呈现、分区粘性页头）

## 目录结构

```
├── index.html          # 首页（Hero/游戏介绍/故事背景/人物/成员/资讯/声明/招募入口）
├── recruit.html        # 招募页（13 语言切换、7 大类岗位）
├── css/style.css
├── js/                 # data.js / main.js / recruit-i18n.js
├── data/               # characters/news/i18n/recruit-i18n/recruit-chrome 等 JSON
├── assets/img/         # hero 视觉图、人物立绘、横幅、Logo
├── content/            # 文案源（itch.io / 金山文档提取，含 13 语言招募原文）
└── 设计/               # 设计方案与迭代文档
```

## 本地运行

```bash
# 任意静态服务器（fetch JSON 需 http 服务）
python -m http.server 8000
# 或
npx serve .
```

浏览器打开 http://localhost:8000/

> 直接双击 HTML（file://）也可打开，数据会回退到内联版本；推荐 http 方式。

## VPS 部署（Nginx）

1. **服务器上拉取代码**：

```bash
git clone https://github.com/xbjh123/dreameupho-website.git /var/www/dreameupho
```

2. **Nginx 站点配置**（`/etc/nginx/sites-available/dreameupho`）：

```nginx
server {
    listen 80;
    server_name dreameupho.example.com;   # 替换为你的域名

    root /var/www/dreameupho;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # JSON 数据正确返回（同源 fetch）
    location ~* \.json$ {
        default_type application/json;
    }

    # 静态资源缓存
    location ~* \.(css|js|jpg|png|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

```bash
ln -s /etc/nginx/sites-available/dreameupho /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

3. **HTTPS（可选，推荐）**：

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d dreameupho.example.com
```

4. **更新站点**（后续每次推送后）：

```bash
cd /var/www/dreameupho && git pull
```

## 部署注意事项

- 网站是**同人非官方作品**，与原作版权方无关（详见页面页脚声明）
- 站点为静态托管，无需 Node/构建；若未来接入资讯后台/论坛，按 `开发计划书.md` 的演进路线规划
- 国内访问 GitHub 不稳时，服务器拉取/更新可用镜像或代理

## 联系方式

- QQ 玩家群/招募群：1029729353 / 1022882012
- Email：dreameupho@163.com
- bilibili / 微博 / 小红书：@DreamEupho梦想悠风
