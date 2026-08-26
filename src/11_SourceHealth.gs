/**
 * 11_SourceHealth.gs — دیدبانیِ خودِ شیت‌های منبع
 *
 * شیت‌های منبع «تغذیهٔ» کلِ سیستم‌اند. اگر خط لولهٔ شما در آن‌ها به خطا بخورد —
 * مدل پاسخ خالی بدهد، سهمیه تمام شود، JSON بریده برگردد — بانک محتوا بی‌صدا
 * لاغر می‌شود و کسی خبردار نمی‌شود. این بخش دو کار می‌کند:
 *
 *   ۱) «خطاگیری»: همان لحظه که موتور یک ردیف تازه را می‌خواند، وارسی می‌کند
 *      که خطِ لوله در آن ردیف پیام خطا ننوشته باشد. هر مورد در تب
 *      «_خطاهای منبع» ثبت می‌شود — با شمارهٔ ردیف در شیت منبع، تا مستقیم
 *      بروید سراغش. (شیت منبع خوانده می‌شود، نوشته نمی‌شود.)
 *
 *   ۲) «نبض»: برای هر تب، ستون تاریخِ پردازش را در دنبالهٔ ردیف‌های آخر
 *      می‌خوانَد و الگوی زمانیِ واقعیِ همان تب را درمی‌آورد — فاصلهٔ معمول بین
 *      ردیف‌ها. بعد می‌سنجد که آیا این تب به الگوی خودش وفادار مانده یا
 *      راکد/کم‌کار شده. آستانه ثابت نیست؛ از رفتار خودِ آن تب می‌آید، چون یک
 *      تب ممکن است روزی صد ردیف بگیرد و تبِ دیگر ماهی یکی.
 */

// ------------------------------------------------------------ الگوهای خطا

// عمداً باریک‌اند. جمله‌هایی مثل «جدولی یافت نشد» نتیجهٔ درستِ تحلیل‌اند، نه خطا؛
// اگر با کلیدواژهٔ عمومی می‌گشتیم، روزی صدها هشدارِ بی‌مورد می‌آمد و هشدارها
// بی‌ارزش می‌شدند.
// دو ردهٔ قاعده:
//   strict:true  — نشانهٔ خطا در هر جایی، حتی وسط یک متنِ بلند. این‌ها آن‌قدر
//                  مشخص‌اند که در گفتارِ عادی پیش نمی‌آیند.
//   strict:false — عبارت‌های عمومی‌تر. فقط در سلول‌های کوتاه و ستون وضعیت
//                  سنجیده می‌شوند، نه در متنِ گفتار — چون آرشیوِ کاربر خودش
//                  دربارهٔ API و برنامه‌نویسی است و جمله‌هایی مثل «دربارهٔ
//                  rate limit در APIهای صرافی» یا «timed out of the overbought
//                  zone» در متنِ درس‌ها می‌آید و خطا نیست.
// ترتیب مهم است: قاعدهٔ مشخص‌تر جلوتر می‌آید تا برچسبِ دقیق‌تر بخورد.
var SRC_ERR_RULES = [
  { type: 'پاسخ مدل تجزیه نشد', strict: true,
    re: /(Unterminated string|Expecting value|Expecting ',' delimiter|JSONDecodeError|Invalid JSON|Unexpected token .{0,20}in JSON)/i },
  { type: 'خطای اجرا', strict: true,
    re: /(Traceback \(most recent call last\)|(^|\n)\s*(Error|Exception|SyntaxError|TypeError|ValueError|KeyError)\s*:|\bStack ?trace\b)/ },
  { type: 'پاسخ خالی مدل', strict: true,
    re: /(خالی برگردانده|نیاز به بازپردازش|empty response|no content returned|returned nothing|candidates\[0\] is undefined)/i },
  { type: 'سهمیه یا نرخ', strict: true,
    re: /(RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|quota exceeded|exceeded your current quota|too many requests|\b429\b[^\n]{0,30}(quota|rate|limit))/i },
  { type: 'محتوای مسدودشده', strict: true,
    re: /(RECITATION|PROHIBITED_CONTENT|SAFETY_?BLOCK|blocked by (the )?safety|finish_?[Rr]eason[^\n]{0,20}SAFETY)/ },
  { type: 'مدل یا کلید', strict: true,
    re: /(is not found for API version|models\/[\w.\-]+ is not found|API key not valid|API_KEY_INVALID|PERMISSION_DENIED)/i },
  // «HTTP 503» عمداً این‌جا نیست: در متنِ درس‌های DevOpsِ خودِ آرشیو می‌آید.
  // در ردهٔ عمومی پایین می‌آید تا فقط در سلول‌های کوتاه سنجیده شود.
  { type: 'قطع یا مهلت', strict: true,
    re: /(DEADLINE_EXCEEDED|Deadline ?[Ee]xceeded|\bUNAVAILABLE\b|model is overloaded|Internal error encountered|Error 5\d\d\b)/ },

  { type: 'سهمیه یا نرخ', strict: false, re: /(\brate limit\b|\bquota\b)/i },
  { type: 'قطع یا مهلت', strict: false,
    re: /(\btimed out\b|\btimeout\b|service unavailable|(status|code|http) ?5\d\d\b)/i },
  { type: 'ناتوانی در تحلیل', strict: false,
    re: /(تحلیل ناموفق|قابل تحلیل نیست|خطای پردازش|نتوانست[^\n]{0,25}(تحلیل|پردازش|بخواند)|unable to (analyz|process|read)|could not (analyz|process|read))/i },
  { type: 'خطای اجرا', strict: false, re: /(^|[\s>])(Error|Exception)\s*:/ }
];

