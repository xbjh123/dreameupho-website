/* ============================================================
   DreamEupho — 地区访问语言检测（纯客户端，无第三方 API）
   分层检测（仅在无用户偏好时生效，用户手动切换永远优先）：
   1. 时区为中国时区 → 'zh'
   2. 浏览器语言以 zh 开头 → 'zh'
   3. 否则 → 'en'
   ============================================================ */
(function () {
  "use strict";

  var CN_ZONES = [
    "Asia/Shanghai", "Asia/Chongqing", "Asia/Urumqi", "Asia/Harbin",
    "Asia/Kashgar", "Asia/Macau", "Asia/Hong_Kong", "Asia/Taipei"
  ];

  window.DE_Geo = {
    detect: function () {
      // 1. 时区检测（优先）
      try {
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        for (var i = 0; i < CN_ZONES.length; i++) {
          if (tz === CN_ZONES[i]) return "zh";
        }
      } catch (e) { /* 时区不可用则忽略 */ }
      // 2. 浏览器语言
      try {
        var lang = (navigator.language || navigator.userLanguage || "").toLowerCase();
        if (lang.indexOf("zh") === 0) return "zh";
      } catch (e) { /* 忽略 */ }
      // 3. 默认英文
      return "en";
    }
  };
})();
