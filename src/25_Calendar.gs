/* ═════════════════════════════════════════════════════════════════════════
   25_Calendar.gs — تقویمِ تولید

   ══ چه چیزی را حل می‌کند ══
   تا امروز تنها راهِ متوقف‌کردنِ تولید، حذفِ تریگرها بود — که همگام‌سازی و
   پشتیبان و نصبِ خودکارِ کد را هم می‌کشت، و برگرداندنش یعنی «نصبِ زمان‌بندی»
   از نو. یعنی عملاً راهی نبود.

   حالا یک تب هست: هر برنامه یک ردیف. می‌شود موقتاً خاموشش کرد، روزهای هفته‌اش
   را تعیین کرد، و برای بازه‌های خاص استثنا گذاشت.

   ══ چرا تب، نه تنظیماتِ کد ══
   تنظیماتِ کد یعنی برای هر تعطیلی باید نسخهٔ تازه‌ای منتشر شود. تعطیلی از
   جنسِ داده است، نه کد.

   ══ چرا هر پادکستِ آینده خودبه‌خود می‌آید ══
   ردیف با نخستین پرسشِ هر برنامه ساخته می‌شود. یک پادکستِ تازه همان روزِ اول
   ردیفِ خودش را در تب پیدا می‌کند، بی آنکه یک خط از این فایل عوض شود.

   ══ چرا «آخرین تصمیم» ستون دارد ══
   خواستهٔ صریحِ صاحبِ برنامه: «مطمئن باشم این تنظیمات اثر می‌گذارد». تنظیمی که
   نتیجه‌اش دیده نشود، قابلِ اعتماد نیست. موتور هر بار که تصمیم می‌گیرد —
   ساخت یا نساخت — همان‌جا می‌نویسد چه کرد و چرا. پس درستیِ تنظیمات از روی
   خودِ تب معلوم است، نه از روی حرفِ من.

   ══ اجرای دستی هرگز مسدود نمی‌شود ══
   تقویم فقط جلوی زمان‌بندیِ خودکار را می‌گیرد. اگر از منو «همین حالا بساز» را
   بزنید، ساخته می‌شود — تعطیلی یعنی «خودت شروع نکن»، نه «اجازه نداری».

   ══ و ادامهٔ کارِ نیمه‌تمام هم نه ══
   produceEpisodeContinue از مسیرِ دیگری می‌آید و اصلاً از این دروازه رد
   نمی‌شود. قسمتی که صداگذاری‌اش شروع شده باید تمام شود، حتی اگر امروز
   تعطیل باشد — وگرنه نیمه‌کاره در انبار می‌ماند.
   ═════════════════════════════════════════════════════════════════════════ */

var CAL_HEADERS = ['برنامه', 'نام', 'فعال', 'روزهای هفته', 'استثناها',
                   'آخرین تصمیم', 'یادداشت'];
var CC = { KEY: 1, NAME: 2, ON: 3, DAYS: 4, EXC: 5, LAST: 6, NOTE: 7 };

var CAL_YES = ['بله', 'آری', 'yes', 'true', 'on', '1', 'روشن', 'فعال'];
var CAL_NO = ['خیر', 'نه', 'no', 'false', 'off', '0', 'خاموش', 'غیرفعال', 'تعطیل'];

function calTab_(hub) {
  return ensureTab_(hub || getHub_(), CFG.CAL_TAB || 'تقویمِ تولید', CAL_HEADERS);
}

/** «بله/خیر» با هر املایی. نامعلوم = روشن (پیش‌فرضِ امن: تولید ادامه دارد). */
function calOn_(v) {
  var t = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
  if (!t) return true;
  for (var i = 0; i < CAL_NO.length; i++) if (t === CAL_NO[i]) return false;
  for (var j = 0; j < CAL_YES.length; j++) if (t === CAL_YES[j]) return true;
  return true;
}

/**
 * یک تاریخ را به عددِ مرتب‌شدنی تبدیل می‌کند، و می‌گوید در کدام گاه‌شمار است.
 * «۱۴۰۵/۰۶/۱۰» شمسی، «2026-09-01» میلادی. رقمِ فارسی هم پذیرفته است.
 * برمی‌گرداند {cal:'j'|'g', n:14050610} یا null.
 */
