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
    hashtags: { type: 'array', items: { type: 'string' } }
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
  return 'کاور — ' + String(c.epLabel || '') + ' — ' + String(c.showName || '') + '.png';
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
 * یک ارائهٔ تازه با **اندازهٔ صفحهٔ دقیق**.
 *
 * ══ چرا لازم است، و چرا یک تابع و نه دو ══
 * خروجیِ PNG گوگل از اندازهٔ خودِ صفحه می‌آید (۹۶ نقطه بر اینچ). `SlidesApp`
 * داخلی اندازهٔ صفحه را نمی‌گذارد، پس هرچه با آن ساخته شود ۹۶۰×۵۴۰ درمی‌آید —
 * که یوتیوب می‌پذیردش (کفش ۶۴۰ است) ولی متن نرم و بی‌کیفیت می‌شود. اندازهٔ
 * دقیق فقط از REST برمی‌آید.
 *
 * بنر از ۶٫۵ همین کار را می‌کرد و کاور نمی‌کرد — یعنی دوباره همان «قرینه‌ای
 * که یک‌بار درست شد» که این ریپو بارها گرفتارش شده. حالا یک تعریف است و هر
 * دو از آن می‌گذرند.
 *
 * و اگر REST نشد، کار **نمی‌ایستد**: با اندازهٔ پیش‌فرض ساخته می‌شود و
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
    out.id = mk.json.presentationId; out.exact = true;
    return out;
  }
  var off = ytApiOff_((mk && mk.text) || '');
  out.enableUrl = off.url || '';
  out.why = off.off
    ? (off.api || 'Google Slides API') + ' در پروژهٔ ابری روشن نیست' +
      (off.url ? ' — ' + off.url : '')
    : 'ساختِ ارائه با اندازهٔ دقیق نشد' + (mk ? ' (' + mk.code + ')' : '');
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
       می‌کند و کارتِ ۹۶۰×۵۴۰ باید بالا کشیده شود — یعنی متنِ نرم. */
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
  var cap = Math.max(1, Number(CFG.YT_RENDER_MAX) || 8);
  var pend = d.items.filter(function (x) { return String(x.status || '') === 'در انتظار'; });
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

/** اشتراکِ «هرکس با لینک: فقط دیدن» — روشن. */
function ytShareOn_(fileId) {
  if (!fileId) return false;
  try {
    DriveApp.getFileById(String(fileId))
            .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return true;
  } catch (e) {
    logLine_('اشتراکِ موقتِ فایل برقرار نشد: ' + String(e.message).slice(0, 80));
    return false;
  }
}

/** و خاموش. */
function ytShareOff_(fileId) {
  if (!fileId) return false;
  try {
    DriveApp.getFileById(String(fileId))
            .setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    return true;
  } catch (e) {
    logLine_('اشتراکِ موقتِ فایل پس گرفته نشد: ' + String(e.message).slice(0, 80));
    return false;
  }
}

/** صوت و کاورِ یک ردیف را با هم باز یا بسته می‌کند. */
function ytRenderShare_(item, on) {
  var ids = [], au = (item || {}).audio || [];
  for (var i = 0; i < au.length; i++) if (au[i] && au[i].id) ids.push(au[i].id);
  if (item && item.coverFileId) ids.push(item.coverFileId);
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
  var map = ytRenderMap_();
  if (!map) { out.why = 'نقشهٔ ویدئوها خوانده نشد'; return out; }

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
    }
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
var YT_HEADERS = ['تاریخ', 'برنامه', 'قسمت', 'مجموعه', 'عنوانِ یوتیوب',
                  'شناسهٔ ویدئو', 'لینک', 'وضعیت انتشار', 'پلی‌لیست',
                  'جای در پلی‌لیست', 'کاور', 'فصل‌ها', 'برچسب‌ها',
                  'نویسهٔ کپشن', 'نشتیِ خصوصی', 'نتیجه', 'شرح',
                  // شکلِ صوتِ منبع: «کامل» یا «یکجا ×۲». قسمتِ دوفایلی باید
                  // در یک ویدئو بیاید و این ستون تنها جایی است که می‌شود
                  // دید واقعاً چند تکه چسبانده شده.
                  'صوتِ منبع', 'مدت'];
