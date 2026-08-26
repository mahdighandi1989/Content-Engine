/**
 * 17_Backup.gs — پشتیبان‌گیریِ شبانه از شیت‌ها
 *
 * هر شب یک رونوشتِ کاملِ شش شیت گرفته می‌شود: پنج شیتِ منبع (که تغذیهٔ سامانه‌اند)
 * و خودِ CONTENT-HUB. رونوشت‌ها در پوشهٔ پشتیبان، در یک زیرپوشهٔ تاریخ‌دار
 * می‌نشینند، همراه با یک فهرستِ خوانا و یک فایلِ JSON برای ارجاعِ ماشینی.
 *
 * قاعده‌های سختِ این بخش:
 *   • شیت‌های منبع فقط «خوانده» و «رونوشت» می‌شوند. نه نامشان عوض می‌شود، نه
 *     محتوایشان، نه جای‌شان. رونوشت‌گیری هیچ چیزی در خودِ فایلِ مبدأ نمی‌نویسد.
 *   • فقط داخلِ پوشهٔ پشتیبان نوشته می‌شود.
 *   • رونوشتِ قدیمی‌تر از سقفِ نگه‌داری، خودش پاک می‌شود تا درایو پر نشود.
 *   • کارِ سنگین است، پس مرحله‌مرحله انجام می‌شود: هر اجرا چند شیت، و اگر
 *     مهلتِ اجرا تمام شد، ادامه‌اش با یک تریگرِ خودکار چند دقیقه بعد.
 *   • در پایان، پیام تلگرام با مشخصاتِ دقیق: هر شیت چه نوع محتوایی دارد،
 *     نشانیِ خودِ شیت، و نشانیِ رونوشتش.
 */

var BACKUP_MANIFEST = '_فهرست-پشتیبان.json';

/** فهرستِ چیزهایی که پشتیبان گرفته می‌شود، با توضیحِ نوعِ محتوا. */
function backupTargets_() {
  var out = [];
  for (var i = 0; i < CFG.SOURCES.length; i++) {
    var s = CFG.SOURCES[i];
    out.push({ id: s.id, title: s.title, key: s.key, role: 'منبعِ تغذیه',
               about: backupAbout_(s.key) });
  }
  var hubId = '';
  try { hubId = getHub_().getId(); } catch (e) {}
  if (hubId) {
    out.push({ id: hubId, title: CFG.HUB_FILE_NAME, key: 'hub', role: 'بانکِ ساخته‌شده',
               about: 'بانک محتوای دسته‌بندی‌شده، تبِ پادکست‌ها، رجیستریِ مجموعه‌های ' +
                      'آموزشی، گزارش‌ها و مکان‌نماها — خروجیِ خودِ موتور.' });
  }
  return out;
}

function backupAbout_(key) {
  if (key === 'video') return 'تحلیلِ ویدیوها: پیاده‌سازیِ گفتار، اشخاص، فضا و وایب، تحلیل تخصصی.';
  if (key === 'photo') return 'تحلیلِ عکس‌ها: متنِ استخراج‌شده، اشخاص، مکان، تحلیل محتوا و فنی.';
  if (key === 'trading') return 'شیتِ چندتبیِ ترید و فارکس: ویدیو و صدا و سندِ آموزشیِ بازار، ' +
                                'استراتژی‌ها، اندیکاتورها، الگوهای نموداری.';
  if (key === 'general') return 'شیتِ چندتبیِ عمومی: سندها و کتاب‌ها، متنِ کاملِ استخراج‌شده، ' +
                                'ایده‌های محوری، اصطلاح‌نامه.';
  if (key === 'resvid') return 'شیتِ چندتبیِ ویدیوهای تازه: تحلیلِ صدا و تصویر و محتوا.';
  return 'منبعِ خواندنیِ سامانه.';
}

/** پوشهٔ پشتیبان، و زیرپوشهٔ همین دور. */
function backupRoot_() {
  return DriveApp.getFolderById(CFG.BACKUP_FOLDER_ID);
}

function backupFolderName_(when) {
  var d = when || new Date();
  return 'پشتیبان — ' + Utilities.formatDate(d, CFG.TIMEZONE, 'yyyy-MM-dd — HH-mm');
}

