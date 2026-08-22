/* ═════════════════════════════════════════════════════════════════════════
   24_ContentAudit.gs — دیدبانِ محتوا

   ══ چه چیزی را حل می‌کند ══
   پاسِ وفاداریِ زمانِ تولید (fidelityCheck_) واژه‌ای است. نقل‌قولی که در متنِ
   خام نیست، جملهٔ سی‌واژه‌ای، نویسهٔ عربی و عبارتِ پیوندِ کلیشه‌ای را می‌گیرد.
   ولی سه پرسشی که صاحبِ برنامه می‌پرسد از جنسِ دیگری‌اند:

     • این عکس/ویدیو اصلاً برای این بخش درست انتخاب شده بود؟
     • پیوندی که بین این چند آیتمِ بی‌ربط ساخته شده، واقعی است یا سرِهم‌بندی؟
     • چیزی گفته شده که در خودِ خام نبوده؟

   هیچ‌کدام با شمردنِ واژه فهمیده نمی‌شود؛ قضاوتِ معنایی می‌خواهد. و این
   قضاوت را نمی‌شود وسطِ تولید کرد: مهلتِ شش‌دقیقه‌ایِ Apps Script جا ندارد،
   و اگر مدل بد جواب دهد قسمت خراب می‌شود. پس کار دو تکه شده است:

     ۱) لحظهٔ تولید — «عکس‌برداری». همان‌جا که متنِ نهایی و متن‌های خام هر دو
        در حافظه‌اند، یک پرونده نوشته می‌شود. این تنها لحظه‌ای است که این دو
        کنارِ هم‌اند.
     ۲) فردا — «داوری». عکس خوانده می‌شود و مدل سرِ فرصت قضاوت می‌کند.

   ══ چرا عکس، و نه خواندنِ دوبارهٔ شیت ══
   تحلیلگرهای منبع ردیف‌ها را بازنویسی می‌کنند. اگر فردا متنِ نهایی را با
   ردیفِ امروزِ شیت بسنجیم، داریم آن را با متنی می‌سنجیم که ممکن است بعد از
   ساختِ قسمت عوض شده باشد — و نتیجه بی‌معنی است. عکس، متنِ خام را همان‌طور
   که واقعاً به مدل داده شد نگه می‌دارد.

   ══ چرا هر پادکستِ آینده هم خودبه‌خود پوشش داده می‌شود ══
   اینجا هیچ فهرستی از برنامه‌ها نیست. داوری هر عکسی را که در پوشه ببیند
   می‌سنجد، و خودِ عکس نامِ برنامه و هدفش را با خود دارد. یعنی یک پادکستِ
   تازه فقط کافی است هنگام تولید `auditSnap_` را صدا بزند؛ از همان شب در
   گزارش‌ها و تب می‌آید، بی آنکه یک خط از این فایل عوض شود. فهرستی که باید
   به‌روز نگه داشته شود، فهرستی است که یک روز فراموش می‌شود.

   ══ مرزِ «مدل پیشنهاد می‌دهد، کد تصمیم می‌گیرد» ══
   مدل فقط برچسب می‌زند. شدت، مسئول، و اینکه اصلاً یافته‌ای ثبت شود یا نه را
   کد تعیین می‌کند. مدلی که یک روز بدخلقی کند نباید بتواند نسخهٔ کد بسازد.

   ══ دو مسیرِ اصلاح، نه یکی ══
   • ایرادِ مدل (منبعِ نامناسب، پیوندِ ساختگی، حرفِ فراتر از خام) →
     `ROWNER_ENGINE` → دستور در تب گزارش‌ها → قسمتِ بعد همان را در پرامپت
     می‌بیند و خودش را اصلاح می‌کند.
   • ایرادِ سازوکار (بخش‌ها اصلاً منبع نگرفته‌اند، اِسناد به شناسهٔ ناموجود،
     عکس نوشته نشده) → `ROWNER_CODE` → صفِ «نیازمند تعویض کد» → نسخهٔ تازهٔ
     موتور. این همان چیزی است که با دستور به مدل حل نمی‌شود، چون مدل اصلاً
     مقصر نیست.
   یک شبِ بدِ اِسناد می‌تواند اتفاقی باشد؛ `AUDIT_CODE_AFTER` شبِ پیاپی یعنی
   سازوکار خراب است. بی این شمارنده، یک اختلالِ گذرا یک نسخهٔ بی‌مورد می‌ساخت.
   ═════════════════════════════════════════════════════════════════════════ */

