/* ═══════════════════════════════════════════════════════════════════════
 * ۲۹) عصری‌سازیِ درس‌نامه — «آن یک نفرِ دیگر»
 * ═══════════════════════════════════════════════════════════════════════
 *
 * خواستهٔ صاحبِ برنامه، عیناً:
 *
 *   «این تولید پادکست برای درس‌نامه از نظر محتوایی باید قوی‌تر بشه … نه اینکه
 *    از محتوای اصلی عدول کنه … با مثال‌های امروز بیشتر و با لحن خودمانی‌تر …
 *    یه جوری عصری‌سازی … چون مفاهیم سنگین‌تر می‌شه و من سخت با شنیدن تنها
 *    بفهمم، ولی وقتی از چیزهایی که اطرافم هست و ملموسه … خیلی مفهوم‌تر می‌شه.
 *    … مثلاً یه نفر غیر از اون گوینده در لا‌به‌لای هر مطلب بیاد توضیح بده یا
 *    بذاره در انتهای هر قسمت … یا حسب ضرورت برخی وقت‌ها ابتدا … این نیاز به
 *    بررسی داره برای هر قسمت که کجا این یه نفر بیاد.»
 *
 * ── چهار تصمیمِ ساختاری، و دلیلِ هرکدام ─────────────────────────────────
 *
 * **۱) یک فراخوانِ جدا، نه فیلدی در پرامپتِ نویسنده.** خواسته صریح می‌گوید
 * «نیاز به بررسی دارد برای هر قسمت که کجا بیاید» — یعنی *تحلیلِ جایگاه*، و
 * تحلیلِ جایگاه وقتی ممکن است که متن تمام شده باشد. نویسنده هنگام نوشتن
 * هنوز نمی‌داند کدام بخش سنگین‌تر درآمده. ضمناً پرامپتِ نویسنده همین حالا
 * هم بلندترین پرامپتِ این ریپوست.
 *
 * **۲) پس از غنی‌سازی و پیش از اعراب‌گذاری.** متنِ توضیح‌دهنده هم متنِ گفتنی
 * است، پس باید *همان* مسیرِ متنِ صوتی را برود: اعراب‌گذاری، و بازبینیِ ۶٫۲۰.
 * خواستهٔ کاربر هم همین بود — «متنش باید دقیق توسط جایی تنظیم بشه و دوباره
 * قبل از تولید بررسی بشه». با نشستن در این نقطه، هیچ کدِ تازه‌ای برای آن
 * لازم نیست: خودش قطعه است و قطعه‌ها همه بازبینی می‌شوند.
 *
 * **۳) پیش یا پسِ یک بخش، نه وسطِ آن.** وسطِ روایتِ یک بخش نشستن یعنی شکستنِ
 * `narration` — و `secIndex` و `sourceIds` و جزوه و سنجهٔ محتوا همه به
 * یکپارچگیِ همان `narration` بسته‌اند. با پنج‌شش بخش، «پس از بخشِ ۲ و پس از
 * بخشِ ۴» در گوش دقیقاً همان «لا‌به‌لا»ست که خواسته شده، بی آنکه چیزی بشکند.
 *
 * **۴) موتور جای مدل تصمیم نمی‌گیرد، ولی مدل هم بی‌مرز نیست.** مدل جایگاه و
 * متن را پیشنهاد می‌دهد؛ کد شمارهٔ بخشِ ناموجود را دور می‌اندازد، سقفِ نویسه
 * را اعمال می‌کند، و اگر هیچ‌چیز نماند قسمت *بدونِ* توضیح‌دهنده می‌رود. یک
 * درس‌نامهٔ ساده بهتر از درس‌نامه‌ای است که سرِ ساعت نرسیده.
 *
 * ── و یک مرزِ محتوایی که از هر سهِ اینها مهم‌تر است ──────────────────────
 * «نه اینکه از محتوای اصلی عدول کنه». توضیح‌دهنده حق ندارد چیزی *بیفزاید* که
 * در درس نیست، حکمی بدهد که درس نداده، یا مثالی بزند که نتیجه‌اش خلافِ درس
 * باشد. کارش فقط این است: همان حرفِ درس را با واژه‌های امروز و یکی دو نمونهٔ
 * ملموس دوباره بگوید. این در پرامپت هست و در سنجهٔ ۲ از آزمون هم.
 */

