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
