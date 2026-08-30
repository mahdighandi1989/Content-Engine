/* ═════════════════════════════════════════════════════════════════════════
   بخشِ ۲۳ — بانکِ موسیقی و افکت

   ══ چه چیزی اینجا شدنی است و چه چیزی نیست ══

   کلِ زنجیرهٔ صدا در این موتور روی یک قالبِ واحد می‌چرخد: PCM ۲۴ کیلوهرتز،
   ۱۶ بیت، تک‌کاناله. تکه‌ها به‌صورتِ رشتهٔ base64 به هم چسبانده می‌شوند و هدرِ
   ۵۴ بایتی فقط یک بار سرِ فایل نوشته می‌شود. یعنی *چسباندن* صدا ارزان است.

   پس این‌ها شدنی‌اند و همین‌جا انجام می‌شوند:
     • موسیقیِ آغاز و پایان، و قطعهٔ کوتاه میانِ بخش‌ها
     • بریدنِ هر تکه از هر جای موسیقی (ثانیهٔ شروع و طول)
     • کم و زیادکردنِ بلندی، و محوِ نرم در ابتدا و انتها
     • تبدیلِ خودکارِ فایل‌های بانک به قالبِ موتور (نرخ، کانال، عمق)

   و این یکی *در Apps Script* شدنی نیست: پخشِ موسیقی **زیرِ** صدای گوینده در
   تمامِ قسمت. آن کار یعنی جمعِ نمونه‌به‌نمونهٔ دو موج در حدود چهارده میلیون
   نمونه، و مهلتِ شش‌دقیقه‌ایِ گوگل جوابش را نمی‌دهد. راهش هست — مخلوط‌کردن در
   همان حلقه‌ای که هر تکه ساخته می‌شود — ولی کارِ جداگانه‌ای است و اینجا وعده‌اش
   داده نمی‌شود.

   ══ فرمتِ فایل‌های بانک ══
   فقط WAV. رمزگشاییِ MP3 در Apps Script ممکن نیست و هیچ کتابخانه‌ای هم در
   دسترس نیست. فایلی که WAV نباشد در فهرست ثبت می‌شود ولی با نشانِ «قالب
   ناسازگار» کنار گذاشته می‌شود تا بی‌صدا نادیده گرفته نشود.
   ═════════════════════════════════════════════════════════════════════════ */

/** نامِ پروندهٔ درخواستِ موسیقی — یک جا، تا وارسیِ چیدمان هم همان را بشناسد. */
function MUSIC_WISH_() { return CFG.MUSIC_WISH_FILE || '_MUSIC-WISH.json'; }

/** پوشهٔ بانک در OUTPUT؛ اگر نبود ساخته می‌شود. */
function musicFolder_() {
  var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  var name = CFG.MUSIC_FOLDER || 'موسیقی و افکت';
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/**
 * خواندنِ هدرِ WAV.
 *
 * هدر را چانک‌به‌چانک می‌پیماید، نه با جای ثابت: فایل‌هایی که از ابزارهای
 * مختلف بیرون می‌آیند چانک‌های اضافه (LIST، fact، …) پیش از data دارند و
 * فرضِ «داده از بایتِ ۴۴» آن‌ها را خرد می‌کند.
 */
function wavInfo_(b) {
  var u8 = function (i) { return b[i] < 0 ? b[i] + 256 : b[i]; };
  var u16 = function (i) { return u8(i) | (u8(i + 1) << 8); };
  var u32 = function (i) { return (u8(i) | (u8(i + 1) << 8) | (u8(i + 2) << 16)) + u8(i + 3) * 16777216; };
  var tag = function (i) { return String.fromCharCode(u8(i), u8(i + 1), u8(i + 2), u8(i + 3)); };

  if (b.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  var pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    var id = tag(pos), sz = u32(pos + 4);
    if (id === 'fmt ') {
      fmt = { format: u16(pos + 8), channels: u16(pos + 10), rate: u32(pos + 12),
              bits: u16(pos + 22) };
      /* WAVE_FORMAT_EXTENSIBLE (0xFFFE = 65534) هم PCM است — قالبِ واقعی
         در GUIDِ زیرقالب می‌آید که دو بایتِ اولش همان کدِ قالب است. هر
         فایلِ ۲۴بیتی یا چندکاناله‌ای که از یک DAW بیرون بیاید معمولاً
         همین است. */
      if (fmt.format === 65534 && sz >= 40) fmt.sub = u16(pos + 8 + 24);
    } else if (id === 'data') {
      data = { at: pos + 8, len: Math.min(sz, b.length - pos - 8) };
      break;
    }
    pos += 8 + sz + (sz % 2);          // چانک‌ها روی مرزِ زوج می‌نشینند
  }
  if (!fmt || !data) return null;
  fmt.dataAt = data.at; fmt.dataLen = data.len;
  fmt.seconds = data.len / (fmt.rate * fmt.channels * (fmt.bits / 8));
  return fmt;
}

/**
 * آیا این PCMِ صحیحِ علامت‌دار است؟ (همان چیزی که musicSamples_ می‌خواند)
 *
 * ══ باگی که پنج فایلِ سالم را رد کرد ══
 * ۲۴ اوت، در `_MUSIC-FEED.json`: پنج نامزد با «خوانده نشد یا PCM نیست» رد
 * شده بودند — از جمله سه فایلِ CC0 از OpenGameArt که تسک خودش وارسی کرده
 * بود. علتش این بود که سه جای کد `info.format !== 1` می‌گفتند، و
 * WAVE_FORMAT_EXTENSIBLE (۶۵۵۳۴) هم PCM است ولی عددش ۱ نیست. هر فایلِ
 * ۲۴بیتی یا چندکاناله‌ای که از یک DAW بیرون بیاید معمولاً همین است.
 *
 * و قالبِ ۳ (اعشاریِ IEEE) عمداً رد می‌شود: نمونه‌هایش عدد صحیح نیستند و
 * musicSamples_ آن‌ها را نویز می‌خوانَد — یعنی رد کردنش درست است، ولی
 * پیامش باید راست باشد نه «PCM نیست».
 */
function wavIsPcm_(info) {
  if (!info) return false;
  if (info.format === 1) return true;
  if (info.format === 65534) return !info.sub || info.sub === 1;
  return false;
}

/** آیا این فایل همان قالبی است که موتور با آن کار می‌کند؟ */
function musicNative_(info) {
  return wavIsPcm_(info) && info.channels === 1 &&
         info.bits === 16 && info.rate === (CFG.SAMPLE_RATE || 24000);
}

/**
 * نمونه‌های ۱۶ بیتیِ تک‌کاناله با نرخِ موتور، از هر WAVِ PCM.
 *
 * تبدیل عمداً ساده است: میانگینِ کانال‌ها برای تک‌کاناله‌کردن، و درون‌یابیِ
 * خطی برای نرخ. برای قطعه‌های کوتاهِ بانک (چند ده ثانیه) هم کافی است هم سریع.
 * فیلترِ ضدِ نام‌آوا ندارد؛ برای موسیقیِ پس‌زمینه شنیده نمی‌شود.
 */
function musicSamples_(b, info, startSec, lenSec) {
  var bps = info.bits / 8, ch = info.channels;
  var frameB = bps * ch;
  var total = Math.floor(info.dataLen / frameB);
  var from = Math.max(0, Math.floor((Number(startSec) || 0) * info.rate));
  var want = (Number(lenSec) > 0) ? Math.floor(lenSec * info.rate) : (total - from);
  if (from >= total) return [];
  /* ── باگی که «موسیقیِ یک‌ثانیه‌ای» را ساخت ──
   * مدل برای هر جایگاه یک `startSec` می‌دهد تا بهترین جای قطعه شنیده شود.
   * هیچ‌جا وارسی نمی‌شد که از آن ثانیه به بعد، اصلاً به‌اندازهٔ طولِ خواسته‌شده
   * صدا مانده باشد. `want = min(want, total - from)` بی‌صدا کوتاهش می‌کرد:
   * روی قطعهٔ ۲۴ثانیه‌ای با startSec=۲۳، از هشت ثانیه یک ثانیه می‌رسید.
   * هیچ خطایی هم نمی‌داد — فقط در گوش شنیده می‌شد.
   * حالا اگر قطعه جا دارد، شروع عقب کشیده می‌شود تا طولِ کامل برسد. */
  if (Number(lenSec) > 0 && from + want > total) from = Math.max(0, total - want);
  want = Math.min(want, total - from);

  var rd = function (fr, c) {
    var i = info.dataAt + (fr * frameB) + (c * bps);
    // بایت‌های Apps Script علامت‌دارند. اگر بایتِ بالا پیش از جابه‌جایی ماسک
    // نشود، هر نمونهٔ منفی عددی بی‌معنا می‌شود — و چون خطایی نمی‌دهد، فقط در
    // گوش شنیده می‌شود. آزمونِ ۵.۱ همین را گرفت.
    var u = function (k) { return b[k] < 0 ? b[k] + 256 : b[k]; };
    if (info.bits === 16) {
      var v = u(i) | (u(i + 1) << 8);
      return (v & 0x8000) ? v - 65536 : v;
    }
    if (info.bits === 8) { return (u(i) - 128) * 256; }
    // ۲۴ و ۳۲ بیتی: بالاترین دو بایت کافی است
    var w = u(i + bps - 2) | (u(i + bps - 1) << 8);
    return (w & 0x8000) ? w - 65536 : w;
  };

  var mono = [];
  for (var f = 0; f < want; f++) {
    var s = 0;
    for (var c = 0; c < ch; c++) s += rd(from + f, c);
    mono.push(s / ch);
  }

  var srcRate = info.rate, dstRate = CFG.SAMPLE_RATE || 24000;
  if (srcRate === dstRate) return mono;
  var outN = Math.floor(mono.length * dstRate / srcRate), out = [];
  for (var o = 0; o < outN; o++) {
    var x = o * srcRate / dstRate, i0 = Math.floor(x), fr2 = x - i0;
    var a = mono[i0] || 0, bb = (i0 + 1 < mono.length) ? mono[i0 + 1] : a;
    out.push(a + (bb - a) * fr2);
  }
  return out;
}

/** بلندی و محوِ نرمِ ابتدا و انتها، روی خودِ نمونه‌ها.
    از ۶٫۷۰ محو شیبِ S دارد (xfRc_ در بخشِ ۳)، نه خطی: شیبِ خطی در لحظهٔ
    رسیدن به سکوت هنوز با سرعتِ کامل پایین می‌رود و گوش آن را «قطع»
    می‌شنود؛ S در هر دو سر شیبِ صفر دارد — فرودِ نرم، نه سقوط. */
function musicShape_(samples, gain, fadeInSec, fadeOutSec) {
  var g = (Number(gain) >= 0) ? Number(gain) : 1;
  var sr = CFG.SAMPLE_RATE || 24000;
  var fi = Math.min(Math.floor((Number(fadeInSec) || 0) * sr), samples.length);
  var fo = Math.min(Math.floor((Number(fadeOutSec) || 0) * sr), samples.length);
  var n = samples.length;
  for (var i = 0; i < n; i++) {
    var m = g;
    if (fi && i < fi) m *= xfRc_(i / fi);
    if (fo && i >= n - fo) m *= xfRc_((n - i) / fo);
    var v = Math.round(samples[i] * m);
    samples[i] = v > 32767 ? 32767 : (v < -32768 ? -32768 : v);
  }
  return samples;
}

/* ── بسترِ پایانی (۶٫۷۰) ──
   خواستهٔ صاحبِ برنامه، کلمه‌به‌کلمه: «زمانی که می‌خواد تموم بشه، از چند
   ثانیه قبل از اینکه گوینده آخرین جملات رو بگه موسیقی شروع به پخش کنه با
   شیبِ ملایم و بعدش کم‌کم زیاد بشه.»
   پس سرِ قطعهٔ پایان دو مرحله دارد: `underSec` ثانیهٔ اول از سکوت تا سطحِ
   «بستر» (bed) بالا می‌آید — این همان تکه‌ای است که زیرِ جمله‌های آخر
   می‌نشیند — و بعد در `riseSec` ثانیه از بستر تا بلندیِ کامل اوج می‌گیرد.
   هر دو با شیبِ S.

   شکل **در خودِ قطعه** است، نه در تلفیق — درسِ ۵٫۸۴: دو جا که یک ناحیه را
   شکل بدهند، حاصلْ ضربِ دو شیب است و موسیقی زودتر از آنچه باید می‌میرد.
   و همین باعث می‌شود اگر تلفیق اصلاً جا نشد (تکهٔ گفتارِ کوتاه)، باز هم
   ورودِ موسیقی نرم باشد: شیب همراهِ خودِ قطعه است. */
function musicBedIn_(samples, underSec, riseSec, bed) {
  var sr = CFG.SAMPLE_RATE || 24000, n = samples.length;
  var b = Number(bed); if (!(b > 0 && b < 1)) b = 0.35;
  var un = Math.max(0, Math.floor((Number(underSec) || 0) * sr));
  var rn = Math.max(0, Math.floor((Number(riseSec) || 0) * sr));
  // قطعهٔ کوتاه: سرِ بستر نباید کلِ قطعه را بخورد — هر دو سهم با هم کوچک
  // می‌شوند تا دستِ‌کم ۳۰٪ از قطعه با بلندیِ کامل بماند.
  var cap = Math.floor(n * 0.7);
  if (un + rn > cap && un + rn > 0) {
    var sc = cap / (un + rn);
    un = Math.floor(un * sc); rn = Math.floor(rn * sc);
  }
  for (var i = 0; i < un + rn && i < n; i++) {
    var g = (i < un) ? b * xfRc_(un ? i / un : 1)
                     : b + (1 - b) * xfRc_(rn ? (i - un) / rn : 1);
    var v = Math.round(samples[i] * g);
    samples[i] = v > 32767 ? 32767 : (v < -32768 ? -32768 : v);
  }
  return samples;
}

/** نمونه‌ها → رشتهٔ base64ِ همان قالبی که حلقهٔ صداگذاری می‌فهمد. */
function musicB64_(samples) {
  var bytes = [];
  for (var i = 0; i < samples.length; i++) {
    var v = samples[i] | 0;
    if (v < 0) v += 65536;
    var lo = v & 255, hi = (v >>> 8) & 255;
    bytes.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi);
  }
  return alignB64_(Utilities.base64Encode(bytes));
}

/**
 * یک قطعهٔ آمادهٔ چسباندن از یک فایلِ بانک.
 * برمی‌گرداند: رشتهٔ base64، یا '' اگر فایل به درد نخورد.
 */
function musicClip_(fileId, opt) {
  opt = opt || {};
  try {
    var b = DriveApp.getFileById(fileId).getBlob().getBytes();
    var info = wavInfo_(b);
    if (!wavIsPcm_(info)) return '';
    var cap = Number(CFG.MUSIC_MAX_CLIP_SEC) || 45;
    var len = Math.min(Number(opt.lenSec) || cap, cap);
    var s = musicSamples_(b, info, opt.startSec || 0, len);
    if (!s.length) return '';
    musicShape_(s, opt.gain, opt.fadeIn, opt.fadeOut);
    // بسترِ پایانی روی سرِ قطعه — بعد از بلندی و محو، که فقط پوششِ حجمی است
    // روی ناحیه‌ای که محوِ ورود نگرفته (fadeIn آن حالت صفر است).
    if (opt.bedIn) musicBedIn_(s, opt.bedIn.under, opt.bedIn.rise, opt.bedIn.bed);
    return musicB64_(s);
  } catch (e) {
    logLine_('قطعهٔ موسیقی خوانده نشد (' + fileId + '): ' + e.message);
    return '';
  }
}

/* ───────────────────────────── فهرستِ بانک ───────────────────────────── */

var MUSIC_HEADERS = ['شناسهٔ فایل', 'نام', 'نوع', 'حال‌وهوا', 'مناسب برای',
                     'مدت (ثانیه)', 'قالب', 'بلندی', 'بارِ استفاده',
                     'آخرین استفاده', 'یادداشت', 'سرشتِ اندازه‌گیری‌شده', 'منبع',
                     'لینک', 'تأییدِ شنیداری'];
var MC = { ID: 1, NAME: 2, KIND: 3, MOOD: 4, SLOTS: 5, SEC: 6, FMT: 7,
           GAIN: 8, USED: 9, LAST: 10, NOTE: 11, PROBE: 12, SRC: 13, LINK: 14,
           HEARD: 15 };

/* تبِ تاریخچه: هر بار که قطعه‌ای واقعاً پخش شد، یک ردیف.
   ستونِ «بارِ استفاده» فقط یک عدد است و «آخرین استفاده» فقط آخری را نگه
   می‌دارد؛ هیچ‌کدام نمی‌گویند این قطعه در کدام قسمت‌ها و در کدام جایگاه
   پخش شده. آن سؤال را فقط یک تاریخچه جواب می‌دهد. */
var MUSE_HEADERS = ['تاریخ', 'برنامه', 'قسمت', 'جایگاه', 'قطعه', 'نوع',
                    'حال‌وهوا', 'بلندی', 'ثانیه', 'لینک'];
var MU = { AT: 1, SHOW: 2, EP: 3, SLOT: 4, NAME: 5, KIND: 6,
           MOOD: 7, GAIN: 8, SEC: 9, LINK: 10 };

function musicUrl_(id) {
  return id ? 'https://drive.google.com/file/d/' + String(id) + '/view' : '';
}

/**
 * پویشِ پوشهٔ بانک و به‌روزکردنِ تب.
 *
 * ستون‌هایی که آدم پر می‌کند — حال‌وهوا، مناسب برای، بلندی، یادداشت — هرگز
 * بازنویسی نمی‌شوند. فقط چیزهایی که از خودِ فایل خوانده می‌شوند (مدت، قالب)
 * تازه می‌شوند. وگرنه هر پویش، سلیقهٔ کاربر را پاک می‌کرد.
 */
function musicScan_(hub) {
  hub = hub || getHub_();
  var sh = ensureTab_(hub, CFG.MUSIC_TAB || 'موسیقی', MUSIC_HEADERS);
  var last = sh.getLastRow();
  var rows = last > 1 ? sh.getRange(2, 1, last - 1, MUSIC_HEADERS.length).getValues() : [];
  var byId = {};
  for (var i = 0; i < rows.length; i++) byId[String(rows[i][MC.ID - 1])] = { row: i + 2, v: rows[i] };

  var seen = {}, added = 0, updated = 0, bad = 0, skipped = 0;
  /* شناسنامهٔ بی‌صدا: `_MUSIC-META-X.json` که `X.wav` کنارش نیست.
     ۲۳ اوت دو تا از این‌ها در پوشه بودند — تسکِ غنی‌سازی فایل را ساخته و
     شناسنامه‌اش را نوشته بود، ولی خودِ صدا فقط به گفت‌وگو پیوست شده بود و
     هرگز به درایو نرسید. این بدترین شکلِ خرابی است: شناسنامه می‌گوید قطعه
     هست، و نیست. تا امروز هیچ‌کس نمی‌دیدش چون پویش شناسنامه‌ها را کلاً رد
     می‌کرد. */
  var metaOf = {}, wavOf = {};
  var it = musicFolder_().getFiles();
  while (it.hasNext()) {
    var f = it.next(), id = f.getId();
    // شناسنامه‌های خودِ موتور قطعه نیستند و نباید در فهرست بنشینند.
    //
    // ۲۳ اوت، ۱۴:۰۵: «۶ ناسازگار» در پیامِ پویش، در واقع شش فایلِ
    // _MUSIC-META-*.json بود که کنارِ هر قطعه گذاشته می‌شود. musicBank_
    // ردشان می‌کرد پس هرگز پخش نمی‌شدند، ولی در تب می‌نشستند و عددِ
    // «ناسازگار» را بی‌دلیل بالا می‌بردند — یعنی سنجه‌ای که آدم باید به آن
    // نگاه کند، چیزی می‌گفت که معنایش آن نبود.
    //
    // فایلِ صوتیِ واقعاً ناسازگار (MP3ی که کاربر گذاشته) همچنان فهرست و
    // علامت می‌خورد؛ آن هشدارِ درستی است و باید بماند.
    var mm = String(f.getName()).match(/^_MUSIC-META-(.+)\.json$/i);
    if (mm) { metaOf[mm[1]] = 1; continue; }
    wavOf[String(f.getName()).replace(/\.wav$/i, '')] = 1;
    seen[id] = 1;

    /* ── ردیفی که قبلاً کامل سنجیده شده، دوباره خوانده نمی‌شود ──
     *
     * ══ چرا لازم شد ══
     * این حلقه بایتِ *هر* فایل را می‌خواند تا wavInfo_ و musicProbe_ را
     * بسنجد. با چهار فایل چند ثانیه بود؛ با یازده فایل و ~۶۰ مگابایت،
     * دقیقه‌ها. و این پویش در کارِ شبانه اجرا می‌شود که مهلتش شش دقیقه است
     * — پس هرچه پس از آن بود گرسنه می‌ماند: بایگانیِ پرامپت‌ها، هرسِ
     * گزارش‌ها، و بدتر از همه خودِ نصبِ کد.
     * فایلِ درایو با همان شناسه عوض نمی‌شود، پس اندازه‌گیریِ دوباره چیزی
     * به دست نمی‌دهد. فقط ستون‌های خالی پر می‌شوند.
     */
    var known = byId[id];
    if (known && Number(known.v[MC.SEC - 1]) > 0 &&
        String(known.v[MC.FMT - 1] || '').indexOf('ناسازگار') === -1 &&
        String(known.v[MC.FMT - 1] || '').indexOf('نیست') === -1 &&
        String(known.v[MC.PROBE - 1] || '').trim()) {
      if (!String(known.v[MC.LINK - 1] || '').trim()) {
        try { sh.getRange(known.row, MC.LINK).setValue(musicUrl_(id)); } catch (eL0) {}
      }
      var curH = String(known.v[MC.HEARD - 1] || '').trim();
      // خالی، یا «❓» که حالا تأیید شده. نوشتهٔ خودِ آدم هرگز پاک نمی‌شود.
      if (!curH || curH.charAt(0) === '❓') {
        try {
          var nextH = musicHeardTxt_(musicMeta_(f.getName()));
          if (!curH || nextH.charAt(0) === '✅') {
            sh.getRange(known.row, MC.HEARD).setValue(nextH);
          }
        } catch (eH0) {}
      }
      skipped++;
      continue;
    }

    var info = null, probe = null, bytes = null;
    try { bytes = f.getBlob().getBytes(); info = wavInfo_(bytes); } catch (e) { info = null; }
    // خودِ موج اندازه گرفته می‌شود، نه نامِ فایل. دانلودِ ناقص، سکوت و فایلِ
    // خراب همین‌جا گیر می‌افتند — نه بعداً وسطِ قسمت.
    try { probe = info ? musicProbe_(bytes, info) : null; } catch (eP) { probe = null; }
    var vd = musicVerdict_(probe, info);
    var fmt = !info ? 'قالب ناسازگار (فقط WAV)'
                    : (!vd.ok ? 'ردشد: ' + vd.why
                       : (musicNative_(info) ? 'آماده'
                          : info.rate + 'Hz/' + info.channels + 'ch/' + info.bits + 'bit — تبدیل هنگام استفاده'));
    var sec = info ? Math.round(info.seconds) : 0;
    if (!info || !vd.ok) bad++;
    var meta = musicMeta_(f.getName());
    var probeTxt = probe ? (musicTexture_(probe) + ' · بلندی ' + probe.rms +
                            ' · سکوت ' + probe.silentPct + '٪') : '';
    var srcTxt = meta ? (String(meta.title || '') + ' — ' + String(meta.url || '') +
                         (meta.license ? ' (' + meta.license + ')' : '')) : '';
    /* «جلوه» تا ۵٫۶۵ شاخه‌ای نداشت: افکتی که مدل خودش تأییدش کرده بود، در
       ستون «❓ …» می‌گرفت — یعنی به کاربر می‌گفت «کسی گوش نداده» در حالی که
       داده بود. و بدتر، sfxAllow_ که از ۵٫۶۵ تأییدِ شنیداری می‌خواهد، هرگز
       آن را تأیید نمی‌دید و هیچ افکتی پخش نمی‌شد. */
    var heardTxt = musicHeardTxt_(meta);

    if (byId[id]) {
      var r = byId[id];
      if (String(r.v[MC.SEC - 1]) !== String(sec) || String(r.v[MC.FMT - 1]) !== fmt ||
          String(r.v[MC.PROBE - 1] || '') !== probeTxt) {
        sh.getRange(r.row, MC.SEC, 1, 2).setValues([[sec, fmt]]);
        sh.getRange(r.row, MC.PROBE).setValue(probeTxt);
        if (srcTxt && !String(r.v[MC.SRC - 1] || '').trim()) sh.getRange(r.row, MC.SRC).setValue(srcTxt);
        updated++;
      }
      var cH = String(r.v[MC.HEARD - 1] || '').trim();
      if (!cH || (cH.charAt(0) === '❓' && heardTxt.charAt(0) === '✅')) {
        try { sh.getRange(r.row, MC.HEARD).setValue(heardTxt); } catch (eHd) {}
      }
      // ردیف‌هایی که پیش از افزوده‌شدنِ ستونِ لینک ساخته شده‌اند
      if (!String(r.v[MC.LINK - 1] || '').trim()) {
        try { sh.getRange(r.row, MC.LINK).setValue(musicUrl_(id)); } catch (eL) {}
      }
    } else {
      // نوع و جایگاه از شناسنامهٔ منبع می‌آید اگر باشد، وگرنه از اندازه‌گیری.
      // نامِ فایل آخرین گزینه است، چون کمترین اعتبار را دارد.
      var kind = meta && meta.kind ? String(meta.kind)
                 : ((probe && probe.seconds <= 8 && probe.steadiness < 60) ? 'افکت' : 'موسیقی');
      var slots = meta && meta.slots ? String(meta.slots) : (kind === 'افکت' ? 'میانه' : 'شروع، پایان');
      sh.appendRow([id, f.getName(), kind, (meta && meta.mood) || '', slots, sec, fmt,
                    (meta && meta.gain) || 1, 0, '', '', probeTxt, srcTxt,
                    musicUrl_(id), heardTxt]);
      added++;
    }
  }

  // فایلی که از پوشه برداشته شده، ردیفش می‌ماند ولی نشان می‌خورد — تاریخچهٔ
  // استفاده‌اش نباید گم شود.
  var gone = 0;
  for (var k in byId) {
    if (!byId.hasOwnProperty(k) || seen[k]) continue;
    if (String(byId[k].v[MC.FMT - 1]).indexOf('نیست') !== -1) continue;
    sh.getRange(byId[k].row, MC.FMT).setValue('فایل در پوشه نیست');
    gone++;
  }
  var orphan = [];
  for (var mo in metaOf) {
    if (!Object.prototype.hasOwnProperty.call(metaOf, mo)) continue;
    if (!wavOf[mo]) orphan.push(mo);
  }
  var fixed = { fed: 0, moved: 0, notes: [] };
  if (orphan.length) {
    logLine_('شناسنامهٔ بی‌صدا در بانک: ' + orphan.length + ' — ' +
             orphan.slice(0, 4).join(' · ') +
             ' (فایلِ صوتی‌شان به پوشه نرسیده است).');
    // و همان‌جا حلش می‌کنیم؛ گزارش‌دادن به آدم راه‌حل نیست.
    try { fixed = musicOrphanFix_(orphan); } catch (eOF) {}
  }

  logLine_('بانکِ موسیقی: ' + added + ' تازه، ' + updated + ' به‌روز، ' +
           skipped + ' بی‌تغییر (دوباره خوانده نشد)، ' +
           bad + ' ناسازگار، ' + gone + ' ناموجود.');
  return { added: added, updated: updated, bad: bad, gone: gone,
           skipped: skipped, orphan: orphan, orphanFixed: fixed };
}

