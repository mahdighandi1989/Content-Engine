/**
 * 10_Sources.gs — منابع تازه: چند شیت، چند تب، فایل‌های تکه‌تکه‌شده
 *
 * سه شیت تازه (Trading-Processor، General-Processor، RESULT-VIDEO) با دو شیت اول
 * فرق دارند:
 *   ۱) هر شیت چند تب دارد — ویدیو، صدا، تصویر، سند — و تب‌های جانبی هم دارد
 *      که محتوای مستقل ندارند (تاریخچهٔ نمودار، کد، آزمون، …) و باید رد شوند.
 *   ۲) فایل‌های بزرگ تکه‌تکه تحلیل شده‌اند: هر قطعه یک ردیف، و در آخر یک ردیف
 *      «جمع‌بندی» با وضعیت COMPLETED.
 *
 * نکتهٔ تعیین‌کننده که از بررسی دادهٔ واقعی درآمد: ردیفِ جمع‌بندی همه‌جا یکسان نیست.
 *   • در General-Processor ردیف جمع‌بندی «غنی» است — خلاصهٔ اجرایی، نکات کلیدی،
 *     ایده‌های محوری و اصطلاحات کاملِ فایل در همان ردیف نوشته شده.
 *   • در Trading-Processor و RESULT-VIDEO ردیف جمع‌بندی فقط یک «نشانگر» است:
 *     متن پیاده‌سازی «ترکیب از همه قطعات»، خلاصه «۳۴/۳۴ قطعه موفق». محتوای واقعی
 *     تنها در ردیف‌های قطعه است.
 * پس موتور باید هر دو حالت را بشناسد: ردیف غنی را مستقیم بردارد، و در حالت نشانگر
 * خودش قطعه‌ها را بر اساس «شناسه فایل» گروه کند، با «شماره قطعه» مرتب کند —
 * حتی اگر قطعه‌ها پراکنده و بین ردیف‌های فایل‌های دیگر باشند — و یک آیتم واحد بسازد.
 *
 * شیت‌های منبع در هیچ حالتی نوشته یا تغییر داده نمی‌شوند؛ انبارِ موقتِ قطعه‌ها
 * یک تب در همان CONTENT-HUB است.
 */

var K_VIDEO = 'ویدیو', K_PHOTO = 'عکس', K_AUDIO = 'صدا', K_DOC = 'سند';
var CHUNK_YES = 'بله', CHUNK_NO = 'خیر';

/** برچسب فارسیِ نوع، از هر شکلی که رکورد ساخته شده باشد. */
function kindLabel_(k) {
  if (k === 'video') return K_VIDEO;
  if (k === 'photo' || k === 'image') return K_PHOTO;
  if (k === 'audio') return K_AUDIO;
  if (k === 'document' || k === 'doc') return K_DOC;
  return k || K_PHOTO;
}

// ------------------------------------------------- تشخیص ساختارِ خودکار تب

function hdrSet_(headers) {
  var H = {};
  for (var i = 0; i < headers.length; i++) H[normHeader_(headers[i])] = true;
  return H;
}

function srcHas_(H, name) { return !!H[normHeader_(name)]; }

/**
 * نوعِ محتوای یک تب را از امضای سرستون‌هایش تشخیص می‌دهد.
 * ترتیبِ بررسی مهم است: تب ویدیو هم ستون «متن پیاده‌سازی» دارد، پس اگر اول
 * دنبال متنِ گفتار می‌گشتیم، تب ویدیو را «صدا» می‌شناختیم.
 * خروجی null یعنی این تب محتوای مستقل ندارد و باید رد شود.
 */
function srcDetect_(headers) {
  var H = hdrSet_(headers);
  if (!srcHas_(H, 'File_ID') && !srcHas_(H, 'File ID')) return null;

  // تب‌های جانبی: خروجیِ ترکیبیِ چند فایل دیگرند، نه یک فایلِ منبع
  if (srcHas_(H, 'Source_Files')) return null;

  var chunked = srcHas_(H, 'Is_Chunk') || srcHas_(H, 'آیا قطعه است؟');

  if (srcHas_(H, 'Image_Basic_Info') || srcHas_(H, 'اطلاعات پایه تصویر'))
    return { kind: K_PHOTO, chunked: false };

  if (srcHas_(H, 'Document_Info') || srcHas_(H, 'Full_Text_Extraction'))
    return { kind: K_DOC, chunked: chunked };

  if (srcHas_(H, 'Visual_Analysis') || srcHas_(H, 'تحلیل بصری'))
    return { kind: K_VIDEO, chunked: chunked };

  if (srcHas_(H, 'Speaker_Diarization') || srcHas_(H, 'شناسایی گویندگان') ||
      srcHas_(H, 'Full_Transcription') || srcHas_(H, 'متن کامل پیاده‌سازی شده'))
    return { kind: K_AUDIO, chunked: chunked };

  // پشتیبان: تبی که مدت و حال‌وهوا دارد ولی امضای بالا را ندارد، ویدیوست
  if ((srcHas_(H, 'Duration') || srcHas_(H, 'مدت زمان')) &&
      (srcHas_(H, 'Vibe_Atmosphere') || srcHas_(H, 'فضا و وایب')))
    return { kind: K_VIDEO, chunked: chunked };

  return null;
}

/**
 * ستون را با چند نامِ ممکن پیدا می‌کند. اول همهٔ نام‌ها را «دقیق» می‌گردد و
 * تنها اگر هیچ‌کدام دقیق پیدا نشد سراغ تطبیق جزئی می‌رود — وگرنه نامِ
 * «Executive_Summary» به‌عنوان زیررشته، ستونِ «General_Executive_Summary» را
 * می‌قاپید و اولویت نام‌ها بی‌معنا می‌شد.
 */
