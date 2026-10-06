/**
 * 08_Health.gs — فایل وضعیت و هشدار سلامت
 *
 * دو کار:
 *  ۱) نوشتن یک فایل کوچک `_STATUS.json` در فولدر OUTPUT. خودِ CONTENT-HUB الان
 *     بیش از بیست مگابایت است و از بیرونِ گوگل قابل خواندن نیست؛ این فایل چند
 *     کیلوبایتی همان اطلاعات حیاتی را در دسترس می‌گذارد تا نظارت از بیرون ممکن شود.
 *  ۲) وارسی سلامت. اگر چیزی سر جایش نبود — قسمتی ساخته نشد، صداگذاری گیر کرد،
 *     همگام‌سازی خوابید، یا خطایی در گزارش نشست — ایمیل هشدار می‌فرستد.
 *     اگر همه‌چیز درست بود، هیچ ایمیلی نمی‌آید.
 */

var STATUS_FILE = '_STATUS.json';

/** آخرین ردیف‌های تب گزارش (برای دیدن خطاها از بیرون) */
function recentLog_(hub, n) {
  var sh = hub.getSheetByName(CFG.TAB_LOG);
  if (!sh || sh.getLastRow() < 2) return [];
  var take = Math.min(n || 25, sh.getLastRow() - 1);
  var vals = sh.getRange(sh.getLastRow() - take + 1, 1, take, 2).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    out.push({ at: String(vals[i][0]), msg: String(vals[i][1]) });
  }
  return out;
}

/**
 * سطرهای گزارشیِ خودِ سامانه که واژه‌هایی مثل «نشد» را در متنِ توضیحشان دارند
 * ولی خطای اجرا نیستند. بی این صافی، هر بار که پاس وفاداری چیزی می‌گرفت،
 * وارسیِ سلامت هم یک «سطر خطا» اعلام می‌کرد و هشدارِ بی‌جا می‌فرستاد.
 */
var LOG_BENIGN_PAT = /^(پاس وفاداری|گزارش:|گزارش نظارت:|نخ:|حذف تکراری)/;

function isErrorLine_(msg) {
  var s = String(msg || '');
  if (LOG_BENIGN_PAT.test(s)) return false;
  return s.indexOf('خطا') !== -1 || s.indexOf('ناموفق') !== -1 || s.indexOf('نشد') !== -1;
}

/** ردیف جمع‌کل داشبورد + سطر هر دسته، به‌صورت فشرده */
function indexSnapshot_(hub) {
  var rows = readIndex_(hub) || [];
  var cats = [], totalElig = 0, totalFresh = 0;
  for (var i = 0; i < rows.length; i++) {
    cats.push({ cat: rows[i].name, elig: rows[i].elig, fresh: rows[i].fresh,
                video: rows[i].nV, photo: rows[i].nP, audio: rows[i].nA, doc: rows[i].nD });
    totalElig += rows[i].elig; totalFresh += rows[i].fresh;
  }
  return { categories: cats, eligibleTotal: totalElig, freshTotal: totalFresh };
}

/**
 * چند درصد از هدف بلندتر شد؟ اگر معقول بود، صفر.
 *
 * «مدت» به‌صورتِ «۱۴:۱۵ دقیقه» ذخیره می‌شود. سنجه محافظه‌کار است: تا ۲۵٪ بالاتر
 * از هدف طبیعی است و چیزی گزارش نمی‌شود؛ بالاتر از آن یعنی متن کِش آمده — همان
 * چیزی که هم فایل را دو تکه می‌کند و هم جای پُرکردن می‌دهد.
 */
function epTooLong_(durText, targetMin) {
  var t = Number(targetMin) || 0;
  if (!t) return 0;
  var m = String(durText || '').match(/(\d+)\s*:\s*(\d+)/);
  if (!m) return 0;
  var mins = Number(m[1]) + Number(m[2]) / 60;
  if (!isFinite(mins) || mins <= 0) return 0;
  var pct = Math.round((mins - t) / t * 100);
  return pct > 25 ? pct : 0;
}

function lastEpisode_(hub) {
  var pod = hub.getSheetByName(CFG.TAB_PODCASTS);
  if (!pod || pod.getLastRow() < 2) return null;
  var v = pod.getRange(pod.getLastRow(), 1, 1, PODCAST_HEADERS.length).getValues()[0];
  return {
    number: v[0], producedAt: String(v[1]), title: String(v[2]), category: String(v[3]),
    videos: v[4], photos: v[5], duration: String(v[6]),
    audioLinks: String(v[7]).split('\n').filter(String),
    scriptLink: String(v[8]), email: String(v[10]),
    sourceIds: String(v[11]).split(', ').filter(String), telegram: String(v[12]),
    audioFiles: Number(v[PCOL.AUDIO_N - 1]) || 0, docs: Number(v[PCOL.DOC_N - 1]) || 0
  };
}

/**
 * کلیدِ health را از نسخهٔ فعلیِ _STATUS.json (اگر باشد) برمی‌دارد، تا
 * writeStatus_ با بازنویسیِ کامل فایل — که هر ساعت از سینک، تولید قسمت و
 * درس‌نامه هم صدا زده می‌شود — آن را پاک نکند. healthCheck خودش در پایان
 * saveHealthSnapshot_ را دوباره صدا می‌زند و این کلید را با دادهٔ تازه
 * جایگزین می‌کند؛ بین دو وارسیِ سلامت، آخرین خلاصه باید سرِ جایش بماند.
 */
function readExistingHealth_() {
  var health = null;
  try {
    var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var it = folder.getFilesByName(STATUS_FILE);
    if (it.hasNext()) {
      var st = JSON.parse(it.next().getBlob().getDataAsString());
      health = st.health || null;
    }
  } catch (e) {}
  /* ردِ پای healthCheck (PK.HEALTH_STEP، از ۶٫۳۸) فقط در Properties Service
     زندگی می‌کرد — جایی که هیچ ناظرِ بیرونی نمی‌تواند بخواندش. وقتی
     healthCheck پیش از رسیدن به saveHealthSnapshot_ کشته می‌شود (مثلاً
     شش‌دقیقه‌ایِ Apps Script)، checkedAt چند روز کهنه می‌ماند و «کجا ایستاد»
     تنها سرنخِ موجود بود، ولی جایی که کسی بیرون از خودِ اسکریپت بتواند
     بخواندش نداشت. اینجا همان ردِ پا را — زنده، از هر فراخوانِ writeStatus_
     (نه فقط healthCheck) — به همان کلید می‌چسبانیم تا وقتی healthCheck
     ناتمام می‌ماند هم دیده شود. */
  try {
    var step = props_().getProperty(PK.HEALTH_STEP);
    if (step) {
      health = health || {};
      health.lastStep = step;
    }
  } catch (eS) {}
  return health;
}

/** نوشتن/به‌روزرسانی فایل وضعیت در OUTPUT */
/* ═════════════════════════════════════════════════════════════════════════
   وارسیِ چیدمانِ پوشهٔ OUTPUT

   ریشهٔ OUTPUT جای فایل‌های زندهٔ موتور است و بس: وضعیت، بانکِ محتوا، نشانهٔ
   کد، گزارشِ هنوز خوانده‌نشده، پرونده‌های در جریانِ غنی‌سازی، و پرامپت‌ها.
   هر چیزِ دیگری که آنجا سبز شود یعنی یا کسی دستی گذاشته، یا کدی جایی
   می‌نویسد که نباید. هر دو باید دیده شود، نه اینکه در شلوغی گم شود.

   چرا فقط «گزارش» می‌دهد و خودش پاک نمی‌کند: فایلِ ناشناخته ممکن است کارِ
   دستِ خودِ آدم باشد. پاک‌کردنِ خودکار یعنی موتور چیزی را از بین ببرد که
   نمی‌شناسدش — همان کاری که در این ریپو هرگز مجاز نیست.
   ═════════════════════════════════════════════════════════════════════════ */

