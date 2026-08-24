/**
 * 13_Series.gs — شناساییِ «مجموعهٔ آموزشی» در شیت‌های منبع
 *
 * شیت‌های تازه یک تفاوت بنیادی با دو شیت اول دارند: آن‌جا هر ردیف یک کلیپ یا
 * یک عکسِ مستقل بود، این‌جا هر ردیف یک «قطعه» از یک فایلِ بلندِ آموزشی است، و
 * چند فایل با هم یک «دوره» می‌سازند.
 *
 * سه لایه:
 *   قطعه (chunk)  → یک ردیف در شیت منبع. مثلاً دقیقهٔ ۷ تا ۸ از ویدیو.
 *   قسمت (part)   → یک فایل. همهٔ ردیف‌هایی که یک File_ID دارند.
 *   مجموعه (series) → چند فایل که یک دوره‌اند: 01_Astrology…، 02_Astrology…
 *
 * قطعه‌ها و قسمت‌ها در شیت پراکنده‌اند و بین آن‌ها ردیفِ فایل‌های دیگر آمده.
 * این‌جا هیچ‌جا «ردیف به ردیف» جلو نمی‌رویم: اول گروه می‌کنیم، بعد مرتب.
 *
 * هیچ چیزی در شیت‌های منبع نوشته نمی‌شود. رجیستری در CONTENT-HUB ساخته می‌شود.
 */

// ------------------------------------------------- تشخیص نام و شمارهٔ قسمت

/**
 * الگوهای شمارهٔ قسمت در نام فایل. ترتیب مهم است: خاص‌ترین اول.
 * هر الگو باید دو چیز بدهد: ریشهٔ نام (نام مجموعه) و شمارهٔ قسمت.
 */
var SERIES_PATTERNS = [
  // S01E02 / s1e2
  { re: /^(.*?)[\s._-]*s(\d{1,2})[\s._-]*e(\d{1,3})[\s._-]*(.*)$/i,
    stem: function (m) { return (m[1] + ' ' + m[4]).trim(); },
    // فصل×۱۰۰۰ + قسمت. سقفِ عمومیِ ۹۹۹ برای این الگو معنا ندارد و باعث می‌شد
    // هر فایلِ S01E02 بی‌صدا رد شود و به «مجموعهٔ تک‌قسمتی» تبدیل گردد.
    max: 99999,
    seq: function (m) { return parseInt(m[2], 10) * 1000 + parseInt(m[3], 10); } },
  // پیشوندِ عددی: 01_Astrology…  ۰۲-دوره…  3. جلسه…
  { re: /^(\d{1,3})[\s._\-–)]+(.+)$/,
    stem: function (m) { return m[2]; }, seq: function (m) { return parseInt(m[1], 10); } },
  // واژهٔ قسمت/جلسه/درس/part/ep + عدد، هرجای نام
  { re: /^(.*?)[\s._-]*(?:قسمت|جلسه|درس|بخش|فصل|part|episode|ep|session|lesson|lect|lecture|lec|vol|chapter)[\s._\-#]*(\d{1,3})[\s._-]*(.*)$/i,
    stem: function (m) { return (m[1] + ' ' + m[3]).trim(); },
    seq: function (m) { return parseInt(m[2], 10); } },
  // پسوندِ عددی: «دورهٔ گن 04»
  { re: /^(.+?)[\s._\-–]+(\d{1,3})$/,
    stem: function (m) { return m[1]; }, seq: function (m) { return parseInt(m[2], 10); } }
];

