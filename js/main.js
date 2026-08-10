/* ============================================================
   DreamEupho — 交互层
   功能：语言切换 / 移动菜单 / IntersectionObserver 进入动画 /
         五线谱滚动进度条 / 导航当前态 / 云视差 / 页脚折叠
   ============================================================ */
(function () {
  "use strict";

  var D = null;                 // 数据
  var currentLang = "zh";       // 当前语言

  /* 愿望单 API 地址：生产默认 '/api/wishlist'（同源反向代理）。
     本地开发联调可临时改为 'http://localhost:8090/api/wishlist' */
  var WISHLIST_API = "/api/wishlist";
  /* 邮箱校验正则（与后端 EMAIL_RE 保持一致） */
  var WL_EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

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
      return '<article class="char-card main' + (mystery ? " mystery" : "") + '">' +
        '<figure class="c-photo">' +
        '<img src="' + p.img + '" alt="' + p.nm + '"' + (i > 0 ? ' loading="lazy"' : "") + ' width="1280" height="720">' +
        '<figcaption class="c-info">' +
        '<h3 class="c-name" data-name-zh="' + c.name + '" data-name-en="' + (c.nameEn || c.name) + '">' + p.nm + "</h3>" +
        '<span class="c-line"></span>' +
        '<p class="c-brief">' + clip(bodyText(c.description, c.name), 90) + "</p>" +
        (mystery ? '<span class="mystery-tag" data-i18n="mysteryTag">AN UNKNOWN MELODY…</span>' : "") +
        "</figcaption></figure></article>";
    }).join("");

    supGrid.innerHTML = sups.map(function (c) {
      var p = pick(c);
      var role = bodyText(c.description, c.name);
      return '<article class="char-card support">' +
        '<figure class="c-photo">' +
        '<img src="' + p.img + '" alt="' + p.nm + '" loading="lazy" width="1200" height="431">' +
        '<figcaption class="c-info">' +
        '<span class="s-name" data-name-zh="' + c.name + '" data-name-en="' + (c.nameEn || c.name) + '">' + p.nm + "</span>" +
        '<span class="s-role">' + clip(role, 40) + "</span>" +
        "</figcaption></figure></article>";
    }).join("");
  }

  /* ---------- 渲染：制作成员 ---------- */
  function renderCredits() {
    var coreEl = document.getElementById("coreTeam");
    var groupEl = document.getElementById("creditGroups");
    var thanksEl = document.getElementById("thanksNames");
    if (!coreEl || !groupEl || !thanksEl) return;

    coreEl.innerHTML = D.credits.core.map(function (m) {
      return '<div class="card core-card fade-up">' +
        '<div class="core-avatar">' + m.note + "</div>" +
        '<span class="core-role">' + m.role + "</span>" +
        '<div class="core-name">' + m.name + "</div></div>";
    }).join("");

    groupEl.innerHTML = D.credits.groups.map(function (g) {
      var list = g.list.map(function (row) {
        return "<p><span class='lbl'>" + row[0] + "：</span><span class='val'>" + row[1] + "</span></p>";
      }).join("");
      return '<div class="card credit-card fade-up">' +
        '<div class="credit-title"><span class="en">' + g.en + '</span><span class="zh">' + g.zh + "</span></div>" +
        '<div class="credit-list">' + list + "</div></div>";
    }).join("");

    thanksEl.textContent = D.credits.thanks;
  }

  /* ---------- 渲染：资讯（节目单条目行） ---------- */
  function renderNews() {
    var listEl = document.getElementById("newsList");
    var moreEl = document.getElementById("newsMore");
    if (!listEl) return;

    var zh = currentLang === "zh";
    var items = D.news.map(function (n) {
      var d = n.date.split("-");
      var tagCls = n.tag === "招募" ? "chip-gold" : (n.tag === "公告" ? "chip-slate" : "chip");
      var inner =
        '<span class="nr-date"><span class="nr-d">' + d[2] + "." + d[1] + '</span><span class="nr-y">' + d[0] + "</span></span>" +
        '<span class="nr-body"><span class="nr-title">' + (zh ? n.title : (n.titleEn || n.title)) + '</span>' +
        '<span class="nr-excerpt">' + clip(zh ? n.content : (n.contentEn || n.content), 80) + "</span></span>" +
        '<span class="nr-leader"></span>' +
        '<span class="nr-side"><span class="chip ' + tagCls + '">' + n.tag + '</span><span class="nr-arrow">›</span></span>';
      return n.link
        ? '<a class="news-row fade-up" href="' + n.link + '">' + inner + "</a>"
        : '<div class="news-row fade-up">' + inner + "</div>";
    }).join("");
    listEl.innerHTML = items;

    if (moreEl) moreEl.style.display = D.news.length > 5 ? "" : "none";
  }

  /* ---------- 渲染：介绍 / 故事 / 声明 ---------- */
  function renderIntro() {
    var leadEl = document.getElementById("introShort");
    var bulletsEl = document.getElementById("introBullets");
    if (!leadEl || !bulletsEl) return;
    var zh = currentLang === "zh";
    leadEl.textContent = zh ? D.i18n.intro.short.zh : D.i18n.intro.short.en;
    bulletsEl.innerHTML = D.i18n.intro.bullets.map(function (b) {
      return "<li>" + (zh ? b.zh : b.en) + "</li>";
    }).join("");
  }

  function renderStory() {
    var el = document.getElementById("storyParas");
    if (!el) return;
    var zh = currentLang === "zh";
    var paras = D.i18n.story.paragraphs;
    el.innerHTML = paras.map(function (p, i) {
      var cls = i === paras.length - 1 ? ' class="story-final"' : "";
      return "<p" + cls + ">" + (zh ? p.zh : p.en) + "</p>";
    }).join("");
  }

  function renderNotice() {
    var cardsEl = document.getElementById("noticeCards");
    var footEl = document.getElementById("footNoticeBody");
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

    if (footEl) {
      footEl.innerHTML = items.map(function (n) {
        return "<p>" + n.icon + " " + (zh ? n.zh : n.en) + "</p>";
      }).join("");
    }
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

    document.querySelectorAll(".lang-btn").forEach(function (b) {
      var on = b.getAttribute("data-lang") === lang;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    try { localStorage.setItem("de-lang", lang); } catch (e) { /* noop */ }
  }

  function renderContent() {
    renderIntro();
    renderStory();
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

  /* ---------- 愿望单：前端校验 + 提交发售通知 ----------
     WISHLIST_API 在文件顶部定义：
     - 生产默认：'/api/wishlist'（同源）
     - 本地开发：可临时改为 'http://localhost:8090/api/wishlist'
     （配合 server/wishlist_api.py）
  */
  /* 动态状态文案走 D.ui 双语表，随语言切换读取当前语言 */
  function i18nMsg(key) {
    try {
      var v = D.ui[key][currentLang];
      return (v === "" || v === null || v === undefined) ? "" : v;
    } catch (e) { return ""; }
  }

  function initWishlist() {
    var form = document.getElementById("wishlistForm");
    if (!form) return;
    var input = document.getElementById("wishlistEmail");
    var msg = document.getElementById("wishlistMsg");
    var btn = form.querySelector('button[type="submit"]');
    if (!input || !msg || !btn) return;

    /* 就地提示：成功绿 / 错误红，样式由 .wl-msg.success / .wl-msg.error 提供 */
    function show(type, text) {
      msg.className = "wl-msg" + (type ? " " + type : "");
      msg.textContent = text;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (input.value || "").trim();

      /* 前端校验：格式错误不请求后端 */
      if (!WL_EMAIL_RE.test(email)) {
        show("error", i18nMsg("wishlistErrFormat"));
        input.focus();
        return;
      }

      /* loading：按钮禁用 */
      btn.disabled = true;
      show("", i18nMsg("wishlistSending"));

      fetch(WISHLIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          return { status: r.status, data: data };
        });
      }).then(function (res) {
        var d = res.data || {};
        if (d.ok === true) {
          if (d.duplicate === true) {
            /* 重复订阅 */
            show("error", i18nMsg("wishlistDuplicate"));
          } else {
            /* 成功：提示 + 清空输入框 */
            show("success", i18nMsg("wishlistSuccess"));
            input.value = "";
          }
        } else if (d.error === "invalid_email") {
          show("error", i18nMsg("wishlistErrFormat"));
        } else if (d.error === "rate_limited") {
          show("error", i18nMsg("wishlistErrRate"));
        } else {
          show("error", i18nMsg("wishlistErrGeneric"));
        }
      }).catch(function () {
        /* 网络失败 */
        show("error", i18nMsg("wishlistErrGeneric"));
      }).then(function () {
        btn.disabled = false;
      });
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
    initWishlist();
  });
})();
