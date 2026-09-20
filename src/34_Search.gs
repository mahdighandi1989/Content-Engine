/**
 * 34_Search.gs — پیدا کردنِ چیزی که می‌دانی هست و نمی‌دانی کجاست
 *
 * ══ خواستهٔ صاحبِ برنامه، عیناً ══
 *
 * «چیزی که می‌دونم قبلاً تو یکی از کلیپ‌ها یا صوت‌ها بوده ولی دیگه نمی‌تونم
 * پیداش کنم … توضیح بدم چی بوده و چی یادمه و اون دقیق بگرده و پیداش کنه و
 * لینکشم بده … یا … محتواهای مرتبط رو برام به ترتیبِ نزدیک بودنش به
 * درخواستم، نه از حیثِ زمانی بلکه از حیثِ محتوایی، لیست کنه … هم بدون هوش
 * مصنوعی و هم با هوش مصنوعی … در تمام محتواها، تأکید می‌کنم تمام.»
 *
 * ══ چرا `createTextFinder`، و چرا این تنها راه بود ══
 *
 * پشتیبانِ ۲۰ سپتامبر اندازه‌ها را داد: بانک ۲۹ مگابایت، و پنج شیتِ منبع روی
 * هم حدودِ **۱۱۲ مگابایت**. خواندنِ اینها با `getValues` در شش دقیقهٔ Apps
 * Script ممکن نیست — نزدیکِ ممکن هم نیست. یعنی هر طرحی که «همه را بخوان و
 * بگرد» باشد، یا دروغ می‌گوید یا نیمه‌کاره می‌مانَد.
 *
 * `createTextFinder` گشتن را **داخلِ خودِ گوگل‌شیت** انجام می‌دهد و فقط
 * نشانیِ نتیجه‌ها را برمی‌گرداند. پس اندازهٔ داده تقریباً بی‌اهمیت می‌شود و
 * «تمام» واقعاً تمام است. فقط ردیف‌هایی که چیزی در آن‌ها پیدا شده خوانده
 * می‌شوند.
 *
 * ══ دو لایه، و هر دو لازم‌اند ══
 *
 *   • **بانک** (`CONTENT-HUB`) — یک ردیف برای هر فایل، با موضوع و پیام و
 *     خلاصه و متن و وایب و **لینکِ خودِ فایل**. این همان چیزی است که موتور
 *     فهمیده، پس جست‌وجویش معنادارترین است.
 *   • **پنج شیتِ منبع** — متنِ خام و کامل، بی هیچ سقفِ نویسه‌ای. چیزی که در
 *     بانک به ۱۵۰۰ نویسه بریده شده، اینجا کامل است. برای «یک جمله‌ای که
 *     وسطِ یک ویدئوی بلند گفته شد» تنها جای درست همین است.
 *
 * هیچ‌کدام جای دیگری را نمی‌گیرد، پس پیش‌فرض هر دو است.
 *
 * ══ این بخش هیچ‌چیز نمی‌نویسد ══
 *
 * نه در شیت‌های منبع (که فقط‌خواندنی‌اند و باید بمانند)، نه در بانک، نه در
 * درایو. فقط می‌خوانَد. صاحبِ برنامه گفت «فقط بدون خراب کردن» — و امن‌ترین
 * شکلِ آن، قابلیتی است که **راهِ نوشتن ندارد**، نه قابلیتی که مراقبِ نوشتنش
 * هستیم.
 *
 * ══ املای فارسی: جایی که یک جست‌وجوی ساده شکست می‌خورَد ══
 *
 * کاربر «کتابخانه» می‌نویسد و در شیت «كتابخانه» با کافِ عربی نشسته؛ یا
 * «می‌گوید» با نیم‌فاصله در برابرِ «می گوید» با فاصله؛ یا «۱۴۰۴» در برابرِ
 * «1404». هر سه، برای یک جست‌وجوی تحت‌اللفظی، «پیدا نشد» می‌دهند — بدترین
 * جواب، چون کاربر نتیجه می‌گیرد چیزی نیست در حالی که هست.
 * `srchPattern_` عبارت را به یک الگوی منظم تبدیل می‌کند که همهٔ این
 * تفاوت‌ها را در خود می‌بلعد.
 *
 * ══ و نکته‌ای که باید صریح گفته شود ══
 *
 * رسیدن به سقفِ زمان یا سقفِ نتیجه خطا نیست، ولی **پنهان کردنش هست**. یک
 * جست‌وجوی نیمه‌کاره که خودش را کامل جا بزند یعنی کاربر «نیست» می‌شنود در
 * حالی که فقط نگشته‌ایم. هر پاسخ می‌گوید کجا گشت، چند ردیف دید، و کجا
 * ایستاد.
 */

/** ستون‌های متنیِ بانک که ارزشِ گشتن دارند — و وزنشان در امتیاز. */
var SRCH_W = { topic: 5, msg: 4, summary: 3, body: 2, vibe: 1, raw: 1 };