function findAny_(headers, needles) {
  var i, j;
  for (i = 0; i < needles.length; i++) {
    var n = normHeader_(needles[i]);
    for (j = 0; j < headers.length; j++) if (normHeader_(headers[j]) === n) return j;
  }
  for (i = 0; i < needles.length; i++) {
    var n2 = normHeader_(needles[i]);
    if (!n2) continue;
    for (j = 0; j < headers.length; j++) if (normHeader_(headers[j]).indexOf(n2) !== -1) return j;
  }
  return -1;
}

/** نگاشت عمومی ستون‌ها؛ هر فیلد چند نامِ ممکن دارد چون سه شیت سه قرارداد دارند. */
function srcMap_(headers) {
  return {
    date:     findAny_(headers, ['Timestamp', 'تاریخ پردازش']),
    fileId:   findAny_(headers, ['File_ID', 'File ID']),
    newName:  findAny_(headers, ['New_Name', 'نام جدید فایل']),
    oldName:  findAny_(headers, ['File_Name', 'نام اصلی فایل']),
    link:     findAny_(headers, ['File_Link', 'Drive_Link', 'لینک دسترسی']),

    isChunk:  findAny_(headers, ['Is_Chunk', 'آیا قطعه است؟']),
    chunkNo:  findAny_(headers, ['Chunk_Number', 'شماره قطعه']),
    chunkTot: findAny_(headers, ['Total_Chunks', 'Chunk_Total', 'تعداد کل قطعات']),

    domain:   findAny_(headers, ['Domain_Detected']),
    ctype:    findAny_(headers, ['Content_Type']),
    subject:  findAny_(headers, ['Main_Subject']),
    content:  findAny_(headers, ['Content_Analysis', 'تحلیل محتوا']),

    points:   findAny_(headers, ['Key_Points', 'نکات کلیدی', 'Key_Insights']),
    ideas:    findAny_(headers, ['Core_Ideas']),
    // پشتیبانِ «پیام کلیدی» برای تب‌هایی که ستون نکات کلیدی ندارند
    // (تب ویدیوی Trading-Processor و RESULT-VIDEO از این دسته‌اند).
    points2:  findAny_(headers, ['Professional_Insights', 'Concepts_Definitions',
                                 'Trading_Strategies', 'Educational_Analysis',
                                 'نکات حرفه‌ای', 'تحلیل تخصصی']),
    terms:    findAny_(headers, ['Terminology']),
    takeaway: findAny_(headers, ['Audience_Takeaway']),

    summary:  findAny_(headers, ['General_Executive_Summary', 'Executive_Summary', 'خلاصه اجرایی']),
    summary2: findAny_(headers, ['Trading_Executive_Summary', 'Trading_Image_Summary',
                                 'Content_Summary', 'خلاصه محتوا']),
    body:     findAny_(headers, ['Farsi_Transcription', 'Farsi_Translation', 'Full_Transcription',
                                 'Full_Text_Extraction', 'متن کامل پیاده‌سازی شده',
                                 'متن پیاده‌سازی شده', 'Text_Extraction', 'استخراج متن']),
    // نسخهٔ فارسیِ همان متن، در شیت‌هایی که هر دو را دارند
    body2:    findAny_(headers, ['Farsi_Translation', 'ترجمه فارسی', 'Farsi_Transcription']),
    vibe:     findAny_(headers, ['Vibe_Atmosphere', 'فضا و وایب']),
    expert:   findAny_(headers, ['Professional_Insights', 'Advanced_Insights', 'Educational_Analysis',
                                 'تحلیل تخصصی', 'نکات حرفه‌ای']),
    special:  findAny_(headers, ['Special_Notes', 'موارد ویژه']),

    seriesNm: findAny_(headers, ['Series_Name']),
    epSeq:    findAny_(headers, ['Episode_Seq']),
    status:   findAny_(headers, ['Status', 'وضعیت'])
  };
}

// ------------------------------------------------- متن‌سازی از فیلدهای JSON

// این شیت‌ها بخش بزرگی از تحلیل را به‌شکل JSON نگه می‌دارند: آرایه‌ای از رشته‌ها،
// یا آرایه‌ای از شیء‌هایی مثل {"idea":…, "explanation":…}. این کلیدها به ترتیب
// اهمیت خوانده می‌شوند تا متنی روان از دلشان بیرون بیاید.
var FLAT_KEYS = ['idea', 'explanation', 'term', 'definition', 'claim', 'context',
                 'point', 'title', 'text', 'description', 'summary',
                 'Main_Topic', 'Topic', 'Main_Subject', 'Key_Message', 'Description',
                 'Name', 'Role', 'intent', 'behavioral_expectation', 'cognitive_expectation'];