/** پاک‌سازیِ نام فایل: پسوند، شناسه‌های تصادفی، و جداکننده‌های اضافه. */
function seriesStem_(name) {
  var s = String(name || '').trim();
  // نیم‌فاصله و نشانه‌های جهت و کشیده «حذف» می‌شوند، نه اینکه فاصله شوند.
  // با فاصله‌کردن، «روان‌شناسی پول» و «روانشناسی پول» دو مجموعهٔ جدا می‌شدند و
  // هر نیمه‌اش هم به‌تنهایی «فایلِ تکِ کوتاه» حساب می‌شد — یعنی یک دورهٔ کاملِ
  // واقعی از فهرست غیب می‌شد.
  s = s.replace(/[\u200C\u200D\u200E\u200F\u061C\u0640]/g, '');
  // ترتیب این دو خط حیاتی است. «_» نویسهٔ واژه‌ای است، پس مرزِ \b وسطِ
  // «proc_20251103_lect01» اصلاً وجود ندارد و مُهر زمانی و واژه‌هایی مثل
  // final هرگز پاک نمی‌شدند — نتیجه اینکه هر بار پردازشِ دوباره، یک مجموعهٔ
  // تازه می‌ساخت. اول جداکننده‌ها به فاصله تبدیل می‌شوند، بعد پاک‌سازی.
  s = s.replace(/[_\-–—.]+/g, ' ');
  s = s.replace(/\b\d{6,}\b/g, ' ');                        // مُهر زمانی/شناسهٔ عددیِ بلند
  s = s.replace(/\b(?:final|copy|new|orig(?:inal)?|hd|1080p|720p|480p|4k|mp4|mp3|pdf|processed|proc)\b/gi, ' ');
  // پسوندِ فایل این‌جا پاک نمی‌شود: هر دو فراخوانِ این تابع نامِ بی‌پسوند
  // می‌دهند، و پاک‌کردنِ دوباره آخرین واژهٔ عنوان‌های نقطه‌دار را می‌خورد —
  // «Tahlil.Bazar.Iran» و «Tahlil.Bazar.Jahan» هر دو «Tahlil Bazar» می‌شدند.
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** کلیدِ یکسان‌ساز: برای اینکه «Astrology Homayoon» و «astrology  homayoon» یکی شوند. */
function seriesKeyFromStem_(stem) {
  var k = txNorm(String(stem || '')).replace(/[^؀-ۿa-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ').trim();
  return k;
}

/**
 * از نام فایل، نامِ مجموعه و شمارهٔ قسمت را درمی‌آورد.
 * فایلی که هیچ الگوی شماره‌ای ندارد، خودش یک مجموعهٔ تک‌قسمتی است (مثل یک کتاب).
 */
function parseSeriesName_(fileName, fileId) {
  // رقم‌های فارسی اول به لاتین تبدیل می‌شوند. بی این، «۰۱_دوره» و «۰۲_دوره»
  // هیچ‌وقت یک مجموعه نمی‌شدند و رقم هم داخلِ نامِ مجموعه می‌ماند.
  var raw = faDigits_(String(fileName || '')).trim();
  var noExt = raw.replace(/\.[A-Za-z0-9]{2,5}$/, '');
  for (var i = 0; i < SERIES_PATTERNS.length; i++) {
    var m = noExt.match(SERIES_PATTERNS[i].re);
    if (!m) continue;
    var stem = seriesStem_(SERIES_PATTERNS[i].stem(m));
    var seq = SERIES_PATTERNS[i].seq(m);
    var cap = SERIES_PATTERNS[i].max || 999;
    if (!stem || stem.length < 3) continue;      // «01_» تنها، مجموعه نیست
    if (!isFinite(seq) || seq < 1 || seq > cap) continue;
    return { name: stem, seq: seq, multi: true };
  }
  var only = seriesStem_(noExt);
  // فایلِ بی‌نام باید مجموعهٔ خودش باشد. با یک نامِ ثابت، همهٔ فایل‌های بی‌نامِ
  // آرشیو در یک «دورهٔ» جعلی جمع می‌شدند و پشت سر هم روایت می‌شدند.
  if (!only) return { name: 'بی‌نام ' + (fileId || raw || '؟'), seq: 1, multi: false };
  return { name: only, seq: 1, multi: false };
}

// --------------------------------------------------- خواندنِ ساختار یک تب


/**
 * آیا این نام می‌تواند نامِ یک «دوره» باشد؟
 *
 * آرشیوِ واقعی پر است از فایل‌هایی با نامِ ماشینی: «1»، «892»،
 * «0efef642ff0f41a77938c9c7b1dc282712648307-360p»، «online-audio-converter_0»،
 * «WhatsApp Video 2026-01-02 at 10.11.12». این‌ها هرگز دوره نیستند و اگر وارد
 * فهرست شوند، فهرست از دستِ آدم خارج می‌شود — همان چیزی که با ۲۶۳ «مجموعه»
 * پیش آمد. این صافی ساختاری است و پیش از هر داوریِ محتوایی اعمال می‌شود.
 */
var SERIES_JUNK_PAT = new RegExp(
  'online[ _-]?audio[ _-]?converter|audio[ _-]?converter|' +
  'whatsapp|telegram|instagram|screen[ _-]?record|screenshot|' +
  'voice[ _-]?\\d|rec[ _-]?\\d|new[ _-]?recording|untitled|بدون[ _-]?نام|' +
  'video[ _-]?\\d{3,}|img[ _-]?\\d{3,}|vid[ _-]?\\d{3,}|' +
  'copy[ _-]?of|final[ _-]?cut|export|render|output|temp|tmp', 'i');

function seriesNameLooksReal_(name) {
  var raw = String(name || '').trim();
  if (!raw) return false;
  var n = faDigits_(raw);
  // رقم و نشانه تنها: «1»، «892»، «01 02»
  var letters = n.replace(/[^A-Za-z\u0600-\u06FF]/g, '');
  // «SQL 101» و «AI 2» نامِ واقعی‌اند؛ سه حرف کافی است.
  if (letters.length < 3) return false;
  // شناسهٔ هگزادسیمالِ بلند (نامِ فایلِ ماشینی) — پیوسته، نه پس از پاک‌کردنِ
  // بقیهٔ نویسه‌ها. با پاک‌کردن، «Fundamentals of Advanced Backend Cache Design»
  // هم یک «شناسهٔ ماشینی» حساب می‌شد و یک عنوانِ کاملاً سالم دور می‌رفت.
  if (/[0-9a-fA-F]{16,}/.test(n)) return false;
  // نامِ ابزارها و ضبط‌های خودکار
  if (SERIES_JUNK_PAT.test(n)) return false;
  // «360p»، «1080x1920»، «mp4_2» و مانند این‌ها، اگر کلِ نام همین باشد
  if (/^[\s\d._x-]*(?:p|px|fps|kbps|mb|kb)?[\s\d._x-]*$/i.test(n)) return false;
  return true;
}

/**
 * آیا این گروه واقعاً یک «دورهٔ آموزشی» است؟ (صافیِ ساختاری، پیش از داوری)
 *   • یا چند فایلِ شماره‌دار است (۰۱_…، ۰۲_…) که با هم یک دوره‌اند،
 *   • یا یک فایلِ تنهاست که به‌قدر کافی بلند است (سخنرانیِ کامل، کتاب).
 * و در هر حال نامش باید نامِ آدمیزاد باشد.
 */
function seriesQualifies_(g) {
  var fileIds = Object.keys(g.files);
  var nParts = fileIds.length;
  var maxChunks = 0, totalChunks = 0;
  for (var i = 0; i < fileIds.length; i++) {
    var c = g.files[fileIds[i]].chunks.length;
    totalChunks += c;
    if (c > maxChunks) maxChunks = c;
  }
  if (!seriesNameLooksReal_(g.name)) return { ok: false, why: 'نامِ ماشینی' };
  if (nParts >= 2) {
    if (totalChunks < CFG.SERIES_MIN_CHUNKS) return { ok: false, why: 'خیلی کوتاه' };
    return { ok: true };
  }
  // فایلِ تنها: باید واقعاً بلند باشد، وگرنه یک کلیپِ چندقطعه‌ای است نه دوره
  if (maxChunks < (CFG.SERIES_MIN_SOLO_CHUNKS || 8)) {
    return { ok: false, why: 'فایلِ تکِ کوتاه (' + maxChunks + ' قطعه)' };
  }
  return { ok: true };
}

/** ستون‌های لازم برای گروه‌بندی. از نگاشتِ خودکارِ 10_Sources استفاده می‌کند. */
function seriesColsOf_(headers) {
  var f = function (list, fb) {
    for (var i = 0; i < list.length; i++) {
      var idx = findAny_(headers, list[i]);
      if (idx >= 0) return idx;
    }
    return fb === undefined ? -1 : fb;
  };
  return {
    fileId:  f([['File_ID'], ['File ID'], ['شناسه فایل']], -1),
    name:    f([['File_Name'], ['نام اصلی فایل'], ['New_Name'], ['نام جدید فایل']], -1),
    isChunk: f([['Is_Chunk'], ['آیا قطعه است']], -1),
    chunkNo: f([['Chunk_Number'], ['شماره قطعه']], -1),
    total:   f([['Total_Chunks'], ['Chunk_Total'], ['تعداد کل قطعات']], -1),
    link:    f([['File_Link'], ['Drive_Link'], ['لینک دسترسی']], -1),
    date:    f([['Timestamp'], ['تاریخ پردازش']], -1),
    seriesId:   f([['Series_ID']], -1),
    seriesName: f([['Series_Name']], -1),
    episodeSeq: f([['Episode_Seq']], -1)
  };
}

/**
 * یک تب را می‌خواند و فایل‌هایش را برمی‌گرداند.
 * خروجی: { fileId: { name, link, seq, seriesName, rows:[rowNumbers], chunks:[{no,row}] } }
 * ردیف‌ها ممکن است هر جای تب پراکنده باشند؛ همین‌جا جمع می‌شوند.
 */
function scanTabFiles_(sh, tabName, headers) {
  var last = sh.getLastRow();
  if (last < 2) return {};
  if (!headers) {
    var width = Math.min(sh.getLastColumn(), 80);
    headers = sh.getRange(1, 1, 1, width).getValues()[0];
  }
  var c = seriesColsOf_(headers);
  if (c.fileId < 0) return {};

  // فقط ستون‌های لازم خوانده می‌شوند، نه کل تب — تبِ درسی ۵۷ ستون دارد و
  // خواندنِ کاملش برای هزاران ردیف از سقفِ حافظه رد می‌شود.
  var need = [c.fileId, c.name, c.isChunk, c.chunkNo, c.total, c.link, c.date,
              c.seriesId, c.seriesName, c.episodeSeq].filter(function (x) { return x >= 0; });
  var lo = Math.min.apply(null, need), hi = Math.max.apply(null, need);
  var vals = sh.getRange(2, lo + 1, last - 1, hi - lo + 1).getValues();
  var at = function (row, idx) { return idx < 0 ? '' : row[idx - lo]; };

  var files = Object.create(null);   // کلید از دادهٔ شیت می‌آید: نقشهٔ بی‌prototype
  for (var i = 0; i < vals.length; i++) {
    var fid = String(at(vals[i], c.fileId) || '').trim();
    if (!fid) continue;
    var nm = String(at(vals[i], c.name) || '').trim();
    var no = parseInt(faDigits_(String(at(vals[i], c.chunkNo) || '')), 10);
    var tot = parseInt(faDigits_(String(at(vals[i], c.total) || '')), 10);
    var f = files[fid];
    if (!f) {
      f = files[fid] = { fileId: fid, name: nm, link: String(at(vals[i], c.link) || ''),
                         tab: tabName, chunks: [], total: 0, rollupRow: 0,
                         seriesId: String(at(vals[i], c.seriesId) || '').trim(),
                         seriesName: String(at(vals[i], c.seriesName) || '').trim(),
                         episodeSeq: parseInt(faDigits_(String(at(vals[i], c.episodeSeq) || '')), 10),
                         firstAt: String(at(vals[i], c.date) || '') };
    }
    if (!f.name && nm) f.name = nm;
    if (!f.link) f.link = String(at(vals[i], c.link) || '');
    // این ستون‌ها را خطِ لوله ممکن است بعداً پر کند، پس فقط ردیفِ اولِ فایل
    // را نگاه نمی‌کنیم — وگرنه یک بک‌فیلِ نیمه‌تمام، یک دوره را دو تکه می‌کرد.
    if (!f.seriesName) f.seriesName = String(at(vals[i], c.seriesName) || '').trim();
    if (!f.seriesId) f.seriesId = String(at(vals[i], c.seriesId) || '').trim();
    if (!isFinite(f.episodeSeq) || f.episodeSeq <= 0) {
      f.episodeSeq = parseInt(faDigits_(String(at(vals[i], c.episodeSeq) || '')), 10);
    }
    if (isFinite(tot) && tot > f.total) f.total = tot;
    if (isFinite(no) && no > 0) {
      f.chunks.push({ no: no, row: i + 2 });
    } else {
      // ردیفِ بی‌شماره: یا فایلِ تک‌تکه است یا ردیفِ جمع‌بندیِ پایانی.
      // این‌جا به‌عنوان قطعه ثبتش نمی‌کنیم. پیش‌تر اگر ردیفِ جمع‌بندی بالاتر از
      // قطعه‌های شماره‌دار می‌نشست، شمارهٔ ۱ را می‌قاپید و قطعهٔ ۱ واقعی —
      // یعنی دقیقاً آغازِ درس — بی‌صدا حذف می‌شد.
      f.rollupRow = i + 2;
    }
  }

  // ترتیبِ قطعه‌ها، و حذفِ قطعهٔ تکراری (همان شماره دو بار پردازش شده)
  for (var k in files) {
    if (!Object.prototype.hasOwnProperty.call(files, k)) continue;
    var fk = files[k];
    // فایلی که هیچ قطعهٔ شماره‌داری ندارد، خودش یک قطعه است (تبِ عکس، یا
    // فایلی که تکه نشده). ردیفِ بی‌شماره‌اش همان تک‌قطعه است.
    if (!fk.chunks.length && fk.rollupRow) fk.chunks.push({ no: 1, row: fk.rollupRow });
    var arr = fk.chunks;
    // برای شمارهٔ تکراری، ردیفِ پایین‌تر برنده است: پردازشِ دوباره همیشه
    // پایین‌تر نوشته می‌شود و نسخهٔ اصلاح‌شده است، نه نسخهٔ خرابِ قدیمی.
    arr.sort(function (a, b) { return a.no - b.no || b.row - a.row; });
    var seen = Object.create(null), uniq = [];
    for (var j = 0; j < arr.length; j++) {
      if (seen[arr[j].no]) continue;
      seen[arr[j].no] = true;
      uniq.push(arr[j]);
    }
    uniq.sort(function (a, b) { return a.no - b.no; });
    fk.chunks = uniq;
    if (!fk.total) fk.total = uniq.length;
  }
  return files;
}

// ------------------------------------------------------- ساختِ رجیستری

function ensureSeriesTabs_(hub) {
  return { reg: ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS),
           part: ensureTab_(hub, CFG.SERIES_PART_TAB, SPART_HEADERS) };
}

function readSeriesReg_(hub) {
  var sh = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  var out = { sheet: sh, byKey: Object.create(null), rows: [] };
  if (sh.getLastRow() < 2) return out;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, SERIES_HEADERS.length).getValues();
  for (var i = 0; i < v.length; i++) {
    var key = String(v[i][SC.KEY - 1] || '').trim();
    if (!key) continue;
    var rec = { row: i + 2, vals: v[i], key: key };
    out.rows.push(rec);
    out.byKey[key] = rec;
  }
  return out;
}

function readSeriesParts_(hub) {
  var sh = ensureTab_(hub, CFG.SERIES_PART_TAB, SPART_HEADERS);
  var out = { sheet: sh, byFile: Object.create(null), byKey: Object.create(null), rows: [] };
  if (sh.getLastRow() < 2) return out;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, SPART_HEADERS.length).getValues();
  for (var i = 0; i < v.length; i++) {
    var fid = String(v[i][SP.FILE - 1] || '').trim();
    if (!fid) continue;
    var rec = { row: i + 2, vals: v[i], fileId: fid, key: String(v[i][SP.KEY - 1] || '').trim() };
    out.rows.push(rec);
    out.byFile[fid] = rec;
    (out.byKey[rec.key] = out.byKey[rec.key] || []).push(rec);
  }
  for (var k in out.byKey) {
    if (!Object.prototype.hasOwnProperty.call(out.byKey, k)) continue;
    out.byKey[k].sort(function (a, b) {
      return (Number(a.vals[SP.SEQ - 1]) || 0) - (Number(b.vals[SP.SEQ - 1]) || 0) ||
             a.row - b.row;
    });
  }
  return out;
}

