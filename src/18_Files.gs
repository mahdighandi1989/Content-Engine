/**
 * 18_Files.gs — سامان‌دهیِ پوشهٔ هر قسمت
 *
 * هر قسمتِ پادکست باید پوشهٔ خودش را داشته باشد و همهٔ پیوست‌هایش در همان پوشه
 * باشند: فایل‌های صوتی (تکه‌ها و فایلِ یکپارچه)، متنِ HTML قسمت، و فایلِ
 * بایگانیِ JSON که برای ادامهٔ کار و بازسازی لازم است.
 *
 * تولیدِ تازه از همان اول همین کار را می‌کند. این‌جا دو چیز اضافه می‌شود:
 *   ۱) سامان‌دهیِ گذشته: فایل‌هایی که از نسخه‌های قبلی بیرونِ پوشهٔ قسمت مانده‌اند
 *      شناسایی و به پوشهٔ درستِ خودشان منتقل می‌شوند.
 *   ۲) وارسی: پوشهٔ هر قسمت که صدا یا متن ندارد گزارش می‌شود.
 *
 * هیچ چیزی در شیت‌ها و پوشه‌های مرجع دست نمی‌خورد؛ فقط پوشهٔ OUTPUT خودمان.
 * هیچ فایلی هم پاک نمی‌شود — فقط جابه‌جا.
 */

