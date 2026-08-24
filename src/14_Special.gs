/**
 * 14_Special.gs — «درس‌نامه»: پادکست تخصصیِ مجموعه‌های آموزشی
 *
 * تفاوت بنیادی با برنامهٔ «از همه جا از همه رنگ»:
 *   • آن‌جا امتیازِ کیفیت تعیین می‌کرد چه چیزی به آنتن برسد. این‌جا امتیاز
 *     بی‌معناست: هر چیزی که جزوِ یک مجموعهٔ آموزشی است باید پوشش داده شود.
 *   • آن‌جا از هر فایل یک خلاصه ساخته می‌شد. این‌جا متنِ خودِ قطعه‌ها خوانده
 *     می‌شود — نه ردیفِ جمع‌بندیِ پایانی — تا چیزی هرز نرود.
 *   • آن‌جا آیتمِ استفاده‌شده کنار می‌رفت. این‌جا نشانِ برنامهٔ دیگر هیچ اثری
 *     ندارد؛ نشانه‌گذاریِ درس‌نامه ستونِ جداگانهٔ خودش را دارد.
 *   • تا یک مجموعه تمام نشود، سراغ مجموعهٔ بعدی نمی‌رویم.
 */

// ------------------------------------------------------- خواندنِ متنِ قطعه‌ها

/**
 * ستون‌هایی که متنِ واقعیِ درس در آن‌هاست.
 *
 * برخلافِ نگاشتِ برنامهٔ متنوع، این‌جا «اولین ستونِ موجود» کافی نیست: هر ستونی
 * که چیزی در آن باشد باید خوانده شود. تبِ ترید مثلاً ستون Professional_Insights
 * را دارد ولی خالی می‌گذارد و نکته‌ها را در Concepts_Definitions می‌نویسد؛ با
 * منطقِ «اولین تطبیق»، همهٔ اصطلاح‌ها و تعریف‌های درس دور ریخته می‌شد.
 */
/**
 * سقفِ نویسهٔ «درس‌نامه» — از هدفِ خودش حساب می‌شود، نه از سقفِ یک فایل.
 *
 * اگر SPECIAL_ONE_FILE روشن شود، سقفِ واقعی هرکدام که کمتر است می‌شود؛ یعنی
 * روشن‌کردنِ آن کلید خودبه‌خود درس را هم کوتاه‌تر می‌کند، نه اینکه فقط علامت
 * بزند و متن همان بماند.
 */
function specialMaxChars_() {
  var byTarget = Math.round((Number(CFG.SPECIAL_TARGET_MINUTES) || 15) * 150 * 5.5 * 1.1);
  if (CFG.SPECIAL_ONE_FILE === true) return Math.min(byTarget, oneFileMaxChars_());
  return byTarget;
}

/**
 * هدفِ *مؤثرِ* طولِ درس‌نامه، به دقیقه.
 *
 * ══ باگی که این را لازم کرد (۲۳ اوت) ══
 * SPECIAL_ONE_FILE روشن بود، ولی فقط specialMaxChars_ از آن خبر داشت. پنج
 * جای دیگر هنوز «۱۵ دقیقه» می‌گفتند — و بدتر از همه، خودِ پرامپت هر دو را
 * پشتِ سرِ هم می‌گفت:
 *     «طولِ مجموع باید حدود ۲۲۵۰ واژه باشد (۱۵ دقیقه گفتار).»   ≈ ۱۲۳۷۵ نویسه
 *     «سقفِ سخت: از ۹۱۲۵ نویسه بیشتر نشود.»
 * یعنی پرامپت ۳۶٪ بلندتر از سقفِ خودش را می‌خواست. مدل وسطِ این دو نشست
 * (۱۱۰۵۶ نویسه ≈ ۱۳:۲۷) و قسمت ناگزیر دو فایل شد — هر روز، بی استثنا. حتی
 * دستورِ بازبینیِ «کوتاه ننویس» هم همان ۱۵ دقیقه را دوباره به مدل می‌گفت، و
 * وارسیِ سلامت هم چون با ۱۵ می‌سنجید اصلاً اعتراض نمی‌کرد.
 *
 * حالا همهٔ آن شش جا از همین یک تابع می‌خوانند. «یک فایل» یعنی درسِ کوتاه‌تر —
 * این را CFG هم از اول نوشته بود؛ چیزی که نبود، اعمالش در همه‌جا بود.
 */
function specialTargetMin_() {
  var base = Number(CFG.SPECIAL_TARGET_MINUTES) || 15;
  if (CFG.SPECIAL_ONE_FILE !== true) return base;
  var cps = Number(CFG.SPEECH_CHARS_PER_SEC) || 13.7;
  var oneFileMin = specialMaxChars_() / cps / 60;
  return Math.max(1, Math.round(Math.min(base, oneFileMin) * 10) / 10);
}

function colsAll_(headers, names) {
  var out = [], seen = {};
  for (var i = 0; i < names.length; i++) {
    for (var j = 0; j < headers.length; j++) {
      if (normHeader_(headers[j]) === normHeader_(names[i]) && !seen[j]) { seen[j] = true; out.push(j); }
    }
  }
  return out;
}

function chunkTextCols_(headers) {
  var m = srcMap_(headers);
  return {
    // متنِ خامِ گفتار یا نوشتار — قلبِ درس
    body: colsAll_(headers, ['Farsi_Transcription', 'متن پیاده‌سازی شده',
                             'Full_Transcription', 'متن کامل پیاده‌سازی شده',
                             'Full_Text_Extraction', 'Farsi_Translation', 'ترجمه فارسی',
                             'Text_Extraction', 'استخراج متن']),
    // نکته‌ها، مفهوم‌ها، اصطلاح‌ها — هر کدام که پر باشد
    points: colsAll_(headers, ['Key_Points', 'نکات کلیدی', 'Key_Insights', 'Core_Ideas',
                               'Concepts_Definitions', 'Terminology', 'Professional_Insights',
                               'Advanced_Insights', 'Educational_Analysis', 'Trading_Strategies',
                               'Indicators_Tools', 'Chart_Patterns', 'Money_Management',
                               'Trading_Psychology', 'Practical_Elements', 'Examples_Cases',
                               'Methodology', 'Claims_Made', 'Arguments_Positions',
                               'Formulas_Code', 'Formulas_Equations', 'Tables_Data',
                               'نکات حرفه‌ای', 'تحلیل تخصصی']),
    // تحلیلِ ساخت‌یافته
    content: colsAll_(headers, ['Content_Analysis', 'تحلیل محتوا', 'Main_Subject',
                                'Content_Structure', 'Chart_Analysis']),
    takeaway: colsAll_(headers, ['Audience_Takeaway', 'Real_World_Anchoring',
                                 'Operationalizable_Elements', 'Educational_Metadata',
                                 'Education_Meta']),
    // خلاصه فقط وقتی به کار می‌آید که هیچ متنِ خامی نباشد
    summary: colsAll_(headers, ['Executive_Summary', 'خلاصه اجرایی', 'Content_Summary',
                                'خلاصه محتوا', 'General_Executive_Summary']),
    chunkNo: m.chunkNo,
    range: findAny_(headers, ['Chunk_Time_Range', 'Chunk_Range', 'Chunk_Page_Range', 'بازه زمانی']),
    status: m.status
  };
}

/**
 * متنِ یک قطعه. ترتیب مهم است: اول متنِ خامِ گفتار/نوشتار، بعد نکته‌ها و
 * مفهوم‌ها. خلاصهٔ اجرایی فقط وقتی می‌آید که متنِ خامی نباشد — چون قرار نیست
 * پادکست از روی خلاصه ساخته شود.
 */
function chunkTextOf_(row, c, lo) {
  var grab = function (idxs, cap, label) {
    var bits = [], seen = {};
    for (var i = 0; i < idxs.length; i++) {
      var k = idxs[i] - lo;
      if (k < 0 || k >= row.length) continue;
      var t = flatText_(row[idxs[i] - lo], cap || 0);
      if (!t || seen[t]) continue;
      seen[t] = true;
      bits.push(t);
    }
    if (!bits.length) return '';
    return (label ? label + ': ' : '') + bits.join(' · ');
  };

  var parts = [];
  var body = grab(c.body, 12000, '');
  if (body) parts.push(body);
  var pts = grab(c.points, 1800, 'نکته‌ها و مفهوم‌های همین قطعه');
  if (pts) parts.push(pts);
  var cont = grab(c.content, 1500, 'تحلیل');
  if (cont) parts.push(cont);
  var tk = grab(c.takeaway, 900, 'آنچه مخاطب باید ببرد');
  if (tk) parts.push(tk);
  if (!parts.length) {
    var sm = grab(c.summary, 1500, '');
    if (sm) parts.push(sm);
  }
  return parts.join('\n');
}

/**
 * مکان‌نمای «مصرف‌شده تا قطعه» می‌تواند کسری باشد: عددِ صحیح یعنی قطعه‌های
 * تمام‌شده، و دو رقمِ اعشار یعنی چند «برش» از قطعهٔ بعدی مصرف شده. مثلاً
 * ۱۳٫۰۳ یعنی قطعه‌های ۱ تا ۱۳ کامل، به‌علاوهٔ سه برشِ اولِ قطعهٔ ۱۴.
 */
function spCursor_(v) {
  var x = Number(v) || 0;
  if (x <= 0) return { no: 1, slice: 1 };
  var whole = Math.floor(x + 1e-9);
  var frac = Math.round((x - whole) * 100);
  if (frac <= 0) return { no: whole + 1, slice: 1 };
  return { no: whole + 1, slice: frac + 1 };
}

/** ساختِ همان مکان‌نما از «آخرین قطعه/برشِ مصرف‌شده». */
function spCursorOf_(no, slice, slices) {
  if (!no) return 0;
  if (!slices || slice >= slices) return no;          // این قطعه کامل شد
  return (no - 1) + (slice / 100);
}

/**
 * قطعهٔ بلند را به برش‌های قابل‌هضم می‌شکند، روی مرزِ بند و بعد جمله.
 * هیچ نویسه‌ای دور ریخته نمی‌شود.
 */
