/**
 * 05_Setup.gs — منو، تریگرها و عیب‌یابی
 * پس از نصب، فقط «۱) ثبت کلید Gemini» و بعد «۲) نصب زمان‌بندی خودکار» را اجرا کنید.
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚙️ موتور محتوا')
      .addItem('۱) ثبت کلید Gemini', 'setApiKey')
      .addItem('۲) نصب زمان‌بندی خودکار', 'installTriggers')
      .addSeparator()
      .addItem('اجرای همگام‌سازی همین حالا', 'runSyncNow')
      .addSubMenu(SpreadsheetApp.getUi().createMenu('ساخت یک قسمت همین حالا')
        .addItem('فقط «از همه جا از همه رنگ»', 'runProduceVariety')
        .addItem('فقط «درس‌نامه» (تخصصی)', 'runProduceSpecial')
        .addItem('هر دو، پشت سر هم', 'runProduceBoth')
        .addSeparator()
        .addItem('🌐 «از همه جا از همه رنگ» با غنی‌سازیِ اینترنتی', 'runProduceVarietyEnriched')
        .addItem('🌐 «درس‌نامه» با غنی‌سازیِ اینترنتی', 'runProduceSpecialEnriched'))
      .addItem('📊 مجموعه‌های آموزشی و پیشرفت', 'showSeriesBoard')
      .addItem('اسکن مجموعه‌های آموزشی', 'runScanSeries')
      .addItem('داوری و دسته‌بندیِ مجموعه‌ها (از روی محتوا)', 'runJudgeSeries')
      .addItem('⚡ مرتب‌سازیِ سریعِ فهرست (بی‌مدل)', 'runLocalJudgeAll')
      .addItem('داوریِ همهٔ مجموعه‌ها از نو (با مدل)', 'runRejudgeAll')
      .addSeparator()
      .addItem('🌐 وضعیتِ غنی‌سازیِ اینترنتی', 'showEnrichStatus')
      .addSeparator()
      .addItem('🎵 بانکِ موسیقی — پویش و برچسبِ خودکار', 'runMusicAuto')
      .addItem('⬇️ موسیقی — گشتن در اینترنت و آوردن', 'runMusicFetch')
      .addItem('🔎 بازبینیِ بانک — «این‌ها واقعاً موسیقی‌اند؟»', 'runMusicRecheck')
      .addItem('🎵 پویشِ بانکِ موسیقی (بی برچسب‌زنی)', 'runMusicScan')
      .addItem('🎙 آزمونِ شنیداریِ گویندگان', 'runVoiceAudition')
      .addItem('کنار گذاشتنِ یک گوینده', 'runBlockVoice')
      .addSeparator()
      .addItem('📘 جزوهٔ مجموعه‌ها — ساخت، به‌روزرسانی و واردکردنِ گذشته', 'runHandoutBuild')
      .addItem('🔎 سنجهٔ محتوا — متنِ نهایی در برابرِ متنِ خام', 'runContentAudit')
      .addItem('▶️ انتشار در یوتیوب — کپشن، کاور، پلی‌لیست', 'runYouTubePublish')
      .addItem('🖼 بازسازیِ عنوان و کاورِ یوتیوب (یک قسمت)', 'runYouTubeRedo')
      .addItem('📺 شناسنامهٔ کانالِ یوتیوب — وارسی و تکمیل', 'runYouTubeChannel')
      .addItem('📈 بازخوردِ یوتیوب — نمایش، پسند، کامنت', 'runYouTubeStats')
      .addItem('🔬 نظارتِ کیفیِ استخراج — پرامپت و مدلِ تحلیلگرها', 'runSourceQuality')
      .addItem('📚 قسمتِ مرورِ بزرگ — همهٔ مفاهیمِ یک مجموعه، ساده', 'runRecapNow')
      .addItem('🔧 عیب‌یابی و رفعِ دسترسیِ یوتیوب', 'runYouTubeFix')
      .addSeparator()
      .addItem('🗄️ پشتیبان‌گیری از شیت‌ها همین حالا', 'runBackupNow')
      .addItem('سامان‌دهیِ پوشهٔ قسمت‌ها', 'runOrganizeFolders')
      .addSeparator()
      .addItem('⬆️ بررسی و نصبِ کدِ تازه (همین حالا)', 'runSelfUpdateNow')
      .addItem('🔎 عیب‌یابیِ نصبِ خودکار', 'runSelfUpdateDiagnose')
      .addItem('🔍 وارسیِ اسکریپت‌های منبع (فقط تشخیص)', 'runAuditSourceScripts')
      .addItem('🔄 کدِ تازهٔ تحلیلگرهای منبع — چه آماده است؟', 'runShowSourceUpdates')
      .addItem('⬆️ نصبِ کدِ تحلیلگرهای منبع', 'runInstallSourceUpdates')
      .addItem('▶️ چرخهٔ تحلیلگرها را همین حالا بدوان', 'runSourceCycleNow')
      .addItem('📊 چرخهٔ کدِ تحلیلگرها — نتیجهٔ نصب‌ها', 'runShowSourceVerdict')
      .addItem('بازگشت به نسخهٔ پشتیبانِ کد', 'installCodeRollback')
      .addSeparator()
      .addItem('وارسی سلامت', 'healthCheck')
      .addItem('وارسی شیت‌های منبع', 'checkSources')
      .addItem('خواندن گزارش‌های نظارت', 'runIngestReports')
      .addSeparator()
      .addItem('آزمون اتصال Gemini', 'testGemini')
      .addItem('آزمون ربات تلگرام', 'testTelegram')
      .addItem('به‌روزرسانی فهرست مدل‌ها', 'refreshModels')
      .addItem('نمایش وضعیت', 'showStatus')
      .addSeparator()
      .addItem('حذف زمان‌بندی', 'removeTriggers')
      .addItem('ساخت دوبارهٔ کامل بانک', 'fullRebuild')
      .addToUi();
  } catch (e) {}
}

function ui_() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }

function setApiKey() {
  var ui = ui_();
  if (!ui) throw new Error('این گزینه را از داخل شیت CONTENT-HUB اجرا کنید.');
  var r = ui.prompt('کلید Gemini',
    'کلید API خود را از aistudio.google.com/apikey بگیرید و اینجا بچسبانید:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var k = r.getResponseText().trim();
  if (!k) { ui.alert('کلید خالی بود.'); return; }
  props_().setProperty(PK.API_KEY, k);
  ui.alert('ثبت شد. حالا «آزمون اتصال Gemini» را بزنید.');
}

/**
 * این پروژه «مستقل» است و به شیت متصل نیست، پس onOpen سادهٔ معمولی اجرا نمی‌شود.
 * برای همین منو را با یک تریگر نصب‌شدنی روی شیت CONTENT-HUB می‌بندیم.
 */