/** پوشهٔ عکس‌های محتوا در OUTPUT؛ اگر نبود ساخته می‌شود. */
function auditFolder_() {
  var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  var name = CFG.AUDIT_FOLDER || 'بایگانی — سنجهٔ محتوا';
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

function auditSnapName_(show, epNum) {
  return '_AUDIT-' + String(show || 'show') + '-' + ('000' + epNum).slice(-3) + '.json';
}

/** نوشتنِ یک JSON در پوشهٔ عکس‌ها (ریشه را شلوغ نمی‌کند). */
function auditPutJson_(name, obj) {
  var folder = auditFolder_();
  var body = JSON.stringify(obj);
  var it = folder.getFilesByName(name);
  if (it.hasNext()) {
    var f = it.next();
    f.setContent(body);
    while (it.hasNext()) { try { it.next().setTrashed(true); } catch (e) {} }
    return f;
  }
  return folder.createFile(Utilities.newBlob(body, 'application/json', name));
}

function auditReadJson_(file) {
  try { return JSON.parse(file.getBlob().getDataAsString('UTF-8')); }
  catch (e) { return null; }
}

function auditCut_(s, n) {
  var t = String(s === null || s === undefined ? '' : s);
  return t.length > n ? t.slice(0, n) : t;
}

/* ──────────────────────────── ۱) عکس‌برداری ──────────────────────────── */

/**
 * عکسِ یک قسمت: متنِ نهایی، متن‌های خامی که ازشان ساخته شده، و نشانه‌های
 * واژه‌ایِ همان لحظه.
 *
 * از دلِ تولید صدا زده می‌شود، دقیقاً کنارِ fidelityCheck_ — تنها جایی که هر
 * دو طرفِ مقایسه در دست‌اند. شکستش نباید تولید را بکشد، پس فراخوانش در
 * try/catch است و خودش هم چیزی پرتاب نمی‌کند.
 *
 *   show   کلیدِ برنامه ('variety' | 'special' | هر کلیدِ تازه)
 *   meta   {showName, episode, title, category, targetMin}
 *   ep     {hook, outro, connection, sections:[{heading, narration, sourceIds}]}
 *   items  [{id, kind, topic, msg, summary, body}]  — متنِ خام
 *   lex    خروجیِ fidelityCheck_ (اختیاری)
 */
function auditSnap_(show, meta, ep, items, lex) {
  if (CFG.AUDIT_ENABLED === false) return null;
  meta = meta || {};
  var bodyMax = Number(CFG.AUDIT_BODY_MAX) || 1200;
  var narrMax = Number(CFG.AUDIT_NARR_MAX) || 4000;

  var used = {}, secs = [];
  var raw = (ep && ep.sections) || [];
  for (var i = 0; i < raw.length; i++) {
    var s = raw[i] || {};
    var ids = [];
    for (var k = 0; k < (s.sourceIds || []).length; k++) {
      var id = String(s.sourceIds[k] || '').trim();
      if (id) { ids.push(id); used[id] = 1; }
    }
    secs.push({ i: i, heading: auditCut_(s.heading, 200),
                narration: auditCut_(s.narration, narrMax), ids: ids });
  }

  // فقط منابعی که واقعاً اِسناد داده شده‌اند نگه داشته می‌شوند، به‌علاوهٔ
  // سقفی از بقیه: بی آن سقف، عکسِ یک قسمتِ پرمنبع از حدِ فایل می‌گذشت.
  var src = {}, extra = 0;
  for (var j = 0; j < (items || []).length; j++) {
    var it = items[j] || {};
    var iid = String(it.id || '');
    if (!iid) continue;
    if (!used[iid]) { if (extra >= 30) continue; extra++; }
    src[iid] = { kind: String(it.kind || ''), topic: auditCut_(it.topic, 300),
                 msg: auditCut_(it.msg, 300), summary: auditCut_(it.summary, bodyMax),
                 body: auditCut_(it.body, bodyMax) };
  }

  var snap = {
    v: 1, show: String(show || ''), showName: String(meta.showName || ''),
    episode: Number(meta.episode) || 0, at: nowStr_(),
    title: auditCut_(meta.title, 300), category: String(meta.category || ''),
    targetMin: Number(meta.targetMin) || 0,
    hook: auditCut_((ep && ep.hook) || '', 1500),
    outro: auditCut_((ep && ep.outro) || '', 1500),
    connection: auditCut_((ep && ep.connection) || '', 1500),
    sections: secs, sources: src,
    lex: (lex || []).slice(0, 20).map(function (x) {
      return { kind: String(x.kind || ''), section: String(x.section || ''),
               text: auditCut_(x.text, 200) };
    })
  };

  try {
    auditPutJson_(auditSnapName_(show, snap.episode), snap);
    logLine_('عکسِ محتوای «' + (snap.showName || snap.show) + '» قسمت ' +
             snap.episode + ' گرفته شد (' + secs.length + ' بخش، ' +
             Object.keys(src).length + ' منبع).');
    return snap;
  } catch (e) {
    logLine_('عکسِ محتوا گرفته نشد: ' + e.message);
    return null;
  }
}

/* ──────────────────────── ۲) وارسی‌های قطعی (بی مدل) ──────────────────── */

/**
 * آنچه بی پرسیدن از مدل معلوم است: آیا اصلاً اِسناد انجام شده؟
 *
 * این‌ها ایرادِ کد را از ایرادِ نگارش جدا می‌کنند. بخشی که هیچ شناسه‌ای ندارد
 * یعنی موتور نتوانسته منبع را به بخش وصل کند؛ هر قضاوتی دربارهٔ «انتخابِ
 * درست» روی چنین بخشی بی‌پایه است.
 */
function auditDeterministic_(snap) {
  var out = { sections: 0, noSrc: 0, broken: 0, brokenIds: [], attribPct: 0, dup: 0 };
  var secs = (snap && snap.sections) || [], src = (snap && snap.sources) || {};
  var seen = {};
  out.sections = secs.length;
  for (var i = 0; i < secs.length; i++) {
    var ids = secs[i].ids || [];
    if (!ids.length) { out.noSrc++; continue; }
    for (var k = 0; k < ids.length; k++) {
      if (!Object.prototype.hasOwnProperty.call(src, ids[k])) {
        out.broken++;
        if (out.brokenIds.length < 8) out.brokenIds.push(ids[k]);
      }
      if (seen[ids[k]]) out.dup++;
      seen[ids[k]] = 1;
    }
  }
  out.attribPct = out.sections
    ? Math.round(((out.sections - out.noSrc) / out.sections) * 100) : 0;
  return out;
}

/* ────────────────────────── ۳) داوریِ معنایی ──────────────────────────── */

/* همهٔ فیلدها رشته‌اند. مدلِ این ریپو هر schema حاویِ integer/number/boolean را
   رد می‌کند؛ run_real_test.js این قاعده را روی کلِ کد نگه می‌دارد. */
var AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    advice: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          i: { type: 'string' },
          fit: { type: 'string' },
          linked: { type: 'string' },
          faithful: { type: 'string' },
          why: { type: 'string' }
        },
        required: ['i', 'fit', 'linked', 'faithful', 'why']
      }
    }
  },
  required: ['verdict', 'sections']
};

