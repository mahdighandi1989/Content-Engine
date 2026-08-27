/* ═══════════════════════════════════════════════════════════════════════
 * ۳۰) قسمتِ مرورِ بزرگ — یک بار برای هر مجموعه
 * ═══════════════════════════════════════════════════════════════════════
 *
 * خواستهٔ صاحبِ برنامه، عیناً:
 *
 *   «چون الان بالای ۱۷ قسمت پادکست درس‌نامه تولید شده و مفاهیم سخته، یه
 *    پادکست به صورت استثنا اگر می‌شه تولید بشه تا همهٔ مفاهیم قسمت‌های
 *    گذشته رو اون یه نفر با همون لحن و سادگی و مثال‌های بسیار ملموس و عینی
 *    و واقعی بیاد توضیح بده … تا واقعاً در مغزم تزریق بشه. و این هم در
 *    یوتیوب دقیقاً در جای خودش در اون پلی‌لیست درس‌نامهٔ مربوطه ذخیره بشه و
 *    کپشن و اسمش … همه درست ثبت بشه. و البته برای همین استثنا هم باید متن
 *    اعراب‌گذاری بشه و مجدد بررسی بشه و فولدر داشته باشه در قسمت مربوطه در
 *    درایو.»
 *
 * ── چهار تصمیم، و دلیلِ هرکدام ─────────────────────────────────────────
 *
 * **۱) ورودی، جزوهٔ همان مجموعه است — نه هفده پروندهٔ قسمت.** بخشِ ۲۶ از
 * ۵٫۸۶ دارد `_HANDOUT.json` را نگه می‌دارد، و آن *دقیقاً* همین چیز است:
 * همهٔ مفاهیمِ همهٔ درس‌های گذشتهٔ یک مجموعه، فصل‌بندی‌شده و پاک‌شده از لحنِ
 * رادیویی. خواندنِ هفده پوشه از درایو، ساختنِ دوبارهٔ چیزی است که همین حالا
 * ساخته و نگه‌داری می‌شود — و هر شب هم تازه می‌شود.
 *
 * **۲) هیچ مسیرِ تولیدِ تازه‌ای ساخته نمی‌شود.** این بخش فقط `ep` را می‌سازد،
 * پوشه و ردیف را می‌گذارد، و `PK.SP_PENDING` را روی مرحلهٔ `speak` می‌گذارد.
 * از آنجا به بعد **همان** ماشینِ درس‌نامه کار می‌کند: اعراب‌گذاری، بازبینیِ
 * ۶٫۲۰، نقش‌گزینی، موسیقی، ادغام، ایمیل، تلگرام، و بدهیِ یوتیوب با پلی‌لیست
 * و جایگاهِ درست. هر چیزی که کاربر خواست «هم ثبت بشه»، از پیش ثبت می‌شود —
 * چون مسیرِ تازه‌ای نیست که چیزی را جا بیندازد.
 *
 * **۳) نه غنی‌سازی، نه عصری‌سازی.** این قسمت *خودش* عصری‌سازی است؛ کلِ متنش
 * حرفِ همان یک نفر است. یک لایهٔ توضیح روی متنی که تماماً توضیح است، فقط
 * تکرار می‌سازد. و غنی‌سازیِ اینترنتی هم بی‌معناست: هیچ چیزِ تازه‌ای قرار
 * نیست وارد شود — قرار است چیزی که هست، فهمیده شود.
 *
 * **۴) شماره‌اش شمارهٔ بعدیِ درس‌نامه است، و همین جایش را در پلی‌لیست تعیین
 * می‌کند.** بخشِ ۲۷ جایگاهِ هر ویدئو را از «چند قسمتِ منتشرشدهٔ این پلی‌لیست
 * شمارهٔ کمتری دارند» حساب می‌کند. پس مرور، که شماره‌اش از همه بالاتر است،
 * خودبه‌خود ته پلی‌لیست می‌نشیند — و ته، جای درستِ یک مرور است. هیچ کدِ
 * جایگاهِ ویژه‌ای لازم نیست، و کدِ ویژه همان چیزی است که فردا از قلم می‌افتد.
 *
 * ── و یک مرز ──────────────────────────────────────────────────────────
 * مرور **درسِ تازه نیست**، پس به جزوه فصلی اضافه نمی‌کند (`meta.recap`).
 * جزوه کتابِ درس‌هاست؛ مرور خلاصهٔ همان کتاب است و افزودنش به خودش، کتاب را
 * دو برابر می‌کند بی آنکه چیزی به آن بیفزاید.
 */

