/**
 * 19_Enrich.gs — دستِ‌به‌دستِ غنی‌سازی با Cowork، پیش از صداگذاری
 *
 * ══ مسئله ══
 *
 * محتوایی که از ویدیو و عکس و صدا و سندِ آرشیو بیرون می‌آید، خودش سرمایهٔ اصلی
 * است — ولی گاهی یک نکته‌اش نیمه‌تمام است، گاهی یک مفهوم بی‌مثال مانده، گاهی
 * حرفی زده شده که امروز تأیید یا تکمیل یا حتی تصحیح شده است. آن چیزها در
 * آرشیو نیستند؛ در اینترنت‌اند.
 *
 * ══ راه‌حل: یک دستِ‌به‌دستِ فایلی ══
 *
 * موتور نمی‌تواند در وب جست‌وجو کند، و Cowork نمی‌تواند در دلِ اجرای موتور
 * بنشیند. پس بین این دو یک قرارِ فایلی گذاشته‌ایم، در همان پوشهٔ OUTPUT:
 *
 *   ۱) موتور متنِ قسمت را می‌نویسد و پیش از صداگذاری متوقف می‌شود؛ یک پروندهٔ
 *      درخواست می‌گذارد: «_ENRICH-REQ-<برنامه>-<شماره>.json» — با متنِ همهٔ
 *      بخش‌ها، فهرستِ منابعِ اصلی، سهمیهٔ مجاز و مهلت.
 *   ۲) Cowork در پنجرهٔ زمانیِ خودش آن را برمی‌دارد، در وب و شبکه‌های اجتماعی
 *      عمیق جست‌وجو می‌کند و پاسخ را می‌گذارد: «_ENRICH-<برنامه>-<شماره>.json».
 *   ۳) موتور در اجرای بعدی پاسخ را می‌بیند، در متن ادغام می‌کند، و بعد
 *      صداگذاری می‌کند.
 *
 * ══ سه قاعدهٔ سختِ این ادغام ══
 *
 *   • محتوای اصلی باید غالب بماند. سهمیه‌ها سختگیرانه‌اند و هر چه از سهمیه
 *     بگذرد بریده می‌شود و در سیاهه می‌آید — نه اینکه بی‌صدا حجم قسمت دو برابر
 *     شود و حرفِ آرشیو زیرِ حرفِ اینترنت گم شود.
 *   • هر افزودهٔ بیرونی باید در خودِ گفتار اعلام شود: شنونده باید بشنود که این
 *     تکه از آرشیو نیست. اگر Cowork خودش این اعلام را نگذاشته باشد، موتور
 *     می‌گذاردش. این شرط قابلِ چشم‌پوشی نیست.
 *   • هر منبع با عنوانِ کامل و لینکِ دقیق ثبت می‌شود — در تبِ «_منابع بیرونی»،
 *     در فایلِ پیوستِ قسمت و در ایمیل. بی خلاصه‌کاری، بی کوتاه‌کردنِ لینک.
 *
 * ══ و اگر Cowork نرسید ══
 *
 * پادکست هیچ روزی از دست نمی‌رود. پس از پایانِ مهلت (پیش‌فرض ۹۰ دقیقه) قسمت
 * با همان محتوای اصلی ساخته می‌شود و در ایمیل و تلگرام صریح نوشته می‌شود که
 * غنی‌سازی انجام نشد و دلیلش چه بود.
 */

// ------------------------------------------------------------ نام‌ها و جاها

var ENRICH_SHOW_VARIETY = 'variety';
var ENRICH_SHOW_SPECIAL = 'special';

/**
 * تنها فهرستِ برنامه‌های شناخته‌شدهٔ موتور.
 *
 * دروازهٔ تقویم به این نیاز ندارد — کلیدِ ناشناخته ردیفِ خودش را می‌سازد و
 * پادکستِ بعدی بی هیچ تغییری در کد کار می‌کند. این فهرست فقط برای دو کارِ
 * «پیش‌دستانه» است: نامِ نمایشی، و بذرِ ردیف‌های تقویم پیش از آنکه برنامه
 * حتی یک‌بار اجرا شده باشد. پیشتر این دانش داخلِ یک if/else بود، پس اضافه‌کردنِ
 * پادکستِ سوم یعنی گشتن دنبالِ همهٔ if/elseها. حالا یک جاست.
 */
function knownShows_() {
  return [
    { key: ENRICH_SHOW_VARIETY, name: CFG.SHOW_NAME },
    { key: ENRICH_SHOW_SPECIAL, name: CFG.SPECIAL_SHOW_NAME }
  ];
}

function enrichShowName_(show) {
  var L = knownShows_();
  for (var i = 0; i < L.length; i++) if (L[i].key === show) return L[i].name;
  return CFG.SHOW_NAME;   // پیش‌فرضِ تاریخی؛ رفتارش عوض نشده
}

function enrichReqName_(show, epNum) {
  return '_ENRICH-REQ-' + show + '-' + ('000' + epNum).slice(-3) + '.json';
}

function enrichAnsName_(show, epNum) {
  return '_ENRICH-' + show + '-' + ('000' + epNum).slice(-3) + '.json';
}

function outFolder_() { return DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID); }

/** یک فایلِ JSON در پوشهٔ OUTPUT، با بازنویسیِ نسخهٔ قبلی. */
function putOutJson_(name, obj) {
  var folder = outFolder_();
  var it = folder.getFilesByName(name);
  var body = JSON.stringify(obj, null, 1);
  if (it.hasNext()) {
    var f = it.next();
    f.setContent(body);
    // نسخه‌های تکراریِ هم‌نام (اگر از قبل مانده) پاک می‌شوند تا خواننده سرگردان نشود
    while (it.hasNext()) { try { it.next().setTrashed(true); } catch (e) {} }
    return f;
  }
  return folder.createFile(Utilities.newBlob(body, 'application/json', name));
}

/**
 * همهٔ فایل‌های هم‌نامِ ریشه، **تازه‌ترین اول**.
 *
 * ══ چرا لازم شد (۲۳ اوت) ══
 * در ریشه سه تا `_MUSIC-FEED.json` بود؛ تسکِ غنی‌سازی هر ساعت به‌جای
 * به‌روزکردنِ همان فایل، یکی تازه می‌ساخت. `getFilesByName` یک تکرارگر
 * می‌دهد و ترتیبش تضمین‌شده نیست، پس موتور می‌توانست نسخهٔ کهنه را بخواند
 * و نامزدهای تازه را اصلاً نبیند — و بعد putOutJson_ هنگام نوشتن بقیه را
 * به سطلِ زباله می‌بُرد. یعنی کارِ تسک بی‌صدا از دست می‌رفت.
 */
function outFilesByName_(name) {
  var out = [];
  try {
    var it = outFolder_().getFilesByName(name);
    while (it.hasNext()) out.push(it.next());
  } catch (e) { return out; }
  out.sort(function (a, b) {
    var ta = 0, tb = 0;
    try { ta = a.getLastUpdated().getTime(); } catch (e1) {}
    try { tb = b.getLastUpdated().getTime(); } catch (e2) {}
    return tb - ta;
  });
  return out;
}

function getOutJson_(name) {
  try {
    var fs = outFilesByName_(name);
    if (!fs.length) return null;
    if (fs.length > 1) {
      logLine_('‏' + fs.length + ' نسخهٔ هم‌نام از «' + name +
               '» در ریشه هست؛ تازه‌ترین خوانده شد.');
    }
    return JSON.parse(fs[0].getBlob().getDataAsString());
  } catch (e) {
    logLine_('خواندنِ «' + name + '» ناموفق: ' + e.message);
    return null;
  }
}