function calDateNum_(s) {
  var t = faDigits_(String(s || '')).trim().replace(/[.\-]/g, '/');
  var m = t.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  var y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) return null;
  // سالِ سه‌رقمی یا ۱۳۰۰ تا ۱۴۹۹ = شمسی؛ ۱۹۰۰ به بالا = میلادی
  var cal = (y >= 1900) ? 'g' : 'j';
  return { cal: cal, n: y * 10000 + mo * 100 + d };
}

/** رقمِ لاتین → رقمِ فارسی. faNumber_ عدد را به *حروف* می‌نویسد (برای گفتار)،
 *  و اینجا به آن نیاز نیست: ستونِ تاریخ باید «۱۴۰۵/۵/۳۱» باشد نه
 *  «هزار و چهارصد و پنج/پنج/سی و یک». */
function faDigitsOut_(n) {
  return String(n).replace(/[0-9]/g, function (d) {
    return String.fromCharCode(1776 + Number(d));
  });
}

/** امروز، در هر دو گاه‌شمار. */
function calToday_(d) {
  d = d || new Date();
  var ymd = Utilities.formatDate(d, CFG.TIMEZONE, 'yyyy-MM-dd').split('-');
  var gy = parseInt(ymd[0], 10), gm = parseInt(ymd[1], 10), gd = parseInt(ymd[2], 10);
  var j = toJalali_(gy, gm, gd);
  return {
    g: gy * 10000 + gm * 100 + gd,
    j: j.jy * 10000 + j.jm * 100 + j.jd,
    weekday: FA_WEEKDAYS[new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay()],
    iso: ymd.join('-'),
    // دو رقمی، تا با قالبِ نمونه‌های استثنا («۱۴۰۵/۰۶/۱۰») یکی باشد
    fa: faDigitsOut_(j.jy) + '/' + faDigitsOut_(('0' + j.jm).slice(-2)) +
        '/' + faDigitsOut_(('0' + j.jd).slice(-2))
  };
}

/**
 * استثناها را می‌خواند. هر خط یکی از این شکل‌هاست:
 *   1405/06/10 تا 1405/06/15 = تعطیل
 *   1405/06/20 = فعال
 *   2026-09-01 تا 2026-09-05 = تعطیل
 * برمی‌گرداند: {hit:true, on:false, text:'…'} اگر امروز در بازه‌ای بود.
 *
 * «فعال» بر «تعطیل» مقدم است — تا بشود وسطِ یک بازهٔ تعطیل، یک روز را
 * استثنای استثنا کرد. بی این، بازهٔ بلند هیچ راهِ فرار نداشت.
 */
function calException_(text, today) {
  var lines = String(text || '').split(/[\n\r؛;]+/);
  var hitOff = null, hitOn = null;
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i].trim();
    if (!raw) continue;
    var on = /فعال|روشن|بساز|بله/.test(raw);
    var parts = raw.split(/=|:/)[0];
    var ds = parts.split(/تا|\.\.|—|–/);
    var a = calDateNum_(ds[0]);
    if (!a) continue;
    var b = ds.length > 1 ? calDateNum_(ds[1]) : a;
    if (!b || b.cal !== a.cal) b = a;
    var now = (a.cal === 'j') ? today.j : today.g;
    var lo = Math.min(a.n, b.n), hi = Math.max(a.n, b.n);
    if (now < lo || now > hi) continue;
    if (on) hitOn = raw; else hitOff = raw;
  }
  if (hitOn) return { hit: true, on: true, text: hitOn };
  if (hitOff) return { hit: true, on: false, text: hitOff };
  return { hit: false };
}

/** آیا امروز جزوِ روزهای هفتهٔ این برنامه است؟ خالی یا «همه» = بله. */
function calDayOk_(days, weekday) {
  var t = String(days || '').trim();
  if (!t || /همه|هر ?روز|all/i.test(t)) return true;
  return t.indexOf(String(weekday)) !== -1;
}

/** ردیفِ این برنامه؛ اگر نبود ساخته می‌شود (پیش‌فرض: روشن، همهٔ روزها). */
function calRow_(hub, key, name) {
  var sh = calTab_(hub);
  var last = sh.getLastRow();
  if (last > 1) {
    var v = sh.getRange(2, 1, last - 1, CAL_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][CC.KEY - 1]).trim() === String(key)) {
        return { row: i + 2, vals: v[i], sheet: sh };
      }
    }
  }
  var fresh = [String(key), String(name || key), 'بله', 'همه', '', '', ''];
  sh.appendRow(fresh);
  logLine_('تقویمِ تولید: ردیفِ «' + (name || key) + '» ساخته شد (پیش‌فرض: روشن).');
  return { row: sh.getLastRow(), vals: fresh, sheet: sh };
}

