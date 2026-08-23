/* ═════════════════════════════════════════════════════════════════════════
   بخشِ ۲۳ — بانکِ موسیقی و افکت

   ══ چه چیزی اینجا شدنی است و چه چیزی نیست ══

   کلِ زنجیرهٔ صدا در این موتور روی یک قالبِ واحد می‌چرخد: PCM ۲۴ کیلوهرتز،
   ۱۶ بیت، تک‌کاناله. تکه‌ها به‌صورتِ رشتهٔ base64 به هم چسبانده می‌شوند و هدرِ
   ۵۴ بایتی فقط یک بار سرِ فایل نوشته می‌شود. یعنی *چسباندن* صدا ارزان است.

   پس این‌ها شدنی‌اند و همین‌جا انجام می‌شوند:
     • موسیقیِ آغاز و پایان، و قطعهٔ کوتاه میانِ بخش‌ها
     • بریدنِ هر تکه از هر جای موسیقی (ثانیهٔ شروع و طول)
     • کم و زیادکردنِ بلندی، و محوِ نرم در ابتدا و انتها
     • تبدیلِ خودکارِ فایل‌های بانک به قالبِ موتور (نرخ، کانال، عمق)

   و این یکی *در Apps Script* شدنی نیست: پخشِ موسیقی **زیرِ** صدای گوینده در
   تمامِ قسمت. آن کار یعنی جمعِ نمونه‌به‌نمونهٔ دو موج در حدود چهارده میلیون
   نمونه، و مهلتِ شش‌دقیقه‌ایِ گوگل جوابش را نمی‌دهد. راهش هست — مخلوط‌کردن در
   همان حلقه‌ای که هر تکه ساخته می‌شود — ولی کارِ جداگانه‌ای است و اینجا وعده‌اش
   داده نمی‌شود.

   ══ فرمتِ فایل‌های بانک ══
   فقط WAV. رمزگشاییِ MP3 در Apps Script ممکن نیست و هیچ کتابخانه‌ای هم در
   دسترس نیست. فایلی که WAV نباشد در فهرست ثبت می‌شود ولی با نشانِ «قالب
   ناسازگار» کنار گذاشته می‌شود تا بی‌صدا نادیده گرفته نشود.
   ═════════════════════════════════════════════════════════════════════════ */

/** نامِ پروندهٔ درخواستِ موسیقی — یک جا، تا وارسیِ چیدمان هم همان را بشناسد. */
function MUSIC_WISH_() { return CFG.MUSIC_WISH_FILE || '_MUSIC-WISH.json'; }

/** پوشهٔ بانک در OUTPUT؛ اگر نبود ساخته می‌شود. */
function musicFolder_() {
  var root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  var name = CFG.MUSIC_FOLDER || 'موسیقی و افکت';
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/**
 * خواندنِ هدرِ WAV.
 *
 * هدر را چانک‌به‌چانک می‌پیماید، نه با جای ثابت: فایل‌هایی که از ابزارهای
 * مختلف بیرون می‌آیند چانک‌های اضافه (LIST، fact، …) پیش از data دارند و
 * فرضِ «داده از بایتِ ۴۴» آن‌ها را خرد می‌کند.
 */
function wavInfo_(b) {
  var u8 = function (i) { return b[i] < 0 ? b[i] + 256 : b[i]; };
  var u16 = function (i) { return u8(i) | (u8(i + 1) << 8); };
  var u32 = function (i) { return (u8(i) | (u8(i + 1) << 8) | (u8(i + 2) << 16)) + u8(i + 3) * 16777216; };
  var tag = function (i) { return String.fromCharCode(u8(i), u8(i + 1), u8(i + 2), u8(i + 3)); };

  if (b.length < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  var pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    var id = tag(pos), sz = u32(pos + 4);
    if (id === 'fmt ') {
      fmt = { format: u16(pos + 8), channels: u16(pos + 10), rate: u32(pos + 12),
              bits: u16(pos + 22) };
    } else if (id === 'data') {
      data = { at: pos + 8, len: Math.min(sz, b.length - pos - 8) };
      break;
    }
    pos += 8 + sz + (sz % 2);          // چانک‌ها روی مرزِ زوج می‌نشینند
  }
  if (!fmt || !data) return null;
  fmt.dataAt = data.at; fmt.dataLen = data.len;
  fmt.seconds = data.len / (fmt.rate * fmt.channels * (fmt.bits / 8));
  return fmt;
}

/** آیا این فایل همان قالبی است که موتور با آن کار می‌کند؟ */
function musicNative_(info) {
  return !!info && info.format === 1 && info.channels === 1 &&
         info.bits === 16 && info.rate === (CFG.SAMPLE_RATE || 24000);
}

/**
 * نمونه‌های ۱۶ بیتیِ تک‌کاناله با نرخِ موتور، از هر WAVِ PCM.
 *
 * تبدیل عمداً ساده است: میانگینِ کانال‌ها برای تک‌کاناله‌کردن، و درون‌یابیِ
 * خطی برای نرخ. برای قطعه‌های کوتاهِ بانک (چند ده ثانیه) هم کافی است هم سریع.
 * فیلترِ ضدِ نام‌آوا ندارد؛ برای موسیقیِ پس‌زمینه شنیده نمی‌شود.
 */
function musicSamples_(b, info, startSec, lenSec) {
  var bps = info.bits / 8, ch = info.channels;
  var frameB = bps * ch;
  var total = Math.floor(info.dataLen / frameB);
  var from = Math.max(0, Math.floor((Number(startSec) || 0) * info.rate));
  var want = (Number(lenSec) > 0) ? Math.floor(lenSec * info.rate) : (total - from);
  if (from >= total) return [];
  want = Math.min(want, total - from);

  var rd = function (fr, c) {
    var i = info.dataAt + (fr * frameB) + (c * bps);
    // بایت‌های Apps Script علامت‌دارند. اگر بایتِ بالا پیش از جابه‌جایی ماسک
    // نشود، هر نمونهٔ منفی عددی بی‌معنا می‌شود — و چون خطایی نمی‌دهد، فقط در
    // گوش شنیده می‌شود. آزمونِ ۵.۱ همین را گرفت.
    var u = function (k) { return b[k] < 0 ? b[k] + 256 : b[k]; };
    if (info.bits === 16) {
      var v = u(i) | (u(i + 1) << 8);
      return (v & 0x8000) ? v - 65536 : v;
    }
    if (info.bits === 8) { return (u(i) - 128) * 256; }
    // ۲۴ و ۳۲ بیتی: بالاترین دو بایت کافی است
    var w = u(i + bps - 2) | (u(i + bps - 1) << 8);
    return (w & 0x8000) ? w - 65536 : w;
  };

  var mono = [];
  for (var f = 0; f < want; f++) {
    var s = 0;
    for (var c = 0; c < ch; c++) s += rd(from + f, c);
    mono.push(s / ch);
  }

  var srcRate = info.rate, dstRate = CFG.SAMPLE_RATE || 24000;
  if (srcRate === dstRate) return mono;
  var outN = Math.floor(mono.length * dstRate / srcRate), out = [];
  for (var o = 0; o < outN; o++) {
    var x = o * srcRate / dstRate, i0 = Math.floor(x), fr2 = x - i0;
    var a = mono[i0] || 0, bb = (i0 + 1 < mono.length) ? mono[i0 + 1] : a;
    out.push(a + (bb - a) * fr2);
  }
  return out;
}

/** بلندی و محوِ نرمِ ابتدا و انتها، روی خودِ نمونه‌ها. */
function musicShape_(samples, gain, fadeInSec, fadeOutSec) {
  var g = (Number(gain) >= 0) ? Number(gain) : 1;
  var sr = CFG.SAMPLE_RATE || 24000;
  var fi = Math.min(Math.floor((Number(fadeInSec) || 0) * sr), samples.length);
  var fo = Math.min(Math.floor((Number(fadeOutSec) || 0) * sr), samples.length);
  var n = samples.length;
  for (var i = 0; i < n; i++) {
    var m = g;
    if (fi && i < fi) m *= i / fi;
    if (fo && i >= n - fo) m *= (n - i) / fo;
    var v = Math.round(samples[i] * m);
    samples[i] = v > 32767 ? 32767 : (v < -32768 ? -32768 : v);
  }
  return samples;
}

/** نمونه‌ها → رشتهٔ base64ِ همان قالبی که حلقهٔ صداگذاری می‌فهمد. */
function musicB64_(samples) {
  var bytes = [];
  for (var i = 0; i < samples.length; i++) {
    var v = samples[i] | 0;
    if (v < 0) v += 65536;
    var lo = v & 255, hi = (v >>> 8) & 255;
    bytes.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi);
  }
  return alignB64_(Utilities.base64Encode(bytes));
}

/**
 * یک قطعهٔ آمادهٔ چسباندن از یک فایلِ بانک.
 * برمی‌گرداند: رشتهٔ base64، یا '' اگر فایل به درد نخورد.
 */
function musicClip_(fileId, opt) {
  opt = opt || {};
  try {
    var b = DriveApp.getFileById(fileId).getBlob().getBytes();
    var info = wavInfo_(b);
    if (!info || info.format !== 1) return '';
    var cap = Number(CFG.MUSIC_MAX_CLIP_SEC) || 45;
    var len = Math.min(Number(opt.lenSec) || cap, cap);
    var s = musicSamples_(b, info, opt.startSec || 0, len);
    if (!s.length) return '';
    musicShape_(s, opt.gain, opt.fadeIn, opt.fadeOut);
    return musicB64_(s);
  } catch (e) {
    logLine_('قطعهٔ موسیقی خوانده نشد (' + fileId + '): ' + e.message);
    return '';
  }
}

/* ───────────────────────────── فهرستِ بانک ───────────────────────────── */

var MUSIC_HEADERS = ['شناسهٔ فایل', 'نام', 'نوع', 'حال‌وهوا', 'مناسب برای',
                     'مدت (ثانیه)', 'قالب', 'بلندی', 'بارِ استفاده',
                     'آخرین استفاده', 'یادداشت', 'سرشتِ اندازه‌گیری‌شده', 'منبع',
                     'لینک'];
var MC = { ID: 1, NAME: 2, KIND: 3, MOOD: 4, SLOTS: 5, SEC: 6, FMT: 7,
           GAIN: 8, USED: 9, LAST: 10, NOTE: 11, PROBE: 12, SRC: 13, LINK: 14 };

