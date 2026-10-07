/* ═══════════════════════════════════════════════════════════════════════════
 * بخشِ ۲۷ — انتشار در یوتیوب
 *
 * ══ مرزی که این بخش رویش ساخته شده ══
 * یوتیوب فایلِ صوتی نمی‌پذیرد؛ فقط ویدئو. و Apps Script نمی‌تواند ویدئو بسازد:
 * نه ffmpeg دارد، نه کتابخانه‌ای در دسترس است، و مهلتِ شش‌دقیقه‌ایِ گوگل هم
 * اجازهٔ کدگذاریِ چهارده دقیقه تصویر را نمی‌دهد. این را باید صریح نوشت، چون
 * وسوسه‌اش هست که «بعداً یک راهی پیدا می‌شود» — پیدا نمی‌شود.
 *
 * پس کار تقسیم شده، دقیقاً مثل موسیقی که در ۵٫۵۵ تقسیم شد:
 *   • موتور: تصمیم می‌گیرد چه چیزی منتشر شود، عنوان و کپشن و برچسب می‌نویسد،
 *     کاور می‌سازد، پلی‌لیست می‌چیند، آپلود می‌کند، و همه‌چیز را ثبت و پایش
 *     می‌کند.
 *   • بیرون (تسکِ غنی‌سازی، با ffmpeg): از روی WAV و کاور، یک MP4 می‌سازد و
 *     در همان پوشهٔ قسمت می‌گذارد. درخواستش در `_YT-RENDER.json` است.
 *
 * ══ سه چیزی که در این بخش «در کد» است، نه «در پرامپت» ══
 * ۱) نشتیِ خصوصی. کانال عمومی است؛ لینکِ درایو، شناسهٔ فایل، ایمیل و نامِ تب
 *    هرگز نباید در کپشن برود. مدل هرچقدر هم خوب دستور بگیرد، یک بار که
 *    اشتباه کند آن اشتباه عمومی شده است. پس `ytLeaks_` روی متنِ نهایی اجرا
 *    می‌شود و تا پاک نشود، ویدئو از unlisted بیرون نمی‌آید.
 * ۲) سقفِ سهمیه. دو سطلِ جدا دارد و هر دو با ۴۰۳ بسته می‌شوند، بی هیچ هشداری.
 * ۳) ترتیبِ پلی‌لیست. از رجیستریِ مجموعه‌ها می‌آید، نه از حافظهٔ یوتیوب.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* ───────────────────────── ۰) در دسترس بودن ───────────────────────── */

/** سرویسِ پیشرفتهٔ یوتیوب فعال است؟ نبودنش خطا نیست — یعنی هنوز وصل نشده. */
function ytSvc_() {
  try { return (typeof YouTube !== 'undefined' && YouTube) ? YouTube : null; }
  catch (e) { return null; }
}

function ytOn_() { return CFG.YT_ENABLED !== false && !!ytSvc_(); }

/** چرا خاموش است — یک جملهٔ خواندنی، چون «کار نمی‌کند» جواب نیست. */
function ytOffWhy_() {
  if (CFG.YT_ENABLED === false) return 'در تنظیمات خاموش است (YT_ENABLED)';
  if (!ytSvc_()) {
    return 'سرویسِ یوتیوب در پروژهٔ Apps Script فعال نیست — از ویرایشگر، ' +
           'Services ← YouTube Data API v3 را اضافه کنید';
  }
  return '';
}

/* ───────────────────────── ۱) سهمیه ─────────────────────────
 * دو سطل، و هر دو بی‌صدا بسته می‌شوند: وقتی تمام شد، فراخوان ۴۰۳ می‌دهد و
 * هیچ‌چیز نمی‌گوید کدام سطل بود. پس خودمان می‌شماریم و پیش از خرج‌کردن
 * می‌پرسیم. `search.list` (صد واحد) عمداً هیچ‌جای این بخش به کار نرفته —
 * فهرستِ ما در تب است، نه در جست‌وجوی یوتیوب.
 */
/* ══ هزینهٔ واقعیِ هر فراخوان، به واحدِ سهمیهٔ یوتیوب ══
 * `videosInsert` از همه گران‌تر است و **۱۶۰۰** واحد می‌گیرد — نه صفر، که تا
 * ۶٫۷ این‌طور حساب می‌شد. اثرش این بود: سطلِ آپلود (۹۰ تا در روز) شمرده
 * می‌شد ولی سطلِ واحدها هرگز از بابتِ آپلود کم نمی‌شد، پس موتور فکر می‌کرد
 * نود آپلود در روز ممکن است در حالی که سقفِ واقعی **پنج** تاست
 * (۹۰۰۰ ÷ ۱۷۵۰ برای هر قسمت، با کاور و پلی‌لیست). ششمی ۴۰۳ می‌گرفت که
 * علتش را نمی‌گوید، «ناموفق» ثبت می‌شد، و پس از `YT_TRY_MAX` تلاش آن قسمت
 * **برای همیشه رها** می‌شد. یعنی یک اشتباهِ حسابداری، قسمت گم می‌کرد. */
var YT_COST = { videosInsert: 1600, videosUpdate: 50, videosList: 1,
                playlistsInsert: 50, playlistsUpdate: 50, playlistsList: 1,
                itemsInsert: 50, itemsUpdate: 50, itemsList: 1, itemsDelete: 50,
                thumbSet: 50 };

/** هر قسمتِ منتشرشده تقریباً چند واحد می‌خورد (آپلود + کاور + پلی‌لیست + عمومی‌کردن). */
function ytUnitsPerEpisode_() {
  return YT_COST.videosInsert + YT_COST.thumbSet + YT_COST.itemsInsert +
         YT_COST.videosUpdate;
}

/**
 * با سهمیهٔ امروز، چند قسمتِ دیگر می‌شود منتشر کرد — و صف چند روز طول می‌کشد.
 *
 * این عدد باید **دیده شود**، نه اینکه فقط در کد باشد: صاحبِ برنامه ۲۶۴ قسمتِ
 * گذشته دارد و حق دارد بداند تخلیه‌شان هفته‌ها طول می‌کشد. سقفش را هم ما
 * نگذاشته‌ایم؛ یوتیوب گذاشته.
 */
function ytDrain_(dueCount) {
  var per = ytUnitsPerEpisode_();
  var capU = Math.max(100, Number(CFG.YT_QUOTA_UNITS) || 9000);
  var perDay = Math.max(1, Math.floor(capU / per));
  var n = Math.max(0, Number(dueCount) || 0);
  return { perDay: perDay, days: n ? Math.ceil(n / perDay) : 0, units: per };
}

function ytQuota_() {
  var today = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  var q = null;
  try { q = JSON.parse(props_().getProperty(PK.YT_QUOTA) || 'null'); } catch (e) {}
  if (!q || q.day !== today) q = { day: today, units: 0, uploads: 0, blocked: '' };
  return q;
}

function ytQuotaSave_(q) {
  try { props_().setProperty(PK.YT_QUOTA, JSON.stringify(q)); } catch (e) {}
}

/**
 * سهمیه را *پیش از* خرج برمی‌دارد. برمی‌گرداند: آیا جا هست؟
 * ترتیب عمدی است — برداشتن پس از خرج یعنی یک اجرای کشته‌شده، سهمیه‌ای را
 * که واقعاً خرج شده نشمرده می‌گذارد و فردا دوباره خرجش می‌کنیم.
 */
function ytQuotaTake_(units, isUpload) {
  var q = ytQuota_();
  var capU = Math.max(100, Number(CFG.YT_QUOTA_UNITS) || 9000);
  var capUp = Math.max(1, Number(CFG.YT_QUOTA_UPLOADS) || 90);
  if (isUpload && q.uploads + 1 > capUp) { q.blocked = 'آپلود'; ytQuotaSave_(q); return false; }
  if (q.units + (Number(units) || 0) > capU) { q.blocked = 'واحد'; ytQuotaSave_(q); return false; }
  q.units += (Number(units) || 0);
  if (isUpload) q.uploads++;
  q.blocked = '';
  ytQuotaSave_(q);
  return true;
}

/* ───────────────── ۲) مرزِ خصوصی — نشتی در کد گرفته می‌شود ─────────────────
 *
 * صاحبِ برنامه صریح گفت: «چون انتشار عمومی هست … بعضی چیزا که فکر می‌کنه
 * می‌تونه جنبهٔ خصوصی داشته باشه رو نذاره، مثلاً لینکِ منابع که متصل می‌شه به
 * فایل‌های تو درایو لازم نیست».
 *
 * چرا این را به مدل نمی‌سپاریم: چون یک بار اشتباهِ مدل یعنی یک لینکِ درایو
 * عمومی‌شده — و برخلافِ متنِ پادکست، این را نمی‌شود «فردا بهتر کرد». درسِ
 * خودِ این ریپو: «سقفی که فقط در پرامپت گفته شده، سقف نیست.»
 *
 * پس دو تابع: یکی می‌گوید چه چیزی پیدا شد (برای یافته و گزارش)، دیگری
 * پاکش می‌کند. و ویدئو تا وقتی `ytLeaks_` چیزی می‌بیند، عمومی نمی‌شود.
 */
var YT_LEAK = [
  { kind: 'لینکِ درایو',     re: /https?:\/\/(?:drive|docs|script|sheets)\.google\.com\/\S+/gi },
  { kind: 'شناسهٔ فایلِ درایو', re: /\b[A-Za-z0-9_-]{28,}\b/g },
  { kind: 'ایمیل',           re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { kind: 'نامِ فایلِ درونی',  re: /_(?:STATUS|HANDOUT|EPISODE|SPECIAL|ENRICH|REPORT|MUSIC-[A-Z]+|CODE-LATEST|YT-RENDER)[A-Za-z-]*\.(?:json|md|gs)/gi },
  { kind: 'شناسهٔ اسکریپت',   re: /\bAKfyc[A-Za-z0-9_-]+/g }
];

/**
 * چه چیزهایی از جنسِ خصوصی در متن هست؟ فهرست، نه بله/خیر — چون گزارش باید
 * بگوید *چه* نشت کرده، وگرنه کسی نمی‌تواند علتش را پیدا کند.
 */
function ytLeaks_(text) {
  var t = String(text || ''), out = [];
  for (var i = 0; i < YT_LEAK.length; i++) {
    var re = new RegExp(YT_LEAK[i].re.source, YT_LEAK[i].re.flags);
    var m;
    while ((m = re.exec(t)) !== null) {
      // نامِ کانال و آدرسِ خودِ یوتیوب نشتی نیست
      if (/youtube\.com|youtu\.be/i.test(m[0])) continue;
      out.push({ kind: YT_LEAK[i].kind, sample: String(m[0]).slice(0, 60) });
      if (out.length >= 12) return out;
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return out;
}

/** همان الگوها، ولی پاک‌کننده. جای هرچه برداشته شد، چیزی نمی‌گذارد. */
function ytScrub_(text) {
  var t = String(text || '');
  for (var i = 0; i < YT_LEAK.length; i++) {
    var re = new RegExp(YT_LEAK[i].re.source, YT_LEAK[i].re.flags);
    t = t.replace(re, function (hit) {
      return /youtube\.com|youtu\.be/i.test(hit) ? hit : '';
    });
  }
  // فاصله‌های جامانده و پرانتزهای خالی که بعدِ حذف می‌مانند
  t = t.replace(/\(\s*\)|\[\s*\]|«\s*»/g, '');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.replace(/[ \t]+\n/g, '\n').trim();
}

/* ───────────────────── ۳) فصل‌بندی (chapters) ─────────────────────
 *
 * فصل‌بندی هم برای بیننده است و هم برای جست‌وجو: یوتیوب متنِ هر فصل را
 * ایندکس می‌کند و در نتایج «قسمت‌های ویدئو» نشان می‌دهد. برای پادکستِ چهارده
 * دقیقه‌ای این بزرگ‌ترین بردِ رایگانِ سئوست.
 *
 * ══ چرا زمان‌ها تخمینی‌اند و چرا اشکالی ندارد ══
 * موتور موقعِ صداگذاری زمانِ شروعِ هر بخش را ثبت نمی‌کند — و افزودنش یعنی
 * دست‌بردن در حلقهٔ صداگذاری، تنها جایی از این ریپو که هیچ‌وقت نباید بی‌دلیل
 * دست‌کاری شود. به‌جایش زمان‌ها از سهمِ نویسهٔ هر بخش حساب می‌شوند و بعد روی
 * *مدتِ واقعیِ اندازه‌گیری‌شده* مقیاس می‌خورند، پس خطا انباشته نمی‌شود.
 * چند ثانیه لغزش در یک فصل، برای شنونده چیزی نیست؛ نبودِ فصل‌بندی هست.
 *
 * قواعدِ خودِ یوتیوب که در کد رعایت می‌شوند: اولین زمان باید ۰۰:۰۰ باشد،
 * دست‌کم سه فصل، و هیچ فصلی کوتاه‌تر از ده ثانیه.
 */
function ytTime_(sec) {
  var s = Math.max(0, Math.round(Number(sec) || 0));
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), q = s % 60;
  var mm = (h ? ('0' + m).slice(-2) : String(m));
  return (h ? h + ':' : '') + mm + ':' + ('0' + q).slice(-2);
}

function ytChapters_(sections, totalSec, introSec) {
  var secs = sections || [];
  var total = Number(totalSec) || 0;
  if (CFG.YT_CHAPTERS === false || !secs.length || total < 60) return [];

  var lead = Math.max(0, Number(introSec) || 0);
  var chars = [], sum = 0;
  for (var i = 0; i < secs.length; i++) {
    var n = String((secs[i] && (secs[i].narration || secs[i].text)) || '').length;
    chars.push(n); sum += n;
  }
  if (!sum) return [];

  // بدنهٔ گفتار = کلِ ویدئو منهای آغاز. اگر آغاز از خودِ ویدئو بلندتر بود،
  // چیزی جز صفر معنا ندارد.
  var body = Math.max(1, total - lead);
  var out = [{ at: 0, title: 'شروع' }];
  var acc = lead;
  for (var j = 0; j < secs.length; j++) {
    var head = String((secs[j] && secs[j].heading) || '').trim();
    if (!head) head = 'بخش ' + faDigitsOut_(String(j + 1));
    out.push({ at: Math.round(acc), title: head });
    acc += (chars[j] / sum) * body;
  }

  // هیچ فصلی کوتاه‌تر از ده ثانیه نباشد — قاعدهٔ خودِ یوتیوب. کوتاه‌ها در
  // فصلِ قبلی ادغام می‌شوند، نه اینکه حذف؛ عنوانشان از دست نمی‌رود.
  var keep = [out[0]];
  for (var k = 1; k < out.length; k++) {
    if (out[k].at - keep[keep.length - 1].at < 10) continue;
    keep.push(out[k]);
  }
  if (keep.length < 3) return [];        // کمتر از سه فصل، فصل‌بندی نیست
  return keep;
}

/* ───────────────────── ۴) متادیتا: عنوان، کپشن، برچسب ───────────────────── */

/* همهٔ فیلدها رشته‌اند. مدلِ این ریپو هر schema حاویِ integer/number/boolean
   را رد می‌کند؛ `run_real_test.js` این قاعده را روی کلِ کد نگه می‌دارد. */
var YT_META_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    // متنِ روی کاور — عمداً جدا از عنوان. عنوانِ یوتیوب صد نویسه جا دارد و
    // کنارِ ویدئو خوانده می‌شود؛ کاور در اندازهٔ بندانگشتی دیده می‌شود و
    // بیش از چند واژه در آن خوانا نیست. یک متن برای دو کار، یعنی هر دو بد.
    coverTitle: { type: 'string' },
    coverKicker: { type: 'string' },
    hookLine: { type: 'string' },
    summary: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    hashtags: { type: 'array', items: { type: 'string' } },
    /* ══ تصویرهای درس ══
     * این‌جا اضافه می‌شود و **نه در یک فراخوانِ جدا**، چون `ytPlan_` از قبل
     * یک بار در هر قسمت پرسیده می‌شود و جوابش در `_yt.json` می‌مانَد. یعنی
     * هزینهٔ توکنی چند صد توکنِ خروجیِ بیشتر است، نه یک فراخوانِ تازه —
     * خواستهٔ صریحِ صاحبِ برنامه که «هزینه و توکن بالا نره».
     *
     * همهٔ فیلدها رشته‌اند، از جمله شمارهٔ بخش. مدلِ این ریپو هر schema
     * حاویِ integer/number/boolean را رد می‌کند (`run_real_test.js` ۲). */
    /* ══ قراردادِ تصویر — از ۸.۰۱ عوض شد، و این ریشهٔ همهٔ ایرادها بود ══
     * پیش از این از مدل «جمله‌های کلیدیِ این بخش» خواسته می‌شد، پس خروجی
     * **همان متن به شکلی دیگر** بود. حالا از او «تصویرِ این مفهوم» خواسته
     * می‌شود: چه شکلی (مقایسه؟ زنجیره؟ پرسش؟)، با یک برچسبِ کوتاه.
     *
     * و `quote` مهم‌ترین فیلدِ این ساختار است: عبارتی **عیناً از روایت**، تا
     * کد بتواند بگوید این تصویر در کدام ثانیه گفته می‌شود. بی آن، زمان‌بندی
     * دوباره حسابی می‌شود و تصویر از گفتار جدا می‌افتد — که سنجیده شد و
     * ۱۱ تا ۸۰ ثانیه اختلاف داشت. */
    visuals: { type: 'array', items: { type: 'object', properties: {
      at: { type: 'string' },          // شمارهٔ بخش، از ۱
      quote: { type: 'string' },       // ۴ تا ۹ واژه، **عیناً** از روایتِ همان بخش
      form: { type: 'string' },        // مقایسه | زنجیره | تمرکز | نقل | پرسش
      kicker: { type: 'string' },      // برچسبِ گوشه، ۲ تا ۵ واژه
      headline: { type: 'string' },    // متنِ درشت — حداکثر ۷ واژه
      note: { type: 'string' },        // یک جملهٔ کوتاه، اختیاری
      icon: { type: 'string' },        // مثلث | خوشه | ذهن | گوش | زنجیر | برچسب | برگه
      aTitle: { type: 'string' },      // «مقایسه»: سرِ ستونِ راست
      aIcon: { type: 'string' },
      aItems: { type: 'array', items: { type: 'string' } },   // ۲ تا ۳ بند، هر کدام ≤ ۴ واژه
      bTitle: { type: 'string' },      // سرِ ستونِ چپ
      bIcon: { type: 'string' },
      bItems: { type: 'array', items: { type: 'string' } },
      steps: { type: 'array', items: { type: 'string' } },    // «زنجیره»: ۳ گام
      items: { type: 'array', items: { type: 'string' } },    // «تمرکز»: ۲ تا ۳ اصطلاح
      terms: { type: 'string' },       // واژه‌های جست‌وجوی تصویر، انگلیسی
      caption: { type: 'string' }      // زیرنویسِ جزوه، فارسی
    } } },
    /* ══ ظاهرِ این درس را خودِ مدل انتخاب می‌کند (۸٫۱۸) ══
     * روی همین فراخوان، نه یک فراخوانِ تازه: مدل همین الان عنوان و خلاصه و
     * تصویرهای این درس را می‌نویسد، یعنی تنها جایی در کلِ موتور که **هم
     * موضوعِ مجموعه را می‌داند و هم متنِ همین قسمت را خوانده**. چند ده
     * توکنِ خروجیِ بیشتر، و هیچ هزینهٔ تازه‌ای. */
    look: { type: 'object', properties: {
      level: { type: 'string' },       // خاموش | کم | زیاد
      base:  { type: 'string' },       // رنگ و فضا — یکی از سبک‌های فهرست
      motif: { type: 'string' },       // نقش و قاب — یکی از سبک‌ها، یا خالی
      why:   { type: 'string' }        // یک جملهٔ کوتاهِ فارسی
    } }
  },
  required: ['title', 'coverTitle', 'hookLine', 'summary', 'tags']
};

function ytMetaPrompt_(ctx) {
  var L = [];
  L.push('تو سردبیرِ کانالِ یوتیوبِ یک پادکستِ فارسی هستی و باید برای این قسمت ' +
         'عنوان، خلاصه و برچسب بنویسی — طوری که هم آدم دوست داشته باشد کلیک کند ' +
         'و هم در جست‌وجوی یوتیوب پیدا شود.');
  L.push('');
  L.push('برنامه: «' + ctx.showName + '»' + (ctx.tagline ? ' — ' + ctx.tagline : ''));
  if (ctx.seriesName) L.push('مجموعه: «' + ctx.seriesName + '»');
  L.push('شمارهٔ قسمت: ' + ctx.epNum);
  if (ctx.lesson) {
    L.push('شمارهٔ این درس در مجموعه‌اش: ' + ctx.lesson +
           ' — اگر در عنوان شماره می‌آوری، **همین** را بیاور («درس ' + ctx.lesson +
           '»)، نه شمارهٔ سراسریِ قسمت را: درسِ اولِ یک مجموعهٔ تازه نباید ' +
           '«درس ۲۲» خوانده شود.');
  }
  L.push('عنوانِ داخلیِ قسمت: ' + ctx.title);
  if (ctx.cat) L.push('دستهٔ محتوا: ' + ctx.cat);
  L.push('مدت: ' + ctx.duration);
  L.push('');
  L.push('سرِ بخش‌های قسمت:');
  for (var i = 0; i < (ctx.headings || []).length; i++) {
    L.push('  ' + faDigitsOut_(String(i + 1)) + ') ' + ctx.headings[i]);
  }
  if (ctx.hook) { L.push(''); L.push('آغازِ خودِ قسمت (عیناً): ' + auditCut_(ctx.hook, 700)); }
  if (ctx.summary) { L.push(''); L.push('خلاصهٔ داخلی: ' + auditCut_(ctx.summary, 700)); }

  /* ══ این هفت خط، تمامِ تفاوتِ «ثبت» و «اثر» است (۶٫۷) ══
   * بی آن، تبِ بازخورد یک جدولِ تماشایی است و بس — دقیقاً همان سرنوشتی که
   * `musicProbe_` و `auditSnap_` پیدا کردند: تحلیلی که نوشته شد و هیچ
   * تصمیمی بر مبنایش گرفته نشد. اگر روزی این بند برداشته شود، کلِ بخشِ
   * ۱۳‑ب بی‌معنا می‌شود. */
  var learn = null;
  try { learn = ytLearn_(); } catch (eL) {}
  if (learn && learn.text) { L.push(''); L.push(learn.text); }

  L.push('');
  L.push('چه بنویس:');
  L.push('• title — عنوانِ یوتیوب. حداکثر ' + (CFG.YT_TITLE_MAX || 100) + ' نویسه. ' +
         'مهم‌ترین واژهٔ جست‌وجو در شصت نویسهٔ اول باشد. بی‌کلیک‌بیت، بی وعدهٔ دروغ، ' +
         'بی حروفِ بزرگِ فریاد. اگر مجموعه‌ای است، شمارهٔ درس در عنوان بیاید.');
  L.push('• coverTitle — متنِ بزرگِ روی کاور. **حداکثر ' +
         faDigitsOut_(String(CFG.YT_COVER_CHARS || 42)) + ' نویسه**، ترجیحاً کمتر. ' +
         'کاور در اندازهٔ بندانگشتی دیده می‌شود، پس این باید در یک نگاه خوانده شود: ' +
         'دو تا پنج واژه، خودِ موضوع، بی فعلِ اضافه، بی «قسمت فلان»، بی نامِ برنامه ' +
         '(این‌ها جداگانه روی کاور هستند). مثالِ خوب: «سه شرطِ معرفت» — ' +
         'مثالِ بد: «در این قسمت دربارهٔ شرایط معرفت صحبت می‌کنیم».');
  L.push('• coverKicker — دو تا چهار واژه‌ی کوچک‌تر که بالای آن می‌نشیند و ' +
         'موضوع را جا می‌اندازد (مثل «معرفت‌شناسی» یا «روان‌شناسیِ رسانه»).');
  L.push('• hookLine — یک جملهٔ کوتاه که در نتیجهٔ جست‌وجو زیرِ عنوان دیده می‌شود. ' +
         'صد و پنجاه نویسهٔ اولِ کپشن مهم‌ترین بخشِ سئوست؛ همین جمله آنجاست.');
  L.push('• summary — دو تا سه بند، هرکدام دو-سه جمله. چه چیزی در این قسمت گفته ' +
         'می‌شود و شنونده بعدش چه می‌فهمد. زبانِ آدمیزاد، نه فهرستِ کلیدواژه.');
  L.push('• bullets — سه تا شش نکتهٔ کوتاه از خودِ قسمت (هرکدام یک سطر).');
  L.push('• tags — ده تا پانزده برچسبِ فارسی و در صورتِ نیاز انگلیسی؛ از عامْ به ' +
         'خاص. هرکدام دو تا چهار واژه. تکراری نه.');
  L.push('• hashtags — سه هشتگِ کوتاهِ فارسی، بی فاصله، بی علامتِ #.');
  /* ══ تصویرهای درس ══ فقط برای نمایش‌هایی که `LV_SHOWS` می‌گوید. */
  if (ytVisOn_(ctx.show) && (ctx.sections || []).length) {
    L.push('');
    L.push('و یک کارِ دومِ جدا: **تصویرهای ویدئو**.');
    var vl = ytVisPromptLines_(ctx);
    for (var vi = 0; vi < vl.length; vi++) L.push(vl[vi]);
  }

  /* ══ و کارِ سوم: ظاهرِ این درس ══ */
  if (ytVisOn_(ctx.show)) {
    var styles = [], motifs = [];
    try { styles = LV_STYLES || []; } catch (eS1) { styles = []; }
    try { motifs = lvMotifs_() || []; } catch (eS2) { motifs = []; }
    if (styles.length) {
      L.push('');
      L.push('و یک کارِ سومِ کوتاه: **ظاهرِ این درس را تو انتخاب کن** — فیلدِ ' +
             '`look`. صاحبِ برنامه این را خواست: «حسبِ نیاز و ضرورت و تشخیص، ' +
             'بدونِ وسواسِ هزینه». پس بر اساسِ موضوعِ همین مجموعه و متنِ همین ' +
             'قسمت تصمیم بگیر، نه بر اساسِ دستهٔ اداریِ آن.');
      L.push('• level — یکی از «خاموش» / «کم» / «زیاد».');
      /* در حالتِ صحنه «سطح» یعنی **ضرباهنگِ تصویر**، نه شمارِ کارت (۸.۴۷). تا ۸.۴۶
         این سه خط کارت‌ها را توصیف می‌کردند، در حالی که از ۸.۳۱ ویدئوی درس‌نامه
         صحنهٔ تمام‌قاب است — مدل دربارهٔ چیزی تصمیم می‌گرفت که ساخته نمی‌شد. */
      /* و از ۸.۴۹ «سطح» **چگالی** است، نه ثانیه: شمارِ تصویر از خودِ محتوا می‌آید
         (`lvSceneCuts_`). «هر ۲۰ ثانیه» همان عددِ هاردکدی بود که او نخواست. */
      if (ctx.sceneMode) {
        L.push('   «زیاد» = هر بار که ایده، مثال یا لحظهٔ دیدنیِ تازه‌ای می‌آید، تصویرِ تازه. ' +
               'متنی که تند پیش می‌رود: داستانی با رویدادهای پیاپی، یا درسی پرمفهوم.');
        L.push('   «کم» = تصویر فقط سرِ تغییرهای بزرگ عوض می‌شود. بحثِ آرام و پیوسته، ' +
               'یا روایتی که در یک فضا می‌مانَد.');
        L.push('   شمارِ تصویرها را تو نمی‌گویی و ثابت هم نیست: از خودِ محتوا می‌آید.');
        L.push('   «خاموش» = ویدئوی مصور نه. فقط وقتی تصویر واقعاً چیزی اضافه ' +
               'نمی‌کند. کم پیشش بیاید.');
      } else {
        L.push('   «زیاد» = برای هر کارت یک تصویرِ ساخته‌شده. درسی که مفهومِ ' +
               'تازه و تصویرپذیر دارد، یا بحثش انتزاعی است و تصویر کمکش می‌کند.');
        L.push('   «کم» = کارتِ متنی + چند تصویر در نقاطِ کلیدی. حالتِ متعارف.');
        L.push('   «خاموش» = اصلاً کارت نه. فقط وقتی تصویر واقعاً چیزی اضافه ' +
               'نمی‌کند. کم پیشش بیاید.');
      }
      L.push('• base — رنگ و فضا. دقیقاً یکی از این‌ها، با همین املا:');
      for (var sI = 0; sI < styles.length; sI++) {
        L.push('   «' + String(styles[sI].key) + '» — ' + String(styles[sI].hint || ''));
      }
      /* «داستان یا درس» را خودِ متن می‌گوید، نه دستهٔ مجموعه (۸.۴۷، ۸-ذ). */
      L.push('   **اول ببین این قسمت درس است یا داستان** — از خودِ متن، نه از دسته. ' +
             'اگر داستان، حکایت، زندگی‌نامه یا روایتِ تاریخی است، سبکی را بردار که ' +
             'برای روایت ساخته شده (کنارِ هر سبک نوشته)، نه سبکی که برای مفهوم و ' +
             'نمودار است.');
      L.push('• motif — نقش و قاب که **روی** آن رنگ می‌نشیند. یکی از این‌ها، ' +
             'یا خالی اگر کارتِ ساده بهتر است:');
      for (var mI = 0; mI < motifs.length; mI++) {
        L.push('   «' + String(motifs[mI].key) + '» — ' + String(motifs[mI].what || ''));
      }
      L.push('   نقشی که از خودِ `base` بیاید همان کارِ `base` را می‌کند، پس ' +
             'نقش را وقتی بده که واقعاً چیزِ دیگری اضافه کند.');
      L.push('• why — یک جملهٔ کوتاهِ فارسی: چرا این سه. این جمله خوانده ' +
             'می‌شود، پس «مناسب است» ننویس؛ بگو چه چیزی در این درس این را ' +
             'می‌خواهد.');
      L.push('و یک مرز: اگر صاحبِ برنامه برای این مجموعه سبک یا سطحی را ' +
             'خودش نوشته باشد، انتخابِ تو نادیده گرفته می‌شود و این درست ' +
             'است. پس بی‌محابا بهترین انتخابت را بنویس.');
    }
  }

  L.push('');
  L.push('چه هرگز ننویس: هیچ نشانی یا لینکی از گوگل‌درایو، هیچ شناسهٔ فایل، ' +
         'هیچ ایمیل، هیچ نامِ فایل یا تبِ داخلی، و هیچ اشاره‌ای به اینکه این متن ' +
         'را ماشین ساخته. کانال عمومی است.');
  L.push('همه‌چیز فارسی، بی اغراق، و بی وعده‌ای که خودِ قسمت به آن عمل نکرده باشد.');
  return L.join('\n');
}

function ytMetaModel_(ctx) {
  try {
    var r = geminiText_(ytMetaPrompt_(ctx), YT_META_SCHEMA,
                        Math.max(4096, Number(CFG.YT_META_TOKENS) || 16384), { exact: true });
    if (r && r.title) return r;
  } catch (e) { logLine_('متنِ یوتیوب از مدل نیامد: ' + e.message); }
  return null;
}

/* ═══════════ قراردادِ تصویر: پرامپت، schema و مصرف‌کننده یک زبان (۸.۲۶) ═══════════
 *
 * ۱ و ۲ اکتبر، درس‌های ۵۷ و ۵۸: موتور برای هر کدام **چهارده** تصویر خواست و
 * مدل **یکی** داد — آن هم خالی. ویدئو شد پانزده دقیقه یک قابِ ثابت.
 *
 * ۸.۱۱ این را شمرد و نام برد (`dropped.raw: 1`)، ولی علتش را نگفت، و علت یک
 * جمله است: **از ۸.۰۱ پرامپت و schema دو زبانِ جدا حرف می‌زدند.** ۸.۰۱
 * فیلدهای schema را عوض کرد (`quote`, `form`, `headline`, …) و پرامپت هنوز
 * `kind`, `cardTitle`, `cardLines` می‌خواست — نام‌هایی که در schema **نیستند**.
 * مدلِ ساختاریافته فقط می‌تواند فیلدهای schema را بنویسد؛ پس از هر چه
 * خواسته شده بود هیچ‌چیز نوشتنی نبود، و از هر چه نوشتنی بود هیچ‌چیز
 * خواسته نشده بود. نتیجه یک شیءِ تقریباً خالی است — دقیقاً همان که آمد.
 *
 * و یک لایه زیرتر: `quote` «عبارتی **عیناً** از روایت» است، و متنِ روایت
 * هرگز به این فراخوان داده نمی‌شد — فقط سرِ بخش‌ها و آغاز و خلاصه. هیچ
 * مدلی جمله‌ای را عیناً نقل نمی‌کند که ندیده.
 *
 * چرا هیچ سنجه‌ای سرخ نشد: بدَلِ مدل در `run_youtube_test.js` همان فیلدهای
 * قدیمی را برمی‌گرداند — چیزی که مدلِ واقعی **نمی‌تواند** برگرداند. بدَلی
 * که از تولید آزادتر است هیچ چیزی را ثابت نمی‌کند (۷٫۲۴). حالا بدَل از روی
 * همان schemaی که فرستاده شده صافی می‌شود.
 *
 * `ytVisPromptLines_` تنها جایی است که این قرارداد به زبانِ آدم نوشته
 * می‌شود، و هم فراخوانِ اصلی و هم فراخوانِ «فقط تصویر» از آن می‌خوانند —
 * دو متن برای یک قرارداد یعنی روزی یکی کهنه می‌شود، که همین بار شد. */

/** کفِ «نحیف» — یک تعریف، برای `lvBuild_` و برای پرسشِ دوباره. */
function ytVisFloor_(asked) {
  return Math.max(1, Math.ceil((Number(asked) || 0) * (Number(CFG.LV_THIN_PCT) || 0.5)));
}

/** سقفِ موردهای یک بخش: یک‌ونیم برابرِ سهمش، و هرگز کمتر از سه. */
function ytVisSecCap_(share) {
  return Math.max(3, Math.ceil((Number(share) || 1) * 1.5));
}

/** سهمِ نویسه‌ایِ هر بخش ⇒ چند تصویر. همان مبنای `ytVisPlan_` و `ytChapters_`. */
function ytVisShares_(secs, want) {
  var chars = [], sum = 0, out = [];
  for (var i = 0; i < (secs || []).length; i++) {
    var n = String((secs[i] && (secs[i].narration || secs[i].text)) || '').length;
    chars.push(n); sum += n;
  }
  for (var j = 0; j < chars.length; j++) {
    out.push(sum ? Math.max(1, Math.round((Number(want) || 0) * chars[j] / sum)) : 1);
  }
  return out;
}

/**
 * متنِ بخش‌ها برای برداشتنِ `quote`. اگر بلندتر از سقف باشد، **هر بخش به
 * نسبتِ سهمش** کوتاه می‌شود، نه از ته — بریدنِ از ته یعنی بخش‌های آخر هیچ
 * عبارتی برای نقل نداشته باشند و همهٔ تصویرها در نیمهٔ اولِ درس جمع شوند.
 */
function ytVisNarr_(secs) {
  var max = Math.max(2000, Number(CFG.YT_VIS_NARR_MAX) || 24000);
  var txt = [], sum = 0;
  for (var i = 0; i < (secs || []).length; i++) {
    var t = String((secs[i] && (secs[i].narration || secs[i].text)) || '')
      .replace(/\s+/g, ' ').trim();
    txt.push(t); sum += t.length;
  }
  var out = [];
  for (var j = 0; j < txt.length; j++) {
    var t2 = txt[j];
    if (sum > max) {
      var cap = Math.max(300, Math.floor(max * txt[j].length / sum));
      if (t2.length > cap) {
        var cut = t2.slice(0, cap), sp = cut.lastIndexOf(' ');
        t2 = (sp > cap * 0.7 ? cut.slice(0, sp) : cut) + ' …';
      }
    }
    out.push(t2);
  }
  return out;
}

/** قراردادِ تصویر به زبانِ مدل. **نام‌ها همان نام‌های `YT_META_SCHEMA` اند** —
 *  `run_youtube_test.js` ۶۸.۱ هر نامی را که این‌جا بیاید در schema می‌جوید. */
function ytVisPromptLines_(ctx, opt) {
  var L = [];
  var secs = (ctx && ctx.sections) || [];
  var want = ytVisWant_(ctx && ctx.totalSec);
  var each = Math.round((Math.max(60, Number(ctx && ctx.totalSec) || 0)) / Math.max(1, want));
  var shares = ytVisShares_(secs, want);
  /* ══ پرسشِ یک‌بخشی (۸.۳۰) ══ همان قرارداد، همان متن — فقط یک بخش و عددِ
     خودش. شمارهٔ بخش همان شمارهٔ واقعی است، نه «۱»، تا جوابش بی ترجمه سرِ
     جایش بنشیند. */
  var only = opt && opt.only ? Number(opt.only) : 0;
  if (only) {
    want = Math.max(1, Number(opt.want) || 1);
    var one = [];
    for (var o1 = 0; o1 < secs.length; o1++) one.push(o1 + 1 === only ? want : 0);
    shares = one;
  }
  L.push('این ویدئو در یوتیوب به‌جای یک کاورِ ثابت، رشته‌ای از کارت‌های تصویری دارد ' +
         'که هر کدام **درست همان لحظه‌ای** روی صفحه می‌آید که جمله‌اش گفته می‌شود. ' +
         'هر کارت «تصویرِ این مفهوم» است — شکلِ رابطه با چند واژهٔ کوتاه — نه همان ' +
         'جمله‌های گوینده به شکلی دیگر.');
  L.push('**دقیقاً ' + faDigitsOut_(String(want)) + ' مورد** در فیلدِ `visuals` بنویس، ' +
         'نه کمتر. هر کارت حدودِ ' + faDigitsOut_(String(each)) + ' ثانیه روی صفحه ' +
         'می‌مانَد؛ کمتر نوشتن یعنی یک تصویرِ ثابت برای چند دقیقه. به ترتیبِ بخش‌ها، ' +
         'و در هر بخش به ترتیبِ گفتار.');
  L.push(only ? 'فقط همین بخش (`at` همیشه «' + only + '»):' : 'سهمِ هر بخش (از روی طولِ متنش):');
  for (var i = 0; i < secs.length; i++) {
    if (only && i + 1 !== only) continue;
    L.push('  ' + (i + 1) + ') «' + String((secs[i] && secs[i].heading) || '') + '» — حدودِ ' +
           faDigitsOut_(String(shares[i] || 1)) + ' مورد');
  }
  L.push('برای هر مورد این فیلدها — **نام‌ها دقیقاً همین‌ها**:');
  L.push('• at — شمارهٔ بخش، به رقمِ لاتین («1»، «2»، …).');
  L.push('• quote — **مهم‌ترین فیلد.** چهار تا نُه واژهٔ پشتِ‌هم که **عیناً** از متنِ ' +
         'همان بخش (پایین‌تر آمده) برداشته شده‌اند: همان واژه‌ها، همان ترتیب، بی ' +
         'بازنویسی و بی خلاصه‌کردن. کد با همین عبارت پیدا می‌کند تصویر در کدام ثانیه ' +
         'بیاید؛ عبارتی که در متن نباشد، آن تصویر را حذف می‌کند. عبارتِ یکتا بردار، ' +
         'نه تکه‌ای که در بخش چند بار تکرار شده.');
  L.push('• form — یکی از این پنج، با همین املا. و **تنوع بده**: پنج کارتِ پشتِ‌هم ' +
         'با یک شکل خسته‌کننده است.');
  L.push('   «مقایسه» — دو چیزِ رودررو: دو دیدگاه، دو مفهوم، پیش و پس.');
  L.push('   «زنجیره» — گام‌ها یا استدلالِ پشتِ‌هم: اگر الف، پس ب، پس ج.');
  L.push('   «تمرکز» — یک مفهومِ مرکزی و چند اصطلاحِ دورش.');
  L.push('   «نقل» — یک جملهٔ کلیدی که باید دیده شود: تعریف، نقل‌قول.');
  L.push('   «پرسش» — پرسشی که درس طرح می‌کند.');
  L.push('• headline — متنِ درشتِ کارت. **همیشه پر**؛ حداکثر هفت واژه و ' +
         faDigitsOut_(String(CFG.LV_CARD_TITLE_MAX || 48)) + ' نویسه. در یک نگاه خوانده شود.');
  L.push('• kicker — برچسبِ کوچکِ گوشه، دو تا پنج واژه (مثلاً موضوعِ همان بخش).');
  L.push('• note — یک جملهٔ کوتاه زیرِ کارت. اختیاری.');
  L.push('• icon — یکی از: مثلث، خوشه، ذهن، گوش، زنجیر، برچسب، برگه، پرسش — یا خالی.');
  L.push('• برای «مقایسه»: aTitle و bTitle (سرِ دو ستون، هر کدام یک تا سه واژه — ' +
         '**هر دو لازم‌اند**)، aItems و bItems (هر کدام دو تا سه بندِ حداکثر چهارواژه‌ای)، ' +
         'و اگر خواستی aIcon و bIcon از همان فهرستِ نشانه‌ها.');
  L.push('• برای «زنجیره»: steps — دو تا سه گامِ کوتاه (**دست‌کم دو**).');
  L.push('• برای «تمرکز»: items — دو تا سه اصطلاحِ کوتاه.');
  L.push('• caption — یک جملهٔ کوتاهِ فارسی که زیرِ همین تصویر در **جزوه** می‌نشیند. ' +
         'حداکثر ' + faDigitsOut_(String(CFG.LV_CAPTION_MAX || 120)) + ' نویسه.');
  L.push('• terms — خالی بگذار، مگر برای چیزی که **واقعاً وجود دارد** (یک شخص، یک جا، ' +
         'یک سند) و عکسش چیزی اضافه می‌کند؛ آن‌وقت دو تا پنج واژهٔ جست‌وجو **به انگلیسی** (منبع‌های تصویرِ آزاد انگلیسی‌نمایه‌اند).');
  L.push('و یک مرز: تصویری نخواه برای چیزی که خودِ قسمت نگفته است. تصویرِ بی‌ربط از ' +
         'نبودنِ تصویر بدتر است.');
  L.push('');
  L.push('متنِ گفتاریِ بخش‌ها — `quote` را **فقط از همین‌جا** بردار:');
  var nar = ytVisNarr_(secs);
  for (var j = 0; j < nar.length; j++) {
    if (only && j + 1 !== only) continue;
    L.push('[بخش ' + (j + 1) + '] ' + String((secs[j] && secs[j].heading) || ''));
    /* یک بخش هرگز بریده نمی‌شود: کوتاه‌کردنِ متناسب برای جا دادنِ همهٔ بخش‌ها
       در یک فراخوان بود، و این فراخوان فقط یکی دارد. */
    L.push(only ? String((secs[j] && (secs[j].narration || secs[j].text)) || '').replace(/\s+/g, ' ').trim()
                : nar[j]);
  }
  return L;
}

/**
 * ══ بخش‌به‌بخش، وقتی کلِ درس در یک فراخوان کم آمد (۸.۳۰) ══
 *
 * درسِ ۵۹: فراخوانِ اصلی سه مورد داد — دقیقاً سهمِ بخشِ یک — و پرسشِ دوبارهٔ
 * «فقط تصویر» یکی. هر دو یک پرسشِ بزرگ بودند: شش بخش، بیست‌وچهار هزار نویسه،
 * دوازده مورد. پرسشِ کوچک — یک بخش، متنِ کاملش، دو سه مورد — همان چیزی است
 * که مدل با آن خوب کار می‌کند. پس پیش از آنکه کد از روایت کارتِ «نقل» بسازد،
 * هر بخشِ کم‌مانده یک بار جدا پرسیده می‌شود: کارتِ طراحی‌شده (مقایسه،
 * زنجیره) از کارتِ نقل حرفه‌ای‌تر است.
 *
 * یک بار برای هر بخش در عمرِ نقشه (`plan.visSec`)، **پیش از کار ثبت**، با
 * سقفِ `LV_VIS_SEC_ASK_MAX` فراخوان؛ و `at` جواب همیشه همان بخش است، هر چه
 * مدل نوشته باشد — پرسیده شد «فقط بخشِ N».
 * @return {number} چند مورد افزوده شد
 */
function ytVisSecAsk_(folder, plan, ctx) {
  if (!plan || !ytVisOn_(ctx && ctx.show)) return 0;
  var secs = (ctx && ctx.sections) || [];
  if (!secs.length) return 0;
  var lim = Number(CFG.LV_VIS_SEC_ASK_MAX);
  if (!isFinite(lim)) lim = 8;
  if (lim <= 0) return 0;
  var asked = ytVisWant_(ctx.totalSec);
  var shares = ytVisShares_(secs, asked);
  var vis = plan.visuals || [];
  var have = [];
  for (var s0 = 0; s0 < secs.length; s0++) have.push(0);
  for (var v = 0; v < vis.length; v++) {
    var at0 = Number(vis[v] && vis[v].at) || 0;
    if (at0 >= 1 && at0 <= secs.length && !(vis[v] && vis[v].auto)) have[at0 - 1]++;
  }
  var done = plan.visSec = plan.visSec || {};
  var todo = [];
  for (var s1 = 0; s1 < secs.length; s1++) {
    var txt = String((secs[s1] && (secs[s1].narration || secs[s1].text)) || '');
    if (!txt) continue;
    var gap = shares[s1] - have[s1];
    if (gap > 0 && !done[String(s1 + 1)]) todo.push({ s: s1 + 1, gap: gap });
  }
  if (!todo.length) return 0;
  todo = todo.slice(0, lim);
  for (var t0 = 0; t0 < todo.length; t0++) done[String(todo[t0].s)] = { asked: todo[t0].gap, got: 0, at: nowStr_() };
  if (folder) ytPlanWrite_(folder, plan);              // پیش از کار
  var added = [], late = 0;
  for (var t = 0; t < todo.length; t++) {
    /* مهلتِ این دور پیش از **هر** پرسش (۸.۳۴): بخشی که وقتش نرسید «پرسیده‌شده»
       ثبت نمی‌ماند، تا دورِ بعد بپرسدش — نه اینکه برای همیشه کنار برود. */
    if (!ytVisTimeOk_()) {
      for (var tl = t; tl < todo.length; tl++) delete done[String(todo[tl].s)];
      late = todo.length - t;
      break;
    }
    var raw = null;
    try {
      var L = [];
      L.push('تو طراحِ تصویرهای ویدئوی یک پادکستِ آموزشیِ فارسی هستی.');
      L.push('برنامه: «' + String((ctx && ctx.showName) || '') + '»' +
             (ctx && ctx.seriesName ? ' — مجموعه: «' + ctx.seriesName + '»' : ''));
      L.push('عنوانِ قسمت: ' + String((ctx && ctx.title) || ''));
      L.push('');
      var vl = ytVisPromptLines_(ctx, { only: todo[t].s, want: todo[t].gap });
      for (var k = 0; k < vl.length; k++) L.push(vl[k]);
      var schema = { type: 'object', properties: { visuals: YT_META_SCHEMA.properties.visuals },
                     required: ['visuals'] };
      /* یک بخش، دو سه مورد: چند صد توکن. سقفِ کوچک و دقیق یعنی جوابِ افسارگسیخته
         چند ثانیه می‌خورد نه یک دقیقه (۸.۳۴). */
      var r = geminiText_(L.join('\n'), schema, Math.max(2048, Number(CFG.YT_VIS_SEC_TOKENS) || 6144),
                          { exact: true });
      if (r && Array.isArray(r.visuals)) raw = r.visuals;
    } catch (eS) { logLine_('پرسشِ تصویرِ بخشِ ' + todo[t].s + ' نشد: ' + eS.message); }
    var got = 0;
    for (var q = 0; raw && q < raw.length && got < todo[t].gap; q++) {
      var it = ytVisItem_(raw[q] || {}, todo[t].s);
      if (!it.headline) continue;
      it.secAsk = true;
      added.push(it); got++;
    }
    done[String(todo[t].s)].got = got;
  }
  if (added.length) {
    /* ترتیب و زمان را همان `ytVisFill_` می‌سازد — یک تعریف برای «سهمِ هر بخش». */
    var merged = vis.concat(added);
    var st = {};
    var cap = Math.max(1, Number(CFG.LV_MAX_PER_EP) || 40);
    plan.visuals = ytVisFill_(merged, ctx, st, { noAuto: true }).slice(0, cap);
  }
  logLine_('تصویرهای قسمتِ ' + String((ctx && ctx.epRaw) || '') + ': ' + (todo.length - late) +
           ' بخشِ کم‌مانده جدا پرسیده شد ⇒ ' + added.length + ' مورد.' +
           (late ? ' ' + late + ' بخش ماند برای دورِ بعد — وقتِ این دور کافی نبود.' : ''));
  if (folder) ytPlanWrite_(folder, plan);
  return added.length;
}

/**
 * پرسشِ دوباره، **فقط تصویر** — وقتی نقشه نحیف درآمد.
 *
 * فراخوانِ اصلی همه‌چیز را با هم می‌نویسد: عنوان، خلاصه، برچسب، ظاهر و
 * تصویرها. اگر تصویرها کم آمد، تکرارِ همان فراخوان عنوانِ خوبِ امروز را هم
 * عوض می‌کند؛ این یکی فقط همان را می‌پرسد که کم است.
 * `null` یعنی نشد — و آن‌وقت همان نقشهٔ قبلی می‌مانَد، نه یک نقشهٔ خالی.
 */
function ytVisAsk_(ctx) {
  try {
    var L = [];
    L.push('تو طراحِ تصویرهای ویدئوی یک پادکستِ آموزشیِ فارسی هستی.');
    L.push('برنامه: «' + String((ctx && ctx.showName) || '') + '»' +
           (ctx && ctx.seriesName ? ' — مجموعه: «' + ctx.seriesName + '»' : ''));
    L.push('عنوانِ قسمت: ' + String((ctx && ctx.title) || ''));
    L.push('مدت: ' + String((ctx && ctx.duration) || ''));
    L.push('');
    var vl = ytVisPromptLines_(ctx);
    for (var i = 0; i < vl.length; i++) L.push(vl[i]);
    var schema = { type: 'object',
                   properties: { visuals: YT_META_SCHEMA.properties.visuals },
                   required: ['visuals'] };
    var r = geminiText_(L.join('\n'), schema, Math.max(4096, Number(CFG.YT_VIS_TOKENS) || 8192),
                        { exact: true });
    if (r && Array.isArray(r.visuals)) return r.visuals;
  } catch (e) { logLine_('پرسشِ دوبارهٔ تصویرها نشد: ' + e.message); }
  return null;
}

/** عنوان: سقفِ یوتیوب در کد بریده می‌شود، نه در امیدِ به مدل. */
function ytTitleBuild_(meta, ctx) {
  var max = Math.max(20, Number(CFG.YT_TITLE_MAX) || 100);
  var t = ytScrub_(String((meta && meta.title) || ctx.title || '')).trim();
  if (!t) t = String(ctx.title || ctx.showName || 'قسمت');
  // بریدن سرِ واژه، نه وسطِ واژه — عنوانی که وسطِ کلمه قطع شود بی‌دقت به‌نظر می‌آید
  if (t.length > max) {
    var cut = t.slice(0, max);
    var sp = cut.lastIndexOf(' ');
    t = (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim();
  }
  return t;
}

/**
 * برچسب‌ها: سقفِ یوتیوب روی *مجموع* نویسه‌هاست (۵۰۰)، نه روی تعداد — و همین
 * است که معمولاً از قلم می‌افتد و کلِ فراخوان را رد می‌کند.
 */
function ytTags_(meta, ctx) {
  var raw = (meta && meta.tags) || [];
  var seen = Object.create(null), out = [], used = 0;
  var cap = Math.max(100, Number(CFG.YT_TAGS_CHARS) || 460);
  var base = [ctx.showName];
  if (ctx.seriesName) base.push(ctx.seriesName);
  if (ctx.cat) base.push(ctx.cat);
  var all = base.concat(raw);
  for (var i = 0; i < all.length; i++) {
    var t = ytScrub_(String(all[i] || '')).replace(/[«»",]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 60) continue;
    var k = t.toLowerCase();
    if (seen[k]) continue;
    if (used + t.length + 1 > cap) break;
    seen[k] = 1; out.push(t); used += t.length + 1;
  }
  return out;
}

/**
 * کپشن. ساختارش عمدی است و از بالا به پایین ارزشِ سئویی کم می‌شود:
 * جملهٔ قلاب (همان چیزی که در نتیجهٔ جست‌وجو دیده می‌شود) → خلاصه → نکته‌ها →
 * فصل‌بندی → منابعِ وب → دربارهٔ برنامه → هشتگ.
 *
 * منابع می‌مانند و لینکِ درایو نه: منبعِ وب اعتبارِ عمومی است و برای بیننده
 * ارزش دارد؛ لینکِ درایو خصوصیِ صاحبِ برنامه است. این تفکیک خواستهٔ صریحِ
 * او بود، و `ytScrub_` هم مستقل از این تابع دوباره اعمالش می‌کند.
 */
function ytDescBuild_(meta, ctx, chapters) {
  var L = [];
  var hook = ytScrub_(String((meta && meta.hookLine) || '')).trim();
  if (hook) { L.push(hook); L.push(''); }

  var sum = ytScrub_(String((meta && meta.summary) || '')).trim();
  if (sum) { L.push(sum); L.push(''); }

  var bl = (meta && meta.bullets) || [];
  if (bl.length) {
    L.push('در این قسمت:');
    for (var b = 0; b < bl.length && b < 8; b++) {
      var one = ytScrub_(String(bl[b] || '')).replace(/^[-•*\s]+/, '').trim();
      if (one) L.push('• ' + one);
    }
    L.push('');
  }

  if ((chapters || []).length) {
    L.push('فصل‌ها:');
    for (var c = 0; c < chapters.length; c++) {
      L.push(ytTime_(chapters[c].at) + ' ' + ytScrub_(String(chapters[c].title || '')).trim());
    }
    L.push('');
  }

  /* گویندگان و سهمِ زمانی‌شان — خواستهٔ صریحِ صاحبِ برنامه، تا بتواند بعداً
     قابلیتِ هر صدا را بسنجد. از همان مدلِ زمانیِ فصل‌ها می‌آید، پس این دو
     هرگز با هم اختلاف نمی‌گویند. */
  var cl = (ctx && ctx.castLines) || [];
  if (cl.length) {
    L.push('گویندگانِ این قسمت:');
    for (var v = 0; v < cl.length; v++) L.push(ytScrub_(String(cl[v])));
    L.push('');
  }

  // منابعِ وب — نه لینکِ درایو. عنوان و ناشر هم می‌آید، چون لینکِ تنها در
  // کپشن چیزی به بیننده نمی‌گوید.
  var src = ctx.sources || [];
  var shown = 0;
  for (var s = 0; s < src.length && shown < 8; s++) {
    var u = String((src[s] && src[s].url) || '');
    if (!/^https?:\/\//i.test(u)) continue;
    if (/drive\.google\.com|docs\.google\.com|script\.google\.com/i.test(u)) continue;
    if (!shown) L.push('منابعِ بیرونیِ این قسمت:');
    var ttl = ytScrub_(String(src[s].title || '')).trim();
    var pub = ytScrub_(String(src[s].publisher || '')).trim();
    L.push('• ' + (ttl || pub || u) + (pub && ttl ? ' — ' + pub : '') + '\n  ' + u);
    shown++;
  }
  if (shown) L.push('');

  L.push('دربارهٔ «' + ctx.showName + '»');
  if (ctx.tagline) L.push(ctx.tagline);
  if (ctx.seriesName) {
    L.push('این قسمت بخشی از مجموعهٔ «' + ctx.seriesName + '» است؛ ' +
           'ترتیبِ درست را در پلی‌لیستِ همین مجموعه دنبال کنید.');
  }

  var hs = (meta && meta.hashtags) || [];
  var tagLine = [];
  for (var h = 0; h < hs.length && tagLine.length < 3; h++) {
    var x = ytScrub_(String(hs[h] || '')).replace(/[#\s]/g, '');
    if (x) tagLine.push('#' + x);
  }
  if (tagLine.length) { L.push(''); L.push(tagLine.join(' ')); }

  var body = ytScrub_(L.join('\n'));
  var max = Math.max(500, Number(CFG.YT_DESC_MAX) || 5000);
  return body.length > max ? body.slice(0, max - 1).replace(/\s+\S*$/, '') : body;
}

/* ───────────────────────── ۵) کاور ─────────────────────────
 *
 * صاحبِ برنامه گزینهٔ «کارتِ طراحی‌شدهٔ خودِ موتور» را انتخاب کرد، و دلیلش هم
 * روشن است: کانال قرار است درآمدزا شود، و عکسِ برداشته‌شده از اینترنت — حتی
 * «آزاد» — یک ریسکِ مجوز است که باید تک‌تک وارسی شود. کارتی که خودمان
 * می‌سازیم صفر ریسک دارد، همیشه کار می‌کند، و هر قسمت خودکار تازه می‌شود.
 *
 * ساختش با Slides است چون Apps Script هیچ راهِ دیگری برای ساختنِ تصویر ندارد:
 * یک اسلایدِ ۱۶:۹ می‌سازیم، شکل و متن رویش می‌گذاریم، و از راهِ export/png
 * تصویرش را می‌گیریم. فایلِ اسلاید پاک نمی‌شود — در زیرپوشهٔ «کاورهای یوتیوب»
 * می‌ماند تا اگر کاوری بد درآمد، بشود دید چه بوده.
 */
/**
 * یک اسلاید → یک PNG. تنها راهِ رستر کردنِ تصویر در Apps Script.
 * مشترکِ کاورِ قسمت، کاورِ پلی‌لیست و بنرِ کانال — سه جا، یک تعریف.
 */
/**
 * ══ ۹۶۰×۵۴۰ به‌جای ۱۲۸۰×۷۲۰ — و موتور خودش هر روز می‌گفتش (۸٫۱۲) ══
 *
 * در لاگِ ۱ اکتبر، دو بار، با همین واژه‌ها:
 *   «`presentations.create` اندازهٔ درخواستی را نادیده گرفت — صفحه با
 *    5143500×9144000 ساخته شد، نه 6858000×12192000 EMU»
 *   «۹۶۰×۵۴۰ درآمد، نه ۱۲۸۰×۷۲۰ — یوتیوب می‌پذیردش ولی متن نرم می‌شود»
 *
 * یک **محدودیتِ شناخته‌شدهٔ Slides API** است و درست تشخیص داده شده بود — و
 * بعد با جملهٔ «نه خطای این اجرا» کنار گذاشته شد. یعنی باز هم همان شکل:
 * اندازه‌گیری درست، نوشته‌شده، و به هیچ تصمیمی وصل نشده. هر کاور و هر کارتِ
 * این موتور از روزِ اول نرم بوده.
 *
 * **و راهش ساختنِ اسلاید نیست، گرفتنِ تصویر است.** `export/png` همیشه به
 * اندازهٔ **صفحه** می‌دهد، پس تا وقتی صفحه ۹۶۰×۵۴۰ است هیچ کاری نمی‌شود
 * کرد. ولی نقطهٔ `pages/{id}/thumbnail` اندازه‌اش را از صفحه نمی‌گیرد:
 * `thumbnailSize=LARGE` حدودِ ۱۶۰۰ نقطه عرض می‌دهد — بالاتر از سقفِ
 * ۱۲۸۰×۷۲۰ِ یوتیوب، و تیز.
 *
 * و سقوطش به سمتِ **داشتن** است نه نداشتن: اگر thumbnail نشد، همان
 * `export/png`ِ قدیمی می‌رود. کاورِ نرم از کاورِ نداشته بهتر است — همان
 * قاعده‌ای که این پرونده دربارهٔ `srchReadRows_` نوشت.
 */
function ytSlideExport_(presId, pageId, name) {
  var b = null;
  try { b = ytSlideThumb_(presId, pageId, name); } catch (eT) { b = null; }
  if (b) return b;
  return ytSlideExportRaw_(presId, pageId, name);
}

/** تصویرِ بزرگ از نقطهٔ thumbnailِ Slides — اندازه‌اش به صفحه بند نیست. */
function ytSlideThumb_(presId, pageId, name) {
  var url = 'https://slides.googleapis.com/v1/presentations/' +
            encodeURIComponent(presId) + '/pages/' + encodeURIComponent(pageId) +
            '/thumbnail?thumbnailProperties.mimeType=PNG' +
            '&thumbnailProperties.thumbnailSize=LARGE';
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  /* ══ این خط سد نیست، میان‌بُر است — و گفته می‌شود (۷٫۷۱) ══
     برداشتنش هیچ سنجه‌ای را سرخ نکرد، و درست هم بود: سدِ واقعی دو خط
     پایین‌تر است («`contentUrl` هست یا نه»)، چون بدنهٔ خطا یا پارس نمی‌شود
     یا `contentUrl` ندارد. این فقط از پارس‌کردنِ یک بدنهٔ خطا جلوگیری
     می‌کند. خطی که شبیهِ سد باشد و نباشد، خوانندهٔ بعدی را گمراه می‌کند. */
  if (res.getResponseCode() !== 200) return null;
  var j = null;
  try { j = JSON.parse(res.getContentText()); } catch (eJ) { return null; }
  /* ══ و **این** سد است: «۲۰۰ گرفتم» یعنی «درست بود» نیست ══
     درایو برای فایلِ اشتراک‌نشده یک صفحهٔ HTML با کدِ ۲۰۰ می‌دهد (۷٫۳۳)، و
     اینجا هم جوابِ بی `contentUrl` ممکن است. ۶۴.۳ همین را می‌سنجد. */
  var link = String((j && j.contentUrl) || '');
  if (!link) return null;
  var img = UrlFetchApp.fetch(link, { muteHttpExceptions: true });
  if (img.getResponseCode() !== 200) return null;
  return img.getBlob().setName(name);
}

function ytSlideExportRaw_(presId, pageId, name) {
  var url = 'https://docs.google.com/presentation/d/' + encodeURIComponent(presId) +
            '/export/png?id=' + encodeURIComponent(presId) +
            '&pageid=' + encodeURIComponent(pageId);
  try {
    var res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      logLine_('خروجیِ PNG نشد (کدِ ' + res.getResponseCode() + ') برای «' + name + '».');
      return null;
    }
    return res.getBlob().setName(name);
  } catch (e) {
    logLine_('خروجیِ PNG نشد: ' + e.message);
    return null;
  }
}

/**
 * ابعادِ واقعیِ یک PNG، از سرآیندِ خودش (IHDR).
 *
 * ══ چرا لازم است ══
 * یوتیوب برای بنر دست‌کم ۲۰۴۸×۱۱۵۲ می‌خواهد و اگر کوچک‌تر بفرستی ردش می‌کند.
 * ولی خروجیِ PNGِ گوگل اسلاید اندازه‌اش را از پیش اعلام نمی‌کند. حدس‌زدن
 * یعنی هر شب یک آپلودِ ردشده و یک خطای بی‌توضیح. دوازده بایتِ اولِ فایل
 * جواب را دقیق می‌دهد، پس می‌پرسیم — و اگر کوچک بود، اصلاً نمی‌فرستیم و
 * علتش را می‌نویسیم.
 */
function ytPngSize_(blob) {
  try {
    var b = blob.getBytes();
    if (b.length < 24) return null;
    var u = function (i) { return b[i] & 0xFF; };          // بایت‌ها در Apps Script علامت‌دارند
    var w = (u(16) << 24) | (u(17) << 16) | (u(18) << 8) | u(19);
    var h = (u(20) << 24) | (u(21) << 16) | (u(22) << 8) | u(23);
    if (!(w > 0 && h > 0)) return null;
    return { w: w, h: h };
  } catch (e) { return null; }
}

/** نامِ ثابتِ کاورِ هر قسمت — پلِ میانِ «ساختن» و «دوباره پیدا کردن». */
function ytCoverName_(c) {
  /* کاورِ مربع نامِ جدا دارد، وگرنه کاورِ ۱۶:۹ی همان مجموعه از حافظه
     برداشته می‌شود و پادکست باز هم کاورِ غلط می‌گیرد — یک اشتباهِ بی‌صدا. */
  /* سبک در نام است (۷.۹۹): وگرنه با عوض‌شدنِ سبکِ مجموعه، کاورِ کهنه از
     حافظه برداشته می‌شود و کانال یک کاورِ سبکِ قبلی را نشان می‌دهد در حالی
     که کارت‌هایش سبکِ تازه دارند. همان درسِ ۷.۸۶: چیزی که یک پارامتر را
     نشان می‌دهد، باید آن پارامتر در شناسه‌اش باشد. */
  return 'کاور — ' + String(c.epLabel || '') + ' — ' + String(c.showName || '') +
         (c.style ? ' — ' + String(c.style) : '') +
         (c.square ? ' — مربع' : '') + '.png';
}

/** کاوری که قبلاً ساخته شده، اگر هست. */
function ytCoverCached_(c) {
  try {
    var it = ytCoverFolder_().getFilesByName(ytCoverName_(c));
    if (!it.hasNext()) return null;
    var f = it.next();
    return { blob: f.getBlob(), fileId: f.getId(), cached: true };
  } catch (e) { return null; }
}

var YT_PALETTE = [
  { bg: '#0F172A', fg: '#F8FAFC', ac: '#38BDF8' },   // سرمه‌ای
  { bg: '#1E1B4B', fg: '#EEF2FF', ac: '#A78BFA' },   // بنفشِ عمیق
  { bg: '#052E16', fg: '#ECFDF5', ac: '#4ADE80' },   // سبزِ جنگلی
  { bg: '#431407', fg: '#FFF7ED', ac: '#FB923C' },   // خاکیِ گرم
  { bg: '#4C0519', fg: '#FFF1F2', ac: '#FB7185' },   // زرشکی
  { bg: '#083344', fg: '#ECFEFF', ac: '#22D3EE' }    // فیروزه‌ای
];

/** رنگ از روی نامِ دسته، نه تصادفی: یک دسته همیشه یک رنگ، پس کانال شکل می‌گیرد. */
function ytPalette_(key) {
  var s = String(key || ''), h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return YT_PALETTE[h % YT_PALETTE.length];
}

function ytCoverFolder_() {
  var root = outFolder_();
  var nm = CFG.YT_COVER_FOLDER || 'کاورهای یوتیوب';
  var it = root.getFoldersByName(nm);
  return it.hasNext() ? it.next() : root.createFolder(nm);
}

/**
 * کارتِ ۱۶:۹. برمی‌گرداند {blob, fileId} یا null.
 * @param {{title, showName, seriesName, epLabel, cat}} c
 */
/**
 * یک ارائهٔ تازه — با تلاش برای **اندازهٔ صفحهٔ دقیق**، ولی بدونِ اعتمادِ کور.
 *
 * ══ ۷٫۰۲: «موفق شد» با «دقیق شد» یکی نیست ══
 * تا این نسخه، ۲۰۰‌ی بازگشتی + یک `presentationId` کافی بود تا `exact:true`
 * ثبت شود — و بنر و کاور، شبی که موفق «ادعا» می‌شد، بی هیچ وارسی روی همان
 * صفحه ساخته می‌شدند. ولی مستنداتِ خودِ گوگل صریح است: «other fields in the
 * request, including any provided content, are ignored» — یعنی
 * `presentations.create` مقدارِ `pageSize` را می‌گیرد و **دور می‌ریزد**؛
 * ارائه همیشه با اندازهٔ پیش‌فرضِ ۱۰×۵٫۶۳ اینچ (۹۶۰×۵۴۰ در ۹۶dpi) ساخته
 * می‌شود، صرفِ‌نظر از آنچه خواسته شده. این یک محدودیتِ ثبت‌شدهٔ خودِ پلتفرم
 * است (issuetracker.google.com/issues/119321089)، نه خطای گذرا — پس با
 * دوباره‌تلاش‌کردن یا عوض‌کردنِ اسکوپ درست نمی‌شود.
 *
 * نتیجه‌اش هفته‌ها زیرِ یک نشانهٔ گمراه‌کننده پنهان بود: بنر همیشه با
 * `exact:true` رد می‌شد، صفحه ساخته و صادر می‌شد، و فقط در انتها
 * `ytPngSize_` می‌گفت «۹۶۰×۵۴۰ — کوچک است» — انگار اندازه‌گیریِ پیکسلی چیزِ
 * تازه‌ای کشف کرده، در حالی که از همان لحظهٔ ساخت معلوم بود.
 *
 * حالا `exact` از رویِ **همان چیزی که خودِ پاسخ می‌گوید** تعیین می‌شود:
 * `presentations.create` بدنهٔ کاملِ Presentation را برمی‌گرداند، و آن بدنه
 * `pageSize`ِ واقعی را دارد — حتی وقتی ورودی نادیده گرفته شده. اگر آن با
 * درخواست نخواند، `exact:false` است، با دلیلِ روشن؛ اگر گوگل روزی این
 * محدودیت را بردارد، همین سنجه خودش دوباره `exact:true` می‌دهد — بی آنکه
 * کسی این تابع را عوض کند.
 *
 * بنر از ۶٫۵ همین کار را می‌کرد و کاور نمی‌کرد — یعنی دوباره همان «قرینه‌ای
 * که یک‌بار درست شد» که این ریپو بارها گرفتارش شده. حالا یک تعریف است و هر
 * دو از آن می‌گذرند.
 *
 * و اگر دقیق نشد، کار **نمی‌ایستد**: با اندازهٔ پیش‌فرض ساخته می‌شود و
 * `exact:false` برمی‌گردد تا هر که لازم دارد خودش تصمیم بگیرد. یک کاورِ کمی
 * نرم بهتر از هیچ کاور است؛ ولی یک بنرِ کوچک را یوتیوب اصلاً نمی‌پذیرد، و
 * آن‌جا تصمیم فرق می‌کند.
 */
function ytPresCreate_(title, wEmu, hEmu) {
  var out = { id: '', exact: false, why: '', enableUrl: '' };
  var mk = null;
  try {
    mk = ytHttp_('https://slides.googleapis.com/v1/presentations', 'post',
      JSON.stringify({ title: String(title || 'کارت'),
        pageSize: { width: { magnitude: wEmu, unit: 'EMU' },
                    height: { magnitude: hEmu, unit: 'EMU' } } }));
  } catch (e) { mk = null; }
  if (mk && mk.code === 200 && mk.json && mk.json.presentationId) {
    out.id = mk.json.presentationId;
    var ps = mk.json.pageSize;
    var gotW = ps && ps.width && Number(ps.width.magnitude);
    var gotH = ps && ps.height && Number(ps.height.magnitude);
    var TOL = 1000;   // رواداریِ EMU برای خطای گردکردنِ خودِ گوگل
    if (gotW && gotH && Math.abs(gotW - wEmu) <= TOL && Math.abs(gotH - hEmu) <= TOL) {
      out.exact = true;
    } else {
      out.why = 'presentations.create اندازهٔ درخواستی را نادیده گرفت — ' +
        (gotW && gotH ? 'صفحه با ' + gotW + '×' + gotH + ' EMU ساخته شد، نه ' +
                        wEmu + '×' + hEmu : 'pageSize در پاسخ نبود') +
        ' (محدودیتِ شناخته‌شدهٔ Slides API، نه خطای این اجرا).';
    }
    return out;
  }
  var off = ytApiOff_((mk && mk.text) || '');
  out.enableUrl = off.url || '';
  out.why = off.scope
    ? (off.fix || 'اسکوپِ Slides نیست')
    : off.off
    ? (off.api || 'Google Slides API') + ' در پروژهٔ ابری روشن نیست' +
      (off.url ? ' — ' + off.url : '')
    /* و اگر باز هم نشناختیم، دستِ‌کم متنِ خودِ گوگل را بگو — «(۴۰۳)»ِ خالی
       همان چیزی است که ناظر را هم بلاتکلیف گذاشت. */
    : 'ساختِ ارائه با اندازهٔ دقیق نشد' + (mk ? ' (' + mk.code + ')' : '') +
      (mk && mk.text ? ' — ' + String(mk.text).replace(/\s+/g, ' ').slice(0, 120) : '');
  try { out.id = SlidesApp.create(String(title || 'کارت')).getId(); } catch (e2) {}
  return out;
}

function ytCoverCard_(c) {
  var pres = null;
  try {
    /* کاورِ ساخته‌شده دوباره ساخته نمی‌شود. `ytUploadOne_` ممکن است چند شب
       پشتِ‌هم روی یک قسمت بیفتد (منتظرِ رسیدنِ ویدئو)، و هر بار یک اسلایدِ
       تازه ساختن یعنی ده‌ها فایلِ دورریختنی در درایو. `redo` این را دور می‌زند
       — همان دری که «کاور اشتباه درآمد» از آن باز می‌شود. */
    if (!c.redo) {
      var cached = ytCoverCached_(c);
      if (cached) return cached;
    }
    /* ══ کاور از **سبکِ همان مجموعه** می‌آید، نه از هشِ نامِ دسته (۷.۹۹) ══
     * خواستهٔ صریحِ صاحبِ برنامه: «کاورِ پادکست … باید با توجه به این قابلیت
     * قشنگ‌تر و بهتر کار کنه». و ایرادش درست بود: کاور با `ytPalette_` رنگ
     * می‌گرفت و کارت‌ها با `LV_STYLES` — سنجیده شد و دو رنگِ کاملاً جدا
     * درآمدند (`#F3EAD3` در برابرِ `#0B3B3C`). یعنی بندانگشتیِ ویدئو و
     * خودِ ویدئو دو ظاهرِ بی‌ربط داشتند، و آنچه کانال را «حرفه‌ای» نشان
     * می‌دهد پیش از هر چیز همین یک‌دستی است.
     * و اگر سبکی داده نشده باشد، عیناً رفتارِ قبلی: هشِ دسته. */
    var csty = c.style ? lvStyleResolve_(c.style) : null;
    var pal = (csty && csty.pal) || ytPalette_(c.cat || c.seriesName || c.showName);
    var name = ytCoverName_(c).replace(/\.png$/, '');
    /* ۱۲۸۰×۷۲۰ در ۹۶ نقطه بر اینچ = ۱۳٫۳۳×۷٫۵ اینچ. یوتیوب همین را توصیه
       می‌کند و کارتِ ۹۶۰×۵۴۰ باید بالا کشیده شود — یعنی متنِ نرم.
       ولی **کاورِ پادکست ۱:۱ می‌خواهد، نه ۱۶:۹** (۱۲۸۰×۱۲۸۰). یوتیوب برای
       پلی‌لیستی که پادکست شده صریح همین را می‌گوید، و ۱۶:۹ آن‌جا بریده
       می‌شود. چون چیدمانِ کارت نسبی است (همه‌چیز کسری از W و H)، همان کد با
       صفحهٔ مربع هم درست درمی‌آید. */
    /* شاخهٔ «مربع» از ۸.۵۵ رفت: اسلایدز اندازه را دور می‌ریزد و آن شاخه هرگز
       مربع نساخت (۹۶۰×۵۴۰ می‌داد). کاورِ مربعِ پلی‌لیست را رانر می‌کشد. */
    var mkP = ytPresCreate_(name, 12192000, 6858000);
    if (!mkP.id) { logLine_('کاورِ یوتیوب ساخته نشد: ' + mkP.why); return null; }
    if (!mkP.exact) logLine_('کاورِ یوتیوب با اندازهٔ پیش‌فرض ساخته شد — ' + mkP.why);
    pres = SlidesApp.openById(mkP.id);
    var slide = pres.getSlides()[0];
    try { var els = slide.getPageElements(); for (var e = 0; e < els.length; e++) els[e].remove(); }
    catch (eEl) {}

    var W = pres.getPageWidth(), H = pres.getPageHeight();
    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
    bg.getFill().setSolidFill(pal.bg);
    bg.getBorder().setTransparent();

    /* قابِ همان سبک — همان تابعی که کارت‌ها از آن استفاده می‌کنند، پس
       بندانگشتی و اسلایدها یک خانواده‌اند. بی سبک، نوارِ پایینِ قبلی. */
    if (csty) {
      try { lvFrameDraw_(slide, W, H, pal, String(csty.frame || 'bar'), 0); } catch (eFr) {}
    } else {
      var bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, H - H * 0.055, W, H * 0.055);
      bar.getFill().setSolidFill(pal.ac);
      bar.getBorder().setTransparent();
    }

    var pad = W * 0.07;
    var put = function (txt, top, height, size, color, bold, align) {
      var box = slide.insertTextBox(String(txt || ''), pad, top, W - pad * 2, height);
      var t = box.getText();
      var st = t.getTextStyle();
      st.setFontSize(size).setForegroundColor(color).setBold(!!bold);
      try { t.getParagraphStyle().setParagraphAlignment(align || SlidesApp.ParagraphAlignment.END); }
      catch (eA) {}
      return box;
    };

    put(c.showName || '', H * 0.09, H * 0.09, 19, pal.ac, true);
    if (c.kicker) put(c.kicker, H * 0.20, H * 0.09, 22, pal.fg, false);
    /* متنِ بزرگ: `coverTitle` است، نه عنوانِ قسمت. اگر مدل نداده باشد، عنوان
       کوتاه می‌شود — ولی هیچ‌وقت وسطِ واژه، چون کاورِ بریده بی‌دقت به‌نظر
       می‌آید و کاور اولین چیزی است که آدم‌ها قضاوتش می‌کنند. */
    var ttl = String(c.coverTitle || c.title || '');
    if (ttl.length > (Number(CFG.YT_COVER_CHARS) || 42)) {
      var cut = ttl.slice(0, Number(CFG.YT_COVER_CHARS) || 42);
      var sp = cut.lastIndexOf(' ');
      ttl = (sp > 12 ? cut.slice(0, sp) : cut).trim() + '…';
    }
    var fs = ttl.length > 34 ? 38 : (ttl.length > 22 ? 46 : 56);
    put(ttl, H * 0.31, H * 0.36, fs, pal.fg, true);
    var foot = [];
    if (c.seriesName) foot.push(c.seriesName);
    if (c.epLabel) foot.push(c.epLabel);
    put(foot.join('  ·  '), H * 0.74, H * 0.10, 17, pal.ac, false);

    pres.saveAndClose();
    var id = pres.getId();
    var blob = ytSlideExport_(id, slide.getObjectId(), ytCoverName_(c));
    if (!blob) return null;
    /* اندازه سنجیده می‌شود، نه فرض. خروجیِ اسلایدز ابعادش را اعلام نمی‌کند و
       تنها راهِ دانستن، خواندنِ سرآیندِ خودِ PNG است — همان `ytPngSize_` که
       برای بنر نوشته شد. یک کاورِ کوچک، ویدئو را زمین نمی‌زند؛ ولی باید
       دیده شود، وگرنه ماه‌ها کسی نمی‌فهمد چرا متن‌ها نرم‌اند. */
    try {
      var cz = ytPngSize_(blob);
      if (cz && cz.w && cz.w < 1280) {
        logLine_('کاورِ «' + ytCoverName_(c) + '» ' + cz.w + '×' + cz.h +
                 ' درآمد، نه ۱۲۸۰×۷۲۰ — یوتیوب می‌پذیردش ولی متن نرم می‌شود.');
      }
    } catch (eSz) {}
    // فایلِ اسلاید و PNG هر دو می‌مانند — اگر کاوری بد درآمد باید دید چه بوده
    var f = null;
    try {
      var folder = ytCoverFolder_();
      DriveApp.getFileById(id).moveTo(folder);
      // بازسازی باید *جایگزین* کند، نه یک هم‌نامِ دوم بسازد — وگرنه دفعهٔ
      // بعد کدام‌یک خوانده شود معلوم نیست (همان تلهٔ getFilesByName).
      var old = folder.getFilesByName(ytCoverName_(c));
      while (old.hasNext()) old.next().setTrashed(true);
      f = folder.createFile(blob);
    } catch (eMv) {}
    return { blob: blob, fileId: f ? f.getId() : '', slideId: id };
  } catch (e) {
    logLine_('کاورِ یوتیوب ساخته نشد: ' + e.message);
    try { if (pres) DriveApp.getFileById(pres.getId()).setTrashed(false); } catch (eT) {}
    return null;
  }
}

/* ─────────────────── ۶) درخواستِ رندر — کاری که موتور نمی‌تواند ───────────────────
 *
 * این‌جا همان جایی است که ۵٫۵۵ برای موسیقی یاد گرفت: وقتی یک طرف کاری را
 * *نمی‌تواند*، نباید وانمود کرد که می‌تواند و بعد ماه‌ها منتظر ماند. کار
 * تقسیم می‌شود، درخواست نوشته می‌شود، و **نرسیدنِ جواب خودش گزارش می‌شود** —
 * چون بانکِ موسیقی هفته‌ها خالی ماند دقیقاً به این دلیل که هیچ‌کس نپرسید چرا.
 */
function ytRenderName_() { return CFG.YT_RENDER_FILE || '_YT-RENDER.json'; }

function ytRenderRead_() {
  var d = null;
  try { d = getOutJson_(ytRenderName_()); } catch (e) {}
  if (!d || Object.prototype.toString.call(d.items) !== '[object Array]') {
    d = { updatedAt: '', note: '', items: [] };
  }
  return d;
}

function ytRenderSave_(d) {
  d.updatedAt = nowStr_();
  d.note = 'موتور نمی‌تواند ویدئو بسازد (Apps Script نه ffmpeg دارد نه مهلتِ کافی). ' +
           'این فایل را «tools/render.js» در GitHub Actions می‌خواند. برای هر ردیفِ ' +
           'status=«در انتظار»: نشانی‌های audio[].url را **به همان ترتیب** بگیر — ' +
           'بعضی قسمت‌ها چند فایل‌اند و باید پشتِ‌هم چسبانده شوند تا یک ویدئوی ' +
           'واحد شود — با coverUrl یک MP4 با تصویرِ ثابت بساز (h264 + aac، ' +
           '۱۲۸ کیلوبیت)، به‌صورتِ release asset منتشرش کن و نشانی‌اش را با همین ' +
           'key در docs/renders.json بنویس. موتور خودش برمی‌دارد، در پوشهٔ قسمت ' +
           'می‌گذارد و اشتراکِ موقتِ صوت را پس می‌گیرد. هیچ‌جای دیگری را دست نزن.';
  try { putOutJson_(ytRenderName_(), d); return true; } catch (e) {
    logLine_('درخواستِ رندرِ ویدئو نوشته نشد: ' + e.message);
    return false;
  }
}

/** نامِ فایلِ ویدئوی یک قسمت — یک قاعده، دو خواننده (موتور و تسک). */
function ytVideoName_(baseName) {
  return String(baseName || 'قسمت') + ' — ' + (CFG.YT_VIDEO_MARK || 'ویدئو') + '.mp4';
}

/** ویدئوی آمادهٔ این پوشه، اگر رسیده باشد. */
function ytVideoIn_(folder) {
  try {
    var it = folder.getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (/\.mp4$/i.test(f.getName())) return f;
    }
  } catch (e) {}
  return null;
}

/** صوتِ «کامل» همین پوشه — پایهٔ رندر. */
/**
 * همهٔ فایل‌های صوتیِ یک قسمت، **به ترتیب**.
 *
 * ══ باگی که این را لازم کرد (۲۵ اوت، پیش از اولین انتشار) ══
 * قسمتی که در یک فایل جا نمی‌شود، در دو فایل تحویل می‌شود:
 *     «… — یکجا ۱ از ۲.wav»  و  «… — یکجا ۲ از ۲.wav»
 * هیچ‌کدام واژهٔ «کامل» را ندارند. نسخهٔ اولِ این تابع وقتی «کامل» پیدا
 * نمی‌کرد، **بزرگ‌ترین فایل** را برمی‌داشت — یعنی برای درس‌نامهٔ ۱۶ فقط
 * «یکجا ۲ از ۲» (۲۰ مگابایت در برابرِ ۱۹) را برمی‌داشت و **نیمهٔ دومِ درس
 * را به‌عنوان کلِ قسمت** منتشر می‌کرد. بی هیچ خطایی: مدت از همان نیمه حساب
 * می‌شد، فصل‌بندی بی‌معنا می‌شد، و کپشن کلِ درس را توصیف می‌کرد.
 *
 * سه مسیر، به ترتیبِ اعتماد:
 *   ۱) «کامل» هست → همان، یک فایل.
 *   ۲) «یکجا i از n» هست → مرتب بر اساس i، و **باید هر n تا باشند**.
 *   ۳) هیچ‌کدام نبود → «بخش i» ها، که همان صدا با برشِ کوتاه‌ترند.
 *
 * و اگر مجموعه ناقص بود، `why` پر می‌شود و هیچ‌چیز منتشر نمی‌شود. نیمهٔ یک
 * درس که عمومی شود، برخلافِ یک انتشارِ عقب‌افتاده، برگشت‌پذیر نیست.
 */
function ytAudioParts_(folder) {
  var out = { parts: [], why: '', kind: '' };
  var all = [];
  try {
    var it = folder.getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (!/\.wav$/i.test(f.getName())) continue;
      all.push(f);
    }
  } catch (e) { out.why = 'پوشهٔ قسمت خوانده نشد: ' + e.message; return out; }
  if (!all.length) { out.why = 'هیچ فایلِ صوتی در پوشهٔ قسمت نیست'; return out; }

  // ۱) فایلِ یکجای تک — بهترین حالت
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].getName()).indexOf('کامل') !== -1) {
      out.parts = [all[i]]; out.kind = 'کامل'; return out;
    }
  }

  // ۲) «یکجا i از n» — ترتیب از خودِ نام، نه از اندازه یا ترتیبِ درایو
  var merged = [], total = 0;
  for (var j = 0; j < all.length; j++) {
    var m = faDigits_(String(all[j].getName())).match(/یکجا\s*(\d+)\s*از\s*(\d+)/);
    if (!m) continue;
    merged.push({ no: parseInt(m[1], 10), of: parseInt(m[2], 10), file: all[j] });
    total = Math.max(total, parseInt(m[2], 10));
  }
  if (merged.length) {
    merged.sort(function (a, b) { return a.no - b.no; });
    var seen = Object.create(null), uniq = [];
    for (var u = 0; u < merged.length; u++) {
      if (seen[merged[u].no]) continue;
      seen[merged[u].no] = 1; uniq.push(merged[u]);
    }
    if (uniq.length !== total) {
      out.why = 'قسمت ' + faDigitsOut_(String(total)) + ' فایلی است ولی ' +
                faDigitsOut_(String(uniq.length)) + ' تا پیدا شد — ناقص منتشر نمی‌شود';
      return out;
    }
    for (var q = 0; q < uniq.length; q++) out.parts.push(uniq[q].file);
    out.kind = 'یکجا ×' + total;
    return out;
  }

  // ۳) تکه‌های کوتاه — همان صدا، فقط برشِ ریزتر
  var chunks = [];
  for (var c = 0; c < all.length; c++) {
    var mc = faDigits_(String(all[c].getName())).match(/بخش\s*(\d+)/);
    if (mc) chunks.push({ no: parseInt(mc[1], 10), file: all[c] });
  }
  if (chunks.length) {
    chunks.sort(function (a, b) { return a.no - b.no; });
    for (var z = 0; z < chunks.length; z++) out.parts.push(chunks[z].file);
    out.kind = 'بخش ×' + chunks.length;
    return out;
  }
  out.why = 'فایل‌های صوتیِ این قسمت شناخته نشدند';
  return out;
}

/**
 * ردیفِ نقشهٔ رانر برای **همین** درخواست — یا null.
 * جایگزینی (۸.۵۷) کلید را عوض نمی‌کند، پس نقشه برای همان کلید نشانیِ ویدئوی **قبلی** را
 * دارد. ردیفِ دارای `replace` فقط ردیفِ نقشه با همان `replace` را «ساخته‌شده» می‌شمارد —
 * یک تعریف، برای سقفِ صف و برای برداشت؛ دو تعریف یعنی یکی ویدئوی قبلی را دوباره برمی‌دارد.
 */
function ytRenderBuilt_(row, map) {
  var rec = map && row ? map[String(row.key)] : null;
  if (!rec || !rec.url) return null;
  if (row.replace && String(rec.replace || '') !== String(row.replace)) return null;
  return rec;
}

/** یک درخواستِ تازه، بی تکرار. سقف دارد تا صف بی‌نهایت نشود. */
function ytRenderAsk_(item) {
  var d = ytRenderRead_();
  var key = String(item.show) + ':' + String(item.ep);
  var replaceAt = -1;
  for (var i = 0; i < d.items.length; i++) {
    if (String(d.items[i].key) !== key) continue;
    /* ══ جایگزینی (۸.۵۷) ══ ردیفِ «رسید»ِ ویدئوی قبلی، با `replace` تازه بازنویسی می‌شود؛
       همان `replace` یعنی «قبلاً برای همین جایگزینی خواسته شد». */
    if (item.replace) {
      if (String(d.items[i].replace || '') === String(item.replace)) return false;
      replaceAt = i; break;
    }
    /* قبلاً خواسته شده — مگر آنکه ردیفِ قبلی نحیف و هنوز ساخته‌نشده باشد و
       این یکی واقعاً بهتر (۸.۳۰). «بهتر» یعنی تصویرِ بیشتر یا مشخصاتِ برداری؛
       بی این شرط، ردیفی بدتر هم می‌توانست جای قبلی را بگیرد. */
    var old = d.items[i];
    /* ══ صحنه جای کارت را می‌گیرد، تا ویدئو ساخته نشده (۸.۳۱) ══
       درسِ ۶۰ پیش از ۸.۳۱ با کارت خواسته شد و رانر نگهش داشت؛ بی این، ردیفِ
       کارتی تا ابد در صف می‌ماند و صحنه‌ها هرگز به رانر نمی‌رسیدند. */
    var scNew = !!(item.scenes && item.scenes.length);
    var scOld = !!(old.scenes && old.scenes.length);
    if (scNew && !scOld && String(old.status || '') === 'در انتظار') {
      var mm0 = ytRenderMapCached_();
      if (!(mm0 && mm0[key] && mm0[key].url)) { replaceAt = i; break; }
    }
    var nNew = (item.visuals || []).length, nOld = (old.visuals || []).length;
    var specNew = !!(item.spec && item.spec.cards && item.spec.cards.length);
    if (ytRenderRedoable_(old, Number((item.visInfo || {}).asked) || 0) &&
        (nNew > nOld || specNew)) { replaceAt = i; break; }
    return false;
  }
  /* ══ سقفی که خودش صف را قفل می‌کرد (۶٫۳۷) ══
   * این سقف برای «درخواستِ رندرِ انباشته» گذاشته شده بود — ولی چیزی که
   * می‌شمرد ردیف‌های «در انتظار» بود، و ردیف تا وقتی ویدئواش **برداشته**
   * نشود در انتظار می‌مانَد.
   *
   * پس وقتی برداشت شکست، هشت ردیفِ ساخته‌شده‌ولی‌برنداشته سقف را پر کردند و
   * از آن لحظه **هیچ درخواستِ تازه‌ای نوشته نشد**. اکشنِ گیت‌هاب هر ساعت
   * سبز می‌شد و می‌گفت «صف: ۸ ردیف، ۰ تای ساخته‌نشده» — یعنی از بیرون
   * همه‌چیز سالم بود، در حالی که صفِ انتشار هفده تا شده بود و دو روز هیچ
   * ویدئویی بالا نرفت.
   *
   * «منتظرِ ساخت» و «منتظرِ برداشت» دو چیزند. سقف فقط باید اولی را بشمرد. */
  var cap = Math.max(1, Number(CFG.YT_RENDER_MAX) || 8);
  var map = null;
  map = ytRenderMapCached_();
  var pend = d.items.filter(function (x, ix) {
    if (ix === replaceAt) return false;     // جایگزین می‌شود، اضافه نمی‌شود
    if (String(x.status || '') !== 'در انتظار') return false;
    // ساخته شده و فقط منتظرِ برداشت است — این دیگر «درخواستِ بی‌جواب» نیست.
    if (ytRenderBuilt_(x, map)) return false;
    return true;
  });
  if (pend.length >= cap) return false;
  var row = { key: key, show: item.show, ep: String(item.ep),
              title: String(item.title || ''), folderId: String(item.folderId || ''),
              // فهرستِ مرتبِ بخش‌های صوتی. یک قسمت می‌تواند دو فایل باشد و
              // باید پشتِ‌هم چسبانده شود تا **یک** ویدئو بدهد.
              audio: (item.audio || []).map(function (a) {
                return { id: String(a.id || ''), name: String(a.name || ''),
                         url: ytDlUrl_(a.id) }; }),
              audioKind: String(item.audioKind || ''),
              coverFileId: String(item.coverFileId || ''),
              coverUrl: ytDlUrl_(item.coverFileId || ''),
              /* تصویرهای بخش‌ها، به ترتیب. خالی بودنش یعنی **رفتارِ امروز**:
                 `tools/render.js` همان کاورِ تک‌تصویری را می‌سازد. */
              visuals: (item.visuals || []).map(function (v) {
                return { fileId: String((v && v.fileId) || ''),
                         url: ytDlUrl_((v && v.fileId) || ''),
                         kind: String((v && v.kind) || ''),
                         sec: Number((v && v.sec) || 0) || 0,
                         name: String((v && v.name) || '') }; }),
              outName: String(item.outName || ''), at: nowStr_(),
              status: 'در انتظار' };
  if (item.replace) row.replace = String(item.replace);
  /* ══ مشخصاتِ تصویری **در ردیف** — سیمی که از ۸.۰۱ وصل نبود (۸.۲۶) ══
     `ytUploadOne_` مشخصات را از ۸.۰۱ می‌سازد و به همین تابع می‌دهد، و
     `tools/render.js` از ۸.۰۱ اول از همه `it.spec` را می‌خوانَد. ولی همین‌جا،
     در میانهٔ آن دو، ردیف فیلدِ `spec` نداشت: ساخته می‌شد و دور ریخته می‌شد.
     یعنی کارت‌های برداری — کلِ کارِ ۸.۰۱ — **یک بار هم** به رانر نرسیده‌اند،
     و هیچ‌جا صدایی درنیامد چون رانر بی `spec` عیناً مسیرِ قدیم را می‌رود
     («قولِ چیزی خراب نمی‌شود»): خرابیِ بی‌صدا، از درِ سازگاری. */
  if (item.spec && Array.isArray(item.spec.cards) && item.spec.cards.length) row.spec = item.spec;
  if (item.visInfo) row.vis = item.visInfo;
  /* ══ صحنه‌ها: هر کدام با ثانیهٔ شروع و تصویرش (۸.۳۱) ══
     رانر این‌ها را تمام‌صفحه می‌کشد، مرز را روی نزدیک‌ترین مکث می‌نشاند،
     و از خودِ ویدئوی ساخته‌شده می‌سنجد که هر صحنه سرِ جایش هست. */
  if (item.scenes && item.scenes.length) {
    row.mode = 'scenes';
    row.scenes = item.scenes.map(function (x) {
      var r0 = { n: Number(x.n) || 0, t0: Number(x.t0) || 0, fileId: String(x.fileId || ''),
                 url: ytDlUrl_(x.fileId || ''), caption: String(x.caption || '') };
      if (x.ov) r0.ov = x.ov;                       // نوشتهٔ رویِ نقاشی (۸.۴۵)
      if (x.mv) r0.mv = x.mv;                       // حرکتِ معنادار (۸.۵۱)
      if (x.clip && x.clip.fileId) {                // کلیپِ آغاز (۸.۵۱)
        r0.clip = { fileId: String(x.clip.fileId), url: ytDlUrl_(x.clip.fileId), sec: Number(x.clip.sec) || 0 };
      }
      return r0; });
    if (item.sceneCover && item.sceneCover.fileId) {
      row.sceneCover = { fileId: String(item.sceneCover.fileId), url: ytDlUrl_(item.sceneCover.fileId) };
    }
    if (item.plKey) row.plKey = String(item.plKey);
    row.coverTitle = String(item.coverTitle || '');
    row.coverKicker = String(item.coverKicker || '');
    row.coverFoot = String(item.coverFoot || '');
    try { row.mark = ytMarkSpec_(); } catch (eMk) {}
    if (item.sceneInfo) row.vis = item.sceneInfo;
  }
  /* اجازه همراهِ درخواست داده می‌شود، نه پیش از آن و نه جدا از آن: هر فایلی
     که این‌جا باز می‌شود در `ytShareSweep_` نامش هست و پس گرفته می‌شود. */
  if (replaceAt >= 0) {
    var was = d.items[replaceAt];
    /* اشتراکِ فایل‌های ردیفِ قبلی پس گرفته می‌شود — آن‌هایی که در ردیفِ تازه
       هم هستند (صوت، کاور) همین پایین دوباره باز می‌شوند. */
    try { ytRenderShare_(was, false); } catch (eRs) {}
    row.redo = (Number(was.redo) || 0) + 1;
    row.replaced = String(was.at || '');
    row.replacedWhy = row.replace ? 'جایگزینیِ ویدئوی منتشرشده («' + row.replace + '»)'
      : row.scenes
      ? 'ردیفِ قبلی کارتِ متنی بود؛ حالا ' + row.scenes.length + ' صحنهٔ مصور'
      : 'ردیفِ قبلی ' + (was.visuals || []).length + ' تصویر داشت' +
        (was.spec ? '' : ' و بی مشخصاتِ برداری بود');
  }
  row.shared = ytRenderShare_(row, true) > 0;
  row.sharedAt = nowStr_();
  if (replaceAt >= 0) d.items[replaceAt] = row; else d.items.push(row);
  var okSave = ytRenderSave_(d);
  if (okSave && replaceAt >= 0) {
    logLine_('درخواستِ رندرِ ' + key + ' جایگزین شد: ' + row.replacedWhy + '؛ تازه ' +
             (row.visuals || []).length + ' تصویر' + (row.spec ? ' و ' + row.spec.cards.length + ' کارتِ برداری' : '') + '.');
  }
  if (okSave) ytQueueShare_();
  /* رانر همین حالا راه می‌افتد، نه هر وقت زمان‌بندیِ گیت‌هاب یادش آمد (۸.۵۸).
     بی توکن هیچ کاری نمی‌کند و هیچ فراخوانی نمی‌زند. */
  if (okSave) { try { ghRenderDue_('درخواستِ رندرِ ' + key); } catch (eGk) {} }
  return okSave;
}

/** رسید: ویدئو آمد، ردیف بسته می‌شود. تاریخچه پاک نمی‌شود. */
function ytRenderDone_(show, ep) {
  var d = ytRenderRead_(), key = String(show) + ':' + String(ep), hit = false;
  for (var i = 0; i < d.items.length; i++) {
    if (String(d.items[i].key) !== key) continue;
    if (String(d.items[i].status) === 'رسید') return false;
    d.items[i].status = 'رسید'; d.items[i].doneAt = nowStr_(); hit = true;
  }
  if (!hit) return false;
  var okD = ytRenderSave_(d);
  /* آخرین کارِ منتظر برداشته شد ⇒ درِ ساعتی دیگر رانر را راه نمی‌اندازد (۸.۵۸). */
  if (okD && !d.items.some(function (x) { return String(x.status || '') === 'در انتظار'; })) {
    try { ghRenderDueClear_(); } catch (eGc) {}
  }
  return okD;
}

/** چند درخواست بی‌جواب مانده و قدیمی‌ترینش چند روز است. */
function ytRenderPending_() {
  var d = ytRenderRead_(), out = { n: 0, oldestDays: 0, keys: [] };
  var now = new Date().getTime();
  for (var i = 0; i < d.items.length; i++) {
    if (String(d.items[i].status || '') !== 'در انتظار') continue;
    out.n++;
    if (out.keys.length < 6) out.keys.push(d.items[i].key);
    var t = parseWhen_(String(d.items[i].at || ''));
    if (!isNaN(t)) {
      var days = Math.floor((now - t) / 86400000);
      if (days > out.oldestDays) out.oldestDays = days;
    }
  }
  return out;
}

/* ────────── ۶‑ب) مسیرِ داده: چطور صوت بیرون می‌رود و ویدئو برمی‌گردد (۶٫۶) ──────────
 *
 * ══ چرا این‌طور و نه ساده‌تر ══
 * درخواستِ رندر از ۵٫۹۷ نوشته می‌شد و هیچ‌کس جوابش را نمی‌داد. علتش را
 * ۲۵ اوت با آزمایش فهمیدیم، نه با حدس: در محیطِ سشن‌های ابری
 * `drive.google.com` و `docs.google.com` و `script.google.com` **اصلاً باز
 * نمی‌شوند**، و ابزارهای MCP محتوا را داخلِ خودِ گفت‌وگو می‌آورند — صوتِ یک
 * قسمت سی مگابایت است و از آن راه رد نمی‌شود. یعنی مشکل هرگز ffmpeg نبود
 * (که از PyPI در چند ثانیه نصب می‌شود)؛ مشکل **رسیدن به فایل** بود.
 *
 * پس کار به GitHub Actions سپرده شد، که هم شبکهٔ باز دارد و هم ffmpeg. و
 * چون آن‌جا هیچ اجازه‌ای به درایو ندارد، اجازه از این سمت داده می‌شود:
 *
 *   موتور → صوت و کاورِ همان قسمت را «هرکس با لینک: فقط دیدن» می‌کند و
 *           نشانی‌شان را در `_YT-RENDER.json` می‌گذارد
 *   اکشن  → می‌گیرد، MP4 می‌سازد، به‌صورتِ release asset منتشر می‌کند و
 *           نشانی‌اش را در `docs/renders.json` همین ریپو می‌نویسد
 *   موتور → از raw گیت‌هاب برمی‌دارد، در پوشهٔ قسمت می‌گذارد، و
 *           **اشتراک را پس می‌گیرد**
 *
 * همان الگوی `promptSyncFromRepo_` و `outReadmeSync_`: ریپو تختهٔ اعلانِ
 * مشترک است، و هیچ رمزی جایی نمی‌نشیند.
 *
 * ══ و آنچه باید صریح نوشته شود ══
 * چیزی که عمومی می‌شود، فردا در یوتیوب عمومی است — ولی «فردا عمومی می‌شود»
 * مجوزِ «برای همیشه باز بماند» نیست. `ytShareSweep_` هر شب هر اشتراکی را که
 * کارش تمام شده یا از `YT_SHARE_DAYS` گذشته پس می‌گیرد. اشتراکی که با شکستِ
 * یک مرحله جا بماند، دقیقاً همان چیزی است که این سوپاپ برایش هست.
 */

/** نشانیِ دانلودِ مستقیمِ یک فایلِ درایو.
 *
 * `drive.google.com/uc?export=download` برای فایلِ بزرگ‌تر از ~۲۵ مگابایت
 * به‌جای بایت‌ها یک صفحهٔ هشدارِ HTML می‌دهد — و صوتِ ما همیشه از آن بزرگ‌تر
 * است. مسیرِ `usercontent` با `confirm=t` همان هشدار را رد می‌کند. */
function ytDlUrl_(fileId) {
  return 'https://drive.usercontent.google.com/download?id=' +
         encodeURIComponent(String(fileId || '')) + '&export=download&confirm=t';
}

/* اشتراکِ موقتِ فایل حالا در بخشِ ۱۸ است: `driveShareOn_` / `driveShareOff_`.
   دلیلش وابستگیِ بخش‌هاست — بخشِ ۲۰ («نمونهٔ روحِ خواندن») هم به همین نیاز
   دارد و نمی‌تواند از بخشِ ۲۷ صدا بزند. نوشتنِ دوقلوی دوم، همان کاری است که
   این مخزن بارها تاوانش را داده: «یک دوقلو که یک‌بار درست شود، یک‌بار درست
   شده است». پس یک تعریف، در پایین‌ترین بخشی که هر دو می‌بینندش. */
function ytShareOn_(fileId) {
  return driveShareOn_(fileId);
}

function ytShareOff_(fileId) {
  return driveShareOff_(fileId);
}

/** صوت و کاورِ یک ردیف را با هم باز یا بسته می‌کند. */
function ytRenderShare_(item, on) {
  var ids = [], au = (item || {}).audio || [];
  for (var i = 0; i < au.length; i++) if (au[i] && au[i].id) ids.push(au[i].id);
  if (item && item.coverFileId) ids.push(item.coverFileId);
  /* ══ تصویرها فایل‌به‌فایل باز می‌شوند، هرگز پوشه‌به‌پوشه (درسِ ۷٫۴۵) ══
   * وسوسه این است که «تصویرها» را یک‌بار باز کنیم و خلاص. درایو اجازه
   * نمی‌دهد فرزندی بسته‌تر از پوشه‌اش باشد، پس بعدش `setSharing(PRIVATE)`
   * روی هر فایلِ درونش پرت می‌کند و **اشتراک برای همیشه باز می‌مانَد** —
   * چهار شب همین در سیاهه نشست و پیامش هیچ‌چیز را نام نمی‌برد. همین‌جا هم
   * بدتر است: بعد از این، هر فایلی که موتور در آن پوشه بنویسد عمومی است.
   * پس فقط همان فایل‌هایی که اکشن لازم دارد، و همین فهرست است که
   * `ytShareSweep_` بعداً می‌بنددش. */
  var vs = (item || {}).visuals || [];
  for (var v = 0; v < vs.length; v++) if (vs[v] && vs[v].fileId) ids.push(vs[v].fileId);
  /* و تصویرهای ساخته‌شدهٔ کارت‌های برداری — همان قاعده: فایل‌به‌فایل، و همین
     فهرست است که بعداً بسته می‌شود. بازنشده یعنی رانر یک صفحهٔ HTML به‌جای
     تصویر می‌گیرد (درسِ ۷٫۳۳) و کارت بی‌تصویر کشیده می‌شود. */
  var sc = (((item || {}).spec || {}).cards) || [];
  for (var c = 0; c < sc.length; c++) if (sc[c] && sc[c].bgId) ids.push(sc[c].bgId);
  /* و صحنه‌ها (۸.۳۱) — همان قاعده، فایل‌به‌فایل. صحنه‌ای که تصویرِ قبلی را
     ادامه می‌دهد شناسهٔ تکراری دارد؛ یک بار باز می‌شود. */
  var seen = {};
  var ss = (item || {}).scenes || [];
  for (var z = 0; z < ss.length; z++) {
    var fz = ss[z] && ss[z].fileId;
    if (fz && !seen[fz]) { seen[fz] = true; ids.push(fz); }
    /* کلیپِ آغاز (۸.۵۱) — همان قاعده: بازنشده یعنی رانر صفحهٔ HTML می‌گیرد. */
    var cz = ss[z] && ss[z].clip && ss[z].clip.fileId;
    if (cz && !seen[cz]) { seen[cz] = true; ids.push(cz); }
  }
  if (item && item.sceneCover && item.sceneCover.fileId) ids.push(item.sceneCover.fileId);
  var n = 0;
  for (var j = 0; j < ids.length; j++) {
    if (on ? ytShareOn_(ids[j]) : ytShareOff_(ids[j])) n++;
  }
  return n;
}

/** خودِ صف هم باید از بیرون خواندنی باشد — وگرنه اکشن نمی‌داند چه بسازد. */
function ytQueueShare_() {
  try {
    var f = outFolder_().getFilesByName(ytRenderName_());
    if (!f.hasNext()) return '';
    var id = f.next().getId();
    ytShareOn_(id);
    return id;
  } catch (e) { return ''; }
}

/**
 * شناسهٔ صف عوض شده است یا نه.
 *
 * اکشن شناسهٔ `_YT-RENDER.json` را ثابت در `tools/render.js` دارد، چون از
 * بیرون راهی برای جست‌وجو در درایو ندارد. `putOutJson_` با `setContent`
 * می‌نویسد و شناسه را نگه می‌دارد — ولی اگر کسی فایل را پاک کند، فایلِ تازه
 * شناسهٔ تازه می‌گیرد و اکشن **بی هیچ خطایی** برای همیشه صفِ کهنه را
 * می‌خواند. این تابع همان را می‌گیرد و می‌گوید چه باید عوض شود.
 */
function ytQueueIdOk_() {
  var want = String(CFG.YT_QUEUE_ID || ''), got = '';
  try {
    var f = outFolder_().getFilesByName(ytRenderName_());
    if (f.hasNext()) got = f.next().getId();
  } catch (e) {}
  if (!want || !got) return { ok: true, want: want, got: got };
  return { ok: want === got, want: want, got: got };
}

/**
 * ردیف‌هایی که پیش از ۶٫۶ ثبت شده‌اند، نشانی و اجازه ندارند.
 *
 * ══ همان درسِ ۵٫۹۵، دوباره ══
 * «تمیزکردنِ ورودی، آنچه را قبلاً نوشته شده درست نمی‌کند.» `ytRenderAsk_` از
 * حالا هر ردیفِ تازه را باز می‌کند و نشانی می‌دهد — ولی شش درخواستِ امشب
 * قبلاً ثبت شده‌اند و **تکراری‌اند**، پس هرگز از آن مسیر رد نمی‌شوند. بی این
 * تابع، آن شش قسمت تا ابد در صف می‌مانند و اکشن هیچ‌وقت نمی‌تواند بگیردشان:
 * دقیقاً همان بن‌بستی که این نسخه برای شکستنش نوشته شد.
 *
 * فقط ردیفِ «در انتظار» را دست می‌زند، و فقط وقتی چیزی کم است — یک مهاجرتِ
 * آرایشی نباید هر شب همهٔ فایل‌ها را از نو مُهر بزند.
 */
function ytRenderRefresh_() {
  var d = ytRenderRead_(), n = 0, changed = false;
  for (var i = 0; i < d.items.length; i++) {
    var it = d.items[i];
    if (String(it.status || '') !== 'در انتظار') continue;
    var au = it.audio || [], need = !it.shared;
    for (var a = 0; a < au.length; a++) if (!au[a].url) need = true;
    if (!need) continue;
    for (var b = 0; b < au.length; b++) au[b].url = ytDlUrl_(au[b].id);
    if (it.coverFileId) it.coverUrl = ytDlUrl_(it.coverFileId);
    it.shared = ytRenderShare_(it, true) > 0;
    it.sharedAt = nowStr_();
    changed = true; n++;
  }
  if (changed) ytRenderSave_(d);
  return n;
}

/** نقشهٔ ویدئوهای ساخته‌شده، از raw گیت‌هاب. */
/* نقشهٔ ویدئوها یک بار در هر اجرا خوانده می‌شود: چند بار خواندنش در یک دور
   هم کند است هم می‌تواند وسطِ کار عوض شود و دو تصمیمِ ناهمخوان بسازد. */
var _ytMapMemo = null;
function ytRenderMapCached_() {
  if (_ytMapMemo !== null) return _ytMapMemo;
  try { _ytMapMemo = ytRenderMap_(); } catch (e) { _ytMapMemo = null; }
  return _ytMapMemo;
}

function ytRenderMap_() {
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.YT_RENDER_MAP || 'docs/renders.json'),
                { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    var d = JSON.parse(res.getContentText());
    var m = (d && d.items) || null;
    return (m && typeof m === 'object') ? m : null;
  } catch (e) { return null; }
}

/**
 * بایت‌هایی که رسیدند واقعاً MP4 هستند یا نه.
 *
 * همان قاعدهٔ `musicFetch_`: نه پسوند، نه `Content-Type` — سرآیندِ خودِ
 * فایل. یک صفحهٔ ۴۰۴ی گیت‌هاب هم ۲۰۰ برنمی‌گرداند، ولی یک فایلِ نیمه‌کاره
 * برمی‌گرداند؛ و ویدئوی خرابی که در پوشه بنشیند، منتشر می‌شود.
 */
function ytMp4Ok_(blob) {
  var b = null;
  try { b = blob.getBytes(); } catch (e) { return { ok: false, why: 'بایت‌ها خوانده نشدند' }; }
  if (!b || b.length < 5000) {
    return { ok: false, why: 'فایل بسیار کوچک است (' + (b ? b.length : 0) + ' بایت)' };
  }
  var s = '';
  for (var i = 4; i < 8; i++) s += String.fromCharCode(b[i] & 0xFF);
  if (s !== 'ftyp') return { ok: false, why: 'MP4 نیست — نشانِ ftyp ندارد' };
  return { ok: true, why: '' };
}

/** یک ویدئو را از نشانی‌اش بردار و در پوشهٔ همان قسمت بگذار. */
function ytRenderFetch_(item, url) {
  var res = null;
  try {
    res = UrlFetchApp.fetch(String(url), { muteHttpExceptions: true, followRedirects: true });
  } catch (e) { return { ok: false, why: 'دانلود نشد: ' + String(e.message).slice(0, 80) }; }
  if (res.getResponseCode() !== 200) return { ok: false, why: 'کدِ ' + res.getResponseCode() };
  var blob = null;
  try { blob = res.getBlob(); } catch (e2) { return { ok: false, why: 'بایت‌ها خوانده نشدند' }; }
  var chk = ytMp4Ok_(blob);
  if (!chk.ok) return { ok: false, why: chk.why };

  var folder = null;
  try { folder = DriveApp.getFolderById(String(item.folderId || '')); } catch (e3) {}
  if (!folder) return { ok: false, why: 'پوشهٔ قسمت پیدا نشد' };
  var name = String(item.outName || ytVideoName_('قسمت ' + item.ep));
  try {
    var old = folder.getFilesByName(name);
    while (old.hasNext()) old.next().setTrashed(true);
    folder.createFile(blob.setName(name));
  } catch (e4) {
    return { ok: false, why: 'در پوشه نوشته نشد: ' + String(e4.message).slice(0, 80) };
  }
  return { ok: true, why: '' };
}

/** ویدئوهای آماده را از ریپو بردار. */
function ytRenderCollect_(budgetMs) {
  var out = { got: 0, tried: 0, why: '' };
  var d = ytRenderRead_();
  var pend = [];
  for (var p = 0; p < d.items.length; p++) {
    if (String(d.items[p].status || '') === 'در انتظار') pend.push(d.items[p]);
  }
  if (!pend.length) return out;
  /* اول اجازه و نشانی، بعد برداشت: ردیفی که بسته است اکشن نمی‌تواند بسازدش،
     و بی ساخته‌شدن هرگز به نقشه نمی‌رسد. */
  try {
    var fixed = ytRenderRefresh_();
    if (fixed) {
      logLine_('یوتیوب: ' + fixed + ' درخواستِ رندر نشانی و اجازهٔ موقت گرفت.');
      d = ytRenderRead_(); pend = [];
      for (var q = 0; q < d.items.length; q++) {
        if (String(d.items[q].status || '') === 'در انتظار') pend.push(d.items[q]);
      }
    }
  } catch (eRf) { logLine_('تازه‌سازیِ درخواست‌های رندر نشد: ' + eRf.message); }
  /* و خودِ صف هم باید خواندنی بماند — اکشن راهِ دیگری برای دیدنش ندارد. */
  try { ytQueueShare_(); } catch (eQs) {}
  /* برداشت **همیشه** نقشهٔ تازه می‌خواند، نه نسخهٔ کش‌شده: مصرف‌کننده باید
     تازه‌ترین حالت را ببیند. کش فقط برای `ytRenderAsk_` است که ممکن است در
     یک حلقه ده‌ها بار پرسیده شود. */
  var map = null;
  try { map = ytRenderMap_(); } catch (eMp) { map = null; }
  _ytMapMemo = map;                       // و همان تازه، کشِ همین اجرا می‌شود
  /* ══ شکستِ بی‌صدا در قلبِ زنجیره (۶٫۳۷) ══
   * اگر نقشه خوانده نشود، این تابع در سکوت برمی‌گشت: فراخوانش فقط
   * `if (yc.got)` را لاگ می‌کرد، پس «صفر برداشت» از «نتوانستم بخوانم»
   * جدا نمی‌شد. دو روز هیچ ویدئویی برداشته نشد و هیچ سطری نگفت چرا. */
  if (!map) {
    out.why = 'نقشهٔ ویدئوها (docs/renders.json) خوانده نشد';
    logLine_('یوتیوب: ' + out.why + ' — ' + pend.length +
             ' درخواست منتظر مانده و هیچ‌کدام برداشته نشد.');
    return out;
  }

  var cap = Math.max(1, Number(CFG.YT_COLLECT_MAX) || 3);
  var t0 = new Date().getTime();
  var budget = Math.max(20000, Number(budgetMs) || Number(CFG.YT_COLLECT_MS) || 120000);
  for (var i = 0; i < pend.length && out.got < cap; i++) {
    if (new Date().getTime() - t0 > budget) break;
    var rec = ytRenderBuilt_(pend[i], map);
    if (!rec) continue;
    out.tried++;
    var r = ytRenderFetch_(pend[i], rec.url);
    if (r.ok) {
      out.got++;
      ytRenderDone_(pend[i].show, pend[i].ep);
      ytRenderShare_(pend[i], false);
      logLine_('ویدئوی «' + pend[i].key + '» رسید و در پوشهٔ قسمت نشست.');
    } else {
      logLine_('ویدئوی «' + pend[i].key + '» برداشته نشد: ' + r.why);
      if (!out.why) out.why = pend[i].key + ': ' + r.why;
    }
  }
  /* «هیچ‌کدام آماده نبود» هم خبر است، نه سکوت. */
  if (!out.got && !out.tried && pend.length) {
    out.why = out.why || (pend.length + ' درخواست منتظر است ولی هیچ‌کدام هنوز ' +
                          'در نقشهٔ ویدئوها نیست');
    logLine_('یوتیوب: ' + out.why + '.');
  }
  return out;
}

/**
 * هر اشتراکی که کارش تمام شده یا کهنه شده، پس گرفته می‌شود.
 *
 * دو حالت، و دومی مهم‌تر است: ردیفی که «رسید» شده دیگر اشتراک لازم ندارد؛ و
 * ردیفی که هفته‌ها در انتظار مانده یعنی چیزی در زنجیره شکسته — و صوتش نباید
 * تا ابد با لینک خواندنی بماند. باز نگه داشتنِ چیزی که کسی منتظرش نیست، همان
 * نشتی است که هیچ‌کس نمی‌بیندش.
 */
function ytShareSweep_() {
  var d = ytRenderRead_(), now = new Date().getTime(), n = 0, changed = false;
  var maxD = Math.max(1, Number(CFG.YT_SHARE_DAYS) || 3);
  for (var i = 0; i < d.items.length; i++) {
    var it = d.items[i];
    if (!it.shared) continue;
    var done = String(it.status || '') !== 'در انتظار';
    var t = parseWhen_(String(it.sharedAt || it.at || ''));
    var old = !isNaN(t) && (now - t) / 86400000 > maxD;
    if (!done && !old) continue;
    ytRenderShare_(it, false);
    it.shared = false;
    it.unsharedAt = nowStr_();
    changed = true; n++;
  }
  if (changed) ytRenderSave_(d);
  return n;
}

/* ─────────────────── ۷) پلی‌لیست‌ها ───────────────────
 *
 * خواستهٔ صریح: «اگر در منو در قسمتِ اون مجموعه‌ها که شماره‌گذاری می‌کنم، هر
 * چیز شماره‌گذاری کردم و یا حتی تغییرش دادم، اینجا هم تو پلی‌لیست اثر بذاره و
 * تغییر کنه و به‌روز بشه.»
 *
 * پس منبعِ حقیقتِ ترتیب و نام، **رجیستریِ مجموعه‌هاست**، نه حافظهٔ یوتیوب. هر
 * شب مقایسه می‌شود و فقط تفاوت‌ها فرستاده می‌شوند — نه از سرِ صرفه‌جویی، بلکه
 * چون هر فراخوان سهمیه می‌خورد و سهمیه که تمام شود، آپلودِ فردا هم می‌ایستد.
 *
 * شناسهٔ پلی‌لیست در ستونِ «پلی‌لیست یوتیوب» همان ردیف می‌نشیند تا با یک نگاه
 * دیده شود — و در Properties هم آینه می‌شود تا خواندنِ رجیستری برای هر
 * فراخوان لازم نباشد.
 */
function ytPlMap_() {
  try { return JSON.parse(props_().getProperty(PK.YT_PL) || '{}') || {}; }
  catch (e) { return {}; }
}
function ytPlMapSave_(m) {
  try { props_().setProperty(PK.YT_PL, JSON.stringify(m)); } catch (e) {}
}

/** پلی‌لیستِ یک کلید را می‌سازد یا عنوانش را به‌روز می‌کند. برمی‌گرداند شناسه. */
function ytPlEnsure_(key, title, desc) {
  var yt = ytSvc_(); if (!yt) return '';
  var map = ytPlMap_(), rec = map[key] || null;
  var body = {
    snippet: { title: ytScrub_(String(title || '')).slice(0, 150),
               description: ytScrub_(String(desc || '')).slice(0, 4500),
               defaultLanguage: CFG.YT_LANG || 'fa' },
    status: { privacyStatus: 'public' }
  };
  if (rec && rec.id) {
    // نام عوض شده؟ فقط آن‌وقت به‌روزرسانی — وگرنه هر شب پنجاه واحد بی‌دلیل
    if (String(rec.title || '') === String(body.snippet.title)) return rec.id;
    if (!ytQuotaTake_(YT_COST.playlistsUpdate, false)) return rec.id;
    try {
      body.id = rec.id;
      yt.Playlists.update(body, 'snippet,status');
      rec.title = body.snippet.title; rec.at = nowStr_();
      map[key] = rec; ytPlMapSave_(map);
      logLine_('پلی‌لیستِ «' + body.snippet.title + '» نامش به‌روز شد.');
    } catch (e) { logLine_('به‌روزرسانیِ نامِ پلی‌لیست نشد: ' + e.message); }
    return rec.id;
  }
  if (!ytQuotaTake_(YT_COST.playlistsInsert, false)) return '';
  try {
    var made = yt.Playlists.insert(body, 'snippet,status');
    var id = made && made.id ? String(made.id) : '';
    if (!id) return '';
    map[key] = { id: id, title: body.snippet.title, at: nowStr_() };
    ytPlMapSave_(map);
    logLine_('پلی‌لیستِ تازه ساخته شد: «' + body.snippet.title + '».');
    return id;
  } catch (e2) {
    logLine_('ساختِ پلی‌لیست نشد: ' + e2.message);
    return '';
  }
}

function ytPlUrl_(id) {
  return id ? 'https://www.youtube.com/playlist?list=' + String(id) : '';
}

/** ویدئوهای یک پلی‌لیست، به ترتیبِ فعلی. */
function ytPlItems_(plId) {
  var yt = ytSvc_(); if (!yt || !plId) return [];
  var out = [], token = null, guard = 0;
  do {
    if (!ytQuotaTake_(YT_COST.itemsList, false)) break;
    var r = null;
    try {
      r = yt.PlaylistItems.list('id,snippet', { playlistId: plId, maxResults: 50,
                                                pageToken: token || undefined });
    } catch (e) { break; }
    var items = (r && r.items) || [];
    for (var i = 0; i < items.length; i++) {
      out.push({ id: items[i].id,
                 videoId: String(((items[i].snippet || {}).resourceId || {}).videoId || ''),
                 position: Number((items[i].snippet || {}).position) || 0 });
    }
    token = r && r.nextPageToken;
  } while (token && ++guard < 10);
  return out;
}

/**
 * ویدئو را در جای درستِ پلی‌لیست می‌گذارد — یا اگر هست، جابه‌جایش می‌کند.
 * هیچ‌وقت حذف نمی‌کند: حذف از پلی‌لیست کارِ آدم است، نه کارِ یک همگام‌سازیِ شبانه.
 */
function ytPlPlace_(plId, videoId, wantPos, existing) {
  var yt = ytSvc_(); if (!yt || !plId || !videoId) return 'رد';
  var have = null;
  for (var i = 0; i < (existing || []).length; i++) {
    if (existing[i].videoId === videoId) { have = existing[i]; break; }
  }
  if (have) {
    if (have.position === wantPos) return 'سرِ جایش';
    if (!ytQuotaTake_(YT_COST.itemsUpdate, false)) return 'سهمیه';
    try {
      yt.PlaylistItems.update({ id: have.id, snippet: {
        playlistId: plId, position: wantPos,
        resourceId: { kind: 'youtube#video', videoId: videoId } } }, 'snippet');
      return 'جابه‌جا شد';
    } catch (e) { return 'نشد: ' + String(e.message).slice(0, 60); }
  }
  if (!ytQuotaTake_(YT_COST.itemsInsert, false)) return 'سهمیه';
  try {
    yt.PlaylistItems.insert({ snippet: {
      playlistId: plId, position: wantPos,
      resourceId: { kind: 'youtube#video', videoId: videoId } } }, 'snippet');
    return 'افزوده شد';
  } catch (e2) { return 'نشد: ' + String(e2.message).slice(0, 60); }
}

/* ─────────────────── ۸) ثبت در شیت — یک ردیف برای هر تلاش ───────────────────
 *
 * موفق و ناموفق، هر دو. همان درسی که تبِ «کاربردِ جزوه» داد: `_STATUS.json`
 * می‌گوید «الان چند تا منتشر شده»؛ سؤالی که وقتی چیزی خراب می‌شود می‌پرسی
 * این است که «از کِی؟» و «کدام قسمت چه خطایی داد؟» — و آن را فقط تاریخچه
 * جواب می‌دهد.
 *
 * این تب در عینِ حال **حافظهٔ انتشار** هم هست: «کدام قسمت قبلاً رفته؟» از
 * همین‌جا خوانده می‌شود، نه از جست‌وجوی یوتیوب (که صد واحد سهمیه می‌خورد).
 */
/** خلاصهٔ یک‌خطیِ سهمِ گویندگان، برای ستونِ تب: «آرش ۵۹٪ · نگار ۳۹٪». */
function castShare_(timeline) {
  var p = [];
  for (var i = 0; i < (timeline || []).length; i++) {
    p.push(String(timeline[i].voice) + ' ' + faDigitsOut_(String(timeline[i].pct)) + '٪');
  }
  return p.join(' · ');
}

var YT_HEADERS = ['تاریخ', 'برنامه', 'قسمت', 'مجموعه', 'عنوانِ یوتیوب',
                  'شناسهٔ ویدئو', 'لینک', 'وضعیت انتشار', 'پلی‌لیست',
                  'جای در پلی‌لیست', 'کاور', 'فصل‌ها', 'برچسب‌ها',
                  'نویسهٔ کپشن', 'نشتیِ خصوصی', 'نتیجه', 'شرح',
                  // شکلِ صوتِ منبع: «کامل» یا «یکجا ×۲». قسمتِ دوفایلی باید
                  // در یک ویدئو بیاید و این ستون تنها جایی است که می‌شود
                  // دید واقعاً چند تکه چسبانده شده.
                  'صوتِ منبع', 'مدت',
                  // سهمِ زمانیِ هر گوینده — تا بشود در طولِ زمان سنجید کدام
                  // صدا با کدام بازخورد همراه بوده. یک ستون، نه یک تبِ تازه:
                  // کنارِ نمایش و پسندِ همان قسمت معنا دارد، جدا از آن نه.
                  'گویندگان'];
var YU = { AT: 1, SHOW: 2, EP: 3, SERIES: 4, TITLE: 5, VID: 6, URL: 7, PRIV: 8,
           PL: 9, POS: 10, THUMB: 11, CHAPS: 12, TAGS: 13, DESC: 14,
           LEAK: 15, RESULT: 16, NOTE: 17, AUDIO: 18, DUR: 19, CAST: 20 };

/**
 * ══ «Sat Dec 30 1899 14:41:00 GMT+0341» (۶٫۲۹) ══
 * ستونِ «تاریخ» در تبِ انتشار گاهی به‌شکلِ «ساعت» ذخیره می‌شود؛ آن‌وقت شیت
 * مقدارِ برگشتی را یک Date با مبدأِ ۱۸۹۹ می‌دهد و `String(...)` همان را
 * عیناً در ایمیل چاپ می‌کند. صاحبِ برنامه این را در کارنامهٔ روزانه دید.
 *
 * ولی چاپِ بد کوچک‌ترین بخشِ ماجرا بود: `ytDigest_` همان مقدار را
 * `parseWhen_` می‌کرد، ۱۸۹۹ می‌گرفت، و ردیف را «قدیمی‌تر از پنجره» حساب
 * می‌کرد. یعنی ویدئویی که همین امروز منتشر شده بود، **از کارنامه غایب
 * می‌شد** — و کارنامه‌ای که چیزی را جا بیندازد، بدتر از نبودنش است.
 *
 * پس تاریخِ ناخوانا نه چاپ می‌شود نه بی‌صدا کنار گذاشته: شمرده می‌شود و
 * گفته می‌شود. خودِ سلول‌های قدیمی دست نمی‌خورند — بازنویسیِ دادهٔ ثبت‌شده
 * برای زیباترشدنِ یک گزارش، معامله‌ای است که این ریپو نمی‌کند.
 */
/* همان بیماریِ ۶٫۲۹، این بار در ستونِ «مدت» (۶٫۵۴): «13:55» در سلول، شیت
   را به Date با مبدأ ۱۸۹۹ می‌برد و String(...) همان
   «Sat Dec 30 1899 13:55:00 GMT+0341» را در کارنامهٔ ایمیل چاپ می‌کرد —
   کنارِ هر ویدئو. سلول دست نمی‌خورد؛ فقط همان متنِ دیوارساعتی برمی‌گردد. */
function ytDurText_(v) {
  if (v instanceof Date) {
    try {
      return Utilities.formatDate(v, CFG.TIMEZONE, 'H:mm:ss').replace(/:00$/, '');
    } catch (e) { return ''; }
  }
  return String(v === null || v === undefined ? '' : v);
}

function ytWhen_(v) {
  var out = { ms: NaN, text: '', undated: false };
  try {
    if (v instanceof Date) {
      if (v.getFullYear() < 1990) {
        out.undated = true;
        out.text = Utilities.formatDate(v, CFG.TIMEZONE, 'HH:mm') + ' (بی‌تاریخ)';
        return out;
      }
      out.ms = v.getTime();
      out.text = Utilities.formatDate(v, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
      return out;
    }
    var s = String(v === null || v === undefined ? '' : v).trim();
    if (!s) return out;
    var t = parseWhen_(s);
    if (!isNaN(t) && new Date(t).getFullYear() < 1990) {
      out.undated = true;
      out.text = Utilities.formatDate(new Date(t), CFG.TIMEZONE, 'HH:mm') + ' (بی‌تاریخ)';
      return out;
    }
    out.ms = t; out.text = s;
  } catch (e) {}
  return out;
}

function ytLog_(hub, row) {
  try {
    var sh = ensureTab_(hub || getHub_(), CFG.YT_TAB || 'انتشار در یوتیوب', YT_HEADERS);
    appendBlock_(sh, [[nowStr_(), String(row.show || ''), String(row.ep || ''),
                       String(row.series || ''), String(row.title || ''),
                       String(row.videoId || ''), String(row.url || ''),
                       String(row.privacy || ''), String(row.playlist || ''),
                       String(row.position === undefined ? '' : row.position),
                       String(row.thumb || ''), String(row.chapters || 0),
                       String(row.tags || 0), String(row.descChars || 0),
                       String(row.leak || ''), String(row.result || ''),
                       String(row.note || ''), String(row.audioKind || ''),
                       String(row.duration || ''),
                       String(row.cast || '')]], YT_HEADERS.length);
    return true;
  } catch (e) { logLine_('ثبتِ انتشارِ یوتیوب نوشته نشد: ' + e.message); return false; }
}

/**
 * نامِ برنامه را به **کلیدِ داخلی** برمی‌گرداند.
 *
 * ══ چرا لازم شد ══
 * `ytLog_` در ستونِ «برنامه» نامِ *نمایشی* را می‌نویسد («درس‌نامه»)، ولی
 * همهٔ مصرف‌کننده‌های داخلی با کلید کار می‌کنند («special»). این دو هرگز
 * با هم برابر نمی‌شدند و نتیجه‌اش دو خرابیِ بی‌صدا بود:
 *
 *   • `ytPublished_` نگاشتی می‌ساخت که هیچ جست‌وجویی به آن نمی‌خورد، پس
 *     قسمتی که **قبلاً منتشر شده بود** دوباره به صف می‌رفت و دوباره آپلود
 *     می‌شد — ویدئوی تکراری روی کانال، بی هیچ خطایی.
 *   • و شمارندهٔ «تسلیم» هرگز فعال نمی‌شد، پس قسمتی که همیشه شکست می‌خورد
 *     هر شب دوباره امتحان می‌شد: ۱۶۰۰ واحد سهمیه در هر تلاش.
 *
 * تبدیل در **خواندن** انجام می‌شود نه در نوشتن، چون ستون را آدم هم
 * می‌خواند و «درس‌نامه» برایش معنا دارد و «special» نه. و هر دو شکل
 * پذیرفته می‌شوند تا ردیف‌های قدیمی و تازه یکجا کار کنند.
 */
function ytShowKey_(v) {
  var s = String(v === undefined || v === null ? '' : v).trim();
  if (s === ENRICH_SHOW_SPECIAL || s === String(CFG.SPECIAL_SHOW_NAME || '\u0000')) {
    return ENRICH_SHOW_SPECIAL;
  }
  if (s === ENRICH_SHOW_VARIETY || s === String(CFG.SHOW_NAME || '\u0000')) {
    return ENRICH_SHOW_VARIETY;
  }
  return s;
}

/**
 * چه چیزی قبلاً منتشر شده — نگاشتِ «show:ep» به آخرین حالش.
 * از تب خوانده می‌شود، با **یک** خواندن. جست‌وجوی یوتیوب صد واحد سهمیه دارد
 * و اصلاً لازم نیست: خودمان می‌دانیم چه فرستاده‌ایم.
 */
function ytPublished_(hub) {
  var map = Object.create(null);
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.YT_TAB || 'انتشار در یوتیوب');
    if (!sh || sh.getLastRow() < 2) return map;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, YT_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var k = ytShowKey_(v[i][YU.SHOW - 1]) + ':' + String(v[i][YU.EP - 1] || '');
      if (k === ':') continue;
      var cur = map[k] || { tries: 0, videoId: '', url: '', privacy: '', at: '',
                            result: '', series: '' };
      cur.tries++;
      cur.at = ytWhen_(v[i][YU.AT - 1]).text;
      cur.result = String(v[i][YU.RESULT - 1] || '');
      cur.series = String(v[i][YU.SERIES - 1] || '') || cur.series || '';
      var vid = String(v[i][YU.VID - 1] || '');
      if (vid) {
        cur.videoId = vid;
        cur.url = String(v[i][YU.URL - 1] || '');
        cur.privacy = String(v[i][YU.PRIV - 1] || '');
        cur.title = String(v[i][YU.TITLE - 1] || '');
        cur.tries = 0;                 // موفقیت، سابقهٔ تلاش را صفر می‌کند
      }
      map[k] = cur;
    }
  } catch (e) {}
  return map;
}

/** قسمتی که چند بار پشتِ‌هم شکست خورده، دیگر به صف برنمی‌گردد. */
function ytGaveUp_(pub, show, ep) {
  // نامِ برنامه از هر دو شکل پذیرفته می‌شود. مرزی که هر فراخوان باید
  // یادش باشد، همان مرزی است که فردا یکی یادش می‌رود.
  var r = pub[ytShowKey_(show) + ':' + String(ep)];
  if (!r || r.videoId) return false;
  return r.tries >= Math.max(1, Number(CFG.YT_TRY_MAX) || 3);
}

/* ─────────────────── ۹) صف و کاوشِ گذشته ───────────────────
 * صف با *طولِ رشته* بریده می‌شود نه با شمارِ ردیف، چون Properties سقفِ نه
 * کیلوبایتی دارد؛ و از **انتها** بریده می‌شود، تا قدیمی‌ترین‌ها بمانند —
 * همان اشتباهی که یک بار در صفِ جزوه رخ داد و درس‌های ۱ تا ۲۰ را انداخت.
 */
function ytDueList_() {
  try {
    var a = JSON.parse(props_().getProperty(PK.YT_DUE) || '[]');
    return Object.prototype.toString.call(a) === '[object Array]' ? a : [];
  } catch (e) { return []; }
}

function ytDueSave_(list) {
  var l = list || [];
  var body = JSON.stringify(l);
  while (body.length > 8000 && l.length > 1) { l = l.slice(0, l.length - 1); body = JSON.stringify(l); }
  try { props_().setProperty(PK.YT_DUE, body); } catch (e) {}
  return l.length;
}

function ytDueAdd_(show, ep, folderId, seriesKey, seriesName) {
  var l = ytDueList_(), k = String(show) + ':' + String(ep);
  for (var i = 0; i < l.length; i++) if (String(l[i].key) === k) return 0;
  l.push({ key: k, show: String(show), ep: String(ep),
           folderId: String(folderId || ''),
           // هویتِ مجموعه با خودِ ردیف می‌آید. بی این، مسیرِ آپلود ناچار بود
           // پلی‌لیست را با *نام* کلید بزند و مسیرِ همگام‌سازی با *کلید* —
           // یعنی یک مجموعه دو پلی‌لیست می‌گرفت (باگِ ۵٫۹۷).
           seriesKey: String(seriesKey || ''), seriesName: String(seriesName || ''),
           at: nowStr_() });
  ytDueSave_(ytDueOrder_(l));
  return 1;
}

/**
 * ترتیبِ صف: قدیمی‌ترین اول.
 *
 * ══ چرا لازم شد ══
 * `getFolders()` هیچ ترتیبی را تضمین نمی‌کند. صفی که از آن پر شود یعنی
 * قسمتِ ۱۲ ممکن است پیش از ۳ منتشر شود — و تاریخچهٔ کانال، که آدم‌ها از
 * بالا به پایین می‌خوانندش، بی‌معنا شود.
 *
 * جایِ پلی‌لیست جداگانه از شمارهٔ قسمت حساب می‌شود، پس **حتی اگر ترتیبِ
 * آپلود به‌هم بخورد، ترتیبِ پلی‌لیست درست می‌ماند.** این یکی برای مرتب‌بودنِ
 * خودِ آپلود است، نه برای درستیِ پلی‌لیست: دو نگهبانِ مستقل برای یک خواسته.
 */
function ytDueOrder_(list) {
  /* ══ یک برنامه، برنامهٔ دیگر را قحطی می‌داد (۶٫۵۳) ══
   * مرتب‌سازی اول بر نامِ برنامه بود، و `'special' < 'variety'` است. یعنی
   * **هر** قسمتِ درس‌نامه پیش از **هر** قسمتِ «از همه جا از همه رنگ»
   * می‌نشست. با سقفِ سه آپلود در شب و ده‌ها قسمتِ درس‌نامه در صف، نوبت
   * هرگز به برنامهٔ دوم نمی‌رسید — و هیچ خطایی هم نمی‌داد: صف مرتب بود،
   * فقط همیشه از یک سر خورده می‌شد.
   *
   * ترتیبِ **درونِ** هر برنامه دست‌نخورده می‌ماند (مجموعه، بعد شمارهٔ قسمت)،
   * چون جای ویدیو در پلی‌لیست به آن بند است. فقط برنامه‌ها یکی‌درمیان
   * می‌شوند. سهمِ ثابت ندادیم: اگر یکی خالی شود، دیگری همهٔ سقف را می‌گیرد. */
  var by = Object.create(null), shows = [];
  var l = (list || []);
  for (var i = 0; i < l.length; i++) {
    var sh = String(l[i].show || '');
    if (!by[sh]) { by[sh] = []; shows.push(sh); }
    by[sh].push(l[i]);
  }
  shows.sort();
  for (var g = 0; g < shows.length; g++) {
    by[shows[g]].sort(function (a, b) {
      var ka = String(a.seriesName || a.seriesKey || ''), kb = String(b.seriesName || b.seriesKey || '');
      if (ka !== kb) return ka < kb ? -1 : 1;
      return (Number(a.ep) || 0) - (Number(b.ep) || 0);
    });
  }
  var out = [], idx = 0, more = true;
  while (more) {
    more = false;
    for (var j = 0; j < shows.length; j++) {
      var arr = by[shows[j]];
      if (idx < arr.length) { out.push(arr[idx]); more = true; }
    }
    idx++;
  }
  return out;
}

/**
 * کلیدِ پلی‌لیست — **یک** تعریف، هر تعداد خواننده.
 * کلیدِ رجیستری بر نام مقدم است: نام عوض می‌شود (و باید هم بشود، چون
 * صاحبِ برنامه همان‌جا تغییرش می‌دهد)، ولی پلی‌لیست باید همان بماند.
 */
function ytPlKey_(show, seriesKey, seriesName) {
  if (String(show) !== ENRICH_SHOW_SPECIAL) return 'show:' + ENRICH_SHOW_VARIETY;
  return 'series:' + String(seriesKey || seriesName || '');
}

function ytDueDrop_(key) {
  var l = ytDueList_(), out = [];
  for (var i = 0; i < l.length; i++) if (String(l[i].key) !== String(key)) out.push(l[i]);
  ytDueSave_(out);
}

/** شمارهٔ قسمت از نامِ پوشه («قسمت 0019 — …»). */
function ytEpNumOf_(folderName) {
  var m = faDigits_(String(folderName || '')).match(/قسمت\s*0*(\d{1,5})/);
  return m ? String(parseInt(m[1], 10)) : '';
}

/**
 * پوشهٔ یک برنامه — **بی ساختن**.
 *
 * ══ باگی که ۲۰ قسمت را نامرئی کرده بود (۶٫۹) ══
 * `ytBackfill_` و `ytFolderOf_` پوشهٔ «از همه جا از همه رنگ» را با
 * `CFG.SHOW_NAME` می‌جستند — که **نامِ نمایشیِ برنامه** است، نه نامِ پوشه.
 * نامِ پوشه `CFG.VARIETY_FOLDER` است: «پادکست — از همه جا از همه رنگ». و
 * `showFolder_` اگر پیدا نکند **می‌سازد**؛ پس اولین اجرای انتشار یک پوشهٔ
 * خالیِ تازه در ریشهٔ OUTPUT ساخت، صفرتا قسمت در آن دید، و هیچ خطایی نداد.
 * نتیجه: هر ۲۰ قسمتِ گذشتهٔ آن برنامه هرگز به صفِ یوتیوب نرفتند، و از بیرون
 * همه‌چیز سالم به‌نظر می‌رسید.
 *
 * دو درسِ همیشگیِ این ریپو، هر دو در یک باگ:
 * • **خواندنی که می‌سازد، خواندن نیست.** یک تابعِ جست‌وجو که در نبودِ هدف
 *   هدف را می‌سازد، «پیدا نشد» را به «خالی بود» تبدیل می‌کند — و آن دو
 *   زمین تا آسمان فرق دارند.
 * • **قرینه‌ای که یک بار درست شود.** همان اشتباه در دو تابع بود؛ پس چاره
 *   یک تعریفِ مشترک است، نه دو اصلاحِ جدا.
 */
function ytShowFolder_(name) {
  try {
    var it = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).getFoldersByName(String(name));
    if (it.hasNext()) return it.next();
  } catch (e) {}
  logLine_('یوتیوب: پوشهٔ برنامهٔ «' + name + '» در OUTPUT پیدا نشد.');
  return null;
}

/**
 * کاوشِ قسمت‌های گذشته: هر پوشه‌ای که ساخته شده ولی هنوز منتشر نشده، به صف.
 * مکان‌نما دارد چون دو برنامه ده‌ها پوشه دارند و یک اجرا جا نمی‌دهدشان.
 */
function ytBackfill_(maxWalk) {
  var out = { walked: 0, queued: 0, skipped: 0, gaveUp: 0, wrapped: false, names: [] };
  if (!ytOn_()) return out;
  var cap = Math.max(1, Number(maxWalk) || Number(CFG.YT_BACKFILL_WALK) || 12);
  var hub = getHub_();
  var pub = ytPublished_(hub);
  var due = Object.create(null);
  var dl = ytDueList_();
  for (var d = 0; d < dl.length; d++) due[dl[d].key] = 1;

  /* دو برنامه، دو چیدمانِ متفاوتِ پوشه — و این تفاوت جایی است که کدِ
     «هوشمند» معمولاً می‌لغزد:
       «از همه جا از همه رنگ» → پوشهٔ برنامه ← پوشهٔ قسمت
       «درس‌نامه»            → پوشهٔ برنامه ← دستهٔ محتوا ← مجموعه ← قسمت
     پس درس‌نامه از رجیستری خوانده می‌شود (که پوشهٔ هر مجموعه را دارد)، نه با
     پیمایشِ کورِ درخت. رجیستری هم همان جایی است که نام و شمارهٔ مجموعه — و
     در نتیجه نام و ترتیبِ پلی‌لیست — از آن می‌آید. */
  var walk = [];
  try {
    var vf = ytShowFolder_(CFG.VARIETY_FOLDER);
    if (vf) {
      var it = vf.getFolders();
      while (it.hasNext()) {
        var f1 = it.next();
        walk.push({ show: ENRICH_SHOW_VARIETY, folder: f1, series: '', seriesKey: '' });
      }
    }
  } catch (e1) { logLine_('کاوشِ پوشهٔ «' + CFG.SHOW_NAME + '» نشد: ' + e1.message); }

  if (CFG.SPECIAL_ENABLED) {
    try {
      var reg = readSeriesReg_(hub);
      for (var r = 0; r < reg.rows.length; r++) {
        var fid = String(reg.rows[r].vals[SC.FOLDER - 1] || '');
        if (!fid) continue;
        var sf = null;
        try { sf = DriveApp.getFolderById(fid); } catch (eS) { continue; }
        var eps = sf.getFolders();
        while (eps.hasNext()) {
          walk.push({ show: ENRICH_SHOW_SPECIAL, folder: eps.next(),
                      series: String(reg.rows[r].vals[SC.NAME - 1] || ''),
                      seriesKey: String(reg.rows[r].key || '') });
        }
      }
    } catch (e2) { logLine_('کاوشِ مجموعه‌های درس‌نامه نشد: ' + e2.message); }
  }

  /* ترتیبِ پیمایش هم باید قطعی باشد، نه ترتیبی که درایو اتفاقی برمی‌گرداند —
     وگرنه مکان‌نما بی‌معنا می‌شود: هر شب «نفرِ بیست‌ویکم» کسِ دیگری است و
     بعضی پوشه‌ها هرگز نوبتشان نمی‌رسد. (همان اشتباهی که در وارسیِ روزانهٔ
     جزوه رخ داد و با پنجرهٔ چرخان درست شد.) */
  walk.sort(function (a, b) {
    var sa = String(a.show || ''), sb = String(b.show || '');
    if (sa !== sb) return sa < sb ? -1 : 1;
    var ka = String(a.series || ''), kb = String(b.series || '');
    if (ka !== kb) return ka < kb ? -1 : 1;
    return (Number(ytEpNumOf_(a.folder.getName())) || 0) -
           (Number(ytEpNumOf_(b.folder.getName())) || 0);
  });

  var cur = 0;
  try { cur = Number(props_().getProperty(PK.YT_SCAN) || 0) || 0; } catch (e3) {}
  if (cur >= walk.length) cur = 0;

  var i = cur;
  while (out.walked < cap && i < walk.length) {
    var w = walk[i]; i++;
    var ep = ytEpNumOf_(w.folder.getName());
    if (!ep) { out.skipped++; continue; }
    out.walked++;
    var key = w.show + ':' + ep;
    if (pub[key] && pub[key].videoId) { out.skipped++; continue; }
    if (ytGaveUp_(pub, w.show, ep)) { out.gaveUp++; continue; }
    if (due[key]) { out.skipped++; continue; }
    if (ytDueAdd_(w.show, ep, w.folder.getId(), w.seriesKey, w.series)) {
      out.queued++;
      if (out.names.length < 5) out.names.push((w.series || CFG.SHOW_NAME) + ' ' + ep);
    }
  }
  try { props_().setProperty(PK.YT_SCAN, String(i >= walk.length ? 0 : i)); } catch (e4) {}

  try { props_().setProperty(PK.YT_SCAN, '0'); } catch (e5) {}
  out.wrapped = true;
  return out;
}

/* ─────────────────── ۱۰) انتشارِ یک قسمت ───────────────────
 *
 * ترتیب عمدی است و هر گام دلیلی دارد:
 *   ۱) پروندهٔ قسمت را بخوان (متن، بخش‌ها، منابع، مدت)
 *   ۲) کاور بساز — چون درخواستِ رندر بدونش ناقص است
 *   ۳) ویدئو هست؟ نه → درخواستِ رندر بگذار و برگرد. این «شکست» نیست.
 *   ۴) متادیتا از مدل، و بعد **پاک‌سازی و وارسیِ نشتی در کد**
 *   ۵) آپلود به‌صورت unlisted
 *   ۶) کاور، پلی‌لیست
 *   ۷) وارسیِ دوبارهٔ نشتی روی متنِ نهایی → و تازه بعدش عمومی
 * گامِ هفتم جداست تا اگر چیزی نشت کرده باشد، ویدئو در unlisted بماند و یک
 * یافته ثبت شود — نه اینکه عمومی شود و بعد اصلاح.
 */
function ytEpisodeMeta_(folder) {
  var names = ['_episode.json', '_special.json'];
  for (var i = 0; i < names.length; i++) {
    try {
      var it = folder.getFilesByName(names[i]);
      if (it.hasNext()) return JSON.parse(it.next().getBlob().getDataAsString());
    } catch (e) {}
  }
  return null;
}

/** مدتِ ویدئو از اندازهٔ فایلِ صوتی — دقیق‌تر از هر تخمینی از روی متن. */
function ytSecondsOf_(files) {
  /* مجموعِ **همهٔ** بخش‌ها. یک قسمتِ دوفایلی که مدتش از یک فایل حساب شود،
     هم فصل‌بندی‌اش غلط می‌شود هم کپشنش — و هیچ‌کدام خطا نمی‌دهند. */
  var arr = Object.prototype.toString.call(files) === '[object Array]' ? files : [files];
  var sec = 0;
  for (var i = 0; i < arr.length; i++) {
    try {
      var b = (arr[i] && arr[i].getSize) ? arr[i].getSize() : 0;
      if (b > 44) sec += (b - 44) / ((Number(CFG.SAMPLE_RATE) || 24000) * 2);
    } catch (e) {}
  }
  return Math.max(0, Math.round(sec));
}

/**
 * نقشهٔ انتشارِ یک قسمت — یک بار ساخته می‌شود و در `_yt.json`ِ همان پوشه
 * می‌مانَد.
 *
 * سه دلیل، و هر سه واقعی:
 *  ۱) **کاور پیش از ویدئو لازم است** (باید همراهِ درخواستِ رندر برود) ولی
 *     عنوان و کپشن هنگامِ آپلود. اگر هر کدام مدل را جدا صدا بزنند، هر قسمت
 *     دو فراخوان می‌گیرد و — بدتر — کاور و عنوان از دو پاسخِ متفاوت می‌آیند
 *     و ممکن است با هم نخوانند.
 *  ۲) `ytUploadOne_` تا رسیدنِ ویدئو ممکن است چند شب پشتِ‌هم اجرا شود. بی
 *     حافظه، هر شب یک فراخوانِ مدل هدر می‌رفت.
 *  ۳) **قابلِ تغییر بودن.** این فایل جایی است که آدم (یا ناظر) می‌تواند
 *     عنوان و کپشن را دستی درست کند؛ `runYouTubeRedo` همان را دوباره
 *     می‌نشاند روی ویدئوی منتشرشده. سؤالِ «اگر اشتباه زده باشه قابلِ
 *     تغییره؟» جوابش همین فایل است.
 */
function ytPlanName_() { return CFG.YT_PLAN_FILE || '_yt.json'; }

function ytPlanRead_(folder) {
  try {
    var it = folder.getFilesByName(ytPlanName_());
    if (it.hasNext()) {
      var d = JSON.parse(it.next().getBlob().getDataAsString());
      if (d && d.title) return d;
    }
  } catch (e) {}
  return null;
}

function ytPlanWrite_(folder, plan) {
  var body = JSON.stringify(plan, null, 1);
  try {
    var it = folder.getFilesByName(ytPlanName_());
    if (it.hasNext()) { var f = it.next(); f.setContent(body); return f; }
    return folder.createFile(Utilities.newBlob(body, 'application/json', ytPlanName_()));
  } catch (e) { logLine_('نقشهٔ یوتیوب ذخیره نشد: ' + e.message); return null; }
}

/* ═══════════ از برنامه به فایل: کارت‌های تصویر (۷٫۹۳) ═══════════
 *
 * ۷٫۹۲ **تصمیم** را ساخت (`ytVisPlan_`): کدام بخش چه تصویری، با چه متنی، با
 * چه سهمی از زمان. این‌جا آن تصمیم فایل می‌شود — یک PNG برای هر مورد، در
 * زیرپوشهٔ «تصویرها»ی خودِ همان قسمت، که خواستهٔ صریحِ بندِ ۸ است.
 *
 * ══ چرا Slides، و نه چیزِ دیگری ══
 * Apps Script هیچ کتابخانهٔ تصویری ندارد و `drawtext`ِ ffmpeg در ساختِ
 * `imageio-ffmpeg`ِ رانر نیست — پس متن باید **پیش از** ویدئو روی تصویر
 * سوخته باشد. Slides تنها ابزاری است که در دسترسِ موتور است و فارسیِ
 * راست‌به‌چپ را هم درست می‌چیند. و مسیرش تازه نیست: کاورِ هر قسمت، کاورِ هر
 * پلی‌لیست و بنرِ کانال از ۶٫۵ همین راه را می‌روند.
 *
 * ══ یک ارائه برای هر قسمت، نه یکی برای هر کارت ══
 * دوازده ارائهٔ جدا یعنی دوازده `presentations.create` و دوازده فایلِ
 * دورریختنی. یک ارائه با دوازده صفحه، یک ساخت است و `saveAndClose` همهٔ
 * ویرایش‌ها را یک‌جا می‌فرستد. صادرات همچنان صفحه‌به‌صفحه است، چون نقطهٔ
 * پایانیِ PNG یک صفحه می‌دهد.
 *
 * ══ و آنچه این‌جا **نیست** ══
 * آوردنِ عکسِ آزاد و کلیپِ ویدئو. سنجشِ گامِ صفر (`tools/visprobe.py`) گفت
 * تصویرِ آزاد شدنی است و ویدئوی آزاد عملاً نه (از سیزده نامزد، صفر قبول).
 * تا آن لایه نیاید، موردی که مدل «عکس» یا «ویدئو» خواسته **کارت می‌شود** —
 * و همان‌جا در `_visuals.json` ثبت می‌شود که چه خواسته شده بود (`kind`) و چه
 * ساخته شد (`via`). یک جایگزینیِ بی‌ثبت، همان چیزی است که بعداً کسی حساب
 * نمی‌کند چند تا بوده.
 */

/* ═══════════ سبکِ تصویرِ هر مجموعه (۷٫۹۶) ═══════════
 *
 * خواستهٔ صریحِ صاحبِ برنامه: «بشه … برای مجموعه‌ها انتخاب کنم … و البته
 * برای مجموعه‌ها پیشنهادِ خودت رو هم تو اون مجموعه بنویس ولی بشه خودم هم
 * تغییر بدم و انتخاب کنم».
 *
 * ══ و **سبک واقعاً کارت را عوض می‌کند** ══
 * این مهم‌ترین خطِ این نسخه است. این پرونده بیش از هر شکلِ دیگری این را ثبت
 * کرده: تحلیلی که نوشته شد و به هیچ تصمیمی وصل نبود، یا برچسبی که ورودی
 * نداشت. یک ستونِ «سبک» که فقط یک واژه در شیت باشد و رنگ و قابِ کارت را
 * عوض نکند، دقیقاً همان شکل است. پس `lvStyleFind_` رنگ و قاب می‌دهد و
 * `lvCardDraw_` از آن می‌سازد.
 *
 * ══ و اگر سبک عوض شد، کارت‌های ساخته‌شده از نو ساخته می‌شوند ══
 * `_visuals.json` سبکِ روزِ ساختش را نگه می‌دارد. سبکِ تازه یعنی همه از نو —
 * وگرنه تنظیمی که هیچ اثرِ دیدنی ندارد، تنظیم نیست (درسِ ۷٫۸۶: چیزی که برای
 * سنجشِ یک پارامتر هست، باید آن پارامتر در شناسه‌اش باشد).
 * ولی **«نمی‌دانیم» با «عوض شد» یکی نیست**: اگر خواندنِ سبک شکست بخورد،
 * رشتهٔ خالی می‌آید و آن یعنی «همان که ذخیره شده» — نه یک بازسازیِ کاملِ
 * بی‌دلیل.
 *
 * ══ ترکیبی: یک جورش قشنگ در می‌آید و یک جورش نه ══
 * او پرسید «ایا حالت های ترکیبی هم میشه … و ایا قشنگ در میاد». جواب در
 * `docs/lesson_visuals_plan.md` سنجیده شد: **ترکیبِ نقش‌ها** (کارتِ تمیزِ
 * تایپوگرافیک + نقشِ مجموعه) قشنگ در می‌آید و همان حالتی است که خودِ
 * نوت‌بوک هم می‌کند؛ پس یک گزینهٔ صریح است: «ترکیبی». ولی **دو سبکِ هنری در
 * یک ویدئو** ناهم‌خوان می‌شود و به چشمِ بیننده «اشتباه» می‌آید نه «تنوع» —
 * پس خانه‌ای که دو سبک با «+» داشته باشد **با اسم رد می‌شود**، نه اینکه
 * بی‌صدا اولی را بردارد.
 */

/* هر سبک یک `gen` هم دارد: **حال‌وهوای تصویرِ ساخته‌شده** (لایهٔ ۳، ۷٫۹۸).
   بی این، ستونِ سبک روی پس‌زمینه‌ها هیچ اثری نداشت و «سبکِ مجموعه» فقط
   نیمه‌ای از تصویر را شکل می‌داد — همان برچسبِ بی‌ورودی، یک لایه آن‌طرف‌تر. */
var LV_STYLES = [
  { key: 'ساده و رسمی', pal: { bg: '#0F172A', fg: '#F8FAFC', ac: '#38BDF8' },
    frame: 'bar',      hint: 'فلسفه، منطق، معرفت‌شناسی، کلام',
    gen: 'هندسهٔ آرام و مینیمال، سرمه‌ای و فیروزه‌ای، سایه‌های نرم، فضای خالیِ زیاد',
    art: 'clean modern flat editorial illustration, deep navy and teal palette with a warm accent, soft shadows, simple confident shapes, calm intelligent mood' },
  { key: 'خطیِ مینیمال', pal: { bg: '#FFFFFF', fg: '#17202E', ac: '#2E6FB8' },
    frame: 'hairline', hint: 'علمی و فنی، جایی که نمودار حرفِ اصلی است',
    gen: 'خطوطِ نازکِ فنی روی زمینهٔ روشن، تک‌رنگِ آبی، مثلِ نقشهٔ مهندسی، بی سایه',
    art: 'minimal hand-drawn line illustration, confident thin ink lines on an off-white background with a single blue accent, like an elegant explainer sketch' },
  { key: 'تخته‌سفید', pal: { bg: '#F7F7F2', fg: '#1F2937', ac: '#059669' },
    frame: 'dashed',   hint: 'ریاضی، فرایند، آموزشِ گام‌به‌گام',
    gen: 'طرحِ دست‌کشیده با ماژیک روی تختهٔ سفید، خطوطِ ساده، زمینهٔ کاغذی',
    art: 'whiteboard explainer drawing, black and colored marker strokes on a clean white board, simple expressive stick figures, arrows and props' },
  { key: 'نقشِ ایرانی', pal: { bg: '#0B3B3C', fg: '#FDF6E3', ac: '#D4A017' },
    frame: 'motif',    hint: 'تاریخِ اسلام، عرفان، ادبیاتِ کهن',
    gen: 'نقشِ هندسیِ اسلامی و تذهیب، فیروزه‌ای و لاجوردی و طلایی، قرینه، بی چهره',
    art: 'Persian-miniature-inspired illustration, flat perspective, turquoise, lapis and gold, ornamental details, stylized generic figures' },
  { key: 'آبرنگِ گرم', pal: { bg: '#FFF7ED', fg: '#431407', ac: '#EA580C' },
    frame: 'wash',     hint: 'روایی، اخلاق، زندگی‌نامه',
    gen: 'آبرنگِ گرم و پخش‌شده، نارنجی و خاکی، لبه‌های نرم، بافتِ کاغذ',
    art: 'warm watercolor storybook illustration, soft bleeding edges, orange, ochre and earth tones, visible paper texture' },
  { key: 'چاپِ قدیمی', pal: { bg: '#F3EAD3', fg: '#2B2116', ac: '#8C5A2B' },
    frame: 'rules',    hint: 'تاریخ، ادبیات، اسناد',
    gen: 'حکاکیِ چاپِ سنگیِ قدیمی، قهوه‌ای و کرم، بافتِ کاغذِ کهنه، خط‌خطیِ ریز',
    art: 'vintage engraving and lithograph illustration, sepia and cream, fine cross-hatching, aged paper' },
  { key: 'کاغذبری', pal: { bg: '#1E1B4B', fg: '#EEF2FF', ac: '#A78BFA' },
    frame: 'layers',   hint: 'مفاهیمِ لایه‌لایه و ساختارها',
    gen: 'کاغذبریِ لایه‌لایه، بنفش و نیلی، سایه‌های تیزِ بین لایه‌ها، بی بافت',
    art: 'layered paper-cut diorama illustration, purple and indigo paper layers, crisp drop shadows, sense of depth' },
  /* «عکسِ واقعی» امروز **لایه‌اش نیامده** (سنجشِ گامِ صفر: تصویرِ آزاد شدنی
     است، ولی آوردنش کارِ گامِ بعدی است). پس کارت‌ها ساده ساخته می‌شوند و
     این را خطِ روزانه **با اسم می‌گوید** — وگرنه صاحبِ برنامه سبکی انتخاب
     کرده که بی‌صدا کار نمی‌کند، و آن بدترین حالت است (۷٫۴۵). */
  { key: 'عکسِ واقعی', pal: { bg: '#111827', fg: '#F9FAFB', ac: '#9CA3AF' },
    frame: 'bar', photo: true, hint: 'علومِ تجربی، جغرافیا، رویدادها',
    gen: 'عکسِ فضاییِ واقع‌نما، نورِ طبیعی، عمقِ میدانِ کم، خنثی و بی‌شخص',
    art: 'photorealistic editorial photograph, natural light, shallow depth of field, people only as silhouettes, hands or from behind' },
  { key: 'ترکیبی', pal: { bg: '#0F172A', fg: '#FDF6E3', ac: '#D4A017' },
    frame: 'motif', mix: true, hint: 'کارتِ تمیز + نقشِ مجموعه — حالتِ پیشنهادی برای ترکیب',
    gen: 'نقشِ هندسیِ کم‌رنگ روی زمینهٔ سرمه‌ای، طلاییِ ملایم، بسیار آرام',
    art: 'flat editorial illustration on deep navy with subtle gold geometric ornament, calm and refined' }
];

/** یک‌دست‌سازیِ نوشتار، تا «خطی مینیمال» بی نیم‌فاصله هم شناخته شود. */
function lvStyleNorm_(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[‌‏‎]/g, ' ')          // نیم‌فاصله و نشانه‌های جهت
    .replace(/[ً-ْٰ]/g, '')          // اعراب
    .replace(/ك/g, 'ک').replace(/[يى]/g, 'ی')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

/** سبکِ نوشته‌شده را پیدا می‌کند. `null` یعنی خوانده نشد. */
function lvStyleFind_(v) {
  var t = lvStyleNorm_(v);
  if (!t) return null;
  for (var i = 0; i < LV_STYLES.length; i++) {
    if (lvStyleNorm_(LV_STYLES[i].key) === t) return LV_STYLES[i];
  }
  return null;
}

function lvStyleDefault_() { return LV_STYLES[0]; }

/**
 * کلیدِ سبک ⇒ خودِ سبک، **از جمله ترکیب** («الف + ب»).
 *
 * `lvStyleAt_` کلیدِ ترکیبی برمی‌گرداند — انتخابِ مدل از ۸٫۱۸ همیشه چنین
 * است، و `_visuals.json`ِ درسِ ۵۸ نوشت `ساده و رسمی + خطیِ مینیمال` — ولی
 * کاور و کارت‌ها آن را با `lvStyleFind_` می‌خواندند، که فقط کلیدِ تکی را
 * می‌شناسد. پس هر ترکیبی **بی‌صدا** به سبکِ پیش‌فرض برمی‌گشت: نقشِ انتخاب‌شده
 * هیچ‌جا دیده نمی‌شد و ثبتش در پرونده ادعا می‌کرد که دیده شده (۸.۲۶).
 * `null` یعنی خوانده نشد؛ تصمیمِ «پس چه» با صداکننده است.
 */
function lvStyleResolve_(v) {
  var f = lvStyleFind_(v);
  if (f) return f;
  var two = lvStyleSplit_(v);
  if (!two) return null;
  return lvStyleCompose_(lvStyleFind_(two.a), lvStyleFind_(two.b));
}

/**
 * ══ «ترکیبی» یک برچسب بود، نه یک ترکیب (۸٫۱۶) ══
 *
 * صاحبِ برنامه «ترکیبی» را زد و گفت: «فکر کردم یه جوری میشه انتخاب کرد
 * ترکیبی یعنی چی با چی». درست دید — و بدتر از آن: `mix: true` روی آن سبک
 * **هیچ‌جا خوانده نمی‌شد**. سنجهٔ ۳۵.۲ هم فقط وجودِ همان فیلد را تأیید
 * می‌کرد، یعنی سنجه‌ای که یک برچسبِ توخالی را قفل کرده بود (۷٫۶۸). پس
 * «ترکیبی» عملاً فقط یک ظاهرِ ثابتِ دهم بود: `frame: 'motif'` با پالتِ خودش.
 *
 * ترکیبِ واقعی وقتی معنا دارد که دو **نقش** جدا داشته باشد، نه دو سبکِ هنریِ
 * رقیب — و همان استدلالِ قدیمی («دو سبک در یک ویدئو ناهم‌خوان می‌شود») فقط
 * دربارهٔ حالتِ دوم درست بود. پس:
 *     رنگ و فضا از سبکِ **اول**، نقش و قاب از سبکِ **دوم**.
 * این دقیقاً همان «کارتِ تمیز + نقشِ مجموعه»ای است که `hint`ِ «ترکیبی» از
 * روزِ اول وعده‌اش را داده بود و هیچ کدی اجرایش نمی‌کرد.
 */
function lvStyleCompose_(a, b) {
  if (!a || !b) return null;
  return {
    key: a.key + ' + ' + b.key,
    pal: a.pal,                 // رنگ و فضا از اولی
    frame: b.frame,             // نقش و قاب از دومی
    photo: a.photo === true,    // «عکسِ واقعی» بودن مالِ پایه است، نه نقش
    composed: true,
    base: a.key, motif: b.key,
    hint: 'رنگ از «' + a.key + '»، نقش از «' + b.key + '»',
    gen: String(a.gen || '') +
         (b.gen ? '؛ با نقش‌مایهٔ ' + String(b.gen) : ''),
    /* زبانِ هنریِ صحنه‌های مصور (۸.۳۱) — همان تقسیمِ نقش: پایه از اولی،
       رگه از دومی. */
    art: String(a.art || '') + (b.art ? '; with accents borrowed from ' + String(b.art) : '')
  };
}

/* ══ نقش‌ها: فهرستی که می‌گوید چه می‌کشد، و هر نقش فقط یک بار (۸٫۱۸) ══
 * صاحبِ برنامه جلوِ تخته گفت: «اون لیستِ نقش چرا محتواش مثلِ لیستِ بالاییشه؟»
 * و درست می‌گفت — همان نُه کلید بود با همان برچسب‌ها. دو ایراد در یک جا:
 *
 *   • برچسب نمی‌گفت آن سبک **به‌عنوانِ نقش** چه می‌آورد. «ساده و رسمی» در
 *     جایگاهِ نقش یعنی چه؟ انتخابی که نتیجه‌اش را نشود دید انتخاب نیست —
 *     همان دلیلی که ۸٫۱۳ برای پیش‌نمایشِ رنگ نوشت.
 *   • و دو تا از آن نُه تا **اثرِ یکسان** داشتند. `lvStyleCompose_` از نقش
 *     فقط `frame` را برمی‌دارد؛ `ترکیبی` همان `motif`ِ «نقشِ ایرانی» است و
 *     «عکسِ واقعی» همان `bar`ِ «ساده و رسمی». یعنی دو گزینه که عوض‌کردنشان
 *     هیچ تفاوتی در تصویر نمی‌سازد — برچسبِ توخالی، در فهرستی که ۸٫۱۶ عمداً
 *     برای پایان‌دادن به یک برچسبِ توخالی ساخته بود.
 *
 * پس فهرست از روی `frame`های **یکتا** ساخته می‌شود، نه از روی کلیدها. */
function lvMotifs_() {
  var what = {
    bar:      'نوارِ رنگیِ ساده در لبهٔ کارت',
    hairline: 'خط‌های نازکِ فنی، مثلِ نقشهٔ مهندسی',
    dashed:   'کادرِ خط‌چین، حالِ تختهٔ درس',
    motif:    'نقشِ هندسیِ اسلامی و تذهیب در گوشه‌ها',
    wash:     'لکهٔ آبرنگِ نرم پشتِ متن',
    rules:    'خط‌کشیِ چاپِ سنگی و بافتِ کاغذِ کهنه',
    layers:   'لایه‌های کاغذبری با سایهٔ تیز'
  };
  var out = [], seen = {};
  try {
    for (var i = 0; i < LV_STYLES.length; i++) {
      var st = LV_STYLES[i], f = String(st.frame || '');
      if (!f || seen[f]) continue;          // نقشِ تکراری دوباره عرضه نمی‌شود
      seen[f] = true;
      out.push({ key: String(st.key || ''), frame: f,
                 what: what[f] || String(st.gen || '').split('،')[0] });
    }
  } catch (e) {}
  return out;
}

/* ══ «خودش انتخاب کند» — و این‌بار واقعاً (۸٫۱۸) ══
 * «مگه قرار نشد خودِ سیستم … هم برای نقش هم اون لیست و هم برای کم و زیاد
 *  رو حسب نیاز و ضرورت و تشخیص و بدونِ وسواس برای هزینه انتخاب کنه؟»
 *
 * تا ۸٫۱۷ «خودکار» یعنی `lvStyleSuggest_` — یک زنجیرهٔ regex روی دسته و
 * موضوع. ۸٫۱۳ اندازه‌اش گرفت و نتیجه تلخ بود: برای مجموعهٔ معرفت‌شناسیِ او
 * همیشه گزینهٔ **اول** را می‌داد، یعنی هشت سبکِ تازه صفر تفاوت ساختند.
 * قابلیتی که انتخابِ خودکارش همیشه یک جواب بدهد، برای کسی که یک مجموعه
 * دارد وجود ندارد.
 *
 * حالا تصمیم با مدل است — روی **همان فراخوانی که از قبل برای هر قسمت
 * انجام می‌شود** (`ytMetaModel_`)، پس هیچ فراخوانِ تازه‌ای اضافه نشد و این
 * را باید همان‌طور که هست گفت، نه اینکه وانمود شود هزینه‌ای خرج شده.
 *
 * و مرز همان مرزِ همیشگیِ این مخزن است: **مدل پیشنهاد می‌دهد، کد تصمیم
 * می‌گیرد.** کلیدِ ناشناخته و سطحِ ناشناخته دور ریخته می‌شوند و همان
 * پیشنهادِ regex سرِ جایش می‌مانَد — یک کلیدِ ساختگی نباید قسمتی را بی‌سبک
 * بگذارد (همان مرزی که `musicPlanModel_` دارد). */
function lvLookApply_(mm) {
  var out = { level: '', base: '', motif: '', why: '' };
  try {
    var lk = (mm && mm.look) || null;
    if (!lk) return out;
    var lv = String(lk.level || '').trim();
    var list = CFG.LV_LEVELS || ['خاموش', 'کم', 'زیاد'];
    for (var i = 0; i < list.length; i++) if (lv === list[i]) { out.level = lv; break; }
    var b = lvStyleFind_(String(lk.base || '').trim());
    if (b) out.base = b.key;
    var m = lvStyleFind_(String(lk.motif || '').trim());
    /* نقشی که `frame`ش با پایه یکی باشد یعنی هیچ — `lvStyleCompose_` از نقش
       فقط همان را برمی‌دارد، پس «الف + الف» با «الف» یک تصویر می‌دهد. بی این
       خط، هر شب یک ترکیبِ ثبت‌شده داشتیم که شبیهِ انتخاب است و نیست. */
    if (b && m && m.frame !== b.frame) out.motif = m.key;
    out.why = String(lk.why || '').slice(0, 160);
  } catch (e) {}
  return out;
}

/** سبکی که انتخابِ مدل می‌سازد: «الف» یا «الف + ب». خالی یعنی مدل نگفت. */
function lvLookStyle_(look) {
  if (!look || !look.base) return '';
  return look.motif ? (String(look.base) + ' + ' + String(look.motif)) : String(look.base);
}

/** «الف + ب» را به دو تکهٔ پاک‌شده می‌شکند. `null` یعنی ترکیب نیست. */
function lvStyleSplit_(v) {
  var s = String(v === null || v === undefined ? '' : v);
  /* «ترکیبی: الف + ب» هم پذیرفته می‌شود، چون روی تخته همین شکل ذخیره
     می‌شود و خواندنِ فقط یک شکل یعنی خانهٔ دست‌نویس بی‌صدا رد شود. */
  s = s.replace(/^\s*ترکیبی\s*[:：]\s*/, '');
  if (s.indexOf('+') === -1) return null;
  var p = s.split('+');
  if (p.length !== 2) return null;
  var a = p[0].trim(), b = p[1].trim();
  if (!a || !b) return null;
  return { a: a, b: b };
}

/**
 * پیشنهادِ خودِ موتور، از دسته و موضوعِ همان مجموعه.
 * **هیچ فراخوانِ مدلی این‌جا نیست** — «نمیخوام هزینه کار و توکن بالا بره».
 */
function lvStyleSuggest_(cat, topic, name) {
  var t = lvStyleNorm_([cat, topic, name].join(' '));
  var rule = [
    ['نقشِ ایرانی', /تاریخ ?اسلام|اسلام|عرفان|تصوف|قرآن|حدیث|فقه|ادبیات کهن|شعر|حافظ|مولوی|سعدی|مذهب|معنو/],
    ['چاپِ قدیمی', /تاریخ|باستان|سند|انقلاب|جنگ|تمدن|سیاس/],
    ['تخته‌سفید', /ریاضی|هندسه|آمار|جبر|حساب|برنامه ?نویسی|الگوریتم|آموزش گام/],
    ['خطیِ مینیمال', /علمی|فنی|مهندس|فیزیک|شیمی|فناوری|کامپیوتر|اقتصاد|مدیریت/],
    ['عکسِ واقعی', /جغرافیا|زیست|طبیعت|نجوم|پزشک|سلامت|حیوان|گیاه|رویداد/],
    ['آبرنگِ گرم', /اخلاق|روان|داستان|زندگی ?نامه|خانواده|تربیت|کودک|سبک زندگی/],
    ['کاغذبری', /ساختار|سیستم|نظام|لایه|معماری/],
    ['ساده و رسمی', /فلسفه|منطق|معرفت|کلام|حکمت|اندیش/]
  ];
  for (var r = 0; r < rule.length; r++) {
    if (rule[r][1].test(t)) return rule[r][0];
  }
  return lvStyleDefault_().key;
}

/**
 * سبکِ این مجموعه: خانهٔ خودش، وگرنه پیشنهاد.
 * @return {{style:object, key:string, src:string, bad:string}}
 */
function lvStyleOf_(vals) {
  var out = { style: lvStyleDefault_(), key: '', src: 'پیش‌فرض', bad: '' };
  try {
    var raw = String((vals || [])[SC.LVSTYLE - 1] || '').trim();
    if (raw) {
      /* دو سبکِ هنری در یک ویدئو **با اسم رد می‌شود**، نه بی‌صدا. تحلیلش
         در طرح نوشته شده: ناهم‌خوانی به چشمِ بیننده «اشتباه» می‌آید نه
         «تنوع». و خانه‌ای که خوانده نشود یعنی انتخابی که او کرده و بی‌صدا
         نخواهد گرفت (۷٫۴۱). */
      /* ══ «خودکار» حالا یک **انتخاب** است، نه خانهٔ خالی (۸٫۱۶) ══
         جعبهٔ تخته گزینهٔ «خودکار» داشت و مقدارش رشتهٔ خالی بود — و
         `lvStyleAudit_` هر شب خانهٔ خالی را با پیشنهادِ regex پر می‌کند.
         یعنی «خودکار» حداکثر یک شب دوام می‌آورد و بعد بی‌صدا به یک مقدارِ
         ثابت تبدیل می‌شد. انتخابی که خودش را نگه ندارد، انتخاب نیست. */
      if (lvStyleNorm_(raw) === lvStyleNorm_('خودکار')) {
        var sa = lvStyleSuggest_(String((vals || [])[SC.CAT - 1] || ''),
                                 String((vals || [])[SC.TOPIC - 1] || ''),
                                 String((vals || [])[SC.NAME - 1] || ''));
        out.style = lvStyleFind_(sa) || lvStyleDefault_();
        out.key = out.style.key; out.src = 'خودکار';
        return out;
      }
      var two = lvStyleSplit_(raw);
      if (two) {
        /* ترکیبِ واقعی: رنگ از اولی، نقش از دومی. تکهٔ ناشناخته **با اسم**
           رد می‌شود و می‌گوید کدام تکه بد بود — «یکی از این دو» برای کسی که
           باید درستش کند، نصفِ جواب است. */
        var fa = lvStyleFind_(two.a), fb = lvStyleFind_(two.b);
        if (fa && fb) {
          var cmp = lvStyleCompose_(fa, fb);
          if (cmp) { out.style = cmp; out.key = cmp.key; out.src = 'ترکیبِ خودتان'; return out; }
        }
        out.bad = 'ترکیبِ «' + raw + '» خوانده نشد — ' +
                  (!fa ? 'تکهٔ اول («' + two.a + '») ' : '') +
                  (!fb ? 'تکهٔ دوم («' + two.b + '») ' : '') +
                  'شناخته نشد. مجازها: ' +
                  LV_STYLES.map(function (x) { return x.key; }).join(' / ');
      } else {
        var f = lvStyleFind_(raw);
        if (f) { out.style = f; out.key = f.key; out.src = 'ردیفِ خودش'; return out; }
        out.bad = 'سبکِ «' + raw + '» شناخته نشد. یکی از این‌ها را بنویسید: ' +
                  LV_STYLES.map(function (x) { return x.key; }).join(' / ');
      }
    }
    var sug = lvStyleSuggest_(String((vals || [])[SC.CAT - 1] || ''),
                              String((vals || [])[SC.TOPIC - 1] || ''),
                              String((vals || [])[SC.NAME - 1] || ''));
    out.style = lvStyleFind_(sug) || lvStyleDefault_();
    out.key = out.style.key;
    out.src = out.bad ? 'پیشنهاد (خانه خوانده نشد)' : 'پیشنهاد';
  } catch (e) { out.bad = 'سبک خوانده نشد: ' + e.message; }
  return out;
}

/**
 * سبکِ مجموعهٔ یک قسمت — **یک تعریف**، برای کاور و کارت‌ها با هم (۷٫۹۹).
 *
 * ══ باگی که این تابع برایش هست (سنجیده) ══
 * کلید از **ردیفِ صفِ انتشار** می‌آید (`item.seriesKey`, از ۵٫۹۷). نگارشِ
 * ۷٫۹۶ اینجا `item.series` را می‌خواند — کلیدی که هیچ‌وقت در ردیف نیست — و
 * فقط چون `_special.json` هم `seriesKey` دارد سرِ پا می‌ماند. برای
 * **قسمت‌های قدیمی که پروندهٔ قسمتشان `seriesKey` ندارد** (همان ۴۵ درسی که
 * `ytBackfill_` منتشرشان می‌کند) سبک بی‌صدا اعمال نمی‌شد: آزمون نشان داد
 * `style` برابرِ `undefined` درمی‌آید، یعنی سبکِ انتخابیِ آدم هیچ اثری
 * نداشت.
 *
 * و سه جوابِ متفاوت برای سه حالتِ متفاوت:
 *   • ردیف پیدا شد ⇒ سبکِ همان ردیف (یا پیشنهادش، اگر خانه خالی است).
 *   • رجیستری خوانده شد ولی ردیف نبود ⇒ **پیشنهاد از خودِ پروندهٔ قسمت**.
 *     «این مجموعه ردیفی ندارد» یک دانستن است، نه ندانستن.
 *   • خواندن پرت کرد ⇒ رشتهٔ خالی، که یعنی «همان که ذخیره شده» و هیچ
 *     بازسازی‌ای راه نمی‌اندازد (۷٫۴۰: «نمی‌دانیم» با «عوض شد» یکی نیست).
 */
function lvStyleAt_(hub, item, meta, seriesName, look) {
  try {
    var mdl = lvLookStyle_(look);
    var reg = readSeriesReg_(hub || getHub_());
    var rec = reg.byKey[String((item && item.seriesKey) || '')] ||
              reg.byKey[String((meta && meta.seriesKey) || '')] || null;
    if (rec) {
      var st = lvStyleOf_(rec.vals);
      /* ══ انتخابِ مدل فقط جایی می‌نشیند که او کار را به موتور سپرده (۸٫۱۸) ══
         «خودکار» یا خانهٔ خالی. سبکی که خودش نوشته دست‌نخورده می‌مانَد —
         پاک‌کردنِ سلیقهٔ آدم بدتر از نداشتنِ انتخابِ خودکار است، همان قاعدهٔ
         اسکنِ موسیقی که ستونِ سلیقهٔ کیوریتور را نمی‌شوید (۵٫۹۵). */
      /* ══ و خانه‌ای که **خودِ سوئیپ** نوشته هم انتخابِ او نیست (۸٫۲۳) ══
         مهاجرتِ ۸٫۱۹ آن‌ها را به «خودکار» برمی‌گردانَد، ولی از `healthCheck`
         می‌دود — ۱۰ صبح، یعنی **پس از** تولید و انتشارِ درسِ ۰۸:۰۰. پس
         فردای نصب، قسمت هنوز با سبکِ regexِ دیروز ساخته می‌شد و یک روزِ
         دیگر هم «مثلِ روزهای قبل» درمی‌آمد. این‌جا پرسیدن هیچ نوشتنی لازم
         ندارد: شکلِ خانه خودش می‌گوید مالِ کیست. */
      if (mdl && (st.src === 'خودکار' || st.src === 'پیشنهاد' ||
                  st.src === 'پیشنهاد (خانه خوانده نشد)' ||
                  lvStyleOurs_(rec.vals, String(rec.vals[SC.LVSTYLE - 1] || '').trim()))) {
        return mdl;
      }
      return st.key;
    }
    if (mdl) return mdl;
    return lvStyleSuggest_(String((meta && (meta.seriesCat || meta.cat)) || ''),
                           '', String(seriesName || ''));
  } catch (e) { return ''; }
}

/**
 * خانه‌های **خالی** را با پیشنهاد پر می‌کند و خانه‌های ناخوانا را نام می‌برد.
 *
 * دو مرز: خانهٔ دست‌نویس هرگز بازنویسی نمی‌شود، و نوشتن فقط وقتی انجام
 * می‌شود که چیزی عوض شده باشد — یک مهاجرتِ آرایشی نباید ۲۶۴ ردیف را هر شب
 * دوباره مهر کند (۵٫۹۵).
 */
function lvStyleAudit_(hub) {
  var out = { filled: 0, bad: [], photo: [], read: 0, why: '',
              thawed: 0, thawNames: [], mine: 0, mineNames: [] };
  try {
    var reg = readSeriesReg_(hub || getHub_());
    out.read = 1;
    for (var i = 0; i < reg.rows.length; i++) {
      var rec = reg.rows[i];
      var nm = String(rec.vals[SC.NAME - 1] || rec.key);
      var raw = String(rec.vals[SC.LVSTYLE - 1] || '').trim();
      var st = lvStyleOf_(rec.vals);
      if (st.bad) { if (out.bad.length < 6) out.bad.push('«' + nm + '»: ' + st.bad); }
      if (st.style && st.style.photo && out.photo.length < 6) out.photo.push(nm);
      /* ══ خانهٔ خالی «خودکار» می‌شود، نه یک سبکِ منجمد (۸٫۱۸) ══
         تا ۸٫۱۷ همین‌جا `st.key` نوشته می‌شد — یعنی پیشنهادِ regex، همان شبِ
         اول، برای همیشه. پس هیچ مجموعه‌ای که او دستش نزده بود هرگز به
         انتخابِ مدل نمی‌رسید: درِ «خودکار» باز شد و جاروی شبانه بی‌صدا
         می‌بستش. این دقیقاً همان نیمهٔ دومِ ایرادِ ۸٫۱۶ است، یک تابع آن‌طرف‌تر. */
      if (!raw && reg.sheet) {
        try { reg.sheet.getRange(rec.row, SC.LVSTYLE).setValue('خودکار'); out.filled++; }
        catch (eW) {}
        continue;
      }
      /* ══ و آنچه سوئیپِ دیروز از قبل منجمد کرده (۸٫۱۹) ══
         «چرا هی دونه‌دونه برای همه‌شون بذارم که ممکن از دستم در بره؟» — حق
         با اوست، و ۸٫۱۸ فقط نیمی از کار بود: درِ «خودکار» را باز کرد ولی
         ۲۶۴ خانه‌ای که شب‌های پیش پر شده بودند همچنان یک سبکِ ثابت داشتند و
         از بیرون **عیناً شبیهِ انتخابِ آدم** بودند. همان ۵٫۹۵: تمیزکردنِ
         ورودی آنچه را که از قبل نوشته شده درست نمی‌کند. */
      if (reg.sheet && lvThawable_(rec.vals, raw)) {
        try {
          reg.sheet.getRange(rec.row, SC.LVSTYLE).setValue('خودکار');
          out.thawed++;
          if (out.thawNames.length < 6) out.thawNames.push(nm);
        } catch (eT) {}
      } else if (raw && lvStyleNorm_(raw) !== lvStyleNorm_('خودکار')) {
        /* دستِ خودش — **با اسم** شمرده می‌شود، نه بی‌صدا رد. اگر فردا بگوید
           «پس چرا این یکی خودکار نشد»، جوابش باید از قبل روی میز باشد. */
        out.mine++;
        if (out.mineNames.length < 6) out.mineNames.push(nm);
      }
    }
    if (out.thawed && reg.sheet) lvThawDone_();
  } catch (e) { out.why = e.message; }
  return out;
}

/* ══ کدام خانه را خودمان نوشته‌ایم و کدام را او؟ ══
 * تشخیص یک چیز بیشتر ندارد و همان کافی است: سوئیپِ پیش از ۸٫۱۸ **دقیقاً**
 * خروجیِ `lvStyleSuggest_` را می‌نوشت. پس خانه‌ای که مو‌به‌مو همان رشته باشد،
 * نوشتهٔ ماست؛ هر چیزِ دیگری — ترکیبِ «الف + ب»، کلیدی که regex برای این
 * ردیف نمی‌داد، یا مقداری که اصلاً شناخته نمی‌شود — مالِ اوست و دست نمی‌خورد.
 *
 * و احتمالِ هم‌پوشانی (او دقیقاً همان را دست‌چین کرده باشد) صفر نیست؛ بهایش
 * هم کوچک است: آن مجموعه «خودکار» می‌شود، یعنی مدل برای هر درسش انتخاب
 * می‌کند — همان چیزی که او برای همه خواسته — و یک کلیک روی تخته برش
 * می‌گرداند. ولی **یک‌بار** انجام می‌شود، نه هر شب: مهاجرتی که هر شب بدود،
 * انتخابِ فردای او را هم پاک می‌کند، و آن دیگر مهاجرت نیست، خرابکاری است. */
/* ══ «این را خودمان نوشته‌ایم» از «نوبتِ مهاجرت است» جدا شد (۸٫۲۳) ══
 * شکلِ خانه یک **واقعیت** است و هر وقت بپرسی همان جواب را می‌دهد؛ مهاجرت یک
 * **رویداد** است و یک بار می‌افتد. تا ۸٫۲۲ هر دو در یک تابع بودند، پس پس از
 * اجرای مهاجرت دیگر نمی‌شد پرسید «این خانه مالِ کیست؟» — و `lvStyleAt_` که
 * دقیقاً همین را می‌پرسد، جوابی نداشت. */
function lvStyleOurs_(vals, raw) {
  try {
    if (!raw) return false;
    if (lvStyleNorm_(raw) === lvStyleNorm_('خودکار')) return false;
    if (lvStyleSplit_(raw)) return false;           // ترکیبِ خودش
    var sug = lvStyleSuggest_(String((vals || [])[SC.CAT - 1] || ''),
                              String((vals || [])[SC.TOPIC - 1] || ''),
                              String((vals || [])[SC.NAME - 1] || ''));
    return lvStyleNorm_(raw) === lvStyleNorm_(sug);
  } catch (e) { return false; }
}

function lvThawable_(vals, raw) {
  try {
    if (!raw) return false;
    if (lvThawDoneAt_() === String(CFG.LV_THAW_VER || '1')) return false;
    if (lvStyleNorm_(raw) === lvStyleNorm_('خودکار')) return false;
    /* ⚠️ این خط **سد نیست، میان‌بُر است** — و این را شکستنِ عمدی گفت نه
       خواندن: برداشتنش هیچ سنجه‌ای را سرخ نکرد، چون `lvStyleSuggest_` همیشه
       یک کلیدِ تنها برمی‌گرداند و هیچ ترکیبی («الف + ب») با آن برابر
       نمی‌شود. پس مقایسهٔ دو خط پایین‌تر خودش ترکیب را رد می‌کند. برچسبش
       عوض شد نه نگه‌داشته‌شدنش به‌عنوانِ سد (۷٫۷۱/۸٫۱۲): خطی که شبیهِ سد
       باشد و نباشد، خوانندهٔ بعدی را گمراه می‌کند. */
    if (lvStyleSplit_(raw)) return false;           // میان‌بُر: ترکیب هرگز پیشنهادِ ما نبوده
    var sug = lvStyleSuggest_(String((vals || [])[SC.CAT - 1] || ''),
                              String((vals || [])[SC.TOPIC - 1] || ''),
                              String((vals || [])[SC.NAME - 1] || ''));
    return lvStyleNorm_(raw) === lvStyleNorm_(sug);
  } catch (e) { return false; }
}

/** مهاجرت یک **نسخه** دارد، نه یک پرچمِ دوحالته: بالا بردنِ `LV_THAW_VER`
 *  دوباره‌اش می‌دواند — همان درِ `EMB_TEXT_VER` (۷٫۲۷)، چون قفلی که هیچ آدمی
 *  نتواند بازش کند همان شکلی است که ۵٫۹۵ نوشت. */
function lvThawDoneAt_() {
  try { return String(props_().getProperty(PK.LV_THAW) || ''); } catch (e) { return ''; }
}
function lvThawDone_() {
  try { props_().setProperty(PK.LV_THAW, String(CFG.LV_THAW_VER || '1')); } catch (e) {}
}

/* ═══════════ لایهٔ ۳: تصویرِ ساخته‌شده با مدل (۷٫۹۸) ═══════════
 *
 * گامِ ۷ِ طرح، و تنها گامی که از روزِ اول «با اجازهٔ شما» نوشته شده بود.
 * ساخته شد، و **خاموش می‌مانَد** تا صاحبِ برنامه روشنش کند.
 *
 * ══ چه چیزی ساخته می‌شود، و چه چیزی نه ══
 * پس‌زمینهٔ کارت، بی‌واژه و انتزاعی. **نه** جایگزینِ کارت، و **نه** تصویرِ
 * چیزی که واقعاً وجود دارد. دلیلش در `00_Config.gs` نوشته شده و مهم‌ترین
 * نیمه‌اش این است: تصویرِ ساخته‌شدهٔ یک شخصِ واقعی یا یک سندِ تاریخی، یک
 * **جعل** است. کانالی که درس‌نامهٔ تاریخ و کلام می‌دهد نمی‌تواند چهرهٔ
 * ساخته‌شدهٔ کسی را نشان دهد. این مرز در کد است (`lvGenPrompt_` صریح منعش
 * می‌کند) نه در یک آرزو.
 *
 * ══ یک مسیر، نه دو ══
 * فقط مدل‌هایی که `generateContent` دارند — یعنی همان راهی که موتور از روزِ
 * اول با آن حرف می‌زند. Imagen نقطهٔ پایانیِ `:predict` دارد با شکلِ دیگری
 * از payload؛ پشتیبانی از آن یعنی دو مسیر و دو جای شکستن و نیمی از
 * تاریخچه در هر کدام. اگر روزی ارزش داشت، جدا اضافه می‌شود.
 *
 * ══ و آنچه این بخش **ادعا نمی‌کند** ══
 * کیفیتِ هنریِ تصویر را نمی‌سنجد. بایت‌ها را می‌سنجد (سرآیندِ واقعی، اندازه)
 * و همین. داوریِ زیبایی کارِ چشم است و §۴٫۱۱ پرامپتِ ناظر از قبل می‌گوید که
 * هر روز یک تصویرِ واقعی را باز کن. ادعای سنجشی که انجام نمی‌شود، بدتر از
 * نبودنش است (۷٫۲۴).
 */

/**
 * آیا لایهٔ ۳ (نقاشیِ ساخته‌شده) روشن است؟
 *
 * ══ کلید از دستِ سورس به دستِ او آمد (۸٫۱۵) ══
 * تا ۸٫۱۴ این فقط `CFG.LV_GEN_ENABLED` را می‌خواند، و کامنتِ خودِ آن کلید
 * می‌گفت «روشن‌کردنش تصمیمِ صاحبِ برنامه است» در حالی که تنها راهش ویرایشِ
 * سورس بود — تصمیمی که به او نسبت داده شده و راهی برای گرفتنش نداشت
 * (۵٫۹۵: گیتی که آدم باید بازش کند و نمی‌تواند، گیت نیست). خطِ روزانه هم
 * هر روز می‌گفت «`LV_GEN_ENABLED` را true کنید» — دستوری که انجام‌شدنی
 * نبود، و دستورِ غلط از نبودنِ دستور بدتر است.
 *
 * `LV_ENABLED` عمداً **بالاسرِ** این می‌مانَد: کلِ تصویرسازی خاموش باشد،
 * لایهٔ ۳ هم معنا ندارد.
 */
function lvGenOn_() {
  if (CFG.LV_ENABLED === false) return false;
  var o = '';
  try { o = String(props_().getProperty(PK.LV_GEN_ON) || ''); } catch (e) { o = ''; }
  if (o === '1') return true;
  if (o === '0') return false;
  return CFG.LV_GEN_ENABLED === true;
}

/**
 * کلیدِ منو: لایهٔ ۳ را روشن/خاموش می‌کند و سقفِ هزینه را **پیش از** تأیید
 * می‌گوید. نوشتنِ عدد در پیام لازم است، چون تصمیم دربارهٔ پول است و
 * «روشن شد» بی عدد، تصمیمی است که او نگرفته.
 */
function runLvGenToggle() {
  var now = false;
  try { now = lvGenOn_(); } catch (e0) { now = false; }
  var cap = Number(CFG.LV_GEN_USD_MONTH) || 0;
  var ui = null;
  try { ui = ui_(); } catch (eU) { ui = null; }
  var msg = now
    ? ('تصویرِ ساخته‌شده الان **روشن** است.\n\nخاموشش کنم؟ کارت‌های برداری ' +
       'سرِ جایشان می‌مانند و ویدئو ساخته می‌شود؛ فقط نقاشیِ ساخته‌شده نمی‌آید.')
    : ('تصویرِ ساخته‌شده الان **خاموش** است.\n\nروشنش کنم؟ سقفِ ماهانه ' +
       faDigitsOut_(String(cap)) + ' دلار است و موتور از آن رد نمی‌شود؛ ' +
       'هر وقت خواستید همین گزینه خاموشش می‌کند.');
  if (ui) {
    try {
      var a = ui.alert('تصویرِ ساخته‌شده', msg, ui.ButtonSet.YES_NO);
      if (a !== ui.Button.YES) return { ok: false, on: now, why: 'لغو شد' };
    } catch (eA) {}
  }
  var next = !now;
  try { props_().setProperty(PK.LV_GEN_ON, next ? '1' : '0'); }
  catch (eS) { return { ok: false, on: now, why: eS.message }; }
  var line = '';
  try { line = lvGenStatus_().line; } catch (eL) { line = ''; }
  if (ui) {
    try {
      ui.alert('تصویرِ ساخته‌شده',
               (next ? '✅ روشن شد.' : '⏸ خاموش شد.') + '\n\n' + line,
               ui.ButtonSet.OK);
    } catch (eA2) {}
  }
  try { logLine_('تصویرِ ساخته‌شده ' + (next ? 'روشن' : 'خاموش') + ' شد (دستی)'); }
  catch (eLg) {}
  return { ok: true, on: next };
}

/** قیمتِ یک تصویر با این مدل. مدلِ ناشناخته ⇒ **گران‌ترین** فرض. */
function lvGenPrice_(model) {
  var s = String(model || '').toLowerCase();
  var list = CFG.LV_GEN_PRICES || [];
  var max = 0;
  for (var i = 0; i < list.length; i++) {
    var u = Number(list[i].usd) || 0;
    if (u > max) max = u;
    if (s.indexOf(String(list[i].match).toLowerCase()) !== -1) return u;
  }
  /* هیچ الگویی نخورد. حدسِ ارزان یعنی از سقف رد شدن — و سقف تنها چیزی است
     که این لایه را مهار می‌کند. پس گران‌ترین. */
  return max || 0.134;
}

/**
 * مدلِ تصویر: تنظیمِ صریح، وگرنه ارزان‌ترین مدلِ تصویرِ `generateContent`دار.
 *
 * `MODEL_BLOCK` عمداً `image` را دارد، چون مدلِ تصویر هرگز نباید مدلِ **متن**
 * انتخاب شود. پس این‌جا همان فهرست را از راهِ دیگری می‌خوانیم، نه با
 * برداشتنِ آن سد — برداشتنش یعنی یک روز موتور با مدلِ تصویر قسمت بنویسد.
 */
function lvGenModel_() {
  var set = String(CFG.LV_GEN_MODEL || '').trim();
  if (set) return { id: set, why: 'تنظیمِ صریح' };
  /* سنجاق (۸.۵۰): مدلی که چشمِ او پسندید. حافظه فقط وقتی پذیرفته می‌شود که با
     همین سنجاق ساخته شده باشد — حافظهٔ پیش از سنجاق (مدلی که داور جایش نشانده)
     کنار می‌رود و همان دم به سنجاق برمی‌گردد. */
  var pin = String(CFG.LV_GEN_MODEL_PIN || '').trim();
  try {
    var c = JSON.parse(props_().getProperty(PK.LV_GEN_MODEL) || 'null');
    var fresh = c && c.id && (new Date().getTime() - (c.at || 0)) / 86400000 <
                (Number(CFG.MODEL_REFRESH_DAYS) || 7);
    if (fresh && pin) {
      if (String(c.id) === pin && !lvGenPinDefect_(pin).bad) return { id: pin, why: 'سنجاق (از حافظه)' };
      if (String(c.pinMiss || '') === pin && !lvGenModelBad_(String(c.id)).bad) {
        return { id: String(c.id), why: 'از حافظه — سنجاقِ «' + pin + '» در دسترس نیست' };
      }
    } else if (fresh && !lvGenModelBad_(String(c.id)).bad) {
      return { id: String(c.id), why: 'از حافظه' };
    }
  } catch (e) {}
  var found = '', all = [], pinMiss = '';
  try {
    var models = listModels_();
    for (var i = 0; i < models.length; i++) {
      var id = String(models[i].name || '').replace(/^models\//, '');
      var ms = models[i].supportedGenerationMethods ||
               models[i].supported_generation_methods || [];
      if (ms.indexOf('generateContent') === -1) continue;
      if (String(id).toLowerCase().indexOf('image') === -1) continue;
      all.push(id);
    }
    lvAudSee_(all);                       // مدلِ تازه ⇒ آزمون کنارِ سنجاق (۸.۵۱)
    all.sort(function (a, b) { return lvGenPrice_(a) - lvGenPrice_(b); });
    /* ══ ارزان‌ترین، **مگر کیفیتش سنجیده و رد شده باشد** (۸.۳۳) ══
       تا ۸.۳۲ این تابع فقط قیمت را می‌دید: مدل‌های متن و صدا هر هفته
       بازانتخاب و هر شب داوری می‌شوند، و مدلِ تصویر هیچ داوری‌ای نداشت.
       حالا هر تصویرِ صحنه کنارِ متنش داوری می‌شود و نمره‌اش به حسابِ همان
       مدل می‌رود (`lvGenScoreAdd_`)؛ مدلی که در دست‌کم `LV_GEN_MODEL_MIN_N`
       تصویر زیرِ کف مانده، کنار می‌رود و مدلِ بعدی امتحان می‌شود. اگر همه
       رد شده باشند، فهرست دست نمی‌خورد: بی مدل، هیچ تصویری نیست — بدتر از
       تصویرِ متوسط (همان شکلِ `ttsCueSwitch_`، ۷٫۴۷). */
    if (pin) {
      var pd = lvGenPinDefect_(pin);
      if (all.indexOf(pin) !== -1 && !pd.bad) {
        lvGenModelKeep_({ id: pin, at: new Date().getTime(), why: 'سنجاق', pin: pin });
        return { id: pin, why: 'سنجاق — مدلی که درسِ ۳۸ را ساخت و او پسندید' };
      }
      pinMiss = all.indexOf(pin) === -1 ? 'در فهرستِ مدل‌های حساب نیست' : pd.why;
    }
    var good = all.filter(function (x) { return !lvGenModelBad_(x).bad; });
    var skipped = good.length ? all.length - good.length : 0;
    var allBad = !good.length && all.length > 0;
    if (good.length) all = good;
    found = all[0] || '';
  } catch (e2) { return { id: '', why: 'فهرستِ مدل‌ها خوانده نشد: ' + e2.message }; }
  if (!found) return { id: '', why: 'هیچ مدلِ تصویری با generateContent در دسترس نیست' };
  var why = 'ارزان‌ترینِ ' + all.length + ' مدلِ موجود' +
            (skipped ? ' (' + skipped + ' مدل به‌خاطرِ نمرهٔ داوری کنار رفت)' : '') +
            (allBad ? ' — همهٔ مدل‌ها زیرِ کفِ داوری‌اند؛ ارزان‌ترین ماند چون بی مدل هیچ تصویری نیست' : '') +
            (pinMiss ? ' — سنجاقِ «' + pin + '» ' + pinMiss : '');
  lvGenModelKeep_({ id: found, at: new Date().getTime(), why: why, pinMiss: pinMiss ? pin : '' },
                  pinMiss ? pin : '', pinMiss);
  return { id: found, why: why };
}

/**
 * انتخابِ مدل را به خاطر می‌سپارد و **عوض‌شدنش را می‌گوید** (۸.۳۳/۸.۵۰).
 * تا ۸.۴۹ فقط کنار رفتنِ «بد» گفته می‌شد؛ برگشت به سنجاق یا نبودنِ سنجاق هم
 * همان‌قدر دیدنی است — سبکِ تصویرِ یک مجموعه با آن عوض می‌شود.
 */
function lvGenModelKeep_(rec, pin, pinMiss) {
  try {
    var prev = JSON.parse(props_().getProperty(PK.LV_GEN_MODEL) || 'null');
    props_().setProperty(PK.LV_GEN_MODEL, JSON.stringify(rec));
    if (!prev || !prev.id || prev.id === rec.id) return;
    if (rec.pin) {
      mailQueue_('تصویر', 'مدلِ تصویر به سنجاق برگشت',
                 '«' + prev.id + '» ⇒ «' + rec.id + '» — همان مدلی که درسِ ۳۸ را ساخت. ' +
                 'داور فقط تصویرِ ضعیف را از نو می‌سازد؛ مدل را عوض نمی‌کند.');
    } else if (pinMiss) {
      mailQueue_('تصویر', 'سنجاقِ مدلِ تصویر در دسترس نیست',
                 '«' + pin + '» ' + pinMiss + ' ⇒ ساختِ تصویر با «' + rec.id + '». ' +
                 'سبکِ تصویرهای مجموعه ممکن است عوض شود.');
    } else if (lvGenModelBad_(String(prev.id)).bad) {
      mailQueue_('تصویر', 'مدلِ تصویر عوض شد — کیفیت',
                 '«' + prev.id + '» ' + lvGenModelBad_(String(prev.id)).why + ' ⇒ «' + rec.id + '».');
    }
  } catch (e) {}
}

/**
 * عیبِ **عینیِ** سنجاق (۸.۵۰): نوشته یا چهرهٔ شناختنی در تصویر — نه میانگینِ نمره.
 * میانگین سلیقهٔ داور است و درسِ ۳۸ نشان داد با چشمِ او یکی نیست؛ نوشتهٔ ساختگی
 * روی تصویر یا چهرهٔ واقعی، با هر چشمی عیب است.
 */
function lvGenPinDefect_(model) {
  var out = { bad: false, n: 0, pct: 0, why: '' };
  try {
    var m = JSON.parse(props_().getProperty(PK.LV_GEN_SCORES) || '{}') || {};
    var r = m[String(model || '')];
    if (!r || !r.n) return out;
    out.n = r.n;
    out.pct = Math.round(((Number(r.def) || 0) / r.n) * 100);
    var needN = Math.max(5, Number(CFG.LV_GEN_MODEL_MIN_N) || 20);
    if (r.n >= needN && out.pct > (Number(CFG.LV_GEN_PIN_DEFECT_PCT) || 30)) {
      out.bad = true;
      out.why = 'در ' + out.pct + '٪ از ' + r.n + ' تصویر نوشته یا چهره داشت';
    }
  } catch (e) {}
  return out;
}

/**
 * نمرهٔ داوریِ یک تصویر به حسابِ مدلی که ساختش (۸.۳۳).
 * پنجرهٔ غلتان: از ۲۰۰ که گذشت، همه نصف می‌شوند — مدلی که دیروز بد بود و
 * امروز بهتر شده، نباید تا ابد زیرِ بارِ گذشته بماند.
 */
function lvGenScoreAdd_(model, v) {
  if (!model || !v) return;
  try {
    var m = JSON.parse(props_().getProperty(PK.LV_GEN_SCORES) || '{}') || {};
    var r = m[model] || { n: 0, sum: 0, bad: 0 };
    var minS = Number(CFG.LV_SCENE_JUDGE_MIN) || 5;
    var sc = Number(v.s);
    if (isFinite(sc) && sc >= 0) { r.n++; r.sum += sc; }
    if (v.txt || v.face || (isFinite(sc) && sc >= 0 && sc < minS)) r.bad++;
    /* عیبِ عینی جدا شمرده می‌شود (۸.۵۰): سنجاق فقط با همین کنار می‌رود. */
    if (v.txt || v.face) r.def = (Number(r.def) || 0) + 1;
    if (r.n > 200) {
      r.n = Math.round(r.n / 2); r.sum = r.sum / 2; r.bad = Math.round(r.bad / 2);
      r.def = Math.round((Number(r.def) || 0) / 2);
    }
    r.at = nowStr_();
    m[model] = r;
    props_().setProperty(PK.LV_GEN_SCORES, JSON.stringify(m));
  } catch (e) {}
}

/** آیا این مدلِ تصویر با نمرهٔ داوری‌اش رد شده است؟ «نسنجیده» رد نیست (۷٫۴۰). */
function lvGenModelBad_(model) {
  var out = { bad: false, n: 0, avg: 0, badPct: 0, why: '' };
  try {
    var m = JSON.parse(props_().getProperty(PK.LV_GEN_SCORES) || '{}') || {};
    var r = m[String(model || '')];
    if (!r || !r.n) return out;
    out.n = r.n; out.avg = Math.round((r.sum / r.n) * 10) / 10;
    out.badPct = Math.round((r.bad / r.n) * 100);
    var needN = Math.max(5, Number(CFG.LV_GEN_MODEL_MIN_N) || 20);
    if (r.n < needN) return out;
    var minAvg = Number(CFG.LV_GEN_MODEL_MIN_SCORE) || 5.5;
    var maxBad = Number(CFG.LV_GEN_MODEL_MAX_BAD_PCT) || 40;
    if (out.avg < minAvg || out.badPct > maxBad) {
      out.bad = true;
      out.why = 'میانگینِ داوری ' + out.avg + ' از ۱۰ و ' + out.badPct + '٪ تصویرِ ضعیف/نوشته‌دار در ' +
                r.n + ' تصویر';
    }
  } catch (e) {}
  return out;
}

/** خرجِ این ماه. ماه که عوض شود، از صفر. */
function lvGenSpend_() {
  var mon = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM');
  var d = { month: mon, n: 0, usd: 0 };
  try {
    var c = JSON.parse(props_().getProperty(PK.LV_GEN_SPEND) || 'null');
    if (c && String(c.month) === mon) {
      d.n = Number(c.n) || 0;
      d.usd = Number(c.usd) || 0;
      d.clips = Number(c.clips) || 0;
    }
  } catch (e) {}
  return d;
}

/** خرج در همان دفترِ ماه. `clip` ⇒ کلیپ شمرده می‌شود، نه تصویر (۸.۵۱) — سقف یکی است. */
function lvGenSpendAdd_(usd, clip) {
  var d = lvGenSpend_();
  if (clip) d.clips = (Number(d.clips) || 0) + 1; else d.n++;
  d.usd = Math.round((d.usd + (Number(usd) || 0)) * 10000) / 10000;
  try { props_().setProperty(PK.LV_GEN_SPEND, JSON.stringify(d)); } catch (e) {}
  return d;
}

/** چند تصویرِ دیگر این ماه جا دارد. */
function lvGenRoom_(model) {
  var cap = Math.max(0, Number(CFG.LV_GEN_USD_MONTH) || 0);
  var price = lvGenPrice_(model);
  var sp = lvGenSpend_();
  if (price <= 0) return 0;
  return Math.max(0, Math.floor((cap - sp.usd) / price));
}

/** چند روز از این ماه مانده، **با امروز**، به وقتِ موتور. */
function lvMonthDaysLeft_(now) {
  var d = now || new Date();
  var tz = CFG.TIMEZONE || 'Asia/Dubai';
  var y = Number(Utilities.formatDate(d, tz, 'yyyy'));
  var m = Number(Utilities.formatDate(d, tz, 'MM'));
  var day = Number(Utilities.formatDate(d, tz, 'dd'));
  var dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.max(1, dim - day + 1);
}

/**
 * ══ بودجهٔ ماه پخش می‌شود، نه اینکه نیمهٔ ماه تمام شود (۸.۴۸) ══
 * او پرسید: «اگر قبل از اتمامِ ماه ۶۰ را رد کنه، بقیهٔ درس‌نامه‌های ماه ساده
 * مثلِ قبل انجام می‌شه؟ … حرفه‌ای بودن رو خراب می‌کنه». جواب «بله» بود: سقف
 * فقط **دیوار** بود، و حدودِ روزِ بیستم `lvGenRoom_` صفر می‌شد: صحنه‌ها نیمه‌کاره،
 * `fail` و کارتِ ساده تا اولِ ماه. یعنی کیفیت به **تاریخ** بسته بود.
 *
 * ══ و سقف، هدف نیست (۸.۴۹) ══
 * او: «این ۱۲۰ یعنی مدل خودش رو ملزم می‌کنه که حتماً برسونه به ۱۲۰؟ … صرفاً از
 * این جهت گفتم که کم نیاد … طبیعی رفتار کنه». پس این تابع دیگر **شمار** نمی‌دهد؛
 * فقط **سقفِ این درس** را می‌دهد. شمار از محتوا می‌آید (`lvSceneCuts_`) و این‌جا
 * فقط وقتی کاری می‌کند که محتوا بیش از سقف بخواهد. هیچ شاخه‌ای در این تابع یا
 * در نقشه صحنه‌ای **اضافه** نمی‌کند تا به سقف برسد.
 *
 * سقفِ درس = کمینهٔ «ماندهٔ ماه» و «سهمِ میانگین × FLEX». سهمِ میانگین =
 * ماندهٔ سقف ÷ درس‌های ماندهٔ ماه؛ هر روز با ماندهٔ واقعی، پس آنچه درسی نخواست
 * برای بقیه می‌مانَد و خودش را تصحیح می‌کند.
 * `slack` روزهای اضافه است (مرورِ بزرگ، ساختِ دوباره).
 * @return {{max:number, allow:number, ceil:number, left:number, eps:number,
 *           per:number, cover:number, days:number, flex:number, why:string}}
 */
function lvScenePace_(model, now) {
  var hardMax = Math.max(3, Number(CFG.LV_SCENE_MAX) || 150);
  var out = { max: hardMax, allow: 0, ceil: 0, left: 0, eps: 0, per: 0, cover: 0, days: 0,
              flex: 1, why: '' };
  try {
    var cap = Math.max(0, Number(CFG.LV_GEN_USD_MONTH) || 0);
    out.left = Math.max(0, cap - lvGenSpend_().usd);
    out.days = lvMonthDaysLeft_(now);
    var shows = Math.max(1, (CFG.LV_SHOWS || ['special']).length);
    var slack = Math.max(1, Number(CFG.LV_PACE_SLACK) || 1.1);
    out.eps = Math.max(1, Math.ceil(out.days * shows * slack));
    out.allow = out.left / out.eps;
    out.flex = Math.max(1, Number(CFG.LV_PACE_FLEX) || 2.5);
    out.ceil = Math.min(out.left, out.allow * out.flex);
    var price = lvGenPrice_(model);
    var redo = Math.max(0, Number(CFG.LV_PACE_REDO_PCT) || 0.2);
    out.per = price * (1 + redo);
    out.cover = Math.max(price, Number(CFG.LV_GEN_HQ_MAX_USD) || 0.14);
    /* کلیپِ آغاز (۸.۵۱) از همان سقفِ درس برداشته می‌شود، پیش از صحنه‌ها — سقفِ ماه یکی است. */
    if (lvClipOn_()) { out.clip = lvClipCost_(); out.cover += out.clip; }
    if (out.per <= 0) return out;
    var fit = Math.floor(Math.max(0, out.ceil - out.cover) / out.per);
    /* کف فقط همان سه صحنه‌ای است که نقشه بی آن ساخته نمی‌شود، و آن هم فقط اگر
       پولش واقعاً مانده (`afford`). کفِ بالاتر یعنی قرض از روزهای بعد — همان
       پرتگاهِ «روزِ بیستم». */
    var afford = Math.floor(Math.max(0, out.left - out.cover) / out.per);
    out.max = Math.max(0, Math.min(hardMax, afford, Math.max(fit, 3)));
    out.why = 'سقفِ این درس ~' + out.ceil.toFixed(2) + ' دلار (سهمِ میانگین ~' +
              out.allow.toFixed(2) + ' = ' + out.left.toFixed(2) + ' ÷ ' + out.eps +
              ' درسِ ماندهٔ ماه، × ' + out.flex + ') ⇒ تا ' + out.max + ' صحنه';
  } catch (e) { out.why = 'سقفِ بودجهٔ این درس حساب نشد: ' + e.message; }
  return out;
}

/**
 * دستورِ تصویر — **بی‌واژه، انتزاعی، و بی هیچ شخصِ واقعی.**
 *
 * سه منعِ صریح، و هر سه در کد نه در آرزو:
 *   • هیچ متنی، هیچ حرفی، هیچ عددی. مدل فارسی را بد می‌نویسد و متنِ کارت
 *     برداری است.
 *   • هیچ چهره و هیچ شخصِ شناختنی. تصویرِ ساخته‌شدهٔ یک شخصِ واقعی جعل است.
 *   • هیچ نشان و لوگو و پرچم — همان پرسشِ حق‌نشر که `visprobe.py` برایش سد
 *     گذاشت، این بار از سمتِ ساخت.
 */
function lvGenPrompt_(v, style, ctx) {
  var subj = String((v && (v.cardTitle || v.heading)) || '').trim();
  var look = (style && style.gen) ? String(style.gen) : 'تصویرسازیِ آرام و رسمی';
  /* ══ متنِ واقعیِ همان بخش، نه فقط عنوانش (۷.۹۹) ══
   * صاحبِ برنامه پرسید «مگه متن رو و سایر چیزها رو نمی‌بینه مدلی که می‌خواد
   * بسازه؟» — و درست پرسید: نمی‌دید. نگارشِ ۷.۹۸ فقط `cardTitle` را می‌داد،
   * یعنی مدل از یک عنوانِ چهار‌کلمه‌ای باید حال‌وهوا می‌ساخت.
   * این همان کاری است که نوت‌بوکِ گوگل می‌کند و تصویرهایش «بامعنا» درمی‌آیند:
   * **زمینه** می‌دهد، نه یک برچسب. پس عنوانِ قسمت، نامِ مجموعه، سرِ بخش،
   * زیرنویسِ خودِ تصویر، و یک بریدهٔ واقعی از متنی که در همان لحظه خوانده
   * می‌شود همه می‌روند — و همه **فقط برای حال‌وهوا**, که صریح گفته می‌شود
   * تا مدل سراغِ نشان‌دادنِ عینِ مطلب نرود. */
  var about = [];
  if (ctx && ctx.seriesName) about.push('مجموعه: ' + String(ctx.seriesName));
  if (ctx && ctx.title) about.push('درس: ' + String(ctx.title));
  if (v && v.heading) about.push('بخش: ' + String(v.heading));
  if (subj) about.push('گزارهٔ این تصویر: ' + subj);
  if (v && v.caption) about.push('زیرنویسِ این تصویر: ' + String(v.caption));
  var body = '';
  try {
    var secs = (ctx && ctx.sections) || [];
    var at = Number((v && v.at) || 0);
    var sec = secs[at - 1];
    var txt = String((sec && (sec.narration || sec.text)) || '').replace(/\s+/g, ' ').trim();
    if (txt) body = txt.slice(0, Math.max(200, Number(CFG.LV_GEN_CTX_CHARS) || 700));
  } catch (eB) {}
  return 'یک تصویرسازیِ **بی‌واژه** و انتزاعی برای پس‌زمینهٔ یک اسلایدِ ' +
    'آموزشی بساز. نسبتِ ۱۶:۹.\n' +
    'حال‌وهوا: ' + look + '.\n' +
    (about.length ? 'زمینه (فقط برای حال‌وهوا، نه برای نشان‌دادنِ عینِ آن):\n  ' +
                    about.join('\n  ') + '\n' : '') +
    (body ? 'و این همان متنی است که در این لحظه خوانده می‌شود — حالتش را ' +
            'بگیر، نه محتوایش را:\n«' + body + '»\n' : '') +
    'قیدهای قطعی:\n' +
    '• هیچ متن، حرف، واژه، عدد یا نوشته‌ای در تصویر نباشد.\n' +
    '• هیچ چهره و هیچ شخصِ شناختنی نباشد.\n' +
    '• هیچ نشان، لوگو، پرچم یا علامتِ تجاری نباشد.\n' +
    '• روی آن متن نوشته می‌شود، پس **مرکزِ تصویر آرام و کم‌جزئیات** باشد و ' +
    'جزئیات به لبه‌ها برود. تیره یا کم‌اشباع بهتر است.';
}

/**
 * بایت‌ها را می‌سنجد، نه ادعا را. **پیش‌فرض ردّ است.**
 * صفحهٔ خطا هم بایت برمی‌گرداند — همان درسی که `musicFetch_` و `ytMp4Ok_`
 * گران خریدند.
 */
function lvGenAccept_(blob) {
  var out = { ok: false, why: '', w: 0, h: 0, bytes: 0 };
  try {
    if (!blob) { out.why = 'چیزی برنگشت'; return out; }
    var b = blob.getBytes();
    out.bytes = b.length;
    var min = Math.max(1000, Number(CFG.LV_GEN_MIN_BYTES) || 12000);
    if (b.length < min) { out.why = b.length + ' بایت — تصویر نیست'; return out; }
    var u = function (i) { return b[i] & 0xFF; };
    var isPng = b.length > 24 && u(0) === 137 && u(1) === 80 && u(2) === 78 && u(3) === 71;
    var isJpg = b.length > 4 && u(0) === 0xFF && u(1) === 0xD8 && u(2) === 0xFF;
    if (!isPng && !isJpg) {
      out.why = 'سرآیند نه PNG است نه JPEG — احتمالاً صفحهٔ خطا';
      return out;
    }
    if (isPng) {
      var z = ytPngSize_(blob);
      if (z) { out.w = z.w; out.h = z.h; }
      if (out.w && out.w < 640) {
        out.why = out.w + ' پیکسل عرض — برای پس‌زمینهٔ ۱۰۸۰p کوچک است';
        return out;
      }
    }
    out.ok = true;
    return out;
  } catch (e) { out.why = 'بایت‌ها خوانده نشد: ' + e.message; return out; }
}

/**
 * یک تصویر از مدل. `null` یعنی نشد — و همیشه با دلیل.
 *
 * ══ هزینه پس از **فراخوان** ثبت می‌شود، نه پس از پذیرش ══
 * وسوسه این است که فقط تصویرِ پذیرفته‌شده را بشماریم. ولی گوگل برای
 * فراخوانِ انجام‌شده پول می‌گیرد، حتی اگر ما بایت‌هایش را رد کنیم. اگر
 * ردشده‌ها شمرده نشوند، سقفِ دلاری **دروغ** است — و شبی که مدل ده تصویرِ
 * خراب بدهد، سقف هیچ‌چیز را مهار نکرده. پس هر فراخوان، پذیرفته یا نه.
 */
function lvGenOne_(model, prompt, opt) {
  var out = { blob: null, why: '', usd: 0 };
  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              model + ':generateContent?key=' + encodeURIComponent(apiKey_());
    var payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    /* ══ نسبتِ ۱۶:۹ از خودِ مدل (۸.۳۱) ══
       صحنه تمام‌صفحه است؛ تصویرِ مربعی که بریده شود، نیمی از صحنه را دور
       می‌ریزد. مدلی که `imageConfig` را رد کند یک بار به خاطر سپرده می‌شود و
       بی آن پرسیده می‌شود — ردِ ۴۰۰ پولی نیست، ولی دو بار پرسیدنِ هر صحنه
       وقت است. */
    var aspect = opt && opt.aspect ? String(opt.aspect) : '';
    var noCfg = false;
    if (aspect) {
      try { noCfg = (JSON.parse(props_().getProperty(PK.LV_GEN_NOCFG) || '{}') || {})[model] === true; }
      catch (eN) { noCfg = false; }
      if (!noCfg) payload.generationConfig = { responseModalities: ['IMAGE'],
                                               imageConfig: { aspectRatio: aspect } };
    }
    var j;
    try { j = geminiFetch_(url, payload); }
    catch (eF) {
      if (!payload.generationConfig || !/HTTP 400/.test(String(eF.message))) throw eF;
      try {
        var m0 = JSON.parse(props_().getProperty(PK.LV_GEN_NOCFG) || '{}') || {};
        m0[model] = true;
        props_().setProperty(PK.LV_GEN_NOCFG, JSON.stringify(m0));
      } catch (eM0) {}
      delete payload.generationConfig;
      j = geminiFetch_(url, payload);
    }
    out.usd = lvGenPrice_(model);
    lvGenSpendAdd_(out.usd);            // فراخوان انجام شد ⇒ پول رفت
    var b64 = '';
    try {
      var parts = j.candidates[0].content.parts;
      for (var i = 0; i < parts.length; i++) {
        var d = parts[i].inlineData || parts[i].inline_data;
        if (d && d.data) { b64 = d.data; break; }
      }
    } catch (eP) {}
    if (!b64) { out.why = 'پاسخ تصویری نداشت'; return out; }
    var mime = 'image/png';
    try {
      var ps = j.candidates[0].content.parts;
      for (var k = 0; k < ps.length; k++) {
        var dd = ps[k].inlineData || ps[k].inline_data;
        if (dd && dd.data && (dd.mimeType || dd.mime_type)) {
          mime = String(dd.mimeType || dd.mime_type); break;
        }
      }
    } catch (eM) {}
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, 'gen');
    var acc = lvGenAccept_(blob);
    if (!acc.ok) { out.why = acc.why; return out; }
    out.blob = blob;
    return out;
  } catch (e) {
    out.why = String(e.message).slice(0, 160);
    return out;
  }
}

/** نامِ ثابتِ پس‌زمینهٔ هر تصویر — پلِ «ساختن» و «دوباره پیدا کردن». */
/**
 * این کارت تصویرِ ساخته‌شده بگیرد؟ — **یک تعریف** برای سطحِ تصویرسازی (۸.۲۶).
 *   «زیاد»  ⇒ هر کارت (`lvLevelWhat_`: «برای هر کارت یک تصویرِ ساخته‌شده»)
 *   «کم»    ⇒ `LV_GEN_PER_EP` کارت، **پخش در طولِ درس** («در نقاطِ کلیدی»)
 *   «خاموش» ⇒ هیچ
 * «کم» تا ۸.۲۵ یعنی چهار کارتِ **اول**: هر چهار تصویر در دو دقیقهٔ اولِ
 * درس، و سیزده دقیقهٔ بعد بی‌تصویر. «نقاطِ کلیدی» یعنی پخش، نه اول.
 */
function lvGenPick_(i, n, level) {
  var lv = String(level || CFG.LV_LEVEL_DEFAULT || 'کم');
  if (lv === 'خاموش') return false;
  if (lv === 'زیاد') return true;
  var k = Math.max(0, Number(CFG.LV_GEN_PER_EP) || 4);
  var N = Math.max(1, Number(n) || 1);
  if (N <= k) return true;
  for (var j = 0; j < k; j++) if (Math.floor((j + 0.5) * N / k) === Number(i)) return true;
  return false;
}

function lvBgName_(i, v) {
  return 'پس‌زمینه ' + faDigitsOut_(String(Number(i) + 1)) +
         ' — بخش ' + faDigitsOut_(String((v && v.at) || 0)) + '.png';
}

/**
 * پس‌زمینه‌های لازمِ این دسته را می‌سازد یا از پوشه برمی‌دارد.
 * @return {{map:Object, made:number, spent:number, why:string, model:string}}
 */
function lvGenFill_(todo, imgFolder, style, ctx) {
  var out = { map: Object.create(null), ids: Object.create(null), made: 0, spent: 0,
              why: '', model: '', want: 0, have: 0, capped: false };
  if (!lvGenOn_() || !todo || !todo.length) return out;
  var level = String((ctx && ctx.level) || CFG.LV_LEVEL_DEFAULT || 'کم');

  // آنچه از قبل ساخته شده — پولِ رفته دوباره خرج نمی‌شود
  var need = [];
  for (var i = 0; i < todo.length; i++) {
    /* کدام کارت تصویرِ ساخته‌شده بگیرد، از **سطحِ همان مجموعه** می‌آید (۸.۲۶).
       تا ۸.۲۵ این‌جا `i < LV_GEN_PER_EP` بود: چهار تصویر، همیشه، و همه در
       **اولِ** درس — «کم» و «زیاد» هیچ تفاوتی نمی‌ساختند، در حالی که منو
       و رسیدِ ثبت هر روز می‌گفتند «زیاد = برای هر کارت یک تصویر». */
    if (!lvGenPick_(todo[i].i, todo[i].n, level)) continue;
    out.want++;
    var nm = lvBgName_(todo[i].i, todo[i].v);
    var got = null;
    try {
      var it = imgFolder.getFilesByName(nm);
      if (it.hasNext()) got = it.next();
    } catch (eH) {}
    if (got) {
      out.have++;
      out.ids[String(todo[i].i)] = got.getId();
      /* بایت‌ها فقط وقتی خوانده می‌شوند که کارتش **همین حالا** کشیده می‌شود.
         خواندنِ چهارده تصویرِ چندمگابایتی در هر نوبتِ انتظار، فقط برای
         دانستنِ اینکه هستند، هزینه روی مسیری است که کسی رویش ایستاده. */
      if (todo[i].card !== false) out.map[String(todo[i].i)] = got.getBlob();
      continue;
    }
    need.push(todo[i]);
  }
  if (!need.length) return out;

  var mk = lvGenModel_();
  out.model = mk.id;
  if (!mk.id) { out.why = mk.why; return out; }
  var room = lvGenRoom_(mk.id);
  if (room <= 0) {
    var sp = lvGenSpend_();
    out.why = 'سقفِ ماهانه پر شد (' + sp.usd.toFixed(2) + ' از ' +
              (Number(CFG.LV_GEN_USD_MONTH) || 0) + ' دلار)';
    return out;
  }
  var perRun = Math.max(1, Number(CFG.LV_GEN_PER_RUN) || 6);
  var cap = Math.min(need.length, room, perRun);
  /* «سقفِ هر اجرا» با «نشد» یکی نیست: اولی یعنی اجرای بعد ادامه می‌دهد و
     ارزشِ صبر کردن دارد، دومی نه. `lvBuild_` همین را می‌پرسد. */
  out.capped = need.length > cap && cap === perRun;

  for (var k = 0; k < cap; k++) {
    var r = lvGenOne_(mk.id, lvGenPrompt_(need[k].v, style, ctx));
    out.spent += r.usd;
    if (!r.blob) { if (!out.why) out.why = r.why; continue; }
    var nm2 = lvBgName_(need[k].i, need[k].v);
    try {
      var old = imgFolder.getFilesByName(nm2);
      while (old.hasNext()) old.next().setTrashed(true);
      var f = imgFolder.createFile(r.blob.setName(nm2));
      out.ids[String(need[k].i)] = f.getId();
      if (need[k].card !== false) out.map[String(need[k].i)] = f.getBlob();
      out.made++; out.have++;
    } catch (eF) { if (!out.why) out.why = 'پس‌زمینه ذخیره نشد: ' + eF.message; }
  }
  if (out.made) {
    logLine_('پس‌زمینهٔ ساخته‌شده: ' + out.made + ' تصویر با ' + mk.id +
             ' (~' + out.spent.toFixed(3) + ' دلار؛ جمعِ این ماه ' +
             lvGenSpend_().usd.toFixed(2) + ').');
  }
  return out;
}

/** حالِ لایهٔ ۳ برای خطِ روزانه. بی هیچ فراخوانِ شبکه. */
/* ══ «نگشته‌ایم» با «گشتیم و نبود» یکی گرفته شده بود (۸٫۲۰) ══
 * صاحبِ برنامه دیروز لایهٔ ۳ را روشن کرد و خطِ روزانه گفت «روشن (مدل هنوز
 * پیدا نشده)». آن جمله **شاهدِ نبودنِ مدل نیست**: `lvGenStatus_` مدل را فقط
 * از حافظه می‌خوانَد و حافظه را تنها `lvGenFill_` پر می‌کند، یعنی موقعِ
 * ساختنِ تصویرِ یک قسمت. پس تا امروز **هیچ‌کس نگشته بود** و خط طوری
 * می‌نوشت که انگار گشته و نیافته.
 *
 * ۷٫۴۷ همین را نوشت: «نگاه نکردیم» و «نگاه کردیم و نیست» دو حقیقت‌اند. و
 * تفاوتشان عملی است: اولی یعنی صبر کن، دومی یعنی این قابلیت روشن است و
 * کار نمی‌کند — حالتِ «روشن ولی بی‌اثر»ِ ۸٫۰۵، تنها حالتی که ایراد است.
 *
 * گشتن **روی `healthCheck`** می‌نشیند نه `writeStatus_`: `listModels_` یک
 * فراخوانِ شبکه است و `writeStatus_` هر دو ساعت می‌دود. گذاشتنِ هزینه روی
 * داغ‌ترین مسیرِ موتور همان اشتباهی است که ۷٫۶۳/۷٫۶۶/۷٫۷۲ سه بار ثبت
 * کردند. */
function lvGenProbe_() {
  var out = { looked: false, id: '', why: '' };
  try {
    if (lvGenOn_() !== true) return out;
    if (String(CFG.LV_GEN_MODEL || '').trim()) return out;   // تنظیمِ صریح
    var seen = null;
    try { seen = JSON.parse(props_().getProperty(PK.LV_GEN_SEEN) || 'null'); } catch (e1) {}
    var fresh = seen && seen.at &&
                (new Date().getTime() - Number(seen.at)) / 86400000 <
                (Number(CFG.MODEL_REFRESH_DAYS) || 7);
    if (fresh && seen.id) return { looked: true, id: String(seen.id), why: String(seen.why || '') };
    var r = lvGenModel_();
    out.looked = true; out.id = String((r && r.id) || ''); out.why = String((r && r.why) || '');
    try {
      props_().setProperty(PK.LV_GEN_SEEN, JSON.stringify(
        { at: new Date().getTime(), id: out.id, why: out.why }));
    } catch (e2) {}
  } catch (e) { out.why = 'گشتن نشد: ' + e.message; }
  return out;
}

/** آنچه آخرین گشتن دید — بی هیچ فراخوانِ شبکه. سه حالت، نه دو. */
function lvGenSeen_() {
  try {
    var c = JSON.parse(props_().getProperty(PK.LV_GEN_SEEN) || 'null');
    if (!c || !c.at) return null;
    return { at: Number(c.at), id: String(c.id || ''), why: String(c.why || '') };
  } catch (e) { return null; }
}

function lvGenStatus_() {
  var out = { on: false, model: '', usd: 0, n: 0, cap: 0, price: 0, room: 0, line: '',
              looked: false, lookWhy: '', dead: false };
  try {
    out.on = lvGenOn_();
    out.cap = Number(CFG.LV_GEN_USD_MONTH) || 0;
    var sp = lvGenSpend_();
    out.usd = sp.usd; out.n = sp.n;
    try {
      var c = JSON.parse(props_().getProperty(PK.LV_GEN_MODEL) || 'null');
      /* همان قاعدهٔ `lvGenModel_`، بی فهرست‌گرفتن (۸.۵۴): حافظه‌ای که پیش از
         سنجاق نوشته شده، در انتخابِ بعدی کنار می‌رود. تا ۸.۵۳ این خط حافظه را
         عیناً نقل می‌کرد، پس ایمیلِ ۶ اکتبر در یک سطر «روشن با
         gemini-3.1-flash-image-preview» می‌گفت و دو سطر پایین‌تر «مدلِ تصویرِ
         ساخته‌شده: gemini-3.1-flash-lite-image» — دو جوابِ یک پرسش در یک ایمیل. */
      var pinE = String(CFG.LV_GEN_MODEL_PIN || '').trim();
      var eff = String(CFG.LV_GEN_MODEL || '').trim();
      /* فقط وقتی یک بار گشته‌ایم (حافظه هست): «هنوز نگشته‌ایم» حالتِ جدای خودش است (۸.۲۰). */
      if (!eff && pinE && c && c.id && String(c.pinMiss || '') !== pinE && !lvGenPinDefect_(pinE).bad) eff = pinE;
      out.model = eff || String((c && c.id) || '');
    } catch (eC) { out.model = String(CFG.LV_GEN_MODEL || ''); }
    out.price = lvGenPrice_(out.model);
    out.room = out.on ? lvGenRoom_(out.model) : 0;
    out.quality = out.model ? lvGenModelBad_(out.model) : null;
    /* سنجاق (۸.۵۰): برای مدلِ سنجاق‌شده میانگینِ زیرِ کف «ایراد» نیست — تصمیمِ
       چشمِ او بر داور مقدم است — ولی عددش هر روز گفته می‌شود. */
    out.pin = String(CFG.LV_GEN_MODEL_PIN || '');
    out.pinned = !!out.pin && out.model === out.pin && !String(CFG.LV_GEN_MODEL || '');
    try {
      var cc = JSON.parse(props_().getProperty(PK.LV_GEN_MODEL) || 'null');
      out.pinMiss = !!(out.pin && cc && String(cc.pinMiss || '') === out.pin);
      out.pickWhy = String((cc && cc.why) || '');
    } catch (eCc) { out.pinMiss = false; }
    /* سه حالت، نه دو (۸٫۲۰): مدل داریم · گشتیم و نبود · هنوز نگشته‌ایم.
       فقط حالتِ دوم ایراد است، و علتش **نام برده می‌شود** — «نبود» و
       «فهرستِ مدل‌ها خوانده نشد» دو چارهٔ کاملاً متفاوت دارند (۷٫۳۲). */
    var seen = lvGenSeen_();
    out.looked = !!seen;
    out.lookWhy = seen ? seen.why : '';
    out.dead = !!(out.on && !out.model && seen && !seen.id);
    if (!out.on) {
      /* دستور باید **انجام‌شدنی** باشد: تا ۸٫۱۴ همین خط می‌گفت
         «`LV_GEN_ENABLED` را true کنید» — یعنی ویرایشِ سورس، کاری که او
         نمی‌کند. حالا نامِ گزینهٔ منو می‌آید (۸٫۱۵). */
      out.line = 'تصویرِ ساخته‌شده با مدل: **خاموش** — تصمیمِ خودتان است. ' +
                 'از منوی «موتور محتوا» گزینهٔ «🎨 تصویرِ ساخته‌شده: روشن/خاموش» ' +
                 'روشنش می‌کند؛ سقفِ ماهانه ' +
                 faDigitsOut_(String(out.cap)) + ' دلار است و موتور از آن رد نمی‌شود.';
    } else {
      out.line = 'تصویرِ ساخته‌شده: روشن' +
        (out.model ? ' با ' + out.model
                   : (out.dead
                       ? ' ❌ **ولی مدلی پیدا نشد** (' + (out.lookWhy || 'بی علت') +
                         ') — یعنی امروز فقط کارتِ متنی درمی‌آید'
                       : ' · هنوز دنبالِ مدل نگشته‌ایم؛ وارسیِ ۱۰ صبح می‌گردد')) +
        ' · این ماه ' + faDigitsOut_(String(out.n)) + ' تصویر، ~' +
        out.usd.toFixed(2) + ' از ' + faDigitsOut_(String(out.cap)) + ' دلار' +
        ' · جای ' + faDigitsOut_(String(out.room)) + ' تصویرِ دیگر' +
        /* کیفیت هم، نه فقط خرج (۸.۳۳): «روشن است» با «خوب می‌سازد» یکی نیست. */
        (out.pinned ? ' (سنجاق: مدلِ درسِ ۳۸ که شما پسندیدید)' :
         out.pinMiss ? ' ❌ (سنجاقِ «' + out.pin + '» در دسترس نیست: ' +
                       (out.pickWhy.split('سنجاقِ «' + out.pin + '» ')[1] || 'علت ثبت نشده') + ')' : '') +
        (out.quality && out.quality.n
          ? ' · داوریِ تصویرها: میانگین ' + faDigitsOut_(String(out.quality.avg)) + ' از ۱۰ در ' +
            faDigitsOut_(String(out.quality.n)) + ' تصویر' +
            (out.quality.bad && out.pinned
              ? ' — زیرِ کفِ داور است ولی سنجاق است؛ داور فقط تصویرِ ضعیف را از نو می‌سازد'
              : out.quality.bad ? ' — ❌ زیرِ کفِ داوری؛ اگر مدلِ تصویرِ دیگری باشد، ساختِ بعدی با همان است' : '')
          : ' · داوریِ تصویرها: هنوز هیچ') +
        ' (قیمتِ فرض‌شده هر تصویر ' + out.price.toFixed(3) + ' دلار — اگر غلط ' +
        'است `LV_GEN_PRICES` را عوض کنید).';
      /* سقف، نه هدف (۸.۴۸/۸.۴۹) — بی هیچ خواندنِ درایو یا هاب (این تابع در
         `writeStatus_` است؛ ۷.۶۳). هر روز گفته می‌شود، حتی وقتی همه‌چیز جا می‌شود:
         سکوت با «بودجه بُرید ولی کسی نگفت» یکی است. */
      if (out.model) {
        var lp = null;
        try { lp = JSON.parse(props_().getProperty(PK.LV_PACE_LAST) || 'null'); } catch (eLp) { lp = null; }
        var pc = lvScenePace_(out.model);
        out.pace = { allow: Math.round(pc.allow * 100) / 100, ceil: Math.round(pc.ceil * 100) / 100,
                     max: pc.max, last: lp ? { key: String(lp.key || ''), natural: Number(lp.natural) || 0,
                                               used: Number(lp.used) || 0, paced: !!lp.paced,
                                               by: String(lp.by || '') } : null };
        out.line += '\n💵 سقفِ ماه سقف است، نه هدف: هر درس به اندازهٔ محتوایش تصویر می‌گیرد. ' +
          'سهمِ میانگینِ هر درس ~' + pc.allow.toFixed(2) + ' دلار؛ درسِ پرتصویر تا ~' +
          pc.ceil.toFixed(2) + ' دلار (~' + faDigitsOut_(String(pc.max)) + ' تصویر).';
        if (lp && lp.used) {
          out.line += ' آخرین درس (' + String(lp.key || '') + '): ' +
            (lp.by === 'زمان' ? 'برشِ محتوایی نشد و برشِ زمانی ' : 'محتوا ') +
            faDigitsOut_(String(lp.natural || lp.used)) + ' صحنه خواست' +
            (lp.paced ? ' و سقفِ همان روز ' + faDigitsOut_(String(lp.used)) + ' صحنه داد — ' +
                        'اگر این زیاد تکرار شود، سقف برای محتوا کم است'
                      : ' و همان ساخته شد') + '.';
        }
      }
      /* کلیپِ آغاز (۸.۵۱) — هر روز، حتی وقتی هنوز هیچ کلیپی ساخته نشده: سکوت با «ساخته
         نمی‌شود» یکی است. از Properties، بی درایو (۷.۶۳). */
      out.clip = lvClipStatus_();
      if (out.clip.line) out.line += '\n' + out.clip.line;
      out.motion = lvMotionStatus_();
      if (out.motion.line) out.line += '\n' + out.motion.line;
      /* کارت‌های نوشتاری — آنچه روی ویدئو نشست (۸.۵۶). */
      out.ov = lvOvStatus_();
      if (out.ov.line) out.line += '\n' + out.ov.line;
      out.fb = lvSceneFbStatus_();
      if (out.fb.line) out.line += '\n' + out.fb.line;
      out.aud = lvAudStatus_();
      if (out.aud.line) out.line += '\n' + out.aud.line;
    }
  } catch (e) { out.line = ''; }
  return out;
}

/** خطِ روزانهٔ کلیپِ آغاز. */
function lvClipStatus_() {
  var out = { on: lvClipOn_(), model: String(CFG.LV_CLIP_MODEL || ''), clips: 0, usd: 0, last: null,
              fails: 0, ok: true, line: '' };
  try {
    out.clips = Number(lvGenSpend_().clips) || 0;
    out.usd = lvClipCost_();
    try { out.last = JSON.parse(props_().getProperty(PK.LV_CLIP_LAST) || 'null'); } catch (eL) { out.last = null; }
    out.fails = Number(out.last && out.last.fails) || 0;
    out.ok = !(out.on && out.fails >= Math.max(1, Number(CFG.LV_CLIP_FAIL_FIND) || 2));
    if (!out.on) {
      out.line = '🎬 کلیپِ آغازِ درس: خاموش.';
      return out;
    }
    var L = out.last;
    out.line = '🎬 کلیپِ آغازِ درس: روشن با ' + out.model + ' (~' + out.usd.toFixed(2) + ' دلار برای ' +
      faDigitsOut_(String(lvClipSec_())) + ' ثانیه، از همان سقفِ ماه) · این ماه ' +
      faDigitsOut_(String(out.clips)) + ' کلیپ' +
      (L ? ' · آخرین (' + String(L.key || '') + '): ' +
           (L.state === 'ok' ? '✅ ساخته و داوری شد' + (L.n ? ' (روی صحنهٔ ' + faDigitsOut_(String(L.n)) + '، نه روی تاریخ)' : '') :
            L.state === 'fail' ? '❌ نشد — ' + String(L.why || 'بی علت') + ' — ویدئو با همان نقاشیِ ثابت رفت' :
            L.state === 'off' ? 'ساخته نشد — ' + String(L.why || '') : String(L.state || ''))
         : ' · هنوز هیچ درسی با کلیپ ساخته نشده') +
      (out.ok ? '' : ' · ❌ ' + faDigitsOut_(String(out.fails)) + ' درسِ پیاپی کلیپشان نشد' +
        (L && L.fail && L.state !== 'fail' ? ' (آخرین علت: ' + String(L.fail.why || 'بی علت') + ')' : '')) + '.';
  } catch (e) { out.line = ''; }
  return out;
}

/** زیرپوشهٔ تصویرهای همین قسمت. `null` اگر ساخته نشد. */
function lvFolder_(epFolder) {
  var nm = CFG.LV_FOLDER || 'تصویرها';
  try {
    var it = epFolder.getFoldersByName(nm);
    return it.hasNext() ? it.next() : epFolder.createFolder(nm);
  } catch (e) { logLine_('پوشهٔ تصویرها ساخته نشد: ' + e.message); return null; }
}

function lvName_() { return CFG.LV_FILE || '_visuals.json'; }

function lvRead_(epFolder) {
  try {
    var it = epFolder.getFilesByName(lvName_());
    if (it.hasNext()) {
      var d = JSON.parse(it.next().getBlob().getDataAsString());
      if (d && Object.prototype.toString.call(d.items) === '[object Array]') return d;
    }
  } catch (e) {}
  return null;
}

function lvWrite_(epFolder, d) {
  d.at = nowStr_();
  var body = JSON.stringify(d, null, 1);
  try {
    var it = epFolder.getFilesByName(lvName_());
    if (it.hasNext()) { it.next().setContent(body); return true; }
    epFolder.createFile(Utilities.newBlob(body, 'application/json', lvName_()));
    return true;
  } catch (e) { logLine_('پروندهٔ تصویرها ذخیره نشد: ' + e.message); return false; }
}

/**
 * نامِ ثابتِ هر تصویر — پلِ میانِ «ساختن» و «دوباره پیدا کردن»، همان نقشی که
 * `ytCoverName_` دارد. **شمارهٔ ترتیب در نام است**، چون ترتیب همان چیزی است
 * که ویدئو از آن ساخته می‌شود؛ نامی که ترتیب را نگوید، پوشه را به تودهٔ
 * بی‌معنا بدل می‌کند و اجرای بعدی نمی‌داند چه ساخته شده.
 */
function lvImgName_(i, v) {
  return 'تصویر ' + faDigitsOut_(String(Number(i) + 1)) +
         ' — بخش ' + faDigitsOut_(String((v && v.at) || 0)) + '.png';
}

/**
 * جعبه‌های یک «نمودار» — راست‌به‌چپ، با پیکانِ رو به چپ میانشان.
 *
 * چرا جعبه و نه سطرِ فهرست: مدل «نمودار» را جایی می‌خواهد که **رابطه یا
 * روند** مهم‌تر از واژه است. اگر همان بولت‌های کارت را بکشیم، «نمودار» فقط
 * یک برچسب می‌شود و هیچ‌چیز در تصویر عوض نمی‌شود — یعنی گونه‌ای که مدل
 * انتخاب کرد بی‌اثر است.
 */
function lvFlowDraw_(slide, W, H, pal, lines) {
  var n = Math.max(1, Math.min(4, (lines || []).length));
  var pad = W * 0.07, gap = W * 0.035;
  var bw = (W - pad * 2 - gap * (n - 1)) / n;
  var top = H * 0.42, bh = H * 0.28;
  for (var k = 0; k < n; k++) {
    var left = pad + (n - 1 - k) * (bw + gap);        // موردِ اول، راست‌ترین
    var box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, left, top, bw, bh);
    try {
      box.getFill().setSolidFill(pal.bg);
      box.getBorder().setWeight(2);
      box.getBorder().getLineFill().setSolidFill(pal.ac);
    } catch (eB) {}
    try {
      var t = box.getText();
      t.setText(String(lines[k] || ''));
      t.getTextStyle().setFontSize(n > 3 ? 14 : 17).setForegroundColor(pal.fg).setBold(false);
      t.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    } catch (eT) {}
    // پیکان بینِ این جعبه و بعدی — جهتِ خواندن، چپ
    if (k < n - 1) {
      try {
        var ar = slide.insertShape(SlidesApp.ShapeType.LEFT_ARROW,
          left - gap * 0.9, top + bh * 0.38, gap * 0.8, bh * 0.24);
        ar.getFill().setSolidFill(pal.ac);
        ar.getBorder().setTransparent();
      } catch (eA) {}
    }
  }
  return n;
}

/**
 * یک کارت روی یک صفحه. `kind` فقط بدنه را عوض می‌کند؛ قاب و رنگ یکی است،
 * چون دوازده کارتِ پشتِ‌هم باید **یک قسمت** به‌نظر بیایند، نه دوازده تصویرِ
 * بی‌ربط. تنوع از جای نوارِ کناری می‌آید، نه از رنگ.
 */
/**
 * قابِ کارت — **این‌جا سبک واقعاً کار می‌کند.**
 *
 * هر سبک یک `frame` دارد و شکلِ قاب از همان می‌آید. اگر این تابع نبود،
 * ستونِ «سبکِ تصویر» یک واژه در شیت می‌شد و هیچ چیزی در تصویر عوض نمی‌کرد —
 * همان «برچسبی که ورودی ندارد» که این پرونده بیش از هر شکلِ دیگری ثبتش
 * کرده.
 */
function lvFrameDraw_(slide, W, H, pal, frame, i) {
  var fill = function (sh, c) { try { sh.getFill().setSolidFill(c); } catch (e) {} };
  var noLine = function (sh) { try { sh.getBorder().setTransparent(); } catch (e) {} };
  var R = SlidesApp.ShapeType;
  if (frame === 'hairline') {
    // خطِ مو: فقط دو خطِ نازک، بی هیچ پُری — «مینیمال» یعنی همین
    var t1 = slide.insertShape(R.RECTANGLE, W * 0.06, H * 0.075, W * 0.88, H * 0.004);
    fill(t1, pal.ac); noLine(t1);
    var b1 = slide.insertShape(R.RECTANGLE, W * 0.06, H * 0.92, W * 0.88, H * 0.004);
    fill(b1, pal.ac); noLine(b1);
    return 'hairline';
  }
  if (frame === 'dashed') {
    // تختهٔ سفید: قابِ خط‌چین، مثلِ کشیدنِ دورِ یک مطلب روی تخته
    var bx = slide.insertShape(R.RECTANGLE, W * 0.04, H * 0.05, W * 0.92, H * 0.88);
    try {
      bx.getFill().setTransparent();
      bx.getBorder().setWeight(2);
      bx.getBorder().setDashStyle(SlidesApp.DashStyle ? SlidesApp.DashStyle.DASH : 'DASH');
      bx.getBorder().getLineFill().setSolidFill(pal.ac);
    } catch (eD) {}
    return 'dashed';
  }
  if (frame === 'motif') {
    // نقشِ ایرانی: نوارِ لوزی‌های تکرارشونده، بالا و پایین
    for (var m = 0; m < 9; m++) {
      var x = W * 0.06 + m * (W * 0.88 / 9);
      var d1 = slide.insertShape(R.DIAMOND, x, H * 0.045, W * 0.026, H * 0.046);
      fill(d1, pal.ac); noLine(d1);
      var d2 = slide.insertShape(R.DIAMOND, x, H * 0.905, W * 0.026, H * 0.046);
      fill(d2, pal.ac); noLine(d2);
    }
    return 'motif';
  }
  if (frame === 'wash') {
    // آبرنگ: یک لکهٔ بزرگِ نرم در گوشه، زیرِ متن
    var el = slide.insertShape(R.ELLIPSE, -W * 0.12, H * 0.42, W * 0.62, H * 0.70);
    fill(el, pal.ac); noLine(el);
    try { el.sendToBack(); } catch (eB) {}
    return 'wash';
  }
  if (frame === 'rules') {
    // چاپِ قدیمی: دو خطِ موازیِ کلاسیک بالا و یک خطِ نازک پایین
    var r1 = slide.insertShape(R.RECTANGLE, W * 0.07, H * 0.085, W * 0.86, H * 0.006);
    fill(r1, pal.ac); noLine(r1);
    var r2 = slide.insertShape(R.RECTANGLE, W * 0.07, H * 0.105, W * 0.86, H * 0.002);
    fill(r2, pal.ac); noLine(r2);
    var r3 = slide.insertShape(R.RECTANGLE, W * 0.07, H * 0.905, W * 0.86, H * 0.002);
    fill(r3, pal.ac); noLine(r3);
    return 'rules';
  }
  if (frame === 'layers') {
    // کاغذبری: سه مستطیلِ جابه‌جا، مثلِ کاغذهای روی هم
    for (var L = 2; L >= 0; L--) {
      var off = L * (W * 0.012);
      var ly = slide.insertShape(R.RECTANGLE, W * 0.035 + off, H * 0.05 + off,
                                 W * 0.92, H * 0.87);
      fill(ly, L === 0 ? pal.bg : pal.ac); noLine(ly);
      try { ly.sendToBack(); } catch (eL) {}
    }
    return 'layers';
  }
  // 'bar' — نوارِ پایین + نوارِ باریکِ کنارِ جای‌گردان (رفتارِ ۷٫۹۳)
  var bar = slide.insertShape(R.RECTANGLE, 0, H - H * 0.045, W, H * 0.045);
  fill(bar, pal.ac); noLine(bar);
  var side = (i % 2 === 0);
  var stripe = slide.insertShape(R.RECTANGLE,
    side ? W - W * 0.011 : 0, H * 0.10, W * 0.011, H * 0.60);
  fill(stripe, pal.ac); noLine(stripe);
  return 'bar';
}

function lvCardDraw_(slide, W, H, pal, v, ctx, i, n, frame, bgImg) {
  var kind = String((v && v.kind) || 'کارت');
  var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
  bg.getFill().setSolidFill(pal.bg);
  bg.getBorder().setTransparent();
  /* ══ پس‌زمینهٔ ساخته‌شده، و لایهٔ تیره‌ای که خوانایی را تضمین می‌کند (۷٫۹۸) ══
   * تصویر تمام‌قاب می‌نشیند و **زیرِ** همه‌چیز می‌رود، بعد یک مستطیلِ تیرهٔ
   * نیم‌شفاف رویش. آن لایه تزئین نیست: پس‌زمینهٔ ساخته‌شده هر رنگی می‌تواند
   * دربیاید و بی آن، متنِ روشن روی یک تصویرِ روشن **ناخوانا** می‌شود —
   * یعنی همان چیزی که کلِ کارت برایش هست از دست می‌رود. با آن، بدترین حالتِ
   * یک تصویرِ بد «زشت» است، نه «نامفهوم».
   * و اگر تصویری نیست، همین‌جا هیچ اتفاقی نمی‌افتد: کارتِ ۷٫۹۶ دست‌نخورده. */
  if (bgImg) {
    try {
      /* ══ ترتیبِ درج **همان** ترتیبِ لایه‌هاست، و همین کافی است ══
       * مستطیلِ رنگی از قبل درج شده، پس تصویر رویش می‌نشیند و لایهٔ تیره و
       * قاب و متن بعد از آن. نتیجه: رنگ ← تصویر ← لایهٔ تیره ← قاب ← متن.
       * نگارشِ اول دو فراخوانِ `sendToBack()` هم داشت — روی تصویر و روی
       * مستطیل — و **هر دو مرده بودند**: با شکستنِ هر کدام ترتیبِ نهایی عوض
       * نمی‌شد، و همین بود که نشانشان داد. کدِ مرده شکلِ شکستِ این مخزن است
       * (سه باگِ واقعیِ ثبت‌شده، هر سه از همین جنس)، پس برداشته شدند.
       * و سنجهٔ ۵۷٫۹-ب حالا خودِ **ترتیب** را می‌پرسد، نه وجودِ یک فراخوان —
       * پس اگر کسی روزی این بلوک را جابه‌جا کند، قرمز می‌شود. */
      var im = slide.insertImage(bgImg, 0, 0, W, H);
      var a = Number(CFG.LV_GEN_SCRIM);
      if (!isFinite(a)) a = 0.55;
      a = Math.max(0, Math.min(0.95, a));
      var sc = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
      /* `setSolidFill(color, alpha)` — و نه `setTransparency`، که در
         SlidesApp وجود ندارد. آلفا آن‌جاست که رنگ گذاشته می‌شود. */
      sc.getFill().setSolidFill(pal.bg, a);
      sc.getBorder().setTransparent();
    } catch (eI) {}
  }
  try { lvFrameDraw_(slide, W, H, pal, String(frame || 'bar'), i); } catch (eF) {}

  /* ══ چهار چیدمان، نه یکی (۷.۹۹) ══
   * خواستهٔ صریح: «جوری که تکراری نباشه و متنوع و قشنگ باشه». سنجیده شد و
   * نبود: چهار کارتِ پشتِ‌هم **یک** چیدمانِ یکتا داشتند و تنها تفاوتشان جای
   * نوارِ باریکِ کناری بود. دوازده کارت در یک قسمت یعنی دوازده تصویرِ
   * تقریباً یکسان.
   * ولی تنوع **درونِ** سبک می‌مانَد: رنگ و قاب یکی است (یک قسمت باید یک چیز
   * به‌نظر بیاید)، و آنچه می‌گردد **جای متن و وزنش** است — بالا/وسط/پایین،
   * راست‌چین/وسط‌چین، با و بی خطِ جداکننده. چهار چیدمان با چرخشِ `i % 4`، پس
   * هیچ دو کارتِ پیاپی یکی نیستند و هر چهارمین یکی تکرار می‌شود — و آن
   * فاصله در ویدئو دیده نمی‌شود.
   * ترتیبِ درج عمداً دست‌نخورده: متن بعد از قاب و لایهٔ تیره می‌آید، پس
   * همیشه رویشان است (سنجهٔ ۵۷.۹-ب/ت). */
  var LAY = [
    { top: 0.17, tall: 0.22, body: 0.42, align: 'END',    rule: false },
    { top: 0.30, tall: 0.24, body: 0.58, align: 'END',    rule: true  },
    { top: 0.13, tall: 0.20, body: 0.38, align: 'CENTER', rule: true  },
    { top: 0.24, tall: 0.26, body: 0.54, align: 'END',    rule: false }
  ];
  var lay = LAY[Math.abs(Number(i) || 0) % LAY.length];
  var pad = W * 0.075;
  var put = function (txt, top, height, size, color, bold, align) {
    var box = slide.insertTextBox(String(txt == null ? '' : txt), pad, top, W - pad * 2, height);
    try {
      var t = box.getText();
      t.getTextStyle().setFontSize(size).setForegroundColor(color).setBold(!!bold);
      t.getParagraphStyle().setParagraphAlignment(align || SlidesApp.ParagraphAlignment.END);
    } catch (eP) {}
    return box;
  };
  var alignOf = function (nm) {
    try {
      return nm === 'CENTER' ? SlidesApp.ParagraphAlignment.CENTER
                             : SlidesApp.ParagraphAlignment.END;
    } catch (eA) { return null; }
  };

  // سرِ بخش، بالا — تا تصویر بدونِ صوت هم بگوید کجای درس است
  if (v && v.heading) {
    put(ytVisCut_(v.heading, 60), H * 0.085, H * 0.085, 16, pal.ac, true, alignOf(lay.align));
  }

  var ttl = String((v && v.cardTitle) || (v && v.heading) || '');
  var fs = ttl.length > 34 ? 30 : (ttl.length > 20 ? 36 : 44);
  put(ttl, H * lay.top, H * lay.tall, fs, pal.fg, true, alignOf(lay.align));

  /* خطِ جداکنندهٔ کوتاه زیرِ عنوان — در دو چیدمان از چهار. کوچک است و
     همان‌قدر کار می‌کند: چشم می‌فهمد کارت تازه است. */
  if (lay.rule) {
    try {
      var rw = W * 0.14;
      var rx = lay.align === 'CENTER' ? (W - rw) / 2 : (W - pad - rw);
      var rl = slide.insertShape(SlidesApp.ShapeType.RECTANGLE,
        rx, H * (lay.top + lay.tall - 0.01), rw, H * 0.006);
      rl.getFill().setSolidFill(pal.ac);
      rl.getBorder().setTransparent();
    } catch (eR) {}
  }

  var lines = (v && v.cardLines) || [];
  if (kind === 'نمودار' && lines.length) {
    lvFlowDraw_(slide, W, H, pal, lines);
  } else if (lines.length) {
    var body = [];
    for (var L = 0; L < lines.length; L++) body.push('•  ' + String(lines[L] || ''));
    put(body.join('\n'), H * lay.body, H * 0.32, lines.length > 3 ? 18 : 21,
        pal.fg, false, alignOf(lay.align));
  }

  /* پانویس: برنامه، قسمت، و **شمارهٔ همین تصویر از کل**. آن عددِ آخر ارزان
     است و جوابِ «کدام کارت را دیدم؟» — هم برای بیننده، هم برای ناظری که
     باید یک تصویرِ واقعی را باز کند و دربارهٔ‌ش نظر بدهد. */
  var foot = [];
  if (ctx && ctx.showName) foot.push(String(ctx.showName));
  if (ctx && ctx.epNum) foot.push('قسمت ' + String(ctx.epNum));
  foot.push(faDigitsOut_(String(Number(i) + 1)) + ' از ' + faDigitsOut_(String(Number(n) || 1)));
  put(foot.join('  ·  '), H * 0.895, H * 0.075, 13, pal.ac, false);
  return true;
}

/**
 * کارت‌های خواسته‌شده را می‌سازد و به‌صورتِ PNG در پوشهٔ تصویرها می‌نشاند.
 * `todo` فهرستِ `{i, v, n}` است — فقط آنچه هنوز فایل ندارد.
 */
function lvCards_(ctx, todo, imgFolder, style, bgMap) {
  var out = { made: [], why: '' };
  if (!todo || !todo.length) return out;
  var pres = null;
  try {
    /* رنگ از **سبکِ همین مجموعه** می‌آید، نه از هش نامِ دسته. بی این خط،
       ستونِ «سبکِ تصویر» یک واژه در شیت است و بس. */
    var sty = style || lvStyleDefault_();
    var pal = (sty && sty.pal) || ytPalette_((ctx && (ctx.cat || ctx.seriesName)) || '');
    var pTitle = 'کارت‌ها — ' + String((ctx && ctx.showName) || '') + ' قسمت ' +
                 String((ctx && ctx.epNum) || '');
    var mkP = ytPresCreate_(pTitle, 12192000, 6858000);
    if (!mkP.id) { out.why = mkP.why || 'ارائه ساخته نشد'; return out; }
    if (!mkP.exact) logLine_('کارت‌های تصویر با اندازهٔ پیش‌فرض ساخته شدند — ' + mkP.why);
    pres = SlidesApp.openById(mkP.id);

    var pages = pres.getSlides();
    var first = pages[0];
    try {
      var els = first.getPageElements();
      for (var e = 0; e < els.length; e++) els[e].remove();
    } catch (eEl) {}
    var use = [first];
    for (var k = 1; k < todo.length; k++) {
      use.push(pres.appendSlide(SlidesApp.PredefinedLayout.BLANK));
    }

    var W = pres.getPageWidth(), H = pres.getPageHeight();
    for (var j = 0; j < todo.length; j++) {
      try { lvCardDraw_(use[j], W, H, pal, todo[j].v, ctx, todo[j].i, todo[j].n,
                        (sty && sty.frame) || 'bar',
                        (bgMap || {})[String(todo[j].i)] || null); }
      catch (eD) { out.why = 'کارتِ ' + (todo[j].i + 1) + ' کشیده نشد: ' + eD.message; }
    }

    /* شناسهٔ صفحه‌ها **پیش از** `saveAndClose` برداشته می‌شود. کاور همین کار
       را بعدش می‌کند و تا امروز اشکالی نداشته، ولی شیئی که بسته شده قرار
       نیست جواب بدهد و این‌جا دوازده تا از آن‌هاست. */
    var ids = [];
    for (var p = 0; p < use.length; p++) ids.push(use[p].getObjectId());
    pres.saveAndClose();
    var pid = pres.getId();
    pres = null;

    for (var x = 0; x < todo.length; x++) {
      var nm = lvImgName_(todo[x].i, todo[x].v);
      var blob = ytSlideExport_(pid, ids[x], nm);
      if (!blob) { if (!out.why) out.why = 'خروجیِ PNG نشد'; continue; }
      var f = null;
      try {
        // بازسازی باید *جایگزین* کند، نه هم‌نامِ دوم بسازد (تلهٔ getFilesByName)
        var old = imgFolder.getFilesByName(nm);
        while (old.hasNext()) old.next().setTrashed(true);
        f = imgFolder.createFile(blob);
      } catch (eF) { out.why = 'فایلِ تصویر ذخیره نشد: ' + eF.message; }
      if (f) out.made.push({ i: todo[x].i, fileId: f.getId(), name: nm });
    }
    /* فایلِ ارائه هم می‌مانَد، همان‌جا — اگر کارتی بد درآمد باید دید چه بوده.
       ولی **هم‌نامِ پیشین تُرش می‌شود**: یک قسمت می‌تواند چند اجرا لازم داشته
       باشد (سقفِ `LV_BUILD_MAX`) و بی این خط، هر اجرا یک ارائهٔ دورریختنیِ
       دیگر در پوشهٔ قسمت می‌گذارد. همان تلهٔ هم‌نامیِ `ytCoverCard_`. */
    try {
      var oldP = imgFolder.getFilesByName(pTitle);
      while (oldP.hasNext()) { var op = oldP.next(); if (op.getId() !== pid) op.setTrashed(true); }
    } catch (eOP) {}
    try { DriveApp.getFileById(pid).moveTo(imgFolder); } catch (eM) {}
    return out;
  } catch (e) {
    out.why = 'کارت‌های تصویر ساخته نشدند: ' + e.message;
    logLine_(out.why);
    return out;
  }
}

/**
 * برنامه ⇒ فایل‌ها، با ادامه‌پذیری.
 *
 * ══ سه مرزی که این تابع را شکل می‌دهند ══
 *
 * **۱) تلاش پیش از کار ثبت می‌شود، نه بعدش.** Apps Script سرِ شش دقیقه
 * بی‌خطا کشته می‌شود. اگر شمارنده بعد از ساخت نوشته شود، اجرایی که وسطِ کار
 * مُرد هیچ‌چیز ثبت نمی‌کند و هر شب از نو شروع می‌شود — همان شاهدی که با خودِ
 * حادثه می‌میرد (۷٫۴۴/۷٫۶۴).
 *
 * **۲) آنچه ساخته شده دوباره ساخته نمی‌شود.** مرجع، **خودِ فایلِ روی درایو**
 * است نه ردیفِ `_visuals.json`: اگر کسی تصویری را پاک کند باید دوباره ساخته
 * شود، و اگر پرونده گم شود نباید دوازده کارت دوباره ساخته شود.
 *
 * **۳) مجموعهٔ ناقص «تمام» نیست.** `done` فقط وقتی درست است که هر موردِ
 * برنامه فایلش را داشته باشد. تصمیمِ «با ناقص منتشر کن یا صبر کن» این‌جا
 * گرفته نمی‌شود — `ytUploadOne_` با `LV_TRY_MAX` می‌گیردش، چون آن‌جاست که
 * می‌داند انتشار چقدر عقب افتاده.
 */
function lvBuild_(epFolder, plan, ctx, styleKey) {
  var out = { items: [], want: 0, ready: 0, made: 0, tries: 0, done: false, why: '',
              style: '', recipe: '', restyled: false, gen: false,
              gMade: 0, gSpent: 0, gModel: '' };
  var want = (plan && plan.visuals) || [];
  out.want = want.length;
  /* ══ عددی که خواسته شد، کنارِ عددی که ساخته شد (۸٫۱۱) ══
     `ytVisWant_` از روی طولِ قسمت می‌گوید چند تصویر لازم است و همان عدد در
     پرامپت می‌رود. تا امروز هیچ‌جا با نتیجه مقایسه نمی‌شد — ۷.۳۰/۷.۳۱، این
     بار بینِ یک پرسش و جوابش. */
  try {
    out.asked = ytVisWant_(Number((ctx || {}).totalSec) || 0);
    var dr = (ctx || {}).__visStat || null;
    if (dr) out.dropped = { raw: dr.raw || 0, badSec: dr.badSec || 0,
                            perSec: dr.perSec || 0, capped: dr.capped || 0 };
    var floor = Math.max(1, Math.ceil(out.asked * (Number(CFG.LV_THIN_PCT) || 0.5)));
    out.thin = out.want < floor;
  } catch (eAsk) { out.asked = 0; out.thin = false; }
  if (!want.length) { out.done = true; return out; }

  var imgFolder = lvFolder_(epFolder);
  if (!imgFolder) { out.why = 'پوشهٔ تصویرها ساخته نشد'; return out; }

  var d = lvRead_(epFolder) || { at: '', tries: 0, items: [] };
  out.tries = Math.max(0, Number(d.tries) || 0);

  /* ══ سبک که عوض شود، کارت‌ها از نو ساخته می‌شوند ══
   * وگرنه تنظیمی که هیچ اثرِ دیدنی ندارد، تنظیم نیست (۷٫۸۶).
   * ولی **«نمی‌دانیم» با «عوض شد» یکی نیست**: رشتهٔ خالی یعنی خواندنِ سبک
   * شکست خورد یا پرسیده نشد، و آن باید «همان که ذخیره شده» باشد — نه یک
   * بازسازیِ کاملِ بی‌دلیلِ دوازده کارت (۷٫۴۰). */
  var wantStyle = String(styleKey || '');
  var hadStyle = String(d.style || '');
  out.style = wantStyle || hadStyle;
  var sty = lvStyleResolve_(out.style) || lvStyleDefault_();
  /* ══ «دستور» = سبک + روشن‌بودنِ لایهٔ ۳ (۷.۹۸) ══
   * روشن‌کردنِ تصویرِ ساخته‌شده هم باید کارت‌های موجود را از نو بسازد، وگرنه
   * صاحبِ برنامه سوئیچی را روشن می‌کند که روی قسمت‌های ساخته‌شده هیچ اثری
   * ندارد — «تمیزکردنِ ورودی آنچه را قبلاً نوشته شده درست نمی‌کند» (۵.۹۵).
   * پس همان ماشینِ ۷.۹۶، با یک رشتهٔ دوجزئی. */
  out.gen = lvGenOn_();
  var wantRec = wantStyle ? (wantStyle + (out.gen ? ' + ساخته‌شده' : '')) : '';
  var hadRec = String(d.recipe || hadStyle || '');
  out.recipe = wantRec || hadRec;
  out.restyled = !!(wantRec && hadRec && wantRec !== hadRec);

  /* ══ تصویرِ ساخته‌شده به **همان** مورد تعلق دارد، نه به همان شماره (۸.۲۹) ══
   * نام‌ها شمارهٔ مورد را دارند («تصویر ۲ — بخش ۱»). وقتی نقشه پس از ساختِ
   * چند کارت عوض شود — پرسشِ دوبارهٔ ۸.۲۶ یا پرکردنِ ۸.۲۹ — موردِ دومِ
   * نقشهٔ تازه همان نامِ کارتِ دومِ نقشهٔ قبلی را دارد و آن کارت **روی
   * موردی دیگر** می‌نشیند: متنِ یک مفهوم، زیرِ گفتارِ مفهومی دیگر، بی هیچ
   * خطایی. پس آنچه `_visuals.json` از هر نام نوشته (`cardTitle`) با موردِ
   * امروز سنجیده می‌شود؛ ناهمخوان ⇒ به زباله و از نو. نامی که در پرونده
   * نیست «نمی‌دانیم» است و مثلِ قبل می‌مانَد (۷٫۴۰). */
  var was = Object.create(null);
  for (var wi = 0; wi < (d.items || []).length; wi++) {
    var di = d.items[wi] || {};
    if (di.name) was[String(di.name)] = String(di.cardTitle || '');
  }
  var have = Object.create(null);
  out.stale = 0;
  for (var i = 0; i < want.length; i++) {
    if (out.restyled) break;                   // همه از نو
    try {
      var nmI = lvImgName_(i, want[i]);
      var it = imgFolder.getFilesByName(nmI);
      if (!it.hasNext()) continue;
      var fI = it.next();
      if (Object.prototype.hasOwnProperty.call(was, nmI) &&
          was[nmI] !== String(want[i].cardTitle || '')) {
        fI.setTrashed(true);
        try {
          var bgI = imgFolder.getFilesByName(lvBgName_(i, want[i]));
          while (bgI.hasNext()) bgI.next().setTrashed(true);
        } catch (eBgS) {}
        out.stale++;
        continue;
      }
      have[String(i)] = fI.getId();
    } catch (eH) {}
  }
  if (out.stale) logLine_('نقشهٔ تصویرِ این قسمت عوض شده بود؛ ' + out.stale +
                          ' کارتِ ساخته‌شده به موردِ دیگری می‌خورد و از نو ساخته می‌شود.');
  /* ══ سبکِ تازه، پس‌زمینهٔ کهنه را هم باطل می‌کند ══
   * پس‌زمینهٔ ساخته‌شده **حال‌وهوای همان سبک** را دارد (`style.gen`). اگر
   * فقط کارت‌ها از نو ساخته شوند و پس‌زمینه‌ها از نامشان برداشته شوند، سبکِ
   * تازه روی **دیدنی‌ترین** بخشِ تصویر هیچ اثری ندارد — یعنی همان «تنظیمی
   * که اثرِ دیدنی ندارد» که ۷.۹۶ برایش ساخته شد، یک لایه آن‌طرف‌تر. سنجیده
   * شد: با تعویضِ سبک، «پس‌زمینهٔ تازه = ۰».
   * ساختنِ دوباره پول می‌خواهد و این **درست** است: صاحبِ برنامه سبک را عوض
   * کرده. سقف‌های ماهانه و هر اجرا سرِ جایشان‌اند. */
  if (out.restyled && out.gen) {
    var gone = 0;
    for (var gk = 0; gk < want.length; gk++) {
      try {
        var gi = imgFolder.getFilesByName(lvBgName_(gk, want[gk]));
        while (gi.hasNext()) { gi.next().setTrashed(true); gone++; }
      } catch (eGT) {}
    }
    if (gone) logLine_('سبک عوض شد، پس ' + gone + ' پس‌زمینهٔ ساخته‌شده هم ' +
                       'به زباله رفت و از نو ساخته می‌شود.');
  }
  if (out.restyled) {
    /* پیام **دستور** را می‌گوید، نه سبک را. مقایسه از ۷.۹۸ روی «سبک + لایهٔ
       ۳» است، و پیامی که فقط سبک را چاپ کند در حالتِ «سبک همان، لایهٔ ۳
       روشن شد» می‌نویسد «از نقشِ ایرانی به نقشِ ایرانی عوض شد» — یک جملهٔ
       بی‌معنا که خواننده را به شکِ خرابی می‌انداز. */
    logLine_('دستورِ تصویرِ این قسمت از «' + hadRec + '» به «' + wantRec +
             '» عوض شد؛ کارت‌ها از نو ساخته می‌شوند.');
  }

  var todo = [], cap = Math.max(1, Number(CFG.LV_BUILD_MAX) || 24);
  for (var j = 0; j < want.length; j++) {
    if (have[String(j)]) continue;
    todo.push({ i: j, v: want[j], n: want.length });
    if (todo.length >= cap) break;
  }

  /* ══ پس‌زمینه‌ها برای **همهٔ** کارت‌هایی که سطح می‌خواهد، نه فقط کارتِ امروز (۸.۲۶) ══
     تا ۸.۲۵ تصویرِ ساخته‌شده فقط برای کارتی خواسته می‌شد که **همین اجرا**
     کشیده می‌شد. کارتی که اجرای اول بی‌تصویر ساخته شد (سقفِ هر اجرا)، دیگر
     هرگز در `todo` نبود — پس «زیاد» عملاً یعنی شش تصویر. و کارت‌های برداری
     (`lvSpecBuild_`) که حالا ویدئو را می‌سازند، تصویر را از همین پوشه
     برمی‌دارند، نه از کارتِ اسلایدز. */
  var bgList = [], todoSet = Object.create(null);
  for (var ts = 0; ts < todo.length; ts++) todoSet[String(todo[ts].i)] = true;
  if (out.gen) {
    for (var bl = 0; bl < want.length; bl++) {
      bgList.push({ i: bl, v: want[bl], n: want.length, card: !!todoSet[String(bl)] });
    }
  }
  var bumped = false;
  if (todo.length) {
    d.tries = out.tries + 1;
    out.tries = d.tries;
    bumped = true;
    lvWrite_(epFolder, d);                       // مرزِ ۱: پیش از کار
  }
  /* پس‌زمینه‌ها **پیش از** کارت‌ها، چون کارت رویشان کشیده می‌شود. و شکستش
     هرگز کارت را زمین نمی‌زند: نقشهٔ خالی یعنی کارتِ ساده — رفتارِ ۷.۹۶. */
  var bgm = { map: {}, ids: {}, made: 0, spent: 0, why: '', model: '', want: 0, have: 0, capped: false };
  if (bgList.length) {
    try { bgm = lvGenFill_(bgList, imgFolder, sty, ctx); }
    catch (eG) { bgm.why = 'پس‌زمینه ساخته نشد: ' + eG.message; logLine_(bgm.why); }
  }
  out.gMade = bgm.made; out.gSpent = bgm.spent; out.gModel = bgm.model;
  out.bgIds = bgm.ids || {};
  out.gWant = bgm.want || 0; out.gHave = bgm.have || 0;
  if (bgm.why && !out.why) out.why = bgm.why;
  if (todo.length) {
    var r = lvCards_(ctx, todo, imgFolder, sty, bgm.map);
    out.made = r.made.length;
    if (r.why) out.why = r.why;
    for (var m = 0; m < r.made.length; m++) have[String(r.made[m].i)] = r.made[m].fileId;
  }

  for (var k = 0; k < want.length; k++) {
    var fid = have[String(k)];
    if (!fid) continue;
    out.items.push({
      n: k + 1,
      at: Number(want[k].at) || 0,
      /* `kind` آنچه خواسته شد، `via` آنچه ساخته شد. تا لایهٔ عکسِ آزاد
         نیاید این دو برای «عکس» و «ویدئو» فرق دارند، و همان فرق است که
         بعداً می‌گوید چند مورد جایگزین شده. */
      kind: String(want[k].kind || 'کارت'),
      via: 'کارت',
      style: out.style,
      sec: Number(want[k].sec) || 0,
      heading: String(want[k].heading || ''),
      cardTitle: String(want[k].cardTitle || ''),
      caption: String(want[k].caption || ''),
      terms: String(want[k].terms || ''),
      name: lvImgName_(k, want[k]),
      fileId: fid
    });
  }
  out.ready = out.items.length;
  out.done = out.ready >= want.length;
  /* تصویرهایی که سطح خواسته و فقط **سقفِ هر اجرا** جلویشان را گرفته، ارزشِ یک
     نوبتِ دیگر صبر کردن را دارند — ویدئو هنوز ساخته نشده و همین تصویرها در آن
     می‌نشینند. شکست (مدل نبود، سقفِ ماهانه) ارزشِ صبر ندارد، و `LV_TRY_MAX`
     در هر حال سقفِ انتظار است. */
  out.bgShort = !!(bgm.capped && out.gHave < out.gWant);
  if (out.done && out.bgShort) {
    out.done = false;
    /* **یک اجرا، یک تلاش** (۸.۲۹). اجرایی که کارت ساخته، تلاشش را همان بالا
       شمرده؛ شمردنِ دوباره یعنی یک اجرا دو تا از سه تلاش را بخورد و قسمت
       پس از دو نوبت با هر چه هست برود — صبرِ `LV_TRY_MAX` نصف می‌شد. */
    if (!bumped) { d.tries = out.tries + 1; out.tries = d.tries; }
  }

  d.items = out.items; d.want = out.want; d.ready = out.ready; d.done = out.done;
  d.asked = Number(out.asked) || 0;
  d.thin = out.thin === true;
  if (out.dropped) d.dropped = out.dropped;
  d.folderId = imgFolder.getId();
  /* سبک **فقط وقتی** ذخیره می‌شود که واقعاً پرسیده شده باشد: نوشتنِ رشتهٔ
     خالی روی سبکِ ذخیره‌شده یعنی شبِ بعد «عوض شد» تشخیص داده شود. */
  if (out.style) d.style = out.style;
  if (out.recipe) d.recipe = out.recipe;
  d.gen = out.gen === true;
  /* شمارهٔ بازنگری: هر بار که فایلی ساخته شد، شناسه‌ها عوض شده‌اند. جزوه
     شناسه‌ها را کش می‌کند، پس باید بتواند بفهمد کهنه شده (باگِ ۳). */
  if (out.made) d.rev = (Number(d.rev) || 0) + 1;
  d.note = 'این تصویرها را ویدئوی یوتیوب و جزوه هر دو می‌خوانند. ' +
           'فایلِ پاک‌شده شبِ بعد دوباره ساخته می‌شود.';
  lvWrite_(epFolder, d);
  return out;
}

/* ═══════════ دیده‌شدن: خطِ روزانه، لینکِ قسمت، و بدهی (۷٫۹۵) ═══════════
 *
 * ══ چرا این بخش، و چرا همین‌جا در ترتیبِ کار ══
 * از ۷٫۹۳ تصویرها ساخته می‌شوند و از ۷٫۹۴ در جزوه می‌نشینند. ولی تا این
 * نسخه، **شکستِ این زنجیره از بیرون با یک شبِ عادی یک شکل بود**:
 * `ytUploadOne_` وقتی تصویرها کامل نشده‌اند `waiting` برمی‌گرداند — و
 * «منتظرِ ویدئو» هم `waiting` است. دو حالتِ کاملاً متفاوت با یک نشانه.
 *
 * این عیناً همان چیزی است که بانکِ موسیقی را هفت هفته خالی نگه داشت: طرف
 * مقابل گزارش می‌داد و هیچ‌کس دو عدد را کنارِ هم نگذاشت. این بار **از پیش**
 * نوشته می‌شود، نه پس از زیان.
 *
 * ══ دو حافظه، و تفاوتشان همان تفاوتِ «عقب‌مانده» و «رهاشده» است (۵٫۸۸) ══
 * `PK.LV_WAIT` — قسمتی که منتظر است. **درست‌شدنی**: شبِ بعد دوباره تلاش
 *   می‌شود و صفر می‌شود.
 * `PK.LV_SHORT` — قسمتی که با تصویرِ کم رفت. **برنگشتنی**: یوتیوب ویدئوی
 *   منتشرشده را عوض نمی‌کند، پس این عدد هرگز خودش صفر نمی‌شود. یکی‌کردنِ
 *   این دو یعنی «عقب‌مانده»ای که هیچ‌وقت جبران نمی‌شود — و هشداری که
 *   هیچ‌وقت خاموش نشود، هشداری است که خوانده نمی‌شود.
 *
 * ══ و خطِ روزانه **هر روز** هست، حتی روزِ سالم ══
 * صاحبِ برنامه شیت باز نمی‌کند (۵٫۹۰). سکوت را نمی‌شود از «این قابلیت مرده»
 * تشخیص داد.
 */

function lvMap_(key) {
  try { return JSON.parse(props_().getProperty(key) || '{}') || {}; }
  catch (e) { return {}; }
}

function lvMapSave_(key, m) {
  try { props_().setProperty(key, JSON.stringify(m || {})); return true; }
  catch (e) { return false; }
}

/** قسمتی که منتظرِ کامل‌شدنِ تصویرش است. `at` اولین بار است، نه آخرین. */
function lvWaitNote_(key, vis) {
  var m = lvMap_(PK.LV_WAIT), k = String(key || '');
  if (!k) return false;
  var was = m[k] || {};
  m[k] = { at: String(was.at || nowStr_()), seenAt: nowStr_(),
           ready: Number((vis || {}).ready) || 0,
           want: Number((vis || {}).want) || 0,
           tries: Number((vis || {}).tries) || 0,
           why: String((vis || {}).why || '') };
  return lvMapSave_(PK.LV_WAIT, m);
}

function lvWaitClear_(key) {
  var m = lvMap_(PK.LV_WAIT), k = String(key || '');
  if (!m[k]) return false;
  delete m[k];
  return lvMapSave_(PK.LV_WAIT, m);
}

/**
 * قسمتی که با تصویرِ کم به رندر رفت. **برنگشتنی، پس جدا شمرده می‌شود.**
 * و حافظه‌اش سقف دارد: قدیمی‌ترین‌ها می‌افتند، وگرنه Properties پر می‌شود.
 */
function lvShortNote_(key, vis) {
  var m = lvMap_(PK.LV_SHORT), k = String(key || '');
  if (!k) return false;
  if (!m[k]) m[k] = { at: nowStr_() };
  m[k].ready = Number((vis || {}).ready) || 0;
  m[k].want = Number((vis || {}).want) || 0;
  m[k].why = String((vis || {}).why || '');
  var keys = [];
  for (var q in m) if (Object.prototype.hasOwnProperty.call(m, q)) keys.push(q);
  var cap = Math.max(5, Number(CFG.LV_SHORT_KEEP) || 40);
  if (keys.length > cap) {
    keys.sort(function (a, b) {
      return (parseWhen_(String((m[a] || {}).at || '')) || 0) -
             (parseWhen_(String((m[b] || {}).at || '')) || 0);
    });
    for (var d = 0; d < keys.length - cap; d++) delete m[keys[d]];
  }
  return lvMapSave_(PK.LV_SHORT, m);
}

/**
 * ══ نقشه‌ای که نحیف درآمد (۸٫۱۱) ══
 *
 * سومین حافظه، و عمداً از آن دو جداست — همان قاعدهٔ «عقب‌مانده ≠ رهاشده»
 * (۵٫۸۸) یک قدم جلوتر:
 *   `LV_WAIT`  — نقشه کامل است، فایل‌ها هنوز نه. **درست‌شدنی.**
 *   `LV_SHORT` — با تصویرِ کم **منتشر** شد. **برنگشتنی.**
 *   `LV_THIN`  — خودِ **نقشه** کم درآمد: دوازده خواسته شد، یک تا آمد.
 *
 * سومی هیچ‌وقت در آن دو دیده نمی‌شد، و همین بود که ۱ اکتبر قسمت ۵۷ را
 * «✅ تمام» نشان داد: `ready` برابرِ `want` بود و `want` خودش ۱ بود. یک
 * عددی که با خودش مقایسه شود همیشه سالم است.
 */
function lvThinNote_(key, vis) {
  var m = lvMap_(PK.LV_THIN), k = String(key || '');
  if (!k) return false;
  if (!m[k]) m[k] = { at: nowStr_() };
  m[k].want = Number((vis || {}).want) || 0;
  m[k].asked = Number((vis || {}).asked) || 0;
  if ((vis || {}).dropped) m[k].drop = vis.dropped;
  var keys = [];
  for (var q in m) if (Object.prototype.hasOwnProperty.call(m, q)) keys.push(q);
  var cap = Math.max(5, Number(CFG.LV_SHORT_KEEP) || 40);
  if (keys.length > cap) {
    keys.sort(function (a, b) {
      return (parseWhen_(String((m[a] || {}).at || '')) || 0) -
             (parseWhen_(String((m[b] || {}).at || '')) || 0);
    });
    for (var d = 0; d < keys.length - cap; d++) delete m[keys[d]];
  }
  return lvMapSave_(PK.LV_THIN, m);
}

/**
 * «نحیف» یعنی «هنوز جبران‌شدنی» (۸.۱۱) — و درسی که منتشر شده دیگر جبران‌شدنی
 * نیست. تا ۸.۵۳ هیچ‌جا پاک نمی‌شد: ایمیلِ ۶ اکتبر هنوز می‌گفت «special:58 (1 از
 * 14)، special:59 (3 از 12) … پیش از انتشار با بازسازیِ تصویرها درست می‌شود»
 * درباره‌ی دو درسی که روزها پیش منتشر شده بودند. هشداری که برای گذشته بزند،
 * همان هشداری است که یاد می‌گیرند نخوانند (۷٫۴۰). فقط وقتی حافظه خالی نیست
 * هاب خوانده می‌شود.
 */
function lvThinPrune_() {
  var m = lvMap_(PK.LV_THIN), ks = Object.keys(m);
  if (!ks.length) return 0;
  var pub = ytPublished_(getHub_()), n = 0;
  for (var i = 0; i < ks.length; i++) {
    if (pub[ks[i]] && pub[ks[i]].videoId) { delete m[ks[i]]; n++; }
  }
  if (n) lvMapSave_(PK.LV_THIN, m);
  return n;
}
function lvThinClear_(key) {
  try {
    var m = lvMap_(PK.LV_THIN);
    if (m[String(key)]) { delete m[String(key)]; lvMapSave_(PK.LV_THIN, m); }
  } catch (e) {}
}

/**
 * حالِ تصویرهای درس — **بی هیچ فراخوانِ درایو یا شیت.** هر دو حافظه در
 * Properties اند، پس این تابع روی داغ‌ترین مسیرِ موتور (`writeStatus_`) هم
 * ارزان است. ۷٫۶۳/۷٫۷۲ همین را دو بار به این مخزن آموختند.
 */
function lvStatus_() {
  var out = { on: false, shows: [], waiting: 0, oldestDays: 0, waitKeys: [],
              short: 0, shortKeys: [], thin: 0, thinKeys: [], line: '', ok: true };
  try {
    out.on = CFG.LV_ENABLED !== false;
    out.shows = (CFG.LV_SHOWS || []).slice(0);
    var now = new Date().getTime();
    var w = lvMap_(PK.LV_WAIT);
    for (var k in w) {
      if (!Object.prototype.hasOwnProperty.call(w, k)) continue;
      out.waiting++;
      if (out.waitKeys.length < 6) {
        out.waitKeys.push(k + ' (' + (Number(w[k].ready) || 0) + '/' +
                          (Number(w[k].want) || 0) + ')');
      }
      var t = parseWhen_(String(w[k].at || ''));
      if (!isNaN(t)) {
        var d = Math.floor((now - t) / 86400000);
        if (d > out.oldestDays) out.oldestDays = d;
      }
    }
    var sh = lvMap_(PK.LV_SHORT);
    for (var s in sh) {
      if (!Object.prototype.hasOwnProperty.call(sh, s)) continue;
      out.short++;
      if (out.shortKeys.length < 6) {
        out.shortKeys.push(s + ' (' + (Number(sh[s].ready) || 0) + '/' +
                           (Number(sh[s].want) || 0) + ')');
      }
    }
    var th = lvMap_(PK.LV_THIN);
    for (var t2 in th) {
      if (!Object.prototype.hasOwnProperty.call(th, t2)) continue;
      out.thin++;
      if (out.thinKeys.length < 6) {
        out.thinKeys.push(t2 + ' (' + (Number(th[t2].want) || 0) + ' از ' +
                          (Number(th[t2].asked) || 0) + ')');
      }
    }
    /* `ok` فقط با بدهیِ **کهنه** نادرست می‌شود. یک شبِ منتظر، خرابی نیست —
       و هشداری که برای حالتِ سالم بزند، هشداری است که یاد می‌گیرند نخوانند
       (۷٫۴۰). ردیف‌های «کم‌رفته» `ok` را پایین نمی‌آورند: کارِ گذشته است و
       دیگر درست نمی‌شود؛ شمرده می‌شود و در خط می‌آید. */
    var need = Math.max(1, Number(CFG.LV_STUCK_DAYS) || 3);
    out.ok = !(out.waiting && out.oldestDays >= need);
    /* و «روشن ولی بی‌اثر» (۸٫۰۵): لایهٔ ۳ روشن است، گشته‌ایم، و مدلی نیست.
       این تنها حالتِ ایراد است — «هنوز نگشته‌ایم» ایراد نیست و ساکت می‌مانَد،
       چون زنگی که برای نامعلوم بزند همان زنگی است که یاد می‌گیرند نخوانند. */
    try { if (lvGenStatus_().dead) out.ok = false; } catch (eG) {}
    out.line = lvLine_(out);
  } catch (e) { out.line = 'حالِ تصویرهای درس خوانده نشد: ' + e.message; out.ok = true; }
  return out;
}

/** یک جملهٔ فارسیِ آماده، **هر روز** — حتی روزی که هیچ خبری نیست. */
function lvLine_(st) {
  if (!st) return '';
  if (!st.on) return '🖼 تصویرِ درس: خاموش است (LV_ENABLED).';
  var shows = (st.shows || []).map(function (x) {
    return x === ENRICH_SHOW_SPECIAL ? CFG.SPECIAL_SHOW_NAME : (x === 'variety' ? CFG.SHOW_NAME : x);
  }).join('، ');
  var p = ['🖼 تصویرِ درس: روشن' + (shows ? ' برای ' + shows : '')];
  if (st.waiting) {
    p.push(faDigitsOut_(String(st.waiting)) + ' قسمت منتظرِ کامل‌شدنِ تصویرش' +
           (st.oldestDays ? ' (قدیمی‌ترین ' + faDigitsOut_(String(st.oldestDays)) + ' روز)' : ''));
  } else {
    p.push('هیچ قسمتی منتظر نیست');
  }
  /* «کم‌رفته» جدا گفته می‌شود و **علتش هم**: این عدد خودش صفر نمی‌شود، پس
     اگر مثلِ «منتظر» گزارش شود، خواننده هر روز منتظرِ صفرشدنی می‌مانَد که
     نمی‌آید. */
  if (st.short) {
    p.push(faDigitsOut_(String(st.short)) + ' قسمت با تصویرِ کم منتشر شد — ' +
           'یوتیوب ویدئوی منتشرشده را عوض نمی‌کند، پس این عدد جبران نمی‌شود');
  }
  /* ══ و نقشه‌ای که نحیف درآمد — سومین عدد، جدا (۸٫۱۱) ══
     این یکی **پیش از** ساختِ ویدئو دیده می‌شود، یعنی هنوز جبران‌شدنی است:
     دکمهٔ بازسازیِ تصویرها همان قسمت را از نو نقشه می‌کشد. */
  if (st.thin) {
    p.push('❌ ' + faDigitsOut_(String(st.thin)) + ' قسمت نقشهٔ تصویرش نحیف ' +
           'درآمد (' + (st.thinKeys || []).join('، ') + ') — ویدئویش ' +
           'تک‌تصویر می‌شود؛ پیش از انتشار با بازسازیِ تصویرها درست می‌شود');
  }
  /* و حالِ لایهٔ ۳ در همان خط — چه روشن چه خاموش. خاموش‌بودنش هم یک خبر
     است: تصمیمِ صاحبِ برنامه، و هر روز یادآوری می‌شود که هست و خاموش است
     (وگرنه قابلیتی که کسی رویش سوئیچ ندارد، فراموش می‌شود). */
  var g = '';
  try { g = lvGenStatus_().line; } catch (eG) { g = ''; }
  return p.join(' · ') + '.' + (g ? '\n🎨 ' + g : '');
}

/**
 * خطِ تصویرهای **همین قسمت**، برای تلگرام و ایمیل — با لینکِ پوشه.
 * خواستهٔ بندِ ۸: «ذخیره تصاویر … و لینکش هم در تلگرام فرستاده بشه».
 */
function lvEpLine_(folder) {
  var out = { text: '', url: '' };
  try {
    if (!ytVisOn_(ENRICH_SHOW_SPECIAL) && !ytVisOn_('variety')) return out;
    var d = lvRead_(folder);
    if (!d) return out;
    var sub = null;
    try {
      var it = folder.getFoldersByName(CFG.LV_FOLDER || 'تصویرها');
      if (it.hasNext()) sub = it.next();
    } catch (eS) {}
    out.url = sub ? sub.getUrl() : '';
    var ready = Number(d.ready) || 0, want = Number(d.want) || 0;
    if (!want) return out;
    out.text = ready >= want
      ? faDigitsOut_(String(ready)) + ' تصویر برای این درس ساخته شد و در ویدئوی یوتیوب می‌آید.'
      : faDigitsOut_(String(ready)) + ' از ' + faDigitsOut_(String(want)) +
        ' تصویرِ این درس ساخته شد.';
  } catch (e) {}
  return out;
}

/** خطِ روزانه + بدهی. `problems` و `notes` همان‌هایی‌اند که `healthCheck` می‌دهد. */
function lvHealth_(problems, notes) {
  var st = null;
  try { st = lvStatus_(); } catch (e) { return; }
  if (!st) return;
  if (notes && st.line) notes.push(st.line);
  if (!st.on) return;

  var need = Math.max(1, Number(CFG.LV_STUCK_DAYS) || 3);
  if (st.waiting && st.oldestDays >= need) {
    var wTxt = (st.waitKeys || []).join(' | ');
    problems.push('تصویرهای ' + faDigitsOut_(String(st.waiting)) + ' قسمت ' +
                  faDigitsOut_(String(st.oldestDays)) + ' روز است کامل نشده و ویدئویشان ' +
                  'ساخته نمی‌شود: ' + wTxt);
    try {
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'تصویرِ درس', key: 'lv-stuck',
        title: 'تصویرهای قسمت‌ها کامل نمی‌شود و ویدئو معطل مانده',
        detail: wTxt + '. تا تصویرها کامل نشوند درخواستِ رندر نوشته نمی‌شود، ' +
                'پس ویدئوی این قسمت‌ها ساخته نمی‌شود و انتشارشان معطل است. ' +
                'علتِ هر کدام در `_visuals.json` پوشهٔ همان قسمت نوشته شده.',
        instruction: 'در پوشهٔ قسمت `_visuals.json` را باز کن و `why` را بخوان. ' +
                     'اگر «خروجیِ PNG نشد» است، اسکوپِ Slides یا سهمیهٔ صادرات را ' +
                     'ببین (ytSlideExport_). اگر «ارائه ساخته نشد» است، ' +
                     'ytPresCreate_ و روشن‌بودنِ Slides API را. اگر همیشه یک ' +
                     'تصویرِ خاص می‌مانَد، lvCardDraw_ را با همان متن امتحان کن. ' +
                     'و اگر سقفِ هر اجرا (LV_BUILD_MAX) نمی‌رسد، بالاترش ببر.',
        owner: ROWNER_CODE
      });
    } catch (eF) {}
  }

  /* ══ لایهٔ ۳ روشن ولی ناکارآمد — پیکربندیِ آدم، نه باگِ کد (۷.۹۹) ══
   * پس یافته نمی‌سازد (یافته‌ای که با عوض‌کردنِ یک تنظیم بسته شود، در صفِ
   * «نیازمند تعویض کد» جایی ندارد) — ولی **باید دیده شود**، وگرنه سوئیچی
   * روشن است و هیچ کاری نمی‌کند: همان بدترین حالتِ ۷.۴۵. */
  try {
    var g = lvGenStatus_();
    if (g.on && !g.model) {
      problems.push('تصویرِ ساخته‌شده روشن است ولی هیچ مدلِ تصویری پیدا نشد — ' +
        'یعنی هیچ پس‌زمینه‌ای ساخته نمی‌شود. `LV_GEN_MODEL` را صریح بگذارید ' +
        'یا ببینید حسابِ Gemini مدلِ تصویر دارد.');
    } else if (g.on && g.room <= 0) {
      /* با پخشِ بودجه (۸.۴۸) این حالت **نباید** پیش بیاید؛ پس اگر آمد، خودش
         خبر است: قیمتِ مدل عوض شده، سقف پایین آمده، یا چیزی بیرون از سهم خرج
         کرده. درسِ نیمه‌کاره با همان تصویرهای ساخته‌شده می‌رود؛ درسِ بعدی تا
         اولِ ماه تصویرِ تازه ندارد — و این را باید گفت، نه پنهان کرد. */
      problems.push('سقفِ ماهانهٔ تصویرِ ساخته‌شده پر شده (~' + g.usd.toFixed(2) +
        ' از ' + faDigitsOut_(String(g.cap)) + ' دلار) با وجودِ پخشِ بودجه — یعنی چیزی ' +
        'بیرون از سهمِ درس‌ها خرج کرده یا قیمتِ مدل (' + (g.model || '؟') + ') با `LV_GEN_PRICES` ' +
        'نمی‌خواند. تا اولِ ماه درس‌های تازه تصویرِ تازه نمی‌گیرند؛ علت را پیدا کنید یا سقف را بالا ببرید.');
    }
  } catch (eGh) {}

  /* ══ کلیپ، حرکت و آزمونِ مدلِ تازه — زیرِ نظر، نه فقط یک خط (۸.۵۲) ══
     هر سه تا ۸.۵۱ فقط جمله‌ای در گزارشِ روزانه بودند؛ کلیپی که هر روز نشود هر روز همان
     جمله را می‌نوشت و هیچ‌کس موظف به کاری نبود (۷.۱۸/۷.۱۹: دیدن با ملزم‌بودن یکی
     نیست). حالا تکرار ⇒ مسئلهٔ روز **و** یافتهٔ کد در صفی که نسخهٔ بعد از آن ساخته
     می‌شود؛ یک بار نشدن هیچ‌چیز نمی‌سازد — یک درسِ بد حق دارد یک درسِ بد بماند. */
  try {
    var cs = lvClipStatus_();
    if (cs.on && !cs.ok) {
      var cl = (cs.last && cs.last.fail) || cs.last || {};
      problems.push('🎬 کلیپِ آغاز ' + faDigitsOut_(String(cs.fails)) + ' درسِ پیاپی نشد — آخرین (' +
                    String(cl.key || '') + '): ' + String(cl.why || 'بی علت'));
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'تصویرِ درس', key: 'lv-clip-fail',
        title: 'کلیپِ آغازِ درس پیاپی ساخته نمی‌شود',
        detail: faDigitsOut_(String(cs.fails)) + ' درسِ پیاپی کلیپشان «نشد» گرفت و با نقاشیِ ثابت رفتند. ' +
                'آخرین علت: ' + String(cl.why || 'ثبت نشده') + (cl.adj && cl.adj.length ? ' · نرم‌شده: ' +
                cl.adj.join('، ') : '') + ' · مدل: ' + String((cs.last || {}).model || CFG.LV_CLIP_MODEL),
        instruction: '`_scenes.json`ِ همان درس را بخوان (`clip.why`، `clip.judge`، `clip.adj`). ' +
                     'خطای HTTP یعنی شکلِ درخواست — lvClipStart_ یا lvClipPoll_ را با پاسخِ واقعی درست کن. ' +
                     '«بایت‌ها ویدئو نبود» یعنی نشانیِ دانلود (`uri` + کلید). «نوشته در کلیپ» یا «چهرهٔ کج» ' +
                     'یعنی lvClipPrompt_. «داوری جواب نداد» یعنی lvClipJudge_ (اندازه یا مدل). ' +
                     'پس از نصبِ درمان، کلیپِ درسِ بعد شمار را صفر می‌کند و ردیف بسته می‌ماند.',
        owner: ROWNER_CODE
      });
    }
  } catch (eCl) {}
  try {
    var os = lvOvStatus_();                 // خطش در `lvStatus_().line` است، همراهِ 🎬 و 🎥
    if (!os.ok && os.last) {
      var oL = os.last;
      problems.push('🪧 کارت‌های نوشتاری ' + faDigitsOut_(String(oL.n)) + ' درسِ پیاپی نحیف یا یکنواخت — آخرین (' + oL.key + '): ' +
                    faDigitsOut_(String(oL.placed)) + ' از ' + faDigitsOut_(String(oL.scenes)) + ' صحنه' +
                    (oL.flat ? '، ساختاردار ' + faDigitsOut_(String(oL.struct || 0)) : ''));
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'تصویرِ درس', key: 'lv-ov-thin',
        title: 'کارت‌های نوشتاریِ ویدئو پیاپی کم یا یکنواخت‌اند',
        detail: oL.key + ': ' + oL.placed + ' کارت روی ' + oL.scenes + ' صحنه (کف ' + oL.need + ')؛ خواسته ' + oL.asked +
                '، بی‌جا ' + oL.busy + '، ساختاردار ' + (oL.struct || 0) + (oL.flat ? ' (یکنواخت)' : '') +
                ' · انواع: ' + JSON.stringify(oL.kinds || {}),
        instruction: 'اگر «یکنواخت» است: `_scenes.json` → `ovFill.up/weak/struct/rejected` (ارتقای تیتر به ' +
                     'کارتِ ساختاردار در lvSceneOvFill_، سقفِ LV_OV_WEAK_MAX). ' +
                     'اگر «خواسته» کم است: `_scenes.json` → `ovShare`، `ovN` و `ovFill` (پرسشِ کارت پس از داوری، ' +
                     'lvSceneOvFill_). اگر «بی‌جا» زیاد است: tools/overlay.js → place (سدهای busy/massCard/solid) ' +
                     'و جای خالیِ داور (`judge.space`). قاب‌ها را از خودِ MP4 ببین، نه از نقشه.',
        owner: ROWNER_CODE
      });
    }
  } catch (eOs) {}
  try {
    var fbS = lvSceneFbStatus_();
    if (!fbS.ok && fbS.last) {
      problems.push('🖼 درسِ ' + fbS.last.key + ' به‌جای صحنهٔ مصور با کارتِ ساده ساخته شد: ' + fbS.last.why);
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'تصویرِ درس', key: 'lv-scene-fallback',
        title: 'ویدئوی درس از صحنهٔ مصور به کارتِ ساده افتاد',
        detail: fbS.last.key + ' (' + fbS.last.at + '): ' + fbS.last.why +
                (Number(fbS.last.n) > 1 ? ' · ' + fbS.last.n + ' درسِ پیاپی' : ''),
        instruction: 'علت در خودِ جزئیات است (lvScenesBuild_ ⇒ fail/planFail). «`_times.json` نبود» یا «زمانِ ' +
                     'تکه‌ها جور نشد» یعنی lvReplayChunks_/specialTextChunks_ با تولیدِ همان قسمت نمی‌خوانَد — ' +
                     'برای مرورِ بزرگ (بخشِ ۳۰) جدا بسنج. «سقفِ ماهانه» یعنی lvScenePace_. «خطا: …» یعنی پرتابِ ' +
                     'بی‌حفاظ. ویدئوی منتشرشده عوض نمی‌شود؛ جایگزینی تصمیمِ صاحبِ برنامه است.',
        owner: ROWNER_CODE
      });
    }
  } catch (eFbS) {}
  try {
    var ms = lvMotionStatus_();
    if (ms.on && !ms.ok) {
      var ml = ms.last || {};
      problems.push('🎥 حرکتِ کانون‌دار ' + faDigitsOut_(String(ms.zero)) + ' درسِ پیاپی روی هیچ صحنه‌ای ننشست');
      logSelfFinding_(getHub_(), {
        priority: 'متوسط', category: 'تصویرِ درس', key: 'lv-motion-none',
        title: 'حرکتِ کانون‌دار روی هیچ صحنه‌ای نمی‌نشیند',
        detail: 'آخرین درس (' + String(ml.key || '') + '): ' + (ml.n || 0) + ' صحنه — کانون از توصیف‌گر ' +
                (ml.focus || 0) + '، حرکتِ push/reveal/travel ' + (ml.moves || 0) + '، جای کانون از داور ' + (ml.box || 0) + '.',
        instruction: 'عددِ صفر نشان می‌دهد کدام نیمه نشد: کانون یا حرکتِ صفر ⇒ پاسخِ lvSceneAsk_ ' +
                     '(schema یا پرامپتِ focus/move)؛ جای کانونِ صفر ⇒ پاسخِ lvSceneJudge_ (فیلدِ box) یا lvSceneBox_ ' +
                     'که قالبِ مدل را نمی‌خوانَد. هر دو با یک `_scenes.json`ِ واقعی بسنج، نه با بدَل.',
        owner: ROWNER_CODE
      });
    }
  } catch (eMs) {}
  try {
    var as = lvAudStatus_();
    if (as.on && !as.ok) {
      problems.push('🧪 مدلِ تصویرِ تازه ' + faDigitsOut_(String(as.stuckDays)) + ' روز است در صفِ آزمون مانده: ' +
                    as.due.join('، '));
      logSelfFinding_(getHub_(), {
        priority: 'متوسط', category: 'تصویرِ درس', key: 'lv-aud-stuck',
        title: 'آزمونِ مدلِ تصویرِ تازه اجرا نمی‌شود',
        detail: 'در صف از ' + as.since + ': ' + as.due.join('، ') + (as.ref ? ' · مرجع: ' + as.ref : ' · مرجعی نیست'),
        instruction: 'سیاههٔ «آزمونِ مدلِ تصویر» را بخوان (lvAuditionLater). «مرجعی نیست» ⇒ lvAudRefSave_ در ' +
                     'lvScenesBuild_ نمی‌نشیند؛ «سقفِ ماه جا ندارد» ⇒ تصمیمِ بودجه است، بگو؛ و اگر هیچ سطری نیست، ' +
                     'تریگرِ یک‌بارهٔ lvAuditionLater ساخته نشده (lvAudArm_).',
        owner: ROWNER_CODE
      });
    }
  } catch (eAs) {}

  /* «کم‌رفته» یافتهٔ کد **نمی‌سازد**: کارِ گذشته است، برنگشتنی، و یافته‌ای
     که هیچ اصلاحی نمی‌تواند ببنددش تا ابد در صف می‌مانَد — همان چیزی که
     ۷٫۴۲ دربارهٔ صفِ بی‌پاسخ نوشت. در مسئله‌های روز می‌آید تا دیده شود. */
  if (st.short) {
    problems.push(faDigitsOut_(String(st.short)) + ' قسمت با تصویرِ کم‌تر از برنامه ' +
                  'منتشر شد (جبران‌ناپذیر): ' + (st.shortKeys || []).join(' | '));
  }
}

/* ═══════════ نظارت: تاریخچه، ارتقا، و درِ آدم (۷٫۹۷) ═══════════
 *
 * مقدمهٔ درخواستِ صاحبِ برنامه: «تحتِ نظرِ ناظر … در گزارش‌ها ثبت بشه و
 * صحتِ انجامِ کارش بررسی بشه و ایرادی بود گزارش بده و **ارتقایی داد گزارش
 * بده** و نیاز به اصلاح بود حتما اتوماسیون اصلاح انجام بده و پیگیر اصلاحش
 * هم باشه.»
 *
 * سه چیزِ این بخش، سه نیمهٔ همان جمله‌اند:
 *
 * **۱) تاریخچه — «از کِی».** `_STATUS.json` جوابِ «حالا چند تصویر» را
 * می‌دهد. ولی وقتی چیزی می‌شکند، پرسشی که واقعاً می‌پرسی «از کِی» است، و
 * آن را فقط تاریخچه جواب می‌دهد — همان استدلالِ تبِ «کاربردِ جزوه» (۵٫۸۸).
 * **هر تلاش یک ردیف، موفق و ناموفق هر دو**: قسمتی که هر شب تلاش می‌کند و
 * هر شب شکست می‌خورد، از بیرون با قسمتی که اصلاً تلاش نکرده یک شکل است.
 *
 * **۲) ارتقا — و این نیمه‌ای بود که جا افتاده بود.** «ایرادی بود گزارش بده»
 * را یافته‌ها پوشش می‌دهند. «ارتقایی داد گزارش بده» چیزِ دیگری است: نه
 * خرابی، بلکه **فرصتِ بهترشدن**. اگر فقط ایرادها گزارش شوند، سیستمی که
 * هیچ ایرادی ندارد و در همان حالِ متوسط ساکن مانده، هر روز «سالم» گزارش
 * می‌شود. `lvUpgrade_` هر روز **یک** فرصت را نام می‌برد — یکی، نه فهرستی،
 * چون فهرستی که هر روز ده بند داشته باشد خوانده نمی‌شود — و صریح می‌گوید
 * که ایراد نیست. **هیچ فراخوانِ مدلی ندارد**؛ همه‌اش از عددهایی است که
 * موتور از قبل دارد.
 *
 * **۳) درِ آدم.** «اصلاح اتوماسیون انجام بده و پیگیرش باش» یک نیمه دارد که
 * خودکار است (بازسازیِ خودکار وقتی سبک عوض شود، تلاشِ دوباره تا
 * `LV_TRY_MAX`) و یک نیمه که نه: وقتی کارتی بد درآمد و آدم می‌خواهد
 * همین‌الان از نو ساخته شود. `runLessonVisualsRebuild` همان در است —
 * و سدی که با دستِ آدم باز نشود، سد نیست (۵٫۹۵).
 */

/* «گونه‌ها» ستونِ خودش را دارد، نه ته ستونِ «علت» (باگِ ۴). نگارشِ ۷.۹۷
   `why || lvSubNote_()` می‌نوشت، پس **شبی که خطایی بود شمارِ گونه‌ها را
   می‌خورد** — و `lvPhotoPending_` که خطِ ارتقا رویش حساب می‌کند، دقیقاً در
   همان شب‌ها کور می‌شد. دو معنا در یک ستون، همان چیزی است که این مخزن
   بارها تاوانش را داده. */
var LV_HEADERS = ['تاریخ', 'نمایش', 'قسمت', 'مجموعه', 'سبک', 'خواسته', 'ساخته‌شده',
                  'این اجرا', 'تلاش', 'نتیجه', 'علت', 'پوشهٔ تصویرها',
                  'گونه‌ها', 'پس‌زمینهٔ ساخته‌شده', 'هزینهٔ این اجرا ($)'];

function lvLog_(hub, row) {
  try {
    var sh = ensureTab_(hub || getHub_(), CFG.LV_TAB || 'کاربردِ تصویرها', LV_HEADERS);
    appendBlock_(sh, [[nowStr_(), String(row.show || ''), String(row.ep || ''),
                       String(row.series || ''), String(row.style || ''),
                       String(row.want || 0), String(row.ready || 0),
                       String(row.made || 0), String(row.tries || 0),
                       String(row.result || ''), String(row.why || ''),
                       String(row.url || ''), String(row.kinds || ''),
                       String(row.gMade || 0),
                       row.gSpent ? Number(row.gSpent).toFixed(3) : '']],
                LV_HEADERS.length);
    return true;
  } catch (e) { logLine_('ثبتِ کاربردِ تصویرها نوشته نشد: ' + e.message); return false; }
}


/* ══════════════ مشخصاتِ تصویریِ یک قسمت (۸.۰۱) ══════════════
 *
 * این تابع جای `lvBuild_` را در **ویدئو** می‌گیرد. کارت دیگر در اسلایدز
 * کشیده نمی‌شود؛ این‌جا فقط «چه چیزی، با چه شکلی، در کدام ثانیه» تصمیم
 * گرفته می‌شود و کشیدنش کارِ رانر است (`tools/cardkit`).
 *
 * چرا: اسلایدز فقط مستطیل، بیضی، لوزی، خط و متن دارد. بافت، خطِ دست‌کشیده،
 * هایلایتر و ظاهرشدنِ تدریجی از آن پنج شکل درنمی‌آید — و همان بود که خروجی
 * را به «اسلایدشوِ متنِ گوینده» تبدیل کرده بود.
 *
 * و مهم‌ترین چیزی که این‌جا حل می‌شود **زمان** است. هیچ‌جای این خط تولید
 * نمی‌دانست کدام جمله در کدام ثانیه گفته می‌شود؛ زمان به‌تساوی روی کارت‌ها
 * تقسیم می‌شد و در یک سنجشِ واقعی پنج کارت از شش، متنی را نشان می‌دادند که
 * ۱۱ تا ۸۰ ثانیه **قبل** گفته شده بود. حالا:
 *   `_times.json` ⇒ ثانیهٔ شروعِ هر تکهٔ صوتی (از بایت‌های واقعی، نه تخمین)
 *   تکه‌ها ⇒ متنِ هر تکه (همان `buildSpecialChunks_`، که قطعی است)
 *   `quote` مدل ⇒ جای آن عبارت در متن ⇒ ثانیه‌اش
 */

/** نرمال‌سازیِ سبکِ فارسی برای جست‌وجوی عبارت: ی/ک عربی، نیم‌فاصله، اعراب. */
function lvNorm_(t) {
  /* ══ کسرهٔ اضافه در متنِ گفتاری یک «ی»ِ جداست (۸.۳۰) ══
     متنِ نوشتاری «سرچشمهٔ اولیهٔ معرفت» دارد (یا بی‌نشانه «سرچشمه اولیه») و
     متنِ گفتاری برای درست‌خواندن «سَرچَشمه‌یِ اَوَّلیه‌یِ» — یعنی پس از جداکردنِ
     نیم‌فاصله، یک «ی»ِ تنها میانِ دو واژه. عبارتِ مدل از متنِ نوشتاری است، پس
     در درسِ ۵۹ دو عبارت از سه هرگز پیدا نشد و مشخصاتِ برداری ساخته نشد.
     گروه‌های اسمی — همان چیزی که مدل برای کارت نقل می‌کند — درست همان‌جایی‌اند
     که این «ی» می‌نشیند. پس «ی»ِ تنها، همزهٔ روی «ه» و «ۀ» هر دو سو برداشته
     می‌شوند؛ در متنِ فارسی «ی» هرگز خودش یک واژه نیست. */
  return (' ' + String(t == null ? '' : t)
    .replace(/[\u0654\u0655]/g, '').replace(/[\u06C0\u0629]/g, '\u0647')
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/‌/g, ' ')
    .replace(/[يی]/g, 'ی').replace(/[كک]/g, 'ک')
    .replace(/[أإآءؤئ]/g, 'ا')
    /* نشانه‌های فارسی هم برداشته می‌شوند (۸.۲۶): از ۸.۰۸ متنِ گفتاری عمداً
       پرنشانه‌تر از متنِ نوشتاری است («بود. تو» ⇒ «بود… تو»، ویرگول برای
       مکث)، پس عبارتی که مدل از متنِ نوشتاری نقل کند، با یک «،» اضافه در
       متنِ گفتاری **هرگز** پیدا نمی‌شد. این‌ها همه در بازهٔ ؀-ۿ اند و خطِ
       بعد نگهشان می‌داشت. */
    .replace(/[،؛؟٪٫٬٭۔]/g, ' ')
    .replace(/[^؀-ۿ\s]/g, ' ')
    .replace(/\s+/g, ' ') + ' ')
    .replace(/ (?:ی )+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/**
 * کدام زمانِ `_times.json` مالِ کدام تکهٔ **متن** است (۸.۳۱).
 *
 * `_times.json` برای **هر** تکه یک زمان دارد — گفتار و موسیقی هر دو. تا ۸.۳۰
 * نگاشت شماره‌به‌شماره بود و موسیقی را نمی‌دید: درسِ ۵۹ ۲۱ زمان داشت و ۱۸
 * تکهٔ متن، و پس از هر پلِ موسیقی همهٔ کارت‌ها یک تکه جابه‌جا شدند.
 *
 * دو راه، به ترتیبِ اعتماد:
 *   ۱) زمان‌ها `k` دارند (از ۸.۳۱ ثبت می‌شود) ⇒ n-امین «t» همان n-امین تکهٔ متن.
 *   ۲) ندارند (قسمت‌های پیش از ۸.۳۱) ⇒ هم‌ترازیِ پویا: هر تکهٔ متن مدتی
 *      متناسب با طولش دارد (سرعتِ گفتار تقریباً ثابت است) و موسیقی **فقط**
 *      سرِ مرزِ بخش‌ها می‌نشیند (اول، میانِ دو بخش، آخر). پس انتخاب‌ها
 *      محدودند و جواب روشن — روی درسِ ۵۹ همهٔ ۱۸ تکه با نسبتِ ۰٫۰۸ تا ۰٫۱۱
 *      ثانیه بر نویسه نشستند و سه موسیقی همان سه تکهٔ ۵ تا ۷ ثانیه‌ای شدند.
 * نامطمئن ⇒ `null` با علت، نه یک حدس. تصویری که به جملهٔ دیگری بچسبد بدتر
 * از تصویری است که نیاید.
 * @return {{map:Array, how:string, why:string}} map[k] = شمارهٔ زمانِ تکهٔ k
 */
function lvAlignTimes_(tc, times, secs) {
  var out = { map: null, how: '', why: '' };
  var T = (times || []).slice().sort(function (a, b) { return Number(a.i) - Number(b.i); });
  var N = T.length, M = (tc || []).length;
  if (!N || !M) { out.why = 'زمان یا تکه‌ای نبود'; return out; }
  var allK = T.every(function (x) { return x && (x.k === 't' || x.k === 'm'); });
  if (allK) {
    var tIdx = [];
    for (var a = 0; a < N; a++) if (T[a].k === 't') tIdx.push(a);
    if (tIdx.length !== M) { out.why = 'شمارِ تکه‌های گفتار ' + tIdx.length + ' است و متن ' + M + ' تکه'; return out; }
    out.map = tIdx; out.how = 'نوع'; return out;
  }
  var K = N - M;
  if (K < 0) { out.why = M + ' تکهٔ متن و فقط ' + N + ' زمان'; return out; }
  var at = T.map(function (x) { return Number(x.at) || 0; });
  var dur = at.map(function (v, i) { return Math.max(0.1, (i + 1 < N ? at[i + 1] : (Number(secs) || v)) - v); });
  var L = tc.map(function (c) { return Math.max(1, String(c.text || '').replace(/[ً-ْٰ]/g, '').length); });
  if (K === 0) { out.map = at.map(function (v, i) { return i; }); out.how = 'برابر'; return out; }
  var sumL = L.reduce(function (p, q) { return p + q; }, 0);
  var canMusic = function (k) { return k === 0 || k === M || tc[k].seg !== tc[k - 1].seg; };
  var run = function (r) {
    var INF = 1e9, C = [], B = [];
    for (var i = 0; i <= N; i++) { C.push([]); B.push([]); for (var k = 0; k <= M; k++) { C[i].push(INF); B[i].push(''); } }
    C[0][0] = 0;
    for (var i2 = 0; i2 <= N; i2++) for (var k2 = 0; k2 <= M; k2++) {
      var c0 = C[i2][k2];
      if (c0 >= INF) continue;
      if (i2 < N && k2 < M) {
        var cm = c0 + Math.abs(Math.log(dur[i2] / (L[k2] * r)));
        if (cm < C[i2 + 1][k2 + 1]) { C[i2 + 1][k2 + 1] = cm; B[i2 + 1][k2 + 1] = 'm'; }
      }
      if (i2 < N && canMusic(k2)) {
        var cs = c0 + 0.7 + (dur[i2] > 45 ? 3 : 0);
        if (cs < C[i2 + 1][k2]) { C[i2 + 1][k2] = cs; B[i2 + 1][k2] = 's'; }
      }
    }
    if (C[N][M] >= INF) return null;
    var map = [], ii = N, kk = M;
    while (ii > 0) { if (B[ii][kk] === 'm') { map[kk - 1] = ii - 1; kk--; } ii--; }
    return { cost: C[N][M], map: map };
  };
  var r = Math.max(0.02, ((Number(secs) || at[N - 1]) - 10 * K) / sumL), res = null;
  for (var it = 0; it < 3; it++) {
    res = run(r);
    if (!res) break;
    var sd = 0, sl = 0;
    for (var q = 0; q < M; q++) { sd += dur[res.map[q]]; sl += L[q]; }
    r = sd / sl;
  }
  if (!res) { out.why = 'هم‌ترازیِ زمان و متن جواب نداشت'; return out; }
  // سنجشِ اطمینان: میانهٔ انحرافِ نسبتِ «ثانیه بر نویسه»
  var dev = [];
  for (var z = 0; z < M; z++) dev.push(Math.abs(Math.log(dur[res.map[z]] / (L[z] * r))));
  dev.sort(function (x, y) { return x - y; });
  var med = dev[Math.floor(dev.length / 2)];
  if (med > 0.35) { out.why = 'هم‌ترازی نامطمئن بود (انحرافِ میانه ' + med.toFixed(2) + ')'; return out; }
  out.map = res.map; out.how = 'هم‌ترازی'; return out;
}

/**
 * تکه‌های متنِ گفتار با **ثانیهٔ شروع و پایانِ واقعی‌شان** — تنها راهی که
 * تصویر از آن زمان می‌گیرد (کارت‌ها و صحنه‌ها هر دو).
 * @return {{chunks:Array, secs:number, how:string, why:string}}
 */
function lvReplayChunks_(folder, meta) {
  var out = { chunks: [], secs: 0, how: '', why: '' };
  var tj = epTimesRead_(folder);
  if (!tj) { out.why = '`_times.json` در پوشهٔ قسمت نبود'; return out; }
  var tc = null;
  try { tc = specialTextChunks_((meta && meta.ep) || {}, (meta && (meta.cat || meta.seriesCat)) || ''); }
  catch (e) { out.why = 'تکه‌های گفتار دوباره ساخته نشد: ' + e.message; return out; }
  if (!tc || !tc.length) { out.why = 'تکه‌های گفتار دوباره ساخته نشد'; return out; }
  var secs = Number(tj.secs) || 0;
  var al = lvAlignTimes_(tc, tj.times, secs);
  if (!al.map) { out.why = al.why + ' (' + tc.length + ' تکه، ' + (tj.times || []).length + ' زمان)'; return out; }
  var T = (tj.times || []).slice().sort(function (a, b) { return Number(a.i) - Number(b.i); });
  for (var k = 0; k < tc.length; k++) {
    var ti = al.map[k];
    var a = Number(T[ti].at) || 0;
    var b = (ti + 1 < T.length) ? Number(T[ti + 1].at) : secs;
    out.chunks.push({ text: tc[k].text, seg: tc[k].seg, secIndex: tc[k].secIndex,
                      at: a, end: Math.max(a, b) });
  }
  out.secs = secs; out.how = al.how;
  return out;
}

/**
 * نقشهٔ «جای نویسه در متنِ گفتاری ⇒ ثانیه»، از تکه‌های هم‌ترازشده.
 * داخلِ هر تکه خطی درون‌یابی می‌شود؛ مرزِ تکه‌ها **دقیق** است، و پایانِ هر تکه
 * پایانِ گفتارِ خودش — نه شروعِ موسیقیِ بعدی. جانشینِ `lvTimeMap_` (تا ۸.۳۰)
 * که زمان را شماره‌به‌شماره می‌گذاشت و موسیقی را نمی‌دید.
 */
function lvTimeMapAligned_(chunks) {
  var marks = [], pos = 0;
  for (var i = 0; i < (chunks || []).length; i++) {
    var txt = lvNorm_(chunks[i].text || '');
    marks.push({ from: pos, len: txt.length, at: Number(chunks[i].at) || 0,
                 to: Number(chunks[i].end) || null });
    pos += txt.length + 1;
  }
  return marks;
}

/** جای یک نویسه ⇒ ثانیه. بیرون از نقشه ⇒ `null`، نه یک حدس. */
function lvSecAt_(marks, charPos) {
  for (var i = 0; i < marks.length; i++) {
    var m = marks[i];
    if (charPos >= m.from && charPos < m.from + m.len + 1) {
      if (m.to === null || !m.len) return m.at;
      var f = (charPos - m.from) / m.len;
      return m.at + (m.to - m.at) * Math.max(0, Math.min(1, f));
    }
  }
  return null;
}

/**
 * جای یک عبارت در متنِ گفتاری — اول عیناً، بعد **بی‌فاصله**.
 *
 * نشانه‌گذاریِ تلفظ (بخشِ ۳) نیم‌فاصله را **وسطِ واژه** می‌گذارد — «بِ‌ایستیم»
 * تا «با» خوانده نشود — و `lvNorm_` نیم‌فاصله را فاصله می‌کند. پس «بایستیم»ِ
 * متنِ نوشتاری و «ب ایستیم»ِ متنِ گفتاری دو رشتهٔ متفاوت‌اند، و برعکسش هم
 * هست («می‌شود» در یکی، «می شود» در دیگری). جست‌وجوی بی‌فاصله هر دو را
 * می‌بلعد؛ نقشهٔ جای نویسه‌ها جای واقعی را در متنِ اصلی برمی‌گرداند، چون
 * `lvTimeMapAligned_` با همان جای واقعی کار می‌کند.
 */
function lvFind_(stream, q, cmp) {
  if (!q) return -1;
  var p = stream.indexOf(q);
  if (p >= 0) return p;
  var cq = String(q).replace(/ /g, '');
  if (cq.length < 6) return -1;
  if (!cmp.s) {
    var cs = [], map = [];
    for (var i = 0; i < stream.length; i++) {
      var ch = stream.charAt(i);
      if (ch !== ' ') { cs.push(ch); map.push(i); }
    }
    cmp.s = cs.join(''); cmp.map = map;
  }
  var k = cmp.s.indexOf(cq);
  return k >= 0 ? cmp.map[k] : -1;
}

/* ── رنگِ کارت‌های برداری از **سبکِ همان مجموعه** (۸.۲۶) ──
 * تا ۸.۲۵ مشخصات هیچ سبکی نداشت و `cardkit` ظاهر را خودش از روی **دسته**
 * با یک regex برمی‌داشت (`look.js`). یعنی سبکی که صاحبِ برنامه روی تخته
 * انتخاب می‌کرد — یا مدل برای این درس انتخاب می‌کرد — روی کاور و کارت‌های
 * اسلایدز می‌نشست و روی **خودِ ویدئو** نه. */
function lvHex_(h) {
  var x = String(h || '').replace('#', '');
  if (x.length === 3) x = x.charAt(0) + x.charAt(0) + x.charAt(1) + x.charAt(1) + x.charAt(2) + x.charAt(2);
  var n = parseInt(x, 16);
  if (isNaN(n) || x.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lvMix_(a, b, t) {
  var A = lvHex_(a), B = lvHex_(b), o = '#';
  for (var i = 0; i < 3; i++) {
    var v = Math.round(A[i] * (1 - t) + B[i] * t);
    o += ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
  }
  return o.toUpperCase();
}
function lvLum_(h) {
  var c = lvHex_(h);
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

/**
 * سبکِ موتور ⇒ پالتِ `cardkit`. `null` یعنی سبکی نیست و `cardkit` همان
 * رفتارِ قبلی را دارد (ظاهر از دسته).
 * زمینهٔ تیره قاعدهٔ خودش را دارد: هایلایتر پشتِ متنِ روشن باید **تیره‌تر**
 * از رنگِ تأکید باشد، وگرنه متنِ روشن روی هایلایترِ روشن ناخوانا می‌شود.
 */
function lvCardPal_(sty) {
  if (!sty || !sty.pal || !sty.pal.bg) return null;
  var bg = String(sty.pal.bg), ink = String(sty.pal.fg || '#1F2937'), ac = String(sty.pal.ac || ink);
  var dark = lvLum_(bg) < 0.45;
  var fr = String(sty.frame || '');
  var scrim = Number(CFG.LV_GEN_SCRIM);
  if (!isFinite(scrim)) scrim = 0.55;
  return {
    bg: bg, ink: ink, accent: ac,
    mark: dark ? lvMix_(ac, bg, 0.55) : lvMix_(ac, bg, 0.72),
    card: dark ? lvMix_(bg, ink, 0.08) : lvMix_(bg, '#FFFFFF', 0.6),
    grain: dark ? 0.05 : 0.09, vig: dark ? 0.14 : 0.07,
    grid: fr === 'hairline' ? 64 : (fr === 'dashed' ? 96 : 0),
    wash: fr === 'wash', rule: (fr === 'rules' || fr === 'motif'),
    /* روی تصویرِ ساخته‌شده، بیشتر از کارتِ اسلایدز: این‌جا متن نه سایه دارد
       نه کادر، و در نمونهٔ کشیده‌شده با ۰٫۶۵ تصویر با متن رقابت می‌کرد. تصویر
       این‌جا **فضا** است، نه موضوعِ کارت. */
    scrim: Math.max(0.7, Math.min(0.92, scrim + 0.25))
  };
}

/** شکلِ فارسی ⇒ شکلِ cardkit. ناشناخته ⇒ «تمرکز»، که همیشه قابلِ کشیدن است. */
function lvFormOf_(f) {
  var m = { 'مقایسه': 'split', 'زنجیره': 'chain', 'تمرکز': 'focus',
            'نقل': 'quote', 'پرسش': 'question' };
  return m[String(f || '').trim()] || 'focus';
}
/** نامِ نشانه‌های فارسی ⇒ کلیدِ cardkit. ناشناخته ⇒ بی‌نشانه، نه نشانهٔ غلط. */
function lvIconOf_(n) {
  var m = { 'مثلث': 'triangle', 'خوشه': 'many', 'ذهن': 'mind', 'گوش': 'ear',
            'زنجیر': 'link', 'برچسب': 'tag', 'برگه': 'doc', 'پرسش': 'q' };
  return m[String(n || '').trim()] || '';
}

/**
 * مشخصاتِ تصویری را می‌سازد. `null` یعنی «نمی‌شود» و مسیرِ امروز باید برود —
 * که برای هر قسمتِ پیش از ۸.۰۱ حالتِ عادی است.
 */
function lvSpecBuild_(folder, meta, mm, ctx) {
  try {
    /* ══ «نشد» با علتش (۸.۲۹) ══
       هر `return null` این تابع یک علتِ جدا داشت و هیچ‌کدام جایی ثبت نمی‌شد؛
       درسِ ۵۹ بی مشخصات رفت و از بیرون هیچ‌چیز نمی‌گفت کدام بود. علت روی
       `ctx.why` می‌نشیند و تا ردیفِ عمومیِ رندر می‌رود. */
    var why = function (t) { try { if (ctx) ctx.why = t; } catch (eW) {} return null; };
    if (!ytVisOn_(ctx && ctx.show)) return why('این نمایش تصویر نمی‌گیرد');
    var raw = (mm && mm.visuals) || [];
    if (!raw.length) return why('نقشهٔ تصویر خالی بود');

    /* ══ زمان از تکه‌های **هم‌ترازشده** (۸.۳۱) ══
       تا ۸.۳۰ این‌جا `buildSpecialChunks_` بود و نگاشتِ شماره‌به‌شماره — که
       موسیقی را نمی‌دید و درسِ ۵۹ را تا دو دقیقه جابه‌جا کرد. داستانش کنارِ
       `specialTextChunks_` و `lvAlignTimes_` است. */
    var rp = lvReplayChunks_(folder, meta);
    if (!rp.chunks.length) return why(rp.why || 'زمانِ تکه‌ها با تکه‌های گفتار جور نشد');
    var chunks = rp.chunks;
    var marks = lvTimeMapAligned_(chunks);
    var stream = '';
    for (var c = 0; c < chunks.length; c++) stream += lvNorm_(chunks[c].text || '') + ' ';

    var secs = Number(rp.secs) || 0;
    var cards = [], miss = 0, cmp = {}, reshaped = 0;
    var bgOf = (ctx && ctx.bg) || {};
    for (var r = 0; r < raw.length; r++) {
      var v = raw[r] || {};
      var q = lvNorm_(v.quote || '');
      if (q.length < 8) { miss++; continue; }
      var p = lvFind_(stream, q, cmp);
      if (p < 0) {                              // عبارت پیدا نشد ⇒ کارت نمی‌سازیم
        var half = q.split(' ').slice(0, 4).join(' ');
        p = half.length >= 8 ? lvFind_(stream, half, cmp) : -1;
      }
      if (p < 0) { miss++; continue; }
      var at = lvSecAt_(marks, p);
      if (at === null) { miss++; continue; }
      var form = lvFormOf_(v.form);
      var card = { form: form, at: Math.round(at * 10) / 10, src: r,
                   kicker: ytVisCut_(v.kicker, 46), foot: ctx.foot || '',
                   headline: ytVisCut_(v.headline || v.cardTitle, form === 'quote'
                                       ? (CFG.LV_QUOTE_HEAD_MAX || 96) : (CFG.LV_CARD_TITLE_MAX || 48)),
                   note: ytVisCut_(v.note, 110), icon: lvIconOf_(v.icon) };
      /* تصویرِ ساخته‌شدهٔ **همین مورد** (همان شمارهٔ نقشه که `lvBuild_` با آن
         ساختش). نبودش یعنی کارتِ ساده — هرگز یک تصویرِ دیگر به‌جایش. */
      if (bgOf[String(r)]) { card.bgId = String(bgOf[String(r)]); card.bgUrl = ytDlUrl_(card.bgId); }
      var lines = function (a) {
        var o = [];
        for (var k = 0; k < (a || []).length && o.length < 3; k++) {
          var s2 = ytVisCut_(a[k], CFG.LV_CARD_LINE_MAX || 72);
          if (s2) o.push(s2);
        }
        return o;
      };
      /* شکلِ ناقص ساده‌تر می‌شود، نه دور ریخته — همان قاعدهٔ `ytVisItem_`،
         تکرار شده چون نقشه‌های پیش از ۸.۳۰ از آن‌جا رد نشده‌اند. */
      if (form === 'split' && (!ytVisCut_(v.aTitle, 22) || !ytVisCut_(v.bTitle, 22))) {
        form = 'focus'; card.form = form;
        v = { items: [].concat(v.items || [], v.aItems || [], v.bItems || []) };
        reshaped++;
      } else if (form === 'chain' && lines(v.steps).length < 2) {
        form = 'focus'; card.form = form;
        v = { items: [].concat(v.items || [], v.steps || []) };
        reshaped++;
      }
      if (form === 'split') {
        card.right = { title: ytVisCut_(v.aTitle, 22), icon: lvIconOf_(v.aIcon), items: lines(v.aItems) };
        card.left = { title: ytVisCut_(v.bTitle, 22), icon: lvIconOf_(v.bIcon), items: lines(v.bItems) };
      } else if (form === 'chain') {
        card.steps = lines(v.steps);
      } else if (form === 'focus') {
        card.items = lines(v.items);
      }
      if (!card.headline) { miss++; continue; }
      cards.push(card);
    }
    if (cards.length < 2) return why('فقط ' + cards.length + ' کارت از ' + raw.length +
                                     ' لنگر گرفت (' + miss + ' عبارت در گفتار پیدا نشد یا ناقص بود)');

    /* ترتیب از **زمان** می‌آید، نه از ترتیبی که مدل داد: مدل می‌تواند
       جمع‌بندی را آخر بنویسد در حالی که در صوت وسط گفته شده — و همان بود که
       در نمونهٔ سنجیده‌شده دو کارتِ آخر جابه‌جا افتادند. */
    cards.sort(function (a, b) { return a.at - b.at; });

    /* لنگرهای درونِ هر کارت: بینِ شروعِ خودش و شروعِ کارتِ بعدی پخش می‌شوند،
       ولی **هرگز از آن جلو نمی‌زنند**. ریتم از این می‌آید (هر ~۳ ثانیه یک
       ضرب)، نه از زیادکردنِ تعدادِ کارت‌ها. */
    for (var j = 0; j < cards.length; j++) {
      var end = (j + 1 < cards.length) ? cards[j + 1].at : secs;
      cards[j].end = Math.round(end * 10) / 10;
      var span = Math.max(1, end - cards[j].at);
      var n = Math.max(1, Math.min(4, Math.round(span / 9)));
      var an = [];
      for (var a2 = 0; a2 < n; a2++) an.push(Math.round((cards[j].at + span * (a2 / n)) * 10) / 10);
      cards[j].anchors = an;
    }

    var out = { v: 1, t0: cards[0].at, t1: Math.round(secs * 10) / 10,
                cat: ctx.cat || '', seriesName: ctx.seriesName || '',
                level: String(ctx.level || CFG.LV_LEVEL_DEFAULT || 'کم'),
                cards: cards, missed: miss, reshaped: reshaped,
                mark: ytMarkSpec_() };
    var sty = ctx.style ? lvStyleResolve_(ctx.style) : null;
    var pal = lvCardPal_(sty);
    if (pal) { out.palette = pal; out.style = sty.key; }
    return out;
  } catch (e) {
    try { logLine_('مشخصاتِ تصویری ساخته نشد: ' + e.message); } catch (e2) {}
    try { if (ctx) ctx.why = 'خطا: ' + e.message; } catch (e3) {}
    return null;
  }
}

/* ═══════════ صحنه‌های مصور — ویدئوی درس‌نامه از نو (۸.۳۱) ═══════════
 *
 * ۴ اکتبر، دربارهٔ ویدئوی درسِ ۵۹: «فقط متن بود · نقاشی کو · متن‌ها می‌رفتن و
 * می‌اومدن و صدا اصلاً هماهنگ نبود · آبرومو بردی». هر سه درست، و علتِ هر سه
 * یک تصمیم بود، نه یک باگ: ۷.۹۸ تصویرِ ساخته‌شده را «پس‌زمینهٔ بی‌واژه و
 * انتزاعیِ زیرِ کارت» تعریف کرد و پرده‌ای ۶۲٪ هم‌رنگِ زمینه رویش کشید.
 * او ۳۰ سپتامبر چیزی مثلِ ویدئوهای NotebookLM خواسته بود — تصویری که **خودِ
 * مفهوم را نشان بدهد** — و گفته بود آن تصمیم را نفهمیده. یعنی نقاشی طوری
 * ساخته شده بود که دیده نشود، و دیده هم نشد.
 *
 * حالا نقش‌ها برعکس است، و هر مرز در کد است نه در پرامپت:
 *   • **تصویر خودِ محتواست**: تمام‌صفحه، بی پرده. هر صحنه همان چیزی را
 *     نشان می‌دهد که گوینده **در همان لحظه** می‌گوید — مدل متنِ همان چند
 *     جمله را می‌بیند، نه کلِ درس را.
 *   • **زمان را کد می‌دهد، نه مدل**: مرزِ هر صحنه از زمانِ واقعیِ تکه‌های
 *     گفتار (`_times.json`) درمی‌آید و رانر آن را روی نزدیک‌ترین مکث
 *     می‌نشاند. هیچ قابِ خالی نیست: صحنهٔ اول از ثانیهٔ صفر، آخری تا آخر.
 *   • **نوشته کم است**: یک زیرنویسِ کوتاه در چند ثانیهٔ اول، نه کارتِ متن.
 *   • **مرزِ جعل سرِ جایش است**: هیچ شخصِ واقعی و هیچ سندِ واقعی.
 *   • **داوری پیش از رندر**: هر تصویر کنارِ متنِ خودش به مدل نشان داده
 *     می‌شود؛ ضعیف یا نوشته‌دار یک بار از نو ساخته می‌شود.
 *   • **نشد ⇒ مسیرِ قبلی**، با علت. ویدئوی ساده از ویدئوی نیامده بهتر است.
 */
function lvSceneOn_(show, level) {
  try {
    if (CFG.LV_SCENES === false) return false;
    if (!ytVisOn_(show)) return false;
    if (String(level || '') === 'خاموش') return false;
    return lvGenOn_() === true;
  } catch (e) { return false; }
}

/** طولِ هدفِ هر صحنه از **سطحِ همان مجموعه** روی تخته. */
function lvSceneSec_(level) {
  var hi = Math.max(8, Number(CFG.LV_SCENE_SEC_HIGH) || 20);
  var lo = Math.max(hi, Number(CFG.LV_SCENE_SEC_LOW) || 45);
  return String(level || '') === 'زیاد' ? hi : lo;
}

/** زبانِ هنریِ صحنه‌ها، از سبکِ همان مجموعه (و ترکیبش). */
function lvSceneArt_(styleKey) {
  var s = null;
  try { s = lvStyleResolve_(styleKey); } catch (e) { s = null; }
  if (!s) s = lvStyleDefault_();
  return { key: String(s.key || ''), art: String(s.art || LV_STYLES[0].art) };
}

/**
 * جمله‌ها با ثانیهٔ شروعشان، از تکه‌های **هم‌ترازشده** (`lvReplayChunks_`).
 * درونِ هر تکه زمان به نسبتِ نویسه پخش می‌شود (سرعتِ گفتار تقریباً ثابت
 * است)؛ مرزِ تکه‌ها دقیق است، و پایانِ هر تکه پایانِ گفتارِ خودش — پس
 * صحنه روی پلِ موسیقی از جملهٔ دیگری جلو نمی‌زند.
 */
function lvSceneSents_(chunks) {
  var out = [];
  for (var i = 0; i < (chunks || []).length; i++) {
    var txt = String((chunks[i] && chunks[i].text) || '').replace(/\s+/g, ' ').trim();
    if (!txt) continue;
    var a = Number(chunks[i].at) || 0;
    var b = Math.max(a, Number(chunks[i].end) || a);
    var ss = speakSentSplit_(txt);
    var tot = 0;
    for (var k = 0; k < ss.length; k++) tot += ss[k].length + 1;
    var pos = 0;
    for (var k2 = 0; k2 < ss.length; k2++) {
      out.push({ t: Math.round((a + (b - a) * (tot ? pos / tot : 0)) * 10) / 10,
                 text: ss[k2], ci: i,
                 sec: (Number(chunks[i].secIndex) >= 0) ? Number(chunks[i].secIndex) + 1 : 0 });
      pos += ss[k2].length + 1;
    }
  }
  return out;
}

/** پایانِ گروهِ q (شروعِ بعدی، یا پایانِ صوت). روی گروه‌های خام (متنْ آرایه). */
function lvSceneEnd_(g, q, total) {
  return (q + 1 < g.length) ? g[q + 1].t0 : total;
}

/**
 * گروهِ di را با همسایهٔ **کوتاه‌ترش** یکی می‌کند (روی گروه‌های خام). تنها تعریفِ
 * «یکی‌کردن» — برای سقفِ تعداد، برای صحنهٔ خیلی کوتاه، و برای سقفِ بودجه (۸.۴۹).
 */
function lvSceneMergeAt_(g, di, total) {
  if (g.length < 2 || di < 0 || di >= g.length) return;
  var to;
  if (di === 0) to = 1;
  else if (di === g.length - 1) to = di - 1;
  else {
    var nxt = lvSceneEnd_(g, di + 1, total) - g[di + 1].t0;
    var prv = g[di].t0 - g[di - 1].t0;
    to = nxt < prv ? di + 1 : di - 1;
  }
  var a = Math.min(di, to), b = Math.max(di, to);
  g[a].text = g[a].text.concat(g[b].text);
  if (!g[a].sec && g[b].sec) g[a].sec = g[b].sec;
  g.splice(b, 1);
}

/** کوتاه‌ترین را یکی کن تا شمار به سقف برسد. سقف با بلندکردنِ صحنه‌ها، نه بریدنِ آخرِ درس. */
function lvSceneMergeTo_(g, total, cap) {
  cap = Math.max(1, Number(cap) || 1);
  while (g.length > cap) {
    var di = -1, dv = Infinity;
    for (var q = 0; q < g.length; q++) {
      var dur = lvSceneEnd_(g, q, total) - g[q].t0;
      if (dur < dv) { dv = dur; di = q; }
    }
    lvSceneMergeAt_(g, di, total);
  }
  return g;
}

/** گروه‌های خام ⇒ صحنه‌های نهایی: شماره، پایان، متنِ پیوسته؛ صحنهٔ اول از صفر. */
function lvSceneFinal_(g, total) {
  if (g.length) g[0].t0 = 0;
  for (var j = 0; j < g.length; j++) {
    g[j].n = j + 1;
    g[j].t1 = (j + 1 < g.length) ? g[j + 1].t0 : Math.round(total * 10) / 10;
    g[j].text = [].concat(g[j].text).join(' ');
  }
  return g;
}

/**
 * جمله‌ها ⇒ صحنه‌ها **با ساعت** — حالا فقط راهِ پشتیبان (۸.۴۹): وقتی تدوین‌گر
 * (`lvSceneCuts_`) جواب نداد. صحنهٔ تازه روی **مرزِ جمله** شروع می‌شود.
 * `natural` روی آرایه = شمار پیش از سقف.
 */
function lvSceneGroups_(sents, target, secs, maxN) {
  var total = Math.max(1, Number(secs) || 0);
  var T = Math.max(6, Number(target) || 20);
  var cap = Math.max(3, Number(maxN) || 60);
  var g = [], cur = null, cut = T * 0.85;
  for (var i = 0; i < (sents || []).length; i++) {
    var s = sents[i];
    if (cur && s.t - cur.t0 >= cut) { g.push(cur); cur = null; }
    if (!cur) cur = { t0: s.t, text: [], sec: 0 };
    cur.text.push(s.text);
    if (!cur.sec && s.sec) cur.sec = s.sec;
  }
  if (cur) g.push(cur);
  // صحنهٔ آخرِ خیلی کوتاه به قبلی می‌پیوندد — تصویری که دو ثانیه بماند دیده نمی‌شود
  if (g.length > 1 && total - g[g.length - 1].t0 < T * 0.4) lvSceneMergeAt_(g, g.length - 1, total);
  var natural = g.length;
  /* سقف **سخت** است (۸.۴۸): برش در ۰٫۸۵ِ طولِ هدف انجام می‌شود، پس تعداد تا ~۱۸٪
     از سقف بالاتر می‌رفت. وقتی سقف از بودجه می‌آید، هر صحنهٔ اضافه یک تصویرِ
     بی‌پول است. */
  lvSceneMergeTo_(g, total, cap);
  var out = lvSceneFinal_(g, total);
  out.natural = natural;
  return out;
}

/** کوتاه‌ترین و بلندترین صحنهٔ برشِ محتوایی، از سطحِ تخته (۸.۴۹). */
function lvSceneCutSec_(level) {
  var hi = String(level || '') === 'زیاد';
  var mn = Math.max(3, Number(hi ? CFG.LV_CUT_MIN_HIGH : CFG.LV_CUT_MIN_LOW) || (hi ? 6 : 12));
  var mx = Math.max(mn * 2, Number(hi ? CFG.LV_CUT_MAX_HIGH : CFG.LV_CUT_MAX_LOW) || (hi ? 60 : 120));
  return { min: mn, max: mx };
}

var LV_CUT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    cuts: { type: 'ARRAY', items: { type: 'STRING' } },
    why: { type: 'STRING' }
  },
  required: ['cuts']
};

/**
 * پرسشِ تدوین‌گر (۸.۴۹): «تصویر کجا عوض شود؟» — از خودِ محتوا. فقط شمارهٔ
 * جمله‌ها برمی‌گردد؛ متن و توصیف کارِ پرسشِ بعدی است. سطحِ تخته **چگالی** است،
 * نه ثانیه: هیچ عددِ «هر N ثانیه» به مدل داده نمی‌شود، چون همان عدد هدف می‌شد.
 */
function lvSceneCutPrompt_(sents, ctx, lim) {
  var mm = function (x) {
    var s = Math.max(0, Math.round(Number(x) || 0));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  };
  var cap = Math.max(60, Number(CFG.LV_CUT_SENT_CHARS) || 200);
  var hi = String((ctx && ctx.level) || '') === 'زیاد';
  var L = [];
  L.push('تو تدوین‌گرِ یک ویدئوی مصورِ فارسی هستی. روی صدای ویدئو، تمام‌قاب نقاشی‌هایی ' +
         'می‌نشیند که هر کدام **همان چیزی را نشان می‌دهد که گوینده در آن لحظه می‌گوید**. ' +
         'کارِ تو فقط این است: بگو **تصویر کجا عوض شود**.');
  L.push('');
  L.push('عنوان: «' + String((ctx && ctx.title) || '') + '»' +
         ((ctx && ctx.seriesName) ? ' — مجموعه: «' + String(ctx.seriesName) + '»' : ''));
  L.push('');
  L.push('قاعده: **شمارِ تصویرها از خودِ محتوا می‌آید، نه از ساعت.** تصویرِ تازه وقتی ' +
         'می‌آید که چیزِ تازه‌ای برای **دیدن** هست: ایده یا تمایزِ تازه، مثال یا تشبیهِ تازه، ' +
         'شخصیت یا مکان یا رویدادِ تازه در ماجرا، یا چرخشی در استدلال. تا وقتی گوینده همان ' +
         'یک چیز را باز می‌کند، همان تصویر می‌مانَد — حتی اگر طول بکشد. درسی که مفهوم‌هایش ' +
         'پشتِ‌هم می‌آیند تصویرِ زیاد می‌گیرد و بحثی که آرام روی یک ایده می‌مانَد کم؛ هیچ ' +
         'شمارِ از پیش تعیین‌شده‌ای در کار نیست.');
  L.push(hi
    ? 'چگالیِ این مجموعه «زیاد» است: **هر** تغییرِ واقعیِ چیزِ دیدنی یک تصویرِ تازه است.'
    : 'چگالیِ این مجموعه «کم» است: فقط سرِ تغییرهای **بزرگ** (ایده یا مرحلهٔ تازهٔ ماجرا) ' +
      'تصویر عوض شود؛ جزئیات زیرِ همان تصویر می‌مانند.');
  L.push('هیچ تصویری کوتاه‌تر از ~' + lim.min + ' ثانیه نماند (دیده نمی‌شود). اگر یک ' +
         'ایده خیلی طول کشید، سرِ جای طبیعی‌اش (مثال یا گامِ بعدی) عوضش کن.');
  L.push('');
  L.push('جمله‌ها به ترتیب، با زمانِ شروع:');
  for (var i = 0; i < sents.length; i++) {
    var tx = lvSceneClean_(sents[i].text);
    if (tx.length > cap) tx = tx.slice(0, cap) + '…';
    L.push('[' + (i + 1) + '] (' + mm(sents[i].t) + ') ' + tx);
  }
  L.push('');
  L.push('در `cuts` شمارهٔ جمله‌هایی را بنویس که **تصویرِ تازه از آن‌ها شروع می‌شود**، به ' +
         'ترتیب (جملهٔ ۱ همیشه آغاز است). در `why` یک جملهٔ کوتاهِ فارسی: این درس چرا این ' +
         'اندازه تصویر می‌خواهد.');
  return L.join('\n');
}

/**
 * نقطه‌های برش از تدوین‌گر. `null` اگر جواب نیامد یا خوانده نشد — آن‌وقت راهِ
 * زمانی می‌رود و **گفته می‌شود** (`why`).
 */
function lvSceneCuts_(sents, ctx, lim) {
  var out = { starts: null, why: '', note: '' };
  if (CFG.LV_SCENE_CUT === false) { out.why = 'برشِ محتوایی خاموش است'; return out; }
  var r = null;
  try {
    r = geminiText_(lvSceneCutPrompt_(sents, ctx, lim), LV_CUT_SCHEMA,
                    Math.max(1024, Number(CFG.LV_CUT_TOKENS) || 6144), { exact: true });
  } catch (e) { out.why = 'تدوین‌گر جواب نداد: ' + String(e.message).slice(0, 120); return out; }
  if (!r || !Array.isArray(r.cuts)) { out.why = 'پاسخِ تدوین‌گر برش نداشت'; return out; }
  var seen = {}, st = [];
  for (var i = 0; i < r.cuts.length; i++) {
    var n = Number(String(r.cuts[i] || '').replace(/[^0-9۰-۹]/g, '')
                   .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }));
    if (!n || n < 1 || n > sents.length || seen[n]) continue;
    seen[n] = 1; st.push(n);
  }
  if (!seen[1]) st.push(1);
  st.sort(function (x, y) { return x - y; });
  out.starts = st;
  out.note = String(r.why || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  return out;
}

/**
 * نقطه‌های برش ⇒ صحنه‌ها (۸.۴۹). شمارِ نهایی از محتوا؛ کد فقط دو مرز را
 * نگه می‌دارد: بلندتر از `max` سرِ مرزِ جمله نصف می‌شود، و کوتاه‌تر از `min` با
 * همسایه یکی. و سقفِ `cap` (بودجه یا ایمنی) — که شمار را فقط **پایین** می‌آورد.
 * `natural` روی آرایه = شمار پیش از سقف.
 */
function lvSceneCutGroups_(sents, starts, secs, lim, cap) {
  var total = Math.max(1, Number(secs) || 0);
  var g = [];
  for (var k = 0; k < starts.length; k++) {
    var a = starts[k] - 1, b = (k + 1 < starts.length) ? starts[k + 1] - 1 : sents.length;
    if (b <= a) continue;
    var part = sents.slice(a, b);
    var t0 = part[0].t, t1 = (b < sents.length) ? sents[b].t : total;
    var dur = t1 - t0;
    /* بلندتر از سقف ⇒ چند تکهٔ برابر: هر مرز روی جمله‌ای که به نقطهٔ برابر نزدیک‌تر
       است. «هر بار که از گام گذشت ببُر» تکهٔ ریزِ اضافه در ته می‌ساخت. */
    var pieces = dur > lim.max ? Math.ceil(dur / lim.max) : 1;
    var cutAt = {}, prev = 0;
    for (var p = 1; p < pieces; p++) {
      var aim = t0 + dur * p / pieces, bi = -1, bd = Infinity;
      for (var j0 = prev + 1; j0 < part.length; j0++) {
        var dd = Math.abs(part[j0].t - aim);
        if (dd < bd) { bd = dd; bi = j0; }
      }
      if (bi > prev) { cutAt[bi] = 1; prev = bi; }
    }
    var cur = null;
    for (var j = 0; j < part.length; j++) {
      var s = part[j];
      if (cur && cutAt[j]) { g.push(cur); cur = null; }
      if (!cur) cur = { t0: s.t, text: [], sec: 0 };
      cur.text.push(s.text);
      if (!cur.sec && s.sec) cur.sec = s.sec;
    }
    if (cur) g.push(cur);
  }
  /* کوتاه‌تر از کف ⇒ با همسایهٔ کوتاه‌تر یکی؛ کوتاه‌ترین اول */
  for (var guard = 0; guard < 10000 && g.length > 1; guard++) {
    var di = -1, dv = Infinity;
    for (var q = 0; q < g.length; q++) {
      var d = lvSceneEnd_(g, q, total) - g[q].t0;
      if (d < lim.min && d < dv) { dv = d; di = q; }
    }
    if (di < 0) break;
    lvSceneMergeAt_(g, di, total);
  }
  var natural = g.length;
  lvSceneMergeTo_(g, total, Math.max(1, Number(cap) || 150));
  var out = lvSceneFinal_(g, total);
  out.natural = natural;
  return out;
}

/** متنِ صحنه برای مدل: بی اعراب و بی نیم‌فاصلهٔ تلفظی — مدل معنا را می‌خوانَد، نه تلفظ را. */
function lvSceneClean_(t) {
  return String(t || '').replace(/[ً-ْٰ]/g, '').replace(/\s+/g, ' ').trim();
}

var LV_SCENE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    /* «این صدا چیست؟» — اول، چون هر چیزِ بعدی به آن بسته است (۸.۴۷). مدلِ
       ساختاریافته فیلدها را به ترتیبِ schema می‌نویسد. */
    nature: { type: 'STRING' },
    cast: { type: 'STRING' },
    cover: { type: 'STRING' },
    scenes: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      n: { type: 'STRING' }, beat: { type: 'STRING' },
      scene: { type: 'STRING' }, caption: { type: 'STRING' },
      // حرکتِ معنادار (۸.۵۱): کدام عنصرِ تصویر، و دوربین با آن چه کند
      focus: { type: 'STRING' }, move: { type: 'STRING' },
      // نوشتهٔ رویِ نقاشی (۸.۴۵) — همه رشته، چون این مدل جز رشته نمی‌پذیرد
      ov: { type: 'STRING' }, ovTitle: { type: 'STRING' },
      ovLines: { type: 'ARRAY', items: { type: 'STRING' } },
      ovA: { type: 'STRING' }, ovB: { type: 'STRING' },
      ovKeys: { type: 'ARRAY', items: { type: 'STRING' } }, ovSide: { type: 'STRING' } },
      required: ['n', 'scene'] } }
  },
  required: ['scenes']
};

/**
 * `only` = فقط این شماره‌ها. `first` = این دستهٔ **اولِ** پرسش است (۸.۴۹): ماهیت
 * از همین‌ها تشخیص داده می‌شود و کاور و شخصیت‌ها هم از همین دسته می‌آیند. دسته‌های
 * بعد و پرسشِ دوم ماهیت را **می‌شنوند** و کاور نمی‌دهند.
 */
function lvScenePrompt_(groups, ctx, art, cast, only, first) {
  var second = !!only && !first;
  var mm = function (x) {
    var s = Math.max(0, Math.round(Number(x) || 0));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  };
  var cap = Math.max(160, Number(CFG.LV_SCENE_TEXT_CHARS) || 420);
  var L = [];
  /* ══ «درس است» فرض بود، نه تشخیص (۸.۴۷) ══
     تا ۸.۴۶ این خط می‌گفت «صدای ویدئو یک درس است». مجموعه‌ای که کتابش رمان یا
     حکایت است، یا درسی که با یک داستان پیش می‌رود، همان دستور را می‌گرفت: صحنه‌ها
     استعارهٔ آموزشی می‌شدند به‌جای خودِ ماجرا، و روی تصویرِ یک قصه «نکته» و
     «جدولِ مقایسه» می‌نشست. ماهیت حالا از **خودِ متن** تشخیص داده می‌شود، نه از
     عنوان یا دستهٔ مجموعه (همان قاعدهٔ ۸-ذ: دسته برچسبِ بایگانی است، نه عینکِ
     خواندن). */
  L.push('تو کارگردانِ هنریِ یک ویدئوی فارسی هستی. تصویرش باید **لحظه‌به‌لحظه همان ' +
         'چیزی را نشان بدهد که گوینده در همان لحظه می‌گوید** — مثلِ ویدئوهای مصورِ ' +
         'NotebookLM: هر تصویر یک صحنهٔ روشن و بامعناست؛ نه نوشته، نه نقشِ تزئینی، نه ' +
         'نمودارِ برچسب‌دار.');
  L.push('');
  L.push('عنوان: «' + String((ctx && ctx.title) || '') + '»' +
         ((ctx && ctx.seriesName) ? ' — مجموعه: «' + String(ctx.seriesName) + '»' : ''));
  if (second && ctx && ctx.nature) {
    L.push('ماهیتِ این صدا از پیش تشخیص داده شده: «' + String(ctx.nature) + '». همان را نگه دار.');
  } else {
    L.push('');
    L.push('**اول تشخیص بده این صدا چیست — از خودِ متنِ صحنه‌ها، نه از عنوان یا دستهٔ ' +
           'مجموعه** (فیلدِ `nature`):');
    L.push('  «درس» = مفهوم، استدلال، تعریف، تمایز.');
    L.push('  «داستان» = روایتِ رویداد با شخصیت و مکان: قصه، رمان، حکایت، داستانِ کوتاه، ' +
           'زندگی‌نامه، روایتِ تاریخی، خاطره.');
    L.push('  «آمیخته» = درسی که با داستان، مثال یا آزمایشِ فکری پیش می‌رود.');
  }
  L.push('زبانِ هنریِ همهٔ تصویرها (ثابت، برای یک‌دستی): ' + art);
  if (cast) L.push('شخصیت‌های ثابتِ این ویدئو (همین توصیف را هر بار عیناً به کار ببر): ' + cast);
  L.push('');
  L.push(second ? 'فقط برای این صحنه‌ها بنویس:' :
         only ? 'صحنه‌های **آغازِ** ویدئو پشتِ‌هم‌اند (بقیه جدا پرسیده می‌شوند)؛ کنارِ هر کدام ' +
                'متنی که **همان موقع** خوانده می‌شود آمده است:' :
         'صحنه‌ها پشتِ‌هم‌اند؛ کنارِ هر کدام متنی که **همان موقع** خوانده می‌شود آمده است:');
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    if (only && only.indexOf(g.n) === -1) continue;
    var tx = lvSceneClean_(g.text);
    if (tx.length > cap) tx = tx.slice(0, cap) + '…';
    L.push('[' + g.n + '] (' + mm(g.t0) + '–' + mm(g.t1) + ') ' + tx);
  }
  L.push('');
  L.push('برای هر صحنه:');
  L.push('• `beat` — «ایده» یا «روایت». «روایت» یعنی متنِ همان لحظه یک ماجرا را تعریف ' +
         'می‌کند (رویداد، شخصیت، گفت‌وگو، مثالِ داستانی، آزمایشِ فکری)؛ «ایده» یعنی مفهوم را ' +
         'توضیح می‌دهد. در «داستان» تقریباً همه «روایت»اند؛ در «آمیخته» هر صحنه را جدا بسنج.');
  L.push('• `scene` — **به انگلیسی**، یک تصویرِ مشخص و دیدنی: چه کسی یا چه چیزی، کجا، ' +
         'در حالِ چه کاری. یک کانونِ روشن، ترکیب‌بندیِ پهن (۱۶:۹). ۲۵ تا ۶۰ واژه.');
  L.push('   برای «ایده»: ایدهٔ **همان متن** را با یک استعارهٔ دیداریِ ملموس نشان بده ' +
         '(مثلاً «توجیه از مقدمه به نتیجه منتقل می‌شود» ⇒ نوری که از یک فانوس به فانوسِ ' +
         'بعدی در زنجیره‌ای از فانوس‌ها می‌رسد).');
  L.push('   برای «روایت»: **خودِ همان لحظهٔ ماجرا** را نشان بده، نه استعاره‌ای دربارهٔ آن — ' +
         'همان شخصیت، همان مکان، همان کار. حال‌وهوای همان لحظه (ترس، شادی، اندوه، تعلیق، ' +
         'آرامش) را در نور، رنگ و ترکیب‌بندی بیاور، در همان زبانِ هنری. و هرگز چیزی را که ' +
         'هنوز گفته نشده نشان نده: پایانِ غافلگیرکننده‌ای که در صحنهٔ بعد فاش می‌شود، ' +
         'در صحنهٔ قبل لو نمی‌رود.');
  L.push('• `caption` — به فارسی، حداکثر شش واژه: **مفهومِ کلیدیِ همان لحظه** (نه جمله). ' +
         'اگر تصویر خودش گویاست، خالی بگذار.');
  /* حرکتِ معنادار (۸.۵۱): دوربین به‌سوی چیزی می‌رود که گوینده درباره‌اش حرف می‌زند،
     نه به جهتی که شمارهٔ صحنه می‌گوید. */
  L.push('• `focus` — به انگلیسی، دو تا شش واژه: **همان عنصرِ دیدنیِ این صحنه که متنِ همین ' +
         'لحظه درباره‌اش است** (مثلاً the last lantern in the chain). باید در خودِ `scene` باشد. ' +
         'اگر صحنه یک کانونِ روشن ندارد، خالی.');
  L.push('• `move` — حرکتِ دوربین در طولِ صحنه، به خدمتِ فهم نه تزئین: «push» = آرام به `focus` ' +
         'نزدیک شو (وقتی متن روی همان چیز می‌مانَد یا آن را برجسته می‌کند)؛ «reveal» = از نمای ' +
         'نزدیکِ `focus` عقب برو تا کلِ تصویر دیده شود (وقتی متن از جزء به کل، یا از یک حلقه به ' +
         'کلِ زنجیره می‌رسد)؛ «travel» = دوربین از سمتِ دیگرِ تصویر به `focus` می‌رسد (وقتی متن ' +
         '«از این به آن» می‌رود: از مقدمه به نتیجه، از علت به معلول، از یک شخصیت به دیگری)؛ ' +
         '«drift» = حرکتِ آرامِ معمولی، وقتی کانونِ خاصی نیست. حرکت‌ها را میانِ صحنه‌ها عوض کن.');
  L.push('• `n` — همان شمارهٔ صحنه.');
  var share = Number((ctx && ctx.textShare) || 0);
  /* شمارِ همین پرسش، نه کلِ ویدئو — دسته‌ای ده‌تایی «حدودِ ۴۵ از ۱۰۰» نمی‌گیرد (۸.۴۹). */
  var here = 0;
  for (var h = 0; h < groups.length; h++) if (!only || only.indexOf(groups[h].n) !== -1) here++;
  if (share > 0) {
    var want = Math.max(1, Math.round(here * share));
    L.push('');
    L.push('**نوشتهٔ رویِ نقاشی** (`ov` و فیلدهای `ov…`): روی حدودِ ' + want + ' صحنه از ' +
           here + ' (نه بیشتر)، یک لایهٔ نوشتاریِ کوتاه و زیبا **روی همان نقاشی** ' +
           'می‌نشیند — مثلِ ویدئوهای آموزشیِ خوب: تیتری با واژهٔ کلیدیِ رنگی، چند نکتهٔ کنارِ ' +
           'تصویر، جدولِ مقایسه، نقل‌قول، یا گام‌های پشتِ‌هم. فقط جایی بگذار که **واقعاً چیزی ' +
           'برای دیدن** دارد: تعریف، تمایز، فهرست، روند، جملهٔ کلیدی. تکرارِ واژه‌به‌واژهٔ روایت نیست؛ ' +
           'چکیده‌ای است که بیننده با یک نگاه بگیرد. صحنه‌ای که نوشته نمی‌خواهد: `ov` خالی.');
    L.push('• `ov` — یکی از: headline · points · compare · quote · steps.');
    L.push('  headline: `ovTitle` تیترِ کوتاه (≤ ۳۰ نویسه) **و همیشه** یک سطرِ توضیح در `ovLines` ' +
           '(≤ ۷۰ نویسه) که بگوید این مفهوم یعنی چه — تیترِ تنها فقط یک جملهٔ معلق است، نه کارت.');
    L.push('  points: `ovTitle` اختیاری و ۲ تا ۳ نکتهٔ کوتاه (≤ ۶۰ نویسه) در `ovLines`.');
    L.push('  compare: `ovA` و `ovB` نامِ دو ستون، و ۱ تا ۳ ردیف در `ovLines` به شکلِ «برچسب: مقدارِ ستونِ اول | مقدارِ ستونِ دوم».');
    L.push('  quote: `ovTitle` خودِ جملهٔ کلیدی (≤ ۹۰ نویسه)، و اختیاری گوینده/منبع در `ovLines`.');
    L.push('  steps: ۳ گامِ خیلی کوتاه (≤ ۲۴ نویسه) در `ovLines`، به ترتیب، و `ovTitle` اختیاری.');
    L.push('• `ovKeys` — ۱ یا ۲ واژهٔ کلیدی که **عیناً** در همان نوشته آمده و رنگی می‌شود.');
    L.push('• `ovSide` — جایی از قاب که نوشته می‌نشیند: right · left · top. و **صحنه را طوری ' +
           'توصیف کن که همان بخشِ قاب خلوت و ساده بماند** (آسمانِ صاف، دیوار، کاغذ) و موضوعِ ' +
           'اصلی در طرفِ دیگر باشد — نوشته نباید روی چهره یا شیءِ اصلی بیفتد.');
    L.push('• صحنه‌های نوشته‌دار را در طولِ ویدئو **پخش** کن و نوعشان را عوض کن؛ دو صحنهٔ ' +
           'پشتِ‌هم یک نوع نگیرند. در «ایده»ها بیشترِ کارت‌ها points، steps یا compare باشند — ' +
           'headline و quote روی هم حداکثر یک‌سوم (۸.۵۶: درسی که همهٔ کارت‌هایش تیتر و نقل بود، ' +
           '«فقط یک جملهٔ ساده و درهم» دیده شد). واژه‌ها فارسیِ معیار و درست، اعداد فارسی.');
    L.push('• روی صحنهٔ «روایت» فقط headline (یک برچسبِ کوتاهِ زمان یا مکان یا نقطهٔ عطف، ' +
           'مثلِ «یک شبِ زمستانی») یا quote (جمله‌ای که در همان لحظه گفته می‌شود) — هرگز ' +
           'points و compare و steps: قصه فهرست و جدول نیست. و نوشته هم مثلِ تصویر چیزی را ' +
           'که هنوز گفته نشده فاش نمی‌کند. در «داستان» نوشته کمتر از درس است.');
  }
  if (!second) {
    L.push('و یک `cover` — به انگلیسی، یک تصویرِ چشم‌گیر از ایدهٔ مرکزیِ کلِ ویدئو (برای ' +
           '«داستان»: فضا و شخصیتِ اصلی، **بی لو دادنِ پایان**)، با فضای خلوت و آرام در ' +
           '**سمتِ راستِ** قاب برای عنوان.');
    L.push('و یک `cast` — به انگلیسی، یک جمله: شخصیت(های) ثابت و بی‌نامِ این ویدئو ' +
           '(مثلاً a curious young student in a blue sweater)، تا در همهٔ صحنه‌ها یک‌جور ' +
           'توصیف شوند. اگر شخصیتی لازم نیست، خالی.');
  }
  L.push('');
  L.push('قیدهای قطعی:');
  L.push('• در هیچ تصویری متن، حرف، عدد، برچسب، تابلو یا لوگو نخواه.');
  L.push('• هیچ شخصِ واقعی و شناختنی (فیلسوف، عالم، چهرهٔ تاریخی، سیاستمدار) و هیچ ' +
         'سند یا کتابِ واقعی را نشان نده. اگر متن از کسی نام می‌برد، **ایده‌اش** را ' +
         'نشان بده، نه او را. شخصیت‌ها عام و بی‌نام‌اند. در «روایت»ی که دربارهٔ آدمی واقعی ' +
         'است (زندگی‌نامه، تاریخ)، او پیکری عام و بی‌چهره است — از پشت، سایه‌وار، یا دور.');
  L.push('• دو صحنهٔ پشتِ‌هم یک ترکیب‌بندی نداشته باشند: زاویه، فاصله یا مکان عوض شود.');
  L.push('• هر صحنه به **متنِ خودش** مربوط باشد، نه به کلِ ویدئو.');
  return L.join('\n');
}

/** پرسشِ صحنه‌ها. `only` = فقط این شماره‌ها (یک دسته، یا پرسشِ دوم برای جاافتاده‌ها). */
function lvSceneAsk_(groups, ctx, art, cast, only, first) {
  var out = { scenes: {}, cover: '', cast: '', why: '', nature: '' };
  var r = null;
  try {
    r = geminiText_(lvScenePrompt_(groups, ctx, art, cast, only, first), LV_SCENE_SCHEMA,
                    Math.max(8192, Number(CFG.YT_META_TOKENS) || 16384));
  } catch (e) { out.why = 'مدلِ متن جواب نداد: ' + String(e.message).slice(0, 120); return out; }
  if (!r || !Array.isArray(r.scenes)) { out.why = 'پاسخ صحنه نداشت'; return out; }
  for (var i = 0; i < r.scenes.length; i++) {
    var x = r.scenes[i] || {};
    var n = Number(String(x.n || '').replace(/[^0-9۰-۹]/g, '')
                   .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }));
    var sc = String(x.scene || '').replace(/\s+/g, ' ').trim();
    if (!n || sc.length < 12) continue;
    out.scenes[String(n)] = { scene: sc.slice(0, 700),
                              caption: ytVisCut_(String(x.caption || ''), 48),
                              beat: lvSceneBeat_(x.beat),
                              ov: lvSceneOvNorm_(x),
                              focus: String(x.focus || '').replace(/\s+/g, ' ').trim().slice(0, 80),
                              move: lvSceneMove_(x.move) };
  }
  out.nature = lvSceneNature_(r.nature);
  out.cover = String(r.cover || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  out.cast = String(r.cast || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  return out;
}

/** ماهیتِ صدا، پاک‌شده (۸.۴۷). ناشناخته ⇒ '' — یعنی «تشخیص داده نشد»، که رفتارِ درس را می‌گیرد. */
function lvSceneNature_(v) {
  var t = String(v || '').replace(/[\u200c\s]+/g, '').trim();
  if (/^درس|^lesson/i.test(t)) return 'درس';
  if (/^داستان|^قصه|^روایت|^story|^narrative/i.test(t)) return 'داستان';
  if (/^آمیخته|^ترکیبی|^mixed/i.test(t)) return 'آمیخته';
  return '';
}

/** ضربِ هر صحنه: «روایت» یا «ایده». ناشناخته ⇒ '' . */
function lvSceneBeat_(v) {
  var t = String(v || '').replace(/[\u200c\s]+/g, '').trim();
  if (/^روایت|^داستان|^story|^narrat/i.test(t)) return 'روایت';
  if (/^ایده|^مفهوم|^idea|^concept/i.test(t)) return 'ایده';
  return '';
}

/** حرکتِ دوربین: push / reveal / drift. ناشناخته ⇒ '' (همان حرکتِ آرامِ پیش‌فرض). */
function lvSceneMove_(v) {
  var t = String(v || '').toLowerCase().trim();
  if (/^push|^zoom.?in|^نزدیک/.test(t)) return 'push';
  if (/^reveal|^pull|^zoom.?out|^عقب/.test(t)) return 'reveal';
  if (/^travel|^pan|^track|^گذر/.test(t)) return 'travel';
  if (/^drift|^آرام/.test(t)) return 'drift';
  return '';
}

/**
 * دستورِ حرکتِ یک صحنه برای رانر (۸.۵۱): فقط وقتی هم «چه کند» (از توصیف) و هم «کجا»
 * (از داوری روی خودِ تصویر) هست. یکی نباشد ⇒ null، یعنی همان حرکتِ آرامِ پیش‌فرض.
 */
function lvSceneMv_(x) {
  if (CFG.LV_MOTION_ON === false || !x) return null;
  var k = String(x.move || '');
  var b = x.judge && x.judge.box;
  if ((k !== 'push' && k !== 'reveal' && k !== 'travel') || !b) return null;
  return { k: k, x: b.x, y: b.y, z: Math.max(0.02, Math.min(0.25, Number(CFG.LV_FOCUS_ZOOM) || 0.14)) };
}

/**
 * جای عنصرِ کانون، از داوری که **خودِ تصویر** را دیده (۸.۵۱) — قالبِ بومیِ مدل
 * برای جای‌یابی: «ymin,xmin,ymax,xmax» از ۰ تا ۱۰۰۰. نامطمئن یا نامعقول ⇒ null،
 * و آن صحنه همان حرکتِ آرامِ پیش‌فرض را می‌گیرد: اشارهٔ نادرست بدتر از هیچ است.
 */
function lvSceneBox_(v) {
  var m = String(v || '').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
                         .match(/(\d+(?:\.\d+)?)/g);
  if (!m || m.length < 4) return null;
  var y0 = Number(m[0]), x0 = Number(m[1]), y1 = Number(m[2]), x1 = Number(m[3]);
  if ([y0, x0, y1, x1].some(function (q) { return !isFinite(q) || q < 0 || q > 1000; })) return null;
  if (y1 <= y0 || x1 <= x0) return null;
  var w = (x1 - x0) / 1000, h = (y1 - y0) / 1000;
  if (w * h < 0.004 || w * h > 0.85) return null;          // نقطه‌ای بی‌معنا یا کلِ قاب
  return { x: Math.round(((x0 + x1) / 2000) * 1000) / 1000, y: Math.round(((y0 + y1) / 2000) * 1000) / 1000,
           w: Math.round(w * 1000) / 1000, h: Math.round(h * 1000) / 1000 };
}

/**
 * سدِ ماهیت روی نوشتهٔ رویِ نقاشی (۸.۴۷) — **در کد، نه فقط در پرامپت.**
 * صحنهٔ «روایت» (یا هر صحنه‌ای در «داستان» که صریحاً «ایده» نیست) فهرست و جدول و
 * گام نمی‌گیرد: قصه فهرست نیست. فقط برچسبِ کوتاه یا نقلِ همان لحظه. این سد به
 * **سهم** کاری ندارد — حتی وقتی تخته «زیاد» گفته — چون دربارهٔ درستی است، نه مقدار.
 * @return {number} چند نوشته کنار رفت
 */
function lvSceneOvGenre_(scenes, nature) {
  var dropped = 0;
  for (var i = 0; i < scenes.length; i++) {
    var sc = scenes[i];
    if (!sc || !sc.ov) continue;
    var story = sc.beat === 'روایت' || (nature === 'داستان' && sc.beat !== 'ایده');
    if (story && ['points', 'compare', 'steps'].indexOf(sc.ov.kind) !== -1) { sc.ov = null; dropped++; }
  }
  return dropped;
}

/**
 * سهمِ نوشته وقتی تخته «خودکار» است (۸.۴۷): از ماهیتِ همین صدا، نه یک عددِ ثابت.
 * تا ۸.۴۶ «خودکار» یعنی همیشه ۴۵٪ — برای درس و قصه یکی. سهمی که آدم خودش نوشته
 * (خاموش/کم/زیاد) دست نمی‌خورد.
 */
function lvSceneTextShare_(textLevel, share, nature) {
  if (String(textLevel || '') !== 'خودکار') return Number(share) || 0;
  var tab = CFG.LV_TEXT_AUTO || {};
  var v = Number(tab[nature || 'درس']);
  return isNaN(v) ? (Number(share) || 0) : v;
}

/**
 * نوشتهٔ رویِ نقاشی، پاک‌شده (۸.۴۵). نامعتبر ⇒ `null` — صحنه بی‌نوشته می‌ماند، نه
 * با نوشتهٔ نیمه‌کاره. «نه بیشتر از» در پرامپت فقط امید است؛ سقف این‌جا و در
 * `lvSceneOvTrim_` است (یک سقفِ گفته‌شده فقط در پرامپت سقف نیست).
 */
function lvSceneOvNorm_(x) {
  var kind = String((x && x.ov) || '').trim().toLowerCase();
  if (['headline', 'points', 'compare', 'quote', 'steps'].indexOf(kind) === -1) return null;
  var cut = function (t, n) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    try { t = faDigitsOut_(t); } catch (e) {}
    return t.length > n ? t.slice(0, n - 1).trim() + '…' : t;
  };
  var lines = [];
  var raw = (x && Array.isArray(x.ovLines)) ? x.ovLines : [];
  for (var i = 0; i < raw.length && lines.length < 3; i++) { var l = cut(raw[i], 80); if (l) lines.push(l); }
  var o = { kind: kind, title: cut(x.ovTitle, kind === 'quote' ? 120 : 48), lines: lines,
            a: cut(x.ovA, 24), b: cut(x.ovB, 24), keys: [], side: '' };
  var side = String(x.ovSide || '').trim().toLowerCase();
  if (['right', 'left', 'top'].indexOf(side) !== -1) o.side = side;
  var all = o.title + ' ' + lines.join(' ') + ' ' + o.a + ' ' + o.b;
  var ks = (x && Array.isArray(x.ovKeys)) ? x.ovKeys : [];
  for (var k = 0; k < ks.length && o.keys.length < 2; k++) {
    var kk = cut(ks[k], 24);
    if (kk && all.indexOf(kk) !== -1) o.keys.push(kk);   // واژه‌ای که در متن نیست رنگی نمی‌شود
  }
  if (kind === 'headline' && !o.title) return null;
  if (kind === 'points' && lines.length < 2) return null;
  if (kind === 'quote' && !o.title) return null;
  if (kind === 'steps' && lines.length < 2) return null;
  if (kind === 'compare') {
    if (!o.a || !o.b) return null;
    o.lines = lines.filter(function (y) { return y.indexOf('|') > 0; });
    if (!o.lines.length) return null;
  }
  return o;
}

/**
 * سهمِ تخته **سقف** است (۸.۴۵): اگر مدل بیشتر داد، صحنه‌های نوشته‌دار با فاصلهٔ
 * برابر در طولِ درس نگه داشته می‌شوند و بقیه بی‌نوشته — و دو صحنهٔ پشتِ‌هم با
 * یک نوع، دومی کنار می‌رود. «خاموش» یعنی هیچ.
 */
function lvSceneOvTrim_(scenes, share) {
  var n = scenes.length, cap = Math.round(n * Math.max(0, Math.min(1, Number(share) || 0)));
  var withOv = [];
  for (var i = 0; i < n; i++) {
    if (!scenes[i].ov) continue;
    if (cap <= 0) { scenes[i].ov = null; continue; }
    var prev = withOv.length ? scenes[withOv[withOv.length - 1]] : null;
    if (prev && withOv[withOv.length - 1] === i - 1 && prev.ov.kind === scenes[i].ov.kind) {
      scenes[i].ov = null; continue;
    }
    withOv.push(i);
  }
  if (withOv.length > cap) {
    var keep = {};
    for (var j = 0; j < cap; j++) keep[withOv[Math.floor((j + 0.5) * withOv.length / cap)]] = true;
    for (var q = 0; q < withOv.length; q++) if (!keep[withOv[q]]) scenes[withOv[q]].ov = null;
  }
  var cnt = 0;
  for (var z = 0; z < n; z++) if (scenes[z].ov) cnt++;
  return cnt;
}

/** به نقاش: همان بخشی از قاب را که نوشته می‌گیرد، خلوت بگذار. */
function lvSceneOvSpace_(ov) {
  if (!ov) return '';
  var side = ov.side || (ov.kind === 'compare' || ov.kind === 'steps' ? 'top' : 'right');
  var where = side === 'left' ? 'the left third of the frame' : side === 'top' ? 'the upper third of the frame' :
              'the right third of the frame';
  var other = side === 'left' ? 'the right side' : side === 'top' ? 'the lower part' : 'the left side';
  return 'Composition: keep ' + where + ' calm, plain and uncluttered (open sky, soft wall, blank paper or ' +
         'gentle gradient, no figures and no detailed objects there) because text will be placed on it later; ' +
         'put the main subject and every face on ' + other + '.';
}

/**
 * ══ کارت‌های نوشتاری، وقتی نقشه کم داد (۸.۵۶) ══
 *
 * درسِ ۴۰: تخته «خودکار» بود، یعنی سهمِ ۴۵٪ — حدودِ ۱۸ کارت از ۴۰ صحنه. مدلِ نقشه
 * **هشت** داد، همه تیتر یا نقل، با سطرِ توضیحِ خالی؛ و صاحبِ برنامه دید «شاید در کلِ
 * ۲۰ دقیقه سه چهار مورد … فقط یه جملهٔ ساده و درهم». سهم در کد **سقف** بود
 * (`lvSceneOvTrim_`) و هیچ چیز کفش را نمی‌سنجید: «حدودِ N» فقط در پرامپت بود — و
 * سقفی که فقط در پرامپت گفته شده سقف نیست (همان قاعدهٔ `specialCondense_`).
 *
 * پس از داوری (که می‌گوید کجای هر تصویر خالی است)، اگر کارت‌ها از
 * `LV_OV_FILL_MIN`ِ سهم کمترند، **یک پرسشِ جدا و کوچک** فقط برای کارت‌ها: صحنه‌های
 * بی‌کارتی که داور در آن‌ها جای خالی دیده (نه «هیچ‌جا»، نه فقط تاریخ)، با متنِ خودشان.
 * کد می‌سنجد (`lvSceneOvNorm_`، سدِ ماهیتِ ۸.۴۷)، جایش را از داور می‌گیرد، و سهم را
 * همان سقفِ قبلی نگه می‌دارد. یک بار برای هر درس (`ovFillAt`)؛ نشد ⇒ گفته می‌شود.
 * @return {{asked:number, got:number, why:string}}
 */
function lvSceneOvFill_(d, ctx, left) {
  var out = { asked: 0, got: 0, up: 0, why: '' };
  if (!d || !d.scenes || d.ovFillAt || CFG.LV_OV_FILL === false) return out;
  var share = Number(d.ovShare) || 0;
  if (share <= 0) return out;
  var n = d.scenes.length;
  var target = Math.round(n * share);
  var have = d.scenes.filter(function (x) { return !!x.ov; }).length;
  var floor = Math.ceil(target * (Number(CFG.LV_OV_FILL_MIN) || 0.75));
  /* «یکنواخت» (۸.۶۰): در درس، تیتر و نقل روی هم حداکثر یک‌سوم. درسِ ۴۰ هشت کارت
     داشت، شش تیتر و دو نقل — کف را هم نمی‌داد، ولی حتی اگر می‌داد، هجده تیترِ تنها
     همان «فقط یه جملهٔ ساده» بود. قصه از این سد بیرون است: روایت فهرست نمی‌گیرد. */
  var lesson = String(d.nature || '') !== 'داستان';
  var weakMax = lesson ? Math.floor(Math.max(target, have) * (Number(CFG.LV_OV_WEAK_MAX) || 1 / 3)) : Infinity;
  var weakNow = d.scenes.filter(function (x) { return lvOvWeak_(x.ov); }).length;
  var needMore = have < floor;
  var flat = lesson && have >= 3 && weakNow > Math.max(1, weakMax);
  if (!needMore && !flat) {
    d.ovFillAt = nowStr_();
    d.ovFill = { asked: 0, got: 0, up: 0, why: 'کافی بود', have: have, target: target, weak: weakNow };
    return out;
  }
  if (left && left() < 45000) { out.why = 'وقت کم است'; return out; }
  var story = function (x) { return x.beat === 'روایت' || (d.nature === 'داستان' && x.beat !== 'ایده'); };
  var spaced = function (x) {
    var sp = x.judge && x.judge.space;
    return x.fileId && x.judge && sp && sp !== 'none' && !lvSceneIsCalendar_(x.text) &&
           (Number(x.t1) || 0) - (Number(x.t0) || 0) >= 9;
  };
  /* دو جور نامزد: صحنهٔ بی‌کارتی که جای خالی دارد، و — وقتی یکنواخت است — صحنهٔ «ایده»ای
     که کارتش تیتر یا نقل است و می‌تواند ساختاردار شود. ارتقا فقط با کارتِ ساختاردار. */
  var cands = d.scenes.filter(function (x) {
    if (!spaced(x)) return false;
    if (!x.ov) return true;
    return flat && lvOvWeak_(x.ov) && !story(x);
  });
  var newWant = Math.max(0, target - have);
  var upWant = flat ? Math.max(0, weakNow - weakMax) : 0;
  var newC = cands.filter(function (x) { return !x.ov; }).length;
  var upC = cands.length - newC;
  var want = Math.min(newWant, newC) + Math.min(upWant, upC);
  if (!cands.length || !want) {
    d.ovFillAt = nowStr_();
    d.ovFill = { asked: 0, got: 0, up: 0, why: 'صحنهٔ جاداری نماند', have: have, target: target, weak: weakNow };
    return out;
  }
  out.asked = want;
  var schema = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    n: { type: 'STRING' }, ov: { type: 'STRING' }, ovTitle: { type: 'STRING' },
    ovLines: { type: 'ARRAY', items: { type: 'STRING' } }, ovA: { type: 'STRING' }, ovB: { type: 'STRING' },
    ovKeys: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['n', 'ov'] } } }, required: ['items'] };
  d.ovFillTries = (Number(d.ovFillTries) || 0) + 1;
  var batch = Math.max(2, Number(CFG.LV_OV_FILL_BATCH) || 8);
  var maxCalls = Math.max(1, Number(CFG.LV_OV_FILL_CALLS) || 3);
  var got = 0, up = 0, calls = 0, answered = 0, rejected = 0;
  var byN = {};
  for (var c = 0; c < cands.length; c++) byN[String(cands[c].n)] = cands[c];
  /* دسته‌ها در طولِ درس پخش‌اند: هر دسته از جاهای مختلفِ درس برمی‌دارد، نه هشت صحنهٔ
     پشتِ‌هم — وگرنه اگر فقط یک دسته وقت شد، همهٔ کارت‌ها اولِ درس می‌نشستند. */
  var groups = [], nb = Math.ceil(cands.length / batch);
  for (var g = 0; g < nb; g++) groups.push([]);
  for (var q = 0; q < cands.length; q++) groups[q % nb].push(cands[q]);
  for (var gi = 0; gi < groups.length && calls < maxCalls && got + up < want; gi++) {
    if (calls && left && left() < 45000) { if (!out.why) out.why = 'وقت کم است (پس از ' + calls + ' پرسش)'; break; }
    var grp = groups[gi];
    var rest = want - got - up;
    var leftGroups = groups.length - gi;
    var ask = Math.max(1, Math.min(grp.length, Math.ceil(rest / Math.min(leftGroups, maxCalls - calls))));
    var L = [];
    L.push('این‌ها صحنه‌های یک ویدئوی آموزشیِ فارسی‌اند. روی تصویرِ هر صحنه یک کارتِ نوشتاریِ ' +
           'کوچک و تمیز می‌تواند بنشیند — مثلِ اینفوگرافیکِ ویدئوهای آموزشیِ حرفه‌ای: بیننده با یک ' +
           'نگاه چکیدهٔ همان لحظه را می‌گیرد. عنوانِ درس: «' + String((ctx && ctx.title) || '') + '».');
    L.push('');
    L.push('از صحنه‌های زیر **' + ask + '** تا را برگزین که واقعاً چیزی برای دیدن دارند (تعریف، تمایز، ' +
           'فهرست، روند، استدلالِ چندمرحله‌ای، پرسشِ کلیدی) و برای هر کدام یک کارت بنویس.');
    for (var i = 0; i < grp.length; i++) {
      var x = grp[i];
      var cur = x.ov ? ' (کارتِ فعلی: «' + String(x.ov.title || '').slice(0, 60) + '» — اگر برگزیدی، ' +
                       'به points یا steps یا compare تبدیلش کن)' : '';
      L.push('[' + x.n + ']' + (story(x) ? ' (روایت)' : '') + cur + ' ' + lvSceneClean_(x.text).slice(0, 420));
    }
    L.push('');
    L.push('نوعِ کارت (`ov`) — **بیشترشان points، steps یا compare**؛ headline و quote روی هم حداکثر یک‌سوم:');
    L.push('  points: `ovTitle` کوتاه و ۲ تا ۳ نکته (هر کدام ≤ ۵۰ نویسه) در `ovLines` — نکته‌هایی که **همان لحظه** گفته می‌شوند.');
    L.push('  steps: ۳ گامِ خیلی کوتاه (≤ ۲۴ نویسه) به ترتیب در `ovLines`، و `ovTitle` اختیاری — برای روند و زنجیرهٔ استدلال.');
    L.push('  compare: `ovA` و `ovB` نامِ دو طرف، و ۱ تا ۳ ردیف «برچسب: طرفِ اول | طرفِ دوم» در `ovLines`.');
    L.push('  headline: `ovTitle` (≤ ۳۰ نویسه) **و** یک سطرِ توضیح (≤ ۷۰ نویسه) در `ovLines` — هرگز تیترِ تنها.');
    L.push('  quote: `ovTitle` جملهٔ کلیدیِ همان لحظه (≤ ۹۰ نویسه)، و اختیاری گوینده/منبع در `ovLines`.');
    L.push('• صحنهٔ «(روایت)» فقط headline یا quote — قصه فهرست و جدول نیست.');
    L.push('• `ovKeys` — ۱ یا ۲ واژهٔ کلیدی که **عیناً** در همان کارت آمده.');
    L.push('• فارسیِ معیار، جمله‌بندیِ روشن و کامل، اعداد فارسی. تکرارِ واژه‌به‌واژهٔ روایت نه؛ چکیده.');
    L.push('• `n` همان شمارهٔ صحنه.');
    calls++;
    var r = null, err = '';
    try { r = geminiText_(L.join('\n'), schema, 6144, { exact: true }); }
    catch (e) { err = 'مدلِ متن جواب نداد: ' + String(e.message).slice(0, 100); }
    if (!err && (!r || !Array.isArray(r.items))) err = 'پاسخ کارت نداشت';
    if (err) { if (!out.why) out.why = err; break; }
    answered++;
    var gotHere = 0;
    for (var k = 0; k < r.items.length && got + up < want; k++) {
      var it = r.items[k] || {};
      var nn = String(it.n || '').replace(/[^0-9۰-۹]/g, '').replace(/[۰-۹]/g, function (z) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(z); });
      var sc = byN[String(Number(nn))];
      if (!sc || sc.__ovNew) continue;
      var o = lvSceneOvNorm_(it);
      if (!o) { rejected++; continue; }
      /* «هرگز تیترِ تنها» — در کد، نه فقط در پرامپت. */
      if (o.kind === 'headline' && !o.lines.length) { rejected++; continue; }
      if (story(sc) && lvOvStruct_(o) ) { rejected++; continue; }
      var upgrade = !!sc.ov;
      if (upgrade && !lvOvStruct_(o)) { rejected++; continue; }
      if (!upgrade && lvOvWeak_(o) && weakNow >= weakMax) { rejected++; continue; }
      o.side = sc.judge.space;
      if (upgrade) { weakNow--; up++; sc.ovUp = 1; } else { got++; if (lvOvWeak_(o)) weakNow++; }
      sc.ov = o; sc.ovFill = 1; sc.__ovNew = 1; gotHere++;
    }
    /* دسته‌ای که هیچ کارتِ پذیرفتنی نداد، یعنی دسته‌های بعد هم پولِ هدر است — همان «یک
       بار، نه تا کافی شود» (۸۵.۴-ب). */
    if (!gotHere) break;
  }
  for (var z2 = 0; z2 < d.scenes.length; z2++) delete d.scenes[z2].__ovNew;
  if (got || up) d.ovN = lvSceneOvTrim_(d.scenes, share);
  out.got = got; out.up = up;
  if (!out.why && !got && !up) out.why = answered ? 'مدل کارتِ پذیرفتنی نداد' + (rejected ? ' (' + rejected + ' رد شد)' : '') : '';
  /* شکستِ واقعی (مدل جواب نداد) یک بارِ دیگر در اجرای بعد؛ هر چیزِ دیگر ثبت و تمام. */
  if (answered || d.ovFillTries >= 2) {
    d.ovFillAt = nowStr_();
    d.ovFill = { asked: want, got: got, up: up, why: out.why, have: have, target: target, calls: calls,
                 weak: d.scenes.filter(function (x) { return lvOvWeak_(x.ov); }).length,
                 struct: d.scenes.filter(function (x) { return lvOvStruct_(x.ov); }).length,
                 rejected: rejected };
  }
  return out;
}

/** کارتِ «فقط نوشته»: تیتر یا نقل (۸.۶۰). */
function lvOvWeak_(ov) { return !!ov && (ov.kind === 'headline' || ov.kind === 'quote'); }
/** کارتِ ساختاردار: فهرست، گام، مقایسه — آنچه چکیدهٔ یک استدلال را می‌کشد. */
function lvOvStruct_(ov) { return !!ov && ['points', 'steps', 'compare'].indexOf(ov.kind) !== -1; }

/** دستورِ نهاییِ تصویر — انگلیسی، با قیدهای قطعی **در خودِ کد**. */
function lvSceneImgPrompt_(desc, art, cast, extra) {
  return String(art || LV_STYLES[0].art) + '.\n' +
    (cast ? 'Recurring characters, when they appear: ' + cast + '.\n' : '') +
    'Scene: ' + String(desc || '') + '\n' +
    'Widescreen 16:9 composition with one clear focal point and breathing room; ' +
    'part of a cohesive series of illustrations in exactly this style.\n' +
    'Absolutely no text, letters, words, numbers, captions, signs, labels, logos or ' +
    'watermarks anywhere in the image. No real or identifiable person, no real document.' +
    (extra ? '\n' + extra : '');
}

/** بهترین مدلِ تصویرِ زیرِ سقفِ قیمت — برای کاور، که یک بار ساخته می‌شود و همه می‌بینندش. */
function lvGenModelHq_() {
  var base = lvGenModel_();
  if (!base.id) return base;
  try {
    var max = Number(CFG.LV_GEN_HQ_MAX_USD) || 0.14, best = base.id, bp = lvGenPrice_(base.id);
    var models = listModels_();
    for (var i = 0; i < models.length; i++) {
      var id = String(models[i].name || '').replace(/^models\//, '');
      var ms = models[i].supportedGenerationMethods || models[i].supported_generation_methods || [];
      if (ms.indexOf('generateContent') === -1) continue;
      if (id.toLowerCase().indexOf('image') === -1) continue;
      var p = lvGenPrice_(id);
      if (p <= max && p > bp) { best = id; bp = p; }
    }
    return { id: best, why: best === base.id ? base.why : 'بهترینِ زیرِ ' + max + ' دلار' };
  } catch (e) { return base; }
}

/**
 * داوریِ تصویرها کنارِ متنِ خودشان. **نشنیدن تأیید نیست** (۷.۶۸): اگر مدل
 * جواب نداد، `judged` نادرست می‌مانَد و سدِ انتشار آن را می‌بیند.
 * @return {Object} n ⇒ {s, txt, why}
 */
function lvSceneJudge_(batch) {
  var out = {};
  if (!batch || !batch.length) return out;
  var parts = [{ text:
    'برای هر تصویر بگو چقدر **همان ایده — یا اگر متن ماجرا تعریف می‌کند، همان لحظهٔ ماجرا — را که متنِ کنارش می‌گوید** به بیننده نشان ' +
    'می‌دهد (۰ تا ۱۰؛ ۷ یعنی بیننده ربطش را فوراً می‌فهمد، ۳ یعنی فقط حال‌وهوای کلی). ' +
    'و جدا بگو آیا در تصویر **هر نوع نوشته، حرف یا عدد** دیده می‌شود (بله/خیر)، و آیا ' +
    'چهرهٔ شناختنیِ یک شخصِ واقعی دارد (بله/خیر). دلیل را در یک جملهٔ کوتاهِ فارسی بنویس. ' +
    'و در `space` بگو کدام بخشِ تصویر **خالی و آرام** است، طوری که نوشته‌ای کوتاه آن‌جا روی هیچ ' +
    'چهره، آدم یا شیءِ اصلی نیفتد: right یا left یا top — و اگر هیچ‌جا نیست، none. ' +
    'و اگر کنارِ تصویر «کانون» آمده، در `box` جای همان عنصر را در خودِ تصویر بده، به شکلِ ' +
    '«ymin,xmin,ymax,xmax» با اعدادِ ۰ تا ۱۰۰۰ از گوشهٔ بالا-چپ. اگر آن عنصر در تصویر روشن ' +
    'دیده نمی‌شود، خالی بگذار — حدس نزن.' }];
  for (var i = 0; i < batch.length; i++) {
    parts.push({ text: 'تصویرِ ' + batch[i].n + ' — متن: «' +
                       lvSceneClean_(batch[i].text).slice(0, 300) + '»' +
                       (batch[i].focus ? ' — کانون: ' + String(batch[i].focus).slice(0, 80) : '') });
    parts.push({ inlineData: { mimeType: batch[i].mime || 'image/png', data: batch[i].b64 } });
  }
  var schema = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: {
    type: 'OBJECT', properties: { n: { type: 'STRING' }, score: { type: 'STRING' },
      hasText: { type: 'STRING' }, realFace: { type: 'STRING' }, why: { type: 'STRING' },
      space: { type: 'STRING' }, box: { type: 'STRING' } },
    required: ['n', 'score'] } } }, required: ['items'] };
  /* «فکر»ِ مدل از همان سقفِ توکن می‌خورد؛ سقفِ کوچک بی بودجهٔ فکر یعنی پاسخِ
     خالی — و داوریِ خالی، «تأیید» نیست (۷.۶۸). `geminiShort_` (۸.۳۲) تنها
     تعریفِ این مرز است؛ نگارشِ ۸.۳۱ همین را این‌جا جدا نوشته بود. */
  var j = geminiShort_(parts, { min: 4096, think: 256, schema: schema });
  var txt = String(extractText_(j) || '');
  var r = null;
  try { r = JSON.parse(txt); } catch (eP) { r = repairJson_(txt, eP.message); }
  var items = (r && r.items) || [];
  for (var k = 0; k < items.length; k++) {
    var n = Number(String(items[k].n || '').replace(/[^0-9]/g, ''));
    if (!n) continue;
    var sc = Number(String(items[k].score || '').replace(/[^0-9.]/g, ''));
    var sp = String(items[k].space || '').trim().toLowerCase();
    out[String(n)] = { s: isNaN(sc) ? -1 : Math.max(0, Math.min(10, sc)),
                       txt: /بله|yes/i.test(String(items[k].hasText || '')),
                       face: /بله|yes/i.test(String(items[k].realFace || '')),
                       why: String(items[k].why || '').slice(0, 140),
                       space: ['right', 'left', 'top', 'none'].indexOf(sp) !== -1 ? sp : '',
                       box: lvSceneBox_(items[k].box) };
  }
  return out;
}

function lvSceneFile_() { return '_scenes.json'; }

function lvSceneRead_(folder) {
  try {
    var it = folder.getFilesByName(lvSceneFile_());
    if (!it.hasNext()) return null;
    var d = JSON.parse(it.next().getBlob().getDataAsString());
    return (d && Array.isArray(d.scenes)) ? d : null;
  } catch (e) { return null; }
}

function lvSceneWrite_(folder, d) {
  try {
    var body = JSON.stringify(d, null, 1);
    var it = folder.getFilesByName(lvSceneFile_());
    if (it.hasNext()) { it.next().setContent(body); return true; }
    folder.createFile(Utilities.newBlob(body, 'application/json', lvSceneFile_()));
    return true;
  } catch (e) { try { logLine_('`_scenes.json` نوشته نشد: ' + e.message); } catch (e2) {} return false; }
}

function lvSceneImgName_(n) {
  return 'صحنه ' + faDigitsOut_(('0' + String(n)).slice(-2)) + '.png';
}

/**
 * اجاره: دو اجرای هم‌زمان (تریگرِ دوساعته و اجرای یک‌بارهٔ ادامه) نباید یک
 * صحنه را دو بار بسازند — دو بار پول، و دو نویسنده روی یک `_scenes.json`.
 */
function lvSceneLease_(key, take) {
  try {
    var now = new Date().getTime();
    var cur = null;
    try { cur = JSON.parse(props_().getProperty(PK.LV_SCENE_LEASE) || 'null'); } catch (e0) { cur = null; }
    if (!take) {
      if (cur && String(cur.key) === String(key)) props_().deleteProperty(PK.LV_SCENE_LEASE);
      return true;
    }
    if (cur && String(cur.key) === String(key) && Number(cur.until) > now) return false;
    props_().setProperty(PK.LV_SCENE_LEASE, JSON.stringify({ key: String(key),
      until: now + Math.max(2, Number(CFG.LV_SCENE_LEASE_MIN) || 8) * 60000 }));
    return true;
  } catch (e) { return true; }
}

/**
 * ادامه در چند دقیقهٔ بعد، نه دو ساعت بعد. ~۴۰ تصویر در یک اجرای شش‌دقیقه‌ای
 * جا نمی‌شود؛ با تریگرِ دوساعته ویدئو عصر می‌رسید. سقفِ روزانه دارد تا یک
 * ردِ دائمی تریگر را تا ابد زنده نگه ندارد (`busyRetry_`، همان الگو).
 */
function lvSceneMoreArm_() {
  try {
    var today = String(nowStr_()).slice(0, 10);
    var max = Math.max(0, Number(CFG.LV_SCENE_MORE_MAX) || 30);
    var parts = String(props_().getProperty(PK.LV_SCENE_MORE) || '').split('|');
    var n = parts[0] === today ? (Number(parts[1]) || 0) : 0;
    if (n >= max) return false;
    clearRetryTriggers_('ytSceneMore');
    ScriptApp.newTrigger('ytSceneMore').timeBased()
      .after(Math.max(1, Number(CFG.LV_SCENE_MORE_MIN) || 3) * 60000).create();
    props_().setProperty(PK.LV_SCENE_MORE, today + '|' + (n + 1));
    return true;
  } catch (e) { return false; }
}

/** اجرای یک‌بارهٔ ادامهٔ صحنه‌ها — همان دورِ یوتیوب، زودتر. */
function ytSceneMore() {
  try { clearRetryTriggers_('ytSceneMore'); } catch (e) {}
  return ytPublishTick();
}

/* ══ کلیپِ آغازِ درس (۸.۵۱) ══
 * نقاشیِ صحنهٔ نخست با مدلِ ویدئوی گوگل چند ثانیه جان می‌گیرد. کارِ طولانی است
 * (از ۱۱ ثانیه تا ۶ دقیقه)، پس آغاز و پرسیدن جدا و در چند اجرا. همهٔ مرزها از
 * درس‌های پیشین است:
 *   • پول در **همان دفترِ ماه** و پیش از فراخوان سنجیده می‌شود؛ جا نبود ⇒ نه.
 *   • بایت‌ها باور می‌شوند، نه نشانی: «ftyp» در سرِ فایل (درسِ `musicFetch_`).
 *   • داوری کلیپ را **می‌بیند** (ورودیِ ویدئو)؛ نتوانست ببیند ⇒ نه (۷.۶۸).
 *   • نشد ⇒ همان نقاشیِ ثابت؛ ویدئوی درس هرگز منتظرِ کلیپ نمی‌مانَد (WAIT_MIN).
 */
function lvClipPrice_(model) {
  var s = String(model || '').toLowerCase(), list = CFG.LV_CLIP_PRICES || [], max = 0;
  for (var i = 0; i < list.length; i++) {
    var u = Number(list[i].usd) || 0;
    if (u > max) max = u;
    if (s.indexOf(String(list[i].match).toLowerCase()) !== -1) return u;
  }
  return max || 0.4;
}

function lvClipSec_() {
  var n = Number(CFG.LV_CLIP_SEC) || 8;
  return [4, 6, 8].indexOf(n) !== -1 ? n : 8;
}

function lvClipCost_(model) {
  return Math.round(lvClipPrice_(model || CFG.LV_CLIP_MODEL) * lvClipSec_() * 1000) / 1000;
}

function lvClipOn_() {
  return CFG.LV_CLIP_ON !== false && !!String(CFG.LV_CLIP_MODEL || '').trim();
}

/** دستورِ کلیپ: همان نقاشی، همان سبک، حرکتی که همان لحظه را بفهماند — و بی نوشته. */
function lvClipPrompt_(sc, art, cast, prev) {
  return 'Animate this exact illustration into a short, calm opening shot. Keep the same art style, ' +
         'colors, characters and composition as the image' + (art ? ' (' + String(art).slice(0, 240) + ')' : '') + '. ' +
         'Add gentle, meaningful motion that shows: ' + String(sc.scene || '').slice(0, 500) + '. ' +
         (cast ? 'Characters stay exactly as described: ' + String(cast).slice(0, 200) + '. ' : '') +
         'Slow, smooth camera; no cuts; no new characters; no text, letters, numbers, captions, ' +
         'subtitles, logos or watermarks anywhere.' +
         (prev ? ' A previous attempt was rejected because: ' + String(prev).slice(0, 200) + ' — avoid that.' : '');
}

function lvClipUrl_(path) {
  return 'https://generativelanguage.googleapis.com/v1beta/' + path +
         (path.indexOf('?') === -1 ? '?' : '&') + 'key=' + encodeURIComponent(apiKey_());
}

/** آغازِ ساخت. @return {{op:string, err:string}} */
function lvClipStart_(model, blob, prompt) {
  var b64 = Utilities.base64Encode(blob.getBytes());
  var mime = blob.getContentType() || 'image/png';
  var params = { aspectRatio: '16:9', resolution: String(CFG.LV_CLIP_RES || '1080p'),
                 durationSeconds: lvClipSec_(), personGeneration: 'allow_adult',
                 negativePrompt: 'text, letters, captions, subtitles, logo, watermark, distorted face, extra limbs, scene cut' };
  var shapes = [{ inlineData: { mimeType: mime, data: b64 } },
                { bytesBase64Encoded: b64, mimeType: mime }];      // شکلِ پیشینِ همان API
  var last = '', si = 0, adj = [];
  /* این شکلِ درخواست از مستندِ رسمی است و پیش از نخستین درسِ واقعی هرگز با API
     آزموده نشده. پس ردِ ۴۰۰ که **یک پارامترِ معیّن** را نام می‌برد، همان یکی را نرم
     می‌کند و دوباره می‌پرسد (هر پارامتر یک بار)، به‌جای اینکه کلیپِ درس را به
     نقاشیِ ساکن بیندازد. ردِ مدل، سهمیه یا هر چیزِ دیگر ⇒ بی تکرار، با علت. */
  for (var k = 0; k < 6; k++) {
    try {
      var res = UrlFetchApp.fetch(lvClipUrl_('models/' + model + ':predictLongRunning'), {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ instances: [{ prompt: prompt, image: shapes[si] }], parameters: params }) });
      var code = res.getResponseCode(), txt = res.getContentText();
      if (code === 200) {
        var j = JSON.parse(txt);
        if (j && j.name) return { op: String(j.name), err: '', adj: adj };
        last = 'پاسخ نامِ کار نداشت: ' + txt.slice(0, 160);
        break;
      }
      last = 'HTTP ' + code + ': ' + txt.slice(0, 220);
      if (code !== 400) break;
      if (/resolution|1080/i.test(txt) && params.resolution !== '720p' && adj.indexOf('resolution') === -1) {
        params.resolution = '720p'; adj.push('resolution'); continue;
      }
      if (/personGeneration/i.test(txt) && params.personGeneration && adj.indexOf('personGeneration') === -1) {
        delete params.personGeneration; adj.push('personGeneration'); continue;
      }
      if (/negativePrompt/i.test(txt) && params.negativePrompt && adj.indexOf('negativePrompt') === -1) {
        delete params.negativePrompt; adj.push('negativePrompt'); continue;
      }
      /* فقط ردِ **شکلِ** تصویر شکلِ دیگر را می‌آزماید. */
      if (si === 0 && /image|inlineData|bytesBase64/i.test(txt)) { si = 1; adj.push('imageShape'); continue; }
      break;
    } catch (e) { last = String(e.message).slice(0, 200); break; }
  }
  return { op: '', err: last, adj: adj };
}

/** پرسیدنِ کار. @return {{done:boolean, uri:string, err:string}} */
function lvClipPoll_(op) {
  try {
    var res = UrlFetchApp.fetch(lvClipUrl_(op), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      return { done: false, uri: '', err: 'HTTP ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 160) };
    }
    var j = JSON.parse(res.getContentText());
    if (!j.done) return { done: false, uri: '', err: '' };
    if (j.error) return { done: true, uri: '', err: String(j.error.message || JSON.stringify(j.error)).slice(0, 200) };
    var gv = (j.response && j.response.generateVideoResponse) || {};
    var smp = gv.generatedSamples || [];
    var uri = smp.length && smp[0].video ? String(smp[0].video.uri || '') : '';
    if (!uri) {
      var why = (gv.raiMediaFilteredReasons || []).join(' · ') || 'پاسخ ویدئو نداشت';
      return { done: true, uri: '', err: why.slice(0, 200) };
    }
    return { done: true, uri: uri, err: '' };
  } catch (e) { return { done: false, uri: '', err: String(e.message).slice(0, 160) }; }
}

/** آیا این بایت‌ها MP4 است؟ نشانی و نوعِ اعلام‌شده دروغ می‌گویند؛ «ftyp» نه. */
function lvClipIsMp4_(bytes) {
  if (!bytes || bytes.length < 12) return false;
  var s = '';
  for (var i = 4; i < 8; i++) s += String.fromCharCode(bytes[i] & 0xFF);
  return s === 'ftyp';
}

/** داوری که **خودِ کلیپ** را می‌بیند. نتوانست ببیند ⇒ ok=false با علت (۷.۶۸). */
function lvClipJudge_(blob, sc) {
  var bytes = blob.getBytes();
  if (bytes.length > 14 * 1024 * 1024) return { ok: false, seen: false, why: 'کلیپ برای داوری بزرگ است' };
  var parts = [{ text:
    'این کلیپِ کوتاهِ آغازِ یک ویدئوی آموزشی است و از روی یک نقاشی ساخته شده. متنِ همان لحظه: «' +
    lvSceneClean_(sc.text || '').slice(0, 300) + '». بگو: آیا در هیچ قابی **نوشته، حرف، عدد یا لوگو** ' +
    'هست (بله/خیر)؟ آیا چهره یا بدنی **کج و معوج یا ناگهان عوض‌شده** هست (بله/خیر)؟ و آیا حرکت آرام ' +
    'و هم‌خوان با همان لحظه است (بله/خیر)؟ دلیل را در یک جملهٔ کوتاهِ فارسی بنویس.' },
    { inlineData: { mimeType: 'video/mp4', data: Utilities.base64Encode(bytes) } }];
  var schema = { type: 'OBJECT', properties: { hasText: { type: 'STRING' }, deformed: { type: 'STRING' },
                 fits: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['hasText', 'deformed', 'fits'] };
  var r = null;
  try {
    var j = geminiShort_(parts, { min: 2048, think: 256, schema: schema });
    var txt = String(extractText_(j) || '');
    try { r = JSON.parse(txt); } catch (eP) { r = repairJson_(txt, eP.message); }
    if (!r) return { ok: false, seen: false, why: 'داوری جواب نداد' + (j && j._why ? ' (' + j._why + ')' : '') };
  } catch (e) { return { ok: false, seen: false, why: 'داوری نشد: ' + String(e.message).slice(0, 120) }; }
  var yes = function (v) { return /بله|yes/i.test(String(v || '')); };
  var bad = [];
  if (yes(r.hasText)) bad.push('نوشته در کلیپ');
  if (yes(r.deformed)) bad.push('چهره یا بدنِ کج');
  if (!yes(r.fits)) bad.push('با همان لحظه نمی‌خوانَد');
  return { ok: !bad.length, seen: true, why: (bad.length ? bad.join('، ') + ' — ' : '') + String(r.why || '').slice(0, 140) };
}

/**
 * آیا متنِ این صحنه فقط تاریخ و روزِ برنامه است؟ (۸.۵۶)
 * «درس‌نامه، سه‌شنبه، چهاردهم مهر هزار و چهارصد و پنج، برابر با ششم اکتبر…» — نامِ روز
 * **و** (نامِ ماه یا «برابر با») در متنی کوتاه. صحنه‌ای که چیزی جز این ندارد، جای
 * کلیپ نیست.
 */
function lvSceneIsCalendar_(text) {
  var t = String(text || '').replace(/[\u200c]/g, ' ');
  if (t.length > 260) return false;
  var day = /(?:یک|دو|سه|چهار|پنج)\s*شنبه|شنبه|جمعه|آدینه/.test(t);
  var month = /فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی\s|بهمن|اسفند|ژانویه|فوریه|مارس|آوریل|مه\s|ژوئن|ژوئیه|اوت|سپتامبر|اکتبر|نوامبر|دسامبر|برابر\s*با/.test(t);
  return day && month;
}

/**
 * کلیپ روی کدام صحنه بنشیند؟ (۸.۵۶)
 *
 * ۶ اکتبر، درسِ ۴۰: «اون چند ثانیه متحرک هم همون چند ثانیه‌ای بود که داشت تازه تاریخ
 * و روزِ پادکست می‌گفت». کلیپ همیشه روی `scenes[0]` بود، و صحنهٔ ۰ آن روز فقط یک جمله
 * بود: تاریخ. نقاشی‌اش (میزی با چراغ) را داور خودش ۴ از ۱۰ داده بود با «ربطِ مستقیمی به
 * متنِ تقویمی ندارد». پس گران‌ترین تصویرِ درس — ۰٫۶۴ دلار، تنها لحظهٔ متحرک — روی
 * کم‌معناترین لحظه‌اش رفت.
 *
 * حالا کلیپ مالِ **نخستین لحظهٔ واقعیِ درس** است: صحنه‌ای که فقط تاریخ نیست، آن‌قدر
 * بلند است که کلیپ و میان‌محوِ برگشت در آن جا شوند، و تصویرش در داوری دست‌کم
 * `LV_CLIP_MIN_SCORE` گرفته (کلیپِ تصویرِ بی‌ربط، حرکتِ بی‌ربط است). از میانِ
 * `LV_CLIP_WINDOW` صحنهٔ نخست؛ هیچ‌کدام به کف نرسید ⇒ بهترینِ همان‌ها. صحنه‌ای که هنوز
 * تصویر یا داوری ندارد ⇒ صبر (`wait`) — انتخاب یک بار و پیش از خرج است و در `clip.n`
 * می‌مانَد، پس ازسرگیری همان را می‌خوانَد.
 * @return {{i:number, wait:boolean, why:string}}
 */
function lvClipScene_(d) {
  var sc = (d && d.scenes) || [];
  var need = lvClipSec_() + 3.5;            // کلیپ + میان‌محو + نفسی پیش از برش
  var win = Math.max(1, Number(CFG.LV_CLIP_WINDOW) || 4);
  var minS = Number(CFG.LV_CLIP_MIN_SCORE) || 5;
  var judgeOff = CFG.LV_SCENE_JUDGE === false;
  var cands = [], skipped = [];
  for (var i = 0; i < sc.length && cands.length < win; i++) {
    var x = sc[i];
    if (lvSceneIsCalendar_(x.text)) { skipped.push(x.n + ': فقط تاریخ'); continue; }
    /* زمانِ نامعلوم «کوتاه» نیست — نقشه همیشه t0/t1 دارد؛ این فقط نقشهٔ ناقص را نمی‌اندازد. */
    if (isFinite(Number(x.t1)) && x.t1 !== '' && x.t1 !== undefined &&
        (Number(x.t1) || 0) - (Number(x.t0) || 0) < need) { skipped.push(x.n + ': کوتاه'); continue; }
    cands.push(i);
  }
  if (!cands.length) return { i: -1, wait: false, why: 'در ' + win + ' صحنهٔ نخست جای کلیپ نبود (' + skipped.join('، ') + ')' };
  var best = -1, bs = -99;
  for (var k = 0; k < cands.length; k++) {
    var y = sc[cands[k]];
    if (!y.fileId) {
      if ((Number(y.tries) || 0) >= 2 || d.capHit) continue;        // هرگز تصویر نمی‌گیرد
      return { i: -1, wait: true, why: 'صحنهٔ ' + y.n + ' هنوز تصویر ندارد' };
    }
    if (!judgeOff && !y.judge && !d.judgeWhy) return { i: -1, wait: true, why: 'صحنهٔ ' + y.n + ' هنوز داوری نشده' };
    var s0 = (y.judge && y.judge.s >= 0 && !y.judge.txt && !y.judge.face) ? Number(y.judge.s) : (judgeOff || d.judgeWhy ? minS : -1);
    if (s0 >= minS) return { i: cands[k], wait: false, why: '' };
    if (s0 > bs) { bs = s0; best = cands[k]; }
  }
  if (best < 0) return { i: -1, wait: false, why: 'هیچ‌کدام از صحنه‌های نخست تصویر نگرفت' };
  return { i: best, wait: false, why: 'هیچ صحنه‌ای به کفِ داوری نرسید؛ بهترینِ آن‌ها' };
}

/**
 * یک گام از ماشینِ حالتِ کلیپ (۸.۵۱). هر بار هر اجرایی صدایش بزند، فقط همان
 * کاری را می‌کند که نوبتش است. حالت‌ها: '' ⇒ wait ⇒ judge ⇒ ok | fail | off.
 */
function lvClipStep_(d, imgFolder, left, key, tryMax) {
  if (!d || !d.scenes || !d.scenes.length) return;
  /* نقشه‌ای که پیش از ۸.۵۱ ساخته شده `clip` ندارد و کلیپ نمی‌گیرد: خرجِ تازه روی
     درسی که دیگر در راهِ انتشار است، بی آنکه کسی خواسته باشد، نه. */
  var c = d.clip;
  if (!c || ['ok', 'fail', 'off'].indexOf(c.state) !== -1) return;
  if (!lvClipOn_()) { c.state = 'off'; c.why = 'کلیپِ آغاز خاموش است'; return; }
  var model = String(CFG.LV_CLIP_MODEL).trim();
  /* کلیپ مالِ صحنه‌ای است که یک بار انتخاب و در `clip.n` ثبت شد (۸.۵۶). نقشه‌ای که پیش
     از ۸.۵۶ کلیپش را آغاز کرده `n` ندارد و همان صحنهٔ نخست می‌مانَد. */
  var sc = null;
  if (c.n) for (var cz = 0; cz < d.scenes.length; cz++) if (Number(d.scenes[cz].n) === Number(c.n)) sc = d.scenes[cz];
  if (!sc && c.state !== '') sc = d.scenes[0];
  var waitMs = Math.max(5, Number(CFG.LV_CLIP_WAIT_MIN) || 45) * 60000;
  if (c.first && new Date().getTime() - Number(c.first) > waitMs) {
    c.state = 'fail'; c.why = (c.why ? c.why + ' — ' : '') + 'در ' + (Number(CFG.LV_CLIP_WAIT_MIN) || 45) +
                              ' دقیقه نرسید؛ همان نقاشیِ ثابت';
    lvClipNote_(key, c, model); return;
  }
  if (c.state === '') {
    /* فقط از تصویرِ **داوری‌شده**: داوری ممکن است آن را از نو بسازد، و کلیپِ تصویرِ
       دورریخته پولِ دورریخته است. انتخاب با `lvClipScene_` است (نخستین لحظهٔ واقعیِ درس،
       نه تاریخ)؛ صحنه‌ای که هرگز تصویر نگیرد کلیپ را «نشد» می‌کند، وگرنه ویدئوی درس تا
       ابد منتظرِ آن می‌ماند. */
    if (!sc) {
      var pick = lvClipScene_(d);
      if (pick.wait) return;
      if (pick.i < 0) { c.state = 'fail'; c.why = pick.why; lvClipNote_(key, c, model); return; }
      sc = d.scenes[pick.i];
      c.n = sc.n;
      if (pick.why) c.pickWhy = pick.why;
    }
    if (!sc.fileId) {
      if ((Number(sc.tries) || 0) >= (Number(tryMax) || 2) || d.capHit) {
        c.state = 'fail'; c.why = 'صحنهٔ ' + sc.n + ' تصویر ندارد';
        lvClipNote_(key, c, model);
      }
      return;
    }
    if (!(CFG.LV_SCENE_JUDGE === false || sc.judge || d.judgeWhy)) return;
    if (left() < 15000) return;
    var cost = lvClipCost_(model);
    var cap = Math.max(0, Number(CFG.LV_GEN_USD_MONTH) || 0);
    if (cap - lvGenSpend_().usd < cost) {
      c.state = 'off'; c.why = 'سقفِ ماهانه برای کلیپ (~' + cost.toFixed(2) + ' دلار) جا ندارد';
      lvClipNote_(key, c, model); return;
    }
    var blob;
    try { blob = DriveApp.getFileById(sc.fileId).getBlob(); }
    catch (eB) { c.why = 'تصویرِ صحنهٔ ' + sc.n + ' خوانده نشد: ' + eB.message; return; }
    c.tries = (Number(c.tries) || 0) + 1;
    if (!c.first) c.first = new Date().getTime();
    var st;
    try { st = lvClipStart_(model, blob, lvClipPrompt_(sc, d.art, d.cast, c.judge)); }
    catch (eS) { st = { op: '', err: 'آغاز نشد: ' + String(eS.message).slice(0, 140) }; }
    if (!st.op) {
      c.why = st.err;
      if (c.tries >= (Number(CFG.LV_CLIP_TRY_MAX) || 2)) { c.state = 'fail'; lvClipNote_(key, c, model); }
      return;
    }
    /* پول پیش از رسیدن شمرده می‌شود: کارِ آغازشده خرج دارد؛ کم‌شماری یعنی رد شدن از سقف. */
    lvGenSpendAdd_(cost, true);
    d.spent = Math.round(((Number(d.spent) || 0) + cost) * 1000) / 1000;
    c.usd = Math.round(((Number(c.usd) || 0) + cost) * 1000) / 1000;
    c.op = st.op; c.state = 'wait'; c.at = nowStr_(); c.why = ''; c.model = model;
    if (st.adj && st.adj.length) c.adj = st.adj;   // چه چیزی نرم شد تا API پذیرفت — شاهد برای نسخهٔ بعد
    c.img = sc.fileId;                       // کلیپ مالِ همین تصویر است، نه تصویرِ بعدی
    return;
  }
  if (c.state === 'wait') {
    var p = lvClipPoll_(c.op);
    if (!p.done) { if (p.err) c.why = p.err; return; }
    if (!p.uri) {
      c.why = p.err; c.op = '';
      c.state = c.tries >= (Number(CFG.LV_CLIP_TRY_MAX) || 2) ? 'fail' : '';
      if (c.state === 'fail') lvClipNote_(key, c, model);
      return;
    }
    try {
      var res = UrlFetchApp.fetch(p.uri + (p.uri.indexOf('?') === -1 ? '?' : '&') + 'key=' +
                                  encodeURIComponent(apiKey_()), { muteHttpExceptions: true, followRedirects: true });
      var by = res.getResponseCode() === 200 ? res.getBlob() : null;
      if (!by || !lvClipIsMp4_(by.getBytes())) {
        c.why = 'بایت‌های دریافتی ویدئو نبود (HTTP ' + res.getResponseCode() + ')'; c.op = '';
        c.state = c.tries >= (Number(CFG.LV_CLIP_TRY_MAX) || 2) ? 'fail' : '';
        if (c.state === 'fail') lvClipNote_(key, c, model);
        return;
      }
      var nm = 'صحنه ' + faDigitsOut_(('0' + (Number(c.n) || 1)).slice(-2)) + ' — کلیپ.mp4';
      var old = imgFolder.getFilesByName(nm);
      while (old.hasNext()) old.next().setTrashed(true);
      c.fileId = imgFolder.createFile(by.setName(nm).setContentType('video/mp4')).getId();
      c.state = 'judge'; c.op = '';
    } catch (eD) { c.why = 'کلیپ برداشته نشد: ' + String(eD.message).slice(0, 120); }
    return;
  }
  if (c.state === 'judge') {
    if (left() < 25000) return;
    var v;
    try { v = lvClipJudge_(DriveApp.getFileById(c.fileId).getBlob(), sc); }
    catch (eJ) { v = { ok: false, seen: false, why: 'کلیپ خوانده نشد: ' + eJ.message }; }
    c.judge = v.why;
    if (v.ok) { c.state = 'ok'; c.sec = lvClipSec_(); lvClipNote_(key, c, model); return; }
    if (!v.seen) {                                   // ندید ⇒ یک بار دیگر، بعد نه
      c.unseen = (Number(c.unseen) || 0) + 1;
      if (c.unseen < 3) return;
    }
    c.why = v.why;
    if (c.tries < (Number(CFG.LV_CLIP_TRY_MAX) || 2) && v.seen) { c.state = ''; return; }
    c.state = 'fail'; lvClipNote_(key, c, model);
  }
}

/**
 * کلیپ روی ردیفِ رندر: **همان صحنه‌ای که برایش انتخاب شد** (`clip.n`، ۸.۵۶) و فقط
 * اگر تصویرش همان باشد که کلیپ از آن ساخته شد. نقشهٔ پیش از ۸.۵۶ (`n` ندارد) ⇒ صحنهٔ نخست.
 * @return {number} شمارهٔ صحنه‌ای که کلیپ گرفت، یا ۰
 */
function lvClipAttach_(items, c) {
  if (!items || !items.length || !c || c.state !== 'ok' || !c.fileId) return 0;
  for (var i = 0; i < items.length; i++) {
    var on = c.n ? Number(items[i].n) === Number(c.n) : i === 0;
    if (!on) continue;
    if (items[i].fileId !== c.img) return 0;
    items[i].clip = { fileId: c.fileId, sec: Number(c.sec) || lvClipSec_() };
    return Number(items[i].n) || 1;
  }
  return 0;
}

/** آخرین کلیپ، برای خطِ روزانه — از Properties، بی خواندنِ درایو (۷.۶۳). */
function lvClipNote_(key, c, model) {
  try {
    /* شمارِ درس‌های **پیاپی** که کلیپشان نشد (۸.۵۲): «نشد» بالا، «ساخته شد» صفر، و
       «خاموش» (سقف یا تصمیم) دست نمی‌زند — بی‌پولی شکستِ ساز‌وکار نیست، گفته می‌شود.
       همان درس دو بار شمرده نمی‌شود. */
    var prev = null;
    try { prev = JSON.parse(props_().getProperty(PK.LV_CLIP_LAST) || 'null'); } catch (eP) { prev = null; }
    var fails = Number(prev && prev.fails) || 0;
    var same = prev && prev.key === key && prev.state === c.state;
    if (!same) {
      if (c.state === 'fail') fails++;
      else if (c.state === 'ok') fails = 0;
    }
    var why = String(c.why || c.judge || '').slice(0, 200);
    /* علتِ آخرین «نشد» جدا می‌مانَد: درسِ «خاموش»ِ بعدی (سقف) آخرین خط را عوض می‌کند،
       و یافته‌ای که آن‌وقت «سقف» را علتِ شکست بگوید، کد را سرِ راهِ غلط می‌فرستد. */
    var fail = c.state === 'fail' ? { key: key, at: nowStr_(), why: why, adj: c.adj || [] }
             : (c.state === 'ok' ? null : (prev && prev.fail) || null);
    props_().setProperty(PK.LV_CLIP_LAST, JSON.stringify({ key: key, at: nowStr_(), state: c.state,
      why: why, model: model, tries: c.tries || 0, n: Number(c.n) || 0,
      usd: Number(c.usd) || 0, adj: c.adj || [], fails: fails, fail: fail }));
  } catch (e) {}
}

/**
 * حرکتِ کانون‌دارِ یک درس، برای خطِ روزانه و پیگیری (۸.۵۲). فقط نقشه‌ای که با ۸.۵۱ به بعد
 * ساخته شده شمرده می‌شود (`clip` در آن هست): نقشه‌های پیش از آن کانون نپرسیده‌اند و
 * «بی‌حرکت»شان عیب نیست. هر نیمه جدا شمرده می‌شود — کانون از توصیف‌گر، حرکت، جای کانون از
 * داور — تا «نشد» بگوید **کدام** نیمه نشد.
 */
function lvMotionNote_(key, d, items) {
  if (!d || !d.scenes || !Object.prototype.hasOwnProperty.call(d, 'clip')) return null;
  try {
    var prev = null;
    try { prev = JSON.parse(props_().getProperty(PK.LV_MOTION_LAST) || 'null'); } catch (eP) { prev = null; }
    var rec = { key: key, at: nowStr_(), n: d.scenes.length,
                focus: d.scenes.filter(function (x) { return !!x.focus; }).length,
                moves: d.scenes.filter(function (x) { return x.move === 'push' || x.move === 'reveal' || x.move === 'travel'; }).length,
                box: d.scenes.filter(function (x) { return x.judge && x.judge.box; }).length,
                mv: (items || []).filter(function (x) { return !!x.mv; }).length,
                zero: Number(prev && prev.zero) || 0,
                off: d.focusOn === false ? String(d.motion || 'آرام') : '' };
    if (!prev || prev.key !== key) {
      /* درسی که تخته‌اش «آرام» گفته، حرکتِ کانون‌دار نمی‌خواهد (۸.۵۴): بی‌حرکتی‌اش
         انتخاب است، نه شکست — شمار را نه بالا می‌برد نه صفر می‌کند. */
      if (rec.off) rec.zero = Number(prev && prev.zero) || 0;
      else if (rec.mv > 0) rec.zero = 0;
      else if (rec.n >= 8 && CFG.LV_MOTION_ON !== false) rec.zero++;
    } else {
      rec.zero = Number(prev.zero) || 0;           // همان درس، دوباره: شمار عوض نمی‌شود
    }
    props_().setProperty(PK.LV_MOTION_LAST, JSON.stringify(rec));
    return rec;
  } catch (e) { return null; }
}

/** خطِ روزانهٔ حرکتِ کانون‌دار — از Properties، بی درایو (۷.۶۳). */
/**
 * ══ کارت‌های نوشتاری — آنچه **روی ویدئو نشست**، نه آنچه خواستیم (۸.۵۶) ══
 * درسِ ۴۰: ۸ کارت خواسته شد، ۷ نشست — روی ۴۰ صحنه، و او دید «سه چهار مورد در بیست
 * دقیقه». هیچ سنجه‌ای کف نداشت. شمار از نقشهٔ رانر (`docs/renders.json` → `ov`) خوانده
 * می‌شود — همان که از خودِ ساخت آمده — یک بار برای هر درس. «نحیف» = درسی با دست‌کم ده
 * صحنه که کمتر از `LV_OV_WATCH_FRAC` صحنه‌هایش کارت گرفت (و نه کمتر از سه).
 */
function lvOvNote_(key, rme, nature) {
  if (!rme || String(rme.mode || '') !== 'scenes') return null;
  var ov = rme.ov || { asked: 0, placed: 0, busy: 0, kinds: {} };
  var sc = Number(rme.scenes) || 0;
  var need = Math.max(3, Math.ceil(sc * (Number(CFG.LV_OV_WATCH_FRAC) || 0.2)));
  var placed = Number(ov.placed) || 0;
  var thin = sc >= 10 && placed < need;
  /* «یکنواخت» (۸.۶۰): درسی که کارت‌هایش تقریباً همه تیتر و نقل‌اند — درسِ ۴۰: ۸ کارت،
     ۶ تیتر و ۲ نقل، صفر فهرست/گام/مقایسه. شمار کافی هم باشد، این «فقط نوشته» است.
     قصه بیرون است: روایت فهرست نمی‌گیرد. */
  var kinds = ov.kinds || {};
  var struct = (Number(kinds.points) || 0) + (Number(kinds.steps) || 0) + (Number(kinds.compare) || 0);
  var flat = String(nature || '') !== 'داستان' && placed >= 4 && struct * 3 < placed;
  var P = props_(), prev = null;
  try { prev = JSON.parse(P.getProperty(PK.LV_OV_LAST) || 'null'); } catch (e) { prev = null; }
  if (prev && prev.key === key) return prev;                  // همان درس دو بار شمرده نمی‌شود
  var rec = { key: key, at: nowStr_(), scenes: sc, asked: Number(ov.asked) || 0, placed: placed,
              busy: Number(ov.busy) || 0, kinds: kinds, need: need, thin: thin,
              struct: struct, flat: flat, nature: String(nature || ''),
              n: (thin || flat) ? ((prev && Number(prev.n)) || 0) + 1 : 0 };
  try { P.setProperty(PK.LV_OV_LAST, JSON.stringify(rec)); } catch (e2) {}
  return rec;
}

/** خطِ روزانه و سدِ تکرار برای کارت‌ها — از شاهدِ `lvOvNote_`، بی خواندنِ درایو (۷.۶۳). */
function lvOvStatus_() {
  var r = null;
  try { r = JSON.parse(props_().getProperty(PK.LV_OV_LAST) || 'null'); } catch (e) { r = null; }
  if (!r) return { ok: true, line: '🪧 کارت‌های نوشتاری: هنوز ویدئوی صحنه‌ای‌ای پس از ۸.۵۶ منتشر نشده.', last: null };
  var kinds = Object.keys(r.kinds || {}).map(function (k) { return k + ' ' + faDigitsOut_(String(r.kinds[k])); }).join('، ');
  var line = '🪧 کارت‌های نوشتاری: آخرین درس (' + r.key + ') ' + faDigitsOut_(String(r.placed)) + ' کارت روی ' +
             faDigitsOut_(String(r.scenes)) + ' صحنه نشست (خواسته ' + faDigitsOut_(String(r.asked)) +
             (r.busy ? '، بی‌جا ' + faDigitsOut_(String(r.busy)) : '') + ')' + (kinds ? ' · ' + kinds : '') +
             (r.thin ? ' · ❌ کمتر از کفِ ' + faDigitsOut_(String(r.need)) : '') +
             (r.flat ? ' · ⚠️ یکنواخت: فقط ' + faDigitsOut_(String(r.struct || 0)) +
                       ' فهرست/گام/مقایسه — بقیه تیتر و نقل' : '');
  var ok = !(Number(r.n) >= Math.max(1, Number(CFG.LV_OV_THIN_FIND) || 2));
  if (!ok) line += ' · ❌ ' + faDigitsOut_(String(r.n)) + ' درسِ پیاپی نحیف یا یکنواخت.';
  return { ok: ok, line: line, last: r };
}

/**
 * ══ درسی که از صحنهٔ مصور به کارتِ ساده افتاد (۸.۶۰) ══
 * «مرورِ بزرگِ» درس‌نامه (special:63) با کارتِ اسلایدز ساخته شد، نه صحنه — و علتش
 * فقط در سیاههٔ درونِ هاب بود: جایی که ناظر و سشنِ کد روزی که درایو در دسترس نیست
 * نمی‌بینند، و صاحبِ برنامه هرگز. ویدئوی منتشرشده همان نسخهٔ ضعیف‌تر می‌مانَد، پس هر
 * افتادن یک بار و با علت ثبت می‌شود — همان درس دو بار شمرده نمی‌شود — و ساختِ صحنه‌ایِ
 * بعدی شمار را صفر می‌کند. فقط Properties (۷.۶۳).
 * @param {string} why — خالی یعنی «این درس صحنه گرفت»
 */
function lvSceneFbNote_(key, why) {
  var P = props_(), prev = null;
  try { prev = JSON.parse(P.getProperty(PK.LV_SCENE_FB) || 'null'); } catch (e) { prev = null; }
  /* دو قفل برای «همان درس یک بار» (۷.۴۱): این خط، و شمارِ پایین که فقط با «درسِ دیگر» بالا
     می‌رود. شکستنِ یکی سبز می‌مانَد؛ هر دو با هم ۷۱.۹-ب را سرخ می‌کنند. */
  if (prev && prev.key === key && !!prev.fb === !!why) return prev;
  var rec = why
    ? { key: key, at: nowStr_(), fb: true, why: String(why).slice(0, 300),
        n: (prev && prev.fb && prev.key !== key ? Number(prev.n) || 0 : 0) + 1 }
    : { key: key, at: nowStr_(), fb: false, why: '', n: 0 };
  try { P.setProperty(PK.LV_SCENE_FB, JSON.stringify(rec)); } catch (e2) {}
  return rec;
}

/** خطِ روزانه و سدِ «افتادن به کارت» — بی درایو. سالم ⇒ خطی نیست (🎬 و 🪧 همان را می‌گویند). */
function lvSceneFbStatus_() {
  var r = null;
  try { r = JSON.parse(props_().getProperty(PK.LV_SCENE_FB) || 'null'); } catch (e) { r = null; }
  if (!r || !r.fb) return { ok: true, line: '', last: r };
  return { ok: false, last: r,
           line: '🖼 ❌ آخرین درس (' + r.key + ') به‌جای صحنهٔ مصور با کارتِ ساده ساخته شد — علت: ' + r.why +
                 (Number(r.n) > 1 ? ' · ' + faDigitsOut_(String(r.n)) + ' درسِ پیاپی' : '') + '.' };
}

function lvMotionStatus_() {
  var out = { on: CFG.LV_MOTION_ON !== false, last: null, zero: 0, ok: true, line: '' };
  try {
    try { out.last = JSON.parse(props_().getProperty(PK.LV_MOTION_LAST) || 'null'); } catch (eL) { out.last = null; }
    out.zero = Number(out.last && out.last.zero) || 0;
    var find = Math.max(1, Number(CFG.LV_MOTION_ZERO_FIND) || 2);
    out.ok = !(out.on && out.zero >= find);
    if (!out.on) { out.line = '🎥 حرکتِ کانون‌دار: خاموش.'; return out; }
    var L = out.last;
    if (L && L.off) {
      out.line = '🎥 حرکتِ کانون‌دار: آخرین درس (' + L.key + ') به انتخابِ تخته («' + L.off +
                 '») فقط حرکتِ آرام گرفت.';
      return out;
    }
    out.line = '🎥 حرکتِ کانون‌دار: ' + (L
      ? 'آخرین درس (' + L.key + ') ' + faDigitsOut_(String(L.mv)) + ' از ' + faDigitsOut_(String(L.n)) +
        ' صحنه — کانون از توصیف‌گر ' + faDigitsOut_(String(L.focus)) + '، حرکتِ push/reveal/travel ' +
        faDigitsOut_(String(L.moves)) + '، جای کانون از داور ' + faDigitsOut_(String(L.box)) +
        (out.ok ? '' : ' · ❌ ' + faDigitsOut_(String(out.zero)) + ' درسِ پیاپی بی هیچ حرکتِ کانون‌دار')
      : 'هنوز هیچ درسی با نقشهٔ ۸.۵۱ ساخته نشده') + '.';
  } catch (e) { out.line = ''; }
  return out;
}

/** آیا کارِ کلیپ تمام است (هر جوری)؟ ویدئو فقط همین را منتظر می‌مانَد. */
function lvClipSettled_(d) {
  var c = d && d.clip;
  if (!c) return true;                       // نقشهٔ بی‌کلیپ چیزی را منتظر نیست
  return ['ok', 'fail', 'off'].indexOf(c.state) !== -1;
}

/* ══ آزمونِ مدلِ تصویرِ تازه (۸.۵۱) ══
 * او پرسید «یعنی مدل هیچ‌وقت به‌روز نمی‌شه؟ اگر منقضی بشه چی؟». سنجاق یعنی
 * انتخابِ خودکار سراغِ مدلِ دیگر نمی‌رود؛ پس مدلِ تازه **دیده** می‌شود و **نشان**
 * داده می‌شود، نه اینکه بی‌صدا جا بیفتد یا بی‌صدا نادیده بماند:
 *   ۱) فهرستِ مدل‌های تصویرِ حساب (همان گشتنِ هفتگیِ `lvGenModel_`) با فهرستِ
 *      دیده‌شده مقایسه می‌شود. بارِ اول فقط ثبت است — آنچه امروز هست «تازه» نیست.
 *   ۲) برای مدلِ تازه، همان چند صحنهٔ آخرین درسی که با سنجاق ساخته شد با مدلِ تازه
 *      هم ساخته می‌شود، هر دو در **یک** فراخوانِ داوری کنارِ متنشان نمره می‌گیرند،
 *      و هر جفت کنارِ هم به تلگرام می‌رود — با نمره و قیمت.
 *   ۳) **هیچ‌چیز خودکار عوض نمی‌شود.** همان راهِ مدل‌های صوتی (۸.۳۹): داور کف است،
 *      چشمِ او سقف؛ و درسِ ۳۸ نشان داد این دو یکی نیستند.
 * خرج از همان سقفِ ماه است و پیش از کار سنجیده می‌شود؛ جا نبود ⇒ صبر، و گفته می‌شود. */
function lvAudSee_(ids) {
  var out = [];
  if (CFG.LV_AUD_ON === false || !ids || !ids.length) return out;
  try {
    var known = null;
    try { known = JSON.parse(props_().getProperty(PK.LV_AUD_KNOWN) || 'null'); } catch (eK) { known = null; }
    if (!known || !known.length) {
      props_().setProperty(PK.LV_AUD_KNOWN, JSON.stringify(ids.slice(0, 60)));
      return out;
    }
    for (var i = 0; i < ids.length; i++) if (known.indexOf(ids[i]) === -1) out.push(ids[i]);
    if (!out.length) return out;
    var due = [];
    try { due = JSON.parse(props_().getProperty(PK.LV_AUD_DUE) || '[]') || []; } catch (eD) { due = []; }
    if (!due.length && !props_().getProperty(PK.LV_AUD_SINCE)) props_().setProperty(PK.LV_AUD_SINCE, nowStr_());
    for (var j = 0; j < out.length; j++) if (due.indexOf(out[j]) === -1) due.push(out[j]);
    props_().setProperty(PK.LV_AUD_DUE, JSON.stringify(due.slice(-12)));
    props_().setProperty(PK.LV_AUD_KNOWN, JSON.stringify(known.concat(out).slice(-60)));
    lvAudArm_();
  } catch (e) {}
  return out;
}

/** اجرای یک‌بارهٔ آزمون، چند دقیقه بعد — نه وسطِ ساختِ صحنه‌ها و نه روی مسیرِ گرم. */
function lvAudArm_() {
  try {
    clearRetryTriggers_('lvAuditionLater');
    ScriptApp.newTrigger('lvAuditionLater').timeBased().after(5 * 60000).create();
    return true;
  } catch (e) { return false; }
}

/** صحنه‌های مرجع: بهترین‌های داوری‌شدهٔ مدلی که بیشترِ این درس را ساخت. */
function lvAudRefSave_(d, key) {
  if (CFG.LV_AUD_ON === false || !d || !d.scenes) return false;
  try {
    var cand = d.scenes.filter(function (x) {
      return x.fileId && x.scene && x.judge && x.judge.s >= 0 && !x.judge.txt && !x.judge.face; });
    if (cand.length < 2) return false;
    var cnt = {};
    cand.forEach(function (x) { var m = String(x.model || ''); cnt[m] = (cnt[m] || 0) + 1; });
    var model = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
    if (!model) return false;
    var prev = null;
    try { prev = JSON.parse(props_().getProperty(PK.LV_AUD_REF) || 'null'); } catch (eP) { prev = null; }
    if (prev && prev.key === key && prev.model === model) return false;     // همان مرجع، بی بازنویسی
    var n = Math.max(1, Math.min(6, Number(CFG.LV_AUD_SCENES) || 3));
    cand = cand.filter(function (x) { return String(x.model || '') === model; })
               .sort(function (a, b) { return b.judge.s - a.judge.s; }).slice(0, n);
    props_().setProperty(PK.LV_AUD_REF, JSON.stringify({ key: key, at: nowStr_(), model: model,
      art: String(d.art || '').slice(0, 400), cast: String(d.cast || '').slice(0, 300),
      scenes: cand.map(function (x) { return { n: x.n, scene: String(x.scene).slice(0, 450),
        text: lvSceneClean_(x.text || '').slice(0, 220), fileId: x.fileId, s: x.judge.s }; }) }));
    return true;
  } catch (e) { return false; }
}

/** اجرای یک‌بارهٔ آزمونِ مدلِ تصویر — نامِ جدا، تا پاک‌کردنش به تریگرِ دیگری نخورد. */
function lvAuditionLater() {
  runEnter_('lvAuditionLater');
  var note = '';
  try {
    try { clearRetryTriggers_('lvAuditionLater'); } catch (e0) {}
    var r = lvAudition_();
    note = r.note;
    try { if (note) logLine_(note); } catch (eL) {}
  } finally { runExit_('lvAuditionLater', note); }
  return note;
}

/**
 * آزمونِ مدل‌های در صف. @return {{note:string, done:Array}}
 */
function lvAudition_() {
  var out = { note: '', done: [] };
  var due = [];
  try { due = JSON.parse(props_().getProperty(PK.LV_AUD_DUE) || '[]') || []; } catch (e) { due = []; }
  if (!due.length) { out.note = 'آزمونِ مدلِ تصویر: مدلِ تازه‌ای در صف نیست'; return out; }
  var ref = null;
  try { ref = JSON.parse(props_().getProperty(PK.LV_AUD_REF) || 'null'); } catch (eR) { ref = null; }
  if (!ref || !ref.scenes || !ref.scenes.length) {
    out.note = 'آزمونِ مدلِ تصویر: ' + due.join('، ') + ' در صف است، ولی هنوز درسی با صحنه ساخته نشده که ' +
               'مرجع باشد — پس از درسِ بعد';
    return out;
  }
  var t0 = new Date().getTime();
  var max = Math.max(1, Number(CFG.LV_AUD_MAX) || 2);
  var cap = Math.max(0, Number(CFG.LV_GEN_USD_MONTH) || 0);
  var log = {};
  try { log = JSON.parse(props_().getProperty(PK.LV_AUD_LOG) || '{}') || {}; } catch (eG) { log = {}; }
  var notes = [];
  while (due.length && out.done.length < max && new Date().getTime() - t0 < 200000) {
    var model = String(due[0]);
    var cost = lvGenPrice_(model) * ref.scenes.length;
    if (cap - lvGenSpend_().usd < cost) {
      notes.push('«' + model + '» منتظر می‌مانَد: سقفِ ماه برای ' + ref.scenes.length + ' تصویرِ آزمون جا ندارد');
      break;
    }
    var pairs = [], made = 0, why = '';
    for (var i = 0; i < ref.scenes.length; i++) {
      var sc = ref.scenes[i];
      var g = lvGenOne_(model, lvSceneImgPrompt_(sc.scene, ref.art, ref.cast, ''), { aspect: '16:9' });
      var pin = null;
      try { pin = DriveApp.getFileById(sc.fileId).getBlob(); } catch (eF) { pin = null; }
      if (g.blob) made++; else why = g.why;
      pairs.push({ sc: sc, a: pin, b: g.blob });
    }
    /* هر دو در **یک** فراخوانِ داوری: یک داور، یک معیار — نمرهٔ دیروزِ سنجاق با نمرهٔ
       امروزِ مدلِ تازه از دو داوری مقایسه‌پذیر نیست. */
    var payload = [];
    pairs.forEach(function (p, k) {
      [['a', 10], ['b', 20]].forEach(function (w) {
        var bl = p[w[0]];
        if (!bl) return;
        payload.push({ n: w[1] + k, text: p.sc.text, mime: bl.getContentType() || 'image/png',
                       b64: Utilities.base64Encode(bl.getBytes()), focus: '' });
      });
    });
    var jr = {};
    try { jr = payload.length ? lvSceneJudge_(payload) : {}; } catch (eJ) { jr = {}; notes.push('داوری نشد: ' + eJ.message); }
    var sA = [], sB = [], defB = 0;
    pairs.forEach(function (p, k) {
      p.va = jr[String(10 + k)] || null; p.vb = jr[String(20 + k)] || null;
      if (p.va && p.va.s >= 0) sA.push(p.va.s);
      if (p.vb && p.vb.s >= 0) sB.push(p.vb.s);
      if (p.vb && (p.vb.txt || p.vb.face)) defB++;
    });
    var avg = function (a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 10) / 10 : -1; };
    var rec = { at: nowStr_(), ref: ref.key, pin: ref.model, n: pairs.length, made: made,
                avgPin: avg(sA), avgNew: avg(sB), def: defB, price: lvGenPrice_(model),
                pinPrice: lvGenPrice_(ref.model), why: made ? '' : why, sent: false };
    rec.sent = lvAudSend_(model, ref, pairs, rec);
    log[model] = rec;
    out.done.push(model);
    due.shift();
  }
  try {
    props_().setProperty(PK.LV_AUD_DUE, JSON.stringify(due));
    if (!due.length) props_().deleteProperty(PK.LV_AUD_SINCE);   // صف خالی شد ⇒ «از کِی» پاک
    var keys = Object.keys(log).sort(function (a, b) { return String(log[b].at).localeCompare(String(log[a].at)); });
    var keep = {};
    keys.slice(0, 8).forEach(function (k) { keep[k] = log[k]; });
    props_().setProperty(PK.LV_AUD_LOG, JSON.stringify(keep));
  } catch (eS) {}
  out.note = 'آزمونِ مدلِ تصویر: ' + (out.done.length ? out.done.map(function (m) {
               var r = log[m];
               return '«' + m + '» ' + (r.made ? 'میانگین ' + r.avgNew + ' در برابرِ ' + r.avgPin + 'ِ سنجاق' : 'نساخت (' + r.why + ')') +
                      (r.sent ? '، به تلگرام رفت' : '، تلگرام نرفت'); }).join(' · ') : 'هیچ') +
             (due.length ? ' · در صف: ' + due.join('، ') : '') + (notes.length ? ' · ' + notes.join(' · ') : '');
  return out;
}

/** هر جفت کنارِ هم، به‌صورتِ آلبوم؛ و یک پیامِ جمع‌بندی. */
function lvAudSend_(model, ref, pairs, rec) {
  if (!tgEnabled_()) return false;
  var sent = 0;
  pairs.forEach(function (p, k) {
    try {
      var media = [], pay = { chat_id: tgChat_() };
      if (p.a) {
        pay.fa = p.a.setName('pin' + k + '.png');
        media.push({ type: 'photo', media: 'attach://fa', caption: 'صحنهٔ ' + p.sc.n + ' — سنجاق (' + ref.model + ')' +
                     (p.va ? ': نمره ' + p.va.s : '') });
      }
      if (p.b) {
        pay.fb = p.b.setName('new' + k + '.png');
        media.push({ type: 'photo', media: 'attach://fb', caption: 'مدلِ تازه (' + model + ')' +
                     (p.vb ? ': نمره ' + p.vb.s + (p.vb.txt ? ' · نوشته دارد' : '') + (p.vb.face ? ' · چهره دارد' : '') : '') });
      }
      if (media.length === 2) { pay.media = JSON.stringify(media); tgApi_('sendMediaGroup', pay); sent++; }
    } catch (e) {}
  });
  try {
    tgSend_('🎨 مدلِ تصویرِ تازه پیدا شد: «' + model + '» (~' + rec.price.toFixed(3) + ' دلار هر تصویر؛ سنجاق ~' +
            rec.pinPrice.toFixed(3) + ').\n' +
            'همان ' + rec.n + ' صحنه از درسِ ' + ref.key + ' با هر دو ساخته و کنارِ هم داوری شد: میانگینِ مدلِ تازه ' +
            (rec.avgNew >= 0 ? rec.avgNew : '—') + ' در برابرِ ' + (rec.avgPin >= 0 ? rec.avgPin : '—') + 'ِ سنجاق' +
            (rec.def ? '؛ ' + rec.def + ' تصویرِ مدلِ تازه نوشته یا چهره داشت' : '') + '.\n' +
            'هیچ چیزی خودکار عوض نشد. اگر تصویرهای تازه را بیشتر پسندیدید، بگویید سنجاق عوض شود.');
  } catch (eT) {}
  return sent > 0;
}

/** خطِ روزانهٔ آزمون — از Properties، بی درایو (۷.۶۳). */
function lvAudStatus_() {
  var out = { on: CFG.LV_AUD_ON !== false, due: [], dueN: 0, since: '', stuckDays: 0, last: null, ref: '',
              ok: true, line: '' };
  try {
    try { out.due = JSON.parse(props_().getProperty(PK.LV_AUD_DUE) || '[]') || []; } catch (e1) {}
    out.dueN = out.due.length;
    out.since = out.dueN ? String(props_().getProperty(PK.LV_AUD_SINCE) || '') : '';
    if (out.since) {
      var sd = new Date(out.since.replace(' ', 'T') + ':00');
      out.stuckDays = isNaN(sd.getTime()) ? 0 : Math.max(0, Math.floor((new Date().getTime() - sd.getTime()) / 86400000));
    }
    out.ok = !(out.on && out.dueN && out.stuckDays >= Math.max(1, Number(CFG.LV_AUD_STUCK_DAYS) || 7));
    var log = {};
    try { log = JSON.parse(props_().getProperty(PK.LV_AUD_LOG) || '{}') || {}; } catch (e2) {}
    var ks = Object.keys(log).sort(function (a, b) { return String(log[b].at).localeCompare(String(log[a].at)); });
    if (ks.length) out.last = Object.assign({ model: ks[0] }, log[ks[0]]);
    try { var r = JSON.parse(props_().getProperty(PK.LV_AUD_REF) || 'null'); out.ref = r ? String(r.key || '') : ''; } catch (e3) {}
    if (!out.on) { out.line = '🧪 آزمونِ مدلِ تصویرِ تازه: خاموش.'; return out; }
    var L = out.last;
    out.line = '🧪 آزمونِ مدلِ تصویرِ تازه: ' +
      (out.due.length ? 'در صف: ' + out.due.join('، ') + (out.ref ? '' : ' (منتظرِ نخستین درسِ صحنه‌دار برای مرجع)') +
                        (out.ok ? '' : ' · ❌ ' + faDigitsOut_(String(out.stuckDays)) + ' روز است آزموده نشده')
                      : 'مدلِ تازه‌ای نیامده') +
      (L ? ' · آخرین: «' + L.model + '» ' + (L.made ? 'میانگین ' + L.avgNew + ' در برابرِ ' + L.avgPin + 'ِ سنجاق' : 'نساخت') +
           (L.sent ? '' : ' — ❌ به تلگرام نرفت') : '') +
      ' · هیچ مدلی خودکار جایگزین نمی‌شود.';
  } catch (e) { out.line = ''; }
  return out;
}

/** توصیف‌های یک پرسش را روی صحنه‌های نقشه می‌نشانَد؛ آنچه قبلاً توصیف شده دست نمی‌خورد. */
function lvScenePlanTake_(d, ask) {
  for (var i = 0; i < d.scenes.length; i++) {
    var sc = d.scenes[i], a = ask.scenes[String(sc.n)];
    if (!a || sc.scene) continue;
    sc.scene = a.scene; sc.caption = a.caption; sc.beat = a.beat || ''; sc.ov = a.ov || null;
    sc.focus = a.focus || ''; sc.move = a.move || '';
  }
}

/**
 * توصیفِ صحنه‌ها دسته‌دسته، از همان‌جا که اجرای قبل ماند (۸.۴۹). دستهٔ اول ماهیت،
 * شخصیت‌ها و کاور را می‌دهد؛ بقیه آن‌ها را **می‌شنوند** — وگرنه نیمهٔ دومِ ویدئو
 * شخصیت‌ها را جورِ دیگری می‌کشید. دستهٔ بعد فقط با وقتِ کافی؛ وگرنه `more`.
 * و یک پرسشِ دوم برای جاافتاده‌ها، همان قاعدهٔ ۸.۳۱.
 */
function lvScenePlanAsk_(d, ctx, left, fresh) {
  var out = { more: false, asked: 0 };
  var batch = Math.max(5, Number(CFG.LV_SCENE_ASK_BATCH) || 50);
  var askMin = Math.max(5000, Number(CFG.LV_SCENE_ASK_MIN_MS) || 50000);
  var all = d.scenes;
  var cur = Math.max(0, Number(d.askAt) || 0);
  while (cur < all.length) {
    /* هر اجرا دست‌کم یک دسته می‌پرسد — مگر همین اجرا برش را هم گرفته باشد (آن خودش
       پیشرفت است و ثبت شده). بی این، مهلتِ کوتاه یعنی ادامه‌ای که هرگز جلو نمی‌رود. */
    if ((out.asked || fresh) && left() < askMin) { out.more = true; return out; }
    var first = cur === 0;
    var slice = all.slice(cur, cur + batch);
    var only = (first && slice.length === all.length) ? null : slice.map(function (x) { return x.n; });
    if (!first) ctx.nature = d.nature;
    var ask = lvSceneAsk_(all, ctx, d.art, d.cast, only, first);
    out.asked++;
    lvScenePlanTake_(d, ask);
    if (first) {
      d.nature = ask.nature || '';
      d.cast = ask.cast || '';
      d.cover = { scene: ask.cover || '', fileId: '' };
    }
    if (ask.why) d.askWhy = ask.why;
    cur += slice.length;
    d.askAt = cur;
  }
  if (!d.retried) {
    var miss = [];
    for (var i = 0; i < all.length; i++) if (!all[i].scene) miss.push(all[i].n);
    if (miss.length && miss.length < all.length) {
      if ((out.asked || fresh) && left() < askMin) { out.more = true; return out; }
      d.retried = true;
      /* پرسشِ دوم فقط چند صحنه را می‌بیند و از آن‌ها ماهیتِ کل را نمی‌شود فهمید؛
         پس همان تشخیصِ اول به او گفته می‌شود (۸.۴۷). */
      ctx.nature = d.nature;
      var ask2 = lvSceneAsk_(all, ctx, d.art, d.cast, miss, false);
      out.asked++;
      if (!d.nature && ask2.nature) d.nature = ask2.nature;
      lvScenePlanTake_(d, ask2);
    }
  }
  return out;
}

/**
 * نقشه و ساختِ صحنه‌های یک درس — ادامه‌پذیر، در چند اجرا.
 *
 * @return {{active:boolean, done:boolean, fallback:boolean, why:string,
 *           want:number, ready:number, items:Array, cover:Object, info:Object}}
 * `active=false` یعنی این درس صحنه نمی‌گیرد (و مسیرِ قبلی می‌رود)؛ `fallback`
 * یعنی خواست و نشد — علتش در `why` است و همان به ردیفِ عمومی می‌رود.
 */
function lvScenesBuild_(folder, meta, plan, ctx) {
  var out = { active: false, done: false, fallback: false, why: '', want: 0, ready: 0,
              items: [], cover: null, info: null, made: 0, spent: 0, judged: 0, redo: 0 };
  var key = String((ctx && ctx.show) || '') + ':' + String((ctx && ctx.epRaw) || '');
  if (!lvSceneOn_(ctx && ctx.show, ctx && ctx.level)) return out;
  out.active = true;
  var t0 = new Date().getTime();
  var deadline = t0 + Math.max(30000, Number(CFG.LV_SCENE_RUN_MS) || 150000);
  if (_ytRunDeadline > t0) deadline = Math.min(deadline, _ytRunDeadline);
  var left = function () { return deadline - new Date().getTime(); };
  var fail = function (w) {
    out.fallback = true; out.why = w;
    try { logLine_('صحنه‌های مصورِ ' + key + ' نشد — ' + w + ' — ویدئو با مسیرِ قبلی می‌رود.'); } catch (e) {}
    return out;
  };

  var d = lvSceneRead_(folder);
  var art = lvSceneArt_(ctx.style);
  /* نقشه‌ای که دو بار نشد، هر دو ساعت یک فراخوانِ مدلِ تازه نمی‌خورد. */
  var planFail = function (w) {
    try {
      var n0 = (d && Number(d.failed)) || 0;
      lvSceneWrite_(folder, { v: 1, key: key, at: nowStr_(), failed: n0 + 1, why: w, scenes: [] });
    } catch (eW) {}
    return fail(w);
  };
  if (d && !d.scenes.length && Number(d.failed) >= 2) {
    out.fallback = true; out.why = String(d.why || 'نقشهٔ صحنه دو بار نشد');
    return out;
  }

  // ── ۱) نقشه: یک بار، و پیش از هر خرجی ثبت می‌شود ──
  /* از ۸.۴۹ نقشه در چند اجرا ساخته می‌شود: اول برش (تدوین‌گر، کلِ درس) و ثبت؛ بعد
     توصیف‌ها دسته‌دسته (`asking`). صحنه‌های محتوامحور ممکن است صد تا بشوند و یک
     پرسشِ صدصحنه‌ای از مهلتِ اجرا می‌گذرد. هیچ تصویری پیش از کامل‌شدنِ نقشه ساخته
     نمی‌شود. */
  var planning = !d || !d.scenes.length || !!d.asking;
  if (planning && left() < 60000) {
    out.why = 'وقتِ این دور برای نقشهٔ صحنه کم است؛ دورِ بعد';
    lvSceneMoreArm_();
    return out;
  }
  var planStep = function () {
    var fresh = false;
    if (!d || !d.asking) {
      fresh = true;
      var rp = lvReplayChunks_(folder, meta);
      if (!rp.chunks.length) return planFail(rp.why || 'زمانِ تکه‌ها با متنِ گفتار جور نشد');
      var secs = Number(rp.secs) || 0;
      var sents = lvSceneSents_(rp.chunks);
      if (sents.length < 3) return planFail('جمله‌ای برای صحنه نماند (' + rp.chunks.length + ' تکه)');
      /* سقفِ این درس از بودجهٔ ماه (۸.۴۸/۸.۴۹) — **سقف، نه شمار**. */
      var pace = lvScenePace_((lvGenModel_() || {}).id);
      /* پولی نمانده: پیش از هر فراخوانِ مدل، و **بی شمردن** به‌عنوانِ نقشهٔ ناشده —
         ماهِ بعد پول هست و این درس نباید تا ابد «دو بار نشد» بماند. */
      if (pace.max < 3) {
        return fail('سقفِ ماهانهٔ تصویر برای حتی سه صحنه جا ندارد (' + pace.left.toFixed(2) + ' دلار مانده)');
      }
      /* شمار از **محتوا** (۸.۴۹): تدوین‌گر می‌گوید تصویر کجا عوض شود. نشد ⇒ همان
         برشِ زمانیِ قبلی، و گفته می‌شود. */
      var lim = lvSceneCutSec_(ctx.level);
      var cut = lvSceneCuts_(sents, ctx, lim);
      var groups = null, by = 'محتوا';
      if (cut.starts) {
        groups = lvSceneCutGroups_(sents, cut.starts, secs, lim, pace.max);
        if (groups.length < 3) { cut.why = 'تدوین‌گر فقط ' + groups.length + ' صحنه داد'; groups = null; }
      }
      if (!groups) {
        by = 'زمان';
        groups = lvSceneGroups_(sents, lvSceneSec_(ctx.level), secs, pace.max);
      }
      if (groups.length < 3) return planFail('درس برای صحنه‌بندی کوتاه است (' + groups.length + ' صحنه)');
      var natural = Number(groups.natural) || groups.length;
      var hardMax = Math.max(3, Number(CFG.LV_SCENE_MAX) || 150);
      /* «بودجه بُرید» فقط وقتی محتوا بیشتر خواست **و** سقف از بودجه آمد، نه از سقفِ ایمنی. */
      var paced = natural > groups.length && pace.max < hardMax;
      try { props_().setProperty(PK.LV_PACE_LAST, JSON.stringify({ key: key, at: nowStr_(), secs: secs,
              level: String(ctx.level || ''), natural: natural, used: groups.length, max: pace.max,
              paced: paced, by: by, allow: Math.round(pace.allow * 100) / 100,
              ceil: Math.round(pace.ceil * 100) / 100 })); } catch (ePl) {}
      logLine_('صحنه‌های مصورِ ' + key + ': ' +
               (by === 'محتوا' ? 'محتوا ' + natural + ' صحنه خواست'
                               : 'برشِ محتوایی نشد (' + (cut.why || 'بی علت') + ') — برشِ زمانی ' + natural + ' صحنه') +
               (paced ? '؛ ' + pace.why + ' ⇒ ' + groups.length + ' صحنه' : '') + '.');
      var sc0 = [];
      for (var s0 = 0; s0 < groups.length; s0++) {
        sc0.push({ n: groups[s0].n, t0: groups[s0].t0, t1: groups[s0].t1, sec: groups[s0].sec || 0,
                   text: lvSceneClean_(groups[s0].text).slice(0, 600),
                   scene: '', caption: '', beat: '', ov: null, focus: '', move: '',
                   fileId: '', tries: 0, judge: null, redo: 0 });
      }
      /* `failed` از نقشهٔ ناشدهٔ قبلی می‌مانَد: `planFail` شمار را از همین `d` می‌خوانَد،
         و بی آن هر بار از صفر می‌شمرد و «دو بار نشد» هرگز نمی‌رسید. */
      d = { v: 1, key: key, at: nowStr_(), asking: true, askAt: 0, failed: (d && Number(d.failed)) || 0,
            level: String(ctx.level || ''), style: art.key, text: String(ctx.textLevel || ''),
            art: art.art, cast: '', secs: secs, align: rp.how,
            cutBy: by, cutWhy: String(cut.why || cut.note || ''), natural: natural,
            pace: { paced: paced, natural: natural, max: pace.max,
                    allow: Math.round(pace.allow * 100) / 100, ceil: Math.round(pace.ceil * 100) / 100,
                    why: paced ? pace.why : '' },
            scenes: sc0, cover: { scene: '', fileId: '' }, nature: '',
            /* جان‌بخشیِ همین مجموعه (۸.۵۴): «بی‌کلیپ» و «آرام» کلیپ نمی‌خرند، و
               «آرام» حرکتِ کانون‌دار هم نمی‌گیرد. با `state: 'off'` و علت — نه `null` —
               تا خطِ روزانه بگوید «خاموش به انتخابِ تخته»، نه «نقشهٔ پیش از ۸.۵۱». */
            motion: String(ctx.motion || ''),
            focusOn: ctx.motionFocus !== false,
            clip: lvClipOn_()
              ? (ctx.motionClip === false
                  ? { state: 'off', tries: 0, op: '', fileId: '', at: '',
                      why: 'تخته: جان‌بخشیِ «' + String(ctx.motion || '') + '» — بی کلیپ' }
                  : { state: '', tries: 0, op: '', fileId: '', why: '', at: '' })
              : null,
            spent: 0, made: 0, judged: false, done: false, why: '' };
      if (!lvSceneWrite_(folder, d)) return planFail('`_scenes.json` نوشته نشد');
      if (d.clip && d.clip.state === 'off') {
        try { lvClipNote_(key, d.clip, String(CFG.LV_CLIP_MODEL || '')); } catch (eCn) {}
      }
    }
    var pa = lvScenePlanAsk_(d, ctx, left, fresh);
    if (pa.more) {
      lvSceneWrite_(folder, d);
      out.want = d.scenes.length;
      out.why = 'نقشهٔ صحنه: توصیفِ ' + (Number(d.askAt) || 0) + ' از ' + d.scenes.length +
                ' صحنه پرسیده شد؛ بقیه چند دقیقهٔ دیگر';
      lvSceneMoreArm_();
      return out;
    }
    var have = d.scenes.filter(function (x) { return x.scene; }).length;
    if (have < Math.max(3, Math.ceil(d.scenes.length * 0.6))) {
      return planFail('مدل برای ' + have + ' صحنه از ' + d.scenes.length + ' توصیف داد' +
                      (d.askWhy ? ' (' + d.askWhy + ')' : ''));
    }
    // صحنهٔ بی‌توصیف به قبلی می‌پیوندد: زمانش را تصویرِ قبلی پر می‌کند، نه قابِ خالی
    var kept = [];
    for (var s2 = 0; s2 < d.scenes.length; s2++) {
      if (!d.scenes[s2].scene && kept.length) { kept[kept.length - 1].t1 = d.scenes[s2].t1; continue; }
      if (!d.scenes[s2].scene) continue;
      kept.push(d.scenes[s2]);
    }
    if (kept.length) kept[0].t0 = 0;
    var nature = String(d.nature || '');
    d.ovGenre = lvSceneOvGenre_(kept, nature);
    d.ovShare = lvSceneTextShare_(ctx.textLevel, ctx.textShare, nature);
    d.ovN = lvSceneOvTrim_(kept, d.ovShare);
    d.scenes = kept;
    /* میانگینِ واقعی، نه عددِ تخته — گزارشِ «هر ~N ثانیه» از آنچه محتوا ساخت. */
    d.target = Math.round((Number(d.secs) || 0) / Math.max(1, kept.length));
    d.cover = { scene: (d.cover && d.cover.scene) || (kept[0] && kept[0].scene) || '', fileId: '' };
    delete d.asking; delete d.askAt; delete d.retried;
    d.at = nowStr_();
    if (!lvSceneWrite_(folder, d)) return planFail('`_scenes.json` نوشته نشد');
    logLine_('صحنه‌های مصورِ ' + key + ': نقشهٔ ' + kept.length + ' صحنه (برش از ' + d.cutBy +
             '، میانگینِ هر صحنه ~' + d.target + ' ثانیه، سبکِ «' + art.key + '»).');
    return null;
  };
  if (planning) {
    if (!lvSceneLease_(key, 1)) {
      out.why = 'اجرای دیگری همین حالا نقشهٔ صحنه را می‌پرسد';
      lvSceneMoreArm_();
      return out;
    }
    var pr = null;
    try { pr = planStep(); } finally { lvSceneLease_(key, 0); }
    if (pr) return pr;
  }
  out.want = d.scenes.length;

  // ── ۲) ساختن، تا جایی که وقتِ این اجرا اجازه بدهد ──
  var imgFolder = lvFolder_(folder);
  var mk = lvGenModel_();
  if (!mk.id) return fail(mk.why || 'مدلِ تصویر پیدا نشد');
  if (!lvSceneLease_(key, 1)) { out.why = 'اجرای دیگری همین حالا صحنه‌ها را می‌سازد'; return out; }
  var tryMax = 2;
  /* کلیپِ آغاز (۸.۵۱): یک گام در آغازِ اجرا (کاری که از اجرای قبل در راه است) و یک گام
     در پایان (آغاز، یا پرسیدنِ دوباره). */
  var clipStep = function () { lvClipStep_(d, imgFolder, left, key, tryMax); };
  try {
    clipStep();                                           // کاری که از اجرای قبل در راه است
    for (var i = 0; i < d.scenes.length && left() > 20000; i++) {
      var sc = d.scenes[i];
      if (sc.fileId) continue;
      if (sc.tries >= tryMax) continue;
      if (lvGenRoom_(mk.id) <= 0) { d.why = 'سقفِ ماهانهٔ تصویر پر شد'; d.capHit = true; break; }
      sc.tries++;
      var r = lvGenOne_(mk.id, lvSceneImgPrompt_(sc.scene, d.art, d.cast, lvSceneOvSpace_(sc.ov)), { aspect: '16:9' });
      out.spent += r.usd; d.spent = Math.round(((Number(d.spent) || 0) + r.usd) * 1000) / 1000;
      if (!r.blob) { sc.why = r.why; continue; }
      try {
        var nm = lvSceneImgName_(sc.n);
        var old = imgFolder.getFilesByName(nm);
        while (old.hasNext()) old.next().setTrashed(true);
        sc.fileId = imgFolder.createFile(r.blob.setName(nm)).getId();
        sc.at = nowStr_(); sc.why = ''; sc.model = mk.id;
        out.made++; d.made = (Number(d.made) || 0) + 1;
      } catch (eF) { sc.why = 'ذخیره نشد: ' + eF.message; }
      if (out.made % 4 === 0) lvSceneWrite_(folder, d);     // پیشرفت در میانه هم ثبت می‌شود
    }
    // کاور — یک بار، با بهترین مدلِ زیرِ سقف
    var hq = (!d.cover.fileId && d.cover.scene) ? lvGenModelHq_() : { id: '' };
    if (!d.cover.fileId && (Number(d.cover.tries) || 0) < tryMax && left() > 20000 && d.cover.scene &&
        lvGenRoom_(hq.id || mk.id) > 0) {
      d.cover.tries = (Number(d.cover.tries) || 0) + 1;
      var rc = lvGenOne_(hq.id || mk.id, lvSceneImgPrompt_(d.cover.scene, d.art, d.cast,
               'This is a YouTube thumbnail: bold, high-contrast, instantly readable at small size; ' +
               'keep the right third calm and uncluttered for a title.'), { aspect: '16:9' });
      out.spent += rc.usd; d.spent = Math.round(((Number(d.spent) || 0) + rc.usd) * 1000) / 1000;
      if (rc.blob) {
        try {
          var cn = 'کاور — صحنه.png';
          var oc = imgFolder.getFilesByName(cn);
          while (oc.hasNext()) oc.next().setTrashed(true);
          d.cover.fileId = imgFolder.createFile(rc.blob.setName(cn)).getId();
          d.cover.model = hq.id || mk.id;
        } catch (eCv) { d.cover.why = eCv.message; }
      } else d.cover.why = rc.why;
    }

    // ── ۳) داوری، کنارِ متنِ خودش؛ ضعیف ⇒ یک بار از نو ──
    if (CFG.LV_SCENE_JUDGE !== false) {
      var batchN = Math.max(1, Number(CFG.LV_SCENE_JUDGE_BATCH) || 4);
      var redoMax = Math.max(0, Number(CFG.LV_SCENE_REDO_MAX) || 8);
      var minS = Number(CFG.LV_SCENE_JUDGE_MIN) || 5;
      var todo = d.scenes.filter(function (x) { return x.fileId && !x.judge; });
      while (todo.length && left() > 25000) {
        var batch = todo.splice(0, batchN), payload = [];
        for (var b = 0; b < batch.length; b++) {
          try {
            var bl = DriveApp.getFileById(batch[b].fileId).getBlob();
            payload.push({ n: batch[b].n, text: batch[b].text, mime: bl.getContentType() || 'image/png',
                           b64: Utilities.base64Encode(bl.getBytes()), focus: batch[b].focus || '' });
          } catch (eB) {}
        }
        var jr = {};
        try { jr = lvSceneJudge_(payload); }
        catch (eJ) { d.judgeWhy = 'داوری نشد: ' + String(eJ.message).slice(0, 100); break; }
        for (var b2 = 0; b2 < batch.length; b2++) {
          var v = jr[String(batch[b2].n)];
          if (!v) continue;
          batch[b2].judge = v;
          out.judged++;
          /* ══ جای خالی را داور می‌گوید، نه حدسِ پیکسلی (۸.۴۵) ══
             رانر جای نوشته را از شلوغیِ تصویر پیدا می‌کند، ولی زنجیرِ تیره روی پنلِ
             تیره یا ابرِ سفید روی آسمان را از «موضوع» تشخیص نمی‌دهد. داور خودِ تصویر را
             می‌بیند؛ پس جای خالی از او، و «هیچ‌جا» یعنی این صحنه نوشته نمی‌گیرد. */
          if (batch[b2].ov && v.space) {
            if (v.space === 'none') { batch[b2].ov = null; d.ovDropped = (Number(d.ovDropped) || 0) + 1; }
            else batch[b2].ov.side = v.space;
          }
          lvGenScoreAdd_(batch[b2].model || mk.id, v);
          var bad = v.txt || v.face || (v.s >= 0 && v.s < minS);
          if (bad && batch[b2].redo < 1 && (Number(d.redo) || 0) < redoMax &&
              lvGenRoom_(mk.id) > 0 && left() > 25000) {
            var fix = v.txt ? 'The previous attempt contained written text; this time there must be none at all.'
                    : v.face ? 'The previous attempt showed a recognizable real person; use only generic, anonymous figures.'
                    : 'The previous attempt did not show the idea clearly (' + v.why + '); make the metaphor concrete and obvious.';
            var sp2 = lvSceneOvSpace_(batch[b2].ov);
            var rr = lvGenOne_(mk.id, lvSceneImgPrompt_(batch[b2].scene, d.art, d.cast,
                                                        fix + (sp2 ? '\n' + sp2 : '')), { aspect: '16:9' });
            out.spent += rr.usd; d.spent = Math.round(((Number(d.spent) || 0) + rr.usd) * 1000) / 1000;
            batch[b2].redo = 1; d.redo = (Number(d.redo) || 0) + 1; out.redo++;
            if (rr.blob) {
              try {
                var nm2 = lvSceneImgName_(batch[b2].n);
                var o2 = imgFolder.getFilesByName(nm2);
                while (o2.hasNext()) o2.next().setTrashed(true);
                batch[b2].fileId = imgFolder.createFile(rr.blob.setName(nm2)).getId();
                batch[b2].model = mk.id;
                batch[b2].judge = null;      // تصویرِ تازه، داوریِ تازه
              } catch (eR) {}
            }
          }
        }
      }
      d.judged = d.scenes.every(function (x) { return !x.fileId || !!x.judge; });
    }
    /* کارت‌ها پس از داوری — داور گفته کجای هر تصویر خالی است (۸.۵۶). */
    if ((d.judged || CFG.LV_SCENE_JUDGE === false) && !d.ovFillAt) {
      var ofl = lvSceneOvFill_(d, ctx, left);
      if (ofl.asked) logLine_('کارت‌های نوشتاریِ ' + key + ': نقشه کم داده بود؛ ' + ofl.got + ' از ' + ofl.asked +
                              ' کارتِ تازه' + (ofl.why ? ' — ' + ofl.why : '') + '.');
    }
    clipStep();                                           // آغاز، یا پرسیدنِ دوباره
  } finally {
    lvSceneLease_(key, 0);
  }

  // ── ۴) حساب ──
  var ready = d.scenes.filter(function (x) { return x.fileId; }).length;
  var givenUp = d.scenes.filter(function (x) { return !x.fileId && x.tries >= tryMax; }).length;
  out.ready = ready;
  /* سقفِ ماهانه پر شد ⇒ «همه آزموده شد» حساب می‌شود: هرچه ساخته شده یا
     کافی است و می‌رود، یا نیست و مسیرِ قبلی می‌رود — انتظارِ یک‌ماهه نه. */
  var allTried = ready + givenUp >= d.scenes.length || !!d.why;
  /* سقف وسطِ درس پر شد (۸.۴۸) ⇒ همان صحنه‌های ساخته‌شده می‌روند و هر کدام تا
     صحنهٔ بعدیِ تصویردار ادامه می‌یابد (بندِ ۵). کارتِ ساده یعنی پولِ همین
     تصویرها دور ریخته شود و درس شکلِ دیگری بگیرد — بدتر از تصویرِ کمتر. با
     پخشِ بودجه نباید پیش بیاید؛ اگر آمد، شمرده و گفته می‌شود (`capHit`). */
  var needN = d.capHit ? 3 : Math.max(3, Math.ceil(d.scenes.length * 0.8));
  var clipWait = !lvClipSettled_(d);
  d.done = allTried && ready >= needN &&
           (CFG.LV_SCENE_JUDGE === false || d.judged || !!d.judgeWhy) && !clipWait;
  if (allTried && !d.done && ready < needN) {
    lvSceneWrite_(folder, d);
    return fail('فقط ' + ready + ' تصویر از ' + d.scenes.length + ' ساخته شد' +
                (d.why ? ' — ' + d.why : ''));
  }
  lvSceneWrite_(folder, d);
  if (out.made || out.redo) {
    logLine_('صحنه‌های مصورِ ' + key + ': ' + out.made + ' تصویرِ تازه' +
             (out.redo ? '، ' + out.redo + ' از نو پس از داوری' : '') + ' — ' + ready + ' از ' +
             d.scenes.length + ' آماده (~' + out.spent.toFixed(2) + ' دلار؛ این درس ~' +
             (Number(d.spent) || 0).toFixed(2) + ').');
  }
  out.done = d.done;
  if (!d.done) {
    out.why = 'صحنه‌ها: ' + ready + ' از ' + d.scenes.length + ' آماده' + (d.why ? ' — ' + d.why : '') +
              (clipWait ? '؛ کلیپِ آغاز: ' + ({ '': 'در نوبت', wait: 'در ساخت', judge: 'در داوری' }[(d.clip || {}).state || ''] ||
                                              String((d.clip || {}).state || 'نامعلوم')) : '');
    /* کلیپِ در راه همیشه ادامه می‌خواهد، حتی وقتی سقفِ تصویر پر شده (`d.why`): کارِ آغازشده
       پولش داده شده و فقط باید برداشته شود. */
    if (!d.why || clipWait) lvSceneMoreArm_();
    return out;
  }

  // ── ۵) خروجی برای ردیفِ رندر: هر صحنه با زمان و تصویرش ──
  var items = [], lastId = '';
  for (var z = 0; z < d.scenes.length; z++) {
    var x = d.scenes[z];
    var id = x.fileId || lastId;               // صحنهٔ بی‌تصویر ⇒ تصویرِ قبلی ادامه می‌یابد
    if (!id) continue;
    lastId = id;
    items.push({ n: x.n, t0: x.t0, fileId: id, url: ytDlUrl_(id),
                 caption: x.fileId ? String(x.caption || '') : '', sec: x.sec || 0,
                 ov: x.fileId ? (x.ov || null) : null,
                 mv: x.fileId && d.focusOn !== false ? lvSceneMv_(x) : null,
                 /* جای کانون (داور) و ضربِ صحنه — کارت روی کانون نمی‌نشیند و گذارِ صحنه
                    از ضرب و بخش انتخاب می‌شود (۸.۵۶). */
                 fb: x.fileId && x.judge && x.judge.box ? x.judge.box : null,
                 beat: String(x.beat || '') });
  }
  if (items.length) items[0].t0 = 0;
  lvAudRefSave_(d, key);                 // مرجعِ آزمونِ مدلِ تازه: بهترین صحنه‌های همین درس
  lvMotionNote_(key, d, items);          // حرکتِ کانون‌دار، برای پیگیری (۸.۵۲)
  /* کلیپ فقط روی همان تصویری می‌نشیند که از آن ساخته شد. */
  lvClipAttach_(items, d.clip);
  out.items = items;
  if (d.cover.fileId) out.cover = { fileId: d.cover.fileId, url: ytDlUrl_(d.cover.fileId) };
  var sc2 = d.scenes.filter(function (x) { return x.judge && x.judge.s >= 0; });
  var avg = sc2.length ? sc2.reduce(function (a2, x2) { return a2 + x2.judge.s; }, 0) / sc2.length : -1;
  out.info = { scenes: d.scenes.length, ready: ready, style: d.style, level: d.level,
               target: d.target, judged: sc2.length, avg: Math.round(avg * 10) / 10,
               low: d.scenes.filter(function (x) {
                 return x.judge && (x.judge.txt || x.judge.face ||
                        (x.judge.s >= 0 && x.judge.s < (Number(CFG.LV_SCENE_JUDGE_MIN) || 5))); }).length,
               redo: Number(d.redo) || 0, spent: Number(d.spent) || 0,
               judgeWhy: String(d.judgeWhy || ''),
               text: String(d.text || ''), ov: d.scenes.filter(function (x) { return !!x.ov; }).length,
               ovDropped: Number(d.ovDropped) || 0,
               ovFill: d.ovFill ? (Number(d.ovFill.got) || 0) : 0,
               /* ۸.۶۰: «۰» به‌تنهایی نمی‌گفت چرا — درسِ ۴۰ همین بود. علت، ارتقا و ترکیب. */
               ovFillWhy: d.ovFill ? String(d.ovFill.why || '') : '',
               ovUp: d.ovFill ? (Number(d.ovFill.up) || 0) : 0,
               ovStruct: d.scenes.filter(function (x) { return lvOvStruct_(x.ov); }).length,
               ovWeak: d.scenes.filter(function (x) { return lvOvWeak_(x.ov); }).length,
               nature: String(d.nature || ''), ovGenre: Number(d.ovGenre) || 0,
               beats: d.scenes.filter(function (x) { return x.beat === 'روایت'; }).length,
               paced: !!(d.pace && d.pace.paced), natural: Number(d.natural) || d.scenes.length,
               cutBy: String(d.cutBy || ''),
               capHit: !!d.capHit,
               mv: items.filter(function (x) { return !!x.mv; }).length,
               clip: d.clip ? String(d.clip.state || '') : '' };
  try { lvSceneVisuals_(folder, d); } catch (eV) {}
  return out;
}

/**
 * `_visuals.json` برای جزوه، از روی صحنه‌ها — یک تصویر برای هر بخش (بهترین
 * داوری‌شده). جزوه از ۷.۹۴ همین پرونده را می‌خوانَد؛ پس صحنه‌ها بی هیچ تغییری
 * در بخشِ ۲۶ به جزوه هم می‌رسند، و دیگر کارتِ متنی نیستند.
 */
function lvSceneVisuals_(folder, d) {
  var best = {};
  for (var i = 0; i < d.scenes.length; i++) {
    var x = d.scenes[i];
    if (!x.fileId) continue;
    var k = String(x.sec || 0);
    var s = (x.judge && x.judge.s >= 0) ? x.judge.s : 5;
    if (!best[k] || s > best[k].s) best[k] = { s: s, x: x };
  }
  var items = [];
  var keys = Object.keys(best).sort(function (a, b) { return Number(a) - Number(b); });
  for (var j = 0; j < keys.length; j++) {
    var y = best[keys[j]].x;
    items.push({ fileId: y.fileId, n: j + 1, at: Number(y.sec) || 0, kind: 'صحنه',
                 heading: '', cardTitle: String(y.caption || ''), caption: String(y.caption || '') });
  }
  lvWrite_(folder, { v: 2, mode: 'scenes', style: d.style, at: nowStr_(),
                     want: d.scenes.length, ready: items.length, made: Number(d.made) || 0,
                     tries: 1, done: true, items: items });
}

/**
 * آیا این ویدئو می‌تواند عمومی شود؟ — **یک تعریف**، برای هر دو درِ انتشار
 * (`ytUploadOne_` و `ytRedoOne_`). سدی که فقط سرِ یکی از راه‌ها باشد، از راهِ
 * دیگر دور زده می‌شود (۷.۱۴: ویدئوهای گیرکرده را شبانه همان دوم عمومی می‌کرد).
 *   • حالتِ صحنه + سنجشِ رانر رد ⇒ نه، با علت.
 *   • حالتِ صحنه + هنوز کمتر از `YT_SCENES_APPROVE` ویدئوی تأییدشده ⇒ تا
 *     کلیدش در `docs/yt-approve.json` ننشیند، نه.
 *   • حالت‌های دیگر ⇒ همان رفتارِ قبل (این تابع فقط نشتی را نمی‌سنجد).
 */
function ytPublicGate_(key, m) {
  try {
    if (!m || String(m.mode || '') !== 'scenes') return { ok: true, why: '' };
    var qa = m.qa || null;
    if (!qa) return { ok: false, why: 'سنجشِ خودکارِ رانر برای این ویدئو ثبت نشده' };
    if (qa.ok !== true) {
      return { ok: false, why: 'سنجشِ خودکارِ ویدئو رد کرد: ' + String(qa.why || '').slice(0, 160) };
    }
    var need = Math.max(0, Number(CFG.YT_SCENES_APPROVE) || 0);
    var n = Number(props_().getProperty(PK.YT_SCENES_OK) || 0) || 0;
    if (n < need && !ytApproved_()[String(key)]) {
      return { ok: false, approval: true,
               why: 'منتظرِ تأییدِ نخستین ویدئوهای حالتِ صحنه (' + n + ' از ' + need + ')' };
    }
    return { ok: true, why: '' };
  } catch (e) { return { ok: false, why: 'سدِ انتشار خوانده نشد: ' + e.message }; }
}

var YT_APPROVED_ = null;
/** مهلتِ دورِ جاریِ انتشار (ms از ۱۹۷۰)؛ صفر یعنی «نامعلوم». */
var _ytRunDeadline = 0;

/**
 * آیا در این دورِ انتشار هنوز وقتِ یک فراخوانِ دیگرِ مدل هست؟ (۸.۳۴)
 * بیرون از دور (منو، بازسازی) مهلتی نیست و همیشه «بله». `YT_VIS_ASK_MIN_MS`
 * بدترین زمانِ یک پرسشِ تصویر با سقفِ دقیقش است؛ تا ۸.۳۳ هیچ پرسشی این را
 * نمی‌پرسید و دورِ ۱۵۰ ثانیه‌ای شش دقیقه می‌دوید تا کشته شود.
 */
function ytVisTimeOk_() {
  if (!(_ytRunDeadline > 0)) return true;
  var need = Math.max(10000, Number(CFG.YT_VIS_ASK_MIN_MS) || 60000);
  return new Date().getTime() + need <= _ytRunDeadline;
}
/** کلیدهای تأییدشده از `docs/yt-approve.json` — یک خواندن در هر اجرا. */
function ytApproved_() {
  if (YT_APPROVED_) return YT_APPROVED_;
  var out = {};
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.YT_APPROVE_FILE || 'docs/yt-approve.json'),
                                { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) {
      var dd = JSON.parse(res.getContentText());
      var it = (dd && dd.items) || {};
      for (var k in it) if (Object.prototype.hasOwnProperty.call(it, k) && it[k]) out[k] = true;
    }
  } catch (e) {}
  YT_APPROVED_ = out;
  return out;
}

/** همان `ytApproved_`، بی پرتاب — ترتیب‌دادن نباید به خواندنِ فایلی از گیت‌هاب بند باشد. */
function ytApprovedSafe_() {
  try { return ytApproved_() || {}; } catch (e) { return {}; }
}

/** کلیدهای تأییدشده‌ای که عمومی شده‌اند (۸.۴۶) — تا درِ دوم هر ساعت سراغشان نرود. */
function ytApprDone_() {
  try {
    var v = JSON.parse(props_().getProperty(PK.YT_APPR_DONE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}
function ytApprDoneAdd_(key) {
  try {
    var v = ytApprDone_();
    if (v.indexOf(String(key)) === -1) v.push(String(key));
    props_().setProperty(PK.YT_APPR_DONE, JSON.stringify(v.slice(-200)));
  } catch (e) {}
}

/**
 * درِ دومِ ویدئوی تأییدشده (۸.۴۶). تنها راهِ عمومی‌شدنِ ویدئوی Unlistedِ منتشرشده
 * `ytRedoStuckNightly_` بود — در کارِ شبانه، پشتِ `ytLeft()`. شبی که کارِ شبانه
 * پیش از بلوکِ یوتیوب بمیرد (۴ و ۵ اکتبر هر دو مردند)، ویدئویی که صاحبِ برنامه
 * خواسته عمومی شود یک روزِ دیگر Unlisted می‌مانَد. ۷٫۴۶ همین را نوشت: درمان
 * روی راهی که پیموده نمی‌شود.
 *
 * ارزان است چون **کم‌کار** است: یک خواندنِ فایلِ کوچکِ گیت‌هاب، و هاب فقط وقتی
 * باز می‌شود که کلیدِ تأییدشده‌ای هست که هنوز «عمومی شد» ثبت نشده — یعنی فقط
 * میانِ تأیید و انتشار، نه هر ساعت برای همیشه.
 */
function ytApprovedRedo_(budgetMs) {
  var out = { checked: 0, cleared: 0, why: [] };
  if (!ytOn_()) return out;
  var appr = ytApprovedSafe_(), done = ytApprDone_(), want = [];
  for (var k in appr) {
    if (Object.prototype.hasOwnProperty.call(appr, k) && done.indexOf(k) === -1) want.push(k);
  }
  if (!want.length) return out;
  var t0 = new Date().getTime(), budget = Math.max(15000, Number(budgetMs) || 60000);
  var pub = ytPublished_(getHub_());
  var fin = CFG.YT_PRIVACY_FINAL || 'public';
  for (var i = 0; i < want.length && out.checked < 2; i++) {
    var r = pub[want[i]];
    if (!r || !r.videoId) continue;              // هنوز منتشر نشده: راهِ آپلود خودش سد را می‌پرسد
    if (String(r.privacy || '') === fin) { ytApprDoneAdd_(want[i]); continue; }
    if (new Date().getTime() - t0 > budget) break;
    out.checked++;
    var parts = want[i].split(':');
    try {
      var res = ytRedoOne_(parts[0], parts.slice(1).join(':'), {});
      if (res.ok && res.changed.indexOf('عمومی شد') !== -1) { out.cleared++; ytApprDoneAdd_(want[i]); }
      else out.why.push(want[i] + ': ' + String(res.why || 'عمومی نشد، بی علتِ ثبت‌شده').slice(0, 160));
    } catch (e) { out.why.push(want[i] + ': ' + String(e.message).slice(0, 120)); }
  }
  if (out.checked) {
    logLine_('یوتیوب — ویدئوی تأییدشده: ' + out.checked + ' سنجیده شد، ' + out.cleared + ' عمومی شد' +
             (out.why.length ? ' · نه: ' + out.why.join(' · ') : '') + '.');
  }
  return out;
}

/** یک ویدئوی حالتِ صحنه عمومی شد ⇒ شمارِ سدِ تأیید. */
function ytScenesOkAdd_() {
  try {
    var n = Number(props_().getProperty(PK.YT_SCENES_OK) || 0) || 0;
    props_().setProperty(PK.YT_SCENES_OK, String(n + 1));
  } catch (e) {}
}

/**
 * ══ کاورِ یک ویدئو — یک تعریف برای آپلود و بازسازی (۸.۵۴) ══
 *
 * ۸.۳۱ گفت «کاورِ رانر (نقاشیِ خودِ درس + عنوان) بر کارتِ اسلایدز مقدم است» و
 * همین را **فقط در مسیرِ آپلود** گذاشت. `ytRedoOne_` — که ویدئوی Unlisted را
 * عمومی می‌کند — هنوز همیشه کارتِ اسلایدز را می‌ساخت و با `thumbnails.set`
 * رویِ ویدئو می‌نشاند. ۶ اکتبر ساعتِ ۰۲:۵۹ موتور درس‌های ۳۸ و ۳۹ را پس از
 * تأیید عمومی کرد و **کاورِ نقاشیِ هر دو را با کارتِ سرمه‌ایِ قدیم عوض کرد**.
 * صاحبِ برنامه روزِ قبل کاورِ درست را دیده بود و فردایش در استودیو کاورِ دیگری
 * دید. همان «دوقلویی که یک بار درست شود، یک بار درست شده است» (۵.۹۵).
 *
 * حالا هر دو راه از همین تابع می‌پرسند، و کارتِ اسلایدز فقط وقتی ساخته می‌شود
 * که نقاشی نیست (`cardFn` تنبل است: ساختنِ کارت چند فراخوانِ اسلایدز است).
 * @return {{blob:Blob, painted:boolean, src:string}|null}
 */
function ytThumbFor_(key, cardFn) {
  var rme = null;
  try { rme = (ytRenderMapCached_() || {})[String(key)] || null; } catch (eM) { rme = null; }
  var b = null;
  try { b = ytRenderThumb_(rme); } catch (eB) { b = null; }
  if (b) return { blob: b, painted: true, src: String(rme.thumb) };
  var c = null;
  try { c = cardFn ? cardFn() : null; } catch (eC) { c = null; }
  return c && c.blob ? { blob: c.blob, painted: false, src: '' } : null;
}

/** دفترِ کاورهای نقاشی که واقعاً روی ویدئو نشستند: {کلید: نشانیِ کاور}. */
function ytThumbPaint_() {
  try {
    var m = JSON.parse(props_().getProperty(PK.YT_THUMB_PAINT) || '{}');
    return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  } catch (e) { return {}; }
}
function ytThumbPaintSet_(key, src) {
  try {
    var m = ytThumbPaint_();
    if (src) m[String(key)] = String(src); else delete m[String(key)];
    var ks = Object.keys(m);
    var cap = Math.max(20, Number(CFG.YT_THUMB_PAINT_KEEP) || 200);
    for (var i = 0; i < ks.length - cap; i++) delete m[ks[i]];
    props_().setProperty(PK.YT_THUMB_PAINT, JSON.stringify(m));
  } catch (e) {}
}

/**
 * ══ برگرداندنِ کاورِ نقاشی روی ویدئوهایی که کاورش گم شد (۸.۵۴) ══
 * «پاک‌کردنِ ورودی آنچه را نوشته شده درست نمی‌کند» (۵.۹۵): درست‌کردنِ
 * `ytRedoOne_` درس‌های ۳۸ و ۳۹ را که کاورشان همین امروز عوض شد برنمی‌گرداند.
 * پس هر ویدئوی منتشرشده‌ای که رانر برایش کاورِ نقاشی ساخته و در دفتر نیست،
 * یک بار کاورِ نقاشی‌اش را می‌گیرد. هزینه کران دارد: فقط وقتی نامزدی هست هاب
 * باز می‌شود، و هر اجرا تا `YT_THUMB_FIX_MAX` ویدئو.
 */
function ytThumbRestore_(budgetMs) {
  var out = { checked: 0, fixed: 0, why: [] };
  if (!ytOn_() || CFG.YT_THUMB === false) return out;
  var rm = null;
  try { rm = ytRenderMapCached_() || {}; } catch (eR) { return out; }
  var led = ytThumbPaint_(), cand = [];
  for (var k in rm) {
    if (!Object.prototype.hasOwnProperty.call(rm, k)) continue;
    var t = rm[k] && rm[k].thumb ? String(rm[k].thumb) : '';
    if (t && led[k] !== t) cand.push(k);
  }
  if (!cand.length) return out;
  var t0 = new Date().getTime(), budget = Math.max(15000, Number(budgetMs) || 40000);
  var pub = ytPublished_(getHub_());
  var yt = ytSvc_();
  if (!yt) return out;
  var max = Math.max(1, Number(CFG.YT_THUMB_FIX_MAX) || 2);
  for (var i = 0; i < cand.length && out.checked < max; i++) {
    var r = pub[cand[i]];
    if (!r || !r.videoId) continue;              // هنوز منتشر نشده: راهِ آپلود خودش نقاشی را می‌نشاند
    if (new Date().getTime() - t0 > budget) break;
    out.checked++;
    var th = ytThumbFor_(cand[i], null);
    if (!th || !th.painted) { out.why.push(cand[i] + ': کاورِ نقاشی خوانده نشد'); continue; }
    if (!ytQuotaTake_(YT_COST.thumbSet, false)) { out.why.push('سهمیه'); break; }
    try {
      yt.Thumbnails.set(r.videoId, th.blob);
      ytThumbPaintSet_(cand[i], th.src);
      out.fixed++;
    } catch (eT) { out.why.push(cand[i] + ': ' + String(eT.message).slice(0, 80)); }
  }
  if (out.checked) {
    logLine_('یوتیوب — کاورِ نقاشی: ' + out.checked + ' ویدئو سنجیده شد، ' + out.fixed +
             ' کاورش برگشت' + (out.why.length ? ' · نه: ' + out.why.join(' · ') : '') + '.');
  }
  return out;
}

/* ══ آنچه بیننده می‌بیند، نه آنچه ما نوشتیم (۸.۵۵) ══
 *
 * صاحبِ برنامه پرسید «اگر نمی‌گفتم، می‌فهمیدی کاورِ درس‌های ۳۸ و ۳۹ عوض شده؟».
 * نه: هیچ سنجه‌ای کاورِ **عمومیِ** یک ویدئو را نگاه نمی‌کرد. دفترِ ۸.۵۴
 * (`YT_THUMB_PAINT`) می‌گوید ما چه گذاشتیم — همان راهی که پیش‌تر یک بار بی‌صدا
 * عوض شد. این تابع کاوری را که یوتیوب **الان** نشان می‌دهد (i.ytimg.com، بی
 * سهمیه) کنارِ نقاشیِ رانر به مدل نشان می‌دهد و می‌پرسد «همان است؟». «نه» یعنی
 * از دفتر پاک شود تا `ytThumbRestore_` همان دور برش گرداند. «ندیدم» یعنی کاری نکن
 * و بگو (۷.۶۸): بازگرداندنِ کاورِ درست هزینهٔ سهمیه دارد و حدس دلیلش نیست.
 */
function ytThumbAuditMap_() {
  try { return JSON.parse(props_().getProperty(PK.YT_THUMB_AUDIT) || '{}') || {}; }
  catch (e) { return {}; }
}

function ytThumbAudit_(budgetMs) {
  var out = { checked: 0, same: 0, bad: 0, unsure: 0, why: [] };
  if (!ytOn_() || CFG.YT_THUMB === false || CFG.YT_THUMB_AUDIT_ON === false) return out;
  var rm = null;
  try { rm = ytRenderMapCached_() || {}; } catch (eR) { return out; }
  var m = ytThumbAuditMap_(), now = new Date().getTime();
  var every = Math.max(1, Number(CFG.YT_THUMB_AUDIT_EVERY_DAYS) || 7) * 86400000;
  var cand = [];
  for (var k in rm) {
    if (!Object.prototype.hasOwnProperty.call(rm, k) || k === '__last') continue;
    if (!(rm[k] && rm[k].thumb)) continue;
    var last = parseWhen_(String((m[k] || {}).at || ''));
    if (!isNaN(last) && now - last < every) continue;
    cand.push({ k: k, t: isNaN(last) ? 0 : last });
  }
  if (!cand.length) return out;
  cand.sort(function (a, b) { return a.t - b.t; });
  var pub = ytPublished_(getHub_());
  var t0 = now, budget = Math.max(10000, Number(budgetMs) || 30000);
  var max = Math.max(1, Number(CFG.YT_THUMB_AUDIT_N) || 2);
  var fetchImg = function (u) {
    try {
      var r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
      if (r.getResponseCode() !== 200) return null;
      var b = r.getBlob(), sz = ytImgSize_(b);
      return sz ? { blob: b, sz: sz } : null;
    } catch (e) { return null; }
  };
  for (var i = 0; i < cand.length && out.checked < max; i++) {
    var key = cand[i].k, p = pub[key];
    if (!p || !p.videoId) continue;
    if (new Date().getTime() - t0 > budget) break;
    var ours = fetchImg(String(rm[key].thumb));
    var live = fetchImg('https://i.ytimg.com/vi/' + encodeURIComponent(p.videoId) + '/maxresdefault.jpg') ||
               fetchImg('https://i.ytimg.com/vi/' + encodeURIComponent(p.videoId) + '/hqdefault.jpg');
    out.checked++;
    var rec = { at: nowStr_(), v: '?', why: '' };
    if (!ours || !live) {
      rec.why = !ours ? 'نقاشیِ رانر خوانده نشد' : 'کاورِ عمومیِ یوتیوب خوانده نشد';
      out.unsure++; m[key] = rec; out.why.push(key + ': ' + rec.why); continue;
    }
    var verdict = '';
    try {
      var parts = [{ text: 'تصویرِ اول کاوری است که برای یک ویدئوی یوتیوب ساخته شده (یک نقاشی با ' +
        'عنوانِ فارسی). تصویرِ دوم چیزی است که یوتیوب همین حالا برای همان ویدئو نشان می‌دهد. ' +
        'آیا تصویرِ دوم **همان** تصویرِ اول است (فقط اندازه، کیفیت یا نوارِ سیاهِ کناره فرق دارد)؟ ' +
        'اگر تصویرِ دوم کارتِ دیگری، رنگِ ساده یا قابی از خودِ ویدئو است، «نه». فقط یک واژه: بله یا نه.' },
        { inlineData: { mimeType: ours.sz.mime, data: Utilities.base64Encode(ours.blob.getBytes()) } },
        { inlineData: { mimeType: live.sz.mime, data: Utilities.base64Encode(live.blob.getBytes()) } }];
      verdict = String(extractText_(geminiShort_(parts, { min: 1024, think: 128 })) || '').trim();
    } catch (eJ) { verdict = ''; rec.why = 'داوری نشد: ' + String(eJ.message).slice(0, 80); }
    if (/^\s*(بله|yes)/i.test(verdict)) { rec.v = 'ok'; out.same++; }
    else if (/^\s*(نه|خیر|no)/i.test(verdict)) {
      rec.v = 'bad'; rec.why = 'کاورِ عمومی نقاشیِ درس نیست'; out.bad++;
      out.why.push(key + ': کاورِ عمومی عوض شده بود — برمی‌گردد');
      ytThumbPaintSet_(key, '');                 // تا `ytThumbRestore_` همین دور برش گرداند
    } else {
      rec.why = rec.why || ('داور جوابِ روشن نداد' + (verdict ? ': «' + verdict.slice(0, 30) + '»' : ''));
      out.unsure++; out.why.push(key + ': ' + rec.why);
    }
    m[key] = rec;
  }
  m.__last = { at: nowStr_(), checked: out.checked, same: out.same, bad: out.bad, unsure: out.unsure };
  var ks = Object.keys(m);
  for (var j = 0; j < ks.length - 160; j++) if (ks[j] !== '__last') delete m[ks[j]];
  try { props_().setProperty(PK.YT_THUMB_AUDIT, JSON.stringify(m)); } catch (eS) {}
  if (out.checked) {
    logLine_('یوتیوب — کاورِ عمومی سنجیده شد: ' + out.checked + ' ویدئو، ' + out.same + ' همان نقاشی، ' +
             out.bad + ' عوض‌شده' + (out.unsure ? '، ' + out.unsure + ' نامعلوم' : '') +
             (out.why.length ? ' · ' + out.why.join(' · ') : '') + '.');
  }
  return out;
}

/** خطِ روزانهٔ «آنچه بیننده می‌بیند» — از شاهدِ آخرین سنجش، بی هیچ خواندنِ تازه. */
function ytThumbAuditLine_() {
  var m = ytThumbAuditMap_(), L = m.__last;
  var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (e) { return String(n); } };
  if (!L) return 'کاورِ عمومیِ ویدئوها: هنوز سنجیده نشده.';
  var bad = [];
  for (var k in m) if (k !== '__last' && m[k] && m[k].v === 'bad') bad.push(k);
  return 'کاورِ عمومیِ ویدئوها (آنچه بیننده می‌بیند): آخرین سنجش ' + L.at + ' — ' + fa(L.checked) +
         ' ویدئو، ' + fa(L.same) + ' همان نقاشی' + (L.bad ? '، ' + fa(L.bad) + ' عوض‌شده که برگردانده شد' : '') +
         (L.unsure ? '، ' + fa(L.unsure) + ' نامعلوم' : '') + (bad.length ? ' (' + bad.slice(0, 4).join('، ') + ')' : '') + '.';
}

/**
 * کاورِ ساخته‌شده در رانر (نقاشی + عنوان)، اگر هست. بایت‌ها سنجیده می‌شوند،
 * نه نشانی؛ و بیش از ۲ مگابایت را یوتیوب نمی‌پذیرد.
 */
function ytRenderThumb_(m) {
  try {
    var u = m && m.thumb ? String(m.thumb) : '';
    if (!/^https:\/\//.test(u)) return null;
    var res = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    var b = res.getBlob(), by = b.getBytes();
    if (by.length < 5000 || by.length > 2 * 1024 * 1024) return null;
    var jpg = (by[0] & 0xFF) === 0xFF && (by[1] & 0xFF) === 0xD8;
    var png = (by[0] & 0xFF) === 0x89 && (by[1] & 0xFF) === 0x50;
    if (!jpg && !png) return null;
    return b.setContentType(jpg ? 'image/jpeg' : 'image/png');
  } catch (e) { return null; }
}

/**
 * شناسه، نام و تصویرِ کانال — **از خودِ یوتیوب**، نه از یک خانهٔ تنظیم.
 *
 * نگارشِ اولِ ۸.۰۱ `YT_MARK_HANDLE` را خالی گذاشت و از صاحبِ برنامه خواست
 * پُرش کند. او درست پرسید «مگر دسترسی داده نشده؟» — داده شده بود:
 * `ytChannelInfo_` از روزِ اول `snippet` را می‌خواند و `customUrl` همان
 * شناسه است. یعنی یک تنظیمِ دستی ساخته بودم برای چیزی که موتور می‌داند.
 * این دقیقاً همان شکلی است که این پرونده بارها نوشته: **گیتی که آدم باید
 * بازش کند، گیت نیست** — و بدترش، گیتی که لازم نبوده باشد.
 *
 * نتیجه در حافظه می‌مانَد، چون این تابع به ازای هر قسمت صدا زده می‌شود و
 * `channels.list` یک واحد سهمیه دارد: رایگان نیست و لازم هم نیست.
 * `CFG.YT_MARK_HANDLE` اگر پر باشد **برنده است** — یک درِ دستی برای وقتی
 * که یوتیوب چیزِ دیگری برگرداند.
 */
function ytChannelMark_() {
  var cached = null;
  try { cached = JSON.parse(props_().getProperty(PK.YT_MARK_ID) || 'null'); } catch (e) {}
  var days = Math.max(1, Number(CFG.YT_MARK_REFRESH_DAYS) || 14);
  /* ══ تابعی که هرگز تعریف نشده بود (۸.۴۵) ══
     تا ۸.۴۴ این‌جا `daysSince_` صدا زده می‌شد — نامی که هیچ‌جای موتور تعریف
     نداشت. نخستین بار (بی کش) از این خط رد می‌شد و نشان ساخته و ذخیره می‌شد؛ از
     آن پس هر بار ReferenceError، که `ytMarkSpec_` می‌بلعید و `null` برمی‌گرداند.
     پس فقط **نخستین** ویدئو نشانِ کانال داشت (درسِ ۵۹) و درسِ ۳۸ (قسمتِ ۶۰) با
     `mark: null` ساخته شد — بی هیچ خطایی. `run_wiring_test.js` ۱۳ حالا هر
     فراخوانِ نامِ خصوصیِ تعریف‌نشده را می‌گیرد. */
  var age = cached && cached.at ? (parseWhen_(nowStr_()) - parseWhen_(cached.at)) / 86400000 : NaN;
  if (cached && cached.at && age >= 0 && age < days) return cached;
  var r = ytChannelInfo_();
  if (!r || !r.info) return cached;                  // نشد ⇒ کهنه بهتر از هیچ
  var sn = r.info.snippet || {};
  var th = (sn.thumbnails || {});
  var img = (th.medium || th.high || th.default || {}).url || '';
  var out = { handle: String(sn.customUrl || '').trim(),
              name: String(sn.title || '').trim(),
              logoUrl: String(img || ''), at: nowStr_() };
  if (!out.handle && !out.name) return cached;
  try { props_().setProperty(PK.YT_MARK_ID, JSON.stringify(out)); } catch (e2) {}
  return out;
}

/**
 * نشانِ کانال. خاموش‌بودنش یک **تصمیم** است، نه خرابی.
 * شناسه از یوتیوب می‌آید؛ نبودنش یعنی هنوز نتوانسته‌ایم بخوانیم، و آن‌وقت
 * نشان کشیده نمی‌شود — نشانی بی شناسه هیچ‌کس را به کانال نمی‌رساند و فقط
 * جای خالیِ تصویر را می‌گیرد.
 */
function ytMarkSpec_() {
  if (CFG.YT_MARK !== true) return null;
  var ch = null;
  try { ch = ytChannelMark_(); } catch (e) {}
  var h = String(CFG.YT_MARK_HANDLE || (ch && ch.handle) || '').trim();
  if (h && h.charAt(0) !== '@') h = '@' + h;
  if (!h) return null;
  return { handle: h,
           name: String(CFG.YT_MARK_NAME || (ch && ch.name) || CFG.SPECIAL_SHOW_NAME || ''),
           logoUrl: String((ch && ch.logoUrl) || ''),
           everySec: Math.max(60, Number(CFG.YT_MARK_MOVE_SEC) || 180),
           opacity: Math.max(0.2, Math.min(0.9, Number(CFG.YT_MARK_OPACITY) || 0.6)) };
}


/**
 * سطحِ تصویرسازیِ یک مجموعه: «خاموش» | «کم» | «زیاد».
 *
 * خانهٔ خالی «کم» است، نه «خاموش» — پیش‌فرضی که قابلیت را خاموش کند یعنی
 * چیزی ساخته‌ایم که هیچ‌کس نمی‌بیندش مگر یک کارِ دستی انجام دهد، و این
 * پرونده بارها نوشته که «گیتی که آدم باید بازش کند، گیت نیست».
 * نوشتهٔ ناخوانا هم «کم» است، نه خطا: یک غلطِ تایپی نباید قسمت را بی‌تصویر کند.
 */
/**
 * ══ «کم» و «زیاد» چیزی به کسی نمی‌گویند (۸٫۱۶) ══
 *
 * صاحبِ برنامه جلوِ همین منو ایستاد و گفت: «کم و زیاد و خاموش کلماتِ
 * کلیشه‌ای و گنگی هستن». حق داشت — اینها **اندازه** را می‌گویند، نه
 * **نتیجه** را، و کسی که نمی‌داند لایهٔ ۳ چیست از «زیاد» هیچ نمی‌فهمد.
 *
 * یک تعریف، و هر سه جا از همین می‌خوانند: جعبهٔ تخته، رسیدِ ثبت، و خطِ
 * روزانه. دو متنِ جدا برای یک معنا یعنی روزی یکی کهنه می‌شود و منو چیزی
 * می‌گوید که رسید نقضش می‌کند.
 *
 * و **وضعیتِ امروزِ لایهٔ ۳ در متن می‌آید**، چون «زیاد» وقتی نقاشی خاموش
 * است یک وعدهٔ توخالی است و همان شکایتِ «مثل روزهای قبل» را می‌سازد.
 */
function lvLevelWhat_(level, gen) {
  var g = (gen === undefined) ? null : !!gen;
  if (g === null) { try { g = lvGenOn_() === true; } catch (e) { g = false; } }
  var s = String(level || '');
  if (s === 'خاموش') return 'بدونِ کارت — ویدئو همان کاورِ ثابت می‌مانَد';
  if (s === 'زیاد') {
    return g ? 'برای هر کارت یک تصویرِ ساخته‌شده'
             : 'برای هر کارت یک تصویرِ ساخته‌شده — ولی الان فقط کارتِ متنی (نقاشی خاموش)';
  }
  if (s === 'کم') {
    return g ? 'کارتِ متنی + چند تصویرِ ساخته‌شده در نقاطِ کلیدی'
             : 'کارتِ متنی + چند تصویرِ ساخته‌شده — ولی الان فقط کارتِ متنی (نقاشی خاموش)';
  }
  return '';
}

function lvLevelOf_(vals) {
  var def = String(CFG.LV_LEVEL_DEFAULT || 'کم');
  try {
    var raw = String((vals || [])[SC.LVLEVEL - 1] || '').trim();
    if (!raw) return def;
    var n = raw.replace(/‌/g, ' ').replace(/\s+/g, ' ');
    var list = CFG.LV_LEVELS || ['خاموش', 'کم', 'زیاد'];
    for (var i = 0; i < list.length; i++) if (n === list[i]) return list[i];
    if (/خاموش|هیچ|بی.?تصویر|غیرفعال/.test(n)) return 'خاموش';
    if (/زیاد|همه|کامل|حداکثر/.test(n)) return 'زیاد';
    return def;
  } catch (e) { return def; }
}

/** سطحِ تصویرسازیِ مجموعهٔ همین قسمت — یک تعریف، مثل `lvStyleAt_`. */
/**
 * ══ سبک و سطح از کجا آمد — تخته، یا «خودکار» یعنی انتخابِ مدل (۸.۳۰) ══
 * صاحبِ برنامه خواست ویدئو «مطابقِ تنظیماتی که برای هر درس‌نامه در تختهٔ
 * مجموعه‌ها ثبت شده» ساخته شود. `lvStyleAt_` و `lvLevelAt_` از ۸.۱۸ همین را
 * می‌کنند — ولی هیچ‌جا ثبت نمی‌شد کدام راه رفت، و مجموعه‌ای که در رجیستری پیدا
 * نشود **بی‌صدا** به انتخابِ مدل می‌افتاد. این تابع جوابِ همان پرسش است و به
 * ردیفِ عمومیِ رندر می‌رود؛ فقط خواندن، هیچ نوشتنی.
 */
function lvBoardSrc_(hub, item, meta) {
  var out = { found: false, style: '', level: '', styleSrc: '', levelSrc: '' };
  try {
    var reg = readSeriesReg_(hub || getHub_());
    var rec = reg.byKey[String((item && item.seriesKey) || '')] ||
              reg.byKey[String((meta && meta.seriesKey) || '')] || null;
    if (!rec) {
      out.styleSrc = out.levelSrc = 'مجموعه در رجیستری پیدا نشد — انتخابِ مدل';
      return out;
    }
    out.found = true;
    out.style = String(rec.vals[SC.LVSTYLE - 1] || '').trim();
    out.level = String(rec.vals[SC.LVLEVEL - 1] || '').trim();
    var st = lvStyleOf_(rec.vals);
    var auto = st.src === 'خودکار' || st.src === 'پیشنهاد' || st.src === 'پیشنهاد (خانه خوانده نشد)' ||
               lvStyleOurs_(rec.vals, out.style);
    out.styleSrc = auto ? 'تخته: خودکار ⇒ انتخابِ مدل' : 'تخته';
    out.levelSrc = lvLevelAuto_(rec.vals) ? 'تخته: خودکار ⇒ انتخابِ مدل' : 'تخته';
  } catch (e) { out.styleSrc = out.levelSrc = 'خوانده نشد: ' + e.message; }
  return out;
}

function lvLevelAt_(hub, item, meta, look) {
  var mdl = String((look && look.level) || '');
  try {
    var reg = readSeriesReg_(hub || getHub_());
    var rec = reg.byKey[String((item && item.seriesKey) || '')] ||
              reg.byKey[String((meta && meta.seriesKey) || '')] || null;
    if (rec) {
      /* ══ خانهٔ خالی و «خودکار» هر دو یعنی «تو تصمیم بگیر» (۸٫۱۸) ══
         تا امروز خالی مستقیم `LV_LEVEL_DEFAULT` می‌شد، پس ۲۶۴ مجموعه‌ای که
         او هیچ‌وقت دستشان نزده همیشه «کم» می‌گرفتند و هیچ تشخیصی در کار
         نبود. سطحی که او **خودش** نوشته همچنان از همه مقدم است. */
      if (lvLevelAuto_(rec.vals) && mdl) return mdl;
      return lvLevelOf_(rec.vals);
    }
  } catch (e) {}
  if (mdl) return mdl;
  return String(CFG.LV_LEVEL_DEFAULT || 'کم');
}

/** خانهٔ سطح به موتور سپرده شده؟ (خالی یا «خودکار») — یک تعریف، سه خواننده. */
function lvLevelAuto_(vals) {
  try {
    var raw = String((vals || [])[SC.LVLEVEL - 1] || '').trim();
    if (!raw) return true;
    return lvStyleNorm_(raw) === lvStyleNorm_('خودکار');
  } catch (e) { return true; }
}

/**
 * سهمِ صحنه‌های نوشته‌دارِ یک مجموعه، از ستونِ «نوشته روی تصویر» (۸.۴۵).
 * خالی یا «خودکار» ⇒ `LV_TEXT_DEFAULT`؛ نوشتهٔ ناشناخته ⇒ همان پیش‌فرض، نه خطا —
 * یک غلطِ تایپی نباید قسمت را بی‌نوشته یا پرنوشته کند.
 * @return {{v:string, share:number, src:string}}
 */
function lvTextAt_(hub, item, meta) {
  var def = String(CFG.LV_TEXT_DEFAULT || 'خودکار');
  var tab = CFG.LV_TEXT_SHARE || {};
  var shareOf = function (v) { var x = Number(tab[v]); return isNaN(x) ? Number(tab[def]) || 0 : x; };
  try {
    var reg = readSeriesReg_(hub || getHub_());
    var rec = reg.byKey[String((item && item.seriesKey) || '')] ||
              reg.byKey[String((meta && meta.seriesKey) || '')] || null;
    if (rec) {
      var raw = String((rec.vals || [])[SC.LVTEXT - 1] || '').trim();
      if (raw && tab.hasOwnProperty(raw)) return { v: raw, share: shareOf(raw), src: 'تخته' };
      return { v: def, share: shareOf(def), src: raw ? 'تخته: ناشناخته ⇒ پیش‌فرض' : 'تخته: خالی ⇒ پیش‌فرض' };
    }
  } catch (e) {}
  return { v: def, share: shareOf(def), src: 'مجموعه پیدا نشد ⇒ پیش‌فرض' };
}

/**
 * جان‌بخشیِ نقاشی‌های یک مجموعه، از ستونِ «جان‌بخشیِ تصویر» (۸.۵۴).
 * خالی یا «خودکار» ⇒ `LV_MOTION_DEFAULT`؛ نوشتهٔ ناشناخته ⇒ همان پیش‌فرض، نه خطا.
 * کلیدهای سراسری بالاترند: `LV_CLIP_ON: false` یعنی هیچ کلیپی، هرچه تخته بگوید.
 * @return {{v:string, clip:boolean, focus:boolean, src:string}}
 */
function lvMotionAt_(hub, item, meta) {
  var def = String(CFG.LV_MOTION_DEFAULT || 'کامل');
  var tab = CFG.LV_MOTION_WHAT || {};
  var of = function (v, src) {
    var w = tab[v] || tab[def] || { clip: true, focus: true };
    return { v: v, clip: !!w.clip, focus: !!w.focus, src: src };
  };
  try {
    var reg = readSeriesReg_(hub || getHub_());
    var rec = reg.byKey[String((item && item.seriesKey) || '')] ||
              reg.byKey[String((meta && meta.seriesKey) || '')] || null;
    if (rec) {
      var raw = String((rec.vals || [])[SC.LVMOTION - 1] || '').trim();
      if (raw && tab.hasOwnProperty(raw)) return of(raw, 'تخته');
      return of(def, raw && raw !== 'خودکار' ? 'تخته: ناشناخته ⇒ پیش‌فرض' : 'تخته: خالی ⇒ پیش‌فرض');
    }
  } catch (e) {}
  return of(def, 'مجموعه پیدا نشد ⇒ پیش‌فرض');
}

/** تاریخچه، تازه‌ترین اول. برای ناظر و برای `lvUpgrade_`. */
function lvHistory_(hub, n) {
  var out = [];
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.LV_TAB || 'کاربردِ تصویرها');
    if (!sh || sh.getLastRow() < 2) return out;
    var take = Math.max(1, Number(n) || 30);
    var from = Math.max(2, sh.getLastRow() - take + 1);
    var vals = sh.getRange(from, 1, sh.getLastRow() - from + 1, LV_HEADERS.length).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      out.push({ at: String(vals[i][0]), show: String(vals[i][1]), ep: String(vals[i][2]),
                 series: String(vals[i][3]), style: String(vals[i][4]),
                 want: Number(vals[i][5]) || 0, ready: Number(vals[i][6]) || 0,
                 made: Number(vals[i][7]) || 0, tries: Number(vals[i][8]) || 0,
                 result: String(vals[i][9]), why: String(vals[i][10]),
                 url: String(vals[i][11]), kinds: String(vals[i][12] || ''),
                 gMade: Number(vals[i][13]) || 0, gSpent: Number(vals[i][14]) || 0 });
    }
  } catch (e) {}
  return out;
}

/**
 * **یک** فرصتِ ارتقا برای امروز — نه یک فهرست.
 *
 * ══ چرا این تابع هست ══
 * «ایرادی بود گزارش بده» را یافته‌ها پوشش می‌دهند. «ارتقایی داد گزارش بده»
 * را هیچ‌چیز پوشش نمی‌داد: سیستمی که خراب نیست ولی در حالِ متوسط ساکن
 * مانده، هر روز «سالم» گزارش می‌شود و هیچ‌وقت بهتر نمی‌شود.
 *
 * ══ سه مرز ══
 * **یکی، نه فهرستی.** فهرستی که هر روز ده بند داشته باشد، همان فهرستی است
 * که خوانده نمی‌شود. ترتیبِ بررسی، ترتیبِ اهمیت است و اولین موردِ برقرار
 * برمی‌گردد.
 * **و صریح می‌گوید ایراد نیست.** فرصتی که به‌شکلِ خرابی گزارش شود، اعتمادِ
 * خواننده به مسئله‌های واقعی را می‌خورد.
 * **و هیچ فراخوانِ مدلی ندارد** — همه‌اش از عددهایی است که در دست است.
 */
function lvUpgrade_(hub, st) {
  var out = { text: '', key: '' };
  try {
    if (!st) st = lvStatus_();
    if (!st || !st.on) return out;
    var hist = lvHistory_(hub, 30);

    // ۱) هیچ‌وقت هیچ کارتی ساخته نشده: مهم‌ترین چیزی که می‌شود گفت
    if (!hist.length) {
      out.key = 'lv-none-yet';
      out.text = 'هنوز هیچ قسمتی تصویر نگرفته. اولین درس‌نامه‌ای که برای یوتیوب ' +
                 'نوبتش برسد، کارت‌هایش ساخته می‌شود — اگر چند روز گذشت و این ' +
                 'خط عوض نشد، یعنی صفِ انتشارِ یوتیوب به درس‌نامه نرسیده.';
      return out;
    }

    // ۲) «عکس»‌هایی که کارت شدند: بزرگ‌ترین جهشِ کیفیِ در دسترس
    var photoAsk = 0, total = 0;
    for (var h = 0; h < hist.length; h++) { total += hist[h].want; }
    try {
      var pj = lvPhotoPending_(hub);
      photoAsk = pj;
    } catch (eP) { photoAsk = 0; }
    if (photoAsk > 0) {
      out.key = 'lv-photo-layer';
      out.text = 'در ' + faDigitsOut_(String(photoAsk)) + ' مورد از تصویرهای اخیر، ' +
                 'مدل «عکس» یا «ویدئو» خواسته بود و کارتِ متنی جایش نشست. ' +
                 'لایهٔ عکسِ آزاد (سنجیده و شدنی) همین‌ها را به تصویرِ واقعی بدل می‌کند — ' +
                 'بزرگ‌ترین جهشِ کیفیِ در دسترس، و مجانی.';
      return out;
    }

    // ۳) هیچ «نمودار»ی ساخته نشده: یعنی پرامپت کم می‌خواهد
    var vizN = 0;
    try { vizN = lvKindCount_(hub, 'نمودار'); } catch (eV) { vizN = -1; }
    if (vizN === 0 && hist.length >= 5) {
      out.key = 'lv-no-diagram';
      out.text = 'در ' + faDigitsOut_(String(hist.length)) + ' اجرای اخیر، هیچ ' +
                 '«نمودار»ی ساخته نشده — همه‌اش کارتِ متنی. جایی که رابطه یا روند ' +
                 'مهم‌تر از واژه است، نمودار بهتر جواب می‌دهد؛ ارزشش را دارد که ' +
                 'بندِ مربوط در پرامپتِ تصویرها صریح‌تر شود.';
      return out;
    }

    // ۴) تراکمِ تصویر پایین‌تر از تنظیم است
    var wSum = 0, rSum = 0, n = 0;
    for (var k = 0; k < hist.length; k++) {
      if (!hist[k].want) continue;
      wSum += hist[k].want; rSum += hist[k].ready; n++;
    }
    if (n >= 3 && wSum > 0 && rSum / wSum < 0.9) {
      out.key = 'lv-density';
      out.text = 'در ' + faDigitsOut_(String(n)) + ' قسمتِ اخیر، ' +
                 faDigitsOut_(String(rSum)) + ' از ' + faDigitsOut_(String(wSum)) +
                 ' تصویرِ برنامه‌ریزی‌شده ساخته شد. اگر این نسبت پایین بماند، ' +
                 'بالا بردنِ `LV_BUILD_MAX` یا وارسیِ علتِ ستونِ «علت» همین تب ' +
                 'کیفیتِ پوششِ زمانی را بهتر می‌کند.';
      return out;
    }

    // ۵) همه با سبکِ پیش‌فرض: انتخابِ دستی بهترش می‌کند
    var sty = {};
    for (var s2 = 0; s2 < hist.length; s2++) if (hist[s2].style) sty[hist[s2].style] = 1;
    var styN = 0;
    for (var q in sty) if (Object.prototype.hasOwnProperty.call(sty, q)) styN++;
    if (styN === 1 && hist.length >= 6 && sty[lvStyleDefault_().key]) {
      out.key = 'lv-one-style';
      out.text = 'همهٔ ' + faDigitsOut_(String(hist.length)) + ' اجرای اخیر با سبکِ ' +
                 '«' + lvStyleDefault_().key + '» ساخته شده‌اند. ستونِ «سبکِ تصویر» در ' +
                 'تبِ مجموعه‌ها نُه سبک دارد؛ یک سبکِ متناسب با موضوعِ هر مجموعه، ' +
                 'کانال را شکل می‌دهد.';
      return out;
    }

    // ۶) هیچ فرصتِ مشخصی نیست — و این خودش یک خبر است، نه سکوت
    out.key = 'lv-steady';
    out.text = 'در ' + faDigitsOut_(String(hist.length)) + ' اجرای اخیر چیزی برای ' +
               'ارتقا پیدا نشد: پوشش کامل است و سبک‌ها متنوع‌اند. قدمِ بعدیِ کیفی، ' +
               'لایهٔ تصویرِ ساخته‌شده است که هزینهٔ دلاری دارد و خاموش مانده.';
  } catch (e) { out.text = ''; }
  return out;
}

/** چند مورد از تصویرهای اخیر «عکس/ویدئو» خواسته بودند و کارت شدند. */
function lvPhotoPending_(hub) {
  var n = 0;
  try {
    var hist = lvHistory_(hub, 12);
    for (var i = 0; i < hist.length; i++) {
      // ستونِ «علت» شمارِ جایگزینی را در پایانِ خودش دارد (lvSubNote_)
      var m = String(hist[i].kinds || '').match(/عکس\/ویدئو:\s*(\d+)/);
      if (m) n += parseInt(m[1], 10) || 0;
    }
  } catch (e) {}
  return n;
}

/** چند تصویر از گونهٔ خواسته‌شده در اجراهای اخیر ساخته شده. */
function lvKindCount_(hub, kind) {
  var n = 0;
  try {
    var hist = lvHistory_(hub, 12);
    var re = new RegExp(String(kind) + ':\\s*(\\d+)');
    for (var i = 0; i < hist.length; i++) {
      var m = String(hist[i].kinds || '').match(re);
      if (m) n += parseInt(m[1], 10) || 0;
    }
  } catch (e) {}
  return n;
}

/** خلاصهٔ گونه‌ها برای ستونِ «علت» — تا `lvUpgrade_` بعداً بتواند بشمارد. */
function lvSubNote_(items) {
  var c = {};
  for (var i = 0; i < (items || []).length; i++) {
    var k = String(items[i].kind || 'کارت');
    c[k] = (c[k] || 0) + 1;
  }
  var p = [];
  for (var q in c) if (Object.prototype.hasOwnProperty.call(c, q)) p.push(q + ': ' + c[q]);
  var sub = (c['عکس'] || 0) + (c['ویدئو'] || 0);
  if (sub) p.push('عکس/ویدئو: ' + sub);
  return p.join(' · ');
}

/**
 * به جزوهٔ مجموعه می‌گوید «تصویرهای این درس عوض شده‌اند، از نو بخوان».
 *
 * ══ باگی که این تابع برایش هست (سنجیده، نه حدس) ══
 * `lvCards_` فایلِ هم‌نام را تُرش می‌کند و تازه می‌سازد، پس **شناسهٔ فایل عوض
 * می‌شود**. جزوه شناسه‌ها را در `_HANDOUT.json` کش می‌کند و کشِ ناخالی را
 * دوباره نمی‌خوانَد — یعنی پس از هر بازسازی، تصویرهای جزوه به فایل‌های
 * تُرش‌شده اشاره می‌کنند و **در مرورگر می‌شکنند**، بی هیچ خطایی. سنجیده شد:
 * شناسه از `F16` به `F43` رفت و جزوه همان `F16` را نگه داشت.
 *
 * سه راه بازسازی می‌کند و هر سه از این در می‌گذرند: تعویضِ سبک، روشن‌شدنِ
 * لایهٔ ۳، و دکمهٔ آدم. پاک‌کردنِ ردیفِ همان درس کافی است — `hfigSync_` ورودیِ
 * خالی را همان اجرای بعدی دوباره می‌خوانَد (مرزِ ۲ی خودش).
 *
 * و پوشهٔ مجموعه از **پدرِ پوشهٔ قسمت** پیدا می‌شود، نه از رجیستری: این تابع
 * از دو جا صدا زده می‌شود که یکی‌شان (دکمه) رجیستری در دست ندارد.
 */
function lvHandoutForget_(epFolder, epNum) {
  try {
    var ps = epFolder.getParents();
    if (!ps.hasNext()) return false;
    var sf = ps.next();
    var it = sf.getFilesByName(CFG.HANDOUT_JSON || '_HANDOUT.json');
    if (!it.hasNext()) return false;
    var f = it.next();
    var book = JSON.parse(f.getBlob().getDataAsString());
    if (!book || !book.figs || book.figs[String(epNum)] === undefined) return false;
    delete book.figs[String(epNum)];
    f.setContent(JSON.stringify(book, null, 1));
    logLine_('تصویرهای درسِ ' + epNum + ' عوض شد، پس جزوه از نو می‌خوانَدشان.');
    return true;
  } catch (e) { return false; }
}

/**
 * درِ آدم: تصویرهای یک قسمت را از نو می‌سازد.
 *
 * `ytRedoOne_` از قبل عنوان و کاور را از نو می‌سازد؛ این‌جا **تصویرها**.
 * پوشهٔ تصویرها خالی می‌شود (فایل‌ها به زباله می‌روند، پاک نمی‌شوند — هیچ‌چیز
 * در این مخزن پاک نمی‌شود) و اجرای بعدیِ انتشار از نو می‌سازدشان.
 */
function lvRedoOne_(show, ep) {
  var out = { ok: false, why: '', dropped: 0 };
  try {
    var f = null;
    try { f = ytFolderOf_(show, ep, ''); } catch (eF) { f = null; }
    if (!f) { out.why = 'پوشهٔ قسمت پیدا نشد'; return out; }
    var sub = null;
    try {
      var it = f.getFoldersByName(CFG.LV_FOLDER || 'تصویرها');
      if (it.hasNext()) sub = it.next();
    } catch (eS) {}
    if (sub) {
      var fi = sub.getFiles();
      while (fi.hasNext()) { try { fi.next().setTrashed(true); out.dropped++; } catch (eT) {} }
    }
    /* و پروندهٔ تصویرها هم پاک می‌شود، وگرنه `tries` از اجرای قبلی می‌مانَد و
       قسمتی که سه بار شکست خورده بود، همین‌الان «رهاشده» حساب می‌شود —
       دکمه‌ای که سابقهٔ تلاش را پاک نکند، در نیست (۵٫۸۸/۵٫۹۵). */
    try {
      var jt = f.getFilesByName(lvName_());
      while (jt.hasNext()) jt.next().setTrashed(true);
    } catch (eJ) {}
    try { lvWaitClear_(String(show) + ':' + String(ep)); } catch (eW) {}
    /* و جزوه باید بداند — وگرنه تصویرهایش به فایل‌های تُرش‌شده اشاره می‌کنند. */
    try { lvHandoutForget_(f, ep); } catch (eHF) {}
    out.ok = true;
    logLine_('تصویرهای قسمتِ ' + ep + ' پاک شد (' + out.dropped +
             ' فایل به زباله)؛ اجرای بعدیِ انتشار از نو می‌سازدشان.');
  } catch (e) { out.why = e.message; }
  return out;
}

/** نقشه را می‌سازد یا از روی دیسک برمی‌دارد. `redo` مدل را دوباره می‌پرسد. */
/* ═══════════════ تصویرهای درس (طرح: docs/lesson_visuals_plan.md) ═══════════════
 *
 * ══ چه چیزی این‌جاست و چه چیزی نیست ══
 * این‌جا فقط **تصمیم** گرفته می‌شود: کدام بخش چه تصویری، با چه متنی، با چه
 * سهمی از زمان. آوردنِ عکس، ساختنِ ویدئو و کدگذاری‌اش کارِ رانر است
 * (`tools/render.js`) — همان تقسیمِ کارِ `_YT-RENDER.json` که ۱۸۰ بار دویده.
 * Apps Script نه ffmpeg دارد نه شش دقیقه وقت.
 *
 * ══ و چرا در همین بخش، نه یک بخشِ تازه ══
 * فهرستِ بخش‌ها در ۲۹ جا دستی نوشته شده (`tools/build.js` + `probe_r4_lib.js`
 * + ۲۷ لودرِ آزمون)؛ یک فایلِ تازه یعنی ۲۹ ویرایش و `run_wiring_test.js`
 * ۴٫۱/۴٫۲ اگر یکی جا بمانَد قرمز می‌شود — شکلِ ۵٫۵۲. و مهم‌تر: بخشِ ۲۶
 * (جزوه) امروز **صفر** فراخوان به این بخش دارد و آن مرز باید تمیز بمانَد، پس
 * جزوه `_visuals.json` را خودش می‌خوانَد، نه با فراخوانِ رو به جلو.
 */

/** آیا این نمایش تصویر می‌گیرد؟ فعلاً فقط درس‌نامه، به خواستهٔ صاحبِ برنامه. */
function ytVisOn_(show) {
  if (CFG.LV_ENABLED === false) return false;
  var list = CFG.LV_SHOWS || ['special'];
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]) === String(show)) return true;
  }
  return false;
}

/** چند تصویر برای این مدت. عددِ مدل نیست — از مدتِ واقعیِ قسمت درمی‌آید. */
function ytVisWant_(totalSec) {
  var sec = Math.max(60, Number(totalSec) || 0);
  var mins = sec / 60;
  var n = Math.round(mins * (Number(CFG.LV_PER_MIN) || 0.8));

  /* ══ دو عددی که نوشته شده بودند و به هیچ تصمیمی وصل نبودند (۸.۰۰) ══
   * `LV_MIN_SEC` و `LV_MAX_SEC` از روزِ اول در تنظیم‌ها بودند، با
   * توضیحِ خودشان — «کوتاه‌تر از این، تصویر دیده نمی‌شود» و «بلندتر از
   * این، بیننده خسته می‌شود» — و در **هیچ فایلی** خوانده نمی‌شدند: نه در
   * `src/`، نه در `tools/`، نه در یک سنجه. قاعده نوشته شده بود و کد
   * اجرایش نمی‌کرد؛ همان شکلی که این پرونده بیش از هر شکلِ دیگری ثبت
   * کرده. با اجرای نقشه روی یک قسمتِ واقعی پیدا شد، نه با خواندنِ کد.
   *
   * حالا `LV_PER_MIN` یک **پیشنهاد** است و این دو، مرز:
   *   کف  ⇐ هیچ تصویری کمتر از LV_MIN_SEC روی قاب نمانَد
   *   سقف ⇐ هیچ تصویری بیشتر از LV_MAX_SEC روی قاب نمانَد
   * و اگر این دو با هم نخوانند، **سقف برنده است**: تصویرِ کوتاه یعنی یک
   * کارتِ دیده‌نشده، تصویرِ بلند یعنی یک ویدئوی خسته‌کننده — و اولی
   * برگشت‌پذیر است (کارت در جزوه هست)، دومی نه. */
  var maxSec = Math.max(5, Number(CFG.LV_MAX_SEC) || 90);
  var minSec = Math.max(1, Number(CFG.LV_MIN_SEC) || 8);
  var floorN = Math.ceil(sec / maxSec);          // کمتر از این، کارت‌ها بلند می‌شوند
  var ceilN = Math.floor(sec / minSec);          // بیشتر از این، کارت‌ها کوتاه می‌شوند
  if (ceilN >= floorN) n = Math.min(Math.max(n, floorN), ceilN);
  else n = floorN;

  return Math.max(3, Math.min(Number(CFG.LV_MAX_PER_EP) || 40, n));
}

/**
 * گونه را به فهرستِ شناخته می‌نشاند. **ناشناخته «کارت» می‌شود، نه دورانداخته.**
 *
 * چرا: «کارت» مجانی است و همیشه در دسترس، پس بدترین حالتش یک اسلایدِ متنیِ
 * درست است. دورانداختنِ مورد یعنی یک شکاف در پوششِ زمانی — و قاعدهٔ بی‌شکاف
 * خواستهٔ صریحِ صاحبِ برنامه است.
 */
function ytVisKind_(k) {
  var t = String(k || '').trim();
  var list = CFG.LV_KINDS || ['کارت', 'نمودار', 'عکس', 'ویدئو'];
  for (var i = 0; i < list.length; i++) if (t === list[i]) return t;
  // چند نگارشِ رایجِ مدل
  if (/عکس|تصویرِ? ?واقعی|photo|image/i.test(t)) return 'عکس';
  if (/نمودار|چارت|diagram|chart/i.test(t)) return 'نمودار';
  if (/ویدئو|ویدیو|کلیپ|video|clip/i.test(t)) return 'ویدئو';
  return list[0];
}

/** فهرستی از رشته‌ها، بریده و بی خالی. */
function ytVisList_(a, max, each) {
  var o = [], src = Array.isArray(a) ? a : [];
  for (var i = 0; i < src.length && o.length < (Number(max) || 3); i++) {
    var x = ytVisCut_(src[i], each || CFG.LV_CARD_LINE_MAX || 72);
    if (x) o.push(x);
  }
  return o;
}

/**
 * یک موردِ نقشه — **همهٔ فیلدهای قراردادِ ۸.۰۱ نگه داشته می‌شوند** (۸.۲۶).
 *
 * تا ۸.۲۵ این‌جا فقط `kind/cardTitle/cardLines/terms/caption` ساخته می‌شد،
 * یعنی حتی اگر مدل `quote` و `form` و `headline` را درست می‌داد، همین
 * تابع دورشان می‌ریخت — و `lvSpecBuild_`، که کارت‌های برداری را از روی
 * همان‌ها می‌سازد، هر بار نقشه‌ای بی‌لنگر می‌گرفت. دو سرِ یک خط که یکی
 * فیلدِ تازه می‌خواند و دیگری فیلدِ تازه را نمی‌نوشت.
 *
 * و چون کارت‌های اسلایدز (مسیرِ پشتیبان) و جزوه هنوز `cardTitle/cardLines`
 * می‌خوانند، آن دو **از همین فیلدها ساخته می‌شوند** نه از مدل پرسیده: یک
 * پرسش، دو مصرف‌کننده. `kind` هم از `form` می‌آید — «زنجیره» در اسلایدز
 * همان نمودارِ جریان است (`lvFlowDraw_`).
 */
function ytVisItem_(it, at) {
  var x = it || {};
  var tMax = CFG.LV_CARD_TITLE_MAX || 48;
  var o = {
    at: at,
    quote: ytVisCut_(x.quote, 200),
    form: String(x.form || '').trim(),
    kicker: ytVisCut_(x.kicker, 46),
    headline: ytVisCut_(x.headline || x.cardTitle,
                        String(x.form || '').trim() === 'نقل' ? (CFG.LV_QUOTE_HEAD_MAX || 96) : tMax),
    note: ytVisCut_(x.note, 110),
    icon: String(x.icon || '').trim(),
    aTitle: ytVisCut_(x.aTitle, 22), aIcon: String(x.aIcon || '').trim(),
    aItems: ytVisList_(x.aItems, 3),
    bTitle: ytVisCut_(x.bTitle, 22), bIcon: String(x.bIcon || '').trim(),
    bItems: ytVisList_(x.bItems, 3),
    steps: ytVisList_(x.steps, 3),
    items: ytVisList_(x.items, 3),
    terms: ytVisCut_(x.terms, CFG.LV_TERMS_MAX || 80),
    caption: ytVisCut_(x.caption, CFG.LV_CAPTION_MAX || 120)
  };
  /* ══ شکلی که اجزایش نیامده، شکلِ ساده‌تر می‌شود — نه حذف (۸.۳۰) ══
     درسِ ۵۹: مدل «مقایسه» داد و سرِ هیچ‌کدام از دو ستون را ننوشت. کارتِ
     مقایسه بی دو سر یک جدولِ خالی است، و `lvSpecBuild_` تا امروز همان را دور
     می‌انداخت — یعنی یکی از سه موردی که مدل واقعاً طراحی کرده بود. مقایسهٔ
     ناقص «تمرکز» می‌شود با بندهای هر دو ستون، و زنجیرهٔ تک‌گام هم. */
  if (o.form === 'مقایسه' && (!o.aTitle || !o.bTitle)) {
    o.items = ytVisList_([].concat(o.items, o.aItems, o.bItems,
                                   o.aTitle ? [o.aTitle] : [], o.bTitle ? [o.bTitle] : []), 3);
    o.form = 'تمرکز'; o.reshaped = 'مقایسهٔ بی‌سر';
  } else if (o.form === 'زنجیره' && o.steps.length < 2) {
    o.items = ytVisList_([].concat(o.items, o.steps), 3);
    o.form = 'تمرکز'; o.reshaped = 'زنجیرهٔ تک‌گام';
  }
  o.cardTitle = ytVisCut_(x.cardTitle || o.headline, tMax);
  var lines = ytVisList_(x.cardLines, Number(CFG.LV_CARD_LINES_MAX) || 4);
  if (!lines.length) {
    if (o.form === 'مقایسه' && (o.aTitle || o.bTitle)) {
      if (o.aTitle) lines.push(ytVisCut_(o.aTitle + (o.aItems.length ? ': ' + o.aItems.join('، ') : ''), CFG.LV_CARD_LINE_MAX || 72));
      if (o.bTitle) lines.push(ytVisCut_(o.bTitle + (o.bItems.length ? ': ' + o.bItems.join('، ') : ''), CFG.LV_CARD_LINE_MAX || 72));
    } else if (o.steps.length) lines = o.steps.slice(0);
    else if (o.items.length) lines = o.items.slice(0);
    else if (o.note) lines = [o.note];
  }
  o.cardLines = lines;
  o.kind = x.kind ? ytVisKind_(x.kind) : (o.form === 'زنجیره' ? 'نمودار' : ytVisKind_(''));
  return o;
}

function ytVisCut_(t, n) {
  var x = ytScrub_(String(t == null ? '' : t)).replace(/\s+/g, ' ').trim();
  var max = Math.max(4, Number(n) || 48);
  return x.length > max ? x.slice(0, max).trim() : x;
}

/**
 * برنامهٔ تصویرها — **حقیقت‌ها از کد، نوشته‌ها از مدل.**
 *
 * مدل می‌گوید کدام بخش چه تصویری بخواهد و متنش چه باشد. ولی **سهمِ زمان از
 * کد می‌آید**، از سهمِ نویسه‌ایِ هر بخش — عیناً همان حسابی که `ytChapters_`
 * برای فصل‌بندیِ یوتیوب می‌کند. اگر سهم را از مدل می‌گرفتیم، یک حدسِ
 * بی‌پشتوانه تعیین می‌کرد که بیننده چند ثانیه به چه چیزی نگاه کند.
 *
 * و شمارهٔ بخشِ ناشناخته **دور انداخته می‌شود**: مدل بخشی را نام می‌برد که
 * وجود ندارد، و تصویری که به هیچ متنی وصل نیست از نبودنش بدتر است. این
 * قرینهٔ `ytVisKind_` است و عمداً فرق دارد: گونهٔ ناشناخته جبران‌شدنی است
 * (کارت می‌شود)، بخشِ ناشناخته نه.
 */
/**
 * ══ آنچه بی‌صدا دور انداخته می‌شود، شمرده می‌شود (۸٫۱۱) ══
 *
 * ۱ اکتبر، قسمت ۵۷: `_visuals.json` نوشت `want: 1, done: true` برای درسی
 * که موتور خودش برایش **حدودِ دوازده** تصویر خواسته بود. ویدئو یعنی
 * پانزده دقیقه یک تصویرِ ثابت — بدتر از کاور — و هیچ‌جا صدا درنیامد، چون
 * `want` برابرِ «آنچه زنده مانْد» گذاشته می‌شد و `done` هم با همان سنجیده
 * می‌شد: **عدد با خودش مقایسه می‌شد.**
 *
 * سه جا بی‌صدا می‌ریزد و حالا هر سه شمرده می‌شوند: شمارهٔ بخشِ بیرونِ بازه،
 * موردِ چهارمِ یک بخش، و سقفِ `LV_MAX_PER_EP`. شمردن تعمیر نیست — ولی بی
 * شمردن، هیچ‌وقت معلوم نمی‌شود کدامشان بوده.
 */
function ytVisPlan_(mm, ctx, stat) {
  var st = stat || {};
  st.raw = 0; st.badSec = 0; st.perSec = 0; st.capped = 0;
  if (!ytVisOn_(ctx && ctx.show)) return [];
  var secs = (ctx && ctx.sections) || [];
  var raw = (mm && mm.visuals) || [];
  st.raw = raw.length;
  if (!secs.length || !raw.length) return [];

  // سهمِ نویسه‌ایِ هر بخش — همان مبنای `ytChapters_`
  var chars = [], sum = 0;
  for (var i = 0; i < secs.length; i++) {
    var n = String((secs[i] && (secs[i].narration || secs[i].text)) || '').length;
    chars.push(n); sum += n;
  }
  if (!sum) return [];

  var lead = Math.max(0, Number(CFG.MUSIC_INTRO_SEC) || 0);
  var body = Math.max(1, (Number(ctx.totalSec) || 0) - lead);
  var cap = Math.max(1, Number(CFG.LV_MAX_PER_EP) || 40);

  /* سقفِ هر بخش از **سهمِ** آن بخش می‌آید، نه یک عددِ ثابت. «سه مورد در یک
     بخش، کافی» برای پنج‌شش تصویرِ کلِ قسمت نوشته شده بود؛ با چهارده تصویر و
     یک بخشِ بلند، همان سه یعنی دورریختنِ تصویرهایی که خودمان خواسته بودیم. */
  var asked = ytVisWant_(ctx.totalSec);
  var shares = ytVisShares_(secs, asked);

  // اول گروه‌بندی بر اساسِ بخش، تا سهمِ هر بخش بینِ موردهایش تقسیم شود
  var bySec = Object.create(null), order = [];
  for (var r = 0; r < raw.length; r++) {
    var it = raw[r] || {};
    var at = parseInt(faDigits_(String(it.at == null ? '' : it.at)), 10);
    if (isNaN(at) || at < 1 || at > secs.length) { st.badSec++; continue; }  // بخشِ ناشناخته، رد
    var k = String(at);
    if (!bySec[k]) { bySec[k] = []; order.push(at); }
    var secCap = ytVisSecCap_(shares[at - 1]);
    if (bySec[k].length >= secCap) { st.perSec++; continue; }
    bySec[k].push(ytVisItem_(it, at));
  }
  order.sort(function (a, b) { return a - b; });

  var out = [];
  for (var o = 0; o < order.length && out.length < cap; o++) {
    var grp = bySec[String(order[o])];
    var share = (chars[order[o] - 1] / sum) * body;          // سهمِ این بخش
    var each = share / grp.length;
    for (var g = 0; g < grp.length; g++) {
      if (out.length >= cap) { st.capped++; continue; }
      grp[g].sec = Math.round(each * 10) / 10;
      grp[g].heading = String((secs[order[o] - 1] || {}).heading || '');
      out.push(grp[g]);
    }
  }
  return out;
}

/**
 * ══ نقشه‌ای که هیچ بخشی را خالی نمی‌گذارد — پر کردن از خودِ روایت (۸.۲۹) ══
 *
 * ۳ اکتبر، درسِ ۵۹ — روزِ اولِ ۸.۲۶: درخواستِ رندر با **سه** کارت نوشته شد،
 * هر سه از بخشِ یک، برای درسی پانزده‌ونیم‌دقیقه‌ای که موتور خودش دوازده
 * تصویر برایش خواسته بود. یعنی هر کارت پنج دقیقه روی قاب، و چهار بخشِ بعدی
 * بی هیچ تصویرِ خودشان. ۸.۲۶ قرارداد را درست کرد و یک بار دوباره پرسید؛
 * ولی **هر دو راهش به مدل ختم می‌شد**، و مدلی که بار اول کم داد، بار دوم هم
 * می‌تواند کم بدهد. شمردنِ ۸.۱۱ گفت «نحیف است»؛ هیچ‌چیز نحیفی را پُر نکرد.
 *
 * این تابع راهی است که به مدل ختم نمی‌شود. برای هر بخشی که کمتر از سهمش
 * مورد دارد، از **متنِ خودِ همان بخش** جمله برمی‌دارد — پخش در طولِ بخش،
 * نه از سرش — و یک کارتِ «نقل» می‌سازد: متنِ درشت همان جمله، برچسبِ گوشه
 * سرِ بخش، و `quote` چند واژهٔ اولِ همان جمله، **عیناً**. پس این کارت‌ها به
 * ساختار همیشه لنگر دارند و `lvSpecBuild_` ثانیه‌شان را پیدا می‌کند — کاری
 * که برای `quote`ِ مدل فقط امید است.
 *
 * مرزها:
 * - **کارِ مدل جایگزین نمی‌شود، کامل می‌شود.** بخشی که به اندازهٔ سهمش
 *   دارد دست نمی‌خورد؛ موردِ مدل هرگز حذف یا بازنویسی نمی‌شود.
 * - **جملهٔ رادیویی** («بشنوید»، «در قسمتِ بعد…») کارت نمی‌شود — همان
 *   فهرستِ جزوه (`HANDOUT_RADIO`)؛ دو فهرست برای یک چیز یعنی یکی کهنه شود.
 * - **ترتیب از گفتار می‌آید.** موردهای هر بخش به جای عبارتشان در متن مرتب
 *   می‌شوند، تا کارتِ اسلایدز (که بی زمانِ واقعی پشتِ‌هم می‌آید) هم با
 *   گفتار هم‌قدم باشد. موردی که عبارتش پیدا نشود، پشتِ موردِ قبلی‌اش می‌مانَد.
 * - **شمرده می‌شود** (`auto`) و به ردیفِ رندر می‌رود: کارتی که کد ساخت با
 *   کارتی که مدل طراحی کرد یکی نیست، و هر روز که این عدد بالا باشد یعنی
 *   مدل کارش را نکرده — آن را باید دید، نه پنهان کرد.
 */
function ytVisSents_(text) {
  var src = String(text || '').replace(/\s+/g, ' ').trim();
  if (!src) return [];
  var parts = [];
  try { parts = handoutSentences_(src); } catch (eS) { parts = src.split(/(?<=[.!؟?…])\s+/); }
  var radio = [];
  try { radio = (HANDOUT_RADIO || []).slice(0); } catch (eR) { radio = []; }
  /* و یک قابِ دیگر که جزوه نگهش می‌دارد ولی کارت نباید: وعدهٔ درسِ بعد.
     جزوه جمله را در دلِ فصل می‌خوانَد؛ کارت آن را تنها و درشت نشان می‌دهد،
     و «در درسِ بعد سراغِ …» روی قاب یعنی تصویرِ درسی که هنوز نیامده. */
  radio.push(/(در|تا|برای) (درس|قسمت|جلسه)ِ? ?(بعد|بعدی|آینده)/);
  /* و جملهٔ دربارهٔ خودِ متن — یادداشتِ غنی‌سازی، منبع — مفهومِ درس نیست. */
  radio.push(/در خودِ? ?درس نیامده|برای تکمیل (اضافه|افزوده)|به نقلِ? ?از|^\s*منبع/);
  var out = [], pos = 0;
  for (var i = 0; i < parts.length; i++) {
    var s = String(parts[i] || '').trim();
    var at = src.indexOf(s, pos);
    if (at >= 0) pos = at + s.length;
    if (!s) continue;
    var bad = false;
    for (var r = 0; r < radio.length; r++) { if (radio[r].test(' ' + s)) { bad = true; break; } }
    if (bad) continue;
    var words = s.replace(/[.!؟?…]+$/, '').split(' ').filter(function (w) { return !!w; });
    /* جملهٔ بلند — یا متنی که اصلاً نقطه ندارد — به پنجره‌های دوازده‌واژه‌ای
       شکسته می‌شود، نه دور انداخته. وگرنه بخشی که گوینده‌اش یک‌نفس حرف
       زده، درست همان بخشی است که هیچ کارتی نمی‌گیرد. */
    if (words.length > 24) {
      for (var w0 = 0; w0 + 5 <= words.length; w0 += 12) {
        var ws = words.slice(w0, w0 + 12);
        out.push({ t: ws.join(' ') + (w0 + 12 < words.length ? ' …' : ''), words: ws,
                   at: (at < 0 ? pos : at) + w0, frag: w0 > 0 });
      }
      continue;
    }
    out.push({ t: s, words: words, at: at < 0 ? pos : at, frag: false });
  }
  return out;
}

/** متنِ درشتِ یک کارتِ «نقل»: تا سقف، سرِ واژه بریده، نه وسطِ آن. */
function ytVisAutoHead_(words) {
  var max = Math.max(16, Number(CFG.LV_QUOTE_HEAD_MAX) || 96);
  var t = '';
  for (var i = 0; i < words.length; i++) {
    var nx = t ? t + ' ' + words[i] : words[i];
    if (nx.length > max - 1) return (t || nx.slice(0, max - 1)).replace(/[،؛:,]+$/, '') + '…';
    t = nx;
  }
  return t.replace(/[،؛:,]+$/, '');
}

/**
 * چند جمله از یک بخش — **پخش در طولش و مرتبط با موضوعش**.
 *
 * بخش به `need` تکهٔ پشتِ‌هم تقسیم می‌شود و از هر تکه بهترین جمله برمی‌خیزد،
 * تا کارت‌ها همه در اولِ بخش جمع نشوند. «بهترین» یعنی: واژه‌های سرِ بخش را
 * دارد (یعنی دربارهٔ همان مفهوم است)، کامل در کارت جا می‌شود، و تکه‌ای از
 * وسطِ جمله یا جمله‌ای که با «که/و/اما…» شروع می‌شود نیست — آن‌ها روی کارت،
 * تنها و درشت، بی‌سروته خوانده می‌شوند.
 */
function ytVisAutoScore_(s, headSet) {
  var sc = 0, seen = Object.create(null);
  for (var i = 0; i < s.words.length; i++) {
    var w = lvNorm_(s.words[i]);
    if (w.length >= 3 && headSet[w] && !seen[w]) { sc += 2; seen[w] = 1; }
  }
  var n = s.words.length;
  if (n >= 6 && n <= 16) sc += 1;
  if (s.frag) sc -= 3;
  if (/^(که|و|اما|ولی|یا|زیرا|چون|پس|البته|یعنی)$/.test(lvNorm_(s.words[0] || ''))) sc -= 3;
  return sc;
}

function ytVisAutoPick_(narr, need, taken, heading) {
  var headSet = Object.create(null);
  var hw = lvNorm_(heading || '').split(' ');
  for (var h = 0; h < hw.length; h++) if (hw[h].length >= 3) headSet[hw[h]] = 1;
  var sents = ytVisSents_(narr), cand = [];
  var used = (taken || []).map(function (q) { return lvNorm_(q); }).filter(function (q) { return q.length >= 8; });
  for (var i = 0; i < sents.length; i++) {
    var n = sents[i].words.length;
    if (n < 5 || n > 40) continue;
    var norm = lvNorm_(sents[i].t), dup = false;
    for (var u = 0; u < used.length; u++) if (norm.indexOf(used[u]) !== -1) { dup = true; break; }
    if (dup) continue;
    cand.push(sents[i]);
  }
  var out = [];
  if (!cand.length || need <= 0) return out;
  var k = Math.min(need, cand.length);
  for (var g = 0; g < k; g++) {
    var from = Math.floor(g * cand.length / k), to = Math.floor((g + 1) * cand.length / k);
    var best = null, bestSc = -1e9;
    for (var c = from; c < Math.max(to, from + 1) && c < cand.length; c++) {
      var sc = ytVisAutoScore_(cand[c], headSet);
      if (sc > bestSc) { bestSc = sc; best = cand[c]; }
    }
    if (best) out.push(best);
  }
  out.sort(function (a, b) { return a.at - b.at; });
  return out;
}

/**
 * @param {Array} vis  نقشهٔ ساخته‌شده (خروجیِ `ytVisPlan_`)
 * @param {Object} ctx همان ctxِ `ytPlan_`
 * @param {Object=} stat `auto` (چند کارت از روایت ساخته شد) و `bare` (بخش‌هایی
 *   که حتی جمله‌ای هم برای برداشتن نداشتند) روی آن می‌نشیند
 * @return {Array} نقشهٔ کامل — همان آرایه اگر چیزی لازم نبود
 */
function ytVisFill_(vis, ctx, stat, opt) {
  var noAuto = !!(opt && opt.noAuto);       // فقط چیدن و زمان، بی کارتِ ازروایت
  var st = stat || {};
  st.auto = 0; st.bare = 0;
  var list = vis || [];
  if (!ytVisOn_(ctx && ctx.show)) return list;
  var secs = (ctx && ctx.sections) || [];
  if (!secs.length) return list;
  var chars = [], sum = 0;
  for (var i = 0; i < secs.length; i++) {
    var n = String((secs[i] && (secs[i].narration || secs[i].text)) || '').length;
    chars.push(n); sum += n;
  }
  if (!sum) return list;
  var asked = ytVisWant_(ctx.totalSec);
  var shares = ytVisShares_(secs, asked);
  var bySec = Object.create(null);
  for (var v = 0; v < list.length; v++) {
    var k = String(Number(list[v] && list[v].at) || 0);
    (bySec[k] = bySec[k] || []).push(list[v]);
  }
  /* میان‌بُر، نه سد: نقشه‌ای که هیچ بخشش کم ندارد همان آرایه برمی‌گردد و
     زمان‌ها از نو حساب نمی‌شوند. سدِ واقعی `gap` پایین‌تر است — شکستنِ
     این حلقه به‌تنهایی هیچ رفتاری را عوض نمی‌کند (۷٫۷۱). */
  var need = 0;
  for (var s = 1; s <= secs.length; s++) {
    if (!chars[s - 1]) continue;
    if ((bySec[String(s)] || []).length < shares[s - 1]) need++;
  }
  if (!need && !noAuto) return list;

  var lead = Math.max(0, Number(CFG.MUSIC_INTRO_SEC) || 0);
  var body = Math.max(1, (Number(ctx.totalSec) || 0) - lead);
  var cap = Math.max(1, Number(CFG.LV_MAX_PER_EP) || 40);
  var out = [];
  for (var s2 = 1; s2 <= secs.length; s2++) {
    var sec = secs[s2 - 1] || {};
    var narr = String(sec.narration || sec.text || '');
    var head = String(sec.heading || '');
    var grp = (bySec[String(s2)] || []).slice(0);
    var gap = noAuto ? 0 : shares[s2 - 1] - grp.length;
    if (gap > 0 && narr) {
      var picks = ytVisAutoPick_(narr, gap, grp.map(function (x) { return String(x.quote || ''); }), head);
      if (!picks.length && !grp.length) st.bare++;
      for (var p = 0; p < picks.length; p++) {
        var w = picks[p].words;
        var item = ytVisItem_({
          quote: w.slice(0, Math.min(7, w.length)).join(' '),
          form: 'نقل',
          kicker: head,
          headline: ytVisAutoHead_(w),
          caption: picks[p].t
        }, s2);
        item.auto = true;
        grp.push(item);
        st.auto++;
      }
    }
    if (!grp.length) continue;
    /* ترتیبِ گفتار: جای عبارتِ هر مورد در متنِ بخش. */
    var stream = lvNorm_(narr), cmp = {}, last = -1;
    for (var g = 0; g < grp.length; g++) {
      var q = lvNorm_(grp[g].quote || '');
      var at = q.length >= 8 ? lvFind_(stream, q, cmp) : -1;
      grp[g].__pos = at >= 0 ? at : last + 0.001;
      if (at >= 0) last = at; else last = grp[g].__pos;
    }
    grp.sort(function (a, b) { return a.__pos - b.__pos; });
    var share = sum ? (chars[s2 - 1] / sum) * body : 0;
    var each = share / grp.length;
    for (var g2 = 0; g2 < grp.length; g2++) {
      delete grp[g2].__pos;
      grp[g2].sec = Math.round(each * 10) / 10;
      grp[g2].heading = head;
      if (out.length < cap) out.push(grp[g2]);
    }
  }
  return out;
}

function ytPlan_(folder, ctx, redo) {
  if (!redo) {
    var had = ytPlanRead_(folder);
    if (had) { had.cached = true; return had; }
  }
  var mm = ytMetaModel_(ctx);
  if (!mm) return null;
  var intro = Number(CFG.MUSIC_INTRO_SEC) || 0;
  var chapters = ytChapters_(ctx.sections || [], ctx.totalSec, intro);
  try {
    ctx.castTimeline = castTimeline_(ctx.castSpans || [], ctx.totalSec, intro);
    ctx.castLines = castLines_(ctx.castTimeline);
  } catch (eCt) { ctx.castTimeline = []; ctx.castLines = []; }
  var plan = {
    at: nowStr_(), show: ctx.show, ep: String(ctx.epRaw || ''),
    cast: ctx.castTimeline || [],
    title: ytTitleBuild_(mm, ctx),
    description: ytDescBuild_(mm, ctx, chapters),
    tags: ytTags_(mm, ctx),
    coverTitle: ytScrub_(String(mm.coverTitle || '')).trim(),
    coverKicker: ytScrub_(String(mm.coverKicker || '')).trim(),
    chapters: chapters.length,
    /* تصویرها همین‌جا و در همین فایل می‌نشینند — یعنی آدم و ناظر می‌توانند
       ویرایششان کنند، همان قاعدهٔ «اگر اشتباه ساخت چه؟» که `_yt.json` برای
       عنوان و کاور دارد. خالی بودنش یعنی مسیرِ کاورِ تک‌تصویریِ امروز. */
    visuals: (function () {
      try { return ytVisPlan_(mm, ctx, (ctx.__visStat = {})); } catch (eV) {
        logLine_('برنامهٔ تصویرها ساخته نشد: ' + eV.message); return [];
      }
    })(),
    /* انتخابِ ظاهر در همین فایل می‌نشیند، نه فقط در حافظهٔ یک اجرا: `_yt.json`
       همان «اگر اشتباه ساخت چه؟» است — آدم و ناظر می‌بینندش و می‌توانند
       عوضش کنند، و شبِ بعد همان خوانده می‌شود. انتخابی که جایی ثبت نشود،
       برای کسی که فقط نتیجه را می‌بیند با تصادف فرقی ندارد. */
    look: (function () {
      try { return lvLookApply_(mm); } catch (eL) { return null; }
    })(),
    note: 'این فایل را می‌شود دستی ویرایش کرد. بعدش از منو ' +
          '«بازسازیِ عنوان و کاورِ یوتیوب» را بزنید تا روی ویدئو بنشیند.'
  };
  /* جوابِ خامِ مدل، کنارِ نقشه: چند مورد داد و چندتایش کجا ریخت. بی این، فردا
     «نقشه سه مورد دارد» از «مدل سه مورد داد» جدا نمی‌شود (۸.۲۹). */
  try {
    var vs0 = ctx.__visStat || {};
    plan.visModel = { raw: Number(vs0.raw) || 0, badSec: Number(vs0.badSec) || 0,
                      perSec: Number(vs0.perSec) || 0, kept: (plan.visuals || []).length,
                      repaired: !!(mm && mm.__repaired) };
  } catch (eVm) {}
  /* ══ در حالتِ صحنه، کارت‌ها دوباره پرسیده نمی‌شوند (۸.۳۴) ══
     ۸.۳۱ این را برای نقشهٔ **ذخیره‌شده** نوشت و نقشهٔ **تازه** را جا انداخت:
     همین‌جا هر درس دو تا هشت فراخوانِ دیگر برای کارت‌هایی می‌کرد که صحنه‌ها
     جایشان را می‌گیرند — همان فراخوان‌هایی که ۴ اکتبر افسار گسیختند و دورِ
     انتشار را کشتند. پرکردن از روایت (بی مدل) همچنان می‌مانَد: اگر صحنه‌ها
     نشد و به کارت افتاد، کارت‌ها نحیف نیستند. */
  if (ctx.sceneMode !== true) {
    try { ytVisThicken_(folder, plan, ctx); } catch (eTk) {
      logLine_('پرسشِ دوبارهٔ تصویرها نشد: ' + eTk.message);
    }
    /* بخشِ کم‌مانده یک بار جدا پرسیده می‌شود (۸.۳۰)، و آنچه باز هم کم ماند از
       خودِ روایت پر می‌شود (۸.۲۹). ترتیب عمدی است: کارتِ طراحی‌شده اول. */
    try { ytVisSecAsk_(folder, plan, ctx); } catch (eSa) {
      logLine_('پرسشِ بخش‌به‌بخشِ تصویرها نشد: ' + eSa.message);
    }
  }
  try { ytVisFillPlan_(plan, ctx); } catch (eFl) {
    logLine_('پرکردنِ نقشهٔ تصویر نشد: ' + eFl.message);
  }
  ytPlanWrite_(folder, plan);
  return plan;
}

/** `ytVisFill_` روی نقشه، با ثبتِ آنچه کرد — هم در نقشه، هم در سیاهه، هم در
 *  آمارِ همین اجرا که `lvBuild_` به `_visuals.json` و ردیفِ رندر می‌بَرد.
 *  @return {number} چند کارت از روایت ساخته شد */
function ytVisFillPlan_(plan, ctx) {
  if (!plan) return 0;
  var st = {};
  var before = (plan.visuals || []).length;
  var v2 = ytVisFill_(plan.visuals || [], ctx, st);
  if (!st.auto) return 0;
  plan.visuals = v2;
  plan.visAuto = { n: st.auto, bare: st.bare, before: before, after: v2.length, at: nowStr_() };
  try { (ctx.__visStat = ctx.__visStat || {}).auto = st.auto; } catch (eS) {}
  logLine_('نقشهٔ تصویرِ قسمتِ ' + String((ctx && ctx.epRaw) || '') + ': مدل ' + before +
           ' مورد داد از ' + ytVisWant_(ctx && ctx.totalSec) + '؛ ' + st.auto +
           ' کارتِ «نقل» از متنِ خودِ بخش‌ها ساخته شد' +
           (st.bare ? ' (' + st.bare + ' بخش حتی جمله‌ای برای برداشتن نداشت)' : '') + '.');
  return st.auto;
}

/**
 * ══ نقشهٔ نحیف یک بار دیگر پرسیده می‌شود — فقط تصویرها (۸.۲۶) ══
 *
 * ۸.۱۱ نقشهٔ نحیف را **پیش از** آپلود ثبت کرد و نوشت «این‌جا هنوز جبران‌شدنی
 * است: ویدئو ساخته نشده و بازسازیِ تصویرها همان قسمت را از نو نقشه می‌کشد».
 * جملهٔ درستی بود و **هیچ کدی پشتش نبود**: `ytPlan_` نقشهٔ ذخیره‌شده را
 * برمی‌گرداند و هیچ‌جا دوباره نمی‌پرسید. پس «جبران‌شدنی» فقط یک برچسب بود،
 * و درسِ ۵۷ و ۵۸ با همان یک تصویر رفتند.
 *
 * مرزها: یک بار (`LV_VIS_RETRY_MAX`)، **پیش از کار ثبت می‌شود** — اجرایی که
 * وسطِ فراخوان کشته شود نباید هر شب از نو بپرسد (۷٫۴۴) — و جوابِ تازه فقط
 * وقتی جای قبلی را می‌گیرد که **بیشتر** باشد. پرسیدنِ دوباره هرگز نقشه را
 * بدتر نمی‌کند.
 * @return {boolean} نقشه عوض شد
 */
function ytVisThicken_(folder, plan, ctx) {
  if (!plan || !ytVisOn_(ctx && ctx.show)) return false;
  if (!((ctx && ctx.sections) || []).length) return false;
  var asked = ytVisWant_(ctx.totalSec);
  var have = (plan.visuals || []).length;
  if (have >= ytVisFloor_(asked)) return false;
  var lim = Number(CFG.LV_VIS_RETRY_MAX);
  if (!isFinite(lim)) lim = 1;
  var tries = Number((plan.visAsk || {}).n) || 0;
  if (tries >= lim) return false;
  /* وقت نیست ⇒ تلاش شمرده نمی‌شود و دورِ بعد می‌پرسد (۸.۳۴). */
  if (!ytVisTimeOk_()) {
    logLine_('پرسشِ دوبارهٔ تصویرهای قسمتِ ' + String(ctx.epRaw || '') +
             ' به دورِ بعد ماند — وقتِ این دور کافی نبود.');
    return false;
  }
  plan.visAsk = { n: tries + 1, at: nowStr_(), asked: asked, before: have, after: have, raw: 0 };
  if (folder) ytPlanWrite_(folder, plan);              // پیش از کار
  var raw = ytVisAsk_(ctx);
  var st = {};
  var v2 = raw ? ytVisPlan_({ visuals: raw }, ctx, st) : [];
  plan.visAsk.raw = raw ? raw.length : 0;
  var better = v2.length > have;
  if (better) { plan.visuals = v2; ctx.__visStat = st; plan.visAsk.after = v2.length; }
  logLine_('نقشهٔ تصویرِ قسمتِ ' + String(ctx.epRaw || '') + ' نحیف بود (' + have + ' از ' +
           asked + ')؛ فقط تصویرها دوباره پرسیده شد ⇒ ' + v2.length +
           (better ? ' — جایگزین شد.' : ' — بهتر نشد، همان قبلی ماند.'));
  if (folder) ytPlanWrite_(folder, plan);
  return better;
}

/**
 * نقشهٔ **ذخیره‌شده**ای که نحیف است، فقط وقتی دوباره پرسیده می‌شود که هنوز
 * اثری دارد: ویدئو ساخته نشده و درخواستِ رندرش هم نوشته نشده. پس از آن،
 * پرسیدن فقط پول است — یوتیوب ویدئوی منتشرشده را عوض نمی‌کند (`LV_SHORT`).
 */
function ytVisReplanDue_(folder, item, asked) {
  try {
    if (ytVideoIn_(folder)) return false;
    var d = ytRenderRead_(), key = String(item.show) + ':' + String(item.ep);
    for (var i = 0; i < d.items.length; i++) {
      if (String(d.items[i].key) !== key) continue;
      /* درخواستی که هنوز ساخته نشده و نحیف است، یک بار جای نقشه‌ای تازه را
         می‌دهد (۸.۳۰) — همان که `ytRenderAsk_` بعداً جایگزینش می‌کند. */
      return ytRenderRedoable_(d.items[i], asked);
    }
    return true;
  } catch (e) { return false; }
}

/**
 * ══ درخواستِ رندرِ نحیف، پیش از ساخته‌شدن، یک بار جایگزین‌شدنی است (۸.۳۰) ══
 *
 * درسِ ۵۹ با سه کارت در صف نشست و صاحبِ برنامه خواست ویدئو یک روز صبر کند
 * تا درست ساخته شود. تا امروز ردیفِ صف یک بار نوشته می‌شد و هرگز عوض نمی‌شد
 * (`ytRenderAsk_` تکراری را رد می‌کرد)، پس هیچ نسخه‌ای نمی‌توانست درسی را که
 * در صف است بهتر کند — فقط درس‌های بعدی را.
 *
 * مرزها: فقط «در انتظار» و هنوز ساخته‌نشده (ویدئوی ساخته‌شده یعنی رانر کارش
 * را کرده و عوض‌کردنِ ردیف آن را دور می‌ریزد)؛ فقط نحیف (کمتر از کفِ خواسته
 * و بی مشخصاتِ برداری)؛ و **یک بار** (`redo`) — جایگزینیِ پی‌درپی یعنی ویدئویی
 * که هرگز ساخته نمی‌شود.
 */
function ytRenderRedoable_(row, asked) {
  try {
    if (!row || String(row.status || '') !== 'در انتظار') return false;
    if (Number(row.redo) >= 1) return false;
    if (row.spec && row.spec.cards && row.spec.cards.length) return false;
    var floor = ytVisFloor_(Number(asked) || Number((row.vis || {}).asked) || 0);
    if ((row.visuals || []).length >= floor) return false;
    var map = ytRenderMapCached_();
    if (map && map[String(row.key)] && map[String(row.key)].url) return false;
    return true;
  } catch (e) { return false; }
}

function ytUploadOne_(item, hub, pub) {
  var res = { key: item.key, ok: false, why: '', videoId: '', waiting: false };
  var yt = ytSvc_();
  if (!yt) { res.why = ytOffWhy_(); return res; }

  var folder = null;
  try { folder = DriveApp.getFolderById(String(item.folderId)); }
  catch (e) { res.why = 'پوشهٔ قسمت پیدا نشد'; return res; }

  var meta = ytEpisodeMeta_(folder);
  if (!meta || !meta.ep) { res.why = 'پروندهٔ قسمت (‌_episode/_special.json) نبود'; return res; }
  var ep = meta.ep;
  var isSpecial = String(item.show) === ENRICH_SHOW_SPECIAL;
  var showName = isSpecial ? CFG.SPECIAL_SHOW_NAME : CFG.SHOW_NAME;
  var seriesName = String(meta.seriesName || item.series || '');
  /* شمارهٔ درسِ همین مجموعه، از پروندهٔ قسمت — انتشار هر دو را می‌گوید:
     سراسری ادامه دارد، «درس N» کنارش (۶٫۵۵). کاور فقط «درس N» می‌گیرد،
     چون در اندازهٔ بندانگشتی جای دو شماره نیست و آنچه معنا دارد جای درس
     در مجموعه است. */
  var lessonNo = Number(meta.lesson) || 0;
  var epLabel = 'قسمت ' + faDigitsOut_(String(item.ep)) +
                (lessonNo ? ' — درس ' + faDigitsOut_(String(lessonNo)) : '');
  var coverEpLabel = lessonNo ? 'درس ' + faDigitsOut_(String(lessonNo)) : epLabel;

  var aud = ytAudioParts_(folder);
  if (aud.why) { res.why = aud.why; return res; }
  var totalSec = ytSecondsOf_(aud.parts);
  var outName = ytVideoName_(String(folder.getName()));

  // ── نقشه: یک بار ساخته می‌شود و می‌مانَد ──
  var heads = [];
  for (var h = 0; h < (ep.sections || []).length; h++) {
    heads.push(String(ep.sections[h].heading || ''));
  }
  var ctx = { show: item.show, epRaw: item.ep,
              showName: showName, tagline: isSpecial ? CFG.SPECIAL_TAGLINE : CFG.SHOW_TAGLINE,
              seriesName: seriesName, epNum: faDigitsOut_(String(item.ep)),
              lesson: lessonNo ? faDigitsOut_(String(lessonNo)) : '',
              title: String(ep.title || ''), cat: String(meta.cat || meta.seriesCat || ''),
              duration: ytTime_(totalSec), headings: heads,
              hook: String(ep.hook || ''), summary: String(ep.summary || ''),
              sources: (ep.__extSources || []),
              // سهمِ نویسهٔ هر گوینده، همان‌طور که موقعِ نقش‌گزینی ثبت شد
              castSpans: ((ep.__cast || {}).spans) || [],
              sections: ep.sections || [], totalSec: totalSec };
  /* حالتِ صحنه پیش از نقشه، از تخته (بی `look`ِ مدل که هنوز نیامده): فقط برای
     اینکه نقشه کارت‌ها را بیهوده دوباره نپرسد. سطحِ «خودکار» این‌جا پیش‌فرض
     می‌گیرد؛ اگر مدل بعداً «خاموش» بگوید، پرکردن از روایت هنوز هست. */
  try { ctx.sceneMode = lvSceneOn_(item.show, lvLevelAt_(hub, item, meta, null)); }
  catch (eSm0) { ctx.sceneMode = false; }
  var plan = ytPlan_(folder, ctx, false);
  if (!plan) { res.why = 'مدل عنوان و کپشن نداد'; return res; }
  /* نقشهٔ ذخیره‌شده‌ای که نحیف است و هنوز اثری دارد (ویدئو نه ساخته شده نه
     خواسته شده) یک بار دیگر پرسیده می‌شود — همان «جبران‌شدنی»ِ ۸.۱۱ که تا
     ۸.۲۶ هیچ کدی پشتش نبود. */
  /* نقشهٔ ذخیره‌شده: نحیف ⇒ یک پرسشِ دیگر (۸.۲۶)؛ هنوز کم ⇒ پر از روایت
     (۸.۲۹). هر دو فقط وقتی ویدئو و درخواستِ رندرش هنوز نیست — پس از آن
     تغییرِ نقشه هیچ اثری ندارد جز پول. پرسشِ «لازم هست؟» اول و بی خواندنِ
     درایو جواب می‌گیرد، تا قسمتی که نقشه‌اش کامل است هر بار صف را نخوانَد. */
  /* ── سبکِ این مجموعه، **یک بار و پیش از کاور** (۷.۹۹) ──
   * پیش از این، سبک پایین‌تر و داخلِ شاخهٔ تصویرها خوانده می‌شد، پس کاور —
   * که بالاتر ساخته می‌شود — هرگز نمی‌دیدش. `lvStyleAt_` یک تعریف است و هر
   * دو از آن می‌خورند: دو تعریف برای «سبکِ این مجموعه» یعنی روزی بندانگشتی
   * و اسلایدها دو سبک می‌گیرند و هیچ‌چیز نشانش نمی‌دهد. */
  var lvSty = lvStyleAt_(hub, item, meta, seriesName, plan.look);
  /* سطحِ تصویرسازی هم **یک بار و پیش از ساختن** (۸.۲۶). تا ۸.۲۵ فقط پیش از
     مشخصاتِ برداری خوانده می‌شد — یعنی پس از آنکه کارت‌ها و تصویرهای
     ساخته‌شده با سطحی ساخته شده بودند که هیچ‌کس نپرسیده بود. */
  var lvLvl = String(CFG.LV_LEVEL_DEFAULT || 'کم');
  try { lvLvl = lvLevelAt_(hub, item, meta, plan.look) || lvLvl; } catch (eLv) {}
  ctx.level = lvLvl; ctx.style = lvSty;
  /* نوشتهٔ رویِ نقاشی: ستونِ خودش در تخته، جدا از سبک و سطح (۸.۴۵). */
  try { var lvTx = lvTextAt_(hub, item, meta); ctx.textLevel = lvTx.v; ctx.textShare = lvTx.share; }
  catch (eTx) { ctx.textLevel = ''; ctx.textShare = 0; }
  /* جان‌بخشی: ستونِ خودش در تخته (۸.۵۴) — کلیپِ آغاز و حرکتِ کانون‌دار برای همین مجموعه. */
  try { var lvMo = lvMotionAt_(hub, item, meta); ctx.motion = lvMo.v; ctx.motionClip = lvMo.clip;
        ctx.motionFocus = lvMo.focus; ctx.motionSrc = lvMo.src; }
  catch (eMo) { ctx.motion = ''; }

  /* در حالتِ صحنه، نقشهٔ کارت‌ها دیگر به کار نمی‌آید (۸.۳۱): پرسشِ دوبارهٔ
     کارت‌ها فقط پولِ مدل است برای چیزی که ساخته نمی‌شود. */
  var sceneMode = false;
  try { sceneMode = lvSceneOn_(item.show, lvLvl); } catch (eSm) { sceneMode = false; }
  if (plan.cached && ytVisOn_(item.show) && !sceneMode) {
    var thinNow = (plan.visuals || []).length < ytVisFloor_(ytVisWant_(totalSec));
    var stF0 = {};
    try { ytVisFill_(plan.visuals || [], ctx, stF0); } catch (eF0) {}
    if (thinNow || stF0.auto) {
      try {
        if (ytVisReplanDue_(folder, item, ytVisWant_(totalSec))) {
          var n0 = (plan.visuals || []).length;
          if (thinNow) ytVisThicken_(folder, plan, ctx);
          try { ytVisSecAsk_(folder, plan, ctx); } catch (eSa2) {
            logLine_('پرسشِ بخش‌به‌بخشِ تصویرها نشد: ' + eSa2.message);
          }
          ytVisFillPlan_(plan, ctx);
          if ((plan.visuals || []).length !== n0) {
            ytPlanWrite_(folder, plan);
            /* نقشهٔ تازه، تلاشِ تازه: شمارِ تلاشِ `_visuals.json` مالِ نقشهٔ
               قبلی است. بی صفرکردنش، درسی که یک بار با سه کارت «تمام» شده،
               برای نُه کارتِ تازه فقط دو نوبت فرصت دارد (`LV_TRY_MAX`). */
            try {
              var dv0 = lvRead_(folder);
              if (dv0) { dv0.tries = 0; dv0.done = false; lvWrite_(folder, dv0); }
            } catch (eDv) {}
          }
        }
      } catch (eRp) { logLine_('پرسشِ دوبارهٔ تصویرها نشد: ' + eRp.message); }
    }
  }



  // ── کاور ──
  var cover = null;
  try {
    cover = ytCoverCard_({ title: String(ep.title || ''),
                           coverTitle: plan.coverTitle, kicker: plan.coverKicker,
                           showName: showName, seriesName: seriesName,
                           epLabel: coverEpLabel, style: lvSty,
                           cat: String(meta.cat || seriesName || '') });
  } catch (eC) {}

  /* ══ صحنه‌های مصور (۸.۳۱) — پیش از کارت‌ها و به‌جای آن‌ها ══
   * تا ویدئو نرسیده، این درس صحنه می‌گیرد: تصویرِ تمام‌صفحه‌ای که همان چیزی
   * را نشان می‌دهد که در همان لحظه گفته می‌شود. نشد ⇒ با علت به مسیرِ قبلی
   * (کارت‌ها) می‌افتد؛ ویدئوی ساده از ویدئوی نیامده بهتر است. */
  var sceneFb = '';
  if (ytVisOn_(item.show) && lvLvl !== 'خاموش' && !ytVideoIn_(folder)) {
    var scn = null;
    try { scn = lvScenesBuild_(folder, meta, plan, ctx); }
    catch (eSc) {
      scn = { active: true, fallback: true, why: 'خطا: ' + eSc.message };
      logLine_('صحنه‌های مصورِ ' + item.key + ' نشد: ' + eSc.message);
    }
    /* افتادن به کارت با علت، بیرون از هاب (۸.۶۰): در ردیفِ عمومی (`vis.sceneWhy`) و در
       Properties برای خطِ روزانه و یافته. */
    if (scn && scn.active && scn.fallback) {
      sceneFb = String(scn.why || 'بی علت');
      try { lvSceneFbNote_(String(item.key || (item.show + ':' + item.ep)), sceneFb); } catch (eFb) {}
    }
    if (scn && scn.active && !scn.fallback) {
      if (!scn.done) { res.waiting = true; res.why = scn.why || 'صحنه‌ها در حالِ ساخت'; return res; }
      var scInfo = scn.info || {};
      try {
        var bsrc = lvBoardSrc_(hub, item, meta);
        scInfo.board = { found: bsrc.found, style: bsrc.style, level: bsrc.level,
                         styleSrc: bsrc.styleSrc, levelSrc: bsrc.levelSrc };
      } catch (eBs) {}
      var askedOk = ytRenderAsk_({ show: item.show, ep: item.ep, title: String(ep.title || ''),
                     folderId: folder.getId(), visuals: [],
                     scenes: scn.items, sceneCover: scn.cover, sceneInfo: scInfo,
                     coverTitle: String(plan.coverTitle || ep.title || ''),
                     coverKicker: String(plan.coverKicker || seriesName || ''),
                     coverFoot: coverEpLabel,
                     audio: aud.parts.map(function (f) { return { id: f.getId(), name: f.getName() }; }),
                     audioKind: aud.kind, coverFileId: cover ? cover.fileId : '',
                     outName: outName,
                     /* کلیدِ پلی‌لیستِ همین مجموعه: رانر نقاشیِ نخستین درسِ صحنه‌ای را
                        پس‌زمینهٔ کاورِ مربعِ پلی‌لیست می‌کند (۸.۵۵). */
                     plKey: ytPlKey_(item.show, item.seriesKey, seriesName),
                     replace: item.replace ? String(item.replace) : '' });
      if (askedOk) { try { lvSceneFbNote_(String(item.key || (item.show + ':' + item.ep)), ''); } catch (eFb0) {} }
      res.waiting = true;
      res.why = askedOk
        ? 'ویدئوی صحنه‌ای هنوز ساخته نشده؛ درخواستِ رندر با ' +
          faDigitsOut_(String(scn.items.length)) + ' صحنه گذاشته شد'
        : 'ویدئوی صحنه‌ای منتظرِ رندر است (درخواست از قبل هست یا صفِ رندر پر است)';
      return res;
    }
  }

  /* ── تصویرهای بخش‌ها ──
   * پیش از درخواستِ رندر، چون ردیفِ صف **یک بار** نوشته می‌شود
   * (`ytRenderAsk_` تکراری را رد می‌کند) و اجازهٔ فایل‌ها همان‌جا داده
   * می‌شود. تصویری که بعد از نوشتنِ ردیف ساخته شود، هیچ‌وقت به اکشن
   * نمی‌رسد. */
  var vis = { items: [], want: 0, ready: 0, made: 0, tries: 0, done: true, why: '' };
  /* ══ ویدئوی صحنه‌ای رسیده ⇒ کارت لازم نیست (۸.۴۵) ══
     بالا شاخهٔ صحنه‌ها فقط تا وقتی ویدئو نیامده می‌دود (`!ytVideoIn_`). ویدئو که
     رسید، اجرا به این‌جا می‌افتاد و `lvBuild_` برای همان درس **کارت و پس‌زمینهٔ
     تازه** می‌ساخت: درسِ ۳۸ (قسمتِ ۶۰) پس از ساختِ ویدئو پنج پس‌زمینهٔ پولی و
     یک اسلایدز گرفت که هیچ‌جا دیده نمی‌شوند، و `_visuals.json`ِ صحنه‌ای (که
     جزوه می‌خوانَد) با کارت‌ها بازنویسی شد. صحنه‌های تمام‌شده یعنی کارِ تصویر
     تمام است. */
  var scDoneV = false;
  try { var scD0 = lvSceneRead_(folder); scDoneV = !!(scD0 && scD0.done && scD0.scenes && scD0.scenes.length); }
  catch (eSd) { scDoneV = false; }
  if (scDoneV && ytVideoIn_(folder)) {
    vis.why = 'ویدئوی صحنه‌ای ساخته شده؛ کارت لازم نیست';
  } else
  /* «خاموش» یعنی **بدونِ کارت** — همان جمله‌ای که `lvLevelWhat_` در منو و رسید
     می‌گوید. تا ۸.۲۵ این سطح فقط مشخصاتِ برداری را می‌بست و کارت‌های اسلایدز
     باز هم ساخته و به رانر فرستاده می‌شدند؛ یعنی «خاموش» تصویر را خاموش
     نمی‌کرد، فقط شکلش را عوض می‌کرد. */
  if (ytVisOn_(item.show) && lvLvl !== 'خاموش') {
    /* سبکِ همین مجموعه، از ردیفِ رجیستری. **شکستِ خواندن رشتهٔ خالی می‌دهد،
       نه یک حدس** — و خالی یعنی «همان که ذخیره شده»، پس یک هابِ نخوانده
       دوازده کارت را بی‌دلیل از نو نمی‌سازد (۷.۴۰). */
    try {
      vis = lvBuild_(folder, plan, ctx, lvSty);
      /* بازسازی شناسهٔ فایل‌ها را عوض می‌کند، پس کشِ جزوه کهنه است (باگِ ۳). */
      if (vis.restyled) { try { lvHandoutForget_(folder, item.ep); } catch (eHf) {} }
    }
    catch (eV) {
      /* شکستنِ تصویرها **هرگز** قسمت را زمین نمی‌زند: `done` درست می‌شود و
         مسیرِ کاورِ تک‌تصویریِ امروز می‌رود. قولِ «چیزی خراب نمی‌شود» همین
         خط است، نه یک جمله در سند. */
      vis = { items: [], want: 0, ready: 0, made: 0, tries: 0, done: true,
              why: 'ساختِ تصویرها نشد: ' + eV.message };
      logLine_(vis.why);
    }
  }

  // ── ویدئو رسیده؟ ──
  var video = ytVideoIn_(folder);
  if (!video) {
    /* مجموعهٔ ناقصِ تصویر درخواست نمی‌شود — ولی بی‌نهایت هم صبر نمی‌کند.
       قسمت همین‌الان منتظرِ ویدئو است، پس یک اجرای دیگر صبر کردن هزینه‌ای
       ندارد؛ و بعد از `LV_TRY_MAX` با هر چه هست می‌رود، چون انتشاری که
       هرگز نرسد از انتشارِ ساده‌تر بدتر است (۵٫۸۸، این بار از پیش). */
    /* **هر تلاش یک ردیف، موفق و ناموفق هر دو** (۷.۹۷). قسمتی که هر شب
       تلاش می‌کند و هر شب شکست می‌خورد، از بیرون با قسمتی که اصلاً تلاش
       نکرده یک شکل است — و آن دو کاملاً فرقِ هم‌اند. */
    if (vis.want) {
      try {
        var lvSub = null;
        try { lvSub = lvFolder_(folder); } catch (eLf) {}
        lvLog_(hub, { show: showName, ep: item.ep, series: seriesName,
                      style: vis.style || '', want: vis.want, ready: vis.ready,
                      made: vis.made, tries: vis.tries,
                      result: vis.done ? 'کامل' : (vis.ready ? 'ناقص' : 'نشد'),
                      why: vis.why || '',
                      kinds: lvSubNote_(vis.items),
                      gMade: vis.gMade || 0, gSpent: vis.gSpent || 0,
                      url: lvSub ? lvSub.getUrl() : '' });
      } catch (eLg) {}
    }
    /* ══ نقشهٔ نحیف، **پیش از** آپلود ثبت می‌شود (۸٫۱۱) ══
       این‌جا هنوز جبران‌شدنی است: ویدئو ساخته نشده و بازسازیِ تصویرها
       همان قسمت را از نو نقشه می‌کشد. اگر پس از انتشار ثبت می‌شد، همان
       «برنگشتنیِ» `LV_SHORT` بود و فرقِ این دو از بین می‌رفت. */
    if (vis.thin) {
      try { lvThinNote_(item.key || (String(item.show) + ':' + String(item.ep)), vis); }
      catch (eT1) {}
    }
    var tryMax = Math.max(1, Number(CFG.LV_TRY_MAX) || 3);
    if (!vis.done && vis.tries < tryMax) {
      /* و **ثبت می‌شود که منتظر است** (۷.۹۵). بی این، «منتظرِ تصویر» و
         «منتظرِ ویدئو» هر دو `waiting` اند و از بیرون یک شکل — همان سکوتی
         که بانکِ موسیقی را هفت هفته خالی نگه داشت. */
      try { lvWaitNote_(item.key || (String(item.show) + ':' + String(item.ep)), vis); }
      catch (eW1) {}
      res.waiting = true;
      res.why = 'تصویرهای این قسمت کامل نشده (' + faDigitsOut_(String(vis.ready)) +
                ' از ' + faDigitsOut_(String(vis.want)) + '، تلاشِ ' +
                faDigitsOut_(String(vis.tries)) + ')' + (vis.why ? ' — ' + vis.why : '');
      return res;
    }
    var lvKey = item.key || (String(item.show) + ':' + String(item.ep));
    if (!vis.done && vis.want) {
      logLine_('قسمتِ ' + item.ep + ': تصویرها بعد از ' + tryMax + ' تلاش کامل نشد؛ با ' +
               vis.ready + ' از ' + vis.want + ' تصویر رندر می‌شود.');
      /* **برنگشتنی، پس جدا شمرده می‌شود** (۵.۸۸): یوتیوب ویدئوی منتشرشده را
         عوض نمی‌کند، پس این عدد خودش هیچ‌وقت صفر نمی‌شود. یکی‌کردنش با
         «منتظر» یعنی عقب‌ماندگی‌ای که هرگز جبران نمی‌شود. */
      try { lvShortNote_(lvKey, vis); } catch (eS1) {}
    }
    /* و از فهرستِ منتظران بیرون می‌آید — چه کامل شده باشد چه با کم رفته
       باشد. حافظه‌ای که خودش خالی نشود، هشدارش همیشگی می‌شود. */
    try { lvWaitClear_(lvKey); } catch (eW2) {}
    /* ══ مشخصاتِ تصویری — اگر ساخته شود، رانر کارت‌ها را خودش می‌کشد ══
     * نبودش خرابی نیست: هر قسمتِ پیش از ۸.۰۱ `_times.json` ندارد و باید
     * **عیناً** مسیرِ امروز را برود. `visuals` هم کنارش می‌مانَد، هم برای
     * جزوه و هم برای موتورِ قدیمی که `spec` را نمی‌شناسد. */
    var lvSpec = null, spCtx = null;
    try {
      /* سطحِ خودِ مجموعه از همه مقدم است: «خاموش» یعنی صاحبِ برنامه برای این
         مجموعه تصویر نخواسته، و آن یک تصمیم است نه یک نقص. */
      if (lvLvl === 'خاموش') throw new Error('سطحِ تصویرسازیِ این مجموعه «خاموش» است');
      spCtx = {
        level: lvLvl, style: lvSty, bg: vis.bgIds || {},
        show: item.show, cat: String(meta.cat || meta.seriesCat || ''),
        seriesName: seriesName,
        foot: showName + (lessonNo ? '  ·  درس ' + faDigitsOut_(String(lessonNo)) : '')
      };
      lvSpec = lvSpecBuild_(folder, meta, plan, spCtx);
      if (lvSpec) {
        var nBg = lvSpec.cards.filter(function (c) { return !!c.bgId; }).length;
        logLine_('قسمتِ ' + item.ep + ': مشخصاتِ تصویری با ' +
          lvSpec.cards.length + ' کارت ساخته شد' +
          (nBg ? '، ' + nBg + ' تا با تصویرِ ساخته‌شده' : '') +
          (lvSpec.style ? '، سبکِ «' + lvSpec.style + '»' : '') +
          (lvSpec.missed ? ' (' + lvSpec.missed + ' مورد بی‌لنگر رد شد)' : '') + '.');
      } else if ((plan.visuals || []).length) {
        /* نقشه بود و مشخصات نشد — یعنی ویدئو با کارت‌های اسلایدز می‌رود، نه
           کارت‌های برداری. این یک خطِ سیاهه است نه یافته، ولی بی آن هیچ‌کس
           نمی‌فهمد کدام مسیر رفت. */
        logLine_('قسمتِ ' + item.ep + ': مشخصاتِ تصویری ساخته نشد — ' +
                 String((spCtx && spCtx.why) || 'علت نامعلوم') +
                 ' — ویدئو با کارت‌های اسلایدز می‌رود.');
      }
    } catch (eSp) {
      logLine_('مشخصاتِ تصویری نشد: ' + eSp.message);
      spCtx = spCtx || {}; spCtx.why = spCtx.why || eSp.message;
    }

    /* ══ شاهدِ نقشه **در ردیفِ عمومی** (۸.۲۹) ══
       درسِ ۵۹ با سه کارت رفت و پرسشِ «چرا» جوابی جز سیاههٔ درونِ هاب نداشت —
       که ناظر و سشنِ کد، روزی که درایو در دسترس نیست، نمی‌بینندش. `_YT-RENDER.json`
       عمومی است و هر ساعت خوانده می‌شود؛ چند عدد در آن، فردا جوابِ «مدل کم داد
       یا ساختن نرسید یا لنگر نگرفت» را بی هیچ دسترسیِ تازه‌ای می‌دهد. فقط
       شمارش و علت — هیچ متنی از درس. */
    var visInfo = null;
    if (vis.want || (plan.visuals || []).length || sceneFb) {
      visInfo = {
        asked: Number(vis.asked) || ytVisWant_(totalSec),
        planned: (plan.visuals || []).length,
        auto: (plan.visuals || []).filter(function (x) { return x && x.auto; }).length,
        model: plan.visModel || null,
        again: plan.visAsk ? { raw: Number(plan.visAsk.raw) || 0, after: Number(plan.visAsk.after) || 0 } : null,
        ready: Number(vis.ready) || 0, tries: Number(vis.tries) || 0,
        stale: Number(vis.stale) || 0,
        bg: (Number(vis.gHave) || 0) + '/' + (Number(vis.gWant) || 0),
        level: String(lvLvl || ''), style: String(lvSty || ''),
        board: (function () {
          try { var b = lvBoardSrc_(hub, item, meta);
                return { found: b.found, style: b.style, level: b.level,
                         styleSrc: b.styleSrc, levelSrc: b.levelSrc }; }
          catch (eB) { return null; }
        })(),
        secAsk: plan.visSec ? Object.keys(plan.visSec).length : 0,
        designed: (plan.visuals || []).filter(function (x) { return x && !x.auto; }).length,
        reshaped: lvSpec ? Number(lvSpec.reshaped) || 0 : 0,
        spec: lvSpec ? lvSpec.cards.length : 0,
        specMissed: lvSpec ? Number(lvSpec.missed) || 0 : 0,
        specWhy: lvSpec ? '' : String((spCtx && spCtx.why) || ''),
        sceneWhy: sceneFb || undefined
      };
    }

    ytRenderAsk_({ show: item.show, ep: item.ep, title: String(ep.title || ''),
                   folderId: folder.getId(),
                   visuals: vis.items,
                   spec: lvSpec || undefined,
                   visInfo: visInfo || undefined,
                   // **فهرستِ مرتب**، نه یک فایل: قسمتِ دوفایلی باید یک ویدئوی
                   // واحد شود، وگرنه نیمی از درس منتشر می‌شود.
                   audio: aud.parts.map(function (f) {
                     return { id: f.getId(), name: f.getName() }; }),
                   audioKind: aud.kind,
                   coverFileId: cover ? cover.fileId : '',
                   outName: outName,
                   replace: item.replace ? String(item.replace) : '' });
    res.waiting = true;
    res.why = 'ویدئو هنوز ساخته نشده؛ درخواستِ رندر گذاشته شد' +
              (vis.ready ? ' (با ' + faDigitsOut_(String(vis.ready)) + ' تصویر)' : '');
    return res;
  }
  ytRenderDone_(item.show, item.ep);

  var size = 0;
  try { size = video.getSize(); } catch (eS) {}
  if (size > 45 * 1024 * 1024) {
    res.why = 'فایلِ ویدئو ' + Math.round(size / 1048576) + ' مگابایت است؛ ' +
              'آپلودِ Apps Script سقفِ ۵۰ مگابایت دارد. با نرخِ کمتر رندر شود.';
    return res;
  }

  // ── متنِ نهایی از همان نقشه ──
  var title = String(plan.title || '');
  var desc = String(plan.description || '');
  var tags = plan.tags || [];
  var chapters = { length: Number(plan.chapters) || 0 };
  /* وارسیِ نشتی روی متنِ **نهایی** اجرا می‌شود، نه روی پاسخِ مدل — چون این
     متن ممکن است از `_yt.json` آمده باشد و آن فایل را آدم هم می‌تواند
     ویرایش کند. دروازه باید سرِ در باشد، نه سرِ یکی از راه‌ها. */
  var leaks = ytLeaks_(title + '\n' + desc + '\n' + tags.join(' '));

  // ── آپلود، اول unlisted ──
  if (!ytQuotaTake_(YT_COST.videosInsert, true)) {
    res.why = 'سهمیهٔ آپلودِ امروز تمام شد؛ فردا ادامه می‌یابد';
    res.quota = true;
    return res;
  }
  var vid = '';
  try {
    var made = yt.Videos.insert({
      snippet: { title: title, description: desc, tags: tags,
                 categoryId: isSpecial ? (CFG.YT_CATEGORY_SPECIAL || '27')
                                       : (CFG.YT_CATEGORY_VARIETY || '22'),
                 defaultLanguage: CFG.YT_LANG || 'fa',
                 defaultAudioLanguage: CFG.YT_LANG || 'fa' },
      status: { privacyStatus: CFG.YT_PRIVACY_FIRST || 'unlisted',
                selfDeclaredMadeForKids: false }
    }, 'snippet,status', video.getBlob());
    vid = made && made.id ? String(made.id) : '';
  } catch (eU) {
    res.why = 'آپلود نشد: ' + String(eU.message).slice(0, 200);
    ytLog_(hub, { show: showName, ep: item.ep, series: seriesName, title: title,
                  result: 'نشد', note: res.why, descChars: desc.length,
                  tags: tags.length, chapters: chapters.length });
    return res;
  }
  if (!vid) { res.why = 'یوتیوب شناسهٔ ویدئو برنگرداند'; return res; }
  res.videoId = vid;
  lvThinClear_(String(item.key || (item.show + ':' + item.ep)));   // منتشر شد ⇒ «نحیف» دیگر جبران‌شدنی نیست (۸.۵۴)
  var url = 'https://www.youtube.com/watch?v=' + vid;

  // ── کاور ──
  /* کاورِ رانر (نقاشیِ خودِ درس + عنوان) بر کارتِ اسلایدز مقدم است (۸.۳۱)؛
     نبودش یعنی همان کاورِ قبلی. */
  var thKey = String(item.key || (item.show + ':' + item.ep));
  /* ردیفِ رندر پایین‌تر هم لازم است (سدِ عمومی‌شدن و شمارِ تأیید) — نگارشِ اولِ ۸.۵۴
     تعریفش را با جابه‌جاییِ کاور برداشت و فقط مجموعهٔ آزمون نشانش داد. */
  var rme = null;
  try { rme = (ytRenderMapCached_() || {})[thKey] || null; } catch (eRm) { rme = null; }
  /* ماهیت از `_scenes.json`ِ همین درس (۸.۶۰): «یکنواخت» برای درس عیب است و برای قصه نه. یک
     خواندن، یک بار برای هر انتشار. */
  try {
    var natOv = '';
    try { var sdOv = lvSceneRead_(folder); natOv = sdOv ? String(sdOv.nature || '') : ''; } catch (eNo) {}
    lvOvNote_(thKey, rme, natOv);
  } catch (eOv) {}
  var th = ytThumbFor_(thKey, function () { return cover; });
  var thumb = '—';
  if (CFG.YT_THUMB !== false && th && th.blob &&
      ytQuotaTake_(YT_COST.thumbSet, false)) {
    try {
      yt.Thumbnails.set(vid, th.blob);
      thumb = th.painted ? 'نشست (نقاشی)' : 'نشست';
      ytThumbPaintSet_(thKey, th.painted ? th.src : '');
    }
    catch (eT) {
      // کاورِ سفارشی کانالِ تأییدشده می‌خواهد. این ایراد نیست، یک شرط است —
      // ولی باید گفته شود، وگرنه هر روز بی‌صدا رد می‌شود.
      thumb = 'نشد: ' + String(eT.message).slice(0, 80);
    }
  }

  // ── پلی‌لیست ──
  var plName = '', plPos = '';
  if (CFG.YT_PLAYLISTS !== false) {
    try {
      var pl = ytPlFor_(item, seriesName, showName);
      if (pl.id) {
        var items = ytPlItems_(pl.id);
        plPos = ytPlPlace_(pl.id, vid, ytWantPos_(pub, item, seriesName), items);
        plName = pl.title;
        ytPlOrderDirty_();             // سنجشِ ترتیب همین دور، از خودِ پلی‌لیست (۸.۵۷)
      }
    } catch (eP) { plPos = 'نشد: ' + String(eP.message).slice(0, 60); }
  }

  // ── و تازه حالا عمومی ──
  var privacy = CFG.YT_PRIVACY_FIRST || 'unlisted';
  /* سدِ حالتِ صحنه (۸.۳۱): سنجشِ رانر، و تأییدِ نخستین ویدئوها. یک تعریف،
     همان که `ytRedoOne_` هم می‌پرسد. */
  var gate = ytPublicGate_(String(item.key || (item.show + ':' + item.ep)), rme);
  if (!leaks.length && !gate.ok) {
    logLine_('یوتیوب ' + item.key + ': عمومی نشد و در ' + privacy + ' ماند — ' + gate.why + ' — ' + url);
    try {
      if (gate.approval) {
        mailQueue_('یوتیوب', 'ویدئوی تازهٔ صحنه‌ای منتظرِ تأیید',
                   '«' + title + '» در حالتِ Unlisted بالا رفت و منتظرِ تأیید است: ' + url);
        if (tgEnabled_()) {
          tgApi_('sendMessage', { chat_id: tgChat_(), disable_web_page_preview: false,
            text: '🎬 ویدئوی تازهٔ درس‌نامه (حالتِ صحنه‌های مصور) — هنوز عمومی نیست:\n' +
                  title + '\n' + url + '\nپس از وارسیِ فریم‌ها عمومی می‌شود.' });
        }
      } else {
        logSelfFinding_(hub, {
          priority: 'جدی', category: 'یوتیوب', key: 'yt-scene-qa',
          title: 'ویدئوی صحنه‌ای از سنجشِ خودکار رد شد؛ عمومی نشد',
          detail: item.key + ' — ' + gate.why,
          instruction: 'qa را در docs/renders.json برای همین کلید بخوان (کدام صحنه نخورد، ' +
                       'کدام قاب خالی بود). اگر عیب از رانر است، tools/scenekit.js را درست کن و ' +
                       'رندر را دوباره بخواه؛ ویدئو تا آن وقت Unlisted می‌مانَد.',
          owner: ROWNER_CODE, episode: item.ep
        });
      }
    } catch (eG) {}
  }
  if (leaks.length) {
    logLine_('یوتیوب ' + item.key + ': ' + leaks.length + ' نشتیِ خصوصی؛ ویدئو ' +
             'عمومی نشد و در ' + privacy + ' ماند.');
    try {
      logSelfFinding_(hub, {
        priority: 'جدی', category: 'یوتیوب', key: 'yt-leak',
        title: 'کپشنِ یوتیوب چیزی از جنسِ خصوصی داشت؛ ویدئو عمومی نشد',
        detail: item.key + ' — ' + leaks.map(function (x) {
          return x.kind + ' («' + x.sample + '»)'; }).join(' · '),
        instruction: 'ytScrub_ باید این الگو را هم بگیرد؛ پس از اصلاح، همان ویدئو ' +
                     'با «انتشار در یوتیوب» دوباره وارسی و عمومی می‌شود.',
        owner: ROWNER_CODE, episode: item.ep
      });
    } catch (eF) {}
  } else if (gate.ok && ytQuotaTake_(YT_COST.videosUpdate, false)) {
    try {
      yt.Videos.update({ id: vid, status: {
        privacyStatus: CFG.YT_PRIVACY_FINAL || 'public',
        selfDeclaredMadeForKids: false } }, 'status');
      privacy = CFG.YT_PRIVACY_FINAL || 'public';
      if (rme && String(rme.mode || '') === 'scenes') ytScenesOkAdd_();
    } catch (eV) {
      logLine_('عمومی‌کردنِ ویدئو نشد: ' + eV.message);
    }
  }

  ytLog_(hub, { show: showName, ep: item.ep, series: seriesName, title: title,
                videoId: vid, url: url, privacy: privacy, playlist: plName,
                audioKind: aud.kind, duration: ytTime_(totalSec),
                cast: castShare_((plan && plan.cast) || ctx.castTimeline || []),
                position: plPos, thumb: thumb, chapters: chapters.length,
                tags: tags.length, descChars: desc.length,
                leak: leaks.length ? leaks.map(function (x) { return x.kind; }).join('، ') : '',
                result: privacy === (CFG.YT_PRIVACY_FINAL || 'public') ? 'منتشر شد' : 'منتشر نشد (وارسی)',
                note: leaks.length ? 'نشتیِ خصوصی؛ در ' + privacy + ' ماند'
                    : (!gate.ok ? gate.why + '؛ در ' + privacy + ' ماند' : '') });
  logLine_('یوتیوب: «' + title + '» ' +
           (privacy === 'public' ? 'منتشر شد' : 'در ' + privacy + ' ماند') + ' — ' + url);
  res.ok = !leaks.length && gate.ok; res.url = url; res.privacy = privacy; res.title = title;
  res.why = leaks.length ? 'نشتیِ خصوصی' : (!gate.ok ? gate.why : '');
  return res;
}

/**
 * پلی‌لیستِ درستِ این قسمت.
 * درس‌نامه: یکی برای هر مجموعه — چون خودِ مجموعه واحدِ یادگیری است.
 * برنامهٔ متنوع: یکی برای کلِ برنامه.
 * نام و شماره هر دو از رجیستری می‌آیند، پس تغییرِ آن‌ها این‌جا اثر می‌گذارد.
 */
function ytPlFor_(item, seriesName, showName) {
  var isSpecial = String(item.show) === ENRICH_SHOW_SPECIAL;
  if (!isSpecial) {
    var t = String(showName || CFG.SHOW_NAME);
    return { id: ytPlEnsure_('show:' + ENRICH_SHOW_VARIETY, t,
                             String(CFG.SHOW_TAGLINE || '') +
                             '\nهمهٔ قسمت‌ها، به ترتیبِ انتشار.'), title: t };
  }
  var key = ytPlKey_(item.show, item.seriesKey, seriesName);
  var title = String(seriesName || 'مجموعه') + ' — ' + String(showName || CFG.SPECIAL_SHOW_NAME);
  return { id: ytPlEnsure_(key, title,
                           'درس‌به‌درس، به ترتیب. ' + String(CFG.SPECIAL_TAGLINE || '')),
           title: title };
}

/**
 * جای درستِ این ویدئو در پلی‌لیست.
 *
 * ══ چرا نه «آخرش اضافه کن» و نه «شمارهٔ قسمت منهای یک» ══
 * «آخرش اضافه کن» ترتیب را به ترتیبِ آپلود گره می‌زند — و آپلود می‌تواند
 * به‌هم بخورد (کاوشِ گذشته، یک شبِ ناموفق، سهمیه‌ای که وسطِ کار تمام شود).
 * «شمارهٔ قسمت منهای یک» هم غلط است چون شماره‌ها همیشه پیوسته نیستند: یک
 * قسمتِ رهاشده یعنی همهٔ بعدی‌ها یک خانه جلوتر از جای واقعی‌شان می‌افتند.
 *
 * جوابِ درست: **چند قسمتِ منتشرشدهٔ همین پلی‌لیست شماره‌شان از این کمتر
 * است؟** آن عدد، دقیقاً همان جای درست است — با هر ترتیبِ آپلود و با هر
 * شکافی در شماره‌ها. یعنی حتی اگر قسمتِ امشب پیش از قسمت‌های گذشته آپلود
 * شود، وقتی آن‌ها برسند خودشان *بالای* آن می‌نشینند.
 */
/* ══ همیشه صفر بود، از ۶ سپتامبر (۸.۵۷) ══
 * این تابع کلیدِ `pub` را با **نامِ نمایشی** («درس‌نامه») می‌سنجید، ولی `ytPublished_`
 * از همان روز کلیدها را با `ytShowKey_` یک‌دست می‌کند («special»). پس هیچ ردیفی
 * «همین برنامه» شمرده نمی‌شد، جواب همیشه ۰ بود، و هر ویدئوی تازه **بالای**
 * پلی‌لیست می‌نشست: پلی‌لیستِ مجموعه از نو به کهنه. سنجه‌های ۱۴.۳ تا ۱۴.۷ سبز بودند
 * چون `pub` را دستی با کلیدِ نمایشی می‌ساختند — شکلی که تولید از ۶ سپتامبر نمی‌سازد
 * (۷.۲۲). §۸۶ همان را از درِ `ytLog_` ⇒ `ytPublished_` می‌سازد. هر دو طرف از یک
 * تعریف می‌گذرند تا هر دو شکلِ کلید پذیرفته شود. */
function ytWantPos_(pub, item, seriesName) {
  var mine = Number(item.ep) || 0;
  var myShow = ytShowKey_(item.show);
  var n = 0;
  for (var k in pub) {
    if (!Object.prototype.hasOwnProperty.call(pub, k)) continue;
    var rec = pub[k];
    if (!rec || !rec.videoId) continue;
    var cut = String(k).lastIndexOf(':');
    var bits = [String(k).slice(0, cut), String(k).slice(cut + 1)];
    if (ytShowKey_(bits[0]) !== myShow) continue;          // برنامهٔ دیگر
    if (myShow === ENRICH_SHOW_SPECIAL &&
        String(rec.series || '') !== String(seriesName || '')) continue;   // مجموعهٔ دیگر
    var other = Number(bits[1]) || 0;
    if (other && other < mine) n++;
  }
  return n;
}

/* ─────────────────── ۱۰-ب) ترتیبِ پلی‌لیست، از خودِ پلی‌لیست (۸.۵۷) ───────────────────
 *
 * «مراقب باش بعد از درسِ بعدیش نیفته تو لیست.» — و جوابِ راست این بود که از ۶ سپتامبر
 * هیچ ویدئویی سرِ جایش ننشسته بود: `ytWantPos_` همیشه صفر می‌داد. درست کردنِ آن تابع
 * فقط ویدئوی **بعدی** را درست می‌گذارد؛ آنچه از قبل نشسته باید جابه‌جا شود — همان
 * «پاک‌کردنِ ورودی آنچه نوشته شده را درست نمی‌کند» (۵.۹۵).
 *
 * پس ترتیب از **خودِ پلی‌لیست** سنجیده می‌شود، نه از حسابِ ما: هر ویدئوی پلی‌لیست با
 * شناسه‌اش به شمارهٔ قسمت برگردانده می‌شود (تبِ انتشار، یک خواندن)، و ترتیبِ درست
 * «شمارهٔ کمتر بالاتر» است. ویدئوی ناشناخته (افزودهٔ دستیِ آدم) دست نمی‌خورد و پایین
 * می‌مانَد. جابه‌جایی‌ها کمینه‌اند: بلندترین زیررشتهٔ ازپیش‌مرتب سرِ جایش می‌مانَد و
 * فقط بقیه جابه‌جا می‌شوند — هر جابه‌جایی ۵۰ واحد سهمیه است.
 */

/** شناسهٔ ویدئو ⇒ {show, ep} از تبِ انتشار — همهٔ ردیف‌ها، نه فقط آخرین هر کلید
    (ویدئوی جایگزین‌شده هم شمارهٔ خودش را دارد). */
function ytVidEps_(hub) {
  var out = Object.create(null);
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.YT_TAB || 'انتشار در یوتیوب');
    if (!sh || sh.getLastRow() < 2) return out;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, YT_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var vid = String(v[i][YU.VID - 1] || '').trim();
      var ep = Number(String(v[i][YU.EP - 1] || '').trim()) || 0;
      if (!vid || !ep) continue;
      out[vid] = { show: ytShowKey_(v[i][YU.SHOW - 1]), ep: ep };
    }
  } catch (e) {}
  return out;
}

/**
 * نقشهٔ جابه‌جایی — تابعِ خالص، تا بشود بی یوتیوب سنجیدش.
 * @param {Array} cur  اقلامِ پلی‌لیست به ترتیبِ فعلی: {id, videoId}
 * @param {Function} epOf  شناسهٔ ویدئو ⇒ شمارهٔ قسمت (۰ = ناشناخته)
 * @return {{target: string[], moves: Array<{id, videoId, pos}>, wrong: number}}
 *   `moves` به همان ترتیب باید اجرا شوند؛ `pos` جای نهاییِ آن قلم پس از همان حرکت است.
 */
function ytPlOrderPlan_(cur, epOf) {
  var rows = [];
  for (var i = 0; i < (cur || []).length; i++) {
    var e = Number(epOf(cur[i].videoId)) || 0;
    rows.push({ id: String(cur[i].id), videoId: String(cur[i].videoId || ''), i: i, ep: e > 0 ? e : 0 });
  }
  var ours = rows.filter(function (r) { return r.ep > 0; });
  var rest = rows.filter(function (r) { return !(r.ep > 0); });
  ours.sort(function (a, b) { return (a.ep - b.ep) || (a.i - b.i); });
  var target = ours.concat(rest), rank = Object.create(null);
  for (var k = 0; k < target.length; k++) rank[target[k].id] = k;
  // بلندترین زیررشتهٔ صعودی (رتبه‌ها یکتا) — همین‌ها سرِ جایشان می‌مانند
  var tails = [], tailAt = [], prev = [];
  for (var j = 0; j < rows.length; j++) {
    var x = rank[rows[j].id], lo = 0, hi = tails.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (tails[mid] < x) lo = mid + 1; else hi = mid; }
    prev[j] = lo > 0 ? tailAt[lo - 1] : -1;
    tails[lo] = x; tailAt[lo] = j;
  }
  var keep = Object.create(null);
  for (var p = tails.length ? tailAt[tails.length - 1] : -1; p >= 0; p = prev[p]) keep[rows[p].id] = 1;
  var arr = rows.map(function (r) { return r.id; }), moves = [];
  for (var t = 0; t < target.length; t++) {
    var id = target[t].id;
    if (keep[id]) continue;
    var from = arr.indexOf(id);
    arr.splice(from, 1);
    var pos = t === 0 ? 0 : arr.indexOf(target[t - 1].id) + 1;
    arr.splice(pos, 0, id);
    if (pos !== from) moves.push({ id: id, videoId: target[t].videoId, pos: pos });
  }
  return { target: target.map(function (r) { return r.id; }), moves: moves, wrong: moves.length };
}

function ytPlOrderState_() {
  try { var j = JSON.parse(props_().getProperty(PK.YT_PLORD) || 'null'); return (j && typeof j === 'object') ? j : {}; }
  catch (e) { return {}; }
}
function ytPlOrderSave_(st) {
  try { props_().setProperty(PK.YT_PLORD, JSON.stringify(st)); } catch (e) {}
}
/** پس از هر آپلود یا جایگزینی: دورِ بعد حتماً بسنجد. */
function ytPlOrderDirty_() {
  var st = ytPlOrderState_(); st.dirty = true; ytPlOrderSave_(st);
}
/** نوبتِ سنجش هست؟ — بی هیچ خواندنی جز Properties. */
function ytPlOrderDue_() {
  if (CFG.YT_PL_ORDER === false) return false;
  var st = ytPlOrderState_();
  if (st.dirty || Number(st.left) > 0) return true;
  var t = parseWhen_(String(st.at || ''));
  if (isNaN(t)) return true;
  return (new Date().getTime() - t) / 3600000 >= Math.max(1, Number(CFG.YT_PL_ORDER_HOURS) || 20);
}

/**
 * ترتیبِ همهٔ پلی‌لیست‌های موتور را با شمارهٔ قسمت می‌سنجد و تا سقف جابه‌جا می‌کند.
 * سهمیهٔ یک آپلود همیشه کنار می‌مانَد: ترتیب منتظر می‌مانَد، انتشار نه.
 */
function ytPlOrderFix_(budgetMs, hubIn) {
  var out = { checked: 0, wrong: 0, moved: 0, left: 0, failed: 0, why: '', pls: [] };
  var yt = ytSvc_(); if (!yt || CFG.YT_PL_ORDER === false) { out.why = 'خاموش'; return out; }
  var t0 = new Date().getTime(), budget = Math.max(10000, Number(budgetMs) || 60000);
  var q = ytQuota_(), capU = Math.max(100, Number(CFG.YT_QUOTA_UNITS) || 9000);
  /* سهمیهٔ انتشارهای همین روز کنار می‌مانَد (دو برنامه + یک جایگزینی): ترتیب یک روز صبر می‌کند،
     انتشارِ قسمتِ فردا نه. */
  var reserve = ytUnitsPerEpisode_() * Math.max(1, Number(CFG.YT_PL_ORDER_RESERVE_EPS) || 3);
  var room = Math.floor((capU - q.units - reserve) / YT_COST.itemsUpdate);
  var allow = Math.max(0, Math.min(Number(CFG.YT_PL_ORDER_MOVES) || 40, room));
  var eps = ytVidEps_(hubIn);
  var map = ytPlMap_();
  for (var key in map) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
    var rec = map[key] || {};
    if (!rec.id) continue;
    if (new Date().getTime() - t0 > budget) { out.why = out.why || 'وقتِ این دور تمام شد'; break; }
    var items = ytPlItems_(rec.id);
    out.checked++;
    var plan = ytPlOrderPlan_(items, function (vid) { return (eps[vid] || {}).ep || 0; });
    var row = { key: key, n: items.length, wrong: plan.wrong, moved: 0 };
    out.wrong += plan.wrong;
    for (var m = 0; m < plan.moves.length; m++) {
      if (out.moved >= allow) { out.why = out.why || (allow < (Number(CFG.YT_PL_ORDER_MOVES) || 40) ? 'سهمیهٔ امروز' : 'سقفِ جابه‌جاییِ این دور'); break; }
      if (new Date().getTime() - t0 > budget) { out.why = out.why || 'وقتِ این دور تمام شد'; break; }
      if (!ytQuotaTake_(YT_COST.itemsUpdate, false)) { out.why = 'سهمیهٔ امروز'; break; }
      var mv = plan.moves[m];
      try {
        yt.PlaylistItems.update({ id: mv.id, snippet: {
          playlistId: rec.id, position: mv.pos,
          resourceId: { kind: 'youtube#video', videoId: mv.videoId } } }, 'snippet');
        out.moved++; row.moved++;
      } catch (eM) {
        /* یک جابه‌جاییِ ناموفق، شبیه‌سازی را از واقعیت جدا می‌کند: بقیهٔ همین پلی‌لیست
           دورِ بعد از فهرستِ تازه حساب می‌شود، نه از حسابی که دیگر درست نیست. */
        out.failed++; out.why = 'جابه‌جایی نشد: ' + String(eM.message).slice(0, 80);
        break;
      }
    }
    out.pls.push(row);
  }
  out.left = Math.max(0, out.wrong - out.moved);
  ytPlOrderSave_({ at: nowStr_(), wrong: out.wrong, moved: out.moved, left: out.left,
                   failed: out.failed, why: out.why, pls: out.pls, dirty: false });
  if (out.moved || out.failed) {
    logLine_('ترتیبِ پلی‌لیست‌ها: ' + out.moved + ' ویدئو جابه‌جا شد' +
             (out.left ? '، ' + out.left + ' مانده' : '') + (out.why ? ' — ' + out.why : '') + '.');
  }
  return out;
}

/** خطِ روزانه: ترتیبِ پلی‌لیست‌ها — از Properties، بی خواندنِ یوتیوب (۷.۶۳). */
function ytPlOrderLine_() {
  var st = ytPlOrderState_();
  if (!st.at) return 'ترتیبِ پلی‌لیست‌ها: هنوز سنجیده نشده';
  if (!(Number(st.wrong) > 0)) return 'ترتیبِ پلی‌لیست‌ها: ✓ همه به ترتیبِ شمارهٔ قسمت (سنجش ' + st.at + ')';
  return (Number(st.left) > 0 ? '⚠ ' : '') + 'ترتیبِ پلی‌لیست‌ها: ' + st.moved + ' ویدئو جابه‌جا شد' +
         (Number(st.left) > 0 ? '، ' + st.left + ' هنوز سرِ جایش نیست' + (st.why ? ' (' + st.why + ')' : '') +
                                ' — دورِ بعد ادامه می‌یابد' : '؛ حالا به ترتیب') + ' (' + st.at + ')';
}

/* ─────────────────── ۱۰-پ) جایگزینیِ ویدئوی منتشرشده (۸.۵۷) ───────────────────
 *
 * «باز سازی کن و جایگزین کن، فقط مراقب باش بعد از درسِ بعدیش نیفته تو لیست.» — یوتیوب
 * فایلِ ویدئوی منتشرشده را عوض نمی‌کند، پس «جایگزینی» یعنی ویدئوی تازه + کنار رفتنِ قبلی.
 * هیچ راهِ تازه‌ای برای ساختن نیست: همان زنجیرهٔ عادی (صحنه‌ها ⇒ رندر ⇒ برداشت ⇒ آپلود)
 * دوباره راه می‌افتد، فقط با سه دستکاری:
 *   ۱) ویدئوی قبلیِ پوشه به زیرپوشهٔ «ویدئوی پیشین — جایگزین‌شده» می‌رود (نه سطل): بی آن،
 *      `ytVideoIn_` همان را می‌یافت و همان را دوباره بالا می‌برد.
 *   ۲) کلیپ از نو انتخاب می‌شود و کارت‌های کم‌آمده از نو پر می‌شوند — دو کاری که ۸.۵۶ فقط
 *      برای درس‌های تازه می‌کرد؛ نقاشی‌ها و داوری‌ها همان می‌مانند (پولشان داده شده).
 *   ۳) ردیفِ رندر و ردیفِ نقشهٔ رانر یک `replace` (همان `tag`) می‌گیرند. بی این، نقشهٔ رانر
 *      نشانیِ ویدئوی **قبلی** را برای همین کلید داشت و موتور همان را دوباره برمی‌داشت.
 *
 * و ترتیبِ کنار رفتن عمدی است: قبلی فقط وقتی کنار می‌رود که تازه **عمومی** است — از خودِ
 * یوتیوب پرسیده می‌شود، نه از دفترِ ما. قبلی پاک نمی‌شود: از پلی‌لیست بیرون می‌آید و خصوصی
 * می‌شود؛ اگر تازه بد بود، برگشتنی است. جای تازه در پلی‌لیست از `ytWantPos_` (درست‌شده) و
 * سپس از `ytPlOrderFix_` می‌آید؛ پس پیش از درسِ بعدی می‌نشیند، با هر ترتیبِ رسیدن.
 */
var YT_REPLACE_ = null;
/** فهرستِ جایگزینی‌ها از گیت‌هاب — یک خواندن در هر اجرا. {کلید: {tag, why}} */
function ytReplaceList_() {
  if (YT_REPLACE_) return YT_REPLACE_;
  var out = {};
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.YT_REPLACE_FILE || 'docs/yt-replace.json'),
                                { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) {
      var it = (JSON.parse(res.getContentText()) || {}).items || {};
      for (var k in it) {
        if (!Object.prototype.hasOwnProperty.call(it, k) || !it[k]) continue;
        var tag = String((typeof it[k] === 'object' ? it[k].tag : it[k]) || '').trim();
        if (tag) out[k] = { tag: tag, why: String((it[k] && it[k].why) || '') };
      }
    }
  } catch (e) {}
  YT_REPLACE_ = out;
  return out;
}
function ytReplState_() {
  try { var j = JSON.parse(props_().getProperty(PK.YT_REPL) || '{}'); return (j && typeof j === 'object') ? j : {}; }
  catch (e) { return {}; }
}
function ytReplSave_(st) {
  try { props_().setProperty(PK.YT_REPL, JSON.stringify(st)); } catch (e) {}
}

/** ویدئوهای پوشه (فقط سطحِ بالا) به زیرپوشهٔ «پیشین» — برمی‌گرداند چند تا رفت. */
function ytReplaceAside_(folder) {
  var nm = 'ویدئوی پیشین — جایگزین‌شده', n = 0, sub = null;
  var it = folder.getFiles(), vids = [];
  while (it.hasNext()) { var f = it.next(); if (/\.mp4$/i.test(f.getName())) vids.push(f); }
  if (!vids.length) return 0;
  var fi = folder.getFoldersByName(nm);
  sub = fi.hasNext() ? fi.next() : folder.createFolder(nm);
  for (var i = 0; i < vids.length; i++) { vids[i].moveTo(sub); n++; }
  return n;
}

/** کلیپ و پرکردنِ کارت‌ها از نو؛ نقاشی و داوری همان. */
function ytReplaceScenes_(folder, tag) {
  var d = lvSceneRead_(folder);
  if (!d) return '';
  var notes = [];
  if (d.clip) { d.clip = { state: '' }; notes.push('کلیپ از نو انتخاب می‌شود'); }
  if (d.ovFillAt) { delete d.ovFillAt; delete d.ovFill; notes.push('کارت‌های کم‌آمده از نو'); }
  d.replaceTag = String(tag);
  lvSceneWrite_(folder, d);
  return notes.join('، ');
}

/** نوبتِ جایگزینی؛ بی کلید در فایل، هیچ خواندنی جز همان فایلِ کوچکِ گیت‌هاب. */
function ytReplaceTick_(budgetMs, hubIn) {
  var out = { checked: 0, prepped: 0, swapped: 0, notes: [] };
  if (!ytOn_()) return out;
  var list = ytReplaceList_(), keys = Object.keys(list);
  if (!keys.length) return out;
  var st = ytReplState_(), hub = null, pub = null, changed = false;
  var t0 = new Date().getTime(), budget = Math.max(15000, Number(budgetMs) || 60000);
  var getPub = function () {
    if (!pub) { hub = hub || hubIn || getHub_(); pub = ytPublished_(hub); }
    return pub;
  };
  for (var i = 0; i < keys.length; i++) {
    if (new Date().getTime() - t0 > budget) break;
    var key = keys[i], tag = list[key].tag, cur = st[key] || {};
    /* میان‌بُر، نه سد (۷.۷۱): حالتِ تمام‌شده به هیچ شاخهٔ پایین نمی‌رسد؛ این فقط شمارش را تمیز نگه می‌دارد. */
    if (cur.tag === tag && ['done', 'skip', 'fail'].indexOf(String(cur.phase || '')) !== -1) continue;
    out.checked++;
    var showK = ytShowKey_(key.slice(0, key.lastIndexOf(':')));
    var ep = key.slice(key.lastIndexOf(':') + 1);
    try {
      if (cur.tag !== tag) {
        // ── آغاز: قبلی کنار، صحنه‌ها آماده، صف ──
        var rec = getPub()[showK + ':' + ep];
        if (!rec || !rec.videoId) {
          st[key] = { tag: tag, phase: 'skip', at: nowStr_(),
                      why: 'این قسمت هنوز منتشر نشده؛ انتشارِ عادی همان ویدئوی تازه را می‌سازد' };
          changed = true; continue;
        }
        var rq = ytRenderRead_(), folderId = '';
        for (var r = 0; r < rq.items.length; r++) if (String(rq.items[r].key) === showK + ':' + ep) folderId = String(rq.items[r].folderId || '');
        if (!folderId) {
          st[key] = { tag: tag, phase: 'fail', at: nowStr_(), why: 'پوشهٔ قسمت در صفِ رندر پیدا نشد' };
          changed = true; continue;
        }
        var folder = DriveApp.getFolderById(folderId);
        var aside = ytReplaceAside_(folder);
        var scNote = '';
        try { scNote = ytReplaceScenes_(folder, tag); } catch (eSc) { scNote = 'صحنه‌ها: ' + eSc.message; }
        var sKey = '';
        try {
          var reg = readSeriesReg_(hub);
          for (var g = 0; g < reg.rows.length; g++) {
            if (String(reg.rows[g].vals[SC.NAME - 1] || '') === String(rec.series || '')) { sKey = String(reg.rows[g].key || ''); break; }
          }
        } catch (eRg) {}
        ytDueDrop_(showK + ':' + ep);
        var dl = ytDueList_();
        dl.push({ key: showK + ':' + ep, show: showK, ep: String(ep), folderId: folderId,
                  seriesKey: sKey, seriesName: String(rec.series || ''), replace: tag, at: nowStr_() });
        ytDueSave_(ytDueOrder_(dl));
        st[key] = { tag: tag, phase: 'build', at: nowStr_(), oldVid: rec.videoId, oldUrl: String(rec.url || ''),
                    folderId: folderId, seriesKey: sKey, tries: 0, aside: aside, why: list[key].why || '' };
        changed = true; out.prepped++;
        logLine_('جایگزینیِ ویدئوی ' + key + ' آغاز شد: ' + aside + ' ویدئوی قبلی به «پیشین» رفت' +
                 (scNote ? '؛ ' + scNote : '') + '؛ قبلی (' + rec.videoId + ') تا عمومی‌شدنِ تازه سرِ جایش است.');
        continue;
      }
      if (cur.phase === 'build') {
        var rec2 = getPub()[showK + ':' + ep] || {};
        if (rec2.videoId && rec2.videoId !== cur.oldVid) {
          cur.newVid = rec2.videoId; cur.newUrl = String(rec2.url || ''); cur.phase = 'swap'; cur.upAt = nowStr_();
          changed = true;
        } else {
          var inDue = ytDueList_().some(function (x) { return String(x.key) === showK + ':' + ep; });
          if (!inDue) {
            cur.tries = (Number(cur.tries) || 0) + 1;
            if (cur.tries >= Math.max(1, Number(CFG.YT_REPLACE_TRY_MAX) || 3)) {
              cur.phase = 'fail'; cur.why = 'آپلودِ نسخهٔ تازه ' + cur.tries + ' بار نشد — علت در تبِ انتشار';
            } else {
              var dl2 = ytDueList_();
              dl2.push({ key: showK + ':' + ep, show: showK, ep: String(ep), folderId: cur.folderId,
                         seriesKey: String(cur.seriesKey || ''), seriesName: String(rec2.series || ''), replace: tag, at: nowStr_() });
              ytDueSave_(ytDueOrder_(dl2));
            }
            changed = true;
          }
          st[key] = cur;
          continue;
        }
      }
      if (cur.phase === 'swap') {
        var yt = ytSvc_();
        var priv = '';
        if (ytQuotaTake_(YT_COST.videosList, false)) {
          var vl = yt.Videos.list('status', { id: cur.newVid });
          priv = String((((vl && vl.items) || [])[0] || {}).status ? vl.items[0].status.privacyStatus : '');
        }
        if (priv !== 'public') {
          cur.why = 'نسخهٔ تازه هنوز ' + (priv || 'نامعلوم') + ' است؛ قبلی تا عمومی‌شدنش سرِ جایش می‌مانَد';
          st[key] = cur; changed = true; continue;
        }
        var pulled = 0, pmap = ytPlMap_();
        for (var pk in pmap) {
          if (!Object.prototype.hasOwnProperty.call(pmap, pk) || !(pmap[pk] || {}).id) continue;
          var its = ytPlItems_(pmap[pk].id);
          for (var q = 0; q < its.length; q++) {
            if (its[q].videoId !== cur.oldVid) continue;
            if (!ytQuotaTake_(YT_COST.itemsDelete, false)) break;
            yt.PlaylistItems.remove(its[q].id); pulled++;
          }
        }
        if (!ytQuotaTake_(YT_COST.videosUpdate, false)) { cur.why = 'سهمیهٔ امروز برای خصوصی‌کردنِ قبلی نماند'; st[key] = cur; changed = true; continue; }
        yt.Videos.update({ id: cur.oldVid, status: { privacyStatus: 'private', selfDeclaredMadeForKids: false } }, 'status');
        cur.phase = 'done'; cur.doneAt = nowStr_(); cur.pulled = pulled; cur.why = '';
        st[key] = cur; changed = true; out.swapped++;
        ytPlOrderDirty_();
        var msg = '🔁 ویدئوی ' + key + ' جایگزین شد.\nتازه: ' + cur.newUrl + '\nقبلی (' + cur.oldVid +
                  ') پاک نشد: خصوصی شد و از پلی‌لیست بیرون آمد (' + pulled + ').';
        logLine_(msg.replace(/\n/g, ' '));
        try { mailQueue_('یوتیوب', 'ویدئوی ' + key + ' جایگزین شد', msg); } catch (eMq) {}
        try { if (tgEnabled_()) tgApi_('sendMessage', { chat_id: tgChat_(), text: msg, disable_web_page_preview: false }); } catch (eTg) {}
      }
    } catch (e) {
      cur.why = 'خطا: ' + String(e.message).slice(0, 120);
      cur.errAt = nowStr_();
      st[key] = cur; changed = true;
      out.notes.push(key + ': ' + cur.why);
    }
  }
  if (changed) ytReplSave_(st);
  return out;
}

/** خطِ روزانهٔ جایگزینی‌ها — از Properties، بی هیچ خواندنی (۷.۶۳). */
function ytReplaceStatus_() {
  var st = ytReplState_(), out = { items: [], line: '', problem: '' }, L = [];
  var label = { build: 'در ساخت', swap: 'منتظرِ عمومی‌شدنِ تازه', done: 'انجام شد', skip: 'لازم نشد', fail: 'نشد' };
  for (var k in st) {
    if (!Object.prototype.hasOwnProperty.call(st, k)) continue;
    var c = st[k] || {};
    var age = (new Date().getTime() - parseWhen_(String(c.doneAt || c.at || ''))) / 86400000;
    if (c.phase === 'done' && age > 7) continue;            // هفتهٔ پس از انجام، دیگر خبر نیست
    out.items.push({ key: k, phase: c.phase, why: c.why || '', newUrl: c.newUrl || '', oldVid: c.oldVid || '' });
    L.push(k + ': ' + (label[c.phase] || c.phase) + (c.phase === 'done' && c.newUrl ? ' — ' + c.newUrl : '') +
           (c.why && c.phase !== 'done' ? ' (' + c.why + ')' : ''));
    if (c.phase === 'fail') out.problem = 'جایگزینیِ ویدئوی ' + k + ' نشد — ' + (c.why || '');
    else if ((c.phase === 'build' || c.phase === 'swap') && age > 2) {
      out.problem = 'جایگزینیِ ویدئوی ' + k + ' بیش از دو روز است در «' + label[c.phase] + '» مانده' + (c.why ? ' — ' + c.why : '');
    }
  }
  if (L.length) out.line = '🔁 جایگزینیِ ویدئو: ' + L.join(' · ');
  return out;
}

/* ─────────────────── ۱۱) همگام‌سازیِ پلی‌لیست‌ها با رجیستری ───────────────────
 *
 * «هر چیز شماره‌گذاری کردم و یا حتی تغییرش دادم، اینجا هم تو پلی‌لیست اثر
 * بذاره.» — پس هر شب نامِ پلی‌لیست با نامِ مجموعه سنجیده می‌شود و لینکش در
 * ستونِ «پلی‌لیست یوتیوب» همان ردیف می‌نشیند.
 *
 * اثرانگشت نگه داشته می‌شود تا شبی که هیچ‌چیز عوض نشده، هیچ فراخوانی نرود:
 * سهمیه‌ای که بی‌دلیل خرج شود، آپلودِ فردا را می‌خوابانَد.
 */
function ytPlaylistSync_(budgetMs) {
  var out = { checked: 0, made: 0, renamed: 0, linked: 0, covers: 0,
              coverFails: [], skipped: false };
  if (!ytOn_() || CFG.YT_PLAYLISTS === false) return out;
  var t0 = new Date().getTime();
  var budget = Math.max(15000, Number(budgetMs) || 60000);
  var hub = getHub_();

  /* ── برنامهٔ ترکیبی: یک پلی‌لیست، و تا ۶٫۱۳ هیچ‌وقت از این‌جا رد نمی‌شد ──
   * پلی‌لیستش در مسیرِ آپلود ساخته می‌شود و رجیستری هم ندارد، پس حلقهٔ
   * پایین (که رجیستریِ مجموعه‌ها را می‌پیماید) هرگز به آن نمی‌رسید: نه کاور
   * می‌گرفت، نه پادکست می‌شد. حالا اول از همه، و با همان تعریفِ مشترک. */
  try {
    var vKey = ytPlKey_(ENRICH_SHOW_VARIETY, '', '');
    var vMap = ytPlMap_(), vRec = vMap[vKey] || {};
    if (vRec.id) {
      out.checked++;
      ytPlDress_(vRec.id, vRec.title, String(CFG.SHOW_NAME || ''),
                 String(CFG.SHOW_NAME || ''), String(CFG.SHOW_NAME || ''),
                 false, out, vKey);
    }
  } catch (eV) { logLine_('پلی‌لیستِ برنامهٔ ترکیبی رسیدگی نشد: ' + eV.message); }

  var reg;
  try { reg = readSeriesReg_(hub); } catch (e) { return out; }

  // فقط مجموعه‌هایی که واقعاً قسمتی منتشر شده دارند — ساختنِ پلی‌لیست برای
  // ۲۶۴ مجموعه‌ای که هنوز یک قسمت هم ندارند، هم سهمیه هدر می‌دهد و هم کانال
  // را پر از پلی‌لیستِ خالی می‌کند.
  var pub = ytPublished_(hub), live = Object.create(null);
  try {
    var sh = hub.getSheetByName(CFG.YT_TAB || 'انتشار در یوتیوب');
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(2, 1, sh.getLastRow() - 1, YT_HEADERS.length).getValues();
      for (var i = 0; i < v.length; i++) {
        var sn = String(v[i][YU.SERIES - 1] || '');
        if (sn && String(v[i][YU.VID - 1] || '')) live[sn] = 1;
      }
    }
  } catch (e2) {}

  var sig = [];
  for (var r = 0; r < reg.rows.length; r++) {
    var nm = String(reg.rows[r].vals[SC.NAME - 1] || '');
    if (!nm || !live[nm]) continue;
    sig.push(String(reg.rows[r].key) + '=' + nm);
  }
  var sigStr = sig.join('|');
  var was = '';
  try { was = String(props_().getProperty(PK.YT_PLSIG) || ''); } catch (e3) {}
  /* ══ «چیدمان عوض نشده» یعنی «کاری نیست» نبود (۸.۵۵) ══
     این میان‌بُر هر دورِ پلی‌لیستِ مجموعه‌ها را رد می‌کرد مگر نامی عوض شود —
     پس پلی‌لیستِ بی‌کاور یا پادکست‌نشده **هرگز** دوباره رسیدگی نمی‌شد؛ فقط
     پلی‌لیستِ برنامهٔ ترکیبی (که بالاتر و بی این میان‌بُر است) تلاش می‌کرد.
     حالا فقط وقتی رد می‌شود که هر پلی‌لیستِ زنده کاور و پادکست دارد. */
  var undressed = 0;
  try {
    var mU = ytPlMap_();
    for (var u0 = 0; u0 < reg.rows.length; u0++) {
      var nmU = String(reg.rows[u0].vals[SC.NAME - 1] || '');
      if (!nmU || !live[nmU]) continue;
      var rU = mU[ytPlKey_(ENRICH_SHOW_SPECIAL, reg.rows[u0].key, nmU)] || {};
      if (!rU.id || !rU.cover || (CFG.YT_PODCAST !== false && !rU.podcast)) undressed++;
    }
  } catch (eU) {}
  out.undressed = undressed;
  if (sigStr === was && !undressed) { out.skipped = true; return out; }

  for (var q = 0; q < reg.rows.length; q++) {
    if (new Date().getTime() - t0 > budget) break;
    var rec = reg.rows[q];
    var name = String(rec.vals[SC.NAME - 1] || '');
    if (!name || !live[name]) continue;
    out.checked++;
    var map0 = ytPlMap_();
    var pk = ytPlKey_(ENRICH_SHOW_SPECIAL, rec.key, name);
    var had = !!(map0[pk] || {}).id;
    var titleWas = String((map0[pk] || {}).title || '');
    var pl = ytPlFor_({ show: ENRICH_SHOW_SPECIAL, seriesKey: rec.key },
                      name, CFG.SPECIAL_SHOW_NAME);
    if (!pl.id) continue;
    if (!had) out.made++; else if (titleWas && titleWas !== pl.title) out.renamed++;
    var url = ytPlUrl_(pl.id);
    if (String(rec.vals[SC.YT - 1] || '') !== url) {
      try {
        reg.sheet.getRange(rec.row, SC.YT, 1, 1).setValue(url);
        out.linked++;
      } catch (e4) {}
    }
    /* ══ کاورِ پلی‌لیست هرگز گذاشته نمی‌شد (۶٫۱۲) ══
     * شرطِ قبلی «تازه‌ساخته یا تغییرِ نام» بود — درست به‌نظر می‌رسید و در
     * عمل هیچ‌وقت برقرار نمی‌شد: پلی‌لیست تقریباً همیشه **در مسیرِ آپلود**
     * زاده می‌شود (`ytPlFor_` داخلِ `ytUploadOne_`)، و وقتی نوبتِ این تابع
     * می‌رسد دیگر «تازه» نیست. پس یوتیوب کاورِ ویدئوی اول را نشان می‌داد —
     * که عنوانِ یک قسمت است روی یک مجموعه.
     *
     * چاره این نیست که شرط را کمی جابه‌جا کنیم؛ این است که سؤال عوض شود:
     * نه «همین حالا ساختیمش؟» بلکه **«کاور دارد یا نه؟»** — که در نقشه
     * نگه داشته می‌شود. این خودش پلی‌لیست‌های موجود را هم درمان می‌کند و
     * هر شب هم چیزی نمی‌فرستد. */
    var renamed = !!(titleWas && titleWas !== pl.title);
    ytPlDress_(pl.id, pl.title, name, CFG.SPECIAL_SHOW_NAME || '',
               String(rec.vals[SC.CAT - 1] || name), renamed, out, pk);
  }
  try { props_().setProperty(PK.YT_PLSIG, sigStr); } catch (e5) {}
  /* عکسِ همین دور، حتی خالی — وگرنه شکستِ دیشب پس از سقف‌خوردنِ تلاش‌ها تا
     ابد در سلامت می‌مانْد، چون دیگر هیچ تلاشی نبود که بازنویسی‌اش کند (۶٫۵۴). */
  try { ytPlCoverFailSave_(out.coverFails); } catch (eCf2) {}
  if (out.made || out.renamed) {
    logLine_('پلی‌لیستِ یوتیوب: ' + out.made + ' تازه، ' + out.renamed + ' نامش عوض شد.');
  }
  return out;
}

/* ─────────────────── ۱۲) گرداننده ─────────────────── */
function ytRunDue_(maxItems, budgetMs) {
  var out = { tried: 0, done: 0, waiting: 0, failed: 0, left: 0, notes: [], quota: false };
  if (!ytOn_()) { out.notes.push(ytOffWhy_()); return out; }
  var cap = Math.max(1, Number(maxItems) || Number(CFG.YT_MAX_PER_RUN) || 2);
  var budget = Math.max(20000, Number(budgetMs) || Number(CFG.YT_MS) || 150000);
  var t0 = new Date().getTime();
  /* مهلتِ این دور، برای کارِ درازِ درونِ یک قسمت (ساختِ صحنه‌ها، ۸.۳۱): بی
     آن، صحنه‌ها بودجهٔ خودشان را از صفر می‌شمردند و دورِ دوساعته از سقفِ
     شش‌دقیقه‌ای می‌گذشت — کشته‌شدنی بی خطا. */
  _ytRunDeadline = t0 + budget;
  var hub = getHub_();
  var pub = ytPublished_(hub);
  /* صف مرتب مصرف می‌شود — و مرتب‌سازی این‌جا دوباره انجام می‌شود، نه فقط
     هنگامِ افزودن: ردیف‌هایی که پیش از ۵٫۹۸ ثبت شده‌اند ترتیب ندارند، و یک
     مرتب‌سازیِ ارزان همه‌شان را سرِ جای درست می‌آورد. */
  var list = ytDueOrder_(ytDueList_());

  /* ══ گرسنگی‌ای که سقف می‌ساخت (۶٫۷) ══
   * «منتظرِ ویدئو» هم یک تلاش شمرده می‌شد. با سقفِ دو تا در شب، اگر دو ردیفِ
   * اولِ صف ویدئو نداشتند، بقیهٔ صف **هیچ‌وقت** آزموده نمی‌شد — و اگر رندرِ
   * قسمتِ اول هرگز موفق نمی‌شد، همهٔ قسمت‌های بعدی تا ابد پشتش می‌ماندند.
   * ترتیبِ انتشار هم چیزی را نجات نمی‌داد، چون جای هر ویدئو در پلی‌لیست از
   * `ytWantPos_` حساب می‌شود نه از ترتیبِ آپلود؛ پس ماندنِ پشتِ یک ردیفِ
   * گیرکرده هیچ سودی نداشت و فقط صف را قفل می‌کرد.
   * حالا سقف فقط **آپلودِ واقعی** را می‌شمارد. برای اینکه صفِ ۲۶۴تایی هم کلِ
   * شب را نخورد، یک سقفِ جداگانهٔ پویش هست که ارزان‌تر است و بودجه هم
   * همچنان بالای سرِ حلقه ایستاده. */
  var scanCap = Math.max(cap, Math.min(list.length, cap * 8));
  var scanned = 0;
  for (var i = 0; i < list.length && out.tried < cap && scanned < scanCap; i++) {
    // دستِ‌کم یکی، حتی اگر بودجه تنگ است — وگرنه در شبِ شلوغ هیچ‌وقت
    // نوبتِ یوتیوب نمی‌رسد و صف تا ابد می‌ماند.
    if (scanned && new Date().getTime() - t0 > budget) break;
    var it = list[i];
    scanned++;
    var r;
    try { r = ytUploadOne_(it, hub, pub); }
    catch (e) { r = { ok: false, why: 'خطا: ' + e.message }; }
    if (r.quota) { out.quota = true; break; }
    if (r.waiting) { out.waiting++; out.notes.push(it.key + ': ' + r.why); continue; }
    out.tried++;
    if (r.ok || r.videoId) {
      ytDueDrop_(it.key);
      if (r.ok) { out.done++; ytPubStamp_(); }
      else { out.failed++; out.notes.push(it.key + ': ' + r.why); }
    } else {
      out.failed++;
      out.notes.push(it.key + ': ' + r.why);
      ytLog_(hub, { show: it.show, ep: it.ep, result: 'نشد', note: r.why });
      // شمارِ تلاش از خودِ تب می‌آید؛ پس از سقف، `ytBackfill_` دیگر صفش نمی‌کند
      ytDueDrop_(it.key);
    }
  }
  out.left = ytDueList_().length;
  /* کارنامهٔ همین دور ذخیره می‌شود تا وارسیِ سلامت بتواند **علت** را بگوید.
     تا ۶٫۲۶ «منتظرِ ویدئو» فقط در سیاهه می‌نشست: نه ردیفی در تب می‌ساخت، نه
     سطری در ایمیل، نه هشداری. صاحبِ برنامه فقط می‌دید هیچ ویدئویی نیامده و
     هیچ‌جا ننوشته بود چرا. */
  try { ytRunNote_(out); } catch (eRn) {}
  return out;
}

/** مهرِ آخرین انتشارِ موفق — تنها راهِ فهمیدنِ «چند روز است هیچ‌چیز نرفته». */
function ytPubStamp_() {
  try { props_().setProperty(PK.YT_LASTPUB, new Date().toISOString()); } catch (e) {}
}

/** کارنامهٔ آخرین دورِ صف: چند تا رفت، چند تا منتظر، و چرا. */
function ytRunNote_(out) {
  props_().setProperty(PK.YT_LASTRUN, JSON.stringify({
    at: new Date().toISOString(),
    done: Number(out.done) || 0, waiting: Number(out.waiting) || 0,
    failed: Number(out.failed) || 0, left: Number(out.left) || 0,
    quota: !!out.quota, notes: (out.notes || []).slice(0, 4)
  }));
}

function ytLastRun_() {
  try {
    var j = JSON.parse(props_().getProperty(PK.YT_LASTRUN) || 'null');
    return (j && typeof j === 'object') ? j : null;
  } catch (e) { return null; }
}

/**
 * چند روز است هیچ ویدئویی منتشر نشده؟ -1 یعنی هرگز مهری نخورده.
 *
 * مهر از ۶٫۲۶ زده می‌شود، پس برای موتوری که قبلاً کار می‌کرده اولین بار
 * «هرگز» می‌دهد. همان اولین انتشارِ بعدی درستش می‌کند، و تا آن‌وقت هم
 * تبِ انتشار خودش تاریخِ آخرین ردیف را دارد — پس این تابع اول سراغِ تب
 * می‌رود و فقط اگر آن هم چیزی نداشت، «هرگز» می‌گوید.
 */
function ytPubIdleDays_(hub) {
  var ms = 0;
  try {
    var raw = props_().getProperty(PK.YT_LASTPUB);
    if (raw) ms = new Date(raw).getTime();
  } catch (e) {}
  if (!ms) {
    try {
      var sh = (hub || getHub_()).getSheetByName(CFG.YT_TAB || 'انتشار در یوتیوب');
      if (sh && sh.getLastRow() > 1) {
        var v = sh.getRange(2, 1, sh.getLastRow() - 1, YT_HEADERS.length).getValues();
        for (var i = 0; i < v.length; i++) {
          if (!String(v[i][YU.VID - 1] || '').trim()) continue;   // فقط ردیفِ موفق
          var t = ytWhen_(v[i][YU.AT - 1]).ms;
          if (!isNaN(t) && t > ms) ms = t;
        }
      }
    } catch (e2) {}
  }
  if (!ms) return -1;
  return Math.floor((new Date().getTime() - ms) / 86400000);
}

/**
 * دورِ دومِ روز — همان کارِ شبانه، کوچک‌تر، ساعتِ ۱۰.
 *
 * ══ چرا لازم شد ══
 * دو دلیل، و دومی از اولی مهم‌تر است.
 *
 * ۱) **راه‌اندازیِ سرد.** نصبِ کد ۰۲:۳۰ انجام می‌شود ولی همان اجرا با کدِ
 *    *قبلی* ادامه می‌یابد؛ پس هر قابلیتِ تازه‌ای که فقط در کارِ شبانه صدا
 *    زده شود، شبِ اولش اجرا نمی‌شود. برای ۶٫۶ معنایش این بود که کاربر باید
 *    دکمه را دستی می‌زد — و «سیستم منتظرِ آدم بماند» دقیقاً همان چیزی است
 *    که نباید باشد.
 *
 * ۲) **زنجیره سه حلقه دارد و هر حلقه یک نوبت لازم دارد:** موتور اجازه
 *    می‌دهد → اکشن می‌سازد → موتور برمی‌دارد. با یک نوبت در شبانه‌روز، هر
 *    قسمت سه شب طول می‌کشد. با دو نوبت، یک روز.
 *
 * ارزان است و باید بماند: بی ویدئوی آماده و بی صفِ باز، تقریباً هیچ‌کاری
 * نمی‌کند. سقفش هم کوچک است تا وارسیِ سلامت را عقب نیندازد.
 */
/**
 * ══ یوتیوب دیگر مسافرِ اجرای کسِ دیگری نیست (۶٫۳۷) ══
 *
 * گزارشِ صاحبِ برنامه: «باز تو یوتیوب هیچ اتفاقی نیفتاد با اینکه یک روزِ
 * کامل گذشت.» و راست می‌گفت — صف از ۱۵ به ۱۷ رفت و منتشرشده روی ۲ ماند.
 *
 * دو نوبتِ روزانه داشت و هر دو **مهمانِ اجرای کسِ دیگری** بودند:
 *   • کارِ شبانه — هشتمین بند، پشتِ گشتنِ موسیقی و بازشنیدنِ بانک و جزوه.
 *     بودجهٔ کلِ شب ۲۷۰ ثانیه است؛ وقتی نوبتش می‌رسد چند ده ثانیه مانده و
 *     آپلودِ یک ویدئوی ۱۴ مگابایتی در آن جا نمی‌شود.
 *   • وارسیِ سلامتِ ۱۰ صبح — و آن اجرا همان روز اصلاً به آخر نرسید
 *     (`health.checkedAt` مالِ دیروز بود). یعنی هر دو شانس در یک روز رفت.
 *
 * کاری که صفش هر روز دو تا رشد می‌کند، نمی‌تواند مهمانِ صفِ کسِ دیگری
 * بماند. این تابع زمان‌بندیِ خودش را دارد: کوچک، کران‌دار، و بی‌رقیب.
 * دو نوبتِ قبلی سرِ جایشان می‌مانند — سه در برای یک کار، نه یکی کمتر.
 */
function ytPublishTick() {
  /* شاهدِ اجرا (۸.۱۱): مهر **پیش از** کار، تا از کشته‌شدنِ اجرا جان
     به در ببرد — ۷.۴۴، این بار برای همهٔ تریگرها نه فقط شبانه.
     `finally` پایانِ تمیز را تضمین می‌کند؛ کشته‌شدنِ سرِ شش دقیقه را
     نه — و دقیقاً همان حالتی است که این شاهد برایش ساخته شده. */
  runEnter_('ytPublishTick');
  try {
  var out = { ok: true, collected: 0, published: 0, queued: 0, waiting: 0, why: '' };
  /* درِ دومِ «کارِ رندر منتظر است» (۸.۵۸) — فقط Properties، پیش از هر کارِ سنگین. */
  try { ghRenderKickDue_(); } catch (eGkd) {}
  try {
    if (!ytOn_()) { out.ok = false; out.why = ytOffWhy_(); return out; }
    var r = ytTick_(Math.max(60000, Number(CFG.YT_TICK_MS) || 240000));
    out.collected = r.collected; out.published = r.published;
    out.queued = r.queued; out.waiting = r.waiting; out.why = r.why || '';
    /* سطرِ سیاهه فقط وقتی چیزی شد یا چیزی نشد و علتی هست — نه هر دو ساعت
       یک سطرِ «هیچ». */
    if (r.collected || r.published || r.queued) {
      logLine_('یوتیوبِ دوره‌ای: ' + r.queued + ' به صف، ' + r.collected +
               ' ویدئو برداشته شد، ' + r.published + ' منتشر شد.');
    } else if (r.why) {
      logLine_('یوتیوبِ دوره‌ای: کاری انجام نشد — ' + r.why);
    }
  } catch (e) {
    out.ok = false; out.why = e.message;
    logLine_('یوتیوبِ دوره‌ای اجرا نشد: ' + e.message);
  }
  return out;

  } finally { runExit_('ytPublishTick'); }
}

function ytTick_(budgetMs) {
  var out = { collected: 0, published: 0, waiting: 0, queued: 0, why: '' };
  if (CFG.YT_ENABLED === false) { out.why = 'خاموش'; return out; }
  var t0 = new Date().getTime();
  var budget = Math.max(20000, Number(budgetMs) || 90000);
  var left = function () { return budget - (new Date().getTime() - t0); };

  /* ══ چرا کاوشِ گذشته هم این‌جاست (۶٫۱۲) ══
   * تا ۶٫۱۱ کاوشِ قسمت‌های گذشته فقط در کارِ شبانه بود. یعنی وقتی ۶٫۹ باگِ
   * نامِ پوشه را بست، بیست قسمتِ «از همه جا از همه رنگ» باید تا ۰۲:۳۰ منتظر
   * می‌ماندند — نصفِ روز، برای کاری که ارزان است و مکان‌نما دارد. حالا دو
   * نوبت در روز، مثلِ بقیهٔ زنجیره. */
  try {
    var b = ytBackfill_(Number(CFG.YT_BACKFILL_WALK) || 12);
    out.queued = b.queued;
  } catch (eB) { out.why = 'کاوش: ' + String(eB.message).slice(0, 60); }

  try {
    var c = ytRenderCollect_(Math.max(15000, left() - 40000));
    out.collected = c.got;
  } catch (e) { out.why += (out.why ? ' · ' : '') + 'برداشت: ' + String(e.message).slice(0, 60); }

  /* ویدئوی تأییدشده‌ای که هنوز Unlisted است (۸.۴۶) — درِ دوم، کنارِ کارِ شبانه.
     **پیش از** انتشارِ تازه (۸.۵۰): `ytRunDue_` صحنه‌های درسِ تازه را تا مهلتش
     می‌سازد، و تا ۸.۴۹ این در پشتِ آن بود با شرطِ «۳۰ ثانیه مانده» — یعنی درست
     روزی که درسِ تازه ساخته می‌شود، ویدئوی تأییدشده نوبت نمی‌گرفت (۷.۵۹: آنچه
     خواسته شده پشتِ آنچه کسی نخواسته نمی‌مانَد). ارزان است: بی کلیدِ تأییدشدهٔ
     باز، فقط یک خواندنِ فایلِ کوچکِ گیت‌هاب. */
  if (left() > 60000) {
    try { ytApprovedRedo_(Math.min(60000, left() - 45000)); }
    catch (eAp) { out.why += (out.why ? ' · ' : '') + 'تأییدشده: ' + String(eAp.message).slice(0, 60); }
  }
  /* کاورِ نقاشی که با عمومی‌شدن پاک شده بود، برمی‌گردد (۸.۵۴). بی نامزد هیچ
     خواندنی ندارد جز نقشهٔ رندرها که همین اجرا از قبل گرفته. */
  /* آنچه بیننده می‌بیند، پیش از برگرداندن: کاورِ عمومیِ عوض‌شده همین دور برمی‌گردد (۸.۵۵). */
  if (left() > 70000) {
    try { ytThumbAudit_(Math.min(30000, left() - 55000)); }
    catch (eTa) { out.why += (out.why ? ' · ' : '') + 'کاورِ عمومی: ' + String(eTa.message).slice(0, 60); }
  }
  if (left() > 45000) {
    try { ytThumbRestore_(Math.min(40000, left() - 30000)); }
    catch (eTr) { out.why += (out.why ? ' · ' : '') + 'کاورِ نقاشی: ' + String(eTr.message).slice(0, 60); }
  }
  /* جایگزینیِ ویدئوی منتشرشده (۸.۵۷) — پیش از انتشار، تا قسمتِ آماده‌شده همین دور در صف باشد. */
  if (left() > 40000) {
    try { ytReplaceTick_(Math.min(45000, left() - 30000)); }
    catch (eRpl) { out.why += (out.why ? ' · ' : '') + 'جایگزینی: ' + String(eRpl.message).slice(0, 60); }
  }
  if (left() > 25000) {
    try {
      var r = ytRunDue_(1, Math.max(20000, left() - 15000));
      out.published = r.done; out.waiting = r.waiting;
    } catch (e2) { out.why += (out.why ? ' · ' : '') + 'انتشار: ' + String(e2.message).slice(0, 60); }
  }
  /* ══ ترتیبِ پلی‌لیست‌ها (۸.۵۷) ══ پس از انتشار، تا ویدئوی همین دور هم سنجیده شود.
     بی نوبت (`ytPlOrderDue_` فقط Properties می‌خوانَد) هیچ هزینه‌ای ندارد. */
  if (left() > 30000 && ytPlOrderDue_()) {
    try { ytPlOrderFix_(Math.min(60000, left() - 20000)); }
    catch (ePo) { out.why += (out.why ? ' · ' : '') + 'ترتیبِ پلی‌لیست: ' + String(ePo.message).slice(0, 60); }
  }
  /* ══ درِ دومِ ویدئوهای گیرکرده (۸.۵۴) ══
     `ytRedoStuckNightly_` فقط در کارِ شبانه بود، پشتِ `ytLeft()`؛ و کارِ شبانه از
     ۳ اکتبر هر شب پیش از بلوکِ یوتیوب مرد. پس سه ویدئوی قدیمی (`variety:20`،
     `special:26`، `variety:23`) هفته‌ها Unlisted ماندند و خطِ روزانه هر روز می‌گفت
     «علتشان پس از بازسنجیِ شبانه این‌جا می‌آید» — وعده‌ای که هیچ راهی برایش
     پیموده نمی‌شد (۷٫۴۶). روزی یک بار این‌جا هم، فقط وقتی وقت هست. */
  if (left() > 50000 && ytStuckTickDue_()) {
    try { ytRedoStuckNightly_(Math.min(45000, left() - 20000)); ytStuckTickMark_(); }
    catch (eSt) { out.why += (out.why ? ' · ' : '') + 'گیرکرده‌ها: ' + String(eSt.message).slice(0, 60); }
  }
  /* هشدارِ «نقشهٔ نحیف» برای درسی که منتشر شده، دیگر جبران‌شدنی نیست (۸.۵۴). */
  if (left() > 15000) {
    try { lvThinPrune_(); } catch (eTp) {}
  }
  /* بازخورد آخرین بندِ کارِ شبانه است و در شبِ شلوغ گرسنه می‌مانَد. این‌جا
     دومین شانسش است — و چون `ytStatsDue_` هر ~۲۰ ساعت یک بار اجازه می‌دهد،
     دو نوبت در روز یعنی «حتماً یک بار»، نه «دو بار». */
  if (left() > 12000) {
    try { if (ytStatsDue_()) ytStatsRun_(Math.max(10000, left() - 4000)); }
    catch (e3) { out.why += (out.why ? ' · ' : '') + 'بازخورد: ' + String(e3.message).slice(0, 60); }
  }

  /* ══ سومین بارِ همان شکاف: راه‌اندازیِ سرد (۶٫۱۸) ══
   * پلی‌لیست و شناسنامهٔ کانال فقط در کارِ شبانه بودند. نصبِ کد ۰۲:۳۰ انجام
   * می‌شود ولی همان اجرا با کدِ *قبلی* ادامه می‌یابد — پس هر اصلاحی در این
   * دو، **دو شب** طول می‌کشید تا اجرا شود: شبِ نصب با کدِ کهنه می‌دوید و
   * نوبتِ بعدی شبِ بعد بود. کاورِ مربعِ پادکست و بنر دقیقاً همین‌طور عقب
   * افتادند.
   *
   * هر دو نگهبانِ تازگیِ خودشان را دارند (اثرانگشتِ چیدمان و امضای
   * شناسنامه)، پس دویدنِ دوباره در روز تقریباً رایگان است: شبی که چیزی عوض
   * نشده باشد، هیچ فراخوانی نمی‌رود. این را دو بار پیش‌تر هم یاد گرفتیم و
   * هر بار فقط برای یک بند درستش کردیم — الگو همان است، و باید همه‌جا باشد. */
  if (left() > 30000) {
    try { ytPlaylistSync_(Math.max(15000, left() - 15000)); }
    catch (e4) { out.why += (out.why ? ' · ' : '') + 'پلی‌لیست: ' + String(e4.message).slice(0, 60); }
  }
  if (left() > 15000) {
    try { ytChannelSync_(false); }
    catch (e5) { out.why += (out.why ? ' · ' : '') + 'شناسنامه: ' + String(e5.message).slice(0, 60); }
  }
  return out;
}

/* ─────────────────── ۱۳) دیده‌شدن ───────────────────
 *
 * «من هیچ‌وقت نمی‌روم توی شیت و تب‌ها را نگاه کنم.» — پس هرچه این بخش
 * می‌داند باید در `_STATUS.json` و در یک جملهٔ فارسیِ آمادهٔ ایمیل باشد،
 * **هر روز، حتی وقتی همه‌چیز خوب است**. سکوت را نمی‌شود از سلامت تشخیص داد.
 */
function ytStatus_() {
  var out = { enabled: CFG.YT_ENABLED !== false, service: !!ytSvc_(), why: ytOffWhy_(),
              published: 0, unlisted: 0, failed: 0, due: 0, waitingRender: 0,
              renderOldestDays: 0, playlists: 0, quota: null, last: null, line: '',
              plWhy: [], feedback: null, thumbAudit: '' };
  try { out.thumbAudit = ytThumbAuditLine_(); } catch (eTa) {}
  /* بازخورد داخلِ همین شیء می‌نشیند تا در `_STATUS.json` باشد — تنها فایلی
     که سشنِ ناظر واقعاً می‌خواند. چیزی که فقط در یک تب باشد، برای ناظر
     وجود ندارد. */
  try { out.feedback = ytStatsStatus_(); } catch (eFb0) {}
  /* پلی‌لیست‌ها با وضعِ کاور و پادکستشان در `_STATUS.json` می‌نشینند — تنها
     فایلی که سشنِ ناظر واقعاً می‌خواند. چیزی که فقط در Properties باشد،
     برای ناظر وجود ندارد. */
  try {
    var pmapS = ytPlMap_(), pls = [];
    for (var pkS in pmapS) {
      if (!Object.prototype.hasOwnProperty.call(pmapS, pkS)) continue;
      var rS = pmapS[pkS] || {};
      if (!rS.id) continue;
      pls.push({ key: pkS, title: String(rS.title || ''), url: ytPlUrl_(rS.id),
                 cover: !!rS.cover, podcast: !!rS.podcast,
                 coverWhy: String(rS.coverWhy || ''), podWhy: String(rS.podWhy || '') });
    }
    out.playlistList = pls;
    out.noCover = pls.filter(function (x) { return !x.cover; }).length;
    out.noPodcast = pls.filter(function (x) { return !x.podcast; }).length;
    /* ══ عدد بی علت، هفته‌ها تکرار می‌شود و کسی نمی‌داند چرا (۶٫۴۲) ══
     * «پلی‌لیست ۱ (۱ بی‌کاور) (۱ پادکست‌نشده)» هر روز رفت و هیچ‌جا نگفت
     * چرا — چون تنها جایی که علت را می‌دانست (`ytPlDress_`) آن را فقط وقتی
     * ثبت می‌کرد که علت «سهمیه» **نباشد**. و سهمیه محتمل‌ترین علت است:
     * هر آپلود ۱۶۰۰ واحد می‌برد و کاورِ پلی‌لیست ته صف است. یعنی
     * محتمل‌ترین علت، تنها علتی بود که هرگز نوشته نمی‌شد. */
    for (var w = 0; w < pls.length; w++) {
      if (!pls[w].cover && pls[w].coverWhy) out.plWhy.push('کاور: ' + pls[w].coverWhy);
      if (!pls[w].podcast && pls[w].podWhy) out.plWhy.push('پادکست: ' + pls[w].podWhy);
    }
  } catch (ePl) {}
  try {
    var hub = getHub_();
    var pub = ytPublished_(hub);
    for (var k in pub) {
      if (!Object.prototype.hasOwnProperty.call(pub, k)) continue;
      if (pub[k].videoId) {
        out.published++;
        if (String(pub[k].privacy || '') !== (CFG.YT_PRIVACY_FINAL || 'public')) {
          out.unlisted++;
          (out.unlistedKeys = out.unlistedKeys || []).push(k);
        }
      } else if (pub[k].tries >= Math.max(1, Number(CFG.YT_TRY_MAX) || 3)) out.failed++;
    }
    /* چرا هر کدام هنوز عمومی نیست — از آخرین بازسنجیِ شبانه (۸.۳۵). یک
       `getProperty`، نه خواندنِ تازه. */
    try {
      var sw = JSON.parse(props_().getProperty(PK.YT_STUCK_WHY) || '[]') || [];
      out.stuckWhy = sw.filter(function (x) { return (out.unlistedKeys || []).indexOf(x.key) !== -1; });
    } catch (eSw) { out.stuckWhy = []; }
    var sh = hub.getSheetByName(CFG.YT_TAB || 'انتشار در یوتیوب');
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(sh.getLastRow(), 1, 1, YT_HEADERS.length).getValues()[0];
      out.last = { at: ytWhen_(v[YU.AT - 1]).text, title: String(v[YU.TITLE - 1]),
                   url: String(v[YU.URL - 1]), result: String(v[YU.RESULT - 1]),
                   privacy: String(v[YU.PRIV - 1]) };
    }
  } catch (e) {}
  try { out.due = ytDueList_().length; } catch (e2) {}
  try {
    var rp = ytRenderPending_();
    out.waitingRender = rp.n; out.renderOldestDays = rp.oldestDays;
  } catch (e3) {}
  try {
    var m = ytPlMap_(), n = 0;
    for (var p in m) if (Object.prototype.hasOwnProperty.call(m, p)) n++;
    out.playlists = n;
  } catch (e4) {}
  try { out.quota = ytQuota_(); } catch (e5) {}
  try { out.channel = ytChannelState_(); } catch (e6) { out.channel = null; }
  /* ترتیبِ پلی‌لیست‌ها و جایگزینی‌ها (۸.۵۷) — از Properties، بی خواندنِ یوتیوب. */
  try { out.plOrder = ytPlOrderState_(); out.plOrderLine = ytPlOrderLine_(); } catch (e7) {}
  try { out.replace = ytReplaceStatus_(); } catch (e8) { out.replace = null; }
  try { out.kick = ghKickStatus_(); } catch (e9) { out.kick = null; }
  out.line = ytLine_(out);
  return out;
}

/** جملهٔ فارسیِ آماده — عددها بعد از واژه می‌آیند، وگرنه در متنِ راست‌به‌چپ می‌پرند. */
function ytLine_(st) {
  if (!st.enabled) return 'یوتیوب: خاموش است.';
  if (!st.service) return 'یوتیوب: ' + st.why + '.';
  var L = ['یوتیوب: منتشرشده ' + faDigitsOut_(String(st.published)) + ' ویدئو'];
  if (st.unlisted) L.push('در انتظارِ وارسی ' + faDigitsOut_(String(st.unlisted)));
  if (st.due) L.push('در صف ' + faDigitsOut_(String(st.due)));
  if (st.waitingRender) {
    L.push('منتظرِ ساختِ ویدئو ' + faDigitsOut_(String(st.waitingRender)) +
           (st.renderOldestDays ? ' (قدیمی‌ترین ' + faDigitsOut_(String(st.renderOldestDays)) + ' روز)' : ''));
  }
  if (st.failed) L.push('رهاشده ' + faDigitsOut_(String(st.failed)));
  if (st.playlists) {
    /* پلی‌لیستِ بی‌کاور یا بی‌پادکست از بیرون سالم به‌نظر می‌رسد — پس عدد
       باید گفته شود، نه فقط شمارِ پلی‌لیست‌ها. */
    L.push('پلی‌لیست ' + faDigitsOut_(String(st.playlists)) +
           (st.noCover ? ' (' + faDigitsOut_(String(st.noCover)) + ' بی‌کاور)' : '') +
           (st.noPodcast ? ' (' + faDigitsOut_(String(st.noPodcast)) + ' پادکست‌نشده)' : '') +
           ((st.plWhy || []).length ? ' — ' + st.plWhy.slice(0, 2).join(' · ') : ''));
  }
  /* تخمینِ تخلیه، چون سقفش را یوتیوب گذاشته نه ما — و صاحبِ ۲۶۴ قسمتِ گذشته
     حق دارد بداند چند روز طول می‌کشد، به‌جای اینکه هر روز بپرسد چرا تمام
     نشد. */
  if (st.due || st.waitingRender) {
    var dr = ytDrain_((st.due || 0) + (st.waitingRender || 0));
    if (dr.days > 1) {
      L.push('با سقفِ سهمیهٔ یوتیوب روزی ' + faDigitsOut_(String(dr.perDay)) +
             ' قسمت، یعنی حدودِ ' + faDigitsOut_(String(dr.days)) + ' روز');
    }
  }
  var s = L.join(' · ') + '.';
  if (st.last && st.last.url) s += ' آخرین: «' + auditCut_(st.last.title, 45) + '».';
  return s;
}

/**
 * ایرادها و یادداشت‌های روزانه.
 * بندِ مهمش «منتظرِ رندر» است: اگر کسی MP4 نسازد، هیچ‌چیز منتشر نمی‌شود و
 * از بیرون شبیهِ «خاموش بودن» است. بانکِ موسیقی هفته‌ها به همین دلیل خالی
 * ماند؛ این بار از روزِ اول گفته می‌شود.
 */
function ytHealth_(problems, notes) {
  if (CFG.YT_ENABLED === false) return null;
  var st = null;
  try { st = ytStatus_(); } catch (e) { return null; }
  if (!st.service) notes.push('یوتیوب هنوز وصل نیست: ' + st.why + '.');
  else notes.push(st.line);
  if (st.service && st.thumbAudit) notes.push(st.thumbAudit);
  /* ترتیبِ پلی‌لیست هر روز گفته می‌شود — «۹۷ منتشرشده» چیزی دربارهٔ اینکه درسِ ۴۰
     پیش از ۴۱ است نمی‌گوید، و همین سکوت سه هفته پلی‌لیست را وارونه نگه داشت (۸.۵۷). */
  if (st.service && st.plOrderLine) {
    notes.push(st.plOrderLine);
    var po = st.plOrder || {};
    if (Number(po.failed) > 0) problems.push('جابه‌جاییِ پلی‌لیست شکست خورد — ' + String(po.why || ''));
  }
  if (st.replace && st.replace.line) {
    notes.push(st.replace.line);
    if (st.replace.problem) problems.push(st.replace.problem);
  }
  /* راه‌اندازِ رندر (۸.۵۸): هر روز یک جمله، حتی بی توکن — سکوت این‌جا یعنی او
     نمی‌فهمد ویدئو منتظرِ زمان‌بندیِ گیت‌هاب است. */
  if (st.kick && st.kick.line) {
    notes.push(st.kick.line);
    if (st.kick.problem) problems.push(st.kick.problem);
  }

  /* سرویس فعال است ولی کانال خوانده نمی‌شود؟ این بدترین حالت است — از بیرون
     شبیهِ «کار می‌کند» به‌نظر می‌رسد و هیچ ویدئویی هم بالا نمی‌رود. پس
     همان‌جا علتش پرسیده و نوشته می‌شود. */
  /* بازخورد هر روز گفته می‌شود، حتی وقتی خبری نیست — «صاحبش هیچ‌وقت شیت را
     باز نمی‌کند»، پس چیزی که فقط در یک تب زندگی کند، وجود ندارد. */
  try {
    var fb = ytStatsStatus_();
    if (fb && fb.line) notes.push(fb.line);
    if (fb && fb.newComments7d) {
      notes.push('کامنت‌های تازه در تبِ «' + (CFG.YTC_TAB2 || 'کامنت‌های یوتیوب') +
                 '» ثبت شده‌اند — پاسخ‌دادنشان کارِ شماست، موتور جواب نمی‌دهد.');
    }
  } catch (eFb) {}

  if (st.service && st.channel && !st.channel.at && ytTodoDue_()) {
    var dg = null;
    try { dg = ytDiagnose_(); } catch (eDg) {}
    if (dg && !dg.channelOk) {
      problems.push(HY_ + 'یوتیوب وصل است ولی کانال خوانده نمی‌شود — ' +
                    (dg.cause || 'علت نامعلوم') +
                    (dg.fix ? '. چاره: ' + dg.fix : '') +
                    ' (منو ← «عیب‌یابی و رفعِ دسترسیِ یوتیوب»)');
      try { props_().setProperty('YT_TODO_AT', nowStr_()); } catch (eS) {}
    }
  }

  /* بندِ رندر پیش از وارسیِ اتصال می‌آید و عمداً به آن وابسته نیست: ساختِ
     ویدئو کارِ طرفِ دیگر است. اگر این بند پشتِ «سرویس وصل است؟» می‌ماند،
     قطع‌شدنِ سرویس انبوهِ درخواست‌های بی‌جواب را هم نامرئی می‌کرد — یعنی
     دو خرابی، با یک سکوت. */
  /* ══ صف پر است و هیچ‌چیز نمی‌رود (۶٫۲۶) ══
   * حالتی که هیچ نگهبانی نداشت و کاربر با آن روبه‌رو شد: ویدئوها ساخته
   * شده بودند، صف پر بود، و شب‌ها هیچ‌چیز منتشر نمی‌شد. «منتظرِ ویدئو»
   * نه ردیفی در تب می‌سازد، نه سطری در ایمیل، نه هشداری — پس از بیرون
   * دقیقاً شبیهِ «کاری نبود» به‌نظر می‌رسید.
   * «بیکار» و «گیرکرده» دو چیزند: صفِ خالی بیکار است، صفِ پر گیر کرده. */
  try {
    var idle = ytPubIdleDays_(null);
    var stallD = Math.max(1, Number(CFG.YT_STALL_DAYS) || 2);
    var lr = ytLastRun_();
    if (st.due > 0 && idle >= stallD) {
      var why = (lr && lr.notes && lr.notes.length)
        ? ' علت‌هایی که آخرین دور گفت: ' + lr.notes.join(' · ')
        : ' آخرین دورِ صف هیچ علتی ثبت نکرده.';
      problems.push('یوتیوب گیر کرده: ' + faDigitsOut_(String(st.due)) +
                    ' قسمت در صف است ولی ' + faDigitsOut_(String(idle)) +
                    ' روز است هیچ ویدئویی منتشر نشده' +
                    (lr && lr.quota ? ' (سهمیهٔ یوتیوب تمام شده بود)' : '') + '.' + why);
      try {
        logSelfFinding_(getHub_(), {
          priority: 'جدی', category: 'یوتیوب', key: 'yt-stalled',
          title: 'صفِ یوتیوب پر است و ' + idle + ' روز هیچ انتشاری نبوده',
          detail: 'در صف: ' + st.due + ' · آخرین دور: ' +
                  (lr ? ('منتشر ' + lr.done + '، منتظر ' + lr.waiting +
                         '، ناموفق ' + lr.failed) : 'ثبت نشده') +
                  (lr && lr.notes ? ' — ' + lr.notes.join(' · ') : ''),
          instruction: 'اگر همهٔ ردیف‌ها «منتظرِ ویدئو»اند، حلقهٔ برداشتِ ویدئو ' +
                       '(ytRenderCollect_) کار نمی‌کند: نقشه، اجازهٔ فایل، یا ' +
                       'دانلود. اگر سهمیه تمام شده، سقفِ روزانه را پایین بیاور.',
          owner: ROWNER_CODE
        });
      } catch (eF) {}
    }
  } catch (eStall) {}

  var days = Math.max(1, Number(CFG.YT_STUCK_DAYS) || 3);
  if (st.waitingRender && st.renderOldestDays >= days) {
    problems.push('ساختِ ویدئو ' + faDigitsOut_(String(st.renderOldestDays)) +
                  ' روز است انجام نشده (' + faDigitsOut_(String(st.waitingRender)) +
                  ' درخواستِ باز در ' + (CFG.YT_RENDER_FILE || '_YT-RENDER.json') +
                  '). موتور نمی‌تواند ویدئو بسازد؛ تا وقتی کسی آن MP4ها را ' +
                  'نسازد، هیچ قسمتی منتشر نمی‌شود.');
  }

  /* شناسهٔ صف در `tools/render.js` ثابت نوشته شده، چون اکشن از بیرون راهی
     برای جست‌وجو در درایو ندارد. اگر فایل پاک و دوباره ساخته شود، شناسه عوض
     می‌شود و اکشن **بی هیچ خطایی** تا ابد صفِ کهنه را می‌خواند. این تنها
     جایی است که آن سکوت شکسته می‌شود. */
  try {
    var qi = ytQueueIdOk_();
    if (!qi.ok) {
      problems.push('شناسهٔ «' + (CFG.YT_RENDER_FILE || '_YT-RENDER.json') +
                    '» عوض شده است: اکشن دنبالِ ' + qi.want + ' می‌گردد ولی فایل ' +
                    'حالا ' + qi.got + ' است. تا وقتی YT_QUEUE_ID و ' +
                    'tools/render.js به‌روز نشوند، هیچ ویدئویی ساخته نمی‌شود.');
    }
  } catch (eQi) {}
  if (st.unlisted) {
    /* علتِ واقعی، به نام — نه یک حدس (۸.۳۵). تا ۸.۳۴ این سطر می‌گفت «یعنی در
       کپشنشان چیزی از جنسِ خصوصی پیدا شده»؛ ادعایی بی ورودی (۷٫۷۹). علتِ واقعیِ
       سه ویدئوی گیرکرده باگی در بازسنجی بود، و این جمله هفته‌ها همه را — ناظر
       را هم — دنبالِ نشتی فرستاد. */
    var sw0 = st.stuckWhy || [];
    problems.push('ویدئو در انتظارِ وارسی: ' + faDigitsOut_(String(st.unlisted)) +
                  ' مورد هنوز عمومی نشده‌اند' +
                  (sw0.length
                    ? ' — ' + sw0.map(function (x) {
                        return '«' + (x.title || x.key) + '»: ' + x.why; }).join(' · ')
                    : ' — علتشان پس از بازسنجیِ شبانه این‌جا می‌آید.'));
  }
  /* پادکست‌نشدن یک بار اتفاق است (سهمیه، شبکه)؛ چند شبِ پیاپی یعنی چیزی
     ساختاری اشکال دارد و باید دیده شود. */
  if (st.noPodcast && st.playlists && ytTodoDue_()) {
    problems.push('‏' + faDigitsOut_(String(st.noPodcast)) + ' پلی‌لیست هنوز پادکست نشده‌اند — ' +
      'تا پادکست نشوند نه در تبِ Podcasts می‌آیند نه در YouTube Music.');
  }

  /* ══ تحلیلی که به تصمیمی وصل نشده بود — نمونهٔ هفتم (۶٫۱۲) ══
   * `coverFails` از ۵٫۹۷ جمع می‌شد و **هیچ‌جا خوانده نمی‌شد**. یعنی اگر
   * کاورِ پلی‌لیست هر شب شکست می‌خورد، هیچ‌کس نمی‌فهمید. */
  try {
    var pf = ytPlCoverFails_();
    if (pf.length) {
      problems.push('کاورِ پلی‌لیست برای ' + faDigitsOut_(String(pf.length)) +
        ' مجموعه گذاشته نشد: ' + pf.slice(0, 3).join(' · ') +
        '. یوتیوب به‌جایش کاورِ ویدئوی اول را نشان می‌دهد.');
    }
    /* ══ شکستِ سقف‌خورده — با علتِ **خودِ یوتیوب**، نه حدس (۸.۵۵) ══
       تا ۸.۵۴ این سطر «کارِ شما» بود و صاحبِ برنامه را به تأییدِ هویت در
       youtube.com/features می‌فرستاد. علتِ واقعی کاورِ ۹۶۰×۵۴۰ بود و کارِ کد.
       حالا سطر فقط آنچه یوتیوب گفته را نقل می‌کند و مالکش موتور است؛ کارِ شما
       فقط وقتی می‌شود که کاورِ مربعِ درست نشسته و پادکست باز هم رد شود. */
    var mCap = ytPlMap_(), capped = 0, capWhy = '', ownerJob = false;
    for (var ck in mCap) if (Object.prototype.hasOwnProperty.call(mCap, ck)) {
      var rc = mCap[ck] || {};
      var cT = (Number(rc.coverTries) || 0) >= (CFG.YT_PL_TRY_MAX || 4);
      var pT = (Number(rc.podTries) || 0) >= (CFG.YT_PL_TRY_MAX || 4);
      if (!cT && !pT) continue;
      capped++;
      if (!capWhy) capWhy = cT ? 'کاور: ' + String(rc.coverWhy || '') : 'پادکست: ' + String(rc.podWhy || '');
      if (pT && rc.cover) ownerJob = true;
    }
    if (capped) {
      problems.push((ownerJob ? HY_ : '') + 'کاور/پادکست‌شدنِ ' + faDigitsOut_(String(capped)) +
        ' پلی‌لیست پس از چند تلاش هنوز رد می‌شود — آخرین پاسخِ یوتیوب: «' +
        auditCut_(capWhy, 140) + '». ' +
        (ownerJob
          ? 'کاورِ مربع نشسته و یوتیوب باز هم پادکست را نمی‌پذیرد؛ این دیگر به حالِ کانال بند است. '
          : 'علت در موتور است، نه در کانال. ') +
        'موتور هفته‌ای یک بار دوباره امتحان می‌کند.');
    }
  } catch (ePf) {}

  if (st.failed) {
    problems.push('انتشار در یوتیوب برای ' + faDigitsOut_(String(st.failed)) +
                  ' قسمت پس از چند تلاش رها شد — تبِ «' +
                  (CFG.YT_TAB || 'انتشار در یوتیوب') + '» ستونِ «شرح» علتش را دارد.');
  }
  if (st.quota && st.quota.blocked) {
    notes.push('سهمیهٔ یوتیوب امروز پر شد (' + st.quota.blocked +
               ')؛ کارِ باقی‌مانده فردا ادامه می‌یابد.');
  }

  /* شناسنامهٔ کانال. کارهای دستی **هفته‌ای یک بار** یادآوری می‌شوند، نه هر
     روز: چیزی که فقط با دستِ آدم عوض می‌شود و امروز عوض نشده، فردا هم عوض
     نمی‌شود — و هشداری که هر روز برای یک چیزِ ثابت فیره کند، همان هشداری
     است که آدم یاد می‌گیرد نبیند. */
  if (st.channel) {
    notes.push(st.channel.line);
    if (st.channel.todo && st.channel.todo.length && ytTodoDue_()) {
      problems.push(HY_ + 'در شناسنامهٔ کانالِ یوتیوب ' +
                    faDigitsOut_(String(st.channel.todo.length)) +
                    ' جای خالی هست که فقط از studio.youtube.com پر می‌شود: ' +
                    st.channel.todo.join('، ') + '. موتور از راهِ API به این‌ها ' +
                    'دسترسی ندارد؛ بقیهٔ شناسنامه خودکار نگه داشته می‌شود.');
      try { props_().setProperty('YT_TODO_AT', nowStr_()); } catch (eT) {}
    }
  }
  return st;
}

/* ─────────────── ۱۳‑ب) بازخورد: آنچه یوتیوب دربارهٔ ما می‌داند (۶٫۷) ───────────────
 *
 * خواستهٔ صریح: «با همین کلیدِ یوتیوب بازخوردها و ویوهای ویدیوها و کامنت‌ها
 * … گرفته بشه و در گزارش‌ها بیاد و ثبت بشه و مدل‌ها به این بازخوردها نگاه
 * کنن و الگو بگیرن.»
 *
 * ══ و این بخش عمداً دو نیمه دارد ══
 * نیمهٔ اول **ثبت** است: چند بار دیده شد، چند پسند، چه کامنتی آمد. نیمهٔ دوم
 * **اثر** است: همان عددها به پرامپتِ عنوان و کپشنِ قسمتِ بعدی برمی‌گردند.
 *
 * نیمهٔ دوم مهم‌تر است و همان چیزی است که این ریپو پنج بار در آن لغزیده:
 * تحلیلی نوشته شد و هرگز به تصمیمی وصل نشد. `musicProbe_` سکوت را می‌سنجید
 * و هیچ‌کس بر مبنایش چیزی رد نمی‌کرد؛ `auditSnap_` انتساب را می‌خواند و
 * داوری‌اش به جایی نمی‌رسید. پس این‌جا از روزِ اول، `ytLearn_` **درونِ همان
 * پرامپتی** می‌نشیند که عنوان می‌سازد. اگر روزی آن یک خط برداشته شود، این
 * بخش به یک جدولِ تماشایی تبدیل می‌شود و بس.
 *
 * ══ چرا هزینه‌اش ناچیز است ══
 * `videos.list` یک واحد برای هر پنجاه ویدئو می‌گیرد و `commentThreads.list`
 * یک واحد برای هر ویدئو. `search.list` (صد واحد) هیچ‌جا لازم نیست: فهرستِ
 * ویدئوهای ما در تبِ انتشار است و یک خواندنِ شیت کافی است.
 */

/** آیا نوبتِ یک دورِ آمار رسیده؟ */
function ytStatsDue_() {
  var everyH = Math.max(1, Number(CFG.YT_STATS_EVERY_H) || 20);
  var at = '';
  try { at = String(props_().getProperty(PK.YT_STATS) || ''); } catch (e) {}
  if (!at) return true;
  var t = parseWhen_(at);
  if (isNaN(t)) return true;
  return (new Date().getTime() - t) / 3600000 >= everyH;
}

/** آمارِ چند ویدئو، پنجاه‌تا پنجاه‌تا. */
function ytStatsFetch_(ids) {
  var out = Object.create(null);
  for (var i = 0; i < ids.length; i += 50) {
    var batch = ids.slice(i, i + 50);
    if (!ytQuotaTake_(YT_COST.videosList, false)) break;
    var r = ytHttp_('https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=' +
                    encodeURIComponent(batch.join(',')));
    if (r.code !== 200 || !r.json || !r.json.items) continue;
    for (var j = 0; j < r.json.items.length; j++) {
      var it = r.json.items[j], st = it.statistics || {}, sn = it.snippet || {};
      out[String(it.id)] = {
        views: Number(st.viewCount || 0), likes: Number(st.likeCount || 0),
        comments: Number(st.commentCount || 0),
        title: String(sn.title || ''), at: String(sn.publishedAt || '')
      };
    }
  }
  return out;
}

/** کامنت‌های تازهٔ یک ویدئو — تازه‌ترین اول. */
function ytCommentsFetch_(videoId, max) {
  var out = [];
  if (!ytQuotaTake_(YT_COST.videosList, false)) return out;
  var n = Math.max(1, Math.min(50, Number(max) || 8));
  var r = ytHttp_('https://www.googleapis.com/youtube/v3/commentThreads' +
                  '?part=snippet&order=time&maxResults=' + n +
                  '&videoId=' + encodeURIComponent(String(videoId)));
  /* کامنت بسته باشد یا ویدئو کامنت نداشته باشد، ۴۰۳/۴۰۴ می‌دهد — که خطا
     نیست، یک واقعیت است. خطا کردنش یعنی هر شب یک هشدارِ بی‌معنا. */
  if (r.code !== 200 || !r.json || !r.json.items) return out;
  for (var i = 0; i < r.json.items.length; i++) {
    var top = (((r.json.items[i].snippet || {}).topLevelComment || {}).snippet) || {};
    out.push({ id: String(r.json.items[i].id || ''),
               author: String(top.authorDisplayName || ''),
               text: String(top.textOriginal || top.textDisplay || '').slice(0, 500),
               likes: Number(top.likeCount || 0),
               at: String(top.publishedAt || '') });
  }
  return out;
}

var YTS_HEADERS = ['تاریخ', 'برنامه', 'قسمت', 'مجموعه', 'شناسهٔ ویدئو', 'عنوان',
                   'نمایش', 'پسند', 'کامنت', 'نمایشِ تازه', 'روز از انتشار',
                   'نمایش در روز', 'لینک'];
var YTC_COMMENT_HEADERS = ['تاریخ', 'شناسهٔ ویدئو', 'قسمت', 'نویسنده', 'متن',
                           'پسند', 'زمانِ کامنت', 'لینک'];

/** حافظهٔ دورِ قبل — برای اینکه «نمایشِ تازه» معنا داشته باشد. */
function ytStatsPrev_(hub) {
  var map = Object.create(null);
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.YTS_TAB || 'بازخوردِ یوتیوب');
    if (!sh || sh.getLastRow() < 2) return map;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, YTS_HEADERS.length).getValues();
    // آخرین ردیفِ هر ویدئو برنده است؛ ترتیبِ افزودن از بالا به پایین است
    for (var i = 0; i < v.length; i++) {
      var id = String(v[i][4] || '');
      if (id) map[id] = { views: Number(v[i][6] || 0), at: String(v[i][0] || '') };
    }
  } catch (e) {}
  return map;
}

/** شناسه‌های کامنتی که قبلاً ثبت شده‌اند — تا هر شب تکرار نشوند. */
function ytCommentSeen_(hub) {
  var seen = Object.create(null);
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.YTC_TAB2 || 'کامنت‌های یوتیوب');
    if (!sh || sh.getLastRow() < 2) return seen;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, YTC_COMMENT_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      // شناسهٔ کامنت در لینک است؛ کلید را از ویدئو+زمان+نویسنده می‌سازیم تا
      // به شکلِ لینک وابسته نباشد
      seen[String(v[i][1] || '') + '|' + String(v[i][6] || '') + '|' +
           String(v[i][3] || '')] = 1;
    }
  } catch (e) {}
  return seen;
}

/**
 * یک دورِ کاملِ بازخورد.
 *
 * ترتیبش عمدی است: اول آمار (ارزان، یک واحد برای پنجاه ویدئو و همیشه
 * جواب می‌دهد)، بعد کامنت‌ها (یک واحد برای هر ویدئو). اگر بودجه یا سهمیه
 * وسطِ کار تمام شود، آمار ثبت شده و فقط کامنت‌ها عقب می‌افتند — نه برعکس.
 */
function ytStatsRun_(budgetMs) {
  var out = { videos: 0, comments: 0, newViews: 0, why: '' };
  if (CFG.YT_STATS === false) { out.why = 'خاموش'; return out; }
  if (!ytOn_()) { out.why = ytOffWhy_(); return out; }
  var t0 = new Date().getTime();
  var budget = Math.max(15000, Number(budgetMs) || 60000);

  var hub = getHub_();
  var pub = ytPublished_(hub);
  var rows = [];
  for (var k in pub) {
    if (!Object.prototype.hasOwnProperty.call(pub, k)) continue;
    if (!pub[k].videoId) continue;
    rows.push({ key: k, show: k.split(':')[0], ep: k.split(':')[1],
                id: pub[k].videoId, url: pub[k].url, series: pub[k].series || '' });
  }
  if (!rows.length) { out.why = 'هنوز ویدئویی منتشر نشده'; return out; }

  var cap = Math.max(1, Number(CFG.YT_STATS_MAX) || 40);
  if (rows.length > cap) rows = rows.slice(-cap);      // تازه‌ترها مهم‌ترند

  var ids = rows.map(function (r) { return r.id; });
  var stats = ytStatsFetch_(ids);
  var prev = ytStatsPrev_(hub);
  var now = new Date().getTime();

  var block = [];
  for (var i = 0; i < rows.length; i++) {
    var s = stats[rows[i].id];
    if (!s) continue;
    var days = 0;
    var pt = Date.parse(s.at);
    if (!isNaN(pt)) days = Math.max(1, Math.round((now - pt) / 86400000));
    var was = prev[rows[i].id] ? prev[rows[i].id].views : 0;
    var delta = Math.max(0, s.views - was);
    out.newViews += delta;
    block.push([nowStr_(), rows[i].show, rows[i].ep, rows[i].series, rows[i].id,
                s.title, s.views, s.likes, s.comments, delta, days,
                days ? Math.round((s.views / days) * 10) / 10 : s.views,
                rows[i].url]);
    out.videos++;
  }
  if (block.length) {
    try {
      appendBlock_(ensureTab_(hub, CFG.YTS_TAB || 'بازخوردِ یوتیوب', YTS_HEADERS),
                   block, YTS_HEADERS.length);
    }
    catch (eW) { out.why = 'ثبتِ آمار نشد: ' + String(eW.message).slice(0, 60); }
  }

  /* ── کامنت‌ها ── */
  var seen = ytCommentSeen_(hub), cBlock = [];
  for (var c = 0; c < rows.length; c++) {
    if (new Date().getTime() - t0 > budget) break;
    var st2 = stats[rows[c].id];
    if (!st2 || !st2.comments) continue;              // ویدئوی بی‌کامنت، فراخوان لازم ندارد
    var list = ytCommentsFetch_(rows[c].id, Number(CFG.YT_COMMENTS_MAX) || 8);
    for (var m = 0; m < list.length; m++) {
      var key = rows[c].id + '|' + list[m].at + '|' + list[m].author;
      if (seen[key]) continue;
      seen[key] = 1;
      cBlock.push([nowStr_(), rows[c].id, rows[c].ep, list[m].author, list[m].text,
                   list[m].likes, list[m].at,
                   'https://www.youtube.com/watch?v=' + rows[c].id +
                   '&lc=' + encodeURIComponent(list[m].id)]);
      out.comments++;
    }
  }
  if (cBlock.length) {
    try {
      appendBlock_(ensureTab_(hub, CFG.YTC_TAB2 || 'کامنت‌های یوتیوب', YTC_COMMENT_HEADERS),
                   cBlock, YTC_COMMENT_HEADERS.length);
    } catch (eC2) { out.why += (out.why ? ' · ' : '') + 'ثبتِ کامنت نشد'; }
  }

  try { props_().setProperty(PK.YT_STATS, nowStr_()); } catch (eP) {}
  return out;
}

/**
 * **اثر** — همان نیمه‌ای که اگر نباشد، بقیه فقط یک جدول است.
 *
 * از تبِ بازخورد، پرکارترین و کم‌کارترین عنوان‌ها را با «نمایش در روز»
 * می‌گیرد و به‌صورتِ چند خطِ فشرده برمی‌گرداند تا داخلِ پرامپتِ عنوان و کپشن
 * بنشیند. مقایسه با «نمایش در روز» است نه با نمایشِ خام، وگرنه قسمتِ قدیمی
 * همیشه برنده است و مدل یاد می‌گیرد که «قدیمی بودن» خوب است.
 *
 * زیرِ `YT_LEARN_MIN` ویدئو هیچ‌چیز برنمی‌گرداند: با سه نمونه، «الگو» فقط
 * نویز است و مدل را به سمتِ تصادف می‌بَرد.
 */
function ytLearn_(hub) {
  var out = { n: 0, text: '' };
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.YTS_TAB || 'بازخوردِ یوتیوب');
    if (!sh || sh.getLastRow() < 2) return out;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, YTS_HEADERS.length).getValues();
    var last = Object.create(null);
    for (var i = 0; i < v.length; i++) {
      var id = String(v[i][4] || '');
      if (!id) continue;
      last[id] = { title: String(v[i][5] || ''), views: Number(v[i][6] || 0),
                   likes: Number(v[i][7] || 0), perDay: Number(v[i][11] || 0) };
    }
    var arr = [];
    for (var k in last) {
      if (!Object.prototype.hasOwnProperty.call(last, k)) continue;
      if (!last[k].title) continue;
      arr.push(last[k]);
    }
    var min = Math.max(3, Number(CFG.YT_LEARN_MIN) || 6);
    if (arr.length < min) return out;
    arr.sort(function (a, b) { return b.perDay - a.perDay; });
    var top = arr.slice(0, 3), bot = arr.slice(-3);
    var L = ['از بازخوردِ واقعیِ کانال (نمایش در روز، نه نمایشِ خام):'];
    L.push('— بیشترین دیده‌شدن:');
    for (var t = 0; t < top.length; t++) {
      L.push('   • «' + top[t].title + '» — ' + top[t].perDay + ' نمایش در روز');
    }
    L.push('— کمترین دیده‌شدن:');
    for (var b = 0; b < bot.length; b++) {
      L.push('   • «' + bot[b].title + '» — ' + bot[b].perDay + ' نمایش در روز');
    }
    L.push('از الگوی گروهِ اول استفاده کن و از گروهِ دوم فاصله بگیر — ولی هرگز ' +
           'عنوانی نساز که محتوای این قسمت را بد توصیف کند. عنوانِ گمراه‌کننده ' +
           'یک بار کلیک می‌گیرد و برای همیشه اعتماد را می‌بَرد.');
    out.n = arr.length;
    out.text = L.join('\n');
  } catch (e) {}
  return out;
}

/** خلاصهٔ بازخورد برای `_STATUS.json` و ایمیلِ روزانه. */
function ytStatsStatus_() {
  var out = { videos: 0, views: 0, likes: 0, comments: 0, newComments7d: 0,
              best: '', line: '' };
  try {
    var sh = getHub_().getSheetByName(CFG.YTS_TAB || 'بازخوردِ یوتیوب');
    if (!sh || sh.getLastRow() < 2) { out.line = 'بازخوردِ یوتیوب: هنوز آماری نیست.'; return out; }
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, YTS_HEADERS.length).getValues();
    var last = Object.create(null);
    for (var i = 0; i < v.length; i++) {
      var id = String(v[i][4] || '');
      if (id) last[id] = v[i];
    }
    var bestPd = -1;
    for (var k in last) {
      if (!Object.prototype.hasOwnProperty.call(last, k)) continue;
      out.videos++;
      out.views += Number(last[k][6] || 0);
      out.likes += Number(last[k][7] || 0);
      out.comments += Number(last[k][8] || 0);
      var pd = Number(last[k][11] || 0);
      if (pd > bestPd) { bestPd = pd; out.best = String(last[k][5] || ''); }
    }
    var cs = getHub_().getSheetByName(CFG.YTC_TAB2 || 'کامنت‌های یوتیوب');
    if (cs && cs.getLastRow() > 1) {
      var cv = cs.getRange(2, 1, cs.getLastRow() - 1, 1).getValues();
      var now = new Date().getTime();
      for (var c = 0; c < cv.length; c++) {
        var t = parseWhen_(String(cv[c][0] || ''));
        if (!isNaN(t) && (now - t) / 86400000 <= 7) out.newComments7d++;
      }
    }
    out.line = 'بازخوردِ یوتیوب: ' + faDigitsOut_(String(out.videos)) + ' ویدئو · ' +
               faDigitsOut_(String(out.views)) + ' نمایش · ' +
               faDigitsOut_(String(out.likes)) + ' پسند · ' +
               faDigitsOut_(String(out.comments)) + ' کامنت' +
               (out.newComments7d ? ' (' + faDigitsOut_(String(out.newComments7d)) +
                                    ' کامنتِ تازه در هفت روز)' : '') +
               (out.best ? ' · پرمخاطب‌ترین: «' + out.best + '»' : '');
  } catch (e) { out.line = 'بازخوردِ یوتیوب خوانده نشد: ' + e.message; }
  return out;
}

/* ─────────── ۱۳‑پ) خلاصهٔ لینک‌ها — ایمیل و تلگرام (۶٫۱۹) ───────────
 *
 * خواسته: «لینکِ ویدئوها و پلی‌لیست‌ها مرتب و دقیق با اسم‌گذاری فرستاده شود
 * و هشتگ‌گذاری دقیق باشد، تا هم بشود فهمید چه کارهایی شده و هم دسترسی
 * داشت — با رعایتِ تفکیک.»
 *
 * ══ دو چیز که شکلِ این بلوک را تعیین کرده‌اند ══
 *
 * ۱) **تفکیک، پیش از فهرست.** یک فهرستِ درهمِ بیست لینک، همان‌قدر
 *    بی‌مصرف است که هیچ لینکی. پس دو سطح: اول برنامه («درس‌نامه» /
 *    «از همه جا از همه رنگ»)، و داخلِ درس‌نامه، مجموعه. پلی‌لیست‌ها جدا،
 *    چون دسترسیِ همیشگی‌اند نه خبرِ امروز.
 *
 * ۲) **هشتگ از خودِ همان ویدئو، نه از یک فهرستِ ثابت.** برچسب‌های هر قسمت
 *    را مدل موقعِ ساختِ کپشن نوشته و در ستونِ «برچسب‌ها»ی همین تب نشسته‌اند.
 *    ساختنِ دوبارهٔ آن‌ها یعنی دو نسخهٔ متفاوت از یک چیز — و همان اختلاف
 *    که این ریپو بارها از آن ضربه خورده. فقط برچسبِ برنامه اضافه می‌شود،
 *    چون در تلگرام باید بشود دو برنامه را از هم جدا جست‌وجو کرد.
 */

/** هشتگِ سالم از یک عبارتِ فارسی/انگلیسی. */
function ytHashOf_(s) {
  var t = String(s || '').trim().replace(/^#/, '');
  if (!t) return '';
  t = t.replace(/[\s‌]+/g, '_').replace(/[^0-9A-Za-z؀-ۿ_]/g, '');
  if (!t || /^_+$/.test(t)) return '';
  return '#' + t.slice(0, 40);
}

/**
 * ویدئوهای منتشرشده در N ساعتِ گذشته + پلی‌لیست‌ها.
 * فقط یک خواندنِ شیت — نه یک فراخوانِ یوتیوب. آنچه منتشر کرده‌ایم در تب
 * است و سهمیه برای کارِ فردا لازم است.
 */
function ytDigest_(hours) {
  var out = { shows: [], playlists: [], n: 0, since: '', undated: 0 };
  var back = Math.max(1, Number(hours) || 26);
  var cut = new Date().getTime() - back * 3600000;
  out.since = Utilities.formatDate(new Date(cut), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');

  try {
    var sh = getHub_().getSheetByName(CFG.YT_TAB || 'انتشار در یوتیوب');
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(2, 1, sh.getLastRow() - 1, YT_HEADERS.length).getValues();
      var byShow = Object.create(null), order = [];
      for (var i = 0; i < v.length; i++) {
        var vid = String(v[i][YU.VID - 1] || '');
        if (!vid) continue;
        var w = ytWhen_(v[i][YU.AT - 1]);
        if (w.undated) { out.undated++; continue; }
        if (isNaN(w.ms) || w.ms < cut) continue;
        var show = ytShowKey_(v[i][YU.SHOW - 1]);
        var nm = (show === ENRICH_SHOW_SPECIAL) ? (CFG.SPECIAL_SHOW_NAME || show)
                                                : (CFG.SHOW_NAME || show);
        if (!byShow[show]) { byShow[show] = { show: show, name: nm, items: [] }; order.push(show); }
        byShow[show].items.push({
          ep: String(v[i][YU.EP - 1] || ''),
          series: String(v[i][YU.SERIES - 1] || ''),
          title: String(v[i][YU.TITLE - 1] || ''),
          url: String(v[i][YU.URL - 1] || ''),
          privacy: String(v[i][YU.PRIV - 1] || ''),
          cast: String(v[i][YU.CAST - 1] || ''),
          dur: ytDurText_(v[i][YU.DUR - 1]),
          tags: String(v[i][YU.TAGS - 1] || '')
        });
        out.n++;
      }
      for (var k = 0; k < order.length; k++) {
        var g = byShow[order[k]];
        /* ترتیب از شمارهٔ قسمت، نه از ترتیبِ ثبت: آپلود می‌تواند به‌هم
           بخورد و فهرستی که با ترتیبِ تصادفی بیاید، خوانده نمی‌شود. */
        g.items.sort(function (a, b) {
          var s1 = String(a.series || ''), s2 = String(b.series || '');
          if (s1 !== s2) return s1 < s2 ? -1 : 1;
          return (Number(a.ep) || 0) - (Number(b.ep) || 0);
        });
        out.shows.push(g);
      }
    }
  } catch (e) { logLine_('خلاصهٔ لینک‌های یوتیوب ساخته نشد: ' + e.message); }

  try {
    var pm = ytPlMap_();
    for (var pk in pm) {
      if (!Object.prototype.hasOwnProperty.call(pm, pk)) continue;
      var r = pm[pk] || {};
      if (!r.id) continue;
      out.playlists.push({ title: String(r.title || pk), url: ytPlUrl_(r.id),
                           podcast: !!r.podcast, cover: !!r.cover });
    }
    out.playlists.sort(function (a, b) { return a.title < b.title ? -1 : 1; });
  } catch (e2) {}
  return out;
}

/** هشتگ‌های یک قسمت: برچسب‌های خودش + نامِ برنامه، بی تکرار. */
function ytDigestTags_(showName, item) {
  var out = [], seen = Object.create(null);
  var push = function (x) {
    var h = ytHashOf_(x);
    if (!h || seen[h]) return;
    seen[h] = 1; out.push(h);
  };
  push(showName);
  if (item && item.series) push(item.series);
  var raw = String((item && item.tags) || '').split(/[،,]/);
  for (var i = 0; i < raw.length && out.length < 8; i++) push(raw[i]);
  return out;
}

/** بلوکِ HTML برای ایمیلِ روزانه. */
function ytDigestHtml_(d) {
  if (!d || (!d.n && !d.playlists.length)) return '';
  var h = ['<h3>منتشرشده در یوتیوب</h3>'];
  if (!d.n) h.push('<p style="color:#666">در این بازه ویدئوی تازه‌ای منتشر نشد.</p>');
  /* ردیفی که تاریخش خوانده نشد، نه چاپ می‌شود نه در سکوت می‌افتد. */
  if (d.undated) {
    h.push('<p style="color:#a33">' + faDigitsOut_(String(d.undated)) +
           ' ردیف در تبِ انتشار تاریخِ کامل ندارد (سلولش «ساعت» ذخیره شده) و ' +
           'در این کارنامه نیامده است.</p>');
  }
  for (var s = 0; s < d.shows.length; s++) {
    var g = d.shows[s];
    h.push('<p style="margin:8px 0 2px"><b>' + esc_(g.name) + '</b> — ' +
           faDigitsOut_(String(g.items.length)) + ' ویدئو</p><ul style="margin:0">');
    for (var i = 0; i < g.items.length; i++) {
      var it = g.items[i];
      h.push('<li><a href="' + esc_(it.url) + '">' +
             (it.series ? esc_(it.series) + ' · ' : '') +
             'قسمت ' + esc_(faDigitsOut_(String(it.ep))) + ' — ' + esc_(it.title) + '</a>' +
             (it.dur ? ' <span style="color:#666">(' + esc_(it.dur) + ')</span>' : '') +
             (it.cast ? '<br><span style="color:#666;font-size:12px">گویندگان: ' +
                        esc_(it.cast) + '</span>' : '') +
             '<br><span style="color:#888;font-size:12px">' +
             esc_(ytDigestTags_(g.name, it).join(' ')) + '</span></li>');
    }
    h.push('</ul>');
  }
  if (d.playlists.length) {
    h.push('<p style="margin:8px 0 2px"><b>پلی‌لیست‌ها و پادکست‌ها</b></p><ul style="margin:0">');
    for (var p = 0; p < d.playlists.length; p++) {
      var pl = d.playlists[p];
      h.push('<li><a href="' + esc_(pl.url) + '">' + esc_(pl.title) + '</a>' +
             ' <span style="color:#666;font-size:12px">' +
             (pl.podcast ? 'پادکست ✓' : 'هنوز پادکست نشده') + ' · ' +
             (pl.cover ? 'کاور ✓' : 'بی‌کاور') + '</span></li>');
    }
    h.push('</ul>');
  }
  return h.join('');
}

/** همان خلاصه، برای تلگرام. */
function ytDigestTg_(d) {
  if (!d || (!d.n && !d.playlists.length)) return '';
  var L = ['📺 <b>یوتیوب — کارنامهٔ امروز</b>'];
  if (d.undated) {
    L.push('⚠️ ' + faDigitsOut_(String(d.undated)) +
           ' ردیف تاریخِ کامل ندارد و در این کارنامه نیامده.');
  }
  for (var s = 0; s < d.shows.length; s++) {
    var g = d.shows[s];
    L.push('');
    L.push('<b>' + tgEsc_(g.name) + '</b> — ' + faDigitsOut_(String(g.items.length)) + ' ویدئو');
    for (var i = 0; i < g.items.length; i++) {
      var it = g.items[i];
      L.push('• <a href="' + tgEsc_(it.url) + '">' +
             (it.series ? tgEsc_(it.series) + ' · ' : '') +
             'قسمت ' + tgEsc_(faDigitsOut_(String(it.ep))) + ' — ' + tgEsc_(it.title) + '</a>' +
             (it.dur ? '  ⏱ ' + tgEsc_(it.dur) : ''));
      if (it.cast) L.push('   🎙 ' + tgEsc_(it.cast));
      L.push('   ' + tgEsc_(ytDigestTags_(g.name, it).join(' ')));
    }
  }
  if (d.playlists.length) {
    L.push('');
    L.push('<b>پلی‌لیست‌ها و پادکست‌ها</b>');
    for (var p = 0; p < d.playlists.length; p++) {
      var pl = d.playlists[p];
      L.push('• <a href="' + tgEsc_(pl.url) + '">' + tgEsc_(pl.title) + '</a>' +
             (pl.podcast ? '  🎙' : '') + (pl.cover ? '  🖼' : ''));
    }
  }
  return L.join('\n');
}

/**
 * فرستادنِ خلاصه به تلگرام — یک بار در روز.
 *
 * روزی که هیچ ویدئویی منتشر نشده، **هیچ پیامی نمی‌رود**. پلی‌لیست‌ها
 * دسترسیِ همیشگی‌اند نه خبر؛ فرستادنِ هر روزشان همان پیامی است که آدم یاد
 * می‌گیرد نخواند.
 */
function ytDigestSend_() {
  var out = { sent: false, n: 0, why: '' };
  if (CFG.YT_DIGEST === false) { out.why = 'خاموش'; return out; }
  var at = '';
  try { at = String(props_().getProperty(PK.YT_DIGEST) || ''); } catch (e) {}
  if (at) {
    var t = parseWhen_(at);
    if (!isNaN(t) && (new Date().getTime() - t) / 3600000 < 20) {
      out.why = 'امروز فرستاده شده'; return out;
    }
  }
  var d = ytDigest_(Number(CFG.YT_DIGEST_HOURS) || 26);
  out.n = d.n;
  if (!d.n) { out.why = 'ویدئوی تازه‌ای نبود'; return out; }
  try {
    var txt = ytDigestTg_(d);
    if (txt && tgEnabled_()) { tgSend_(txt); out.sent = true; }
  } catch (e2) { out.why = String(e2.message).slice(0, 80); }
  try { props_().setProperty(PK.YT_DIGEST, nowStr_()); } catch (e3) {}
  return out;
}

/**
 * دکمهٔ دستیِ بازخورد — «همین حالا ببین چه خبر است».
 * کارِ شبانه خودش هر ~۲۰ ساعت این را می‌کند؛ این دکمه فقط نوبت را جلو
 * می‌اندازد و چیزی را که خودکار نیست، خودکار نمی‌کند.
 */
function runYouTubeStats() {
  var ui = ui_();
  if (!ytOn_()) {
    var w = ytOffWhy_();
    if (ui) ui.alert('بازخوردِ یوتیوب', w, ui.ButtonSet.OK); else console.log(w);
    return { ok: false, why: w };
  }
  var r = ytStatsRun_(180000);
  var st = ytStatsStatus_();
  var L = ['بازخوردِ یوتیوب:'];
  L.push('• ویدئوی خوانده‌شده: ' + faDigitsOut_(String(r.videos)));
  L.push('• نمایشِ تازه از دورِ قبل: ' + faDigitsOut_(String(r.newViews)));
  L.push('• کامنتِ تازه: ' + faDigitsOut_(String(r.comments)));
  if (r.why) L.push('• ' + r.why);
  L.push('');
  L.push(st.line);
  var learn = ytLearn_();
  L.push('');
  L.push(learn.text
    ? 'این الگو از حالا در نوشتنِ عنوانِ قسمت‌های تازه استفاده می‌شود.'
    : 'برای الگوگرفتن هنوز نمونه کم است (دستِ‌کم ' +
      faDigitsOut_(String(CFG.YT_LEARN_MIN || 6)) + ' ویدئو لازم است).');
  var m = L.join('\n');
  if (ui) ui.alert('بازخوردِ یوتیوب', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

/* ─────────────────── ۱۴) منو ─────────────────── */
function runYouTubePublish() {
  var ui = ui_();
  if (!ytOn_()) {
    var w = ytOffWhy_();
    if (ui) ui.alert('انتشار در یوتیوب', w, ui.ButtonSet.OK); else console.log(w);
    return { ok: false, why: w };
  }
  var b = { walked: 0, queued: 0, wrapped: false };
  try { b = ytBackfill_(Number(CFG.YT_BACKFILL_WALK) || 12); }
  catch (e) { logLine_('کاوشِ قسمت‌های گذشته برای یوتیوب نشد: ' + e.message); }
  var c = { got: 0, tried: 0, why: '' };
  try { c = ytRenderCollect_(Number(CFG.YT_COLLECT_MS) || 120000); } catch (eC) {}
  var r = ytRunDue_(Number(CFG.YT_MANUAL_MAX) || 6, 210000);
  var p = { made: 0, renamed: 0, linked: 0 };
  try { p = ytPlaylistSync_(45000); } catch (e2) {}

  var L = ['انتشار در یوتیوب:'];
  if (b.queued) L.push('• قسمتِ تازه‌ای که به صف رفت: ' + b.queued);
  if (c.got) L.push('• ویدئوی آماده که برداشته شد: ' + c.got);
  L.push('• منتشرشده در این اجرا: ' + r.done);
  if (r.waiting) L.push('• منتظرِ ساختِ ویدئو: ' + r.waiting);
  if (r.failed) L.push('• ناموفق: ' + r.failed);
  L.push('• مانده در صف: ' + r.left);
  if (p.made || p.renamed) L.push('• پلی‌لیست: ' + p.made + ' تازه، ' + p.renamed + ' نامش عوض شد');
  if (r.quota) { L.push(''); L.push('⚠️ سهمیهٔ امروزِ یوتیوب تمام شد؛ فردا ادامه می‌یابد.'); }
  if (r.notes.length) { L.push(''); for (var i = 0; i < r.notes.length && i < 8; i++) L.push('• ' + r.notes[i]); }
  if (r.waiting) {
    L.push('');
    L.push('یادآوری: موتور نمی‌تواند ویدئو بسازد (Apps Script نه ffmpeg دارد نه ' +
           'مهلتِ کافی). درخواست‌ها در «' + (CFG.YT_RENDER_FILE || '_YT-RENDER.json') +
           '» است و GitHub Actions هر ساعت آن‌ها را می‌سازد؛ ویدئوی آماده شبِ ' +
           'بعد — یا با همین دکمه — برداشته و منتشر می‌شود.');
  }
  var m = L.join('\n');
  if (ui) ui.alert('انتشار در یوتیوب', m, ui.ButtonSet.OK); else console.log(m);
  return { backfill: b, run: r, playlists: p };
}

/* ─────────────── ۱۵) اصلاح پس از انتشار — «اگر اشتباه زده باشه؟» ───────────────
 *
 * جوابِ کوتاه: بله، همه‌چیزش. عنوان، کپشن، برچسب و کاورِ یک ویدئوی
 * منتشرشده همگی قابلِ تعویض‌اند و ویدئو دوباره آپلود نمی‌شود — پس نه شمارِ
 * بازدید از دست می‌رود، نه لینک عوض می‌شود، نه سهمیهٔ آپلود خرج می‌شود.
 *
 * دو راه:
 *  • `_yt.json` را در پوشهٔ همان قسمت دستی ویرایش کنید و این را بزنید.
 *  • یا `redo` بدهید تا مدل از نو بنویسد.
 * در هر دو حالت `ytLeaks_` دوباره اجرا می‌شود: متنِ دست‌نویس هم از دروازه
 * رد می‌شود، چون دروازه سرِ در است نه سرِ یکی از راه‌ها.
 */
function ytRedoOne_(show, ep, opt) {
  opt = opt || {};
  /* ══ کلید، نه نامِ نمایشی (۸.۳۵) ══
     `ytPublished_` از ۶ سپتامبر کلیدها را با `ytShowKey_` یک‌دست می‌کند
     («special:59»)، ولی این تابع با **نامِ نمایشی** می‌گشت («درس‌نامه:59»).
     پس هیچ ویدئویی پیدا نمی‌شد و جوابِ همیشگی «این قسمت هنوز منتشر نشده»
     بود — هم برای دکمهٔ منو، هم برای بازسنجیِ شبانه. سه ویدئو هفته‌ها
     Unlisted ماندند و تنها شاهدشان سطرِ «۳ سنجیده شد — ۰ عمومی شد» بود که
     سالم به نظر می‌رسید. هر دو شکل این‌جا پذیرفته می‌شوند. */
  show = ytShowKey_(show);
  var out = { ok: false, why: '', changed: [] };
  var yt = ytSvc_();
  if (!yt) { out.why = ytOffWhy_(); return out; }
  var hub = getHub_();
  var pub = ytPublished_(hub);
  var showName = String(show) === ENRICH_SHOW_SPECIAL ? CFG.SPECIAL_SHOW_NAME : CFG.SHOW_NAME;
  var rec = pub[String(show) + ':' + String(ep)];
  if (!rec || !rec.videoId) { out.why = 'این قسمت هنوز منتشر نشده'; return out; }

  // پوشهٔ قسمت از صف نمی‌آید (صف خالی شده)، پس از روی نامِ پوشه پیدایش می‌کنیم
  var folder = ytFolderOf_(show, ep, rec.series);
  if (!folder) { out.why = 'پوشهٔ قسمت پیدا نشد'; return out; }
  var meta = ytEpisodeMeta_(folder);
  if (!meta || !meta.ep) { out.why = 'پروندهٔ قسمت نبود'; return out; }
  var epo = meta.ep, isSpecial = String(show) === ENRICH_SHOW_SPECIAL;
  var audSec = ytSecondsOf_(ytAudioParts_(folder).parts);
  var heads = [];
  for (var h = 0; h < (epo.sections || []).length; h++) heads.push(String(epo.sections[h].heading || ''));
  var ctx = { show: show, epRaw: ep, showName: showName,
              tagline: isSpecial ? CFG.SPECIAL_TAGLINE : CFG.SHOW_TAGLINE,
              seriesName: String(meta.seriesName || rec.series || ''),
              epNum: faDigitsOut_(String(ep)), title: String(epo.title || ''),
              lesson: (Number(meta.lesson) || 0) ? faDigitsOut_(String(meta.lesson)) : '',
              cat: String(meta.cat || meta.seriesCat || ''), duration: ytTime_(audSec),
              headings: heads, hook: String(epo.hook || ''), summary: String(epo.summary || ''),
              sources: (epo.__extSources || []), sections: epo.sections || [],
              totalSec: audSec };
  var plan = ytPlan_(folder, ctx, opt.remodel === true);
  if (!plan) { out.why = 'نقشهٔ انتشار ساخته نشد'; return out; }

  var leaks = ytLeaks_(plan.title + '\n' + plan.description + '\n' + (plan.tags || []).join(' '));
  if (leaks.length) {
    out.why = 'متن هنوز چیزی از جنسِ خصوصی دارد: ' +
              leaks.map(function (x) { return x.kind; }).join('، ');
    return out;
  }

  if (ytQuotaTake_(YT_COST.videosUpdate, false)) {
    try {
      yt.Videos.update({ id: rec.videoId, snippet: {
        title: plan.title, description: plan.description, tags: plan.tags,
        categoryId: isSpecial ? (CFG.YT_CATEGORY_SPECIAL || '27') : (CFG.YT_CATEGORY_VARIETY || '22'),
        defaultLanguage: CFG.YT_LANG || 'fa' } }, 'snippet');
      out.changed.push('عنوان و کپشن');
    } catch (e) { out.why = 'به‌روزرسانیِ متن نشد: ' + String(e.message).slice(0, 150); }
  }

  if (CFG.YT_THUMB !== false) {
    /* کاورِ نقاشی، اگر رانر ساخته؛ کارتِ اسلایدز فقط وقتی نیست (۸.۵۴). تا ۸.۵۳
       این‌جا همیشه کارت ساخته و نشانده می‌شد — و عمومی‌کردنِ درس‌های ۳۸ و ۳۹
       کاورِ نقاشیِ هر دو را پاک کرد. */
    var thKeyR = String(show) + ':' + String(ep);
    var th = ytThumbFor_(thKeyR, function () { return ytCoverCard_({ title: String(epo.title || ''),
                               coverTitle: plan.coverTitle, kicker: plan.coverKicker,
                               showName: showName, seriesName: ctx.seriesName,
                               /* بازسازی هم همان برچسبِ مسیرِ آپلود را می‌گیرد
                                  (۶٫۵۶) — دو مسیر با دو برچسب یعنی کاورِ
                                  بازسازی‌شده به شکلِ قدیم برمی‌گشت. */
                               epLabel: (Number(meta.lesson) || 0)
                                 ? 'درس ' + faDigitsOut_(String(meta.lesson))
                                 : 'قسمت ' + faDigitsOut_(String(ep)),
                               cat: String(meta.cat || ctx.seriesName || ''),
                               /* و سبک هم — وگرنه بازسازی کاورِ بی‌سبک
                                  می‌سازد و همان ناهم‌خوانیِ ۷.۹۹ برمی‌گردد
                                  از راهِ دوم («دوقلویی که یک‌بار درست شود،
                                  یک‌بار درست شده است» — ۵.۹۵). */
                               style: lvStyleAt_(hub, { seriesKey: meta.seriesKey },
                                                 meta, ctx.seriesName),
                               redo: opt.recover !== false }); });
    if (th && th.blob && ytQuotaTake_(YT_COST.thumbSet, false)) {
      try {
        yt.Thumbnails.set(rec.videoId, th.blob);
        out.changed.push(th.painted ? 'کاور (نقاشی)' : 'کاور');
        ytThumbPaintSet_(thKeyR, th.painted ? th.src : '');
      }
      catch (eT) { out.why = (out.why ? out.why + ' · ' : '') + 'کاور ننشست: ' + String(eT.message).slice(0, 80); }
    }
  }

  // اگر پیشتر به‌خاطرِ نشتی در unlisted مانده بود، حالا که پاک است عمومی شود
  /* … مگر سدِ حالتِ صحنه بگوید نه (۸.۳۱). این همان درِ دومِ ۷.۱۴ است که
     ویدئوهای گیرکرده را شبانه عمومی می‌کند؛ سدی که فقط سرِ آپلود باشد از
     همین راه دور زده می‌شد. */
  var rmeR = null;
  try { rmeR = (ytRenderMapCached_() || {})[String(show) + ':' + String(ep)] || null; } catch (eRr) {}
  var gateR = ytPublicGate_(String(show) + ':' + String(ep), rmeR);
  if (!gateR.ok && String(rec.privacy || '') !== (CFG.YT_PRIVACY_FINAL || 'public')) {
    out.why = (out.why ? out.why + ' · ' : '') + gateR.why;
  }
  /* و عمومی فقط وقتی متنِ تازه واقعاً نشست (۸.۳۵): ویدئویی که برای نشتی
     Unlisted مانده، هنوز متنِ **قدیمش** را دارد. اگر به‌روزرسانیِ متن (سهمیه
     یا خطای API) نشد و ما عمومی‌اش کنیم، همان نشتی عمومی می‌شود. */
  var textLanded = out.changed.indexOf('عنوان و کپشن') !== -1;
  if (gateR.ok && !textLanded && String(rec.privacy || '') !== (CFG.YT_PRIVACY_FINAL || 'public')) {
    out.why = (out.why ? out.why + ' · ' : '') + 'متنِ تازه ننشست؛ عمومی نشد تا متنِ قدیم عمومی نشود';
  }
  if (gateR.ok && textLanded && String(rec.privacy || '') !== (CFG.YT_PRIVACY_FINAL || 'public') &&
      ytQuotaTake_(YT_COST.videosUpdate, false)) {
    try {
      yt.Videos.update({ id: rec.videoId,
                         status: { privacyStatus: CFG.YT_PRIVACY_FINAL || 'public',
                                   selfDeclaredMadeForKids: false } }, 'status');
      out.changed.push('عمومی شد');
      if (rmeR && String(rmeR.mode || '') === 'scenes') ytScenesOkAdd_();
    } catch (eP) { out.why = (out.why ? out.why + ' · ' : '') + 'عمومی‌کردن نشد: ' + String(eP.message).slice(0, 120); }
  }

  ytLog_(hub, { show: showName, ep: ep, series: ctx.seriesName, title: plan.title,
                videoId: rec.videoId, url: rec.url,
                privacy: out.changed.indexOf('عمومی شد') !== -1
                           ? (CFG.YT_PRIVACY_FINAL || 'public') : rec.privacy,
                thumb: out.changed.indexOf('کاور (نقاشی)') !== -1 ? 'نشست (نقاشی)'
                     : (out.changed.indexOf('کاور') !== -1 ? 'نشست' : '—'),
                chapters: plan.chapters, tags: (plan.tags || []).length,
                descChars: String(plan.description || '').length,
                result: 'اصلاح شد', note: out.changed.join('، ') + (out.why ? ' | ' + out.why : '') });
  out.ok = out.changed.length > 0;
  return out;
}

/**
 * هر شب، ویدئوهایی که به‌خاطرِ نشتی در unlisted مانده‌اند دوباره سنجیده شوند.
 *
 * ══ ۷٫۱۴: دری که فقط از داخلِ شیت باز می‌شد ══
 * `runYouTubeRedo` — تنها راهِ صدا زدنِ `ytRedoOne_` — با `ui_()` شروع می‌شود
 * و بی رابطِ کاربری فوراً برمی‌گردد؛ یعنی از هیچ تریگرِ زمانی هرگز اجرا
 * نمی‌شود. نتیجه: قسمتی که نشتی‌اش هرچه بود از `_yt.json` پاک شد — چه با
 * ویرایشِ دستی، چه چون خودِ متن (کاور/برچسب) در بازسازیِ بعدی عوض شد —
 * تا ابد در unlisted می‌ماند، چون فقط فشردنِ دکمهٔ منو دوباره می‌سنجدش و آن
 * دکمه را کسی نمی‌زند. سه ویدئوی واقعی (قسمت‌های ۲۰ و ۲۳ و درسِ ۵) هفته‌ها
 * unlisted ماندند در حالی که `_yt.json`ِ هرسه‌شان امروز هیچ نشتی‌ای ندارد —
 * یعنی از هفته‌ها پیش آمادهٔ عمومی‌شدن بودند و هیچ‌کس صدایشان نزد.
 *
 * پس `ytRedoOne_` (که خودش هیچ وابستگی‌ای به UI ندارد) از این‌جا هم صدا زده
 * می‌شود، بی `remodel` — یعنی بی هیچ فراخوانِ مدل، فقط دوباره‌سنجیِ همان
 * `_yt.json`ی که هست. قدیمی‌ترین‌ها اول، و سقفِ کوچک تا سهمیهٔ آپلود/به‌روزرسانیِ
 * فردا خالی نماند.
 */
/** امروز درِ دومِ گیرکرده‌ها رفته؟ — فقط Properties (۸.۵۴). */
function ytStuckTickDue_() {
  try {
    return String(props_().getProperty(PK.YT_STUCK_TICK) || '') !==
           Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  }
  catch (e) { return false; }
}
function ytStuckTickMark_() {
  try { props_().setProperty(PK.YT_STUCK_TICK, Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd')); }
  catch (e) {}
}

function ytRedoStuckNightly_(budgetMs) {
  var out = { checked: 0, cleared: 0, stillLeak: 0 };
  if (!ytOn_()) return out;
  var t0 = new Date().getTime();
  var budget = Math.max(10000, Number(budgetMs) || 40000);
  var hub = getHub_();
  var pub = ytPublished_(hub);
  var want = CFG.YT_PRIVACY_FINAL || 'public';
  var stuck = [];
  for (var k in pub) {
    var r = pub[k];
    if (!r.videoId || String(r.privacy || '') === want) continue;
    var parts = k.split(':');
    stuck.push({ show: parts[0], ep: parts.slice(1).join(':'), at: String(r.at || '') });
  }
  // قدیمی‌ترین اول — همان‌هایی که بیشترین وقت را در unlisted مانده‌اند
  /* … مگر کلیدی که در `docs/yt-approve.json` تأیید شده (۸.۴۶). سقفِ شبانه سه
     است و سه ویدئوی قدیمی‌تر به علتِ دیگری Unlisted مانده‌اند؛ «قدیمی‌ترین اول»
     یعنی ویدئوی تأییدشدهٔ تازه — درسِ ۳۸، که صاحبِ برنامه «فوق‌العاده» دید و
     خواست عمومی شود — **هرگز** نوبت نمی‌گرفت. تأییدِ صریح جلوتر از صفِ خودکار
     است (همان ترتیبِ ۷٫۵۹: آنچه خواسته شده پشتِ آنچه کسی نخواسته نمی‌مانَد). */
  var appr = ytApprovedSafe_();
  stuck.sort(function (a, b) {
    var pa = appr[a.show + ':' + a.ep] ? 0 : 1, pb = appr[b.show + ':' + b.ep] ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return a.at < b.at ? -1 : (a.at > b.at ? 1 : 0);
  });
  var max = Math.max(1, Number(CFG.YT_REDO_MAX_PER_NIGHT) || 3);
  /* علتِ هر کدام **به نام** نگه داشته می‌شود (۸.۳۵) — `ytStatus_` و خطِ روزانه
     از همین می‌خوانند. تا ۸.۳۴ تنها شاهد «N عمومی شد، M هنوز نشتی دارد» بود،
     و M با جست‌وجوی واژهٔ «نشتی» شمرده می‌شد که در پیامِ خودِ `ytRedoOne_`
     نیست؛ یعنی همیشه صفر، و علتِ واقعی («منتشر نشده»، که خودش باگ بود)
     هیچ‌جا دیده نمی‌شد. */
  var why = [];
  for (var i = 0; i < stuck.length && i < max; i++) {
    if (new Date().getTime() - t0 > budget) break;
    out.checked++;
    var w = { key: stuck[i].show + ':' + stuck[i].ep, title: String((pub[stuck[i].show + ':' + stuck[i].ep] || {}).title || ''),
              at: nowStr_(), why: '' };
    try {
      var res = ytRedoOne_(stuck[i].show, stuck[i].ep, {});
      if (res.ok && res.changed.indexOf('عمومی شد') !== -1) {
        out.cleared++;
        ytApprDoneAdd_(stuck[i].show + ':' + stuck[i].ep);
        w = null;
      }
      else {
        w.why = String(res.why || 'عمومی نشد، بی علتِ ثبت‌شده').slice(0, 220);
        if (/خصوصی/.test(w.why)) out.stillLeak++;
      }
    } catch (e) { w.why = 'خطا: ' + String(e.message).slice(0, 160); }
    if (w) why.push(w);
  }
  try { props_().setProperty(PK.YT_STUCK_WHY, JSON.stringify(why)); } catch (eS) {}
  out.why = why;
  if (out.checked) {
    logLine_('یوتیوب: ' + out.checked + ' ویدئوی در انتظارِ وارسی دوباره سنجیده شد — ' +
             out.cleared + ' عمومی شد' +
             (why.length ? '، ' + why.length + ' نه: ' + why.map(function (x) {
               return x.key + ' (' + x.why + ')'; }).join(' · ') : '') + '.');
  }
  return out;
}

/** پوشهٔ یک قسمت، وقتی صف دیگر نشانی‌اش را ندارد. */
function ytFolderOf_(show, ep, seriesName) {
  var want = String(ep);
  try {
    if (String(show) !== ENRICH_SHOW_SPECIAL) {
      var vfo = ytShowFolder_(CFG.VARIETY_FOLDER);
      if (!vfo) return null;
      var it = vfo.getFolders();
      while (it.hasNext()) { var f = it.next(); if (ytEpNumOf_(f.getName()) === want) return f; }
      return null;
    }
    var reg = readSeriesReg_(getHub_());
    for (var r = 0; r < reg.rows.length; r++) {
      var nm = String(reg.rows[r].vals[SC.NAME - 1] || '');
      if (seriesName && nm !== String(seriesName)) continue;
      var fid = String(reg.rows[r].vals[SC.FOLDER - 1] || '');
      if (!fid) continue;
      var sub = null;
      try { sub = DriveApp.getFolderById(fid).getFolders(); } catch (eS) { continue; }
      while (sub.hasNext()) { var g = sub.next(); if (ytEpNumOf_(g.getName()) === want) return g; }
    }
  } catch (e) {}
  return null;
}

/* ─────────────── ۱۶) کاورِ پلی‌لیست و شناسنامهٔ کانال ───────────────
 *
 * ══ چه چیزی از راهِ API ممکن است و چه چیزی نه ══
 * • کاورِ پلی‌لیست: **ممکن است** — `playlistImages`. سرویسِ پیشرفتهٔ Apps
 *   Script این منبعِ تازه را لزوماً ندارد، پس مستقیم با UrlFetchApp و
 *   همان توکنِ OAuth صدا زده می‌شود.
 * • بنرِ کانال: **ممکن است** — `channelBanners.insert` و بعد
 *   `channels.update`. باید ۱۶:۹ و دست‌کم ۲۰۴۸×۱۱۵۲ باشد.
 * • توضیح و کلیدواژهٔ کانال: **ممکن است** — `channels.update`.
 * • **عکسِ پروفایل (آواتار): ممکن نیست.** یوتیوب هیچ راهی در API برایش
 *   نگذاشته. این را باید صریح نوشت، وگرنه هر بار کسی دنبالش می‌گردد.
 */
function ytHttp_(url, method, payload, mime) {
  var opt = { method: method || 'get', muteHttpExceptions: true,
              headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
  if (payload) {
    opt.payload = payload;
    opt.contentType = mime || 'application/json; charset=utf-8';
  }
  var res = UrlFetchApp.fetch(url, opt);
  var code = res.getResponseCode();
  var txt = '';
  try { txt = res.getContentText(); } catch (e) {}
  var json = null;
  try { json = JSON.parse(txt); } catch (e2) {}
  return { code: code, text: txt, json: json };
}

/**
 * پلی‌لیست را «پادکست» می‌کند — تبِ Podcasts کانال از همین پر می‌شود.
 *
 * ══ چرا این کار شدنی است و پُست نه ══
 * تبِ Podcasts از راهِ API کنترل می‌شود: `status.podcastStatus = "enabled"`
 * روی خودِ پلی‌لیست. ولی تبِ Posts (پستِ انجمن) **هیچ منبعی در
 * YouTube Data API v3 ندارد** — نه خواندن، نه نوشتن. آن یکی تا امروز فقط
 * از استودیو یا اپِ موبایل انجام می‌شود، و باید همان‌جا به‌عنوان «کارِ شما»
 * ثبت شود نه اینکه هر شب به‌عنوان ایراد گزارش شود.
 *
 * ══ و چرا با REST، جدا از ساختِ پلی‌لیست ══
 * ساختِ پلی‌لیست روی مسیرِ بحرانیِ انتشار است. اگر `podcastStatus` را داخلِ
 * همان فراخوان بگذاریم و سرویسِ پیشرفتهٔ Apps Script این فیلد را نشناسد،
 * **ساختِ پلی‌لیست** می‌شکند و انتشار می‌ایستد — برای یک قابلیتِ جانبی.
 * پس جدا، بعد از ساخت، و شکستش فقط لاگ می‌شود.
 *
 * یک بار برای هر پلی‌لیست: نتیجه در همان نقشه‌ای می‌نشیند که کاور در آن است.
 */
function ytPlPodcast_(plId, title) {
  if (!plId) return 'شناسه ندارد';
  if (CFG.YT_PODCAST === false) return 'خاموش';
  if (!ytQuotaTake_(YT_COST.playlistsUpdate, false)) return 'سهمیه';
  var body = { id: String(plId),
               snippet: { title: ytScrub_(String(title || '')).slice(0, 150) },
               status: { privacyStatus: 'public', podcastStatus: 'enabled' } };
  var r = ytHttp_('https://www.googleapis.com/youtube/v3/playlists?part=snippet%2Cstatus',
                  'put', JSON.stringify(body));
  if (r.code === 200) return 'نشست';
  var why = '';
  try { why = String((((r.json || {}).error || {}).message) || ''); } catch (e) {}
  return 'نشد (' + r.code + ')' + (why ? ': ' + why.slice(0, 120) : '');
}

/**
 * کاور و پادکست‌کردنِ یک پلی‌لیست — **یک تعریف برای هر دو برنامه**.
 *
 * ══ شکافی که تا ۶٫۱۳ باز بود ══
 * `ytPlaylistSync_` فقط رجیستریِ مجموعه‌ها را می‌پیمود، یعنی فقط درس‌نامه.
 * پلی‌لیستِ «از همه جا از همه رنگ» در مسیرِ **آپلود** ساخته می‌شد
 * (`ytPlFor_`) و بعد هیچ‌وقت از این‌جا رد نمی‌شد: نه کاور می‌گرفت، نه پادکست
 * می‌شد، و هیچ‌جا ثبت نمی‌شد. از بیرون فقط یک پلی‌لیستِ بی‌کاور دیده می‌شد و
 * هیچ خطایی هم نبود.
 *
 * دو برنامه با دو چیدمانِ متفاوتِ داده (یکی رجیستری دارد، دیگری ندارد) به دو
 * حلقهٔ متفاوت رسیده بودند — و همان‌جا یکی از دو حلقه ناقص ماند. کارِ مشترک
 * حالا یک جاست.
 */
function ytPlDress_(plId, plTitle, name, kicker, cat, renamed, out, key) {
  /* علت روی خودِ رکوردِ پلی‌لیست می‌نشیند، حتی وقتی «سهمیه» است (۶٫۴۲).
     تا اینجا سهمیه از هر دو ثبت مستثنا بود — و چون کاور و پادکست ته صفِ
     سهمیه‌اند، همان محتمل‌ترین علت تنها علتی بود که هرگز نوشته نمی‌شد.
     «سهمیه» ایراد نیست (فردا خودش می‌آید) پس در `coverFails` نمی‌رود؛ ولی
     باید *دیده* شود، وگرنه عدد بی‌علت هفته‌ها تکرار می‌شود. */
  /* ══ شکستی که هر شب عیناً تکرار می‌شود، بامعناترین نوعِ «کارِ شما»ست (۶٫۵۴) ══
   * کاورِ پلی‌لیست دو روزِ پیاپی «نشد (500)» داد و پادکست‌کردن
   * «نشد (400): Precondition check failed» — هر شب، همان خطا، همان پلی‌لیست.
   * ۶٫۵۴ نوشت «این دو به حالِ خودِ کانال بندند (قابلیت‌های پیشرفته)» — و
   * **غلط بود** (۸.۵۵): کاوری که فرستاده می‌شد ۹۶۰×۵۴۰ بود و یوتیوب مربع
   * می‌خواهد، و پادکست بی تصویرِ پلی‌لیست ناممکن است. حدسی که به‌جای سنجش
   * نوشته شود، صاحبِ برنامه را سرِ کارِ بی‌اثر می‌فرستد. سقفِ تلاش و تکرارِ
   * هفتگی سرِ جایشان‌اند، چون شکستِ واقعیِ تکراری هنوز همان‌قدر بی‌فایده است. */
  var giveUp = function (rec, f) {
    var tries = Number(rec[f + 'Tries']) || 0;
    if (tries < (CFG.YT_PL_TRY_MAX || 4)) return false;
    var last = parseWhen_(String(rec[f + 'LastTry'] || ''));
    if (isNaN(last)) return false;
    return (new Date().getTime() - last) <
           (CFG.YT_PL_RETRY_DAYS || 7) * 86400000;
  };
  /* «سهمیه» و «در راه» تلاش نیستند: اولی فردا خودش می‌آید و دومی یعنی رانر هنوز
     کاورِ مربع را نکشیده — هیچ‌کدام چیزی دربارهٔ یوتیوب نمی‌گوید (۸.۵۵). */
  var notTry = function (why) {
    var w = String(why || '');
    return w.indexOf('سهمیه') !== -1 || w.indexOf('در راه') !== -1 ||
           w.indexOf('منتظرِ کاور') !== -1;
  };
  var bump = function (field, f, why) {
    try {
      var m = ytPlMap_(), rec = m[key] || {};
      rec[field] = String(why || '').slice(0, 120);
      if (!notTry(why)) {
        rec[f + 'Tries'] = (Number(rec[f + 'Tries']) || 0) + 1;
        rec[f + 'LastTry'] = nowStr_();
      }
      m[key] = rec; ytPlMapSave_(m);
    } catch (eM) {}
  };
  /* ══ تلاشی که با سازوکارِ خراب شمرده شد، تلاش نیست (۸.۳۲ ⇒ ۸.۵۵) ══
     چهار «نشد (500)» با کاورِ ۹۶۰×۵۴۰ ثبت شده بود و سقفِ تلاش پر بود — یعنی
     کاورِ درست هم تا هفتهٔ بعد فرستاده نمی‌شد. نسخهٔ سازوکار در رکورد است و
     عوض‌شدنش شمارش را از نو می‌کند. */
  var pmap = ytPlMap_(), prec = pmap[key] || {};
  var ver = Number(CFG.YT_PL_COVER_VER) || 2;
  if (Number(prec.coverVer) !== ver) {
    prec.coverTries = 0; prec.coverLastTry = ''; prec.podTries = 0; prec.podLastTry = '';
    prec.coverWhy = ''; prec.podWhy = ''; prec.coverVer = ver;
    pmap[key] = prec; ytPlMapSave_(pmap);
  }

  /* ── اول کاور: پادکست بی تصویرِ پلی‌لیست «Precondition check failed» است ── */
  var pcNow = null;
  try { pcNow = (ytRenderPlCoversCached_() || {})[key] || null; } catch (ePc) { pcNow = null; }
  var stale = !!(prec.cover && pcNow && pcNow.sig && prec.coverSig &&
                 String(pcNow.sig) !== String(prec.coverSig));
  if ((!prec.cover || renamed || stale) && !giveUp(prec, 'cover')) {
    var plSty = '';
    try {
      var regP = readSeriesReg_(getHub_());
      var recP = regP.byKey[String(key || '').replace(/^series:/, '')] ||
                 regP.byKey[String(key || '')] || null;
      if (recP) plSty = lvStyleOf_(recP.vals).key;
    } catch (ePs) {}
    var cv = ytPlaylistCover_(plId, name, kicker, cat, renamed || stale, kicker, plSty, key);
    if (cv === 'نشست') {
      out.covers++;
      prec = (ytPlMap_()[key] || prec);
      prec.cover = nowStr_(); prec.coverWhy = '';
      prec.coverTries = 0; prec.coverLastTry = '';
      var m2 = ytPlMap_(); m2[key] = prec; ytPlMapSave_(m2);
    } else if (cv) {
      bump('coverWhy', 'cover', cv);
      if (!notTry(cv)) out.coverFails.push(name + ': ' + cv);
    }
  }

  /* ── بعد پادکست، و فقط روی پلی‌لیستی که کاور دارد ── */
  prec = ytPlMap_()[key] || prec;
  if (!prec.podcast && CFG.YT_PODCAST !== false && !giveUp(prec, 'pod')) {
    if (!prec.cover) {
      bump('podWhy', 'pod', 'منتظرِ کاورِ مربع — یوتیوب پادکست را فقط روی پلی‌لیستِ تصویردار می‌پذیرد');
    } else {
      var pc = ytPlPodcast_(plId, plTitle || name);
      if (pc === 'نشست') {
        prec = ytPlMap_()[key] || prec;
        prec.podcast = nowStr_(); prec.podWhy = '';
        prec.podTries = 0; prec.podLastTry = '';
        var m3 = ytPlMap_(); m3[key] = prec; ytPlMapSave_(m3);
        out.podcasts = (out.podcasts || 0) + 1;
      } else {
        bump('podWhy', 'pod', pc);
        if (!notTry(pc)) logLine_('پادکست‌کردنِ پلی‌لیستِ «' + name + '» نشد: ' + pc);
      }
    }
  }
}

/** شکستِ کاورِ پلی‌لیست، تا سلامتِ فردا هم ببیندش (نه فقط لاگِ همین اجرا). */
function ytPlCoverFailSave_(list) {
  try {
    props_().setProperty(PK.YT_PLCF,
      JSON.stringify((list || []).slice(0, 6)));
  } catch (e) {}
}
function ytPlCoverFails_() {
  try {
    var a = JSON.parse(props_().getProperty(PK.YT_PLCF) || '[]');
    return Object.prototype.toString.call(a) === '[object Array]' ? a : [];
  } catch (e) { return []; }
}

/* ══ کاورِ پلی‌لیست مربع است، و اسلایدز مربع نمی‌سازد (۸.۵۵) ══
 *
 * سه پلی‌لیست هفته‌ها «کاور: نشد (500)» و «پادکست: نشد (400): Precondition check
 * failed» داشتند، و سطرِ سلامت علتش را «قابلیت‌های پیشرفتهٔ کانال باز نیست» گفت
 * و صاحبِ برنامه را به youtube.com/features فرستاد. **آن علت حدس بود، نه سنجش.**
 * سنجش، از خودِ فایلِ ذخیره‌شده: «کاور — مجموعه — درس‌نامه — مربع.png» سرآیندِ
 * IHDRش ۹۶۰×۵۴۰ می‌گوید. `presentations.create` اندازه را دور می‌ریزد (۸.۱۲)،
 * پس «مربع» یک مستطیلِ ۱۶:۹ بود؛ مستندِ یوتیوب برای `playlistImages` نسبتِ ۱:۱
 * می‌خواهد. و `podcastStatus` را مستندِ همان صفحه شرط کرده: «پلی‌لیست باید
 * playlist image داشته باشد». یعنی خطای دوم پیامدِ خطای اول بود — و موتور
 * پادکست را **پیش از** کاور می‌پرسید.
 *
 * پس: رانر (که کروم و قلمِ فارسی دارد و کاورِ هر درس را همین حالا می‌کشد) کاورِ
 * ۱۴۰۰×۱۴۰۰ می‌کشد؛ موتور درخواست را در `_YT-RENDER.json` (`plCovers`) می‌گذارد،
 * نشانی را از `docs/renders.json` برمی‌دارد، **اندازه را از بایت‌ها** می‌سنجد و فقط
 * مربعِ دست‌کم `YT_PL_COVER_MIN` را می‌فرستد. پادکست پس از کاور.
 */

/** امضای کوتاهِ یک رشته — برای «همان درخواست است یا عوض شده». */
function ytSig8_(s) {
  var hx = '';
  try {
    var dg = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s), Utilities.Charset.UTF_8);
    for (var b = 0; b < 6; b++) hx += ('0' + ((dg[b] + 256) % 256).toString(16)).slice(-2);
  } catch (e) { hx = 'L' + String(String(s).length); }
  return hx;
}

/** مشخصاتِ کاورِ مربعِ یک پلی‌لیست — همان سبکِ مجموعه، همان پالت (۷.۹۹). */
function ytPlSqSpec_(key, title, kicker, cat, showName, styleKey) {
  var csty = styleKey ? lvStyleResolve_(styleKey) : null;
  var pal = (csty && csty.pal) || ytPalette_(cat || title || showName);
  var spec = { key: String(key || ''), name: String(title || ''), kicker: String(kicker || ''),
               show: String(showName || ''), style: String(styleKey || ''),
               pal: { bg: String(pal.bg || ''), fg: String(pal.fg || ''), ac: String(pal.ac || '') },
               v: Number(CFG.YT_PL_COVER_VER) || 2 };
  spec.sig = ytSig8_(JSON.stringify([spec.name, spec.kicker, spec.show, spec.style, spec.pal, spec.v]));
  return spec;
}

function ytPlSqMap_() {
  try { return JSON.parse(props_().getProperty(PK.YT_PL_SQ) || '{}') || {}; }
  catch (e) { return {}; }
}

/** فهرستِ درخواست‌ها، به همان ترتیبِ کلید — آنچه در صف می‌نشیند. */
function ytPlSqReqs_(m) {
  m = m || ytPlSqMap_();
  return Object.keys(m).sort().map(function (k) {
    var x = m[k] || {};
    return { key: k, name: String(x.name || ''), kicker: String(x.kicker || ''),
             show: String(x.show || ''), pal: x.pal || {}, sig: String(x.sig || '') };
  });
}

/**
 * از رانر بخواه. صف فقط وقتی نوشته می‌شود که فهرست عوض شده باشد — نوشتنِ هر
 * دور یعنی یک بازنویسیِ درایو برای هیچ.
 */
function ytPlSqWant_(spec) {
  try {
    var m = ytPlSqMap_();
    var was = m[spec.key] || null;
    if (!was || was.sig !== spec.sig) {
      m[spec.key] = { name: spec.name, kicker: spec.kicker, show: spec.show,
                      pal: spec.pal, sig: spec.sig, at: nowStr_() };
      props_().setProperty(PK.YT_PL_SQ, JSON.stringify(m));
    }
    var d = ytRenderRead_();
    var want = ytPlSqReqs_(m);
    if (JSON.stringify(d.plCovers || []) !== JSON.stringify(want)) {
      d.plCovers = want;
      if (ytRenderSave_(d)) {
        try { ytQueueShare_(); } catch (eQs) {}
        try { ghRenderDue_('کاورِ مربعیِ پلی‌لیست'); } catch (eGk) {}
      }
    }
    return true;
  } catch (e) { return false; }
}

/* کاورهای مربعی که رانر ساخته — یک خواندن در هر اجرا، مثلِ نقشهٔ ویدئوها. */
var _ytPlSqMemo = null;
function ytRenderPlCoversCached_() {
  if (_ytPlSqMemo !== null) return _ytPlSqMemo;
  _ytPlSqMemo = {};
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.YT_RENDER_MAP || 'docs/renders.json'),
                { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() === 200) {
      var d = JSON.parse(res.getContentText());
      if (d && d.plCovers && typeof d.plCovers === 'object') _ytPlSqMemo = d.plCovers;
    }
  } catch (e) {}
  return _ytPlSqMemo;
}

/**
 * ابعادِ واقعیِ یک تصویر — PNG از IHDR، JPEG از نشانِ SOF. برمی‌گرداند
 * {w, h, mime} یا null. بایت‌ها، نه نام و نه Content-Type (همان قاعدهٔ `musicFetch_`).
 */
function ytImgSize_(blob) {
  var b;
  try { b = blob.getBytes(); } catch (e) { return null; }
  if (!b || b.length < 24) return null;
  var u = function (i) { return b[i] & 0xFF; };
  if (u(0) === 0x89 && u(1) === 0x50 && u(2) === 0x4E && u(3) === 0x47) {
    var p = ytPngSize_(blob);
    return p ? { w: p.w, h: p.h, mime: 'image/png' } : null;
  }
  if (u(0) !== 0xFF || u(1) !== 0xD8) return null;
  var i = 2;
  while (i + 9 < b.length) {
    if (u(i) !== 0xFF) { i++; continue; }
    var mk = u(i + 1);
    if (mk === 0xD8 || mk === 0x01 || (mk >= 0xD0 && mk <= 0xD7)) { i += 2; continue; }
    var len = (u(i + 2) << 8) | u(i + 3);
    if ((mk >= 0xC0 && mk <= 0xC3) || (mk >= 0xC5 && mk <= 0xC7) ||
        (mk >= 0xC9 && mk <= 0xCB) || (mk >= 0xCD && mk <= 0xCF)) {
      var h = (u(i + 5) << 8) | u(i + 6), w = (u(i + 7) << 8) | u(i + 8);
      return (w > 0 && h > 0) ? { w: w, h: h, mime: 'image/jpeg' } : null;
    }
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

/**
 * کاورِ مربعِ پلی‌لیست: از رانر، سنجیده، فرستاده.
 * برمی‌گرداند «نشست» · «در راه» (رانر هنوز نکشیده؛ نه شکست، نه تلاش) ·
 * «سهمیه» · یا «نشد …» با علتِ خودِ یوتیوب.
 */
function ytPlaylistCover_(plId, title, kicker, cat, redo, showName, styleKey, key) {
  if (!plId) return '';
  var spec = ytPlSqSpec_(key || ('pl:' + plId), title, kicker, cat,
                         showName || CFG.SPECIAL_SHOW_NAME || '', styleKey);
  ytPlSqWant_(spec);
  var pcs = ytRenderPlCoversCached_() || {};
  var pc = pcs[spec.key] || null;
  if (!pc || !pc.url || String(pc.req || '') !== spec.sig) return 'در راه';
  var res = null;
  try {
    res = UrlFetchApp.fetch(String(pc.url), { muteHttpExceptions: true, followRedirects: true });
  } catch (eF) { return 'نشد: کاور دانلود نشد — ' + String(eF.message).slice(0, 60); }
  if (res.getResponseCode() !== 200) return 'نشد: دانلودِ کاور (' + res.getResponseCode() + ')';
  var blob = null;
  try { blob = res.getBlob(); } catch (eB) { return 'نشد: بایت‌های کاور خوانده نشد'; }
  var sz = ytImgSize_(blob);
  if (!sz) return 'نشد: فایلِ کاور نه JPEG است نه PNG';
  var min = Number(CFG.YT_PL_COVER_MIN) || 1280;
  if (sz.w !== sz.h || sz.w < min) {
    return 'نشد: کاور ' + sz.w + '×' + sz.h + ' است — یوتیوب مربعِ دست‌کم ' +
           min + '×' + min + ' می‌خواهد';
  }
  if (!ytQuotaTake_(YT_COST.thumbSet, false)) return 'سهمیه';

  /* multipart دستی، چون شناسهٔ پلی‌لیست در snippet می‌رود نه در query — و
     چون `playlistImages` منبعِ تازه‌ای است که سرویسِ پیشرفتهٔ Apps Script
     لزوماً نداردش. بایت‌ها به‌هم چسبانده می‌شوند، نه رشته‌ها: هر تبدیلِ
     رشته‌ایِ داده‌های دودویی، تصویر را خراب می‌کند. */
  var boundary = '----ytpl' + String(plId).replace(/[^A-Za-z0-9]/g, '').slice(-10);
  var head = '--' + boundary + '\r\n' +
             'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
             JSON.stringify({ snippet: { playlistId: String(plId), type: 'hero',
                                         width: sz.w, height: sz.h } }) +
             '\r\n--' + boundary + '\r\n' +
             'Content-Type: ' + sz.mime + '\r\n\r\n';
  var tail = '\r\n--' + boundary + '--\r\n';
  var bytes = Utilities.newBlob(head).getBytes()
                .concat(blob.getBytes())
                .concat(Utilities.newBlob(tail).getBytes());
  var r = ytHttp_('https://www.googleapis.com/upload/youtube/v3/playlistImages' +
                  '?uploadType=multipart&part=snippet',
                  'post', Utilities.newBlob(bytes).getBytes(),
                  'multipart/related; boundary=' + boundary);
  if (r.code === 200 || r.code === 201) {
    try {
      var m = ytPlMap_(), rec = m[spec.key] || {};
      rec.coverSig = String(pc.sig || spec.sig);
      rec.coverSize = sz.w + '×' + sz.h;
      m[spec.key] = rec; ytPlMapSave_(m);
    } catch (eM) {}
    return 'نشست';
  }
  /* «(500)» تنها چیزی بود که تا ۸.۵۴ ثبت می‌شد، و همان بود که حدسِ «قابلیت‌های
     پیشرفته» را ممکن کرد. پیامِ خودِ یوتیوب علت را نام می‌برد. */
  var why = '';
  try { why = String((((r.json || {}).error || {}).message) || ''); } catch (e) {}
  return 'نشد (' + r.code + ')' + (why ? ': ' + why.slice(0, 100) : '');
}

/* ═══════════════ شناسنامهٔ کانال ═══════════════
 *
 * صفحهٔ «Channel customization» هفت‌هشت جای پرکردنی دارد و همه‌شان یک‌جور
 * نیستند. مرزِ واقعی این است — و باید نوشته شود، وگرنه هر بار کسی دنبالِ
 * کاری می‌گردد که اصلاً از این راه شدنی نیست:
 *
 *   موتور خودش انجام می‌دهد:  توضیح · کلیدواژه · بنر · واترمارک ·
 *                              تریلر (فقط اگر خالی باشد) · بخش‌های صفحهٔ خانه
 *   فقط دستِ آدم:            عکسِ پروفایل · لینک‌ها · ایمیلِ تماس · نام و هندل
 *
 * آن دستهٔ دوم «کارِ انجام‌نشده» نیست؛ **کارِ انجام‌نشدنی از این راه** است.
 * پس به‌جای اینکه هر شب در ایرادها تکرار شود، در یک سیاههٔ روشن می‌نشیند و
 * هفته‌ای یک بار یادآوری می‌شود — هشداری که هر روز برای چیزی که تغییر
 * نمی‌کند فیره کند، همان هشداری است که آدم یاد می‌گیرد نبیند.
 */

/** یک خواندن از کانال — همهٔ چیزی که وارسی لازم دارد. */
function ytChannelInfo_() {
  /* برمی‌گرداند {info} یا {why}. هرگز `null`ِ خالی — «کانال خوانده نشد» چهار
     علتِ متفاوت دارد و پیامی که نگوید کدام‌یک، کار را می‌خواباند. */
  var yt = ytSvc_();
  if (!yt) return { why: ytOffWhy_() };
  if (!ytQuotaTake_(YT_COST.videosList, false)) {
    return { why: 'سهمیهٔ امروزِ یوتیوب تمام شده؛ فردا خودش ادامه می‌دهد' };
  }
  try {
    var r = yt.Channels.list('id,snippet,brandingSettings,contentDetails,statistics',
                             { mine: true });
    if (r && r.items && r.items.length) return { info: r.items[0] };
    return { why: 'یوتیوب کانالی برای این حساب برنگرداند', diag: true };
  } catch (e) {
    logLine_('کانالِ یوتیوب خوانده نشد: ' + e.message);
    return { why: String(e.message).slice(0, 200), diag: true };
  }
}

/**
 * سیاههٔ شناسنامه: هر قلم، وضعش، و اینکه کارِ کیست.
 * `by` یکی از «موتور» یا «آدم» است — و همین یک حرف، تفاوتِ «هنوز نکرده‌ایم»
 * با «از این راه نمی‌شود» را نگه می‌دارد.
 */
function ytChannelCheck_(info) {
  var out = [];
  var bs = (info && info.brandingSettings) || {};
  var ch = bs.channel || {}, img = bs.image || {};
  var sn = (info && info.snippet) || {};
  /* ══ `!!ok` نیتِ خودِ این تابع را دور می‌ریخت (۶٫۴۲) ══
   * پنج قلم عمداً `null` می‌گیرند: از راهِ API نه خوانده می‌شوند نه نوشتنشان
   * قابلِ تأیید است. کامنتِ پایین‌تر صریح می‌گوید «نوشتنشان به‌عنوان ایراد
   * غلط است» و متنِ سرِ همین بخش هم همین را می‌گوید — ولی `!!null` می‌شود
   * `false`، و `false` یعنی «خالی». پس هر پنج‌تا هر بار ایراد شمرده شدند،
   * شاخهٔ `ok === null ? '—'` در `ytChannelLog_` **هرگز اجرا نشد**، و
   * «کارِ شما: لینک‌های کانال، ایمیلِ تماس» هفته‌به‌هفته برای کاری رفت که از
   * این راه شدنی نیست. عددِ «خالی ۸» هم پنج واحد باد داشت.
   * یک تحلیل که نوشته شد و یک عملگر بی‌صدا دورش ریخت — همان شکلی که این
   * ریپو مدام به آن می‌خورَد. */
  var add = function (key, label, by, ok, note) {
    out.push({ key: key, label: label, by: by,
               ok: (ok === null || ok === undefined) ? null : !!ok,
               note: String(note || '') });
  };
  add('title', 'نامِ کانال', 'آدم', !!sn.title, sn.title || '');
  add('description', 'توضیحِ کانال', 'موتور', !!String(ch.description || '').trim(),
      String(ch.description || '').length + ' نویسه');
  add('keywords', 'کلیدواژه‌ها', 'موتور', !!String(ch.keywords || '').trim(), '');
  add('banner', 'بنرِ کانال', 'موتور', !!String(img.bannerExternalUrl || '').trim(), '');
  add('trailer', 'تریلرِ کانال (برای بازدیدکنندهٔ تازه)', 'موتور',
      !!String(ch.unsubscribedTrailer || '').trim(), '');
  add('watermark', 'واترمارکِ ویدئو', 'موتور', null,
      'وضعش از راهِ API خوانده نمی‌شود؛ موتور هر بار می‌نشاندش');
  add('sections', 'بخش‌های صفحهٔ خانه', 'موتور', null, '');
  /* تبِ پادکست — کارِ موتور است و از ۶٫۱۳ خودکار می‌شود. وضعش از نقشهٔ
     پلی‌لیست‌ها خوانده می‌شود، نه از یوتیوب: یک خواندنِ رایگان در برابرِ
     یک فراخوانِ سهمیه‌خور. */
  var pcN = 0;
  try {
    var pm = ytPlMap_();
    for (var pk2 in pm) {
      if (!Object.prototype.hasOwnProperty.call(pm, pk2)) continue;
      if (pm[pk2] && pm[pk2].podcast) pcN++;
    }
  } catch (ePc) {}
  add('podcast', 'تبِ پادکست', 'موتور', pcN > 0,
      pcN ? faDigitsOut_(String(pcN)) + ' پلی‌لیست پادکست شده' : 'با اولین پلی‌لیست انجام می‌شود');

  // این چهار، از راهِ API شدنی نیستند. نوشتنشان به‌عنوان «ایراد» غلط است.
  add('posts', 'پستِ انجمن (تبِ Posts)', 'آدم', null,
      'YouTube Data API v3 هیچ منبعی برای پستِ انجمن ندارد — نه خواندن نه نوشتن؛ ' +
      'فقط از استودیو یا اپِ موبایل');
  add('picture', 'عکسِ پروفایل', 'آدم', !!((sn.thumbnails || {}).high || {}).url,
      'یوتیوب راهی در API برایش نگذاشته');
  add('links', 'لینک‌های کانال', 'آدم', null, 'از راهِ API شدنی نیست');
  add('email', 'ایمیلِ تماس', 'آدم', null, 'از راهِ API شدنی نیست');
  return out;
}

/** بنرِ کانال — ۲۵۶۰×۱۴۴۰ خواسته می‌شود، ۲۰۴۸×۱۱۵۲ حداقلِ خودِ یوتیوب است. */
function ytBannerCard_() {
  var pres = null;
  try {
    var pal = ytPalette_(String(CFG.SHOW_NAME || 'x'));
    /* ══ یک تعریف، نه دو (۶٫۷) ══
     * صفحهٔ بزرگ فقط از راهِ REST ساخته می‌شود — `SlidesApp` اندازهٔ صفحه را
     * نمی‌پذیرد. ۶٫۵ این را فقط برای بنر حل کرد و کاور با اندازهٔ پیش‌فرض
     * ماند؛ همان «قرینه‌ای که یک بار درست شد» که این ریپو بارها گرفتارش شده.
     * حالا هر دو از `ytPresCreate_` می‌گذرند.
     *
     * و تفاوتِ تصمیم این‌جاست: کاورِ کوچک زشت است ولی کار می‌کند، بنرِ کوچک
     * را یوتیوب اصلاً **نمی‌پذیرد**. پس بنر با اندازهٔ تقریبی ادامه نمی‌دهد
     * و به‌جایش نشانیِ روشن‌کردنِ سرویس را می‌دهد. */
    var mkB = ytPresCreate_('بنرِ کانال — ' + String(CFG.SHOW_NAME || ''),
                            24384000, 13716000);
    if (!mkB.exact) {
      try { if (mkB.id) DriveApp.getFileById(mkB.id).setTrashed(true); } catch (eTb) {}
      return { why: mkB.why + ' (کاورِ قسمت‌ها بی این هم ساخته می‌شود؛ فقط بنر لازمش دارد)',
               enableUrl: mkB.enableUrl };
    }
    var presId = mkB.id;
    pres = SlidesApp.openById(presId);
    var slide = pres.getSlides()[0];
    try { var els = slide.getPageElements(); for (var e = 0; e < els.length; e++) els[e].remove(); }
    catch (eEl) {}
    var W = pres.getPageWidth(), H = pres.getPageHeight();
    var bg = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, 0, W, H);
    bg.getFill().setSolidFill(pal.bg); bg.getBorder().setTransparent();
    var bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, H * 0.86, W, H * 0.04);
    bar.getFill().setSolidFill(pal.ac); bar.getBorder().setTransparent();

    /* متن در **ناحیهٔ امنِ** وسط می‌نشیند: یوتیوب همین بنر را روی تلویزیون
       کامل و روی موبایل فقط وسطش را نشان می‌دهد (۱۵۴۶×۴۲۳ در مرکز). هرچه
       بیرونِ آن باشد روی گوشی دیده نمی‌شود. */
    var safeW = W * 0.604, safeH = H * 0.294;
    var x = (W - safeW) / 2, y = (H - safeH) / 2;
    var put = function (t, top, h, size, color, bold) {
      var box = slide.insertTextBox(String(t || ''), x, top, safeW, h);
      box.getText().getTextStyle().setFontSize(size).setForegroundColor(color).setBold(!!bold);
      try {
        box.getText().getParagraphStyle()
           .setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      } catch (eA) {}
    };
    put(String(CFG.SHOW_NAME || ''), y, safeH * 0.34, 40, pal.fg, true);
    put(String(CFG.SHOW_TAGLINE || ''), y + safeH * 0.34, safeH * 0.24, 22, pal.ac, false);
    if (CFG.SPECIAL_ENABLED) {
      put(String(CFG.SPECIAL_SHOW_NAME || '') + '  ·  ' + String(CFG.SPECIAL_TAGLINE || ''),
          y + safeH * 0.62, safeH * 0.3, 20, pal.fg, false);
    }
    pres.saveAndClose();
    var blob = ytSlideExport_(presId, slide.getObjectId(), 'بنرِ کانال.png');
    if (!blob) return { why: 'خروجیِ PNGِ بنر نشد' };
    var size = ytPngSize_(blob);
    if (!size) return { why: 'ابعادِ PNGِ بنر خوانده نشد' };
    if (size.w < 2048 || size.h < 1152) {
      // نفرستادن بهتر از فرستادن و ردشدن است — و علتش باید عدد داشته باشد
      return { why: 'بنر کوچک درآمد: ' + size.w + '×' + size.h +
                    ' در برابرِ حداقلِ ۲۰۴۸×۱۱۵۲ که یوتیوب می‌خواهد' };
    }
    try { DriveApp.getFileById(presId).moveTo(ytCoverFolder_()); } catch (eM) {}
    return { blob: blob, size: size };
  } catch (e) {
    try { if (pres) pres.saveAndClose(); } catch (eS) {}
    return { why: 'بنر ساخته نشد: ' + String(e.message).slice(0, 140) };
  }
}

/** بنر را می‌نشاند: اول آپلود، بعد نشانی‌اش در شناسنامهٔ کانال. */
function ytBannerSet_(chId) {
  var made = ytBannerCard_();
  if (!made || !made.blob) return made && made.why ? made.why : 'نشد';
  if (!ytQuotaTake_(YT_COST.thumbSet, false)) return 'سهمیه';
  var up = ytHttp_('https://www.googleapis.com/upload/youtube/v3/channelBanners/insert' +
                   '?uploadType=media', 'post', made.blob.getBytes(), 'image/png');
  if (up.code !== 200 || !up.json || !up.json.url) {
    return 'آپلودِ بنر نشد (' + up.code + ')';
  }
  if (!ytQuotaTake_(YT_COST.playlistsUpdate, false)) return 'سهمیه';
  try {
    ytSvc_().Channels.update({ id: chId, brandingSettings: {
      image: { bannerExternalUrl: String(up.json.url) } } }, 'brandingSettings');
    return 'نشست (' + made.size.w + '×' + made.size.h + ')';
  } catch (e) { return 'ثبتِ بنر نشد: ' + String(e.message).slice(0, 100); }
}

/**
 * واترمارک: **خودِ عکسِ پروفایلِ کانال**، نه یک طرحِ تازه.
 * عکسِ پروفایل را آدم انتخاب کرده و نشانِ کانال است؛ ساختنِ یک نشانِ دومِ
 * ماشینی برای گوشهٔ ویدئو یعنی دو هویت برای یک کانال.
 */
function ytWatermarkSet_(info) {
  /* ══ اول نشانِ بریده و بی‌زمینه، بعد عکسِ پروفایل (۸.۴۵) ══
     عکسِ پروفایل ۸۷٪ سیاه است و بی شفافیت؛ واترمارکِ یوتیوب همان «مربعِ سیاهِ زشت»
     را روی همهٔ ویدئوها می‌گذاشت. رانر (`logoClean`) زمینه را برمی‌دارد و نتیجه را
     در `docs/brand/channel-mark.png` می‌گذارد؛ Apps Script ابزارِ تصویر ندارد، پس
     همان فایل از گیت‌هاب خوانده می‌شود. نبودنش یعنی هنوز رندری نشده — آن‌وقت همان
     عکسِ پروفایلِ قبلی، نه هیچ. بایت‌ها باور می‌شوند، نه نشانی (۷.۳۳). */
  var blob = null, url = '';
  try {
    var rc = UrlFetchApp.fetch(githubRawUrl_('docs/brand/channel-mark.png'), { muteHttpExceptions: true });
    if (rc.getResponseCode() === 200) {
      var bb = rc.getBlob().getBytes();
      if (bb.length > 200 && (bb[0] & 0xFF) === 0x89 && bb[1] === 0x50) {
        blob = Utilities.newBlob(bb, 'image/png', 'watermark.png');
        url = 'docs/brand/channel-mark.png';
      }
    }
  } catch (eC) { blob = null; }
  // عکسِ پروفایل، از بزرگ‌ترین اندازه‌ای که کانال دارد
  if (!blob) {
    try {
      var th = (((info || {}).snippet || {}).thumbnails) || {};
      url = String((th.high || th.medium || th['default'] || {}).url || '');
    } catch (e) { url = ''; }
    if (!url) return 'عکسِ پروفایل خوانده نشد';
    try {
      var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (r.getResponseCode() !== 200) return 'عکسِ پروفایل گرفته نشد (' + r.getResponseCode() + ')';
      blob = r.getBlob().setName('watermark.png');
    } catch (e2) { return 'عکسِ پروفایل گرفته نشد: ' + String(e2.message).slice(0, 80); }
  }
  if (!ytQuotaTake_(YT_COST.thumbSet, false)) return 'سهمیه';
  // نوعِ فایل از خودِ بلاب، و اگر نگفت از پسوندِ نشانی؛ برچسبِ غلط یعنی ردِ
  // فراخوان، و «image/png» زدن روی یک JPEG دقیقاً همان است.
  var mime = '';
  try { mime = String(blob.getContentType && blob.getContentType() || ''); } catch (eM) {}
  if (!mime) mime = /\.jpe?g(\?|$)/i.test(url) ? 'image/jpeg' : 'image/png';

  /* ══ چرا multipart و نه فقط تصویر (باگِ ۶٫۴) ══
   * `watermarks.set` یک متدِ آپلود **با متادیتا**ست: بدنه‌اش منبعِ
   * InvideoBranding است (جای واترمارک و زمانش) و تصویر بخشِ دوم. فرستادنِ
   * تصویرِ تنها با uploadType=media همان ۴۰۰ی است که گرفتیم — و پیامش هم
   * چیزی نمی‌گفت، چون کدِ ما فقط شماره را نشان می‌داد. */
  var branding = { position: { type: 'corner', cornerPosition: 'bottomRight' } };
  var boundary = '----ytwm' + String(info.id).replace(/[^A-Za-z0-9]/g, '').slice(-10);
  var head = '--' + boundary + '\r\n' +
             'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
             JSON.stringify(branding) +
             '\r\n--' + boundary + '\r\n' +
             'Content-Type: ' + mime + '\r\n\r\n';
  var tail = '\r\n--' + boundary + '--\r\n';
  var bytes = Utilities.newBlob(head).getBytes()
                .concat(blob.getBytes())
                .concat(Utilities.newBlob(tail).getBytes());
  var up = ytHttp_('https://www.googleapis.com/upload/youtube/v3/watermarks/set' +
                   '?uploadType=multipart&channelId=' + encodeURIComponent(String(info.id)),
                   'post', bytes, 'multipart/related; boundary=' + boundary);
  if (up.code === 200 || up.code === 204) return 'نشست';
  // شمارهٔ کد به‌تنهایی چیزی نمی‌گوید — پیامِ خودِ گوگل را بیاور
  var why = '';
  try { why = String((((up.json || {}).error || {}).message) || ''); } catch (eW) {}
  return 'نشد (' + up.code + ')' + (why ? ': ' + why.slice(0, 120) : '');
}

/**
 * تریلر — **فقط اگر خالی باشد**.
 * پرکردنِ یک جای خالی کمک است؛ عوض‌کردنِ انتخابِ آدم نیست. کانال ۱۱۷ ویدئوی
 * دیگر هم دارد و ممکن است صاحبش عمداً چیزی را تریلر کرده باشد.
 */
function ytTrailerSet_(info, hub) {
  var cur = '';
  try { cur = String(((info.brandingSettings || {}).channel || {}).unsubscribedTrailer || ''); }
  catch (e) {}
  if (cur) return 'دست‌نخورده (خودتان انتخاب کرده‌اید)';
  var pub = ytPublished_(hub), best = null, bestEp = -1;
  for (var k in pub) {
    if (!Object.prototype.hasOwnProperty.call(pub, k)) continue;
    if (!pub[k].videoId) continue;
    var ep = Number(String(k).split(':')[1]) || 0;
    if (ep > bestEp) { bestEp = ep; best = pub[k]; }
  }
  if (!best) return 'هنوز ویدئویی از ما منتشر نشده';
  if (!ytQuotaTake_(YT_COST.playlistsUpdate, false)) return 'سهمیه';
  try {
    ytSvc_().Channels.update({ id: info.id, brandingSettings: {
      channel: { unsubscribedTrailer: best.videoId } } }, 'brandingSettings');
    return 'گذاشته شد: ' + auditCut_(best.title || best.videoId, 40);
  } catch (e2) { return 'نشد: ' + String(e2.message).slice(0, 100); }
}

/**
 * بخش‌های صفحهٔ خانه — **فقط افزودن**، هرگز حذف و هرگز جابه‌جایی.
 * این کانال ۱۱۷ ویدئوی دیگر دارد و چیدمانِ خانه‌اش مالِ صاحبش است. یک
 * همگام‌سازیِ شبانه که بخشی را بردارد، کارِ آدم را خراب کرده — و آن را
 * نمی‌شود «فردا بهتر» کرد.
 */
function ytSectionsSync_(chId) {
  var yt = ytSvc_(); if (!yt) return { added: 0, why: 'سرویس نیست' };
  var out = { added: 0, have: 0, why: '' };
  var have = [], list = null;
  if (!ytQuotaTake_(YT_COST.itemsList, false)) { out.why = 'سهمیه'; return out; }
  try { list = yt.ChannelSections.list('id,snippet,contentDetails', { mine: true }); }
  catch (e) { out.why = 'بخش‌ها خوانده نشدند: ' + String(e.message).slice(0, 90); return out; }
  var items = (list && list.items) || [];
  out.have = items.length;
  for (var i = 0; i < items.length; i++) {
    var cd = items[i].contentDetails || {};
    for (var p = 0; p < (cd.playlists || []).length; p++) have.push(String(cd.playlists[p]));
  }
  // سقفِ خودِ یوتیوب دوازده بخش است؛ زیرش می‌مانیم تا جا برای صاحبِ کانال بماند
  var room = Math.max(0, 10 - items.length);
  if (!room) { out.why = 'جای خالی در صفحهٔ خانه نمانده'; return out; }

  var map = ytPlMap_(), want = [];
  for (var k in map) {
    if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
    var id = String((map[k] || {}).id || '');
    if (!id || have.indexOf(id) !== -1) continue;
    want.push({ id: id, title: String(map[k].title || '') });
  }
  for (var w = 0; w < want.length && out.added < room; w++) {
    if (!ytQuotaTake_(YT_COST.playlistsInsert, false)) break;
    try {
      yt.ChannelSections.insert({
        snippet: { type: 'singlePlaylist', style: 'horizontalRow',
                   position: items.length + out.added,
                   title: auditCut_(want[w].title, 90) },
        contentDetails: { playlists: [want[w].id] }
      }, 'snippet,contentDetails');
      out.added++;
    } catch (e2) { out.why = String(e2.message).slice(0, 100); break; }
  }
  return out;
}

/** توضیحِ کانال — از خودِ پیکربندی، نه دستی. پس با تغییرِ برنامه‌ها تازه می‌شود. */
function ytChannelDesc_() {
  var L = [];
  L.push(String(CFG.SHOW_NAME || '') + ' — ' + String(CFG.SHOW_TAGLINE || ''));
  if (CFG.SPECIAL_ENABLED) {
    L.push(String(CFG.SPECIAL_SHOW_NAME || '') + ' — ' + String(CFG.SPECIAL_TAGLINE || ''));
  }
  L.push('');
  L.push('هر روز دو پادکستِ فارسی: یکی از هر دری سخنی، و یکی درسِ دنباله‌دار ' +
         'از یک مجموعهٔ آموزشی. مجموعه‌ها هرکدام پلی‌لیستِ خودشان را دارند و ' +
         'به ترتیب چیده شده‌اند، پس می‌شود از درسِ اول شروع کرد.');
  return L.join('\n');
}

function ytChannelKeywords_() {
  var k = ['پادکست فارسی', 'پادکست آموزشی', String(CFG.SHOW_NAME || '')];
  if (CFG.SPECIAL_ENABLED) k.push(String(CFG.SPECIAL_SHOW_NAME || ''));
  k.push('آموزش', 'یادگیری', 'podcast farsi');
  var out = [], used = 0;
  for (var i = 0; i < k.length; i++) {
    var t = String(k[i] || '').trim();
    if (!t || used + t.length + 3 > 450) continue;
    out.push(t.indexOf(' ') !== -1 ? '"' + t + '"' : t);
    used += t.length + 3;
  }
  return out.join(' ');
}

/** منو: اصلاحِ عنوان و کاورِ یک قسمتِ منتشرشده. */
function runYouTubeRedo() {
  var ui = ui_();
  if (!ui) return { ok: false, why: 'از داخلِ شیت اجرا کنید' };
  if (!ytOn_()) { ui.alert('انتشار در یوتیوب', ytOffWhy_(), ui.ButtonSet.OK); return; }
  var r = ui.prompt('بازسازیِ عنوان و کاور',
    'کدام قسمت؟ به این شکل بنویسید:\n' +
    '   درس‌نامه 16      یا      رنگ 19\n\n' +
    'اگر می‌خواهید مدل از نو بنویسد، آخرش «نو» اضافه کنید:\n' +
    '   درس‌نامه 16 نو\n\n' +
    'بی «نو»، همان چیزی که در «' + (CFG.YT_PLAN_FILE || '_yt.json') + '» پوشهٔ ' +
    'قسمت هست به کار می‌رود — پس می‌توانید اول آن فایل را دستی ویرایش کنید.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var txt = faDigits_(String(r.getResponseText() || '')).trim();
  var m = txt.match(/(\d{1,5})/);
  if (!m) { ui.alert('شمارهٔ قسمت خوانده نشد.'); return; }
  var show = /درس|تخصص|special/i.test(txt) ? ENRICH_SHOW_SPECIAL : ENRICH_SHOW_VARIETY;
  var out = ytRedoOne_(show, m[1], { remodel: /نو|تازه|new/i.test(txt), recover: true });
  ui.alert('بازسازیِ یوتیوب',
    (out.ok ? '✅ انجام شد: ' + out.changed.join('، ') : '❌ انجام نشد') +
    (out.why ? '\n\n' + out.why : '') +
    '\n\nویدئو دوباره آپلود نشد، پس بازدید و لینکش دست‌نخورده است.',
    ui.ButtonSet.OK);
  return out;
}

/**
 * «بازسازیِ تصویرهای یک قسمت» — درِ آدم، وقتی کارتی بد درآمد.
 *
 * چیزی پاک نمی‌شود: فایل‌ها به زباله می‌روند و سابقهٔ تلاش هم صفر می‌شود، تا
 * قسمتی که سه بار شکست خورده بود همین‌الان «رهاشده» حساب نشود (۵٫۹۵/۵٫۸۸).
 * ساختِ تازه کارِ اجرای بعدیِ انتشار است، نه این دکمه: یک ساختِ درون‌خطیِ
 * دوازده‌کارتی، همان اجرای شش‌دقیقه‌ای را می‌خورد که ۷٫۶۰ درباره‌اش نوشت.
 */
/**
 * «سبکِ تصویرِ همهٔ مجموعه‌ها: خودکار» — درِ آدم برای همان کاری که ۸٫۱۹
 * خودکارش کرد.
 *
 * مهاجرتِ خودکار فقط خانه‌هایی را برمی‌گرداند که **خودمان** منجمدشان کرده
 * بودیم؛ این دکمه برای وقتی است که او بگوید «همه‌شان، حتی آن‌هایی که خودم
 * گذاشته بودم». پس عمداً دستی است و عمداً **می‌شمارد پیش از آنکه بنویسد**:
 * پاک‌کردنِ سلیقهٔ آدم بی اینکه بداند چند تا را پاک می‌کند، همان چیزی است که
 * این پرونده بارها نوشته نباید بشود.
 */
function runLvStyleAllAuto() {
  var ui = ui_();
  if (!ui) return { ok: false, why: 'از داخلِ شیت اجرا کنید' };
  var hub, reg;
  try { hub = getHub_(); reg = readSeriesReg_(hub); }
  catch (e) { ui.alert('خوانده نشد: ' + e.message); return { ok: false, why: e.message }; }

  var mine = [], n = 0;
  for (var i = 0; i < reg.rows.length; i++) {
    var raw = String(reg.rows[i].vals[SC.LVSTYLE - 1] || '').trim();
    if (!raw || lvStyleNorm_(raw) === lvStyleNorm_('خودکار')) continue;
    n++;
    if (!lvThawable_(reg.rows[i].vals, raw) && mine.length < 8) {
      mine.push(String(reg.rows[i].vals[SC.NAME - 1] || reg.rows[i].key) + ' («' + raw + '»)');
    }
  }
  if (!n) {
    ui.alert('سبکِ تصویر', 'همهٔ مجموعه‌ها از قبل روی «خودکار» هستند.', ui.ButtonSet.OK);
    return { ok: true, changed: 0 };
  }
  var ask = ui.alert('سبکِ تصویرِ همهٔ مجموعه‌ها را «خودکار» کنم؟',
    faDigitsOut_(String(n)) + ' مجموعه سبکِ ثابت دارند و همه روی «خودکار» می‌روند — ' +
    'یعنی مدل برای هر درس، از روی موضوعِ مجموعه و متنِ همان قسمت، انتخاب می‌کند.' +
    (mine.length ? '\n\nاز این‌ها، این‌ها را خودتان گذاشته بودید و پاک می‌شوند:\n• ' +
                   mine.join('\n• ') : '') +
    '\n\nهر کدام را بعداً در تختهٔ «مجموعه‌های آموزشی و پیشرفت» می‌شود برگرداند.',
    ui.ButtonSet.OK_CANCEL);
  if (ask !== ui.Button.OK) return { ok: false, why: 'لغو شد' };

  var done = 0;
  for (var j = 0; j < reg.rows.length; j++) {
    var r2 = String(reg.rows[j].vals[SC.LVSTYLE - 1] || '').trim();
    if (!r2 || lvStyleNorm_(r2) === lvStyleNorm_('خودکار')) continue;
    try { reg.sheet.getRange(reg.rows[j].row, SC.LVSTYLE).setValue('خودکار'); done++; } catch (eW) {}
  }
  try { lvThawDone_(); } catch (eF) {}
  ui.alert('سبکِ تصویر',
    '✅ ' + faDigitsOut_(String(done)) + ' مجموعه روی «خودکار» نشست.\n\n' +
    'قسمت‌هایی که از این به بعد ساخته می‌شوند سبکشان را از مدل می‌گیرند. برای ' +
    'قسمتی که از قبل منتشر شده، «بازسازیِ عنوان و کاورِ یوتیوب» را با واژهٔ «نو» بزنید.',
    ui.ButtonSet.OK);
  return { ok: true, changed: done };
}

function runLessonVisualsRebuild() {
  var ui = ui_();
  if (!ui) return { ok: false, why: 'از داخلِ شیت اجرا کنید' };
  var r = ui.prompt('بازسازیِ تصویرهای یک قسمت',
    'کدام قسمت؟ به این شکل بنویسید:\n' +
    '   درس‌نامه 16\n\n' +
    'تصویرهای آن قسمت به زباله می‌روند (پاک نمی‌شوند) و اجرای بعدیِ انتشارِ ' +
    'یوتیوب از نو می‌سازدشان — با سبکی که همین حالا در ستونِ «سبکِ تصویر» ' +
    'آن مجموعه نوشته شده. پس اگر می‌خواهید سبک عوض شود، اول آن خانه را ' +
    'عوض کنید.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var txt = faDigits_(String(r.getResponseText() || '')).trim();
  var m = txt.match(/(\d{1,5})/);
  if (!m) { ui.alert('شمارهٔ قسمت خوانده نشد.'); return; }
  var show = /درس|تخصص|special/i.test(txt) ? ENRICH_SHOW_SPECIAL : ENRICH_SHOW_VARIETY;
  if (!ytVisOn_(show)) {
    ui.alert('بازسازیِ تصویرها',
      'این نمایش تصویر نمی‌گیرد. فعلاً فقط ' + (CFG.SPECIAL_SHOW_NAME || 'درس‌نامه') +
      ' — به خواستهٔ خودتان.', ui.ButtonSet.OK);
    return;
  }
  var out = lvRedoOne_(show, m[1]);
  ui.alert('بازسازیِ تصویرها',
    (out.ok ? '✅ ' + faDigitsOut_(String(out.dropped)) + ' فایل به زباله رفت' :
              '❌ انجام نشد') +
    (out.why ? '\n\n' + out.why : '') +
    '\n\nاجرای بعدیِ انتشارِ یوتیوب از نو می‌سازدشان. ویدئوی منتشرشده عوض ' +
    'نمی‌شود — یوتیوب اجازه نمی‌دهد.',
    ui.ButtonSet.OK);
  return out;
}

/* ─────────────── ۱۷) گرداننده و سیاههٔ شناسنامهٔ کانال ─────────────── */

var YTC_HEADERS = ['تاریخ', 'قلم', 'کارِ کیست', 'وضع', 'اقدامِ این اجرا', 'شرح'];

function ytChannelLog_(hub, rows) {
  if (!rows || !rows.length) return false;
  try {
    var sh = ensureTab_(hub || getHub_(), CFG.YTC_TAB || 'شناسنامهٔ کانال یوتیوب', YTC_HEADERS);
    var block = [];
    for (var i = 0; i < rows.length; i++) {
      block.push([nowStr_(), String(rows[i].label || ''), String(rows[i].by || ''),
                  rows[i].ok === null ? '—' : (rows[i].ok ? 'پر' : 'خالی'),
                  String(rows[i].did || ''), String(rows[i].note || '')]);
    }
    appendBlock_(sh, block, YTC_HEADERS.length);
    return true;
  } catch (e) { logLine_('سیاههٔ شناسنامهٔ کانال نوشته نشد: ' + e.message); return false; }
}

/**
 * یک دورِ کاملِ شناسنامه: می‌خواند، آنچه کارِ خودش است را انجام می‌دهد،
 * و همه‌چیز را ثبت می‌کند.
 *
 * `force` از دکمهٔ منو می‌آید و اثرانگشت را نادیده می‌گیرد. بی آن، شبی که
 * هیچ‌چیز عوض نشده هیچ فراخوانی نمی‌رود — سهمیه‌ای که بی‌دلیل خرج شود،
 * آپلودِ فردا را می‌خواباند.
 */
function ytChannelSync_(force) {
  var out = { ok: false, ran: false, did: [], todo: [], why: '', rows: [] };
  if (!ytOn_() || CFG.YT_CHANNEL === false) { out.why = ytOffWhy_() || 'خاموش'; return out; }
  var hub = getHub_();
  var got = ytChannelInfo_();
  if (!got.info) {
    out.why = got.why || 'کانال خوانده نشد';
    // و اگر علتش از جنسِ دسترسی بود، همان‌جا دقیق بگو — نه اینکه کاربر
    // بماند با یک جملهٔ بی‌سرنخ و دنبالِ گزینهٔ دیگری بگردد.
    if (got.diag) {
      try { out.diag = ytDiagnose_(); } catch (eD) {}
      if (out.diag && out.diag.cause) out.why = out.diag.cause;
    }
    return out;
  }
  var info = got.info;
  out.channelId = String(info.id || '');
  out.title = String((info.snippet || {}).title || '');

  var rows = ytChannelCheck_(info);
  var byKey = Object.create(null);
  for (var r = 0; r < rows.length; r++) byKey[rows[r].key] = rows[r];

  var desc = ytScrub_(ytChannelDesc_()).slice(0, 990);
  var kw = ytChannelKeywords_();
  var sig = [desc, kw, String(((info.brandingSettings || {}).image || {}).bannerExternalUrl || ''),
             String(((info.brandingSettings || {}).channel || {}).unsubscribedTrailer || '')].join('|');
  var was = '';
  try { was = String(props_().getProperty('YT_CHANNEL_SIG') || ''); } catch (e) {}
  var stale = ytChannelStale_();
  /* ══ نگهبانی که شکست را «سلامت» می‌خواند (۶٫۱۳) ══
   * `sig` **وضعِ فعلی** را امضا می‌کند. اگر بنر نشسته باشد، بنر خالی می‌مانَد
   * و امضا هم عوض نمی‌شود — پس دفعهٔ بعد «تازه است» گفته می‌شود و تا یک
   * هفته دیگر هیچ تلاشی نمی‌شود. یعنی وقتی Slides روشن شد و بنر *می‌توانست*
   * ساخته شود، هفت روز چیزی اتفاق نمی‌افتاد.
   *
   * «چیزی عوض نشده» و «شکست خوردیم و به همین دلیل چیزی عوض نشده» دو چیزِ
   * کاملاً متفاوت‌اند، و امضا نمی‌تواند از هم جدایشان کند. پس نگهبانِ تازگی
   * فقط وقتی حق دارد جلو را بگیرد که **کارِ موتور تمام شده باشد**. */
  var undone = 0;
  for (var u = 0; u < rows.length; u++) {
    if (String(rows[u].owner || '') !== 'موتور') continue;   // کارِ آدم، کارِ ما نیست
    if (rows[u].ok === false) undone++;
  }
  if (sig === was && !force && !stale && !undone) {
    out.ok = true; out.why = 'تازه است';
    out.rows = rows;
    return out;
  }
  out.ran = true;

  // ── ۱) توضیح و کلیدواژه ──
  var curDesc = String(((info.brandingSettings || {}).channel || {}).description || '');
  if (curDesc !== desc && ytQuotaTake_(YT_COST.playlistsUpdate, false)) {
    try {
      ytSvc_().Channels.update({ id: info.id, brandingSettings: {
        channel: { description: desc, keywords: kw,
                   defaultLanguage: CFG.YT_LANG || 'fa' } } }, 'brandingSettings');
      byKey.description.did = curDesc ? 'به‌روز شد' : 'پر شد';
      byKey.keywords.did = 'به‌روز شد';
      out.did.push('توضیح و کلیدواژه');
    } catch (e2) { byKey.description.did = 'نشد: ' + String(e2.message).slice(0, 90); }
  } else { byKey.description.did = 'دست‌نخورده'; }

  // ── ۲) بنر — فقط وقتی نیست ──
  if (!byKey.banner.ok) {
    var b = ytBannerSet_(info.id);
    byKey.banner.did = b;
    if (String(b).indexOf('نشست') === 0) out.did.push('بنر');
  } else { byKey.banner.did = 'دارد'; }

  // ── ۳) واترمارک ──
  if (CFG.YT_WATERMARK !== false) {
    var wm = ytWatermarkSet_(info);
    byKey.watermark.did = wm;
    if (wm === 'نشست') out.did.push('واترمارک');
  } else { byKey.watermark.did = 'خاموش'; }

  // ── ۴) تریلر — فقط اگر خالی باشد ──
  var tr = ytTrailerSet_(info, hub);
  byKey.trailer.did = tr;
  if (String(tr).indexOf('گذاشته شد') === 0) out.did.push('تریلر');

  // ── ۵) بخش‌های صفحهٔ خانه ──
  var sec = ytSectionsSync_(info.id);
  byKey.sections.did = sec.added ? (sec.added + ' بخش افزوده شد')
                                 : (sec.why || 'چیزی برای افزودن نبود');
  byKey.sections.note = 'الان ' + faDigitsOut_(String(sec.have || 0)) + ' بخش دارد';
  if (sec.added) out.did.push(sec.added + ' بخشِ صفحهٔ خانه');

  // ── ۶) آنچه فقط دستِ آدم است ──
  for (var t = 0; t < rows.length; t++) {
    if (rows[t].by !== 'آدم') continue;
    if (rows[t].ok === false || rows[t].ok === null) {
      rows[t].did = 'کارِ شما';
      if (rows[t].key !== 'title') out.todo.push(rows[t].label);
    } else { rows[t].did = 'دارد'; }
  }

  /* ══ سیاهه باید وضعِ *پس از* کار را نشان بدهد ══
   * ردیف‌ها پیش از اقدام خوانده شده‌اند، پس «توضیحِ کانال ⬜ خالی — پر شد
   * (۰ نویسه)» هم‌زمان دو چیزِ متناقض می‌گفت: تیکِ خالی و عددِ صفر از
   * *قبل* بودند و «پر شد» از *بعد*. یک بار دیگر خوانده می‌شود تا آنچه
   * نوشته می‌شود همان چیزی باشد که الان هست. */
  if (out.did.length) {
    try {
      var again = ytChannelInfo_();
      if (again.info) {
        var fresh = ytChannelCheck_(again.info), fmap = Object.create(null);
        for (var g = 0; g < fresh.length; g++) fmap[fresh[g].key] = fresh[g];
        for (var h = 0; h < rows.length; h++) {
          var nf = fmap[rows[h].key];
          if (!nf) continue;
          rows[h].ok = nf.ok;
          if (nf.note) rows[h].note = nf.note;
        }
      }
    } catch (eRe) {}
  }

  ytChannelLog_(hub, rows);
  try {
    props_().setProperty('YT_CHANNEL_SIG', sig);
    props_().setProperty('YT_CHANNEL_AT', nowStr_());
  } catch (e3) {}
  out.rows = rows; out.ok = true;
  logLine_('شناسنامهٔ کانال: ' + (out.did.length ? out.did.join('، ') : 'چیزی عوض نشد') +
           (out.todo.length ? ' · کارِ شما: ' + out.todo.join('، ') : '') + '.');
  return out;
}

/** هر چند روز یک بار، حتی اگر هیچ‌چیز عوض نشده باشد — چون یوتیوب هم عوض می‌شود. */
function ytChannelStale_() {
  var at = '';
  try { at = String(props_().getProperty('YT_CHANNEL_AT') || ''); } catch (e) {}
  if (!at) return true;
  var t = parseWhen_(at);
  if (isNaN(t)) return true;
  var days = (new Date().getTime() - t) / 86400000;
  return days >= Math.max(1, Number(CFG.YT_CHANNEL_EVERY_DAYS) || 7);
}

/** آخرین وضعِ شناسنامه، برای وضعیت و ناظر — از تب، با یک خواندن. */
function ytChannelState_() {
  var out = { at: '', filled: 0, empty: 0, unknown: 0, todo: [], why: [], line: '' };
  try {
    var sh = getHub_().getSheetByName(CFG.YTC_TAB || 'شناسنامهٔ کانال یوتیوب');
    if (!sh || sh.getLastRow() < 2) { out.line = 'شناسنامهٔ کانال: هنوز وارسی نشده.'; return out; }
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, YTC_HEADERS.length).getValues();
    var last = Object.create(null);
    for (var i = 0; i < v.length; i++) last[String(v[i][1])] = v[i];   // آخرین ردیفِ هر قلم
    for (var k in last) {
      if (!Object.prototype.hasOwnProperty.call(last, k)) continue;
      var row = last[k];
      out.at = String(row[0]);
      if (String(row[3]) === 'پر') out.filled++;
      else if (String(row[3]) === '—') out.unknown++;
      else if (String(row[3]) === 'خالی') {
        out.empty++;
        if (String(row[2]) === 'آدم') out.todo.push(k);
        else {
          /* ══ علت در تب می‌مانْد، و او تب باز نمی‌کند (۶٫۴۲) ══
           * ستونِ «اقدامِ این اجرا» از اول علتِ دقیق را داشت — «بنر کوچک بود
           * ۱۶۰۰×۹۰۰»، «آپلودِ بنر نشد (۴۰۳)» — ولی سطرِ روزانه فقط
           * می‌شمرد. پس هفته‌ها «خالی ۸» رفت و هیچ‌کس نفهمید بنر چرا نیامد،
           * تا خودش پرسید. قاعدهٔ ۵٫۹۰: چیزی که فقط در یک شیت باشد، از نظرِ
           * او وجود ندارد. */
          var did = String(row[4] || '').trim();
          if (did && did !== 'دست‌نخورده' && did.indexOf('کارِ شما') !== 0) {
            out.why.push(k + ': ' + did.slice(0, 70));
          }
        }
      }
    }
  } catch (e) {}
  out.line = 'شناسنامهٔ کانال: پرشده ' + faDigitsOut_(String(out.filled)) +
             (out.empty ? ' · خالی ' + faDigitsOut_(String(out.empty)) : '') +
             (out.why.length ? ' (' + out.why.slice(0, 3).join(' · ') + ')' : '') +
             (out.unknown ? ' · ' + faDigitsOut_(String(out.unknown)) +
                            ' قلم از راهِ API خوانده نمی‌شود' : '') +
             (out.todo.length ? ' · کارِ شما: ' + out.todo.join('، ') : ' · چیزی از شما نمی‌خواهد') + '.';
  return out;
}

/** نوبتِ یادآوریِ کارهای دستی رسیده؟ */
function ytTodoDue_() {
  var at = '';
  try { at = String(props_().getProperty('YT_TODO_AT') || ''); } catch (e) {}
  if (!at) return true;
  var t = parseWhen_(at);
  if (isNaN(t)) return true;
  return (new Date().getTime() - t) / 86400000 >= Math.max(1, Number(CFG.YT_TODO_EVERY_DAYS) || 7);
}

/** منو: شناسنامهٔ کانال را همین حالا وارسی و تکمیل کن. */
function runYouTubeChannel() {
  var ui = ui_();
  var r = ytChannelSync_(true);
  var L = ['شناسنامهٔ کانالِ یوتیوب:'];
  if (r.title) L.push('کانال: «' + r.title + '»');
  L.push('');
  for (var i = 0; i < (r.rows || []).length; i++) {
    var x = r.rows[i];
    L.push((x.ok === true ? '✅ ' : (x.ok === false ? '⬜ ' : '• ')) + x.label +
           ' — ' + (x.did || '') + (x.note ? ' (' + x.note + ')' : ''));
  }
  if (r.todo && r.todo.length) {
    L.push('');
    L.push('این‌ها از راهِ API شدنی نیستند و فقط از studio.youtube.com انجام می‌شوند:');
    for (var t = 0; t < r.todo.length; t++) L.push('   • ' + r.todo[t]);
  }
  if (r.why) { L.push(''); L.push('نتیجه: ' + r.why); }
  if (r.diag) {
    var d = r.diag;
    L.push('');
    L.push('عیب‌یابی:');
    L.push('  سرویسِ یوتیوب در پروژه: ' + (ytSvc_() ? 'فعال ✅' : 'فعال نیست ❌'));
    L.push('  اسکوپِ یوتیوب در توکن: ' + (d.scopeOk ? 'هست ✅' : 'نیست ❌'));
    L.push('  پاسخِ یوتیوب: HTTP ' + d.code);
    if (d.fix) { L.push(''); L.push('چاره: ' + d.fix); }
    if (d.raw) { L.push(''); L.push('پاسخِ خامِ گوگل:'); L.push(d.raw); }
    L.push('');
    L.push('از همین منو «🔧 عیب‌یابی و رفعِ دسترسیِ یوتیوب» را بزنید — ' +
           'اگر علتش اجازه باشد، همان‌جا درستش می‌کند.');
  }
  var m = L.join('\n');
  if (ui) ui.alert('شناسنامهٔ کانال', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

/* ═══════════════ ۱۸) عیب‌یابی — چون «کانال خوانده نشد» جواب نیست ═══════════════
 *
 * ۲۵ اوت، اولین فشردنِ دکمه: «کانال خوانده نشد». و همین بس بود که کار بخوابد،
 * چون آن جمله **چهار علتِ کاملاً متفاوت** دارد و از بیرون یک‌شکل‌اند:
 *   ۱) اسکوپِ یوتیوب در توکن نیست (افزودنِ سرویس در ویرایشگر کافی نیست، اگر
 *      appsscript.json فهرستِ صریحِ oauthScopes داشته باشد — که این پروژه دارد)
 *   ۲) YouTube Data API در پروژهٔ ابری روشن نشده
 *   ۳) این حسابِ گوگل اصلاً کانالی ندارد
 *   ۴) سهمیه تمام شده
 *
 * همان درسی که ۵٫۱۸ برای نصبِ خودکار داد: «فهرست‌کردنِ هر چهار احتمال کاربر را
 * سرگردان می‌کند؛ باید گفت کدام‌یک است.» پس این تابع از خودِ گوگل می‌پرسد و
 * پاسخِ خامش را هم نشان می‌دهد.
 */
/* اسکوپ‌های خودِ یوتیوب. */
var YT_API_SCOPES = ['https://www.googleapis.com/auth/youtube',
                     'https://www.googleapis.com/auth/youtube.force-ssl',
                     'https://www.googleapis.com/auth/youtube.upload'];

/* و اسکوپی که *برای همین قابلیت* لازم است ولی اسمش یوتیوب نیست.
 *
 * ══ چرا جدا نوشته شده ══
 * کاورِ قسمت، کاورِ پلی‌لیست و بنرِ کانال همه با Slides ساخته می‌شوند —
 * تنها راهِ رستر کردنِ تصویر در Apps Script. پس بی این اسکوپ، انتشار
 * «کار می‌کند» ولی هر ویدئو بی‌کاور می‌رود و هر شب یک خطای مجزا می‌دهد.
 * و چون appsscript.json این پروژه فهرستِ صریح دارد، هیچ اسکوپی خودکار
 * استنتاج نمی‌شود.
 *
 * اگر این‌جا نوشته نمی‌شد، کاربر یک بار برای یوتیوب تأیید می‌کرد، بعد به
 * خطای کاور می‌خورد، و باید دوباره تأیید می‌کرد. یک تأیید، نه دو تا. */
var YT_SLIDES_SCOPE = 'https://www.googleapis.com/auth/presentations';

var YT_SCOPES = YT_API_SCOPES.concat([YT_SLIDES_SCOPE]);

/**
 * «این API در پروژهٔ ابری روشن نیست» — یک تشخیص، هر تعداد سرویس.
 *
 * یوتیوب، Slides، و هر سرویسِ دیگری که فردا اضافه شود، همگی همین ۴۰۳ را
 * می‌دهند و همگی نشانیِ دقیقِ صفحهٔ روشن‌کردن را در متنِ خودشان دارند.
 * بیرون کشیدنِ آن نشانی یعنی کاربر یک قدم دارد، نه ده دقیقه گشتن.
 */
/* ══ «(۴۰۳)» علت نیست (۶٫۸۰) ══
 * گزارشِ ۱ سپتامبر: «ساختِ اسلایدِ بنر نشد (403)» — و ناظر هم نتوانست
 * تصمیم بگیرد، فقط گذاشتش برای نشستِ بعد. ولی ۴۰۳ دو علتِ کاملاً متفاوت
 * دارد با دو چارهٔ کاملاً متفاوت:
 *   • SERVICE_DISABLED → سرویس در پروژهٔ ابری روشن نیست (یک کلیک در کنسول)
 *   • ACCESS_TOKEN_SCOPE_INSUFFICIENT → توکنِ اسکریپت اسکوپِ Slides ندارد؛
 *     نصبِ خودکار `appsscript.json` را دست نمی‌زند، پس این را **کد درست
 *     نمی‌کند** و باید یک بار با دست اجازه داده شود.
 * عددِ بی‌تشخیص، اقدام‌پذیر نیست — همان درسی که امروز دو بار دیگر هم گرفتیم. */
function ytApiOff_(text) {
  var t = String(text || '');
  if (/ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes|insufficientPermissions/i
      .test(t)) {
    return { off: true, scope: true, url: '', project: '', api: 'Google Slides',
             fix: 'اسکوپِ Slides در پروژهٔ اسکریپت نیست. منوی «عیب‌یابی و رفعِ ' +
                  'دسترسیِ یوتیوب» را یک بار اجرا کنید و اجازه بدهید؛ نصبِ ' +
                  'خودکارِ کد اسکوپ‌ها را عوض نمی‌کند.' };
  }
  if (!/has not been used in project|SERVICE_DISABLED|it is disabled/i.test(t)) {
    return { off: false };
  }
  var url = '', proj = '', api = '';
  var mu = t.match(/https:\/\/console\.[a-z.]*google\.com\/[^\s"',]+/);
  if (mu) url = mu[0];
  var mp = t.match(/project[= ]([0-9]{6,})/);
  if (mp) proj = mp[1];
  var ma = t.match(/([A-Za-z0-9 .]+API[ a-z0-9]*) has not been used/);
  if (ma) api = ma[1].trim();
  return { off: true, url: url, project: proj, api: api };
}

function ytDiagnose_() {
  var d = { scopeOk: false, apiOk: false, channelOk: false, code: 0,
            raw: '', cause: '', fix: '', scopes: [], channelId: '', channelTitle: '' };
  var tok = '';
  try { tok = ScriptApp.getOAuthToken(); }
  catch (e) { d.cause = 'توکنِ دسترسی گرفته نشد: ' + e.message; return d; }

  // ── ۱) توکن واقعاً چه اسکوپ‌هایی دارد؟ ──
  var scopes = '';
  try {
    var ti = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' +
                               encodeURIComponent(tok), { muteHttpExceptions: true });
    if (ti.getResponseCode() === 200) {
      scopes = String((JSON.parse(ti.getContentText()) || {}).scope || '');
    }
  } catch (e2) {}
  d.scopes = scopes.split(/\s+/).filter(function (x) { return !!x; });
  /* «کدام‌یک نیست» را باید نام برد، نه یک بله/خیر. اسکوپِ Slides اگر تنها
     چیزِ غایب باشد، یوتیوب کار می‌کند ولی هر ویدئو بی‌کاور می‌رود — و آن
     دو حالت باید از هم جدا دیده شوند. */
  d.missing = [];
  for (var i = 0; i < YT_API_SCOPES.length; i++) {
    if (scopes.indexOf(YT_API_SCOPES[i]) === -1) d.missing.push(YT_API_SCOPES[i]);
  }
  d.scopeOk = d.missing.length === 0;
  d.slidesOk = scopes.indexOf(YT_SLIDES_SCOPE) !== -1;
  if (!d.slidesOk) d.missing.push(YT_SLIDES_SCOPE);

  // ── ۲) خودِ فراخوان، خام — تا پیامِ گوگل دست‌نخورده دیده شود ──
  var r = ytHttp_('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', 'get');
  d.code = r.code;
  d.raw = String(r.text || '').replace(/\s+/g, ' ').slice(0, 400);
  var msg = '';
  try { msg = String((((r.json || {}).error || {}).message) || ''); } catch (e3) {}

  if (r.code === 200) {
    d.apiOk = true;
    var items = (r.json && r.json.items) || [];
    if (items.length) {
      d.channelOk = true;
      d.channelId = String(items[0].id || '');
      d.channelTitle = String(((items[0].snippet) || {}).title || '');
      if (!d.slidesOk) {
        // یوتیوب کار می‌کند، ولی هیچ کاوری ساخته نمی‌شود. سکوت این‌جا یعنی
        // هر شب یک ویدئوی بی‌کاور و یک خطای بی‌ربط‌به‌نظر‌رسیده.
        d.cause = 'یوتیوب درست است، ولی اسکوپِ Slides نیست — پس کاورِ قسمت، ' +
                  'کاورِ پلی‌لیست و بنرِ کانال هیچ‌کدام ساخته نمی‌شوند';
        d.fix = 'اسکوپِ ' + YT_SLIDES_SCOPE + ' را هم اضافه کنید ' +
                '(از همین منو، یا دستی در appsscript.json) و یک بار دیگر ' +
                'اجازه‌ها را تأیید کنید.';
      }
    } else {
      d.cause = 'این حسابِ گوگل کانالِ یوتیوبی ندارد که موتور ببیند';
      d.fix = 'اگر کانال زیرِ یک «حسابِ برند» (Brand Account) است، اسکریپت باید با ' +
              'همان حساب اجازه بگیرد. در studio.youtube.com بالا سمتِ راست حساب را ' +
              'عوض کنید و ببینید کانال زیرِ کدام حساب است.';
    }
    return d;
  }

  if (!d.scopeOk) {
    d.cause = 'اسکوپِ یوتیوب در اجازه‌های اسکریپت نیست';
    d.fix = 'افزودنِ سرویسِ YouTube در ویرایشگر به‌تنهایی کافی نیست: چون ' +
            'appsscript.json این پروژه فهرستِ صریحِ oauthScopes دارد، اسکوپ‌ها ' +
            'خودکار استنتاج نمی‌شوند. از همین منو «افزودنِ اجازهٔ یوتیوب» را بزنید ' +
            'و بعد یک بار اجازه‌ها را تأیید کنید.';
    return d;
  }
  var off = ytApiOff_(msg + ' ' + d.raw);
  if (off.off) {
    d.cause = (off.api || 'YouTube Data API') + ' در پروژهٔ ابریِ این اسکریپت روشن نیست';
    d.enableUrl = off.url;
    d.project = off.project;
    d.fix = 'در پروژهٔ Google Cloud' + (off.project ? ' شمارهٔ ' + off.project : '') +
            ' که به این اسکریپت وصل است، ' + (off.api || 'YouTube Data API v3') +
            ' را Enable کنید' + (off.url ? ':\n' + off.url : '.') +
            '\nبعد از Enable، گوگل خودش می‌گوید چند دقیقه طول می‌کشد تا اثر ' +
            'کند — پس اگر بلافاصله دوباره زدید و همین را گفت، دو-سه دقیقه صبر ' +
            'کنید و باز بزنید.';
    return d;
  }
  if (r.code === 403 && /quota|rateLimit/i.test(msg)) {
    d.cause = 'سهمیهٔ یوتیوب تمام شده';
    d.fix = 'فردا خودش ادامه می‌دهد؛ کاری لازم نیست.';
    return d;
  }
  d.cause = 'فراخوانِ یوتیوب کدِ ' + r.code + ' داد' + (msg ? ': ' + msg : '');
  d.fix = 'پاسخِ خامِ گوگل پایین آمده — معمولاً خودش می‌گوید چه کم است.';
  return d;
}

/**
 * افزودنِ اسکوپ‌های یوتیوب به appsscript.json — همان کارِ دستیِ خسته‌کننده،
 * ولی از داخلِ منو.
 *
 * موتور نمی‌تواند به خودش اجازه بدهد (اجازه را فقط آدم می‌دهد)، ولی می‌تواند
 * فهرست را طوری بنویسد که تأییدِ بعدی شاملشان شود. بی این، کاربر باید JSON
 * را دستی ویرایش کند — و همان جایی است که کار می‌خوابد.
 */
function ytAddScopes_() {
  var cur = scriptApiFetch_('get');
  if (cur.code !== 200 || !cur.json || !cur.json.files) {
    return { ok: false, why: 'کدِ پروژه خوانده نشد (HTTP ' + cur.code + ')' };
  }
  var files = cur.json.files, mi = -1;
  for (var i = 0; i < files.length; i++) {
    if (String(files[i].name) === 'appsscript' && String(files[i].type) === 'JSON') mi = i;
  }
  if (mi === -1) return { ok: false, why: 'appsscript.json در پروژه پیدا نشد' };
  var man = null;
  try { man = JSON.parse(files[mi].source); }
  catch (e) { return { ok: false, why: 'appsscript.json خوانده نشد: ' + e.message }; }

  var had = man.oauthScopes || [];
  if (!had.length) {
    // بی فهرستِ صریح، Apps Script خودش استنتاج می‌کند و دست‌بردن لازم نیست
    return { ok: false, why: 'این پروژه فهرستِ صریحِ oauthScopes ندارد؛ ' +
                             'پس علت چیزِ دیگری است — عیب‌یابی را ببینید.' };
  }
  var add = [];
  for (var s = 0; s < YT_SCOPES.length; s++) {
    if (had.indexOf(YT_SCOPES[s]) === -1) add.push(YT_SCOPES[s]);
  }
  if (!add.length) {
    return { ok: false, why: 'اسکوپ‌های یوتیوب از قبل در appsscript.json هستند — ' +
                             'پس فقط تأییدِ دوبارهٔ اجازه‌ها مانده.', already: true };
  }
  man.oauthScopes = had.concat(add);

  /* ══ فقط سه فیلد برگردانده می‌شود، نه آرایهٔ خامِ گوگل ══
   * پاسخِ `projects.getContent` فیلدهای فقط‌خواندنی هم دارد (createTime،
   * updateTime، lastModifyUser، functionSet). پس‌فرستادنشان به
   * `updateContent` یعنی ۴۰۰. `installSource_` — تنها مسیرِ اثبات‌شدهٔ
   * نوشتن در این پروژه — از اول همین کار را می‌کرد؛ این تابع کپی‌اش نکرده
   * بود و همان‌جا می‌شکست.
   *
   * و **همهٔ** فایل‌ها برگردانده می‌شوند، نه فقط appsscript: این فراخوان
   * کلِ محتوای پروژه را جایگزین می‌کند. یک فایلِ جامانده یعنی یک فایلِ
   * پاک‌شده. */
  var keep = [];
  for (var f = 0; f < files.length; f++) {
    keep.push({ name: String(files[f].name),
                type: String(files[f].type),
                source: f === mi ? JSON.stringify(man, null, 2) : String(files[f].source || '') });
  }
  if (keep.length !== files.length) {
    return { ok: false, why: 'فهرستِ فایل‌ها ناقص شد؛ چیزی نوشته نشد' };
  }
  var put = scriptApiFetch_('put', { files: keep });
  if (put.code !== 200) {
    var why = '';
    try { why = String((((put.json || {}).error || {}).message) || ''); } catch (eW) {}
    return { ok: false,
             why: 'ذخیرهٔ appsscript.json نشد (HTTP ' + put.code + ')' +
                  (why ? ': ' + why.slice(0, 160) : '') };
  }
  logLine_('اسکوپ‌های یوتیوب به appsscript.json افزوده شد: ' + add.join('، '));
  return { ok: true, added: add };
}

/** منو: عیب‌یابی، و اگر علتش اسکوپ بود، همان‌جا درستش کن. */
function runYouTubeFix() {
  var ui = ui_();
  var d = ytDiagnose_();
  var L = ['عیب‌یابیِ یوتیوب:', ''];
  L.push('سرویسِ یوتیوب در پروژه: ' + (ytSvc_() ? 'فعال ✅' : 'فعال نیست ❌'));
  L.push('اسکوپِ یوتیوب در توکن: ' + (d.scopeOk ? 'هست ✅' : 'نیست ❌'));
  L.push('اسکوپِ Slides (برای کاور): ' + (d.slidesOk ? 'هست ✅' : 'نیست ❌'));
  L.push('پاسخِ خودِ یوتیوب: HTTP ' + d.code + (d.apiOk ? ' ✅' : ' ❌'));
  if (d.channelOk) L.push('کانال: «' + d.channelTitle + '» ✅');
  if ((d.missing || []).length) {
    L.push('');
    L.push('اسکوپ‌هایی که نیستند:');
    for (var mi = 0; mi < d.missing.length; mi++) L.push('   • ' + d.missing[mi]);
  }
  L.push('');
  if (d.channelOk && d.slidesOk) {
    L.push('همه‌چیز درست است. «شناسنامهٔ کانال» را بزنید.');
  } else {
    L.push('علت: ' + (d.cause || 'نامعلوم'));
    if (d.fix) { L.push(''); L.push('چاره: ' + d.fix); }
    if (d.enableUrl) {
      L.push('');
      L.push('══ نشانیِ صفحه (کپی کنید) ══');
      L.push(d.enableUrl);
      L.push('══════════════════════════');
    }
    if (d.raw) { L.push(''); L.push('پاسخِ خامِ گوگل:'); L.push(d.raw); }
  }

  if ((!d.channelOk || !d.slidesOk) && (d.missing || []).length && ui) {
    var ans = ui.alert('عیب‌یابیِ یوتیوب',
      L.join('\n') + '\n\n──────\nهمین حالا اسکوپ‌های یوتیوب به appsscript.json ' +
      'اضافه شوند؟ (کدِ موتور دست نمی‌خورد؛ فقط فهرستِ اجازه‌ها.)',
      ui.ButtonSet.YES_NO);
    if (ans === ui.Button.YES) {
      var r = ytAddScopes_();
      ui.alert('افزودنِ اجازهٔ یوتیوب',
        (r.ok ? '✅ افزوده شد: ' + r.added.join('، ') : '❌ ' + r.why) +
        '\n\nحالا یک بار دیگر همین گزینه را بزنید؛ پنجرهٔ تأییدِ اجازه‌ها ' +
        'می‌آید و بعدش کار می‌کند.\n\n' +
        'اگر پنجره نیامد: در myaccount.google.com/permissions دسترسیِ این ' +
        'اسکریپت را پس بگیرید و دوباره یکی از گزینه‌های منو را بزنید.',
        ui.ButtonSet.OK);
      return r;
    }
    return d;
  }
  var m = L.join('\n');
  if (ui) ui.alert('عیب‌یابیِ یوتیوب', m, ui.ButtonSet.OK); else console.log(m);
  return d;
}
