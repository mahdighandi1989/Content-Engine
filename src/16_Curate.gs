/**
 * 16_Curate.gs — داوریِ محتواییِ مجموعه‌های آموزشی
 *
 * مسئلهٔ واقعی: آرشیو پر است از فایل‌هایی که نامشان چیزی می‌گوید و محتوایشان
 * چیز دیگری است. با تشخیص از روی نام، جلسهٔ روضه و سینه‌زنی و کلیپِ مناسبتی هم
 * «مجموعهٔ آموزشی» شمرده می‌شد و در فهرستِ «درس‌نامه» می‌نشست — و دسته‌بندی هم
 * عملاً هیچ می‌شد، چون از روی اسم چیزی معلوم نیست.
 *
 * این‌جا برای هر مجموعه چند قطعه از متنِ واقعی‌اش نمونه برداشته می‌شود و از مدل
 * پرسیده می‌شود:
 *   • آیا این واقعاً «آموختنِ منظم» است؟ (سخنرانیِ تخصصی و مصاحبهٔ عمیق: بله.
 *     روضه، سینه‌زنی، مناسبت، دورهمی، کلیپ خبری: نه — هرچقدر هم ارزشمند باشند.)
 *   • موضوعِ واقعی‌اش چیست، در یک جملهٔ فارسی؟ (تا فهرست خوانا شود، حتی وقتی
 *     نام فایل بی‌معنی است.)
 *   • دستهٔ درستش کدام است، و سطحش مقدماتی است یا میانی یا پیشرفته؟
 *
 * چیزی که آموزشی نیست دور ریخته نمی‌شود: در برنامهٔ «از همه جا از همه رنگ»
 * عیناً استفاده می‌شود و در تخته هم زیر عنوانِ جدا، با دلیلش، دیده می‌شود و
 * می‌توانید دستی نظرِ داوری را عوض کنید.
 *
 * هیچ چیزی در شیت‌های منبع نوشته نمی‌شود؛ فقط خوانده می‌شوند.
 */

/**
 * قالبِ خروجی. همهٔ فیلدها «رشته»اند — حتی عدد و بله/خیر.
 * علتش تجربهٔ تلخ است: مدل‌ها در پذیرشِ نوع‌های integer و boolean در
 * responseSchema سلیقه‌ای‌اند و ردکردنشان با یک خطای HTTP 400 خودش را نشان
 * می‌دهد که تا دیروز یعنی مرگِ خاموشِ کلِ داوری. رشته را همه می‌پذیرند؛ تبدیل
 * به عدد و بولی را خودمان در کد انجام می‌دهیم.
 */
var JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          isCourse: { type: 'string' },
          score: { type: 'string' },
          kindOfContent: { type: 'string' },
          about: { type: 'string' },
          topic: { type: 'string' },
          category: { type: 'string' },
          catSure: { type: 'string' },
          courseSure: { type: 'string' },
          form: { type: 'string' },
          audience: { type: 'string' },
          evidence: { type: 'string' },
          level: { type: 'string' },
          related: { type: 'string' },
          orderHint: { type: 'string' },
          why: { type: 'string' }
        },
        required: ['key', 'isCourse', 'score', 'about', 'topic', 'category', 'level', 'why']
      }
    }
  },
  required: ['verdicts']
};

// ------------------------------------------------------- خواندنِ مقدارها

/** «آموزشی؟» با در نظر گرفتنِ تصمیم دستیِ شما، که همیشه مقدم است. */
function seriesIsCourse_(vals) {
  var man = String(vals[SC.MANUAL - 1] || '').trim();
  if (man === SMAN.YES) return true;
  if (man === SMAN.NO) return false;
  var j = String(vals[SC.IS_COURSE - 1] || '').trim();
  if (j === SJ.YES) return true;
  if (j === SJ.NO) return false;
  return null;                     // هنوز داوری نشده
}

/** آیا این مجموعه داوری شده و داوری‌اش تازه است؟ */
function seriesJudged_(vals) {
  var at = String(vals[SC.JUDGED - 1] || '').trim();
  if (!at) return false;
  var ms = parseWhen_(at);
  if (isNaN(ms)) return true;
  /* ۱۱.۹: داوریِ پیش از فهرستِ تازهٔ دسته‌ها ⇒ یک بار از نو. */
  var since = parseWhen_(String(CFG.JUDGE_CAT_SINCE || ''));
  if (!isNaN(since) && ms < since) return false;
  var days = (new Date().getTime() - ms) / 86400000;
  // داوریِ «مشکوک» قطعی نیست: زودتر دوباره امتحان می‌شود، نه پس از ۴۵ روز.
  // (شاید تبِ منبع همان یک بار در دسترس نبوده باشد.)
  var window = String(vals[SC.IS_COURSE - 1] || '') === SJ.UNSURE
                 ? (CFG.JUDGE_UNSURE_DAYS || 2) : (CFG.JUDGE_REJUDGE_DAYS || 45);
  // داوریِ بی‌مدل موقتی است: کارش این بود که فهرست بی‌نظم نماند. همین که مدل
  // دوباره در دسترس باشد باید بازبینی شود، نه چهل‌وپنج روز بعد.
  if (String(vals[SC.WHY - 1] || '').indexOf(JUDGE_LOCAL_MARK) !== -1) {
    window = Math.min(window, CFG.JUDGE_LOCAL_DAYS || 3);
  }
  return !(isFinite(days) && days > window);
}

/**
 * آیا این مجموعه اجازهٔ ورود به «درس‌نامه» را دارد؟
 * انتخابِ دستیِ شما (سنجاق) از هر داوری‌ای بالاتر است: اگر خودتان مجموعه‌ای را
 * انتخاب کرده‌اید، همان ساخته می‌شود — حتی اگر داوری آموزشی‌اش ندانسته باشد.
 */
function seriesEligible_(vals, key, pinOpt) {
  var man = String(vals[SC.MANUAL - 1] || '').trim();
  if (man === SMAN.YES) return true;
  if (man === SMAN.NO) return false;
  // شماره یا دستهٔ دستی یعنی «این را خودم چیده‌ام و در برنامه می‌خواهمش»؛
  // داوریِ خودکار دیگر حقِ کنارگذاشتنش را ندارد.
  if (seriesManualLock_(vals)) return true;
  var pin = pinOpt !== undefined ? pinOpt : seriesPin_();
  // انتخابِ یک «مجموعهٔ مشخص» یعنی «همین را می‌خواهم» و از داوری بالاتر است.
  // ولی انتخابِ یک «دسته» چنین معنایی ندارد: دستهٔ مذهبی هم درسِ تفسیر و اخلاق
  // دارد و هم مجلسِ روضه. اگر سنجاقِ دسته داوری را کنار می‌زد، همان چیزی ساخته
  // می‌شد که شما خواستید ساخته نشود — و تخته هم هم‌زمان می‌گفت «آموزشی نیست».
  if (pin && pin.kind === 'series' && String(pin.value) === String(key)) return true;
  var ic = seriesIsCourse_(vals);
  if (ic === false) return false;
  return true;                     // بله، یا هنوز داوری‌نشده
}

/** فهرستِ مجموعه‌هایی که باید داوری شوند (تازه‌ها و داوری‌های کهنه). */
function seriesNeedingJudgement_(reg) {
  var out = [], roundSkipped = [];
  for (var i = 0; i < reg.rows.length; i++) {
    var v = reg.rows[i].vals;
    /* ۱۳.۰: دورِ داوریِ مفهومی — هر ردیفِ غیردستی (نادیده‌ها هم) یک بار با مدل از نو؛ نشانش در «دلیل» می‌ماند. نادیده‌ها
       آخرِ صف‌اند (اول آنچه در نوبت است)، و وضعیتشان عوض نمی‌شود. */
    if (judgeRoundOn_() && !judgeKeep_(v) && !judgeRoundDone_(v)) {
      reg.rows[i].__modelOnly = true; reg.rows[i].__round = true;
      if (String(v[SC.STATUS - 1] || '') === SST.SKIPPED) roundSkipped.push(reg.rows[i]); else out.push(reg.rows[i]);
      continue;
    }
    if (String(v[SC.STATUS - 1] || '') === SST.SKIPPED) continue;
    /* ۱۲.۶: ردیفِ دستیِ داوری‌ناقص یک بار دوباره با مدل داوری می‌شود — applyVerdict_ فقط شرح/دلیل/دستهٔ خودکار را می‌نویسد. */
    if ((String(v[SC.MANUAL - 1] || '').trim() || seriesManualLock_(v)) && judgeIncomplete_(v)) {
      reg.rows[i].__redoLocked = true; out.push(reg.rows[i]); continue;
    }
    if (String(v[SC.MANUAL - 1] || '').trim()) continue;   // نظرِ شما ثبت شده
    if (seriesManualLock_(v)) continue;   // شماره/دستهٔ دستی: داوری حق دخالت ندارد
    if (judgeKeep_(v) && String(v[SC.JUDGED - 1] || '').trim()) continue;   // ۱۳.۰: «مصباح، آئودی، … بماند» — داوریِ موجودشان
    // داوریِ بی‌مدل موقتی است. همین که مدل در دسترس باشد باید بازبینی شود، نه
    // سه روز بعد: کاربری که دکمهٔ داوری را می‌زند و «داوری‌نشده: ۰» می‌بیند،
    // فکر می‌کند مدل داوری کرده — درحالی‌که همهٔ تصمیم‌ها از قاعده آمده‌اند.
    // (بی قید و شرط: اگر این‌ها در فهرست نیایند، هیچ فراخوانی برای امتحانِ
    // دوبارهٔ مدل نمی‌ماند و نیم‌ساعتِ «کنارگذاشتن» به بی‌نهایت تبدیل می‌شود.)
    if (String(v[SC.WHY - 1] || '').indexOf(JUDGE_LOCAL_MARK) !== -1) {
      out.push(reg.rows[i]); continue;
    }
    if (seriesJudged_(v)) continue;
    out.push(reg.rows[i]);
  }
  return out.concat(roundSkipped);
}

/* ══ دورِ داوریِ مفهومی (۱۳.۰) ══
 * صاحبِ کانال: «همهٔ داوری‌های قبلیِ دسته و آموزشی؟ اعتبار ندارند و اگر درست هم باشند شانسی است.» علت‌ها، از خودِ کد:
 * (۱) تا ۱۲.۵ نمونه قطعهٔ **اول** سه قسمت بود — سلام و مقدمه؛ (۲) نامِ فایل در پرامپت پیش از متن می‌آمد؛ (۳) داوریِ بی‌مدل
 * (`localVerdict_`) واژه می‌شمرد و «آموزشی/نه» و دسته را **قطعی** می‌نوشت، و ۱۰۶ ردیف فقط همین را داشتند؛ (۴) دستهٔ خودکار
 * پیش‌فرضِ چند تصمیم بود. ۱۲.۶ ورودی را درست کرد (۱۰/۵۰/۹۰٪، عنوانِ همه، سرفصلِ جزوه) ولی فقط ردیف‌هایی که دوباره نوبت گرفتند
 * از آن بهره بردند. این دور همه را یک بار با همان ورودی از نو می‌سنجد؛ ردیفِ دستیِ او (و سه مجموعه‌ای که نام برد) نه. */
function judgeRoundOn_() { return !!String(CFG.JUDGE_ROUND || '').trim(); }
function judgeRoundMark_() { return '‹داوریِ مفهومیِ ' + String(CFG.JUDGE_ROUND || '') + '›'; }
function judgeRoundDone_(v) { return String(v[SC.WHY - 1] || '').indexOf(judgeRoundMark_()) !== -1; }
/** ردیفی که خودِ او تنظیم کرده: تصمیمِ دستی، شماره یا دستهٔ دستی — و نام‌های `JUDGE_KEEP_NAMES` (مصباح، آئودی، …). */
function judgeKeep_(v) {
  if (String(v[SC.MANUAL - 1] || '').trim()) return true;
  if (seriesManualLock_(v)) return true;
  var nm = txNorm(String(v[SC.NAME - 1] || '') + ' ' + String(v[SC.KEY - 1] || '')).toLowerCase();
  var keep = CFG.JUDGE_KEEP_NAMES || [];
  for (var i = 0; i < keep.length; i++) {
    var k = txNorm(String(keep[i] || '')).toLowerCase();
    if (k && nm.indexOf(k) !== -1) return true;
  }
  return false;
}
/** داوریِ این ردیف از مدل بوده (نه بی‌مدل)؟ — داوریِ بی‌مدل هرگز روی آن نمی‌نشیند. */
function judgedByModel_(v) {
  return !!String(v[SC.JUDGED - 1] || '').trim() && String(v[SC.WHY - 1] || '').indexOf(JUDGE_LOCAL_MARK) === -1 &&
         String(v[SC.ABOUT - 1] || '').indexOf('موضوع‌های پرتکرارِ متن') !== 0;
}
/** وضعِ دور ⇒ {on, total, done, left, leftSkipped, line} — فقط خواندنِ رجیستری. */
function judgeRoundStatus_(reg) {
  var out = { on: judgeRoundOn_(), total: 0, done: 0, left: 0, leftSkipped: 0, kept: 0, line: '' };
  if (!out.on) return out;
  for (var i = 0; i < reg.rows.length; i++) {
    var v = reg.rows[i].vals;
    if (judgeKeep_(v)) { out.kept++; continue; }
    out.total++;
    if (judgeRoundDone_(v)) out.done++;
    else { out.left++; if (String(v[SC.STATUS - 1] || '') === SST.SKIPPED) out.leftSkipped++; }
  }
  out.line = '🧭 داوریِ مفهومیِ ' + CFG.JUDGE_ROUND + ': ' + faDigitsOut_(String(out.done)) + ' از ' + faDigitsOut_(String(out.total)) +
             ' مجموعهٔ غیردستی' + (out.left ? ' · ' + faDigitsOut_(String(out.left)) + ' مانده (' + faDigitsOut_(String(out.leftSkipped)) + ' نادیده)' : ' · تمام') +
             ' · ' + faDigitsOut_(String(out.kept)) + ' ردیفِ دستی دست نخورد. نتیجه: تبِ «' + (CFG.SERIES_CAT_REVIEW_TAB || 'بازبینیِ دستهٔ مجموعه‌ها') + '».';
  return out;
}