/** یک بار برای هر مجموعه — و «یک بار» باید جایی نوشته شود که بمانَد. */
function recapDone_() {
  try {
    var raw = props_().getProperty(PK.RECAP_DONE);
    var o = raw ? JSON.parse(raw) : {};
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

/**
 * «یک بار» تنها نصفِ خبر است؛ نصفِ دیگر **تا کجا**.
 *
 * خواستهٔ صریحِ صاحبِ برنامه: «ببینم برای هر مجموعه مرورش تا کجا تولید شده».
 * تا ۶٫۲۹ فقط تاریخ و شمارهٔ قسمت ذخیره می‌شد، پس تخته فقط می‌توانست
 * «ساخته/نساخته» بگوید — و مجموعه‌ای که بعد از مرورش ده درسِ دیگر گرفته،
 * از مجموعه‌ای که همین دیروز مرور شده جدا نمی‌شد.
 */
function recapMarkDone_(seriesKey, epNum, parts, chapters) {
  try {
    var o = recapDone_();
    o[String(seriesKey)] = { at: nowStr_(), ep: Number(epNum) || 0,
                             parts: Number(parts) || 0, ch: Number(chapters) || 0 };
    props_().setProperty(PK.RECAP_DONE, JSON.stringify(o));
  } catch (e) {}
}

/**
 * دکمه‌ای که آدم بتواند بازش کند.
 *
 * قاعدهٔ ۵٫۹۵ در این ریپو: «یک‌بار‌مصرفِ بی‌درِ بازگشت، شکلی است که این ریپو
 * مدام به آن می‌خورد.» اگر مرورِ یک مجموعه بد در بیاید یا مجموعه بعداً ده
 * درسِ دیگر بگیرد، باید بشود دوباره ساخت.
 */
function recapReopen_(seriesKey) {
  try {
    var o = recapDone_();
    if (!o[String(seriesKey)]) return false;
    delete o[String(seriesKey)];
    props_().setProperty(PK.RECAP_DONE, JSON.stringify(o));
    return true;
  } catch (e) { return false; }
}

/**
 * چند قسمتِ درس‌نامه از هر مجموعه تولید شده — **یک خواندن برای همه**.
 *
 * ══ چرا نگاشت، نه تابعی که نامِ یک مجموعه را بگیرد ══
 * نسخهٔ اول `recapPartsMade_(hub, name)` بود و `recapPick_` آن را برای
 * *هر* ردیفِ رجیستری صدا می‌زد. رجیستری ۲۶۴ ردیف دارد، یعنی ۲۶۴ بار
 * خواندنِ همان ستون از همان تب — در Node هشت میلی‌ثانیه، در Apps Script
 * هر کدام یک رفت‌وبرگشت به سرورِ شیت. ده‌ها ثانیه، هر شب، فقط برای
 * تصمیمی که تقریباً همیشه «کاری نیست» است.
 * همان درسی که تختهٔ جزوه در ۵٫۸۷ گرفت: یک خواندن برای ۲۶۴ مجموعه، نه
 * ۲۶۴ رفت‌وبرگشت.
 */
/**
 * نشانِ ردیفِ مرور در تبِ درس‌نامه — **یک نسخه، دو مصرف**: هم نوشته می‌شود،
 * هم خوانده. دو رشتهٔ جدا یعنی روزی یکی عوض می‌شود و آن‌یکی بی‌صدا کهنه.
 */
var RECAP_ROW_MARK = 'مرورِ همهٔ درس‌ها';

/**
 * چند درسِ *واقعی* از هر مجموعه ساخته شده.
 *
 * ══ و چرا ردیفِ خودِ مرور باید کنار برود (۶٫۳۰) ══
 * مرور هم یک ردیف در همین تب می‌گذارد. تا وقتی این تابع فقط ردیف می‌شمرد،
 * مجموعه‌ای که ۱۸ درس داشت و مرور گرفت، ۱۹ نشان می‌داد — یعنی تخته برای
 * همیشه می‌گفت «یک درس عقب است» و دکمهٔ مرورش هر شب دوباره تیک می‌خورد.
 * دقیقاً همان چیزی که `handoutSeriesEpisodes_` در بخشِ ۲۶ برایش فیلتر دارد:
 * «مرور درسِ تازه نیست». هشداری که هرگز نمی‌تواند رفع شود، هشدار نیست.
 */
function recapPartsMap_(hub) {
  var map = Object.create(null);
  try {
    var sh = hub.getSheetByName(CFG.SPECIAL_TAB);
    if (!sh || sh.getLastRow() < 2) return map;
    var w = XC.PARTS - XC.SERIES + 1;
    var v = sh.getRange(2, XC.SERIES, sh.getLastRow() - 1, w).getValues();
    for (var i = 0; i < v.length; i++) {
      var nm = String(v[i][0] || '').trim();
      if (!nm) continue;
      var cov = String(v[i][XC.PARTS - XC.SERIES] || '');
      if (cov.indexOf(RECAP_ROW_MARK) !== -1) continue;   // ردیفِ خودِ مرور
      map[nm] = (map[nm] || 0) + 1;
    }
  } catch (e) {}
  return map;
}

/**
 * مجموعه‌هایی که مرور می‌خواهند: به‌قدرِ کافی درس دارند و هنوز مرور نگرفته‌اند —
 * از پرقسمت‌ترین به کم‌قسمت‌ترین.
 *
 * ══ چرا فهرست، نه یک نامزد ══
 * نسخهٔ اول فقط بهترین را برمی‌گرداند و `runRecapEpisode` اگر آن یکی
 * جزوه نداشت، همان‌جا می‌ایستاد. یعنی **یک مجموعهٔ بی‌جزوه با بیشترین
 * قسمت، صف را برای همیشه می‌بست**: هر شب همان انتخاب می‌شد، هر شب
 * «جزوه ندارد» می‌گرفت، و مجموعه‌ای که آماده بود هرگز نوبت نمی‌گرفت —
 * بی هیچ خطایی، فقط یک سطر در سیاهه. همان شکلِ گرسنگی که `ytRunDue_`
 * یک بار داشت.
 */
function recapCandidates_(hub, reg, forceKey) {
  var done = recapDone_();
  var min = Number(CFG.RECAP_MIN_PARTS) || 8;
  var out = [];
  var made0 = recapPartsMap_(hub);          // ← یک خواندن، پیش از حلقه
  for (var i = 0; i < (reg.rows || []).length; i++) {
    var rec = reg.rows[i];
    var key = String(rec.key || '');
    var name = String(rec.vals[SC.NAME - 1] || key);
    if (forceKey) { if (key !== String(forceKey)) continue; }
    else if (done[key]) continue;
    var made = made0[name] || 0;
    if (!forceKey && made < min) continue;
    if (!made) continue;                       // مروری که چیزی برای مرور ندارد
    out.push({ rec: rec, name: name, made: made });
  }
  out.sort(function (a, b) { return b.made - a.made; });
  return out;
}

/* همهٔ فیلدها رشته‌اند — قاعدهٔ شمای این ریپو. */
var RECAP_SCHEMA = {
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
          tone: { type: 'string' }
        },
        required: ['heading', 'narration']
      }
    },
    outro: { type: 'string' },
    summary: { type: 'string' }
  },
  required: ['title', 'hook', 'sections', 'outro']
};