function ensureMenuTrigger_() {
  var hubId = getHub_().getId();
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'onOpen') return;
  }
  ScriptApp.newTrigger('onOpen').forSpreadsheet(hubId).onOpen().create();
}

/** فهرستِ خواندنیِ زمان‌بندی‌ها برای «نمایش وضعیت». */
function trigList_() {
  var t = trigNames_();
  if (t.error) return 'خوانده نشد (' + t.error + ')';
  if (!t.names.length) return '۰ مورد — هیچ زمان‌بندی‌ای نصب نیست';
  var parts = [];
  for (var k = 0; k < t.names.length; k++) {
    var c = (t.counts && t.counts[t.names[k]]) || 1;
    parts.push('    • ' + t.names[k] + (c > 1 ? '  ⚠️ ' + c + ' بار (تکراری)' : ''));
  }
  if (t.missing.length) parts.push('    ⚠️ نصب‌نشده: ' + t.missing.join('، '));
  if (t.off) parts.push('    (زمان‌بندی عمداً خاموش شده — «۲) نصب زمان‌بندی خودکار»)');
  return t.count + ' مورد\n' + parts.join('\n');
}

function installTriggers() {
  removeTriggers(true);
  props_().deleteProperty(PK.SCHED_OFF);      // زمان‌بندی عمداً روشن شد
  ensureMenuTrigger_();

  /* ══ یک فهرست، دو مصرف — این بار واقعاً (۶٫۳۷) ══
   * ۵٫۹۵ `wantedTriggers_()` را ساخت تا «چه چیزی باید نصب باشد» یک نسخه
   * داشته باشد، و `removeTriggers` و `trigNames_` را به آن وصل کرد. ولی
   * **سازنده** دست‌نویس ماند: یازده فراخوانِ `newTrigger` پشتِ سرِ هم.
   * یعنی همان بیماری، نصفه‌درمان‌شده — و امروز خودش را نشان داد: زمان‌بندیِ
   * تازهٔ یوتیوب به فهرست اضافه شد و سازنده نمی‌ساختش، پس `trigNames_` تا
   * ابد می‌گفت «یکی گم است» و هیچ‌کس نمی‌ساختش.
   * حالا سازنده هم از همان فهرست می‌سازد. زمان‌بندیِ ویژگیِ بعدی خودبه‌خود
   * نصب می‌شود. */
  var want = wantedTriggers_(), made = [];
  for (var i = 0; i < want.length; i++) {
    var w = want[i];
    try {
      var b = ScriptApp.newTrigger(w.fn).timeBased();
      if (w.kind === 'hours') {
        b.everyHours(Math.max(1, Number(w.every) || 1)).create();
        made.push('• ' + trigLabel_(w.fn) + ': هر ' +
                  faDigitsOut_(String(Math.max(1, Number(w.every) || 1))) + ' ساعت');
      } else {
        var hr = Math.max(0, Math.min(23, Number(w.hour) || 0));
        var mn = Math.max(0, Math.min(59, Number(w.minute) || 0));
        b.atHour(hr).nearMinute(mn).everyDays(1).inTimezone(CFG.TIMEZONE).create();
        made.push('• ' + trigLabel_(w.fn) + ': هر روز ساعت ' + faDigitsOut_(String(hr)) +
                  (mn ? ':' + faDigitsOut_(('0' + mn).slice(-2)) : '') + ' (دبی)');
      }
    } catch (e) {
      logLine_('زمان‌بندیِ «' + w.fn + '» ساخته نشد: ' + e.message);
    }
  }

  if (CFG.BACKUP_ENABLED && !props_().getProperty(PK.BACKUP_SINCE)) {
    // از این لحظه انتظارِ پشتیبانِ شبانه داریم. وارسیِ سلامت بر پایهٔ همین
    // زمان قضاوت می‌کند، وگرنه همان دقیقهٔ نصب هشدارِ «پشتیبان نگرفته‌ای» می‌داد.
    props_().setProperty(PK.BACKUP_SINCE, nowStr_());
  }

  var msg = 'زمان‌بندی نصب شد:\n' + made.join('\n') + '\n• منوی شیت: فعال';
  logLine_('زمان‌بندی نصب شد (' + made.length + ' مورد).');
  var ui = ui_(); if (ui) ui.alert(msg); else console.log(msg);
}

