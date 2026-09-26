/***********************************************************************
 * بخشِ ۳۵ — اثر انگشتِ معنایی
 *
 * پرسشِ صاحبِ برنامه: «یعنی اون حالت هوشمندش هم دنبالِ مترادفِ کلمات و
 * عبارات می‌گرده نه مفهوم؟» — و جوابْ بله بود. بخشِ ۳۴ نامزدها را با
 * **واژه** پیدا می‌کرد و بعد با مدل مرتبشان می‌کرد؛ پس متنی که هیچ‌کدام
 * از واژه‌های پرس‌وجو در آن نبود، هرگز به دستِ مدل نمی‌رسید. داوریْ
 * مفهومی بود، بازیابی نه.
 *
 * این بخش نیمهٔ گمشده را می‌سازد: به ازای هر ردیفِ بانک یک **بردار** —
 * چکیدهٔ عددیِ «این محتوا دربارهٔ چیست». دو متن که یک حرف را با دو دسته
 * واژهٔ کاملاً متفاوت می‌زنند، بردارهای نزدیکی دارند.
 *
 * ══ سه تصمیم که شکلِ همه‌چیز را تعیین کردند ══
 *
 * ۱) **بردار در شیت نمی‌نشیند.** خواستهٔ صریح این بود که اثر انگشت در یک
 *    ستون ثبت شود؛ ولی ۱۵۳۶ عدد در هر سلول یعنی ده‌ها مگابایتِ متن در
 *    هابی که همین حالا ۲۹ مگابایت است — و هر خواندنِ بانک آن را با خود
 *    می‌کشد. پس در شیت **شناسه** و **اثرانگشتِ متن** و **وضعیت** می‌نشیند
 *    (سه ستونِ خوانا و قابلِ استفاده)، و خودِ بردار در پوشهٔ OUTPUT.
 *    و در شیت‌های منبع هیچ ستونی ساخته نمی‌شود: آن‌ها فقط‌خواندنی‌اند و
 *    این مرز جای مذاکره ندارد. محتوای تازهٔ منبع از راهِ `syncCatalog`
 *    به بانک می‌آید و همان‌جا اثر انگشت می‌گیرد.
 *
 * ۲) **تاریخ در اثر انگشت نیست.** خواستهٔ خودِ صاحبِ برنامه: «نه از حیثِ
 *    زمانی بلکه از حیثِ محتوایی». اگر تاریخ وارد متنِ بردارشده شود، دو
 *    محتوای هم‌روز به هم نزدیک می‌شوند بی آنکه ربطی داشته باشند.
 *
 * ۳) **یک فراخوان، دو نمایش.** مدل بردارِ `EMB_DIM` را می‌دهد؛ بردارِ
 *    جست‌وجو همان است بریده به `EMB_PROBE_DIM` و دوباره نرمال‌شده — این
 *    همان چیزی است که MRL تضمین می‌کند. دو فراخوان لازم نیست. و هر بُعدی
 *    جز ۳۰۷۲ **باید دستی نرمال شود**؛ نکردنش هیچ خطایی نمی‌دهد و فقط هر
 *    مقایسهٔ کسینوسی را بی‌صدا غلط می‌کند.
 ***********************************************************************/

var EMB_VER = 1;

/**
 * نسخهٔ **دستورِ ساختِ متن** — یعنی `embText_`.
 *
 * ══ چرا این عدد لازم شد، و چرا نبودنش یک باگِ واقعی بود ══
 * ۷٫۲۶ ردیفی را که یک بار اثر انگشت گرفته بود دیگر دست نمی‌زد. یعنی اگر
 * فردا بفهمیم متنی که به مدل می‌رود ناقص است و درستش کنیم، **دوازده هزار
 * ردیفِ قبلی برای همیشه با بردارِ غلط می‌ماندند** و هیچ‌چیز نشان نمی‌داد.
 * دقیقاً همان شکلی که ۵٫۹۵ برای عنوانِ فصل‌های جزوه نوشت: «تمیزکردنِ ورودی
 * آنچه را از قبل نوشته شده درست نمی‌کند».
 *
 * این عدد در ستونِ «اثر انگشت» کنارِ هش می‌نشیند (`<هش>·و<نسخه>`). هر بار
 * که `embText_` عوض شود این را یکی بالا ببر — و همهٔ ردیف‌ها خودبه‌خود، با
 * همان مکان‌نمای موجود و هزینهٔ چند شب، از نو ساخته می‌شوند.
 *
 * ۲ = افزودنِ «مشخصات استخراج‌شده» (۷٫۲۷).
 */
var EMB_TEXT_VER = 2;

var EMB_HEADERS = ['تاریخ', 'گام', 'بررسی‌شده', 'تازه', 'ناموفق',
                   'جمعِ آماده', 'کلِ ردیف‌ها', 'پوشش', 'خودآزمون', 'یادداشت'];

/** وضعیت‌هایی که در ستونِ «وضعیت اثر انگشت» می‌نشینند. */
var EMB_ST = { OK: 'ثبت‌شده', FAIL: 'ناموفق', GIVEUP: 'رهاشده' };

function embOn_() { return CFG.EMB_ON !== false; }
function embDim_() { var d = Number(CFG.EMB_DIM) || 1536; return Math.max(128, Math.min(3072, d)); }
function embProbeDim_() {
  var d = Number(CFG.EMB_PROBE_DIM) || 256;
  return Math.max(64, Math.min(embDim_(), d));
}

// ─────────────────────────────────────────── پوشه و فایل‌های بردار

/**
 * پوشهٔ بردارها، زیرِ OUTPUT.
 *
 * زیرپوشه و نه ریشه: ریشه فقط چیزهایی را نگه می‌دارد که موتور با نام
 * پیدایشان می‌کند، و `outLayoutCheck_` هر چیزِ ناشناسِ دیگری را گزارش
 * می‌کند. ده‌ها فایلِ قطعه در ریشه یعنی ده‌ها هشدارِ بی‌جا هر شب.
 */
function embFolder_() {
  var name = String(CFG.EMB_FOLDER || 'اثر انگشتِ معنایی');
  var root = outFolder_();
  var it = root.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return root.createFolder(name);
}

function embPutJson_(name, obj) {
  var folder = embFolder_();
  var body = JSON.stringify(obj);
  var it = folder.getFilesByName(name);
  if (it.hasNext()) {
    var f = it.next();
    f.setContent(body);
    while (it.hasNext()) { try { it.next().setTrashed(true); } catch (e) {} }
    return f;
  }
  return folder.createFile(Utilities.newBlob(body, 'application/json', name));
}

function embGetJson_(name) {
  try {
    var it = embFolder_().getFilesByName(name);
    if (!it.hasNext()) return null;
    return JSON.parse(it.next().getBlob().getDataAsString());
  } catch (e) {
    logLine_('خواندنِ «' + name + '» (اثر انگشت) ناموفق: ' + e.message);
    return null;
  }
}

function embIndexName_() { return String(CFG.EMB_INDEX_FILE || '_EMB-INDEX.json'); }
function embShardName_(seq, kind) {
  var n = String(seq);
  while (n.length < 4) n = '0' + n;
  return '_EMB-' + (kind === 'v' ? 'V' : 'P') + '-' + n + '.json';
}

/**
 * فهرستِ قطعه‌ها. تنها جایی که «چه چیزی ساخته شده» نوشته است.
 *
 * `dim`/`probeDim`/`model` هم در آن می‌نشینند، چون عوض‌شدنشان یعنی
 * بردارهای قدیمی با تازه‌ها **قابلِ مقایسه نیستند** — و مقایسهٔ دو بردار
 * از دو مدل هیچ خطایی نمی‌دهد، فقط نتیجهٔ بی‌معنا می‌دهد.
 */
function embIndex_() {
  var ix = embGetJson_(embIndexName_());
  if (!ix || typeof ix !== 'object') {
    ix = { ver: EMB_VER, model: String(CFG.EMB_MODEL || ''), dim: embDim_(),
           probeDim: embProbeDim_(), at: '', shards: [], counts: null };
  }
  if (!ix.shards || Object.prototype.toString.call(ix.shards) !== '[object Array]') ix.shards = [];
  return ix;
}

function embIndexSave_(ix) {
  ix.ver = EMB_VER;
  ix.at = nowStr_();
  embPutJson_(embIndexName_(), ix);
  return ix;
}

/**
 * آیا ایندکسِ موجود با تنظیماتِ امروز هم‌خانواده است؟
 *
 * اگر مدل یا بُعد عوض شده باشد، بردارهای قدیمی باید **دوباره ساخته**
 * شوند؛ وگرنه نیمی از بانک با یک زبان توصیف شده و نیمِ دیگر با زبانی
 * دیگر، و نزدیکی‌ها معنا ندارند. این تابع فقط خبر می‌دهد — چیزی را
 * خودش پاک نمی‌کند، چون پاک‌کردن تصمیمِ آدم است نه تصمیمِ شب.
 */
function embIndexStale_(ix) {
  if (!ix || !ix.shards.length) return '';
  var why = [];
  if (String(ix.model || '') !== String(CFG.EMB_MODEL || '')) {
    why.push('مدل از «' + ix.model + '» به «' + CFG.EMB_MODEL + '» عوض شده');
  }
  if (Number(ix.dim) !== embDim_()) why.push('بُعد از ' + ix.dim + ' به ' + embDim_() + ' عوض شده');
  if (Number(ix.probeDim) !== embProbeDim_()) {
    why.push('بُعدِ جست‌وجو از ' + ix.probeDim + ' به ' + embProbeDim_() + ' عوض شده');
  }
  return why.join(' · ');
}

// ─────────────────────────────────────────── شناسه و اثرانگشتِ متن

/** بایت‌های SHA-256 → هگز. Apps Script بایتِ علامت‌دار می‌دهد. */
function embHex_(bytes, take) {
  var out = '';
  var n = Math.min(bytes.length, take || bytes.length);
  for (var i = 0; i < n; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    var h = b.toString(16);
    out += (h.length === 1 ? '0' : '') + h;
  }
  return out;
}

function embSha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
                                 String(s), Utilities.Charset.UTF_8);
}

/**
 * شناسهٔ پایدارِ یک محتوا: `CE-` + ده نویسهٔ base36.
 *
 * از (شناسهٔ فایل | تاریخِ پردازش) ساخته می‌شود — همان کلیدی که
 * `syncCatalog` برای یکتایی به کار می‌برد. پس **هرگز عوض نمی‌شود** و
 * هر جای دیگری هم قابلِ محاسبه است. این همان چیزی است که برای کارهای
 * بعدی لازم می‌شود: یک نام که به ردیف و به جای فایل در درایو گره
 * نخورده باشد.
 */
function embId_(fileId, date) {
  var raw = String(fileId || '') + '|' + String(date || '');
  var b = embSha_(raw);
  var n = 0;
  // ۵۲ بیت از هگز — بیش از حدِ کافی برای ده‌ها هزار ردیف
  var hex = embHex_(b, 7);
  for (var i = 0; i < hex.length; i++) n = n * 16 + parseInt(hex.charAt(i), 16);
  var s = n.toString(36);
  while (s.length < 10) s = '0' + s;
  return 'CE-' + s.slice(-10);
}

/** اثرانگشتِ متن — ۱۶ نویسهٔ هگز. تغییرِ محتوا را نشان می‌دهد. */
function embHash_(text) { return embHex_(embSha_(String(text || '')), 8); }

/**
 * متنی که بردار از آن ساخته می‌شود.
 *
 * برچسب‌های فارسی عمدی‌اند: مدل‌های امروزی از ساختار بهره می‌برند و
 * «موضوع: …» به‌مراتب گویاتر از چسباندنِ خامِ شش ستون است. و **تاریخ
 * نیست** — رتبه‌بندی باید محتوایی باشد نه زمانی.
 */
