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
var YT_COST = { videosUpdate: 50, videosList: 1, playlistsInsert: 50,
                playlistsUpdate: 50, playlistsList: 1, itemsInsert: 50,
                itemsUpdate: 50, itemsList: 1, itemsDelete: 50, thumbSet: 50 };

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
    hookLine: { type: 'string' },
    summary: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    hashtags: { type: 'array', items: { type: 'string' } }
  },
  required: ['title', 'hookLine', 'summary', 'tags']
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
  L.push('');
  L.push('چه بنویس:');
  L.push('• title — عنوانِ یوتیوب. حداکثر ' + (CFG.YT_TITLE_MAX || 100) + ' نویسه. ' +
         'مهم‌ترین واژهٔ جست‌وجو در شصت نویسهٔ اول باشد. بی‌کلیک‌بیت، بی وعدهٔ دروغ، ' +
         'بی حروفِ بزرگِ فریاد. اگر مجموعه‌ای است، شمارهٔ درس در عنوان بیاید.');
  L.push('• hookLine — یک جملهٔ کوتاه که در نتیجهٔ جست‌وجو زیرِ عنوان دیده می‌شود. ' +
         'صد و پنجاه نویسهٔ اولِ کپشن مهم‌ترین بخشِ سئوست؛ همین جمله آنجاست.');
  L.push('• summary — دو تا سه بند، هرکدام دو-سه جمله. چه چیزی در این قسمت گفته ' +
         'می‌شود و شنونده بعدش چه می‌فهمد. زبانِ آدمیزاد، نه فهرستِ کلیدواژه.');
  L.push('• bullets — سه تا شش نکتهٔ کوتاه از خودِ قسمت (هرکدام یک سطر).');
  L.push('• tags — ده تا پانزده برچسبِ فارسی و در صورتِ نیاز انگلیسی؛ از عامْ به ' +
         'خاص. هرکدام دو تا چهار واژه. تکراری نه.');
  L.push('• hashtags — سه هشتگِ کوتاهِ فارسی، بی فاصله، بی علامتِ #.');
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
function ytCoverCard_(c) {
  var pres = null;
  try {
    var pal = ytPalette_(c.cat || c.seriesName || c.showName);
    var name = 'کاور — ' + String(c.epLabel || '') + ' — ' + String(c.showName || '');
    pres = SlidesApp.create(name);
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

    put(c.showName || '', H * 0.10, H * 0.10, 20, pal.ac, true);
    var ttl = String(c.title || '');
    // عنوانِ بلند فونتِ کوچک‌تر می‌گیرد، وگرنه از کارت بیرون می‌زند
    var fs = ttl.length > 70 ? 30 : (ttl.length > 45 ? 36 : 44);
    put(ttl, H * 0.24, H * 0.42, fs, pal.fg, true);
    var foot = [];
    if (c.seriesName) foot.push(c.seriesName);
    if (c.epLabel) foot.push(c.epLabel);
    put(foot.join('  ·  '), H * 0.72, H * 0.12, 18, pal.fg, false);

    pres.saveAndClose();
    var id = pres.getId();
    // تصویر را از خودِ گوگل می‌گیریم — Apps Script راهی برای رستر کردن ندارد
    var url = 'https://docs.google.com/presentation/d/' + encodeURIComponent(id) +
              '/export/png?id=' + encodeURIComponent(id) +
              '&pageid=' + encodeURIComponent(slide.getObjectId());
    var res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      logLine_('کاورِ یوتیوب ساخته نشد (خروجیِ PNG کدِ ' + res.getResponseCode() + ').');
      return null;
    }
    var blob = res.getBlob().setName(name + '.png');
    // فایلِ اسلاید و PNG هر دو می‌مانند — اگر کاوری بد درآمد باید دید چه بوده
    var f = null;
    try {
      var folder = ytCoverFolder_();
      DriveApp.getFileById(id).moveTo(folder);
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
           'برای هر ردیفِ status=«در انتظار»: فایلِ صوتی و کاور را از پوشهٔ قسمت ' +
           'بردار، یک MP4 با تصویرِ ثابت بساز (h264 + aac، ۱۲۸ کیلوبیت، ۱ فریم بر ' +
           'ثانیه کافی است) و با همان نامِ outName در همان پوشه بگذار. ' +
           'موتور خودش پیدایش می‌کند و منتشر می‌کند. هیچ‌جای دیگری را دست نزن.';
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
function ytAudioIn_(folder) {
  var best = null, bestSize = 0;
  try {
    var it = folder.getFiles();
    while (it.hasNext()) {
      var f = it.next();
      var nm = f.getName();
      if (!/\.wav$/i.test(nm)) continue;
      if (nm.indexOf('کامل') !== -1) return f;      // فایلِ یکجا، اگر هست
      var sz = f.getSize ? f.getSize() : 0;
      if (sz > bestSize) { bestSize = sz; best = f; }
    }
  } catch (e) {}
  return best;
}

/** یک درخواستِ تازه، بی تکرار. سقف دارد تا صف بی‌نهایت نشود. */
function ytRenderAsk_(item) {
  var d = ytRenderRead_();
  var key = String(item.show) + ':' + String(item.ep);
  for (var i = 0; i < d.items.length; i++) {
    if (String(d.items[i].key) === key) return false;      // قبلاً خواسته شده
  }
  var cap = Math.max(1, Number(CFG.YT_RENDER_MAX) || 8);
  var pend = d.items.filter(function (x) { return String(x.status || '') === 'در انتظار'; });
  if (pend.length >= cap) return false;
  d.items.push({ key: key, show: item.show, ep: String(item.ep),
                 title: String(item.title || ''), folderId: String(item.folderId || ''),
                 audioFileId: String(item.audioFileId || ''),
                 coverFileId: String(item.coverFileId || ''),
                 outName: String(item.outName || ''), at: nowStr_(),
                 status: 'در انتظار' });
  return ytRenderSave_(d);
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
var YT_HEADERS = ['تاریخ', 'برنامه', 'قسمت', 'مجموعه', 'عنوانِ یوتیوب',
                  'شناسهٔ ویدئو', 'لینک', 'وضعیت انتشار', 'پلی‌لیست',
                  'جای در پلی‌لیست', 'کاور', 'فصل‌ها', 'برچسب‌ها',
                  'نویسهٔ کپشن', 'نشتیِ خصوصی', 'نتیجه', 'شرح'];
var YU = { AT: 1, SHOW: 2, EP: 3, SERIES: 4, TITLE: 5, VID: 6, URL: 7, PRIV: 8,
           PL: 9, POS: 10, THUMB: 11, CHAPS: 12, TAGS: 13, DESC: 14,
           LEAK: 15, RESULT: 16, NOTE: 17 };

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
                       String(row.note || '')]], YT_HEADERS.length);
    return true;
  } catch (e) { logLine_('ثبتِ انتشارِ یوتیوب نوشته نشد: ' + e.message); return false; }
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
      var k = String(v[i][YU.SHOW - 1] || '') + ':' + String(v[i][YU.EP - 1] || '');
      if (k === ':') continue;
      var cur = map[k] || { tries: 0, videoId: '', url: '', privacy: '', at: '', result: '' };
      cur.tries++;
      cur.at = String(v[i][YU.AT - 1] || '');
      cur.result = String(v[i][YU.RESULT - 1] || '');
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
  var r = pub[String(show) + ':' + String(ep)];
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