/** فشرده‌کردنِ فهرست ردیف‌ها: «12-45,58,60-63» به‌جای هفتاد عدد. */
function packRows_(nums) {
  if (!nums || !nums.length) return '';
  var a = nums.slice().sort(function (x, y) { return x - y; })
                .filter(function (v, i, arr) { return i === 0 || v !== arr[i - 1]; });
  var out = [], s = a[0], p = a[0];
  for (var i = 1; i <= a.length; i++) {
    if (i < a.length && a[i] === p + 1) { p = a[i]; continue; }
    out.push(s === p ? String(s) : (s + '-' + p));
    if (i < a.length) { s = a[i]; p = a[i]; }
  }
  return out.join(',');
}

function unpackRows_(s) {
  var out = [];
  var parts = String(s || '').split(',');
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i].trim();
    if (!t) continue;
    var m = t.match(/^(\d+)-(\d+)$/);
    if (m) {
      var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      for (var j = a; j <= b && j - a < 200000; j++) out.push(j);
    } else if (/^\d+$/.test(t)) out.push(parseInt(t, 10));
  }
  return out;
}

/**
 * اسکنِ کاملِ شیت‌های آموزشی و ساخت/به‌روزرسانی رجیستری.
 * این تابع فقط می‌خوانَد و فقط در CONTENT-HUB می‌نویسد.
 */
function scanSeries(force) {
  var hub = getHub_();
  var lastAt = props_().getProperty(PK.SERIES_SCAN_AT) || '';
  if (!force && lastAt) {
    var ageH = (new Date().getTime() - parseWhen_(lastAt)) / 3600000;
    if (isFinite(ageH) && ageH < CFG.SERIES_RESCAN_HOURS) return { skipped: true, at: lastAt };
  }
  // اگر اسکنِ قبلی به‌خاطر بسته‌بودنِ همهٔ منبع‌ها ناکام ماند، مُهر زمان ثبت
  // نمی‌شود (تا کور نمانیم) — ولی نباید هر بار باز کردنِ پنجره یک تلاشِ کاملِ
  // تازه بسازد. یک مهلتِ کوتاه می‌گذاریم.
  if (!force) {
    var failAt = props_().getProperty(PK.SERIES_FAIL_AT) || '';
    if (failAt) {
      var ageM = (new Date().getTime() - parseWhen_(failAt)) / 60000;
      if (isFinite(ageM) && ageM < 20) return { skipped: true, at: lastAt, backoff: true };
    }
  }

  var reg = readSeriesReg_(hub), parts = readSeriesParts_(hub);
  var found = Object.create(null);   // key → { name, kind, src, tab, parts: {fileId: fileRec} }
  var scanned = 0, tabsRead = 0, srcFail = 0, srcTried = 0;

  for (var s = 0; s < CFG.SOURCES.length; s++) {
    var src = CFG.SOURCES[s];
    if (CFG.SERIES_SOURCES.indexOf(src.key) === -1) continue;
    var ss;
    srcTried++;
    try { ss = SpreadsheetApp.openById(src.id); }
    catch (e) {
      srcFail++;
      logLine_('مجموعه‌ها: شیت «' + src.title + '» باز نشد: ' + e.message);
      continue;
    }
    var tabs = ss.getSheets();
    for (var t = 0; t < tabs.length; t++) {
      var sh = tabs[t], tabName = sh.getName();
      if (sh.getLastRow() < 2 || sh.getLastColumn() < 2) continue;
      var kind, files, headers;
      try {
        headers = sh.getRange(1, 1, 1, Math.min(sh.getLastColumn(), 80)).getValues()[0];
        kind = srcDetect_(headers);
        if (!kind || !kind.kind) continue;               // تبِ جانبی، نه محتوایی
        files = scanTabFiles_(sh, tabName, headers);
      } catch (eT) {
        logLine_('مجموعه‌ها: تب «' + tabName + '» خوانده نشد: ' + eT.message); continue;
      }
      tabsRead++;
      for (var fid in files) {
        if (!Object.prototype.hasOwnProperty.call(files, fid)) continue;
        var f = files[fid];
        scanned++;

        var nm, seq;
        if (f.seriesName) {                       // خودِ شیت گفته این کدام دوره است
          nm = seriesStem_(f.seriesName);
          seq = isFinite(f.episodeSeq) && f.episodeSeq > 0 ? f.episodeSeq
                                                           : parseSeriesName_(f.name).seq;
        } else if (f.seriesId) {
          nm = seriesStem_(f.seriesId);
          seq = isFinite(f.episodeSeq) && f.episodeSeq > 0 ? f.episodeSeq : 1;
        } else {
          var p = parseSeriesName_(f.name, fid);
          nm = p.name; seq = p.seq;
        }
        var key = seriesKeyFromStem_(nm);
        if (!key) continue;

        var g = found[key];
        if (!g) g = found[key] = { key: key, name: nm, kind: kind.kind, src: src.title,
                                   hint: src.hint || '', tab: tabName, files: {},
                                   qualifies: false };
        // یک مجموعه ممکن است در دو تب باشد (ویدیو و صدا)؛ تبِ اول ثبت می‌شود
        // و بقیه در همان کلید جمع می‌شوند.
        if (g.tab !== tabName) g.tab = g.tab + ' + ' + tabName;
        f.seq = seq;
        f.srcKey = src.key; f.srcTitle = src.title;
        g.files[fid] = f;
        // «آیا این یک مجموعهٔ آموزشی است؟» با بلندترین فایلش سنجیده می‌شود، نه
        // با تک‌تکشان. پیش‌تر صافیِ کوتاهی روی هر فایل جداگانه اعمال می‌شد و
        // درسِ کوتاهِ وسطِ یک دوره — مثلاً جمع‌بندیِ سه‌قطعه‌ای — برای همیشه از
        // دوره بیرون می‌افتاد و هیچ‌وقت پادکست نمی‌شد.
        // «آیا دوره است؟» یک بار و برای کلِ گروه، پس از جمع‌شدنِ همهٔ فایل‌ها
        // سنجیده می‌شود (پایین‌تر در writeSeriesRegistry_) — این‌جا فقط
        // نشانهٔ «دست‌کم یک فایلِ بلند دارد» را نگه می‌داریم.
        if (f.chunks.length >= CFG.SERIES_MIN_CHUNKS) g.qualifies = true;
      }
    }
  }

  var res = writeSeriesRegistry_(hub, reg, parts, found);
  // اگر هیچ منبعی باز نشد، این اسکن «انجام‌شده» حساب نمی‌شود. وگرنه یک قطعیِ
  // گذرای درایو، دوازده ساعت کورمان می‌کرد و دورهٔ تازه دیده نمی‌شد.
  if (srcTried && srcFail >= srcTried) {
    logLine_('مجموعه‌ها: هیچ شیت منبعی باز نشد؛ این اسکن ثبت نشد تا اجرای بعد دوباره تلاش کند.');
    props_().setProperty(PK.SERIES_FAIL_AT, nowStr_());
    res.sourcesFailed = srcFail;
    return res;
  }
  if (srcFail) res.sourcesFailed = srcFail;
  props_().deleteProperty(PK.SERIES_FAIL_AT);
  props_().setProperty(PK.SERIES_SCAN_AT, nowStr_());
  // مجموعهٔ تازه باید همان لحظه در جایگاهِ درستِ خودش بنشیند. داوریِ محتوایی‌اش
  // بودجه می‌خواهد و در تولید انجام می‌شود؛ ولی مرتب‌سازیِ درونِ دسته ارزان است.
  if (res.added || res.reopened) { try { rankWithinCategories_(hub, readSeriesReg_(hub)); } catch (eRk) {} }
  logLine_('مجموعه‌های آموزشی: ' + tabsRead + ' تب خوانده شد، ' + scanned + ' فایلِ آموزشی، ' +
           res.series + ' مجموعه (' + res.added + ' تازه، ' + res.reopened + ' بازگشایی).');
  return res;
}