var AUDIT_FIT_BAD = 'نامناسب';
var AUDIT_LINK_BAD = 'ساختگی';
var AUDIT_FAITH_BAD = 'فراتر';

/** متنِ خامِ یک بخش، همان‌طور که به مدلِ داور نشان داده می‌شود. */
function auditSourceText_(snap, ids) {
  var out = [];
  for (var i = 0; i < ids.length; i++) {
    var s = (snap.sources || {})[ids[i]];
    if (!s) { out.push('• ' + ids[i] + ' — [این شناسه در منابع نیست]'); continue; }
    var bits = [s.topic, s.msg, s.summary, s.body].filter(function (x) { return x; });
    out.push('• ' + ids[i] + (s.kind ? ' (' + s.kind + ')' : '') + ': ' +
             auditCut_(bits.join(' — '), 900));
  }
  return out.join('\n');
}

function auditModel_(snap) {
  var secs = (snap.sections || []);
  if (!secs.length) return null;

  var blocks = [];
  for (var i = 0; i < secs.length; i++) {
    var ids = secs[i].ids || [];
    blocks.push(
      '### بخش ' + i + ' — «' + (secs[i].heading || '—') + '»\n' +
      'متنِ خامی که این بخش از آن ساخته شده:\n' +
      (ids.length ? auditSourceText_(snap, ids) : '[هیچ منبعی به این بخش اِسناد داده نشده]') +
      '\n\nمتنِ نهایی که گوینده خوانده:\n' + auditCut_(secs[i].narration, 2500));
  }

  var prompt = [
    'تو داورِ کیفیتِ یک برنامهٔ رادیوییِ فارسی هستی. یک قسمتِ ساخته‌شده را با',
    'موادِ خامش می‌سنجی. کارِ تو بازنویسی نیست — فقط قضاوت.',
    '',
    'برنامه: ' + (snap.showName || snap.show),
    'قسمت: ' + snap.episode + ' — «' + (snap.title || '—') + '»' +
      (snap.category ? ' | دسته: ' + snap.category : ''),
    '',
    'برای هر بخش سه چیز را جدا جدا قضاوت کن:',
    '',
    '۱) fit — آیا این موادِ خام برای این بخش انتخابِ درستی بوده‌اند؟',
    '   «مناسب» یعنی این ماده واقعاً همان چیزی است که بخش دربارهٔ آن حرف می‌زند.',
    '   «نامناسب» یعنی ماده ربطی به موضوعِ بخش ندارد یا آن‌قدر کم‌مایه است که',
    '   نمی‌شد از آن یک بخش ساخت. اگر مطمئن نیستی «نامعلوم».',
    '',
    '۲) linked — پیوندِ معنایی. موادِ خامِ یک قسمت طبیعتاً از هم جدا هستند',
    '   (یک کلیپ، یک عکس، یک سند). سؤال این است که آیا متنِ نهایی پیوندی',
    '   ساخته که واقعاً در خودِ مواد ریشه دارد، یا فقط با جمله‌های عمومی',
    '   («در دنیای پرشتاب امروز…») آن‌ها را به هم چسبانده.',
    '   «واقعی» یا «ساختگی» یا «بی‌ربط».',
    '',
    '۳) faithful — آیا متنِ نهایی چیزی می‌گوید که در موادِ خام نیست؟',
    '   «وفادار» یعنی هر ادعا در خام ریشه دارد. «فراتر» یعنی حرف، انگیزه،',
    '   احساس، علت یا شرایطی به آن نسبت داده شده که در خام نبوده.',
    '   توصیفِ روان و بازنویسیِ ادبی ایراد نیست؛ افزودنِ ادعا ایراد است.',
    '',
    'قاعده‌ها:',
    '  • i را همان شمارهٔ بخش بده، به رقمِ لاتین و به‌صورتِ رشته.',
    '  • why را در یک جملهٔ کوتاهِ فارسی بنویس و اگر ایرادی هست، دقیقاً به',
    '    همان جای متن اشاره کن. جملهٔ کلی ننویس.',
    '  • بخشی که هیچ منبعی ندارد را «نامعلوم» بده و در why همین را بگو.',
    '  • سخت‌گیر باش ولی منصف. اگر کارِ درستی انجام شده، بگو «مناسب» و',
    '    «واقعی» و «وفادار» — علامت‌زدنِ بی‌مورد همان‌قدر بد است که ندیدنِ ایراد.',
    '  • verdict یکی از «خوب» یا «قابل قبول» یا «ضعیف».',
    '  • advice یک جملهٔ کوتاه: در قسمتِ بعد چه کاری را جور دیگری انجام دهد.',
    '',
    blocks.join('\n\n')
  ].join('\n');

  try {
    var r = geminiText_(prompt, AUDIT_SCHEMA, 4096);
    if (!r || !r.sections) return null;
    return r;
  } catch (e) {
    logLine_('داوریِ محتوا انجام نشد: ' + e.message);
    return null;
  }
}

