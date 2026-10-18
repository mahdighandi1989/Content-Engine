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
           /* ۹.۴۷: واژه‌های گفت‌وگویی که در پرسشِ او هست و در هر متنی هم — «… که خیلی هم تعریفش شده چیه» */
           'شده', 'شود', 'میشه', 'خیلی', 'چیه', 'چی', 'چه', 'یه', 'رو', 'اون', 'هست', 'هستن', 'داره',
           'دارد', 'کنم', 'باشه', 'ولی', 'اما', 'مثلا',
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
/* ══ شکلِ نزدیک: حروفی که با یک نقطه یا یک دندانه جابه‌جا می‌شوند (۸.۸۳) ══
   کاوشِ کاملِ ۸.۸۱ (۱۲ اکتبر ۱۶:۲۷، هر ۳۹ تب) شاهد را داد: «کس مگو» در **هیچ** ردیفی نیست و «کس نگو» در
   ۲۵ ردیف هست («کس نگو مومن»). یعنی جست‌وجو درست می‌گفت «عیناً نیست»، ولی جوابِ کامل این بود: «شکلِ
   نزدیکش این‌جاست». یک حرف — م به‌جای ن — فرقِ پیدا شدن و نشدن بود؛ همین در حافظهٔ آدم هم رایج است و در
   متنِ استخراج‌شده از تصویر هم (OCR). پس پاسِ عبارت این گروه‌ها را هم‌ارز می‌گیرد — **بی پویشِ اضافه**:
   همان یک findAll، و دقیق یا نزدیک بودن پس از خواندن در جاوااسکریپت سنجیده می‌شود. */
var SRCH_NEAR_ = (function () {
  var G = ['\u0646\u0645', '\u06A9\u0643\u06AF', '\u0633\u0635\u062B', '\u0632\u0630\u0636\u0638',
           '\u062A\u0637', '\u062D\u0647\u0629\u06C0', '\u0642\u063A', '\u0628\u067E', '\u062C\u0686'];
  var m = {};
  for (var i = 0; i < G.length; i++) {
    var g = JSON.parse('"' + G[i] + '"');
    for (var j = 0; j < g.length; j++) m[g.charAt(j)] = g;
  }
  return m;
})();

function srchPattern_(term, near) {
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
      } else if (near && SRCH_NEAR_[c]) {
        out.push('[' + SRCH_NEAR_[c] + ']');
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
  /* ══ واژهٔ کوتاه فقط به‌صورتِ واژه، نه تکه‌ای از واژهٔ دیگر (۸.۷۷) ══
     «کس مگو» در هر دو حالت «Out of memory error» داد، دو روزِ پشتِ‌هم و حتی پس از درمانِ
     ۸.۷۳. الگوی «کس» درونِ «عکس» هم می‌خورد — و «عکس» در ده‌ها هزار سلولِ بانک و شیت‌های
     منبع هست (نوعِ ردیف، متنِ تحلیلِ عکس). `findAll` همهٔ آن تطبیق‌ها را یک‌جا در حافظه
     می‌ساخت. هر دو کوتاه و پرتکرارند: واژهٔ دوسه‌حرفی تقریباً همیشه درونِ واژه‌های دیگر
     هست، و همان تطبیق‌ها نتیجهٔ بی‌ربط هم بودند. پس واژهٔ تا سه حرف دو طرفش باید «نه‌حرف»
     باشد (فاصله، نیم‌فاصله، نشانه، آغاز یا پایانِ سلول). ردهٔ «حرف» با نویسهٔ خام نوشته
     می‌شود نه با `\p{L}`: همان احتیاطِ بالا دربارهٔ RE2ِ شیت. */
  var letters = t.replace(/[^\p{L}\p{N}]/gu, '');
  if (pat && letters.length <= Number(CFG.SEARCH_WORD_EDGE_MAX || 3)) {
    var L = String.fromCharCode(0x0600) + '-' + String.fromCharCode(0x06FF) + 'A-Za-z0-9';
    pat = '(?:^|[^' + L + '])' + pat + '(?:[^' + L + ']|$)';
  }
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
  /* ══ «دستهٔ بانک نیست» با «خوانده نشد» یکی نیست (۷٫۷۳) ══
     تا این نسخه هر دو `false` می‌شدند در یک `catch (e) { return false; }`.
     تبی که سرصفحه‌اش خوانده نشود بی‌صدا از نقشه بیرون می‌رفت **و از مخرج
     هم**، پس گزارش «۳۹ تب از ۳۹» می‌داد در حالی که یکی اصلاً دیده نشده
     بود — همان توهمِ تمامیتی که ۷٫۲۳ مخرج را برایش اضافه کرد.

     نخستین تلاشِ این نسخه برای بستنِ این در، در `srchHubTabs_` نوشته شد و
     **کدِ مرده بود**: خطا همین‌جا خورده می‌شد و هرگز به آن‌جا نمی‌رسید. خودِ
     سنجه گرفتش («یادداشت‌ها: []») — و این چندمین بار در این پرونده است که
     شکستنِ عمدیِ کد چیزی را نشان داد که خواندنش نشان نمی‌داد. */
  var w = 0;
  try {
    w = Math.min(HUB_HEADERS.length, sh.getLastColumn());
  } catch (eW) { throw new Error('شمارِ ستون‌ها خوانده نشد: ' + eW.message); }
  if (w < 12) return false;                    // واقعاً دستهٔ بانک نیست
  var h = null;
  try {
    h = sh.getRange(1, 1, 1, w).getValues()[0];
  } catch (e) { throw new Error('سرصفحه خوانده نشد: ' + e.message); }
  for (var i = 0; i < 12; i++) {
    if (String(h[i]).trim() !== String(HUB_HEADERS[i]).trim()) return false;
  }
  return true;
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
  out.skipped = [];
  try { sheets = (hub || getHub_()).getSheets(); } catch (e) { return out; }
  for (var i = 0; i < sheets.length; i++) {
    try {
      if (srchIsHubTab_(sheets[i])) out.push(sheets[i]);
    } catch (e2) {
      /* ══ تبی که سرصفحه‌اش خوانده نشود، بی‌صدا از **مخرج** هم بیرون
         می‌رفت (۷٫۷۳) ══
         `catch (e2) {}` هم تب را از نقشه برمی‌داشت و هم `sheetsAll` را یکی
         کم می‌کرد، پس گزارش «۳۹ تب از ۳۹» می‌داد در حالی که یک تب اصلاً
         دیده نشده بود — یعنی دقیقاً همان «جست‌وجوی ناقصی که خودش را کامل
         نشان می‌دهد» که ۷٫۲۳ برای جلوگیری از آن مخرج را اضافه کرد. حالا
         نامش برمی‌گردد و در یادداشت‌ها می‌آید. */
      var nmS = '';
      try { nmS = sheets[i].getName(); } catch (e3) { nmS = '؟'; }
      out.skipped.push(nmS + ': ' + String((e2 && e2.message) || e2).slice(0, 60));
    }
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
/** «تب (n)» — شمارِ هر تب در یک فهرستِ کوتاه. */
function srchWhereAdd_(list, tab) {
  for (var i = 0; i < list.length; i++) {
    var m = /^(.*) \((\d+)\)$/.exec(list[i]);
    if (m && m[1] === tab) { list[i] = tab + ' (' + (Number(m[2]) + 1) + ')'; return; }
  }
  if (list.length < 5) list.push(tab + ' (1)');
}

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
    all = null;                        // ۸.۷۷: فهرستِ تطبیق‌ها تا پایانِ جست‌وجو نگه داشته نشود
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
  var maxCells = Math.max(600, Number(CFG.SEARCH_BLOCK_CELLS) || 1500);
  var span = Math.max(1, Math.floor(maxCells / Math.max(1, w)));
  /* ══ چرا خوانده نشد، نه فقط اینکه نشد (۷٫۷۳) ══
     تا این نسخه دو علتِ کاملاً متفاوت به یک عدد می‌رسیدند: «وقت نرسید» و
     «خواندنِ بلوک پرتاب کرد» — و دومی در یک `catch (e) {}` خاموش می‌شد.
     پس گزارشِ «N ردیف خوانده نشد» قابلِ عیب‌یابی نبود: نمی‌شد گفت بودجه کم
     بود یا خواندن شکست خورد، و این دو راهِ حلِ مخالف دارند. عددی که کسی را
     متهم می‌کند باید شاهدش را با خودش بیاورد (۷٫۳۲). */
  out.__why = '';                      // 'وقت' یا متنِ خطا
  var i = 0;
  while (i < rows.length) {
    /* ══ مهلت **داخلِ** همین حلقه هم (۷٫۵۱) ══
       ۷٫۲۵ این قاعده را برای حلقهٔ `findNext` نوشت و همین‌جا جا انداخت:
       این آخرین حلقهٔ چندرفت‌وبرگشتیِ غیرقابلِ‌قطعِ این بخش بود. هر بلوک
       یک `getRange().getValues()` روی سلول‌هایی است که یازده‌هزار نویسه
       عادی‌شان است، و ششْ‌دقیقهٔ Apps Script قابلِ گرفتن نیست. ردیفِ
       خوانده‌نشده با همان «N ردیف خوانده نشد» گزارش می‌شود. */
    if (deadline && i && new Date().getTime() > deadline) {
      out.__why = out.__why || 'وقت';
      break;
    }
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
    } catch (e) {
      /* ══ سقوط به سمتِ کامل‌بودن، نه به سمتِ سکوت ══
         یک بلوکِ هفتادوپنج‌ردیفی از سلول‌های یازده‌هزارنویسه‌ای می‌تواند از
         حدِ خواندن بگذرد در حالی که همان ردیف‌ها یکی‌یکی می‌آیند. تا این
         نسخه یک بلوکِ پرتاب‌کننده یعنی **همهٔ** ردیف‌هایش از دست می‌رفتند،
         بی هیچ نشانه‌ای. حالا همان‌ها تک‌تک تلاش می‌شوند و اگر باز هم نشد،
         علتش نوشته می‌شود. */
      out.__why = out.__why || String((e && e.message) || e).slice(0, 90);
      for (var k2 = i; k2 <= j; k2++) {
        if (deadline && new Date().getTime() > deadline) { out.__why = 'وقت'; break; }
        try {
          var one = sh.getRange(rows[k2], 1, 1, w).getValues();
          if (one && one[0]) out[rows[k2]] = one[0];
        } catch (e2) {}
      }
    }
    i = j + 1;
  }
  return out;
}

/**
 * پس از امتیاز، فقط آنچه بعداً خوانده می‌شود نگه داشته شود (۸.۷۳).
 *
 * `srchScore_` متنِ کامل را لازم دارد و همان لحظه تمام می‌شود؛ بعد از آن فقط
 * موضوع/پیام/خلاصه (رتبه‌بندی، `srchRank_`) و `show` یا تکه‌ای از متن (پنجره) خوانده
 * می‌شوند. ردیفِ منبع تا ~۶۰ هزار نویسه با خودش داشت (`raw` تا ۴۰٬۰۰۰) و تا ۲٬۵۰۰ ردیف تا
 * پایان می‌ماندند: «Out of memory error» در هر دو حالتِ جست‌وجو، ۱۱ اکتبر.
 */