/**
 * نرمال‌سازیِ فارسی برای **مقایسه** (نه برای نمایش).
 *
 * همان کاری که `txNorm` برای دسته‌بندی می‌کند، با دو افزوده که اینجا لازم‌اند:
 * رقم‌ها یکی می‌شوند (۱۴۰۴ = 1404 = ١٤٠٤) و اعراب حذف می‌شود، چون متنِ
 * گفتاریِ این موتور اعراب‌دار است و کاربر بی اعراب تایپ می‌کند.
 */
function srchNorm_(s) {
  var t = String(s == null ? '' : s);
  t = t.replace(/[ً-ْٰـ]/g, '');        // اعراب و کشیده
  t = t.replace(/[يىۍې]/g, 'ی');   // ی
  t = t.replace(/ك/g, 'ک');                       // ک
  t = t.replace(/[ةۀ]/g, 'ه');               // ه
  t = t.replace(/[أإآٱ]/g, 'ا');   // ا
  t = t.replace(/ؤ/g, 'و');                       // و
  t = t.replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
  t = t.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
  t = t.replace(/[‌‎‏﻿]/g, ' ');        // نیم‌فاصله = فاصله
  t = t.replace(/\s+/g, ' ');
  return t.trim().toLowerCase();
}

/** واژه‌های معنادارِ یک عبارت. واژه‌های یک‌نویسه‌ای نوفه‌اند. */
function srchTerms_(q) {
  var t = srchNorm_(q).replace(/[^\p{L}\p{N}\s]/gu, ' ');
  var parts = t.split(/\s+/), out = [];
  for (var i = 0; i < parts.length; i++) {
    var w = parts[i].trim();
    if (w.length < 2) continue;
    if (SRCH_STOP[w]) continue;
    if (out.indexOf(w) === -1) out.push(w);
  }
  return out;
}

/* واژه‌هایی که در هر متنی هستند و امتیاز را بی‌معنا می‌کنند. کوتاه نگه داشته
   شده: فهرستِ بلندِ ایست‌واژه، واژهٔ کلیدیِ واقعی را هم می‌خورَد. */
var SRCH_STOP = (function () {
  var o = Object.create(null);
  var w = ['از', 'به', 'با', 'در', 'که', 'را', 'این', 'آن', 'های', 'ها', 'یک',
           'برای', 'تا', 'هم', 'یا', 'است', 'بود', 'شد', 'می', 'نمی', 'و',
           'the', 'and', 'for', 'with', 'that', 'this', 'from'];
  for (var i = 0; i < w.length; i++) o[srchNorm_(w[i])] = 1;
  return o;
})();

/**
 * عبارت را به الگوی منظمی تبدیل کن که تفاوت‌های املایی را ببلعد.
 *
 * هر حرفِ فارسی که چند شکل دارد به یک ردهٔ نویسه تبدیل می‌شود، و بینِ هر دو
 * نویسه اجازهٔ اعراب و نیم‌فاصله داده می‌شود. پس «می‌گوید» الگویی می‌شود که
 * «مي گويد» و «میگوید» و «مِی‌گوید» هر سه را می‌گیرد.
 *
 * نویسه‌ها **عیناً** در الگو می‌نشینند و نه با `\x{...}`: گوگل‌شیت RE2 دارد و
 * هر دو را می‌فهمد، ولی نویسهٔ خام یک جای کمتر برای اشتباه است.
 */
function srchPattern_(term) {
  var VAR = {
    'ا': 'اآأإٱ',
    'ی': 'یيىې',
    'ک': 'کك',
    'ه': 'هةۀ',
    'و': 'وؤ'
  };
  var GAP = '[\\s‌ً-ْٰـ]*';
  var t = srchNorm_(term);
  if (!t) return '';
  var out = [];
  for (var i = 0; i < t.length; i++) {
    var c = t.charAt(i);
    if (/\s/.test(c)) { out.push(GAP); continue; }
    if (/[0-9]/.test(c)) {
      var d = c.charCodeAt(0) - 48;
      out.push('[' + c + String.fromCharCode(0x06F0 + d) + String.fromCharCode(0x0660 + d) + ']');
    } else if (VAR[c]) {
      out.push('[' + VAR[c] + ']');
    } else if (/[\p{L}\p{N}]/u.test(c)) {
      out.push(c);
    } else {
      out.push('\\' + c);                       // نویسهٔ ویژه: بی‌اثر شود
    }
    if (i < t.length - 1 && !/\s/.test(c)) out.push(GAP);
  }
  var pat = out.join('');
  // الگوی خیلی بلند هم کند است و هم ریسکِ ردِ RE2 — عبارتِ بلند بریده می‌شود
  return pat.length > 1800 ? pat.slice(0, 1800) : pat;
}

/**
 * امتیازِ محتواییِ یک ردیف در برابرِ واژه‌ها. **هیچ ربطی به تاریخ ندارد** —
 * صاحبِ برنامه صریح گفت «نه از حیثِ زمانی بلکه از حیثِ محتوایی».
 *
 * سه چیز امتیاز می‌سازد: کجا پیدا شد (موضوع از متن مهم‌تر است)، چند تا از
 * واژه‌ها پیدا شد (پوشش)، و آیا کلِ عبارت دست‌نخورده آمده (عبارتِ کامل).
 */