/* تبِ تاریخچه: هر بار که قطعه‌ای واقعاً پخش شد، یک ردیف.
   ستونِ «بارِ استفاده» فقط یک عدد است و «آخرین استفاده» فقط آخری را نگه
   می‌دارد؛ هیچ‌کدام نمی‌گویند این قطعه در کدام قسمت‌ها و در کدام جایگاه
   پخش شده. آن سؤال را فقط یک تاریخچه جواب می‌دهد. */
var MUSE_HEADERS = ['تاریخ', 'برنامه', 'قسمت', 'جایگاه', 'قطعه', 'نوع',
                    'حال‌وهوا', 'بلندی', 'ثانیه', 'لینک'];
var MU = { AT: 1, SHOW: 2, EP: 3, SLOT: 4, NAME: 5, KIND: 6,
           MOOD: 7, GAIN: 8, SEC: 9, LINK: 10 };

function musicUrl_(id) {
  return id ? 'https://drive.google.com/file/d/' + String(id) + '/view' : '';
}

/**
 * پویشِ پوشهٔ بانک و به‌روزکردنِ تب.
 *
 * ستون‌هایی که آدم پر می‌کند — حال‌وهوا، مناسب برای، بلندی، یادداشت — هرگز
 * بازنویسی نمی‌شوند. فقط چیزهایی که از خودِ فایل خوانده می‌شوند (مدت، قالب)
 * تازه می‌شوند. وگرنه هر پویش، سلیقهٔ کاربر را پاک می‌کرد.
 */
function musicScan_(hub) {
  hub = hub || getHub_();
  var sh = ensureTab_(hub, CFG.MUSIC_TAB || 'موسیقی', MUSIC_HEADERS);
  var last = sh.getLastRow();
  var rows = last > 1 ? sh.getRange(2, 1, last - 1, MUSIC_HEADERS.length).getValues() : [];
  var byId = {};
  for (var i = 0; i < rows.length; i++) byId[String(rows[i][MC.ID - 1])] = { row: i + 2, v: rows[i] };

  var seen = {}, added = 0, updated = 0, bad = 0;
  var it = musicFolder_().getFiles();
  while (it.hasNext()) {
    var f = it.next(), id = f.getId();
    seen[id] = 1;
    var info = null, probe = null, bytes = null;
    try { bytes = f.getBlob().getBytes(); info = wavInfo_(bytes); } catch (e) { info = null; }
    // خودِ موج اندازه گرفته می‌شود، نه نامِ فایل. دانلودِ ناقص، سکوت و فایلِ
    // خراب همین‌جا گیر می‌افتند — نه بعداً وسطِ قسمت.
    try { probe = info ? musicProbe_(bytes, info) : null; } catch (eP) { probe = null; }
    var vd = musicVerdict_(probe);
    var fmt = !info ? 'قالب ناسازگار (فقط WAV)'
                    : (!vd.ok ? 'ردشد: ' + vd.why
                       : (musicNative_(info) ? 'آماده'
                          : info.rate + 'Hz/' + info.channels + 'ch/' + info.bits + 'bit — تبدیل هنگام استفاده'));
    var sec = info ? Math.round(info.seconds) : 0;
    if (!info || !vd.ok) bad++;
    var meta = musicMeta_(f.getName());
    var probeTxt = probe ? (musicTexture_(probe) + ' · بلندی ' + probe.rms +
                            ' · سکوت ' + probe.silentPct + '٪') : '';
    var srcTxt = meta ? (String(meta.title || '') + ' — ' + String(meta.url || '') +
                         (meta.license ? ' (' + meta.license + ')' : '')) : '';

    if (byId[id]) {
      var r = byId[id];
      if (String(r.v[MC.SEC - 1]) !== String(sec) || String(r.v[MC.FMT - 1]) !== fmt ||
          String(r.v[MC.PROBE - 1] || '') !== probeTxt) {
        sh.getRange(r.row, MC.SEC, 1, 2).setValues([[sec, fmt]]);
        sh.getRange(r.row, MC.PROBE).setValue(probeTxt);
        if (srcTxt && !String(r.v[MC.SRC - 1] || '').trim()) sh.getRange(r.row, MC.SRC).setValue(srcTxt);
        updated++;
      }
      // ردیف‌هایی که پیش از افزوده‌شدنِ ستونِ لینک ساخته شده‌اند
      if (!String(r.v[MC.LINK - 1] || '').trim()) {
        try { sh.getRange(r.row, MC.LINK).setValue(musicUrl_(id)); } catch (eL) {}
      }
    } else {
      // نوع و جایگاه از شناسنامهٔ منبع می‌آید اگر باشد، وگرنه از اندازه‌گیری.
      // نامِ فایل آخرین گزینه است، چون کمترین اعتبار را دارد.
      var kind = meta && meta.kind ? String(meta.kind)
                 : ((probe && probe.seconds <= 8 && probe.steadiness < 60) ? 'افکت' : 'موسیقی');
      var slots = meta && meta.slots ? String(meta.slots) : (kind === 'افکت' ? 'میانه' : 'شروع، پایان');
      sh.appendRow([id, f.getName(), kind, (meta && meta.mood) || '', slots, sec, fmt,
                    (meta && meta.gain) || 1, 0, '', '', probeTxt, srcTxt,
                    musicUrl_(id)]);
      added++;
    }
  }

  // فایلی که از پوشه برداشته شده، ردیفش می‌ماند ولی نشان می‌خورد — تاریخچهٔ
  // استفاده‌اش نباید گم شود.
  var gone = 0;
  for (var k in byId) {
    if (!byId.hasOwnProperty(k) || seen[k]) continue;
    if (String(byId[k].v[MC.FMT - 1]).indexOf('نیست') !== -1) continue;
    sh.getRange(byId[k].row, MC.FMT).setValue('فایل در پوشه نیست');
    gone++;
  }
  logLine_('بانکِ موسیقی: ' + added + ' تازه، ' + updated + ' به‌روز، ' +
           bad + ' ناسازگار، ' + gone + ' ناموجود.');
  return { added: added, updated: updated, bad: bad, gone: gone };
}

/** ردیف‌های قابلِ استفادهٔ بانک. */
function musicBank_(hub) {
  var sh = (hub || getHub_()).getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh || sh.getLastRow() < 2) return [];
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    var fmt = String(v[i][MC.FMT - 1] || '');
    if (!v[i][MC.ID - 1]) continue;
    if (fmt.indexOf('ناسازگار') !== -1 || fmt.indexOf('نیست') !== -1) continue;
    out.push({
      row: i + 2, id: String(v[i][MC.ID - 1]), name: String(v[i][MC.NAME - 1] || ''),
      kind: String(v[i][MC.KIND - 1] || 'موسیقی'),
      mood: String(v[i][MC.MOOD - 1] || ''),
      slots: String(v[i][MC.SLOTS - 1] || ''),
      sec: Number(v[i][MC.SEC - 1]) || 0,
      probe: String(v[i][MC.PROBE - 1] || ''),
      src: String(v[i][MC.SRC - 1] || ''),
      gain: (Number(v[i][MC.GAIN - 1]) > 0 ? Number(v[i][MC.GAIN - 1]) : 1),
      used: Number(v[i][MC.USED - 1]) || 0,
      lastAt: String(v[i][MC.LAST - 1] || '')
    });
  }
  return out;
}

/**
 * انتخابِ قطعه‌ها برای یک قسمت.
 *
 * ترتیبِ ترجیح: آنچه مدل گفته (اگر شناسه‌اش در بانک باشد)، وگرنه قاعده —
 * هم‌خوانیِ حال‌وهوا با دستهٔ قسمت، و در برابری، کم‌مصرف‌ترین و قدیمی‌ترین.
 * «استفادهٔ دوباره» ممنوع نیست؛ فقط دیرتر نوبتش می‌شود.
 */
function musicPick_(bank, slot, moodWords, wantedId) {
  var cands = [];
  for (var i = 0; i < bank.length; i++) {
    var b = bank[i];
    if (b.slots && b.slots.indexOf(slot) === -1) continue;
    if (!b.sec) continue;
    cands.push(b);
  }
  if (!cands.length) return null;
  if (wantedId) {
    for (var w = 0; w < cands.length; w++) if (cands[w].id === String(wantedId)) return cands[w];
  }
  var words = String(moodWords || '').split(/[\s،,]+/).filter(Boolean);
  var score = function (b) {
    var s = 0;
    for (var m = 0; m < words.length; m++) {
      if (words[m] && b.mood && b.mood.indexOf(words[m]) !== -1) s += 3;
    }
    s -= Math.min(b.used, 5) * 0.5;          // کم‌مصرف‌تر، جلوتر
    return s;
  };
  cands.sort(function (a, b) {
    var d = score(b) - score(a);
    if (d) return d;
    return String(a.lastAt).localeCompare(String(b.lastAt));
  });
  return cands[0];
}

/** ثبتِ استفاده در تب، تا هم تاریخچه بماند هم نوبت‌دهی درست کار کند. */
function musicMarkUsed_(hub, picks, epLabel, showName) {
  hub = hub || getHub_();
  var sh = hub.getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh) return 0;
  var n = 0, hist = [];
  for (var i = 0; i < (picks || []).length; i++) {
    var p = picks[i];
    if (!p || !p.row) continue;
    try {
      sh.getRange(p.row, MC.USED).setValue((Number(p.used) || 0) + 1);
      sh.getRange(p.row, MC.LAST).setValue(nowStr_() + ' — ' + String(epLabel || ''));
      n++;
    } catch (e) {}
    hist.push([nowStr_(), String(showName || ''), String(epLabel || ''),
               String(p.slot || '—'), p.name, p.kind, p.mood, p.gain, p.sec,
               musicUrl_(p.id)]);
  }
  // تاریخچه: شمارنده می‌گوید «چند بار»، این می‌گوید «کجا و در چه جایگاهی».
  if (hist.length) {
    try {
      var hs = ensureTab_(hub, CFG.MUSE_TAB || 'کاربردِ موسیقی', MUSE_HEADERS);
      hs.getRange(hs.getLastRow() + 1, 1, hist.length, MUSE_HEADERS.length).setValues(hist);
    } catch (eH) { logLine_('تاریخچهٔ موسیقی نوشته نشد: ' + eH.message); }
  }
  return n;
}

/* ──────────────────── چسباندنِ موسیقی به تکه‌های قسمت ──────────────────── */