/**
 * دروازهٔ تولید. از زمان‌بندیِ خودکار صدا زده می‌شود، نه از منو.
 * برمی‌گرداند {ok:true} یا {ok:false, why:'…'}
 *
 * هر بار، تصمیم در همان ردیف نوشته می‌شود — این تنها راهی است که صاحبِ
 * برنامه می‌تواند ببیند تنظیماتش واقعاً اثر گذاشته.
 */
function calGate_(key, name) {
  if (CFG.CAL_ENABLED === false) return { ok: true, why: 'تقویم خاموش است' };
  var today = calToday_();
  var r, dec;
  try {
    r = calRow_(null, key, name);
  } catch (e) {
    // خواندنِ تقویم نباید تولید را بکشد. سکوت بدتر از تولیدِ اضافه است.
    logLine_('تقویمِ تولید خوانده نشد؛ تولید ادامه یافت: ' + e.message);
    return { ok: true, why: 'تقویم خوانده نشد' };
  }

  var exc = calException_(r.vals[CC.EXC - 1], today);
  if (exc.hit && !exc.on) {
    dec = 'تعطیل — استثنا: ' + auditCut_(exc.text, 60);
  } else if (!calOn_(r.vals[CC.ON - 1])) {
    dec = 'تعطیل — ستونِ «فعال» خاموش است';
  } else if (!exc.on && !calDayOk_(r.vals[CC.DAYS - 1], today.weekday)) {
    dec = 'تعطیل — ' + today.weekday + ' جزوِ روزهای این برنامه نیست';
  } else {
    dec = 'ساخته شد' + (exc.hit && exc.on ? ' — استثنای فعال' : '');
  }

  try {
    r.sheet.getRange(r.row, CC.LAST).setValue(today.fa + ' — ' + dec);
  } catch (eW) {}

  var ok = dec.indexOf('تعطیل') !== 0;
  if (!ok) logLine_('تقویمِ تولید: «' + (name || key) + '» امروز ' + dec + '.');
  return { ok: ok, why: dec };
}

/** خلاصه برای _STATUS.json و ناظرِ روزانه. */
function calStatus_() {
  var out = { enabled: CFG.CAL_ENABLED !== false, shows: [] };
  try {
    var sh = getHub_().getSheetByName(CFG.CAL_TAB || 'تقویمِ تولید');
    if (!sh || sh.getLastRow() < 2) return out;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, CAL_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      if (!String(v[i][CC.KEY - 1]).trim()) continue;
      out.shows.push({
        key: String(v[i][CC.KEY - 1]), name: String(v[i][CC.NAME - 1] || ''),
        on: calOn_(v[i][CC.ON - 1]), days: String(v[i][CC.DAYS - 1] || 'همه'),
        exceptions: String(v[i][CC.EXC - 1] || '').split(/[\n\r؛;]+/)
                      .filter(function (x) { return x.trim(); }).length,
        last: String(v[i][CC.LAST - 1] || '')
      });
    }
  } catch (e) {}
  return out;
}

/* ═══════════ تقویم، از داخلِ تختهٔ مجموعه‌ها (۵٫۶۱) ═══════════

   ══ چرا جابه‌جا شد ══
   خواستهٔ صاحبِ برنامه: «تقویم باید ذیلِ همان جایی باشد که مجموعه‌ها را
   مدیریت می‌کنم، نه یک گزینهٔ جدا در منو.» درست است — کنترلی که جای دیگری
   از کاری که کنترل می‌کند بنشیند، پیدا نمی‌شود.

   ══ و چه چیزی عمداً دست نخورد ══
   **هیچ‌چیز در مدلِ داده.** همان تبِ «تقویمِ تولید»، همان ستون‌ها، همان
   calGate_. این‌ها ۵۷ سنجه دارند و هر تغییری در آن‌ها یعنی از نو اثبات‌کردنِ
   چیزی که ثابت شده. آنچه عوض شد فقط *سطحِ نمایش* است: توابعِ زیر می‌خوانند
   و می‌نویسند، همان‌جا که calGate_ می‌خواند.

   پس اگر این پنجره بشکند، تولید نمی‌شکند — بدترین حالت این است که تنظیم از
   پنجره انجام نشود و کاربر همان تب را دستی ویرایش کند.
   ═════════════════════════════════════════════════════════════════════════ */