// -------------------------------------------------------- نمونه‌برداریِ متن

/**
 * چند قطعهٔ نمایندهٔ یک مجموعه: از ۱۰٪ و ۵۰٪ و ۹۰٪ِ آن — تا هم شروع دیده شود
 * هم بدنه و هم پایان. متنِ خام از همان ستون‌هایی می‌آید که تولیدکننده استفاده می‌کند.
 */
function sampleSeriesText_(rec, partsOfKey, optsOpt) {
  var opts = optsOpt || {};
  var list = partsOfKey || [];
  var chars = Math.max(200, opts.chars || CFG.JUDGE_SAMPLE_CHARS || 2600);
  /* ۱۲.۶: نمونه از ۱۰٪ و ۵۰٪ و ۹۰٪ِ کلِ مجموعه (بر حسبِ شمارِ قطعه)، نه قطعهٔ اولِ سه قسمت. قطعهٔ اولِ هر قسمت
     معمولاً سلام و مقدمه است — مصباح با سه مقدمهٔ رسمی «سیاسی و خبری» خوانده شد. */
  var fracs = opts.fracs || CFG.JUDGE_SAMPLE_FRACS || [0.1, 0.5, 0.9];
  var want = Math.max(1, opts.samples || fracs.length);
  var tot = 0, span = [];
  for (var q = 0; q < list.length; q++) {
    var nq = Math.max(1, Number(list[q].vals[SP.CHUNKS - 1]) || 1);
    span.push({ i: q, from: tot, n: nq }); tot += nq;
  }
  var picks = [], seenPick = Object.create(null);
  for (var f = 0; f < fracs.length && picks.length < want && tot; f++) {
    var g = Math.min(tot - 1, Math.max(0, Math.floor(Number(fracs[f]) * tot)));
    for (var z = 0; z < span.length; z++) {
      if (g >= span[z].from && g < span[z].from + span[z].n) {
        var pk = span[z].i + ':' + (g - span[z].from + 1);
        if (!seenPick[pk]) { seenPick[pk] = 1; picks.push({ i: span[z].i, no: g - span[z].from + 1, pct: Math.round(Number(fracs[f]) * 100) }); }
        break;
      }
    }
  }
  var bits = [], errs = [], names = [], salvage = [];
  for (var p = 0; p < picks.length; p++) {
    var pr = list[picks[p].i];
    var nm = String(pr.vals[SP.NAME - 1] || '');
    if (names.indexOf(nm) === -1) names.push(nm);
    var seg;
    try {
      seg = readPartChunks_(pr, picks[p].no, chars, 1, 20);
      // شمارهٔ قطعه در شیت گاهی از ۱ پیوسته نیست؛ چیزی خوانده نشد ⇒ از آغازِ همان قسمت
      if (seg && !seg.error && !seg.chunks.length && picks[p].no > 1) seg = readPartChunks_(pr, 1, chars, 1, 20);
    }
    catch (e) { errs.push(e.message); continue; }
    if (!seg || seg.error) { errs.push((seg && seg.error) || 'نامعلوم'); continue; }
    var lbl = function (c) {
      return '[قسمت ' + (Number(pr.vals[SP.SEQ - 1]) || (picks[p].i + 1)) + ' · قطعهٔ ' + seg.chunks[c].no +
             ' · ~' + picks[p].pct + '٪ِ مجموعه]\n';
    };
    for (var c = 0; c < seg.chunks.length; c++) {
      var t = String(seg.chunks[c].text || '').trim();
      // کفِ ۶۰ نویسه؛ کوتاه‌تر فقط پشتوانه (مجلسی که قطعه‌هایش کوتاه‌اند نباید «بی‌متن» شود)
      if (t.length < 60) { if (t && salvage.length < 6) salvage.push(lbl(c) + t); continue; }
      bits.push(lbl(c) + t.slice(0, chars));
      break;
    }
  }
  if (!bits.length && salvage.length) bits = salvage.slice(0, Math.max(1, want));
  /* ۱۲.۶: عنوانِ همهٔ قسمت‌ها — نام نشانهٔ فرعی است، ولی فهرستِ کاملِ نام‌ها سیرِ مجموعه را نشان می‌دهد. */
  var all = [];
  for (var w = 0; w < list.length; w++) all.push(String(list[w].vals[SP.NAME - 1] || '').trim());
  var allT = all.filter(String).join(' ، ');
  if (allT.length > 1500) allT = allT.slice(0, 1500) + ' …';
  return { text: bits.join('\n\n'), samples: bits.length, errors: errs, partNames: names, allTitles: allT };
}

/** ۱۲.۶: سرفصل‌های جزوهٔ مجموعه (اگر هست) — فقط خواندن، و فقط وقتی پوشهٔ مجموعه از قبل ثبت است (هرگز پوشه نمی‌سازد). */
function judgeHandoutHeads_(rec) {
  try {
    var fid = String(rec && rec.vals && rec.vals[SC.FOLDER - 1] || '');
    if (!fid) return '';
    var it = DriveApp.getFolderById(fid).getFilesByName(handoutJsonName_());
    if (!it.hasNext()) return '';
    var b = JSON.parse(it.next().getBlob().getDataAsString());
    var L = [];
    (b && b.chapters || []).forEach(function (ch) {
      var secs = (ch.sections || []).map(function (x) { return String(x.title || ''); }).filter(String);
      L.push('«' + String(ch.title || '') + '»' + (secs.length ? ': ' + secs.join('، ') : ''));
    });
    var s = L.join(' | ');
    return s.length > 1200 ? s.slice(0, 1200) + ' …' : s;
  } catch (e) { return ''; }
}

// ------------------------------------------- داوریِ بی‌مدل (پشتیبانِ همیشگی)

/**
 * چرا این بخش وجود دارد.
 *
 * داوری سه بار پشت سر هم صفر ماند، چون مدل پاسخِ بی‌متن داد و کلِ دور دور
 * ریخته شد. نتیجه‌اش این بود که ۲۶۳ مجموعه بی‌دسته و بی‌سطح و بی‌ترتیب زیر هم
 * ماندند و فهرست همان آشفتگیِ روزِ اول را داشت. یک قابلیتی که برای کار کردنش
 * شرطِ «مدل حتماً جواب بدهد» گذاشته شده باشد، قابلیت نیست.
 *
 * پس همان قاعده‌ای که به مدل گفته می‌شود، این‌جا به‌شکلِ اجراشدنی هم هست: روی
 * همان متنی که برای مدل نمونه‌برداری شده (پس هیچ هزینهٔ اضافه‌ای ندارد)،
 * نشانه‌های «آموختنِ منظم» و نشانه‌های «مراسم و روایت» شمرده می‌شوند. تصمیم از
 * روی محتواست، نه نامِ فایل — همان چیزی که خواسته شده بود.
 *
 * محتاط است: فقط وقتی «بله» یا «خیر» قطعی می‌گوید که شواهد یک‌طرفه باشد؛ وگرنه
 * «مشکوک» می‌ماند تا مدل بعداً بازبینی کند. ولی دسته و سطح و ترتیب را در هر
 * حال می‌نویسد، چون فهرستِ بی‌نظم بدترین حالت است.
 */
var JUDGE_LOCAL_MARK = '[بی‌مدل]';
var JUDGE_PARTIAL_MARK = 'داوریِ ناقص';        // ۱۲.۶: شمارشِ واژه، نه فهمِ محتوا — دوباره با مدل داوری می‌شود
var JUDGE_REVIEW_MARK = 'نیازمند بازبینی';     // ۱۲.۶: اطمینانِ کمِ داور
var JUDGE_REDO_MARK = 'داوریِ دوبارهٔ ۱۲٫۶';   // ۱۲.۶: یک بار برای ردیف‌های دستیِ داوری‌ناقص

/** ۱۲.۶: داوریِ این ردیف ناقص است؟ (بی‌مدل یا «موضوع‌های پرتکرار»؛ ردیفی که هرگز داوری نشده «ناقص» نیست) — و هنوز یک بار دوباره داوری نشده. */
function judgeIncomplete_(v) {
  var why = String(v[SC.WHY - 1] || '');
  if (why.indexOf(JUDGE_REDO_MARK) !== -1) return false;
  return why.indexOf(JUDGE_LOCAL_MARK) !== -1 ||
         String(v[SC.ABOUT - 1] || '').indexOf('موضوع‌های پرتکرارِ متن') === 0;
}

// نشانه‌های «چیزی منظم آموزش داده می‌شود». «=» یعنی واژهٔ مستقل (تا «درس» در
// «مدرسه» شمرده نشود).
var JUDGE_EDU_SIGNS = [
  'تعریف می', 'تعریف کنیم', 'به این معنا', 'یعنی چه', 'مفهوم', 'قاعده', 'اصل اول',
  'فرض کنید', 'فرض کنیم', 'مثال', 'برای مثال', 'مثلا', 'تمرین', 'تکلیف',
  '=درس', 'درسِ', 'جلسه', 'جلسهٔ', '=فصل', 'مبحث', 'بحث امروز', 'موضوع امروز',
  'در ادامه', 'بنابراین', 'در نتیجه', 'نتیجه می', 'اثبات', 'قضیه', 'فرمول',
  'روش', 'مرحله', 'گام اول', 'قدم اول', 'اول اینکه', 'دوم اینکه', 'سوم اینکه',
  'نکته', 'نکتهٔ', 'توجه کنید', 'دقت کنید', 'خلاصه', 'مرور کنیم', 'یاد بگیر',
  'یاد می گیریم', 'آموزش', 'توضیح می دهم', 'توضیح بدهم', 'تقسیم می شود',
  'دسته بندی', 'تفاوت میان', 'اشتباه رایج', 'به طور کلی', 'شرط', 'کاربرد',
  'تحلیل', 'بررسی می کنیم', 'سوال', 'پاسخ', 'پرسش', 'مطالعه',
  // متنِ لاتینِ دوره‌های خارجی (The Great Courses و مانندش)
  'lecture', 'chapter', 'define', 'definition', 'for example', 'we will',
  'let us', 'in this lesson', 'theory', 'principle', 'exercise', 'summary',
  'introduction to', 'step one', 'notice that', 'suppose'
];

/**
 * نشانه‌های «مراسم و مرثیه» — دو دسته، و این تفکیک حیاتی است.
 *
 * درسِ یک بازبینیِ اجرایی: دستهٔ اول را با دستهٔ دوم قاتی کرده بودم، و نتیجه
 * این شد که «دورهٔ فلسفهٔ اخلاق» با شش قسمت و هفتاد و دو قطعه، «مراسم و مرثیه»
 * تشخیص داده شد — فقط چون جلسه‌اش با «بسم الله الرحمن الرحیم، اللهم صل علی
 * محمد و آل محمد، سلام علیکم» شروع می‌شد. تقریباً هر سخنرانی و درسِ فارسی
 * چنین آغازی دارد. این نشانه‌ها «ادبِ آغازِ سخن»اند، نه نشانهٔ مرثیه.
 */
// دستهٔ یکم — متمایز و قاطع: این‌ها در درسِ فیزیک و کلاسِ نویسندگی پیدا
// نمی‌شوند و اجازه دارند تصمیمِ «آموزشی نیست» را بگیرند.
var JUDGE_RITUAL_SIGNS = [
  'روضه', 'سینه زنی', 'سینهزنی', 'مداحی', 'مرثیه', 'نوحه', 'ذکر مصیبت',
  'شام غریبان', 'عزاداری', 'گریه کن', 'دسته عزا',
  'یا حسین', 'یا اباالفضل', 'یا زهرا', 'یا مهدی', 'لبیک یا',
  // شکلِ فینگلیش، چون نامِ خیلی از فایل‌ها لاتینِ حرف‌نویسی‌شده است
  'rowze', 'rouze', 'sinezani', 'sine zani', 'madahi', 'madihe', 'marsiye',
  'nohe', 'noha', 'azadari'
];
// دستهٔ یکِ‌ونیم — هم‌بسته با مراسم، ولی در درسِ تاریخ و مردم‌شناسی و ادبیات هم
// فراوان‌اند («تاریخ عزاداری در ایران»، «مقتل‌نگاری در ادبیات فارسی»). فقط در
// نمره اثر دارند و هرگز خودشان کنارگذارنده نیستند.
var JUDGE_RITUAL_WEAK_SIGNS = [
  'مصیبت', 'اربعین', 'شهادت حضرت', 'میلاد حضرت', 'شب قدر', 'مقتل',
  'زیارتنامه', 'مناجات', 'توسل', 'هیئت', 'عزادار', 'محرم', 'عاشورا', 'کربلا',
  'heyat', 'maghtal', 'moharram'
];
// دستهٔ دوم — ادبِ آغازِ سخن: در نمرهٔ نهایی وزنِ خیلی کم دارند و هرگز
// خودشان تصمیمِ «آموزشی نیست» را نمی‌گیرند.
var JUDGE_DEVOTIONAL_SIGNS = [
  'بسم الله', 'اللهم', 'صلی الله علیه', 'علیه السلام', 'سلام الله علیها',
  'عجل الله', 'صلوات', 'الحمدلله', 'ان شاء الله', 'انشاالله', 'رحمه الله',
  'سلام علیکم', 'اعوذ بالله', 'رب العالمین', 'یا علی', 'یا رب'
];

