/* ═══════════════════════════════════════════════════════════════════════════
   ۳۸) اینستاگرام — ریلزِ کوتاهِ درس‌نامه (۹.۲۱)
   ═══════════════════════════════════════════════════════════════════════════

   صاحبِ برنامه: «… همه پادکست‌های درس‌نامه رو از ابتدا … گلچینِ مطالب … ریلزِ کوتاه … خودش یه محتوا باشه، مثلاً
   "آیا می‌دانستید که در معرفت‌شناسی…" که قلابِ علاقه ایجاد کنه که طرف بخواد کاملش رو تو یوتیوب گوش کنه … نیاز
   نیست روز و تاریخ بگه … کپشن موارد لازم … اشاره کنه کاملش در یوتیوب … استوری هم بذاره … محتواهای اینستاگرام
   هر پادکست بره زیرِ فولدرِ همون پادکست در درایو … این روزها حسابی پست بذاری … چند تای اول با تأیید».

   ══ از کجا انتخاب می‌شود ══
   فقط قسمت‌هایی که ویدئوی **عمومی**شان در یوتیوب هست (`ytPublished_`) — به ترتیبِ شمارهٔ سراسری، یعنی از نخستین
   درس‌ها. دلیل: ریلز به نسخهٔ کامل اشاره می‌کند، و ریلزی که پیوندش هنوز نیست وعدهٔ دروغ است. پس هر چه پرکردنِ
   گذشته در یوتیوب جلو برود، اینستاگرام هم پشتش می‌آید؛ هیچ فهرستِ دستیِ دیگری نیست.

   ══ مراحلِ هر ریلز (هر کدام در یک اجرای جدا ممکن است) ══
   plan  ⇒ مدل متنِ ریلز را از خودِ درس می‌نویسد (قلاب + ۵ تا ۸ جملهٔ کوتاه + تصویرِ هر جمله + کپشن). جملهٔ پایانیِ
            «نسخهٔ کامل در یوتیوب» را **کد** می‌افزاید، نه مدل: وعده‌ای که باید همیشه باشد به مدل سپرده نمی‌شود.
   voice ⇒ هر جمله جدا با صدای گویندهٔ همان درس ساخته می‌شود؛ زمانِ هر جمله از طولِ خودِ صدا (نه تخمین) ⇒ زیرنویسِ دقیق.
   img   ⇒ نقاشی‌های خودِ درس اگر هست (از «تصویرها»، رونوشت در پوشهٔ اینستاگرام)؛ وگرنه تصویرِ عمودیِ تازه از مدلِ
            تصویر — در همان سقفِ هزینهٔ ماهانهٔ تصویرسازی. نبودِ هر دو ریلز را نمی‌خواباند (رانر زمینهٔ ساده می‌گذارد).
   ask   ⇒ درخواست در `_YT-RENDER.json` (`reels`، جدا از `items`) — رانرِ گیت‌هاب ۱۰۸۰×۱۹۲۰ می‌کشد.
   got   ⇒ MP4 و کاور از `docs/renders.json` (`reels`)؛ یک رونوشت در پوشهٔ اینستاگرامِ همان قسمت.
   ok    ⇒ تا `IG_APPROVE` ریلزِ اول منتشر نشده، هر ریلز منتظرِ کلیدش در `docs/ig-approve.json` می‌مانَد.
   pub   ⇒ ریلز (با کاور و «اشتراک در فید») و سپس استوریِ همان کاور؛ پیوند و شناسه‌ها در تبِ «انتشار در اینستاگرام».

   ══ آنچه API نمی‌دهد و باید گفته شود ══
   هایلایت‌ها (ساخت، افزودنِ استوری به آن، کاورش) و برچسبِ پیوند در استوری از هیچ API‌ای در دسترس نیست. پس
   «کارِ شما» است و در `igStatus_().line` صریح گفته می‌شود — نه وعده، نه سکوت.
   ═══════════════════════════════════════════════════════════════════════════ */

var IG_REEL_SCHEMA = { type: 'object', properties: {
  hook: { type: 'string' }, coverTitle: { type: 'string' }, caption: { type: 'string' },
  story: { type: 'string' },
  tags: { type: 'array', items: { type: 'string' } },
  lines: { type: 'array', items: { type: 'object', properties: {
    text: { type: 'string' }, scene: { type: 'string' } }, required: ['text', 'scene'] } }
}, required: ['hook', 'coverTitle', 'caption', 'tags', 'lines'] };

/** جملهٔ پایانیِ گفتنی — از کد، تا همیشه باشد. */
var IG_CTA_LINE = 'نسخهٔ کاملِ این درس را در یوتیوب ببینید؛ پیوندش در کپشن است.';

function igState_() {
  try { var s = JSON.parse(props_().getProperty(PK.IG_STATE) || '{}'); return (s && typeof s === 'object') ? s : {}; }
  catch (e) { return {}; }
}
function igStateSave_(s) { try { props_().setProperty(PK.IG_STATE, JSON.stringify(s)); return true; } catch (e) { return false; } }