// ------------------------------------------------------- نوشتنِ درخواست

/** شمارِ نویسهٔ روایتِ همهٔ بخش‌ها — پایهٔ محاسبهٔ سهمیه. */
function narrationChars_(ep) {
  var n = 0;
  var secs = (ep && ep.sections) || [];
  for (var i = 0; i < secs.length; i++) n += String((secs[i] && secs[i].narration) || '').length;
  return n;
}

/**
 * پروندهٔ درخواست. عمداً «قرارداد» را هم داخلش می‌نویسیم: هر بار که Cowork این
 * فایل را می‌خواند، شکلِ دقیقِ پاسخِ موردِ انتظار جلوِ چشمش است. اگر روزی
 * جزئیاتِ قرارداد عوض شود، همان‌جا عوض می‌شود و دو طرف هم‌زمان به‌روز می‌شوند.
 */
function writeEnrichRequest_(show, epNum, ep, items, extra) {
  var base = narrationChars_(ep);
  var secs = [];
  var list = (ep && ep.sections) || [];
  for (var i = 0; i < list.length; i++) {
    secs.push({
      index: i,
      heading: String(list[i].heading || ''),
      narration: String(list[i].narration || ''),
      chars: String(list[i].narration || '').length,
      sourceIds: list[i].sourceIds || list[i].chunkNos || []
    });
  }
  var src = [];
  for (var s = 0; s < (items || []).length; s++) {
    var it = items[s];
    src.push({
      id: String(it.id || it.fileId || ''),
      kind: String(it.kind || ''),
      title: String(it.title || it.name || ''),
      topic: String(it.topic || ''),
      summary: String(it.summary || '').slice(0, 600),
      link: String(it.link || '')
    });
  }
  var deadline = new Date(new Date().getTime() +
                          (CFG.ENRICH_WAIT_MIN || 90) * 60000);
  var req = {
    contract: 'enrich-v1',
    show: show,
    showName: enrichShowName_(show),
    episode: epNum,
    title: String((ep && ep.title) || ''),
    requestedAt: nowStr_(),
    deadline: Utilities.formatDate(deadline, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm'),
    answerFileName: enrichAnsName_(show, epNum),
    folderId: CFG.OUTPUT_FOLDER_ID,
    limits: {
      originalNarrationChars: base,
      maxOutsideChars: Math.round(base * (CFG.ENRICH_MAX_OUTSIDE_PCT || 15) / 100),
      maxInsideChars: Math.round(base * (CFG.ENRICH_MAX_INSIDE_PCT || 15) / 100),
      maxTotalChars: Math.round(base * (CFG.ENRICH_MAX_TOTAL_PCT || 25) / 100),
      note: 'محتوای اصلی باید غالب بماند. هر چه از سهمیه بگذرد بریده می‌شود.'
    },
    rules: [
      'به محتوای اصلی کاملاً پایبند بمان؛ چیزی از آن را حذف یا تحریف نکن.',
      'تفسیرِ بی‌مبنا مطلقاً ممنوع: هیچ انگیزه، احساس، دلیل یا زمینه‌ای را به آدم‌ها و ' +
        'محتواها نسبت نده که در خودِ محتوا نیامده. «چرا»یی که گفته نشده را نساز.',
      'type=outside یعنی از اینترنت آمده: باید دست‌کم یک منبع با لینکِ دقیق داشته باشد ' +
        'و spokenLeadIn آن باید صریح بگوید که این نکته بیرون از محتوای اصلی است.',
      'type=inside یعنی توصیف و مثال و مفهومی‌کردنِ همان محتوای اصلی، بی هیچ ' +
        'ادعای تازه و بی منبعِ بیرونی.',
      'قالبِ ثابت نساز: لحن و شکلِ هر افزوده باید با نوعِ همان محتوا جور باشد.',
      'منابع را خلاصه نکن: عنوانِ کامل، ناشر، تاریخ و لینکِ دقیق.',
      'زبانِ متن فارسی است؛ منبعِ غیرفارسی ترجمه می‌شود ولی لینک و عنوانِ اصلی ' +
        'عیناً ثبت می‌شود.',
      'در متنِ گفتنی هیچ لینک، شناسهٔ فایل یا رشتهٔ حرف‌وعددِ ماشینی نیاور — آن‌ها فقط ' +
        'در sources می‌آیند. در گفتار به منبع با نامِ آدم‌فهم اشاره کن.',
      'tashkil: پس از ساختنِ افزوده‌ها، متنِ نهاییِ هر بخش (متنِ اصلی + افزوده‌های همان ' +
        'بخش به همان ترتیبِ اولویت، جداشده با یک خطِ خالی) را «علامت‌گذاری» کن و در ' +
        'فیلد tashkil بفرست. علامت‌گذاری یعنی سه چیز، نه یکی: (الف) اعرابِ کامل — ' +
        'فتحه، کسره، ضمه، سکون، تشدید، بر پایهٔ تلفظِ فارسیِ معیارِ تهرانی، روی همهٔ ' +
        'حروف نه فقط واژه‌های سخت؛ (ب) نیم‌فاصله، هم آنجا که املا واجبش می‌کند و هم ' +
        'آنجا که چسبیدنِ دو حرف خوانشِ غلط می‌سازد؛ (پ) نشانه‌گذاریِ عبارت‌بندی — ' +
        '«،» و «…» و «—» و «:» را می‌توانی بیفزایی یا برداری تا گفتارساز ' +
        'عبارت‌به‌عبارت بخواند نه واژه‌به‌واژه.',
      'دام‌های تلفظ که باید بگردی و ببندی: پیشوندِ فعل روی ستاکِ الف‌آغاز ' +
        '(«بایستیم» را «با» می‌خواند — بنویس «بِ‌ایستیم»؛ همچنین «نَ‌ایستاد»، ' +
        '«بِ‌افتد»، «می‌ایستد») · هم‌نگاشت‌ها («مرد/مَرد/مُرد»، «کرم/کِرم/کَرَم»، ' +
        '«ملک»، «شکر»، «قدر») · کسرهٔ اضافه در همهٔ ترکیب‌ها · واوِ عطفِ /o/ ' +
        '(«آب وُ هوا») · تشدید («مُحَمَّد»، «اَوَّل») · همزه («مَسئَله»، «رأی») و ' +
        '«هٔ» که هرگز به «ه» ساده نمی‌شود · وامواژه‌ها («اُکسیژِن»، «اِنرژی»).',
      'واژه‌ها و عددها و مرزِ جمله‌ها (نقطه، پرسش، تعجب) عوض نمی‌شوند. موتور ' +
        'واژه‌به‌واژه مقایسه می‌کند و اگر واژه‌ای فرق کند آن بخش را خودش از نو ' +
        'می‌سازد. hook و outro را هم علامت‌گذاری کن. اگر متنِ ورودی از قبل اعراب ' +
        'داشت به آن اعتماد نکن — خودت درستی‌اش را بسنج.',
      'و پیش از فرستادن، یک بارِ دیگر خودت متنِ علامت‌گذاری‌شده را کنارِ اصل ' +
        'بگذار و بخوان: هر جا اعراب با واژه نمی‌خوانَد یا مکث سرِ جای غلط ' +
        'می‌افتد، همان‌جا را درست کن. موتور هم دقایقی بعد از دریافت، خودش یک ' +
        'بازبینیِ دوم روی همین متن اجرا می‌کند؛ هرچه اینجا درست باشد، آنجا ' +
        'کارِ کمتری می‌ماند.'
    ],
    answerShape: {
      contract: 'enrich-v1',
      show: show,
      episode: epNum,
      items: [{
        targetSection: 0,
        type: 'outside | inside',
        priority: '1 (مهم‌ترین) تا 5',
        spokenLeadIn: 'جملهٔ ورود، به زبانِ گفتار',
        text: 'خودِ افزوده، به زبانِ گفتار',
        spokenLeadOut: 'جملهٔ بازگشت به متنِ اصلی (اختیاری)',
        sources: [{ title: '', publisher: '', date: '', url: '', quote: '' }]
      }],
      tashkil: {
        hook: 'hook با اعرابِ کامل (اختیاری ولی خواسته‌شده)',
        outro: 'outro با اعرابِ کامل',
        recap: 'recap با اعرابِ کامل (اگر برنامه recap دارد)',
        sections: { '0': 'متنِ نهاییِ بخشِ صفر (عنوان. متن + افزوده‌ها) با اعرابِ کامل' }
      },
      notes: 'هر چیزی که موتور باید بداند'
    },
    sections: secs,
    originalSources: src
  };
  if (extra) { for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) req[k] = extra[k]; }
  try {
    putOutJson_(enrichReqName_(show, epNum), req);
    logLine_('درخواستِ غنی‌سازیِ «' + enrichShowName_(show) + '» قسمت ' + epNum +
             ' گذاشته شد (مهلت تا ' + req.deadline + ').');
    return true;
  } catch (e) {
    logLine_('نوشتنِ درخواستِ غنی‌سازی ناموفق: ' + e.message);
    return false;
  }
}