/** برچسب‌های مدل را می‌شمارد. مدل هرچه بگوید، شمارش کارِ کد است. */
function auditTally_(judged, secs) {
  var out = { unfit: 0, fake: 0, unfaith: 0, worst: '', n: 0 };
  var rows = (judged && judged.sections) || [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    var idx = parseInt(faDigits_(String(r.i)), 10);
    var head = (secs[idx] && secs[idx].heading) ? secs[idx].heading : String(r.i);
    var bad = '';
    if (String(r.fit || '').indexOf(AUDIT_FIT_BAD) !== -1) { out.unfit++; bad = 'منبعِ نامناسب'; }
    if (String(r.linked || '').indexOf(AUDIT_LINK_BAD) !== -1 ||
        String(r.linked || '').indexOf('بی‌ربط') !== -1) { out.fake++; bad = bad || 'پیوندِ ساختگی'; }
    if (String(r.faithful || '').indexOf(AUDIT_FAITH_BAD) !== -1) {
      out.unfaith++; bad = bad || 'فراتر از خام';
    }
    out.n++;
    if (bad && !out.worst) {
      out.worst = '[' + bad + '] بخش «' + head + '»: ' + auditCut_(r.why, 220);
    }
  }
  return out;
}

/* ──────────────────────────── ۴) ثبت در شیت ──────────────────────────── */

