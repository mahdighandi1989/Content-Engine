/**
 * 33_VoiceIntake.gs — گویندهٔ تازه: از یک فایل در درایو تا یک مدلِ آماده
 *
 * ══ خواستهٔ صاحبِ برنامه، عیناً ══
 *
 * «آیا تو درایو فولدری درست کردی یا هست که صدای نمونهٔ جدیدی بذارم و اسم
 * گوینده رو رو صوت نمونه بذارم و تو در دوره‌های بررسی روزانه بری اونجا رو
 * چک کنی و دیدی نمونهٔ جدیدی از گویندهٔ جدید هست بری خودکار روش کار کنی و
 * وقتی همه چیز تموم شد اعلام کنی و نمونه‌ها رو بفرستی؟»
 *
 * ══ پوشه از قبل بود؛ کد نبود ══
 *
 * «voice cloning» را خودش ۲ سپتامبر ساخت. موتور تا امروز نه نگاهش می‌کرد و
 * نه می‌شناختش: هر شب در `outLayout.strays` به‌عنوان «پوشهٔ ناشناخته» گزارش
 * می‌شد و کسی وصلش نکرد. این دقیقاً همان شکلِ شکستی است که این مخزن یک بخشِ
 * کامل دربارهٔ آن دارد — «دیدن با مکلف‌بودن یکی نیست». پوشه دیده می‌شد.
 *
 * ══ مرزی که این بخش از آن رد نمی‌شود ══
 *
 * Apps Script نه می‌تواند صوت را تحلیل کند، نه مدل آموزش بدهد، نه ffmpeg
 * دارد. پس اینجا **تصمیم** گرفته می‌شود، نه **کار**: موتور پوشه را می‌خوانَد،
 * صف می‌نویسد، و نتیجه را برمی‌دارد و اعلام می‌کند. آموزش در GitHub Actions
 * است. همان مرزی که بخشِ ۲۷ برای ویدئو کشید و بخشِ ۲۳ برای موسیقی — و هر دو
 * بار، وقتی این مرز صریح نوشته نشد، هفته‌ها هیچ‌کس کاری نکرد.
 *
 * و مرزِ دوم، که صاحبِ برنامه خودش گذاشت: **پل** — یعنی تبدیلِ خودکارِ صوتِ
 * هر قسمت به رنگِ صدای گویندهٔ کلون‌شده — کارِ این بخش نیست و اینجا هیچ
 * ردیفی را روشن نمی‌کند. این بخش مدل را **آماده** می‌کند و می‌ایستد.
 *
 * ══ چرخه ══
 *
 *   پوشه → `vintScan_` → ردیفِ کارنامه → `_VOICE-QUEUE.json`
 *        → (GitHub Actions: پاک‌سازی، آموزش، سنجش، نمونه‌سازی)
 *        → `docs/voices.json` → `vintIngest_` → اعلام + نمونه در درایو
 *
 * ══ هر درسی که از رضوی گرفتیم، اینجا کد شده ══
 *
 *   • **کشِ یک گوینده هرگز نباید به گویندهٔ دیگر برسد.** اثرِ انگشتِ دیتاست
 *     (`dsSig_`) حالا کلیدِ گوینده را هم در خود دارد؛ بی آن، دیتاستِ رضوی
 *     برای گویندهٔ دوم «موجود» شمرده می‌شد و هیچ خطایی هم نمی‌داد. این
 *     خطرناک‌ترین باگِ ممکنِ این بخش است و همان شکلی است که `freshStart_`
 *     برایش نوشته شد.
 *   • **موسیقیِ زیرِ روایت سم است** و `dsprep.py` از قبل حذفش می‌کند — با دو
 *     آستانهٔ نسبی و **هر تکه جدا** (نه کلِ دسته، که یک بار نُه ثانیه موسیقی
 *     را در صدکِ پنجمِ دسته گم کرد). پس برای هر گویندهٔ تازه هم همان اتفاق
 *     می‌افتد؛ کارِ تازه‌ای لازم نیست، فقط باید گفته شود که هست.
 *   • **دروازهٔ گوینده** (`DS_SPK_MIN`) یعنی اگر در فایل‌ها صدای دیگری هم
 *     باشد — تیزر، مجری، مهمان — تکه‌هایش نمی‌ماند. پس فایلِ «تقریباً تمیز»
 *     هم پذیرفتنی است.
 *   • **قالب مهم نیست.** mp3، wav، m4a… ffmpeg همه را می‌خوانَد. فهرستِ
 *     پسوندها فقط برای این است که یک فایلِ نامربوط **گزارش** شود نه اینکه
 *     بی‌صدا رد شود؛ درسِ «قالب ناسازگار» در بانکِ موسیقی.
 *   • **بیشتر، بهتر نیست — ولی خیلی کم، بد است.** ۳۹ دقیقه تا ۲۴۰ دقیقه فقط
 *     ۰٫۰۱۸ شباهت آورد، پس وعدهٔ «هرچه بیشتر بهتر» داده نمی‌شود. ولی زیرِ
 *     `VOICE_MIN_MINUTES` ساعت‌ها پردازش می‌سوزد و چیزی نمی‌دهد، پس هشدار
 *     داده می‌شود. موتور نمی‌تواند صوت را بخوانَد، پس عددش یک **حدس** از
 *     روی حجم است و هرگز مبنای رد کردن نیست.
 *     ⚠ و یک وعده که هنوز داده نشده: `minutes` و `segments` را امروز هیچ
 *     کس نمی‌نویسد — `state.json` فقط `done` و `epochs_reached` دارد. پس
 *     آن دو خط در اعلام و آن ستون در کارنامه برای گویندگانِ واقعی خالی
 *     می‌مانند. اینجا نوشته شده تا کسی فکر نکند خراب است؛ نوشتنش کارِ
 *     `finish_` است، هر وقت لازم شد. یک وعدهٔ نانوشته بهتر از یک وعدهٔ
 *     دروغ است.
 *   • **درخواستی که بی‌پاسخ بماند، خودش یافته است** — از روزِ اول، نه پس از
 *     هفت هفته سکوت مثلِ بانکِ موسیقی.
 *   • **رهاشده از عقب‌مانده جدا شمرده می‌شود**؛ درسِ جزوه.
 *   • **هیچ‌چیز پاک نمی‌شود** — بایگانی، همیشه.
 */

/** گام‌های یک گوینده. یک فهرست، چون دو فهرست یعنی دو رفتار. */
var VINT_ST = {
  SEEN: 'دیده‌شد', QUEUED: 'در صف', TRAIN: 'آموزش', MEASURE: 'سنجش',
  READY: 'آماده', THIN: 'دادهٔ کم', FAIL: 'ناموفق', GIVEUP: 'رهاشده'
};

/* گام‌هایی که یعنی «کار تمام است» — نه دوباره به صف می‌روند، نه عقب‌مانده‌اند.
 *
 * «دادهٔ کم» از ۷٫۲۲ اینجاست. در ۷٫۲۱ پایانی نبود و هیچ‌وقت هم تلاشی
 * نمی‌شمرد، پس گوینده‌ای با دادهٔ ناکافی **هر شب تا ابد** دوباره به صف
 * می‌رفت و هر شب همان جواب را می‌گرفت. همان حلقه‌ای که ۵٫۸۸ برای جزوه
 * بست: کاری که نمی‌شود انجامش داد، رها می‌شود نه اینکه بی‌پایان تکرار.
 * برای باز کردنش کافی است صوتِ بیشتری اضافه شود و دکمهٔ منو زده شود. */
var VINT_DONE = [VINT_ST.READY, VINT_ST.GIVEUP, VINT_ST.THIN];

var VINT_HEADERS = ['زمان', 'کلید', 'نام', 'گام', 'نتیجه', 'فایل‌ها',
                    'دقیقه', 'شباهت', 'اجرا', 'توضیح'];

/** ستون‌ها، ۱-بنیان — همان الگوی `PC` و `CC`. */
var VC = { AT: 1, KEY: 2, NAME: 3, STEP: 4, RESULT: 5, FILES: 6,
           MIN: 7, SIM: 8, RUN: 9, NOTE: 10 };

function vintOn_() { return CFG.VOICE_INTAKE_ON !== false; }

/**
 * پوشهٔ «voice cloning» در ریشهٔ OUTPUT.
 *
 * با نام پیدا می‌شود و نه با شناسهٔ ثابت: شناسهٔ ثابت یعنی اگر کاربر پوشه را
 * پاک و دوباره بسازد، موتور **بی هیچ خطایی** تا ابد به پوشه‌ای مرده نگاه
 * می‌کند — دقیقاً همان دامی که `YT_QUEUE_ID` در بخشِ ۲۷ گرفتارش شد و تنها
 * راهِ شکستنِ سکوتش یک وارسیِ جداگانه بود.
 */
function vintCloneFolder_() {
  var nm = String(CFG.VOICE_CLONE_FOLDER || 'voice cloning');
  var root = outFolder_();
  var it = root.getFoldersByName(nm);
  if (it.hasNext()) return it.next();
  return root.createFolder(nm);
}