function igAcct_() {
  try { var a = JSON.parse(props_().getProperty(PK.IG_ACCT) || 'null'); return (a && a.ig) ? a : null; } catch (e) { return null; }
}

/** روشن است؟ کلید، حسابِ آزموده و کلیدِ پیکربندی — هر سه. */
function igOn_() { return CFG.IG_ON !== false && !!igToken_() && !!igAcct_(); }

/** شماره‌های انجام‌شده، فشرده: «1,2,3» ⇒ نقشه. */
function igDoneMap_(st) {
  var m = {}, a = String((st && st.done) || '').split(',');
  for (var i = 0; i < a.length; i++) if (a[i]) m[a[i]] = 1;
  return m;
}

/**
 * قسمتِ بعدی برای ریلز: کوچک‌ترین شمارهٔ درس‌نامه‌ای که ویدئوی عمومیِ یوتیوب دارد و نه انجام شده، نه در جریان،
 * نه از سقفِ تلاش گذشته. `pub` = خروجیِ `ytPublished_`.
 */
function igNextEp_(pub, st) {
  var done = igDoneMap_(st), busy = {}, fails = (st && st.fails) || {};
  (st.inflight || []).forEach(function (x) { busy[String(x.ep)] = 1; });
  var maxTry = Math.max(1, Number(CFG.IG_TRY_MAX) || 3);
  var best = null;
  for (var k in pub) {
    if (!Object.prototype.hasOwnProperty.call(pub, k) || k.indexOf(ENRICH_SHOW_SPECIAL + ':') !== 0) continue;
    var r = pub[k], n = Number(k.split(':')[1]);
    if (!(n > 0) || !r || !r.videoId || String(r.privacy || '').toLowerCase() !== 'public') continue;
    if (done[String(n)] || busy[String(n)] || (Number(fails[String(n)]) || 0) >= maxTry) continue;
    if (!best || n < best.ep) best = { ep: n, url: String(r.url || ('https://youtu.be/' + r.videoId)), series: String(r.series || ''),
                                       title: String(r.title || '') };
  }
  return best;
}

/** پوشهٔ «اینستاگرام» درونِ پوشهٔ قسمت — همه‌چیزِ ریلز این‌جاست. */
function igFolder_(epFolder) {
  var nm = CFG.IG_FOLDER || 'اینستاگرام';
  var it = epFolder.getFoldersByName(nm);
  return it.hasNext() ? it.next() : epFolder.createFolder(nm);
}
function igPlanRead_(fo) {
  try { var it = fo.getFilesByName('_ig.json'); if (it.hasNext()) return JSON.parse(it.next().getBlob().getDataAsString()); } catch (e) {}
  return null;
}
function igPlanWrite_(fo, p) {
  var body = JSON.stringify(p, null, 1);
  var it = fo.getFilesByName('_ig.json');
  if (it.hasNext()) { it.next().setContent(body); return; }
  fo.createFile(Utilities.newBlob(body, 'application/json', '_ig.json'));
}

/** متنِ درس برای مدل — سرفصل‌ها و روایت، بی قلاب و جمع‌بندیِ رادیویی. */
function igLessonText_(ep, cap) {
  var L = [];
  if (ep && ep.title) L.push('عنوان: ' + ep.title);
  ((ep && ep.sections) || []).forEach(function (s) {
    if (!s) return;
    if (s.heading) L.push('## ' + s.heading);
    if (s.narration) L.push(String(s.narration));
  });
  var t = L.join('\n');
  return t.length > cap ? t.slice(0, cap) : t;
}

function igPrompt_(ep, seriesName, lesson) {
  var n = CFG.IG_LINES || [5, 8];
  return [
    'تو نویسندهٔ ریلزِ اینستاگرامِ یک کانالِ آموزشیِ فارسی هستی. از درسِ زیر یک ریلزِ **' + (CFG.IG_SEC || '45 تا 75') + ' ثانیه‌ای** بنویس.',
    'مجموعه: «' + seriesName + '»' + (lesson ? ' — درسِ ' + lesson : ''),
    '',
    'قاعده‌ها:',
    '• ریلز **خودش یک محتوای کامل** است، نه آگهیِ درس: یک ایدهٔ مشخص، جالب و درست از همین درس را روشن کن.',
    '• hook = جملهٔ اول و قلاب: یک پرسش یا نکتهٔ شگفت از خودِ درس، مثلاً «آیا می‌دانستید که …؟» یا پرسشی تیز. حداکثر ۱۴ واژه.',
    '• lines = ' + n[0] + ' تا ' + n[1] + ' جملهٔ کوتاهِ گفتنی (هر کدام حداکثر ۲۲ واژه). **اولینِ آن‌ها همان hook است.** فارسیِ روان و رسمیِ گفتاری.',
    '• هیچ تاریخ، روز، «امروز»، «در این قسمت»، «پادکست»، «شنوندگانِ عزیز» یا شمارهٔ قسمت ننویس.',
    '• چیزی که در متنِ درس نیست نیفزا؛ ادعا و نام و عدد فقط از خودِ درس.',
    '• دعوت به یوتیوب را **ننویس** — خودِ برنامه آن را به پایان می‌افزاید.',
    '• scene = برای هر جمله، توصیفِ انگلیسیِ یک تصویرِ نقاشی‌گونه که همان معنا را نشان دهد؛ بی هیچ نوشته، حرف، عدد یا لوگو در تصویر.',
    '• coverTitle = عنوانِ کاور، حداکثر ۶ واژه، کنجکاوی‌برانگیز.',
    '• caption = ۲ تا ۴ جملهٔ کپشن که ایدهٔ ریلز را بگوید و به شنیدنِ درسِ کامل دعوت کند (پیوند را ننویس).',
    '• tags = ۸ تا ۱۵ برچسبِ مرتبط (فارسی یا انگلیسی)، بی #.',
    '• story = یک جملهٔ کوتاه برای استوری.',
    '',
    'متنِ درس:',
    igLessonText_(ep, Number(CFG.IG_SRC_CHARS) || 9000)
  ].join('\n');
}

