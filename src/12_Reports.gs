/**
 * 12_Reports.gs — حلقهٔ بستهٔ «گزارش ← اقدام»
 *
 * ناظرِ روزانه (Cowork) هر روز آرشیو و آخرین قسمت را بررسی می‌کند و گزارشی
 * می‌نویسد. تا امروز آن گزارش فقط در ایمیل و در جلسهٔ Cowork می‌ماند و
 * خواندن و اجرا کردنش با شما بود. از این نسخه:
 *
 *   ۱) گزارش به‌شکل یک فایل کوچک JSON در فولدر OUTPUT نوشته می‌شود
 *      (Cowork نمی‌تواند مستقیم در شیت بنویسد — شیت از بیرون قابل نوشتن نیست).
 *   ۲) موتور آن فایل را برمی‌دارد و هر «مورد» را در یک ردیفِ جدا در تب
 *      «گزارش‌های نظارت» می‌نویسد، با تاریخ و ساعت دقیق و هر چیزی زیر ستونِ خودش.
 *   ۳) ستون «دستور برای مدل» عمداً به‌شکل پرامپت نوشته می‌شود: پیش از ساختِ
 *      هر قسمت، موتور موارد بازِ آن ستون را برمی‌دارد و عیناً به‌عنوان
 *      قاعدهٔ سخت به گزینش و نگارش تزریق می‌کند.
 *   ۴) پس از تولید، موتور جلوی همان ردیف می‌نویسد چه کرد و ردیف بسته می‌شود،
 *      پس دفعهٔ بعد دوباره روی همان کار نمی‌کند — مگر گزارشِ تازه‌ای دوباره
 *      همان ایراد را مطرح کند، که آن‌وقت ردیف با شمارندهٔ «تکرار» باز می‌شود.
 *   ۵) موردی که تغییرِ کد می‌خواهد از دستِ مدلِ داخل اسکریپت خارج است. آن ردیف
 *      «نیازمند تعویض کد» علامت می‌خورد و همان لحظه یک پیام تلگرام می‌آید،
 *      تا بروید کد تازه را از Cowork بردارید و جایگزین کنید.
 */

var REPORT_HEADERS = [
  'شناسه مورد', 'تاریخ گزارش', 'تاریخ ثبت', 'اولویت', 'دسته', 'عنوان', 'شرح',
  'دستور برای مدل', 'مسئول', 'وضعیت', 'اقدام انجام‌شده', 'زمان اقدام',
  'قسمت مرتبط', 'تکرار', 'آخرین تکرار', 'اثر انگشت', 'هشدار تلگرام'
];
var RC = { ID: 1, AT: 2, LOGGED: 3, PRI: 4, CAT: 5, TITLE: 6, DETAIL: 7, INSTR: 8,
           OWNER: 9, STATUS: 10, DONE: 11, DONE_AT: 12, EP: 13, SEEN: 14, LAST_SEEN: 15,
           FP: 16, TG: 17 };

var RST = { NEW: 'تازه', APPLIED: 'اعمال شد', NEEDS_CODE: 'نیازمند تعویض کد',
            INSTALLED: 'کد نصب شد — در انتظارِ تأییدِ ناظر',
            CLOSED: 'بسته شد', SKIPPED: 'نادیده گرفته شد' };
var ROWNER_ENGINE = 'موتور';
var ROWNER_CODE = 'کوورک (تغییر کد)';

// جمله‌هایی که یعنی «باید کد را عوض کنی». هر ردیفی که در تب گزارش‌ها نوشته
// شود و یکی از این‌ها را داشته باشد، همان لحظه پیام تلگرام می‌فرستد — فرقی
// نمی‌کند از گزارش Cowork آمده باشد یا از وارسیِ نسخهٔ کد.
var CODE_ALERT_PAT =
  /(تعویض کد|کد تازه|کد جدید|نسخهٔ تازهٔ کد|نسخه تازه کد|به‌روزرسانی کد|جایگزینی کد|نیازمند تغییر کد|replace the code)/;

// نشانِ «همین نشانه در خروجیِ همین قسمت دوباره دیده شد». فقط خودِ موتور
// (پاس وفاداری و وارسیِ کاملیِ متن) آن را می‌گذارد، و بستنِ دستور در پایانِ
// همان قسمت روی همین تکیه می‌کند.
var RECUR_MARK = 'دوباره دیده شد در قسمت ';

var REPORT_MAX_ROWS = 800;     // بیش از این، ردیف‌های بستهٔ قدیمی هرس می‌شوند
var CODE_ALERTS_PER_RUN = 3;   // بیش از این هشدار در یک اجرا فرستاده نمی‌شود

// یک بار در هر اجرا کافی است. پیش‌تر این نشانه روی خودِ شیء شیت گذاشته
// می‌شد، ولی getSheetByName هر بار شیء تازه‌ای می‌سازد؛ یعنی هر خواندنِ تب
// سه فرمان setNumberFormat روی هزار ردیف می‌فرستاد — از مسیرهایی که اصلاً
// قرار نبود چیزی بنویسند (مثل خلاصهٔ وضعیت داخل وارسیِ سلامت).
var _reportFmtDone = false;

function ensureReportTab_(hub) {
  var sh = ensureTab_(hub, CFG.REPORT_TAB, REPORT_HEADERS);
  if (!_reportFmtDone) {
    // ستون‌های تاریخ باید متن بمانند. وگرنه شیت آن‌ها را به Date تبدیل می‌کند و
    // مقایسهٔ «تازه‌ترین گزارش» بر اساس نام روز هفته انجام می‌شد.
    try {
      sh.getRange(1, RC.AT, sh.getMaxRows(), 2).setNumberFormat('@');       // تاریخ گزارش، تاریخ ثبت
      sh.getRange(1, RC.DONE_AT, sh.getMaxRows(), 1).setNumberFormat('@');
      sh.getRange(1, RC.LAST_SEEN, sh.getMaxRows(), 1).setNumberFormat('@');
    } catch (e) {}
    _reportFmtDone = true;
  }
  return sh;
}

// ------------------------------------------------------------- اثر انگشت

/**
 * اثر انگشتِ یک مورد: دسته + عنوانِ نرمال‌شده.
 * شرح هر روز کمی فرق می‌کند (عدد و نمونه عوض می‌شود) ولی عنوانِ ایراد ثابت
 * است؛ پس اثر انگشت روی عنوان بسته می‌شود تا «همان ایراد» شناخته شود.
 */