function sliceChunkText_(text, cap) {
  var t = String(text || '');
  if (t.length <= cap) return [t];
  var out = [], cur = '';
  var paras = t.split(/\n+/);
  for (var i = 0; i < paras.length; i++) {
    var pp = paras[i];
    while (pp.length > cap) {
      // بندِ غول‌پیکر: روی نزدیک‌ترین نقطهٔ پایانِ جمله پیش از سقف می‌بریم
      var cut = pp.lastIndexOf('. ', cap);
      if (cut < cap * 0.5) cut = pp.lastIndexOf('،', cap);
      if (cut < cap * 0.5) cut = cap;
      else cut += 1;
      if (cur) { out.push(cur); cur = ''; }
      out.push(pp.slice(0, cut));
      pp = pp.slice(cut);
    }
    if ((cur + '\n' + pp).length > cap && cur) { out.push(cur); cur = pp; }
    else cur = cur ? (cur + '\n' + pp) : pp;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * قطعه‌های یک «قسمت» را از شمارهٔ مشخصی به بعد می‌خواند، تا سقفِ بودجهٔ متن.
 * خروجی: { chunks:[{no, range, text}], fromNo, toNo, more, chars }
 *
 * ردیف‌های قطعه در شیت پراکنده‌اند، پس از فهرستِ ردیف‌های ثبت‌شده در رجیستری
 * استفاده می‌کنیم و ردیف‌ها را تک‌تک با شمارهٔ خودشان می‌خوانیم — نه یک بازهٔ
 * پیوسته که ردیف فایل‌های دیگر را هم بیاورد.
 */
var __hdrCache = null;

function readPartChunks_(partRec, fromNo, budget, fromSlice, minCharsOpt) {
  fromSlice = fromSlice || 1;
  // کفِ طولِ متن. تولید کفِ چهل نویسه دارد (ردیفِ جمع‌بندی و متنِ نشانگر نباید
  // واردِ قسمت شود)، ولی داوری کفِ پایین‌تری می‌خواهد: مجموعه‌ای که همهٔ
  // قطعه‌هایش کوتاه‌اند باید داوری شود، نه اینکه «بی‌متن» شمرده شود و از راهِ
  // «مشکوک» واردِ نوبتِ درس‌نامه گردد.
  var minChars = Number(minCharsOpt) > 0 ? Number(minCharsOpt) : 40;
  var out = { chunks: [], fromNo: fromNo, toNo: fromNo - 1, more: false, chars: 0,
              toSlice: 0, toSlices: 0,
              total: Number(partRec.vals[SP.CHUNKS - 1]) || 0 };
  var srcTitle = String(partRec.vals[SP.SRC - 1] || '');
  var tabName = String(partRec.vals[SP.TAB - 1] || '');
  var src = null;
  for (var i = 0; i < CFG.SOURCES.length; i++) {
    if (CFG.SOURCES[i].title === srcTitle) { src = CFG.SOURCES[i]; break; }
  }
  if (!src) { out.error = 'منبع «' + srcTitle + '» پیدا نشد.'; return out; }

  var sh;
  try {
    // بازکردنِ یک شیتِ سی‌هزار‌ردیفی چند ثانیه طول می‌کشد. در یک دورِ داوری
    // پانزده بار همین کار تکرار می‌شد؛ با یک حافظهٔ کوچک در سطحِ اجرا، فقط
    // یک بار انجام می‌شود.
    var ss = openCached_(src.id);
    sh = ss.getSheetByName(tabName.split(' + ')[0]);
  } catch (e) { out.error = 'شیت باز نشد: ' + e.message; return out; }
  if (!sh) { out.error = 'تب «' + tabName + '» پیدا نشد.'; return out; }

  // سرستون‌ها و نگاشتِ ستون‌ها برای هر (شیت، تب) یک بار خوانده می‌شود.
  // بی این حافظه، یک دورِ داوریِ ۲۶۳ مجموعه‌ای نیمی از هزارویک فراخوانش را
  // خرجِ خواندنِ دوبارهٔ همان یک ردیفِ سرستون می‌کرد.
  var hk = String(src.id) + '\u0000' + String(tabName);
  if (!__hdrCache) __hdrCache = Object.create(null);
  var hit = Object.prototype.hasOwnProperty.call(__hdrCache, hk) ? __hdrCache[hk] : null;
  var width, c;
  if (hit) { width = hit.width; c = hit.cols; }
  else {
    width = Math.min(sh.getLastColumn(), 80);
    var headers = sh.getRange(1, 1, 1, width).getValues()[0];
    c = chunkTextCols_(headers);
    __hdrCache[hk] = { width: width, cols: c };
  }

  var rowNums = unpackRows_(String(partRec.vals[SP.ROWS - 1] || ''));
  if (!rowNums.length) { out.error = 'ردیفی برای این قسمت ثبت نشده.'; return out; }

  // یک خواندنِ پیوسته از کمترین تا بیشترین ردیف، بعد فقط ردیف‌های خودمان را
  // برمی‌داریم. این از صدها فراخوانیِ تک‌ردیفی خیلی سریع‌تر است.
  var minR = Math.min.apply(null, rowNums), maxR = Math.max.apply(null, rowNums);
  var span = maxR - minR + 1;
  if (span > 4000) span = 4000;
  var block = sh.getRange(minR, 1, span, width).getValues();
  var lo = 0;

  var idx = {};
  for (var r = 0; r < rowNums.length; r++) idx[rowNums[r]] = true;

  // شمارهٔ قطعه را از خودِ ردیف می‌خوانیم، نه از ترتیبِ فهرست — چون ممکن است
  // ردیف‌ها در شیت به‌هم‌ریخته باشند.
  var got = [];
  for (var b = 0; b < block.length; b++) {
    var rowNo = minR + b;
    if (!idx[rowNo]) continue;
    var no = parseInt(faDigits_(String(c.chunkNo >= 0 ? block[b][c.chunkNo] : '')), 10);
    if (!isFinite(no) || no <= 0) no = got.length + 1;
    got.push({ no: no, row: rowNo, raw: block[b] });
  }
  got.sort(function (x, y) { return x.no - y.no || x.row - y.row; });

  var hardCap = Math.round(budget * (CFG.SPECIAL_BUDGET_SLACK || 1.15));
  var stop = false;
  for (var g = 0; g < got.length && !stop; g++) {
    if (got[g].no < fromNo) continue;
    var text = chunkTextOf_(got[g].raw, c, lo);
    // ردیفِ جمع‌بندیِ پایانی («ترکیب از همه قطعات») متنِ درس نیست و عمداً
    // کنار گذاشته می‌شود: خواستهٔ صریح این بود که پادکست از دلِ خودِ قطعه‌ها
    // ساخته شود، نه از روی خلاصهٔ آخر.
    if (!text || text.length < minChars) continue;
    // صافیِ «ردیفِ نشانگر» هم کفِ هشتاد نویسه دارد؛ وقتی فراخوانَنده عمداً کفِ
    // پایین‌تری خواسته، فقط الگوهای نشانگر را می‌سنجیم نه طول را.
    if (minChars >= 40 && isStubRollup_({ body: text, summary: '', keyMessage: '' })) continue;
    if (minChars < 40 && STUB_PAT.test(text)) continue;

    var slices = sliceChunkText_(text, CFG.SPECIAL_CHUNK_CHARS || 14000);
    var startSlice = (got[g].no === fromNo) ? fromSlice : 1;
    if (startSlice > slices.length) continue;          // این قطعه قبلاً تمام شده
    var rng = c.range >= 0 ? String(got[g].raw[c.range] || '') : '';

    for (var si = startSlice; si <= slices.length; si++) {
      var piece = slices[si - 1];
      var haveMin = out.chunks.length >= CFG.SPECIAL_MIN_CHUNKS;
      // سقفِ سخت بر کفِ حداقلِ قطعه مقدم است، وگرنه سه قطعهٔ غول‌پیکر یک
      // پرامپتِ صدوشصت‌هزار نویسه‌ای می‌ساختند و پاسخِ مدل بریده برمی‌گشت.
      if (out.chunks.length && (out.chars + piece.length > hardCap ||
          (out.chars + piece.length > budget && haveMin) ||
          out.chunks.length >= CFG.SPECIAL_MAX_CHUNKS)) {
        out.more = true; stop = true; break;
      }
      out.chunks.push({ no: got[g].no, slice: si, slices: slices.length,
                        range: rng, text: piece, row: got[g].row });
      out.chars += piece.length;
      out.toNo = got[g].no; out.toSlice = si; out.toSlices = slices.length;
    }
  }
  if (!out.more) {
    if (out.toSlices && out.toSlice < out.toSlices) out.more = true;
    else for (var h = 0; h < got.length; h++) if (got[h].no > out.toNo) { out.more = true; break; }
  }
  return out;
}

// --------------------------------------------------- تعمیق از سایر شیت‌ها

/** واژه‌های کلیدیِ یک متن برای جست‌وجوی مکمل. */
function keyTerms_(text, n) {
  var t = txNorm(String(text || '')).replace(/[^؀-ۿa-z0-9 ]/g, ' ');
  var stop = { 'که': 1, 'این': 1, 'برای': 1, 'است': 1, 'های': 1, 'یک': 1, 'هست': 1,
               'هم': 1, 'ولی': 1, 'اما': 1, 'شما': 1, 'خود': 1, 'کنید': 1, 'میشه': 1,
               'میکنه': 1, 'باید': 1, 'وقتی': 1, 'چون': 1, 'اگر': 1, 'روی': 1, 'اون': 1,
               'اینجا': 1, 'دیگه': 1, 'خیلی': 1, 'الان': 1, 'قسمت': 1, 'دوره': 1 };
  var freq = Object.create(null);
  var w = t.split(/\s+/);
  for (var i = 0; i < w.length; i++) {
    var x = w[i];
    if (x.length < 4 || stop[x]) continue;
    freq[x] = (freq[x] || 0) + 1;
  }
  var arr = [];
  for (var k in freq) if (Object.prototype.hasOwnProperty.call(freq, k)) arr.push([k, freq[k]]);
  arr.sort(function (a, b) { return b[1] - a[1]; });
  return arr.slice(0, n || 18).map(function (p) { return p[0]; });
}

/**
 * جست‌وجوی مکمل در همهٔ تب‌های دسته — نه فقط ردیف‌های آخر.
 * نشانِ «استفاده در قسمت» (برنامهٔ متنوع) این‌جا هیچ اثری ندارد؛ خواستهٔ صریح
 * همین بود. نشانِ درس‌نامه هم مانع نیست: استفادهٔ دوباره برای پیوند دادن مجاز است،
 * ولی آیتمی که تازه است ترجیح داده می‌شود تا تکرار نشود.
 */
function enrichFor_(hub, terms, excludeFileIds, want) {
  var need = {}, i;
  for (i = 0; i < terms.length; i++) need[terms[i]] = true;
  var skip = Object.create(null);
  for (i = 0; i < (excludeFileIds || []).length; i++) skip[String(excludeFileIds[i])] = true;

  // نقشهٔ «کدام فایل جزوِ کدام مجموعهٔ آموزشی است». لازم است تا در متن بتوان
  // گفت این مکمل از کدام دوره آمده — خواستهٔ صریحِ بند شانزدهم.
  var ofSeries = Object.create(null);
  try {
    var pAll = readSeriesParts_(hub), rAll = readSeriesReg_(hub);
    for (var q = 0; q < pAll.rows.length; q++) {
      var k = String(pAll.rows[q].vals[SP.KEY - 1]);
      var rr = rAll.byKey[k];
      ofSeries[String(pAll.rows[q].vals[SP.FILE - 1])] =
        rr ? String(rr.vals[SC.NAME - 1] || k) : k;
    }
  } catch (eOs) {}

  var hits = [];
  var cats = TAXONOMY.map(function (t) { return t.title; }).concat([MISC_TITLE]);
  for (var ci = 0; ci < cats.length; ci++) {
    var sh = hub.getSheetByName(cats[ci]);
    if (!sh || sh.getLastRow() < 2) continue;
    var last = sh.getLastRow();
    var vals;
    try { vals = sh.getRange(2, 1, last - 1, HUB_HEADERS.length).getValues(); }
    catch (e) { continue; }
    for (var r = 0; r < vals.length; r++) {
      var v = vals[r];
      var fid = String(v[COL.ID - 1] || '');
      if (!fid || skip[fid]) continue;
      var hay = txNorm([v[COL.TOPIC - 1], v[COL.MSG - 1], v[COL.SUMMARY - 1],
                        v[COL.BODY - 1], v[COL.SUB - 1]].join(' '))
                  .replace(/[^؀-ۿa-z0-9 ]/g, ' ');
      var score = 0;
      for (var t2 = 0; t2 < terms.length; t2++) {
        if (hay.indexOf(terms[t2]) !== -1) score++;
      }
      if (score < CFG.SPECIAL_ENRICH_MIN_SCORE) continue;
      var usedSp = String(v[COL.SP_EP - 1] || '');
      hits.push({
        id: fid, cat: cats[ci], row: r + 2, score: score,
        kind: String(v[COL.KIND - 1] || 'ویدیو'),
        topic: String(v[COL.TOPIC - 1] || ''), msg: String(v[COL.MSG - 1] || ''),
        summary: String(v[COL.SUMMARY - 1] || ''), body: String(v[COL.BODY - 1] || ''),
        link: String(v[COL.LINK - 1] || ''), parts: String(v[COL.PARTS - 1] || ''),
        usedSpecial: usedSp,
        fromSeries: ofSeries[fid] || '',
        // آیتمی که قبلاً در درس‌نامه آمده کنار گذاشته نمی‌شود، فقط عقب‌تر می‌ایستد
        rank: score - (usedSp ? 1.5 : 0)
      });
    }
  }
  hits.sort(function (a, b) { return b.rank - a.rank; });
  var N = want || CFG.SPECIAL_ENRICH;
  // گذرِ اول: از هر فایل یک بار، با رعایتِ تنوعِ نوع
  var seen = {}, out = [], byKind = {}, cap = Math.ceil(N / 2);
  for (var h = 0; h < hits.length && out.length < N; h++) {
    var it = hits[h];
    if (seen[it.id]) continue;
    if ((byKind[it.kind] || 0) >= cap) continue;
    seen[it.id] = true;
    byKind[it.kind] = (byKind[it.kind] || 0) + 1;
    out.push(it);
  }
  // گذرِ دوم: اگر آرشیو یک‌نوع باشد (مثلاً همه‌اش ویدیو)، سهمیهٔ تنوع نباید
  // باعث شود نصفِ موادِ مکمل بی‌دلیل کنار بمانند.
  for (var h2 = 0; h2 < hits.length && out.length < N; h2++) {
    if (seen[hits[h2].id]) continue;
    seen[hits[h2].id] = true;
    out.push(hits[h2]);
  }
  return out;
}

/**
 * عبارت‌هایی که یعنی «این از خودِ درس نیست».
 * وارسیِ افشا روی همین‌ها تکیه می‌کند: مدل باید هر جا از موادِ مکمل استفاده
 * می‌کند، در همان بخش یکی از این‌ها را بگوید.
 */
var OUTSIDE_PAT = /(خارج از درس|در خودِ? درس نیامده|در این درس نیست|جزو درس نیست|بخشی از درس نیست|از یک منبع دیگر|از منبعی دیگر|از آرشیو|از دوره ?ی? دیگر|برای تکمیل|برای تعمیق|مدرس این را نگفته)/;

/**
 * «روخوانی» را می‌گیرد: چه سهمی از پنج‌گانه‌های واژگانیِ یک بخش، عیناً در
 * متنِ خامِ قطعه‌ها هم هست؟ نقل‌قولِ درست چند پنجره همپوشانی دارد؛ کپیِ
 * کلمه‌به‌کلمه، تقریباً همه را. سنجهٔ وفاداری این را نمی‌گرفت — آن‌جا فقط
 * «آیا این نقل‌قول در منبع هست؟» پرسیده می‌شود، و کپی همیشه هست.
 */
function verbatimRatio_(narration, sourceText) {
  var w = compactWords_(narration).split(' ').filter(Boolean);
  if (w.length < 40) return 0;
  var src = compactWords_(sourceText);
  var win = 5, total = 0, hit = 0;
  // نمونه‌برداری با گام، تا روی متنِ چندهزارواژه‌ای هم سریع بماند
  var step = Math.max(1, Math.floor((w.length - win) / 120));
  for (var i = 0; i + win <= w.length; i += step) {
    total++;
    if (src.indexOf(w.slice(i, i + win).join(' ')) !== -1) hit++;
  }
  return total ? hit / total : 0;
}

// ------------------------------------------------------------- پرامپت

var SPECIAL_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    hook: { type: 'string' },
    recap: { type: 'string' },
    goal: {
      type: 'object',
      properties: {
        problem: { type: 'string' },      // چه مشکلی را حل می‌کند
        behavior: { type: 'string' },     // چه کاری را متفاوت انجام بدهم
        message: { type: 'string' }       // پیام اصلی در یک جمله
      },
      required: ['problem', 'behavior', 'message']
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          narration: { type: 'string' },
          tone: { type: 'string' },
          chunkNos: { type: 'array', items: { type: 'string' } },
          enrichIds: { type: 'array', items: { type: 'string' } },
          mustSee: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                where: { type: 'string' },
                why: { type: 'string' },
                benefit: { type: 'string' }
              },
              required: ['source', 'why']
            }
          }
        },
        required: ['heading', 'narration', 'tone']
      }
    },
    outro: { type: 'string' },
    summary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    coverage: { type: 'string' }
  },
  required: ['title', 'hook', 'goal', 'sections', 'outro', 'summary']
};