/** روشن است؟ درس‌نامه‌ای است؟ («از همه جا از همه رنگ» این را لازم ندارد.) */
function explainOn_(show) {
  if (CFG.EXPLAIN_ENABLED === false) return false;
  return String(show) === ENRICH_SHOW_SPECIAL;
}

/* همهٔ فیلدها رشته‌اند. مدلِ این ریپو هر شمایی را که integer/number/boolean
   داشته باشد رد می‌کند و run_real_test.js این را در کلِ کد نگه می‌دارد. */
var EXPLAIN_SCHEMA = {
  type: 'object',
  properties: {
    spots: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },   // شمارهٔ بخش (۰-پایه)
          at: { type: 'string' },        // «ابتدا» یا «انتها»
          why: { type: 'string' },       // چرا همین‌جا لازم است
          text: { type: 'string' }       // خودِ حرفِ توضیح‌دهنده
        },
        required: ['section', 'at', 'text']
      }
    },
    note: { type: 'string' }
  },
  required: ['spots']
};

/** «۳» یا «۳ » یا «بخش ۳» → 3 · هر چیز دیگر → -1 */
function explainSecNo_(v) {
  var s = String(v === undefined || v === null ? '' : v);
  s = s.replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x6F0); })
       .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); });
  var m = s.match(/-?\d+/);
  if (!m) return -1;
  var n = parseInt(m[0], 10);
  return isFinite(n) ? n : -1;
}

/** «ابتدا»/«before»/«آغاز» → 'before' · هر چیز دیگر → 'after' */
function explainAt_(v) {
  var s = String(v || '').trim().toLowerCase();
  if (s.indexOf('ابتدا') !== -1 || s.indexOf('آغاز') !== -1 ||
      s.indexOf('before') !== -1 || s.indexOf('start') !== -1) return 'before';
  return 'after';
}

/**
 * سهمِ نویسه‌ایِ توضیح‌دهنده در این قسمت.
 *
 * عدد از خودِ صاحبِ برنامه آمده: «شاید لازم باشه سهمیهٔ ۱۳ درصد غنی‌سازیِ هر
 * پادکست افزایش پیدا کنه». ۱۳٪ *روی متنِ درس* حساب می‌شود، نه روی سقفِ فایل —
 * درسِ کوتاه توضیحِ کوتاه می‌خواهد.
 */
function explainBudget_(ep) {
  var pct = Number(CFG.EXPLAIN_PCT);
  if (!isFinite(pct) || pct <= 0) return 0;
  var base = 0;
  try { base = specialNarration_(ep).length; } catch (e) { base = 0; }
  if (!base) return 0;
  var want = Math.round(base * pct / 100);
  /* ── و همان درسِ ۵٫۹۶، این بار پیشاپیش ──
   * «سقفی که مرحلهٔ بعد بتواند رویش اضافه کند، سقف نیست.» عصری‌سازی
   * دقیقاً همان مرحلهٔ بعد است: پس از غنی‌سازی می‌آید و متن را بلندتر
   * می‌کند. specialWriteCap_ سهمش را از پیش کنار می‌گذارد، ولی مرزِ سختِ
   * «یک فایل» باید نگهبانِ دومِ خودش را هم اینجا داشته باشد — یک مرز با
   * یک نگهبان همان الگویی است که این ریپو بارها از آن ضربه خورده. */
  var room = want;
  try { room = Math.max(0, specialFileCap_() - base); } catch (e2) { room = want; }
  return Math.max(0, Math.min(want, room));
}

/**
 * پرامپتِ توضیح‌دهنده. عمداً متنِ *کاملِ* بخش‌ها را می‌دهد، نه عنوان‌ها:
 * «کجا سنگین است» را نمی‌شود از عنوان فهمید، و همین سؤال کلِ کارِ اوست.
 */