/** شمارهٔ قسمت را از نام فایل درمی‌آورد، برای هر دو برنامه. */
function epNumFromName_(name) {
  var n = faDigits_(String(name || ''));
  // «… — قسمت 0007 — …» یا «… — قسمت 007 — …»
  var m = n.match(/قسمت\s*(\d{1,5})/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

/** این فایل به کدام برنامه تعلق دارد؟ */
function showOfName_(name) {
  var n = String(name || '');
  if (n.indexOf(CFG.SPECIAL_SHOW_NAME) === 0) return 'special';
  if (n.indexOf(CFG.SHOW_NAME) === 0) return 'variety';
  return '';
}

/** نامِ استانداردِ پوشهٔ یک قسمت. */
function epFolderName_(epNum, title, when) {
  var pad = ('0000' + epNum).slice(-4);
  var stamp = when || Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyyMMdd');
  return 'قسمت ' + pad + ' — ' + stamp + ' — ' + String(title || '').slice(0, 60);
}

/** پوشهٔ همین قسمت را پیدا می‌کند؛ اگر نبود می‌سازد. */
function findOrMakeEpFolder_(parent, epNum, title, when) {
  var pad4 = ('0000' + epNum).slice(-4);
  var pad3 = ('000' + epNum).slice(-3);
  var it = parent.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    var nm = faDigits_(f.getName());
    var m = nm.match(/قسمت\s*(\d{1,5})/);
    if (m && parseInt(m[1], 10) === Number(epNum)) return f;
    if (nm.indexOf('قسمت ' + pad4) === 0 || nm.indexOf('قسمت ' + pad3) === 0) return f;
  }
  return parent.createFolder(epFolderName_(epNum, title, when));
}

/**
 * سامان‌دهیِ همهٔ قسمت‌های گذشته.
 * فایل‌های سرگردان در ریشهٔ OUTPUT و در پوشهٔ هر برنامه را برمی‌دارد و در
 * پوشهٔ قسمتِ خودش می‌گذارد. هیچ فایلی حذف نمی‌شود.
 */
function organizeEpisodeFolders(dryRun) {
  // کارِ سنگین و هم‌زمان با تولید است: بی قفل، می‌تواند وسطِ صداگذاریِ یک قسمت
  // فایل جابه‌جا کند.
  var lock = LockService.getScriptLock();
  var haveLock = false;
  try { haveLock = lock.tryLock(20 * 1000); } catch (eL) { haveLock = false; }
  if (!haveLock && !dryRun) return { moved: 0, made: 0, skipped: 0, checked: 0,
                                     gaps: [], report: [], busy: true };
  var tStart = new Date().getTime();
  var budget = Math.max(30000, (CFG.MAX_RUNTIME_MS || 270000) - 60000);
  var outOfTime = false;
  try {
  var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  var vFolder = showFolder_(CFG.VARIETY_FOLDER);
  var sFolder = showFolder_(CFG.SPECIAL_FOLDER);
  var moved = 0, made = 0, skipped = 0, checked = 0;
  var report = [];

  // ۱) فایل‌های سرگردانِ ریشهٔ OUTPUT، ریشهٔ پوشهٔ هر برنامه، و پوشهٔ هر دوره
  var scanIn = [{ folder: root, label: 'ریشهٔ OUTPUT' },
                { folder: vFolder, label: CFG.VARIETY_FOLDER },
                { folder: sFolder, label: CFG.SPECIAL_FOLDER }];
  // فایلِ سرگردان می‌تواند داخلِ پوشهٔ یک دوره هم افتاده باشد، نه فقط در ریشه.
  // دوره‌ها یا صاف زیرِ ریشه‌اند یا (نسخهٔ ۵٫۱۱) زیرِ پوشهٔ دستهٔ خودشان.
  var courseFolders = specialCourseFolders_(sFolder);
  for (var ci2 = 0; ci2 < courseFolders.length; ci2++) {
    scanIn.push({ folder: courseFolders[ci2],
                  label: CFG.SPECIAL_FOLDER + ' / ' + courseFolders[ci2].getName() });
  }
  // نقشهٔ «شمارهٔ قسمت → پوشه» برای هر والد، یک بار. پیش‌تر برای هر فایل، همهٔ
  // زیرپوشه‌ها از نو شمرده می‌شدند: هزینهٔ درایو با مربعِ اندازهٔ آرشیو بالا می‌رفت.
  var epMaps = Object.create(null);
  var mapOf = function (parent) {
    var id = parent.getId();
    if (!epMaps[id]) {
      var m = Object.create(null), it2 = parent.getFolders();
      while (it2.hasNext()) {
        var ff = it2.next();
        var mm = faDigits_(ff.getName()).match(/قسمت\s*(\d{1,5})/);
        if (mm) m['n' + parseInt(mm[1], 10)] = ff;
      }
      epMaps[id] = m;
    }
    return epMaps[id];
  };

  for (var s = 0; s < scanIn.length; s++) {
    var it = scanIn[s].folder.getFiles();
    var loose = [];
    while (it.hasNext()) {
      var f = it.next();
      var nm = f.getName();
      checked++;
      var show = showOfName_(nm);
      if (!show) continue;                       // فایل‌های سامانه (_STATUS و …)
      var num = epNumFromName_(nm);
      if (!num) { skipped++; continue; }
      loose.push({ file: f, show: show, num: num, name: nm });
    }
    for (var i = 0; i < loose.length; i++) {
      var L = loose[i];
      // ساختارِ درس‌نامه دو لایه است: «درس‌نامه / نامِ دوره / قسمت NNN».
      // نامِ دوره در خودِ نام فایل هست، پس پوشهٔ دوره را از همان درمی‌آوریم.
      var parent = vFolder;
      if (L.show === 'special') {
        var seriesName = seriesFromName_(L.name);
        parent = seriesName ? findSpecialCourse_(sFolder, seriesName, courseFolders) : sFolder;
      }
      if (new Date().getTime() - tStart > budget) { outOfTime = true; break; }
      var target;
      try {
        var map = mapOf(parent);
        target = map['n' + L.num];
        if (!target) {
          target = parent.createFolder(epFolderName_(L.num, titleFromName_(L.name), ''));
          map['n' + L.num] = target;
          made++;
        }
      } catch (eF) { skipped++; continue; }
      if (dryRun) { moved++; continue; }
      try {
        L.file.moveTo(target);
        moved++;
        report.push('«' + L.name + '» → ' + target.getName());
      } catch (eM) {
        skipped++;
        report.push('جابه‌جا نشد: «' + L.name + '» (' + eM.message + ')');
      }
    }
  }

  // ۲) وارسیِ کاملیِ پوشهٔ قسمت‌ها
  var gaps = [];
  var epFolders = [];
  // برنامهٔ متنوع: «از همه جا از همه رنگ / قسمت NNNN»
  var vit = vFolder.getFolders();
  while (vit.hasNext()) epFolders.push({ f: vit.next(), label: CFG.SHOW_NAME });
  // درس‌نامه: دوره‌ها صاف یا زیرِ دسته‌اند؛ قسمت‌ها زیرِ دوره. از همان فهرستِ
  // دوره‌های دسته‌آگاه استفاده می‌کنیم (شاملِ دوره‌های تازه‌ساخته‌شدهٔ همین اجرا).
  for (var ciC = 0; ciC < courseFolders.length; ciC++) {
    var course = courseFolders[ciC];
    var cit = course.getFolders();
    var any = false;
    while (cit.hasNext()) {
      any = true;
      epFolders.push({ f: cit.next(), label: CFG.SPECIAL_SHOW_NAME + ' · ' + course.getName() });
    }
    // پوشهٔ دوره‌ای که خودش مستقیم فایلِ قسمت دارد (ساختارِ قدیمی)
    if (!any && /قسمت\s*\d/.test(faDigits_(course.getName()))) {
      epFolders.push({ f: course, label: CFG.SPECIAL_SHOW_NAME });
    }
  }
  var shows = epFolders;
  for (var sh = 0; sh < shows.length; sh++) {
    {
      var ef = shows[sh].f;
      var has = { audio: 0, doc: 0, json: 0 };
      var fi = ef.getFiles();
      while (fi.hasNext()) {
        var ff = fi.next(), fn = ff.getName();
        if (/\.wav$/i.test(fn) || /\.mp3$/i.test(fn)) has.audio++;
        else if (/\.html$/i.test(fn)) has.doc++;
        else if (/\.json$/i.test(fn)) has.json++;
      }
      if (!has.audio || !has.doc) {
        gaps.push(shows[sh].label + ' · ' + ef.getName() + ' → ' +
                  (has.audio ? '' : 'صدا ندارد ') + (has.doc ? '' : 'متن ندارد'));
      }
    }
  }

  if (!dryRun && (moved || made)) {
    logLine_('سامان‌دهیِ پوشه‌ها: ' + moved + ' فایل جابه‌جا شد، ' + made +
             ' پوشهٔ قسمت ساخته شد' + (skipped ? '، ' + skipped + ' مورد رد شد' : '') + '.');
  }
  if (outOfTime) {
    logLine_('سامان‌دهیِ پوشه‌ها: مهلتِ این اجرا تمام شد؛ ادامه در چند دقیقه.');
    try { scheduleOrganizeContinue_(2 * 60 * 1000); } catch (eSc) {}
  } else {
    try { clearOrganizeContinuation_(); } catch (eCc) {}
  }
  return { moved: moved, made: made, skipped: skipped, checked: checked,
           gaps: gaps, report: report, dryRun: !!dryRun, pending: outOfTime };
  } finally {
    if (haveLock) { try { lock.releaseLock(); } catch (eR) {} }
  }
}

function organizeContinue() { organizeEpisodeFolders(false); }

function scheduleOrganizeContinue_(ms) {
  clearOrganizeContinuation_();
  ScriptApp.newTrigger('organizeContinue').timeBased().after(ms || 120000).create();
}

function clearOrganizeContinuation_() {
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'organizeContinue') ScriptApp.deleteTrigger(ts[i]);
  }
}

