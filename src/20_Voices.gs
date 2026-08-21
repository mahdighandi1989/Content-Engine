/**
 * 20_Voices.gs — گزینشِ گوینده و لحن، بر پایهٔ خودِ محتوا
 *
 * ══ چه چیزی اشتباه بود ══
 *
 * هر برنامه یک صدای ثابت داشت: «از همه جا از همه رنگ» با یک صدای مرد و
 * «درس‌نامه» با یک صدای زن. نتیجه‌اش دو مشکل بود. اول اینکه چندصدایی، که خودش
 * خوب است، به یک قاعدهٔ خشک تبدیل شده بود: «تخصصی = زن، متنوع = مرد». دوم
 * اینکه لحنِ اجرا به محتوا کاری نداشت؛ یک بندِ سوگ و یک بندِ آموزشِ فیزیک با
 * همان یک صدا و همان یک حالت خوانده می‌شدند.
 *
 * ══ چه چیزی جایش آمد ══
 *
 * برای هر قسمت یک «نقش‌گزینی» انجام می‌شود:
 *
 *   • یک گویندهٔ اصلی که بدنهٔ قسمت را می‌گوید، و یک یا دو گویندهٔ همراه برای
 *     تنوع. هر دو جنس در گردش‌اند و هیچ برنامه‌ای جنسیتِ ثابت ندارد.
 *   • انتخاب از رویِ «سرشتِ متن» است: مذهبی، سوگ، علمی، خبری، طنز، تاریخی،
 *     مالی، انگیزشی… هر کدام صداهای مناسبِ خودشان را دارند.
 *   • هر قسمت با قسمتِ دیروز فرق می‌کند: گویندهٔ اصلیِ دیروز امروز اصلی نمی‌شود.
 *   • عوض‌شدنِ صدا فقط سرِ مرزِ بخش‌ها اتفاق می‌افتد، نه وسطِ یک جمله؛ و
 *     گویندهٔ اصلی بیشترِ قسمت را می‌گوید تا صدا تکه‌تکه و بی‌قرار نشود.
 *
 * ══ نکتهٔ صادقانه دربارهٔ جدولِ صداها ══
 *
 * نام‌های زیر همان صداهای آمادهٔ Gemini هستند. برچسبِ «زن/مرد» و «سرشت» بهترین
 * دانستهٔ من است، نه یک سندِ رسمی. اگر جایی به گوشتان جور درنیامد، همین جدول را
 * عوض کنید — همهٔ کد از همین یک جا می‌خواند. اگر نامی را API نپذیرد، موتور
 * خودش به صدای پیش‌فرضِ همان برنامه برمی‌گردد و قسمت از دست نمی‌رود.
 */

/**
 * جدولِ صداها.
 *   g: جنسیت ('f' | 'm')
 *   k: سرشت — کلیدواژه‌هایی که در انتخاب وزن می‌گیرند
 */
var TTS_VOICES = [
  { n: 'Kore',        g: 'f', k: ['رسا', 'معلم', 'روشن', 'علمی', 'آموزشی'] },
  { n: 'Aoede',       g: 'f', k: ['گرم', 'روایت', 'احساسی', 'تاریخی'] },
  { n: 'Leda',        g: 'f', k: ['جوان', 'سرزنده', 'طنز', 'خبری', 'سبک'] },
  { n: 'Zephyr',      g: 'f', k: ['روشن', 'سبک', 'خبری', 'اجتماعی', 'پرانرژی'] },
  { n: 'Callirrhoe',  g: 'f', k: ['آرام', 'مهربان', 'احساسی', 'معنوی', 'ملایم'] },
  { n: 'Autonoe',     g: 'f', k: ['روشن', 'دقیق', 'شفاف', 'علمی', 'مالی'] },
  { n: 'Despina',     g: 'f', k: ['نرم', 'گفت‌وگو', 'اجتماعی', 'روانشناسی', 'انگیزشی'] },
  { n: 'Achernar',    g: 'f', k: ['ملایم', 'آرام', 'معنوی', 'احساسی'] },
  { n: 'Gacrux',      g: 'f', k: ['پخته', 'باوقار', 'تاریخی', 'مذهبی', 'یکدست'] },
  { n: 'Sulafat',     g: 'f', k: ['گرم', 'روایت', 'مستند', 'فرهنگی', 'قاطع'] },
  { n: 'Charon',      g: 'm', k: ['باوقار', 'رسا', 'خبری', 'مستند'] },
  { n: 'Puck',        g: 'm', k: ['سرزنده', 'طنز', 'سبک', 'اجتماعی'] },
  { n: 'Fenrir',      g: 'm', k: ['پرانرژی', 'قاطع', 'انگیزشی', 'هشدار'] },
  { n: 'Orus',        g: 'm', k: ['محکم', 'جدی', 'مالی', 'سیاسی', 'قاطع'] },
  { n: 'Enceladus',   g: 'm', k: ['آرام', 'نجواگر', 'معنوی', 'احساسی', 'ملایم'] },
  { n: 'Iapetus',     g: 'm', k: ['شفاف', 'دقیق', 'علمی', 'آموزشی'] },
  { n: 'Umbriel',     g: 'm', k: ['آسوده', 'روایت', 'تاریخی', 'فرهنگی'] },
  { n: 'Algieba',     g: 'm', k: ['نرم', 'گفت‌وگو', 'مستند', 'روانشناسی'] },
  { n: 'Rasalgethi',  g: 'm', k: ['معلم', 'توضیح‌گر', 'آموزشی', 'علمی'] },
  { n: 'Alnilam',     g: 'm', k: ['استوار', 'باوقار', 'مذهبی', 'تاریخی'] },
  { n: 'Schedar',     g: 'm', k: ['یکدست', 'خبری', 'سیاسی', 'اقتصادی', 'هشدار'] },
  { n: 'Achird',      g: 'm', k: ['دوستانه', 'گفت‌وگو', 'اجتماعی', 'سبک'] }
];