/** نوشتنِ نتیجهٔ اسکن در دو تب رجیستری، بی آنکه جای ایستادنِ تولید گم شود. */
function writeSeriesRegistry_(hub, reg, parts, found) {
  var now = nowStr_();
  var addedSeries = [], addedParts = [], reopened = 0, nSeries = 0;
  var rejected = [], retired = 0;

  for (var key in found) {
    if (!Object.prototype.hasOwnProperty.call(found, key)) continue;
    var g = found[key];
    // کلیدی که هیچ فایلِ بلندی ندارد، مجموعهٔ آموزشی نیست: کلیپ کوتاه و عکسِ
    // تکی این‌جا جایی ندارند (آن‌ها کارِ برنامهٔ «از همه جا از همه رنگ»‌اند).
    if (!g.qualifies) continue;
    // صافیِ ساختاری: نامِ ماشینی و فایلِ تکِ کوتاه هرگز «دوره» نیستند.
    var qq = seriesQualifies_(g);
    if (!qq.ok) { rejected.push(g.name + ' (' + qq.why + ')'); continue; }
    nSeries++;
    var fileIds = Object.keys(g.files);
    var nChunks = 0;
    for (var i = 0; i < fileIds.length; i++) nChunks += g.files[fileIds[i]].chunks.length;

    var prev = reg.byKey[key];
    if (!prev) {
      // طولِ ردیف باید همیشه با شمارِ سرستون‌ها بخورد؛ ستون‌های تازه (داوریِ
      // محتوایی) خالی می‌مانند تا داوری پرشان کند.
      var fresh = [key, g.name, g.src, g.tab, g.kind, fileIds.length, nChunks,
                   '', '', '', SST.NEW, 0, 0, '', '', now, now, '', '', '', '',
                   seriesCatGuess_(g.name, g.kind, g.hint)];
      while (fresh.length < SERIES_HEADERS.length) fresh.push('');
      addedSeries.push(fresh);
    } else {
      var v = prev.vals;
      var oldParts = Number(v[SC.PARTS - 1]) || 0;
      var oldChunks = Number(v[SC.CHUNKS - 1]) || 0;
      var wasDone = String(v[SC.STATUS - 1]) === SST.DONE;
      v[SC.NAME - 1] = g.name; v[SC.SRC - 1] = g.src; v[SC.TAB - 1] = g.tab;
      v[SC.KIND - 1] = g.kind;
      v[SC.PARTS - 1] = fileIds.length; v[SC.CHUNKS - 1] = nChunks;
      v[SC.UPDATED - 1] = now;
      if (!String(v[SC.CAT - 1] || '').trim()) v[SC.CAT - 1] = seriesCatGuess_(g.name, g.kind, g.hint);
      // مجموعه‌ای که تمام شده بود و قسمت تازه گرفته، دوباره در نوبت می‌آید —
      // ولی به‌عنوان «ادامهٔ همان سری»، نه یک مجموعهٔ نو.
      // بازگشایی هم برای «قسمتِ تازه» و هم برای «قطعهٔ تازه در قسمتِ موجود».
      // حالت دوم عادی است: خطِ لوله هنوز مشغولِ تکه‌کردنِ یک ویدیوی بلند است و
      // اسکنِ ما زودتر رسیده. بی این شرط، آن قطعه‌ها برای همیشه یتیم می‌ماندند.
      // مجموعه‌ای که صافیِ ساختاری کنارش گذاشته بود و حالا واجدِ شرط شده،
      // باید برگردد: ویدیوی بلندی که قطعه‌هایش دیرتر رسیده، یا دوره‌ای که
      // قسمتِ دومش بعداً آمده. نشانهٔ «از فهرست بیرون رفت» یکتاست، پس
      // ردیف‌هایی که خودتان یا اسکن به دلیلِ دیگری نادیده گرفته‌اید دست نمی‌خورند.
      if (String(v[SC.STATUS - 1]) === SST.SKIPPED &&
          String(v[SC.NOTE - 1] || '').indexOf('از فهرست بیرون رفت') === 0) {
        var againQ = seriesQualifies_(g);
        if (againQ.ok) {
          v[SC.STATUS - 1] = SST.NEW;
          v[SC.NOTE - 1] = 'به فهرست برگشت (' + now + ')';
          v[SC.JUDGED - 1] = '';                 // دوباره داوری شود
          reopened++;
        }
      }
      if (wasDone && (fileIds.length > oldParts || nChunks > oldChunks)) {
        v[SC.STATUS - 1] = SST.REOPENED;
        v[SC.NOTE - 1] = (fileIds.length > oldParts
            ? 'قسمت تازه اضافه شد: ' + oldParts + ' ← ' + fileIds.length
            : 'قطعهٔ تازه اضافه شد: ' + oldChunks + ' ← ' + nChunks) + ' (' + now + ')';
        reopened++;
      }
      try { reg.sheet.getRange(prev.row, 1, 1, SERIES_HEADERS.length).setValues([v]); }
      catch (eW) {}
    }

    for (var q = 0; q < fileIds.length; q++) {
      var f = g.files[fileIds[q]];
      var rows = f.chunks.map(function (c) { return c.row; });
      var pv = parts.byFile[f.fileId];
      var packed = packRows_(rows);
      if (!pv) {
        addedParts.push([key, f.fileId, f.name, f.seq, f.srcTitle, f.tab,
                         f.chunks.length, packed, f.link || driveLink_(f.fileId), 0, '', now]);
      } else {
        var w = pv.vals;
        // کلید هم باید به‌روز شود. اگر خطِ لوله بعداً ستون Series_Name را پر
        // کند، کلیدِ مجموعه عوض می‌شود؛ بی این خط، ردیف‌های قسمت زیر کلیدِ
        // قدیمی جا می‌ماندند و ردیفِ تازهٔ رجیستری یک شبحِ بی‌قسمت می‌شد که
        // انتخاب‌کننده اول سراغش می‌رفت.
        // نامِ تب و منبع هم باید در شرطِ تغییر باشند. اگر تبی در شیت منبع
        // تغییرِ نام بدهد، ردیفِ قسمت به تبِ مرده اشاره می‌کرد و اسکنِ دوباره
        // هم درستش نمی‌کرد — یعنی آن مجموعه برای همیشه غیرقابل‌خواندن می‌شد.
        var changed = Number(w[SP.CHUNKS - 1]) !== f.chunks.length ||
                      String(w[SP.ROWS - 1]) !== packed ||
                      String(w[SP.KEY - 1]) !== key ||
                      String(w[SP.TAB - 1]) !== f.tab ||
                      String(w[SP.SRC - 1]) !== f.srcTitle;
        if (changed) {
          w[SP.KEY - 1] = key;
          w[SP.NAME - 1] = f.name; w[SP.SEQ - 1] = f.seq; w[SP.TAB - 1] = f.tab;
          w[SP.SRC - 1] = f.srcTitle;
          w[SP.CHUNKS - 1] = f.chunks.length; w[SP.ROWS - 1] = packed;
          w[SP.UPDATED - 1] = now;
          try { parts.sheet.getRange(pv.row, 1, 1, SPART_HEADERS.length).setValues([w]); }
          catch (eP) {}
        }
      }
    }
  }

  // ردیف‌های رجیستری که هیچ قسمتی زیرشان نمانده «شبح»اند: کلیدشان عوض شده و
  // قسمت‌هایشان زیر کلیدِ تازه رفته. کنار گذاشته می‌شوند تا نه در انتخاب بیایند
  // و نه در تخته دو بار دیده شوند.
  try {
    var freshParts = readSeriesParts_(hub);
    for (var gr = 0; gr < reg.rows.length; gr++) {
      var gv = reg.rows[gr].vals;
      var gk = reg.rows[gr].key;
      if (found[gk]) continue;                                  // هنوز در اسکن دیده می‌شود
      if ((freshParts.byKey[gk] || []).length) continue;         // قسمت دارد
      if (String(gv[SC.STATUS - 1]) === SST.SKIPPED) continue;
      gv[SC.STATUS - 1] = SST.SKIPPED;
      gv[SC.NOTE - 1] = 'قسمتی زیر این کلید نماند (کلید عوض شده) — ' + now;
      gv[SC.UPDATED - 1] = now;
      try { reg.sheet.getRange(reg.rows[gr].row, 1, 1, SERIES_HEADERS.length).setValues([gv]); }
      catch (eGh) {}
    }
  } catch (eG2) {}

  if (addedSeries.length) appendBlock_(reg.sheet, addedSeries, SERIES_HEADERS.length);
  if (addedParts.length) appendBlock_(parts.sheet, addedParts, SPART_HEADERS.length);

  // ── پاک‌سازیِ فهرستِ موجود ──
  // ردیف‌هایی که با معیارِ تازه دیگر «دوره» نیستند (نامِ ماشینی، فایلِ تکِ کوتاه)
  // از فهرست بیرون می‌روند: «نادیده گرفته شد» علامت می‌خورند، پس نه در تخته
  // دیده می‌شوند و نه نوبتِ تولید می‌گیرند — ولی ردیفشان برای شفافیت می‌ماند.
  // ردیفی که قبلاً از آن قسمتی ساخته شده، هرگز کنار گذاشته نمی‌شود.
  try {
    var pinNow = null;
    try { pinNow = seriesPin_(); } catch (ePn) {}
    var pinKeyNow = (pinNow && pinNow.kind === 'series') ? String(pinNow.value) : '';
    var regNow = readSeriesReg_(hub);
    for (var rr = 0; rr < regNow.rows.length; rr++) {
      var rv = regNow.rows[rr].vals;
      var stNow = String(rv[SC.STATUS - 1] || '');
      if (stNow === SST.SKIPPED) continue;
      if (String(rv[SC.EPISODES - 1] || '').trim()) continue;      // قسمت ساخته شده
      if (String(rv[SC.MANUAL - 1] || '').trim()) continue;        // نظرِ خودتان ثبت شده
      // شماره/دستهٔ دستی یعنی «این را می‌خواهم» — صافیِ ساختاری حق ندارد
      // چیزی را که خودتان چیده‌اید، به‌خاطرِ کوتاه‌بودن یا نامِ ماشینی بیرون
      // بیندازد. بی این خط، یک اسکنِ دوره‌ای قفلِ شما را بی‌صدا می‌شکست.
      if (seriesManualLock_(rv)) continue;
      // و هرگز مجموعه‌ای که خودتان همین حالا انتخابش کرده‌اید
      if (pinKeyNow && regNow.rows[rr].key === pinKeyNow) continue;
      var nmNow = String(rv[SC.NAME - 1] || '');
      var partsNow = Number(rv[SC.PARTS - 1]) || 0;
      var chunksNow = Number(rv[SC.CHUNKS - 1]) || 0;
      var bad = '';
      if (!seriesNameLooksReal_(nmNow)) bad = 'نامِ ماشینی';
      else if (partsNow <= 1 && chunksNow < (CFG.SERIES_MIN_SOLO_CHUNKS || 8)) {
        bad = 'فایلِ تکِ کوتاه (' + chunksNow + ' قطعه)';
      }
      if (!bad) continue;
      rv[SC.STATUS - 1] = SST.SKIPPED;
      rv[SC.NOTE - 1] = 'از فهرست بیرون رفت: ' + bad;
      rv[SC.ORDER - 1] = '';
      rv[SC.UPDATED - 1] = now;
      retired++;
    }
    // یک نوشتنِ دسته‌ای برای کلِ جدول، نه یک فرمان برای هر ردیف. با ۳۰۰۰ ردیف،
    // حالتِ قبلی از سقفِ شش‌دقیقه‌ای رد می‌شد.
    if (retired && regNow.rows.length) {
      // با شمارهٔ ردیفِ واقعیِ هر رکورد، نه «از ردیفِ ۲ پشتِ سرِ هم». یک
      // ردیفِ بی‌کلید وسطِ جدول (یادداشتِ دستیِ شما، سلولِ خالی‌شده) در
      // readSeriesReg_ نمی‌آید؛ نوشتنِ پیوسته از ۲، همهٔ ردیف‌های بعدش را
      // یک خانه بالا می‌کشید و روی همان یادداشت می‌نوشت.
      try { writeRowsBatched_(reg.sheet, regNow.rows, SERIES_HEADERS.length); }
      catch (eBk) { logLine_('نوشتنِ دسته‌ایِ صافیِ مجموعه‌ها ناموفق: ' + eBk.message); }
    }
  } catch (eCl) {}

  // ترتیبِ درونِ دسته‌ها همان لحظهٔ اسکن بازچینی می‌شود. پیش‌تر این کار فقط
  // پس از یک دورِ موفقِ داوری انجام می‌شد — و چون داوری شکست می‌خورد، ستونِ
  // «ترتیب» صفر می‌ماند و فهرست همان تودهٔ به‌هم‌ریختهٔ روزِ اول بود.
  try { rankWithinCategories_(hub); } catch (eRk) {}

  if (rejected.length || retired) {
    logLine_('صافیِ مجموعه‌ها: ' + rejected.length + ' گروه وارد فهرست نشد' +
             (retired ? ' و ' + retired + ' ردیفِ قدیمی از فهرست بیرون رفت' : '') +
             (rejected.length ? ' — نمونه: ' + rejected.slice(0, 4).join(' ، ') : '') + '.');
  }
  return { series: nSeries, added: addedSeries.length, addedParts: addedParts.length,
           reopened: reopened, rejected: rejected.length, retired: retired };
}

