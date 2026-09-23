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
 * ══ این بخش خودش هیچ‌چیز نمی‌نویسد — و مرزِ دقیقش این است ══
 *
 * در **شیت‌های منبع** هیچ‌چیز نوشته نمی‌شود؛ نه ردیفی، نه نامی، نه قالبی.
 * این مرزِ مطلقِ پروژه است و اینجا با یک آزمون نگه داشته می‌شود که پس از
 * یک جست‌وجوی کامل، دست‌نخوردگیِ ردیف را می‌سنجد. در درایو هم چیزی ساخته
 * یا عوض نمی‌شود.
 *
 * ولی یک دقتِ لازم، چون نسخهٔ ۷٫۲۳ اینجا ادعای نادرستی نوشته بود: صدا زدنِ
 * `getHub_()` مثلِ هر جای دیگرِ موتور می‌تواند تب‌های گم‌شدهٔ بانک را
 * بسازد یا سرستون‌ها را ترمیم کند. آن **نوشتنِ این بخش نیست**، ولی «هیچ
 * نوشتنی رخ نمی‌دهد» هم نیست. ادعای نادرستِ امنیت از نداشتنِ ادعا بدتر
 * است — همان قاعدهٔ «دستورهایی که از حقیقتشان جا مانده‌اند».
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

/**
 * شکلِ «فشرده»: بی فاصله و بی نشانه‌گذاری.
 *
 * ══ چرا لازم شد (۷٫۲۴) ══
 * الگوی جست‌وجو عمداً سخاوتمند است و نیم‌فاصله/فاصله را می‌بلعد، ولی امتیاز
 * با `indexOf` روی متنِ معمولی سنجیده می‌شد. پس «میگوید» (که کاربر سرِ هم
 * تایپ می‌کند) الگو را می‌خورد ولی امتیازش صفر می‌شد و `score <= 0` بی‌صدا
 * دورش می‌ریخت: یابنده می‌گفت هست، سنجنده می‌گفت نیست، و کاربر «پیدا نشد»
 * می‌دید. دو لایه که با هم اختلاف داشته باشند، اختلافشان همیشه به زیانِ
 * کاربر حل می‌شود.
 *
 * نشانه‌گذاری هم حذف می‌شود تا پاداشِ «عبارتِ کامل» با یک «؟» از بین نرود —
 * و پنجرهٔ گفت‌وگو صریح دعوت می‌کند که جمله بنویسید.
 */
function srchTight_(s) {
  return srchNorm_(s).replace(/[^\p{L}\p{N}]+/gu, '');
}