/** فشردهٔ کتاب برای پرامپت — عنوانِ فصل‌ها و متنِ بخش‌ها، تا سقف. */
function recapBookText_(book, cap) {
  var L = [], used = 0;
  var chs = (book && book.chapters) || [];
  for (var c = 0; c < chs.length; c++) {
    var head = '── فصلِ ' + (c + 1) + ': ' + String(chs[c].title || '');
    L.push(head); used += head.length;
    var secs = chs[c].sections || [];
    for (var s = 0; s < secs.length; s++) {
      var t = String(secs[s].title || '');
      var b = String(secs[s].body || '').replace(/\s+/g, ' ').trim();
      // هر بخش سهمِ برابر می‌گیرد، نه «هرچه اول آمد». وگرنه فصل‌های اولِ
      // کتاب کلِ جا را می‌خوردند و درس‌های تازه — که همان‌هایی‌اند که هنوز
      // جا نیفتاده‌اند — اصلاً به پرامپت نمی‌رسیدند.
      if (b.length > 700) b = b.slice(0, 700) + ' …';
      var line = '• ' + t + (b ? ' — ' + b : '');
      if (used + line.length > cap) { L.push('… (ادامهٔ کتاب جا نشد)'); return L.join('\n'); }
      L.push(line); used += line.length;
    }
  }
  return L.join('\n');
}