/**
 * یک دورِ پشتیبان‌گیری. اگر کارِ نیمه‌تمامی مانده باشد ادامه‌اش می‌دهد.
 * force=true سقفِ «یک بار در روز» را کنار می‌گذارد.
 */
function runBackupStep(force) {
  if (!CFG.BACKUP_ENABLED) return { ok: false, reason: 'disabled' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20 * 1000)) {
    // ══ چرا این‌جا دیگر بی‌صدا برنمی‌گردیم ══
    // شبِ ۱۲ مرداد پشتیبان‌گیری اصلاً انجام نشد و هیچ‌کس نفهمید. تریگرِ ساعت
    // سه بامداد زد، قفل هنوز در اختیارِ همگام‌سازیِ ۰۲:۵۸ بود، و چون کارِ
    // نیمه‌تمامی در کار نبود، تابع بی هیچ سطری در سیاهه و بی هیچ تلاشِ دوباره
    // برگشت. تا فردا شب. حالا هر برخوردِ قفل هم ثبت می‌شود هم دوباره تلاش
    // می‌شود — ولی نه بی‌نهایت: شش نوبت (نیم ساعت) و بعد هشدار.
    var tries = Number(props_().getProperty(PK.BACKUP_BUSY) || 0) + 1;
    props_().setProperty(PK.BACKUP_BUSY, String(tries));
    if (tries <= 6) {
      try { scheduleBackupContinue_(5 * 60 * 1000); } catch (eS) {}
      logLine_('پشتیبان: قفل در اختیارِ کارِ دیگری بود (نوبت ' + tries +
               ' از ۶)؛ پنج دقیقهٔ دیگر دوباره تلاش می‌شود.');
    } else {
      props_().deleteProperty(PK.BACKUP_BUSY);
      // «نوبت» هم پاک می‌شود، وگرنه تلنگرِ جبرانیِ وارسیِ سلامت فکر می‌کند
      // یک دورِ دیگر در راه است و تا ابد دست روی دست می‌گذارد.
      try { clearBackupContinuation_(); } catch (eC) {}
      logLine_('پشتیبان: پس از شش نوبت هنوز قفل آزاد نشد؛ دورِ امشب رها شد. ' +
               'وارسیِ سلامت اگر پشتیبان کهنه بماند خودش دوباره راهش می‌اندازد.');
    }
    return { ok: false, reason: 'busy', tries: tries };
  }
  props_().deleteProperty(PK.BACKUP_BUSY);
  var tStart = new Date().getTime();
  try {
    var raw = props_().getProperty(PK.BACKUP_STATE);
    var st = null;
    if (raw) { try { st = JSON.parse(raw); } catch (e) { st = null; } }

    // حالتِ نیمه‌تمام باید معتبر باشد. اگر پوشه‌اش دیگر نیست (پاک شده، هرس شده،
    // دسترسی عوض شده) یا خیلی کهنه است، دورش می‌ریزیم و از نو شروع می‌کنیم.
    // بی این وارسی، یک حالتِ مردهْ پشتیبان‌گیریِ هر شب را برای همیشه می‌کشت و
    // هیچ هشداری هم نمی‌آمد؛ یا نیمی از رونوشت‌ها ده روز بعد گرفته می‌شد و در
    // پوشه‌ای با تاریخِ ده روز پیش می‌نشست.
    if (st) {
      var bad = false;
      try { DriveApp.getFolderById(st.folderId).getName(); } catch (eV) { bad = true; }
      if (!bad) {
        var ageH0 = (new Date().getTime() - parseWhen_(String(st.startedAt || ''))) / 3600000;
        if (isFinite(ageH0) && ageH0 > 6) bad = true;
      }
      if (bad) {
        logLine_('پشتیبان: حالتِ نیمه‌تمامِ کهنه یا بی‌پوشه دور ریخته شد؛ از نو شروع می‌شود.');
        props_().deleteProperty(PK.BACKUP_STATE);
        st = null;
      }
    }

    if (!st) {
      // سقفِ روزانه: اگر امروز پشتیبان گرفته شده، دوباره نگیر
      if (!force) {
        var last = props_().getProperty(PK.BACKUP_AT) || '';
        if (last) {
          var ageH = (new Date().getTime() - parseWhen_(last)) / 3600000;
          if (isFinite(ageH) && ageH < 20) {
            return { ok: false, reason: 'fresh', at: last };
          }
        }
      }
      var root = backupRoot_();
      var folder = root.createFolder(backupFolderName_());
      st = { folderId: folder.getId(), folderName: folder.getName(),
             startedAt: nowStr_(), idx: 0, done: [], failed: [] };
      logLine_('پشتیبان‌گیری آغاز شد: پوشهٔ «' + st.folderName + '».');
    }

    var targets = backupTargets_();
    var folder2 = DriveApp.getFolderById(st.folderId);

    while (st.idx < targets.length) {
      // هر رونوشت می‌تواند چند ده ثانیه طول بکشد؛ پیش از هر کدام مهلت را می‌سنجیم
      if (new Date().getTime() - tStart > 200 * 1000) {
        props_().setProperty(PK.BACKUP_STATE, JSON.stringify(st));
        scheduleBackupContinue_(60 * 1000);
        logLine_('پشتیبان‌گیری: ' + st.idx + ' از ' + targets.length +
                 ' شیت رونوشت شد؛ ادامه در چند دقیقه.');
        return { ok: true, pending: true, done: st.done.length, total: targets.length };
      }
      var t = targets[st.idx];
      var rec = { title: t.title, role: t.role, about: t.about, sourceId: t.id,
                  sourceUrl: 'https://docs.google.com/spreadsheets/d/' + t.id + '/edit' };
      try {
        // makeCopy فقط می‌خواند و یک فایلِ تازه در پوشهٔ ما می‌سازد؛ در خودِ
        // فایلِ مبدأ هیچ چیزی نوشته یا عوض نمی‌شود.
        var src = DriveApp.getFileById(t.id);
        var stamp = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
        var copy = src.makeCopy(t.title + ' — پشتیبان ' + stamp, folder2);
        rec.backupId = copy.getId();
        rec.backupUrl = copy.getUrl();
        rec.backupName = copy.getName();
        rec.ok = true;
        st.done.push(rec);
      } catch (eC) {
        rec.ok = false;
        rec.error = eC.message;
        st.failed.push(rec);
        logLine_('پشتیبانِ «' + t.title + '» ناموفق: ' + eC.message);
      }
      st.idx++;
      props_().setProperty(PK.BACKUP_STATE, JSON.stringify(st));
    }

    // ── رونوشتِ کدِ موتور، کنار رونوشتِ شیت‌ها ──
    // خواستهٔ صریح: کدِ هر نسخه هم مثل شیت‌ها هر شب پشتیبان بگیرد و در پیامِ
    // پشتیبان بیاید و لینک شود. تازه‌ترین فایلِ پوشهٔ «کدها» رونوشت می‌شود.
    try {
      var codeF = (st.codeDone ? null : latestCodeCopy_());
      if (codeF) {
        // اگر اجرا درست بعد از این رونوشت کشته شود، دورِ بعد نباید رونوشتِ
        // دوم بسازد؛ نشانه پیش از کارِ سنگین ثبت می‌شود.
        st.codeDone = true;
        props_().setProperty(PK.BACKUP_STATE, JSON.stringify(st));
        var codeCopy = codeF.makeCopy(codeF.getName(), folder2);
        st.done.push({ title: 'کدِ موتور — ' + codeF.getName(), role: 'کدِ اسکریپت',
                       about: 'کدِ کاملِ Apps Script (نسخهٔ در حالِ اجرا: ' + CFG.CODE_VERSION + ').',
                       sourceId: codeF.getId(), sourceUrl: codeF.getUrl(),
                       backupId: codeCopy.getId(), backupUrl: codeCopy.getUrl(),
                       backupName: codeCopy.getName(), ok: true });
      }
    } catch (eCode) { logLine_('پشتیبانِ کدِ موتور ناموفق: ' + eCode.message); }

    // ── پایان: فهرست، هرس، تلگرام ──
    var manifest = {
      generatedAt: nowStr_(), timezone: CFG.TIMEZONE,
      folder: st.folderName, folderId: st.folderId,
      folderUrl: folder2.getUrl(),
      codeVersion: CFG.CODE_VERSION,
      items: st.done, failed: st.failed
    };
    try {
      folder2.createFile(Utilities.newBlob(JSON.stringify(manifest, null, 1),
                                           'application/json', BACKUP_MANIFEST));
      folder2.createFile(Utilities.newBlob(backupHtml_(manifest), 'text/html',
                                           'فهرست پشتیبان.html'));
    } catch (eMf) { logLine_('نوشتنِ فهرستِ پشتیبان ناموفق: ' + eMf.message); }

    // دورِ بی‌رونوشت «موفق» نیست: نه مُهرِ زمان می‌گیرد (وگرنه سقفِ روزانه جلوی
    // تلاشِ فردا را می‌گرفت) و نه پوشهٔ خالی‌اش جای یک نسخهٔ واقعی را در سقفِ
    // نگه‌داری اشغال می‌کند.
    props_().deleteProperty(PK.BACKUP_STATE);
    clearBackupContinuation_();
    if (!st.done.length) {
      try { folder2.setTrashed(true); } catch (eDel) {}
      logLine_('پشتیبان‌گیری هیچ رونوشتی نگرفت؛ پوشهٔ خالی برداشته شد و فردا دوباره تلاش می‌شود.');
      try { alertBackupFailure_(st); } catch (eAf) {}
      return { ok: false, reason: 'no-copies', failed: st.failed.length };
    }
    var pruned = pruneBackups_();
    props_().setProperty(PK.BACKUP_AT, nowStr_());
    logLine_('پشتیبان‌گیری کامل شد: ' + st.done.length + ' شیت' +
             (st.failed.length ? '، ' + st.failed.length + ' ناموفق' : '') +
             (pruned ? '، ' + pruned + ' نسخهٔ قدیمی پاک شد' : '') + '.');
    try { sendBackupTelegram_(manifest, pruned); } catch (eT) {
      logLine_('پیام تلگرامِ پشتیبان نرفت: ' + eT.message);
    }
    try { sendBackupEmail_(manifest, pruned); } catch (eE) {}
    return { ok: true, done: st.done.length, failed: st.failed.length,
             pruned: pruned, folder: st.folderName, url: manifest.folderUrl };
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function backupContinue() {
  // فقط برای ادامهٔ کارِ نیمه‌تمام. بی این نگهبان، یک تریگرِ جامانده یک دورِ
  // کاملِ اضافه می‌گرفت: یک پوشهٔ تازه، شش رونوشتِ تکراری و یک پیامِ دوباره.
  var half = props_().getProperty(PK.BACKUP_STATE);
  // نوبتِ دوبارهٔ برخوردِ قفل هم حقِ ادامه دارد، هرچند هنوز هیچ کاری شروع نشده.
  var busy = Number(props_().getProperty(PK.BACKUP_BUSY) || 0) > 0;
  if (!half && !busy) return { ok: false, reason: 'nothing-pending' };
  // force نمی‌دهیم. کارِ نیمه‌تمامِ *معتبر* اصلاً از سقفِ روزانه رد نمی‌شود
  // (آن وارسی درونِ شرطِ «اگر حالتی نیست» است)، پس force فقط یک کار می‌کرد:
  // وقتی حالتِ نیمه‌تمام بی‌اعتبار از آب درمی‌آمد و دور ریخته می‌شد، سقفِ
  // روزانه را هم با خودش می‌برد و یک دورِ کاملاً تکراری می‌گرفت.
  return runBackupStep(false);
}

/** تریگرِ شبانه. سقفِ «یک بار در روز» را رعایت می‌کند. */
function backupDaily() {
  try { return runBackupStep(false); }
  catch (e) { logLine_('پشتیبانِ شبانه ناموفق: ' + e.message); return { ok: false }; }
}

/**
 * تلنگرِ پشتیبان. وارسیِ سلامت وقتی می‌بیند پشتیبان کهنه شده، به‌جای اینکه فقط
 * بنویسد «کهنه است»، همین‌جا یک دورِ تازه زمان‌بندی می‌کند.
 *
 * چرا لازم شد: شبِ ۱۲ مرداد تریگرِ ساعت سه به قفل خورد و دورِ آن شب کلاً رفت.
 * گزارش هم چیزی نگفت. هشدار بی‌اقدام، همان سکوت است با لحنِ بهتر.
 */
function nudgeBackup_() {
  if (!CFG.BACKUP_ENABLED) return false;
  // ملاک «نوبتِ ادامه» است، نه «تریگری در فهرست هست». اولین نسخهٔ همین تابع
  // از روی فهرستِ تریگرها تصمیم می‌گرفت و همان دامی را که CONT_DUE برای
  // صداگذاری خنثی کرده بود، برای پشتیبان از نو کار می‌گذاشت: یک تریگرِ
  // یک‌بارمصرفِ زده‌شده تا ابد در فهرست می‌ماند و این تابع تا ابد «در راه
  // است» می‌گفت. در آزمون، هفت شبِ پیاپی صفر پشتیبان.
  var due = Number(props_().getProperty(PK.BACKUP_DUE) || 0);
  var now = new Date().getTime();
  if (isFinite(due) && due > 0 && due < now + 24 * 60 * 60 * 1000 &&
      now < due + 20 * 60 * 1000) return false;      // واقعاً در راه است
  try { scheduleBackupContinue_(3 * 60 * 1000); }
  catch (eT) { return false; }                        // تریگر ساخته نشد؟ نشانه هم نمی‌گذاریم
  props_().setProperty(PK.BACKUP_BUSY, '1');          // تا backupContinue بداند حق دارد شروع کند
  logLine_('پشتیبان کهنه بود؛ یک دورِ جبرانی برای چند دقیقهٔ دیگر زمان‌بندی شد.');
  return true;
}

function scheduleBackupContinue_(ms) {
  var d = ms || 60000;
  try { props_().setProperty(PK.BACKUP_DUE, String(new Date().getTime() + d)); } catch (e) {}
  try {
    clearBackupTriggers_();
    ScriptApp.newTrigger('backupContinue').timeBased().after(d).create();
  } catch (eT) {
    try { props_().setProperty(PK.BACKUP_DUE, String(new Date().getTime() - 60 * 60 * 1000)); } catch (e2) {}
    throw eT;
  }
}

function clearBackupTriggers_() {
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'backupContinue') ScriptApp.deleteTrigger(ts[i]);
  }
}