/**
 * تکه‌های آمادهٔ صداگذاری را می‌گیرد و تکه‌های موسیقی را لای آن‌ها می‌گذارد.
 *
 * تکهٔ موسیقی با `pcm` می‌آید، نه `text`. حلقهٔ صداگذاری این را می‌فهمد و
 * به‌جای فرستادن به مدل، همان رشته را مستقیم در بافر می‌ریزد — یعنی موسیقی
 * هیچ هزینه‌ای به سهمیهٔ مدل تحمیل نمی‌کند.
 *
 * جایگاه‌ها: «شروع» پیش از همه، «پایان» پس از همه، و «میانه» بینِ بخش‌ها.
 * میانه‌ها عمداً کم‌اند: یک قطعهٔ کوتاه سرِ هر چند بخش، نه سرِ هر بخش — وگرنه
 * قسمت به‌جای برنامه، مجموعه‌ای از جینگل می‌شود.
 */
/** کلیدِ نقشه: برنامه + قسمت. بی شمارهٔ قسمت، حافظه بی‌معناست. */
function musicPlanKey_(opt) {
  var show = String((opt && opt.show) || '').trim();
  var ep = String((opt && opt.episode) || '').trim();
  return (show && ep) ? (show + '#' + ep) : '';
}

/** نقشهٔ ذخیره‌شدهٔ همین قسمت، اگر باشد. */
function musicPlanCacheGet_(key) {
  try {
    var m = JSON.parse(props_().getProperty(PK.MUSIC_PLAN) || '{}');
    return m && m[key] ? m[key] : null;
  } catch (e) { return null; }
}

/** ذخیره — فقط دو خانه می‌ماند (یکی برای هر برنامه)، پس انباشته نمی‌شود. */
function musicPlanCachePut_(key, plan) {
  try {
    var m = {};
    try { m = JSON.parse(props_().getProperty(PK.MUSIC_PLAN) || '{}') || {}; } catch (e0) {}
    var show = String(key).split('#')[0];
    // خانهٔ همان برنامه بازنویسی می‌شود؛ قسمتِ تازه، نقشهٔ تازه.
    for (var k in m) {
      if (Object.prototype.hasOwnProperty.call(m, k) &&
          String(k).split('#')[0] === show && k !== key) delete m[k];
    }
    m[key] = plan;
    props_().setProperty(PK.MUSIC_PLAN, JSON.stringify(m));
  } catch (e) {}
}

function musicWrap_(chunks, hub, opt) {
  opt = opt || {};
  if (CFG.MUSIC_ENABLED === false) return { chunks: chunks, picks: [] };
  var bank = [];
  try { bank = musicBank_(hub); } catch (e) { return { chunks: chunks, picks: [] }; }

  // بانکِ خالی هم باید خواسته بنویسد — وگرنه بن‌بست است: موسیقی نیست چون
  // بانک خالی است، و بانک خالی می‌ماند چون هیچ‌کس نگفته چه چیزی لازم است.
  // خواسته تنها چیزی است که تسکِ غنی‌سازی از آن می‌فهمد باید چه دانلود کند،
  // پس این تنها راهِ راه‌افتادنِ بانک از صفر است.
  if (!bank.length) {
    var want0 = ['شروع', 'پایان'];
    if (Math.max(0, Number(CFG.MUSIC_BRIDGE_EVERY) || 0)) want0.push('میانه');
    var mood0 = String(opt.mood || opt.category || '');
    try { musicWish_(mood0, want0, opt); } catch (eW0) {}
    logLine_('بانکِ موسیقی خالی است؛ خواستهٔ ' + want0.join('، ') + ' نوشته شد.');
    return { chunks: chunks, picks: [], mood: mood0, missing: want0 };
  }

  var mood = String(opt.mood || opt.category || '');
  var plan = opt.plan || {};

  // حالتِ خودکار: پیش از هر چیز از مدل می‌پرسیم. چیزی که به او می‌دهیم عنوان و
  // سرِ بخش‌ها و گویندگانِ همین قسمت است، نه فقط برچسبِ دسته — حال‌وهوا را
  // این‌ها می‌سازند. اگر چیزی نداد یا شناسه‌اش در بانک نبود، قاعده جایش را
  // می‌گیرد و هیچ‌چیز زمین نمی‌ماند.
  if (CFG.MUSIC_AUTO !== false && !plan.introId && !plan.outroId) {
    // نقشه یک بار برای هر قسمت ساخته می‌شود، نه هر بار از سرگیری.
    //
    // ══ باگی که این را لازم کرد و هنوز دیده نشده بود ══
    // صداگذاریِ یک قسمت به‌خاطرِ مهلتِ شش‌دقیقه‌ای چند بار از سر گرفته می‌شود، و
    // هر بار buildChunks_/buildSpecialChunks_ از نو اجرا می‌شود — یعنی
    // musicWrap_ هم. تا امروز این یعنی هر اجرا یک پرسشِ تازه از مدل، با پاسخی
    // که می‌توانست قطعه‌های دیگری باشد. ولی synthesizeStep_ از chunkIdxِ ذخیره‌شده
    // ادامه می‌دهد — شماره‌ای که روی آرایهٔ *قبلی* گرفته شده بود. اگر نقشهٔ تازه
    // یک میانهٔ کمتر یا بیشتر بگذارد، همهٔ شماره‌ها می‌لغزند و قسمت یا تکه‌ای را
    // جا می‌اندازد یا دوباره می‌گوید — بی هیچ خطایی، فقط در صدا شنیده می‌شود.
    // امروز پنهان است چون بانک خالی است و این شاخه اصلاً اجرا نمی‌شود؛ روزی که
    // اولین فایل در پوشه بنشیند، پیدا می‌شد.
    var ck = musicPlanKey_(opt);
    var cached = ck ? musicPlanCacheGet_(ck) : null;
    var mp = cached || musicPlanModel_(bank, opt);
    if (mp) {
      plan = { introId: mp.introId, introStart: mp.introStart,
               bridgeId: mp.bridgeId, bridgeStart: mp.bridgeStart,
               outroId: mp.outroId, outroStart: mp.outroStart,
               bridges: mp.bridges || [], sfx: mp.sfx || [],
               mood: mp.mood || '', gain: mp.gain || '', why: mp.why || '' };
      if (mp.mood) mood = mp.mood;
      if (mp.gain) opt.gain = mp.gain;
      if (!cached) {
        if (ck) musicPlanCachePut_(ck, plan);
        logLine_('حال‌وهوای موسیقیِ این قسمت: ' + mood + (mp.why ? ' — ' + mp.why : ''));
      }
    }
  }

  var picks = [], out = [];

  var clipOf = function (b, slot, secs) {
    if (!b) return '';
    var len = Math.min(secs, b.sec || secs);
    var fade = Math.min(Number(CFG.MUSIC_FADE_SEC) || 2, len / 2);
    return musicClip_(b.id, {
      startSec: Number(plan[slot + 'Start']) || 0, lenSec: len,
      gain: b.gain * (Number(opt.gain) > 0 ? Number(opt.gain) : (Number(CFG.MUSIC_GAIN) || 1)),
      fadeIn: fade, fadeOut: fade
    });
  };

  var intro = musicPick_(bank, 'شروع', mood, plan.introId);
  if (intro) {
    var ib = clipOf(intro, 'intro', Number(CFG.MUSIC_INTRO_SEC) || 8);
    if (ib) { out.push({ pcm: ib, label: 'موسیقیِ آغاز — ' + intro.name });
              intro.slot = 'شروع'; picks.push(intro); }
  }

  /* ── موسیقیِ میانه: سرِ مرزِ بخش‌ها، نه هر چند تکه ──
     تا ۵٫۴۹ این‌طور بود: یک قطعه یک بار انتخاب می‌شد و هر `every` تکهٔ صوتی
     یک بار تکرار می‌شد. ولی «تکه» بخش نیست — splitForTts_ هر بخش را از روی
     سقفِ نویسه می‌شکند، پس شمارش روی تکه‌ها یعنی موسیقی می‌توانست وسطِ
     روایتِ یک بخش بیفتد و حرف را قطع کند. و چون یک قطعه بیشتر نبود، همان
     یکی هر بار تکرار می‌شد.

     حالا: جای مجاز فقط مرزِ قطعه‌هاست (`bounds`)، مدل می‌گوید کدام مرز و
     کدام قطعه، و کد اعتبارسنجی می‌کند. اگر مدل چیزی نگفت، حداکثر یک قطعه
     سرِ نزدیک‌ترین مرز به میانهٔ برنامه — نه بیشتر. */
  var bounds = (opt.bounds || []).filter(function (b) {
    // آغازِ برنامه و آغازِ نخستین بخش جای موسیقی نیست؛ پایان هم موسیقیِ
    // خودش را دارد.
    return b && b.at > 0 && b.kind !== 'hook' && b.kind !== 'outro';
  });
  var maxBr = Math.max(0, Number(CFG.MUSIC_BRIDGE_MAX) || 0);
  var want = [];

  for (var bi = 0; bi < (plan.bridges || []).length && want.length < maxBr; bi++) {
    var pb = plan.bridges[bi];
    var k = parseInt(faDigits_(String(pb.after)), 10);
    if (!isFinite(k) || k < 0 || k >= bounds.length) continue;
    var tr = null;
    for (var tz = 0; tz < bank.length; tz++) if (bank[tz].id === pb.id) tr = bank[tz];
    if (!tr) continue;
    if (tr.slots && tr.slots.indexOf('میانه') === -1) continue;
    var dup = false;
    for (var dz = 0; dz < want.length; dz++) if (want[dz].at === bounds[k].at) dup = true;
    if (dup) continue;
    want.push({ at: bounds[k].at, track: tr, why: String(pb.why || ''),
                head: bounds[k].heading });
  }

  // پشتوانه: مدل خاموش بود یا چیزی نداد. یک قطعه، سرِ مرزِ میانه.
  if (!want.length && maxBr && bounds.length) {
    var fb = musicPick_(bank, 'میانه', mood, plan.bridgeId);
    if (fb) {
      var mid = bounds[Math.floor(bounds.length / 2)];
      want.push({ at: mid.at, track: fb, why: 'میانهٔ برنامه', head: mid.heading });
    }
  }

  var atMap = {};
  for (var wz = 0; wz < want.length; wz++) atMap[want[wz].at] = want[wz];

  for (var i = 0; i < chunks.length; i++) {
    var w = atMap[i];
    if (w) {
      var bb = clipOf(w.track, 'bridge', Number(CFG.MUSIC_BRIDGE_SEC) || 4);
      if (bb) {
        out.push({ pcm: bb, label: 'موسیقیِ میانه — ' + w.track.name +
                        (w.head ? ' (پیش از «' + w.head + '»)' : '') });
        w.track.slot = 'میانه';
        if (picks.indexOf(w.track) === -1) picks.push(w.track);
      }
    }
    out.push(chunks[i]);
  }
  var bridge = want.length ? want[0].track : null;

  var outro = musicPick_(bank, 'پایان', mood, plan.outroId);
  if (outro) {
    var ob = clipOf(outro, 'outro', Number(CFG.MUSIC_OUTRO_SEC) || 10);
    if (ob) { out.push({ pcm: ob, label: 'موسیقیِ پایان — ' + outro.name });
              outro.slot = 'پایان'; picks.push(outro); }
  }

  // ── افکت‌ها ──
  // تا ۵٫۴۸ این تکه نبود: sfxAllow_ نوشته و آزموده شده بود ولی هیچ‌جا صدا
  // زده نمی‌شد، پس هیچ افکتی در هیچ قسمتی پخش نمی‌شد. مدل پیشنهاد می‌دهد،
  // sfxAllow_ خویشتن‌داری را اعمال می‌کند (واژه باید ساختاری باشد؛ درس‌نامه
  // اصلاً افکت نمی‌گیرد) و کد قطعه را سرِ همان بخش می‌گذارد.
  try {
    var okSfx = sfxAllow_(opt.sections || [], (plan.sfx || []), String(opt.show || ''));
    for (var sx = 0; sx < okSfx.length; sx++) {
      var eb = null;
      for (var bz = 0; bz < bank.length; bz++) if (bank[bz].id === okSfx[sx].id) eb = bank[bz];
      if (!eb) continue;
      var ec = musicClip_(eb.id, { startSec: 0,
                 lenSec: Math.min(eb.sec || 4, Number(CFG.MUSIC_BRIDGE_SEC) || 4),
                 gain: eb.gain * (Number(opt.gain) > 0 ? Number(opt.gain) : (Number(CFG.MUSIC_GAIN) || 1)),
                 fadeIn: 0.3, fadeOut: 0.6 });
      if (!ec) continue;
      // پیش از روایتِ همان بخش می‌نشیند، نه وسطِ جمله
      var at = idxOfSection_(out, Number(okSfx[sx].section));
      var piece = { pcm: ec, label: 'افکت — ' + eb.name + ' (' + okSfx[sx].why + ')' };
      if (at >= 0) out.splice(at, 0, piece); else out.push(piece);
      eb.slot = 'افکت'; picks.push(eb);
    }
  } catch (eSx) { logLine_('افکت افزوده نشد: ' + eSx.message); }

  // جایگاهی که بانک برایش چیزی نداشت، خواسته می‌شود — تا تسکِ غنی‌سازی
  // بتواند قطعهٔ مناسب را پیدا و در پوشه بگذارد.
  var missing = [];
  if (!intro) missing.push('شروع');
  if (!outro) missing.push('پایان');
  // «میانه» فقط وقتی خواسته می‌شود که جای مناسبی برایش بود ولی قطعه نبود.
  // اگر خودِ برنامه مرزی نداشت، نبودِ موسیقیِ میانه کمبود نیست.
  if (maxBr && bounds.length && !bridge) missing.push('میانه');
  if (missing.length) { try { musicWish_(mood, missing, opt); } catch (eW) {} }

  if (picks.length) {
    logLine_('موسیقیِ قسمت: ' + picks.map(function (p) { return p.name; }).join(' · '));
  }
  return { chunks: out, picks: picks, mood: mood, missing: missing };
}