function recapPrompt_(book, seriesName, capChars) {
  var L = [
    'کارِ تو: نوشتنِ یک قسمتِ «مرورِ بزرگ» برای یک پادکستِ آموزشی.',
    '',
    'یک مجموعهٔ درسی به نامِ «' + String(seriesName || '') + '» تا اینجا چند ده',
    'مفهوم را درس داده. شنونده گفته: «مفاهیم سخته و من با شنیدنِ تنها سخت',
    'می‌فهمم؛ وقتی از چیزهایی که اطرافم هست و ملموسه بگی، خیلی مفهوم‌تر می‌شه.',
    'می‌خوام واقعاً در مغزم تزریق بشه.»',
    '',
    'پس این قسمت را **یک نفر** می‌گوید — نه مدرس، بلکه همان دوستی که بلد است و',
    'ساده حرف می‌زند. کلِ قسمت با لحنِ او نوشته می‌شود.',
    '',
    '── آنچه تا حالا درس داده شده (جزوهٔ همین مجموعه) ──',
    recapBookText_(book, 42000),
    '',
    '── حالا بنویس ──',
    '',
    '۱) **همهٔ مفاهیمِ مهم را پوشش بده.** چیزی را جا نینداز چون سخت است؛',
    '   سختی دقیقاً دلیلِ وجودِ این قسمت است. اگر مفهومی کوچک است، یک جمله؛',
    '   اگر ستون‌فقراتِ مجموعه است، یک بخشِ کامل.',
    '',
    '۲) **برای هر مفهوم یکی دو مثالِ بسیار ملموس و امروزی.** ملموس یعنی چیزی',
    '   که شنونده در زندگیِ روزمره‌اش دیده و لمس کرده: گوشی، صفِ نانوایی،',
    '   ترافیک، پیامِ گروهی، خریدِ اینترنتی، اجاره‌خانه، مریض‌شدن، دعوای',
    '   خانوادگی. **نه** «فرض کنید فیلسوفی…»، **نه** مثالِ کتابی، **نه**',
    '   مثالی که خودش به توضیح نیاز دارد.',
    '',
    '۳) **لحن، گفتاری و خودمانی.** «ببین»، «فرض کن»، «یعنی چی؟»، «حالا این به',
    '   چه دردی می‌خوره؟». جملهٔ کوتاه. هر اصطلاحِ تخصصی را یا باز کن یا نگو.',
    '',
    '۴) **ترتیب، از ساده به سخت** — نه به ترتیبِ فصل‌های کتاب. چیزی که برای',
    '   فهمیدنِ بقیه لازم است، اول بیاید.',
    '',
    '۵) در hook بگو این قسمت چیست («یه مرورِ بزرگ از همهٔ چیزهایی که تا حالا',
    '   گفتیم، این‌بار خیلی ساده») و در outro جمع‌بندی کن.',
    '',
    'مرزها:',
    '- **از محتوای درس عدول نکن.** حکمی که در جزوه نیست نده، مفهومی که درس',
    '  داده نشده نیاور، و مثالی نزن که نتیجه‌اش خلافِ درس باشد.',
    '- **نصیحت نکن.** «پس باید…»، «درسی که می‌گیریم…» ممنوع.',
    '- هیچ لینک، شناسهٔ فایل یا واژهٔ لاتین ننویس.',
    '- عددها را با حروف بنویس.',
    '',
    'طولِ مجموعِ متنِ گفتنی (hook + بخش‌ها + outro) حدودِ ' + capChars + ' نویسه —',
    'نه بیشتر. این سقف در کد اعمال می‌شود؛ بلندتر بنویسی، بریده می‌شود.'
  ];
  return L.join('\n');
}

/**
 * ساختِ متنِ مرور. برمی‌گرداند ep یا null.
 * سقف همان سقفِ «یک فایل» است — بی رزروِ غنی‌سازی و عصری‌سازی، چون هیچ‌کدام
 * روی این قسمت اجرا نمی‌شوند و رزروِ بی‌مصرف یعنی مرورِ بی‌دلیل کوتاه‌تر.
 */
function recapWrite_(book, seriesName) {
  var cap = 0;
  try { cap = specialFileCap_(); } catch (e) { cap = 9000; }
  var r = null;
  try { r = geminiText_(recapPrompt_(book, seriesName, cap), RECAP_SCHEMA, 60000); }
  catch (e) { logLine_('مرورِ بزرگ نوشته نشد: ' + e.message); return null; }
  if (!r || !(r.sections instanceof Array) || !r.sections.length) return null;
  var ep = {
    title: String(r.title || ('مرورِ بزرگ — ' + seriesName)).slice(0, 120),
    hook: String(r.hook || ''),
    sections: [],
    outro: String(r.outro || ''),
    summary: String(r.summary || ''),
    series: String(seriesName || ''),
    isRecap: true
  };
  for (var i = 0; i < r.sections.length; i++) {
    var s = r.sections[i] || {};
    var n = String(s.narration || '').trim();
    if (!n) continue;
    ep.sections.push({ heading: String(s.heading || '').slice(0, 120),
                       narration: n, tone: String(s.tone || 'خودمانی'),
                       chunkNos: [], enrichIds: [] });
  }
  return ep.sections.length ? ep : null;
}

/**
 * صدای «آن یک نفر» برای کلِ قسمت.
 *
 * نقش‌گزینیِ عادی گویندهٔ اصلی را می‌گذارد سرِ کار؛ اینجا برعکسش را
 * می‌خواهیم — کلِ قسمت باید صدای همان همراهی باشد که در قسمت‌های عادی
 * توضیح می‌دهد، وگرنه «همان یک نفر» یک نفرِ دیگری از آب درمی‌آید.
 */
