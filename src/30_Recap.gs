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
function recapMarkDone_(seriesKey, epNum, parts, chapters, chaptersAll, missed, scope) {
  try {
    var o = recapDone_();
    var sc = scope || {};
    o[String(seriesKey)] = { at: nowStr_(), ep: Number(epNum) || 0,
                             parts: Number(parts) || 0, ch: Number(chapters) || 0,
                             chAll: Number(chaptersAll) || Number(chapters) || 0,
                             miss: (missed || []).slice(0, 4),
                             /* ══ دامنه هم بخشی از «تا کجا» است (۶٫۳۹) ══
                                مروری که فقط درس‌های ۳ و ۵ را گفته، «تا درسِ ۱۹»
                                نیست. بدونِ این کلید، تخته فردا همان ادعای غلطی
                                را می‌کرد که ۶٫۳۳ برای پوششِ فصل‌ها رفعش کرد. */
                             mode: String(sc.mode || 'all'),
                             eps: (sc.eps || []).slice(0, 60),
                             upto: Number(sc.upto) || 0 };
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
/**
 * نامِ مجموعه ← **درس‌های تولیدشده‌اش**: `[{n, title}]`، مرتب و بی‌تکرار.
 *
 * ══ چرا شماره و عنوان، نه فقط یک شمارش (۶٫۳۹ → ۶٫۴۰) ══
 * تا ۶٫۳۸ فقط «چند تا» لازم بود، چون مرور همیشه کلِ مجموعه را می‌گرفت.
 * از ۶٫۳۹ می‌شود گفت «فقط این درس‌ها»، و آنجا اول فقط شماره برمی‌گشت و
 * آدم باید شماره‌ها را **تایپ** می‌کرد. صاحبِ برنامه بلافاصله گفت: «چرا
 * تایپ کنم؟ مگه نمی‌شه درس‌ها رو تیک بزنم؟» — و راست می‌گفت: شمارهٔ درس
 * چیزی نیست که آدم از حفظ بداند، و تایپ‌کردنش یعنی ابزار از او می‌خواهد
 * چیزی را به یاد بیاورد که خودش می‌داند.
 * عنوان از همان ستونِ همان خواندن می‌آید (`XC.TITLE` داخلِ بازهٔ خوانده‌شده
 * است)، پس تیک‌زدن هیچ رفت‌وبرگشتِ تازه‌ای به شیت اضافه نمی‌کند.
 */
function recapEpsMap_(hub) {
  var map = Object.create(null);
  try {
    var sh = hub.getSheetByName(CFG.SPECIAL_TAB);
    if (!sh || sh.getLastRow() < 2) return map;
    var v = sh.getRange(2, XC.NUM, sh.getLastRow() - 1, XC.PARTS).getValues();
    var seen = Object.create(null);
    for (var i = 0; i < v.length; i++) {
      var nm = String(v[i][XC.SERIES - 1] || '').trim();
      if (!nm) continue;
      var cov = String(v[i][XC.PARTS - 1] || '');
      if (cov.indexOf(RECAP_ROW_MARK) !== -1) continue;   // ردیفِ خودِ مرور
      var no = Number(v[i][XC.NUM - 1]) || 0;
      if (no <= 0) continue;
      // یک درس، یک ردیف — ولی تکرار اگر پیش بیاید، دو تیکِ هم‌شماره می‌سازد
      // و آدم نمی‌فهمد کدام‌یک را زده.
      var sig = nm + '\u0000' + no;
      if (seen[sig]) continue;
      seen[sig] = 1;
      if (!map[nm]) map[nm] = [];
      map[nm].push({ n: no, title: String(v[i][XC.TITLE - 1] || '') });
    }
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) {
      map[k].sort(function (a, b) { return a.n - b.n; });
    }
  } catch (e) {}
  return map;
}

/**
 * همان نگاشت، شمرده. `epsMap` را بگیر تا تب دو بار خوانده نشود — قاعدهٔ
 * «یک خواندن برای ۲۶۴ مجموعه» با دو خواندنِ کل هم نقض می‌شود.
 */
function recapPartsMap_(hub, epsMap) {
  var map = Object.create(null);
  var m = epsMap || recapEpsMap_(hub);
  for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) map[k] = m[k].length;
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
/* ═══════════════════════════════════════════════════════════════════
 * دامنهٔ مرور — سه انتخاب، نه یک رفتارِ ثابت (۶٫۳۹)
 * ═══════════════════════════════════════════════════════════════════
 *
 * ══ گزارشِ صاحبِ برنامه ══
 * «دیشب یه بار مرور انجام شد روی چند درس. یکی دو تا درسم بعدش اضافه شد.
 *  الان می‌خوام مرور بزنم و می‌خوام خودم انتخاب کنم روی کدوم درس‌ها باشه:
 *  یا همهٔ درس‌ها دوباره از ابتدا، یا صرفاً درس‌های انتخاب‌شده، یا صرفاً
 *  درس‌های بعد از آخرین مرور. ولی این نمی‌فهمم چی می‌گه، خیلی گیج‌کننده‌ست.»
 *
 * حق داشت. تا ۶٫۳۸ فقط **یک** رفتار وجود داشت — «کلِ جزوه» — و تیکِ تخته
 * فقط می‌گفت «برای این مجموعه بساز». سه خواسته‌ای که او دارد، سه چیزِ
 * متفاوت‌اند و هیچ‌کدام قابلِ بیان نبودند.
 *
 * هر فصل و هر بخشِ جزوه `addedIn` دارد: شمارهٔ درسی که آن را ساخته. پس
 * دامنه یک صافیِ ساده روی همان است — نه سازوکارِ تازه‌ای، فقط اجازهٔ گفتنِ
 * چیزی که داده‌اش از اول بود.
 */
var RECAP_MODES = {
  all:  'همهٔ درس‌ها از ابتدا',
  since: 'فقط درس‌های پس از آخرین مرور',
  pick: 'فقط درس‌هایی که انتخاب می‌کنم'
};

/** «۳، ۵، ۷-۹» → [3,5,7,8,9]. رقمِ فارسی هم می‌فهمد. */
function recapParseEps_(text) {
  var out = [], seen = Object.create(null);
  // تخته از ۶٫۴۰ آرایهٔ عدد می‌فرستد (تیک)، نه رشته (تایپ). هر دو باید
  // بخورد: مسیرِ دوم هنوز از منو و از آزمون‌ها استفاده می‌شود.
  if (text instanceof Array) text = text.join(',');
  /* «۲ تا ۴» با فاصله نوشته می‌شود — آدم همان‌طور می‌نویسد که حرف می‌زند.
     پس بازه پیش از تکه‌کردن یک‌دست می‌شود، وگرنه split آن را سه تکه می‌کرد
     و «تا» بی‌صدا دور می‌ریخت: بازه به دو عدد فرو می‌ریخت و وسطش گم می‌شد. */
  var t = faDigits_(String(text || '')).replace(/[،؛]/g, ',')
            .replace(/(\d)\s*(?:تا|الی|-|–|—)\s*(\d)/g, '$1-$2');
  var parts = t.split(/[,\s]+/);
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (!p) continue;
    var m = p.match(/^(\d{1,4})-(\d{1,4})$/);
    if (m) {
      var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (a > b) { var tmp = a; a = b; b = tmp; }
      for (var k = a; k <= b && k - a < 500; k++) if (!seen[k]) { seen[k] = 1; out.push(k); }
      continue;
    }
    var n = parseInt(p, 10);
    if (isFinite(n) && n > 0 && !seen[n]) { seen[n] = 1; out.push(n); }
  }
  out.sort(function (x, y) { return x - y; });
  return out;
}