/**
 * «سرشتِ» یک قسمت یا یک بخش، از دستهٔ محتوا و از لحنی که خودِ مدل نوشته.
 * برمی‌گرداند فهرستی از کلیدواژه‌ها که در امتیازدهیِ صداها وزن می‌گیرند.
 */
function voiceRegister_(cat, tone, text) {
  var t = txNorm([cat || '', tone || '', String(text || '').slice(0, 1200)].join(' '));
  var reg = [];
  var add = function (pat, keys) { if (pat.test(t)) reg = reg.concat(keys); };
  add(/مذهب|دین|قران|قرآن|معنو|عرفان|دعا|زیارت|امام|اله/, ['مذهبی', 'باوقار', 'معنوی']);
  add(/سوگ|مرثیه|عزا|درگذشت|فراق|غم|حزن|تسلیت|شهادت/, ['احساسی', 'آرام', 'ملایم']);
  add(/علم|فیزیک|ریاض|شیمی|زیست|نجوم|پزشک|فناور|هوش مصنوع|مهندس|برنامه نویس/,
      ['علمی', 'دقیق', 'شفاف']);
  add(/آموزش|اموزش|درس|جلسه|تمرین|مفهوم|تعریف|قاعده/, ['آموزشی', 'معلم', 'توضیح گر']);
  add(/مال|اقتصاد|بورس|سهام|ترید|ارز|بانک|سرمایه|تورم|نقدینگ/, ['مالی', 'محکم', 'دقیق']);
  add(/سیاس|خبر|انتخابات|دولت|مجلس|جنگ|تحریم|دیپلماس/, ['سیاسی', 'خبری', 'یکدست']);
  add(/طنز|خنده|شوخ|کمدی|سرگرم|بامزه/, ['طنز', 'سرزنده', 'سبک']);
  add(/تاریخ|باستان|میراث|فرهنگ|ادب|شعر|حکمت|فلسف/, ['تاریخی', 'روایت', 'پخته']);
  add(/روانشناس|انگیز|موفقیت|عزت نفس|رشد فردی|عادت|اضطراب|افسردگ/,
      ['روانشناسی', 'انگیزشی', 'گرم']);
  add(/هشدار|خطر|بحران|فاجعه|اخطار|کلاهبردار/, ['هشدار', 'قاطع', 'پرانرژی']);
  add(/مستند|مصاحبه|گفتگو|گفت و گو|روایت|زندگینامه/, ['مستند', 'گفت‌وگو', 'روایت']);
  add(/خانواده|اجتماع|سبک زندگ|آشپز|سفر|ورزش|کودک/, ['اجتماعی', 'دوستانه', 'نرم']);
  if (!reg.length) reg = ['رسا', 'روایت'];
  return reg;
}

/** امتیازِ یک صدا برای یک سرشت. */
function voiceScore_(v, reg) {
  var s = 0;
  // جدولِ صداها دستیِ کاربر است: یک ردیفِ ناقص یا بی k نباید کلِ چندصدایی را
  // بی‌صدا از کار بیندازد.
  if (!v || !v.k || typeof v.k.length !== 'number') return 0;
  if (!reg || typeof reg.length !== 'number') return 0;
  for (var i = 0; i < reg.length; i++) {
    // مقایسه با نرمال‌سازی: «توضیح‌گر» با نیم‌فاصله و «توضیح گر» با فاصله باید
    // یکی شمرده شوند، وگرنه یک نویسهٔ نامرئی امتیازِ یک صدا را می‌خورد.
    var want = txNorm(reg[i]);
    for (var j = 0; j < v.k.length; j++) {
      if (txNorm(v.k[j]) === want) { s += (i === 0 ? 3 : 2); break; }
    }
  }
  return s;
}

/** صداهایی که کاربر کنار گذاشته است (نام‌ها با کاما، در ویژگی‌های اسکریپت). */
function blockedVoices_() {
  var out = Object.create(null);
  try {
    var raw = String(props_().getProperty(PK.VOICE_BLOCK) || CFG.TTS_VOICE_BLOCK || '');
    var parts = raw.split(',');
    for (var i = 0; i < parts.length; i++) {
      var n = parts[i].trim();
      if (n) out[n] = 1;
    }
  } catch (e) {}
  return out;
}

/**
 * نقش‌گزینیِ یک قسمت.
 *
 * @param show  'variety' یا 'special' — فقط برای گردشِ مستقل و صدای پشتیبان
 * @param epNum شمارهٔ قسمت — پایهٔ گردش، تا هر قسمت با قسمتِ قبل فرق کند
 * @param cat   دستهٔ محتوا
 * @param reg   سرشتِ کلِ قسمت
 * @return {lead: '...', mates: ['...','...'], all: [...]}
 */
