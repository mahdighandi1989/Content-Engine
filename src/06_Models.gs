/**
 * 06_Models.gs — انتخاب و به‌روزرسانی خودکار مدل
 *
 * هیچ نام مدلی در کد قفل نشده است. موتور فهرست مدل‌های زندهٔ حساب شما را از خود
 * گوگل می‌گیرد، بالاترین مدل موجود را انتخاب می‌کند و نتیجه را هفتگی تازه می‌کند.
 * اگر مدلی بازنشسته شود، به‌جای خطا دادن، فهرست را دوباره می‌گیرد و با مدل جانشین
 * همان کار را ادامه می‌دهد. پس نیازی نیست شما مراقب بازنشستگی مدل‌ها باشید.
 */

var MODEL_BLOCK = ['embedding', 'embed', 'aqa', 'imagen', 'veo', 'gemma', 'learnlm',
                   'image', 'vision', 'live', 'native-audio', 'realtime', 'guard'];

/** استخراج نسخه، رده و پیش‌نمایش‌بودن از شناسهٔ مدل */
function modelMeta_(id) {
  var s = String(id).toLowerCase();
  var v = 0;
  var m = s.match(/gemini-(\d+)(?:[.\-](\d+))?/);
  if (m) v = parseFloat(m[1] + '.' + (m[2] || '0'));
  var tier;
  if (s.indexOf('flash-lite') !== -1 || s.indexOf('lite') !== -1) tier = 1;
  else if (/(^|-)pro(-|$)/.test(s)) tier = 3;
  else tier = 2;                                     // flash و بقیه
  var preview = /(preview|exp\b|experimental|rc\d*|beta)/.test(s);
  return { version: v, tier: tier, preview: preview };
}

/**
 * امتیاز رتبه‌بندی. اول تازگیِ نسخه، بعد ردهٔ مدل (pro > flash > lite)،
 * و در نسخهٔ برابر، نسخهٔ پایدار بر پیش‌نمایش مقدم است.
 */
function modelScore_(id) {
  var t = modelMeta_(id);
  return t.version * 10000 + t.tier * 1000 + (t.preview ? 0 : 100);
}

function listModels_() {
  var out = [], token = '', guard = 0;
  do {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=' +
              encodeURIComponent(apiKey_()) + (token ? '&pageToken=' + encodeURIComponent(token) : '');
    var res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error('فهرست مدل‌ها گرفته نشد (HTTP ' + res.getResponseCode() + '): ' +
                      res.getContentText().slice(0, 200));
    }
    var j = JSON.parse(res.getContentText());
    var arr = j.models || [];
    for (var i = 0; i < arr.length; i++) out.push(arr[i]);
    token = j.nextPageToken || '';
  } while (token && ++guard < 10);
  return out;
}

function isBlocked_(id) {
  var s = String(id).toLowerCase();
  for (var i = 0; i < MODEL_BLOCK.length; i++) if (s.indexOf(MODEL_BLOCK[i]) !== -1) return true;
  return false;
}

/**
 * تعیین بهترین مدل متنی و بهترین مدل صوتی.
 * @param {boolean} force اگر true باشد، کش نادیده گرفته می‌شود.
 */