/**
 * شماره‌های خواسته‌شده را به شماره‌هایی که *واقعاً درس دارند* محدود می‌کند.
 *
 * آدم «۳ تا ۹» می‌نویسد و مجموعه فقط ۳ و ۵ و ۷ را دارد. اگر ۴ و ۶ و ۸ هم
 * بروند جلو، چیزی خراب نمی‌شود — ولی پیامِ «۷ درس انتخاب شد» دروغ است و
 * فردا کسی نمی‌فهمد چرا مرور کوتاه‌تر از انتظار درآمد.
 * وقتی فهرستِ موجود در دست نیست (تبِ خوانده‌نشده)، چیزی حذف نمی‌شود:
 * «نمی‌دانم» نباید «نیست» گزارش شود.
 */
function recapEpsClean_(eps, available) {
  var want = (eps instanceof Array) ? eps : recapParseEps_(eps);
  var out = [], seen = Object.create(null);
  var have = null;
  if (available instanceof Array && available.length) {
    have = Object.create(null);
    for (var a = 0; a < available.length; a++) have[Number(available[a])] = 1;
  }
  for (var i = 0; i < want.length; i++) {
    var n = Number(want[i]) || 0;
    if (n <= 0 || seen[n]) continue;
    if (have && !have[n]) continue;
    seen[n] = 1; out.push(n);
  }
  out.sort(function (x, y) { return x - y; });
  return out;
}