function srchSlim_(it) {
  if (!it || !it.fields) return it;
  var f = it.fields, c = function (v, n) { v = String(v == null ? '' : v); return v.length > n ? v.slice(0, n) : v; };
  if (!it.show) it.show = srchClip_([f.topic, f.summary, f.msg, f.body].filter(Boolean).join(' — '), 420) || srchClip_(f.raw, 420);
  it.fields = { topic: c(f.topic, 300), msg: c(f.msg, 1200), summary: c(f.summary, 1200),
                body: c(f.body, 600), vibe: c(f.vibe, 120), raw: '' };
  return it;
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
  var capAll = Math.max(20, Number(opts.capAll) || Number(CFG.SEARCH_CAND_MAX) || 240);
  var rowsMax = Math.max(Number(opts.rowsMax) ? 20 : 200, Number(opts.rowsMax) || Number(CFG.SEARCH_ROWS_MAX) || 2500);
  var tabMsMin = Math.max(1500, Number(CFG.SEARCH_TAB_MS_MIN) || 2500);
  var tabRowsMin = Math.max(5, Number(CFG.SEARCH_TAB_ROWS_MIN) || 15);
  var out = { items: [], scanned: 0, sheets: 0, sheetsAll: 0, stopped: '', notes: [],
              read: 0, dropped: 0, trimmed: false, via: '', slow: '', slowMs: 0,
              sampled: 0, matches: 0, pend: [], left: 0, pass2: 0, whys: {},
              phraseRows: 0, phraseTabs: 0, phraseWhere: [], nearRows: 0, nearWhere: [], nearForms: {} };
  var left = function () { return budget - (new Date().getTime() - t0); };

  var pats = srchPatGroups_(terms);
  if (!pats.length) return out;
  /* ══ عبارتِ کامل جدا گشته و همیشه خوانده می‌شود (۸.۷۹) ══
     «کس مگو» پس از ۸.۷۷ دیگر خطا نداد، ولی ردیفی که دقیقاً همین عبارت را دارد در نتیجه نبود و
     «یک حرف مگو» بالا آمد. علت: الگوی یافتن «یکی از واژه‌ها» است، و «مگو» به‌تنهایی صدها ردیف
     دارد؛ در تب‌های پُر فقط نمونه‌ای پخش‌شده خوانده می‌شد (۷٫۵۱) و ردیفِ عبارتِ کامل می‌توانست
     بیرونِ نمونه بماند. ۷٫۵۱ این پویش را «اضافه» دانست چون «هر ردیفِ عبارت، واژه‌هایش را هم دارد» —
     درست برای **یافتن**، غلط برای **خواندن**: یافته‌شده‌ای که خوانده نشود، دیده نمی‌شود. */
  var phrasePat = '', phraseRe = null, nearRe = null;
  if (terms.length >= 2 && phrase) {
    try {
      phrasePat = srchPattern_(phrase, true);                 // ۸.۸۳: دقیق + نزدیک، یک پویش
      phraseRe = new RegExp(srchPattern_(phrase), 'iu');
      nearRe = new RegExp(phrasePat, 'iu');
    } catch (ePp) { phrasePat = ''; phraseRe = null; nearRe = null; }
  }
  var prioSet = {};

  /* ══ خواندن و امتیاز دادن، یک جا — چون پاسِ دوم همین کار را می‌کند ══
     دو نسخه از این حلقه یعنی دو جا برای خراب شدن و نصفِ تاریخچه در هرکدام
     (همان دلیلی که `vbrFetch_` یک راهِ دانلود دارد). */
  var absorb = function (sh, mk, pick, tabEnd) {
    var r = { read: 0, missed: 0, dropped: 0, why: '', got: {} };
    var wide = Math.max(1, Math.min(Number(CFG.SEARCH_MAX_COLS) || 80, sh.getLastColumn()));
    var vals = srchReadRows_(sh, pick, wide, Math.min(tabEnd, t0 + budget - 4000));
    r.why = String(vals.__why || '');
    for (var z = 0; z < pick.length; z++) {
      if (out.read >= rowsMax) { out.stopped = out.stopped || 'سقفِ ردیف‌های خوانده‌شده'; break; }
      var v = vals[pick[z]];
      vals[pick[z]] = null;            // ۸.۷۷: ردیفِ خوانده‌شده فقط تا ساختنِ نامزد در حافظه
      if (!v) { r.missed++; continue; }
      out.read++; r.read++; r.got[pick[z]] = 1;
      var it = mk(sh, pick[z], v);
      it.score = srchScore_(it.fields, terms, phrase);
      /* ۸.۸۳: ردیفِ پاسِ عبارت — دقیق یا نزدیک؟ روی متنِ خودِ ردیف، نه حدس. */
      if (prioSet[sh.getName() + '#' + pick[z]] && nearRe) {
        try {
          var rowTxt = srchNorm_([].concat(v).join(' \n '));
          if (phraseRe.test(rowTxt)) {
            out.phraseRows++; srchWhereAdd_(out.phraseWhere, sh.getName());
          } else {
            var nm = nearRe.exec(rowTxt);
            if (nm) {
              /* شکلِ نمایشی از متنِ خام، نه پوست‌کنده — آدم همان را باید بشناسد */
              try { var nmRaw = nearRe.exec([].concat(v).join(' \n ')); if (nmRaw) nm = nmRaw; } catch (eRw) {}
              out.nearRows++; srchWhereAdd_(out.nearWhere, sh.getName());
              var form = String(nm[0]).replace(/[\s\u200C]+/g, function (w) { return /\s/.test(w) ? ' ' : w; }).trim().slice(0, 40);
              out.nearForms[form] = (out.nearForms[form] || 0) + 1;
              it.score += 8;                 // نزدیک کمتر از دقیق (۱۰)، بیشتر از تک‌واژه
            }
          }
        } catch (eNr) {}
      }
      /* الگو خورده ولی امتیاز صفر است. از ۷٫۲۴ این تقریباً همیشه یعنی
         «تطبیق در ستونی بود که وزنی ندارد»، نه یک اشکال — ولی شمرده
         می‌شود، چون «یافته ولی نشان‌داده‌نشده» عددی است که اگر یک روز
         بزرگ شود، تنها نشانهٔ برگشتِ همان باگِ خاموش است. */
      if (it.score <= 0) { r.dropped++; continue; }
      srchSlim_(it);
      out.items.push(it);
      out.scanned++;
      /* ══ فهرستِ کران‌دار (۸.۷۳) ══ «Out of memory error» در هر دو حالت (۱۱ اکتبر):
         تا ۲٬۵۰۰ ردیف با متنِ کاملشان تا پایان نگه داشته می‌شدند. بریدن فقط وقتی
         فهرست چهار برابرِ سقف شد، و تا دو برابرِ سقف — پس مرزِ مساوی‌ها دور از
         نتیجهٔ نهایی می‌مانَد (هراسِ ۷٫۲۵ از بریدنِ میانِ راه). */
      if (out.items.length > capAll * 4) {
        out.items.sort(function (a1, b1) { return b1.score - a1.score; });
        out.items.length = capAll * 2;
      }
    }
    out.dropped += r.dropped;
    if (r.why) out.whys[r.why] = (out.whys[r.why] || 0) + r.missed;
    return r;
  };

  var take = function (sh, mk, tabEnd, rowShare) {
    if (left() < 12000) { out.stopped = out.stopped || 'بودجهٔ زمان'; return false; }
    try { SRCH_AT_ = 'تبِ «' + sh.getName() + '»'; } catch (eAt) {}
    var tStart = new Date().getTime();
    var rows = {}, order = [], cut = false, err = '', prio = [];
    /* ۹.۵۵: گامِ بعدیِ همان تب — ردیف‌ها از گامِ قبل آمده‌اند و دوباره گشته نمی‌شوند. */
    var given = opts.rows && opts.rows.length ? opts.rows : null;
    if (given) { for (var gr = 0; gr < given.length; gr++) { var gv = Number(given[gr]); if (gv > 0 && !rows[gv]) { rows[gv] = 1; order.push(gv); } } }
    if (!given && phrasePat && left() > 8000) {
      var gp = srchFind_(sh, phrasePat, capSheet, Math.min(tabEnd, t0 + budget - 6000));
      if (!gp.err) {
        for (var pr = 0; pr < gp.rows.length; pr++) {
          if (!rows[gp.rows[pr]]) { rows[gp.rows[pr]] = 1; order.push(gp.rows[pr]); prio.push(gp.rows[pr]); }
          prioSet[sh.getName() + '#' + gp.rows[pr]] = 1;
        }
        out.phraseTabs = (out.phraseTabs || 0) + 1;
      }
    }
    for (var q = 0; !given && q < pats.length; q++) {
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
    var pick;
    if (prio.length) {
      /* ردیف‌های عبارتِ کامل اول، همه‌شان (تا سهم)؛ باقیِ سهم نمونهٔ پخش‌شده از بقیه */
      var isP = {};
      for (var ip = 0; ip < prio.length; ip++) isP[prio[ip]] = 1;
      var restO = order.filter(function (x) { return !isP[x]; });
      pick = prio.slice(0, room).concat(srchSpread_(restO, Math.max(0, room - prio.length)));
      pick.sort(function (a, b) { return a - b; });
    } else {
      pick = srchSpread_(order, room);
    }
    if (pick.length < order.length) out.sampled++;
    /* ══ همهٔ ستون‌ها، نه بیست‌وچهار تا (۷٫۲۴) ══
       `createTextFinder` در **همهٔ** ستون‌ها می‌گردد ولی نسخهٔ اول فقط ۲۴
       ستونِ اول را می‌خواند. شیت‌های تازهٔ منبع ۵۷ ستون دارند و — طبق
       `tests/fixtures/newsheets.json` که از خودِ همان شیت گرفته شده —
       تحلیل و نکته‌ها در ستون‌های ۲۵ به بعدند. یعنی دقیقاً همان چیزی که
       این قابلیت برایش ساخته شد، خوانده نمی‌شد و بی‌صدا امتیازِ صفر
       می‌گرفت. */
    var ab = absorb(sh, mk, pick, tabEnd);
    var missed = ab.missed;
    /* ══ ردیفی که نخوانده مانده، برای پاسِ دوم نگه داشته می‌شود (۷٫۷۳) ══
       فقط شمارهٔ ردیف‌ها نگه داشته می‌شود، نه محتوایشان. */
    var restRows = [];
    for (var rr = 0; rr < order.length; rr++) {
      if (!ab.got[order[rr]]) restRows.push(order[rr]);
    }
    if (restRows.length) out.pend.push({ sh: sh, mk: mk, rows: restRows });
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
    /* یادداشتِ هر تب به پاسِ دوم موکول می‌شود: تا وقتی بودجه هست، «خوانده
       نشد» یک واقعیتِ نهایی نیست و گفتنش گمراه‌کننده است. */
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
  if (opts.plan) plan = opts.plan;
  else try {
    var hub = getHub_();
    var htabs = srchHubTabs_(hub);
    if (!htabs.length) out.notes.push('هیچ تبِ دسته‌ای در بانک شناخته نشد.');
    var skp = htabs.skipped || [];
    if (skp.length) {
      out.notes.push(skp.length + ' تبِ بانک اصلاً وارسی نشد: ' + skp.slice(0, 3).join(' · '));
    }
    for (var ht = 0; ht < htabs.length; ht++) plan.push({ sh: htabs[ht], src: '' });
  } catch (eH) { out.notes.push('بانک خوانده نشد: ' + eH.message); }

  // ── شیت‌های منبع ── (فقط خواندن؛ هرگز نوشتن)
  /* ══ منبع را نبود سقفِ بانک نباید بخورَد (۷٫۲۴) ══
     نسخهٔ اول `!out.stopped` را شرط کرده بود، پس هر واژهٔ نه‌چندان کمیابی
     که بانک را تا سقف پر می‌کرد، **هر پنج شیتِ منبع را کامل رد می‌کرد** —
     و پنجره همان موقع پیشنهاد می‌داد «تیکِ شیت‌های منبع را بردارید»، یعنی
     راهنمایی به خاموش‌کردنِ لایه‌ای که اصلاً گشته نشده بود. حالا منبع در
     همان نقشه می‌نشیند و سهمِ خودش را از زمان و ردیف می‌گیرد. */
  if (!opts.plan && opts.sources !== false) {
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

  /* ══════════════════════════════════════════════════════════════════
     پاسِ دوم — بودجهٔ نخورده به پوشش تبدیل می‌شود (۷٫۷۳)

     صاحبِ برنامه یک جست‌وجوی ساده زد و پرسید «این منطقیه؟ کارِ ناقص
     کرده؟». عددهای خودِ گزارش جواب را می‌دادند: **۲۷۷ ردیف** خوانده شده
     در حالی که سقف ۲٬۵۰۰ است، و **۱۵۲ ثانیه** مصرف شده از بودجهٔ ۲۳۰
     ثانیه — و کنارشان ده‌ها سطرِ «N ردیف خوانده نشد». یعنی کار ناتمام
     ماند در حالی که **نه وقت تمام شده بود و نه سقفِ ردیف**.

     علتش یک‌پاسه بودنِ پیمایش است: زمان بینِ تب‌ها تقسیم می‌شود (۷٫۵۱،
     که لازم بود — وگرنه تبِ اول همه‌اش را می‌خورد)، ولی تبی که سهمِ
     خودش را تمام کند دیگر هیچ‌وقت برنمی‌گردد، حتی اگر در پایانِ پیمایش
     یک‌سومِ بودجه دست‌نخورده مانده باشد. سهمِ **نخورده** به جلو می‌رفت؛
     سهمِ **کم‌آمده** هیچ‌جا جبران نمی‌شد.

     پاسِ دوم فقط همان ردیف‌هایی را می‌خوانَد که جا مانده‌اند، به ترتیبِ
     گردشی روی تب‌ها — نه اینکه یک تب همهٔ باقیمانده را بخورد، که همان
     باگِ ۷٫۵۱ از درِ دیگر است.
     ══════════════════════════════════════════════════════════════════ */
  var guard = 0, dead = [];
  while (out.pend.length && out.read < rowsMax && left() > 12000 && guard < 500) {
    guard++;
    var ent2 = out.pend.shift();
    var rest = out.pend.length + 1;                 // خودش هم هست، پس صفر نمی‌شود
    var room2 = Math.max(1, Math.min(ent2.rows.length,
                  Math.floor(Math.max(0, rowsMax - out.read) / rest) + 1));
    var slice2 = ent2.rows.slice(0, room2);
    var end2 = new Date().getTime() + Math.max(3000, Math.floor(left() / rest));
    var ab2 = absorb(ent2.sh, ent2.mk, slice2, end2);
    out.pass2 += ab2.read;
    var rest2 = [];
    for (var s2 = 0; s2 < ent2.rows.length; s2++) {
      if (!ab2.got[ent2.rows[s2]]) rest2.push(ent2.rows[s2]);
    }
    if (!rest2.length) continue;
    /* ══ نوبتی که هیچ پیشرفتی نداشت، دوباره در صف نمی‌رود ══
       تبی که خواندنش نمی‌شود (سلولِ بزرگ، خطای درایو) وگرنه تا تهِ بودجه
       همان یک تب را می‌چرخانْد و بقیه هرگز نوبت نمی‌گرفتند — همان باگِ
       ۷٫۵۱ از درِ دیگر. کنار می‌رود و در یادداشتِ پایانی شمرده می‌شود. */
    if (ab2.read) out.pend.push({ sh: ent2.sh, mk: ent2.mk, rows: rest2 });
    else dead.push({ sh: ent2.sh, mk: ent2.mk, rows: rest2 });
  }
  out.pend = out.pend.concat(dead);
  out.left = Math.max(0, left());
  /* ══ و حالا یادداشتِ نهایی — یک بار، با علت ══
     تا این نسخه به ازای هر تب یک سطر «N ردیف خوانده نشد» می‌آمد؛ در یک
     جست‌وجوی واقعی این ده‌ها سطر بود که هیچ‌کدام نمی‌گفت **چرا**، و
     خواندنشان کارِ کسی نیست. یک جمله با علت و عدد، به‌جای چهل جملهٔ
     بی‌علت. */
  var leftRows = 0;
  for (var pf = 0; pf < out.pend.length; pf++) leftRows += out.pend[pf].rows.length;
  if (leftRows) {
    var whyBits = [];
    for (var wk in out.whys) {
      if (!Object.prototype.hasOwnProperty.call(out.whys, wk)) continue;
      whyBits.push(wk === 'وقت' ? 'وقتِ آن تب' : wk);
    }
    out.notes.push(leftRows + ' ردیفِ یافته‌شده خوانده نشد' +
                   (whyBits.length ? ' (' + whyBits.slice(0, 3).join(' · ') + ')' : '') +
                   '؛ ' + out.read + ' ردیف خوانده شد' +
                   (out.pass2 ? ' که ' + out.pass2 + ' تای آن در پاسِ دوم بود' : '') +
                   '. بودجهٔ باقی‌مانده: ' + Math.round(out.left / 1000) + ' ثانیه.');
    /* بودجه مانده و ردیف مانده ⇒ این دیگر «تقسیمِ منصفانه» نیست، ایراد
       است و در قابِ سرخ می‌رود. بی این شرط، همان حالتی که ۷٫۷۳ برایش
       نوشته شد دوباره شبیهِ سلامت خوانده می‌شود. */
    if (out.left > 20000 && out.read < rowsMax) {
      out.stopped = out.stopped || 'ردیفِ نخوانده با بودجهٔ باقی‌مانده';
    }
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

  srchSemHydrate_(sr.items, seen, deadline, out, null);
  out.ok = true;
  return out;
}


/**
 * یافته‌های ایندکس ⇒ ردیف‌های نمایش‌پذیرِ بانک (با وارسیِ شناسه). یک تعریف برای جست‌وجوی
 * یک‌جا و گام‌های پنجره (۹.۴۶) — دو تعریف یعنی روزی یکی شناسه را نسنجد و لینکِ غلط بدهد.
 */
function srchSemHydrate_(items, seen, deadline, out, hubIn) {
  var sr = { items: items || [] };
  var byTab = {}, order = [];
  for (var i = 0; i < sr.items.length; i++) {
    var it = sr.items[i];
    var k = it.tab + '§' + it.row;
    if (seen[k]) { seen[k].sem = it.score; continue; }
    if (!byTab[it.tab]) { byTab[it.tab] = []; order.push(it.tab); }
    byTab[it.tab].push(it);
  }

  var hub = hubIn || getHub_();
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
      srchSlim_(item);          // ۹.۴۸: ستونِ «خام» تا ده‌ها هزار نویسه است؛ ۶۰۰ یافتهٔ خام پنجره را سنگین می‌کرد
      out.items.push(item);
      out.added++;
    }
  }
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
  /* ══ عبارتِ کامل هست یا نیست — صریح (۸.۸۱) ══ «کس مگو» سه بار جست‌وجو شد و هر بار «یک حرف مگو» بالا آمد؛
     هیچ‌جا گفته نمی‌شد که خودِ عبارت در هیچ ردیفی هست یا نه. «نبود» جواب است، نه شکست: یعنی متنِ
     استخراج‌شده آن را عیناً ندارد و باید با معنا (هوشمند) گشت. */
  res.phraseRows = col.phraseRows || 0;
  res.nearRows = col.nearRows || 0;
  var nearTop = Object.keys(col.nearForms || {}).sort(function (a, b) { return col.nearForms[b] - col.nearForms[a]; });
  if (col.phraseTabs && !col.phraseRows && col.nearRows) {
    res.notes.unshift('عبارتِ «' + q + '» عیناً در هیچ ردیفی نیست؛ ولی شکلِ نزدیکِ ' +
      nearTop.slice(0, 3).map(function (x) { return '«' + x + '»'; }).join('، ') + ' در ' + col.nearRows +
      ' ردیف هست (' + (col.nearWhere || []).join('، ') + ') و همان‌ها اول آمدند — شاید منظورتان همین بود.');
  } else if (col.phraseTabs) {
    res.notes.unshift(col.phraseRows
      ? 'عبارتِ کاملِ «' + q + '» در ' + col.phraseRows + ' ردیف پیدا شد (' + col.phraseWhere.join('، ') +
        ') و همه پیش از بقیه خوانده شدند.' + (col.nearRows ? ' شکلِ نزدیک هم در ' + col.nearRows + ' ردیف.' : '')
      : 'عبارتِ کاملِ «' + q + '» در هیچ‌کدام از ' + col.phraseTabs + ' تبِ گشته‌شده عیناً نیست — یعنی متنِ ' +
        'استخراج‌شدهٔ هیچ فایلی این عبارت را کلمه‌به‌کلمه ندارد. نتیجه‌ها فقط واژه‌ها را دارند؛ «جست‌وجوی هوشمند» ' +
        'با معنا می‌گردد.' + (col.phraseTabs < (col.sheetsAll || 0) ? ' (' + (col.sheetsAll - col.phraseTabs) +
        ' تب به‌خاطرِ وقت گشته نشد.)' : ''));
  }

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
      /* ۹.۴۹: آنچه مدل نامربوط دانست **نشان داده نمی‌شود** — به خواستِ صریحِ صاحبِ برنامه («هوشمند یعنی مفهوم را
         کامل درک کند … نه اینکه ببیند یک یا چند کلمهٔ مشترک دارد»). ۷٫۲۴ آن‌ها را با نشانِ «مدل کنارش گذاشت» نگه
         می‌داشت؛ در پرسشِ ۵۳واژه‌ایِ ۱۷ اکتبر همان‌ها «تلاوتِ قرآن» و «معامله‌گری» را زیرِ «بهترین سریال» آوردند. فقط
         شمارشان گفته می‌شود — پنهان نیست، نشان هم داده نمی‌شود. */
      var dropped = picked.length - ordered.length;
      if (dropped > 0) {
        res.notes.push(dropped + ' نامزد که فقط واژهٔ مشترک داشتند و مدل آن‌ها را به خواستهٔ شما مربوط ندانست، نشان داده نشدند.');
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
/* کجای جست‌وجو بودیم (۸.۷۷). «Out of memory error» به‌تنهایی نمی‌گوید کدام تب یا کدام مرحله؛
   خطا جایی پرتاب می‌شود که حافظه تمام شد، نه جایی که پُرش کرد — ولی نامِ آخرین تب همان شاهدی
   است که دفعهٔ بعد علت را از حدس به عدد می‌بَرد. */
var SRCH_AT_ = '';

/** درِ پنجرهٔ جست‌وجو: ساده یا هوشمند، با یا بی شیت‌های منبع؛ هر خطا به‌صورتِ جواب برمی‌گردد (با نامِ تب)، نه استثنا. */
function srchRun(query, mode, sources, semantic) {
  SRCH_AT_ = '';
  try {
    /* `semantic === false` (۹.۴۶): پنجره معنا را جدا و گام‌به‌گام می‌گردد (`srchSemStart`/`srchSemStep`). */
    return srchRun_(query, { mode: mode, sources: sources !== false, semantic: semantic === false ? false : undefined });
  } catch (e) {
    return { ok: false, query: String(query || ''), items: [],
             notes: ['خطا: ' + e.message + (SRCH_AT_ ? ' (در ' + SRCH_AT_ + ')' : '')],
             terms: [], answer: '', scanned: 0, sheets: 0, stopped: '', ms: 0, mode: mode };
  }
}


/* ══════════════ جست‌وجوی ساده، گام‌به‌گام (۹.۵۵) ══════════════
   «جست‌وجوی ساده‌ش هم باید همون‌طور مثلِ هوشمند حالتِ پرشونده و درصدش رو بشه دید و هم‌زمان هرچی پیدا می‌کنه رو لیست
   کنه و سقفِ زمانیش بالا بره و هرجا قطع شد از ادامه‌ش کار از سر بگیره.» تا ۹.۵۳ ساده یک فراخوانِ ۲۳۰ ثانیه‌ای بود: چهل‌وچند
   تب در آن تقسیم می‌شد، هر تب ~۵۵ ردیف می‌خواند و بقیه «خوانده نشد». حالا پنجره نقشهٔ تب‌ها را یک بار می‌گیرد
   (`srchLexStart`) و تب به تب می‌خواهد (`srchLexStep`) — هر گام اجرای جدای خودش با بودجهٔ خودش؛ ردیف‌هایی که در یک گام
   نرسید، در گامِ بعدیِ **همان تب** خوانده می‌شوند. سقفِ کلی ندارد؛ فقط خوانده می‌شود، چیزی نوشته نمی‌شود. */

/** نقشهٔ تب‌ها و واژه‌ها برای جست‌وجوی سادهٔ گام‌به‌گام. */
function srchLexStart(query, sources) {
  var out = { ok: false, terms: [], plan: [], notes: [], note: '' };
  try {
    var q = String(query || '').trim();
    if (!q) { out.note = 'چیزی ننوشتید'; return out; }
    if (CFG.SEARCH_ON === false) { out.note = 'جست‌وجو خاموش است'; return out; }
    var terms = srchTerms_(q);
    if (!terms.length) { out.note = 'واژهٔ معناداری در متنِ شما نبود'; return out; }
    var tmax = Math.max(3, Number(CFG.SEARCH_TERMS_MAX) || 12);
    if (terms.length > tmax) { out.notes.push('از ' + terms.length + ' واژه، ' + tmax + ' واژهٔ نخست گشته می‌شود.'); terms = terms.slice(0, tmax); }
    out.terms = terms;
    var hub = srchHubLite_(), hid = hub.getId(), ht = srchHubTabs_(hub);
    for (var i = 0; i < ht.length; i++) out.plan.push({ id: hid, name: ht[i].getName(), src: '' });
    if ((ht.skipped || []).length) out.notes.push(ht.skipped.length + ' تبِ بانک وارسی نشد: ' + ht.skipped.slice(0, 3).join(' · '));
    if (sources !== false) {
      var list = CFG.SOURCES || [];
      for (var s = 0; s < list.length; s++) {
        try {
          var shs = SpreadsheetApp.openById(list[s].id).getSheets();
          for (var u = 0; u < shs.length; u++) out.plan.push({ id: list[s].id, name: shs[u].getName(), src: list[s].title });
        } catch (eS) { out.notes.push('شیتِ «' + list[s].title + '» باز نشد: ' + String(eS.message || eS).slice(0, 80)); }
      }
    }
    out.ok = out.plan.length > 0;
    if (!out.ok) out.note = 'هیچ تبی برای گشتن نبود';
  } catch (e) { out.note = 'خطا: ' + String((e && e.message) || e).slice(0, 120); }
  return out;
}

/**
 * یک گام: یک تب (`plan[from]`) با بودجهٔ `SEARCH_STEP_MS` و سقفِ ردیفِ `SEARCH_STEP_ROWS`. `rows` = ردیف‌هایی از همین تب
 * که گامِ قبل یافت و نخواند ⇒ دوباره گشته نمی‌شود، فقط خوانده. ⇒ {items, rest, next, read, phrase, near, notes}.
 */
function srchLexStep(query, terms, plan, from, rows) {
  SRCH_AT_ = '';
  var out = { ok: false, items: [], rest: [], next: Number(from) || 0, all: (plan || []).length, read: 0,
              phrase: 0, near: 0, notes: [], note: '' };
  try {
    var ent = (plan || [])[out.next];
    if (!ent) { out.ok = true; return out; }
    var ss = (ent.src ? SpreadsheetApp.openById(ent.id) : srchHubLite_()), sh = ss.getSheetByName(ent.name);
    if (!sh) { out.ok = true; out.next++; out.notes.push('تبِ «' + ent.name + '» دیگر نیست.'); return out; }
    var col = srchCollect_(terms || [], String(query || ''), {
      plan: [{ sh: sh, src: ent.src || '' }], budgetMs: Math.max(15000, Number(CFG.SEARCH_STEP_MS) || 40000),
      rowsMax: Math.max(50, Number(CFG.SEARCH_STEP_ROWS) || 600), rows: rows || null, since: new Date().getTime(),
      capAll: 100000 });   // همهٔ یافته‌ها، نه ۲۴۰ِ برتر — پنجره خودش مرتب می‌کند
    out.items = col.items; out.read = col.read; out.phrase = col.phraseRows || 0; out.near = col.nearRows || 0;
    for (var p = 0; p < col.pend.length; p++) out.rest = out.rest.concat(col.pend[p].rows);
    var fresh = !(rows && rows.length);
    if (out.rest.length && (col.read > 0 || fresh)) {
      /* همان تب، گامِ بعد — فقط اگر این گام چیزی خواند؛ تبی که خواندنش جلو نمی‌رود، با یادداشت رد می‌شود. */
    } else {
      if (out.rest.length) out.notes.push(out.rest.length + ' ردیفِ یافته در تبِ «' + ent.name + '» خوانده نشد (خواندن جلو نرفت).');
      out.rest = []; out.next++;
    }
    for (var n = 0; n < col.notes.length; n++) if (!/ردیفِ یافته‌شده خوانده نشد|نمونه‌ای پخش‌شده/.test(col.notes[n])) out.notes.push(col.notes[n]);
    out.ok = true;
  } catch (e) {
    out.note = 'خطا: ' + String((e && e.message) || e).slice(0, 120) + (SRCH_AT_ ? ' (در ' + SRCH_AT_ + ')' : '');
  }
  return out;
}


/* ══════════════ جست‌وجوی معنایی، گام‌به‌گام (۹.۴۶) ══════════════
   «۹۰ ثانیه کمه … نتیجه‌ها یکی یکی وقتی پیدا میشن نمایش داده بشن … یه نوار پر شونده دقیق.»
   تا ۹.۴۵ معنا یک فراخوانِ ۹۰ ثانیه‌ای بود و در آن ۱۲ تا ۱۴ قطعه از ۴۸ خوانده می‌شد — یعنی
   سه‌چهارمِ محتوا هرگز دیده نمی‌شد و پنجره فقط یک خطِ «… تا خوانده شد» می‌گفت. حالا پنجره
   گام‌به‌گام می‌خواهد: هر گام چند قطعه، یافته‌هایش همان لحظه نشان داده می‌شوند، و گامِ بعد
   از همان‌جا ادامه می‌دهد **تا آخرین قطعه** — سقفِ کلی ندارد، چون هر گام اجرای جدای خودش است.
   چیزی در شیت‌ها نوشته نمی‌شود؛ فقط خوانده می‌شود. */


/** هاب برای خواندن، بی پاسِ تعمیرِ تب‌ها — هر گام یک بار باز می‌کند و ۲۹ مگابایت تعمیر لازم ندارد. */
function srchHubLite_() {
  var id = '';
  try { id = String(props_().getProperty(PK.HUB_ID) || ''); } catch (e) { id = ''; }
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e2) {} }
  return getHub_();
}

/** گامِ صفر: بردارِ پرس‌وجو و ترتیبِ قطعه‌ها — هر دو در پنجره می‌مانند، تا گام‌ها هم‌خوان باشند. */
function srchSemStart(query) {
  var out = { ok: false, vp: '', order: [], all: 0, note: '' };
  try {
    var q = String(query || '').trim();
    if (!q) { out.note = 'چیزی ننوشتید'; return out; }
    if (CFG.EMB_ON === false) { out.note = 'اثر انگشتِ معنایی خاموش است'; return out; }
    var ix = embIndex_();
    out.all = ix.shards.length;
    if (!ix.shards.length) { out.note = 'هنوز اثر انگشتی ساخته نشده'; return out; }
    var stale = embIndexStale_(ix);
    if (stale) { out.note = 'ایندکس کهنه است (' + stale + ')'; return out; }
    var qv = embQueryVec_(q);
    if (!qv.ok) { out.note = qv.note || 'بردارِ پرس‌وجو ساخته نشد'; return out; }
    out.vp = embPack_(embNorm_(qv.vec));
    var pd = Number(ix.probeDim) || embProbeDim_();
    out.order = embOrder_(ix, [embUnpack_(embPack_(embTrunc_(qv.vec, pd)))]);
    out.ok = true;
  } catch (e) { out.note = 'خطا: ' + String((e && e.message) || e).slice(0, 120); }
  return out;
}

/** یک گام: از `from` چند قطعه در `EMB_STEP_MS`، با یافته‌های نمایش‌پذیر؛ `floor` = بهترینِ تا این‌جا منهای فاصله. */
function srchSemStep(vp, order, from, floor) {
  var out = { ok: false, items: [], next: Number(from) || 0, all: (order || []).length, done: false,
              best: 0, added: 0, dropped: 0, stopped: '', note: '' };
  try {
    var b = embUnpack_(vp);
    if (!b || !b.length) { out.note = 'بردارِ پرس‌وجو نیامد'; return out; }
    var vec = [];
    for (var i = 0; i < b.length; i++) vec.push(b[i] / 127);
    var t0 = new Date().getTime();
    var step = Math.max(5000, Number(CFG.EMB_STEP_MS) || 20000);
    var r = embCore_([vec], { order: order, from: from, budgetMs: step, floor: floor,
                               maxShards: Math.max(1, Number(CFG.EMB_STEP_SHARDS) || 4) });
    var o = r.outs[0] || {};
    out.next = r.next; out.done = r.done; out.all = r.all || out.all;
    if (!o.ok) { out.note = o.note || 'این گام نتیجه نداد'; out.ok = r.next > (Number(from) || 0); return out; }
    for (var k = 0; k < (o.items || []).length; k++) out.best = Math.max(out.best, o.items[k].score || 0);
    if (o.items && o.items.length) {
      srchSemHydrate_(o.items, {}, t0 + step + 25000, out, srchHubLite_());
    }
    out.ok = true;
  } catch (e) { out.note = 'خطا: ' + String((e && e.message) || e).slice(0, 120); }
  return out;
}


/* ══════════════ جمع‌بندی و خروجی (۹.۴۸) ══════════════
   «بعد از اینکه نتیجه کامل شد … تا ۲۰ ردیف … از داخلِ هر محتوای هر لیست اون اسامی رو دقیق جدا کنه … و جلوی هر
   کدوم اشاره کنه مربوط به کدوم ردیف … همون حینِ جست‌وجو باید همه اینها رو ببینه.» و «خروجی … لینک‌ها در سلول‌های
   جدا … توضیحات در ستون‌های دیگه».
   استخراج **گام‌به‌گام** است: هر دسته یافتهٔ تازه همان لحظه خوانده می‌شود (`srchDigestStep`)، و جمع‌بندیِ پایانی
   فقط فهرستِ استخراج‌شده را مرتب می‌کند (`srchDigestFinal`) — هیچ یافته‌ای دو بار خوانده نمی‌شود و هیچ‌کدام
   جا نمی‌ماند. شمارهٔ هر یافته شمارهٔ ثابتِ خودِ پنجره است (`n`)، نه جایش در فهرست. شمارهٔ ساختگیِ مدل دور ریخته
   می‌شود. */

var SRCH_DIGEST_SCHEMA = {
  type: 'object',
  properties: {
    found: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, note: { type: 'string' },
      refs: { type: 'array', items: { type: 'string' } } }, required: ['name', 'refs'] } },
    keep: { type: 'array', items: { type: 'string' } }
  },
  required: ['found', 'keep']
};