function flatOne_(x) {
  if (x === null || x === undefined) return '';
  if (typeof x === 'string' || typeof x === 'number') return String(x).trim();
  if (Object.prototype.toString.call(x) === '[object Array]') {
    var a = [];
    for (var i = 0; i < x.length; i++) { var s = flatOne_(x[i]); if (s) a.push(s); }
    return a.join('؛ ');
  }
  // شیء: اول کلیدهای شناخته‌شده، بعد هر مقدار متنیِ به‌قدر کافی بلند
  var parts = [], usedK = {};
  for (var k = 0; k < FLAT_KEYS.length; k++) {
    var key = FLAT_KEYS[k];
    if (x[key] === undefined || x[key] === null) continue;
    // بازگشتی، نه String(): اگر مقدار خودش شیء یا آرایه باشد، String() آن را
    // به «[object Object]» تبدیل می‌کرد و همان عبارت را گوینده بلند می‌خواند.
    var s1 = flatOne_(x[key]);
    if (s1) { parts.push(s1); usedK[key] = true; }
  }
  if (!parts.length) {
    for (var p in x) {
      if (!x.hasOwnProperty(p) || usedK[p]) continue;
      var v = x[p];
      if (typeof v === 'string' && v.trim().length >= 8) parts.push(v.trim());
      else if (v && typeof v === 'object') {
        var s2 = flatOne_(v);
        if (s2.length >= 8) parts.push(s2);
      }
    }
  }
  return parts.join(' — ');
}

// چیزهایی که خطِ لولهٔ منبع در سلول‌های محتوا گذاشته ولی محتوا نیستند: پیام
// «تحلیل خالی»، نشانگرِ وضعیت، و متنِ خطای خودِ پردازش. اگر این‌ها وارد خلاصه
// شوند، گوینده «نیاز به بازپردازش» یا «Unterminated string» را بلند می‌خواند.
var JUNK_PAT = /(نیاز به بازپردازش|خالی برگردانده|پیدا نشد|یافت نشد|همان متن اصلی|Unterminated string|^Error:|^(CHUNK[_ ]?\d+|COMPLETED|SUCCESS|FAILED|N\/?A|none|null|undefined)$)/i;

/** نسبتِ حروف فارسی به کل حروف — برای انتخاب بینِ ستونِ فارسی و ستونِ انگلیسی. */
function faScore_(s) {
  var t = String(s || '');
  var fa = (t.match(/[؀-ۿ]/g) || []).length;
  var la = (t.match(/[A-Za-z]/g) || []).length;
  if (!fa && !la) return 0;
  return fa / (fa + la);
}

/**
 * از دو نامزد، فارسی‌ترِ آن‌ها را برمی‌دارد.
 * لازم است چون در شیت RESULT-VIDEO بعضی ردیف‌ها «خلاصه اجرایی» را انگلیسی
 * نوشته‌اند و «خلاصه محتوا» را فارسی (و در ردیف‌های دیگر برعکس). محصول نهایی
 * یک پادکستِ فارسی است، پس متنِ فارسی باید مبنا باشد؛ اگر هیچ‌کدام فارسی
 * نبود، همان متنِ موجود می‌ماند و مدل در نگارش ترجمه‌اش می‌کند.
 */
function pickFa_(a, b) {
  a = String(a || '').trim(); b = String(b || '').trim();
  if (!a) return b;
  if (!b) return a;
  var fa = faScore_(a), fb = faScore_(b);
  if (fb > fa + 0.25 && b.length >= Math.min(120, a.length * 0.5)) return b;
  return a;
}

/** هر مقدار (رشته یا JSON) را به متنِ خواندنی تبدیل می‌کند و می‌بُرد. */
function flatText_(v, cap) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return '';
  var out = s;
  if (s.charAt(0) === '[' || s.charAt(0) === '{') {
    try { out = flatOne_(JSON.parse(s)); } catch (e) { out = s; }
  }
  out = out.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (JUNK_PAT.test(out) && out.length < 140) return '';
  return cap ? out.slice(0, cap) : out;
}

// ----------------------------------------------------------- ساخت رکورد خام

/** لینک درایو همیشه از شناسهٔ فایل قابل ساخت است — پس نبودِ ستون لینک مانع نیست. */
function driveLink_(fileId) {
  return fileId ? 'https://drive.google.com/file/d/' + fileId + '/view' : '';
}

// نامِ فایل «موضوع» نیست. بعضی تب‌ها ستون موضوع ندارند و بی این وارسی، عنوان
// آیتم چیزی مثل «01_Astrology_HomayoonFarzaneh.mp4» می‌شد — که نه برای
// دسته‌بندی به کار می‌آید و نه برای گوینده.
var FNAME_PAT = /\.(mp3|mp4|m4a|wav|ogg|aac|flac|mkv|avi|mov|webm|pdf|docx?|pptx?|xlsx?|txt|csv|jpe?g|png|gif|webp)\s*$/i;
function looksLikeFile_(s) {
  var t = String(s || '').trim();
  if (!t) return true;
  if (FNAME_PAT.test(t)) return true;
  // یک تکه‌واژهٔ لاتین بدون فاصله، فقط وقتی «نام فایل» است که نشانهٔ نام فایل
  // داشته باشد — زیرخط یا رقم. وگرنه واژه‌های درستی مثل Bitcoin یا RSI هم
  // نام فایل حساب می‌شدند و موضوعِ درست دور ریخته می‌شد.
  return /^[\w.\-]+$/.test(t) && (t.indexOf('_') !== -1 || /\d/.test(t));
}

/** نخستین جملهٔ کامل یک متن — جانشینِ خوبی برای «موضوع» وقتی ستونش نیست. */
function firstSentence_(s, cap) {
  var t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  cap = cap || 220;
  var m = t.match(/^[\s\S]{25,220}?[.!?؟…](\s|$)/);
  return (m ? m[0] : t).replace(/[\s.]+$/, '').slice(0, cap);
}

/**
 * اطلاعات قطعه‌بودن یک ردیف.
 * ستون «آیا قطعه است؟» در شیت‌های فعلی «بله»/«خیر» است، ولی چون سرستونِ
 * انگلیسی (Is_Chunk) هم پشتیبانی می‌شود، مقدارهای انگلیسی و بولی هم پذیرفته
 * می‌شوند — وگرنه یک TRUE ساده، همهٔ قطعه‌های آن فایل را از مسیرِ درست خارج می‌کرد.
 */