// ------------------------------------------------------- خواندنِ پاسخ

/** پاسخِ Cowork، اگر رسیده باشد. */
function readEnrichAnswer_(show, epNum) {
  var ans = getOutJson_(enrichAnsName_(show, epNum));
  if (!ans) return null;
  if (!ans.items || !ans.items.length) {
    // پاسخِ خالی هم پاسخ است: یعنی «گشتم و چیزِ ارزشمندی پیدا نشد». باید
    // پذیرفته شود، وگرنه موتور تا آخرِ مهلت بی‌دلیل منتظر می‌ماند.
    // ولی اعراب‌گذاری (tashkil) می‌تواند همراهش باشد و نباید گم شود.
    return { items: [], notes: String(ans.notes || 'چیزی برای افزودن پیدا نشد.'),
             tashkil: ans.tashkil || null, empty: true };
  }
  return ans;
}

// نشانه‌هایی که «اعلامِ بیرونی‌بودن» را می‌سازند. فهرست باز است چون قالبِ ثابت
// ممنوع است — هر جمله‌ای که یکی از این‌ها را داشته باشد، اعلام حساب می‌شود.
var ENRICH_DISCLOSURE_PAT = new RegExp(
  'بیرون از (?:محتوا|متن|فایل|آرشیو)|خارج از (?:محتوا|متن|فایل|آرشیو)|' +
  'در (?:خود ?ِ?|همین )?(?:فایل|آرشیو|نوار|متن) ?(?:ها|های)? ?ِ? ?(?:اصلی)? ?نیست|' +
  'از بیرونِ? ?(?:آرشیو|این مجموعه)|افزودهٔ? ?بیرونی|' +
  'این را از اینترنت|جست ?و ?جوی? (?:وب|اینترنت)|منبعِ? بیرونی|' +
  'در (?:اینترنت|وب) (?:آمده|هست|نوشته)');

var ENRICH_DEFAULT_DISCLOSURE =
  'یک نکتهٔ تکمیلی که بیرون از محتوای اصلیِ این آرشیو است و از جست‌وجوی اینترنتی آمده:';

// «بیرون از محتوای اصلی نیست» هم الگو را می‌گیرد ولی معنایش دقیقاً برعکس است.
// بی این آزمون، یک ادعای اینترنتی به‌عنوان حرفِ خودِ مدرس پخش می‌شد.
// دو شکل دارد: نفی *بعد* از واژهٔ بیرونی («بیرون از محتوا نیست») و نفی *پیش*
// از آن («لازم نیست از بیرونِ آرشیو…»، «برخلافِ افزودهٔ بیرونی…»).
// دقت کنید که «در خودِ فایل‌ها نیست» یک اعلامِ درست است و نباید نفی شمرده شود؛
// برای همین الگو فقط واژه‌های «بیرونی» را هدف می‌گیرد، نه هر «نیست»ی.
var ENRICH_NEGATE_PAT = new RegExp(
  '(بیرون|خارج|اینترنت|وب|بیرونی)[^.!?]{0,40}(نیست|نبود|نه اینکه)|' +
  '(لازم نیست|برخلاف|بی هیچ|بی جست)');

/** آیا این جملهٔ ورود، بیرونی‌بودن را اعلام می‌کند؟ */
function enrichDiscloses_(s) {
  var t = txNorm(String(s || ''));
  if (!ENRICH_DISCLOSURE_PAT.test(t)) return false;
  return !ENRICH_NEGATE_PAT.test(t);
}

function enrichHttpUrl_(u) {
  return /^https?:\/\/[^\s]+$/i.test(String(u || '').trim());
}

/**
 * ادغامِ پاسخ در متنِ قسمت.
 *
 * برمی‌گرداند: چه چیزی افزوده شد، چه چیزی بریده شد و چرا، و فهرستِ منابع.
 * خودِ `ep` جا‌به‌جا عوض می‌شود.
 */