/**
 * متنِ ستونِ «تأییدِ شنیداری» از روی شناسنامه.
 *
 * ستون هم برای آدم است هم برای کد، و همین دوگانگی جای باگ بود: کد در ۵٫۶۵
 * انتظار داشت مقدارِ خام («جلوه») را ببیند، ولی آنچه نوشته می‌شود متنِ
 * خواندنی است. حالا نوشتن و خواندن هر دو از همین‌جا می‌گذرند.
 */
function musicHeardTxt_(meta) {
  var h = String((meta && meta.heard) || '');
  if (h === 'موسیقی') return '✅ مدل شنید: موسیقی';
  if (h === 'جلوه') return '✅ مدل شنید: جلوهٔ صوتی';
  var v = String((meta && meta.verdict) || '');
  return v ? '❓ ' + v : '❓ نامعلوم — کسی به این گوش نداده';
}

/**
 * آیا ستونِ «تأییدِ شنیداری» این را **تأیید** می‌کند؟
 *
 * دو نویسنده دارد و هر دو باید فهمیده شوند:
 *  • خودِ موتور، که «✅ مدل شنید: …» می‌نویسد؛
 *  • آدم، که ممکن است دستی «موسیقی» یا «جلوه» تایپ کند — و این تنها راهِ
 *    تأییدِ فایلی است که مدل نتوانسته قضاوتش کند.
 * «❓» یعنی نامعلوم، و نامعلوم تأیید نیست: پیش‌فرض ردّ است.
 */
function heardSays_(cell, word) {
  var t = String(cell || '').trim();
  if (!t || t.charAt(0) === '❓') return false;
  return t.indexOf(String(word)) !== -1;
}

/** به‌روزکردنِ شناسنامهٔ یک قطعه، بی دست‌زدن به فایلِ صوتی. */
function musicMetaWrite_(wavName, meta) {
  var nm = '_MUSIC-META-' + String(wavName).replace(/\.wav$/i, '') + '.json';
  var body = JSON.stringify(meta, null, 1);
  var folder = musicFolder_();
  var it = folder.getFilesByName(nm);
  if (it.hasNext()) { var f = it.next(); f.setContent(body); return f; }
  return folder.createFile(Utilities.newBlob(body, 'application/json', nm));
}

/**
 * پر کردنِ مرزها تا کفِ خواسته‌شده.
 *
 * دو چیز را رعایت می‌کند و هر دو از شنیدنِ قسمتِ ۲۴ اوت آمده‌اند:
 *  • **پخشِ یکنواخت**: هر بار مرزی انتخاب می‌شود که از همهٔ انتخاب‌های
 *    فعلی دورتر است. وگرنه دو قطعه پشتِ هم می‌افتادند و باز هم نیمی از
 *    برنامه بی‌موسیقی می‌ماند.
 *  • **قطعهٔ متفاوت برای هر مرز**: تکرارِ یک جینگل در سه جای یک قسمت،
 *    خودش همان بی‌سلیقگی است که قرار بود درست شود.
 */
function bridgeFill_(want, bounds, bank, mood, minBr) {
  if (!bounds || !bounds.length || !(minBr > 0)) return want;
  var pool = bank.slice();
  var drop = function (id) {
    if (pool.length <= 1) return;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) { pool.splice(i, 1); return; }
    }
  };
  for (var uz = 0; uz < want.length; uz++) {
    if (want[uz] && want[uz].track) drop(want[uz].track.id);
  }

  var guard = 0;
  while (want.length < minBr && guard++ <= bounds.length) {
    var best = -1, bestD = -1;
    for (var ci = 0; ci < bounds.length; ci++) {
      var taken = false, d = -1;
      for (var wz = 0; wz < want.length; wz++) {
        var dd = Math.abs(want[wz].at - bounds[ci].at);
        if (dd === 0) { taken = true; break; }
        if (d < 0 || dd < d) d = dd;
      }
      if (taken) continue;
      // نخستین انتخاب: میانهٔ برنامه، نه ابتدایش
      if (!want.length) d = Math.min(ci + 1, bounds.length - ci);
      if (d > bestD) { bestD = d; best = ci; }
    }
    if (best < 0) break;
    var bd = bounds[best];
    // وایبِ خودِ آن بخش هم در انتخاب بیاید، نه فقط حال‌وهوای کلِ قسمت
    var fb = musicPick_(pool, 'میانه', String(mood || '') + ' ' + String(bd.tone || ''), '');
    if (!fb) break;
    want.push({ at: bd.at, track: fb,
                why: 'مرزِ بخش «' + (bd.heading || '—') + '»', head: bd.heading });
    drop(fb.id);
  }
  return want;
}

/* ═══════════ افکت، درست بعد از آماده‌شدنِ متن ═══════════

   ══ ترتیبی که باید می‌بود و نبود ══
   تا ۵٫۷۴ زنجیره این بود: شب ۲:۳۰ دنبالِ افکت بگرد (بی خبر از فردا) →
   صبح متن نوشته شود → از هرچه در بانک هست انتخاب کن → آنچه نبود را ثبت
   کن → **شبِ بعد** بیاورش. یعنی صدا همیشه برای قسمتِ بعدی می‌رسید.

   صاحبِ برنامه گفت «قاعدتاً باید این ترتیب را داشته باشد: متن آماده شود،
   بعد افکتش جست‌وجو و دانلود شود و در همان پادکست استفاده شود.» درست است،
   و پنجره‌اش هم از اول وجود داشت: بینِ نوشته‌شدنِ متن و شروعِ صداگذاری،
   موتور دستِ‌کم چهل‌وپنج ثانیه و معمولاً چند دقیقه صبر می‌کند (انتظارِ
   غنی‌سازی). همان‌جا کار انجام می‌شود، در اجرای خودش، با مهلتِ سخت.

   قاعدهٔ صاحبِ برنامه که نباید شکسته شود: «انتظار نباید ساعتِ رسیدنِ
   پادکست را عقب بیندازد.» پس مهلت سخت است و هر شکستی بی‌صدا رد می‌شود —
   نبودِ افکت هیچ‌وقت نباید جلوی ساختِ قسمت را بگیرد. */

var SFX_WANT_SCHEMA = {
  type: 'object',
  properties: {
    wants: {
      type: 'array',
      items: {
        type: 'object',
        properties: { sound: { type: 'string' }, en: { type: 'string' },
                      why: { type: 'string' } },
        required: ['sound', 'en']
      }
    }
  },
  required: ['wants']
};

/** «این متن چه صدایی می‌خواهد؟» — پرسشی کوچک و متمرکز، روی متنِ نهایی. */
function sfxWantModel_(ep) {
  var secs = (ep && ep.sections) || [];
  if (!secs.length) return [];
  var list = [];
  for (var i = 0; i < secs.length && i < 12; i++) {
    list.push('  [' + i + '] «' + String(secs[i].heading || '—') + '»' +
              (secs[i].tone ? ' (وایب: ' + secs[i].tone + ')' : '') + '\n      ' +
              String(secs[i].narration || '').slice(0, 600).replace(/\s+/g, ' '));
  }
  var prompt = [
    'این متنِ یک قسمتِ پادکستِ فارسی است. یک سؤال دارم و بس:',
    'آیا جایی در آن هست که یک **صدای کوتاه** واقعاً به شنونده چیزی اضافه کند؟',
    '',
    'شرط‌ها:',
    '  • صدا باید برای چیزی باشد که **موضوعِ** یک بخش است، نه یک اشارهٔ گذرا.',
    '  • کوتاه و بی‌ابهام: باران، در، تلفن، قدم، جمعیت، ساعت، دریا، کاغذ…',
    '    نه موسیقی، نه فضای محیطیِ بلند.',
    '  • حداکثر دو تا. و اگر چنین جایی نیست، `wants` را **خالی** بگذار —',
    '    این جوابِ درستی است و اغلبِ قسمت‌ها همین‌اند. افکتِ بی‌مناسبت',
    '    آبروی برنامه را می‌برد.',
    '',
    'برای هرکدام: `sound` نامِ فارسیِ صدا، `en` دو تا چهار واژهٔ **انگلیسی**',
    'برای جست‌وجو (مثل «rain on roof» یا «old door creak»)، `why` در یک جمله.',
    '',
    'عنوانِ قسمت: ' + String((ep && ep.title) || '—'),
    '',
    '--- بخش‌ها ---',
    list.join('\n')
  ].join('\n');

  try {
    var r = geminiText_(prompt, SFX_WANT_SCHEMA, 1024);
    var w = (r && r.wants) || [];
    return w.map(function (x) {
      return { sound: String((x && x.sound) || ''), en: String((x && x.en) || ''),
               why: String((x && x.why) || '') };
    }).filter(function (x) { return x.sound && x.en; }).slice(0, 2);
  } catch (e) {
    logLine_('پرسشِ صدای موردنیاز انجام نشد: ' + e.message);
    return [];
  }
}

/**
 * متن آماده است و صدا هنوز شروع نشده — همین‌جا افکتِ لازم را بیاور.
 * برمی‌گرداند {asked, need, got, notes}. هر شکستی بی‌صداست.
 */
function sfxPrefetch_(ep, showKind, epNum) {
  var out = { asked: 0, need: 0, got: 0, notes: [] };
  if (CFG.MUSIC_SFX_ENABLED === false || CFG.MUSIC_SFX_PREFETCH === false) return out;
  if (String(showKind || '') === 'special' && CFG.MUSIC_SFX_IN_SPECIAL !== true) return out;

  var t0 = new Date().getTime();
  var budget = Math.max(20000, Number(CFG.MUSIC_SFX_PREFETCH_MS) || 90000);
  var max = Math.max(1, Number(CFG.MUSIC_SFX_PREFETCH_MAX) || 2);

  var wants = [];
  try { wants = sfxWantModel_(ep); }
  catch (e) { out.notes.push('پرسش از مدل نشد: ' + e.message); return out; }
  out.asked = wants.length;
  if (!wants.length) { out.notes.push('این قسمت صدایی نمی‌خواهد.'); return out; }

  // آنچه بانک از قبل دارد لازم نیست دوباره آورده شود
  var have = '';
  try {
    var bank = musicBank_();
    for (var i = 0; i < bank.length; i++) {
      if (String(bank[i].kind || '') !== 'افکت') continue;
      have += ' ' + String(bank[i].name || '') + ' ' + String(bank[i].mood || '');
    }
  } catch (e2) {}
  have = have.toLowerCase();
  var need = [];
  for (var n = 0; n < wants.length; n++) {
    var key = String(wants[n].en || '').toLowerCase().split(' ')[0];
    if (key && have.indexOf(key) !== -1) {
      out.notes.push('«' + wants[n].sound + '» از قبل در بانک هست.');
      continue;
    }
    need.push(wants[n]);
  }
  out.need = need.length;
  if (!need.length) return out;

  /* خواسته را **اول** ثبت کن. اگر آوردنِ همین حالا نشد، شبِ بعد از روی
     همین ثبت آورده می‌شود — یعنی تلاشِ امروز هیچ‌وقت کاملاً هدر نمی‌رود. */
  try { sfxWish_(need, { title: (ep && ep.title) || '', category: String(showKind || '') }); }
  catch (e3) {}

  if (new Date().getTime() - t0 > budget) {
    out.notes.push('وقت نماند؛ خواسته ثبت شد و شبِ بعد آورده می‌شود.');
    return out;
  }

  // گشتن فقط برای افکت — و sfxWantedTerms_ همین حالا همان خواسته را می‌خواند
  try { musicSeek_(null, true); } catch (e4) { out.notes.push('گشتن نشد: ' + e4.message); }

  if (new Date().getTime() - t0 > budget) {
    out.notes.push('گشته شد ولی وقتِ دانلود نماند؛ شبِ بعد می‌آید.');
    return out;
  }

  /* و آوردنش — از ۵٫۷۴ افکت جلوی صفِ دانلود است.
     musicFetch_ بودجهٔ خودش را دارد (۱۵۰ ثانیه) که برای کارِ شبانه درست
     است ولی اینجا نه: گفتم «مهلتِ سخت ۹۰ ثانیه» و بعد تابعی صدا زدم که
     می‌توانست ۱۵۰ ثانیه بدود. آن‌قدر که وعده و کد یکی نباشند، همان‌قدر
     بد است که خودِ تأخیر. پس در این پنجره بودجه‌اش را به باقی‌ماندهٔ
     همین مهلت می‌بندیم و بعد برش می‌گردانیم. */
  var keepBudget = CFG.MUSIC_FETCH_BUDGET_MS;
  var keepCap = CFG.MUSIC_FETCH_MAX_PER_RUN;
  try {
    CFG.MUSIC_FETCH_BUDGET_MS = Math.max(20000, budget - (new Date().getTime() - t0));
    CFG.MUSIC_FETCH_MAX_PER_RUN = max;
    var r = musicFetch_();
    out.got = (r && r.added) || 0;
    if (out.got) {
      try { musicScan_(); } catch (e6) {}   // تا همین حالا در بانک دیده شود
      logLine_('افکتِ این قسمت همین حالا آورده شد: ' + out.got + ' فایل.');
    }
  } catch (e5) { out.notes.push('آوردن نشد: ' + e5.message); }
  CFG.MUSIC_FETCH_BUDGET_MS = keepBudget;
  CFG.MUSIC_FETCH_MAX_PER_RUN = keepCap;
  return out;
}

/** پوشهٔ کنارگذاشته‌ها — ساخته می‌شود اگر نباشد. هرگز پاک نمی‌کنیم. */
function musicRejectFolder_() {
  var folder = musicFolder_();
  var nm = CFG.MUSIC_REJECT_FOLDER || 'کنارگذاشته — گفتار یا نامناسب';
  var it = folder.getFoldersByName(nm);
  return it.hasNext() ? it.next() : folder.createFolder(nm);
}

/**
 * شناسنامهٔ بی‌صدا را خودِ موتور حل می‌کند — نه صاحبِ برنامه.
 *
 * ══ قاعده‌ای که این از آن می‌آید ══
 * «من این‌همه اتوماسیون نکردم که آخرش بروم دستی چیزی را بگذارم جایی.»
 * درست است. سشن فقط باید **معرفی** کند؛ آوردن و سرِ جا گذاشتن کارِ سامانه
 * است. شناسنامه‌ای که در آن نوشته شده «کافی است خودتان فایل را بگذارید»
 * یعنی همان اتوماسیون شکسته.
 *
 * پس دو راه، و هیچ‌کدام دستِ آدم نیست:
 *  • نشانی‌اش WAV است → به `_MUSIC-FEED.json` می‌رود و موتور خودش می‌آوردش.
 *  • نشانی‌اش به‌دردنخور است (MP3 یا نبود) → شناسنامه از بانک بیرون می‌رود،
 *    چون تا وقتی آنجاست دارد دروغ می‌گوید که قطعه‌ای هست.
 * پاک نمی‌شود؛ به زیرپوشهٔ کنارگذاشته‌ها می‌رود.
 */
function musicOrphanFix_(orphan) {
  var out = { fed: 0, moved: 0, notes: [] };
  if (!orphan || !orphan.length) return out;
  var folder = musicFolder_();
  var feed = null;
  try { feed = musicFeedRead_(); } catch (e) { feed = null; }
  if (!feed || !feed.items) feed = { items: [] };
  var have = {};
  for (var q = 0; q < feed.items.length; q++) have[String(feed.items[q].url || '')] = 1;
  var done = [];
  try { done = musicFetchedUrls_(); } catch (eD) {}
  var changed = false;

  for (var i = 0; i < orphan.length; i++) {
    var nm2 = '_MUSIC-META-' + orphan[i] + '.json';
    var meta = null, file = null;
    try {
      var fit = folder.getFilesByName(nm2);
      if (fit.hasNext()) {
        file = fit.next();
        meta = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
      }
    } catch (e2) {}
    if (!meta || !file) continue;

    var url = String(meta.url || '').trim();
    var path = url.split('?')[0];
    var wav = /^https:\/\//i.test(url) && /\.wave?$/i.test(path);

    // در فهرست هست و هنوز نوبتش نرسیده؟ دست نزن — فایلش دارد می‌آید.
    if (url && have[url]) {
      out.notes.push(orphan[i] + ' → در فهرست است؛ منتظرِ نوبتِ دانلود.');
      continue;
    }

    if (wav && done.indexOf(url) === -1) {
      feed.items.push({
        url: url, title: String(meta.title || orphan[i]),
        license: String(meta.license || ''), kind: String(meta.kind || 'موسیقی'),
        mood: String(meta.mood || ''), slots: String(meta.slots || ''),
        gain: String(meta.gain === undefined ? '' : meta.gain),
        source: String(meta.source || ''),
        by: 'موتور — نجاتِ شناسنامهٔ بی‌صدا'
      });
      changed = true; out.fed++;
      out.notes.push(orphan[i] + ' → به فهرست رفت؛ موتور خودش می‌آوردش.');
      continue;
    }

    /* دلیل باید راست باشد. سه حالتِ متفاوت‌اند و پیامِ یکسان برایشان یعنی
       فردا کسی که سیاهه را می‌خواند دنبالِ مشکلِ اشتباه می‌گردد. */
    var why = !url ? 'نشانی ندارد'
            : (done.indexOf(url) !== -1
                 ? 'قبلاً آورده شده و فایلش از پوشه برداشته شده'
                 : 'نشانی‌اش WAV نیست (' + path.slice(-8) + ')');
    try {
      file.moveTo(musicRejectFolder_());
      out.moved++;
      out.notes.push(orphan[i] + ' → کنار گذاشته شد (' + why + ').');
    } catch (e3) {}
  }

  if (changed) {
    try { putOutJson_(MUSIC_FEED_(), { updatedAt: nowStr_(), items: feed.items }); }
    catch (e4) {}
  }
  if (out.fed || out.moved) {
    logLine_('شناسنامهٔ بی‌صدا: ' + out.fed + ' به فهرست، ' + out.moved + ' کنار گذاشته.');
  }
  return out;
}

/** ردیف‌های قابلِ استفادهٔ بانک. */
function musicBank_(hub) {
  var sh = (hub || getHub_()).getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    var fmt = String(v[i][MC.FMT - 1] || '');
    if (!v[i][MC.ID - 1]) continue;
    if (fmt.indexOf('ناسازگار') !== -1 || fmt.indexOf('نیست') !== -1) continue;
    out.push({
      row: i + 2, id: String(v[i][MC.ID - 1]), name: String(v[i][MC.NAME - 1] || ''),
      kind: String(v[i][MC.KIND - 1] || 'موسیقی'),
      mood: String(v[i][MC.MOOD - 1] || ''),
      slots: String(v[i][MC.SLOTS - 1] || ''),
      sec: Number(v[i][MC.SEC - 1]) || 0,
      probe: String(v[i][MC.PROBE - 1] || ''),
      src: String(v[i][MC.SRC - 1] || ''),
      gain: (Number(v[i][MC.GAIN - 1]) > 0 ? Number(v[i][MC.GAIN - 1]) : 1),
      used: Number(v[i][MC.USED - 1]) || 0,
      heard: String(v[i][MC.HEARD - 1] || ''),
      lastAt: String(v[i][MC.LAST - 1] || '')
    });
  }
  return out;
}

/**
 * انتخابِ قطعه‌ها برای یک قسمت.
 *
 * ترتیبِ ترجیح: آنچه مدل گفته (اگر شناسه‌اش در بانک باشد)، وگرنه قاعده —
 * هم‌خوانیِ حال‌وهوا با دستهٔ قسمت، و در برابری، کم‌مصرف‌ترین و قدیمی‌ترین.
 * «استفادهٔ دوباره» ممنوع نیست؛ فقط دیرتر نوبتش می‌شود.
 */
function musicPick_(bank, slot, moodWords, wantedId) {
  var cands = [];
  for (var i = 0; i < bank.length; i++) {
    var b = bank[i];
    // جلوهٔ صوتی موسیقی نیست. از ۵٫۶۴ نامزدهای افکت با slots:'میانه' وارد
    // بانک می‌شوند، پس بی این سد، صدای بسته‌شدنِ در می‌توانست به‌عنوانِ
    // «موسیقیِ میانه» پخش شود.
    if (String(b.kind || '') === 'افکت') continue;
    if (b.slots && b.slots.indexOf(slot) === -1) continue;
    if (!b.sec) continue;
    /* ── کفِ طول ──
     * ۲۴ اوت فایلی سه‌ثانیه‌ای با نامِ «freemusicarchive public domain» وارد
     * بانک شد و شناسنامه‌اش «موسیقی» می‌گفت، با جایگاهِ شروع و پایان.
     * clipOf طولِ قطعه را سقفِ برش می‌کند (`min(14, 3)`)، پس همان فایل یک
     * موسیقیِ آغازِ سه‌ثانیه‌ای می‌ساخت — و چون بارِ استفاده‌اش صفر است،
     * امتیازِ «کم‌مصرف‌تر جلوتر» آن را جلو هم می‌انداخت.
     * قطعه‌ای که از تلفیقِ لبه هم کوتاه‌تر است، موسیقیِ آغاز نیست. */
    var need = (slot === 'میانه')
      ? (Number(CFG.MUSIC_MIN_BRIDGE_SEC) || 4)
      : (Number(CFG.MUSIC_MIN_EDGE_SEC) || 8);
    if (b.sec < need) continue;
    cands.push(b);
  }
  if (!cands.length) return null;
  if (wantedId) {
    for (var w = 0; w < cands.length; w++) if (cands[w].id === String(wantedId)) return cands[w];
  }
  var words = String(moodWords || '').split(/[\s،,]+/).filter(Boolean);
  var lastNames = [];
  try {
    var lp = JSON.parse(props_().getProperty(PK.MUSIC_LAST) || 'null');
    lastNames = (lp && lp.tracks) || [];
  } catch (eL) {}
  var score = function (b) {
    var s = 0;
    for (var m = 0; m < words.length; m++) {
      if (words[m] && b.mood && b.mood.indexOf(words[m]) !== -1) s += 3;
    }
    // کم‌مصرف‌تر، جلوتر. سقفِ اشباع تا ۵٫۶۴ عددِ ۵ بود: وقتی همهٔ قطعه‌ها
    // پنج بار پخش می‌شدند این معیار از کار می‌افتاد و نوبت‌دهی کور می‌شد،
    // درست همان‌جا که تازه لازم می‌شد.
    var uc = Math.max(1, Number(CFG.MUSIC_USED_CAP) || 12);
    s -= (Math.min(b.used, uc) / uc) * 3;
    // و قطعهٔ قسمتِ پیش، اگر جایگزینی هست، دوباره پخش نمی‌شود. شنونده‌ای که
    // هر روز همان جینگل را بشنود، بعد از یک هفته آن را نمی‌شنود.
    if (lastNames.indexOf(String(b.name || '')) !== -1) s -= 4;
    return s;
  };
  cands.sort(function (a, b) {
    var d = score(b) - score(a);
    if (d) return d;
    return String(a.lastAt).localeCompare(String(b.lastAt));
  });
  return cands[0];
}

/** ثبتِ استفاده در تب، تا هم تاریخچه بماند هم نوبت‌دهی درست کار کند. */
function musicMarkUsed_(hub, picks, epLabel, showName) {
  hub = hub || getHub_();
  var sh = hub.getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh) return 0;
  var n = 0, hist = [];
  for (var i = 0; i < (picks || []).length; i++) {
    var p = picks[i];
    if (!p || !p.row) continue;
    try {
      sh.getRange(p.row, MC.USED).setValue((Number(p.used) || 0) + 1);
      sh.getRange(p.row, MC.LAST).setValue(nowStr_() + ' — ' + String(epLabel || ''));
      n++;
    } catch (e) {}
    hist.push([nowStr_(), String(showName || ''), String(epLabel || ''),
               String(p.slot || '—'), p.name, p.kind, p.mood, p.gain, p.sec,
               musicUrl_(p.id)]);
  }
  // تاریخچه: شمارنده می‌گوید «چند بار»، این می‌گوید «کجا و در چه جایگاهی».
  if (hist.length) {
    try {
      var hs = ensureTab_(hub, CFG.MUSE_TAB || 'کاربردِ موسیقی', MUSE_HEADERS);
      hs.getRange(hs.getLastRow() + 1, 1, hist.length, MUSE_HEADERS.length).setValues(hist);
    } catch (eH) { logLine_('تاریخچهٔ موسیقی نوشته نشد: ' + eH.message); }
  }
  return n;
}

/* ═══════ ثبت، یک بار در هر قسمت — نه یک بار در هر از سرگیری (۵٫۸۴) ═══════

   ══ آنچه در قسمتِ ۱۸ واقعاً افتاد ══
   صداگذاری به‌خاطرِ مهلتِ شش‌دقیقه‌ای سه بار از سر گرفته شد، و
   `buildChunks_` هر بار `musicWrap_` را از نو صدا زد و بلافاصله بعدش
   `musicMarkUsed_` و `musicRemember_` را. یعنی برای یک قسمت:

     • تبِ «کاربردِ موسیقی» ۱۲ ردیف گرفت به‌جای ۴ (و قسمتِ ۱۷: ۲۰ به‌جای ۵)
     • «بارِ استفاده»ی هر قطعه سه برابر بالا رفت — همان عددی که نوبت‌دهی
       رویش می‌چرخد، پس چرخش هم خراب شد
     • و بدتر از هر دو: `musicRemember_` نامِ قطعه‌های **همین قسمت** را در
       PK.MUSIC_LAST نوشت، و `musicPick_` در اجرای بعدی همان‌ها را با
       امتیازِ منفی کنار زد. پس هر از سرگیری قطعه‌های *دیگری* انتخاب کرد:

         ۱۳:۰۴  Somewhere · Kalimba · Underwater · Somewhere
         ۱۳:۰۹  Somewhere · Menu Loop · Kalimba · Somewhere
         ۱۳:۱۴  Somewhere · Underwater · Kalimba · Somewhere

   ۵٫۶۸ نقشهٔ *مدل* را کَش کرد و فکر کردیم مسئله بسته شد. نبود: نقشه ثابت
   ماند ولی **انتخابِ قطعه** ثابت نماند، چون انتخاب به شمارنده‌ای نگاه
   می‌کند که خودِ همین اجرا داشت جلو می‌بردش. سیاههٔ قسمت هم دروغ می‌گفت:
   آخرین خط چیزی را اعلام می‌کرد که نیمی‌اش قبلاً با قطعهٔ دیگری ساخته
   شده بود. و اگر تعدادِ میانه‌ها بینِ دو اجرا فرق می‌کرد، شماره‌ها
   می‌لغزیدند و تکه‌ای جا می‌افتاد یا دوباره گفته می‌شد.

   دو قفل، چون یکی کافی نیست:
     ۱) ثبت فقط یک بار — با کلیدِ (برنامه، قسمت).
     ۲) شناسه‌های واقعاً انتخاب‌شده در همان کَشِ نقشه نوشته می‌شوند، پس
        اجرای بعدی همان‌ها را می‌گیرد حتی اگر شمارنده‌ها عوض شده باشند.
*/