function ytDueAdd_(show, ep, folderId) {
  var l = ytDueList_(), k = String(show) + ':' + String(ep);
  for (var i = 0; i < l.length; i++) if (String(l[i].key) === k) return 0;
  l.push({ key: k, show: String(show), ep: String(ep),
           folderId: String(folderId || ''), at: nowStr_() });
  ytDueSave_(l);
  return 1;
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
    var vf = showFolder_(CFG.SHOW_NAME);
    var it = vf.getFolders();
    while (it.hasNext()) {
      var f1 = it.next();
      walk.push({ show: ENRICH_SHOW_VARIETY, folder: f1, series: '', seriesKey: '' });
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
    if (ytDueAdd_(w.show, ep, w.folder.getId())) {
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
function ytSecondsOf_(file) {
  try {
    var b = file.getSize ? file.getSize() : 0;
    if (!b) return 0;
    return Math.max(0, Math.round((b - 44) / ((Number(CFG.SAMPLE_RATE) || 24000) * 2)));
  } catch (e) { return 0; }
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
  var epLabel = 'قسمت ' + faDigitsOut_(String(item.ep));

  var audio = ytAudioIn_(folder);
  var totalSec = audio ? ytSecondsOf_(audio) : 0;
  var outName = ytVideoName_(String(folder.getName()));

  // ── کاور ──
  var cover = null;
  try {
    cover = ytCoverCard_({ title: String(ep.title || ''), showName: showName,
                           seriesName: seriesName, epLabel: epLabel,
                           cat: String(meta.cat || seriesName || '') });
  } catch (eC) {}

  // ── ویدئو رسیده؟ ──
  var video = ytVideoIn_(folder);
  if (!video) {
    ytRenderAsk_({ show: item.show, ep: item.ep, title: String(ep.title || ''),
                   folderId: folder.getId(),
                   audioFileId: audio ? audio.getId() : '',
                   coverFileId: cover ? cover.fileId : '',
                   outName: outName });
    res.waiting = true;
    res.why = 'ویدئو هنوز ساخته نشده؛ درخواستِ رندر گذاشته شد';
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

  // ── متادیتا ──
  var heads = [];
  for (var h = 0; h < (ep.sections || []).length; h++) {
    heads.push(String(ep.sections[h].heading || ''));
  }
  var ctx = { showName: showName, tagline: isSpecial ? CFG.SPECIAL_TAGLINE : CFG.TAGLINE,
              seriesName: seriesName, epNum: faDigitsOut_(String(item.ep)),
              title: String(ep.title || ''), cat: String(meta.cat || ''),
              duration: ytTime_(totalSec), headings: heads,
              hook: String(ep.hook || ''), summary: String(ep.summary || ''),
              sources: (ep.__extSources || []) };
  var mm = ytMetaModel_(ctx);
  if (!mm) { res.why = 'مدل عنوان و کپشن نداد'; return res; }

  var chapters = ytChapters_(ep.sections || [], totalSec,
                             Number(CFG.MUSIC_INTRO_SEC) || 0);
  var title = ytTitleBuild_(mm, ctx);
  var desc = ytDescBuild_(mm, ctx, chapters);
  var tags = ytTags_(mm, ctx);
  var leaks = ytLeaks_(title + '\n' + desc + '\n' + tags.join(' '));

  // ── آپلود، اول unlisted ──
  if (!ytQuotaTake_(0, true)) {
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
        var want = isSpecial ? Math.max(0, (Number(item.ep) || 1) - 1) : items.length;
        plPos = ytPlPlace_(pl.id, vid, want, items);
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
                             String(CFG.TAGLINE || '') +
                             '\nهمهٔ قسمت‌ها، به ترتیبِ انتشار.'), title: t };
  }
  var key = 'series:' + String(item.seriesKey || seriesName || '');
  var title = String(seriesName || 'مجموعه') + ' — ' + String(showName || CFG.SPECIAL_SHOW_NAME);
  return { id: ytPlEnsure_(key, title,
                           'درس‌به‌درس، به ترتیب. ' + String(CFG.SPECIAL_TAGLINE || '')),
           title: title };
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
  var out = { checked: 0, made: 0, renamed: 0, linked: 0, skipped: false };
  if (!ytOn_() || CFG.YT_PLAYLISTS === false) return out;
  var t0 = new Date().getTime();
  var budget = Math.max(15000, Number(budgetMs) || 60000);
  var hub = getHub_();
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
    var had = !!(map0['series:' + rec.key] || {}).id;
    var titleWas = String((map0['series:' + rec.key] || {}).title || '');
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
  }
  try { props_().setProperty(PK.YT_PLSIG, sigStr); } catch (e5) {}
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
  var list = ytDueList_();

  for (var i = 0; i < list.length && out.tried < cap; i++) {
    // دستِ‌کم یکی، حتی اگر بودجه تنگ است — وگرنه در شبِ شلوغ هیچ‌وقت
    // نوبتِ یوتیوب نمی‌رسد و صف تا ابد می‌ماند.
    if (out.tried && new Date().getTime() - t0 > budget) break;
    var it = list[i];
    out.tried++;
    var r;
    try { r = ytUploadOne_(it, hub, pub); }
    catch (e) { r = { ok: false, why: 'خطا: ' + e.message }; }
    if (r.quota) { out.quota = true; out.tried--; break; }
    if (r.waiting) { out.waiting++; out.notes.push(it.key + ': ' + r.why); continue; }
    if (r.ok || r.videoId) {
      ytDueDrop_(it.key);
      if (r.ok) out.done++; else { out.failed++; out.notes.push(it.key + ': ' + r.why); }
    } else {
      out.failed++;
      out.notes.push(it.key + ': ' + r.why);
      ytLog_(hub, { show: it.show, ep: it.ep, result: 'نشد', note: r.why });
      // شمارِ تلاش از خودِ تب می‌آید؛ پس از سقف، `ytBackfill_` دیگر صفش نمی‌کند
      ytDueDrop_(it.key);
    }
  }
  out.left = ytDueList_().length;
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
              renderOldestDays: 0, playlists: 0, quota: null, last: null, line: '' };
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
      out.last = { at: String(v[YU.AT - 1]), title: String(v[YU.TITLE - 1]),
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
  if (st.playlists) L.push('پلی‌لیست ' + faDigitsOut_(String(st.playlists)));
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

  /* بندِ رندر پیش از وارسیِ اتصال می‌آید و عمداً به آن وابسته نیست: ساختِ
     ویدئو کارِ طرفِ دیگر است. اگر این بند پشتِ «سرویس وصل است؟» می‌ماند،
     قطع‌شدنِ سرویس انبوهِ درخواست‌های بی‌جواب را هم نامرئی می‌کرد — یعنی
     دو خرابی، با یک سکوت. */
  var days = Math.max(1, Number(CFG.YT_STUCK_DAYS) || 3);
  if (st.waitingRender && st.renderOldestDays >= days) {
    problems.push('ساختِ ویدئو ' + faDigitsOut_(String(st.renderOldestDays)) +
                  ' روز است انجام نشده (' + faDigitsOut_(String(st.waitingRender)) +
                  ' درخواستِ باز در ' + (CFG.YT_RENDER_FILE || '_YT-RENDER.json') +
                  '). موتور نمی‌تواند ویدئو بسازد؛ تا وقتی کسی آن MP4ها را ' +
                  'نسازد، هیچ قسمتی منتشر نمی‌شود.');
  }
  if (st.unlisted) {
    problems.push('ویدئو در انتظارِ وارسی: ' + faDigitsOut_(String(st.unlisted)) +
                  ' مورد عمومی نشده‌اند — یعنی در کپشنشان چیزی از جنسِ خصوصی ' +
                  'پیدا شده. تا اصلاحِ ytScrub_ عمومی نمی‌شوند.');
  }
  if (st.failed) {
    problems.push('انتشار در یوتیوب برای ' + faDigitsOut_(String(st.failed)) +
                  ' قسمت پس از چند تلاش رها شد — تبِ «' +
                  (CFG.YT_TAB || 'انتشار در یوتیوب') + '» ستونِ «شرح» علتش را دارد.');
  }
  if (st.quota && st.quota.blocked) {
    notes.push('سهمیهٔ یوتیوب امروز پر شد (' + st.quota.blocked +
               ')؛ کارِ باقی‌مانده فردا ادامه می‌یابد.');
  }
  return st;
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
  var r = ytRunDue_(Number(CFG.YT_MANUAL_MAX) || 6, 210000);
  var p = { made: 0, renamed: 0, linked: 0 };
  try { p = ytPlaylistSync_(45000); } catch (e2) {}

  var L = ['انتشار در یوتیوب:'];
  if (b.queued) L.push('• قسمتِ تازه‌ای که به صف رفت: ' + b.queued);
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
           '» است و تسکِ غنی‌سازی آن‌ها را می‌سازد.');
  }
  var m = L.join('\n');
  if (ui) ui.alert('انتشار در یوتیوب', m, ui.ButtonSet.OK); else console.log(m);
  return { backfill: b, run: r, playlists: p };
}
