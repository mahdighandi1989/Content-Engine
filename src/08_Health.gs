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
  try {
    var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var it = folder.getFilesByName(STATUS_FILE);
    if (!it.hasNext()) return null;
    var st = JSON.parse(it.next().getBlob().getDataAsString());
    return st.health || null;
  } catch (e) { return null; }
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
    { re: /^_MUSIC-META-[^/]*\.json$/, what: 'شناسنامهٔ آهنگ (جای قدیم)' }
  ];
}

/** نامِ پوشه‌هایی که جایشان ریشهٔ OUTPUT است. */
function outRootFolderNames_() {
  return [
    String(CFG.VARIETY_FOLDER || ''), String(CFG.SPECIAL_FOLDER || ''),
    String(CFG.CODE_FOLDER || ''), String(CFG.MUSIC_FOLDER || ''),
    String(CFG.REPORT_ARCHIVE_FOLDER || ''), String(CFG.VOICE_AUDIT_FOLDER || ''),
    String(CFG.AUDIT_FOLDER || ''), String(CFG.PROMPT_ARCHIVE_FOLDER || ''),
    String(CFG.YT_COVER_FOLDER || '')
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
              oldPrompts: [], readme: null, error: '' };
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
    srcQuality: (function () { try { return sqStatus_(); } catch (e) { return null; } })(),
    speakReview: (function () { try { return speakReviewStatus_(); } catch (e) { return null; } })(),
    explain: (function () { try { return explainStatus_(); } catch (e) { return null; } })(),
    recap: (function () { try { return recapStatus_(); } catch (e) { return null; } })(),
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
    recentLog: recentLog_(hub, 25),
    health: readExistingHealth_()
  };

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

function saveHealthSnapshot_(problems, notes) {
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
      notes: (notes || []).slice(0, 20)
    };
    f.setContent(JSON.stringify(st, null, 1));
  } catch (e) { logLine_('نوشتنِ خلاصهٔ سلامت ناموفق: ' + e.message); }
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

  /* ── ۱) ناظرِ روزانه ── */
  var rAt = '';
  try { rAt = String(((st || {}).reports || {}).lastReportAt || ''); } catch (e) {}
  out.push({ key: 'monitor', name: 'ناظرِ روزانه',
             what: 'گزارشِ روزانه و ساختِ نسخهٔ کد',
             at: rAt, days: whDays_(rAt, now),
             maxDays: Math.max(1, Number(CFG.WD_MONITOR_DAYS) || 2),
             fix: 'روتینِ «نظارت روزانه» در Cowork را باز کنید و ببینید چرا نمی‌دود.' });

  /* ── ۲) تسکِ غنی‌سازی ── */
  var eAt = '';
  try { eAt = whNewestEnrich_(); } catch (e2) {}
  out.push({ key: 'enrich', name: 'تسکِ غنی‌سازی',
             what: 'کامل‌کردنِ متنِ قسمت‌ها با جست‌وجوی وب',
             at: eAt, days: whDays_(eAt, now),
             maxDays: Math.max(1, Number(CFG.WD_ENRICH_DAYS) || 2),
             fix: 'روتینِ «غنی‌سازی اینترنتی پادکست‌ها» در Cowork را وارسی کنید.' });

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

/** تازه‌ترین پاسخِ غنی‌سازی در ریشهٔ OUTPUT. */
function whNewestEnrich_() {
  var newest = 0;
  try {
    var it = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).getFiles();
    while (it.hasNext()) {
      var f = it.next(), n = String(f.getName());
      if (n.indexOf('_ENRICH-') !== 0 || n.indexOf('_ENRICH-REQ-') === 0) continue;
      var t = f.getLastUpdated().getTime();
      if (t > newest) newest = t;
    }
  } catch (e) {}
  return newest ? Utilities.formatDate(new Date(newest), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm') : '';
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

function healthCheck() {
  var hub = getHub_();
  var problems = [], notes = [];
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
        var dn = [];
        for (var dI = 0; dI < lay.dups.length && dI < 6; dI++) {
          dn.push('«' + lay.dups[dI].name + '» (' + lay.dups[dI].count + ' نسخه)');
        }
        problems.push('در ریشهٔ OUTPUT فایلِ هم‌نامِ تکراری هست: ' + dn.join(' · ') +
                      ' — getFilesByName فقط یکی را برمی‌گرداند و کدام‌یک معلوم ' +
                      'نیست، پس ممکن است نسخهٔ کهنه خوانده شود و تازه هرگز دیده نشود.');
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
    var overP = epTooLong_(ep.duration, CFG.TARGET_MINUTES);
    if (overP) {
      problems.push('قسمت ' + ep.number + ' ' + ep.duration + ' شد در برابرِ هدفِ ' +
                    CFG.TARGET_MINUTES + ' دقیقه (' + overP + '٪ بلندتر).');
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
      notes.push(rp.open + ' دستور بازِ بازبینی در تب «' + CFG.REPORT_TAB +
                 '» هست که در قسمت بعدی اعمال می‌شود.');
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
    var ytT = ytTick_(90000);
    if (ytT.collected || ytT.published || ytT.queued) {
      notes.push('یوتیوب (دورِ ۱۰ صبح): ' + faDigitsOut_(String(ytT.queued)) +
                 ' قسمت به صف رفت، ' + faDigitsOut_(String(ytT.collected)) +
                 ' ویدئو برداشته شد، ' + faDigitsOut_(String(ytT.published)) + ' منتشر شد.');
    }
  } catch (eYk) { notes.push('دورِ دومِ یوتیوب اجرا نشد: ' + eYk.message); }
  /* کیفیتِ استخراج هر روز یک خط می‌گیرد، حتی وقتی دوری اجرا نشده — چون
     «هفته‌هاست اجرا نشده» خودش خبر است، و سکوت را نمی‌شود از سلامت تشخیص داد. */
  try {
    var sqL = sqStatus_();
    if (sqL && sqL.line) notes.push(sqL.line);
  } catch (eSq2) {}
  /* بازبینیِ متنِ صوتی هم هر روز یک خط دارد. «هیچ ایرادی پیدا نشد» و «اصلاً
     اجرا نشد» در سکوت یک شکل‌اند؛ سطرِ روزانه تنها چیزی است که از هم جدایشان
     می‌کند. و اگر بازبینی پنج قسمت پیاپی هیچ نگیرد، از یادداشت به مشکل
     ارتقا می‌یابد — چون خودِ بازبینی آن‌وقت خراب است. */
  try {
    var spR = speakReviewStatus_();
    if (spR && spR.line) { if (spR.ok) notes.push(spR.line); else problems.push(spR.line); }
  } catch (eSr) {}
  /* و عصری‌سازی — به همان دلیل و با همان قاعده. قابلیتی که خودش را بی‌صدا
     خاموش کند، همان است که بانکِ موسیقی را هفته‌ها خالی نگه داشت. */
  try {
    var exS = explainStatus_();
    if (exS && exS.line) { if (exS.ok) notes.push(exS.line); else problems.push(exS.line); }
  } catch (eEx) {}
  try {
    var rcS = recapStatus_();
    if (rcS && rcS.line) notes.push(rcS.line);
  } catch (eRc2) {}
  try { ytHealth_(problems, notes); } catch (eYt) {}
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

  saveHealthSnapshot_(problems, notes);
  logLine_('وارسی سلامت: ' + (problems.length ? problems.length + ' ایراد' : 'همه‌چیز درست'));

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
