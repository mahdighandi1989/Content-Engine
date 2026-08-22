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
                     'آخرین استفاده', 'یادداشت'];
var MC = { ID: 1, NAME: 2, KIND: 3, MOOD: 4, SLOTS: 5, SEC: 6, FMT: 7,
           GAIN: 8, USED: 9, LAST: 10, NOTE: 11 };

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
    var info = null;
    try { info = wavInfo_(f.getBlob().getBytes()); } catch (e) { info = null; }
    var fmt = !info ? 'قالب ناسازگار (فقط WAV)'
                    : (musicNative_(info) ? 'آماده'
                       : info.rate + 'Hz/' + info.channels + 'ch/' + info.bits + 'bit — تبدیل هنگام استفاده');
    var sec = info ? Math.round(info.seconds) : 0;
    if (!info) bad++;

    if (byId[id]) {
      var r = byId[id];
      if (String(r.v[MC.SEC - 1]) !== String(sec) || String(r.v[MC.FMT - 1]) !== fmt) {
        sh.getRange(r.row, MC.SEC, 1, 2).setValues([[sec, fmt]]);
        updated++;
      }
    } else {
      sh.appendRow([id, f.getName(), 'موسیقی', '', 'شروع، پایان', sec, fmt, 1, 0, '', '']);
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
function musicMarkUsed_(hub, picks, epLabel) {
  var sh = (hub || getHub_()).getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh) return 0;
  var n = 0;
  for (var i = 0; i < (picks || []).length; i++) {
    var p = picks[i];
    if (!p || !p.row) continue;
    try {
      sh.getRange(p.row, MC.USED).setValue((Number(p.used) || 0) + 1);
      sh.getRange(p.row, MC.LAST).setValue(nowStr_() + ' — ' + String(epLabel || ''));
      n++;
    } catch (e) {}
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
function musicWrap_(chunks, hub, opt) {
  opt = opt || {};
  if (CFG.MUSIC_ENABLED === false) return { chunks: chunks, picks: [] };
  var bank = [];
  try { bank = musicBank_(hub); } catch (e) { return { chunks: chunks, picks: [] }; }
  if (!bank.length) return { chunks: chunks, picks: [] };

  var mood = String(opt.mood || opt.category || '');
  var plan = opt.plan || {};
  var picks = [], out = [];

  var clipOf = function (b, slot, secs) {
    if (!b) return '';
    var len = Math.min(secs, b.sec || secs);
    var fade = Math.min(Number(CFG.MUSIC_FADE_SEC) || 2, len / 2);
    return musicClip_(b.id, {
      startSec: Number(plan[slot + 'Start']) || 0, lenSec: len,
      gain: b.gain * (Number(CFG.MUSIC_GAIN) || 1),
      fadeIn: fade, fadeOut: fade
    });
  };

  var intro = musicPick_(bank, 'شروع', mood, plan.introId);
  if (intro) {
    var ib = clipOf(intro, 'intro', Number(CFG.MUSIC_INTRO_SEC) || 8);
    if (ib) { out.push({ pcm: ib, label: 'موسیقیِ آغاز — ' + intro.name }); picks.push(intro); }
  }

  var every = Math.max(0, Number(CFG.MUSIC_BRIDGE_EVERY) || 0);
  var bridge = every ? musicPick_(bank, 'میانه', mood, plan.bridgeId) : null;
  for (var i = 0; i < chunks.length; i++) {
    if (bridge && every && i > 0 && i % every === 0) {
      var bb = clipOf(bridge, 'bridge', Number(CFG.MUSIC_BRIDGE_SEC) || 4);
      if (bb) {
        out.push({ pcm: bb, label: 'موسیقیِ میانه — ' + bridge.name });
        if (picks.indexOf(bridge) === -1) picks.push(bridge);
      }
    }
    out.push(chunks[i]);
  }

  var outro = musicPick_(bank, 'پایان', mood, plan.outroId);
  if (outro) {
    var ob = clipOf(outro, 'outro', Number(CFG.MUSIC_OUTRO_SEC) || 10);
    if (ob) { out.push({ pcm: ob, label: 'موسیقیِ پایان — ' + outro.name }); picks.push(outro); }
  }

  if (picks.length) {
    logLine_('موسیقیِ قسمت: ' + picks.map(function (p) { return p.name; }).join(' · '));
  }
  return { chunks: out, picks: picks };
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