/** الگوهای نامِ فایلی که ماندنش در ریشه درست است. */
function outRootFilePatterns_() {
  return [
    { re: new RegExp('^' + rxQuote_(STATUS_FILE) + '$'), what: 'فایل وضعیت' },
    { re: new RegExp('^' + rxQuote_(String(CFG.HUB_FILE_NAME || '')) + '$'), what: 'بانک محتوا' },
    { re: new RegExp('^' + rxQuote_(String(CFG.CODE_FILE || '')) + '$'), what: 'نشانهٔ کد' },
    { re: new RegExp('^' + rxQuote_(String(CFG.OUT_README || '')) + '$'), what: 'نقشهٔ پوشه' },
    { re: new RegExp('^' + rxQuote_(String(CFG.MUSIC_FEED_FILE || '_MUSIC-FEED.json')) + '$'),
      what: 'فهرستِ موسیقیِ پیشنهادی — تسک نشانی می‌نویسد، موتور می‌آوردشان' },
    { re: new RegExp('^' + rxQuote_(String(CFG.MUSIC_WISH_FILE || '_MUSIC-WISH.json')) + '$'),
      what: 'درخواستِ موسیقی' },
    // درخواستِ ساختِ ویدئو. موتور نمی‌تواند ویدئو بسازد؛ این فایل تنها راهِ
    // خواستنش است، پس بردنش به زیرپوشه یعنی هیچ‌وقت خوانده نمی‌شود.
    { re: new RegExp('^' + rxQuote_(String(CFG.YT_RENDER_FILE || '_YT-RENDER.json')) + '$'),
      what: 'درخواستِ ساختِ ویدئوی یوتیوب — موتور نشانی می‌دهد، تسک می‌سازدش' },
    // گزارشِ هنوز برداشته‌نشده. خوانده‌شده‌اش («.ingested») باید رفته باشد به
    // بایگانی — پس اگر در ریشه ماند، خودش یک یافته است، نه یک استثنا.
    { re: new RegExp('^' + rxQuote_(String(CFG.REPORT_FILE_PREFIX || '_REPORT-')) + '.*$'),
      what: 'گزارش' },
    { re: /^_ENRICH(-REQ)?-[a-z]+-\d+\.json$/, what: 'غنی‌سازیِ در جریان' },
    { re: /^_PROMPT-[^/]*\.md$/, what: 'پرامپتِ تسک' },
    // شناسنامهٔ آهنگ‌های پیشین: جای تازه‌اش پوشهٔ بانک است، ولی آنچه از
    // قبل در ریشه مانده هم شناخته است — سرگردان نیست.
    { re: /^_MUSIC-META-[^/]*\.json$/, what: 'شناسنامهٔ آهنگ (جای قدیم)' },
    // صفِ گویندگان. مثلِ _YT-RENDER.json باید در ریشه و دقیقاً یکی باشد —
    // اکشن با هویتِ هیچ‌کس می‌خوانَدش و راهی برای گشتن در زیرپوشه ندارد.
    { re: new RegExp('^' + rxQuote_(String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json')) + '$'),
      what: 'صفِ آموزشِ گویندگان — موتور می‌نویسد، اکشن برمی‌دارد' },
    /* صفِ پلِ رنگِ صدا (بخشِ ۳۶). ۷٫۳۶ این فایل را به ریشه آورد و **هم از
       این فهرست جا ماند و هم از نقشهٔ پوشه** — پس از ۲۲ سپتامبر هر شب
       «چیزِ ناشناخته» گزارش می‌شد. دقیقاً همان شکلِ «voice cloning» در
       ۷٫۲۱: نامی پرمعنا که به کد نرسیده بود. مجموعهٔ سلامت گرفتش (۷٫۴۶). */
    { re: new RegExp('^' + rxQuote_(String(CFG.VBR_FILE || '_VOICE-RENDER.json')) + '$'),
      what: 'صفِ پلِ رنگِ صدا — موتور می‌نویسد، اکشن برمی‌دارد' }
  ];
}

/** نامِ پوشه‌هایی که جایشان ریشهٔ OUTPUT است. */
function outRootFolderNames_() {
  return [
    String(CFG.VARIETY_FOLDER || ''), String(CFG.SPECIAL_FOLDER || ''),
    String(CFG.CODE_FOLDER || ''), String(CFG.MUSIC_FOLDER || ''),
    String(CFG.REPORT_ARCHIVE_FOLDER || ''), String(CFG.VOICE_AUDIT_FOLDER || ''),
    String(CFG.AUDIT_FOLDER || ''), String(CFG.PROMPT_ARCHIVE_FOLDER || ''),
    String(CFG.YT_COVER_FOLDER || ''),
    /* پوشهٔ نمونه‌های گوینده. تا ۷٫۲۰ هر شب «ناشناخته» گزارش می‌شد، چون
       صاحبِ برنامه ساخته بودش و کد نمی‌شناختش. حالا خانهٔ رسمیِ بخشِ ۳۳ است. */
    String(CFG.VOICE_CLONE_FOLDER || ''),
    /* پوشهٔ بردارهای معنایی (بخشِ ۳۵). قطعه‌ها ده‌ها فایل‌اند و جایشان
       ریشه نیست — ریشه فقط چیزی را نگه می‌دارد که موتور با نام پیدایش
       می‌کند. بی این ردیف، همان شبِ اول یک هشدارِ «ناشناخته» می‌ساخت
       برای پوشه‌ای که خودِ موتور ساخته بود. */
    String(CFG.EMB_FOLDER || ''),
    /* پوشهٔ نمونه‌های «رنگ و روح» (۷٫۷۴). نامِ تازه‌ای در ریشه که خودِ
       موتور می‌سازد، پس همان‌جا که ساخته می‌شود شناخته هم می‌شود — این
       عیناً درسِ ۷٫۴۶ است: `_VOICE-RENDER.json` نه در این فهرست بود و نه
       در نقشهٔ درایو، و موتور هفته‌ها صفِ خودش را «چیزِ ناشناخته» گزارش
       می‌کرد. */
    String(CFG.VBR_SOUL_FOLDER || ''),
    /* پوشهٔ کپیِ مدل‌های پلِ رنگِ صدا (بخشِ ۳۶، `vbrModelFolder_`). این
       ردیف را ۷٫۶۷ اضافه کرد و ۷٫۶۸ — در یک ادغامِ نامرتبط دربارهٔ موسیقی —
       با ویرایشِ همین لیست به‌جای این تکه، بی‌آنکه کسی بخواهد، حذفش کرد؛
       هیچ آزمونی هم `outRootFolderNames_().indexOf(CFG.VBR_FOLDER)` را
       مستقیماً نمی‌سنجید، پس رگرسیون دو شب بی‌صدا ماند و هر شب دوباره
       «چیزِ ناشناخته: پوشه «مدل‌های صدا»» در outLayout.strays برگشت. */
    String(CFG.VBR_FOLDER || '')
  ].filter(function (x) { return !!x; });
}

/** گریزِ نویسه‌های ویژه، تا نامِ فارسیِ حاوی نقطه به الگوی باز تبدیل نشود. */
function rxQuote_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * سیاههٔ ریشهٔ OUTPUT و آنچه در آن جا ندارد.
 * برمی‌گرداند {files, folders, strays:[{name,kind}], stale:[...], readme:{...}}
 */
function outLayoutCheck_() {
  var out = { files: 0, folders: 0, strays: [], stale: [], dups: [],
              oldPrompts: [], openFolders: [], readme: null, error: '' };
  try {
    var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var pats = outRootFilePatterns_(), okFolders = outRootFolderNames_();
    var now = new Date().getTime();

    /* ── هم‌نامِ تکراری ──
     * ۲۳ اوت، در ریشه سه تا `_MUSIC-FEED.json` بود: تسکِ غنی‌سازی هر ساعت
     * یک فایلِ تازه می‌ساخت به‌جای اینکه همان را به‌روز کند. getFilesByName
     * فقط یکی را برمی‌گرداند و کدام‌یک تضمینی نیست — پس موتور می‌توانست
     * نسخهٔ کهنه را بخواند و نامزدهای تازه اصلاً دیده نشوند. بدتر:
     * putOutJson_ هنگام نوشتن، هم‌نام‌های دیگر را به سطلِ زباله می‌برد، پس
     * همان نامزدهای نادیده برای همیشه از دست می‌رفتند.
     * نامِ ناشناخته «سرگردان» است؛ نامِ *شناخته‌شده* که دو بار آمده، از آن
     * بدتر است — چون هیچ‌کس نگاهش نمی‌کند.
     */
    var byName = {};
    /* نسخهٔ کهنهٔ پرامپت در ریشه: نامش «شناخته» است پس سرگردان شمرده نمی‌شد
       و هیچ هشداری نمی‌گرفت. ۲۳ اوت هشت‌تا از آن‌ها آنجا بودند و کسی جز
       خودِ صاحبِ برنامه ندیدشان — بعد از اینکه دو بار یادآوری کرد.
       promptPrune_ شبانه جمعشان می‌کند؛ این فهرست می‌گوید *امروز* هنوز
       هستند، تا اگر آن هرس اجرا نشده باشد، سکوت نکند. */
    var promptFam = {};

    var fi = root.getFiles();
    while (fi.hasNext()) {
      var f = fi.next(), n = String(f.getName());
      out.files++;
      byName[n] = (byName[n] || 0) + 1;
      var pm = n.match(PROMPT_RE);
      if (pm) {
        var pk = pm[1], pn = parseInt(pm[2], 10);
        if (isFinite(pn)) {
          if (!promptFam[pk]) promptFam[pk] = [];
          promptFam[pk].push({ name: n, n: pn });
        }
      }
      if (n === String(CFG.OUT_README || '')) {
        var w = null;
        try { w = f.getLastUpdated(); } catch (eU) {}
        out.readme = { at: w ? fmtWhen_(w) : '', ageDays: w ? Math.round((now - w.getTime()) / 86400000) : null };
      }
      var hit = false;
      for (var p = 0; p < pats.length; p++) if (pats[p].re.test(n)) { hit = true; break; }
      if (!hit) { if (out.strays.length < 25) out.strays.push({ name: n, kind: 'فایل' }); continue; }
      // گزارشی که خوانده شده ولی هنوز در ریشه است: بایگانی‌اش نگرفته.
      if (n.indexOf('.ingested') !== -1 && out.stale.length < 25) out.stale.push(n);
    }

    for (var pfk in promptFam) {
      if (!Object.prototype.hasOwnProperty.call(promptFam, pfk)) continue;
      var pl = promptFam[pfk];
      if (pl.length < 2) continue;
      var ptop = pl[0].n;
      for (var pi2 = 1; pi2 < pl.length; pi2++) if (pl[pi2].n > ptop) ptop = pl[pi2].n;
      for (var pj = 0; pj < pl.length; pj++) {
        if (pl[pj].n >= ptop) continue;
        if (out.oldPrompts.length < 25) out.oldPrompts.push(pl[pj].name);
      }
    }

    for (var nm in byName) {
      if (byName[nm] > 1 && out.dups.length < 25) {
        out.dups.push({ name: nm, count: byName[nm] });
      }
    }

    var di = root.getFolders();
    while (di.hasNext()) {
      var d = di.next(), dn = String(d.getName());
      out.folders++;
      var okd = false;
      for (var q = 0; q < okFolders.length; q++) if (okFolders[q] === dn) { okd = true; break; }
      if (!okd && out.strays.length < 25) out.strays.push({ name: dn, kind: 'پوشه' });

      /* ── پوشه‌ای که خودش «هرکس با لینک» است (۷٫۴۵) ──
       * این از نامِ سرگردان بدتر است، دقیقاً به همان دلیلی که `dups` بدتر
       * بود: چیزی برای دیدن نیست. نامِ پوشه درست است، جایش درست است، و
       * **هر فایلی که از این پس در آن نوشته شود عمومی است** — ارثی، پس
       * `driveShareOff_` هم نمی‌تواند پسش بگیرد. یعنی هر «اشتراکِ موقتِ»
       * موتور در آن پوشه یک ادعای نادرست است.
       *
       * موتور خودش نمی‌بنددش و این عمدی است: شاید صاحبِ برنامه پوشه‌ای را
       * با کسی به اشتراک گذاشته باشد، و بستنِ آن همان «اسکنِ موسیقی که
       * سلیقهٔ گردآورنده را پاک می‌کند» است. تنها استثنا پوشهٔ نمونه‌های
       * سبک است که خودِ موتور ساخته و اشتراکش را «موقت» اعلام کرده —
       * `styleProbeUnshare_` آن یکی را می‌بندد.
       */
      if (driveShareOpen_(d) && out.openFolders.length < 25) {
        out.openFolders.push(dn);
      }
    }
  } catch (e) { out.error = e.message; }
  return out;
}

function fmtWhen_(d) {
  try { return Utilities.formatDate(d, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm'); }
  catch (e) { return String(d); }
}

/* ═════════════════════════════════════════════════════════════════════════
   بایگانیِ نسخه‌های کهنهٔ پرامپت

   پرامپت‌ها append-only هستند — نسخهٔ تازه یک فایلِ تازه است و قدیمی هرگز
   بازنویسی نمی‌شود، چون تاریخچه باید بماند. ولی نتیجه‌اش این است که ریشه
   با هر به‌روزرسانی یک فایل شلوغ‌تر می‌شود؛ همان انباشتی که گزارش‌ها داشتند.

   تسک و روتین فقط **بالاترین شماره** را می‌خوانند، پس نسخه‌های پیشین در ریشه
   هیچ کاری نمی‌کنند جز اینکه دیدِ آدم را کور کنند. اینجا آن‌ها به زیرپوشه
   می‌روند — نه پاک می‌شوند و نه گم: تاریخچه هم در آن پوشه هست، هم در گیت
   (`docs/prompts/`).

   مقایسه **عددی** است نه حرفی. با مقایسهٔ حرفی «v10» کوچک‌تر از «v9» می‌شد و
   روزی که به نسخهٔ دهم می‌رسیدیم، بایگانی نسخهٔ تازه را می‌برد و کهنه را در
   ریشه نگه می‌داشت — یعنی تسک برای همیشه دستورِ قدیمی را می‌خواند.
   ═════════════════════════════════════════════════════════════════════════ */

var PROMPT_RE = /^_PROMPT-(.+)-v(\d+)\.md$/;

function promptArchiveFolder_() {
  var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  var name = CFG.PROMPT_ARCHIVE_FOLDER || 'بایگانی — پرامپت‌های پیشین';
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/**
 * برای هر خانوادهٔ پرامپت فقط بالاترین نسخه در ریشه می‌ماند.
 * برمی‌گرداند: شمارِ فایل‌هایی که بایگانی شدند.
 */
/* ═══════════ پرامپت‌ها از ریپو به درایو، خودکار (۵٫۸۵) ═══════════

   ══ کارِ دستی‌ای که هر بار تکرار می‌شد ══
   قاعدهٔ ۷ج در CLAUDE.md می‌گوید نسخهٔ تازهٔ هر پرامپت باید هم در
   `docs/prompts/` باشد و هم در ریشهٔ OUTPUT. تا امروز نیمهٔ دومش را **آدم**
   انجام می‌داد: متن را از ریپو برمی‌داشت و در درایو می‌ساخت.

   دو ایراد داشت، و هر دو واقعی‌اند نه نظری:
   ۱) همان کارِ دستی‌ای است که صاحبِ برنامه بارها گفته نمی‌خواهد:
      «من این‌همه اتوماسیون نکردم که آخرش بروم دستی چیزی را بگذارم جایی.»
   ۲) و بدتر: **دو نسخه از یک متن، دستی هم‌گام‌شده.** آنچه git ثبت می‌کند و
      آنچه تسک می‌خواند می‌توانستند بی‌صدا از هم فاصله بگیرند — و هیچ سنجه‌ای
      این را نمی‌گرفت، چون هر دو فایل به‌تنهایی سالم‌اند.

   حالا همان راهی که `outReadmeSync_` از ۵٫۶۸ برای نقشهٔ پوشه می‌رود:
   raw گیت‌هاب → درایو. تنها منبعِ حقیقت ریپوست.

   ══ چرا فقط «افزودن»، هرگز بازنویسی ══
   پرامپت‌ها append-only هستند. اگر این تابع فایلِ موجود را بازنویسی می‌کرد،
   یک ویرایشِ اشتباه در ریپو می‌توانست نسخه‌ای را که تسک همین حالا دارد
   می‌خواند عوض کند. پس فقط شماره‌های **بالاتر از آنچه هست** ساخته می‌شوند.
*/

/** بالاترین شمارهٔ هر خانوادهٔ پرامپت در ریشهٔ OUTPUT. */
function promptTopVersions_() {
  var top = Object.create(null);
  try {
    var it = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).getFiles();
    while (it.hasNext()) {
      var m = String(it.next().getName()).match(PROMPT_RE);
      if (!m) continue;
      var n = parseInt(m[2], 10);
      if (!isFinite(n)) continue;
      if (!(top[m[1]] >= n)) top[m[1]] = n;
    }
  } catch (e) {}
  return top;
}

/**
 * نسخه‌های تازهٔ پرامپت را از `docs/prompts/` در ریپو به ریشهٔ OUTPUT می‌آورد.
 * @return {{added:Array, checked:number, error:string}}
 */
function promptSyncFromRepo_() {
  var out = { added: [], checked: 0, error: '' };
  if (CFG.PROMPT_SYNC === false) return out;
  var kinds = CFG.PROMPT_KINDS || ['monitor', 'enrich'];
  var lookAhead = Math.max(1, Number(CFG.PROMPT_SYNC_AHEAD) || 3);
  var root;
  try { root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID); }
  catch (e) { out.error = e.message; return out; }
  var top = promptTopVersions_();

  for (var k = 0; k < kinds.length; k++) {
    var kind = String(kinds[k]);
    var have = Number(top[kind] || 0);
    var miss = 0;
    /* از نسخهٔ بعدی به بالا کاوش می‌شود تا `lookAhead` بارِ پیاپی نبودن.
       بی این حاشیه، جا انداختنِ یک شماره در ریپو (که پیش می‌آید) زنجیره را
       برای همیشه متوقف می‌کرد. */
    for (var n = have + 1; miss < lookAhead; n++) {
      out.checked++;
      var name = '_PROMPT-' + kind + '-v' + n + '.md';
      var body = '';
      try {
        var res = UrlFetchApp.fetch(githubRawUrl_('docs/prompts/' + name),
                    { muteHttpExceptions: true, followRedirects: true });
        if (res.getResponseCode() === 200) body = res.getContentText();
      } catch (eF) {}
      if (!body || body.length < 200) { miss++; continue; }
      miss = 0;
      // هرگز روی فایلِ موجود نمی‌نویسد؛ فقط نبودنش را پر می‌کند.
      try {
        if (root.getFilesByName(name).hasNext()) continue;
        root.createFile(Utilities.newBlob(body, 'text/markdown', name));
        out.added.push(name);
        logLine_('دستورِ تازه از ریپو آورده شد: ' + name);
      } catch (eC) { out.error = eC.message; }
    }
  }
  // نسخهٔ تازه که نشست، کهنه همان لحظه بایگانی می‌شود — نه فردا شب. بینِ این
  // دو، ریشه دو نسخه از یک دستور دارد و خواننده می‌تواند اشتباهی را بردارد.
  if (out.added.length) { try { promptPrune_(); } catch (eP) {} }
  return out;
}

function promptPrune_() {
  if (CFG.OUT_TIDY === false) return 0;
  var moved = 0;
  try {
    var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var fam = Object.create(null);
    var it = root.getFiles();
    while (it.hasNext()) {
      var f = it.next();
      var m = String(f.getName()).match(PROMPT_RE);
      if (!m) continue;
      var kind = m[1], n = parseInt(m[2], 10);
      if (!isFinite(n)) continue;
      if (!fam[kind]) fam[kind] = [];
      fam[kind].push({ file: f, n: n });
    }
    for (var k in fam) {
      if (!Object.prototype.hasOwnProperty.call(fam, k)) continue;
      var list = fam[k];
      if (list.length < 2) continue;
      var top = list[0].n;
      for (var i = 1; i < list.length; i++) if (list[i].n > top) top = list[i].n;
      for (var j = 0; j < list.length; j++) {
        if (list[j].n >= top) continue;          // بالاترین می‌ماند
        try {
          var dest = promptArchiveFolder_();
          if (typeof list[j].file.moveTo === 'function') list[j].file.moveTo(dest);
          else { dest.addFile(list[j].file); root.removeFile(list[j].file); }
          moved++;
        } catch (eM) {}
      }
    }
  } catch (e) { logLine_('بایگانیِ پرامپت‌های کهنه ناموفق: ' + e.message); }
  if (moved) logLine_('نسخهٔ کهنهٔ پرامپت بایگانی شد: ' + moved + ' فایل.');
  return moved;
}

function writeStatus_(hub, note) {
  hub = hub || getHub_();
  var models = {};
  try { var mm = resolveModels_(false); models = { text: mm.text, tts: mm.tts }; } catch (e) {}

  // نبضِ هر (منبع، تب): پیشرفت خواندن + الگوی زمانیِ واقعیِ همان تب
  var pulse = { feeds: [], worst: 0 }, behindMax = 0;
  try {
    pulse = sourceFeedReport_();
    writePulseTab_(hub, pulse);
    for (var pi = 0; pi < pulse.feeds.length; pi++) {
      if (pulse.feeds[pi].behind > behindMax) behindMax = pulse.feeds[pi].behind;
    }
  } catch (ePulse) { logLine_('نبض منابع خوانده نشد: ' + ePulse.message); }
  var feeds = pulse.feeds;

  var srcErr = { total: 0, last24h: 0, last7d: 0, byType: {}, recent: [] };
  try { srcErr = srcErrorSummary_(hub, 20); } catch (eE) {}

  // شمار ردیف دو منبع اول از همان گزارشِ نبض برداشته می‌شود؛ باز کردن دوبارهٔ
  // آن دو شیتِ بزرگ فقط برای گرفتن یک عدد، دو فراخوانیِ گرانِ اضافه بود.
  var vLast = 0, pLast = 0;
  for (var vi = 0; vi < feeds.length; vi++) {
    if (feeds[vi].error) continue;
    if (feeds[vi].source === 'RESULT (ویدیو)') vLast = feeds[vi].rows || 0;
    if (feeds[vi].source === 'RESULT-PHOTO (عکس)') pLast = feeds[vi].rows || 0;
  }

  var pendingRaw = props_().getProperty(PK.PENDING);
  var pending = null;
  if (pendingRaw) {
    try {
      var pj = JSON.parse(pendingRaw);
      pending = { episode: pj.epNum, phase: pj.phase || 'audio',
                  chunkIdx: pj.chunkIdx, parts: (pj.files || []).length };
    } catch (e) { pending = { raw: 'نامعتبر' }; }
  }

  /* یک بار خوانده می‌شود و دو جا مصرف — `health` و `healthStale`. دو
     فراخوانِ جدا یعنی دو خواندنِ ۱۲۶ کیلوبایتیِ درایو در هر بار. */
  var existingHealth = readExistingHealth_();

  var status = {
    generatedAt: nowStr_(),
    timezone: CFG.TIMEZONE,
    note: note || '',
    hubUrl: hub.getUrl(),
    sync: {
      videoCursor: parseInt(props_().getProperty(PK.CUR_VIDEO) || '0', 10),
      videoRows: vLast,
      photoCursor: parseInt(props_().getProperty(PK.CUR_PHOTO) || '0', 10),
      photoRows: pLast,
      feeds: feeds,
      maxBehind: behindMax
    },
    // دیدبانیِ خودِ شیت‌های منبع — همان چیزی که ناظر روزانه باید ببیند
    sourceErrors: srcErr,
    // حلقهٔ بستهٔ گزارش ← اقدام: چه چیزی باز است و چه چیزی اعمال شده
    reports: (function () { try { return reportSummary_(hub); } catch (e) { return null; } })(),
    /* کدام وارسیِ روزانهٔ ناظر گزارش شده و کدام نه (۶٫۹۵) — بی این، «انجام
       شد و سالم بود» از «اصلاً انجام نشد» جدا نمی‌شود. اینجا فقط خوانده
       می‌شود؛ یافته‌اش در healthCheck ساخته می‌شود تا writeStatus_ که هر دو
       ساعت می‌دود، هر دو ساعت یک ردیف نسازد. */
    monChecks: (function () { try { return monChecksStatus_(null, false); } catch (e) { return null; } })(),
    srcQuality: (function () { try { return sqStatus_(); } catch (e) { return null; } })(),
    speakReview: (function () { try { return speakReviewStatus_(); } catch (e) { return null; } })(),
    speakSkip: (function () { try { return speakSkipStatus_(); } catch (e) { return null; } })(),
    nightStarve: (function () { try { return nightStarveStatus_(); } catch (e) { return null; } })(),
    ttsCue: (function () { try { return ttsCueStatus_(); } catch (e) { return null; } })(),
    /* مدلِ صوتی: سنجاق، مرجع، جانشینِ هم‌خوان و دگرگونی (۸.۳۹) — فقط Properties */
    ttsModel: (function () { try { return ttsModelStatus_(); } catch (e) { return null; } })(),
    /* حالت‌ها و نشانه‌های لحنِ قسمت‌ها: کجا نشست و چطور (۸.۴۰) — فقط Properties */
    speakMoods: (function () { try { return speakMoodStatus_(); } catch (e) { return null; } })(),
    auditQueue: (function () { try { return auditQueueStatus_(null); } catch (e) { return null; } })(),
    seriesOrder: (function () { try { return seriesOrderStatus_(null); } catch (e) { return null; } })(),
    speechCalib: (function () { try { return speechCalibStatus_(); } catch (e) { return null; } })(),
    explain: (function () { try { return explainStatus_(); } catch (e) { return null; } })(),
    recap: (function () { try { return recapStatus_(); } catch (e) { return null; } })(),
    bridge: (function () { try { return bridgeStatus_(hub); } catch (e) { return null; } })(),
    bridgeAudit: (function () { try { return bridgeAuditStatus_(hub); } catch (e) { return null; } })(),
    seriesInv: (function () { try { return seriesInvStatus_(); } catch (e) { return null; } })(),
    seriesRejected: (function () { try { return seriesRejected_(); } catch (e) { return null; } })(),
    handoutViz: (function () { try { return hvizStatus_(); } catch (e) { return null; } })(),
    models: (function () { try { return modelStatus_(); } catch (e) { return null; } })(),
    codeVersion: CFG.CODE_VERSION,
    chunks: chunkBacklog_(hub),
    bank: indexSnapshot_(hub),
    music: (function () { try { return musicStatus_(); } catch (e) { return null; } })(),
    lastEpisode: lastEpisode_(hub),
    // شمارِ فایل‌های «کلِ قسمت» — از حافظه، چون ستونِ لینک هم بخش‌های خام را دارد
    lastEpisodeAudio: (function () {
      try { return JSON.parse(props_().getProperty(PK.EP_LAST) || 'null'); }
      catch (e) { return null; }
    })(),
    pendingEpisode: pending,
    models: models,
    telegram: tgEnabled_() ? 'فعال' : 'تنظیم نشده',
    triggers: ScriptApp.getProjectTriggers().length,
    /* و نامشان، نه فقط شمارشان. شمار به‌تنهایی نمی‌گوید کدام کار زنده است:
       ۹ می‌تواند «همه سرِ جایشان» باشد یا «یکی گم و یکی تکراری». ناظر فقط
       همین فایل را می‌خواند، پس چیزی که این‌جا نباشد، دیده نمی‌شود. */
    triggerNames: (function () { try { return trigNames_(); } catch (e) { return null; } })(),
    special: specialStatus_(hub),
    // داوریِ محتوایی: چند مجموعه آموزشی است، چند تا نه، چند تا داوری‌نشده
    curation: (function () { try { return judgeSummary_(hub); } catch (e) { return null; } })(),
    // پشتیبانِ شیت‌ها: آخرین نسخه و شمارِ نسخه‌ها
    backup: (function () { try { return backupStatus_(); } catch (e) { return null; } })(),
    // نصبِ خودکارِ کد — تا ناظرِ Cowork نسخهٔ در حالِ اجرا و وضعِ چرخه را ببیند
    selfUpdate: (function () { try { return selfUpdateStatus_(); } catch (e) { return null; } })(),
    sourceScripts: (function () { try { return sourceScriptsStatus_(); } catch (e) { return null; } })(),
    // وضعیتِ غنی‌سازیِ اینترنتی — تا Cowork در بازبینیِ روزانه ببیند کدام
    // درخواست بی‌پاسخ مانده و چرا.
    enrich: (function () { try { return enrichStatus_(); } catch (e) { return null; } })(),
    // چیدمانِ پوشهٔ OUTPUT — تا ناظر ببیند چه چیزی در ریشه سبز شده
    outLayout: (function () { try { return outLayoutCheck_(); } catch (e) { return null; } })(),
    // سنجهٔ محتوا: متنِ نهایی در برابرِ متنِ خام — انتخاب، پیوند، وفاداری
    contentAudit: (function () { try { return auditStatus_(); } catch (e) { return null; } })(),
    // تقویمِ تولید — کدام برنامه امروز ساخته می‌شود و چرا
    calendar: (function () { try { return calStatus_(); } catch (e) { return null; } })(),
    // تازگیِ دستورِ روتین‌ها نسبت به نسخهٔ در حالِ اجرا
    promptFresh: (function () { try { return promptFreshStatus_(); } catch (e) { return null; } })(),
    // جزوهٔ هر مجموعه — چند فصل، چند ارجاع، و کدام مجموعه عقب مانده
    handout: (function () { try { return handoutStatus_(); } catch (e) { return null; } })(),
    youtube: (function () { try { return ytStatus_(); } catch (e) { return null; } })(),
    /* تصویرهای درس (۷.۹۵). هر دو حافظه‌اش در Properties است، پس این‌جا —
       داغ‌ترین مسیرِ موتور — هیچ فراخوانِ درایو یا شیتی اضافه نمی‌کند
       (۷.۶۳/۷.۷۲، دو بار آموخته). */
    lessonVisuals: (function () { try { return lvStatus_(); } catch (e) { return null; } })(),
    /* کلیپ، حرکت و آزمونِ مدلِ تازه (۸.۵۲) — هر سه فقط از Properties، بی درایو. */
    lessonClip: (function () { try { return lvClipStatus_(); } catch (e) { return null; } })(),
    lessonMotion: (function () { try { return lvMotionStatus_(); } catch (e) { return null; } })(),
    /* نگهبانِ ادامهٔ قسمت‌ها (۸.۵۴) — فقط Properties. */
    epGuard: (function () { try { return epGuardStatus_(); } catch (e) { return null; } })(),
    imageAudition: (function () { try { return lvAudStatus_(); } catch (e) { return null; } })(),
    // گویندهٔ تازه — از نمونه در درایو تا مدلِ آماده (بخشِ ۳۳)
    voiceIntake: (function () { try { return vintStatus_(hub); } catch (e) { return null; } })(),
    voiceBridge: (function () { try { return vbrStatus_(); } catch (e) { return null; } })(),
    // اثر انگشتِ معنایی — چند ردیف شناسه و بردار دارند، و خودآزمون چه گفت
    embed: (function () { try { return embStatus_(hub); } catch (e) { return null; } })(),
    codeQueue: (function () { try { return codeQueue_(hub); } catch (e) { return null; } })(),
    // سنجشِ ردیف‌های بسته را خودِ `healthCheck` می‌نشاند (نیازِ وضعیتِ زنده
    // به خودش، پیش از ساخته شدنش، حلقه می‌شود).
    nightDeath: (function () { try { return nightDeath_(); } catch (e) { return null; } })(),
    /* ══ اجراهایی که شروع شدند و تمام نشدند (۸.۱۱) ══
       تنها شاهدی که یک تریگرِ ترکیده دارد. ورودی‌اش Script Properties است،
       نه شیت — چون چیزی که در این خرابی شکست، خودِ شیت بود. */
    runs: (function () { try { return runStuck_(); } catch (e) { return null; } })(),
    /* عددِ تولیدشده در build — بی هیچ خواندنی، و بی امکانِ کهنه شدن (۸.۱۳) */
    menuCover: (function () {
      try {
        if (typeof BUILD_MENU_ !== 'object' || !BUILD_MENU_) return null;
        return { total: BUILD_MENU_.total, debt: BUILD_MENU_.debt,
                 covered: BUILD_MENU_.total - BUILD_MENU_.debt };
      } catch (e) { return null; }
    })(),
    recentLog: recentLog_(hub, 25),
    /* کهنگیِ گزارشِ روزانه — از همین `health` بالا حساب می‌شود، پس
       هیچ خواندنِ تازه‌ای به درایو اضافه نمی‌کند. اینجاست چون
       `syncCatalog` هر دو ساعت `writeStatus_` را صدا می‌زند: یعنی
       این کلید تازه می‌مانَد **حتی وقتی خودِ وارسیِ سلامت مُرده**،
       که تنها حالتی است که کسی سراغش را می‌گیرد (۷٫۶۳). */
    health: existingHealth,
    healthStale: (function () {
      try { return healthStale_(existingHealth || {}); } catch (e) { return null; }
    })()
  };

  /* کارنامهٔ قابلیت‌ها **پس از** ساختنِ `status` حساب می‌شود، چون ورودی‌اش
     همین شیء است — و همین است که هزینه‌اش را صفر می‌کند. */
  try { status.capabilities = capStatus_(status); } catch (eCap) { status.capabilities = null; }

  var body = JSON.stringify(status, null, 1);
  var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  var it = folder.getFilesByName(STATUS_FILE);
  if (it.hasNext()) it.next().setContent(body);
  else folder.createFile(STATUS_FILE, body, 'application/json');
  return status;
}

/**
 * هر ایرادِ وارسیِ سلامت فقط شمرده و ایمیل می‌شد؛ در _STATUS.json هیچ‌جا نمی‌آمد،
 * پس ناظرِ بیرونی (که فقط همین فایل را می‌خواند) می‌دانست چند تا ایراد هست ولی
 * نمی‌توانست حتی یکی‌شان را نام ببرد. اینجا همان فهرست را — با سقفِ حجم — در
 * فایلِ از‌قبل‌نوشته‌شده می‌گنجاند تا دو بار کامل سریالایز نشود.
 */
var HEALTH_SNAPSHOT_MAX_CHARS = 9000;

function capHealthList_(list, maxChars) {
  var out = [], used = 0;
  for (var i = 0; i < list.length; i++) {
    var s = String(list[i]);
    used += s.length + 2;
    if (used > maxChars) return { list: out, omitted: list.length - out.length };
    out.push(s);
  }
  return { list: out, omitted: 0 };
}

function saveHealthSnapshot_(problems, notes, chronic) {
  try {
    var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var it = folder.getFilesByName(STATUS_FILE);
    if (!it.hasNext()) return;
    var f = it.next();
    var st;
    try { st = JSON.parse(f.getBlob().getDataAsString()); } catch (eParse) { return; }
    var capped = capHealthList_(problems || [], HEALTH_SNAPSHOT_MAX_CHARS);
    st.health = {
      checkedAt: nowStr_(),
      problemCount: (problems || []).length,
      problems: capped.list,
      omitted: capped.omitted,
      notes: (notes || []).slice(0, 20),
      /* ایرادهایی که دیروز هم بودند (۸.۳۲) — قدیمی‌ترین اول. ناظر از همین‌جا
         کارِ امروزش را برمی‌دارد، نه از «یافتهٔ تازه». */
      chronic: (chronic || []).slice(0, 15)
    };
    f.setContent(JSON.stringify(st, null, 1));
  } catch (e) { logLine_('نوشتنِ خلاصهٔ سلامت ناموفق: ' + e.message); }
}

/* ═══════════ ایرادِ مزمن: «گزارش‌شده» با «رفع‌شده» یکی نیست (۸.۳۲) ═══════════

   ۴ اکتبر صاحبِ برنامه پرسید: «اگر ایمیل‌ها را برایت نمی‌فرستادم، متوجهِ
   اشتباهاتِ اتوماسیون می‌شدی؟» جوابِ راست «نه» بود — و علتش در خودِ ایمیل‌ها
   بود: ایمیلِ ۱۰ صبحِ ۱ و ۲ و ۳ اکتبر **همان ایرادها** را هر روز نوشت
   (اعراب بالای سقف، ۷۱ موسیقیِ نشنیده، سه ویدئوی گیرکرده، پیشرفتِ اثرِ انگشت)
   و ناظر هر روز نوشت «یافتهٔ تازه‌ای نبود ⇒ کدی نساخته شد».

   **هر دو درست می‌گفتند، و همین عیب بود.** ایمیل فهرستِ امروز را می‌دهد، بی
   حافظه؛ ناظر «تازه» را می‌جوید. ایرادی که دیروز هم بود از هر دو صافی رد می‌شد:
   برای ایمیل یک سطرِ دیگر، برای ناظر «قدیمی». **ایرادی که دیروز هم بود و امروز
   هم هست، تازه نیست — بدتر است.** هیچ جای سامانه این را نمی‌شمرد.

   ══ امضا، نه متن ══
   سطرهای سلامت عدد دارند و عدد هر روز عوض می‌شود («۷۱ موسیقی» ⇒ «۷۳ موسیقی»).
   مقایسهٔ متن یعنی هیچ ایرادی هرگز دو روز پشتِ‌هم «همان» نیست — همان سکوت. پس
   رقم‌ها (فارسی، عربی، لاتین) و تاریخ و ساعت کنار می‌روند و ۷۰ نویسهٔ اولِ
   باقی‌مانده امضاست.

   ══ مرزها ══
   • «⟨شما⟩» بیرون است: کاری که فقط از صاحبِ برنامه برمی‌آید ایرادِ کد نیست.
   • یک روز غیبت زنجیره را نمی‌بُرد: healthCheck گاهی پیش از رسیدن به یک بخش
     وقت کم می‌آورد (`skipped`)، و نبودنِ سطر آن روز یعنی «سنجیده نشد» نه «رفع شد».
     دو روز غیبت یعنی رفع شده.
   • دو اجرا در یک روز یک روز است، نه دو.
   • خودِ سطرِ «مزمن» در شمارش نمی‌آید، وگرنه از روزِ دوم خودش مزمن می‌شد.
   • سقفِ ۶۰ امضا و ۱۶۰ نویسه: Script Properties نُه کیلوبایت جا دارد.
*/
var CHRONIC_HEAD_ = 'ایرادهای مزمن';

/** امضای پایدارِ یک سطرِ سلامت: بی عدد، بی تاریخ و ساعت، ۷۰ نویسهٔ اول. */
function healthSig_(s) {
  return String(s || '')
    .replace(/\d{4}-\d{2}-\d{2}[ T]?\d{0,2}:?\d{0,2}(:\d{2})?/g, ' ')
    .replace(/[0-9۰-۹٠-٩]+([.,٫][0-9۰-۹٠-٩]+)?/g, '#')
    .replace(/[\s\u200c]+/g, ' ').trim().slice(0, 70);
}

/**
 * ایرادهای امروز را با روزهای قبل می‌سنجد و آن‌هایی را که دست‌کم
 * `HEALTH_CHRONIC_DAYS` روزِ پیاپی آمده‌اند برمی‌گرداند — قدیمی‌ترین اول.
 * فقط از healthCheck صدا زده می‌شود (روزی یک بار).
 */
function healthChronic_(problems) {
  var out = { list: [], line: '', n: 0 };
  try {
    var need = Math.max(2, Number(CFG.HEALTH_CHRONIC_DAYS) || 2);
    var tz = CFG.TIMEZONE;            // همان قراردادِ بقیهٔ موتور (`speakSkipRecord_`)
    var day = function (t) { return Utilities.formatDate(new Date(t), tz, 'yyyy-MM-dd'); };
    var nowT = new Date().getTime();
    var today = day(nowT), d1 = day(nowT - 86400000), d2 = day(nowT - 2 * 86400000);
    var m = {};
    try { m = JSON.parse(props_().getProperty(PK.HEALTH_CHRONIC) || '{}') || {}; } catch (e0) { m = {}; }
    var seen = {};
    for (var i = 0; i < (problems || []).length; i++) {
      var p = String(problems[i] || '');
      if (!p || p.indexOf(HY_) === 0 || p.indexOf(CHRONIC_HEAD_) === 0) continue;
      var k = healthSig_(p);
      if (!k || seen[k]) continue;
      seen[k] = true;
      var r = m[k];
      if (r && r.l === today) { r.t = p.slice(0, 160); continue; }       // اجرای دومِ همان روز
      if (r && (r.l === d1 || r.l === d2)) { r.d = (Number(r.d) || 1) + 1; r.l = today; r.t = p.slice(0, 160); }
      else m[k] = { f: today, l: today, d: 1, t: p.slice(0, 160) };
    }
    /* زنجیرهٔ بریده (دو روز غیبت) پاک می‌شود — **این جاروست، نه سد**: سدِ
       واقعی شرطِ «دیروز یا پریروز» در بالاست، و شکستنِ عمدیِ این خط هیچ سنجه‌ای
       را سرخ نمی‌کند چون رکوردِ کهنه به‌هرحال از نو شروع می‌شود. کارش فقط این
       است که Script Properties (نُه کیلوبایت) از امضای مرده پر نشود. */
    for (var k2 in m) if (Object.prototype.hasOwnProperty.call(m, k2)) {
      if (m[k2].l !== today && m[k2].l !== d1 && m[k2].l !== d2) delete m[k2];
    }
    var keys = Object.keys(m).sort(function (a, b) { return String(m[a].f).localeCompare(String(m[b].f)); });
    while (keys.length > 60) delete m[keys.shift()];
    try { props_().setProperty(PK.HEALTH_CHRONIC, JSON.stringify(m)); } catch (eW) {}
    for (var j = 0; j < keys.length; j++) {
      var q = m[keys[j]];
      if (!q || q.l !== today || (Number(q.d) || 0) < need) continue;
      out.list.push({ sig: keys[j], since: q.f, days: Number(q.d) || 0, text: q.t });
    }
    out.n = out.list.length;
    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (x) { return String(n); } };
    out.line = out.n
      ? CHRONIC_HEAD_ + ': ' + fa(out.n) + ' ایراد دست‌کم ' + fa(need) + ' روزِ پیاپی تکرار شده و هنوز رفع نشده — ' +
        'قدیمی‌ترین: «' + auditCut_(out.list[0].text, 90) + '» (از ' + out.list[0].since + '، ' + fa(out.list[0].days) + ' روز).'
      : 'ایرادِ مزمن: هیچ ایرادی دو روزِ پیاپی تکرار نشده.';
  } catch (e) { out.line = 'ایرادِ مزمن: سنجیده نشد (' + e.message + ').'; }
  return out;
}

/**
 * ایرادی که `HEALTH_CHRONIC_FIND_DAYS` روز مانده، یافتهٔ **کد** می‌شود (۸.۳۲).
 *
 * سطرِ ایمیل فردا جایش را به سطرِ دیگری می‌دهد؛ ردیفِ صفِ `NEEDS_CODE` نه —
 * و ناظر نسخهٔ بعد را از همان صف می‌سازد. کلید از امضاست نه از متن، پس فردا
 * همان ردیف «تکرار» می‌خورد نه ردیفِ تازه. سقفِ پنج در روز: صفی که همه‌چیز
 * را دارد صف نیست، و قدیمی‌ترین‌ها اول‌اند.
 */
function healthChronicFind_(hub, chr) {
  var made = 0;
  try {
    var need = Math.max(2, Number(CFG.HEALTH_CHRONIC_FIND_DAYS) || 3);
    var L = (chr && chr.list) || [];
    for (var i = 0; i < L.length && made < 5; i++) {
      var c = L[i];
      if ((Number(c.days) || 0) < need) continue;
      var hx = '';
      try {
        var dg = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(c.sig), Utilities.Charset.UTF_8);
        for (var b = 0; b < 4; b++) hx += ('0' + ((dg[b] + 256) % 256).toString(16)).slice(-2);
      } catch (eH) { hx = String(c.sig).length.toString(16); }
      logSelfFinding_(hub, {
        key: 'chronic-' + hx,
        priority: (Number(c.days) || 0) >= 5 ? 'جدی' : 'متوسط',
        category: 'ایرادِ مزمن',
        title: 'ایرادِ مزمن (' + c.days + ' روزِ پیاپی): ' + auditCut_(c.text, 90),
        detail: 'این سطر از ' + c.since + ' هر روز در وارسیِ سلامت آمده و رفع نشده: «' +
                auditCut_(c.text, 300) + '». ایرادی که دیروز هم بود تازه نیست — بدتر است.',
        instruction: 'علتِ ریشه‌ای را پیدا کن و نسخه بده — نه اینکه دوباره ثبتش کنی. اگر ' +
                     'کارِ صاحبِ برنامه است، سطرِ سلامتش باید «⟨شما⟩» بگیرد؛ اگر کاری است ' +
                     'که موتور می‌تواند، راهِ خودکارش را بساز. شناسه را در `answers`ِ ' +
                     '`manifest.json` بیاور.',
        owner: 'کد'
      });
      made++;
    }
  } catch (e) {}
  return made;
}

/**
 * وارسی سلامت. فقط وقتی ایمیل می‌زند که ایرادی باشد.
 * روی تریگر روزانه بنشیند تا اگر روزی چیزی نیامد، خودتان بی‌خبر نمانید.
 */
/* ═══════════ یک ایمیل در روز، نه شش تا (۵٫۹۱) ═══════════

   ══ آنچه واقعاً به صندوقِ ورودی می‌رسید ══
   هر روز، تضمینی: قسمتِ «از همه جا از همه رنگ»، قسمتِ «درس‌نامه»، پشتیبانِ
   شیت‌ها، گزارشِ ناظر. و روی آن‌ها: «کدِ نسخهٔ فلان نصب شد» (هر شبی که
   نسخه‌ای ساخته شده باشد)، «دستورِ روتین‌ها باید به‌روز شود» (هر شب تا وقتی
   انجام شود)، «کد موتور باید تعویض شود» (به‌ازای هر یافته)، و ایمیلِ سلامت.
   شش تا هشت ایمیل در روز برای سامانه‌ای که خودش باید کار کند.

   صاحبِ برنامه: «تعددِ ایمیل‌ها زیاد شده و نمی‌خواهم هی برای هر چیز یک
   ایمیلِ جدا بیاید.» درست است — و ایرادِ طراحی است نه سلیقه: وقتی هر چیزی
   ایمیلِ خودش را دارد، هیچ‌کدام خوانده نمی‌شوند و هشدارِ واقعی لای
   خبرهای روزمره گم می‌شود.

   ══ چه چیزی صف می‌شود و چه چیزی نه ══
   خبرهای روزمره (نصب شد، پشتیبان گرفته شد، دستور کهنه است، یافتهٔ تازه)
   در صف می‌نشینند و ساعت ۱۰ در **یک** ایمیلِ سلامت با هم می‌آیند.
   فوری می‌مانَد آنچه تا ۱۰ صبح صبر نمی‌کند: اجازهٔ نصب که کلِ زنجیره را
   خوابانده، شکستِ پشتیبان، و بازگردانیِ کدِ خراب.

   ══ چرا ساعت ۱۰ ══
   کارِ شبانه ۲:۳۰ است، پشتیبان ۳:۰۰، دو قسمت ۷ و ۸. وارسیِ سلامت ۱۰:۰۰
   اجرا می‌شود و ناظر ۱۲:۰۰ — پس ۱۰ تنها نقطه‌ای است که همهٔ کارِ شب و صبح
   تمام شده و هنوز پیش از گزارشِ ناظر است.
*/

/** یک خبر برای ایمیلِ روزانه. متن کوتاه بماند: سقفِ خاصیت ۹ کیلوبایت است. */
function mailQueue_(kind, title, body) {
  try {
    var q = [];
    try { q = JSON.parse(props_().getProperty(PK.MAIL_QUEUE) || '[]') || []; } catch (e0) {}
    q.push({ at: nowStr_(), kind: String(kind || ''),
             title: String(title || '').slice(0, 200),
             body: String(body || '').slice(0, 1200) });
    var dropped = 0;
    var s = JSON.stringify(q);
    while (s.length > 8000 && q.length > 1) { q.shift(); dropped++; s = JSON.stringify(q); }
    props_().setProperty(PK.MAIL_QUEUE, s);
    if (dropped) logLine_('صفِ ایمیلِ روزانه پر بود؛ ' + dropped + ' خبرِ قدیمی جا نشد.');
    return true;
  } catch (e) { return false; }
}

function mailQueueRead_() {
  try { return JSON.parse(props_().getProperty(PK.MAIL_QUEUE) || '[]') || []; }
  catch (e) { return []; }
}

function mailQueueClear_() {
  try { props_().deleteProperty(PK.MAIL_QUEUE); } catch (e) {}
}

/* ══════════ «کارِ شما» یا «خودش حل می‌شود» (۶٫۱۱) ══════════
 *
 * ایمیلِ ۲۶ اوت سیزده ایراد داشت و **دو تایش** کارِ صاحبِ برنامه بود؛ بقیه
 * یا خودِ موتور حلشان می‌کرد یا اصلاً ربطی به او نداشت (شیت‌های راکدِ
 * سامانه‌های دیگرش). وقتی سیزده مورد پشتِ سرِ هم فهرست شوند، آن دو تا گم
 * می‌شوند — و او گفت «وقتِ دیدن ندارم». فهرستی که همه‌چیز را یک‌جور نشان
 * دهد، خواندنش را غیرممکن می‌کند، نه آسان.
 *
 * پس هر ایراد یکی از دو جاست، و **پیش‌فرض «کارِ موتور» است**: چیزی «کارِ
 * شما» می‌شود که کسی صریح علامتش زده باشد. برعکسش — پیش‌فرضِ «کارِ شما» —
 * یعنی هر ایرادِ تازه‌ای که کسی یادش برود علامت بزند، بی‌خود سرِ او خراب
 * می‌شود؛ و همان چیزی است که این ایمیل را نخواندنی می‌کند.
 *
 * علامت یک نویسهٔ نامرئی نیست: یک پیشوندِ صریح که پیش از نمایش برداشته
 * می‌شود. نامرئی‌بودن یعنی روزی کسی متن را کپی می‌کند و علامت بی‌صدا گم
 * می‌شود.
 */
var HY_ = '⟨شما⟩ ';

/** ایرادها را به دو دستهٔ «کارِ شما» و «کارِ موتور» جدا می‌کند. */
function healthSplit_(problems) {
  var out = { yours: [], mine: [] };
  for (var i = 0; i < (problems || []).length; i++) {
    var t = String(problems[i] || '');
    if (t.indexOf(HY_) === 0) out.yours.push(t.slice(HY_.length));
    else out.mine.push(t);
  }
  return out;
}

/* ══════════ دیده‌بانِ کارگرهای بیرونی — «کی ناظر را می‌پاید؟» (۶٫۱۱) ══════════
 *
 * خواستهٔ صریحِ صاحبِ برنامه: «می‌خوام مطمئن بشم واقعاً همه‌چیز خودکار تحتِ
 * نظارت قرار می‌گیره … من وقتِ دیدن ندارم.»
 *
 * و جوابِ صادقانه تا ۶٫۱۰ این بود: **نه، کاملاً نه.** موتور خودش را
 * می‌پایید، ولی سه کارگر بیرون از آن کار می‌کنند و هیچ‌کدام دیده‌بان
 * نداشتند:
 *
 *   • **ناظرِ روزانه** (Cowork، ۱۲:۰۰) — گزارش می‌سازد و نسخهٔ کد می‌دهد
 *   • **تسکِ غنی‌سازی** (هر ساعت) — متن را کامل می‌کند
 *   • **اکشنِ رندر** (GitHub، هر ساعت) — ویدئو می‌سازد
 *
 * اگر هرکدامشان از کار می‌افتاد — سهمیه تمام می‌شد، دسترسی می‌پرید، یا
 * خطایی می‌خورد — موتور همچنان «همه‌چیز درست است» می‌گفت. `lastReportAt`
 * از مدت‌ها پیش حساب می‌شد و **هیچ‌جا خوانده نمی‌شد**: باز هم همان الگوی
 * آشنای این ریپو، تحلیلی که به تصمیمی وصل نشده.
 *
 * دقیقاً همان شکلِ خرابی‌ای که بانکِ موسیقی را هفته‌ها خالی نگه داشت: یک
 * طرف کاری را نمی‌کرد و هیچ‌کس نپرسید چرا.
 *
 * سه ضربان، سه آستانهٔ جدا — چون هر کارگر ریتمِ خودش را دارد و یک آستانهٔ
 * مشترک یا برای یکی زود است یا برای دیگری دیر.
 */
function watchdogHeartbeats_(st) {
  var out = [], now = new Date().getTime();

  /* ── ۱) ناظرِ روزانه ──
   *
   * ══ شاهدی که خودِ موتور هم می‌توانست بنویسدش (۸٫۱۷) ══
   * تا ۸٫۱۶ این ردیف از `reports.lastReportAt` می‌خواند، و آن عدد
   * **تازه‌ترین تاریخِ هر ردیفِ تبِ «گزارش‌های نظارت»** است — نه تاریخِ
   * گزارشِ ناظر. `logSelfFinding_` در همان تب و با `nowStr_()` می‌نویسد و
   * موتور تقریباً هر شب چیزی دربارهٔ خودش می‌یابد. یعنی تنها زنگی که
   * می‌گوید «ناظرِ روزانه نمی‌دود» با نوشتنِ **خودِ موتور** ساکت می‌شد:
   * اگر ناظر فردا بمیرد، اولین یافتهٔ خودی این ردیف را سبز نگه می‌داشت.
   * عددی که با نوشتهٔ خودت تازه شود، شاهدِ کارِ دیگری نیست.
   *
   * `__rep.lastAt` (۶٫۹۵) تنها با فایلی مهر می‌خورد که نامش
   * `_REPORT-YYYYMMDD.json` باشد — نه `_REPORT-tts-*`، نه
   * `_REPORT-enrich-*`، و نه یافته‌های موتور. پس زنگ از آن می‌خوانَد و
   * `lastReportAt` **مدرکِ کنار** می‌شود، تا اختلافِ دو عدد دیده شود نه
   * پنهان بمانَد (۷٫۳۲).
   *
   * و نبودنش زنگ نمی‌زند: `days < 0` در `watchdog_` فقط یادداشت می‌گیرد —
   * «نمی‌دانیم» با «نرفت» یکی نیست (۷٫۶۳). */
  var rAt = '', tabAt = '';
  try { tabAt = String(((st || {}).reports || {}).lastReportAt || ''); } catch (e) {}
  try { rAt = String(((st || {}).monChecks || {}).repAt || ''); } catch (e1b) {}
  out.push({ key: 'monitor', name: 'ناظرِ روزانه',
             what: 'گزارشِ روزانه و ساختِ نسخهٔ کد',
             at: rAt, days: whDays_(rAt, now),
             maxDays: Math.max(1, Number(CFG.WD_MONITOR_DAYS) || 2),
             evidence: 'آخرین _REPORT-YYYYMMDD.json: ' + (rAt || 'هیچ') +
                       ' · تازه‌ترین ردیفِ تبِ گزارش‌ها: ' + (tabAt || 'هیچ'),
             fix: 'روتینِ «نظارت روزانه» در Cowork را باز کنید و ببینید چرا نمی‌دود. ' +
                  '(آخرین گزارشِ روزانه: ' + (rAt || 'هیچ') + '؛ تازه‌ترین ردیفِ تب: ' +
                  (tabAt || 'هیچ') + ' — ردیفِ تب را یافته‌های خودِ موتور هم تازه ' +
                  'می‌کنند، پس زنگ به اولی نگاه می‌کند.)' });

  /* ── ۲) تسکِ غنی‌سازی ── */
  var eAt = '', eEv = null;
  try { eEv = whNewestEnrich_(true); eAt = eEv.at; } catch (e2) {}
  /* ══ دو سؤالِ متفاوت، نه یکی ══
   * «تسک پاسخ نداده» و «موتور نپرسیده» دو چیزند، و از ۱۰ تا ۲۰ سپتامبر
   * همین یکی‌گرفتن هشت روز مقصرِ اشتباه نشان داد: نگهبان می‌گفت روتینِ
   * Cowork را وارسی کنید، در حالی که روتین هر روز می‌دوید و گزارش می‌نوشت —
   * موتور از ۱۰ سپتامبر هیچ **درخواستی** ننوشته بود، چون اجرای ساعتِ ۴ پشتِ
   * قفلِ `syncCatalog` مانده و بی‌صدا تسلیم شده بود.
   *
   * پس اول از موتور می‌پرسیم. و تا وقتی موتور نپرسیده، سکوتِ تسک ایراد
   * نیست: کسی که چیزی برای پاسخ ندارد، بدهکار نیست. */
  var reqAt = '';
  try { reqAt = String(props_().getProperty(PK.ENRICH_REQ_AT) || ''); } catch (e2a) {}
  var reqDays = whDays_(reqAt, now);
  if (CFG.ENRICH_ENABLED !== false) {
    out.push({ key: 'enrichReq', name: 'درخواستِ غنی‌سازی (کارِ موتور)',
               what: 'نوشتنِ _ENRICH-REQ-* پیش از صداگذاری',
               at: reqAt, days: reqDays,
               maxDays: Math.max(1, Number(CFG.ENRICH_REQ_STALE_DAYS) || 2),
               fix: 'اجرای «آماده‌سازیِ متن» (ساعت ' + (CFG.PREPARE_HOUR || 4) +
                    ') نرسیده یا پشتِ قفل مانده — سیاهه را برای «اسکریپت دیگری ' +
                    'در حال اجراست» ببینید. تا موتور نپرسد، غنی‌سازی کاری ندارد.' });
  }

  var eDays = whDays_(eAt, now);
  var taskIdle = isFinite(reqDays) && isFinite(eDays) && reqDays >= eDays;
  out.push({ key: 'enrich', name: 'تسکِ غنی‌سازی',
             what: 'کامل‌کردنِ متنِ قسمت‌ها با جست‌وجوی وب',
             at: eAt, days: eDays,
             // موتور که نپرسیده باشد، سکوتِ تسک بدهی نیست — سقف را برمی‌داریم
             // تا زنگی که برای هیچ می‌زند، زنگی نباشد که کسی جدی‌اش نمی‌گیرد.
             maxDays: taskIdle ? Number.POSITIVE_INFINITY
                               : Math.max(1, Number(CFG.WD_ENRICH_DAYS) || 2),
             /* شهادتِ خودِ شمارش، همیشه — چون ۲۱ سپتامبر همین جمله برای
                تسکی نوشته شد که پنج ساعت قبلش جواب داده بود. */
             /* شهادت **هر دو شاهد**، همیشه — چون تا ۸.۰۶ فقط پیمایشِ پوشه
                گفته می‌شد و همان «۸ روز» را ساخت، در حالی که مهرِ مصرف
                همان روز بود. عددی که کسی را متهم می‌کند، مدرکش را با خودش
                می‌آورد (۷٫۳۲). */
             evidence: eEv ? ((eEv.name || '—') + ' از ' + eEv.seen + ' پاسخِ مصرف‌نشده در ریشه' +
                             (eEv.usedAt ? ' · آخرین مصرف: ' + eEv.usedAt : ' · هیچ مصرفی ثبت نشده') +
                             (eEv.via ? ' · شاهدِ تازه‌تر: ' + eEv.via : '') +
                             (eEv.error ? ' · پیمایش افتاد: ' + eEv.error : '')) : '',
             fix: (taskIdle
               ? 'چیزی برای پاسخ نبوده — ردیفِ «درخواستِ غنی‌سازی» را ببینید.'
               : 'روتینِ «غنی‌سازی اینترنتی پادکست‌ها» در Cowork را وارسی کنید.') +
               (eEv ? ' (پاسخِ مصرف‌نشده: ' + (eEv.name || 'هیچ') +
                      ' — از ' + eEv.seen + ' فایل' +
                      '؛ آخرین مصرفِ ثبت‌شده: ' + (eEv.usedAt || 'هیچ') +
                      (eEv.error ? '؛ پیمایش افتاد: ' + eEv.error : '') + '.)' : '') });

  /* ── ۳) اکشنِ رندر ──
   * این یکی ضربانِ زمانی ندارد، **کارِ انجام‌نشده** دارد: ردیفی که اجازه و
   * نشانی گرفته ولی کلیدش در `docs/renders.json` نیست، یعنی اکشن آن را
   * ندیده یا نتوانسته بسازد. این دقیق‌تر از «چند ساعت است چیزی ننوشته»
   * است — اکشنی که کاری ندارد هم چیزی نمی‌نویسد، و آن ایراد نیست. */
  var rd = null;
  try { rd = whRenderLag_(); } catch (e3) {}
  if (rd) out.push(rd);

  return out;
}

/** چند روز از یک زمانِ فارسی/ISO گذشته؛ نامعلوم یعنی -۱. */
function whDays_(at, now) {
  var t = parseWhen_(String(at || ''));
  if (isNaN(t)) return -1;
  return Math.floor(((now || new Date().getTime()) - t) / 86400000);
}

/**
 * تازه‌ترین پاسخِ غنی‌سازی در ریشهٔ OUTPUT.
 *
 * ══ چرا شهادت می‌دهد، نه فقط عدد (۷٫۳۲) ══
 * ۲۱ سپتامبر این تابع «۱۳ سپتامبر» داد در حالی که `_ENRICH-variety-046.json`
 * همان روز ساعت ۰۴:۳۱ در ریشه نشسته بود. ایمیلِ سلامت بر پایهٔ آن نوشت
 * «تسکِ غنی‌سازی ۸ روز است کاری نکرده — روتینِ Cowork را وارسی کنید»، و
 * سشنِ نظارت هم همان تناقض را دید و به‌جای نگاه کردن به پوشه، **توجیهش
 * کرد** («دو عدد چیزهای متفاوتی می‌شمارند»).
 *
 * این دقیقاً همان شکلی است که بخشِ ۷٫۱۸/۷٫۱۹ دربارهٔ آن نوشته شده: طرفِ
 * اشتباه متهم شد، و هیچ‌کس دو سیگنال را کنارِ هم نگذاشت. علت هنوز پیدا
 * نشده، و حدس زدن جوابش نیست — پس از این به بعد این تابع می‌گوید **چه
 * چیزی دیده و چند تا**. فردا یا نام همان فایلِ تازه در گزارش می‌آید
 * (یعنی گذرا بوده)، یا نامِ فایلِ کهنه کنارِ شمارشی که آن تازه را هم
 * می‌شمارد (یعنی خطا در همین مقایسه است). هر دو جواب‌اند؛ سکوت نیست.
 */
function whNewestEnrich_(detail) {
  var newest = 0, seen = 0, name = '', err = '';
  try {
    var it = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).getFiles();
    while (it.hasNext()) {
      var f = it.next(), n = String(f.getName());
      if (n.indexOf('_ENRICH-') !== 0 || n.indexOf('_ENRICH-REQ-') === 0) continue;
      seen++;
      var t = f.getLastUpdated().getTime();
      if (t > newest) name = n;
      if (t > newest) newest = t;
    }
  } catch (e) {
    /* پیمایشِ پوشه وسطِ کار افتاد. تا امروز این بی‌صدا یک جوابِ **ناقص**
       می‌داد — همان چیزی که «۸ روز است کاری نکرده» را می‌سازد. حالا
       شمارش و خطا با عدد می‌آیند. */
    err = String(e && e.message || e).slice(0, 120);
  }
  var scanAt = newest ? Utilities.formatDate(new Date(newest), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm') : '';

  /* ══ شاهدِ دوم، و آن یکی قوی‌تر است ══
   * پیمایشِ پوشه فقط پاسخ‌هایی را می‌بیند که **هنوز مصرف نشده‌اند**:
   * `trashEnrichFiles_` هر پاسخ را پس از ادغام به سطلِ زباله می‌بَرد. یعنی
   * این تابع در واقع **انبارِ عقب‌افتاده** را می‌سنجید و نامش را «آخرین بار
   * که تسک کار کرد» گذاشته بود. نتیجهٔ مستقیمش این است که **خطِ لوله‌ای که
   * سریع‌تر مصرف می‌کند، خراب‌تر به نظر می‌رسد** — مدرکِ کارِ تسک پیش از
   * آنکه نگهبان ببیندش پاک می‌شود.
   *
   * ۳۰ سپتامبر همین شد و هر دو شاهد در **یک ایمیل** چاپ شدند:
   *   lastAnswerAt: 2026-09-22 05:49   ← پیمایشِ پوشه ⇒ «۸ روز است کاری نکرده»
   *   lastUsedAt:   2026-09-30 08:35   ← قسمتی همان روز با منبعِ بیرونی منتشر شد
   * و دومی تنها وقتی مهر می‌خورد که پاسخِ تسک **رسیده و ادغام شده باشد**.
   * دو شاهد در یک سامانه که هر روز با هم مخالف بودند و کسی کنارِ هم
   * نگذاشتشان — قاعدهٔ ۷٫۵۷، برای سومین بار.
   *
   * `PK.ENRICH_AT` شرطش باریک‌تر است (فقط قسمتی که منبعِ بیرونی داشت)، پس
   * هرگز تاریخی را **دروغ** جلو نمی‌بَرد: اگر مهر خورده باشد، تسک قطعاً
   * جواب داده. برای همین «تازه‌ترین» گرفته می‌شود، نه جایگزین. */
  var usedAt = '';
  try { usedAt = String(props_().getProperty(PK.ENRICH_AT) || ''); } catch (eU) {}
  var at = scanAt, via = scanAt ? 'فایلِ پاسخِ مصرف‌نشده' : '';
  if (usedAt && (!at || usedAt > at)) { at = usedAt; via = 'قسمتی که با منبعِ بیرونی منتشر شد'; }
  if (detail) return { at: at, seen: seen, name: name, error: err,
                       scanAt: scanAt, usedAt: usedAt, via: via };
  /* ══ بی آرگومان، **همان پیمایش** برمی‌گردد و این عمدی است ══
   * `enrichStatus_` از این راه `lastAnswerAt` را می‌سازد، و آن یک واقعیتِ
   * مشخص است: «تازه‌ترین پاسخی که روی دیسک دیده شد». مهرِ انتشار واقعیتِ
   * دیگری است. ۷٫۳۲ همین دو را از هم جدا کرد و سنجه‌اش هنوز سرِ جایش است —
   * برگرداندنِ بزرگ‌ترشان از این راه، آن جدایی را پس می‌گرفت.
   *
   * پس تقسیمِ کار این است: **جمله‌ها** دو عدد را جدا نشان می‌دهند، و
   * **زنگ** (که `watchdogHeartbeats_` با `detail` می‌زند) تازه‌ترینشان را
   * می‌گیرد. یعنی هشدارِ دروغ بسته شد بی آنکه دو حقیقت یکی شوند. */
  return scanAt;
}

/** ردیف‌هایی که اجازه گرفته‌اند ولی اکشن نساخته‌شان. */
function whRenderLag_() {
  var d = null;
  try { d = ytRenderRead_(); } catch (e) { return null; }
  var map = null;
  try { map = ytRenderMap_(); } catch (e2) { map = null; }
  var now = new Date().getTime(), lag = 0, oldest = 0;
  for (var i = 0; i < ((d && d.items) || []).length; i++) {
    var it = d.items[i];
    if (String(it.status || '') !== 'در انتظار') continue;
    if (!it.shared) continue;                       // هنوز اجازه نگرفته؛ نوبتِ اکشن نیست
    if (map && map[it.key] && map[it.key].url) continue;   // ساخته شده
    var t = parseWhen_(String(it.sharedAt || it.at || ''));
    if (isNaN(t)) continue;
    var hrs = (now - t) / 3600000;
    lag++;
    if (hrs > oldest) oldest = hrs;
  }
  if (!lag) return null;
  return { key: 'render', name: 'اکشنِ رندرِ ویدئو',
           what: 'ساختِ MP4 از صوت و کاور',
           at: '', days: Math.floor(oldest / 24), hours: Math.round(oldest), n: lag,
           maxDays: Math.max(1, Number(CFG.WD_RENDER_DAYS) || 1),
           notMade: !map,
           fix: 'صفحهٔ Actions ریپو را باز کنید و متنِ خطای آخرین اجرا را ببینید: ' +
                'github.com/' + CFG.GITHUB_OWNER + '/' + CFG.GITHUB_REPO + '/actions' };
}

/**
 * دیده‌بان: هر کارگرِ خوابیده یک ایرادِ صریح می‌شود، با نام و با چاره.
 *
 * و آنچه **گفته نمی‌شود** هم مهم است: کارگری که سرِ وقت کار کرده هیچ ایرادی
 * نمی‌سازد و فقط یک خطِ یادداشت می‌گیرد. اگر سلامتِ روزانه هر روز سه خط
 * «فلانی سالم است» بنویسد، همان سه خط را آدم دیگر نمی‌خواند.
 */
function watchdog_(st, problems, notes) {
  var hb = [];
  try { hb = watchdogHeartbeats_(st); } catch (e) { return []; }
  var late = [];
  for (var i = 0; i < hb.length; i++) {
    var w = hb[i];
    if (w.key === 'render') {
      if (w.days >= w.maxDays || (w.notMade && w.hours >= 6)) {
        problems.push(HY_ + 'اکشنِ رندرِ ویدئو کار نمی‌کند: ' +
          faDigitsOut_(String(w.n)) + ' قسمت اجازه و نشانی گرفته‌اند ولی ساخته نشده‌اند' +
          (w.hours ? ' (قدیمی‌ترین ' + faDigitsOut_(String(w.hours)) + ' ساعت)' : '') +
          '. ' + w.fix);
        late.push(w.key);
      }
      continue;
    }
    if (w.days < 0) {
      /* هیچ نشانی از کارِ این کارگر نیست. اگر تازه راه افتاده باشد این
         طبیعی است، پس فقط یادداشت — ولی ساکت هم نمی‌مانَد. */
      notes.push(w.name + ': هنوز هیچ نشانی از کارش نیست.');
      continue;
    }
    if (w.days >= w.maxDays) {
      problems.push(HY_ + w.name + ' ' + faDigitsOut_(String(w.days)) +
        ' روز است کاری نکرده (' + w.what + '؛ آخرین بار ' + w.at + '). ' + w.fix);
      late.push(w.key);
    } else {
      notes.push(w.name + ': آخرین بار ' + w.at + '.');
    }
  }
  return late;
}

/** خبرهای صف‌شده، به HTML. */
function mailQueueHtml_(q) {
  if (!q || !q.length) return '';
  var h = ['<h3>خبرهای امروز</h3><ul>'];
  for (var i = 0; i < q.length; i++) {
    h.push('<li><b>' + esc_(q[i].title) + '</b>' +
           (q[i].body ? '<br><span style="color:#555;font-size:13px">' +
                        esc_(q[i].body).replace(/\n/g, '<br>') + '</span>' : '') +
           '<br><span style="color:#999;font-size:11px">' + esc_(q[i].at) + '</span></li>');
  }
  h.push('</ul>');
  return h.join('');
}

/* ═══════════════════════════════════════════════════════════════════
 * بودجه و ردِ پا برای وارسیِ سلامت (۶٫۳۸)
 * ═══════════════════════════════════════════════════════════════════
 *
 * ══ دو روز پیاپی، ۱۰ صبح، هیچ ══
 * `health.checkedAt` دو روز مالِ *دیروز* ماند در حالی که تریگرش سرِ جایش
 * بود و یکی بیشتر هم نبود. یعنی اجرا شروع می‌شد و به آخر نمی‌رسید. و چون
 * مُهر و ایمیل هر دو در انتهای تابع‌اند، هر بار **همه‌چیز** با هم می‌رفت:
 * ایمیلِ روزانه، هشدارِ گیرکردنِ یوتیوب، سطرِ صفِ داوری، دورِ ۱۰ صبحِ انتشار.
 * از بیرون شبیهِ «امروز خبری نبود» به نظر می‌رسید.
 *
 * علتِ محتمل، و صادقانه بگویم: دو سنجهٔ سنگینی که خودم در ۶٫۳۳ و ۶٫۳۴ به
 * همین تابع اضافه کردم — وارسیِ ترتیبِ ۲۶۳ مجموعه و شمارشِ صفِ داوری — هر
 * دو **دو بار** حساب می‌شدند: یک بار درونِ `writeStatus_` (که سرِ همین تابع
 * صدا زده می‌شود) و یک بار در بدنه. اولین روزِ خرابی هم دقیقاً اولین روزی
 * بود که آن دو زنده شدند.
 *
 * ولی «محتمل» کافی نیست، و حدس‌زدن دقیقاً همان کاری است که این ریپو بارها
 * از آن ضربه خورده. پس دو چیز با هم: بودجه (تا کارِ اختیاری، کارِ واجب را
 * نکشد) و ردِ پا (تا دفعهٔ بعد خودش بگوید کجا ایستاد، نه اینکه دوباره حدس
 * بزنیم).
 */
var _healthT0 = 0, _healthStep = '';

function healthStart_() {
  _healthT0 = new Date().getTime();
  _healthStep = 'شروع';
  try { props_().setProperty(PK.HEALTH_STEP, 'شروع @ ' + nowStr_()); } catch (e) {}
}

/** ردِ پا: کجاییم. اگر اجرا کشته شود، همین آخرین مقدار می‌مانَد. */
function healthStep_(name) {
  _healthStep = String(name || '');
  try {
    props_().setProperty(PK.HEALTH_STEP, _healthStep + ' @ ' +
      Math.round((new Date().getTime() - _healthT0) / 1000) + 'ث');
  } catch (e) {}
}

/* ═══════════════════════════════════════════════════════════════════
 * شاهدی برای خودِ وارسیِ سلامت (۷٫۶۳)
 * ═══════════════════════════════════════════════════════════════════
 *
 * ۲۵ سپتامبر، ۱۰:۰۴ دبی: `healthCheck` شروع شد و هرگز به آخر نرسید.
 * `health.lastStep` — همان ردِ پایی که ۶٫۳۸ برای همین روز ساخت — گفت
 * «شروع @ 2026-09-25 10:04» و بس، و `health.checkedAt` مالِ دیروز ماند.
 * پس ایمیلِ عملیاتیِ روز نرفت، و با آن **همهٔ** درهای دومی که نسخه‌های
 * ۷٫۲۷ تا ۷٫۵۷ عمداً روی همین تابع گذاشته‌اند: `embGates_`،
 * `vbrQueueShare_`، `vbrQueueEnsure_`، `ttsCueSwitch_`،
 * `styleProbeUnshare_`، `selfVerifySweep_` و گزارشِ `nightDeath_`.
 *
 * ۶٫۳۸ شاهد را ساخت و **زنگ را نساخت**: `lastStep` در `_STATUS.json`
 * می‌نشیند و تا کسی آن فایل را باز نکند، هیچ‌کس خبردار نمی‌شود. این
 * چندمین بارِ همان شکل در این مخزن است — تحلیل نوشته شد و به تصمیم وصل
 * نشد.
 *
 * دو مرزِ ناگزیر:
 *
 * ۱) **کانال نمی‌تواند `mailQueue_` باشد.** صفِ خبرها را همان تابعی خالی
 *    می‌کند که مُرده است، پس خبرِ «گزارش نرفت» در همان صف می‌مانَد و
 *    هرگز نمی‌رسد. این دقیقاً کلاسِ «فوری» است که این پرونده تعریف کرده:
 *    چیزی که تا ۱۰ صبح نمی‌تواند صبر کند، چون ۱۰ صبح خودش خراب است.
 *
 * ۲) **پرسنده باید کارِ شبانه باشد، نه خودِ سلامت.** ۷٫۴۴ برای شبانه
 *    همین را ساخت (`nightDeath_`) و از `healthCheck` پرسیدش. قرینه‌اش
 *    جا مانده بود. حالا هر یک شاهدِ دیگری است و هیچ‌کدام شاهدِ خودش
 *    نیست — شاهدی که با خودِ حادثه بمیرد شاهد نیست.
 */
function healthDayDiff_(stamp) {
  var d = String(stamp || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;     // مهری که خوانده نشود «کهنه» نیست
  var then = new Date(d + 'T00:00:00Z').getTime();
  var today = String(nightDay_());
  var now = new Date(today + 'T00:00:00Z').getTime();
  if (isNaN(then) || isNaN(now)) return null;
  return Math.round((now - then) / 86400000);
}

/**
 * آیا گزارشِ روزانه رفته است؟
 *
 * «نرفته» و «نمی‌دانیم» دو چیزِ جدا هستند و هر دو گزارش می‌شوند، ولی فقط
 * یکی زنگ می‌زند: مهری که هرگز نوشته نشده می‌تواند موتورِ تازه‌نصب باشد.
 */
function healthStale_(healthOpt) {
  var out = { stale: false, days: null, checkedAt: '', step: '', ok: true, line: '' };
  try {
    /* ══ چرا آرگومان، و چرا این یک باگِ واقعی بود ══
       نخستین شکلش بی‌آرگومان بود و خودش `readExistingHealth_()` را صدا
       می‌زد — یعنی در هر فراخوانِ `writeStatus_` یک خواندنِ **دومِ**
       `_STATUS.json` (۱۲۶ کیلوبایت) از درایو و یک `JSON.parse` دیگر. و
       `writeStatus_` سرِ خودِ `healthCheck` صدا زده می‌شود: یعنی من داشتم
       هزینه‌ای به همان تابعی اضافه می‌کردم که امروز سرِ همین هزینه مُرد.
       ادعای بیانیه هم («بی هیچ خواندنِ تازه‌ای») با کد نمی‌خواند — و
       ادعای ایمنیِ کمی‌نادرست از ادعای نبوده بدتر است (۷٫۲۴). */
    var h = (healthOpt && typeof healthOpt === 'object')
              ? healthOpt : (readExistingHealth_() || {});
    out.checkedAt = String(h.checkedAt || '');
    out.step = String(h.lastStep || '');
    out.days = healthDayDiff_(out.checkedAt);
    var need = Math.max(2, Number(CFG.HEALTH_STALE_DAYS) || 2);
    if (out.days !== null && out.days >= need) {
      out.stale = true;
      out.ok = false;
      out.line = 'گزارشِ روزانه: ' + out.days + ' روز است نرفته — آخرین وارسیِ ' +
                 'کامل ' + out.checkedAt +
                 (out.step ? ' · آخرین جایی که رسید: «' + out.step + '»' : '') +
                 '. یعنی ایمیلِ ۱۰ صبح و هر کاری که به آن بسته است انجام نشده.';
    } else if (out.days === null) {
      out.line = 'گزارشِ روزانه: هنوز یک وارسیِ کاملِ ثبت‌شده ندارد.';
    } else {
      out.line = 'گزارشِ روزانه: آخرین وارسیِ کامل ' + out.checkedAt + '.';
    }
  } catch (e) {
    out.line = 'وضعیتِ گزارشِ روزانه خوانده نشد: ' + e.message;
  }
  return out;
}

/**
 * زنگش — از کارِ شبانه، فوری، و یک بار در هر روز.
 *
 * «یک بار در روز» نه برای کم کردنِ سروصدا: تا وقتی خراب است هر شب خبر
 * می‌رود، چون این تنها کانالِ باقی‌مانده است. مُهرِ روز فقط جلوی دو خبر
 * در یک شب را می‌گیرد (شبی که کد نصب می‌شود دو بار اجرا می‌شود).
 */
function healthDeadCheck_(hub) {
  var st = healthStale_();
  if (!st.stale) return st;
  try {
    var today = String(nightDay_());
    if (String(props_().getProperty(PK.HEALTH_DEAD_AT) || '') === today) {
      return st;                                       // امشب خبرش رفته
    }
  } catch (eP) {}
  var lines = ['⚠️ <b>گزارشِ روزانهٔ موتور نرفت</b>',
               st.line,
               'این خبر از کارِ شبانه می‌آید، نه از خودِ وارسیِ سلامت — چون ' +
               'همان چیزی است که کار نکرده.',
               '🕒 ' + nowStr_()];
  try { if (tgEnabled_()) tgSend_(lines.join('\n').replace(/<\/?b>/g, '*')); } catch (eT) {}
  try {
    MailApp.sendEmail({ to: CFG.EMAIL_TO,
      subject: 'موتور محتوا — گزارشِ روزانه ' + st.days + ' روز است نرفته',
      htmlBody: '<div dir="rtl" style="font-family:Tahoma">' +
                lines.join('<br>') + '</div>' });
  } catch (eM) {}
  try {
    logSelfFinding_(hub || getHub_(), {
      priority: 'جدی', category: 'کد موتور', key: 'health-silent',
      title: 'وارسیِ سلامت ' + st.days + ' روز است به آخر نمی‌رسد',
      detail: st.line + ' هر دری که نسخه‌های ۷٫۲۷ تا ۷٫۵۷ روی `healthCheck` ' +
              'گذاشته‌اند در این روزها بسته بوده: اشتراک و نوشتنِ صفِ پل، ' +
              'تعویضِ مدلِ لحن، زنگِ اثر انگشت، سنجشِ ردیف‌های بسته.',
      instruction: '`health.lastStep` در `_STATUS.json` می‌گوید کجا ایستاد. ' +
                   'اگر روی «شروع» مانده، مرگ در `getHub_()` یا ' +
                   '`writeStatus_` است (هابِ ۲۹ مگابایتی، درسِ ۷٫۶۰) — ' +
                   'یعنی کارِ اختیاری دارد کارِ واجب را می‌کشد و باید از ' +
                   'مسیرِ ۱۰ صبح بیرون بیاید، نه اینکه بودجه بزرگ‌تر شود. ' +
                   'سقفِ شش‌دقیقه‌ایِ اپس‌اسکریپت را نمی‌شود گرفت.',
      owner: ROWNER_CODE
    });
  } catch (eF) {}
  try { props_().setProperty(PK.HEALTH_DEAD_AT, String(nightDay_())); } catch (eS) {}
  return st;
}

function healthLeft_() {
  if (!_healthT0) healthStart_();
  var budget = Math.max(60000, Number(CFG.HEALTH_BUDGET_MS) || 280000);
  return budget - (new Date().getTime() - _healthT0);
}

/**
 * آیا برای کارِ اختیاری وقت هست؟ نبودش **گفته می‌شود**، نه در سکوت.
 * سطرِ روزانه‌ای که بی‌صدا جا بیفتد، از نبودنش بدتر است: خواننده فکر می‌کند
 * آن زیرسامانه ساکت و سالم است.
 */
function healthHas_(needMs, what, skipped) {
  if (healthLeft_() >= needMs) { healthStep_(what); return true; }
  if (skipped) skipped.push(what);
  return false;
}


/**
 * ══ کارنامهٔ قابلیت‌ها — «روشن است» با «کار می‌کند» یکی نیست ══
 *
 * صاحبِ برنامه: «حتی ممکن خیلی گزینه‌های که اضافه کردی استفاده نکنم تا
 * مدت‌ها، ولی ناظر باید به عملکردش توجه کنه … ببینه همه سیم‌کشی‌ها و
 * گزینه‌ها و قابلیت‌ها درست کار می‌کنه یا نه … و اصلاحات رو هم پیگیری کنه.»
 * و بعد، صریح‌تر: «فقط حرفم برای این ویدیو و .. نبود بلکه همه موارد توی
 * پروژه.»
 *
 * **این تابع هیچ خواندنِ تازه‌ای ندارد.** `st` همان چیزی است که
 * `writeStatus_` ساخته و همه‌جا مصرف می‌شود؛ گذاشتنِ خواندنِ تازه این‌جا
 * دقیقاً همان کاری بود که ۷٫۶۳ و ۷٫۷۲ ثبتش کرده‌اند — هزینه روی تابعی که
 * تازه از هزینه مرده بود.
 *
 * چهار داوری، و مرزها عمدی‌اند:
 *   • «خاموش (تصمیم)» — کلیدش پایین است. **ایراد نیست** و `ok` را پایین
 *     نمی‌آورد. هشداری که برای تصمیمِ خودِ صاحبِ برنامه بزند، هشداری است که
 *     یاد می‌گیرند نخوانند.
 *   • «کار می‌کند» — شاهدِ تازه دارد.
 *   • «روشن ولی بی‌اثر» — تنها حالتی که ایراد است.
 *   • «نامعلوم» — شاهدی نیست. **به‌عنوان شکافِ پوشش شمرده می‌شود، نه ایراد**
 *     (۷٫۵۷): نبودِ سنجه با بودنِ عیب یکی نیست، و اگر یکی گرفته شوند یک
 *     شاهدِ خراب همهٔ جدول را بی‌اعتبار می‌کند.
 *
 * و ردیفی که **سیم‌کشی‌اش** غلط است — کلیدی در `CFG` که وجود ندارد، یا
 * شاهدی در `_STATUS.json` که وجود ندارد — **به نام** گزارش می‌شود. این همان
 * چیزی است که در نگارشِ اولِ همین جدول پیش آمد: `EMB_ENABLED` نوشته بودم و
 * کلیدِ واقعی `EMB_ON` است؛ بی این وارسی، آن قابلیت **برای همیشه «خاموش»**
 * گزارش می‌شد و هیچ‌جا صدا درنمی‌آمد. یعنی خودِ جدول همان عیبی را می‌گرفت که
 * برای گرفتنش ساخته شده — به شرطِ اینکه سیم‌کشیِ خودش هم سنجیده شود.
 */
function capNewest_(o, depth) {
  /* تازه‌ترین تاریخِ `yyyy-MM-dd HH:mm` (یا فقط `yyyy-MM-dd`) هرجا در این
     شیء. عمداً عمومی است و نه یک استخراج‌گر به‌ازای هر قابلیت: فهرستِ
     دستیِ سی‌تایی همان `removeTriggers` است که یک سال کهنه ماند — قابلیتِ
     تازه این‌طور مفت پوشش می‌گیرد، و قابلیتی که تاریخ ندارد **می‌گوید**
     ندارد، نه اینکه عددی از خودش دربیاورد. */
  var best = '';
  /* **دو قالبِ تاریخ در این مخزن هست، نه یکی**: `nowStr_` می‌دهد
     `yyyy-MM-dd HH:mm` و چند جا (`speakRevLog_`، `recapLog_`، …) مستقیم
     `toISOString()` می‌نویسند که با `T` جدا می‌کند. نگارشِ اولِ این تابع فقط
     اولی را می‌شناخت، پس شاهدِ آن قابلیت‌ها را **نمی‌دید** و آن‌ها برای همیشه
     «نامعلوم» گزارش می‌شدند — عیبی که از بیرون شبیهِ «آن قابلیت کار نمی‌کند»
     است. تاریخِ بی‌ساعت هم پذیرفته می‌شود (`speakSkipRecord_`).

     یکسان‌سازی با **جانشینیِ `T` با فاصله** انجام می‌شود، نه با یک شاخهٔ
     `[ T]` در الگو — و این انتخاب است نه سلیقه: مقایسهٔ «تازه‌ترین» رشته‌ای
     است، و `'T' > ' '` در اسکی، پس با دو قالبِ درهم یک تاریخِ ISOِ قدیمی‌تر
     از یک تاریخِ تازهٔ فاصله‌دار بزرگ‌تر درمی‌آمد. نگارشِ اول **هر دو** را
     داشت، و شاخهٔ الگو کدِ مرده بود: شکستنش هیچ سنجه‌ای را سرخ نکرد. */
  var RE = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/;
  var walk = function (v, d) {
    if (d > 4 || v == null) return;
    if (typeof v === 'string') {
      var s = (v.length > 16 ? v.slice(0, 16) : v).replace('T', ' ');
      if (RE.test(s) && s > best) best = s;
      return;
    }
    if (typeof v !== 'object') return;
    if (v instanceof Array) {
      for (var i = 0; i < v.length && i < 40; i++) walk(v[i], d + 1);
      return;
    }
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      walk(v[k], d + 1);
    }
  };
  walk(o, depth || 0);
  return best;
}

function capStatus_(st) {
  var out = { n: 0, working: 0, off: 0, idle: [], unknown: [], wiring: [],
              rows: [], ok: true, line: '' };
  var list = (CFG.CAPABILITIES || []);
  var idleDays = Math.max(1, Number(CFG.CAP_IDLE_DAYS) || 7);
  var fresh = Math.max(0, Number(CFG.CAP_FRESH_DAYS) || 2);
  var today = new Date();

  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    var row = { key: c.key, name: c.name, on: true, did: '', days: -1, verdict: '', why: '' };
    out.n++;

    /* ۱) کلید. نبودنش در `CFG` یک عیبِ سیم‌کشی است، نه «خاموش». */
    if (c.sw) {
      if (!Object.prototype.hasOwnProperty.call(CFG, c.sw)) {
        row.verdict = 'سیم‌کشی';
        row.why = 'کلیدِ ' + c.sw + ' در CFG نیست';
        out.wiring.push(c.key + ' — ' + row.why);
        out.rows.push(row); continue;
      }
      row.on = !!CFG[c.sw];
    }

    /* ۲) شاهد. نبودِ کلید در `_STATUS.json` هم عیبِ سیم‌کشی است — و با
       «شاهد خوانده نشد» (که `null` است) یکی نیست. */
    var has = !!st && Object.prototype.hasOwnProperty.call(st, c.at);
    if (!has) {
      row.verdict = 'سیم‌کشی';
      row.why = 'شاهدِ ' + c.at + ' در _STATUS.json نیست';
      out.wiring.push(c.key + ' — ' + row.why);
      out.rows.push(row); continue;
    }
    var ev = st[c.at];

    if (!row.on) {
      row.verdict = 'خاموش (تصمیم)';
      out.off++;
      out.rows.push(row); continue;
    }

    if (ev === null || ev === undefined) {
      row.verdict = 'نامعلوم'; row.why = 'شاهد خوانده نشد';
      out.unknown.push(c.key + ' — ' + row.why);
      out.rows.push(row); continue;
    }

    row.did = capNewest_(ev);
    /* ══ درِ دوم: کارنامهٔ خودِ زیرسامانه در Script Properties ══
     * چند تابعِ وضعیت تاریخ را **دارند ولی بیرون نمی‌دهند** (`speakRevLog_`،
     * `recapLog_`، واسنجیِ گفتار، پوششِ اعراب). عوض کردنِ هفت تابع در هفت
     * بخش یعنی هفت مجموعهٔ آزمونِ دیگر در معرضِ خطر، برای عددی که همان‌جا
     * کنارِ دست است. `pk` همان کارنامه را می‌خوانَد.
     *
     * هزینه‌اش یک `getProperty` است، نه خواندنِ هابِ ۲۹ مگابایتی — و فقط
     * وقتی شاهدِ اصلی تاریخ نداشت (۷٫۶۳/۷٫۷۲: هزینه روی مسیری که کسی
     * رویش ایستاده، فقط وقتی لازم است). */
    if (!row.did && c.pk && PK[c.pk]) {
      try {
        var raw = props_().getProperty(PK[c.pk]);
        if (raw) row.did = capNewest_(JSON.parse(raw));
      } catch (ePk) {}
    }
    if (!row.did) {
      row.verdict = 'نامعلوم'; row.why = 'هیچ تاریخی در شاهد نیست';
      out.unknown.push(c.key + ' — ' + row.why);
      out.rows.push(row); continue;
    }
    row.days = Math.floor((today.getTime() - new Date(row.did.replace(' ', 'T') + ':00').getTime())
                          / 86400000);
    if (!(row.days >= 0)) row.days = 0;

    /* ══ «کاری نرسیده» با «کار نمی‌کند» یکی نیست (۸.۳۵) ══
       قابلیتی که فقط سرِ نوبت کار می‌کند (مرورِ مجموعه: یک بار در عمرِ هر
       مجموعه) تا وقتی چیزی در صفش نیست، طبیعی است که اثری ندارد. تا ۸.۳۴ همان
       آستانهٔ هفت‌روزه رویش می‌خورد و هر روز «بی‌اثر» می‌شد — هشداری برای
       حالتِ سالم، که صاحبِ برنامه درست نتیجه گرفت «خراب است». `due` نامِ فیلدی
       در شاهد است که می‌گوید چند کار رسیده؛ صفر ⇒ «کاری نرسیده»، شمرده‌شده
       جزوِ سالم‌ها. کاری رسیده و نشده ⇒ همان «بی‌اثر» و یافته. */
    if (c.due && ev && typeof ev === 'object' && Number(ev[c.due]) === 0) {
      row.verdict = 'کاری نرسیده'; row.why = 'هیچ کاری در صف نیست (آخرین اثر: ' + row.did + ')';
      out.working++;
      out.rows.push(row); continue;
    }
    /* موتورِ تازه‌نصب «بی‌اثر» نیست — ۷٫۶۳: «نمی‌دانیم» با «نرفت» یکی نیست. */
    if (row.days > idleDays && row.days > fresh) {
      row.verdict = 'روشن ولی بی‌اثر';
      row.why = row.days + ' روز است اثری ندارد';
      out.idle.push(c.key + ' — ' + row.why);
      out.ok = false;
    } else {
      row.verdict = 'کار می‌کند'; out.working++;
    }
    out.rows.push(row);
  }

  /* خط **هر روز** می‌آید، حتی وقتی همه‌چیز سالم است: سکوت را نمی‌شود از
     مرگِ سامانه تشخیص داد (۵٫۹۰/۷٫۲۱). */
  var L = 'کارنامهٔ قابلیت‌ها: ' + out.working + ' از ' + out.n + ' کار می‌کنند';
  if (out.off) L += ' · ' + out.off + ' خاموش (تصمیمِ شما)';
  if (out.idle.length) L += ' · ⚠ ' + out.idle.length + ' روشن ولی بی‌اثر: ' + out.idle.join('؛ ');
  /* «نامعلوم» **نام‌برده** می‌شود، نه فقط شمرده — همان تفاوتی که ۸.۰۴ برای
     واژه‌های بی‌اعراب پیدا کرد: تا وقتی فقط عدد را می‌دانیم، هیچ‌کس نمی‌تواند
     دنبالش برود. و `ok` را پایین نمی‌آورد، چون نبودِ سنجه با بودنِ عیب یکی
     نیست (۷٫۵۷) — قضاوتش کارِ ناظر است که زمینه را می‌داند: قابلیتی که
     هفته‌هاست موتور روشن است و هنوز شاهدی ندارد، خودش یافته است. */
  if (out.unknown.length) {
    var nm = [];
    for (var u = 0; u < out.rows.length && nm.length < 8; u++) {
      if (out.rows[u].verdict === 'نامعلوم') nm.push(out.rows[u].name);
    }
    L += ' · ' + out.unknown.length + ' نامعلوم (شاهدی ندارند): ' + nm.join('، ') +
         (out.unknown.length > nm.length ? ' و ' + (out.unknown.length - nm.length) + ' تای دیگر' : '');
  }
  if (out.wiring.length) {
    L += ' · ❌ ' + out.wiring.length + ' سیم‌کشیِ خرابِ خودِ کارنامه: ' + out.wiring.join('؛ ');
    out.ok = false;
  }
  out.line = L + '.';
  return out;
}