function castEpisode_(show, epNum, cat, reg) {
  var blocked = blockedVoices_();
  var pool = [];
  for (var i = 0; i < TTS_VOICES.length; i++) {
    if (!blocked[TTS_VOICES[i].n]) pool.push(TTS_VOICES[i]);
  }
  if (!pool.length) pool = TTS_VOICES.slice();

  // ── تاریخِ گویندگانِ اصلی، به‌شکلِ «نام|شمارهٔ قسمت» ──
  //
  // دو درسِ گران در همین چند خط نشسته است.
  //
  // یک: کلیدِ تاریخ باید شمارهٔ قسمت را هم داشته باشد. صداگذاریِ یک قسمت چند
  // اجرا طول می‌کشد و در هر اجرا نقش‌گزینی از نو صدا زده می‌شود؛ با تاریخِ
  // بی‌شماره، گویندهٔ اصلیِ *همین* قسمت در اجرای دوم «دیروز» شمرده می‌شد و کنار
  // گذاشته می‌شد. نتیجه: نیمی از یک فایلِ صوتی با یک گوینده و نیمِ دیگر با
  // گویندهٔ دیگر — وسطِ جمله. یعنی هر قسمتِ واقعی، خراب.
  //
  // دو: تاریخ سه‌تایی است، نه یکی. با تاریخِ یک‌تایی، هر دسته بین دقیقاً دو صدا
  // پینگ‌پنگ می‌کرد و «هر دفعه تنوع» عملاً نمی‌شد.
  var curEp = String(Number(epNum) || 0);
  var hist = [];
  try {
    hist = String(props_().getProperty(PK.VOICE_LAST + '_' + show) || '')
             .split(',').filter(String);
  } catch (e) {}
  var avoid = Object.create(null);
  for (var h = 0; h < hist.length; h++) {
    var pr = hist[h].split('|');
    if (pr.length > 1 && pr[1] === curEp) continue;   // نقش‌گزینیِ خودِ همین قسمت
    if (pr[0]) avoid[pr[0]] = 1;
  }

  var scored = [];
  for (var p = 0; p < pool.length; p++) {
    scored.push({ v: pool[p], s: voiceScore_(pool[p], reg) });
  }
  // گردش: پایهٔ چرخش از شمارهٔ قسمت می‌آید، پس ترتیبِ صداهای هم‌امتیاز هر روز
  // عوض می‌شود — بی آنکه به تصادفِ ناپایدار تکیه کنیم.
  var rot = Math.abs(Number(epNum) || 0);
  scored.sort(function (a, b) {
    if (b.s !== a.s) return b.s - a.s;
    var ia = (Math.max(0, idxOfVoice_(a.v.n)) + rot) % TTS_VOICES.length;
    var ib = (Math.max(0, idxOfVoice_(b.v.n)) + rot) % TTS_VOICES.length;
    return ia - ib;
  });

  // جنسیتِ گویندهٔ اصلیِ دفعهٔ قبل. خواستهٔ صریح این بود که هیچ برنامه‌ای جنسیتِ
  // ثابت نداشته باشد؛ ولی امتیازِ سرشت به‌تنهایی این را تضمین نمی‌کند — در یک
  // دستهٔ علمی، دو صدای برترِ فهرست هر دو مرد بودند و «تکرار نکردنِ دیروز» فقط
  // بین همان دو می‌چرخید. پس جنسیت هم صریح می‌چرخد: اگر صدایی از جنسِ دیگر
  // امتیازی نزدیک به بهترین داشته باشد، نوبتِ او است.
  // جنسیتِ «دفعهٔ قبل» هم باید از همان تاریخِ شماره‌دار بیاید، نه از یک ویژگیِ
  // جداگانه. وگرنه در اجرای دومِ همان قسمت، تاریخ درست کار می‌کرد ولی چرخشِ
  // جنسیت گویندهٔ اصلی را عوض می‌کرد — و دقیقاً همان دو-گوینده-در-یک-فایل.
  var lastG = '';
  for (var hg = 0; hg < hist.length; hg++) {
    var pg = hist[hg].split('|');
    if (pg.length > 1 && pg[1] === curEp) continue;
    if (pg[0]) { lastG = voiceRow_(pg[0]).g || ''; break; }
  }

  // پرهیز از تکرار، تا جایی که تناسب فدا نشود: اگر همهٔ صداهای مناسبِ این
  // محتوا در تاریخ آمده‌اند، تاریخ را نادیده می‌گیریم. بی این نگهبان، متنِ
  // «هشدار» به صدایی می‌رسید که هیچ تناسبی با هشدار ندارد — تنوع به قیمتِ
  // بی‌ربطی، که معامله‌ای بد است.
  var free = false;
  for (var fz = 0; fz < scored.length; fz++) {
    if (scored[fz].s > 0 && !avoid[scored[fz].v.n]) { free = true; break; }
  }
  if (!free) avoid = Object.create(null);

  var pick = function (pred) {
    for (var q = 0; q < scored.length; q++) {
      if (avoid[scored[q].v.n]) continue;
      if (pred(scored[q])) return scored[q].v;
    }
    return null;
  };
  var topScore = scored.length ? scored[0].s : 0;
  var lead = null;
  if (lastG) {
    // از جنسِ مخالف، به شرطِ آنکه تناسبش با محتوا فدا نشود
    lead = pick(function (x) { return x.v.g !== lastG && x.s > 0 && x.s >= topScore - 4; });
    // و اگر هیچ صدای مناسبی از جنسِ دیگر نبود، بهترین صدای همان جنس — تنوع مهم
    // است ولی نه به قیمتِ خواندنِ یک درسِ فیزیک با لحنِ طنز.
    if (!lead) lead = pick(function (x) { return x.v.g !== lastG && x.s > 0; });
  }
  if (!lead) lead = pick(function () { return true; });
  if (!lead && scored.length) lead = scored[0].v;
  // جدولِ خالی یا کاملاً خراب: با صدای پشتیبان ادامه می‌دهیم، نه با استثنا.
  if (!lead) {
    var fb = (show === ENRICH_SHOW_SPECIAL ? CFG.TTS_VOICE_SPECIAL : CFG.TTS_VOICE) || 'Kore';
    return { lead: fb, leadGender: '', mates: [], all: [fb], genders: [''] };
  }

  // همراهان: بهترین صدای جنسِ دیگر، و بعد بهترین صدای باقی‌مانده. جنسِ مخالف
  // عمدی است — تنوعِ واقعی همین است، نه دو صدای شبیهِ هم.
  var mates = [];
  for (var r = 0; r < scored.length && mates.length < 1; r++) {
    if (scored[r].v.n !== lead.n && scored[r].v.g !== lead.g) mates.push(scored[r].v);
  }
  for (var w = 0; w < scored.length && mates.length < 2; w++) {
    var nm = scored[w].v.n;
    if (nm === lead.n) continue;
    var dup = false;
    for (var m = 0; m < mates.length; m++) if (mates[m].n === nm) dup = true;
    if (!dup) mates.push(scored[w].v);
  }

  var all = [lead].concat(mates);
  return { lead: lead.n, leadGender: lead.g,
           mates: mates.map(function (x) { return x.n; }),
           all: all.map(function (x) { return x.n; }),
           genders: all.map(function (x) { return x.g; }) };
}