/** ارقام فارسی و عربی را به لاتین برمی‌گرداند تا parseFloat بفهمدشان. */
function faDigits_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 1776); })
    .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
    // ممیزِ فارسی (٫) و جداکنندهٔ هزارگان (٬). بی این دو، «۳۰٫۵» به «305»
    // تبدیل می‌شد — یعنی امتیازِ سی‌ونیم، سه‌صدوپنج خوانده می‌شد.
    .replace(/\u066B/g, '.').replace(/\u066C/g, '');
}

function chunkOf_(row, m) {
  var raw = m.isChunk >= 0 ? cell_(row, m.isChunk) : '';
  var flag = String(raw).trim().toLowerCase();
  var yes = (flag === 'بله' || flag === 'بلی' || flag === 'true' || flag === 'yes' ||
             flag === 'y' || flag === '1');
  var no_ = (flag === 'خیر' || flag === 'نه' || flag === 'false' || flag === 'no' ||
             flag === 'n' || flag === '0');
  // سرستون‌های این تب‌ها فارسی‌اند، پس شمارهٔ قطعه هم ممکن است با رقم فارسی
  // نوشته شده باشد؛ parseFloat('۷') برابر NaN است و بی این تبدیل، آن فایل
  // فقط شصت قطعهٔ اولش نگه داشته می‌شد.
  var n = m.chunkNo >= 0 ? Math.round(parseFloat(faDigits_(cell_(row, m.chunkNo)))) : 0;
  var t = m.chunkTot >= 0 ? Math.round(parseFloat(faDigits_(cell_(row, m.chunkTot)))) : 0;
  if (isNaN(n) || n < 0) n = 0;
  // «تعداد کل قطعات» بی‌معنا (منفی یا نجومی) یعنی ستون اشتباه گرفته شده یا سلول
  // خراب است؛ آن‌وقت بهتر است بگوییم نمی‌دانیم تا اینکه بر پایه‌اش تصمیم بگیریم.
  if (isNaN(t) || t < 0 || t > 20000) t = 0;
  return { isChunk: yes, isRollup: no_, flag: String(raw).trim(), no: n, total: t };
}

/** ردیف را — قطعه یا جمع‌بندی — به رکورد استاندارد موتور تبدیل می‌کند. */
function buildAutoRec_(row, m, kind, hint) {
  var c = m.content >= 0 ? jparse_(cell_(row, m.content)) : {};

  var label = [];
  if (hint) label.push(hint);          // موضوعِ اعلام‌شدهٔ خودِ شیت
  if (m.domain >= 0 && cell_(row, m.domain)) label.push(cell_(row, m.domain));
  if (m.ctype >= 0 && cell_(row, m.ctype)) label.push(cell_(row, m.ctype));
  if (label.length === (hint ? 1 : 0)) {
    if (c.Category) label.push(flatOne_(c.Category));
    if (c.Genre) label.push(flatOne_(c.Genre));
  }

  var msg = [];
  if (m.points >= 0) msg.push(flatText_(cell_(row, m.points), 0));
  if (m.ideas >= 0) msg.push(flatText_(cell_(row, m.ideas), 0));
  if (!msg.join('')) {
    // این شیت‌ها پیام را با دو نام می‌نویسند: Key_Message یا Message
    if (c.Key_Message) msg.push(flatOne_(c.Key_Message));
    else if (c.Message) msg.push(flatOne_(c.Message));
  }
  if (!msg.join('') && m.points2 >= 0) msg.push(flatText_(cell_(row, m.points2), 0));
  if (!msg.join('') && m.takeaway >= 0) msg.push(flatText_(cell_(row, m.takeaway), 0));

  var summ = pickFa_(m.summary >= 0 ? flatText_(cell_(row, m.summary), 0) : '',
                     m.summary2 >= 0 ? flatText_(cell_(row, m.summary2), 0) : '');
  if (!summ && m.terms >= 0) summ = flatText_(cell_(row, m.terms), 0);

  // موضوع: ستونِ موضوع → کلیدهای JSONِ تحلیل محتوا → نخستین جملهٔ خلاصه →
  // و تنها در آخرین حالت، نام فایل.
  var topic = (m.subject >= 0 ? cell_(row, m.subject) : '') ||
              flatOne_(c.Main_Topic) || flatOne_(c.Main_Subject) || flatOne_(c.Topic) || '';
  if (looksLikeFile_(topic)) {
    var alt = firstSentence_(summ, 220) || firstSentence_(msg.join(' '), 220);
    if (alt) topic = alt;
    else topic = topic || (m.newName >= 0 ? cell_(row, m.newName) : '') ||
                          (m.oldName >= 0 ? cell_(row, m.oldName) : '');
  }

  var rec = {
    kind: kind,
    fileId: m.fileId >= 0 ? cell_(row, m.fileId).trim() : '',
    date: m.date >= 0 ? canonDate_(row[m.date]) : '',
    rawLabel: label.join('، '),
    topic: String(topic),
    keyMessage: msg.filter(String).join('؛ '),
    summary: summ,
    body: pickFa_(m.body >= 0 ? flatText_(cell_(row, m.body), 0) : '',
                  m.body2 >= 0 && m.body2 !== m.body ? flatText_(cell_(row, m.body2), 0) : ''),
    vibe: (m.vibe >= 0 ? cell_(row, m.vibe) : '') || (m.ctype >= 0 ? cell_(row, m.ctype) : ''),
    expert: [m.expert >= 0 ? flatText_(cell_(row, m.expert), 0) : '',
             m.special >= 0 ? flatText_(cell_(row, m.special), 0) : ''].filter(String).join(' '),
    status: m.status >= 0 ? cell_(row, m.status) : ''
  };
  rec.link = (m.link >= 0 ? cell_(row, m.link) : '') || driveLink_(rec.fileId);

  // نامِ مجموعه: برای فایل‌های آموزشیِ سری‌دار، همین یک قلم بیشترین کمک را به
  // پیوندِ معنایی می‌کند — دو قسمتِ یک دوره واقعاً به هم مربوط‌اند.
  var sn = m.seriesNm >= 0 ? cell_(row, m.seriesNm).trim() : '';
  var sq = m.epSeq >= 0 ? cell_(row, m.epSeq).trim() : '';
  rec.series = sn ? (sn + (sq ? ' — قسمت ' + sq : '')) : '';

  return rec;
}