function resolveModels_(force) {
  var raw = props_().getProperty(PK.MODELS);
  if (!force && raw) {
    try {
      var c = JSON.parse(raw);
      var ageDays = (new Date().getTime() - (c.at || 0)) / 86400000;
      if (c.text && c.tts && ageDays < CFG.MODEL_REFRESH_DAYS) return c;
    } catch (e) { /* کش خراب؛ دوباره می‌سازیم */ }
  }

  var chosen = { text: '', tts: '', at: new Date().getTime(), textAll: [], ttsAll: [] };
  var bad = [];
  try { bad = modelBadList_(); } catch (eB) {}
  try {
    var models = listModels_();
    var texts = [], ttss = [];
    for (var i = 0; i < models.length; i++) {
      var mm = models[i];
      var id = String(mm.name || '').replace(/^models\//, '');
      var methods = mm.supportedGenerationMethods || mm.supported_generation_methods || [];
      if (methods.indexOf('generateContent') === -1) continue;
      if (id.toLowerCase().indexOf('gemini') !== 0) continue;

      if (id.toLowerCase().indexOf('tts') !== -1) { ttss.push(id); continue; }
      if (isBlocked_(id)) continue;
      // مدلی که داوری ردش کرده دوباره انتخاب نمی‌شود، وگرنه هر هفته همان
      // تعویضِ بد تکرار می‌شود و داوری بی‌فایده است
      if (bad.indexOf(id) !== -1) continue;
      texts.push(id);
    }
    var byScore = function (a, b) { return modelScore_(b) - modelScore_(a); };
    texts.sort(byScore); ttss.sort(byScore);
    /* فهرستِ **کاملِ** مدل‌های صوتیِ حساب، پیش از هر صافی — تنها پاسخِ درست به
       «سنجاقِ او هنوز هست؟» (۸.۳۸). `ttsAll` جواب نمی‌دهد: صافیِ دستورِ لحن
       همان سنجاق را از آن بیرون می‌اندازد. */
    chosen.ttsAvail = ttss.slice(0);

    // سیاست «stable»: پیش‌نمایش‌ها کنار گذاشته می‌شوند — مگر آنکه چیزی باقی نماند
    // (مدل‌های صوتی فعلاً همگی پیش‌نمایش‌اند، پس آنجا خودکار نادیده گرفته می‌شود).
    if (CFG.MODEL_POLICY === 'stable') {
      var st = texts.filter(function (x) { return !modelMeta_(x).preview; });
      if (st.length) texts = st;
      var sa = ttss.filter(function (x) { return !modelMeta_(x).preview; });
      if (sa.length) ttss = sa;
    }

    /* ══ حکمی که به تصمیم وصل نشود، حکم نیست (۷٫۴۷) ══
       مدلِ **متنی** که داوری ردش کرده بالاتر کنار گذاشته می‌شود؛ مدلِ
       **صوتی** هرگز از آن دروازه رد نمی‌شد، چون `continue`اش چند خط
       پیش از وارسیِ `bad` است. و جدا از آن، حکمِ «این مدل دستورِ لحن را
       نمی‌پذیرد» هر روز در ایمیلِ سلامت گفته می‌شد و **هیچ اثری بر
       انتخابِ مدل نداشت**: همان مدل دوباره انتخاب می‌شد، تا ابد. هشتمین
       بار در این مخزن که تحلیلی نوشته شده و به تصمیم وصل نشده.

       ترجیح است، نه حذف: اگر همهٔ مدل‌های صوتی دستور را رد کنند فهرست
       دست‌نخورده می‌مانَد — بی مدلِ صوتی **هیچ قسمتی ساخته نمی‌شود**، و آن
       از بی‌لحن بودن بسیار بدتر است. همان الگوی `stable` دو خط بالاتر. */
    var cueOk = ttss.filter(function (x) {
      try { return !ttsCueBadNow_(x); } catch (eC) { return true; }
    });
    if (cueOk.length) ttss = cueOk;

    /* ══ سنجاقِ گوشِ او بر هر دو صافیِ بالا مقدم است (۸.۳۸) ══
       صافیِ «دستور را می‌پذیرد» برای مدلی ساخته شد که لحن را برگرداند؛ هیچ
       مدلی برنگرداند و صافی فقط هر روز صدای دیگری انتخاب کرد. مدلی که او
       شنیده و پسندیده، تا وقتی در حساب هست، می‌مانَد. نبودنش گفته می‌شود
       (`pinMissing`)، نه اینکه بی‌صدا به انتخابِ خودکار برگردد. */
    var pin = String(CFG.TTS_MODEL_PIN || '').trim();
    if (pin && chosen.ttsAvail.indexOf(pin) !== -1) {
      ttss = [pin].concat(ttss.filter(function (x) { return x !== pin; }));
      chosen.pinned = pin;
    } else {
      if (pin) chosen.pinMissing = pin;
      /* ══ جانشین با همان گوش، نه با بالاترین امتیاز (۸.۳۹) ══
         سنجاق که رفت، تا ۸.۳۸ بالاترین مدل جایش می‌نشست — شاید همان
         3.8-flash که او «با اضطراب» شنید. حالا مدلی که آزمونش با مرجعِ
         سنجاق **هم‌خوان** است جلو می‌آید، بعد نسنجیده، و ناهم‌خوان آخر.
         بی مرجع هیچ ترتیبی عوض نمی‌شود: «نمی‌دانیم» دلیلِ جابه‌جایی نیست. */
      try {
        var fo = ttsFitOrder_(chosen.ttsAvail);
        if (fo && fo.list.length) { ttss = fo.list; chosen.ttsVet = fo.top; }
      } catch (eFo) {}
    }

    chosen.textAll = texts.slice(0, 6);
    chosen.ttsAll = ttss.slice(0, 6);
    chosen.text = texts[0] || CFG.FALLBACK_TEXT_MODEL;
    chosen.tts = ttss[0] || CFG.FALLBACK_TTS_MODEL;
    chosen.policy = CFG.MODEL_POLICY;
  } catch (e) {
    logLine_('انتخاب خودکار مدل ناموفق بود، از پیش‌فرض استفاده می‌شود: ' + e.message);
    /* نشانه‌گذاری لازم است: `textAll` در این حالت «آنچه روی حساب هست» نیست،
       «آنچه حدس زده‌ایم» است. هر کسی که بخواهد مدلی را با این فهرست بسنجد
       (مثلِ نظارتِ کیفیِ بخشِ ۲۸) باید بداند که این شهادت نیست. */
    chosen.fallback = true;
    chosen.text = CFG.FALLBACK_TEXT_MODEL;
    chosen.tts = CFG.FALLBACK_TTS_MODEL;
    chosen.textAll = [CFG.FALLBACK_TEXT_MODEL];
    chosen.ttsAll = [CFG.FALLBACK_TTS_MODEL];
  }

  var prev = null;
  try { prev = raw ? JSON.parse(raw) : null; } catch (e2) {}
  if (!prev || prev.text !== chosen.text || prev.tts !== chosen.tts) {
    logLine_('مدل‌ها به‌روز شد — متن: ' + chosen.text + ' · صوت: ' + chosen.tts);
    // تعویضِ مدلِ متنی خبر است، نه یک خطِ سیاهه — و پایه‌اش همین‌جا ثبت
    // می‌شود، پیش از آنکه مدلِ تازه اثری بگذارد
    if (prev && prev.text && prev.text !== chosen.text) {
      try { modelSwapNote_(prev.text, chosen.text); } catch (eSw) {}
    }
  }
  props_().setProperty(PK.MODELS, JSON.stringify(chosen));
  return chosen;
}

function textModel_() {
  var d = props_().getProperty(PK.DEMOTED_UNTIL);
  var m = resolveModels_(false);
  if (d && new Date().getTime() < parseInt(d, 10)) {
    var alt = pickLowerTier_(m.textAll, m.text);
    if (alt) return alt;
  }
  return m.text || CFG.FALLBACK_TEXT_MODEL;
}

function ttsModel_() {
  var m = resolveModels_(false);
  /* کشِ پیش از ۸.۳۸ (تا هفت روز) سنجاق را نمی‌شناسد و هنوز مدلِ دیروز را
     دارد؛ پس سنجاق همین‌جا هم خوانده می‌شود، نه فقط هنگامِ ساختنِ کش. فقط
     فهرستی که **صریحاً** می‌گوید سنجاق نیست کنارش می‌گذارد؛ مدلی که واقعاً
     رفته باشد، خطای «مدل نیست» می‌دهد و `ttsChunkTry_` کش را از نو می‌سازد. */
  var pin = String(CFG.TTS_MODEL_PIN || '').trim();
  if (pin && !(m.ttsAvail && m.ttsAvail.indexOf(pin) === -1)) return pin;
  return m.tts || CFG.FALLBACK_TTS_MODEL;
}

/**
 * اگر مدلِ صوتیِ فعلی دستورِ لحن را رد کرده و جایگزینی هست، همین حالا برو.
 *
 * ══ چرا این لازم است و چرا **اینجا** (۷٫۴۷) ══
 * ترجیحِ بالا فقط هنگامِ ساختنِ دوبارهٔ کش اثر می‌کند، و کش
 * `MODEL_REFRESH_DAYS` روز (۷) عمر دارد. یعنی بی این، موتور تا یک هفته
 * با مدلی می‌مانْد که لحن را نمی‌پذیرد، در حالی که جایگزینش موجود بود.
 *
 * و **وسطِ قسمت نه**: عوض شدنِ مدلِ صوتی میانِ تکه‌ها یعنی نیمِ اولِ قسمت
 * با یک رنگ و نیمِ دوم با رنگِ دیگر — درزی شنیدنی، برای بهبودی که عجله
 * ندارد. پس از `healthCheck` پرسیده می‌شود: ساعتِ ۱۰، بینِ دو قسمت.
 * همان قاعدهٔ ۷٫۲۷/۷٫۳۹ — مسیرِ مستقل با زمان‌بندیِ خودش.
 */
function ttsCueSwitch_() {
  var out = { need: false, from: '', to: '', alt: 0, switched: false, why: '' };
  try { out.from = String(ttsModel_() || ''); } catch (e) { return out; }
  if (!out.from) return out;
  /* مدلِ سنجاق‌شده عوض نمی‌شود، حتی اگر دستور را نپذیرد (۸.۳۸): آن تعویض‌ها
     لحن را برنگرداندند و فقط صدای هر روز را عوض کردند. «نپذیرفتنِ دستور»
     این‌جا ایراد شمرده نمی‌شود؛ لحن از نشانه‌های متن می‌آید (۸.۰۸). */
  if (out.from === String(CFG.TTS_MODEL_PIN || '').trim()) {
    out.pinned = true;
    return out;
  }
  try { if (!ttsCueBadNow_(out.from)) return out; } catch (e2) { return out; }
  out.need = true;
  var m = null;
  try { m = resolveModels_(true); }
  catch (e3) { out.why = String((e3 && e3.message) || e3).slice(0, 80); return out; }
  var all = (m && m.ttsAll) || [];
  for (var i = 0; i < all.length; i++) {
    try { if (!ttsCueBadNow_(all[i])) out.alt++; } catch (e4) {}
  }
  out.to = String((m && m.tts) || '');
  out.switched = !!(out.to && out.to !== out.from);
  return out;
}

/* ══════════ آزمونِ مدلِ صوتی — «جانشینی که همان‌طور بخوانَد» (۸.۳۹) ══════════
 *
 * ۴ اکتبر او پرسید: «اگر این مدل دوباره آپدیت بشه به مدلی که خوشم نیومد چی؟
 * و اگر قفلش کنی و بعداً اکسپایر بشه هم که یه افتضاحِ دیگه‌ست.» هر دو درست
 * بود. سنجاقِ ۸.۳۸ فقط تا وقتی کار می‌کند که مدل در حسابِ گوگل هست، و آن روز
 * که برود، انتخابِ خودکار بالاترین را برمی‌داشت.
 *
 * پس «خوب خواند» باید **عدد** شود، و عددها از فایل‌های واقعیِ همان شب درآمد
 * (همان متن، همان صدا): 3.8-flash گفتارِ واقعی را ۱۳ تا ۱۵٪ تندتر می‌گفت و
 * زیروبمش ۲ تا ۲٫۵ نیم‌پرده بم‌تر بود. «اضطراب» همان تندی است.
 *
 * سه قاعده که این بخش را از یک حدسِ تازه جدا می‌کند:
 * ۱) **مرجع از خودِ سنجاق گرفته می‌شود، با همین ابزار**، نه از عددی که من
 *    نوشته باشم. سنجاق همان است که گوشِ او پسندید؛ مرجع یعنی «مثلِ آن».
 * ۲) **مرجع یک بار گرفته می‌شود و بی‌صدا تازه نمی‌شود.** اگر هر هفته از نو
 *    گرفته شود، دگرگونیِ آهستهٔ خودِ مدل هیچ‌وقت دیده نمی‌شود. بالا بردنِ
 *    `TTS_PROFILE_VER` (یا عوض شدنِ سنجاق) تنها درِ گرفتنِ دوباره است.
 * ۳) **«نسنجیده» ناهم‌خوان نیست** (۷٫۴۰): بی مرجع یا بی آزمون، ترتیب همان
 *    می‌مانَد که بود و همین گفته می‌شود.
 *
 * و هیچ مدلی خودکار جای سنجاقِ زنده را نمی‌گیرد، حتی اگر سنجاق دگرگون شده
 * باشد: آن تصمیمِ گوشِ اوست. موتور می‌گوید، یافته می‌سازد، و نمونه را می‌دهد.
 */

function ttsAuditRead_() {
  try { return JSON.parse(props_().getProperty(PK.TTS_AUDITS) || '{}') || {}; }
  catch (e) { return {}; }
}
function ttsAuditSave_(m) { props_().setProperty(PK.TTS_AUDITS, JSON.stringify(m || {})); }
function ttsProfileRead_() {
  try {
    var p = JSON.parse(props_().getProperty(PK.TTS_PROFILE) || 'null');
    return (p && p.model && p.rate > 0) ? p : null;
  } catch (e) { return null; }
}
function ttsProfileSave_(p) { props_().setProperty(PK.TTS_PROFILE, JSON.stringify(p)); }

/** رقمِ فارسی — همان کارِ `faDigitsOut_`، ولی آن در بخشِ ۲۵ است و این‌جا ۰۶:
    صدا زدنِ رو به جلو یعنی هر بارکنندهٔ جزئی در `tests/` با ReferenceError
    می‌شکند (۵٫۵۲). */
function ttsFaNum_(n) {
  return String(n).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(Number(d)); })
                  .replace(/\./g, '٫');
}