function applyEnrichment_(ep, ans, show, epNum) {
  var out = { applied: 0, dropped: 0, outsideChars: 0, insideChars: 0,
              sources: [], reasons: [], forcedDisclosure: 0 };
  var secs = (ep && ep.sections) || [];
  if (!secs.length) { out.reasons.push('قسمت بخشی نداشت'); return out; }
  var base = narrationChars_(ep);
  var capOut = Math.round(base * (CFG.ENRICH_MAX_OUTSIDE_PCT || 15) / 100);
  var capIn = Math.round(base * (CFG.ENRICH_MAX_INSIDE_PCT || 15) / 100);
  var capAll = Math.round(base * (CFG.ENRICH_MAX_TOTAL_PCT || 25) / 100);

  /* ── مرزِ سختِ «یک فایل» ──
   * سهمیهٔ درصدی نسبت به متنِ پایه حساب می‌شود، و متنِ پایهٔ درس‌نامه دقیقاً
   * سرِ سقفِ یک فایل نشسته است. جمعِ این دو یعنی دو فایل — همان چیزی که در
   * قسمتِ ۱۶ رخ داد (۱۴:۱۴ در برابر هدفِ ۱۰٫۸). پس وقتی «یک فایل» خواسته
   * شده، جای باقی‌مانده تا سقفِ واقعیِ فایل هم یک سقف است، و هرکدام کمتر
   * بود برنده می‌شود.
   *
   * فراخوانِ رو به عقب (۱۹ → ۱۴ و ۰۳) است، پس مجاز؛ ولی در try/catch، چون
   * بارگذارهای جزئیِ tests/ ممکن است بخشِ ۱۴ را نداشته باشند. */
  var capRoom = Infinity, capFile = 0;
  if (show === ENRICH_SHOW_SPECIAL && CFG.SPECIAL_ONE_FILE === true) {
    try { capFile = specialFileCap_(); capRoom = Math.max(0, capFile - base); }
    catch (eCap) { capRoom = Infinity; }
  }
  if (capRoom < capAll) capAll = capRoom;
  if (capRoom < capOut) capOut = capRoom;
  if (capRoom < capIn) capIn = capRoom;
  /* و اگر جا صفر شد، بی‌صدا نگذر: یعنی متنِ درس تا لبِ سقفِ فایل پر است و
     غنی‌سازی — قابلیتی که کاربر خواسته — آن شب هیچ سهمی ندارد. قابلیتی که
     خاموش می‌شود و کسی خبردار نمی‌شود، همان الگویی است که بانکِ موسیقی را
     هفته‌ها خالی نگه داشت. */
  if (capRoom === 0) {
    out.reasons.push('جای غنی‌سازی صفر بود: متنِ درس خودش تا سقفِ یک فایل پر است');
    logLine_('غنی‌سازیِ درس‌نامه جایی نداشت: متنِ درس ' + base + ' نویسه است و ' +
             'سقفِ یک فایل ' + capFile + ' — چیزی اضافه نشد.');
  }

  // مرتب‌سازی: اولویتِ اعلام‌شده، بعد ترتیبِ خودِ فهرست. بی این، بریدنِ سهمیه
  // دلبخواه می‌شد و ممکن بود مهم‌ترین نکته حذف شود و کم‌اهمیت‌ترین بماند.
  var list = [];
  for (var i = 0; i < ans.items.length; i++) {
    var it = ans.items[i];
    if (!it || typeof it !== 'object') continue;
    var pri = Number(it.priority);
    if (!isFinite(pri) || pri <= 0) pri = 5;      // پیش‌فرض، نه «مهم‌ترین»
    list.push({ it: it, i: i, pri: Math.max(1, Math.min(9, Math.floor(pri))) });
  }
  list.sort(function (a, b) { return a.pri !== b.pri ? a.pri - b.pri : a.i - b.i; });

  var perSection = Object.create(null);
  var seenText = Object.create(null);
  for (var q = 0; q < list.length; q++) {
    var e = list[q].it;
    var type = String(e.type || '').trim() === 'inside' ? 'inside' : 'outside';
    var text = String(e.text || '').trim();
    if (!text) { out.dropped++; out.reasons.push('افزودهٔ بی‌متن'); continue; }
    // یک ادعای تکراری، دوازده بار در یک قسمت شنیده نمی‌شود.
    var tkey = txNorm(text).slice(0, 200);
    if (Object.prototype.hasOwnProperty.call(seenText, tkey)) {
      out.dropped++; out.reasons.push('افزودهٔ تکراری کنار گذاشته شد'); continue;
    }
    seenText[tkey] = 1;
    // شمارهٔ بخش باید عددِ صحیح باشد. یک «1.5» در پاسخ — که کاملاً JSONِ درستی
    // است — تا دیروز به secs[1.5] می‌رسید، یعنی undefined، یعنی استثنا در
    // میانهٔ ادغام؛ و چون هر اجرای بعدی هم دوباره همین‌جا می‌رسید، آن قسمت
    // هیچ‌وقت ساخته نمی‌شد و قسمت‌های روزهای بعد هم نه. یک عددِ اشتباه، مرگِ
    // دائمیِ پادکست.
    var si = Math.floor(Number(e.targetSection));
    if (!isFinite(si) || si < 0 || si >= secs.length) si = 0;

    var lead = String(e.spokenLeadIn || '').trim();
    var tail = String(e.spokenLeadOut || '').trim();

    // ── منابع: شرطِ حیاتیِ افزودهٔ بیرونی ──
    var srcs = [];
    var raw = e.sources || [];
    for (var s = 0; s < raw.length; s++) {
      var r = raw[s] || {};
      if (!enrichHttpUrl_(r.url)) continue;
      // «بی خلاصه‌کاری» خواستهٔ صریح بود: عنوان و نقلِ مستقیم بریده نمی‌شوند.
      srcs.push({ title: String(r.title || '').slice(0, 1000),
                  publisher: String(r.publisher || '').slice(0, 300),
                  date: String(r.date || '').slice(0, 60),
                  url: String(r.url).trim(),
                  quote: String(r.quote || '').slice(0, 4000),
                  section: si, type: type });
    }
    if (type === 'outside' && !srcs.length) {
      // بی منبع، ادعا از کجا آمده؟ همین یک شرط، مرزِ «غنی‌سازی» و «از خود
      // درآوردن» است.
      out.dropped++;
      out.reasons.push('افزودهٔ بیرونی بی لینکِ معتبر رد شد: ' + text.slice(0, 60));
      continue;
    }

    // ── اعلامِ بیرونی‌بودن: قابلِ چشم‌پوشی نیست ──
    if (type === 'outside' && !enrichDiscloses_(lead)) {
      lead = ENRICH_DEFAULT_DISCLOSURE + (lead ? ' ' + lead : '');
      out.forcedDisclosure++;
    }

    var addition = (lead ? lead + ' ' : '') + text + (tail ? ' ' + tail : '');
    // هر افزوده دو نویسهٔ جداکننده هم می‌آورد. نشمردنشان یعنی با چهارصد افزودهٔ
    // کوچک، رشدِ واقعیِ متن از سهمیه می‌گذشت درحالی‌که عددی که به کاربر نشان
    // داده می‌شد می‌گفت زیرِ سهمیه است. سهمیه‌ای که بشود دورش زد سهمیه نیست.
    var cost = addition.length + 2;
    var willOut = out.outsideChars + (type === 'outside' ? cost : 0);
    var willIn = out.insideChars + (type === 'inside' ? cost : 0);
    if (willOut > capOut || willIn > capIn ||
        (out.outsideChars + out.insideChars + cost) > capAll) {
      out.dropped++;
      // کدام سقف خورد، مهم است: «سهمیه» یعنی متن پُر شده، «یک فایل» یعنی
      // درس بلند نوشته شده. دو ایرادِ کاملاً متفاوت با یک پیام، همان چیزی
      // است که علتِ دو‌فایلی‌شدن را ماه‌ها پنهان نگه داشت.
      out.reasons.push(capRoom < Math.round(base * (CFG.ENRICH_MAX_TOTAL_PCT || 25) / 100)
        ? ('جا نداشت — متنِ درس تا سقفِ یک فایل پر است (' + type + '، ' + cost + ' نویسه)')
        : ('از سهمیه گذشت و بریده شد (' + type + '، ' + cost + ' نویسه)'));
      continue;
    }

    if (!perSection[si]) perSection[si] = [];
    perSection[si].push(addition);
    if (type === 'outside') out.outsideChars += cost; else out.insideChars += cost;
    for (var z = 0; z < srcs.length; z++) out.sources.push(srcs[z]);
    out.applied++;
  }

  for (var k in perSection) {
    if (!Object.prototype.hasOwnProperty.call(perSection, k)) continue;
    var idx = Number(k);
    if (!secs[idx]) continue;              // کمربندِ دوم؛ هیچ‌وقت نباید لازم شود
    secs[idx].narration = String(secs[idx].narration || '') + '\n\n' +
                          perSection[k].join('\n\n');
  }

  // درصدها از رشدِ *اندازه‌گیری‌شدهٔ* متن می‌آیند، نه از جمعِ برآوردها. عددی که
  // به کاربر نشان داده می‌شود باید همان چیزی باشد که واقعاً در گوش می‌رود.
  var grew = Math.max(0, narrationChars_(ep) - base);
  ep.__enrich = {
    at: nowStr_(),
    applied: out.applied, dropped: out.dropped,
    outsideChars: out.outsideChars, insideChars: out.insideChars,
    originalChars: base, addedChars: grew,
    pctTotal: base ? Math.round(grew * 1000 / base) / 10 : 0,
    pctOutside: base ? Math.round(out.outsideChars * 1000 / base) / 10 : 0,
    pctInside: base ? Math.round(out.insideChars * 1000 / base) / 10 : 0,
    notes: String(ans.notes || ''),
    forcedDisclosure: out.forcedDisclosure,
    reasons: out.reasons.slice(0, 20)
  };
  ep.__extSources = out.sources;
  // پیشنهادِ اعراب‌گذاریِ Cowork — «به امانت»، نه «به اعتماد»: مرحلهٔ متنِ
  // صوتی آن را واژه‌به‌واژه با متنِ نهایی می‌سنجد و فقط اگر عین هم بودند
  // به کار می‌بردش (speakStep_ در 03_Producer).
  if (ans.tashkil && typeof ans.tashkil === 'object') ep.__ctashkil = ans.tashkil;
  logLine_('غنی‌سازیِ «' + enrichShowName_(show) + '» قسمت ' + epNum + ': ' +
           out.applied + ' افزوده (' + ep.__enrich.pctOutside + '٪ بیرونی، ' +
           ep.__enrich.pctInside + '٪ توضیحی)' +
           (out.dropped ? '، ' + out.dropped + ' مورد رد یا بریده شد' : '') +
           '، ' + out.sources.length + ' منبع ثبت شد.');
  return out;
}