function auditTab_(hub) {
  var name = CFG.TAB_AUDIT || 'سنجهٔ محتوا';
  var sh = hub.getSheetByName(name);
  if (!sh) {
    sh = hub.insertSheet(name);
    sh.getRange(1, 1, 1, AUDIT_HEADERS.length).setValues([AUDIT_HEADERS]);
    try { sh.setFrozenRows(1); } catch (e) {}
  }
  return sh;
}

function auditWriteRow_(hub, snap, det, tal, judged, lexN, snapUrl) {
  var sh = auditTab_(hub);
  var row = [];
  row[AC.AT - 1] = nowStr_();
  row[AC.SHOW - 1] = snap.showName || snap.show;
  row[AC.EP - 1] = snap.episode;
  row[AC.TITLE - 1] = snap.title || '';
  row[AC.CAT - 1] = snap.category || '';
  row[AC.SECS - 1] = det.sections;
  row[AC.NOSRC - 1] = det.noSrc;
  row[AC.BROKEN - 1] = det.broken;
  row[AC.ATTRIB - 1] = det.attribPct + '٪';
  row[AC.UNFIT - 1] = tal ? tal.unfit : '';
  row[AC.FAKE - 1] = tal ? tal.fake : '';
  row[AC.UNFAITH - 1] = tal ? tal.unfaith : '';
  row[AC.LEX - 1] = lexN;
  row[AC.VERDICT - 1] = judged ? String(judged.verdict || '') : 'داوری نشد';
  row[AC.WORST - 1] = tal ? tal.worst : '';
  row[AC.ADVICE - 1] = judged ? auditCut_(judged.advice, 400) : '';
  row[AC.SNAP - 1] = snapUrl || '';
  for (var i = 0; i < AUDIT_HEADERS.length; i++) if (row[i] === undefined) row[i] = '';
  sh.getRange(sh.getLastRow() + 1, 1, 1, AUDIT_HEADERS.length).setValues([row]);
  return sh;
}

/* ───────────────────── ۵) تبدیلِ یافته به اقدام ───────────────────────── */