/**
 * یافته‌ای به‌ازای **هر** قابلیتِ بی‌اثر، نه یکی برای همه: یک ردیفِ «چند
 * قابلیت بی‌اثرند» فردا با یک ردیفِ دیگر عوض می‌شود و تکرار دیده نمی‌شود،
 * در حالی که این پرونده می‌گوید یافته روی موضوعِ خودش کلید بخورد تا تکرار،
 * تکرار دیده شود.
 */
function capFindings_(hub, cap) {
  if (!cap || !cap.rows) return 0;
  var n = 0;
  for (var i = 0; i < cap.rows.length; i++) {
    var r = cap.rows[i];
    if (r.verdict !== 'روشن ولی بی‌اثر' && r.verdict !== 'سیم‌کشی') continue;
    try {
      logSelfFinding_(hub, {
        priority: r.verdict === 'سیم‌کشی' ? 'جدی' : 'متوسط',
        category: 'کد',
        /* `owner` است که مسیر را تعیین می‌کند، نه `category`: `reportRow_`
           هر مسئولی که واژهٔ «کد» داشته باشد را به صفِ `NEEDS_CODE`
           می‌فرستد. نگارشِ اول فقط `category` داشت و ردیف با «موتور / تازه»
           می‌نشست — یعنی بیرونِ همان صفی که نسخهٔ بعدیِ کد از آن ساخته
           می‌شود، که کلِ هدفِ این یافته است. */
        owner: ROWNER_CODE,
        key: (r.verdict === 'سیم‌کشی' ? 'cap-wiring-' : 'capability-idle-') + r.key,
        title: r.verdict === 'سیم‌کشی'
          ? ('کارنامهٔ قابلیت‌ها برای «' + r.name + '» سیم‌کشی ندارد')
          : ('«' + r.name + '» روشن است ولی کاری نمی‌کند'),
        detail: r.verdict === 'سیم‌کشی'
          ? (r.why + '. تا این درست نشود، این قابلیت هر روز بی‌صدا «خاموش» گزارش می‌شود — ' +
             'بدترین شکلِ خرابی در این پرونده: نامی درست، جایی درست، و هیچ سنجشی.')
          : (r.why + ' (آخرین شاهد: ' + (r.did || 'هیچ') + '). کلیدش پایین نیست، ' +
             'یعنی این خاموشیِ خواسته‌شده نیست.'),
        instruction: r.verdict === 'سیم‌کشی'
          ? ('ردیفِ `' + r.key + '` در `CFG.CAPABILITIES` را درست کن — نامِ کلیدِ `sw` یا ' +
             'نامِ شاهدِ `at` با واقعیت نمی‌خوانَد. این عیب در نگارشِ اولِ خودِ این جدول ' +
             'واقعاً افتاد (`EMB_ENABLED` نوشته شده بود و کلیدِ واقعی `EMB_ON` است).')
          : ('علتش را پیدا کن، نه اینکه دوباره ثبتش کنی: قابلیت روشن است و کاری نمی‌کند. ' +
             'شاهدش `_STATUS.json` ⇒ `' + r.key + '` است؛ اول ببین آن شاهد چرا تاریخِ تازه ' +
             'ندارد — کارِ شبانه به بلوکش نمی‌رسد (`nightHas_`)، یا گیتِ ورودش هیچ‌وقت ' +
             'صادق نمی‌شود (۷٫۶۲)، یا واقعاً چیزی برایش نیست. اگر خاموشی خواستهٔ صاحبِ ' +
             'برنامه است، کلیدش را پایین بیاور تا «تصمیم» شمرده شود، نه ایراد.')
      });
      n++;
    } catch (e) {}
  }
  return n;
}