function appendBlock_(sh, rows, width) {
  if (!rows.length) return;
  var start = sh.getLastRow() + 1;
  var need = (start + rows.length - 1) - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
  sh.getRange(start, 1, rows.length, width).setValues(rows);
}

/**
 * حدسِ اولیهٔ دستهٔ یک مجموعه، از همان درختِ دسته‌بندیِ خودِ موتور.
 * برنامه‌ریزِ درسی بعداً می‌تواند اصلاحش کند، ولی تا آن موقع مجموعه بی‌دسته
 * نمی‌ماند و در فهرست زیر «متفرقه» آویزان نمی‌شود.
 */
function seriesCatGuess_(name, kind, hint) {
  try {
    // نامِ مجموعه اغلب لاتینِ حرف‌نویسی‌شده است («MabaniTahlilTekniki») و با
    // کلیدواژه‌های فارسی جور درنمی‌آید. پس «موضوعِ اعلام‌شدهٔ خودِ شیت منبع»
    // (فیلد hint در CFG.SOURCES) سیگنالِ اصلی است و نام، سیگنالِ کمکی.
    var r = txClassify(String(hint || ''), String(name || ''), String(hint || ''), '');
    var t = r && r.title ? String(r.title) : '';
    if (t) return t;
  } catch (e) {}
  return MISC_TITLE;
}

// ------------------------------------------- انتخاب مجموعهٔ بعدی (برنامهٔ درسی)

var CURRICULUM_SCHEMA = {
  type: 'object',
  properties: {
    plan: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          order: { type: 'string' },        // رشته می‌آید و در کد به عدد تبدیل می‌شود
          level: { type: 'string' },
          topic: { type: 'string' },
          related: { type: 'string' },
          category: { type: 'string' },
          why: { type: 'string' }
        },
        required: ['key', 'order', 'level', 'topic']
      }
    }
  },
  required: ['plan']
};

/**
 * ترتیبِ آموزشیِ مجموعه‌ها را یک بار تعیین می‌کند: مقدماتی‌ها اول، بعد سطح
 * بالاتر؛ و مجموعه‌های هم‌موضوع پشت سر هم. نتیجه در رجیستری می‌ماند و تا وقتی
 * مجموعهٔ تازه‌ای نیامده دوباره از مدل پرسیده نمی‌شود.
 */
/**
 * برنامه‌ریزِ قدیمی — از روی نام و اندازه. از نسخهٔ ۵٫۲ در جریانِ اصلی صدا زده
 * نمی‌شود: دسته و سطح و موضوع از داوریِ محتوایی (16_Curate.gs) می‌آیند که متنِ
 * واقعیِ قطعه‌ها را می‌خواند، و ترتیب را rankWithinCategories_ می‌سازد. این
 * تابع فقط برای سازگاری و به‌عنوان پشتیبانِ دستی نگه داشته شده است.
 */