// ------------------------------------------------- ثبتِ منابعِ بیرونی در شیت

var EXTSRC_HEADERS = ['تاریخ ثبت', 'برنامه', 'قسمت', 'بخش', 'نوع افزوده',
                      'عنوان منبع', 'ناشر', 'تاریخ منبع', 'لینک', 'نقلِ مستقیم'];

function logExtSources_(hub, show, epNum, sources) {
  if (!sources || !sources.length) return 0;
  try {
    var sh = ensureTab_(hub, CFG.EXTSRC_TAB, EXTSRC_HEADERS);
    var rows = [];
    var now = nowStr_();
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      rows.push([now, enrichShowName_(show), epNum, (Number(s.section) || 0) + 1,
                 s.type === 'inside' ? 'توضیحی' : 'بیرونی',
                 s.title, s.publisher, s.date, s.url, s.quote]);
    }
    appendBlock_(sh, rows, EXTSRC_HEADERS.length);
    return rows.length;
  } catch (e) {
    logLine_('ثبتِ منابعِ بیرونی ناموفق: ' + e.message);
    return 0;
  }
}

// --------------------------------------------------- جمله‌های وضعیت

/** جمله‌ای که در ایمیل و تلگرام و پیوست دیده می‌شود. */
function enrichNote_(ep) {
  var e = ep && ep.__enrich;
  if (e && e.applied) {
    return 'غنی‌سازیِ اینترنتی: ' + e.applied + ' افزوده (' + e.pctOutside +
           '٪ از متن، بیرون از محتوای اصلی و علامت‌دار) و ' +
           (ep.__extSources || []).length + ' منبع با لینکِ دقیق.';
  }
  if (e && !e.applied) {
    return 'غنی‌سازیِ اینترنتی انجام شد ولی چیزی به متن اضافه نشد' +
           (e.notes ? ' — ' + String(e.notes).slice(0, 200) : '') + '.';
  }
  var why = ep && ep.__enrichSkipped;
  if (why) return 'غنی‌سازیِ اینترنتیِ این قسمت انجام نشد: ' + why;
  return '';
}

/** HTML بخشِ منابعِ بیرونی برای پیوستِ قسمت. */
function extSourcesHtml_(ep) {
  var list = (ep && ep.__extSources) || [];
  var note = enrichNote_(ep);
  var castNote = (ep && ep.__cast && ep.__cast.note) || '';
  if (!list.length && !note && !castNote) return '';
  var h = [];
  h.push('<h2>منابعِ بیرونی و غنی‌سازی</h2>');
  if (note) h.push('<p style="color:#555">' + esc_(note) + '</p>');
  // نقش‌گزینیِ گویندگان هم همین‌جا دیده می‌شود: اگر صدایی به گوشتان جور درنیامد،
  // بدانید کدام بود و بتوانید کنارش بگذارید.
  if (ep && ep.__cast && ep.__cast.note) {
    h.push('<p style="color:#555">' + esc_(ep.__cast.note) + '</p>');
  }
  /* و بازهٔ زمانیِ هر گوینده، اگر مدتِ قسمت معلوم باشد. همان چیزی که در
     کپشنِ یوتیوب می‌رود — یک خواسته، یک محاسبه، هر جا که لازم است. */
  try {
    var tl = castTimeline_(((ep || {}).__cast || {}).spans || [],
                           Number((ep || {}).__durationSec) || 0,
                           Number(CFG.MUSIC_INTRO_SEC) || 0);
    var cLines = castLines_(tl);
    if (cLines.length) {
      h.push('<ul style="color:#555;font-size:13px">');
      for (var cv = 0; cv < cLines.length; cv++) h.push('<li>' + esc_(cLines[cv]) + '</li>');
      h.push('</ul>');
    }
  } catch (eCl) {}
  if (list.length) {
    h.push('<table><tr><th>بخش</th><th>نوع</th><th>منبع</th><th>ناشر</th>' +
           '<th>تاریخ</th><th>نقلِ مستقیم</th></tr>');
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      h.push('<tr><td>' + ((Number(s.section) || 0) + 1) + '</td>' +
             '<td>' + esc_(s.type === 'inside' ? 'توضیحی' : 'بیرونی') + '</td>' +
             '<td><a href="' + esc_(s.url) + '">' + esc_(s.title || s.url) + '</a><br>' +
             '<span style="font-size:11px;color:#777;word-break:break-all">' +
             esc_(s.url) + '</span></td>' +
             '<td>' + esc_(s.publisher) + '</td><td>' + esc_(s.date) + '</td>' +
             '<td style="font-size:12px">' + esc_(s.quote) + '</td></tr>');
    }
    h.push('</table>');
  }
  return h.join('\n');
}

/**
 * پرونده‌های دستِ‌به‌دستِ این قسمت را مصرف‌شده اعلام می‌کند.
 * چرا لازم است: پاسخی که روی درایو بماند، می‌تواند دوباره خوانده و دوباره ادغام
 * شود، یا به قسمتِ هم‌شمارهٔ بعدی بچسبد.
 */
function trashEnrichFiles_(show, epNum) {
  var names = [enrichAnsName_(show, epNum), enrichReqName_(show, epNum)];
  var folder = outFolder_();
  for (var i = 0; i < names.length; i++) {
    try {
      var it = folder.getFilesByName(names[i]);
      while (it.hasNext()) it.next().setTrashed(true);
    } catch (e) {}
  }
}

function trashEnrichReq_(show, epNum) {
  try {
    var it = outFolder_().getFilesByName(enrichReqName_(show, epNum));
    while (it.hasNext()) it.next().setTrashed(true);
  } catch (e) {}
}

// ------------------------------------------------ مرحلهٔ «انتظارِ غنی‌سازی»

/**
 * یک نوبتِ وارسیِ غنی‌سازی برای یک قسمتِ آماده.
 *
 * برمی‌گرداند:
 *   {done:true,  ep:<قسمتِ ادغام‌شده>}   → برو سراغ صدا
 *   {done:false, waitMs:<n>}            → هنوز نرسیده، دوباره سر بزن
 *   {done:true,  skipped:'<دلیل>'}      → مهلت تمام شد؛ بی‌غنی‌سازی جلو برو
 */