var SRC_ERR_HEADERS = ['زمان ثبت', 'منبع', 'تب', 'ردیف در منبع', 'شناسه فایل',
                       'نوع خطا', 'متن خطا', 'لینک فایل'];
var SRC_ERR_MAX = 600;              // بیش از این، قدیمی‌ترها هرس می‌شوند
var SRC_ERR_SCAN_CELL = 400;        // سلول‌های کوتاه‌تر از این کامل وارسی می‌شوند
var SRC_PULSE_SAMPLE = 300;         // چند ردیف آخر برای درآوردن الگوی زمانی

function ensureSrcErrTab_(hub) { return ensureTab_(hub, CFG.SRC_ERR_TAB, SRC_ERR_HEADERS); }

/**
 * کلیدهای خطاهای ثبت‌شده، تا یک خرابیْ چند بار گزارش نشود.
 * واحدِ گزارش «یک فایل، یک نوع خطا» است نه «یک ردیف»: در دادهٔ واقعی، یک فایلِ
 * سی‌وچهار قطعه‌ای که تحلیلِ تخصصی‌اش برنگشته، سی‌وچهار ردیفِ خطادار می‌سازد —
 * ولی خرابی یکی است. اگر ردیف‌به‌ردیف گزارش می‌شد، سی‌وچهار هشدار برای یک مشکل می‌آمد.
 */
function loadSrcErrKeys_(hub) {
  var keys = {};
  var sh = hub.getSheetByName(CFG.SRC_ERR_TAB);
  if (!sh || sh.getLastRow() < 2) return keys;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, SRC_ERR_HEADERS.length).getValues();
  for (var i = 0; i < v.length; i++) {
    if (!v[i][1]) continue;
    keys[srcErrKey_(v[i][1], v[i][2], v[i][4], v[i][5], v[i][3], v[i][0])] = true;
  }
  return keys;
}

/**
 * کلید یکتاییِ یک خرابی: روز + منبع + تب + فایل + نوع.
 * «روز» در کلید هست تا اگر همان خرابی هفته‌ها بعد دوباره تکرار شود، دوباره
 * گزارش شود. بی آن، یک خطای برطرف‌شده که برمی‌گشت برای همیشه ساکت می‌ماند.
 * در همان روز اما تکرار نمی‌شود، پس سی‌وچهار قطعهٔ یک فایل یک هشدار می‌سازند.
 */
function srcErrKey_(source, tab, fileId, type, rowNo, at) {
  var f = String(fileId || '').trim();
  var day = String(at || nowStr_()).slice(0, 10);
  return day + '§' + String(source) + '§' + String(tab) + '§' +
         (f ? f : 'r' + rowNo) + '§' + String(type);
}

/**
 * آیا در این ردیفِ منبع، خط لوله پیام خطا نوشته است؟
 * سلول‌های کوتاه کامل وارسی می‌شوند (پیام خطا معمولاً کوتاه است) و از سلول‌های
 * بلندِ خلاصه فقط ابتدایشان — تا وارسی روی شیتِ شصت‌ستونی گران نشود.
 */