function planCurriculum_(hub, regOpt) {
  var reg = regOpt || readSeriesReg_(hub);
  var need = [];
  for (var i = 0; i < reg.rows.length; i++) {
    var v = reg.rows[i].vals;
    if (String(v[SC.STATUS - 1]) === SST.SKIPPED) continue;
    if (seriesManualLock_(v)) continue;   // ترتیبِ دستی: برنامه‌ریزِ مدل حق دخالت ندارد
    if (!String(v[SC.ORDER - 1] || '').toString().trim()) need.push(reg.rows[i]);
  }
  if (!need.length) return { planned: 0 };

  // پرامپت از خودِ «بی‌ترتیب‌ها» ساخته می‌شود، نه از شصت ردیفِ اولِ رجیستری.
  // پیش‌تر اگر مجموعهٔ شصت‌ویکم بی‌ترتیب بود، هیچ‌وقت در پرامپت نمی‌آمد؛ پس
  // need هرگز خالی نمی‌شد و هر اجرا یک فراخوانیِ بی‌فایدهٔ مدل خرج می‌کرد.
  var PAGE = 60;
  var page = need.slice(0, PAGE);
  // چند مجموعهٔ ترتیب‌دار هم برای زمینه می‌آید تا شماره‌ها با هم جور بمانند
  var ctxRows = [];
  for (var c0 = 0; c0 < reg.rows.length && ctxRows.length < 15; c0++) {
    if (String(reg.rows[c0].vals[SC.ORDER - 1] || '').toString().trim()) ctxRows.push(reg.rows[c0]);
  }
  var lines = [];
  var describe = function (w, tag) {
    lines.push('- key: ' + w[SC.KEY - 1] + ' | نام: ' + w[SC.NAME - 1] +
               ' | نوع: ' + w[SC.KIND - 1] + ' | قسمت: ' + w[SC.PARTS - 1] +
               ' | قطعه: ' + w[SC.CHUNKS - 1] + ' | منبع: ' + w[SC.SRC - 1] +
               (tag ? ' | ' + tag : ''));
  };
  for (var j = 0; j < page.length; j++) describe(page[j].vals, '');
  for (var j2 = 0; j2 < ctxRows.length; j2++) {
    describe(ctxRows[j2].vals, 'ترتیبِ قبلاً تعیین‌شده: ' + ctxRows[j2].vals[SC.ORDER - 1]);
  }
  var prompt =
    'این فهرست، مجموعه‌های آموزشیِ یک آرشیو شخصی است. قرار است از هر کدام یک پادکست ' +
    'آموزشی ساخته شود و باید ترتیبِ درستِ یادگیری را تعیین کنی.\n\n' +
    lines.join('\n') + '\n\n' +
    'برای هر مجموعه بگو:\n' +
    '• order: شمارهٔ ترتیب (۱ یعنی اول از همه). مقدماتی‌ترین و پایه‌ای‌ترین مجموعه اول ' +
    'بیاید، بعد سطح‌های بالاتر. مجموعه‌هایی که موضوعشان به هم نزدیک است باید پشت سر هم ' +
    'بیایند تا شنونده رشتهٔ موضوع را از دست ندهد.\n' +
    '• level: یکی از «مقدماتی» / «میانی» / «پیشرفته».\n' +
    '• topic: موضوعِ مجموعه در حداکثر پنج واژهٔ فارسی.\n' +
    '• related: کلیدِ نزدیک‌ترین مجموعهٔ هم‌موضوع (اگر هست)، وگرنه رشتهٔ خالی.\n' +
    '• category: دستهٔ این مجموعه، دقیقاً یکی از این نام‌ها و بی هیچ تغییر:\n   ' +
    TAXONOMY.map(function (t) { return t.title; }).concat([MISC_TITLE]).join(' · ') + '\n' +
    '• why: در یک جمله بگو چرا این جایگاه را دادی.\n\n' +
    'فقط از روی نام و نوع و اندازه قضاوت کن. هیچ مجموعه‌ای را جا ننداز و هیچ ترتیبی را ' +
    'تکراری نده.';

  var out;
  try { out = geminiText_(prompt, CURRICULUM_SCHEMA, 8192); }
  catch (e) { logLine_('برنامه‌ریزی ترتیب مجموعه‌ها ناموفق: ' + e.message); return { planned: 0 }; }
  var plan = (out && out.plan) || [];
  var byKey = Object.create(null);
  for (var p = 0; p < plan.length; p++) byKey[String(plan[p].key)] = plan[p];

  var n = 0;
  for (var r = 0; r < reg.rows.length; r++) {
    var rec = reg.rows[r], pl = byKey[rec.key];
    if (!pl) continue;
    // ردیفِ قفل‌شده هرگز — حتی اگر مدل برایش نقشه «توهم» کرده باشد. صافیِ
    // ورودی (need) کافی نیست: پاسخِ مدل می‌تواند کلیدهایی بیاورد که از او
    // خواسته نشده، و این حلقه از روی پاسخ می‌گردد نه از روی درخواست.
    if (seriesManualLock_(rec.vals)) continue;
    // ردیفی که قبلاً ترتیب داشته و در این دور فقط برای زمینه فرستاده شده،
    // نباید بی‌جهت بازنویسی شود
    var wasPlanned = !!String(rec.vals[SC.ORDER - 1] || '').toString().trim();
    var inPage = false;
    for (var pg = 0; pg < page.length; pg++) if (page[pg].key === rec.key) inPage = true;
    if (wasPlanned && !inPage) continue;
    rec.vals[SC.ORDER - 1] = Number(pl.order) || 999;
    rec.vals[SC.LEVEL - 1] = String(pl.level || '');
    rec.vals[SC.TOPIC - 1] = String(pl.topic || '');
    // مدل ممکن است نامِ نمایشی برگرداند نه کلید؛ یکسان‌سازی می‌کنیم وگرنه
    // قاعدهٔ «مجموعهٔ هم‌موضوع، بعدی» بی‌صدا از کار می‌افتاد.
    rec.vals[SC.RELATED - 1] = pl.related ? seriesKeyFromStem_(seriesStem_(pl.related)) : '';
    // دسته فقط وقتی از مدل پذیرفته می‌شود که واقعاً یکی از دسته‌های خودمان باشد
    // شیءِ ساده به‌عنوان نقشه، کلیدهای Object.prototype را هم «موجود» نشان
    // می‌دهد: پاسخِ «constructor» یا «__proto__» از مدل پذیرفته می‌شد و بعد
    // کلِ تختهٔ مجموعه‌ها را می‌شکست.
    var okCats = Object.create(null);
    for (var t3 = 0; t3 < TAXONOMY.length; t3++) okCats[TAXONOMY[t3].title] = true;
    okCats[MISC_TITLE] = true;
    var pc = String(pl.category || '').trim();
    if (Object.prototype.hasOwnProperty.call(okCats, pc)) rec.vals[SC.CAT - 1] = pc;
    else if (!String(rec.vals[SC.CAT - 1] || '').trim()) {
      rec.vals[SC.CAT - 1] = seriesCatGuess_(rec.vals[SC.NAME - 1], rec.vals[SC.KIND - 1]);
    }
    rec.vals[SC.CAT - 1] = seriesCatOf_(rec.vals);      // یکسان‌سازی و trim
    if (pl.why) rec.vals[SC.NOTE - 1] = String(pl.why).slice(0, 300);
    try { reg.sheet.getRange(rec.row, 1, 1, SERIES_HEADERS.length).setValues([rec.vals]); n++; }
    catch (eS) {}
  }
  logLine_('ترتیب آموزشی برای ' + n + ' مجموعه تعیین شد' +
           (need.length > page.length ? ' (' + (need.length - page.length) +
            ' مجموعه در نوبتِ دورِ بعد)' : '') + '.');
  return { planned: n, remaining: Math.max(0, need.length - page.length) };
}

// ------------------------------------------------- انتخابِ دستی (سنجاق)

/** انتخابِ دستیِ فعلی: {kind:'series'|'cat', value, at} یا null. */
function seriesPin_() {
  var raw = String(props_().getProperty(PK.SP_PIN) || '').trim();
  if (!raw) return null;
  var i = raw.indexOf(':');
  if (i < 1) return null;
  return { kind: raw.slice(0, i), value: raw.slice(i + 1),
           at: String(props_().getProperty(PK.SP_PIN_AT) || '') };
}

function setSeriesPin_(kind, value) {
  if (!value) return clearSeriesPin_();
  var raw = kind + ':' + value;
  // اگر همان انتخابِ قبلی دوباره فرستاده شد (کلیکِ تکراری، تحویلِ دوبارهٔ یک
  // درخواست)، زمانِ «از ...» جابه‌جا نمی‌شود؛ وگرنه بنر بی‌دلیل جلو می‌رفت.
  if (String(props_().getProperty(PK.SP_PIN) || '') === raw) return seriesPin_();
  props_().setProperty(PK.SP_PIN, raw);
  props_().setProperty(PK.SP_PIN_AT, nowStr_());
  return seriesPin_();
}

function clearSeriesPin_() {
  props_().deleteProperty(PK.SP_PIN);
  props_().deleteProperty(PK.SP_PIN_AT);
  return null;
}

/**
 * نامِ خواندنیِ انتخاب دستی. کلیدِ درونی («mabanitahlil ostad») برای نمایش
 * به کار نمی‌آید؛ هر جا سنجاق را به شما نشان می‌دهیم باید نامِ خودِ مجموعه
 * («MabaniTahlil Ostad») دیده شود. اگر ردیفِ رجیستری پیدا نشد، همان کلید
 * برمی‌گردد تا پیام بی‌نام نماند.
 */
function pinLabel_(hub, pinOpt, regOpt) {
  var pin = pinOpt !== undefined ? pinOpt : seriesPin_();
  if (!pin) return '';
  var v = String(pin.value || '');
  if (pin.kind !== 'series') return v;
  try {
    var reg = regOpt || readSeriesReg_(hub);
    var rec = reg.byKey ? reg.byKey[v] : null;
    if (rec) return String(rec.vals[SC.NAME - 1] || v);
  } catch (e) {}
  return v;
}

/**
 * دستهٔ یک ردیفِ رجیستری. هر جا دسته خوانده می‌شود باید از همین‌جا بیاید:
 * پیش‌تر تخته با trim می‌خواند و انتخاب‌کننده بی trim، و یک فاصلهٔ اضافه در
 * سلولِ دسته باعث می‌شد دکمهٔ «کار روی این دسته» بی‌صدا بی‌اثر شود و در سیاهه
 * هم دروغ نوشته شود که «انتخاب دستی تمام شد».
 */