/**
 * آنچه در این قسمت واقعاً پخش شد — برای دیده‌شدن در وضعیت و گزارش.
 *
 * بی این، موسیقی همان نقطهٔ کوری می‌شد که درس‌نامه بود: کار انجام می‌شد یا
 * نمی‌شد و هیچ ناظری — آدم یا کد — نمی‌توانست تفاوتش را ببیند.
 */
/** نخستین تکهٔ گفتاریِ بخشِ n در فهرستِ خروجی؛ -۱ اگر پیدا نشد. */
function idxOfSection_(out, n) {
  if (!isFinite(n) || n < 0) return -1;
  var seen = -1;
  for (var i = 0; i < out.length; i++) {
    if (out[i] && out[i].pcm) continue;      // تکهٔ موسیقی بخش حساب نمی‌شود
    seen++;
    if (seen === n) return i;
  }
  return -1;
}

function musicRemember_(mw, epLabel) {
  try {
    props_().setProperty(PK.MUSIC_LAST, JSON.stringify({
      at: nowStr_(), episode: String(epLabel || ''),
      mood: String((mw && mw.mood) || ''),
      tracks: ((mw && mw.picks) || []).map(function (p) { return p.name; }),
      missing: (mw && mw.missing) || []
    }));
  } catch (e) {}
}

/** وضعیتِ بانک و آخرین استفاده — بی‌شبکه، برای _STATUS.json. */
function musicStatus_() {
  var out = { enabled: CFG.MUSIC_ENABLED !== false, auto: CFG.MUSIC_AUTO !== false,
              tracks: 0, last: null };
  try {
    var sh = getHub_().getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(2, MC.FMT, sh.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < v.length; i++) {
        var f = String(v[i][0] || '');
        if (f && f.indexOf('ناسازگار') === -1 && f.indexOf('نیست') === -1) out.tracks++;
      }
    }
  } catch (e) {}
  try { out.last = JSON.parse(props_().getProperty(PK.MUSIC_LAST) || 'null'); } catch (e2) {}
  return out;
}

/** منو: پویشِ بانک. */
function runMusicScan() {
  var r = musicScan_();
  var bank = musicBank_();
  var ui = ui_();
  var L = ['پوشه: ' + (CFG.MUSIC_FOLDER || 'موسیقی و افکت') + ' (در OUTPUT)',
           'تب: ' + (CFG.MUSIC_TAB || 'موسیقی'), '',
           'تازه: ' + r.added + ' · به‌روز: ' + r.updated +
           ' · ناسازگار: ' + r.bad + ' · ناموجود: ' + r.gone,
           'آمادهٔ استفاده: ' + bank.length + ' قطعه', ''];
  if (r.bad) L.push('⚠️ فایلِ ناسازگار یعنی WAV نیست. رمزگشاییِ MP3 در Apps Script ممکن نیست.');
  L.push('در تب، ستون‌های «حال‌وهوا» و «مناسب برای» را خودتان پر کنید:',
         '  حال‌وهوا: چند واژه، مثل «آرام، امیدوار، خبری»',
         '  مناسب برای: از میانِ «شروع»، «پایان»، «میانه» — با کاما',
         '  بلندی: عددی مثل 0.6 (پیش‌فرض ۱)');
  if (ui) ui.alert('🎵 بانکِ موسیقی', L.join('\n'), ui.ButtonSet.OK);
  return r;
}

/** منو: پویش + برچسبِ خودکار، یک‌جا. */
function runMusicAuto() {
  var ui = ui_();
  var r = musicScan_();
  var t = { tagged: 0 };
  try { t = musicAutoTag_(); } catch (e) {}
  var bank = musicBank_();
  var L = ['پویش: ' + r.added + ' تازه · ' + r.updated + ' به‌روز · ' +
           r.bad + ' ناسازگار · ' + r.gone + ' ناموجود',
           'برچسبِ خودکار برای ' + t.tagged + ' قطعهٔ تازه ثبت شد.',
           'آمادهٔ استفاده: ' + bank.length + ' قطعه', '',
           'حالتِ خودکار: ' + (CFG.MUSIC_AUTO === false ? 'خاموش' : 'روشن') + '.',
           'در حالتِ روشن، برای هر قسمت خودِ سیستم از روی عنوان، سرِ بخش‌ها و',
           'گویندگان تصمیم می‌گیرد کدام قطعه، از کدام ثانیه، و با چه بلندی.',
           '', 'هر ستونی که خودتان پر کنید، دستِ سیستم به آن نمی‌خورد.'];
  var wish = null;
  try { wish = getOutJson_(MUSIC_WISH_()); } catch (e2) {}
  if (wish && wish.items && wish.items.length) {
    var last = wish.items[wish.items.length - 1];
    L.push('', '📝 آخرین خواسته: ' + (last.slots || []).join('، ') +
           ' با حال‌وهوای «' + last.mood + '» — در _MUSIC-WISH.json');
  }
  if (ui) ui.alert('🎵 بانکِ موسیقی — خودکار', L.join('\n'), ui.ButtonSet.OK);
  return { scan: r, tag: t, ready: bank.length };
}

/* ─────────────── حالتِ خودکار: برچسب‌زدن و انتخاب با مدل ─────────────── */

var MUSIC_TAG_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          mood: { type: 'string' },
          slots: { type: 'string' },
          gain: { type: 'string' }
        },
        required: ['id', 'mood', 'slots']
      }
    }
  },
  required: ['items']
};

/**
 * برچسب‌زدنِ خودکارِ قطعه‌های تازهٔ بانک.
 *
 * مدل صدا نمی‌شنود؛ آنچه دارد نامِ فایل و مدتِ آن است. برای بانکی که آدم پر
 * می‌کند این کافی است، چون نامِ فایل‌های موسیقی تقریباً همیشه توصیفی است
 * («calm-piano-intro», «باران-شهر»). حدس‌ها با نشانِ «خودکار» ثبت می‌شوند تا
 * معلوم باشد کدام را آدم گفته و کدام را ماشین.
 *
 * ستونی که آدم پر کرده باشد هرگز بازنویسی نمی‌شود — نه اینجا، نه در پویش.
 */