function buildSpecialPrompt_(ctx) {
  var L = [];
  L.push('تو نویسنده و سردبیرِ یک برنامهٔ رادیوییِ آموزشیِ فارسی به نام «' +
         CFG.SPECIAL_SHOW_NAME + '» هستی — ' + CFG.SPECIAL_TAGLINE + '.');
  L.push('این قسمت دربارهٔ مجموعهٔ آموزشیِ «' + ctx.seriesName + '» است.');
  L.push('');

  if (ctx.orders && ctx.orders.length) {
    L.push(instructionBlock_(ctx.orders,
      'اصلاح‌هایی که بازبینِ قسمتِ قبل خواسته (این‌ها قاعدهٔ سخت‌اند و بر همهٔ قاعده‌های زیر مقدم‌اند):'));
  }

  L.push('══ قاعده‌های سختِ این برنامه ══');
  L.push('۱) وفاداری مطلق به محتوای درس. حق نداری نصیحت کنی، برداشت شخصی اضافه کنی، ' +
         'یا چیزی بگویی که در متنِ قطعه‌ها نیست. اگر مدرس چیزی نگفته، تو هم نگو.');
  L.push('۲) روخوانی نکن. متنِ قطعه‌ها را کلمه‌به‌کلمه پشت سر هم نچین؛ آن‌ها را به یک ' +
         'روایتِ آموزشیِ پیوسته تبدیل کن که همان مطالب را با زبانِ گفتار می‌آموزد.');
  L.push('۳) خلاصه هم نکن. هیچ مفهوم، مثال، عدد، تعریف یا استدلالی نباید از دست برود. ' +
         'اگر مجبوری بین «کوتاه‌تر شدن» و «کامل ماندن» یکی را انتخاب کنی، کامل ماندن مقدم است.');
  L.push('۴) ترتیبِ آموزشیِ خودِ درس را حفظ کن. مفهومی را پیش از مقدمه‌اش نگو.');
  L.push('۵) عدد و اصطلاح و نامِ ابزار را دقیقاً همان‌طور که در متن است بیاور — ' +
         'مقدارشان را عوض نکن و گرد نکن. (فقط شکلِ نوشتنشان با حروف است، نه با رقم؛ ' +
         'پایین‌تر توضیح داده شده.)');
  L.push('۶) هیچ توصیهٔ مالی و سرمایه‌گذاری و سیگنالی نده، حتی اگر درس دربارهٔ بازار باشد. ' +
         'فقط مفهومِ آموزشی را منتقل کن.');
  L.push('۷) تفسیرِ بی‌مبنا ممنوع: انگیزه، احساس یا زمینه‌ای که مدرس نگفته را به او و ' +
         'به محتوا نسبت نده. توصیف از متن، نه روایتِ خودساخته.');
  L.push('۸) در متنِ گفتار هیچ لینک، شناسهٔ فایل یا نامِ فایلِ حرف‌وعددی نیاور — منبع را ' +
         'با نامِ آدم‌فهم بگو؛ شناسه فقط در فیلدهای ساخت‌یافته (chunkNos، enrichIds، ' +
         'mustSee.source) می‌نشیند.');
  L.push('۹) مشاهدهٔ ضروری: اگر جایی از درس را صوت و متن نمی‌توانند کامل منتقل کنند ' +
         '(نمودار، حرکتِ تصویری، جدول، فرمولِ روی تخته...)، در فیلد mustSee همان بخش ' +
         'ثبت کن: source شناسه یا شمارهٔ همان قطعه؛ where جای دقیق — بازهٔ زمانی یا ' +
         'صفحه — فقط از روی فیلدِ «بازه»ی خودِ همان قطعه که در سرصفحه‌اش آمده؛ بازه را ' +
         'هرگز از خودت نساز؛ why چرا دیدنش ضروری است؛ benefit دیدنش چه می‌دهد. ' +
         'و در متنِ همان بخش (یا در پایان‌بندی، هر کدام طبیعی‌تر است) با لحنِ مناسبِ یک ' +
         'مدرس، همین دعوت و دلیلش را به زبانِ گفتار بگو — بی شناسه و بی لینک. ' +
         'تا می‌شود متن را بی‌نیازکننده بنویس؛ mustSee فقط برای جایی که واقعاً نمی‌شود.');
  L.push('');

  L.push('══ آنچه باید در قسمت روشن شود (علاوه بر خودِ درس) ══');
  L.push('در فیلد goal این سه را از دلِ همین متن دربیاور و در متنِ روایت هم جایشان بده:');
  L.push('• problem — این آموزش قرار است چه مشکلی را حل کند یا چه مهارتی اضافه کند؟');
  L.push('• behavior — مدرس انتظار دارد شنونده در پایان چه کاری را متفاوت از قبل انجام بدهد؟');
  L.push('• message — ایدهٔ مرکزیِ این بخش از آموزش در یک جمله چیست؟');
  L.push('این‌ها باید از خودِ متن استخراج شوند، نه از دانشِ عمومیِ تو.');
  L.push('');

  if (ctx.recapText) {
    L.push('══ قسمت‌های قبلیِ همین مجموعه ══');
    L.push(ctx.recapText);
    L.push('در فیلد recap یک مرورِ کوتاه (سه تا پنج جمله) بنویس که شنونده رشتهٔ کار را ' +
           'گم نکند: تا اینجا چه گفته شد و امروز از کجا ادامه می‌دهیم. اگر این قسمتِ اول ' +
           'است، recap را خالی بگذار.');
    L.push('');
  } else {
    L.push('این قسمتِ اولِ این مجموعه است. فیلد recap را خالی بگذار و به‌جایش در قلاب، ' +
           'خودِ مجموعه را کوتاه معرفی کن.');
    L.push('');
  }

  L.push('══ متنِ درس — همین‌ها مادهٔ خامِ قسمت‌اند ══');
  for (var cv = 0; cv < ctx.covers.length; cv++) {
    var cvr = ctx.covers[cv];
    L.push('• قسمت ' + cvr.partSeq + 'ـمِ مجموعه («' + cvr.partName + '») — قطعهٔ ' +
           cvr.fromNo + ' تا ' + cvr.toNo + ' از ' + cvr.totalChunks +
           (cvr.more ? ' (بقیه‌اش در قسمت‌های بعد)' : ' (این قسمتِ درس همین‌جا تمام می‌شود)'));
  }
  if (ctx.covers.length > 1) {
    L.push('این قسمتِ پادکست ' + ctx.covers.length + ' قسمتِ درس را با هم پوشش می‌دهد. ' +
           'ترتیبشان را حفظ کن و در متن روشن بگو کِی از یک درس به درسِ بعدی می‌رویم.');
  }
  L.push('شماره‌ها را در chunkNos به‌شکلِ رشتهٔ رقمِ لاتین بنویس («۳» را «3»).');
  L.push('قطعه‌ها با شمارهٔ پیوستهٔ ۱ تا ' + ctx.chunks.length + ' آمده‌اند. در chunkNos ' +
         'همین شماره‌های پیوسته را بنویس، نه شمارهٔ اصلیِ قطعه.');
  L.push('');
  for (var i = 0; i < ctx.chunks.length; i++) {
    var c = ctx.chunks[i];
    L.push('--- قطعهٔ ' + c.idx +
           (ctx.covers.length > 1 ? ' | از قسمت ' + c.partSeq : '') +
           ' | شمارهٔ اصلی ' + c.no +
           (c.slices > 1 ? '، برش ' + c.slice + ' از ' + c.slices : '') +
           (c.range ? '، ' + c.range : '') + ' ---');
    // متنِ آرشیو نباید بتواند جداکنندهٔ خودِ پرامپت را جعل کند
    L.push(String(c.text).replace(/---\s*قطعهٔ/g, '— قطعهٔ').replace(/^══/gm, '=='));
    L.push('');
  }

  if (ctx.enrich && ctx.enrich.length) {
    L.push('══ مواد مکمل — خارج از درس ══');
    L.push('این‌ها از فایل‌های دیگرِ آرشیو آمده‌اند و جزوِ این درس نیستند. برای تعمیق و ' +
           'تکمیل می‌توانی از آن‌ها استفاده کنی، ولی هر جا استفاده کردی باید در همان جمله ' +
           'صریح بگویی که این توضیح خارج از درس است و برای تکمیل آمده — مثلاً: ' +
           '«این نکته در خودِ درس نیامده؛ از یک منبع دیگرِ آرشیو اضافه‌اش می‌کنم…».');
    L.push('اجباری نیست همه‌شان را به کار ببری؛ فقط آن‌هایی که واقعاً به مطلبِ همین قطعه‌ها ' +
           'مربوط‌اند. شناسهٔ هر کدام را که به کار بردی در enrichIds همان بخش بنویس.');
    for (var e = 0; e < ctx.enrich.length; e++) {
      var x = ctx.enrich[e];
      L.push('- شناسه: ' + x.id + ' | نوع: ' + x.kind + ' | دسته: ' + x.cat +
             (x.fromSeries ? ' | از مجموعهٔ آموزشیِ «' + x.fromSeries + '»' : ' | از آرشیو عمومی') +
             ' | موضوع: ' + String(x.topic).slice(0, 120) +
             ' | پیام: ' + String(x.msg).slice(0, 200) +
             ' | خلاصه: ' + String(x.summary).slice(0, 400));
    }
    L.push('اگر مکملی از یک مجموعهٔ آموزشیِ دیگر آمده، همان‌جا نامِ آن مجموعه را هم بگو: ' +
           '«این را از دورهٔ فلان می‌آورم، که بخشی از این درس نیست».');
    L.push('');
  }

  L.push('══ ساختار خروجی ══');
  L.push('• title: عنوانِ این قسمت. نامِ مجموعه در آن نیاید (خودش جداگانه می‌آید).');
  L.push('• hook: آغازِ برنامه. با نامِ برنامه شروع کن: «' + CFG.SPECIAL_SHOW_NAME + '»، ' +
         'بعد ' + ctx.when.spoken + ' را بگو، بعد بگو امروز از کدام مجموعه و کدام قسمتش ' +
         'حرف می‌زنیم.');
  L.push('• recap: مرورِ قسمت‌های قبل (اگر هست).');
  L.push('• sections: حدود ' + CFG.SPECIAL_SECTIONS + ' بخش. هر بخش:');
  L.push('   heading (عنوان کوتاه)، narration (متنِ گفتار — بلند و کامل)، ' +
         'tone (دستور اجرا برای گوینده)، chunkNos (شمارهٔ قطعه‌هایی که این بخش از آن‌ها ' +
         'آمده)، enrichIds (شناسهٔ موادِ مکملِ به‌کاررفته).');
  L.push('• outro: پایان. اگر قطعه‌های این قسمت تمام نشده، بگو ادامه‌اش در قسمت بعد می‌آید.');
  L.push('• summary: خلاصهٔ سه چهار جمله‌ایِ همین قسمت، برای مرورِ قسمت بعد.');
  L.push('• tags: شش تا ده برچسبِ دقیقِ فارسی برای جست‌وجو — نامِ مجموعه، موضوع، ' +
         'ابزار و مفهوم‌های اصلی. بدون علامت #.');
  L.push('• coverage: در یک جمله بگو این قسمت دقیقاً چه بخشی از مجموعه را پوشش داد.');
  L.push('');
  L.push('══ نوشتنِ متنِ گفتار ══');
  L.push('• متن باید «گفتنی» باشد، نه «خواندنی». جمله‌ها کوتاه، فعل‌ها ساده.');
  L.push('• هیچ رقمی به‌شکل عدد ننویس؛ همه را با حروفِ فارسی بنویس — ولی مقدارش را ' +
         'دقیقاً همان که در متنِ درس است نگه دار («۱۴٫۵ درصد» ← «چهارده و نیم درصد»).');
  L.push('• هیچ حرف یا واژهٔ لاتین ننویس؛ اصطلاح خارجی را با تلفظِ فارسیِ رایجش بنویس.');
  L.push('• هیچ نشانهٔ مارک‌داون، بولت، شماره‌گذاری یا عنوانِ داخل متن نگذار.');
  L.push('• کسرهٔ اضافه را در ترکیب‌های اضافی با «ـِ» بنویس تا گوینده درست بخواند.');
  L.push('• هیچ جمله‌ای بیش از ' + CFG.MAX_SENTENCE_WORDS + ' واژه نباشد.');
  L.push('• نویسه‌های عربی (ي، ك، ة) به کار نبر؛ معادل فارسی بنویس.');
  L.push('• طولِ مجموعِ متن باید حدود ' + Math.round(specialTargetMin_() * 150) +
         ' واژه باشد (' + specialTargetMin_() + ' دقیقه گفتار).');
  // سقفِ سخت لازم است چون هدفِ واژه‌ای را مدل مرتب رد می‌کند، و متنِ بلندتر یعنی
  // هم فایلِ سنگین‌تر، هم جای بیشتر برای پُرکردن و حرفِ اضافه.
  L.push('• سقفِ سخت: از ' + specialMaxChars_() + ' نویسه بیشتر نشود. کوتاه‌تر ایرادی ' +
         'ندارد؛ بلندتر یعنی درس کِش آمده است.');
  L.push('• پیوندِ میان بخش‌ها را با عبارت‌های کلیشه‌ای نساز. اگر پیوندی نیست، ساده رد شو.');
  return L.join('\n');
}

// ------------------------------------------------------------- تولید

/** پوشهٔ ریشهٔ هر برنامه، یک بار ساخته و بعد پیدا می‌شود. */
function showFolder_(name) {
  var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  var it = root.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return root.createFolder(name);
}

/** شمارهٔ پوشه: دو رقمی با صفرِ پیشرو، ولی ۱۰۰ به بالا کامل — «123»، نه «23». */
function seriesFolderNo_(n) {
  var x = Number(n) || 0;
  return x > 99 ? String(x) : ('00' + x).slice(-2);
}