/** نامِ دوره را از نامِ فایلِ درس‌نامه بیرون می‌کشد. */
function seriesFromName_(name) {
  var parts = String(name || '').split(' — ');
  if (parts.length >= 3 && parts[0] === CFG.SPECIAL_SHOW_NAME) return parts[1].trim();
  return '';
}

/**
 * زیرپوشهٔ دوره؛ اگر نبود ساخته می‌شود.
 * تولیدکننده پوشهٔ دوره را با پیشوندِ شماره می‌سازد («02 — نامِ دوره»)، پس
 * جست‌وجوی نامِ دقیق آن را پیدا نمی‌کرد و یک پوشهٔ موازی می‌ساخت — یعنی
 * قسمت‌های یک دوره در دو شاخه پخش می‌شدند.
 */
function findOrMakeSub_(parent, name) {
  var want = String(name || '').trim();
  var it = parent.getFoldersByName(want);
  if (it.hasNext()) return it.next();
  var all = parent.getFolders();
  while (all.hasNext()) {
    var f = all.next();
    var bare = String(f.getName()).replace(/^[\d۰-۹٠-٩]{1,3}\s*—\s*/, '').trim();
    if (bare === want) return f;
  }
  return parent.createFolder(want);
}

/** آیا نامِ پوشه، پوشهٔ یک «قسمت» است (نه دوره و نه دسته)؟ */
function isEpisodeFolder_(f) {
  return /قسمت\s*\d/.test(faDigits_(String(f.getName())));
}

/**
 * همهٔ پوشه‌های «دوره» زیرِ درس‌نامه را برمی‌گرداند — چه صاف زیرِ ریشه (ساختارِ
 * قدیمی) و چه (از نسخهٔ ۵٫۱۱) یک لایه پایین‌تر، زیرِ پوشهٔ دستهٔ خودشان. تشخیص
 * ساختاری است: پوشه‌ای که زیرش پوشهٔ «قسمت» دارد یک دوره است؛ پوشه‌ای که زیرش
 * دوره دارد یک دسته است و خودش دوره نیست.
 */
