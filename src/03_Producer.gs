/**
 * 03_Producer.gs — تولید قسمت پادکست
 *
 * انتخاب آیتم‌ها از CONTENT-HUB (تلفیق ویدیو + عکس) → نگارش متن با Gemini →
 * تبدیل به گفتار فارسی → ذخیره در OUTPUT → ثبت در تب «پادکست‌ها» → ایمیل.
 */

// ------------------------------------------------------------ تماس با Gemini

function geminiFetch_(url, payload) {
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var txt = res.getContentText();
  if (code !== 200) throw new Error('Gemini HTTP ' + code + ': ' + txt.slice(0, 500));
  // پوستهٔ پاسخ هم گاهی ناقص می‌رسد (اتصال وسط کار بریده می‌شود). بدون این
  // محافظ، خطای خامِ JSON.parse تا بالا می‌رفت و کلِ مرحله دور ریخته می‌شد —
  // همان چیزی که در قسمت اول، گزینش تحریریه‌ای را انداخت.
  try { return JSON.parse(txt); } catch (e) {
    var salvaged = repairJson_(txt, e.message);
    if (salvaged) {
      logLine_('پاسخ ناقصِ API ترمیم شد (' + String(e.message).slice(0, 80) + ').');
      return salvaged;
    }
    throw new Error('پاسخ API ناقص برگشت: ' + e.message);
  }
}

/**
 * چه چیزهایی را این مدل قبلاً نپذیرفته است.
 * در ویژگی‌های اسکریپت می‌ماند تا هر فراخوانِ بعدی از همان‌جا شروع کند و
 * درخواست‌های ۴۰۰ تکرار نشوند. با عوض‌شدنِ مدل، حافظه‌اش هم عوض می‌شود.
 */
function modelDrops_(model) {
  var out = { thinking: false, schema: false, mime: false };
  try {
    var raw = props_().getProperty('MODEL_DROPS_' + String(model).replace(/[^A-Za-z0-9.-]/g, '_'));
    if (!raw) return out;
    var parts = String(raw).split(',');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === 'thinking') out.thinking = true;
      if (parts[i] === 'schema') out.schema = true;
      if (parts[i] === 'mime') out.mime = true;
    }
  } catch (e) {}
  return out;
}

/**
 * کفِ سقفِ توکنِ خروجی که این مدل عملاً لازم دارد.
 * وقتی یک بار فهمیدیم که مدل با سقفِ کوچک هیچ متنی برنمی‌گرداند (چون بودجه را
 * «فکر»ش می‌خورد)، دیگر لازم نیست هر فراخوان یک درخواستِ بی‌فایده خرج کند تا
 * دوباره همان را بفهمد. بالا بردنِ این سقف هزینه‌ای ندارد: بابتِ توکنی که
 * تولید نشود چیزی حساب نمی‌شود.
 */
function modelTokFloor_(model) {
  try {
    var v = props_().getProperty('MODEL_MINTOK_' + String(model).replace(/[^A-Za-z0-9.-]/g, '_'));
    var n = Number(v);
    // سقف‌گذاری لازم است: یک مقدارِ خراب («1e99») بی این خط، هر فراخوانِ بعدی
    // را با عددی می‌فرستاد که API ردش می‌کند — و آن ردِ ۴۰۰ به گردنِ قالبِ
    // خروجی نوشته می‌شد و موتور برای همیشه بی‌قالب می‌ماند.
    return isFinite(n) && n > 0 ? Math.min(65536, Math.floor(n)) : 0;
  } catch (e) { return 0; }
}

function rememberTokFloor_(model, tokens) {
  try {
    var k = 'MODEL_MINTOK_' + String(model).replace(/[^A-Za-z0-9.-]/g, '_');
    if (modelTokFloor_(model) >= tokens) return;
    props_().setProperty(k, String(tokens));
  } catch (e) {}
}

function forgetTokFloor_(model) {
  try {
    props_().deleteProperty('MODEL_MINTOK_' + String(model).replace(/[^A-Za-z0-9.-]/g, '_'));
  } catch (e) {}
}

function rememberDrop_(model, what) {
  try {
    var k = 'MODEL_DROPS_' + String(model).replace(/[^A-Za-z0-9.-]/g, '_');
    var cur = String(props_().getProperty(k) || '');
    if (cur.split(',').indexOf(what) !== -1) return;
    props_().setProperty(k, cur ? cur + ',' + what : what);
  } catch (e) {}
}

/**
 * چرا پاسخ هیچ متنی نداشت.
 *
 * درسِ گران: پاسخِ «۲۰۰ ولی بی‌متن» تا امروز فقط یک پیامِ کلی می‌داد — «Gemini
 * پاسخ متنی برنگرداند» — و چهار تلاشِ بعدی هم با همان پیکربندی همان نتیجه را
 * می‌گرفتند. یعنی داوریِ محتوایی سه بار پشت سر هم شکست خورد و هیچ‌کس نفهمید
 * چرا. دلیل درست‌ همیشه در خودِ پاسخ هست: یا سقفِ توکنِ خروجی را «فکرکردنِ»
 * مدل خورده، یا محتوا از صافیِ ایمنی رد نشده. این تابع همان را بیرون می‌کشد
 * تا هم در سیاهه بیاید و هم بشود واکنشِ درست را انتخاب کرد.
 */
function emptyWhy_(j) {
  var w = { reason: '', blocked: false, truncated: false, detail: '' };
  try {
    var pf = j && (j.promptFeedback || j.prompt_feedback);
    if (pf && (pf.blockReason || pf.block_reason)) {
      w.reason = String(pf.blockReason || pf.block_reason);
      w.blocked = true;
    }
    var c = j && j.candidates && j.candidates[0];
    var fr = c ? String(c.finishReason || c.finish_reason || '') : '';
    if (!w.reason && fr) w.reason = fr;
    if (/MAX_TOKENS/i.test(fr)) w.truncated = true;
    if (/SAFETY|RECITATION|PROHIBITED|BLOCK|SPII|IMAGE_SAFETY/i.test(fr)) w.blocked = true;
    var um = j && (j.usageMetadata || j.usage_metadata);
    if (um) {
      var th = Number(um.thoughtsTokenCount || um.thoughts_token_count || 0) || 0;
      var ca = Number(um.candidatesTokenCount || um.candidates_token_count || 0) || 0;
      w.detail = 'فکر=' + th + ' توکن · متن=' + ca + ' توکن';
      // بودجهٔ خروجی را «فکر» خورده و برای متن چیزی نمانده — همان حالتی که
      // با یک سقفِ کوچک (۸۱۹۲) و پرامپتِ بزرگ هر بار تکرار می‌شود.
      if (th > 0 && ca === 0) w.truncated = true;
    }
    if (!c && !w.reason) w.reason = 'بی‌کاندیدا';
  } catch (e) {}
  if (!w.reason) w.reason = 'نامعلوم';
  return w;
}

function geminiText_(prompt, schema, maxTokens) {
  var model = textModel_();
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
            model + ':generateContent?key=' + encodeURIComponent(apiKey_());
  var gen = {
    temperature: 0.85,
    maxOutputTokens: maxTokens || 32768,
    responseMimeType: 'application/json',
    // مدل‌های ۲٫۵ به‌طور پیش‌فرض «فکر» می‌کنند و توکن خروجی را مصرف می‌کنند؛
    // بودجه را محدود می‌کنیم تا سهم متن قسمت باقی بماند.
    thinkingConfig: { thinkingBudget: 2048 }
  };
  if (schema) gen.responseSchema = schema;
  // آنچه این مدل قبلاً نپذیرفته را همان اول کنار می‌گذاریم. بی این حافظه، هر
  // فراخوان دو درخواستِ ۴۰۰ خرج می‌کرد و همان پرامپتِ بزرگ را دوباره می‌فرستاد.
  var dropped = modelDrops_(model);
  if (dropped.thinking) delete gen.thinkingConfig;
  if (dropped.schema) delete gen.responseSchema;
  if (dropped.mime) delete gen.responseMimeType;
  // و اگر قبلاً فهمیده‌ایم این مدل سقفِ بالاتری لازم دارد، از همان اول بالا برو.
  // ولی نه روی فراخوان‌های عمداً کوچک: آن‌ها متنِ کوتاه می‌خواهند و بالا بردنِ
  // سقفشان فقط ریسکِ ردِ ۴۰۰ را می‌آورد.
  var floor = modelTokFloor_(model);
  if (floor > (Number(gen.maxOutputTokens) || 0) && (Number(gen.maxOutputTokens) || 0) >= 4096) {
    gen.maxOutputTokens = floor;
  }

  var payload = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: gen };

  var out = '';
  var lastEmpty = null, blockedReason = '', emptyPlain = 0, hardTries = 0;
  // سقفی که خودِ مدل اعلام کرده. بی این، دو پلهٔ نردبان با هم می‌جنگیدند:
  // «پاسخ بی‌متن است، سقف را بالا ببر» و «۴۰۰: سقف بیش از حد است، پایین بیاور»
  // — و فراخوان بین ۸۱۹۲ و ۳۲۷۶۸ نوسان می‌کرد تا مهلت تمام شود، بی آنکه هرگز
  // به پلهٔ «فکرکردن را خاموش کن» برسد. یعنی برای حساب‌هایی که سقفِ مدلشان
  // ۸۱۹۲ است، ساختِ قسمت هم می‌مرد.
  var hardCap = 65536;
  for (var attempt = 0; attempt < 6; attempt++) {
    try {
      var j = geminiFetch_(url, payload);
      out = extractText_(j);
      if (out && out.trim()) break;
      // ───────── پاسخ آمد (۲۰۰) ولی متنی در آن نبود ─────────
      // این‌جا هیچ استثنایی پرتاب نشده، پس شاخهٔ catch اجرا نمی‌شود و تا امروز
      // همان درخواستِ بی‌فایده سه بار دیگر تکرار می‌شد. حالا از دلیلِ واقعی
      // پیکربندی را عوض می‌کنیم.
      var w = emptyWhy_(j);
      lastEmpty = w;
      if (w.blocked) {
        // صافیِ محتوا. تکرارِ همان درخواست بی‌فایده است؛ بیرون می‌رویم تا
        // فراخوانَنده بتواند دسته را کوچک کند یا راهِ بی‌مدل را برود.
        // این آزمون باید پیش از آزمونِ «سقفِ توکن» باشد: پاسخِ مسدود هم
        // usageMetadata دارد و اگر اول سقف را بالا ببریم، دو فراخوانِ بی‌فایده
        // خرج شده و یک سقفِ بزرگِ بی‌دلیل هم برای همیشه به‌خاطر می‌ماند.
        blockedReason = w.reason + (w.detail ? ' · ' + w.detail : '');
        break;
      }
      if (w.truncated) {
        // اولْ سقفِ توکن؛ چون «فکرکردن» کیفیت را بالا می‌برد و خاموش‌کردنش
        // آخرین چاره است، نه اولین.
        var cur = Number(payload.generationConfig.maxOutputTokens) || 8192;
        if (cur < hardCap) {
          payload.generationConfig.maxOutputTokens = Math.min(hardCap, cur * 4);
          rememberTokFloor_(model, payload.generationConfig.maxOutputTokens);
          logLine_('پاسخِ مدل بی‌متن بود (' + w.reason +
                   (w.detail ? ' · ' + w.detail : '') + ')؛ سقفِ توکنِ خروجی به ' +
                   payload.generationConfig.maxOutputTokens + ' رسید و دوباره تلاش شد.');
          continue;
        }
        if (payload.generationConfig.thinkingConfig) {
          delete payload.generationConfig.thinkingConfig;
          logLine_('پاسخِ مدل بی‌متن بود (سقفِ توکن)؛ «فکرکردن» خاموش شد و دوباره تلاش شد.');
          continue;
        }
      }
      // دلیلِ نامعلوم: پیکربندی را ساده‌تر کن — ولی فقط برای همین فراخوان.
      // «به‌خاطر سپردن» را این‌جا عمداً انجام نمی‌دهیم: پاسخِ بی‌متن هزار دلیل
      // دارد و اگر یک‌بارش را به حسابِ «این مدل قالبِ خروجی را نمی‌پذیرد»
      // بگذاریم، از آن پس همهٔ فراخوان‌ها — از جمله ساختِ خودِ قسمت‌ها — بی‌قالب
      // و بی‌فکر اجرا می‌شوند و کیفیت بی‌صدا پایین می‌آید. فقط ردِ صریحِ ۴۰۰ در
      // شاخهٔ catch به حافظه می‌رود.
      if (payload.generationConfig.responseSchema) {
        delete payload.generationConfig.responseSchema;
        logLine_('پاسخِ مدل بی‌متن بود (' + w.reason + ')؛ همین یک بار بی‌قالبِ خروجی تلاش شد.');
        continue;
      }
      if (payload.generationConfig.thinkingConfig) {
        delete payload.generationConfig.thinkingConfig;
        continue;
      }
      // هیچ اهرمی برای ساده‌کردن نماند. یک تلاشِ دیگر برای پاسخِ خالیِ گذرا
      // بس است؛ تکرارِ بیشتر فقط چند ثانیه خواب و چند فراخوانِ بی‌فایده است و
      // مهلتِ اجرا را می‌خورد — همان چیزی که یک قابلیت را «کُند» می‌کند حتی
      // وقتی درست کار می‌کند.
      if (emptyPlain++ >= 1) break;
      Utilities.sleep(1500);
    } catch (e) {
      var msg = String(e.message || '');
      // ── مدل چیزی را در «پیکربندیِ خروجی» نپذیرفت ──
      // مدل‌ها سلیقه‌ای‌اند: یکی thinkingConfig را نمی‌شناسد، دیگری قالبِ
      // خروجی (responseSchema) را رد می‌کند. تا امروز چنین ردی یعنی مرگِ
      // خاموشِ کلِ آن قابلیت — چون هر چهار تلاش با همان پیکربندی تکرار می‌شد.
      // حالا پله‌پله ساده‌تر می‌کنیم: اول thinkingConfig، بعد قالبِ خروجی.
      // پرامپت خودش شکلِ دقیقِ JSON را گفته است، پس بی‌قالب هم جواب می‌گیریم.
      // ── ردِ ۴۰۰ که دربارهٔ «سقفِ توکنِ خروجی» است ──
      // این را باید پیش از هر چیز جدا کرد. حسابی که بهترین مدلش سقفِ ۸۱۹۲ دارد،
      // با بالا بردنِ سقف یک ۴۰۰ می‌گیرد؛ و اگر آن ۴۰۰ را به حسابِ «مدل قالبِ
      // خروجی را نمی‌پذیرد» بگذاریم، آن حکم برای همیشه در ویژگی‌ها می‌نشیند و
      // از آن پس همهٔ فراخوان‌ها — از جمله نوشتنِ خودِ قسمت‌ها — با سقفِ غلط و
      // بی‌قالب اجرا می‌شوند. یعنی موتور خودش را برای همیشه خراب می‌کند.
      if (/max_?output_?tokens/i.test(msg)) {
        var capM = msg.match(/(?:<=|less than or equal to|at most)\s*([0-9]+)/i);
        var curT = Number(payload.generationConfig.maxOutputTokens) || 8192;
        var newT = capM ? Math.max(256, parseInt(capM[1], 10)) : Math.max(256, Math.floor(curT / 2));
        hardCap = Math.min(hardCap, newT);
        forgetTokFloor_(model);
        if (newT < curT) {
          payload.generationConfig.maxOutputTokens = newT;
          logLine_('سقفِ توکنِ خروجی را مدل «' + model + '» نپذیرفت؛ به ' + newT + ' کم شد.');
          continue;
        }
      }
      var argErr = msg.indexOf('Unknown name') !== -1 || msg.indexOf('thinking') !== -1 ||
                   msg.indexOf('invalid argument') !== -1 ||
                   msg.indexOf('INVALID_ARGUMENT') !== -1 ||
                   msg.indexOf('response_schema') !== -1 ||
                   msg.indexOf('responseSchema') !== -1 || msg.indexOf('HTTP 400') !== -1;
      if (argErr && payload.generationConfig.thinkingConfig) {
        delete payload.generationConfig.thinkingConfig;
        continue;
      }
      if (argErr && payload.generationConfig.thinkingConfig === undefined &&
          !dropped.thinking) { rememberDrop_(model, 'thinking'); }
      if (argErr && payload.generationConfig.responseSchema) {
        delete payload.generationConfig.responseSchema;
        rememberDrop_(model, 'schema');
        logLine_('قالبِ خروجی (responseSchema) را مدل «' + model + '» نپذیرفت؛ ' +
                 'بی‌قالب دوباره تلاش شد. پیام: ' + msg.slice(0, 160));
        continue;
      }
      // آخرین پله: حتی «نوعِ خروجیِ JSON» را هم بعضی مدل‌ها رد می‌کنند.
      if (argErr && payload.generationConfig.responseMimeType) {
        delete payload.generationConfig.responseMimeType;
        rememberDrop_(model, 'mime');
        logLine_('نوعِ خروجیِ JSON را مدل «' + model + '» نپذیرفت؛ بی آن تلاش شد.');
        continue;
      }
      // مدل بازنشسته شده؟ فهرست را تازه کن و با جانشینش ادامه بده
      if (isModelGoneError_(msg)) {
        var fresh = resolveModels_(true).text;
        logLine_('مدل «' + model + '» دیگر در دسترس نیست؛ جانشین: ' + fresh);
        model = fresh;
        url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              model + ':generateContent?key=' + encodeURIComponent(apiKey_());
        continue;
      }
      // سقف سهمیه؟ یک رده پایین‌تر برو
      if (isQuotaError_(msg) && attempt < 2) {
        demoteFor24h_();
        var lower = textModel_();
        if (lower && lower !== model) {
          model = lower;
          url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                model + ':generateContent?key=' + encodeURIComponent(apiKey_());
        }
        Utilities.sleep(5000);
        continue;
      }
      // خطاهای واقعی (۵۰۰، ۵۰۳، شبکه) با شش تلاش فقط وقت می‌سوزانند؛ سه تلاش
      // بس است. پله‌های «ساده‌کردنِ پیکربندی» در این شمارش نمی‌آیند، چون آن‌ها
      // درخواستِ متفاوتی می‌فرستند و ارزشِ امتحان دارند.
      hardTries++;
      if (hardTries >= 3 || attempt >= 5) throw e;
      // نردبانِ ۲+۴+۶+۸+۱۰ ثانیه سی ثانیه خواب بود. با یک مدلِ «۵۰۳ شلوغ»،
      // سه فراخوانِ ناموفقِ داوری نود ثانیه از مهلتِ هفتادثانیه‌ایِ تولید
      // می‌خورد و مرحلهٔ پشتیبانِ بی‌مدل — که کلِ فایدهٔ این نسخه است — هرگز
      // نوبت نمی‌گرفت. سقفِ چهار ثانیه برای هر خواب کافی است.
      Utilities.sleep(Math.min(4000, 1500 * (attempt + 1)));
    }
  }
  if (!out) {
    // پیام باید دلیل را بگوید. «پاسخ متنی برنگرداند»ِ خالی، سه بار پشت سر هم
    // در سیاهه نشست و هیچ سرنخی نداد.
    var why = blockedReason ? 'محتوا پذیرفته نشد (' + blockedReason + ')'
                : (lastEmpty ? lastEmpty.reason + (lastEmpty.detail ? ' · ' + lastEmpty.detail : '')
                             : 'نامعلوم');
    var eE = new Error('Gemini پاسخ متنی برنگرداند — دلیل: ' + why + '.');
    eE.geminiEmpty = true;
    if (blockedReason) eE.geminiBlocked = true;
    throw eE;
  }
  var firstErr = '';
  try { return JSON.parse(out); } catch (e) { firstErr = e.message; }
  // بی‌قالب، مدل ممکن است جواب را داخل ```json بگذارد یا جلوش توضیح بنویسد.
  // الگوی حریصانهٔ قبلی از اولین «{» تا آخرین «}» می‌گرفت و با یک آکولادِ
  // پرت در متن، کلِ پاسخ دور می‌رفت. این‌جا از هر «{» جلو می‌رویم و اولین
  // شیءِ «متوازن» را برمی‌داریم — با احترام به آکولادِ داخلِ رشته‌ها.
  var bal = balancedJson_(out);
  if (bal) { try { return JSON.parse(bal); } catch (e2) { firstErr = firstErr || e2.message; } }
  var fixed = repairJson_(out, firstErr);
  if (fixed) {
    // ترمیم یعنی پاسخ بریده بوده. بی‌صدا رد شدن از این‌جا خطرناک است: قسمتی
    // با نصفِ بخش‌ها ساخته می‌شد و هیچ‌کس خبردار نمی‌شد. پس ثبت می‌شود تا هم
    // در سیاهه بماند و هم ناظر روزانه ببیندش.
    var nSec = (fixed.sections && fixed.sections.length) ? fixed.sections.length : 0;
    logLine_('هشدار: پاسخ مدل «' + model + '» ناقص برگشت و ترمیم شد (' +
             out.length + ' نویسه' + (nSec ? '، ' + nSec + ' بخش سالم' : '') +
             '). خطا: ' + String(firstErr).slice(0, 120));
    fixed.__repaired = true;
    return fixed;
  }
  throw new Error('پاسخ Gemini JSON معتبر نبود: ' + firstErr + ' | ' + out.slice(0, 200));
}

/**
 * اولین شیءِ JSONِ «متوازن» در یک متن. آکولادهای داخلِ رشته و نویسهٔ فرار را
 * می‌شناسد، پس با متنِ فارسیِ حاوی { یا } گمراه نمی‌شود.
 */