/** دادهٔ تقویم برای تخته: یک ردیف برای هر برنامه. */
function calBoardData_() {
  var out = { enabled: CFG.CAL_ENABLED !== false, today: null, shows: [] };
  try { out.today = calToday_(); } catch (e) {}
  var hub;
  try { hub = getHub_(); } catch (eH) { return out; }

  // برنامه‌های شناخته‌شده اول بذر می‌خورند تا ردیفشان باشد، بعد کلِ تب خوانده
  // می‌شود — پس برنامه‌ای که فقط در تب هست (پادکستِ آینده) هم می‌آید.
  try { calSeed_(hub); } catch (e2) {}
  try {
    var sh = calTab_(hub);
    if (sh.getLastRow() < 2) return out;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, CAL_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var key = String(v[i][CC.KEY - 1] || '').trim();
      if (!key) continue;
      var days = String(v[i][CC.DAYS - 1] || 'همه').trim();
      var all = !days || /همه|هر ?روز|all/i.test(days);
      var ticks = [];
      for (var d = 0; d < FA_WEEKDAYS.length; d++) {
        ticks.push(all ? true : days.indexOf(FA_WEEKDAYS[d]) !== -1);
      }
      out.shows.push({
        key: key,
        name: String(v[i][CC.NAME - 1] || key),
        on: calOn_(v[i][CC.ON - 1]),
        days: ticks,
        allDays: all,
        exceptions: String(v[i][CC.EXC - 1] || ''),
        last: String(v[i][CC.LAST - 1] || '')
      });
    }
  } catch (e3) {}
  return out;
}

/**
 * ذخیرهٔ یک ردیف از تخته.
 *
 * `days` آرایه‌ای هفت‌تایی از بله/خیر است، به همان ترتیبِ FA_WEEKDAYS.
 * همه تیک‌خورده → «همه» نوشته می‌شود، نه فهرستِ هفت‌تایی: هم خواناتر است و
 * هم همان چیزی که calDayOk_ از اول می‌فهمید.
 *
 * هیچ تیکی نخورده → این یعنی «هیچ روزی»، که با «فعال = خیر» یکی است ولی
 * گیج‌کننده. پس برنامه خاموش می‌شود و صریح گفته می‌شود چه شد.
 */
function calBoardSave_(key, on, days, exceptions) {
  var hub = getHub_();
  var r = calRow_(hub, String(key || ''), '');
  var note = [];

  var picked = [];
  for (var i = 0; i < FA_WEEKDAYS.length; i++) {
    if (days && days[i]) picked.push(FA_WEEKDAYS[i]);
  }
  var onVal = on ? 'بله' : 'خیر';
  if (on && !picked.length) {
    onVal = 'خیر';
    note.push('هیچ روزی تیک نخورده بود، پس برنامه خاموش شد');
  }
  var daysVal = (picked.length === FA_WEEKDAYS.length || !picked.length)
                  ? 'همه' : picked.join('، ');

  r.sheet.getRange(r.row, CC.ON).setValue(onVal);
  r.sheet.getRange(r.row, CC.DAYS).setValue(daysVal);
  r.sheet.getRange(r.row, CC.EXC).setValue(String(exceptions == null ? '' : exceptions));

  logLine_('تقویمِ تولید: «' + r.vals[CC.NAME - 1] + '» از تخته تنظیم شد — ' +
           onVal + ' · ' + daysVal + '.');
  return { ok: true, on: onVal === 'بله', days: daysVal, note: note.join('؛ ') };
}

/* ─────────────────────────────── منو ─────────────────────────────────── */

/**
 * تب و ردیف‌ها را همین حالا می‌سازد.
 *
 * چرا لازم شد: ردیف با نخستین *اجرای خودکار* ساخته می‌شد، پس صاحبِ برنامه که
 * همان روزِ نصب منو را باز کرد، «هنوز ردیفی ساخته نشده» دید و چیزی برای
 * تنظیم‌کردن نداشت. کسی که می‌خواهد امشب را تعطیل کند، نمی‌تواند تا فردا صبر
 * کند تا ردیفش خودبه‌خود ساخته شود.
 */
