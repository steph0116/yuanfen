(function () {
  'use strict';

  // ===== 基础常量 =====
  var STEM = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCH = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var STEM_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  var BRANCH_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  var ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  var WX = ['金', '木', '水', '火', '土'];

  var NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土',
    '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火',
    '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水',
    '沙中土', '天上火', '石榴木', '大海水'];

  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

  // 合冲害刑
  var LIUHE = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  var SANHE = { 8: [0, 4], 0: [8, 4], 4: [8, 0], 2: [6, 10], 6: [2, 10], 10: [2, 6], 5: [9, 1], 9: [5, 1], 1: [5, 9], 11: [3, 7], 3: [11, 7], 7: [11, 3] };
  var LIUCHONG = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 };
  var LIUHAI = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
  var TIANHE = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 }; // 天干五合

  // 评分文案（通俗版标题）
  var TITLES = [
    { min: 90, name: '天作之合' }, { min: 82, name: '情深意重' }, { min: 74, name: '情投意合' },
    { min: 66, name: '缘来是你' }, { min: 0, name: '细水长流' }
  ];
  var TAG_POOL = ['互相成就', '灵魂共鸣', '互补型', '欢喜冤家', '温柔以待', '双向奔赴', '日久生情', '一见如故', '踏实安心', '势均力敌'];

  // ===== 工具 =====
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h;
  }
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

  function parseDate(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }

  // ===== 干支计算 =====
  function dayPillar(y, m, d) {
    var a = Date.UTC(1949, 9, 1);
    var b = Date.UTC(y, m - 1, d);
    var days = Math.round((b - a) / 86400000);
    var idx = ((days % 60) + 60) % 60;
    return { stem: idx % 10, branch: idx % 12, idx: idx, gz: STEM[idx % 10] + BRANCH[idx % 12] };
  }

  function yearPillar(y, m, d) {
    var gy = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y; // 立春前算上一年
    var stem = ((gy - 4) % 10 + 10) % 10;
    var branch = ((gy - 4) % 12 + 12) % 12;
    return { stem: stem, branch: branch, gz: STEM[stem] + BRANCH[branch], gy: gy };
  }

  function solarMonthIndex(m, d) {
    var key = m * 100 + d;
    if (key >= 1207) return 10;  // 大雪 -> 子
    if (key >= 1107) return 9;   // 立冬 -> 亥
    if (key >= 1008) return 8;   // 寒露 -> 戌
    if (key >= 908) return 7;    // 白露 -> 酉
    if (key >= 808) return 6;    // 立秋 -> 申
    if (key >= 707) return 5;    // 小暑 -> 未
    if (key >= 606) return 4;    // 芒种 -> 午
    if (key >= 506) return 3;    // 立夏 -> 巳
    if (key >= 405) return 2;    // 清明 -> 辰
    if (key >= 306) return 1;    // 惊蛰 -> 卯
    if (key >= 204) return 0;    // 立春 -> 寅
    if (key >= 106) return 11;   // 小寒 -> 丑
    return 10;                    // 子
  }

  function gzIndex(stem, branch) {
    for (var t = 0; t < 6; t++) { var idx = stem + 10 * t; if (idx % 12 === branch) return idx; }
    return 0;
  }
  function nayin(stem, branch) { return NAYIN[Math.floor(gzIndex(stem, branch) / 2)]; }

  function hourPillar(dayStem, hourBranch) {
    if (hourBranch < 0) return null;
    var zi = (dayStem % 5) * 2;
    var stem = (zi + hourBranch) % 10;
    return { stem: stem, branch: hourBranch, gz: STEM[stem] + BRANCH[hourBranch] };
  }

  function baziOf(birthStr, hourBranch) {
    var d = parseDate(birthStr);
    var yp = yearPillar(d.y, d.m, d.d);
    var smi = solarMonthIndex(d.m, d.d);
    var monthStem = (yp.stem * 2 + 2 + smi) % 10;
    var monthBranch = (smi + 2) % 12;
    var dp = dayPillar(d.y, d.m, d.d);
    var hp = hourPillar(dp.stem, hourBranch);
    return {
      year: { stem: yp.stem, branch: yp.branch, gz: yp.gz, nayin: nayin(yp.stem, yp.branch) },
      month: { stem: monthStem, branch: monthBranch, gz: STEM[monthStem] + BRANCH[monthBranch], nayin: nayin(monthStem, monthBranch) },
      day: { stem: dp.stem, branch: dp.branch, gz: dp.gz, nayin: nayin(dp.stem, dp.branch) },
      hour: hp ? { stem: hp.stem, branch: hp.branch, gz: hp.gz, nayin: nayin(hp.stem, hp.branch) } : null,
      birthYear: d.y, zodiac: ZODIAC[yp.branch], zodiacBranch: yp.branch
    };
  }

  function pillarsOf(bz) { var r = [bz.year, bz.month, bz.day]; if (bz.hour) r.push(bz.hour); return r; }

  function wuxingOf(bz) {
    var cnt = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    pillarsOf(bz).forEach(function (p) {
      cnt[STEM_WX[p.stem]]++;
      cnt[BRANCH_WX[p.branch]]++;
    });
    return cnt;
  }

  // 十神
  function tenGod(dayStem, otherStem) {
    var dw = STEM_WX[dayStem], ow = STEM_WX[otherStem];
    var same = (dayStem % 2) === (otherStem % 2);
    if (ow === dw) return same ? '比肩' : '劫财';
    if (SHENG[ow] === dw) return same ? '偏印' : '正印';
    if (SHENG[dw] === ow) return same ? '食神' : '伤官';
    if (KE[ow] === dw) return same ? '偏官' : '正官';
    if (KE[dw] === ow) return same ? '偏财' : '正财';
    return '';
  }

  // ===== 合婚规则 =====
  function zodiacRelation(a, b) {
    if (LIUHE[a] === b) return { type: '六合', score: 10, good: true, txt: '生肖六合，天生一对' };
    if (SANHE[a] && SANHE[a].indexOf(b) >= 0) return { type: '三合', score: 6, good: true, txt: '生肖三合，互相助益' };
    if (LIUCHONG[a] === b) return { type: '六冲', score: -8, good: false, txt: '生肖相冲，需要磨合' };
    if (LIUHAI[a] === b) return { type: '六害', score: -6, good: false, txt: '生肖相害，易生误会' };
    if (a === b) return { type: '同属相', score: 3, good: true, txt: '同属相，脾性相投' };
    return { type: '平和', score: 0, good: null, txt: '生肖无冲无合，平稳发展' };
  }

  function analyze(a, b, aBz, bBz, aWx, bWx, rng) {
    var s = 70, notes = [], highlights = [];

    var zr = zodiacRelation(aBz.zodiacBranch, bBz.zodiacBranch);
    s += zr.score;
    if (zr.score) notes.push(zr.txt);

    // 日干五合
    if (TIANHE[aBz.day.stem] === bBz.day.stem) { s += 8; notes.push('日主天干五合，情投意合'); highlights.push('日主相合'); }

    // 日支（配偶宫）
    var da = aBz.day.branch, db = bBz.day.branch;
    if (LIUHE[da] === db) { s += 6; notes.push('日支六合，婚姻宫相合'); highlights.push('配偶宫相合'); }
    else if (LIUCHONG[da] === db) { s -= 6; notes.push('日支相冲，婚姻宫需经营'); }

    // 五行互补
    var comp = [];
    WX.forEach(function (x) {
      if ((aWx[x] >= 2 && bWx[x] === 0) || (bWx[x] >= 2 && aWx[x] === 0)) comp.push(x);
    });
    s += comp.length * 4;
    if (comp.length) { notes.push('五行互补（' + comp.join('、') + '）'); highlights.push('五行互补'); }

    // 确定性抖动
    s += Math.floor(rng() * 7) - 3;
    s = clamp(s, 45, 98);

    return { score: s, zr: zr, notes: notes, highlights: highlights, comp: comp };
  }

  function scoreTitle(score) {
    for (var i = 0; i < TITLES.length; i++) if (score >= TITLES[i].min) return TITLES[i].name;
    return TITLES[TITLES.length - 1].name;
  }

  // ===== 文案生成 =====
  function wuxingSummary(name, wx, rng) {
    var strong = [], weak = [];
    WX.forEach(function (x) { if (wx[x] >= 2) strong.push(x); if (wx[x] === 0) weak.push(x); });
    var s = strong.length ? strong.join('、') : '均衡';
    var w = weak.length ? weak.join('、') : '无';
    var line = '五行以' + s + '偏旺';
    if (weak.length) line += '，缺' + w;
    line += '。';
    var sug = weak.length ? '宜补' + weak.join('、') + '，' : '';
    return line + (sug ? ' 相处中可多借对方之力中和。' : ' 五行较均衡，气机顺畅。');
  }

  function yunshiPhases(a, b, ctx) {
    var rng = ctx.rng;
    // 逐年（详细）+ 十年段（笼统），按真实年份与双方年龄
    var GOOD = [
      '{y}年你们的事业运走高，你{a}岁、TA{b}岁，都处在发力期，彼此托一把，升职、副业都有实打实的机会。',
      '{y}年是适合把关系往前推的一年，你{a}岁、TA{b}岁，心智和条件都到位了，谈婚论嫁会格外顺。',
      '{y}年家宅和顺，长辈那边也省心，你{a}岁、TA{b}岁，正是见家长、定大事的好时候。',
      '{y}年两人身体状态都在线，你{a}岁、TA{b}岁，精力正旺，同心去做什么都事半功倍。',
      '{y}年财运在线，你{a}岁、TA{b}岁，正是攒得住、能置业的阶段，适合一起定下第一笔共同目标。'
    ];
    var MID = [
      '{y}年主打磨合，你{a}岁、TA{b}岁，事业家庭两头忙，感情要专门留时间经营，不然容易淡。',
      '{y}年容易各忙各的，你{a}岁、TA{b}岁，都在打拼期，聚少离多时更要主动报备，别让误会有空子。',
      '{y}年的小分歧多在钱和琐事上，你{a}岁、TA{b}岁，花钱观在慢慢靠近，账摊开说就顺。',
      '{y}年家里可能有不同声音，你{a}岁、TA{b}岁，要站成一条线，别让外人掺和进你们的事。',
      '{y}年不折腾，你{a}岁、TA{b}岁，平平稳稳把根基打牢，后面的路反而更宽。'
    ];
    var BAD = [
      '{y}年磨合偏深，你{a}岁、TA{b}岁，容易在原则问题上较劲，各退一步反而过得快。',
      '{y}年外部压力大，你{a}岁、TA{b}岁，工作家里的火气容易带回家，先分清是谁的事再解决。',
      '{y}年在钱上容易紧张，你{a}岁、TA{b}岁，开销对不齐，把账摊开比冷战强。',
      '{y}年聚少离多，你{a}岁、TA{b}岁，容易因为联系少而多想，多报备能省掉很多误会。',
      '{y}年家里阻力可能浮现，你{a}岁、TA{b}岁，要有耐心，用时间换理解。'
    ];
    // 十年段文案：按人生阶段，笼统，不逐年
    var DECADE_GOOD = [
      '这十年是事业与家庭的黄金期，两人都在往上走，日子越过越厚实。最难的磨合已经过去，往后主要是收获。',
      '这十年儿女逐渐独立，你们重新拥有彼此的时间，感情反而回到早年。把身体养好，日子会越过越轻松。',
      '这段晚年是真正一起看风景的日子，前半生攒下的默契在这里兑现。互相照应、少操闲心，就是最好的缘分。'
    ];
    var DECADE_MID = [
      '这十年重心在家庭与子女，上有老下有小，事情多、牵挂也多。感情靠分工和体谅，稳扎稳打就不怕。',
      '这十年是过渡期，孩子离巢、父母年迈，家里角色在变。多说说心里话，感情就不会被琐事冲淡。',
      '这段日子平淡而安稳，儿孙绕膝，但也要记得给彼此留一点空间。把日子过慢一点，感情自然长久。'
    ];
    var DECADE_BAD = [
      '这十年压力集中在钱和子女上，两人容易各执一词。矛盾是阶段性的，别在气头上做决定。',
      '这十年健康与养老的压力浮上来，两人容易因为焦虑而互相埋怨。先把身体顾好，其他都排后面。',
      '这段要格外注意身体和情绪，年岁大了，小病小痛会放大情绪。多陪伴、少计较，晚年的平静最珍贵。'
    ];
    function shuffled(arr) {
      var x = arr.slice();
      for (var i = x.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var t = x[i]; x[i] = x[j]; x[j] = t;
      }
      return x;
    }
    var good = shuffled(GOOD), mid = shuffled(MID), bad = shuffled(BAD);
    var nowYear = new Date().getFullYear();
    var aBirth = ctx.a.birthYear, bBirth = ctx.b.birthYear;
    var base = ctx.r.score;
    var phases = [];

    function verdict(offset, jit) {
      var v = base + offset + Math.floor(rng() * jit) - Math.floor(jit / 2);
      if (v >= 80) return { k: '顺', cls: 'good' };
      if (v >= 62) return { k: '平', cls: 'mid' };
      return { k: '滞', cls: 'bad' };
    }

    // 逐年：今年起 5 年，详细
    var yOffsets = [-8, -3, 2, 7, 12];
    for (var i = 0; i < 5; i++) {
      var y = nowYear + i;
      var ageA = y - aBirth, ageB = y - bBirth;
      var vd = verdict(yOffsets[i], 10);
      var txt = vd.k === '顺' ? good[i] : (vd.k === '平' ? mid[i] : bad[i]);
      txt = txt.replace(/\{y\}/g, y).replace(/\{a\}/g, ageA).replace(/\{b\}/g, ageB);
      phases.push({
        label: y + '年',
        ages: esc(a) + ' ' + ageA + '岁 · ' + esc(b) + ' ' + ageB + '岁',
        v: { k: vd.k, cls: vd.cls, txt: txt }
      });
    }

    // 十年段：+5~+14、+15~+24、+25 以后，笼统
    var dOffsets = [16, 22, 28];
    for (var d = 0; d < 3; d++) {
      var start = nowYear + 5 + d * 10;
      var end = start + 9;
      var ageA0 = start - aBirth, ageB0 = start - bBirth;
      var vd = verdict(dOffsets[d], 8);
      var dtxt = vd.k === '顺' ? DECADE_GOOD[d] : (vd.k === '平' ? DECADE_MID[d] : DECADE_BAD[d]);
      var label, ages;
      if (d < 2) {
        var ageA1 = end - aBirth, ageB1 = end - bBirth;
        label = start + '–' + end + '年';
        ages = esc(a) + ' ' + ageA0 + '–' + ageA1 + '岁 · ' + esc(b) + ' ' + ageB0 + '–' + ageB1 + '岁';
      } else {
        label = start + '年以后';
        ages = esc(a) + ' ' + ageA0 + '岁起 · ' + esc(b) + ' ' + ageB0 + '岁起';
      }
      phases.push({ label: label, ages: ages, v: { k: vd.k, cls: vd.cls, txt: dtxt } });
    }

    return phases;
  }

  var DETAIL_TPL = {
    感情: [
      '你们的感情以「{zr}」打底，{zrtxt}。日主{dayrel}，相处中一方主动、一方包容，节奏合拍。',
      '感情走向看日支（配偶宫），你们日支{ri}，代表婚姻里的互动{ritxt}。多点仪式感，温度会更高。'
    ],
    事业: [
      '你的五行{mywx}，事业上宜往{dir}方向发展；对方{otwx}，适合{dir2}类领域。两人事业可以互补，不必强求同路。',
      '合婚看事业运，你日主{myday}，做事{mygod}；对方{otday}，风格{otgod}。一个规划、一个执行，反而成事。'
    ],
    财运: [
      '你命局{mywx}，偏财{mycai}，正财靠积累；对方{otwx}，{otcai}。共同理财宜一个开源、一个节流。',
      '财为养命之源，你们日主五行{mywx}与{otwx}，{cai}。合财先合心，钱的问题说开就顺。'
    ],
    健康: [
      '你五行{mywx}，注意{myhealth}；对方{otwx}，留意{othealth}。彼此提醒，作息规律最养人。',
      '健康看五行平衡，你们{health}。饮食起居互相照顾，就是最好的开运。'
    ],
    子女: [
      '子女缘看时柱与食伤，你们{child}。家庭观念一致，育儿路上能互相补位。',
      '从合盘看，你们{child}。教育上你主宽、对方主严，配合得当是孩子的福气。'
    ]
  };

  var DIR = { 金: '西、金融、管理', 木: '东、教育、文创', 水: '北、传媒、流通', 火: '南、互联网、能源', 土: '本地、地产、服务' };
  var LUCKY = {
    金: { color: '白、金', dir: '西方', num: '4、9' },
    木: { color: '绿、青', dir: '东方', num: '3、8' },
    水: { color: '黑、蓝', dir: '北方', num: '1、6' },
    火: { color: '红、紫', dir: '南方', num: '2、7' },
    土: { color: '黄、棕', dir: '中央', num: '5、0' }
  };

  function buildDetail(a, b, ctx, rng) {
    var mywx = STEM_WX[ctx.a.day.stem], otwx = STEM_WX[ctx.b.day.stem];
    var god = tenGod(ctx.a.day.stem, ctx.b.day.stem);
    var god2 = tenGod(ctx.b.day.stem, ctx.a.day.stem);
    var ri = LIUHE[ctx.a.day.branch] === ctx.b.day.branch ? '相合' : (LIUCHONG[ctx.a.day.branch] === ctx.b.day.branch ? '相冲' : '平和');
    var ritxt = ri === '相合' ? '默契，一个眼神就懂' : (ri === '相冲' ? '有张力，需要多让一步' : '自然，细水长流');

    var healthA = { 金: '呼吸与皮肤', 木: '肝胆与情绪', 水: '肾与睡眠', 火: '心血管与上火', 土: '脾胃与湿气' }[mywx];
    var healthB = { 金: '呼吸与皮肤', 木: '肝胆与情绪', 水: '肾与睡眠', 火: '心血管与上火', 土: '脾胃与湿气' }[otwx];

    var data = {
      zr: ctx.r.zr.type, zrtxt: ctx.r.zr.txt, dayrel: '对方于你是「' + god + '」，你于对方是「' + god2 + '」', ri: ri, ritxt: ritxt,
      mywx: mywx, otwx: otwx, dir: DIR[mywx], dir2: DIR[otwx],
      myday: STEM[ctx.a.day.stem] + '（' + mywx + '）', otday: STEM[ctx.b.day.stem] + '（' + otwx + '）',
      mygod: god2, otgod: god,
      mycai: god2 === '正财' ? '旺' : '平', otcai: god === '正财' ? '旺' : '平',
      cai: (ctx.r.comp.length ? '五行互补，合财有戏' : '财上宜各管各、再统筹'),
      myhealth: healthA, othealth: healthB,
      health: (ctx.r.comp.length ? '互补的五行让健康更有底' : '相近的体质，更要一起养'),
      child: (ri === '相合' ? '子女缘不错，家庭观念合' : '子女缘需磨合，但后劲足')
    };

    function fill(s) { return s.replace(/\{(\w+)\}/g, function (_, k) { return data[k] || ''; }); }
    return ['感情', '事业', '财运', '健康', '子女'].map(function (key) {
      var tpl = pick(DETAIL_TPL[key], rng);
      return { key: key, text: fill(tpl) };
    });
  }

  function buildAdvice(a, b, ctx, rng) {
    var weakA = WX.filter(function (x) { return ctx.aWx[x] === 0; });
    var weakB = WX.filter(function (x) { return ctx.bWx[x] === 0; });
    var target = weakA.length ? weakA[0] : (weakB.length ? weakB[0] : '金');
    var lk = LUCKY[target];
    var tips = [
      '宜多穿' + lk.color + '色系，增补气场',
      '约会方位宜' + lk.dir,
      '幸运数字 ' + lk.num,
      ctx.r.zr.good === false ? '避开' + ZODIAC[ctx.a.zodiacBranch] + ZODIAC[ctx.b.zodiacBranch] + '相冲的急躁期，大事多商量' : '重大决定选双方属相吉日，事半功倍'
    ];
    return { target: target, color: lk.color, dir: lk.dir, num: lk.num, tips: tips.slice(0, 3) };
  }

  // ===== 渲染 =====
  var $ = function (id) { return document.getElementById(id); };
  var inputView = $('inputView'), resultView = $('resultView');
  var version = 'simple';
  var lastShare = '';

  // 解锁口令：改这里的数字即可。注意纯前端静态站，口令在源码里可见，防君子不防小人。
  var UNLOCK_CODE = '5201314';
  var unlocked = false;
  try { unlocked = localStorage.getItem('yuanfen_unlocked') === '1'; } catch (e) {}

  var SECTIONS = {
    baziSection: { title: '八字命盘', icon: '' },
    wuxingSection: { title: '五行格局', icon: '' },
    zodiacSection: { title: '生肖合婚', icon: '' },
    hehunSection: { title: '八字合婚', icon: '' },
    yunshiSection: { title: '运势走势', icon: '' },
    detailSection: { title: '分项解读', icon: '' },
    adviceSection: { title: '开运建议', icon: '' }
  };

  function sectionHtml(title, icon, body) {
    return '<h3 class="sec-title"><span class="sec-mark" aria-hidden="true"></span>' + title + '</h3><div class="sec-body">' + body + '</div>';
  }

  function wuxingBar(wx) {
    var max = 8;
    return '<div class="wx-bar">' + WX.map(function (x) {
      var n = wx[x];
      return '<div class="wx-item"><span class="wx-name">' + x + '</span>' +
        '<div class="wx-track"><div class="wx-fill wx-' + x + '" style="width:' + (n / max * 100) + '%"></div></div>' +
        '<span class="wx-n">' + n + '</span></div>';
    }).join('') + '</div>';
  }

  function baziTable(bz, name) {
    var cols = [bz.year, bz.month, bz.day, bz.hour];
    var colHeads = ['年柱', '月柱', '日柱', '时柱'];
    var rowKeys = [['stem', '天干'], ['branch', '地支'], ['wx', '五行'], ['nayin', '纳音']];
    var rows = rowKeys.map(function (rk) {
      var cells = cols.map(function (c, i) {
        if (!c) return '<td class="na">—</td>';
        var v;
        if (rk[0] === 'stem') v = STEM[c.stem];
        else if (rk[0] === 'branch') v = BRANCH[c.branch];
        else if (rk[0] === 'wx') v = STEM_WX[c.stem] + BRANCH_WX[c.branch];
        else v = c.nayin;
        var cls = (i === 2) ? 'day' : '';
        return '<td class="' + cls + '">' + v + '</td>';
      }).join('');
      return '<tr><th>' + rk[1] + '</th>' + cells + '</tr>';
    }).join('');
    var head = '<tr><th></th>' + colHeads.map(function (h, i) {
      return '<th class="' + (i === 2 ? 'day' : '') + '">' + h + '</th>';
    }).join('') + '</tr>';
    return '<div class="bazi-person"><div class="bazi-person-head">' + esc(name) +
      '<span class="zodiac-tag">属' + bz.zodiac + '</span></div>' +
      '<table class="bazi-table">' + head + rows + '</table>' +
      '<p class="bazi-note">日主：<b>' + STEM[bz.day.stem] + BRANCH[bz.day.branch] + '</b> · ' + STEM_WX[bz.day.stem] + '命 · 配偶宫为' + BRANCH[bz.day.branch] + '</p></div>';
  }

  function renderPro(a, b, ctx) {
    var r = ctx.r;

    // 总评
    $('proScoreNum').textContent = r.score;
    $('proTitle').textContent = scoreTitle(r.score);
    $('proSummary').textContent = a + ' × ' + b + '，' + r.zr.txt + '。' +
      (r.comp.length ? '五行互补（' + r.comp.join('、') + '），彼此补缺。' : '五行相近，气味相投。') +
      '综合来看' + (r.score >= 80 ? '是一段值得认真经营的缘分。' : r.score >= 66 ? '缘分不浅，用心经营可成。' : '需要更多磨合，慢一点反而稳。');

    $('proTags').innerHTML = r.highlights.concat([scoreTitle(r.score)]).map(function (t) {
      return '<span class="tag">' + t + '</span>';
    }).join('');

    // 命盘
    $('baziSection').innerHTML = sectionHtml(SECTIONS.baziSection.title, SECTIONS.baziSection.icon,
      baziTable(ctx.a, a) + baziTable(ctx.b, b));

    // 五行
    $('wuxingSection').innerHTML = sectionHtml(SECTIONS.wuxingSection.title, SECTIONS.wuxingSection.icon,
      '<div class="wx-person"><p class="wx-person-name">' + esc(a) + '</p>' + wuxingBar(ctx.aWx) + '<p class="wx-sum">' + wuxingSummary(a, ctx.aWx, ctx.rng) + '</p></div>' +
      '<div class="wx-person"><p class="wx-person-name">' + esc(b) + '</p>' + wuxingBar(ctx.bWx) + '<p class="wx-sum">' + wuxingSummary(b, ctx.bWx, ctx.rng) + '</p></div>');

    // 生肖
    var zr = r.zr;
    $('zodiacSection').innerHTML = sectionHtml(SECTIONS.zodiacSection.title, SECTIONS.zodiacSection.icon,
      '<div class="zr-row"><span class="zr-badge ' + (zr.good === true ? 'good' : zr.good === false ? 'bad' : '') + '">' + zr.type + '</span>' +
      '<span>' + esc(a) + ' 属' + ctx.a.zodiac + ' · ' + esc(b) + ' 属' + ctx.b.zodiac + '</span></div>' +
      '<p class="zr-txt">' + zr.txt + '。</p>' +
      '<p class="zr-desc">' + zrDesc(zr.type) + '</p>');

    // 合婚
    var hehunRows = r.notes.map(function (n) { return '<li>' + n + '</li>'; }).join('');
    $('hehunSection').innerHTML = sectionHtml(SECTIONS.hehunSection.title, SECTIONS.hehunSection.icon,
      '<ul class="hehun-list">' + hehunRows + '</ul>' +
      '<p class="hehun-note">日主相配：' + esc(a) + '为' + STEM[ctx.a.day.stem] + '（' + STEM_WX[ctx.a.day.stem] + '），' +
      esc(b) + '为' + STEM[ctx.b.day.stem] + '（' + STEM_WX[ctx.b.day.stem] + '）。' +
      '对方于你是「' + tenGod(ctx.a.day.stem, ctx.b.day.stem) + '」，你于对方是「' + tenGod(ctx.b.day.stem, ctx.a.day.stem) + '」。</p>');

    // 运势
    var phases = yunshiPhases(a, b, ctx);
    $('yunshiSection').innerHTML = sectionHtml(SECTIONS.yunshiSection.title, SECTIONS.yunshiSection.icon,
      phases.map(function (p) {
        return '<div class="phase">' +
          '<div class="phase-head"><span class="phase-year">' + p.label + '</span>' +
          '<span class="phase-ages">' + p.ages + '</span>' +
          '<span class="phase-verdict ' + p.v.cls + '">' + p.v.k + '</span></div>' +
          '<p class="phase-txt">' + p.v.txt + '</p></div>';
      }).join(''));

    // 分项
    var details = buildDetail(a, b, ctx, ctx.rng);
    $('detailSection').innerHTML = sectionHtml(SECTIONS.detailSection.title, SECTIONS.detailSection.icon,
      details.map(function (d) {
        return '<div class="detail-item"><span class="detail-key">' + d.key + '</span><p class="detail-txt">' + d.text + '</p></div>';
      }).join(''));

    // 开运
    var adv = buildAdvice(a, b, ctx, ctx.rng);
    $('adviceSection').innerHTML = sectionHtml(SECTIONS.adviceSection.title, SECTIONS.adviceSection.icon,
      '<p class="advice-lead">结合你们命局，宜补「' + adv.target + '」：</p>' +
      '<ul class="advice-list">' + adv.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>');
  }

  function zrDesc(type) {
    return {
      '六合': '十二生肖中六合是上等相配，两人三观相近，遇事能想到一块，是长辈口中的良缘。',
      '三合': '三合是贵人相，彼此是对方的助力，适合一起打拼，婚后也旺家庭。',
      '六冲': '相冲不代表无缘，而是相处模式有张力，需要多站在对方角度，把冲劲用在共同目标上。',
      '六害': '相害多指小的误会与摩擦，口角易生，但只要约定好沟通方式，反而越磨越亲。',
      '同属相': '同属相彼此最懂对方，容易共情，也容易因太像而较劲，需要一人先让步。',
      '平和': '无冲无合，感情自然发展，不折腾、不内耗，是细水长流型。'
    }[type] || '';
  }

  function renderSimple(a, b, ctx) {
    var r = ctx.r;
    var title = scoreTitle(r.score);
    var desc = a + ' × ' + b + '：' + r.zr.txt + '。' +
      (r.comp.length ? '五行互补，彼此补缺。' : '五行相近，气味相投。') +
      '综合缘分' + r.score + '分。';

    $('scoreNum').textContent = r.score;
    $('scoreRing').style.setProperty('--p', r.score);
    $('resultTitle').textContent = title;
    $('resultDesc').textContent = desc;

    // 三个维度
    var dimsData = [
      { name: '性格契合', val: clamp(r.score + (ctx.aWx[STEM_WX[ctx.a.day.stem]] === ctx.bWx[STEM_WX[ctx.b.day.stem]] ? 5 : -5), 45, 99) },
      { name: '默契程度', val: clamp(r.score + (r.zr.good === true ? 4 : -4), 45, 99) },
      { name: '未来走向', val: clamp(r.score + (r.comp.length * 2), 45, 99) }
    ];
    $('dims').innerHTML = dimsData.map(function (d) {
      return '<div class="dim"><div class="dim-head"><span class="dim-name">' + d.name + '</span><span class="dim-val">' + d.val + '</span></div>' +
        '<div class="dim-bar"><div class="dim-fill" data-w="' + d.val + '"></div></div></div>';
    }).join('');

    // 标签
    var tgs = r.highlights.slice();
    while (tgs.length < 3) { var t = pick(TAG_POOL, ctx.rng); if (tgs.indexOf(t) === -1) tgs.push(t); }
    $('tags').innerHTML = tgs.slice(0, 3).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');

    // 动画
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.querySelectorAll('#simpleView .dim-fill').forEach(function (el) { el.style.width = el.dataset.w + '%'; });
      });
    });
  }

  function show(el) {
    inputView.classList.remove('active');
    resultView.classList.remove('active');
    el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setVersion(v) {
    version = v;
    document.querySelectorAll('#inputSeg .seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.v === v); });
    document.querySelectorAll('#resultSeg .seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.v === v); });
    $('simpleView').classList.toggle('active', v === 'simple');
    $('proView').classList.toggle('active', v === 'pro');
    // 专业版付费墙
    var locked = (v === 'pro' && !unlocked);
    $('proLocked').style.display = locked ? '' : 'none';
    $('proContent').style.display = (v === 'pro' && unlocked) ? '' : 'none';
  }

  function start() {
    var a = $('nameA').value.trim(), b = $('nameB').value.trim();
    if (!a || !b) { alert('请填写你和 TA 的名字'); return; }
    var bdA = $('birthdayA').value, bdB = $('birthdayB').value;
    if (!bdA || !bdB) { alert('请填写两人的生日（公历），八字需出生日期'); return; }
    var hA = parseInt($('hourA').value, 10), hB = parseInt($('hourB').value, 10);

    var rng = mulberry32(hash([a, b, bdA, bdB].join('|')));
    var aBz = baziOf(bdA, hA), bBz = baziOf(bdB, hB);
    var aWx = wuxingOf(aBz), bWx = wuxingOf(bBz);
    var r = analyze(a, b, aBz, bBz, aWx, bWx, rng);
    var ctx = { a: aBz, b: bBz, aWx: aWx, bWx: bWx, r: r, rng: rng };

    renderPro(a, b, ctx);
    renderSimple(a, b, ctx);
    setVersion(version);

    lastShare = buildShare(a, b, ctx);
    show(resultView);
  }

  function buildShare(a, b, ctx) {
    var r = ctx.r;
    return '「缘起 · 八字合婚」' + a + ' × ' + b + '\n' +
      '合婚 ' + r.score + ' 分 · ' + scoreTitle(r.score) + '\n' +
      '生肖：' + r.zr.type + '（' + ctx.a.zodiac + ' / ' + ctx.b.zodiac + '）\n' +
      (r.comp.length ? '五行互补：' + r.comp.join('、') + '\n' : '') +
      '日主：' + STEM[ctx.a.day.stem] + ' / ' + STEM[ctx.b.day.stem] + '\n' +
      '—— 缘起，八字合婚，仅供娱乐 ——';
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: '姻缘测算', text: lastShare }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(lastShare).then(function () { alert('结果已复制，去粘贴给 TA 吧'); }).catch(function () {});
    } else {
      prompt('复制这段文字分享：', lastShare);
    }
  }

  // ===== 初始化 =====
  function initHours() {
    var HOURS = ['子时 23–1', '丑时 1–3', '寅时 3–5', '卯时 5–7', '辰时 7–9', '巳时 9–11', '午时 11–13', '未时 13–15', '申时 15–17', '酉时 17–19', '戌时 19–21', '亥时 21–23'];
    var opts = '<option value="-1">不清楚</option>' + HOURS.map(function (h, i) { return '<option value="' + i + '">' + h + '</option>'; }).join('');
    $('hourA').innerHTML = opts;
    $('hourB').innerHTML = opts;
  }

  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', function () { show(inputView); });
  $('againBtn2').addEventListener('click', function () { show(inputView); });
  $('shareBtn').addEventListener('click', share);
  $('shareBtn2').addEventListener('click', share);
  document.querySelectorAll('#inputSeg .seg-btn').forEach(function (b) { b.addEventListener('click', function () { setVersion(b.dataset.v); }); });
  document.querySelectorAll('#resultSeg .seg-btn').forEach(function (b) { b.addEventListener('click', function () { setVersion(b.dataset.v); }); });

  $('unlockBtn').addEventListener('click', function () {
    if (($('unlockInput').value || '').trim() === UNLOCK_CODE) {
      unlocked = true;
      try { localStorage.setItem('yuanfen_unlocked', '1'); } catch (e) {}
      $('unlockInput').value = '';
      setVersion('pro');
    } else {
      alert('口令不正确，请核对后重试');
    }
  });
  $('unlockInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('unlockBtn').click(); });

  initHours();
})();