function healthCheck() {
  /* شاهدِ اجرا (۸.۱۱): مهر **پیش از** کار، تا از کشته‌شدنِ اجرا جان
     به در ببرد — ۷.۴۴، این بار برای همهٔ تریگرها نه فقط شبانه.
     `finally` پایانِ تمیز را تضمین می‌کند؛ کشته‌شدنِ سرِ شش دقیقه را
     نه — و دقیقاً همان حالتی است که این شاهد برایش ساخته شده. */
  runEnter_('healthCheck');
  try {
  healthStart_();
  var hub = getHub_();
  var problems = [], notes = [], skipped = [];
  var now = new Date().getTime();

  // نوشتنِ فایل وضعیت نباید بتواند خودِ وارسی را بکشد. اگر درایو یک لحظه
  // در دسترس نباشد، مهم‌ترین کارِ این تابع — فرستادنِ هشدار — باید انجام شود.
  var st;
  try {
    st = writeStatus_(hub, 'وارسی سلامت');
  } catch (eSt) {
    problems.push('فایل وضعیت نوشته نشد: ' + eSt.message +
                  ' (وارسی با اطلاعات موجود ادامه یافت)');
    st = { sync: { feeds: [] }, bank: { eligibleTotal: 0 }, recentLog: [],
           lastEpisode: null, pendingEpisode: null, hubUrl: '',
           sourceErrors: { total: 0, last24h: 0, last7d: 0, byType: {}, recent: [] },
           chunks: { rows: 0, files: 0 } };
    try { st.lastEpisode = lastEpisode_(hub); } catch (e2) {}
    try { st.recentLog = recentLog_(hub, 25); } catch (e3) {}
    try { st.sourceErrors = srcErrorSummary_(hub, 20); } catch (e4) {}
  }

  // ۰) پشتیبانِ شیت‌ها — سکوت در این مورد از همه خطرناک‌تر است
  try {
    var bkS = st.backup || backupStatus_();
    if (bkS && bkS.enabled) {
      if (!bkS.lastAt) {
        // فقط وقتی هشدار می‌دهیم که زمان‌بندی نصب شده باشد و یک شبانه‌روز از
        // نصبش گذشته باشد؛ وگرنه دقیقهٔ اولِ نصب هم هشدار می‌آمد.
        var since = String(props_().getProperty(PK.BACKUP_SINCE) || '');
        var sinceH = since ? (now - parseWhen_(since)) / 3600000 : -1;
        if (since && isFinite(sinceH) && sinceH > 30) {
          problems.push('زمان‌بندیِ پشتیبان از ' + since +
                        ' فعال است ولی هنوز هیچ پشتیبانی گرفته نشده.');
        }
      } else if (bkS.ageHours !== null && bkS.ageHours > 26) {
        // هشدار به‌تنهایی کافی نیست؛ دورِ جبرانی همین‌جا زمان‌بندی می‌شود.
        var kicked = false;
        try { kicked = nudgeBackup_(); } catch (eNb) {}
        problems.push('آخرین پشتیبانِ شیت‌ها ' + bkS.ageHours + ' ساعت پیش گرفته شده' +
                      (kicked ? ' — یک دورِ جبرانی زمان‌بندی شد.' : '.'));
      } else {
        notes.push('پشتیبانِ شیت‌ها: ' + bkS.lastAt + ' · ' + bkS.copies + ' نسخه');
      }
      if (bkS.pending) {
        notes.push('پشتیبان‌گیری نیمه‌تمام است و خودش ادامه می‌دهد.');
      }
      if (bkS.empty) {
        problems.push(bkS.empty + ' پوشهٔ پشتیبانِ خالی در فولدر پشتیبان هست ' +
                      '(رونوشتی در آن‌ها گرفته نشده).');
      }
    }
  } catch (eBk) {}

  /* ۰٫۴) زمان‌بندیِ گم‌شده یا تکراری.
   * تا ۵٫۹۴ «حذف زمان‌بندی» فهرستِ دستیِ ده‌تایی داشت و سه نام را جا
   * می‌گذاشت؛ و چون «نصب زمان‌بندی» اول همان را صدا می‌زند و بعد همه را
   * می‌سازد، هر فشردنِ آن گزینه یک `selfUpdateDaily` و یک `prepareEpisode`
   * اضافه می‌کرد. دو کارِ شبانهٔ هم‌زمان روی یک پروژه هیچ خطایی نمی‌دهد —
   * فقط دو برابر کار می‌کند و گاهی همدیگر را قطع.
   *
   * ۵٫۹۵ علتش را برد، ولی پروژه‌ای که همین حالا تریگرِ تکراری دارد با
   * نصبِ کدِ تازه خودبه‌خود تمیز نمی‌شود. پس دیده‌شدنش لازم است. */
  try {
    var tn = st.triggerNames || trigNames_();
    if (tn && tn.dups && tn.dups.length) {
      problems.push('زمان‌بندیِ تکراری هست: ' + tn.dups.join(' · ') +
                    ' — یک بار «حذف زمان‌بندی» و بعد «۲) نصب زمان‌بندی خودکار» ' +
                    'را بزنید تا از هرکدام یکی بماند.');
    }
    if (tn && tn.missing && tn.missing.length) {
      problems.push('این زمان‌بندی‌ها نصب نیستند: ' + tn.missing.join(' · ') +
                    ' — یعنی آن کارها اصلاً اجرا نمی‌شوند. «۲) نصب زمان‌بندی خودکار» را بزنید.');
    }
  } catch (eTg) {}

  // ۰٫۵) چیدمانِ پوشهٔ OUTPUT — شلوغیِ ریشه خودش یک ایراد است
  try {
    var lay = st.outLayout || outLayoutCheck_();
    if (lay && !lay.error) {
      if (lay.strays && lay.strays.length) {
        var names = [];
        for (var sI = 0; sI < lay.strays.length && sI < 6; sI++) {
          names.push(lay.strays[sI].kind + ' «' + lay.strays[sI].name + '»');
        }
        problems.push('در ریشهٔ پوشهٔ OUTPUT ' + lay.strays.length +
                      ' چیزِ ناشناخته هست: ' + names.join(' · ') +
                      (lay.strays.length > names.length ? ' …' : '') +
                      ' — جایش زیرپوشه است یا باید در نقشهٔ پوشه («' +
                      CFG.OUT_README + '») ثبت شود.');
      }
      if (lay.stale && lay.stale.length) {
        problems.push('‏' + lay.stale.length + ' گزارشِ خوانده‌شده هنوز در ریشه مانده ' +
                      '— بایگانی‌اش نگرفته است.');
      }
      // هم‌نامِ تکراری از فایلِ سرگردان خطرناک‌تر است: نامش شناخته است، پس
      // هیچ هشداری نمی‌گرفت، و خواننده بی‌خبر نسخهٔ کهنه را می‌خواند.
      // نسخهٔ کهنهٔ پرامپت که هنوز در ریشه است. خودش خطرِ خواندنِ اشتباه
      // است، و نشانهٔ اینکه هرسِ شبانه اجرا نشده — که خودش ایرادِ بزرگ‌تری است.
      if (lay.oldPrompts && lay.oldPrompts.length) {
        problems.push('‏' + lay.oldPrompts.length + ' نسخهٔ کهنهٔ پرامپت هنوز در ریشهٔ ' +
                      'OUTPUT است (' + lay.oldPrompts.slice(0, 5).join(' · ') + ') — ' +
                      'جایش «' + (CFG.PROMPT_ARCHIVE_FOLDER || 'بایگانی — پرامپت‌های پیشین') +
                      '» است. یعنی هرسِ شبانه (promptPrune_) اجرا نشده؛ دنبالِ ' +
                      'همان بگرد، نه دنبالِ خودِ فایل‌ها.');
      }
      if (lay.dups && lay.dups.length) {
        /* ══ شمارشِ دوباره سرِ گزارش، چون عکسِ بالای اجرا کهنه است (۷٫۸۸) ══
           `lay` از `writeStatus_` می‌آید که سرِ همین `healthCheck` دویده، و
           موتور در فاصلهٔ همان اجرا هم‌نام‌ها را یکی می‌کند: `putOutJson_`
           هنگام نوشتن بقیه را به سطلِ زباله می‌بَرد و `_MUSIC-FEED.json` در
           دو جا ادغام می‌شود. پس نامهٔ ۲۹ سپتامبر «۲ نسخه» گفت در حالی که
           روی دیسک **یکی** بود — هشداری برای حالتی که همان اجرا درستش کرده
           بود، و این پرونده می‌گوید هشداری که برای حالتِ سالم بزند خوانده
           نمی‌شود.

           هزینه‌اش در روزِ سالم صفر است: این حلقه فقط وقتی می‌دود که عکسِ
           کهنه چیزی دیده باشد، و نامِ تکراری استثناست نه قاعده — پس بار روی
           تابعی که از هزینه مُرد اضافه نمی‌شود (۷٫۶۳/۷٫۷۲). */
        var dn = [];
        for (var dI = 0; dI < lay.dups.length && dI < 6; dI++) {
          var dnm = String(lay.dups[dI].name || '');
          if (!dnm) continue;
          /* شمارش در همین بخش انجام می‌شود، نه با `outFilesByName_` که در
             بخشِ ۱۹ است: وابستگیِ رو به جلو (۸ → ۱۹) در فایلِ ساخته‌شده
             پنهان می‌مانَد و در بارگذارهای جزئیِ `tests/` ReferenceError
             می‌دهد. و اگر خواندن نشد، عددِ عکسِ کهنه می‌مانَد — افت به سمتِ
             کامل بودن، نه سکوت. */
          var dNow = Number(lay.dups[dI].count) || 0;
          try {
            var itD = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).getFilesByName(dnm);
            var dC = 0;
            while (itD.hasNext()) { itD.next(); dC++; }
            dNow = dC;
          } catch (eDp) {}
          if (dNow > 1) dn.push('«' + dnm + '» (' + faDigitsOut_(String(dNow)) + ' نسخه)');
        }
        if (dn.length) {
          problems.push('در ریشهٔ OUTPUT فایلِ هم‌نامِ تکراری هست: ' + dn.join(' · ') +
                        ' — خواندن از راهِ `getOutJson_` تازه‌ترین را برمی‌دارد و ' +
                        'همان را در سیاهه می‌نویسد، ولی هر خواندنِ خامِ ' +
                        '`getFilesByName` می‌تواند کهنه را بردارد.');
        }
      }
      if (lay.openFolders && lay.openFolders.length) {
        problems.push('این پوشه‌ها در OUTPUT خودشان «هرکس با لینک» هستند: «' +
                      lay.openFolders.slice(0, 6).join('» · «') + '» — یعنی هر ' +
                      'فایلی که در آن‌ها نوشته شود عمومی است، و چون اجازه از ' +
                      'پوشه به ارث می‌رسد، موتور نمی‌تواند اشتراکِ تک‌تکِ فایل‌ها ' +
                      'را پس بگیرد. اگر عمدی نیست، از درایو ببندیدشان.');
      }
      if (!lay.readme) {
        notes.push('نقشهٔ پوشهٔ OUTPUT («' + CFG.OUT_README + '») هنوز نوشته نشده.');
      }
    }
  } catch (eLay) {}

  // ۰٫۶) سنجهٔ محتوا — اگر عکس‌ها انباشته شوند یعنی داوری اصلاً اجرا نمی‌شود
  try {
    var ca = st.contentAudit || auditStatus_();
    if (ca && ca.enabled) {
      if (ca.pending > 6) {
        problems.push('‏' + ca.pending + ' عکسِ محتوا داوری نشده مانده — یعنی سنجهٔ ' +
                      'محتوا اجرا نمی‌شود و مقایسهٔ متنِ نهایی با متنِ خام متوقف است.');
      }
      for (var ci = 0; ci < (ca.items || []).length; ci++) {
        var cx = ca.items[ci];
        if (!cx) continue;
        if (cx.broken) {
          problems.push('سنجهٔ محتوا در «' + (cx.showName || cx.show) + '» قسمت ' +
                        cx.episode + ': ' + cx.broken + ' اِسنادِ شکسته.');
        } else if (cx.unfaith || cx.fake) {
          problems.push('سنجهٔ محتوا در «' + (cx.showName || cx.show) + '» قسمت ' +
                        cx.episode + ' — فراتر از خام: ' + (cx.unfaith || 0) +
                        '، پیوندِ ساختگی: ' + (cx.fake || 0) + '.');
        } else if (cx.verdict) {
          notes.push('سنجهٔ محتوا «' + (cx.showName || cx.show) + '» قسمت ' +
                     cx.episode + ': ' + cx.verdict + ' (اِسناد ' + cx.attribPct + '٪)');
        }
      }
    }
  } catch (eCa) {}

  // ۰٫۷) تازگیِ دستورِ روتین‌ها. این هشدار عمداً هر شب تکرار می‌شود: نسخهٔ
  // قبلی‌اش یک‌بار می‌آمد و خودش را می‌بست، و دقیقاً به همین دلیل ۵٫۴۶ بدونِ
  // به‌روزرسانیِ دستور رد شد.
  try {
    var pf = st.promptFresh || promptFreshStatus_();
    if (pf && pf.stale && pf.stale.length) {
      var pd = [];
      for (var pi = 0; pi < pf.families.length; pi++) {
        if (pf.families[pi].stale) {
          pd.push(pf.families[pi].kind + ' (v' + pf.families[pi].n +
                  ' برای ' + pf.families[pi].forVer + ')');
        }
      }
      problems.push('دستورِ روتین/تسک از کد عقب مانده — بدهی از نسخهٔ ' + pf.due +
                    ': ' + pd.join(' · ') + '. تا فایلِ تازه با «برای نسخهٔ موتور: ' +
                    pf.due + '» گذاشته نشود، این هشدار هر شب تکرار می‌شود.');
    }
  } catch (ePf) {}

  // ۱) قسمت اخیر
  var ep = st.lastEpisode;
  if (!ep) {
    problems.push('هنوز هیچ قسمتی تولید نشده است.');
  } else {
    var epMs = parseWhen_(ep.producedAt);
    var hrs = isNaN(epMs) ? null : Math.round((now - epMs) / 3600000);
    if (hrs !== null && hrs > CFG.ALERT_NO_EPISODE_HOURS) {
      problems.push('آخرین قسمت ' + hrs + ' ساعت پیش ساخته شده — بیش از حد انتظار. ' +
                    '(قسمت ' + ep.number + ': ' + ep.title + ')');
    } else if (hrs !== null) {
      notes.push('آخرین قسمت ' + hrs + ' ساعت پیش: قسمت ' + ep.number + ' — ' + ep.title);
    }
    if (String(ep.email).indexOf('ارسال شد') === -1) {
      problems.push('ایمیل قسمت ' + ep.number + ' ارسال نشده (وضعیت: ' + ep.email + ').');
    }
    if (tgEnabled_() && String(ep.telegram).indexOf('ارسال شد') === -1 &&
        String(ep.telegram).indexOf('مورد ارسال') === -1) {
      problems.push('ارسال تلگرام قسمت ' + ep.number + ' مشکل داشت (' + ep.telegram + ').');
    }
    // تلفیق: قسمتی که تقریباً تک‌نوع است، نشانهٔ خرابیِ سهمیهٔ نوع‌هاست
    var mix = Number(ep.videos) + Number(ep.photos) + Number(ep.audioFiles) + Number(ep.docs);
    var biggest = Math.max(Number(ep.videos), Number(ep.photos),
                           Number(ep.audioFiles), Number(ep.docs));
    if (mix >= 6 && biggest >= mix - 1) {
      problems.push('قسمت ' + ep.number + ' تقریباً تک‌نوع بود (' + ep.videos + ' ویدیو، ' +
                    ep.photos + ' عکس، ' + ep.audioFiles + ' صدا، ' + ep.docs + ' سند)؛ ' +
                    'تلفیق نوع‌ها آن‌طور که باید انجام نشده.');
    }
    if (!ep.audioLinks.length) problems.push('قسمت ' + ep.number + ' فایل صوتی ندارد.');

    // «صفر فایل» سنجیده می‌شد و «بیش از یک فایل» نه. ولی شمارِ لینک‌ها اینجا
    // معیار نیست: ستونِ لینک هم فایلِ یکجا را دارد هم بخش‌های خام را، پس یک
    // قسمتِ تک‌فایلی که از پنج بخش ساخته شده شش لینک دارد. معیار، شمارِ
    // فایل‌های «کلِ قسمت» است که در حافظه نگه داشته می‌شود.
    var epa = st.lastEpisodeAudio || null;
    if (epa && Number(epa.files) > 1 && String(epa.episode) === String(ep.number)) {
      problems.push('قسمت ' + ep.number + ' در ' + epa.files +
                    ' فایلِ صوتی فرستاده شد، نه یکی — متن از سقفِ یک فایل بلندتر شده.');
    }
    // با هدفِ *مؤثر* سنجیده می‌شود، نه با هدفِ اسمی — وگرنه وارسی همان
    // عددی را معیار می‌گیرد که خودِ پرامپت دیگر دنبالش نیست (درسِ ۵٫۹۰).
    var effMin = (function () { try { return varietyTargetMin_(); }
                                catch (e) { return CFG.TARGET_MINUTES; } })();
    var overP = epTooLong_(ep.duration, effMin);
    if (overP) {
      problems.push('قسمت ' + ep.number + ' ' + ep.duration + ' شد در برابرِ هدفِ ' +
                    effMin + ' دقیقه (' + overP + '٪ بلندتر).');
    }
  }

  // ۱-ج) موسیقی: اگر روشن است ولی بانک خالی است، یا قسمتِ آخر چیزی نگرفت.
  try {
    var mus = st.music || null;
    if (mus && mus.enabled) {
      // بانکِ خالی «ایراد» نیست: شاید هنوز قطعه‌ای نگذاشته‌اند یا نمی‌خواهند.
      // ایراد آن است که بانک قطعه دارد و باز هم چیزی پخش نشده — یعنی چیزی
      // شکسته. هشدارِ روزانه برای یک حالتِ طبیعی، هشدارهای واقعی را کور می‌کند.
      if (!mus.tracks) {
        notes.push('بانکِ موسیقی خالی است؛ قسمت‌ها بی‌موسیقی ساخته می‌شوند. ' +
                   'برای پرکردنش: منو ← «بانکِ موسیقی — پویش و برچسبِ خودکار».');
      } else if (mus.last && (!mus.last.tracks || !mus.last.tracks.length)) {
        problems.push('در «' + mus.last.episode + '» هیچ موسیقی‌ای پخش نشد' +
                      ((mus.last.missing || []).length
                        ? ' — جای خالی: ' + mus.last.missing.join('، ') : '') + '.');
      } else if (mus.last && (mus.last.missing || []).length) {
        notes.push('موسیقیِ «' + mus.last.episode + '»: ' + mus.last.tracks.join(' · ') +
                   ' — ولی برای ' + mus.last.missing.join('، ') + ' قطعه‌ای نبود.');
      } else if (mus.last && mus.last.tracks) {
        notes.push('موسیقیِ «' + mus.last.episode + '»: ' + mus.last.tracks.join(' · ') +
                   (mus.last.mood ? ' (' + mus.last.mood + ')' : '') + '.');
      }
      // بانکِ لنگ: جایگاهی که یک‌دو قطعه دارد یعنی هر قسمت همان را می‌گیرد.
      // این ایرادِ خرابی نیست، ایرادِ یکنواختی است — پس یادداشت، نه هشدار.
      if (mus.tracks && (mus.thin || []).length) {
        var sb = [];
        for (var sk in (mus.slots || {})) {
          if (mus.slots.hasOwnProperty(sk)) sb.push(sk + ': ' + mus.slots[sk]);
        }
        notes.push('بانکِ موسیقی برای ' + mus.thin.join('، ') + ' کم دارد (' +
                   sb.join(' · ') + ' — هدف ' + mus.target + ' در هر جایگاه). ' +
                   'موتور شبانه خودش دنبالِ قطعهٔ تازه می‌گردد.');
      }
      /* ══ «تا الانم که افکتی باز نشنیدم» ══
       * چند بار پرسیده شد و هر بار جوابش در کد بود ولی هیچ‌جا نوشته نمی‌شد:
       * بانک هیچ فایلِ «افکت»ی ندارد، پس هیچ افکتی هم پخش نمی‌شود. این
       * خرابی نیست — نبودِ مواد است — ولی سکوتِ دربارهٔ آن یعنی صاحبِ برنامه
       * هر شب منتظرِ چیزی است که ممکن نیست بیاید.
       * از ۵٫۹۶ musicStatus_ شمارش را دارد (یافتهٔ بازِ ناظر). */
      if (mus.sfxEnabled && mus.sfx !== null && mus.sfx !== undefined) {
        if (!mus.sfx) {
          notes.push('افکتِ صوتی هنوز هیچ فایلی در بانک ندارد (هدف ' +
                     (mus.sfxTarget || 0) + '), پس در هیچ قسمتی افکت پخش نمی‌شود. ' +
                     'موتور شبانه دنبالشان می‌گردد؛ تا وقتی فایلی نیاید، سکوت درست است.');
        } else if (mus.sfxTarget && mus.sfx < mus.sfxTarget) {
          notes.push('افکتِ صوتی: ' + mus.sfx + ' فایل در بانک (هدف ' + mus.sfxTarget +
                     ') — حداکثر ' + mus.sfxPerEpisode + ' افکت در هر قسمت.');
        }
      }
    }
  } catch (eMu) {}

  // ۱-ب) درس‌نامه: همان دو سنجه. تا امروز هیچ‌کدام از این‌ها در فایلِ وضعیت
  // نبود، پس ناظر — آدم یا کد — اصلاً نمی‌توانست ببیندشان.
  try {
    var spx = st.special || {};
    var spFiles = Number(spx.lastFiles || 0);
    if (spFiles > 1 && CFG.SPECIAL_ONE_FILE === true) {
      problems.push('درس‌نامه در ' + spFiles + ' فایلِ صوتی فرستاده شد، نه یکی — ' +
                    'متن از سقفِ یک فایل بلندتر شده.');
    }
    // با هدفِ *مؤثر* سنجیده می‌شود، نه با ۱۵ دقیقهٔ خام. وقتی «یک فایل» روشن
    // است هدف عملاً ~۱۱ دقیقه است؛ سنجیدن با ۱۵ یعنی قسمتِ ۱۳:۲۷ — که دقیقاً
    // به‌خاطرِ همان بلندی دو فایل شد — هیچ اعتراضی برنینگیزد.
    var tMin = CFG.SPECIAL_TARGET_MINUTES;
    try { tMin = specialTargetMin_(); } catch (eT) {}
    var overS = epTooLong_(spx.lastDuration, tMin);
    if (overS) {
      problems.push('درس‌نامه ' + spx.lastDuration + ' شد در برابرِ هدفِ ' +
                    tMin + ' دقیقه (' + overS + '٪ بلندتر).');
    }
  } catch (eSp) {}

  // ۲) قسمت نیمه‌تمامِ گیرکرده
  if (st.pendingEpisode) {
    // «آیا تریگری در فهرست هست» ملاکِ درستی نبود: تریگرِ یک‌بارمصرفی که زده و
    // اجرایش کشته شده، همچنان در فهرست می‌ماند. حالا خودِ نگهبان تصمیم می‌گیرد
    // (بر پایهٔ «نوبتِ ادامه گذشته یا نه») و ما نتیجه‌اش را گزارش می‌کنیم.
    // خطای این‌جا بلعیده نمی‌شود. اگر زمان‌بندیِ دوباره شکست بخورد (مثلاً
    // سقفِ بیست‌تاییِ تریگرها)، شکستِ خاموش یعنی گزارش با خیالِ راحت
    // می‌نویسد «در حال صداگذاری است» — دربارهٔ قسمتی که مرده است.
    var revived = false, revErr = '';
    try { revived = resumeStalledEpisode_(); } catch (e) { revErr = e.message || String(e); }
    if (revErr) {
      problems.push('قسمت ' + st.pendingEpisode.episode + ' نیمه‌تمام مانده و زمان‌بندیِ ' +
                    'دوباره‌اش شکست خورد: ' + revErr);
    } else if (revived) {
      problems.push('قسمت ' + st.pendingEpisode.episode + ' نیمه‌تمام مانده بود و نوبتِ ' +
                    'ادامه‌اش گذشته بود؛ موتور دوباره زمان‌بندی‌اش کرد.');
    } else {
      notes.push('قسمت ' + st.pendingEpisode.episode + ' در حال صداگذاری است ' +
                 '(' + st.pendingEpisode.parts + ' بخش آماده).');
    }
  }
  // درس‌نامه هم همان نگهبان را دارد و تا امروز کسی از دلِ وارسیِ سلامت صدایش نمی‌زد.
  try { if (resumeStalledSpecial_()) problems.push('درس‌نامهٔ نیمه‌تمام دوباره زمان‌بندی شد.'); }
  catch (eSp) { problems.push('درس‌نامهٔ نیمه‌تمام مانده و زمان‌بندیِ دوباره‌اش شکست خورد: ' +
                              (eSp.message || eSp)); }

  // ۳) سلامت خودِ شیت‌های منبع: خطاهای ثبت‌شده، رکود، و عقب‌ماندگی خواندن
  var sp = sourceProblems_(hub, { feeds: (st.sync && st.sync.feeds) || [] }, st.sourceErrors);
  problems = problems.concat(sp.problems);
  notes = notes.concat(sp.notes);

  // ۳-ب) حلقهٔ گزارش ← اقدام
  var rp = st.reports;
  if (rp) {
    if (rp.needsCode) {
      var noTg = 0;
      for (var ci = 0; ci < rp.codeItems.length; ci++) {
        if (String(rp.codeItems[ci].telegram).indexOf('ارسال شد') === -1) noTg++;
      }
      problems.push('‏' + rp.needsCode + ' مورد در انتظار تعویض کد است: «' +
        rp.codeItems[0].title.slice(0, 90) + '»' +
        (noTg ? ' — و برای ' + noTg + ' موردش هشدار تلگرام نرفته' : '') + '.');
    }
    if (rp.open) {
      /* ══ جمله‌ای که کارِ نکرده را انجام‌شده نشان می‌داد (۶٫۸۶) ══
         «۶۵ دستورِ باز … که در قسمتِ بعدی اعمال می‌شود» — سقفِ تزریق ۱۲
         است، پس ۵۳تای دیگر در هیچ قسمتی اعمال نمی‌شوند. تا وقتی این جمله
         این را می‌گفت، هیچ‌کس دنبالِ علتِ صف نمی‌گشت؛ جمله می‌گفت صف دارد
         خالی می‌شود. */
      notes.push(rp.open + ' دستور بازِ بازبینی در تب «' + CFG.REPORT_TAB + '» هست؛ ' +
                 rp.injectable + ' تای اولش در قسمتِ بعد اعمال می‌شود' +
                 (rp.waiting ? ' و ' + rp.waiting + ' تا در نوبت می‌مانند' : '') + '.');
      /* و صفی که چند برابرِ سقفِ تزریق شده، خودش یافته است: با این آهنگ
         هرگز خالی نمی‌شود. یک عدد در یادداشت‌ها ماه‌ها همان‌جا می‌مانَد. */
      var qCap = Math.max(2, Number(CFG.OPEN_QUEUE_ALERT) || 3);
      if (rp.injectable && rp.open >= rp.injectable * qCap) {
        problems.push('صفِ دستورهای بازبینی ' + rp.open + ' تاست و هر قسمت ' +
                      rp.injectable + ' تا اعمال می‌شود — با این آهنگ خالی نمی‌شود. ' +
                      'ردیفی که ' + (Number(CFG.REPORT_STALE_DAYS) || 21) +
                      ' روز دیده نشود خودکار بسته می‌شود؛ اگر صف باز هم ماند، ' +
                      'یعنی نشانه‌ها واقعاً تکرار می‌شوند.');
      }
    }
    if (rp.repeated) {
      /* ══ حلقه‌ای که بسته نمی‌شود (۶٫۱۱) ══
       * «۳۲ مورد بیش از یک بار تکرار شده» یک *یادداشت* بود، پس هرگز بالا
       * نمی‌آمد و ماه‌ها همان‌جا می‌ماند. ولی معنایش دقیقاً این است که
       * اقدامِ قبلی جواب نداده — یعنی حلقهٔ گزارش←اقدام باز است. یک
       * تکرار اتفاق است؛ ده تا یعنی سازوکار کار نمی‌کند. */
      var repCap = Math.max(3, Number(CFG.REPEAT_ALERT) || 10);
      if (rp.repeated >= repCap) {
        problems.push('‏' + rp.repeated + ' یافته بیش از یک بار در گزارش‌ها تکرار شده — ' +
          'یعنی اقدامِ قبلی جواب نداده و حلقهٔ گزارش←اقدام بسته نمی‌شود. ' +
          'ناظر باید به‌جای ثبتِ دوبارهٔ همان‌ها، علتِ نبستنشان را پیدا کند.');
      } else {
        notes.push(rp.repeated + ' مورد بیش از یک بار در گزارش‌ها تکرار شده — یعنی اقدامِ ' +
                   'قبلی جواب نداده.');
      }
    }
  }

  // ۳-پ) دیده‌بانِ کارگرهای بیرونی — کی ناظر را می‌پاید
  try { watchdog_(st, problems, notes); } catch (eWd) {
    problems.push('دیده‌بانِ کارگرهای بیرونی اجرا نشد: ' + eWd.message);
  }

  // ۳-الف) قطعه‌هایی که هیچ‌وقت کامل نشدند
  if (st.chunks && st.chunks.files) {
    notes.push('قطعه‌های در انتظار ترکیب: ' + st.chunks.rows + ' قطعه از ' +
               st.chunks.files + ' فایل.');
    if (st.chunks.rows > 3000) {
      problems.push('انبار قطعه‌ها بزرگ شده (' + st.chunks.rows + ' ردیف). یعنی فایل‌هایی ' +
                    'در شیت منبع نیمه‌کاره رها شده‌اند یا ستون «تعداد قطعات» پر نشده.');
    }
  }

  // ۴) خطاهای تازه در گزارش
  var errs = [];
  for (var k = 0; k < st.recentLog.length; k++) {
    if (isErrorLine_(st.recentLog[k].msg)) errs.push(st.recentLog[k]);
  }
  if (errs.length) {
    problems.push('در گزارش ' + errs.length + ' سطر خطا ثبت شده. تازه‌ترین: ' +
                  errs[errs.length - 1].msg.slice(0, 200));
  }

  // ایرادهای برنامهٔ «درس‌نامه»
  try {
    if (!st.special) st.special = specialStatus_(hub);
    var spProbs = specialProblems_(st);
    for (var sp2 = 0; sp2 < spProbs.length; sp2++) problems.push(spProbs[sp2]);
    /* جزوهٔ مجموعه‌ها. خواستهٔ صریح: «باید این قابلیت و به‌روزرسانی‌شدنش حتماً
       موردِ توجهِ ناظر به‌طور مکرر قرار بگیرد و گزارش بشود.» پس هر روز، نه
       یک بار. بخشِ ۲۶ جلوتر است، پس try/catch. */
    try { handoutHealth_(problems, notes); } catch (eHh) {}

  /* یوتیوب — خطِ روزانه همیشه هست، حتی وقتی هیچ ایرادی نیست.
     مهم‌ترین بندش «منتظرِ ساختِ ویدئو» است: اگر کسی MP4 نسازد هیچ‌چیز منتشر
     نمی‌شود و از بیرون شبیهِ خاموشی است — همان شکلِ خرابی که بانکِ موسیقی
     را هفته‌ها خالی نگه داشت. */
  /* ══ دورِ دومِ روزِ یوتیوب — پیش از گزارش، نه بعدش (۶٫۷) ══
   * تیک باید *قبل* از `ytHealth_` بدود، وگرنه ایمیلِ امروز وضعِ پیش از کارِ
   * امروز را می‌گوید — همان اشتباهی که در سیاههٔ شناسنامهٔ کانال کردیم و
   * «⬜ خالی — پر شد» بیرون داد. */
  try {
    /* بودجه از آنچه واقعاً مانده گرفته می‌شود، نه از عددِ ثابت. و از ۶٫۳۷
       انتشار نوبتِ مستقلِ خودش را دارد، پس این دور «شانسِ دوم» است نه
       تنها شانس — اگر وقت نبود، هیچ چیزی از دست نمی‌رود. */
    var ytBudget = Math.min(90000, healthLeft_() - 120000);
    if (ytBudget < 25000) { skipped.push('دورِ ۱۰ صبحِ یوتیوب'); throw { __skip: 1 }; }
    healthStep_('یوتیوب');
    var ytT = ytTick_(ytBudget);
    if (ytT.collected || ytT.published || ytT.queued) {
      notes.push('یوتیوب (دورِ ۱۰ صبح): ' + faDigitsOut_(String(ytT.queued)) +
                 ' قسمت به صف رفت، ' + faDigitsOut_(String(ytT.collected)) +
                 ' ویدئو برداشته شد، ' + faDigitsOut_(String(ytT.published)) + ' منتشر شد.');
    }
  } catch (eYk) {
    if (!eYk || !eYk.__skip) notes.push('دورِ دومِ یوتیوب اجرا نشد: ' + eYk.message);
  }
  /* کیفیتِ استخراج هر روز یک خط می‌گیرد، حتی وقتی دوری اجرا نشده — چون
     «هفته‌هاست اجرا نشده» خودش خبر است، و سکوت را نمی‌شود از سلامت تشخیص داد. */
  if (healthHas_(8000, 'کیفیتِ استخراج', skipped)) try {
    var sqL = sqStatus_();
    if (sqL && sqL.line) notes.push(sqL.line);
  } catch (eSq2) {}
  /* بازبینیِ متنِ صوتی هم هر روز یک خط دارد. «هیچ ایرادی پیدا نشد» و «اصلاً
     اجرا نشد» در سکوت یک شکل‌اند؛ سطرِ روزانه تنها چیزی است که از هم جدایشان
     می‌کند. و اگر بازبینی پنج قسمت پیاپی هیچ نگیرد، از یادداشت به مشکل
     ارتقا می‌یابد — چون خودِ بازبینی آن‌وقت خراب است. */
  if (healthHas_(6000, 'بازبینیِ متنِ صوتی', skipped)) try {
    var spR = speakReviewStatus_();
    if (spR && spR.line) { if (spR.ok) notes.push(spR.line); else problems.push(spR.line); }
  } catch (eSr) {}
  /* و «چند بخش اصلاً اعراب نگرفت». تا ۶٫۲۸ این عدد فقط روی پروندهٔ قسمت
     می‌نشست و هیچ‌جا خوانده نمی‌شد؛ قسمتی با ۶۲٪ بخشِ بی‌اعراب منتشر شد و
     تنها کسی که فهمید شنونده بود. */
  if (healthHas_(6000, 'اعراب‌گذاری', skipped)) try {
    var skS = speakSkipStatus_();
    if (skS && skS.line) { if (skS.ok) notes.push(skS.line); else problems.push(skS.line); }
  } catch (eSk2) {}
  /* ══ کدام کارِ شبانه نوبت نمی‌گیرد (۶٫۸۹) ══
     «۰ ارجاع داوری شده · ۷ در صف · هیچ ارجاعی تا امروز داوری نشده» تنها
     نشانهٔ موجود بود، و آن را باید کسی در یک تبِ دیگر می‌دید. علتش هم در
     همین ایمیل نبود: `bridgeAuditRun_` یازدهمین بلوکِ سنگینِ شبانه است و
     با بودجهٔ ۲۷۰ ثانیه‌ای هرگز نوبتش نمی‌رسید. گرسنگی باید همان‌جا اعلام
     شود که بقیهٔ سلامت اعلام می‌شود، وگرنه هفته‌ها بی‌صدا می‌مانَد. */
  if (healthHas_(4000, 'نوبتِ کارهای شبانه', skipped)) try {
    /* `raise` فقط از اینجا true است — نه از `writeStatus_` که هر دو ساعت
       می‌دود. یافته‌ای که شش بار در روز ثبت شود، شمارندهٔ «تکرار»ش معنایش
       را از دست می‌دهد؛ همان قاعده‌ای که `monChecksStatus_` دارد. */
    var nsS = nightStarveStatus_(hub, true);
    if (nsS && nsS.line) { if (nsS.ok) notes.push(nsS.line); else problems.push(nsS.line); }
    /* نگهبانِ ادامهٔ قسمت‌ها (۸.۵۴) — هر روز، حتی وقتی چیزی کشته نشده. */
    try {
      var egS = epGuardStatus_();
      if (egS && egS.line) { if (egS.ok) notes.push(egS.line); else problems.push(egS.line); }
    } catch (eEg) {}
  } catch (eNs) {}
  /* ══ و اگر خاموش است، اینجا کاری هم می‌شود — نه فقط گزارش (۷٫۴۷) ══
     حکمِ «این مدل دستور را نمی‌پذیرد» هفته‌ها فقط گفته می‌شد. حالا اگر
     جایگزینی هست، همین‌جا سراغش می‌رویم: ساعتِ ۱۰، بینِ دو قسمت، نه وسطِ
     صداسازی (که درزِ شنیدنی می‌سازد). و اگر جایگزینی نیست، **همان را
     صریح بگو** — «هیچ مدلِ دیگری هم نمی‌پذیرد» و «هنوز نگشته‌ایم» دو
     خبرِ متفاوت‌اند و تا امروز هیچ‌کدام گفته نمی‌شد. */
  try {
    var tcW = ttsCueSwitch_();
    if (tcW.switched) {
      mailQueue_('مدلِ صوتی عوض شد تا لحن برگردد',
                 'مدلِ «' + tcW.from + '» دستورِ لحن را نمی‌پذیرفت، پس تکه‌ها ' +
                 'بی‌لحن ساخته می‌شدند. موتور به «' + tcW.to + '» رفت که می‌پذیرد. ' +
                 'قسمتِ بعدی دوباره با لحن خوانده می‌شود.');
      notes.push('دستورِ لحن: مدل از «' + tcW.from + '» به «' + tcW.to +
                 '» عوض شد تا لحن برگردد.');
    } else if (tcW.need) {
      problems.push('دستورِ لحن خاموش است و **جایگزینی پیدا نشد**: از ' +
                    ((tcW.alt || 0) === 0 ? 'هیچ‌کدام' : String(tcW.alt)) +
                    ' مدلِ صوتیِ در دسترس، هیچ‌کدام قالبِ دستور را نمی‌پذیرد' +
                    (tcW.why ? ' (' + tcW.why + ')' : '') +
                    ' — تا مدلِ تازه‌ای نیاید، قسمت‌ها بی‌لحن ساخته می‌شوند. ' +
                    'این ایراد است، نه انتخاب.');
    }
  } catch (eTw) {}
  /* ══ و سطرِ وضعیت **پس از** تعویض خوانده می‌شود، نه پیش از آن (۷٫۸۸) ══
     نامهٔ ۲۹ سپتامبر هم «دستورِ لحن: **خاموش**» داشت و هم «مدل عوض شد تا لحن
     برگردد» — دو جملهٔ متناقض در یک ایمیل، دربارهٔ یک چیز، چون این سطر از
     عکسِ پیش از تعویض می‌آمد. سطرِ روزانه باید حالتِ **پایانِ** اجرا را
     بگوید؛ وگرنه خواننده یاد می‌گیرد هیچ‌کدام را باور نکند (۷٫۵۷/۷٫۷۹).
     `ttsCueSwitch_` خودش `resolveModels_(true)` می‌زند، پس کش تازه است و
     `ttsCueStatus_` همین‌جا مدلِ تازه را می‌بیند — یک خواندنِ اضافه نیست،
     همان یکی است که جابه‌جا شده. */
  try {
    var tcS = ttsCueStatus_();
    if (tcS && tcS.line) { if (tcS.ok) notes.push(tcS.line); else problems.push(tcS.line); }
  } catch (eTc) {}
  /* ══ مدلِ صوتی: کدام می‌خوانَد، و اگر برود کدام جایش (۸.۳۹) ══
     سطر هر روز هست، حتی وقتی همه‌چیز سالم است (۵٫۹۰): «سنجاق زنده است و
     جانشینِ هم‌خوان آماده» با «سنجاق زنده است و هیچ جانشینی نیست» از بیرون
     یک شکل دارند و فقط این سطر جدایشان می‌کند. آزمونِ خودش در اجرای جدا،
     نه این‌جا: چند فراخوانِ گفتارساز روی تابعی که از هزینه مُرد (۷٫۶۳). */
  try {
    var tmS = ttsModelStatus_();
    if (tmS && tmS.line) { if (tmS.ok) notes.push(tmS.line); else problems.push(tmS.line); }
    try { ttsModelGates_(hub, tmS); } catch (eTg) {}
  } catch (eTm) {}
  try { ttsAuditArm_(); } catch (eTa) {}
  /* ══ لحنِ متن: حالت‌ها و نشانه‌ها (۸.۴۰) ══ «اتوماسیون زیر نظر باشه و ببینه
     دقیق و کامل داره انجام می‌شه و اگر نه هم گزارش بده و هم اقدام کنه». سطر
     هر روز هست؛ ایراد در مسئله‌ها می‌نشیند و `healthChronic_` تکرارش را
     می‌شمارد، و دو قسمتِ پیاپیِ ناقص خودش یافتهٔ کد است. */
  try {
    var smS = speakMoodStatus_();
    if (smS && smS.line) { if (smS.ok) notes.push(smS.line); else problems.push(smS.line); }
    try { speakMoodGates_(hub, smS); } catch (eMg) {}
  } catch (eSm) {}
  /* صفِ داوریِ محتوا. این یکی عمداً *اینجا*ست و نه در خودِ auditRun_: وقتی
     بودجهٔ شبانه تمام شود، auditRun_ اصلاً اجرا نمی‌شود و هر هشداری که
     داخلش باشد هم اجرا نمی‌شود. سه شب صفِ روبه‌رشد، و تنها کسی که فهمید
     آدمی بود که گزارش را خواند. */
  if (healthHas_(20000, 'صفِ داوریِ محتوا', skipped)) try {
    var aqS = auditQueueStatus_(hub);
    if (aqS && aqS.line) { if (aqS.ok) notes.push(aqS.line); else problems.push(aqS.line); }
  } catch (eAq) {}
  /* ترتیبِ قسمت‌های هر مجموعه. تا ۶٫۳۳ هیچ‌کس نمی‌پرسید ترتیب اصلاً معنا
     دارد یا نه: دو قسمت با یک شماره، یا هیچ‌کدام بی‌شماره، بی‌صدا به ترتیبِ
     ردیفِ شیت می‌افتاد — یعنی ترتیبِ پردازش، نه ترتیبِ درس. */
  if (healthHas_(30000, 'ترتیبِ قسمت‌ها', skipped)) try {
    var soS = seriesOrderStatus_(hub);
    if (soS && soS.line) { if (soS.ok) notes.push(soS.line); else problems.push(soS.line); }
  } catch (eSo) {}
  /* و سقفِ «یک فایل»، با عددی که از خروجیِ واقعی آمده. تا وقتی این عدد
     حدسی بود، هر بار که قسمت دو فایل می‌شد جای دیگری را دنبالِ مقصر
     می‌گشتیم. */
  try {
    var scS = speechCalibStatus_();
    if (scS && scS.line) notes.push(scS.line);
  } catch (eSc2) {}
  /* و عصری‌سازی — به همان دلیل و با همان قاعده. قابلیتی که خودش را بی‌صدا
     خاموش کند، همان است که بانکِ موسیقی را هفته‌ها خالی نگه داشت. */
  if (healthHas_(6000, 'عصری‌سازی', skipped)) try {
    var exS = explainStatus_();
    if (exS && exS.line) { if (exS.ok) notes.push(exS.line); else problems.push(exS.line); }
  } catch (eEx) {}
  try {
    var rcS = recapStatus_();
    if (rcS && rcS.line) notes.push(rcS.line);
  } catch (eRc2) {}
  /* ارجاعِ میان‌مجموعه‌ای (۶٫۴۳) — قاعدهٔ ۵٫۹۰: صاحبِ برنامه شیت باز نمی‌کند،
     پس سیاههٔ ارجاع‌ها اگر فقط در تب بماند، از نظرِ او وجود ندارد. */
  try {
    var bxS = bridgeStatus_(hub);
    if (bxS && bxS.line) notes.push(bxS.line);
  } catch (eBx2) {}
  try {
    var ivS = seriesInvStatus_();
    if (ivS && ivS.line) { if (ivS.missed) problems.push(ivS.line); else notes.push(ivS.line); }
  } catch (eIv) {}
  /* «فایلم را گذاشتم، چرا نیست؟» — سؤالی که شش بار پرسیده شد و پاسخش فقط در
     سیاههٔ داخلی بود. یک سطرِ روزانه، حتی وقتی همه‌چیز عادی است. */
  try {
    var rjS = seriesRejected_();
    if (rjS && rjS.line) notes.push(rjS.line);
  } catch (eRj2) {}
  /* وارسی‌های روزانهٔ ناظر — هر روز یک سطر، حتی وقتی همه گزارش شده‌اند.
     این تنها جایی است که «وارسی نشد» می‌تواند دیده شود. */
  try {
    var mcS = monChecksStatus_(hub, true);
    if (mcS && mcS.line) { if (mcS.ok) notes.push(mcS.line); else problems.push(mcS.line); }
  } catch (eMc) {}
  try {
    var hvS = hvizStatus_();
    if (hvS && hvS.line) { if (hvS.ok === false) problems.push(hvS.line); else notes.push(hvS.line); }
  } catch (eHv) {}
  try {
    var baS = bridgeAuditStatus_(hub);
    if (baS && baS.line) { if (baS.bad) problems.push(baS.line); else notes.push(baS.line); }
  } catch (eBa2) {}
  /* ══ موسیقی، هر روز، حتی وقتی خبری نیست (۷٫۶۸) ══
     تا ۷٫۶۶ موسیقی فقط وقتی حرف می‌زد که بانک خالی بود. «چند قطعه هست»
     گزارش می‌شد و «چند تا شنیده شده» هیچ‌جا — و آن عددِ دوم همان چیزی
     بود که اهمیت داشت: قطعهٔ نشنیده ماه‌ها سرِ آغازِ قسمت‌ها پخش شد و
     تنها کسی که فهمید صاحبِ برنامه بود، با گوشش. */
  try {
    /* ══ یک بار خوانده شود، دو بار مصرف (۷٫۷۲) ══
       `writeStatus_` همین شیء را در `st.music` ساخته. صدا زدنِ دوبارهٔ
       `musicStatus_()` یعنی خواندنِ **دوبارهٔ کلِ تبِ موسیقی** از هابِ
       ۲۹ مگابایتی، در همان تابعی که این پرونده دو بار ثبت کرده از هزینه
       مُرده است — و گزارشِ امروز می‌گوید ۳۲۰ ثانیه دوید و شش بخش را
       نینداخت اجرا کرد.
       تا ۷٫۶۷ این تابع یک **ستون** می‌خواند؛ ۷٫۶۸ برای شمردنِ
       «شنیده‌نشده» کلِ تب را لازم کرد و من همان‌جا دومی را هم اضافه
       کردم — دقیقاً اشتباهِ ۷٫۶۳، یک نسخه پس از نوشتنش.
       و `musicStatus_()` تنها وقتی صدا زده می‌شود که `writeStatus_` پرت
       کرده باشد: آن وقت سطرِ موسیقی هنوز باید بیاید. */
    var muS = (st && st.music) ? st.music : musicStatus_();
    if (muS && muS.line) {
      if (Number(muS.unheard) > 0) problems.push(muS.line); else notes.push(muS.line);
    }
    musicUnheardCheck_(hub, muS);
  } catch (eMu) {}
  /* مدل تنها زیرسامانه‌ای بود که سطرِ روزانه نداشت و فقط وقتی حرف می‌زد که
     خبرِ بدی بود. سکوت را نمی‌شود از مرگ تشخیص داد — همان قاعدهٔ بقیه. */
  if (healthHas_(6000, 'مدل‌ها', skipped)) try {
    var mdS = modelStatus_();
    if (mdS && mdS.line) { if (mdS.ok) notes.push(mdS.line); else problems.push(mdS.line); }
  } catch (eMd) {}
  /* ══ گویندهٔ تازه: هر روز یک سطر، حتی وقتی هیچ نمونه‌ای نیست (۷٫۲۱) ══
     صاحبِ برنامه هیچ شیتی را باز نمی‌کند و خودش خواست که «در گزارش روزانه
     روندش و عملکردش و ایرادات ثبت بشه و دیده بشه». سطری که فقط وقتی خبرِ
     بد هست بیاید، سکوتش از سلامت تشخیص داده نمی‌شود. */
  try {
    var viS = vintStatus_(hub);
    if (viS && viS.line) { if (viS.ok === false) problems.push(viS.line); else notes.push(viS.line); }
  } catch (eVi) {}
  /* ══ اثر انگشتِ معنایی: همان قاعده، از روزِ اول (۷٫۲۶) ══
     خواستهٔ صریح بود که «در گزارش روزانه بیاید چه تعداد انجام شده و هر
     روز به‌روز شود». پس سطرش **هر روز** هست — حتی روزی که هیچ ردیفِ
     تازه‌ای ساخته نشده، چون آن روز هم یک خبر است: «چیزی باقی نمانده» با
     «کار متوقف شده» از بیرون یک شکل دارند و فقط عدد از هم جدایشان می‌کند. */
  try {
    var emS = embStatus_(hub);
    /* ══ دروازه این‌جا هم زده می‌شود، نه فقط در کارِ شبانه (۷٫۲۷) ══
       `embGates_` تا ۷٫۲۶ فقط از `embNightly_` صدا زده می‌شد — یعنی
       شبی که نگهبانِ زمان اجازهٔ اجرای آن بند را نمی‌داد، هشدارِ
       «گیرکرده» هم زده نمی‌شد. دقیقاً در همان حالتی که هشدار لازم است،
       خاموش بود. همان شکلِ زنگِ ۷٫۲۲، یک لایه بیرون‌تر. */
    try { embGates_(hub, emS, null); } catch (eEg) {}
    if (emS && emS.line) {
      var emBad = (emS.ok === false) || !!emS.stale ||
                  (emS.stuckDays >= Math.max(1, Number(CFG.EMB_STUCK_DAYS) || 3) && emS.pending > 0);
      if (emBad) problems.push(emS.line); else notes.push(emS.line);
    }
  } catch (eEm) {}
  /* ══ پلِ صدا — و وارسیِ اشتراکش، اینجا نه فقط در کارِ شبانه (۷٫۳۹) ══
     `vbrSave_` تنها جایی است که اشتراکِ صف را باز می‌کند، و فقط وقتی
     صدا زده می‌شود که گوینده‌ای روشن باشد یا ردیفی در صف. یعنی همان
     حالتی که هیچ‌کدام نیست — که حالتِ شروع است — اشتراک هرگز باز
     نمی‌شود و گردش‌کار تا ابد قرمز می‌مانَد. این مسیر از آن مستقل است. */
  /* ══ و نوشتنِ صف هم از همین‌جا، نه فقط از کارِ شبانه (۷٫۴۶) ══
     ۷٫۴۰ `vbrQueueEnsure_` را ساخت تا صف بی‌قیدوشرط نوشته شود و
     `rev ≥ ۱` یعنی «موتور زنده است و نگاه کرد». ولی تنها صداکنندهٔ آن
     `vbrNightly_` است، که پشتِ `nightHas_` در کارِ شبانه می‌نشیند — و
     کارِ شبانه در عمل هرگز به آنجا نرسید. نتیجه: چهار اجرای قرمزِ
     voice-bridge با «موتور هرگز رویش ننوشته (rev 0)»، برای درمانی که
     روی مسیری گذاشته شده بود که اجرا نمی‌شود.

     همان حرکتِ ۷٫۳۹ برای اشتراک، این بار برای **نوشتن**: یک مسیرِ دوم
     با زمان‌بندیِ خودش. `vbrSave_` idempotent است (فقط rev را بالا
     می‌برد) و هزینه‌اش یک خواندن و یک نوشتن است.
     و **پیش از** `vbrStatus_` صدا زده می‌شود، وگرنه سطرِ امروز هنوز
     «نوشته نشده» می‌گوید در حالی که همین الان نوشته شد. */
  try { vbrQueueEnsure_(); } catch (eVq) {}
  /* ══ و **برداشتن** هم از همین‌جا، نه فقط از کارِ شبانه (۷٫۷۷) ══
     دو بندِ بالا اشتراک و نوشتنِ صف را به این مسیرِ مستقل آوردند و
     `vbrIngest_` را جا گذاشتند — همان نیمه‌کاری که ۷٫۴۶ دربارهٔ خودش
     نوشت: «اشتراک مسیرِ دومی گرفت؛ نوشتن نگرفت.» اینجا: نوشتن گرفت؛
     برداشتن نگرفت.

     و هزینه‌اش را صاحبِ برنامه پرداخت: دیشب دو ردیف تیک خورد، صبح هر
     دو «در انتظار» بودند، و تنها راهِ رسیدنشان کارِ شبانهٔ ۰۲:۳۰ بود —
     یعنی تا ۲۴ ساعت بعد. تبدیل که تمام شود، خروجی روی release نشسته و
     موتور تا فردا شب سراغش نمی‌رود. برداشتن کارِ ارزانی است که فقط
     دیر انجام می‌شد.

     پشتِ `healthHas_` چون تنها هزینهٔ واقعی‌اش دانلودِ چند ده مگابایت
     است و آن هم فقط وقتی جوابی آمده باشد؛ نبودِ وقت **گفته می‌شود**
     (۷٫۶۳ — به تابعی که تازه از هزینه مُرده هزینه اضافه نکن). و پیش
     از `vbrStatus_`، وگرنه سطرِ امروز «در انتظار» می‌گوید برای چیزی که
     همین الان رسید. */
  try {
    if (healthHas_(60000, 'برداشتِ پلِ صدا', skipped)) {
      var vbI = vbrIngest_(hub);
      if (vbI && vbI.got && vbI.got.length) {
        notes.push('پلِ صدا: ' + faDigitsOut_(String(vbI.got.length)) +
                   ' خروجی برداشته شد — ' +
                   vbI.got.map(function (g) { return g.name; }).join(' · '));
      }
    }
  } catch (eVi) {
    try { logLine_('برداشتِ پل از وارسیِ سلامت ناموفق: ' + eVi.message); } catch (eVib) {}
  }
  try {
    var vbS = vbrStatus_();
    if (vbS && vbS.line) {
      if (vbS.ok === false) problems.push(vbS.line); else notes.push(vbS.line);
    }
  } catch (eVb) {}
  /* ══ شبی که کشته شد — و چرا از اینجا پرسیده می‌شود (۷٫۴۴) ══
     `nightStarve` فقط از `nightEnd_` تغذیه می‌شود، و وقتی اپس‌اسکریپت
     اجرا را سرِ شش دقیقه می‌کُشد `nightEnd_` هم می‌میرد. یعنی تنها
     شاهدِ موجود دقیقاً در حالتی که لازم است وجود ندارد — و سه شب
     (۲۱ تا ۲۳ سپتامبر) «هر شب فهرست تا آخر می‌رود» گفت در حالی که از
     «اثر انگشتِ معنایی» به بعد هیچ‌چیز اجرا نشده بود. */
  try {
    var nd = nightDeath_();
    if (nd.died) {
      problems.push('کارِ شبانه: شبِ ' + nd.day + ' وسطِ «' + nd.at +
                    '» کشته شد (سقفِ شش دقیقهٔ اپس‌اسکریپت) — یعنی هر ' +
                    'بلوکی پس از آن، آن شب اجرا نشد و هیچ‌جا ثبت نشد.');
    }
  } catch (eNd) {}

  /* ══ تریگری که ترکید و هیچ‌جا صدا درنیامد (۸.۱۱) ══
     صاحبِ برنامه ۱ اکتبر سطرِ قرمزِ `ytPublishTick` را **شانسی** در صفحهٔ
     Executions دید و پرسید «اگه نمی‌دیدم چی؟». جوابِ راست: هیچ — موتور
     فهرستِ اجراهای خودش را نمی‌بیند و Apps Script از درون راهی برای
     خواندنش نمی‌دهد. ۷.۴۴ این شاهد را فقط برای کارِ شبانه ساخت و نُه
     تریگرِ دیگر کور ماندند؛ این همان، تعمیم‌یافته.

     و سطرِ سالم هم **هر روز** گفته می‌شود، چون سکوت را نمی‌شود از کوری
     تشخیص داد (۵.۹۱). */
  try {
    var rs = runStuck_();
    if (rs.items.length) {
      problems.push(rs.line);
      logSelfFinding_(hub, {
        key: 'run-died', severity: 'جدی', owner: ROWNER_CODE,
        title: 'یک تریگر وسطِ کار مُرد و هیچ‌جا ثبت نشد',
        detail: rs.line,
        instruction: 'در Apps Script ← Executions سطرِ قرمزِ همان تابع را باز ' +
          'کنید و متنِ خطا را بخوانید. اگر «Service Spreadsheets timed out» ' +
          'بود، یعنی مسیری هست که هنوز از `sheetsRetry_` نمی‌گذرد. مهرِ ' +
          'ناتمام با اجرای بعدیِ همان تابع خودبه‌خود پاک می‌شود، پس ردیفِ ' +
          'تکرارشونده یعنی هر بار می‌میرد — نه یک بارِ گذشته. ' +
          'و پیش از Executions، سیاههٔ خودِ موتور در همان دقیقه‌ها را بخوانید: ' +
          'سطرهای «ناقص برگشت و ترمیم شد» با ده‌ها هزار نویسه یعنی فراخوانِ مدلی ' +
          'که افسار گسیخت و هر کدام یک دقیقه خورد — علتِ ۴ اکتبر (۸.۳۴) همین بود.'
      });
    } else notes.push(rs.line);
  } catch (eRs) {}

  /* ══ بدهیِ منو، هر روز و با عدد (۸.۱۳) ══
     «ناظر به تمام موارد منو نظارت می‌کنه و عملکرد می‌سنجه؟» — جوابِ آن روز
     این بود که ۳۴ گزینه از ۵۸ در هیچ سنجه‌ای نبودند، و **خودِ آن عدد هیچ‌جا
     دیده نمی‌شد**: در یک فایلِ آزمون زندگی می‌کرد، یعنی جایی که فقط با
     گشتنِ عمدی پیدا می‌شود. بدهی‌ای که دیده نشود، بدهی نیست؛ معافیت است.

     در یادداشت‌ها می‌نشیند نه در مسئله‌ها: کارِ باقی‌مانده است نه خرابی، و
     قرمزی که هر روز برای کارِ در جریان بزند خوانده نمی‌شود (۷.۴۰). ولی هر
     روز گفته می‌شود، چون عددی که دیده نشود کوچک نمی‌شود. */
  try {
    var bm = (typeof BUILD_MENU_ === 'object' && BUILD_MENU_) || null;
    if (bm && bm.total) {
      var cov = bm.total - bm.debt;
      notes.push('🧪 پوششِ سنجهٔ منو: ' + faDigitsOut_(String(cov)) + ' از ' +
                 faDigitsOut_(String(bm.total)) + ' گزینه سنجه دارد' +
                 (bm.debt ? ' · ' + faDigitsOut_(String(bm.debt)) +
                            ' هنوز نه (دفترِ بدهی در run_dialogs_test.js)'
                          : ' — بدهی صفر'));
    }
  } catch (eBm) {}

  /* ══ صفِ تعویضِ کد — از `healthCheck`، که جدولِ زمانیِ خودش را دارد ══
     اگر این فقط در کارِ شبانه می‌نشست، شبی که دروازهٔ زمان از آن بلوک رد
     شود دقیقاً شبی است که «چیزی جلو نمی‌رود» باید گفته شود و گفته
     نمی‌شد — زنگِ ۷٫۲۷، یک لایه آن‌طرف‌تر. */
  try {
    var cq = codeQueue_(hub);
    var cqLine = codeQueueLine_(cq);
    if (cqLine) {
      if (codeQueueStuck_(hub, cq)) problems.push(cqLine);
      else notes.push(cqLine);
    }
    /* کارِ کدِ امروزِ ناظر: هر روز گفته می‌شود، و ماندنش ایراد است (۸.۵۵). */
    var ct = codeTaskTrack_(hub, cq);
    st.codeTask = { key: ct.task ? ct.task.key : '', title: ct.task ? ct.task.title : '',
                    days: ct.days, escalated: ct.escalated, line: ct.line };
    /* سرِ فهرست، نه ته: `health.notes` در `_STATUS.json` به بیست سطر بریده می‌شود
       و ناظر کارِ امروزش را از همین‌جا برمی‌دارد. */
    if (ct.line) {
      if (ct.days > Math.max(1, Number(CFG.CODE_TASK_IGNORE_DAYS) || 2)) problems.unshift(ct.line);
      else notes.unshift(ct.line);
    }
  } catch (eCq) {}

  /* ══ درِ دومِ همان قفل: ردیفی که بسته شد ولی شرطش هنوز برقرار است ══
     دروازهٔ داخلِ `markCodeRowsInstalled_` جلوی بستنِ **تازه** را می‌گیرد،
     ولی ردیفی که پیش‌تر غلط بسته شده هرگز از آن دروازه رد نمی‌شود —
     ۵٫۹۵: تمیز کردنِ ورودی آنچه را نوشته شده درست نمی‌کند. و این‌جا
     می‌نشیند نه در شبانه، چون شبانه خودش همان چیزی است که ممکن است
     بمیرد (۷٫۲۷/۷٫۴۶). */
  try {
    var sv = selfVerifySweep_(hub, st);
    st.selfVerify = sv;
    if (sv && sv.line) {
      if (sv.reopened || (sv.broken && sv.broken.length)) problems.push(sv.line);
      else notes.push(sv.line);
    }
  } catch (eSv) {}

  /* ══ کارنامهٔ قابلیت‌ها — هر روز، حتی روزِ سالم ══
   * خواستهٔ صاحبِ برنامه: «لازم نباشه من هر بار ایمیل بفرستم و تو دوباره
   * بفهمی اتوماسیون درست کار نکرده.» یعنی جدولی که خودش هر روز می‌گوید چه
   * چیزی روشن است و کار می‌کند، چه چیزی خاموش است (و آن تصمیمِ خودش است)،
   * و چه چیزی روشن است و **کاری نمی‌کند** — که تنها حالتِ ایراد است.
   *
   * `st.capabilities` را `writeStatus_` از قبل ساخته؛ این‌جا فقط خوانده
   * می‌شود. اگر نساخته بود (روزی که نوشتنِ وضعیت افتاد) همان‌جا حساب
   * می‌شود، چون این خط نباید روزی که بیشترین لزوم را دارد غایب باشد. */
  try {
    var cp = st.capabilities;
    if (!cp) { cp = capStatus_(st); st.capabilities = cp; }
    if (cp && cp.line) {
      if (cp.ok === false) problems.push(cp.line); else notes.push(cp.line);
    }
    /* و یافته، نه فقط جمله: جمله‌ای در نامهٔ فردا عوض می‌شود، یافته نه. */
    if (cp && (cp.idle.length || cp.wiring.length)) capFindings_(hub, cp);
  } catch (eCp) {}

  /* ══ درِ دومِ بستنِ پوشهٔ «voice cloning» (۸.۰۶) ══
   * کارِ شبانه ممکن است به بخشِ ۳۳ نرسد (۷٫۴۶ عیناً همین بود، برای صفِ پل)،
   * و پوشه‌ای که ضبطِ صدای دو شخصِ حقیقی درش است نباید یک شبِ شلوغ باز
   * بمانَد. هزینه‌اش یک پیمایشِ پوشه است، نه خواندنِ هاب. */
  try {
    var vfc = vintFolderClose_();
    if (vfc && vfc.kids && vfc.kids.length) {
      problems.push('در پوشهٔ «' + (CFG.VOICE_CLONE_FOLDER || 'voice cloning') +
        '» این زیرپوشه‌ها **خودشان جدا** «هرکس با لینک» هستند: «' +
        vfc.kids.join('» · «') + '» — بستنِ پوشهٔ بالا اینها را نمی‌بندد، چون ' +
        'اشتراکشان ارثی نیست. اگر عمدی نیست از درایو ببندیدشان.');
    }
    if (vfc && vfc.why) {
      problems.push('پوشهٔ «' + (CFG.VOICE_CLONE_FOLDER || 'voice cloning') +
                    '» باز است و بسته نشد: ' + vfc.why + '.');
    }
  } catch (eVf) {}

  try { ytHealth_(problems, notes); } catch (eYt) {}
  /* تصویرهای درس (۷.۹۵) — **هر روز**، حتی روزی که هیچ خبری نیست. صاحبِ
     برنامه شیت باز نمی‌کند (۵.۹۰) و سکوت را نمی‌شود از «این قابلیت مرده»
     تشخیص داد. */
  try { lvHealth_(problems, notes); } catch (eLv) {}
  /* ستونِ «سبکِ تصویر» (۷.۹۶): خانه‌های خالی با پیشنهادِ خودِ موتور پر
     می‌شوند — «پیشنهادِ خودت رو هم تو اون مجموعه بنویس» — و خانهٔ ناخوانا
     **با اسم** گزارش می‌شود، چون انتخابی که خوانده نشود یعنی سبکی که او
     خواسته و بی‌صدا نخواهد گرفت (۷.۴۱). این‌جا و نه در نوبتِ شبانه، چون
     همان هابِ باز در دست است و مسیرِ ۱۰ صبح زمانبندیِ مستقلِ خودش را دارد
     (۷.۲۷/۷.۳۹). */
  /* ══ گشتنِ مدلِ تصویر، روی مسیرِ مستقل (۸٫۲۰) ══
     `lvGenStatus_` مدل را فقط از حافظه می‌خوانَد و حافظه را تنها
     `lvGenFill_` پر می‌کند — یعنی تا وقتی قسمتی ساخته نشود هیچ‌کس نگشته و
     خط هر روز می‌گوید «پیدا نشد». این‌جا یک بار در روز گشته می‌شود و
     **علتش ثبت** می‌شود. روی `healthCheck` و نه `writeStatus_`، چون
     `listModels_` یک فراخوانِ شبکه است و آن تابع هر دو ساعت می‌دود
     (۷٫۶۳/۷٫۶۶/۷٫۷۲). */
  try {
    var lvG = lvGenProbe_();
    if (lvG && lvG.looked && !lvG.id) {
      problems.push('🎨 تصویرِ ساخته‌شده روشن است ولی مدلی پیدا نشد: ' +
        (lvG.why || 'بی علت') + ' — یعنی کارت‌ها فقط متنی ساخته می‌شوند. ' +
        'اگر نامِ مدل را می‌دانید، `LV_GEN_MODEL` در تنظیمات صریح می‌پذیردش.');
    } else if (lvG && lvG.id) {
      notes.push('🎨 مدلِ تصویرِ ساخته‌شده: «' + lvG.id + '» (' + (lvG.why || '') + ').');
    }
  } catch (eLg) {}

  try {
    var lvA = lvStyleAudit_(hub);
    /* ══ متن با کاری که کد می‌کند عوض شد (۸٫۱۸) ══
       تا ۸٫۱۷ همین‌جا یک سبکِ ثابت نوشته می‌شد و جمله «پیشنهاد شد» بود؛ حالا
       «خودکار» نوشته می‌شود و انتخاب هر شب با مدل است. دستوری که از مکانیسمش
       عقب بماند، یا کارِ بیهوده می‌تراشد یا خواننده را از خواندن می‌اندازد —
       قاعدهٔ «دستورهایی که از حقیقتشان جا ماندند». */
    /* مهاجرتِ ۸٫۱۹ **با اسم** گزارش می‌شود و یک بار بیشتر نمی‌آید: کاری که
       بی‌صدا ۲۶۴ خانه را عوض کند، فردا پرسشِ «کی این را عوض کرد؟» می‌سازد. */
    if (lvA.thawed) notes.push('سبکِ تصویرِ ' + faDigitsOut_(String(lvA.thawed)) +
      ' مجموعه که سوئیپِ شب‌های پیش منجمدشان کرده بود، به «خودکار» برگشت' +
      ((lvA.thawNames || []).length ? ' (مثلاً ' + lvA.thawNames.join('، ') + ')' : '') +
      ' — از این به بعد مدل برای هر درس انتخاب می‌کند. ' +
      (lvA.mine ? faDigitsOut_(String(lvA.mine)) + ' مجموعه که سبکشان را خودتان ' +
                  'گذاشته‌اید دست نخورد' +
                  ((lvA.mineNames || []).length ? ' (' + lvA.mineNames.join('، ') + ')' : '') +
                  '. برای اینکه آن‌ها هم خودکار شوند، از منو «🎨 سبکِ تصویرِ همهٔ ' +
                  'مجموعه‌ها: خودکار».' : ''));
    if (lvA.filled) notes.push('سبکِ تصویرِ ' + faDigitsOut_(String(lvA.filled)) +
      ' مجموعه روی «خودکار» نشست — یعنی مدل برای هر درس، از روی موضوعِ مجموعه ' +
      'و متنِ همان قسمت، سبک و نقش را انتخاب می‌کند. هر وقت خواستید، در تختهٔ ' +
      '«مجموعه‌های آموزشی و پیشرفت» سبکِ ثابت بگذارید.');
    for (var lb = 0; lb < (lvA.bad || []).length; lb++) problems.push('سبکِ تصویر — ' + lvA.bad[lb]);
    if ((lvA.photo || []).length) {
      notes.push('سبکِ «عکسِ واقعی» برای ' + faDigitsOut_(String(lvA.photo.length)) +
        ' مجموعه انتخاب شده، ولی لایهٔ عکسِ آزاد هنوز نیامده — کارت‌های این ' +
        'مجموعه‌ها فعلاً ساده ساخته می‌شوند: ' + lvA.photo.join('، '));
    }
    if (lvA.why) problems.push('ستونِ سبکِ تصویر خوانده نشد: ' + lvA.why);
  } catch (eLa) {}
  /* ══ «ارتقایی داد گزارش بده» — نیمه‌ای که جا افتاده بود (۷.۹۷) ══
   * «ایرادی بود گزارش بده» را یافته‌ها پوشش می‌دهند. این یکی چیزِ دیگری
   * است: سیستمی که خراب نیست ولی در حالِ متوسط ساکن مانده، هر روز «سالم»
   * گزارش می‌شود و هیچ‌وقت بهتر نمی‌شود. یکی در روز، نه فهرستی — و صریح
   * می‌گوید ایراد نیست، چون فرصتی که به‌شکلِ خرابی گزارش شود اعتمادِ
   * خواننده به مسئله‌های واقعی را می‌خورد. */
  try {
    var lvU = lvUpgrade_(hub, null);
    if (lvU && lvU.text) notes.push('⬆️ فرصتِ ارتقا (ایراد نیست) — ' + lvU.text);
  } catch (eLu) {}
  /* و همان خلاصه به تلگرام — یک بار در روز، و فقط اگر ویدئویی منتشر شده. */
  try {
    var dgT = ytDigestSend_();
    if (dgT.sent) notes.push('کارنامهٔ یوتیوب به تلگرام رفت (' +
                             faDigitsOut_(String(dgT.n)) + ' ویدئو).');
  } catch (eDs) {}
    if (st.special && st.special.active) {
      notes.push('درس‌نامه: مجموعهٔ «' + st.special.active.name + '» در حال تولید — ' +
                 'قسمت ' + st.special.active.curPart + '، قطعهٔ ' + st.special.active.curChunk +
                 ' از ' + st.special.active.chunks + '.');
    } else if (st.special && st.special.queued) {
      notes.push('درس‌نامه: ' + st.special.queued + ' مجموعه در نوبت است.');
    }
  } catch (eSp) {}

  // ۵) محتوای واجد شرایط تمام شده؟
  if (st.bank.eligibleTotal < CFG.ITEMS_PER_EPISODE * 2) {
    problems.push('محتوای واجد شرایط دارد تمام می‌شود (' + st.bank.eligibleTotal + ' آیتم). ' +
                  'می‌توانید MIN_PRIORITY را پایین‌تر بیاورید.');
  }

  healthStep_('جمع‌بندی');
  /* کارِ جامانده **گفته می‌شود**. سطرِ روزانه‌ای که بی‌صدا نیاید، خواننده را
     به این نتیجه می‌رساند که آن زیرسامانه ساکت و سالم است — و همان است که
     دو روز هیچ‌کس نفهمید وارسی اصلاً تمام نشده. */
  if (skipped.length) {
    problems.push('وارسیِ سلامت وقت کم آورد و این بخش‌ها امروز اجرا نشدند: ' +
                  skipped.join('، ') + '. (کلِ اجرا ' +
                  Math.round((new Date().getTime() - _healthT0) / 1000) + ' ثانیه)');
  }
  /* ══ ایرادِ مزمن (۸.۳۲) ══
     ۱ تا ۳ اکتبر این ایمیل هر روز همان ایرادها را نوشت و ناظر هر روز نوشت
     «یافتهٔ تازه‌ای نبود». هر دو درست می‌گفتند و همین عیب بود: فهرستِ امروز
     حافظه ندارد. آنچه دو روزِ پیاپی آمده، **بالای** ایمیل می‌نشیند. */
  var chr = { list: [], line: '', n: 0 };
  try {
    healthStep_('ایرادِ مزمن');
    chr = healthChronic_(problems);
    if (chr.n) {
      problems.unshift(chr.line);
      healthChronicFind_(hub, chr);
    } else if (chr.line) notes.push(chr.line);
  } catch (eCh) {}
  saveHealthSnapshot_(problems, notes, chr.list);
  try { props_().setProperty(PK.HEALTH_STEP, 'تمام @ ' + nowStr_()); } catch (eHs) {}
  logLine_('وارسی سلامت: ' + (problems.length ? problems.length + ' ایراد' : 'همه‌چیز درست') +
           ' — ' + Math.round((new Date().getTime() - _healthT0) / 1000) + ' ثانیه' +
           (skipped.length ? '، ' + skipped.length + ' بخش جا ماند' : '') + '.');

  /* ── یک ایمیل در روز ──
   * پیش از ۵٫۹۱ این ایمیل فقط وقتی می‌رفت که ایرادی بود، و خبرهای روزمره
   * (نصبِ کد، پشتیبان، کهنگیِ دستور، یافتهٔ تازه) هرکدام ایمیلِ خودشان را
   * داشتند: شش تا هشت ایمیل در روز. حالا همه یک‌جا، و **حتی وقتی هیچ
   * ایرادی نیست هم می‌رود** — اگر خبری باشد. سکوت را نمی‌شود از «سامانه
   * خوابیده» تشخیص داد. */
  var queued = mailQueueRead_();
  if (problems.length || queued.length) {
    var bad = problems.length;
    var sp = healthSplit_(problems);
    var html = ['<div style="font-family:Tahoma;direction:rtl;text-align:right;line-height:2">'];
    /* تیتر فقط از روی «کارِ شما» ساخته می‌شود. اگر کاری از او برنمی‌آید،
       ایمیل باید همان بالا و در یک نگاه همین را بگوید — وگرنه باید تا ته
       خوانده شود تا معلوم شود لازم نبود خوانده شود. */
    html.push(sp.yours.length
      ? '<h2 style="color:#b45309">⚠️ موتور محتوا — ' +
        faDigitsOut_(String(sp.yours.length)) + ' مورد کارِ شماست</h2>'
      : '<h2 style="color:#166534">✅ موتور محتوا — کاری از شما لازم نیست</h2>');
    if (sp.yours.length) {
      html.push('<h3 style="color:#b45309">کارِ شما</h3><ul>');
      for (var y = 0; y < sp.yours.length; y++) html.push('<li>' + esc_(sp.yours[y]) + '</li>');
      html.push('</ul>');
    }
    if (sp.mine.length) {
      html.push('<h3 style="color:#666">در دستِ موتور و ناظر — لازم نیست کاری بکنید</h3><ul>');
      for (var q = 0; q < sp.mine.length; q++) html.push('<li>' + esc_(sp.mine[q]) + '</li>');
      html.push('</ul>');
    }
    html.push(mailQueueHtml_(queued));
    /* لینک‌ها نه ایرادند نه یادداشت — دسترسی‌اند. پس بخشِ خودشان را دارند،
       بعد از خبرها و پیش از وضعیت: کسی که فقط می‌خواهد ببیند امروز چه
       منتشر شده، نباید از لای ایرادها ردش کند. */
    try {
      var dg = ytDigestHtml_(ytDigest_(Number(CFG.YT_DIGEST_HOURS) || 26));
      if (dg) html.push(dg);
    } catch (eDg) {}
    if (notes.length) {
      html.push('<h3>وضعیت</h3><ul>');
      for (var w = 0; w < notes.length; w++) html.push('<li>' + esc_(notes[w]) + '</li>');
      html.push('</ul>');
    }
    html.push('<p style="color:#666;font-size:12px">این تنها ایمیلِ عملیاتیِ روز است؛ ' +
              'خبرهای روزمره همه در همین یکی می‌آیند. ' +
              '<a href="' + esc_(st.hubUrl) + '">CONTENT-HUB</a></p></div>');
    try {
      MailApp.sendEmail({ to: CFG.EMAIL_TO,
                          subject: (sp.yours.length
                                      ? '⚠️ موتور محتوا: ' + sp.yours.length + ' مورد کارِ شماست'
                                      : '✅ موتور محتوا — کاری از شما لازم نیست') +
                                   (sp.mine.length ? ' · ' + sp.mine.length + ' در دستِ موتور' : ''),
                          htmlBody: html.join(''), name: 'موتور محتوای آرشیو' });
      mailQueueClear_();
    } catch (e) { logLine_('ارسال ایمیلِ روزانه ناموفق: ' + e.message); }
  }

  var spU = healthSplit_(problems);
  var msg = (problems.length
               ? (spU.yours.length ? '⚠️ کارِ شما:\n• ' + spU.yours.join('\n• ') + '\n\n' : '') +
                 (spU.mine.length ? 'در دستِ موتور:\n• ' + spU.mine.join('\n• ') : '')
               : '✅ همه‌چیز درست است.') +
            (notes.length ? '\n\n' + notes.join('\n') : '');
  var ui = ui_(); if (ui) ui.alert('وارسی سلامت', msg, ui.ButtonSet.OK); else console.log(msg);
  return { problems: problems, notes: notes };

  } finally { runExit_('healthCheck'); }
}