function clearBackupContinuation_() {
  clearBackupTriggers_();
  try { props_().deleteProperty(PK.BACKUP_DUE); } catch (e) {}
}

/** نسخه‌های قدیمی‌تر از سقف را پاک می‌کند (فقط داخلِ پوشهٔ پشتیبان). */
function pruneBackups_() {
  var keep = Math.max(1, CFG.BACKUP_KEEP || 14);
  var root = backupRoot_();
  var list = [];
  var it = root.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    if (String(f.getName()).indexOf('پشتیبان — ') !== 0) continue;   // فقط پوشه‌های خودمان
    list.push({ folder: f, at: f.getDateCreated().getTime(), name: f.getName() });
  }
  if (list.length <= keep) return 0;
  list.sort(function (a, b) { return b.at - a.at; });          // تازه‌ترین اول
  var n = 0;
  for (var i = keep; i < list.length; i++) {
    try { list[i].folder.setTrashed(true); n++; }
    catch (e) { logLine_('پاک‌کردنِ پشتیبانِ قدیمی ناموفق: ' + e.message); }
  }
  return n;
}

/** فهرستِ خوانا. */
function backupHtml_(m) {
  var H = [];
  H.push('<!doctype html><html dir="rtl" lang="fa"><meta charset="utf-8">');
  H.push('<style>body{font-family:Tahoma,sans-serif;background:#0f1115;color:#e8eaed;' +
         'padding:24px;line-height:1.9}h1{font-size:20px}table{width:100%;' +
         'border-collapse:collapse;margin-top:12px}th,td{border:1px solid #2a2f3a;' +
         'padding:8px;font-size:13px;text-align:right;vertical-align:top}' +
         'th{background:#1f3864}a{color:#8ab4f8}.sub{color:#9aa0a6;font-size:12px}' +
         '</style>');
  H.push('<h1>پشتیبانِ شیت‌ها — ' + bEsc_(m.folder) + '</h1>');
  H.push('<div class="sub">ساخته‌شده در ' + bEsc_(m.generatedAt) + ' · منطقهٔ زمانی ' +
         bEsc_(m.timezone) + ' · نسخهٔ کد ' + bEsc_(m.codeVersion) + '</div>');
  H.push('<table><tr><th>شیت</th><th>نقش</th><th>چه محتوایی دارد</th>' +
         '<th>شیتِ اصلی</th><th>فایلِ پشتیبان</th></tr>');
  for (var i = 0; i < (m.items || []).length; i++) {
    var x = m.items[i];
    H.push('<tr><td><b>' + bEsc_(x.title) + '</b></td>' +
           '<td>' + bEsc_(x.role) + '</td>' +
           '<td class="sub">' + bEsc_(x.about) + '</td>' +
           '<td><a href="' + bEsc_(x.sourceUrl) + '">اصلی</a><div class="sub">' +
           bEsc_(x.sourceId) + '</div></td>' +
           '<td><a href="' + bEsc_(x.backupUrl || '') + '">' +
           bEsc_(x.backupName || '—') + '</a></td></tr>');
  }
  for (var j = 0; j < (m.failed || []).length; j++) {
    var fx = m.failed[j];
    H.push('<tr><td><b>' + bEsc_(fx.title) + '</b></td>' +
           '<td>' + bEsc_(fx.role || '') + '</td>' +
           '<td class="sub">' + bEsc_(fx.about || '') + '</td>' +
           '<td><a href="' + bEsc_(fx.sourceUrl || '') + '">اصلی</a><div class="sub">' +
           bEsc_(fx.sourceId || '') + '</div></td>' +
           '<td style="color:#f28b82">ناموفق: ' + bEsc_(fx.error || '') + '</td></tr>');
  }
  H.push('</table>');
  H.push('<p class="sub">شیت‌های اصلی در این کار هیچ تغییری نکردند: نه نامشان، نه ' +
         'محتوایشان، نه جای‌شان. این‌ها رونوشت‌اند.</p>');
  H.push('</html>');
  return H.join('\n');
}