function srcErrorOf_(row, m, status) {
  var i, j, txt;
  var checked = 0;

  var probe = function (s, strictOnly) {
    s = String(s === null || s === undefined ? '' : s);
    if (!s) return null;
    for (var k = 0; k < SRC_ERR_RULES.length; k++) {
      if (strictOnly && !SRC_ERR_RULES[k].strict) continue;
      if (SRC_ERR_RULES[k].re.test(s)) {
        return { type: SRC_ERR_RULES[k].type, text: s.replace(/\s+/g, ' ').slice(0, 300) };
      }
    }
    return null;
  };

  // ۱) ستون وضعیت — همهٔ قاعده‌ها، چون این ستون متنِ محتوایی ندارد
  var st = String(status || '');
  if (st) {
    var up = st.toUpperCase();
    if (up.indexOf('ERROR') !== -1 || up.indexOf('FAIL') !== -1 ||
        st.indexOf('خطا') !== -1 || st.indexOf('ناموفق') !== -1) {
      return { type: 'وضعیت ناموفق', text: st.replace(/\s+/g, ' ').slice(0, 300) };
    }
    var hitS = probe(st, false);
    if (hitS) return hitS;
  }

  // ۲) ستون‌های خلاصه/تحلیل/متن (فقط ابتدایشان، و فقط با قاعده‌های سخت‌گیر)
  var heads = [m.summary, m.summary2, m.points, m.ideas, m.expert, m.body];
  for (i = 0; i < heads.length; i++) {
    if (heads[i] === undefined || heads[i] < 0 || heads[i] >= row.length) continue;
    txt = String(row[heads[i]] === null || row[heads[i]] === undefined ? '' : row[heads[i]]).slice(0, 900);
    var hit = probe(txt, true);
    if (hit) return hit;
  }

  // ۳) هر سلول کوتاه دیگری — پیام‌های خطا معمولاً همین‌جا می‌نشینند و
  //    سلولِ کوتاه، متنِ گفتار نیست؛ پس این‌جا قاعده‌های عمومی هم اعمال می‌شوند.
  for (j = 0; j < row.length && checked < 80; j++) {
    var v = row[j];
    if (v === null || v === undefined) continue;
    if (v instanceof Date) continue;
    var s2 = String(v);
    if (!s2 || s2.length > SRC_ERR_SCAN_CELL) continue;
    checked++;
    var hit2 = probe(s2, false);
    if (hit2) return hit2;
  }
  return null;
}

/** ردیف‌های خطا را در تب گزارش خطا می‌نویسد و تب را هرس می‌کند. */
function flushSrcErrors_(hub, rows) {
  if (!rows || !rows.length) return;
  var sh = ensureSrcErrTab_(hub);
  var start = sh.getLastRow() + 1;
  var need = (start + rows.length - 1) - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
  sh.getRange(start, 1, rows.length, SRC_ERR_HEADERS.length).setValues(rows);

  var last = sh.getLastRow();
  if (last - 1 > SRC_ERR_MAX) {
    var drop = (last - 1) - SRC_ERR_MAX;
    var keep = sh.getRange(2 + drop, 1, last - 1 - drop, SRC_ERR_HEADERS.length).getValues();
    sh.getRange(2, 1, keep.length, SRC_ERR_HEADERS.length).setValues(keep);
    sh.getRange(2 + keep.length, 1, drop, SRC_ERR_HEADERS.length).clearContent();
  }
}

/** خلاصهٔ خطاهای ثبت‌شده: جمع کل، بیست‌وچهار ساعت اخیر، و تازه‌ترین نمونه‌ها. */
function srcErrorSummary_(hub, sampleN) {
  var out = { total: 0, last24h: 0, last7d: 0, byType: {}, byTab: {}, recent: [] };
  var sh = hub.getSheetByName(CFG.SRC_ERR_TAB);
  if (!sh || sh.getLastRow() < 2) return out;
  var n = sh.getLastRow() - 1;
  var v = sh.getRange(2, 1, n, SRC_ERR_HEADERS.length).getValues();
  var now = new Date().getTime();
  out.total = 0;
  for (var i = 0; i < v.length; i++) {
    if (!v[i][1] && !v[i][5]) continue;
    out.total++;
    var w = parseWhen_(v[i][0]);
    var ageH = isNaN(w) ? 99999 : (now - w) / 3600000;
    if (ageH <= 24) out.last24h++;
    if (ageH <= 168) out.last7d++;
    var ty = String(v[i][5] || 'نامشخص');
    out.byType[ty] = (out.byType[ty] || 0) + 1;
    var tb = String(v[i][1] || '') + ' › ' + String(v[i][2] || '');
    out.byTab[tb] = (out.byTab[tb] || 0) + 1;
  }
  var take = Math.min(sampleN || 20, v.length);
  for (var j = v.length - take; j < v.length; j++) {
    if (j < 0) continue;
    if (!v[j][1] && !v[j][5]) continue;
    out.recent.push({
      at: String(v[j][0]), source: String(v[j][1]), tab: String(v[j][2]),
      row: v[j][3], fileId: String(v[j][4]), type: String(v[j][5]),
      text: String(v[j][6]).slice(0, 240), link: String(v[j][7])
    });
  }
  return out;
}