// نشانه‌های «گپ و پیامِ شخصی و کلیپِ سرگرمی»
var JUDGE_CHAT_SIGNS = [
  'سلام خوبی', 'چطوری', 'کجایی', 'قربونت', 'فدات', 'دوستت دارم',
  'تولدت مبارک', 'عیدت مبارک', 'زنگ زدم', 'جواب بده', 'پیام بده',
  'واتساپ', 'تلگرام', 'اینستا', 'لایک', 'سابسکرایب', 'کامنت بذار',
  'تخفیف', 'همین حالا سفارش', 'لینک در بیو', 'کد تخفیف'
];

// واژه‌های پرتکرارِ بی‌بار — از «موضوعِ متن» بیرون گذاشته می‌شوند
var JUDGE_STOP = (' که این آن برای است بود شد می را با از در به هم یک دو تا ' +
  'ولی اما پس چون اگر خیلی بسیار همه هیچ چیز کار بله خب حالا الان دیگه دیگر ' +
  'وقتی چطور چگونه کدام کسی کسانی اینجا آنجا خودش خودم شما آنها اینها بعد قبل ' +
  'روی زیر بالا کنار مثل مانند یعنی البته یا و نه آیا شاید باید نباید کنم کنیم ' +
  'کنید کند کردن کرده کردم شود شوند شویم داریم دارید دارند دارم داشت هستند ' +
  'هستیم هستید نیست بودند بودم گفت گفتم گفته میگه میگم بگم بگیم اون این ' +
  'the and that this for with have from you was are not but they what when ' +
  'which there their would could about into more some very will can just ').split(/\s+/);

/** چند نشانهٔ *متفاوت* از این فهرست در متن هست. یک واژهٔ تکراری می‌تواند شمارشِ
 *  کل را بالا ببرد؛ تنوعِ نشانه‌ها شاهدِ محکم‌تری است و تصمیمِ «آموزشی نیست»
 *  باید بر همین تکیه کند، نه بر تکرارِ یک عبارت. */
function signDistinct_(t, list) {
  var n = 0;
  for (var i = 0; i < list.length; i++) {
    var s = String(list[i] || '');
    var exact = s.charAt(0) === '=';
    if (exact) s = s.slice(1);
    s = txNorm(s).trim();
    if (!s) continue;
    if (t.indexOf(exact ? ' ' + s + ' ' : s) !== -1) n++;
  }
  return n;
}

/** شمارشِ نشانه‌ها در متنِ نرمال‌شده. هر نشانه حداکثر سه بار شمرده می‌شود تا یک
 *  واژهٔ تکراری کلِ داوری را نبرد. */
function signHits_(t, list) {
  var n = 0;
  for (var i = 0; i < list.length; i++) {
    var s = String(list[i] || '');
    var exact = s.charAt(0) === '=';
    if (exact) s = s.slice(1);
    s = txNorm(s).trim();
    if (!s) continue;
    var needle = exact ? ' ' + s + ' ' : s;
    var at = t.indexOf(needle), c = 0;
    while (at !== -1 && c < 3) { c++; at = t.indexOf(needle, at + s.length); }
    n += c;
  }
  return n;
}

/** سطح، از خودِ متن. */
function localLevel_(t, chunks) {
  if (/ (مقدماتی|مقدمه|مبانی|پایه|اصول اولیه|ابتدایی|شروع کار|beginner|basics|introduction|elementary) /.test(t)) {
    return 'مقدماتی';
  }
  if (/ (پیشرفته|تخصصی|حرفه ای|عمیق|advanced|professional|expert) /.test(t)) return 'پیشرفته';
  return 'میانی';
}

/** پرتکرارترین واژه‌های بامعنیِ متن — تا فهرست، حتی با نامِ بی‌معنی، خوانا شود. */
function localTopWords_(t, howMany) {
  var words = String(t || '').split(' ');
  var freq = Object.create(null), order = [];
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (!w || w.length < 4) continue;
    if (/[0-9]/.test(w)) continue;
    if (JUDGE_STOP.indexOf(w) !== -1) continue;
    if (!Object.prototype.hasOwnProperty.call(freq, w)) { freq[w] = 0; order.push(w); }
    freq[w]++;
  }
  order.sort(function (a, b) {
    if (freq[b] !== freq[a]) return freq[b] - freq[a];
    return b.length - a.length;
  });
  return order.filter(function (w) { return freq[w] > 1; }).slice(0, howMany || 6);
}

/**
 * داوری بی هیچ تماسی با مدل، از روی همان متنِ نمونه‌برداری‌شده.
 * خروجی‌اش عیناً شکلِ داوریِ مدل است تا applyVerdict_ همان‌طور مصرفش کند.
 */
function localVerdict_(entry) {
  var raw = String((entry && entry.text) || '');
  var t = txNorm(raw);
  var nm = txNorm(String(((entry && entry.partNames) || []).join(' ')) + ' ' +
                  String((entry && entry.name) || ''));
  var edu = signHits_(t, JUDGE_EDU_SIGNS);
  var rit = signHits_(t, JUDGE_RITUAL_SIGNS);
  var ritD = signDistinct_(t, JUDGE_RITUAL_SIGNS);
  var ritW = signHits_(t, JUDGE_RITUAL_WEAK_SIGNS);
  var dev = signHits_(t, JUDGE_DEVOTIONAL_SIGNS);
  var chat = signHits_(t, JUDGE_CHAT_SIGNS);
  var ritN = signDistinct_(nm, JUDGE_RITUAL_SIGNS);
  var nParts = Number(entry && entry.parts) || 1;
  var nChunks = Number(entry && entry.chunks) || 0;
  var thin = String(raw).trim().length < (CFG.JUDGE_MIN_SAMPLE_CHARS || 900);

  var struct = (nParts >= 3 ? 6 : 0) + (nChunks >= 20 ? 6 : (nChunks >= 10 ? 3 : 0));
  var score = 50 + 3.5 * edu - 6 * rit - 1.5 * ritW - 4 * chat - 2 * ritN - 0.5 * dev + struct;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // تصمیم فقط وقتی قطعی است که شواهد یک‌طرفه باشد. «نمی‌دانم» را «آموزشی نیست»
  // ثبت نمی‌کنیم؛ آن اشتباه یک دورهٔ واقعی را چهل‌وپنج روز کنار می‌گذارد.
  // «خیر» فقط با شواهدِ متمایز: «یا حسین» و «سینه‌زنی» در درسِ فیزیک پیدا
  // نمی‌شوند، پس نشانهٔ مراسم قابل‌اعتماد است.
  // «بله» فقط با شواهدِ فراوان و بی هیچ نشانهٔ مراسم؛ وگرنه «مشکوک» — که هم
  // در صفِ تولید می‌ماند و هم دو روز بعد دوباره با مدل بازبینی می‌شود. این
  // احتیاط عمدی است: یک «بله»ِ سهل‌انگارانه همان روضه‌ای را به درس‌نامه
  // برمی‌گرداند که قرار بود بیرون بماند.
  var verdict = null, falseBy = '';                      // null یعنی مشکوک
  // شمارِ نشانه‌های *متفاوت* معیارِ اصلی است، و برای مجموعهٔ چندقسمتی سخت‌گیرانه‌تر:
  // یک ضبطِ واقعیِ روضه چندین نشانهٔ متفاوت دارد (روضه، سینه‌زنی، مداحی، نوحه،
  // یا حسین)، ولی درسِ «مردم‌شناسیِ عزاداری» یکی-دو تا. این تفکیک همان مرزی است
  // که مجلسِ عزا را بیرون می‌گذارد و درسِ دربارهٔ عزا را نگه می‌دارد.
  var needD = nParts >= 3 ? 3 : 2;
  if (rit >= 3 && ritD >= needD && rit >= edu) { verdict = false; falseBy = 'rit'; }
  else if (chat >= 5 && chat > 2 * edu) { verdict = false; falseBy = 'chat'; }
  else if (edu >= 8 && rit === 0 && chat <= 2 && nChunks >= (CFG.SERIES_MIN_CHUNKS || 4)) {
    verdict = true;
  }
  // یک مجموعهٔ چندقسمتی، «دوره» بودنش شاهدِ ساختاریِ قوی است. کنارگذاشتنش به
  // اتهامِ «مراسم» باید شاهدِ متمایزِ فراوان بخواهد، نه یک شمارشِ نزدیک — وگرنه
  // دورهٔ واقعی به فهرستِ «آموزشی نیست» می‌رود. (این احتیاط برای نشانه‌های «گپ
  // و پیامِ شخصی» لازم نیست: ضبطِ سه‌قسمتیِ گفت‌وگوی خانوادگی هم دوره نیست.)
  if (falseBy === 'rit' && nParts >= 3 && rit < edu + 3) verdict = null;
  // و اگر هیچ متنِ قابلِ استفاده‌ای نبود، تنها شاهدِ موجود نامِ فایل است. این
  // آخرین چاره است، نه قاعدهٔ اول: مجلسِ روضه‌ای که قطعه‌هایش کوتاه‌تر از حدِ
  // نمونه‌برداری است، وگرنه «مشکوک» می‌ماند و نوبتِ درس‌نامه می‌گیرد.
  if (thin && ritN >= 1) verdict = false;

  var kind = verdict === false
    ? (rit >= 3 || ritN >= 2 ? 'مراسم یا مرثیه' : 'گپ یا پیامِ شخصی')
    : (verdict === true ? (nParts >= 3 ? 'دورهٔ چندجلسه‌ای' : 'سخنرانیِ آموزشی')
                        : 'نامعلوم — نیازمندِ بازبینی');

  var top = localTopWords_(t, 6);
  var cat = MISC_TITLE;
  try {
    // دسته از خودِ متن: نام فقط برچسبِ کمکی است و متن، بدنهٔ اصلی.
    var cl = txClassify(String((entry && entry.name) || ''), top.join(' '),
                        String((entry && entry.hint) || ''), raw.slice(0, 4000));
    if (cl && cl.title) cat = cl.title;
  } catch (e) {}

  var about = top.length
    ? 'موضوع‌های پرتکرارِ متن: ' + top.join('، ')
    : 'متنِ نمونه برای تشخیصِ موضوع کافی نبود';
  var why = (thin && ritN >= 1)
    ? ('متنِ قابلِ استفاده‌ای خوانده نشد؛ داوری از رویِ نامِ فایل: ' + ritN +
       ' نشانهٔ مراسم در نام.')
    : ('داوری از روی متن، بی مدل: ' + edu + ' نشانهٔ آموزشی، ' + rit +
       ' نشانهٔ مراسم/مرثیه، ' + chat + ' نشانهٔ گپ' +
       (dev ? '، ' + dev + ' عبارتِ آغازِ سخن (بی‌اثر در تصمیم)' : '') +
       (struct ? '، ساختارِ ' + nParts + ' قسمت / ' + nChunks + ' قطعه' : '') + '.');

  return {
    key: entry && entry.key, isCourse: verdict === true ? 'true' : 'false',
    score: String(score), kindOfContent: kind, about: about,
    topic: top.slice(0, 4).join('، '), category: cat,
    level: localLevel_(t, nChunks), related: '',
    orderHint: String(localLevel_(t, nChunks) === 'مقدماتی' ? 1
                      : (localLevel_(t, nChunks) === 'میانی' ? 50 : 90)),
    why: why, __local: true, __unsure: verdict === null
  };
}

// ------------------------------- در دسترس بودنِ مدلِ داوری (حافظهٔ کوتاه‌مدت)

/** چند میلی‌ثانیه دیگر سراغِ مدلِ داوری نمی‌رویم. */
function aiJudgeCooldown_() {
  try {
    var v = props_().getProperty(PK.JUDGE_NOAI);
    if (!v) return 0;
    var until = Number(v);
    if (!isFinite(until)) return 0;
    var left = until - new Date().getTime();
    return left > 0 ? left : 0;
  } catch (e) { return 0; }
}

/** مدل جواب نداد: نیم‌ساعت دیگر سراغش نمی‌رویم و با قاعده‌های خودی جلو می‌رویم.
 *  بی این حافظه، هر اجرا چند فراخوانِ بی‌فایده خرج می‌کرد و وقتش را می‌سوزاند. */
function setAiJudgeCooldown_() {
  try {
    props_().setProperty(PK.JUDGE_NOAI,
      String(new Date().getTime() + (CFG.JUDGE_NOAI_MIN || 30) * 60000));
  } catch (e) {}
}

function clearAiJudgeCooldown_() {
  try { props_().deleteProperty(PK.JUDGE_NOAI); } catch (e) {}
}

// ---------------------------------------------------------------- داوری