// ------------------------------------------------- وضعیت برنامهٔ «درس‌نامه»

/** خلاصهٔ مجموعه‌های آموزشی و قسمت‌های تخصصی، برای فایل وضعیت و ناظر روزانه. */
function specialStatus_(hub) {
  var out = { enabled: !!CFG.SPECIAL_ENABLED, series: 0, done: 0, active: null,
              queued: 0, reopened: 0, episodes: 0, lastAt: '', lastTitle: '',
              lastMail: '', lastTg: '', pending: null, upcoming: [],
              pin: null, scannedAt: '', byCategory: [] };
  try {
    var pinS = seriesPin_();
    if (pinS) {
      out.pin = { kind: pinS.kind, value: pinS.value,
                  name: pinLabel_(hub, pinS), at: pinS.at, exhausted: false };
      // سنجاقی که کارش تمام شده ولی هنوز برداشته نشده، برای ناظرِ روزانه
      // نشانهٔ مهمی است: یعنی از این پس موتور به مجموعهٔ قبلی برمی‌گردد.
      try { out.pin.exhausted = !!pickSeriesPlan_(hub).pinExhausted; } catch (ePe) {}
    }
    out.scannedAt = String(props_().getProperty(PK.SERIES_SCAN_AT) || '');
  } catch (ePn) {}
  try {
    var reg = readSeriesReg_(hub);
    out.series = reg.rows.length;
    var queue = [];
    for (var i = 0; i < reg.rows.length; i++) {
      var v = reg.rows[i].vals, st = String(v[SC.STATUS - 1]);
      if (st === SST.DONE) out.done++;
      else if (st === SST.REOPENED) out.reopened++;
      else if (st === SST.NEW) { out.queued++; queue.push(v); }
      if (st === SST.ACTIVE && !out.active) {
        out.active = { key: reg.rows[i].key, name: String(v[SC.NAME - 1] || ''),
                       parts: Number(v[SC.PARTS - 1]) || 0,
                       chunks: Number(v[SC.CHUNKS - 1]) || 0,
                       curPart: Number(v[SC.CUR_PART - 1]) || 0,
                       curChunk: Number(v[SC.CUR_CHUNK - 1]) || 0,
                       episodes: String(v[SC.EPISODES - 1] || ''),
                       lastAt: String(v[SC.LAST_EP_AT - 1] || '') };
      }
    }
    // خلاصهٔ هر دسته، تا ناظر روزانه هم بتواند بگوید کجای کار هستیم
    try {
      var bd = seriesBoardData_(hub);
      out.byCategory = bd.groups.map(function (g) {
        return { cat: g.cat, series: g.series.length, pct: g.pct,
                 episodes: g.episodes, current: g.hasCurrent };
      });
      out.overallPct = bd.totals.pct;
      out.chunksLeft = bd.totals.chunks - bd.totals.doneChunks;
    } catch (eBd) {}
    queue.sort(function (a, b) {
      return (Number(a[SC.ORDER - 1]) || 999) - (Number(b[SC.ORDER - 1]) || 999); });
    for (var q = 0; q < queue.length && q < 5; q++) {
      out.upcoming.push({ name: String(queue[q][SC.NAME - 1] || ''),
                          order: Number(queue[q][SC.ORDER - 1]) || 0,
                          level: String(queue[q][SC.LEVEL - 1] || '') });
    }
  } catch (e) {}
  try {
    var sp = hub.getSheetByName(CFG.SPECIAL_TAB);
    if (sp && sp.getLastRow() >= 2) {
      out.episodes = sp.getLastRow() - 1;
      var last = sp.getRange(sp.getLastRow(), 1, 1, SPECIAL_HEADERS.length).getValues()[0];
      out.lastAt = String(last[XC.AT - 1] || '');
      out.lastTitle = String(last[XC.SERIES - 1] || '') + ' — ' + String(last[XC.TITLE - 1] || '');
      out.lastMail = String(last[XC.MAIL - 1] || '');
      out.lastTg = String(last[XC.TG - 1] || '');
      out.lastCoverage = String(last[XC.CHUNKS - 1] || '');
      out.lastMore = String(last[XC.MORE - 1] || '');
      // ستونِ مدت در خودِ تب هست ولی تا امروز خوانده نمی‌شد
      out.lastDuration = String(last[XC.DUR - 1] || '');
    }
  } catch (e2) {}
  // تعدادِ فایلِ صوتیِ آخرین درس‌نامه — در تب ستونی ندارد، پس از حافظه می‌آید
  try {
    var spl = JSON.parse(props_().getProperty(PK.SP_LAST) || 'null');
    if (spl) {
      out.lastFiles = Number(spl.files) || 0;
      if (!out.lastDuration) out.lastDuration = String(spl.duration || '');
    }
  } catch (eF) {}
  try {
    var raw = props_().getProperty(PK.SP_PENDING);
    if (raw) {
      var st2 = JSON.parse(raw);
      out.pending = { episode: st2.epNum, phase: st2.phase || 'audio',
                      chunkIdx: st2.chunkIdx, files: (st2.files || []).length };
    }
  } catch (e3) {}
  return out;
}