var SRCH_FINAL_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    rows: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, why: { type: 'string' } }, required: ['name'] } }
  },
  required: ['rows']
};

/** شمارهٔ فارسی/لاتین ⇒ رشتهٔ رقمِ لاتین. */
function srchNum_(x) {
  var t = String(x == null ? '' : x).replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
                                      .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
  var m = t.match(/\d+/);
  return m ? String(Number(m[0])) : '';
}

/** یک دسته یافته ⇒ «چیزهای مشخص» درونِ متنشان که پرسش دنبالشان است، هر کدام با شمارهٔ یافته‌هایش. */
function srchDigestStep(query, items) {
  var out = { ok: false, found: [], note: '' };
  try {
    var q = String(query || '').trim();
    items = (items || []).slice(0, Math.max(5, Number(CFG.SEARCH_DIGEST_BATCH) || 40));
    if (!q || !items.length) { out.ok = true; return out; }
    var have = {}, lines = [];
    for (var i = 0; i < items.length; i++) {
      var n = srchNum_(items[i].n);
      if (!n) continue;
      have[n] = 1;
      lines.push('[' + n + '] ' + srchClip_(String(items[i].t || ''), Number(CFG.SEARCH_DIGEST_CHARS) || 1400));
    }
    if (!lines.length) { out.ok = true; return out; }
    var prompt =
      'کاربر در بانکِ محتوای خودش این را جست‌وجو کرده:\n\n«' + q.slice(0, 1200) + '»\n\n' +
      'این‌ها چند یافته‌اند، هر کدام با شماره‌اش در کروشه:\n\n' + lines.join('\n\n') + '\n\n' +
      'از **درونِ متنِ** هر یافته، چیزهای مشخصی را که کاربر واقعاً دنبالشان است **دقیق** بیرون بکش — مثلاً اگر ' +
      'فیلم خواسته، نامِ تک‌تکِ فیلم‌هایی که در متن آمده؛ اگر کتاب، نامِ کتاب‌ها؛ اگر روش یا توصیه، خودِ آن روش‌ها. ' +
      'تیترِ کلیِ فهرست («۱۰ فیلمِ برتر») خودش یک قلم نیست؛ اقلامِ درونش هستند. ' +
      'هر قلم یک بار، با نامِ کامل و دقیق همان‌طور که در متن آمده (اگر نامِ اصلی/انگلیسی هم هست، کنارش)، و در «refs» ' +
      'شمارهٔ **همهٔ** یافته‌هایی که آن قلم در متنشان آمده. در «note» یک جملهٔ کوتاه از خودِ متن دربارهٔ آن. ' +
      'چیزی که در متن نیست نساز. اگر هیچ یافته‌ای قلمِ مشخصی ندارد، found را خالی بده.\n\n' +
      '**و داوری:** در «keep» فقط شمارهٔ یافته‌هایی را بنویس که **خودشان** همان چیزی‌اند که کاربر خواسته — با همهٔ ' +
      'قیدهایش (مثلاً اگر «بهترین سریال‌هایی که همه دوستشان دارند» خواسته، یافته‌ای که سریال معرفی/توصیه/نقد می‌کند؛ ' +
      'نه یافته‌ای که فقط واژهٔ «بهترین» یا «دوست داشتن» دارد، نه فیلم وقتی سریال خواسته، نه موضوعی کناری). ' +
      'در شک، نگه ندار. داشتنِ واژهٔ مشترک دلیلِ نگه‌داشتن نیست؛ معنا هست.';
    var r = geminiText_(prompt, SRCH_DIGEST_SCHEMA, 8192);
    var j = (typeof r === 'string') ? JSON.parse(r) : r;
    var f = (j && j.found) || [];
    for (var k = 0; k < f.length; k++) {
      var name = String(f[k].name || '').trim();
      if (!name) continue;
      var refs = [];
      for (var z = 0; z < (f[k].refs || []).length; z++) {
        var rn = srchNum_(f[k].refs[z]);
        if (rn && have[rn] && refs.indexOf(rn) === -1) refs.push(rn);   // شمارهٔ ساختگی ⇒ کنار
      }
      if (!refs.length) continue;
      out.found.push({ name: name.slice(0, 160), note: String(f[k].note || '').slice(0, 300), refs: refs });
    }
    /* داوریِ نیامده ⇒ هیچ‌چیز پنهان نمی‌شود (`keep: null`). نبودِ داور، ردِ همه نیست. */
    out.keep = null;
    var kp = (j && Object.prototype.toString.call(j.keep) === '[object Array]') ? j.keep : null;
    if (kp) out.keep = [];
    if (kp) for (var kq = 0; kq < kp.length; kq++) {
      var kn = srchNum_(kp[kq]);
      if (kn && have[kn] && out.keep.indexOf(kn) === -1) out.keep.push(kn);
    }
    out.judged = Object.keys(have);
    out.ok = true;
  } catch (e) { out.note = 'استخراج نشد: ' + String((e && e.message) || e).slice(0, 120); }
  return out;
}