/** بایگانیِ درونِ همان پوشه. چیزی پاک نمی‌شود؛ فقط جابه‌جا. */
function vintArchiveFolder_() {
  var nm = String(CFG.VOICE_CLONE_ARCHIVE || 'بایگانی — نمونه‌های آزمایشی');
  var par = vintCloneFolder_();
  var it = par.getFoldersByName(nm);
  if (it.hasNext()) return it.next();
  return par.createFolder(nm);
}

/**
 * کلیدِ پایدارِ یک گوینده، از نامش.
 *
 * فارسی و لاتین هر دو ممکن است. کلید فقط باید **پایدار** و **یکتا** باشد و
 * در نامِ artifact و کلیدِ کش بنشیند، پس لاتین و کوتاه است. نامِ فارسی
 * کوبیده می‌شود به یک هشِ کوتاه تا نه کشِ گیت‌هاب بشکند و نه دو گویندهٔ
 * متفاوت یک کلید بگیرند.
 */
function vintNameNorm_(name) {
  /* ══ یک نفر، یک املا (۷٫۲۲) ══
     «بهروز رضوی» با نیم‌فاصله، با ي عربی، با ك عربی، یا با دو فاصله، چهار
     کلیدِ متفاوت می‌ساخت — یعنی یک نفر چهار بار آموزش می‌دید و چهار بار
     «✅ گویندهٔ تازه» اعلام می‌شد. همان نرمال‌سازی که `txNorm` و
     `personaShowOk_` سال‌هاست می‌کنند. */
  return String(name || '')
    .replace(/[\u064A\u0649]/g, '\u06CC')   // ي/ى عربی → ی
    .replace(/\u0643/g, '\u06A9')           // ك عربی → ک
    .replace(/[\u200c\u200e\u200f\u202a-\u202e\ufeff]/g, ' ')
    .replace(/[\u064B-\u0652\u0670]/g, '')  // اعراب
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * کلیدِ پایدارِ یک گوینده، از نامش.
 *
 * ══ چرا لاتین فقط وقتی که نام **واقعاً** لاتین است (۷٫۲۲) ══
 *
 * نسخهٔ اول هر تکهٔ لاتینِ دو-نویسه‌ای را کلید می‌کرد. یعنی «سارا 01» و
 * «نیما 01» هر دو کلیدِ `01` می‌گرفتند: دو نفر، یک پوشهٔ آموزش، یک مدل که
 * روی دو صدا آموزش می‌دید — و هیچ‌چیز گزارش نمی‌شد. «مریم (mp3)» و «علی
 * (mp3)» هم همین‌طور.
 *
 * این دقیقاً همان فاجعه‌ای است که `dsSig_` برای جلوگیری‌اش عوض شد، فقط یک
 * پله بالاتر: آنجا کش را جدا کردیم و اینجا خودِ **هویت** به هم می‌ریخت.
 * جدا کردنِ کشِ دو نفری که یک کلید دارند، هیچ چیزی را نجات نمی‌دهد.
 *
 * پس قاعده سخت شد: اگر نام حتی یک حرفِ غیرِلاتین دارد، کلید از هشِ نامِ
 * **نرمال‌شده** ساخته می‌شود. تکهٔ لاتین فقط وقتی کلید می‌شود که کلِ نام
 * لاتین باشد و دستِ‌کم یک حرف داشته باشد — «01» نامِ کسی نیست.
 */
function vintSlug_(name) {
  var t = vintNameNorm_(name).toLowerCase();
  if (!t) return '';
  var hash = function (x) {
    var h = 0;
    for (var i = 0; i < x.length; i++) { h = ((h << 5) - h + x.charCodeAt(i)) | 0; }
    return 'spk-' + (h >>> 0).toString(36);
  };
  // حتی یک حرفِ غیرِلاتین ⇒ هش. مقایسه روی حرف است نه بر نویسه، تا رقم و
  // نقطه‌گذاری تصمیم نگیرند.
  if (/[^\u0000-\u007F]/.test(t)) return hash(t);
  var lat = t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!lat || !/[a-z]/.test(lat)) return hash(t);
  // نامِ بلند بریده می‌شود ولی هشِ کلِ نام ته‌اش می‌نشیند، وگرنه دو نامِ
  // لاتین که تا نویسهٔ چهلم یکی‌اند یک کلید می‌گرفتند.
  if (lat.length > 40) lat = lat.slice(0, 32) + '-' + hash(t).slice(4);
  return lat;
}

/** پسوندِ یک نام. */
function vintExt_(name) {
  var m = String(name || '').match(/\.([A-Za-z0-9]{1,5})$/);
  return m ? m[1].toLowerCase() : '';
}

/** این فایل صوتی است؟ */
function vintAudioOk_(name) {
  var list = CFG.VOICE_AUDIO_EXT || [];
  var e = vintExt_(name);
  if (!e) return false;
  for (var i = 0; i < list.length; i++) if (String(list[i]).toLowerCase() === e) return true;
  return false;
}

/**
 * نامِ گوینده از نامِ یک فایلِ آزاد.
 *
 * قاعده عمداً سخت‌گیر است: جداکننده باید **فاصله داشته باشد** — « — » یا
 * « - » یا « _ ». وگرنه `behrouz-razavi-1.mp3` به «behrouz» بریده می‌شد و
 * یک گویندهٔ ساختگی می‌ساخت. بی جداکننده، کلِ نامِ فایل نامِ گوینده است.
 *
 * دنبالهٔ « (۱)» که خودِ درایو برای هم‌نام‌ها می‌گذارد و شمارهٔ انتهایی هم
 * برداشته می‌شوند، تا سه فایلِ یک نفر سه گوینده نشوند.
 */
function vintSpeakerOf_(fileName) {
  var t = String(fileName || '').replace(/\.[A-Za-z0-9]{1,5}$/, '').trim();
  if (!t) return '';
  var m = t.split(/\s+[—–\-_]\s+/);
  var head = String(m[0] || '').trim();
  if (!head) return '';
  head = head.replace(/\s*\(\s*[0-9۰-۹]+\s*\)\s*$/, '').trim();
  head = head.replace(/[\s_\-]*[0-9۰-۹]+$/, '').trim();
  return head;
}

/**
 * پوشه را بخوان.
 *
 * دو راهِ گذاشتنِ نمونه، هر دو پذیرفته:
 *   • یک **زیرپوشه** به نامِ گوینده، با هر تعداد فایل داخلش (پیشنهادی)
 *   • فایل‌های **آزاد** در خودِ پوشه، با نامِ گوینده در ابتدایشان
 *
 * فایلِ نامربوط دور ریخته نمی‌شود: در `bad` می‌نشیند تا گزارش شود. درسِ
 * «قالب ناسازگار» — رد شدنِ بی‌صدا همان چیزی است که هفته‌ها کسی نفهمد چرا
 * کاری انجام نشده.
 */
function vintScan_() {
  var out = { speakers: [], bad: [], error: '' };
  try {
    var par = vintCloneFolder_();
    var arcName = String(CFG.VOICE_CLONE_ARCHIVE || 'بایگانی — نمونه‌های آزمایشی');
    var guide = String(CFG.VOICE_GUIDE_FILE || '');
    var by = {};
    var put = function (name, src, f) {
      var key = vintSlug_(name);
      if (!key) return;
      if (!by[key]) by[key] = { key: key, name: name, source: src, files: [], bytes: 0 };
      var sz = 0;
      try { sz = Number(f.getSize()) || 0; } catch (eS) {}
      by[key].files.push({ id: f.getId(), name: String(f.getName()), bytes: sz });
      by[key].bytes += sz;
    };

    var di = par.getFolders();
    while (di.hasNext()) {
      var d = di.next(), dn = String(d.getName());
      if (arcName && dn === arcName) continue;
      var fi2 = d.getFiles(), any = false;
      while (fi2.hasNext()) {
        var f2 = fi2.next(), n2 = String(f2.getName());
        if (!vintAudioOk_(n2)) {
          if (out.bad.length < 25) out.bad.push({ name: dn + '/' + n2, why: 'صوتی نیست' });
          continue;
        }
        put(dn, 'پوشه', f2); any = true;
      }
      if (!any && out.bad.length < 25) {
        out.bad.push({ name: dn, why: 'پوشهٔ گوینده هیچ فایلِ صوتی ندارد' });
      }
    }

    var fi = par.getFiles();
    while (fi.hasNext()) {
      var f = fi.next(), n = String(f.getName());
      if (guide && n === guide) continue;
      if (!vintAudioOk_(n)) {
        if (out.bad.length < 25) out.bad.push({ name: n, why: 'صوتی نیست' });
        continue;
      }
      var sp = vintSpeakerOf_(n);
      if (!sp) { if (out.bad.length < 25) out.bad.push({ name: n, why: 'نامِ گوینده از نامِ فایل درنیامد' }); continue; }
      put(sp, 'فایل', f);
    }

    for (var k in by) {
      if (!Object.prototype.hasOwnProperty.call(by, k)) continue;
      out.speakers.push(by[k]);
    }
    out.speakers.sort(function (a, b) { return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0); });
  } catch (e) { out.error = e.message; }
  return out;
}