function seriesCatOf_(vals) {
  // دستهٔ دستیِ شما همیشه بر دستهٔ خودکار مقدم است — همه‌جا: تخته، انتخابِ
  // تولید، سند و پیام‌ها همه از همین تابع می‌خوانند.
  var m = String(vals && vals[SC.MCAT - 1] !== undefined ? vals[SC.MCAT - 1] : '').trim();
  if (m) return m;
  var c = String(vals && vals[SC.CAT - 1] !== undefined ? vals[SC.CAT - 1] : '').trim();
  return c || MISC_TITLE;
}

/** زیر‌دستهٔ دستی، اگر تعیین شده باشد. */
function seriesSubOf_(vals) {
  return String(vals && vals[SC.MSUB - 1] !== undefined ? vals[SC.MSUB - 1] : '').trim();
}

/** شمارهٔ دستی — NaN یعنی تعیین نشده. */
function seriesMOrder_(vals) {
  var raw = String(vals && vals[SC.MORDER - 1] !== undefined ? vals[SC.MORDER - 1] : '').trim();
  if (!raw) return NaN;
  var n = Number(faDigits_(raw));
  return isFinite(n) && n > 0 ? n : NaN;
}

/**
 * «قفلِ دستی»: شماره یا دستهٔ دستی که پر شد، دیگر هیچ ساز‌و‌کارِ خودکاری —
 * داوریِ مدل، داوریِ قاعده‌ای، مرتب‌سازِ برنامهٔ درسی — حق ندارد روی آن
 * ردیف اثر بگذارد. این خواستهٔ صریحِ کاربر است.
 */
function seriesManualLock_(vals) {
  return isFinite(seriesMOrder_(vals)) ||
         !!String(vals && vals[SC.MCAT - 1] !== undefined ? vals[SC.MCAT - 1] : '').trim();
}

/** ترتیبِ مؤثرِ تولید: شمارهٔ دستی مقدمِ مطلق، بعد ترتیبِ برنامهٔ درسی. */
function seriesEffOrder_(vals) {
  var m = seriesMOrder_(vals);
  if (isFinite(m)) return m - 1000000;    // دستی همیشه جلوتر از هر خودکاری
  return Number(vals[SC.ORDER - 1]) || 999;
}

/** بستنِ یک مجموعه: وضعیت «تمام‌شده» و زمانِ به‌روزرسانی. */
function markSeriesDone_(reg, rec) {
  if (!rec || String(rec.vals[SC.STATUS - 1]) === SST.DONE) return;
  rec.vals[SC.STATUS - 1] = SST.DONE;
  rec.vals[SC.UPDATED - 1] = nowStr_();
  try { reg.sheet.getRange(rec.row, 1, 1, SERIES_HEADERS.length).setValues([rec.vals]); }
  catch (e) {}
  logLine_('درس‌نامه: مجموعهٔ «' + rec.vals[SC.NAME - 1] + '» تمام‌شده علامت خورد.');
}

/** آیا این مجموعه کارِ ناتمام دارد؟ (قسمتی که قطعه‌های مصرف‌نشده داشته باشد) */
function seriesHasWork_(hub, key, partsOpt) {
  // partsOpt هم می‌تواند کلِ خروجیِ readSeriesParts_ باشد و هم فقط ردیف‌های
  // همین مجموعه. هر دو را می‌پذیریم؛ وگرنه یک فراخوانِ اشتباه، به جای پاسخِ
  // نادرست، کلِ اجرا را با خطا می‌خواباند.
  var list;
  if (Array.isArray(partsOpt)) list = partsOpt;
  else if (partsOpt && partsOpt.byKey) list = partsOpt.byKey[key] || [];
  else list = (readSeriesParts_(hub).byKey[key] || []);
  for (var i = 0; i < list.length; i++) {
    var v = list[i].vals;
    var n = Number(v[SP.CHUNKS - 1]) || 0;
    var d = Number(v[SP.DONE_TO - 1]) || 0;
    if (n > 0 && d < n) return true;
    if (!n) return true;                  // هنوز شمرده نشده؛ محتمل است کار داشته باشد
  }
  return false;
}

/**
 * مجموعهٔ فعلی.
 *
 * ترتیبِ انتخاب، از قوی به ضعیف:
 *   ۰) انتخابِ دستیِ شما (سنجاق) — یک مجموعهٔ مشخص یا یک دسته. تا کارش تمام
 *      نشود، هر چیز دیگری منتظر می‌ماند. همین که تمام شد، سنجاق خودش برداشته
 *      می‌شود و موتور به همان مجموعه‌ای که قبلاً رویش کار می‌کرد برمی‌گردد.
 *   ۱) مجموعهٔ نیمه‌کاره (قاعدهٔ سخت: تا تمام نشود، جابه‌جا نشو). اگر بیش از
 *      یکی نیمه‌کاره مانده — که وقتی رخ می‌دهد که سنجاق کارِ قبلی را نصفه
 *      گذاشته — تازه‌ترینی که رویش کار شده برمی‌گردد.
 *   ۲) مجموعه‌ای که تمام شده بود و قسمت یا قطعهٔ تازه گرفته.
 *   ۳) نوبتِ برنامهٔ درسی: مقدماتی اول، با هُلِ کوچکِ هم‌موضوعی.
 */
function pickSeries_(hub, regOpt, partsOpt) {
  return pickSeriesPlan_(hub, regOpt, partsOpt).rec;
}

/**
 * همان انتخاب، ولی «بی‌عارضه»: هیچ‌چیزی در شیت نمی‌نویسد و سنجاق را برنمی‌دارد.
 * فقط می‌گوید چه چیزی باید عوض شود. این تفکیک لازم است چون انتخاب‌کننده از
 * مسیرهای صرفاً خواندنی هم صدا زده می‌شود — رندرِ تخته، فایل وضعیت، وارسیِ
 * سلامت، و پیامِ پیش از تولید. پیش‌تر یک کلیکِ بی‌ضررِ «نمایش تخته» می‌توانست
 * دویست ردیف را «تمام‌شده» کند و سنجاقِ کاربر را پاک کند.
 *
 * خروجی: { rec, pinExhausted, spent: [ردیف‌هایی که دیگر کاری ندارند] }
 */
/** بزرگ‌ترین شمارهٔ قسمتی که در سلولِ «قسمت‌های پادکست» نوشته شده. */
/* ═══════ خواندنِ ستونِ «قسمت‌های پادکست» (۵٫۹۴) ═══════

   ══ چه چیزی در آن سلول است ══
   موتور شمارهٔ هر قسمت را به همان سلول می‌چسباند. ولی اگر روزی یک Date در
   آن نشسته باشد، `String(date)` کلِ تاریخ را می‌چسباند و برای همیشه
   می‌مانَد. دادهٔ واقعیِ ۲۴ اوت:

     «Fri Jan 02 2026 00:00:00 GMT+0400 (Gulf Standard Time) 3 4 5 … 15»

   شمردنِ واژه‌ها ۲۲ می‌دهد، جایی که ۱۳ شماره هست. تختهٔ مجموعه‌ها همین کار
   را می‌کرد و «۲۲ قسمتِ ساخته‌شده» نشان می‌داد؛ و ستونِ جزوه از روی همان
   «۷ درس هنوز وارد نشده» می‌گفت، در حالی که هر ۱۵ درس در جزوه بودند.

   قاعده‌ها، به‌ترتیبِ اهمیت:
     • توکنی که حرفِ لاتین دارد، شمارهٔ قسمت نیست (Fri, GMT+0400, (Gulf…).
     • ساعت (۰۰:۰۰:۰۰) نیست.
     • عددِ با صفرِ پیشرو («۰۲») نیست — موتور شماره را بی صفرِ پیشرو می‌نویسد.
     • عددِ بزرگ‌تر از SERIES_EP_MAX سال است، نه قسمت.
   هرچه ماند، شمارهٔ قسمت است. */
var SERIES_EP_MAX = 500;

function epNumsOf_(cell) {
  var t = String(cell === null || cell === undefined ? '' : cell);
  t = faDigits_(t);
  var out = [], seen = Object.create(null);
  var toks = t.split(/[\s,،]+/);
  for (var i = 0; i < toks.length; i++) {
    var x = toks[i];
    if (!x) continue;
    if (/[A-Za-z]/.test(x)) continue;              // Fri، GMT+0400، (Gulf…
    if (/\d+:\d+/.test(x)) continue;               // ۰۰:۰۰:۰۰
    if (!/^\d+$/.test(x)) continue;
    if (x.length > 1 && x.charAt(0) === '0') continue;   // «۰۲» تاریخ است
    var n = parseInt(x, 10);
    if (!isFinite(n) || n < 1 || n > SERIES_EP_MAX) continue;
    if (seen[n]) continue;
    seen[n] = 1; out.push(n);
  }
  out.sort(function (a, b) { return a - b; });
  return out;
}

/** همان سلول، تمیز و مرتب — برای نوشتنِ دوباره. */
function epNumsJoin_(nums) { return (nums || []).join(' '); }

function lastEpNo_(cell) {
  var t = faDigits_(String(cell === null || cell === undefined ? '' : cell));
  var m = t.match(/\d+/g);
  if (!m) return 0;
  var mx = 0;
  for (var i = 0; i < m.length; i++) { var n = parseInt(m[i], 10); if (n > mx) mx = n; }
  return mx;
}

