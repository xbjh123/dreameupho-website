/* ============================================================
   DreamEupho — 交互层
   功能：语言切换 / 移动菜单 / IntersectionObserver 进入动画 /
         五线谱滚动进度条 / 导航当前态 / 云视差 / 页脚折叠
   ============================================================ */
(function () {
  "use strict";

  var D = null;                 // 数据
  var currentLang = "zh";       // 当前语言

  /* 资讯 API 地址：生产默认 '/api/news'（同源）。
     本地开发联调可临时改为 'http://localhost:8090/api/news' */
  var NEWS_API = "/api/news";

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* noop */ }

  /* ---------- 主题初始化（同步设置 data-theme，避免首帧闪烁） ---------- */
  applyThemeInit();
  function applyThemeInit() {
    try {
      var saved = localStorage.getItem("theme");
      var dark = saved ? saved === "dark" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    } catch (e) {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }

  /* ---------- 主题切换按钮 + 系统偏好跟随 ---------- */
  function initTheme() {
    applyThemeInit();
    if (window.matchMedia) {
      try {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
          if (!localStorage.getItem("theme")) {
            document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
          }
        });
      } catch (err) { /* noop */ }
    }
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* noop */ }
      });
    });
  }

  /* ---------- 语言工具 ---------- */
  function savedLang() {
    try {
      var saved = localStorage.getItem("de-lang");
      if (saved) return saved;
      /* 首次访问（无偏好）：地区语言检测 */
      if (window.DE_Geo) return window.DE_Geo.detect();
      return "zh";
    } catch (e) { return "zh"; }
  }

  /* ---------- 文本工具：去掉描述文本首行的人名行 ---------- */
  function bodyText(desc, name) {
    var lines = desc.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    if (lines.length && lines[0] === name) lines.splice(0, 1);
    else if (lines.length > 1 && lines[0] + lines[1] === name) lines.splice(0, 2);
    return lines.join(" ");
  }

  function clip(text, len) {
    return text.length > len ? text.slice(0, len) + "…" : text;
  }

  /* ---------- 渲染：人物（中英模式分别使用对应语言描述页图与名字） ---------- */
  function renderCharacters() {
    var mainGrid = document.getElementById("charMain");
    var supGrid = document.getElementById("charSupport");
    if (!mainGrid || !supGrid) return;

    var zh = currentLang === "zh";
    var mains = D.characters.filter(function (c) { return c.group === "main"; });
    var sups = D.characters.filter(function (c) { return c.group === "support"; });

    function pick(c) {
      return {
        img: zh ? c.image : (c.imageEn || c.image),
        nm: zh ? c.name : (c.nameEn || c.name)
      };
    }

    mainGrid.innerHTML = mains.map(function (c, i) {
      var mystery = c.id === "mayu";
      var p = pick(c);
      return '<article class="char-card main' + (mystery ? " mystery" : "") + '" data-char="' + c.id + '" role="button" tabindex="0" aria-label="' + p.nm + '">' +
        '<figure class="c-photo">' +
        '<img src="' + p.img + '" alt="' + p.nm + '"' + (i > 0 ? ' loading="lazy"' : "") + ' width="1280" height="720">' +
        "</figure></article>";
    }).join("");

    supGrid.innerHTML = sups.map(function (c) {
      var p = pick(c);
      return '<article class="char-card support" data-char="' + c.id + '" role="button" tabindex="0" aria-label="' + p.nm + '">' +
        '<figure class="c-photo">' +
        '<img src="' + p.img + '" alt="' + p.nm + '" loading="lazy" width="1200" height="431">' +
        "</figure></article>";
    }).join("");

    initCharModal();
  }

  /* ---------- 角色详情弹层（点击角色卡展开，展示文案） ---------- */
  function initCharModal() {
    var modal = document.getElementById("charModal");
    if (!modal) return;
    var body = document.body;
    var img = document.getElementById("charModalImg");
    var name = document.getElementById("charModalName");
    var desc = document.getElementById("charModalDesc");
    var mystery = document.getElementById("charModalMystery");
    var closed = document.getElementById("charModalClose");
    // 防止 renderCharacters 重复调用时重复绑定事件
    if (modal.__charModalBound) return;
    modal.__charModalBound = true;

    function open(c) {
      var zh = currentLang === "zh";
      var charImg = zh ? c.image : (c.imageEn || c.image);
      var charName = zh ? c.name : (c.nameEn || c.name);
      var charDesc = zh ? (c.description || "") : (c.descriptionEn || c.description || "");
      modal.setAttribute("data-open-char", c.id);
      if (img) { img.src = charImg; img.alt = charName; }
      if (name) name.textContent = charName;
      if (desc) desc.textContent = charDesc;
      if (mystery) mystery.style.display = (c.id === "mayu") ? "block" : "none";
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      body.style.overflow = "hidden";
      var closeBtn = modal.querySelector(".char-modal-close");
      if (closeBtn) closeBtn.focus();
    }
    function close() {
      modal.removeAttribute("data-open-char");
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      body.style.overflow = "";
    }

    // 事件绑定（事件委托，覆盖两列网格）
    ["charMain", "charSupport"].forEach(function (gridId) {
      var grid = document.getElementById(gridId);
      if (!grid) return;
      grid.addEventListener("click", function (e) {
        var card = e.target.closest(".char-card");
        if (!card) return;
        var c = findChar(card.getAttribute("data-char"));
        if (c) open(c);
      });
      grid.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        var card = e.target.closest(".char-card");
        if (!card) return;
        e.preventDefault();
        var c = findChar(card.getAttribute("data-char"));
        if (c) open(c);
      });
    });

    var backdrop = modal.querySelector(".char-modal-backdrop");
    if (backdrop) backdrop.addEventListener("click", close);
    if (closed) closed.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    // 语言切换时若弹层开着则同步刷新
    window.__charModalRefresh = function () {
      if (!modal.classList.contains("open")) return;
      var id = modal.getAttribute("data-open-char");
      if (!id) return;
      var c = findChar(id);
      if (c) open(c);
    };
  }

  function findChar(id) {
    if (!D.characters) return null;
    for (var i = 0; i < D.characters.length; i++) {
      if (D.characters[i].id === id) return D.characters[i];
    }
    return null;
  }

  /* ---------- 渲染：制作成员 ---------- */
  function renderCredits() {
    var groupEl = document.getElementById("creditGroups");
    var thanksEl = document.getElementById("thanksNames");
    if (!groupEl || !thanksEl) return;
    var zh = currentLang === "zh";
    /* 主创（原核心团队）并入统一框体，与其他部门样式一致 */
    var groups = [{ en: "Core Team", zh: "主创", list: D.credits.core.map(function (m) { return [m.role, m.roleZh, m.name]; }) }].concat(D.credits.groups);
    groupEl.innerHTML = groups.map(function (g) {
      var list = g.list.map(function (row) {
        var label = zh ? row[1] : row[0];
        var sep = zh ? "：" : ": ";
        return "<p><span class='lbl'>" + label + "</span>" + sep + "<span class='val'>" + row[2] + "</span></p>";
      }).join("");
      return '<div class="card credit-card fade-up">' +
        '<div class="credit-title"><span class="en">' + g.en + '</span><span class="zh">' + g.zh + "</span></div>" +
        '<div class="credit-list">' + list + "</div></div>";
    }).join("");

    thanksEl.textContent = D.credits.thanks;
  }

  /* ---------- 轻量 Markdown → HTML 渲染器（先转义再渲染，防 XSS） ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  /* 行内：`code`、**粗体**、*斜体*、[链接](url)（在已转义文本上执行） */
  function mdInline(s) {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
        /* 仅放行安全协议，拦截 javascript: / data: 等 */
        if (!/^(https?:\/\/|mailto:|#|\/)/i.test(url)) return m;
        return '<a href="' + url + '" target="_blank" rel="noopener">' + txt + "</a>";
      });
  }
  /* 块级：段落 / #~### 标题 / - 列表 */
  function mdToHtml(md) {
    if (!md) return "";
    var lines = escapeHtml(md).replace(/\r\n?/g, "\n").split("\n");
    var html = "";
    var inList = false;
    function closeList() { if (inList) { html += "</ul>\n"; inList = false; } }
    lines.forEach(function (line) {
      var t = line.trim();
      if (t === "") { closeList(); return; }
      var hm = t.match(/^(#{1,3})\s+(.*)$/);
      if (hm) {
        closeList();
        var lv = hm[1].length;
        html += "<h" + lv + ">" + mdInline(hm[2]) + "</h" + lv + ">\n";
        return;
      }
      var lm = t.match(/^[-*]\s+(.*)$/);
      if (lm) {
        if (!inList) { html += "<ul>\n"; inList = true; }
        html += "<li>" + mdInline(lm[1]) + "</li>\n";
        return;
      }
      closeList();
      html += "<p>" + mdInline(t) + "</p>\n";
    });
    closeList();
    return html;
  }
  /* 摘要用：去除 markdown 标记得到纯文本 */
  function mdPlain(md) {
    return String(md || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/\*\*([^*]*)\*\*/g, "$1")
      .replace(/\*([^*]*)\*/g, "$1")
      .replace(/^\s*[-*]\s+/gm, "")
      .replace(/\s+/g, " ").trim();
  }

  /* ---------- 渲染：资讯（节目单条目行，可展开 markdown 正文） ---------- */
  var backendNews = null;   // 后端 /api/news 数据（null = 未加载，回退 D.news）
  var newsOpen = {};        // 展开状态：资讯 id -> true

  function effectiveNews() {
    return backendNews !== null ? backendNews : (D ? D.news : []);
  }

  function renderNews() {
    var listEl = document.getElementById("newsList");
    var moreEl = document.getElementById("newsMore");
    if (!listEl) return;

    var zh = currentLang === "zh";
    var items = effectiveNews();
    listEl.innerHTML = items.map(function (n) {
      var d = String(n.date || "").split("-");
      var tagCls = n.tag === "招募" ? "chip-gold" : (n.tag === "公告" ? "chip-slate" : "chip");
      var title = zh ? n.title : (n.titleEn || n.title);
      var content = zh ? n.content : (n.contentEn || n.content);
      var inner =
        '<span class="nr-date"><span class="nr-d">' + (d[2] || "") + "." + (d[1] || "") + '</span><span class="nr-y">' + (d[0] || "") + "</span></span>" +
        '<span class="nr-body"><span class="nr-title">' + escapeHtml(title) + "</span>" +
        '<span class="nr-excerpt">' + clip(escapeHtml(mdPlain(content)), 80) + "</span></span>" +
        '<span class="nr-leader"></span>' +
        '<span class="nr-side"><span class="chip ' + tagCls + '">' + escapeHtml(n.tag) + '</span><span class="nr-arrow">›</span></span>';
      if (n.link) {
        /* 带外链的条目保持跳转行为 */
        return '<a class="news-row fade-up" href="' + n.link + '">' + inner + "</a>";
      }
      /* 常规资讯：点击展开 markdown 正文 */
      var isOpen = !!newsOpen[n.id];
      return '<div class="news-item fade-up' + (isOpen ? " open" : "") + '" data-news-id="' + n.id + '">' +
        '<div class="news-row nr-toggle" data-expand>' + inner + "</div>" +
        '<div class="nr-body-full">' + mdToHtml(content) + "</div>" +
        "</div>";
    }).join("");
    bindNewsToggle(listEl);

    if (moreEl) moreEl.style.display = items.length > 5 ? "" : "none";
  }

  function bindNewsToggle(listEl) {
    Array.prototype.forEach.call(listEl.querySelectorAll(".news-item[data-news-id]"), function (item) {
      var toggle = item.querySelector(".nr-toggle");
      if (!toggle || toggle._bound) return;
      toggle._bound = true;
      toggle.addEventListener("click", function () {
        var id = item.getAttribute("data-news-id");
        var open = item.classList.toggle("open");
        if (open) newsOpen[id] = true; else delete newsOpen[id];
      });
    });
  }

  /* ---------- 资讯数据源：优先后端 /api/news，失败回退 data/news.json ---------- */
  function loadNews() {
    if (location.protocol === "file:") return;   /* file:// 无法 fetch，直接用内联数据 */
    fetch(NEWS_API, { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        backendNews = (d && d.ok && Array.isArray(d.news)) ? d.news : null;
      })
      .catch(function () { backendNews = null; })
      .then(function () { renderNews(); });
  }

  /* ---------- 渲染：介绍 / 声明 ---------- */
  function renderIntro() {
    var el = document.getElementById("storyParas");
    if (!el) return;
    var zh = currentLang === "zh";
    var paras = D.i18n.story.paragraphs;
    el.innerHTML = paras.map(function (p, i) {
      var cls = i === paras.length - 1 ? ' class="story-final"' : "";
      return "<p" + cls + ">" + (zh ? p.zh : p.en) + "</p>";
    }).join("");
  }

  /* ---------- 渲染：游戏画面轮播（Steam 风格，按语言显示对应版本画面，翻谱过渡） ---------- */
  var galleryIndex = 0;
  var galleryCount = 0;
  var galleryTimer = null;
  var galleryBound = false;   // 静态控件（箭头/悬停/键盘/触摸/可见性）只绑定一次
  var gcOutTimer = null;
  var gcTouchX = null;

  function galleryForLang() {
    var items = D && D.gallery ? D.gallery : [];
    return currentLang === "zh" ? items.filter(function (g) { return g.lang === "zh" || g.lang === "both"; })
                                : items.filter(function (g) { return g.lang === "en" || g.lang === "both"; });
  }

  function renderGallery() {
    var track = document.getElementById("gcTrack");
    if (!track) return;
    var items = galleryForLang();
    galleryCount = items.length;
    galleryIndex = 0;   // 重建后索引复位，避免旧索引与第 0 张 active 不一致
    if (!galleryCount) return;
    track.innerHTML = items.map(function (g, i) {
      return '<figure class="gc-slide' + (i === 0 ? " active" : "") + '">' +
        '<img src="' + g.img + '" alt="' + (currentLang === "zh" ? "游戏画面" : "Game screenshot") + '" loading="' + (i === 0 ? "eager" : "lazy") + '"></figure>';
    }).join("");
    // 骨架淡入：图片加载完成（或已缓存）后给 img 加 .loaded，图片淡入
    track.querySelectorAll(".gc-slide img").forEach(function (img) {
      function markLoaded() { img.classList.add("loaded"); }
      if (img.complete && img.naturalWidth > 0) { markLoaded(); }
      else {
        img.addEventListener("load", markLoaded);
        img.addEventListener("error", markLoaded);   // 失败也标记加载完成，避免永久空白
      }
    });
    var dotsEl = document.getElementById("gcDots");
    if (dotsEl) {
      dotsEl.innerHTML = items.map(function (g, i) {
        return '<button class="gc-dot' + (i === 0 ? " active" : "") + '" data-i="' + i + '" aria-label="' + (i + 1) + '"></button>';
      }).join("");
      dotsEl.querySelectorAll(".gc-dot").forEach(function (d) {
        d.addEventListener("click", function () {
          var i = parseInt(d.getAttribute("data-i"), 10);
          if (i !== galleryIndex) { goGallery(i, i > galleryIndex ? 1 : -1); restartGalleryTimer(); }
        });
      });
    }
    updateGalleryCounter();
    bindGalleryOnce();
    startGalleryTimer();
  }

  /* 静态控件监听：仅绑定一次（语言切换会重复 renderGallery，防止监听器累积导致一次点击连跳多张） */
  function bindGalleryOnce() {
    if (galleryBound) return;
    var wrap = document.getElementById("galleryCarousel");
    var track = document.getElementById("gcTrack");
    if (!wrap || !track) return;
    galleryBound = true;
    var viewport = track.closest(".gc-viewport");
    var prev = viewport ? viewport.querySelector(".gc-prev") : null;
    var next = viewport ? viewport.querySelector(".gc-next") : null;
    if (prev) prev.addEventListener("click", function () { goGallery(galleryIndex - 1, -1); restartGalleryTimer(); });
    if (next) next.addEventListener("click", function () { goGallery(galleryIndex + 1, 1); restartGalleryTimer(); });
    wrap.addEventListener("mouseenter", stopGalleryTimer);
    wrap.addEventListener("mouseleave", startGalleryTimer);
    // 键盘 ←/→（仅轮播容器或其内部控件聚焦时生效）
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goGallery(galleryIndex - 1, -1); restartGalleryTimer(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goGallery(galleryIndex + 1, 1); restartGalleryTimer(); }
    });
    // 触摸滑动（阈值 40px；passive + CSS touch-action: pan-y 保证纵向滚动不受影响）
    if (viewport) {
      viewport.addEventListener("touchstart", function (e) {
        gcTouchX = e.touches[0].clientX;
        stopGalleryTimer();
      }, { passive: true });
      viewport.addEventListener("touchend", function (e) {
        var dx = gcTouchX === null ? 0 : e.changedTouches[0].clientX - gcTouchX;
        gcTouchX = null;
        if (Math.abs(dx) >= 40) { goGallery(galleryIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
        startGalleryTimer();
      }, { passive: true });
    }
    // 标签页隐藏时暂停自动播放，回前台恢复
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { stopGalleryTimer(); } else { startGalleryTimer(); }
    });
  }

  function goGallery(i, dir) {
    if (!galleryCount) return;
    var n = (i + galleryCount) % galleryCount;
    var track = document.getElementById("gcTrack");
    if (track) track.setAttribute("data-dir", dir === -1 ? "prev" : "next");
    var slides = document.querySelectorAll("#gcTrack .gc-slide");
    if (n !== galleryIndex && slides[galleryIndex]) {
      slides[galleryIndex].classList.add("gc-out");   // 旧幻灯片按方向退场，动画结束后清类
      if (gcOutTimer) clearTimeout(gcOutTimer);
      gcOutTimer = setTimeout(function () {
        document.querySelectorAll("#gcTrack .gc-slide.gc-out").forEach(function (s) { s.classList.remove("gc-out"); });
      }, 650);
    }
    galleryIndex = n;
    slides.forEach(function (s, k) { s.classList.toggle("active", k === n); });
    if (slides[n]) slides[n].classList.remove("gc-out");   // 快速往返时防止新当前页残留退场态
    document.querySelectorAll("#gcDots .gc-dot").forEach(function (d, k) { d.classList.toggle("active", k === n); });
    updateGalleryCounter();
  }

  function updateGalleryCounter() {
    var c = document.getElementById("gcCounter");
    if (c) c.innerHTML = galleryCount ? "<span class='gc-counter-note'>♪</span> " + (galleryIndex + 1) + " / " + galleryCount : "";
  }

  function startGalleryTimer() {
    stopGalleryTimer();
    var wrap = document.getElementById("galleryCarousel");
    if (wrap) wrap.classList.remove("gc-paused");
    if (!galleryCount) return;
    // 重启当前圆点的进度动画，使金色播放头与重新计时的 5s 保持同步
    var activeDot = document.querySelector("#gcDots .gc-dot.active");
    if (activeDot) {
      activeDot.classList.remove("active");
      void activeDot.offsetWidth;   // 强制回流，动画从头开始
      activeDot.classList.add("active");
    }
    galleryTimer = setInterval(function () { goGallery(galleryIndex + 1, 1); }, 3000);
  }
  function stopGalleryTimer() {
    if (galleryTimer) { clearInterval(galleryTimer); galleryTimer = null; }
    var wrap = document.getElementById("galleryCarousel");
    if (wrap) wrap.classList.add("gc-paused");
  }
  function restartGalleryTimer() { startGalleryTimer(); }

  function renderNotice() {
    var cardsEl = document.getElementById("noticeCards");
    if (!cardsEl) return;
    var zh = currentLang === "zh";
    var items = D.i18n.notice.items;
    var titles = [
      { zh: "非官方 · 完全免费", en: "Unofficial & Free" },
      { zh: "不使用官方素材", en: "No Official Assets" },
      { zh: "语言与音频", en: "Languages & Audio" }
    ];
    cardsEl.innerHTML = items.map(function (n, i) {
      return '<div class="card notice-card fade-up">' +
        '<span class="notice-icon">' + n.icon + "</span>" +
        "<h3>" + (zh ? titles[i].zh : titles[i].en) + "</h3>" +
        "<p>" + (zh ? n.zh : n.en) + "</p></div>";
    }).join("");
  }

  /* ---------- 渲染：招募页 ---------- */
  function renderRecruit() {
    if (document.body.hasAttribute("data-recr")) return; /* 招募页由 recruit-i18n.js 接管 */
    if (!document.getElementById("jobList")) return;
    var zh = currentLang === "zh";

    var whatEl = document.getElementById("whatCards");
    if (whatEl) {
      var whatEn = [
        "A non-profit online doujin collaboration model.",
        "With a standing core team at the center, specialized groups are formed by skill to drive production.",
        "A skill-based structure with an industrialized pipeline and strict creative standards & multi-stage review."
      ];
      whatEl.innerHTML = D.recruit.what.map(function (w, i) {
        return '<div class="card what-card fade-up">' +
          '<span class="what-icon">' + w.icon + "</span>" +
          "<h3>" + (zh ? w.title : w.titleEn) + "</h3>" +
          "<p>" + (zh ? w.text : whatEn[i]) + "</p></div>";
      }).join("");
    }

    var contactEl = document.getElementById("contactGrid");
    if (contactEl) {
      contactEl.innerHTML = D.recruit.contact.map(function (c) {
        var val = c.href ? '<a href="' + c.href + '" target="_blank" rel="noopener">' + c.value + "</a>" : c.value;
        return '<div class="card contact-card fade-up">' +
          "<h3>" + (zh ? c.title : c.titleEn) + "</h3>" +
          '<div class="cc">' + val + "</div>" +
          (c.extra ? '<div class="cc">' + c.extra + "</div>" : "") +
          "</div>";
      }).join("");
    }

    var jobEl = document.getElementById("jobList");
    if (jobEl) {
      var dutyLbl = zh ? "岗位职责" : "Responsibilities";
      var reqLbl = zh ? "任职要求" : "Requirements";
      jobEl.innerHTML = D.recruit.jobs.map(function (j) {
        var posts = j.posts.map(function (p) {
          var intro = p.intro ? '<p class="post-intro">' + p.intro + "</p>" : "";
          var duties = p.duties && p.duties.length
            ? '<div class="job-section">' + dutyLbl + "</div><ul class='job-list-ul'>" +
              p.duties.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>" : "";
          var reqs = p.requirements && p.requirements.length
            ? '<div class="job-section">' + reqLbl + "</div><ul class='job-list-ul'>" +
              p.requirements.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>" : "";
          return '<div class="job-post"><div class="post-name">' + p.name + "</div>" + intro + duties + reqs + "</div>";
        }).join("");
        return '<article class="job-card fade-up">' +
          '<span class="job-index">' + j.index + "</span>" +
          '<h3 class="job-title">' + (zh ? j.title : j.titleEn) + "</h3>" +
          '<div class="job-title-en">' + j.titleEn + "</div>" +
          '<div class="job-posts">' + posts + "</div></article>";
      }).join("");
    }
  }

  /* ---------- 语言应用 ---------- */
  function applyLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.documentElement.classList.toggle("lang-en", lang === "en");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!D.ui[key]) return;
      var v = D.ui[key][lang];
      if (v === "" || v === null || v === undefined) { el.style.display = "none"; }
      else { el.style.display = ""; el.textContent = v; }
    });

    document.querySelectorAll("[data-name-zh]").forEach(function (el) {
      var zh = el.getAttribute("data-name-zh");
      var en = el.getAttribute("data-name-en") || zh;
      el.textContent = lang === "zh" ? zh : en;
    });

    renderContent();

    // 语言切换时刷新已打开的角色弹层
    if (window.__charModalRefresh) window.__charModalRefresh();

    document.querySelectorAll(".lang-btn").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    try { localStorage.setItem("de-lang", lang); } catch (e) { /* noop */ }
  }

  function renderContent() {
    renderIntro();
    renderGallery();
    renderCharacters();
    renderCredits();
    renderNews();
    renderNotice();
    renderRecruit();
    observeFadeUp();
  }

  /* ---------- 进入动画（由 mv-block 门控触发） ---------- */
  /* 语言切换重渲染后：已表演区块内的新元素直接显示 */
  function observeFadeUp() {
    document.querySelectorAll(".mv-block.mv-start .fade-up:not(.in), .mv-block.mv-start .reveal:not(.in), .mv-block.mv-start .score-head:not(.in)")
      .forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 乐章表演：起拍 → mv-start → 内容表演序列 ---------- */
  var mvIO = null;
  function initMovement() {
    var blocks = document.querySelectorAll(".mv-block");
    if (!blocks.length) return;
    if (!("IntersectionObserver" in window)) {
      blocks.forEach(function (b) {
        b.classList.add("mv-start");
        b.querySelectorAll(".fade-up, .reveal, .score-head").forEach(function (el) { el.classList.add("in"); });
      });
      return;
    }
    if (!mvIO) {
      /* threshold 0 + rootMargin 收窄底部：超高区块（如人物区 4800px+）也能触发；
         isIntersecting=false 且区块已在视口上方（锚点跳转直接越过）时按已进入处理 */
      mvIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var block = e.target;
          if (!e.isIntersecting && e.boundingClientRect.top >= 0) return;
          var baton = block.querySelector(".baton");
          if (baton) baton.classList.add("go");
          setTimeout(function () {
            block.classList.add("mv-start");
            var cards = block.querySelectorAll(".fade-up");
            cards.forEach(function (el, i) { el.style.transitionDelay = (i * 40) + "ms"; });
            cards.forEach(function (el) { el.classList.add("in"); });
            block.querySelectorAll(".reveal, .score-head").forEach(function (el) { el.classList.add("in"); });
          }, 360);
          mvIO.unobserve(block);
        });
      }, { threshold: 0, rootMargin: "0px 0px -15% 0px" });
    }
    blocks.forEach(function (b) { mvIO.observe(b); });
  }

  /* ---------- 五线谱滚动进度条 + 云视差 ---------- */
  function initProgress() {
    var line = document.querySelector(".progress-line");
    var note = document.querySelector(".progress-note");
    var clBack = document.querySelector(".cl-back");
    var clFront = document.querySelector(".cl-front");
    if (!line || !note) return;

    var ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? window.scrollY / max : 0;
      line.style.width = (pct * 100).toFixed(2) + "%";
      note.style.left = (pct * 100).toFixed(2) + "%";

      if (!reduceMotion && clBack && clFront) {
        var y = window.scrollY;
        clBack.style.transform = "translateY(" + Math.min(y * 0.3, 60) + "px)";
        clFront.style.transform = "translateY(" + Math.min(y * 0.15, 40) + "px)";
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- A. Hero 视差与消退（苹果招牌） ---------- */
  /* hero-content：滚离首屏时 translateY(0→-80px) + opacity(1→0)，范围约 60vh */
  /* hero-bgimg：scale 1→1.06（视差纵深），范围约 120vh；rAF + passive 节流 */
  function initHeroExit() {
    var content = document.querySelector(".hero-content");
    var bg = document.querySelector(".hero-bgimg");
    if (!content || reduceMotion) return;
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      var vh = window.innerHeight || 1;
      var p = Math.min(y / (vh * 0.6), 1);
      content.style.opacity = (1 - p).toFixed(3);
      content.style.transform = "translateY(" + (-80 * p).toFixed(1) + "px)";
      if (bg) {
        var pb = Math.min(y / (vh * 1.2), 1);
        bg.style.transform = "scale(" + (1 + 0.06 * pb).toFixed(4) + ")";
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 导航当前态 ---------- */
  function initSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-link[href^="#"]'));
    if (!links.length) return;
    var navMap = {};
    links.forEach(function (a) { navMap[a.getAttribute("href").slice(1)] = a; });

    if (!("IntersectionObserver" in window)) return;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && navMap[e.target.id]) {
          links.forEach(function (a) { a.classList.remove("active"); });
          navMap[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    var sections = document.querySelectorAll("main section[id]");
    Array.prototype.forEach.call(sections, function (s) { spy.observe(s); });
  }

  /* ---------- 导航滚动切换（顶部透明态 / 纸感态） ---------- */
  function initNavScroll() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var ticking = false;
    function update() {
      ticking = false;
      var th = Math.max(window.innerHeight * 0.8, 400);
      nav.classList.toggle("paper", window.scrollY > th);
      nav.classList.toggle("scrolled", window.scrollY > th + window.innerHeight * 0.5);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Hero 视差消退（Apple 招牌：内容上移淡出 + 背景缩放） ---------- */
  function initHeroParallax() {
    var hero = document.querySelector(".hero");
    var content = document.querySelector(".hero-content");
    if (!hero || !content) return;
    var ticking = false;
    function update() {
      ticking = false;
      if (reduceMotion) return;
      var h = hero.offsetHeight || window.innerHeight;
      var p = Math.min(window.scrollY / (h * 0.6), 1);   // 60vh 内消退
      var pb = Math.min(window.scrollY / (h * 1.2), 1);  // 120vh 内背景缩放
      content.style.transform = "translateY(" + (-80 * p).toFixed(1) + "px)";
      content.style.opacity = (1 - p).toFixed(3);
      var bgimg = document.querySelector(".hero-bgimg");
      if (bgimg) bgimg.style.transform = "scale(" + (1 + 0.06 * pb).toFixed(4) + ")";
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 移动菜单 ---------- */
  function initMenu() {
    var menu = document.getElementById("mobileMenu");
    var burger = document.getElementById("hamburger");
    var close = document.getElementById("mmClose");
    if (!menu || !burger) return;

    function open() {
      menu.classList.add("open");
      document.body.classList.add("menu-locked");
      burger.classList.add("open");
      burger.setAttribute("aria-expanded", "true");
    }
    function closeMenu() {
      menu.classList.remove("open");
      document.body.classList.remove("menu-locked");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
    burger.addEventListener("click", open);
    if (close) close.addEventListener("click", closeMenu);
    /* 点击遮罩背景关闭 */
    menu.addEventListener("click", function (e) { if (e.target === menu) closeMenu(); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768) closeMenu();
    });
  }

  /* ---------- 语言切换控件 ---------- */
  function initLang() {
    document.querySelectorAll(".lang-switch").forEach(function (sw) {
      sw.addEventListener("click", function (e) {
        var btn = e.target.closest(".lang-btn");
        if (!btn) return;
        applyLang(btn.getAttribute("data-lang"));
      });
    });
  }

  /* ---------- 页脚声明折叠 ---------- */
  function initFooterToggle() {
    var toggle = document.querySelector(".foot-notice-toggle");
    var body = document.getElementById("footNoticeBody");
    if (!toggle || !body) return;
    toggle.addEventListener("click", function () {
      var open = body.classList.toggle("open");
      var caret = toggle.querySelector(".caret");
      if (caret) caret.textContent = open ? "▴" : "▾";
    });
  }

  /* ---------- 懒加载兜底（原生 loading=lazy 已启用） ---------- */
  function initLazy() {
    if (!("IntersectionObserver" in window)) return;
    var imgs = document.querySelectorAll("img[data-src]");
    imgs.forEach(function (img) {
      img.src = img.getAttribute("data-src");
      img.removeAttribute("data-src");
    });
  }

  /* ---------- 启动 ---------- */
  getData().then(function (data) {
    D = data;
    currentLang = savedLang();
    applyLang(currentLang);
    initProgress();
    initHeroExit();
    initNavScroll();
    initSpy();
    initMenu();
    initLang();
    initFooterToggle();
    initLazy();
    initMovement();
    initHeroParallax();
    initTheme();
    loadNews();
  });
})();