function idxOfVoice_(name) {
  for (var i = 0; i < TTS_VOICES.length; i++) {
    if (TTS_VOICES[i] && TTS_VOICES[i].n === name) return i;
  }
  return -1;
}

/** ردیفِ جدول برای یک نام، با پشتیبانِ بی‌خطر. */
function voiceRow_(name) {
  var i = idxOfVoice_(name);
  return i >= 0 ? TTS_VOICES[i] : { n: String(name || ''), g: '', k: [] };
}

/** به‌خاطر سپردنِ گویندهٔ اصلیِ امروز، تا فردا تکرار نشود. */
function rememberLead_(show, name, epNum) {
  try {
    // بی شمارهٔ قسمت هم باید درست کار کند: آن‌وقت ردیف بی‌شماره ثبت می‌شود و
    // ردیف‌های قبلی پاک نمی‌شوند (وگرنه تاریخ هیچ‌وقت جمع نمی‌شد و همان
    // پینگ‌پنگِ دوصدایی برمی‌گشت).
    var cur = (epNum === undefined || epNum === null || epNum === '')
                ? '' : String(Number(epNum) || 0);
    var hist = String(props_().getProperty(PK.VOICE_LAST + '_' + show) || '')
                 .split(',').filter(String)
                 // ردیفِ همین قسمت بازنویسی می‌شود، نه اینکه ردیفِ تازه اضافه شود
                 .filter(function (x) { return !cur || x.split('|')[1] !== cur; });
    hist.unshift(String(name || '') + '|' + cur);
    props_().setProperty(PK.VOICE_LAST + '_' + show, hist.slice(0, 3).join(','));
    var v = voiceRow_(name);
    if (v && v.g) props_().setProperty(PK.VOICE_LAST + '_' + show + '_G', v.g);
  } catch (e) {}
}

/**
 * تقسیمِ گویندگان بین بخش‌ها.
 *
 * قاعده‌ها:
 *   • آغاز و پایانِ برنامه همیشه با گویندهٔ اصلی — قسمت باید یک «میزبان» داشته
 *     باشد، وگرنه شنونده گم می‌شود.
 *   • هر بخش، اگر سرشتش با یکی از همراهان بهتر جور بیاید، به او می‌رسد.
 *   • ولی سهمِ گویندهٔ اصلی زیر نصف نمی‌آید، و دو بخشِ پشت‌سرهم با دو صدای
 *     متفاوت پرهیز می‌شود مگر سرشتشان واقعاً فرق کند.
 *   • و اگر قسمت سه بخش یا بیشتر دارد، دست‌کم دو صدا در آن شنیده می‌شود — تنوع
 *     درونِ قسمت خواستهٔ صریح بود.
 *
 * @param segs [{text, style, kind:'hook'|'body'|'outro', tone}]
 * @return همان آرایه، با فیلدِ voice پرشده
 */