function calSeed_(hub) {
  var made = [];
  var L = [];
  try { L = knownShows_(); } catch (e) { L = []; }
  for (var i = 0; i < L.length; i++) {
    try {
      var before = calTab_(hub).getLastRow();
      calRow_(hub, L[i].key, L[i].name);
      if (calTab_(hub).getLastRow() > before) made.push(L[i].name);
    } catch (e2) {}
  }
  try { calWidths_(calTab_(hub)); } catch (e3) {}
  return made;
}

/** ستون‌ها را خوانا می‌کند. یک‌بار کافی است، ولی تکرارش هم بی‌ضرر است. */
function calWidths_(sh) {
  var W = [110, 210, 70, 190, 260, 240, 160];
  for (var i = 0; i < W.length; i++) sh.setColumnWidth(i + 1, W[i]);
  sh.getRange(2, CC.EXC, Math.max(sh.getMaxRows() - 1, 1), 1).setWrap(true);
  sh.getRange(2, CC.LAST, Math.max(sh.getMaxRows() - 1, 1), 1)
    .setNumberFormat('@').setFontColor('#666666');
}

/* ═════════════════════════════ مقصدها (۱۱.۵) ═════════════════════════════

   ══ خواسته ══
   «جدولِ مقصدها … متصل به قفل و سوییچِ واقعی، با آزمونِ "هر کنترلِ شیت را بک‌اند
   واقعاً می‌خوانَد"» — یک ردیف برای هر جایی که موتور منتشر می‌کند (یوتیوب،
   اینستاگرام، فیسبوک)، با «فعال»، «برنامه‌ها»، «سقفِ روزانه» و «آخرین وضعیت».

   ══ چرا این‌جا، کنارِ تقویم ══
   تقویم می‌گوید «کی ساخته شود»؛ این تب می‌گوید «کجا برود». همان شکل، همان
   قاعده‌ها (تب داده است نه کد؛ ستونِ آخرین وضعیت را خودِ موتور می‌نویسد)، و
   همان جایگاه: ۲۵ پیش از ۲۷ (یوتیوب) و ۳۸ (اینستاگرام/فیسبوک) است، پس هر دو
   این را بی فراخوانِ رو به جلو صدا می‌زنند.

   ══ پیش‌فرض یعنی رفتارِ امروز ══
   ردیف‌های بذری دقیقاً همان چیزی‌اند که پیش از این تب بود: یوتیوب روشن برای هر
   دو برنامه، اینستاگرام روشن برای درس‌نامه، فیسبوک **خاموش**. پس نصبِ این نسخه
   هیچ چیزی را عوض نمی‌کند تا کسی تیکی را عوض کند.

   ══ اگر تب خوانده نشود ══
   آخرین خواندنِ سالم (`PK.DEST_CACHE`) به کار می‌رود، و اگر آن هم نباشد همان
   بذر. یعنی شکستنِ تب نه انتشارِ خاموش‌شده را روشن می‌کند (تا وقتی یک بار سالم
   خوانده شده باشد)، نه همه‌چیز را بی‌صدا می‌خواباند.

   ══ «خاموش» چه می‌کند ══
   هیچ چیزی پاک یا رد نمی‌شود. یوتیوب: ردیفِ صف کنار می‌رود (`YT_DUE_PARKED`) و
   با روشن‌شدن برمی‌گردد — همان راهی که ۱۱.۰ برای «از همه جا» ساخت. اینستاگرام:
   ریلزِ آماده سرِ گامِ انتشار می‌ایستد. فیسبوک: ریلز بازنشر نمی‌شود.
   ═════════════════════════════════════════════════════════════════════════ */

var DEST_HEADERS = ['مقصد', 'حساب', 'فعال', 'برنامه‌ها', 'سقفِ روزانه', 'آخرین وضعیت', 'یادداشت'];
var DC = { KIND: 1, ACCT: 2, ON: 3, SHOWS: 4, CAP: 5, LAST: 6, NOTE: 7 };