function musicAutoTag_(hub) {
  hub = hub || getHub_();
  var sh = hub.getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh || sh.getLastRow() < 2) return { tagged: 0 };
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();

  var need = [];
  for (var i = 0; i < v.length; i++) {
    var fmt = String(v[i][MC.FMT - 1] || '');
    if (!v[i][MC.ID - 1] || fmt.indexOf('ناسازگار') !== -1 || fmt.indexOf('نیست') !== -1) continue;
    if (String(v[i][MC.MOOD - 1] || '').trim()) continue;      // آدم گفته — دست نزن
    need.push({ row: i + 2, id: String(v[i][MC.ID - 1]),
                name: String(v[i][MC.NAME - 1] || ''), sec: Number(v[i][MC.SEC - 1]) || 0 });
  }
  if (!need.length) return { tagged: 0 };

  var lines = need.map(function (n) {
    return '• شناسه ' + n.id + ' | نام فایل: «' + n.name + '» | مدت: ' + n.sec + ' ثانیه';
  });
  var prompt = [
    'تو سرپرستِ موسیقیِ یک برنامهٔ رادیوییِ فارسی هستی.',
    'برای هر قطعهٔ زیر، از روی نامِ فایل و مدتش حدس بزن:',
    '  mood: دو تا چهار واژهٔ فارسی برای حال‌وهوا (مثل «آرام، امیدوار» یا «کوبنده، خبری»).',
    '  slots: از میانِ «شروع»، «پایان»، «میانه» — با کاما. قطعهٔ کوتاه‌تر از ۱۵ ثانیه',
    '         معمولاً «میانه» است؛ قطعهٔ بلند برای «شروع» و «پایان».',
    '  gain: عددی بین ۰٫۳ تا ۱ — قطعهٔ پرهیاهو عددِ کمتر بگیرد.',
    'اگر نامِ فایل چیزی نمی‌گوید، حال‌وهوای خنثی بده؛ از خودت داستان نساز.',
    '', lines.join('\n')
  ].join('\n');

  var res = null;
  try { res = geminiText_(prompt, MUSIC_TAG_SCHEMA, 4096); } catch (e) {
    logLine_('برچسب‌زنیِ خودکارِ موسیقی انجام نشد: ' + e.message);
    return { tagged: 0 };
  }
  var items = (res && res.items) || [];
  var byId = {};
  for (var k = 0; k < items.length; k++) byId[String(items[k].id)] = items[k];

  var n = 0;
  for (var q = 0; q < need.length; q++) {
    var it = byId[need[q].id];
    if (!it) continue;
    var gain = Number(it.gain);
    if (!(gain > 0 && gain <= 1)) gain = 0.8;
    sh.getRange(need[q].row, MC.MOOD).setValue(String(it.mood || '').slice(0, 80));
    sh.getRange(need[q].row, MC.SLOTS).setValue(String(it.slots || 'شروع، پایان').slice(0, 60));
    sh.getRange(need[q].row, MC.GAIN).setValue(gain);
    sh.getRange(need[q].row, MC.NOTE).setValue('خودکار — می‌توانید عوضش کنید');
    n++;
  }
  if (n) logLine_('برچسبِ خودکار برای ' + n + ' قطعهٔ موسیقی ثبت شد.');
  return { tagged: n };
}

var MUSIC_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    // همهٔ فیلدها رشته‌اند، حتی عددها. تجربهٔ همین ریپو: مدل قالبی را که
    // نوعِ integer/number/boolean داشته باشد رد می‌کند. تبدیل با Number()
    // در همین‌جا انجام می‌شود و مقدارِ بیرون از بازه دور ریخته می‌شود.
    introId: { type: 'string' }, introStart: { type: 'string' },
    bridgeId: { type: 'string' }, bridgeStart: { type: 'string' },
    outroId: { type: 'string' }, outroStart: { type: 'string' },
    gain: { type: 'string' },
    mood: { type: 'string' },
    why: { type: 'string' },
    // پیشنهادِ افکت. مدل می‌گوید «کدام واژه، در کدام بخش، با کدام قطعه» —
    // ولی خودش تصمیم نمی‌گیرد: sfxAllow_ ساختاری‌بودنِ واژه را می‌سنجد و
    // هرچه گذرا باشد رد می‌شود. همه رشته، مثل بقیه.
    // موسیقیِ میانه: مدل می‌گوید بینِ کدام دو بخش و با کدام قطعه. تا ۵٫۴۹
    // یک قطعه انتخاب می‌شد و هر چند تکه یک بار کورکورانه تکرار می‌شد — که
    // می‌توانست وسطِ روایتِ یک بخش بیفتد.
    bridges: {
      type: 'array',
      items: {
        type: 'object',
        properties: { after: { type: 'string' }, id: { type: 'string' },
                      why: { type: 'string' } },
        required: ['after', 'id']
      }
    },
    sfx: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, word: { type: 'string' },
                      section: { type: 'string' } },
        required: ['id', 'word', 'section']
      }
    }
  },
  required: ['mood']
};

/**
 * انتخابِ موسیقیِ یک قسمت به‌دستِ مدل.
 *
 * چیزی که به مدل داده می‌شود عمداً بیش از «دستهٔ قسمت» است: عنوان، سرِ بخش‌ها،
 * و گویندگانی که قرار است بخوانند. حال‌وهوای یک قسمت را همین‌ها می‌سازند، نه
 * برچسبِ دسته؛ دو قسمتِ «علمی و آموزشی» می‌توانند یکی آرام باشد و یکی کوبنده.
 *
 * خروجی وارسی می‌شود: شناسه‌ای که در بانک نباشد دور ریخته می‌شود و همان‌جا
 * قاعدهٔ قدیمی جایش را می‌گیرد. مدل پیشنهاد می‌دهد، تصمیمِ نهایی با کد است.
 */
function musicPlanModel_(bank, ctx) {
  if (CFG.MUSIC_AUTO === false || !bank.length) return null;
  var list = bank.slice(0, 60).map(function (b) {
    return '• ' + b.id + ' | «' + b.name + '» | حال‌وهوا: ' + (b.mood || '—') +
           ' | مناسب: ' + (b.slots || '—') + ' | مدت: ' + b.sec + 'ث | بارِ استفاده: ' + b.used;
  }).join('\n');

  // مرزهای مجاز، با همان شماره‌ای که مدل باید در `after` برگرداند
  var brd = (ctx.bounds || []).filter(function (b) {
    return b && b.at > 0 && b.kind !== 'hook' && b.kind !== 'outro';
  });
  var brdList = brd.map(function (b, i) {
    return '  ' + i + ') پیش از بخشِ «' + (b.heading || '—') + '»';
  }).join('\n');

  var prompt = [
    'تو سرپرستِ موسیقیِ یک برنامهٔ رادیوییِ فارسی هستی و باید برای این قسمت،',
    'موسیقیِ آغاز و پایان و یک قطعهٔ میانه انتخاب کنی.',
    '',
    'قسمت:',
    '  عنوان: ' + String(ctx.title || '—'),
    '  دسته: ' + String(ctx.category || '—'),
    '  سرِ بخش‌ها: ' + String(ctx.headings || '—'),
    '  گویندگان: ' + String(ctx.cast || '—'),
    '',
    'قاعده‌ها:',
    '  ۱) فقط از شناسه‌های همین فهرست انتخاب کن. شناسهٔ ساختگی ممنوع.',
    '  ۲) هر قطعه را برای همان جایی بگذار که ستونِ «مناسب» اجازه داده.',
    '  ۳) اگر قطعه بلند است، introStart/outroStart را طوری بده که بهترین جای',
    '     قطعه شنیده شود (ثانیه). اگر نمی‌دانی، صفر بده.',
    '  ۴) gain بین ۰٫۳ تا ۱: هرچه متن جدی‌تر و آرام‌تر، موسیقی آرام‌تر.',
    '  ۵) mood را در دو تا چهار واژه بنویس — همان حال‌وهوایی که این قسمت',
    '     باید بدهد. اگر هیچ قطعه‌ای مناسب نبود، شناسه‌ها را خالی بگذار ولی',
    '     mood را حتماً بنویس؛ از روی همان، قطعهٔ تازه تهیه می‌شود.',
    '  ۶) قطعه‌ای که بارِ استفاده‌اش کمتر است در شرایطِ برابر بهتر است.',
    '  ۷) موسیقیِ میانه: فقط اگر واقعاً لازم است. جای مجازش فقط مرزهای زیر',
    '     است (شمارهٔ مرز را در `after` بده) — یعنی بینِ دو بخش، نه وسطِ',
    '     حرف. حداکثر ' + (Number(CFG.MUSIC_BRIDGE_MAX) || 2) + ' تا، و',
    '     ترجیحاً وقتی موضوع از این بخش به بخشِ بعد واقعاً عوض می‌شود.',
    '     اگر برنامه یکدست است و جایی برای نفس‌کشیدن لازم ندارد، bridges را',
    '     خالی بگذار — موسیقیِ بی‌مناسبت بدتر از نبودنش است.',
    '',
    '--- مرزهای مجاز برای موسیقیِ میانه ---',
    (brdList || '[این قسمت مرزِ مناسبی ندارد]'),
    '',
    '--- بانکِ موسیقی ---',
    list
  ].join('\n');

  try {
    var r = geminiText_(prompt, MUSIC_PLAN_SCHEMA, 2048);
    if (!r) return null;
    var ok = {};
    for (var i = 0; i < bank.length; i++) ok[bank[i].id] = 1;
    var keep = function (id) { return (id && ok[String(id)]) ? String(id) : ''; };
    return {
      introId: keep(r.introId), introStart: Number(r.introStart) || 0,
      bridgeId: keep(r.bridgeId), bridgeStart: Number(r.bridgeStart) || 0,
      outroId: keep(r.outroId), outroStart: Number(r.outroStart) || 0,
      gain: (Number(r.gain) > 0 && Number(r.gain) <= 1) ? Number(r.gain) : 0,
      mood: String(r.mood || ''), why: String(r.why || ''),
      // شناسهٔ بیرونِ بانک همین‌جا دور ریخته می‌شود؛ مدل نمی‌تواند قطعهٔ
      // ساختگی به قسمت تحمیل کند.
      bridges: (r.bridges || []).map(function (x) {
        return { after: String((x && x.after) || ''), id: keep(x && x.id),
                 why: String((x && x.why) || '') };
      }).filter(function (x) { return x.id; }),
      sfx: (r.sfx || []).map(function (x) {
        return { id: keep(x && x.id), word: String((x && x.word) || ''),
                 section: String((x && x.section) || '') };
      }).filter(function (x) { return x.id && x.word; })
    };
  } catch (e) {
    logLine_('انتخابِ خودکارِ موسیقی انجام نشد: ' + e.message);
    return null;
  }
}