function srchScore_(fields, terms, phrase) {
  var hit = 0, score = 0;
  var norm = {};
  for (var k in SRCH_W) {
    if (Object.prototype.hasOwnProperty.call(SRCH_W, k)) norm[k] = srchNorm_(fields[k] || '');
  }
  for (var i = 0; i < terms.length; i++) {
    var best = 0;
    for (var f in SRCH_W) {
      if (!Object.prototype.hasOwnProperty.call(SRCH_W, f)) continue;
      if (norm[f] && norm[f].indexOf(terms[i]) !== -1 && SRCH_W[f] > best) best = SRCH_W[f];
    }
    if (best) { hit++; score += best; }
  }
  if (!terms.length) return 0;
  // پوشش وزنِ سنگین دارد: ردیفی که چهار واژه از پنج را دارد باید بالاتر از
  // ردیفی بنشیند که یک واژه را چهار بار تکرار کرده.
  score += (hit / terms.length) * 12;
  var ph = srchNorm_(phrase || '');
  if (ph && ph.indexOf(' ') !== -1) {
    for (var f2 in SRCH_W) {
      if (!Object.prototype.hasOwnProperty.call(SRCH_W, f2)) continue;
      if (norm[f2] && norm[f2].indexOf(ph) !== -1) { score += 10; break; }
    }
  }
  return Math.round(score * 10) / 10;
}

/** آیا این تب، تبِ دسته‌بندیِ بانک است؟ (از روی سرستون، نه از روی نام.) */
function srchIsHubTab_(sh) {
  try {
    var w = Math.min(HUB_HEADERS.length, sh.getLastColumn());
    if (w < 12) return false;
    var h = sh.getRange(1, 1, 1, w).getValues()[0];
    for (var i = 0; i < 12; i++) {
      if (String(h[i]).trim() !== String(HUB_HEADERS[i]).trim()) return false;
    }
    return true;
  } catch (e) { return false; }
}

/**
 * تب‌های قابلِ جست‌وجوی بانک.
 *
 * از روی **سرستون** شناخته می‌شوند و نه از روی فهرستی از نام‌ها. فهرستِ
 * دست‌نویسِ نام‌ها همان چیزی است که کهنه می‌شود (`removeTriggers`، ۵٫۹۵):
 * دستهٔ تازه‌ای که فردا اضافه شود خودبه‌خود جست‌وجو می‌شود، و تبِ تازه‌ای که
 * دسته نیست خودبه‌خود کنار می‌مانَد.
 */
function srchHubTabs_(hub) {
  var out = [], sheets = [];
  try { sheets = (hub || getHub_()).getSheets(); } catch (e) { return out; }
  for (var i = 0; i < sheets.length; i++) {
    try { if (srchIsHubTab_(sheets[i])) out.push(sheets[i]); } catch (e2) {}
  }
  return out;
}

/**
 * شماره‌ردیف‌هایی که الگو در آن‌ها پیدا شد.
 *
 * `findNext` و نه `findAll`: یک واژهٔ پرتکرار در شیتی ۶۲ مگابایتی می‌تواند
 * ده‌ها هزار نتیجه بدهد و `findAll` همه را یکجا می‌سازد. با `findNext` سقف
 * واقعاً سقف است.
 */
function srchFind_(sh, pattern, cap, plain) {
  var rows = {}, n = 0;
  var tf;
  try {
    tf = sh.createTextFinder(pattern);
    if (!plain && tf.useRegularExpression) tf.useRegularExpression(true);
    if (tf.matchCase) tf.matchCase(false);
    if (tf.matchEntireCell) tf.matchEntireCell(false);
  } catch (e) { return []; }
  try {
    for (var i = 0; i < cap * 4; i++) {
      var r = tf.findNext();
      if (!r) break;
      var row = r.getRow();
      if (row > 1 && !rows[row]) { rows[row] = 1; n++; if (n >= cap) break; }
    }
  } catch (e2) {}
  var out = [];
  for (var k in rows) if (Object.prototype.hasOwnProperty.call(rows, k)) out.push(Number(k));
  out.sort(function (a, b) { return a - b; });
  return out;
}

/**
 * ردیف‌های پراکنده را با کمترین رفت‌وبرگشت بخوان.
 *
 * دویست `getRange` جدا یعنی دویست رفت‌وبرگشت. ردیف‌های نزدیک به هم در یک
 * بلوک خوانده می‌شوند؛ ردیفِ تکِ دورافتاده همچنان تک خوانده می‌شود، چون
 * خواندنِ یک بلوکِ ده‌هزارردیفی برای دو نتیجه بدتر است.
 */