/** فهرستِ همهٔ اقلامِ استخراج‌شده ⇒ تا ۲۰ ردیف به ترتیبِ اولویت. شماره‌ها از همان فهرست می‌آیند، نه از مدل. */
function srchDigestFinal(query, ents) {
  var out = { ok: false, rows: [], answer: '', note: '' };
  var list = (ents || []).filter(function (e) { return e && e.name && e.refs && e.refs.length; });
  var max = Math.max(5, Number(CFG.SEARCH_DIGEST_TOP) || 20);
  var byKey = {};
  for (var i = 0; i < list.length; i++) byKey[srchTight_(list[i].name)] = list[i];
  var fallback = function () {
    return list.slice(0).sort(function (a, b) { return b.refs.length - a.refs.length; }).slice(0, max)
      .map(function (e) { return { name: e.name, why: e.note || '', refs: e.refs }; });
  };
  if (!list.length) { out.ok = true; return out; }
  try {
    var lines = list.slice(0, 600).map(function (e, k) {
      return (k + 1) + '. ' + e.name + ' — در ' + e.refs.length + ' یافته' + (e.note ? ' — ' + srchClip_(e.note, 160) : '');
    });
    var prompt =
      'کاربر جست‌وجو کرده: «' + String(query || '').slice(0, 1200) + '»\n\n' +
      'این اقلام از درونِ همهٔ یافته‌ها بیرون کشیده شده‌اند (هر کدام با شمارِ یافته‌هایی که در آن‌ها آمده):\n\n' +
      lines.join('\n') + '\n\n' +
      'حداکثر ' + max + ' قلم را به ترتیبِ اولویت برگردان. **اولویت یعنی تطابق با قیدهای خودِ خواستهٔ کاربر** (هر قیدی که ' +
      'گفته — مثلاً «همه‌ی سلیقه‌ها دوستش دارند»، «خسته‌کننده نیست»، «همیشه یادم بماند») — با تکیه بر آنچه در «note»ها ' +
      'از خودِ متنِ یافته‌ها آمده. شمارِ یافته‌ها فقط نشانهٔ کمکی است، نه معیار: یک اسکرین‌شاتِ تکراری چیزی را بهتر نمی‌کند. ' +
      'قلمی که به قیدها نمی‌خورد (مثلاً فیلم وقتی سریال خواسته) نیاور. «name» را **عیناً** همان‌طور که در فهرست است بنویس. ' +
      'در «why» یک جملهٔ کوتاه که **کدام قیدِ کاربر** را برآورده می‌کند. ' +
      'در «answer» یک یا دو جمله جمع‌بندی بنویس.';
    var r = geminiText_(prompt, SRCH_FINAL_SCHEMA, 8192);
    var j = (typeof r === 'string') ? JSON.parse(r) : r;
    var rows = (j && j.rows) || [], used = {};
    for (var k = 0; k < rows.length && out.rows.length < max; k++) {
      var key = srchTight_(String(rows[k].name || ''));
      var e = byKey[key];
      if (!e || used[key]) continue;          // نامی که در فهرست نبود، ساختهٔ مدل است
      used[key] = 1;
      out.rows.push({ name: e.name, why: String(rows[k].why || e.note || '').slice(0, 300), refs: e.refs });
    }
    out.answer = String((j && j.answer) || '').slice(0, 600);
    if (!out.rows.length) { out.rows = fallback(); out.note = 'مدل ترتیبِ قابلِ‌اعتمادی نداد؛ بر پایهٔ تکرار مرتب شد.'; }
    out.ok = true;
  } catch (e2) {
    out.rows = fallback(); out.ok = true;
    out.note = 'ترتیبِ مدل نیامد (' + String((e2 && e2.message) || e2).slice(0, 80) + ')؛ بر پایهٔ تکرار مرتب شد.';
  }
  return out;
}