/**
 * حدسِ دقیقه از حجم — و اسمش عمداً «حدس» است.
 *
 * موتور نمی‌تواند صوت را رمزگشایی کند، پس این عدد **هرگز** مبنای رد کردن
 * نیست؛ فقط برای این است که یک پوشهٔ آشکارا خالی همان شب گفته شود نه بعد
 * از پنج ساعت آموزش. عددِ واقعی از اکشن می‌آید. «عددی که هیچ‌وقت طولِ
 * واقعیِ چیزی نیست، هدف نیست» — همان درسِ `specialTargetMin_`.
 */
function vintEstMinutes_(bytes) {
  var b = Number(bytes) || 0;
  if (b <= 0) return 0;
  return Math.round((b / 16000) / 60);   // ~۱۲۸ کیلوبیت بر ثانیه
}

function vintTab_(hub) {
  return ensureTab_(hub || getHub_(), 'کارنامهٔ گویندگان', VINT_HEADERS);
}

function vintRows_(hub) {
  var s = vintTab_(hub);
  var last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2, 1, last - 1, VINT_HEADERS.length).getValues();
}

/**
 * یک ردیف در کارنامه — **هر تلاش، موفق یا ناموفق**.
 *
 * `_STATUS.json` می‌گوید «الان کجاست»؛ سؤالی که واقعاً پرسیده می‌شود «از
 * کِی؟» است و جوابش فقط از تاریخچه درمی‌آید. همان دلیلی که تبِ «کاربردِ
 * جزوه» برایش ساخته شد.
 */
function vintLog_(hub, r) {
  try {
    var sh = vintTab_(hub || getHub_());
    sh.appendRow([nowStr_(), String(r.key || ''), String(r.name || ''),
                  String(r.step || ''), String(r.result || ''),
                  Number(r.files || 0), String(r.minutes == null ? '' : r.minutes),
                  String(r.sim == null ? '' : r.sim), String(r.run || ''),
                  String(r.note || '').slice(0, 500)]);
    return true;
  } catch (e) {
    try { logLine_('ثبتِ کارنامهٔ گوینده ناموفق: ' + e.message); } catch (e2) {}
    return false;
  }
}

/**
 * حالِ امروزِ هر گوینده، از تاشدنِ تاریخچه.
 *
 * آخرین ردیفِ هر کلید گامِ فعلی است؛ شمارِ ردیف‌های «ناموفق» تلاش‌هاست.
 * حالت از خودِ تاریخچه درمی‌آید و نه از ستونی جدا، چون دو منبعِ حقیقت
 * روزی از هم می‌پاشند و هیچ‌چیز نشان نمی‌دهد.
 */
function vintState_(hub) {
  var st = {};
  var rows = [];
  try { rows = vintRows_(hub); } catch (e) { return st; }
  /* ══ ترتیب از ستونِ «زمان» می‌آید، نه از جای ردیف (۷٫۲۲) ══
     این یک تبِ انسانی است و مرتب‌کردنش کارِ عادیِ هر کسی است. تا ۷٫۲۱
     آخرین **ردیف** برنده بود، پس یک بار مرتب‌سازی، گامِ همهٔ گویندگان را
     بی‌صدا عوض می‌کرد — و می‌توانست گوینده‌ای را که وسطِ آموزش است
     «آماده» نشان بدهد و بایگانی‌اش کند. ستونِ زمان از روزِ اول نوشته
     می‌شد و خوانده نمی‌شد؛ همان «تحلیلی که به دروازه وصل نشد». */
  var ordered = rows.slice();
  for (var oi = 0; oi < ordered.length; oi++) ordered[oi] = { r: ordered[oi], i: oi };
  ordered.sort(function (a, b) {
    var ta = vintWhen_(a.r[VC.AT - 1]), tb = vintWhen_(b.r[VC.AT - 1]);
    if (ta !== tb) return ta - tb;
    return a.i - b.i;                      // هم‌زمان: ترتیبِ نوشتن
  });
  rows = ordered.map(function (x) { return x.r; });
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i], key = String(r[VC.KEY - 1] || '').trim();
    if (!key) continue;
    if (!st[key]) st[key] = { key: key, name: '', step: '', at: '', tries: 0,
                              minutes: '', sim: '', run: '', note: '' };
    var s = st[key];
    var nm = String(r[VC.NAME - 1] || '').trim();
    if (nm) s.name = nm;
    var step = String(r[VC.STEP - 1] || '').trim();
    if (step) { s.step = step; s.at = String(r[VC.AT - 1] || ''); }
    if (String(r[VC.RESULT - 1] || '').trim() === VINT_ST.FAIL) s.tries++;
    var mn = String(r[VC.MIN - 1] || '').trim(); if (mn) s.minutes = mn;
    var sm = String(r[VC.SIM - 1] || '').trim(); if (sm) s.sim = sm;
    var rn = String(r[VC.RUN - 1] || '').trim(); if (rn) s.run = rn;
    var nt = String(r[VC.NOTE - 1] || '').trim(); if (nt) s.note = nt;
  }
  return st;
}

/** زمانِ یک سلول به عدد. نامعلوم = صفر، تا ردیفِ بی‌تاریخ ترتیب را به هم نزند. */
function vintWhen_(v) {
  if (v instanceof Date) return v.getTime();
  var t = 0;
  try { t = new Date(String(v || '').replace(' ', 'T')).getTime(); } catch (e) {}
  return isFinite(t) ? t : 0;
}

/**
 * گامی که موتور می‌شناسد؟
 *
 * ۷٫۲۱ هر رشته‌ای را از `docs/voices.json` می‌پذیرفت. یک `stage` عددی
 * می‌شد `"7"` و یک شیء می‌شد `"[object Object]"` — هر دو «پایانی نیستند»،
 * پس آن گوینده تا ابد هر شب دوباره به صف می‌رفت و در شمارشِ «در کار»
 * می‌ماند، بی هیچ خطایی. گامِ ناشناس حالا **ناموفق** است: می‌شمارد، و
 * بالاخره به «رهاشده» می‌رسد.
 */
function vintStepOk_(step) {
  for (var k in VINT_ST) {
    if (Object.prototype.hasOwnProperty.call(VINT_ST, k) && VINT_ST[k] === step) return true;
  }
  return false;
}

/**
 * این گوینده را دست نزن: نمونه‌هایش هنوز خوراکِ چیزِ دیگری‌اند.
 *
 * از خودِ `docs/voices.json` خوانده می‌شود، نه از فهرستی دستی در کد — یک
 * فهرستِ دست‌نویسِ «چه کسی مهم است» همان چیزی است که کهنه می‌شود
 * (`removeTriggers` در ۵٫۹۵). یک بار خوانده می‌شود و نه یک بار به ازای
 * هر گوینده: این تابع از شبکه می‌خوانَد و حلقه‌ها بلند می‌شوند.
 */
function vintKeepSet_() {
  var out = Object.create(null);
  try {
    var doc = vintReadResult_();
    if (!doc || !doc.speakers || typeof doc.speakers !== 'object') return out;
    for (var k in doc.speakers) {
      if (!Object.prototype.hasOwnProperty.call(doc.speakers, k)) continue;
      var r = doc.speakers[k];
      if (r && (r.preexisting || r.keepShared)) out[k] = 1;
    }
  } catch (e) {}
  return out;
}

/** گامِ پایانی؟ */
function vintIsDone_(step) {
  for (var i = 0; i < VINT_DONE.length; i++) if (VINT_DONE[i] === step) return true;
  return false;
}

/**
 * صفِ کار برای اکشن.
 *
 * همان قراردادِ `_YT-RENDER.json`: در ریشه، دقیقاً یکی، و «هرکس با لینک»
 * خواندنی — چون اکشن با هویتِ هیچ‌کس وارد می‌شود و راهِ دیگری برای دیدنش
 * ندارد. فایل‌های هر گوینده هم به همین دلیل اشتراک می‌گیرند و پس از
 * `VOICE_SHARE_HOURS` پس گرفته می‌شوند.
 */