function embText_(o) {
  var parts = [];
  var push = function (label, v) {
    v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    if (v) parts.push(label + ': ' + v);
  };
  push('دسته', o.cat);
  push('نوع', o.kind);
  push('موضوع', o.topic);
  push('پیام', o.msg);
  push('خلاصه', o.summary);
  push('متن', o.body);
  push('فضا', o.vibe);
  push('برچسبِ منبع', o.raw);
  /* هرچه تحلیلگر استخراج کرده و در شش ستونِ بالا جا نشده (۷٫۲۷): مدت
     زمان، اشخاص، تحلیل موسیقی، مشخصات فنی، تحلیل بصری و صوتی … این همان
     چیزی است که «یادم هست یه کلیپی با فلان مشخصه بود» را ممکن می‌کند. */
  push('مشخصات', o.specs);
  var s = parts.join('\n');
  var cap = Math.max(500, Number(CFG.EMB_TEXT_MAX) || 6000);
  return s.length > cap ? s.slice(0, cap) : s;
}

// ─────────────────────────────────────────── بردار: نرمال، برش، فشرده

/**
 * نرمال‌سازیِ L2 — **اجباری** برای هر بُعدی جز ۳۰۷۲.
 *
 * مستندِ خودِ گوگل این را صریح گفته و نادیده‌گرفتنش هیچ خطایی نمی‌دهد:
 * فقط ضربِ داخلی دیگر کسینوس نیست و رتبه‌بندی بی‌صدا خراب می‌شود.
 */
function embNorm_(v) {
  var s = 0, i;
  for (i = 0; i < v.length; i++) s += v[i] * v[i];
  s = Math.sqrt(s);
  if (!isFinite(s) || s <= 0) return v.slice(0);
  var out = new Array(v.length);
  for (i = 0; i < v.length; i++) out[i] = v[i] / s;
  return out;
}

/** بریدن به d بُعد و نرمال‌کردنِ دوباره — همان کاری که MRL اجازه می‌دهد. */
function embTrunc_(v, d) {
  if (d >= v.length) return embNorm_(v);
  return embNorm_(v.slice(0, d));
}

/**
 * بردارِ واحد → بایتِ علامت‌دار → base64.
 *
 * چون بردار نرمال است، هر مؤلفه در [-۱,۱] می‌نشیند و یک ضریبِ ثابتِ ۱۲۷
 * کافی است؛ ضریبِ جداگانه به ازای هر بردار لازم نیست. خطای کوانتش حدودِ
 * نیم‌درصد است و روی ترتیبِ نتایج اثرِ محسوسی ندارد.
 */
function embPack_(v) {
  var b = new Array(v.length);
  for (var i = 0; i < v.length; i++) {
    var q = Math.round(v[i] * 127);
    if (q > 127) q = 127;
    if (q < -127) q = -127;
    b[i] = q;
  }
  return Utilities.base64Encode(b);
}

function embUnpack_(s) {
  try { return Utilities.base64Decode(String(s || '')); }
  catch (e) { return []; }
}

/**
 * ضربِ داخلیِ دو بردارِ فشرده → کسینوس تقریبی.
 *
 * بایت‌ها علامت‌دارند؛ این‌جا لازم نیست ماسک شوند (برخلافِ نمونه‌های
 * صوتیِ بخشِ ۲۳ که ۱۶-بیتی‌اند و بایتِ بالایشان باید ماسک شود).
 */
function embDot_(a, b) {
  var n = Math.min(a.length, b.length), s = 0;
  for (var i = 0; i < n; i++) s += a[i] * b[i];
  return s / (127 * 127);
}

/**
 * مرکزِ یک قطعه: میانگینِ بردارهای کوتاهش، نرمال‌شده و فشرده.
 *
 * ══ چرا این لازم شد، و چرا **حالا** ══
 * ۷٫۲۶ نوشت «اگر روزی اندازهٔ ایندکس مسئله شد، خوشه‌بندی قدمِ بعدی است».
 * شبِ اولِ واقعی عدد را داد: بانک ۵۰٬۳۶۷ ردیف دارد، پس ایندکسِ کوتاه
 * ~۳۰ مگابایت در ۳۴ قطعه می‌شود و هیچ جست‌وجویی نمی‌تواند همه‌اش را
 * بخوانَد. مسئله فرضی نبود؛ فقط هنوز نرسیده بود.
 *
 * و «حالا» به یک دلیلِ مشخص: مرکز باید هنگامِ **نوشتنِ** قطعه حساب شود.
 * اگر شش هفته صبر کنیم، ۳۴ قطعه بی‌مرکز روی دست می‌مانَد و یک مهاجرت
 * لازم می‌شود. کاری که با رشدِ داده گران‌تر می‌شود، همان کاری است که
 * باید زودتر انجام شود.
 *
 * قطعه‌های نزدیکِ هم اینجا تصادفی نیستند: پُر شدنشان به ترتیبِ تب‌های
 * بانک است، یعنی هر قطعه تقریباً یک دسته است. پس مرکز واقعاً معنا دارد
 * — چیزی که در یک ایندکسِ درهم صادق نبود.
 */
function embCentroid_(packedList) {
  if (!packedList || !packedList.length) return '';
  var sum = null, n = 0;
  for (var i = 0; i < packedList.length; i++) {
    var v = embUnpack_(packedList[i]);
    if (!v || !v.length) continue;
    if (!sum) { sum = []; for (var z = 0; z < v.length; z++) sum.push(0); }
    if (v.length !== sum.length) continue;
    for (var j = 0; j < v.length; j++) sum[j] += v[j];
    n++;
  }
  if (!sum || !n) return '';
  for (var k = 0; k < sum.length; k++) sum[k] = sum[k] / n / 127;
  return embPack_(embNorm_(sum));
}

/**
 * مرکزهای جامانده را حساب می‌کند — برای قطعه‌هایی که پیش از ۷٫۲۸ نوشته
 * شده‌اند. چندتا در هر شب، تا بارِ یک شب نشود.
 */
function embCentroidFix_(cap) {
  var out = { fixed: 0, left: 0 };
  var ix = embIndex_();
  cap = Math.max(1, cap || Number(CFG.EMB_CENTROID_FIX) || 3);
  for (var i = 0; i < ix.shards.length; i++) {
    if (ix.shards[i].c) continue;
    if (out.fixed >= cap) { out.left++; continue; }
    var P = embGetJson_(embShardName_(ix.shards[i].seq, 'p'));
    if (!P || !P.p || !P.p.length) continue;
    var c = embCentroid_(P.p);
    if (!c) continue;
    ix.shards[i].c = c;
    out.fixed++;
  }
  if (out.fixed) { try { embIndexSave_(ix); } catch (e) {} }
  return out;
}

// ─────────────────────────────────────────── فراخوانِ مدل

/**
 * بردارِ چند متن، در یک فراخوان.
 *
 * برمی‌گرداند `{ok, vecs, note}`. `vecs[i]` یا آرایهٔ عدد است یا `null`
 * (همان متن نشد) — پس ردیفِ ناموفق، ردیف‌های دیگرِ همان دسته را با خود
 * پایین نمی‌کشد.
 */
function embCall_(texts, taskType) {
  var out = { ok: false, vecs: [], note: '' };
  if (!texts.length) { out.ok = true; return out; }
  var model = String(CFG.EMB_MODEL || 'gemini-embedding-001');
  var dim = embDim_();
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
            model + ':batchEmbedContents?key=' + encodeURIComponent(apiKey_());
  var reqs = [];
  for (var i = 0; i < texts.length; i++) {
    reqs.push({ model: 'models/' + model,
                content: { parts: [{ text: String(texts[i] || ' ') }] },
                taskType: taskType || 'RETRIEVAL_DOCUMENT',
                outputDimensionality: dim });
  }
  var res;
  try {
    res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json',
                                   payload: JSON.stringify({ requests: reqs }),
                                   muteHttpExceptions: true });
  } catch (e) { out.note = 'اتصال: ' + e.message; return out; }
  var code = res.getResponseCode();
  if (code !== 200) {
    out.note = 'HTTP ' + code + ': ' + String(res.getContentText() || '').slice(0, 220);
    return out;
  }
  var j;
  try { j = JSON.parse(res.getContentText()); }
  catch (e2) { out.note = 'پاسخِ ناخوانا: ' + e2.message; return out; }
  var emb = (j && (j.embeddings || j.embedding)) || [];
  if (Object.prototype.toString.call(emb) !== '[object Array]') emb = [emb];
  for (var k = 0; k < texts.length; k++) {
    var e = emb[k];
    var vals = e && (e.values || e.value);
    if (!vals || !vals.length) { out.vecs.push(null); continue; }
    // ══ نرمال‌سازی، همیشه ══
    // برای ۳۰۷۲ خودِ API نرمال می‌دهد و این کار بی‌اثر است؛ برای هر بُعدِ
    // دیگری اجباری است. یک شاخهٔ شرطی این‌جا یعنی یک روز کسی بُعد را عوض
    // می‌کند و هیچ‌چیز نمی‌گوید که رتبه‌بندی از کار افتاده.
    out.vecs.push(embNorm_(vals));
  }
  out.ok = true;
  return out;
}

// ─────────────────────────────────────────── پیمایشِ بانک

/** تب‌های بانک — همان تعریفی که جست‌وجو به کار می‌برد. */
function embHubTabs_(hub) { return srchHubTabs_(hub || getHub_()); }

function embCursors_() {
  try { return JSON.parse(props_().getProperty(PK.EMB_CUR) || '{}') || {}; }
  catch (e) { return {}; }
}
function embCursorsSave_(c) {
  try { props_().setProperty(PK.EMB_CUR, JSON.stringify(c)); } catch (e) {}
}

/**
 * نشانِ ناموفقی — و در تلاشِ آخر، «رهاشده».
 *
 * ══ چرا همان‌جا رها می‌شود و نه فقط رد ══
 * اگر ردیفِ به‌سقف‌رسیده «ناموفق» بماند، در شمارش نه «آماده» است نه
 * «رهاشده»، پس `pending` هرگز صفر نمی‌شود و «~۳ شب تا پایان» تا ابد در
 * گزارشِ روزانه می‌مانَد. همان درسِ ۵٫۸۸ دربارهٔ جزوه: «عقب‌مانده» یعنی
 * قرار است اتفاقی بیفتد، و گزارشِ چیزی که هرگز نمی‌افتد به‌عنوانِ
 * عقب‌ماندگی، همان‌جایی است که هشدار تبدیل به نویز می‌شود.
 */
function embFailMark_(tries) {
  var max = Math.max(1, Number(CFG.EMB_TRY_MAX) || 3);
  if (tries >= max) return EMB_ST.GIVEUP + ' — پس از ' + tries + ' تلاش';
  return EMB_ST.FAIL + ' ' + tries;
}

/** شمارِ تلاش‌های ناموفقِ یک ردیف، از متنِ ستونِ وضعیت. */
function embTries_(st) {
  var m = String(st || '').match(/(\d+)/);
  return m ? (Number(m[1]) || 0) : 0;
}

/** `<هش>·و<نسخهٔ دستور>` — هر دو در یک سلول، چون همیشه با هم خوانده می‌شوند. */
function embFpCell_(hash) { return String(hash) + '·و' + EMB_TEXT_VER; }

/** نسخهٔ دستوری که این ردیف با آن ساخته شده. نبودش یعنی نسخهٔ ۱. */
function embFpVer_(cell) {
  var m = String(cell || '').match(/·و(\d+)\s*$/);
  return m ? (Number(m[1]) || 0) : 1;
}