/** بذر — همان رفتارِ پیش از این تب. `shows` کلیدِ برنامه‌هاست. */
function destKinds_() {
  return [
    { kind: 'yt', name: 'یوتیوب', acct: String(CFG.YT_MARK_HANDLE || '@truth_trace1'), on: true,
      shows: [ENRICH_SHOW_SPECIAL, ENRICH_SHOW_VARIETY],
      note: 'ویدئوی کامل و شورتز. سقف = آپلود در روز (شورتز هم یک آپلود است). خالی = سقفِ کد.' },
    { kind: 'ig', name: 'اینستاگرام', acct: '@truth.traces', on: true,
      shows: [ENRICH_SHOW_SPECIAL],
      note: 'ریلز و استوریِ درس‌نامه. سقف = ریلز در روز. خالی = سقفِ کد.' },
    { kind: 'fb', name: 'فیسبوک', acct: 'صفحهٔ Truth Trace', on: false,
      shows: [ENRICH_SHOW_SPECIAL],
      note: 'بازنشرِ همان ریلزِ اینستاگرام روی صفحه. تا کلیدِ متا دسترسیِ صفحه نداشته باشد، روشن‌کردنش فقط علت را در «آخرین وضعیت» می‌نویسد.' }
  ];
}

function destKindOf_(cell) {
  var t = String(cell == null ? '' : cell).trim().toLowerCase();
  if (!t) return '';
  if (/یوتیوب|youtube|^yt$/.test(t)) return 'yt';
  if (/اینستا|instagram|^ig$/.test(t)) return 'ig';
  if (/فیسبوک|facebook|^fb$/.test(t)) return 'fb';
  return '';
}

/** نامِ نمایشیِ برنامه‌ها ⇄ کلید. «همه»/خالی ⇒ null (همه). */
function destShowsParse_(cell) {
  var t = String(cell == null ? '' : cell).trim();
  if (!t || /^(همه|all|\*)$/i.test(t)) return { keys: null, bad: [] };
  if (/^(هیچ|none|-)$/i.test(t)) return { keys: [], bad: [] };
  var L = [];
  try { L = knownShows_(); } catch (e) { L = []; }
  var keys = [], bad = [];
  var toks = t.split(/[،,;؛\n\r]+/);
  for (var i = 0; i < toks.length; i++) {
    var x = toks[i].replace(/[«»"]/g, '').trim();
    if (!x) continue;
    var k = '';
    for (var j = 0; j < L.length; j++) {
      if (x === L[j].key || x === String(L[j].name)) { k = L[j].key; break; }
    }
    if (!k && /درس/.test(x)) k = ENRICH_SHOW_SPECIAL;
    if (!k && /همه ?جا/.test(x)) k = ENRICH_SHOW_VARIETY;
    if (!k) { bad.push(x); continue; }
    if (keys.indexOf(k) === -1) keys.push(k);
  }
  return { keys: keys, bad: bad };
}

function destShowsText_(keys) {
  if (!keys) return 'همه';
  if (!keys.length) return 'هیچ';
  var out = [];
  for (var i = 0; i < keys.length; i++) {
    try { out.push(enrichShowName_(keys[i])); } catch (e) { out.push(keys[i]); }
  }
  return out.join('، ');
}

function destTab_(hub) {
  return ensureTab_(hub || getHub_(), CFG.DEST_TAB || 'مقصدها', DEST_HEADERS);
}

/** ردیفِ هر مقصدی که نیست ساخته می‌شود؛ ردیفِ موجود هرگز بازنویسی نمی‌شود. ⇒ نامِ ساخته‌شده‌ها */
function destSeed_(hub) {
  var sh = destTab_(hub), have = {}, made = [];
  if (sh.getLastRow() > 1) {
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, DEST_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) { var k = destKindOf_(v[i][DC.KIND - 1]); if (k) have[k] = 1; }
  }
  var K = destKinds_();
  for (var j = 0; j < K.length; j++) {
    if (have[K[j].kind]) continue;
    sh.appendRow([K[j].name, K[j].acct, K[j].on ? 'بله' : 'خیر', destShowsText_(K[j].shows), '', '', K[j].note]);
    made.push(K[j].name);
  }
  if (made.length) { try { logLine_('مقصدها: ردیفِ ' + made.join('، ') + ' ساخته شد (پیش‌فرض = رفتارِ پیشین).'); } catch (eL) {} }
  return made;
}

var DEST_MEMO_ = null;
function destMemoClear_() { DEST_MEMO_ = null; }

function destDefaults_() {
  var rows = {}, K = destKinds_();
  for (var i = 0; i < K.length; i++) {
    rows[K[i].kind] = { kind: K[i].kind, name: K[i].name, acct: K[i].acct, on: K[i].on,
                        shows: K[i].shows.slice(), cap: 0, last: '', row: 0, bad: [] };
  }
  return rows;
}

/**
 * خواندنِ تب، یک بار در هر دقیقهٔ اجرا. ⇒ {src:'tab'|'cache'|'default', rows:{yt,ig,fb}, why}
 * ردیفی که در تب نیست از بذر پر می‌شود — پس «نیامدن» هرگز «خاموش» خوانده نمی‌شود.
 */
function destRead_() {
  if (DEST_MEMO_ && Date.now() - DEST_MEMO_.t < 60 * 1000) return DEST_MEMO_.v;
  var out = { src: 'default', rows: destDefaults_(), why: '' };
  try {
    var hub = getHub_();
    destSeed_(hub);
    var sh = destTab_(hub);
    var v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, DEST_HEADERS.length).getValues() : [];
    var seen = {};
    for (var i = 0; i < v.length; i++) {
      var k = destKindOf_(v[i][DC.KIND - 1]);
      if (!k || seen[k]) continue;          // ردیفِ دوم با همان مقصد نادیده — اولی حاکم است
      seen[k] = 1;
      var sp = destShowsParse_(v[i][DC.SHOWS - 1]);
      var cap = parseInt(faDigits_(String(v[i][DC.CAP - 1] == null ? '' : v[i][DC.CAP - 1])).replace(/[^\d]/g, ''), 10);
      var base = out.rows[k];
      out.rows[k] = { kind: k, name: base.name, acct: String(v[i][DC.ACCT - 1] || base.acct),
                      on: !destOff_(v[i][DC.ON - 1], base.on), shows: sp.keys, bad: sp.bad,
                      cap: isFinite(cap) && cap > 0 ? cap : 0, last: String(v[i][DC.LAST - 1] || ''), row: i + 2 };
    }
    out.src = 'tab';
    try {
      var js = JSON.stringify(out.rows);
      if (props_().getProperty(PK.DEST_CACHE) !== js) props_().setProperty(PK.DEST_CACHE, js);
    } catch (eC) {}
  } catch (e) {
    out.why = String((e && e.message) || e).slice(0, 120);
    try {
      var c = JSON.parse(props_().getProperty(PK.DEST_CACHE) || 'null');
      if (c && c.yt) { out.rows = c; out.src = 'cache'; }
    } catch (eP) {}
  }
  DEST_MEMO_ = { t: Date.now(), v: out };
  return out;
}