/** خروجیِ مدل ⇒ برنامهٔ تمیز، یا null با دلیل. */
function igPlanTrim_(r) {
  if (!r || !r.lines || !r.lines.length) return { why: 'مدل جمله‌ای نداد' };
  /* «امروز»ِ روزِ پخش بیرون؛ «تا امروز» و «دنیای امروز» محتوای درس‌اند، نه تاریخ. */
  var bad = /(یوتیوب|youtube|در این قسمت|این قسمت|پادکست|شنوندگان|\d{4}\/\d|۱۴۰[۰-۹]|20\d\d|سالِ? [۰-۹\d]{4})/;
  var today = function (t) { return /امروز/.test(t.replace(/(تا (به )?|دنیای |جهانِ? |انسانِ? |جامعهٔ )امروز/g, '')); };
  var lines = [];
  for (var i = 0; i < r.lines.length && lines.length < 9; i++) {
    var t = String((r.lines[i] && r.lines[i].text) || '').replace(/\s+/g, ' ').trim();
    if (!t || bad.test(t) || today(t)) continue;
    lines.push({ text: t, scene: String(r.lines[i].scene || '').slice(0, 400) });
  }
  var words = lines.reduce(function (a, x) { return a + x.text.split(' ').length; }, 0);
  if (lines.length < 4) return { why: 'کمتر از ۴ جملهٔ پذیرفتنی (' + lines.length + ')' };
  if (words < 50) return { why: 'متن کوتاه است (' + words + ' واژه)' };
  while (words > 210 && lines.length > 4) { words -= lines.pop().text.split(' ').length; }
  var tags = (r.tags || []).map(function (x) { return String(x || '').replace(/^#/, '').replace(/\s+/g, '_').trim(); })
    .filter(function (x) { return x && x.length < 40; }).slice(0, 15);
  return { hook: String(r.hook || lines[0].text).trim().slice(0, 140), lines: lines,
           coverTitle: String(r.coverTitle || '').trim().slice(0, 60), caption: String(r.caption || '').trim().slice(0, 1200),
           story: String(r.story || '').trim().slice(0, 140), tags: tags, words: words };
}

/** کپشنِ نهایی: متنِ مدل + پیوندِ یوتیوب + مجموعه + برچسب‌ها؛ سقفِ ۲۲۰۰ نویسه و ۳۰ برچسب. */
function igCaption_(plan, ytUrl, seriesName, lesson) {
  var base = (CFG.IG_TAGS_BASE || []).slice();
  var tags = [];
  base.concat(plan.tags || []).forEach(function (t) { if (t && tags.indexOf(t) === -1 && tags.length < 30) tags.push(t); });
  var s = String(plan.caption || '') + '\n\n' +
          '🎧 نسخهٔ کاملِ این درس در یوتیوب:\n' + ytUrl + '\n\n' +
          '📚 مجموعهٔ «' + seriesName + '»' + (lesson ? ' — درسِ ' + lesson : '') + '\n\n' +
          tags.map(function (t) { return '#' + t; }).join(' ');
  return s.length > 2200 ? s.slice(0, 2200) : s;
}

/* ───── مراحل ───── */

function igStepPlan_(it, fo) {
  var epFo = DriveApp.getFolderById(it.folderId);
  var meta = ytEpisodeMeta_(epFo);
  var ep = meta && meta.ep;
  if (!ep || !ep.sections) return { fail: '_special.json یا متنِ درس پیدا نشد' };
  var seriesName = String(meta.seriesName || it.series || ''), lesson = meta.lesson || '';
  var r = null;
  try { r = geminiText_(igPrompt_(ep, seriesName, lesson), IG_REEL_SCHEMA, 8192); }
  catch (e) { return { wait: 'مدلِ متن: ' + String(e.message || e).slice(0, 120) }; }
  var p = igPlanTrim_(r);
  if (!p.lines) return { fail: 'متنِ ریلز پذیرفته نشد: ' + p.why };
  p.lines.push({ text: IG_CTA_LINE, scene: '', cta: true });
  var plan = { v: 1, key: it.key, ep: it.ep, series: seriesName, lesson: lesson, title: String(ep.title || ''),
               yt: it.yt, at: nowStr_(), phase: 'voice', plan: p,
               caption: igCaption_(p, it.yt, seriesName, lesson),
               voice: (ep.__cast && ep.__cast.lead) || CFG.TTS_VOICE_SPECIAL || CFG.TTS_VOICE };
  igPlanWrite_(fo, plan);
  try { fo.createFile(Utilities.newBlob(p.lines.map(function (x) { return x.text; }).join('\n') + '\n\n—— کپشن ——\n' + plan.caption,
                                        'text/plain', 'ریلز — متن و کپشن.txt')); } catch (eT) {}
  return { ok: true, plan: plan };
}

function igStepVoice_(it, fo, plan, deadline) {
  var sr = Number(CFG.SAMPLE_RATE) || 24000, gap = Math.round(sr * 0.28) * 2, lead = Math.round(sr * 0.15) * 2;
  var bytes = [], times = [];
  for (var z = 0; z < lead; z++) bytes.push(0);
  var lines = plan.plan.lines;
  for (var i = 0; i < lines.length; i++) {
    if (Date.now() > deadline) return { wait: 'وقت تمام شد (صدای جملهٔ ' + (i + 1) + ')' };
    var b64 = null;
    try { b64 = ttsChunk_(applyPron_(lines[i].text), '', plan.voice, false); } catch (e) { return { wait: 'گفتارساز: ' + String(e.message || e).slice(0, 120) }; }
    if (!b64) return { wait: 'گفتارساز صدایی نداد' };
    var pcm = Utilities.base64Decode(alignB64_(b64));
    var t0 = bytes.length / (sr * 2);
    for (var k = 0; k < pcm.length; k++) bytes.push(pcm[k]);
    times.push({ t0: Math.round(t0 * 100) / 100, t1: Math.round(bytes.length / (sr * 2) * 100) / 100 });
    for (var g = 0; g < gap; g++) bytes.push(0);
  }
  var wav = Utilities.newBlob(wavHeader54_(bytes.length).concat(bytes), 'audio/wav', 'ریلز — صدا.wav');
  var old = fo.getFilesByName('ریلز — صدا.wav');
  while (old.hasNext()) old.next().setTrashed(true);
  var f = fo.createFile(wav);
  plan.audioId = f.getId();
  plan.times = times;
  plan.seconds = Math.round(bytes.length / (sr * 2) * 10) / 10;
  plan.phase = 'img';
  return { ok: true };
}

/** تصویر است؟ نام یا نوعِ فایل — هر کدام که در دسترس بود. */
function igIsImg_(f) {
  var mt = '';
  try { mt = String(f.getMimeType() || ''); } catch (e) { mt = ''; }
  return /^image\//.test(mt) || /\.(png|jpe?g|webp)$/i.test(String(f.getName() || ''));
}

function igStepImages_(it, fo, plan, deadline) {
  var lines = plan.plan.lines, want = Math.min(Math.max(1, Number(CFG.IG_IMG_N) || 5), lines.length - 1);
  var ids = [], how = '';
  /* ۱) نقاشی‌های خودِ درس، اگر هست — به ترتیبِ نام (صحنه ۰۱، ۰۲…)، پخش روی کلِ درس. */
  try {
    var epFo = DriveApp.getFolderById(it.folderId), lvf = epFo.getFoldersByName(CFG.LV_FOLDER || 'تصویرها');
    if (lvf.hasNext()) {
      var all = [], fi = lvf.next().getFiles();
      while (fi.hasNext()) { var f = fi.next(); if (igIsImg_(f) && !/^کاور/.test(f.getName())) all.push(f); }
      all.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
      if (all.length) {
        for (var i = 0; i < want; i++) {
          var src = all[Math.min(all.length - 1, Math.floor((i + 0.5) * all.length / want))];
          if (ids.length && ids[ids.length - 1].src === src.getId()) continue;
          var cp = src.makeCopy('ریلز — تصویر ' + (ids.length + 1), fo);
          ids.push({ id: cp.getId(), src: src.getId() });
        }
        how = 'نقاشی‌های درس';
      }
    }
  } catch (eL) {}
  /* ۲) وگرنه تصویرِ عمودیِ تازه — فقط اگر تصویرسازی روشن است و سقفِ ماه جا دارد. */
  if (!ids.length) {
    var model = '';
    try { model = lvGenOn_() ? String((lvGenModel_() || {}).id || '') : ''; } catch (eM) { model = ''; }
    if (model && lvGenRoom_(model) >= want) {
      for (var j = 0; j < want; j++) {
        if (Date.now() > deadline) return { wait: 'وقت تمام شد (تصویرِ ' + (j + 1) + ')' };
        var ln = lines[Math.min(lines.length - 2, Math.floor(j * (lines.length - 1) / want))];
        var pr = 'Vertical 9:16 painterly editorial illustration for an educational Persian video. ' +
                 'Absolutely no text, letters, numbers, captions, signs or logos. ' + String(ln.scene || ln.text);
        var g = lvGenOne_(model, pr, { aspect: '9:16' });
        if (g && g.blob) ids.push({ id: fo.createFile(g.blob.setName('ریلز — تصویر ' + (ids.length + 1) + '.png')).getId(), gen: true });
      }
      how = 'تصویرهای تازه (' + ids.length + ')';
    } else {
      how = 'بی تصویر — ' + (model ? 'سقفِ هزینهٔ ماهانهٔ تصویرسازی' : 'تصویرسازی خاموش است');
    }
  }
  plan.imgs = ids;
  plan.imgHow = how;
  plan.phase = 'ask';
  return { ok: true };
}

function igStepAsk_(it, fo, plan) {
  var n = (plan.imgs || []).length, L = plan.plan.lines;
  var lines = L.map(function (x, i) {
    var img = n ? Math.min(n - 1, Math.floor(i * n / Math.max(1, L.length - 1))) : -1;
    return { t0: plan.times[i].t0, t1: plan.times[i].t1, text: x.text, img: img };
  });
  var mk = null;
  try { mk = ytMarkSpec_(); } catch (eM) {}
  var sig = sha256Hex_(plan.audioId + '|' + (plan.imgs || []).map(function (x) { return x.id; }).join(',') + '|' + plan.plan.hook).slice(0, 12);
  var row = { key: it.key, sig: sig, at: nowStr_(),
              audio: { id: plan.audioId, url: ytDlUrl_(plan.audioId) },
              imgs: (plan.imgs || []).map(function (x) { return { id: x.id, url: ytDlUrl_(x.id) }; }),
              lines: lines, hook: plan.plan.hook, kicker: plan.series, coverTitle: plan.plan.coverTitle || plan.plan.hook,
              end: { l1: 'نسخهٔ کاملِ این درس در یوتیوب', l2: (mk && mk.name) || 'رد پای حقیقت',
                     handle: (mk && mk.handle) || '', l3: 'لینک در کپشن' },
              mark: { logoUrl: (mk && mk.logoUrl) ? String(mk.logoUrl).replace(/=s\d+-/, '=s800-') : '' } };
  ytShareOn_(plan.audioId);
  (plan.imgs || []).forEach(function (x) { ytShareOn_(x.id); });
  var d = ytRenderRead_();
  d.reels = (d.reels || []).filter(function (x) { return x && x.key !== it.key; });
  d.reels.push(row);
  if (!ytRenderSave_(d)) return { wait: 'صفِ رانر نوشته نشد' };
  try { ytQueueShare_(); } catch (eQ) {}
  try { ghRenderDue_('ریلزِ ' + it.key); } catch (eG) {}
  plan.sig = sig;
  plan.askedAt = nowStr_();
  plan.phase = 'got';
  return { ok: true };
}

function igStepGot_(it, fo, plan) {
  var doc = ytRenderDocFetch_(), r = doc && doc.reels && doc.reels[it.key];
  if (!r || !r.url || String(r.sig) !== String(plan.sig)) {
    var hrs = (Date.now() - parseWhen_(String(plan.askedAt || ''))) / 3600000;
    return { wait: 'رانر هنوز نساخته' + (isFinite(hrs) ? ' (' + Math.round(hrs) + ' ساعت)' : '') };
  }
  plan.video = r.url; plan.cover = r.cover; plan.seconds = r.seconds || plan.seconds;
  try {
    var b = UrlFetchApp.fetch(r.url, { muteHttpExceptions: true, followRedirects: true });
    if (b.getResponseCode() === 200) fo.createFile(b.getBlob().setName('ریلز — ' + String(plan.title || it.key).slice(0, 60) + '.mp4'));
    var c = UrlFetchApp.fetch(r.cover, { muteHttpExceptions: true, followRedirects: true });
    if (c.getResponseCode() === 200) fo.createFile(c.getBlob().setName('ریلز — کاور.jpg'));
  } catch (eS) { plan.saveWhy = String(eS.message || eS).slice(0, 100); }
  ytShareOff_(plan.audioId);
  (plan.imgs || []).forEach(function (x) { ytShareOff_(x.id); });
  var d = ytRenderRead_();
  var before = (d.reels || []).length;
  d.reels = (d.reels || []).filter(function (x) { return x && x.key !== it.key; });
  if (d.reels.length !== before) ytRenderSave_(d);
  plan.phase = 'ok';
  return { ok: true };
}

/** فهرستِ تأییدِ صاحبِ برنامه — `docs/ig-approve.json` در گیت‌هاب. */
function igApproved_() {
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.IG_APPROVE_FILE || 'docs/ig-approve.json'), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return {};
    var j = JSON.parse(res.getContentText()), m = {};
    (j.approved || []).forEach(function (k) { m[String(k)] = 1; });
    return m;
  } catch (e) { return {}; }
}

function igStepOk_(it, plan, st) {
  var need = Math.max(0, Number(CFG.IG_APPROVE) || 0);
  if ((Number((st.stats || {}).published) || 0) >= need) { plan.phase = 'pub'; return { ok: true }; }
  if (igApproved_()[it.key]) { plan.phase = 'pub'; plan.approvedAt = nowStr_(); return { ok: true }; }
  if (!plan.askedOwner) {
    var msg = '📱 ریلزِ اینستاگرام آماده است و منتظرِ تأییدِ شماست (' + it.key + ')\n«' + plan.plan.hook + '»\n' +
              'ویدئو: ' + plan.video + '\nکاور: ' + plan.cover + '\n\nبرای انتشار، تأیید را به کلاد بگویید.';
    try { tgSend_(msg); } catch (eT) {}
    try { mailQueue_('instagram', 'ریلزِ اینستاگرام منتظرِ تأیید — ' + it.key, msg); } catch (eM) {}
    plan.askedOwner = nowStr_();
  }
  return { wait: 'منتظرِ تأیید (' + ((Number((st.stats || {}).published) || 0) + 1) + ' از ' + need + ')' };
}

/** فراخوانِ Graph؛ کلید در سرآیند. ⇒ {code, j} */
function igApi_(method, path, params) {
  var url = String(CFG.IG_GRAPH || 'https://graph.facebook.com/v23.0') + path;
  var opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + igToken_() } };
  if (params && method === 'post') opt.payload = params;
  else if (params) url += (url.indexOf('?') === -1 ? '?' : '&') + Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  var res = UrlFetchApp.fetch(url, opt), j = {};
  try { j = JSON.parse(res.getContentText() || '{}'); } catch (e) { j = {}; }
  return { code: res.getResponseCode(), j: j };
}
function igErr_(r) { return String((r && r.j && r.j.error && r.j.error.message) || ('پاسخِ ' + (r && r.code))).slice(0, 160); }