function judgePrompt_(entries, catsOpt) {
  var L = [];
  L.push('تو سردبیرِ یک آرشیوِ شخصیِ بزرگ هستی. برای هر «مجموعه» زیر، تکه‌هایی از ' +
         'متنِ واقعیِ خودش آمده است (پیاده‌سازیِ صدا یا متنِ استخراج‌شدهٔ سند). ' +
         'قرار است تصمیم بگیری کدام‌ها به یک پادکستِ آموزشیِ درس‌به‌درس تبدیل شوند.');
  L.push('');
  L.push('قاعدهٔ تشخیص — بر پایهٔ خودِ متن، نه نامِ فایل. نام فایل می‌تواند گمراه‌کننده باشد:');
  L.push('• نامِ بی‌محتوا («جلسه دوم»، «Standard recording»، فقط شماره) هیچ نشانه‌ای نیست: موضوع و دسته را فقط از متن، ' +
         'نامِ قطعه‌ها و نامِ تب/پوشهٔ منبع بگیر.');
  L.push('• «آموزشی» یعنی محتوا چیزی را منظم یاد می‌دهد: مفهوم را تعریف می‌کند، ' +
         'مرحله‌به‌مرحله جلو می‌رود، مثال و تمرین و اشتباهِ رایج دارد، یا دانشی را ' +
         'ساخت‌یافته منتقل می‌کند. سخنرانیِ تخصصی و مصاحبهٔ عمیقِ کارشناسی هم ' +
         'آموزشی حساب می‌شود، به شرط اینکه واقعاً چیزی بیاموزد.');
  L.push('• «آموزشی نیست»: مرثیه و روضه و سینه‌زنی و مدیحه، مناسبت و مراسم، ' +
         'دعا و زیارت، دورهمی و گپِ خانوادگی، کلیپِ خبری و تبلیغاتی، موسیقی و ' +
         'کلیپِ سرگرمی، خاطره‌گویی بی‌ساختار، تماس و پیامِ شخصی، و هر متنی که ' +
         'صرفاً روایت یا اجرا است و آموزشی در آن نیست. این‌ها ممکن است بسیار ' +
         'ارزشمند باشند — ولی جای‌شان این پادکستِ آموزشی نیست.');
  L.push('• اگر متنِ نمونه کوتاه یا نامفهوم است، محتاط باش: isCourse را false بگذار ' +
         'و در why بنویس که نمونه کافی نبود.');
  L.push('');
  /* ۱۳.۰: «توجیهِ» داور — داوری‌های پیشین از کجا اشتباه می‌فهمیدند و فهمِ درست یعنی چه. */
  L.push('چگونه بفهمی (این مهم‌ترین بخش است) — داوری‌های پیشینِ این آرشیو بیشترشان اشتباه بودند، چون از این‌ها می‌فهمیدند:');
  L.push('  ✗ از نامِ فایل («جلسه ۳»، «Standard recording»، یا نامی که موضوعِ دیگری را تداعی می‌کند)؛');
  L.push('  ✗ از چند جملهٔ اول — سلام، معرفی، «بسم‌الله»، مقدمهٔ رسمی یا خبرِ روز، که موضوعِ مجموعه نیستند؛');
  L.push('  ✗ از شمارشِ واژه‌های پرتکرار؛  ✗ از دسته‌ای که پیش‌تر خودکار حدس زده شده بود.');
  L.push('فهمِ درست یعنی خواندنِ مفهومیِ سرتاسرِ مجموعه: عنوانِ **همهٔ** قسمت‌ها به ترتیب (سیرِ مجموعه)، سه نمونه از ۱۰٪ و ۵۰٪ و ۹۰٪، ' +
         'و سرفصل‌های جزوه اگر هست. بپرس: این مجموعه در کلِ خودش دربارهٔ چیست (موضوعِ واقعی)، به چه شکلی ارائه می‌شود (قالب)، ' +
         'برای چه کسی (مخاطب)، و کدام جملهٔ خودِ متن این را نشان می‌دهد (شاهد).');
  L.push('• اگر سه نمونه با هم نمی‌خوانند، موضوع را از عنوانِ همهٔ قسمت‌ها و سیرشان بگیر، و اطمینان را پایین بیاور.');
  L.push('• «دربارهٔ X آموزش می‌دهد» با «X است» فرق دارد: «آموزشِ مداحی» (فن، تمرین، اشتباهِ رایج) آموزشی است، ولی ضبطِ یک مجلسِ مداحی نیست؛ ' +
         '«تاریخِ عزاداری» آموزشی است، ولی خودِ مجلسِ روضه نیست. کتابِ درسیِ ریاضی به زبانِ انگلیسی («Thinking Mathematically») هم آموزشی است.');
  L.push('');
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    L.push('─────────────────────────────────');
    L.push('key: ' + e.key);
    L.push('نامِ فایل‌ها: ' + (e.partNames.join(' ، ') || '—') +
           '   (نام صرفاً یک نشانهٔ فرعی است)');
    L.push('نوع: ' + e.kind + ' | شمارِ قسمت: ' + e.parts + ' | شمارِ قطعه: ' + e.chunks +
           ' | منبع: ' + e.src + (e.tab ? ' | تب/پوشهٔ منبع: ' + e.tab : ''));
    if (e.allTitles) L.push('عنوانِ همهٔ قسمت‌ها به ترتیب: ' + e.allTitles);
    if (e.heads) L.push('سرفصل‌های جزوه‌ای که از درس‌های ساخته‌شدهٔ همین مجموعه درآمده: ' + e.heads);
    L.push('— متنِ نمونه (از ۱۰٪ و ۵۰٪ و ۹۰٪ِ مجموعه) —');
    L.push(e.text || '(هیچ متنی خوانده نشد)');
  }
  L.push('─────────────────────────────────');
  L.push('');
  L.push('برای هر key دقیقاً یک داوری بده:');
  L.push('• isCourse: «true» یا «false» (به‌شکلِ رشته) — بر پایهٔ قاعدهٔ بالا.');
  L.push('• courseSure: اطمینانت به همین isCourse، عددِ ۰ تا ۱۰۰ به‌شکلِ رشته. مقدمه و سلامِ آغازِ جلسه را ملاکِ موضوع نگیر؛ ' +
         'اگر سه نمونه با هم نمی‌خوانند یا متن کم است، پایین بگذار.');
  L.push('• score: عددِ ۰ تا ۱۰۰ به‌شکلِ رشته، «چقدر برای یک پادکستِ آموزشیِ ' +
         'درس‌به‌درس مناسب است». فقط رقمِ لاتین بنویس.');
  L.push('• kindOfContent: در دو-سه واژه بگو واقعاً چیست (مثلاً «دورهٔ آموزشی»، ' +
         '«سخنرانی تخصصی»، «مرثیه و روضه»، «کلیپ خبری»، «گفت‌وگوی خانوادگی»).');
  L.push('• about: یک جملهٔ فارسیِ روشن و مشخص (حداکثر ۲۵ واژه) که بگوید محتوای این ' +
         'مجموعه دقیقاً دربارهٔ چیست. باید طوری باشد که کسی که نامِ فایل را نمی‌فهمد، ' +
         'از همین یک جمله موضوع را بفهمد. کلی‌گویی نکن.');
  L.push('• topic: موضوع در حداکثر پنج واژهٔ فارسی.');
  var cats = (catsOpt && catsOpt.length) ? catsOpt : seriesCatList_(null);
  L.push('• category: دقیقاً یکی از این نام‌ها، بی هیچ تغییر:');
  L.push('  ' + cats.join(' · '));
  /* ۱۱.۹: مرزِ دسته‌هایی که بیشتر قاطی شدند — تعریف از پیکربندی، نه از حافظهٔ مدل. */
  (CFG.SERIES_EXTRA_CATS || []).forEach(function (x) { if (x && x.title && x.def) L.push('  ◦ «' + x.title + '»: ' + x.def); });
  L.push('  ◦ «علمی و آموزشی» برای علم، فناوری، پزشکی، ریاضی و زبان است؛ هنر و نویسندگی (فیلم‌نامه، داستان، شعر) ⇒ «فرهنگی، تاریخی و ادبی» یا «موسیقی و هنر».');
  L.push('• catSure: اطمینانت به همین دسته، عددِ ۰ تا ۱۰۰ به‌شکلِ رشته. اگر متن کم یا نامفهوم است، پایین بگذار — حدسِ مطمئن‌نما بدتر از «نمی‌دانم» است.');
  L.push('• level: یکی از «مقدماتی» / «میانی» / «پیشرفته» — بر پایهٔ سختیِ خودِ متن.');
  L.push('• orderHint: اگر چند مجموعه در یک دسته‌اند، ترتیبِ یادگیریشان را با عددِ ' +
         'کوچک‌به‌بزرگ نشان بده (۱ یعنی باید اول شنیده شود).');
  L.push('• related: کلیدِ نزدیک‌ترین مجموعهٔ هم‌موضوع در همین فهرست، وگرنه رشتهٔ خالی.');
  L.push('• form: قالبِ ارائه در یکی-دو واژه: «درسِ کلاسی»، «سخنرانی»، «مناظره»، «گفت‌وگو»، «داستان/روایت»، «مراسم»، «خبر»، «کتابِ صوتی»، «پادکست»، …');
  L.push('• audience: مخاطب در چند واژه (مثلاً «دانشجوی فلسفه»، «عمومی»، «طلبه»، «کودک»، «علاقه‌مندِ بورس»).');
  L.push('• evidence: یک جملهٔ کوتاه (حداکثر ۲۰ واژه) **عیناً از خودِ متنِ نمونه** که موضوع و قالب را نشان می‌دهد — نه از نامِ فایل.');
  L.push('• why: در یک جملهٔ کوتاهِ فارسی بگو چرا این تصمیم را گرفتی. اگر آموزشی ' +
         'نیست، صریح بگو چه چیزی هست — این جمله عیناً به کاربر نشان داده می‌شود.');
  L.push('');
  L.push('هیچ key‌ای را جا نیندازد و هیچ چیزی از خودت اضافه نکن.');
  return L.join('\n');
}

/** نمونه‌برداری و بسته‌بندیِ چند مجموعه برای داوری. */
function entriesFor_(slice, parts, optsOpt) {
  var out = [];
  for (var i = 0; i < slice.length; i++) {
    var v = slice[i].vals;
    var smp = sampleSeriesText_(slice[i], parts.byKey[slice[i].key], optsOpt);
    out.push({ key: slice[i].key, name: String(v[SC.NAME - 1] || ''),
               kind: String(v[SC.KIND - 1] || ''),
               parts: v[SC.PARTS - 1], chunks: v[SC.CHUNKS - 1],
               src: String(v[SC.SRC - 1] || ''), hint: String(v[SC.TOPIC - 1] || ''), tab: String(v[SC.TAB - 1] || ''),
               partNames: smp.partNames, text: smp.text, samples: smp.samples,
               allTitles: smp.allTitles || '', heads: judgeHandoutHeads_(slice[i]) });
  }
  return out;
}

/**
 * نوشتنِ چند ردیف با کمترین شمارِ فرمان: ردیف‌های پشت‌سرهم در یک فرمان.
 *
 * دو درسِ گران در این تابع نشسته است. یکی: «از ردیفِ ۲ تا n بنویس» فقط وقتی
 * درست است که شمارهٔ ردیف‌ها پیوسته باشد؛ اگر کاربر یک ردیف در جدول اضافه کند
 * یا سلولِ کلیدِ یک ردیف را خالی کند، readSeriesReg_ آن ردیف را نمی‌خوانَد و
 * از آن پس هر نوشتنِ یک‌باره، همهٔ ردیف‌های پایین‌تر را یک خانه بالا می‌نویسد —
 * یعنی نابودیِ خاموشِ داده. دوم: نوشتنِ ردیف‌به‌ردیف با سیصد ردیف از سقفِ
 * شش‌دقیقه‌ای رد می‌شود. این تابع هر دو را رعایت می‌کند.
 */
function writeRowsBatched_(sheet, recs, width) {
  if (!sheet || !recs || !recs.length) return true;
  var sorted = recs.slice().sort(function (a, b) { return a.row - b.row; });
  var okAll = true, i = 0;
  while (i < sorted.length) {
    var j = i;
    while (j + 1 < sorted.length && sorted[j + 1].row === sorted[j].row + 1) j++;
    var block = [];
    for (var k = i; k <= j; k++) {
      var v = sorted[k].vals.slice(0, width);
      while (v.length < width) v.push('');
      block.push(v);
    }
    try { sheet.getRange(sorted[i].row, 1, block.length, width).setValues(block); }
    catch (e) { okAll = false; logLine_('نوشتنِ دسته‌ایِ رجیستری ناموفق: ' + e.message); }
    i = j + 1;
  }
  return okAll;
}

/**
 * نوشتنِ نتیجهٔ داوری — و فقط ستون‌هایی که داوری مالکشان است.
 *
 * چرا نه «کلِ جدول را از روی عکسِ خودم بنویس»: داوری تا چهار دقیقه طول می‌کشد
 * و در همان فاصله شما ممکن است روی تخته دکمهٔ «آموزشی نیست» را بزنید، یا
 * اجرای دیگری قسمتِ ساخته‌شده‌ای را ثبت کند. نوشتنِ یک‌بارهٔ کلِ جدول از روی
 * عکسِ چهار دقیقه پیش، آن تصمیم‌ها را بی‌صدا پاک می‌کرد — و بدترین حالتش این
 * بود که مجموعه‌ای که خودتان کنار گذاشته بودید، برمی‌گشت به فهرستِ درس‌نامه.
 */
function writeJudgeCols_(hub, reg, touched) {
  if (!reg || !reg.rows || !reg.rows.length) return false;
  var OWN = [SC.IS_COURSE, SC.CSCORE, SC.ABOUT, SC.WHY, SC.JUDGED,
             SC.TOPIC, SC.LEVEL, SC.CAT, SC.RELATED, SC.UPDATED];
  var fresh;
  try { fresh = readSeriesReg_(hub); }
  catch (e) { logLine_('خواندنِ دوبارهٔ رجیستری پیش از نوشتن ناموفق: ' + e.message); return false; }
  var recs = [], missing = 0;
  for (var i = 0; i < reg.rows.length; i++) {
    var key = reg.rows[i].key;
    if (touched && !Object.prototype.hasOwnProperty.call(touched, key)) continue;
    var f = Object.prototype.hasOwnProperty.call(fresh.byKey, key) ? fresh.byKey[key] : null;
    if (!f) { missing++; continue; }           // ردیف در این فاصله رفته است
    for (var c = 0; c < OWN.length; c++) f.vals[OWN[c] - 1] = reg.rows[i].vals[OWN[c] - 1];
    recs.push(f);
  }
  if (!recs.length) return { ok: true, reg: fresh, missing: missing };
  var okAll = writeRowsBatched_(fresh.sheet, recs, SERIES_HEADERS.length);
  // «fresh» را برمی‌گردانیم تا رتبه‌بندیِ بعدی روی همان دادهٔ تازه کار کند، نه
  // روی عکسِ کهنه‌ای که شمارهٔ ردیف‌هایش هم ممکن است دیگر درست نباشد.
  return { ok: okAll, reg: fresh, missing: missing };
}

