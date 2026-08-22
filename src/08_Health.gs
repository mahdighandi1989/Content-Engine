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
    codeVersion: CFG.CODE_VERSION,
    chunks: chunkBacklog_(hub),
    bank: indexSnapshot_(hub),
    lastEpisode: lastEpisode_(hub),
    pendingEpisode: pending,
    models: models,
    telegram: tgEnabled_() ? 'فعال' : 'تنظیم نشده',
    triggers: ScriptApp.getProjectTriggers().length,
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

    // «صفر فایل» سنجیده می‌شد و «بیش از یک فایل» نه. قسمتی که دو تکه فرستاده
    // شود کارِ حرفه‌ای به نظر نمی‌رسد، و تا امروز هیچ سنجه‌ای نمی‌دیدش.
    if (ep.audioLinks.length > 1) {
      problems.push('قسمت ' + ep.number + ' در ' + ep.audioLinks.length +
                    ' فایلِ صوتی فرستاده شد، نه یکی — متن از سقفِ یک فایل بلندتر شده.');
    }
    var overP = epTooLong_(ep.duration, CFG.TARGET_MINUTES);
    if (overP) {
      problems.push('قسمت ' + ep.number + ' ' + ep.duration + ' شد در برابرِ هدفِ ' +
                    CFG.TARGET_MINUTES + ' دقیقه (' + overP + '٪ بلندتر).');
    }
  }

  // ۱-ب) درس‌نامه: همان دو سنجه. تا امروز هیچ‌کدام از این‌ها در فایلِ وضعیت
  // نبود، پس ناظر — آدم یا کد — اصلاً نمی‌توانست ببیندشان.
  try {
    var spx = st.special || {};
    var spFiles = Number(spx.lastFiles || 0);
    if (spFiles > 1 && CFG.SPECIAL_ONE_FILE === true) {
      problems.push('درس‌نامه در ' + spFiles + ' فایلِ صوتی فرستاده شد، نه یکی — ' +
                    'متن از سقفِ یک فایل بلندتر شده.');
    }
    var overS = epTooLong_(spx.lastDuration, CFG.SPECIAL_TARGET_MINUTES);
    if (overS) {
      problems.push('درس‌نامه ' + spx.lastDuration + ' شد در برابرِ هدفِ ' +
                    CFG.SPECIAL_TARGET_MINUTES + ' دقیقه (' + overS + '٪ بلندتر).');
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
      notes.push(rp.repeated + ' مورد بیش از یک بار در گزارش‌ها تکرار شده — یعنی اقدامِ ' +
                 'قبلی جواب نداده.');
    }
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

  if (problems.length) {
    var html = ['<div style="font-family:Tahoma;direction:rtl;text-align:right;line-height:2">',
      '<h2 style="color:#b45309">⚠️ موتور محتوا — ' + problems.length + ' ایراد</h2><ul>'];
    for (var q = 0; q < problems.length; q++) html.push('<li>' + esc_(problems[q]) + '</li>');
    html.push('</ul>');
    if (notes.length) {
      html.push('<h3>وضعیت</h3><ul>');
      for (var w = 0; w < notes.length; w++) html.push('<li>' + esc_(notes[w]) + '</li>');
      html.push('</ul>');
    }
    html.push('<p><a href="' + esc_(st.hubUrl) + '">باز کردن CONTENT-HUB</a> — ' +
              'تب «_گزارش» جزئیات کامل را دارد.</p></div>');
    try {
      MailApp.sendEmail({ to: CFG.EMAIL_TO, subject: '⚠️ موتور محتوا: ' + problems.length + ' ایراد',
                          htmlBody: html.join(''), name: 'موتور محتوای آرشیو' });
    } catch (e) { logLine_('ارسال ایمیل هشدار ناموفق: ' + e.message); }
  }

  var msg = (problems.length ? '⚠️ ' + problems.length + ' ایراد:\n• ' + problems.join('\n• ')
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