/** نامِ خواندنیِ هر زمان‌بندی، برای پیامِ نصب. یک نگاشت، نه یازده رشتهٔ پراکنده. */
function trigLabel_(fn) {
  var m = {
    syncCatalog: 'همگام‌سازی',
    prepareEpisode: 'آماده‌سازیِ متنِ «از همه جا از همه رنگ»',
    prepareSpecialEpisode: 'آماده‌سازیِ متنِ «درس‌نامه»',
    produceEpisode: '«از همه جا از همه رنگ»',
    produceSpecialEpisode: '«درس‌نامه» (تخصصی)',
    healthCheck: 'وارسی سلامت',
    backupDaily: 'پشتیبانِ شیت‌ها',
    selfUpdateDaily: 'نصبِ خودکارِ کدِ تازه',
    ytPublishTick: 'انتشار در یوتیوب'
  };
  return Object.prototype.hasOwnProperty.call(m, fn) ? m[fn] : fn;
}

/**
 * زمان‌بندی‌های لازم را وارسی می‌کند و هر کدام که نبود می‌سازد — بی آنکه
 * تریگرِ موجود دوباره ساخته شود.
 *
 * چرا لازم است: هر بار که قابلیتِ تازه‌ای با زمان‌بندیِ خودش اضافه می‌شود (مثل
 * «درس‌نامه» در ۵٫۰ و «پشتیبان» در ۵٫۲)، فقط کسی که دوباره «نصب زمان‌بندی» را
 * بزند آن را می‌گیرد. اگر یادش برود، آن قابلیت هرگز اجرا نمی‌شود و هیچ خطایی
 * هم دیده نمی‌شود — فقط سکوت. دقیقاً همین اتفاق افتاد: پادکست تخصصی هفته‌ها
 * تریگر نداشت و هیچ‌کس نفهمید.
 */
/**
 * زمان‌بندی‌هایی که این پیکربندی *باید* داشته باشد — یک فهرست، دو خواننده.
 *
 * تا ۵٫۹۴ این فهرست فقط داخلِ `ensureScheduledTriggers_` بود، و هر جای
 * دیگری که می‌خواست بداند «چه چیزی باید نصب باشد» ناچار بود نسخهٔ خودش را
 * بنویسد. `removeTriggers` دقیقاً همین کار را کرده بود و سه نام عقب افتاده
 * بود. یک فهرست، هر تعداد خواننده.
 */
function wantedTriggers_() {
  var want = [
    { fn: 'syncCatalog',           kind: 'hours', every: 2 },
    { fn: 'produceEpisode',        kind: 'daily', hour: CFG.EPISODE_HOUR || 7 },
    { fn: 'healthCheck',           kind: 'daily', hour: 10 }
  ];
  // آماده‌سازیِ زودِ متن، تا پنجرهٔ غنی‌سازیِ اینترنتی جا داشته باشد و ساعتِ
  // رسیدنِ پادکست عوض نشود.
  if (CFG.ENRICH_ENABLED !== false) {
    want.push({ fn: 'prepareEpisode', kind: 'daily', hour: CFG.PREPARE_HOUR || 4 });
    if (CFG.SPECIAL_ENABLED) {
      want.push({ fn: 'prepareSpecialEpisode', kind: 'daily',
                  hour: CFG.PREPARE_SPECIAL_HOUR || 5 });
    }
  }
  if (CFG.SPECIAL_ENABLED) {
    want.push({ fn: 'produceSpecialEpisode', kind: 'daily',
                hour: clampHour_(CFG.SPECIAL_HOUR, 8) });
  }
  if (CFG.BACKUP_ENABLED) {
    want.push({ fn: 'backupDaily', kind: 'daily', hour: CFG.BACKUP_HOUR });
  }
  if (CFG.AUTOUPDATE_ENABLED !== false) {
    want.push({ fn: 'selfUpdateDaily', kind: 'daily',
                hour: clampHour_(CFG.UPDATE_HOUR, 2), minute: 30 });
  }
  /* یوتیوب زمان‌بندیِ خودش را دارد (۶٫۳۷). تا اینجا دو نوبت داشت و هر دو
     مهمانِ اجرای کسِ دیگری بودند — کارِ شبانه (هشتمین بند، پشتِ موسیقی و
     جزوه) و وارسیِ سلامت. روزی که هر دو گرسنه ماندند، صف رشد کرد و هیچ
     ویدئویی بالا نرفت، و از بیرون شبیهِ «کاری نبود» به نظر رسید. */
  if (CFG.YT_ENABLED !== false) {
    want.push({ fn: 'ytPublishTick', kind: 'hours',
                every: Math.max(1, Number(CFG.YT_TICK_HOURS) || 2) });
  }
  return want;
}

/**
 * چه زمان‌بندی‌هایی الان نصب‌اند، کدام تکراری‌اند، کدام گم.
 * هم `_STATUS.json` این را می‌خواند (ناظر جای دیگری ندارد که ببیند)، هم
 * «نمایش وضعیت»، هم وارسیِ سلامت.
 */
function trigNames_() {
  var out = { count: 0, names: [], dups: [], missing: [] };
  var ts;
  try { ts = ScriptApp.getProjectTriggers(); } catch (e) { out.error = e.message; return out; }
  var cnt = Object.create(null);
  for (var i = 0; i < ts.length; i++) {
    var f = ts[i].getHandlerFunction();
    if (cnt[f] === undefined) { cnt[f] = 0; out.names.push(f); }
    cnt[f]++;
  }
  out.count = ts.length;
  for (var k = 0; k < out.names.length; k++) {
    if (cnt[out.names[k]] > 1) out.dups.push(out.names[k] + ' ×' + cnt[out.names[k]]);
  }
  out.counts = cnt;
  // «گم» فقط وقتی معنا دارد که زمان‌بندی عمداً خاموش نشده باشد؛ وگرنه
  // خاموش‌کردنِ عمدی هر روز یک هشدارِ دروغ می‌داد.
  var off = false;
  try { off = !!props_().getProperty(PK.SCHED_OFF); } catch (eO) {}
  out.off = off;
  if (off) return out;
  var want = wantedTriggers_();
  for (var w = 0; w < want.length; w++) {
    if (!cnt[want[w].fn]) out.missing.push(want[w].fn);
  }
  if (!cnt.onOpen) out.missing.push('onOpen');   // بی این، منو در شیت نیست
  return out;
}