/**
 * دو مسیر، و مرزشان.
 *
 * ایرادِ نگارش دستور می‌گیرد و قسمتِ بعد خودش را درست می‌کند. ایرادِ سازوکار
 * دستور نمی‌گیرد — چون مدل مقصر نیست و هرچه به او بگویی عوض نمی‌شود؛ آن باید
 * نسخهٔ تازهٔ موتور بشود.
 */
function auditFindings_(hub, snap, det, tal, judged) {
  var who = (snap.showName || snap.show);
  var head = 'قسمت ' + snap.episode + ' «' + who + '»';

  // ── مسیرِ مدل ──
  if (tal && (tal.unfit || tal.fake || tal.unfaith)) {
    var bits = [];
    if (tal.unfit) bits.push('منبعِ نامناسب: ' + tal.unfit);
    if (tal.fake) bits.push('پیوندِ ساختگی: ' + tal.fake);
    if (tal.unfaith) bits.push('فراتر از خام: ' + tal.unfaith);
    var instr = '';
    if (tal.unfaith) {
      instr += 'در قسمتِ قبل چیزهایی گفتی که در متنِ خام نبود — انگیزه، احساس یا ' +
               'علتی که خودت اضافه کردی. فقط آنچه در خام هست را بگو؛ توصیف کن، ' +
               'تفسیر نکن. ';
    }
    if (tal.fake) {
      instr += 'پیوندِ بین آیتم‌ها را با جمله‌های عمومی نساز. اگر دو آیتم واقعاً ' +
               'ربطی ندارند، پیوندِ مصنوعی درست نکن و ساده از یکی به دیگری برو. ';
    }
    if (tal.unfit) {
      instr += 'آیتمی که مایهٔ کافی برای یک بخش ندارد یا به موضوع نمی‌خورد را ' +
               'انتخاب نکن، حتی اگر لازم باشد قسمت کوتاه‌تر شود. ';
    }
    if (judged && judged.advice) instr += 'توصیهٔ داور: ' + auditCut_(judged.advice, 300);
    try {
      logSelfFinding_(hub, {
        priority: (tal.unfaith || tal.fake) ? 'جدی' : 'متوسط',
        category: 'سنجهٔ محتوا',
        key: 'audit-' + snap.show + '-' +
             (tal.unfaith ? 'f' : '') + (tal.fake ? 'l' : '') + (tal.unfit ? 's' : ''),
        title: 'سنجهٔ محتوا در ' + head + ' — ' + bits.join('، '),
        detail: auditCut_(tal.worst, 500),
        instruction: instr,
        owner: ROWNER_ENGINE, episode: snap.episode
      });
    } catch (e) {}
  }

  // ── مسیرِ کد ──
  // اِسنادِ شکسته یعنی متنِ نهایی به شناسه‌ای ارجاع داده که در منابع نیست.
  // این را هیچ دستوری به مدل درست نمی‌کند.
  if (det.broken) {
    try {
      logSelfFinding_(hub, {
        priority: 'جدی',
        category: 'سنجهٔ محتوا',
        key: 'audit-broken-attrib',
        title: 'اِسنادِ شکسته در ' + head + ': ' + det.broken + ' شناسه در منابع نیست',
        detail: 'شناسه‌ها: ' + det.brokenIds.join('، ') +
                ' — یعنی scrubSourceIds_ نگذاشته باید نگذارد، یا منبع پیش از ' +
                'عکس‌برداری از فهرست افتاده. مقایسهٔ متنِ نهایی با خام برای این ' +
                'بخش‌ها بی‌پایه است.',
        instruction: 'در کدِ موتور بررسی شود که چرا شناسهٔ اِسنادشده در فهرستِ ' +
                     'منابعِ همان قسمت نیست.',
        owner: ROWNER_CODE, episode: snap.episode
      });
    } catch (e) {}
  }

  // اِسنادِ ضعیف چند شبِ پیاپی → سازوکار خراب است، نه یک اتفاق.
  var minPct = Number(CFG.AUDIT_MIN_ATTRIB_PCT) || 60;
  if (det.sections && det.attribPct < minPct) {
    var bad = 0;
    try { bad = Number(props_().getProperty(PK.AUDIT_BAD) || '0') || 0; } catch (e0) {}
    bad++;
    try { props_().setProperty(PK.AUDIT_BAD, String(bad)); } catch (e1) {}
    if (bad >= (Number(CFG.AUDIT_CODE_AFTER) || 3)) {
      try {
        logSelfFinding_(hub, {
          priority: 'جدی',
          category: 'سنجهٔ محتوا',
          key: 'audit-attrib-low',
          title: 'اِسنادِ منبع ' + bad + ' شب پیاپی ضعیف بوده (آخرین: ' +
                 det.attribPct + '٪ در ' + head + ')',
          detail: det.noSrc + ' بخش از ' + det.sections + ' هیچ منبعی نگرفته‌اند. ' +
                  'تا وقتی بخش‌ها به منبع وصل نشوند، سنجشِ «انتخابِ درست» و ' +
                  '«وفاداری» ممکن نیست — دیدبان عملاً کور است.',
          instruction: 'در کدِ موتور بررسی شود که چرا sourceIds برای بخش‌ها پر ' +
                       'نمی‌شود (پرامپت، طرحواره، یا scrubSourceIds_).',
          owner: ROWNER_CODE, episode: snap.episode
        });
      } catch (e2) {}
    }
  } else if (det.sections) {
    try { props_().setProperty(PK.AUDIT_BAD, '0'); } catch (e3) {}
  }
}