/** طبقه‌بندی و امتیازدهی رکورد (بعد از اینکه متنش نهایی شد). */
function classifyRec_(rec) {
  var extra = rec.summary + ' ' + (rec.vibe || '') + ' ' + (rec.expert || '');
  var cls = txClassify(rec.rawLabel, rec.topic, rec.keyMessage, extra);

  // تاکسونومی با واژه‌های فارسی می‌سنجد. در شیت RESULT-VIDEO بخشی از ردیف‌ها
  // خلاصه و نکاتشان انگلیسی است ولی «متن پیاده‌سازی شده»شان فارسی — با تلاش
  // اول، همهٔ آن‌ها در «متفرقه» می‌افتادند. اگر متنِ تحلیل انگلیسی بود، یک بار
  // دیگر با متنِ فارسیِ خودِ فایل می‌سنجیم و اگر نتیجه‌دار بود همان را می‌گیریم.
  if (cls.title === MISC_TITLE && faScore_(rec.topic + ' ' + rec.keyMessage) < 0.5 &&
      faScore_(rec.body) > 0.5 && String(rec.body).length > 200) {
    var fa = String(rec.body);
    var cls2 = txClassify(rec.rawLabel, fa.slice(0, 900), fa.slice(900, 2400), fa);
    if (cls2.title !== MISC_TITLE) cls = cls2;
  }

  rec.cat = cls.title;
  rec.sub = cls.secondTitle;
  // txPriority پاداشِ نوع را فقط به 'video' می‌دهد؛ برچسب فارسی را برایش ترجمه می‌کنیم
  rec.score = txPriority({
    summary: rec.summary, keyMessage: rec.keyMessage, body: rec.body, vibe: rec.vibe,
    kind: (rec.kind === K_VIDEO ? 'video' : 'other'), link: rec.link, rawLabel: rec.rawLabel
  });
  return rec;
}

// نشانگرهای ردیفِ جمع‌بندیِ «تو‌خالی». این‌ها را خودِ خط لولهٔ کاربر می‌نویسد:
// «ترکیب از همه قطعات» در ستون متن و «۳۴/۳۴ قطعه موفق» در ستون خلاصه.
var STUB_PAT = /(ترکیب از همه قطعات|ترکیب قطعات|^\s*تکمیل شده\s*$|قطعه موفق|قطعه صوتی|قطعه ویدیویی)/;

/**
 * آیا این ردیفِ جمع‌بندی، تحلیلِ واقعیِ فایل را دارد یا فقط نشانگرِ «تمام شد» است؟
 * اگر نشانگر باشد، محتوا باید از قطعه‌ها ساخته شود.
 */
function isStubRollup_(rec) {
  var s = String(rec.summary || '').trim();
  var b = String(rec.body || '').trim();
  var m = String(rec.keyMessage || '').trim();
  if (STUB_PAT.test(s) || STUB_PAT.test(b)) return true;
  // آستانهٔ طول عمداً خیلی پایین است. اگر سخت‌گیرانه‌تر بود، یک ردیف جمع‌بندیِ
  // واقعی ولی کوتاه هم «نشانگر» شناخته می‌شد و به‌جای استفادهٔ مستقیم، از مسیر
  // انبار رد می‌شد و به سقفِ پانصد نویسه‌ایِ قطعه‌ها بریده می‌شد.
  return (s.length + m.length + b.length) < 80;
}

// ------------------------------------------------------- انبارِ موقتِ قطعه‌ها

var CHUNK_HEADERS = [
  'منبع', 'تب', 'شناسه فایل', 'نوع', 'شماره قطعه', 'تعداد قطعات', 'تاریخ',
  'برچسب خام', 'موضوع', 'پیام کلیدی', 'خلاصه', 'متن', 'وایب', 'لینک', 'مجموعه',
  'تاریخ ثبت'
];
var CH = { SRC: 0, TAB: 1, ID: 2, KIND: 3, NO: 4, TOT: 5, DATE: 6, RAW: 7, TOPIC: 8,
           MSG: 9, SUMMARY: 10, BODY: 11, VIBE: 12, LINK: 13, SERIES: 14, ADDED: 15 };

// سقفِ هر قطعه در انبار. بی این سقف، یک سندِ صد‌قطعه‌ای با متنِ یازده‌هزار
// نویسه‌ای در هر قطعه، تبِ انبار را به مگابایت می‌رساند.
var CHUNK_CAP = { topic: 200, msg: 500, summary: 500, body: 500, vibe: 120 };