function srchReadRows_(sh, rows, width) {
  var out = {};
  if (!rows.length) return out;
  var last = sh.getLastRow(), w = Math.min(width, Math.max(1, sh.getLastColumn()));
  var i = 0;
  while (i < rows.length) {
    var a = rows[i], b = a, j = i;
    while (j + 1 < rows.length && rows[j + 1] - b <= 40 && (rows[j + 1] - a) < 400) {
      b = rows[++j];
    }
    if (b > last) b = last;
    if (a > last) break;
    try {
      var vals = sh.getRange(a, 1, b - a + 1, w).getValues();
      for (var k = i; k <= j; k++) {
        var idx = rows[k] - a;
        if (idx >= 0 && idx < vals.length) out[rows[k]] = vals[idx];
      }
    } catch (e) {}
    i = j + 1;
  }
  return out;
}

/** یک ردیفِ بانک → نتیجهٔ نمایشی. */
function srchHubItem_(sh, row, vals) {
  var g = function (c) { return String(vals[c - 1] == null ? '' : vals[c - 1]); };
  var link = g(COL.LINK);
  var id = g(COL.ID);
  if (!link && id) link = driveLink_(id);
  return {
    where: 'بانک', tab: sh.getName(), row: row, id: id,
    kind: g(COL.KIND), date: g(COL.DATE), cat: sh.getName(),
    fields: { topic: g(COL.TOPIC), msg: g(COL.MSG), summary: g(COL.SUMMARY),
              body: g(COL.BODY), vibe: g(COL.VIBE), raw: g(COL.RAW) },
    title: g(COL.TOPIC) || g(COL.MSG) || g(COL.RAW) || ('ردیف ' + row),
    link: link, sheetLink: srchRowLink_(sh, row)
  };
}

/** یک ردیفِ شیتِ منبع → نتیجهٔ نمایشی (بی نگاشتِ ستون؛ هرچه متن هست). */
function srchSrcItem_(srcTitle, sh, row, vals) {
  var txt = [], id = '';
  for (var c = 0; c < vals.length; c++) {
    var v = String(vals[c] == null ? '' : vals[c]).trim();
    if (!v) continue;
    // شناسهٔ درایو هرجای ردیف که باشد، لینکِ فایل را می‌سازد
    if (!id && /^[A-Za-z0-9_-]{25,}$/.test(v)) id = v;
    if (!id) {
      var m = v.match(/[-\w]{25,}/);
      if (m && v.indexOf('drive.google') !== -1) id = m[0];
    }
    if (v.length > 2) txt.push(v);
  }
  var joined = txt.join(' — ');
  return {
    where: 'منبع', tab: srcTitle + ' › ' + sh.getName(), row: row, id: id,
    kind: '', date: '', cat: srcTitle,
    fields: { topic: txt[0] || '', msg: txt[1] || '', summary: joined.slice(0, 1800),
              body: joined.slice(1800, 4000), vibe: '', raw: '' },
    title: (txt[0] || ('ردیف ' + row)).slice(0, 180),
    link: id ? driveLink_(id) : '', sheetLink: srchRowLink_(sh, row)
  };
}

/**
 * لینکی که دقیقاً همان ردیف را باز می‌کند.
 *
 * برای نتیجهٔ منبع گاهی هیچ شناسهٔ فایلی در ردیف نیست. «پیدا شد ولی نمی‌گویم
 * کجا» جواب نیست — این لینک همیشه هست.
 */
function srchRowLink_(sh, row) {
  try {
    return 'https://docs.google.com/spreadsheets/d/' + sh.getParent().getId() +
           '/edit#gid=' + sh.getSheetId() + '&range=A' + row;
  } catch (e) { return ''; }
}

/**
 * گشتنِ واقعی: بانک و — اگر خواسته شده — پنج شیتِ منبع.
 *
 * برمی‌گرداند `{items, scanned, sheets, stopped, notes}`. `stopped` یعنی
 * بودجهٔ زمان یا سقفِ نامزدها تمام شد؛ این **همیشه** به کاربر گفته می‌شود.
 */