/**
 * ردیف‌هایی از یک تب که اثر انگشت می‌خواهند.
 *
 * فقط سه ستونِ باریک خوانده می‌شود، نه کلِ ردیف — تبی که ستونِ «متن»ش
 * ۱۵۰۰ نویسه دارد، با خواندنِ کامل بودجهٔ یک دور را همان اول می‌خورَد.
 */
function embScanTab_(sh, from, need, deadline) {
  var out = { rows: [], cursor: from, done: false, abandoned: 0, ok: 0, failed: 0, oldVer: 0 };
  var last = sh.getLastRow();
  if (last < 2) { out.done = true; out.cursor = 2; return out; }
  var r = Math.max(2, from || 2);
  var blk = Math.max(200, Number(CFG.EMB_SCAN_BLOCK) || 2000);
  while (r <= last) {
    if (new Date().getTime() > deadline) { out.cursor = r; return out; }
    var n = Math.min(blk, last - r + 1);
    var vals;
    try { vals = sh.getRange(r, COL.EMB_ID, n, 3).getValues(); }
    catch (e) { out.cursor = last + 1; out.done = true; return out; }
    for (var i = 0; i < vals.length; i++) {
      var id = String(vals[i][0] || '').trim();
      var st = String(vals[i][2] || '').trim();
      if (st.indexOf(EMB_ST.GIVEUP) === 0) { out.abandoned++; continue; }
      if (id && st.indexOf(EMB_ST.OK) === 0) {
        /* ساخته شده — ولی با کدام دستور؟ متنی که به مدل می‌رود در
           نسخه‌های تازه عوض می‌شود، و رد شدن از روی ردیف‌های قدیمی یعنی
           نیمی از بانک با یک زبان توصیف شده و نیمِ دیگر با زبانی دیگر. */
        if (embFpVer_(vals[i][1]) >= EMB_TEXT_VER) { out.ok++; continue; }
        out.oldVer++;
        out.rows.push({ row: r + i, tries: 0, why: 'دستورِ تازه' });
        if (out.rows.length >= need) { out.cursor = r + i + 1; return out; }
        continue;
      }
      if (st.indexOf(EMB_ST.FAIL) === 0) {
        out.failed++;
        if (embTries_(st) >= Math.max(1, Number(CFG.EMB_TRY_MAX) || 3)) continue;
      }
      out.rows.push({ row: r + i, tries: embTries_(st) });
      if (out.rows.length >= need) { out.cursor = r + i + 1; return out; }
    }
    r += n;
  }
  out.cursor = last + 1;
  out.done = true;
  return out;
}

/**
 * خواندنِ کاملِ ردیف‌های لازم، با کمترین رفت‌وبرگشت.
 *
 * ردیف‌های نزدیک به هم در یک `getValues` خوانده می‌شوند. فاصلهٔ مجاز
 * کران دارد، وگرنه دو ردیفِ دورافتاده باعثِ خواندنِ هزاران ردیفِ بینشان
 * می‌شد — همان اشتباهی که ۷٫۲۵ در بلوک‌خوانیِ جست‌وجو اصلاح کرد.
 */
function embReadRows_(sh, rows) {
  var map = {};
  if (!rows.length) return map;
  var runs = [], cur = null;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i].row;
    if (cur && r - cur.end <= 40 && (r - cur.start + 1) <= 400) { cur.end = r; continue; }
    cur = { start: r, end: r };
    runs.push(cur);
  }
  for (var k = 0; k < runs.length; k++) {
    var n = runs[k].end - runs[k].start + 1;
    var vals;
    try { vals = sh.getRange(runs[k].start, 1, n, HUB_HEADERS.length).getValues(); }
    catch (e) { continue; }
    for (var j = 0; j < vals.length; j++) map[runs[k].start + j] = vals[j];
  }
  return map;
}

/** یک ردیفِ بانک → شیءِ کاری. */
function embRowObj_(sh, row, v) {
  var g = function (c) { return String(v[c - 1] == null ? '' : v[c - 1]); };
  return { tab: sh.getName(), row: row, cat: sh.getName(),
           fileId: g(COL.ID).trim(), date: g(COL.DATE), kind: g(COL.KIND),
           topic: g(COL.TOPIC), msg: g(COL.MSG), summary: g(COL.SUMMARY),
           body: g(COL.BODY), vibe: g(COL.VIBE), raw: g(COL.RAW),
           specs: g(COL.SPECS), link: g(COL.LINK) };
}

/** نوشتنِ سه ستون برای چند ردیف، با کمترین `setValues`. */
function embStamp_(sh, stamps) {
  var rows = [];
  for (var k in stamps) {
    if (Object.prototype.hasOwnProperty.call(stamps, k)) rows.push(Number(k));
  }
  if (!rows.length) return 0;
  rows.sort(function (a, b) { return a - b; });
  var wrote = 0, i = 0;
  while (i < rows.length) {
    var j = i;
    while (j + 1 < rows.length && rows[j + 1] === rows[j] + 1) j++;
    var block = [];
    for (var r = rows[i]; r <= rows[j]; r++) block.push(stamps[r]);
    try {
      sh.getRange(rows[i], COL.EMB_ID, block.length, 3).setValues(block);
      wrote += block.length;
    } catch (e) { logLine_('ثبتِ اثر انگشت در «' + sh.getName() + '» ناموفق: ' + e.message); }
    i = j + 1;
  }
  return wrote;
}

// ─────────────────────────────────────────── نوشتنِ قطعه‌ها

/**
 * ردیف‌های تازه را به قطعه‌ها می‌نویسد.
 *
 * اگر قطعهٔ آخر پُر نشده باشد، به همان اضافه می‌شود؛ وگرنه قطعهٔ تازه.
 * قطعه **یک‌بار در پایانِ هر دور** نوشته می‌شود، نه به ازای هر دسته:
 * بازنویسیِ یک فایلِ چندمگابایتی در هر دسته، بودجهٔ دور را می‌خورَد.
 */
function embShardFlush_(ix, recs) {
  if (!recs.length) return 0;
  /* کفِ این عدد ۱ است و نه ۲۰۰: کفی که مقدارِ تنظیم‌شده را بی‌صدا نادیده
     بگیرد، همان تله‌ای است که در همین سشن سه بار آزمون را گمراه کرد —
     مقدار گذاشته می‌شود، اثر نمی‌کند، و هیچ‌چیز نمی‌گوید چرا. فقط صفر
     جلو گرفته می‌شود، که حلقه را بی‌پایان می‌کند. */
  var capRows = Math.max(1, Number(CFG.EMB_SHARD_ROWS) || 1500);
  var wrote = 0, at = 0;

  while (at < recs.length) {
    var tail = ix.shards.length ? ix.shards[ix.shards.length - 1] : null;
    var seq, P, V;
    if (tail && Number(tail.rows) < capRows) {
      seq = tail.seq;
      P = embGetJson_(embShardName_(seq, 'p'));
      V = embGetJson_(embShardName_(seq, 'v'));
      // قطعه‌ای که در فهرست هست ولی فایلش نیست: فهرست دروغ می‌گوید. بازش
      // نمی‌نویسیم روی هوا — از نو ساخته می‌شود و شمارش اصلاح.
      if (!P || !V) { P = embShardEmpty_(seq); V = { seq: seq, dim: embDim_(), id: [], v: [] }; }
    } else {
      seq = Number(props_().getProperty(PK.EMB_SHARD) || '0') + 1;
      props_().setProperty(PK.EMB_SHARD, String(seq));
      P = embShardEmpty_(seq);
      V = { seq: seq, dim: embDim_(), id: [], v: [] };
      ix.shards.push({ seq: seq, rows: 0, at: nowStr_() });
      tail = ix.shards[ix.shards.length - 1];
    }
    var room = capRows - (P.id.length || 0);
    if (room <= 0) {
      /* فهرست می‌گفت جا هست و فایل می‌گوید نیست. حلقه نباید این‌جا
         بچرخد: شمارشِ فهرست از روی فایل اصلاح می‌شود و دورِ بعدی قطعهٔ
         تازه می‌سازد. یک `continue` بی این اصلاح حلقهٔ بی‌پایان است —
         و حلقهٔ بی‌پایان در Apps Script خطا نمی‌دهد، فقط شش دقیقه بعد
         کشته می‌شود و هیچ‌چیز نوشته نمی‌شود. */
      for (var z = 0; z < ix.shards.length; z++) {
        if (ix.shards[z].seq === seq) ix.shards[z].rows = P.id.length;
      }
      continue;
    }
    var take = Math.min(room, recs.length - at);
    for (var i = 0; i < take; i++) {
      var r = recs[at + i];
      P.id.push(r.id); P.tb.push(r.tab); P.rw.push(r.row); P.fid.push(r.fileId);
      P.kd.push(r.kind); P.dt.push(r.date); P.ti.push(r.title); P.p.push(r.probe);
      V.id.push(r.id); V.v.push(r.full);
    }
    P.n = P.id.length; P.at = nowStr_();
    V.n = V.id.length;
    embPutJson_(embShardName_(seq, 'p'), P);
    embPutJson_(embShardName_(seq, 'v'), V);
    var cen = '';
    try { cen = embCentroid_(P.p); } catch (eC) { cen = ''; }
    for (var s = 0; s < ix.shards.length; s++) {
      if (ix.shards[s].seq === seq) {
        ix.shards[s].rows = P.n; ix.shards[s].at = P.at;
        if (cen) ix.shards[s].c = cen;
      }
    }
    wrote += take;
    at += take;
  }
  return wrote;
}

function embShardEmpty_(seq) {
  return { seq: seq, n: 0, dim: embDim_(), pd: embProbeDim_(), at: '',
           id: [], tb: [], rw: [], fid: [], kd: [], dt: [], ti: [], p: [] };
}

// ─────────────────────────────────────────── دورِ ساخت

/**
 * یک دورِ اثرانگشت‌زنی.
 *
 * تب‌ها **چرخان** پیمایش می‌شوند: شروعِ هر دور یک تب جلوتر از دورِ قبل.
 * بی این، تبِ اولِ فهرست هر شب همهٔ بودجه را می‌گرفت و تب‌های پایینی
 * هرگز نوبت نمی‌گرفتند — همان اشتباهی که وارسیِ روزانهٔ جزوه در ۵٫۸۸
 * داشت.
 */