/**
 * یک دور داوری. بودجه‌دار و ادامه‌پذیر: تا سرِ مهلت پیش می‌رود و بقیه به اجرای
 * بعد می‌ماند، تا از سقفِ شش‌دقیقه‌ای رد نشویم.
 *
 * دو مرحله دارد، و همین دو مرحله‌ای بودن است که «۰ از ۲۶۳» را ناممکن می‌کند:
 *   ۱) داوری با مدل — دقیق‌تر. اگر یک دسته شکست خورد، دستهٔ کوچک‌ترِ تکی امتحان
 *      می‌شود (چون گاهی فقط یک متنِ خاص است که از صافیِ محتوا رد نمی‌شود).
 *   ۲) اگر مدل تکی هم جواب نداد، همان مجموعه‌ها با قاعده‌های صریحِ خودمان روی
 *      همان متن داوری می‌شوند و نیم‌ساعت دیگر سراغِ مدل نمی‌رویم.
 * در هر حال، ترتیبِ درونِ دسته‌ها در پایانِ کار بازچینی می‌شود — حتی اگر هیچ
 * داوریِ تازه‌ای انجام نشده باشد؛ چون فهرستِ بی‌نظم بدترین خروجی است.
 */
function judgeSeries(force, deadline, regOpt, localOnly) {
  var hub = getHub_();
  var reg = regOpt || readSeriesReg_(hub);
  var parts = readSeriesParts_(hub);
  var todo = force ? reg.rows.filter(function (r) {
      return String(r.vals[SC.STATUS - 1] || '') !== SST.SKIPPED &&
             !String(r.vals[SC.MANUAL - 1] || '').trim() &&
             !seriesManualLock_(r.vals) &&   // حتی «داوریِ همه از نو» هم قفلِ دستی را نمی‌شکند
             !(judgeKeep_(r.vals) && String(r.vals[SC.JUDGED - 1] || '').trim());   // ۱۳.۰: نام‌های «بماند» فقط داوریِ موجودشان را نگه می‌دارند
    }) : seriesNeedingJudgement_(reg);
  // در حالتِ «بی‌مدل»، ردیفی که همین حالا با قاعده داوری شده دوباره داوری
  // نمی‌شود: کارِ تکراری است و چیزی به آن اضافه نمی‌کند. بازبینیِ آن‌ها کارِ
  // مدل است، در دورهای عادی.
  if (localOnly) {
    todo = todo.filter(function (r) { return !r.__redoLocked && !r.__modelOnly && !seriesJudged_(r.vals); });
  }
  if (!todo.length) {
    // چیزی برای داوری نیست، ولی نظمِ فهرست همیشه باید درست باشد
    var rk0 = { changed: 0 };
    try { rk0 = rankWithinCategories_(hub, reg); } catch (eR0) {}
    return { judged: 0, left: 0, skipped: true, ranked: rk0.changed };
  }

  var stopAt = deadline || (new Date().getTime() + 150 * 1000);
  // بخشی از مهلت برای مرحلهٔ بی‌مدل کنار گذاشته می‌شود. بی این ذخیره، یک مدلِ
  // کند یا «۵۰۳ شلوغ» کلِ مهلت را با انتظار می‌خورد و مرحلهٔ دوم — که تضمین
  // می‌کند فهرست بی‌داوری نماند — درست روی اولین آزمونِ مهلت متوقف می‌شد و
  // نتیجه دوباره «۰» بود.
  var span = Math.max(0, stopAt - new Date().getTime());
  var aiStopAt = stopAt - Math.max(20000, Math.round(span * 0.4));
  var per = Math.max(1, CFG.JUDGE_BATCH || 3);
  var maxBatches = Math.max(1, CFG.JUDGE_BATCHES_PER_RUN || 40);
  var judged = 0, batches = 0, noText = 0, localN = 0, dirty = false;
  var noTextSeen = Object.create(null), touched = Object.create(null);
  var awaiting = 0;
  var aiFail = '', aiDown = false, singleFails = 0;
  var cool = aiJudgeCooldown_();
  var useAi = !localOnly;
  // در دورهٔ «کنارگذاشتن»، باز هم یک فراخوانِ تکی امتحان می‌شود. حافظهٔ کورِ
  // نیم‌ساعته یعنی اگر مدل ده ثانیه بعد سرِ حال بیاید، ما نیم ساعت با
  // قاعده‌های ضعیف‌تر کار کرده‌ایم. یک فراخوانِ آزمایشی ارزانش است.
  var probing = !!cool && useAi;
  if (probing) {
    per = 1;
    logLine_('داوری: مدل بارِ قبل جواب نداد؛ یک فراخوانِ آزمایشی امتحان می‌شود.');
  }

  // ───────────────────────── مرحلهٔ ۱: داوری با مدل ─────────────────────────
  for (var b = 0; useAi && b < maxBatches && todo.length; b++) {
    // و یک فراخوانِ تازه را وقتی شروع نمی‌کنیم که وقتِ تمام‌کردنش نمانده
    if (new Date().getTime() > aiStopAt - 15000) break;
    var slice = todo.splice(0, per);
    var entries = entriesFor_(slice, parts);
    // یک مجموعه که دوباره نمونه‌برداری می‌شود (چون دسته تکی شد) نباید دو بار در
    // شمارشِ «متنِ نمونه نداشت» بیاید؛ وگرنه به کاربر می‌گوییم پنج مجموعه از دو
    // مجموعه‌اش بی‌متن بوده‌اند.
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].samples) continue;
      if (Object.prototype.hasOwnProperty.call(noTextSeen, entries[i].key)) continue;
      noTextSeen[entries[i].key] = 1; noText++;
    }

    var out = null, callErr = null;
    try { out = geminiText_(judgePrompt_(entries, seriesCatList_(reg)), JUDGE_SCHEMA, CFG.JUDGE_MAX_TOKENS || 24576); }
    catch (e) { callErr = e; }

    if (!callErr) {
      var usable = 0;
      var byKey = Object.create(null);
      var vs = (out && out.verdicts) || [];
      for (var q = 0; q < vs.length; q++) {
        // یک عضوِ null در پاسخ، پیش‌تر کلِ دورِ داوری را می‌کشت — و چون همهٔ
        // فراخوان‌ها در try/catch خالی‌اند، بی هیچ پیامی برای همیشه.
        if (!vs[q] || typeof vs[q] !== 'object' || !vs[q].key) continue;
        byKey[String(vs[q].key)] = vs[q];
        usable++;
      }
      if (!usable) {
        callErr = new Error('پاسخِ مدل هیچ داوریِ معتبری نداشت (آرایهٔ verdicts خالی بود).');
      } else {
        if (!batches) clearAiJudgeCooldown_();      // مدل سرِ حال است
        batches++;
        singleFails = 0;
        probing = false;
        per = Math.max(1, CFG.JUDGE_BATCH || 3);   // پس از موفقیت، به دستهٔ کامل برگرد
        for (var s2 = 0; s2 < slice.length; s2++) {
          var rec = slice[s2];
          var vd = Object.prototype.hasOwnProperty.call(byKey, rec.key) ? byKey[rec.key] : null;
          // کلیدی را که مدل جا انداخته، بی‌داوری رها نمی‌کنیم: با قاعده‌های خودی
          // داوری می‌شود و «مشکوک» می‌ماند تا دورِ بعد مدل دوباره امتحان کند.
          if (!vd && (rec.__redoLocked || rec.__modelOnly)) { awaiting++; }   // ردیفِ دستی و دورِ مفهومی فقط با داوریِ مدل (۱۲.۶/۱۳.۰)
          else if (!vd) { applyVerdict_(reg, rec, localVerdict_(entries[s2]), entries[s2], true); localN++; }
          else applyVerdict_(reg, rec, vd, entries[s2], true);
          touched[rec.key] = 1;
          judged++; dirty = true;
        }
        continue;
      }
    }

    // ── مدل جواب نداد ──
    aiFail = String((callErr && callErr.message) || 'نامعلوم');
    logLine_('داوری با مدل ناموفق: ' + aiFail.slice(0, 220));
    if (probing) {                     // آزمایش هم نشد: همان مسیرِ بی‌مدل
      todo = slice.concat(todo);
      useAi = false; aiDown = true;
      break;
    }
    if (per > 1) {
      // شاید فقط یکی از متن‌های این دسته مشکل‌دار است؛ تکی امتحان می‌کنیم.
      todo = slice.concat(todo);
      per = 1;
      logLine_('داوری: دستهٔ کوچک‌ترِ تکی امتحان می‌شود.');
      continue;
    }
    singleFails++;
    if (singleFails < 2) {
      // یک متنِ خاص است که مدل رویش کار نمی‌کند (اغلب صافیِ محتوا). همان یکی را
      // بی‌مدل داوری می‌کنیم و بقیه با مدل ادامه می‌دهند — یک متنِ دردسرساز
      // نباید کیفیتِ داوریِ ۲۶۲ مجموعهٔ دیگر را پایین بیاورد.
      // ولی اگر همین ردیف قبلاً با قاعده داوری شده، دوباره نوشتنش فقط مهرِ زمان
      // را تازه می‌کند و به کاربر می‌گوید «۱ مجموعه داوری شد» — هر اجرا، همان
      // یک ردیف، تا ابد.
      if (slice[0].__redoLocked || slice[0].__modelOnly || seriesJudged_(slice[0].vals)) { awaiting++; }
      else {
        applyVerdict_(reg, slice[0], localVerdict_(entries[0]), entries[0], true);
        touched[slice[0].key] = 1;
        judged++; localN++; dirty = true;
      }
      // per را روی ۱ نگه می‌داریم: تا یک فراخوانِ موفق نبینیم، دستهٔ بزرگ‌تر
      // فقط یعنی چند فراخوانِ بی‌فایدهٔ دیگر. اولین موفقیت خودش برش می‌گرداند.
      logLine_('داوری: این مجموعه بی‌مدل داوری شد و ادامهٔ فهرست با مدل پیش می‌رود.');
      continue;
    }
    // دو فراخوانِ تکیِ پیاپی هم نشد: مدل واقعاً از کار افتاده است.
    useAi = false; aiDown = true;
    setAiJudgeCooldown_();
    todo = slice.concat(todo);
    try {
      logSelfFinding_(hub, {
        priority: 'جدی', category: 'داوری مجموعه‌ها', key: 'judge-call-failed',
        title: 'داوریِ محتوایی با مدل انجام نشد',
        detail: 'خطا: ' + aiFail.slice(0, 400) + ' — داوری با قاعده‌های خودیِ موتور ' +
                'ادامه یافت (کیفیتش کمتر است و با مدل دوباره بازبینی می‌شود).',
        instruction: '', owner: 'موتور'
      });
    } catch (eSf) {}
    break;
  }

  // ──────────────────── مرحلهٔ ۲: داوریِ بی‌مدل برای بقیه ────────────────────
  // شرطِ «فقط اگر مدل رسماً از کار افتاده» کافی نبود: با یک مدلِ «۵۰۳ شلوغ»،
  // مهلتِ مرحلهٔ اول تمام می‌شد پیش از آنکه دو شکستِ تکیِ پیاپی جمع شود، پس
  // aiDown هنوز false بود و مرحلهٔ دوم اجرا نمی‌شد — و نتیجه دوباره «یک مجموعه
  // در هر اجرا». معیارِ درست این است: در این اجرا هیچ فراخوانی موفق نبوده و
  // خطا هم دیده‌ایم.
  if (!aiDown && aiFail && !batches && todo.length) {
    aiDown = true;
    setAiJudgeCooldown_();
    logLine_('داوری: مدل در این اجرا هیچ پاسخِ قابل‌استفاده‌ای نداد؛ ادامه با قاعده‌های خودی.');
  }
  // «!batches» لازم است: با مهلتِ کوتاه (مثلاً ۲۵ ثانیه که از تولید می‌رسد)
  // مرحلهٔ اول حتی یک فراخوان را شروع نمی‌کند، پس aiDown هم false می‌ماند و بی
  // این شرط کلِ داوری یک هیچ‌کارِ کامل می‌شد — دقیقاً همان «۰ از ۲۶۳».
  if (CFG.JUDGE_LOCAL_FALLBACK !== false && todo.length && (localOnly || aiDown || !batches)) {
    var cap = Math.max(1, CFG.JUDGE_LOCAL_MAX || 500);
    var lopts = { chars: CFG.JUDGE_LOCAL_SAMPLE_CHARS || 1600, samples: 2, maxParts: 2 };
    var startedLocal = localN;
    while (todo.length && (localN - startedLocal) < cap) {
      if (new Date().getTime() > stopAt) break;
      var rec2 = todo.shift();
      // ردیفی که همین حالا با قاعده داوری شده، در فهرست است تا مدل بازبینی‌اش
      // کند — نه تا قاعده دوباره همان نتیجه را بنویسد. رد کردنش از هم کارِ
      // تکراری جلو می‌گیرد و هم مهرِ زمانِ داوری را بی‌دلیل تازه نمی‌کند.
      if (rec2.__redoLocked || rec2.__modelOnly || seriesJudged_(rec2.vals)) { awaiting++; continue; }   // ردیفِ دستی و دورِ مفهومی فقط با مدل (۱۲.۶/۱۳.۰)
      var e2 = entriesFor_([rec2], parts, lopts)[0];
      if (!e2.samples && !Object.prototype.hasOwnProperty.call(noTextSeen, e2.key)) {
        noTextSeen[e2.key] = 1; noText++;
      }
      applyVerdict_(reg, rec2, localVerdict_(e2), e2, true);
      touched[rec2.key] = 1;
      judged++; localN++; dirty = true;
    }
  }

  // نوشتن ممکن است شکست بخورد (مهلتِ Sheets، جدولِ دست‌خورده). اگر شکست خورد،
  // نه ترتیب را از روی داوریِ نانوشته بازچینی می‌کنیم، نه «آخرین داوری» را
  // مهر می‌زنیم، نه به کاربر می‌گوییم چند مجموعه داوری شد — چون نشده.
  var roundLog = [];
  for (var rl = 0; rl < reg.rows.length; rl++) {
    if (reg.rows[rl].__roundLog) { roundLog.push(reg.rows[rl].__roundLog); delete reg.rows[rl].__roundLog; }
  }
  var wr = dirty ? writeJudgeCols_(hub, reg, touched) : { ok: true, reg: reg };
  var wrote = !!(wr && wr.ok);
  /* ۱۳.۰: «قبلی ← جدید» فقط وقتی ردیف واقعاً نوشته شد — دفتری که چیزِ نانوشته را ثبت کند دروغ می‌گوید. */
  if (wrote && roundLog.length) { try { judgeRoundLogAppend_(hub, roundLog); } catch (eRl) { logLine_('دفترِ داوریِ مفهومی نوشته نشد: ' + eRl.message); } }
  if (wrote && wr.reg) reg = wr.reg;
  // ردیفی که در این فاصله از جدول رفته، داوری‌شده به حساب نمی‌آید
  if (wrote && wr.missing) judged = Math.max(0, judged - wr.missing);
  if (!wrote) {
    logLine_('داوری انجام شد ولی ذخیره نشد؛ در اجرای بعد دوباره انجام می‌شود.');
    return { judged: 0, left: todo.length + judged, batches: batches, noText: noText,
             local: 0, ranked: 0, aiDown: aiDown, writeFailed: true,
             aiFail: aiFail.slice(0, 200) };
  }
  // ترتیبِ درونِ هر دسته همیشه بازچینی می‌شود — نه فقط وقتی داوری انجام شده.
  var rk = { changed: 0 };
  try { rk = rankWithinCategories_(hub, reg); } catch (eRk) {}
  if (judged) {
    props_().setProperty(PK.JUDGE_AT, nowStr_());
    logLine_('داوریِ محتوایی: ' + judged + ' مجموعه بررسی شد (' + batches + ' فراخوانِ مدل' +
             (localN ? ' + ' + localN + ' داوریِ بی‌مدل' : '') + ')' +
             (noText ? ' — ' + noText + ' مجموعه متنِ نمونه نداشت' : '') +
             (todo.length ? ' · ' + todo.length + ' مجموعه به اجرای بعد ماند' : '') + '.');
  }
  return { judged: judged, left: todo.length, batches: batches, noText: noText,
           local: localN, ranked: rk.changed, aiDown: aiDown, awaitingModel: awaiting,
           aiFail: aiFail.slice(0, 200) };
}