/** ایرادهای مخصوص برنامهٔ تخصصی، برای افزودن به وارسیِ سلامت. */
function specialProblems_(st) {
  var out = [];
  var sp = st && st.special;
  if (!sp || !sp.enabled) return out;
  if (!sp.series) {
    // فقط وقتی ایراد است که شیت‌های آموزشی واقعاً ردیف داشته باشند. روی نصبِ
    // تازه یا آرشیوی که هنوز فایل بلندِ آموزشی ندارد، سکوت درست است.
    var titles = {};
    for (var s0 = 0; s0 < CFG.SOURCES.length; s0++) {
      if (CFG.SERIES_SOURCES.indexOf(CFG.SOURCES[s0].key) !== -1) {
        titles[CFG.SOURCES[s0].title] = true;
      }
    }
    var rows = 0, feeds = (st.sync && st.sync.feeds) || [];
    for (var f0 = 0; f0 < feeds.length; f0++) {
      if (titles[feeds[f0].source]) rows += Number(feeds[f0].rows) || 0;
    }
    if (rows > 0) {
      out.push('شیت‌های آموزشی ' + rows + ' ردیف دارند ولی هیچ مجموعهٔ آموزشی‌ای ' +
               'شناسایی نشده. «اسکن مجموعه‌های آموزشی» را از منو بزنید.');
    }
    return out;
  }
  if (!sp.episodes) {
    out.push('هنوز هیچ قسمتی از «' + CFG.SPECIAL_SHOW_NAME + '» تولید نشده، با اینکه ' +
             sp.series + ' مجموعه شناسایی شده است.');
  } else if (sp.lastAt) {
    var hrs = (new Date().getTime() - parseWhen_(sp.lastAt)) / 3600000;
    if (isFinite(hrs) && hrs > CFG.ALERT_NO_SPECIAL_HOURS) {
      out.push('آخرین قسمت «' + CFG.SPECIAL_SHOW_NAME + '» ' + Math.round(hrs) +
               ' ساعت پیش بوده — بیش از حد انتظار.');
    }
    // شرطِ قبلی «شروع با ناموفق» بود ولی متنِ واقعی «ارسال ناموفق» است، پس
    // این هشدار هرگز نمی‌رفت. حالا مثل برنامهٔ متنوع، نبودِ «ارسال شد» ملاک است.
    if (String(sp.lastMail).indexOf('ارسال شد') === -1) {
      out.push('ایمیل آخرین قسمت درس‌نامه نرفته است (وضعیت: ' +
               (String(sp.lastMail) || '—') + ').');
    }
    if (String(sp.lastTg).indexOf('ناموفق') === 0) {
      out.push('ارسال تلگرام آخرین قسمت درس‌نامه ناموفق بوده: ' + String(sp.lastTg).slice(0, 120));
    }
  }
  if (sp.pending) {
    out.push('قسمت درس‌نامهٔ ' + sp.pending.episode + ' در مرحلهٔ «' + sp.pending.phase +
             '» نیمه‌تمام مانده است.');
  }
  if (sp.reopened) {
    out.push(sp.reopened + ' مجموعهٔ تمام‌شده قسمت تازه گرفته و دوباره در نوبت است.');
  }
  return out;
}
