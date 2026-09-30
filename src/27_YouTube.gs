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
    visuals: { type: 'array', items: { type: 'object', properties: {
      at: { type: 'string' },          // شمارهٔ بخش، از ۱
      kind: { type: 'string' },        // کارت | نمودار | عکس | ویدئو
      cardTitle: { type: 'string' },   // متنِ درشتِ روی کارت
      cardLines: { type: 'array', items: { type: 'string' } },
      terms: { type: 'string' },       // واژه‌های جست‌وجو، انگلیسی
      caption: { type: 'string' }      // زیرنویسِ جزوه، فارسی
    } } }
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
    var want = ytVisWant_(ctx.totalSec);
    L.push('');
    L.push('و یک کارِ دومِ جدا: **برای هر بخش بگو چه تصویری کنارش بنشیند.** ' +
           'این ویدئو در یوتیوب به‌جای یک کاورِ ثابت، رشته‌ای از تصویر خواهد ' +
           'داشت که باید **دقیقاً به همان چیزی بخورد که در آن لحظه گفته ' +
           'می‌شود** — نه تصویرِ تزئینیِ بی‌ربط.');
    L.push('حدودِ ' + faDigitsOut_(String(want)) + ' مورد بنویس در فیلدِ ' +
           '`visuals`، به ترتیبِ بخش‌ها. بخشِ بلند می‌تواند دو مورد بگیرد، ' +
           'بخشِ کوتاه یکی.');
    L.push('برای هر مورد:');
    L.push('• at — شمارهٔ بخش (از ۱، به رقمِ لاتین). فقط بخش‌هایی که در ' +
           'فهرستِ بالا آمده‌اند.');
    L.push('• kind — یکی از این چهار، و ترتیبشان ترتیبِ ترجیح است:');
    L.push('   «کارت» — متن روی یک کارتِ تمیز. **پیش‌فرض و مطمئن‌ترین**: ' +
           'همیشه در دسترس است و هیچ هزینه‌ای ندارد. برای گزاره، تعریف، ' +
           'نقلِ‌قول، فهرستِ نکته‌ها، عدد و مقایسه.');
    L.push('   «نمودار» — جایی که رابطه یا روند مهم‌تر از واژه است.');
    L.push('   «عکس» — فقط برای چیزی که **واقعاً وجود دارد** و دیدنش چیزی ' +
           'اضافه می‌کند: یک شخصِ معیّن، یک جا، یک شیء، یک سند. برای مفهومِ ' +
           'انتزاعی عکس نخواه — «کارت» بهتر جواب می‌دهد.');
    L.push('   «ویدئو» — فقط وقتی **حرکت** خودش بخشی از مطلب است. ' +
           'کلیپِ آزادِ مناسب کم پیدا می‌شود، پس کم بخواه.');
    L.push('• cardTitle — متنِ درشتِ روی کارت. حداکثر ' +
           faDigitsOut_(String(CFG.LV_CARD_TITLE_MAX || 48)) + ' نویسه، ' +
           'ترجیحاً کمتر. همان انضباطِ coverTitle: در یک نگاه خوانده شود.');
    L.push('• cardLines — صفر تا ' +
           faDigitsOut_(String(CFG.LV_CARD_LINES_MAX || 4)) + ' سطرِ کوتاه ' +
           'زیرِ آن. هر سطر یک چیز.');
    L.push('• terms — دو تا پنج واژهٔ جست‌وجو **به انگلیسی**. علتش سنجیده ' +
           'است، نه سلیقه: منبع‌های تصویرِ آزاد انگلیسی‌نمایه‌اند و پرسشِ ' +
           'فارسی از آن‌ها چیزی برنمی‌گرداند. برای «کارت» و «نمودار» خالی ' +
           'بگذار.');
    L.push('• caption — یک جملهٔ کوتاهِ فارسی که زیرِ همین تصویر در **جزوه** ' +
           'می‌نشیند. حداکثر ' + faDigitsOut_(String(CFG.LV_CAPTION_MAX || 120)) +
           ' نویسه.');
    L.push('و یک مرز: تصویری نخواه برای چیزی که خودِ قسمت نگفته است. ' +
           'تصویرِ بی‌ربط از نبودنِ تصویر بدتر است.');
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
    var r = geminiText_(ytMetaPrompt_(ctx), YT_META_SCHEMA, 4096);
    if (r && r.title) return r;
  } catch (e) { logLine_('متنِ یوتیوب از مدل نیامد: ' + e.message); }
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
function ytSlideExport_(presId, pageId, name) {
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
  return 'کاور — ' + String(c.epLabel || '') + ' — ' + String(c.showName || '') +
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
    var pal = ytPalette_(c.cat || c.seriesName || c.showName);
    var name = ytCoverName_(c).replace(/\.png$/, '');
    /* ۱۲۸۰×۷۲۰ در ۹۶ نقطه بر اینچ = ۱۳٫۳۳×۷٫۵ اینچ. یوتیوب همین را توصیه
       می‌کند و کارتِ ۹۶۰×۵۴۰ باید بالا کشیده شود — یعنی متنِ نرم.
       ولی **کاورِ پادکست ۱:۱ می‌خواهد، نه ۱۶:۹** (۱۲۸۰×۱۲۸۰). یوتیوب برای
       پلی‌لیستی که پادکست شده صریح همین را می‌گوید، و ۱۶:۹ آن‌جا بریده
       می‌شود. چون چیدمانِ کارت نسبی است (همه‌چیز کسری از W و H)، همان کد با
       صفحهٔ مربع هم درست درمی‌آید. */
    var mkP = c.square ? ytPresCreate_(name, 12192000, 12192000)
                       : ytPresCreate_(name, 12192000, 6858000);
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

    // نوارِ رنگی پایین — لنگرِ بصری، تا کارت خالی به‌نظر نیاید
    var bar = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 0, H - H * 0.055, W, H * 0.055);
    bar.getFill().setSolidFill(pal.ac);
    bar.getBorder().setTransparent();

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