/**
 * جزوه را به دامنهٔ خواسته‌شده می‌بُرد.
 *
 * برمی‌گرداند `{ book, label, eps, n }` — و `n` شمارِ فصل‌هایی است که ماند.
 * صفر یعنی دامنه خالی است و مرور ساخته نمی‌شود: مرورِ هیچ، یک قسمتِ خالی
 * است و بدتر از نساختنش.
 *
 * **بریدن هرگز داده را خراب نمی‌کند**: کتابِ اصلی دست‌نخورده می‌مانَد و
 * این تابع یک نسخهٔ تازه می‌سازد. جزوه حافظهٔ مجموعه است، نه ورودیِ یک‌بارمصرف.
 */
function recapScopeBook_(book, mode, opt) {
  opt = opt || {};
  var chs = (book && book.chapters) || [];
  var out = { book: book, label: RECAP_MODES.all, eps: [], n: chs.length,
              mode: 'all', upto: recapUpto_(chs) };
  if (!chs.length) { out.n = 0; return out; }

  var wanted = null;                       // null یعنی «همه»
  if (mode === 'pick') {
    wanted = {};
    var eps = (opt.eps || []).slice();
    for (var i = 0; i < eps.length; i++) wanted[Number(eps[i])] = 1;
    out.eps = eps;
    out.mode = 'pick';
    out.label = 'فقط درس‌های ' + eps.map(function (x) { return faDigitsOut_(String(x)); }).join('، ');
    if (!eps.length) { out.n = 0; return out; }
  } else if (mode === 'since') {
    var after = Number(opt.after) || 0;
    out.mode = 'since';
    out.label = after ? ('فقط درس‌های پس از درسِ ' + faDigitsOut_(String(after)))
                      : RECAP_MODES.all;
    if (after > 0) {
      wanted = function (n) { return n > after; };
    }
  }
  if (wanted === null) return out;

  var keep = function (n) {
    var v = Number(n) || 0;
    /* فصلی که `addedIn` ندارد (جزوهٔ قدیمی) در دامنهٔ «پس از» می‌مانَد و در
       دامنهٔ «انتخابی» نمی‌مانَد. در هر دو، جهتِ خطا به‌سمتِ *نگفتن* نیست:
       آنجا که نمی‌دانیم، در «همه» می‌ماند و در «انتخابِ صریح» نمی‌آید. */
    if (!v) return typeof wanted === 'function';
    return (typeof wanted === 'function') ? wanted(v) : !!wanted[v];
  };

  var kept = [];
  for (var c = 0; c < chs.length; c++) {
    var ch = chs[c], secs = ch.sections || [], ks = [];
    for (var t2 = 0; t2 < secs.length; t2++) if (keep(secs[t2].addedIn)) ks.push(secs[t2]);
    // فصلی که خودش در دامنه است ولی هیچ بخشش نمانده، باز هم می‌آید (عنوانش
    // بی‌بخش بی‌معناست، پس بخش‌هایش را نگه می‌داریم).
    if (!ks.length && keep(ch.addedIn)) ks = secs.slice();
    if (!ks.length) continue;
    kept.push({ id: ch.id, title: ch.title, intro: ch.intro,
                addedIn: ch.addedIn, sections: ks });
  }
  out.book = { seriesKey: book.seriesKey, seriesName: book.seriesName,
               chapters: kept, refs: book.refs || [], episodes: book.episodes || [] };
  out.n = kept.length;
  out.upto = recapUpto_(kept);
  return out;
}

/** بالاترین شماره‌درسی که در این فصل‌ها هست — «تا کجا» را همین می‌گوید. */
function recapUpto_(chapters) {
  var top = 0;
  var chs = chapters || [];
  for (var c = 0; c < chs.length; c++) {
    var v = Number(chs[c].addedIn) || 0;
    if (v > top) top = v;
    var secs = chs[c].sections || [];
    for (var s = 0; s < secs.length; s++) {
      var w = Number(secs[s].addedIn) || 0;
      if (w > top) top = w;
    }
  }
  return top;
}

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