function embRunDue_(cap, budgetMs) {
  var out = { ok: false, scanned: 0, made: 0, failed: 0, tabs: 0, left: 0,
              notes: [], stale: '', ms: 0 };
  var t0 = new Date().getTime();
  if (!embOn_()) { out.notes.push('اثر انگشت خاموش است.'); return out; }
  try { apiKey_(); }
  catch (eK) { out.notes.push('کلید Gemini ثبت نشده.'); return out; }

  cap = Math.max(1, cap || Number(CFG.EMB_MAX_PER_RUN) || 1200);
  var deadline = t0 + Math.max(20000, budgetMs || Number(CFG.EMB_BUDGET_MS) || 150000);
  var hub = getHub_();
  var ix = embIndex_();

  out.stale = embIndexStale_(ix);
  if (out.stale) {
    // مدل یا بُعد عوض شده. ادامه‌دادن یعنی نیمی از بانک با یک زبان و نیمی
    // با زبانی دیگر — پس کار متوقف می‌شود و آدم تصمیم می‌گیرد.
    out.notes.push('ایندکس با تنظیماتِ امروز نمی‌خواند (' + out.stale +
                   ')؛ تا بازسازیِ دستی چیزی ساخته نشد.');
    return out;
  }

  var tabs = embHubTabs_(hub);
  if (!tabs.length) { out.notes.push('تبی برای پیمایش نبود.'); return out; }
  var cursors = embCursors_();
  var start = Number(props_().getProperty(PK.EMB_TAB) || '0') || 0;
  if (start >= tabs.length) start = 0;

  var recs = [], batch = Math.max(1, Number(CFG.EMB_BATCH) || 64);
  var totalNeed = cap;

  for (var t = 0; t < tabs.length && totalNeed > 0; t++) {
    if (new Date().getTime() > deadline) break;
    var sh = tabs[(start + t) % tabs.length];
    var key = sh.getName();
    var sc = embScanTab_(sh, Number(cursors[key]) || 2, totalNeed, deadline);
    cursors[key] = sc.done ? 2 : sc.cursor;      // دورِ کامل که تمام شد، از نو
    out.scanned += sc.ok + sc.failed + sc.abandoned + sc.rows.length;
    if (!sc.rows.length) continue;
    out.tabs++;

    var vals = embReadRows_(sh, sc.rows);
    var tabStamps = {};
    for (var b = 0; b < sc.rows.length; b += batch) {
      if (new Date().getTime() > deadline) { out.notes.push('بودجهٔ زمان تمام شد.'); break; }
      var slice = sc.rows.slice(b, b + batch);
      var objs = [], texts = [];
      for (var i = 0; i < slice.length; i++) {
        var v = vals[slice[i].row];
        if (!v) continue;
        var o = embRowObj_(sh, slice[i].row, v);
        var txt = embText_(o);
        // ردیفی که هیچ متنی ندارد بردار نمی‌خواهد. «رهاشده» می‌شود تا هر
        // شب دوباره شمرده نشود و پوششِ ۱۰۰٪ برای همیشه دست‌نیافتنی نمانَد.
        if (!txt || !o.fileId) {
          tabStamps[slice[i].row] = [embId_(o.fileId, o.date), '',
                                     EMB_ST.GIVEUP + ' — متنی نداشت'];
          continue;
        }
        o.tries = slice[i].tries;
        o.text = txt;
        objs.push(o); texts.push(txt);
      }
      if (!objs.length) continue;
      var call = embCall_(texts, 'RETRIEVAL_DOCUMENT');
      if (!call.ok) {
        out.failed += objs.length;
        for (var f = 0; f < objs.length; f++) {
          tabStamps[objs[f].row] = [embId_(objs[f].fileId, objs[f].date), '',
                                    embFailMark_(objs[f].tries + 1)];
        }
        if (out.notes.indexOf(call.note) === -1) out.notes.push(call.note);
        // یک خطای فراخوان معمولاً برای همهٔ دسته‌های امشب تکرار می‌شود
        break;
      }
      for (var c = 0; c < objs.length; c++) {
        var vec = call.vecs[c];
        var ob = objs[c];
        if (!vec) {
          out.failed++;
          tabStamps[ob.row] = [embId_(ob.fileId, ob.date), '', embFailMark_(ob.tries + 1)];
          continue;
        }
        var id = embId_(ob.fileId, ob.date);
        recs.push({ id: id, tab: ob.tab, row: ob.row, fileId: ob.fileId,
                    kind: ob.kind, date: ob.date,
                    title: String(ob.topic || ob.msg || ob.raw || '').slice(0, 140),
                    probe: embPack_(embTrunc_(vec, embProbeDim_())),
                    full: embPack_(vec) });
        tabStamps[ob.row] = [id, embFpCell_(embHash_(ob.text)), EMB_ST.OK + ' ' + nowStr_()];
        out.made++;
        totalNeed--;
      }
    }
    /* نوشتن **به ازای هر تب**، نه یک‌جا در پایان: اگر دور وسطِ کار
       بمیرد (سقفِ شش‌دقیقه‌ایِ Apps Script هیچ خطایی نمی‌دهد)، آنچه تا
       این‌جا ساخته شده در شیت ثبت شده است و فردا دوباره ساخته نمی‌شود. */
    embStamp_(sh, tabStamps);
  }

  props_().setProperty(PK.EMB_TAB, String((start + 1) % tabs.length));
  embCursorsSave_(cursors);
  if (recs.length) {
    try { embShardFlush_(ix, recs); }
    catch (eF) { out.notes.push('نوشتنِ قطعه ناموفق: ' + eF.message); }
  }
  var cnt = embCounts_(hub);
  ix.counts = cnt;
  ix.model = String(CFG.EMB_MODEL || ''); ix.dim = embDim_(); ix.probeDim = embProbeDim_();
  try { embIndexSave_(ix); } catch (eI) { out.notes.push('فهرستِ قطعه‌ها ذخیره نشد: ' + eI.message); }
  out.left = cnt.pending;
  out.ok = true;
  out.ms = new Date().getTime() - t0;
  return out;
}

// ─────────────────────────────────────────── شمارش

/**
 * شمارشِ دقیق: چند ردیف هست، چند تا اثر انگشت دارند، چند تا ناموفق،
 * چند تا رهاشده.
 *
 * فقط سه ستون خوانده می‌شود، پس ارزان است. و از فهرستِ قطعه‌ها شمرده
 * **نمی‌شود**: قطعه می‌گوید چه چیزی نوشته شده، شیت می‌گوید چه چیزی
 * هست — و سؤالِ پوشش دربارهٔ دومی است.
 */
function embCounts_(hub) {
  var out = { total: 0, done: 0, failed: 0, abandoned: 0, oldVer: 0, pending: 0,
              pct: 0, at: nowStr_(), tabs: [] };
  try {
    var tabs = embHubTabs_(hub || getHub_());
    for (var t = 0; t < tabs.length; t++) {
      var sh = tabs[t], last = sh.getLastRow();
      var row = { tab: sh.getName(), total: 0, done: 0 };
      if (last >= 2) {
        var blk = Math.max(500, Number(CFG.EMB_SCAN_BLOCK) || 2000);
        for (var r = 2; r <= last; r += blk) {
          var n = Math.min(blk, last - r + 1);
          var vals;
          try { vals = sh.getRange(r, COL.EMB_ID, n, 3).getValues(); } catch (e) { break; }
          for (var i = 0; i < vals.length; i++) {
            out.total++; row.total++;
            var id = String(vals[i][0] || '').trim();
            var st = String(vals[i][2] || '').trim();
            if (id && st.indexOf(EMB_ST.OK) === 0) {
              if (embFpVer_(vals[i][1]) >= EMB_TEXT_VER) { out.done++; row.done++; }
              else out.oldVer++;
            }
            else if (st.indexOf(EMB_ST.GIVEUP) === 0) out.abandoned++;
            else if (st.indexOf(EMB_ST.FAIL) === 0) out.failed++;
          }
        }
      }
      out.tabs.push(row);
    }
  } catch (e) { out.error = e.message; }
  /* ردیفی که با دستورِ قدیمی ساخته شده، «آماده» نیست — کاری مانده. اگر
     در `pending` نیاید، «چند شب تا پایان» دروغ می‌گوید و بدتر: شمارندهٔ
     «گیرکرده» هم کور می‌شود، چون شرطش `pending > 0` است. */
  out.pending = Math.max(0, out.total - out.done - out.abandoned);
  out.pct = out.total ? Math.round(out.done / out.total * 100) : 0;
  return out;
}

// ─────────────────────────────────────────── جبرانِ «مشخصات» برای گذشته

/**
 * کلیدِ یکتاییِ بانک → (تب، ردیف).
 *
 * همان کلیدی که `loadSeen_` می‌سازد (`شناسهٔ فایل|تاریخِ canonical`)، ولی
 * این‌جا شمارهٔ ردیف هم لازم است. دو ستون خوانده می‌شود، نه کلِ ردیف.
 */
function embHubKeyMap_(hub) {
  var map = {};
  var tabs = embHubTabs_(hub || getHub_());
  for (var t = 0; t < tabs.length; t++) {
    var sh = tabs[t], last = sh.getLastRow();
    if (last < 2) continue;
    var vals;
    try { vals = sh.getRange(2, COL.ID, last - 1, COL.DATE - COL.ID + 1).getValues(); }
    catch (e) { continue; }
    for (var j = 0; j < vals.length; j++) {
      var id = String(vals[j][0] || '').trim();
      if (!id) continue;
      var k = id + '|' + canonDate_(vals[j][COL.DATE - COL.ID]);
      if (!map[k]) map[k] = { tab: sh.getName(), row: j + 2 };
    }
  }
  return map;
}

/**
 * ردیف‌هایی که پیش از ۷٫۲۷ ساخته شده‌اند ستونِ «مشخصات» ندارند — و هیچ
 * راهی نیست که از خودِ بانک پُرشان کرد، چون آن ستون‌ها هرگز به بانک
 * نرسیدند. پس یک بار باید از روی شیت‌های منبع خوانده شوند.
 *
 * ══ سه چیز که این را از یک اسکریپتِ یک‌بارمصرف جدا می‌کند ══
 *
 * ۱. **مکان‌نما دارد و خودش را خاموش می‌کند.** ۶۲ هزار ردیفِ منبع در یک
 *    اجرا جا نمی‌شود؛ هر شب چند هزارتا، و وقتی دور تمام شد در
 *    `PK.EMB_SPEC_DONE` تاریخ می‌نشیند و دیگر نمی‌دود. ولی این پرچم را
 *    دکمهٔ منو باز می‌کند — پرچمِ یک‌بارهٔ بی‌در، همان شکلِ خرابی است که
 *    ۵٫۹۵ نامش را برد.
 *
 * ۲. **فقط وقتی چیزی عوض شده می‌نویسد**، و آن‌وقت وضعیتِ اثر انگشتِ همان
 *    ردیف را هم پاک می‌کند تا دوباره ساخته شود. بی این، مشخصات می‌نشست و
 *    بردار هرگز آن را نمی‌دید — یعنی یک ستونِ پر و یک وعدهٔ نیم‌کاره.
 *
 * ۳. **در شیتِ منبع چیزی نمی‌نویسد.** فقط می‌خواند، مثلِ `syncCatalog`.
 */