// ------------------------------------------------------------------- نبض

/**
 * الگوی زمانیِ یک تب را از دنبالهٔ ردیف‌های آخرش درمی‌آورد.
 * فقط یک ستون (تاریخ پردازش) و فقط سیصد ردیف آخر خوانده می‌شود، پس ارزان است.
 */
function sourcePulse_(sh, dateCol, lastRow) {
  var res = { rows: Math.max(0, lastRow - 1), sampled: 0, lastAt: '', daysSinceLast: null,
              quietGapDays: null, perActiveDay: null, activeDays: 0,
              last7: 0, last30: 0, capped: false, verdict: 'نامعلوم' };
  if (lastRow < 2 || dateCol < 0) return res;

  var take = Math.min(SRC_PULSE_SAMPLE, lastRow - 1);
  var vals = sh.getRange(lastRow - take + 1, dateCol + 1, take, 1).getValues();
  var now = new Date().getTime();
  var FUTURE_OK = 2 * 86400000;      // اختلاف منطقهٔ زمانی، نه تاریخِ آینده

  var ts = [], future = 0, firstT = null, lastT = null;
  for (var i = 0; i < vals.length; i++) {
    var t = parseWhen_(canonDate_(vals[i][0]));
    if (isNaN(t)) continue;
    if (firstT === null) firstT = t;
    lastT = t;
    // یک ردیفِ تاریخ‌آینده (غلط تایپی در سال، یا منطقهٔ زمانیِ جابه‌جا) کافی بود
    // تا «آخرین ردیف» جلو بیفتد و یک تبِ کاملاً مرده «فعال» گزارش شود.
    if (t - now > FUTURE_OK) { future++; continue; }
    ts.push(t);
  }
  res.sampled = ts.length;
  res.futureRows = future;
  res.capped = (take >= SRC_PULSE_SAMPLE);
  // اگر ردیف‌های نمونه نزولی‌اند، شیت مرتب‌سازی شده و «آخرین ردیف» یعنی
  // پایین‌ترین ردیف، نه تازه‌ترین. در این حالت داوری نمی‌کنیم.
  res.orderSuspect = (firstT !== null && lastT !== null && lastT < firstT - 86400000);
  if (!ts.length) return res;

  ts.sort(function (a, b) { return a - b; });
  var last = ts[ts.length - 1];
  res.lastAt = Utilities.formatDate(new Date(last), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  res.daysSinceLast = Math.round(((now - last) / 86400000) * 10) / 10;

  // شمارشِ روزانه: پایهٔ همهٔ سنجه‌ها. میانگینِ ساده روی «کلِ بازه» گمراه‌کننده
  // است، چون این خط‌های لوله دسته‌ای کار می‌کنند: صد ردیف در یک روز و بعد
  // چند روز سکوت. پس هم «روزهای فعال» را می‌شماریم و هم میانهٔ ردیف‌در‌روز را.
  var perDay = {}, j;
  for (j = 0; j < ts.length; j++) {
    var key = Math.floor(ts[j] / 86400000);
    perDay[key] = (perDay[key] || 0) + 1;
    var age = (now - ts[j]) / 86400000;
    if (age <= 7) res.last7++;
    if (age <= 30) res.last30++;
  }
  var dayKeys = [];
  for (var k in perDay) if (perDay.hasOwnProperty(k)) dayKeys.push(Number(k));
  dayKeys.sort(function (a, b) { return a - b; });
  res.activeDays = dayKeys.length;
  res.perActiveDay = Math.round((ts.length / dayKeys.length) * 10) / 10;

  var span = (ts[ts.length - 1] - ts[0]) / 86400000;
  res.spanDays = Math.round(span * 10) / 10;

  // «سکوتِ معمول» = دومین فاصلهٔ بزرگ بین روزهای فعال. میانه به درد نمی‌خورد:
  // در یک خط لولهٔ دسته‌ای، صدها ردیف در یک دقیقه می‌آیند، پس میانهٔ فاصله‌ها
  // تقریباً صفر است و آستانه همیشه روی کفِ ثابت می‌افتد. «دومین بزرگ‌ترین»
  // هم دورهٔ واقعیِ بین دسته‌ها را می‌گیرد و هم یک قطعیِ استثنایی را نادیده می‌گیرد.
  if (dayKeys.length >= 3) {
    var dg = [];
    for (var g = 1; g < dayKeys.length; g++) dg.push(dayKeys[g] - dayKeys[g - 1]);
    dg.sort(function (a, b) { return b - a; });
    res.quietGapDays = dg.length >= 2 ? dg[1] : dg[0];
  } else if (dayKeys.length === 2) {
    res.quietGapDays = dayKeys[1] - dayKeys[0];
  }

  // ظرفیتِ کار: میانهٔ ردیف‌در‌روزِ هفتهٔ اخیر در برابر دورهٔ پیش از آن.
  // میانه لازم است چون یک واردات دسته‌ایِ دویست‌وپنجاه‌تایی در گذشته، میانگین
  // را چند برابر می‌کرد و یک تبِ کاملاً سالم «کم‌کار» اعلام می‌شد.
  var cutDay = Math.floor((now - 7 * 86400000) / 86400000);
  if (span >= 10) {
    var priorCounts = [], recentCounts = [];
    for (var d = 0; d < dayKeys.length; d++) {
      if (dayKeys[d] < cutDay) priorCounts.push(perDay[dayKeys[d]]);
    }
    // روزهای بی‌ردیفِ هفتهٔ اخیر هم باید شمرده شوند، وگرنه یک روزِ فعال در
    // هفته، نرخ را کامل نشان می‌داد
    var todayKey = Math.floor(now / 86400000);
    for (var dd = cutDay; dd <= todayKey; dd++) recentCounts.push(perDay[dd] || 0);
    if (priorCounts.length >= 3) {
      res.priorPerDay = medianOf_(priorCounts);
      res.recentPerDay = medianOf_(recentCounts);
    }
  }

  // داوری بر پایهٔ رفتار خودِ همین تب — نه یک آستانهٔ ثابت برای همه
  if (res.orderSuspect) { res.verdict = 'نامعلوم'; res.reason = 'ترتیب ردیف‌ها نزولی است'; return res; }

  var gap = res.quietGapDays;
  // سنجهٔ «افت ظرفیت» پنجرهٔ هفت‌روزه دارد، پس فقط برای تبی معنا می‌دهد که
  // معمولاً هر چند روز یک‌بار ردیف می‌گیرد. برای تبی که هفته‌ای یک‌بار دسته‌ای
  // کار می‌کند، «صفر ردیف در هفت روز اخیر» حالتِ عادیِ اوست، نه افت.
  var rateApplies = (gap === null || gap <= 3);
  var slowByRate = rateApplies && res.priorPerDay !== undefined && res.priorPerDay >= 1 &&
                   res.recentPerDay < res.priorPerDay * (CFG.PULSE_SLOW_RATIO || 0.25);
  if (gap === null || span < 3) {
    // رفتارِ تب هنوز شناخته نیست (همه‌چیز در یکی دو روز آمده): محتاط باش
    res.stallAtDays = CFG.PULSE_UNKNOWN_STALL_DAYS;
    if (res.daysSinceLast >= CFG.PULSE_UNKNOWN_STALL_DAYS) { res.verdict = 'راکد'; res.reason = 'وقفه'; }
    else if (slowByRate) { res.verdict = 'کم‌کار'; res.reason = 'افت ظرفیت'; }
    else res.verdict = 'فعال';
  } else {
    var stallAt = Math.min(CFG.PULSE_MAX_STALL_DAYS,
                           Math.max(CFG.PULSE_MIN_STALL_DAYS, gap * CFG.PULSE_STALL_FACTOR));
    var slowAt = Math.max(CFG.PULSE_MIN_SLOW_DAYS, gap * CFG.PULSE_SLOW_FACTOR);
    res.stallAtDays = Math.round(stallAt * 10) / 10;
    if (res.daysSinceLast >= stallAt) { res.verdict = 'راکد'; res.reason = 'وقفه'; }
    else if (res.daysSinceLast >= slowAt) { res.verdict = 'کم‌کار'; res.reason = 'وقفه'; }
    else if (slowByRate) { res.verdict = 'کم‌کار'; res.reason = 'افت ظرفیت'; }
    else res.verdict = 'فعال';
  }
  return res;
}

function medianOf_(a) {
  if (!a.length) return 0;
  var s = a.slice().sort(function (x, y) { return x - y; });
  var m = Math.floor(s.length / 2);
  var v = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  return Math.round(v * 100) / 100;
}

/**
 * نبضِ همهٔ تب‌های محتوایی هر پنج منبع، به‌علاوهٔ پیشرفت خواندن.
 * یک بار در هر «وارسی سلامت» و در پایان همگام‌سازیِ کامل صدا زده می‌شود.
 */
/**
 * تب‌های جانبی هر منبع (تاریخچهٔ نمودار، کد، آزمون، …) هر بار سه فراخوانی
 * می‌گرفتند تا دوباره «جانبی» شناخته شوند — هجده تب × سه = پنجاه‌وچهار
 * فراخوانیِ هدررفته در هر وارسی. نامشان یک هفته کَش می‌شود.
 */
function skipTabCache_(srcKey) {
  var raw = props_().getProperty('SKIPTABS_' + srcKey);
  if (!raw) return null;
  try {
    var o = JSON.parse(raw);
    if (!o || !o.at) return null;
    if (new Date().getTime() - o.at > 7 * 86400000) return null;
    return o.names || [];
  } catch (e) { return null; }
}
function saveSkipTabs_(srcKey, names) {
  try {
    props_().setProperty('SKIPTABS_' + srcKey,
      JSON.stringify({ at: new Date().getTime(), names: names }));
  } catch (e) {}
}

function sourceFeedReport_() {
  var feeds = [], worst = 0;
  for (var s = 0; s < CFG.SOURCES.length; s++) {
    var src = CFG.SOURCES[s];
    var ss;
    try { ss = SpreadsheetApp.openById(src.id); }
    catch (e) { feeds.push({ source: src.title, tab: '—', error: e.message, verdict: 'خوانده نشد' }); continue; }

    var legacy = (src.schema === 'legacy-video' || src.schema === 'legacy-photo');
    var tabs = legacy ? [ss.getSheets()[0]] : ss.getSheets();
    var shown = 0;
    var cachedSkip = legacy ? null : skipTabCache_(src.key);
    var freshSkip = [];

    for (var t = 0; t < tabs.length; t++) {
      // هر تب try خودش را دارد. بی این، یک تبِ خراب باعث می‌شد کلِ بخشِ نبض
      // — برای هر پنج منبع — خالی برگردد و همهٔ تشخیص رکود بی‌صدا خاموش شود.
      try {
        var sh = tabs[t];
        // تبی که هفتهٔ پیش «جانبی» شناخته شده، بی هیچ فراخوانی رد می‌شود
        if (cachedSkip && cachedSkip.indexOf(sh.getName()) !== -1) { freshSkip.push(sh.getName()); continue; }
        var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
        if (lastRow < 2 || lastCol < 2) continue;
        var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
        var kind = '', dateCol = -1;
        if (legacy) {
          kind = (src.schema === 'legacy-video') ? K_VIDEO : K_PHOTO;
          dateCol = findCol_(headers, 'تاریخ پردازش', 0);
        } else {
          var det = srcDetect_(headers);
          if (!det) { freshSkip.push(sh.getName()); continue; }   // تب جانبی
          kind = det.kind;
          dateCol = srcMap_(headers).date;
        }
        var p = sourcePulse_(sh, dateCol, lastRow);
        var cur = parseInt(props_().getProperty(srcCursorKey_(src.key, sh.getName())) || '0', 10);
        p.source = src.title; p.tab = sh.getName(); p.kind = kind;
        p.cursor = Math.max(0, cur - 1);
        p.behind = Math.max(0, (lastRow - 1) - p.cursor);
        feeds.push(p);
        shown++;
        if (p.verdict === 'راکد') worst = Math.max(worst, 2);
        else if (p.verdict === 'کم‌کار') worst = Math.max(worst, 1);
      } catch (eTab) {
        feeds.push({ source: src.title, tab: tabs[t].getName(), error: eTab.message,
                     verdict: 'خوانده نشد' });
        shown++;
      }
    }
    if (!legacy) saveSkipTabs_(src.key, freshSkip);
    if (!shown) feeds.push({ source: src.title, tab: '—', rows: 0, verdict: 'خالی' });
  }
  return { feeds: feeds, worst: worst };
}

/** تب خوانا برای خودِ شما — همان چیزی که در JSON هم می‌رود. */
var PULSE_HEADERS = ['منبع', 'تب', 'نوع', 'ردیف‌ها', 'خوانده‌شده', 'عقب‌ماندگی',
                     'آخرین ردیف', 'روز از آخرین', 'سکوت معمول (روز)', 'آستانهٔ رکود (روز)',
                     'ردیف در روزِ فعال', '۷ روز اخیر', '۳۰ روز اخیر', 'وضعیت', 'علت'];

function writePulseTab_(hub, report) {
  var sh = ensureTab_(hub, CFG.PULSE_TAB, PULSE_HEADERS);
  var out = [];
  for (var i = 0; i < report.feeds.length; i++) {
    var f = report.feeds[i];
    var num = function (x) { return (x === null || x === undefined) ? '' : x; };
    out.push([f.source, f.tab, f.kind || '—', num(f.rows), num(f.cursor), num(f.behind),
              f.lastAt || (f.error ? f.error.slice(0, 60) : ''),
              num(f.daysSinceLast), num(f.quietGapDays), num(f.stallAtDays),
              num(f.perActiveDay),
              f.last7 === undefined ? '' : (f.capped ? '≥' + f.last7 : f.last7),
              f.last30 === undefined ? '' : (f.capped ? '≥' + f.last30 : f.last30),
              f.verdict || '', f.reason || '']);
  }
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, PULSE_HEADERS.length).clearContent();
  }
  if (out.length) {
    var need = (out.length + 4) - sh.getMaxRows();
    if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
    sh.getRange(2, 1, out.length, PULSE_HEADERS.length).setValues(out);
  }
  // جای مُهرِ زمانی هم باید در محدودهٔ رزروشده باشد، وگرنه روی تبِ کوچک
  // getRange خطا می‌دهد و کلِ بخشِ نبض از فایل وضعیت حذف می‌شود.
  var stampRow = out.length + 3;
  if (stampRow > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), stampRow - sh.getMaxRows());
  sh.getRange(stampRow, 1).setValue('آخرین بررسی: ' + nowStr_());
  return sh;
}