function assignSegmentVoices_(segs, cast, cat) {
  var n = segs.length;
  if (!n) return segs;
  var leadShare = 0;
  var prev = '';
  for (var i = 0; i < n; i++) {
    var s = segs[i];
    var isEdge = s.kind === 'hook' || s.kind === 'outro' || s.kind === 'goal';
    if (isEdge) { s.voice = cast.lead; prev = s.voice; leadShare++; continue; }

    var reg = voiceRegister_(cat, s.tone, s.text);
    var best = cast.lead, bestS = -1;
    for (var c = 0; c < cast.all.length; c++) {
      var v = voiceRow_(cast.all[c]);
      var sc = voiceScore_(v, reg) + (cast.all[c] === cast.lead ? 1 : 0);
      // دو بخشِ پیاپی با یک صدا اشکالی ندارد؛ ولی پرشِ مکرر بین صداها آزاردهنده
      // است، پس ماندن روی صدای قبلی کمی پاداش می‌گیرد.
      if (cast.all[c] === prev) sc += 0.5;
      if (sc > bestS) { bestS = sc; best = cast.all[c]; }
    }
    s.voice = best;
    if (best === cast.lead) leadShare++;
    prev = best;
  }

  // ── سهمِ گویندهٔ اصلی ──
  // شرطِ درون‌حلقه‌ای کافی نبود: در یک قسمتِ شش‌بخشی، سه بخشِ کوتاه به اصلی
  // می‌رسید و سه بخشِ بلند به همراه، و عملاً «میزبان» قسمت عوض می‌شد. حالا پس
  // از تقسیم، اگر سهمِ اصلی کمتر از نیمهٔ بخش‌ها باشد، بلندترین بخش‌ها به او
  // برمی‌گردند — ولی همیشه دست‌کم یک بخش برای همراه می‌ماند، چون تنوعِ درونِ
  // قسمت هم خواستهٔ صریح است.
  // معیار «نویسه» است نه «شمارِ بخش»: سه بخشِ کوتاه به اصلی و سه بخشِ بلند به
  // همراه، روی کاغذ نصف-نصف است ولی در گوش یعنی میزبانِ قسمت عوض شده.
  var lenOf = function (x) { return String(segs[x].text || '').length; };
  var total = 0;
  for (var b0 = 0; b0 < n; b0++) total += lenOf(b0);
  var leadChars = function () {
    var c = 0;
    for (var z = 0; z < n; z++) if (segs[z].voice === cast.lead) c += lenOf(z);
    return c;
  };
  var idxs = [];
  for (var b2 = 0; b2 < n; b2++) {
    if (segs[b2].kind === 'body' && segs[b2].voice !== cast.lead) idxs.push(b2);
  }
  idxs.sort(function (x, y) { return lenOf(y) - lenOf(x); });
  // دست‌کم یک بخش برای همراه می‌ماند: تنوعِ درونِ قسمت هم خواستهٔ صریح است.
  for (var g2 = 0; g2 < idxs.length && idxs.length - g2 > 1; g2++) {
    if (total && leadChars() / total >= 0.45) break;
    segs[idxs[g2]].voice = cast.lead;
  }
  // حالتِ خاص: قسمتی که فقط یک بخشِ بدنه دارد. حلقهٔ بالا (که همیشه یک بخش را
  // برای همراه نگه می‌دارد) این‌جا اجرا نمی‌شد و نتیجه‌اش این بود که گویندهٔ
  // «اصلی» فقط آغاز و پایان را می‌گفت — چهار درصدِ قسمت — و کلِ درس به همراه
  // می‌رسید. یک قسمتِ یک‌بخشی جای تنوع نیست.
  if (idxs.length === 1 && total && leadChars() / total < 0.45) {
    segs[idxs[0]].voice = cast.lead;
  }
  // تضمینِ تنوع: اگر همه یک صدا شدند و بخش‌ها سه یا بیشترند، یک بخشِ میانی را
  // به همراهِ اول بده.
  var bodyCount = 0;
  for (var bc = 0; bc < n; bc++) if (segs[bc].kind === 'body') bodyCount++;
  // تنوعِ درونِ قسمت فقط وقتی معنا دارد که بیش از یک بخشِ بدنه باشد. با یک بخش،
  // دادنش به همراه یعنی گویندهٔ «اصلی» فقط آغاز و پایان را می‌گوید.
  if (n >= 3 && bodyCount >= 2 && cast.mates.length) {
    var uniq = Object.create(null), c2 = 0;
    for (var u = 0; u < n; u++) if (!uniq[segs[u].voice]) { uniq[segs[u].voice] = 1; c2++; }
    if (c2 < 2) {
      var mid = -1;
      for (var z = 0; z < n; z++) if (segs[z].kind === 'body') { mid = z; break; }
      if (mid >= 0) segs[mid].voice = cast.mates[0];
    }
  }
  return segs;
}

/**
 * دستورِ لحن برای یک بخش، بر پایهٔ سرشتش.
 * این‌جا فقط «چطور بخوان» را می‌سازیم؛ «چه کسی بخواند» کارِ نقش‌گزینی است.
 */
