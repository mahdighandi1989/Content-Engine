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

/** متنِ وضع — همان چیزی که در پیام و در لاگ دیده می‌شود. */
function calReport_(st, today) {
  var L = ['📅 تقویمِ تولید — امروز ' + today.fa + '، ' + today.weekday, ''];
  for (var i = 0; i < st.shows.length; i++) {
    var s = st.shows[i];
    L.push((i + 1) + ') ' + (s.on ? '▶️ روشن' : '⏸ متوقف') + ' — ' + s.name);
    L.push('     روزها: ' + s.days +
           (s.exceptions ? ' · ' + s.exceptions + ' سطر استثنا' : ' · بدون استثنا'));
    L.push('     آخرین تصمیمِ موتور: ' + (s.last || 'هنوز اجرا نشده'));
    L.push('');
  }
  return L.join('\n');
}

/**
 * پاسخِ کاربر → فهرستِ شماره‌ها. «۱»، «۱،۲»، «1 2»، «همه».
 * چیزی که در بازه نباشد کنار گذاشته می‌شود؛ خالی یعنی «کاری نکن».
 */
function calPickIdx_(raw, count) {
  var t = faDigits_(String(raw || '')).trim();
  if (/همه|هردو|هر ?دو|all/i.test(t)) {
    var a = [];
    for (var i = 1; i <= count; i++) a.push(i);
    return a;
  }
  var out = [], seen = Object.create(null);
  var parts = t.split(/[^0-9]+/);
  for (var j = 0; j < parts.length; j++) {
    var n = parseInt(parts[j], 10);
    if (n >= 1 && n <= count && !seen[n]) { seen[n] = 1; out.push(n); }
  }
  return out;
}

/**
 * منو: «📅 تقویمِ تولید».
 *
 * سه کار می‌کند و به‌همین‌ترتیب، چون سه پرسشِ صاحبِ برنامه همین‌ها بودند:
 * «تقویم کجاست؟» → تب را می‌سازد و نشانی‌اش را می‌گوید.
 * «الان چه خبر است؟» → وضعِ هر برنامه با آخرین تصمیمِ خودِ موتور.
 * «چطور متوقفش کنم؟» → همین‌جا، با یک عدد؛ نه با ویرایشِ دستیِ تب.
 */
function runProductionCalendar() {
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  var hub = getHub_();
  var tabName = CFG.CAL_TAB || 'تقویمِ تولید';
  calSeed_(hub);
  var st = calStatus_();
  var today = calToday_();

  var head = calReport_(st, today);
  var where = 'این تقویم یک تبِ تازه در همین فایل است، به نامِ «' + tabName + '»\n' +
              '(پایینِ صفحه، کنارِ بقیهٔ تب‌ها). همین حالا ساخته شد.';

  if (!ui) { logLine_(head + '\n' + where); return st; }

  // ── گامِ یک: وضع + پیشنهادِ تغییر ─────────────────────────────────────
  var ans = ui.alert('تقویمِ تولید',
    head + where + '\n\n' +
    'می‌خواهید همین حالا یکی از برنامه‌ها را متوقف یا از سر بگیرید؟',
    ui.ButtonSet.YES_NO);

  if (ans !== ui.Button.YES) {
    ui.alert('تنظیمِ دقیق‌تر',
      'برای روزهای هفته و استثناها، تبِ «' + tabName + '» را باز کنید:\n\n' +
      '• ستونِ «فعال»  →  «خیر» یعنی توقفِ موقت، «بله» یعنی از سر گرفتن.\n' +
      '• ستونِ «روزهای هفته»  →  «همه» یا مثلاً «شنبه، دوشنبه، چهارشنبه».\n' +
      '• ستونِ «استثناها»  →  هر خط یک بازه.\n\n' +
      'نمونهٔ نوشتنِ استثنا (فقط برای نشان‌دادنِ قالب است — الان هیچ‌کدام از\n' +
      'این تاریخ‌ها در تقویمِ شما نیست):\n\n' +
      '    ۱۴۰۵/۰۶/۱۰ تا ۱۴۰۵/۰۶/۱۵ = تعطیل\n' +
      '    ۱۴۰۵/۰۶/۲۰ = فعال\n' +
      '    2026-09-01 تا 2026-09-05 = تعطیل\n\n' +
      'خطِ «= فعال» بر «= تعطیل» مقدم است، پس می‌شود وسطِ یک بازهٔ بلندِ تعطیل\n' +
      'یک روز را باز کرد بی‌آنکه کلِ بازه پاک شود.\n\n' +
      'ستونِ «آخرین تصمیم» را خودِ موتور می‌نویسد؛ دستش نزنید. اگر برای امروز\n' +
      'چیزی در آن نوشته نشده باشد، یعنی زمان‌بندی اصلاً اجرا نشده — و آن\n' +
      'مشکلی جداست از تعطیلی.\n\n' +
      'اجرای دستی از منو هیچ‌وقت مسدود نمی‌شود، و قسمتی که صداگذاری‌اش شروع\n' +
      'شده تا آخر تمام می‌شود.');
    return st;
  }

  // ── گامِ دو: کدام برنامه ──────────────────────────────────────────────
  var pick = ui.prompt('کدام برنامه؟',
    head + 'شمارهٔ برنامه را بنویسید و OK را بزنید — ۱ تا ' +
    faDigitsOut_(st.shows.length) + '.\n' +
    'چند تا با هم: «۱،۲». همه با هم: «همه».\n\n' +
    'وضعش برعکس می‌شود: روشن ← متوقف، متوقف ← روشن.',
    ui.ButtonSet.OK_CANCEL);
  if (pick.getSelectedButton() !== ui.Button.OK) return st;

  var raw = String(pick.getResponseText() || '');
  var idx = calPickIdx_(raw, st.shows.length);
  if (!idx.length) {
    ui.alert('«' + raw + '» در فهرست نیست. کاری انجام نشد.\n\n' +
             'یک عدد بنویسید (مثلاً ۱)، یا چند تا با ویرگول (۱،۲)، یا «همه».');
    return st;
  }

  // ── گامِ سه: تغییر، و نشان‌دادنِ نتیجه از روی خودِ تب ──────────────────
  var did = [];
  for (var q = 0; q < idx.length; q++) {
    var target = st.shows[idx[q] - 1];
    var r = calRow_(hub, target.key, target.name);
    var was = calOn_(r.vals[CC.ON - 1]);
    r.sheet.getRange(r.row, CC.ON).setValue(was ? 'خیر' : 'بله');
    did.push({ name: target.name, off: was });
    logLine_('تقویمِ تولید: «' + target.name + '» از منو ' +
             (was ? 'متوقف' : 'از سر گرفته') + ' شد.');
  }

  var lines = did.map(function (d) {
    return (d.off ? '⏸ «' + d.name + '» متوقف شد — دیگر خودکار ساخته نمی‌شود.'
                  : '▶️ «' + d.name + '» از سر گرفته شد — طبقِ روزهای تعیین‌شده.');
  });
  var after = calStatus_();
  ui.alert('انجام شد',
    lines.join('\n') + '\n\n' +
    'برای برگرداندن، همین گزینهٔ منو را دوباره بزنید و همان شماره را بدهید.\n\n' +
    calReport_(after, today) +
    'تغییر در تبِ «' + tabName + '»، ستونِ «فعال» نشست — همان‌جا هم می‌بینیدش.',
    ui.ButtonSet.OK);
  return after;
}