/** سیاههٔ عنوانِ فصل‌ها برای پرامپت — «همه» یک صفت است، سیاهه یک سنجه. */
function recapChecklist_(book) {
  var chs = (book && book.chapters) || [];
  if (!chs.length) return '';
  var L = ['۶) **این فهرست را تیک بزن.** هر عنوانِ زیر باید دستِ‌کم یک بار',
           '   به‌روشنی در متن گفته شود — با همان واژه‌ها، تا شنونده بداند',
           '   دربارهٔ کدام درس حرف می‌زنی. اگر فصلی کوچک است، یک جمله بس است؛',
           '   ولی هیچ‌کدام نباید غایب باشد:'];
  for (var i = 0; i < chs.length; i++) {
    L.push('   ' + (i + 1) + '. ' + String((chs[i] && chs[i].title) || ''));
  }
  return L.join('\n');
}

/**
 * ══ دامنه باید در خودِ پرامپت گفته شود (۶٫۳۹) ══
 * بریدنِ کتاب کافی نیست: مدلی که فقط چهار فصل می‌بیند ولی به آن گفته‌ایم
 * «همهٔ چیزهایی که تا حالا گفتیم»، در قلاب و جمع‌بندی ادعای مرورِ کامل
 * می‌کند — و شنونده می‌شنود «هرچه گفتیم» در حالی که سه‌چهارمش نیامده.
 * همان قاعدهٔ ۶٫۳۳: ادعا و اندازه باید یکی باشند.
 */
function recapPrompt_(book, seriesName, capChars, scope) {
  var sc = scope || {};
  var partial = sc.mode && sc.mode !== 'all';
  var scopeLines = partial
    ? ['⚠ **این مرور فقط بخشی از مجموعه است: ' + String(sc.label || '') + '.**',
       '   جزوه‌ای که پایین آمده، همین بخش است و بس. پس:',
       '   • در قلاب و جمع‌بندی **نگو** «همهٔ چیزهایی که تا حالا گفتیم»؛ بگو',
       '     این مرور روی همین درس‌هاست.',
       '   • به درسی که پایین نیامده اشاره نکن، حتی گذرا.',
       '']
    : [];
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
    ''
  ].concat(scopeLines).concat([
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
    partial
      ? '۵) در hook بگو این قسمت چیست — یک مرور روی همین درس‌ها («' +
        String(sc.label || '') + '»)، این‌بار خیلی ساده — و در outro جمع‌بندی کن.'
      : '۵) در hook بگو این قسمت چیست («یه مرورِ بزرگ از همهٔ چیزهایی که تا حالا\n' +
        '   گفتیم، این‌بار خیلی ساده») و در outro جمع‌بندی کن.',
    '',
    /* ══ سیاههٔ فصل‌ها، در انتها و صریح (۶٫۳۳) ══
       بندِ ۱ از اول می‌گفت «همهٔ مفاهیمِ مهم را پوشش بده» — و مدل در قسمت ۱۹
       سه فصل را نگفت، از جمله هر دو فصلی که تازه اضافه شده بودند. «همه» یک
       صفت است؛ سیاههٔ نام‌دار یک سنجه. و چون کد پس از نوشتن همین سیاهه را
       مکانیکی می‌سنجد، این دیگر خواهشِ بی‌پیگیری نیست. */
    recapChecklist_(book),
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
  ]);
  return L.join('\n');
}

/**
 * ساختِ متنِ مرور. برمی‌گرداند ep یا null.
 * سقف همان سقفِ «یک فایل» است — بی رزروِ غنی‌سازی و عصری‌سازی، چون هیچ‌کدام
 * روی این قسمت اجرا نمی‌شوند و رزروِ بی‌مصرف یعنی مرورِ بی‌دلیل کوتاه‌تر.
 */