function vintQueue_(hub, scan, state) {
  var q = { rev: 0, at: nowStr_(), engine: String(CFG.CODE_VERSION || ''),
            maxActive: Math.max(1, Number(CFG.VOICE_MAX_ACTIVE) || 2),
            minMinutes: Math.max(1, Number(CFG.VOICE_MIN_MINUTES) || 20),
            tryMax: Math.max(1, Number(CFG.VOICE_TRY_MAX) || 3),
            speakers: [] };
  try {
    var prev = null;
    try { prev = vintReadQueue_(); } catch (eP) {}
    q.rev = (prev && Number(prev.rev) || 0) + 1;

    for (var i = 0; i < scan.speakers.length; i++) {
      var sp = scan.speakers[i], cur = state[sp.key] || null;
      var step = cur ? cur.step : '';
      if (vintIsDone_(step)) continue;              // آماده یا رهاشده: کاری نیست
      var tries = cur ? cur.tries : 0;
      var files = [];
      for (var j = 0; j < sp.files.length; j++) {
        var f = sp.files[j];
        /* اشتراکِ از قبل باز را دوباره باز نکن: با ۲۰۰ گوینده این حلقه
           هر شب ده‌ها هزار نوشتنِ ACL بود، و کارِ شبانه شش دقیقه بیشتر
           ندارد (قاعدهٔ ۵٫۶۸: هر بلوکِ سنگین جلوی کارهای بعدی را می‌گیرد). */
        try {
          var fh = DriveApp.getFileById(f.id);
          if (String(fh.getSharingAccess()) !== String(DriveApp.Access.ANYONE_WITH_LINK)) {
            driveShareOn_(f.id);
          }
        } catch (eS) { try { driveShareOn_(f.id); } catch (eS2) {} }
        files.push({ id: f.id, name: f.name, bytes: f.bytes });
      }
      q.speakers.push({ key: sp.key, name: sp.name, source: sp.source,
                        step: step || VINT_ST.QUEUED, tries: tries,
                        files: files, bytes: sp.bytes,
                        estMinutes: vintEstMinutes_(sp.bytes) });
    }

    putOutJson_(String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json'), q);
    /* ══ اشتراک را خاموش نبلع (۷٫۳۳) ══
       این سه خط در یک `catch` خالی بودند. اگر باز کردنِ اشتراک شکست
       می‌خورد، اکشن به‌جای JSON یک صفحهٔ HTML می‌گرفت و موتور هیچ‌جا
       نمی‌گفت چرا — که دقیقاً همان چیزی است که افتاد. */
    try {
      var qn = String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json');
      var it = outFolder_().getFilesByName(qn);
      if (it.hasNext() && !driveShareOn_(it.next().getId())) {
        logLine_('اشتراکِ «' + qn + '» باز نشد — گردش‌کارِ voice-intake HTML می‌گیرد.');
      }
    } catch (eQ) {
      try { logLine_('اشتراکِ صفِ گویندگان وارسی نشد: ' + eQ.message); } catch (eQ2) {}
    }
    /* ══ اینجا عمداً هیچ مُهرِ زمانی زده نمی‌شود (۷٫۲۲) ══
       نسخهٔ ۷٫۲۱ همین‌جا `PK.VINT_QAT` را هر شب دوباره مهر می‌زد و
       `vintStuckDays_` از رویش می‌خواند — یعنی «چند روز است بی‌پاسخ
       مانده» همیشه صفر بود و زنگی که کلِ این بخش به آن می‌بالید هرگز
       نمی‌توانست به صدا دربیاید. همان `audit-attrib-low`: هشداری با
       واژه‌های دقیقاً درست که یک بار هم زنگ نزد.
       حالا جواب از خودِ تاریخچه می‌آید (`vintStuckDays_`)، که کسی
       نمی‌تواند ناخواسته تازه‌اش کند. */
  } catch (e) {
    try { logLine_('نوشتنِ صفِ گویندگان ناموفق: ' + e.message); } catch (e2) {}
    q.error = e.message;
  }
  return q;
}

/**
 * شناسهٔ صف همان است که اکشن دنبالش می‌گردد؟
 *
 * این وارسی به این دلیل هست که نبودش یک بار گران تمام شد: اگر فایل پاک و
 * دوباره ساخته شود، `putOutJson_` شناسهٔ تازه می‌سازد، اکشن همچنان شناسهٔ
 * کهنه را می‌خوانَد، و **هیچ خطایی بلند نمی‌شود** — صف پر است و هیچ
 * گوینده‌ای آموزش نمی‌بیند. عیناً همان چیزی که `ytQueueIdOk_` برایش نوشته
 * شد. یک بار در این مخزن اتفاق افتاده؛ دو بار لازم نیست.
 */
function vintQueueIdOk_() {
  var want = String(CFG.VOICE_QUEUE_ID || ''), got = '';
  if (!want) return { ok: true, want: '', got: '' };
  try {
    var it = outFolder_().getFilesByName(String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json'));
    if (it.hasNext()) got = it.next().getId();
  } catch (e) { return { ok: true, want: want, got: '' }; }   // نشد ≠ عوض شد
  if (!got) return { ok: true, want: want, got: '' };          // هنوز ساخته نشده
  return { ok: got === want, want: want, got: got };
}

/**
 * صف در درایو «هرکس با لینک» هست؟ — و اگر نیست، همین‌جا باز می‌شود.
 *
 * ══ چرا این وارسی جدا لازم شد (۷٫۳۳) ══
 * `vintQueueIdOk_` دقیقاً برای یک سکوت نوشته شد: «اکشن فایل را نمی‌تواند
 * بخوانَد و هیچ خطایی بلند نمی‌شود». ولی آن فقط **نیمی** از سؤال را
 * می‌پرسد. شناسه می‌تواند درست باشد، فایل سرِ جایش باشد، و اکشن باز هم
 * چیزی نگیرد — چون درایو برای فایلی که «هرکس با لینک» نباشد به‌جای JSON
 * یک صفحهٔ HTML می‌دهد، نه خطای ۴۰۳.
 *
 * و همین افتاد: از ۲۰ سپتامبر هر چهار اجرای `voice-intake` روی همان
 * صفحهٔ HTML قرمز شد، و تنها جایی که این را می‌دید تبِ Actions در گیت‌هاب
 * بود — جایی که صاحبِ برنامه سر نمی‌زند.
 *
 * تنها جایی که اشتراکِ صف باز می‌شد داخلِ `vintQueue_` بود. یعنی تشخیص و
 * اصلاح به یک مسیر بسته بودند: شبی که کارِ شبانه به آن بلوک نرسد، نه باز
 * می‌شود و نه کسی می‌فهمد. این وارسی از آن مسیر مستقل است و از
 * `healthCheck` هم می‌آید — همان درسِ `embGates_` در ۷٫۲۷.
 *
 * و چرا **باز می‌کند** نه اینکه فقط بگوید: دری که آدم باید دستی بازش کند
 * در نیست (۵٫۹۵). `voice-intake-stuck` هم هست، ولی سه روز طول می‌کشد و
 * از راهِ «جوابی نیامد» حدس می‌زند؛ چیزی که با یک فراخوان مستقیم معلوم
 * می‌شود نباید از سه روز سکوت استنتاج شود.
 */
function vintQueueShare_() {
  var out = { ok: true, missing: false, fixed: false, error: '' };
  var f = null;
  try {
    var it = outFolder_().getFilesByName(String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json'));
    if (it.hasNext()) f = it.next();
  } catch (e) { out.error = e.message; return out; }   // نشد ≠ بسته است
  if (!f) { out.missing = true; return out; }          // هنوز ساخته نشده: تقصیر نیست
  try {
    if (String(f.getSharingAccess()) === String(DriveApp.Access.ANYONE_WITH_LINK)) return out;
  } catch (e2) { out.error = e2.message; return out; }
  out.ok = false;
  out.fixed = driveShareOn_(f.getId());
  if (!out.fixed && !out.error) out.error = 'setSharing نشد';
  return out;
}

/** صفِ فعلی، اگر باشد. */
function vintReadQueue_() {
  var nm = String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json');
  var it = outFolder_().getFilesByName(nm);
  if (!it.hasNext()) return null;
  try { return JSON.parse(it.next().getBlob().getDataAsString('UTF-8')); }
  catch (e) { return null; }
}

/** پاسخِ اکشن، از gitHub raw — همان مسیری که `engine.gs` از آن می‌آید. */
function vintReadResult_() {
  var path = String(CFG.VOICE_RESULT_PATH || 'docs/voices.json');
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(path),
              { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    return JSON.parse(res.getContentText('UTF-8'));
  } catch (e) { return null; }
}

/**
 * نمونه‌های شنیداریِ یک گویندهٔ آماده را از ریپو بردار و در درایو بگذار.
 *
 * چرا از ریپو و نه از artifact: از این محیط artifact اصلاً دانلود نمی‌شود
 * (لینکش به blob storage می‌رود و پراکسی می‌بنددش) و از Apps Script هم
 * رمز می‌خواهد. راهی که از قبل کار می‌کند همان gitHub raw است — و چند
 * نمونهٔ پانزده‌ثانیه‌ای چند صد کیلوبایت‌اند، نه ۱۹۲ مگابایت.
 */
function vintFetchSamples_(key, name, paths) {
  var made = [];
  if (!paths || !paths.length) return made;
  var folder;
  try {
    var root = outFolder_();
    var fn = String(CFG.VOICE_AUDIT_FOLDER || 'آزمونِ صدای گویندگان');
    var it = root.getFoldersByName(fn);
    folder = it.hasNext() ? it.next() : root.createFolder(fn);
  } catch (eF) { return made; }

  for (var i = 0; i < paths.length && i < 6; i++) {
    var p = String(paths[i] || '');
    if (!p) continue;
    try {
      /* مسیرِ نمونه‌ها فارسی است — تنها fetchِ غیرِASCIIِ این مخزن. هر
         مسیرِ دیگری (`manifest.json`، `engine.gs`، پرامپت‌ها) ASCII است،
         پس این راه هرگز آزموده نشده بود. هر تکه جدا کدگذاری می‌شود تا
         «/» سالم بماند. */
      var enc = p.split('/').map(function (x) { return encodeURIComponent(x); }).join('/');
      var res = UrlFetchApp.fetch(githubRawUrl_(enc),
                { muteHttpExceptions: true, followRedirects: true });
      if (res.getResponseCode() !== 200) continue;
      var base = p.replace(/^.*\//, '');
      var nm = 'گویندهٔ تازه — ' + name + ' — ' + base;
      // هم‌نامِ پیشین کنار می‌رود، وگرنه هر اجرا یک نسخهٔ تازه می‌سازد و
      // `getFilesByName` معلوم نیست کدام را برمی‌گرداند — همان دامِ `dups`.
      var old = folder.getFilesByName(nm);
      while (old.hasNext()) { try { old.next().setTrashed(true); } catch (eT) {} }
      var file = folder.createFile(res.getBlob().setName(nm));
      try { driveShareOn_(file.getId()); } catch (eS) {}
      made.push({ name: nm, url: file.getUrl() });
    } catch (e) {}
  }
  return made;
}

/**
 * پاسخِ اکشن را بخوان و حال را جلو ببر.
 *
 * فقط وقتی گامِ تازه با گامِ ثبت‌شده فرق دارد ردیف می‌نشیند — وگرنه هر شب
 * یک ردیفِ تکراری و کارنامه‌ای که دیگر خوانده نمی‌شود.
 */
function vintIngest_(hub) {
  var out = { seen: 0, moved: 0, ready: [], styled: [], error: '' };
  var doc = vintReadResult_();
  if (!doc || typeof doc !== 'object') return out;
  var sp = doc.speakers;
  /* ══ آرایه هم `typeof 'object'` است (۷٫۲۲) ══
     در ۷٫۲۱ یک `speakers` آرایه‌ای از این دروازه رد می‌شد و اندیس‌هایش
     («۰»، «۱») گویندهٔ خیالی می‌ساختند — با ردیف در کارنامه و یک
     «✅ گویندهٔ تازه آماده شد» به ایمیل و تلگرام. یعنی دقیقاً همان خبرِ
     دروغی که `preexisting` برای جلوگیری‌اش نوشته شد، از درِ دیگر. */
  if (!sp || typeof sp !== 'object' ||
      Object.prototype.toString.call(sp) === '[object Array]') {
    out.error = 'شکلِ speakers درست نیست';
    try {
      logSelfFinding_(hub || getHub_(), {
        priority: 'متوسط', category: 'گویندهٔ تازه', key: 'voice-result-shape',
        title: 'پاسخِ گویندگان شکلِ درستی ندارد',
        detail: 'در ' + (CFG.VOICE_RESULT_PATH || 'docs/voices.json') +
                ' کلیدِ speakers باید یک شیء باشد (کلید = کلیدِ گوینده). ' +
                'تا درست نشود هیچ گوینده‌ای جلو نمی‌رود.',
        instruction: 'شکلِ درست: {"rev":N,"speakers":{"<کلید>":{"name":"…",' +
                     '"stage":"آماده|آموزش|سنجش|ناموفق|دادهٔ کم|رهاشده",…}}}',
        owner: ROWNER_CODE
      });
    } catch (eF) {}
    return out;
  }

  /* ══ کارتِ سبک → ردیفِ «صداها» (۷٫۳۴) ══
     پس از دروازهٔ شکل، نه پیش از آن: یک `speakers` بدشکل نباید به بخشِ
     ۳۲ برسد. و ۳۳ → ۳۲ وابستگیِ **عقب** است، که مجاز است — آنچه
     ممنوع است وابستگیِ رو به جلوست. */
  try {
    if (typeof personaSyncCards_ === 'function') out.styled = personaSyncCards_(sp) || [];
  } catch (ePS) {
    try { logLine_('ردیف‌های سبک ساخته نشدند: ' + ePS.message); } catch (ePS2) {}
  }

  var state = vintState_(hub);
  var told = {};
  try {
    var rawTold = JSON.parse(props_().getProperty(PK.VINT_TOLD) || '{}');
    /* هر چیزِ درست‌نمایی از `|| {}` رد می‌شد — یک آرایه، یک عدد، یک رشته —
       و بعد دست‌نخورده دوباره نوشته می‌شد، پس نگهبانِ «یک بار اعلام کن»
       برای همیشه از کار می‌افتاد و هر شب همان خبر می‌رفت. */
    if (rawTold && typeof rawTold === 'object' &&
        Object.prototype.toString.call(rawTold) !== '[object Array]') told = rawTold;
  } catch (e0) {}
  var saveTold = function () {
    try { props_().setProperty(PK.VINT_TOLD, JSON.stringify(told)); } catch (e) {}
  };

  for (var key in sp) {
    if (!Object.prototype.hasOwnProperty.call(sp, key)) continue;
    var r = sp[key] || {};
    if (typeof r !== 'object') continue;
    out.seen++;
    var step = String(r.stage == null ? '' : r.stage).trim();
    if (!step) continue;
    var name = r.name || (state[key] && state[key].name) || key;
    if (!vintStepOk_(step)) {
      // گامِ ناشناس = ناموفق، تا بشمارد و بالاخره رها شود
      step = VINT_ST.FAIL;
      r = { name: name, note: 'گامِ ناشناس از اکشن: «' +
            String(r.stage).slice(0, 40) + '»', runId: r.runId || r.run || '' };
    }
    var cur = state[key] || null;
    var was = cur ? cur.step : '';
    var sameRun = cur && String(cur.run || '') === String(r.runId || r.run || '');

    /* ══ «آماده» همیشه خبرِ تازه نیست ══
       رضوی پیش از وجودِ این بخش و با دست آموزش دید. ردیفش باید ثبت شود
       (وگرنه هر شب دوباره به صف می‌رود) ولی اعلامش نباید برود. */
    if (r.preexisting && !told[key]) { told[key] = nowStr_(); saveTold(); }

    if (was === step && sameRun) {
      /* ══ ردیف هست ولی اعلام نرفته (۷٫۲۲) ══
         ردیف بی‌درنگ نوشته می‌شود و `told` در ۷٫۲۱ فقط **پس از کلِ حلقه**
         ذخیره می‌شد. یک اجرای کشته‌شده در شش دقیقه — که در این بخش عادی
         است، چون وسطش چند دانلود هست — ردیف را می‌گذاشت و `told` را نه،
         و از فردا همین `continue` تا ابد جلویش را می‌گرفت: گویندهٔ آماده،
         بی هیچ اعلامی، برای همیشه. دو منبعِ حقیقت برای یک تصمیم. */
      if (!(step === VINT_ST.READY && !told[key])) continue;
    }

    var tries = cur ? cur.tries : 0;
    if (step === VINT_ST.FAIL && (tries + 1) >= Math.max(1, Number(CFG.VOICE_TRY_MAX) || 3)) {
      vintLog_(hub, { key: key, name: name, step: VINT_ST.GIVEUP, result: VINT_ST.GIVEUP,
                      files: Number(r.files || 0), minutes: r.minutes, sim: r.similarity,
                      run: r.runId || r.run || '',
                      note: 'پس از ' + (tries + 1) + ' تلاشِ ناموفق رها شد. ' +
                            String(r.note || '') });
      out.moved++;
      continue;
    }

    if (!(was === step && sameRun)) {
      vintLog_(hub, { key: key, name: name,
                      step: step, result: (step === VINT_ST.FAIL ? VINT_ST.FAIL : 'ok'),
                      files: Number(r.files || 0), minutes: r.minutes, sim: r.similarity,
                      run: r.runId || r.run || '', note: String(r.note || '') });
      out.moved++;
    }

    if (step === VINT_ST.READY && !told[key]) {
      var made = vintFetchSamples_(key, name, r.samples || []);
      /* ══ نمونه‌ای که نرسید، فردا دوباره امتحان می‌شود ══
         مسیرِ نمونه‌ها فارسی است و تنها fetchِ غیرِASCIIِ این مخزن؛ اگر
         نرسد، اعلامِ «نمونه‌ای نرسید» می‌رفت و `told` مهر می‌خورد و
         **هرگز** دوباره تلاش نمی‌شد. خواستهٔ صریح «نمونه‌ها رو بفرستی»
         بی هیچ خطایی زمین می‌ماند. */
      var wanted = (r.samples || []).length;
      if (wanted > 0 && made.length === 0) {
        vintLog_(hub, { key: key, name: name, step: step, result: 'نمونه نرسید',
                        run: r.runId || r.run || '',
                        note: 'اعلام عقب افتاد؛ فردا دوباره تلاش می‌شود.' });
        continue;                       // told مهر نمی‌خورد: فردا دوباره
      }
      if (vintAnnounce_(name, key, r, made)) {
        told[key] = nowStr_();
        saveTold();                     // بی‌درنگ، نه پس از حلقه
        out.ready.push(name);
      }
    }
  }

  saveTold();
  if (out.moved > 0) props_().setProperty(PK.VINT_RAT, nowStr_());
  try { props_().setProperty(PK.VINT_RREV, String(doc.rev || '')); } catch (e2) {}
  return out;
}

/**
 * «تمام شد» — با علامت، چون صاحبِ برنامه دقیقاً همین را خواست: «وقتی یه
 * گوینده اضافه شد و کارش تموم شد باید علامت بخوره تا بفهمم می‌تونم گویندهٔ
 * جدید اضافه کنم».
 *
 * و صریح گفته می‌شود که **هنوز در پادکست استفاده نمی‌شود** — چون پل ساخته
 * نشده و «دستورِ کهنه» همان چیزی است که این مخزن یک بخش دربارهٔ آن دارد.
 */
function vintAnnounce_(name, key, r, samples) {
  var lines = [];
  lines.push('✅ گویندهٔ تازه آماده شد: «' + name + '»');
  lines.push('');
  if (r.minutes) lines.push('• دادهٔ تمیزِ آموزش: ' + r.minutes + ' دقیقه');
  if (r.segments) lines.push('• تکه‌های آموزش: ' + r.segments);
  if (r.epochs) lines.push('• دورهای آموزش: ' + r.epochs);
  if (r.similarity) lines.push('• شباهتِ سنجیده‌شده: ' + r.similarity +
                               '  (رضوی روی همین سنجه ۰٫۷۴۴ بود)');
  if (r.runId || r.run) lines.push('• اجرای آموزش: ' + (r.runId || r.run));
  if (r.note) lines.push('• یادداشت: ' + r.note);
  lines.push('');
  if (samples && samples.length) {
    lines.push('نمونه‌های شنیداری (در پوشهٔ «' +
               (CFG.VOICE_AUDIT_FOLDER || 'آزمونِ صدای گویندگان') + '»):');
    for (var i = 0; i < samples.length; i++) lines.push('  ' + samples[i].url);
  } else {
    lines.push('نمونهٔ شنیداری نرسید — سنجش انجام شده ولی فایلی برای شنیدن نیامد.');
  }
  lines.push('');
  lines.push('حالا می‌توانید گویندهٔ بعدی را در پوشهٔ «' +
             (CFG.VOICE_CLONE_FOLDER || 'voice cloning') + '» بگذارید.');
  lines.push('');
  lines.push('⚠️ این مدل هنوز در هیچ قسمتی استفاده نمی‌شود. برای اینکه صدای یک ' +
             'گوینده روی پادکست بنشیند، «پلِ رنگِ صدا» لازم است که هنوز ساخته ' +
             'نشده — و ساختش به اجازهٔ خودِ شما بسته است.');

  var body = lines.join('\n');
  /* ══ صفِ ایمیل را «رسید» فرض نکن (۷٫۲۲) ══
     CLAUDE.md صریح است: «Callers that treat a queued notice as delivered
     must check the return value» — چون صفِ خرابِ بی‌صدا یعنی هشدار گم
     می‌شود، که دقیقاً همان چیزی است که هشدار برایش هست. ۷٫۲۱ مقدارِ
     برگشتی را دور می‌ریخت و `told` را مهر می‌زد، پس تنها اعلامِ این
     قابلیت برای همیشه از بین می‌رفت. */
  var mailed = false, tg = false;
  try { mailed = (mailQueue_('گویندهٔ تازه', '✅ گویندهٔ تازه آماده شد: ' + name, body) !== false); }
  catch (e) { mailed = false; }
  try { tg = (tgSend_(body) !== false); } catch (e2) { tg = false; }
  try { logLine_('گویندهٔ تازه آماده شد: ' + name + ' (' + key + ') — ' +
                 'ایمیل: ' + (mailed ? 'صف' : 'نشد') + ' · تلگرام: ' + (tg ? 'رفت' : 'نشد')); } catch (e3) {}
  // هیچ‌کدام نرفت ⇒ اعلام انجام نشده؛ فردا دوباره.
  return mailed || tg;
}

/**
 * حالِ امروز — یک جملهٔ فارسیِ آماده، **هر روز، حتی وقتی همه‌چیز خوب است**.
 *
 * درسِ ۵٫۹۰: صاحبِ برنامه هیچ شیتی را باز نمی‌کند، پس چیزی که فقط در یک
 * شیت زندگی کند دیده نمی‌شود. و سکوت را نمی‌شود از سلامت تشخیص داد.
 */
function vintCount_(out, step) {
  if (step === VINT_ST.READY) out.ready++;
  else if (step === VINT_ST.GIVEUP) out.abandoned++;
  else if (step === VINT_ST.THIN) out.thin++;
  else if (!step || step === VINT_ST.SEEN || step === VINT_ST.QUEUED) out.waiting++;
  else out.working++;              // آموزش، سنجش، ناموفق، و هر چیزِ دیگر
}

function vintStatus_(hub) {
  var out = { ok: true, speakers: [], ready: 0, working: 0, waiting: 0,
              abandoned: 0, thin: 0, bad: 0, stuckDays: 0, line: '', error: '' };
  if (!vintOn_()) { out.line = 'پذیرشِ گویندهٔ تازه خاموش است.'; return out; }
  try {
    var scan = vintScan_();
    out.bad = (scan.bad || []).length;
    /* ══ «نشد» با «خالی» یکی نیست (۷٫۲۲) ══
       `vintScan_` خطا را داخل خودش می‌گیرد و `{speakers:[]}` برمی‌گرداند.
       تا ۷٫۲۱ هیچ‌کس `scan.error` را نمی‌خواند، پس یک قطعیِ درایو دقیقاً
       شبیهِ «پوشه خالی است» گزارش می‌شد — و بدتر، صف با صفر گوینده
       بازنویسی می‌شد و اکشن می‌شنید «کسی نیست». */
    if (scan.error) {
      out.ok = false; out.error = scan.error;
      out.line = 'گویندهٔ تازه: پوشه خوانده نشد — ' + scan.error +
                 '. تا وقتی این درست نشود، «هیچ گوینده‌ای نیست» را باور نکنید.';
      return out;
    }
    var state = vintState_(hub);
    var seen = {};

    for (var i = 0; i < scan.speakers.length; i++) {
      var sp = scan.speakers[i], cur = state[sp.key] || null;
      seen[sp.key] = 1;
      var step = cur ? cur.step : VINT_ST.SEEN;
      out.speakers.push({ key: sp.key, name: sp.name, step: step,
                          files: sp.files.length, estMinutes: vintEstMinutes_(sp.bytes),
                          minutes: cur ? cur.minutes : '', sim: cur ? cur.sim : '',
                          tries: cur ? cur.tries : 0, at: cur ? cur.at : '' });
      vintCount_(out, step);
    }
    // گوینده‌ای که در کارنامه هست ولی فایل‌هایش دیگر در پوشه نیستند — آماده
    // بوده و کاربر پوشه‌اش را برداشته. گم نمی‌شود.
    for (var k in state) {
      if (!Object.prototype.hasOwnProperty.call(state, k) || seen[k]) continue;
      var s2 = state[k];
      out.speakers.push({ key: k, name: s2.name, step: s2.step, files: 0,
                          estMinutes: 0, minutes: s2.minutes, sim: s2.sim,
                          tries: s2.tries, at: s2.at, gone: true });
      /* ══ گویندهٔ «رفته» هم باید در یک سطل بیفتد (۷٫۲۲) ══
         تا ۷٫۲۱ فقط «آماده» و «رهاشده»ی این شاخه شمرده می‌شدند. پس
         گوینده‌ای که فایل‌هایش برداشته شده ولی هنوز در «دیده‌شد» گیر
         کرده، در هیچ سطلی نمی‌افتاد: `waiting + working` صفر می‌شد،
         دروازهٔ گیرکردن باز نمی‌شد، و سطرِ روزانه **خالی** درمی‌آمد —
         «گویندهٔ تازه —» و هیچ. خالی‌بودنِ سطر بدترین حالت است: نه خبر
         است نه هشدار، فقط شبیهِ سلامت است. */
      vintCount_(out, s2.step);
    }

    /* ══ دو مشکل می‌توانند با هم باشند (۷٫۲۲) ══
       ۷٫۲۱ اینجا `return` می‌کرد: کلِ سطر با پیامِ شناسه جایگزین می‌شد و
       — بدتر — `vintStuckDays_` اصلاً حساب نمی‌شد. یعنی جابه‌جا شدنِ
       فایلِ صف، همان چیزی که گوینده‌ها را زمین می‌گذارد، دروازهٔ
       «گیرکرده» را هم کور می‌کرد. مشکلِ دوم به سطر **اضافه** می‌شود، نه
       اینکه جایش را بگیرد. */
    var qi = vintQueueIdOk_();
    if (!qi.ok) { out.queueId = qi; out.ok = false; }
    /* شناسه و اشتراک دو نیمهٔ یک سؤالند («اکشن می‌تواند بخوانَد؟») و هر
       دو بی‌صدا شکست می‌خورند، پس هر دو اینجا پرسیده می‌شوند. بسته‌بودنی
       که همین‌جا باز شد سلامت را باطل نمی‌کند — ولی گفته می‌شود، چون
       اصلاحی که کسی از آن خبر ندارد، دفعهٔ بعد هم لازم می‌شود. */
    var qs = vintQueueShare_();
    if (!qs.ok) out.queueShare = qs;
    out.stuckDays = vintStuckDays_(hub);
    var days = Math.max(1, Number(CFG.VOICE_STUCK_DAYS) || 3);
    var stuck = (out.waiting + out.working) > 0 && out.stuckDays >= days;
    out.ok = !stuck && !out.queueId && !(out.queueShare && !out.queueShare.fixed);

    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (e) { return String(n); } };
    if (!out.speakers.length) {
      out.line = 'گویندهٔ تازه: هیچ نمونه‌ای در پوشهٔ «' +
                 (CFG.VOICE_CLONE_FOLDER || 'voice cloning') + '» نیست — ' +
                 'هر وقت خواستید، فایلِ صوتی را با نامِ گوینده آنجا بگذارید.';
    } else {
      var bits = [];
      if (out.ready) bits.push('✅ آماده: ' + fa(out.ready));
      if (out.working) bits.push('در کار: ' + fa(out.working));
      if (out.waiting) bits.push('در نوبت: ' + fa(out.waiting));
      if (out.thin) bits.push('دادهٔ کم: ' + fa(out.thin));
      if (out.abandoned) bits.push('رهاشده: ' + fa(out.abandoned));
      if (out.bad) bits.push('فایلِ نامربوط: ' + fa(out.bad));
      // سطرِ خالی نه خبر است نه هشدار — فقط شبیهِ سلامت است.
      if (!bits.length) bits.push('' + fa(out.speakers.length) + ' گوینده در کارنامه');
      out.line = 'گویندهٔ تازه — ' + bits.join(' · ');
      if (stuck) {
        out.line += ' — و ' + fa(out.stuckDays) + ' روز است هیچ پاسخی از ' +
                    'گردش‌کارِ آموزش نرسیده.';
      }
    }
    if (out.queueId) {
      out.line += ' ⚠️ شناسهٔ «' + (CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json') +
                  '» عوض شده — اکشن دنبالِ ' + out.queueId.want + ' می‌گردد ولی ' +
                  'فایل حالا ' + out.queueId.got + ' است. تا به‌روز نشدنِ ' +
                  'VOICE_QUEUE_ID هیچ گوینده‌ای آموزش نمی‌بیند.';
    }
    if (out.queueShare) {
      out.line += out.queueShare.fixed
        ? ' ⚠️ اشتراکِ «' + (CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json') +
          '» بسته بود و باز شد — تا این لحظه گردش‌کارِ voice-intake به‌جای صف ' +
          'یک صفحهٔ HTML می‌گرفت و قرمز می‌شد.'
        : ' ⚠️ اشتراکِ «' + (CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json') +
          '» بسته است و باز نشد (' + (out.queueShare.error || '—') + ') — تا ' +
          'باز نشود، گردش‌کارِ voice-intake صف را نمی‌بیند و هیچ گوینده‌ای ' +
          'آموزش نمی‌بیند.';
    }
  } catch (e) {
    out.error = e.message; out.ok = false;
    out.line = 'گویندهٔ تازه: وارسی ناموفق بود — ' + e.message;
  }
  return out;
}

/**
 * چند روز است که یک گویندهٔ ناتمام هیچ حرکتی نکرده.
 *
 * ══ چرا از تاریخچه و نه از یک ویژگی (۷٫۲۲) ══
 *
 * نسخهٔ ۷٫۲۱ این را از `PK.VINT_QAT` می‌خواند، و `vintQueue_` همان ویژگی
 * را **هر شب** دوباره مهر می‌زد. یعنی جواب همیشه صفر بود و یافتهٔ
 * `voice-intake-stuck` ساختاراً نمی‌توانست ثبت شود. آزمونش هم سبز بود،
 * چون خودش دستی مقدارِ نُه‌روزه می‌نوشت — حالتی که موتورِ در حالِ اجرا
 * هرگز به آن نمی‌رسد.
 *
 * سؤالِ واقعی این است: «کدام گوینده بیشترین مدت است که تکان نخورده؟» و
 * جوابش در ستونِ «زمان» تبِ کارنامه است — جایی که هیچ‌کس نمی‌تواند
 * ناخواسته تازه‌اش کند.
 */
function vintStuckDays_(hub) {
  var worst = 0;
  try {
    var st = vintState_(hub), now = new Date().getTime();
    for (var k in st) {
      if (!Object.prototype.hasOwnProperty.call(st, k)) continue;
      var s = st[k];
      if (!s.step || vintIsDone_(s.step)) continue;
      var t = 0;
      try { t = new Date(String(s.at || '').replace(' ', 'T')).getTime(); } catch (eT) {}
      if (!isFinite(t) || t <= 0) continue;
      var d = Math.floor((now - t) / 86400000);
      if (d > worst) worst = d;
    }
  } catch (e) {}
  return worst;
}

/**
 * درخواستی که بی‌پاسخ بماند، **خودش** یافته است.
 *
 * این همان درسِ بانکِ موسیقی است — هفت آرزو، صفر فایل، هفت هفته — با این
 * تفاوت که از روزِ اول اعمال می‌شود نه پس از هفت هفته. و یک شبِ بد یافته
 * نمی‌سازد: `VOICE_STUCK_DAYS` روز لازم است، چون هشداری که برای یک شبِ بد
 * بیاید همان هشداری است که آدم یاد می‌گیرد نادیده بگیرد.
 */
function vintStuckCheck_(hub, st) {
  try {
    var days = Math.max(1, Number(CFG.VOICE_STUCK_DAYS) || 3);
    if (!st || st.stuckDays < days) return false;
    if ((st.waiting + st.working) <= 0) return false;
    logSelfFinding_(hub || getHub_(), {
      priority: 'جدی', category: 'گویندهٔ تازه', key: 'voice-intake-stuck',
      title: 'صفِ گویندگان ' + st.stuckDays + ' روز است بی‌پاسخ مانده',
      detail: (st.waiting + st.working) + ' گوینده در «' +
              (CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json') + '» منتظرند و ' +
              'هیچ پاسخی در ' + (CFG.VOICE_RESULT_PATH || 'docs/voices.json') +
              ' ننشسته. موتور نمی‌تواند آموزش بدهد؛ تا وقتی گردش‌کارِ ' +
              'voice-intake کار نکند، هیچ گوینده‌ای آماده نمی‌شود.',
      instruction: 'در گیت‌هاب تبِ Actions را ببین: گردش‌کارِ `voice-intake` ' +
                   'اجرا شده؟ قرمز است؟ صفِ درایو «هرکس با لینک» هست؟ ' +
                   'اگر اجرا سبز است ولی docs/voices.json عوض نشده، مرحلهٔ ' +
                   'نوشتنِ نتیجه را نگاه کن. پس از اصلاح، فردا همین‌جا ' +
                   'وارسی کن که ردیفِ تازه‌ای در «کارنامهٔ گویندگان» نشسته باشد.',
      owner: ROWNER_CODE
    });
    return true;
  } catch (e) { return false; }
}

/**
 * کارِ یک گوینده که تمام شد: اشتراک پس گرفته می‌شود و نمونه‌هایش به بایگانی
 * می‌روند.
 *
 * ══ چرا هر دو با هم، و چرا با مهلت ══
 *
 * اشتراکِ «هرکس با لینک» برای رانرِ بی‌هویت لازم بود، ولی برای همیشه نه —
 * همان الگوی `styleProbeUnshare_` و `ytShareSweep_`. و مهلت لازم است چون
 * بی آن همان شبی که صف نوشته شد اشتراک برداشته می‌شود و اکشن فردا دستش
 * خالی می‌مانَد؛ یعنی دقیقاً همان چیزی که اشتراک برایش گذاشته شده بود.
 *
 * ترتیب عمدی است: **اول اشتراک، بعد جابه‌جایی.** برعکسش یعنی فایل رفته به
 * بایگانی و `vintScan_` دیگر نمی‌بیندش، پس اشتراکش تا ابد باز می‌مانَد —
 * یک نشتیِ خاموش که هیچ خطایی نمی‌دهد.
 *
 * و جابه‌جایی به این دلیل است که صاحبِ برنامه پرسید «از کجا بفهمم می‌توانم
 * گویندهٔ بعدی را اضافه کنم؟» — پوشه‌ای که فقط کارِ در جریان را نشان دهد،
 * خودش جواب است. هیچ‌چیز پاک نمی‌شود؛ فقط یک پله پایین‌تر می‌رود.
 */
function vintRetire_() {
  var hours = Number(CFG.VOICE_SHARE_HOURS);
  if (!isFinite(hours) || hours <= 0) hours = 240;
  var cut = new Date().getTime() - hours * 3600 * 1000;
  var out = { unshared: 0, archived: 0 };
  try {
    var state = vintState_();
    var scan = vintScan_();
    if (scan.error) return out;          // «نشد» ≠ «کسی نیست»
    if (!scan.speakers.length) return out;
    var par = vintCloneFolder_(), arc = null;
    var keep = vintKeepSet_();           // یک بار خوانده می‌شود، نه یک بار به ازای هر گوینده

    for (var i = 0; i < scan.speakers.length; i++) {
      var sp = scan.speakers[i], cur = state[sp.key] || null;
      if (!cur || !vintIsDone_(cur.step)) continue;   // هنوز کار دارد
      /* ══ گویندهٔ «از قبل آماده» دست نمی‌خورد (۷٫۲۲) ══
         رضوی با `preexisting` در `docs/voices.json` نشسته، و نمونه‌هایش
         همان هشت ضبطی‌اند که `tools/voicetrain.py` با شناسه برمی‌دارد و
         `voice-lab.yml` برای هر سنجش دانلود می‌کند — هر دو **ناشناس**،
         پس هر دو به «هرکس با لینک» نیاز دارند. ۷٫۲۱ شبِ یازدهم پس از
         نصب اشتراک را پس می‌گرفت و پوشه را بایگانی می‌کرد، و از آن پس
         هر آموزش و هر سنجش با خطایی که هیچ‌چیز را نام نمی‌برد شکست
         می‌خورد. CLAUDE.md همین کارها را «معلق» فهرست کرده: دورهای ۲۶ و
         ۲۹ هنوز سنجیده نشده‌اند. */
      if (keep[sp.key]) continue;
      var t = 0;
      try { t = new Date(cur.at).getTime(); } catch (eT) {}
      if (!isFinite(t) || t > cut) continue;

      for (var j = 0; j < sp.files.length; j++) {
        try { if (driveShareOff_(sp.files[j].id)) out.unshared++; } catch (eO) {}
      }

      if (!arc) arc = vintArchiveFolder_();
      var movedAny = false;
      if (sp.source === 'پوشه') {
        try {
          var di = par.getFoldersByName(sp.name);
          if (di.hasNext()) {
            var d = di.next();
            if (typeof d.moveTo === 'function') d.moveTo(arc);
            else { arc.addFolder(d); par.removeFolder(d); }
            movedAny = true;
          }
        } catch (eM) {}
      } else {
        for (var k = 0; k < sp.files.length; k++) {
          try {
            var f = DriveApp.getFileById(sp.files[k].id);
            if (typeof f.moveTo === 'function') f.moveTo(arc);
            else { arc.addFile(f); par.removeFile(f); }
            movedAny = true;
          } catch (eF) {}
        }
      }
      if (movedAny) {
        out.archived++;
        vintLog_(null, { key: sp.key, name: sp.name, step: cur.step, result: 'بایگانی',
                         files: sp.files.length,
                         note: 'نمونه‌ها به «' + (CFG.VOICE_CLONE_ARCHIVE || 'بایگانی') +
                               '» رفتند و اشتراکشان پس گرفته شد. پاک نشده‌اند.' });
      }
    }
  } catch (e) {
    try { logLine_('بایگانیِ نمونه‌های گوینده ناموفق: ' + e.message); } catch (e2) {}
  }
  return out;
}

/**
 * راهنمای درایو — یک نسخه در گیت، آینه در درایو.
 *
 * دقیقاً همان مسیرِ `outReadmeSync_`. درسِ ۵٫۸۵ عیناً: «دو کپی از یک متن که
 * با دست هم‌گام نگه داشته شوند» یازده نسخه هزینه داد. پس این فایل در درایو
 * **دست‌نویس نمی‌شود**؛ هر شب از روی `docs/voice_intake.md` بازنویسی می‌شود.
 */
function vintGuideSync_() {
  var name = String(CFG.VOICE_GUIDE_FILE || '');
  var path = String(CFG.VOICE_GUIDE_PATH || '');
  if (!name || !path) return { ok: false, reason: 'تنظیم نشده' };
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(path),
              { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return { ok: false, reason: 'HTTP ' + res.getResponseCode() };
    var body = res.getContentText('UTF-8');
    if (!body || body.length < 50) return { ok: false, reason: 'متنِ کوتاه' };
    var folder = vintCloneFolder_();
    var it = folder.getFilesByName(name), wrote = false;
    while (it.hasNext()) {
      var f = it.next();
      if (!wrote) { f.setContent(body); wrote = true; }
      else { try { f.setTrashed(true); } catch (eD) {} }   // هم‌نامِ تکراری: دامِ dups
    }
    if (!wrote) folder.createFile(name, body, 'text/plain');
    return { ok: true };
  } catch (e) { return { ok: false, reason: e.message }; }
}

/**
 * یک دورِ کامل. نقطهٔ ورودِ شبانه و همان چیزی که دکمهٔ منو صدا می‌زند.
 *
 * ترتیب عمدی است: اول **برداشتنِ پاسخ** (وگرنه صفِ امشب روی حالِ دیروز
 * نوشته می‌شود و گوینده‌ای که همین حالا آماده شده دوباره به صف می‌رود)،
 * بعد صف، بعد خانه‌داری.
 */
function vintNightly_(force) {
  var out = { on: vintOn_(), ingest: null, queued: 0, unshared: 0, archived: 0, status: null };
  if (!out.on && !force) return out;
  var hub = null;
  try { hub = getHub_(); } catch (eH) {}

  try {
    out.ingest = vintIngest_(hub);
    /* ══ ردیفی که ساخته شود و کسی نداند، ساخته نشده است ══
       صاحبِ برنامه شیت باز نمی‌کند؛ خواستهٔ صریحش این بود که «وقتی یه
       گوینده اضافه شد … باید علامت بخوره». پس ساختِ ردیف خبر دارد، و
       خبر می‌گوید که **خاموش** است و روشن کردنش با اوست. */
    var st2 = (out.ingest && out.ingest.styled) || [];
    if (st2.length) {
      mailQueue_('گویندهٔ تازه',
        'روحِ خواندن اندازه گرفته شد: ' + st2.join('، '),
        'برای ' + st2.join('، ') + ' کارتِ سبک از ضبط‌های خودشان ' +
        'اندازه‌گیری شد و در تبِ «صداها» ردیف گرفت — مکث، کشش، ریتم، ' +
        'دامنه. ردیف **خاموش** است: تا روشنش نکنید هیچ قسمتی عوض ' +
        'نمی‌شود. ستونِ «حالت‌ها» برچسبِ وایب ندارد چون آن قضاوتِ شماست؛ ' +
        'حالتِ بی‌برچسب هرگز انتخاب نمی‌شود و دستورِ پایه اجرا می‌شود. ' +
        'نکته: این رنگِ صدا نیست — شیوهٔ خواندن است.');
    }
  }
  catch (e1) { try { logLine_('خواندنِ پاسخِ گویندگان ناموفق: ' + e1.message); } catch (e1b) {} }

  var scan = null, state = null;
  try {
    scan = vintScan_();
    if (scan.error) throw new Error('پوشه خوانده نشد: ' + scan.error);
    state = vintState_(hub);
    // گویندهٔ تازه‌ای که هنوز هیچ ردیفی ندارد: همان شب ثبت می‌شود، تا
    // «از کِی دیده شد» جوابِ قابلِ وارسی داشته باشد.
    for (var i = 0; i < scan.speakers.length; i++) {
      var sp = scan.speakers[i];
      if (state[sp.key]) continue;
      vintLog_(hub, { key: sp.key, name: sp.name, step: VINT_ST.SEEN, result: 'ok',
                      files: sp.files.length, minutes: '~' + vintEstMinutes_(sp.bytes),
                      note: 'نمونه‌ها در پوشه دیده شدند (' + sp.source + ').' });
      state[sp.key] = { key: sp.key, name: sp.name, step: VINT_ST.SEEN, tries: 0, at: nowStr_() };
    }
    var q = vintQueue_(hub, scan, state);
    out.queued = (q.speakers || []).length;
  } catch (e2) { logLine_('صفِ گویندگان ساخته نشد: ' + e2.message); }

  try { var rt = vintRetire_(); out.unshared = rt.unshared; out.archived = rt.archived; } catch (e3) {}
  try { vintGuideSync_(); } catch (e4) {}
  try {
    out.status = vintStatus_(hub);
    vintStuckCheck_(hub, out.status);
  } catch (e5) {}
  return out;
}

/** منو: «🎤 گویندهٔ تازه — وارسیِ پوشه و صف». */
function runVoiceIntake() {
  var ui = ui_();
  var r = vintNightly_(true);
  var st = r.status || {};
  var msg = [];
  msg.push(st.line || '—');
  msg.push('');
  msg.push('در صف برای آموزش: ' + r.queued);
  if (r.ingest) msg.push('پاسخ‌های خوانده‌شده: ' + r.ingest.moved);
  var list = st.speakers || [];
  if (list.length) {
    msg.push('');
    for (var i = 0; i < list.length && i < 12; i++) {
      var s = list[i];
      msg.push('• ' + s.name + ' — ' + s.step +
               ' (' + s.files + ' فایل' +
               (s.minutes ? '، ' + s.minutes + ' دقیقه' : '') +
               (s.sim ? '، شباهت ' + s.sim : '') + ')');
    }
  }
  msg.push('');
  msg.push('پوشه: «' + (CFG.VOICE_CLONE_FOLDER || 'voice cloning') +
           '» در ریشهٔ OUTPUT. راهنمایش همان‌جاست.');
  if (ui) ui.alert('گویندهٔ تازه', msg.join('\n'), ui.ButtonSet.OK);
  return r;
}