/** نامِ امنِ پوشه از یک دسته (نویسه‌های ممنوعِ درایو پاک می‌شوند). */
function safeFolderName_(s) {
  return String(s || '').replace(/[\/\\:*?"<>|]/g, '·').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/**
 * پوشهٔ یک دسته، زیرِ ریشهٔ «درس‌نامه»: «درس‌نامه/‏<دسته>‏».
 * دستهٔ خالی یا «متفرقه» (یعنی هنوز دسته‌ای تعیین نشده) به خودِ ریشه می‌رود تا
 * پوشه‌ها بی‌جهت جابه‌جا نشوند تا وقتی دستهٔ واقعی معلوم شود.
 */
function seriesCatFolder_(cat) {
  var root = showFolder_(CFG.SPECIAL_FOLDER);
  var c = String(cat || '').trim();
  if (!c || c === MISC_TITLE) return root;
  var nm = safeFolderName_(c);
  if (!nm) return root;
  var it = root.getFoldersByName(nm);
  return it.hasNext() ? it.next() : root.createFolder(nm);
}

/** پوشهٔ شماره‌دارِ یک مجموعه، زیرِ دستهٔ خودش. */
function seriesFolder_(reg, rec) {
  var have = String(rec.vals[SC.FOLDER - 1] || '');
  if (have) {
    try { return DriveApp.getFolderById(have); } catch (e) {}
  }
  // زیرِ پوشهٔ دستهٔ خودش ساخته می‌شود؛ دسته و شمارهٔ دستیِ شما هر دو از
  // همان اولین ساخت اثر می‌گذارند، نه فقط در اصلاحِ بعدی.
  var root = seriesCatFolder_(seriesCatOf_(rec.vals));
  var moF = seriesMOrder_(rec.vals);
  var order = isFinite(moF) ? moF : (Number(rec.vals[SC.ORDER - 1]) || (reg.rows.length + 1));
  var nm = seriesFolderNo_(order) + ' — ' + String(rec.vals[SC.NAME - 1] || rec.key).slice(0, 70);
  var it = root.getFoldersByName(nm);
  var f = it.hasNext() ? it.next() : root.createFolder(nm);
  rec.vals[SC.FOLDER - 1] = f.getId();
  try { reg.sheet.getRange(rec.row, SC.FOLDER, 1, 1).setValue(f.getId()); } catch (e2) {}
  return f;
}

/** مرورِ قسمت‌های قبلیِ همین مجموعه، از ستون «داستان تا اینجا». */
function recapTextOf_(rec) {
  var story = String(rec.vals[SC.STORY - 1] || '').trim();
  if (!story) return '';
  var lines = story.split('\n').filter(String);
  return lines.slice(-CFG.SPECIAL_RECAP_EPISODES).join('\n');
}

function produceSpecialEpisode(opt) {
  opt = opt || {};
  if (!CFG.SPECIAL_ENABLED) return { ok: false, reason: 'disabled' };
  // همان دروازهٔ «از همه جا از همه رنگ»، با کلیدِ خودش. ردیفِ این برنامه در
  // تقویم با نخستین اجرا ساخته می‌شود.
  if (!opt.manual) {
    try {
      var g = calGate_(ENRICH_SHOW_SPECIAL, CFG.SPECIAL_SHOW_NAME);
      if (g && g.ok === false) return { ok: false, reason: 'calendar', why: g.why };
    } catch (eCal) { logLine_('تقویمِ تولید وارسی نشد: ' + eCal.message); }
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    logLine_('درس‌نامه: اسکریپت دیگری در حال اجراست؛ فعلاً رد شد.');
    return { ok: false, reason: 'busy' };
  }
  var tStart = new Date().getTime();
  try {
    if (props_().getProperty(PK.SP_PENDING)) {
      logLine_('درس‌نامه: قسمت قبلی هنوز در حال صداگذاری است؛ ادامه داده می‌شود.');
      lock.releaseLock();
      // این اجرا قسمتِ تازه‌ای نمی‌سازد؛ فقط صداگذاریِ قسمتِ قبلی را جلو می‌برد.
      // بی این نشانه، منو می‌گفت «درس‌نامه ۵ نوشته شد» در حالی که هیچ ردیفی
      // اضافه نشده بود و کاربر خیال می‌کرد یک قسمتِ تازه دارد.
      var pend;
      try { pend = renderSpecialAudioStep_() || {}; }
      catch (ePd) { pend = { ok: false, reason: 'audio-error', detail: ePd.message }; }
      pend.audioOnly = true;
      if (pend.reason === undefined) pend.reason = 'audio-pending';
      return pend;
    }
    var hub = getHub_();
    try { ingestReports_(hub, new Date().getTime() + 45000); } catch (eIn) {}
    var orders = [];
    try { orders = openInstructions_(hub); } catch (eOr) { orders = []; }

    // رجیستری تازه؟ اگر مجموعهٔ تازه‌ای آمده یا قسمتی به مجموعهٔ تمام‌شده اضافه
    // شده، همین‌جا دیده می‌شود.
    try { scanSeries(false); } catch (eSc) { logLine_('اسکن مجموعه‌ها ناموفق: ' + eSc.message); }
    var reg = readSeriesReg_(hub);
    // داوریِ محتوایی: مجموعهٔ تازه پیش از هر تصمیمی از روی متنِ واقعی‌اش سنجیده
    // می‌شود — آموزشی هست یا نه، موضوعش چیست، ذیل کدام دسته و با کدام سطح.
    // بودجه‌دار است و اگر تمام نشود، اجرای بعد ادامه می‌دهد.
    // بودجهٔ داوری از «باقی‌ماندهٔ اجرا» حساب می‌شود، نه یک عددِ ثابت. پیش‌تر
    // داوری می‌توانست نود ثانیه بخورد و بعد پنجرهٔ ۱۲۰ ثانیه‌ایِ «تلاشِ دوباره
    // برای متنِ بریده» عملاً خالی بماند — یعنی متنِ ناقص بی‌اعتراض پذیرفته شود.
    var jBudget = Math.min(70 * 1000,
      Math.max(0, (CFG.MAX_RUNTIME_MS || 270000) - 190 * 1000 -
                  (new Date().getTime() - tStart)));
    if (jBudget > 15 * 1000) {
      try { judgeSeries(false, new Date().getTime() + jBudget, reg); } catch (eJd) {}
    }
    reg = readSeriesReg_(hub);
    // ترتیبِ درونِ دسته از خودِ داوری می‌آید (سطح + راهنماییِ مدل)، پس
    // برنامه‌ریزِ قدیمی که فقط از روی نامِ فایل حدس می‌زد دیگر صدا زده نمی‌شود.
    try { rankWithinCategories_(hub, reg); } catch (ePl) {}
    reg = readSeriesReg_(hub);

    // مجموعه و جای ایستادن. اگر مجموعهٔ جاری همین‌جا تمام شود، بی‌درنگ سراغ
    // مجموعهٔ بعدی می‌رویم — وگرنه روزی که یک دوره تمام می‌شد، هیچ قسمتی
    // ساخته نمی‌شد و یک روز بی‌خود از دست می‌رفت.
    var rec = null, seriesKey = '', seriesName = '', parts = null, list = null;
    var partRec = null, fromNo = 1, fromSlice = 1, finished = [], skipped = [];
    var seg = null, covers = [];
    var badParts = Object.create(null);   // قسمت‌هایی که در همین اجرا خوانده نشدند
    var badSeries = Object.create(null);  // مجموعه‌هایی که امروز خوانده نشدند
    var badBySeries = Object.create(null); // شمارِ قسمت‌های خوانده‌نشدهٔ هر مجموعه
    var forcedRescan = false;
    var applyPlan = function (plan) {
      // نوشتن‌ها این‌جا انجام می‌شود، نه داخلِ انتخاب‌کننده — تا مسیرهای
      // صرفاً خواندنی (تخته، فایل وضعیت، وارسی سلامت) چیزی را عوض نکنند.
      for (var sp0 = 0; sp0 < plan.spent.length; sp0++) markSeriesDone_(reg, plan.spent[sp0]);
      if (plan.pinExhausted) {
        var oldPin = seriesPin_();
        clearSeriesPin_();
        if (oldPin) {
          logLine_('درس‌نامه: انتخابِ دستیِ «' + pinLabel_(hub, oldPin, reg) + '» تمام شد؛ ' +
                   'سنجاق برداشته شد و موتور به مجموعهٔ قبلی برمی‌گردد.');
        }
      }
      return plan.rec;
    };
    // سقفِ پرش باید از شمارِ مجموعه‌های خراب بیشتر باشد، وگرنه چند دورهٔ
    // خراب جلوی رسیدن به دورهٔ سالم را می‌گیرند.
    for (var hop = 0; hop < 14 && !seg; hop++) {
      rec = applyPlan(pickSeriesPlan_(hub, reg, readSeriesParts_(hub), badSeries));
      // چیزی برای ساختن نیست؟ ممکن است دورهٔ تازه‌ای همین امروز اضافه شده باشد و
      // پشتِ سقفِ دوازده‌ساعته اسکن جا مانده باشد. یک بار به‌زور تازه می‌کنیم.
      if (!rec && !forcedRescan && CFG.SERIES_FORCE_ON_IDLE) {
        forcedRescan = true;
        try { scanSeries(true); } catch (eFr) {}
        reg = readSeriesReg_(hub);
        try { judgeSeries(false, new Date().getTime() + 60 * 1000, reg); } catch (eJ2) {}
        reg = readSeriesReg_(hub);
        try { rankWithinCategories_(hub, reg); reg = readSeriesReg_(hub); } catch (ePc) {}
        rec = applyPlan(pickSeriesPlan_(hub, reg, readSeriesParts_(hub), badSeries));
      }
      if (!rec) break;
      seriesKey = rec.key;
      seriesName = String(rec.vals[SC.NAME - 1] || seriesKey);
      parts = readSeriesParts_(hub);
      list = parts.byKey[seriesKey] || [];

      // جای ایستادن فقط از ستون «مصرف‌شده تا قطعه»ی خودِ هر قسمت خوانده می‌شود.
      // پیش‌تر شمارندهٔ سطحِ مجموعه هم روی آن اعمال می‌شد، ولی دو فایل می‌توانند
      // شمارهٔ قسمتِ یکسان بگیرند (مثلاً یک کتاب که دوباره با همان نام آپلود
      // شده). آن‌وقت مکان‌نمای فایلِ قبلی روی فایلِ تازه اعمال می‌شد و فایلِ
      // تازه بی‌آنکه حتی خوانده شود «تمام‌شده» علامت می‌خورد.
      partRec = null;
      for (var i = 0; i < list.length; i++) {
        var pv = list[i].vals;
        if (badParts[String(pv[SP.FILE - 1])]) continue;
        var doneTo = Number(pv[SP.DONE_TO - 1]) || 0;
        var nChunks = Number(pv[SP.CHUNKS - 1]) || 0;
        if (nChunks > 0 && doneTo >= nChunks) continue;    // این قسمت تمام شده
        var cur = spCursor_(doneTo);
        partRec = list[i]; fromNo = cur.no; fromSlice = cur.slice;
        break;
      }

      if (partRec) {
        seg = readPartChunks_(partRec, fromNo, CFG.SPECIAL_SOURCE_CHARS, fromSlice);
        if (seg.error) {
          // خواندنِ این قسمت نشد (تب تغییرِ نام داده، دسترسی قطع شده…).
          // برنامه نباید بایستد: همین قسمت را کنار می‌گذاریم و سراغ قسمت یا
          // مجموعهٔ بعدی می‌رویم، و ایراد را ثبت می‌کنیم تا ناظر ببیندش.
          badParts[String(partRec.vals[SP.FILE - 1])] = true;
          badBySeries[seriesKey] = (badBySeries[seriesKey] || 0) + 1;
          skipped.push(String(partRec.vals[SP.NAME - 1]) + ': ' + seg.error);
          logLine_('درس‌نامه: قسمت «' + partRec.vals[SP.NAME - 1] + '» خوانده نشد (' +
                   seg.error + ')؛ سراغ بعدی می‌رویم.');
          seg = null; partRec = null;
          hop--;                                   // این تلاش «پرش مجموعه» نبود
          // اگر چند قسمتِ همین مجموعه پشت سر هم خوانده نشد، همین مجموعه را برای
          // این اجرا کنار می‌گذاریم و سراغ مجموعهٔ بعدی می‌رویم. پیش‌تر این‌جا
          // کلِ حلقه می‌شکست؛ یعنی با شش قسمتِ خرابِ آرشیو، مجموعه‌های سالم هم
          // هرگز نوبت نمی‌گرفتند و تولید برای همیشه صفر می‌شد.
          if ((badBySeries[seriesKey] || 0) >= 3) { badSeries[seriesKey] = true; hop++; }
          // و اگر اجرا دارد طولانی می‌شود، همین‌جا بس است؛ اجرای بعد ادامه می‌دهد.
          if (new Date().getTime() - tStart > 100000) break;
          continue;
        }
        if (!seg.chunks.length) {
          // قطعه‌های باقی‌مانده همه تهی بودند (پیاده‌سازی نشده). این قسمت را
          // تمام‌شده علامت می‌زنیم و بی‌درنگ سراغ بعدی می‌رویم — روزِ تولید
          // نباید به‌خاطر یک فایلِ خالی از دست برود.
          partRec.vals[SP.DONE_TO - 1] = Number(partRec.vals[SP.CHUNKS - 1]) || fromNo;
          partRec.vals[SP.UPDATED - 1] = nowStr_();
          try { parts.sheet.getRange(partRec.row, 1, 1, SPART_HEADERS.length)
                  .setValues([partRec.vals]); } catch (eEP) {}
          badParts[String(partRec.vals[SP.FILE - 1])] = true;
          logLine_('درس‌نامه: قطعهٔ قابل‌استفاده‌ای در «' + partRec.vals[SP.NAME - 1] +
                   '» از شمارهٔ ' + fromNo + ' به بعد نبود؛ تمام‌شده علامت خورد.');
          seg = null; partRec = null;
          hop--;
          continue;
        }
        // اگر این قسمت تمام شد و بودجه هنوز جای زیادی دارد، قسمتِ بعدیِ همان
        // مجموعه را هم به همین قسمتِ پادکست اضافه می‌کنیم. خواستهٔ صریح این بود
        // که «گاهی چندین قسمت می‌تواند تبدیل به یک پادکست بشود» — وگرنه یک
        // درسِ چهارقطعه‌ای با دوهزار نویسه متن، یک قسمتِ پانزده‌دقیقه‌ای می‌شد.
        covers = [{ rec: partRec, seg: seg }];
        var used = seg.chars;
        var startIdx = list.indexOf(partRec);
        while (!seg.more && used < CFG.SPECIAL_SOURCE_CHARS * 0.55 &&
               covers.length < 3 && startIdx >= 0) {
          var nxt = null;
          for (var k2 = startIdx + 1; k2 < list.length; k2++) {
            var kv = list[k2].vals;
            if (badParts[String(kv[SP.FILE - 1])]) continue;
            var dt2 = Number(kv[SP.DONE_TO - 1]) || 0;
            var nc2 = Number(kv[SP.CHUNKS - 1]) || 0;
            if (nc2 > 0 && dt2 >= nc2) continue;
            nxt = list[k2]; startIdx = k2; break;
          }
          if (!nxt) break;
          var c2 = spCursor_(Number(nxt.vals[SP.DONE_TO - 1]) || 0);
          var seg2 = readPartChunks_(nxt, c2.no, CFG.SPECIAL_SOURCE_CHARS - used, c2.slice);
          if (seg2.error || !seg2.chunks.length) {
            badParts[String(nxt.vals[SP.FILE - 1])] = true;
            continue;
          }
          covers.push({ rec: nxt, seg: seg2 });
          used += seg2.chars;
          seg = seg2;                    // برای شرطِ حلقه: آیا این هم تمام شد؟
        }
        seg = covers[0].seg;
        break;                                     // قطعه داریم؛ کار شروع می‌شود
      }
      // این مجموعه تمام است → ببند و برو سراغ بعدی.
      // ولی اگر قسمتی از همین مجموعه در این اجرا «خوانده نشد» (تبِ منبع
      // تغییرِ نام داده، دسترسی لحظه‌ای قطع شده)، مجموعه تمام نشده — فقط امروز
      // نشد. بستنش یعنی درس‌هایش برای همیشه دور ریخته شوند، چون شمارِ قسمت و
      // قطعه دیگر رشد نمی‌کند و بازگشایی هم هرگز رخ نمی‌دهد.
      var unreadHere = false;
      for (var bi = 0; bi < list.length; bi++) {
        var bv = list[bi].vals;
        if (!badParts[String(bv[SP.FILE - 1])]) continue;
        var bn = Number(bv[SP.CHUNKS - 1]) || 0, bd = Number(bv[SP.DONE_TO - 1]) || 0;
        if (!(bn > 0 && bd >= bn)) { unreadHere = true; break; }
      }
      if (unreadHere) {
        badSeries[seriesKey] = true;
        logLine_('درس‌نامه: مجموعهٔ «' + seriesName + '» بسته نشد؛ قسمت‌هایش امروز ' +
                 'خوانده نشدند. اجرای بعد دوباره امتحان می‌شود.');
        try {
          logSelfFinding_(hub, {
            // کلید شاملِ خودِ مجموعه است: اثر انگشتِ گزارش‌ها از کلید ساخته
            // می‌شود، پس با کلیدِ مشترک، دورهٔ دوم زیرِ ردیفِ دورهٔ اول گم می‌شد.
            priority: 'جدی', category: 'مجموعه‌های آموزشی',
            key: 'sp-series-unreadable:' + seriesKey,
            // نامِ مجموعه در عنوان می‌آید تا هر مجموعهٔ خراب ردیفِ خودش را
            // بگیرد؛ وگرنه یافتهٔ دومی زیرِ یافتهٔ اولی گم می‌شد و شما هرگز
            // نمی‌فهمیدید کدام دوره مشکل دارد.
            title: 'قسمت‌های مجموعهٔ «' + seriesName + '» خوانده نشد',
            detail: 'مجموعهٔ «' + seriesName + '»: ' +
                    (skipped.length ? skipped.slice(0, 3).join(' | ') : 'خطای خواندن') +
                    '. مجموعه «تمام‌شده» علامت نخورد تا محتوایش از دست نرود.',
            instruction: 'نامِ تب و دسترسیِ شیت منبع را وارسی کن.', owner: 'موتور'
          });
        } catch (eUf) {}
        continue;
      }
      rec.vals[SC.STATUS - 1] = SST.DONE;
      rec.vals[SC.UPDATED - 1] = nowStr_();
      try { reg.sheet.getRange(rec.row, 1, 1, SERIES_HEADERS.length).setValues([rec.vals]); }
      catch (eD2) {}
      finished.push(seriesName);
      logLine_('درس‌نامه: مجموعهٔ «' + seriesName + '» تمام شد.');
      props_().setProperty(PK.SP_SERIES, seriesKey);
      reg = readSeriesReg_(hub);
    }
    if (!rec) {
      logLine_('درس‌نامه: هیچ مجموعهٔ آموزشیِ آماده‌ای نبود.');
      return { ok: false, reason: 'no-series', finished: finished };
    }
    if (!list || !list.length) {
      logLine_('درس‌نامه: مجموعهٔ «' + seriesName + '» قسمتی ندارد.');
      return { ok: false, reason: 'no-parts', series: seriesName };
    }
    if (!partRec || !seg) {
      // اگر سنجاقی فعال است و کارِ همین اجرا به هیچ‌جا نرسید، سنجاق برداشته
      // می‌شود. وگرنه مجموعه‌ای که قطعه‌هایش خوانده نمی‌شود (تبِ منبع تغییرِ
      // نام داده، دسترسی قطع شده) کلِ برنامه را برای همیشه قفل می‌کرد: هر روز
      // «چیزی پیدا نشد» و هیچ مجموعهٔ سالمی هم نوبت نمی‌گرفت.
      var stuckPin = seriesPin_();
      if (stuckPin) {
        var stuckName = pinLabel_(hub, stuckPin);
        clearSeriesPin_();
        logLine_('درس‌نامه: با انتخابِ دستیِ «' + stuckName + '» چیزی قابل تولید نبود؛ ' +
                 'سنجاق برداشته شد تا اجرای بعد مجموعه‌های دیگر بررسی شوند.');
        try {
          logSelfFinding_(hub, {
            priority: 'جدی', category: 'مجموعه‌های آموزشی', key: 'sp-pin-unproducible',
            title: 'مجموعهٔ انتخاب‌شدهٔ دستی قابل تولید نبود',
            detail: 'انتخاب دستی: ' + stuckPin.kind + ':' + stuckPin.value +
                    (stuckName && stuckName !== stuckPin.value ? ' («' + stuckName + '»)' : '') +
                    (skipped.length ? ' — ' + skipped.slice(0, 3).join(' | ') : '') +
                    '. سنجاق برداشته شد تا تولید متوقف نماند.',
            instruction: '', owner: 'موتور'
          });
        } catch (ePf) {}
      }
      logLine_('درس‌نامه: قسمتِ قابلِ تولیدی پیدا نشد' +
               (skipped.length ? ' (' + skipped.length + ' قسمت خوانده نشد)' : '') + '.');
      if (skipped.length) {
        try {
          logSelfFinding_(hub, {
            priority: 'جدی', category: 'منابع',
            key: 'sp-unreadable-part',
            title: 'قسمت‌هایی از مجموعه‌های آموزشی خوانده نمی‌شوند',
            detail: skipped.slice(0, 5).join(' | '),
            instruction: '', owner: 'موتور'
          });
        } catch (eSf) {}
      }
      return { ok: false, reason: 'all-done', finished: finished, skipped: skipped };
    }
    if (skipped.length) {
      logLine_('درس‌نامه: ' + skipped.length + ' قسمت کنار گذاشته شد: ' + skipped.join(' | '));
      try {
        logSelfFinding_(hub, {
          priority: 'متوسط', category: 'منابع', key: 'sp-unreadable-part',
          title: 'قسمت‌هایی از مجموعه‌های آموزشی خوانده نمی‌شوند',
          detail: skipped.slice(0, 5).join(' | '), instruction: '', owner: 'موتور'
        });
      } catch (eSf2) {}
    }
    if (finished.length) {
      logLine_('درس‌نامه: سراغ مجموعهٔ بعدی رفت — «' + seriesName + '».');
    }
    var pinNow = seriesPin_();
    if (pinNow) {
      logLine_('درس‌نامه: انتخاب دستیِ ' +
               (pinNow.kind === 'cat' ? 'دستهٔ' : 'مجموعهٔ') + ' «' + pinLabel_(hub, pinNow, reg) +
               '» فعال است؛ روی «' + seriesName + '» کار می‌شود.');
    }

    // یک جریانِ شماره‌دارِ واحد از همهٔ قسمت‌هایی که این قسمتِ پادکست پوشش
    // می‌دهد. مدل به همین شماره‌های پیوسته (idx) ارجاع می‌دهد، پس دو قسمت که
    // هر دو «قطعهٔ ۱» دارند با هم قاطی نمی‌شوند.
    var stream = [], ci2 = 0;
    for (var cv = 0; cv < covers.length; cv++) {
      var cs = covers[cv].seg.chunks;
      for (var cc = 0; cc < cs.length; cc++) {
        ci2++;
        stream.push({ idx: ci2, cover: cv, no: cs[cc].no, slice: cs[cc].slice,
                      slices: cs[cc].slices, range: cs[cc].range, text: cs[cc].text,
                      partSeq: Number(covers[cv].rec.vals[SP.SEQ - 1]) || 0,
                      partName: String(covers[cv].rec.vals[SP.NAME - 1] || '') });
      }
    }

    var epNum = (parseInt(props_().getProperty(PK.SP_EP_NUM) || '0', 10)) + 1;
    var totalChars = 0;
    for (var tc = 0; tc < covers.length; tc++) totalChars += covers[tc].seg.chars;
    logLine_('درس‌نامه ' + epNum + ': «' + seriesName + '» — ' +
             covers.map(function (cv3) {
               return 'قسمت ' + cv3.rec.vals[SP.SEQ - 1] + ' قطعهٔ ' + cv3.seg.fromNo +
                      '–' + cv3.seg.toNo;
             }).join(' + ') + ' (' + stream.length + ' قطعه، ' + totalChars + ' نویسه).');

    // مکمل: از همهٔ شیت‌ها، نه فقط ردیف‌های آخر
    var allText = stream.map(function (c) { return c.text; }).join(' ');
    var terms = keyTerms_(allText, 18);
    var enrich = [];
    try {
      enrich = enrichFor_(hub, terms,
        list.map(function (p) { return String(p.vals[SP.FILE - 1]); }), CFG.SPECIAL_ENRICH);
    } catch (eE) { logLine_('جست‌وجوی مکمل ناموفق: ' + eE.message); }

    var when = todayWords_();
    var coverInfo = covers.map(function (cv2) {
      return { partSeq: Number(cv2.rec.vals[SP.SEQ - 1]) || 0,
               partName: String(cv2.rec.vals[SP.NAME - 1] || ''),
               partFile: String(cv2.rec.vals[SP.FILE - 1] || ''),
               fromNo: cv2.seg.fromNo, toNo: cv2.seg.toNo,
               totalChunks: cv2.seg.total, more: !!cv2.seg.more };
    });
    var ctx = { seriesName: seriesName, partName: String(partRec.vals[SP.NAME - 1] || ''),
                partSeq: Number(partRec.vals[SP.SEQ - 1]) || 0,
                fromNo: seg.fromNo, toNo: seg.toNo, totalChunks: seg.total,
                covers: coverInfo, chunks: stream,
                enrich: enrich, when: when, orders: orders,
                recapText: recapTextOf_(rec) };

    var prompt = buildSpecialPrompt_(ctx);
    var ep = geminiText_(prompt, SPECIAL_SCHEMA, 40960);
    if (!ep || !ep.sections || !ep.sections.length) throw new Error('متن درس‌نامه بدون بخش برگشت.');
    var repaired = !!ep.__repaired;
    if (repaired || fullSections_(ep) < 3) {
      logLine_('درس‌نامه ' + epNum + ': متن ناقص آمد (' + fullSections_(ep) + ' بخش)؛ تلاش دوباره.');
      if (new Date().getTime() - tStart < 120000) {
        try {
          var ep2 = geminiText_(prompt, SPECIAL_SCHEMA, 40960);
          if (ep2 && ep2.sections && ep2.sections.length && epScore_(ep2) > epScore_(ep)) ep = ep2;
        } catch (eR) {}
      }
    }
    ep.sections = ep.sections.filter(function (x) { return x && String(x.narration || '').trim(); });
    if (!ep.sections.length) throw new Error('متن درس‌نامه بدون بخشِ کامل برگشت.');
    try { delete ep.__repaired; } catch (eD) {}

    // «یک فایل» باید در کد تضمین شود، نه در یک جملهٔ پرامپت که مدل ردش می‌کند.
    if (CFG.SPECIAL_ONE_FILE === true) {
      try {
        var cnd = specialCondense_(ep, specialMaxChars_(), epNum);
        ep = cnd.ep;
        if (cnd.over > 0) {
          logSelfFinding_(hub, {
            priority: 'متوسط', category: 'پرامپت درس‌نامه', key: 'sp-over-one-file',
            title: 'متن درس‌نامه حتی پس از فشرده‌سازی از سقفِ یک فایل بلندتر ماند',
            detail: 'قسمت ' + epNum + ': ' + cnd.over + ' نویسه بالاتر از سقفِ ' +
                    specialMaxChars_() + '. قسمت در دو فایل فرستاده می‌شود.',
            instruction: 'متن باید از ' + specialMaxChars_() + ' نویسه کوتاه‌تر باشد؛ ' +
                         'قطعه‌های کمتری در هر قسمت پوشش بده تا جا شود.',
            owner: 'موتور', episode: epNum
          });
        }
      } catch (eCd) { logLine_('فشرده‌سازیِ درس‌نامه رد شد: ' + eCd.message); }
    }

    // وارسی وفاداری: نقل‌قول باید در متنِ همین قطعه‌ها باشد
    // موادِ مکمل هم باید در دامنهٔ وفاداری باشند: خودِ پرامپت به مدل گفته از
    // آن‌ها نقل کند. بی این، هر قسمتِ درست یک یافتهٔ «نقل‌قولِ بی‌پشتوانه»ی
    // «جدی» می‌ساخت و قسمت بعد به مدل دستور می‌داد همان قابلیت را کنار بگذارد.
    var fakeItems = stream.map(function (c) {
      return { id: 'C' + c.idx, topic: '', msg: '', summary: '', body: c.text }; });
    for (var ei = 0; ei < enrich.length; ei++) {
      fakeItems.push({ id: enrich[ei].id, topic: enrich[ei].topic, msg: enrich[ei].msg,
                       summary: enrich[ei].summary, body: enrich[ei].body });
    }
    var fid = [];
    try {
      // «درس‌نامه» هدفش ۱۵ دقیقه است و در نرخِ ۲۴ کیلوهرتز اصلاً در یک فایل جا
      // نمی‌شود (~۴۳ مگابایت در برابرِ سقفِ ۳۶). پس علامتِ «بلندتر از یک فایل»
      // برایش هشدارِ دروغ است، مگر صاحبِ برنامه صریح بخواهد یک‌فایلی شود.
      fid = fidelityCheck_({ hook: String(ep.hook || '') + ' ' + String(ep.recap || ''),
                             outro: ep.outro, sections: ep.sections }, fakeItems, when, '',
                            { expectOneFile: CFG.SPECIAL_ONE_FILE === true });
    } catch (eF) { fid = []; }
    if (fid.length) {
      var byKind = {};
      for (var z = 0; z < fid.length; z++) byKind[fid[z].kind] = (byKind[fid[z].kind] || 0) + 1;
      var bits = [];
      for (var kz in byKind) if (byKind.hasOwnProperty(kz)) bits.push(kz + ': ' + byKind[kz]);
      logLine_('پاس وفاداری درس‌نامه ' + epNum + ' — ' + fid.length + ' نشانه (' + bits.join('، ') + ').');
      try {
        logSelfFinding_(hub, {
          priority: byKind['نقل‌قول'] ? 'جدی' : 'متوسط',
          category: 'پرامپت درس‌نامه',
          key: 'sp-fidelity-' + Object.keys(byKind).sort().join('-'),
          title: 'پاس وفاداریِ درس‌نامه نشانه گرفت: ' + bits.join('، '),
          detail: fid.slice(0, 8).map(function (x) {
            return '[' + x.kind + '] ' + x.section + ': ' + x.text; }).join(' | '),
          instruction:
            (byKind['نقل‌قول'] ? 'در درس‌نامه هر نقل‌قول باید عیناً در متنِ همان قطعه‌ها باشد؛ ' +
              'اگر نیست، نقل نکن. ' : '') +
            (byKind['جملهٔ بلند'] ? 'جمله‌های بالای سی واژه را بشکن. ' : '') +
            (byKind['نویسهٔ عربی'] ? 'نویسه‌های عربی را با معادل فارسی جایگزین کن. ' : '') +
            (byKind['پیوند ساختگی'] ? 'پیوندِ کلیشه‌ای نساز. ' : '') +
            (byKind['تاریخ نیامده'] ? 'در آغاز برنامه نام برنامه و روز و تاریخ را بگو. ' : ''),
          owner: 'موتور', episode: epNum
        });
      } catch (eL) {}
    }

    // عکسِ محتوا — همان کاری که «از همه جا از همه رنگ» می‌کند، با همان تابع.
    // «دسته»ی درس‌نامه نامِ مجموعه است؛ متنِ خامش قطعه‌های همان درس (fakeItems).
    // فراخوانِ رو به جلو (۱۴ → ۲۴)، پس در try/catch.
    try {
      auditSnap_(ENRICH_SHOW_SPECIAL,
                 { showName: CFG.SPECIAL_SHOW_NAME, episode: epNum,
                   title: ep.title, category: seriesName,
                   targetMin: specialTargetMin_() },
                 { hook: ep.hook, outro: ep.outro, connection: ep.recap,
                   sections: ep.sections },
                 fakeItems, fid);
    } catch (eSn) { logLine_('عکسِ محتوای درس‌نامه گرفته نشد: ' + eSn.message); }

    // ── وارسیِ افشای مکمل ──
    // پرامپت به مدل گفته هر جا از موادِ مکمل استفاده کرد، در همان جمله بگوید
    // که این توضیح خارج از درس است. اگر نگفت، آن مکمل «استفاده‌شده» حساب
    // نمی‌شود (پس نشانه هم نمی‌خورد) و ایراد ثبت می‌شود.
    var declared = Object.create(null), undisclosed = 0;
    for (var sd = 0; sd < ep.sections.length; sd++) {
      var ids = ep.sections[sd].enrichIds || [];
      if (!ids.length) continue;
      var nar = txNorm(String(ep.sections[sd].narration || ''));
      var told = OUTSIDE_PAT.test(nar);
      for (var di = 0; di < ids.length; di++) {
        if (told) declared[String(ids[di])] = true;
        else undisclosed++;
      }
      if (!told) ep.sections[sd].enrichIds = [];
    }
    var usedEnrich = enrich.filter(function (x) { return declared[String(x.id)]; });
    if (undisclosed) {
      logLine_('درس‌نامه ' + epNum + ': ' + undisclosed +
               ' موردِ مکمل بی‌اعلامِ «خارج از درس» به کار رفته بود؛ نشانه‌گذاری نشد.');
      try {
        logSelfFinding_(hub, {
          priority: 'جدی', category: 'پرامپت درس‌نامه', key: 'sp-enrich-undisclosed',
          title: 'موادِ مکمل بدون اعلامِ «خارج از درس» به کار رفت',
          detail: 'قسمت ' + epNum + ': ' + undisclosed + ' مورد. شنونده نمی‌فهمد کدام ' +
                  'توضیح از خودِ درس است و کدام از بیرون آمده.',
          instruction: 'هر جا از موادِ مکمل استفاده می‌کنی، در همان جمله صریح بگو که این ' +
                       'توضیح در خودِ درس نیامده و برای تکمیل اضافه شده — و اگر از یک ' +
                       'مجموعهٔ آموزشیِ دیگر است، نامش را هم بگو.',
          owner: 'موتور', episode: epNum
        });
      } catch (eUd) {}
    }

    // پوشه و فایل وضعیت
    var folder = seriesFolder_(reg, rec).createFolder(
      'قسمت ' + ('000' + epNum).slice(-3) + ' — ' +
      Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyyMMdd') + ' — ' +
      String(ep.title || '').slice(0, 60));
    try { ensureCast_(ep, ENRICH_SHOW_SPECIAL, epNum, seriesCatOf_(rec.vals)); }
    catch (eCast) { logLine_('نقش‌گزینیِ درس‌نامه انجام نشد: ' + eCast.message); }

    writeSpecialJson_(folder, {
      ep: ep, seriesKey: seriesKey, seriesName: seriesName,
      partFile: String(partRec.vals[SP.FILE - 1]), partName: ctx.partName, partSeq: ctx.partSeq,
      covers: coverInfo,
      fromNo: seg.fromNo, toNo: seg.toNo, totalChunks: seg.total,
      more: coverInfo.some(function (x) { return x.more; }) ||
            coverInfo[coverInfo.length - 1].toNo < coverInfo[coverInfo.length - 1].totalChunks,
      chunkNos: seg.chunks.map(function (c) { return c.no; }),
      enrich: usedEnrich, enrichOffered: enrich.length,
      // دستهٔ مجموعه، تا نقش‌گزینیِ گویندگان بداند این درس از چه جنسی است
      seriesCat: seriesCatOf_(rec.vals),
      level: String(rec.vals[SC.LEVEL - 1] || ''),
      orders: orders, epNum: epNum, date: when
    });

    // نشانه‌گذاریِ جداگانه — ستونِ درس‌نامه، نه ستونِ برنامهٔ متنوع
    try { markSpecialUsed_(hub, usedEnrich, epNum); } catch (eM) {}

    var sp = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
    var tags = specialTags_(ep, seriesName, ctx.partSeq, epNum);
    var partsCell = coverInfo.map(function (x) {
      return 'قسمت ' + x.partSeq + ' (' + x.partName + ')'; }).join('  +  ');
    var chunkCell = coverInfo.map(function (x) {
      return 'قسمت ' + x.partSeq + ': قطعهٔ ' + x.fromNo + '–' + x.toNo + ' از ' + x.totalChunks;
    }).join('  |  ');
    var anyMore = coverInfo.some(function (x) { return x.more; });
    sp.appendRow([epNum, nowStr_(), seriesName, String(ep.title || ''),
                  partsCell, chunkCell,
                  '—', '', '', 'در حال ساخت صدا', '', tags.join(' '),
                  usedEnrich.map(function (x) { return x.id; }).join(', '),
                  anyMore ? 'بله — ادامه در قسمت بعد' : 'خیر — این قسمت‌های درس تمام شدند', '']);

    // ── پیشرفت: فقط تا جایی که واقعاً روایت شد ──
    // مکان‌نما نباید روی چیزی که به مدل «داده شد» جلو برود، بلکه روی چیزی که
    // مدل «گفت». اگر پاسخ بریده برگردد (که geminiText_ خودش انتظارش را دارد)،
    // جلو بردنِ مکان‌نما یعنی ده‌ها قطعه از درس برای همیشه پشت سر می‌مانند.
    var narrated = {}, sec2;
    for (var s3 = 0; s3 < ep.sections.length; s3++) {
      sec2 = ep.sections[s3];
      var nos = sec2.chunkNos || [];
      // شماره‌ها می‌توانند رشته باشند (قالبِ خروجی رشته‌ای است) یا رقمِ فارسی.
      // ولی فقط «عددِ خالص» پذیرفته می‌شود: «3-5» یا «3 (رد شد)» یا «1.0» عدد
      // نیستند و پاک‌کردنِ نویسه‌های اضافه، «۳ (رد شد)» را به ۳ تبدیل می‌کرد —
      // یعنی مکان‌نما از روی درسی که مدل صریحاً گفته بود نگفته، رد می‌شد.
      for (var n3 = 0; n3 < nos.length; n3++) {
        var tok = faDigits_(String(nos[n3] === null || nos[n3] === undefined ? '' : nos[n3])).trim();
        if (!/^[0-9]{1,6}$/.test(tok)) continue;
        var nn = parseInt(tok, 10);
        if (nn > 0) narrated[nn] = true;
      }
    }
    var lastIdx = -1, narrCount = 0, contig = -1;
    for (var q2 = 0; q2 < stream.length; q2++) {
      if (!narrated[stream[q2].idx]) continue;
      lastIdx = q2;
      narrCount++;
      if (contig === q2 - 1) contig = q2;      // پیوستگی از ابتدای جریان
    }
    // چند درصدِ قطعه‌هایی که به مدل داده شد، واقعاً در chunkNos آمد؟ اگر پاسخ
    // «قطعهٔ ۱ و قطعهٔ ۱۰» را نام ببرد و هشت قطعهٔ میانی را نگوید، حق نداریم
    // مکان‌نما را تا ته ببریم؛ آن هشت درس هرگز روایت نمی‌شدند و برنمی‌گشتند.
    var covRatio = stream.length ? (narrCount / stream.length) : 0;
    var gaps = [];
    for (var q4 = 0; q4 < stream.length; q4++) {
      if (!narrated[stream[q4].idx]) {
        gaps.push('قطعهٔ ' + stream[q4].no +
                  (stream[q4].slices > 1 ? '/' + stream[q4].slice : '') +
                  ' از «' + stream[q4].partName + '»');
      }
    }
    // روخوانی: هر بخش را با متنِ قطعه‌هایی که به آن نسبت داده می‌سنجیم
    var srcAll = stream.map(function (c) { return c.text; }).join(' ');
    var vbWorst = 0, vbSec = '';
    for (var vb = 0; vb < ep.sections.length; vb++) {
      var rr2 = verbatimRatio_(ep.sections[vb].narration, srcAll);
      if (rr2 > vbWorst) { vbWorst = rr2; vbSec = String(ep.sections[vb].heading || ''); }
    }
    if (vbWorst >= 0.35) {
      logLine_('درس‌نامه ' + epNum + ': نشانهٔ روخوانی — ' + Math.round(vbWorst * 100) +
               '٪ همپوشانیِ کلمه‌به‌کلمه در بخش «' + vbSec + '».');
      try {
        logSelfFinding_(hub, {
          priority: 'جدی', category: 'پرامپت درس‌نامه', key: 'sp-verbatim',
          title: 'متن درس‌نامه روخوانیِ قطعه‌ها بود، نه بازگوییِ آموزشی',
          detail: 'قسمت ' + epNum + ': بخش «' + vbSec + '» ' + Math.round(vbWorst * 100) +
                  '٪ با متنِ خامِ قطعه‌ها همپوشانیِ کلمه‌به‌کلمه دارد.',
          instruction: 'متنِ قطعه‌ها را کلمه‌به‌کلمه پشت سر هم نچین. همان مطالب را با ' +
                       'ساختار و زبانِ خودت به‌شکلِ یک روایتِ آموزشیِ پیوسته بگو؛ نقل‌قولِ ' +
                       'مستقیم فقط برای جمله‌های کلیدی و کوتاه.',
          owner: 'موتور', episode: epNum
        });
      } catch (eVb) {}
    }

    var narrChars = specialNarration_(ep).length;
    var wantChars = Math.round(specialTargetMin_() * 150 * 6);
    var thin = narrChars < wantChars * (CFG.SPECIAL_MIN_OUTPUT_RATIO || 0.4);

    // تا کدام نقطهٔ جریان اجازهٔ پیشرفت داریم؟
    // فقط تا آخرین قطعهٔ «پیوسته‌ای» که واقعاً روایت شد. هیچ استثنایی — نه حتی
    // «نود درصدش که گفته شد» — چون همان ده درصد، درسِ کاملی است که اگر مکان‌نما
    // از رویش رد شود دیگر هرگز برنمی‌گردد. اگر مدل قطعه‌ای را جا بیندازد، همان
    // قطعه در قسمت بعد دوباره داده می‌شود و ایرادش هم ثبت می‌شود.
    // (کوتاه‌بودنِ متن جداگانه با یافتهٔ «sp-thin-episode» گزارش می‌شود؛ این‌جا
    //  دخالتش نمی‌دهیم، وگرنه یک متنِ کوتاهِ درست هم مکان‌نما را قفل می‌کرد.)
    var upTo = (contig >= 0) ? contig : -1;
    if (upTo >= 0 && upTo < stream.length - 1 && gaps.length) {
      logLine_('درس‌نامه ' + epNum + ': ' + gaps.length + ' قطعه از ' + stream.length +
               ' در متن نیامد؛ مکان‌نما فقط تا قطعهٔ ' + (upTo + 1) + ' جلو رفت تا ' +
               'قطعه‌های نگفته در قسمت بعد بیایند.');
      try {
        logSelfFinding_(hub, {
          priority: 'متوسط', category: 'پرامپت درس‌نامه', key: 'sp-coverage-gap',
          title: 'قسمت درس‌نامه بعضی قطعه‌ها را جا انداخت',
          detail: 'قسمت ' + epNum + ': ' + narrCount + ' از ' + stream.length +
                  ' قطعه در chunkNos آمد. جا افتاده: ' + gaps.slice(0, 6).join(' ، ') +
                  '. مکان‌نما فقط تا قطعهٔ ' + (upTo + 1) + ' جلو رفت.',
          instruction: 'همهٔ قطعه‌هایی که به تو داده می‌شود باید در بخش‌ها پوشش داده شوند و ' +
                       'شمارهٔ هرکدام در chunkNos همان بخش بیاید؛ هیچ قطعه‌ای را رد نکن.',
          owner: 'موتور', episode: epNum
        });
      } catch (eGp) {}
    }

    var stuckKey = String(partRec.vals[SP.FILE - 1]);
    var stuckRaw = String(props_().getProperty(PK.SP_STUCK) || '');
    var stuckN = (stuckRaw.indexOf(stuckKey + ':') === 0)
                   ? (parseInt(stuckRaw.split(':')[1], 10) || 0) : 0;
    if (upTo < 0) {
      stuckN++;
      if (stuckN >= (CFG.SPECIAL_STUCK_LIMIT || 2)) {
        // دو بار پیاپی هیچ پیشرفتی نشد. اگر باز هم جلو نرویم، این مجموعه تا
        // ابد در جا می‌زند. پس کمینه جلو می‌رویم و ایراد را «جدی» ثبت می‌کنیم.
        upTo = Math.min(CFG.SPECIAL_MIN_CHUNKS, stream.length) - 1;
        stuckN = 0;
        logLine_('درس‌نامه: دو قسمتِ پیاپی بی‌پیشرفت؛ به‌ناچار تا قطعهٔ ' +
                 (upTo + 1) + ' جلو رفت.');
      }
      props_().setProperty(PK.SP_STUCK, stuckKey + ':' + stuckN);
      try {
        logSelfFinding_(hub, {
          priority: 'جدی', category: 'پرامپت درس‌نامه', key: 'sp-no-coverage',
          title: 'قسمت درس‌نامه هیچ قطعه‌ای را پوشش نداد',
          detail: 'قسمت ' + epNum + ': ' + stream.length + ' قطعه داده شد، ' +
                  narrChars + ' نویسه متن برگشت، و هیچ شماره‌ای در chunkNos نیامد. ' +
                  'مکان‌نما جلو نرفت تا محتوا از دست نرود.',
          instruction: 'در هر بخش، شمارهٔ قطعه‌هایی را که از آن‌ها روایت کردی حتماً در ' +
                       'chunkNos بنویس، و همهٔ قطعه‌هایی را که به تو داده می‌شود پوشش بده.',
          owner: 'موتور', episode: epNum
        });
      } catch (eNc) {}
    }
    if (upTo >= 0) {
      if (stuckN) props_().setProperty(PK.SP_STUCK, '');
      if (thin) {
        try {
          logSelfFinding_(hub, {
            priority: 'جدی', category: 'پرامپت درس‌نامه', key: 'sp-thin-episode',
            title: 'متن درس‌نامه خیلی کوتاه‌تر از هدف بود',
            detail: 'قسمت ' + epNum + ': ' + narrChars + ' نویسه در برابر هدفِ حدود ' +
                    wantChars + '. مکان‌نما فقط تا قطعهٔ ' + (upTo + 1) + ' از ' +
                    stream.length + ' جلو رفت.',
            instruction: 'متن هر قسمت باید حدود ' + Math.round(specialTargetMin_() * 150) +
                         ' واژه باشد و همهٔ قطعه‌های داده‌شده را پوشش بدهد؛ کوتاه ننویس.',
            owner: 'موتور', episode: epNum
          });
        } catch (eTh) {}
      }
    }

    // مکان‌نمای هر قسمتِ پوشش‌داده‌شده جداگانه نوشته می‌شود
    var advNote = [];
    for (var cw = 0; cw < covers.length; cw++) {
      var last = null;
      for (var sx = 0; sx <= upTo && sx < stream.length; sx++) {
        if (stream[sx].cover === cw) last = stream[sx];
      }
      if (!last) continue;
      var pr2 = covers[cw].rec;
      pr2.vals[SP.DONE_TO - 1] = spCursorOf_(last.no, last.slice || 1, last.slices || 1);
      pr2.vals[SP.EPISODES - 1] = (String(pr2.vals[SP.EPISODES - 1] || '') + ' ' + epNum).trim();
      pr2.vals[SP.UPDATED - 1] = nowStr_();
      try { parts.sheet.getRange(pr2.row, 1, 1, SPART_HEADERS.length).setValues([pr2.vals]); }
      catch (e3) {}
      advNote.push('قسمت ' + pr2.vals[SP.SEQ - 1] + ' تا قطعهٔ ' + last.no);
    }

    rec.vals[SC.STATUS - 1] = SST.ACTIVE;
    var lastCov = coverInfo[coverInfo.length - 1];
    rec.vals[SC.CUR_PART - 1] = lastCov ? lastCov.partSeq : ctx.partSeq;
    rec.vals[SC.CUR_CHUNK - 1] = advNote.length
      ? Number(String(advNote[advNote.length - 1]).replace(/^.*قطعهٔ /, '')) || seg.toNo
      : 0;
    rec.vals[SC.EPISODES - 1] = (String(rec.vals[SC.EPISODES - 1] || '') + ' ' + epNum).trim();
    rec.vals[SC.LAST_EP_AT - 1] = nowStr_();
    rec.vals[SC.UPDATED - 1] = nowStr_();
    rec.vals[SC.STORY - 1] = (String(rec.vals[SC.STORY - 1] || '') + '\n' +
      'قسمت ' + epNum + ' (' + ctx.partName + '، قطعهٔ ' + seg.fromNo + '–' + seg.toNo + '): ' +
      String(ep.summary || '').replace(/\n+/g, ' ').slice(0, 600)).trim().slice(-8000);
    try { reg.sheet.getRange(rec.row, 1, 1, SERIES_HEADERS.length).setValues([rec.vals]); } catch (e4) {}
    props_().setProperty(PK.SP_SERIES, seriesKey);
    props_().setProperty(PK.SP_EP_NUM, String(epNum));

    // ── پیش از صدا: پنجرهٔ غنی‌سازیِ اینترنتی ──
    var manualNow = enrichForcePending_();
    var wantEnrich = enrichWorthWaiting_(CFG.SPECIAL_HOUR || 8);
    var pendSp = { epNum: epNum, folderId: folder.getId(), row: sp.getLastRow(),
                   chunkIdx: 0, partNo: 1, files: [], phase: 'speak' };
    if (wantEnrich) {
      pendSp.phase = 'enrich';
      pendSp.enrichAt = nowStr_();
      if (!manualNow) pendSp.notBeforeHour = clampHour_(CFG.SPECIAL_HOUR, 8);
      writeEnrichRequest_(ENRICH_SHOW_SPECIAL, epNum, ep, ctx.chunks,
                          { seriesName: seriesName, partName: ctx.partName,
                            level: String(rec.vals[SC.LEVEL - 1] || ''),
                            topic: String(rec.vals[SC.TOPIC - 1] || ''),
                            about: String(rec.vals[SC.ABOUT - 1] || ''),
                            fromChunk: seg.fromNo, toChunk: seg.toNo });
    }
    props_().setProperty(PK.SP_PENDING, JSON.stringify(pendSp));
    scheduleSpecialContinue_(wantEnrich ? 5 * 60 * 1000 : 45 * 1000);
    logLine_('درس‌نامه ' + epNum + ' نوشته شد؛ ' +
             (wantEnrich ? 'منتظرِ غنی‌سازیِ اینترنتی.' : 'صداگذاری در اجرای بعدی شروع می‌شود.'));
    return { ok: true, episode: epNum, series: seriesName, title: ep.title, pending: true };
  } catch (err) {
    logLine_('خطای درس‌نامه: ' + err.message);
    try { lock.releaseLock(); } catch (e) {}
    throw err;
  }
}

/** نشانِ درس‌نامه — عمداً در ستونِ جدا، تا با نشانِ برنامهٔ متنوع قاطی نشود. */
function markSpecialUsed_(hub, items, epNum) {
  if (!items || !items.length) return 0;
  var byCat = Object.create(null), n = 0;
  for (var i = 0; i < items.length; i++) {
    (byCat[items[i].cat] = byCat[items[i].cat] || []).push(items[i]);
  }
  var when = nowStr_();
  for (var cat in byCat) {
    if (!Object.prototype.hasOwnProperty.call(byCat, cat)) continue;
    var sh = hub.getSheetByName(cat);
    if (!sh) continue;
    var group = byCat[cat];
    var ids = {};
    for (var g = 0; g < group.length; g++) ids[String(group[g].id)] = true;
    var last = sh.getLastRow();
    if (last < 2) continue;
    var idCol = sh.getRange(2, COL.ID, last - 1, 1).getValues();
    var cur = sh.getRange(2, COL.SP_EP, last - 1, 2).getValues();
    var dirty = false;
    for (var r = 0; r < idCol.length; r++) {
      if (!ids[String(idCol[r][0] || '')]) continue;
      var prev = String(cur[r][0] || '');
      if (prev.split(/[,\s]+/).indexOf(String(epNum)) !== -1) continue;
      cur[r][0] = prev ? prev + ', ' + epNum : String(epNum);
      cur[r][1] = when;
      dirty = true; n++;
    }
    if (dirty) sh.getRange(2, COL.SP_EP, last - 1, 2).setValues(cur);
  }
  return n;
}

/**
 * ساختِ یک هشتگِ سالمِ تلگرام.
 * تلگرام هشتگ را سرِ اولین نویسهٔ غیرحرفی می‌بُرد. متنِ ما پر است از چیزهایی
 * که دقیقاً همین کار را می‌کنند و به چشم نمی‌آیند: نیم‌فاصله (U+200C) در
 * «درس‌نامه»، کسرهٔ اضافه (U+0650) در «تحلیلِ نمودار»، و همزهٔ روی «ه» در
 * «دورهٔ گن». پیش از این اصلاح، «#درس‌نامه» در تلگرام «#درس» می‌شد.
 */
function tgTag_(s) {
  var t = String(s === null || s === undefined ? '' : s).trim();
  t = t.replace(/[\u200c\u200f\u200e]/g, '_');        // نیم‌فاصله و نشانه‌های جهت
  t = t.replace(/[\u064B-\u065F\u0670]/g, '');        // اعراب و کسرهٔ اضافه
  t = t.replace(/\u0654/g, '');                        // همزهٔ روی حرف (دورهٔ)
  t = t.replace(/[#\s]+/g, '_');
  t = t.replace(/[^A-Za-z0-9_\u0621-\u064A\u066E-\u06D3\u06F0-\u06F9]/g, '');
  t = t.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (t.length > 60) t = t.slice(0, 60).replace(/_+$/, '');
  if (!t || t.length < 2) return '';
  if (/^[0-9\u06F0-\u06F9_]+$/.test(t)) return '';     // فقط رقم، هشتگ نیست
  return '#' + t;
}

function pushTag_(out, s, cap) {
  var t = tgTag_(s);
  if (!t) return;
  if (out.indexOf(t) !== -1) return;
  if (cap && out.length >= cap) return;
  out.push(t);
}

/** هشتگ‌های دقیق برای ردگیری در تلگرام. */
function specialTags_(ep, seriesName, partSeq, epNum) {
  var out = [];
  pushTag_(out, CFG.SPECIAL_SHOW_NAME);
  pushTag_(out, 'پادکست تخصصی');
  pushTag_(out, seriesName);
  if (partSeq) pushTag_(out, 'درس ' + partSeq);
  if (epNum) pushTag_(out, 'قسمت ' + epNum);
  var tags = (ep && ep.tags) || [];
  for (var i = 0; i < tags.length; i++) pushTag_(out, tags[i], 14);
  return out;
}

function varietyTags_(ep, cat, epNum) {
  var out = [];
  pushTag_(out, CFG.SHOW_NAME);
  pushTag_(out, cat);
  if (epNum) pushTag_(out, 'قسمت ' + epNum);
  var tags = (ep && ep.tags) || [];
  for (var i = 0; i < tags.length; i++) pushTag_(out, tags[i], 12);
  return out;
}

// ------------------------------------------------------- صداگذاری درس‌نامه

function produceSpecialContinue() { return renderSpecialAudioStep_(); }

function clearSpecialTriggers_() {
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'produceSpecialContinue') ScriptApp.deleteTrigger(ts[i]);
  }
}

function clearSpecialContinuation_() {
  clearSpecialTriggers_();
  try { props_().deleteProperty(PK.SP_CONT_DUE); } catch (e) {}
}

/** توضیحِ ترتیب و کارِ بندِ catch را در scheduleContinue_ بخوانید. */
function scheduleSpecialContinue_(ms) {
  var dueS = new Date().getTime() + ms;
  try { props_().setProperty(PK.SP_CONT_DUE, String(dueS)); } catch (e) {}
  try {
    clearSpecialTriggers_();
    ScriptApp.newTrigger('produceSpecialContinue').timeBased().after(ms).create();
  } catch (eT) {
    try { props_().setProperty(PK.SP_CONT_DUE, String(new Date().getTime() - 60 * 60 * 1000)); } catch (e2) {}
    throw eT;
  }
}

/** همان نگهبانِ برنامهٔ متنوع، برای درس‌نامه. توضیحش را آن‌جا بخوانید:
 *  ملاک «نوبتِ ادامه گذشته» است، نه «تریگری در فهرست هست». */
function resumeStalledSpecial_() {
  if (!props_().getProperty(PK.SP_PENDING)) return false;
  var hasTrigSp = false;
  try {
    var tsSp = ScriptApp.getProjectTriggers();
    for (var i = 0; i < tsSp.length; i++) {
      if (tsSp[i].getHandlerFunction() === 'produceSpecialContinue') { hasTrigSp = true; break; }
    }
  } catch (eT) { hasTrigSp = true; }
  var dueSp = Number(props_().getProperty(PK.SP_CONT_DUE) || 0);
  var nowSp = new Date().getTime();
  if (hasTrigSp && isFinite(dueSp) && dueSp > 0 && dueSp < nowSp + 12 * 60 * 60 * 1000 &&
      nowSp < dueSp + 12 * 60 * 1000) return false;
  scheduleSpecialContinue_(60 * 1000);
  logLine_('درس‌نامهٔ نیمه‌تمام پیدا شد و نوبتِ ادامه‌اش گذشته بود؛ صداگذاری دوباره زمان‌بندی شد.');
  return true;
}

/** بخش‌بندیِ درس‌نامه با لحن. مرورِ قسمت قبل، لحنِ خودش را دارد. */
function specialSegments_(ep, catHint) {
  var base = 'آرام، روشن و معلم‌وار. شمرده و با اطمینان، مثل مدرسی که می‌خواهد مطلب جا بیفتد. ' +
             'روی تعریف‌ها و اصطلاح‌ها تأکید کن و پیش از هر مفهوم تازه یک مکث کوتاه بگذار.';
  var segs = [];
  if (ep.hook) segs.push({ text: ep.hook, kind: 'hook', tone: '',
    style: base + ' این آغاز برنامه است: گرم و دعوت‌کننده.' });
  if (ep.recap) segs.push({ text: ep.recap, kind: 'body', tone: 'مرور',
    style: base + ' این مرورِ قسمت‌های قبل است: سریع‌تر و سبک‌تر از بدنهٔ درس.' });
  // «هدف و انتظارِ دوره» باید شنیده شود، نه فقط در سند نوشته شود — سه پرسشی
  // که کاربر صریح خواسته بود بخشی از خودِ برنامه باشند.
  var gt = goalSpeech_(ep);
  if (gt) segs.push({ text: gt, kind: 'goal', tone: '',
    style: base + ' این بخشِ «چرا این درس» است: شمرده، با تأکید، و کمی آهسته‌تر.' });
  for (var i = 0; i < (ep.sections || []).length; i++) {
    var s = ep.sections[i];
    var t = (s.heading ? s.heading + '. ' : '') + (s.narration || '');
    if (!t.trim()) continue;
    var regS = voiceRegister_(catHint, s.tone, t);
    segs.push({ text: t, kind: 'body', tone: String(s.tone || ''), secIndex: i,
                heading: String(s.heading || ''),
                style: base + (s.tone ? ' ' + s.tone : '') + ' ' + styleForRegister_(regS) });
  }
  if (ep.outro) segs.push({ text: ep.outro, kind: 'outro', tone: '',
    style: base + ' این پایانِ برنامه است: جمع‌بندی‌کننده و آرام.' });
  return segs;
}

/**
 * تکه‌های صوتیِ درس‌نامه — با نقش‌گزینی.
 * تا دیروز همهٔ درس‌نامه با یک صدای ثابت خوانده می‌شد و همان شد «تخصصی = زن».
 * حالا مثل برنامهٔ متنوع، هر قسمت گویندهٔ اصلیِ خودش را دارد و بخش‌ها بر پایهٔ
 * سرشتشان بین گویندگان تقسیم می‌شوند.
 */
function buildSpecialChunks_(ep, epNum, catHint) {
  var segs = specialSegments_(ep, catHint);
  if (CFG.TTS_CAST_ENABLED !== false) {
    try {
      var cast = ensureCast_(ep, ENRICH_SHOW_SPECIAL, epNum, catHint || '');
      assignSegmentVoices_(segs, cast, catHint || '');
      ep.__cast.note = castNote_(cast, segs);
      logLine_('نقش‌گزینیِ درس‌نامه: ' + ep.__cast.note);
    } catch (eC) { logLine_('نقش‌گزینیِ درس‌نامه انجام نشد: ' + eC.message); }
  }
  var out = [], bounds = [];
  for (var i = 0; i < segs.length; i++) {
    // همان قاعدهٔ برنامهٔ متنوع: متنِ صوتیِ اعراب‌دار + پاک‌سازی از شناسه و لینک
    var plainS = speakSanitize_(String(segs[i].text || ''));
    var spoken = speakSanitize_(speakTextOf_(ep, i, plainS));
    var pieces = splitForTts_(applyPron_(spoken));
    // مرزِ واقعیِ هر قطعه — همان چیزی که «از همه جا از همه رنگ» هم دارد.
    // بی این، موسیقیِ میانه در درس‌نامه اصلاً پخش نمی‌شد.
    // وایب و گویندهٔ هر بخش هم با مرز می‌روند. بی این‌ها، انتخاب‌کنندهٔ
    // موسیقی فقط عنوانِ بخش را می‌دید — و «وایب» دقیقاً همان چیزی است که
    // موسیقی باید با آن بخوانَد، نه عنوان.
    // secIndex پلِ میانِ دو فضای شماره‌گذاری است: شمارهٔ بخش در ep.sections
    // و جای واقعیِ آن در فهرستِ تکه‌ها. تا ۵٫۶۴ این پل نبود و افکت با
    // شمردنِ تکه‌ها جا داده می‌شد — یعنی «بخشِ ۳» می‌شد «تکهٔ ۳»، که با
    // وجودِ hook و شکستنِ بخش‌های بلند، جای کاملاً دیگری است.
    bounds.push({ at: out.length, kind: String(segs[i].kind || 'body'),
                  secIndex: (segs[i].secIndex === undefined ? -1 : Number(segs[i].secIndex)),
                  heading: String(segs[i].heading || ''),
                  tone: String(segs[i].tone || ''),
                  voice: String(segs[i].voice || '') });
    for (var j = 0; j < pieces.length; j++) {
      out.push({ text: pieces[j], style: segs[i].style,
                 voice: segs[i].voice || CFG.TTS_VOICE_SPECIAL });
    }
  }
  // موسیقی برای درس‌نامه هم، با همان سازوکار. بخشِ ۲۳ پایین‌تر است، پس
  // فراخوانش در try/catch — بارگذارِ جزئیِ آزمون‌ها نباید تولید را زمین بزند.
  try {
    var heads = ((ep && ep.sections) || []).map(function (x) { return String(x.heading || ''); })
                  .filter(Boolean).slice(0, 8).join(' · ');
    var mw = musicWrap_(out, null, {
      // «special» یعنی sfxAllow_ هر افکتی را رد می‌کند — سرشتِ درس‌نامه
      // شمرده و بی‌جلوه است و این خواستهٔ صریحِ صاحبِ برنامه بود.
      show: 'special', episode: epNum, sections: (ep && ep.sections) || [], bounds: bounds,
      // بی این trim، وقتی نامِ مجموعه خالی بود دسته «درس‌نامه — » می‌شد؛ همان
      // خطِ ناقص در _MUSIC-WISH.json نشسته بود.
      category: ('درس‌نامه — ' + String((ep && ep.series) || '')).replace(/\s*—\s*$/, ''),
      mood: 'آموزشی، شمرده',
      title: String((ep && ep.title) || ''), headings: heads,
      cast: (ep && ep.__cast && ep.__cast.note) ? String(ep.__cast.note) : '',
      plan: (ep && ep.music) || {} });
    if (mw && mw.chunks && mw.chunks.length) {
      if (mw.picks && mw.picks.length) {
        try { musicRecordOnce_(null, mw, 'special#' + epNum, 'درس‌نامه ' + epNum,
                               CFG.SPECIAL_SHOW_NAME); } catch (eU) {}
      }
      return mw.chunks;
    }
  } catch (eM) { logLine_('موسیقیِ درس‌نامه افزوده نشد: ' + eM.message); }
  return out;
}

/**
 * اگر متن از سقفِ «یک فایل» بلندتر شد، یک‌بار از مدل می‌خواهیم فشرده‌اش کند.
 *
 * ══ چرا کد، نه فقط پرامپت ══
 * سقف تا امروز فقط یک جملهٔ دستوری در پرامپت بود («از N نویسه بیشتر نشود»).
 * جمله را می‌شود نادیده گرفت و مدل هر روز نادیده می‌گرفت. خواستهٔ صاحبِ
 * برنامه «یک فایل» است، نه «به مدل گفتیم یک فایل». پس سنجه در کد است.
 *
 * ══ مرزی که رد نمی‌شود ══
 * نسخهٔ فشرده فقط وقتی پذیرفته می‌شود که *همان تعدادِ بخش* را داشته باشد و
 * هیچ بخشی خالی نباشد. فشرده‌کردن یعنی کوتاه‌تر گفتن، نه انداختنِ یک درس —
 * و یک درسِ افتاده دیگر هرگز برنمی‌گردد، چون مکان‌نما از رویش رد می‌شود.
 * اگر شرط برقرار نبود، متنِ اصلی می‌ماند و قسمت دو فایل می‌شود؛ دو فایل
 * بدتر از یک درسِ گم‌شده نیست.
 */
function specialCondense_(ep, capChars, epNum) {
  var have = specialNarration_(ep).length;
  if (!(capChars > 0) || have <= capChars) return { ep: ep, over: 0, tried: false };

  var need = Math.round(capChars * 0.93);        // کمی زیرِ سقف، نه دقیقاً رویش
  logLine_('درس‌نامه ' + epNum + ': متن ' + have + ' نویسه است و سقفِ یک فایل ' +
           capChars + '؛ یک‌بار فشرده‌سازی خواسته شد.');

  var L = [
    'این متنِ یک قسمتِ درس‌نامهٔ فارسی است و ' + have + ' نویسه دارد.',
    'باید به حدود ' + need + ' نویسه برسد — یعنی حدود ' +
      Math.round((1 - need / have) * 100) + ' درصد کوتاه‌تر.',
    '',
    'قواعدِ سختِ فشرده‌سازی:',
    '۱) هیچ بخشی را حذف نکن. تعدادِ بخش‌ها و ترتیب و عنوان‌هایشان باید دقیقاً همان بماند.',
    '۲) هیچ مفهوم، اصطلاح، نام یا عددی را نینداز. آنچه کوتاه می‌شود، «طرزِ گفتن» است:',
    '   مثال‌های تکراری، بازگویی، مقدمه‌چینی، و جمله‌های توضیحیِ اضافه.',
    '۳) چیزِ تازه‌ای اضافه نکن.',
    '۴) همان قواعدِ نگارشی: بی رقم، بی لاتین، بی مارک‌داون، جمله‌های کوتاه.',
    '',
    'متنِ فعلی، به‌شکلِ JSON:',
    JSON.stringify({ hook: ep.hook || '', recap: ep.recap || '', outro: ep.outro || '',
                     sections: (ep.sections || []).map(function (x) {
                       return { heading: x.heading || '', narration: x.narration || '' }; }) })
  ];

  var out = null;
  try { out = geminiText_(L.join('\n'), SPECIAL_SCHEMA, 40960); } catch (e) {
    logLine_('فشرده‌سازیِ درس‌نامه انجام نشد: ' + e.message);
    return { ep: ep, over: have - capChars, tried: true };
  }

  var okShape = !!(out && out.sections &&
                   out.sections.length === (ep.sections || []).length);
  if (okShape) {
    for (var i = 0; i < out.sections.length; i++) {
      if (!String((out.sections[i] || {}).narration || '').trim()) { okShape = false; break; }
    }
  }
  if (!okShape) {
    logLine_('نسخهٔ فشرده بخشی کم داشت؛ متنِ اصلی نگه داشته شد (قسمت دو فایل می‌شود).');
    return { ep: ep, over: have - capChars, tried: true };
  }

  // چیزهایی که فشرده‌سازی به آن‌ها کاری ندارد از متنِ اصلی برداشته می‌شوند
  var merged = {};
  for (var k in ep) if (Object.prototype.hasOwnProperty.call(ep, k)) merged[k] = ep[k];
  merged.hook = out.hook || ep.hook;
  merged.recap = out.recap || ep.recap;
  merged.outro = out.outro || ep.outro;
  merged.sections = ep.sections.map(function (sec, i) {
    var n = {};
    for (var k2 in sec) if (Object.prototype.hasOwnProperty.call(sec, k2)) n[k2] = sec[k2];
    n.narration = out.sections[i].narration;
    return n;
  });

  var now = specialNarration_(merged).length;
  if (now >= have) {
    logLine_('نسخهٔ فشرده کوتاه‌تر نشد؛ متنِ اصلی نگه داشته شد.');
    return { ep: ep, over: have - capChars, tried: true };
  }
  logLine_('درس‌نامه ' + epNum + ': متن از ' + have + ' به ' + now + ' نویسه فشرده شد' +
           (now <= capChars ? ' — در یک فایل جا می‌شود.' : ' — هنوز از سقف بالاتر است.'));
  return { ep: merged, over: Math.max(0, now - capChars), tried: true };
}

/** متنِ گفتاریِ کلِ یک قسمتِ درس‌نامه — برای تشخیصِ سرشتِ کلی. */
function specialNarrationOf_(ep) {
  var L = [];
  for (var i = 0; i < ((ep && ep.sections) || []).length; i++) {
    L.push(String(ep.sections[i].narration || ''));
  }
  return L.join(' ').slice(0, 4000);
}

/** سه پرسشِ هدفِ دوره، به‌شکلِ گفتاری. */
function goalSpeech_(ep) {
  var g = (ep && ep.goal) || {};
  var L = [];
  if (g.problem) L.push('پیش از هر چیز روشن کنیم این درس به چه دردی می‌خورد. ' + g.problem);
  if (g.behavior) L.push('انتظارِ مدرس این است که بعد از این درس، این کار را متفاوت انجام بدهید. ' +
                         g.behavior);
  if (g.message) L.push('و اگر بخواهیم همهٔ این بخش را در یک جمله بگوییم: ' + g.message);
  return L.join(' ');
}

function specialNarration_(ep) {
  var L = [];
  if (ep.hook) L.push(ep.hook);
  if (ep.recap) L.push(ep.recap);
  var g2 = goalSpeech_(ep);
  if (g2) L.push(g2);
  for (var i = 0; i < (ep.sections || []).length; i++) {
    var s = ep.sections[i];
    if (s.heading) L.push(s.heading);
    if (s.narration) L.push(s.narration);
  }
  if (ep.outro) L.push(ep.outro);
  return L.join('\n\n');
}

/** نوشتن یا بازنویسیِ پروندهٔ وضعیتِ درس‌نامه (مرحلهٔ غنی‌سازی بازنویسی‌اش می‌کند). */
function writeSpecialJson_(folder, meta) {
  var body = JSON.stringify(meta);
  var it = folder.getFilesByName('_special.json');
  if (it.hasNext()) { var f = it.next(); f.setContent(body); return f; }
  return folder.createFile(Utilities.newBlob(body, 'application/json', '_special.json'));
}

function renderSpecialAudioStep_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    try { scheduleSpecialContinue_(2 * 60 * 1000); } catch (eL) {}
    return { ok: false, reason: 'locked', pending: true };
  }
  var deadline = new Date().getTime() + CFG.MAX_RUNTIME_MS;
  try {
    var raw = props_().getProperty(PK.SP_PENDING);
    if (!raw) return;
    var st = JSON.parse(raw);
    var folder = DriveApp.getFolderById(st.folderId);
    var it = folder.getFilesByName('_special.json');
    if (!it.hasNext()) { props_().deleteProperty(PK.SP_PENDING); throw new Error('فایل وضعیت درس‌نامه پیدا نشد.'); }
    var meta = JSON.parse(it.next().getBlob().getDataAsString());
    var ep = meta.ep, epNum = meta.epNum;

    var baseName = CFG.SPECIAL_SHOW_NAME + ' — ' + String(meta.seriesName).slice(0, 40) +
                   ' — قسمت ' + ('000' + epNum).slice(-3) + ' — ' + String(ep.title || '').slice(0, 40);

    // ── مرحلهٔ «انتظارِ غنی‌سازی» ──
    if (st.phase === 'enrich') {
      var g = enrichGate_(st, ENRICH_SHOW_SPECIAL, ep, epNum);
      if (!g.done) {
        scheduleSpecialContinue_(g.waitMs);
        return { ok: true, episode: epNum, pending: true, waitingEnrich: true };
      }
      meta.ep = ep;
      try { writeSpecialJson_(folder, meta); }
      catch (eW) { logLine_('ذخیرهٔ متنِ غنی‌شدهٔ درس‌نامه ناموفق: ' + eW.message); }
      st.phase = 'speak';
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
      scheduleSpecialContinue_(45 * 1000);
      return { ok: true, episode: epNum, pending: true, enriched: !!g.applied };
    }

    // ── مرحلهٔ «متنِ صوتی» — اعراب‌گذاریِ کامل پیش از صدا (توضیح در speakStep_) ──
    if (st.phase === 'speak') {
      var segsSp = specialSegments_(ep, meta.seriesCat || meta.cat || '');
      var rsp = speakStep_(ep, segsSp, deadline, function () {
        meta.ep = ep; writeSpecialJson_(folder, meta);
      });
      if (!rsp.done) {
        scheduleSpecialContinue_(45 * 1000);
        logLine_('درس‌نامه ' + epNum + ': اعراب‌گذاریِ متنِ صوتی ادامه دارد (' +
                 speakStats_(ep, segsSp) + ').');
        return { ok: true, episode: epNum, pending: true, speaking: true };
      }
      st.speakRounds = (Number(st.speakRounds) || 0) + 1;
      if (rsp.failed && st.speakRounds < 2) {
        props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
        scheduleSpecialContinue_(60 * 1000);
        return { ok: true, episode: epNum, pending: true, speaking: true };
      }
      writeSpeakFile_(folder, baseName, ep, segsSp);
      meta.ep = ep;
      try { writeSpecialJson_(folder, meta); } catch (eWs) {}
      st.phase = 'audio';
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
      scheduleSpecialContinue_(45 * 1000);
      logLine_('درس‌نامه ' + epNum + ': متنِ صوتی آماده شد — ' + speakStats_(ep, segsSp) + '.');
      return { ok: true, episode: epNum, pending: true, spoke: true };
    }

    // ── دروازهٔ «نه پیش از ساعتِ مقرر» ──
    if (st.notBeforeHour) {
      var nowH = nowHour_();
      if (isFinite(nowH) && nowH < Number(st.notBeforeHour)) {
        var waitM = Number(st.notBeforeHour) * 60 - nowMinuteOfDay_();
        scheduleSpecialContinue_(Math.max(60000, waitM * 60000));
        logLine_('درس‌نامه ' + epNum + ' آماده است؛ صداگذاری در ساعتِ ' +
                 st.notBeforeHour + ' شروع می‌شود.');
        return { ok: true, episode: epNum, pending: true, waitingClock: true };
      }
    }

    if (!st.phase || st.phase === 'audio') {
      if (st.chunkIdx === 0 && (!st.files || !st.files.length)) {
        try {
          var stale = folder.getFiles(), removed = 0;
          while (stale.hasNext()) {
            var sf = stale.next();
            // فقط تکه‌های صوتیِ خودِ همین قسمت. بی این شرط، هر فایلِ wav دیگری
            // که در این پوشه بود — مثلاً فایلی که «سامان‌دهیِ پوشه‌ها» تازه به
            // این‌جا آورده — هم پاک می‌شد؛ یعنی از دست رفتنِ صدای کاربر.
            if (/\.wav$/i.test(sf.getName()) &&
                sf.getName().indexOf(baseName) === 0) { sf.setTrashed(true); removed++; }
          }
          if (removed) logLine_('درس‌نامه: ' + removed + ' فایل صوتیِ بی‌صاحب پاک شد.');
        } catch (eC) {}
      }
      var chunks = buildSpecialChunks_(ep, epNum, meta.cat || meta.seriesCat || '');
      var baseFiles = st.files.slice();
      var save = function (files, nextChunk, nextPart) {
        st.files = baseFiles.concat(files); st.chunkIdx = nextChunk; st.partNo = nextPart;
        props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
      };
      var res = synthesizeStep_(chunks, baseName, folder, st.chunkIdx, st.partNo, deadline, save);
      st.files = baseFiles.concat(res.files);
      st.chunkIdx = res.chunkIdx; st.partNo = res.partNo;
      if (!res.done) {
        props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
        scheduleSpecialContinue_(60 * 1000);
        logLine_('درس‌نامه ' + epNum + ': ' + st.chunkIdx + ' از ' + chunks.length + ' تکهٔ صوتی آماده شد.');
        return { ok: true, episode: epNum, pending: true };
      }
      st.phase = (CFG.MERGE_AUDIO && st.files.length > 1) ? 'merge' : 'deliver';
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
      scheduleSpecialContinue_(45 * 1000);
      return { ok: true, episode: epNum, pending: true };
    }

    if (st.phase === 'merge') {
      // همان دلیلِ برنامهٔ متنوع: ادغام نابخش‌پذیر است و نیمه‌کاره‌اش قابلِ
      // ادامه نیست، پس با وقتِ کم اصلاً شروع نمی‌شود.
      // شمارشِ «تلاش»، نه «موکول‌کردن»: کشته‌شدن در میانهٔ ادغام قابلِ گرفتن نیست.
      var mgSp = mergeStep_(st, baseName, folder, deadline, PK.SP_PENDING,
                            scheduleSpecialContinue_, 'درس‌نامه');
      if (!mgSp.done) {
        return { ok: true, episode: epNum, pending: true,
                 mergeLater: !mgSp.skipped, mergeSkipped: !!mgSp.skipped };
      }
      st.phase = 'deliver';
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
      scheduleSpecialContinue_(30 * 1000);
      return { ok: true, episode: epNum, pending: true };
    }

    // ---- ارسال ----
    var hub = getHub_();
    var mgListSp = mergedList_(st.merged);
    // همان نکتهٔ برنامهٔ متنوع: گروهِ تک‌عضوی خودِ بخش است، پس دوباره در
    // فهرست نمی‌آید.
    var wholeIdsSp = {};
    for (var wj = 0; wj < mgListSp.length; wj++) {
      if (mgListSp[wj] && mgListSp[wj].id) wholeIdsSp[mgListSp[wj].id] = 1;
    }
    var totalBytes = 0, audioLinks = [];
    for (var f = 0; f < st.files.length; f++) {
      totalBytes += st.files[f].bytes;
      if (st.files[f].id && wholeIdsSp[st.files[f].id]) continue;
      audioLinks.push({ name: st.files[f].name, url: st.files[f].url });
    }
    var dur = mmss_(secondsOf_(totalBytes));
    for (var mj = mgListSp.length - 1; mj >= 0; mj--) {
      audioLinks.unshift({ name: mgListSp[mj].name, url: mgListSp[mj].url, whole: true });
    }

    var tags = specialTags_(ep, meta.seriesName, meta.partSeq, meta.epNum);
    var docBlob = Utilities.newBlob(specialHtml_(meta, audioLinks, dur, tags),
                                    'text/html', baseName + '.html');
    var docFile = null;
    if (st.docId) { try { docFile = DriveApp.getFileById(st.docId); } catch (eD) { docFile = null; } }
    if (!docFile) {
      docFile = folder.createFile(docBlob);
      st.docId = docFile.getId();
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
    }

    var sp = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
    sp.getRange(st.row, XC.DUR, 1, 3).setValues([[dur + ' دقیقه',
      audioLinks.map(function (x) { return x.url; }).join('\n'), docFile.getUrl()]]);

    if (!st.mailed) {
      // نشانِ «تلاش شد» پیش از خودِ ارسال ذخیره می‌شود. اگر اجرا دقیقاً بینِ
      // ارسال و ذخیرهٔ نتیجه کشته شود، اجرای بعد دوباره ایمیل نمی‌فرستد.
      if (!st.mailTried) {
        st.mailTried = nowStr_();
        props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
        var okMail = false;
        try { okMail = sendSpecialEmail_(meta, audioLinks, docBlob, dur, folder, tags); }
        catch (eMa) { logLine_('ایمیل درس‌نامه ناموفق: ' + eMa.message); }
        st.mailed = okMail ? 'ارسال شد ' + nowStr_() : 'ارسال ناموفق';
      } else {
        st.mailed = 'ارسال ناموفق (اجرا وسط ارسال قطع شد ' + st.mailTried + ')';
      }
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
    }
    sp.getRange(st.row, XC.MAIL).setValue(st.mailed);

    if (!st.tg) {
      var tgFiles = mgListSp.length ? mgListSp : st.files;
      var tg = 'تنظیم نشده';
      try { tg = sendTelegramSpecial_(meta, tgFiles, docBlob, dur, folder, tags); }
      catch (eT) { tg = 'ناموفق: ' + String(eT.message).slice(0, 150); logLine_('تلگرام درس‌نامه: ' + eT.message); }
      st.tg = tg;
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
    }
    sp.getRange(st.row, XC.TG).setValue(st.tg);

    // همان ترتیبِ برنامهٔ متنوع: نشان اول، ثبت بعد.
    if (!st.extLogged) {
      st.extLogged = true;
      props_().setProperty(PK.SP_PENDING, JSON.stringify(st));
      var nExtSp = logExtSources_(hub, ENRICH_SHOW_SPECIAL, epNum,
                                  (meta.ep && meta.ep.__extSources) || []);
      if (nExtSp) props_().setProperty(PK.ENRICH_AT, nowStr_());
    }

    try {
      markInstructionsApplied_(hub, meta.orders || [], epNum,
        'در درس‌نامه تزریق و قسمت منتشر شد');
    } catch (eI) {}

    props_().deleteProperty(PK.SP_PENDING);
    clearSpecialContinuation_();
    try { writeStatus_(hub, 'درس‌نامه ' + epNum + ' کامل شد'); } catch (eS) {}
    // شمارِ *تحویل‌شده*، نه شمارِ تکه‌های پیش از ادغام.
    //
    // ۲۳ اوت: قسمت ۱۴ در دو فایلِ «یکجا» تحویل شد، ولی هم سیاهه و هم
    // _STATUS.json «۷ فایل» نوشتند — شمارِ تکه‌های کوتاهِ پیش از ادغام. وارسیِ
    // سلامت هم بر همان بنا هشدار داد: «درس‌نامه در ۷ فایل فرستاده شد». هشداری
    // که عددش غلط است، اعتمادِ به بقیهٔ هشدارها را هم می‌بَرَد.
    var deliveredN = mgListSp.length ? mgListSp.length : st.files.length;
    logLine_('درس‌نامه ' + epNum + ' کامل شد (' + dur + '، ' + deliveredN + ' فایل صوتی' +
             (mgListSp.length && st.files.length > mgListSp.length
                ? ' — از ' + st.files.length + ' تکه چسبانده شد' : '') + ').');
    // مدت و تعدادِ فایل را نگه می‌داریم تا در _STATUS.json دیده شوند. تا امروز
    // هیچ‌کدام به فایلِ وضعیت نمی‌رسید: «از همه جا از همه رنگ» هر دو را داشت و
    // درس‌نامه هیچ‌کدام را. برای همین وقتی درس‌نامه دو تکه آمد، هیچ ناظری —
    // نه آدم نه کد — اصلاً نمی‌توانست ببیندش. سنجه شکست نخورد؛ داده وجود نداشت.
    try {
      props_().setProperty(PK.SP_LAST, JSON.stringify({
        episode: epNum, duration: dur, files: deliveredN,
        parts: st.files.length, at: nowStr_() }));
    } catch (eL) {}
    return { ok: true, episode: epNum, duration: dur, telegram: st.tg, done: true };
  } catch (err) {
    logLine_('خطای صداگذاری درس‌نامه: ' + err.message);
    if (props_().getProperty(PK.SP_PENDING)) {
      try { scheduleSpecialContinue_(10 * 60 * 1000); } catch (e2) {}
    }
    throw err;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}