/** یک نسخهٔ سبک از ردیفِ بانک، با جایگاهِ همین بار. */
function pickOf_(track, slot) {
  return { id: track.id, row: track.row, name: track.name, kind: track.kind,
           mood: track.mood, gain: track.gain, sec: track.sec,
           used: track.used, slot: slot };
}

/**
 * ثبتِ استفاده و حافظهٔ «قسمتِ قبل» — دقیقاً یک بار برای هر قسمت.
 * @return {boolean} آیا این فراخوان واقعاً ثبت کرد
 */
function musicRecordOnce_(hub, mw, key, epLabel, showName) {
  if (!mw || !mw.picks || !mw.picks.length) return false;
  var k = String(key || '');
  if (k) {
    var seen = '';
    try { seen = String(props_().getProperty(PK.MUSIC_LOGGED) || ''); } catch (e0) {}
    if (seen === k) return false;
  }
  try { musicMarkUsed_(hub, mw.picks, epLabel, showName); } catch (eU) {}
  try { musicRemember_(mw, epLabel); } catch (eR) {}
  if (k) { try { props_().setProperty(PK.MUSIC_LOGGED, k); } catch (e1) {} }
  return true;
}

/* ──────────────────── چسباندنِ موسیقی به تکه‌های قسمت ──────────────────── */

/**
 * تکه‌های آمادهٔ صداگذاری را می‌گیرد و تکه‌های موسیقی را لای آن‌ها می‌گذارد.
 *
 * تکهٔ موسیقی با `pcm` می‌آید، نه `text`. حلقهٔ صداگذاری این را می‌فهمد و
 * به‌جای فرستادن به مدل، همان رشته را مستقیم در بافر می‌ریزد — یعنی موسیقی
 * هیچ هزینه‌ای به سهمیهٔ مدل تحمیل نمی‌کند.
 *
 * جایگاه‌ها: «شروع» پیش از همه، «پایان» پس از همه، و «میانه» بینِ بخش‌ها.
 * میانه‌ها عمداً کم‌اند: یک قطعهٔ کوتاه سرِ هر چند بخش، نه سرِ هر بخش — وگرنه
 * قسمت به‌جای برنامه، مجموعه‌ای از جینگل می‌شود.
 */
/** کلیدِ نقشه: برنامه + قسمت. بی شمارهٔ قسمت، حافظه بی‌معناست. */
function musicPlanKey_(opt) {
  var show = String((opt && opt.show) || '').trim();
  var ep = String((opt && opt.episode) || '').trim();
  return (show && ep) ? (show + '#' + ep) : '';
}

/** نقشهٔ ذخیره‌شدهٔ همین قسمت، اگر باشد. */
function musicPlanCacheGet_(key) {
  try {
    var m = JSON.parse(props_().getProperty(PK.MUSIC_PLAN) || '{}');
    return m && m[key] ? m[key] : null;
  } catch (e) { return null; }
}

/** ذخیره — فقط دو خانه می‌ماند (یکی برای هر برنامه)، پس انباشته نمی‌شود. */
function musicPlanCachePut_(key, plan) {
  try {
    var m = {};
    try { m = JSON.parse(props_().getProperty(PK.MUSIC_PLAN) || '{}') || {}; } catch (e0) {}
    var show = String(key).split('#')[0];
    // خانهٔ همان برنامه بازنویسی می‌شود؛ قسمتِ تازه، نقشهٔ تازه.
    for (var k in m) {
      if (Object.prototype.hasOwnProperty.call(m, k) &&
          String(k).split('#')[0] === show && k !== key) delete m[k];
    }
    m[key] = plan;
    props_().setProperty(PK.MUSIC_PLAN, JSON.stringify(m));
  } catch (e) {}
}

/* طولِ هم‌پوشانی، جایگاه‌به‌جایگاه. یک عددِ ثابت برای هر سه غلط است:
   ۲٫۴ ثانیه سرِ یک قطعهٔ میانهٔ هفت‌ثانیه‌ای، دو سرش را می‌خورد و از خودِ
   موسیقی چیزی نمی‌مانَد. */
function xfEdgeSec_() {
  var v = Number(CFG.MUSIC_XFADE_EDGE_SEC);
  return v > 0 ? v : (Number(CFG.MUSIC_XFADE_SEC) || 1.8);
}
function xfBridgeSec_() {
  var v = Number(CFG.MUSIC_XFADE_BRIDGE_SEC);
  return v > 0 ? v : (Number(CFG.MUSIC_XFADE_SEC) || 1.8);
}

function musicWrap_(chunks, hub, opt) {
  opt = opt || {};
  if (CFG.MUSIC_ENABLED === false) return { chunks: chunks, picks: [] };
  var bank = [];
  try { bank = musicBank_(hub); } catch (e) { return { chunks: chunks, picks: [] }; }

  // بانکِ خالی هم باید خواسته بنویسد — وگرنه بن‌بست است: موسیقی نیست چون
  // بانک خالی است، و بانک خالی می‌ماند چون هیچ‌کس نگفته چه چیزی لازم است.
  // خواسته تنها چیزی است که تسکِ غنی‌سازی از آن می‌فهمد باید چه دانلود کند،
  // پس این تنها راهِ راه‌افتادنِ بانک از صفر است.
  if (!bank.length) {
    var want0 = ['شروع', 'پایان'];
    if (Math.max(0, Number(CFG.MUSIC_BRIDGE_EVERY) || 0)) want0.push('میانه');
    var mood0 = String(opt.mood || opt.category || '');
    try { musicWish_(mood0, want0, opt); } catch (eW0) {}
    logLine_('بانکِ موسیقی خالی است؛ خواستهٔ ' + want0.join('، ') + ' نوشته شد.');
    return { chunks: chunks, picks: [], mood: mood0, missing: want0 };
  }

  var mood = String(opt.mood || opt.category || '');
  var plan = opt.plan || {};

  // حالتِ خودکار: پیش از هر چیز از مدل می‌پرسیم. چیزی که به او می‌دهیم عنوان و
  // سرِ بخش‌ها و گویندگانِ همین قسمت است، نه فقط برچسبِ دسته — حال‌وهوا را
  // این‌ها می‌سازند. اگر چیزی نداد یا شناسه‌اش در بانک نبود، قاعده جایش را
  // می‌گیرد و هیچ‌چیز زمین نمی‌ماند.
  if (CFG.MUSIC_AUTO !== false && !plan.introId && !plan.outroId) {
    // نقشه یک بار برای هر قسمت ساخته می‌شود، نه هر بار از سرگیری.
    //
    // ══ باگی که این را لازم کرد و هنوز دیده نشده بود ══
    // صداگذاریِ یک قسمت به‌خاطرِ مهلتِ شش‌دقیقه‌ای چند بار از سر گرفته می‌شود، و
    // هر بار buildChunks_/buildSpecialChunks_ از نو اجرا می‌شود — یعنی
    // musicWrap_ هم. تا امروز این یعنی هر اجرا یک پرسشِ تازه از مدل، با پاسخی
    // که می‌توانست قطعه‌های دیگری باشد. ولی synthesizeStep_ از chunkIdxِ ذخیره‌شده
    // ادامه می‌دهد — شماره‌ای که روی آرایهٔ *قبلی* گرفته شده بود. اگر نقشهٔ تازه
    // یک میانهٔ کمتر یا بیشتر بگذارد، همهٔ شماره‌ها می‌لغزند و قسمت یا تکه‌ای را
    // جا می‌اندازد یا دوباره می‌گوید — بی هیچ خطایی، فقط در صدا شنیده می‌شود.
    // امروز پنهان است چون بانک خالی است و این شاخه اصلاً اجرا نمی‌شود؛ روزی که
    // اولین فایل در پوشه بنشیند، پیدا می‌شد.
    var ck = musicPlanKey_(opt);
    var cached = ck ? musicPlanCacheGet_(ck) : null;
    var mp = cached || musicPlanModel_(bank, opt);
    if (mp) {
      plan = { introId: mp.introId, introStart: mp.introStart,
               bridgeId: mp.bridgeId, bridgeStart: mp.bridgeStart,
               outroId: mp.outroId, outroStart: mp.outroStart,
               bridges: mp.bridges || [], sfx: mp.sfx || [],
               sfxWant: mp.sfxWant || [],
               mood: mp.mood || '', gain: mp.gain || '', why: mp.why || '' };
      if (mp.mood) mood = mp.mood;
      if (mp.gain) opt.gain = mp.gain;
      if (!cached) {
        if (ck) musicPlanCachePut_(ck, plan);
        logLine_('حال‌وهوای موسیقیِ این قسمت: ' + mood + (mp.why ? ' — ' + mp.why : ''));
      }
    }
  }

  var picks = [], out = [];

  /* ── محو، لبه‌به‌لبه — نه یک عدد برای هر دو سر (۵٫۸۴) ──
   *
   * تا ۵٫۸۳ هر قطعه دو سرش یک محوِ دوثانیه‌ای می‌گرفت، و بعد تلفیقِ لبه
   * **همان ناحیه** را دوباره پایین می‌کشید. حاصل ضربِ دو شیب بود: موسیقی
   * در نیمهٔ اولِ هم‌پوشانی عملاً تمام می‌شد و بقیه‌اش سکوت بود روی صدای
   * گوینده. یعنی هرچه هم‌پوشانی را بلندتر می‌کردی، «قطع و شروع» بدتر
   * می‌شد — درست برعکسِ چیزی که ساخته شده بود.
   *
   * حالا هر لبه جداگانه تصمیم می‌شود: لبه‌ای که تلفیق رویش می‌افتد فقط یک
   * محوِ کوتاهِ ضدِ تلنگر می‌گیرد (تلفیق خودش شکلِ موسیقایی را می‌سازد)، و
   * لبه‌ای که همسایه ندارد — آغازِ موسیقیِ اول و پایانِ موسیقیِ آخر، یعنی
   * نخستین و آخرین صدای قسمت — محوِ کاملِ خودش را نگه می‌دارد. */
  var xfOn = CFG.MUSIC_XFADE !== false;
  var softFade = function (len) { return Math.min(Number(CFG.MUSIC_FADE_SEC) || 2, len / 4); };
  var edgeFade = function (len) { return Math.min(0.25, len / 8); };

  var clipOf = function (b, slot, secs, opts) {
    if (!b) return '';
    opts = opts || {};
    var len = Math.min(secs, b.sec || secs);
    // «xf» یعنی این لبه را تلفیق می‌پوشاند؛ «soft» یعنی خودش باید محو شود؛
    // «bed» یعنی بسترِ پایانی — شیب در خودِ قطعه است (musicBedIn_)، پس
    // محوِ ورود صفر می‌مانَد وگرنه دو شیب در هم ضرب می‌شوند.
    var fi = (opts.inEdge === 'bed') ? 0
           : (xfOn && opts.inEdge === 'xf') ? edgeFade(len) : softFade(len);
    var fo = (xfOn && opts.outEdge === 'xf') ? edgeFade(len) : softFade(len);
    return musicClip_(b.id, {
      startSec: Number(plan[slot + 'Start']) || 0, lenSec: len,
      gain: b.gain * (Number(opt.gain) > 0 ? Number(opt.gain) : (Number(CFG.MUSIC_GAIN) || 1)),
      fadeIn: fi, fadeOut: fo,
      bedIn: (opts.inEdge === 'bed')
          ? { under: Number(CFG.MUSIC_OUTRO_UNDER_SEC) || 6,
              rise: Number(CFG.MUSIC_OUTRO_RISE_SEC) || 3,
              bed: Number(CFG.MUSIC_OUTRO_BED) || 0.35 }
          : null
    });
  };

  var intro = musicPick_(bank, 'شروع', mood, plan.introId);
  if (intro) {
    // آغازِ قسمت همسایه‌ای ندارد → محوِ کامل؛ انتهایش به گفتار می‌رسد → تلفیق.
    var ib = clipOf(intro, 'intro', Number(CFG.MUSIC_INTRO_SEC) || 8,
                    { inEdge: 'soft', outEdge: 'xf' });
    if (ib) { out.push({ pcm: ib, label: 'موسیقیِ آغاز — ' + intro.name,
                         xfade: xfEdgeSec_() });
              // نسخه، نه خودِ ردیف: وقتی یک قطعه هم آغاز است هم پایان،
              // `track.slot = ...` دومی اولی را بازنویسی می‌کرد و ردیفِ
              // «شروع» در تاریخچه «پایان» ثبت می‌شد. در قسمتِ ۱۸ همین شد.
              picks.push(pickOf_(intro, 'شروع')); }
  }

  /* ── موسیقیِ میانه: سرِ مرزِ بخش‌ها، نه هر چند تکه ──
     تا ۵٫۴۹ این‌طور بود: یک قطعه یک بار انتخاب می‌شد و هر `every` تکهٔ صوتی
     یک بار تکرار می‌شد. ولی «تکه» بخش نیست — splitForTts_ هر بخش را از روی
     سقفِ نویسه می‌شکند، پس شمارش روی تکه‌ها یعنی موسیقی می‌توانست وسطِ
     روایتِ یک بخش بیفتد و حرف را قطع کند. و چون یک قطعه بیشتر نبود، همان
     یکی هر بار تکرار می‌شد.

     حالا: جای مجاز فقط مرزِ قطعه‌هاست (`bounds`)، مدل می‌گوید کدام مرز و
     کدام قطعه، و کد اعتبارسنجی می‌کند. اگر مدل چیزی نگفت، حداکثر یک قطعه
     سرِ نزدیک‌ترین مرز به میانهٔ برنامه — نه بیشتر. */
  var bounds = (opt.bounds || []).filter(function (b) {
    // آغازِ برنامه و آغازِ نخستین بخش جای موسیقی نیست؛ پایان هم موسیقیِ
    // خودش را دارد.
    return b && b.at > 0 && b.kind !== 'hook' && b.kind !== 'outro';
  });
  var maxBr = Math.max(0, Number(CFG.MUSIC_BRIDGE_MAX) || 0);
  var want = [];

  for (var bi = 0; bi < (plan.bridges || []).length && want.length < maxBr; bi++) {
    var pb = plan.bridges[bi];
    var k = parseInt(faDigits_(String(pb.after)), 10);
    if (!isFinite(k) || k < 0 || k >= bounds.length) continue;
    var tr = null;
    for (var tz = 0; tz < bank.length; tz++) if (bank[tz].id === pb.id) tr = bank[tz];
    if (!tr) continue;
    if (tr.slots && tr.slots.indexOf('میانه') === -1) continue;
    var dup = false;
    for (var dz = 0; dz < want.length; dz++) if (want[dz].at === bounds[k].at) dup = true;
    if (dup) continue;
    want.push({ at: bounds[k].at, track: tr, why: String(pb.why || ''),
                head: bounds[k].heading });
  }

  /* ── کف، نه فقط سقف ──
   *
   * تا ۵٫۷۲ اینجا نوشته بود `if (!want.length)` — یعنی این تکه **فقط وقتی**
   * کار می‌کرد که مدل هیچ مرزی نداده باشد. ولی مدل معمولاً یکی می‌دهد، نه
   * صفر؛ و آن‌وقت همان یکی می‌ماند و کف هیچ‌وقت اعمال نمی‌شد. یعنی سقف را
   * به ۴ رساندم و در عمل باز هم یک قطعه پخش می‌شد.
   * `MUSIC_BRIDGE_MAX` سقف است و `MUSIC_BRIDGE_EVERY_SECTIONS` کف را
   * می‌سازد: تقریباً یک قطعه به‌ازای هر دو مرزِ بخش. */
  var per = Math.max(1, Number(CFG.MUSIC_BRIDGE_EVERY_SECTIONS) || 2);
  var minBr = Math.min(maxBr, Math.ceil(bounds.length / per));
  if (want.length < minBr) bridgeFill_(want, bounds, bank, mood, minBr);

  var atMap = {};
  for (var wz = 0; wz < want.length; wz++) atMap[want[wz].at] = want[wz];

  // نقشهٔ جابه‌جایی: تکهٔ iاُمِ ورودی، در out کجا نشست. موسیقیِ آغاز و
  // میانه شماره‌ها را جلو می‌برند، پس bounds[].at بی این نقشه به out نمی‌خورَد.
  var posOf = [];
  for (var i = 0; i < chunks.length; i++) {
    var w = atMap[i];
    if (w) {
      // میانه هر دو سرش گفتار است → هر دو لبه تلفیق می‌شوند.
      var bb = clipOf(w.track, 'bridge', Number(CFG.MUSIC_BRIDGE_SEC) || 4,
                      { inEdge: 'xf', outEdge: 'xf' });
      if (bb) {
        out.push({ pcm: bb, label: 'موسیقیِ میانه — ' + w.track.name +
                        (w.head ? ' (پیش از «' + w.head + '»)' : ''),
                   xfade: xfBridgeSec_() });
        picks.push(pickOf_(w.track, 'میانه'));
      }
    }
    posOf[i] = out.length;
    out.push(chunks[i]);
  }
  var bridge = want.length ? want[0].track : null;

  var outro = musicPick_(bank, 'پایان', mood, plan.outroId);
  if (outro) {
    /* پایانِ قسمت از ۶٫۷۰ «بستر» است، نه تلفیقِ معمولی: موسیقی از
       MUSIC_OUTRO_UNDER_SEC ثانیه قبل از تمام‌شدنِ آخرین جمله‌ها، نرم و
       کم‌صدا زیرِ گفتار شروع می‌شود و بعد از رفتنِ صدا کم‌کم اوج می‌گیرد.
       شیبش در خودِ قطعه است (bedIn) و xmode به تلفیق می‌گوید که دوباره
       شیب ندهد؛ پایانش آخرین صدای قسمت است → محوِ کامل. */
    var underS = Number(CFG.MUSIC_OUTRO_UNDER_SEC) || 0;
    var ob = clipOf(outro, 'outro', Number(CFG.MUSIC_OUTRO_SEC) || 10,
                    { inEdge: underS > 0 ? 'bed' : 'xf', outEdge: 'soft' });
    if (ob) { out.push({ pcm: ob, label: 'موسیقیِ پایان — ' + outro.name,
                         xfade: underS > 0 ? underS : xfEdgeSec_(),
                         xmode: underS > 0 ? 'outro' : '' });
              picks.push(pickOf_(outro, 'پایان')); }
  }

  // ── افکت‌ها ──
  // تا ۵٫۴۸ این تکه نبود: sfxAllow_ نوشته و آزموده شده بود ولی هیچ‌جا صدا
  // زده نمی‌شد، پس هیچ افکتی در هیچ قسمتی پخش نمی‌شد. مدل پیشنهاد می‌دهد،
  // sfxAllow_ خویشتن‌داری را اعمال می‌کند (واژه باید ساختاری باشد؛ درس‌نامه
  // اصلاً افکت نمی‌گیرد) و کد قطعه را سرِ همان بخش می‌گذارد.
  try {
    var okSfx = sfxAllow_(opt.sections || [], (plan.sfx || []), String(opt.show || ''), bank);
    for (var sx = 0; sx < okSfx.length; sx++) {
      var eb = null;
      for (var bz = 0; bz < bank.length; bz++) if (bank[bz].id === okSfx[sx].id) eb = bank[bz];
      if (!eb) continue;
      var rng = sfxSecRange_(opt.bounds || [], posOf, out.length, Number(okSfx[sx].section));
      if (!rng) continue;
      var pl = sfxPlace_(out, rng.from, rng.to, okSfx[sx]);
      if (!pl) continue;
      var ec = musicClip_(eb.id, { startSec: 0,
                 lenSec: Math.min(eb.sec || 4, Number(CFG.MUSIC_BRIDGE_SEC) || 4),
                 gain: eb.gain * (Number(opt.gain) > 0 ? Number(opt.gain) : (Number(CFG.MUSIC_GAIN) || 1)),
                 fadeIn: 0.3, fadeOut: 0.6 });
      if (!ec) continue;
      // افکت کوتاه است؛ هم‌پوشانیِ دوثانیه‌ای کلش را می‌خورد. لبه‌اش
      // فقط آن‌قدر نرم می‌شود که تلنگر نزند.
      var piece = { pcm: ec, label: 'افکت — ' + eb.name + ' (' + okSfx[sx].why +
                                    '؛ ' + pl.how + ')',
                    xfade: Number(CFG.MUSIC_SFX_XFADE_SEC) || 0.35 };
      var host = out[pl.at], txt = String((host && host.text) || '');
      if (pl.cut > 0 && pl.cut < txt.length) {
        // تکه دو نیم می‌شود و افکت بینشان می‌نشیند — لحن و گویندهٔ هر دو نیمه
        // همان است که بود، وگرنه وسطِ بخش صدا عوض می‌شد.
        out.splice(pl.at, 1,
                   { text: txt.slice(0, pl.cut), style: host.style, voice: host.voice },
                   piece,
                   { text: txt.slice(pl.cut), style: host.style, voice: host.voice });
      } else if (pl.cut <= 0) {
        out.splice(pl.at, 0, piece);
      } else {
        out.splice(pl.at + 1, 0, piece);
      }
      picks.push(pickOf_(eb, 'افکت'));
      logLine_('افکتِ قسمت: ' + eb.name + ' — ' + pl.how +
               (okSfx[sx].fit ? ' | ' + okSfx[sx].fit : ''));
    }
  } catch (eSx) { logLine_('افکت افزوده نشد: ' + eSx.message); }

  /* صدایی که این قسمت می‌خواست و بانک نداشت → آرزو.
     این همان راهِ برگشتی است که تا ۵٫۶۶ وجود نداشت: گشتنِ شبانه ساعت‌ها
     پیش از نوشته‌شدنِ متنِ فردا اجرا می‌شود و هیچ خبری از آن ندارد. تنها
     چیزی که می‌تواند به آن خبر بدهد، همین ثبتِ *دیروز* است. */
  try {
    var wantSfx = plan.sfxWant || [];
    if (wantSfx.length) {
      var haveWords = bank.filter(function (b) { return String(b.kind || '') === 'افکت'; })
                          .map(function (b) { return (b.name + ' ' + b.mood).toLowerCase(); })
                          .join(' ');
      var missSfx = wantSfx.filter(function (w) {
        return haveWords.indexOf(String(w.en || '').toLowerCase().split(' ')[0]) === -1;
      });
      if (missSfx.length) sfxWish_(missSfx, opt);
    }
  } catch (eSw) { logLine_('خواستهٔ افکت ثبت نشد: ' + eSw.message); }

  // جایگاهی که بانک برایش چیزی نداشت، خواسته می‌شود — تا تسکِ غنی‌سازی
  // بتواند قطعهٔ مناسب را پیدا و در پوشه بگذارد.
  var missing = [];
  if (!intro) missing.push('شروع');
  if (!outro) missing.push('پایان');
  // «میانه» فقط وقتی خواسته می‌شود که جای مناسبی برایش بود ولی قطعه نبود.
  // اگر خودِ برنامه مرزی نداشت، نبودِ موسیقیِ میانه کمبود نیست.
  if (maxBr && bounds.length && !bridge) missing.push('میانه');
  if (missing.length) { try { musicWish_(mood, missing, opt); } catch (eW) {} }

  /* ── قفلِ دوم: شناسه‌های واقعاً انتخاب‌شده در کَش نوشته می‌شوند ──
     نقشهٔ مدل از ۵٫۶۸ کَش می‌شد، ولی مدل همیشه شناسه نمی‌دهد؛ آنجا که
     نمی‌دهد `musicPick_` تصمیم می‌گیرد و تصمیمش به شمارنده‌ای نگاه می‌کند
     که همین اجرا داشت جلو می‌بردش. پس انتخابِ نهایی هم باید بماند، نه فقط
     پیشنهادِ مدل. با این، از سرگیری همان قطعه‌ها را می‌گیرد. */
  var ck2 = musicPlanKey_(opt);
  if (ck2 && picks.length) {
    var lock = { introId: '', outroId: '', bridges: [],
                 introStart: plan.introStart || '', outroStart: plan.outroStart || '',
                 bridgeStart: plan.bridgeStart || '',
                 sfx: plan.sfx || [], sfxWant: plan.sfxWant || [],
                 mood: mood, gain: plan.gain || '', why: plan.why || '' };
    for (var pk = 0; pk < picks.length; pk++) {
      if (picks[pk].slot === 'شروع') lock.introId = picks[pk].id;
      if (picks[pk].slot === 'پایان') lock.outroId = picks[pk].id;
    }
    for (var wq = 0; wq < want.length; wq++) {
      var atIdx = -1;
      for (var bq = 0; bq < bounds.length; bq++) if (bounds[bq].at === want[wq].at) atIdx = bq;
      if (atIdx >= 0) lock.bridges.push({ after: String(atIdx), id: want[wq].track.id,
                                          why: want[wq].why || '' });
    }
    musicPlanCachePut_(ck2, lock);
  }

  if (picks.length) {
    logLine_('موسیقیِ قسمت: ' + picks.map(function (p) { return p.name; }).join(' · '));
  }
  return { chunks: out, picks: picks, mood: mood, missing: missing };
}

/**
 * آنچه در این قسمت واقعاً پخش شد — برای دیده‌شدن در وضعیت و گزارش.
 *
 * بی این، موسیقی همان نقطهٔ کوری می‌شد که درس‌نامه بود: کار انجام می‌شد یا
 * نمی‌شد و هیچ ناظری — آدم یا کد — نمی‌توانست تفاوتش را ببیند.
 */
function musicRemember_(mw, epLabel) {
  try {
    props_().setProperty(PK.MUSIC_LAST, JSON.stringify({
      at: nowStr_(), episode: String(epLabel || ''),
      mood: String((mw && mw.mood) || ''),
      tracks: ((mw && mw.picks) || []).map(function (p) { return p.name; }),
      missing: (mw && mw.missing) || []
    }));
  } catch (e) {}
}