function pickSeriesPlan_(hub, regOpt, partsOpt, skipOpt) {
  var out = { rec: null, pinExhausted: false, pinBlocked: false, spent: [] };
  var reg = regOpt || readSeriesReg_(hub);
  if (!reg.rows.length) return out;
  var parts = partsOpt || readSeriesParts_(hub);
  // مجموعه‌هایی که در همین اجرا خوانده نشدند. «تمام‌شده» نیستند؛ فقط امروز
  // نوبتشان نیست. پس نه بسته می‌شوند و نه دوباره انتخاب.
  var skip = skipOpt || null;
  var isSkipped = function (k) {
    return !!(skip && Object.prototype.hasOwnProperty.call(skip, k) && skip[k]);
  };

  var actives = [], reopenedRec = null, queue = [], i, v, st;

  // ── ۰) سنجاقِ دستی ──
  var pin = seriesPin_();
  if (pin) {
    var cand = [];
    for (i = 0; i < reg.rows.length; i++) {
      v = reg.rows[i].vals; st = String(v[SC.STATUS - 1]);
      if (st === SST.SKIPPED) continue;
      // اول ببین این ردیف اصلاً به سنجاق ربط دارد یا نه؛ بعد ببین امروز
      // خوانده شده یا نه. وگرنه یک دورهٔ خرابِ بی‌ربط، سنجاقِ شما را «مسدود»
      // اعلام می‌کرد و بسته‌شدنِ درستِ سنجاقِ تمام‌شده را عقب می‌انداخت.
      var matches = (pin.kind === 'series' && reg.rows[i].key === pin.value) ||
                    (pin.kind === 'cat' && seriesCatOf_(v) === String(pin.value).trim());
      if (!matches) continue;
      // سنجاقِ یک دسته، موارد غیرآموزشیِ همان دسته را برنمی‌دارد؛ ولی سنجاقِ
      // یک مجموعهٔ مشخص یعنی «همین را می‌خواهم» و داوری را کنار می‌زند.
      if (pin.kind === 'cat' && !seriesEligible_(v, reg.rows[i].key, pin)) continue;
      if (isSkipped(reg.rows[i].key)) { out.pinBlocked = true; continue; }
      cand.push(reg.rows[i]);
    }
    // در یک دستهٔ سنجاق‌شده، همان قاعدهٔ مقدماتی‌اول برقرار است
    cand.sort(function (a, b) {
      var ra = String(a.vals[SC.STATUS - 1]) === SST.ACTIVE ? 0 : 1;
      var rb = String(b.vals[SC.STATUS - 1]) === SST.ACTIVE ? 0 : 1;
      if (ra !== rb) return ra - rb;
      var oa = seriesEffOrder_(a.vals), ob = seriesEffOrder_(b.vals);
      if (oa !== ob) return oa - ob;
      return a.row - b.row;
    });
    for (i = 0; i < cand.length; i++) {
      if (seriesHasWork_(hub, cand[i].key, parts)) { out.rec = cand[i]; return out; }
    }
    // سنجاق کارِ ناتمامی ندارد → گزارش می‌کنیم که باید برداشته شود و آن
    // مجموعه‌ها بسته شوند؛ خودِ نوشتن کارِ تولیدکننده است.
    // ولی اگر تنها دلیلِ خالی‌بودن این بود که قسمت‌هایش امروز خوانده نشدند،
    // سنجاق «تمام» نشده و نباید چیزی بسته شود.
    if (!out.pinBlocked) {
      out.pinExhausted = true;
      for (i = 0; i < cand.length; i++) {
        if (String(cand[i].vals[SC.STATUS - 1]) !== SST.DONE) out.spent.push(cand[i]);
      }
    }
  }

  for (i = 0; i < reg.rows.length; i++) {
    v = reg.rows[i].vals; st = String(v[SC.STATUS - 1]);
    if (st === SST.SKIPPED) continue;
    if (isSkipped(reg.rows[i].key)) continue;
    // ── دروازهٔ محتوایی ──
    // چیزی که داوریِ محتوایی «آموزشی نیست» تشخیص داده، وارد صفِ «درس‌نامه»
    // نمی‌شود (روضه و مناسبت و کلیپ خبری و مانند این‌ها). در برنامهٔ متنوع
    // عیناً استفاده می‌شود و در تخته هم با دلیلش دیده می‌شود.
    if (!seriesEligible_(v, reg.rows[i].key, pin)) continue;
    if (st === SST.ACTIVE) actives.push(reg.rows[i]);
    else if (st === SST.REOPENED && !reopenedRec) reopenedRec = reg.rows[i];
    else if (st === SST.NEW) queue.push(reg.rows[i]);
  }
  if (actives.length) {
    // تازه‌ترین مجموعه‌ای که رویش کار شده — یعنی همان‌جایی که سنجاق نصفه‌اش گذاشت
    actives.sort(function (a, b) {
      var ta = parseWhen_(String(a.vals[SC.LAST_EP_AT - 1] || ''));
      var tb = parseWhen_(String(b.vals[SC.LAST_EP_AT - 1] || ''));
      if (isNaN(ta)) ta = 0;
      if (isNaN(tb)) tb = 0;
      if (ta !== tb) return tb - ta;
      // زمان فقط تا «دقیقه» ثبت می‌شود؛ اگر دو مجموعه در یک دقیقه قسمت گرفته
      // باشند، بالاترین شمارهٔ قسمت تازه‌تر است — نه ترتیبِ ردیفِ شیت.
      var ea = lastEpNo_(a.vals[SC.EPISODES - 1]), eb = lastEpNo_(b.vals[SC.EPISODES - 1]);
      if (ea !== eb) return eb - ea;
      return a.row - b.row;
    });
    // مجموعهٔ «در حال تولید»ی که دیگر کاری ندارد باید بسته شود تا نوبت را
    // بی‌جهت نگه ندارد — ولی نوشتنش کارِ این تابع نیست.
    for (i = 0; i < actives.length; i++) {
      if (seriesHasWork_(hub, actives[i].key, parts)) { out.rec = actives[i]; return out; }
      out.spent.push(actives[i]);
    }
  }
  // مجموعه‌ای که تمام شده بود و قسمت تازه گرفته، بر مجموعهٔ نو مقدم است:
  // شنونده رشتهٔ همان دوره را در ذهن دارد.
  if (reopenedRec) { out.rec = reopenedRec; return out; }
  if (!queue.length) return out;

  var lastKey = props_().getProperty(PK.SP_SERIES) || '';
  var lastRelated = '';
  if (lastKey && reg.byKey[lastKey]) lastRelated = String(reg.byKey[lastKey].vals[SC.RELATED - 1] || '');

  // ترتیبِ آموزشی (مقدماتی ← پیشرفته) ستونِ فقراتِ انتخاب است و هم‌موضوع بودن
  // فقط یک هُلِ کوچک می‌دهد. پیش‌تر برعکس بود و یک دورهٔ «پیشرفته»ی هم‌موضوع
  // می‌توانست جلوی یک دورهٔ «مقدماتی» را بگیرد — یعنی از وسط شروع کنیم.
  var eff = function (r) {
    // شمارهٔ دستیِ شما مقدمِ مطلق است — از خودِ seriesEffOrder_ می‌آید
    // (منفیِ بزرگ)، پس هیچ جریمه و هُلی به گردش نمی‌رسد.
    var o = seriesEffOrder_(r.vals);
    if (isFinite(seriesMOrder_(r.vals))) return o;
    // مجموعهٔ داوری‌شده بر داوری‌نشده مقدم است: تا وقتی نمی‌دانیم چیزی آموزشی
    // هست یا نه، بهتر است اول سراغ چیزی برویم که مطمئنیم آموزشی است.
    if (seriesIsCourse_(r.vals) === null) o += 500;
    return o - (r.key === lastRelated ? 1.5 : 0);
  };
  // ترتیبِ درونِ دسته با شمارهٔ «ترتیب برنامه» تعیین می‌شود؛ ولی وقتی دو دسته
  // هر دو مجموعهٔ شمارهٔ ۱ دارند، باید یک قاعدهٔ روشن برای انتخاب بینشان باشد:
  // مقدماتی‌تر اول، و در سطحِ برابر، آن‌که داوری امتیازِ آموزشیِ بالاتری داده.
  var lvlRank = Object.create(null);
  lvlRank['مقدماتی'] = 0; lvlRank['میانی'] = 1; lvlRank['پیشرفته'] = 2;
  var lvOf = function (r) {
    var k = String(r.vals[SC.LEVEL - 1] || '').trim();
    return Object.prototype.hasOwnProperty.call(lvlRank, k) ? lvlRank[k] : 1;
  };
  queue.sort(function (a, b) {
    var d = eff(a) - eff(b);
    if (d) return d;
    var lv = lvOf(a) - lvOf(b);
    if (lv) return lv;
    var sa = Number(a.vals[SC.CSCORE - 1]) || 0, sb = Number(b.vals[SC.CSCORE - 1]) || 0;
    if (sa !== sb) return sb - sa;
    return a.row - b.row;
  });
  out.rec = queue[0];
  return out;
}
