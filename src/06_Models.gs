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