/** نوشتنِ یک داوری در ردیفِ رجیستری. */
function applyVerdict_(reg, rec, vd, entry, deferWrite) {
  var v = rec.vals;
  /* ۱۲.۶: ردیفِ دستی (شماره/دسته/تصمیمِ دستی) فقط با داوریِ مدل بازنویسی می‌شود — و فقط شرح و دلیل و دستهٔ خودکار؛
     پیشنهادِ داور در «دلیل» و تبِ بازبینی می‌آید، نه در صف. داوریِ بی‌مدل روی آن هیچ نمی‌نویسد. */
  var lockedRedo = rec.__redoLocked === true;
  if (lockedRedo && vd && vd.__local === true) return;
  /* ۱۳.۰: داوریِ بی‌مدل «موقت و غیرقابل‌اتکا» است: روی دورِ مفهومی و روی هر داوریِ مدل هرگز نمی‌نشیند. */
  if (vd && vd.__local === true && (rec.__modelOnly || judgedByModel_(v))) return;
  var before = lockedRedo ? v.slice() : null;
  var prevRound = rec.__round ? { cat: String(v[SC.CAT - 1] || ''), ic: String(v[SC.IS_COURSE - 1] || ''),
                                  about: String(v[SC.ABOUT - 1] || '') } : null;
  // «بله/خیر» می‌تواند بولی باشد یا رشته («true»، «بله»، «yes»، «۱»)
  var yes = judgeYes_(vd.isCourse);
  // «رشتهٔ خالی» عدد نیست. Number('') صفر است، و همین صفرِ خاموش یک دورهٔ
  // واقعی را «آموزشی نیست» می‌کرد و چهل‌وپنج روز کنار می‌گذاشت — درست در
  // حالتی که پاسخِ مدل بریده برگشته و فقط key و isCourse را داشته.
  var rawScore = faDigits_(String(vd.score === undefined || vd.score === null ? '' : vd.score))
                   .replace(/[^0-9.\-]/g, '');
  var score = (rawScore === '' || rawScore === '.' || rawScore === '-') ? NaN : Number(rawScore);
  var scoreMissing = !isFinite(score);
  if (scoreMissing) score = yes ? 60 : 20;
  score = Math.max(0, Math.min(100, Math.round(score)));
  // تصمیم نهایی: هم نظرِ مدل و هم کفِ امتیاز. مدل ممکن است isCourse را true
  // بگذارد و بعد امتیاز ۱۵ بدهد؛ آن‌وقت عملاً آموزشی نیست.
  var isC = yes && score >= (CFG.JUDGE_MIN_SCORE || 45);
  // نمونه‌ای که هیچ متنی نداشت، «مشکوک» می‌ماند نه «آموزشی»
  // نمونهٔ خیلی کم هم مثل بی‌نمونه است: پرامپت خودش به مدل گفته در این حالت
  // محتاط باش و false بده؛ اگر آن «false»ِ محتاطانه را قطعی ثبت کنیم، یک دورهٔ
  // واقعی به‌خاطر «نفهمیدیم» چهل‌وپنج روز کنار گذاشته می‌شود.
  var sampleLen = entry && entry.text ? String(entry.text).length : 0;
  var noSample = sampleLen < (CFG.JUDGE_MIN_SAMPLE_CHARS || 900);
  // پاسخی که امتیاز یا شرح ندارد، پاسخِ کاملی نیست (پاسخِ بریده). «قطعی» ثبتش
  // نمی‌کنیم؛ مشکوک می‌ماند تا زود دوباره بررسی شود.
  var thinVerdict = scoreMissing || !String(vd.about || '').trim();
  /* ۱۲.۶: اطمینانِ کمِ داور به «آموزشی/نه» ⇒ مشکوک و «نیازمند بازبینی»، نه تصمیمِ قطعی. */
  var cSureRaw = String(vd.courseSure === undefined || vd.courseSure === null ? '' : vd.courseSure).trim();
  var cSure = Number(faDigits_(cSureRaw).replace(/[^0-9.]/g, ''));
  var lowCourse = vd.__local !== true && cSureRaw !== '' && isFinite(cSure) && cSure < (Number(CFG.JUDGE_COURSE_MIN_SURE) || 60);
  var unsure = noSample || thinVerdict || vd.__unsure === true || lowCourse;
  // «مشکوک» در صفِ درس‌نامه می‌ماند — و باید هم بماند، چون یک دورهٔ واقعیِ
  // نافهمیده نباید کنار گذاشته شود. ولی یک استثنا لازم است: وقتی هیچ متنِ
  // قابلِ استفاده‌ای خوانده نشده و نامِ فایل نشانهٔ صریحِ مراسم دارد
  // («مجلس روضه و سینه‌زنی شب اول»)، تنها شاهدِ موجود همان نام است. بی این
  // استثنا، همان مجلس «مشکوک» می‌ماند، نوبت می‌گیرد و از رویش قسمتِ درس‌نامه
  // ساخته می‌شود — درست همان چیزی که قرار بود دیگر پیش نیاید.
  var nameRit = 0;
  if (unsure && entry) {
    try {
      nameRit = signHits_(txNorm(String(((entry.partNames) || []).join(' ')) + ' ' +
                                 String(entry.name || '')), JUDGE_RITUAL_SIGNS);
    } catch (eN) { nameRit = 0; }
  }
  // و این پشتوانه نباید حرفِ صریحِ مدل را باطل کند: «تاریخ عزاداری در ایران» یا
  // «مقتل‌نگاری در ادبیات فارسی» درسِ دانشگاهی‌اند و نامشان نشانهٔ مراسم دارد.
  // پس فقط وقتی نام تصمیم می‌گیرد که یا هیچ متنی نبوده، یا خودِ مدل هم آموزشی
  // ندانسته، یا اصلاً مدلی در کار نبوده.
  var ritualName = unsure && noSample && nameRit >= 1 &&
                   (vd.__local === true || sampleLen === 0 || !judgeYes_(vd.isCourse));
  v[SC.IS_COURSE - 1] = ritualName ? SJ.NO : (unsure ? SJ.UNSURE : (isC ? SJ.YES : SJ.NO));
  /* ۱۳.۰: شمارشِ واژه هیچ‌وقت «آموزشی است/نیست» را قطعی نمی‌کند — فقط «مشکوک»، تا مدل بسنجد. */
  if (vd.__local === true) v[SC.IS_COURSE - 1] = SJ.UNSURE;
  v[SC.CSCORE - 1] = score;
  v[SC.ABOUT - 1] = String(vd.about || '').slice(0, 300);
  var why = String(vd.why || '').slice(0, 300);
  var kind = String(vd.kindOfContent || '').trim();
  // داوریِ بی‌مدل باید صریح علامت بخورد: هم شما در تخته می‌بینید که این تصمیم
  // از قاعده‌های خودیِ موتور آمده نه از مدل، و هم خودِ موتور از همین نشانه
  // می‌فهمد که باید زود (سه روز، نه چهل‌وپنج روز) با مدل بازبینی‌اش کند.
  var fmF = String(vd.form || '').trim().slice(0, 30), auF = String(vd.audience || '').trim().slice(0, 40);
  var evF = String(vd.evidence || '').trim().replace(/\s+/g, ' ').slice(0, 90);
  v[SC.WHY - 1] = (vd.__local ? JUDGE_LOCAL_MARK + ' ' + JUDGE_PARTIAL_MARK + ' — ' : '') +
                  (fmF || auF ? '[' + (fmF ? 'قالب: ' + fmF : '') + (fmF && auF ? '؛ ' : '') + (auF ? 'مخاطب: ' + auF : '') + '] ' : '') +
                  (lowCourse ? '‹' + JUDGE_REVIEW_MARK + ': اطمینانِ داور ' + Math.round(cSure) + '› ' : '') +
                  (kind ? '[' + kind + '] ' : '') + why +
                  (ritualName
                     ? ' (متنِ قابلِ استفاده‌ای خوانده نشد — ' + sampleLen + ' نویسه؛ ' +
                       'و نامِ فایل ' + nameRit + ' نشانهٔ صریحِ مراسم دارد. اگر اشتباه ' +
                       'است، دکمهٔ «آموزشی است» را بزنید.)'
                     : (noSample ? ' (نمونهٔ متن کافی نبود — ' + sampleLen +
                              ' نویسه؛ داوری قطعی نیست و دوباره بررسی می‌شود)' : '')) +
                  (thinVerdict && !noSample
                     ? ' (پاسخِ داوری ناقص بود؛ قطعی نیست و دوباره بررسی می‌شود)' : '');
  v[SC.JUDGED - 1] = nowStr_();
  // موضوع و سطح و دسته هم از همین داوری می‌آیند — این‌ها پیش‌تر از روی نام
  // حدس زده می‌شدند و همین باعث می‌شد دسته‌بندی عملاً بی‌معنی باشد.
  if (vd.topic) v[SC.TOPIC - 1] = String(vd.topic).slice(0, 80);
  var lvl = String(vd.level || '').trim();
  if (lvl === 'مقدماتی' || lvl === 'میانی' || lvl === 'پیشرفته') v[SC.LEVEL - 1] = lvl;
  var cat = String(vd.category || '').trim();
  /* ۱۱.۹: دسته از فهرستِ مجموعه‌ها (با «فلسفی و اعتقادی» و دسته‌های دستی)؛ و اطمینانِ کم ⇒ «بدون دسته»، نه حدس. */
  var sure = Number(faDigits_(String(vd.catSure === undefined ? '' : vd.catSure)).replace(/[^0-9.]/g, ''));
  var hasSure = vd.__local !== true && String(vd.catSure === undefined ? '' : vd.catSure).trim() !== '' && isFinite(sure);
  var okCat = !!cat && validSeriesCategory_(cat, reg);
  if (okCat && hasSure && sure < (Number(CFG.SERIES_CAT_MIN_SURE) || 0)) {
    v[SC.CAT - 1] = String(CFG.SERIES_CAT_UNSURE || 'بدون دسته (نیازمند بازبینی)');
    v[SC.WHY - 1] = String(v[SC.WHY - 1] || '') + ' ‹دسته نامطمئن: «' + cat + '» با اطمینانِ ' + Math.round(sure) + '›';
  }
  /* ۱۲.۶: دستهٔ داوریِ بی‌مدل (شمارشِ واژه) قطعی نیست — جای خالی را «نیازمند بازبینی» می‌گذارد، دستهٔ موجود را عوض نمی‌کند. */
  else if (vd.__local === true) { if (!String(v[SC.CAT - 1] || '').trim()) v[SC.CAT - 1] = String(CFG.SERIES_CAT_UNSURE || 'بدون دسته (نیازمند بازبینی)'); }
  else if (okCat) v[SC.CAT - 1] = cat;
  else if (!String(v[SC.CAT - 1] || '').trim()) v[SC.CAT - 1] = MISC_TITLE;
  if (vd.related) v[SC.RELATED - 1] = String(vd.related).slice(0, 120);
  var hintNum = Number(faDigits_(String(vd.orderHint === undefined ? '' : vd.orderHint))
                         .replace(/[^0-9]/g, ''));
  if (isFinite(hintNum) && hintNum > 0) {
    // راهنمای ترتیب در ستونِ «دلیل داوری» نگه داشته می‌شود، نه در «یادداشت»:
    // یادداشت جای پیامِ بازگشاییِ اسکن است و بازنویسی‌اش هم آن پیام را می‌خورد
    // و هم با بازگشاییِ بعدی، خودِ راهنما پاک می‌شد.
    v[SC.WHY - 1] = String(v[SC.WHY - 1] || '') +
                    ' ‹ترتیب پیشنهادی=' + Math.round(hintNum) + '›';
  }
  v[SC.UPDATED - 1] = nowStr_();
  if (evF) v[SC.WHY - 1] = String(v[SC.WHY - 1] || '').slice(0, 300 - evF.length - 12) + ' — شاهد: «' + evF + '»';
  if (prevRound && vd.__local !== true) {
    v[SC.WHY - 1] = String(v[SC.WHY - 1] || '').slice(0, 300) + ' ' + judgeRoundMark_();
    rec.__roundLog = [nowStr_(), rec.key, String(v[SC.NAME - 1] || ''), String(v[SC.STATUS - 1] || ''),
                      prevRound.cat, String(v[SC.CAT - 1] || ''), prevRound.ic, String(v[SC.IS_COURSE - 1] || ''),
                      String(vd.courseSure == null ? '' : vd.courseSure), String(vd.catSure == null ? '' : vd.catSure),
                      fmF, String(v[SC.ABOUT - 1] || '').slice(0, 200), String(vd.why || '').slice(0, 200), evF];
    delete rec.__round; delete rec.__modelOnly;
  }
  if (lockedRedo) {
    var sug = '‹' + JUDGE_REDO_MARK + ' — پیشنهادِ داور، اعمال‌نشده: آموزشی=' + (v[SC.IS_COURSE - 1] || '؟') + '، امتیاز=' + score +
              (cat ? '، دسته=' + cat : '') + (lvl ? '، سطح=' + lvl : '') + '›';
    var keep = [SC.ABOUT, SC.WHY, SC.CAT, SC.JUDGED, SC.UPDATED];
    var nv = before.slice();
    keep.forEach(function (c) { nv[c - 1] = v[c - 1]; });
    nv[SC.WHY - 1] = String(v[SC.WHY - 1] || '').replace(/\s*‹ترتیب پیشنهادی=\d+›/g, '').slice(0, 300) + ' ' + sug;
    for (var kk = 0; kk < v.length; kk++) v[kk] = nv[kk];
    delete rec.__redoLocked;
  }
  if (deferWrite) return;             // نوشتنِ یک‌بارهٔ کلِ جدول در پایانِ کار
  try {
    reg.sheet.getRange(rec.row, 1, 1, SERIES_HEADERS.length).setValues([v]);
  } catch (e) { logLine_('نوشتنِ داوری ناموفق: ' + e.message); }
}