/** آیا این متن آن واژه را دارد؟ هم به شکلِ معمولی، هم فشرده. */
function srchHas_(hayNorm, hayTight, needle) {
  if (!needle) return false;
  if (hayNorm && hayNorm.indexOf(needle) !== -1) return true;
  var t = srchTight_(needle);
  return !!(t && hayTight && hayTight.indexOf(t) !== -1);
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
    '\u0627': '\u0627\u0622\u0623\u0625\u0671',
    '\u06CC': '\u06CC\u064A\u0649\u06D0',
    '\u06A9': '\u06A9\u0643',
    '\u0647': '\u0647\u0629\u06C0',
    '\u0648': '\u0648\u0624'
  };
  var GAP = '[\\s\u200C\u064B-\u0652\u0670\u0640]*';
  var t = srchNorm_(term);
  if (!t) return '';
  var out = [], gapAfter = false;
  /* ══ نویسهٔ غیرِلاتین هرگز با بک‌اسلش گریز داده نمی‌شود (۷٫۲۴) ══
     گوگل‌شیت RE2 دارد و RE2 بک‌اسلش را فقط پیشِ نشانه‌گذاریِ ASCII می‌پذیرد؛
     `\؟` یا `\«` خطای «invalid escape sequence» می‌دهد. نسخهٔ اول هر
     نویسهٔ غیرِحرف‌وعدد را گریز می‌داد، پس یک علامتِ سؤالِ فارسی در جملهٔ
     کاربر کلِ الگو را باطل می‌کرد، `createTextFinder` استثنا می‌داد،
     `srchFind_` آن را می‌بلعید و `[]` برمی‌گرداند — یعنی «پیدا نشد» برای
     چیزی که هست، بی هیچ نشانه‌ای. و آزمون نمی‌دیدش چون ماک با RegExpِ
     جاوااسکریپت کار می‌کند، نه RE2.
     نشانه‌گذاری اصلاً ارزشِ تطبیق ندارد: مثلِ فاصله رفتار می‌کند. */
  for (var i = 0; i < t.length; i++) {
    var c = t.charAt(i);
    if (/[\p{L}\p{N}]/u.test(c)) {
      if (gapAfter && out.length) out.push(GAP);
      gapAfter = false;
      var d = c.charCodeAt(0) - 48;
      if (d >= 0 && d <= 9) {
        out.push('[' + c + String.fromCharCode(0x06F0 + d) + String.fromCharCode(0x0660 + d) + ']');
      } else if (VAR[c]) {
        out.push('[' + VAR[c] + ']');
      } else {
        out.push(c);
      }
      if (i < t.length - 1) out.push(GAP);
    } else {
      // فاصله، نشانه‌گذاری، ایموجی، نشانهٔ جهت — همه یک چیزند: جداکننده
      gapAfter = true;
    }
  }
  while (out.length && out[out.length - 1] === GAP) out.pop();
  /* بریدن سرِ مرزِ همان قطعه‌ها انجام می‌شود و نه وسطِ رشته: بریدنِ کور
     می‌توانست یک ردهٔ نویسه را نیمه رها کند («missing closing ]») و همان
     الگوی باطل را بسازد که بالا توضیح داده شد. */
  var pat = '', cap = 1600;
  for (var k = 0; k < out.length; k++) {
    if (pat.length + out[k].length > cap) break;
    pat += out[k];
  }
  while (pat.length && pat.slice(-GAP.length) === GAP) pat = pat.slice(0, -GAP.length);
  return pat;
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
  var norm = {}, tight = {};
  for (var k in SRCH_W) {
    if (!Object.prototype.hasOwnProperty.call(SRCH_W, k)) continue;
    norm[k] = srchNorm_(fields[k] || '');
    tight[k] = srchTight_(fields[k] || '');
  }
  for (var i = 0; i < terms.length; i++) {
    var best = 0;
    for (var f in SRCH_W) {
      if (!Object.prototype.hasOwnProperty.call(SRCH_W, f)) continue;
      if (SRCH_W[f] > best && srchHas_(norm[f], tight[f], terms[i])) best = SRCH_W[f];
    }
    if (best) { hit++; score += best; }
  }
  if (!terms.length) return 0;
  // پوشش وزنِ سنگین دارد: ردیفی که چهار واژه از پنج را دارد باید بالاتر از
  // ردیفی بنشیند که یک واژه را چهار بار تکرار کرده.
  score += (hit / terms.length) * 12;
  // پاداشِ عبارتِ کامل روی شکلِ فشرده سنجیده می‌شود، وگرنه یک «؟» در انتهای
  // جملهٔ کاربر آن را برای همیشه دست‌نیافتنی می‌کرد.
  var ph = srchNorm_(phrase || '');
  if (ph && ph.indexOf(' ') !== -1) {
    for (var f2 in SRCH_W) {
      if (!Object.prototype.hasOwnProperty.call(SRCH_W, f2)) continue;
      if (srchHas_(norm[f2], tight[f2], ph)) { score += 10; break; }
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
 * ══ `findAll` نخست، `findNext` به‌عنوانِ سقوطِ مطمئن (۷٫۵۱) ══
 * تا ۷٫۵۰ این تابع فقط حلقهٔ `findNext` بود، با این استدلال که «با
 * `findNext` سقف واقعاً سقف است». استدلال درست بود و هزینه‌اش هرگز
 * سنجیده نشده بود: هر `findNext` یک رفت‌وبرگشتِ سمتِ سرور است و یک واژه
 * که در پنجِ ستونِ دویست ردیف باشد یعنی هزار رفت‌وبرگشت در **یک** تب.
 * جست‌وجوی ۲۳ سپتامبر ۲۲۶ ثانیه گرفت و به سه تب از چهل رسید — یعنی
 * «همه‌اش را می‌گردم» در عمل هفت درصد بود.
 * `findAll` همان را در یک رفت‌وبرگشت می‌دهد. خطرش حافظه است (واژهٔ
 * پرتکرار در شیتی ۶۲ مگابایتی ده‌ها هزار Range می‌سازد)، پس دو مهار
 * دارد: فقط `SEARCH_FIND_MAX` تطبیقِ نخست پیموده می‌شود، و اگر خودِ
 * فراخوان شکست، همان حلقهٔ کرانه‌دارِ قدیم اجرا می‌شود. سقوط به سمتِ
 * کندی است، نه به سمتِ جوابِ غلط — و کدام راه رفته، گزارش می‌شود.
 */
function srchFind_(sh, pattern, cap, deadline) {
  var res = { rows: [], cut: false, via: '', matches: 0 };
  var tf;
  try {
    tf = sh.createTextFinder(pattern);
    if (tf.useRegularExpression) tf.useRegularExpression(true);
    if (tf.matchCase) tf.matchCase(false);
    if (tf.matchEntireCell) tf.matchEntireCell(false);
  } catch (e) { res.err = e.message; return res; }
  var rows = {}, n = 0, first = 0;
  var all = null;
  try { if (tf.findAll) all = tf.findAll(); }
  catch (eA) { all = null; res.fell = eA.message || 'findAll'; }
  if (all) {
    res.via = 'findAll';
    res.matches = all.length;
    /* سقفِ پیمایش از سقفِ ردیف جداست: ردیف می‌گوید چند تا نگه می‌داریم و
       این می‌گوید چند تطبیق را حاضریم **ببینیم**. یک واژه می‌تواند در
       بیستِ ستونِ یک ردیف باشد، پس این دو عدد یکی نیستند. */
    var walk = Math.max(cap, Number(CFG.SEARCH_FIND_MAX) || 6000);
    for (var a = 0; a < all.length; a++) {
      if (a >= walk) { res.cut = true; break; }
      var rw = 0;
      try { rw = all[a].getRow(); } catch (eR) { continue; }
      if (rw > 1 && !rows[rw]) {
        rows[rw] = 1; n++;
        if (n >= cap) { res.cut = true; break; }
      }
    }
  } else {
    res.via = 'findNext';
    try {
      /* ══ دو نگهبان، و هرکدام دلیلِ خودش را دارد ══
         سقفِ تکرار: یک واژه می‌تواند در بیستِ ستونِ **یک** ردیف باشد، پس
         تعدادِ فراخوان با تعدادِ ردیف یکی نیست.
         و `findNext` در Apps Scriptِ واقعی سرِ ته‌کشیدن **دور می‌زند** و از
         اول شروع می‌کند. بی تشخیصِ دور، هر واژهٔ کمیاب تا سقف فراخوان
         می‌سوزاند و هر واژهٔ پرتکرار هم همان. رسیدنِ دوباره به نخستین
         نتیجه یعنی یک دور کامل زده‌ایم. */
      for (var i = 0; i < cap * 6; i++) {
        /* ══ مهلت **داخلِ** همین حلقه، نه بیرونش (۷٫۲۵) ══
           تا ۷٫۲۴ کوچک‌ترین واحدِ غیرقابلِ‌قطع همین حلقه بود: تا ۲۴۰۰
           رفت‌وبرگشت به یک شیتِ ۶۲ مگابایتی. با ۱۵۰ میلی‌ثانیه به ازای هر
           فراخوان، یک تب به‌تنهایی از کلِ بودجه رد می‌شد — و ششْ‌دقیقهٔ
           Apps Script قابلِ گرفتن نیست، پس کاربر به‌جای جوابِ ناقص با
           هشدار، یک استثنا می‌دید. هر ۲۵ فراخوان یک بار ساعت دیده می‌شود. */
        if (deadline && (i % 25) === 24 && new Date().getTime() > deadline) {
          res.cut = true; res.timeout = true; break;
        }
        var r = tf.findNext();
        if (!r) break;
        var row = r.getRow(), col = r.getColumn ? r.getColumn() : 0;
        var sig = row + ':' + col;
        if (!first) first = sig;
        else if (sig === first) break;                 // دور زد
        res.matches++;
        if (row > 1 && !rows[row]) {
          rows[row] = 1; n++;
          if (n >= cap) { res.cut = true; break; }
        }
        if (i === cap * 6 - 1) res.cut = true;         // سقفِ فراخوان
      }
    } catch (e2) { res.err = e2.message; }
  }
  for (var k in rows) if (Object.prototype.hasOwnProperty.call(rows, k)) res.rows.push(Number(k));
  res.rows.sort(function (a2, b2) { return a2 - b2; });
  return res;
}

/**
 * واژه‌ها → کمترین شمارِ الگو.
 *
 * ══ چرا یک الگو برای همهٔ واژه‌ها (۷٫۵۱) ══
 * تا ۷٫۵۰ هر واژه الگوی خودش را داشت و هر الگو یک پویشِ کاملِ سمتِ سرور
 * در **هر** تب. یادداشتِ خودِ `srchRun_` این را می‌دانست و درمانش را
 * سقفِ واژه گذاشته بود (`SEARCH_TERMS_MAX`) — یعنی شمارِ پویش را کم کرد
 * ولی وابستگی‌اش به شمارِ واژه را نگه داشت. نتیجه‌اش این بود که حالتِ
 * **هوشمند**، که واژه‌ها را گسترش می‌دهد، تا سیزده برابرِ حالتِ ساده پویش
 * می‌کرد و — چون بازیابیِ معنایی پیش از آن وقت می‌بَرد — **کمتر** وقت
 * داشت. یعنی قابلیتی که برای بهتر گشتن ساخته شده بود، کمتر می‌گشت.
 *
 * یک الگوی «یکی از این‌ها» همان ردیف‌ها را در یک پویش می‌دهد. امتیازِ
 * به‌ازای واژه آسیب نمی‌بیند: `srchScore_` واژه‌ها را روی متنِ
 * خوانده‌شده و **در حافظه** می‌سنجد، نه با پویشِ جدا.
 *
 * و الگوی «عبارتِ کامل» از مرحلهٔ یافتن حذف شد: هر ردیفی که کلِ عبارت را
 * دارد واژه‌هایش را هم دارد (واژه‌ها از همان عبارت درآمده‌اند)، پس یک
 * پویشِ سربه‌سر اضافه بود. پاداشِ عبارتِ کامل سرِ جای خودش است، در
 * `srchScore_`.
 *
 * گروه‌بندی برای RE2 است و نه برای زیبایی: برنامهٔ منظمِ بسیار بلند را
 * موتورِ شیت رد می‌کند، و یک الگوی باطل یعنی «پیدا نشد» برای چیزی که هست.
 */
function srchPatGroups_(terms) {
  var cap = Math.max(300, Number(CFG.SEARCH_PAT_CHARS) || 2000);
  var groups = [], cur = [], len = 0;
  for (var i = 0; i < terms.length; i++) {
    var p = srchPattern_(terms[i]);
    if (!p) continue;
    if (cur.length && len + p.length + 4 > cap) { groups.push(cur); cur = []; len = 0; }
    cur.push(p); len += p.length + 1;
  }
  if (cur.length) groups.push(cur);
  var pats = [];
  for (var g = 0; g < groups.length; g++) {
    pats.push(groups[g].length === 1 ? groups[g][0] : '(?:' + groups[g].join('|') + ')');
  }
  return pats;
}

/**
 * `want` ردیف از میانِ یافته‌ها — **پخش‌شده در سراسرِ تب**، نه N ردیفِ نخست.
 *
 * ══ چرا نمونه‌گیری و نه «N تای اول» (۷٫۵۱) ══
 * بانک افزودنی است، پس «N ردیفِ نخست» یعنی «کهنه‌ترین N» — و خواستهٔ
 * صریحِ صاحبِ برنامه این بود: «نه از حیثِ زمانی بلکه از حیثِ محتوایی».
 * سهمِ ردیفِ هر تب بی این، سوگیریِ تاریخ را از درِ پشتی برمی‌گرداند:
 * محتوای تازه هرگز خوانده و امتیاز داده نمی‌شد.
 *
 * گامِ ثابت و نه تصادف: جست‌وجوی دوباره باید همان جواب را بدهد. و گام
 * معمولاً از ۲۵ (فاصله‌ای که `srchReadRows_` هنوز یک بلوک می‌شمارَد)
 * کوچک‌تر است، پس پخش‌کردن خواندن را گران نمی‌کند.
 */
function srchSpread_(order, want) {
  if (!order.length || want <= 0) return [];
  if (order.length <= want) return order.slice(0);
  var out = [], n = order.length;
  for (var i = 0; i < want; i++) out.push(order[Math.floor(i * n / want)]);
  return out;
}

/**
 * ردیف‌های پراکنده را با کمترین رفت‌وبرگشت بخوان.
 *
 * دویست `getRange` جدا یعنی دویست رفت‌وبرگشت. ردیف‌های نزدیک به هم در یک
 * بلوک خوانده می‌شوند؛ ردیفِ تکِ دورافتاده همچنان تک خوانده می‌شود، چون
 * خواندنِ یک بلوکِ ده‌هزارردیفی برای دو نتیجه بدتر است.
 */
function srchReadRows_(sh, rows, width, deadline) {
  var out = {};
  if (!rows.length) return out;
  var last = sh.getLastRow(), w = Math.min(width, Math.max(1, sh.getLastColumn()));
  /* ══ بلوک را سلول می‌بندد، نه ردیف (۷٫۲۵) ══
     ۷٫۲۴ خواندن را به همهٔ ستون‌ها باز کرد (که لازم بود) و همان کار این
     حلقه را خطرناک کرد: ۴۰۰ ردیف × ۸۰ ستون = ۳۲٬۰۰۰ سلول، و در این
     شیت‌ها سلولِ یازده‌هزارنویسه‌ای عادی است. `CFG.SYNC_CHUNK_WIDE` (۲۵)
     از روزِ اول برای همین عدد وجود داشت: «با دستهٔ صدوبیستی، یک بار
     خواندن ده‌ها مگابایت می‌شد». پس سقف بر حسبِ سلول بسته می‌شود و با
     پهنای واقعیِ همان تب تقسیم. */
  var maxCells = Math.max(600, Number(CFG.SEARCH_BLOCK_CELLS) || 6000);
  var span = Math.max(1, Math.floor(maxCells / Math.max(1, w)));
  var i = 0;
  while (i < rows.length) {
    /* ══ مهلت **داخلِ** همین حلقه هم (۷٫۵۱) ══
       ۷٫۲۵ این قاعده را برای حلقهٔ `findNext` نوشت و همین‌جا جا انداخت:
       این آخرین حلقهٔ چندرفت‌وبرگشتیِ غیرقابلِ‌قطعِ این بخش بود. هر بلوک
       یک `getRange().getValues()` روی سلول‌هایی است که یازده‌هزار نویسه
       عادی‌شان است، و ششْ‌دقیقهٔ Apps Script قابلِ گرفتن نیست. ردیفِ
       خوانده‌نشده با همان «N ردیف خوانده نشد» گزارش می‌شود. */
    if (deadline && i && new Date().getTime() > deadline) break;
    var a = rows[i], b = a, j = i;
    while (j + 1 < rows.length && rows[j + 1] - b <= 25 && (rows[j + 1] - a) < span) {
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
function srchSrcHeaders_(sh) {
  /* نگاشتِ ستون‌ها یک بار به ازای هر تب خوانده و نگه داشته می‌شود. */
  try {
    if (!sh.__srchMap) {
      var w = Math.max(1, sh.getLastColumn());
      // `srcMap_` خودِ آرایهٔ سرستون‌ها را می‌خواهد و با `findAny_` اندیس
      // برمی‌گرداند؛ `hdrSet_` یک نگاشتِ بولی است و اندیسِ عددی ندارد، پس
      // دادنِ آن یعنی همهٔ ستون‌ها ۱- می‌شوند — بی هیچ خطایی.
      sh.__srchMap = srcMap_(sh.getRange(1, 1, 1, w).getValues()[0]);
    }
    return sh.__srchMap;
  } catch (e) { return null; }
}

/**
 * یک ردیفِ شیتِ منبع → نتیجهٔ نمایشی.
 *
 * ══ چرا از `srcMap_` و نه از «نخستین سلولِ پرِ ردیف» (۷٫۲۵) ══
 *
 * ستونِ اولِ **هر بیست‌ودو تبِ منبع** `Timestamp` است. نسخهٔ پیشین عنوانِ
 * هر نتیجه را از همان می‌گرفت، پس فهرست چنین می‌شد:
 *     «Sun Jun 01 2025 14:22:03 GMT+0400 (Gulf Standard Time)»
 * و دو خطِ اولِ متنی که به مدل می‌رفت هم همان تاریخ و شناسهٔ فایل بود —
 * یعنی بخشِ بزرگی از پرامپتِ رتبه‌بندی، پیش از نخستین واژهٔ محتوا، هدر
 * می‌رفت. و صاحبِ برنامه صریح گفته بود «نه از حیثِ زمانی بلکه از حیثِ
 * محتوایی»؛ عنوانِ هر نتیجه یک تاریخ بود.
 *
 * `srcMap_` از قبل `subject`/`summary`/`points`/`body` را در هر پنج
 * ساختار از روی نامِ سرستون پیدا می‌کند و `buildAutoRec_` سال‌هاست از آن
 * استفاده می‌کند. نادیده گرفتنش تصمیمِ درستی نبود.
 */
function srchSrcItem_(srcTitle, sh, row, vals) {
  var m = srchSrcHeaders_(sh);
  var at = function (i) {
    return (i >= 0 && i < vals.length) ? String(vals[i] == null ? '' : vals[i]).trim() : '';
  };
  var pick = function () {
    for (var a = 0; a < arguments.length; a++) {
      if (!m) break;
      var v = at(m[arguments[a]]);
      if (v) return v;
    }
    return '';
  };

  var id = '';
  if (m && m.fileId >= 0) id = at(m.fileId);
  var linkCell = (m && m.link >= 0) ? at(m.link) : '';
  if (!id && linkCell) {
    var lm = linkCell.match(/(?:\/d\/|id=)([A-Za-z0-9_-]{25,})/);
    if (lm) id = lm[1];
  }
  if (id && !/^[A-Za-z0-9_-]{25,60}$/.test(id)) id = '';

  var subject = pick('subject', 'ctype', 'domain');
  var name = pick('newName', 'oldName');
  var summary = pick('summary', 'summary2', 'content');
  var points = pick('points', 'points2', 'ideas', 'takeaway', 'expert');
  var body = pick('body', 'body2');

  // هرچه نگاشت نشناخت هم دور ریخته نمی‌شود: جست‌وجو آن را دیده بود.
  var rest = [];
  var known = {};
  if (m) for (var k in m) if (m[k] >= 0) known[m[k]] = 1;
  for (var c = 0; c < vals.length; c++) {
    if (known[c]) continue;
    var v = at(c);
    if (v.length > 2) rest.push(v);
  }

  var title = subject || name || summary || points || ('ردیف ' + row);
  var show = srchClip_([subject, summary, points, body].filter(Boolean).join(' — '), 420) ||
             srchClip_(rest.join(' — '), 420);
  var CAP = 40000;
  return {
    where: 'منبع', tab: srcTitle + ' › ' + sh.getName(), row: row, id: id,
    kind: pick('ctype'), date: '', cat: srcTitle,
    fields: { topic: subject || name, msg: points, summary: summary,
              body: String(body).slice(0, 6000), vibe: pick('vibe'),
              raw: rest.join(' — ').slice(0, CAP) },
    title: String(title).slice(0, 180),
    show: show,
    link: id ? driveLink_(id) : (/^https?:\/\//i.test(linkCell) ? linkCell : ''),
    sheetLink: srchRowLink_(sh, row)
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
 * برمی‌گرداند `{items, scanned, sheets, sheetsAll, stopped, notes}`.
 * `stopped` یعنی بودجهٔ زمان یا سقفِ سراسری تمام شد؛ این **همیشه** به
 * کاربر گفته می‌شود. و `sheetsAll` مخرجِ کسر است: «۳ تب» بی مخرج بوی
 * تمامیت می‌دهد، «۳ تب از ۴۰» حقیقت را می‌گوید (۷٫۵۱).
 */
function srchCollect_(terms, phrase, opts) {
  opts = opts || {};
  var t0 = Number(opts.since) || new Date().getTime();
  /* بودجه می‌تواند از بیرون کوچک‌تر شود. لازم شد چون از ۷٫۲۶ یک لایهٔ
     دوم (بازیابیِ معنایی) هم باید در همین شش دقیقه جا شود، و لایه‌ای که
     اول می‌دود نباید بتواند همهٔ وقت را بردارد. */
  var budget = Math.max(20000, Number(opts.budgetMs) || Number(CFG.SEARCH_BUDGET_MS) || 230000);
  var capSheet = Math.max(20, Number(CFG.SEARCH_HITS_PER_SHEET) || 400);
  var capAll = Math.max(20, Number(CFG.SEARCH_CAND_MAX) || 240);
  var rowsMax = Math.max(200, Number(CFG.SEARCH_ROWS_MAX) || 2500);
  var tabMsMin = Math.max(1500, Number(CFG.SEARCH_TAB_MS_MIN) || 2500);
  var tabRowsMin = Math.max(5, Number(CFG.SEARCH_TAB_ROWS_MIN) || 15);
  var out = { items: [], scanned: 0, sheets: 0, sheetsAll: 0, stopped: '', notes: [],
              read: 0, dropped: 0, trimmed: false, via: '', slow: '', slowMs: 0,
              sampled: 0, matches: 0 };
  var left = function () { return budget - (new Date().getTime() - t0); };

  var pats = srchPatGroups_(terms);
  if (!pats.length) return out;

  var take = function (sh, mk, tabEnd, rowShare) {
    if (left() < 12000) { out.stopped = out.stopped || 'بودجهٔ زمان'; return false; }
    var tStart = new Date().getTime();
    var rows = {}, order = [], cut = false, err = '';
    for (var q = 0; q < pats.length; q++) {
      if (left() < 8000) { out.stopped = 'بودجهٔ زمان'; cut = true; break; }
      var got = srchFind_(sh, pats[q], capSheet, Math.min(tabEnd, t0 + budget - 6000));
      if (got.via) out.via = got.via;
      out.matches += got.matches || 0;
      if (got.err) { err = got.err; continue; }
      if (got.cut) cut = true;
      for (var r = 0; r < got.rows.length; r++) {
        if (!rows[got.rows[r]]) { rows[got.rows[r]] = 1; order.push(got.rows[r]); }
      }
      if (order.length >= capSheet) { cut = true; break; }
    }
    var mark = function () {
      var el = new Date().getTime() - tStart;
      if (el > out.slowMs) { out.slowMs = el; out.slow = sh.getName(); }
    };
    if (err) {
      /* تبی که خطا داد **گشته نشده**. شمردنش در «N تب گشته شد» از سکوت
         بدتر است: پوششی را ادعا می‌کند که وجود نداشته. */
      out.notes.push('تبِ «' + sh.getName() + '» گشته نشد: ' + err);
      mark();
      return true;
    }
    out.sheets++;
    if (cut) out.stopped = out.stopped || 'سقفِ نتیجه در یک تب';
    if (!order.length) { mark(); return true; }
    order.sort(function (a, b) { return a - b; });
    /* ══ سهمِ ردیفِ هر تب، و چرا این هم مثلِ زمان تقسیم می‌شود (۷٫۵۱) ══
       `SEARCH_ROWS_MAX` یک کیفِ سراسری بود و نخست‌آمده همه‌اش را می‌برد:
       با ۲٬۵۰۰ ردیف و ۴۰۰ ردیف به ازای هر تب، شش تبِ اول کیف را خالی
       می‌کردند و سی‌وچهار تبِ بعدی «گشته» شمرده می‌شدند بی آنکه یک ردیف
       از آن‌ها خوانده شود. همان باگِ ۷٫۲۴ در منبعی دیگر: نگهبانی که برای
       یک منبع نوشته شده، بی‌صدا منبعِ دیگری را می‌بندد. */
    var room = Math.max(0, Math.min(rowShare, rowsMax - out.read));
    if (!room) { out.stopped = out.stopped || 'سقفِ ردیف‌های خوانده‌شده'; mark(); return true; }
    var pick = srchSpread_(order, room);
    if (pick.length < order.length) out.sampled++;
    /* ══ همهٔ ستون‌ها، نه بیست‌وچهار تا (۷٫۲۴) ══
       `createTextFinder` در **همهٔ** ستون‌ها می‌گردد ولی نسخهٔ اول فقط ۲۴
       ستونِ اول را می‌خواند. شیت‌های تازهٔ منبع ۵۷ ستون دارند و — طبق
       `tests/fixtures/newsheets.json` که از خودِ همان شیت گرفته شده —
       تحلیل و نکته‌ها در ستون‌های ۲۵ به بعدند. یعنی دقیقاً همان چیزی که
       این قابلیت برایش ساخته شد، خوانده نمی‌شد و بی‌صدا امتیازِ صفر
       می‌گرفت. */
    var wide = Math.max(1, Math.min(Number(CFG.SEARCH_MAX_COLS) || 80, sh.getLastColumn()));
    var vals = srchReadRows_(sh, pick, wide, Math.min(tabEnd, t0 + budget - 4000));
    var z = 0, missed = 0, dropped = 0;
    for (; z < pick.length; z++) {
      if (out.read >= rowsMax) { out.stopped = out.stopped || 'سقفِ ردیف‌های خوانده‌شده'; break; }
      var v = vals[pick[z]];
      if (!v) { missed++; continue; }
      out.read++;
      var it = mk(sh, pick[z], v);
      it.score = srchScore_(it.fields, terms, phrase);
      /* الگو خورده ولی امتیاز صفر است. از ۷٫۲۴ این تقریباً همیشه یعنی
         «تطبیق در ستونی بود که وزنی ندارد»، نه یک اشکال — ولی شمرده
         می‌شود، چون «یافته ولی نشان‌داده‌نشده» عددی است که اگر یک روز
         بزرگ شود، تنها نشانهٔ برگشتِ همان باگِ خاموش است. */
      if (it.score <= 0) { dropped++; continue; }
      out.items.push(it);
      out.scanned++;
    }
    out.dropped += dropped;
    /* کیفِ سراسریِ ردیف که تمام شود، هر تبِ نرسیده **هرگز** خوانده نمی‌شود —
       پس این یک ایستادن است و در قابِ سرخ می‌رود، نه یک یادداشت. تا پیش از
       این فقط در ابتدای حلقه دیده می‌شد، و تبی که کیف را دقیقاً تا ته خالی
       می‌کرد هیچ‌وقت دوباره واردِ حلقه نمی‌شد: بودجه تمام، و «کامل». */
    if (out.read >= rowsMax) out.stopped = out.stopped || 'سقفِ ردیف‌های خوانده‌شده';
    /* ══ سقف یعنی «چند تا نگه می‌داریم»، نه «کِی می‌ایستیم» (۷٫۲۵) ══
       تا ۷٫۲۴ وقتی شمارِ نامزدها به سقف می‌رسید، پویش همان‌جا می‌ایستاد —
       و چون تب‌ها به ترتیبِ `getSheets` پیموده می‌شوند، ۲۴۰ تطبیقِ ضعیف در
       تب‌های اول می‌توانستند جلوی دیده‌شدنِ **عبارتِ دقیقِ کاربر** در تبِ
       پانزدهم را بگیرند. یعنی «مرتب بر پایهٔ معنا» فقط درونِ یک پیشوندِ
       دلخواه از داده صدق می‌کرد. حالا هرچه پیدا شود سنجیده می‌شود و فقط
       بهترین‌ها نگه داشته می‌شوند؛ ایستادن را زمان تعیین می‌کند، نه ترتیبِ
       الفبایی تب‌ها. */
    /* بریدن **فقط در پایان** انجام می‌شود. بریدنِ میانِ راه همان باگ را از
       در دیگر برمی‌گرداند: مساوی‌ها ترتیبِ ورود را نگه می‌دارند، و چون
       شیت‌های منبع آخر پیموده می‌شوند، نتیجهٔ هم‌امتیازِ منبع همیشه قربانی
       می‌شد. حجمِ کار را `SEARCH_ROWS_MAX` می‌بندد، نه این. */
    if (missed) out.notes.push('در «' + sh.getName() + '» ' + missed + ' ردیف خوانده نشد.');
    mark();
    return true;
  };

  /* ══ نقشهٔ تب‌ها **پیش از** هر گشتنی (۷٫۵۱) ══
     تا ۷٫۵۰ مهلتی که به هر تب داده می‌شد کلِ بودجه بود، پس تبِ اول
     می‌توانست همه‌اش را بخورد و ترتیبِ `getSheets` تعیین می‌کرد چه چیزی
     گشته می‌شود. برای تقسیمِ زمان باید شمارِ تب‌ها را از پیش دانست — و
     همان عدد، مخرجِ کسری است که به کاربر گفته می‌شود. بی مخرج،
     «۳ تب گشته شد» بوی تمامیت می‌دهد و کاربر نتیجه می‌گیرد آن چیز نیست.
     خواندنِ فهرستِ تب‌ها فقط فراداده است؛ همان پنج `openById` که پیش از
     این هم داخلِ حلقه انجام می‌شد، حالا یک‌جا و زودتر. */
  var plan = [];
  try {
    var hub = getHub_();
    var htabs = srchHubTabs_(hub);
    if (!htabs.length) out.notes.push('هیچ تبِ دسته‌ای در بانک شناخته نشد.');
    for (var ht = 0; ht < htabs.length; ht++) plan.push({ sh: htabs[ht], src: '' });
  } catch (eH) { out.notes.push('بانک خوانده نشد: ' + eH.message); }

  // ── شیت‌های منبع ── (فقط خواندن؛ هرگز نوشتن)
  /* ══ منبع را نبود سقفِ بانک نباید بخورَد (۷٫۲۴) ══
     نسخهٔ اول `!out.stopped` را شرط کرده بود، پس هر واژهٔ نه‌چندان کمیابی
     که بانک را تا سقف پر می‌کرد، **هر پنج شیتِ منبع را کامل رد می‌کرد** —
     و پنجره همان موقع پیشنهاد می‌داد «تیکِ شیت‌های منبع را بردارید»، یعنی
     راهنمایی به خاموش‌کردنِ لایه‌ای که اصلاً گشته نشده بود. حالا منبع در
     همان نقشه می‌نشیند و سهمِ خودش را از زمان و ردیف می‌گیرد. */
  if (opts.sources !== false) {
    var list = CFG.SOURCES || [];
    for (var s = 0; s < list.length; s++) {
      var src = list[s], ss = null;
      try { ss = SpreadsheetApp.openById(src.id); }
      catch (eO) { out.notes.push('شیتِ «' + src.title + '» باز نشد: ' + eO.message); continue; }
      var shs = [];
      // قرینهٔ `openById` بالا یادداشت می‌گذارد؛ این یکی نمی‌گذاشت، و همان
      // نگذاشتن یعنی یک شیتِ کاملاً نگشته که کسی خبردار نمی‌شود.
      try { shs = ss.getSheets(); }
      catch (eS) { out.notes.push('تب‌های «' + src.title + '» خوانده نشد: ' + eS.message); continue; }
      for (var u = 0; u < shs.length; u++) plan.push({ sh: shs[u], src: src.title });
    }
  }
  out.sheetsAll = plan.length;

  for (var pi = 0; pi < plan.length; pi++) {
    var rest = plan.length - pi;
    /* سهمِ نخورده به جلو می‌رود: تقسیم هر بار روی **باقیماندهٔ** بودجه و
       باقیماندهٔ تب‌ها انجام می‌شود، پس تبِ خالی وقتش را به بعدی می‌دهد. */
    var tabEnd = new Date().getTime() + Math.max(tabMsMin, Math.floor(left() / rest));
    var share = Math.max(tabRowsMin, Math.floor(Math.max(0, rowsMax - out.read) / rest));
    var ent = plan[pi];
    // با پرانتز صدا زده می‌شوند و نه به‌صورتِ ارجاع، تا نگهبانِ «تابعِ
    // خصوصیِ بی‌فراخوان» (run_wiring_test ۱.۱) واقعاً ببیندشان.
    var mk = ent.src
      ? (function (title) {
          return function (sh2, row, vals) { return srchSrcItem_(title, sh2, row, vals); };
        })(ent.src)
      : function (sh, row, vals) { return srchHubItem_(sh, row, vals); };
    if (!take(ent.sh, mk, tabEnd, share)) break;
  }

  if (out.sampled) {
    /* این «ناتمام» نیست و در قابِ سرخ نمی‌رود: نمونهٔ پخش‌شده از چهل تب
       بهتر از خواندنِ کاملِ شش تب است، و گفتنش لازم است چون عددِ
       «ردیفِ نامزد» را توضیح می‌دهد. هشداری که برای حالتِ سالم روشن شود،
       همان هشداری است که یاد می‌گیرند نخوانند. */
    out.notes.push('در ' + out.sampled + ' تب یافته‌ها از سهمِ ردیفِ آن تب ' +
                   'بیشتر بود؛ نمونه‌ای پخش‌شده در سراسرِ تب خوانده شد (نه ' +
                   'ردیف‌های نخست، که کهنه‌ترین‌ها هستند). پوششِ همهٔ تب‌ها بر ' +
                   'خواندنِ کاملِ چند تبِ اول اولویت دارد.');
  }
  out.items.sort(function (a, b) { return b.score - a.score; });
  if (out.items.length > capAll) { out.items.length = capAll; out.trimmed = true; }
  return out;
}

/* ══════════════ بازیابیِ معنایی (بخشِ ۳۵) ══════════════ */

/**
 * نامزدهایی که **هیچ واژهٔ مشترکی** با پرس‌وجو ندارند.
 *
 * این دقیقاً همان نیمه‌ای است که تا ۷٫۲۵ غایب بود. `srchExpand_` واژه‌ها
 * را گسترش می‌داد و `srchRank_` نتیجه را معنایی مرتب می‌کرد — ولی هر دو
 * روی چیزی کار می‌کردند که جست‌وجوی **واژه‌ای** پیدا کرده بود. متنی که
 * همان حرف را با واژه‌های دیگری زده باشد، هرگز به دستِ مدل نمی‌رسید.
 *
 * ══ چرا این‌جا و نه داخلِ srchCollect_ ══
 * جمع‌آوریِ لغوی بودجه و سقف و نکته‌های خودش را دارد و سال‌هاست آزمون
 * دارد. بازیابیِ معنایی یک **منبعِ دومِ نامزد** است، نه تغییری در آن —
 * پس کنارش می‌ایستد و نتیجه‌اش به همان فهرست اضافه می‌شود. خرابیِ یکی
 * دیگری را زمین نمی‌زند، و اگر ایندکس خالی باشد رفتارِ دیروز عیناً
 * باقی است.
 *
 * فراخوانِ رو به جلو (۳۴ → ۳۵) عمداً پشتِ `typeof` و try/catch است:
 * بارگذارهای جزئیِ tests/ بخشِ ۳۵ را ندارند و بی این، هر فراخوان یک
 * ReferenceError می‌شد که try/catchِ بیرونی بی‌صدا می‌بلعید.
 */
function srchSemantic_(q, have, deadline) {
  var out = { ok: false, items: [], added: 0, scanned: 0, shards: 0,
              shardsAll: 0, stopped: '', note: '', dropped: 0 };
  if (CFG.EMB_ON === false) { out.note = 'اثر انگشت خاموش است'; return out; }
  if (typeof embQueryVec_ !== 'function' || typeof embSearch_ !== 'function') {
    out.note = 'بخشِ اثر انگشت بارگذاری نشده';
    return out;
  }
  var left = deadline - new Date().getTime();
  if (left < 15000) { out.note = 'وقتی برای بازیابیِ معنایی نماند'; return out; }

  var qv = embQueryVec_(q);
  if (!qv.ok) { out.note = qv.note || 'بردارِ پرس‌وجو ساخته نشد'; return out; }
  var sr = embSearch_(qv.vec, { budgetMs: Math.min(left - 8000, 60000) });
  out.scanned = sr.scanned; out.shards = sr.shards; out.shardsAll = sr.shardsAll;
  out.stopped = sr.stopped;
  if (!sr.ok) { out.note = sr.note || 'جست‌وجوی معنایی نتیجه‌ای نداد'; return out; }

  /* آنچه جست‌وجوی لغوی از قبل آورده، دوباره خوانده نمی‌شود — ولی
     امتیازِ معنایی‌اش روی همان می‌نشیند، چون «هم واژه‌اش هست هم
     معنایش» قوی‌ترین نشانه است. */
  var seen = {};
  for (var h = 0; h < have.length; h++) {
    if (have[h].where === 'بانک') seen[have[h].tab + '§' + have[h].row] = have[h];
  }

  var byTab = {}, order = [];
  for (var i = 0; i < sr.items.length; i++) {
    var it = sr.items[i];
    var k = it.tab + '§' + it.row;
    if (seen[k]) { seen[k].sem = it.score; continue; }
    if (!byTab[it.tab]) { byTab[it.tab] = []; order.push(it.tab); }
    byTab[it.tab].push(it);
  }

  var hub = getHub_();
  for (var t = 0; t < order.length; t++) {
    if (new Date().getTime() > deadline) { out.stopped = out.stopped || 'بودجهٔ زمان'; break; }
    var sh = hub.getSheetByName(order[t]);
    if (!sh) continue;
    var rows = [], map = {};
    for (var r = 0; r < byTab[order[t]].length; r++) {
      rows.push(byTab[order[t]][r].row);
      map[byTab[order[t]][r].row] = byTab[order[t]][r];
    }
    rows.sort(function (a, b) { return a - b; });
    var vals = srchReadRows_(sh, rows, HUB_HEADERS.length);
    for (var v = 0; v < rows.length; v++) {
      var row = vals[rows[v]];
      if (!row) continue;
      /* ══ شناسه وارسی می‌شود، هر بار ══
         قطعه شمارهٔ ردیف را نگه می‌دارد و ردیف‌ها در این بانک هرگز حذف
         نمی‌شوند — ولی «هرگز» یک قرارداد است نه یک قانونِ فیزیکی، و
         نتیجهٔ یک جابه‌جایی، لینکی است که کاربر را به محتوای دیگری
         می‌برد. یک مقایسهٔ رشته‌ای ارزان‌تر از آن اشتباه است. */
      var want = map[rows[v]];
      var got = String(row[COL.EMB_ID - 1] || '').trim();
      if (got && want.id && got !== want.id) { out.dropped++; continue; }
      var item = srchHubItem_(sh, rows[v], row);
      item.score = 0;
      item.sem = want.score;
      item.fit = 'یافتهٔ معنایی';
      out.items.push(item);
      out.added++;
    }
  }
  out.ok = true;
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
      // رقمِ فارسی از یک پرامپتِ تماماً فارسی کاملاً محتمل است؛ و
      // `replace(/[^0-9]/g,'')` علامت را هم می‌خورد، پس «۱-» می‌شد «۱».
      var raw = srchNorm_(String(hits[h].id));
      var neg = /^\s*-/.test(raw);
      var n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (neg || !(n >= 1 && n <= items.length)) continue;   // شناسهٔ ساختگی
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
              sheetsAll: 0, stopped: '', ms: 0, dropped: 0, read: 0, semantic: null,
              via: '', matches: 0, slow: '', slowMs: 0 };
  var budget = Math.max(60000, Number(CFG.SEARCH_BUDGET_MS) || 230000);
  if (!q) { res.notes.push('چیزی برای جست‌وجو ننوشتید.'); return res; }
  if (CFG.SEARCH_ON === false) { res.notes.push('جست‌وجو خاموش است.'); return res; }

  var terms = srchTerms_(q);
  /* ساعتِ بودجه از **اینجا** شروع می‌شود و نه از `srchCollect_`: فراخوانِ
     گسترشِ واژه‌ها پیش از آن است و `geminiText_` تا شش بار تلاش می‌کند.
     بی این، مجموعِ زمان می‌شد «گسترش + ۲۳۰ ثانیه + رتبه‌بندی» در برابرِ
     سقفِ سختِ ۳۶۰ ثانیه‌ای که اصلاً قابلِ گرفتن نیست. */
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
  /* ══ سقفِ واژه ماند، ولی دلیلش عوض شد (۷٫۵۱) ══
     تا ۷٫۵۰ هر واژه یک پویشِ کاملِ سمتِ سرور در **هر** تب بود، و این سقف
     تنها مهارِ آن. از ۷٫۵۱ همهٔ واژه‌ها در یک الگو می‌روند
     (`srchPatGroups_`)، پس شمارِ پویش دیگر به شمارِ واژه بند نیست. آنچه
     مانده دو چیزِ واقعی است: طولِ برنامهٔ منظمِ RE2، و اینکه امتیازدهی به
     ازای هر واژه روی هر ردیف اجرا می‌شود. بریدن گفته می‌شود. */
  var tmax = Math.max(3, Number(CFG.SEARCH_TERMS_MAX) || 12);
  if (terms.length > tmax) {
    res.notes.push('از ' + terms.length + ' واژه، ' + tmax +
                   ' واژهٔ نخست گشته شد تا جست‌وجو در وقت بماند.');
    terms = terms.slice(0, tmax);
  }
  res.terms = terms.slice(0);

  /* ══ معنا **پیش از** واژه، و با سهمِ تضمین‌شده (۷٫۲۶) ══
     نه به این دلیل که مهم‌تر است، بلکه به این دلیل که کران‌دار است: یک
     فراخوانِ بردار و یک پویشِ قطعه‌ها. جست‌وجوی لغوی می‌تواند کلِ بودجه
     را بخورد و تا ۷٫۲۵ هم می‌خورد؛ اگر معنا بعد از آن می‌آمد، در هر
     پرس‌وجوی سنگین بی‌صدا اجرا نمی‌شد — یعنی همان قابلیتی که خواسته شده
     بود، درست در سخت‌ترین پرس‌وجوها غایب می‌بود. */
  var semItems = [], semOn = false;
  if (res.mode === 'هوشمند' && CFG.EMB_ON === false) {
    /* خاموش‌بودن هم یک خبر است و باید در نتیجه دیده شود. `null` یعنی
       «این حالت اصلاً معنایی ندارد» (جست‌وجوی ساده)، و آن با «هست ولی
       خاموش است» یکی نیست. */
    res.semantic = { on: false, added: 0, found: 0, scanned: 0, shards: 0,
                     shardsAll: 0, note: 'اثر انگشتِ معنایی خاموش است' };
  }
  if (res.mode === 'هوشمند' && opts.semantic !== false && CFG.EMB_ON !== false) {
    var sem = { ok: false, items: [], note: '' };
    try { sem = srchSemantic_(q, [], t0 + Math.max(20000, Number(CFG.EMB_SEARCH_MS) || 90000) + 10000); }
    catch (eSm) { sem = { ok: false, items: [], note: eSm.message }; }
    semOn = !!sem.ok;
    semItems = sem.items || [];
    res.semantic = { on: semOn, added: 0, found: semItems.length,
                     scanned: sem.scanned || 0, shards: sem.shards || 0,
                     shardsAll: sem.shardsAll || 0, note: sem.note || '' };
    if (sem.ok) {
      if (sem.dropped) {
        res.notes.push(sem.dropped + ' یافتهٔ معنایی کنار رفت چون شناسهٔ ' +
                       'ردیف با ایندکس نمی‌خواند (ردیف جابه‌جا شده).');
      }
      if (sem.stopped) res.notes.push('بازیابیِ معنایی ناتمام ماند: ' + sem.stopped);
      if (sem.shardsAll && sem.shards < sem.shardsAll) {
        res.notes.push('از ' + sem.shardsAll + ' قطعهٔ اثر انگشت، ' + sem.shards +
                       ' تا خوانده شد.');
      }
    } else if (sem.note) {
      res.notes.push('بازیابیِ معنایی انجام نشد (' + sem.note +
                     ') — فقط واژه‌ها گشته شد.');
    }
  }
  var used = new Date().getTime() - t0;
  var col = srchCollect_(terms, q, { sources: opts.sources !== false, since: new Date().getTime(),
                                     budgetMs: Math.max(30000, budget - used) });
  res.scanned = col.scanned; res.sheets = col.sheets; res.stopped = col.stopped;
  res.read = col.read;
  /* مخرج، و نه فقط صورت: «۳ تب» را کاربر «همه‌اش» می‌خواند، «۳ تب از ۴۰»
     را نمی‌خواند. و `via`/`slow` برای همین است که نسخهٔ بعد ادعا نکند
     سریع‌تر شده — بلکه جست‌وجوی بعدیِ خودِ صاحبِ برنامه عدد را بدهد. */
  res.sheetsAll = col.sheetsAll; res.via = col.via || '';
  res.matches = col.matches || 0;
  res.slow = col.slow || ''; res.slowMs = col.slowMs || 0;
  for (var n = 0; n < col.notes.length; n++) res.notes.push(col.notes[n]);

  /* ادغام: آنچه هر دو لایه آورده‌اند یک ردیف است، نه دو تا — و امتیازِ
     معنایی‌اش روی همان ردیفِ لغوی می‌نشیند، چون «هم واژه‌اش هست هم
     معنایش» قوی‌ترین نشانه‌ای است که این بخش دارد. */
  var merged = col.items.slice(0);
  if (semItems.length) {
    var pos = {};
    for (var pi = 0; pi < merged.length; pi++) {
      if (merged[pi].where === 'بانک') pos[merged[pi].tab + '§' + merged[pi].row] = pi;
    }
    var addedN = 0;
    for (var si = 0; si < semItems.length; si++) {
      var sk = semItems[si].tab + '§' + semItems[si].row;
      if (pos[sk] !== undefined) { merged[pos[sk]].sem = semItems[si].sem; continue; }
      merged.push(semItems[si]);
      addedN++;
    }
    if (res.semantic) res.semantic.added = addedN;
    if (addedN) {
      res.notes.push(addedN + ' مورد را جست‌وجوی معنایی آورد — این‌ها هیچ ' +
                     'واژهٔ مشترکی با متنِ شما نداشتند و با نشانِ ' +
                     '«یافتهٔ معنایی» می‌آیند.');
    }
  }

  /* ══ آمیختنِ دو امتیاز ══
     امتیازِ لغوی کران ندارد و امتیازِ معنایی کسینوس است؛ جمعِ خامشان
     یعنی هر کدام که مقیاسِ بزرگ‌تری دارد برنده است. هر دو به [۰,۱]
     برده می‌شوند و قاعده صریح است: **قوی‌ترین نشانه تعیین‌کننده است، و
     داشتنِ هر دو نشانه امتیازِ اضافه می‌گیرد** — «هم واژه‌اش هست هم
     معنایش» محکم‌ترین شاهدی است که این بخش دارد. */
  var bestLex = 0, bestSem = 0;
  for (var bi = 0; bi < merged.length; bi++) {
    bestLex = Math.max(bestLex, merged[bi].score || 0);
    bestSem = Math.max(bestSem, merged[bi].sem || 0);
  }
  /* هر دو نسبت به بهترینِ خودشان مقیاس می‌شوند، نه با یک عددِ ثابت:
     مقدارِ مطلقِ کسینوس به طول و زبانِ متن بستگی دارد و یک آستانهٔ
     سفت، روی یک پرس‌وجو درست است و روی دیگری فهرست را خالی می‌کند. */
  for (var mi = 0; mi < merged.length; mi++) {
    var ln = bestLex > 0 ? ((merged[mi].score || 0) / bestLex) : 0;
    var sn = bestSem > 0 ? ((merged[mi].sem || 0) / bestSem) : 0;
    merged[mi].rank = Math.max(ln, sn) + 0.25 * Math.min(ln, sn);
  }
  merged.sort(function (a2, b2) { return (b2.rank || 0) - (a2.rank || 0); });

  var top = Math.max(5, Number(CFG.SEARCH_TOP) || 25);
  var toModel = Math.max(top, Math.min(merged.length, 120));
  var picked = merged.slice(0, toModel);
  if (res.mode === 'هوشمند' && merged.length > toModel) {
    res.notes.push('از ' + merged.length + ' نامزد، ' + toModel +
                   ' موردِ پرامتیازتر به مدل داده شد.');
  }
  if (col.trimmed) {
    res.notes.push('نامزدها از سقف گذشتند؛ کم‌امتیازترها کنار رفتند — ' +
                   'نه بر پایهٔ ترتیبِ تب‌ها، بلکه بر پایهٔ امتیاز.');
  }
  if (col.dropped) res.dropped = col.dropped;

  if (res.mode === 'هوشمند' && picked.length) {
    var rk = srchRank_(q, picked);
    res.answer = rk.answer;        // حتی وقتی مدل هیچ‌کدام را نپسندید
    if (rk.ok && rk.order.length) {
      var ordered = [], used = {};
      for (var o = 0; o < rk.order.length && ordered.length < top; o++) {
        var it = picked[rk.order[o]];
        if (!it) continue;
        var w = rk.why[rk.order[o]] || {};
        it.why = w.why || ''; it.fit = w.fit || '';
        ordered.push(it); used[rk.order[o]] = 1;
      }
      /* ══ مدل حق دارد کنار بگذارد، ولی نه بی‌صدا (۷٫۲۴) ══
         `srchRank_` کلِ فهرست را با انتخابِ مدل جایگزین می‌کرد، پس
         موردی با امتیازِ لغویِ ۳۷ می‌توانست کاملاً ناپدید شود در حالی که
         کاربر هیچ‌وقت نمی‌فهمید بوده. کوتاه‌کردنِ فهرست خوب است — پنهان
         کردنش نه. آنچه مدل نپسندیده ولی امتیازِ لغویِ بالایی دارد، زیرِ
         بقیه و با نشان می‌آید. */
      var best = picked.length ? picked[0].score : 0;
      var extra = 0;
      for (var x = 0; x < picked.length && ordered.length < top; x++) {
        if (used[x]) continue;
        if (best > 0 && picked[x].score < best * 0.5) continue;
        picked[x].why = ''; picked[x].fit = 'مدل کنارش گذاشت';
        ordered.push(picked[x]); extra++;
      }
      if (extra) {
        res.notes.push(extra + ' مورد را مدل مرتبط ندانست ولی واژه‌هایشان ' +
                       'قوی بود؛ با نشانِ «مدل کنارش گذاشت» در انتها آمده‌اند.');
      }
      res.items = ordered;
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
  /* ══ یک ردِ پا، چون تنها خرابیِ این بخش سکوت است (۷٫۲۵) ══
     وقتی پنجره بسته شود هیچ نشانی نمی‌مانَد که جست‌وجویی شده، چه رسید و
     چقدر بریده شد. همان قاعدهٔ «کاربردِ جزوه»: وضعیت می‌گوید حالا چطور
     است، ولی سؤالی که سرِ خرابی می‌پرسی «از کِی؟» است و جوابش فقط در
     تاریخچه است. یک خط در سیاههٔ موجود، بی تبِ تازه. */
  try {
    logLine_('جست‌وجو (' + res.mode + '): «' + q.slice(0, 60) + '» → ' +
             res.items.length + ' نتیجه از ' + res.read + ' ردیفِ خوانده‌شده در ' +
             res.sheets + ' تب از ' + res.sheetsAll +
             ' · ' + res.terms.length + ' واژه در ' + srchPatGroups_(res.terms).length +
             ' الگو' + (res.via ? ' · ' + res.via : '') +
             (res.matches ? ' · ' + res.matches + ' تطبیق' : '') +
             (res.slow ? ' · کندترین تب «' + res.slow + '» ' +
                         Math.round(res.slowMs / 1000) + 'ث' : '') +
             (res.semantic && res.semantic.on
               ? ' · معنایی ' + res.semantic.added + ' از ' + res.semantic.scanned : '') +
             (res.dropped ? ' · ' + res.dropped + ' بی‌امتیاز' : '') +
             (res.stopped ? ' · ناتمام: ' + res.stopped : '') +
             ' · ' + Math.round(res.ms / 1000) + 'ث');
  } catch (eL) {}
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
  H.push('<label style="font-size:13px"><input type="checkbox" id="src"' +
         (CFG.SEARCH_SOURCES_DEFAULT === false ? '' : ' checked') + '> ' +
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
  H.push('H.push("<div class=\\"m\\">حالت: "+esc(r.mode)+" · "+r.sheets+" تب از "+' +
         '(r.sheetsAll||r.sheets)+" گشته شد · "+r.scanned+" ردیفِ نامزد از "+' +
         'r.read+" ردیفِ خوانده‌شده · "+Math.round(r.ms/1000)+" ثانیه</div>");');
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
  H.push('var x=t.show||(t.fields&&(t.fields.msg||t.fields.summary||t.fields.body))||"";');
  H.push('if(x){H.push("<div class=\\"x\\">"+esc(x.slice(0,420))+"</div>");}');
    /* ══ دو تنها مقداری که از esc نمی‌گذشتند (۷٫۲۴) ══
     ستونِ «لینک» در بانک عیناً از سلولِ شیتِ منبع می‌آید، و آن شیت‌ها را
     تحلیلگرهایی پر می‌کنند که فراداده‌های بیرونی می‌خورند. یعنی یک نقل‌قول
     در آن سلول می‌توانست از href بیرون بزند و اسکریپت تزریق کند — و
     اسکریپتِ داخلِ این پنجره `google.script.run` دارد، یعنی به همهٔ
     توابعِ موتور با اختیارِ خودِ صاحبِ برنامه می‌رسد. حالا هم گریز
     می‌خورند و هم فقط http(s) پذیرفته است. */
  H.push('function saf(u){u=String(u==null?"":u);' +
         'return /^https?:\\/\\//i.test(u)?u:"";}');
  /* ══ و همین‌جا دو بک‌اسلش لازم است، نه یکی (۷٫۴۳) ══
     رشتهٔ بیرونی تک‌کوتیشن است، پس `\"` پیش از رسیدن به پنجره به `"`
     فرو می‌ریزد و `href=""+esc(lf)+""` می‌شود — نقل‌قول‌های نابسته، یعنی
     خطای نحوی، یعنی **کلِ** بلوکِ <script> پارس نمی‌شود و `go` هرگز
     تعریف نمی‌شود. دکمه‌ها بی‌صدا هیچ نمی‌کنند.
     تلخیِ ماجرا: این دو خط برای **امنیت** اضافه شدند (گریزِ href)، و
     همان‌ها کلِ پنجره را از کار انداختند. */
  H.push('var L=[];var lf=saf(t.link),ls=saf(t.sheetLink);');
  H.push('if(lf){L.push("<a href=\\""+esc(lf)+"\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">بازکردنِ فایل</a>");}');
  H.push('if(ls){L.push("<a href=\\""+esc(ls)+"\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\">همان ردیف در شیت</a>");}');
  H.push('if(L.length){H.push("<div class=\\"m\\">"+L.join(" · ")+"</div>");}');
  H.push('H.push("</div>");}');
  H.push('document.getElementById("out").innerHTML=H.join("");}');
  H.push('</script></body></html>');
  return H.join('');
}