/** وضعیتِ بانک و آخرین استفاده — بی‌شبکه، برای _STATUS.json. */
function musicStatus_() {
  var out = { enabled: CFG.MUSIC_ENABLED !== false, auto: CFG.MUSIC_AUTO !== false,
              tracks: 0, last: null };
  try {
    var sh = getHub_().getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(2, MC.FMT, sh.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < v.length; i++) {
        var f = String(v[i][0] || '');
        if (f && f.indexOf('ناسازگار') === -1 && f.indexOf('نیست') === -1) out.tracks++;
      }
    }
  } catch (e) {}
  try { out.last = JSON.parse(props_().getProperty(PK.MUSIC_LAST) || 'null'); } catch (e2) {}
  // شمارِ هر جایگاه و هدف — بی این، «۴ قطعه» معلوم نمی‌کرد کدام جایگاه لنگ است
  try {
    out.slots = musicSlotCounts_();
    out.target = Math.max(1, Number(CFG.MUSIC_BANK_TARGET) || 5);
    out.thin = musicThinSlots_();
  } catch (e3) {}
  /* ══ افکت هم باید دیده شود (یافتهٔ بازِ ناظر، ۵٫۹۶) ══
   * بندِ ۴-د دستورِ نظارت می‌پرسد «چند افکت در بانک هست و هدف چند است؟» و
   * جوابش هیچ‌جا نبود: `musicCoverage_` از اول می‌شمردش، ولی آن شمار فقط
   * داخلِ خودِ آن تابع می‌ماند و به `_STATUS.json` نمی‌رسید. ناظر جای دیگری
   * برای دیدن ندارد، پس آن بند عملاً اجرا نمی‌شد — و صاحبِ برنامه هم که
   * چند بار پرسیده «چرا افکتی نشنیدم»، هیچ عددی نداشت که ببیند.
   *
   * همان الگوی همیشگی: تحلیل نوشته شده بود و به تصمیمی وصل نبود. */
  try {
    var cov = musicCoverage_();
    out.sfx = Number(cov.sfx) || 0;
    out.sfxTarget = Number(cov.sfxTarget) || 0;
    out.sfxEnabled = CFG.MUSIC_SFX_ENABLED !== false;
    out.sfxPerEpisode = Math.max(0, Number(CFG.MUSIC_SFX_MAX_PER_EP) || 0);
  } catch (e4) {
    out.sfx = null; out.sfxTarget = null;
  }
  return out;
}

/** منو: پویشِ بانک. */
function runMusicScan() {
  var r = musicScan_();
  var bank = musicBank_();
  var ui = ui_();
  var L = ['پوشه: ' + (CFG.MUSIC_FOLDER || 'موسیقی و افکت') + ' (در OUTPUT)',
           'تب: ' + (CFG.MUSIC_TAB || 'موسیقی'), '',
           'تازه: ' + r.added + ' · به‌روز: ' + r.updated +
           ' · ناسازگار: ' + r.bad + ' · ناموجود: ' + r.gone,
           'آمادهٔ استفاده: ' + bank.length + ' قطعه', ''];
  if (r.bad) L.push('⚠️ فایلِ ناسازگار یعنی WAV نیست. رمزگشاییِ MP3 در Apps Script ممکن نیست.');
  L.push('در تب، ستون‌های «حال‌وهوا» و «مناسب برای» را خودتان پر کنید:',
         '  حال‌وهوا: چند واژه، مثل «آرام، امیدوار، خبری»',
         '  مناسب برای: از میانِ «شروع»، «پایان»، «میانه» — با کاما',
         '  بلندی: عددی مثل 0.6 (پیش‌فرض ۱)');
  if (ui) ui.alert('🎵 بانکِ موسیقی', L.join('\n'), ui.ButtonSet.OK);
  return r;
}

/** منو: پویش + برچسبِ خودکار، یک‌جا. */
function runMusicAuto() {
  var ui = ui_();
  var r = musicScan_();
  var t = { tagged: 0 };
  try { t = musicAutoTag_(); } catch (e) {}
  var bank = musicBank_();
  var L = ['پویش: ' + r.added + ' تازه · ' + r.updated + ' به‌روز · ' +
           r.bad + ' ناسازگار · ' + r.gone + ' ناموجود',
           'برچسبِ خودکار برای ' + t.tagged + ' قطعهٔ تازه ثبت شد.',
           'آمادهٔ استفاده: ' + bank.length + ' قطعه', '',
           'حالتِ خودکار: ' + (CFG.MUSIC_AUTO === false ? 'خاموش' : 'روشن') + '.',
           'در حالتِ روشن، برای هر قسمت خودِ سیستم از روی عنوان، سرِ بخش‌ها و',
           'گویندگان تصمیم می‌گیرد کدام قطعه، از کدام ثانیه، و با چه بلندی.',
           '', 'هر ستونی که خودتان پر کنید، دستِ سیستم به آن نمی‌خورد.'];
  var wish = null;
  try { wish = getOutJson_(MUSIC_WISH_()); } catch (e2) {}
  if (wish && wish.items && wish.items.length) {
    var last = wish.items[wish.items.length - 1];
    L.push('', '📝 آخرین خواسته: ' + (last.slots || []).join('، ') +
           ' با حال‌وهوای «' + last.mood + '» — در _MUSIC-WISH.json');
  }
  if (ui) ui.alert('🎵 بانکِ موسیقی — خودکار', L.join('\n'), ui.ButtonSet.OK);
  return { scan: r, tag: t, ready: bank.length };
}

/* ─────────────── حالتِ خودکار: برچسب‌زدن و انتخاب با مدل ─────────────── */

var MUSIC_TAG_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          mood: { type: 'string' },
          slots: { type: 'string' },
          gain: { type: 'string' }
        },
        required: ['id', 'mood', 'slots']
      }
    }
  },
  required: ['items']
};

/**
 * برچسب‌زدنِ خودکارِ قطعه‌های تازهٔ بانک.
 *
 * مدل صدا نمی‌شنود؛ آنچه دارد نامِ فایل و مدتِ آن است. برای بانکی که آدم پر
 * می‌کند این کافی است، چون نامِ فایل‌های موسیقی تقریباً همیشه توصیفی است
 * («calm-piano-intro», «باران-شهر»). حدس‌ها با نشانِ «خودکار» ثبت می‌شوند تا
 * معلوم باشد کدام را آدم گفته و کدام را ماشین.
 *
 * ستونی که آدم پر کرده باشد هرگز بازنویسی نمی‌شود — نه اینجا، نه در پویش.
 */
function musicAutoTag_(hub) {
  hub = hub || getHub_();
  var sh = hub.getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh || sh.getLastRow() < 2) return { tagged: 0 };
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();

  var need = [];
  for (var i = 0; i < v.length; i++) {
    var fmt = String(v[i][MC.FMT - 1] || '');
    if (!v[i][MC.ID - 1] || fmt.indexOf('ناسازگار') !== -1 || fmt.indexOf('نیست') !== -1) continue;
    if (String(v[i][MC.MOOD - 1] || '').trim()) continue;      // آدم گفته — دست نزن
    need.push({ row: i + 2, id: String(v[i][MC.ID - 1]),
                name: String(v[i][MC.NAME - 1] || ''), sec: Number(v[i][MC.SEC - 1]) || 0 });
  }
  if (!need.length) return { tagged: 0 };

  var lines = need.map(function (n) {
    return '• شناسه ' + n.id + ' | نام فایل: «' + n.name + '» | مدت: ' + n.sec + ' ثانیه';
  });
  var prompt = [
    'تو سرپرستِ موسیقیِ یک برنامهٔ رادیوییِ فارسی هستی.',
    'برای هر قطعهٔ زیر، از روی نامِ فایل و مدتش حدس بزن:',
    '  mood: دو تا چهار واژهٔ فارسی برای حال‌وهوا (مثل «آرام، امیدوار» یا «کوبنده، خبری»).',
    '  slots: از میانِ «شروع»، «پایان»، «میانه» — با کاما. قطعهٔ کوتاه‌تر از ۱۵ ثانیه',
    '         معمولاً «میانه» است؛ قطعهٔ بلند برای «شروع» و «پایان».',
    '  gain: عددی بین ۰٫۳ تا ۱ — قطعهٔ پرهیاهو عددِ کمتر بگیرد.',
    'اگر نامِ فایل چیزی نمی‌گوید، حال‌وهوای خنثی بده؛ از خودت داستان نساز.',
    '', lines.join('\n')
  ].join('\n');

  var res = null;
  try { res = geminiText_(prompt, MUSIC_TAG_SCHEMA, 4096); } catch (e) {
    logLine_('برچسب‌زنیِ خودکارِ موسیقی انجام نشد: ' + e.message);
    return { tagged: 0 };
  }
  var items = (res && res.items) || [];
  var byId = {};
  for (var k = 0; k < items.length; k++) byId[String(items[k].id)] = items[k];

  var n = 0;
  for (var q = 0; q < need.length; q++) {
    var it = byId[need[q].id];
    if (!it) continue;
    var gain = Number(it.gain);
    if (!(gain > 0 && gain <= 1)) gain = 0.8;
    sh.getRange(need[q].row, MC.MOOD).setValue(String(it.mood || '').slice(0, 80));
    sh.getRange(need[q].row, MC.SLOTS).setValue(String(it.slots || 'شروع، پایان').slice(0, 60));
    sh.getRange(need[q].row, MC.GAIN).setValue(gain);
    sh.getRange(need[q].row, MC.NOTE).setValue('خودکار — می‌توانید عوضش کنید');
    n++;
  }
  if (n) logLine_('برچسبِ خودکار برای ' + n + ' قطعهٔ موسیقی ثبت شد.');
  return { tagged: n };
}

var MUSIC_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    // همهٔ فیلدها رشته‌اند، حتی عددها. تجربهٔ همین ریپو: مدل قالبی را که
    // نوعِ integer/number/boolean داشته باشد رد می‌کند. تبدیل با Number()
    // در همین‌جا انجام می‌شود و مقدارِ بیرون از بازه دور ریخته می‌شود.
    introId: { type: 'string' }, introStart: { type: 'string' },
    bridgeId: { type: 'string' }, bridgeStart: { type: 'string' },
    outroId: { type: 'string' }, outroStart: { type: 'string' },
    gain: { type: 'string' },
    mood: { type: 'string' },
    why: { type: 'string' },
    // پیشنهادِ افکت. مدل می‌گوید «کدام واژه، در کدام بخش، با کدام قطعه» —
    // ولی خودش تصمیم نمی‌گیرد: sfxAllow_ ساختاری‌بودنِ واژه را می‌سنجد و
    // هرچه گذرا باشد رد می‌شود. همه رشته، مثل بقیه.
    // موسیقیِ میانه: مدل می‌گوید بینِ کدام دو بخش و با کدام قطعه. تا ۵٫۴۹
    // یک قطعه انتخاب می‌شد و هر چند تکه یک بار کورکورانه تکرار می‌شد — که
    // می‌توانست وسطِ روایتِ یک بخش بیفتد.
    bridges: {
      type: 'array',
      items: {
        type: 'object',
        properties: { after: { type: 'string' }, id: { type: 'string' },
                      why: { type: 'string' } },
        required: ['after', 'id']
      }
    },
    // «این قسمت چه صدایی می‌خواهد» — مستقل از اینکه بانک داردش یا نه.
    // این تنها راهِ برگشتِ حلقه است: بی آن، هیچ‌جا ثبت نمی‌شود که قسمتی
    // صدای باران لازم داشت و ما نداشتیم، و بانک هرگز یاد نمی‌گیرد.
    sfxWant: {
      type: 'array',
      items: {
        type: 'object',
        properties: { sound: { type: 'string' }, en: { type: 'string' },
                      why: { type: 'string' } },
        required: ['sound', 'en']
      }
    },
    sfx: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, word: { type: 'string' },
                      section: { type: 'string' },
                      // لنگر: یک عبارتِ کوتاه که **عیناً** در روایتِ همان بخش
                      // آمده. تا ۵٫۶۴ فقط شمارهٔ بخش پرسیده می‌شد، پس افکت
                      // سرِ بخش پخش می‌شد — شاید نود ثانیه پیش از جایی که
                      // آن چیز اصلاً گفته شود.
                      anchor: { type: 'string' },
                      // پیش | روی | پس — نسبت به همان عبارت
                      when: { type: 'string' },
                      why: { type: 'string' } },
        required: ['id', 'word', 'section']
      }
    }
  },
  required: ['mood']
};

/**
 * انتخابِ موسیقیِ یک قسمت به‌دستِ مدل.
 *
 * چیزی که به مدل داده می‌شود عمداً بیش از «دستهٔ قسمت» است: عنوان، سرِ بخش‌ها،
 * و گویندگانی که قرار است بخوانند. حال‌وهوای یک قسمت را همین‌ها می‌سازند، نه
 * برچسبِ دسته؛ دو قسمتِ «علمی و آموزشی» می‌توانند یکی آرام باشد و یکی کوبنده.
 *
 * خروجی وارسی می‌شود: شناسه‌ای که در بانک نباشد دور ریخته می‌شود و همان‌جا
 * قاعدهٔ قدیمی جایش را می‌گیرد. مدل پیشنهاد می‌دهد، تصمیمِ نهایی با کد است.
 */
function musicPlanModel_(bank, ctx) {
  if (CFG.MUSIC_AUTO === false || !bank.length) return null;
  var list = bank.filter(function (b) {
    return String(b.kind || '') !== 'افکت';     // افکت‌ها فهرستِ خودشان را دارند
  }).slice(0, 60).map(function (b) {
    return '• ' + b.id + ' | «' + b.name + '» | حال‌وهوا: ' + (b.mood || '—') +
           ' | مناسب: ' + (b.slots || '—') + ' | مدت: ' + b.sec + 'ث | بارِ استفاده: ' + b.used;
  }).join('\n');

  /* مرزهای مجاز — حالا با وایبِ دو طرف.
   *
   * تا ۵٫۵۷ اینجا فقط عنوانِ بخش نوشته می‌شد. ولی موسیقیِ میانه دقیقاً برای
   * *تغییرِ حال‌وهوا* است؛ عنوان این را نمی‌گوید، وایب می‌گوید. و وایب از اول
   * در segs[i].tone بود و همان‌جا زمین می‌ماند.
   */
  var allB = ctx.bounds || [];
  var brd = allB.filter(function (b) {
    return b && b.at > 0 && b.kind !== 'hook' && b.kind !== 'outro';
  });
  var toneAt = function (b) {
    var t = [];
    if (b && b.tone) t.push('وایب: ' + b.tone);
    if (b && b.voice) t.push('گوینده: ' + b.voice);
    return t.length ? ' (' + t.join('، ') + ')' : '';
  };
  var brdList = brd.map(function (b, i) {
    // وایبِ بخشِ پیش از این مرز، تا تغییر دیده شود نه فقط مقصد
    var prev = null;
    for (var k = 0; k < allB.length; k++) {
      if (allB[k] === b) break;
      prev = allB[k];
    }
    return '  ' + i + ') از بخشِ «' + ((prev && prev.heading) || 'آغاز') + '»' +
           toneAt(prev) + '\n     به بخشِ «' + (b.heading || '—') + '»' + toneAt(b);
  }).join('\n');

  // فهرستِ کاملِ بخش‌ها با وایبشان — سرشتِ قسمت از این خوانده می‌شود
  var secList = allB.map(function (b) {
    return '  • «' + (b.heading || b.kind || '—') + '»' + toneAt(b);
  }).join('\n');

  /* ── بخشِ جلوهٔ صوتی ──
   * تا ۵٫۶۴ قالبِ پاسخ فیلدِ sfx داشت، parse می‌شد، sfxAllow_ می‌سنجیدش و
   * musicWrap_ جایش می‌گذاشت — ولی **در متنِ پرسش یک کلمه هم دربارهٔ افکت
   * نبود**. یعنی هرگز از مدل خواسته نشد. همان شکلِ همیشگیِ این ریپو: کدِ
   * کامل و آزموده، بی هیچ فراخوانی.
   *
   * حالا پرسیده می‌شود — ولی فقط وقتی افکتی در بانک باشد و برنامه اجازه‌اش
   * را بدهد. پرسیدن دربارهٔ چیزی که وجود ندارد، دعوت به توهّمِ شناسه است.
   */
  var sfxBank = bank.filter(function (b) { return String(b.kind || '') === 'افکت'; });
  var sfxOn = CFG.MUSIC_SFX_ENABLED !== false && sfxBank.length > 0 &&
              Math.max(0, Number(CFG.MUSIC_SFX_MAX_PER_EP) || 0) > 0 &&
              !(String(ctx.show || '') === 'special' && CFG.MUSIC_SFX_IN_SPECIAL !== true);
  var sfxBlock = [];

  /* پرسشِ «چه صدایی لازم است» **همیشه** پرسیده می‌شود، حتی وقتی بانک هیچ
     افکتی ندارد — چون جوابش برای پر کردنِ بانک است، نه برای همین قسمت. */
  if (CFG.MUSIC_SFX_ENABLED !== false &&
      !(String(ctx.show || '') === 'special' && CFG.MUSIC_SFX_IN_SPECIAL !== true)) {
    sfxBlock = sfxBlock.concat([
      '',
      '--- چه صدایی این قسمت می‌خواهد؟ (sfxWant) ---',
      'جدا از بانک و مستقل از آن: در متنِ این قسمت، آیا چیزی هست که صدایش',
      'واقعاً به شنونده کمک می‌کند؟ باران، در، تلفن، جمعیت، قدم، دریا…',
      'شرطش این است که **ساختاری** باشد — موضوعِ یک بخش، نه یک اشارهٔ گذرا.',
      'اگر چنین چیزی نیست، sfxWant را خالی بگذار؛ این جوابِ درستی است.',
      'برای هرکدام: `sound` نامِ فارسیِ صدا، `en` دو تا چهار واژهٔ **انگلیسی**',
      'برای جست‌وجو (مثلاً «rain on roof» یا «old door creak»)، و `why` در یک',
      'جمله. حداکثر دو تا. این فهرست برای *تهیه* است، نه برای پخشِ همین قسمت —',
      'پس چیزی را که بانک ندارد هم بنویس؛ اتفاقاً همان مهم‌تر است.'
    ]);
  }

  if (sfxOn) {
    var secs = ctx.sections || [];
    var secTxt = [];
    for (var sIdx = 0; sIdx < secs.length; sIdx++) {
      var nar = String((secs[sIdx] && secs[sIdx].narration) || '');
      secTxt.push('  [' + sIdx + '] «' + String((secs[sIdx] && secs[sIdx].heading) || '—') +
                  '»' + (secs[sIdx] && secs[sIdx].tone ? ' (وایب: ' + secs[sIdx].tone + ')' : '') +
                  '\n      ' + nar.slice(0, 700).replace(/\s+/g, ' '));
    }
    sfxBlock = [
      '',
      '--- جلوهٔ صوتی (اختیاری، حداکثر ' +
        (Number(CFG.MUSIC_SFX_MAX_PER_EP) || 1) + ' تا در کلِ قسمت) ---',
      'اگر — و فقط اگر — جایی هست که یک صدای کوتاه واقعاً به شنونده چیزی',
      'اضافه می‌کند، پیشنهاد بده. نبودنِ افکت هیچ ایرادی ندارد؛ افکتِ',
      'بی‌مناسبت آبروی برنامه را می‌برد. sfx را خالی گذاشتن جوابِ درستی است.',
      '',
      'برای هر پیشنهاد:',
      '  • id: شناسهٔ یک ردیفِ «نوع: افکت» از همین بانک.',
      '  • section: شمارهٔ بخش از فهرستِ زیر (همان عددِ داخلِ کروشه).',
      '  • word: آن چیزی که صدا دارد (باران، در، تلفن، …).',
      '  • anchor: یک عبارتِ کوتاهِ سه تا هشت کلمه‌ای که **عیناً و حرف‌به‌حرف**',
      '    در روایتِ همان بخش آمده و جایی است که آن صدا باید شنیده شود.',
      '    اگر عبارت را دقیقاً کپی نکنی، افکت به سرِ بخش عقب می‌رود.',
      '  • when: «پیش» یعنی پیش از آن جمله، «روی» یعنی درست پیش از خودِ آن',
      '    عبارت، «پس» یعنی بعد از پایانِ آن جمله. این را از وایب انتخاب کن:',
      '    در فضای تعلیق «پیش» بهتر است (صدا انتظار می‌سازد)، در روایتِ',
      '    توصیفی «روی»، و آن‌جا که صدا واکنشِ چیزی است «پس».',
      '  • why: در یک جمله بگو چرا این صدا با وایبِ همین بخش می‌خوانَد.',
      '    اگر نمی‌توانی این جمله را بنویسی، یعنی نباید پیشنهادش بدهی.',
      '',
      '--- بخش‌ها با متنشان (برای انتخابِ لنگر) ---',
      (secTxt.join('\n') || '  [متنِ بخش‌ها در دسترس نیست]'),
      '',
      '--- افکت‌های موجود ---',
      sfxBank.map(function (b) {
        return '• ' + b.id + ' | «' + b.name + '» | حال‌وهوا: ' + (b.mood || '—') +
               ' | مدت: ' + b.sec + 'ث';
      }).join('\n')
    ];
  }

  var prompt = [
    'تو سرپرستِ موسیقیِ یک برنامهٔ رادیوییِ فارسی هستی و باید برای این قسمت،',
    'موسیقیِ آغاز و پایان و یک قطعهٔ میانه انتخاب کنی.',
    '',
    'قسمت:',
    '  عنوان: ' + String(ctx.title || '—'),
    '  دسته: ' + String(ctx.category || '—'),
    '  گویندگان: ' + String(ctx.cast || '—'),
    '',
    '--- بخش‌های این قسمت و وایبِ هرکدام ---',
    (secList || '  ' + String(ctx.headings || '—')),
    '',
    'حال‌وهوای موسیقی را از همین وایب‌ها بردار، نه از برچسبِ دسته. دو قسمتِ',
    'هم‌دسته می‌توانند وایبِ کاملاً متضاد داشته باشند، و آن‌وقت موسیقیِ',
    'یکسان برای هر دو یعنی هیچ‌کدام.',
    '',
    'قاعده‌ها:',
    '  ۱) فقط از شناسه‌های همین فهرست انتخاب کن. شناسهٔ ساختگی ممنوع.',
    '  ۲) هر قطعه را برای همان جایی بگذار که ستونِ «مناسب» اجازه داده.',
    '  ۳) اگر قطعه بلند است، introStart/outroStart را طوری بده که بهترین جای',
    '     قطعه شنیده شود (ثانیه). اگر نمی‌دانی، صفر بده.',
    '  ۴) gain بین ۰٫۳ تا ۱: هرچه متن جدی‌تر و آرام‌تر، موسیقی آرام‌تر.',
    '  ۵) mood را در دو تا چهار واژه بنویس — همان حال‌وهوایی که این قسمت',
    '     باید بدهد. اگر هیچ قطعه‌ای مناسب نبود، شناسه‌ها را خالی بگذار ولی',
    '     mood را حتماً بنویس؛ از روی همان، قطعهٔ تازه تهیه می‌شود.',
    '  ۶) قطعه‌ای که بارِ استفاده‌اش کمتر است در شرایطِ برابر بهتر است.',
    '  ۷) موسیقیِ میانه: فقط اگر واقعاً لازم است. جای مجازش فقط مرزهای زیر',
    '     است (شمارهٔ مرز را در `after` بده) — یعنی بینِ دو بخش، نه وسطِ',
    '     حرف. حداکثر ' + (Number(CFG.MUSIC_BRIDGE_MAX) || 2) + ' تا، و',
    '     فقط جایی که **وایب واقعاً عوض می‌شود** — مرزی که وایبِ دو طرفش یکی',
    '     است، نیازی به قطعهٔ فاصله ندارد. **تغییرِ گوینده هم یک تغییرِ واقعی',
    '     است**: وقتی صدای دیگری شروع می‌کند، یک قطعهٔ کوتاه به شنونده',
    '     می‌گوید صحنه عوض شد. مرزها را دست‌ودل‌باز ببین، نه با اکراه —',
    '     برنامه‌ای که در ده دقیقه فقط یک بار موسیقیِ میانه دارد، خشک است.',
    '     ولی هر مرز هم لازم ندارد؛ جایی که واقعاً چیزی عوض می‌شود.',
    '     اگر برنامه یکدست است و جایی برای نفس‌کشیدن لازم ندارد، bridges را',
    '     خالی بگذار — موسیقیِ بی‌مناسبت بدتر از نبودنش است.',
    '',
    '--- مرزهای مجاز برای موسیقیِ میانه ---',
    (brdList || '[این قسمت مرزِ مناسبی ندارد]'),
    '',
    '--- بانکِ موسیقی ---',
    list
  ].concat(sfxBlock).join('\n');

  try {
    var r = geminiText_(prompt, MUSIC_PLAN_SCHEMA, 2048);
    if (!r) return null;
    var ok = {};
    for (var i = 0; i < bank.length; i++) ok[bank[i].id] = 1;
    var keep = function (id) { return (id && ok[String(id)]) ? String(id) : ''; };
    return {
      introId: keep(r.introId), introStart: Number(r.introStart) || 0,
      bridgeId: keep(r.bridgeId), bridgeStart: Number(r.bridgeStart) || 0,
      outroId: keep(r.outroId), outroStart: Number(r.outroStart) || 0,
      gain: (Number(r.gain) > 0 && Number(r.gain) <= 1) ? Number(r.gain) : 0,
      mood: String(r.mood || ''), why: String(r.why || ''),
      // شناسهٔ بیرونِ بانک همین‌جا دور ریخته می‌شود؛ مدل نمی‌تواند قطعهٔ
      // ساختگی به قسمت تحمیل کند.
      bridges: (r.bridges || []).map(function (x) {
        return { after: String((x && x.after) || ''), id: keep(x && x.id),
                 why: String((x && x.why) || '') };
      }).filter(function (x) { return x.id; }),
      sfxWant: (r.sfxWant || []).map(function (x) {
        return { sound: String((x && x.sound) || ''), en: String((x && x.en) || ''),
                 why: String((x && x.why) || '') };
      }).filter(function (x) { return x.sound && x.en; }),
      sfx: (r.sfx || []).map(function (x) {
        return { id: keep(x && x.id), word: String((x && x.word) || ''),
                 section: String((x && x.section) || ''),
                 anchor: String((x && x.anchor) || ''),
                 when: sfxWhen_(x && x.when),
                 why: String((x && x.why) || '') };
      }).filter(function (x) { return x.id && x.word; })
    };
  } catch (e) {
    logLine_('انتخابِ خودکارِ موسیقی انجام نشد: ' + e.message);
    return null;
  }
}

