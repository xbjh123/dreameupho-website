/* ============================================================
   DreamEupho — 数据层（迁移就绪）
   getData() 单一数据入口：
   - http 服务下优先 fetch 本地 JSON（data/*.json）
   - file:// 协议或请求失败时回退到本文件内联数据
   - 未来迁移 API 时只需修改 getData() 一处
   ============================================================ */
(function (global) {
  "use strict";

  /* ---------- 人物 ---------- */
  var characters = [
    { id: "kumiko", name: "黄前久美子", nameEn: "Kumiko Oumae", image: "assets/img/characters/main/kumiko.jpg", group: "main",
      description: "黄前久美子\n玩家所扮演的角色。三年前，她也曾想要过上与他人无二的高中生活，得过且过是她的人生态度，直到被对吹奏的渴望重新唤起了心跳。\n现在的她看似舍弃了那个平凡的自己，成了不愿平庸、不甘失败的上低音号手，以吹奏部部长的身份再次带领同伴向全国大赛金奖发起冲刺。\n然而，她，真的已经蜕变了吗?" },
    { id: "reina", name: "高坂丽奈", nameEn: "Reina Kousaka", image: "assets/img/characters/main/reina.jpg", group: "main",
      description: "高坂\n丽奈\n久美子的挚友,小号手,凭着极为优秀的音乐水平、近乎残酷的自律和灾难性的人缘闻名校内。\n她最擅长的事就是矢志不渝——在达成目标的过程中,宁可不择手段,也不愿放弃,甚至是以自己的人格和未来作为担保。\n然而,她,真的仅限于此了吗?" },
    { id: "mayu", name: "？？？？", nameEn: "????", image: "assets/img/characters/main/mayu.jpg", group: "main",
      description: "？？？？\n新来的转校生，上低音号手，表面上与周围格格不入，却莫名很受大家欢迎——音乐、针织与微笑都令人侧目。\n以温和友善的面貌示人，从不陷于任何争端冲突，更是低音声部的定心丸。人们说她就宛如一张白纸。\n然而，她，真的就没有秘密了吗？" },
    { id: "shuichi", name: "冢本秀一", nameEn: "Shuichi Tsukamoto", image: "assets/img/characters/main/shuichi.jpg", group: "main",
      description: "久美子的青梅竹马，长号手，某咖啡厅月卡拥有者，却也是坚定不移的反熬夜标兵（数次亲自打破），曾与久美子共同有过不再主动回忆的过去。\n在初中常伴久美子的左右，前两年也受大家感召，为实现新生的理想而进发。\n然而，他，真的甘于现状了吗？" },
    { id: "midori", name: "川岛绿辉", nameEn: "Midori Kawashima", image: "assets/img/characters/main/midori.jpg", group: "main",
      description: "久美子在高一结识的好友，低音提琴手/贝斯手。\n因为父母浪漫至死的起名方式过于羞耻，一开始就要求久美子她们称她为\"绿\"。就算如此，她也承继家族追求洒脱不拘的精神，让乐器、爱与死亡成为她人生永不会放弃之物的前三名。\n作为从来都我行我素的\"绿辉\"，面对人生前路，她也总会做出不一样的选择。" },
    { id: "hazuki", name: "加藤叶月", nameEn: "Hazuki Katou", image: "assets/img/characters/main/hazuki.jpg", group: "main",
      description: "久美子在高一结识的好友，大号手。\n大家犹疑不前时，都会希望她像\"幕后英雄\"般在终场现身。外表上大大咧咧，隔着一层楼都能听到她爽朗的笑声，强悍如北宇治校规都无法制约。可每逢关键时候，她也会甘愿当作陪衬的自知之明，习惯自己去默默当好那个真正的\"幕后英雄\"。" },
    { id: "kanade", name: "久石奏", nameEn: "Kanade Hisaishi", image: "assets/img/characters/main/kanade.jpg", group: "main",
      description: "久石奏\n久美子在高二结识的\"可爱\"后辈，\"可爱\"上低音号手。不称呼她\"可爱\"二字，就随时上门取命的类型（划掉）。\n与久美子共事的一年让她不仅意识到逗弄前辈的好玩之处，也知道了努力的意义所在何方。" },
    { id: "sari", name: "义井沙里", nameEn: "Sari Yoshii", image: "assets/img/characters/main/sari.jpg", group: "main",
      description: "这一年的吹奏部新成员，单簧管乐手。\n擅长吹奏和民间传说，也乐于分享这些，在就读的初中里本有机会过上同学前拥后簇的生活。不过，她更想在琴房里独自惬意地看书练琴，也莫名在这方面与丽奈学姐很是合拍。\n即便如此，她仍享受着与朋友相处的时光，只盼那场终将来临的离别，能晚一点到来。" },
    { id: "kamataya-suzume", name: "釜屋雀", image: "assets/img/characters/support/kamataya-suzume.jpg", group: "support",
      description: "釜屋雀\n这一年的吹奏部新成员,新晋大号手。\n自我取名派对狂客,可因为某些缘故,常\n自甘堕落为姐姐(釜屋燕)的贴心枕头。" },
    { id: "kamataya-tsubame", name: "釜屋燕", image: "assets/img/characters/support/kamataya-tsubame.jpg", group: "support",
      description: "与久美子同居的打击乐声部成员，司职马林巴。\n自觉长相普通，常将自己的世界局限在眼镜之后，直到妹妹的一句鼓励，才肯上手尝试鲜为人知的奇怪乐器。如此，她才明白在自己之外，竟如此广阔。" },
    { id: "takaku-chieri", name: "高久智绘里", image: "assets/img/characters/support/takaku-chieri.jpg", group: "support",
      description: "高久\n智绘里\n与久美子同届的单簧管声部成员，吹奏部乐团首席。\n温和恬静的乖乖女，不知是否是刘海遮住了眼睛所致，实力超群却存在感稀薄" },
    { id: "oumai-akiko", name: "黄前明子", image: "assets/img/characters/support/oumai-akiko.jpg", group: "support",
      description: "家庭主妇，久美子坚实的后盾。\n支持并尊重女儿的决定——大女儿如此，二女儿亦然。" },
    { id: "kaho", name: "针谷佳穗", image: "assets/img/characters/support/kaho.jpg", group: "support",
      description: "这一年的吹奏部新成员，新晋上低音号手。\n内向腼腆的典型好孩子，憨笑挑战连败纪录保持者，但其笔下画风可堪豪放一词。" },
    { id: "kenzaki-ririka", name: "剑崎梨梨花", image: "assets/img/characters/support/kenzaki-ririka.jpg", group: "support",
      description: "久美子在高二结识的\"可爱\"后辈，双簧管乐手。\n双簧乐器会会长、\"早上一个鸡蛋，一天全部健康\"理念的开创者、小奏皮厨房的监督者，热衷于发现新奇事物，并为己所用。" },
    { id: "sakai-masako", name: "堺万纱子", image: "assets/img/characters/support/sakai-masako.jpg", group: "support",
      description: "与久美子同届的打击乐声部成员，总是与井上顺菜同屏出现。\n在线上主持过多届\"莫扎特与Emo万岁\"的同好交流会，因其渊博的通俗音乐知识和热心肠，引得不少路人入群。" },
    { id: "inoue-junna", name: "井上顺菜", image: "assets/img/characters/support/inoue-junna.jpg", group: "support",
      description: "与久美子同届的打击乐声部声部长，总是与堺万纱子同屏出现。\n性情直率，有亲和力，深受打击乐声部部员们的爱戴。" },
    { id: "kumiko-father", name: "黄前健太郎", image: "assets/img/characters/support/kumiko-father.jpg", group: "support",
      description: "公司职员，对即将面临升学的久美子接过部长职务一事颇有微词，总是在餐桌上与女儿话争锋相对。" },
    { id: "kaizuka-mizore", name: "铠冢霙", image: "assets/img/characters/support/kaizuka-mizore.jpg", group: "support",
      description: "去年和久美子同在北宇治吹奏部的学姐，双簧管乐手，现为京都音乐大学的学生。在新校园里，极高的音乐理解与神秘的生活作风，使她被动拥有一个由若干聒噪学妹组建的应援会。然而，她宁愿所有都在改变，也仍执拗地固守心底一块小小的净土，留给她最珍视的另一个人。" },
    { id: "suzuki-satsuki", name: "铃木皋月", image: "assets/img/characters/support/suzuki-satsuki.jpg", group: "support",
      description: "久美子在高二结识的后辈, 大号手。身材袖珍, 天真烂漫, 大部分时间都在cos美玲的挂件, 可在回家路上也会时不时透露属于自己的真心。" },
    { id: "suzuki-mirei", name: "铃木美玲", image: "assets/img/characters/support/suzuki-mirei.jpg", group: "support",
      description: "久美子在高二结识的后辈，大号手。\n身高傲人，冷静务实，胳膊上和心里总是牵\n挂着双马尾的小小女孩，正尝试着如何在兼\n顾自我提升的同时，也照顾别人的感受。" },
    { id: "taki-noboru", name: "泷升", image: "assets/img/characters/support/taki-noboru.jpg", group: "support",
      description: "北宇治高中吹奏乐部顾问，同时也兼任着几个班的音乐老师和班主任。\n是风度翩翩的森系帅哥，亦是不通人情的\"微笑恶魔\"。两年前泷的到来让吹奏部焕然一新，而现在，新的挑战摆在了他和部员们的面前。" },
    { id: "maki", name: "牧誓", image: "assets/img/characters/support/maki.jpg", group: "support",
      description: "与久美子同届的萨克斯声部成员，司职中音萨克斯。高一时还是声部里的开心果，到如今已成长为可靠的声部部长，除去储藏室里的\"大号君\"外，还照料着部员社团生活的方方面面。" },
    { id: "kamiishi-yao", name: "上石弥生", image: "assets/img/characters/support/kamiishi-yao.jpg", group: "support",
      description: "这一年的吹奏部新成员，新晋大号手。\n佳穗连败纪录的肇事方，幻想作为海盗生活，如今\"落魄\"到需要以漫才笑话和朋友接济小零食为生。" },
    { id: "matsumoto-michie", name: "松本美知惠", image: "assets/img/characters/support/matsumoto-michie.jpg", group: "support",
      description: "北宇治高中吹奏乐部副顾问，同时也是久美子从高一到高三的班主任。\n\"军曹老师\"的威名之下，却是一颗柔软的心。" },
    { id: "tanaka-asuka", name: "田中明日香", image: "assets/img/characters/support/tanaka-asuka.jpg", group: "support",
      description: "久美子一年级时同在低音声部的\n学姐，曾是上低音号手。\n考上京都大学后，留给久美子的\n除去唯她才能理解的幽默感，也\n只剩下些触不可及的珍贵回忆，\n是久美子最仰慕的人。" },
    { id: "ogasawara-haruka", name: "小笠原晴香", image: "assets/img/characters/support/ogasawara-haruka.jpg", group: "support",
      description: "久美子一年级时北宇治吹奏部的部长，上低音萨克斯乐手。\n以温柔著称的爱哭鬼，曾以此风靡校报版面，可一旦遇到值得坚持的人或事物，她从来不会让人失望。" },
    { id: "kohinata-yume", name: "小日向梦", image: "assets/img/characters/support/kohinata-yume.jpg", group: "support",
      description: "久美子在高二结识的后辈，小号手。\n吹奏水平高超却缺乏自信，一年级得到加部友惠学姐的鼓励后，总是低着的头终于抬起了些许。" },
    { id: "tsukinaga-motomu", name: "月永求", image: "assets/img/characters/support/tsukinaga-motomu.jpg", group: "support",
      description: "久美子在高二结识的后辈，低音提琴手。性情孤僻让他人难以接近，只有在面对绿辉学姐时才会显现出温顺的一面。面对自己敬慕的学姐即将毕业的事实，他不得不意识到需要去直视此前不肯回忆的过去。" },
    { id: "sasaki-azusa", name: "佐佐木梓", image: "assets/img/characters/support/sasaki-azusa.jpg", group: "support",
      description: "久美子国中时的同学兼好友，现为立华高中吹奏俱乐部部长。\n天资卓绝的努力家，在带领立华捍卫行奏乐王座的同时，也为实现自己的音乐梦想而大步向前。" }
  ];

  /* ---------- 资讯 ---------- */
  var news = [
    { id: 1, title: "DreamEupho 项目成员招募正式开启", titleEn: "DreamEupho Team Recruitment is Now Open", date: "2026-08-07", tag: "招募",
      content: "出于对作品纯粹的热爱，我们正在寻找志同道合的创作者加入 DreamEupho 开发管线。目前开放剧本、美术、配音、音乐、程序、运营、翻译等七大方向岗位，详见「加入我们」页面。本文档长期更新，具体招募岗位会随项目进度动态调整。",
      contentEn: "Out of pure love for the work, we are looking for like-minded creators to join the DreamEupho development pipeline. Positions are open across seven tracks: Scenario, Art, Voice Acting, Music, Programming, Operations and Translation. See the Join Us page for details.",
      link: "recruit.html" },
    { id: 2, title: "官方网站原型搭建中", titleEn: "Official Website Prototype Under Construction", date: "2026-08-07", tag: "开发",
      content: "DreamEupho 官方网站正在搭建中，将陆续上线游戏介绍、故事背景、人物介绍、制作成员、资讯更新等内容板块，敬请期待。",
      contentEn: "The official DreamEupho website is under construction. Sections covering the game intro, story, characters, credits and news updates will be rolled out progressively. Stay tuned." }
  ];

  /* ---------- 正文双语（与 data/i18n.json 同构） ---------- */
  var i18n = {
    intro: {
      short: {
        zh: "一部关于久美子三年级生活的免费同人视觉小说，包含分支选项与三条恋爱路线。",
        en: "A free fan-made visual novel about Kumiko's third year, featuring branching choices and three romance routes."
      },
      bullets: [
        { zh: "非官方 · 完全免费：这是一部非官方的同人视觉小说。游戏是——并且永远是——完全免费的。",
          en: "Unofficial & Completely Free: This is an unofficial fan-made visual novel. The game is—and always will be—completely free." },
        { zh: "不使用官方素材：出于对原作版权方的尊重，本项目不直接使用任何官方美术、音乐或音频素材。全部游戏素材均为独立创作或合法授权的第三方资源。若无意中侵犯了您的权利，请联系我们以便修正。",
          en: "No Official Assets: Out of respect for the original copyright holders, this project makes no direct use of any official artwork, music, or audio assets. All game assets are either independently created or legally licensed third-party resources. If we have inadvertently infringed upon your rights, please contact us so we can make corrections." },
        { zh: "语言与音频：中文、英语和日语以外的语言文本借助机器翻译工具制作，可能存在语义偏差——尤其是管乐术语与角色语气方面。此外，本游戏仅包含中文配音。由于制作预算限制，基础界面仅提供英语与简中版本，希望这不会影响您的剧情体验。",
          en: "On Languages & Audio: Text in languages other than Chinese, English and Japanese was produced with the assistance of machine translation tools, so there may be some semantic drift—particularly regarding wind band terminology and individual characters' voices. In addition, this game features Chinese voice acting only. Due to production budget constraints, the base UI is only available in English and schinese. We sincerely hope this does not detract from your experience of the story." }
      ]
    },
    story: {
      paragraphs: [
        { zh: "又一个春天降临北宇治高中，上低音号手黄前久美子正式接过了北宇治吹奏乐部部长一职。",
          en: "Another spring has arrived at Kitauji High School, and euphonium player Kumiko Oumae officially takes up the baton as president of the Kitauji Concert Band." },
        { zh: "这一年，是她与伙伴们最后一次冲击全国大赛金奖的机会。",
          en: "This year marks her—and her friends'—final chance to pursue the Gold Prize at the National Wind Band Contest." },
        { zh: "在那之前，Sunrise 音乐节的行进演出，不过是一道开胃小菜。",
          en: "Before that, the marching show at the Sunrise Festival looks like nothing more than a light appetizer." },
        { zh: "然而，随着新学年开始，吹奏部的琴房里迎来的，不仅是永远活力满格的新生，还有一位手执上低音号的转校生——她的到来，即将击碎这份平淡的日常。",
          en: "Yet as the new school year begins, the band room welcomes not only underclassmen whose energy is forever dialed to maximum, but also a transfer student, her own euphonium in hand—one whose arrival is about to shatter the humdrum everyday." },
        { zh: "随着她的到来，那熟悉的裂痕再度在社团中蔓延开来。",
          en: "With her coming, an all-too-familiar rift begins to creep through the club once more." },
        { zh: "但这一次，久美子嗅到了不一样的气息。裂痕之下翻涌的，不仅是胜负之争，更是一场足以摧毁多年信念积累的危机。",
          en: "But this time, Kumiko senses something different. What churns beneath that rift is not merely a rivalry over winning or losing, but also a crisis grave enough to undo everything that years of faith have built." },
        { zh: "她会朝着众人仰望的梦想继续前进吗？会半途而废吗？",
          en: "Will she press on toward the dream everyone looks up to? Will she stop halfway?" },
        { zh: "又或者……她会亲手将自己逐出那片曾经深爱的舞台？",
          en: "Or… will she cast herself out from the stage she once loved so dearly?" },
        { zh: "一切，都取决于久美子即将做出的选择。",
          en: "Everything hinges on the choice Kumiko is about to make." }
      ]
    },
    notice: {
      title: { zh: "重要声明", en: "Important Notice" },
      items: [
        { icon: "♩", zh: "非官方 · 完全免费：这是一部非官方的同人视觉小说。游戏是——并且永远是——完全免费的。",
          en: "Unofficial & Completely Free: This is an unofficial fan-made visual novel. The game is—and always will be—completely free." },
        { icon: "♫", zh: "不使用官方素材：本项目不直接使用任何官方美术、音乐或音频素材。全部游戏素材均为独立创作或合法授权的第三方资源。若无意中侵犯了您的权利，请联系我们以便修正。",
          en: "No Official Assets: This project makes no direct use of any official artwork, music, or audio assets. All game assets are either independently created or legally licensed third-party resources. If we have inadvertently infringed upon your rights, please contact us so we can make corrections." },
        { icon: "♪", zh: "语言与音频：中英日以外的语言文本借助机器翻译制作，可能存在语义偏差。本游戏仅包含中文配音；基础界面仅提供英语与简中版本。",
          en: "On Languages & Audio: Text in languages other than Chinese, English and Japanese was produced with the assistance of machine translation tools. This game features Chinese voice acting only; the base UI is available in English and schinese." }
      ]
    }
  };

  /* ---------- 全站静态文案双语表（data-i18n 键） ---------- */
  var ui = {
    navIntro:     { zh: "游戏介绍", en: "Intro" },
    navStory:     { zh: "故事背景", en: "Story" },
    navChars:     { zh: "人物介绍", en: "Characters" },
    navCredits:   { zh: "制作成员", en: "Credits" },
    navNews:      { zh: "资讯更新", en: "News" },
    navJoin:      { zh: "加入我们", en: "Join Us" },
    mmSub:        { zh: "节目单 · 通向未来的旋律", en: "Program · A Melody Toward the Future" },
    heroTitle:    { zh: "通向未来的旋律", en: "A MELODY TOWARD THE FUTURE" },
    heroSub:      { zh: "A MELODY TOWARD THE FUTURE", en: "" },
    heroCta:      { zh: "加入制作组 →", en: "JOIN THE TEAM →" },
    heroMore:     { zh: "了解游戏 ↓", en: "EXPLORE ↓" },
    secIntro:     { zh: "游戏介绍", en: "About the Game" },
    secStory:     { zh: "故事背景", en: "Story" },
    secChars:     { zh: "人物介绍", en: "Characters" },
    secCredits:   { zh: "制作成员", en: "Credits" },
    secNews:      { zh: "资讯更新", en: "News" },
    secNotice:    { zh: "重要声明", en: "Important Notice" },
    introQuote:   { zh: "免费同人视觉小说 · 分支选项 · 三条恋爱路线", en: "Free fan-made visual novel · Branching choices · 3 romance routes" },
    chipVN:       { zh: "视觉小说", en: "Visual Novel" },
    chipBand:     { zh: "吹奏部", en: "Band Club" },
    chipFree:     { zh: "完全免费", en: "100% Free" },
    mainChars:    { zh: "主要角色", en: "Main Characters" },
    supportChars: { zh: "配角阵容", en: "Supporting Cast" },
    mysteryTag:   { zh: "AN UNKNOWN MELODY…", en: "AN UNKNOWN MELODY…" },
    newsAll:      { zh: "查看全部", en: "VIEW ALL" },
    ctaLine:      { zh: "一起吹响通往未来的旋律吧", en: "Let's sound off a melody toward the future together!" },
    ctaSub:       { zh: "持续招募中 · 剧本 / 美术 / 配音 / 音乐 / 程序 / 运营 / 翻译", en: "Recruiting · Scenario / Art / Voice / Music / Programming / Operations / Translation" },
    ctaBtn:       { zh: "查看岗位详情 →", en: "SEE OPEN POSITIONS →" },
    ctaGroup:     { zh: "玩家群 / 招募群：1029729353 / 1022882012", en: "QQ Groups: 1029729353 / 1022882012" },
    footTagline:  { zh: "A MELODY TOWARD THE FUTURE", en: "A MELODY TOWARD THE FUTURE" },
    footNotice:   { zh: "重要声明", en: "Important Notice" },
    footExpand:   { zh: "展开 ▾", en: "EXPAND ▾" },
    footCollapse: { zh: "收起 ▴", en: "COLLAPSE ▴" },
    footFull:     { zh: "查看完整声明 ↑", en: "VIEW FULL NOTICE ↑" },
    footCopyright:{ zh: "© 2026 DreamEupho 制作组", en: "© 2026 DreamEupho Production Team" },
    footDoujin:   { zh: "同人非官方作品，与原作版权方无关", en: "An unofficial fan work, not affiliated with the original creators" },
    backHome:     { zh: "返回首页", en: "BACK HOME" },
    encoreEn:     { zh: "JOIN US", en: "JOIN US" },
    encoreTitle:  { zh: "加入我们", en: "Join Us" },
    encoreSub:    { zh: "出于对作品纯粹的热爱，我们正在寻找志同道合的创作者", en: "Out of pure love for the work, we are looking for like-minded creators" },
    rWhatTitle:   { zh: "DreamEupho 是什么", en: "What is DreamEupho" },
    rJoinTitle:   { zh: "加入 DreamEupho", en: "Join DreamEupho" },
    rJoinText:    { zh: "出于对作品纯粹的热爱，我们正在寻找志同道合的创作者加入我们的开发管线。本文档长期更新，具体招募岗位会随项目进度动态调整。如果你愿意用技能或热爱参与这项企划，欢迎随时提交申请！",
                   en: "Out of pure love for the work, we are looking for like-minded creators to join our development pipeline. This document is updated on an ongoing basis; open positions are adjusted dynamically as the project progresses. If you are willing to contribute your skills or passion, we welcome your application at any time!" },
    rTip:         { zh: "以下岗位要求主要用于帮助应聘者了解工作内容，并非必须全部满足。如暂时缺少完整项目经验，但具备相关基础、作品或持续参与项目的意愿，也欢迎报名沟通。部分岗位根据个人能力拆分工作，不要求一人承担全部内容。",
                   en: "The following requirements are mainly to help applicants understand the scope of each role—you are not expected to satisfy every single one. If you lack full project experience but have relevant foundations, samples or a willingness to commit, we welcome you to reach out. Some roles can be split by skill area; no one is expected to cover everything alone." },
    rContact:     { zh: "联系方式", en: "Contact" },
    rJobs:        { zh: "项目成员招募岗位", en: "Open Positions" },
    rJobsDesc:    { zh: "以下岗位要求主要用于帮助应聘者了解工作内容，并非必须全部满足。", en: "The following requirements are meant to help applicants understand the work—not all of them are mandatory." },
    ctaBottomTitle: { zh: "准备好一起吹响了吗？", en: "Ready to sound off together?" },
    ctaBottomBtn: { zh: "通过 QQ 联系我们", en: "CONTACT US ON QQ" },
    jobsDuty:     { zh: "岗位职责", en: "Responsibilities" },
    jobsReq:      { zh: "任职要求", en: "Requirements" }
  };

  /* ---------- 制作成员 ---------- */
  var credits = {
    core: [
      { role: "Project Leader", roleZh: "项目负责人", name: "苏昂", note: "♪" },
      { role: "Director & Staging", roleZh: "导演 · 演出", name: "赛博吟游诗人42", note: "♫" },
      { role: "Production Coordinator", roleZh: "制作统筹", name: "谐波回响", note: "♩" },
      { role: "Project Manager", roleZh: "项目管理", name: "WG华", note: "♬" }
    ],
    groups: [
      { en: "Scenario", zh: "剧本", list: [
        ["Lead Author", "FoffeR、赛博吟游诗人42"],
        ["Script Writer", "FoffeR、SakaHaya、崎岖山翁、梳风、陶守谦、芷璃破碎、V、Sword"],
        ["Consultant", "再睡五分钟、悠久风、WonderKindom、MT德意松、当代闲人、AFlutter"]
      ] },
      { en: "Voice Acting", zh: "配音", list: [
        ["Voice Director", "予薇Werin"],
        ["Voice Cast", "予薇Werin、绵绵雪芙蕾Candy、花君困、希夜_lily桑、Sakura樱酱、宫羽铃奈、苏以沫、墨白、言名海"]
      ] },
      { en: "Art", zh: "美术", list: [
        ["2D Art", "牧野双实、绝赞双厨狂悲制作人、镜月、不笑憮、画鸽毛仙、摆烂画画人寻缘、Hasema、夏樱、盘常、洛桤Lochi、不知名魔法师、未来降雨十万年、深海西兰花、Acesul、萨摩耶、苏昂、是tytyty、SakaHaya、赛博吟游诗人42、ひびつつz、玉面狼、琼林也、燰薪、噜啦嘞、赵雨眠、啓keisuke、優花雫、丸"],
        ["3D (Backgrounds)", "路人甲、蓝山、是水桶啊、赛博吟游诗人42、立水寒若青、化树、小柳、玄翼捭羽、白开水味咖啡、ひびつつz、AOSHIBA、zxy、养猫的艺术家 (T菌)、慕可muk、Zixi lrena"],
        ["Graphic Design", "RamuNeon、五块钱的洗衣机、玻璃鼎、麦兜、江畔何人初见Yue、余默、易安、Sing、野生黄白猫"],
        ["Compositing", "波亚燐、咸鱼"]
      ] },
      { en: "Programming", zh: "程序", list: [
        ["Programming", "闪达、烫烫烫Tang_YM、早八时睡觉的你、莉莉、章鱼维克、FractalD471、牙白です、明溪、晓陆sylph、ART0189"]
      ] },
      { en: "Music", zh: "音乐", list: [
        ["Composer / Arranger", "夜星兰、Explorer010、hanahanayoww、Triple-LLL、AlvinString芝玄、一坨狗、Kazimierz、花卷Jwyan、梨落(Liraku)、贺音奏、空白ダスト、atomo、嘤联邦邦主、PianoByDefault、言、泠音ryoune"],
        ["Performing Musicians", "euphonium丝瓜、Jackson-Kylin、四槌侠、贺音奏、冷梦梦梦梦、APiccolo、たかし"]
      ] },
      { en: "Others", zh: "其他", list: [
        ["Translation", "崎岖山翁"],
        ["Production Support", "Rikka、水明水明、ageless、镜花、晓陆sylph、阿瑾"],
        ["PR", "皮卡丘不是竹鼠、少校炭、鹿目lumu、铠冢霙视野狭隘、euphony、贺喜保护协会、神尾轻摇观铃响、玄、Noruneru"]
      ] }
    ],
    thanks: "京阿尼语料组、北宇治婚礼部、坏心思的蓝女巫童话社、ReMujica复权乐章、余怀仁、被炒的炒饭、吉川优子official、我也是伞厨、Zero-sum零和、北宇治字幕组、西冰库神学院、OnesetEuph、帆前、toto、Καντακουζηνός、瑞乐乐器、DX、唐雲范（已故）、孙烨文、和泉Ciao、星辰与弦、Error伊洛"
  };

  /* ---------- 招募页 ---------- */
  var recruit = {
    what: [
      { icon: "♩", title: "组织模式", titleEn: "Organization", text: "非营利的线上同人协作模式。" },
      { icon: "♫", title: "团队架构", titleEn: "Structure", text: "团队以常驻核心管理层为中枢，按成员技能下设多个专业执行组以推进生产。" },
      { icon: "♪", title: "生产方式", titleEn: "Production", text: "采用按技能分组的管理架构和效仿商业团队的工业化流水线，通过严格的创作规范与多重审核机制来应对人员流动问题并保障游戏项目产出。" }
    ],
    contact: [
      { title: "QQ 群", titleEn: "QQ Group", value: "1022882012", extra: "玩家群 1029729353", href: null },
      { title: "Email", titleEn: "Email", value: "dreameupho@163.com", extra: "", href: "mailto:dreameupho@163.com" },
      { title: "Discord", titleEn: "Discord", value: "dreameupho_studio", extra: "公告频道 discord.gg/eeGYKxgxV", href: "https://discord.gg/eeGYKxgxV" },
      { title: "bilibili", titleEn: "Bilibili", value: "@DreamEupho梦想悠风", extra: "space.bilibili.com/1309393596", href: "https://space.bilibili.com/1309393596" },
      { title: "招募文档", titleEn: "Recruit Doc", value: "金山文档 · 加入 DreamEupho", extra: "kdocs.cn", href: "https://www.kdocs.cn/l/crxRGMsrjl34" }
    ],
    jobs: [
      {
        index: "01", title: "剧本创作", titleEn: "Scenario Writing",
        posts: [
          {
            name: "剧本写手",
            duties: [
              "负责将故事细纲转化为具体的游戏剧本。",
              "与剧本组成员沟通剧情、角色表现及文本方向。",
              "根据讨论或审核意见，对剧本内容进行修改和完善。",
              "在符合项目整体方向的基础上，为剧情提供新的想法。"
            ],
            requirements: [
              "对视觉小说、Galgame 或其他剧情类游戏的文本表现方式有一定了解。",
              "能够根据项目需要，适当调整写作风格和角色语言。",
              "具备基本的文字表达能力，对动画或原作小说有一定兴趣。",
              "了解《吹响吧！上低音号》原作小说或动画剧情，熟悉程度较高者优先。",
              "报名时可提交与《吹响吧！上低音号》系列相关的同人小说、剧本、角色分析或剧情分析文章。已有作品和新创作作品均可，字数不限。",
              "也可提交《莉兹与青鸟》相关的同人作品或分析文章。",
              "暂时没有完整作品，但能够提供短篇试写或片段作品者，也可以报名。"
            ]
          }
        ]
      },
      {
        index: "02", title: "美术与视觉设计", titleEn: "Art & Visual Design",
        posts: [
          {
            name: "二维美术",
            intro: "应聘者能够承担角色立绘、事件 CG、线稿、上色或其他二维美术工作中的任意一个方向即可。",
            duties: [
              "参与角色立绘、事件 CG 或其他二维美术内容的绘制。",
              "根据个人擅长方向，承担草图、线稿、上色、细化或修正等工作。",
              "配合美术组调整画面，使作品整体风格尽量保持统一。"
            ],
            requirements: [
              "具备一定的人体造型、角色绘制或插画基础。",
              "对赛璐珞画风有一定了解，能够进行线稿或上色工作。",
              "了解 Galgame 类游戏角色立绘或事件 CG 的画面表现特点。",
              "具备一定的构图能力，能够完成角色插图或多人画面。",
              "暂时缺少大型插图经验，但能够稳定完成自己擅长的绘制环节。",
              "能够提供个人插画、练习作品或其他能够体现绘画能力的作品。"
            ]
          },
          {
            name: "3D 美术",
            intro: "应聘者能够承担以下任意一个制作方向即可，不要求同时掌握建模、贴图、场景、人物、动画和渲染等全部流程。",
            duties: [
              "根据实物图片或参考资料，制作乐器等物品的三维模型。",
              "制作静态或动态三维场景，为场景设计及游戏画面提供参考。",
              "制作人物模型，为二维绘制、动画或其他内容提供辅助。",
              "参与模型优化、贴图制作、场景搭建、风格化渲染或三维动画等工作。"
            ],
            requirements: [
              "了解 Blender、Maya、3ds Max 等任意一种多边形建模软件。",
              "了解 Rhino、Plasticity 等任意一种 NURBS 建模软件。",
              "具备物品、乐器、人物或场景建模经验。",
              "了解人物雕刻、拓扑、绑定或动画流程中的任意一个环节。",
              "能够使用已有资源进行场景搭建，或愿意学习场景制作。",
              "了解 Blender、Unreal Engine 或 Unity 中的基础场景渲染流程。",
              "能够使用 Substance 3D Painter 或其他软件制作基础贴图。",
              "对风格化渲染感兴趣，并愿意根据项目已有方案进行尝试。",
              "从事三维动画制作的软件不限，Maya、Blender、UE5 等均可。",
              "能够提供模型、场景、动画、渲染练习或其他相关作品。"
            ]
          },
          {
            name: "技术美术（TA）",
            intro: "应聘者能够承担 Blender 三渲二 Shader 制作、渲染优化或 Unity 技术协助中的任意一个方向即可，不要求全部掌握。",
            duties: [
              "协助 3D 美术制作和调整 Blender 内的三渲二材质、描边及光影效果。",
              "优化材质、灯光和渲染设置，排查常见的显示或性能问题。",
              "根据项目需要制作简单的节点组、脚本或辅助工具。",
              "协助模型、材质等 3D 资源接入 Unity，并处理相关技术问题。"
            ],
            requirements: [
              "熟悉 Blender 材质节点或风格化渲染流程。",
              "能够制作或调整基础的三渲二 Shader 效果。",
              "具备 Blender 场景、材质或渲染优化经验。",
              "了解 Unity 材质、Shader Graph 或资源导入流程。",
              "了解 Blender Python、HLSL 或其他相关技术者优先。",
              "能够提供 Shader、渲染、工具或 Unity 相关作品或练习。"
            ]
          },
          {
            name: "场景设计",
            duties: [
              "参与游戏场景的设计和绘制。",
              "根据剧情、现实照片、三维模型或 AI 参考图完成场景画面。",
              "配合其他美术成员调整场景的色彩、光影和整体氛围。",
              "在个人能力范围内，保证场景风格与项目整体方向协调。"
            ],
            requirements: [
              "具备一定的背景、建筑、室内或自然场景绘制基础。",
              "对 Galgame 类游戏的场景画面有一定了解。",
              "了解《吹响吧！上低音号》的场景表现或动画美术风格。",
              "能够参考照片、三维模型或其他素材进行场景绘制。",
              "暂时缺少完整场景作品，但具备一定透视、构图或光影基础。",
              "能够提供场景绘画、背景练习或其他相关作品。"
            ]
          },
          {
            name: "动画摄影与后期合成",
            intro: "应聘者能够承担素材合成、画面调色、光影处理、粒子特效或其他后期工作中的任意一个方向即可。",
            duties: [
              "将人物原画、背景、二维素材及三维乐器等内容进行后期合成。",
              "根据画面需要进行调色、打光、景深、粒子或其他视觉效果处理。",
              "配合美术组调整画面氛围，使不同来源的素材能够自然结合。",
              "根据个人能力参与静态画面处理或简单动态效果制作。"
            ],
            requirements: [
              "会使用 After Effects 或其他能够完成合成、调色工作的软件。",
              "具备基础的画面合成、光影处理或调色能力。",
              "对动画摄影或二次元画面的后期表现有一定了解。",
              "了解《吹响吧！上低音号》的动画摄影风格者优先。",
              "能够根据参考画面调整整体氛围，并愿意在项目中继续学习。",
              "能够提供合成、调色、特效或相关练习作品。"
            ]
          },
          {
            name: "UI 设计",
            intro: "应聘者能够承担界面设计、UI 素材绘制、界面排版或视觉优化中的任意一个方向即可。",
            duties: [
              "参与游戏菜单、对话框、选项按钮等界面的视觉设计。",
              "根据项目需求制作或优化 UI 素材。",
              "协助调整界面的信息层级、排版和整体视觉风格。",
              "配合程序人员处理 UI 素材的实际使用问题。"
            ],
            requirements: [
              "具备一定的 UI 设计、平面设计或界面排版基础。",
              "会使用 Photoshop、Figma 或其他相关设计工具。",
              "对视觉小说或 Galgame 的 UI 界面有一定了解。",
              "能够根据已有视觉规范制作或修改 UI 素材。",
              "暂时没有正式项目经验，但能够提供个人设计、临摹或练习案例。"
            ]
          },
          {
            name: "平面设计与综合美术",
            intro: "应聘者能够承担宣传图、图标、素材整理、简单动态效果或其他综合美术工作中的任意一个方向即可。",
            duties: [
              "协助原画、UI 及 3D 团队完成不同类型的美术需求。",
              "参与宣传图、图标、排版、动态视觉效果等内容的制作。",
              "协助整理美术资源，保持项目整体视觉风格协调。",
              "根据个人能力参与动态光影、粒子效果或特殊场景的细节优化。"
            ],
            requirements: [
              "具备一定的平面设计、插画、排版或动态视觉制作能力。",
              "对二次元视觉风格有一定了解。",
              "能够配合其他美术成员完成素材调整和整合工作。",
              "具备良好的沟通能力，愿意参与跨方向协作。",
              "有《吹响吧！上低音号》或其他同人项目经验者优先，但不作为硬性要求。",
              "能够提供个人设计、宣传图、排版或其他相关作品。"
            ]
          }
        ]
      },
      {
        index: "03", title: "配音与语音制作", titleEn: "Voice Acting & Audio",
        posts: [
          {
            name: "配音导演",
            intro: "应聘者能够承担配音统筹、角色表演指导、录音审核或与剧本组沟通等工作中的任意一个方向即可。",
            duties: [
              "与剧本组沟通，理解剧情内容、角色设定及情绪方向。",
              "协助确定项目整体配音风格。",
              "根据个人经验对配音演员的表演提出调整建议。",
              "协助审核录音内容，并与音频后期人员沟通。",
              "参与配音安排、文件整理或其他相关统筹工作。"
            ],
            requirements: [
              "对角色配音和声音表演具有一定审美。",
              "具备配音、广播剧、音频剧或其他声音项目经验。",
              "了解基础的录音、表演指导或音频制作流程。",
              "能够清楚表达角色的情绪、语气和表演要求。",
              "有日系 Galgame 配音经验者优先，但不作为硬性要求。",
              "暂时没有导演经验，但有较丰富的配音参与经验或角色分析能力，也可以报名。"
            ]
          },
          {
            name: "中文配音演员",
            duties: [
              "负责录制游戏中的角色语音。",
              "根据个人声线和项目安排，负责一个或多个角色。",
              "根据配音导演或制作组的意见调整语气、情绪和表演方式。",
              "在条件允许的情况下，对需要修改的语音进行补录。"
            ],
            requirements: [
              "具备基本的普通话表达能力和角色表演能力。",
              "对配音感兴趣，并愿意根据指导进行调整。",
              "了解《吹响吧！上低音号》的作品内容或角色特点者优先。",
              "拥有能够完成基础录音的设备和相对安静的录音环境。",
              "有配音经验者优先，但没有正式项目经验也可以提交试音。",
              "能够尝试不同角色声线或一人饰演多个角色者优先。"
            ]
          },
          {
            name: "AI 语音制作",
            intro: "应聘者能够承担语音生成、模型训练、语音调试或后期处理中的任意一个方向即可。",
            duties: [
              "使用 AI 语音合成工具制作角色的中文或日语语音。",
              "根据角色特点调整音色、情绪、语速及表达方式。",
              "对生成语音中的发音、停顿及情绪问题进行修正。",
              "配合剧本、配音及音频团队优化最终语音效果。"
            ],
            requirements: [
              "使用过 AI 语音合成、语音转换或相关工具。",
              "了解角色模型、LoRA 模型或相关模型训练流程。",
              "具备一定的语音编辑或音频后期能力。",
              "具备基础日语能力者优先，但不作为硬性要求。",
              "对 AI 语音表现和角色声音还原有兴趣，并愿意进行测试和调整。",
              "能够提供 AI 语音、模型训练或其他相关示例。"
            ]
          }
        ]
      },
      {
        index: "04", title: "音乐、音频与音效制作", titleEn: "Music, Audio & SFX",
        posts: [
          {
            name: "音乐制作人",
            intro: "应聘者能够承担原创配乐、改编、编曲、音乐整理或场景音乐设计中的任意一个方向即可。",
            duties: [
              "根据剧情和场景需求制作原创配乐或改编音乐。",
              "协助整理、调整或整合项目中使用的音乐素材。",
              "与剧本及演出人员沟通，确定音乐的情绪和使用方式。",
              "根据个人能力参与管乐编曲、场景配乐或其他音乐制作工作。"
            ],
            requirements: [
              "具备基础作曲、编曲或音乐制作能力。",
              "会使用任意一款数字音频工作站软件。",
              "对 Galgame、视觉小说或动画原声音乐的风格有一定了解。",
              "熟悉管乐编曲者优先，但不作为硬性要求。",
              "能够提供原创、改编、编曲练习或其他音乐作品。",
              "暂时缺少完整 OST 制作经验，但能够独立完成部分曲目或制作环节。"
            ]
          },
          {
            name: "游戏音效设计",
            intro: "应聘者能够承担环境音效、界面音效、拟音、音效编辑或 Wwise 配置中的任意一个方向即可。",
            duties: [
              "参与游戏内环境音、交互音效和剧情音效的制作。",
              "与剧本组和演出组沟通，确认场景需要使用的声音。",
              "根据个人能力进行音效设计、素材编辑或拟音工作。",
              "在具备相关经验的情况下，使用 Wwise 进行音效配置和调试。"
            ],
            requirements: [
              "会使用任意一款数字音频工作站软件。",
              "能够进行基础的音效剪辑、处理或素材整理。",
              "对环境音、拟音或游戏声音设计感兴趣。",
              "具备独立游戏、视频、广播剧或其他音效制作经验者优先。",
              "熟悉 Unity 或 Wwise 者优先，但不作为硬性要求。",
              "能够提供音效、拟音、声音设计或相关练习作品。"
            ]
          },
          {
            name: "音频编辑（人声处理方向）",
            intro: "应聘者能够承担录音审核、语音剪辑、降噪、修音或音色统一中的任意一个方向即可。",
            duties: [
              "参与游戏角色语音的整理和编辑。",
              "协助审核配音演员提交的录音文件。",
              "根据个人能力进行降噪、剪辑、修音或音量调整。",
              "尽量减少不同录音设备和录音环境造成的听感差异。",
              "配合配音导演及其他音频成员统一语音风格。"
            ],
            requirements: [
              "会使用任意一款数字音频工作站软件。",
              "能够完成基础的语音剪辑、降噪或音量调整。",
              "了解麦克风差异、录音环境或声场处理的基本概念。",
              "具备一定的音频审美，能够判断明显的录音问题。",
              "有游戏语音、广播剧、配音或其他人声编辑经验者优先。",
              "暂时无法独立完成全部人声处理流程，但能够承担其中部分环节。"
            ]
          },
          {
            name: "混音",
            intro: "应聘者能够承担音乐、语音、音效平衡或场景混音中的任意一个方向即可。",
            duties: [
              "参与游戏音乐、语音和音效的混音工作。",
              "调整不同声音素材的音量、频率和空间关系。",
              "协助统一不同场景及不同音频素材的整体听感。",
              "根据个人能力参与音乐混音、场景混音或最终检查。"
            ],
            requirements: [
              "会使用任意一款数字音频工作站软件。",
              "具备基础的均衡、压缩、混响或响度处理经验。",
              "能够完成音乐、语音或音效中的任意一种混音工作。",
              "具备一定的音频审美和问题判断能力。",
              "有交响乐、管弦乐或大型编制音乐混音经验者优先，但不作为硬性要求。",
              "能够提供混音作品、练习工程或前后对比示例。"
            ]
          },
          {
            name: "母带制作",
            duties: [
              "参与项目音乐及相关音频内容的最终处理。",
              "对音频的响度、动态、频率及整体听感进行调整。",
              "协助统一不同配乐之间的音量和声音风格。",
              "根据发布或游戏内使用需求，输出相应格式的音频文件。"
            ],
            requirements: [
              "会使用任意一款数字音频工作站软件。",
              "了解基础的响度、动态、均衡或限制器处理。",
              "具备音乐混音、母带或音频最终输出经验。",
              "具备一定的音频审美和质量判断能力。",
              "有 OST、专辑或其他音乐母带经验者优先，但不作为硬性要求。",
              "能够提供母带作品、练习项目或处理前后的对比示例。"
            ]
          }
        ]
      },
      {
        index: "05", title: "游戏开发", titleEn: "Game Development",
        posts: [
          {
            name: "Unity 开发",
            intro: "应聘者能够承担功能界面、剧情系统、小游戏、音频接入或其他 Unity 开发工作中的任意一个方向即可。",
            duties: [
              "使用 Unity 参与游戏功能及交互界面的开发。",
              "根据个人能力制作手机聊天界面、菜单或其他功能性界面。",
              "参与音游小游戏或其他互动内容的开发。",
              "配合剧本、美术和音频成员完成素材接入。",
              "根据测试反馈修复问题并进行基础优化。"
            ],
            requirements: [
              "了解 C# 及 Unity 的基础开发流程。",
              "能够制作基础界面、交互功能或简单游戏系统。",
              "具备 Unity 个人项目、课程项目或 Game Jam 经验。",
              "有视觉小说或 Galgame 开发经验者优先。",
              "有音乐游戏或节奏游戏开发经验者优先。",
              "暂时缺少完整项目经验，但能够提供代码、演示项目或功能案例。",
              "愿意与策划、美术和音频成员沟通，并根据项目需求调整功能。"
            ]
          }
        ]
      },
      {
        index: "06", title: "宣传与内容运营", titleEn: "PR & Content Operations",
        posts: [
          {
            name: "社区运营",
            intro: "应聘者能够承担内容发布、文案撰写、评论维护、活动策划或素材整理中的任意一个方向即可。",
            duties: [
              "参与哔哩哔哩、微博等社交平台的运营工作。",
              "负责或协助发布项目动态、图片和视频内容。",
              "根据个人能力参与活动策划、文案撰写或评论区维护。",
              "协助整理玩家反馈及社区讨论内容。",
              "配合其他成员维护项目对外形象。"
            ],
            requirements: [
              "了解哔哩哔哩、微博或其他社交平台的基本内容形式。",
              "具备一定的文案、内容编辑或沟通能力。",
              "能够按照项目安排持续更新和整理内容。",
              "有账号运营、社团宣传或同人项目经验者优先。",
              "熟悉二次元、同人或游戏社区者优先。",
              "暂时缺少正式运营经验，但愿意学习平台规则和内容制作流程。"
            ]
          },
          {
            name: "视频制作",
            intro: "应聘者能够承担剪辑、包装、动态设计、字幕制作或素材整理中的任意一个方向即可。",
            duties: [
              "参与项目宣传视频及游戏内视频的制作。",
              "根据个人能力承担剪辑、字幕、包装、特效或动态设计工作。",
              "根据反馈调整视频节奏、画面内容和视觉效果。",
              "配合美术、音频和宣传成员整理并使用相关素材。"
            ],
            requirements: [
              "会使用 After Effects、Premiere Pro 或其他视频制作软件。",
              "具备基础的视频剪辑、字幕或画面包装能力。",
              "能够根据参考和修改意见调整视频内容。",
              "具备动态设计、后期特效或宣传片制作经验者优先。",
              "暂时没有正式项目经验，但能够提供个人视频、练习作品或剪辑案例。"
            ]
          }
        ]
      },
      {
        index: "07", title: "翻译与校对", titleEn: "Translation & Proofreading",
        posts: [
          {
            name: "翻译与校对",
            intro: "应聘者能够承担游戏文本（以日、英为主）的翻译或校对工作。",
            duties: [
              "参与游戏文本对应语言（日、英、俄、法、德、葡、西（含拉美）、韩、意、波）的翻译、校对、润色与术语统一。",
              "对对应语言（除日语）的 AI 机翻初稿进行译后编辑与校对，确保译文准确、自然、符合游戏语境。"
            ],
            requirements: [
              "能使用中文完成 800 字任意体裁作文，文笔通顺，熟悉中文网络语境。（必须）",
              "日语翻校：能独立阅读日文新闻、轻小说；熟悉并能使用日语模仿日式轻小说文风、有翻译经验者优先；对中译日有浓厚兴趣者可适当放宽要求。",
              "英语翻校：能阅读英文游戏、小说，理解英文网络文化；能模仿并还原英文游戏台词、剧情风格者优先。",
              "其他语言：能简单阅读该语言内容，能完成基于机翻的校对与润色；有相关语言地区生活、留学经历者优先。"
            ]
          }
        ]
      }
    ]
  };

  /* ---------- 内联数据包 ---------- */
  var inlineData = {
    characters: characters,
    news: news,
    i18n: i18n,
    ui: ui,
    credits: credits,
    recruit: recruit
  };

  /* ---------- 数据入口 ---------- */
  var cache = null;

  function getData() {
    return new Promise(function (resolve) {
      if (cache) { resolve(cache); return; }
      /* file:// 协议下无法 fetch，直接使用内联数据 */
      if (location.protocol === "file:") {
        cache = inlineData;
        resolve(cache);
        return;
      }
      var files = [
        fetch("data/characters.json").then(function (r) { return r.json(); }),
        fetch("data/news.json").then(function (r) { return r.json(); }),
        fetch("data/i18n.json").then(function (r) { return r.json(); })
      ];
      Promise.all(files).then(function (res) {
        cache = {
          characters: res[0].characters || res[0],
          news: res[1],
          i18n: res[2],
          ui: inlineData.ui,
          credits: inlineData.credits,
          recruit: inlineData.recruit
        };
        resolve(cache);
      }).catch(function () {
        /* 请求失败回退内联数据 */
        cache = inlineData;
        resolve(cache);
      });
    });
  }

  global.DE_DATA = inlineData;
  global.getData = getData;
})(window);