/** شمارِ حروفِ متن (بی اعراب، نیم‌فاصله، فاصله و نشانه) — مخرجِ تندیِ گفتار. */
function ttsLetters_(text) {
  return (String(text || '').match(/[ء-غف-يٱ-ۓ]/g) || []).length;
}

/** چند روز از این تاریخ گذشته؛ تاریخِ ناخوانا ⇒ بی‌نهایت (یعنی «کهنه»). */
function ttsAgeDays_(at) {
  if (!at) return Infinity;
  var t = Date.parse(String(at).replace(' ', 'T'));
  if (!isFinite(t)) return Infinity;
  return (new Date().getTime() - t) / 86400000;
}

/**
 * سه عدد از خودِ صوت: تندیِ گفتار، زیروبمِ میانه، و مکث‌ها.
 *
 * ══ «تندی» یعنی حرف بر ثانیهٔ **گفتارِ واقعی**، نه بر کلِ زمان ══
 * روی فایل‌های ۴ اکتبر کلِ زمان گول می‌زد: 3.8-flash مکث‌های بیشتری
 * می‌گذاشت (سهمِ مکث ۱۹ تا ۲۰٪ در برابرِ ۱۴ تا ۱۵٪)، پس کلِ زمانش فقط ۱۲٪
 * کوتاه‌تر بود، ولی خودِ گفتار ۱۳ تا ۱۵٪ تندتر. همان «تند حرف می‌زند و
 * بریده‌بریده» که «اضطراب» شنیده می‌شود.
 *
 * زیروبم با خودهمبستگی روی صوتِ کاهش‌نرخ‌یافته به ۸ کیلوهرتز، فقط در
 * قاب‌های بلندِ گفتار؛ و از میانِ قله‌ها **کوچک‌ترین** تأخیری که به ۸۰٪ِ
 * بیشینه می‌رسد، تا یک اکتاو پایین‌تر به‌جای زیروبمِ درست برداشته نشود.
 * بایت‌ها علامت‌دارند و بایتِ پایین ماسک می‌شود (بخشِ ۲۳).
 */
function ttsPcmProfile_(bytes, sr, letters) {
  sr = Number(sr) || Number(CFG.SAMPLE_RATE) || 24000;
  var n = Math.floor((bytes ? bytes.length : 0) / 2);
  var out = { secs: 0, voiced: 0, rate: 0, f0: 0, pauseShare: 0, ppm: 0 };
  var fl = Math.max(1, Math.round(sr * 0.02));
  var m = Math.floor(n / fl);
  if (m < 10) return out;
  var smp = function (i) { return (bytes[2 * i] & 255) | (bytes[2 * i + 1] << 8); };
  var db = new Array(m);
  for (var f = 0; f < m; f++) {
    var acc = 0;
    for (var i = f * fl, e = i + fl; i < e; i++) { var v = smp(i); acc += v * v; }
    db[f] = 10 * Math.log(acc / fl / 1073741824 + 1e-12) / Math.LN10;
  }
  var sorted = db.slice(0).sort(function (a, b) { return a - b; });
  var ref = sorted[Math.min(m - 1, Math.floor(m * 0.95))];
  var thr = ref - 35;
  var a0 = 0, b0 = m - 1;
  while (a0 < m && db[a0] < thr) a0++;
  while (b0 > a0 && db[b0] < thr) b0--;
  if (a0 >= b0) return out;
  var voiced = 0, pauses = 0, pauseFr = 0, run = 0;
  for (var k = a0; k <= b0; k++) {
    if (db[k] < thr) { run++; continue; }
    voiced++;
    if (run >= 13) { pauses++; pauseFr += run; }
    run = 0;
  }
  out.secs = Math.round((b0 - a0 + 1) * 2) / 100;
  out.voiced = Math.round(voiced * 2) / 100;
  out.rate = voiced ? Math.round(letters / (voiced * 0.02) * 100) / 100 : 0;
  out.pauseShare = Math.round(pauseFr / (b0 - a0 + 1) * 1000) / 1000;
  out.ppm = out.secs ? Math.round(pauses / out.secs * 600) / 10 : 0;

  /* زیروبم */
  var dec = Math.max(1, Math.round(sr / 8000)), dsr = sr / dec;
  var W = Math.round(dsr * 0.04), lo = Math.floor(dsr / 400), hi = Math.ceil(dsr / 60);
  var loud = [];
  for (var q = a0; q <= b0; q++) if (db[q] >= ref - 15) loud.push(q);
  var step = Math.max(1, Math.floor(loud.length / 400));
  var f0s = [];
  for (var z = 0; z < loud.length; z += step) {
    var s0 = loud[z] * fl;
    var need = (W + hi + 1) * dec;
    if (s0 + need > n) continue;
    var y = new Array(W + hi + 1);
    for (var d = 0; d < y.length; d++) {
      var sum = 0;
      for (var r = 0; r < dec; r++) sum += smp(s0 + d * dec + r);
      y[d] = sum / dec;
    }
    var e0 = 0;
    for (var t = 0; t < W; t++) e0 += y[t] * y[t];
    if (!(e0 > 0)) continue;
    var best = 0, cors = {};
    for (var lag = lo; lag <= hi; lag++) {
      var num = 0, e1 = 0;
      for (var t2 = 0; t2 < W; t2++) { num += y[t2] * y[t2 + lag]; e1 += y[t2 + lag] * y[t2 + lag]; }
      var c = (e1 > 0) ? num / Math.sqrt(e0 * e1) : 0;
      cors[lag] = c;
      if (c > best) best = c;
    }
    if (best < 0.5) continue;
    for (var lg = lo; lg <= hi; lg++) {
      /* نخستین قلهٔ محلی که به ۸۰٪ِ بیشینه می‌رسد. ۹۰٪ کافی نبود: در صدای
         خِرخِری (چرخه‌های یکی‌درمیان) دورهٔ درست حدودِ ۸۵٪ است و یک اکتاو
         پایین‌تر برداشته می‌شد — ۱.۷ِ آزمون همین را گرفت. */
      if (cors[lg] >= 0.8 * best && cors[lg] >= (cors[lg - 1] || -1) && cors[lg] >= (cors[lg + 1] || -1)) {
        f0s.push(dsr / lg); break;
      }
    }
  }
  if (f0s.length >= 5) {
    f0s.sort(function (a, b) { return a - b; });
    out.f0 = Math.round(f0s[Math.floor(f0s.length / 2)] * 10) / 10;
  }
  return out;
}