function reportFp_(f) {
  if (f.key) return 'k:' + txNorm(String(f.key));
  // عنوانِ کامل (نه هشت واژهٔ اولش) و با نگه‌داشتنِ رقم‌ها. با صافیِ قبلی،
  // «ایراد شمارهٔ ۳» و «ایراد شمارهٔ ۱۱» یک اثر انگشت می‌گرفتند و مورد دوم
  // بی‌صدا دور ریخته می‌شد.
  var t = txNorm(String(f.title || '')).replace(/[^؀-ۿa-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ').trim();
  var c = txNorm(String(f.category || '')).replace(/\s+/g, ' ').trim();
  if (!t) {
    // بی‌عنوان: از خودِ دستور اثر انگشت بساز، وگرنه همهٔ موردهای بی‌عنوان
    // یک اثر انگشت می‌گرفتند و فقط اولی ثبت می‌شد.
    t = txNorm(String(f.instruction || '')).replace(/[^؀-ۿa-z0-9 ]/g, ' ')
          .replace(/\s+/g, ' ').trim().slice(0, 120);
  }
  if (!t) t = 'بی‌عنوان ' + fpHash_(JSON.stringify(f));
  t = t.slice(0, 160);
  // «دسته» را ناظر خودش می‌نویسد و از روزی به روز دیگر کمی فرق می‌کند
  // («گزینش» ← «گزینش محتوا»). اگر در کلید بیاید، همان ایراد ردیف دومی
  // می‌گیرد و شمارندهٔ تکرار هیچ‌وقت بالا نمی‌رود. پس کلید فقط روی عنوان است.
  return t + '|' + fpHash_(t);
}

/** کلیدِ نسخهٔ قبلی (دسته + عنوان) — فقط برای پیدا کردنِ ردیف‌های قدیمی. */
function reportFpLegacy_(f) {
  if (f.key) return 'k:' + txNorm(String(f.key));
  var t = txNorm(String(f.title || '')).replace(/[^؀-ۿa-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ').trim();
  var c = txNorm(String(f.category || '')).replace(/\s+/g, ' ').trim();
  if (!t) {
    t = txNorm(String(f.instruction || '')).replace(/[^؀-ۿa-z0-9 ]/g, ' ')
          .replace(/\s+/g, ' ').trim().slice(0, 120);
  }
  if (!t) return '';
  return c + '|' + t.slice(0, 160) + '|' + fpHash_(c + '|' + t);
}

/** ردیفِ پیشینِ یک مورد: اول با کلیدِ تازه، بعد با کلیدِ قدیمی. */
function findPrevRow_(state, f, fp) {
  var prev = state.byFp[fp];
  if (prev) return prev;
  var lg = reportFpLegacy_(f);
  return (lg && lg !== fp) ? (state.byFp[lg] || null) : null;
}

/** درهم‌سازِ کوتاه و پایدار — برای اینکه دو عنوانِ بلندِ نزدیک‌به‌هم قاطی نشوند. */
function fpHash_(s) {
  var h = 5381;
  s = String(s || '');
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) & 0x7fffffff;
  return h.toString(36);
}

/** خواندن ردیف‌های موجود، کلیدشده با اثر انگشت. */
function loadReportRows_(hub) {
  var sh = ensureReportTab_(hub);
  var out = { byFp: {}, rows: [], sheet: sh, lastRow: sh.getLastRow() };
  if (sh.getLastRow() < 2) return out;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues();
  for (var i = 0; i < v.length; i++) {
    if (!v[i][RC.ID - 1]) continue;
    var rec = { row: i + 2, vals: v[i], fp: String(v[i][RC.FP - 1]) };
    out.rows.push(rec);
    if (rec.fp) out.byFp[rec.fp] = rec;   // آخرین ردیفِ هر اثر انگشت
  }
  return out;
}

// -------------------------------------------------------- برداشتن گزارش‌ها

/**
 * فایل‌های گزارشِ تازه را از فولدر OUTPUT برمی‌دارد.
 * پس از خواندن، نام فایل با پسوند «.ingested» علامت می‌خورد تا دوباره
 * برداشته نشود. (این فایل‌ها ساختهٔ خودِ ماست، نه شیت منبع.)
 */
function pendingReportFiles_() {
  var out = [];
  // اگر تغییر نامِ فایل به هر دلیلی نگیرد، همین سیاهه جلوی برداشتِ دوباره را
  // می‌گیرد. بی آن، یک گزارش هر دو ساعت دوباره خوانده می‌شد.
  // کلید، شناسهٔ فایل است نه نامش: ناظر ممکن است هر روز همان نامِ ثابت را
  // بنویسد (مثلاً _REPORT-latest.json) و در آن حالت کلیدِ نامی یعنی گزارش‌های
  // روزهای بعد هرگز خوانده نمی‌شدند. شناسه هم کوتاه و ثابت‌طول است، پس
  // سقفِ ۹ کیلوبایتیِ ویژگی‌های اسکریپت با نام‌های بلند پر نمی‌شود.
  var done = {};
  try {
    var raw = props_().getProperty(PK.REPORTS_DONE) || '';
    var arr = raw ? raw.split('|') : [];
    for (var d = 0; d < arr.length; d++) if (arr[d]) done[arr[d]] = true;
  } catch (e0) {}
  try {
    var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var it = folder.getFiles();
    while (it.hasNext()) {
      var f = it.next(), n = f.getName();
      if (n.indexOf(CFG.REPORT_FILE_PREFIX) !== 0) continue;
      if (n.indexOf('.ingested') !== -1) continue;
      var id = '';
      try { id = String(f.getId()); } catch (eId) { id = ''; }
      if (id && done[id]) continue;
      if (!id && done[n]) continue;        // بازگشت به کلیدِ نامی اگر شناسه نبود
      out.push(f);
    }
  } catch (e) { logLine_('خواندن فولدر گزارش‌ها ناموفق: ' + e.message); }
  out.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
  return out;
}

/** فایل خوانده‌شده را هم با تغییر نام و هم در سیاههٔ داخلی علامت می‌زند. */
function markReportDone_(file, suffix) {
  var n = '', id = '';
  try { n = file.getName(); } catch (e0) {}
  try { id = String(file.getId()); } catch (e1) {}
  try { if (n) file.setName(n + (suffix || '.ingested')); } catch (e) {}
  try {
    var raw = props_().getProperty(PK.REPORTS_DONE) || '';
    var arr = raw ? raw.split('|') : [];
    arr.push(id || n);
    if (arr.length > 60) arr = arr.slice(arr.length - 60);
    props_().setProperty(PK.REPORTS_DONE, arr.join('|'));
  } catch (e2) {}
}

/**
 * خطای گذرا هنگام نوشتنِ یک گزارش: فایل «خراب» علامت نمی‌خورد، فقط یک
 * نشانهٔ تلاش به نامش اضافه می‌شود. بعد از سه تلاشِ ناموفق کنار گذاشته
 * می‌شود تا حلقه گیر نکند.
 */
var REPORT_MAX_TRIES = 3;
function retryOrBury_(file, err) {
  var n = '';
  try { n = file.getName(); } catch (e0) { n = ''; }
  var tries = (String(n).match(/\.try/g) || []).length + 1;
  logLine_('گزارش «' + n + '» پردازش نشد (تلاش ' + tries + ' از ' +
           REPORT_MAX_TRIES + '): ' + err.message);
  if (tries >= REPORT_MAX_TRIES) { markReportDone_(file, '.ingested.bad'); return; }
  try { file.setName(n + '.try'); } catch (e1) {}
}

// بودجهٔ هشدارِ تعویض کد برای کلِ یک اجرا (نه هر فراخوانی). هر ردیفِ
// بازگشایی‌شده alertCodeRows_ را جداگانه صدا می‌زد، پس سقفِ محلی عملاً
// وجود نداشت و بیست‌وپنج بازگشایی یعنی بیست‌وپنج پیام و سی ثانیه خوابِ بی‌فایده.
var _codeAlertsSent = 0;
function resetCodeAlertBudget_() { _codeAlertsSent = 0; }

/** یک مورد را به ردیفِ تب تبدیل می‌کند. */
function reportRow_(rep, f, idx, fp) {
  var owner = (String(f.owner || '').indexOf('کد') !== -1) ? ROWNER_CODE : ROWNER_ENGINE;
  var status = (owner === ROWNER_CODE) ? RST.NEEDS_CODE : RST.NEW;
  var done = '', doneAt = '';
  // موردی که «دستور برای مدل» ندارد کارِ بازی نیست؛ فقط ثبتِ تاریخی است
  // (سرجمعِ گزارش، یادداشت اطلاعاتی). اگر «تازه» بماند، هیچ‌وقت بسته نمی‌شود
  // و هرسِ تب هرگز جا باز نمی‌کند — تب بی‌پایان بزرگ می‌شد.
  if (owner !== ROWNER_CODE && !String(f.instruction || '').trim()) {
    status = RST.CLOSED;
    done = 'ثبتِ اطلاعاتی — کاری لازم ندارد';
    doneAt = nowStr_();
  }
  // اگر ناظر خودش می‌داند این مورد قبلاً برطرف شده (مثلاً در نسخهٔ تازهٔ کد)،
  // ردیف به‌عنوان تاریخچه ثبت می‌شود، نه کارِ باز.
  if (f.resolvedIn) {
    status = RST.APPLIED;
    done = 'در ' + String(f.resolvedIn) + ' برطرف شد' + (f.doneNote ? ' — ' + f.doneNote : '');
    doneAt = nowStr_();
  }
  var id = String(rep.reportId || 'RPT') + '#' + (idx + 1);
  return [id, String(rep.at || nowStr_()), nowStr_(),
          String(f.priority || 'متوسط'), String(f.category || 'عمومی'),
          String(f.title || '').slice(0, 300), String(f.detail || '').slice(0, 2000),
          String(f.instruction || '').slice(0, 1500), owner, status, done, doneAt,
          rep.episode || '', 1, String(rep.at || nowStr_()), fp, ''];
}

/**
 * برداشتنِ همهٔ گزارش‌های تازه و نوشتنشان در تب.
 * منطق ضدتکرار:
 *   • اثر انگشتِ تازه            → ردیف تازه
 *   • اثر انگشتِ تکراری و ردیفِ باز → فقط شمارندهٔ «تکرار» و «آخرین تکرار»
 *   • اثر انگشتِ تکراری و ردیفِ بسته با گزارشِ تازه‌تر از زمانِ اقدام
 *                                → دوباره باز می‌شود («تازه (تکرار)»)
 */
function ingestReports_(hub, deadline) {
  hub = hub || getHub_();
  var files = pendingReportFiles_();
  if (!files.length) return { files: 0, added: 0, repeated: 0, reopened: 0, codeItems: 0 };

  // این تابع از انتهای همگام‌سازی هم صدا زده می‌شود، یعنی وقتی بیشترِ سقفِ
  // شش‌دقیقه‌ای خرج شده. بی مهلت، چند فایلِ گزارش با چند هشدار تلگرام
  // (که هرکدام تا نود ثانیه عقب‌نشینیِ ۴۲۹ دارد) اجرا را می‌کشتند و
  // checkCodeUpdate_ و writeStatus_ بعدش هرگز اجرا نمی‌شدند.
  var stopAt = deadline || (new Date().getTime() + 90 * 1000);
  resetCodeAlertBudget_();

  var state = loadReportRows_(hub);
  var sh = state.sheet;
  var added = 0, repeated = 0, reopened = 0, codeItems = 0, done = 0;

  for (var i = 0; i < files.length; i++) {
    if (new Date().getTime() > stopAt) {
      logLine_('برداشت گزارش‌ها: ' + (files.length - i) +
               ' فایل به اجرای بعد موکول شد (مهلتِ این اجرا تمام شد).');
      break;
    }
    // هر فایل جداگانه و کامل پردازش می‌شود: خوانده، نوشته، و تازه بعدش
    // «خوانده‌شده» علامت می‌خورد. پیش‌تر همهٔ فایل‌ها با هم پردازش و نوشتن
    // در آخر انجام می‌شد؛ یک خطا وسط کار یعنی موردهای خوانده‌شده دور ریخته
    // می‌شدند در حالی که فایلشان مصرف‌شده علامت خورده بود — و فایلِ خراب هم
    // هر اجرا دوباره خطا می‌داد و کلِ حلقه برای همیشه می‌ایستاد.
    var r = null;
    try {
      r = ingestOneReport_(hub, sh, state, files[i]);
    } catch (eOne) {
      // خطاهای ساختاری داخلِ ingestOneReport_ خودشان رسیدگی می‌شوند؛ این‌جا
      // فقط خطاهای گذرا می‌رسند (وقفهٔ سرویس شیت، شکستِ setValues). آن‌ها
      // نباید گزارشِ سالمِ آن روز را برای همیشه بسوزانند: دو بار دیگر تلاش
      // می‌شود و تازه بعدش «خراب» علامت می‌خورد.
      retryOrBury_(files[i], eOne);
      continue;
    }
    added += r.added; repeated += r.repeated; reopened += r.reopened; codeItems += r.codeItems;
    done++;
  }
  // هشدارهایی که دفعهٔ قبل نرسیدند، دوباره تلاش می‌شوند
  try { retryFailedCodeAlerts_(hub, sh); } catch (eRt) {}
  // پس از پردازشِ همهٔ فایل‌ها، تب هرس می‌شود (نه بین فایل‌ها)
  try { pruneReportTab_(sh); } catch (ePr) { logLine_('هرس تب گزارش‌ها ناموفق: ' + ePr.message); }

  logLine_('گزارش نظارت: ' + done + ' فایل خوانده شد — ' + added + ' مورد تازه، ' +
           repeated + ' تکرار، ' + reopened + ' بازگشایی' +
           (codeItems ? '، ' + codeItems + ' مورد نیازمند تعویض کد' : '') + '.');
  return { files: done, added: added, repeated: repeated,
           reopened: reopened, codeItems: codeItems };
}

/** یک فایل گزارش: خواندن، نوشتن، و تنها در صورت موفقیت علامت‌زدن. */
function ingestOneReport_(hub, sh, state, file) {
  var out = { added: 0, repeated: 0, reopened: 0, codeItems: 0 };
  var rep;
  try { rep = JSON.parse(file.getBlob().getDataAsString()); }
  catch (e) {
    logLine_('گزارش «' + file.getName() + '» خوانده نشد: ' + e.message);
    markReportDone_(file, '.ingested.bad');
    return out;
  }
  if (!rep || typeof rep !== 'object' || Object.prototype.toString.call(rep) === '[object Array]') {
    logLine_('گزارش «' + file.getName() + '» ساختار درستی ندارد؛ رد شد.');
    markReportDone_(file, '.ingested.bad');
    return out;
  }
  var findings = rep.findings;
  if (Object.prototype.toString.call(findings) !== '[object Array]') {
    logLine_('گزارش «' + file.getName() + '» فیلد findings به‌شکل فهرست ندارد؛ رد شد.');
    markReportDone_(file, '.ingested.bad');
    return out;
  }

  // خطِ سرجمعِ گزارش هم ثبت می‌شود، وگرنه «ثبتِ کاملِ گزارش» ناقص می‌ماند
  var all = findings.slice();
  if (rep.summary) {
    all.unshift({ priority: 'اطلاعاتی', category: 'اطلاعاتی',
                  key: 'summary-' + String(rep.reportId || rep.at || ''),
                  title: 'سرجمعِ گزارش ' + String(rep.at || ''),
                  detail: String(rep.summary), instruction: '', owner: 'موتور' });
  }

  var add = [], seenHere = {};
  for (var j = 0; j < all.length; j++) {
    var f = all[j];
    if (!f || typeof f !== 'object') continue;
    if (!f.title && !f.instruction && !f.detail) continue;
    var fp = reportFp_(f);
    var prev = findPrevRow_(state, f, fp);

    if (prev) {
      if (seenHere[fp]) continue;           // همان مورد دو بار در همین فایل
      seenHere[fp] = true;
      var res = touchExisting_(sh, prev, rep, f);
      if (res === 'reopen') out.reopened++; else out.repeated++;
      continue;
    }
    if (seenHere[fp]) continue;
    seenHere[fp] = true;
    var row = reportRow_(rep, f, j, fp);
    if (String(row[RC.STATUS - 1]) === RST.NEEDS_CODE) out.codeItems++;
    add.push(row);
    out.added++;
  }

  if (add.length) {
    var start = sh.getLastRow() + 1;
    var need = (start + add.length - 1) - sh.getMaxRows();
    if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
    sh.getRange(start, 1, add.length, REPORT_HEADERS.length).setValues(add);
    // ردیف‌های تازه باید فوراً در نقشهٔ اثر انگشت بنشینند، وگرنه فایلِ بعدی
    // در همین اجرا برایشان ردیف دوم می‌ساخت.
    for (var a = 0; a < add.length; a++) {
      var recNew = { row: start + a, vals: add[a], fp: String(add[a][RC.FP - 1]) };
      state.rows.push(recNew);
      state.byFp[recNew.fp] = recNew;
    }
    alertCodeRows_(hub, start, add, sh);
  }
  markReportDone_(file, '.ingested');
  // هرس این‌جا انجام نمی‌شود: حذفِ ردیف شماره‌ها را جابه‌جا می‌کند و نقشهٔ
  // state که فایلِ بعدیِ همین اجرا با آن کار می‌کند، به ردیف‌های غلط اشاره
  // می‌کرد. هرس یک بار در پایانِ همهٔ فایل‌ها انجام می‌شود.
  return out;
}

/**
 * موردی که قبلاً ردیف دارد.
 * دو نکتهٔ مهم:
 *   • متنِ تازه جایگزین می‌شود. پیش‌تر وقتی ردیف باز بود فقط شمارنده بالا
 *     می‌رفت و شرح و دستورِ تازه دور ریخته می‌شد.
 *   • ردیفی که مالکش «کد» است، هنگام بازگشایی همان «نیازمند تعویض کد» می‌ماند
 *     — وگرنه از شمارشِ کارهای کد بیرون می‌افتاد، هشدار تلگرامش نمی‌رفت، و
 *     در «باز» می‌نشست که هیچ‌وقت پاک نمی‌شد.
 */
function touchExisting_(sh, prev, rep, f) {
  var st = String(prev.vals[RC.STATUS - 1]);
  var isCode = String(prev.vals[RC.OWNER - 1]) === ROWNER_CODE;

  // ردیفی که شما دستی «نادیده گرفته شد» کرده‌اید، دیگر باز نمی‌شود — فقط
  // شمارنده‌اش بالا می‌رود. وگرنه هیچ راهی برای خاموش کردنِ یک موردِ نادرست
  // نبود و هر گزارشِ بعدی دوباره به پرامپت تزریقش می‌کرد.
  if (st === RST.SKIPPED) {
    prev.vals[RC.SEEN - 1] = (Number(prev.vals[RC.SEEN - 1]) || 1) + 1;
    var lsSk = String(rep.at || nowStr_());
    if (parseWhen_(lsSk) >= parseWhen_(String(prev.vals[RC.LAST_SEEN - 1] || '')) ||
        !String(prev.vals[RC.LAST_SEEN - 1] || '')) prev.vals[RC.LAST_SEEN - 1] = lsSk;
    try { sh.getRange(prev.row, 1, 1, REPORT_HEADERS.length).setValues([prev.vals]); } catch (eSk) {}
    return 'repeat';
  }
  var doneAt = parseWhen_(prev.vals[RC.DONE_AT - 1]);
  var repAt = parseWhen_(rep.at || nowStr_());
  var isOpen = (st === RST.NEW || st === RST.NEEDS_CODE || st.indexOf('تکرار') !== -1);

  prev.vals[RC.SEEN - 1] = (Number(prev.vals[RC.SEEN - 1]) || 1) + 1;
  // «آخرین تکرار» فقط جلو می‌رود؛ گزارشِ قدیمی نباید تاریخ را عقب بکشد
  var prevSeen = parseWhen_(prev.vals[RC.LAST_SEEN - 1]);
  if (isNaN(prevSeen) || isNaN(repAt) || repAt >= prevSeen) {
    prev.vals[RC.LAST_SEEN - 1] = String(rep.at || nowStr_());
  }
  if (f.detail) prev.vals[RC.DETAIL - 1] = String(f.detail).slice(0, 2000);
  if (f.instruction) prev.vals[RC.INSTR - 1] = String(f.instruction).slice(0, 1500);
  if (f.priority) prev.vals[RC.PRI - 1] = String(f.priority);

  var verdict = 'repeat';
  if (!isOpen && (isNaN(doneAt) || isNaN(repAt) || repAt > doneAt)) {
    prev.vals[RC.STATUS - 1] = isCode ? RST.NEEDS_CODE : (RST.NEW + ' (تکرار)');
    prev.vals[RC.DONE - 1] = 'بازگشایی شد — ایراد دوباره گزارش شد (' +
                             String(rep.at || nowStr_()) + ')';
    prev.vals[RC.TG - 1] = '';        // هشدار تازه لازم است
    verdict = 'reopen';
  }
  sh.getRange(prev.row, 1, 1, REPORT_HEADERS.length).setValues([prev.vals]);
  if (verdict === 'reopen') alertCodeRows_(null, prev.row, [prev.vals], sh);
  return verdict;
}

/** تب گزارش‌ها نباید بی‌مرز رشد کند؛ قدیمی‌ترینِ ردیف‌های بسته هرس می‌شوند. */
function pruneReportTab_(sh) {
  var last = sh.getLastRow();
  if (last - 1 <= REPORT_MAX_ROWS) return;
  var v = sh.getRange(2, 1, last - 1, REPORT_HEADERS.length).getValues();
  var keep = [], closed = [];
  for (var i = 0; i < v.length; i++) {
    var st = String(v[i][RC.STATUS - 1]);
    if (st === RST.APPLIED || st === RST.CLOSED || st === RST.SKIPPED) closed.push(v[i]);
    else keep.push(v[i]);
  }
  var room = REPORT_MAX_ROWS - keep.length;
  if (room > 0) keep = closed.slice(Math.max(0, closed.length - room)).concat(keep);
  else if (closed.length) {
    logLine_('هشدار: ' + keep.length + ' ردیفِ باز در تب گزارش‌ها از سقف ' +
             REPORT_MAX_ROWS + ' گذشته؛ ردیف‌های باز حذف نمی‌شوند.');
  }
  // ترتیب زمانی حفظ شود
  keep.sort(function (a, b) {
    var x = parseWhen_(a[RC.LOGGED - 1]), y = parseWhen_(b[RC.LOGGED - 1]);
    if (isNaN(x) || isNaN(y)) return 0;
    return x - y;
  });
  sh.getRange(2, 1, keep.length, REPORT_HEADERS.length).setValues(keep);
  var tail = (last - 1) - keep.length;
  if (tail > 0) sh.getRange(2 + keep.length, 1, tail, REPORT_HEADERS.length).clearContent();
  logLine_('تب گزارش‌ها هرس شد: ' + tail + ' ردیفِ بستهٔ قدیمی حذف شد.');
}

// --------------------------------------------------- هشدار تلگرامِ تعویض کد

/**
 * هر ردیفِ تازه‌نوشته را وارسی می‌کند؛ اگر «باید کد عوض شود» بود، پیام
 * تلگرام می‌فرستد و ستون هشدار را پر می‌کند تا دوباره فرستاده نشود.
 */
function alertCodeRows_(hub, startRow, rows, shOpt) {
  var sh = shOpt || ensureReportTab_(hub || getHub_());
  var delivered = 0;      // فقط ارسال‌های موفق — خروجیِ تابع همین است
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    // فقط ارسالِ موفق جلوی تلاشِ دوباره را می‌گیرد. پیش‌تر «ناموفق» هم در
    // همین ستون می‌نشست و همان ردیف دیگر هرگز هشدار نمی‌گرفت.
    if (String(r[RC.TG - 1] || '').indexOf('ارسال شد') === 0) continue;
    var stt = String(r[RC.STATUS - 1]);
    if (stt === RST.APPLIED || stt === RST.CLOSED || stt === RST.SKIPPED) continue;

    // شرطِ هشدار: یا مالکِ ردیف «کد» است، یا خودِ عنوان/وضعیت/دستور می‌گوید
    // کد باید عوض شود. ستون «شرح» عمداً بیرون است — جمله‌ای مثل «با
    // به‌روزرسانی کد بهتر شد» در شرحِ یک ایرادِ عادی، هشدارِ الکی می‌ساخت.
    var isCode = String(r[RC.OWNER - 1]) === ROWNER_CODE || stt === RST.NEEDS_CODE;
    var says = CODE_ALERT_PAT.test([r[RC.STATUS - 1], r[RC.TITLE - 1], r[RC.INSTR - 1]].join(' '));
    if (!isCode && !says) continue;

    // سقفِ هر اجرا. بی این، بیست‌وپنج ردیفِ کد پشت‌سرهم پیام می‌فرستادند و
    // هر ۴۲۹ تلگرام تا سی ثانیه خواب می‌آورد — یعنی رد شدن از سقف شش دقیقه.
    if (_codeAlertsSent >= CODE_ALERTS_PER_RUN) {
      logLine_('هشدار تعویض کد: ' + (rows.length - i) +
               ' مورد دیگر ماند؛ در اجرای بعد فرستاده می‌شود.');
      break;
    }
    // مکث پیش از ارسالِ بعدی، نه بعد از آخری (خوابِ آخری هیچ فایده‌ای نداشت)
    if (_codeAlertsSent > 0) { try { Utilities.sleep(1200); } catch (e4) {} }

    var msg = '🛠 <b>کد موتور باید تعویض شود</b>\n\n' +
              '<b>' + tgEsc_(String(r[RC.TITLE - 1])) + '</b>\n' +
              tgEsc_(String(r[RC.DETAIL - 1]).slice(0, 600)) + '\n\n' +
              (r[RC.INSTR - 1] ? '<b>چه باید بشود:</b> ' +
                 tgEsc_(String(r[RC.INSTR - 1]).slice(0, 600)) + '\n\n' : '') +
              'فایل تازهٔ <code>موتور-محتوا.gs</code> را از Cowork بردارید، کل ' +
              '<code>Code.gs</code> را پاک کنید و آن را بچسبانید، و راهنمای نصب را بخوانید.\n' +
              'ردیف مربوطه: تب «' + tgEsc_(CFG.REPORT_TAB) + '» — شناسه ' +
              tgEsc_(String(r[RC.ID - 1]));
    // کانالِ واقعیِ ارسال در سلول نوشته می‌شود. پیش‌تر وقتی تلگرام نمی‌رسید و
    // ایمیلِ جانشین می‌رفت، همان «ارسال شد» ثبت می‌شد و از تب برنمی‌آمد که
    // پیام تلگرامی هرگز نرسیده است.
    var via = '';
    try { if (tgEnabled_() && tgSend_(msg)) via = 'تلگرام'; }
    catch (e) { logLine_('هشدار تلگرامِ تعویض کد نرفت: ' + e.message); }
    // اگر تلگرام تنظیم نشده یا نرسید، دست‌کم ایمیل بزن — این هشدار نباید گم شود
    if (!via) {
      try {
        MailApp.sendEmail({ to: CFG.EMAIL_TO, name: 'موتور محتوای آرشیو',
          subject: '🛠 کد موتور باید تعویض شود — ' + String(r[RC.TITLE - 1]).slice(0, 80),
          htmlBody: '<div style="font-family:Tahoma;direction:rtl;text-align:right;line-height:2">' +
                    msg.replace(/<\/?b>/g, '').replace(/\n/g, '<br>') + '</div>' });
        via = 'ایمیل (تلگرام نرسید)';
      } catch (e2) {}
    }
    r[RC.TG - 1] = (via ? 'ارسال شد از ' + via + ' ' : 'ناموفق ') + nowStr_();
    try { sh.getRange(startRow + i, RC.TG, 1, 1).setValue(r[RC.TG - 1]); } catch (e3) {}
    if (via) delivered++;
    _codeAlertsSent++;   // بودجه بر پایهٔ «تلاش» است، نه «موفقیت»
  }
  return delivered;
}

/**
 * هشدارهایی که قبلاً نرسیدند (تلگرام و ایمیل هر دو شکست خوردند) دوباره
 * فرستاده می‌شوند. بی این، یک قطعیِ گذرا یعنی «کد باید عوض شود» برای همیشه
 * گم می‌شد و شما هیچ‌وقت خبردار نمی‌شدید.
 */
function retryFailedCodeAlerts_(hub, shOpt) {
  var sh = shOpt || ensureReportTab_(hub || getHub_());
  if (sh.getLastRow() < 2) return 0;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues();
  var n = 0;
  for (var i = 0; i < v.length && _codeAlertsSent < CODE_ALERTS_PER_RUN; i++) {
    var r = v[i], tg = String(r[RC.TG - 1] || '');
    if (tg.indexOf('ارسال شد') === 0) continue;
    var stt = String(r[RC.STATUS - 1]);
    if (stt !== RST.NEEDS_CODE && String(r[RC.OWNER - 1]) !== ROWNER_CODE) continue;
    if (stt === RST.APPLIED || stt === RST.CLOSED || stt === RST.SKIPPED) continue;
    if (!tg) continue;                       // هنوز تلاشی نشده — کارِ همین اجرا نیست
    n += alertCodeRows_(hub, i + 2, [r], sh);
  }
  return n;
}

// ------------------------------------------------- وارسیِ نسخهٔ کد

/**
 * آیا نسخهٔ تازه‌ای از کد آماده شده؟
 * Cowork پس از ساختِ کد تازه، فایل _CODE-LATEST.json را در OUTPUT می‌نویسد.
 * موتور نسخهٔ خودش را با آن می‌سنجد و اگر عقب بود، ردیف ثبت و تلگرام می‌فرستد.
 */
/**
 * مقایسهٔ نسخه‌های نقطه‌دار: ۴٫۱۰ از ۴٫۹ جلوتر است (مقایسهٔ متنی برعکس می‌گفت).
 * خروجی: مثبت اگر a جلوتر، منفی اگر b جلوتر، صفر اگر برابر.
 */
function verCmp_(a, b) {
  var pa = String(a).replace(/[^0-9.]/g, '').split('.');
  var pb = String(b).replace(/[^0-9.]/g, '').split('.');
  var n = Math.max(pa.length, pb.length);
  for (var i = 0; i < n; i++) {
    var x = Number(pa[i] || 0), y = Number(pb[i] || 0);
    if (!isFinite(x)) x = 0;
    if (!isFinite(y)) y = 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

function checkCodeUpdate_(hub) {
  hub = hub || getHub_();
  // ممکن است چند فایل هم‌نام در فولدر باشد: ابزارِ Cowork فقط «ساختن» بلد است،
  // بازنویسی نه. پس همه را می‌خوانیم و جلوترین نسخه را برمی‌داریم — وگرنه
  // نسخهٔ قدیمیِ جامانده می‌توانست اعلامِ کدِ تازه را برای همیشه خفه کند.
  var info = null;
  try {
    var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var it = folder.getFilesByName(CFG.CODE_FILE), seen = 0;
    while (it.hasNext()) {
      var cf = it.next();
      seen++;
      if (seen > 10) break;
      var cand = null;
      try { cand = JSON.parse(cf.getBlob().getDataAsString()); } catch (eP) { continue; }
      if (!cand || !cand.version) continue;
      if (!info || verCmp_(String(cand.version), String(info.version)) > 0) info = cand;
    }
    if (!info) return null;
  } catch (e) { return null; }
  if (!info || !info.version) return null;
  if (String(info.version) === String(CFG.CODE_VERSION)) return null;
  // فقط جلوتر بودن مهم است. اگر فایل به هر دلیلی عقب‌تر بود (نسخهٔ قدیمی که
  // اشتباهی برگشته، یا کاربر کدِ تازه‌تری نصب کرده)، هشدارِ «کد را تعویض کن»
  // غلط است و کاربر را بی‌جا به‌سمتِ نسخهٔ عقب‌تر می‌فرستد.
  if (verCmp_(String(info.version), String(CFG.CODE_VERSION)) <= 0) return null;

  var seen = props_().getProperty(PK.CODE_SEEN) || '';
  if (seen === String(info.version)) return null;      // یک بار به ازای هر نسخه

  var fp = 'code-update|' + info.version;
  var state = loadReportRows_(hub);
  if (state.byFp[fp]) { props_().setProperty(PK.CODE_SEEN, String(info.version)); return null; }

  var sh = state.sheet;
  // آیا بستهٔ کامل ضمیمه است؟ (fileName/fileId + خودِ فایل در OUTPUT) — پیامِ
  // «کجا بروم و چه کنم» باید از همین‌جا دقیق شود، نه مبهمِ «کد ساخته شد».
  var pkgUrl = '', canAuto = false;
  try {
    if (info.fileName || info.fileId) {
      var pk0 = findCodePkg_(info);
      if (pk0 && pk0.file) { pkgUrl = pk0.file.getUrl(); canAuto = CFG.AUTOUPDATE_ENABLED !== false; }
    }
  } catch (ePk) {}
  var detail = String(info.summary || '').slice(0, 1800) +
               (pkgUrl ? '\nفایلِ کاملِ کد: ' + pkgUrl : '\n⚠ خودِ فایلِ کد ضمیمهٔ اعلان نیست.') +
               (info.sourceReportIds && info.sourceReportIds.length
                  ? '\nپاسخ به ردیف‌های: ' + info.sourceReportIds.join('، ') : '');
  var instr = canAuto
    ? 'نصبِ خودکار روشن است: موتور امشب ساعتِ ' + (CFG.UPDATE_HOUR || 2) +
      ' (دبی) خودش وارسی و نصبش می‌کند و بعدش پیامِ تأیید می‌فرستد. اگر عجله دارید: ' +
      'منو ← «بررسی و نصبِ کدِ تازه (همین حالا)».'
    : (pkgUrl
        ? 'فایل از لینکِ بالا برداشته و کامل جایگزینِ کدِ پروژه شود؛ یا برای نصبِ ' +
          'خودکار، اسکوپِ script.projects را طبقِ راهنمای نصب اضافه کنید.'
        : 'این اعلان بستهٔ کد ندارد؛ سازنده (ناظرِ Cowork) باید فایلِ کامل «_CODE-v' +
          info.version + '.gs» را با sha256 در OUTPUT بگذارد تا نصبِ خودکار ممکن شود.');
  var row = ['CODE-' + info.version, String(info.releasedAt || nowStr_()), nowStr_(),
             'جدی', 'کد اسکریپت',
             'نسخهٔ تازهٔ کد آماده است (' + CFG.CODE_VERSION + ' ← ' + info.version + ')' +
               (canAuto ? ' — نصبِ خودکار امشب' : ''),
             detail, instr,
             ROWNER_CODE, RST.NEEDS_CODE, '', '', '', 1, nowStr_(), fp, ''];
  var start = sh.getLastRow() + 1;
  var need = start - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
  sh.getRange(start, 1, 1, REPORT_HEADERS.length).setValues([row]);
  var delivered = alertCodeRows_(hub, start, [row], sh);
  // «دیده شد» فقط وقتی ثبت می‌شود که هشدار واقعاً رسیده باشد؛ وگرنه یک
  // قطعیِ گذرا یعنی این نسخه هرگز دوباره اعلام نمی‌شد.
  if (delivered) props_().setProperty(PK.CODE_SEEN, String(info.version));
  logLine_('نسخهٔ تازهٔ کد اعلام شد: ' + CFG.CODE_VERSION + ' ← ' + info.version +
           (delivered ? '' : ' (هشدار نرسید؛ اجرای بعد دوباره تلاش می‌شود)'));
  return { from: CFG.CODE_VERSION, to: info.version };
}

// ------------------------------------------- تزریق دستورها به پرامپت قسمت

/**
 * موارد بازِ مربوط به مدل. خروجی همان چیزی است که به پرامپت تزریق می‌شود.
 * موارد «نیازمند تعویض کد» این‌جا نمی‌آیند — مدل نمی‌تواند کاری‌شان بکند.
 */
function openInstructions_(hub, max) {
  var out = [];
  try {
    var st = loadReportRows_(hub);
    for (var i = 0; i < st.rows.length; i++) {
      var v = st.rows[i].vals;
      var status = String(v[RC.STATUS - 1]);
      if (status !== RST.NEW && status.indexOf('تکرار') === -1) continue;
      if (String(v[RC.OWNER - 1]) === ROWNER_CODE) continue;
      var instr = String(v[RC.INSTR - 1] || '').trim();
      if (!instr) continue;
      out.push({ row: st.rows[i].row, id: String(v[RC.ID - 1]),
                 pri: String(v[RC.PRI - 1]), cat: String(v[RC.CAT - 1]),
                 title: String(v[RC.TITLE - 1]), instruction: instr,
                 // برای بستنِ امنِ ردیف پس از انتشار: اثر انگشت تا اگر ردیف
                 // جابه‌جا شده بود ردیفِ دیگری بسته نشود، و شمارندهٔ تکرار تا
                 // اگر همان نشانه در همین قسمت دوباره دیده شد، باز بماند.
                 fp: String(v[RC.FP - 1] || ''),
                 seen: Number(v[RC.SEEN - 1]) || 1 });
    }
  } catch (e) { logLine_('خواندن دستورهای گزارش ناموفق: ' + e.message); }

  // «جدی» اول می‌آید؛ اگر تعداد زیاد شد، بقیه به قسمت بعد می‌مانند
  var rank = { 'جدی': 0, 'متوسط': 1, 'جزئی': 2, 'پیشنهاد': 3 };
  var rk = function (p) { return rank[p] === undefined ? 2 : rank[p]; };
  out.sort(function (a, b) {
    if (rk(a.pri) !== rk(b.pri)) return rk(a.pri) - rk(b.pri);
    if (a.seen !== b.seen) return b.seen - a.seen;   // آنچه تکرار شده، جلوتر
    return a.row - b.row;                            // بعد قدیمی‌ترین
  });

  var cap = max || CFG.MAX_OPEN_INSTRUCTIONS;
  if (out.length <= cap) return out;

  // اگر همیشه بیش از سقف موردِ «جدی» باز باشد، موردهای کم‌اولویت هرگز نوبت
  // نمی‌گیرند و تا ابد باز می‌مانند. پس دو جای آخر برای قدیمی‌ترین موردهایی
  // کنار گذاشته می‌شود که در برشِ اولویتی جا نمانده‌اند.
  var reserve = Math.min(2, Math.max(0, cap - 1));
  var head = out.slice(0, cap - reserve);
  var inHead = {};
  for (var h = 0; h < head.length; h++) inHead[head[h].row] = true;
  var rest = out.filter(function (x) { return !inHead[x.row]; })
                .sort(function (a, b) { return a.row - b.row; });
  return head.concat(rest.slice(0, reserve));
}

/** بلوکِ متنیِ آماده برای چسباندن به پرامپت. */
function instructionBlock_(list, heading) {
  if (!list || !list.length) return '';
  var L = [heading || 'اصلاح‌های خواسته‌شده از بازبینیِ قسمت قبل (این‌ها قاعدهٔ سخت‌اند):'];
  for (var i = 0; i < list.length; i++) {
    L.push('• [' + list[i].pri + '] ' + list[i].instruction);
  }
  L.push('این اصلاح‌ها بر همهٔ قاعده‌های عمومی مقدم‌اند.');
  L.push('');
  return L.join('\n');
}

/**
 * پس از انتشارِ قسمت: جلوی هر ردیف بنویس چه شد.
 * سه محافظ دارد:
 *   • ردیف دوباره خوانده می‌شود و اثر انگشتش سنجیده می‌شود — اگر تب بین
 *     تزریق و انتشار هرس شده باشد، شمارهٔ ردیف دیگر همان مورد نیست.
 *   • اگر شمارندهٔ «تکرار» از زمان تزریق بالا رفته باشد، یعنی همان نشانه در
 *     خروجیِ همین قسمت دوباره دیده شده؛ ردیف باز می‌ماند تا قسمت بعد هم
 *     دستورش تزریق شود. بی این محافظ، اصلاح فقط یک قسمت در میان می‌رسید.
 *   • ردیفی که وضعیتش دستی عوض شده (مثلاً «نیازمند تعویض کد») دست نمی‌خورد.
 */
function markInstructionsApplied_(hub, list, epNum, note) {
  if (!list || !list.length) return;
  try {
    var st = loadReportRows_(hub);
    var sh = st.sheet;
    var closed = 0, kept = 0, skipped = 0;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o || !o.row) continue;
      var row = o.row, cur = null;
      try { cur = sh.getRange(row, 1, 1, REPORT_HEADERS.length).getValues()[0]; }
      catch (eR) { cur = null; }
      // اگر تب بین تزریق و انتشار هرس شده باشد، شماره‌ها جابه‌جا شده‌اند.
      // به‌جای رد کردنِ ردیف (که یعنی دستور تا ابد باز می‌ماند)، همان اثر
      // انگشت را در تب پیدا می‌کنیم.
      var fpOk = cur && cur[RC.ID - 1] && o.fp &&
                 String(cur[RC.FP - 1] || '') === String(o.fp);
      if (!fpOk && o.fp && st.byFp[o.fp]) {
        var alt = st.byFp[o.fp];
        row = alt.row; cur = alt.vals; fpOk = true;
      }
      if (!fpOk) { skipped++; continue; }
      if (String(cur[RC.OWNER - 1]) === ROWNER_CODE ||
          String(cur[RC.STATUS - 1]) === RST.NEEDS_CODE) { skipped++; continue; }
      var stNow = String(cur[RC.STATUS - 1]);
      if (stNow === RST.APPLIED || stNow === RST.CLOSED || stNow === RST.SKIPPED) {
        skipped++; continue;                 // کسی زودتر بسته یا نادیده‌اش گرفته
      }

      // «باز می‌ماند» فقط وقتی که خودِ موتور همان نشانه را در خروجیِ همین
      // قسمت دوباره دیده باشد — نشانش را logSelfFinding_ گذاشته است.
      // سنجیدنِ شمارندهٔ «تکرار» غلط بود: هر گزارشِ روزانهٔ تازه هم آن را بالا
      // می‌برد و دستور هیچ‌وقت بسته نمی‌شد. ستون «قسمت مرتبط» هم امن نیست،
      // چون گزارشِ ناظر خودش شمارهٔ قسمتِ بازبینی‌شده را در آن می‌نویسد.
      if (String(cur[RC.DONE - 1] || '') === RECUR_MARK + epNum) {
        // چهار ستونِ وضعیت/اقدام/زمان/قسمت کنار هم‌اند، پس یک نوشتن به‌جای چهار
        sh.getRange(row, RC.STATUS, 1, 4).setValues([[
          stNow || RST.NEW,
          'در قسمت ' + epNum + ' تزریق شد اما همان نشانه دوباره دیده شد؛ باز می‌ماند.',
          nowStr_(), epNum]]);
        kept++;
        continue;
      }
      sh.getRange(row, RC.STATUS, 1, 4).setValues([[
        RST.APPLIED,
        (note || 'به‌عنوان قاعدهٔ سخت به پرامپت گزینش و نگارش تزریق شد') + ' — قسمت ' + epNum,
        nowStr_(), epNum]]);
      closed++;
    }
    logLine_('گزارش: در قسمت ' + epNum + ' — ' + closed + ' دستور بسته شد' +
             (kept ? '، ' + kept + ' مورد به‌دلیل تکرارِ همان نشانه باز ماند' : '') +
             (skipped ? '، ' + skipped + ' ردیف رد شد' : '') + '.');
  } catch (e) { logLine_('بستنِ دستورهای گزارش ناموفق: ' + e.message); }
}

/** موردی که خودِ موتور پیدا کرده (نه Cowork) را در همان تب ثبت می‌کند. */
function logSelfFinding_(hub, f) {
  try {
    hub = hub || getHub_();
    var fp = reportFp_(f);
    var st = loadReportRows_(hub);
    var prev = findPrevRow_(st, f, fp);
    var sh = st.sheet;
    if (prev) {
      var stt = String(prev.vals[RC.STATUS - 1]);
      if (stt === RST.SKIPPED) return;       // شما دستی خاموشش کرده‌اید
      prev.vals[RC.SEEN - 1] = (Number(prev.vals[RC.SEEN - 1]) || 1) + 1;
      prev.vals[RC.LAST_SEEN - 1] = nowStr_();
      // نشانِ تکرار در همین قسمت. بستنِ دستور در پایانِ قسمت روی همین تکیه
      // می‌کند، نه روی شمارندهٔ «تکرار» که گزارش‌های روزانه هم بالایش می‌برند.
      if (f.episode) {
        prev.vals[RC.DONE - 1] = RECUR_MARK + f.episode;
        prev.vals[RC.DONE_AT - 1] = nowStr_();
      }
      if (stt === RST.APPLIED || stt === RST.CLOSED) prev.vals[RC.STATUS - 1] = RST.NEW + ' (تکرار)';
      sh.getRange(prev.row, 1, 1, REPORT_HEADERS.length).setValues([prev.vals]);
      return;
    }
    var row = reportRow_({ reportId: 'ENG-' + Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyyMMdd-HHmm'),
                           at: nowStr_(), episode: f.episode || '' }, f, 0, fp);
    // دو یافتهٔ موتور در یک دقیقه شناسهٔ یکسان می‌گرفتند («…#1»)؛ کلیدِ یافته
    // را در شناسه می‌آوریم تا در تب قابل ارجاع باشد.
    // کلیدهای بلند (مثلاً «sp-series-unreadable:<نام دوره>») پس از پاک‌سازی و
    // بریدن در ۲۴ نویسه به هم می‌رسیدند و دو یافتهٔ متفاوت شناسهٔ یکسان می‌گرفتند.
    var idKey = String(f.key || '').replace(/[^A-Za-z0-9-]/g, '');
    if (idKey.length > 24) idKey = idKey.slice(0, 18) + '-' + fpHash_(fp).slice(0, 5);
    row[RC.ID - 1] = String(row[RC.ID - 1]).replace(/#\d+$/, '#' + (idKey || fpHash_(fp)));
    var start = sh.getLastRow() + 1;
    var need = start - sh.getMaxRows();
    if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
    sh.getRange(start, 1, 1, REPORT_HEADERS.length).setValues([row]);
    alertCodeRows_(hub, start, [row]);
  } catch (e) { logLine_('ثبت یافتهٔ خودِ موتور ناموفق: ' + e.message); }
}

/** خلاصهٔ تب گزارش‌ها برای فایل وضعیت و برای ناظر روزانه. */
function reportSummary_(hub) {
  var out = { total: 0, open: 0, info: 0, applied: 0, needsCode: 0, repeated: 0,
              openItems: [], codeItems: [], lastReportAt: '' };
  try {
    var st = loadReportRows_(hub);
    out.total = st.rows.length;
    for (var i = 0; i < st.rows.length; i++) {
      var v = st.rows[i].vals, s = String(v[RC.STATUS - 1]);
      var at = String(v[RC.AT - 1]);
      if (at > out.lastReportAt) out.lastReportAt = at;
      if ((Number(v[RC.SEEN - 1]) || 1) > 1) out.repeated++;
      // ردیفِ بی‌دستور صرفاً ثبتِ تاریخی است (سرجمعِ گزارش، یادداشت). بسته
      // ثبت می‌شود تا هرس بتواند جا باز کند، ولی در شمارش «اعمال شد» نمی‌آید.
      if (s === RST.APPLIED || s === RST.CLOSED) {
        if (!String(v[RC.INSTR - 1] || '').trim()) out.info++; else out.applied++;
        continue;
      }
      if (s === RST.NEEDS_CODE) {
        out.needsCode++;
        out.codeItems.push({ id: String(v[RC.ID - 1]), title: String(v[RC.TITLE - 1]),
                             at: at, telegram: String(v[RC.TG - 1]) });
        continue;
      }
      if (s === RST.SKIPPED) continue;
      // موردی که «دستور برای مدل» ندارد صرفاً اطلاعاتی است؛ کاری برای انجام
      // ندارد، پس نباید در شمارِ «در انتظار اقدام» بیاید.
      if (!String(v[RC.INSTR - 1] || '').trim()) { out.info++; continue; }
      out.open++;
      out.openItems.push({ id: String(v[RC.ID - 1]), pri: String(v[RC.PRI - 1]),
                           cat: String(v[RC.CAT - 1]), title: String(v[RC.TITLE - 1]),
                           seen: Number(v[RC.SEEN - 1]) || 1 });
    }
  } catch (e) {}
  return out;
}

/** اجرای دستی از منو. */
function runIngestReports() {
  var hub = getHub_();
  var r = ingestReports_(hub);
  var c = checkCodeUpdate_(hub);
  var s = reportSummary_(hub);
  var m = 'گزارش‌های خوانده‌شده: ' + r.files + '\n' +
          'مورد تازه: ' + r.added + ' · تکرار: ' + r.repeated + ' · بازگشایی: ' + r.reopened + '\n\n' +
          'باز و در انتظار اقدامِ مدل: ' + s.open + '\n' +
          'نیازمند تعویض کد: ' + s.needsCode + '\n' +
          'اعمال‌شده تا امروز: ' + s.applied +
          (c ? '\n\n⚠️ نسخهٔ تازهٔ کد آماده است: ' + c.from + ' ← ' + c.to : '');
  var ui = ui_(); if (ui) ui.alert('گزارش‌های نظارت', m, ui.ButtonSet.OK); else console.log(m);
  return { ingest: r, code: c, summary: s };
}