function ensureScheduledTriggers_() {
  // اگر خودتان «حذف زمان‌بندی» را زده‌اید، خودکار برنمی‌گردد. «نصب زمان‌بندی»
  // این نشانه را پاک می‌کند. بی این، یک کلیکِ ساده همهٔ چیزی را که عمداً خاموش
  // کرده بودید بی‌صدا روشن می‌کرد.
  if (props_().getProperty(PK.SCHED_OFF)) return { checked: 0, added: 0, off: true };
  var want = wantedTriggers_();
  var have = Object.create(null);
  var ts;
  try { ts = ScriptApp.getProjectTriggers(); } catch (e) { return { checked: 0, added: 0 }; }
  for (var i = 0; i < ts.length; i++) have[ts[i].getHandlerFunction()] = true;

  var added = [], failed = [];
  for (var w = 0; w < want.length; w++) {
    if (have[want[w].fn]) continue;
    try {
      if (want[w].kind === 'hours') {
        ScriptApp.newTrigger(want[w].fn).timeBased().everyHours(want[w].every).create();
      } else {
        ScriptApp.newTrigger(want[w].fn).timeBased().atHour(want[w].hour).nearMinute(0)
          .everyDays(1).inTimezone(CFG.TIMEZONE).create();
      }
      added.push(want[w].fn);
    } catch (eC) {
      // سکوت این‌جا همان اشتباهِ قبلی است: سهمیهٔ تریگر پر شده یا دسترسی نیست،
      // و آن قابلیت هرگز اجرا نمی‌شود بی آنکه کسی بفهمد.
      failed.push(want[w].fn + ': ' + String(eC.message).slice(0, 120));
    }
  }
  if (failed.length) {
    logLine_('نصبِ زمان‌بندی ناموفق: ' + failed.join(' | '));
    try {
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'زمان‌بندی', key: 'triggers-install-failed',
        title: 'نصبِ خودکارِ زمان‌بندی شکست خورد',
        detail: failed.join(' | ') + ' — این کارها بی‌زمان‌بندی مانده‌اند و اجرا نمی‌شوند.',
        instruction: '', owner: 'کاربر'
      });
    } catch (eF2) {}
  }
  if (added.length) {
    if (CFG.BACKUP_ENABLED && added.indexOf('backupDaily') !== -1 &&
        !props_().getProperty(PK.BACKUP_SINCE)) {
      props_().setProperty(PK.BACKUP_SINCE, nowStr_());
    }
    logLine_('زمان‌بندیِ جاافتاده خودکار نصب شد: ' + added.join('، ') + '.');
    // اگر پروژه هیچ تریگری نداشت، یعنی تازه نصب شده — این «ایراد» نیست.
    // ایراد آن حالتی است که بعضی تریگرها بودند و بعضی نه: یعنی نسخهٔ تازه‌ای
    // نصب شده و کاربر «نصب زمان‌بندی» را نزده، و یک قابلیت در سکوت خوابیده.
    if (!ts.length) return { checked: want.length, added: added.length, list: added };
    try {
      logSelfFinding_(getHub_(), {
        priority: 'متوسط', category: 'زمان‌بندی', key: 'triggers-healed',
        title: 'زمان‌بندیِ جاافتاده خودکار نصب شد',
        detail: 'این کارها تریگر نداشتند و اجرا نمی‌شدند: ' + added.join('، ') +
                '. خودکار نصب شدند و از اجرای بعد کار می‌کنند.',
        instruction: '', owner: 'موتور'
      });
    } catch (eF) {}
  }
  return { checked: want.length, added: added.length, list: added };
}

function removeTriggers(silent) {
  /* ══ چرا فهرستِ سفید، نه فهرستِ سیاه (باگِ ۵٫۹۵) ══
   * تا ۵٫۹۴ این‌جا ده نامِ دستی‌نوشته بود و هر قابلیتِ تازه‌ای که زمان‌بندیِ
   * خودش را آورد، از قلم افتاد: `prepareEpisode` (۵٫۵)،
   * `prepareSpecialEpisode` (۵٫۵) و `selfUpdateDaily` (۵٫۱۲) هیچ‌وقت به
   * فهرست اضافه نشدند. یعنی «حذف زمان‌بندی» سه تریگر را زنده می‌گذاشت و
   * پیامش می‌گفت «زمان‌بندی حذف شد» — ادعایی که راست نبود.
   *
   * بدتر: `installTriggers` اول همین را صدا می‌زند و بعد همه را می‌سازد؛
   * پس هر بار فشردنِ «نصب زمان‌بندی» سه تریگرِ تکراری اضافه می‌کرد. دو
   * `selfUpdateDaily` یعنی دو کارِ شبانهٔ هم‌زمان روی یک پروژه.
   *
   * فهرستِ سفید همان اشتباه را نمی‌کند: هرچه تریگر است می‌رود، جز منو.
   * قابلیتِ بعدی هم بی هیچ ویرایشی این‌جا پوشش دارد. */
  var ts = ScriptApp.getProjectTriggers();
  var gone = [];
  for (var i = 0; i < ts.length; i++) {
    var f = ts[i].getHandlerFunction();
    if (f === 'onOpen') continue;             // منو دست‌نخورده می‌ماند
    try { ScriptApp.deleteTrigger(ts[i]); gone.push(f); } catch (eD) {}
  }
  // حذفِ دستی یعنی «خاموش بماند». وارسیِ خودکارِ زمان‌بندی به آن احترام می‌گذارد
  // تا با یک همگام‌سازی دوباره روشن نشود. «نصب زمان‌بندی» این نشانه را برمی‌دارد.
  if (!silent) {
    props_().setProperty(PK.SCHED_OFF, nowStr_());
    // چه چیزی واقعاً حذف شد — نه ادعای «حذف شد»، بلکه فهرستش.
    var left = [];
    try {
      var after = ScriptApp.getProjectTriggers();
      for (var j = 0; j < after.length; j++) left.push(after[j].getHandlerFunction());
    } catch (eL) {}
    logLine_('زمان‌بندی حذف شد: ' + (gone.join('، ') || 'چیزی نبود') + '.');
    var ui = ui_();
    if (ui) ui.alert('زمان‌بندی حذف شد',
                     'حذف‌شده (' + gone.length + '): ' + (gone.join('، ') || '—') + '\n' +
                     'باقی‌مانده (' + left.length + '): ' + (left.join('، ') || '—') +
                     '\n\nتا وقتی «۲) نصب زمان‌بندی خودکار» را نزنید، خودکار برنمی‌گردد.',
                     ui.ButtonSet.OK);
  }
  return { removed: gone };
}