/**
 * وقتی بانک چیزی برای یک جایگاه ندارد، خواسته را می‌نویسد.
 *
 * موتور خودش نمی‌تواند موسیقی پیدا و دانلود کند؛ این کارِ تسکِ غنی‌سازی است
 * که به اینترنت دسترسی دارد. پس همان‌طور که برای متن درخواست می‌گذارد، اینجا
 * هم یک فایلِ خواسته در OUTPUT می‌گذارد. اگر کسی برش ندارد، هیچ چیز خراب
 * نمی‌شود — قسمت بی‌موسیقی ساخته می‌شود.
 */
function musicWish_(mood, missing, ctx) {
  if (!missing || !missing.length) return null;
  try {
    var prev = getOutJson_(MUSIC_WISH_()) || { items: [] };
    var items = (prev.items || []).slice(-20);

    var rec = {
      at: nowStr_(), mood: String(mood || ''), slots: missing,
      title: String((ctx && ctx.title) || ''), category: String((ctx && ctx.category) || ''),
      note: 'فقط WAV. ترجیحاً ۲۴ کیلوهرتز، تک‌کاناله، ۱۶ بیت. ' +
            'فایل را در پوشهٔ «' + (CFG.MUSIC_FOLDER || 'موسیقی و افکت') + '» بگذارید.'
    };

    /* آرزوی تکراری افزوده نمی‌شود.
     *
     * ۲۳ اوت: فایل هفت رکورد داشت که سه‌تایشان نویسه‌به‌نویسه یکی بودند
     * (۰۷:۰۱، ۰۷:۰۶، ۰۷:۱۲) و چهارتای دیگر هم همین‌طور. چون صداگذاریِ یک
     * قسمت چند بار از سر گرفته می‌شود و هر بار تکه‌ها از نو ساخته می‌شدند،
     * هر اجرا یک آرزوی تازه می‌نوشت. با بانکِ خالی این یعنی فایل بی‌پایان
     * رشد می‌کند و آن که باید تهیه کند، هفت‌بار یک چیز می‌بیند و نمی‌فهمد
     * هفت خواسته است یا یکی. حالا رکوردِ همسان فقط زمانش تازه می‌شود.
     */
    return wishAdd_(items, rec,
                    'خواستهٔ موسیقی ثبت شد: ' + missing.join('، ') + ' — حال‌وهوا: ' + mood);
  } catch (e) { return null; }
}

/** کلیدِ یکتاییِ یک آرزو. نوع و نامِ صدا هم در آن هست، وگرنه دو افکتِ متفاوت
 *  یکی شمرده می‌شدند و فقط اولی ثبت می‌شد. */
function wishKey_(r) {
  return [String(r.kind || 'موسیقی'), String(r.sound || ''), String(r.mood || ''),
          (r.slots || []).join('|'), String(r.category || ''),
          String(r.title || '')].join('§');
}

/** افزودنِ آرزو با حذفِ تکرار، و نوشتنِ فایل. یک نویسنده، برای هر دو نوع. */
function wishAdd_(items, rec, note) {
  var k = wishKey_(rec), dup = -1;
  for (var i = 0; i < items.length; i++) if (wishKey_(items[i]) === k) { dup = i; break; }
  if (dup >= 0) {
    items[dup].at = rec.at;
    items[dup].times = (Number(items[dup].times) || 1) + 1;
  } else {
    items.push(rec);
    if (note) logLine_(note);
  }
  putOutJson_(MUSIC_WISH_(), { updatedAt: nowStr_(), items: items });
  return items.length;
}

/**
 * آرزوی **جلوهٔ صوتی** — نامِ خودِ صدا، نه فقط جایگاه.
 *
 * ══ شکافی که این را لازم کرد ══
 * صاحبِ برنامه پرسید: «وقتی می‌خواهد افکتی را از اینترنت بگیرد، مگر قبلش
 * دیده و می‌داند متنِ پادکستِ فردا چیست؟» — و نه، نمی‌دانست. گشتنِ افکت
 * شبانه اجرا می‌شد، ساعت‌ها پیش از آنکه متنِ فردا اصلاً نوشته شود، و
 * sfxSeekQuery_ یک پرسشِ **ثابت و کلی** بود («foley OR ambience OR …»).
 *
 * ولی ایرادِ عمیق‌تر این بود: هیچ‌جا ثبت نمی‌شد که «این قسمت صدای باران
 * می‌خواست و بانک نداشت». musicWish_ فقط *جایگاه* را ثبت می‌کرد
 * (شروع/پایان/میانه)، و musicPlanModel_ هم فقط شناسه‌های موجود را به مدل
 * نشان می‌داد — پس مدل حتی نمی‌توانست بگوید چه چیزی کم دارد.
 * یعنی حلقه‌ای که بسته به‌نظر می‌رسید ولی راهِ برگشت نداشت: بانک هرگز
 * نمی‌توانست یاد بگیرد برنامه‌ها واقعاً به چه صدایی نیاز دارند.
 */
function sfxWish_(wants, ctx) {
  if (!wants || !wants.length) return null;
  try {
    var prev = getOutJson_(MUSIC_WISH_()) || { items: [] };
    var items = (prev.items || []).slice(-30);
    var n = 0;
    for (var i = 0; i < wants.length; i++) {
      var w = wants[i] || {};
      var sound = String(w.sound || '').trim();
      if (!sound) continue;
      n = wishAdd_(items, {
        at: nowStr_(), kind: 'افکت', sound: sound,
        en: String(w.en || ''), why: String(w.why || ''),
        slots: ['میانه'], mood: '',
        title: String((ctx && ctx.title) || ''),
        category: String((ctx && ctx.category) || ''),
        note: 'جلوهٔ صوتیِ کوتاه (۲ تا ۶ ثانیه)، فقط WAV. ' +
              'در پوشهٔ «' + (CFG.MUSIC_FOLDER || 'موسیقی و افکت') + '» بگذارید.'
      }, 'خواستهٔ جلوهٔ صوتی ثبت شد: «' + sound + '»' +
         (w.en ? ' (' + w.en + ')' : ''));
    }
    return n;
  } catch (e) { return null; }
}

/** واژه‌های انگلیسیِ جست‌وجو، از روی افکت‌هایی که واقعاً خواسته شده‌اند. */
function sfxWantedTerms_() {
  var out = [], seen = {};
  try {
    var w = getOutJson_(MUSIC_WISH_());
    var items = (w && w.items) || [];
    for (var i = items.length - 1; i >= 0 && out.length < 5; i--) {
      if (String(items[i].kind || '') !== 'افکت') continue;
      var t = String(items[i].en || '').trim();
      if (!t || seen[t]) continue;
      seen[t] = 1; out.push(t);
    }
  } catch (e) {}
  return out;
}

/* ═══════════════════ آوردنِ موسیقی از اینترنت (۵٫۵۵) ═══════════════════

   ══ چرا بانک تا امروز خالی ماند ══
   طرحِ اولیه این بود: موتور می‌گوید چه لازم دارد (_MUSIC-WISH.json) و تسکِ
   غنی‌سازی از وب پیدا می‌کند، به WAV تبدیل می‌کند و در پوشهٔ بانک می‌گذارد.
   دستورش هم نوشته شده بود. ولی خودِ تسک گزارش داد که در محیطِ ابری نمی‌تواند
   فایلِ صوتی تهیه و بارگذاری کند — و کسی آن گزارش را به کارِ بعدی وصل نکرد.
   نتیجه: هفت آرزوی ثبت‌شده و صفر فایل.

   ══ تقسیمِ کارِ تازه ══
   هرکس همان کاری را می‌کند که واقعاً از دستش برمی‌آید:
     • تسکِ غنی‌سازی وب را می‌گردد و *نشانیِ* یک فایلِ WAVِ آزاد را با مجوزش
       در `_MUSIC-FEED.json` می‌نویسد. این فقط متن است؛ از پسش برمی‌آید.
     • موتور نشانی را می‌گیرد، دانلود می‌کند، **هدرِ WAV را می‌سنجد** و در
       پوشهٔ بانک می‌نشاند. UrlFetchApp همین حالا هم engine.gs را می‌آورد.

   ══ چه چیزی وارد بانک نمی‌شود ══
   هرچه هدرِ RIFF/WAVE نداشته باشد — MP3ی که پسوندش را WAV گذاشته‌اند، صفحهٔ
   HTMLِ خطا، دانلودِ نصفه. اینها ذخیره نمی‌شوند، چون یک فایلِ خرابِ در بانک
   بدتر از بانکِ خالی است: هر شب انتخاب می‌شود و هر شب سکوت پخش می‌کند.

   ══ و آنچه اینجا نیست ══
   هیچ موسیقی‌ای *ساخته* نمی‌شود. مدل فقط انتخاب می‌کند کدام قطعهٔ موجود کجا
   پخش شود و از کجایش بریده شود. ساختنِ موسیقی نه در توانِ این موتور است و نه
   جایی از این پروژه خواسته شده.
   ═════════════════════════════════════════════════════════════════════════ */

function MUSIC_FEED_() { return CFG.MUSIC_FEED_FILE || '_MUSIC-FEED.json'; }

/** نشانی‌هایی که یک بار آورده شده‌اند. فایلی که کاربر پاک کند برنمی‌گردد. */
function musicFetchedUrls_() {
  try { return JSON.parse(props_().getProperty(PK.MUSIC_FETCHED) || '[]') || []; }
  catch (e) { return []; }
}

function musicFetchedAdd_(url) {
  try {
    var L = musicFetchedUrls_();
    if (L.indexOf(url) === -1) L.push(url);
    props_().setProperty(PK.MUSIC_FETCHED, JSON.stringify(L.slice(-200)));
  } catch (e) {}
}

function musicFetchedDrop_(urls) {
  try {
    var L = musicFetchedUrls_();
    var out = L.filter(function (u) { return urls.indexOf(u) === -1; });
    props_().setProperty(PK.MUSIC_FETCHED, JSON.stringify(out));
    return L.length - out.length;
  } catch (e) { return 0; }
}

/* ردهایی که علتشان اصلاح شده و باید یک بار دوباره امتحان شوند.
   هر ردیف: [بخشی از متنِ خطا، نوعِ محدودکننده یا خالی]. */
var MUSIC_RETRY_WHY = [
  ['خوانده نشد یا PCM نیست', ''],      // ۵٫۷۸: EXTENSIBLE هم PCM است
  ['نرخِ ضبطِ گفتار', 'افکت']           // ۵٫۷۸: نرخِ پایین برای افکت عادی است
];

/**
 * ردهای ناحقِ گذشته را یک بار باز می‌کند.
 *
 * ══ چرا اصلاحِ کد به‌تنهایی کافی نیست ══
 * وقتی نامزدی رد می‌شود دو چیز ثبت می‌شود: `status:'رد'` در فهرست، و
 * نشانی‌اش در سیاههٔ «دیگر امتحان نکن». هر دو عمدی‌اند و درست: بی آن‌ها
 * موتور هر شب همان MP3 را دانلود می‌کرد و فایلی که کاربر پاک کرده
 * برمی‌گشت.
 * ولی وقتی معلوم شود ردّ *ناحق* بوده، همان دو ثبت آن را برای همیشه دفن
 * می‌کنند. ۲۴ اوت پنج فایلِ سالم — سه‌تا CC0 از OpenGameArt — با
 * «PCM نیست» رد شده بودند چون قالبشان EXTENSIBLE بود. اصلاحِ خواننده
 * بی این تابع، فقط برای فایل‌های *آینده* کار می‌کرد.
 * یک بار برای هر نسخه اجرا می‌شود، و فقط علت‌هایی را باز می‌کند که در
 * MUSIC_RETRY_WHY نام برده شده‌اند — نه هر ردّی را.
 */
function musicUnblock_() {
  var out = { freed: 0, notes: [] };
  var tag = 'v' + String(CFG.CODE_VERSION);
  try {
    if (String(props_().getProperty(PK.MUSIC_UNBLOCK) || '') === tag) return out;
  } catch (e0) {}

  var feed = null;
  try { feed = musicFeedRead_(); } catch (e) { return out; }
  if (!feed || !feed.items) return out;

  var freed = [];
  for (var i = 0; i < feed.items.length; i++) {
    var it = feed.items[i] || {};
    if (String(it.status || '') !== 'رد') continue;
    var why = String(it.error || '');
    var kind = String(it.kind || '');
    for (var r = 0; r < MUSIC_RETRY_WHY.length; r++) {
      var pat = MUSIC_RETRY_WHY[r][0], onlyKind = MUSIC_RETRY_WHY[r][1];
      if (why.indexOf(pat) === -1) continue;
      if (onlyKind && kind !== onlyKind) continue;
      it.status = ''; it.error = '';
      it.note = 'ردِ پیشین ناحق بود (' + pat + ') — در ' + tag + ' دوباره امتحان می‌شود.';
      freed.push(String(it.url || ''));
      break;
    }
  }

  try { props_().setProperty(PK.MUSIC_UNBLOCK, tag); } catch (e1) {}
  if (!freed.length) return out;

  musicFetchedDrop_(freed);
  try { putOutJson_(MUSIC_FEED_(), { updatedAt: nowStr_(), items: feed.items }); }
  catch (e2) { return out; }
  out.freed = freed.length;
  logLine_('ردِ ناحقِ پیشین باز شد: ' + freed.length + ' نشانی دوباره امتحان می‌شود.');
  return out;
}

/** نامِ فایلِ امن از روی عنوان یا نشانی. */
function musicFileName_(item) {
  var base = String((item && item.title) || '').trim();
  if (!base) {
    base = String((item && item.url) || '').split('?')[0].split('/').pop() || 'track';
    base = base.replace(/\.[A-Za-z0-9]+$/, '');
  }
  base = base.replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return (base || 'track') + '.wav';
}

/**
 * فهرستِ پیشنهادی، **از روی همهٔ نسخه‌های هم‌نام**.
 *
 * تازه‌ترین نسخه را خواندن کافی نیست: هیچ تضمینی نیست که نسخهٔ تازه
 * ابرمجموعهٔ کهنه باشد. اگر تسک فایلِ تازه‌ای بسازد که فقط پیشنهادهای
 * همین ساعت را دارد، «تازه‌ترین را بخوان» یعنی هرچه دیشب آمده گم شود —
 * و بدتر، وضعیتِ «آمد/رد شد» هم گم شود و همان فایلِ ردشده دوباره دانلود.
 * پس اجتماعِ همه، کلیدش نشانی، و تازه‌ترین رکورد برنده.
 */
function musicFeedRead_() {
  var files = [];
  try { files = outFilesByName_(MUSIC_FEED_()); } catch (e) { files = []; }
  if (!files.length) return { items: [] };
  if (files.length === 1) {
    try { return JSON.parse(files[0].getBlob().getDataAsString()) || { items: [] }; }
    catch (e1) { return { items: [] }; }
  }

  var byUrl = {}, order = [];
  // از کهنه به تازه، تا رکوردِ تازه‌تر روی کهنه بنشیند
  for (var i = files.length - 1; i >= 0; i--) {
    var j = null;
    try { j = JSON.parse(files[i].getBlob().getDataAsString()); } catch (e2) { continue; }
    var it = (j && j.items) || [];
    for (var k = 0; k < it.length; k++) {
      var u = String((it[k] && it[k].url) || '');
      if (!u) continue;
      if (!byUrl[u]) order.push(u);
      // رکوردی که وضعیت دارد («آمد» یا «رد شد») هرگز با رکوردِ بی‌وضعیت
      // پوشانده نمی‌شود — وگرنه فایلِ ردشده دوباره دانلود می‌شود.
      var old = byUrl[u];
      if (old && String(old.status || '') && !String(it[k].status || '')) continue;
      byUrl[u] = it[k];
    }
  }
  var out = [];
  for (var z = 0; z < order.length; z++) out.push(byUrl[order[z]]);
  logLine_('فهرستِ موسیقی از ' + files.length + ' نسخهٔ هم‌نام یکی شد: ' +
           out.length + ' نامزد.');
  return { items: out };
}

/**
 * فهرستِ پیشنهادها را می‌خواند، دانلود می‌کند و در بانک می‌نشاند.
 * برمی‌گرداند {read, added, failed, notes:[…]}
 */
function musicFetch_() {
  var out = { read: 0, added: 0, failed: 0, notes: [] };
  if (CFG.MUSIC_ENABLED === false || CFG.MUSIC_FETCH === false) return out;

  var feed = null;
  try { feed = musicFeedRead_(); } catch (e) { return out; }
  if (!feed || !feed.items || !feed.items.length) return out;

  var cap = Number(CFG.MUSIC_FETCH_MAX_PER_RUN) || 3;
  var maxB = Number(CFG.MUSIC_FETCH_MAX_BYTES) || 12000000;
  // سقفِ واقعی زمان است، نه شمار: کارِ شبانه مهلتِ شش‌دقیقه‌ای دارد و هر
  // دانلود چند ده ثانیه می‌برد. با سقفِ ثابتِ کوچک، بانک بی‌دلیل آرام پر
  // می‌شد؛ با سقفِ بزرگ و بی‌مهلت، کلِ کارِ شبانه وسط کشته می‌شد.
  var t0 = new Date().getTime();
  var budget = Math.max(20000, Number(CFG.MUSIC_FETCH_BUDGET_MS) || 150000);
  var done = musicFetchedUrls_();
  var folder = musicFolder_();
  var changed = false;

  /* ── افکت‌ها اول دانلود می‌شوند ──
   * فهرست به ترتیبِ ورود پیمایش می‌شد. موسیقی چند مگابایت است و افکت چند
   * صد کیلوبایت؛ یک صفِ موسیقی می‌توانست شب‌ها جلوی تنها افکتِ صف را
   * بگیرد — همان چیزی که در عمل هم شد: «Video Game Sound Ideas» نامزد شد
   * و هفت فایلِ موسیقی جلوترش دانلود شدند و وقت تمام شد.
   * افکت هم کمیاب‌تر است هم ارزان‌تر، پس اولویتش طبیعی است. */
  var order = [];
  for (var q0 = 0; q0 < feed.items.length; q0++) {
    if (String((feed.items[q0] || {}).kind || '') === 'افکت') order.push(q0);
  }
  for (var q1 = 0; q1 < feed.items.length; q1++) {
    if (String((feed.items[q1] || {}).kind || '') !== 'افکت') order.push(q1);
  }

  for (var oi = 0; oi < order.length && out.added + out.failed < cap; oi++) {
    if (new Date().getTime() - t0 > budget) {
      out.notes.push('وقتِ این اجرا تمام شد؛ بقیه در اجرای بعد.');
      break;
    }
    var it = feed.items[order[oi]] || {};
    if (it.status) continue;                       // قبلاً رسیدگی شده
    var url = String(it.url || '').trim();
    out.read++;

    if (!/^https:\/\//i.test(url)) {
      it.status = 'رد'; it.error = 'نشانی باید https باشد';
      changed = true; out.failed++; continue;
    }
    if (done.indexOf(url) !== -1) {
      it.status = 'تکراری'; it.error = 'این نشانی قبلاً آورده شده';
      changed = true; continue;
    }
    /* ── سدِ ارزان: پیش از دانلود ──
     * صاحبِ برنامه pixabay را پیشنهاد داد — ۱۳۰ هزار جلوهٔ صوتی، ولی همه
     * MP3، و Apps Script رمزگشای MP3 ندارد و کتابخانه‌ای هم در دسترس نیست.
     * سدِ هدر (پایین‌تر) این‌ها را می‌گیرد، ولی *بعد از* دانلودِ کاملشان.
     * وقتی از خودِ نشانی پیداست که WAV نیست، چند مگابایت و چند ده ثانیه از
     * مهلتِ شش‌دقیقه‌ای را خرج نمی‌کنیم. و پیام صریح است، تا آن که پیشنهاد
     * می‌دهد بفهمد چرا رد شد و همان را دوباره نفرستد.
     */
    var ext = String((url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i) || [])[1] || '')
                .toLowerCase();
    if (ext && ext !== 'wav' && ext !== 'wave') {
      it.status = 'رد';
      it.error = 'قالبِ «' + ext + '» — موتور فقط WAV می‌خوانَد (Apps Script ' +
                 'رمزگشای MP3/OGG ندارد). پیش از پیشنهاد، به WAV تبدیلش کنید.';
      changed = true; out.failed++;
      musicFetchedAdd_(url);
      continue;
    }

    var bytes = null, code = 0;
    try {
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      code = res.getResponseCode();
      if (code === 200) bytes = res.getBlob().getBytes();
    } catch (eF) {
      it.status = 'رد'; it.error = 'دانلود نشد: ' + eF.message;
      changed = true; out.failed++; continue;
    }
    if (code !== 200 || !bytes) {
      it.status = 'رد'; it.error = 'پاسخِ ' + code;
      changed = true; out.failed++; continue;
    }
    if (bytes.length > maxB) {
      it.status = 'رد';
      it.error = 'حجم ' + Math.round(bytes.length / 1e6) + ' مگابایت، بیشتر از سقفِ ' +
                 Math.round(maxB / 1e6);
      changed = true; out.failed++; continue;
    }

    // تنها سنجهٔ معتبر: خودِ هدر. پسوندِ فایل و Content-Type هر دو دروغ می‌گویند.
    var info = null;
    try { info = wavInfo_(bytes); } catch (eW) { info = null; }
    if (!info || !(info.seconds > 0)) {
      it.status = 'رد';
      it.error = 'WAV نیست (یا هدرش خوانده نشد). MP3 در Apps Script رمزگشایی نمی‌شود.';
      changed = true; out.failed++;
      musicFetchedAdd_(url);                       // دوباره امتحان نمی‌شود
      continue;
    }

    // و سدِ چهارم، که ۵٫۵۶ نداشت: «این اصلاً موسیقی است؟»
    var acc = musicAccept_(bytes, info, String(it.title || '') + ' ' + url,
                           String(it.kind || 'موسیقی'));
    if (!acc.ok) {
      it.status = 'رد'; it.error = acc.why;
      changed = true; out.failed++;
      musicFetchedAdd_(url);
      logLine_('موسیقی رد شد — ' + auditCut_(String(it.title || url), 50) + ': ' + acc.why);
      continue;
    }

    var name = musicFileName_(it);
    var file;
    try {
      file = folder.createFile(Utilities.newBlob(bytes, 'audio/wav', name));
    } catch (eC) {
      it.status = 'رد'; it.error = 'ذخیره نشد: ' + eC.message;
      changed = true; out.failed++; continue;
    }

    // همراهِ فایل، هویتش. موتور این را بر نامِ فایل مقدم می‌داند.
    try {
      folder.createFile(Utilities.newBlob(JSON.stringify({
        title: String(it.title || name.replace(/\.wav$/i, '')),
        url: url, license: String(it.license || ''),
        kind: String(it.kind || 'موسیقی'), mood: String(it.mood || ''),
        slots: String(it.slots || ''), gain: String(it.gain || ''),
        source: String(it.source || ''), at: nowStr_(),
        // «چطور تأیید شد» — تا در تب دیده شود و کاربر فقط به همان‌هایی که
        // نامعلوم‌اند گوش بدهد، نه به همه.
        heard: String(acc.heard || ''), verdict: String(acc.why || '')
      }, null, 1), 'application/json',
        '_MUSIC-META-' + name.replace(/\.wav$/i, '') + '.json'));
    } catch (eS) {}

    musicFetchedAdd_(url);
    it.status = 'آمد';
    it.fileId = file.getId();
    it.at = nowStr_();
    it.sec = Math.round(info.seconds);
    changed = true; out.added++;
    out.notes.push(name + ' (' + Math.round(info.seconds) + 'ث، ' + info.rate + ' هرتز)');
    logLine_('موسیقی آورده شد: «' + name + '» — ' + Math.round(info.seconds) + ' ثانیه، ' +
             info.rate + ' هرتز، ' + Math.round(bytes.length / 1e6 * 10) / 10 + ' مگابایت.');
  }

  // نتیجه به همان فایل برمی‌گردد تا تسک ببیند چه شد و چه چیزی رد شد.
  if (changed) {
    try { putOutJson_(MUSIC_FEED_(), { updatedAt: nowStr_(), items: feed.items }); } catch (eP) {}
  }
  if (out.failed) {
    logLine_('آوردنِ موسیقی: ' + out.added + ' آمد، ' + out.failed + ' رد شد.');
  }
  return out;
}

/* ═══════════ گشتنِ خودکار در archive.org (۵٫۵۶) ═══════════

   ══ چرا لازم شد ══
   ۵٫۵۵ کار را درست تقسیم کرد (تسک نشانی می‌نویسد، موتور دانلود می‌کند) ولی
   یک وابستگی باقی گذاشت: اگر تسک اجرا نشود، یا نتواند نشانیِ مستقیمِ WAV
   پیدا کند، بانک باز هم خالی می‌ماند. و بیشترِ سایت‌های موسیقیِ آزاد فقط MP3
   می‌دهند — که Apps Script رمزگشایش نمی‌کند. یعنی محتمل‌ترین نتیجه همان
   «رد — WAV نیست» بود، هر شب.

   ══ چرا archive.org و نه جای دیگر ══
   تنها جایی که پیش از دانلود می‌شود مطمئن شد: metadata API فهرستِ فایل‌ها را
   با **فرمت و حجم** می‌دهد و مجوز را هم. پس نامزدی که WAV نیست یا بزرگ‌تر از
   سقف است اصلاً وارد فهرست نمی‌شود. جاهای دیگر باید دانلود کنی تا بفهمی.

   ══ مرزی که رعایت می‌شود ══
   این تابع **دانلود نمی‌کند** — فقط نامزدها را در همان `_MUSIC-FEED.json`
   می‌نویسد. دانلود همیشه از یک مسیر می‌گذرد (musicFetch_) با همان سه سد و
   همان ردِ ثبت‌شده. دو مسیرِ دانلود یعنی دو جای شکست و یک تاریخچهٔ نصفه.

   ══ مجوز ══
   نامزدی که `licenseurl` نداشته باشد کنار گذاشته می‌شود. «مجوزی که نتوانی
   نامش را بگویی» همان قاعده‌ای است که در دستورِ تسک هم هست.
   ═════════════════════════════════════════════════════════════════════════ */

/** مجموعه‌هایی که قبلاً دیده شده‌اند. */
function musicSeenIds_() {
  try { return JSON.parse(props_().getProperty(PK.MUSIC_SEEN) || '[]') || []; }
  catch (e) { return []; }
}

function musicSeenAdd_(id) {
  try {
    var L = musicSeenIds_();
    if (L.indexOf(id) === -1) L.push(id);
    props_().setProperty(PK.MUSIC_SEEN, JSON.stringify(L.slice(-300)));
  } catch (e) {}
}

/** یک GETِ JSON با گذشتِ نرم — هر شکستی یعنی «چیزی پیدا نشد»، نه خطا. */
function musicApiJson_(url) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    return JSON.parse(res.getContentText());
  } catch (e) { return null; }
}