/* ────────────────────────────── ۶) گرداننده ──────────────────────────── */

/** عکس‌هایی که هنوز داوری نشده‌اند. کلید، شناسهٔ فایل است نه نامش. */
function auditPending_() {
  var out = [], done = {};
  try {
    var rawD = props_().getProperty(PK.AUDIT_DONE) || '';
    var arr = rawD ? rawD.split('|') : [];
    for (var d = 0; d < arr.length; d++) if (arr[d]) done[arr[d]] = 1;
  } catch (e0) {}
  try {
    var it = auditFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (String(f.getName()).indexOf('_AUDIT-') !== 0) continue;
      if (done[String(f.getId())]) continue;
      out.push(f);
    }
  } catch (e) { logLine_('خواندنِ پوشهٔ عکس‌های محتوا ناموفق: ' + e.message); }
  // قدیمی‌ها اول: اگر سقفِ هر دور اجازه ندهد، عقب‌مانده‌ها جا نمانند.
  out.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
  return out;
}

function auditMarkDone_(file) {
  try {
    var raw = props_().getProperty(PK.AUDIT_DONE) || '';
    var arr = raw ? raw.split('|') : [];
    arr.push(String(file.getId()));
    if (arr.length > 80) arr = arr.slice(arr.length - 80);
    props_().setProperty(PK.AUDIT_DONE, arr.join('|'));
  } catch (e) {}
}

/**
 * یک دورِ داوری. از کارِ شبانه صدا زده می‌شود.
 * برمی‌گرداند {done, skipped, results:[…]}
 */