/** ظرف را تا «FINISHED» می‌پاید ⇒ '' یا دلیل. */
function igWaitContainer_(cid, deadline) {
  while (Date.now() < deadline) {
    var r = igApi_('get', '/' + cid, { fields: 'status_code,status' });
    var s = String((r.j && r.j.status_code) || '');
    if (s === 'FINISHED') return '';
    if (s === 'ERROR' || s === 'EXPIRED') return 'ظرف: ' + s + ' — ' + String(r.j.status || '').slice(0, 120);
    Utilities.sleep(15000);
  }
  return 'wait';
}

function igStepPub_(it, plan, st, deadline) {
  var a = igAcct_();
  if (!a) return { wait: 'حسابِ اینستاگرام ثبت نیست' };
  var day = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  st.stats = st.stats || {};
  if (st.stats.day !== day) { st.stats.day = day; st.stats.dayN = 0; }
  if ((Number(st.stats.dayN) || 0) >= Math.max(1, Number(CFG.IG_PER_DAY) || 4)) return { wait: 'سهمِ امروز پر شد' };
  if (!plan.reelCid) {
    var c = igApi_('post', '/' + a.ig + '/media', { media_type: 'REELS', video_url: plan.video, cover_url: plan.cover,
                                                    caption: plan.caption, share_to_feed: 'true' });
    if (!(c.j && c.j.id)) return { fail: 'ظرفِ ریلز ساخته نشد: ' + igErr_(c) };
    plan.reelCid = String(c.j.id);
  }
  if (!plan.reelId) {
    var w = igWaitContainer_(plan.reelCid, deadline);
    if (w === 'wait') return { wait: 'ویدئو در متا هنوز آماده نیست' };
    if (w) { plan.reelCid = ''; return { fail: w }; }
    var p = igApi_('post', '/' + a.ig + '/media_publish', { creation_id: plan.reelCid });
    if (!(p.j && p.j.id)) return { fail: 'انتشارِ ریلز: ' + igErr_(p) };
    plan.reelId = String(p.j.id);
    try { plan.permalink = String((igApi_('get', '/' + plan.reelId, { fields: 'permalink' }).j || {}).permalink || ''); } catch (eP) {}
    st.stats.dayN = (Number(st.stats.dayN) || 0) + 1;
    st.stats.published = (Number(st.stats.published) || 0) + 1;
  }
  /* استوری: کاورِ همان ریلز. شکستش ریلز را «نشد» نمی‌کند — ریلز منتشر شده و منتشرشده برنمی‌گردد. */
  if (CFG.IG_STORY !== false && !plan.storyId && !plan.storyWhy) {
    var s = igApi_('post', '/' + a.ig + '/media', { media_type: 'STORIES', image_url: plan.cover });
    if (s.j && s.j.id) {
      var ws = igWaitContainer_(String(s.j.id), deadline);
      if (!ws) {
        var ps = igApi_('post', '/' + a.ig + '/media_publish', { creation_id: String(s.j.id) });
        if (ps.j && ps.j.id) plan.storyId = String(ps.j.id); else plan.storyWhy = igErr_(ps);
      } else if (ws !== 'wait') plan.storyWhy = ws;
    } else plan.storyWhy = igErr_(s);
  }
  plan.phase = 'done';
  plan.doneAt = nowStr_();
  try { igLog_(it, plan); } catch (eL) {}
  try { tgSend_('✅ ریلزِ اینستاگرام منتشر شد: ' + (plan.permalink || plan.reelId) + '\n«' + plan.plan.hook + '»'); } catch (eT) {}
  return { ok: true };
}