/**
 * پرسشِ جست‌وجو از روی جایگاهی که کم داریم.
 *
 * حال‌وهوا عمداً وارد پرسش نمی‌شود: برچسب‌های archive.org فارسی نیستند و
 * «اجتماعی و سبک زندگی» هیچ نتیجه‌ای نمی‌دهد. برچسب‌زنیِ حال‌وهوا کارِ
 * musicAutoTag_ است، بعد از رسیدنِ فایل.
 */
/* واژه‌های انگلیسیِ پیش‌فرض، اگر نه آرزویی ثبت شده باشد و نه مدل در دسترس
 * باشد. عمداً کوتاه و بی‌طرف — این «هیچ ترجیحی نداریم» است، نه یک سلیقه. */
var MUSIC_TERMS_FALLBACK = {
  'شروع': 'instrumental OR ambient OR piano',
  'پایان': 'ambient OR calm OR instrumental',
  'میانه': 'loop OR interlude OR short'
};

/* نگاشتِ دستیِ فارسی → انگلیسی. راهِ دومِ ارزان، وقتی مدل نبود.
 * دقیق نیست و لازم هم نیست باشد: فقط باید جست‌وجو را از «هر موسیقی» به
 * «موسیقیِ این حال‌وهوا» ببرد. */
var MUSIC_MOOD_HINTS = [
  ['طنز|سرگرم|شاد|کمدی', 'upbeat OR playful OR light'],
  ['آموزش|شمرده|درس|علمی|فلسف', 'calm OR minimal OR contemplative'],
  ['مذهب|معنوی|عرفان', 'meditative OR ambient OR drone'],
  ['خبر|سیاس|هشدار', 'tense OR serious OR cinematic'],
  ['نوستالژ|احساس|غم', 'melancholic OR nostalgic OR piano'],
  ['اجتماع|سبک زندگی|روزمره', 'warm OR acoustic OR mellow'],
  ['هنر|موسیقی|فرهنگ|تاریخ', 'orchestral OR folk OR acoustic'],
  ['مال|اقتصاد|ترید', 'neutral OR corporate OR minimal']
];

/** حال‌وهواهایی که واقعاً خواسته شده‌اند، از فایلِ آرزوها. */
function musicWantedMoods_() {
  try {
    var w = getOutJson_(MUSIC_WISH_());
    var items = (w && w.items) || [];
    var seen = {}, out = [];
    for (var i = items.length - 1; i >= 0 && out.length < 8; i--) {
      if (String(items[i].kind || '') === 'افکت') continue;   // آرزوی افکت حال‌وهوا نیست
      var m = String(items[i].mood || items[i].category || '').trim();
      if (!m || seen[m]) continue;
      seen[m] = 1; out.push(m);
    }
    return out;
  } catch (e) { return []; }
}

/**
 * واژه‌های جست‌وجو، از روی حال‌وهوایی که واقعاً خواسته شده.
 *
 * ══ چرا لازم شد ══
 * ۵٫۵۶ عمداً حال‌وهوا را از پرسش بیرون گذاشته بود، با این استدلال که
 * برچسب‌های archive.org فارسی نیستند. استدلال درست بود، نتیجه‌گیری غلط:
 * راهش ترجمه بود، نه انداختنِ حال‌وهوا. نتیجه این شد که بانک با موسیقیِ
 * تصادفی پر می‌شد و بعد «انتخابِ متناسب با وایب» از میانِ همان تصادف انجام
 * می‌شد — یعنی نمایش.
 *
 * حالا آرزوهای ثبت‌شده (که خودشان از عنوان و دستهٔ قسمت‌های واقعی آمده‌اند)
 * به واژهٔ انگلیسی ترجمه می‌شوند. مدل اگر نبود، جدولِ نگاشت؛ آن هم اگر
 * نخورد، پیش‌فرضِ بی‌طرف.
 */
function musicSeekTerms_(slot) {
  var moods = musicWantedMoods_();
  if (!moods.length) return MUSIC_TERMS_FALLBACK[slot] || MUSIC_TERMS_FALLBACK['شروع'];

  if (CFG.MUSIC_AUTO !== false) {
    try {
      var r = geminiText_(
        'این‌ها حال‌وهواهایی است که یک پادکستِ فارسی برای موسیقیِ خودش خواسته:\n' +
        moods.map(function (m) { return '• ' + m; }).join('\n') +
        '\n\nجایگاهِ موردِ نظر: ' + slot +
        ' (شروع = موسیقیِ آغازِ برنامه، پایان = موسیقیِ پایان، میانه = قطعهٔ کوتاهِ بینِ دو بخش)' +
        '\n\nسه تا پنج واژهٔ انگلیسیِ جست‌وجو بده که در آرشیوِ موسیقیِ آزاد،' +
        ' قطعهٔ سازیِ متناسب با این حال‌وهوا را پیدا کند. فقط صفتِ حال‌وهوا و نامِ ساز' +
        ' و سبک — نه نامِ خواننده، نه واژه‌ای که به گفتار بخورد (مثل talk یا intro).' +
        ' با OR جدا کن. فقط همان رشته را برگردان.',
        { type: 'object', properties: { terms: { type: 'string' } }, required: ['terms'] },
        256);
      var t = String((r && r.terms) || '').trim();
      // «intro/talk/…» حتی اگر مدل بدهد پذیرفته نمی‌شود — همان واژه‌ای که
      // ۵٫۵۶ را به مناظرهٔ آقای برنز رساند.
      t = t.replace(/\b(intro|talk|speech|remarks|lecture|interview|podcast|opening)\b/gi, '')
           .replace(/\s*OR\s*OR\s*/gi, ' OR ').replace(/^\s*OR\s*|\s*OR\s*$/gi, '').trim();
      if (t.length > 3 && /^[\x20-\x7E]+$/.test(t)) return t;
    } catch (e) {}
  }

  for (var i = 0; i < MUSIC_MOOD_HINTS.length; i++) {
    for (var j = 0; j < moods.length; j++) {
      if (new RegExp(MUSIC_MOOD_HINTS[i][0]).test(moods[j])) return MUSIC_MOOD_HINTS[i][1];
    }
  }
  return MUSIC_TERMS_FALLBACK[slot] || MUSIC_TERMS_FALLBACK['شروع'];
}

function musicSeekQuery_(slot, terms) {
  /* پرسشِ ۵٫۵۶ دو ایراد داشت. اول اینکه واژهٔ «intro» در متنِ آزاد،
   * «Opening Remarks of Sean F. Byrnes at LVG Debate» را هم می‌گرفت، و
   * mediatype:(audio) در archive.org یعنی «هر صدایی» — سخنرانی، مناظره،
   * کتابِ صوتی. پس حالا از خودِ مجموعه‌های موسیقی گرفته می‌شود.
   *
   * دوم اینکه هیچ ربطی به قسمت‌های واقعی نداشت؛ آن را musicSeekTerms_ حل
   * می‌کند.
   */
  var t = String(terms || '').trim() || MUSIC_TERMS_FALLBACK[slot] ||
          MUSIC_TERMS_FALLBACK['شروع'];
  return 'collection:(netlabels OR audio_music) AND format:(WAVE) AND ' +
         'licenseurl:(*creativecommons* OR *publicdomain*) AND (' + t + ')';
}

/**
 * نامزد پیدا می‌کند و به `_MUSIC-FEED.json` اضافه می‌کند. دانلود نمی‌کند.
 * برمی‌گرداند {added, looked, notes:[…]}
 */
/** پرسشِ جست‌وجوی جلوهٔ صوتی. عمداً از موسیقی جداست. */
function sfxSeekQuery_(terms) {
  /* تا ۵٫۶۶ این پرسش هیچ آرگومانی نمی‌گرفت: یک رشتهٔ ثابت که هیچ ربطی به
     هیچ قسمتی نداشت. بانکِ افکت با هرچه archive.org برای «foley» می‌داد پر
     می‌شد و روی عددِ هدف می‌ایستاد — و اگر قسمتِ فردا صدای باران می‌خواست،
     شانسی بود که باران در آن هشت‌تا باشد.
     حالا اگر خواسته‌ای ثبت شده باشد، دنبالِ همان می‌گردیم. */
  var t = String(terms || '').trim();
  return 'collection:(soundeffects OR opensource_audio) AND format:(WAVE) AND ' +
         'licenseurl:(*creativecommons* OR *publicdomain*) AND (' +
         (t || 'foley OR ambience OR ambient sound OR "sound effect" OR nature recording') +
         ')';
}

/* صداهای پایه‌ای که تقریباً هر برنامهٔ گفت‌وگومحوری دیر یا زود لازمشان دارد.
 *
 * ══ چرا فهرستِ عمومی بد بود ══
 * تا ۵٫۶۸ وقتی خواسته‌ای ثبت نشده بود، دنبالِ «foley OR ambience OR nature
 * recording» می‌گشتیم. این‌ها ضبط‌های *بلندِ* فضای محیطی برمی‌گردانند —
 * ده دقیقه جنگل، بیست دقیقه ترافیک — نه صدای سه‌ثانیه‌ایِ بستنِ در. یعنی
 * بانکِ افکت با چیزهایی پر می‌شد که هیچ‌وقت به‌دردِ یک جملهٔ روایت نمی‌خورند.
 *
 * حالا تا وقتی خواسته‌ای نرسیده، سراغِ صداهای مشخص می‌رویم — یکی در هر
 * اجرا، و آن‌هایی که بانک از قبل دارد رد می‌شوند.
 */
var SFX_STARTER = [
  ['باران', 'rain drops'],
  ['در', 'door open close'],
  ['تلفن', 'telephone ring'],
  ['قدم', 'footsteps walking'],
  ['جمعیت', 'crowd murmur'],
  ['ساعت', 'clock ticking'],
  ['باد', 'wind gust'],
  ['کاغذ', 'paper page turn'],
  ['دریا', 'ocean waves'],
  ['تایپ', 'typewriter keys']
];

/** نخستین صدای پایه‌ای که بانک هنوز ندارد. '' یعنی همه را دارد. */
function sfxStarterTerms_() {
  var have = '';
  try {
    var bank = musicBank_();
    for (var i = 0; i < bank.length; i++) {
      if (String(bank[i].kind || '') !== 'افکت') continue;
      have += ' ' + String(bank[i].name || '') + ' ' + String(bank[i].mood || '');
    }
  } catch (e) {}
  have = have.toLowerCase();
  var n = 0;
  try { n = parseInt(props_().getProperty(PK.SFX_TURN) || '0', 10) || 0; } catch (e2) {}
  for (var k = 0; k < SFX_STARTER.length; k++) {
    var idx = (n + k) % SFX_STARTER.length;
    var word = SFX_STARTER[idx][1].split(' ')[0];
    if (have.indexOf(word) !== -1) continue;         // از قبل هست
    try { props_().setProperty(PK.SFX_TURN, String((idx + 1) % SFX_STARTER.length)); } catch (e3) {}
    return SFX_STARTER[idx][1];
  }
  return '';
}

function musicSeek_(slots, sfxOnly) {
  var out = { added: 0, looked: 0, notes: [] };
  if (CFG.MUSIC_ENABLED === false || CFG.MUSIC_SEEK === false) return out;

  var want = (slots && slots.length) ? slots : ['شروع', 'پایان', 'میانه'];
  var cap = Number(CFG.MUSIC_SEEK_MAX) || 4;
  var maxB = Number(CFG.MUSIC_FETCH_MAX_BYTES) || 12000000;
  var minSec = Number(CFG.MUSIC_SEEK_MIN_SEC) || 5;
  var base = String(CFG.MUSIC_SEEK_API || 'https://archive.org').replace(/\/+$/, '');

  var feed = null;
  try { feed = musicFeedRead_(); } catch (e) {}
  if (!feed || !feed.items) feed = { items: [] };

  var already = {};
  for (var q = 0; q < feed.items.length; q++) already[String(feed.items[q].url || '')] = 1;
  var fetched = musicFetchedUrls_();
  for (var q2 = 0; q2 < fetched.length; q2++) already[fetched[q2]] = 1;
  var seen = musicSeenIds_();

  for (var si = 0; si < want.length && out.added < cap && !sfxOnly; si++) {
    var slot = want[si];
    // اگر می‌دانیم *کدام خانواده* کم است، دنبالِ همان می‌گردیم — نه دنبالِ
    // «موسیقیِ خوب» به‌طور کلی. بانکی که همه‌اش پیانوی آرام باشد، برای
    // قسمتِ طنز هیچ ندارد هرچقدر هم بزرگ باشد.
    var gap = null, worn = false;
    try {
      var cov = musicCoverage_();
      for (var gi = 0; gi < cov.gaps.length; gi++) {
        if (cov.gaps[gi].slot === slot && cov.gaps[gi].family) { gap = cov.gaps[gi]; break; }
      }
      // کمبودی نبود؟ پس دنبالِ خانوادهٔ فرسوده می‌گردیم — همان چرخشی که
      // بانک را از انجماد در می‌آورد.
      if (!gap) {
        for (var wi = 0; wi < (cov.worn || []).length; wi++) {
          if (cov.worn[wi].slot === slot && cov.worn[wi].family) {
            gap = cov.worn[wi]; worn = true; break;
          }
        }
      }
    } catch (eC) {}
    var terms = gap ? musicTermsForFamily_(gap.family, slot) : musicSeekTerms_(slot);
    // صفحه فقط وقتی جلو می‌رود که چرخش باشد؛ برای کمبودِ واقعی، نتیجه‌های
    // اولِ همان واژه‌ها بهترین‌اند.
    var page = worn ? musicSeekPage_(true) : 1;
    out.notes.push(slot +
                   (gap ? (worn ? ' (چرخش — خانوادهٔ ' + gap.family.split('|')[0] +
                                  ' فرسوده، صفحهٔ ' + page + ')'
                                : ' (کمبودِ خانوادهٔ ' + gap.family.split('|')[0] + ')') : '') +
                   ' ← گشته شد با: ' + terms);
    var url = base + '/advancedsearch.php?q=' + encodeURIComponent(musicSeekQuery_(slot, terms)) +
              '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=licenseurl' +
              '&rows=25&page=' + page + '&output=json';
    var sr = musicApiJson_(url);
    var docs = (sr && sr.response && sr.response.docs) || [];
    out.looked += docs.length;
    if (!docs.length) { out.notes.push(slot + ': نتیجه‌ای نیامد'); continue; }

    for (var di = 0; di < docs.length && out.added < cap; di++) {
      var id = String(docs[di].identifier || '');
      if (!id || seen.indexOf(id) !== -1) continue;
      musicSeenAdd_(id); seen.push(id);

      var meta = musicApiJson_(base + '/metadata/' + encodeURIComponent(id));
      if (!meta || !meta.files) continue;
      var lic = String((meta.metadata && meta.metadata.licenseurl) || docs[di].licenseurl || '');
      if (!lic) continue;                       // مجوزِ نامعلوم = رد
      var title = String((meta.metadata && meta.metadata.title) || docs[di].title || id);
      // ارزان‌ترین سد: نامی که خودش می‌گوید گفتار است، اصلاً دانلود نشود
      var pre = musicIsSpeech_(null, null, title + ' ' + id);
      if (pre.speech && pre.sure) {
        out.notes.push('رد پیش از دانلود: ' + auditCut_(title, 40) + ' — ' + pre.why);
        continue;
      }

      // کوچک‌ترین WAVِ زیرِ سقف: کمترین احتمالِ شکست، و برای بریدن هم بس است
      var best = null;
      for (var fi = 0; fi < meta.files.length; fi++) {
        var f = meta.files[fi] || {};
        var nm = String(f.name || '');
        if (!/\.wav$/i.test(nm)) continue;
        var sz = Number(f.size || 0);
        if (!(sz > 0) || sz > maxB) continue;
        var len = Number(f.length || 0);        // archive گاهی ثانیه می‌دهد، گاهی هیچ
        if (len && len < minSec) continue;
        if (!best || sz < best.size) best = { name: nm, size: sz, length: len };
      }
      if (!best) continue;

      var dl = base + '/download/' + encodeURIComponent(id) + '/' +
               encodeURIComponent(best.name);
      if (already[dl]) continue;
      already[dl] = 1;

      feed.items.push({
        url: dl,
        title: auditCut_(title, 60),
        license: lic,
        kind: 'موسیقی',
        // حال‌وهوای *خواسته‌شده*، نه حدسِ نام. musicAutoTag_ بعداً دقیق‌ترش می‌کند.
        mood: (musicWantedMoods_()[0] || ''),
        terms: terms,
        slots: slot,
        gain: '',
        source: base + '/details/' + id,
        by: 'موتور — گشتنِ خودکار'
      });
      out.added++;
      out.notes.push(slot + ': ' + auditCut_(title, 40) +
                     ' (' + Math.round(best.size / 1e5) / 10 + ' مگابایت)');
    }
  }

  // ── جلوه‌های صوتی ──
  // تا ۵٫۶۴ هیچ‌وقت جست‌وجو نمی‌شدند: musicSeek_ فقط سه جایگاهِ موسیقی را
  // می‌گشت و همهٔ نامزدها kind:'موسیقی' می‌گرفتند. یعنی sfxAllow_ — که از
  // ۵٫۴۹ وصل بود — هیچ‌وقت چیزی برای اجازه‌دادن نداشت.
  var sfxWant = Math.max(0, Number(CFG.MUSIC_SFX_TARGET) || 0);
  var sfxHave = 0;
  try { sfxHave = musicCoverage_().sfx; } catch (eS0) {}
  /* ── بودجهٔ جدا، وگرنه افکت هرگز نوبتش نمی‌رسد ──
   *
   * تا ۵٫۷۳ اینجا `out.added < cap` بود — یعنی همان سقفی که حلقهٔ موسیقی
   * بالاترش مصرف می‌کند. موسیقی اول می‌دود؛ اگر هشت نامزد اضافه کند،
   * این شرط غلط می‌شود و افکت **اصلاً گشته نمی‌شود**.
   * و از ۵٫۶۵ گشتنِ موسیقی هیچ‌وقت متوقف نمی‌شود (چرخشِ خانواده‌های
   * فرسوده)، پس این یعنی افکت می‌توانست تا ابد گرسنه بماند.
   * صاحبِ برنامه پرسید «افکت‌ها کِی قرار است از اینترنت پر شوند؟» و جوابِ
   * صادقانه‌اش تا این نسخه «شاید هیچ‌وقت» بود. */
  var sfxCap = Math.max(1, Number(CFG.MUSIC_SFX_SEEK_MAX) || 3);
  var sfxAdded = 0;
  /* سقفِ `sfxHave < sfxWant` برای پر کردنِ *عمومیِ* بانک درست است، ولی وقتی
     صدای **مشخصی** لازم است غلط می‌شود: بانکی که هشت افکتِ دیگر دارد،
     برای قسمتی که «باران» می‌خواهد هیچ ندارد — و این شرط جلوی گشتن را
     می‌گرفت. در حالتِ sfxOnly (پیش از صداگذاری) دنبالِ یک خواستهٔ معیّنیم،
     پس شمارِ کلِ بانک ربطی به آن ندارد. */
  if (CFG.MUSIC_SFX_ENABLED !== false && (sfxOnly || sfxHave < sfxWant)) {
    // دنبالِ صدایی که واقعاً خواسته شده، نه «افکتِ خوب» به‌طور کلی
    var sfxTerms = '';
    try { sfxTerms = sfxWantedTerms_().join(' OR '); } catch (eST) {}
    // خواسته‌ای نبود؟ سراغِ صدای پایه‌ایِ مشخص، نه «ambience»ی کلی.
    if (!sfxTerms) { try { sfxTerms = sfxStarterTerms_(); } catch (eSS2) {} }
    out.notes.push('افکت ← گشته شد با: ' + (sfxTerms || 'واژه‌های عمومی (خواسته‌ای ثبت نشده)'));
    var su = base + '/advancedsearch.php?q=' + encodeURIComponent(sfxSeekQuery_(sfxTerms)) +
             '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=licenseurl' +
             '&rows=25&page=1&output=json';
    var sres = musicApiJson_(su);
    var sdocs = (sres && sres.response && sres.response.docs) || [];
    out.looked += sdocs.length;
    for (var sd = 0; sd < sdocs.length && sfxAdded < sfxCap; sd++) {
      var sid = String(sdocs[sd].identifier || '');
      if (!sid || seen.indexOf(sid) !== -1) continue;
      musicSeenAdd_(sid); seen.push(sid);
      var sPre = musicIsSpeech_(null, null, String(sdocs[sd].title || '') + ' ' + sid);
      if (sPre.speech && sPre.sure) continue;
      var smeta = musicApiJson_(base + '/metadata/' + encodeURIComponent(sid));
      if (!smeta || !smeta.files) continue;
      var slic = String((smeta.metadata && smeta.metadata.licenseurl) || sdocs[sd].licenseurl || '');
      if (!slic) continue;
      // افکت کوتاه است؛ فایلِ چندمگابایتی احتمالاً یک آلبومِ کامل است
      var sbest = null;
      for (var sf = 0; sf < smeta.files.length; sf++) {
        var ff = smeta.files[sf] || {};
        if (!/\.wav$/i.test(String(ff.name || ''))) continue;
        var fsz = Number(ff.size || 0);
        if (!(fsz > 0) || fsz > Math.min(maxB, 3000000)) continue;
        if (!sbest || fsz < sbest.size) sbest = { name: String(ff.name), size: fsz };
      }
      if (!sbest) continue;
      var sdl = base + '/download/' + encodeURIComponent(sid) + '/' +
                encodeURIComponent(sbest.name);
      if (already[sdl]) continue;
      already[sdl] = 1;
      feed.items.push({
        url: sdl,
        title: auditCut_(String((smeta.metadata && smeta.metadata.title) || sid), 60),
        license: slic, kind: 'افکت', mood: '', slots: 'میانه', gain: '',
        source: base + '/details/' + sid, by: 'موتور — گشتنِ خودکار'
      });
      out.added++; sfxAdded++;
      out.notes.push('افکت: ' + auditCut_(sbest.name, 40));
    }
  }

  if (out.added) {
    try { putOutJson_(MUSIC_FEED_(), { updatedAt: nowStr_(), items: feed.items }); } catch (eP) {}
    logLine_('گشتنِ خودکارِ موسیقی: ' + out.added + ' نامزد به فهرست اضافه شد.');
  }
  return out;
}

/** واژه‌های انگلیسیِ یک خانوادهٔ مشخص، با چاشنیِ جایگاه. */
function musicTermsForFamily_(family, slot) {
  var base = '';
  for (var i = 0; i < MUSIC_MOOD_HINTS.length; i++) {
    if (MUSIC_MOOD_HINTS[i][0] === family) { base = MUSIC_MOOD_HINTS[i][1]; break; }
  }
  if (!base) return musicSeekTerms_(slot);
  var extra = (slot === 'میانه') ? ' OR short OR loop' : ' OR instrumental';
  return base + extra;
}

/**
 * جایگاه‌هایی که بانک برایشان **کم** دارد — نه فقط آن‌هایی که خالی‌اند.
 *
 * ══ باگی که این را لازم کرد (۵٫۶۰) ══
 * نسخهٔ قبلی جایگاهی را «کم» می‌شمرد که *صفر* قطعه داشت. یعنی همان شبی که
 * سه فایلِ اول رسیدند، گشتن برای همیشه متوقف می‌شد و بانک روی چهار قطعه
 * یخ می‌زد. از آن به بعد هر قسمت همان موسیقی را می‌گرفت، برای همیشه.
 *
 * و بدتر: «انتخابِ متناسب با وایب» از میانِ یک قطعه در هر جایگاه، انتخاب
 * نیست. تا وقتی بانک به هدف نرسد، انتخاب معنایی ندارد.
 */
var MUSIC_SLOTS = ['شروع', 'پایان', 'میانه'];

/** نامِ خانوادهٔ حال‌وهوا از روی متنِ فارسی. '' یعنی نشناخت. */
function musicMoodFamily_(text) {
  var t = String(text || '');
  for (var i = 0; i < MUSIC_MOOD_HINTS.length; i++) {
    if (new RegExp(MUSIC_MOOD_HINTS[i][0]).test(t)) return MUSIC_MOOD_HINTS[i][0];
  }
  return '';
}

/**
 * پوششِ بانک: برای هر (خانوادهٔ حال‌وهوا × جایگاه) چند قطعه داریم؟
 *
 * ══ چرا عددِ تخت غلط بود ══
 * تا ۵٫۶۳ هدف «پنج قطعه در هر جایگاه» بود. صاحبِ برنامه درست گفت: وایب‌ها
 * زیادند و پنج‌تا هیچ‌کدامشان را پوشش نمی‌دهد. یک بانکِ پنج‌تایی که همه‌اش
 * پیانوی آرام باشد، برای قسمتِ طنز هیچ ندارد — و شمارنده می‌گوید «پُر است».
 *
 * پس شمارش بر حسبِ خانواده است: طنز، آموزشی، مذهبی، خبری، نوستالژی،
 * اجتماعی، هنری، مالی. کمبود هم به همان دقت گزارش می‌شود، تا جست‌وجو
 * دنبالِ همان چیزی برود که واقعاً کم است.
 */