function srchCollect_(terms, phrase, opts) {
  opts = opts || {};
  var t0 = new Date().getTime();
  var budget = Math.max(20000, Number(CFG.SEARCH_BUDGET_MS) || 230000);
  var capSheet = Math.max(20, Number(CFG.SEARCH_HITS_PER_SHEET) || 400);
  var capAll = Math.max(20, Number(CFG.SEARCH_CAND_MAX) || 240);
  var out = { items: [], scanned: 0, sheets: 0, stopped: '', notes: [] };
  var left = function () { return budget - (new Date().getTime() - t0); };

  var pats = [];
  for (var i = 0; i < terms.length; i++) {
    var p = srchPattern_(terms[i]);
    if (p) pats.push({ term: terms[i], pat: p });
  }
  var whole = srchPattern_(phrase);
  if (whole && pats.length > 1) pats.unshift({ term: '«' + phrase + '»', pat: whole });
  if (!pats.length) return out;

  var take = function (sh, mk, label) {
    if (out.items.length >= capAll) { out.stopped = 'سقفِ نامزدها'; return false; }
    if (left() < 12000) { out.stopped = 'بودجهٔ زمان'; return false; }
    var rows = {}, order = [];
    for (var q = 0; q < pats.length; q++) {
      if (left() < 8000) { out.stopped = 'بودجهٔ زمان'; break; }
      var got = srchFind_(sh, pats[q].pat, capSheet);
      for (var r = 0; r < got.length; r++) {
        if (!rows[got[r]]) { rows[got[r]] = 1; order.push(got[r]); }
      }
      if (order.length >= capSheet) break;
    }
    out.sheets++;
    if (!order.length) return true;
    order.sort(function (a, b) { return a - b; });
    if (order.length > capSheet) order = order.slice(0, capSheet);
    /* ══ بریده‌شدن باید **همان‌جا** فهمیده شود (۷٫۲۳) ══
       نسخهٔ اول فقط سرِ تبِ بعدی می‌فهمید به سقف خورده‌ایم؛ پس اگر سقف
       دقیقاً در آخرین تب پر می‌شد، کاربر هیچ‌وقت نمی‌فهمید جست‌وجو ناقص
       بوده. و ناقص‌بودنِ اعلام‌نشده یعنی «نیست» گفتن به چیزی که هست. */
    if (order.length >= capSheet) {
      out.stopped = out.stopped || 'سقفِ نتیجه در یک تب';
    }
    var vals = srchReadRows_(sh, order, 24);
    var z = 0;
    for (; z < order.length; z++) {
      if (out.items.length >= capAll) { out.stopped = 'سقفِ نامزدها'; break; }
      var v = vals[order[z]];
      if (!v) continue;
      var it = mk(sh, order[z], v);
      it.score = srchScore_(it.fields, terms, phrase);
      if (it.score <= 0) continue;          // الگو خورده ولی معنایش نه
      out.items.push(it);
      out.scanned++;
    }
    if (z < order.length) out.stopped = out.stopped || 'سقفِ نامزدها';
    return true;
  };

  // ── بانک ──
  try {
    var hub = getHub_();
    var tabs = srchHubTabs_(hub);
    if (!tabs.length) out.notes.push('هیچ تبِ دسته‌ای در بانک شناخته نشد.');
    for (var t = 0; t < tabs.length; t++) {
      // با پرانتز صدا زده می‌شود و نه به‌صورتِ ارجاع، تا نگهبانِ «تابعِ خصوصیِ
      // بی‌فراخوان» (run_wiring_test ۱.۱) واقعاً ببیندش — و قرینهٔ
      // `srchSrcItem_` هم همین شکل است.
      if (!take(tabs[t], function (sh, row, vals) { return srchHubItem_(sh, row, vals); })) break;
    }
  } catch (eH) { out.notes.push('بانک خوانده نشد: ' + eH.message); }

  // ── شیت‌های منبع ── (فقط خواندن؛ هرگز نوشتن)
  if (opts.sources !== false && !out.stopped) {
    var list = CFG.SOURCES || [];
    for (var s = 0; s < list.length; s++) {
      if (out.stopped) break;
      var src = list[s], ss = null;
      try { ss = SpreadsheetApp.openById(src.id); }
      catch (eO) { out.notes.push('شیتِ «' + src.title + '» باز نشد.'); continue; }
      var shs = [];
      try { shs = ss.getSheets(); } catch (eS) { continue; }
      for (var u = 0; u < shs.length; u++) {
        if (out.stopped) break;
        var sheet = shs[u];
        (function (title) {
          take(sheet, function (sh2, row, vals) { return srchSrcItem_(title, sh2, row, vals); });
        })(src.title);
      }
    }
  }

  out.items.sort(function (a, b) { return b.score - a.score; });
  return out;
}

/* ══════════════ مسیرِ هوش مصنوعی ══════════════ */

var SRCH_EXPAND_SCHEMA = {
  type: 'object',
  properties: {
    terms: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' }
  },
  required: ['terms']
};

/**
 * توضیحِ آزادِ کاربر → واژه‌هایی که واقعاً در متن نشسته‌اند.
 *
 * این نیمهٔ مهمِ «با هوش مصنوعی» است و نه رتبه‌بندی: کاربر می‌گوید «اون کلیپه
 * که یارو درباره‌ی ترسِ از دست دادنِ پول حرف می‌زد» و در متن نوشته
 * «زیان‌گریزی» یا «loss aversion». بی این پل، جست‌وجو هرچقدر هم هوشمند
 * رتبه‌بندی کند، چیزی برای رتبه‌بندی ندارد.
 */