function explainPrompt_(ep, seriesName, budget, want) {
  var secs = (ep && ep.sections) || [];
  var L = [
    'کارِ تو: عصری‌سازیِ یک درسِ ضبط‌شده.',
    '',
    'یک پادکستِ آموزشی هست به نامِ «درس‌نامه». گویندهٔ اصلی درس را با زبانِ خودِ',
    'منبع می‌خوانَد. شنونده گفته مفاهیم سنگین است و با شنیدنِ تنها سخت جا',
    'می‌افتد، ولی وقتی همان مفهوم با چیزهای ملموسِ دوروبَرش گفته شود، می‌فهمد.',
    '',
    'پس یک نفرِ دوم — نه گویندهٔ اصلی — قرار است چند جا وسط بیاید و همان حرف را',
    'ساده و خودمانی بگوید. تو هم متنِ آن نفر را می‌نویسی و هم تصمیم می‌گیری',
    'کجا بیاید.',
    '',
    'مجموعه: «' + String(seriesName || '') + '»',
    'عنوانِ این قسمت: «' + String((ep && ep.title) || '') + '»',
    '',
    'بخش‌های این قسمت:'
  ];
  for (var i = 0; i < secs.length; i++) {
    var t = String(secs[i].narration || '').replace(/\s+/g, ' ').trim();
    L.push('');
    L.push('── بخشِ ' + i + ' — «' + String(secs[i].heading || '') + '»' +
           (secs[i].tone ? ' (وایب: ' + secs[i].tone + ')' : ''));
    L.push(t.length > 2200 ? t.slice(0, 2200) + ' …' : t);
  }
  L = L.concat([
    '',
    'حالا:',
    '',
    '۱) بخوان و ببین کدام بخش‌ها واقعاً سنگین‌اند — اصطلاحِ تخصصی، تعریفِ',
    '   انتزاعی، تمایزی که با یک بار شنیدن جا نمی‌افتد. **همهٔ بخش‌ها نه**:',
    '   حداکثر ' + want + ' جا. توضیح‌دهنده‌ای که همه‌جا هست، دیگر توضیح‌دهنده',
    '   نیست؛ گویندهٔ دوم است و درس را دو برابر می‌کند.',
    '',
    '۲) برای هر جا بگو «ابتدا» یا «انتها». پیش‌فرض «انتها»ست — مفهوم اول',
    '   گفته شود بعد ساده شود. «ابتدا» فقط وقتی که بخش با اصطلاحی شروع',
    '   می‌شود که تا نفهمیش کلِ بخش گنگ است.',
    '',
    '۳) متنش را بنویس، به زبانِ گفتار و خودمانی — انگار دوستی که موضوع را',
    '   بلد است دارد برایت تعریف می‌کند. «شما» نه؛ «ببین»، «یعنی چی؟»،',
    '   «فرض کن». جملهٔ کوتاه. اصطلاحِ تخصصی را یا باز کن یا نگو.',
    '',
    '۴) و مهم‌ترین بخشِ کارت: **یکی دو مثالِ امروزی و ملموس** برای هر جا.',
    '   ملموس یعنی چیزی که شنونده در زندگیِ روزمره‌اش دیده — گوشی، صفِ نانوایی،',
    '   ترافیک، پیامِ گروهی، خریدِ اینترنتی، مریض‌شدن، اجاره‌خانه. نه مثالِ',
    '   کتابی، نه «فرض کنید فیلسوفی…».',
    '',
    'مرزهایی که رد نمی‌شوند:',
    '',
    '- **از محتوای اصلی عدول نکن.** حکمی که درس نداده نده، مفهومی که در درس',
    '  نیست نیاور، و مثالی نزن که نتیجه‌اش خلافِ حرفِ درس باشد. اگر مثالی',
    '  پیدا نکردی که دقیقاً همان را برساند، آن جا را رد کن — یک جای کمتر',
    '  بهتر از یک مثالِ گمراه‌کننده است.',
    '- **خلاصه نکن، ساده کن.** «در این بخش گفتیم که…» ممنوع. تو مرورگر نیستی.',
    '- **نصیحت نکن.** «پس باید…»، «درسی که می‌گیریم…» ممنوع. کارِ تو فهماندن',
    '  است نه موعظه.',
    '- خودت را معرفی نکن و از گویندهٔ اصلی حرف نزن. صدایت خودش فرق دارد.',
    '- هیچ لینک، شناسهٔ فایل یا واژهٔ لاتین ننویس.',
    '',
    'سقفِ مجموعِ متنِ همهٔ جاها روی هم: ' + budget + ' نویسه. از این بیشتر بنویسی،',
    'خودِ موتور از ته می‌بُرد و ممکن است وسطِ جمله قطع شود.',
    '',
    'در فیلد section شمارهٔ بخش (همان عددی که بالا آمده)، در at «ابتدا» یا',
    '«انتها»، در why یک جمله که چرا همین‌جا، و در text خودِ حرف.'
  ]);
  return L.join('\n');
}