function embSpecsBackfill_(cap, budgetMs) {
  var out = { ok: false, scanned: 0, filled: 0, tabs: 0, done: false, notes: [] };
  var t0 = new Date().getTime();
  var deadline = t0 + Math.max(15000, budgetMs || Number(CFG.EMB_SPECS_MS) || 120000);
  cap = Math.max(100, cap || Number(CFG.EMB_SPECS_PER_RUN) || 4000);

  var hub, map;
  try { hub = getHub_(); map = embHubKeyMap_(hub); }
  catch (eM) { out.notes.push('نقشهٔ بانک ساخته نشد: ' + eM.message); return out; }

  var cursors = {};
  try { cursors = JSON.parse(props_().getProperty(PK.EMB_SPEC) || '{}') || {}; } catch (e0) {}
  var patch = {};          // نامِ تب -> {ردیف: متن}
  var list = CFG.SOURCES || [];
  var allDone = true;

  for (var si = 0; si < list.length; si++) {
    if (new Date().getTime() > deadline || out.scanned >= cap) { allDone = false; break; }
    var src = list[si], ss = null;
    try { ss = SpreadsheetApp.openById(src.id); }
    catch (eO) { out.notes.push('«' + src.title + '» باز نشد: ' + eO.message); allDone = false; continue; }
    var legacy = (src.schema === 'legacy-video' || src.schema === 'legacy-photo');
    var tabs = [];
    try { tabs = legacy ? [ss.getSheets()[0]] : ss.getSheets(); }
    catch (eT) { out.notes.push('تب‌های «' + src.title + '» خوانده نشد'); allDone = false; continue; }

    for (var ti = 0; ti < tabs.length; ti++) {
      if (new Date().getTime() > deadline || out.scanned >= cap) { allDone = false; break; }
      var sh = tabs[ti], last = sh.getLastRow(), wide = sh.getLastColumn();
      if (last < 2 || wide < 2) continue;
      var ck = src.key + '|' + sh.getName();
      var cur = Number(cursors[ck]) || 1;
      if (cur >= last) continue;

      var headers;
      try { headers = sh.getRange(1, 1, 1, wide).getValues()[0]; } catch (eH) { continue; }
      var m;
      if (src.schema === 'legacy-video') m = videoMap_(headers);
      else if (src.schema === 'legacy-photo') m = photoMap_(headers);
      else { if (!srcDetect_(headers)) continue; m = srcMap_(headers); }
      if (m.fileId === undefined || m.fileId < 0) continue;
      var skip = srcSpecsSkip_(headers, m);
      out.tabs++;

      var blk = Math.max(5, Number(CFG.SYNC_CHUNK_WIDE) || 25);
      while (cur < last && out.scanned < cap) {
        if (new Date().getTime() > deadline) { allDone = false; break; }
        var n = Math.min(blk, last - cur);
        var vals;
        try { vals = sh.getRange(cur + 1, 1, n, wide).getValues(); }
        catch (eR) { cur = last; break; }
        for (var r = 0; r < vals.length; r++) {
          out.scanned++;
          var fid = cell_(vals[r], m.fileId).trim();
          if (!fid) continue;
          var hit = map[fid + '|' + canonDate_(vals[r][m.date])];
          if (!hit) continue;
          var txt = '';
          try { txt = srcSpecsText_(headers, vals[r], skip); } catch (eS) { txt = ''; }
          if (!txt) continue;
          if (!patch[hit.tab]) patch[hit.tab] = {};
          if (patch[hit.tab][hit.row] === undefined) patch[hit.tab][hit.row] = txt;
        }
        cur += n;
        cursors[ck] = cur;
      }
      if (cur < last) allDone = false;
    }
  }

  out.filled = embSpecsApply_(hub, patch);
  try { props_().setProperty(PK.EMB_SPEC, JSON.stringify(cursors)); } catch (eP) {}
  if (allDone) {
    out.done = true;
    try { props_().setProperty(PK.EMB_SPEC_DONE, nowStr_()); } catch (eD) {}
  }
  out.ok = true;
  return out;
}

/**
 * نوشتنِ «مشخصات» در بانک — یک خواندن و یک نوشتنِ ستونی به ازای هر تب.
 *
 * ردیف‌های هدف پراکنده‌اند، پس نوشتنِ تک‌تک یعنی صدها رفت‌وبرگشت. به‌جایش
 * کلِ ستون یک بار خوانده می‌شود، خانه‌های لازم عوض می‌شوند و یک بار
 * نوشته می‌شود — و اگر هیچ خانه‌ای عوض نشده باشد، **اصلاً نوشته
 * نمی‌شود**. (ستون یک‌جا برمی‌گردد، ولی مقدارِ ردیف‌های دست‌نخورده همان
 * است که بود؛ چیزی بازنویسی نمی‌شود که کسی جایش گذاشته باشد.)
 */
function embSpecsApply_(hub, patch) {
  var wrote = 0;
  for (var tab in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, tab)) continue;
    var sh = hub.getSheetByName(tab);
    if (!sh) continue;
    var last = sh.getLastRow();
    if (last < 2) continue;
    var cur, st;
    try {
      cur = sh.getRange(2, COL.SPECS, last - 1, 1).getValues();
      st = sh.getRange(2, COL.EMB_ST, last - 1, 1).getValues();
    } catch (e) { continue; }
    var changed = false;
    for (var row in patch[tab]) {
      if (!Object.prototype.hasOwnProperty.call(patch[tab], row)) continue;
      var i = Number(row) - 2;
      if (i < 0 || i >= cur.length) continue;
      if (String(cur[i][0] || '') === String(patch[tab][row])) continue;
      cur[i][0] = patch[tab][row];
      /* متنِ بردار عوض شد، پس بردار باید از نو ساخته شود. پاک‌کردنِ
         وضعیت کافی است: پویشِ شبانه خودش برش می‌دارد. */
      st[i][0] = '';
      changed = true; wrote++;
    }
    if (!changed) continue;
    try {
      sh.getRange(2, COL.SPECS, cur.length, 1).setValues(cur);
      sh.getRange(2, COL.EMB_ST, st.length, 1).setValues(st);
    } catch (eW) { logLine_('نوشتنِ مشخصات در «' + tab + '» ناموفق: ' + eW.message); }
  }
  return wrote;
}

function embSpecsDone_() {
  try { return String(props_().getProperty(PK.EMB_SPEC_DONE) || ''); } catch (e) { return ''; }
}

// ─────────────────────────────────────────── جست‌وجوی معنایی

/** بردارِ یک پرس‌وجو. نوعِ وظیفه فرق دارد و این فرق واقعی است. */
function embQueryVec_(text) {
  var c = embCall_([String(text || '')], 'RETRIEVAL_QUERY');
  if (!c.ok || !c.vecs.length || !c.vecs[0]) return { ok: false, note: c.note || 'بردارِ پرس‌وجو ساخته نشد', vec: null };
  return { ok: true, vec: c.vecs[0], note: '' };
}

/**
 * نزدیک‌ترین محتواها به یک بردار.
 *
 * دو مرحله: همهٔ قطعه‌ها با بردارِ کوتاه سنجیده می‌شوند (ارزان)، و بعد
 * نامزدهای بالا با بردارِ کامل دوباره — ولی فقط تا وقتی بودجه هست. اگر
 * نشد، نتیجه می‌آید و **گفته می‌شود که نشد**؛ جست‌وجویی که ناتمامیِ خود
 * را پنهان کند، به کاربر می‌گوید «نیست» دربارهٔ چیزی که هست.
 */
function embSearch_(vec, opts) {
  opts = opts || {};
  var out = { ok: false, items: [], shards: 0, shardsAll: 0, picked: 0, scanned: 0,
              stopped: '', rescored: 0, note: '' };
  var ix = embIndex_();
  out.shardsAll = ix.shards.length;
  if (!ix.shards.length) { out.note = 'هنوز اثر انگشتی ساخته نشده.'; return out; }
  var stale = embIndexStale_(ix);
  if (stale) { out.note = 'ایندکس کهنه است (' + stale + ').'; return out; }

  var deadline = new Date().getTime() +
                 Math.max(10000, Number(opts.budgetMs) || Number(CFG.EMB_SEARCH_MS) || 90000);
  var probe = embPack_(embTrunc_(vec, Number(ix.probeDim) || embProbeDim_()));
  var qp = embUnpack_(probe);
  var minS = Number(CFG.EMB_MIN_SCORE);
  if (!isFinite(minS)) minS = 0.2;
  var top = Math.max(5, Number(opts.top) || Number(CFG.EMB_TOP) || 60);
  var keep = Math.max(top, Number(CFG.EMB_RESCORE) || 120);

  /* ══ کدام قطعه‌ها خوانده شوند ══
     زیرِ `EMB_CENTROID_MIN` قطعه، همه — خواندنِ همه‌شان ارزان است و
     دقیق‌تر. بالاتر از آن، فقط نزدیک‌ترین‌ها به پرس‌وجو؛ و قطعه‌ای که
     مرکز ندارد **همیشه** خوانده می‌شود، چون ندانستن دلیلِ رد کردن نیست.
     شمارِ خوانده‌شده در برابرِ کل همیشه گزارش می‌شود (`shards`/
     `shardsAll`), پس ناتمامی هرگز پنهان نمی‌مانَد. */
  var pick = [];
  for (var q = 0; q < ix.shards.length; q++) {
    var cc = ix.shards[q].c ? embUnpack_(ix.shards[q].c) : null;
    pick.push({ i: q, near: cc ? embDot_(qp, cc) : Infinity });
  }
  var minSh = Math.max(1, Number(CFG.EMB_CENTROID_MIN) || 6);
  if (pick.length > minSh) {
    pick.sort(function (a, b) { return b.near - a.near; });
    var keepSh = Math.max(minSh, Number(CFG.EMB_PROBE_SHARDS) || 8);
    var unknown = 0;
    for (var u = 0; u < pick.length; u++) if (pick[u].near === Infinity) unknown++;
    if (pick.length > keepSh + unknown) pick = pick.slice(0, keepSh + unknown);
    out.picked = pick.length;
  }

  var best = [];
  for (var sp = 0; sp < pick.length; sp++) {
    var s = pick[sp].i;
    if (new Date().getTime() > deadline) {
      out.stopped = 'بودجهٔ زمانِ جست‌وجوی معنایی تمام شد؛ ' + out.shards +
                    ' قطعه از ' + out.shardsAll + ' خوانده شد.';
      break;
    }
    var P = embGetJson_(embShardName_(ix.shards[s].seq, 'p'));
    if (!P || !P.id) continue;
    out.shards++;
    for (var i = 0; i < P.id.length; i++) {
      out.scanned++;
      var sc = embDot_(qp, embUnpack_(P.p[i]));
      if (sc < minS) continue;
      best.push({ id: P.id[i], tab: P.tb[i], row: P.rw[i], fileId: P.fid[i],
                  kind: P.kd[i], date: P.dt[i], title: P.ti[i],
                  seq: ix.shards[s].seq, at: i, score: sc });
    }
  }
  best.sort(function (a, b) { return b.score - a.score; });
  if (best.length > keep) best = best.slice(0, keep);

  // ── مرحلهٔ دوم: بردارِ کامل، فقط برای قطعه‌هایی که نامزد دارند ──
  var wanted = {}, order = [];
  for (var k = 0; k < best.length; k++) {
    if (!wanted[best[k].seq]) { wanted[best[k].seq] = []; order.push(best[k].seq); }
    wanted[best[k].seq].push(best[k]);
  }
  var maxSh = Math.max(0, Number(CFG.EMB_RESCORE_SHARDS) || 4);
  var qf = embUnpack_(embPack_(vec));
  for (var o = 0; o < order.length && o < maxSh; o++) {
    if (new Date().getTime() > deadline) break;
    var V = embGetJson_(embShardName_(order[o], 'v'));
    if (!V || !V.v) continue;
    var grp = wanted[order[o]];
    for (var g = 0; g < grp.length; g++) {
      var enc = V.v[grp[g].at];
      if (!enc || V.id[grp[g].at] !== grp[g].id) continue;   // قطعه جابه‌جا شده
      grp[g].score = embDot_(qf, embUnpack_(enc));
      grp[g].exact = true;
      out.rescored++;
    }
  }
  best.sort(function (a, b) { return b.score - a.score; });

  /* ══ بریدن **نسبت به بهترین**، نه با یک عددِ ثابت ══
     و بعد از سنجشِ دوباره، نه قبلش — وگرنه موردی که با بردارِ کوتاه
     ضعیف به نظر می‌رسید و با بردارِ کامل بهترین بود، پیش از دیده شدن
     حذف شده بود. */
  var gap = Number(CFG.EMB_SCORE_GAP);
  if (!isFinite(gap) || gap <= 0) gap = 0.25;
  var cut = best.length ? (best[0].score - gap) : 0;
  var kept = [];
  for (var q2 = 0; q2 < best.length && kept.length < top; q2++) {
    if (best[q2].score < cut) break;
    kept.push(best[q2]);
  }
  out.items = kept;
  out.ok = true;
  return out;
}

// ─────────────────────────────────────────── خودآزمون

/**
 * آیا ایندکس واقعاً کار می‌کند؟
 *
 * متنِ خودِ یک ردیف را به‌عنوانِ پرس‌وجو می‌فرستیم و می‌بینیم خودِ آن
 * ردیف در چند نتیجهٔ اولْ برمی‌گردد یا نه. اگر ردیفی خودش را پیدا نکند،
 * ایندکس خراب است — و این تنها سنجه‌ای است که واقعاً چیزی را **آزمایش**
 * می‌کند، نه اینکه شمارشی را دوباره بگوید.
 *
 * این همان درسی است که این مخزن پنج بار خورده: تحلیلی نوشته شود و هرگز
 * به یک دروازه وصل نشود.
 */