function srchExpand_(desc) {
  var out = { terms: [], note: '', ok: false };
  if (CFG.SEARCH_AI === false) return out;
  var cap = Math.max(4, Number(CFG.SEARCH_EXPAND_MAX) || 14);
  var prompt =
    'کاربر دنبالِ محتوایی می‌گردد که قبلاً دیده یا شنیده و جزئیاتش را دقیق ' +
    'به یاد ندارد. توصیفش این است:\n\n«' + String(desc).slice(0, 1500) + '»\n\n' +
    'فهرستی از واژه‌ها و عبارت‌هایی بده که **به احتمال زیاد عیناً در متنِ آن ' +
    'محتوا نوشته شده‌اند**. شاملِ: واژه‌های کلیدیِ خودِ توصیف، هم‌معناهای ' +
    'فارسی، اصطلاحِ تخصصی اگر هست، نامِ افراد و جاها، و معادلِ انگلیسی ' +
    '(بسیاری از این متن‌ها اصطلاحِ انگلیسی دارند).\n' +
    'هر عبارت کوتاه باشد (یک تا سه واژه). حداکثر ' + cap + ' مورد. ' +
    'واژهٔ عمومی مثل «ویدیو» یا «مطلب» نده — چیزی بده که متن را از بقیه جدا کند.';
  try {
    var r = geminiText_(prompt, SRCH_EXPAND_SCHEMA, 2048);
    var j = (typeof r === 'string') ? JSON.parse(r) : r;
    var list = (j && j.terms) || [];
    for (var i = 0; i < list.length && out.terms.length < cap; i++) {
      var w = srchNorm_(list[i]);
      if (w.length >= 2 && out.terms.indexOf(w) === -1) out.terms.push(w);
    }
    out.note = String((j && j.note) || '');
    out.ok = out.terms.length > 0;
  } catch (e) {
    out.note = 'گسترشِ واژه‌ها انجام نشد: ' + e.message;
  }
  return out;
}

var SRCH_RANK_SCHEMA = {
  type: 'object',
  properties: {
    hits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          why: { type: 'string' },
          fit: { type: 'string' }
        },
        required: ['id']
      }
    },
    answer: { type: 'string' }
  },
  required: ['hits']
};

/**
 * نامزدها را بر پایهٔ **معنا** مرتب کن.
 *
 * مدل پیشنهاد می‌دهد و کد تصمیم می‌گیرد: شناسه‌ای که در فهرستِ نامزدها نباشد
 * دور ریخته می‌شود. این همان قاعدهٔ همیشگیِ این مخزن است (`musicPlanModel_`
 * و `bridgeTrim_`) و اینجا هم لازم است — یک شناسهٔ ساختگی یعنی لینکی که به
 * جایی نمی‌رود.
 */
function srchRank_(desc, items) {
  var out = { order: [], why: {}, answer: '', ok: false, note: '' };
  if (CFG.SEARCH_AI === false || !items.length) return out;
  var lines = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var txt = [it.fields.topic, it.fields.msg, it.fields.summary].join(' | ');
    lines.push('[' + (i + 1) + '] (' + (it.kind || it.where) + ' · ' + (it.cat || '') + ') ' +
               srchClip_(txt, 420));
  }
  var prompt =
    'کاربر این را می‌خواهد:\n\n«' + String(desc).slice(0, 1500) + '»\n\n' +
    'و اینها نامزدهایی هستند که در بانکِ محتوا پیدا شدند:\n\n' +
    lines.join('\n') + '\n\n' +
    'آن‌هایی را که واقعاً به خواستهٔ کاربر می‌خورند، **به ترتیبِ نزدیکیِ ' +
    'معنایی** برگردان — نه بر اساسِ تاریخ و نه بر اساسِ ترتیبِ همین فهرست. ' +
    'برای هرکدام در «why» یک جملهٔ کوتاه بگو چرا به کارش می‌آید، و در «fit» ' +
    'یکی از: بسیار نزدیک / نزدیک / شاید.\n' +
    'موردی که ربط ندارد را **نیاور** — فهرستِ کوتاهِ درست از فهرستِ بلندِ ' +
    'پرنویز بهتر است. اگر هیچ‌کدام نمی‌خورد، hits را خالی بده و در answer ' +
    'بنویس چه چیزی کم بود.\n' +
    'در «answer» اگر از رویِ همین‌ها می‌شود جوابِ کاربر را داد، کوتاه بده. ' +
    'id همان عددِ داخلِ کروشه است.';
  try {
    var r = geminiText_(prompt, SRCH_RANK_SCHEMA, 8192);
    var j = (typeof r === 'string') ? JSON.parse(r) : r;
    var hits = (j && j.hits) || [];
    for (var h = 0; h < hits.length; h++) {
      var n = parseInt(String(hits[h].id).replace(/[^0-9]/g, ''), 10);
      if (!(n >= 1 && n <= items.length)) continue;         // شناسهٔ ساختگی
      if (out.order.indexOf(n - 1) !== -1) continue;
      out.order.push(n - 1);
      out.why[n - 1] = { why: String(hits[h].why || ''), fit: String(hits[h].fit || '') };
    }
    out.answer = String((j && j.answer) || '');
    out.ok = true;
  } catch (e) {
    out.note = 'رتبه‌بندیِ معنایی انجام نشد: ' + e.message;
  }
  return out;
}