/**
 * نقشهٔ توضیح‌دهنده را می‌سازد و در ep.__explain می‌گذارد.
 * برمی‌گرداند { ok, n, chars, why }.
 *
 * یک بار برای هر (قسمت، امضای متن) — و امضا لازم است چون غنی‌سازی متن را
 * عوض می‌کند و توضیحِ ساخته‌شده روی متنِ قبلی می‌تواند به بخشی اشاره کند که
 * دیگر آن نیست.
 */
function explainPlan_(ep, epNum, seriesName) {
  var out = { ok: false, n: 0, chars: 0, why: '' };
  var secs = (ep && ep.sections) || [];
  if (!secs.length) { out.why = 'بخشی نیست'; return out; }
  var budget = explainBudget_(ep);
  if (budget < 200) { out.why = 'سهمِ نویسه‌ای برای توضیح نماند'; return out; }

  var sig = '';
  try { sig = speakHash_(specialNarration_(ep)); } catch (e) { sig = String(secs.length); }
  if (ep.__explain && ep.__explain.sig === sig && (ep.__explain.spots || []).length) {
    out.ok = true; out.n = ep.__explain.spots.length; out.why = 'از پیش ساخته شده';
    return out;
  }

  var want = Math.max(1, Math.min(Number(CFG.EXPLAIN_MAX_SPOTS) || 3,
                                  Math.ceil(secs.length / 2)));
  var r = null;
  try {
    r = geminiText_(explainPrompt_(ep, seriesName, budget, want), EXPLAIN_SCHEMA, 8192);
  } catch (e) { out.why = 'مدل در دسترس نبود: ' + e.message; return out; }
  if (!r || !(r.spots instanceof Array) || !r.spots.length) {
    out.why = 'مدل جایی پیشنهاد نداد';
    return out;
  }

  var spots = [], used = {}, total = 0;
  for (var i = 0; i < r.spots.length && spots.length < want; i++) {
    var sp = r.spots[i] || {};
    var no = explainSecNo_(sp.section);
    // شمارهٔ ناموجود = توهمِ مدل. دور انداخته می‌شود، نه اینکه به بخشِ صفر
    // بچسبد: توضیحی که سرِ جای غلط بنشیند، از نبودنش بدتر است.
    if (no < 0 || no >= secs.length) continue;
    var at = explainAt_(sp.at);
    var key = no + ':' + at;
    if (used[key]) continue;
    var txt = String(sp.text || '').replace(/[ \t]+/g, ' ').trim();
    if (txt.length < 80) continue;                    // یک جملهٔ تعارفی، توضیح نیست
    if (total + txt.length > budget) {
      var room = budget - total;
      if (room < 200) break;                          // ته‌ماندهٔ بی‌مصرف
      txt = explainTrim_(txt, room);
    }
    if (!txt) continue;
    used[key] = 1;
    total += txt.length;
    spots.push({ section: no, at: at, text: txt,
                 why: String(sp.why || '').replace(/\s+/g, ' ').slice(0, 160) });
  }
  if (!spots.length) { out.why = 'هیچ پیشنهادی از سدها رد نشد'; return out; }

  // ترتیب: بخش، و در یک بخش «ابتدا» پیش از «انتها».
  spots.sort(function (a, b) {
    if (a.section !== b.section) return a.section - b.section;
    return (a.at === 'before' ? 0 : 1) - (b.at === 'before' ? 0 : 1);
  });
  ep.__explain = { sig: sig, spots: spots, slot: Number(epNum) || 0,
                   at: new Date().toISOString(), note: String((r && r.note) || '') };
  out.ok = true; out.n = spots.length; out.chars = total;
  return out;
}

/**
 * بریدن روی مرزِ جمله. بریدنِ وسطِ جمله در متنِ *گفتنی* یعنی صدایی که وسطِ
 * حرف قطع می‌شود — و آن را شنونده می‌شنود، برخلافِ متنی که فقط خوانده می‌شود.
 */
function explainTrim_(t, cap) {
  var s = String(t || '').trim();
  if (s.length <= cap) return s;
  var cut = s.slice(0, cap);
  var last = -1, marks = '.!؟?…';
  for (var i = cut.length - 1; i >= 0; i--) {
    if (marks.indexOf(cut.charAt(i)) !== -1) { last = i; break; }
  }
  if (last > cap * 0.4) return cut.slice(0, last + 1).trim();
  return '';                                  // جملهٔ کامل جا نشد؛ هیچ بهتر است
}