/** پیام تلگرام با مشخصاتِ دقیقِ پشتیبان. */
function sendBackupTelegram_(m, pruned) {
  if (!tgEnabled_()) return false;
  var L = [];
  L.push('🗄️ <b>پشتیبانِ شیت‌ها گرفته شد</b>');
  L.push('📁 پوشه: <a href="' + m.folderUrl + '">' + tgEsc_(m.folder) + '</a>');
  L.push('🕒 ' + tgEsc_(m.generatedAt) + ' — به وقت ' + tgEsc_(m.timezone));
  L.push('');
  for (var i = 0; i < (m.items || []).length; i++) {
    var x = m.items[i];
    L.push('<b>' + tgEsc_(x.title) + '</b>  <i>(' + tgEsc_(x.role) + ')</i>');
    L.push('• محتوا: ' + tgEsc_(x.about));
    L.push('• شیتِ اصلی: <a href="' + x.sourceUrl + '">باز کن</a>');
    L.push('• پشتیبان: <a href="' + (x.backupUrl || '') + '">' +
           tgEsc_(x.backupName || '—') + '</a>');
    L.push('');
  }
  if ((m.failed || []).length) {
    L.push('⚠️ <b>ناموفق:</b>');
    for (var j = 0; j < m.failed.length; j++) {
      var ff = m.failed[j];
      L.push('• <b>' + tgEsc_(ff.title) + '</b> — ' + tgEsc_(ff.error || ''));
      if (ff.sourceUrl) L.push('  شیتِ اصلی: <a href="' + ff.sourceUrl + '">باز کن</a>');
    }
    L.push('');
  }
  L.push('🧹 نسخه‌های نگه‌داشته‌شده: ' + (CFG.BACKUP_KEEP || 14) +
         (pruned ? ' · ' + pruned + ' نسخهٔ قدیمی پاک شد' : ''));
  L.push('🔒 شیت‌های اصلی دست نخوردند — این‌ها رونوشت‌اند.');
  // پیام می‌تواند از سقفِ ۴۰۹۶ نویسهٔ تلگرام رد شود؛ tgSplit_ خودش تکه می‌کند.
  var parts = tgSplit_(L.join('\n'), 3800);
  var sent = 0;
  for (var k = 0; k < parts.length; k++) {
    var r = tgSend_(parts[k]);
    if (r && r.ok) sent++;
  }
  return sent > 0;
}