/** یک درخواستِ تازه، بی تکرار. سقف دارد تا صف بی‌نهایت نشود. */
function ytRenderAsk_(item) {
  var d = ytRenderRead_();
  var key = String(item.show) + ':' + String(item.ep);
  for (var i = 0; i < d.items.length; i++) {
    if (String(d.items[i].key) === key) return false;      // قبلاً خواسته شده
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
  var pend = d.items.filter(function (x) {
    if (String(x.status || '') !== 'در انتظار') return false;
    // ساخته شده و فقط منتظرِ برداشت است — این دیگر «درخواستِ بی‌جواب» نیست.
    if (map && map[String(x.key)] && map[String(x.key)].url) return false;
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
  /* اجازه همراهِ درخواست داده می‌شود، نه پیش از آن و نه جدا از آن: هر فایلی
     که این‌جا باز می‌شود در `ytShareSweep_` نامش هست و پس گرفته می‌شود. */
  row.shared = ytRenderShare_(row, true) > 0;
  row.sharedAt = nowStr_();
  d.items.push(row);
  var okSave = ytRenderSave_(d);
  if (okSave) ytQueueShare_();
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
  return hit ? ytRenderSave_(d) : false;
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
    var rec = map[pend[i].key];
    if (!rec || !rec.url) continue;
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
    gen: 'هندسهٔ آرام و مینیمال، سرمه‌ای و فیروزه‌ای، سایه‌های نرم، فضای خالیِ زیاد' },
  { key: 'خطیِ مینیمال', pal: { bg: '#FFFFFF', fg: '#17202E', ac: '#2E6FB8' },
    frame: 'hairline', hint: 'علمی و فنی، جایی که نمودار حرفِ اصلی است',
    gen: 'خطوطِ نازکِ فنی روی زمینهٔ روشن، تک‌رنگِ آبی، مثلِ نقشهٔ مهندسی، بی سایه' },
  { key: 'تخته‌سفید', pal: { bg: '#F7F7F2', fg: '#1F2937', ac: '#059669' },
    frame: 'dashed',   hint: 'ریاضی، فرایند، آموزشِ گام‌به‌گام',
    gen: 'طرحِ دست‌کشیده با ماژیک روی تختهٔ سفید، خطوطِ ساده، زمینهٔ کاغذی' },
  { key: 'نقشِ ایرانی', pal: { bg: '#0B3B3C', fg: '#FDF6E3', ac: '#D4A017' },
    frame: 'motif',    hint: 'تاریخِ اسلام، عرفان، ادبیاتِ کهن',
    gen: 'نقشِ هندسیِ اسلامی و تذهیب، فیروزه‌ای و لاجوردی و طلایی، قرینه، بی چهره' },
  { key: 'آبرنگِ گرم', pal: { bg: '#FFF7ED', fg: '#431407', ac: '#EA580C' },
    frame: 'wash',     hint: 'روایی، اخلاق، زندگی‌نامه',
    gen: 'آبرنگِ گرم و پخش‌شده، نارنجی و خاکی، لبه‌های نرم، بافتِ کاغذ' },
  { key: 'چاپِ قدیمی', pal: { bg: '#F3EAD3', fg: '#2B2116', ac: '#8C5A2B' },
    frame: 'rules',    hint: 'تاریخ، ادبیات، اسناد',
    gen: 'حکاکیِ چاپِ سنگیِ قدیمی، قهوه‌ای و کرم، بافتِ کاغذِ کهنه، خط‌خطیِ ریز' },
  { key: 'کاغذبری', pal: { bg: '#1E1B4B', fg: '#EEF2FF', ac: '#A78BFA' },
    frame: 'layers',   hint: 'مفاهیمِ لایه‌لایه و ساختارها',
    gen: 'کاغذبریِ لایه‌لایه، بنفش و نیلی، سایه‌های تیزِ بین لایه‌ها، بی بافت' },
  /* «عکسِ واقعی» امروز **لایه‌اش نیامده** (سنجشِ گامِ صفر: تصویرِ آزاد شدنی
     است، ولی آوردنش کارِ گامِ بعدی است). پس کارت‌ها ساده ساخته می‌شوند و
     این را خطِ روزانه **با اسم می‌گوید** — وگرنه صاحبِ برنامه سبکی انتخاب
     کرده که بی‌صدا کار نمی‌کند، و آن بدترین حالت است (۷٫۴۵). */
  { key: 'عکسِ واقعی', pal: { bg: '#111827', fg: '#F9FAFB', ac: '#9CA3AF' },
    frame: 'bar', photo: true, hint: 'علومِ تجربی، جغرافیا، رویدادها',
    gen: 'عکسِ فضاییِ واقع‌نما، نورِ طبیعی، عمقِ میدانِ کم، خنثی و بی‌شخص' },
  { key: 'ترکیبی', pal: { bg: '#0F172A', fg: '#FDF6E3', ac: '#D4A017' },
    frame: 'motif', mix: true, hint: 'کارتِ تمیز + نقشِ مجموعه — حالتِ پیشنهادی برای ترکیب',
    gen: 'نقشِ هندسیِ کم‌رنگ روی زمینهٔ سرمه‌ای، طلاییِ ملایم، بسیار آرام' }
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
      if (raw.indexOf('+') !== -1) {
        out.bad = 'دو سبک با «+» («' + raw + '») — دو سبکِ هنری در یک ویدئو ' +
                  'ناهم‌خوان می‌شود. برای ترکیب، «ترکیبی» را بنویسید.';
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
 * خانه‌های **خالی** را با پیشنهاد پر می‌کند و خانه‌های ناخوانا را نام می‌برد.
 *
 * دو مرز: خانهٔ دست‌نویس هرگز بازنویسی نمی‌شود، و نوشتن فقط وقتی انجام
 * می‌شود که چیزی عوض شده باشد — یک مهاجرتِ آرایشی نباید ۲۶۴ ردیف را هر شب
 * دوباره مهر کند (۵٫۹۵).
 */
function lvStyleAudit_(hub) {
  var out = { filled: 0, bad: [], photo: [], read: 0, why: '' };
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
      if (!raw && reg.sheet) {
        try { reg.sheet.getRange(rec.row, SC.LVSTYLE).setValue(st.key); out.filled++; }
        catch (eW) {}
      }
    }
  } catch (e) { out.why = e.message; }
  return out;
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

function lvGenOn_() {
  return CFG.LV_GEN_ENABLED === true && CFG.LV_ENABLED !== false;
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
  try {
    var c = JSON.parse(props_().getProperty(PK.LV_GEN_MODEL) || 'null');
    if (c && c.id && (new Date().getTime() - (c.at || 0)) / 86400000 <
        (Number(CFG.MODEL_REFRESH_DAYS) || 7)) {
      return { id: String(c.id), why: 'از حافظه' };
    }
  } catch (e) {}
  var found = '', all = [];
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
    all.sort(function (a, b) { return lvGenPrice_(a) - lvGenPrice_(b); });
    found = all[0] || '';
  } catch (e2) { return { id: '', why: 'فهرستِ مدل‌ها خوانده نشد: ' + e2.message }; }
  if (!found) return { id: '', why: 'هیچ مدلِ تصویری با generateContent در دسترس نیست' };
  try {
    props_().setProperty(PK.LV_GEN_MODEL,
      JSON.stringify({ id: found, at: new Date().getTime() }));
  } catch (e3) {}
  return { id: found, why: 'ارزان‌ترینِ ' + all.length + ' مدلِ موجود' };
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
    }
  } catch (e) {}
  return d;
}