/**
 * یک بار خواندنِ متنِ آزمون با این مدل — بی دستورِ لحن، با صدای ثابت، و بی
 * هیچ اثرِ جانبی بر قالب یا انتخابِ مدلِ تولید. PCM از `extractAudioB64_`
 * می‌آید، پس بستهٔ WAV و برچسبِ C2PA (۸.۳۸) این‌جا هم باز می‌شود.
 */
function ttsAuditionPcm_(model) {
  var voice = String(CFG.TTS_AUDITION_VOICE || '').trim() || CFG.TTS_VOICE;
  var modes = ttsPayloads_(String(CFG.TTS_AUDITION_TEXT || ''), model, '', voice, false);
  var order = (props_().getProperty(PK.TTS_MODE) === 'interactions')
    ? ['interactions', 'generateContent'] : ['generateContent', 'interactions'];
  var lastErr = null;
  for (var i = 0; i < order.length; i++) {
    var mo = modes[order[i]];
    if (!mo) continue;
    try {
      TTS_WRAP_LAST_ = null;
      var b64 = extractAudioB64_(geminiFetch_(mo.url, mo.body));
      if (TTS_WRAP_LAST_) { try { ttsWrapNote_(model, TTS_WRAP_LAST_); } catch (eW) {} }
      return { b64: b64, bytes: Utilities.base64Decode(b64) };
    } catch (e) {
      lastErr = e;
      if (e && e.ttsFormat) throw e;
    }
  }
  throw lastErr || new Error('هیچ قالبی برای این مدل ساخته نشد');
}

/**
 * این آزمون با مرجع هم‌خوان است؟ `fit: null` یعنی نمی‌دانیم (بی مرجع یا بی
 * عدد) — و «نمی‌دانیم» ناهم‌خوان نیست.
 */
function ttsFitOf_(a, p) {
  var out = { fit: null, dRate: null, dF0: null, why: '', dist: Infinity };
  if (!a || !p || !(a.rate > 0) || !(p.rate > 0)) { out.why = 'نسنجیده'; return out; }
  var rt = Math.max(0.1, Number(CFG.TTS_FIT_RATE_PCT) || 7);
  var ft = Math.max(0.1, Number(CFG.TTS_FIT_F0_ST) || 1.5);
  out.dRate = Math.round((a.rate - p.rate) / p.rate * 1000) / 10;
  if (a.f0 > 0 && p.f0 > 0) out.dF0 = Math.round(12 * Math.log(a.f0 / p.f0) / Math.LN2 * 10) / 10;
  var why = [];
  if (Math.abs(out.dRate) > rt) {
    why.push(ttsFaNum_(String(Math.abs(out.dRate))) + '٪ ' + (out.dRate > 0 ? 'تندتر' : 'کندتر'));
  }
  if (out.dF0 !== null && Math.abs(out.dF0) > ft) {
    why.push(ttsFaNum_(String(Math.abs(out.dF0))) + ' نیم‌پرده ' + (out.dF0 > 0 ? 'زیرتر' : 'بم‌تر'));
  }
  out.fit = !why.length;
  out.why = why.join(' و ');
  out.dist = Math.abs(out.dRate) / rt + (out.dF0 === null ? 0 : Math.abs(out.dF0) / ft);
  return out;
}

/**
 * ترتیبِ جانشینی: هم‌خوان (نزدیک‌تر جلوتر) ⇐ نسنجیده ⇐ ناهم‌خوان (نزدیک‌تر
 * جلوتر). درونِ هر دسته ترتیبِ امتیازِ فهرست می‌مانَد. بی مرجع `null` — یعنی
 * «ترتیب را عوض نکن».
 */
function ttsFitOrder_(list) {
  var prof = ttsProfileRead_();
  if (!prof || !list || !list.length) return null;
  var au = ttsAuditRead_();
  var fit = [], unk = [], bad = [];
  for (var i = 0; i < list.length; i++) {
    var x = list[i];
    var ft = (x === prof.model) ? { fit: true, dist: 0 } : ttsFitOf_(au[x], prof);
    var row = { m: x, d: ft.dist, i: i };
    if (ft.fit === true) fit.push(row); else if (ft.fit === false) bad.push(row); else unk.push(row);
  }
  var byD = function (a, b) { return (a.d - b.d) || (a.i - b.i); };
  fit.sort(byD); bad.sort(byD);
  var all = fit.concat(unk, bad);
  return {
    list: all.map(function (r) { return r.m; }),
    top: fit.length ? 'هم‌خوان' : (unk.length ? 'نسنجیده' : 'ناهم‌خوان')
  };
}

/** صوتِ آزمونِ هر مدل کنارِ آزمونِ صداها می‌نشیند، تا گوش داوری کند. */
function ttsAuditClipSave_(model, b64, len) {
  var root = outFolder_();
  var name = CFG.VOICE_AUDIT_FOLDER || 'آزمونِ صدای گویندگان';
  var it = root.getFoldersByName(name);
  var folder = it.hasNext() ? it.next() : root.createFolder(name);
  var fname = 'آزمونِ مدلِ صوتی — ' + model + '.wav';
  /* یک فایل برای هر مدل، همیشه تازه‌ترین — نسخهٔ قبلی به سطل می‌رود، نه انباشته */
  var old = folder.getFilesByName(fname);
  while (old.hasNext()) { try { old.next().setTrashed(true); } catch (eT) {} }
  var head = Utilities.base64Encode(wavHeader54_(len));
  var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(head + b64), 'audio/wav', fname));
  return f.getUrl();
}

/**
 * یک دورِ آزمون: اول سنجاق (مرجع، یا وارسیِ دگرگونی)، بعد مدل‌هایی که
 * آزمونشان نیست یا کهنه است. عددِ خام ذخیره می‌شود و **داوری سرِ خواندن**
 * حساب می‌شود، تا گرفتنِ مرجعِ تازه داوری‌های قبلی را کهنه نکند.
 */