function embSelfTest_(n) {
  var out = { ok: false, tried: 0, hit: 0, ratio: 0, mode: '', note: '' };
  if (!embOn_()) { out.note = 'خاموش'; return out; }
  var ix = embIndex_();
  if (!ix.shards.length) { out.note = 'ایندکس خالی است'; return out; }
  n = Math.max(1, n || Number(CFG.EMB_SELFTEST_N) || 4);
  var topK = Math.max(3, Number(CFG.EMB_SELFTEST_TOP) || 10);

  // نمونه از سرتاسرِ ایندکس، نه فقط از قطعهٔ آخر: خرابی معمولاً در
  // چیزی است که دیشب نوشته نشده.
  var picks = [];
  for (var t = 0; t < n; t++) {
    var sh = ix.shards[Math.floor(Math.random() * ix.shards.length)];
    var P = embGetJson_(embShardName_(sh.seq, 'p'));
    if (!P || !P.id || !P.id.length) continue;
    var i = Math.floor(Math.random() * P.id.length);
    if (!String(P.ti[i] || '').trim()) continue;
    picks.push({ id: P.id[i], title: String(P.ti[i]) });
  }
  if (!picks.length) { out.note = 'نمونه‌ای با عنوان پیدا نشد'; return out; }

  /* ══ چرا بازنویسی، و چرا نبودش آزمون را توخالی می‌کرد ══
     نسخهٔ اول عنوانِ خودِ ردیف را پرس‌وجو می‌کرد. عنوان **داخلِ همان
     متنی است که بردارش ساخته شده**، پس آن آزمون فقط می‌گفت «ایندکس
     خراب نیست» — نه «جست‌وجو کار می‌کند». اگر متنی که به مدل می‌رود
     سیستماتیک غلط باشد (ستونِ اشتباه، میدانِ جاافتاده)، پرس‌وجو و سند
     **هر دو** همان غلط را دارند و آزمون سبز می‌ماند.

     بازنویسی این را می‌شکند: مدل همان معنا را با واژه‌های دیگری
     می‌گوید، و آن دقیقاً کاری است که صاحبِ برنامه می‌کند («توضیح می‌دهم
     چی یادمه»). یعنی هر شب یک پرس‌وجوی واقعی شبیه‌سازی می‌شود.

     و اگر مدل در دسترس نبود، آزمون به عنوان برمی‌گردد **و همین را
     می‌گوید** (`mode`). نبودِ مدل تأییدِ خاموش نیست. */
  var qs = null;
  try { qs = embParaphrase_(picks.map(function (p) { return p.title; })); }
  catch (eP) { qs = null; }
  out.mode = (qs && qs.length === picks.length) ? 'بازنویسی' : 'عنوان';
  if (out.mode === 'عنوان') out.note = 'بازنویسی نشد؛ آزمون با عنوانِ خودِ ردیف — سخت‌گیریِ کمتر.';

  for (var p = 0; p < picks.length; p++) {
    var qt = (qs && qs[p]) ? qs[p] : picks[p].title;
    var q = embQueryVec_(qt);
    if (!q.ok) { out.note = q.note; continue; }
    out.tried++;
    var r = embSearch_(q.vec, { top: topK, budgetMs: 45000 });
    for (var k = 0; k < r.items.length; k++) {
      if (r.items[k].id === picks[p].id) { out.hit++; break; }
    }
  }
  out.ratio = out.tried ? (out.hit / out.tried) : 0;
  out.ok = out.tried > 0;
  return out;
}

var EMB_PARA_SCHEMA = {
  type: 'object',
  properties: { q: { type: 'array', items: { type: 'string' } } },
  required: ['q']
};

/**
 * همان معنا، با واژه‌های دیگر — به تعدادِ ورودی، به همان ترتیب.
 *
 * `null` برمی‌گرداند اگر نشد؛ و فراخوانَنده باید همین را در گزارش
 * بیاورد، نه اینکه بی‌صدا به آزمونِ آسان‌تر برگردد.
 */
function embParaphrase_(titles) {
  if (!titles || !titles.length) return null;
  var lines = [];
  for (var i = 0; i < titles.length; i++) {
    lines.push((i + 1) + ') ' + String(titles[i]).slice(0, 200));
  }
  var prompt =
    'برای هر عنوان، یک جملهٔ کوتاهِ فارسی بنویس که **همان محتوا** را ' +
    'توصیف کند ولی تا حدِ ممکن **از واژه‌های خودِ عنوان استفاده نکند** — ' +
    'مثل کسی که چیزی را نیمه‌یادش هست و دارد توصیفش می‌کند.\n' +
    'خروجی: {"q": ["...", "..."]} — دقیقاً ' + titles.length + ' جمله، به همان ترتیب.\n\n' +
    lines.join('\n');
  var j;
  /* `geminiText_` شیءِ تجزیه‌شده می‌دهد، نه رشته. این را با یک `JSON.parse`
     اضافه اشتباه گرفته بودم و تابع بی‌صدا `null` برمی‌گرداند — یعنی
     خودآزمون برای همیشه به حالتِ آسانِ «عنوان» می‌افتاد و در گزارش هم
     می‌نوشت «بازنویسی نشد»، که آدم به‌حسابِ در دسترس نبودنِ مدل
     می‌گذاشت. آزمونِ ۲۴٫۱ همین را گرفت. */
  try { j = geminiText_(prompt, EMB_PARA_SCHEMA, 2048); }
  catch (e) { return null; }
  if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e2) { return null; } }
  var q = j && j.q;
  if (Object.prototype.toString.call(q) !== '[object Array]') return null;
  if (q.length !== titles.length) return null;
  for (var k = 0; k < q.length; k++) {
    if (!String(q[k] || '').trim()) return null;
  }
  return q;
}

// ─────────────────────────────────────────── کارنامه و وضعیت

function embTab_(hub) { return ensureTab_(hub || getHub_(), 'کارنامهٔ اثر انگشت', EMB_HEADERS); }

function embRows_(hub) {
  var sh = embTab_(hub);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, EMB_HEADERS.length).getValues();
}

/**
 * یک ردیف در کارنامه، در هر دور — موفق یا ناموفق.
 *
 * `_STATUS.json` می‌گوید «الان چقدر»؛ سؤالی که سرِ خرابی پرسیده می‌شود
 * «از کِی؟» است. و همین تب — که هیچ چیزِ دیگری در آن نمی‌نویسد — پایهٔ
 * شمارشِ «گیرکرده» است، نه مُهری که خودِ هشداردهنده بزند (درسِ ۷٫۲۲:
 * زنگی که نویسنده‌اش هر شب صفرش می‌کند، هرگز به صدا درنمی‌آید).
 */
function embLog_(hub, r) {
  try {
    embTab_(hub || getHub_()).appendRow(
      [nowStr_(), String(r.step || ''), Number(r.scanned || 0), Number(r.made || 0),
       Number(r.failed || 0), Number(r.done || 0), Number(r.total || 0),
       String(r.pct == null ? '' : r.pct + '٪'), String(r.self || ''),
       String(r.note || '').slice(0, 500)]);
    return true;
  } catch (e) {
    try { logLine_('ثبتِ کارنامهٔ اثر انگشت ناموفق: ' + e.message); } catch (e2) {}
    return false;
  }
}

/**
 * چند روز است که هیچ اثر انگشتِ تازه‌ای ساخته نشده، در حالی که کار مانده.
 *
 * از **کارنامه** شمرده می‌شود، نه از مُهری که خودِ دور می‌زند. ۷٫۲۱ همین
 * را اشتباه کرد و زنگش هیچ‌وقت به صدا درنیامد.
 */
function embStuckDays_(hub) {
  try {
    var rows = embRows_(hub);
    for (var i = rows.length - 1; i >= 0; i--) {
      if (Number(rows[i][3]) > 0) {           // «تازه» > ۰
        var ms = embRowMs_(rows[i][0]);
        if (!ms) return 0;
        return Math.floor((new Date().getTime() - ms) / 86400000);
      }
    }
    // هرگز چیزی ساخته نشده: از نخستین ردیفِ کارنامه می‌شماریم
    if (rows.length) {
      var ms0 = embRowMs_(rows[0][0]);
      if (ms0) return Math.floor((new Date().getTime() - ms0) / 86400000);
    }
  } catch (e) {}
  return 0;
}

/**
 * «۱۴۰۵/۰۶/۲۹ ۰۲:۳۰» یا هر قالبِ nowStr_ → میلی‌ثانیه. صفر یعنی نشد.
 *
 * ══ درسِ ۷٫۵۳: ستونِ تاریخ همیشه رشته نمی‌مانَد ══
 * `embLog_` رشتهٔ `nowStr_()` («۲۰۲۶-۰۹-۲۱ ۰۲:۴۰») را با `appendRow` در
 * شیت می‌نویسد — ولی گوگل‌شیت رشته‌ای که شکلِ تاریخ دارد را در نوشتن
 * خودش به یک سلولِ Date تبدیل می‌کند. پس `getValues()` یک شیءِ Date
 * برمی‌گردانَد، نه همان رشته. رگ‌اکسِ زیر روی `String(dateObj)` («Mon Sep
 * 21 2026 02:40:00 GMT+0400 …») می‌افتاد و ساعت:دقیقه (۰۲:۴۰) را به‌جای
 * ماه:روز می‌خواند — یعنی «فوریهٔ چهلم» که جاوااسکریپت به ۱۲ مارس تبدیل
 * می‌کند: از آنجا تا امروز دقیقاً همان ۱۹۳ تا ۱۹۶ روزی بود که در وضعیت
 * دیده شد، در حالی که تنها یک دورِ سه‌روزه در کارنامه ثبت شده بود.
 * ماکِ آزمون‌ها رشته را همان‌طور که هست نگه می‌دارد (بدونِ تبدیلِ گوگل‌شیت)
 * پس این خرابی در هیچ اجرایی سرخ نشد — همان «بدَلی که آسان‌گیرتر از
 * تولید است، هیچ چیز را ثابت نمی‌کند».
 */
function embRowMs_(s) {
  if (s instanceof Date) return s.getTime();
  var m = String(s || '').match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
  if (!m) return 0;
  var y = Number(m[1]);
  if (y > 1900) {                                   // میلادی
    return new Date(y, Number(m[2]) - 1, Number(m[3])).getTime();
  }
  // شمسی: فقط فاصلهٔ روز لازم است، پس تبدیلِ تقریبیِ خطی کافی است و
  // هیچ‌جا تاریخِ دقیق نمایش داده نمی‌شود.
  var days = (y - 1300) * 365.2422 +
             (Number(m[2]) <= 6 ? (Number(m[2]) - 1) * 31 : 186 + (Number(m[2]) - 7) * 30) +
             Number(m[3]);
  return new Date(1921, 2, 21).getTime() + days * 86400000;
}

/**
 * حالِ امروز — یک جملهٔ فارسیِ آماده که **هر روز** هست، حتی وقتی همه‌چیز
 * خوب است. صاحبِ برنامه هیچ‌وقت شیت باز نمی‌کند؛ چیزی که فقط در یک تب
 * زندگی کند، دیده نمی‌شود (۵٫۹۰).
 */