function musicCoverage_(hub) {
  var bank = [];
  try { bank = musicBank_(hub); } catch (e) { bank = []; }
  var per = Math.max(1, Number(CFG.MUSIC_PER_MOOD) || 2);
  var floor = Math.max(1, Number(CFG.MUSIC_BANK_TARGET) || 5);
  var wornAt = Math.max(1, Number(CFG.MUSIC_ROTATE_USED) || 4);
  var bankMax = Math.max(0, Number(CFG.MUSIC_BANK_MAX) || 0);
  // چرخش تا سقفِ بانک. بالاتر از آن، بانک بزرگ‌تر نمی‌شود — نگه‌داشتنِ
  // صدها فایل هم خودش هزینه است و پویشِ شبانه را کند می‌کند.
  var rotate = (CFG.MUSIC_ROTATE !== false) && (!bankMax || bank.length < bankMax);

  var out = { gaps: [], worn: [], total: bank.length, slots: {}, sfx: 0,
              sfxTarget: Math.max(0, Number(CFG.MUSIC_SFX_TARGET) || 0) };
  for (var s0 = 0; s0 < MUSIC_SLOTS.length; s0++) out.slots[MUSIC_SLOTS[s0]] = 0;

  // خودِ قطعه‌ها نگه داشته می‌شوند، نه فقط شمارشان: برای «فرسودگی» باید
  // بارِ استفادهٔ تک‌تکشان دیده شود، و شمارنده آن را دور می‌ریخت.
  var byFam = {};
  for (var i = 0; i < bank.length; i++) {
    var b = bank[i];
    if (String(b.kind || '') === 'افکت') { out.sfx++; continue; }
    var fam = musicMoodFamily_(b.mood);
    for (var s = 0; s < MUSIC_SLOTS.length; s++) {
      if (String(b.slots || '').indexOf(MUSIC_SLOTS[s]) === -1) continue;
      out.slots[MUSIC_SLOTS[s]]++;
      if (!fam) continue;
      var k = fam + '§' + MUSIC_SLOTS[s];
      (byFam[k] = byFam[k] || []).push(b);
    }
  }

  // کمبودِ خانواده‌ای — فقط برای خانواده‌هایی که برنامه واقعاً خواسته‌شان
  // دارد. دنبالِ «موسیقیِ مالی» گشتن وقتی هیچ قسمتِ مالی نداریم، هدررفت است.
  var want = musicWantedFamilies_();
  for (var w = 0; w < want.length; w++) {
    for (var s2 = 0; s2 < MUSIC_SLOTS.length; s2++) {
      var lst = byFam[want[w] + '§' + MUSIC_SLOTS[s2]] || [];
      if (lst.length < per) {
        out.gaps.push({ family: want[w], slot: MUSIC_SLOTS[s2], have: lst.length });
        continue;
      }
      // پُر است — ولی آیا تازه است؟ خانواده‌ای که *همهٔ* قطعه‌هایش فرسوده‌اند
      // هدفِ چرخش می‌شود. یک قطعهٔ تازه در میانشان یعنی هنوز انتخاب هست.
      if (!rotate) continue;
      var fresh = 0, minUsed = -1;
      for (var z = 0; z < lst.length; z++) {
        if ((Number(lst[z].used) || 0) < wornAt) fresh++;
        if (minUsed < 0 || (Number(lst[z].used) || 0) < minUsed) minUsed = Number(lst[z].used) || 0;
      }
      if (!fresh) out.worn.push({ family: want[w], slot: MUSIC_SLOTS[s2],
                                  have: lst.length, used: minUsed });
    }
  }
  // فرسوده‌ترین اول — خانواده‌ای که کم‌مصرف‌ترین قطعه‌اش هم زیاد پخش شده.
  out.worn.sort(function (a, b) { return b.used - a.used; });
  // و کفِ مطلق: جایگاهی که اصلاً کم دارد، مستقل از خانواده
  for (var s3 = 0; s3 < MUSIC_SLOTS.length; s3++) {
    if (out.slots[MUSIC_SLOTS[s3]] < floor) {
      out.gaps.push({ family: '', slot: MUSIC_SLOTS[s3], have: out.slots[MUSIC_SLOTS[s3]] });
    }
  }
  return out;
}

/** خانواده‌هایی که از روی آرزوهای ثبت‌شده واقعاً لازم‌اند. */
function musicWantedFamilies_() {
  var moods = [];
  try { moods = musicWantedMoods_(); } catch (e) {}
  var out = [], seen = {};
  for (var i = 0; i < moods.length; i++) {
    var f = musicMoodFamily_(moods[i]);
    if (f && !seen[f]) { seen[f] = 1; out.push(f); }
  }
  // اگر هنوز آرزویی ثبت نشده، همهٔ خانواده‌ها لازم‌اند — بانک از صفر شروع
  // می‌شود و نمی‌دانیم فردا چه قسمتی می‌آید.
  if (!out.length) {
    for (var j = 0; j < MUSIC_MOOD_HINTS.length; j++) out.push(MUSIC_MOOD_HINTS[j][0]);
  }
  return out;
}

/** جایگاه‌هایی که هنوز کم دارند — از روی پوشش، نه عددِ تخت. */
function musicThinSlots_(hub) {
  var cov = musicCoverage_(hub);
  var out = [], seen = {};
  for (var i = 0; i < cov.gaps.length; i++) {
    var sl = cov.gaps[i].slot;
    if (!seen[sl]) { seen[sl] = 1; out.push(sl); }
  }
  return out;
}


/**
 * جایگاه‌هایی که کمبود ندارند ولی **فرسوده**اند — سوختِ چرخش.
 *
 * ══ چرا لازم شد ══
 * صاحبِ برنامه پرسید: «بعد از چند هفته و استفادهٔ زیاد از همهٔ موسیقی‌ها، باز
 * نمی‌رود دنبالِ تازه‌ها حتی اگر سقفِ هر دسته پر شده باشد؟» جواب تا ۵٫۶۴ «نه»
 * بود، و این نقصِ واقعی است: کارِ شبانه فقط وقتی می‌گشت که musicThinSlots_
 * چیزی برگرداند، و آن فقط *کمبود* را می‌شناخت. شبِ کامل‌شدنِ پوشش، جست‌وجو
 * برای همیشه خاموش می‌شد.
 */
function musicRotateSlots_(hub) {
  if (CFG.MUSIC_ROTATE === false) return [];
  var cov;
  try { cov = musicCoverage_(hub); } catch (e) { return []; }
  var cap = Math.max(0, Number(CFG.MUSIC_ROTATE_SLOTS) || 0);
  if (!cap) return [];
  var out = [], seen = {};
  for (var i = 0; i < cov.worn.length && out.length < cap; i++) {
    var sl = cov.worn[i].slot;
    if (seen[sl]) continue;
    seen[sl] = 1; out.push(sl);
  }
  return out;
}

/**
 * شمارهٔ صفحهٔ جست‌وجو، و چرخاندنش.
 *
 * چرخش با همان واژه‌ها هیچ نتیجهٔ تازه‌ای نمی‌دهد: archive.org همان ۲۵ نتیجهٔ
 * اول را می‌دهد و musicSeenIds_ همه‌شان را قبلاً دیده، پس شبِ چرخش صفر قطعه
 * اضافه می‌شد و چرخش فقط روی کاغذ بود.
 */
function musicSeekPage_(advance) {
  var pages = Math.max(1, Number(CFG.MUSIC_SEEK_PAGES) || 5);
  var n = 0;
  try { n = parseInt(props_().getProperty(PK.MUSIC_PAGE) || '0', 10) || 0; } catch (e) {}
  if (advance) {
    try { props_().setProperty(PK.MUSIC_PAGE, String((n + 1) % pages)); } catch (e2) {}
  }
  return 1 + (n % pages);
}

/** شمارِ قطعه‌های هر جایگاه — برای وضعیت و گزارش. */
function musicSlotCounts_(hub) {
  var need = ['شروع', 'پایان', 'میانه'], out = {};
  var bank = [];
  try { bank = musicBank_(hub); } catch (e) { return out; }
  for (var i = 0; i < need.length; i++) {
    out[need[i]] = 0;
    for (var j = 0; j < bank.length; j++) {
      if (String(bank[j].slots || '').indexOf(need[i]) !== -1) out[need[i]]++;
    }
  }
  return out;
}

/**
 * بازبینیِ هرچه همین حالا در بانک است.
 *
 * لازم شد چون ۵٫۵۶ دو فایلِ گفتار را وارد بانک کرد و آن‌ها همان‌جا ماندند؛
 * سدِ تازه فقط جلوی *ورودِ* بعدی را می‌گیرد. این تابع همان سنجه را روی
 * فایل‌های موجود می‌زند و ردشده‌ها را به زیرپوشهٔ «کنارگذاشته» می‌بَرد —
 * پاک نمی‌کند. اگر سنجه اشتباه کرده باشد، فایل هنوز آنجاست.
 */
function musicRecheck_(hub, opt) {
  opt = opt || {};
  var out = { checked: 0, moved: 0, kept: 0, heard: 0, notes: [] };
  var folder = musicFolder_();
  var rej = null;
  var it = folder.getFiles();
  var todo = [];
  while (it.hasNext()) {
    var f = it.next();
    if (/\.wav$/i.test(f.getName())) todo.push(f);
  }

  /* ── حالتِ شبانه: فقط آن‌هایی که هنوز داوری ندارند ──
   *
   * پاسخِ مدل همیشه در دسترس نیست؛ قطعه‌ای که بارِ اول «❓ مدل نشنید»
   * گرفت، از ۵٫۶۵ دیگر هرگز پخش نمی‌شود (پیش‌فرض ردّ، که درست است).
   * ۵٫۷۱ راهِ تجدیدنظر را باز کرد ولی فقط با فشردنِ دکمه — یعنی باز هم
   * کاری روی دستِ صاحبِ برنامه می‌ماند، و او همین را رد کرد.
   * حالا هر شب چندتا از نامعلوم‌ها دوباره پرسیده می‌شوند. پویشِ کاملِ
   * بانک هر شب گران است (بایتِ هر فایل)، پس فهرست باریک می‌شود. */
  if (opt.onlyUnknown) {
    var known = {};
    try {
      var bk = musicBank_(hub);
      for (var b0 = 0; b0 < bk.length; b0++) known[bk[b0].id] = bk[b0];
    } catch (eB) {}
    todo = todo.filter(function (f2) {
      var row = known[f2.getId()];
      if (!row) return true;                       // هنوز در تب ننشسته
      return !heardSays_(row.heard, 'موسیقی') && !heardSays_(row.heard, 'جلوه');
    });
    // افکت‌ها اول: تنها نوعی که نبودِ تأیید جلوی پخششان را می‌گیرد
    todo.sort(function (a, c) {
      var ra = known[a.getId()], rc = known[c.getId()];
      return ((ra && String(ra.kind || '') === 'افکت') ? 0 : 1) -
             ((rc && String(rc.kind || '') === 'افکت') ? 0 : 1);
    });
  }
  var capN = Math.max(0, Number(opt.cap) || 0);
  if (capN && todo.length > capN) {
    out.notes.push('این اجرا ' + capN + ' تا از ' + todo.length + ' بازبینی شد.');
    todo = todo.slice(0, capN);
  }
  var rt0 = new Date().getTime();
  var rBudget = Math.max(0, Number(opt.budgetMs) || 0);

  for (var i = 0; i < todo.length; i++) {
    if (rBudget && new Date().getTime() - rt0 > rBudget) {
      out.notes.push('وقتِ بازبینی تمام شد؛ بقیه دفعهٔ بعد.');
      break;
    }
    var f2 = todo[i], bytes = null, info = null;
    out.checked++;
    try { bytes = f2.getBlob().getBytes(); info = wavInfo_(bytes); } catch (e) { info = null; }
    var mt = null;
    try { mt = musicMeta_(f2.getName()); } catch (eMt) {}
    var acc = info ? musicAccept_(bytes, info, f2.getName(),
                                  (mt && mt.kind) || 'موسیقی')
                   : { ok: false, why: 'WAV خوانده نشد' };
    if (acc.ok) {
      out.kept++;
      /* ── داوریِ تازه باید ثبت شود، وگرنه بازبینی بی‌اثر است ──
       * تا ۵٫۷۰ اینجا فقط شمرده می‌شد. یعنی قطعه‌ای که بارِ اول مدل نتوانست
       * قضاوتش کند («❓ مدل نشنید») تا ابد نامعلوم می‌ماند، هرچند بار هم
       * بازبینی می‌شد. و از ۵٫۶۵ همین «نامعلوم» جلوی پخشِ افکت را می‌گیرد،
       * پس یک ناتوانیِ گذرا به یک بن‌بستِ دائمی تبدیل می‌شد.
       * «Paper Pages» دقیقاً همین بود: تنها افکتِ بانک، سالم، و بی‌استفاده.
       */
      if (acc.sure && acc.heard && !(mt && String(mt.heard || '').trim())) {
        try {
          var nm2 = mt || {};
          nm2.heard = String(acc.heard);
          nm2.verdict = String(acc.why || '');
          if (!nm2.title) nm2.title = f2.getName().replace(/\.wav$/i, '');
          if (!nm2.kind) nm2.kind = 'موسیقی';
          musicMetaWrite_(f2.getName(), nm2);
          out.heard = (out.heard || 0) + 1;
          out.notes.push(auditCut_(f2.getName(), 45) + ' — تأیید شد: ' + acc.heard);
          logLine_('تأییدِ شنیداری ثبت شد: «' + f2.getName() + '» → ' + acc.heard);
        } catch (eW) {}
      }
      continue;
    }

    if (!rej) {
      var nm = CFG.MUSIC_REJECT_FOLDER || 'کنارگذاشته — گفتار یا نامناسب';
      var fi = folder.getFoldersByName(nm);
      rej = fi.hasNext() ? fi.next() : folder.createFolder(nm);
    }
    try {
      f2.moveTo(rej);
      // شناسنامه‌اش هم همراهش می‌رود، وگرنه در بانک یتیم می‌ماند
      var side = folder.getFilesByName('_MUSIC-META-' +
                   f2.getName().replace(/\.wav$/i, '') + '.json');
      if (side.hasNext()) side.next().moveTo(rej);
      out.moved++;
      out.notes.push(auditCut_(f2.getName(), 45) + ' — ' + acc.why);
      logLine_('موسیقی کنار گذاشته شد: «' + f2.getName() + '» — ' + acc.why);
    } catch (eM) { out.notes.push(f2.getName() + ' — جابه‌جا نشد: ' + eM.message); }
  }

  // ردیف‌های سهم‌شان در تب هم باید برود، وگرنه بانک هنوز می‌بیندشان
  // پویش هم لازم است وقتی فقط تأییدی ثبت شده — وگرنه ستونِ تب همان «❓»
  // می‌ماند و سدِ افکت باز نمی‌شود.
  if (out.moved || out.heard) { try { musicScan_(hub); } catch (eS) {} }
  return out;
}

/** منو: بازبینیِ بانک — «این‌ها واقعاً موسیقی‌اند؟» */
function runMusicRecheck() {
  var r = musicRecheck_(null);
  var L = ['🔎 بازبینیِ بانکِ موسیقی', '',
           r.checked + ' فایل سنجیده شد: ' + r.kept + ' ماند، ' + r.moved + ' کنار گذاشته شد.'];

  /* و مهم‌تر از شمار: کدام‌ها *تأییدِ شنیداری* دارند و کدام‌ها نه.
   *
   * تا امروز موتور فقط بله/خیر می‌گفت و صاحبِ برنامه ناچار بود همهٔ فایل‌ها
   * را خودش گوش بدهد تا مطمئن شود — یعنی نگهبانِ کیفیت او بود، نه موتور.
   * حالا فهرستِ «نامعلوم» جدا می‌آید و گوش‌دادن فقط به همان‌ها لازم است.
   */
  try {
    var bank = musicBank_(), sure = [], unsure = [];
    for (var q = 0; q < bank.length; q++) {
      (String(bank[q].heard || '').indexOf('✅') === 0 ? sure : unsure).push(bank[q]);
    }
    L.push('');
    L.push('✅ ' + sure.length + ' قطعه را مدل شنیده و تأیید کرده.');
    if (unsure.length) {
      L.push('❓ ' + unsure.length + ' قطعه تأییدِ شنیداری ندارد — فقط به این‌ها گوش بدهید:');
      for (var u2 = 0; u2 < unsure.length && u2 < 10; u2++) {
        L.push('   • ' + auditCut_(unsure[u2].name, 45) +
               '  [' + (unsure[u2].slots || '—') + ']');
      }
      L.push('   اگر یکی‌شان گفتار بود، در درایو ببریدش به زیرپوشهٔ');
      L.push('   «' + (CFG.MUSIC_REJECT_FOLDER || 'کنارگذاشته — گفتار یا نامناسب') + '»');
      L.push('   و دوباره «پویشِ بانک» را بزنید.');
    }
    // و اگر جایگاهی فقط یک قطعه دارد، انتخاب معنایی ندارد
    var cnt = musicSlotCounts_(), thin = [];
    for (var sk in cnt) if (cnt.hasOwnProperty(sk) && cnt[sk] <= 1) thin.push(sk + ': ' + cnt[sk]);
    if (thin.length) {
      L.push('');
      L.push('⚠️ این جایگاه‌ها یک قطعه یا کمتر دارند (' + thin.join(' · ') + ').');
      L.push('انتخابِ متناسب با وایب از میانِ یک قطعه، انتخاب نیست — هر قسمت');
      L.push('همان یکی را می‌گیرد. موتور شبانه خودش تا ' +
             (Number(CFG.MUSIC_BANK_TARGET) || 5) + ' قطعه در هر جایگاه می‌گردد،');
      L.push('یا همین گزینه را چند بار پشتِ‌هم بزنید تا زودتر پر شود.');
    }
  } catch (eB) {}
  if (r.notes.length) {
    L.push('');
    for (var i = 0; i < r.notes.length; i++) L.push('• ' + r.notes[i]);
    L.push('');
    L.push('کنارگذاشته‌ها پاک نشده‌اند — در زیرپوشهٔ');
    L.push('«' + (CFG.MUSIC_REJECT_FOLDER || 'کنارگذاشته — گفتار یا نامناسب') + '» هستند.');
    L.push('اگر سنجه اشتباه کرده، فایل را دستی برگردانید به پوشهٔ اصلی.');
  } else if (r.checked) {
    L.push('', 'همه‌شان موسیقی‌اند.');
  } else {
    L.push('', 'بانک خالی است.');
  }
  try { SpreadsheetApp.getUi().alert(L.join('\n')); } catch (e) { logLine_(L.join(' ')); }
  return r;
}

/** منو: آوردنِ موسیقی از فهرستِ پیشنهادی، همین حالا. */
function runMusicFetch() {
  // یک زدن، سه مرحله: بگرد، بیاور، بپوی. کاربر نباید سه گزینهٔ منو را
  // به‌ترتیب بزند تا یک فایل موسیقی داشته باشد.
  /* ردهای ناحقِ نسخه‌های پیش، همین‌جا هم باز می‌شوند. کارِ شبانه این را
     می‌کند، ولی کسی که دکمه را می‌زند نباید تا فردا شب صبر کند. */
  var unb = { freed: 0 };
  try { unb = musicUnblock_(); } catch (eU) {}

  var seek = { added: 0, notes: [] };
  try {
    var miss = musicThinSlots_();
    // کمبودی نبود یعنی پوششِ موسیقی کامل است، نه اینکه کاری نمانده —
    // همان چیزی که کارِ شبانه از ۵٫۶۵ می‌فهمد و این دکمه نمی‌فهمید.
    if (!miss.length) miss = musicRotateSlots_();
    /* و مهم‌تر: تا ۵٫۷۸ اگر هیچ جایگاهی کم نداشت، musicSeek_ اصلاً صدا
       زده نمی‌شد — یعنی گشتنِ **افکت** هم انجام نمی‌شد، با اینکه بانک
       افکت کم دارد. حالا در آن حالت با «فقط افکت» می‌گردد. */
    seek = musicSeek_(miss.length ? miss : null, !miss.length);
  } catch (eS) {}

  var r = musicFetch_();
  var scan = null;
  if (r.added) { try { scan = musicScan_(); } catch (e) {} }
  // و آنچه از پیش در بانک بود هم یک بار با همین سنجه بازبینی می‌شود
  var rc = { checked: 0, moved: 0, kept: 0, notes: [] };
  try { rc = musicRecheck_(null); } catch (eR) {}

  var L = ['🎵 موسیقی — گشتن، آوردن، پویش', ''];
  if (unb && unb.freed) {
    L.push('‏' + unb.freed + ' نشانی که پیش‌تر به‌ناحق رد شده بود، دوباره باز شد.');
    L.push('');
  }
  if (seek.added) {
    L.push(seek.added + ' نامزدِ تازه از archive.org به فهرست اضافه شد:');
    for (var k = 0; k < seek.notes.length; k++) L.push('   • ' + seek.notes[k]);
    L.push('');
  }
  if (!r.read && !r.added && !seek.added) {
    L.push('چیزی برای آوردن نبود.');
    L.push('');
    L.push('یا بانک برای هر سه جایگاه (شروع، پایان، میانه) قطعه دارد،');
    L.push('یا archive.org این بار نتیجه‌ای نداد و فهرستِ پیشنهادی هم خالی است.');
    L.push('');
    L.push('فهرست را تسکِ «غنی‌سازی اینترنتی» هم پر می‌کند. و اگر خودتان نشانیِ');
    L.push('یک فایلِ WAV دارید، می‌توانید «' + MUSIC_FEED_() + '» را دستی بسازید:');
    L.push('{"items":[{"url":"https://…/x.wav","title":"…","license":"CC0",');
    L.push(' "kind":"موسیقی","mood":"آرام","slots":"شروع، پایان","gain":"0.7"}]}');
  } else {
    L.push(r.added + ' فایل آمد، ' + r.failed + ' رد شد.');
    if (r.notes.length) { L.push(''); for (var i = 0; i < r.notes.length; i++) L.push('• ' + r.notes[i]); }
    if (scan) L.push('', 'بانک پویش شد: ' + scan.added + ' تازه، ' + scan.updated + ' به‌روز.');
    L.push('', 'دلیلِ رد شدنِ هرکدام در خودِ «' + MUSIC_FEED_() + '» نوشته شده.');
  }
  if (rc.moved) {
    L.push('', '🔎 بازبینیِ بانک: ' + rc.moved + ' فایل کنار گذاشته شد (پاک نشد):');
    for (var z = 0; z < rc.notes.length; z++) L.push('   • ' + rc.notes[z]);
  }
  try { SpreadsheetApp.getUi().alert(L.join('\n')); } catch (e) { logLine_(L.join(' ')); }
  return { seek: seek, fetch: r };
}

/* ──────────────────────── خویشتن‌داری در افکت ──────────────────────── */

/**
 * افکتِ صوتی فقط وقتی که واقعاً بجاست.
 *
 * ══ خطری که باید دور زده شود ══
 * اگر معیارْ «آمدنِ یک واژه در متن» باشد، هر اشارهٔ گذرا به باران یک صدای
 * باران می‌سازد. نتیجه‌اش مصنوعی است و در «درس‌نامه» فاجعه: یک درسِ فلسفه
 * وسطش صدای شهر بدهد یعنی کسی به متن گوش نداده.
 *
 * ══ سه سدی که اینجا هست ══
 *  ۱) افکت به‌طور پیش‌فرض فقط در برنامهٔ متنوع است، نه درس‌نامه. سرشتِ درس‌نامه
 *     شمرده و بی‌جلوه است؛ این تصمیمِ سلیقه نیست، اقتضای برنامه است.
 *  ۲) واژه باید *ساختاری* باشد نه گذرا: یا در سرِ بخش بیاید، یا دستِ‌کم دو بار
 *     در روایتِ همان بخش تکرار شود. یک بار آمدن یعنی گذرا.
 *  ۳) سقفِ سختِ هر قسمت. حتی اگر ده جای مناسب پیدا شود، بیش از این گذاشته
 *     نمی‌شود؛ برنامهٔ رادیویی است نه جدولِ افکت.
 *
 * برمی‌گرداند: فهرستِ افکت‌های مجاز، با شمارهٔ بخش.
 */
function sfxAllow_(sections, picks, showKind, bank) {
  var out = [];
  if (CFG.MUSIC_SFX_ENABLED === false) return out;
  if (String(showKind || '') === 'special' && CFG.MUSIC_SFX_IN_SPECIAL !== true) return out;
  var cap = Math.max(0, Number(CFG.MUSIC_SFX_MAX_PER_EP) || 0);
  if (!cap) return out;

  var byId = {};
  for (var bz = 0; bz < (bank || []).length; bz++) byId[String(bank[bz].id)] = bank[bz];

  for (var i = 0; i < (picks || []).length && out.length < cap; i++) {
    var p = picks[i];
    if (!p || !p.word) continue;
    var idx = Number(p.section);
    var sec = (sections || [])[idx];
    if (!sec) continue;
    var word = String(p.word).trim();
    if (word.length < 3) continue;

    var head = String(sec.heading || '');
    var body = String(sec.narration || '');
    var inHead = head.indexOf(word) !== -1;
    var times = body.split(word).length - 1;

    // «یک بار در متن» کافی نیست — همان اشارهٔ گذراست
    if (!inHead && times < 2) continue;

    /* ── سدِ چهارم: تناسب، نه بسامد ──
     * صاحبِ برنامه دقیقاً همین را پرسید: «ممکن است اسمی از چیزی بیاید که
     * جلوهٔ صوتی‌اش هست، ولی مناسبِ آن فضا و موضوع و متن نیست.» قاعدهٔ
     * بالا بسامدِ واژه را می‌سنجد، نه تناسب را — در یک بندِ سوگ، واژهٔ «در»
     * هم دو بار می‌آید و از سدِ بسامد رد می‌شود.
     */
    var tr = byId[String(p.id)] || null;
    if (bank && bank.length) {
      if (!tr) continue;
      if (String(tr.kind || '') !== 'افکت') continue;   // موسیقی، افکت نیست
      /* ── سدی که خودش بن‌بست شد ──
       *
       * ۵٫۶۵ گفت «افکتی که گوشِ مدل تأییدش نکرده پخش نمی‌شود»، چون ۵٫۵۶
       * نشان داده بود فایلی که «افکت» نامیده شده می‌تواند سخنرانی باشد.
       * منطقش درست بود؛ ولی نتیجه‌اش این شد که **هیچ افکتی هرگز پخش
       * نشود**: مدل برای هر فایلی که تا امروز آمده «نامعلوم» داده، و
       * «نامعلوم» یعنی ردِّ دائمی.
       *
       * سدی که هیچ‌وقت باز نمی‌شود، سد نیست — نبودِ قابلیت است.
       *
       * پس شهادتِ دوم پذیرفته می‌شود: فایلی که **شناسنامهٔ منبع** دارد
       * (یعنی هویتش از صفحهٔ اثر آمده، نه از حدسِ نامِ فایل)، خودش را
       * «افکت» اعلام کرده، و کوتاه است. این سه با هم، شهادتِ ضعیف‌تری از
       * گوشِ مدل‌اند ولی شهادت‌اند.
       * و وتو سرِ جایش می‌ماند: هرچه «گفتار» خورده باشد، هرگز. */
      if (CFG.MUSIC_SFX_NEED_HEARD !== false) {
        var h = String(tr.heard || '');
        if (h.indexOf('گفتار') !== -1) continue;             // وتوی مطلق
        var okHeard = heardSays_(h, 'جلوه');
        var okSrc = CFG.MUSIC_SFX_TRUST_SOURCE !== false &&
                    !!String(tr.src || '').trim() &&
                    Number(tr.sec) > 0 &&
                    Number(tr.sec) <= (Number(CFG.MUSIC_SFX_MAX_SEC) || 10);
        if (!okHeard && !okSrc) continue;
      }
    }
    var clash = sfxToneClash_(String(sec.tone || ''),
                              (tr ? (tr.mood + ' ' + tr.name) : ''));
    if (clash) continue;

    out.push({ section: idx, word: word, id: p.id,
               anchor: String(p.anchor || ''),
               when: sfxWhen_(p.when),
               fit: String(p.why || ''),
               why: inHead ? 'در سرِ بخش آمده' : times + ' بار در همان بخش' });
  }
  return out;
}