function recapCast_(ep) {
  try {
    var c = ep && ep.__cast;
    /* ══ همراه‌ها از `all.slice(1)` می‌آیند، نه از یک کلیدِ `mates` ══
     * نسخهٔ اول این تابع `c.mates` را می‌خواند و همیشه `undefined` می‌گرفت،
     * چون آنچه روی *پرونده* ذخیره می‌شود `{lead, all, genders, note}` است و
     * `mates` را `ensureCast_` هنگام برگرداندن می‌سازد. نتیجه: تابع بی‌صدا
     * false برمی‌گرداند و کلِ مرور با صدای همیشگی خوانده می‌شد — یعنی «آن
     * یک نفر» همان گویندهٔ همیشگی از آب درمی‌آمد و هیچ خطایی هم نمی‌داد.
     * پس همان استخراجی که ensureCast_ می‌کند، اینجا هم انجام می‌شود. */
    if (!c || !c.lead || !(c.all instanceof Array) || c.all.length < 2) return false;
    var mates = c.all.slice(1);
    var mate = mates[0];
    if (!mate || mate === c.lead) return false;
    var all = [mate, c.lead].concat(mates.slice(1));
    // جنسیت‌ها باید با ترتیبِ تازهٔ all جابه‌جا شوند، وگرنه در گزارشِ
    // گویندگان جنسیتِ هرکس به دیگری می‌چسبد.
    var g = c.genders || [], genders = [g[1] || '', g[0] || ''];
    for (var i = 2; i < c.all.length; i++) genders.push(g[i] || '');
    ep.__cast = { lead: mate, all: all, genders: genders, note: '' };
    return true;
  } catch (e) { return false; }
}

/**
 * قسمتِ مرورِ بزرگ را می‌سازد و به صفِ صداگذاری می‌دهد.
 *
 * @param {{key:string, force:boolean}=} opt  key: مجموعهٔ مشخص · force: حتی اگر قبلاً ساخته شده
 */
function runRecapEpisode(opt) {
  opt = opt || {};
  if (CFG.RECAP_ENABLED === false && !opt.force) {
    return { ok: false, reason: 'off' };
  }
  if (props_().getProperty(PK.SP_PENDING)) {
    // درس‌نامهٔ دیگری در حالِ صداگذاری است. دو قسمتِ هم‌زمان یعنی یکی از
    // آن‌دو نیمه‌کاره رها می‌شود، و PK.SP_PENDING یک کلید بیشتر نیست.
    return { ok: false, reason: 'busy' };
  }
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  if (opt.key && opt.force) recapReopen_(opt.key);
  /* نامزدها به ترتیب امتحان می‌شوند، نه فقط اولی: مجموعه‌ای که جزوه ندارد
     نباید صف را برای بقیه ببندد. */
  var cands = recapCandidates_(hub, reg, opt.key || '');
  if (!cands.length) return { ok: false, reason: 'none' };
  var pick = null, folderOf = null, book = null, nCh = 0, noBook = [];
  for (var ci = 0; ci < cands.length; ci++) {
    var c = cands[ci], fo = null;
    try { fo = seriesFolder_(reg, c.rec); } catch (eF) { continue; }
    var bk = null;
    try { bk = handoutRead_(fo, { seriesKey: c.rec.key, seriesName: c.name }); }
    catch (eB) { bk = null; }
    var n = (bk && bk.chapters) ? bk.chapters.length : 0;
    if (!n) { noBook.push(c.name); continue; }
    pick = c; folderOf = fo; book = bk; nCh = n;
    break;
  }
  if (noBook.length) {
    /* جزوه هنوز ساخته نشده. این *خودش* یک ایراد است و نه سکوت: جزوه هر شب
       ساخته می‌شود و مجموعه‌ای با هشت درسِ تولیدشده باید کتاب داشته باشد. */
    logLine_('مرورِ بزرگ: این مجموعه‌ها جزوه ندارند و رد شدند — ' + noBook.join('، ') + '.');
  }
  if (!pick) return { ok: false, reason: 'no-handout', series: noBook.join('، ') };

  var ep = recapWrite_(book, pick.name);
  if (!ep) return { ok: false, reason: 'write', series: pick.name };
  try {
    var cut = specialCondense_(ep, specialFileCap_(), 0);
    if (cut && cut.ep) ep = cut.ep;
  } catch (eC) {}

  var epNum = (parseInt(props_().getProperty(PK.SP_EP_NUM) || '0', 10)) + 1;
  props_().setProperty(PK.SP_EP_NUM, String(epNum));

  var folder = folderOf.createFolder(
    'قسمت ' + ('000' + epNum).slice(-3) + ' — ' +
    Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyyMMdd') + ' — مرورِ بزرگ — ' +
    String(ep.title || '').slice(0, 50));

  try {
    ensureCast_(ep, ENRICH_SHOW_SPECIAL, epNum, seriesCatOf_(pick.rec.vals));
    recapCast_(ep);
  } catch (eCast) { logLine_('نقش‌گزینیِ مرور انجام نشد: ' + eCast.message); }

  var meta = {
    ep: ep, seriesKey: pick.rec.key, seriesName: pick.name,
    partFile: '', partName: RECAP_ROW_MARK, partSeq: 0,
    covers: [], fromNo: 0, toNo: 0, totalChunks: 0, more: false,
    chunkNos: [], enrich: [], enrichOffered: 0,
    seriesCat: seriesCatOf_(pick.rec.vals),
    level: String(pick.rec.vals[SC.LEVEL - 1] || ''),
    orders: [], epNum: epNum, date: todayWords_(),
    // این نشان دو کار می‌کند: جزوه فصلی از مرور نمی‌سازد، و گزارش‌ها
    // می‌دانند این قسمت درسِ تازه‌ای پیش نبرده.
    recap: true, recapChapters: nCh, recapParts: pick.made
  };
  writeSpecialJson_(folder, meta);

  var sp = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
  var tags = [];
  try { tags = specialTags_(ep, pick.name, 0, epNum); } catch (eT) { tags = []; }
  sp.appendRow([epNum, nowStr_(), pick.name, String(ep.title || ''),
                RECAP_ROW_MARK + ' (' + pick.made + ' قسمت)',
                'از جزوهٔ مجموعه — ' + nCh + ' فصل',
                '—', '', '', 'در حال ساخت صدا', '', tags.join(' '),
                '', 'خیر — این قسمت مرور است، نه درسِ تازه', '']);

  props_().setProperty(PK.SP_PENDING, JSON.stringify({
    epNum: epNum, folderId: folder.getId(), row: sp.getLastRow(),
    chunkIdx: 0, partNo: 1, files: [], phase: 'speak'
  }));
  recapMarkDone_(pick.rec.key, epNum, pick.made, nCh);
  recapLog_(pick.name, epNum, ep.sections.length, nCh);
  scheduleSpecialContinue_(45 * 1000);
  logLine_('مرورِ بزرگِ «' + pick.name + '» نوشته شد (قسمت ' + epNum + '، ' +
           ep.sections.length + ' بخش از ' + nCh + ' فصل)؛ صداگذاری در اجرای بعد.');
  return { ok: true, episode: epNum, series: pick.name,
           title: ep.title, sections: ep.sections.length, pending: true };
}