function recapWrite_(book, seriesName, scope) {
  var cap = 0;
  try { cap = specialFileCap_(); } catch (e) { cap = 9000; }
  var r = null;
  try { r = geminiText_(recapPrompt_(book, seriesName, cap, scope), RECAP_SCHEMA, 60000); }
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

/* ═══════════════════════════════════════════════════════════════════
 * پوششِ واقعی — نه پوششِ ادعایی (۶٫۳۳)
 * ═══════════════════════════════════════════════════════════════════
 *
 * ══ گزارشِ ناظر، ۲۷ اوت ══
 * «متنِ کاملِ مرور را خواندم و با فهرستِ ۱۵ فصلِ جزوه سنجیدم: ۱۱ بخشِ مرور
 * روی ۱۲ فصل می‌نشیند و دقیقاً همان دو فصلی که ساعاتی پیش از مرور به جزوه
 * اضافه شده بودند در آن نیامده‌اند. با این‌همه، فیلدِ ثبت‌شده می‌گوید هر ۱۵
 * فصل پوشش دارد.»
 *
 * درست بود. `recapMarkDone_` و متای قسمت هر دو `book.chapters.length` را
 * ثبت می‌کردند — یعنی **چند فصل در دست بود**، نه **چند فصل گفته شد**. و
 * ۶٫۳۰ همان عدد را به ستونِ تخته هم برد، پس ادعای اشتباه یک نمایشگرِ تازه
 * هم گرفت.
 *
 * ── چرا ردیابیِ واژه‌ای، و نه پرسیدن از مدل ──
 * مدلی که خودش نوشته و خودش بگوید «همه را پوشش دادم»، جوابِ خودش را تأیید
 * می‌کند — همان شکلی که سه نسخه پیاپی باگِ نشانهٔ گفتار را «رفع‌شده» اعلام
 * کرد. پس سنجه مکانیکی است و **عمداً محافظه‌کار**: فصلی «نیامده» شمرده
 * می‌شود فقط وقتی *هیچ‌کدام* از واژه‌های شاخصش هیچ‌جای متنِ مرور نباشد.
 * یعنی این عدد کفِ پوشش است، نه اندازهٔ دقیقش — و هشداری که فقط با شهادتِ
 * قاطع بلند شود، هشداری است که خوانده می‌شود.
 */
function recapTerms_(ch) {
  var out = [], seen = Object.create(null);
  var stop = { 'است': 1, 'های': 1, 'برای': 1, 'یعنی': 1, 'چیست': 1, 'چگونه': 1,
               'کدام': 1, 'همان': 1, 'اینکه': 1, 'درباره': 1, 'دربارهٔ': 1 };
  var push = function (t) {
    var raw = String(t || '');
    try { raw = txNorm(stripTashkil_(raw)); } catch (e) { raw = raw.toLowerCase(); }
    var parts = raw.replace(/[^\u0621-\u06FFa-z0-9]+/g, ' ').split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i];
      if (w.length < 4 || stop[w] || seen[w]) continue;
      seen[w] = 1; out.push(w);
    }
  };
  push(ch && ch.title);
  var S = (ch && ch.sections) || [];
  for (var j = 0; j < S.length; j++) push(S[j] && S[j].title);
  return out;
}

/** متنِ کاملِ مرور، یک‌دست‌شده — همان پوسته‌ای که واژه‌ها با آن سنجیده می‌شوند. */
function recapFlat_(ep) {
  var L = [String((ep && ep.hook) || ''), String((ep && ep.outro) || ''),
           String((ep && ep.summary) || '')];
  var S = (ep && ep.sections) || [];
  for (var i = 0; i < S.length; i++) {
    L.push(String((S[i] && S[i].heading) || ''));
    L.push(String((S[i] && S[i].narration) || ''));
  }
  var t = L.join(' ');
  try { t = txNorm(stripTashkil_(t)); } catch (e) { t = t.toLowerCase(); }
  return t.replace(/[^\u0621-\u06FFa-z0-9]+/g, ' ');
}

/**
 * کدام فصل‌های جزوه ردی در متنِ مرور دارند؟
 * برمی‌گرداند: { n, total, pct, missed:[عنوان‌ها] }
 */