function ttsAuditionRun_(opt) {
  opt = opt || {};
  var t0 = new Date().getTime();
  var budget = Number(opt.budgetMs) || 240000;
  var out = { tried: [], failed: [], base: '', drift: '', notes: [], due: 0 };
  var m = null;
  try { m = resolveModels_(false); } catch (eM) {}
  if (!m || !m.ttsAvail) { try { m = resolveModels_(true); } catch (eR) {} }
  var avail = (m && m.ttsAvail) || [];
  var pin = String(CFG.TTS_MODEL_PIN || '').trim();
  var ver = Number(CFG.TTS_PROFILE_VER) || 1;
  var prof = ttsProfileRead_();
  var au = ttsAuditRead_();
  var pinLive = !!pin && avail.indexOf(pin) !== -1;
  var needBase = pinLive && (!prof || prof.model !== pin || Number(prof.ver || 0) !== ver);
  var due = [];
  if (pinLive && (needBase || opt.force ||
      ttsAgeDays_(au[pin] && au[pin].at) >= (Number(CFG.TTS_AUDIT_DAYS) || 6))) due.push(pin);
  var maxAge = Number(CFG.TTS_AUDIT_MAX_AGE_DAYS) || 30;
  for (var i = 0; i < avail.length; i++) {
    var x = avail[i];
    if (x === pin) continue;
    if (opt.force || !au[x] || !(au[x].rate > 0) || ttsAgeDays_(au[x].at) >= maxAge) due.push(x);
  }
  out.due = due.length;
  var cap = Number(opt.max) || Number(CFG.TTS_AUDIT_MAX_RUN) || 4;
  var letters = ttsLetters_(CFG.TTS_AUDITION_TEXT);
  var sr = Number(CFG.SAMPLE_RATE) || 24000;
  for (var j = 0; j < due.length; j++) {
    if (out.tried.length + out.failed.length >= cap) { out.notes.push('سقفِ این اجرا پر شد'); break; }
    if (new Date().getTime() - t0 > budget) { out.notes.push('وقتِ این اجرا تمام شد'); break; }
    var md = due[j];
    try {
      var got = ttsAuditionPcm_(md);
      var pr = ttsPcmProfile_(got.bytes, sr, letters);
      if (!(pr.rate > 0)) throw new Error('صوتِ آزمون گفتاری نداشت (' + got.bytes.length + ' بایت)');
      var rec = { at: nowStr_(), rate: pr.rate, f0: pr.f0, pause: pr.pauseShare, ppm: pr.ppm, secs: pr.secs };
      try { rec.clip = ttsAuditClipSave_(md, got.b64, got.bytes.length); } catch (eC) {}
      if (md === pin && needBase) {
        prof = { model: pin, ver: ver, at: rec.at, rate: rec.rate, f0: rec.f0, pause: rec.pause,
                 ppm: rec.ppm, secs: rec.secs, drift: 0 };
        needBase = false;
        out.base = pin;
      } else if (md === pin && prof) {
        /* دگرگونیِ خودِ سنجاق — زنجیرهٔ پیاپی، چون یک آزمونِ بد می‌تواند
           یک آزمونِ بد بماند (گفتارسازِ گوگل هر بار کمی فرق می‌خوانَد). */
        var ftP = ttsFitOf_(rec, prof);
        prof.drift = (ftP.fit === false) ? (Number(prof.drift) || 0) + 1 : 0;
        prof.driftWhy = ftP.why || '';
        prof.checkedAt = rec.at;
        if (ftP.fit === false) out.drift = ftP.why;
      }
      au[md] = rec;
      out.tried.push(md);
    } catch (e) {
      var prev = au[md] || {};
      prev.errAt = nowStr_();
      prev.err = String((e && e.message) || e).slice(0, 160);
      au[md] = prev;
      out.failed.push(md + ': ' + prev.err);
      /* ══ آزمون خودش رفتنِ سنجاق را می‌فهمد، نه قسمتِ فردا ══
         کشِ مدل‌ها هفت روز عمر دارد و ممکن است هنوز سنجاق را «هست» بداند.
         اگر همین آزمون «مدل نیست» گرفت، جانشین همین حالا انتخاب می‌شود —
         وگرنه نخستین خبرش خطای صداسازیِ قسمتِ فرداست (۸.۳۹). */
      if (md === pin) { try { if (isModelGoneError_(prev.err)) out.pinGone = true; } catch (eG) {} }
    }
  }
  try { if (prof) ttsProfileSave_(prof); } catch (eP) {}
  try { ttsAuditSave_(au); } catch (eS) {}
  /* سنجاق که رفته، داوریِ تازه همین حالا اثر کند، نه هفت روزِ بعد (عمرِ کش) */
  if (pin && (!pinLive || out.pinGone)) { try { resolveModels_(true); } catch (eRr) {} }
  return out;
}

/** امروز آزمونی لازم است؟ فقط Properties — بی هیچ فراخوانِ شبکه (۷٫۶۳). */
function ttsAuditDue_() {
  var c = null;
  try { c = JSON.parse(props_().getProperty(PK.MODELS) || 'null'); } catch (e) {}
  var avail = c && c.ttsAvail;
  if (!avail || !avail.length) return true;           // فهرست را نمی‌شناسیم ⇒ آزمون، که فهرست را هم تازه می‌کند
  var pin = String(CFG.TTS_MODEL_PIN || '').trim();
  var prof = ttsProfileRead_();
  var au = ttsAuditRead_();
  var ver = Number(CFG.TTS_PROFILE_VER) || 1;
  if (pin && avail.indexOf(pin) !== -1) {
    if (!prof || prof.model !== pin || Number(prof.ver || 0) !== ver) return true;
    if (ttsAgeDays_(au[pin] && au[pin].at) >= (Number(CFG.TTS_AUDIT_DAYS) || 6)) return true;
  }
  var maxAge = Number(CFG.TTS_AUDIT_MAX_AGE_DAYS) || 30;
  for (var i = 0; i < avail.length; i++) {
    if (avail[i] === pin) continue;
    var a = au[avail[i]];
    if (!a || !(a.rate > 0) || ttsAgeDays_(a.at) >= maxAge) return true;
  }
  return false;
}

/**
 * آزمون را به یک اجرای یک‌بارهٔ جدا می‌سپارد — همان الگوی `embSelfTestArm_`:
 * چند فراخوانِ گفتارساز روی مسیرِ سلامت یا شبانه، همان هزینه‌ای است که
 * ۷٫۶۳ دربارهٔ تابعی که از هزینه مُرد نوشت. روزی یک بار.
 */
function ttsAuditArm_() {
  var today = String(nowStr_()).slice(0, 10);
  if (String(props_().getProperty(PK.TTS_AUDIT_ARM) || '') === today) return false;
  if (!ttsAuditDue_()) return false;
  clearRetryTriggers_('ttsAuditionLater');
  ScriptApp.newTrigger('ttsAuditionLater').timeBased()
    .after(Math.max(1, Number(CFG.TTS_AUDIT_LATER_MIN) || 5) * 60000).create();
  props_().setProperty(PK.TTS_AUDIT_ARM, today);
  return true;
}

/** اجرای یک‌بارهٔ آزمونِ مدل‌های صوتی — نامِ جدا، تا پاک‌کردنش به تریگرِ دیگری نخورد. */
function ttsAuditionLater() {
  runEnter_('ttsAuditionLater');
  var note = '';
  try {
    try { clearRetryTriggers_('ttsAuditionLater'); } catch (e0) {}
    var r = ttsAuditionRun_({});
    note = 'آزمونِ مدلِ صوتی: ' + (r.tried.length ? r.tried.join('، ') : 'هیچ') +
           (r.base ? ' · مرجع از «' + r.base + '» گرفته شد' : '') +
           (r.drift ? ' · سنجاق دگرگون شده: ' + r.drift : '') +
           (r.failed.length ? ' · ناموفق: ' + r.failed.join(' | ') : '') +
           (r.notes.length ? ' · ' + r.notes.join('، ') : '');
    try { logLine_(note); } catch (eL) {}
  } finally { runExit_('ttsAuditionLater', note); }
  return note;
}

/**
 * وضعیت برای `_STATUS.json` و سطرِ روزانه — فقط Properties، بی شبکه.
 *
 * `ok` فقط دو جا پایین می‌آید، و هر دو جایی است که گوشِ او ضرر می‌کند:
 * سنجاق رفته و جایش مدلی نشسته که هم‌خوان بودنش ثابت نشده؛ یا خودِ سنجاق
 * چند آزمونِ پیاپی از مرجعش دور شده. «جانشینِ هم‌خوان نداریم» وقتی سنجاق
 * زنده است ایراد نیست — خطری است که هر روز **گفته** می‌شود.
 */