/** کارنامه — همان الگوی بقیه، و به همان دلیل. */
function recapLog_(seriesName, epNum, secs, chapters) {
  try {
    var raw = props_().getProperty(PK.RECAP_LOG);
    var L = raw ? JSON.parse(raw) : [];
    if (!(L instanceof Array)) L = [];
    L.unshift({ at: new Date().toISOString(), series: String(seriesName),
                ep: Number(epNum) || 0, secs: Number(secs) || 0,
                chapters: Number(chapters) || 0 });
    props_().setProperty(PK.RECAP_LOG, JSON.stringify(L.slice(0, 10)));
  } catch (e) {}
}

/**
 * آیا امشب مروری بدهکاریم؟ — و عمداً حداکثر یکی در هر شب.
 * دو مرورِ یک‌شبه یعنی دو قسمتِ درس‌نامه در یک روز، که برنامهٔ شنونده را
 * به هم می‌ریزد؛ و صف هم جایی نمی‌رود.
 */
/* ═══════════════════════════════════════════════════════════════════
 * صفِ مرور — انتخابِ آدم، نه فقط انتخابِ موتور (۶٫۳۰)
 * ═══════════════════════════════════════════════════════════════════
 *
 * خواستهٔ صاحبِ برنامه: «بتونم انتخاب کنم از درس‌هایی که قبلاً مرور داشتن هم
 * باز مرور تولید بشه یا نه، و به‌صورت پیش‌فرض هم خودش انتخاب کرده باشه که
 * اون‌هایی که مرور نشدن تیک خورده باشه (البته در صورتی که پادکستش قبلاً
 * تولید شده باشه) ولی خودمم بتونم تیک بقیه رو بزنم.»
 *
 * چرا **صف** و نه «همه را همین حالا بساز»: هر مرور یک فراخوانِ مدل است و
 * `PK.SP_PENDING` یک کلید بیشتر نیست — دو درس‌نامهٔ هم‌زمان یعنی یکی
 * نیمه‌کاره رها می‌شود. پس تیک‌ها یک *سفارش* می‌سازند: اولی همان لحظه
 * شروع می‌شود و بقیه شب‌به‌شب پشتِ سرش می‌آیند.
 *
 * و صف حافظه دارد: مجموعه‌ای که سه شب پیاپی نشود (مثلاً جزوه‌اش ساخته
 * نشده) کنار گذاشته می‌شود با علتِ نوشته‌شده — وگرنه یک سفارشِ نشدنی صف را
 * برای بقیه می‌بندد، همان گرسنگی‌ای که `recapCandidates_` یک بار داشت.
 */
function recapQueue_() {
  try {
    var raw = props_().getProperty(PK.RECAP_Q);
    var L = raw ? JSON.parse(raw) : [];
    return (L instanceof Array) ? L : [];
  } catch (e) { return []; }
}

function recapQueueSave_(list) {
  try {
    props_().setProperty(PK.RECAP_Q, JSON.stringify((list || []).slice(0, 40)));
    return true;
  } catch (e) { return false; }
}

/**
 * تیک‌های تخته را به صف تبدیل می‌کند. **جایگزین می‌کند، نه اضافه** — تخته
 * حالِ کاملِ انتخاب را می‌فرستد، پس برداشتنِ تیک باید واقعاً برداشتن باشد.
 *
 * مجموعه‌ای که هیچ درسِ تولیدشده‌ای ندارد پذیرفته نمی‌شود، هر چه تیک بخورد:
 * مرورِ چیزی که وجود ندارد، یک قسمتِ خالی است.
 */