var YU = { AT: 1, SHOW: 2, EP: 3, SERIES: 4, TITLE: 5, VID: 6, URL: 7, PRIV: 8,
           PL: 9, POS: 10, THUMB: 11, CHAPS: 12, TAGS: 13, DESC: 14,
           LEAK: 15, RESULT: 16, NOTE: 17, AUDIO: 18, DUR: 19 };

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
                       String(row.duration || '')]], YT_HEADERS.length);
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
      var cur = map[k] || { tries: 0, videoId: '', url: '', privacy: '', at: '',
                            result: '', series: '' };
      cur.tries++;
      cur.at = String(v[i][YU.AT - 1] || '');
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
  var l = (list || []).slice();
  l.sort(function (a, b) {
    var sa = String(a.show || ''), sb = String(b.show || '');
    if (sa !== sb) return sa < sb ? -1 : 1;
    var ka = String(a.seriesName || a.seriesKey || ''), kb = String(b.seriesName || b.seriesKey || '');
    if (ka !== kb) return ka < kb ? -1 : 1;
    return (Number(a.ep) || 0) - (Number(b.ep) || 0);
  });
  return l;
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

/** نقشه را می‌سازد یا از روی دیسک برمی‌دارد. `redo` مدل را دوباره می‌پرسد. */
function ytPlan_(folder, ctx, redo) {
  if (!redo) {
    var had = ytPlanRead_(folder);
    if (had) { had.cached = true; return had; }
  }
  var mm = ytMetaModel_(ctx);
  if (!mm) return null;
  var chapters = ytChapters_(ctx.sections || [], ctx.totalSec,
                             Number(CFG.MUSIC_INTRO_SEC) || 0);
  var plan = {
    at: nowStr_(), show: ctx.show, ep: String(ctx.epRaw || ''),
    title: ytTitleBuild_(mm, ctx),
    description: ytDescBuild_(mm, ctx, chapters),
    tags: ytTags_(mm, ctx),
    coverTitle: ytScrub_(String(mm.coverTitle || '')).trim(),
    coverKicker: ytScrub_(String(mm.coverKicker || '')).trim(),
    chapters: chapters.length,
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
  var epLabel = 'قسمت ' + faDigitsOut_(String(item.ep));

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
              showName: showName, tagline: isSpecial ? CFG.SPECIAL_TAGLINE : CFG.TAGLINE,
              seriesName: seriesName, epNum: faDigitsOut_(String(item.ep)),
              title: String(ep.title || ''), cat: String(meta.cat || ''),
              duration: ytTime_(totalSec), headings: heads,
              hook: String(ep.hook || ''), summary: String(ep.summary || ''),
              sources: (ep.__extSources || []),
              sections: ep.sections || [], totalSec: totalSec };
  var plan = ytPlan_(folder, ctx, false);
  if (!plan) { res.why = 'مدل عنوان و کپشن نداد'; return res; }

  // ── کاور ──
  var cover = null;
  try {
    cover = ytCoverCard_({ title: String(ep.title || ''),
                           coverTitle: plan.coverTitle, kicker: plan.coverKicker,
                           showName: showName, seriesName: seriesName,
                           epLabel: epLabel, cat: String(meta.cat || seriesName || '') });
  } catch (eC) {}

  // ── ویدئو رسیده؟ ──
  var video = ytVideoIn_(folder);
  if (!video) {
    ytRenderAsk_({ show: item.show, ep: item.ep, title: String(ep.title || ''),
                   folderId: folder.getId(),
                   // **فهرستِ مرتب**، نه یک فایل: قسمتِ دوفایلی باید یک ویدئوی
                   // واحد شود، وگرنه نیمی از درس منتشر می‌شود.
                   audio: aud.parts.map(function (f) {
                     return { id: f.getId(), name: f.getName() }; }),
                   audioKind: aud.kind,
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
    var pmap = ytPlMap_(), prec = pmap[pk] || {};
    var renamed = !!(titleWas && titleWas !== pl.title);
    /* پادکست‌کردن یک بار بس است و به کاور ربطی ندارد، پس پرچمِ خودش را
       دارد — وگرنه شکستِ یکی، دیگری را هم هر شب دوباره می‌فرستاد. */
    if (!prec.podcast && CFG.YT_PODCAST !== false) {
      var pc = ytPlPodcast_(pl.id, pl.title || name);
      if (pc === 'نشست') {
        prec.podcast = nowStr_(); pmap[pk] = prec; ytPlMapSave_(pmap);
        out.podcasts = (out.podcasts || 0) + 1;
      } else if (pc.indexOf('سهمیه') === -1) {
        logLine_('پادکست‌کردنِ پلی‌لیستِ «' + name + '» نشد: ' + pc);
      }
    }
    if (!prec.cover || renamed) {
      var cv = ytPlaylistCover_(pl.id, name, CFG.SPECIAL_SHOW_NAME || '',
                                String(rec.vals[SC.CAT - 1] || name), renamed);
      if (cv === 'نشست') {
        out.covers++;
        prec.cover = nowStr_(); pmap[pk] = prec; ytPlMapSave_(pmap);
      } else if (cv && cv.indexOf('سهمیه') === -1) {
        out.coverFails.push(name + ': ' + cv);
        try { ytPlCoverFailSave_(out.coverFails); } catch (eCf) {}
      }
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
              feedback: null };
  /* بازخورد داخلِ همین شیء می‌نشیند تا در `_STATUS.json` باشد — تنها فایلی
     که سشنِ ناظر واقعاً می‌خواند. چیزی که فقط در یک تب باشد، برای ناظر
     وجود ندارد. */
  try { out.feedback = ytStatsStatus_(); } catch (eFb0) {}
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
  if (st.playlists) L.push('پلی‌لیست ' + faDigitsOut_(String(st.playlists)));
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
              tagline: isSpecial ? CFG.SPECIAL_TAGLINE : CFG.TAGLINE,
              seriesName: String(meta.seriesName || rec.series || ''),
              epNum: faDigitsOut_(String(ep)), title: String(epo.title || ''),
              cat: String(meta.cat || ''), duration: ytTime_(audSec),
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
                               epLabel: 'قسمت ' + faDigitsOut_(String(ep)),
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
function ytPlaylistCover_(plId, title, kicker, cat, redo) {
  if (!plId) return '';
  var cover = ytCoverCard_({ coverTitle: title, kicker: kicker,
                             showName: CFG.SPECIAL_SHOW_NAME || '',
                             epLabel: 'مجموعه', cat: cat || title, redo: !!redo });
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
  var add = function (key, label, by, ok, note) {
    out.push({ key: key, label: label, by: by, ok: !!ok, note: String(note || '') });
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
    put(String(CFG.TAGLINE || ''), y + safeH * 0.34, safeH * 0.24, 22, pal.ac, false);
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
  L.push(String(CFG.SHOW_NAME || '') + ' — ' + String(CFG.TAGLINE || ''));
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
  var out = { at: '', filled: 0, empty: 0, todo: [], line: '' };
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
      else if (String(row[3]) === 'خالی') {
        out.empty++;
        if (String(row[2]) === 'آدم') out.todo.push(k);
      }
    }
  } catch (e) {}
  out.line = 'شناسنامهٔ کانال: پرشده ' + faDigitsOut_(String(out.filled)) +
             (out.empty ? ' · خالی ' + faDigitsOut_(String(out.empty)) : '') +
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
function ytApiOff_(text) {
  var t = String(text || '');
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
