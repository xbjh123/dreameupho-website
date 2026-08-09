/* ============================================================
   DreamEupho — 招募页 13 语言系统
   数据：data/recruit-i18n.json（正文）+ data/recruit-chrome-i18n.json（界面文案）
   回退：file:// 或 fetch 失败 → data.js 内联 recruit/ui（zh-Hans）
   主页面 index.html 的中|EN 机制不受影响
   ============================================================ */
(function () {
  "use strict";

  if (!document.body || !document.body.hasAttribute("data-recr")) return;

  var LANGS = [
    { id: "zh-Hans", native: "简体中文", en: "Simplified Chinese" },
    { id: "zh-Hant", native: "繁體中文", en: "Traditional Chinese" },
    { id: "ja", native: "日本語", en: "Japanese" },
    { id: "en", native: "English", en: "English" },
    { id: "ko", native: "한국어", en: "Korean" },
    { id: "ru", native: "Русский", en: "Russian" },
    { id: "de", native: "Deutsch", en: "German" },
    { id: "fr", native: "Français", en: "French" },
    { id: "es", native: "Español", en: "Spanish" },
    { id: "es-LA", native: "Español (Latinoamérica)", en: "Latin American Spanish" },
    { id: "pt", native: "Português", en: "Portuguese" },
    { id: "it", native: "Italiano", en: "Italian" },
    { id: "pl", native: "Polski", en: "Polish" }
  ];

  var currentLang = "zh-Hans";
  var content = null;   // recruit-i18n 全量数据
  var chrome = null;    // chrome-i18n 全量数据

  function savedLang() {
    try {
      var l = localStorage.getItem("recruitLang");
      if (l) {
        for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === l) return l;
      }
      var old = localStorage.getItem("de-lang");
      return old === "en" ? "en" : "zh-Hans";
    } catch (e) { return "zh-Hans"; }
  }

  /* ---------- 界面文案：chrome 表，回退 ui 表 ---------- */
  function chromeText(key, lang) {
    if (chrome && chrome[key]) {
      var v = chrome[key][lang];
      if (v) return v;
    }
    var d = window.DE_DATA;
    if (d && d.ui && d.ui[key]) {
      if (lang === "en" && d.ui[key].en) return d.ui[key].en;
      return d.ui[key].zh;
    }
    return "";
  }

  /* ---------- 回退正文（zh-Hans，来自 data.js 内联） ---------- */
  function fallbackContent() {
    var d = window.DE_DATA || {};
    var r = d.recruit || {};
    return {
      about: {
        title: (d.ui && d.ui.rWhatTitle) ? d.ui.rWhatTitle.zh : "DreamEupho 是什么",
        intro: "",
        points: (r.what || []).map(function (w) { return w.text; })
      },
      join: {
        title: (d.ui && d.ui.rJoinTitle) ? d.ui.rJoinTitle.zh : "加入 DreamEupho",
        text: (d.ui && d.ui.rJoinText) ? d.ui.rJoinText.zh : ""
      },
      contacts: {
        title: (d.ui && d.ui.rContact) ? d.ui.rContact.zh : "联系方式",
        items: [
          "QQ：1022882012",
          "Email：dreameupho@163.com",
          "Discord（个人私信）：dreameupho_studio",
          "Discord（查看公告）：https://discord.gg/eeGYKxgxV",
          "bilibili：https://space.bilibili.com/1309393596"
        ]
      },
      jobs: {
        title: (d.ui && d.ui.rJobs) ? d.ui.rJobs.zh : "项目成员招募岗位",
        intro: (d.ui && d.ui.rJobsDesc) ? d.ui.rJobsDesc.zh : "",
        categories: (r.jobs || []).map(function (j) {
          return { title: j.title, posts: j.posts };
        })
      }
    };
  }

  /* ---------- 渲染 ---------- */
  function renderLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem("recruitLang", lang); } catch (e) { /* noop */ }

    var meta = null;
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === lang) meta = LANGS[i];
    var label = meta ? meta.native : lang;
    document.querySelectorAll(".mlang-current").forEach(function (el) { el.textContent = label; });
    document.querySelectorAll(".mlang-opt").forEach(function (el) {
      var on = el.getAttribute("data-lang") === lang;
      el.classList.toggle("active", on);
    });

    /* 界面文案（chrome 表） */
    document.querySelectorAll("[data-ri18n]").forEach(function (el) {
      var key = el.getAttribute("data-ri18n");
      var v = chromeText(key, lang);
      if (v) el.textContent = v;
    });

    var data = (content && content[lang]) ? content[lang] : fallbackContent();

    /* 页头 */
    var ey = document.getElementById("encoreTitle");
    if (ey) { var h = chromeText("headerEyebrow", lang); if (h) ey.textContent = h; }

    /* DreamEupho 是什么 */
    var at = document.getElementById("aboutTitle");
    if (at) at.textContent = data.about.title;
    var aw = document.getElementById("whatCards");
    if (aw) {
      var icons = ["♩", "♫", "♪"];
      aw.innerHTML = (data.about.points || []).map(function (p, idx) {
        var seg = p.split(/[：:]\s*/);
        var head = seg.length > 1 ? seg[0] : "";
        var body = seg.length > 1 ? seg.slice(1).join("：") : p;
        return '<div class="card what-card fade-up">' +
          '<span class="what-icon">' + (icons[idx] || "♪") + "</span>" +
          (head ? "<h3>" + head + "</h3>" : "") +
          "<p>" + body + "</p></div>";
      }).join("");
    }

    /* 加入 DreamEupho */
    var jt = document.getElementById("joinTitle");
    if (jt) jt.textContent = data.join.title;
    var jt2 = document.getElementById("joinText");
    if (jt2) jt2.textContent = (data.join.text || "").replace(/\n/g, "<br>");

    /* 联系方式 */
    var ct = document.getElementById("contactTitle");
    if (ct) ct.textContent = data.contacts.title;
    var cg = document.getElementById("contactGrid");
    if (cg) cg.innerHTML = renderContacts(data.contacts.items);

    /* 岗位 */
    var jl = document.getElementById("jobsTitle");
    if (jl) jl.textContent = data.jobs.title;
    var jd = document.getElementById("jobsDesc");
    if (jd) jd.textContent = (data.jobs.intro || "").replace(/\n/g, " ");
    var jl2 = document.getElementById("jobList");
    if (jl2) jl2.innerHTML = renderJobs(data.jobs.categories, lang);

    /* 页脚 */
    var fc = document.getElementById("footCopyright");
    if (fc) fc.textContent = "© 2026 DreamEupho " + chromeText("footerLine2", lang);
    var fd = document.getElementById("footDoujin");
    if (fd) fd.textContent = chromeText("footerLine1", lang);

    /* 已表演区块内的新卡片直接显示（避免语言切换后隐藏） */
    document.querySelectorAll(".mv-block.mv-start .fade-up:not(.in)").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 联系方式 5 卡（items 文本行解析 + 固定链接映射） ---------- */
  var CONTACT_HREFS = [null, "mailto:dreameupho@163.com", null, "https://discord.gg/eeGYKxgxV", "https://space.bilibili.com/1309393596"];
  function renderContacts(items) {
    var arr = items || [];
    return arr.map(function (line, i) {
      var seg = line.split(/[：:]\s*/);
      var label = seg[0] || "";
      var value = seg.slice(1).join("：");
      var href = CONTACT_HREFS[i] || null;
      var valHtml = href ? '<a href="' + href + '" target="_blank" rel="noopener">' + value + "</a>" : value;
      return '<div class="card contact-card fade-up">' +
        "<h3>" + label + "</h3>" +
        '<div class="cc">' + valHtml + "</div></div>";
    }).join("");
  }

  /* ---------- 岗位乐段卡（7 类） ---------- */
  function renderJobs(categories, lang) {
    var duty = chromeText("jobsDuty", lang) || "岗位职责";
    var req = chromeText("jobsReq", lang) || "任职要求";
    var list = categories || [];
    return list.map(function (cat, ci) {
      var posts = (cat.posts || []).map(function (p) {
        var intro = p.intro ? '<p class="post-intro">' + p.intro + "</p>" : "";
        var duties = (p.duties && p.duties.length)
          ? '<div class="job-section">' + duty + '</div><ul class="job-list-ul">' +
            p.duties.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>" : "";
        var reqs = (p.requirements && p.requirements.length)
          ? '<div class="job-section">' + req + '</div><ul class="job-list-ul">' +
            p.requirements.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>" : "";
        return '<div class="job-post"><div class="post-name">' + p.name + "</div>" + intro + duties + reqs + "</div>";
      }).join("");
      var idx = (ci + 1) < 10 ? "0" + (ci + 1) : String(ci + 1);
      return '<article class="job-card fade-up">' +
        '<span class="job-index">' + idx + "</span>" +
        '<h3 class="job-title">' + cat.title + "</h3>" +
        '<div class="job-title-en"></div>' +
        '<div class="job-posts">' + posts + "</div></article>";
    }).join("");
  }

  /* ---------- 下拉选择器 ---------- */
  function buildOptions(panel, lang) {
    panel.innerHTML = LANGS.map(function (l) {
      return '<div class="mlang-opt' + (l.id === lang ? " active" : "") + '" data-lang="' + l.id + '" role="option">' +
        '<span class="mlo-native">' + l.native + '</span><span class="mlo-en">' + l.en + "</span></div>";
    }).join("");
  }

  function initSelectors() {
    var groups = document.querySelectorAll(".mlang");
    groups.forEach(function (g) {
      var btn = g.querySelector(".mlang-btn");
      var panel = g.querySelector(".mlang-panel");
      if (!btn || !panel) return;
      buildOptions(panel, currentLang);
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = g.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      panel.addEventListener("click", function (e) {
        var opt = e.target.closest(".mlang-opt");
        if (!opt) return;
        renderLang(opt.getAttribute("data-lang"));
        groups.forEach(function (grp) {
          grp.classList.remove("open");
          var b = grp.querySelector(".mlang-btn");
          if (b) b.setAttribute("aria-expanded", "false");
        });
      });
    });
    document.addEventListener("click", function () {
      groups.forEach(function (g) { g.classList.remove("open"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        groups.forEach(function (g) { g.classList.remove("open"); });
      }
    });
  }

  /* ---------- 加载 ---------- */
  function showSkeleton() {
    var map = { whatCards: 3, contactGrid: 5, jobList: 7 };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var html = "";
      for (var i = 0; i < map[id]; i++) html += '<div class="skel-card"></div>';
      el.innerHTML = html;
    });
  }

  function load() {
    var lang = savedLang();
    currentLang = lang;
    showSkeleton();
    initSelectors();

    if (location.protocol === "file:") { renderLang(currentLang); return; }

    Promise.all([
      fetch("data/recruit-i18n.json?v=2").then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch("data/recruit-chrome-i18n.json?v=2").then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (res) {
      content = res[0];
      chrome = res[1];
      renderLang(currentLang);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