function styleForRegister_(reg) {
  var has = function (k) { return reg.indexOf(k) !== -1; };
  var L = [];
  if (has('مذهبی')) L.push('لحن باوقار و محترم؛ آرام و شمرده، بی هیچ اغراق یا نمایش.');
  if (has('احساسی')) L.push('لحن گرم و آهسته؛ سنگینیِ حس را در سکوت‌ها بگذار نه در بلندیِ صدا.');
  if (has('علمی')) L.push('لحن دقیق و روشن؛ هر اصطلاح را شمرده ادا کن و پیش از نتیجه یک مکثِ کوتاه بگذار.');
  if (has('آموزشی')) L.push('لحن معلم‌وار: مثالی که می‌آید را کمی آهسته‌تر و با تأکیدِ بیشتر بگو.');
  if (has('مالی')) L.push('لحن محکم و بی‌هیجان؛ عددها را واضح و جدا جدا بگو.');
  if (has('سیاسی')) L.push('لحن خبریِ بی‌طرف؛ نه هیجان، نه قضاوت در صدا.');
  if (has('طنز')) L.push('لحن سرزنده با لبخندِ شنیدنی، ولی بی مسخره‌بازی.');
  if (has('تاریخی')) L.push('لحن روایت‌گرِ آسوده، مثل کسی که قصه‌ای واقعی تعریف می‌کند.');
  if (has('انگیزشی')) L.push('لحن گرم و رو به جلو، بی شعار و بی فریاد.');
  if (has('هشدار')) L.push('لحن قاطع و جدی؛ تأکید روی خودِ خطر، بی ترساندن.');
  if (has('مستند')) L.push('لحن مستندگو: آرام، کمی فاصله‌دار، با اعتماد.');
  if (has('اجتماعی')) L.push('لحن دوستانه و نزدیک، مثل گفت‌وگوی رو در رو.');
  if (!L.length) L.push('لحن رسا و متعادل.');
  return L.join(' ');
}

/** خلاصهٔ نقش‌گزینی برای پیوست و ایمیل. */
function castNote_(cast, segs) {
  if (!cast) return '';
  var by = Object.create(null), order = [];
  for (var i = 0; i < (segs || []).length; i++) {
    var v = segs[i].voice || cast.lead;
    if (!Object.prototype.hasOwnProperty.call(by, v)) { by[v] = 0; order.push(v); }
    by[v]++;
  }
  var parts = [];
  for (var j = 0; j < order.length; j++) {
    parts.push(order[j] + ' (' + by[order[j]] + ' بخش' +
               (order[j] === cast.lead ? '، گویندهٔ اصلی' : '') + ')');
  }
  return parts.length ? 'گویندگانِ این قسمت: ' + parts.join(' · ') : '';
}


/**
 * نقش‌گزینی، یک بار و برای همیشهٔ همان قسمت.
 *
 * چرا این تابع وجود دارد: صداگذاری چند اجرا طول می‌کشد و در هر اجرا تکه‌های
 * صوتی از نو ساخته می‌شوند. اگر نقش‌گزینی هم از نو انجام شود، نیمی از فایل با
 * یک گوینده و نیمِ دیگر با گویندهٔ دیگر خوانده می‌شود. پس نتیجه در خودِ پروندهٔ
 * قسمت ذخیره می‌شود و اجراهای بعد فقط می‌خوانندش.
 */
function ensureCast_(ep, show, epNum, cat) {
  if (!ep) return null;
  if (ep.__cast && ep.__cast.lead && ep.__cast.all && ep.__cast.all.length) {
    return { lead: ep.__cast.lead, mates: ep.__cast.all.slice(1),
             all: ep.__cast.all, genders: ep.__cast.genders || [] };
  }
  var body = [];
  for (var i = 0; i < ((ep && ep.sections) || []).length; i++) {
    body.push(String(ep.sections[i].narration || ''));
  }
  var cast = castEpisode_(show, epNum || 0, cat || '',
                          voiceRegister_(cat || '', '', body.join(' ').slice(0, 4000)));
  rememberLead_(show, cast.lead, epNum || 0);
  ep.__cast = { lead: cast.lead, all: cast.all, genders: cast.genders, note: '' };
  return cast;
}

// ------------------------------------------------ آزمونِ شنیداریِ گویندگان

/**
 * جملهٔ آزمون. عمداً پر از همان چیزهایی است که خطا در آن‌ها دیده شد: «آ»ی
 * کشیده، الفِ میانی، و واکه‌های کوتاهِ فتحه و کسره و ضمه.
 */
var VOICE_TEST_LINE =
  // «بابا» و «آقا» عمداً اول آمده‌اند: الفِ پایانی همان جایی است که صداهای
  // غیرِ ایرانی کش می‌آورند و گِرد می‌کنند. اگر گوینده این دو را درست بگوید،
  // بقیه هم معمولاً درست است.
  'بابا آمَد. آقا کُجاست؟ ماما اینجاست. ' +
  'آب و نان و باران و جانِ من. آسمانِ آبی، آفتابِ تابان. ' +
  'مَرد و کِتاب و خُرد و گُل. کِتابِ من روی میزِ اوست. ' +
  'این جمله برای سنجشِ تلفظِ فارسیِ معیارِ ایران خوانده می‌شود.';

/**
 * ترتیبِ ساختِ نمونه‌ها: یکی در میان زن و مرد.
 *
 * فهرستِ TTS_VOICES اول ده زن دارد و بعد دوازده مرد. آزمون بودجهٔ زمانی دارد و
 * در هر اجرا فقط چند صدا می‌سازد، پس اجرای اول دقیقاً ده صدای زن ساخت و
 * ایستاد — و به نظر می‌رسید مردها اصلاً وجود ندارند. پیام «۱۲ مانده» را
 * می‌گفت ولی کسی که ده فایلِ زن می‌بیند، نتیجه‌اش را از فایل‌ها می‌گیرد نه از
 * پیام.
 *
 * با یکی در میان، هر اجرا نمونه‌ای از هر دو جنس می‌دهد و این سوءتفاهم دیگر
 * ممکن نیست. خودِ TTS_VOICES دست نمی‌خورد، چون ترتیبش در انتخابِ گویندهٔ
 * بخش‌ها معنا دارد.
 */