/** یک ردیف در تبِ «انتشار در اینستاگرام». */
function igLog_(it, plan) {
  var hub = getHub_(), nm = CFG.IG_TAB || 'انتشار در اینستاگرام';
  var sh = hub.getSheetByName(nm);
  if (!sh) { sh = hub.insertSheet(nm); sh.appendRow(['زمان', 'قسمت', 'مجموعه', 'درس', 'قلاب', 'ریلز', 'استوری', 'یوتیوب', 'تصویرها', 'ثانیه']); }
  sh.appendRow([nowStr_(), it.ep, plan.series, plan.lesson, plan.plan.hook, plan.permalink || plan.reelId || '',
                plan.storyId ? 'منتشر شد' : (plan.storyWhy || ''), plan.yt, plan.imgHow || '', plan.seconds || '']);
}

/* ───── گردانندهٔ اجرای جدا ───── */

/** درِ ساعتی: فقط Properties؛ کار در اجرای جدای خودش (همان شکلِ `speakAbArm_`). */
function igArm_() {
  if (!igOn_()) return false;
  var st = igState_();
  if (st.armedAt && Date.now() - Number(st.armedAt) < 50 * 60000) return false;
  if (engineBusyForSwap_()) return false;
  st.armedAt = Date.now();
  igStateSave_(st);
  clearRetryTriggers_('igTick');
  ScriptApp.newTrigger('igTick').timeBased().after(60000).create();
  return true;
}