function sendBackupEmail_(m, pruned) {
  var rows = [];
  for (var i = 0; i < (m.items || []).length; i++) {
    var x = m.items[i];
    rows.push('<tr><td>' + bEsc_(x.title) + '</td><td>' + bEsc_(x.role) + '</td><td>' +
              bEsc_(x.about) + '</td><td><a href="' + bEsc_(x.sourceUrl) +
              '">اصلی</a></td><td><a href="' + bEsc_(x.backupUrl || '') +
              '">' + bEsc_(x.backupName || 'پشتیبان') + '</a></td></tr>');
  }
  for (var k = 0; k < (m.failed || []).length; k++) {
    var y = m.failed[k];
    rows.push('<tr style="color:#b00"><td>' + bEsc_(y.title) + '</td><td>' +
              bEsc_(y.role || '') + '</td><td>' + bEsc_(y.about || '') +
              '</td><td><a href="' + bEsc_(y.sourceUrl || '') + '">اصلی</a></td>' +
              '<td>ناموفق: ' + bEsc_(y.error || '') + '</td></tr>');
  }
  var html = '<div dir="rtl" style="font-family:Tahoma;line-height:1.8">' +
    '<h3>پشتیبانِ شیت‌ها — ' + m.folder + '</h3>' +
    '<p><a href="' + m.folderUrl + '">پوشهٔ پشتیبان</a> · ' + m.generatedAt + '</p>' +
    '<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px">' +
    '<tr><th>شیت</th><th>نقش</th><th>محتوا</th><th>اصلی</th><th>پشتیبان</th></tr>' +
    rows.join('') + '</table>' +
    ((m.failed || []).length ? '<p style="color:#b00">ناموفق: ' + m.failed.length +
      ' — ' + m.failed.map(function (z) { return bEsc_(z.title); }).join(' ، ') + '</p>' : '') +
    '<p style="color:#666;font-size:12px">شیت‌های اصلی تغییری نکردند.</p></div>';
  /* پشتیبانِ موفق خبرِ روزمره است، نه رویداد: هر روز می‌آید و هر روز
     همان را می‌گوید. جزئیاتِ جدولی در همان پوشه هست؛ اینجا یک خط بس است.
     شکستِ پشتیبان همچنان فوری ایمیل می‌شود. */
  try {
    mailQueue_('backup', 'پشتیبانِ شیت‌ها گرفته شد — ' + m.folder,
               /* `m.copied` هیچ‌جا پر نمی‌شد و فقط همین‌جا خوانده می‌شد، پس
                  این خط **همیشه** «۰ شیت کپی شد» می‌گفت — در حالی که
                  پشتیبان سالم گرفته شده بود. یک پیامِ همیشه‌صفر یا آدم را
                  بی‌جهت می‌ترساند یا یاد می‌دهد که پیام را نخواند؛ هر دو
                  بدتر از نگفتن است. شمارِ درست همان چیزی است که واقعاً کپی
                  شده: `m.items`. */
               ((m.copied || m.items || []).length) + ' شیت کپی شد' +
               ((m.failed || []).length ? '، ' + m.failed.length + ' ناموفق' : '') + '.');
  } catch (eQ) {
    MailApp.sendEmail({ to: CFG.EMAIL_TO,
                        subject: 'پشتیبانِ شیت‌ها — ' + m.folder, htmlBody: html });
  }
  return true;
}