function auditionOrder_() {
  var f = [], m = [];
  for (var i = 0; i < TTS_VOICES.length; i++) {
    if (!TTS_VOICES[i] || !TTS_VOICES[i].n) continue;
    (TTS_VOICES[i].g === 'f' ? f : m).push(TTS_VOICES[i]);
  }
  var out = [];
  for (var k = 0; k < Math.max(f.length, m.length); k++) {
    if (k < m.length) out.push(m[k]);
    if (k < f.length) out.push(f[k]);
  }
  return out;
}

/**
 * منو: «آزمونِ شنیداریِ گویندگان».
 *
 * چرا این ابزار لازم شد: لهجه، خصیصهٔ خودِ صداست نه دستورِ متن. هر چقدر هم در
 * دستور بنویسیم «آ»ی ایرانی، صدایی که ذاتاً «آ» را گرد ادا می‌کند همان کار را
 * می‌کند. راهِ درست این است که یک جملهٔ ثابت را با همهٔ گویندگان بشنوید و
 * هر کدام که غلط خواند را کنار بگذارید — و از آن پس هرگز انتخاب نمی‌شود.
 *
 * خروجی: یک پوشه در OUTPUT با یک فایل صوتی به‌نامِ هر گوینده.
 * بودجه‌دار است: در هر اجرا چند صدا ساخته می‌شود و بقیه به اجرای بعد می‌ماند.
 */
function runVoiceAudition() {
  var ui = ui_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    if (ui) ui.alert('کارِ دیگری در جریان است؛ چند دقیقهٔ دیگر امتحان کنید.');
    return { ok: false, reason: 'busy' };
  }
  var deadline = new Date().getTime() + (CFG.MAX_RUNTIME_MS || 270000) - 60000;
  var made = [], failed = [], folder = null;
  try {
    var root = outFolder_();
    var name = 'آزمونِ صدای گویندگان';
    var it = root.getFoldersByName(name);
    folder = it.hasNext() ? it.next() : root.createFolder(name);

    var order = auditionOrder_();
    for (var i = 0; i < order.length; i++) {
      if (new Date().getTime() > deadline) break;
      var v = order[i];
      if (!v || !v.n) continue;
      var fname = 'صدا — ' + v.n + ' (' + (v.g === 'f' ? 'زن' : 'مرد') + ').wav';
      // ساخته‌شده‌ها دوباره ساخته نمی‌شوند، پس اجرای دوم از همان‌جا ادامه می‌دهد
      if (folder.getFilesByName(fname).hasNext()) continue;
      try {
        var b64 = ttsChunkTry_(VOICE_TEST_LINE, 'خیلی شمرده و واضح بخوان.', v.n);
        if (!b64) { failed.push(v.n + ' (پاسخِ خالی)'); continue; }
        var bytes = Utilities.base64Decode(
          Utilities.base64Encode(wavHeader54_((alignB64_(b64).length / 4) * 3)) +
          alignB64_(b64));
        folder.createFile(Utilities.newBlob(bytes, 'audio/wav', fname));
        made.push(v.n);
      } catch (e) {
        failed.push(v.n + ' (' + String(e.message).slice(0, 60) + ')');
      }
      Utilities.sleep(400);
    }
  } catch (eA) {
    failed.push('خطا: ' + eA.message);
  } finally {
    try { lock.releaseLock(); } catch (eL) {}
  }

  var left = 0;
  try {
    for (var z = 0; z < TTS_VOICES.length; z++) {
      var fz = 'صدا — ' + TTS_VOICES[z].n + ' (' +
               (TTS_VOICES[z].g === 'f' ? 'زن' : 'مرد') + ').wav';
      if (folder && !folder.getFilesByName(fz).hasNext()) left++;
    }
  } catch (eZ) {}

  var m = (left ? '⚠️ هنوز ' + left + ' گوینده مانده — همین گزینه را دوباره بزنید ' +
                  '(هر اجرا چند صدا می‌سازد و بقیه به اجرای بعد می‌ماند).\n\n'
                : '✅ همهٔ ' + TTS_VOICES.length + ' گوینده آماده‌اند.\n\n') +
          'ساخته شد: ' + made.length + ' صدا' +
          (made.length ? ' (' + made.join('، ') + ')' : '') + '\n' +
          (failed.length ? 'ناموفق: ' + failed.join('، ') + '\n' : '') +
          '\nپوشه: ' + (folder ? folder.getUrl() : '—') + '\n\n' +
          'جملهٔ آزمون: «' + VOICE_TEST_LINE.slice(0, 60) + '…»\n\n' +
          'گوش بدهید و هر صدایی که «آ» را گرد و کشیده (اوب/نون) خواند یا ' +
          'فتحه و کسره را نخورد، با گزینهٔ «کنار گذاشتنِ یک گوینده» حذفش کنید.';
  logLine_('آزمونِ صدا: ' + made.length + ' فایل ساخته شد، ' + left + ' مانده.');
  if (ui) ui.alert('آزمونِ شنیداریِ گویندگان', m, ui.ButtonSet.OK); else console.log(m);
  return { ok: true, made: made, failed: failed, left: left,
           folder: folder ? folder.getUrl() : '' };
}