/**
 * وقتی بانک چیزی برای یک جایگاه ندارد، خواسته را می‌نویسد.
 *
 * موتور خودش نمی‌تواند موسیقی پیدا و دانلود کند؛ این کارِ تسکِ غنی‌سازی است
 * که به اینترنت دسترسی دارد. پس همان‌طور که برای متن درخواست می‌گذارد، اینجا
 * هم یک فایلِ خواسته در OUTPUT می‌گذارد. اگر کسی برش ندارد، هیچ چیز خراب
 * نمی‌شود — قسمت بی‌موسیقی ساخته می‌شود.
 */
function musicWish_(mood, missing, ctx) {
  if (!missing || !missing.length) return null;
  try {
    var prev = getOutJson_(MUSIC_WISH_()) || { items: [] };
    var items = (prev.items || []).slice(-20);

    var rec = {
      at: nowStr_(), mood: String(mood || ''), slots: missing,
      title: String((ctx && ctx.title) || ''), category: String((ctx && ctx.category) || ''),
      note: 'فقط WAV. ترجیحاً ۲۴ کیلوهرتز، تک‌کاناله، ۱۶ بیت. ' +
            'فایل را در پوشهٔ «' + (CFG.MUSIC_FOLDER || 'موسیقی و افکت') + '» بگذارید.'
    };

    /* آرزوی تکراری افزوده نمی‌شود.
     *
     * ۲۳ اوت: فایل هفت رکورد داشت که سه‌تایشان نویسه‌به‌نویسه یکی بودند
     * (۰۷:۰۱، ۰۷:۰۶، ۰۷:۱۲) و چهارتای دیگر هم همین‌طور. چون صداگذاریِ یک
     * قسمت چند بار از سر گرفته می‌شود و هر بار تکه‌ها از نو ساخته می‌شدند،
     * هر اجرا یک آرزوی تازه می‌نوشت. با بانکِ خالی این یعنی فایل بی‌پایان
     * رشد می‌کند و آن که باید تهیه کند، هفت‌بار یک چیز می‌بیند و نمی‌فهمد
     * هفت خواسته است یا یکی. حالا رکوردِ همسان فقط زمانش تازه می‌شود.
     */
    var key = function (r) {
      return [String(r.mood || ''), (r.slots || []).join('|'),
              String(r.category || ''), String(r.title || '')].join('§');
    };
    var k = key(rec), dup = -1;
    for (var i = 0; i < items.length; i++) if (key(items[i]) === k) { dup = i; break; }
    if (dup >= 0) {
      items[dup].at = rec.at;
      items[dup].times = (Number(items[dup].times) || 1) + 1;
    } else {
      items.push(rec);
      logLine_('خواستهٔ موسیقی ثبت شد: ' + missing.join('، ') + ' — حال‌وهوا: ' + mood);
    }
    putOutJson_(MUSIC_WISH_(), { updatedAt: nowStr_(), items: items });
    return items.length;
  } catch (e) { return null; }
}

/* ═══════════════════ آوردنِ موسیقی از اینترنت (۵٫۵۵) ═══════════════════

   ══ چرا بانک تا امروز خالی ماند ══
   طرحِ اولیه این بود: موتور می‌گوید چه لازم دارد (_MUSIC-WISH.json) و تسکِ
   غنی‌سازی از وب پیدا می‌کند، به WAV تبدیل می‌کند و در پوشهٔ بانک می‌گذارد.
   دستورش هم نوشته شده بود. ولی خودِ تسک گزارش داد که در محیطِ ابری نمی‌تواند
   فایلِ صوتی تهیه و بارگذاری کند — و کسی آن گزارش را به کارِ بعدی وصل نکرد.
   نتیجه: هفت آرزوی ثبت‌شده و صفر فایل.

   ══ تقسیمِ کارِ تازه ══
   هرکس همان کاری را می‌کند که واقعاً از دستش برمی‌آید:
     • تسکِ غنی‌سازی وب را می‌گردد و *نشانیِ* یک فایلِ WAVِ آزاد را با مجوزش
       در `_MUSIC-FEED.json` می‌نویسد. این فقط متن است؛ از پسش برمی‌آید.
     • موتور نشانی را می‌گیرد، دانلود می‌کند، **هدرِ WAV را می‌سنجد** و در
       پوشهٔ بانک می‌نشاند. UrlFetchApp همین حالا هم engine.gs را می‌آورد.

   ══ چه چیزی وارد بانک نمی‌شود ══
   هرچه هدرِ RIFF/WAVE نداشته باشد — MP3ی که پسوندش را WAV گذاشته‌اند، صفحهٔ
   HTMLِ خطا، دانلودِ نصفه. اینها ذخیره نمی‌شوند، چون یک فایلِ خرابِ در بانک
   بدتر از بانکِ خالی است: هر شب انتخاب می‌شود و هر شب سکوت پخش می‌کند.

   ══ و آنچه اینجا نیست ══
   هیچ موسیقی‌ای *ساخته* نمی‌شود. مدل فقط انتخاب می‌کند کدام قطعهٔ موجود کجا
   پخش شود و از کجایش بریده شود. ساختنِ موسیقی نه در توانِ این موتور است و نه
   جایی از این پروژه خواسته شده.
   ═════════════════════════════════════════════════════════════════════════ */

function MUSIC_FEED_() { return CFG.MUSIC_FEED_FILE || '_MUSIC-FEED.json'; }

/** نشانی‌هایی که یک بار آورده شده‌اند. فایلی که کاربر پاک کند برنمی‌گردد. */
function musicFetchedUrls_() {
  try { return JSON.parse(props_().getProperty(PK.MUSIC_FETCHED) || '[]') || []; }
  catch (e) { return []; }
}

function musicFetchedAdd_(url) {
  try {
    var L = musicFetchedUrls_();
    if (L.indexOf(url) === -1) L.push(url);
    props_().setProperty(PK.MUSIC_FETCHED, JSON.stringify(L.slice(-200)));
  } catch (e) {}
}

/** نامِ فایلِ امن از روی عنوان یا نشانی. */
function musicFileName_(item) {
  var base = String((item && item.title) || '').trim();
  if (!base) {
    base = String((item && item.url) || '').split('?')[0].split('/').pop() || 'track';
    base = base.replace(/\.[A-Za-z0-9]+$/, '');
  }
  base = base.replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return (base || 'track') + '.wav';
}

/**
 * فهرستِ پیشنهادها را می‌خواند، دانلود می‌کند و در بانک می‌نشاند.
 * برمی‌گرداند {read, added, failed, notes:[…]}
 */
function musicFetch_() {
  var out = { read: 0, added: 0, failed: 0, notes: [] };
  if (CFG.MUSIC_ENABLED === false || CFG.MUSIC_FETCH === false) return out;

  var feed = null;
  try { feed = getOutJson_(MUSIC_FEED_()); } catch (e) { return out; }
  if (!feed || !feed.items || !feed.items.length) return out;

  var cap = Number(CFG.MUSIC_FETCH_MAX_PER_RUN) || 3;
  var maxB = Number(CFG.MUSIC_FETCH_MAX_BYTES) || 12000000;
  var done = musicFetchedUrls_();
  var folder = musicFolder_();
  var changed = false;

  for (var i = 0; i < feed.items.length && out.added + out.failed < cap; i++) {
    var it = feed.items[i] || {};
    if (it.status) continue;                       // قبلاً رسیدگی شده
    var url = String(it.url || '').trim();
    out.read++;

    if (!/^https:\/\//i.test(url)) {
      it.status = 'رد'; it.error = 'نشانی باید https باشد';
      changed = true; out.failed++; continue;
    }
    if (done.indexOf(url) !== -1) {
      it.status = 'تکراری'; it.error = 'این نشانی قبلاً آورده شده';
      changed = true; continue;
    }

    var bytes = null, code = 0;
    try {
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      code = res.getResponseCode();
      if (code === 200) bytes = res.getBlob().getBytes();
    } catch (eF) {
      it.status = 'رد'; it.error = 'دانلود نشد: ' + eF.message;
      changed = true; out.failed++; continue;
    }
    if (code !== 200 || !bytes) {
      it.status = 'رد'; it.error = 'پاسخِ ' + code;
      changed = true; out.failed++; continue;
    }
    if (bytes.length > maxB) {
      it.status = 'رد';
      it.error = 'حجم ' + Math.round(bytes.length / 1e6) + ' مگابایت، بیشتر از سقفِ ' +
                 Math.round(maxB / 1e6);
      changed = true; out.failed++; continue;
    }

    // تنها سنجهٔ معتبر: خودِ هدر. پسوندِ فایل و Content-Type هر دو دروغ می‌گویند.
    var info = null;
    try { info = wavInfo_(bytes); } catch (eW) { info = null; }
    if (!info || !(info.seconds > 0)) {
      it.status = 'رد';
      it.error = 'WAV نیست (یا هدرش خوانده نشد). MP3 در Apps Script رمزگشایی نمی‌شود.';
      changed = true; out.failed++;
      musicFetchedAdd_(url);                       // دوباره امتحان نمی‌شود
      continue;
    }

    var name = musicFileName_(it);
    var file;
    try {
      file = folder.createFile(Utilities.newBlob(bytes, 'audio/wav', name));
    } catch (eC) {
      it.status = 'رد'; it.error = 'ذخیره نشد: ' + eC.message;
      changed = true; out.failed++; continue;
    }

    // همراهِ فایل، هویتش. موتور این را بر نامِ فایل مقدم می‌داند.
    try {
      folder.createFile(Utilities.newBlob(JSON.stringify({
        title: String(it.title || name.replace(/\.wav$/i, '')),
        url: url, license: String(it.license || ''),
        kind: String(it.kind || 'موسیقی'), mood: String(it.mood || ''),
        slots: String(it.slots || ''), gain: String(it.gain || ''),
        source: String(it.source || ''), at: nowStr_()
      }, null, 1), 'application/json',
        '_MUSIC-META-' + name.replace(/\.wav$/i, '') + '.json'));
    } catch (eS) {}

    musicFetchedAdd_(url);
    it.status = 'آمد';
    it.fileId = file.getId();
    it.at = nowStr_();
    it.sec = Math.round(info.seconds);
    changed = true; out.added++;
    out.notes.push(name + ' (' + Math.round(info.seconds) + 'ث، ' + info.rate + ' هرتز)');
    logLine_('موسیقی آورده شد: «' + name + '» — ' + Math.round(info.seconds) + ' ثانیه، ' +
             info.rate + ' هرتز، ' + Math.round(bytes.length / 1e6 * 10) / 10 + ' مگابایت.');
  }

  // نتیجه به همان فایل برمی‌گردد تا تسک ببیند چه شد و چه چیزی رد شد.
  if (changed) {
    try { putOutJson_(MUSIC_FEED_(), { updatedAt: nowStr_(), items: feed.items }); } catch (eP) {}
  }
  if (out.failed) {
    logLine_('آوردنِ موسیقی: ' + out.added + ' آمد، ' + out.failed + ' رد شد.');
  }
  return out;
}