function enrichGate_(st, show, ep, epNum) {
  var limit = CFG.ENRICH_WAIT_MIN || 90;
  if (CFG.ENRICH_ENABLED === false) {
    // خاموش‌شدنِ قابلیت وسطِ کار هم باید توضیح داشته باشد، وگرنه کاربر یک قسمتِ
    // بی‌غنی‌سازی می‌گیرد و هیچ‌جا نمی‌فهمد چرا.
    ep.__enrichSkipped = 'قابلیتِ غنی‌سازی خاموش بود';
    trashEnrichReq_(show, epNum);
    return { done: true, skipped: ep.__enrichSkipped };
  }
  // ── این قسمت قبلاً غنی شده است ──
  // پنجرهٔ خطر: متنِ ادغام‌شده ذخیره می‌شود و یک لحظه بعد مرحله به «صدا» تغییر
  // می‌کند. اگر اجرا دقیقاً بین این دو کشته شود، اجرای بعدی همان پاسخ را در
  // متنِ *غنی‌شده* دوباره ادغام می‌کرد — و هر دور، سهمیه روی پایهٔ بادکرده حساب
  // می‌شد. در آزمون، پنج دور، رشدِ واقعی به ۸۳٪ رسید در حالی که عددِ گزارش‌شده
  // هنوز می‌گفت زیرِ سهمیه است. یعنی همان چیزی که قرار بود هرگز پیش نیاید:
  // صدای آرشیو زیر صدای اینترنت.
  if (ep && ep.__enrich) return { done: true, applied: true, already: true };

  var ans = readEnrichAnswer_(show, epNum);
  if (ans) {
    if (ans.empty) {
      ep.__enrichSkipped = 'Cowork گشت و چیزِ ارزشمندی برای افزودن پیدا نکرد' +
                           (ans.notes ? ' (' + String(ans.notes).slice(0, 150) + ')' : '');
      // اعراب‌گذاریِ همراهِ پاسخِ خالی نباید دور برود — متن که عوض نشده،
      // پس همین اعراب می‌تواند وارسی و استفاده شود.
      if (ans.tashkil && typeof ans.tashkil === 'object') ep.__ctashkil = ans.tashkil;
      trashEnrichFiles_(show, epNum);
      return { done: true, empty: true };
    }
    // پاسخی که برای قسمتِ دیگری نوشته شده، به این قسمت تزریق نمی‌شود.
    if ((ans.show && String(ans.show) !== String(show)) ||
        (ans.episode !== undefined && ans.episode !== null &&
         Number(ans.episode) !== Number(epNum))) {
      logLine_('پاسخِ غنی‌سازی به این قسمت نمی‌خورد (' + ans.show + ':' + ans.episode +
               ' در برابر ' + show + ':' + epNum + ')؛ نادیده گرفته شد.');
      ep.__enrichSkipped = 'پاسخِ غنی‌سازی نشانیِ درستی نداشت';
      trashEnrichFiles_(show, epNum);
      return { done: true, skipped: ep.__enrichSkipped };
    }
    // یک پاسخِ خرابِ غیرمنتظره هم نباید پادکست را زمین بزند.
    try { applyEnrichment_(ep, ans, show, epNum); }
    catch (eA) {
      logLine_('ادغامِ غنی‌سازی شکست خورد: ' + eA.message +
               '؛ قسمت با محتوای اصلی ساخته می‌شود.');
      ep.__enrichSkipped = 'پاسخِ غنی‌سازی خراب بود: ' + String(eA.message).slice(0, 120);
      ep.__enrich = null;
    }
    trashEnrichFiles_(show, epNum);
    return { done: true, applied: true };
  }
  var since = parseWhen_(String(st.enrichAt || ''));
  // ساعتی که خوانده نمی‌شود یا در آینده است، یعنی «صبر نکن». پیش‌تر NaN صفر
  // دقیقه حساب می‌شد و مهلت هرگز تمام نمی‌شد: قسمت تا ابد در انتظار می‌ماند و
  // روزهای بعد هم همان‌جا برمی‌گشتند. هیچ ساعتِ خرابی نباید پادکست را ببرد.
  var waited = isNaN(since) ? limit : (new Date().getTime() - since) / 60000;
  if (!(waited >= 0)) waited = limit;
  if (waited >= limit) {
    ep.__enrichSkipped = 'پاسخِ Cowork تا ' + Math.round(waited) +
                         ' دقیقه نرسید؛ قسمت با همان محتوای اصلی ساخته شد';
    logLine_('غنی‌سازیِ «' + enrichShowName_(show) + '» قسمت ' + epNum +
             ' نرسید (' + Math.round(waited) + ' دقیقه انتظار)؛ بی‌غنی‌سازی جلو رفت.');
    try {
      logSelfFinding_(getHub_(), {
        priority: 'متوسط', category: 'غنی‌سازی', key: 'enrich-timeout',
        title: 'غنی‌سازیِ اینترنتی به‌موقع نرسید',
        detail: enrichShowName_(show) + ' قسمت ' + epNum + ': پاسخِ Cowork در ' +
                limit + ' دقیقه نیامد. پروندهٔ درخواست: ' + enrichReqName_(show, epNum),
        instruction: '', owner: 'Cowork'
      });
    } catch (eS) {}
    return { done: true, skipped: ep.__enrichSkipped };
  }
  return { done: false, waitMs: Math.max(60000, (CFG.ENRICH_POLL_MIN || 10) * 60000) };
}

/**
 * آیا برای این قسمت باید منتظرِ غنی‌سازی شد؟
 *
 * فقط وقتی که مهلتِ انتظار پیش از ساعتِ مقررِ انتشار تمام می‌شود. اگر متن دیر
 * نوشته شده (مثلاً آماده‌سازیِ بامداد اجرا نشده و همین حالا ساعتِ انتشار است)،
 * انتظار یعنی تأخیرِ پادکست — و آن را نمی‌خواهیم.
 */
function enrichWorthWaiting_(publishHour) {
  if (CFG.ENRICH_ENABLED === false) return false;
  // تولیدِ دستی: شما همین حالا خواسته‌اید، پس ساعت تعیین‌کننده نیست.
  if (takeEnrichForce_()) return true;
  var mins = nowMinuteOfDay_();
  if (!isFinite(mins)) return false;      // ساعت را نفهمیدیم؟ صبر نکن
  var wait = CFG.ENRICH_WAIT_MIN || 90;
  return (mins + wait) <= (Number(publishHour) * 60);
}

/**
 * دقیقهٔ روز، به وقتِ دبی — از همان رشتهٔ زمانی که همهٔ موتور با آن کار می‌کند.
 * چرا نه Utilities.formatDate با الگوی 'H': آن الگو در همه‌جا پشتیبانی نمی‌شود و
 * اگر رشتهٔ خام برگردد، Number(...) می‌شود NaN و مقایسه بی‌صدا غلط از آب درمی‌آید.
 * تکیه بر nowStr_ یعنی تکیه بر همان قالبی که در سراسر پروژه آزموده شده است.
 */