function auditRun_(maxN) {
  var res = { done: 0, skipped: 0, results: [] };
  if (CFG.AUDIT_ENABLED === false) return res;
  var cap = Number(maxN) > 0 ? Number(maxN) : (Number(CFG.AUDIT_MAX_PER_RUN) || 3);
  var hub;
  try { hub = getHub_(); } catch (eH) { return res; }

  var files = auditPending_();
  for (var i = 0; i < files.length && res.done < cap; i++) {
    var f = files[i];
    var snap = auditReadJson_(f);
    if (!snap || !snap.sections) {
      // عکسِ ناخوانا نباید هر شب دوباره امتحان شود
      auditMarkDone_(f); res.skipped++; continue;
    }
    var det = auditDeterministic_(snap);
    var judged = null, tal = null;
    try { judged = auditModel_(snap); } catch (eM) { judged = null; }
    if (judged) tal = auditTally_(judged, snap.sections);

    var url = '';
    try { url = f.getUrl(); } catch (eU) {}
    try { auditWriteRow_(hub, snap, det, tal, judged, (snap.lex || []).length, url); }
    catch (eW) { logLine_('ثبتِ ردیفِ سنجهٔ محتوا ناموفق: ' + eW.message); }
    try { auditFindings_(hub, snap, det, tal, judged); } catch (eF) {}

    auditMarkDone_(f);
    res.done++;
    res.results.push({
      show: snap.show, showName: snap.showName, episode: snap.episode,
      sections: det.sections, noSrc: det.noSrc, broken: det.broken,
      attribPct: det.attribPct,
      unfit: tal ? tal.unfit : null, fake: tal ? tal.fake : null,
      unfaith: tal ? tal.unfaith : null,
      verdict: judged ? String(judged.verdict || '') : 'داوری نشد',
      worst: tal ? tal.worst : ''
    });
  }

  if (res.done) {
    try {
      props_().setProperty(PK.AUDIT_LAST, JSON.stringify({
        at: nowStr_(), items: res.results.slice(-4)
      }));
    } catch (eP) {}
    logLine_('سنجهٔ محتوا: ' + res.done + ' قسمت داوری شد.');
  }
  return res;
}

/** بایگانیِ عکس‌ها را هرس می‌کند. */
function auditPrune_(keepDays) {
  var days = Number(keepDays) > 0 ? Number(keepDays) : Number(CFG.AUDIT_KEEP_DAYS || 0);
  if (!(days > 0)) return 0;
  var cut = new Date().getTime() - days * 86400000;
  var n = 0;
  try {
    var it = auditFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (String(f.getName()).indexOf('_AUDIT-') !== 0) continue;
      var when = f.getLastUpdated ? f.getLastUpdated() : f.getDateCreated();
      if (when && when.getTime() < cut) { f.setTrashed(true); n++; }
    }
  } catch (e) {}
  if (n) logLine_('عکسِ محتوای کهنه پاک شد: ' + n + ' فایل.');
  return n;
}

/** خلاصه برای _STATUS.json — همان چیزی که ناظرِ روزانه می‌خواند. */
function auditStatus_() {
  var out = { enabled: CFG.AUDIT_ENABLED !== false, pending: 0, lastAt: '', items: [] };
  try { out.pending = auditPending_().length; } catch (e) {}
  try {
    var raw = props_().getProperty(PK.AUDIT_LAST) || '';
    if (raw) {
      var j = JSON.parse(raw);
      out.lastAt = String(j.at || '');
      out.items = j.items || [];
    }
  } catch (e2) {}
  try { out.badNights = Number(props_().getProperty(PK.AUDIT_BAD) || '0') || 0; } catch (e3) {}
  return out;
}

/** اجرای دستی از منو. */
function runContentAudit() {
  var r = auditRun_();
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  var lines = ['🔎 سنجهٔ محتوا', ''];
  if (!r.done) {
    lines.push('عکسِ داوری‌نشده‌ای نبود.');
    lines.push('(عکس هنگام ساختِ هر قسمت گرفته می‌شود؛ داوری شبِ بعد انجام می‌گیرد.)');
  } else {
    for (var i = 0; i < r.results.length; i++) {
      var x = r.results[i];
      lines.push('• ' + (x.showName || x.show) + ' قسمت ' + x.episode + ' — ' + x.verdict);
      lines.push('   بخش‌ها: ' + x.sections + ' · اِسناد: ' + x.attribPct + '٪' +
                 (x.broken ? ' · اِسنادِ شکسته: ' + x.broken : ''));
      if (x.unfit !== null) {
        lines.push('   منبعِ نامناسب: ' + x.unfit + ' · پیوندِ ساختگی: ' + x.fake +
                   ' · فراتر از خام: ' + x.unfaith);
      }
      if (x.worst) lines.push('   ' + auditCut_(x.worst, 180));
      lines.push('');
    }
    lines.push('نتیجه در تبِ «' + (CFG.TAB_AUDIT || 'سنجهٔ محتوا') + '» ثبت شد.');
  }
  var msg = lines.join('\n');
  if (ui) ui.alert(msg); else logLine_(msg);
  return r;
}