function embStatus_(hub) {
  var out = { ok: true, on: embOn_(), model: String(CFG.EMB_MODEL || ''),
              dim: embDim_(), probeDim: embProbeDim_(),
              total: 0, done: 0, pending: 0, failed: 0, abandoned: 0, pct: 0,
              oldVer: 0, textVer: EMB_TEXT_VER, specsDone: '',
              shards: 0, stale: '', lastRun: null, selftest: null,
              stuckDays: 0, nightsLeft: 0, at: '', step: '', line: '' };
  /* ردِ پا حتی وقتی بخش خاموش است هم خوانده می‌شود: اگر دیشب وسطِ کار
     مُرده و امروز کسی خاموشش کرده، آن نشانه نباید گم شود. */
  out.step = embStepRead_();
  if (!embOn_()) { out.line = 'اثر انگشتِ معنایی خاموش است.'; return out; }
  try {
    var ix = embIndex_();
    out.shards = ix.shards.length;
    out.stale = embIndexStale_(ix);
    var c = ix.counts;
    // شمارش از دورِ شبانه می‌آید. نبودنش یعنی هنوز دوری نرفته — آن‌وقت
    // خودمان می‌شماریم، چون گزارشِ روزانه نباید خالی برود.
    if (!c || !Number(c.total)) c = embCounts_(hub);
    out.total = c.total; out.done = c.done; out.pending = c.pending;
    out.failed = c.failed; out.abandoned = c.abandoned; out.pct = c.pct;
    out.oldVer = Number(c.oldVer) || 0;
    out.at = c.at || '';
    out.specsDone = embSpecsDone_();
    out.textVer = EMB_TEXT_VER;
    try { out.lastRun = JSON.parse(props_().getProperty(PK.EMB_LAST) || 'null'); } catch (e1) {}
    if (out.lastRun && out.lastRun.self) out.selftest = out.lastRun.self;
    out.stuckDays = embStuckDays_(hub);

    var perNight = Math.max(1, Number(CFG.EMB_MAX_PER_RUN) || 1200);
    out.nightsLeft = out.pending ? Math.ceil(out.pending / perNight) : 0;

    var bits = ['اثر انگشت: ' + faDigitsOut_(out.done) + ' از ' +
                faDigitsOut_(out.total) + ' ردیف (' + faDigitsOut_(out.pct) + '٪)'];
    if (out.lastRun && Number(out.lastRun.made)) {
      bits.push('آخرین دور ' + faDigitsOut_(out.lastRun.made) + ' تازه');
    }
    if (out.selftest && out.selftest.tried) {
      bits.push('خودآزمون ' + faDigitsOut_(out.selftest.hit) + ' از ' +
                faDigitsOut_(out.selftest.tried) +
                (out.selftest.mode ? ' (' + out.selftest.mode + ')' : ''));
    }
    if (out.oldVer) {
      bits.push(faDigitsOut_(out.oldVer) + ' با دستورِ قدیمی (از نو ساخته می‌شوند)');
    }
    if (!out.specsDone) bits.push('جبرانِ «مشخصات» در جریان');
    if (out.abandoned) bits.push(faDigitsOut_(out.abandoned) + ' رهاشده');
    if (out.failed) bits.push(faDigitsOut_(out.failed) + ' ناموفق');
    if (out.pending) bits.push('~' + faDigitsOut_(out.nightsLeft) + ' شب تا پایان');
    else bits.push('کامل');
    if (out.stale) bits.push('⚠ ایندکس کهنه: ' + out.stale);
    /* ══ و وقتی گیر کرده، **کجا** گیر کرده (۷٫۶۴) ══
       فقط در حالتِ گیرکرده، چون در شبِ سالم «پایان» است و گفتنش نویز.
       جای مرگ باید در همان جمله‌ای باشد که خوانده می‌شود، نه در فایلی که
       باید بازش کرد — وگرنه باز هم کسی باید برود دنبالش بگردد. */
    if (out.stuckDays >= Math.max(1, Number(CFG.EMB_STUCK_DAYS) || 3) &&
        out.step && out.step.indexOf('پایان') !== 0) {
      bits.push('آخرین جایی که رسید: «' + out.step + '»');
    }
    out.line = bits.join(' · ') + '.';
  } catch (e) {
    out.ok = false;
    out.line = 'اثر انگشت: وضعیت خوانده نشد — ' + e.message;
  }
  return out;
}

// ─────────────────────────────────────────── دروازه‌ها

/**
 * دو هشدار، و هیچ‌کدام برای یک شبِ بد.
 *
 * «گیرکرده» یعنی کار مانده و چند روز است هیچ‌چیز ساخته نشده. «کیفیت»
 * یعنی خودآزمون چند شبِ پیاپی افتاده. هر دو `ROWNER_CODE` می‌گیرند، پس
 * در صفِ `NEEDS_CODE` می‌نشینند که نسخهٔ بعدی از آن ساخته می‌شود — یک
 * جمله در ایمیلِ سلامت فردا جایش را به جملهٔ دیگری می‌دهد، یک یافته نه.
 */
function embGates_(hub, st, self) {
  var raised = [];
  try {
    hub = hub || getHub_();
    var days = Math.max(1, Number(CFG.EMB_STUCK_DAYS) || 3);
    if (st && st.pending > 0 && st.stuckDays >= days) {
      logSelfFinding_(hub, {
        priority: 'جدی', category: 'اثر انگشت', key: 'embed-stalled',
        title: 'اثرانگشت‌زنی ' + st.stuckDays + ' روز است جلو نرفته',
        detail: faDigitsOut_(st.pending) + ' ردیف بی اثر انگشت مانده و در ' +
                st.stuckDays + ' روزِ گذشته هیچ ردیفِ تازه‌ای در «کارنامهٔ اثر ' +
                'انگشت» ثبت نشده. تا این درست نشود، جست‌وجوی معنایی روی ' +
                'بخشی از بانک کور است.',
        instruction: 'در «کارنامهٔ اثر انگشت» ستونِ یادداشت را ببین: خطای ' +
                     'کلید؟ سهمیه؟ یا نگهبانِ `nightHas_` هر شب رد می‌شود ' +
                     '(یعنی کارِ شبانه پیش از رسیدن به این بند تمام می‌شود)؟ ' +
                     'پس از اصلاح، فردا همین‌جا وارسی کن که ستونِ «تازه» ' +
                     'عددی بزرگ‌تر از صفر گرفته باشد.',
        owner: ROWNER_CODE
      });
      raised.push('embed-stalled');
    }

    var min = Number(CFG.EMB_SELFTEST_MIN);
    if (!isFinite(min)) min = 0.6;
    if (self && self.ok && self.tried) {
      var bad = Number(props_().getProperty(PK.EMB_BAD) || '0') || 0;
      if (self.ratio < min) {
        bad++;
        props_().setProperty(PK.EMB_BAD, String(bad));
        var need = Math.max(1, Number(CFG.EMB_BAD_NIGHTS) || 2);
        if (bad >= need) {
          logSelfFinding_(hub, {
            priority: 'جدی', category: 'اثر انگشت', key: 'embed-quality-low',
            title: 'خودآزمونِ اثر انگشت ' + bad + ' شبِ پیاپی افتاد',
            detail: 'از ' + self.tried + ' ردیفی که متنِ خودشان پرس‌وجو شد، ' +
                    'فقط ' + self.hit + ' تا خودشان را در نتایج پیدا کردند. ' +
                    'یعنی بردارها یا وارونه نوشته شده‌اند یا با بردارِ ' +
                    'پرس‌وجو هم‌جنس نیستند — نتیجهٔ جست‌وجوی معنایی در این ' +
                    'حالت تصادفی است، نه ضعیف.',
            instruction: 'سه چیز را به همین ترتیب وارسی کن: (۱) نرمال‌سازی ' +
                         '— هر بُعدی جز ۳۰۷۲ باید دستی نرمال شود؛ (۲) ' +
                         '`taskType` — سندها RETRIEVAL_DOCUMENT و پرس‌وجو ' +
                         'RETRIEVAL_QUERY؛ (۳) هم‌خوانیِ بُعدِ ذخیره‌شده با ' +
                         'بُعدِ امروز. پس از اصلاح، «🧠 خودآزمونِ اثر انگشت» ' +
                         'را از منو بزن و ببین نسبت بالا رفته.',
            owner: ROWNER_CODE
          });
          raised.push('embed-quality-low');
        }
      } else {
        try { props_().deleteProperty(PK.EMB_BAD); } catch (e2) {}
      }
    }
  } catch (e) { logLine_('دروازه‌های اثر انگشت اجرا نشدند: ' + e.message); }
  return raised;
}

// ─────────────────────────────────────────── دورِ شبانه و منو

/**
 * دورِ شبانه: ساخت، شمارش، خودآزمون، کارنامه، دروازه‌ها.
 *
 * خودآزمون **هر شب** نیست — یک فراخوانِ بردار به ازای هر نمونه است و
 * ارزان، ولی وقتی هنوز چیزی ساخته نشده بی‌معناست. پس فقط وقتی ایندکس
 * چیزی دارد.
 */
/* ══ ردِ پا: این دور کجا رسیده بود (۷٫۶۴) ══
 *
 * چهار شب پیاپی کارِ شبانه داخلِ همین بلوک مُرد و **هیچ‌جا ننوشت کجا**.
 * ضربانِ `nightAtSave_` می‌گفت «اثر انگشتِ معنایی» — یعنی نامِ بلوک، نه
 * جای مرگ. بیرون از این تابع هیچ‌کس نمی‌دانست ایست در جبرانِ مشخصات بوده،
 * در مرکزها، در ساخت، یا در خودآزمون.
 *
 * این الگو دو بار در همین مخزن ساخته و جواب داده — `healthStep_` (۶٫۳۸) و
 * `nightAtSave_` (۷٫۴۴) — و هر دو بار درسش یکی بود: **پیش از کار بنویس، نه
 * پس از آن.** مهری که پس از کار نوشته شود، دقیقاً همان کاری که وقت را خورد
 * و اجرا را کُشت هرگز ثبت نمی‌کند.
 *
 * و چون در `_STATUS.json` می‌نشیند، فردا صبح کسی لازم نیست دکمه‌ای بزند تا
 * بفهمد کجا ایستاده. این جوابِ «تا کی باید حواسم به همه‌چیز باشد» است.
 */
function embStep_(name) {
  try { props_().setProperty(PK.EMB_STEP, String(name || '') + ' @ ' + nowStr_()); }
  catch (e) {}
}

function embStepRead_() {
  try { return String(props_().getProperty(PK.EMB_STEP) || ''); } catch (e) { return ''; }
}

