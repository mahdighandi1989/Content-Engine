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
      .addItem('⬇️ آوردنِ موسیقی از فهرستِ پیشنهادی', 'runMusicFetch')
      .addItem('🎵 پویشِ بانکِ موسیقی (بی برچسب‌زنی)', 'runMusicScan')
      .addItem('🎙 آزمونِ شنیداریِ گویندگان', 'runVoiceAudition')
      .addItem('کنار گذاشتنِ یک گوینده', 'runBlockVoice')
      .addSeparator()
      .addItem('📅 تقویمِ تولید — توقف، روزها و استثناها', 'runProductionCalendar')
      .addItem('🔎 سنجهٔ محتوا — متنِ نهایی در برابرِ متنِ خام', 'runContentAudit')
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

function installTriggers() {
  removeTriggers(true);
  props_().deleteProperty(PK.SCHED_OFF);      // زمان‌بندی عمداً روشن شد
  ensureMenuTrigger_();
  // همگام‌سازی هر ۲ ساعت: محتوای تازهٔ شیت‌ها را برمی‌دارد
  ScriptApp.newTrigger('syncCatalog').timeBased().everyHours(2).create();
  // آماده‌سازیِ متن، چند ساعت پیش از انتشار: در این فاصله Cowork متن را با
  // جست‌وجوی وب غنی می‌کند و بعد صدا ساخته می‌شود.
  if (CFG.ENRICH_ENABLED !== false) {
    ScriptApp.newTrigger('prepareEpisode').timeBased()
      .atHour(CFG.PREPARE_HOUR || 4).nearMinute(0).everyDays(1)
      .inTimezone(CFG.TIMEZONE).create();
    if (CFG.SPECIAL_ENABLED) {
      ScriptApp.newTrigger('prepareSpecialEpisode').timeBased()
        .atHour(CFG.PREPARE_SPECIAL_HOUR || 5).nearMinute(0).everyDays(1)
        .inTimezone(CFG.TIMEZONE).create();
    }
  }
  // تولید قسمت روزانهٔ «از همه جا از همه رنگ»، ساعت ۷ صبح به وقت دبی
  ScriptApp.newTrigger('produceEpisode').timeBased().atHour(CFG.EPISODE_HOUR || 7)
    .nearMinute(0).everyDays(1).inTimezone(CFG.TIMEZONE).create();
  // تولید قسمت روزانهٔ «درس‌نامه»، یک ساعت بعد — دو تولیدِ سنگین هم‌زمان
  // اجرا نمی‌شوند و قفلِ اسکریپت به هم برخورد نمی‌کند.
  if (CFG.SPECIAL_ENABLED) {
    ScriptApp.newTrigger('produceSpecialEpisode').timeBased()
      .atHour(clampHour_(CFG.SPECIAL_HOUR, 8)).nearMinute(0).everyDays(1)
      .inTimezone(CFG.TIMEZONE).create();
  }
  // وارسی سلامت، سه ساعت بعد از زمان تولید، تا اگر قسمت نیامد خبردار شوید
  ScriptApp.newTrigger('healthCheck').timeBased().atHour(10).nearMinute(0)
    .everyDays(1).inTimezone(CFG.TIMEZONE).create();
  // بررسیِ شبانهٔ کدِ تازه — پیش از پشتیبان، تا نسخهٔ نصب‌شده هم در پشتیبانِ همان شب بیاید
  if (CFG.AUTOUPDATE_ENABLED !== false) {
    ScriptApp.newTrigger('selfUpdateDaily').timeBased()
      .atHour(clampHour_(CFG.UPDATE_HOUR, 2)).nearMinute(30).everyDays(1)
      .inTimezone(CFG.TIMEZONE).create();
  }
  // پشتیبانِ شبانهٔ شیت‌ها — پیش از شروعِ کارِ روز، وقتی هیچ تولیدی در جریان نیست
  if (CFG.BACKUP_ENABLED) {
    ScriptApp.newTrigger('backupDaily').timeBased()
      .atHour(CFG.BACKUP_HOUR).nearMinute(0).everyDays(1)
      .inTimezone(CFG.TIMEZONE).create();
    // از این لحظه انتظارِ پشتیبانِ شبانه داریم. وارسیِ سلامت بر پایهٔ همین
    // زمان قضاوت می‌کند، وگرنه همان دقیقهٔ نصب هشدارِ «پشتیبان نگرفته‌ای» می‌داد.
    if (!props_().getProperty(PK.BACKUP_SINCE)) {
      props_().setProperty(PK.BACKUP_SINCE, nowStr_());
    }
  }

  var msg = 'زمان‌بندی نصب شد:\n• همگام‌سازی: هر ۲ ساعت\n' +
            (CFG.ENRICH_ENABLED !== false
               ? '• آماده‌سازیِ متن (برای غنی‌سازیِ اینترنتی): ساعت ' +
                 (CFG.PREPARE_HOUR || 4) + ' و ' + (CFG.PREPARE_SPECIAL_HOUR || 5) + '\n' : '') +
            (CFG.BACKUP_ENABLED
               ? '• پشتیبانِ شیت‌ها: هر شب ساعت ' + CFG.BACKUP_HOUR + ' (دبی)، ' +
                 CFG.BACKUP_KEEP + ' نسخهٔ آخر نگه داشته می‌شود\n' : '') +
            (CFG.AUTOUPDATE_ENABLED !== false
               ? '• نصبِ خودکارِ کدِ تازه: هر شب ساعت ' + clampHour_(CFG.UPDATE_HOUR, 2) +
                 ':۳۰ (اگر ناظر کدِ تازه گذاشته باشد)\n' : '') +
            '• «از همه جا از همه رنگ»: هر روز ساعت ۷ صبح (دبی)\n' +
            (CFG.SPECIAL_ENABLED
               ? '• «درس‌نامه» (تخصصی): هر روز ساعت ' + CFG.SPECIAL_HOUR + ' صبح (دبی)\n' : '') +
            '• وارسی سلامت: هر روز ساعت ۱۰ صبح\n• منوی شیت: فعال';
  logLine_('زمان‌بندی نصب شد.');
  var ui = ui_(); if (ui) ui.alert(msg); else console.log(msg);
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
function ensureScheduledTriggers_() {
  // اگر خودتان «حذف زمان‌بندی» را زده‌اید، خودکار برنمی‌گردد. «نصب زمان‌بندی»
  // این نشانه را پاک می‌کند. بی این، یک کلیکِ ساده همهٔ چیزی را که عمداً خاموش
  // کرده بودید بی‌صدا روشن می‌کرد.
  if (props_().getProperty(PK.SCHED_OFF)) return { checked: 0, added: 0, off: true };
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
    want.push({ fn: 'selfUpdateDaily', kind: 'daily', hour: clampHour_(CFG.UPDATE_HOUR, 2) });
  }
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
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    var f = ts[i].getHandlerFunction();
    if (f === 'syncCatalog' || f === 'produceEpisode' || f === 'healthCheck' ||
        f === 'syncCatalogContinue' || f === 'produceEpisodeContinue' ||
        f === 'produceSpecialEpisode' || f === 'produceSpecialContinue' ||
        f === 'backupDaily' || f === 'backupContinue' || f === 'organizeContinue') {
      ScriptApp.deleteTrigger(ts[i]);
    }
  }
  // حذفِ دستی یعنی «خاموش بماند». وارسیِ خودکارِ زمان‌بندی به آن احترام می‌گذارد
  // تا با یک همگام‌سازی دوباره روشن نشود. «نصب زمان‌بندی» این نشانه را برمی‌دارد.
  if (!silent) {
    props_().setProperty(PK.SCHED_OFF, nowStr_());
    var ui = ui_();
    if (ui) ui.alert('زمان‌بندی حذف شد. (منو دست‌نخورده ماند)\n\n' +
                     'تا وقتی «۲) نصب زمان‌بندی خودکار» را نزنید، خودکار برنمی‌گردد.');
  }
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
  if (r && r.error) L.push('خطا: ' + r.error);
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
    'زمان‌بندی فعال: ' + ScriptApp.getProjectTriggers().length + ' مورد'
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