function specialCourseFolders_(sFolder) {
  var out = [];
  var lvl1 = sFolder.getFolders();
  while (lvl1.hasNext()) {
    var a = lvl1.next();
    if (isEpisodeFolder_(a)) continue;                 // پوشهٔ قسمتِ سرگردانِ ریشه؛ دوره نیست
    var isCourse = false, hasSub = false, sub = a.getFolders();
    while (sub.hasNext()) { hasSub = true; if (isEpisodeFolder_(sub.next())) { isCourse = true; break; } }
    if (isCourse || !hasSub) { out.push(a); continue; } // دوره (یا پوشهٔ خالی/بی‌قسمت)
    var lvl2 = a.getFolders();                          // a یک دسته است؛ دوره‌ها یک لایه پایین‌تر
    while (lvl2.hasNext()) { var b = lvl2.next(); if (!isEpisodeFolder_(b)) out.push(b); }
  }
  return out;
}

/**
 * پوشهٔ دوره را با نام پیدا می‌کند (صاف یا زیرِ دسته)؛ اگر نبود، صاف زیرِ ریشه
 * می‌سازد — چون از نامِ یک فایلِ سرگردان، دستهٔ دوره معلوم نیست.
 */
function findSpecialCourse_(sFolder, seriesName, cache) {
  var want = String(seriesName || '').trim();
  if (!want) return sFolder;
  var list = cache || specialCourseFolders_(sFolder);
  for (var i = 0; i < list.length; i++) {
    var bare = String(list[i].getName()).replace(/^[\d۰-۹٠-٩]{1,3}\s*—\s*/, '').trim();
    if (list[i].getName() === want || bare === want) return list[i];
  }
  var made = sFolder.createFolder(want);
  if (cache) cache.push(made);
  return made;
}

function countFolders_(parent) {
  var n = 0, it = parent.getFolders();
  while (it.hasNext()) { it.next(); n++; }
  return n;
}

/** عنوانِ قسمت را از نام فایل بیرون می‌کشد (برای نامِ پوشه). */
function titleFromName_(name) {
  var parts = String(name || '').split(' — ');
  if (parts.length >= 3) {
    var t = parts[parts.length - 1].replace(/\.(wav|mp3|html|json)$/i, '').trim();
    // «بخش ۲» و «کامل» عنوانِ قسمت نیستند؛ عنوان یکی عقب‌تر است. رقمِ فارسی و
    // عربی هم باید گرفته شود، وگرنه پوشه‌ای به نامِ «قسمت 0003 — … — بخش ۲»
    // ساخته می‌شد.
    if (/^(بخش\s*[\d۰-۹٠-٩]+|کامل|full|part\s*\d+)$/i.test(t)) {
      t = String(parts[parts.length - 2] || '').replace(/\.(wav|mp3|html|json)$/i, '').trim();
    }
    if (t && !/^[\d۰-۹٠-٩]{8}$/.test(t)) return t;
  }
  return '';
}

/** منو: سامان‌دهیِ پوشهٔ قسمت‌ها. */
function runOrganizeFolders() {
  var ui = ui_();
  var r;
  try { r = organizeEpisodeFolders(false); }
  catch (e) { r = { error: e.message }; }
  var L = [];
  if (r.error) L.push('خطا: ' + r.error);
  else {
    L.push('فایل‌های بررسی‌شده: ' + r.checked);
    L.push('جابه‌جاشده به پوشهٔ قسمتِ خودش: ' + r.moved);
    L.push('پوشهٔ تازه ساخته‌شده: ' + r.made);
    if (r.skipped) L.push('رد شده (شمارهٔ قسمت از نامش پیدا نشد): ' + r.skipped);
    if (r.gaps.length) {
      L.push('');
      L.push('پوشه‌هایی که پیوستشان کامل نیست:');
      for (var i = 0; i < Math.min(8, r.gaps.length); i++) L.push('• ' + r.gaps[i]);
      if (r.gaps.length > 8) L.push('… و ' + (r.gaps.length - 8) + ' مورد دیگر');
    } else {
      L.push('');
      L.push('همهٔ پوشه‌های قسمت، هم صدا دارند و هم متن. ✅');
    }
  }
  var m = L.join('\n');
  if (ui) ui.alert('سامان‌دهیِ پوشهٔ قسمت‌ها', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}