function ttsModelStatus_() {
  var out = { ok: true, pin: '', live: '', pinOk: null, pinMissing: false, liveFit: null,
              base: null, auditAt: '', audits: [], fitAlt: [], unfit: [], unknown: [],
              drift: 0, line: '' };
  var pin = String(CFG.TTS_MODEL_PIN || '').trim();
  out.pin = pin;
  var c = null;
  try { c = JSON.parse(props_().getProperty(PK.MODELS) || 'null'); } catch (e) {}
  var avail = (c && c.ttsAvail) || null;
  if (pin) out.pinOk = avail ? avail.indexOf(pin) !== -1 : null;
  out.pinMissing = !!(pin && avail && avail.indexOf(pin) === -1);
  out.live = (pin && out.pinOk !== false) ? pin : String((c && c.tts) || '');
  var prof = ttsProfileRead_();
  var au = ttsAuditRead_();
  if (prof) out.base = { model: prof.model, at: prof.at, rate: prof.rate, f0: prof.f0 };
  /* کدام مدل‌ها صوت را در بستهٔ WAV (و برچسبِ C2PA) داده‌اند (۸.۳۸) — تا ناظر،
     که به Script Properties دسترسی ندارد، همین را از `_STATUS.json` بخوانَد. */
  try {
    var wr = JSON.parse(props_().getProperty(PK.TTS_WRAP) || '{}') || {};
    out.wrapped = Object.keys(wr).map(function (k) {
      return { model: k, day: wr[k].day || '', tags: wr[k].tags || '' };
    });
  } catch (eW) { out.wrapped = []; }
  out.drift = prof ? (Number(prof.drift) || 0) : 0;
  for (var k in au) {
    if (!Object.prototype.hasOwnProperty.call(au, k)) continue;
    var a = au[k] || {};
    if (a.at && (!out.auditAt || String(a.at) > out.auditAt)) out.auditAt = String(a.at);
    var ft = (prof && k === prof.model) ? { fit: true, dRate: 0, dF0: 0, why: '', dist: 0 }
                                         : ttsFitOf_(a, prof);
    out.audits.push({ model: k, at: a.at || '', fit: ft.fit, dRate: ft.dRate, dF0: ft.dF0,
                      why: ft.why, clip: a.clip || '', err: a.err || '' });
    if (k === out.live) out.liveFit = ft.fit;
    if (k === pin) continue;
    if (avail && avail.indexOf(k) === -1) continue;    // رفته‌ها جانشین نیستند
    if (ft.fit === true) out.fitAlt.push({ model: k, d: ft.dist, dRate: ft.dRate });
    else if (ft.fit === false) out.unfit.push({ model: k, why: ft.why });
  }
  out.fitAlt.sort(function (x, y) { return x.d - y.d; });
  if (avail) {
    for (var u = 0; u < avail.length; u++) {
      if (avail[u] !== pin && !au[avail[u]]) out.unknown.push(avail[u]);
    }
  }
  var runs = Math.max(1, Number(CFG.TTS_DRIFT_RUNS) || 2);
  var pct = function (v) {
    return v === null || v === undefined ? '' :
      (v === 0 ? 'هم‌اندازه' : ttsFaNum_(String(Math.abs(v))) + '٪ ' + (v > 0 ? 'تندتر' : 'کندتر'));
  };
  var parts = [];
  if (out.pinMissing) {
    out.ok = (out.liveFit === true);
    var liveA = null;
    for (var la = 0; la < out.audits.length; la++) if (out.audits[la].model === out.live) liveA = out.audits[la];
    parts.push('⚠ مدلِ صوتیِ سنجاق‌شده «' + pin + '» دیگر در حسابِ گوگل نیست؛ جایش «' +
               (out.live || '—') + '» نشست — ' +
               (out.liveFit === true ? 'هم‌خوان با همان که پسندیدید (' + pct(liveA && liveA.dRate) + ')'
                : out.liveFit === false ? '**ناهم‌خوان**: ' + ((liveA && liveA.why) || '')
                : 'هنوز آزموده نشده') +
               ((liveA && liveA.clip) ? '. نمونه: ' + liveA.clip : '') +
               '. اگر خوشتان نیامد بگویید تا سنجاق عوض شود.');
  } else if (pin) {
    parts.push('مدلِ صوتی: سنجاق روی «' + pin + '»، همان که گوشِ شما پسندید');
    if (!prof) parts.push('هنوز آزموده نشده (نخستین آزمون در همین روزها)');
    else {
      parts.push('مرجع: ' + ttsFaNum_(String(prof.rate)) + ' حرف در ثانیه، ' +
                 (prof.f0 ? ttsFaNum_(String(prof.f0)) + ' هرتز' : 'زیروبم نسنجیده') +
                 ' (از ' + String(prof.at).slice(0, 10) + ')');
      if (out.drift >= runs) {
        out.ok = false;
        parts.push('⚠ **خودِ این مدل دگرگون شده**: ' + ttsFaNum_(String(out.drift)) +
                   ' آزمونِ پیاپی دور از مرجع (' + (prof.driftWhy || '') + ')');
      } else if (out.drift > 0) {
        parts.push('آزمونِ آخرش دور از مرجع بود (' + (prof.driftWhy || '') + ')؛ یک بار دیگر سنجیده می‌شود');
      }
    }
  } else {
    parts.push('مدلِ صوتی: بی سنجاق، «' + (out.live || '—') + '»');
  }
  if (!out.pinMissing && prof) {
    if (out.fitAlt.length) {
      parts.push('جانشینِ آماده اگر برود: «' + out.fitAlt[0].model + '» (' + pct(out.fitAlt[0].dRate) + ')');
    } else {
      parts.push('هنوز **هیچ جانشینِ هم‌خوانی** نیست؛ اگر این مدل برود، نزدیک‌ترین جایش می‌نشیند و به شما خبر داده می‌شود');
    }
  }
  if (out.unfit.length) {
    parts.push('ناهم‌خوان: ' + out.unfit.slice(0, 3).map(function (x) {
      return '«' + x.model + '» (' + x.why + ')';
    }).join('، '));
  }
  if (out.unknown.length) parts.push(ttsFaNum_(String(out.unknown.length)) + ' مدل هنوز آزموده نشده');
  out.line = parts.join(' · ') + '.';
  return out;
}

/**
 * یافته‌ها و خبرِ یک‌باره. یافته چون جمله‌ای در ایمیل فردا جایش را به جملهٔ
 * دیگری می‌دهد و یافته نه (۵٫۹۰)؛ تلگرام فقط **یک بار** برای هر جابه‌جایی،
 * چون او تلگرام را می‌خوانَد و ایمیل را شاید نه — ولی هشداری که هر روز
 * تکرار شود خوانده نمی‌شود.
 */
function ttsModelGates_(hub, st) {
  st = st || ttsModelStatus_();
  var runs = Math.max(1, Number(CFG.TTS_DRIFT_RUNS) || 2);
  if (st.pinMissing) {
    try {
      logSelfFinding_(hub, {
        priority: st.liveFit === true ? 'متوسط' : 'جدی', category: 'مدلِ صوتی',
        key: 'tts-pin-missing', title: 'مدلِ صوتیِ سنجاق‌شده در دسترس نیست',
        detail: st.line,
        instruction: 'نمونهٔ آزمونِ مدلِ جانشین را (پیوند در همین سطر) به صاحبِ برنامه برسان و نظرش را ' +
                     'بپرس؛ اگر پسندید، TTS_MODEL_PIN را به همان مدل عوض کن تا مرجع از آن گرفته شود. ' +
                     'اگر نپسندید، از میانِ مدل‌های هم‌خوانِ `ttsModel.fitAlt` دیگری را پیشنهاد کن.',
        owner: 'کد'
      });
    } catch (eF) {}
    var tag = st.pin + '⇒' + st.live;
    try {
      if (String(props_().getProperty(PK.TTS_PIN_TOLD) || '') !== tag) {
        tgSend_('🎙 ' + st.line);
        props_().setProperty(PK.TTS_PIN_TOLD, tag);
      }
    } catch (eT) {}
  }
  if (st.drift >= runs) {
    try {
      logSelfFinding_(hub, {
        priority: 'جدی', category: 'مدلِ صوتی', key: 'tts-pin-drift',
        title: 'مدلِ صوتیِ سنجاق‌شده دیگر مثلِ مرجعش نمی‌خوانَد',
        detail: st.line,
        instruction: 'نمونهٔ آزمونِ تازهٔ همین مدل را (پوشهٔ «' + (CFG.VOICE_AUDIT_FOLDER || '') +
                     '») به صاحبِ برنامه برسان. اگر هنوز می‌پسندد، TTS_PROFILE_VER را یکی بالا ببر تا ' +
                     'مرجع از نو گرفته شود؛ اگر نه، جانشینِ هم‌خوان را پیشنهاد کن. خودکار عوض نکن.',
        owner: 'کد'
      });
    } catch (eD) {}
  }
  return st;
}