function runSyncNow() {
  var ui = ui_();
  syncCatalog();
  var st = rebuildIndex_(getHub_());
  var bl = chunkBacklog_(getHub_());
  var m = 'همگام‌سازی انجام شد.\nویدیو: ' + st.videos + '\nعکس: ' + st.photos +
          '\nصدا: ' + st.audio + '\nسند: ' + st.docs +
          '\nاستفاده‌شده: ' + st.used +
          (bl.files ? '\n\nقطعه‌های در انتظار ترکیب: ' + bl.rows + ' قطعه از ' +
                      bl.files + ' فایل (تا رسیدنِ بقیهٔ قطعه‌ها منتظر می‌مانند)' : '') +
          '\n\nاگر آرشیو بزرگ است، ادامهٔ کار خودکار در پس‌زمینه انجام می‌شود.';
  if (ui) ui.alert(m); else console.log(m);
}

/** تولید دستی — سه گزینهٔ منو. تولید خودکارِ روزانه جداست و دست نمی‌خورد. */
function runProduceVariety() { return runProduceNow(); }

function runProduceSpecial() {
  var ui = ui_();
  // پیش از تولید بگو روی چه چیزی کار می‌شود و چرا — تا معلوم باشد که ادامهٔ
  // همان مجموعهٔ قبلی است یا مجموعه‌ای که خودتان دستی انتخاب کرده‌اید.
  var pre = '';
  var pendingBefore = false;
  try { pendingBefore = !!props_().getProperty(PK.SP_PENDING); } catch (ePp) {}
  try {
    // اگر قسمتِ قبلی هنوز در حال صداگذاری است، این اجرا قسمتِ تازه نمی‌سازد؛
    // پس دربارهٔ «مجموعهٔ بعدی» هم چیزی نمی‌گوییم.
    if (!pendingBefore) {
      var hubP = getHub_();
      var pinP = seriesPin_();
      var recP = pickSeries_(hubP);
      if (recP) {
        // نامِ خواندنیِ انتخاب دستی را نشان بده، نه کلیدِ درونی را
        var pinShowP = pinP ? pinLabel_(hubP, pinP) : '';
        // «ادامه» فقط وقتی راست است که همین مجموعه، همان مجموعهٔ قسمتِ قبلی باشد
        var lastKeyP = '';
        try { lastKeyP = String(props_().getProperty(PK.SP_SERIES) || ''); } catch (eLk) {}
        var sameP = lastKeyP && lastKeyP === recP.key;
        pre = 'روی این مجموعه کار می‌شود: «' + recP.vals[SC.NAME - 1] + '»' +
              (pinP ? '\n(چون خودتان ' + (pinP.kind === 'cat' ? 'دستهٔ' : 'مجموعهٔ') +
                      ' «' + pinShowP + '» را دستی انتخاب کرده‌اید)'
                    : (sameP ? '\n(ادامهٔ همان مجموعه‌ای که موتور رویش کار می‌کرد)'
                             : '\n(مجموعهٔ قبلی تمام شد؛ این مجموعهٔ تازه شروع می‌شود)')) + '\n\n';
      }
    }
  } catch (ePre) {}
  var r;
  try { r = produceSpecialEpisode({ manual: true }) || { ok: false, reason: 'unknown' }; }
  catch (e) { r = { ok: false, reason: 'error', detail: e.message }; }
  var m;
  if (r.audioOnly || (pendingBefore && r.reason === 'audio-pending')) {
    var epShow = r.episode;
    // مسیرِ خطا شمارهٔ قسمت را برنمی‌گرداند؛ از شمارندهٔ خودِ برنامه بخوانش
    if (!epShow) { try { epShow = props_().getProperty(PK.SP_EP_NUM) || ''; } catch (eEn) { epShow = ''; } }
    m = 'قسمتِ تازه‌ای ساخته نشد: قسمت ' + epShow +
        ' هنوز در حال صداگذاری است و همین اجرا صدایش را جلو برد.\n\n' +
        (r.reason === 'audio-error'
           ? 'ولی صداگذاری به خطا خورد: ' + (r.detail || '') +
             '\nتب «_گزارش» را ببینید؛ تلاش خودکار ادامه دارد.'
           : (r.done ? 'صداگذاری تمام شد و ایمیل و تلگرام رفت.'
                     : 'چند دقیقهٔ دیگر دوباره همین گزینه را بزنید؛ وقتی صدا تمام شد، ' +
                       'ساختِ قسمت بعد آزاد می‌شود.'));
  } else if (r.ok) {
    m = 'درس‌نامه ' + r.episode + ' از مجموعهٔ «' + (r.series || '') + '» نوشته شد.\n\n' +
        'صداگذاری در پس‌زمینه ادامه پیدا می‌کند و تا چند دقیقهٔ دیگر ایمیل و تلگرام می‌آید.';
  } else if (r.reason === 'busy') {
    m = 'اسکریپت دیگری در حال اجراست. چند دقیقه بعد دوباره بزنید.';
  } else if (r.reason === 'no-series') {
    m = 'هیچ مجموعهٔ آموزشی‌ای پیدا نشد.\n\n' +
        'اول «اسکن مجموعه‌های آموزشی» را بزنید. اگر باز هم چیزی نبود، یعنی در ' +
        'شیت‌های آموزشی هنوز فایلی با دست‌کم ' + CFG.SERIES_MIN_CHUNKS + ' قطعه نیست.';
  } else if (r.reason === 'series-done') {
    m = 'مجموعهٔ «' + (r.series || '') + '» تمام شد.\n\n' +
        'دوباره همین گزینه را بزنید تا مجموعهٔ بعدی شروع شود.';
  } else if (r.reason === 'disabled') {
    m = 'پادکست تخصصی در تنظیمات خاموش است (SPECIAL_ENABLED).';
  } else {
    m = 'ساخت درس‌نامه انجام نشد' + (r.detail ? ': ' + r.detail : '') +
        '.\nتب «_گزارش» علت دقیق را نوشته است.';
  }
  if (ui) ui.alert('درس‌نامه', pre + m, ui.ButtonSet.OK); else console.log(pre + m);
  return r;
}