function recapQueueSet_(keys, hub) {
  var map = {};
  try { map = recapBoardMap_(hub || getHub_()); } catch (e) { map = {}; }
  var out = [], seen = Object.create(null), skipped = [];
  for (var i = 0; i < (keys || []).length; i++) {
    var k = String(keys[i] || '').trim();
    if (!k || seen[k]) continue;
    seen[k] = true;
    var m = map[k];
    if (!m || !m.made) { skipped.push(k); continue; }
    out.push({ key: k, name: m.name, made: m.made,
               redo: !!(m.done && m.done.at), at: nowStr_(), tries: 0, why: '' });
  }
  // پرقسمت‌ترین اول — همان ترتیبی که recapCandidates_ خودش می‌گیرد.
  out.sort(function (a, b) { return b.made - a.made; });
  recapQueueSave_(out);
  return { n: out.length, skipped: skipped.length, list: out };
}

/**
 * یک سفارش از صف را اجرا می‌کند. هم دکمه از این استفاده می‌کند هم کارِ شبانه،
 * چون دو مسیرِ جدا یعنی یکی از آن‌دو روزی رفتارِ دیگری پیدا می‌کند.
 */
function recapRunNext_() {
  /* «خالی» پیش از «مشغول» پرسیده می‌شود: صفِ خالیِ یک شبِ شلوغ، «مشغول»
     نیست — هیچ سفارشی نبوده. و `recapNightly_` دقیقاً بر همین تمایز تکیه
     می‌کند تا بفهمد باید سراغِ انتخابِ خودکار برود یا نه. */
  var q = recapQueue_();
  if (!q.length) return { ok: false, reason: 'empty' };
  if (props_().getProperty(PK.SP_PENDING)) return { ok: false, reason: 'busy' };
  var head = q[0] || {};
  var r;
  try { r = runRecapEpisode({ key: head.key, force: true }); }
  catch (e) { r = { ok: false, reason: 'error', why: e.message }; }

  if (r.ok) { recapQueueSave_(q.slice(1)); r.queueLeft = q.length - 1; return r; }
  if (r.reason === 'busy') { r.queueLeft = q.length; return r; }

  head.tries = (Number(head.tries) || 0) + 1;
  head.why = String(r.reason || '');
  var max = Math.max(1, Number(CFG.RECAP_TRY_MAX) || 3);
  if (head.tries >= max) {
    recapQueueSave_(q.slice(1));
    logLine_('مرورِ «' + (head.name || head.key) + '» بعد از ' + head.tries +
             ' تلاش کنار گذاشته شد (' + head.why + ').');
    r.dropped = true;
  } else {
    q[0] = head; recapQueueSave_(q);
  }
  r.queueLeft = recapQueue_().length;
  return r;
}

/**
 * حالِ مرورِ هر مجموعه، برای تختهٔ «مجموعه‌های آموزشی و پیشرفت».
 *
 * یک خواندنِ تبِ درس‌نامه برای همهٔ مجموعه‌ها — نه یکی به‌ازای هر مجموعه.
 * همان قاعده‌ای که در ۶٫۲۲ `recapPick_` را از ۲۶۴ خواندن به یکی رساند.
 */
function recapBoardMap_(hub, reg) {
  var out = Object.create(null);
  try {
    hub = hub || getHub_();
    reg = reg || readSeriesReg_(hub);
    var made = recapPartsMap_(hub);
    var done = recapDone_();
    var q = recapQueue_(), qs = Object.create(null);
    for (var j = 0; j < q.length; j++) qs[String(q[j].key)] = j + 1;
    var min = Number(CFG.RECAP_MIN_PARTS) || 8;
    for (var i = 0; i < (reg.rows || []).length; i++) {
      var rec = reg.rows[i];
      var key = String(rec.key || '');
      var name = String(rec.vals[SC.NAME - 1] || key);
      var m = Number(made[name]) || 0;
      var d = done[key] || null;
      var covered = d ? (Number(d.parts) || 0) : 0;
      out[key] = {
        name: name, made: m, done: d, covered: covered,
        behind: Math.max(0, m - covered),
        queued: qs[key] || 0,
        eligible: m > 0,              // «پادکستش قبلاً تولید شده باشه»
        ripe: m >= min                // به کفِ خودکار هم رسیده
      };
    }
  } catch (e) {}
  return out;
}

function recapNightly_() {
  if (CFG.RECAP_ENABLED === false) return { ok: false, reason: 'off' };
  if (props_().getProperty(PK.SP_PENDING)) return { ok: false, reason: 'busy' };
  /* سفارشِ آدم بر انتخابِ موتور مقدم است. اگر برعکس بود، شبی که موتور خودش
     نامزدی داشت، تیکِ دیشبِ صاحبِ برنامه یک شب دیگر عقب می‌افتاد — و او
     دلیلش را هیچ‌جا نمی‌دید. */
  var q;
  try { q = recapRunNext_(); } catch (eQ) { q = { ok: false, reason: 'error' }; }
  if (q && q.reason !== 'empty') return q;
  var r;
  try { r = runRecapEpisode({}); } catch (e) { return { ok: false, reason: 'error', why: e.message }; }
  return r;
}