/** یک دور: ریلزهای در جریان یک گام جلو، و اگر جا هست یکی تازه. */
function igTick() {
  runEnter_('igTick');
  var t0 = Date.now(), deadline = t0 + Math.max(60, Number(CFG.IG_TICK_SEC) || 240) * 1000;
  var st = igState_();
  try {
    try { clearRetryTriggers_('igTick'); } catch (eC) {}
    if (!igOn_()) return null;
    st.inflight = st.inflight || [];
    if (st.inflight.length < Math.max(1, Number(CFG.IG_INFLIGHT) || 2)) {
      var nx = igNextEp_(ytPublished_(getHub_()), st);
      if (nx) {
        var fo0 = ytFolderOf_(ENRICH_SHOW_SPECIAL, nx.ep, nx.series);
        if (fo0) st.inflight.push({ key: 'ig:' + ENRICH_SHOW_SPECIAL + ':' + nx.ep, ep: nx.ep, series: nx.series,
                                    folderId: fo0.getId(), yt: nx.url, phase: 'plan', at: nowStr_() });
        else { st.fails = st.fails || {}; st.fails[String(nx.ep)] = 9; st.lastWhy = 'پوشهٔ قسمتِ ' + nx.ep + ' پیدا نشد'; }
      }
    }
    var keep = [];
    for (var i = 0; i < st.inflight.length; i++) {
      var it = st.inflight[i], res = null;
      if (Date.now() > deadline) { keep.push(it); continue; }
      try { res = igStep_(it, st, deadline); } catch (e) { res = { wait: String(e.message || e).slice(0, 140) }; }
      it.why = res.wait || res.fail || '';
      if (it.sincePhase !== it.phase) { it.sincePhase = it.phase; it.since = Date.now(); }
      if (res.done) { st.done = (st.done ? st.done + ',' : '') + it.ep; st.lastAt = nowStr_(); continue; }
      if (res.fail) {
        st.fails = st.fails || {};
        st.fails[String(it.ep)] = (Number(st.fails[String(it.ep)]) || 0) + 1;
        st.lastWhy = it.key + ': ' + res.fail;
        if (st.fails[String(it.ep)] >= Math.max(1, Number(CFG.IG_TRY_MAX) || 3)) continue;
        it.phase = 'plan';                         // از نو، با مدلِ تازه
      }
      keep.push(it);
    }
    st.inflight = keep;
    return null;
  } finally {
    st.armedAt = 0;
    st.ranAt = nowStr_();
    st.ranMs = Date.now();
    igStateSave_(st);
    runExit_('igTick');
  }
}