/* ══ دفترِ «قبلی ← جدید» (۱۳.۰) ══ یک ردیف برای هر مجموعه‌ای که دورِ مفهومی سنجید. تبِ بازبینی ستون‌های «قبلی» را از همین
 * می‌خوانَد؛ Properties برای ۲۷۰ ردیف جا ندارد (سقفِ ۹ کیلوبایت). */
var JUDGE_ROUND_LOG_HEADERS = ['زمان', 'کلید', 'نامِ مجموعه', 'وضعیت', 'دستهٔ قبلی', 'دستهٔ تازه', 'آموزشیِ قبلی', 'آموزشیِ تازه',
                               'اطمینانِ «آموزشی»', 'اطمینانِ دسته', 'قالب', 'موضوعِ واقعی', 'دلیل', 'شاهد'];
function judgeRoundLogAppend_(hub, rows) {
  var sh = ensureTab_(hub, CFG.JUDGE_ROUND_TAB || 'داوریِ مفهومی — قبلی و تازه', JUDGE_ROUND_LOG_HEADERS);
  var W = JUDGE_ROUND_LOG_HEADERS.length;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, W).setValues(rows.map(function (r) { var x = r.slice(0, W); while (x.length < W) x.push(''); return x; }));
}
/** آخرین ردیفِ دفتر برای هر کلید ⇒ {key: row} — برای ستون‌های «قبلی» در تبِ بازبینی. */
function judgeRoundLogMap_(hub) {
  var out = Object.create(null);
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.JUDGE_ROUND_TAB || 'داوریِ مفهومی — قبلی و تازه');
    if (!sh || sh.getLastRow() < 2) return out;
    sh.getRange(2, 1, sh.getLastRow() - 1, JUDGE_ROUND_LOG_HEADERS.length).getValues().forEach(function (r) { out[String(r[1])] = r; });
  } catch (e) {}
  return out;
}

/* ══ داوریِ ادامه‌دار، زیرِ سقفِ شش‌دقیقه (۱۳.۰) ══ دور ~۲۷۰ مجموعه است و هر اجرا چند ده تا. پس یک تریگرِ یک‌باره که خودش
 * دوباره زمان‌بندی می‌شود تا صف خالی شود — همان الگوی `embSpecsLater`. پیشرفت در خودِ رجیستری است (نشانِ دور در «دلیل»)،
 * پس اجرای کشته‌شده چیزی گم نمی‌کند. ساعت‌های تولید (`JUDGE_TICK_QUIET`) را خالی می‌گذارد و قفل نمی‌گیرد مگر آزاد باشد. */
function judgeTickArm_(mins) {
  try {
    clearRetryTriggers_('judgeTick');
    ScriptApp.newTrigger('judgeTick').timeBased().after(Math.max(1, Number(mins) || Number(CFG.JUDGE_TICK_MIN) || 12) * 60000).create();
    props_().setProperty(PK.JUDGE_TICK_AT, nowStr_());
    return true;
  } catch (e) { return false; }
}
function judgeTickQuiet_() {
  var q = CFG.JUDGE_TICK_QUIET || [6.5, 9.5];
  var d = new Date(), h = Number(Utilities.formatDate(d, CFG.TIMEZONE, 'HH')) + Number(Utilities.formatDate(d, CFG.TIMEZONE, 'mm')) / 60;
  return isFinite(h) && h >= Number(q[0]) && h < Number(q[1]);
}
function judgeTick() {
  runEnter_('judgeTick');
  var note = '', lock = null;
  try {
    try { clearRetryTriggers_('judgeTick'); } catch (e0) {}
    if (judgeTickQuiet_()) { judgeTickArm_(45); note = 'ساعتِ تولید — بعد'; return note; }
    lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) { lock = null; judgeTickArm_(Number(CFG.BUSY_RETRY_MIN) || 7); note = 'قفل گرفته بود'; return note; }
    runStage_('داوری: دسته');
    var r = judgeSeries(false, new Date().getTime() + (Number(CFG.JUDGE_TICK_MS) || 230000));
    var hub = getHub_(), reg = readSeriesReg_(hub);
    var need = seriesNeedingJudgement_(reg).length, rs = judgeRoundStatus_(reg);
    note = 'داوری: ' + (r.judged || 0) + ' · مانده ' + need + (r.aiFail ? ' · مدل: ' + String(r.aiFail).slice(0, 60) : '');
    /* مدلِ ازکارافتاده یعنی تلاشِ بعد دیرتر، نه هر دوازده دقیقه. */
    if (need) judgeTickArm_(r.aiDown ? 60 : null);
    if (rs.on && !rs.left && props_().getProperty(PK.JUDGE_ROUND_TOLD) !== String(CFG.JUDGE_ROUND)) {
      try { seriesCatReview_(hub, true); } catch (eRv) {}
      try { tgSend_(rs.line + '\n' + judgeRoundSummary_(hub).line); } catch (eT) {}
      props_().setProperty(PK.JUDGE_ROUND_TOLD, String(CFG.JUDGE_ROUND));
    }
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (eR) {} }
    runExit_('judgeTick', note);
  }
  return note;
}
/** چند عوض شد، چند مشکوک، چند «نادیده»ِ بالقوه آموزشی — از دفترِ دور. ⇒ {changedCat, changedIc, unsure, skippedEdu, line} */
function judgeRoundSummary_(hub) {
  var m = judgeRoundLogMap_(hub), out = { n: 0, changedCat: 0, changedIc: 0, unsure: 0, skippedEdu: 0, toEdu: 0, line: '' };
  for (var k in m) {
    var r = m[k]; out.n++;
    if (String(r[4]) !== String(r[5])) out.changedCat++;
    if (String(r[6]) !== String(r[7])) out.changedIc++;
    if (String(r[7]) === SJ.UNSURE || /نیازمند بازبینی/.test(String(r[5]))) out.unsure++;
    if (String(r[7]) === SJ.YES && String(r[6]) !== SJ.YES) out.toEdu++;
    if (String(r[3]) === SST.SKIPPED && String(r[7]) === SJ.YES) out.skippedEdu++;
  }
  out.line = 'نتیجهٔ دور: ' + out.n + ' سنجیده · دسته عوض شد: ' + out.changedCat + ' · «آموزشی؟» عوض شد: ' + out.changedIc +
             ' (' + out.toEdu + ' تازه آموزشی) · مشکوک/کم‌اطمینان: ' + out.unsure + ' · «نادیده»ِ بالقوه آموزشی: ' + out.skippedEdu +
             ' — وضعیتِ هیچ‌کدام خودکار عوض نشد؛ بی شمارهٔ دستی وارد صف نمی‌شوند.';
  return out;
}

/** «بله» را از هر شکلی می‌فهمد: بولی، «true»، «بله»، «yes»، «۱». */
function judgeYes_(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  var s = ' ' + txNorm(faDigits_(String(v))).trim() + ' ';
  // مدل ممکن است جمله بنویسد («بله، قطعاً آموزشی است»)؛ واژهٔ مستقل را می‌گیریم
  if (/(^|\s)(false|no|خیر|نه|نادرست|غلط)(\s|$)/.test(s)) return false;
  return /(^|\s)(true|yes|y|1|بله|اری|آری|درست|صحیح)(\s|$)/.test(s);
}

/* ══ فهرستِ دسته‌های مجموعه (۱۱.۹) ══ «صاحبِ کانال دستهٔ «فلسفی و اعتقادی» را خودش ساخته و در فهرستِ ۱۵ دستهٔ داور نیست؛
   پس موضوعاتِ فلسفی به دسته‌های دیگر رفته‌اند.» فهرست = TAXONOMY + SERIES_EXTRA_CATS + هر دستهٔ دستیِ موجود در رجیستری + متفرقه.
   TAXONOMY عمداً دست نمی‌خورد: تب‌های هاب و دسته‌بندیِ ردیف‌های «از همه جا» از آن ساخته می‌شوند. */
function seriesCatList_(reg) {
  var out = [], seen = Object.create(null);
  var add = function (t) { t = String(t || '').trim(); if (t && !seen[t]) { seen[t] = 1; out.push(t); } };
  TAXONOMY.forEach(function (t) { add(t.title); });
  (CFG.SERIES_EXTRA_CATS || []).forEach(function (x) { add(x && x.title); });
  try { (reg && reg.rows || []).forEach(function (r) { add(r.vals[SC.MCAT - 1]); }); } catch (e) {}
  add(MISC_TITLE);
  return out;
}
function validSeriesCategory_(cat, reg) { return seriesCatList_(reg).indexOf(String(cat || '').trim()) !== -1; }


// ------------------------------------------------- اولویت‌بندی درونِ دسته

/**
 * ترتیبِ نهایی: درونِ هر دسته، از مقدماتی به پیشرفته، و در سطحِ برابر با
 * راهنماییِ مدل و بعد نام. شماره‌ها ۱..N درونِ همان دسته‌اند — پس وقتی
 * مجموعهٔ تازه‌ای اضافه می‌شود، خودش سرِ جای درستش می‌نشیند و بقیه هم
 * دوباره شماره می‌خورند، بی آنکه ترتیبِ نسبی‌شان به‌هم بریزد.
 */