/** «بله/خیر» با پیش‌فرضِ همان ردیفِ بذری؛ ⇒ true یعنی خاموش. */
function destOff_(v, defOn) {
  var t = String(v == null ? '' : v).trim().toLowerCase();
  if (!t) return !defOn;
  for (var i = 0; i < CAL_NO.length; i++) if (t === CAL_NO[i]) return true;
  for (var j = 0; j < CAL_YES.length; j++) if (t === CAL_YES[j]) return false;
  return !defOn;
}

/**
 * دروازه. ⇒ {ok, why, cap}. `show` خالی یعنی «هر برنامه‌ای».
 * این تنها جایی است که «فعال» و «برنامه‌ها» معنا می‌گیرند — یوتیوب، اینستاگرام و فیسبوک هر سه همین را صدا می‌زنند.
 */
function destGate_(kind, show) {
  var d = destRead_(), r = d.rows[kind];
  if (!r) return { ok: true, why: '', cap: 0 };
  if (!r.on) return { ok: false, why: 'مقصدِ «' + r.name + '» در تبِ «' + (CFG.DEST_TAB || 'مقصدها') + '» خاموش است', cap: r.cap };
  if (show && r.shows && r.shows.indexOf(String(show)) === -1) {
    var nm = show;
    try { nm = enrichShowName_(show); } catch (e) {}
    return { ok: false, why: '«' + nm + '» در برنامه‌های مقصدِ «' + r.name + '» تیک نخورده', cap: r.cap };
  }
  return { ok: true, why: '', cap: r.cap };
}

/** سقفِ مؤثر: کوچک‌ترِ سقفِ کد و سقفِ تب (خالی ⇒ سقفِ کد). */
function destCap_(kind, codeCap) {
  var c = Number(codeCap) || 0, r = destRead_().rows[kind];
  if (r && r.cap > 0) return c > 0 ? Math.min(c, r.cap) : r.cap;
  return c;
}