/* ═══════════ گشتنِ خودکار در archive.org (۵٫۵۶) ═══════════

   ══ چرا لازم شد ══
   ۵٫۵۵ کار را درست تقسیم کرد (تسک نشانی می‌نویسد، موتور دانلود می‌کند) ولی
   یک وابستگی باقی گذاشت: اگر تسک اجرا نشود، یا نتواند نشانیِ مستقیمِ WAV
   پیدا کند، بانک باز هم خالی می‌ماند. و بیشترِ سایت‌های موسیقیِ آزاد فقط MP3
   می‌دهند — که Apps Script رمزگشایش نمی‌کند. یعنی محتمل‌ترین نتیجه همان
   «رد — WAV نیست» بود، هر شب.

   ══ چرا archive.org و نه جای دیگر ══
   تنها جایی که پیش از دانلود می‌شود مطمئن شد: metadata API فهرستِ فایل‌ها را
   با **فرمت و حجم** می‌دهد و مجوز را هم. پس نامزدی که WAV نیست یا بزرگ‌تر از
   سقف است اصلاً وارد فهرست نمی‌شود. جاهای دیگر باید دانلود کنی تا بفهمی.

   ══ مرزی که رعایت می‌شود ══
   این تابع **دانلود نمی‌کند** — فقط نامزدها را در همان `_MUSIC-FEED.json`
   می‌نویسد. دانلود همیشه از یک مسیر می‌گذرد (musicFetch_) با همان سه سد و
   همان ردِ ثبت‌شده. دو مسیرِ دانلود یعنی دو جای شکست و یک تاریخچهٔ نصفه.

   ══ مجوز ══
   نامزدی که `licenseurl` نداشته باشد کنار گذاشته می‌شود. «مجوزی که نتوانی
   نامش را بگویی» همان قاعده‌ای است که در دستورِ تسک هم هست.
   ═════════════════════════════════════════════════════════════════════════ */

/** مجموعه‌هایی که قبلاً دیده شده‌اند. */
function musicSeenIds_() {
  try { return JSON.parse(props_().getProperty(PK.MUSIC_SEEN) || '[]') || []; }
  catch (e) { return []; }
}

function musicSeenAdd_(id) {
  try {
    var L = musicSeenIds_();
    if (L.indexOf(id) === -1) L.push(id);
    props_().setProperty(PK.MUSIC_SEEN, JSON.stringify(L.slice(-300)));
  } catch (e) {}
}

/** یک GETِ JSON با گذشتِ نرم — هر شکستی یعنی «چیزی پیدا نشد»، نه خطا. */
function musicApiJson_(url) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    return JSON.parse(res.getContentText());
  } catch (e) { return null; }
}

/**
 * پرسشِ جست‌وجو از روی جایگاهی که کم داریم.
 *
 * حال‌وهوا عمداً وارد پرسش نمی‌شود: برچسب‌های archive.org فارسی نیستند و
 * «اجتماعی و سبک زندگی» هیچ نتیجه‌ای نمی‌دهد. برچسب‌زنیِ حال‌وهوا کارِ
 * musicAutoTag_ است، بعد از رسیدنِ فایل.
 */
function musicSeekQuery_(slot) {
  var kind = (slot === 'میانه') ? 'transition OR interlude OR bumper'
           : (slot === 'پایان') ? 'outro OR ending OR credits'
           : 'intro OR theme OR opening';
  return 'mediatype:(audio) AND format:(WAVE) AND licenseurl:(*creativecommons* OR *publicdomain*) AND (' +
         kind + ' OR instrumental)';
}

/**
 * نامزد پیدا می‌کند و به `_MUSIC-FEED.json` اضافه می‌کند. دانلود نمی‌کند.
 * برمی‌گرداند {added, looked, notes:[…]}
 */
function musicSeek_(slots) {
  var out = { added: 0, looked: 0, notes: [] };
  if (CFG.MUSIC_ENABLED === false || CFG.MUSIC_SEEK === false) return out;

  var want = (slots && slots.length) ? slots : ['شروع', 'پایان', 'میانه'];
  var cap = Number(CFG.MUSIC_SEEK_MAX) || 4;
  var maxB = Number(CFG.MUSIC_FETCH_MAX_BYTES) || 12000000;
  var minSec = Number(CFG.MUSIC_SEEK_MIN_SEC) || 5;
  var base = String(CFG.MUSIC_SEEK_API || 'https://archive.org').replace(/\/+$/, '');

  var feed = null;
  try { feed = getOutJson_(MUSIC_FEED_()); } catch (e) {}
  if (!feed || !feed.items) feed = { items: [] };

  var already = {};
  for (var q = 0; q < feed.items.length; q++) already[String(feed.items[q].url || '')] = 1;
  var fetched = musicFetchedUrls_();
  for (var q2 = 0; q2 < fetched.length; q2++) already[fetched[q2]] = 1;
  var seen = musicSeenIds_();

  for (var si = 0; si < want.length && out.added < cap; si++) {
    var slot = want[si];
    var url = base + '/advancedsearch.php?q=' + encodeURIComponent(musicSeekQuery_(slot)) +
              '&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=licenseurl' +
              '&rows=25&page=1&output=json';
    var sr = musicApiJson_(url);
    var docs = (sr && sr.response && sr.response.docs) || [];
    out.looked += docs.length;
    if (!docs.length) { out.notes.push(slot + ': نتیجه‌ای نیامد'); continue; }

    for (var di = 0; di < docs.length && out.added < cap; di++) {
      var id = String(docs[di].identifier || '');
      if (!id || seen.indexOf(id) !== -1) continue;
      musicSeenAdd_(id); seen.push(id);

      var meta = musicApiJson_(base + '/metadata/' + encodeURIComponent(id));
      if (!meta || !meta.files) continue;
      var lic = String((meta.metadata && meta.metadata.licenseurl) || docs[di].licenseurl || '');
      if (!lic) continue;                       // مجوزِ نامعلوم = رد
      var title = String((meta.metadata && meta.metadata.title) || docs[di].title || id);

      // کوچک‌ترین WAVِ زیرِ سقف: کمترین احتمالِ شکست، و برای بریدن هم بس است
      var best = null;
      for (var fi = 0; fi < meta.files.length; fi++) {
        var f = meta.files[fi] || {};
        var nm = String(f.name || '');
        if (!/\.wav$/i.test(nm)) continue;
        var sz = Number(f.size || 0);
        if (!(sz > 0) || sz > maxB) continue;
        var len = Number(f.length || 0);        // archive گاهی ثانیه می‌دهد، گاهی هیچ
        if (len && len < minSec) continue;
        if (!best || sz < best.size) best = { name: nm, size: sz, length: len };
      }
      if (!best) continue;

      var dl = base + '/download/' + encodeURIComponent(id) + '/' +
               encodeURIComponent(best.name);
      if (already[dl]) continue;
      already[dl] = 1;

      feed.items.push({
        url: dl,
        title: auditCut_(title, 60),
        license: lic,
        kind: 'موسیقی',
        mood: '',                                // musicAutoTag_ پس از رسیدن پر می‌کند
        slots: slot,
        gain: '',
        source: base + '/details/' + id,
        by: 'موتور — گشتنِ خودکار'
      });
      out.added++;
      out.notes.push(slot + ': ' + auditCut_(title, 40) +
                     ' (' + Math.round(best.size / 1e5) / 10 + ' مگابایت)');
    }
  }

  if (out.added) {
    try { putOutJson_(MUSIC_FEED_(), { updatedAt: nowStr_(), items: feed.items }); } catch (eP) {}
    logLine_('گشتنِ خودکارِ موسیقی: ' + out.added + ' نامزد به فهرست اضافه شد.');
  }
  return out;
}

/**
 * جایگاه‌هایی که بانک برایشان چیزی ندارد.
 * بی این، هر شب برای جایگاهی می‌گشتیم که ده قطعه دارد.
 */
function musicMissingSlots_(hub) {
  var need = ['شروع', 'پایان', 'میانه'], out = [];
  var bank = [];
  try { bank = musicBank_(hub); } catch (e) { return need; }
  for (var i = 0; i < need.length; i++) {
    var has = false;
    for (var j = 0; j < bank.length; j++) {
      if (String(bank[j].slots || '').indexOf(need[i]) !== -1) { has = true; break; }
    }
    if (!has) out.push(need[i]);
  }
  return out;
}

/** منو: آوردنِ موسیقی از فهرستِ پیشنهادی، همین حالا. */
function runMusicFetch() {
  // یک زدن، سه مرحله: بگرد، بیاور، بپوی. کاربر نباید سه گزینهٔ منو را
  // به‌ترتیب بزند تا یک فایل موسیقی داشته باشد.
  var seek = { added: 0, notes: [] };
  try {
    var miss = musicMissingSlots_();
    if (miss.length) seek = musicSeek_(miss);
  } catch (eS) {}

  var r = musicFetch_();
  var scan = null;
  if (r.added) { try { scan = musicScan_(); } catch (e) {} }

  var L = ['🎵 موسیقی — گشتن، آوردن، پویش', ''];
  if (seek.added) {
    L.push(seek.added + ' نامزدِ تازه از archive.org به فهرست اضافه شد:');
    for (var k = 0; k < seek.notes.length; k++) L.push('   • ' + seek.notes[k]);
    L.push('');
  }
  if (!r.read && !r.added && !seek.added) {
    L.push('چیزی برای آوردن نبود.');
    L.push('');
    L.push('یا بانک برای هر سه جایگاه (شروع، پایان، میانه) قطعه دارد،');
    L.push('یا archive.org این بار نتیجه‌ای نداد و فهرستِ پیشنهادی هم خالی است.');
    L.push('');
    L.push('فهرست را تسکِ «غنی‌سازی اینترنتی» هم پر می‌کند. و اگر خودتان نشانیِ');
    L.push('یک فایلِ WAV دارید، می‌توانید «' + MUSIC_FEED_() + '» را دستی بسازید:');
    L.push('{"items":[{"url":"https://…/x.wav","title":"…","license":"CC0",');
    L.push(' "kind":"موسیقی","mood":"آرام","slots":"شروع، پایان","gain":"0.7"}]}');
  } else {
    L.push(r.added + ' فایل آمد، ' + r.failed + ' رد شد.');
    if (r.notes.length) { L.push(''); for (var i = 0; i < r.notes.length; i++) L.push('• ' + r.notes[i]); }
    if (scan) L.push('', 'بانک پویش شد: ' + scan.added + ' تازه، ' + scan.updated + ' به‌روز.');
    L.push('', 'دلیلِ رد شدنِ هرکدام در خودِ «' + MUSIC_FEED_() + '» نوشته شده.');
  }
  try { SpreadsheetApp.getUi().alert(L.join('\n')); } catch (e) { logLine_(L.join(' ')); }
  return { seek: seek, fetch: r };
}