/** قطعه‌های توضیح‌دهنده برای یک بخش، در جای خواسته‌شده. */
function explainSpotsFor_(ep, secIndex, at) {
  var out = [];
  var sp = (ep && ep.__explain && ep.__explain.spots) || [];
  for (var i = 0; i < sp.length; i++) {
    if (Number(sp[i].section) === Number(secIndex) && sp[i].at === at) out.push(sp[i]);
  }
  return out;
}

/**
 * قطعهٔ آمادهٔ درج در specialSegments_.
 *
 * `explainSlot` را نقش‌گزینی می‌خوانَد تا صدا را انتخاب کند — نه خودِ نامِ صدا،
 * چون نقش‌گزینی *بعد* از این اجرا می‌شود و فهرستِ صداهای همین قسمت آنجاست.
 * چیزی که اینجا تصمیم گرفته می‌شود فقط «کدامین همراه»ست، و آن هم از شمارهٔ
 * قسمت می‌آید تا در طولِ مجموعه بچرخد — خواستهٔ صریحِ کاربر: «این یه نفر که
 * گاهی هم باید تغییر کنه».
 */
function explainSeg_(ep, spot) {
  return {
    text: String(spot.text || ''),
    kind: 'explain',
    tone: 'خودمانی',
    secIndex: Number(spot.section),
    explainSlot: Number((ep && ep.__explain && ep.__explain.slot) || 0),
    heading: '',
    style: 'خودمانی و گرم، مثل کسی که کنارِ دستِ شنونده نشسته و دارد همان درس ' +
           'را با زبانِ ساده تعریف می‌کند. کمی سریع‌تر و سبک‌تر از بدنهٔ درس، ' +
           'بی لحنِ معلم‌وار. روی خودِ مثال کمی مکث کن.'
  };
}

/** کارنامه — همان الگوی speakReviewStatus_، و به همان دلیل. */
function explainLog_(epNum, n, chars, why) {
  try {
    var raw = props_().getProperty(PK.EXPLAIN);
    var L = raw ? JSON.parse(raw) : [];
    if (!(L instanceof Array)) L = [];
    L.unshift({ at: new Date().toISOString(), ep: String(epNum),
                n: Number(n) || 0, chars: Number(chars) || 0, why: String(why || '') });
    props_().setProperty(PK.EXPLAIN, JSON.stringify(L.slice(0, 10)));
  } catch (e) {}
}

/**
 * یک سطرِ فارسیِ آماده، هر روز — حتی وقتی همه‌چیز خوب است.
 *
 * و اگر پنج درس‌نامهٔ پیاپی هیچ توضیح‌دهنده‌ای نگیرند، از یادداشت به مشکل
 * ارتقا می‌یابد: قابلیتی که خودش را بی‌صدا خاموش کند، همان است که بانکِ
 * موسیقی را هفته‌ها خالی نگه داشت.
 */
function explainStatus_() {
  var out = { line: '', ok: true, runs: 0, spots: 0 };
  try {
    var raw = props_().getProperty(PK.EXPLAIN);
    var L = raw ? JSON.parse(raw) : [];
    if (!(L instanceof Array) || !L.length) {
      out.line = 'عصری‌سازیِ درس‌نامه: هنوز هیچ قسمتی توضیح‌دهنده نگرفته.';
      return out;
    }
    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (x) { return String(n); } };
    var chars = 0, dry = 0, dryRun = true;
    for (var i = 0; i < L.length; i++) {
      out.runs++; out.spots += Number(L[i].n) || 0; chars += Number(L[i].chars) || 0;
      if (dryRun) { if (!Number(L[i].n)) dry++; else dryRun = false; }
    }
    out.line = 'عصری‌سازیِ درس‌نامه: ' + fa(out.runs) + ' قسمتِ اخیر، ' + fa(out.spots) +
               ' جای توضیح‌دهنده (' + fa(chars) + ' نویسه).';
    if (out.runs >= 5 && dry >= 5) {
      out.ok = false;
      out.line = 'عصری‌سازیِ درس‌نامه: پنج قسمتِ پیاپی هیچ توضیح‌دهنده‌ای نگرفت' +
                 (L[0] && L[0].why ? ' — ' + L[0].why : '') + '.';
    }
  } catch (e) {}
  return out;
}