/** یک گامِ یک ریلز. ⇒ {done} | {ok} | {wait} | {fail} */
function igStep_(it, st, deadline) {
  var fo = igFolder_(DriveApp.getFolderById(it.folderId));
  var plan = it.phase === 'plan' ? null : igPlanRead_(fo);
  if (it.phase !== 'plan' && !plan) it.phase = 'plan';
  var r;
  for (var guard = 0; guard < 8 && Date.now() < deadline; guard++) {
    if (it.phase === 'plan') { r = igStepPlan_(it, fo); if (!r.ok) return r; plan = r.plan; it.phase = plan.phase; continue; }
    if (plan.phase === 'voice') r = igStepVoice_(it, fo, plan, deadline);
    else if (plan.phase === 'img') r = igStepImages_(it, fo, plan, deadline);
    else if (plan.phase === 'ask') r = igStepAsk_(it, fo, plan);
    else if (plan.phase === 'got') r = igStepGot_(it, fo, plan);
    else if (plan.phase === 'ok') r = igStepOk_(it, plan, st);
    else if (plan.phase === 'pub') r = igStepPub_(it, plan, st, deadline);
    else if (plan.phase === 'done') return { done: true };
    else { plan.phase = 'voice'; continue; }
    igPlanWrite_(fo, plan);
    it.phase = plan.phase;
    if (!r.ok) return r;
    if (plan.phase === 'done') return { done: true };
  }
  return { wait: 'ادامه در دورِ بعد' };
}