/** در صورت برخورد با سقف سهمیه، موقتاً یک رده پایین‌تر می‌رویم تا کار متوقف نشود. */
function pickLowerTier_(all, current) {
  if (!all || !all.length) return '';
  var curTier = modelMeta_(current).tier;
  for (var i = 0; i < all.length; i++) {
    if (modelMeta_(all[i]).tier < curTier) return all[i];
  }
  return '';
}

function demoteFor24h_() {
  props_().setProperty(PK.DEMOTED_UNTIL, String(new Date().getTime() + 24 * 3600 * 1000));
  logLine_('سقف سهمیهٔ مدل بالا خورد؛ ۲۴ ساعت از ردهٔ پایین‌تر استفاده می‌شود.');
}

/** آیا این خطا یعنی «مدل دیگر وجود ندارد»؟ */
function isModelGoneError_(msg) {
  var s = String(msg || '').toLowerCase();
  return s.indexOf('not_found') !== -1 || s.indexOf('is not found') !== -1 ||
         s.indexOf('not found') !== -1 || s.indexOf('http 404') !== -1 ||
         s.indexOf('is not supported') !== -1 || s.indexOf('deprecated') !== -1 ||
         s.indexOf('has been discontinued') !== -1 || s.indexOf('retired') !== -1;
}

function isQuotaError_(msg) {
  var s = String(msg || '').toLowerCase();
  return s.indexOf('429') !== -1 || s.indexOf('resource_exhausted') !== -1 ||
         s.indexOf('quota') !== -1 || s.indexOf('rate limit') !== -1;
}

/* ══════════ داوریِ تعویضِ مدل — «نکند بدترش کرده باشیم؟» (۶٫۱۶) ══════════
 *
 * ══ آنچه از پیش بود و آنچه نبود ══
 * موتور هر `MODEL_REFRESH_DAYS` روز فهرستِ مدل‌ها را دوباره می‌گیرد و
 * بالاترین را برمی‌دارد؛ «مدل حذف شده» را هم از متنِ خطا می‌شناسد
 * (`isModelGoneError_`) و همان‌جا فهرست را تازه می‌کند. پس **پیداکردنِ مدلِ
 * بهتر و کنارگذاشتنِ مدلِ مرده از قبل کار می‌کرد.**
 *
 * آنچه نبود، چیزی است که بخشِ ۲۲ سال‌هاست برای *کدِ تحلیلگرها* دارد و برای
 * *مدل* نداشت: **داوریِ بعد از تغییر.** مدل عوض می‌شد، یک خط در سیاههٔ
 * داخلی می‌نشست، و هیچ‌کس نمی‌پرسید بهتر شد یا بدتر. در حالی که مدلِ متنی
 * روی **هر جملهٔ هر قسمت** اثر می‌گذارد — پرخطرترین تغییرِ ممکن در این موتور،
 * و تنها تغییری که هیچ داوری‌ای نداشت.
 *
 * ══ سه قاعده که از `srcVerdict_` وام گرفته شده‌اند ══
 * ۱) **پایه پیش از تغییر گرفته می‌شود، نه بعدش.** بی پایه، «بد است» یعنی
 *    هیچ؛ همان اشتباهی که ۵٫۲x در تحلیلگرها کرد.
 * ۲) **دو پرسشِ جدا:** «بهتر شد؟» و «بدتر شد؟» — و فقط دومی برگشت می‌دهد.
 *    مدلی که خیلی بهتر نشده، دلیلِ برگشت نیست.
 * ۳) **نمونهٔ کم یعنی سکوت، نه رأی.** داوری روی دو قسمت، تصادف است. اگر
 *    شواهد کم باشد صریح گفته می‌شود «برای داوری کافی نبود» و پنجره تمدید
 *    می‌شود — نه اینکه یک عددِ بی‌پشتوانه به اسمِ حکم بیرون بیاید.
 */

/** پروندهٔ آخرین تعویضِ مدل. */
function modelSwapRead_() {
  try {
    var j = JSON.parse(props_().getProperty(PK.MODEL_SWAP) || 'null');
    return (j && j.to) ? j : null;
  } catch (e) { return null; }
}
function modelSwapSave_(s) {
  try { props_().setProperty(PK.MODEL_SWAP, JSON.stringify(s)); } catch (e) {}
}

/** مدل‌هایی که داوری ردشان کرده — تا فهرست دوباره همان را انتخاب نکند. */
function modelBadList_() {
  try {
    var a = JSON.parse(props_().getProperty(PK.MODEL_BAD) || '[]');
    return Object.prototype.toString.call(a) === '[object Array]' ? a : [];
  } catch (e) { return []; }
}
function modelBadAdd_(id) {
  var l = modelBadList_();
  if (l.indexOf(String(id)) === -1) l.push(String(id));
  try { props_().setProperty(PK.MODEL_BAD, JSON.stringify(l.slice(-8))); } catch (e) {}
}

/**
 * سنجهٔ کیفیت در همین لحظه — همان دو عددی که موتور از پیش دارد.
 *
 * عمداً چیز تازه‌ای اندازه نمی‌گیرد: سنجه‌ای که فقط برای داوری ساخته شود،
 * خودش یک متغیرِ تازه است و آن‌وقت معلوم نیست تغییرِ عدد از مدل است یا از
 * سنجه. `badNights` از سنجهٔ محتوا می‌آید و `errors` از خطاهای منبع.
 */
function modelQuality_() {
  var out = { badNights: 0, errors24h: 0, ok: false };
  try {
    var a = auditStatus_();
    /* ══ داوری با ورودیِ خالی، رأی می‌دهد نه شهادت ══
     * `badNights` وقتی خوانده نشود `undefined` است و `Number(undefined)||0`
     * می‌شود صفر — یعنی «هیچ شبِ بدی نبود»، که با «نتوانستیم بشماریم» زمین
     * تا آسمان فرق دارد. اگر عدد واقعاً عدد نبود، سنجه **معتبر نیست** و
     * داوری باید سکوت کند. همان درسی که ۵٫۹۶ دربارهٔ داورِ محتوا داد. */
    if (typeof a.badNights === 'number' && isFinite(a.badNights)) {
      out.badNights = a.badNights;
      out.ok = true;
    }
  } catch (e) {}
  try {
    var st = srcErrorSummary_(getHub_(), 5);
    out.errors24h = Number(st.last24h) || 0;
  } catch (e2) {}
  return out;
}