/** «۳ روز» / «۱۱ ساعت» — تا برای تب‌های پرترافیک، عددِ اعشاری نوشته نشود. */
function daysWords_(d) {
  if (d === null || d === undefined) return 'مدتی';
  if (d < 1) return Math.max(1, Math.round(d * 24)) + ' ساعت';
  return Math.round(d) + ' روز';
}

/**
 * ریتمِ معمولِ همان تب، به زبان آدمیزاد.
 * عمداً «روزی چند ردیف» را از روی روزهای فعال می‌گوید نه کل بازه: این خط‌های
 * لوله دسته‌ای کار می‌کنند و «میانگین روی کل بازه» عددی می‌ساخت که هیچ روزی
 * واقعاً رخ نداده بود.
 */
function paceWords_(f) {
  var bits = [];
  if (f.quietGapDays !== null && f.quietGapDays !== undefined) {
    if (f.quietGapDays >= 1) bits.push('معمولاً بیش از ' + Math.round(f.quietGapDays) + ' روز ساکت نمی‌ماند');
    else bits.push('معمولاً هر روز ردیف می‌گرفت');
  }
  if (f.perActiveDay && f.activeDays) {
    bits.push('در روزهایی که کار می‌کرد، حدود ' + Math.round(f.perActiveDay) + ' ردیف در روز');
  }
  return bits.join(' و ');
}