/** سلولی که با = + - @ شروع شود در شیت فرمول خوانده می‌شود؛ متنِ محتوا هرگز نباید فرمول شود. */
function srchCell_(v) {
  var t = String(v == null ? '' : v);
  if (t.length > 45000) t = t.slice(0, 45000);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
function srchLinkCell_(url, label) {
  var u = String(url || '');
  if (!/^https?:\/\//i.test(u)) return '';
  return '=HYPERLINK("' + u.replace(/"/g, '%22') + '","' + String(label || 'باز کن').replace(/"/g, "'") + '")';
}

/**
 * خروجی: یک شیت (دو تب: «یافته‌ها»، «جمع‌بندی») و یک صفحهٔ HTML در OUTPUT ⇒ «خروجی‌های جست‌وجو».
 * فقط در OUTPUT نوشته می‌شود؛ شیت‌های منبع فقط خوانده شده‌اند. پیوندِ xlsx همان شیت است با `export?format=xlsx`.
 */
function srchExport(query, items, digest) {
  var out = { ok: false, sheetUrl: '', xlsxUrl: '', htmlUrl: '', n: 0, note: '' };
  try {
    var q = String(query || '').trim();
    items = items || [];
    var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var fname = String(CFG.SEARCH_EXPORT_FOLDER || 'خروجی‌های جست‌وجو');
    var it0 = root.getFoldersByName(fname);
    var folder = it0.hasNext() ? it0.next() : root.createFolder(fname);
    var stamp = Utilities.formatDate(new Date(), CFG.TIMEZONE || 'Asia/Dubai', 'yyyy-MM-dd HH-mm');
    var title = 'جست‌وجو — ' + q.slice(0, 50) + ' — ' + stamp;
    var ss = SpreadsheetApp.create(title);
    var file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder);
    var H1 = ['شماره', 'تیتر', 'از کجا', 'تب/دسته', 'نوع', 'تاریخ', 'امتیازِ معنا', 'امتیازِ واژه', 'نزدیکی', 'چرا',
              'خلاصه', 'پیام', 'متن', 'پیوندِ فایل', 'پیوندِ ردیف در شیت'];
    var rows = [H1];
    for (var i = 0; i < items.length; i++) {
      var t = items[i] || {}, f = t.fields || {};
      rows.push([srchCell_(t.n), srchCell_(t.title), srchCell_(t.where), srchCell_(t.tab), srchCell_(t.kind),
                 srchCell_(t.date), t.sem ? Number(t.sem).toFixed(2) : '', t.score ? String(t.score) : '',
                 srchCell_(t.fit), srchCell_(t.why), srchCell_(f.summary), srchCell_(f.msg),
                 srchCell_(f.body || t.show), srchLinkCell_(t.link, 'بازکردنِ فایل'),
                 srchLinkCell_(t.sheetLink, 'همان ردیف')]);
    }
    var sh = ss.getSheets()[0];
    sh.setName('یافته‌ها');
    sh.getRange(1, 1, rows.length, H1.length).setValues(rows);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    var dg = (digest && digest.rows) || [];
    var sh2 = ss.insertSheet('جمع‌بندی');
    var H2 = ['ردیف', 'نام', 'چرا / توضیح', 'شمارهٔ یافته‌ها (در تبِ «یافته‌ها»)'];
    var rows2 = [H2];
    for (var d = 0; d < dg.length; d++) {
      rows2.push([String(d + 1), srchCell_(dg[d].name), srchCell_(dg[d].why), srchCell_((dg[d].refs || []).join('، '))]);
    }
    if (digest && digest.answer) rows2.push(['', 'جمع‌بندی', srchCell_(digest.answer), '']);
    sh2.getRange(1, 1, rows2.length, H2.length).setValues(rows2);
    sh2.setFrozenRows(1);
    sh2.setRightToLeft(true);
    out.sheetUrl = ss.getUrl();
    out.xlsxUrl = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
    var html = srchExportHtml_(q, items, digest || {});
    var hf = folder.createFile(Utilities.newBlob(html, 'text/html', title + '.html'));
    out.htmlUrl = 'https://drive.google.com/uc?export=download&id=' + hf.getId();
    out.n = items.length;
    out.ok = true;
  } catch (e) { out.note = 'خروجی ساخته نشد: ' + String((e && e.message) || e).slice(0, 160); }
  return out;
}

function srchExportHtml_(q, items, digest) {
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var link = function (u, l) { u = String(u || ''); return /^https?:\/\//i.test(u) ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(l) + '</a>' : ''; };
  var H = ['<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
           '<title>' + esc('جست‌وجو — ' + q) + '</title><style>body{font-family:Tahoma,Vazirmatn,sans-serif;margin:16px;color:#1f2430;background:#fff}' +
           'table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #d8dde6;padding:6px;vertical-align:top}' +
           'th{background:#eef2f8}h2{margin-top:28px}.d{background:#eef4ff;padding:10px;border-radius:8px}</style></head><body>',
           '<h1>' + esc(q) + '</h1>'];
  var dg = digest.rows || [];
  if (dg.length) {
    H.push('<h2>جمع‌بندی</h2>' + (digest.answer ? '<p class="d">' + esc(digest.answer) + '</p>' : ''));
    H.push('<table><tr><th>ردیف</th><th>نام</th><th>چرا</th><th>یافته‌ها</th></tr>');
    for (var d = 0; d < dg.length; d++) {
      H.push('<tr><td>' + (d + 1) + '</td><td>' + esc(dg[d].name) + '</td><td>' + esc(dg[d].why) + '</td><td>' +
             (dg[d].refs || []).map(function (r) { return '<a href="#r' + esc(r) + '">#' + esc(r) + '</a>'; }).join(' ') + '</td></tr>');
    }
    H.push('</table>');
  }
  H.push('<h2>همهٔ یافته‌ها (' + items.length + ')</h2><table><tr><th>#</th><th>تیتر</th><th>تب/نوع/تاریخ</th><th>خلاصه</th><th>پیوندها</th></tr>');
  for (var i = 0; i < items.length; i++) {
    var t = items[i] || {}, f = t.fields || {};
    H.push('<tr id="r' + esc(t.n) + '"><td>' + esc(t.n) + '</td><td>' + esc(t.title) + (t.why ? '<br><small>' + esc(t.why) + '</small>' : '') +
           '</td><td>' + esc([t.tab, t.kind, t.date].filter(Boolean).join(' · ')) + '</td><td>' +
           esc(f.summary || t.show || '') + '</td><td>' + [link(t.link, 'فایل'), link(t.sheetLink, 'ردیف')].filter(Boolean).join(' · ') + '</td></tr>');
  }
  H.push('</table></body></html>');
  return H.join('');
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
  H.push('.bar{height:10px;background:#e8ebf1;border-radius:6px;overflow:hidden;margin:4px 0 12px}' +
         '.bi{height:100%;background:#1f3864;transition:width .4s}.bt{font-size:13px;margin-top:14px}');
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
  /* سه جعبهٔ ثابت (۹.۴۶): واژه‌ها، نوارِ معنا، یافته‌های معنا — ثابت، تا هر رشته جعبهٔ خودش را
     بنویسد و جوابِ یکی جعبهٔ دیگری را پاک نکند. */
  /* ۹.۴۸: جعبهٔ «جمع‌بندی» (`dig`) و «خروجی» (`exp`) هم ثابت‌اند — بالای یافته‌ها، جایی که پس از پایان دیده شوند. */
  H.push('<div id="out" class="res"><div id="semh"></div><div id="dig"></div><div id="exp"></div>' +
         '<div id="lex"></div><div id="sem"></div></div>');
  H.push('<script>');
  H.push('function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){' +
         'return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}');
  /* ══ دو رشته، هم‌زمان (۹.۴۶) ══
     «هوشمند» دو کار است: واژه‌ها و هم‌معناها (`srchRun`، یک فراخوان، با رتبه‌بندیِ مدل) و معنا
     (`srchSemStart` + گام‌های `srchSemStep` تا آخرین قطعه). دومی دیگر داخلِ اولی نیست، چون
     باید یافته‌هایش همان لحظه دیده شوند و سقفِ ۹۰ ثانیه‌ای نداشته باشد. `RUN` جست‌وجوی تازه را
     از جوابِ دیرِ جست‌وجوی قبلی جدا می‌کند. */
  H.push('var RUN=0,LEX={},SEM=[],SEEN={},NUM=0,NO={},ALL=[],DQ=[],DBUSY=false,ENT={},EORD=[],DONE={},DIG=null,DFAIL=0,Q="",MODE="",OFF={},NOFF=0;');
  /* ══ شمارهٔ ثابت (۹.۴۸) ══ هر یافته یک بار، به ترتیبِ رسیدن، شماره می‌گیرد — جمع‌بندی و خروجی به همین شماره
     اشاره می‌کنند، نه به جای یافته در فهرست (که با هر گام عوض می‌شود). */
  H.push('function rkey(t){return t.where==="بانک"?t.tab+"§"+t.row:t.where+"§"+t.tab+"§"+t.row+"§"+t.title;}');
  H.push('function reg(t){var k=rkey(t);if(NO[k]){t.n=NO[k];return t.n;}NUM++;NO[k]=NUM;t.n=NUM;ALL.push(t);' +
         'if(MODE==="هوشمند"){DQ.push(t);}return t.n;}');
  H.push('function go(m){var q=document.getElementById("q").value;' +
         'if(!q.trim()){return;}RUN++;var my=RUN;LEX={};SEM=[];SEEN={};NUM=0;NO={};ALL=[];DQ=[];DBUSY=false;ENT={};' +
         'EORD=[];DIG=null;DFAIL=0;OFF={};NOFF=0;Q=q;MODE=m;DONE={lex:false,sem:m!=="هوشمند"};' +
         'document.getElementById("lex").innerHTML="<p>در حالِ گشتنِ واژه‌ها… ' +
         'برای جست‌وجوی کامل تا چند دقیقه طول می‌کشد.</p>";' +
         'document.getElementById("semh").innerHTML="";document.getElementById("sem").innerHTML="";' +
         'document.getElementById("dig").innerHTML="";document.getElementById("exp").innerHTML="";' +
         'if(m==="ساده"){lsGo(q,document.getElementById("src").checked,my);}else{lexGo(q,m,document.getElementById("src").checked,my,false);}' +
         'if(m==="هوشمند"){semGo(q,my);}}');
  /* ══ «Out of memory» در واژه‌ها (۹.۴۸) ══ اجرای Apps Script که حافظه‌اش تمام شود کشته می‌شود و خطا فقط به
     پنجره می‌رسد. با تیکِ شیت‌های منبع (۱۱۲ مگابایت)، یک بارِ دیگر بی آن‌ها گشته می‌شود — و **گفته می‌شود**. */
  H.push('function lexGo(q,m,src,my,retried){' +
         'google.script.run.withSuccessHandler(function(r){if(my!==RUN){return;}' +
         'if(retried){r.notes=(r.notes||[]);r.notes.unshift("گشتنِ واژه‌ها با شیت‌های منبع از حافظهٔ Apps Script بیرون زد؛ ' +
         'بی شیت‌های منبع دوباره گشتم — یافته‌های معنایی همهٔ بانک را جدا می‌گردند.");}' +
         'show(r);semDraw();DONE.lex=true;digPump();expDraw();maybeFinal();})' +
         '.withFailureHandler(function(e){if(my!==RUN){return;}var msg=String(e&&e.message||e);' +
         'if(!retried&&src&&/memory/i.test(msg)){document.getElementById("lex").innerHTML="<p>حافظه کم آمد؛ ' +
         'دوباره بی شیت‌های منبع…</p>";lexGo(q,m,false,my,true);return;}' +
         'document.getElementById("lex").innerHTML="<div class=warn>خطا در گشتنِ واژه‌ها: "+esc(msg)+"</div>";' +
         'DONE.lex=true;maybeFinal();})' +
         '.srchRun(q,m,src,m==="هوشمند"?false:true);}');
  /* ══ ساده، تب به تب (۹.۵۵) ══ نقشه یک بار (`srchLexStart`)، بعد هر تب یک گام (`srchLexStep`)؛ یافته‌ها همان لحظه به
     فهرست می‌آیند، نوار «تب از تب» را می‌گوید، و پیشرفت در مرورگر می‌ماند (`localStorage`، کلیدِ `srchLex`): همان پرسش
     با همان تیک دوباره زده شود ⇒ از همان تب ادامه. گامی که خطا داد یک بار دوباره؛ باز خطا ⇒ همان تب با یادداشت رد. */
  H.push('var LS=null;function lsSave(){try{if(!LS){return;}var it=LS.items.slice(0).sort(function(a,b){return (b.score||0)-(a.score||0);}).slice(0,300).map(slim);' +
         'localStorage.setItem("srchLex",JSON.stringify({q:LS.q,src:LS.src,from:LS.from,rest:LS.rest,plan:LS.plan,terms:LS.terms,' +
         'read:LS.read,phrase:LS.phrase,notes:LS.notes.slice(0,30),items:it}));}catch(e){}}');
  H.push('function lsLoad(q,src){try{var d=JSON.parse(localStorage.getItem("srchLex")||"null");' +
         'if(d&&d.q===q&&d.src===src&&d.plan&&d.from<d.plan.length){return d;}}catch(e){}return null;}');
  H.push('function lsClear(){try{localStorage.removeItem("srchLex");}catch(e){}}');
  H.push('function lsBar(msg){var all=LS.plan.length,p=all?Math.round(LS.from*100/all):0;var cur=LS.plan[LS.from];' +
         'document.getElementById("semh").innerHTML="<div class=bt>جست‌وجوی ساده: "+LS.from+" از "+all+" تب گشته شد ("+p+"٪) · "+' +
         'LS.items.length+" یافته · "+LS.read+" ردیف خوانده شد"+(cur&&LS.from<all?" · اکنون: «"+esc(cur.name)+"»"+(LS.rest.length?" ("+LS.rest.length+" ردیفِ باقی)":""):"")+' +
         '(msg?" · "+esc(msg):"")+"</div><div class=bar><div class=bi style=width:"+p+"%></div></div>";}');
  H.push('function lsDraw(){var o=LS.items.slice(0).sort(function(a,b){return (b.score||0)-(a.score||0);});var H=[];' +
         'if(LS.phrase){H.push("<div class=m>عبارتِ کامل در "+LS.phrase+" ردیف پیدا شد و همان‌ها اول خوانده شدند.</div>");}' +
         'for(var i=0;i<LS.notes.length;i++){H.push("<div class=warn>"+esc(LS.notes[i])+"</div>");}' +
         'if(!o.length){H.push(LS.from<LS.plan.length?"<p>هنوز چیزی پیدا نشده…</p>":"<p>چیزی پیدا نشد.</p>");}' +
         'var N=Math.min(o.length,300);for(var j=0;j<N;j++){H.push(card(o[j],j));}' +
         'if(o.length>N){H.push("<div class=m>"+(o.length-N)+" یافتهٔ کم‌امتیازتر این‌جا نشان داده نشد — در خروجی هست.</div>");}' +
         'document.getElementById("lex").innerHTML=H.join("");}');
  H.push('function lsGo(q,src,my){var d=lsLoad(q,src);' +
         'if(d){LS={q:q,src:src,from:d.from,rest:d.rest||[],plan:d.plan,terms:d.terms,read:d.read||0,phrase:d.phrase||0,notes:d.notes||[],items:[]};' +
         'for(var i=0;i<(d.items||[]).length;i++){reg(d.items[i]);LS.items.push(d.items[i]);}' +
         'lsBar("ادامهٔ همان جست‌وجو از جایی که قطع شد");lsDraw();expDraw();lsStep(my,0);return;}' +
         'document.getElementById("semh").innerHTML="<div class=bt>جست‌وجوی ساده: در حالِ خواندنِ فهرستِ تب‌ها…</div>";' +
         'google.script.run.withSuccessHandler(function(s){if(my!==RUN){return;}' +
         'if(!s.ok){document.getElementById("lex").innerHTML="<div class=warn>"+esc(s.note||"انجام نشد")+"</div>";return;}' +
         'LS={q:q,src:src,from:0,rest:[],plan:s.plan,terms:s.terms,read:0,phrase:0,notes:(s.notes||[]).slice(0),items:[]};' +
         'lsBar("");lsDraw();lsStep(my,0);})' +
         '.withFailureHandler(function(e){if(my===RUN){document.getElementById("lex").innerHTML="<div class=warn>خطا: "+esc(e.message)+"</div>";}})' +
         '.srchLexStart(q,src);}');
  H.push('function lsStep(my,tries){if(my!==RUN||!LS){return;}' +
         'if(LS.from>=LS.plan.length){lsBar("کامل؛ همهٔ تب‌ها گشته شد");lsClear();DONE.lex=true;expDraw();return;}' +
         'google.script.run.withSuccessHandler(function(r){if(my!==RUN){return;}' +
         'if(!r.ok){if(!tries){lsBar("یک بار دیگر…");setTimeout(function(){lsStep(my,1);},2000);return;}' +
         'LS.notes.push("تبِ «"+LS.plan[LS.from].name+"» گشته نشد: "+(r.note||""));LS.from++;LS.rest=[];lsSave();lsBar("");lsDraw();lsStep(my,0);return;}' +
         'for(var i=0;i<(r.items||[]).length;i++){var t=r.items[i];var k=rkey(t);if(NO[k]){continue;}reg(t);LS.items.push(t);}' +
         'LS.read+=r.read||0;LS.phrase+=r.phrase||0;for(var n=0;n<(r.notes||[]).length;n++){if(LS.notes.indexOf(r.notes[n])===-1){LS.notes.push(r.notes[n]);}}' +
         'LS.from=r.next;LS.rest=r.rest||[];lsSave();lsBar("");lsDraw();expDraw();lsStep(my,0);})' +
         '.withFailureHandler(function(e){if(my!==RUN){return;}if(!tries){lsBar("قطع شد؛ از همین تب دوباره…");setTimeout(function(){lsStep(my,1);},3000);return;}' +
         'LS.notes.push("تبِ «"+LS.plan[LS.from].name+"» گشته نشد: "+String(e&&e.message||e));LS.from++;LS.rest=[];lsSave();lsBar("");lsDraw();lsStep(my,0);})' +
         '.srchLexStep(LS.q,LS.terms,LS.plan,LS.from,LS.rest);}');
  H.push('function bar(done,all,n,msg){var p=all?Math.round(done*100/all):0;' +
         'document.getElementById("semh").innerHTML="<div class=bt>جست‌وجوی معنایی: "+done+" از "+all+' +
         '" کشوی اثر انگشت خوانده شد ("+p+"٪) · "+n+" یافته"+(msg?" · "+esc(msg):"")+"</div>"+' +
         '"<div class=bar><div class=bi style=width:"+p+"%></div></div>";}');
  H.push('function semEnd(){DONE.sem=true;maybeFinal();}');
  H.push('function semGo(q,my){bar(0,0,0,"در حالِ فهمیدنِ منظورتان…");' +
         'google.script.run.withSuccessHandler(function(s){if(my!==RUN){return;}' +
         'if(!s.ok){bar(0,s.all||0,0,"انجام نشد: "+s.note);semEnd();return;}' +
         'bar(0,s.all,0,"");semStep(s.vp,s.order,0,0,my);})' +
         '.withFailureHandler(function(e){if(my===RUN){bar(0,0,0,"خطا: "+e.message);semEnd();}}).srchSemStart(q);}');
  H.push('function semStep(vp,order,from,best,my){var gap=' + JSON.stringify(Number(CFG.EMB_SCORE_GAP) || 0.25) + ';' +
         'google.script.run.withSuccessHandler(function(r){if(my!==RUN){return;}' +
         'for(var i=0;i<(r.items||[]).length;i++){var t=r.items[i];var k=t.tab+"§"+t.row;' +
         'if(SEEN[k]){continue;}SEEN[k]=1;reg(t);SEM.push(t);}' +
         'var b=Math.max(best,r.best||0);semDraw();digPump();expDraw();' +
         'if(r.done){bar(r.all,r.all,semShown(),"کامل؛ همهٔ کشوها خوانده شد");semEnd();return;}' +
         'if(!r.ok||r.next<=from){bar(r.next,r.all,semShown(),"ایستاد: "+(r.note||"گام جلو نرفت"));semEnd();return;}' +
         'bar(r.next,r.all,semShown(),"");semStep(vp,order,r.next,b,my);})' +
         '.withFailureHandler(function(e){if(my===RUN){bar(from,order.length,semShown(),"خطا: "+e.message);semEnd();}})' +
         '.srchSemStep(vp,order,from,best>0?best-gap:0);}');
  /* آنچه واژه‌ها هم آورده‌اند دوباره نشان داده نمی‌شود؛ بقیه به ترتیبِ امتیازِ معنایی، همان لحظه — **همه‌شان** (۹.۴۸:
     تا ۹.۴۷ سقفِ ۱۵۰ داشت و نوار «۶۰۸ یافته» می‌گفت). */
  H.push('function semList(){var o=[];for(var i=0;i<SEM.length;i++){' +
         'if(!LEX[SEM[i].tab+"§"+SEM[i].row]&&!OFF[SEM[i].n]){o.push(SEM[i]);}}' +
         'o.sort(function(a,b){return (b.sem||0)-(a.sem||0);});return o;}');
  H.push('function semShown(){return semList().length;}');
  /* ۹.۴۹: داوریِ هر دسته (`keep`) یافته‌های نامربوط را از هر دو فهرست برمی‌دارد — واژه‌ها هم. */
  H.push('var LASTR=null;function redraw(){semDraw();if(LASTR){show(LASTR);}}');
  H.push('function semDraw(){var el=document.getElementById("sem");if(!el){return;}var o=semList();' +
         'var H=[];if(o.length){H.push("<h4>یافته‌های معنایی — همان معنا، با واژه‌های دیگر ("+o.length+")</h4>");}' +
         'if(NOFF){H.push("<div class=m>"+NOFF+" یافته را داور با خواستهٔ شما نامربوط دانست و نشان داده نشد.</div>");}' +
         'for(var i=0;i<o.length;i++){H.push(card(o[i],i));}' +
         'el.innerHTML=H.join("");}');
  /* ══ جمع‌بندی، حینِ جست‌وجو (۹.۴۸) ══ هر یافتهٔ تازه در صفِ `DQ` می‌نشیند و دسته‌دسته (یکی در پرواز) خوانده
     می‌شود؛ وقتی هر دو رشته تمام شدند و صف خالی شد، یک فراخوانِ پایانی فقط اقلامِ استخراج‌شده را مرتب می‌کند. */
  H.push('function itxt(t){var f=t.fields||{};return [t.title,t.show,f.summary,f.msg,f.body].filter(function(x){return x;}).join(" — ");}');
  H.push('function digPump(){if(DBUSY||!DQ.length){return;}var my=RUN;var b=DQ.splice(0,40);DBUSY=true;digDraw();' +
         'google.script.run.withSuccessHandler(function(r){if(my!==RUN){return;}DBUSY=false;' +
         'if(!r||!r.ok){DFAIL+=b.length;}var f=(r&&r.found)||[];' +
         'for(var i=0;i<f.length;i++){var k=String(f[i].name).replace(/\\s+/g," ").trim().toLowerCase();if(!k){continue;}' +
         'if(!ENT[k]){ENT[k]={name:f[i].name,note:f[i].note||"",refs:[]};EORD.push(k);}' +
         'for(var z=0;z<f[i].refs.length;z++){if(ENT[k].refs.indexOf(f[i].refs[z])===-1){ENT[k].refs.push(f[i].refs[z]);}}}' +
         'if(r&&r.ok&&r.keep){for(var y=0;y<b.length;y++){if(r.keep.indexOf(String(b[y].n))===-1){OFF[b[y].n]=1;NOFF++;}}' +
         'redraw();}' +
         'digDraw();digPump();maybeFinal();})' +
         '.withFailureHandler(function(e){if(my!==RUN){return;}DBUSY=false;DFAIL+=b.length;digDraw();digPump();maybeFinal();})' +
         '.srchDigestStep(Q,b.map(function(t){return {n:String(t.n),t:itxt(t)};}));}');
  H.push('function ents(){return EORD.map(function(k){return ENT[k];});}');
  H.push('function maybeFinal(){if(MODE!=="هوشمند"||DIG||!DONE.lex||!DONE.sem||DBUSY||DQ.length){return;}var my=RUN;' +
         'if(!EORD.length){DIG={rows:[],answer:"",note:"در متنِ یافته‌ها قلمِ مشخصی پیدا نشد."};digDraw();expDraw();return;}' +
         'DIG={pending:true,rows:[]};digDraw();' +
         'google.script.run.withSuccessHandler(function(r){if(my!==RUN){return;}DIG=r||{rows:[]};digDraw();expDraw();})' +
         '.withFailureHandler(function(e){if(my!==RUN){return;}DIG={rows:ents().slice(0,20).map(function(x){' +
         'return {name:x.name,why:x.note,refs:x.refs};}),note:"ترتیبِ پایانی نیامد: "+e.message};digDraw();expDraw();})' +
         '.srchDigestFinal(Q,ents());}');
  H.push('function digDraw(){var el=document.getElementById("dig");if(!el||MODE!=="هوشمند"){return;}var H=[];' +
         'var read=ALL.length-DQ.length-(DBUSY?1:0);' +
         'if(!DIG||DIG.pending){H.push("<div class=ans>جمع‌بندی در حالِ ساخت: "+EORD.length+" قلم از متنِ "+' +
         'Math.max(0,ALL.length-DQ.length)+" یافته از "+ALL.length+" بیرون کشیده شد"+(DFAIL?" · "+DFAIL+" یافته خوانده نشد (خطای مدل)":"")+' +
         '(DIG&&DIG.pending?" · در حالِ مرتب کردن…":"")+"</div>");el.innerHTML=H.join("");return;}' +
         'H.push("<div class=ans><b>جمع‌بندی از درونِ همهٔ "+ALL.length+" یافته</b>"+(DIG.answer?"<br>"+esc(DIG.answer):"")+' +
         '(DIG.note?"<br><small>"+esc(DIG.note)+"</small>":"")+(DFAIL?"<br><small>"+DFAIL+" یافته به‌خاطرِ خطای مدل خوانده نشد.</small>":"")+"<ol>");' +
         'for(var i=0;i<(DIG.rows||[]).length;i++){var w=DIG.rows[i];H.push("<li><b>"+esc(w.name)+"</b>"+(w.why?" — "+esc(w.why):"")+' +
         '" — یافته‌ها: "+(w.refs||[]).map(function(n){return "<a href=#r"+esc(n)+">#"+esc(n)+"</a>";}).join(" ")+"</li>");}' +
         'H.push("</ol></div>");el.innerHTML=H.join("");}');
  /* ══ خروجی (۹.۴۸) ══ هر وقت دست‌کم یک یافته هست — پس از پایان، یا هر جا که ایستاد. */
  H.push('function expDraw(){var el=document.getElementById("exp");if(!el){return;}if(!ALL.length){el.innerHTML="";return;}' +
         'if(el.getAttribute&&el.getAttribute("data-busy")==="1"){return;}' +
         'el.innerHTML="<div class=row><button class=s onclick=exportNow()>⬇️ خروجی — شیت، اکسل و HTML ("+(ALL.length-NOFF)+" یافته)</button></div>";}');
  H.push('function slim(t){var f=t.fields||{};return {n:t.n,title:t.title,where:t.where,tab:t.tab,kind:t.kind,date:t.date,' +
         'score:t.score,sem:t.sem,fit:t.fit,why:t.why,show:t.show,link:t.link,sheetLink:t.sheetLink,' +
         'fields:{summary:f.summary,msg:f.msg,body:f.body}};}');
  H.push('function exportNow(){var el=document.getElementById("exp");var my=RUN;' +
         'el.innerHTML="<p>در حالِ ساختنِ خروجی ("+ALL.length+" یافته)…</p>";' +
         'var d=DIG&&!DIG.pending?DIG:{rows:ents().slice(0,20).map(function(x){return {name:x.name,why:x.note,refs:x.refs};}),answer:""};' +
         'google.script.run.withSuccessHandler(function(r){if(my!==RUN){return;}' +
         'if(!r.ok){el.innerHTML="<div class=warn>"+esc(r.note)+"</div>";return;}' +
         'el.innerHTML="<div class=ans>خروجی ساخته شد ("+r.n+" یافته): "+' +
         '"<a href=\\""+esc(r.sheetUrl)+"\\" target=_blank>شیت</a> · <a href=\\""+esc(r.xlsxUrl)+"\\" target=_blank>دانلودِ اکسل</a> · "+' +
         '"<a href=\\""+esc(r.htmlUrl)+"\\" target=_blank>دانلودِ HTML</a></div>";})' +
         '.withFailureHandler(function(e){if(my===RUN){el.innerHTML="<div class=warn>خروجی ساخته نشد: "+esc(e.message)+"</div>";}})' +
         '.srchExport(Q,ALL.filter(function(t){return !OFF[t.n];}).map(slim),d);}');
  H.push('function show(r){LASTR=r;var H=[];');
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
  H.push('for(var i=0;i<(r.items||[]).length;i++){var t=r.items[i];reg(t);' +
         'if(t.where==="بانک"){LEX[t.tab+"§"+t.row]=1;}if(!OFF[t.n]){H.push(card(t,i));}}');
  H.push('document.getElementById("lex").innerHTML=H.join("");}');
  H.push('function card(t,i){var H=[];');
  H.push('H.push("<div class=\\"it\\" id=\\"r"+esc(t.n)+"\\"><div class=\\"t\\">#"+esc(t.n)+" · "+esc(t.title)+"</div>");');
  H.push('H.push("<div class=\\"m\\">"+esc(t.where)+" · "+esc(t.tab)+(t.kind?" · "+esc(t.kind):"")+' +
         '(t.date?" · "+esc(t.date):"")+" · امتیاز "+(t.sem&&!t.score?Number(t.sem).toFixed(2):t.score)+(t.fit?" · "+esc(t.fit):"")+"</div>");');
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
  H.push('H.push("</div>");return H.join("");}');
  H.push('</script></body></html>');
  return H.join('');
}


/* ══════════════════════════════════════════════════════════════════════════
   کاوشِ کاملِ عبارت (۸.۸۱) — شاهد، نه حدس

   صاحبِ برنامه: «می‌دانم فایلی هست که محتوای استخراج‌شده‌اش دقیقاً همین عبارت را دارد». از بیرونِ
   موتور نمی‌شود این را سنجید (شیت‌ها ده‌ها مگابایت‌اند و نمایهٔ درایو ناقص). پس موتور خودش، در
   اجرای جدا و بی بودجهٔ جست‌وجو، **همهٔ** تب‌های بانک و منبع را فقط با الگوی عبارتِ کامل می‌گردد و
   هر یافته را با نامِ تب، ردیف و تکه‌ای از همان سلول در `_STATUS.json` → `searchProbe` می‌گذارد.
   فقط می‌خوانَد؛ هیچ شیتی نوشته نمی‌شود. یک بار برای هر `SEARCH_PROBE_TAG`.
   ══════════════════════════════════════════════════════════════════════════ */
function srchProbeArm_() {
  var tag = String(CFG.SEARCH_PROBE_TAG || ''), qs = CFG.SEARCH_PROBE_Q || [];
  if (!tag || !qs.length) return false;
  var st = {};
  try { st = JSON.parse(props_().getProperty(PK.SRCH_PROBE) || '{}') || {}; } catch (e) { st = {}; }
  if (st.tag === tag && (st.at || (Number(st.tries) || 0) >= 3)) return false;
  if (st.tag === tag && st.armedAt && new Date().getTime() - Number(st.armedAt) < 50 * 60000) return false;
  st = st.tag === tag ? st : { tag: tag, tries: 0 };
  st.armedAt = new Date().getTime();
  props_().setProperty(PK.SRCH_PROBE, JSON.stringify(st));
  clearRetryTriggers_('srchProbeRun');
  ScriptApp.newTrigger('srchProbeRun').timeBased().after(60000).create();
  return true;
}

/** اجرای یک‌باره: هر عبارت در همهٔ تب‌ها، فقط با الگوی کامل. */
function srchProbeRun() {
  runEnter_('srchProbeRun');
  var st = {}, note = '';
  try { st = JSON.parse(props_().getProperty(PK.SRCH_PROBE) || '{}') || {}; } catch (e0) { st = {}; }
  st.tag = String(CFG.SEARCH_PROBE_TAG || st.tag || ''); st.tries = (Number(st.tries) || 0) + 1;
  try {
    try { clearRetryTriggers_('srchProbeRun'); } catch (eC) {}
    var t0 = new Date().getTime(), tabs = [];
    try { var ht = srchHubTabs_(getHub_()); for (var i = 0; i < ht.length; i++) tabs.push({ sh: ht[i], src: 'بانک' }); } catch (eH) {}
    var list = CFG.SOURCES || [];
    for (var s = 0; s < list.length; s++) {
      try {
        var shs = SpreadsheetApp.openById(list[s].id).getSheets();
        for (var u = 0; u < shs.length; u++) tabs.push({ sh: shs[u], src: list[s].title });
      } catch (eO) {}
    }
    var qs = CFG.SEARCH_PROBE_Q || [], res = {};
    for (var q = 0; q < qs.length; q++) {
      var pat = srchPattern_(qs[q]), r = { tabs: 0, hits: 0, where: [] };
      for (var k = 0; k < tabs.length; k++) {
        if (new Date().getTime() - t0 > 300000) { r.cut = 'وقت'; break; }
        var tf = null;
        try { tf = tabs[k].sh.createTextFinder(pat).useRegularExpression(true).matchCase(false); } catch (eT) { continue; }
        r.tabs++;
        var all = [];
        try { all = tf.findAll() || []; } catch (eF) { r.err = String(eF.message).slice(0, 80); continue; }
        r.hits += all.length;
        for (var a = 0; a < all.length && r.where.length < 12; a++) {
          var cell = '';
          try { cell = String(all[a].getValue() || ''); } catch (eV) {}
          if (!cell) { try { cell = String(all[a].getDisplayValue() || ''); } catch (eD) {} }
          var at = -1;
          try { at = cell.search(new RegExp(pat.replace(/\(\?:\^\|\[\^[^\]]*\]\)|\(\?:\[\^[^\]]*\]\|\$\)/g, ''), 'iu')); } catch (eR) { at = -1; }
          if (at < 0) at = 0;
          r.where.push({ tab: tabs[k].src + ' › ' + tabs[k].sh.getName(), row: all[a].getRow(), col: all[a].getColumn(),
                         cut: cell.slice(Math.max(0, at - 80), Math.max(0, at) + 120) });
        }
        all = null;
      }
      res[qs[q]] = r;
    }
    st.at = nowStr_(); st.res = res; st.tabs = tabs.length; st.why = '';
    note = 'کاوشِ کاملِ عبارت: ' + Object.keys(res).map(function (x) { return '«' + x + '» ' + res[x].hits + ' یافته در ' + res[x].tabs + ' تب'; }).join('، ');
  } catch (e) {
    st.why = String((e && e.message) || e).slice(0, 160);
    note = 'کاوشِ کاملِ عبارت نشد: ' + st.why;
  } finally {
    try { props_().setProperty(PK.SRCH_PROBE, JSON.stringify(st)); } catch (eP) {}
    try { logLine_(note); } catch (eL) {}
    runExit_('srchProbeRun', note);
  }
  return st;
}

/** برای `_STATUS.json` — فقط Properties. */
function srchProbeStatus_() {
  try { return JSON.parse(props_().getProperty(PK.SRCH_PROBE) || 'null'); } catch (e) { return null; }
}