/**
 * دکمهٔ منو. `force` روشن است چون آدمی که دکمه را می‌زند خودش تصمیم گرفته —
 * همان قاعدهٔ `{manual:true}` در دروازهٔ تقویم. اگر مجموعه‌ای قبلاً مرور
 * گرفته، دوباره ساخته می‌شود؛ یک گیتی که آدم نتواند بازش کند، همان شکلی
 * است که این ریپو مدام به آن می‌خورَد.
 */
function runRecapNow() {
  var ui = ui_();
  /* صف مقدم است — همان ترتیبی که کارِ شبانه دارد. دکمه‌ای که صفِ سفارش را
     نادیده بگیرد یعنی دو رفتار برای یک کار، و روزی یکی‌شان عوض می‌شود. */
  var r = null;
  try { r = recapRunNext_(); } catch (eQ) { r = null; }
  if (!r || r.reason === 'empty') r = runRecapEpisode({ force: true });
  var L = ['قسمتِ مرورِ بزرگ:'];
  if (r.ok) {
    L.push('• مجموعه: ' + r.series);
    L.push('• قسمت ' + faDigitsOut_(String(r.episode)) + ' — «' + r.title + '»');
    L.push('• ' + faDigitsOut_(String(r.sections)) + ' بخش نوشته شد.');
    L.push('');
    L.push('صداگذاری در اجرای بعد شروع می‌شود؛ متن مثلِ هر قسمتِ دیگر ' +
           'اعراب‌گذاری و بازبینی می‌شود و شبانه به یوتیوب می‌رود.');
  } else {
    var why = {
      off: 'قابلیت خاموش است (RECAP_ENABLED).',
      busy: 'درس‌نامهٔ دیگری در حالِ صداگذاری است؛ بعد از تمام‌شدنش دوباره بزنید.',
      none: 'هیچ مجموعه‌ای هنوز به کفِ ' + faDigitsOut_(String(CFG.RECAP_MIN_PARTS || 8)) +
            ' قسمتِ تولیدشده نرسیده.',
      'no-handout': 'جزوهٔ آن مجموعه هنوز ساخته نشده؛ ورودیِ مرور همان جزوه است.',
      write: 'مدل متنی برنگرداند.',
      folder: 'پوشهٔ مجموعه پیدا نشد.'
    }[r.reason] || String(r.reason || 'نامعلوم');
    L.push('• ساخته نشد — ' + why);
    if (r.why) L.push('  ' + r.why);
  }
  L.push('');
  L.push(recapStatus_().line);
  var m = L.join('\n');
  if (ui) ui.alert('مرورِ بزرگ', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

/** یک سطرِ فارسیِ آماده برای ایمیلِ روزانه. */
function recapStatus_() {
  var out = { line: '', ok: true, n: 0, queued: 0 };
  try {
    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (x) { return String(n); } };
    var done = recapDone_(), keys = [];
    for (var k in done) if (Object.prototype.hasOwnProperty.call(done, k)) keys.push(k);
    out.n = keys.length;
    if (!keys.length) {
      var q0 = [];
      try { q0 = recapQueue_(); } catch (eQ0) { q0 = []; }
      out.queued = q0.length;
      out.line = 'مرورِ بزرگ: هنوز برای هیچ مجموعه‌ای ساخته نشده' +
                 (q0.length ? '؛ ' + fa(q0.length) + ' مجموعه در صف است («' +
                              String(q0[0].name || q0[0].key) + '» بعدی است)' : '') + '.';
      return out;
    }
    var raw = props_().getProperty(PK.RECAP_LOG);
    var L = raw ? JSON.parse(raw) : [];
    var last = (L instanceof Array && L.length) ? L[0] : null;
    /* صف هم باید در همان سطر باشد: چیزی که فقط در Properties بماند دیده
       نمی‌شود، و صاحبِ برنامه شیت باز نمی‌کند (قاعدهٔ ۵٫۹۰). */
    var q = [];
    try { q = recapQueue_(); } catch (eQ) { q = []; }
    out.queued = q.length;
    out.line = 'مرورِ بزرگ: برای ' + fa(keys.length) + ' مجموعه ساخته شده' +
               (last ? ' — آخری «' + last.series + '»، قسمت ' + fa(last.ep) +
                       ' با ' + fa(last.secs) + ' بخش' : '') +
               (q.length ? '؛ ' + fa(q.length) + ' مجموعه در صف («' +
                           String(q[0].name || q[0].key) + '» بعدی است)' : '') + '.';
  } catch (e) {}
  return out;
}