/**
 * ایرادهای سمتِ منبع، به زبان آدمیزاد — برای ایمیل هشدار و برای گزارش Cowork.
 */
function sourceProblems_(hub, report, errs) {
  var problems = [], notes = [];

  for (var i = 0; i < report.feeds.length; i++) {
    var f = report.feeds[i];
    if (f.error) {
      problems.push('منبع «' + f.source + '» اصلاً خوانده نشد: ' + f.error);
      continue;
    }
    if (f.verdict === 'راکد' || f.verdict === 'کم‌کار') {
      var line;
      if (f.reason === 'افت ظرفیت') {
        line = '«' + f.source + ' › ' + f.tab + '» کم‌کار شده: در هفتهٔ اخیر روزی حدود ' +
          f.recentPerDay + ' ردیف گرفته، در حالی که پیش‌تر روزی حدود ' + f.priorPerDay +
          ' ردیف می‌گرفت. (هنوز ردیف می‌آید، ولی خیلی کمتر.)';
      } else {
        var rhythm = paceWords_(f);
        line = '«' + f.source + ' › ' + f.tab + '» ' +
          (f.verdict === 'راکد' ? 'راکد به نظر می‌رسد' : 'کم‌کار شده') + ': ' +
          daysWords_(f.daysSinceLast) + ' است ردیف تازه‌ای نیامده' +
          (rhythm ? '، در حالی که ' + rhythm : '') + '. (آخرین ردیف: ' + (f.lastAt || '—') + ')';
      }
      /* شیت‌های منبع سامانه‌های *دیگرِ* صاحبِ برنامه‌اند؛ موتور فقط می‌خوانَدشان
         و هیچ کاری از دستش برنمی‌آید. پس اگر یکی راکد شد، خبرش کارِ اوست —
         و صریح علامت می‌خورد تا در فهرستِ «در دستِ موتور» گم نشود. */
      if (f.verdict === 'راکد') problems.push(HY_ + line); else notes.push(line);
    }
    if (f.behind > CFG.ALERT_SYNC_BEHIND) {
      problems.push('خواندن «' + f.source + ' › ' + f.tab + '» ' + f.behind + ' ردیف عقب است.');
    }
  }

  if (errs && errs.last24h) {
    var top = '', best = 0;
    for (var k in errs.byType) if (errs.byType.hasOwnProperty(k) && errs.byType[k] > best) {
      best = errs.byType[k]; top = k;
    }
    problems.push('در شیت‌های منبع ' + errs.last24h + ' ردیفِ خطادار تازه ثبت شده' +
      (top ? ' (بیشترین: «' + top + '»)' : '') + '. تب «' + CFG.SRC_ERR_TAB + '» فهرست کامل را دارد.');
    if (errs.recent && errs.recent.length) {
      var r = errs.recent[errs.recent.length - 1];
      problems.push('نمونهٔ تازه‌ترین خطا — ' + r.source + ' › ' + r.tab + '، ردیف ' + r.row +
                    ': ' + r.text.slice(0, 160));
    }
  } else if (errs && errs.last7d) {
    notes.push('در هفت روز گذشته ' + errs.last7d + ' ردیفِ خطادار در شیت‌های منبع دیده شد ' +
               '(هیچ‌کدام در ۲۴ ساعت اخیر).');
  }
  return { problems: problems, notes: notes };
}