function balancedJson_(txt) {
  var s = String(txt || '');
  var trimmed = s.trim();
  var best = '';
  var tries = 0;
  for (var start = s.indexOf('{'); start !== -1 && tries < 40; start = s.indexOf('{', start + 1)) {
    tries++;
    var depth = 0, inStr = false, esc = false;
    for (var i = start; i < s.length; i++) {
      var ch = s.charAt(i);
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          var cand = s.slice(start, i + 1);
          try { JSON.parse(cand); if (cand.length > best.length) best = cand; } catch (e) {}
          break;
        }
      }
    }
  }
  // نکتهٔ حیاتی: پاسخِ «بریده» هم چند شیءِ متوازنِ کوچک در دلِ خود دارد (مثلاً
  // یک عضوِ آرایه). اگر آن تکهٔ کوچک را برگردانیم، ترمیم‌کنندهٔ پاسخِ بریده
  // هرگز صدا زده نمی‌شود و قسمت با یک شیءِ بی‌ربط ساخته می‌شود.
  // معیارِ تشخیص: در پاسخِ سالم، بعد از بدنهٔ اصلی چیزی جز فاصله و نرده و یک
  // توضیحِ کوتاه نمی‌ماند؛ در پاسخِ بریده، دنبالهٔ آن پر از JSONِ نیمه‌کاره است.
  if (!best) return '';
  var tail = trimmed.slice(trimmed.lastIndexOf(best) + best.length)
                    .replace(/```/g, '').trim();
  if (tail.length > 200) return '';
  if (/[{}\[\]]/.test(tail)) return '';
  return best;
}

/**
 * ترمیم JSON بریده.
 * وقتی مدل به سقف توکن خروجی می‌خورد، پاسخ وسط یک آرایه قطع می‌شود و JSON.parse
 * شکست می‌خورد — حتی اگر نود درصد جوابِ مفید آمده باشد. این تابع تا آخرین عنصرِ
 * کاملِ آرایه عقب می‌آید و پرانتزهای باز را می‌بندد تا همان بخشِ سالم قابل استفاده شود.
 */
function repairJson_(txt, errMsg) {
  var s = String(txt || '');
  var start = s.indexOf('{');
  if (start === -1) return null;
  s = s.slice(start);

  // اگر پیام خطا جای دقیقِ خرابی را می‌گوید، از همان‌جا عقب برو.
  // بدونش، وقتی خرابی وسطِ متن بود (نه در انتها) بریدن از انتها هیچ‌وقت به
  // نقطهٔ سالم نمی‌رسید و کلِ گزینش تحریریه‌ای دور ریخته می‌شد — همان اتفاقی
  // که در قسمت اول افتاد: «Expected ',' or ']' … at position 4034».
  var from = s.length;
  var pm = String(errMsg || '').match(/position\s+(\d+)/);
  if (pm) {
    var pos = parseInt(pm[1], 10) - start;
    if (pos > 20 && pos < from) from = pos;
  }

  for (var cut = from; cut > 20; cut = s.lastIndexOf(',', cut - 1)) {
    var head = s.slice(0, cut).replace(/,\s*$/, '');
    // شمارش براکت‌های باز، با نادیده‌گرفتن آنچه داخل رشته است
    var depth = [], inStr = false, esc = false, ok = true;
    for (var i = 0; i < head.length; i++) {
      var c = head.charAt(i);
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{' || c === '[') depth.push(c);
      else if (c === '}' || c === ']') {
        var open = depth.pop();
        if ((c === '}' && open !== '{') || (c === ']' && open !== '[')) { ok = false; break; }
      }
    }
    if (!ok || inStr) continue;
    var close = '';
    for (var d = depth.length - 1; d >= 0; d--) close += (depth[d] === '{' ? '}' : ']');
    try { return JSON.parse(head + close); } catch (e) { /* یک عنصر عقب‌تر برو */ }
    if (cut <= 0) break;
  }
  return null;
}

function extractText_(j) {
  try {
    var parts = j.candidates[0].content.parts, s = '';
    for (var i = 0; i < parts.length; i++) if (parts[i].text) s += parts[i].text;
    if (s) return s;
  } catch (e) {}
  if (j.output_text) return j.output_text;
  if (j.outputText) return j.outputText;
  return '';
}

// --------------------------------------------------------------- گفتارسازی

/** پیدا کردن دادهٔ صوتی base64 در پاسخ، مستقل از شکل API */
function extractAudioB64_(j) {
  try {
    var parts = j.candidates[0].content.parts;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].inlineData && parts[i].inlineData.data) return parts[i].inlineData.data;
      if (parts[i].inline_data && parts[i].inline_data.data) return parts[i].inline_data.data;
    }
  } catch (e) {}
  var paths = [
    function (o) { return o.output_audio && o.output_audio.data; },
    function (o) { return o.outputAudio && o.outputAudio.data; },
    function (o) { return o.interaction && o.interaction.output_audio && o.interaction.output_audio.data; },
    function (o) { return o.audio && o.audio.data; }
  ];
  for (var p = 0; p < paths.length; p++) {
    try { var v = paths[p](j); if (v) return v; } catch (e) {}
  }
  // جست‌وجوی عمقی به‌عنوان آخرین راه
  var found = null;
  (function walk(o, d) {
    if (found || !o || d > 6) return;
    if (typeof o === 'string') { if (o.length > 2000 && /^[A-Za-z0-9+/=\s]+$/.test(o)) found = o; return; }
    if (typeof o !== 'object') return;
    for (var k in o) { if (o.hasOwnProperty(k)) { walk(o[k], d + 1); if (found) return; } }
  })(j, 0);
  if (found) return found;
  throw new Error('دادهٔ صوتی در پاسخ Gemini پیدا نشد.');
}

/**
 * آیا این متن اعراب‌گذاری شده است؟ ملاک، چگالیِ نشانه‌هاست نه وجودشان:
 * یک «مِلَل» وسطِ متنِ هزارکلمه‌ای، متن را «اعراب‌دار» نمی‌کند.
 */
function hasTashkil_(t) {
  var s = String(t || '');
  // فقط نشانه‌های واقعیِ اعراب — نه رقم‌های عربیِ همان بازهٔ یونیکد
  var marks = (s.match(/[\u064B-\u0653\u0655-\u065F\u0670]/g) || []).length;
  var letters = (s.match(/[\u0621-\u064A\u066E-\u06FF]/g) || []).length;
  return letters > 20 && marks / letters >= 0.12;
}

/**
 * پذیرشِ نسخهٔ اعراب‌دار، به‌اندازهٔ متن. برای متنِ بلند، چگالیِ hasTashkil_
 * ملاک است؛ ولی برای متنِ خیلی کوتاه («پایان.») همان آستانه غیرممکن می‌شد و
 * اعرابِ کاملاً درست دور می‌رفت — چهار فراخوانِ محکوم‌به‌شکست خرج می‌شد و
 * بخشِ کوتاه همیشه با متنِ ساده خوانده می‌شد.
 */
function speakVowelledOk_(plain, v) {
  if (hasTashkil_(v)) return true;
  var letters = (String(plain || '').match(/[\u0621-\u064A\u066E-\u06FF]/g) || []).length;
  return letters <= 20 && /[\u064B-\u0653\u0655-\u065F\u0670]/.test(String(v || ''));
}

/**
 * پاک‌سازیِ گفتار: چیزی که «گفتنی» نیست از متنِ صوت برداشته می‌شود.
 *
 * چرا: در یک قسمتِ واقعی، گوینده شناسهٔ کاملِ یک فایل — رشتهٔ درهمِ حرف و
 * عدد — را بلند خواند و کلاسِ کار را پایین آورد. شناسه و لینک مالِ سند و
 * جدولِ منابع‌اند؛ در گوش هیچ معنایی ندارند. متنِ نوشتاری دست نمی‌خورد،
 * فقط نسخهٔ صوتی پاک می‌شود.
 */
function speakSanitize_(t) {
  var s = String(t || '');
  // لینک‌ها
  s = s.replace(/https?:\/\/[^\s)»«]+/gi, 'نشانی‌اش در سندِ همین قسمت آمده');
  // ایمیل — الگوی ASCIIِ کران‌دار. الگوی «هر چیزی جز فاصله»ی قبلی روی متنِ
  // بلندِ بی‌@ در هر نقطهٔ شروع کلِ باقیِ رشته را می‌بلعید و پس می‌داد
  // (O(n²))؛ یک پیشنهادِ دومگابایتیِ خصمانه، اجرای سالم را دقیقه‌ها قفل می‌کرد.
  s = s.replace(/[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,190}\.[a-z]{2,}/g, '');
  // «فایل/شناسه/… + رشتهٔ ماشینی» — با هر شکلِ اضافه (کسرهٔ چسبیده، هٔ، ‌ی)
  // و حتی اگر خودِ واژه اعراب گرفته باشد (متنِ صوتی اعراب‌دار است!).
  // جایگزین دستوری سالم می‌ماند: «فایلی که…»، «شناسه‌ای که…».
  s = s.replace(speakKwIdRe_(), function (m, kw) {
    var bare = String(kw || '').replace(speakMarksRe_(), '');
    // یای نکره، درست‌ساخت: «سندی»، «شناسه‌ای»، «ویدیویی»
    var ez = /ه$/.test(bare) ? '‌ای' : (/[او]$/.test(bare) ? 'یی' : (/ی$/.test(bare) ? '‌ای' : 'ی'));
    return bare + ez + ' که نشانی‌اش در سندِ قسمت آمده';
  });
  // نامِ فایل با پسوند: «lecture01_final.mp4»
  s = s.replace(/[A-Za-z0-9_\-]{3,}\.(mp4|mp3|wav|pdf|docx?|xlsx?|pptx?|jpe?g|png|webm|mkv|m4a|txt)\b/gi,
                'همان فایل');
  // رشتهٔ ماشینی: بلندتر از ۱۳ نویسه بی‌قید؛ و ۸ تا ۱۳ نویسه فقط اگر هم رقم
  // داشته باشد هم حرف (شناسهٔ یوتیوب‌مانندِ «dQw4w9WgXcQ»). واژهٔ انگلیسیِ
  // سالم رقم ندارد و دست نمی‌خورد.
  s = s.replace(/[A-Za-z0-9_\-]{14,}/g, '');
  s = s.replace(/[A-Za-z0-9_\-]{8,13}/g, function (m2) {
    if (!/[0-9]/.test(m2) || !/[A-Za-z]/.test(m2)) return m2;
    var runs = (m2.match(/[0-9]+/g) || []).length;
    // «dQw4w9WgXcQ» دو دستهٔ رقم دارد، «IMG_2024» جداکننده+رقم؛
    // «iPhone15Pro» هیچ‌کدام — نامِ محصول است، شناسه نیست.
    return (runs >= 2 || /[_\-]/.test(m2)) ? '' : m2;
  });
  return s.replace(/[ \t]{2,}/g, ' ').replace(/ ([.،؛!؟])/g, '$1');
}

/** کلاسِ اعرابِ احتمالی وسط/تهِ واژه — یک‌جا تا دو نسخه نشود. */
function speakMarksRe_() { return /[ً-ٰٟ]/g; }

var _speakKwRe = null;
/**
 * «واژهٔ منبع + شناسهٔ ماشینی»، اعراب‌تحمل. با رشته ساخته می‌شود چون باید
 * بعد از هر حرفِ فارسیِ واژه، جای اعراب باز بگذاریم؛ و چون از رشته ساخته
 * می‌شود، هر بک‌اسلش دوتاست — «\\s» در رشته یعنی همان s خالی، دامی که یک
 * بار همین تابع را بی‌صدا از کار انداخت.
 */
function speakKwIdRe_() {
  if (_speakKwRe) return _speakKwRe;
  var M = '[\\u064B-\\u065F\\u0670]*';
  var words = ['فایل', 'شناسه', 'کد', 'سند', 'ویدیو', 'ویدئو', 'صوت', 'عکس', 'تصویر', 'کلیپ'];
  var alts = [];
  for (var w = 0; w < words.length; w++) {
    var out = '';
    for (var c = 0; c < words[w].length; c++) out += words[w].charAt(c) + M;
    alts.push(out);
  }
  _speakKwRe = new RegExp('(' + alts.join('|') + ')' +
    '(?:\\u0654|\\u200C\\u06CC|\\u200C\\u0627\\u06CC|\\u0650|\\u06CC)?' + M +
    '[\\u200C\\s\\u060C]+' +
    '[A-Za-z0-9_\\-]{6,}(?:\\.[A-Za-z0-9]{2,4})?', 'g');
  return _speakKwRe;
}

/**
 * سطرِ دستورِ گفتار — عمداً یک سطرِ کوتاه.
 *
 * داستانش را در 00_Config کنارِ TTS_STYLE_BASE بخوانید: دستورِ بلندِ قبلی
 * دو بار در صوتِ واقعی «خودش» خوانده شد. قاعدهٔ این‌جا سه چیز است:
 * یک سطر، بی هیچ سرِ خط؛ کوتاه‌تر از TTS_CUE_MAX؛ و پایان‌یافته با «:» تا
 * مرزِ دستور و متن برای مدل روشن باشد.
 */
function ttsCue_(sectionStyle, text) {
  var cap = Number(CFG.TTS_CUE_MAX) || 300;
  var style = String(sectionStyle || '').replace(/\s+/g, ' ').trim();
  var cue = 'با صدای ' + CFG.TTS_STYLE_BASE;
  if (style) cue += '، ' + style;
  // متنِ بی‌اعراب یک یادآورِ کوتاهِ تلفظ می‌گیرد؛ متنِ اعراب‌دار نه — آن‌جا
  // خودِ متن راهنمای تلفظ است.
  if (!speakVowelledOk_(text, text)) {
    if (CFG.TTS_PRON_HINT) cue += '. ' + CFG.TTS_PRON_HINT;
  } else if (CFG.TTS_FLOW_HINT) {
    // و برعکسش: متنِ پُرنشانه همان جایی است که مدل واژه‌به‌واژه می‌خوانَد.
    cue += '. ' + CFG.TTS_FLOW_HINT;
  }
  cue = cue.replace(/\s+/g, ' ').trim();
  if (cue.length > cap) {
    cue = cue.slice(0, cap);
    var sp = cue.lastIndexOf(' ');
    if (sp > cap * 0.6) cue = cue.slice(0, sp);
  }
  cue = cue.replace(/[،.؛:\s]+$/, '');
  return cue + '، فقط این متن را اجرا کن:';
}

/**
 * آیا این تکه باید دستورِ لحن را هم بگیرد؟
 *
 * در حالتِ perSection فقط نخستین تکهٔ هر لحن. لحن که عوض شود دوباره فرستاده
 * می‌شود، پس اجرای هر بخش همان‌طور که نویسنده خواسته شروع می‌شود.
 * تکهٔ نخست همیشه دستور می‌گیرد — حتی وقتی ادامهٔ اجرای قبلی است — چون هر
 * فراخوانِ گفتارسازی مستقل است و چیزی از تکهٔ قبل به یاد نمی‌آورد.
 */
function ttsCueWanted_(chunks, i) {
  var mode = String(CFG.TTS_CUE_MODE || 'perSection');
  // «off» تنها حالتِ ساختاراً امن است: دستوری فرستاده نمی‌شود، پس چیزی هم
  // برای اشتباه‌خواندن نمی‌ماند. پیشتر این حالت وجود نداشت و هر مقدارِ
  // ناشناخته‌ای «همیشه دستور بده» معنا می‌شد — یعنی برعکسِ چیزی که نامش
  // می‌گفت.
  if (mode === 'off') return false;
  if (mode !== 'perSection') return true;
  if (i <= 0) return true;
  // تکهٔ موسیقی لحن ندارد؛ برای مقایسه باید از رویش پرید، وگرنه هر قطعهٔ
  // موسیقی یک دستورِ اضافه به تکهٔ بعدی تحمیل می‌کند.
  var j = i - 1;
  while (j > 0 && chunks[j] && chunks[j].pcm) j--;
  if (chunks[j] && chunks[j].pcm) return true;
  var prev = chunks[j] || {}, cur = chunks[i] || {};
  if (String(prev.style || '') !== String(cur.style || '')) return true;
  if (String(prev.voice || '') !== String(cur.voice || '')) return true;
  return false;
}

/**
 * ══ چرا این تابع بازنویسی شد (۵٫۵۹) ══
 * تا امروز دستورِ لحن و متنِ گفتار *یک رشته* بودند:
 *     'با صدای …، فقط این متن را اجرا کن:\n' + متن
 * یعنی مدل باید حدس می‌زد کدام سطر دستور است و کدام متن. گاهی حدس نمی‌زد و
 * دستور را بلند می‌خواند. این باگ چند بار گزارش شد و هر بار با عوض‌کردنِ
 * *عبارتِ* دستور «حل» شد — که حل نبود: عبارت هرچه باشد، تشخیصْ حدس می‌ماند.
 *
 * حالا دستور در systemInstruction می‌نشیند و متن در contents. این یک مرزِ
 * ساختاری است، نه یک خواهش. و اگر API این قالب را نپذیرد، به «بی‌دستور»
 * برمی‌گردیم — هرگز به چسباندنِ دوباره. لحنِ خنثی بی‌ضرر است؛ خواندنِ دستور نه.
 */
function ttsPayloads_(text, modelOverride, sectionStyle, voice, withCue) {
  var model = modelOverride || ttsModel_();
  var vc = voice || CFG.TTS_VOICE;
  // مدلی که یک بار این قالب را رد کرده، دوباره امتحان نمی‌شود.
  // `!!model` لازم است: بی آن، مدلِ ناشناخته (null) با کلیدِ خالیِ خاصیت
  // (null) برابر می‌شد و دستور برای همه خاموش می‌ماند — سدی که همیشه بسته
  // است، همان اشتباهی است که ۵٫۶۵ کرد.
  var cueOff = false;
  try { cueOff = !!model && props_().getProperty(PK.TTS_CUE_OFF) === model; } catch (eC) {}
  var cue = (withCue === false || cueOff) ? '' : ttsCue_(sectionStyle, text);

  var gc = {
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: vc } } }
    }
  };
  if (cue) gc.systemInstruction = { parts: [{ text: cue }] };

  var ix = {
    model: model,
    input: text,
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: vc }] }
  };
  if (cue) ix.instructions = cue;

  return {
    generateContent: {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/' + model +
           ':generateContent?key=' + encodeURIComponent(apiKey_()),
      body: gc
    },
    interactions: {
      url: 'https://generativelanguage.googleapis.com/v1beta/interactions?key=' +
           encodeURIComponent(apiKey_()),
      body: ix
    }
  };
}

/* ═══════ نگهبانِ «گوینده دستور را نخواند» (۵٫۵۹) ═══════

   ══ چرا نگهبان لازم است، با وجودِ جداکردنِ ساختاری ══
   جداکردنِ دستور از متن کارِ درست است، ولی ضمانت نیست: نمی‌دانیم این مدل
   systemInstruction را چطور تعبیر می‌کند، و رفتارش می‌تواند با نسخهٔ بعدیِ
   مدل عوض شود. این باگ چند بار «حل» اعلام شده و هر بار برگشته، دقیقاً چون
   هیچ‌وقت کسی به خروجی گوش نداده بود — فقط ورودی عوض شده بود.

   ══ تنها راهِ فهمیدن ══
   شش ثانیهٔ اولِ خودِ صدا به مدل داده می‌شود: «چه می‌شنوی؟». اگر واژه‌های
   دستور در آن باشد و در متنِ گفتار نباشد، دستور خوانده شده. آن‌وقت همان تکه
   بی‌دستور دوباره ساخته می‌شود.

   ══ هزینه ══
   فقط تکه‌هایی که دستور گرفته‌اند سنجیده می‌شوند — یعنی سرِ هر بخش، نه هر
   تکه. برای یک قسمتِ معمولی سه تا هشت فراخوانِ کوچک. با CFG.TTS_CUE_VERIFY
   می‌شود خاموشش کرد، و با TTS_CUE_MODE='off' اصلاً دستور نفرستاد.
   ═════════════════════════════════════════════════════════════════════════ */

/** واژه‌های امضاداری که فقط در دستور می‌آیند، نه در روایتِ یک پادکست. */
var CUE_MARKERS = ['فقط این متن را اجرا کن', 'با صدای', 'گویندهٔ حرفه‌ای',
                   'گوینده حرفه‌ای', 'زیر و زبر', 'فارسیِ معیار', 'فارسی معیار'];

/** PCMِ خام (۲۴ کیلوهرتز، ۱۶ بیت، تک‌کاناله) → WAVِ base64 برای شنیدنِ مدل. */
function ttsWavOf_(pcmB64, secs) {
  var raw = Utilities.base64Decode(pcmB64);
  var want = Math.max(1, Number(secs) || 6);
  var n = Math.min(raw.length, Math.round(want * (CFG.SAMPLE_RATE || 24000)) * 2);
  var body = raw.slice(0, n - (n % 2));
  var h = wavHeader54_(body.length);
  return Utilities.base64Encode(h.concat(Array.prototype.slice.call(body)));
}

/**
 * آیا در این صدا دستورِ لحن خوانده شده؟
 * برمی‌گرداند {leaked, heard} — و leaked فقط وقتی true است که واقعاً شنیده
 * شده باشد. نشنیدن (خطا، مدلِ در دسترس نبودن) leaked نمی‌سازد، ولی لاگ
 * می‌شود؛ وگرنه هر نبودِ مدل کلِ قسمت را دوباره می‌ساخت.
 */
function ttsCueLeaked_(pcmB64, cueText, spokenText) {
  try {
    if (!pcmB64 || !cueText) return { leaked: false, heard: '' };
    var b64 = ttsWavOf_(pcmB64, Number(CFG.TTS_CUE_VERIFY_SEC) || 6);
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              textModel_() + ':generateContent?key=' + encodeURIComponent(apiKey_());
    var j = geminiFetch_(url, { contents: [{ role: 'user', parts: [
      { text: 'دقیقاً بنویس در این صدا چه گفته می‌شود. فقط خودِ واژه‌ها، ' +
              'بی هیچ توضیح یا نشانه‌گذاریِ اضافه.' },
      { inlineData: { mimeType: 'audio/wav', data: b64 } }
    ] }], generationConfig: { temperature: 0, maxOutputTokens: 256 } });

    var heard = String(extractAudioText_(j) || '').replace(/\s+/g, ' ').trim();
    if (!heard) return { leaked: false, heard: '' };

    var body = String(spokenText || '').replace(/\s+/g, ' ');
    for (var i = 0; i < CUE_MARKERS.length; i++) {
      var mk = CUE_MARKERS[i];
      // نشانه فقط وقتی معنا دارد که در خودِ متنِ گفتار نباشد — وگرنه یک
      // قسمتِ رادیویی که واقعاً دربارهٔ «صدای گوینده» حرف می‌زند، هر بار
      // بی‌دلیل دوباره ساخته می‌شد.
      if (heard.indexOf(mk) !== -1 && body.indexOf(mk) === -1) {
        return { leaked: true, heard: heard.slice(0, 120) };
      }
    }
    return { leaked: false, heard: heard.slice(0, 120) };
  } catch (e) {
    logLine_('وارسیِ «دستور خوانده نشد» انجام نشد: ' + e.message);
    return { leaked: false, heard: '', failed: true };
  }
}

/** متنِ پاسخ، برای وارسیِ شنیداری. extractText_ برای پاسخِ JSON است. */
function extractAudioText_(j) {
  try {
    var parts = j.candidates[0].content.parts;
    for (var i = 0; i < parts.length; i++) if (parts[i].text) return parts[i].text;
  } catch (e) {}
  return '';
}

/** یک تکه متن → base64 خام PCM. sectionStyle می‌گوید این تکه چطور اجرا شود. */
function ttsChunk_(text, sectionStyle, voice, withCue) {
  try { return ttsGuarded_(text, sectionStyle, voice, withCue); }
  catch (e) {
    // نامِ صدا را API می‌تواند نپذیرد (نامِ تازه، نامِ بازنشسته، غلطِ تایپی در
    // جدول). آن‌وقت نباید کلِ قسمت زمین بخورد: با صدای پشتیبان ادامه می‌دهیم و
    // آن نام را برای اجراهای بعد کنار می‌گذاریم.
    var msg = String(e.message || '');
    var badVoice = voice && voice !== CFG.TTS_VOICE &&
                   (/voice/i.test(msg) || /HTTP 400/.test(msg) || /invalid/i.test(msg));
    if (!badVoice) throw e;
    logLine_('صدای «' + voice + '» پذیرفته نشد؛ با صدای پشتیبان خوانده شد. پیام: ' +
             msg.slice(0, 120));
    try {
      var cur = String(props_().getProperty(PK.VOICE_BLOCK) || '');
      if (cur.split(',').indexOf(voice) === -1) {
        props_().setProperty(PK.VOICE_BLOCK, cur ? cur + ',' + voice : voice);
      }
    } catch (eB) {}
    return ttsChunkTry_(text, sectionStyle, CFG.TTS_VOICE, withCue);
  }
}

/**
 * ساخت، و بعد گوش‌دادن. اگر دستور خوانده شده باشد، بی‌دستور از نو.
 * این تنها جایی است که خروجی — نه ورودی — سنجیده می‌شود.
 */
function ttsGuarded_(text, sectionStyle, voice, withCue) {
  var b64 = ttsChunkTry_(text, sectionStyle, voice, withCue);
  if (withCue === false || CFG.TTS_CUE_VERIFY === false || !b64) return b64;

  var v = ttsCueLeaked_(b64, ttsCue_(sectionStyle, text), text);
  if (!v.leaked) return b64;

  logLine_('⚠️ گوینده دستورِ لحن را خواند؛ همین تکه بی‌دستور از نو ساخته شد. ' +
           'شنیده‌شده: «' + v.heard + '»');
  try {
    logSelfFinding_(getHub_(), {
      priority: 'جدی', category: 'گفتارسازی', key: 'tts-cue-leak',
      title: 'گوینده دستورِ لحن را به‌جای متن خواند',
      detail: 'شنیده‌شده: «' + v.heard + '». تکه بی‌دستور دوباره ساخته شد و ' +
              'صدای منتشرشده سالم است.',
      instruction: 'اگر تکرار شد، CFG.TTS_CUE_MODE را روی «off» بگذارید: ' +
                   'هیچ دستوری فرستاده نمی‌شود، پس ساختاراً ممکن نیست خوانده شود. ' +
                   'بهایش لحنِ خنثی‌تر است.',
      owner: ROWNER_CODE
    });
  } catch (eF) {}

  var clean = ttsChunkTry_(text, sectionStyle, voice, false);
  return clean || b64;
}

/** آیا این خطا دربارهٔ خودِ فیلدِ دستور است، یا چیزِ دیگری در همان بسته؟ */
function ttsCueRejected_(msg) {
  var m = String(msg || '');
  return m.indexOf('systemInstruction') !== -1 ||
         m.indexOf('system_instruction') !== -1 ||
         m.indexOf('instructions') !== -1;
}

function ttsChunkTry_(text, sectionStyle, voice, withCue) {
  var model = ttsModel_();
  var modes = ttsPayloads_(text, model, sectionStyle, voice, withCue);
  var pref = props_().getProperty(PK.TTS_MODE);
  var order = pref ? [pref, pref === 'generateContent' ? 'interactions' : 'generateContent']
                   : ['generateContent', 'interactions'];
  var lastErr = null, refreshed = false;

  for (var i = 0; i < order.length; i++) {
    var mode = order[i];
    for (var attempt = 0; attempt < 3; attempt++) {
      var cfg = modes[mode];
      try {
        var j = geminiFetch_(cfg.url, cfg.body);
        var b64 = extractAudioB64_(j);
        props_().setProperty(PK.TTS_MODE, mode);
        return b64;
      } catch (e) {
        lastErr = e;
        var m = String(e.message || '');
        // مدل صوتی بازنشسته شده؟ یک‌بار فهرست را تازه کن و با جانشین ادامه بده
        if (isModelGoneError_(m) && !refreshed) {
          refreshed = true;
          var fresh = resolveModels_(true).tts;
          logLine_('مدل صوتی «' + model + '» در دسترس نیست؛ جانشین: ' + fresh);
          model = fresh;
          modes = ttsPayloads_(text, model, sectionStyle, voice, withCue);
          continue;
        }
        if (m.indexOf('HTTP 4') !== -1 && m.indexOf('429') === -1) {
          // اگر ایرادِ ساختاری از خودِ قالبِ دستور باشد، یک‌بار بی‌دستور
          // امتحان می‌کنیم. سقوط همیشه به سمتِ امن است: بی‌لحن، نه بی‌مرز.
          if (withCue !== false) {
            /* ── یک بار یاد بگیر، نه سیزده بار (۵٫۸۴) ──
               در قسمتِ ۱۸ این خط **هشت بار** نوشته شد: هر تکه‌ای که سرِ یک
               بخش بود، یک فراخوانِ ردشده می‌داد و بعد بی‌دستور دوباره
               ساخته می‌شد. یعنی هشت رفت‌وبرگشتِ دورانداختنی و یک سیاههٔ
               پر از تکرار — و در میانِ آن تکرار، دیده نمی‌شد که قابلیتِ
               «دستورِ لحن» عملاً مرده است.
               حکمِ مدل برای همان مدل ذخیره می‌شود و تا وقتی مدل عوض نشود
               دیگر امتحان نمی‌شود. سقوط همچنان به سمتِ امن است: بی‌لحن،
               نه بی‌مرز. */
            /* ولی فقط وقتی خطا **واقعاً** دربارهٔ همین قالب باشد.
               هر ۴xx دلیلِ خاموش‌کردنِ دستور نیست: نامِ صدای نامعتبر هم ۴۰۰
               می‌دهد، و اگر آن را «قالب را نپذیرفت» بخوانیم، یک اسمِ اشتباهِ
               گذرا لحنِ همهٔ قسمت‌ها را برای همیشه خاموش می‌کند.
               `run_voices_test.js` ۶ دقیقاً همین حالت را می‌سازد. */
            if (ttsCueRejected_(m)) {
              try {
                if (props_().getProperty(PK.TTS_CUE_OFF) !== model) {
                  props_().setProperty(PK.TTS_CUE_OFF, model);
                  logLine_('قالبِ دستورِ لحن را مدل «' + model + '» نپذیرفت؛ ' +
                           'از این پس تکه‌ها بی‌دستور ساخته می‌شوند.');
                }
              } catch (eP) {}
            } else {
              /* اینجا یعنی خطا **دربارهٔ قالبِ دستور نبود** — پس گفتنِ «قالبِ
                 دستور پذیرفته نشد» دروغ است و علتِ واقعی را پنهان می‌کند.
                 یک تکه که بی‌صدا بی‌لحن ساخته شود ایرادِ بزرگی نیست؛ ولی
                 خطایی که هیچ‌جا نوشته نشود، دفعهٔ بعد هم قابلِ تشخیص نیست.
                 (۲۵ اوت: قسمت ۱۶ یک بار همین را داد و متنِ خطا هیچ‌جا نماند.) */
              logLine_('صداسازیِ یک تکه رد شد؛ بی‌دستور دوباره ساخته می‌شود — ' +
                       m.replace(/\s+/g, ' ').slice(0, 180));
            }
            return ttsChunkTry_(text, sectionStyle, voice, false);
          }
          break;   // خطای ساختاری: مود بعدی
        }
        Utilities.sleep(3000 * (attempt + 1));
      }
    }
  }
  throw new Error('تبدیل متن به گفتار ناموفق بود: ' + (lastErr && lastErr.message));
}

// --------------------------------------------- متنِ صوتی با اعراب‌گذاریِ کامل

/**
 * ══ دو نسخه از هر متن ══
 *
 * از این نسخه هر قسمت دو متن دارد:
 *   • متنِ خواندنی — همان که در ایمیل و تلگرام و سند می‌آید؛ بی‌اعراب و تمیز.
 *   • متنِ صوتی — همان جمله‌ها، واژه‌به‌واژه، ولی با اعراب‌گذاریِ کامل
 *     (فتحه، کسره، ضمه، سکون، تشدید) بر پایهٔ تلفظِ فارسیِ معیارِ تهران.
 *     این متن به گفتارساز می‌رود و در پوشهٔ قسمت هم ذخیره می‌شود.
 *
 * چرا: درست‌خوانی را نمی‌شود با «دستور» تضمین کرد (داستانِ TTS_STYLE_BASE را
 * در 00_Config بخوانید) — ولی می‌شود با خودِ متن تضمین کرد. مدلِ گفتار
 * «مَرد» را غلط نمی‌خواند؛ «مرد» را غلط می‌خواند.
 *
 * اعراب‌گذاری را در درجهٔ اول Cowork هنگامِ غنی‌سازی انجام می‌دهد و در پاسخش
 * می‌فرستد. ولی هیچ اعرابی — نه از Cowork و نه حتی اعرابی که از قبل در متن
 * بوده — «به اعتماد» پذیرفته نمی‌شود: پوستهٔ بی‌اعرابِ هر دو نسخه باید
 * واژه‌به‌واژه یکی باشد (verifySpeak_)، وگرنه موتور خودش از نو اعراب می‌گذارد.
 */

var SPEAK_SCHEMA = { type: 'object', properties: { v: { type: 'string' } }, required: ['v'] };

/**
 * همهٔ نام‌های مرحله‌ای که هر دو خطِ تولید می‌شناسند — یک فهرست، نه دو.
 *
 * هر دو برنامه از همین می‌خوانند و «ناشناخته» را به صداگذاری می‌فرستند.
 * فهرست عمداً یکی است حتی با اینکه enrich/explain فقط در درس‌نامه‌اند و sfx
 * فقط در برنامهٔ متنوع: دو فهرست یعنی روزی یکی مرحلهٔ تازه را می‌گیرد و
 * آن‌یکی نه، و آن‌وقت نگهبانِ حلقهٔ بی‌پایان خودش می‌شود سازندهٔ آن.
 * اضافه‌کردنِ نامِ تازه به این فهرست، بخشی از افزودنِ هر مرحلهٔ تازه است.
 */
var SPEAK_PHASES_ = ['enrich', 'explain', 'speak', 'speak2', 'audio', 'merge', 'deliver'];

/**
 * برداشتنِ اعراب — برای مقایسهٔ «واژه‌به‌واژه یکی است؟».
 *
 * دامنهٔ نشانه‌ها باید «فقط» نشانه باشد. نسخهٔ اول بازهٔ U+064B تا U+0670 را
 * یکجا برمی‌داشت که وسطش رقم‌های عربی (٠۱٢…)، درصد و ممیزِ عربی هم هست —
 * یعنی «سالِ ١٣٥٧» و «سالِ ١٩٧٩» بعد از پوست‌کندن یکی می‌شدند و وارسیِ
 * «واژه‌به‌واژه» می‌توانست تغییرِ عدد را نبیند. عدد واژه است؛ پوست نیست.
 * همزهٔ روی ها («خانهٔ») هم نگه داشته می‌شود: افتادنش یعنی افتادنِ کسرهٔ
 * اضافه از گفتار، و آن هم تغییرِ متن است نه تغییرِ اعراب.
 */
function stripTashkil_(t) {
  // فقط نشانه‌های اعراب: فتحه/کسره/ضمه/تنوین/سکون/تشدید (064B–0653، 0655–065F)،
  // الفِ خنجری (0670) و نشانه‌های قرآنی (06D6–06ED). رقم‌های عربیِ ٠–٩
  // (0660–0669) و درصد/ممیز (066A–066D) عمداً بیرون‌اند: عدد واژه است، پوست
  // نیست — نسخهٔ قبلی این‌ها را هم می‌کند و وارسی، تغییرِ «۱۳۵۷ به ۱۹۷۹» را
  // نمی‌دید. همزهٔ رویِ ها (0654) هم بیرون است: افتادنش یعنی افتادنِ کسرهٔ
  // اضافه از «خانهٔ» — تغییرِ متن، نه تغییرِ اعراب.
  return String(t || '')
    .replace(/[\u064B-\u0653\u0655-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    .replace(/\u0640/g, '');
}

/** پوستهٔ مقایسه: بی‌اعراب، بی‌نیم‌فاصله، با فاصله‌ها و رقم‌های یک‌دست. */
function speakCmp_(t) {
  var s = String(t || '');
  // «ۀ» و «هٔ» یک چیزند؛ پیش از پوست‌کندن یک‌دست می‌شوند.
  s = s.replace(/\u06C0/g, '\u0647\u0654');
  s = stripTashkil_(s);
  // رقمِ فارسی و عربی و لاتین یک‌دست می‌شوند: «۱۴۰۰» و «١٤٠٠» یک عددند،
  // ولی «۱۴۰۰» و «۱۹۷۹» هرگز.
  s = s.replace(/[\u06F0-\u06F9]/g, function (d) { return String(d.charCodeAt(0) - 0x6F0); });
  s = s.replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x660); });
  /* ══ نیم‌فاصله دیگر نامرئی نیست (۶٫۲۶) ══
   * تا ۶٫۲۵ کلِ بازهٔ U+200B..U+200F برداشته می‌شد و نیم‌فاصله (U+200C) هم
   * تویش بود. یعنی مدل می‌توانست **وسطِ هر واژه‌ای** نیم‌فاصله بگذارد و
   * وارسی هیچ‌وقت نفهمد — «مد‌رسه» از هر دو سد رد می‌شد و گفتارساز آن را
   * دوتکه می‌خواند. تا وقتی کسی از مدل نیم‌فاصله نخواسته بود این نادر بود؛
   * ۶٫۲۰ صریحاً خواستش و تلفظ از همیشه بدتر شد.
   * نیم‌فاصله جزوِ املای واژه است، نه آرایشِ آن. پس در مقایسه می‌مانَد و
   * افزودن یا برداشتنش تغییرِ متن حساب می‌شود. */
  return s
    .replace(/[\u200B\u200D-\u200F\u061C]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([.،؛:!؟…])\s*/g, '$1')
    .trim();
}

/**
 * پوستهٔ «استخوان»: همان speakCmp_ ولی بی نشانه‌های *عبارت‌بندی*.
 *
 * ══ چرا این دومی لازم شد ══
 * کاربر خواست متنِ صوتی «فقط اعراب‌گذاری نباشد، بلکه با نشانه‌گذاری‌ها و
 * سایر موارد به مدل حالی کند» — یعنی ویرگول و سه‌نقطه و خط‌تیره برای
 * عبارت‌بندی. ولی speakCmp_ نشانه‌ها را نگه می‌دارد، پس هر ویرگولی که مدل
 * می‌افزود verifySpeak_ را می‌شکست و آن بخش با متنِ *بی‌اعراب* خوانده می‌شد.
 * یعنی خواستهٔ «بهتر بخوان» نتیجه‌اش «بدتر بخوان» بود، بی هیچ خطایی.
 *
 * پس مقایسه دو لایه شد. نقطه و علامتِ تعجب و پرسش عمداً بیرونِ فهرستِ
 * برداشتنی‌اند: مرزِ جمله معنا دارد و مدل حق ندارد جمله‌ها را به هم بدوزد یا
 * بشکند. رقم و حرف هم که سرِ جایشان می‌مانند — این هنوز همان وارسیِ
 * «واژه‌به‌واژه» است، فقط دربارهٔ ویرگول سخت‌گیری نمی‌کند.
 */
function speakBone_(t) {
  // نشانه با «فاصله» جایگزین می‌شود، نه با هیچ. speakCmp_ فاصلهٔ دو طرفِ
  // نشانه را می‌خورد («بایستیم، و» ← «بایستیم،و»)، پس برداشتنِ خودِ نشانه
  // دو واژه را به هم می‌چسباند و متنِ ویرگول‌دار دیگر با متنِ بی‌ویرگول
  // یکی نمی‌شود — یعنی دقیقاً همان چیزی که این پوسته برای حلش ساخته شد.
  // و فاصله‌ای که کنارِ نیم‌فاصله بنشیند هم برداشته می‌شود: «واژه، نیم‌فاصله»
  // پس از حذفِ ویرگول یک فاصله جا می‌گذارد و آن فاصله متنِ اصل را — که فقط
  // نیم‌فاصله داشت — ناهمسان می‌کند.
  return speakCmp_(t).replace(/[،؛:—–…]/g, ' ').replace(/\s+/g, ' ')
    .replace(/\s*\u200C\s*/g, '\u200C').trim();
}

/** فقط حرف و رقم — برای سنجشِ «این جایگزین همان واژه است یا واژهٔ دیگری؟» */
function speakLetters_(t) {
  return speakCmp_(t).replace(/[^ء-يٮ-ۿ0-9A-Za-z]/g, '');
}

/** آیا این نویسه «معنادار» است — حرف یا رقم؟ (اعراب و نشانه و فاصله نه) */
/**
 * ══ «قطعه‌ها ۰ تا ۰ از ۰» (۶٫۲۹) ══
 * قسمتِ «مرورِ بزرگ» از هیچ قطعه‌ای ساخته نمی‌شود — ورودی‌اش جزوهٔ مجموعه
 * است. پس جدولِ پوشش، که برای درسِ عادی نوشته شده بود، سه صفر نشان می‌داد و
 * صاحبِ برنامه پرسید «نمی‌دانم تا کدام قسمت پوشش داده». جوابش در همان پرونده
 * بود (`recapChapters`, `recapParts`) و فقط جایی برای گفتنش نداشت.
 * یک خانهٔ خالی بهتر از سه صفر است، ولی جوابِ درست از هر دو بهتر.
 */
function coverPartText_(meta, cx) {
  if (meta && meta.recap) return 'مرورِ بزرگ — پایانِ مجموعه';
  return 'قسمت ' + cx.partSeq + ' — ' + cx.partName;
}

/** همان چیز، در یک خط — برای تلگرام و متنِ ساده. */
function coverShortText_(meta) {
  if (meta && meta.recap) return 'مرورِ بزرگ — ' + coverRangeText_(meta, meta);
  return 'قسمت ' + meta.partSeq + ' — قطعهٔ ' + meta.fromNo + ' تا ' +
         meta.toNo + ' از ' + meta.totalChunks;
}

function coverRangeText_(meta, cx) {
  if (meta && meta.recap) {
    var ch = Number(meta.recapChapters) || 0, pr = Number(meta.recapParts) || 0;
    var all = Number(meta.recapChaptersAll) || ch;
    if (!ch && !pr) return 'همهٔ درس‌های تولیدشدهٔ این مجموعه';
    /* «از» می‌آید چون عدد اندازه‌گیری‌شده است، نه ادعا: فصلی که هیچ واژهٔ
       شاخصش در متنِ مرور نباشد، پوشش‌داده شمرده نمی‌شود (۶٫۳۳). */
    return pr + ' درسِ تولیدشده · ' + ch + ' فصل از ' + all + ' فصلِ جزوه' +
           (all > ch ? ' (' + (all - ch) + ' فصل نیامده)' : '');
  }
  return cx.fromNo + ' تا ' + cx.toNo + ' از ' + cx.totalChunks;
}

function speakSigCh_(ch) {
  return /[\u0621-\u064A\u066E-\u06D3\u06D5\u06E5\u06E6\u06EE-\u06FF0-9A-Za-z]/.test(ch);
}

/**
 * ══ نیم‌فاصله را *تعمیر* می‌کنیم، نه اینکه بخش را دور بیندازیم (۶٫۲۹) ══
 *
 * ۶٫۲۰ از مدل نیم‌فاصله خواست و مدل آن را وسطِ واژه‌های سالم هم گذاشت
 * («مد‌رسه»)؛ چون speakCmp_ نیم‌فاصله را نامرئی می‌گرفت، هیچ سدی نفهمید.
 * ۶٫۲۶ نیم‌فاصله را در مقایسه *دیدنی* کرد — و در همان حال پرامپت هنوز
 * می‌گفت «با نیم‌فاصله به هم ببندشان». نتیجه‌اش را در قسمت ۱۹ اندازه گرفتیم:
 * از ۱۳ بخش، ۸ تا `skip:true` شدند و `__speakFails` روی ۱۸ ایستاد — یعنی
 * ۶۲٪ از قسمت **بی هیچ اعرابی** خوانده شد. دو نسخهٔ پیاپی، هر دو با نیتِ
 * «تلفظ بهتر»، تلفظ را بدتر کردند.
 *
 * ریشهٔ هر دو یکی است: سدی که برای *یک* عیبِ قابلِ تعمیر، *کلِ* کار را ردّ
 * می‌کند. نیم‌فاصله جزوِ املای واژه است و املا دستِ مدل نیست — پس به‌جای ردّ،
 * الگوی نیم‌فاصلهٔ متنِ اصل روی خروجیِ مدل نشانده می‌شود: هر نیم‌فاصله‌ای که
 * مدل افزوده برداشته می‌شود و هر کدام که در اصل بوده سرِ جایش برمی‌گردد.
 * اعراب و نشانه‌گذاری — که *باید* دستِ مدل باشند — دست‌نخورده می‌مانند.
 *
 * هم‌ترازی روی نویسه‌های معنادار (حرف و رقم) انجام می‌شود. اگر هم‌ترازی
 * بشکند یعنی مدل واژه‌ای را عوض کرده؛ آن دیگر کارِ این تابع نیست و متن
 * دست‌نخورده به سدِ وارسی سپرده می‌شود تا خودش ردّش کند.
 */
function speakZwnjFix_(plain, vowelled) {
  var Z = '\u200C';
  var p = String(plain || ''), v = String(vowelled || '');
  if (!v) return v;
  if (p.indexOf(Z) === -1 && v.indexOf(Z) === -1) return v;

  // نقشهٔ اصل: برای هر نویسهٔ معنادار، جداکنندهٔ پیش از آن ('z' | ' ' | '')
  var sig = [], sep = '';
  for (var a = 0; a < p.length; a++) {
    var ca = p.charAt(a);
    if (speakSigCh_(ca)) { sig.push({ c: ca, s: sep }); sep = ''; }
    else if (ca === Z) sep = 'z';
    else if (/\s/.test(ca)) { if (sep !== 'z') sep = ' '; }
  }
  if (!sig.length) return v;

  var out = [], k = 0;
  for (var b = 0; b < v.length; b++) {
    var cb = v.charAt(b);
    if (cb === Z) continue;                       // هر نیم‌فاصلهٔ مدل برداشته می‌شود
    if (!speakSigCh_(cb)) { out.push(cb); continue; }
    if (k >= sig.length || sig[k].c !== cb) return vowelled;   // هم‌ترازی شکست
    var want = sig[k].s;
    if (want === 'z') {
      while (out.length && /\s/.test(out[out.length - 1])) out.pop();
      out.push(Z);
    } else if (want === ' ') {
      var has = false;
      for (var t = out.length - 1; t >= 0; t--) {
        if (speakSigCh_(out[t])) break;
        if (/\s/.test(out[t])) { has = true; break; }
      }
      if (!has && out.length) out.push(' ');
    } else {
      // اصل هیچ جداکننده‌ای نداشت — فاصله‌ای که مدل وسطِ واژه انداخته می‌رود
      while (out.length && /\s/.test(out[out.length - 1])) out.pop();
    }
    out.push(cb); k++;
  }
  if (k !== sig.length) return vowelled;          // چیزی از اصل جا مانده
  return out.join('');
}

function verifySpeak_(plain, vowelled) {
  if (!vowelled) return false;
  if (speakCmp_(plain) === speakCmp_(vowelled)) return true;
  // لایهٔ دوم فقط وقتی باز است که نشانه‌گذاریِ آوایی روشن باشد؛ خاموشش که
  // کنی، دقیقاً همان سخت‌گیریِ پیشین برمی‌گردد.
  if (CFG.SPEAK_MARKS === false) return false;
  return speakBone_(plain) === speakBone_(vowelled);
}

// ------------------------------------------------- دام‌های تلفظ (فهرستِ یکجا)

/**
 * ══ چرا فهرست، و چرا در کد ══
 * گزارشِ کاربر یک واژه بود — «بایستیم» که «با» خوانده شد — ولی خواستش صریح
 * بود: «این یه نمونه‌ست … تعمیم بدی به بسیاری موارد دیگر». یک واژه را می‌شود
 * در تبِ تلفظ نوشت؛ یک *دسته* را باید به کسی که اعراب می‌گذارد یاد داد.
 *
 * این فهرست دو مصرف دارد و باید یک نسخه بماند: پرامپتِ نوشتن و پرامپتِ
 * بازبینی. دو نسخه یعنی روزی یکی جلو می‌افتد و آن‌یکی بی‌صدا کهنه می‌شود —
 * شکلی که این ریپو بارها دیده.
 *
 * ══ ابزارِ مدل دو تاست، نه سه تا (اصلاحِ ۶٫۲۹) ══
 *   ۱) اعراب — «مِلَل»، «قَدر». آزاد؛ در مقایسه برداشته می‌شود.
 *   ۲) نشانه‌گذاریِ عبارت‌بندی — «،» «…» «—» «:». آزاد وقتی SPEAK_MARKS
 *      روشن است؛ speakBone_ آن‌ها را می‌بیند و نادیده می‌گیرد. مرزِ جمله
 *      (نقطه و پرسش و تعجب) هرگز آزاد نیست.
 *   ۳) نیم‌فاصله — **دستِ مدل نیست.** جزوِ املای واژه است.
 *
 * این سه‌گانه تا ۶٫۲۸ می‌گفت «هر سه از سدِ وارسی رد می‌شوند» و از ۶٫۲۶ دیگر
 * درست نبود: speakCmp_ نیم‌فاصله را می‌بیند. یک جملهٔ راهنما که از حقیقتش
 * جا مانده باشد، بدتر از نبودنش است — سه بخش از این فهرست هنوز به مدل
 * نیم‌فاصله یاد می‌داد در حالی که هر نیم‌فاصله بخش را از دور خارج می‌کرد.
 * «بایستیم» حالا از راهِ درستش حل می‌شود: کسرهٔ پیشوند در اعراب، و ردیفِ
 * ثابت در تبِ «تلفظ» که *پس از* وارسی اعمال می‌شود.
 */
var SPEAK_TRAPS = [
  'پیشوندِ فعل + ستاکِ الف‌آغاز. «بایستیم» (از ایستادن) را مدل «با» می‌خواند، ' +
  'چون ب به الف چسبیده. **کسرهٔ پیشوند را بگذار** — «بِایستیم» — ولی ' +
  'نیم‌فاصله اضافه نکن؛ آن کار جای دیگری انجام می‌شود. همین برای ' +
  'بـ+افتادن، بـ+انداختن، بـ+آوردن، نـ+ایستادن.',

  'هم‌نگاشت‌ها. یک املا، چند خوانش: «کرم/کِرم/کَرَم»، «مرد/مَرد/مُرد»، ' +
  '«سرد/سَرد/سُرد»، «گل/گُل/گِل»، «ملک/مَلِک/مُلک/مِلک»، «شکر/شِکَر/شُکر»، ' +
  '«بره/بَره/بُرِه»، «کشت/کِشت/کُشت»، «رشته/رِشته»، «نظر/نَظَر»، «قدر/قَدر». ' +
  'اینجا اعراب واجب است، نه اختیاری — بی آن مدل باید حدس بزند.',

  'کسرهٔ اضافه در همهٔ ترکیب‌های اضافی و وصفی. «کتابِ من»، «راهِ درست»، ' +
  '«خانهٔ بزرگ». افتادنش، معنا و آهنگِ جمله هر دو را می‌شکند.',

  'واوِ عطف که /o/ خوانده می‌شود نه /va/: «آب و هوا»، «شب و روز»، ' +
  '«خوب و بد». ضمه‌اش را بگذار — «وُ» — تا پیوسته و کوتاه ادا شود.',

  'نیم‌فاصله‌ها را همان‌طور که در متن هست بگذار و باش — نه اضافه، نه کم. ' +
  'یک نیم‌فاصلهٔ نابه‌جا واژه را دوتکه می‌کند.',

  'تشدید. «مُحَمَّد»، «اَوَّل»، «حَتّی»، «مُعَلِّم». بی تشدید حرف یک بار ' +
  'خوانده می‌شود و واژه واژهٔ دیگری می‌شود.',

  'همزه و الفِ میانی: «مسئله/مَسئَله»، «مؤثر»، «رأی»، «جزئی». و «هٔ» را ' +
  'هرگز به «ه» ساده نکن — کسرهٔ اضافه با آن می‌رود.',

  'وامواژه و نامِ خاص: «اُکسیژِن»، «اِنرژی»، «اِسرائیل»، «ژِنِو». مدل ' +
  'اینها را با آهنگِ عربی می‌خواند مگر اعرابشان بگذاری.',

  'عبارت‌بندی — و این همان چیزی است که با اعراب درست نمی‌شود. اگر جمله بلند ' +
  'است و مدل واژه‌به‌واژه می‌خوانَدش، با ویرگول گروه‌بندی‌اش کن؛ برای مکثِ ' +
  'بلندتر یا جملهٔ ناتمام «…»؛ برای جملهٔ معترضه «—» دو طرفش. ویرگول را ' +
  'آنجا بگذار که نفس گرفته می‌شود، نه هر چند واژه یک‌بار.',

  'تکیهٔ واژه نسبت به واژهٔ بعد. جایی که دو واژه یک واحدِ آهنگی‌اند ' +
  '(«همینْ حالا»، «هیچ‌کس»، «به‌هیچ‌وجه») نباید بینشان مکث بیفتد. ' +
  'ابزارت اینجا سکون و کسرهٔ پیوند است، **نه نیم‌فاصله**: نیم‌فاصله املای ' +
  'واژه است و املا را عوض نمی‌کنی. ویرگول را هم بینشان نگذار — ویرگول ' +
  'دقیقاً همان مکثی را می‌سازد که نمی‌خواهی.'
];

/** متنِ قاعده‌ها برای پرامپت — یک بار ساخته می‌شود، دو جا مصرف. */
function speakTrapText_() {
  var L = [];
  for (var i = 0; i < SPEAK_TRAPS.length; i++) L.push('- ' + SPEAK_TRAPS[i]);
  return L.join('\n');
}

/** امضای یک متن، برای اینکه نسخهٔ صوتی به متنِ عوض‌شده نچسبد. */
function speakHash_(t) {
  var s = speakCmp_(t), h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36) + ':' + s.length;
}

/**
 * جمله‌های یک متن، بر پایهٔ نشانه‌های پایانِ جمله. یک نسخه، چند مصرف.
 *
 * ══ «…» مرزِ جمله نیست (اصلاحِ ۶٫۳۰) ══
 * `speakBone_` سه‌نقطه را جزوِ نشانه‌های *عبارت‌بندی* می‌داند و در مقایسه
 * برمی‌داردش — یعنی مدل حق دارد اضافه‌اش کند. و پرامپت هم صریح یادش می‌دهد:
 * «برای مکثِ بلندتر یا جملهٔ ناتمام «…»».
 *
 * ولی این تابع سه‌نقطه را مرزِ جمله می‌شمرد. نتیجه‌اش تا ۶٫۲۹: هر متنی که
 * مدل در آن یک «…» می‌گذاشت، در نسخهٔ علامت‌دار یک جملهٔ بیشتر داشت،
 * `speakPair_` شمارها را ناهم‌خوان می‌دید و کلِ متن را **یکجا** به بازبین
 * می‌داد. یعنی همان مسیرِ جمله‌به‌جملهٔ تازه‌ساخته، دوباره مرده — و بی هیچ
 * خطایی، چون سقوط به «یکجا» یک رفتارِ مجازِ اعلام‌شده است.
 *
 * دو تعریف از «مرزِ جمله» در یک فایل یعنی روزی یکی‌شان بی‌صدا برنده می‌شود.
 * تعریف یکی است: `.!؟?` مرز است، `،؛:—–…` عبارت‌بندی.
 */
function speakSentences_(text) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  var parts = [], buf = '';
  for (var i = 0; i < t.length; i++) {
    buf += t.charAt(i);
    if ('.!؟?'.indexOf(t.charAt(i)) !== -1 &&
        (i + 1 >= t.length || t.charAt(i + 1) === ' ')) { parts.push(buf.trim()); buf = ''; }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/** بریدنِ متن به تکه‌های جمله‌مرزِ حداکثر n نویسه‌ای، برای اعراب‌گذاریِ تکه‌تکه. */
function speakPieces_(text, cap) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  if (t.length <= cap) return [t];
  var out = [], cur = '';
  var parts = speakSentences_(t);
  for (var j = 0; j < parts.length; j++) {
    var s = parts[j];
    if (!s) continue;
    if (cur && (cur + ' ' + s).length > cap) { out.push(cur); cur = s; }
    else cur = cur ? cur + ' ' + s : s;
    while (cur.length > cap) {                       // جملهٔ غول‌آسا: روی فاصله ببُر
      var cut = cur.lastIndexOf(' ', cap);
      if (cut < cap * 0.5) cut = cap;
      out.push(cur.slice(0, cut).trim());
      cur = cur.slice(cut).trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * اعراب‌گذاریِ یک تکه با مدل. برمی‌گرداند متنِ اعراب‌دار یا '' (شکست).
 * قاعدهٔ سختِ پرامپت: «هیچ چیزی جز افزودنِ اعراب». نتیجه همین‌جا وارسی
 * می‌شود؛ اگر مدل واژه‌ای را عوض کرده باشد، جواب دور انداخته می‌شود.
 */
function vowelizePiece_(piece) {
  var marks = CFG.SPEAK_MARKS !== false;
  var prompt =
    'کارِ تو: اعراب‌گذاریِ کامل و نشانه‌گذاریِ آواییِ این متن.\n' +
    'این متن قرار است به یک مدلِ گفتارساز داده شود تا با صدای بلند خوانده شود. ' +
    'باید طوری علامت‌گذاری‌اش کنی که هیچ واژه‌ای غلط خوانده نشود ' +
    'و جمله‌ها روان و عبارت‌به‌عبارت خوانده شوند — نه واژه‌به‌واژه.\n' +
    'ابزارهایت:\n' +
    '۱) اعراب: فتحه، کسره، ضمه، سکون و تشدید بر پایهٔ تلفظِ فارسیِ معیارِ ایران ' +
    '(لهجهٔ تهرانی). روی *همهٔ* حروف، نه فقط واژه‌های سخت.\n' +
    '۲) و بس. نیم‌فاصله‌ها را **همان‌طور که هست** بگذار و باش: نه یکی اضافه کن، ' +
    'نه یکی کم. نیم‌فاصلهٔ نابه‌جا وسطِ یک واژه، آن واژه را دوتکه می‌کند و ' +
    'بدتر از نبودِ اعراب است.\n' +
    (marks
      ? '۳) نشانه‌گذاری برای عبارت‌بندی: می‌توانی «،» و «…» و «—» و «:» بیفزایی یا ' +
        'برداری تا مکث‌ها سرِ جای درست بیفتد.\n'
      : '۳) نشانه‌گذاری و فاصله‌ها را هم دست نزن — نه ویرگولی اضافه کن، نه کم.\n') +
    'دام‌هایی که باید بگردی و ببندی:\n' + speakTrapText_() + '\n' +
    'قاعدهٔ سخت: هیچ واژه‌ای را اضافه، کم، جابه‌جا یا اصلاح نکن. ' +
    'هیچ عدد یا نامی را عوض نکن. ' +
    (marks ? 'مرزِ جمله‌ها را هم دست نزن: نقطه و علامتِ پرسش و تعجب همان‌جا بمانند. '
           : 'فاصله‌ها و نشانه‌ها همان بمانند. ') +
    'خروجی فقط خودِ متنِ علامت‌گذاری‌شده در فیلد v.\n\n' + piece;
  try {
    var r = geminiText_(prompt, SPEAK_SCHEMA, 8192);
    // تعمیرِ نیم‌فاصله *پیش از* سد، نه بعدش: عیبی که قابلِ تعمیر است نباید
    // به قیمتِ افتادنِ کلِ اعرابِ این بخش تمام شود (۶٫۲۹).
    var v = speakZwnjFix_(piece, r && r.v ? String(r.v) : '');
    if (verifySpeak_(piece, v) && speakVowelledOk_(piece, v)) return v;
    // یک تلاشِ دوم با دمای صفر ذهنی: همان پرامپت، شاید ایندفعه وفادار بماند
    r = geminiText_(prompt + '\n\nیادآوری: خروجی باید واژه‌به‌واژه همین متن باشد، فقط با اعراب و نشانه.',
                    SPEAK_SCHEMA, 8192);
    v = speakZwnjFix_(piece, r && r.v ? String(r.v) : '');
    if (verifySpeak_(piece, v) && speakVowelledOk_(piece, v)) return v;
  } catch (e) {}
  return '';
}

// --------------------------------------------------- بازبینیِ دومِ متنِ صوتی

/**
 * ══ چرا یک پاسِ دوم، و چرا «دقایقی بعد» ══
 * خواستهٔ کاربر عیناً: «بعد از یک بار نوشته حتماً دقایقی بعدش مجدد بررسی بشه
 * ببینه درست نوشته شده همه چیز تا اگر لازم شد اصلاح بشه … این بررسی مجدد
 * خیلی مهمه». و دلیلِ فنی‌اش از خودِ خواسته هم قوی‌تر است:
 *
 * تا ۶٫۱۹ هیچ سدی معنایی نبود. verifySpeak_ می‌گوید «همان واژه‌هاست»،
 * speakVowelledOk_ می‌گوید «نشانه کم نیست». هیچ‌کدام نمی‌گویند «نشانه‌ها
 * درست‌اند». «بایستیم» با فتحه روی ب از هر دو رد می‌شود — و در گوش «با» است.
 *
 * نوشتن و بازبینی دو فراخوانِ جدا با دو کارِ جدایند: اولی می‌نویسد، دومی
 * *قضاوت* می‌کند. یک فراخوان که هم بنویسد هم قضاوت کند، جوابِ خودش را
 * تأیید می‌کند — و همان است که سه نسخه پیاپی «درست شد» گفت و نشده بود.
 */
var SPEAK_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    v: { type: 'string' },      // متنِ اصلاح‌شده (کاملِ همان تکه)
    n: { type: 'string' },      // چند مورد اصلاح شد
    note: { type: 'string' },   // یک سطر: چه چیزی غلط بود
    hard: { type: 'string' }    // «واژه => املای آوایی» در سطرهای جدا
  },
  required: ['v']
};

/**
 * بازبینیِ یک تکه. برمی‌گرداند { t, n, note, hard } یا null (بی‌تغییر/ناموفق).
 * متنِ ساده هم داده می‌شود، چون بازبین باید بتواند بگوید «این اعراب با آن
 * واژه نمی‌خوانَد» — با دیدنِ فقط نسخهٔ اعراب‌دار، غلط را طبیعی می‌بیند.
 */
function speakReviewPiece_(plain, vowelled) {
  var prompt =
    'کارِ تو: بازبینیِ نشانه‌گذاریِ متنِ صوتی.\n' +
    'دو متن می‌بینی: «اصل» و «علامت‌گذاری‌شده». دومی قرار است به یک گفتارساز ' +
    'داده شود. کارِ تو نوشتنِ دوباره نیست — *بازبینی* است: بگرد دنبالِ جایی که ' +
    'علامت‌گذاری غلط است یا نیست و باید باشد، و همان‌جا را درست کن.\n\n' +
    'مخصوصاً این دام‌ها را وارسی کن:\n' + speakTrapText_() + '\n\n' +
    'واژه‌ها، فاصله‌ها و نیم‌فاصله‌ها را دست نزن — نیم‌فاصله املای واژه است و ' +
    'اگر تغییرش بدهی تعمیر می‌شود، پس بی‌فایده است. ابزارِ تو اعراب است و ' +
    '(اگر لازم بود) ویرگول و سه‌نقطه و خط‌تیره برای عبارت‌بندی. ' +
    'همچنین: هر جا که با اعرابِ درست هم باز خوانشِ غلط محتمل است، در فیلد hard ' +
    'سطری به شکلِ «واژه => املای آوایی» بنویس (مثال: «بایستیم => بِ‌ایستیم»). ' +
    'حروفِ املای آوایی باید همان حروفِ واژه باشد؛ فقط اعراب و فاصله و ' +
    'نیم‌فاصله فرق کند.\n\n' +
    'قاعدهٔ سخت: واژه‌ها و عددها و مرزِ جمله‌ها عوض نمی‌شوند. اگر چیزی برای ' +
    'اصلاح نبود، همان متنِ علامت‌گذاری‌شده را بی‌تغییر در v برگردان و n را «۰» بگذار.\n\n' +
    '── اصل ──\n' + plain + '\n\n── علامت‌گذاری‌شده ──\n' + vowelled;
  try {
    var r = geminiText_(prompt, SPEAK_REVIEW_SCHEMA, 8192);
    if (!r) return null;
    var v = speakZwnjFix_(plain, r.v ? String(r.v) : '');
    if (!v) return null;
    // همان دو سدِ همیشگی روی خروجیِ بازبین هم — بازبین هم یک مدل است.
    if (!verifySpeak_(plain, v) || !speakVowelledOk_(plain, v)) return null;
    var changed = speakCmp_(v) !== speakCmp_(vowelled) || v !== vowelled;
    return { t: v, changed: changed, n: String(r.n || ''),
             note: String(r.note || ''), hard: String(r.hard || '') };
  } catch (e) { return null; }
}

/**
 * جفت‌کردنِ متنِ ساده و متنِ علامت‌گذاری‌شده، جمله‌به‌جمله.
 *
 * ══ چرا بریدنِ جداگانه جواب نمی‌داد ══
 * نسخهٔ اول هر متن را جداگانه با speakPieces_ می‌بُرید و اگر شمارِ تکه‌ها
 * یکی نبود، کلِ متن را یکجا می‌فرستاد. اندازه‌گیریِ واقعی نشان داد اعراب
 * متن را **۱٫۷۵ برابر** می‌کند، پس شمارِ تکه‌ها تقریباً *هرگز* یکی
 * نمی‌شد: مسیرِ تکه‌تکه کدِ مرده بود و هر بازبینی یکجا می‌رفت — درست همان
 * شکلی که این ریپو هفت بار دیده («تحلیلی نوشته شد و به تصمیمی وصل نشد»)،
 * این بار در کدِ تازهٔ خودم.
 *
 * جمله مرزِ مشترکِ دو متن است: speakBone_ نقطه و پرسش و تعجب را نگه
 * می‌دارد و verifySpeak_ هنگام ذخیرهٔ متن همین را تضمین کرده. پس شمارِ
 * جمله‌ها یکی است و جفت‌کردن روی همان انجام می‌شود؛ گروه‌بندی هم بر پایهٔ
 * طولِ نسخهٔ *اعراب‌دار* است، چون همان است که باید در خروجیِ مدل جا شود.
 */
function speakPair_(plain, vowelled, cap) {
  var ps = speakSentences_(plain), vs = speakSentences_(vowelled);
  // شمارِ جمله‌ها که نخواند، یعنی فرضِ بالا برقرار نیست — یکجا، و صادقانه.
  if (!ps.length || ps.length !== vs.length) return [[plain, vowelled]];
  var out = [], curP = '', curV = '';
  for (var i = 0; i < ps.length; i++) {
    if (curV && (curV.length + vs[i].length + 1) > cap) {
      out.push([curP, curV]); curP = ''; curV = '';
    }
    curP = curP ? curP + ' ' + ps[i] : ps[i];
    curV = curV ? curV + ' ' + vs[i] : vs[i];
  }
  if (curV) out.push([curP, curV]);
  return out;
}

/** بازبینیِ یک متنِ کامل، تکه‌تکه. برمی‌گرداند { t, fixed, notes, hard }. */
function speakReviewText_(plain, vowelled) {
  var pairs = speakPair_(plain, vowelled, 2200);
  var pp = [], vp = [];
  for (var k = 0; k < pairs.length; k++) { pp.push(pairs[k][0]); vp.push(pairs[k][1]); }
  var out = [], fixed = 0, notes = [], hard = [];
  for (var i = 0; i < pp.length; i++) {
    var r = speakReviewPiece_(pp[i], vp[i]);
    if (!r) { out.push(vp[i]); continue; }
    out.push(r.t);
    if (r.changed) {
      fixed++;
      if (r.note) notes.push(r.note.replace(/\s+/g, ' ').trim().slice(0, 160));
    }
    if (r.hard) hard.push(r.hard);
  }
  return { t: out.join(' '), fixed: fixed, notes: notes, hard: hard.join('\n') };
}

/**
 * «واژه => املای آوایی» را به سطرهای امن تبدیل می‌کند.
 *
 * تنها سدِ اینجا این است: حروفِ جایگزین باید *دقیقاً* حروفِ واژه باشد. تبِ
 * تلفظ پس از وارسی اعمال می‌شود — یعنی هرچه اینجا برود، دیگر هیچ سدی
 * ندارد و برای همیشه روی هر قسمت می‌نشیند. یک سطرِ غلطِ خودکار بدتر از
 * نبودنِ سطر است، پس جایگزینی که *واژهٔ دیگری* باشد رد می‌شود.
 */
function speakHardRows_(hard, cap) {
  var lines = String(hard || '').split(/[\n\r]+/);
  var out = [], seen = {};
  for (var i = 0; i < lines.length && out.length < cap; i++) {
    var m = lines[i].split(/=>|<=|→|—>/);
    if (m.length < 2) continue;
    var a = m[0].replace(/^[\s«"'\-•*]+|[\s»"']+$/g, '').trim();
    var b = m[1].replace(/^[\s«"'\-•*]+|[\s»"']+$/g, '').trim();
    if (!a || !b || a === b) continue;
    if (a.length > 40 || b.length > 60) continue;
    if (speakLetters_(a) !== speakLetters_(b)) continue;   // همان واژه، نه واژهٔ دیگر
    if (!speakLetters_(a)) continue;
    /* ══ سدِ دوم، و مهم‌ترینِ این تابع: تفاوت باید *ساختاری* باشد ══
     *
     * تبِ تلفظ **پس از** وارسی اعمال می‌شود و جهانی و همیشگی است: هرچه
     * اینجا برود، در هر قسمتِ آینده روی هر جمله‌ای می‌نشیند و هیچ سدی
     * پشتش نیست. پس سطری که تفاوتش «فقط اعراب» باشد دو عیب دارد:
     *
     *   • بی‌مصرف است — لایهٔ اعراب‌گذاری همان کار را با دیدنِ *جمله*
     *     انجام می‌دهد، و درست‌تر.
     *   • خطرناک است — «مرد => مَرد» درست به‌نظر می‌رسد و «پدربزرگم پارسال
     *     مُرد» را برای همیشه «مَرد» می‌خوانَد. همین‌طور «کرم»، «گل»،
     *     «ملک»، «شکر». هم‌نگاشت را باید در جمله حل کرد، نه در جدول.
     *
     * آنچه اعراب *نمی‌تواند* حل کند، همان چیزی است که این سطرها برایش‌اند:
     * چسبیدنِ حروف («بایستیم» ← «بِ‌ایستیم»). یعنی جایگزینِ درست همیشه یک
     * نیم‌فاصله یا فاصلهٔ تازه دارد. اگر ندارد، اینجا جایش نیست.
     * (سطرِ دستیِ آدم از این سد رد نمی‌شود؛ فقط سطرِ خودکار.) */
    if (stripTashkil_(a) === stripTashkil_(b)) continue;
    // و واژهٔ کوتاه، واژهٔ پرکاربرد است: «را»، «گل»، «بد». خطرِ یک سطرِ
    // جهانی روی آن‌ها بیش از سودش است، و این دسته همیشه فعل است و بلند.
    if (speakLetters_(a).length < 4) continue;
    if (seen[a]) continue;
    seen[a] = 1;
    out.push([a, b]);
  }
  return out;
}

/**
 * افزودنِ سطرهای آموخته به تبِ «تلفظ» — فقط افزودن.
 *
 * سطرِ آدمی هرگز بازنویسی نمی‌شود و واژه‌ای که از قبل هست دوباره نوشته
 * نمی‌شود؛ همان قاعده‌ای که اسکنِ موسیقی دربارهٔ ستون‌های سلیقهٔ کاربر دارد.
 * ستونِ چهارم می‌گوید این سطر را آدم ننوشته — «حدس» و «تصمیم» نباید یک شکل
 * دیده شوند.
 */
function speakLearn_(rows, epLabel) {
  if (!rows || !rows.length || CFG.SPEAK_LEARN === false) return 0;
  try {
    var sh = getHub_().getSheetByName(CFG.TAB_PRON);
    if (!sh) return 0;
    var have = {}, last = sh.getLastRow();
    if (last > 1) {
      var cur = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = 0; i < cur.length; i++) {
        var k = pronStrip_(String(cur[i][0] || '').trim()).text;
        if (k) have[k] = 1;
      }
    }
    var add = [];
    for (var j = 0; j < rows.length; j++) {
      var key = pronStrip_(rows[j][0]).text;
      if (!key || have[key]) continue;
      have[key] = 1;
      add.push([rows[j][0], rows[j][1], 'بله',
                'خودکار — بازبینیِ ' + epLabel + ' — ' + nowStr_()]);
    }
    if (!add.length) return 0;
    if (!String(sh.getRange(1, 4).getValue() || '').trim()) {
      sh.getRange(1, 4).setValue('منبعِ سطر');
    }
    sh.getRange(sh.getLastRow() + 1, 1, add.length, 4).setValues(add);
    _pronCache = null;                 // ← وگرنه همین قسمت از آموخته‌اش بی‌بهره می‌ماند
    return add.length;
  } catch (e) {
    logLine_('افزودنِ واژه‌های آموخته به تبِ تلفظ ناموفق: ' + e.message);
    return 0;
  }
}

/**
 * مرحلهٔ بازبینی: روی بخش‌هایی که متنِ اعراب‌دار گرفته‌اند، یک بار و فقط یک بار.
 * `r:1` روی هر بخش می‌نشیند تا اجرای بعدی دوباره‌کاری نکند.
 */
function speakReview_(ep, segs, deadline, persist, epLabel) {
  if (CFG.SPEAK_REVIEW === false || CFG.TASHKIL_ENABLED === false) {
    return { done: true, seen: 0, fixed: 0, learned: 0 };
  }
  var seen = 0, fixed = 0, notes = [], hardAll = [], touched = 0;
  var cap = Number(CFG.SPEAK_REVIEW_MAX) || 14;
  for (var i = 0; i < segs.length && seen < cap; i++) {
    var plain = speakSanitize_(String(segs[i].text || ''));
    if (!plain.trim()) continue;
    var e = ep.__speakSegs && ep.__speakSegs[i];
    if (!e || !e.t || e.h !== speakHash_(plain)) continue;   // بی‌اعراب یا کهنه
    if (e.r) continue;                                        // بازبینی‌شده
    if (touched > 0 && new Date().getTime() > deadline - 40000) {
      try { persist(); } catch (eP) {}
      return { done: false, seen: seen, fixed: fixed, learned: 0 };
    }
    touched++; seen++;
    var r = speakReviewText_(plain, e.t);
    if (r && r.t) {
      e.t = r.t;
      if (r.fixed) { fixed += r.fixed; notes = notes.concat(r.notes); }
      if (r.hard) hardAll.push(r.hard);
    }
    e.r = 1;
    try { persist(); } catch (eP2) {}
  }
  var learned = speakLearn_(speakHardRows_(hardAll.join('\n'),
                                           Number(CFG.SPEAK_LEARN_MAX) || 6), epLabel);
  speakRevLog_(epLabel, seen, fixed, learned, notes);
  return { done: true, seen: seen, fixed: fixed, learned: learned, notes: notes };
}

/**
 * کارنامهٔ بازبینی — ده قسمتِ آخر.
 *
 * بی این، «بازبینی اجرا شد و ایرادی نبود» از «بازبینی هرگز اجرا نشد» قابلِ
 * تشخیص نبود. این ریپو هفت بار همین شکل را دیده: تحلیلی نوشته شد و هیچ
 * تصمیمی به آن وصل نشد. اینجا تصمیمْ هشدارِ speakReviewStatus_ است.
 */
function speakRevLog_(epLabel, seen, fixed, learned, notes) {
  try {
    var raw = props_().getProperty(PK.SPEAK_REV);
    var L = raw ? JSON.parse(raw) : [];
    if (!(L instanceof Array)) L = [];
    L.unshift({ at: new Date().toISOString(), ep: String(epLabel || ''),
                seen: seen, fixed: fixed, learned: learned,
                why: (notes || []).slice(0, 3) });
    props_().setProperty(PK.SPEAK_REV, JSON.stringify(L.slice(0, 10)));
  } catch (e) {}
}

/** یک سطرِ فارسیِ آماده دربارهٔ بازبینی — هر روز، حتی وقتی همه‌چیز خوب است. */
/**
 * ══ «چند بخش بی‌اعراب خوانده شد» را کسی نمی‌پرسید (۶٫۲۹) ══
 *
 * `__speakFails` از همان اول روی پرونده نوشته می‌شد و `skip:true` روی هر
 * بخشی که دو بار شکست خورده بود. هر دو درست کار می‌کردند و هیچ‌کدام به هیچ
 * تصمیمی وصل نبودند: نه خطی در ایمیل، نه یافته‌ای در صف، نه حتی یک سطر در
 * سیاهه. قسمت ۱۹ با ۶۲٪ بخشِ بی‌اعراب منتشر شد و تنها کسی که فهمید، شنونده
 * بود — که همان صاحبِ برنامه است.
 *
 * این هشتمین بار در این ریپوست که تحلیلی نوشته شده و به تصمیمی وصل نشده.
 * پس اینجا سه کار می‌شود: ثبت در کارنامه، یک خط در گزارشِ روزانه (حتی وقتی
 * همه‌چیز خوب است)، و یافتهٔ «جدی» وقتی نسبت از یک سومِ بخش‌ها بگذرد.
 *
 * چرا یک سوم و نه «هر شکستی»: یک بخشِ شکست‌خورده در قسمتی که مدل یک بار
 * قطع شده طبیعی است و هشدارِ هر شب همان هشداری است که خوانده نمی‌شود.
 */
function speakSkipRecord_(ep, label, hub, epNum) {
  try {
    var S = (ep && ep.__speakSegs) || [];
    var total = 0, skipped = 0;
    for (var i = 0; i < S.length; i++) {
      if (!S[i] || !S[i].h) continue;
      total++;
      if (!S[i].t) skipped++;          // skip:true یا تلاشِ ناتمام — هر دو بی‌اعراب خوانده شدند
    }
    if (!total) return null;
    var rec = { at: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'),
                l: String(label || ''), n: total, s: skipped,
                f: Number(ep && ep.__speakFails) || 0 };
    var raw = props_().getProperty(PK.SPEAK_SKIP);
    var L = [];
    try { L = raw ? JSON.parse(raw) : []; } catch (eJ) { L = []; }
    if (!(L instanceof Array)) L = [];
    L.push(rec);
    while (L.length > 10) L.shift();
    props_().setProperty(PK.SPEAK_SKIP, JSON.stringify(L));

    if (skipped) {
      logLine_(label + ': ' + skipped + ' بخش از ' + total + ' بی‌اعراب خوانده شد.');
    }
    /* ══ کدام شکست «ایرادِ کد» است و کدام نیست ══
     * شکستِ *همهٔ* بخش‌ها یعنی اعراب‌گذار اصلاً در دسترس نبوده (سهمیه، قطعی،
     * مدارشکنِ خودِ speakStep_). آن مشکلِ دسترسی است و صاحبِ هشدارش
     * `modelStatus_` است، نه صفِ کد.
     * شکستِ *بخشی* داستانِ دیگری است و دقیقاً همان چیزی که ۶٫۲۶ ساخت: مدل
     * کار می‌کند، چند بخش می‌گیرد و چند بخش را سد دور می‌ریزد. این ایرادِ
     * کد است و باید در صفِ کد بنشیند.
     * هشداری که برای هر دو حالت یک صدا داشته باشد، همان هشداری است که
     * خوانده نمی‌شود. */
    if (hub && skipped && skipped < total && skipped * 3 > total) {
      logSelfFinding_(hub, {
        priority: 'جدی', category: 'تلفظ', key: 'speak-skipped',
        title: 'بخشِ بزرگی از قسمت بی‌اعراب خوانده شد',
        detail: label + ': ' + skipped + ' بخش از ' + total +
                ' اعراب نگرفت (' + rec.f + ' شکستِ اعراب‌گذاری). ' +
                'یعنی آن بخش‌ها با متنِ خام به گفتارساز رفتند.',
        instruction: 'علتِ ردّ شدنِ خروجیِ اعراب‌گذار را پیدا کن: یا پرامپت چیزی ' +
                     'می‌خواهد که سدِ وارسی نمی‌پذیرد، یا مدل در دسترس نیست. ' +
                     'وارسی نباید برای عیبی که تعمیرپذیر است کلِ بخش را دور بیندازد.',
        owner: 'کد', episode: epNum || 0
      });
    }
    return rec;
  } catch (e) { return null; }
}

/** خطِ روزانهٔ «چند بخش بی‌اعراب رفت» — حتی وقتی صفر است. */
function speakSkipStatus_() {
  var out = { line: '', ok: true, eps: 0, segs: 0, skipped: 0 };
  try {
    var raw = props_().getProperty(PK.SPEAK_SKIP);
    var L = raw ? JSON.parse(raw) : [];
    if (!(L instanceof Array) || !L.length) {
      out.line = 'اعراب‌گذاری: هنوز هیچ قسمتی ثبت نشده.';
      return out;
    }
    for (var i = 0; i < L.length; i++) {
      out.eps++; out.segs += Number(L[i].n) || 0; out.skipped += Number(L[i].s) || 0;
    }
    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (x) { return String(n); } };
    var pct = out.segs ? Math.round(out.skipped * 100 / out.segs) : 0;
    out.line = 'اعراب‌گذاری: در ' + fa(out.eps) + ' قسمتِ اخیر، ' + fa(out.skipped) +
               ' بخش از ' + fa(out.segs) + ' بی‌اعراب خوانده شد (' + fa(pct) + '٪).';
    // همان مرزِ speakSkipRecord_: «هیچ بخشی نگرفت» مسئلهٔ دسترسی است،
    // «بعضی گرفتند و بعضی نه» مسئلهٔ سد است. سه قسمتِ پیاپیِ کاملاً بی‌اعراب
    // دیگر بی‌صدا نمی‌ماند، ولی یکی دو تا هنوز یادداشت است نه هشدار.
    var okSegs = out.segs - out.skipped;
    if (pct >= 20 && okSegs > 0) {
      out.ok = false;
      out.line += ' این نسبت بالاست — سدِ وارسی دارد کارِ اعراب‌گذار را دور می‌ریزد.';
    } else if (!okSegs && out.eps >= 3) {
      out.ok = false;
      out.line += ' هیچ بخشی اعراب نگرفت — اعراب‌گذار در دسترس نبوده است.';
    } else if (!okSegs) {
      out.line += ' (اعراب‌گذار در این قسمت‌ها در دسترس نبوده)';
    }
  } catch (e) {}
  return out;
}

function speakReviewStatus_() {
  var out = { line: '', ok: true, runs: 0, fixed: 0, learned: 0 };
  try {
    var raw = props_().getProperty(PK.SPEAK_REV);
    var L = raw ? JSON.parse(raw) : [];
    if (!(L instanceof Array) || !L.length) {
      out.line = 'بازبینیِ متنِ صوتی: هنوز هیچ قسمتی بازبینی نشده.';
      return out;
    }
    var seen = 0;
    for (var i = 0; i < L.length; i++) {
      out.runs++; seen += Number(L[i].seen) || 0;
      out.fixed += Number(L[i].fixed) || 0;
      out.learned += Number(L[i].learned) || 0;
    }
    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (x) { return String(n); } };
    out.line = 'بازبینیِ متنِ صوتی: ' + fa(out.runs) + ' قسمتِ اخیر، ' + fa(seen) +
               ' بخش وارسی شد، ' + fa(out.fixed) + ' مورد اصلاح' +
               (out.learned ? '، ' + fa(out.learned) + ' واژه به تبِ تلفظ افزوده شد' : '') + '.';
    // «هیچ‌وقت هیچ ایرادی پیدا نمی‌کند» یعنی یا بازبین کار نمی‌کند یا سدِ
    // وارسی همیشه جوابش را دور می‌ریزد. هر دو خرابی‌اند، فقط بی‌صدا.
    if (out.runs >= 5 && out.fixed === 0) {
      out.ok = false;
      out.line += ' هیچ اصلاحی در پنج قسمتِ اخیر ثبت نشده — بازبینی احتمالاً بی‌اثر است.';
    }
  } catch (e) {}
  return out;
}

/** اعراب‌گذاریِ یک متنِ کامل (چندجمله‌ای)، تکه‌تکه و با وارسی. '' یعنی نشد. */
function vowelizeText_(text) {
  var pieces = speakPieces_(text, 1500);
  if (!pieces.length) return '';
  var out = [];
  for (var i = 0; i < pieces.length; i++) {
    var v = vowelizePiece_(pieces[i]);
    if (!v) return '';
    out.push(v);
  }
  return out.join(' ');
}

/**
 * مرحلهٔ «متنِ صوتی»: برای هر بخشِ گفتنیِ قسمت، نسخهٔ اعراب‌دار آماده می‌شود.
 *
 * ep.__speakSegs آرایه‌ای هم‌ترازِ بخش‌هاست: { h: امضای متنِ ساده, t: اعراب‌دار }.
 * اول پیشنهادِ Cowork (ep.__ctashkil، از پاسخِ غنی‌سازی) وارسی می‌شود؛ اگر
 * نبود یا وارسی نشد، مدل خودش اعراب می‌گذارد. هر بخش که تمام شد ذخیره
 * می‌شود تا اجرای قطع‌شده از همان‌جا ادامه بدهد.
 *
 * برمی‌گرداند: { done, did, failed } — done=false یعنی وقت تمام شد، ادامه در
 * اجرای بعد.
 */
function speakStep_(ep, segs, deadline, persist) {
  if (CFG.TASHKIL_ENABLED === false) return { done: true, did: 0, failed: 0 };
  if (!ep.__speakSegs) ep.__speakSegs = [];
  var ct = ep.__ctashkil || null;
  var did = 0, failed = 0, touched = 0;
  // شمارِ بخش‌هایی که تا حالا موفق اعراب گرفته‌اند — برای مدارشکن
  var okSoFar = 0;
  for (var c0 = 0; c0 < ep.__speakSegs.length; c0++) {
    if (ep.__speakSegs[c0] && ep.__speakSegs[c0].t) okSoFar++;
  }
  for (var i = 0; i < segs.length; i++) {
    // پاک‌سازی «پیش» از اعراب‌گذاری. اگر بعدش باشد، اعرابِ نشسته وسطِ
    // «فایلِ» قاعدهٔ واژه+شناسه را کور می‌کرد و شناسه از سدِ دوم هم — اگر
    // کوتاه بود — رد می‌شد و به گوش می‌رسید؛ ضمناً شناسه‌ها بی‌جهت به
    // اعراب‌گذار هم فرستاده می‌شدند.
    var plain = speakSanitize_(String(segs[i].text || ''));
    if (!plain.trim()) continue;
    var h = speakHash_(plain);
    var have = ep.__speakSegs[i];
    if (have && have.h === h && (have.t || have.skip)) continue;
    // دستِ‌کم یک بخش در هر اجرا پیش می‌رود، هر قدر هم وقت کم باشد؛ وگرنه
    // اجرایی که همیشه با وقتِ کم می‌رسد، این مرحله را تا ابد می‌چرخاند.
    if (touched > 0 && new Date().getTime() > deadline - 40000) {
      try { persist(); } catch (eP) {}
      return { done: false, did: did, failed: failed };
    }
    touched++;
    var v = '';
    // ── پیشنهادِ Cowork — با وارسی، هرگز به اعتماد ──
    if (ct) {
      var cand = '';
      if (segs[i].kind === 'hook' && ct.hook) cand = String(ct.hook);
      else if (segs[i].kind === 'outro' && ct.outro) cand = String(ct.outro);
      else if (segs[i].tone === 'مرور' && ct.recap) cand = String(ct.recap);
      else if (segs[i].secIndex !== undefined && ct.sections &&
               ct.sections[String(segs[i].secIndex)] !== undefined) {
        cand = String(ct.sections[String(segs[i].secIndex)]);
      }
      if (cand) cand = speakSanitize_(cand);
      if (cand && verifySpeak_(plain, cand) && speakVowelledOk_(plain, cand)) v = cand;
    }
    // ── حتی متنی که از قبل اعراب‌دار به نظر می‌رسد دوباره ساخته می‌شود ──
    // «اعراب‌دار بودن» دلیلِ «درست بودن» نیست؛ قاعدهٔ کاربر صریح است.
    if (!v) v = vowelizeText_(plain);
    if (v) { ep.__speakSegs[i] = { h: h, t: v }; did++; okSoFar++; }
    else {
      // دو بارِ پیاپی شکست یعنی بس است؛ این بخش با متنِ ساده خوانده می‌شود
      var tries = (have && have.h === h ? Number(have.tries) || 0 : 0) + 1;
      if (tries >= 2) ep.__speakSegs[i] = { h: h, skip: true };
      else ep.__speakSegs[i] = { h: h, tries: tries };
      failed++;
      // ── مدارشکن ──
      // سه شکست بی حتی یک موفقیت یعنی مدلِ اعراب‌گذاری الان در دسترس نیست
      // (سهمیه، قطعی، حسابِ محدود). ادامه‌دادن فقط فراخوان می‌سوزاند و
      // پادکست را عقب می‌اندازد؛ بقیهٔ بخش‌ها با متنِ ساده می‌روند.
      ep.__speakFails = (Number(ep.__speakFails) || 0) + 1;
      if (!okSoFar && !did && ep.__speakFails >= 3) {
        for (var z = 0; z < segs.length; z++) {
          var pz = String(segs[z].text || '');
          if (!pz.trim()) continue;
          var hz = speakHash_(pz);
          var ez = ep.__speakSegs[z];
          if (!(ez && ez.h === hz && ez.t)) ep.__speakSegs[z] = { h: hz, skip: true };
        }
        try { persist(); } catch (eP3) {}
        logLine_('اعراب‌گذاری فعلاً در دسترس نیست (سه شکستِ پیاپی)؛ این قسمت با متنِ ساده خوانده می‌شود.');
        return { done: true, did: did, failed: failed, dead: true };
      }
    }
    try { persist(); } catch (eP2) {}
  }
  return { done: true, did: did, failed: failed };
}

/**
 * ══ رانشِ شمارِ تکه‌ها بینِ دو اجرا ══
 *
 * `renderAudioStep_` روی مرزِ شش‌دقیقه‌ای از سر گرفته می‌شود و هر بار
 * `buildChunks_` را از نو می‌سازد — ولی `synthesizeStep_` از `chunkIdx`ی
 * ادامه می‌دهد که در برابرِ آرایهٔ *قبلی* گرفته شده. اگر آرایه یک تکه کم یا
 * زیاد شود، هر تکه یک خانه می‌لغزد: تکه‌هایی جا می‌افتند و تکه‌هایی دوباره
 * خوانده می‌شوند. **هیچ خطایی نمی‌دهد و فقط شنیده می‌شود.**
 *
 * این ریپو یک بار این را با `musicWrap_` دیده و با کش‌کردنِ نقشه حلش کرده؛
 * عصری‌سازی هم از همان روز کش‌شده آمد. ولی هیچ‌وقت *سنجه‌ای* نداشت — و
 * راه‌های تازه‌ای هست که آرایه را عوض می‌کند: بازگشتِ کد به نسخه‌ای که
 * بخشِ ۲۹ را ندارد، پر شدنِ بانکِ موسیقی وسطِ قسمت، عوض‌شدنِ یک تنظیم.
 *
 * درمان همان کاری است که کد از قبل برای «اجرای کشته‌شده» می‌کند: از صفر
 * شروع کن. تکه‌های نیمه‌کاره را همان پاک‌سازیِ موجود می‌بَرد، چون شرطش
 * (`chunkIdx===0 && !files.length`) پس از این بازنشانی برقرار می‌شود.
 * بهایش چند فراخوانِ گفتارسازیِ دوباره است؛ بهای ندادنش، قسمتی است که
 * وسطش جمله جا افتاده و کسی هم نمی‌فهمد چرا.
 */
function chunkDriftReset_(st, chunks, label) {
  var was = Number(st.chunkTotal);
  var now = (chunks || []).length;
  if (!isFinite(was) || !was || was === now || !(Number(st.chunkIdx) > 0)) {
    st.chunkTotal = now;
    return false;
  }
  logLine_(label + ': شمارِ تکه‌های صوتی از ' + was + ' به ' + now +
           ' تغییر کرد وسطِ صداگذاری؛ برای جلوگیری از جابه‌جاییِ تکه‌ها، صدا از نو ساخته می‌شود.');
  try {
    logSelfFinding_(getHub_(), {
      priority: 'جدی', category: 'صداگذاری', key: 'chunk-drift',
      title: 'شمارِ تکه‌های صوتی وسطِ صداگذاری عوض شد — ' + label,
      detail: 'پیش از از سرگیری ' + was + ' تکه بود و پس از آن ' + now +
              '. اگر بی‌اعتنا ادامه می‌داد، هر تکه یک خانه می‌لغزید: جمله‌هایی ' +
              'جا می‌افتاد و جمله‌هایی دوباره خوانده می‌شد، بی هیچ خطایی.',
      instruction: 'هر چیزی که در buildChunks_/buildSpecialChunks_ سهم دارد باید ' +
                   'بینِ دو اجرا ثابت بماند — نقشه‌اش یک بار حساب و در پروندهٔ ' +
                   'قسمت ذخیره شود، نه اینکه هر بار از نو پرسیده شود.',
      owner: ROWNER_CODE
    });
  } catch (e) {}
  st.chunkIdx = 0;
  st.partNo = 1;
  st.files = [];
  st.chunkTotal = now;
  return true;
}

/** متنِ صوتیِ یک بخش: اعراب‌دارِ وارسی‌شده اگر هست، وگرنه همان متنِ ساده. */
function speakTextOf_(ep, segIdx, plain) {
  try {
    var e = ep && ep.__speakSegs && ep.__speakSegs[segIdx];
    if (e && e.t && e.h === speakHash_(plain)) return e.t;
  } catch (x) {}
  return plain;
}

/** فایلِ «متنِ صوتی» در پوشهٔ قسمت — همان که به گفتارساز داده می‌شود. */
function writeSpeakFile_(folder, baseName, ep, segs) {
  try {
    var L = [];
    for (var i = 0; i < segs.length; i++) {
      var t = speakTextOf_(ep, i, speakSanitize_(String(segs[i].text || '')));
      if (t.trim()) L.push(t);
    }
    if (!L.length) return null;
    var body = L.join('\n\n');
    var name = baseName + ' — متن صوتی (اعراب‌گذاری کامل).txt';
    var it = folder.getFilesByName(name);
    if (it.hasNext()) { var f = it.next(); f.setContent(body); return f; }
    return folder.createFile(Utilities.newBlob(body, 'text/plain', name));
  } catch (e) {
    logLine_('ذخیرهٔ متنِ صوتی ناموفق: ' + e.message);
    return null;
  }
}

/** آمارِ مرحلهٔ متنِ صوتی برای سیاهه. */
function speakStats_(ep, segs) {
  var ok = 0, plain = 0, rev = 0;
  for (var i = 0; i < segs.length; i++) {
    var e = ep.__speakSegs && ep.__speakSegs[i];
    if (e && e.t) { ok++; if (e.r) rev++; } else plain++;
  }
  return ok + ' بخش اعراب‌دار' + (plain ? '، ' + plain + ' بخش با متنِ ساده' : '') +
         (rev ? '، ' + rev + ' بخش بازبینی‌شده' : '');
}

// ------------------------------------------------- بخش‌بندی با لحنِ متناسب

/**
 * قسمت را به بخش‌هایی با «دستور اجرا»ی مخصوص خودش می‌شکند.
 * گوینده یکی است، ولی بخش علمی با بیان علمی و بخش احساسی با بیان احساسی خوانده می‌شود.
 * لحنِ پایه از دستهٔ قسمت می‌آید و لحنِ دقیق‌تر را نویسنده برای هر بخش تعیین کرده است.
 */
function episodeSegments_(ep, cat) {
  var base = TONE_BY_CAT[cat] || TONE_BY_CAT['متفرقه'] || '';
  var segs = [];
  if (ep.hook) {
    segs.push({ text: ep.hook, kind: 'hook', tone: '',
                style: base + ' این آغاز برنامه است: دعوت‌کننده و گیرا، کمی پرانرژی‌تر از بقیه. ' +
                       'نامِ برنامه را با تأکید و کمی کشیده بگو، مثل معرفیِ یک برنامهٔ رادیویی.' });
  }
  for (var i = 0; i < (ep.sections || []).length; i++) {
    var sec = ep.sections[i];
    var t = (sec.heading ? sec.heading + '. ' : '') + (sec.narration || '');
    if (!t.trim()) continue;
    // لحن از سرشتِ خودِ همین بخش می‌آید، نه فقط از دستهٔ کلِ قسمت: یک بندِ سوگ
    // در یک قسمتِ علمی هم باید مثلِ سوگ خوانده شود.
    var reg = voiceRegister_(cat, sec.tone, t);
    // عنوانِ بخش همراهِ قطعه می‌ماند تا موسیقیِ میانه بداند بینِ کدام دو بخش
    // می‌نشیند. بی این، جای موسیقی فقط شمارهٔ تکهٔ صوتی بود.
    segs.push({ text: t, kind: 'body', tone: String(sec.tone || ''), secIndex: i,
                heading: String(sec.heading || ''),
                style: base + (sec.tone ? ' ' + sec.tone : '') + ' ' + styleForRegister_(reg) });
  }
  if (ep.outro) {
    segs.push({ text: ep.outro, kind: 'outro', tone: '',
                style: base + ' این پایانِ برنامه است: آرام‌تر، جمع‌بندی‌کننده و ماندگار.' });
  }
  return segs;
}

/** بخش‌ها → تکه‌های آمادهٔ ارسال به TTS، با حفظ لحن و گویندهٔ هر بخش */
function buildChunks_(ep, cat, epNum) {
  var segs = episodeSegments_(ep, cat);
  if (CFG.TTS_CAST_ENABLED !== false) {
    try {
      // نقش‌گزینی یک بار انجام می‌شود و در پروندهٔ قسمت می‌مانَد؛ اجراهای بعدیِ
      // صداگذاری همان را می‌خوانند. وگرنه گویندهٔ وسطِ فایل عوض می‌شود.
      var cast = ensureCast_(ep, ENRICH_SHOW_VARIETY, epNum, cat);
      assignSegmentVoices_(segs, cast, cat);
      ep.__cast.note = castNote_(cast, segs);
      /* سهمِ زمانیِ هر گوینده همین‌جا ثبت می‌شود: `segs` بعد از
         صداگذاری از بین می‌رود و یوتیوب فردا فقط پروندهٔ قسمت را دارد. */
      try { castSpansRecord_(ep, segs); } catch (eSp) {}
      logLine_('نقش‌گزینیِ قسمت: ' + ep.__cast.note);
    } catch (eC) { logLine_('نقش‌گزینیِ گویندگان انجام نشد: ' + eC.message); }
  }
  var out = [], bounds = [];
  for (var i = 0; i < segs.length; i++) {
    // متنِ صوتی: نسخهٔ اعراب‌دارِ وارسی‌شده (اگر آماده شده)، پاک‌شده از هر
    // شناسه و لینکی که «گفتنی» نیست. متنِ خواندنیِ سند دست نمی‌خورد.
    var plainS = speakSanitize_(String(segs[i].text || ''));
    var spoken = speakSanitize_(speakTextOf_(ep, i, plainS));
    var pieces = splitForTts_(applyPron_(spoken));
    // مرزِ واقعیِ این قطعه در فهرستِ تکه‌ها. موسیقیِ میانه فقط اینجاها
    // می‌نشیند، وگرنه وسطِ روایتِ یک بخش می‌افتاد.
    // وایب و گویندهٔ هر بخش هم با مرز می‌روند. بی این‌ها، انتخاب‌کنندهٔ
    // موسیقی فقط عنوانِ بخش را می‌دید — و «وایب» دقیقاً همان چیزی است که
    // موسیقی باید با آن بخوانَد، نه عنوان.
    // secIndex پلِ میانِ دو فضای شماره‌گذاری است: شمارهٔ بخش در ep.sections
    // و جای واقعیِ آن در فهرستِ تکه‌ها. تا ۵٫۶۴ این پل نبود و افکت با
    // شمردنِ تکه‌ها جا داده می‌شد — یعنی «بخشِ ۳» می‌شد «تکهٔ ۳»، که با
    // وجودِ hook و شکستنِ بخش‌های بلند، جای کاملاً دیگری است.
    bounds.push({ at: out.length, kind: String(segs[i].kind || 'section'),
                  secIndex: (segs[i].secIndex === undefined ? -1 : Number(segs[i].secIndex)),
                  heading: String(segs[i].heading || ''),
                  tone: String(segs[i].tone || ''),
                  voice: String(segs[i].voice || '') });
    for (var j = 0; j < pieces.length; j++) {
      out.push({ text: pieces[j], style: segs[i].style, voice: segs[i].voice });
    }
  }
  // موسیقی لای تکه‌ها می‌نشیند. بخشِ ۲۳ پایین‌تر از این است، پس فراخوانش در
  // try/catch است: در فایلِ سرِهم‌شده hoisting نجاتش می‌دهد، ولی بارگذارِ جزئیِ
  // آزمون‌ها با ReferenceError می‌شکند و نباید تولید را زمین بزند.
  try {
    var heads = ((ep && ep.sections) || []).map(function (x) { return String(x.heading || ''); })
                  .filter(Boolean).slice(0, 8).join(' · ');
    var castTxt = (ep && ep.__cast && ep.__cast.note) ? String(ep.__cast.note) : '';
    var mw = musicWrap_(out, null, {
      show: 'variety', episode: epNum, sections: (ep && ep.sections) || [], bounds: bounds,
      category: cat, mood: cat, title: String((ep && ep.title) || ''),
      headings: heads, cast: castTxt, plan: (ep && ep.music) || {} });
    if (mw && mw.chunks && mw.chunks.length) {
      if (mw.picks && mw.picks.length) {
        // یک بار در هر قسمت، نه یک بار در هر از سرگیری — وگرنه شمارندهٔ
        // «بارِ استفاده» سه‌برابر می‌شود و حافظهٔ «قسمتِ قبل» انتخابِ
        // همین قسمت را عوض می‌کند.
        try { musicRecordOnce_(null, mw, 'variety#' + epNum, 'قسمت ' + epNum, CFG.SHOW_NAME); } catch (eU) {}
      }
      return mw.chunks;
    }
  } catch (eM) { logLine_('موسیقیِ قسمت افزوده نشد: ' + eM.message); }
  return out;
}

// ------------------------------------------------------ اصلاح تلفظ پیش از صدا

var _pronCache = null;

function pronMap_() {
  if (_pronCache) return _pronCache;
  _pronCache = [];
  try {
    var sh = getHub_().getSheetByName(CFG.TAB_PRON);
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
      for (var i = 0; i < v.length; i++) {
        var from = String(v[i][0] || '').trim();
        var to = String(v[i][1] || '').trim();
        var on = String(v[i][2] || '').trim().toLowerCase();
        if (!from || !to) continue;
        if (['خیر', 'نه', 'no', 'false', '0', 'off'].indexOf(on) !== -1) continue;
        _pronCache.push([from, to]);
      }
    }
  } catch (e) { /* نبود جدول نباید تولید را متوقف کند */ }
  return _pronCache;
}

/* نویسه‌هایی که در جست‌وجوی واژه باید نادیده گرفته شوند: اعراب، کشیده، و
   نیم‌فاصله. اینها «شکلِ» واژه‌اند نه خودش. */
var PRON_MARKS = 'ًٌٍَُِّْ' +
                 'ٰٕٓٔـ‌';
function pronIsMark_(c) { return PRON_MARKS.indexOf(c) !== -1; }

/** متن بی‌علامت، به‌همراهِ نقشهٔ برگشت به جای اصلیِ هر نویسه. */
function pronStrip_(s) {
  var out = '', idx = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (pronIsMark_(c)) continue;
    out += c; idx.push(i);
  }
  return { text: out, idx: idx };
}

/**
 * جدولِ تلفظ را روی متن اعمال می‌کند — بی‌اعتنا به اعراب.
 *
 * ══ چرا بازنویسی شد ══
 * نسخهٔ قبل یک split/join سادهٔ رشته‌ای بود. تا وقتی متنِ صوتی بی‌اعراب بود
 * کار می‌کرد؛ ولی از نسخه‌ای که متنِ اعراب‌دار مبنای صداگذاری شد، «هدایت» در
 * متن به‌صورتِ «هِدایَت» نوشته می‌شود و جست‌وجوی رشته‌ایِ «هدایت» دیگر هرگز
 * پیدایش نمی‌کند. یعنی جدولِ تلفظ بی‌صدا از کار افتاد: کاربر واژه‌ها را
 * می‌نوشت، هیچ خطایی هم نمی‌آمد، و هیچ‌کدام اعمال نمی‌شد.
 *
 * حالا جست‌وجو روی متنِ بی‌علامت انجام می‌شود و جایگزینی روی متنِ اصلی —
 * با همان نقشهٔ برگشت. علامت‌هایی که به دُمِ واژه چسبیده‌اند هم با خودِ واژه
 * برداشته می‌شوند، وگرنه کسرهٔ اضافه پس از جایگزینی جا می‌ماند.
 */
function applyPron_(text) {
  var m = pronMap_();
  var s = String(text);
  if (!m.length) return s;
  for (var i = 0; i < m.length; i++) {
    var needle = pronStrip_(String(m[i][0])).text;
    var to = String(m[i][1]);
    if (!needle) continue;
    var st = pronStrip_(s);
    var hits = [], at = st.text.indexOf(needle);
    while (at !== -1) { hits.push(at); at = st.text.indexOf(needle, at + needle.length); }
    for (var h = hits.length - 1; h >= 0; h--) {
      var a = st.idx[hits[h]];
      // فقط تا آخرین *حرفِ* واژه. علامتِ پس از آن دستِ خودش می‌ماند، چون
      // کسرهٔ اضافه («هدایتِ او») نشانهٔ دستور زبان است نه بخشی از واژه؛
      // برداشتنش معنا را عوض می‌کند.
      var b = st.idx[hits[h] + needle.length - 1] + 1;
      s = s.slice(0, a) + to + s.slice(b);
    }
  }
  return s;
}

/**
 * چند واژه از جدولِ تلفظ واقعاً در این متن پیدا شد.
 *
 * جدول یک بار درست کار می‌کرد و بعد از تغییرِ متنِ صوتی به نسخهٔ اعراب‌دار از کار
 * افتاد — بی هیچ خطایی، بی هیچ سطری در سیاهه. تنها نشانه‌اش این بود که کاربر در
 * صدا می‌شنید.
 *
 * وسوسه شدم از این عدد یک هشدار بسازم («جدول پر است ولی چیزی نخورد») و پس
 * گرفتم: بیشترِ قسمت‌ها بی‌آنکه ایرادی داشته باشند هیچ‌کدام از آن واژه‌ها را
 * ندارند، پس آن هشدار هر روز شلیک می‌شد. هشدارِ دروغ، هشدارهای واقعی را هم
 * بی‌اثر می‌کند. درستیِ خودِ سازوکار را آزمون‌ها نگه می‌دارند، نه هشدار.
 */
/** همهٔ متنِ گفتنیِ یک قسمت، یکجا. */
function allTextForPron_(ep) {
  var t = String((ep && ep.hook) || '') + ' ' + String((ep && ep.outro) || '');
  var secs = (ep && ep.sections) || [];
  for (var i = 0; i < secs.length; i++) t += ' ' + String((secs[i] || {}).narration || '');
  return t;
}

function pronHits_(text) {
  var m = pronMap_(), s = String(text), n = 0;
  var st = pronStrip_(s);
  for (var i = 0; i < m.length; i++) {
    var needle = pronStrip_(String(m[i][0])).text;
    if (!needle) continue;
    var at = st.text.indexOf(needle);
    while (at !== -1) { n++; at = st.text.indexOf(needle, at + needle.length); }
  }
  return { rules: m.length, hits: n };
}

/**
 * هم‌ترازسازی base64 تا بتوان رشته‌ها را مستقیم به هم چسباند.
 * هر گروه ۴ نویسه = ۳ بایت. برای هم‌ترازی نمونه‌های ۱۶ بیتی، تعداد گروه‌ها باید زوج
 * باشد تا طول بایت مضربی از ۶ شود. حداکثر ۵ بایت (~۰٫۱ میلی‌ثانیه) حذف می‌شود.
 */
/* ═════════ هم‌پوشانیِ نرمِ موسیقی و گفتار (۵٫۸۰) ═════════

   ══ چه چیزی غیرحرفه‌ای بود ══
   تکه‌ها **پشتِ سرِ هم** چسبانده می‌شدند: موسیقی تمام می‌شد، بعد گوینده
   شروع می‌کرد. صاحبِ برنامه گفت «یهو اون قطع شه و این شروع بشه… باید
   ثانیه‌های آخرِ موسیقی و ابتداییِ صدای گوینده کمی در هم تلفیق بشن.»

   ══ چرا شدنی است، با اینکه «بسترِ موسیقی زیرِ کلِ روایت» نیست ══
   بسترِ سراسری یعنی جمعِ نمونه‌به‌نمونه روی ~۱۴ میلیون نمونه — مهلتِ
   شش‌دقیقه‌ای گوگل اجازه نمی‌دهد. ولی هم‌پوشانی فقط **دو ثانیه سرِ هر
   اتصال** است: ۴۸ هزار نمونه، و در هر قسمت شش‌هفت اتصال. کلِ کار کمتر از
   نیم‌میلیون عمل است.

   ══ ترفندِ مرزِ امن ══
   هر نمونه ۲ بایت است و هر گروهِ base64 سه بایت. پس تنها جایی که هم روی
   مرزِ نمونه است و هم روی مرزِ گروه، مضربِ ۶ بایت (= ۳ نمونه = ۸ نویسه)
   است. با این مرز، برشِ رشته هیچ نمونه‌ای را نصف نمی‌کند و لازم نیست کلِ
   تکه رمزگشایی شود — فقط همان دو ثانیهٔ لبه.
*/

/** خواندنِ یک نمونهٔ ۱۶بیتیِ علامت‌دار. بایت‌های Apps Script علامت‌دارند. */
function rd16_(b, i) {
  var u = function (k) { return b[k] < 0 ? b[k] + 256 : b[k]; };
  var v = u(i) | (u(i + 1) << 8);
  return (v & 0x8000) ? v - 65536 : v;
}

/* ═══════ شکلِ گذر — و چرا شکلش مهم‌تر از وجودش است (۵٫۸۴) ═══════

   ۵٫۸۰ هم‌پوشانی را ساخت و همان‌جا ایستاد: هر دو طرف با شیبِ **خطی**.
   برای دو صدای بی‌ربط (موسیقی و گفتار) این غلط است — توان با مجذورِ
   دامنه می‌رود، پس وسطِ گذر که هر دو روی ۰٫۵ هستند، توانِ کل ۰٫۵ است نه
   ۱: افتِ ۳ تا ۶ دسی‌بل، که گوش آن را «چاله» می‌شنود. شیبِ هم‌توان
   (cos برای رونده، sin برای آینده) مجموعِ مجذورها را ثابت نگه می‌دارد.

   ولی هم‌توانِ متقارن هم برای اینجا کافی نیست، چون دو طرفِ این اتصال
   هم‌ارز نیستند: یکی حرف است و یکی موسیقی، و **حرف نباید محو شود.**
   پس دو شکلِ متفاوت، بسته به اینکه کدام طرف موسیقی است:

     موسیقی → گفتار   گوینده از کفِ MUSIC_DUCK_FLOOR وارد می‌شود (نه از
                      صفر) و در MUSIC_DUCK_RISE از گذر به بلندیِ کامل
                      می‌رسد؛ موسیقی با شیبِ هم‌توان می‌افتد و ضربدرِ
                      MUSIC_DUCK_UNDER زیرِ صدا می‌رود. این همان چیزی است
                      که در رادیو «duck» می‌گویند: موسیقی کنار می‌رود،
                      نه اینکه بمیرد و بعد حرف شروع شود.

     گفتار → موسیقی   واژه‌های پایانی تا MUSIC_XFADE_HOLD **دست نمی‌خورند**
                      (اگر گوینده وسطِ جمله محو شود، فاجعه است)، و
                      موسیقی زیرشان بالا می‌آید و بعد از رفتنِ صدا به
                      بلندیِ کامل می‌رسد.

   و جمع، نرم فشرده می‌شود نه بریده: دو صدای هم‌زمان می‌توانند از سقفِ
   ۱۶بیتی رد شوند، و بریدنِ خشک صدای خش می‌دهد.
*/

/** شیبِ هم‌توان، بی نیاز به Math.cos برای هر نمونه (ارزان‌تر و دقیق). */
function xfCos_(t) { return Math.cos(t * Math.PI / 2); }
function xfSin_(t) { return Math.sin(t * Math.PI / 2); }

/** فشردنِ نرمِ بالای زانو — به‌جای بریدنِ خشک در ±۳۲۷۶۷. */
function pcmSoft_(v) {
  var knee = Number(CFG.MUSIC_LIMIT_KNEE) || 28000;
  var top = 32767;
  var a = v < 0 ? -v : v;
  if (a <= knee) return Math.round(v);
  var over = a - knee, room = top - knee;
  var out = knee + room * (over / (over + room));
  return Math.round(v < 0 ? -out : out);
}

/**
 * دو تکهٔ base64 را با هم‌پوشانی در هم می‌بَرد.
 *
 * @param {string} prevB64  تکهٔ پیشین (آخرش کوتاه می‌شود و بازنویسی)
 * @param {string} nextB64  تکهٔ پسین (اولش برداشته می‌شود)
 * @param {number} secs     طولِ خواسته‌شدهٔ هم‌پوشانی
 * @param {boolean} prevIsMusic  کدام طرف موسیقی است — شکلِ گذر را همین
 *                               تعیین می‌کند، نه فقط طولش
 * @return {Array|null} [تکهٔ اولِ تازه، تکهٔ دومِ تازه]، یا null اگر حتی
 *                      کوتاه‌ترین هم‌پوشانی هم جا نشد
 */
function pcmXfade_(prevB64, nextB64, secs, prevIsMusic) {
  var sr = CFG.SAMPLE_RATE || 24000;
  if (!prevB64 || !nextB64) return null;

  /* ── طولِ سازگار، نه «یا همه یا هیچ» ──
     تا ۵٫۸۳ اگر یکی از دو طرف کمتر از دو برابرِ هم‌پوشانی صدا داشت،
     null برمی‌گشت و همان‌جا یک بُرشِ خشک می‌ماند — بی هیچ سیاهه‌ای. و
     تکهٔ گفتارِ کوتاه (یک جملهٔ پایانِ بخش) دقیقاً همان‌جایی است که
     موسیقیِ میانه می‌آید، پس این حالت نادر نبود؛ قاعده بود. */
  var wantChars = Math.floor(Math.floor((Number(secs) || 0) * sr) * 2 / 6) * 6 / 3 * 4;
  var room = Math.min(Math.floor(prevB64.length / 2), Math.floor(nextB64.length / 2));
  var chars = Math.min(wantChars, room);
  chars = Math.floor(chars / 8) * 8;          // مرزِ نمونه × مرزِ گروهِ base64
  var minChars = Math.floor(
    Math.floor((Number(CFG.MUSIC_XFADE_MIN_SEC) || 0.15) * sr) * 2 / 6) * 6 / 3 * 4;
  if (chars < Math.max(8, minChars)) return null;

  var a, b;
  try {
    a = Utilities.base64Decode(prevB64.slice(prevB64.length - chars));
    b = Utilities.base64Decode(nextB64.slice(0, chars));
  } catch (e) { return null; }

  var cnt = Math.floor(Math.min(a.length, b.length) / 2);
  if (cnt < 3) return null;

  var floorG = Number(CFG.MUSIC_DUCK_FLOOR); if (!(floorG >= 0)) floorG = 0.55;
  var rise = Number(CFG.MUSIC_DUCK_RISE); if (!(rise > 0)) rise = 0.35;
  var under = Number(CFG.MUSIC_DUCK_UNDER); if (!(under >= 0)) under = 0.5;
  var hold = Number(CFG.MUSIC_XFADE_HOLD); if (!(hold >= 0 && hold < 1)) hold = 0.5;

  var out = [];
  for (var k = 0; k < cnt; k++) {
    var i2 = k * 2, t = k / cnt, ga, gb;
    if (prevIsMusic === false) {
      // گفتار → موسیقی: حرف تا `hold` دست‌نخورده، بعد می‌رود؛ موسیقی زیرش
      // بالا می‌آید و پس از رفتنِ حرف به بلندیِ کامل می‌رسد.
      var u = t <= hold ? 0 : (t - hold) / (1 - hold);
      ga = t <= hold ? 1 : xfCos_(u);
      gb = xfSin_(t) * (under + (1 - under) * u);
    } else {
      // موسیقی → گفتار: موسیقی هم‌توان می‌افتد و زیرِ صدا می‌رود؛ گوینده از
      // کف وارد می‌شود، نه از صفر.
      var r = rise > 0 ? Math.min(1, t / rise) : 1;
      ga = xfCos_(t) * (1 - (1 - under) * r);
      gb = floorG + (1 - floorG) * r;
    }
    var v = pcmSoft_(rd16_(a, i2) * ga + rd16_(b, i2) * gb);
    if (v > 32767) v = 32767; else if (v < -32768) v = -32768;
    if (v < 0) v += 65536;
    var lo = v & 255, hi = (v >>> 8) & 255;
    out.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi);
  }
  return [prevB64.slice(0, prevB64.length - chars) + Utilities.base64Encode(out),
          nextB64.slice(chars)];
}

function alignB64_(b64) {
  b64 = String(b64).replace(/\s+/g, '').replace(/=+$/, '');
  var g = Math.floor(b64.length / 4);
  if (g % 2 === 1) g -= 1;
  return b64.substring(0, g * 4);
}

/**
 * هدر WAV با طول دقیقاً ۵۴ بایت (مضرب ۶) تا در فضای base64 قابل الحاق باشد.
 * چیدمان: RIFF/WAVE → fmt → JUNK(۲ بایت لایی) → data
 */
function wavHeader54_(dataLen) {
  var h = [];
  function str(s) { for (var i = 0; i < s.length; i++) h.push(s.charCodeAt(i)); }
  function u32(v) { h.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); }
  function u16(v) { h.push(v & 255, (v >>> 8) & 255); }

  var ch = 1, bits = 16, sr = CFG.SAMPLE_RATE;
  str('RIFF'); u32(46 + dataLen); str('WAVE');                       // ۱۲
  str('fmt '); u32(16); u16(1); u16(ch); u32(sr);
  u32(sr * ch * bits / 8); u16(ch * bits / 8); u16(bits);            // ۲۴ → ۳۶
  str('JUNK'); u32(2); h.push(0, 0);                                 // ۱۰ → ۴۶
  str('data'); u32(dataLen);                                         // ۸  → ۵۴

  for (var i = 0; i < h.length; i++) if (h[i] > 127) h[i] -= 256;    // بایت علامت‌دار
  return h;
}

/** شکستن متن به تکه‌های امن روی مرز جمله (بدون lookbehind، برای سازگاری کامل) */
function splitForTts_(text) {
  var t = String(text).replace(/\s+/g, ' ').trim();
  var sentences = [], cur = '';
  for (var i = 0; i < t.length; i++) {
    cur += t.charAt(i);
    if ('.!?؟…'.indexOf(t.charAt(i)) !== -1) {
      if (i + 1 >= t.length || t.charAt(i + 1) === ' ') { sentences.push(cur.trim()); cur = ''; }
    }
  }
  if (cur.trim()) sentences.push(cur.trim());

  var out = [], acc = '';
  for (var j = 0; j < sentences.length; j++) {
    var s = sentences[j];
    if (!s) continue;
    if (s.length > CFG.TTS_CHUNK_CHARS) {          // جملهٔ بسیار بلند: روی فاصله بشکن
      if (acc) { out.push(acc.trim()); acc = ''; }
      var w = s.split(' '), line = '';
      for (var k = 0; k < w.length; k++) {
        if ((line + ' ' + w[k]).length > CFG.TTS_CHUNK_CHARS && line) { out.push(line.trim()); line = w[k]; }
        else line = (line ? line + ' ' : '') + w[k];
      }
      if (line) acc = line;
      continue;
    }
    if ((acc + ' ' + s).trim().length > CFG.TTS_CHUNK_CHARS && acc) { out.push(acc.trim()); acc = s; }
    else acc = (acc ? acc + ' ' : '') + s;
  }
  if (acc.trim()) out.push(acc.trim());
  return out;
}

/** بستن یک گروه از تکه‌های base64 به یک فایل WAV و نوشتنش در درایو */
function writeWavPart_(parts, baseName, partNo, folder) {
  var b64 = parts.join('');
  if (!b64) return null;
  var dataLen = (b64.length / 4) * 3;
  var head = Utilities.base64Encode(wavHeader54_(dataLen));
  var bytes = Utilities.base64Decode(head + b64);
  var name = baseName + ' — بخش ' + partNo + '.wav';
  var file = folder.createFile(Utilities.newBlob(bytes, 'audio/wav', name));
  return { id: file.getId(), name: file.getName(), url: file.getUrl(), bytes: dataLen };
}

/**
 * ساخت صدا به‌صورت «ادامه‌پذیر».
 * هر بخش به‌محض آماده‌شدن در درایو نوشته می‌شود، پس اگر اجرا به سقف شش دقیقه‌ای
 * Apps Script بخورد، هیچ کاری هدر نمی‌رود و اجرای بعدی دقیقاً از همان تکه ادامه می‌دهد.
 * @return {{done:boolean, chunkIdx:number, partNo:number, files:Array}}
 */
function synthesizeStep_(chunks, baseName, folder, startChunk, startPart, deadline, onPart) {
  var maxB64 = Math.floor(CFG.MAX_WAV_BYTES / 3) * 4;
  var buf = [], bufChars = 0, files = [];
  var partNo = startPart, i = startChunk;

  // وقتِ لازم برای «یک تکهٔ دیگر». یک فراخوانِ گفتارسازی می‌تواند بیش از یک
  // دقیقه طول بکشد، پس سنجیدنِ «آیا مهلت تمام شده؟» کافی نیست؛ باید پرسید
  // «آیا وقتِ تمام‌کردنِ تکهٔ بعدی هم هست؟». همین یک خط، فرقِ «ادامه در اجرای
  // بعد» با «Exceeded maximum execution time» است.
  var reserve = Number(CFG.TTS_RESERVE_MS) > 0 ? Number(CFG.TTS_RESERVE_MS) : 110000;
  // نوعِ آخرین تکه‌ای که واقعاً در بافر نشست — نه chunks[i-1]، چون تکه‌ای
  // که b64 خالی داد اصلاً اضافه نشده و مرزِ واقعی جای دیگری است.
  var prevMusic = null;
  // …و طولِ تلفیقی که آن تکه اعلام کرده بود. `chunks[i-1]` جوابِ درستی
  // نیست: تکه‌ای که b64ِ خالی داد اصلاً وارد بافر نشده، پس طولش هم مالِ
  // این اتصال نیست.
  var prevXf = 0;
  for (; i < chunks.length; i++) {
    // همیشه دست‌کم یک تکه در هر اجرا ساخته می‌شود، وگرنه اگر اجرا با وقتِ تمام‌شده
    // شروع شود، بی‌آنکه پیشرفتی بکند دوباره خودش را زمان‌بندی می‌کند و گیر می‌افتد.
    if (i > startChunk && new Date().getTime() > deadline - reserve) break;
    // دستورِ لحن فقط وقتی همراه می‌شود که لحن تازه باشد. تکهٔ دوم به بعدِ یک
    // بخش، متنِ خالی می‌گیرد؛ صدا از voiceConfig می‌آید نه از دستور، پس گوینده
    // همان است و فقط شانسِ «دستور را بخواند» از بین می‌رود.
    // تکهٔ موسیقی از پیش صدا دارد و به مدل فرستاده نمی‌شود — نه هزینه‌ای
    // دارد، نه شانسی برای اشتباه‌خواندن.
    var b64;
    if (chunks[i] && chunks[i].pcm) {
      b64 = alignB64_(chunks[i].pcm);
    } else {
      var withCue = ttsCueWanted_(chunks, i);
      b64 = alignB64_(ttsChunk_(chunks[i].text, chunks[i].style, chunks[i].voice, withCue));
    }
    if (!b64) continue;

    /* ── تلفیقِ لبه‌ها ──
     * جایی که یک طرف موسیقی/افکت است و طرفِ دیگر گفتار، دو ثانیهٔ آخرِ
     * یکی و دو ثانیهٔ اولِ دیگری روی هم می‌افتند: یکی محو می‌شود و دیگری
     * بالا می‌آید. اگر بافر تازه خالی شده باشد (مرزِ فایل) از این اتصال
     * می‌گذریم — دو فایلِ جدا را نمی‌شود در هم برد. */
    var curMusic = !!(chunks[i] && chunks[i].pcm);
    if (CFG.MUSIC_XFADE !== false && buf.length && prevMusic !== null &&
        prevMusic !== curMusic) {
      var xs = curMusic ? Number(chunks[i] && chunks[i].xfade) : prevXf;
      if (!(xs > 0)) xs = Number(CFG.MUSIC_XFADE_SEC) || 0;
      try {
        // شکلِ گذر به این بستگی دارد که کدام طرف موسیقی است — گفتار
        // هرگز مثل موسیقی محو نمی‌شود.
        var mix = pcmXfade_(buf[buf.length - 1], b64, xs, !curMusic);
        if (mix) {
          bufChars += mix[0].length - buf[buf.length - 1].length;
          buf[buf.length - 1] = mix[0];
          b64 = mix[1];
        }
      } catch (eX) { logLine_('تلفیقِ لبه انجام نشد: ' + eX.message); }
    }
    prevMusic = curMusic;
    prevXf = Number(chunks[i] && chunks[i].xfade) || 0;

    if (bufChars + b64.length > maxB64 && buf.length) {
      var f = writeWavPart_(buf, baseName, partNo, folder);
      if (f) {
        files.push(f); partNo++;
        // پیشرفت را همین‌جا ذخیره کن. اگر اجرا وسط تکهٔ بعدی کشته شود، فقط همان
        // یک تکه از دست می‌رود، نه همهٔ بخش‌هایی که تا اینجا ساخته شده‌اند.
        if (onPart) onPart(files, i, partNo);
      }
      buf = []; bufChars = 0;
    }
    buf.push(b64); bufChars += b64.length;
    Utilities.sleep(400);          // ملایمت با سهمیهٔ API
  }
  if (buf.length) {
    var g = writeWavPart_(buf, baseName, partNo, folder);
    if (g) { files.push(g); partNo++; if (onPart) onPart(files, i, partNo); }
  }
  return { done: i >= chunks.length, chunkIdx: i, partNo: partNo, files: files };
}

/**
 * چسباندن بخش‌های آمادهٔ WAV به یک فایل واحد.
 *
 * ترفند: هدرِ ما دقیقاً ۵۴ بایت است و ۵۴ مضربِ ۳ است، پس base64 آن دقیقاً
 * ۷۲ نویسه بی‌هیچ padding می‌شود. یعنی می‌توان کل فایل را با یک فراخوانیِ بومی
 * base64 کرد، ۷۲ نویسهٔ اول را برداشت، رشته‌ها را به هم چسباند و یک‌بار برگرداند.
 * این‌طور هیچ‌وقت میلیون‌ها بایت در جاوااسکریپت پیمایش نمی‌شود.
 * صحتش با ffmpeg سنجیده شده: صفر انحراف در طول و صفر خطای رمزگشایی.
 */
function mergeOne_(files, outName, folder) {
  if (!files || !files.length) return null;
  var chunks = [];
  for (var i = 0; i < files.length; i++) {
    var b64 = Utilities.base64Encode(DriveApp.getFileById(files[i].id).getBlob().getBytes());
    chunks.push(alignB64_(b64.substring(72)));      // ۷۲ نویسه = همان هدر ۵۴ بایتی
  }
  var joined = chunks.join('');
  var dataLen = (joined.length / 4) * 3;
  var head = Utilities.base64Encode(wavHeader54_(dataLen));
  var blob = Utilities.newBlob(Utilities.base64Decode(head + joined), 'audio/wav', outName + '.wav');
  var file = folder.createFile(blob);
  logLine_('فایل صوتی یکجا ساخته شد: «' + file.getName() + '» — ' +
           Math.round(dataLen / 1048576) + ' مگابایت.');
  return { id: file.getId(), name: file.getName(), url: file.getUrl(), bytes: dataLen };
}

/**
 * چسباندنِ بخش‌ها به «کم‌ترین شمارِ فایلِ ممکن» — نه لزوماً یک فایل.
 *
 * چرا یک فایل همیشه ممکن نیست: صدای خامِ بیست‌وچهار کیلوهرتز دقیقه‌ای حدود سه
 * مگابایت است و تلگرام فایلِ بزرگ‌تر از پنجاه مگابایت را نمی‌پذیرد. یعنی هر
 * قسمتِ بلندتر از حدود شانزده دقیقه در یک فایل جا نمی‌شود. تا امروز در این
 * حالت ادغام *کلاً* کنار می‌رفت و پنج تکهٔ سه‌دقیقه‌ای به تلگرام می‌رفت — همان
 * چیزی که دیدید. حالا همان قسمت دو فایلِ هشت‌دقیقه‌ای می‌شود: کم‌ترین تعدادی که
 * هم زیرِ سقف بماند و هم هیچ ثانیه‌ای از دست نرود.
 *
 * برمی‌گرداند: آرایه‌ای از فایل‌های «یکجا» (یک عضو در حالت عادی)، یا null.
 */
function mergeGroups_(files, baseName, folder) {
  var plan = planGroups_(files);
  if (!plan) return null;
  var out = [];
  for (var g = 0; g < plan.length; g++) {
    var one = mergeGroupOne_(files, plan, g, baseName, folder);
    if (one) out.push(one);
  }
  if (plan.length > 1) {
    logLine_('قسمت بلندتر از سقفِ یک فایل بود؛ در ' + plan.length +
             ' فایلِ یکجا چسبانده شد (به‌جای ' + files.length + ' تکهٔ کوتاه).');
  }
  return out.length ? out : null;
}

/**
 * نقشهٔ ادغام: بخش‌ها به کم‌ترین شمارِ گروهِ متوازن تقسیم می‌شوند و *شمارهٔ*
 * هر بخش برگردانده می‌شود، نه خودش.
 *
 * چرا شماره و نه خودِ شیء: از این نسخه ادغام گروه‌به‌گروه و در چند اجرا انجام
 * می‌شود، پس نقشه باید در PropertiesService ذخیره شود و بعد از یک اجرای
 * کشته‌شده دوباره خوانده شود. نقشهٔ عددی، هم کوچک است هم بی‌ابهام.
 *
 * برمی‌گرداند: [[0,1,2],[3,4]] یا null اگر ادغام بی‌معنی باشد.
 */
function planGroups_(files) {
  if (!files || files.length < 2) return null;
  var cap = Number(CFG.MERGE_MAX_BYTES) || 33000000;

  // حجم‌ها را یک بار پاک‌سازی می‌کنیم. یک عضوِ null یا یک bytesِ NaN نباید
  // کلِ نقشه را با استثنا زمین بزند؛ بدترین حالتش این است که آن بخش «صفر
  // بایت» حساب شود و همچنان سرِ جای خودش در ترتیب بماند.
  var b = [], total = 0, maxOne = 0;
  for (var t = 0; t < files.length; t++) {
    var x = Number(files[t] && files[t].bytes);
    if (!isFinite(x) || x < 0) x = 0;
    b.push(x); total += x; if (x > maxOne) maxOne = x;
  }

  // پرکردنِ ترتیبی تا سقفِ داده‌شده. کم‌ترین شمارِ گروهِ ممکن با همین به دست
  // می‌آید (برای تقسیمِ ترتیبی، حریصانه بهینه است).
  var packBy = function (limit) {
    var gs = [], cur = [], sum = 0;
    for (var i = 0; i < b.length; i++) {
      if (cur.length && sum + b[i] > limit) { gs.push(cur); cur = []; sum = 0; }
      cur.push(i); sum += b[i];
    }
    if (cur.length) gs.push(cur);
    return gs;
  };

  // ── گامِ ۱: کم‌ترین شمارِ فایل ──
  var need = packBy(cap).length;

  // ── گامِ ۲: متوازن‌ترین تقسیم *با همان شمار* ──
  // چرا این گام لازم شد: نسخهٔ قبل سقفِ هر گروه را از روی «بایتِ باقی‌مانده
  // تقسیم بر گروهِ باقی‌مانده» حدس می‌زد و آن حدس را بعد از هر گروه از نو
  // می‌ساخت. نتیجه‌اش در آزمونِ بیست‌هزار ترکیبِ واقعی: در ۱۳٪ موارد یک فایلِ
  // اضافه می‌ساخت (سه فایل، جایی که دو فایل جا می‌شد) و در ۱۲٪ موارد تقسیم
  // تا چهار برابر لنگ می‌شد. حالا کوچک‌ترین سقفی را پیدا می‌کنیم که هنوز
  // همان need گروه بدهد.
  var lo = 1, hi = cap, best = cap;
  while (lo <= hi) {
    var mid = Math.floor((lo + hi) / 2);
    if (packBy(mid).length <= need) { best = mid; hi = mid - 1; } else lo = mid + 1;
  }

  // ── گامِ ۳: پخشِ نرم درون همان سقف ──
  // «پر کن تا best» ته‌ماندهٔ تک‌عضوی می‌سازد (۳+۳+۳+۳+۱ به‌جای ۳+۳+۳+۲+۲).
  // گروهِ تک‌عضوی یعنی یک بخشِ خام که به‌عنوان «فایلِ کامل» فرستاده می‌شود؛
  // بهتر است اصلاً پیش نیاید.
  var groups = balancedPlan_(b, need, best, cap);
  if (!groups) groups = packBy(best);

  if (groups.length === 1 && groups[0].length < 2) return null;
  return groups;
}

/**
 * تقسیمِ ترتیبی به دقیقاً `need` گروه، با سقفِ سختِ `cap`، و توزیعِ تا حدِ
 * ممکن یکنواخت. اگر نتیجه به هر دلیل معتبر نبود null برمی‌گرداند تا
 * فراخوان به روشِ مطمئنِ «پر کن تا سقف» برگردد — هرگز یک نقشهٔ خرابِ
 * از-سقف-گذشته تحویل نمی‌دهد.
 */
function balancedPlan_(b, need, limit, cap) {
  var groups = [], i = 0, left = 0, leftG = need;
  for (var k = 0; k < b.length; k++) left += b[k];
  while (i < b.length && leftG > 0) {
    var target = Math.ceil(left / leftG);
    var mustLeave = leftG - 1;          // برای هر گروهِ بعدی دستِ کم یک بخش
    var cur = [], sum = 0;
    while (i < b.length) {
      if (b.length - i <= mustLeave) break;
      if (cur.length && sum + b[i] > limit) break;
      // نزدیک‌تر به هدف کدام است: با این بخش، یا بی آن؟
      if (cur.length && Math.abs(sum + b[i] - target) > Math.abs(sum - target)) break;
      cur.push(i); sum += b[i]; i++;
    }
    if (!cur.length) { cur.push(i); sum += b[i]; i++; }
    groups.push(cur); left -= sum; leftG--;
  }
  if (i < b.length) return null;                 // بخشی جا ماند
  if (groups.length !== need) return null;
  for (var g = 0; g < groups.length; g++) {
    var s = 0, single = groups[g].length === 1;
    for (var m = 0; m < groups[g].length; m++) s += b[groups[g][m]];
    // یک بخشِ تنها که خودش از سقف بزرگ‌تر است، ناگزیر است؛ غیر از آن، هیچ
    // گروهی حق ندارد از سقف بگذرد.
    if (s > cap && !single) return null;
  }
  return groups;
}

/** نامِ فایلِ یکجای گروهِ g. جدا شد تا پیش از ساختن هم بشود سراغش را گرفت. */
function mergeLabel_(baseName, g, count) {
  return count > 1 ? baseName + ' — یکجا ' + (g + 1) + ' از ' + count
                   : baseName + ' — کامل';
}

/** یک گروه از نقشه را می‌چسباند و رکوردِ فایلِ «یکجا» را برمی‌گرداند. */
function mergeGroupOne_(files, plan, g, baseName, folder) {
  var ids = plan[g] || [];
  var members = [];
  for (var k = 0; k < ids.length; k++) if (files[ids[k]]) members.push(files[ids[k]]);
  // نقشه‌ای که به بخشِ نبوده اشاره می‌کند یعنی حالتِ ذخیره‌شده خراب است. تا
  // دیروز این‌جا بی‌صدا هرچه بود چسبانده می‌شد و «موفق» گزارش می‌شد — یعنی
  // دقایقی از قسمت در سکوت گم می‌شد. حالا شکست می‌خورد تا ادغام کنار برود
  // و بخش‌ها سالم و جداگانه بروند.
  if (!members.length || members.length !== ids.length) return null;
  // گروهِ تک‌عضوی خودش یک فایلِ سالمِ کامل است؛ رونوشتِ بی‌فایده نمی‌سازیم.
  if (members.length === 1) {
    // reused یعنی «این فایلِ تازه‌ای نیست، خودِ همان بخش است» — اگر ادغام
    // نیمه‌کاره رها شود و نیم‌ساخته‌ها پاک شوند، این یکی نباید پاک شود.
    return { id: members[0].id, name: members[0].name, url: members[0].url,
             bytes: members[0].bytes, whole: true, reused: true,
             part: g + 1, parts: plan.length };
  }
  var label = mergeLabel_(baseName, g, plan.length);
  // اگر اجرای قبلی درست بعد از ساختنِ فایل و پیش از ذخیرهٔ پیشرفت کشته شده
  // باشد، یک فایلِ هم‌نام در پوشه مانده که در هیچ فهرستی نیست. بی این
  // پاک‌سازی، پوشهٔ قسمت دو «یکجا ۱ از ۲» می‌گرفت و یکی‌شان تا ابد یتیم می‌ماند.
  try {
    if (folder && typeof folder.getFilesByName === 'function') {
      var old = folder.getFilesByName(label + '.wav'), n = 0;
      while (old.hasNext()) { old.next().setTrashed(true); n++; }
      if (n) logLine_('فایلِ یکجای نیمه‌کارهٔ اجرای قبل پاک شد: «' + label + '».');
    }
  } catch (eOld) {}
  var m = mergeOne_(members, label, folder);
  if (!m) return null;
  m.whole = true; m.part = g + 1; m.parts = plan.length;
  return m;
}

/**
 * یک گامِ ادغام — مشترکِ برنامهٔ متنوع و درس‌نامه.
 *
 * ══ چرا این تابع هست ══
 *
 * صبحِ ۱۲ مرداد، برنامهٔ متنوع هفت بخشِ صوتی ساخت (روی‌هم ۴۱٫۷ مگابایت)، وارد
 * مرحلهٔ ادغام شد، و بعد هیچ. نه فایلِ یکجایی ساخته شد، نه پیامی رفت، نه حتی
 * یک سطر در سیاهه که بگوید چه شد. علتش این بود: کلِ ۴۱٫۷ مگابایت در *یک*
 * اجرا و *یک* رشتهٔ base64ِ پنجاه‌وپنج‌میلیون‌نویسه‌ای چسبانده می‌شد، و
 * Apps Script اجرا را وسطِ کار کشت. کشته‌شدن استثنا نمی‌دهد؛ پس نه catch
 * کاری می‌کرد، نه تریگرِ ادامه‌ای ساخته می‌شد.
 *
 * درمان سه لایه دارد:
 *   ۱. سقفِ هر فایلِ یکجا پایین آمد (به CFG.MERGE_MAX_BYTES نگاه کنید).
 *   ۲. در هر اجرا فقط *یک* گروه چسبانده می‌شود، نه همه؛ پس هر گروه مهلتِ
 *      کاملِ خودش را دارد و نقشهٔ ادغام بینِ اجراها ذخیره می‌ماند.
 *   ۳. تریگرِ ادامه *پیش از* کارِ سنگین مسلح می‌شود، نه بعدش. اگر اجرا وسطِ
 *      چسباندن کشته شود، تریگر سرِ جایش است و رشته پاره نمی‌شود.
 *
 * و اگر یک گروه دو بار پیاپی نیمه‌کاره ماند، کلِ ادغام کنار می‌رود و قسمت
 * تکه‌تکه فرستاده می‌شود: انتشار هرگز گروگانِ ادغام نمی‌ماند.
 *
 * برمی‌گرداند: { done, skipped } — done=false یعنی اجرای بعد ادامه می‌دهد.
 */
function mergeStep_(st, baseName, folder, deadline, pkey, sched, label) {
  var save = function () { props_().setProperty(pkey, JSON.stringify(st)); };
  var giveUp = function (why) {
    // فایل‌های یکجای نیم‌ساخته را جا نمی‌گذاریم؛ وگرنه در پوشهٔ قسمت
    // فایل‌هایی می‌مانند که در هیچ فهرستی نیستند.
    var made = st.mergeOut || [];
    // «کدام شناسه‌ها بخشِ اصلی‌اند» را از خودِ فهرستِ بخش‌ها می‌گیریم، نه فقط
    // از پرچمِ reused. اگر آن پرچم روزی در رفت‌وبرگشتِ JSON گم شود، این
    // پاک‌سازی صدای واقعیِ قسمت را پاک می‌کرد.
    var isPart = {};
    for (var p = 0; p < (st.files || []).length; p++) {
      if (st.files[p] && st.files[p].id) isPart[st.files[p].id] = 1;
    }
    for (var q = 0; q < made.length; q++) {
      if (!made[q] || !made[q].id || made[q].reused || isPart[made[q].id]) continue;
      try { DriveApp.getFileById(made[q].id).setTrashed(true); } catch (eT) {}
    }
    st.merged = null; st.mergePlan = null; st.mergeOut = []; st.mergeIdx = 0;
    st.mergeAt = -1; st.mergeTry = 0; st.mergeWaits = 0; st.mergeOff = true;
    save();
    logLine_(label + ': ادغام صدا کنار گذاشته شد (' + why + ')؛ بخش‌ها جداگانه فرستاده می‌شوند.');
    return { done: true, skipped: true };
  };

  // یک بار که ادغام کنار گذاشته شد، دیگر از نو نقشه کشیده نمی‌شود. بی این
  // نشانه، giveUp نقشه را پاک می‌کرد، مرحله هنوز 'merge' بود، و اجرای بعد
  // دوباره از صفر شروع می‌کرد — حلقه.
  if (st.mergeOff) { st.merged = null; return { done: true, skipped: true }; }

  if (!st.mergePlan) {
    var plan = null;
    try { plan = planGroups_(st.files); } catch (ePl) { plan = null; }
    if (!plan) { st.merged = null; save(); return { done: true }; }
    st.mergePlan = plan; st.mergeIdx = 0; st.mergeOut = [];
    if (plan.length > 1) {
      logLine_(label + ': قسمت بلندتر از سقفِ یک فایل است؛ در ' + plan.length +
               ' فایلِ یکجا چسبانده می‌شود (به‌جای ' + st.files.length + ' تکهٔ کوتاه).');
    }
  }
  if (st.mergeIdx >= st.mergePlan.length) {
    st.merged = (st.mergeOut && st.mergeOut.length) ? st.mergeOut : null;
    save();
    return { done: true };
  }

  var gi = st.mergeIdx;
  // شمارنده *پیش از* تلاش بالا می‌رود، چون کشته‌شدنِ اجرا هیچ فرصتی برای
  // ثبتِ شکست نمی‌دهد. اگر همین گروه بار دوم هم ناتمام ماند، بس است.
  if (Number(st.mergeAt) === gi) st.mergeTry = (Number(st.mergeTry) || 0) + 1;
  else { st.mergeAt = gi; st.mergeTry = 1; }
  if (Number(st.mergeTry) > 2) return giveUp('دو تلاشِ ناتمام روی فایلِ ' + (gi + 1));

  if (new Date().getTime() > deadline - (CFG.MERGE_RESERVE_MS || 150000)) {
    // این «تلاش» نبود، فقط وقتِ کم بود؛ پس به پای گروه نوشته نمی‌شود.
    st.mergeTry = Math.max(0, Number(st.mergeTry) - 1);
    st.mergeWaits = (Number(st.mergeWaits) || 0) + 1;
    save();
    if (st.mergeWaits > 3) return giveUp('وقتِ کافی نرسید');
    sched(30 * 1000);
    logLine_(label + ': ادغام صدا به اجرای بعد موکول شد (وقتِ این اجرا کم بود).');
    return { done: false };
  }
  save();
  // ── مسلح‌کردنِ تریگر پیش از کارِ سنگین ──
  try { sched(6 * 60 * 1000); } catch (eS) {}

  var one = null, why = '';
  try { one = mergeGroupOne_(st.files, st.mergePlan, gi, baseName, folder); }
  catch (eM) { why = eM.message; }
  if (!one) {
    // ادغامِ نیمه‌کاره بدتر از بی‌ادغام است (اگر یکی از فایل‌های یکجا نباشد،
    // دقایقی از قسمت در ارسال گم می‌شود)، پس یا همه یا هیچ. ولی «هیچ» را با
    // یک خطای گذرا نمی‌پذیریم: یک تایم‌اوتِ درایو روی خواندنِ بیست مگابایت
    // چیزِ نادری نیست و نباید شنونده را به هفت تکهٔ کوتاه محکوم کند. همان
    // شمارندهٔ دو-تلاش این‌جا هم کار می‌کند.
    if (Number(st.mergeTry) >= 2) {
      return giveUp('چسباندنِ فایلِ ' + (gi + 1) + ' ناموفق' + (why ? ': ' + why : ''));
    }
    save();
    sched(60 * 1000);
    logLine_(label + ': چسباندنِ فایلِ ' + (gi + 1) + ' ناموفق' + (why ? ' (' + why + ')' : '') +
             '؛ یک بار دیگر تلاش می‌شود.');
    return { done: false };
  }

  st.mergeOut = (st.mergeOut || []).concat([one]);
  st.mergeIdx = gi + 1;
  // شمارنده‌ها با هر گروهِ موفق صفر می‌شوند. «مهلتِ کم» یک ویژگیِ اجراست نه
  // ویژگیِ قسمت؛ اگر بودجه‌اش بین گروه‌ها انباشته شود، چهارمین موکول‌کردن
  // سه فایلِ آمادهٔ هشتاد مگابایتی را دور می‌ریزد.
  st.mergeAt = -1; st.mergeTry = 0; st.mergeWaits = 0;
  save();
  if (st.mergeIdx < st.mergePlan.length) {
    sched(20 * 1000);
    logLine_(label + ': فایلِ یکجای ' + st.mergeIdx + ' از ' + st.mergePlan.length +
             ' ساخته شد؛ ادامه در اجرای بعد.');
    return { done: false };
  }
  st.merged = st.mergeOut.length ? st.mergeOut : null;
  save();
  return { done: true };
}

/** سازگاری با کدِ قدیم و آزمون‌ها: همان ادغامِ یک‌فایلی. */
function mergeParts_(files, baseName, folder) {
  var list = mergeGroups_(files, baseName, folder);
  return (list && list.length === 1) ? list[0] : (list || null);
}

/** فهرستِ فایل‌های «یکجا» را از حالتِ ذخیره‌شده بیرون می‌کشد — چه آرایه باشد چه
 *  یک شیءِ تنها (وضعیتِ نیمه‌تمامی که با نسخهٔ قبلی نوشته شده). */
function mergedList_(m) {
  if (!m) return [];
  if (Array.isArray(m)) return m.filter(function (x) { return x && x.url; });
  return m.url ? [m] : [];
}

function secondsOf_(bytes) { return Math.round(bytes / (CFG.SAMPLE_RATE * 2)); }
function mmss_(sec) {
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

// -------------------------------------------------------------- انتخاب محتوا

/**
 * آمار سبک یک تب: فقط ستون‌های باریک (نوع، امتیاز، وضعیت استفاده) خوانده می‌شوند،
 * نه متن‌های بلند. بدون این کار، خواندن یک آرشیو ده‌هزارتایی حافظه را پر می‌کرد.
 */
/**
 * آستانهٔ ورود، وابسته به نوع. عکس بارِ متنیِ سبک‌تری دارد پس آستانهٔ کمتری
 * می‌خواهد؛ صدا و سند برعکس، متنِ بسیار غنی دارند و با آستانهٔ کامل سنجیده می‌شوند.
 */
function floorFor_(kind, base) {
  if (kind === 'عکس') return Math.min(base, CFG.MIN_PRIORITY_PHOTO);
  return base;
}

function tabStats_(hub, title, minScore, wantUsed) {
  var sh = hub.getSheetByName(title);
  if (!sh || sh.getLastRow() < 2) return { sheet: null, rows: [] };
  var n = sh.getLastRow() - 1;
  var head = sh.getRange(2, COL.KIND, n, 2).getValues();      // نوع، تاریخ منبع
  // امتیاز، لینک، قسمت، تاریخ استفاده، وضعیت لینک، رد در گزینش، تاریخ افزوده‌شدن
  var meta = sh.getRange(2, COL.SCORE, n, COL.REFS - COL.SCORE + 1).getValues();
  var IX_USED = COL.USED_EP - COL.SCORE, IX_REJ = COL.REJECT - COL.SCORE,
      IX_ADD = COL.ADDED - COL.SCORE, IX_REF = COL.REFS - COL.SCORE;
  var now = new Date().getTime();
  var rows = [];
  for (var i = 0; i < n; i++) {
    var score = Number(meta[i][0]) || 0;
    var isUsed = !!meta[i][IX_USED];
    if (wantUsed) {
      // فهرست ارجاع: فقط آیتم‌های استفاده‌شده‌ای که زیادی ارجاع نخورده‌اند
      if (!isUsed) continue;
      if ((Number(meta[i][IX_REF]) || 0) >= CFG.MAX_REFS_PER_ITEM) continue;
    } else {
      if (isUsed) continue;                                   // قبلاً استفاده شده
      if ((Number(meta[i][IX_REJ]) || 0) >= CFG.MAX_REJECTIONS) continue;  // چند بار رد شده
    }
    if (score < floorFor_(head[i][0], minScore)) continue;
    // ردیف‌هایی که با نسخه‌های قبلی افزوده شده‌اند ستون «تاریخ افزوده‌شدن» ندارند؛
    // برای آن‌ها تاریخِ پردازشِ منبع ملاک تازگی است.
    var when = parseWhen_(meta[i][IX_ADD]);
    if (isNaN(when)) when = parseWhen_(head[i][1]);
    var ageDays = isNaN(when) ? 9999 : Math.max(0, (now - when) / 86400000);
    rows.push({ row: i + 2, kind: head[i][0], score: score, ageDays: ageDays,
                fresh: ageDays <= CFG.FRESH_WINDOW_DAYS, used: isUsed,
                refs: Number(meta[i][IX_REF]) || 0 });
  }
  return { sheet: sh, rows: rows };
}

/** واکشی کامل فقط ردیف‌های انتخاب‌شده (نه کل تب) */
function fetchRows_(sh, title, rowNums) {
  var out = [];
  for (var i = 0; i < rowNums.length; i++) {
    var v = sh.getRange(rowNums[i], 1, 1, HUB_HEADERS.length).getValues()[0];
    if (!v[COL.ID - 1]) continue;
    out.push({
      row: rowNums[i], cat: title, id: v[COL.ID - 1], kind: v[COL.KIND - 1],
      date: v[COL.DATE - 1], sub: v[COL.SUB - 1], topic: v[COL.TOPIC - 1],
      msg: v[COL.MSG - 1], summary: v[COL.SUMMARY - 1], body: v[COL.BODY - 1],
      vibe: v[COL.VIBE - 1], score: Number(v[COL.SCORE - 1]) || 0,
      link: v[COL.LINK - 1], used: v[COL.USED_EP - 1], flag: v[COL.FLAG - 1],
      refs: Number(v[COL.REFS - 1]) || 0, parts: v[COL.PARTS - 1] || ''
    });
  }
  return out;
}

/** خواندن داشبورد به‌عنوان فهرست کاری (چهارده ردیف، نه چهل‌ودو هزار) */
function readIndex_(hub) {
  var sh = hub.getSheetByName(CFG.TAB_INDEX);
  if (!sh || sh.getLastRow() < 3) return null;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, INDEX_HEADERS.length).getValues();
  // فقط نام‌های واقعیِ دسته پذیرفته می‌شوند. ردیف «جمع کل» و سطرِ مُهرِ زمانی که
  // پایین داشبورد نوشته می‌شود، وگرنه به‌عنوان دستهٔ جعلی وارد گزارش وضعیت می‌شدند.
  var valid = {};
  for (var t2 = 0; t2 < TAXONOMY.length; t2++) valid[TAXONOMY[t2].title] = true;
  valid[MISC_TITLE] = true;

  var rows = [];
  for (var i = 0; i < vals.length; i++) {
    var name = String(vals[i][IX.CAT] || '').trim();
    if (!name || !valid[name]) continue;
    rows.push({
      name: name,
      elig: Number(vals[i][IX.ELIG]) || 0,
      fresh: Number(vals[i][IX.FRESH]) || 0,
      nV: Number(vals[i][IX.V]) || 0,
      nP: Number(vals[i][IX.P]) || 0,
      nA: Number(vals[i][IX.A]) || 0,
      nD: Number(vals[i][IX.D]) || 0
    });
  }
  return rows.length ? rows : null;
}

/**
 * فهرست نامزدها را با دو سهمیه می‌سازد: تازه در برابر انباشته، و ویدیو در برابر عکس.
 * سهمیهٔ نوع لازم است چون ویدیوها ذاتاً امتیاز بالاتری می‌گیرند (متن گفتار بلندتر
 * دارند و شش امتیاز پاداش نوع)، پس انتخاب صرفاً بر پایهٔ امتیاز، فهرستی تقریباً
 * تماماً ویدیویی می‌سازد و تضمین تلفیق چیزی برای برداشتن پیدا نمی‌کند.
 */
function buildCandidates_(rows) {
  var byScore = function (a, b) { return b.score - a.score; };
  var pool = {}, k, i;
  for (i = 0; i < KINDS.length; i++) pool[KINDS[i]] = [];
  for (i = 0; i < rows.length; i++) {
    k = rows[i].kind;
    if (!pool[k]) k = 'عکس';                       // نوعِ ناشناخته
    pool[k].push(rows[i]);
  }
  for (i = 0; i < KINDS.length; i++) pool[KINDS[i]].sort(byScore);

  var N = CFG.CANDIDATES;

  // درون هر نوع، سهم تازه‌ها رعایت می‌شود؛ کمبودِ یکی از تازه یا انباشته
  // از همان نوع جبران می‌شود، نه از نوع دیگر — وگرنه سهمیهٔ نوع می‌شکند.
  function pickType(list, want, skip) {
    if (want <= 0 || !list.length) return [];
    var fresh = [], old = [];
    for (var z = skip || 0; z < list.length; z++) (list[z].fresh ? fresh : old).push(list[z]);
    var wf = Math.min(fresh.length, Math.round(want * CFG.FRESH_SHARE));
    var sel = fresh.slice(0, wf);
    sel = sel.concat(old.slice(0, want - sel.length));
    if (sel.length < want) sel = sel.concat(fresh.slice(wf, wf + (want - sel.length)));
    return sel;
  }

  // سهمیهٔ اولیه از KIND_SHARE، بعد بازتوزیعِ کمبود میان نوع‌هایی که ذخیره دارند
  var want = {}, took = {}, taken = {}, total = 0;
  for (i = 0; i < KINDS.length; i++) {
    k = KINDS[i];
    want[k] = Math.round(N * (CFG.KIND_SHARE[k] || 0));
    took[k] = pickType(pool[k], want[k], 0);
    taken[k] = took[k].length;
    total += took[k].length;
  }
  // کمبود را بین نوع‌های دارا پخش کن (چند دور، چون هر دور ممکن است ته بکشد)
  for (var round = 0; round < KINDS.length && total < N; round++) {
    var gap = N - total, moved = 0;
    for (i = 0; i < KINDS.length && gap > 0; i++) {
      k = KINDS[i];
      var spare = pool[k].length - taken[k];
      if (spare <= 0) continue;
      var add = pickType(pool[k], Math.min(spare, gap), taken[k]);
      took[k] = took[k].concat(add);
      taken[k] += add.length; total += add.length; gap -= add.length; moved += add.length;
    }
    if (!moved) break;
  }

  // درهم‌بافتن نوع‌ها تا سردبیر به‌خاطر ترتیب سوگیری نکند
  var mixed = [], idx = {}, remaining = true;
  for (i = 0; i < KINDS.length; i++) idx[KINDS[i]] = 0;
  while (remaining) {
    remaining = false;
    for (i = 0; i < KINDS.length; i++) {
      k = KINDS[i];
      if (idx[k] < took[k].length) { mixed.push(took[k][idx[k]++]); remaining = true; }
    }
  }
  return mixed;
}

/**
 * انتخاب دسته. رتبه‌بندی از روی داشبورد انجام می‌شود و فقط تبِ برنده کامل خوانده
 * می‌شود — وگرنه پیش از تولید هر قسمت باید کل آرشیو اسکن می‌شد.
 */
function pickCategory_(hub) {
  var recent = (props_().getProperty(PK.LAST_CATS) || '').split('|').filter(String);
  var idx = readIndex_(hub);
  if (!idx) { rebuildIndex_(hub); idx = readIndex_(hub); }
  if (!idx) return null;

  var ranked = [];
  for (var i = 0; i < idx.length; i++) {
    var r = idx[i];
    if (r.name === 'بایگانی فنی و اسکرین‌شات') continue;   // ارزش تحریریه‌ای ندارد
    if (r.elig < 5) continue;
    var penalty = recent.indexOf(r.name);
    // سهم انباشته سقف دارد تا دستهٔ بزرگ صرفاً به‌خاطر بزرگی همیشه برنده نشود
    var s = Math.min(r.elig, 300) + r.fresh * 8 - (penalty === -1 ? 0 : (penalty + 1) * 60);
    ranked.push({ name: r.name, s: s });
  }
  ranked.sort(function (a, b) { return b.s - a.s; });
  if (!ranked.length) {
    for (var f = 0; f < idx.length; f++) if (idx[f].elig >= 3) ranked.push({ name: idx[f].name, s: 0 });
  }
  if (!ranked.length) return null;

  // فقط تبِ برنده خوانده می‌شود؛ اگر خالی از آب درآمد، سراغ بعدی
  for (var t = 0; t < Math.min(3, ranked.length); t++) {
    var st = tabStats_(hub, ranked[t].name, CFG.MIN_PRIORITY);
    if (st.rows.length < 5) continue;
    var picked = buildCandidates_(st.rows);
    var items = fetchRows_(st.sheet, ranked[t].name, picked.map(function (x) { return x.row; }));
    if (items.length < 4) continue;
    var freshN = 0;
    for (var z = 0; z < st.rows.length; z++) if (st.rows[z].fresh) freshN++;

    // فهرست ارجاع: آیتم‌های قبلاً استفاده‌شدهٔ همین دسته، برای بستنِ پیوند با گذشته
    var refs = [];
    try {
      var used = tabStats_(hub, ranked[t].name, 0, true);
      if (used.rows.length) {
        used.rows.sort(function (a, b) {
          if (a.refs !== b.refs) return a.refs - b.refs;      // کم‌ارجاع‌ترها اول
          return b.score - a.score;
        });
        refs = fetchRows_(used.sheet, ranked[t].name,
                 used.rows.slice(0, CFG.REF_CANDIDATES).map(function (x) { return x.row; }));
      }
    } catch (eRef) { logLine_('ساخت فهرست ارجاع ناموفق: ' + eRef.message); }

    return { title: ranked[t].name, stats: st, items: items, refs: refs, freshCount: freshN };
  }
  return null;
}

// --------------------------------------------------- یکتاسازی و تضمین تلفیق

/**
 * یک فایل فقط یک بار. شیت منبعِ عکس بعضی فایل‌ها را چندین بار پردازش کرده و
 * ردیف‌های تقریباً یکسان ساخته؛ بهترین ردیفِ هر فایل نگه داشته می‌شود.
 */
function dedupeById_(items) {
  var uniq = [], seen = {};
  for (var i = 0; i < items.length; i++) {
    var fid = String(items[i].id);
    if (seen[fid]) continue;
    seen[fid] = true;
    uniq.push(items[i]);
  }
  return uniq;
}

/**
 * «اثر انگشتِ متنی» یک آیتم: مجموعهٔ چهارتایی‌های واژگانی (shingle).
 * چرا چهارتایی و نه تک‌واژه: دو سخنرانیِ متفاوت دربارهٔ یک موضوع، واژه‌های
 * مشترکِ فراوان دارند و با معیارِ تک‌واژه به‌غلط «یکی» شمرده می‌شوند. ولی
 * دنبالهٔ چهار واژهٔ پشت‌سرهم تقریباً هیچ‌وقت تصادفی تکرار نمی‌شود — مگر آنکه
 * واقعاً همان متن باشد.
 */
function itemTokens_(x) {
  var w = txNorm([x.topic, x.msg, x.summary, x.body].join(' '))
            .replace(/[^؀-ۿa-z0-9 ]/g, ' ').split(/\s+/)
            .filter(function (t) { return t.length > 1; });
  var set = {}, n = 0;
  for (var i = 0; i + 4 <= w.length && n < 600; i++) {
    var sh = w[i] + ' ' + w[i + 1] + ' ' + w[i + 2] + ' ' + w[i + 3];
    if (!set[sh]) { set[sh] = true; n++; }
  }
  return { set: set, size: n };
}

/**
 * حذف تکراریِ محتوایی.
 * دو فایلِ متفاوت می‌توانند رونوشتِ یک سخنرانیِ واحد باشند — همان اتفاقی که در
 * قسمت اول افتاد: دو ویدیو با دو شناسهٔ متفاوت، هر دو «ما با یهود دو جنگ
 * داریم…»، و هر دو در یک بخش استناد شدند. حذف تکراری بر پایهٔ شناسهٔ فایل
 * این را نمی‌گیرد؛ همپوشانیِ واژگانی می‌گیرد.
 */
function dedupeSimilar_(items, threshold) {
  threshold = threshold || CFG.DUP_TOKEN_OVERLAP || 0.6;
  var keep = [], toks = [];
  for (var i = 0; i < items.length; i++) {
    var ti = itemTokens_(items[i]);
    var dup = -1;
    if (ti.size >= 20) {
      for (var j = 0; j < keep.length; j++) {
        if (toks[j].size < 20) continue;
        var hit = 0;
        for (var w in ti.set) if (ti.set.hasOwnProperty(w) && toks[j].set[w]) hit++;
        // ژاکار (اشتراک بر اجتماع)، نه اشتراک بر کوچک‌تر: با معیارِ دوم، یک
        // آیتمِ کوتاه که تکه‌ای از یک آیتم بلند است صددرصد شبیه شمرده می‌شد.
        var ratio = hit / (ti.size + toks[j].size - hit);
        if (ratio >= threshold) { dup = j; break; }
      }
    }
    if (dup === -1) { keep.push(items[i]); toks.push(ti); continue; }
    // نسخهٔ پرامتیازتر می‌ماند
    if ((items[i].score || 0) > (keep[dup].score || 0)) { keep[dup] = items[i]; toks[dup] = ti; }
  }
  return keep;
}

/** نوعِ یک آیتم، همیشه یکی از چهار نوعِ شناخته‌شده. */
function kindOf_(x) {
  var k = x && x.kind ? String(x.kind) : '';
  return KINDS.indexOf(k) === -1 ? 'عکس' : k;
}

/**
 * تضمین تلفیقِ چهار نوع و محدودکردن به تعداد هدف.
 * حداقلِ هر نوع فقط وقتی اعمال می‌شود که آن نوع در فهرست نامزدهای همین دسته
 * واقعاً موجود باشد؛ دسته‌ای که سند ندارد نباید به‌خاطرش ناقص شود.
 */
function enforceMix_(list, pool, N) {
  list = dedupeById_(list);
  var inList = {}, i, k;
  for (i = 0; i < list.length; i++) inList[String(list[i].id)] = true;

  function count(kind) {
    var c = 0;
    for (var j = 0; j < list.length; j++) if (kindOf_(list[j]) === kind) c++;
    return c;
  }
  function availableIn(kind) {
    for (var j = 0; j < pool.length; j++) if (kindOf_(pool[j]) === kind) return true;
    return false;
  }
  function topUp(kind, need) {
    for (var j = 0; j < pool.length && need > 0; j++) {
      var x = pool[j];
      if (inList[String(x.id)]) continue;
      if (kindOf_(x) !== kind) continue;
      list.push(x); inList[String(x.id)] = true; need--;
    }
  }

  var minK = {
    'ویدیو': CFG.MIN_KIND_ITEMS && CFG.MIN_KIND_ITEMS['ویدیو'] !== undefined
             ? CFG.MIN_KIND_ITEMS['ویدیو'] : CFG.MIN_VIDEO_ITEMS,
    'عکس':  CFG.MIN_KIND_ITEMS && CFG.MIN_KIND_ITEMS['عکس'] !== undefined
             ? CFG.MIN_KIND_ITEMS['عکس'] : CFG.MIN_PHOTO_ITEMS,
    'صدا':  (CFG.MIN_KIND_ITEMS || {})['صدا'] || 0,
    'سند':  (CFG.MIN_KIND_ITEMS || {})['سند'] || 0
  };
  for (i = 0; i < KINDS.length; i++) {
    k = KINDS[i];
    if (!minK[k] || !availableIn(k)) continue;
    topUp(k, minK[k] - count(k));
  }

  if (list.length > N) {
    // اگر لازم شد کوتاه کنیم، اول حداقلِ هر نوعِ موجود را بردار، بعد بقیه را
    // به ترتیبِ فهرست پر کن — این‌طور هیچ نوعی به‌خاطر بریدن حذف نمی‌شود.
    var byKind = {}, keep = [], kept = {};
    for (i = 0; i < KINDS.length; i++) byKind[KINDS[i]] = [];
    for (i = 0; i < list.length; i++) byKind[kindOf_(list[i])].push(list[i]);
    for (i = 0; i < KINDS.length; i++) {
      k = KINDS[i];
      var q = Math.min(byKind[k].length, minK[k] || 0);
      for (var z = 0; z < q && keep.length < N; z++) {
        keep.push(byKind[k][z]); kept[String(byKind[k][z].id)] = true;
      }
    }
    for (i = 0; i < list.length && keep.length < N; i++) {
      if (kept[String(list[i].id)]) continue;
      keep.push(list[i]); kept[String(list[i].id)] = true;
    }
    list = keep;
  }
  return list;
}

/** انتخاب صرفاً بر پایهٔ امتیاز — پشتیبانِ زمانی که گزینشِ تحریریه‌ای در دسترس نباشد */
function selectItems_(items) {
  var sorted = dedupeById_(items.slice().sort(function (a, b) { return b.score - a.score; }));
  return enforceMix_(sorted.slice(0, CFG.ITEMS_PER_EPISODE), sorted, CFG.ITEMS_PER_EPISODE);
}

// ------------------------------------------------------- گزینش تحریریه‌ای

var CURATE_SCHEMA = {
  type: 'object',
  properties: {
    threads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          thread: { type: 'string' },
          strength: { type: 'string' },
          memberIds: { type: 'array', items: { type: 'string' } }
        },
        required: ['thread', 'memberIds']
      }
    },
    theme: { type: 'string' },
    connection: { type: 'string' },
    chosen: {
      type: 'array',
      items: { type: 'object',
               properties: { id: { type: 'string' }, role: { type: 'string' } },
               required: ['id'] }
    },
    referenceIds: { type: 'array', items: { type: 'string' } },
    rejected: { type: 'array', items: { type: 'string' } }
  },
  required: ['theme', 'connection', 'chosen']
};

/**
 * سردبیر — «نخ» را اول پیدا می‌کند، بعد اعضایش را برمی‌دارد.
 *
 * نسخهٔ قبلی از او می‌خواست ۱۲ آیتم «منسجم» انتخاب کند و بعد نویسنده مجبور بود
 * هر چه به دستش رسید را به هم وصل کند — نتیجه‌اش پیوندهای سرهم‌بندی‌شده بود.
 * اینجا اول چند نخِ ممکن را می‌گوید، قوی‌ترین را می‌چیند، و صریح به او گفته‌ایم
 * که اگر پیوندی واقعی نیست نبندد. همچنین می‌تواند از آیتم‌های قبلاً استفاده‌شده
 * به‌عنوان «حلقهٔ اتصال» استفاده کند تا محتوای تازه به گذشته وصل شود.
 */
function curateItems_(cat, candidates, refPool, orders) {
  function describe(list, tag) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      out.push('- id: ' + c.id + ' | ' + tag + ' | نوع: ' + c.kind +
        '\n  موضوع: ' + String(c.topic).slice(0, 180) +
        '\n  پیام: ' + String(c.msg).slice(0, 170) +
        (c.body ? '\n  از متن خودِ فایل: ' + String(c.body).slice(0, 160) : ''));
    }
    return out.join('\n');
  }

  var prompt = [
    'تو سردبیرِ یک برنامهٔ رادیوییِ فارسی هستی. کارَت این نیست که چند آیتمِ خوب انتخاب کنی؛',
    'کارَت این است که «نخِ مشترک» را پیدا کنی.',
    '',
    'دستهٔ کاری: «' + cat + '»',
    '',
    instructionBlock_(filterOrders_(orders, ['گزینش', 'محتوا', 'تنوع', 'تکرار']),
      'اصلاح‌های خواسته‌شده از بازبینیِ قسمت قبل — این‌ها بر قاعده‌های زیر مقدم‌اند:'),
    'مرحله به مرحله:',
    '',
    '۱) در فیلد threads، دو تا چهار نخِ ممکن را بنویس. نخ یعنی چیزی که واقعاً چند آیتم را',
    '   به هم می‌بندد: یک پرسش مشترک، یک تضادِ آشکار، یک سیرِ زمانی، یک مفهومِ تکرارشده،',
    '   یک نامِ مشترک. برای هر نخ، شناسهٔ آیتم‌هایی که واقعاً عضوش هستند را بیاور',
    '   و در strength بگو چقدر محکم است.',
    '',
    '۲) قوی‌ترین نخ را انتخاب کن و در theme بنویس. در connection دقیقاً توضیح بده',
    '   پیوند از کجا می‌آید — به کدام واژه، کدام نام، کدام تضاد؟ اگر نتوانستی این را',
    '   در یک جملهٔ مشخص بگویی، یعنی نخ واقعی نیست؛ نخِ دیگری بردار.',
    '',
    '۳) در chosen اعضای همان نخ را بیاور، بین ' + Math.max(7, CFG.ITEMS_PER_EPISODE - 4) +
      ' تا ' + (CFG.ITEMS_PER_EPISODE + 2) + ' آیتم.',
    '   برای هر کدام در role بنویس نقشش در روایت چیست (مثلاً «نقطهٔ شروع»، «مثالِ مخالف»،',
    '   «نمونهٔ عینی»، «جمع‌بندی»). ترکیبی از نوع‌های مختلف بردار — ویدیو، عکس،',
    '   فایل صوتی و سند — نه همه از یک نوع.',
    '',
    '۴) در referenceIds حداکثر ' + CFG.MAX_REFS_IN_EPISODE + ' آیتم از فهرستِ «قبلاً پخش‌شده»',
    '   انتخاب کن — فقط اگر واقعاً به بستنِ همین نخ کمک می‌کنند. این‌ها موضوعِ اصلی نیستند؛',
    '   قرار است روایت با یک اشارهٔ کوتاه به آن‌ها، محتوای تازه را به چیزی که قبلاً گفته شده وصل کند.',
    '   اگر کمکی نمی‌کنند، خالی بگذار.',
    '',
    '۵) در rejected شناسهٔ آیتم‌هایی که کنار گذاشتی را بیاور، بدون توضیح.',
    '',
    'قاعدهٔ سخت — این مهم‌ترین دستور است:',
    'پیوند را نساز؛ پیدا کن. اگر دو آیتم واقعاً به هم مربوط نیستند، با عبارت‌هایی مثل',
    '«و از سوی دیگر» یا «این ما را می‌رساند به» به‌زور به هم وصلشان نکن. بهتر است',
    'قسمت هشت آیتمِ واقعاً هم‌خانواده داشته باشد تا دوازده آیتم با چسبِ کلامی.',
    'آیتمی که در نخ جا نمی‌شود را رد کن، حتی اگر خودش خوب باشد.',
    '',
    'قاطعانه رد کن: اسکرین‌شات رابط کاربری و فهرست فایل، صفحهٔ پروفایل و اطلاعات تماس،',
    'تبلیغ محصول، آیتمی که تحلیلش برای گفتنِ حرفِ درست کافی نیست، و آیتمی که',
    'با آیتم دیگرِ همین فهرست تقریباً یکی است.',
    '',
    'شناسه‌ها را عیناً و بدون تغییر برگردان.',
    '',
    '--- آیتم‌های تازه (نامزدِ موضوع اصلی) ---',
    describe(candidates, 'نامزد'),
    '',
    '--- آیتم‌های قبلاً پخش‌شده (فقط برای پیوند، نه موضوع اصلی) ---',
    (refPool && refPool.length ? describe(refPool, 'پخش‌شده') : '(موردی نیست)')
  ].join('\n');

  var res = geminiText_(prompt, CURATE_SCHEMA, 32768);

  var byId = {}, refById = {};
  for (var b = 0; b < candidates.length; b++) byId[String(candidates[b].id)] = candidates[b];
  for (var q = 0; q < (refPool || []).length; q++) refById[String(refPool[q].id)] = refPool[q];

  var chosen = [], seen = {};
  var ch = res.chosen || [];
  for (var k = 0; k < ch.length; k++) {
    var id = String(ch[k].id || '').trim();
    if (!byId[id] || seen[id]) continue;          // شناسهٔ ساختگی یا تکراری را نپذیر
    seen[id] = true;
    byId[id].role = ch[k].role || '';
    chosen.push(byId[id]);
  }

  var references = [];
  var rf = res.referenceIds || [];
  for (var m = 0; m < rf.length && references.length < CFG.MAX_REFS_IN_EPISODE; m++) {
    var rid = String(rf[m] || '').trim();
    if (refById[rid] && !seen[rid]) { seen[rid] = true; references.push(refById[rid]); }
  }

  var rejected = [];
  var rj = res.rejected || [];
  for (var z = 0; z < rj.length; z++) {
    var xid = String(typeof rj[z] === 'string' ? rj[z] : (rj[z] && rj[z].id) || '').trim();
    if (byId[xid] && !seen[xid]) rejected.push(byId[xid]);
  }

  return { theme: res.theme || '', connection: res.connection || '',
           threads: res.threads || [], chosen: chosen,
           references: references, rejected: rejected };
}

/** شمارندهٔ ارجاع: آیتمی که به‌عنوان حلقهٔ اتصال آمده، «استفاده‌شده» دوباره نمی‌شود
 *  ولی شمارشش بالا می‌رود تا برای همیشه تکرار نشود. */
function bumpRefs_(hub, refs) {
  if (!refs || !refs.length) return;
  var byCat = Object.create(null);
  for (var i = 0; i < refs.length; i++) (byCat[refs[i].cat] = byCat[refs[i].cat] || []).push(refs[i]);
  for (var cat in byCat) {
    if (!Object.prototype.hasOwnProperty.call(byCat, cat)) continue;
    var sh = hub.getSheetByName(cat);
    if (!sh || sh.getLastRow() < 2) continue;
    var n = sh.getLastRow() - 1;
    var col = sh.getRange(2, COL.REFS, n, 1).getValues();
    var touched = false, list = byCat[cat];
    for (var j = 0; j < list.length; j++) {
      var idx = list[j].row - 2;
      if (idx < 0 || idx >= n) continue;
      col[idx][0] = (Number(col[idx][0]) || 0) + 1;
      touched = true;
    }
    if (touched) sh.getRange(2, COL.REFS, n, 1).setValues(col);
  }
}

/** شمارندهٔ ردشدن را برای آیتم‌هایی که سردبیر کنار گذاشت، یکی بالا می‌برد. */
function bumpRejections_(hub, rejected) {
  if (!rejected || !rejected.length) return;
  var byCat = Object.create(null);
  for (var i = 0; i < rejected.length; i++) {
    (byCat[rejected[i].cat] = byCat[rejected[i].cat] || []).push(rejected[i]);
  }
  for (var cat in byCat) {
    if (!Object.prototype.hasOwnProperty.call(byCat, cat)) continue;
    var sh = hub.getSheetByName(cat);
    if (!sh || sh.getLastRow() < 2) continue;
    var list = byCat[cat];
    // یک خواندن و یک نوشتن برای کل ستون، به‌جای دو تماس به ازای هر آیتم
    var n = sh.getLastRow() - 1;
    var col = sh.getRange(2, COL.REJECT, n, 1).getValues();
    var touched = false;
    for (var j = 0; j < list.length; j++) {
      var idx = list[j].row - 2;
      if (idx < 0 || idx >= n) continue;
      col[idx][0] = (Number(col[idx][0]) || 0) + 1;
      touched = true;
    }
    if (touched) sh.getRange(2, COL.REJECT, n, 1).setValues(col);
  }
}

// ------------------------------------------------------------------ نگارش

var EPISODE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    hook: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          narration: { type: 'string' },
          tone: { type: 'string' },
          sourceIds: { type: 'array', items: { type: 'string' } },
          // «مشاهدهٔ ضروری»: جایی که صوت و متن نمی‌توانند منبع را کامل منتقل
          // کنند و بیننده باید خودش ببیند. همهٔ فیلدها رشته‌اند (قاعدهٔ
          // responseSchema این حساب: نوعِ غیررشته‌ای با HTTP 400 رد می‌شود).
          mustSee: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string' },   // شناسهٔ همان آیتمِ منبع
                where: { type: 'string' },    // بازهٔ دقیق، فقط اگر در دادهٔ منبع آمده
                why: { type: 'string' },      // چرا دیدنش ضروری است
                benefit: { type: 'string' }   // دیدنش چه می‌دهد
              },
              required: ['source', 'why']
            }
          }
        },
        required: ['heading', 'narration', 'tone', 'sourceIds']
      }
    },
    outro: { type: 'string' },
    summary: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    // ۶٫۲۱ — آیتمی که در دستهٔ غلط نشسته. نویسنده تنها کسی است که *همهٔ* متنِ
    // آیتم را می‌خوانَد، پس تنها کسی است که می‌تواند بگوید برچسبِ بایگانی با
    // محتوا نمی‌خوانَد. این یک فراخوانِ تازه نمی‌خواهد — همان‌جا که دارد
    // می‌خوانَد، می‌نویسدش.
    misfiled: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },       // شناسهٔ آیتم
          should: { type: 'string' },   // دسته‌ای که به‌نظرش درست است
          why: { type: 'string' }
        },
        required: ['id', 'should']
      }
    }
  },
  required: ['title', 'hook', 'sections', 'outro', 'summary']
};

/**
 * وارسی شناسه‌های منبع در متنِ نوشته‌شده.
 * مدل گاهی شناسه‌ای می‌سازد که در فهرست نبوده. اگر دست‌نخورده بماند، جدولِ
 * «منبع این بخش» در ایمیل بی‌صدا خالی می‌ماند و ما هم هرگز نمی‌فهمیم.
 * این‌جا شناسه‌های ناشناخته حذف و در گزارش ثبت می‌شوند.
 */
function scrubSourceIds_(ep, items, refs) {
  var known = {}, i, j;
  for (i = 0; i < (items || []).length; i++) known[String(items[i].id)] = true;
  for (i = 0; i < (refs || []).length; i++) known[String(refs[i].id)] = true;

  var bad = [], empties = 0;
  for (i = 0; i < ep.sections.length; i++) {
    var ids = ep.sections[i].sourceIds || [], keep = [];
    for (j = 0; j < ids.length; j++) {
      var id = String(ids[j]).trim();
      if (known[id]) keep.push(id);
      else if (id) bad.push(id);
    }
    ep.sections[i].sourceIds = keep;
    if (!keep.length) empties++;
    // mustSee هم باید به منبعِ واقعی اشاره کند؛ شناسهٔ خیالی یعنی جعبهٔ
    // «مشاهدهٔ ضروری» به هیچ‌جا لینک می‌شد و اعتماد را می‌سوزاند.
    var ms = ep.sections[i].mustSee;
    if (ms && ms.length) {
      var keepMs = [];
      for (j = 0; j < ms.length; j++) {
        var m = ms[j] || {};
        if (m && known[String(m.source || '').trim()]) keepMs.push(m);
        else if (m && m.source) bad.push('mustSee:' + m.source);
      }
      ep.sections[i].mustSee = keepMs;
    }
  }
  if (bad.length) {
    logLine_('هشدار وفاداری: ' + bad.length + ' شناسهٔ منبع در متن قسمت وجود خارجی نداشت و ' +
             'حذف شد (' + bad.slice(0, 3).join('، ') + (bad.length > 3 ? ' و…' : '') + ').');
  }
  if (empties) {
    logLine_('هشدار وفاداری: ' + empties + ' بخش از قسمت بدون هیچ منبعِ معتبری ماند.');
  }
  return { invalid: bad.length, sectionsWithoutSource: empties };
}

/**
 * آیتم‌هایی که نویسنده گفت در دستهٔ غلط نشسته‌اند → یافته، نه فقط سیاهه.
 *
 * ══ چرا این راه ══
 * گزارشِ کاربر: خاطره‌ای ترسناک (پیرزنی که جایش را در تاکسی می‌خواهد و
 * آخرش معلوم می‌شود اصلاً نبوده) به‌عنوان «کمکِ اجتماعی» خوانده شد. حدسِ
 * خودش هم درست بود: «شاید چون محتواها در شیت‌ها در دسته‌های اشتباه رفتن،
 * مدل بر اساس آن دسته می‌بیند و محتوا را درست درک نمی‌کند».
 *
 * نویسنده تنها کسی است که *کلِ* متنِ هر آیتم را می‌خوانَد — سردبیر خلاصه
 * می‌بیند و اسکریپتِ منبع فقط یک بار، موقعِ دسته‌بندی. پس ارزان‌ترین جای
 * ممکن برای این تشخیص، همان فراخوانی است که همین حالا دارد انجام می‌شود.
 *
 * و عمداً فقط *گزارش* می‌شود: جابه‌جاییِ سطر بین تب‌ها یعنی حذف و درج، و
 * قاعدهٔ صریحِ صاحبِ برنامه این است که تحلیل‌های قبلی به هیچ وجه خراب و پاک
 * نشوند. یافته‌ای که ناظر ببیند، امن‌تر از جابه‌جاییِ خودکاری است که یک بار
 * غلط بزند و ردیفِ تحلیل‌شده را ببرد.
 */
function misfiledReport_(hub, ep, epNum, cat, items) {
  var list = (ep && ep.misfiled) || [];
  if (!list.length) return 0;
  var known = {};
  for (var k = 0; k < (items || []).length; k++) known[String(items[k].id)] = true;
  var rows = [], n = 0;
  for (var i = 0; i < list.length && rows.length < 8; i++) {
    var m = list[i] || {};
    var id = String(m.id || '').trim();
    var should = String(m.should || '').trim();
    // شناسه‌ای که در آیتم‌های همین قسمت نبوده، حدسِ مدل است نه مشاهده‌اش.
    if (!id || !should || !known[id]) continue;
    if (should === cat) continue;                 // «همین دسته درست است» خبر نیست
    rows.push(id + ' → «' + should + '»' +
              (m.why ? ' (' + String(m.why).replace(/\s+/g, ' ').slice(0, 120) + ')' : ''));
    n++;
  }
  if (!rows.length) return 0;
  try {
    logSelfFinding_(hub, {
      priority: 'متوسط',
      category: 'دسته‌بندیِ محتوا',
      // کلید بر پایهٔ *دسته* است نه قسمت: تکرارِ یک اشتباه در یک دسته همان
      // چیزی است که باید دیده شود، و ردیفِ تازه به‌ازای هر قسمت آن تکرار را
      // پنهان می‌کند — همان درسِ «خانوادهٔ نامِ فایل» در ۵٫۹۶.
      key: 'misfiled-' + cat,
      title: 'دستهٔ «' + cat + '»: ' + rows.length + ' آیتم به‌نظرِ نویسنده جای دیگری است',
      detail: 'قسمت ' + epNum + ' — ' + rows.join(' · '),
      instruction: 'این ردیف‌ها را در تبِ دسته ببین و اگر واقعاً جابه‌جا شده‌اند، ' +
                   'دسته‌شان را درست کن. ردیفِ تحلیل‌شده را پاک نکن — فقط دسته‌اش ' +
                   'را اصلاح کن. اگر یک دسته مرتب همین اشتباه را دارد، ایراد در ' +
                   'اسکریپتِ منبعِ همان دسته است، نه در تک‌تکِ ردیف‌ها.',
      owner: ROWNER_ENGINE, episode: epNum
    });
  } catch (e) { return 0; }
  logLine_('دسته‌بندی: ' + n + ' آیتم در دستهٔ «' + cat + '» به‌نظرِ نویسنده جای دیگری است.');
  return n;
}

/**
 * بیشترین نویسه‌ای که هنوز در یک فایلِ صوتی جا می‌شود.
 *
 * حدس نیست: از سقفِ ادغام (که خودش از حافظهٔ Apps Script آمده) و نرخِ گفتار
 * حساب می‌شود. اگر روزی سقفِ ادغام عوض شود، این هم خودبه‌خود عوض می‌شود.
 */
/**
 * ══ سقف را دیگر حدس نمی‌زنیم؛ اندازه می‌گیریم (۶٫۲۹) ══
 *
 * `oneFileMaxChars_` تنها از `SPEECH_CHARS_PER_SEC` می‌آمد — عددی که از یک
 * حسابِ سرانگشتی (۱۵۰ واژه در دقیقه × ۵٫۵ نویسه) درآمده بود و هرگز با
 * خروجیِ واقعی سنجیده نشد. اندازه‌گیریِ قسمت ۱۹ درس‌نامه: ۷٬۲۹۷ نویسهٔ گفتنی
 * → ۳۶٬۱۶۱٬۶۰۴ بایت صدا. یعنی ۴۹۵۵ بایت بر نویسه، در حالی که سقفِ ۸۸۹۸
 * نویسه‌ای یعنی فرضِ ۴۰۴۶ — ۲۲٪ خوش‌بینانه. قسمت ۳٫۴ ثانیه از سقفِ ادغام رد
 * شد و دو فایل شد.
 *
 * سه نسخه پیاپی این را از سمتِ *متن* بستند (فشرده‌سازی، رزروِ غنی‌سازی، رزروِ
 * عصری‌سازی) و هر سه درست کار کردند — چون خطا در متن نبود، در واحدِ تبدیل
 * بود. هر سه سقف را با همان ضریبِ غلط حساب می‌کردند.
 *
 * حالا واحدِ تبدیل از خروجیِ خودِ قسمت‌ها می‌آید: بایتِ نهاییِ صدا تقسیم بر
 * نویسهٔ متنِ گفتنی. **بایت، نه ثانیه** — چون چیزی که سقف دارد بایت است، و
 * این تعریف موسیقی و مکث و هر چیز دیگری را که در فایل می‌نشیند خودبه‌خود
 * درون خودش دارد. میانه گرفته می‌شود نه میانگین: یک قسمتِ ناقص نباید سقفِ
 * فردا را جابه‌جا کند.
 */
function speechCalibList_() {
  try {
    var raw = props_().getProperty(PK.SPEECH_CAL);
    var L = raw ? JSON.parse(raw) : [];
    return (L instanceof Array) ? L : [];
  } catch (e) { return []; }
}

/**
 * شمارِ نویسه‌های *گفتنیِ* یک قسمت — و **به همان واحدی که سقف با آن می‌سنجد**.
 *
 * ══ چرا نه از روی امضای بخش‌های صوتی ══
 * نسخهٔ اول این تابع طول را از `ep.__speakSegs[i].h` می‌خواند، چون آن آرایه
 * «دقیقاً همان چیزی است که خوانده شد». درست بود و به همین دلیل هم غلط بود:
 * آن عدد طولِ *پوستهٔ مقایسه* است (`speakCmp_`)، که فاصله‌های دو طرفِ نشانه
 * را می‌خورد. یعنی همان متن، در آن واحد کوتاه‌تر شمرده می‌شود — و اندازه‌گیریِ
 * «بایت بر نویسه» بزرگ‌تر درمی‌آید، پس سقف کوچک‌تر از آنچه باید.
 *
 * اندازه‌گیری روی نمونهٔ پرنشانه: خام ۶۲۳، از امضا ۴۶۵ — ۲۵٪ اختلاف. روی
 * نثرِ عادی کمتر است، ولی «کمتر» تضمین نیست و به تراکمِ ویرگولِ هر قسمت بند
 * است. سقفی که به چیزی بی‌ربط بند باشد، همان سقفِ حدسی است با ظاهرِ دیگر.
 *
 * پس شمارش دقیقاً از همان‌جایی می‌آید که `specialCondense_` و
 * `explainBudget_` و `fidelityCheck_` می‌شمرند: **متنِ خامِ خودِ قسمت** —
 * به‌علاوهٔ تیکه‌های عصری‌سازی، که پس از نوشتن اضافه می‌شوند ولی خوانده
 * می‌شوند و باید در سقف بیایند.
 */
function speechChars_(ep) {
  var n = 0;
  var add = function (t) { n += String(t || '').length; };
  add(ep && ep.hook); add(ep && ep.intro); add(ep && ep.recap); add(ep && ep.outro);
  // «هدف و انتظار» فقط در درس‌نامه گفته می‌شود؛ بخشِ ۱۴ جلوتر است، پس try.
  try { add(goalSpeech_(ep)); } catch (eG) {}
  var S = (ep && ep.sections) || [];
  for (var i = 0; i < S.length; i++) {
    add(S[i] && S[i].heading); add(S[i] && S[i].narration);
  }
  var X = (ep && ep.__explain && ep.__explain.spots) || [];
  for (var j = 0; j < X.length; j++) add(X[j] && X[j].text);
  return n;
}

/** بایتِ صدا به ازای هر نویسه — اندازه‌گیری‌شده، یا ۰ اگر هنوز نمی‌دانیم. */
function speechBpc_() {
  if (CFG.SPEECH_CALIB === false) return 0;
  var L = speechCalibList_(), v = [];
  for (var i = 0; i < L.length; i++) {
    var x = Number(L[i] && L[i].bpc);
    if (isFinite(x) && x >= (Number(CFG.SPEECH_BPC_MIN) || 2000) &&
        x <= (Number(CFG.SPEECH_BPC_MAX) || 9000)) v.push(x);
  }
  if (v.length < (Number(CFG.SPEECH_CALIB_MIN) || 2)) return 0;
  v.sort(function (a, b) { return a - b; });
  var m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** نرخِ گفتار به نویسه بر ثانیه — اندازه‌گیری‌شده، وگرنه دانهٔ CFG. */
function speechCps_() {
  var bpc = speechBpc_();
  if (bpc > 0) return (((Number(CFG.SAMPLE_RATE) || 24000) * 2) / bpc);
  return Number(CFG.SPEECH_CHARS_PER_SEC) || 13.7;
}

/**
 * و همان نرخ، به **واژه بر دقیقه** — چون پرامپت با واژه حرف می‌زند.
 *
 * ══ چرا این هم باید از یک جا بیاید (۶٫۲۹) ══
 * شش جا در این کد `دقیقه × ۱۵۰` می‌نوشتند و سقف‌ها `نویسه ÷ نرخ`. تا وقتی
 * نرخ ۱۳٫۷ بود این دو تصادفاً یکی درمی‌آمدند (۱۳٫۷ × ۶۰ ≈ ۱۵۰ × ۵٫۵) و
 * هیچ‌کس نفهمید که دو ثابتِ مستقل‌اند. با اصلاحِ نرخ، همان تناقضِ ۵٫۹۰
 * دوباره سر باز کرد: پرامپت ۷٬۱۷۷ نویسه می‌خواست و سقفِ خودش ۵٬۲۴۷ بود.
 * «۱۵۰ واژه در دقیقه» فرضِ گویندهٔ انسانی است، نه اندازه‌گیریِ این گفتارساز.
 */
function speechWpm_() {
  var cw = Number(CFG.CHARS_PER_WORD) || 5.5;
  return Math.max(60, Math.round(speechCps_() * 60 / cw));
}

/**
 * هدفِ *مؤثرِ* «از همه جا از همه رنگ»، به دقیقه — قرینهٔ specialTargetMin_.
 *
 * قسمت ۲۱ این برنامه ۱۲:۴۹ درآمد در برابرِ هدفِ ۱۰ دقیقه و در دو فایل رفت.
 * علتش همان بود: پرامپت ۸٬۲۵۰ نویسه می‌خواست («۱۰ دقیقه × ۱۵۰ واژه») در
 * حالی که یک فایل کمتر از آن جا می‌دهد. برنامهٔ تخصصی از ۵٫۹۰ این نگهبان را
 * داشت و برنامهٔ متنوع نداشت — قرینهٔ نصفه، همان الگویی که ۵٫۹۵ هم دیدیم.
 */
function varietyTargetMin_() {
  var base = Number(CFG.TARGET_MINUTES) || 10;
  var oneFileMin = oneFileMaxChars_() / speechCps_() / 60;
  return Math.max(1, Math.round(Math.min(base, oneFileMin) * 10) / 10);
}

/**
 * ثبتِ اندازه‌گیریِ یک قسمت. بعد از ادغام صدا صدا زده می‌شود، جایی که هم
 * بایتِ واقعی در دست است هم متن.
 *
 * هرگز خطا بالا نمی‌دهد و هرگز مسیرِ انتشار را نگه نمی‌دارد: کالیبراسیون
 * آسایشِ فرداست، نه شرطِ امروز.
 */
function speechCalibRecord_(ep, bytes, label) {
  try {
    if (CFG.SPEECH_CALIB === false) return null;
    var chars = speechChars_(ep), b = Number(bytes) || 0;
    // قسمتِ خیلی کوتاه یا نیمه‌کاره نمونهٔ معتبری نیست.
    if (!(chars > 1500) || !(b > 1000000)) return null;
    var bpc = b / chars;
    if (!isFinite(bpc) || bpc < (Number(CFG.SPEECH_BPC_MIN) || 2000) ||
        bpc > (Number(CFG.SPEECH_BPC_MAX) || 9000)) {
      logLine_('کالیبراسیونِ گفتار رد شد (' + label + '): ' +
               Math.round(bpc) + ' بایت بر نویسه، بیرون از بازهٔ معقول.');
      return null;
    }
    var L = speechCalibList_();
    L.push({ at: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'),
             l: String(label || ''), c: chars, b: b, bpc: Math.round(bpc) });
    var keep = Number(CFG.SPEECH_CALIB_KEEP) || 8;
    while (L.length > keep) L.shift();
    props_().setProperty(PK.SPEECH_CAL, JSON.stringify(L));
    return { chars: chars, bytes: b, bpc: Math.round(bpc) };
  } catch (e) { return null; }
}

/** خطِ روزانهٔ کالیبراسیون — چون چیزی که فقط در Properties بماند دیده نمی‌شود. */
function speechCalibStatus_() {
  var out = { line: '', ok: true, bpc: 0, samples: 0, chars: 0 };
  try {
    var L = speechCalibList_();
    out.samples = L.length;
    out.bpc = Math.round(speechBpc_());
    out.chars = oneFileMaxChars_();
    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (x) { return String(n); } };
    if (!out.bpc) {
      out.line = 'سقفِ یک فایل: ' + fa(out.chars) + ' نویسه — هنوز از فرمولِ تخمینی، ' +
                 fa(out.samples) + ' اندازه‌گیری ثبت شده.';
      return out;
    }
    out.line = 'سقفِ یک فایل: ' + fa(out.chars) + ' نویسه، از اندازه‌گیریِ ' +
               fa(out.samples) + ' قسمتِ اخیر (' + fa(out.bpc) + ' بایت بر نویسه).';
  } catch (e) {}
  return out;
}

function oneFileMaxChars_() {
  var capB = Number(CFG.MERGE_MAX_BYTES) || 33000000;
  // ── مسیرِ اندازه‌گیری‌شده ──
  // بایت بر نویسه از خروجیِ واقعیِ قسمت‌های اخیر می‌آید و موسیقی و مکث را
  // درونِ خودش دارد، پس هیچ کسرِ جداگانه‌ای لازم نیست.
  var bpc = speechBpc_();
  if (bpc > 0) {
    var mg = Number(CFG.ONE_FILE_MARGIN);
    if (!isFinite(mg) || mg <= 0 || mg > 1) mg = 0.94;
    return Math.max(600, Math.floor(capB * mg / bpc));
  }
  var bytesPerSec = (Number(CFG.SAMPLE_RATE) || 24000) * 2;      // ۱۶ بیت، تک‌کاناله
  var seconds = capB / bytesPerSec;
  // جای موسیقی صریح کنار گذاشته می‌شود.
  //
  // تا پیش از این، سقف فقط از روی گفتار حساب می‌شد و موسیقی روی آن سوار
  // می‌شد. اتفاقاً جا می‌شد — حاشیهٔ ۸ درصدی از پسِ نزدیک به سی ثانیه موسیقی
  // برمی‌آمد. ولی «اتفاقاً جا می‌شود» تضمین نیست: کافی بود طولِ آغاز یا فاصلهٔ
  // میانه‌ها عوض شود تا قسمت بی‌صدا دو تکه شود، و دلیلش هم پیدا نبود.
  seconds -= musicBudgetSec_();
  var cps = Number(CFG.SPEECH_CHARS_PER_SEC) || 13.7;   // دانه، نه اندازه‌گیری
  // ۸٪ حاشیه برای مکث‌ها و نفس‌ها، که در نویسه نمی‌آیند ولی وقت می‌گیرند
  return Math.floor(Math.max(seconds, 60) * cps * 0.92);
}

/** بیشترین ثانیه‌ای که موسیقیِ یک قسمت می‌تواند بگیرد. */
function musicBudgetSec_() {
  if (CFG.MUSIC_ENABLED === false) return 0;
  var intro = Number(CFG.MUSIC_INTRO_SEC) || 0;
  var outro = Number(CFG.MUSIC_OUTRO_SEC) || 0;
  var every = Number(CFG.MUSIC_BRIDGE_EVERY) || 0;
  var bSec = Number(CFG.MUSIC_BRIDGE_SEC) || 0;
  var bridges = 0;
  if (every > 0) {
    // تخمینِ شمارِ تکه‌ها از روی سقفِ خامِ گفتار — دقیق نیست و لازم هم نیست،
    // فقط باید دست‌بالا باشد تا بودجه کم نیاید.
    var rawSec = (Number(CFG.MERGE_MAX_BYTES) || 33000000) / (((Number(CFG.SAMPLE_RATE) || 24000) * 2));
    var chunks = Math.ceil((rawSec * (Number(CFG.SPEECH_CHARS_PER_SEC) || 13.7)) /
                           (Number(CFG.TTS_CHUNK_CHARS) || 1100));
    bridges = Math.max(0, Math.floor(chunks / every));
  }
  return intro + outro + bridges * bSec;
}

/** تخمینِ ثانیهٔ گفتار برای یک متن. */
function speechSeconds_(text) {
  var n = String(text || '').length;
  // همان واحدِ تبدیلِ اندازه‌گیری‌شده، وگرنه تخمینِ دقیقه‌ها هم به همان اندازهٔ
  // سقف خوش‌بین می‌ماند و هر گزارشی «کوتاه‌تر از واقع» می‌شود.
  return Math.round(n / speechCps_());
}

/**
 * پاسِ وفاداری، پیش از صداگذاری.
 *
 * روایت را با متنِ منابعِ همان بخش می‌سنجد و هر عبارتِ نقل‌قول‌مانندی را که در
 * هیچ منبعی نیست علامت می‌زند. این دقیقاً همان چیزی است که در قسمت اول لازم
 * بود: کلمهٔ «هدایت» داخل حدیثِ امیرالمؤمنین (ع) گذاشته شده بود در حالی که
 * منبع «هدیه» داشت، و ترکیبِ بی‌معنیِ «فتنه مِلَل» ساخته شده بود.
 *
 * سنجه محافظه‌کارانه است: فقط عبارت‌های داخلِ گیومه و پنج‌کلمه‌ای‌های بلند را
 * می‌بیند، تا هر جملهٔ عادیِ روایت را «دراوردی» اعلام نکند.
 */
/**
 * عبارت‌های «ماستمالی»: قالب‌های آماده‌ای که پیوندِ ساختگی می‌سازند بی آنکه
 * چیزی از خودِ محتواها بگویند. کاربر صریح خواسته بود پیوندِ میان کلیپ‌ها
 * واقعی باشد، نه «به‌زور با عبارات من‌درآوردی».
 */
var FILLER_PAT = [
  /جالب(?:ه|\s+است)\s+که\s+هر\s+دو/,
  /چه\s+ارتباطی\s+دارند؟?\s*شاید/,
  /(?:به\s*نوعی|به\s+نحوی|یه\s*جورایی|یک\s*جورهایی)\s+(?:می\s*شود\s+گفت|میشه\s+گفت|مرتبط)/,
  /در\s+نگاه\s+اول\s+بی\s*ربط\s+(?:به\s*نظر\s+)?(?:می\s*رسند|میان|می\s*آیند)/,
  /اما\s+اگر\s+(?:خوب\s+)?(?:دقت|فکر)\s+کنیم\s*،?\s*(?:هر\s+دو|همه)/,
  /نخِ?\s+نامرئی/,
  /(?:همه\s*ی|همهٔ)\s+این\s*ها\s+در\s+نهایت\s+به\s+یک\s+چیز\s+(?:بر\s*می\s*گردد|برمی\s*گردند)/,
  /سرنخ(?:ی)?\s+که\s+شاید\s+از\s+نظرتان\s+دور\s+مانده\s+باشد/,
  /در\s+دنیای\s+امروز(?=\s)/,
  /بی\s*شک\s+(?:همه\s*ی|همهٔ)\s+ما/
];

/**
 * عبارت‌های «نصیحت‌گری و تفسیرِ بی‌مبنا».
 *
 * شکایتِ صریحِ صاحبِ برنامه: «حس تفسیرگری و نصیحت‌گری دارد و وفادار به دادهٔ
 * خودِ عکس‌ها نیست». FILLER_PAT پیوندِ ساختگی را می‌گرفت، ولی این یکی جنسِ
 * دیگری است: جمله‌ای که از توصیف به پند می‌پرد («درسی که می‌گیریم…»)، یا از
 * یک عکس، حکمی دربارهٔ جامعه و انسان درمی‌آورد («این نشان می‌دهد که ما…»).
 *
 * هیچ‌کدام از این‌ها در دادهٔ منبع نیست — همه افزودهٔ نویسنده‌اند.
 */
var PREACH_PAT = [
  /درس(?:ی)?\s+که\s+(?:می\s*(?:گیریم|توان\s+گرفت)|باید\s+گرفت)/,
  /(?:به\s+)?ما\s+می\s*آموزد/,
  /یاد(?:مان|ت)\s+باشد\s+که/,
  /(?:این|همین)\s+(?:نشان\s+می\s*دهد|یادآورِ?)\s+(?:که\s+)?(?:ما|جامعه|انسان|بشر)/,
  /(?:بیایید|بیاییم)\s+(?:کمی\s+)?(?:فکر\s+کنیم|بیندیشیم|تأمل\s+کنیم|درنگ\s+کنیم)/,
  /(?:باید|بهتر\s+است)\s+(?:بیاموزیم|یاد\s+بگیریم|قدر\s+بدانیم)/,
  /پیامِ?\s+(?:این|همین)\s+(?:تصویر|عکس|ویدیو|کلیپ)\s+(?:این\s+است|روشن\s+است)/,
  /در\s+(?:دنیای|جهانِ?)\s+(?:پرشتابِ?|شلوغِ?|امروزیِ?)\s+(?:ما|امروز)/,
  /(?:شاید|بی\s*شک)\s+(?:همهٔ?|همه\s*ی)\s+ما\s+(?:هم\s+)?(?:روزی|گاهی|زمانی)/,
  /چیزی\s+که\s+(?:اینجا|در\s+این\s+تصویر)\s+می\s*بینیم\s*،?\s*فقط\s+.{0,20}\s*نیست/,
  /(?:حکایتِ?|قصهٔ?)\s+(?:همهٔ?|همه\s*ی)\s+ماست/,
  /به\s+ما\s+یادآوری\s+می\s*کند\s+که/
];

/** همان سنجه، برای جمله‌های پندآموز. */
function preachHits_(text) {
  var t = txNorm(String(text || ''));
  var out = [];
  for (var i = 0; i < PREACH_PAT.length; i++) {
    var m = t.match(PREACH_PAT[i]);
    if (m) out.push(m[0]);
  }
  return out;
}

function fillerHits_(text) {
  var t = txNorm(String(text || ''));
  var out = [];
  for (var i = 0; i < FILLER_PAT.length; i++) {
    var m = t.match(FILLER_PAT[i]);
    if (m) out.push(m[0]);
  }
  return out;
}

/** بخش‌هایی که واقعاً روایت دارند (تهِ بریدهٔ یک پاسخِ ترمیم‌شده شمرده نمی‌شود). */
function fullSections_(ep) {
  var n = 0, ss = (ep && ep.sections) || [];
  for (var i = 0; i < ss.length; i++) if (ss[i] && String(ss[i].narration || '').trim()) n++;
  return n;
}

/** امتیازِ کاملیِ یک متنِ قسمت — برای انتخاب میان تلاش اول و دوم. */
function epScore_(ep) {
  if (!ep) return -1;
  return fullSections_(ep) * 10 +
         (String(ep.outro || '').trim() ? 3 : 0) +
         (String(ep.summary || '').trim() ? 2 : 0) +
         (String(ep.hook || '').trim() ? 1 : 0) -
         (ep.__repaired ? 6 : 0);
}

function fidelityCheck_(ep, items, when, showName, opt) {
  opt = opt || {};
  var byId = {}, allText = '';
  for (var i = 0; i < items.length; i++) {
    var t = txNorm([items[i].topic, items[i].msg, items[i].summary, items[i].body].join(' '));
    byId[String(items[i].id)] = t;
    allText += ' ' + t;
  }
  var flags = [];

  for (var s = 0; s < ep.sections.length; s++) {
    var sec = ep.sections[s];
    var ids = sec.sourceIds || [];
    var scope = '';
    for (var k = 0; k < ids.length; k++) scope += ' ' + (byId[String(ids[k])] || '');
    if (!scope.trim()) scope = allText;      // بخشِ بی‌منبع: با همهٔ منابع بسنج

    var nar = String(sec.narration || '');
    // ۱) عبارت‌های داخل گیومه — یعنی چیزی که به‌عنوان نقل‌قول ارائه شده
    var quoted = nar.match(/[«"']([^»"']{12,220})[»"']/g) || [];
    for (var q = 0; q < quoted.length; q++) {
      var inner = txNorm(quoted[q].replace(/^[«"']|[»"']$/g, ''));
      if (!inner || inner.length < 12) continue;
      if (!phraseSupported_(inner, scope) && !phraseSupported_(inner, allText)) {
        flags.push({ section: sec.heading, kind: 'نقل‌قول', text: inner.slice(0, 160) });
      }
    }
    // ۲) واژه‌های بلندِ غیرفارسی‌نویس یا نویسه‌های عربیِ ناهمخوان
    var arabic = nar.match(/[يكة]/g);
    if (arabic && arabic.length) {
      flags.push({ section: sec.heading, kind: 'نویسهٔ عربی',
                   text: 'در متن ' + arabic.length + ' نویسهٔ عربی (ي/ك/ة) هست که فارسی خوانده نمی‌شود' });
    }
    // ۳) جمله‌های خیلی بلند
    var sents = nar.split(/[.!؟?]+/);
    for (var z = 0; z < sents.length; z++) {
      var wc = sents[z].trim().split(/\s+/).filter(Boolean).length;
      if (wc > CFG.MAX_SENTENCE_WORDS) {
        flags.push({ section: sec.heading, kind: 'جملهٔ بلند',
                     text: wc + ' کلمه: ' + sents[z].trim().slice(0, 120) });
      }
    }
    // ۴) پیوندِ ساختگی با عبارت‌های آماده
    var fl = fillerHits_(nar);
    for (var y = 0; y < fl.length; y++) {
      flags.push({ section: sec.heading, kind: 'پیوند ساختگی', text: fl[y].slice(0, 120) });
    }
    // ۴-ب) پند و تفسیرِ بی‌مبنا — جمله‌ای که از توصیف به نصیحت می‌پرد
    var pr = preachHits_(nar);
    for (var w2 = 0; w2 < pr.length; w2++) {
      flags.push({ section: sec.heading, kind: 'نصیحت‌گری', text: pr[w2].slice(0, 120) });
    }
  }

  // ۵) قلاب و پیوند هم نباید ماستمالی باشند
  // ep.intro / ep.connection در طرحوارهٔ قسمت نیستند؛ جملهٔ پیوندِ سردبیر از
  // بیرون به همین‌جا داده می‌شود تا آن هم وارسی شود.
  var joint = String(ep.hook || '') + ' \n ' + String(ep.connection || '') + ' \n ' +
              String(ep.intro || '') + ' \n ' + String(ep.outro || '');
  var fj = fillerHits_(joint);
  for (var g = 0; g < fj.length; g++) {
    flags.push({ section: 'قلاب/پیوند', kind: 'پیوند ساختگی', text: fj[g].slice(0, 120) });
  }
  var pj = preachHits_(joint);
  for (var g2 = 0; g2 < pj.length; g2++) {
    flags.push({ section: 'قلاب/پیوند', kind: 'نصیحت‌گری', text: pj[g2].slice(0, 120) });
  }

  // ۵-ب) طولِ کل: قسمتی که از سقف بگذرد ناگزیر دو فایل می‌شود.
  // این را همین‌جا علامت می‌زنیم چون تنها جایی است که کلِ متن یکجا در دست است.
  // «انتظارِ یک فایل» برای هر برنامه فرق دارد: «از همه جا از همه رنگ» هدفش ۱۰
  // دقیقه است و باید در یک فایل جا شود؛ «درس‌نامه» هدفش ۱۵ دقیقه است و در این
  // نرخِ نمونه‌برداری اصلاً نمی‌تواند — علامت‌زدنش هر روز، هشدارِ دروغ است.
  if (CFG.ONE_FILE_STRICT !== false && opt.expectOneFile !== false) {
    var allText = String(joint || '');
    for (var q2 = 0; q2 < (ep.sections || []).length; q2++) {
      allText += ' ' + String((ep.sections[q2] || {}).narration || '');
    }
    var capC = oneFileMaxChars_();
    if (allText.length > capC) {
      flags.push({ section: 'کلِ قسمت', kind: 'بلندتر از یک فایل',
                   text: allText.length + ' نویسه در برابرِ سقفِ ' + capC +
                         ' (~' + Math.round(speechSeconds_(allText) / 60) + ' دقیقه) — ' +
                         'صدا در یک فایل جا نمی‌شود و قسمت دو تکه خواهد شد.' });
    }
  }

  // ۶) نامِ برنامه باید در آغاز گفته شود — مثل هر برنامهٔ رادیوییِ واقعی.
  if (showName) {
    var hookOnly = txNorm(String(ep.hook || '') + ' ' + String(ep.intro || ''))
                     .replace(/\u0654/g, '');
    var want = txNorm(String(showName)).replace(/\u0654/g, '');
    // نیم‌فاصله در نامِ برنامه ممکن است در خروجی فاصلهٔ ساده شده باشد
    var loose = function (x) { return String(x).replace(/[\s\u200c]+/g, ''); };
    if (hookOnly.indexOf(want) === -1 && loose(hookOnly).indexOf(loose(want)) === -1) {
      flags.push({ section: 'قلاب/پیوند', kind: 'نام برنامه نیامده',
                   text: 'نامِ «' + showName + '» در آغاز برنامه گفته نشده است' });
    }
  }

  // ۷) تاریخ و روز هفته باید گفته شود (خواستهٔ صریح کاربر). سرِ برنامه را
  // می‌سنجیم، نه کلِ متن — چون قرار بود همان اول شنیده شود.
  if (when && (when.weekday || when.jalali)) {
    // «هٔ» اضافه (دوشنبهٔ نوزدهم) را برمی‌داریم، وگرنه شکلِ درست و رایجِ فارسی
    // «گفته نشده» شمرده می‌شد. txNorm این نویسه (U+0654) را پاک نمی‌کند.
    var deHamza = function (x) { return String(x || '').replace(/\u0654/g, ''); };
    var head = deHamza(txNorm(String(ep.hook || '') + ' ' + String(ep.intro || '') + ' ' +
               ((ep.sections && ep.sections[0]) ? String(ep.sections[0].narration || '') : '')));
    var miss = [];
    if (when.weekday && head.indexOf(deHamza(txNorm(when.weekday))) === -1) miss.push('روز هفته');
    if (when.jalali) {
      // فقط «روز» و «ماه» سنجیده می‌شوند. سال در todayWords_ با حروف نوشته
      // می‌شود («هزار و چهارصد و پنج») و اجبار به گفتنِ کاملِ آن، هر قلابِ
      // درستی را هم علامت می‌زد. واژه‌های یک‌دوحرفی («و») هم کنار می‌روند.
      var jp = deHamza(txNorm(when.jalali)).split(/\s+/)
                 .filter(function (x) { return x.length > 2 && x !== 'و'; }).slice(0, 2);
      var jHit = 0;
      for (var jj = 0; jj < jp.length; jj++) if (head.indexOf(jp[jj]) !== -1) jHit++;
      if (jp.length && jHit < jp.length) miss.push('تاریخ شمسی');
    }
    if (miss.length) {
      flags.push({ section: 'قلاب/پیوند', kind: 'تاریخ نیامده',
                   text: miss.join(' و ') + ' در آغاز برنامه نیامده است (' +
                         String(when.spoken || '').slice(0, 80) + ')' });
    }
  }
  return flags;
}

/**
 * فشرده‌سازیِ یکسانِ متن: واژه‌های کوتاه («را»، «به»، «و») حذف می‌شوند.
 * هر دو طرفِ مقایسه باید از همین صافی رد شوند، وگرنه پنجره‌های پنج‌کلمه‌ایِ
 * نقل‌قول هیچ‌وقت با متنِ منبع جور درنمی‌آیند و هر نقل‌قولِ درستی هم
 * «بی‌پشتوانه» اعلام می‌شود.
 */
function compactWords_(s) {
  return txNorm(String(s || '')).replace(/[^؀-ۿa-z0-9 ]/g, ' ')
    .split(/\s+/).filter(function (x) { return x.length > 2; }).join(' ');
}

/** آیا این عبارت در متنِ منابع پشتیبانی می‌شود؟ (پوششِ پنجره‌های پنج‌کلمه‌ای) */
function phraseSupported_(phrase, scope) {
  var cs = compactWords_(scope);
  var w = compactWords_(phrase).split(' ').filter(Boolean);
  if (w.length < 5) return w.length ? cs.indexOf(w.join(' ')) !== -1 : true;
  var win = 5, total = 0, hit = 0;
  for (var i = 0; i + win <= w.length; i++) {
    total++;
    if (cs.indexOf(w.slice(i, i + win).join(' ')) !== -1) hit++;
  }
  if (!total) return true;
  return (hit / total) >= (CFG.QUOTE_SUPPORT_RATIO || 0.6);
}

/**
 * دستورهای بازِ گزارش را برای یک مرحلهٔ خاص فیلتر می‌کند.
 * سردبیر فقط دستورهای مربوط به گزینش را می‌بیند و نویسنده همه را — چون
 * ریختنِ همهٔ دستورها در هر دو پرامپت، هم طولانی است و هم گیج‌کننده.
 */
function filterOrders_(orders, cats) {
  if (!orders || !orders.length) return [];
  if (!cats) return orders;
  var out = [];
  for (var i = 0; i < orders.length; i++) {
    var c = String(orders[i].cat || '');
    for (var j = 0; j < cats.length; j++) {
      if (c.indexOf(cats[j]) !== -1) { out.push(orders[i]); break; }
    }
  }
  return out;
}

/** «۵ ویدیو، ۴ عکس، ۲ فایل صوتی، ۱ سند» — برای اینکه نویسنده ترکیب را بداند. */
function kindBreakdown_(items) {
  var c = { 'ویدیو': 0, 'عکس': 0, 'صدا': 0, 'سند': 0 };
  for (var i = 0; i < items.length; i++) c[kindOf_(items[i])]++;
  var lbl = { 'ویدیو': 'ویدیو', 'عکس': 'عکس', 'صدا': 'فایل صوتی', 'سند': 'سند' };
  var out = [];
  for (var k in c) if (c.hasOwnProperty(k) && c[k]) out.push(c[k] + ' ' + lbl[k]);
  return out.length ? out.join('، ') : 'بدون منبع';
}

function buildPrompt_(cat, items, theme, connection, refs, when, orders) {
  function block(list, label) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      out.push(
        '### ' + label + ' ' + (i + 1) + '\n' +
        'شناسه: ' + it.id + '\n' +
        'نوع: ' + it.kind + '\n' +
        // فایل‌های بلند تکه‌تکه تحلیل شده‌اند و این خلاصه از سراسرشان جمع شده،
        // نه از ابتدایشان. نویسنده باید بداند با یک اثرِ بلند طرف است.
        (it.parts ? 'حجم منبع: ' + it.parts + ' (خلاصه از سراسر فایل)\n' : '') +
        (it.role ? 'نقش در روایت: ' + it.role + '\n' : '') +
        'تاریخ: ' + it.date + '\n' +
        'موضوع: ' + String(it.topic).slice(0, 500) + '\n' +
        'پیام کلیدی: ' + String(it.msg).slice(0, 500) + '\n' +
        'خلاصه: ' + String(it.summary).slice(0, 900) + '\n' +
        (it.body ? 'متن/گفتار داخل فایل: ' + String(it.body).slice(0, 700) + '\n' : '') +
        (it.vibe ? 'حال‌وهوا: ' + String(it.vibe).slice(0, 200) + '\n' : ''));
    }
    return out.join('\n');
  }

  var targetMin = varietyTargetMin_();
  var words = Math.round(targetMin * speechWpm_());
  var capChars = oneFileMaxChars_();
  var L = [
    'تو نویسندهٔ برنامهٔ رادیوییِ فارسیِ «' + CFG.SHOW_NAME + '» هستی — ' + CFG.SHOW_TAGLINE + '.',
    'یک قسمت بنویس که یک گویندهٔ حرفه‌ای قرار است آن را اجرا کند. این متن قرار نیست خوانده',
    'شود؛ قرار است شنیده شود. اسمِ برنامه گویای کارش است: در هر قسمت از دسته‌ها و نوع‌های',
    'گوناگون کنار هم حرف می‌زنیم — کلیپ و صدا و عکس و سند.',
    '',
    // دستورهای بازِ بازبینی، پیش از هر قاعدهٔ دیگری — چون همین‌ها ایرادهایی‌اند
    // که در قسمتِ قبل واقعاً رخ داده‌اند.
    instructionBlock_(orders,
      'مهم‌ترین بخش: اصلاح‌هایی که بازبینِ قسمتِ قبل خواسته. این‌ها بر همهٔ قاعده‌های ' +
      'زیر مقدم‌اند و رعایتشان اجباری است:'),
    'تاریخ امروز: ' + when.spoken,
    'دستهٔ این قسمت: «' + cat + '»',
    'تعداد منابع اصلی: ' + items.length + ' (' + kindBreakdown_(items) + ')' +
      (refs && refs.length ? ' به‌علاوهٔ ' + refs.length + ' ارجاع به قسمت‌های گذشته' : ''),
    ''
  ];

  if (theme) {
    L.push('نخِ مشترکی که سردبیر پیدا کرده: «' + theme + '»');
    if (connection) L.push('پیوند از این‌جا می‌آید: ' + connection);
    L.push('روایت را حولِ همین نخ بساز. این نخ از دلِ خودِ محتوا بیرون آمده، پس');
    L.push('لازم نیست چیزی به آن اضافه کنی تا به هم وصل شود.');
    L.push('');
  }

  L = L.concat([
    'قواعد سخت‌گیرانه:',
    '۱) فقط و فقط از اطلاعات آیتم‌های زیر استفاده کن. هیچ واقعیت، آمار، نام یا نقل‌قولی از خودت اضافه نکن.',
    '۲) اگر دربارهٔ چیزی مطمئن نیستی، دربارهٔ آن حرف نزن. حدس و گمان ممنوع.',
    '   اگر منبع جنسیت، شغل، مکان یا زمانِ کسی را نگفته، تو هم نگو.',
    '۳) نوع‌های مختلف منبع — ویدیو، عکس، فایل صوتی و سند — را در هم بتَن؛',
    '   نگذار قسمت به فهرستِ پشت‌سرهم آیتم‌ها تبدیل شود. اگر منبعی سند یا فایل صوتیِ',
    '   بلند است، مثل «یک متنِ مکتوب» یا «یک صدای ضبط‌شده» به آن اشاره کن، نه مثل ویدیو.',
    '۴) متن باید «گفتاری» باشد نه نوشتاری: جمله‌های کوتاه، لحن گرم و صمیمی، خطاب مستقیم به شنونده.',
    '۵) هیچ نشانه‌گذاری، ایموجی، عنوان مارک‌داون یا علامت ستاره در متنِ روایت نیاور؛',
    '   این متن مستقیم به گوینده داده می‌شود و هر نویسه‌ای خوانده خواهد شد. فقط جملهٔ فارسی روان.',
    '۶) عددها را به حروف بنویس (مثلاً «هزار و چهارصد» نه «۱۴۰۰») تا درست خوانده شود.',
    '۷) در هیچ بخشی شناسهٔ فایل را بلند نخوان؛ شناسه‌ها فقط در فیلد sourceIds ثبت می‌شوند.',
    '۸) در موضوعات حساس (سیاسی، مذهبی، قومی) بی‌طرف و توصیفی بمان؛ خودت موضع نگیر،',
    '   بلکه بگو محتوای آرشیو چه می‌گوید و در صورت وجود، دیدگاه‌های مقابل را هم بازتاب بده.',
    // قاعده‌های زیر از یک بازبینیِ واقعی درآمده‌اند: در قسمت اول، یک روایت با
    // کلمه‌ای که در منبع نبود نقل شد، و یک ادعای هویتی دربارهٔ یک شخص واقعی
    // از یک ویدیوی شبکهٔ اجتماعی بی هیچ تأییدی پخش شد.
    '۸-ب) نقل‌قول، روایت، حدیث و آیه: عیناً از فیلد «متن/گفتار داخل فایل» بردار.',
    '   حق نداری کلمه‌ای اضافه یا کم کنی، یا دو بند را در هم ادغام کنی. اگر متنِ دقیق',
    '   را در منابع نداری، اصلاً نقل نکن — فقط به مضمونش اشاره کن و بگو «مضمونِ این روایت».',
    '۸-پ) ادعای هویتی، خبری یا شخصی دربارهٔ یک آدمِ واقعیِ نام‌برده فقط وقتی مجاز است',
    '   که دست‌کم در دو آیتم منبع آمده باشد. وگرنه نام را بردار و کلی بگو.',
    '۸-ت) توصیف تصویری فقط از خودِ فیلدهای همان آیتم. حالت، احساس یا کنشی که در',
    '   منبع نیامده (مثل «اشک می‌ریزد») اضافه نکن.',
    '۸-ث) هیچ جمله‌ای بیش از سی کلمه نباشد؛ جملهٔ بلند با یک نفس خوانده نمی‌شود.',
    '۸-ج) هر واژه‌ای که فارسی نیست و معنی روشنی ندارد ننویس. اگر ترکیبی مثل',
    '   «فتنه مِلَل» ساختی که در فارسی معنا ندارد، آن را با عبارتِ روشن جایگزین کن.',
    '۸-الف) در محتوای مالی، ترید و اقتصاد: توصیهٔ سرمایه‌گذاری نده و به معامله تشویق نکن.',
    '   نه سیگنال بده، نه وعدهٔ سود، نه «الان وقتِ خریدن است». فقط بگو منبعِ آموزشی چه',
    '   مفهومی را توضیح می‌دهد. یک‌بار در طول قسمت یادآوری کن که این‌ها آموزشی‌اند',
    '   و مسئولیتِ هر تصمیمِ مالی با خودِ شنونده است.',
    // این دو قاعده از دو خطای واقعیِ شنیده‌شده در قسمت‌های پخش‌شده آمده‌اند؛
    // به همین دلیل هم‌ردیفِ سخت‌ترین قاعده‌ها نشسته‌اند.
    '۸-چ) تفسیرِ بی‌مبنا مطلقاً ممنوع. انگیزه، احساس، دلیل، وضعِ اجتماعی یا زمینه‌ای که',
    '   در خودِ محتوا نیامده، به هیچ آدم و هیچ محتوایی نسبت نده. نمونهٔ خطای واقعی:',
    '   نوجوانی مرثیه می‌خواند و راوی از پیشِ خود گفت که «چون منطقه محروم است، از غمِ',
    '   مشکلات به این پناه می‌برند» — چنین جمله‌ای، هر قدر هم به‌نظر همدلانه، ساختنِ',
    '   واقعیت است و حقِ تو نیست. توصیف کن؛ تفسیر نکن. روان‌شناسی و جامعه‌شناسیِ',
    '   خودساخته ممنوع. و اگر بین دو مطلب پیوندِ واقعی نیست، هذیانِ ربط‌ساز نباف:',
    '   صادقانه و ساده از یکی به بعدی برو («و اما مطلبِ بعدی...») — این از پیوندِ',
    '   ساختگی بسیار حرفه‌ای‌تر است.',
    // ۶٫۲۱ — سومین خطای واقعیِ شنیده‌شده، و از دو تای بالا موذی‌تر: اینجا
    // چیزی «ساخته» نمی‌شود، فقط چیزی که هست تخت می‌شود.
    '۸-خ) محتوایی که معنایش در پایانش است را به «درس اخلاقی» تبدیل نکن.',
    '   نمونهٔ خطای واقعی: متنی دربارهٔ پیرزنی که از دختری می‌خواهد جایش را در',
    '   تاکسی بدهد؛ دختر می‌دهد و سوارِ ماشینِ دیگری می‌شود؛ آن ماشین تصادف',
    '   می‌کند و همه می‌میرند؛ و بعد معلوم می‌شود اصلاً پیرزنی در کار نبوده.',
    '   این یک خاطرهٔ ترسناک است و کلِ معنایش در همان جملهٔ آخر است. راوی آن را',
    '   «کمکِ اجتماعی به سالمندان» خواند و با چند جملهٔ پندآموز بست — یعنی',
    '   نه‌فقط پایان را نگفت، بلکه معنا را وارونه کرد.',
    '   پس: **اول تا آخرِ هر آیتم را بخوان و بعد تصمیم بگیر چه چیزی است.**',
    '   اگر متن چرخش یا رازِ پایانی دارد، همان چرخش خودِ مطلب است؛ نگه‌اش دار،',
    '   با همان لحن تعریفش کن، و در پایان **نتیجه‌گیریِ اخلاقی نچسبان**.',
    '   یک خاطرهٔ ترسناک، ترسناک است؛ یک طنز، طنز است؛ یک ماجرای عجیب، عجیب',
    '   است. هیچ‌کدام «پیامِ» لازم ندارند. جملهٔ «درسی که می‌گیریم…» و هر شکلِ',
    '   دیگرش ممنوع است.',
    '۸-ذ) «دستهٔ این قسمت» یک برچسبِ بایگانی است، نه عینکِ خواندن.',
    '   آیتم‌ها گاهی اشتباه دسته‌بندی می‌شوند. اگر متنِ خودِ آیتم با دسته‌اش',
    '   نمی‌خوانَد، **به متن وفادار باش نه به دسته** — و همان ناسازگاری را در',
    '   فیلد misfiled بنویس (شناسه + دستهٔ درست به‌نظرت + یک جمله چرا).',
    '   خواندنِ یک خاطرهٔ ترسناک با عینکِ «اجتماعی» دقیقاً همان‌طور خرابش',
    '   می‌کند که تفسیرِ بی‌مبنا.',
    '۸-ح) در متنِ گفتار هیچ لینک، شناسهٔ فایل، یا نامِ فایلِ حرف‌وعددی نیاور و نخوان.',
    '   منبع را با نامِ آدم‌فهم بگو («ویدیویی از سخنرانیِ...»، «سندی دربارهٔ...»).',
    '   شناسه فقط در sourceIds و mustSee.source می‌نشیند و لینک فقط در سندِ قسمت.',
    '',
    'مشاهدهٔ ضروری — جایی که گفتن کافی نیست:',
    '۸-خ) بعضی چیزها را صوت و متن نمی‌توانند کامل منتقل کنند: نمودار، حرکتِ تصویری،',
    '   جدول، دست‌خط، چیدمانِ صحنه. اگر و فقط اگر چنین جایی هست، در فیلد mustSee',
    '   همان بخش ثبتش کن: source شناسهٔ همان آیتم؛ where جای دقیق — بازهٔ زمانی یا',
    '   صفحه/بند — ولی فقط اگر در دادهٔ همان آیتم آمده باشد؛ بازه را هرگز از خودت',
    '   نساز و اگر ثبت نشده، وصفِ کیفی بده («نمودارِ میانه‌های ویدیو») یا خالی بگذار؛',
    '   why بگوید چرا صوت و متن این‌جا کم می‌آورند؛ benefit بگوید دیدنش دقیقاً چه',
    '   چیزی به شنونده اضافه می‌کند.',
    '۸-د) هر جا mustSee گذاشتی، در متنِ narration همان بخش (یا اگر جمع‌بندی‌اش',
    '   طبیعی‌تر است، در outro) یک جملهٔ گفتاری با لحنِ مناسب بیاور که همین دعوت را',
    '   به شنونده بگوید — چرا و با چه فایده‌ای — بی هیچ شناسه و لینکی.',
    '۸-ذ) وظیفهٔ اول همچنان بی‌نیازکردنِ شنونده است: تا جایی که می‌شود خودِ متن',
    '   منبع را کامل منتقل کند. mustSee فقط برای جایی است که واقعاً نمی‌شود.',
    '',
    'پیوندِ معنایی — این تفاوتِ یک برنامهٔ واقعی با فهرستِ مطالب است:',
    '۹) پیوند را نساز؛ نشان بده. برای هر گذار از یک آیتم به آیتم بعد، پیوند باید از',
    '   خودِ محتوا بیاید: یک واژهٔ مشترک، یک نامِ مشترک، یک تضادِ آشکار، یک ادامهٔ زمانی،',
    '   یا یک پرسشی که آیتم اول باز می‌گذارد و آیتم دوم جوابش را دارد.',
    '۱۰) عبارت‌های چسبِ کلامی ممنوع: «از سوی دیگر»، «این ما را می‌رساند به»،',
    '    «در همین راستا»، «نکتهٔ جالب دیگر» — این‌ها جای پیوندِ واقعی را می‌گیرند',
    '    بدون اینکه چیزی بگویند. اگر ناچار شدی از این‌ها استفاده کنی، یعنی آن دو آیتم',
    '    به هم مربوط نیستند؛ آن آیتم را کنار بگذار و در sourceIds نیاورش.',
    '۱۱) بهتر است قسمت هشت آیتمِ واقعاً هم‌خانواده داشته باشد تا دوازده آیتم با چسبِ کلامی.',
    '    استفاده از همهٔ آیتم‌ها اجباری نیست. کیفیتِ پیوند مهم‌تر از پوششِ کامل است.',
    '۱۲) اگر دو آیتم با هم تضاد دارند، تضاد را صریح بگو — تضاد خودش یکی از قوی‌ترین',
    '    پیوندهاست. لازم نیست همه‌چیز هم‌جهت باشد.',
    '',
    'آغازِ برنامه:',
    '۱۳) در hook، اول نامِ برنامه را بگو: «' + CFG.SHOW_NAME + '» — ' + CFG.SHOW_TAGLINE +
    '. بعد روز و تاریخ، طبیعی و کوتاه. دقیقاً مثل شروعِ یک برنامهٔ رادیوییِ واقعی: ' +
    'نام برنامه، سلام، تاریخ، و بعد قلاب. نام برنامه را عوض نکن و ترجمه‌اش نکن.',
    '    مثال شکل کار (کلمه‌به‌کلمه کپی نکن): «سلام. امروز ' + when.weekday + ' است، ' +
       when.jalali + '.» و بعد بلافاصله برو سرِ قلاب.',
    '    قلاب باید یک تصویر یا یک جمله از دلِ خودِ محتوا باشد، نه توضیحِ فهرستِ قسمت.',
    '    هرگز با «در این قسمت می‌خواهیم دربارهٔ... صحبت کنیم» شروع نکن.',
    '',
    'صنعتِ رادیو:',
    '۱۴) بین بخش‌ها پُلِ شنیداری بگذار: یک جملهٔ کوتاه که شنونده را از بخش قبلی به بعدی ببرد.',
    '۱۵) طولِ جمله‌ها را عمداً متغیر کن. جملهٔ کوتاه ضربه می‌زند. جملهٔ بلند فضا می‌سازد.',
    '۱۶) نقل‌قول‌ها را عیناً از فیلد «متن/گفتار داخل فایل» بردار و پیش از هرکدام بگو',
    '    این حرفِ کیست یا از کجاست. هیچ نقل‌قولی از خودت نساز.',
    '۱۷) پایان را باز نگذار: یک جمع‌بندی و یک نکتهٔ ماندگار.',
    '',
    'فارسیِ آمادهٔ گفتار:',
    '۱۸) فارسیِ معیارِ ایران بنویس. جمع فارسی بیاور نه عربی: «نکته‌ها» نه «نکات».',
    '۱۹) کسرهٔ اضافه را در ترکیب‌های اضافی صریح بگذار: «کتابِ من»، «صدایِ او».',
    '    این مهم‌ترین عاملِ درست‌خوانی است.',
    '۲۰) روی واژه‌های چندتلفظی یا کم‌کاربرد اعراب بگذار: «مِلَل»، «قَدر»، «نَظیر».',
    '۲۱) نیم‌فاصله را درست به کار ببر. هیچ واژهٔ لاتینی در متن روایت نیاور.',
    ''
  ]);

  if (refs && refs.length) {
    L = L.concat([
      'ارجاع به قسمت‌های گذشته:',
      '۲۲) در فهرستِ دومِ پایین، آیتم‌هایی هست که در قسمت‌های قبلی پخش شده‌اند.',
      '    این‌ها موضوعِ اصلی نیستند. از آن‌ها فقط برای بستنِ پیوند استفاده کن — یک اشارهٔ',
      '    کوتاه در حدِ یک یا دو جمله، با یادآوریِ اینکه قبلاً به آن پرداخته‌ایم.',
      '    مثلاً: «قبلاً در همین برنامه دربارهٔ ... شنیدیم؛ حالا این تکه همان را از زاویهٔ دیگری نشان می‌دهد.»',
      '    شناسهٔ این آیتم‌ها را هم در sourceIds همان بخش بیاور.',
      '    اگر به پیوند کمکی نمی‌کنند، اصلاً استفاده‌شان نکن.',
      ''
    ]);
  }

  L = L.concat([
    'ساختار خواسته‌شده:',
    '- title: عنوان کوتاه و گیرا برای قسمت (حداکثر ۹ کلمه)',
    '- hook: آغاز برنامه — نامِ «' + CFG.SHOW_NAME + '»، سلام، روز و تاریخ، سپس قلاب. ' +
    'چهار تا پنج جمله.',
    '- sections: دقیقاً ' + CFG.SECTIONS_TARGET + ' بخش. هر بخش heading کوتاه، narration پیوسته،',
    '  sourceIds شامل شناسهٔ دقیق آیتم‌هایی که آن بخش بر پایهٔ آن‌ها نوشته شده،',
    '  و tone: یک جملهٔ کوتاهِ فارسی که به گوینده می‌گوید این بخش را «چطور» اجرا کند.',
    '  tone باید با حالِ همان بخش بخواند، نه با کل قسمت. نمونه‌ها:',
    '  «آرام و همدلانه، با مکث بیشتر» · «دقیق و توضیحی، با تأکید روی عددها»',
    '  «سرزنده و با لبخند در صدا» · «خبری و بی‌طرف» · «آهسته و سنگین، مثل روایتِ یک خاطره»',
    '- outro: جمع‌بندی کوتاه و یک نکتهٔ ماندگار',
    '- summary: خلاصهٔ سه‌خطی قسمت برای ایمیل',
    '- tags: پنج برچسب موضوعی',
    '',
    // «حدود هزار و پانصد کلمه» در عمل هزار و دویست درمی‌آمد، چون مدل چهار بخش
    // می‌نوشت و هر بخش را کوتاه می‌بست. حالا سهمِ هر بخش صریح گفته می‌شود.
    'طول: ' + CFG.SECTIONS_TARGET + ' بخش، و هر بخش دست‌کم ' +
      Math.round(words / CFG.SECTIONS_TARGET) + ' کلمه.',
    'مجموع کلمات narration به‌علاوهٔ hook و outro باید دست‌کم ' + Math.round(words * 0.92) +
      ' و حدود ' + words + ' کلمه باشد (برای حدود ' + targetMin + ' دقیقه صدا).',
    'سقفِ سخت: مجموعِ همهٔ روایت‌ها از ' + capChars + ' نویسه بیشتر نشود. این سقف سلیقه ' +
    'نیست — بالاتر از آن، صدا در یک فایل جا نمی‌شود و قسمت دو تکه می‌شود. ' +
    'کوتاه‌تر از سقف مشکلی ندارد؛ بلندتر یعنی قسمت خراب شده است.',
    'اگر بخشی کوتاه‌تر درآمد، همان بخش را با جزئیاتِ بیشتر از منابعش بلندتر کن —',
    'نه با تکرار و نه با حرفِ عمومی.',
    '',
    '--- منابع اصلی ---',
    block(items, 'آیتم')
  ]);

  if (refs && refs.length) {
    L.push('');
    L.push('--- قبلاً پخش‌شده (فقط برای پیوند) ---');
    L.push(block(refs, 'ارجاع'));
  }

  return L.join('\n');
}

function episodeNarration_(ep) {
  var p = [ep.hook];
  for (var i = 0; i < ep.sections.length; i++) {
    p.push(ep.sections[i].heading);
    p.push(ep.sections[i].narration);
  }
  p.push(ep.outro);
  return p.filter(String).join('\n\n');
}

// ------------------------------------------------------------ اجرای تولید

/**
 * مرحلهٔ ۱: انتخاب محتوا، نگارش متن، ثبت در شیت. سریع است و در یک اجرا تمام می‌شود.
 * سپس ساخت صدا شروع می‌شود و اگر وقت کم بیاید، خودکار ادامه پیدا می‌کند.
 */
function produceEpisode(opt) {
  opt = opt || {};
  // تقویمِ تولید. فقط جلوی زمان‌بندیِ خودکار را می‌گیرد؛ اجرای دستی از منو
  // همیشه اجازه دارد. تریگرهای گوگل یک شیءِ رویداد پاس می‌دهند که manual
  // ندارد، پس همان مسیرِ خودکار شمرده می‌شود.
  // فراخوانِ رو به جلو (۳ → ۲۵) پس در try است؛ و اگر تقویم بترکد، تولید
  // ادامه می‌یابد — سکوتِ ناخواسته بدتر از یک قسمتِ اضافه است.
  if (!opt.manual) {
    try {
      var g = calGate_(ENRICH_SHOW_VARIETY, CFG.SHOW_NAME);
      if (g && g.ok === false) return { ok: false, reason: 'calendar', why: g.why };
    } catch (eCal) { logLine_('تقویمِ تولید وارسی نشد: ' + eCal.message); }
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    logLine_('تولید: اسکریپت دیگری در حال اجراست (احتمالاً همگام‌سازی)؛ فعلاً رد شد.');
    return { ok: false, reason: 'busy' };
  }
  var tStart = new Date().getTime();
  try {
    if (props_().getProperty(PK.PENDING)) {
      logLine_('تولید: قسمت قبلی هنوز در حال صداگذاری است؛ ادامه داده می‌شود.');
      lock.releaseLock();
      return renderAudioStep_();
    }

    var hub = getHub_();

    // پیش از هر چیز: گزارش‌های تازهٔ ناظر را بردار و دستورهای بازش را بخوان.
    // این دستورها قاعدهٔ سختِ همین قسمت‌اند و بر همهٔ قاعده‌های عمومی مقدم‌اند.
    try { ingestReports_(hub); } catch (eIn) { logLine_('برداشت گزارش‌ها ناموفق: ' + eIn.message); }
    var orders = [];
    try { orders = openInstructions_(hub); } catch (eOr) { orders = []; }
    if (orders.length) {
      logLine_('گزارش: ' + orders.length + ' دستورِ باز از بازبینی، به این قسمت اعمال می‌شود.');
    }

    var picked = pickCategory_(hub);
    if (!picked) {
      logLine_('تولید: هیچ دسته‌ای محتوای استفاده‌نشدهٔ کافی نداشت.');
      return { ok: false, reason: 'nothing' };
    }

    // حذف تکراری دو مرحله دارد: اول شناسهٔ فایل، بعد شباهتِ محتوایی — چون
    // دو فایل با دو شناسه می‌توانند رونوشتِ یک سخنرانیِ واحد باشند.
    var pool = dedupeSimilar_(dedupeById_(picked.items.slice()
                 .sort(function (a, b) { return b.score - a.score; })));
    var dupDropped = picked.items.length - pool.length;
    if (dupDropped > 0) logLine_('حذف تکراری محتوایی: ' + dupDropped + ' آیتم کنار رفت.');
    var refPool = dedupeById_(picked.refs || []);
    var items = null, refs = [], theme = '', connection = '', rejected = [];

    // مرحلهٔ سردبیری: پیدا کردن نخِ مشترک، نه فقط انتخاب آیتم‌های خوب
    if (CFG.CURATE && pool.length > CFG.ITEMS_PER_EPISODE) {
      try {
        var cur = curateItems_(picked.title, pool, refPool, orders);
        if (cur.chosen.length >= 6) {
          items = enforceMix_(cur.chosen, pool, CFG.ITEMS_PER_EPISODE);
          refs = cur.references || [];
          theme = cur.theme; connection = cur.connection;
          rejected = cur.rejected || [];
          logLine_('نخ: «' + theme + '» — ' + cur.chosen.length + ' آیتم، ' +
                   refs.length + ' ارجاع به گذشته، ' + cur.rejected.length + ' رد. ' +
                   'پیوند: ' + String(connection).slice(0, 140));
        } else {
          logLine_('گزینش خروجی کافی نداد؛ انتخاب بر پایهٔ امتیاز.');
        }
      } catch (eCur) {
        logLine_('گزینش تحریریه‌ای ناموفق بود، انتخاب بر پایهٔ امتیاز: ' + eCur.message);
      }
    }
    if (!items) items = selectItems_(pool);

    if (items.length < 4) {
      logLine_('تولید: آیتم کافی در «' + picked.title + '» نبود (' + items.length + ').');
      return { ok: false, reason: 'few', cat: picked.title, count: items.length };
    }

    var epNum = (parseInt(props_().getProperty(PK.EP_NUM) || '0', 10)) + 1;
    logLine_('تولید قسمت ' + epNum + ' از دستهٔ «' + picked.title + '» با ' + items.length +
             ' آیتم (تازه در این دسته: ' + (picked.freshCount || 0) + ').');

    var when = todayWords_();
    var epPrompt = buildPrompt_(picked.title, items, theme, connection, refs, when, orders);
    var ep = geminiText_(epPrompt, EPISODE_SCHEMA);
    if (!ep.sections || !ep.sections.length) throw new Error('متن قسمت بدون بخش برگشت.');

    // پاسخِ ترمیم‌شده یا کم‌بخش یعنی متن وسطِ راه بریده شده. یک بار دیگر تلاش
    // می‌کنیم و هر کدام بخش‌های بیشتری داشت می‌ماند؛ اگر باز هم کوتاه بود،
    // به‌جای انتشارِ بی‌سروصدای یک قسمتِ نصفه، در تب گزارش‌ها ثبت می‌شود.
    var minSec = Math.max(3, Math.ceil((CFG.SECTIONS_TARGET || 5) / 2));
    var repaired = !!ep.__repaired;
    if (repaired || fullSections_(ep) < minSec) {
      // تلاش دوباره فقط اگر وقت باشد. همین که پاسخ بریده برگشته یعنی مدل تا
      // سقفِ توکن رفته و کندترین حالت را داشته؛ یک تکرارِ بی‌مهلت، اجرا را از
      // سقفِ شش دقیقه رد می‌کرد و آن‌وقت هیچ چیز — نه فایل قسمت، نه علامتِ
      // «استفاده‌شده»، نه تریگر ادامه — ثبت نمی‌شد و قسمتِ آن روز گم می‌شد.
      var spent = new Date().getTime() - tStart;
      logLine_('متن قسمت ' + epNum + ' ناقص آمد (' + fullSections_(ep) + ' بخشِ کامل' +
               (repaired ? '، ترمیم‌شده' : '') + '؛ ' + Math.round(spent / 1000) + ' ثانیه گذشته).');
      if (spent < 120000) {
        try {
          var ep2 = geminiText_(epPrompt, EPISODE_SCHEMA);
          // شمردنِ خامِ بخش‌ها گمراه‌کننده است: پاسخِ ترمیم‌شده معمولاً یک بخشِ
          // ناقصِ بی‌روایت هم دارد و از پاسخِ سالمِ پنج‌بخشی «بزرگ‌تر» درمی‌آمد.
          if (ep2 && ep2.sections && ep2.sections.length && epScore_(ep2) > epScore_(ep)) {
            ep = ep2; repaired = !!ep.__repaired;
          }
        } catch (eRe) { logLine_('تلاش دوبارهٔ نگارش ناموفق: ' + eRe.message); }
      } else {
        logLine_('وقتِ کافی برای تلاش دوباره نبود؛ با همین متن ادامه می‌دهیم.');
      }
      // بخش‌های بی‌روایت (تهِ بریدهٔ پاسخ) کنار می‌روند تا در صدا و در سند
      // به‌شکل بخشِ خالی ظاهر نشوند.
      ep.sections = ep.sections.filter(function (x) {
        return x && String(x.narration || '').trim(); });
      if (!ep.sections.length) throw new Error('متن قسمت بدون بخشِ کامل برگشت.');
      if (repaired || ep.sections.length < minSec) {
        try {
          logSelfFinding_(hub, {
            priority: 'جدی', category: 'نگارش قسمت',
            key: 'truncated-episode',
            title: 'متن قسمت ناقص برگشت و ترمیم شد',
            detail: 'قسمت ' + epNum + ' با ' + ep.sections.length + ' بخش ساخته شد؛ ' +
                    'هدف ' + (CFG.SECTIONS_TARGET || 5) + ' بخش است. ' +
                    'نشانهٔ رسیدن به سقف توکنِ خروجی یا فکر کردنِ بیش از اندازهٔ مدل.',
            instruction: 'متن را جمع‌وجورتر بنویس: تعداد بخش‌ها را رعایت کن و هر بخش را ' +
                         'کوتاه‌تر و متمرکزتر بیاور تا پاسخ به سقف طول نخورد.',
            owner: 'موتور', episode: epNum
          });
        } catch (eL2) {}
      }
    }
    try { delete ep.__repaired; } catch (eD) { ep.__repaired = undefined; }
    scrubSourceIds_(ep, items, refs);
    // آیتمی که نویسنده گفت در دستهٔ غلط نشسته — گزارش می‌شود، جابه‌جا نمی‌شود.
    try { misfiledReport_(hub, ep, epNum, picked.title, items); } catch (eMf) {}

    // پاسِ وفاداری: پیش از اینکه متن به صدا تبدیل شود، نقل‌قول‌های بی‌پشتوانه،
    // نویسه‌های عربیِ ناخوانا و جمله‌های بیش از حد بلند علامت می‌خورند و
    // به‌عنوان یافتهٔ خودِ موتور در تب گزارش‌ها ثبت می‌شوند، تا قسمت بعد
    // همان‌ها به‌شکل دستور به پرامپت برگردند.
    var fid = [];
    try {
      fid = fidelityCheck_({ hook: ep.hook, outro: ep.outro, sections: ep.sections,
                             connection: connection }, items, when, CFG.SHOW_NAME,
                            { expectOneFile: true });
    } catch (eF) { fid = []; }
    if (fid.length) {
      var byKind = {};
      for (var fz = 0; fz < fid.length; fz++) {
        byKind[fid[fz].kind] = (byKind[fid[fz].kind] || 0) + 1;
      }
      var parts = [];
      for (var kz in byKind) if (byKind.hasOwnProperty(kz)) parts.push(kz + ': ' + byKind[kz]);
      logLine_('پاس وفاداری قسمت ' + epNum + ' — ' + fid.length + ' نشانه (' + parts.join('، ') + ').');
      try {
        logSelfFinding_(hub, {
          priority: (byKind['نقل‌قول'] || byKind['تاریخ نیامده'] ||
                     byKind['نام برنامه نیامده']) ? 'جدی' : 'متوسط',
          category: 'پرامپت روایت',
          key: 'fidelity-' + Object.keys(byKind).sort().join('-'),
          title: 'پاس وفاداری در قسمت ' + epNum + ' نشانه گرفت: ' + parts.join('، '),
          detail: fid.slice(0, 8).map(function (x) {
            return '[' + x.kind + '] بخش «' + x.section + '»: ' + x.text; }).join(' | '),
          instruction: (byKind['نقل‌قول']
            ? 'در قسمت قبل نقل‌قولی آوردی که عیناً در منابع نبود. هر روایت، حدیث، آیه یا ' +
              'نقل‌قول را کلمه‌به‌کلمه از فیلد «متن/گفتار داخل فایل» بردار؛ اگر نداری، نقل نکن. '
            : '') +
            (byKind['جملهٔ بلند'] ? 'جمله‌های بالای سی کلمه را بشکن. ' : '') +
            (byKind['نویسهٔ عربی'] ? 'نویسه‌های عربی (ي، ك، ة) را با معادل فارسی جایگزین کن. ' : '') +
            (byKind['پیوند ساختگی']
              ? 'پیوندِ میان کلیپ‌ها را با عبارت‌های آمادهٔ کلیشه‌ای («جالب است که هر دو…»، ' +
                '«در نگاه اول بی‌ربط به نظر می‌رسند…»، «نخ نامرئی») نساز. اگر پیوندِ واقعی و ' +
                'قابل‌نشان‌دادن میان دو محتوا نیست، همان را صریح بگو و به تفکیک روایتشان کن. ' : '') +
            (byKind['تاریخ نیامده']
              ? 'در همان جمله‌های اولِ برنامه، روز هفته و تاریخ شمسی را کامل بگو. ' : '') +
            (byKind['نام برنامه نیامده']
              ? 'قلاب را با نامِ برنامه شروع کن: «' + CFG.SHOW_NAME + '». نامش را عوض نکن. ' : ''),
          owner: 'موتور', episode: epNum
        });
      } catch (eL) {}
    }

    // عکسِ محتوا: همین‌جا و نه جای دیگر، چون فقط در این نقطه متنِ نهایی و
    // متن‌های خام هر دو در حافظه‌اند. داوریِ معناییِ آن‌ها فردا انجام می‌شود
    // (بخش ۲۴) — وسطِ تولید نه وقتش هست نه جایش.
    // فراخوانِ رو به جلو (۳ → ۲۴) عمداً در try/catch است: در فایلِ سرِهم‌شده
    // بالا‌بردنِ تعریف‌ها مشکلی نمی‌سازد، ولی بارگذارهای جزئیِ tests/ می‌شکنند.
    // scrubSourceIds_ بالاتر هر شناسه‌ای از items و همچنین refs (ارجاع به
    // قسمت‌های گذشته) را «معتبر» می‌شمارد. اگر اینجا فقط items داده شود، بخشی
    // که به‌درستی به یک refs اِسناد داده «شکسته» شمرده می‌شود — دقیقاً همان
    // چیزی که در قسمت ۱۵ و ۱۶ دیده شد. items+refs باید همان استخری باشد که
    // scrubSourceIds_ برایش «شناخته‌شده» را تعریف کرده.
    try {
      auditSnap_(ENRICH_SHOW_VARIETY,
                 // picked.title نامِ «دسته» است، نه عنوانِ قسمت — همان‌طور که
                 // ستونِ چهارمِ تبِ پادکست‌ها هم همین را می‌گیرد.
                 { showName: CFG.SHOW_NAME, episode: epNum, title: ep.title,
                   category: picked.title, targetMin: varietyTargetMin_() },
                 { hook: ep.hook, outro: ep.outro, connection: connection,
                   sections: ep.sections },
                 items.concat(refs), fid);
    } catch (eSn) { logLine_('عکسِ محتوا گرفته نشد: ' + eSn.message); }

    var pad = ('0000' + epNum).slice(-4);
    var stamp = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyyMMdd');
    // پوشهٔ اختصاصیِ همین برنامه، تا با قسمت‌های درس‌نامه قاطی نشود
    var folder = showFolder_(CFG.VARIETY_FOLDER)
                   .createFolder('قسمت ' + pad + ' — ' + stamp + ' — ' + picked.title);

    // نقش‌گزینیِ گویندگان همین‌جا انجام و ذخیره می‌شود — یک بار، برای همیشهٔ همین
    // قسمت. اگر به اجرای صداگذاری واگذارش کنیم، هر اجرا از نو نقش می‌گزیند و
    // گویندهٔ وسطِ فایل عوض می‌شود.
    try { ensureCast_(ep, ENRICH_SHOW_VARIETY, epNum, picked.title); }
    catch (eCast) { logLine_('نقش‌گزینی انجام نشد: ' + eCast.message); }

    // متن و آیتم‌ها را در پوشهٔ قسمت ذخیره می‌کنیم تا اجرای بعدی بتواند ادامه دهد
    writeEpisodeJson_(folder, { ep: ep, items: items, refs: refs, cat: picked.title,
                       epNum: epNum, theme: theme, connection: connection, date: when,
                       // دستورهای تزریق‌شده همراه قسمت ذخیره می‌شوند تا بستنشان
                       // به بعد از انتشار موکول شود، نه همین‌جا.
                       orders: orders });

    markUsed_(hub, items, epNum);
    bumpRefs_(hub, refs);
    // شمارندهٔ «رد در گزینش» تازه این‌جا بالا می‌رود — بعد از اینکه فایل قسمت
    // ذخیره شد. پیش‌تر بلافاصله بعدِ گزینش نوشته می‌شد و اگر اجرا وسطِ نگارش
    // کشته می‌شد، آیتم‌های ردشده امتیازِ منفی‌شان را نگه می‌داشتند بی آنکه
    // قسمتی ساخته شده باشد؛ دو بار که تکرار می‌شد، برای همیشه کنار می‌رفتند.
    if (rejected.length) { try { bumpRejections_(hub, rejected); } catch (eBr) {} }

    var cnt = { 'ویدیو': 0, 'عکس': 0, 'صدا': 0, 'سند': 0 };
    for (var q = 0; q < items.length; q++) cnt[kindOf_(items[q])]++;

    var pod = ensureTab_(hub, CFG.TAB_PODCASTS, PODCAST_HEADERS);
    pod.appendRow([epNum, nowStr_(), ep.title, picked.title, cnt['ویدیو'], cnt['عکس'],
                   '—', '', '', '', 'در حال ساخت صدا',
                   items.map(function (x) { return x.id; }).join(', '),
                   '', cnt['صدا'], cnt['سند']]);

    // دستورهای بازبینی این‌جا بسته نمی‌شوند. اگر صداگذاری یا ارسال شکست بخورد،
    // قسمت اصلاً منتشر نشده و بستنِ دستور یعنی اصلاح برای همیشه گم می‌شود.
    // بستن، در پایانِ مرحلهٔ «ارسال» انجام می‌شود (renderAudioStep_).

    props_().setProperty(PK.EP_NUM, String(epNum));
    var recent = (props_().getProperty(PK.LAST_CATS) || '').split('|').filter(String);
    recent.push(picked.title);
    props_().setProperty(PK.LAST_CATS, recent.slice(-4).join('|'));

    // ── پیش از صدا: پنجرهٔ غنی‌سازیِ اینترنتی ──
    // متن حالا آماده است. اگر وقت هست، پیش از صداگذاری یک نوبت برای Cowork
    // گذاشته می‌شود تا با جست‌وجوی وب تکمیل و تعمیقش کند. «اگر وقت هست» شرطِ
    // مهمی است: انتظار نباید ساعتِ رسیدنِ پادکست را عقب بیندازد.
    // ترتیب مهم است: نشانهٔ دستی درونِ همین فراخوان مصرف می‌شود، پس پیش از آن
    // می‌پرسیم که آیا دستی بوده — تا دروازهٔ ساعت را برایش نگذاریم.
    var manualNow = enrichForcePending_();
    var wantEnrich = enrichWorthWaiting_(CFG.EPISODE_HOUR || 7);
    var pend = { epNum: epNum, folderId: folder.getId(), podRow: pod.getLastRow(),
                 chunkIdx: 0, partNo: 1, files: [], phase: 'speak' };
    if (wantEnrich) {
      pend.phase = 'enrich';
      pend.enrichAt = nowStr_();
      // در تولیدِ دستی، «نه پیش از ساعتِ هفت» بی‌معنی است: کاربر منتظرِ همین
      // قسمت است، نه منتظرِ فردا صبح.
      if (!manualNow) pend.notBeforeHour = clampHour_(CFG.EPISODE_HOUR, 7);
      writeEnrichRequest_(ENRICH_SHOW_VARIETY, epNum, ep, items,
                          { category: picked.title });
    }
    props_().setProperty(PK.PENDING, JSON.stringify(pend));

    // صداگذاری در همین اجرا شروع نمی‌شود. آماده‌سازی بالا (اسکن تب، گزینش، نگارش)
    // خودش چند دقیقه می‌برد؛ اگر صدا هم همین‌جا شروع شود، مجموع از سقف شش‌دقیقه‌ای
    // Apps Script رد می‌شود و اجرا وسط کار کشته می‌شود. پس صدا اجرای تازهٔ خودش را می‌گیرد.
    scheduleContinue_(wantEnrich ? 5 * 60 * 1000 : 45 * 1000);
    logLine_('قسمت ' + epNum + ' نوشته شد؛ ' +
             (wantEnrich ? 'منتظرِ غنی‌سازیِ اینترنتی.' : 'صداگذاری در اجرای بعدی شروع می‌شود.'));
    return { ok: true, episode: epNum, title: ep.title, duration: 'در حال ساخت', pending: true };
  } catch (err) {
    logLine_('خطای تولید: ' + err.message);
    try { lock.releaseLock(); } catch (e) {}
    throw err;
  }
}

function produceEpisodeContinue() { return renderAudioStep_(); }

/**
 * نگهبان. اگر اجرایی وسط صداگذاری کشته شود، تریگرِ ادامه ساخته نمی‌شود و قسمت
 * تا اجرای روز بعد معلق می‌ماند. این تابع از دل همگام‌سازی صدا زده می‌شود و
 * هر قسمتِ نیمه‌تمامِ بی‌صاحب را دوباره به راه می‌اندازد.
 */
function resumeStalledEpisode_() {
  if (!props_().getProperty(PK.PENDING)) return false;
  // چرا دیگر «آیا تریگری هست» را نمی‌پرسیم: تریگرِ یک‌بارمصرفِ after() پس از
  // زدن هم در getProjectTriggers() می‌ماند. صبح ۱۲ مرداد دقیقاً همین شد —
  // اجرای ادغام کشته شد، تریگرِ زده‌شده هنوز در فهرست بود، نگهبان گفت «پس
  // زمان‌بندی شده» و قسمت ۴ تا ساعت‌ها بعد مرده ماند. حالا ملاک ساعت است:
  // اگر نوبتِ ادامه گذشته و خبری نشده، رشته پاره شده است.
  // «رها شده» یعنی یکی از این دو: یا راننده‌ای در کار نیست (هیچ تریگرِ
  // ادامه‌ای در فهرست نمانده — مثلاً کسی «نصب زمان‌بندی» را دوباره زده و
  // تریگرها پاک شده‌اند)، یا نوبتش گذشته و خبری نشده.
  //
  // هیچ‌کدام به‌تنهایی کافی نیست. «تریگر هست» به‌تنهایی همان اشتباهِ نسخهٔ ۵٫۷
  // بود که قسمت ۴ را کشت (تریگرِ زده‌شده هم در فهرست می‌ماند). «نوبت گذشته»
  // به‌تنهایی هم قسمتی را که تریگرش پاک شده تا ساعت‌ها بعد به خواب می‌برد.
  var hasTrig = false;
  try {
    var ts = ScriptApp.getProjectTriggers();
    for (var i = 0; i < ts.length; i++) {
      if (ts[i].getHandlerFunction() === 'produceEpisodeContinue') { hasTrig = true; break; }
    }
  } catch (eT) { hasTrig = true; }   // فهرست را نتوانستیم بخوانیم؟ سخت‌گیری نکن
  var due = Number(props_().getProperty(PK.CONT_DUE) || 0);
  var now = new Date().getTime();
  var GRACE = 12 * 60 * 1000;   // مجالِ صف و تأخیرِ خودِ تریگرهای Apps Script
  // سقفِ بالا هم لازم است. بلندترین انتظارِ مشروعِ موتور چند ساعت است
  // (دروازهٔ ساعت از آماده‌سازیِ ۴ صبح تا انتشارِ ۷ صبح، به‌علاوهٔ ۹۰ دقیقه
  // غنی‌سازی). یک «نوبت»ِ سالِ ۲۰۹۹ — از پرشِ ساعتِ سرور، از ویرایشِ دستی، از
  // هر چه — نباید قسمت را تا آن سال قفل کند. بیدارکردنِ زودهنگام ارزان است
  // (دروازهٔ ساعت دوباره پارکش می‌کند)؛ نخوابیدنِ ابدی گران.
  var MAXWAIT = 12 * 60 * 60 * 1000;
  if (hasTrig && isFinite(due) && due > 0 && due < now + MAXWAIT &&
      now < due + GRACE) return false;
  scheduleContinue_(60 * 1000);
  logLine_('قسمت نیمه‌تمام پیدا شد و نوبتِ ادامه‌اش گذشته بود؛ صداگذاری دوباره زمان‌بندی شد.');
  return true;
}

function clearAudioTriggers_() {
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'produceEpisodeContinue') ScriptApp.deleteTrigger(ts[i]);
  }
}

/** پایانِ کار: هم تریگرها، هم «نوبتِ ادامه». */
function clearAudioContinuation_() {
  clearAudioTriggers_();
  try { props_().deleteProperty(PK.CONT_DUE); } catch (e) {}
}

function scheduleContinue_(ms) {
  // ترتیب مهم است. اگر اول پاک کنیم و بعد بنویسیم، در آن شکافِ کوتاه
  // «نوبتِ ادامه» وجود ندارد؛ وارسیِ سلامت — که قفل نمی‌گیرد — می‌تواند
  // درست همان‌جا بیفتد، قسمتی را که تازه برای شش ساعت بعد پارک شده «رها‌شده»
  // ببیند و بی‌جهت از نو راهش بیندازد. پس اول نوبتِ تازه نوشته می‌شود.
  var due = new Date().getTime() + ms;
  try { props_().setProperty(PK.CONT_DUE, String(due)); } catch (e) {}
  try {
    clearAudioTriggers_();
    ScriptApp.newTrigger('produceEpisodeContinue').timeBased().after(ms).create();
  } catch (eT) {
    // ساختنِ تریگر شکست خورد (سقفِ بیست‌تاییِ Apps Script؟) و حالا قسمت
    // بی‌راننده مانده. «نوبت» را به گذشته می‌بریم تا نگهبانِ دورِ بعد حتماً
    // دوباره تلاش کند — وگرنه یک خطای گذرا قسمت را برای همیشه می‌کشت.
    try { props_().setProperty(PK.CONT_DUE, String(new Date().getTime() - 60 * 60 * 1000)); } catch (e2) {}
    throw eT;
  }
}

/** مرحلهٔ ۲: صداگذاری ادامه‌پذیر. هر اجرا تا سقف امن پیش می‌رود و بقیه را می‌سپارد به اجرای بعد. */
/**
 * نوشتن (یا بازنویسیِ) پروندهٔ وضعیتِ قسمت در پوشهٔ خودش.
 * بازنویسی لازم شد چون مرحلهٔ غنی‌سازی متنِ ادغام‌شده را برمی‌گرداند و اگر
 * ذخیره نشود، اجرای بعدی همان متنِ خام را صداگذاری می‌کند و همهٔ زحمتِ
 * جست‌وجو بی‌صدا دور می‌رود.
 */
function writeEpisodeJson_(folder, meta) {
  var body = JSON.stringify(meta);
  var it = folder.getFilesByName('_episode.json');
  if (it.hasNext()) { var f = it.next(); f.setContent(body); return f; }
  return folder.createFile(Utilities.newBlob(body, 'application/json', '_episode.json'));
}

function renderAudioStep_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    // برخوردِ قفل با همگام‌سازی یا وارسیِ سلامت. تا دیروز این‌جا بی‌صدا
    // برمی‌گشتیم و زنجیرهٔ «ادامه» پاره می‌شد: قسمت تا اجرای فردا معلق می‌ماند.
    // با پنجرهٔ سه‌ساعتهٔ غنی‌سازی، شمارِ این برخوردها چند برابر شده است.
    try { scheduleContinue_(2 * 60 * 1000); } catch (eL) {}
    return { ok: false, reason: 'locked', pending: true };
  }
  var deadline = new Date().getTime() + CFG.MAX_RUNTIME_MS;
  try {
    var raw = props_().getProperty(PK.PENDING);
    if (!raw) return;
    var st = JSON.parse(raw);

    var folder = DriveApp.getFolderById(st.folderId);
    var it = folder.getFilesByName('_episode.json');
    if (!it.hasNext()) {
      // ردیفِ شیت نباید تا ابد بگوید «در حال ساخت صدا» درحالی‌که هیچ‌کس دیگر
      // سراغش نمی‌رود.
      try {
        var podX = ensureTab_(getHub_(), CFG.TAB_PODCASTS, PODCAST_HEADERS);
        if (st.podRow) podX.getRange(st.podRow, 11).setValue('ناموفق — فایل وضعیت گم شد');
      } catch (eR) {}
      props_().deleteProperty(PK.PENDING);
      throw new Error('فایل وضعیت قسمت پیدا نشد.');
    }
    var meta = JSON.parse(it.next().getBlob().getDataAsString());
    var ep = meta.ep, items = meta.items, cat = meta.cat, epNum = meta.epNum;

    var pad = ('0000' + epNum).slice(-4);
    // نام فایل با نامِ برنامه شروع می‌شود تا در درایو و در تلگرام هرگز با
    // فایل‌های درس‌نامه اشتباه گرفته نشود.
    var baseName = CFG.SHOW_NAME + ' — قسمت ' + pad + ' — ' + String(ep.title || '').slice(0, 60);

    /* ── پیش از صدا: افکتِ همین قسمت ──
     * متن آماده است و صداگذاری هنوز شروع نشده. تا ۵٫۷۴ افکت شبِ قبل و
     * بی‌خبر از این متن گشته می‌شد، پس صدا همیشه برای قسمتِ *بعدی* می‌رسید.
     * حالا همین‌جا از مدل پرسیده می‌شود این متن چه صدایی می‌خواهد، و اگر
     * بانک نداشت، همان لحظه گشته و آورده می‌شود.
     *
     * در اجرای خودش انجام می‌شود (بعدش scheduleContinue) تا به مهلتِ
     * شش‌دقیقه‌ایِ صداگذاری اضافه نشود، و پرچمِ sfxDone می‌گذارد تا با هر
     * از سرگیری دوباره تکرار نشود. هر شکستی بی‌صداست: نبودِ افکت هرگز
     * نباید جلوی ساختِ قسمت را بگیرد. */
    /* ── مرحلهٔ ناشناخته: همیشه رو به جلو، هرگز در جا ──
     * زنجیرهٔ مرحله‌ها با هر نسخه یکی دو تا بلندتر می‌شود (speak2 در ۶٫۲۰،
     * explain در ۶٫۲۱). اگر کد **عقب** برود — و بازگشتِ خودکار و دکمهٔ
     * بازگشت هر دو واقعی‌اند — قسمتی که وسطِ راه با نامِ مرحلهٔ تازه ذخیره
     * شده، از هیچ شرطی رد نمی‌شود، تابع بی‌مقدار برمی‌گردد، و
     * resumeStalled_ فقط دوباره زمان‌بندی‌اش می‌کند: حلقه‌ای بی‌پایان و
     * بی‌خطا، که تنها نشانه‌اش نرسیدنِ پادکست است.
     * نامِ ناشناخته یعنی «از این مرحله چیزی نمی‌دانم»، و امن‌ترین کارِ ممکن
     * رفتن به صداگذاری است — متن همان‌جاست و بدترین حالت، قسمتی است که یک
     * پالایشِ اختیاری را ندیده. */
    if (st.phase && SPEAK_PHASES_.indexOf(st.phase) === -1) {
      logLine_('قسمت ' + epNum + ': مرحلهٔ ناشناختهٔ «' + st.phase +
               '» (احتمالاً از نسخهٔ جلوتر)؛ مستقیم به صداگذاری می‌رود.');
      st.phase = 'audio';
      props_().setProperty(PK.PENDING, JSON.stringify(st));
    }

    if (st.phase === 'speak' && !st.sfxDone) {
      st.sfxDone = 1;
      props_().setProperty(PK.PENDING, JSON.stringify(st));
      /* سیاهه **همیشه** نوشته می‌شود، حتی وقتی جواب «هیچ» است.
         تا ۵٫۸۳ شرطش `pf.asked || pf.got` بود، پس وقتی مدل می‌گفت این
         قسمت صدایی نمی‌خواهد — که جوابِ درستی است و اغلبِ قسمت‌ها همین‌اند
         — هیچ خطی نوشته نمی‌شد. نتیجه‌اش این بود که صاحبِ برنامه بعد از
         چند روز می‌پرسید «تا الان که افکتی نشنیدم» و هیچ‌جا نمی‌شد فهمید
         کدام است: مدل گفته لازم نیست، یا زنجیره اصلاً اجرا نشده. آن دو تا
         زمین تا آسمان فرق دارند و از بیرون یک‌شکل بودند. */
      try {
        var pf = sfxPrefetch_(ep, 'variety', epNum);
        logLine_('افکتِ پیش از صدا: ' + ((pf && pf.asked) || 0) + ' خواسته، ' +
                 ((pf && pf.need) || 0) + ' نبود، ' + ((pf && pf.got) || 0) +
                 ' آورده شد.' +
                 (pf && pf.notes && pf.notes.length ? ' — ' + pf.notes.join(' · ') : ''));
      } catch (ePf) { logLine_('پیش‌آوردنِ افکت انجام نشد: ' + ePf.message); }
      scheduleContinue_(5 * 1000);
      return { ok: true, episode: epNum, pending: true, sfxPrefetch: true };
    }

    // ── مرحلهٔ «انتظارِ غنی‌سازی» ──
    if (st.phase === 'enrich') {
      var g = enrichGate_(st, ENRICH_SHOW_VARIETY, ep, epNum);
      if (!g.done) {
        scheduleContinue_(g.waitMs);
        return { ok: true, episode: epNum, pending: true, waitingEnrich: true };
      }
      // متنِ ادغام‌شده باید ذخیره شود، وگرنه اجرای بعدی همان متنِ خام را می‌خواند
      meta.ep = ep;
      try { writeEpisodeJson_(folder, meta); }
      catch (eW) { logLine_('ذخیرهٔ متنِ غنی‌شده ناموفق: ' + eW.message); }
      st.phase = 'speak';
      props_().setProperty(PK.PENDING, JSON.stringify(st));
      scheduleContinue_(45 * 1000);
      return { ok: true, episode: epNum, pending: true, enriched: !!g.applied };
    }

    // ── مرحلهٔ «متنِ صوتی»: اعراب‌گذاریِ کامل پیش از صدا ──
    // بینِ غنی‌سازی و صداگذاری می‌نشیند؛ داستانش بالای speakStep_ آمده.
    if (st.phase === 'speak') {
      var segsSpk = episodeSegments_(ep, cat);
      var rs = speakStep_(ep, segsSpk, deadline, function () {
        meta.ep = ep; writeEpisodeJson_(folder, meta);
      });
      if (!rs.done) {
        scheduleContinue_(45 * 1000);
        logLine_('قسمت ' + epNum + ': اعراب‌گذاریِ متنِ صوتی ادامه دارد (' +
                 speakStats_(ep, segsSpk) + ').');
        return { ok: true, episode: epNum, pending: true, speaking: true };
      }
      // یک دورِ جبرانی برای بخش‌هایی که بارِ اول نشدند — نه بیشتر
      st.speakRounds = (Number(st.speakRounds) || 0) + 1;
      if (rs.failed && st.speakRounds < 2) {
        props_().setProperty(PK.PENDING, JSON.stringify(st));
        scheduleContinue_(60 * 1000);
        return { ok: true, episode: epNum, pending: true, speaking: true };
      }
      writeSpeakFile_(folder, baseName, ep, segsSpk);
      meta.ep = ep;
      try { writeEpisodeJson_(folder, meta); } catch (eWs) {}
      // نوشتن تمام شد؛ حالا فاصله، بعد بازبینی. فاصله تزئینی نیست: نوشتن و
      // قضاوت باید دو فراخوانِ جدا باشند، وگرنه مدل جوابِ خودش را تأیید
      // می‌کند — و دقیقاً همین شکل بود که سه نسخه پیاپی «درست شد» گفت.
      st.phase = (CFG.SPEAK_REVIEW === false) ? 'audio' : 'speak2';
      props_().setProperty(PK.PENDING, JSON.stringify(st));
      scheduleContinue_(st.phase === 'speak2'
                        ? Math.max(60, (Number(CFG.SPEAK_REVIEW_MIN) || 3) * 60) * 1000
                        : 45 * 1000);
      logLine_('قسمت ' + epNum + ': متنِ صوتی آماده شد — ' + speakStats_(ep, segsSpk) + '.');
      return { ok: true, episode: epNum, pending: true, spoke: true };
    }

    // ── مرحلهٔ «بازبینیِ متنِ صوتی» ──
    if (st.phase === 'speak2') {
      var segsRev = episodeSegments_(ep, cat);
      var rv = speakReview_(ep, segsRev, deadline, function () {
        meta.ep = ep; writeEpisodeJson_(folder, meta);
      }, CFG.SHOW_NAME + ' ' + epNum);
      if (!rv.done) {
        scheduleContinue_(45 * 1000);
        logLine_('قسمت ' + epNum + ': بازبینیِ متنِ صوتی ادامه دارد.');
        return { ok: true, episode: epNum, pending: true, reviewing: true };
      }
      writeSpeakFile_(folder, baseName, ep, segsRev);
      meta.ep = ep;
      try { writeEpisodeJson_(folder, meta); } catch (eWr) {}
      st.phase = 'audio';
      props_().setProperty(PK.PENDING, JSON.stringify(st));
      scheduleContinue_(45 * 1000);
      logLine_('قسمت ' + epNum + ': بازبینیِ متنِ صوتی تمام شد — ' + rv.seen +
               ' بخش وارسی، ' + rv.fixed + ' اصلاح' +
               (rv.learned ? '، ' + rv.learned + ' واژه به تبِ تلفظ' : '') + '.');
      return { ok: true, episode: epNum, pending: true, reviewed: true };
    }

    // ── دروازهٔ «نه پیش از ساعتِ مقرر» ──
    // غنی‌سازی می‌تواند زود تمام شود؛ ولی ساعتِ رسیدنِ پادکست عادتِ شماست و
    // نباید عوض شود. پس صدا پیش از ساعتِ مقرر شروع نمی‌شود.
    if (st.notBeforeHour) {
      var nowH = nowHour_();
      if (isFinite(nowH) && nowH < Number(st.notBeforeHour)) {
        var mins = Number(st.notBeforeHour) * 60 - nowMinuteOfDay_();
        scheduleContinue_(Math.max(60000, mins * 60000));
        logLine_('قسمت ' + epNum + ' آماده است؛ صداگذاری در ساعتِ ' +
                 st.notBeforeHour + ' شروع می‌شود.');
        return { ok: true, episode: epNum, pending: true, waitingClock: true };
      }
    }

    // مرحله‌ها: audio → merge → deliver. شرط باید «فقط audio» باشد؛
    // اگر «هرچه غیر از deliver» بگذاریم، مرحلهٔ merge دوباره وارد بلوک صدا می‌شود
    // و بی‌پایان خودش را زمان‌بندی می‌کند.
    if (!st.phase || st.phase === 'audio') {
      // جدول «تلفظ» اعمال می‌شود و هر تکه لحنِ بخشِ خودش را با خود می‌برد.
      // ساختِ تکه‌ها پیش از پاک‌سازی آمد تا رانشِ شمارِ تکه‌ها — که ممکن است
      // خودش پاک‌سازی را لازم کند — پیش از آن سنجیده شود.
      var chunks = buildChunks_(ep, cat, epNum);
      chunkDriftReset_(st, chunks, 'قسمت ' + epNum);

      // شروعِ از صفر با پوشه‌ای که فایل صوتی دارد یعنی اجرای قبلی وسط کار کشته شده
      // و بخش‌هایش بی‌صاحب مانده‌اند؛ پاکشان کن تا نام‌ها تکراری نشوند.
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
          if (removed) logLine_('پاک‌سازی ' + removed + ' فایل صوتیِ بی‌صاحب از اجرای قطع‌شدهٔ قبلی.');
        } catch (eClean) {}
      }

      var baseFiles = st.files.slice();
      var saveProgress = function (files, nextChunk, nextPart) {
        st.files = baseFiles.concat(files);
        st.chunkIdx = nextChunk;
        st.partNo = nextPart;
        props_().setProperty(PK.PENDING, JSON.stringify(st));
      };
      var res = synthesizeStep_(chunks, baseName, folder, st.chunkIdx, st.partNo,
                                deadline, saveProgress);
      st.files = baseFiles.concat(res.files);
      st.chunkIdx = res.chunkIdx;
      st.partNo = res.partNo;

      if (!res.done) {
        props_().setProperty(PK.PENDING, JSON.stringify(st));
        scheduleContinue_(60 * 1000);
        logLine_('قسمت ' + epNum + ': ' + st.chunkIdx + ' از ' + chunks.length +
                 ' تکهٔ صوتی آماده شد؛ ادامه در اجرای بعد.');
        return { ok: true, episode: epNum, title: ep.title, duration: 'در حال ساخت', pending: true };
      }

      // صدا تمام شد. مرحلهٔ بعد (ادغام) روی ده‌ها مگابایت کار می‌کند و مرحلهٔ
      // بعدترش (ایمیل و تلگرام) هم وقت می‌برد؛ هر کدام اجرای خودش را می‌گیرد.
      st.phase = (CFG.MERGE_AUDIO && st.files.length > 1) ? 'merge' : 'deliver';
      props_().setProperty(PK.PENDING, JSON.stringify(st));
      scheduleContinue_(45 * 1000);
      logLine_('قسمت ' + epNum + ': صدا کامل شد (' + st.files.length + ' بخش)؛ ' +
               (st.phase === 'merge' ? 'ادغام' : 'ارسال') + ' در اجرای بعد.');
      return { ok: true, episode: epNum, title: ep.title,
               duration: st.phase === 'merge' ? 'در حال ادغام' : 'در حال ارسال', pending: true };
    }

    if (st.phase === 'merge') {
      // ادغام یک عملیاتِ نابخش‌پذیر است: اگر وسطش مهلت تمام شود اجرا کشته
      // می‌شود و هیچ پیشرفتی ذخیره نمی‌شود. پس اگر وقتِ کافی نمانده، به اجرای
      // تازه‌ای موکول می‌شود که مهلتِ کاملش را دارد.
      // موکول‌کردن باید کرانه داشته باشد. بی این شمارنده، اجرایی که همیشه با
      // وقتِ کم شروع می‌شود (یا سقفِ زمانِ پایین) تا ابد ادغام را عقب می‌انداخت
      // و قسمت هرگز ارسال نمی‌شد — ادغام یک آسایشِ اضافه است، نه شرطِ انتشار.
      // شمارنده باید *پیش از* تلاش بالا برود، نه بعدش. کشته‌شدنِ اجرا در میانهٔ
      // ادغام هیچ استثنایی نمی‌دهد که بشود گرفت؛ با شمارشِ «موکول‌کردن» به‌جای
      // «تلاش»، یک ادغامِ سنگین می‌توانست تا ابد اجرا را بکشد و قسمت هرگز
      // فرستاده نشود. انتشار هرگز گروگانِ ادغام نمی‌ماند.
      var mg = mergeStep_(st, baseName, folder, deadline, PK.PENDING, scheduleContinue_, 'قسمت');
      if (!mg.done) {
        return { ok: true, episode: epNum, pending: true,
                 mergeLater: !mg.skipped, mergeSkipped: !!mg.skipped };
      }
      st.phase = 'deliver';
      props_().setProperty(PK.PENDING, JSON.stringify(st));
      scheduleContinue_(30 * 1000);
      return { ok: true, episode: epNum, title: ep.title, duration: 'در حال ارسال', pending: true };
    }

    // ---- پایان: جمع‌بندی، ثبت در شیت و ایمیل ----
    var hub = getHub_();
    var mgList = mergedList_(st.merged);
    // گروهِ تک‌عضوی همان بخشِ اصلی است، نه رونوشتش. اگر این‌جا حواسمان نباشد،
    // آن بخش دو بار در فهرست می‌نشیند: یک بار به‌عنوان «بخش ۱» و یک بار
    // به‌عنوان «کل قسمت در یک فایل» — هم در شیت، هم در سند، هم در ایمیل.
    var wholeIds = {};
    for (var wi = 0; wi < mgList.length; wi++) {
      if (mgList[wi] && mgList[wi].id) wholeIds[mgList[wi].id] = 1;
    }
    var totalBytes = 0, audioLinks = [];
    for (var f = 0; f < st.files.length; f++) {
      totalBytes += st.files[f].bytes;          // مدت از روی بخش‌ها، همیشه کامل
      if (st.files[f].id && wholeIds[st.files[f].id]) continue;
      audioLinks.push({ name: st.files[f].name, url: st.files[f].url });
    }
    var dur = mmss_(secondsOf_(totalBytes));
    /* مدت به‌ثانیه روی خودِ قسمت می‌نشیند: بازهٔ زمانیِ گویندگان بی آن حساب
       نمی‌شود، و این تنها جایی است که مدت واقعاً معلوم است. */
    try { ep.__durationSec = Math.round(secondsOf_(totalBytes)); } catch (eDs) {}
    /* اینجا — و فقط اینجا — هم بایتِ واقعیِ صدا در دست است هم متنِ گفته‌شده.
       سقفِ «یک فایل» فردا از همین اندازه‌گیری می‌آید (۶٫۲۹). */
    try { speechCalibRecord_(ep, totalBytes, CFG.SHOW_NAME + ' ' + epNum); } catch (eCal) {}
    try { speakSkipRecord_(ep, CFG.SHOW_NAME + ' ' + epNum, hub, epNum); } catch (eSk) {}

    // فایل یکجا، اگر ساخته شد، اولِ فهرست می‌آید
    for (var mi = mgList.length - 1; mi >= 0; mi--) {
      audioLinks.unshift({ name: mgList[mi].name, url: mgList[mi].url, whole: true });
    }

    // آیتم‌های ارجاعی هم در جدول منابع می‌آیند، با نشانِ «ارجاع به قسمت گذشته»
    var refItems = (meta.refs || []).map(function (r) { r.isRef = true; return r; });
    var allItems = items.concat(refItems);

    var docBlob = Utilities.newBlob(episodeHtml_(epNum, ep, allItems, cat, audioLinks),
                                    'text/html', baseName + '.html');
    // مرحلهٔ ارسال ممکن است دوباره اجرا شود (اگر ایمیل یا تلگرام خطا بدهد،
    // ده دقیقه بعد همین بلوک از نو اجرا می‌شود). پس هر گام یک بار انجام
    // می‌شود و نتیجه‌اش در وضعیتِ قسمت می‌ماند — وگرنه کاربر دو ایمیل و دو
    // پست تلگرام و دو فایل HTML می‌گرفت.
    var docFile = null;
    if (st.docId) { try { docFile = DriveApp.getFileById(st.docId); } catch (eDf) { docFile = null; } }
    if (!docFile) {
      docFile = folder.createFile(docBlob);
      st.docId = docFile.getId();
      props_().setProperty(PK.PENDING, JSON.stringify(st));
    }

    // چند فایلِ «کلِ قسمت» تحویل داده شد.
    //
    // ستونِ لینک‌ها برای این کار به درد نمی‌خورد: هم فایلِ یکجا در آن است هم
    // بخش‌های خام. یک قسمتِ تک‌فایلی که از پنج بخش ساخته شده، شش لینک دارد.
    // سنجه‌ای که روی شمارِ لینک‌ها بنشیند، هر روز بی‌خود شلیک می‌کند.
    try {
      props_().setProperty(PK.EP_LAST, JSON.stringify({
        episode: epNum, duration: dur + ' دقیقه',
        files: mgList.length || st.files.length, parts: st.files.length,
        at: nowStr_() }));
    } catch (eEL) {}

    var pod = ensureTab_(hub, CFG.TAB_PODCASTS, PODCAST_HEADERS);
    pod.getRange(st.podRow, 7, 1, 3).setValues([[dur + ' دقیقه',
      audioLinks.map(function (x) { return x.url; }).join('\n'), docFile.getUrl()]]);

    if (!st.mailed) {
      var mailed = sendEpisodeEmail_(epNum, ep, allItems, cat, audioLinks, docBlob, dur, folder);
      st.mailed = mailed ? 'ارسال شد ' + nowStr_() : 'ارسال ناموفق';
      props_().setProperty(PK.PENDING, JSON.stringify(st));
    }
    pod.getRange(st.podRow, 11).setValue(st.mailed);

    // تلگرام: اگر فایل یکجا داریم، فقط همان یکی می‌رود
    if (!st.tg) {
      // به تلگرام فایلِ یکجا می‌رود، نه تکه‌های کوتاه؛ و اگر قسمت بلندتر از سقفِ
      // یک فایل بود، همان دو-سه فایلِ یکجا — نه پنج تکهٔ سه‌دقیقه‌ای.
      var tgFiles = mgList.length ? mgList : st.files;
      var tg = 'تنظیم نشده';
      try {
        tg = sendTelegramEpisode_(epNum, ep, allItems, cat, tgFiles, docBlob, dur, folder);
      } catch (eTg) { tg = 'ناموفق: ' + String(eTg.message).slice(0, 150); logLine_('تلگرام: ' + eTg.message); }
      st.tg = tg;
      props_().setProperty(PK.PENDING, JSON.stringify(st));
    }
    pod.getRange(st.podRow, 13).setValue(st.tg);

    // منابعِ بیرونی در تبِ خودشان ثبت می‌شوند — با عنوانِ کامل و لینکِ دقیق،
    // بی خلاصه‌کاری. یک بار، و فقط پس از انتشار.
    // نشانِ «ثبت شد» پیش از خودِ ثبت ذخیره می‌شود. مرحلهٔ «ارسال» سنگین‌ترین
    // مرحله است (بارگذاری، ایمیل، فایل‌های تلگرام) و بیشترین احتمالِ کشته‌شدن را
    // دارد؛ با ترتیبِ برعکس، هر اجرای دوباره همهٔ منابع را یک بار دیگر در تب
    // می‌نوشت و دفترِ ارجاعاتِ کاربر پر از ردیفِ تکراری می‌شد.
    if (!st.extLogged) {
      st.extLogged = true;
      props_().setProperty(PK.PENDING, JSON.stringify(st));
      var nExt = logExtSources_(hub, ENRICH_SHOW_VARIETY, epNum, ep.__extSources || []);
      if (nExt) props_().setProperty(PK.ENRICH_AT, nowStr_());
    }

    // حالا که قسمت واقعاً منتشر شده، دستورهای بازبینی بسته می‌شوند.
    try {
      markInstructionsApplied_(hub, meta.orders || [], epNum,
        'به‌عنوان قاعدهٔ سخت به پرامپت گزینش و نگارش تزریق و قسمت منتشر شد');
    } catch (eMk) { logLine_('بستن دستورهای گزارش ناموفق: ' + eMk.message); }

    props_().deleteProperty(PK.PENDING);
    clearAudioContinuation_();
    rebuildIndex_(hub);
    try { writeStatus_(hub, 'قسمت ' + epNum + ' کامل شد'); } catch (eS) {}
    logLine_('قسمت ' + epNum + ' کامل شد (' + dur + '، ' + st.files.length + ' فایل صوتی).');
    /* یوتیوب: فقط بدهی ثبت می‌شود؛ آپلود کارِ شبانه است.
       (فراخوانِ رو به جلو ۳ ← ۲۷، پس در try/catch — بارگذارِ جزئیِ آزمون‌ها
       وگرنه با ReferenceError می‌شکند و قسمتِ تحویل‌شده را زمین می‌زند.) */
    try { ytDueAdd_(ENRICH_SHOW_VARIETY, epNum, folder.getId()); }
    catch (eYq) { logLine_('صفِ یوتیوب ثبت نشد: ' + eYq.message); }
    return { ok: true, episode: epNum, title: ep.title, duration: dur, telegram: st.tg };
  } catch (err) {
    logLine_('خطای صداگذاری: ' + err.message);
    // اگر قسمتی نیمه‌کاره مانده، برای تلاش دوباره زمان‌بندی کن تا معلق نماند
    if (props_().getProperty(PK.PENDING)) {
      try {
        scheduleContinue_(10 * 60 * 1000);
        logLine_('تلاش دوباره برای صداگذاری تا ده دقیقهٔ دیگر زمان‌بندی شد.');
      } catch (e2) {}
    }
    throw err;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * علامت‌گذاری آیتم‌های استفاده‌شده. همهٔ ردیف‌هایی که همان شناسهٔ فایل را دارند
 * علامت می‌خورند، نه فقط ردیف انتخاب‌شده — وگرنه نسخه‌های تکراریِ همان فایل
 * در قسمت‌های بعدی دوباره روایت می‌شدند.
 */
function markUsed_(hub, items, epNum) {
  var when = nowStr_();
  var byCat = Object.create(null);
  for (var i = 0; i < items.length; i++) (byCat[items[i].cat] = byCat[items[i].cat] || []).push(items[i]);

  for (var cat in byCat) {
    if (!Object.prototype.hasOwnProperty.call(byCat, cat)) continue;
    var sh = hub.getSheetByName(cat);
    if (!sh || sh.getLastRow() < 2) continue;
    var wanted = {};
    for (var w = 0; w < byCat[cat].length; w++) wanted[String(byCat[cat][w].id)] = true;

    var n = sh.getLastRow() - 1;
    var ids = sh.getRange(2, COL.ID, n, 1).getValues();
    var used = sh.getRange(2, COL.USED_EP, n, 2).getValues();
    var touched = false;
    for (var r = 0; r < n; r++) {
      if (wanted[String(ids[r][0])] && !used[r][0]) { used[r][0] = epNum; used[r][1] = when; touched = true; }
    }
    if (touched) sh.getRange(2, COL.USED_EP, n, 2).setValues(used);
  }
}