/** بریدنِ متن سرِ مرزِ واژه، با «…». */
function srchClip_(s, n) {
  var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  var cut = t.slice(0, n), sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

/**
 * یک جست‌وجوی کامل. هستهٔ هر دو حالت.
 *
 * `mode`: 'ساده' یا 'هوشمند'. حالتِ هوشمند اگر مدل در دسترس نباشد **ساکت
 * سقوط نمی‌کند**: نتیجهٔ لغوی را می‌دهد و صریح می‌گوید که بخشِ هوشمند انجام
 * نشد. یک قابلیت که بی‌صدا خاموش شود، همان بانکِ موسیقی است.
 */
function srchRun_(query, opts) {
  opts = opts || {};
  var t0 = new Date().getTime();
  var q = String(query || '').trim();
  var res = { ok: false, query: q, mode: opts.mode === 'هوشمند' ? 'هوشمند' : 'ساده',
              items: [], terms: [], answer: '', notes: [], scanned: 0, sheets: 0,
              stopped: '', ms: 0 };
  if (!q) { res.notes.push('چیزی برای جست‌وجو ننوشتید.'); return res; }
  if (CFG.SEARCH_ON === false) { res.notes.push('جست‌وجو خاموش است.'); return res; }

  var terms = srchTerms_(q);
  var ai = null;
  if (res.mode === 'هوشمند') {
    ai = srchExpand_(q);
    if (ai.ok) {
      for (var i = 0; i < ai.terms.length; i++) {
        if (terms.indexOf(ai.terms[i]) === -1) terms.push(ai.terms[i]);
      }
    } else if (ai.note) {
      res.notes.push(ai.note + ' — با واژه‌های خودِ شما گشتم.');
    }
  }
  if (!terms.length) { res.notes.push('واژهٔ معناداری در متنِ شما نبود.'); return res; }
  res.terms = terms.slice(0);

  var col = srchCollect_(terms, q, { sources: opts.sources !== false });
  res.scanned = col.scanned; res.sheets = col.sheets; res.stopped = col.stopped;
  for (var n = 0; n < col.notes.length; n++) res.notes.push(col.notes[n]);

  var top = Math.max(5, Number(CFG.SEARCH_TOP) || 25);
  var picked = col.items.slice(0, Math.max(top, Math.min(col.items.length, 120)));

  if (res.mode === 'هوشمند' && picked.length) {
    var rk = srchRank_(q, picked);
    if (rk.ok && rk.order.length) {
      var ordered = [];
      for (var o = 0; o < rk.order.length && ordered.length < top; o++) {
        var it = picked[rk.order[o]];
        if (!it) continue;
        var w = rk.why[rk.order[o]] || {};
        it.why = w.why || ''; it.fit = w.fit || '';
        ordered.push(it);
      }
      res.items = ordered;
      res.answer = rk.answer;
    } else {
      res.items = picked.slice(0, top);
      res.notes.push((rk.note || 'رتبه‌بندیِ معنایی نتیجه‌ای نداد') +
                     ' — ترتیب بر پایهٔ واژه‌هاست.');
    }
  } else {
    res.items = picked.slice(0, top);
  }

  res.ok = true;
  res.ms = new Date().getTime() - t0;
  return res;
}

/** همان، برای دکمه‌های پنجره. (نامِ بی‌زیرخط، چون از HTML صدا زده می‌شود.) */
function srchRun(query, mode, sources) {
  try {
    return srchRun_(query, { mode: mode, sources: sources !== false });
  } catch (e) {
    return { ok: false, query: String(query || ''), items: [], notes: ['خطا: ' + e.message],
             terms: [], answer: '', scanned: 0, sheets: 0, stopped: '', ms: 0, mode: mode };
  }
}

/** منو: پنجرهٔ جست‌وجو. */
function runContentSearch() {
  var ui = ui_();
  var html = srchHtml_();
  if (!ui) { console.log(html.slice(0, 400)); return html; }
  var out = HtmlService.createHtmlOutput(html).setWidth(1100).setHeight(760);
  ui.showModalDialog(out, 'جست‌وجو در همهٔ محتوا');
}

/** پنجره. ساده عمداً: یک کادر، دو دکمه، و نتیجه‌ها با لینک. */
function srchHtml_() {
  var H = [];
  H.push('<!DOCTYPE html><html><head><meta charset="utf-8"><style>');
  H.push('body{font-family:Tahoma,Vazirmatn,sans-serif;direction:rtl;margin:14px;color:#1f2430}');
  H.push('h3{margin:0 0 4px}');
  H.push('.hint{color:#5b6472;font-size:12px;margin-bottom:10px;line-height:1.7}');
  H.push('textarea{width:100%;height:72px;font-family:inherit;font-size:14px;padding:8px;' +
         'border:1px solid #c7ccd6;border-radius:8px;box-sizing:border-box}');
  H.push('.row{margin:10px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap}');
  H.push('button{padding:9px 18px;border:0;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px}');
  H.push('.p{background:#1f3864;color:#fff}.s{background:#e8ebf1;color:#1f2430}');
  H.push('.res{margin-top:14px}');
  H.push('.it{border:1px solid #e1e5ec;border-radius:10px;padding:10px 12px;margin-bottom:9px}');
  H.push('.t{font-weight:bold;margin-bottom:3px}');
  H.push('.m{color:#5b6472;font-size:12px;margin-bottom:5px}');
  H.push('.w{background:#f4f7fb;border-right:3px solid #1f3864;padding:5px 8px;' +
         'border-radius:5px;font-size:13px;margin:5px 0}');
  H.push('.x{font-size:13px;line-height:1.8}');
  H.push('a{color:#1f3864}.warn{color:#8a5a00;background:#fff7e6;padding:7px 10px;' +
         'border-radius:7px;font-size:12px;margin:8px 0}');
  H.push('.ans{background:#eef4ff;padding:9px 12px;border-radius:8px;margin-bottom:10px;line-height:1.9}');
  H.push('</style></head><body>');
  H.push('<h3>جست‌وجو در همهٔ محتوا</h3>');
  H.push('<div class="hint">هرچه یادتان هست بنویسید — لازم نیست دقیق باشد. ' +
         'مثال: «اون کلیپه که یارو درباره‌ی ترس از ضرر حرف می‌زد» یا ' +
         '«هرچی دربارهٔ خوابِ کودک داریم».<br>' +
         '<b>ساده</b> دنبالِ همان واژه‌ها می‌گردد. ' +
         '<b>هوشمند</b> اول می‌فهمد چه می‌خواهید، هم‌معناها را هم می‌گردد، ' +
         'و نتیجه‌ها را از نظرِ <b>معنا</b> مرتب می‌کند — نه تاریخ.</div>');
  H.push('<textarea id="q" placeholder="چه چیزی را می‌خواهید پیدا کنید؟"></textarea>');
  H.push('<div class="row">');
  H.push('<button class="p" onclick="go(\'هوشمند\')">🔎 جست‌وجوی هوشمند</button>');
  H.push('<button class="s" onclick="go(\'ساده\')">جست‌وجوی ساده</button>');
  H.push('<label style="font-size:13px"><input type="checkbox" id="src" checked> ' +
         'شیت‌های منبع هم گشته شوند (کامل‌تر، کمی کندتر)</label>');
  H.push('</div>');
  H.push('<div id="out" class="res"></div>');
  H.push('<script>');
  H.push('function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){' +
         'return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}');
  H.push('function go(m){var q=document.getElementById("q").value;' +
         'if(!q.trim()){return;}' +
         'document.getElementById("out").innerHTML="<p>در حالِ گشتن… ' +
         'برای جست‌وجوی کامل تا چند دقیقه طول می‌کشد.</p>";' +
         'google.script.run.withSuccessHandler(show).withFailureHandler(function(e){' +
         'document.getElementById("out").innerHTML="<div class=\\"warn\\">خطا: "+esc(e.message)+"</div>";})' +
         '.srchRun(q,m,document.getElementById("src").checked);}');
  H.push('function show(r){var H=[];');
  H.push('if(r.answer){H.push("<div class=\\"ans\\">"+esc(r.answer)+"</div>");}');
  H.push('H.push("<div class=\\"m\\">حالت: "+esc(r.mode)+" · "+r.sheets+" تب گشته شد · "+' +
         'r.scanned+" ردیفِ نامزد · "+Math.round(r.ms/1000)+" ثانیه</div>");');
  H.push('if(r.stopped){H.push("<div class=\\"warn\\">جست‌وجو کامل نشد ("+esc(r.stopped)+")' +
         ' — یعنی ممکن است چیزی باشد که ندیدم. عبارتِ دقیق‌تری بنویسید یا ' +
         'تیکِ شیت‌های منبع را بردارید.</div>");}');
  H.push('for(var i=0;i<(r.notes||[]).length;i++){' +
         'H.push("<div class=\\"warn\\">"+esc(r.notes[i])+"</div>");}');
  H.push('if(!r.items||!r.items.length){H.push("<p>چیزی پیدا نشد.</p>");}');
  H.push('for(var i=0;i<(r.items||[]).length;i++){var t=r.items[i];');
  H.push('H.push("<div class=\\"it\\"><div class=\\"t\\">"+(i+1)+". "+esc(t.title)+"</div>");');
  H.push('H.push("<div class=\\"m\\">"+esc(t.where)+" · "+esc(t.tab)+(t.kind?" · "+esc(t.kind):"")+' +
         '(t.date?" · "+esc(t.date):"")+" · امتیاز "+t.score+(t.fit?" · "+esc(t.fit):"")+"</div>");');
  H.push('if(t.why){H.push("<div class=\\"w\\">"+esc(t.why)+"</div>");}');
  H.push('var x=t.fields&&(t.fields.msg||t.fields.summary||t.fields.body)||"";');
  H.push('if(x){H.push("<div class=\\"x\\">"+esc(x.slice(0,420))+"</div>");}');
  H.push('var L=[];if(t.link){L.push("<a href=\\""+t.link+"\\" target=\\"_blank\\">بازکردنِ فایل</a>");}');
  H.push('if(t.sheetLink){L.push("<a href=\\""+t.sheetLink+"\\" target=\\"_blank\\">همان ردیف در شیت</a>");}');
  H.push('if(L.length){H.push("<div class=\\"m\\">"+L.join(" · ")+"</div>");}');
  H.push('H.push("</div>");}');
  H.push('document.getElementById("out").innerHTML=H.join("");}');
  H.push('</script></body></html>');
  return H.join('');
}