/** اجرای دستی از منو — همین حالا منابع را وارسی کن. */
function checkSources() {
  var hub = getHub_();
  var report = sourceFeedReport_();
  writePulseTab_(hub, report);
  var errs = srcErrorSummary_(hub, 10);
  var p = sourceProblems_(hub, report, errs);

  var lines = [];
  for (var i = 0; i < report.feeds.length; i++) {
    var f = report.feeds[i];
    if (f.error) { lines.push('• ' + f.source + ' › خطا: ' + f.error); continue; }
    lines.push('• ' + f.source + ' › ' + f.tab + ' — ' + f.rows + ' ردیف، آخری ' +
               (f.lastAt || '—') + ' (' + f.verdict + ')');
  }
  var msg = (p.problems.length ? '⚠️ ' + p.problems.length + ' ایراد:\n• ' + p.problems.join('\n• ') + '\n\n'
                               : '✅ منابع سالم‌اند.\n\n') +
            lines.join('\n') +
            '\n\nخطاهای ثبت‌شده — کل: ' + errs.total + ' · ۲۴ ساعت اخیر: ' + errs.last24h;
  var ui = ui_(); if (ui) ui.alert('وارسی منابع', msg, ui.ButtonSet.OK); else console.log(msg);
  return { report: report, errors: errs, problems: p.problems };
}