function embNightly_(opts) {
  opts = opts || {};
  var out = { ok: false, made: 0, failed: 0, self: null, left: 0, notes: [] };
  if (!embOn_()) return out;

  /* ══ ساعت را **همین‌جا** روشن کن (۷٫۶۵) ══
     سقفی که ۷٫۶۴ روی دنباله گذاشت `nightLeft_()` را می‌پرسد، و آن تابع
     اگر ساعتِ شب روشن نباشد **همان لحظه روشنش می‌کند**. در کارِ شبانه
     ساعت از اولِ شب روشن است و مشکلی نیست؛ ولی از **دکمهٔ منو** هیچ‌کس
     روشنش نکرده، پس نخستین پرسش — که سرِ دنباله اتفاق می‌افتد — ساعت را
     تازه راه می‌انداخت و جواب می‌داد «۲۷۰ ثانیه وقت داری»، در حالی که
     ۳۰۰ ثانیه واقعاً خرج شده بود. یعنی سقفِ ۷٫۶۴ از مسیرِ دستی رد می‌شد.
     صاحبِ برنامه دکمه را زد و `Exceeded maximum execution time` گرفت —
     همان مسیر.
     یک پرسشِ بی‌مصرف در ابتدای تابع، ساعت را سرِ **ورود به بلوک** روشن
     می‌کند و هر دو مسیر را درست می‌کند: در شبانه چیزی عوض نمی‌شود (ساعت
     از قبل روشن است) و در دستی، دنباله واقعاً می‌فهمد وقت تمام شده.
     قاعده‌ای که ۷٫۵۰ نوشت: هر اصلاح را در برابرِ آنچه **بعدش** اتفاق
     می‌افتد بسنج، نه در برابرِ باگی که برایش نوشته شده. */
  try { nightLeft_(); } catch (eClk) {}

  var hub = getHub_();

  /* ══ مشخصات **پیش از** بردار ══
     ترتیب عمدی است: اگر بردارِ یک ردیف پیش از رسیدنِ مشخصاتش ساخته شود،
     همان ردیف فردا دوباره ساخته می‌شود — دو بار هزینه برای یک ردیف. و
     وقتی دورِ جبران تمام شد، این بند خودش کنار می‌رود. */
  var sp = null;
  if (opts.specs !== false && !embSpecsDone_()) {
    embStep_('جبرانِ مشخصات');
    try { sp = embSpecsBackfill_(opts.specsCap, opts.specsMs); }
    catch (eSp) { out.notes.push('جبرانِ مشخصات ناموفق: ' + eSp.message); }
    if (sp && sp.filled) {
      out.notes.push('مشخصاتِ ' + sp.filled + ' ردیف از منبع خوانده شد.');
    }
    if (sp && sp.done) out.notes.push('جبرانِ «مشخصات» تمام شد.');
  }
  out.specs = sp;

  /* مرکزهای جامانده — قطعه‌هایی که پیش از ۷٫۲۸ نوشته شده‌اند. پیش از
     ساخت، چون یک قطعهٔ بی‌مرکز همیشه خوانده می‌شود و تا وقتی مرکز نگیرد
     صرفه‌جوییِ جست‌وجو را خنثی می‌کند. */
  embStep_('مرکزِ قطعه‌ها');
  try {
    var cf = embCentroidFix_(opts.centroidCap);
    if (cf.fixed) out.notes.push('مرکزِ ' + cf.fixed + ' قطعه حساب شد.');
  } catch (eCf) { out.notes.push('مرکزِ قطعه‌ها حساب نشد: ' + eCf.message); }

  embStep_('ساختِ بردارها');
  var run = embRunDue_(opts.cap, opts.budgetMs);
  out.made = run.made; out.failed = run.failed; out.left = run.left;
  out.notes = run.notes.slice(0);

  /* ══ شاهد **پیش از** کارِ اختیاری (۷٫۶۴ — قاعدهٔ ۷٫۴۴) ══
     تا امروز این مُهر **پس از** خودآزمون نوشته می‌شد، و خودآزمون یک
     رفت‌وبرگشتِ زندهٔ مدل است. یعنی شبی که ۱۲۰۰ ردیف ساخته می‌شد و بعد
     در خودآزمون کشته می‌شد، **هیچ ردیفی ثبت نمی‌شد**: کار انجام شده بود و
     دفتر می‌گفت هیچ. بعد `embStuckDays_` همان را «چند شب است جلو نرفته»
     می‌خواند و یافته‌ای می‌ساخت که موضوعش درست نبود.
     شاهدی که با خودِ حادثه بمیرد شاهد نیست. */
  var lastRec = { at: nowStr_(), made: run.made, failed: run.failed,
                  left: run.left, self: null };
  try { props_().setProperty(PK.EMB_LAST, JSON.stringify(lastRec)); } catch (eP) {}

  var st = embStatus_(hub);

  /* ══ و دنبالهٔ اختیاری، با سقف (۷٫۶۴ — قاعدهٔ ۷٫۳۱) ══
     نگهبانِ شبانه ۲۳۰ ثانیه می‌خواهد و بودجه‌های اعلام‌شده ۲۱۰ ثانیه‌اند؛
     ولی خودآزمون و خواندنِ **دوبارهٔ** وضعیتِ بانکِ ۵۰ هزار ردیفی در هیچ‌کدام
     حساب نشده بودند. یعنی بلوک بیش از آنچه گرفته بود خرج می‌کرد — همان
     نقضی که ۷٫۳۱ برای همین تابع نوشت و دنباله را ندید.
     `embGates_` عمداً می‌تواند رد شود: از ۷٫۲۷ `healthCheck` هم صدایش
     می‌زند، یعنی درِ دومی دارد. و ردشدن **گفته** می‌شود، وگرنه یک قابلیت
     بی‌صدا خاموش می‌ماند. */
  var tailMs = Math.max(0, Number(CFG.EMB_TAIL_MS) || 20000);
  var roomy = true;
  try { roomy = nightLeft_() >= tailMs; } catch (eN) { roomy = true; }

  var self = null;
  if (!roomy) {
    out.notes.push('دنبالهٔ اختیاری (خودآزمون و دروازه‌ها) امشب جا نشد — ' +
                   'کارنامه ثبت شد. دروازه‌ها از وارسیِ سلامت هم پرسیده می‌شوند.');
  } else if (st.total && st.done && opts.selftest !== false) {
    embStep_('خودآزمون');
    try { self = embSelfTest_(); } catch (eS) { out.notes.push('خودآزمون نشد: ' + eS.message); }
  }
  out.self = self;

  if (self) {
    lastRec.self = { tried: self.tried, hit: self.hit, ratio: self.ratio,
                     mode: self.mode, note: self.note };
    try { props_().setProperty(PK.EMB_LAST, JSON.stringify(lastRec)); } catch (eP2) {}
  }

  embStep_('کارنامه');
  embLog_(hub, { step: 'شبانه', scanned: run.scanned, made: run.made,
                 failed: run.failed, done: st.done, total: st.total, pct: st.pct,
                 self: self && self.tried
                         ? (self.hit + '/' + self.tried + ' · ' + (self.mode || '')) : '',
                 note: out.notes.join(' · ') });

  // وضعیت باید **پس از** ثبتِ کارنامه خوانده شود، وگرنه شمارِ «گیرکرده»
  // دورِ امشب را نمی‌بیند و یک شب عقب گزارش می‌دهد.
  var st2 = st;
  if (roomy) {
    st2 = embStatus_(hub);
    embGates_(hub, st2, self);
  }

  if (run.made) {
    mailQueue_('اثر انگشت', 'اثر انگشتِ معنایی — ' + faDigitsOut_(run.made) + ' ردیفِ تازه',
               st2.line + (run.notes.length ? '\n' + run.notes.join('\n') : ''));
  }
  embStep_('پایان');
  out.ok = true;
  return out;
}

/** دکمهٔ منو: یک دورِ دستی با بودجهٔ بزرگ‌تر. */
function runEmbedBuild() {
  var ui = SpreadsheetApp.getUi();
  if (!embOn_()) { ui.alert('اثر انگشتِ معنایی خاموش است (EMB_ON).'); return; }
  var r = embNightly_({ cap: Number(CFG.EMB_MAX_PER_RUN) || 1200,
                        budgetMs: 240000, selftest: false });
  var st = embStatus_();
  ui.alert('اثر انگشتِ معنایی',
           st.line + '\n\n' + faDigitsOut_(r.made) + ' ردیفِ تازه در این دور' +
           (r.failed ? ' · ' + faDigitsOut_(r.failed) + ' ناموفق' : '') +
           (r.notes.length ? '\n' + r.notes.join('\n') : '') +
           (r.left ? '\n\nباقی‌مانده: ' + faDigitsOut_(r.left) +
                     ' ردیف. هر شب خودکار ادامه می‌یابد؛ این دکمه فقط ' +
                     'سریع‌ترش می‌کند.' : '\n\nچیزی باقی نمانده.'),
           ui.ButtonSet.OK);
}

/**
 * دکمهٔ منو: همه‌چیز را از نو بساز.
 *
 * ══ چرا این دکمه باید باشد ══
 * `embIndexStale_` وقتی مدل یا بُعد عوض شده جلوی ساخت را می‌گیرد — درست
 * است، چون نیمی از بانک با یک زبان و نیمی با زبانی دیگر بدتر از هیچ است.
 * ولی دروازه‌ای که آدم نتواند بازش کند، دروازه نیست؛ بن‌بست است. این
 * همان درِ ۵٫۹۵ است: فهرستِ قطعه‌ها پاک می‌شود، وضعیتِ همهٔ ردیف‌ها خالی
 * می‌شود، و شب‌های بعد از نو ساخته می‌شوند.
 *
 * فایل‌های قطعهٔ قدیمی **پاک نمی‌شوند** — فقط از فهرست بیرون می‌روند.
 * هیچ‌چیز در این مخزن پاک نمی‌شود.
 */
function runEmbedRebuild() {
  var ui = SpreadsheetApp.getUi();
  var st = embStatus_();
  var ans = ui.alert('بازسازیِ کاملِ اثر انگشت‌ها',
    st.line + '\n\nهمهٔ بردارها از نو ساخته می‌شوند — چند شب طول می‌کشد و ' +
    'هزینهٔ مدلش دوباره پرداخت می‌شود.\n\nفایل‌های قطعهٔ قدیمی پاک ' +
    'نمی‌شوند؛ فقط از فهرست بیرون می‌روند.\n\nادامه بدهم؟',
    ui.ButtonSet.YES_NO);
  if (ans !== ui.Button.YES) return;

  var hub = getHub_(), rows = 0;
  try {
    embIndexSave_({ ver: EMB_VER, model: String(CFG.EMB_MODEL || ''), dim: embDim_(),
                    probeDim: embProbeDim_(), at: nowStr_(), shards: [], counts: null });
    var tabs = embHubTabs_(hub);
    for (var t = 0; t < tabs.length; t++) {
      var sh = tabs[t], last = sh.getLastRow();
      if (last < 2) continue;
      var blank = [];
      for (var b = 0; b < last - 1; b++) blank.push(['', '']);
      sh.getRange(2, COL.EMB_FP, blank.length, 2).setValues(blank);
      rows += blank.length;
    }
    props_().deleteProperty(PK.EMB_CUR);
    props_().deleteProperty(PK.EMB_BAD);
  } catch (e) {
    ui.alert('بازسازی ناتمام ماند: ' + e.message);
    return;
  }
  embLog_(hub, { step: 'بازسازیِ دستی', scanned: rows, made: 0, failed: 0,
                 note: 'فهرستِ قطعه‌ها خالی شد و ' + rows + ' ردیف به صف برگشت' });
  ui.alert('بازسازیِ اثر انگشت',
           faDigitsOut_(rows) + ' ردیف به صف برگشت. کارِ شبانه از امشب ' +
           'می‌سازدشان؛ با دکمهٔ «ساخت و ادامه» سریع‌تر می‌شود.',
           ui.ButtonSet.OK);
}

/** دکمهٔ منو: آیا ایندکس واقعاً جواب می‌دهد؟ */
function runEmbedSelfTest() {
  var ui = SpreadsheetApp.getUi();
  var s = embSelfTest_(Number(CFG.EMB_SELFTEST_N) || 4);
  var hub = getHub_();
  embLog_(hub, { step: 'خودآزمون', scanned: 0, made: 0, failed: 0,
                 self: s.tried ? (s.hit + '/' + s.tried) : '', note: s.note });
  embGates_(hub, embStatus_(hub), s);
  ui.alert('خودآزمونِ اثر انگشت',
           s.tried ? ('از ' + faDigitsOut_(s.tried) + ' ردیفی که متنِ خودشان ' +
                      'پرس‌وجو شد، ' + faDigitsOut_(s.hit) + ' تا خودشان را ' +
                      'در نتایج پیدا کردند (' +
                      faDigitsOut_(Math.round(s.ratio * 100)) + '٪).' +
                      '\n\nاین تنها سنجه‌ای است که واقعاً چیزی را امتحان ' +
                      'می‌کند؛ بقیه فقط می‌شمارند.')
                  : ('انجام نشد — ' + (s.note || 'دلیلِ نامعلوم')),
           ui.ButtonSet.OK);
}