function ensureChunkTab_(hub) {
  var sh = ensureTab_(hub, CFG.CHUNK_TAB, CHUNK_HEADERS);
  if (!sh.__dateFmt) {
    // ستون‌های تاریخ باید «متن» بمانند. Google Sheets رشتهٔ تاریخ را هنگام نوشتن
    // به مقدار Date تبدیل می‌کند و موقع خواندن، String(Date) چیزی مثل
    // «Sun Jun 01 2025 …» می‌دهد که هم در شیت زشت است و هم مرتب‌سازیِ
    // «تازه‌ترین قطعه» را به هم می‌ریزد (بر اساس نام روز هفته مرتب می‌شد).
    try {
      sh.getRange(1, CH.DATE + 1, sh.getMaxRows(), 1).setNumberFormat('@');
      sh.getRange(1, CH.ADDED + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    } catch (e) { /* اگر شیت اجازه نداد، canonDate_ هنگام خواندن جبران می‌کند */ }
    sh.__dateFmt = true;
  }
  return sh;
}

// نمونه‌برداری از قطعه‌ها وقتی تعدادشان از سقف بگذرد. گام یکنواخت است تا
// نمونه‌ها سراسرِ فایل را پوشش بدهند، و قطعهٔ آخر همیشه می‌آید (جمع‌بندیِ گوینده
// معمولاً همان‌جاست).
/** شمارِ نمونه‌ها برای یک گام مشخص: ۱، ۱+گام، ۱+۲گام، … به‌علاوهٔ قطعهٔ آخر. */
function chunkCount_(total, st) {
  if (!total) return 0;
  if (st <= 1) return total;
  var n = Math.floor((total - 1) / st) + 1;
  if ((total - 1) % st !== 0) n++;
  return n;
}
function chunkStride_(total) {
  var cap = CFG.CHUNK_MAX_PER_FILE || 60;
  if (!total || total <= cap) return 1;
  var st = Math.ceil(total / cap);
  // گامِ سرانگشتی گاهی یکی بیشتر از سقف می‌دهد (چون قطعهٔ آخر جداگانه می‌آید)
  while (st < total && chunkCount_(total, st) > cap) st++;
  return st;
}
function chunkSampled_(no, total) {
  var st = chunkStride_(total);
  if (st === 1) return true;
  return (no % st === 1) || no === total;
}
/** شمارِ قطعه‌هایی که با گامِ نمونه‌برداری انتظار داریم — بدون حلقه روی قطعه‌ها. */
function chunkExpected_(total) {
  return chunkCount_(total, chunkStride_(total));
}

function chunkGroupKey_(srcKey, tab, fileId) { return srcKey + '§' + tab + '§' + fileId; }

/** ردیفِ انبار از یک رکوردِ قطعه. شمارهٔ صفر یعنی «نشانگرِ جمع‌بندی». */
function chunkRow_(srcKey, tab, rec, no, total) {
  return [srcKey, tab, rec.fileId, rec.kind, no, total, rec.date,
          String(rec.rawLabel || '').slice(0, 200),
          String(rec.topic || '').slice(0, CHUNK_CAP.topic),
          String(rec.keyMessage || '').slice(0, CHUNK_CAP.msg),
          String(rec.summary || '').slice(0, CHUNK_CAP.summary),
          String(rec.body || '').slice(0, CHUNK_CAP.body),
          String(rec.vibe || '').slice(0, CHUNK_CAP.vibe),
          rec.link || '', rec.series || '', nowStr_()];
}

/** کلیدهای موجود در انبار، تا اسکنِ دوباره قطعه‌های تکراری نسازد. */
function loadChunkKeys_(hub) {
  var sh = ensureChunkTab_(hub);
  var keys = {}, counts = {};
  var last = sh.getLastRow();
  if (last < 2) return { keys: keys, counts: counts };
  var v = sh.getRange(2, 1, last - 1, CH.NO + 1).getValues();
  for (var i = 0; i < v.length; i++) {
    if (!v[i][CH.ID]) continue;
    var g = chunkGroupKey_(v[i][CH.SRC], v[i][CH.TAB], v[i][CH.ID]);
    keys[g + '§' + v[i][CH.NO]] = true;
    if (Number(v[i][CH.NO]) > 0) counts[g] = (counts[g] || 0) + 1;
  }
  return { keys: keys, counts: counts };
}

// -------------------------------------------------- ترکیبِ قطعه‌ها به یک آیتم

/**
 * از فهرستی مرتب، نمونه‌ای می‌گیرد که سراسرِ فایل را پوشش بدهد — نه فقط اولش.
 * برای یک سخنرانیِ سی‌وچهار قطعه‌ای، بریدنِ ساده از ابتدا فقط مقدمه را نگه
 * می‌داشت و نویسندهٔ قسمت هرگز نمی‌فهمید بحث به کجا رسیده.
 */
function joinSpread_(list, cap) {
  var vals = [];
  for (var i = 0; i < list.length; i++) { var s = String(list[i] || '').trim(); if (s) vals.push(s); }
  if (!vals.length) return '';
  if (vals.length === 1) return vals[0].slice(0, cap);

  var per = 160;
  var k = Math.max(2, Math.min(vals.length, Math.floor(cap / per)));
  var pick = [];
  if (k >= vals.length) { pick = vals; }
  else {
    for (var j = 0; j < k; j++) pick.push(vals[Math.round(j * (vals.length - 1) / (k - 1))]);
  }
  var budget = Math.max(per, Math.floor(cap / pick.length));
  var out = [];
  for (var p = 0; p < pick.length; p++) out.push(pick[p].slice(0, budget));
  return out.join(' … ').slice(0, cap);
}

/** اجتماعِ نکته‌های قطعه‌ها، بدون تکرار و به ترتیبِ اصلی. */
function dedupeLines_(list, cap) {
  var seen = {}, out = [], total = 0;
  for (var i = 0; i < list.length; i++) {
    var parts = String(list[i] || '').split(/[؛;]\s*/);
    for (var j = 0; j < parts.length; j++) {
      var s = parts[j].trim();
      if (s.length < 12) continue;
      var key = txNorm(s).slice(0, 60);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(s);
      total += s.length + 2;
      if (total >= cap) return out.join('؛ ').slice(0, cap);
    }
  }
  return out.join('؛ ').slice(0, cap);
}

/**
 * یک گروهِ قطعه را به یک آیتمِ واحد تبدیل می‌کند.
 * ورودی، ردیف‌های انبارِ همان فایل است — که همین‌جا بر اساس «شماره قطعه»
 * مرتب می‌شوند، پس پراکنده‌بودنشان در شیت منبع هیچ اهمیتی ندارد.
 */
function assembleGroup_(rows) {
  var marker = null, parts = [];
  for (var i = 0; i < rows.length; i++) {
    if (Number(rows[i][CH.NO]) === 0) marker = rows[i]; else parts.push(rows[i]);
  }
  parts.sort(function (a, b) { return Number(a[CH.NO]) - Number(b[CH.NO]); });
  if (!parts.length && !marker) return null;
  var src = parts.length ? parts : [marker];

  var col = function (idx) {
    var a = [];
    for (var j = 0; j < src.length; j++) a.push(String(src[j][idx] || ''));
    return a;
  };
  var firstOf = function (idx) {
    for (var j = 0; j < src.length; j++) if (String(src[j][idx] || '').trim()) return String(src[j][idx]).trim();
    return '';
  };

  // موضوع. هر قطعه موضوعِ خودش را دارد (بخشی از فایل)، پس رأی اکثریت بی‌معناست:
  // با ۳۴ موضوعِ متفاوت، برنده می‌شود همان چیزی که در چند ردیفِ بی‌تحلیل تکرار
  // شده — یعنی نام فایل. پس موضوعِ نخستین قطعه‌ای که موضوعِ واقعی دارد را
  // برمی‌داریم (قطعهٔ اول معمولاً می‌گوید کلِ فایل دربارهٔ چیست).
  var tops = col(CH.TOPIC), topic = '';
  for (var t = 0; t < tops.length; t++) {
    if (!looksLikeFile_(tops[t])) { topic = tops[t].trim(); break; }
  }
  if (!topic) topic = firstOf(CH.TOPIC);

  var series = firstOf(CH.SERIES);
  if (series && topic.indexOf(series.split(' — ')[0]) === -1) topic = series + ' | ' + topic;

  // محورهای فایل: موضوعِ قطعه‌ها به ترتیب، بدون تکرار. برای یک درسِ سی‌وچهار
  // قطعه‌ای، همین فهرست «قوسِ» فایل را نشان می‌دهد — از معرفی تا جمع‌بندی.
  var spine = [];
  for (var q = 0; q < tops.length; q++) if (!looksLikeFile_(tops[q])) spine.push(tops[q]);

  // تاریخ: ترجیحاً تاریخِ ردیف جمع‌بندی، وگرنه تازه‌ترین تاریخِ قطعه‌ها.
  // هر دو از canonDate_ رد می‌شوند تا اگر شیت مقدار را به Date تبدیل کرده باشد
  // به همان قالبِ متنیِ یکسانِ بقیهٔ بانک برگردد، و مقایسه هم زمانی باشد نه الفبایی.
  var bestDate = marker ? canonDate_(marker[CH.DATE]) : '';
  if (!bestDate) {
    var bestMs = -1;
    for (var dz = 0; dz < src.length; dz++) {
      var cd = canonDate_(src[dz][CH.DATE]);
      if (!cd) continue;
      var ms = parseWhen_(cd);
      if (isNaN(ms)) { if (!bestDate) bestDate = cd; continue; }
      if (ms > bestMs) { bestMs = ms; bestDate = cd; }
    }
  }

  var rec = {
    kind: firstOf(CH.KIND) || K_VIDEO,
    fileId: String(src[0][CH.ID]),
    date: bestDate,
    link: (marker ? String(marker[CH.LINK]) : '') || firstOf(CH.LINK) || driveLink_(String(src[0][CH.ID])),
    rawLabel: firstOf(CH.RAW),
    topic: topic.slice(0, 600),
    keyMessage: dedupeLines_(spine.concat(col(CH.MSG)), 900),
    summary: joinSpread_(col(CH.SUMMARY), 1800),
    body: joinSpread_(col(CH.BODY), 1500),
    vibe: firstOf(CH.VIBE),
    expert: '',
    status: 'COMPLETED',
    series: series,
    parts: parts.length,
    total: Math.max.apply(null, [0].concat(col(CH.TOT).map(Number)))
  };
  if (!rec.summary) rec.summary = rec.keyMessage.slice(0, 1800);
  return classifyRec_(rec);
}

/**
 * انبار را می‌خواند، گروه‌های «کامل» را به آیتم تبدیل می‌کند و ردیف‌هایشان را
 * از انبار پاک می‌کند. گروه کامل است اگر نشانگر جمع‌بندی رسیده باشد، یا همهٔ
 * قطعه‌ها آمده باشند، یا آن‌قدر کهنه شده باشد که انتظارِ بیشتر بی‌معنا باشد
 * (فایلی که خط لولهٔ منبع نیمه‌کاره رهایش کرده).
 */
function assembleChunks_(hub, seenById) {
  var sh = ensureChunkTab_(hub);
  var last = sh.getLastRow();
  if (last < 2) return { items: [], pending: 0, keep: null, forced: 0, dropped: 0 };

  var vals = sh.getRange(2, 1, last - 1, CHUNK_HEADERS.length).getValues();
  var groups = {}, order = [];
  for (var i = 0; i < vals.length; i++) {
    if (!vals[i][CH.ID]) continue;
    var g = chunkGroupKey_(vals[i][CH.SRC], vals[i][CH.TAB], vals[i][CH.ID]);
    if (!groups[g]) { groups[g] = []; order.push(g); }
    groups[g].push(vals[i]);
  }

  var now = new Date().getTime();
  var items = [], keep = [], pending = 0, forced = 0, dropped = 0;

  for (var o = 0; o < order.length; o++) {
    var rows = groups[order[o]];
    var hasMarker = false, total = 0, newest = 0, nParts = 0;
    for (var r = 0; r < rows.length; r++) {
      var no = Number(rows[r][CH.NO]) || 0;
      if (no === 0) hasMarker = true; else nParts++;
      var tt = Number(rows[r][CH.TOT]) || 0;
      if (tt > total) total = tt;
      var w = parseWhen_(rows[r][CH.ADDED]);
      if (!isNaN(w) && w > newest) newest = w;
    }
    // مهلت از «آخرین قطعه‌ای که رسید» شمرده می‌شود، نه از اولین. فایلی که
    // هنوز دارد قطعه می‌گیرد کهنه نیست؛ اگر از اولی می‌شمردیم، فایلی که
    // قطعه‌هایش در دو روز می‌آید نصفه‌کاره بسته می‌شد.
    var quiet = nParts > 0 && newest > 0 && (now - newest) / 3600000 >= CFG.CHUNK_WAIT_HOURS;
    var full = total > 0 && nParts >= chunkExpected_(total);
    var complete = (hasMarker && nParts > 0) || full || quiet;

    // اگر برای این فایل قبلاً آیتمی ساخته شده، قطعه‌ها دور ریخته می‌شوند
    if (seenById && seenById[String(rows[0][CH.ID])]) { dropped++; continue; }

    // نشانگرِ تنها: ردیف جمع‌بندی رسیده ولی هیچ قطعه‌ای انبار نشده. نشانگر
    // خودش محتوایی ندارد («۳۴/۳۴ قطعه موفق»)، پس ساختنِ آیتم از آن یعنی
    // یک آیتمِ توخالی که جای فایل واقعی را برای همیشه می‌گیرد. منتظر می‌مانیم.
    if (hasMarker && nParts === 0) {
      var mAge = (now - newest) / 3600000;
      if (newest > 0 && mAge >= CFG.CHUNK_WAIT_HOURS * 2) { dropped++; continue; }
      keep = keep.concat(rows); pending++; continue;
    }

    if (!complete) { keep = keep.concat(rows); pending++; continue; }
    if (quiet && !full && !hasMarker) forced++;

    var rec = assembleGroup_(rows);
    if (rec && rec.fileId) items.push(rec);
    else { keep = keep.concat(rows); pending++; }
  }

  // انبار همین‌جا پاک نمی‌شود. اول باید آیتم‌ها با موفقیت در تب دسته نوشته
  // شوند؛ اگر بین پاک‌کردن و نوشتن، اجرا کشته شود یا نوشتن خطا بدهد، قطعه‌ها
  // رفته‌اند و مکان‌نمای منبع هم جلوتر است — یعنی آن فایل برای همیشه گم می‌شد.
  return { items: items, pending: pending, keep: keep, forced: forced, dropped: dropped };
}

/**
 * پاک‌سازی انبار — فقط بعد از اینکه آیتم‌های ساخته‌شده با موفقیت نوشته شدند.
 * `keep` همان ردیف‌هایی است که باید بمانند.
 */
function purgeChunks_(hub, keep) {
  if (keep === null || keep === undefined) return;
  var sh = ensureChunkTab_(hub);
  var last = sh.getLastRow();
  if (last < 2) return;
  var need = (1 + keep.length) - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
  // اول ردیف‌های ماندنی را می‌نویسیم، بعد دُمِ اضافی را پاک می‌کنیم؛ این‌طور
  // در هیچ لحظه‌ای ردیفی «نه نوشته‌شده و نه پاک‌شده» نیست.
  if (keep.length) sh.getRange(2, 1, keep.length, CHUNK_HEADERS.length).setValues(keep);
  var tail = last - 1 - keep.length;
  if (tail > 0) sh.getRange(2 + keep.length, 1, tail, CHUNK_HEADERS.length).clearContent();
}

/** شمارِ گروه‌های در انتظار — برای گزارش سلامت. */
function chunkBacklog_(hub) {
  try {
    var sh = hub.getSheetByName(CFG.CHUNK_TAB);
    if (!sh || sh.getLastRow() < 2) return { rows: 0, files: 0 };
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, CH.ID + 1).getValues();
    var f = {}, n = 0;
    for (var i = 0; i < v.length; i++) {
      if (!v[i][CH.ID]) continue;
      n++; f[chunkGroupKey_(v[i][CH.SRC], v[i][CH.TAB], v[i][CH.ID])] = true;
    }
    return { rows: n, files: Object.keys(f).length };
  } catch (e) { return { rows: 0, files: 0 }; }
}