/** برای `_STATUS.json` — فقط Properties. */
function igStatus_() {
  var st = igState_(), a = igAcct_();
  var on = CFG.IG_ON !== false && !!a;
  var done = String(st.done || '').split(',').filter(Boolean).length;
  var fl = st.inflight || [];
  var out = { on: on, user: a ? a.user : '', done: done, published: Number((st.stats || {}).published) || 0,
              today: (st.stats || {}).day === Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd') ? Number(st.stats.dayN) || 0 : 0,
              inflight: fl.map(function (x) { return { key: x.key, phase: x.phase, why: x.why || '' }; }),
              lastAt: st.lastAt || '', lastWhy: st.lastWhy || '', ranAt: st.ranAt || '' };
  out.line = !a ? 'اینستاگرام: کلید ثبت نشده (منوی «۴) کلیدِ اینستاگرام (متا)»).'
    : 'اینستاگرام @' + a.user + ': ' + out.published + ' ریلز منتشر شده، امروز ' + out.today + '؛ در جریان: ' +
      (fl.length ? fl.map(function (x) { return x.key.split(':').pop() + ' (' + x.phase + (x.why ? ' — ' + x.why : '') + ')'; }).join('، ') : 'هیچ') +
      (out.lastWhy ? '. آخرین ایراد: ' + out.lastWhy : '') +
      '. ⟨شما⟩ هایلایت و برچسبِ پیوندِ استوری از API در دسترس نیست — از خودِ اپ.';
  return out;
}

/**
 * سلامتِ روزانه: خطِ اینستاگرام **همیشه** در یادداشت‌ها (سکوت با «هیچ ریلزی نرفت» یکی است)، و مسئلهٔ روز وقتی
 * (۱) روشن است ولی اجرای جدا بیش از `IG_IDLE_H` ساعت ندویده، یا (۲) ریلزی بیش از `IG_STUCK_H` ساعت در یک گام
 * مانده — مگر گامِ «تأیید» که کارِ صاحبِ برنامه است، نه خرابی — یا (۳) درسی به سقفِ تلاش رسید و کنار رفت.
 */
function igHealth_(problems, notes) {
  var s = igStatus_();
  if (s.line) notes.push(s.line);
  if (!s.on) return s;
  var st = igState_(), now = Date.now(), bad = [];
  var ran = Number(st.ranMs) || 0;
  if (igToken_() && (!ran || now - ran > (Number(CFG.IG_IDLE_H) || 6) * 3600000))
    bad.push('اجرای ریلز ' + (ran ? Math.round((now - ran) / 3600000) + ' ساعت است' : 'هرگز') + ' ندویده');
  (st.inflight || []).forEach(function (x) {
    if (x.phase === 'ok') return;
    if (!x.since || x.sincePhase !== x.phase) return;
    var h = (now - Number(x.since)) / 3600000;
    if (h > (Number(CFG.IG_STUCK_H) || 30)) bad.push(x.key + ' ' + Math.round(h) + ' ساعت در گامِ «' + x.phase + '»' + (x.why ? ' — ' + x.why : ''));
  });
  var maxTry = Math.max(1, Number(CFG.IG_TRY_MAX) || 3), gave = [];
  for (var k in (st.fails || {})) if ((Number(st.fails[k]) || 0) >= maxTry) gave.push(k);
  if (gave.length) bad.push('درس‌های کنارگذاشته پس از ' + maxTry + ' شکست: ' + gave.join('، ') + (st.lastWhy ? ' (آخرین: ' + st.lastWhy + ')' : ''));
  if (bad.length) {
    problems.push('📱 اینستاگرام: ' + bad.join(' · '));
    try {
      logSelfFinding_(getHub_(), {
        priority: 'متوسط', category: 'اینستاگرام', key: 'ig-stuck',
        title: 'ریلزِ اینستاگرام جلو نمی‌رود',
        detail: bad.join(' · '),
        instruction: 'گام‌ها در src/38_Instagram.gs (igStep_). «got» دیرکرده یعنی رانر (`reels` در `_YT-RENDER.json` و ' +
                     '`docs/renders.json`)؛ «pub» یعنی Graph (پیامِ خطا در why)؛ «ندویده» یعنی igArm_ در vbrCollectHourly. ' +
                     '`_ig.json`ِ پوشهٔ «اینستاگرام»ِ همان قسمت را بخوان.',
        owner: ROWNER_CODE
      });
    } catch (eF) {}
  }
  return s;
}