function rankWithinCategories_(hub, regOpt) {
  var reg = regOpt || readSeriesReg_(hub);
  var lvl = Object.create(null);
  lvl['مقدماتی'] = 0; lvl['میانی'] = 1; lvl['پیشرفته'] = 2;
  var byCat = Object.create(null), cats = [];
  for (var i = 0; i < reg.rows.length; i++) {
    var v = reg.rows[i].vals;
    if (String(v[SC.STATUS - 1] || '') === SST.SKIPPED) continue;
    // ردیفِ قفل‌شده با تنظیمِ دستی، از مرتب‌سازِ خودکار کاملاً بیرون است
    if (seriesManualLock_(v)) continue;
    // غیرآموزشی‌ها در صفِ «درس‌نامه» نیستند، پس شمارهٔ اولویت هم نمی‌گیرند
    if (seriesIsCourse_(v) === false) continue;
    var c = seriesCatOf_(v);
    if (!byCat[c]) { byCat[c] = []; cats.push(c); }
    byCat[c].push(reg.rows[i]);
  }
  var hintOf = function (rec) {
    var m = String(rec.vals[SC.WHY - 1] || '').match(/ترتیب پیشنهادی=(\d+)/);
    if (!m) m = String(rec.vals[SC.NOTE - 1] || '').match(/orderHint=(\d+)/);  // سازگاری
    return m ? parseInt(m[1], 10) : 999;
  };
  var changed = 0;
  for (var g = 0; g < cats.length; g++) {
    var arr = byCat[cats[g]];
    arr.sort(function (a, b) {
      var la = Object.prototype.hasOwnProperty.call(lvl, String(a.vals[SC.LEVEL - 1] || '').trim())
                 ? lvl[String(a.vals[SC.LEVEL - 1]).trim()] : 1;
      var lb = Object.prototype.hasOwnProperty.call(lvl, String(b.vals[SC.LEVEL - 1] || '').trim())
                 ? lvl[String(b.vals[SC.LEVEL - 1]).trim()] : 1;
      if (la !== lb) return la - lb;
      var ha = hintOf(a), hb = hintOf(b);
      if (ha !== hb) return ha - hb;
      // مجموعهٔ چندقسمتی پیش از تک‌قسمتی: رشتهٔ درس مهم‌تر است
      var pa = Number(a.vals[SC.PARTS - 1]) || 1, pb = Number(b.vals[SC.PARTS - 1]) || 1;
      if (pa !== pb) return pb - pa;
      var na = String(a.vals[SC.NAME - 1] || ''), nb = String(b.vals[SC.NAME - 1] || '');
      return na < nb ? -1 : (na > nb ? 1 : a.row - b.row);
    });
    for (var k = 0; k < arr.length; k++) {
      if (Number(arr[k].vals[SC.ORDER - 1]) === k + 1) continue;
      arr[k].vals[SC.ORDER - 1] = k + 1;
      changed++;
    }
  }
  // غیرآموزشی‌ها و ردیف‌های «نادیده گرفته شد» ترتیبشان پاک می‌شود تا در فهرست
  // «—» دیده شوند و شمارهٔ اولویتِ یک مجموعهٔ زندهٔ دیگر را اشغال نکنند.
  for (var z = 0; z < reg.rows.length; z++) {
    var vv = reg.rows[z].vals;
    if (seriesManualLock_(vv)) continue;   // قفلِ دستی: حتی پاک‌کردن هم ممنوع
    var dead = seriesIsCourse_(vv) === false ||
               String(vv[SC.STATUS - 1] || '') === SST.SKIPPED;
    if (!dead) continue;
    if (!String(vv[SC.ORDER - 1] || '').toString().trim()) continue;
    vv[SC.ORDER - 1] = '';
    changed++;
  }
  // نوشتنِ ستونِ ترتیب، دسته‌دسته و بر پایهٔ شمارهٔ واقعیِ هر ردیف. فرضِ
  // «ردیف‌ها از ۲ پیوسته‌اند» غلط است: یک ردیفِ بی‌کلید در جدول (ردیفِ
  // دستی‌اضافه‌شده، یا سلولِ کلیدِ خالی‌شده) خوانده نمی‌شود و از آن پس همهٔ
  // شماره‌ها یک خانه جابه‌جا نوشته می‌شدند.
  if (changed) {
    var runs = reg.rows.slice().sort(function (a, b) { return a.row - b.row; });
    var i2 = 0;
    while (i2 < runs.length) {
      var j2 = i2;
      while (j2 + 1 < runs.length && runs[j2 + 1].row === runs[j2].row + 1) j2++;
      var col = [];
      for (var w = i2; w <= j2; w++) col.push([runs[w].vals[SC.ORDER - 1]]);
      try { reg.sheet.getRange(runs[i2].row, SC.ORDER, col.length, 1).setValues(col); }
      catch (eW) { logLine_('نوشتنِ ترتیب ناموفق: ' + eW.message); }
      i2 = j2 + 1;
    }
  }
  if (changed) logLine_('اولویت‌بندیِ درونِ دسته‌ها به‌روز شد (' + changed + ' تغییر).');
  return { changed: changed, categories: cats.length };
}

// ------------------------------------------------------- تصمیمِ دستیِ شما

/**
 * نظرِ خودتان دربارهٔ آموزشی بودنِ یک مجموعه. از این پس داوریِ خودکار رویش
 * دست نمی‌گذارد.
 */
function setSeriesManual_(hub, key, decision) {
  var reg = readSeriesReg_(hub);
  var rec = Object.prototype.hasOwnProperty.call(reg.byKey, String(key))
              ? reg.byKey[String(key)] : null;
  if (!rec) return { ok: false, message: 'مجموعه پیدا نشد.' };
  var d = String(decision || '').trim();
  if (d !== SMAN.YES && d !== SMAN.NO && d !== '') {
    return { ok: false, message: 'تصمیم نامعتبر.' };
  }
  rec.vals[SC.MANUAL - 1] = d;
  rec.vals[SC.UPDATED - 1] = nowStr_();
  try { reg.sheet.getRange(rec.row, 1, 1, SERIES_HEADERS.length).setValues([rec.vals]); }
  catch (e) { return { ok: false, message: 'نوشتن ناموفق: ' + e.message }; }
  rankWithinCategories_(hub, readSeriesReg_(hub));
  var nm = String(rec.vals[SC.NAME - 1] || key);
  logLine_('تصمیم دستی: مجموعهٔ «' + nm + '» ← ' + (d || 'برگشت به داوریِ خودکار') + '.');
  return { ok: true, name: nm, decision: d };
}

/** خلاصهٔ داوری برای فایل وضعیت و ناظر. */
function judgeSummary_(hub, regOpt) {
  var reg = regOpt || readSeriesReg_(hub);
  var out = { total: 0, course: 0, notCourse: 0, unsure: 0, unjudged: 0,
              manual: 0, notCourseList: [] };
  for (var i = 0; i < reg.rows.length; i++) {
    var v = reg.rows[i].vals;
    if (String(v[SC.STATUS - 1] || '') === SST.SKIPPED) continue;
    out.total++;
    var man = String(v[SC.MANUAL - 1] || '').trim();
    if (man) out.manual++;
    // «مشکوک» یعنی «نگاه شد ولی قطعی نشد» — نه «داوری نشد». تا دیروز در هر دو
    // شمارنده می‌آمد و بنرِ تخته می‌گفت «۲۶۳ مجموعه هنوز داوری نشده» درحالی‌که
    // همه‌شان داوری شده بودند. همان پیامی که کاربر را متقاعد کرد هیچ کاری
    // انجام نشده است.
    if (!man && String(v[SC.IS_COURSE - 1] || '') === SJ.UNSURE) { out.unsure++; continue; }
    var ic = seriesIsCourse_(v);
    if (ic === null) { out.unjudged++; continue; }
    if (ic) out.course++;
    else {
      out.notCourse++;
      if (out.notCourseList.length < 25) {
        out.notCourseList.push({ name: String(v[SC.NAME - 1] || reg.rows[i].key),
                                 why: String(v[SC.WHY - 1] || ''),
                                 score: Number(v[SC.CSCORE - 1]) || 0 });
      }
    }
  }
  return out;
}

// ------------------------------------------------------------- منو

/** منو: داوری و مرتب‌سازیِ همهٔ مجموعه‌ها، همین حالا. */
function runJudgeSeries() {
  var ui = ui_();
  var r;
  try { r = judgeSeries(false, new Date().getTime() + 240 * 1000); }
  catch (e) { r = { error: e.message }; }
  var hub = getHub_();
  var sum = judgeSummary_(hub);
  var L = [];
  if (r && r.error) L.push('خطا: ' + r.error);
  L.push('داوری‌شده در این اجرا: ' + (r.judged || 0) +
         (r && r.local ? '  (از این میان ' + r.local + ' مورد بی‌مدل)' : ''));
  if (r && r.aiFail) {
    L.push('');
    L.push('مدلِ داوری جواب نداد: ' + String(r.aiFail).slice(0, 160));
    L.push('پس داوری با قاعده‌های خودیِ موتور روی همان متن انجام شد — دقتش کمتر ' +
           'است و با نشانهٔ «' + JUDGE_LOCAL_MARK + '» در ستونِ دلیل مشخص شده. ' +
           'همین که مدل دوباره جواب بدهد، خودش بازبینی می‌شود.');
    L.push('');
  }
  if (r && r.left) L.push('مانده برای اجرای بعد: ' + r.left +
                          '\n(همین گزینه را دوباره بزنید، یا خودش در تولیدِ بعدی ادامه می‌دهد)');
  if (r && r.awaitingModel) {
    L.push(r.awaitingModel + ' مجموعه از قبل با قاعده‌های خودی دسته‌بندی شده‌اند و ' +
           'منتظرِ بازبینیِ مدل‌اند؛ همین که مدل جواب بدهد خودش انجام می‌شود.');
  }
  if (r && r.ranked) L.push('ترتیبِ درونِ دسته‌ها: ' + r.ranked + ' تغییر.');
  L.push('');
  L.push('آموزشی: ' + sum.course + '  ·  آموزشی نیست: ' + sum.notCourse +
         '  ·  مشکوک: ' + sum.unsure + '  ·  داوری‌نشده: ' + sum.unjudged);
  if (sum.notCourseList.length) {
    L.push('');
    L.push('نمونهٔ موارد کنارگذاشته‌شده:');
    for (var i = 0; i < Math.min(6, sum.notCourseList.length); i++) {
      L.push('• ' + sum.notCourseList[i].name + ' — ' +
             String(sum.notCourseList[i].why).slice(0, 90));
    }
    L.push('');
    L.push('این‌ها در برنامهٔ «' + CFG.SHOW_NAME + '» استفاده می‌شوند و در تختهٔ ' +
           'مجموعه‌ها زیر عنوانِ «آموزشی تشخیص داده نشد» با دلیلشان دیده می‌شوند. ' +
           'اگر با داوری موافق نیستید، همان‌جا دستی عوضش کنید.');
  }
  /* ۱۳.۰: وضعِ دورِ مفهومی، و اجرای بعد خودکار — دکمه تنها راهِ ادامه نیست. */
  try { var jrs = judgeRoundStatus_(readSeriesReg_(hub)); if (jrs.on) L.push('', jrs.line); } catch (eJr) {}
  try { if (seriesNeedingJudgement_(readSeriesReg_(hub)).length) { judgeTickArm_(); L.push('ادامه خودکار است (هر ' + (CFG.JUDGE_TICK_MIN || 12) + ' دقیقه، بیرون از ساعت‌های تولید).'); } } catch (eJa) {}
  var m = L.join('\n');
  if (ui) ui.alert('داوری و دسته‌بندیِ مجموعه‌ها', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

/**
 * منو: «داوریِ همه از نو (با مدل)».
 * تا امروز هیچ راهی نبود که داوریِ یک فهرستِ کاملاً داوری‌شده را از نو بخواهید؛
 * یا باید سلولِ «داوری‌شده در» را دستی خالی می‌کردید یا چهل‌وپنج روز صبر.
 */
function runRejudgeAll() {
  var ui = ui_();
  if (ui) {
    var ans = ui.alert('داوریِ همه از نو',
      'همهٔ مجموعه‌ها از نو با مدل داوری می‌شوند — حتی آن‌هایی که داوریِ تازه دارند.\n' +
      'این کار چند اجرا طول می‌کشد و سهمیهٔ مدل مصرف می‌کند.\n' +
      'تصمیم‌های دستیِ خودتان («آموزشی است» / «آموزشی نیست»)، شماره و دستهٔ دستی، و ' + (CFG.JUDGE_KEEP_NAMES || []).join('، ') + ' دست نمی‌خورند.\n\n' +
      'ادامه بدهم؟', ui.ButtonSet.YES_NO);
    if (ans !== ui.Button.YES) return { cancelled: true };
  }
  var r;
  try { r = judgeSeries(true, new Date().getTime() + 240 * 1000); }
  catch (e) { r = { error: e.message }; }
  var sum = judgeSummary_(getHub_());
  var m = 'داوریِ تازه در این اجرا: ' + (r.judged || 0) +
          (r.local ? ' (' + r.local + ' مورد بی‌مدل)' : '') +
          (r.left ? '\nمانده: ' + r.left + ' — همین گزینه را دوباره بزنید.' : '\nتمام شد.') +
          '\n\nآموزشی: ' + sum.course + '  ·  آموزشی نیست: ' + sum.notCourse +
          '  ·  مشکوک: ' + sum.unsure + '  ·  داوری‌نشده: ' + sum.unjudged;
  if (ui) ui.alert('داوریِ همه از نو', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

/**
 * منو: «مرتب‌سازیِ سریعِ فهرست (بی‌مدل)».
 *
 * چرا جدا از داوریِ با مدل: داوریِ با مدل دقیق است ولی کند — هر فراخوان چند
 * ثانیه، و با سقفِ شش‌دقیقه‌ایِ گوگل یعنی چند ده مجموعه در هر اجرا. وقتی فهرست
 * چندصد ردیفی و به‌هم‌ریخته است، اولْ نظم لازم است: این گزینه با قاعده‌های خودی
 * روی متنِ واقعی، در یک اجرا صدها مجموعه را دسته و سطح و ترتیب می‌دهد. مدل
 * بعداً در دورهای عادی همین‌ها را بازبینی و دقیق می‌کند.
 */
function runLocalJudgeAll() {
  var ui = ui_();
  var r;
  try { r = judgeSeries(false, new Date().getTime() + 260 * 1000, null, true); }
  catch (e) { r = { error: e.message }; }
  var hub = getHub_();
  var sum = judgeSummary_(hub);
  var L = [];
  if (r && r.error) L.push('خطا: ' + r.error);
  L.push('مرتب‌شده در این اجرا: ' + (r.judged || 0) + ' مجموعه (بی‌مدل: شمارشِ واژه، نه فهمِ محتوا)');
  L.push('⚠️ موقت و غیرقابل‌اتکا: «آموزشی؟» فقط «مشکوک» می‌شود، دسته قطعی نمی‌شود، و روی هیچ داوریِ مدل نمی‌نشیند. ' +
         'داوریِ واقعی همان «داوری و دسته‌بندی از روی محتوا» است که خودش هم ادامه پیدا می‌کند.');
  if (r && r.ranked) L.push('ترتیبِ درونِ دسته‌ها: ' + r.ranked + ' تغییر.');
  if (r && r.left) {
    L.push('مانده: ' + r.left + ' — همین گزینه را یک بار دیگر بزنید.');
  } else {
    L.push('همهٔ فهرست دسته‌بندی و مرتب شد.');
  }
  L.push('');
  L.push('آموزشی: ' + sum.course + '  ·  آموزشی نیست: ' + sum.notCourse +
         '  ·  مشکوک: ' + sum.unsure + '  ·  داوری‌نشده: ' + sum.unjudged);
  L.push('');
  L.push('«مشکوک» یعنی قطعی نشد؛ این‌ها با مدل داوری می‌شوند و تا آن‌وقت هیچ تصمیمی روی آن‌ها گرفته نمی‌شود.');
  var m = L.join('\n');
  if (ui) ui.alert('مرتب‌سازیِ موقتِ بی‌مدل', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}