function nowMinuteOfDay_() {
  // الگو به کلِ قالبِ «yyyy-MM-dd HH:mm» بسته شده است. لنگرِ قبلی فقط «آخرین
  // HH:mm» را می‌گرفت و با یک زمانِ ثانیه‌دار («05:29:41») ساعت را ۲۹ می‌خواند —
  // و دروازهٔ ساعت بی‌صدا کنار می‌رفت.
  var m = String(nowStr_()).match(/^\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return NaN;
  var h = Number(m[1]), mi = Number(m[2]);
  if (!(h >= 0 && h <= 23 && mi >= 0 && mi <= 59)) return NaN;
  return h * 60 + mi;
}

/** ساعتی که در دروازهٔ «نه پیش از ساعتِ مقرر» می‌نشیند. یک عددِ ۲۴ یا «abc»
 *  آن دروازه را به انتظارِ ابدی تبدیل می‌کرد. */
function clampHour_(h, dflt) {
  var n = Math.floor(Number(h));
  if (!isFinite(n) || n < 0 || n > 23) return Number(dflt) || 0;
  return n;
}

function nowHour_() {
  var mins = nowMinuteOfDay_();
  return isFinite(mins) ? Math.floor(mins / 60) : NaN;
}

/** خلاصهٔ وضعیتِ غنی‌سازی برای فایل وضعیت و ناظرِ روزانه. */
/* ══ دو ساعت، دو معنا، یک نام (۶٫۸۰) ══
 * گزارشِ ۱ سپتامبر دو عددِ ناسازگار کنارِ هم گذاشت: «آخرین اجرا امروز ۰۸:۴۳»
 * و «۲ روز است کاری نکرده». هیچ‌کدام غلط نبودند؛ **دو چیزِ متفاوت را
 * می‌شمردند**:
 *   • `PK.ENRICH_AT` وقتی مُهر می‌خورد که *موتور* قسمتی را منتشر کند که
 *     منبعِ بیرونی داشته — یعنی کارِ خودِ موتور، در لحظهٔ انتشار. آن منبع
 *     می‌تواند از پاسخی باشد که تسک روزها پیش نوشته.
 *   • دیده‌بان تازه‌ترین *پاسخِ* تسک را در پوشهٔ OUTPUT می‌بیند — یعنی کارِ
 *     خودِ تسک.
 * اسمِ «آخرین اجرا» روی اولی، تناقض می‌سازد. حالا هر دو با نامِ خودشان
 * می‌آیند و «آخرین پاسخِ تسک» از همان یک تعریفِ دیده‌بان (`whNewestEnrich_`)
 * خوانده می‌شود — دو کپی از یک حقیقت، همان چیزی است که این ریپو بارها
 * بابتش نسخه سوزانده. */
function enrichStatus_() {
  var answerAt = '';
  try { answerAt = whNewestEnrich_(); } catch (eA) {}
  var out = { enabled: CFG.ENRICH_ENABLED !== false, waitMin: CFG.ENRICH_WAIT_MIN || 90,
              maxOutsidePct: CFG.ENRICH_MAX_OUTSIDE_PCT || 15,
              pending: [],
              // کارِ تسک: تازه‌ترین پاسخی که نوشته
              lastAnswerAt: answerAt,
              // کارِ موتور: آخرین قسمتی که با منبعِ بیرونی منتشر شد
              lastUsedAt: String(props_().getProperty(PK.ENRICH_AT) || ''),
              /* `lastAt` برای سازگاری می‌مانَد، ولی از این پس همان ساعتِ
                 تسک است — چون هر جا «آخرین غنی‌سازی» خوانده می‌شود،
                 منظور کارِ تسک بوده، نه لحظهٔ انتشارِ موتور. */
              lastAt: answerAt };
  try {
    var folder = outFolder_();
    var it = folder.getFiles();
    var reqs = Object.create(null), ans = Object.create(null);
    while (it.hasNext()) {
      var n = it.next().getName();
      var m = n.match(/^_ENRICH-REQ-([a-z]+)-(\d+)\.json$/);
      if (m) { reqs[m[1] + ':' + Number(m[2])] = 1; continue; }
      var m2 = n.match(/^_ENRICH-([a-z]+)-(\d+)\.json$/);
      if (m2) ans[m2[1] + ':' + Number(m2[2])] = 1;
    }
    for (var k in reqs) {
      if (!Object.prototype.hasOwnProperty.call(reqs, k)) continue;
      if (!ans[k]) out.pending.push(k);
    }
  } catch (e) {}
  return out;
}

/**
 * پاک‌سازیِ پرونده‌های کهنهٔ دستِ‌به‌دست. بی این، پوشهٔ OUTPUT کم‌کم پر از
 * درخواست و پاسخِ قسمت‌های ماه‌های پیش می‌شد و خودِ فهرستِ «منتظر» بی‌معنی.
 */
function pruneEnrichFiles_(keepDays) {
  var days = Number(keepDays) > 0 ? Number(keepDays) : (CFG.ENRICH_KEEP_DAYS || 10);
  var cut = new Date().getTime() - days * 86400000;
  var n = 0;
  try {
    var it = outFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (!/^_ENRICH(-REQ)?-[a-z]+-\d+\.json$/.test(f.getName())) continue;
      var when = f.getLastUpdated ? f.getLastUpdated() : f.getDateCreated();
      if (when && when.getTime() < cut) { f.setTrashed(true); n++; }
    }
  } catch (e) {}
  if (n) logLine_('پرونده‌های کهنهٔ غنی‌سازی پاک شد: ' + n + ' فایل.');
  return n;
}

// ------------------------------------------------------- گرداننده‌ها و منو

/**
 * آماده‌سازیِ متنِ «از همه جا از همه رنگ» — چند ساعت پیش از انتشار.
 * همان produceEpisode است: چون آن تابع خودش می‌فهمد که قسمتِ نیمه‌تمامی در کار
 * نیست و متن را می‌نویسد، درخواستِ غنی‌سازی را می‌گذارد و صدا را به اجرای بعد
 * می‌سپارد. اگر این اجرا به هر دلیل انجام نشود، اجرای ساعتِ انتشار خودش همه
 * کار را می‌کند (بی غنی‌سازی) تا پادکست از دست نرود.
 */
function prepareEpisode() { return produceEpisode(); }

/** همان، برای «درس‌نامه». */
function prepareSpecialEpisode() { return produceSpecialEpisode(); }

/** منو: کجای کارِ غنی‌سازی هستیم. */
function showEnrichStatus() {
  var st = enrichStatus_();
  var L = [];
  L.push('غنی‌سازیِ اینترنتی: ' + (st.enabled ? 'روشن' : 'خاموش'));
  L.push('مهلتِ انتظار: ' + st.waitMin + ' دقیقه  ·  سهمِ مطالبِ بیرونی: حداکثر ' +
         st.maxOutsidePct + '٪ از متن');
  L.push('آماده‌سازیِ متن: ساعت ' + (CFG.PREPARE_HOUR || 4) + ' («' + CFG.SHOW_NAME +
         '») و ' + (CFG.PREPARE_SPECIAL_HOUR || 5) + ' («' + CFG.SPECIAL_SHOW_NAME + '»)');
  L.push('انتشار: ساعت ' + (CFG.EPISODE_HOUR || 7) + ' و ' + (CFG.SPECIAL_HOUR || 8));
  L.push('');
  if (st.pending.length) {
    L.push('درخواستِ بی‌پاسخ: ' + st.pending.length);
    for (var i = 0; i < Math.min(6, st.pending.length); i++) {
      var p = st.pending[i].split(':');
      L.push('• ' + enrichShowName_(p[0]) + ' — قسمت ' + p[1]);
    }
    L.push('');
    L.push('اگر این‌ها کهنه‌اند یعنی Cowork در آن پنجره اجرا نشده؛ خودِ قسمت‌ها ' +
           'بی‌غنی‌سازی ساخته شده‌اند و پادکستی از دست نرفته.');
  } else {
    L.push('هیچ درخواستِ بی‌پاسخی نمانده.');
  }
  /* دو ساعت، با نامِ خودشان — تا کسی دوباره آن‌ها را یک چیز نخواند (۶٫۸۰). */
  L.push('');
  L.push('آخرین پاسخِ تسک: ' + (st.lastAnswerAt || '—') +
         '  ·  آخرین قسمتی که با منبعِ بیرونی منتشر شد: ' + (st.lastUsedAt || '—'));
  var pend = props_().getProperty(PK.PENDING) ? CFG.SHOW_NAME : '';
  var pendSp = props_().getProperty(PK.SP_PENDING) ? CFG.SPECIAL_SHOW_NAME : '';
  if (pend || pendSp) {
    L.push('');
    L.push('قسمتِ در جریان: ' + [pend, pendSp].filter(String).join(' و '));
  }
  var m = L.join('\n');
  var ui = ui_();
  if (ui) ui.alert('غنی‌سازیِ اینترنتی', m, ui.ButtonSet.OK); else console.log(m);
  return st;
}