/** مدل عوض شد: خبرش برود و پایه‌اش ثبت شود. */
function modelSwapNote_(from, to) {
  if (!to || String(from) === String(to)) return false;
  var rec = { from: String(from || '—'), to: String(to), at: nowStr_(),
              base: modelQuality_(), judged: false };
  modelSwapSave_(rec);
  /* یک خط در سیاههٔ داخلی کافی نیست: مدلِ متنی روی هر جملهٔ هر قسمت اثر
     می‌گذارد و صاحبِ برنامه حق دارد بداند موتورش مغزش عوض شده. */
  try {
    mailQueue_('model', 'مدلِ متنی عوض شد — ' + rec.to,
      'از «' + rec.from + '» به «' + rec.to + '». این پرخطرترین تغییرِ ممکن در ' +
      'موتور است، چون روی هر جملهٔ هر قسمت اثر می‌گذارد. پایهٔ کیفیت پیش از ' +
      'تعویض ثبت شد و ' + ttsFaNum_(String(Math.max(6, Number(CFG.MODEL_VERDICT_HOURS) || 48))) +
      ' ساعت دیگر داوری می‌شود؛ اگر بدتر شده باشد، خودکار برمی‌گردد.');
  } catch (e) {}
  return true;
}

/**
 * داوری: بهتر شد، بدتر شد، یا هنوز معلوم نیست.
 *
 * برگشت فقط برای «بدتر». مدلی که تفاوتی نداشته، دلیلِ برگشت نیست —
 * برگرداندنش یعنی نوسانِ بی‌پایان میانِ دو مدل.
 */
function modelVerdict_() {
  var out = { ran: false, verdict: '', why: '' };
  var rec = modelSwapRead_();
  if (!rec || rec.judged) return out;
  var hrs = Math.max(6, Number(CFG.MODEL_VERDICT_HOURS) || 48);
  var t = parseWhen_(String(rec.at || ''));
  if (isNaN(t) || (new Date().getTime() - t) / 3600000 < hrs) return out;

  out.ran = true;
  var now = modelQuality_(), base = rec.base || {};
  if (!now.ok || !base.ok) {
    out.verdict = 'نامعلوم';
    out.why = 'سنجهٔ کیفیت در دسترس نبود';
    rec.judged = true; modelSwapSave_(rec);
    return out;
  }

  var worseAudit = (now.badNights - (Number(base.badNights) || 0)) >= 2;
  var worseErr = (Number(base.errors24h) || 0) > 0 &&
                 now.errors24h >= (Number(base.errors24h) || 0) * 2 + 3;
  rec.judged = true; rec.at2 = nowStr_(); rec.after = now;

  if (worseAudit || worseErr) {
    out.verdict = 'بدتر';
    out.why = (worseAudit ? 'شب‌های بدِ سنجهٔ محتوا از ' + base.badNights + ' به ' +
                            now.badNights + ' رسید' : '') +
              (worseAudit && worseErr ? ' و ' : '') +
              (worseErr ? 'خطاهای ۲۴ ساعت از ' + base.errors24h + ' به ' +
                          now.errors24h + ' رسید' : '');
    modelBadAdd_(rec.to);
    try { resolveModels_(true); } catch (eR) {}
    modelSwapSave_(rec);
    return out;
  }
  out.verdict = (now.badNights < (Number(base.badNights) || 0)) ? 'بهتر' : 'بی‌تفاوت';
  out.why = 'شب‌های بد: ' + base.badNights + ' → ' + now.badNights +
            ' · خطاهای ۲۴ ساعت: ' + base.errors24h + ' → ' + now.errors24h;
  modelSwapSave_(rec);
  return out;
}

/** گزارش خوانا از وضعیت مدل‌ها برای منوی «نمایش وضعیت» */
function modelsReport_() {
  var m = resolveModels_(false);
  var age = Math.round((new Date().getTime() - (m.at || 0)) / 3600000);
  return 'مدل متنی: ' + m.text + '\nمدل صوتی: ' + m.tts +
         '\n(فهرست ' + age + ' ساعت پیش به‌روز شده؛ هر ' + CFG.MODEL_REFRESH_DAYS + ' روز خودکار تازه می‌شود)';
}

/** اجرای دستی از منو */
function refreshModels() {
  var m = resolveModels_(true);
  var msg = 'بالاترین مدل‌های موجود روی حساب شما:\n\n' +
            'متن: ' + m.text + '\nصوت: ' + m.tts + '\n\n' +
            'نامزدهای بعدی (متن):\n  ' + (m.textAll || []).join('\n  ') +
            '\n\nنامزدهای بعدی (صوت):\n  ' + (m.ttsAll || []).join('\n  ');
  var ui = ui_(); if (ui) ui.alert('مدل‌ها', msg, ui.ButtonSet.OK); else console.log(msg);
  return m;
}

/**
 * یک سطرِ فارسیِ آماده دربارهٔ مدل — هر روز، حتی وقتی هیچ خبری نیست.
 *
 * ══ چرا لازم شد ══
 * سازوکارِ تعویض و داوریِ مدل از ۶٫۱۷ کار می‌کند، ولی **تنها وقتی حرف
 * می‌زد که خبرِ بدی بود**: تعویض یک یادداشت صف می‌کرد و داوریِ «بدتر» یک
 * ایمیل. یعنی هر روزِ سالم، سکوتِ کامل — و صاحبِ برنامه صریح گفته
 * «وقتِ دیدن ندارم؛ می‌خوام خیالم راحت باشه». در این ریپو سکوت را
 * نمی‌شود از مرگ تشخیص داد، و هر زیرسامانهٔ دیگری سطرِ روزانه‌اش را دارد؛
 * مدل تنها یکی بود که نداشت.
 *
 * سه چیز را می‌گوید، چون هر سه پرسشِ واقعیِ کاربر بودند: الان روی چه
 * مدلی می‌رود، تعویضِ اخیر چه شد، و آیا مدلی به فهرستِ ردشده‌ها رفته.
 */
function modelStatus_() {
  var out = { line: '', ok: true, text: '', tts: '' };
  try {
    var fa = function (n) { try { return ttsFaNum_(String(n)); } catch (x) { return String(n); } };
    /* مدل‌های انتخاب‌شده زیرِ یک کلید و به‌صورت JSON می‌نشینند (PK.MODELS)،
       نه دو کلیدِ جدا. خواندنِ کلیدی که وجود ندارد، دقیقاً همان اشتباهی
       است که `recapCast_` در ۶٫۲۲ کرد: بی‌صدا خالی برمی‌گردد. */
    var cur = null;
    try { cur = JSON.parse(props_().getProperty(PK.MODELS) || 'null'); } catch (e0) { cur = null; }
    out.text = String((cur && cur.text) || '') || 'انتخاب‌نشده';
    out.tts = String((cur && cur.tts) || '') || 'انتخاب‌نشده';
    var L = ['مدل‌ها: متن ' + out.text + ' · صوت ' + out.tts +
             (cur && cur.fallback ? ' (از فهرستِ پیش‌فرض — فهرستِ زندهٔ گوگل خوانده نشد)' : '')];
    var rec = modelSwapRead_();
    if (rec && rec.to) {
      if (rec.judged) {
        L.push('آخرین تعویض (' + String(rec.from || '—') + ' ← ' + String(rec.to) +
               ') داوری شد: ' + String(rec.verdict || '—') + '.');
      } else {
        L.push('تعویضِ ' + String(rec.to) + ' هنوز داوری نشده — داوری ' +
               fa(Math.max(6, Number(CFG.MODEL_VERDICT_HOURS) || 48)) + ' ساعت پس از تعویض.');
      }
    }
    var bad = modelBadList_();
    if (bad.length) L.push(fa(bad.length) + ' مدل به فهرستِ ردشده‌ها رفته: ' + bad.join('، ') + '.');
    /* «انتخاب‌نشده» یعنی resolveModels_ هرگز موفق نشده و موتور روی
       پیش‌فرضِ کور می‌رود — این خبر است، نه یادداشت. */
    if (!cur || !cur.text) {
      out.ok = false;
      L.push('مدلِ متن هرگز انتخاب نشده؛ موتور روی پیش‌فرضِ کور می‌رود.');
    }
    out.line = L.join(' ');
  } catch (e) {}
  return out;
}
