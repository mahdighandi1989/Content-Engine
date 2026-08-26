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

    // سیاست «stable»: پیش‌نمایش‌ها کنار گذاشته می‌شوند — مگر آنکه چیزی باقی نماند
    // (مدل‌های صوتی فعلاً همگی پیش‌نمایش‌اند، پس آنجا خودکار نادیده گرفته می‌شود).
    if (CFG.MODEL_POLICY === 'stable') {
      var st = texts.filter(function (x) { return !modelMeta_(x).preview; });
      if (st.length) texts = st;
      var sa = ttss.filter(function (x) { return !modelMeta_(x).preview; });
      if (sa.length) ttss = sa;
    }

    chosen.textAll = texts.slice(0, 6);
    chosen.ttsAll = ttss.slice(0, 6);
    chosen.text = texts[0] || CFG.FALLBACK_TEXT_MODEL;
    chosen.tts = ttss[0] || CFG.FALLBACK_TTS_MODEL;
    chosen.policy = CFG.MODEL_POLICY;
  } catch (e) {
    logLine_('انتخاب خودکار مدل ناموفق بود، از پیش‌فرض استفاده می‌شود: ' + e.message);
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
  return m.tts || CFG.FALLBACK_TTS_MODEL;
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
      'تعویض ثبت شد و ' + faDigitsOut_(String(Math.max(6, Number(CFG.MODEL_VERDICT_HOURS) || 48))) +
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