// ------------------------------- تولیدِ دستی، ولی با غنی‌سازیِ اینترنتی

/**
 * وقتی از منو یک قسمت می‌سازید، ساعت هر چه باشد باید غنی‌سازی انجام شود.
 *
 * چرا این نشانه لازم شد: قاعدهٔ عادی می‌گوید «فقط وقتی منتظر بمان که مهلتِ
 * انتظار پیش از ساعتِ انتشار تمام شود». آن قاعده برای زمان‌بندیِ روزانه درست
 * است — نمی‌خواهیم پادکستِ ساعت هفت دیر برسد. ولی در تولیدِ دستیِ ساعت دو
 * بعدازظهر، همان قاعده یعنی «هیچ‌وقت غنی نکن»، که خواستهٔ شما نبود.
 *
 * نشانه یک‌بارمصرف است: همان اجرا مصرفش می‌کند، پس روی زمان‌بندیِ روزانه اثری
 * نمی‌گذارد.
 */
function setEnrichForce_() {
  // میلی‌ثانیهٔ خام، نه رشتهٔ تاریخ‌دار: مقایسهٔ یک رشتهٔ محلی با ساعتِ سامانه
  // به منطقهٔ زمانی و قالب وابسته است و در همان آزمون هم لو رفت.
  try { props_().setProperty(PK.ENRICH_FORCE, String(new Date().getTime())); } catch (e) {}
}

function takeEnrichForce_() {
  try {
    var v = props_().getProperty(PK.ENRICH_FORCE);
    if (!v) return false;
    props_().deleteProperty(PK.ENRICH_FORCE);
    // نشانه فقط تا چند دقیقه معتبر است. اگر به هر دلیل روی زمین مانده باشد
    // (اجرا وسطِ کار قطع شده، خطایی که نگرفتیم)، نباید تولیدِ زمان‌بندی‌شدهٔ
    // فردا صبح را برباید و پادکست را تا نود دقیقه عقب بیندازد.
    var at = Number(v);
    // مقدارِ ناخوانا هم «کهنه» است: نشانه‌ای که نمی‌دانیم کِی گذاشته شده، حق
    // ندارد تولیدِ زمان‌بندی‌شده را برباید.
    if (!isFinite(at) || (new Date().getTime() - at) > 15 * 60000) {
      logLine_('نشانهٔ «غنی‌سازیِ دستی» کهنه یا ناخوانا بود و نادیده گرفته شد.');
      return false;
    }
    return true;
  } catch (e) { return false; }
}

/**
 * منو: «ساخت قسمت با غنی‌سازیِ اینترنتی».
 * متن نوشته می‌شود، درخواست گذاشته می‌شود، و صدا بعد از رسیدنِ پاسخ (یا پایانِ
 * مهلت) خودش ساخته می‌شود — بی دروازهٔ ساعت، چون شما همین حالا خواستیدش.
 */
/** آیا نشانهٔ «تولیدِ دستی» هست و تازه است؟ (بی مصرف‌کردنش) */
function enrichForcePending_() {
  try {
    var v = props_().getProperty(PK.ENRICH_FORCE);
    if (!v) return false;
    var at = Number(v);
    return isFinite(at) && (new Date().getTime() - at) <= 15 * 60000;
  } catch (e) { return false; }
}

function runProduceEnriched_(show) {
  var ui = ui_();
  var nm = enrichShowName_(show);
  if (ui) {
    var ans = ui.alert('ساخت «' + nm + '» با غنی‌سازیِ اینترنتی',
      'متنِ قسمت همین حالا نوشته می‌شود و برای Cowork گذاشته می‌شود تا در وب ' +
      'جست‌وجو کند و تکمیلش کند. صداگذاری بعد از رسیدنِ پاسخ خودش شروع می‌شود.\n\n' +
      'Cowork هر ساعت سری به پوشه می‌زند، پس معمولاً تا حدود یک ساعت پاسخ می‌رسد. ' +
      'اگر تا ' + (CFG.ENRICH_WAIT_MIN || 90) + ' دقیقه نرسید، قسمت با همان محتوای ' +
      'اصلی ساخته می‌شود و دلیلش در ایمیل نوشته می‌شود.\n\n' +
      'ادامه بدهم؟', ui.ButtonSet.YES_NO);
    if (ans !== ui.Button.YES) return { cancelled: true };
  }
  setEnrichForce_();
  var r;
  try {
    r = (show === ENRICH_SHOW_SPECIAL) ? produceSpecialEpisode({ manual: true })
                                       : produceEpisode({ manual: true });
  } catch (e) {
    r = { ok: false, reason: 'error', detail: e.message };
  }
  // نشانه در هر حالت مصرف می‌شود، نه فقط وقتی استثنا رخ دهد.
  // produceEpisode می‌تواند بی هیچ استثنایی برگردد («قسمتِ قبلی در جریان است»،
  // «محتوایی نبود»)، و آن‌وقت نشانه روی زمین می‌ماند و اجرای زمان‌بندیِ ساعت
  // هفت را می‌رباید: دروازهٔ ساعت را برایش نمی‌گذارد و پادکست تا نود دقیقه دیر
  // می‌شود. یک نشانهٔ جامانده، یک پادکستِ دیر.
  takeEnrichForce_();
  var m;
  if (r && r.ok) {
    m = 'متنِ قسمت ' + r.episode + ' نوشته شد و درخواستِ غنی‌سازی گذاشته شد.\n\n' +
        'از این‌جا خودکار است: به‌محضِ رسیدنِ پاسخ، صدا ساخته و ایمیل و تلگرام ' +
        'فرستاده می‌شود. لازم نیست شیت باز بمانَد.\n\n' +
        'برای دیدنِ وضعیت: منو → «🌐 وضعیتِ غنی‌سازیِ اینترنتی».';
  } else {
    m = 'قسمتی ساخته نشد: ' + ((r && (r.detail || r.reason)) || 'نامعلوم') +
        (r && r.reason === 'busy' ? '\n(قسمتِ قبلی هنوز در حال ساخت است)' : '');
  }
  if (ui) ui.alert('ساخت با غنی‌سازی', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}

function runProduceVarietyEnriched() { return runProduceEnriched_(ENRICH_SHOW_VARIETY); }
function runProduceSpecialEnriched() { return runProduceEnriched_(ENRICH_SHOW_SPECIAL); }