/**
 * ویرایشِ فهرستِ کنارگذاشته‌شده‌ها — جایگزین یا افزودن/برداشتن.
 *
 * پیش از این کادر همیشه «جایگزین» می‌کرد: برای برگرداندنِ یک نفر باید نامِ همهٔ
 * بقیه را از نو می‌نوشتی، و یک قلم‌افتادگی یعنی برگشتنِ ناخواستهٔ یک صدای بد.
 *
 * حالا اگر هیچ نامی پیشوند نداشته باشد، همان رفتارِ قدیم است (جایگزینیِ کامل).
 * اگر دستِ‌کم یک نام با «-» یا «+» شروع شود، کلِ ورودی «ویرایشی» خوانده می‌شود:
 * «-» برمی‌گرداند و «+» (یا بی‌پیشوند) کنار می‌گذارد. این‌طور «-Kore» به‌تنهایی
 * یعنی «Kore برگردد» و بقیه دست‌نخورده می‌مانند.
 *
 * نامِ ناشناس هرگز وارد فهرست نمی‌شود و جدا گزارش می‌شود، تا یک غلطِ تایپی نه
 * بی‌صدا بماند و نه فهرست را خراب کند.
 */
function applyBlockEdit_(current, input) {
  var cur = [];
  var c = String(current || '').split(',');
  for (var a = 0; a < c.length; a++) { var t = c[a].trim(); if (t) cur.push(t); }

  var parts = String(input || '').split(',');
  var items = [], incremental = false;
  for (var i = 0; i < parts.length; i++) {
    var raw = parts[i].trim();
    if (!raw) continue;
    var sign = '';
    if (raw.charAt(0) === '-' || raw.charAt(0) === '+') { sign = raw.charAt(0); raw = raw.slice(1).trim(); }
    if (sign) incremental = true;
    if (raw) items.push({ sign: sign, name: raw });
  }

  var unknown = [], out;
  if (!incremental) {
    out = [];
    for (var j = 0; j < items.length; j++) {
      if (idxOfVoice_(items[j].name) >= 0) {
        if (out.indexOf(items[j].name) === -1) out.push(items[j].name);
      } else unknown.push(items[j].name);
    }
    return { list: out, unknown: unknown, mode: 'جایگزینی' };
  }

  out = cur.slice();
  for (var k = 0; k < items.length; k++) {
    var nm = items[k].name;
    if (idxOfVoice_(nm) < 0) { unknown.push(nm); continue; }
    var at = out.indexOf(nm);
    if (items[k].sign === '-') { if (at !== -1) out.splice(at, 1); }
    else if (at === -1) out.push(nm);
  }
  return { list: out, unknown: unknown, mode: 'ویرایش' };
}

/** منو: کنار گذاشتن (یا برگرداندنِ) یک گوینده. */
function runBlockVoice() {
  var ui = ui_();
  if (!ui) return { ok: false };
  var cur = String(props_().getProperty(PK.VOICE_BLOCK) || '');
  var r = ui.prompt('کنار گذاشتنِ گوینده',
    'فهرستِ فعلی:  ' + (cur || '(خالی)') + '\n\n' +
    'سه کار می‌شود کرد:\n' +
    '۱) فهرستِ کامل را با کاما بنویسید — جایگزینِ فهرستِ فعلی می‌شود.\n' +
    '۲) برای برگرداندنِ یکی، فقط بنویسید:  -نامِ‌گوینده   (بقیه دست‌نخورده می‌مانند)\n' +
    '۳) برای افزودنِ یکی، فقط بنویسید:  +نامِ‌گوینده\n\n' +
    'کادرِ خالی + تأیید = همه برمی‌گردند.\n' +
    'نامِ اشتباه پذیرفته نمی‌شود و جدا به شما گفته می‌شود.\n\n' +
    'گویندگانِ موجود: ' + TTS_VOICES.map(function (v) { return v.n; }).join('، '),
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return { ok: false };
  var txt = String(r.getResponseText() || '').trim();
  var edit = applyBlockEdit_(cur, txt);
  var good = edit.list, unknown = edit.unknown;
  if (good.length >= TTS_VOICES.length) {
    ui.alert('همهٔ گویندگان را نمی‌شود کنار گذاشت؛ دست‌کم یکی باید بماند.');
    return { ok: false };
  }
  props_().setProperty(PK.VOICE_BLOCK, good.join(','));
  logLine_('گویندگانِ کنارگذاشته‌شده: ' + (good.join('، ') || '(هیچ)'));
  ui.alert('ثبت شد', 'کنارگذاشته‌شده (' + good.length + ' نفر): ' + (good.join('، ') || '(هیچ)') +
           '\nدر گردشِ گویندگان می‌مانند: ' + (TTS_VOICES.length - good.length) + ' نفر' +
           (unknown.length ? '\n\n⚠️ نامِ ناشناس، پذیرفته نشد: ' + unknown.join('، ') +
                             '\nاملای درست را از فهرستِ همان کادر بردارید.' : '') +
           '\n\nاز قسمتِ بعد اعمال می‌شود.', ui.ButtonSet.OK);
  return { ok: true, blocked: good, unknown: unknown };
}