/** «پیش» | «روی» | «پس» — هرچیزِ دیگر، «روی». */
function sfxWhen_(v) {
  var t = String(v || '').trim();
  if (t.indexOf('پیش') !== -1 || t.indexOf('قبل') !== -1) return 'پیش';
  if (t.indexOf('پس') !== -1 || t.indexOf('بعد') !== -1) return 'پس';
  return 'روی';
}

/* وایب‌هایی که با هم نمی‌خوانند. عمداً کوچک و صریح: هر جفتی که اینجا نیست
   رد نمی‌شود — سدِ تناسب باید چیزهای آشکار را بگیرد، نه اینکه قاضیِ سلیقه
   شود. سنجهٔ اصلی جملهٔ توجیهیِ خودِ مدل است؛ این پشتوانهٔ کدی است. */
var SFX_TONE_CLASH = [
  [/سوگ|اندوه|غم|تلخ|فاجعه|مرگ|عزا|دلخراش/,
   /طنز|خنده|شاد|بازیگوش|کارتون|کمیک|مفرح|جشن|comic|funny|cartoon|party/i],
  [/جدی|رسمی|علمی|تحلیل|مستند|فلسف/,
   /کارتون|بامزه|مسخره|بوق|slapstick|cartoon|goofy|boing/i],
  [/کودک|بازیگوش|شاد|طنز/,
   /ترسناک|وحشت|دلهره|جیغ|horror|scream|creepy/i]
];

/**
 * آیا این افکت با وایبِ این بخش نمی‌خوانَد؟ رشتهٔ دلیل، یا '' اگر ایرادی نبود.
 */
function sfxToneClash_(tone, effect) {
  var t = String(tone || ''), e = String(effect || '');
  if (!t || !e) return '';
  for (var i = 0; i < SFX_TONE_CLASH.length; i++) {
    if (SFX_TONE_CLASH[i][0].test(t) && SFX_TONE_CLASH[i][1].test(e)) {
      return 'وایبِ «' + t + '» با این افکت نمی‌خوانَد';
    }
  }
  return '';
}

/* نویسه‌هایی که در یافتنِ لنگر شمرده نمی‌شوند: اعراب، کشیده، نیم‌فاصله. */
var SFX_SKIP = 'ًٌٍَُِّْـ\u200c\u200f\u200e';

/**
 * نرمال‌سازیِ متن **همراه با نقشهٔ جای اصلی**.
 *
 * بی نقشه، جایی که در رشتهٔ نرمال‌شده پیدا می‌شود به متنِ واقعی نمی‌خورَد
 * (اعراب طول را عوض می‌کند) و برشْ وسطِ یک واژه می‌افتد.
 */
function sfxNormMap_(str) {
  var s = String(str || ''), o = '', map = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (SFX_SKIP.indexOf(c) !== -1) continue;
    if (c === 'ي') c = 'ی'; else if (c === 'ك') c = 'ک';
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      if (!o.length || o.charAt(o.length - 1) === ' ') continue;
      c = ' ';
    }
    o += c; map.push(i);
  }
  return { s: o, map: map };
}

/* پایانِ جمله در فارسی */
var SFX_STOP = '.!?؟؛\n';

/**
 * جای دقیقِ افکت در فهرستِ تکه‌ها.
 *
 * ══ آنچه تا ۵٫۶۴ بود، و چرا غلط بود ══
 * `idxOfSection_(out, n)` تکه‌های گفتاری را می‌شمرد و nاُمین را برمی‌گرداند.
 * ولی n شمارهٔ بخش در ep.sections است، نه شمارهٔ تکه: hook یک تکه جلو
 * می‌بردش و splitForTts_ هر بخشِ بلند را به چند تکه می‌شکند. یعنی «بخشِ ۳»
 * تقریباً همیشه جایی داخلِ بخشِ ۰ یا ۱ می‌افتاد. هیچ‌وقت دیده نشد چون بانک
 * هیچ افکتی نداشت و این شاخه یک بار هم اجرا نشده بود.
 *
 * ══ و آنچه صاحبِ برنامه خواست ══
 * «همان ثانیه، یا کمی قبل‌تر، یا کمی بعدتر» — نه سرِ بخش. پس جا از لنگرِ
 * متنی می‌آید: عبارتی که مدل از خودِ روایت کپی کرده. تکهٔ حاویِ آن عبارت دو
 * نیم می‌شود و افکت بینشان می‌نشیند.
 *
 * برمی‌گرداند {at, cut} — at شمارهٔ تکه در out، cut جای برش در متنِ همان
 * تکه (۰ یعنی پیش از کلِ تکه، طولِ متن یعنی پس از آن). null یعنی جا پیدا نشد.
 */
function sfxPlace_(out, from, to, item) {
  if (!(from >= 0) || !(to > from)) return null;
  var anc = sfxNormMap_(item && item.anchor);
  var minSp = Math.max(0, Number(CFG.MUSIC_SFX_MIN_SPLIT) || 0);
  if (anc.s.length < 3) return { at: from, cut: 0, how: 'سرِ بخش — لنگری نبود' };

  for (var i = from; i < to && i < out.length; i++) {
    var ch = out[i];
    if (!ch || ch.pcm || !ch.text) continue;
    var hay = sfxNormMap_(ch.text);
    var p = hay.s.indexOf(anc.s);
    if (p === -1) continue;

    var txt = String(ch.text);
    var start = hay.map[p];
    var end = hay.map[Math.min(p + anc.s.length - 1, hay.map.length - 1)] + 1;
    var when = sfxWhen_(item.when), cut;
    if (when === 'پیش') {
      cut = 0;
      for (var a = start - 1; a >= 0; a--) {
        if (SFX_STOP.indexOf(txt.charAt(a)) !== -1) { cut = a + 1; break; }
      }
      while (cut < txt.length && /\s/.test(txt.charAt(cut))) cut++;
    } else if (when === 'پس') {
      cut = txt.length;
      for (var b = end; b < txt.length; b++) {
        if (SFX_STOP.indexOf(txt.charAt(b)) !== -1) { cut = b + 1; break; }
      }
    } else {
      cut = start;
    }

    // نیمهٔ خیلی کوتاه بدتر از نصف‌نکردن است: چند واژه که جدا خوانده شوند،
    // با مکث و آهنگِ غلط شنیده می‌شوند.
    if (txt.slice(0, cut).trim().length < minSp) cut = 0;
    else if (txt.slice(cut).trim().length < minSp) cut = txt.length;
    return { at: i, cut: cut, how: 'لنگر «' + String(item.anchor).slice(0, 40) +
                                   '» — ' + when };
  }
  return { at: from, cut: 0, how: 'سرِ بخش — لنگر در متن پیدا نشد' };
}

/** بازهٔ تکه‌های یک بخش در out، از روی مرزها و نقشهٔ جابه‌جایی. */
function sfxSecRange_(bounds, posOf, total, secIdx) {
  var k = -1;
  for (var i = 0; i < (bounds || []).length; i++) {
    if (Number(bounds[i].secIndex) === Number(secIdx)) { k = i; break; }
  }
  if (k === -1) return null;
  var from = posOf[bounds[k].at];
  if (!(from >= 0)) return null;
  var to = total;
  if (k + 1 < bounds.length) {
    var nx = posOf[bounds[k + 1].at];
    if (nx >= 0) to = nx;
  }
  return { from: from, to: to };
}

/* ────────────── شناختِ فایل: اندازه‌گیری، نه شباهتِ اسمی ────────────── */

/**
 * اندازه‌گیریِ سرشتِ صوتیِ یک فایل.
 *
 * ══ چرا اسم کافی نیست ══
 * فایلی که «calm-piano.wav» نام دارد ممکن است سکوت باشد، ممکن است دانلود
 * نصفه‌کاره باشد، ممکن است اصلاً چیزِ دیگری باشد. اعتماد به نامِ فایل یعنی
 * اعتماد به چیزی که هیچ‌کس وارسی‌اش نکرده. پس خودِ موج اندازه گرفته می‌شود.
 *
 * ══ چه چیزی را واقعاً می‌شود فهمید ══
 * • بلندیِ میانگین و قله — سکوت، یا فایلِ خرابِ نزدیک‌به‌صفر
 * • درصدِ سکوت — فایلی که بیشترش خالی است
 * • نرخِ گذر از صفر — بافتِ صدا: موسیقیِ آرام عددِ پایین، افکتِ نویزی و
 *   «س/ش»دارِ گفتار عددِ بالا
 * • یکنواختی — موسیقی معمولاً پیوسته است، گفتار پر از مکث
 *
 * ══ و چه چیزی را نمی‌شود ══
 * «این پیانوی آرام است» از روی موج فهمیده نمی‌شود. آن را فقط شناسنامهٔ منبع
 * می‌گوید (musicMeta_). این تابع سلامت و بافت را می‌سنجد، نه هویت را.
 *
 * برای سرعت، سراسرِ فایل خوانده نمی‌شود: چند ده پنجرهٔ کوتاه، پخش‌شده در طولِ
 * قطعه. برای قضاوتِ سلامت کافی است و از مهلتِ اجرا هم نمی‌گذرد.
 */
function musicProbe_(b, info) {
  if (!wavIsPcm_(info)) return null;
  var bps = info.bits / 8, ch = info.channels, frameB = bps * ch;
  var total = Math.floor(info.dataLen / frameB);
  if (total < 100) return null;

  var u = function (k) { return b[k] < 0 ? b[k] + 256 : b[k]; };
  var rd = function (fr) {
    var i = info.dataAt + fr * frameB;
    if (info.bits === 8) return (u(i) - 128) * 256;
    var v = u(i + bps - 2) | (u(i + bps - 1) << 8);
    return (v & 0x8000) ? v - 65536 : v;
  };

  var WINDOWS = 48, WIN = 512;
  var step = Math.max(1, Math.floor((total - WIN) / WINDOWS));
  var rmsList = [], zc = 0, zcN = 0, peak = 0, silent = 0, seen = 0;

  for (var w = 0; w < WINDOWS; w++) {
    var from = w * step;
    if (from + WIN >= total) break;
    var sum = 0, prev = 0;
    for (var k = 0; k < WIN; k++) {
      var s = rd(from + k);
      if (s > peak) peak = s; if (-s > peak) peak = -s;
      sum += s * s;
      if (k && ((s < 0) !== (prev < 0))) zc++;
      prev = s; zcN++;
    }
    var rms = Math.sqrt(sum / WIN);
    rmsList.push(rms);
    if (rms < 200) silent++;               // زیرِ این، عملاً سکوت است
    seen++;
  }
  if (!seen) return null;

  var mean = 0;
  for (var m = 0; m < rmsList.length; m++) mean += rmsList[m];
  mean /= rmsList.length;
  var varc = 0;
  for (var v2 = 0; v2 < rmsList.length; v2++) varc += Math.pow(rmsList[v2] - mean, 2);
  varc = Math.sqrt(varc / rmsList.length);

  return {
    seconds: Math.round(info.seconds),
    rms: Math.round(mean),
    peak: peak,
    silentPct: Math.round(silent / seen * 100),
    zcr: Math.round(zc / (zcN / (CFG.SAMPLE_RATE || 24000))),   // گذر بر ثانیه
    steadiness: mean > 0 ? Math.round((1 - Math.min(varc / mean, 1)) * 100) : 0
  };
}

/**
 * آیا این فایل به‌دردِ بانک می‌خورد؟
 * فقط سلامت را می‌گوید، نه تناسبِ حال‌وهوا.
 */
function musicVerdict_(pr, info) {
  if (!pr) {
    if (info && Number(info.format) === 3) {
      return { ok: false, why: 'WAVِ اعشاری (IEEE float) است؛ موتور PCMِ صحیح می‌خواند' };
    }
    if (info && !wavIsPcm_(info)) {
      return { ok: false, why: 'قالبِ ' + info.format + ' — PCM نیست' };
    }
    return { ok: false, why: 'خوانده نشد یا خیلی کوتاه است' };
  }
  if (pr.seconds < 2) return { ok: false, why: 'کوتاه‌تر از دو ثانیه' };
  if (pr.silentPct >= 80) return { ok: false, why: pr.silentPct + '٪ سکوت — احتمالاً دانلودِ ناقص' };
  if (pr.rms < 150) return { ok: false, why: 'تقریباً بی‌صدا (بلندیِ میانگین ' + pr.rms + ')' };
  if (pr.peak >= 32767 && pr.rms > 12000) return { ok: true, why: 'سالم ولی بلند و کلیپ‌شده — بلندی را کم بگذارید' };
  return { ok: true, why: 'سالم' };
}

/* ═══════════════ «این اصلاً موسیقی است؟» (۵٫۵۷) ═══════════════

   ══ خرابی‌ای که این را لازم کرد ══
   ۵٫۵۶ سه فایل آورد و دو تایش گفتار بود — یکی «Opening Remarks of Sean F.
   Byrnes at LVG Debate»، ۱۲۹ ثانیه، ۱۶ کیلوهرتز. یعنی یک نفر پشتِ تریبون
   حرف می‌زد و قرار بود سرِ پادکست پخش شود.

   دو اشتباه، هر دو مالِ من:
     ۱) پرسشِ جست‌وجو واژهٔ «intro» داشت، و «Opening Remarks … Intro» هم با
        همان می‌خورَد. archive.org پر از سخنرانی و مناظره و کتابِ صوتی است.
     ۲) و مهم‌تر: هیچ سدی نمی‌پرسید «این موسیقی است؟». musicProbe_ از قبل
        درصدِ سکوت و یکنواختی را می‌سنجید و در توضیحاتش نوشته بود «گفتار پر
        از مکث» — ولی هیچ‌جا به‌عنوان دروازه به کار نمی‌رفت. تحلیلی که نوشته
        شده و تصمیمی از آن ساخته نمی‌شود، همان کدِ مرده است.

   ══ سه لایه، و پیش‌فرضِ رد ══
   ۱) نرخِ نمونه‌برداری: زیرِ ۲۲ کیلوهرتز یعنی ضبطِ گفتار. موسیقی در این نرخ
      منتشر نمی‌شود.
   ۲) نامِ فایل: مناظره، سخنرانی، مصاحبه، خطبه، کتابِ صوتی…
   ۳) خودِ موج: گفتار مکث دارد و بلندی‌اش پرنوسان است؛ موسیقی پیوسته است.

   و آخرین حرف را مدل می‌زند — با گوش‌دادن به یک بریدهٔ واقعی از فایل، نه از
   روی نام. اگر مدل در دسترس نبود، حکمِ سه لایهٔ بالا می‌ماند.

   **پیش‌فرض، ردِ فایل است.** بانکِ خالی بدتر از یک مناظره وسطِ پادکست نیست.
   ═════════════════════════════════════════════════════════════════════════ */

var SPEECH_WORDS = ['remarks', 'speech', 'lecture', 'debate', 'interview', 'talk',
  'sermon', 'address', 'panel', 'conference', 'meeting', 'testimony', 'reading',
  'audiobook', 'audio book', 'podcast', 'commentary', 'discussion', 'seminar',
  'keynote', 'briefing', 'hearing', 'q&a', 'interviews', 'oral history',
  'radio show', 'news', 'preaching', 'homily'];

/**
 * حکمِ قطعی‌نشدنی از روی اندازه‌ها و نام.
 * برمی‌گرداند {speech:true|false, why:'…', sure:true|false}
 */
function musicIsSpeech_(pr, info, name, wantSfx) {
  var nm = String(name || '').toLowerCase();
  for (var i = 0; i < SPEECH_WORDS.length; i++) {
    if (nm.indexOf(SPEECH_WORDS[i]) !== -1) {
      return { speech: true, sure: true, why: 'نامش «' + SPEECH_WORDS[i] + '» دارد' };
    }
  }
  var rate = Number((info && info.rate) || 0);
  /* ── نرخِ پایین برای موسیقی نشانه است، برای جلوهٔ صوتی نه ──
   * ۲۴ اوت: «Video Game Sound Ideas, Magical Energy» با پیامِ
   * «۱۱۰۲۵ هرتز — نرخِ ضبطِ گفتار» رد شد. ولی ۱۱۰۲۵ برای یک افکتِ بازی
   * کاملاً عادی است؛ نرخِ پایین آنجا انتخابِ سازنده است، نه نشانهٔ ضبطِ
   * صدای آدم. در ۵٫۶۴ سنجهٔ «پرنوسان یعنی گفتار» را برای افکت کنار
   * گذاشتم و همین سنجه را ندیدم — و چون sure:true می‌داد، آن کنارگذاشتن
   * هم نجاتش نمی‌داد. یعنی تنها افکتی که موتور خودش پیدا کرد، رد شد. */
  if (rate && rate < 22050 && !wantSfx) {
    return { speech: true, sure: true,
             why: rate + ' هرتز — نرخِ ضبطِ گفتار، نه انتشارِ موسیقی' };
  }
  if (!pr) return { speech: false, sure: false, why: 'موج سنجیده نشد' };

  // مکث‌های زیاد + بلندیِ پرنوسان = الگوی گفتار
  if (pr.silentPct >= 25 && pr.steadiness < 55) {
    return { speech: true, sure: false,
             why: pr.silentPct + '٪ مکث و یکنواختیِ ' + pr.steadiness + '٪ — الگوی گفتار' };
  }
  if (pr.steadiness < 35) {
    return { speech: true, sure: false,
             why: 'یکنواختیِ ' + pr.steadiness + '٪ — بیش از حد پرنوسان برای موسیقی' };
  }
  return { speech: false, sure: pr.steadiness > 70 && pr.silentPct < 15,
           why: 'الگوی پیوسته' };
}

/** بریده‌ای از وسطِ فایل، برای شنیدنِ مدل. WAVِ تک‌کاناله با نرخِ خودِ فایل. */
function musicExcerpt_(b, info, secs) {
  try {
    var want = Math.max(2, Math.min(Number(secs) || 8, Math.floor(info.seconds)));
    var bps = info.bits / 8, frameB = bps * info.channels;
    var total = Math.floor(info.dataLen / frameB);
    var n = Math.min(total, Math.round(want * info.rate));
    var from = Math.max(0, Math.floor((total - n) / 2));          // از وسط

    var u = function (k) { return b[k] < 0 ? b[k] + 256 : b[k]; };
    var out = [];
    for (var f = 0; f < n; f++) {
      var i = info.dataAt + (from + f) * frameB;
      var v;
      if (info.bits === 8) v = (u(i) - 128) * 256;
      else { v = u(i + bps - 2) | (u(i + bps - 1) << 8); if (v & 0x8000) v -= 65536; }
      out.push(v & 255, (v >> 8) & 255);
    }

    var h = [], dataLen = out.length;
    var str = function (t) { for (var q = 0; q < t.length; q++) h.push(t.charCodeAt(q)); };
    var u32 = function (v) { h.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); };
    var u16 = function (v) { h.push(v & 255, (v >>> 8) & 255); };
    str('RIFF'); u32(36 + dataLen); str('WAVE');
    str('fmt '); u32(16); u16(1); u16(1); u32(info.rate);
    u32(info.rate * 2); u16(2); u16(16);
    str('data'); u32(dataLen);
    var all = h.concat(out);
    for (var z = 0; z < all.length; z++) if (all[z] > 127) all[z] -= 256;
    return Utilities.base64Encode(all);
  } catch (e) { return ''; }
}

/**
 * مدل به یک بریده گوش می‌دهد و می‌گوید موسیقی است یا گفتار.
 * برمی‌گرداند 'موسیقی' | 'گفتار' | '' (نتوانست).
 *
 * این تنها سنجه‌ای است که واقعاً *می‌شنود*. بقیه از روی عدد حدس می‌زنند.
 * اگر در دسترس نبود، حکمِ اندازه‌ها می‌ماند — ولی نبودش سکوتِ تأیید نیست.
 */
function musicListen_(b, info, name) {
  try {
    if (!info || !(info.seconds > 0)) return '';
    var b64 = musicExcerpt_(b, info, 8);
    if (!b64) return '';
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              textModel_() + ':generateContent?key=' + encodeURIComponent(apiKey_());
    var payload = { contents: [{ role: 'user', parts: [
      { text: 'به این بریدهٔ صوتی گوش کن. قرار است در یک پادکست پخش شود.\n\n' +
              'فقط یکی از این چهار واژه را برگردان، بی هیچ توضیحی:\n' +
              '«موسیقی» — اگر ساز یا آهنگ است.\n' +
              '«جلوه» — اگر صدای محیط یا شیء است: باران، شهر، در، قدم، پرنده، زنگ.\n' +
              '«گفتار» — اگر کسی حرف می‌زند، سخنرانی، مصاحبه، خواندنِ متن، یا آواز با کلام.\n' +
              '«نامعلوم» — اگر مطمئن نیستی.' },
      { inlineData: { mimeType: 'audio/wav', data: b64 } }
    ] }], generationConfig: { temperature: 0, maxOutputTokens: 48 } };

    var j = geminiFetch_(url, payload);
    var t = String(extractText_(j) || '');
    if (t.indexOf('گفتار') !== -1) return 'گفتار';
    if (t.indexOf('جلوه') !== -1) return 'جلوه';
    if (t.indexOf('موسیقی') !== -1) return 'موسیقی';
    /* «نتوانست» تا ۵٫۸۰ بی‌صدا برمی‌گشت، و چون همین «نتوانست» جلوی پخشِ
       هر افکتی را می‌گرفت، مهم‌ترین شکستِ این زنجیره نامرئی‌ترینش بود.
       جوابِ خامِ مدل نوشته می‌شود تا دفعهٔ بعد بشود فهمید چرا. */
    logLine_('شنیدنِ مدل نتیجه نداد (' + auditCut_(String(name || ''), 40) +
             '): جوابِ خام «' + auditCut_(t, 40) + '»');
    return '';
  } catch (e) {
    logLine_('شنیدنِ مدل انجام نشد (' + String(name || '') + '): ' + e.message);
    return '';
  }
}

/**
 * حکمِ نهایی: آیا این فایل وارد بانک شود؟
 * برمی‌گرداند {ok, why}
 */
function musicAccept_(b, info, name, kind) {
  var wantSfx = String(kind || '') === 'افکت';
  var pr = null;
  try { pr = musicProbe_(b, info); } catch (e) {}
  var vd = musicVerdict_(pr, info);
  if (!vd.ok) return { ok: false, why: vd.why };

  var g = musicIsSpeech_(pr, info, name, wantSfx);
  // ══ تلهٔ افکت ══
  // سنجهٔ «پرنوسان یعنی گفتار» برای موسیقی درست است و برای جلوهٔ صوتی غلط:
  // صدای در، قدم و باران ذاتاً پرنوسان و پرمکث‌اند. اگر همان قاعده را روی
  // افکت بزنیم، هیچ افکتی هرگز وارد بانک نمی‌شود — و دقیقاً همان بن‌بستی
  // تکرار می‌شد که تازه از موسیقی برداشتیم.
  if (wantSfx && !g.sure) g = { speech: false, sure: false, why: 'جلوهٔ صوتی — الگوی موج سنجیده نشد' };
  // چیزی که از روی نام یا نرخ قطعی است، اصلاً به مدل نمی‌رسد — هزینهٔ بی‌دلیل
  if (g.speech && g.sure) return { ok: false, why: 'گفتار است: ' + g.why };

  var heard = musicListen_(b, info, name);
  if (heard === 'گفتار') {
    return { ok: false, sure: true, heard: 'گفتار',
             why: 'مدل گوش داد و گفت گفتار است' };
  }
  if (heard === 'موسیقی') {
    if (wantSfx) {
      return { ok: false, sure: true, heard: 'موسیقی',
               why: 'موسیقی است، نه جلوهٔ صوتی — جای این در بانکِ افکت نیست' };
    }
    return { ok: true, sure: true, heard: 'موسیقی',
             why: 'مدل تأیید کرد موسیقی است' };
  }
  if (heard === 'جلوه') {
    if (!wantSfx) {
      return { ok: false, sure: true, heard: 'جلوه',
               why: 'جلوهٔ صوتی است، نه موسیقی — به‌عنوان قطعهٔ آغاز/پایان نمی‌خورد' };
    }
    return { ok: true, sure: true, heard: 'جلوه',
             why: 'مدل تأیید کرد جلوهٔ صوتی است' };
  }

  // مدل نتوانست. حالا حکمِ اندازه‌ها تنها چیزی است که داریم، و شک یعنی رد.
  //
  // ولی «پذیرفته‌شده از روی اندازه‌ها» با «مدل شنید و تأیید کرد» یکی نیست، و
  // تا امروز هر دو یک‌شکل در بانک می‌نشستند. نتیجه‌اش این شد که صاحبِ برنامه
  // ناچار بود *همهٔ* فایل‌ها را خودش گوش بدهد تا مطمئن شود — یعنی من او را
  // نگهبانِ کیفیت کرده بودم. حالا موتور می‌گوید به کدام مطمئن است.
  if (g.speech) return { ok: false, sure: false, heard: '', why: 'احتمالِ گفتار: ' + g.why };
  return { ok: true, sure: false, heard: '', why: 'مدل نشنید؛ از روی اندازه‌ها: ' + g.why };
}

/** حدسِ بافت از روی اندازه‌ها — کمکِ تصمیم، نه حکم. */
function musicTexture_(pr) {
  if (!pr) return '';
  var t = [];
  t.push(pr.zcr > 3000 ? 'پرنویز/سوزناک' : (pr.zcr > 1200 ? 'میانه' : 'نرم و کم‌فرکانس'));
  t.push(pr.steadiness > 70 ? 'یکنواخت (موسیقی‌وار)' : 'پرنوسان (افکت/گفتاروار)');
  if (pr.silentPct > 30) t.push('پرمکث');
  return t.join(' · ');
}

/**
 * شناسنامهٔ منبع، اگر تسکِ غنی‌سازی گذاشته باشد.
 *
 * این تنها چیزی است که «هویت» را می‌گوید: از کجا آمد، چه بود، چه مجوزی دارد.
 * نامِ فایل حدس است؛ این سند است. اگر هست، بر نامِ فایل مقدم می‌شود.
 */
/**
 * شناسنامهٔ کنارِ فایلِ صوتی — همان چیزی که هویت را اعلام می‌کند، نه نامِ فایل.
 *
 * جایش پوشهٔ خودِ بانک است، کنارِ صوت. پیش‌تر در ریشهٔ OUTPUT خوانده می‌شد و
 * یعنی هر آهنگ یک فایلِ تازه در ریشه می‌گذاشت؛ ریشه جای فایل‌های زندهٔ موتور
 * است و بس. ریشه هنوز خوانده می‌شود تا شناسنامه‌های پیشین گم نشوند.
 */
function musicMeta_(fileName) {
  var base = String(fileName || '').replace(/\.wav$/i, '');
  var name = '_MUSIC-META-' + base + '.json';
  try {
    var it = musicFolder_().getFilesByName(name);
    if (it.hasNext()) return JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
  } catch (e) {}
  try { return getOutJson_(name); } catch (e2) { return null; }
}