function recapCoverage_(ep, book) {
  var out = { n: 0, total: 0, pct: 100, missed: [] };
  try {
    var chs = (book && book.chapters) || [];
    out.total = chs.length;
    if (!out.total) return out;
    var flat = recapFlat_(ep);
    for (var i = 0; i < chs.length; i++) {
      var terms = recapTerms_(chs[i]);
      // فصلی که هیچ واژهٔ شاخصی ندارد، قابلِ داوری نیست — پس پوشش‌داده
      // حساب می‌شود. «نمی‌دانم» را نباید «نشده» گزارش کرد.
      if (!terms.length) { out.n++; continue; }
      var hit = false;
      for (var k = 0; k < terms.length && !hit; k++) {
        if (flat.indexOf(terms[k]) !== -1) hit = true;
      }
      if (hit) out.n++;
      else out.missed.push(String((chs[i] && chs[i].title) || ('فصل ' + (i + 1))));
    }
    out.pct = out.total ? Math.round(out.n * 100 / out.total) : 100;
  } catch (e) {}
  return out;
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
 * @param {{key:string, force:boolean, mode:string, eps:Array}=} opt
 *   key: مجموعهٔ مشخص · force: حتی اگر قبلاً ساخته شده ·
 *   mode: `all` | `since` | `pick` · eps: شماره‌درس‌ها (فقط در `pick`)
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
  /* پروندهٔ مرورِ قبلی **پیش از** بازکردنِ قفل خوانده می‌شود: دامنهٔ «پس از
     آخرین مرور» دقیقاً از همین می‌آید، و `recapReopen_` پاکش می‌کند. اگر
     ترتیب برعکس بود، `since` همیشه به «همه» فرو می‌افتاد — بی هیچ خطایی و
     دقیقاً در جایی که آدم صریحاً چیزِ دیگری خواسته. */
  var prevDone = recapDone_()[String(opt.key || '')] || null;
  if (opt.key && opt.force) recapReopen_(opt.key);
  /* نامزدها به ترتیب امتحان می‌شوند، نه فقط اولی: مجموعه‌ای که جزوه ندارد
     نباید صف را برای بقیه ببندد. */
  var cands = recapCandidates_(hub, reg, opt.key || '');
  if (!cands.length) return { ok: false, reason: 'none' };
  var pick = null, folderOf = null, book = null, noBook = [];
  for (var ci = 0; ci < cands.length; ci++) {
    var c = cands[ci], fo = null;
    try { fo = seriesFolder_(reg, c.rec); } catch (eF) { continue; }
    var bk = null;
    try { bk = handoutRead_(fo, { seriesKey: c.rec.key, seriesName: c.name }); }
    catch (eB) { bk = null; }
    var n = (bk && bk.chapters) ? bk.chapters.length : 0;
    if (!n) { noBook.push(c.name); continue; }
    pick = c; folderOf = fo; book = bk;
    break;
  }
  if (noBook.length) {
    /* جزوه هنوز ساخته نشده. این *خودش* یک ایراد است و نه سکوت: جزوه هر شب
       ساخته می‌شود و مجموعه‌ای با هشت درسِ تولیدشده باید کتاب داشته باشد. */
    logLine_('مرورِ بزرگ: این مجموعه‌ها جزوه ندارند و رد شدند — ' + noBook.join('، ') + '.');
  }
  if (!pick) return { ok: false, reason: 'no-handout', series: noBook.join('، ') };

  /* ── دامنه ──────────────────────────────────────────────────────────
     «پس از آخرین مرور» یعنی درس‌هایی که شماره‌شان از شمارهٔ قسمتِ آن مرور
     بالاتر است. شماره‌ها سراسری و صعودی‌اند، پس این یک مقایسهٔ ساده است و
     نه سازوکارِ تازه. اگر مرورِ قبلی‌ای نبوده، `after` صفر می‌شود و دامنه
     خودبه‌خود «همه» — که همان چیزِ درست است، نه یک خطا. */
  var after = prevDone ? (Number(prevDone.upto) || Number(prevDone.ep) || 0) : 0;
  var scope = recapScopeBook_(book, String(opt.mode || 'all'),
                              { eps: opt.eps || [], after: after });
  if (!scope.n) {
    logLine_('مرورِ «' + pick.name + '» ساخته نشد: دامنهٔ خواسته‌شده (' +
             scope.label + ') هیچ درسی از جزوه را در بر نگرفت.');
    return { ok: false, reason: 'scope-empty', series: pick.name, scope: scope.label };
  }
  var bookAll = book;
  book = scope.book;

  var ep = recapWrite_(book, pick.name, scope);
  if (!ep) return { ok: false, reason: 'write', series: pick.name };
  try {
    var cut = specialCondense_(ep, specialFileCap_(), 0);
    if (cut && cut.ep) ep = cut.ep;
  } catch (eC) {}

  /* پوشش پس از فشرده‌سازی سنجیده می‌شود، نه پیش از آن: چیزی که بریده شده
     دیگر گفته نمی‌شود، و پوششی که متنِ بریده‌نشده را بسنجد باز هم ادعاست. */
  var cov = recapCoverage_(ep, book);
  if (cov.missed.length) {
    logLine_('مرورِ «' + pick.name + '»: ' + cov.n + ' مبحث از ' + cov.total +
             ' ردی در متن دارند؛ بی‌رد: ' + cov.missed.slice(0, 4).join('، ') + '.');
  }

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
    /* ══ «چند فصل گفته شد»، نه «چند فصل در دست بود» (۶٫۳۳) ══
       تا ۶٫۳۲ اینجا `nCh` می‌نشست — شمارِ کلِ فصل‌های جزوه. ناظر متنِ قسمت
       ۱۹ را خواند و دید ۱۲ فصل از ۱۵ پوشش دارد، در حالی که پرونده ۱۵
       ادعا می‌کرد. عددی که ادعا باشد نه اندازه‌گیری، در ایمیل و تخته و
       گزارشِ ناظر سه بار تکرار می‌شود و هر سه بار غلط است. */
    recap: true, recapChapters: cov.n, recapChaptersAll: cov.total,
    recapMissed: cov.missed.slice(0, 6), recapParts: pick.made,
    /* دامنه در خودِ پروندهٔ قسمت هم می‌ماند: ایمیل، تخته و ناظر همه از
       همین می‌خوانند، و سه کپیِ جدا یعنی روزی یکی کهنه می‌شود. */
    recapMode: scope.mode, recapScope: scope.label,
    recapEps: (scope.eps || []).slice(0, 60), recapUpto: scope.upto || 0,
    recapChaptersBook: (bookAll.chapters || []).length
  };
  writeSpecialJson_(folder, meta);

  var sp = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
  var tags = [];
  try { tags = specialTags_(ep, pick.name, 0, epNum); } catch (eT) { tags = []; }
  sp.appendRow([epNum, nowStr_(), pick.name, String(ep.title || ''),
                RECAP_ROW_MARK + ' (' + pick.made + ' قسمت)',
                'مرورِ درس‌های پیشین — ' + cov.n + ' مبحث از ' + cov.total +
                (scope.mode === 'all' ? '' : ' — دامنه: ' + scope.label),
                '—', '', '', 'در حال ساخت صدا', '', tags.join(' '),
                '', 'خیر — این قسمت مرور است، نه درسِ تازه', '']);

  props_().setProperty(PK.SP_PENDING, JSON.stringify({
    epNum: epNum, folderId: folder.getId(), row: sp.getLastRow(),
    chunkIdx: 0, partNo: 1, files: [], phase: 'speak'
  }));
  recapMarkDone_(pick.rec.key, epNum, pick.made, cov.n, cov.total, cov.missed,
                 { mode: scope.mode, eps: scope.eps,
                   upto: scope.upto || (prevDone ? Number(prevDone.upto) || 0 : 0) });
  recapLog_(pick.name, epNum, ep.sections.length, cov.n);
  scheduleSpecialContinue_(45 * 1000);
  logLine_('مرورِ بزرگِ «' + pick.name + '» نوشته شد (قسمت ' + epNum + '، ' +
           ep.sections.length + ' بخش، ' + cov.n + ' مبحث از ' + cov.total +
           '، دامنه: ' + scope.label + ')؛ صداگذاری در اجرای بعد.');
  return { ok: true, episode: epNum, series: pick.name, title: ep.title,
           sections: ep.sections.length, pending: true,
           mode: scope.mode, scope: scope.label };
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
function recapQueueSet_(keys, hub, scopes) {
  var map = {};
  try { map = recapBoardMap_(hub || getHub_()); } catch (e) { map = {}; }
  var sc = scopes || {};
  var out = [], seen = Object.create(null), skipped = [];
  for (var i = 0; i < (keys || []).length; i++) {
    var k = String(keys[i] || '').trim();
    if (!k || seen[k]) continue;
    seen[k] = true;
    var m = map[k];
    if (!m || !m.made) { skipped.push(k); continue; }
    /* دامنه روی خودِ سفارش می‌نشیند، نه در یک کلیدِ کنارِ صف. سفارشی که
       فردا شب اجرا می‌شود باید همان چیزی را بسازد که امشب خواسته شده —
       و «انتخابِ کاربر جای دیگری ذخیره شود» همان شکلی است که یک بار
       ترتیبِ صف را از خودِ صف جدا کرد. */
    var one = sc[k] || {};
    var mode = String(one.mode || 'all');
    if (mode !== 'since' && mode !== 'pick') mode = 'all';
    var eps = (mode === 'pick') ? recapEpsClean_(one.eps, m.eps) : [];
    // «انتخابی» بدون هیچ شماره‌ای، سفارشِ هیچ است — و مرورِ هیچ یک قسمتِ
    // خالی. به‌جای ساختنِ آن، همان‌جا کنار گذاشته می‌شود با علتِ روشن.
    if (mode === 'pick' && !eps.length) { skipped.push(k); continue; }
    out.push({ key: k, name: m.name, made: m.made, mode: mode, eps: eps,
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
  try {
    r = runRecapEpisode({ key: head.key, force: true,
                          mode: head.mode || 'all', eps: head.eps || [] });
  }
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
    var epsAll = recapEpsMap_(hub);
    var made = recapPartsMap_(hub, epsAll);   // همان یک خواندن
    var done = recapDone_();
    var q = recapQueue_(), qs = Object.create(null);
    for (var j = 0; j < q.length; j++) qs[String(q[j].key)] = j + 1;
    var min = Number(CFG.RECAP_MIN_PARTS) || 8;
    for (var i = 0; i < (reg.rows || []).length; i++) {
      var rec = reg.rows[i];
      var key = String(rec.key || '');
      var name = String(rec.vals[SC.NAME - 1] || key);
      var m = Number(made[name]) || 0;
      var lessons = epsAll[name] || [];
      var eps = [];
      for (var e0 = 0; e0 < lessons.length; e0++) eps.push(lessons[e0].n);
      var d = done[key] || null;
      var covered = d ? (Number(d.parts) || 0) : 0;
      var chOk = d ? (Number(d.ch) || 0) : 0;
      var chAll = d ? (Number(d.chAll) || chOk) : 0;
      var mode = d ? String(d.mode || '') : '';
      var upto = d ? (Number(d.upto) || 0) : 0;
      /* ══ «نمی‌دانم» را «صفر» گزارش نکن (۶٫۳۹) ══
       * پرونده‌های پیش از ۶٫۳۰ فیلدِ `parts` ندارند. تخته `covered` را صفر
       * می‌گرفت و بعد `behind = made − 0` حساب می‌کرد، پس برای مجموعه‌ای
       * که همین دیشب مرور گرفته بود می‌نوشت «تا درسِ ۰ · ۱۹ درسِ تازه پس
       * از آن». عددی که ساختگی است، بدتر از نبودنِ عدد است — چون خوانده
       * می‌شود و باور می‌شود. */
      var unknown = !!d && !covered && !upto;
      var behind = 0;
      if (d && !unknown) {
        // با شمارهٔ درس دقیق است؛ بدونِ آن، تفاضلِ شمارش تقریبِ قدیمی.
        if (upto) {
          for (var e2 = 0; e2 < eps.length; e2++) if (eps[e2] > upto) behind++;
        } else if (mode !== 'pick') {
          behind = Math.max(0, m - covered);
        }
      }
      out[key] = {
        name: name, made: m, eps: eps, lessons: lessons, done: d, covered: covered,
        chOk: chOk, chAll: chAll, mode: mode, upto: upto, unknown: unknown,
        chGap: Math.max(0, chAll - chOk),
        behind: behind,
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
    if (r.scope) L.push('• دامنه: ' + r.scope);
    L.push('');
    L.push('صداگذاری در اجرای بعد شروع می‌شود؛ متن مثلِ هر قسمتِ دیگر ' +
           'اعراب‌گذاری و بازبینی می‌شود و شبانه به یوتیوب می‌رود.');
  } else {
    var why = {
      off: 'قابلیت خاموش است (RECAP_ENABLED).',
      busy: 'درس‌نامهٔ دیگری در حالِ صداگذاری است؛ بعد از تمام‌شدنش دوباره بزنید.',
      none: 'هیچ مجموعه‌ای هنوز به کفِ ' + faDigitsOut_(String(CFG.RECAP_MIN_PARTS || 8)) +
            ' قسمتِ تولیدشده نرسیده.',
      'no-handout': 'متنِ جمع‌شدهٔ درس‌های آن مجموعه هنوز آماده نیست؛ هر شب ' +
                    'خودش ساخته می‌شود، فردا دوباره امتحان کنید.',
      write: 'مدل متنی برنگرداند.',
      'scope-empty': 'درس‌هایی که انتخاب شده‌اند هیچ متنی برای مرور ندارند' +
                     (r.scope ? ' (' + r.scope + ')' : '') + '.',
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