/** ستونِ «آخرین وضعیت» را خودِ موتور می‌نویسد — همان قاعدهٔ «آخرین تصمیم»ِ تقویم. یک بار برای هر متن در هر اجرا. */
var DEST_NOTED_ = {};
function destNote_(kind, text) {
  var t = String(text || '').slice(0, 300);
  if (!t || DEST_NOTED_[kind] === t) return false;
  DEST_NOTED_[kind] = t;
  try {
    var d = destRead_(), r = d.rows[kind];
    if (!r || !r.row || d.src !== 'tab') return false;
    destTab_(getHub_()).getRange(r.row, DC.LAST).setValue(nowStr_() + ' — ' + t);
    r.last = t;
    return true;
  } catch (e) { return false; }
}

/** دادهٔ پنلِ تخته. */
function destBoardData_() {
  var d = destRead_(), out = { src: d.src, why: d.why, shows: [], rows: [] };
  try { out.shows = knownShows_(); } catch (e) { out.shows = []; }
  var K = destKinds_();
  for (var i = 0; i < K.length; i++) {
    var r = d.rows[K[i].kind] || {};
    out.rows.push({ kind: K[i].kind, name: K[i].name, acct: r.acct || K[i].acct, on: !!r.on,
                    shows: r.shows ? r.shows.slice() : null, cap: r.cap || 0, last: r.last || '', bad: r.bad || [] });
  }
  return out;
}

/**
 * ذخیره از تخته — روی **همان تب و همان ستون‌ها** که `destGate_` می‌خوانَد.
 * list: [{kind, on, shows:[کلید], cap}]. «روشن ولی هیچ برنامه‌ای تیک نخورده» ⇒ خاموش، و صریح گفته می‌شود
 * (همان قاعدهٔ تقویم: هیچ تیکی نباید معنای «همه» بگیرد).
 */
function destBoardSave_(list) {
  var hub = getHub_();
  destSeed_(hub);
  destMemoClear_();
  var d = destRead_(), sh = destTab_(hub), notes = [], done = [];
  var known = {};
  try { knownShows_().forEach(function (s) { known[s.key] = 1; }); } catch (e) {}
  for (var i = 0; i < (list || []).length; i++) {
    var x = list[i] || {}, r = d.rows[String(x.kind)];
    if (!r || !r.row) { notes.push('مقصدِ ناشناخته: ' + x.kind); continue; }
    var shows = [];
    (x.shows || []).forEach(function (k) { if (known[k] && shows.indexOf(k) === -1) shows.push(k); });
    var on = !!x.on;
    if (on && !shows.length) { on = false; notes.push('«' + r.name + '»: هیچ برنامه‌ای تیک نخورده بود، پس خاموش شد'); }
    var cap = parseInt(faDigits_(String(x.cap == null ? '' : x.cap)).replace(/[^\d]/g, ''), 10);
    sh.getRange(r.row, DC.ON).setValue(on ? 'بله' : 'خیر');
    sh.getRange(r.row, DC.SHOWS).setValue(destShowsText_(shows));
    sh.getRange(r.row, DC.CAP).setValue(isFinite(cap) && cap > 0 ? cap : '');
    done.push(r.name + ': ' + (on ? 'روشن — ' + destShowsText_(shows) + (cap > 0 ? ' · سقف ' + cap : '') : 'خاموش'));
  }
  destMemoClear_();
  try { logLine_('مقصدها از تخته: ' + done.join(' | ') + (notes.length ? ' (' + notes.join('؛ ') + ')' : '')); } catch (eL) {}
  return { ok: true, done: done, note: notes.join('؛ ') };
}

/** برای `_STATUS.json` و ایمیلِ روزانه. */
function destStatus_() {
  var d = destRead_(), rows = [], parts = [];
  var K = destKinds_();
  for (var i = 0; i < K.length; i++) {
    var r = d.rows[K[i].kind];
    if (!r) continue;
    rows.push({ kind: r.kind, on: !!r.on, shows: r.shows, cap: r.cap || 0, last: r.last || '', bad: r.bad || [] });
    parts.push(r.name + ' ' + (r.on ? 'روشن (' + destShowsText_(r.shows) + (r.cap ? '، سقف ' + r.cap : '') + ')' : 'خاموش') +
               ((r.bad || []).length ? ' ⚠ خوانده نشد: ' + r.bad.join('، ') : ''));
  }
  return { src: d.src, why: d.why, rows: rows,
           line: '🎯 مقصدها' + (d.src === 'tab' ? '' : d.src === 'cache' ? ' (تب خوانده نشد — آخرین خواندنِ سالم)' : ' (تب خوانده نشد — پیش‌فرض)') +
                 ': ' + parts.join(' · ') + '.' };
}