function runProduceBoth() {
  var a, b;
  try { a = produceEpisode({ manual: true }); } catch (e) { a = { ok: false, reason: 'error', detail: e.message }; }
  try { b = produceSpecialEpisode({ manual: true }); } catch (e2) { b = { ok: false, reason: 'error', detail: e2.message }; }
  var m = 'از همه جا از همه رنگ: ' +
          (a && a.ok ? 'قسمت ' + a.episode + ' نوشته شد' : 'انجام نشد (' +
            ((a && a.reason) || '—') + ')') + '\n' +
          'درس‌نامه: ' +
          (b && b.ok ? 'قسمت ' + b.episode + ' نوشته شد' : 'انجام نشد (' +
            ((b && b.reason) || '—') + ')') +
          '\n\nصداگذاریِ هر دو در پس‌زمینه ادامه پیدا می‌کند.';
  var ui = ui_(); if (ui) ui.alert('تولید دستی — هر دو', m, ui.ButtonSet.OK); else console.log(m);
  return { variety: a, special: b };
}

function runScanSeries() {
  var r;
  try { r = scanSeries(true); } catch (e) { r = { error: e.message }; }
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  var L = ['مجموعه‌های شناسایی‌شده: ' + reg.rows.length];
  if (r && r.added !== undefined) L.push('تازه در این اسکن: ' + r.added +
                                         ' · بازگشایی: ' + (r.reopened || 0));
  /* اصلاح‌ها را همین‌جا می‌گوییم، چون همین دکمه است که آدم پس از یک تغییرِ
     شیت می‌زند و می‌خواهد بداند چه چیزی سرِ جایش رفت. */
  if (r && (r.seqFixed || r.moved || r.nameFixed)) {
    L.push('اصلاح شد: ' + (r.seqFixed || 0) + ' شمارهٔ قسمت · ' +
           (r.nameFixed || 0) + ' نام · ' + (r.moved || 0) + ' قسمت به مجموعهٔ دیگر رفت');
  } else if (r && r.added !== undefined) {
    L.push('اصلاحی لازم نشد — ترتیب و نامِ همهٔ قسمت‌ها همان بود که باید.');
  }
  if (r && r.error) L.push('خطا: ' + r.error);
  /* ══ «تعدادِ شیت‌های منبع و تب‌ها رو باید اول دقیق چک کنه» (۶٫۴۷) ══
     تا ۶٫۴۶ این دکمه فقط می‌گفت چند مجموعه پیدا شد — نه اینکه اصلاً کجاها
     را نگاه کرده. پس دو شیتِ کاملِ نادیده‌گرفته‌شده هیچ‌وقت دیده نشدند. */
  if (r && r.inventory && r.inventory.length) {
    L.push('');
    L.push('شیت‌های منبع (' + r.inventory.length + '):');
    for (var q = 0; q < r.inventory.length; q++) {
      var iv = r.inventory[q];
      L.push('  • ' + iv.src + ' — ' +
             (iv.why ? '⚠ ' + iv.why
                     : iv.read + ' تب از ' + iv.tabs + ' خوانده شد'));
      /* و **کدام** تب‌ها — وگرنه «۲ از ۱۰» شبیهِ خرابی به نظر می‌رسد در حالی
         که شش‌تایشان باید رد شوند و بعضی خالی‌اند. */
      for (var t2 = 0; t2 < (iv.detail || []).length; t2++) {
        var dt = iv.detail[t2];
        L.push('      ' + (dt.why ? '–' : '✓') + ' ' + dt.tab +
               ' (' + dt.rows + ' ردیف)' + (dt.why ? ' — ' + dt.why : ''));
      }
    }
  }
  if (r && r.unknownTabs && r.unknownTabs.length) {
    L.push('⚠ تبِ فایل‌دار ولی ناشناخته: ' + r.unknownTabs.slice(0, 5).join('، '));
  }
  /* ══ آنچه رد شد، همین‌جا و با نام (۶٫۵۰) ══
     این دکمه تا امروز فقط می‌گفت «۲۶۴ مجموعه، ۰ تازه» — و فایلی که صافی
     ردش کرده بود در هیچ خطی نمی‌آمد. یعنی جوابِ «فایلم کجاست؟» در همان
     پنجره‌ای که برای همین سؤال باز می‌شود، نبود. */
  try {
    var rjL = seriesRejected_();
    if (rjL && rjL.total) {
      L.push('');
      L.push('وارد فهرست نشد (' + rjL.total + ') — نامشان در تختهٔ مجموعه‌ها هم هست:');
      for (var rz = 0; rz < rjL.rows.length && rz < 10; rz++) {
        L.push('  ✗ ' + rjL.rows[rz].name + ' — ' + rjL.rows[rz].why);
      }
      if (rjL.total > 10) L.push('  … و ' + (rjL.total - 10) + ' تای دیگر');
    }
  } catch (eRz) {}
  L.push('');
  for (var i = 0; i < reg.rows.length && i < 20; i++) {
    var v = reg.rows[i].vals;
    L.push('• ' + v[SC.NAME - 1] + ' — ' + v[SC.PARTS - 1] + ' قسمت، ' +
           v[SC.CHUNKS - 1] + ' قطعه — ' + v[SC.STATUS - 1] +
           (v[SC.ORDER - 1] ? ' (ترتیب ' + v[SC.ORDER - 1] + ')' : ''));
  }
  var m = L.join('\n');
  var ui = ui_(); if (ui) ui.alert('مجموعه‌های آموزشی', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

function runProduceNow() {
  var ui = ui_();
  var r = produceEpisode({ manual: true }) || { ok: false, reason: 'unknown' };
  var m;
  if (r.ok === false && r.reason === 'busy')
    m = 'الان همگام‌سازی در حال اجراست و قفل اسکریپت را گرفته.\n\n' +
        'چند دقیقه صبر کنید و دوباره همین گزینه را بزنید. وقتی همگام‌سازی تمام شود ' +
        'خودِ زمان‌بندی روزانه هم بدون مشکل کار می‌کند.\n\n' +
        'پیشرفت همگام‌سازی را از «نمایش وضعیت» ببینید.';
  else if (r.ok === false && r.reason === 'nothing')
    m = 'هیچ دسته‌ای محتوای استفاده‌نشدهٔ کافی نداشت.\n\n' +
        'یا هنوز همگام‌سازی کامل نشده، یا همهٔ آیتم‌های باکیفیت قبلاً استفاده شده‌اند. ' +
        'می‌توانید در تنظیمات MIN_PRIORITY را پایین‌تر بیاورید.';
  else if (r.ok === false && r.reason === 'few')
    m = 'در دستهٔ «' + r.cat + '» فقط ' + r.count + ' آیتم یکتا مانده بود که برای یک قسمت کم است.';
  else if (r.ok === false)
    m = 'ساخت قسمت انجام نشد. تب «_گزارش» در همین شیت علت دقیق را نوشته است.';
  else if (r.duration === 'در حال ساخت' || r.duration === 'در حال ارسال')
    m = 'قسمت ' + r.episode + ' («' + r.title + '») نوشته شد.\n\n' +
        'صداگذاری طولانی‌تر از یک اجراست و خودکار در پس‌زمینه ادامه پیدا می‌کند.\n' +
        'تا چند دقیقهٔ دیگر ایمیل می‌رسد. وضعیت را از «نمایش وضعیت» ببینید.';
  else m = 'قسمت ' + r.episode + ' ساخته شد:\n' + r.title + '\nمدت: ' + r.duration +
           '\n\nایمیل ارسال شد.' + (r.telegram ? '\n' + r.telegram : '');
  if (ui) ui.alert(m); else console.log(m);
}

function showStatus() {
  var hub = getHub_();
  var st = rebuildIndex_(hub);
  var ep = props_().getProperty(PK.EP_NUM) || '0';
  var mode = props_().getProperty(PK.TTS_MODE) || 'هنوز تعیین نشده';
  var bl = chunkBacklog_(hub);

  // پیشرفتِ خواندن، برای هر (منبع، تب) جدا — پنج شیت و ده تبِ محتوایی
  var prog = ['پیشرفت خواندن منابع:'];
  for (var s = 0; s < CFG.SOURCES.length; s++) {
    var srcS = CFG.SOURCES[s];
    try {
      var ssS = SpreadsheetApp.openById(srcS.id);
      var legacyS = (srcS.schema === 'legacy-video' || srcS.schema === 'legacy-photo');
      var tabsS = legacyS ? [ssS.getSheets()[0]] : ssS.getSheets();
      var shown = 0;
      for (var tj = 0; tj < tabsS.length; tj++) {
        var shS = tabsS[tj], lastR = shS.getLastRow();
        if (lastR < 2) continue;
        if (!legacyS) {
          var lc = shS.getLastColumn();
          if (lc < 2 || !srcDetect_(shS.getRange(1, 1, 1, lc).getValues()[0])) continue;
        }
        var cur = parseInt(props_().getProperty(srcCursorKey_(srcS.key, shS.getName())) || '0', 10);
        prog.push('  • ' + srcS.title + (legacyS ? '' : ' › ' + shS.getName()) +
                  ': ' + Math.max(0, cur - 1) + ' از ' + (lastR - 1));
        shown++;
      }
      if (!shown) prog.push('  • ' + srcS.title + ': خالی');
    } catch (eS) { prog.push('  • ' + srcS.title + ': خوانده نشد (' + eS.message + ')'); }
  }

  var m = prog.concat([
    '',
    'آیتم در بانک — ویدیو: ' + st.videos + ' · عکس: ' + st.photos +
      ' · صدا: ' + st.audio + ' · سند: ' + st.docs,
    'قطعه‌های در انتظار ترکیب: ' + (bl.files ? bl.rows + ' قطعه از ' + bl.files + ' فایل' : 'ندارد'),
    'آیتم استفاده‌شده در قسمت‌ها: ' + st.used,
    'آخرین شمارهٔ قسمت: ' + ep,
    'حالت API صوت: ' + mode,
    modelsReport_(),
    'تلگرام: ' + (tgEnabled_() ? 'فعال (' + tgChat_() + ')' : 'تنظیم نشده'),
    'قسمت نیمه‌تمام: ' + (props_().getProperty(PK.PENDING) ? 'بله — صداگذاری ادامه دارد' : 'خیر'),
    'کلید Gemini: ' + (props_().getProperty(PK.API_KEY) ? 'ثبت شده' : 'ثبت نشده'),
    '',
    // شمار به‌تنهایی نمی‌گوید کدام کار زنده است و کدام تکراری — و تریگرِ
    // تکراری دقیقاً همان چیزی است که سال‌ها دیده نشد. نام‌ها را بشمار.
    'زمان‌بندی فعال: ' + trigList_()
  ]).join('\n');
  var ui = ui_(); if (ui) ui.alert('وضعیت موتور', m, ui.ButtonSet.OK); else console.log(m);
}

/** آزمون کامل: مدل متنی و هر دو شکل API صوتی را امتحان می‌کند و شکل کارآمد را ذخیره می‌کند. */
function testGemini() {
  var out = [];
  var ok = true;

  try {
    var j = geminiText_('یک شیء JSON با کلید ok و مقدار "بله" برگردان.',
      { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'] }, 4096);
    out.push('✅ مدل متنی (' + textModel_() + '): پاسخ داد — ' + JSON.stringify(j));
  } catch (e) {
    ok = false;
    out.push('❌ مدل متنی: ' + e.message.slice(0, 250));
  }

  var ttsM = ttsModel_();
  var modes = ttsPayloads_('سلام. این یک آزمایش کوتاه صدای فارسی است.', ttsM,
                           'گرم و معرفی‌گونه.');
  var winner = null;
  out.push('مدل صوتی انتخاب‌شده: ' + ttsM);
  var names = ['generateContent', 'interactions'];
  for (var i = 0; i < names.length; i++) {
    try {
      var r = geminiFetch_(modes[names[i]].url, modes[names[i]].body);
      var b64 = extractAudioB64_(r);
      out.push('✅ صوت با روش «' + names[i] + '»: ' + Math.round(b64.length * 3 / 4 / 1024) + ' کیلوبایت گرفته شد.');
      if (!winner) winner = names[i];
    } catch (e2) {
      out.push('⚠️ صوت با روش «' + names[i] + '» کار نکرد: ' + String(e2.message).slice(0, 200));
    }
  }

  if (winner) {
    props_().setProperty(PK.TTS_MODE, winner);
    // یک فایل نمونه در OUTPUT بساز تا صدا را بشنوید
    try {
      var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
      var demo = 'سلام. این یک نمونهٔ کوتاه از صدای پادکست فارسی شماست. ' +
                 'اگر این جمله را واضح و روان می‌شنوید، همه چیز درست کار می‌کند.';
      var res = synthesizeStep_(
        splitForTts_(demo).map(function (t) {
          return { text: t, style: 'گرم و معرفی‌گونه، مثل شروع یک برنامهٔ رادیویی.' };
        }), 'نمونه صدا', folder, 0, 1, new Date().getTime() + 120000);
      if (res.files.length) out.push('🎧 فایل نمونه ساخته شد: ' + res.files[0].url);
      else out.push('⚠️ فایل نمونه ساخته نشد.');
    } catch (e3) {
      out.push('⚠️ ساخت فایل نمونه ناموفق: ' + String(e3.message).slice(0, 200));
    }
  } else {
    ok = false;
    out.push('❌ هیچ‌کدام از روش‌های تبدیل متن به گفتار کار نکرد.');
    out.push('   بررسی کنید: کلید معتبر است؟ مدل «' + ttsM + '» روی حساب شما فعال است؟');
  }

  out.push('');
  out.push(tgEnabled_() ? '📨 تلگرام: تنظیم شده (با «آزمون ربات تلگرام» امتحانش کنید)'
                        : 'ℹ️ تلگرام تنظیم نشده — اختیاری است.');
  out.push('');
  out.push(ok ? 'نتیجه: آماده است. حالا «۲) نصب زمان‌بندی خودکار» را بزنید.'
              : 'نتیجه: هنوز مشکلی هست — پیام‌های بالا را بررسی کنید.');

  var m = out.join('\n');
  logLine_('آزمون Gemini: ' + (ok ? 'موفق' : 'ناموفق'));
  var ui = ui_(); if (ui) ui.alert('آزمون اتصال', m, ui.ButtonSet.OK); else console.log(m);
  return m;
}

/** اولین راه‌اندازی: شیت بانک را می‌سازد و منو را فعال می‌کند. */
function initialise() {
  var hub = getHub_();
  rebuildIndex_(hub);
  ensureMenuTrigger_();
  var msg = 'شیت بانک محتوا ساخته شد:\n' + hub.getUrl() +
            '\n\nآن را باز کنید؛ منوی «⚙️ موتور محتوا» بالای شیت ظاهر می‌شود.';
  console.log(msg);
  return hub.getUrl();
}