function lvGenSpendAdd_(usd) {
  var d = lvGenSpend_();
  d.n++;
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
function lvGenPrompt_(v, style) {
  var subj = String((v && (v.cardTitle || v.heading)) || '').trim();
  var look = (style && style.gen) ? String(style.gen) : 'تصویرسازیِ آرام و رسمی';
  return 'یک تصویرسازیِ **بی‌واژه** و انتزاعی برای پس‌زمینهٔ یک اسلایدِ ' +
    'آموزشی بساز. نسبتِ ۱۶:۹.\n' +
    'حال‌وهوا: ' + look + '.\n' +
    (subj ? 'موضوعِ درس (فقط برای حال‌وهوا، نه برای نشان‌دادنِ عین آن): ' +
            subj + '\n' : '') +
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
function lvGenOne_(model, prompt) {
  var out = { blob: null, why: '', usd: 0 };
  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              model + ':generateContent?key=' + encodeURIComponent(apiKey_());
    var payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    var j = geminiFetch_(url, payload);
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
function lvBgName_(i, v) {
  return 'پس‌زمینه ' + faDigitsOut_(String(Number(i) + 1)) +
         ' — بخش ' + faDigitsOut_(String((v && v.at) || 0)) + '.png';
}

/**
 * پس‌زمینه‌های لازمِ این دسته را می‌سازد یا از پوشه برمی‌دارد.
 * @return {{map:Object, made:number, spent:number, why:string, model:string}}
 */
function lvGenFill_(todo, imgFolder, style) {
  var out = { map: Object.create(null), made: 0, spent: 0, why: '', model: '' };
  if (!lvGenOn_() || !todo || !todo.length) return out;

  // آنچه از قبل ساخته شده — پولِ رفته دوباره خرج نمی‌شود
  var need = [];
  for (var i = 0; i < todo.length; i++) {
    var nm = lvBgName_(todo[i].i, todo[i].v);
    var got = null;
    try {
      var it = imgFolder.getFilesByName(nm);
      if (it.hasNext()) got = it.next();
    } catch (eH) {}
    if (got) { out.map[String(todo[i].i)] = got.getBlob(); continue; }
    if (todo[i].i < Math.max(0, Number(CFG.LV_GEN_PER_EP) || 4)) need.push(todo[i]);
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
  var cap = Math.min(need.length, room, Math.max(1, Number(CFG.LV_GEN_PER_RUN) || 6));

  for (var k = 0; k < cap; k++) {
    var r = lvGenOne_(mk.id, lvGenPrompt_(need[k].v, style));
    out.spent += r.usd;
    if (!r.blob) { if (!out.why) out.why = r.why; continue; }
    var nm2 = lvBgName_(need[k].i, need[k].v);
    try {
      var old = imgFolder.getFilesByName(nm2);
      while (old.hasNext()) old.next().setTrashed(true);
      var f = imgFolder.createFile(r.blob.setName(nm2));
      out.map[String(need[k].i)] = f.getBlob();
      out.made++;
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
function lvGenStatus_() {
  var out = { on: false, model: '', usd: 0, n: 0, cap: 0, price: 0, room: 0, line: '' };
  try {
    out.on = lvGenOn_();
    out.cap = Number(CFG.LV_GEN_USD_MONTH) || 0;
    var sp = lvGenSpend_();
    out.usd = sp.usd; out.n = sp.n;
    try {
      var c = JSON.parse(props_().getProperty(PK.LV_GEN_MODEL) || 'null');
      out.model = String(CFG.LV_GEN_MODEL || (c && c.id) || '');
    } catch (eC) { out.model = String(CFG.LV_GEN_MODEL || ''); }
    out.price = lvGenPrice_(out.model);
    out.room = out.on ? lvGenRoom_(out.model) : 0;
    if (!out.on) {
      out.line = 'تصویرِ ساخته‌شده با مدل: **خاموش** — تصمیمِ خودتان است. ' +
                 'با سقفِ ' + faDigitsOut_(String(out.cap)) + ' دلار در ماه، ' +
                 '`LV_GEN_ENABLED` را true کنید.';
    } else {
      out.line = 'تصویرِ ساخته‌شده: روشن' +
        (out.model ? ' با ' + out.model : ' (مدل هنوز پیدا نشده)') +
        ' · این ماه ' + faDigitsOut_(String(out.n)) + ' تصویر، ~' +
        out.usd.toFixed(2) + ' از ' + faDigitsOut_(String(out.cap)) + ' دلار' +
        ' · جای ' + faDigitsOut_(String(out.room)) + ' تصویرِ دیگر' +
        ' (قیمتِ فرض‌شده هر تصویر ' + out.price.toFixed(3) + ' دلار — اگر غلط ' +
        'است `LV_GEN_PRICES` را عوض کنید).';
    }
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

  // سرِ بخش، بالا — تا تصویر بدونِ صوت هم بگوید کجای درس است
  if (v && v.heading) put(ytVisCut_(v.heading, 60), H * 0.085, H * 0.085, 16, pal.ac, true);

  var ttl = String((v && v.cardTitle) || (v && v.heading) || '');
  var fs = ttl.length > 34 ? 30 : (ttl.length > 20 ? 36 : 44);
  put(ttl, H * 0.17, H * 0.22, fs, pal.fg, true);

  var lines = (v && v.cardLines) || [];
  if (kind === 'نمودار' && lines.length) {
    lvFlowDraw_(slide, W, H, pal, lines);
  } else if (lines.length) {
    var body = [];
    for (var L = 0; L < lines.length; L++) body.push('•  ' + String(lines[L] || ''));
    put(body.join('\n'), H * 0.42, H * 0.34, lines.length > 3 ? 18 : 21, pal.fg, false);
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
  var sty = lvStyleFind_(out.style) || lvStyleDefault_();
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

  var have = Object.create(null);
  for (var i = 0; i < want.length; i++) {
    if (out.restyled) break;                   // همه از نو
    try {
      var it = imgFolder.getFilesByName(lvImgName_(i, want[i]));
      if (it.hasNext()) have[String(i)] = it.next().getId();
    } catch (eH) {}
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

  if (todo.length) {
    d.tries = out.tries + 1;
    out.tries = d.tries;
    lvWrite_(epFolder, d);                       // مرزِ ۱: پیش از کار
    /* پس‌زمینه‌ها **پیش از** کارت‌ها، چون کارت رویشان کشیده می‌شود. و شکستش
       هرگز کارت را زمین نمی‌زند: نقشهٔ خالی یعنی کارتِ ساده — رفتارِ ۷.۹۶. */
    var bgm = { map: {}, made: 0, spent: 0, why: '', model: '' };
    try { bgm = lvGenFill_(todo, imgFolder, sty); }
    catch (eG) { bgm.why = 'پس‌زمینه ساخته نشد: ' + eG.message; logLine_(bgm.why); }
    out.gMade = bgm.made; out.gSpent = bgm.spent; out.gModel = bgm.model;
    if (bgm.why && !out.why) out.why = bgm.why;
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

  d.items = out.items; d.want = out.want; d.ready = out.ready; d.done = out.done;
  d.folderId = imgFolder.getId();
  /* سبک **فقط وقتی** ذخیره می‌شود که واقعاً پرسیده شده باشد: نوشتنِ رشتهٔ
     خالی روی سبکِ ذخیره‌شده یعنی شبِ بعد «عوض شد» تشخیص داده شود. */
  if (out.style) d.style = out.style;
  if (out.recipe) d.recipe = out.recipe;
  d.gen = out.gen === true;
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
 * حالِ تصویرهای درس — **بی هیچ فراخوانِ درایو یا شیت.** هر دو حافظه در
 * Properties اند، پس این تابع روی داغ‌ترین مسیرِ موتور (`writeStatus_`) هم
 * ارزان است. ۷٫۶۳/۷٫۷۲ همین را دو بار به این مخزن آموختند.
 */
function lvStatus_() {
  var out = { on: false, shows: [], waiting: 0, oldestDays: 0, waitKeys: [],
              short: 0, shortKeys: [], line: '', ok: true };
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
    /* `ok` فقط با بدهیِ **کهنه** نادرست می‌شود. یک شبِ منتظر، خرابی نیست —
       و هشداری که برای حالتِ سالم بزند، هشداری است که یاد می‌گیرند نخوانند
       (۷٫۴۰). ردیف‌های «کم‌رفته» `ok` را پایین نمی‌آورند: کارِ گذشته است و
       دیگر درست نمی‌شود؛ شمرده می‌شود و در خط می‌آید. */
    var need = Math.max(1, Number(CFG.LV_STUCK_DAYS) || 3);
    out.ok = !(out.waiting && out.oldestDays >= need);
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

var LV_HEADERS = ['تاریخ', 'نمایش', 'قسمت', 'مجموعه', 'سبک', 'خواسته', 'ساخته‌شده',
                  'این اجرا', 'تلاش', 'نتیجه', 'علت', 'پوشهٔ تصویرها'];

function lvLog_(hub, row) {
  try {
    var sh = ensureTab_(hub || getHub_(), CFG.LV_TAB || 'کاربردِ تصویرها', LV_HEADERS);
    appendBlock_(sh, [[nowStr_(), String(row.show || ''), String(row.ep || ''),
                       String(row.series || ''), String(row.style || ''),
                       String(row.want || 0), String(row.ready || 0),
                       String(row.made || 0), String(row.tries || 0),
                       String(row.result || ''), String(row.why || ''),
                       String(row.url || '')]], LV_HEADERS.length);
    return true;
  } catch (e) { logLine_('ثبتِ کاربردِ تصویرها نوشته نشد: ' + e.message); return false; }
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
                 url: String(vals[i][11]) });
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
      var m = String(hist[i].why || '').match(/عکس\/ویدئو:\s*(\d+)/);
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
      var m = String(hist[i].why || '').match(re);
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
  var mins = Math.max(1, (Number(totalSec) || 0) / 60);
  var n = Math.round(mins * (Number(CFG.LV_PER_MIN) || 0.8));
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
function ytVisPlan_(mm, ctx) {
  if (!ytVisOn_(ctx && ctx.show)) return [];
  var secs = (ctx && ctx.sections) || [];
  var raw = (mm && mm.visuals) || [];
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

  // اول گروه‌بندی بر اساسِ بخش، تا سهمِ هر بخش بینِ موردهایش تقسیم شود
  var bySec = Object.create(null), order = [];
  for (var r = 0; r < raw.length; r++) {
    var it = raw[r] || {};
    var at = parseInt(faDigits_(String(it.at == null ? '' : it.at)), 10);
    if (isNaN(at) || at < 1 || at > secs.length) continue;   // بخشِ ناشناخته، رد
    var k = String(at);
    if (!bySec[k]) { bySec[k] = []; order.push(at); }
    if (bySec[k].length >= 3) continue;                      // سه مورد در یک بخش، کافی
    var lines = [];
    var src = Array.isArray(it.cardLines) ? it.cardLines : [];
    for (var L = 0; L < src.length && lines.length < (Number(CFG.LV_CARD_LINES_MAX) || 4); L++) {
      var ln = ytVisCut_(src[L], CFG.LV_CARD_LINE_MAX || 72);
      if (ln) lines.push(ln);
    }
    bySec[k].push({
      at: at,
      kind: ytVisKind_(it.kind),
      cardTitle: ytVisCut_(it.cardTitle, CFG.LV_CARD_TITLE_MAX || 48),
      cardLines: lines,
      terms: ytVisCut_(it.terms, CFG.LV_TERMS_MAX || 80),
      caption: ytVisCut_(it.caption, CFG.LV_CAPTION_MAX || 120)
    });
  }
  order.sort(function (a, b) { return a - b; });

  var out = [];
  for (var o = 0; o < order.length && out.length < cap; o++) {
    var grp = bySec[String(order[o])];
    var share = (chars[order[o] - 1] / sum) * body;          // سهمِ این بخش
    var each = share / grp.length;
    for (var g = 0; g < grp.length && out.length < cap; g++) {
      grp[g].sec = Math.round(each * 10) / 10;
      grp[g].heading = String((secs[order[o] - 1] || {}).heading || '');
      out.push(grp[g]);
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
      try { return ytVisPlan_(mm, ctx); } catch (eV) {
        logLine_('برنامهٔ تصویرها ساخته نشد: ' + eV.message); return [];
      }
    })(),
    note: 'این فایل را می‌شود دستی ویرایش کرد. بعدش از منو ' +
          '«بازسازیِ عنوان و کاورِ یوتیوب» را بزنید تا روی ویدئو بنشیند.'
  };
  ytPlanWrite_(folder, plan);
  return plan;
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
  var plan = ytPlan_(folder, ctx, false);
  if (!plan) { res.why = 'مدل عنوان و کپشن نداد'; return res; }

  // ── کاور ──
  var cover = null;
  try {
    cover = ytCoverCard_({ title: String(ep.title || ''),
                           coverTitle: plan.coverTitle, kicker: plan.coverKicker,
                           showName: showName, seriesName: seriesName,
                           epLabel: coverEpLabel, cat: String(meta.cat || seriesName || '') });
  } catch (eC) {}

  /* ── تصویرهای بخش‌ها ──
   * پیش از درخواستِ رندر، چون ردیفِ صف **یک بار** نوشته می‌شود
   * (`ytRenderAsk_` تکراری را رد می‌کند) و اجازهٔ فایل‌ها همان‌جا داده
   * می‌شود. تصویری که بعد از نوشتنِ ردیف ساخته شود، هیچ‌وقت به اکشن
   * نمی‌رسد. */
  var vis = { items: [], want: 0, ready: 0, made: 0, tries: 0, done: true, why: '' };
  if (ytVisOn_(item.show)) {
    /* سبکِ همین مجموعه، از ردیفِ رجیستری. **شکستِ خواندن رشتهٔ خالی می‌دهد،
       نه یک حدس** — و خالی یعنی «همان که ذخیره شده»، پس یک هابِ نخوانده
       دوازده کارت را بی‌دلیل از نو نمی‌سازد (۷.۴۰). */
    var lvSty = '';
    try {
      var regL = readSeriesReg_(hub || getHub_());
      var recL = regL.byKey[String(item.series || (meta && meta.seriesKey) || '')] ||
                 regL.byKey[String(seriesName)] || null;
      if (recL) lvSty = lvStyleOf_(recL.vals).key;
    } catch (eSt) {}
    try { vis = lvBuild_(folder, plan, ctx, lvSty); }
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
                      why: vis.why || lvSubNote_(vis.items),
                      url: lvSub ? lvSub.getUrl() : '' });
      } catch (eLg) {}
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
    ytRenderAsk_({ show: item.show, ep: item.ep, title: String(ep.title || ''),
                   folderId: folder.getId(),
                   visuals: vis.items,
                   // **فهرستِ مرتب**، نه یک فایل: قسمتِ دوفایلی باید یک ویدئوی
                   // واحد شود، وگرنه نیمی از درس منتشر می‌شود.
                   audio: aud.parts.map(function (f) {
                     return { id: f.getId(), name: f.getName() }; }),
                   audioKind: aud.kind,
                   coverFileId: cover ? cover.fileId : '',
                   outName: outName });
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
  var url = 'https://www.youtube.com/watch?v=' + vid;

  // ── کاور ──
  var thumb = '—';
  if (CFG.YT_THUMB !== false && cover && cover.blob && ytQuotaTake_(YT_COST.thumbSet, false)) {
    try { yt.Thumbnails.set(vid, cover.blob); thumb = 'نشست'; }
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
      }
    } catch (eP) { plPos = 'نشد: ' + String(eP.message).slice(0, 60); }
  }

  // ── و تازه حالا عمومی ──
  var privacy = CFG.YT_PRIVACY_FIRST || 'unlisted';
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
  } else if (ytQuotaTake_(YT_COST.videosUpdate, false)) {
    try {
      yt.Videos.update({ id: vid, status: {
        privacyStatus: CFG.YT_PRIVACY_FINAL || 'public',
        selfDeclaredMadeForKids: false } }, 'status');
      privacy = CFG.YT_PRIVACY_FINAL || 'public';
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
                note: leaks.length ? 'نشتیِ خصوصی؛ در ' + privacy + ' ماند' : '' });
  logLine_('یوتیوب: «' + title + '» ' +
           (privacy === 'public' ? 'منتشر شد' : 'در ' + privacy + ' ماند') + ' — ' + url);
  res.ok = !leaks.length; res.url = url; res.privacy = privacy; res.title = title;
  res.why = leaks.length ? 'نشتیِ خصوصی' : '';
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
function ytWantPos_(pub, item, seriesName) {
  var mine = Number(item.ep) || 0;
  var showName = String(item.show) === ENRICH_SHOW_SPECIAL
                   ? CFG.SPECIAL_SHOW_NAME : CFG.SHOW_NAME;
  var n = 0;
  for (var k in pub) {
    if (!Object.prototype.hasOwnProperty.call(pub, k)) continue;
    var rec = pub[k];
    if (!rec || !rec.videoId) continue;
    var bits = String(k).split(':');
    if (bits[0] !== showName) continue;                   // برنامهٔ دیگر
    if (String(item.show) === ENRICH_SHOW_SPECIAL &&
        String(rec.series || '') !== String(seriesName || '')) continue;   // مجموعهٔ دیگر
    var other = Number(bits[1]) || 0;
    if (other && other < mine) n++;
  }
  return n;
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
  if (sigStr === was) { out.skipped = true; return out; }

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
  var out = { ok: true, collected: 0, published: 0, queued: 0, waiting: 0, why: '' };
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

  if (left() > 25000) {
    try {
      var r = ytRunDue_(1, Math.max(20000, left() - 15000));
      out.published = r.done; out.waiting = r.waiting;
    } catch (e2) { out.why += (out.why ? ' · ' : '') + 'انتشار: ' + String(e2.message).slice(0, 60); }
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
              plWhy: [], feedback: null };
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
        if (String(pub[k].privacy || '') !== (CFG.YT_PRIVACY_FINAL || 'public')) out.unlisted++;
      } else if (pub[k].tries >= Math.max(1, Number(CFG.YT_TRY_MAX) || 3)) out.failed++;
    }
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
    problems.push('ویدئو در انتظارِ وارسی: ' + faDigitsOut_(String(st.unlisted)) +
                  ' مورد عمومی نشده‌اند — یعنی در کپشنشان چیزی از جنسِ خصوصی ' +
                  'پیدا شده. تا اصلاحِ ytScrub_ عمومی نمی‌شوند.');
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
    /* شکستِ سقف‌خورده دیگر «در دستِ موتور» نیست — موتور هر کاری می‌توانست
       کرد و هفته‌ای یک بار هم باز امتحان می‌کند. علتِ محتمل حالِ کانال است
       و بازکردنش فقط از دستِ مالک برمی‌آید (۶٫۵۴). */
    var mCap = ytPlMap_(), capped = 0;
    for (var ck in mCap) if (Object.prototype.hasOwnProperty.call(mCap, ck)) {
      var rc = mCap[ck] || {};
      if ((Number(rc.coverTries) || 0) >= (CFG.YT_PL_TRY_MAX || 4) ||
          (Number(rc.podTries) || 0) >= (CFG.YT_PL_TRY_MAX || 4)) capped++;
    }
    if (capped) {
      problems.push(HY_ + 'کاور/پادکست‌شدنِ ' + faDigitsOut_(String(capped)) +
        ' پلی‌لیست پس از چند شب تلاش هنوز از سمتِ یوتیوب رد می‌شود ' +
        '(playlistImages: 500 · podcastStatus: Precondition check failed). ' +
        'این معمولاً یعنی «قابلیت‌های پیشرفته» روی کانال باز نیست — در ' +
        'youtube.com/features هویت را تأیید کنید؛ موتور خودش هفته‌ای یک بار ' +
        'دوباره امتحان می‌کند و به‌محضِ بازشدن جا می‌اندازد.');
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
  var out = { ok: false, why: '', changed: [] };
  var yt = ytSvc_();
  if (!yt) { out.why = ytOffWhy_(); return out; }
  var hub = getHub_();
  var pub = ytPublished_(hub);
  var showName = String(show) === ENRICH_SHOW_SPECIAL ? CFG.SPECIAL_SHOW_NAME : CFG.SHOW_NAME;
  var rec = pub[showName + ':' + String(ep)];
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
    var cover = ytCoverCard_({ title: String(epo.title || ''),
                               coverTitle: plan.coverTitle, kicker: plan.coverKicker,
                               showName: showName, seriesName: ctx.seriesName,
                               /* بازسازی هم همان برچسبِ مسیرِ آپلود را می‌گیرد
                                  (۶٫۵۶) — دو مسیر با دو برچسب یعنی کاورِ
                                  بازسازی‌شده به شکلِ قدیم برمی‌گشت. */
                               epLabel: (Number(meta.lesson) || 0)
                                 ? 'درس ' + faDigitsOut_(String(meta.lesson))
                                 : 'قسمت ' + faDigitsOut_(String(ep)),
                               cat: String(meta.cat || ctx.seriesName || ''),
                               redo: opt.recover !== false });
    if (cover && cover.blob && ytQuotaTake_(YT_COST.thumbSet, false)) {
      try { yt.Thumbnails.set(rec.videoId, cover.blob); out.changed.push('کاور'); }
      catch (eT) { out.why = (out.why ? out.why + ' · ' : '') + 'کاور ننشست: ' + String(eT.message).slice(0, 80); }
    }
  }

  // اگر پیشتر به‌خاطرِ نشتی در unlisted مانده بود، حالا که پاک است عمومی شود
  if (String(rec.privacy || '') !== (CFG.YT_PRIVACY_FINAL || 'public') &&
      ytQuotaTake_(YT_COST.videosUpdate, false)) {
    try {
      yt.Videos.update({ id: rec.videoId,
                         status: { privacyStatus: CFG.YT_PRIVACY_FINAL || 'public',
                                   selfDeclaredMadeForKids: false } }, 'status');
      out.changed.push('عمومی شد');
    } catch (eP) {}
  }

  ytLog_(hub, { show: showName, ep: ep, series: ctx.seriesName, title: plan.title,
                videoId: rec.videoId, url: rec.url,
                privacy: out.changed.indexOf('عمومی شد') !== -1
                           ? (CFG.YT_PRIVACY_FINAL || 'public') : rec.privacy,
                thumb: out.changed.indexOf('کاور') !== -1 ? 'نشست' : '—',
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
  stuck.sort(function (a, b) { return a.at < b.at ? -1 : (a.at > b.at ? 1 : 0); });
  var max = Math.max(1, Number(CFG.YT_REDO_MAX_PER_NIGHT) || 3);
  for (var i = 0; i < stuck.length && i < max; i++) {
    if (new Date().getTime() - t0 > budget) break;
    out.checked++;
    try {
      var res = ytRedoOne_(stuck[i].show, stuck[i].ep, {});
      if (res.ok && res.changed.indexOf('عمومی شد') !== -1) out.cleared++;
      else if (res.why && res.why.indexOf('نشتی') !== -1) out.stillLeak++;
    } catch (e) {}
  }
  if (out.checked) {
    logLine_('یوتیوب: ' + out.checked + ' ویدئوی در انتظارِ وارسی دوباره سنجیده شد — ' +
             out.cleared + ' عمومی شد، ' + out.stillLeak + ' هنوز نشتی دارد.');
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
   * این دو هر دو به حالِ خودِ کانال بندند (playlistImages و podcastStatus
   * روی کانالی که قابلیت‌های پیشرفته‌اش باز نشده همین‌ها را برمی‌گردانند) و
   * کد با تکرارِ شبانه فقط سهمیه می‌سوزاند و ایمیل را پر می‌کند — «هشداری که
   * برای چیزی که عوض نمی‌شود می‌آید، هشداری است که خوانده نمی‌شود».
   * پس: چند تلاشِ اول شبانه؛ از آن به بعد هفته‌ای یک بار، تا اگر مالک قابلیت
   * را باز کرد خودش جا بیفتد؛ و در این میان یک سطرِ «کارِ شما» علت را می‌گوید. */
  var giveUp = function (rec, f) {
    var tries = Number(rec[f + 'Tries']) || 0;
    if (tries < (CFG.YT_PL_TRY_MAX || 4)) return false;
    var last = parseWhen_(String(rec[f + 'LastTry'] || ''));
    if (isNaN(last)) return false;
    return (new Date().getTime() - last) <
           (CFG.YT_PL_RETRY_DAYS || 7) * 86400000;
  };
  var bump = function (field, f, why) {
    try {
      var m = ytPlMap_(), rec = m[key] || {};
      rec[field] = String(why || '').slice(0, 80);
      if (String(why || '').indexOf('سهمیه') === -1) {
        rec[f + 'Tries'] = (Number(rec[f + 'Tries']) || 0) + 1;
        rec[f + 'LastTry'] = nowStr_();
      }
      m[key] = rec; ytPlMapSave_(m);
    } catch (eM) {}
  };
  var pmap = ytPlMap_(), prec = pmap[key] || {};
  if (!prec.podcast && CFG.YT_PODCAST !== false && !giveUp(prec, 'pod')) {
    var pc = ytPlPodcast_(plId, plTitle || name);
    if (pc === 'نشست') {
      prec.podcast = nowStr_(); prec.podWhy = '';
      prec.podTries = 0; prec.podLastTry = '';
      pmap[key] = prec; ytPlMapSave_(pmap);
      out.podcasts = (out.podcasts || 0) + 1;
    } else {
      bump('podWhy', 'pod', pc);
      if (pc.indexOf('سهمیه') === -1) {
        logLine_('پادکست‌کردنِ پلی‌لیستِ «' + name + '» نشد: ' + pc);
      }
    }
  }
  if ((!prec.cover || renamed) && !giveUp(prec, 'cover')) {
    var cv = ytPlaylistCover_(plId, name, kicker, cat, renamed, kicker);
    if (cv === 'نشست') {
      out.covers++;
      prec = (ytPlMap_()[key] || prec);
      prec.cover = nowStr_(); prec.coverWhy = '';
      prec.coverTries = 0; prec.coverLastTry = '';
      var m2 = ytPlMap_(); m2[key] = prec; ytPlMapSave_(m2);
    } else if (cv) {
      bump('coverWhy', 'cover', cv);
      if (cv.indexOf('سهمیه') === -1) {
        out.coverFails.push(name + ': ' + cv);
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

/** کاورِ پلی‌لیست: همان کارت، ولی با نامِ مجموعه به‌جای عنوانِ قسمت. */
function ytPlaylistCover_(plId, title, kicker, cat, redo, showName) {
  if (!plId) return '';
  var cover = ytCoverCard_({ coverTitle: title, kicker: kicker,
                             showName: showName || CFG.SPECIAL_SHOW_NAME || '',
                             epLabel: 'مجموعه', cat: cat || title, redo: !!redo,
                             // پلی‌لیستِ ما پادکست هم می‌شود، و پادکست ۱:۱ می‌خواهد
                             square: CFG.YT_PODCAST !== false });
  if (!cover || !cover.blob) return 'کاور ساخته نشد';
  if (!ytQuotaTake_(YT_COST.thumbSet, false)) return 'سهمیه';

  /* multipart دستی، چون شناسهٔ پلی‌لیست در snippet می‌رود نه در query — و
     چون `playlistImages` منبعِ تازه‌ای است که سرویسِ پیشرفتهٔ Apps Script
     لزوماً نداردش. بایت‌ها به‌هم چسبانده می‌شوند، نه رشته‌ها: هر تبدیلِ
     رشته‌ایِ داده‌های دودویی، PNG را خراب می‌کند. */
  var boundary = '----ytpl' + String(plId).replace(/[^A-Za-z0-9]/g, '').slice(-10);
  var head = '--' + boundary + '\r\n' +
             'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
             JSON.stringify({ snippet: { playlistId: String(plId), type: 'hero' } }) +
             '\r\n--' + boundary + '\r\n' +
             'Content-Type: image/png\r\n\r\n';
  var tail = '\r\n--' + boundary + '--\r\n';
  var bytes = Utilities.newBlob(head).getBytes()
                .concat(cover.blob.getBytes())
                .concat(Utilities.newBlob(tail).getBytes());
  var r = ytHttp_('https://www.googleapis.com/upload/youtube/v3/playlistImages' +
                  '?uploadType=multipart&part=snippet',
                  'post', Utilities.newBlob(bytes).getBytes(),
                  'multipart/related; boundary=' + boundary);
  if (r.code === 200 || r.code === 201) return 'نشست';
  /* نبودنِ این قابلیت روی کانال خرابی نیست — ولی باید گفته شود، وگرنه هر شب
     بی‌صدا رد می‌شود و کسی نمی‌فهمد چرا پلی‌لیست کاور ندارد. اگر هم نشد،
     یوتیوب خودش کاورِ اولین ویدئوی پلی‌لیست را می‌گذارد — و چون ترتیب از
     شمارهٔ درس می‌آید، آن اولی همیشه درسِ یک است. یعنی حتی در بدترین حالت
     کاورِ پلی‌لیست بی‌ربط نمی‌شود. */
  return 'نشد (' + r.code + ')';
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
  // عکسِ پروفایل، از بزرگ‌ترین اندازه‌ای که کانال دارد
  var url = '';
  try {
    var th = (((info || {}).snippet || {}).thumbnails) || {};
    url = String((th.high || th.medium || th['default'] || {}).url || '');
  } catch (e) { url = ''; }
  if (!url) return 'عکسِ پروفایل خوانده نشد';
  var blob = null;
  try {
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return 'عکسِ پروفایل گرفته نشد (' + r.getResponseCode() + ')';
    blob = r.getBlob().setName('watermark.png');
  } catch (e2) { return 'عکسِ پروفایل گرفته نشد: ' + String(e2.message).slice(0, 80); }
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