/** منو: پشتیبان‌گیریِ همین حالا. */
function runBackupNow() {
  var ui = ui_();
  var r;
  try { r = runBackupStep(true); }
  catch (e) { r = { ok: false, reason: 'error', detail: e.message }; }
  var m;
  if (r.ok && r.pending) {
    m = 'پشتیبان‌گیری آغاز شد: ' + r.done + ' از ' + r.total + ' شیت رونوشت شد.\n\n' +
        'ادامه‌اش خودکار در پس‌زمینه انجام می‌شود و در پایان پیام تلگرام و ایمیل می‌آید.';
  } else if (r.ok) {
    m = 'پشتیبان کامل شد.\n\nشیت‌های رونوشت‌شده: ' + r.done +
        (r.failed ? '\nناموفق: ' + r.failed : '') +
        (r.pruned ? '\nنسخهٔ قدیمیِ پاک‌شده: ' + r.pruned : '') +
        '\nپوشه: ' + r.folder + '\n\nمشخصاتِ کامل در تلگرام و ایمیل فرستاده شد.';
  } else if (r.reason === 'busy') {
    m = 'اسکریپت دیگری در حال اجراست. چند دقیقه بعد دوباره بزنید.';
  } else if (r.reason === 'disabled') {
    m = 'پشتیبان‌گیری در تنظیمات خاموش است (BACKUP_ENABLED).';
  } else {
    m = 'پشتیبان‌گیری انجام نشد' + (r.detail ? ': ' + r.detail : '') + '.';
  }
  if (ui) ui.alert('پشتیبانِ شیت‌ها', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

/** هشدارِ «پشتیبان گرفته نشد» — چون سکوت در این مورد خطرناک‌ترین حالت است. */
function alertBackupFailure_(st) {
  var lines = ['⛔️ <b>پشتیبانِ شیت‌ها گرفته نشد</b>',
               '🕒 ' + tgEsc_(nowStr_())];
  var fl = (st && st.failed) || [];
  for (var i = 0; i < fl.length && i < 8; i++) {
    lines.push('• ' + tgEsc_(fl[i].title) + ' — ' + tgEsc_(fl[i].error || ''));
  }
  lines.push('فردا شب خودش دوباره تلاش می‌کند. اگر تکرار شد، دسترسیِ درایو را وارسی کنید.');
  try { if (tgEnabled_()) tgSend_(lines.join('\n')); } catch (e) {}
  try {
    MailApp.sendEmail({ to: CFG.EMAIL_TO, subject: 'پشتیبانِ شیت‌ها گرفته نشد',
      htmlBody: '<div dir="rtl" style="font-family:Tahoma">' +
                lines.join('<br>').replace(/<b>|<\/b>/g, '') + '</div>' });
  } catch (e2) {}
  return true;
}

/** وضعیتِ پشتیبان برای فایل وضعیت و ناظرِ روزانه. */
function backupStatus_() {
  var out = { enabled: !!CFG.BACKUP_ENABLED, lastAt: '', ageHours: null,
              keep: CFG.BACKUP_KEEP || 14, copies: 0, pending: false, folderUrl: '' };
  try {
    out.lastAt = String(props_().getProperty(PK.BACKUP_AT) || '');
    if (out.lastAt) {
      var h = (new Date().getTime() - parseWhen_(out.lastAt)) / 3600000;
      if (isFinite(h)) out.ageHours = Math.round(h);
    }
    out.pending = !!props_().getProperty(PK.BACKUP_STATE);
    var root = backupRoot_();
    out.folderUrl = root.getUrl();
    var it = root.getFolders();
    while (it.hasNext()) {
      var f = it.next();
      if (String(f.getName()).indexOf('پشتیبان — ') !== 0) continue;
      // پوشه‌ای که فقط فهرست دارد و هیچ رونوشتی در آن نیست، «نسخهٔ پشتیبان» نیست
      var real = 0, fi = f.getFiles();
      while (fi.hasNext()) {
        var n = fi.next().getName();
        if (n === BACKUP_MANIFEST || n === 'فهرست پشتیبان.html') continue;
        real++;
      }
      if (real) out.copies++; else out.empty = (out.empty || 0) + 1;
    }
  } catch (e) { out.error = e.message; }
  return out;
}