/* ──────────────────────── خویشتن‌داری در افکت ──────────────────────── */

/**
 * افکتِ صوتی فقط وقتی که واقعاً بجاست.
 *
 * ══ خطری که باید دور زده شود ══
 * اگر معیارْ «آمدنِ یک واژه در متن» باشد، هر اشارهٔ گذرا به باران یک صدای
 * باران می‌سازد. نتیجه‌اش مصنوعی است و در «درس‌نامه» فاجعه: یک درسِ فلسفه
 * وسطش صدای شهر بدهد یعنی کسی به متن گوش نداده.
 *
 * ══ سه سدی که اینجا هست ══
 *  ۱) افکت به‌طور پیش‌فرض فقط در برنامهٔ متنوع است، نه درس‌نامه. سرشتِ درس‌نامه
 *     شمرده و بی‌جلوه است؛ این تصمیمِ سلیقه نیست، اقتضای برنامه است.
 *  ۲) واژه باید *ساختاری* باشد نه گذرا: یا در سرِ بخش بیاید، یا دستِ‌کم دو بار
 *     در روایتِ همان بخش تکرار شود. یک بار آمدن یعنی گذرا.
 *  ۳) سقفِ سختِ هر قسمت. حتی اگر ده جای مناسب پیدا شود، بیش از این گذاشته
 *     نمی‌شود؛ برنامهٔ رادیویی است نه جدولِ افکت.
 *
 * برمی‌گرداند: فهرستِ افکت‌های مجاز، با شمارهٔ بخش.
 */
function sfxAllow_(sections, picks, showKind) {
  var out = [];
  if (CFG.MUSIC_SFX_ENABLED === false) return out;
  if (String(showKind || '') === 'special' && CFG.MUSIC_SFX_IN_SPECIAL !== true) return out;
  var cap = Math.max(0, Number(CFG.MUSIC_SFX_MAX_PER_EP) || 0);
  if (!cap) return out;

  for (var i = 0; i < (picks || []).length && out.length < cap; i++) {
    var p = picks[i];
    if (!p || !p.word) continue;
    var idx = Number(p.section);
    var sec = (sections || [])[idx];
    if (!sec) continue;
    var word = String(p.word).trim();
    if (word.length < 3) continue;

    var head = String(sec.heading || '');
    var body = String(sec.narration || '');
    var inHead = head.indexOf(word) !== -1;
    var times = body.split(word).length - 1;

    // «یک بار در متن» کافی نیست — همان اشارهٔ گذراست
    if (!inHead && times < 2) continue;
    out.push({ section: idx, word: word, id: p.id,
               why: inHead ? 'در سرِ بخش آمده' : times + ' بار در همان بخش' });
  }
  return out;
}

/* ────────────── شناختِ فایل: اندازه‌گیری، نه شباهتِ اسمی ────────────── */

/**
 * اندازه‌گیریِ سرشتِ صوتیِ یک فایل.
 *
 * ══ چرا اسم کافی نیست ══
 * فایلی که «calm-piano.wav» نام دارد ممکن است سکوت باشد، ممکن است دانلود
 * نصفه‌کاره باشد، ممکن است اصلاً چیزِ دیگری باشد. اعتماد به نامِ فایل یعنی
 * اعتماد به چیزی که هیچ‌کس وارسی‌اش نکرده. پس خودِ موج اندازه گرفته می‌شود.
 *
 * ══ چه چیزی را واقعاً می‌شود فهمید ══
 * • بلندیِ میانگین و قله — سکوت، یا فایلِ خرابِ نزدیک‌به‌صفر
 * • درصدِ سکوت — فایلی که بیشترش خالی است
 * • نرخِ گذر از صفر — بافتِ صدا: موسیقیِ آرام عددِ پایین، افکتِ نویزی و
 *   «س/ش»دارِ گفتار عددِ بالا
 * • یکنواختی — موسیقی معمولاً پیوسته است، گفتار پر از مکث
 *
 * ══ و چه چیزی را نمی‌شود ══
 * «این پیانوی آرام است» از روی موج فهمیده نمی‌شود. آن را فقط شناسنامهٔ منبع
 * می‌گوید (musicMeta_). این تابع سلامت و بافت را می‌سنجد، نه هویت را.
 *
 * برای سرعت، سراسرِ فایل خوانده نمی‌شود: چند ده پنجرهٔ کوتاه، پخش‌شده در طولِ
 * قطعه. برای قضاوتِ سلامت کافی است و از مهلتِ اجرا هم نمی‌گذرد.
 */
function musicProbe_(b, info) {
  if (!info || info.format !== 1) return null;
  var bps = info.bits / 8, ch = info.channels, frameB = bps * ch;
  var total = Math.floor(info.dataLen / frameB);
  if (total < 100) return null;

  var u = function (k) { return b[k] < 0 ? b[k] + 256 : b[k]; };
  var rd = function (fr) {
    var i = info.dataAt + fr * frameB;
    if (info.bits === 8) return (u(i) - 128) * 256;
    var v = u(i + bps - 2) | (u(i + bps - 1) << 8);
    return (v & 0x8000) ? v - 65536 : v;
  };

  var WINDOWS = 48, WIN = 512;
  var step = Math.max(1, Math.floor((total - WIN) / WINDOWS));
  var rmsList = [], zc = 0, zcN = 0, peak = 0, silent = 0, seen = 0;

  for (var w = 0; w < WINDOWS; w++) {
    var from = w * step;
    if (from + WIN >= total) break;
    var sum = 0, prev = 0;
    for (var k = 0; k < WIN; k++) {
      var s = rd(from + k);
      if (s > peak) peak = s; if (-s > peak) peak = -s;
      sum += s * s;
      if (k && ((s < 0) !== (prev < 0))) zc++;
      prev = s; zcN++;
    }
    var rms = Math.sqrt(sum / WIN);
    rmsList.push(rms);
    if (rms < 200) silent++;               // زیرِ این، عملاً سکوت است
    seen++;
  }
  if (!seen) return null;

  var mean = 0;
  for (var m = 0; m < rmsList.length; m++) mean += rmsList[m];
  mean /= rmsList.length;
  var varc = 0;
  for (var v2 = 0; v2 < rmsList.length; v2++) varc += Math.pow(rmsList[v2] - mean, 2);
  varc = Math.sqrt(varc / rmsList.length);

  return {
    seconds: Math.round(info.seconds),
    rms: Math.round(mean),
    peak: peak,
    silentPct: Math.round(silent / seen * 100),
    zcr: Math.round(zc / (zcN / (CFG.SAMPLE_RATE || 24000))),   // گذر بر ثانیه
    steadiness: mean > 0 ? Math.round((1 - Math.min(varc / mean, 1)) * 100) : 0
  };
}

/**
 * آیا این فایل به‌دردِ بانک می‌خورد؟
 * فقط سلامت را می‌گوید، نه تناسبِ حال‌وهوا.
 */
function musicVerdict_(pr) {
  if (!pr) return { ok: false, why: 'خوانده نشد یا PCM نیست' };
  if (pr.seconds < 2) return { ok: false, why: 'کوتاه‌تر از دو ثانیه' };
  if (pr.silentPct >= 80) return { ok: false, why: pr.silentPct + '٪ سکوت — احتمالاً دانلودِ ناقص' };
  if (pr.rms < 150) return { ok: false, why: 'تقریباً بی‌صدا (بلندیِ میانگین ' + pr.rms + ')' };
  if (pr.peak >= 32767 && pr.rms > 12000) return { ok: true, why: 'سالم ولی بلند و کلیپ‌شده — بلندی را کم بگذارید' };
  return { ok: true, why: 'سالم' };
}

/** حدسِ بافت از روی اندازه‌ها — کمکِ تصمیم، نه حکم. */
function musicTexture_(pr) {
  if (!pr) return '';
  var t = [];
  t.push(pr.zcr > 3000 ? 'پرنویز/سوزناک' : (pr.zcr > 1200 ? 'میانه' : 'نرم و کم‌فرکانس'));
  t.push(pr.steadiness > 70 ? 'یکنواخت (موسیقی‌وار)' : 'پرنوسان (افکت/گفتاروار)');
  if (pr.silentPct > 30) t.push('پرمکث');
  return t.join(' · ');
}

/**
 * شناسنامهٔ منبع، اگر تسکِ غنی‌سازی گذاشته باشد.
 *
 * این تنها چیزی است که «هویت» را می‌گوید: از کجا آمد، چه بود، چه مجوزی دارد.
 * نامِ فایل حدس است؛ این سند است. اگر هست، بر نامِ فایل مقدم می‌شود.
 */
/**
 * شناسنامهٔ کنارِ فایلِ صوتی — همان چیزی که هویت را اعلام می‌کند، نه نامِ فایل.
 *
 * جایش پوشهٔ خودِ بانک است، کنارِ صوت. پیش‌تر در ریشهٔ OUTPUT خوانده می‌شد و
 * یعنی هر آهنگ یک فایلِ تازه در ریشه می‌گذاشت؛ ریشه جای فایل‌های زندهٔ موتور
 * است و بس. ریشه هنوز خوانده می‌شود تا شناسنامه‌های پیشین گم نشوند.
 */
function musicMeta_(fileName) {
  var base = String(fileName || '').replace(/\.wav$/i, '');
  var name = '_MUSIC-META-' + base + '.json';
  try {
    var it = musicFolder_().getFilesByName(name);
    if (it.hasNext()) return JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
  } catch (e) {}
  try { return getOutJson_(name); } catch (e2) { return null; }
}
