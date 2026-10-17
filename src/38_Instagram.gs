/* ═══════════════════════════════════════════════════════════════════════════
   ۳۸) اینستاگرام — ریلزِ کوتاهِ درس‌نامه (۹.۲۱)
   ═══════════════════════════════════════════════════════════════════════════

   صاحبِ برنامه: «… همه پادکست‌های درس‌نامه رو از ابتدا … گلچینِ مطالب … ریلزِ کوتاه … خودش یه محتوا باشه، مثلاً
   "آیا می‌دانستید که در معرفت‌شناسی…" که قلابِ علاقه ایجاد کنه که طرف بخواد کاملش رو تو یوتیوب گوش کنه … نیاز
   نیست روز و تاریخ بگه … کپشن موارد لازم … اشاره کنه کاملش در یوتیوب … استوری هم بذاره … محتواهای اینستاگرام
   هر پادکست بره زیرِ فولدرِ همون پادکست در درایو … این روزها حسابی پست بذاری … چند تای اول با تأیید».

   ══ از کجا انتخاب می‌شود ══
   فقط قسمت‌هایی که ویدئوی **عمومی**شان در یوتیوب هست (`ytPublished_`) — به ترتیبِ شمارهٔ سراسری، یعنی از نخستین
   درس‌ها. دلیل: ریلز به نسخهٔ کامل اشاره می‌کند، و ریلزی که پیوندش هنوز نیست وعدهٔ دروغ است. پس هر چه پرکردنِ
   گذشته در یوتیوب جلو برود، اینستاگرام هم پشتش می‌آید؛ هیچ فهرستِ دستیِ دیگری نیست.

   ══ مراحلِ هر ریلز (هر کدام در یک اجرای جدا ممکن است) ══
   plan  ⇒ مدل متنِ ریلز را از خودِ درس می‌نویسد (قلاب + ۵ تا ۸ جملهٔ کوتاه + تصویرِ هر جمله + کپشن). جملهٔ پایانیِ
            «نسخهٔ کامل در یوتیوب» را **کد** می‌افزاید، نه مدل: وعده‌ای که باید همیشه باشد به مدل سپرده نمی‌شود.
   voice ⇒ هر جمله جدا با صدای گویندهٔ همان درس ساخته می‌شود؛ زمانِ هر جمله از طولِ خودِ صدا (نه تخمین) ⇒ زیرنویسِ دقیق.
   img   ⇒ نقاشی‌های خودِ درس اگر هست (از «تصویرها»، رونوشت در پوشهٔ اینستاگرام)؛ وگرنه تصویرِ عمودیِ تازه از مدلِ
            تصویر — در همان سقفِ هزینهٔ ماهانهٔ تصویرسازی. نبودِ هر دو ریلز را نمی‌خواباند (رانر زمینهٔ ساده می‌گذارد).
   ask   ⇒ درخواست در `_YT-RENDER.json` (`reels`، جدا از `items`) — رانرِ گیت‌هاب ۱۰۸۰×۱۹۲۰ می‌کشد.
   got   ⇒ MP4 و کاور از `docs/renders.json` (`reels`)؛ یک رونوشت در پوشهٔ اینستاگرامِ همان قسمت.
   ok    ⇒ تا `IG_APPROVE` ریلزِ اول منتشر نشده، هر ریلز منتظرِ کلیدش در `docs/ig-approve.json` می‌مانَد.
   pub   ⇒ ریلز (با کاور و «اشتراک در فید») و سپس استوریِ همان کاور؛ پیوند و شناسه‌ها در تبِ «انتشار در اینستاگرام».

   ══ آنچه API نمی‌دهد و باید گفته شود ══
   هایلایت‌ها (ساخت، افزودنِ استوری به آن، کاورش) و برچسبِ پیوند در استوری از هیچ API‌ای در دسترس نیست. پس
   «کارِ شما» است و در `igStatus_().line` صریح گفته می‌شود — نه وعده، نه سکوت.
   ═══════════════════════════════════════════════════════════════════════════ */

var IG_REEL_SCHEMA = { type: 'object', properties: {
  idea: { type: 'string' }, script: { type: 'string' },
  scenes: { type: 'array', items: { type: 'string' } },
  coverTitle: { type: 'string' }, caption: { type: 'string' }, story: { type: 'string' },
  tags: { type: 'array', items: { type: 'string' } },
  emph: { type: 'array', items: { type: 'string' } },
  ytDesc: { type: 'string' }
}, required: ['idea', 'script', 'scenes', 'coverTitle', 'caption', 'tags', 'emph', 'ytDesc'] };

/* داورِ پیوستگی — فراخوانِ جدا از نویسنده (همان قاعدهٔ ۶.۲۰: نوشتن و داوری دو کارند). */
var IG_JUDGE_SCHEMA = { type: 'object', properties: {
  oneIdea: { type: 'string' }, flows: { type: 'string' }, answersHook: { type: 'string' },
  faithful: { type: 'string' }, popular: { type: 'string' }, thirst: { type: 'string' },
  weak: { type: 'string' }, fix: { type: 'string' }
}, required: ['oneIdea', 'flows', 'answersHook', 'faithful', 'popular', 'thirst', 'weak', 'fix'] };

/** جملهٔ پایانیِ گفتنی — از کد، تا همیشه باشد. */
/* ۹.۲۶: «لازم نیست بگی لینک در کپشن است … همین که نسخهٔ کامل در یوتیوب هست کافیه». */
var IG_CTA_LINE = 'نسخهٔ کاملِ این درس در یوتیوب است.';

/* `shortQ` در کلیدِ جدای خودش می‌نشیند (۹.۳۲): با روزی ۶ ریلز و ۲–۳ شورتز، صف تا چند ده ردیف بزرگ می‌شود و کنارِ بقیهٔ
   حالت از سقفِ ۹ کیلوبایتیِ هر Property می‌گذشت — و `igStateSave_`ی که بی‌صدا شکست بخورد یعنی همهٔ پیشرفت گم. */
function igState_() {
  var s = {};
  try { s = JSON.parse(props_().getProperty(PK.IG_STATE) || '{}'); if (!s || typeof s !== 'object') s = {}; } catch (e) { s = {}; }
  try { var q = JSON.parse(props_().getProperty(PK.IG_SHORTQ) || '[]'); s.shortQ = Array.isArray(q) ? q : []; } catch (eQ) { s.shortQ = []; }
  return s;
}
function igStateSave_(s) {
  try {
    var c = {};
    Object.keys(s || {}).forEach(function (k) { if (k !== 'shortQ') c[k] = s[k]; });
    props_().setProperty(PK.IG_SHORTQ, JSON.stringify((s && s.shortQ) || []));
    props_().setProperty(PK.IG_STATE, JSON.stringify(c));
    return true;
  } catch (e) { return false; }
}

function igAcct_() {
  try { var a = JSON.parse(props_().getProperty(PK.IG_ACCT) || 'null'); return (a && a.ig) ? a : null; } catch (e) { return null; }
}

/** روشن است؟ کلید، حسابِ آزموده و کلیدِ پیکربندی — هر سه. */
function igOn_() { return CFG.IG_ON !== false && !!igToken_() && !!igAcct_(); }

/** شماره‌های انجام‌شده، فشرده: «1,2,3» ⇒ نقشه. */
function igDoneMap_(st) {
  var m = {}, a = String((st && st.done) || '').split(',');
  for (var i = 0; i < a.length; i++) if (a[i]) m[a[i]] = 1;
  return m;
}

/**
 * ترتیبِ درس‌ها، مجموعه به مجموعه، **از پوشه‌ها** (۹.۳۰) — [{name, eps:[{ep, recap, lesson}]}].
 *
 * صاحبِ برنامه: «از ابتدا درس‌نامهٔ اولِ مصباح باید همه‌ش بدون هیچ جاافتادنی کامل … بعد بری سراغِ آئودی … تا برسی به چیزی
 * که الان در جریانه و به موازاتش پیش بری … تو پلی‌لیست‌ها قبلاً چند تا جا انداختی … این دیگه نباید تکرار بشه». تا ۹.۲۹ این‌جا
 * «کوچک‌ترین شمارهٔ سراسریِ منتشرشده» بود: مجموعه‌ها درهم (شمارهٔ سراسریِ مصباح و آئودی یک‌درمیان است)، و درسی که هنوز
 * در یوتیوب نبود **بی‌صدا رد می‌شد** — همان شکلِ جاافتادنِ پلی‌لیست‌ها. حالا فهرستِ هر مجموعه از پوشهٔ خودش
 * (`ytSeriesLessons_` — همان تعریفِ «درسِ چندم» که عنوانِ یوتیوب دارد)، مرورهای بزرگ سرِ جای خودشان، و مجموعه‌ها به
 * ترتیبِ نخستین قسمتشان. هر `IG_ORDER_H` ساعت از نو؛ نشد ⇒ از همان جدولِ یوتیوب (`pub`)، که بدترین حالتش «منتظر ماندن»
 * است، نه رد شدن.
 */
function igOrder_(pub, st, force) {
  var o = st.order;
  var fresh = o && o.ms && Date.now() - Number(o.ms) < Math.max(1, Number(CFG.IG_ORDER_H) || 6) * 3600000;
  if (fresh && !force && o.s && o.s.length) return igOrderDec_(o.s);
  var names = {}, fromPub = {};
  for (var k in pub) {
    if (!Object.prototype.hasOwnProperty.call(pub, k) || k.indexOf(ENRICH_SHOW_SPECIAL + ':') !== 0) continue;
    var nm = String((pub[k] || {}).series || ''), e = Number(k.split(':')[1]);
    if (!nm || !(e > 0)) continue;
    names[nm] = 1;
    (fromPub[nm] = fromPub[nm] || []).push({ ep: e, recap: /مرور/.test(String((pub[k] || {}).title || '')) ? 1 : 0, lesson: 0 });
  }
  var series = [], why = [];
  var reg = null;
  try { reg = readSeriesReg_(getHub_()); } catch (eR) { why.push('رجیستری: ' + String(eR.message || eR).slice(0, 80)); }
  Object.keys(names).forEach(function (nm) {
    var eps = null;
    try {
      for (var r = 0; reg && r < reg.rows.length && !eps; r++) {
        if (String(reg.rows[r].vals[SC.NAME - 1] || '') !== nm) continue;
        var fid = String(reg.rows[r].vals[SC.FOLDER - 1] || '');
        if (!fid) continue;
        eps = ytSeriesLessons_(DriveApp.getFolderById(fid)).map(function (x) { return { ep: x.ep, recap: x.recap ? 1 : 0, lesson: x.lesson }; });
      }
    } catch (eF) { why.push(nm + ': ' + String(eF.message || eF).slice(0, 60)); eps = null; }
    if (!eps || !eps.length) {
      eps = (fromPub[nm] || []).sort(function (a, b) { return a.ep - b.ep; });
      var n = 0; eps.forEach(function (x) { if (!x.recap) x.lesson = ++n; });
      why.push(nm + ': از جدولِ یوتیوب (پوشه خوانده نشد)');
    }
    series.push({ name: nm, eps: eps });
  });
  series.sort(function (a, b) { return ((a.eps[0] || {}).ep || 1e9) - ((b.eps[0] || {}).ep || 1e9); });
  /* فشرده در Properties (سقفِ ۹ کیلوبایت با بقیهٔ حالت): «۱۲:۵,۳۴r» یعنی قسمتِ ۱۲ درسِ ۵، قسمتِ ۳۴ مرور. */
  st.order = { ms: Date.now(), at: nowStr_(), why: why.join(' · ').slice(0, 300),
               s: series.map(function (S) { return { n: S.name, e: S.eps.map(function (x) { return x.recap ? x.ep + 'r' : x.ep + ':' + x.lesson; }).join(',') }; }) };
  return series;
}
function igOrderDec_(arr) {
  return (arr || []).map(function (S) {
    return { name: S.n, eps: String(S.e || '').split(',').filter(Boolean).map(function (t) {
      var r = /r$/.test(t), a = t.replace(/r$/, '').split(':');
      return { ep: Number(a[0]) || 0, recap: r ? 1 : 0, lesson: r ? 0 : (Number(a[1]) || 0) };
    }) };
  });
}

/** شکستِ یک درس ⇒ پس از `IG_RETRY_H` ساعت دوباره، نه رها. ⇒ true یعنی هنوز در دورهٔ صبر است. */
function igFailHold_(st, ep) {
  var maxTry = Math.max(1, Number(CFG.IG_TRY_MAX) || 3), f = st.fails || {}, at = st.failAt || {};
  if ((Number(f[String(ep)]) || 0) < maxTry) return false;
  var t = Number(at[String(ep)]) || 0;
  if (t && Date.now() - t > Math.max(1, Number(CFG.IG_RETRY_H) || 24) * 3600000) {
    f[String(ep)] = 0; st.fails = f;
    return false;
  }
  return true;
}

/**
 * قسمتِ بعدی برای ریلز (۹.۳۰): مجموعه به مجموعه، درس به درس. در هر مجموعه نخستین درسِ انجام‌نشده:
 *   • در جریان ⇒ درسِ بعدیِ همان مجموعه می‌تواند هم‌زمان ساخته شود (انتشار به ترتیب می‌ماند — `igEarlierPending_`)؛
 *   • ویدئوی عمومی دارد ⇒ همین؛
 *   • ندارد و درسِ بعدی‌اش دارد ⇒ **جاافتاده**: مجموعه همین‌جا می‌ایستد و در `st.gaps` گفته می‌شود — رد نمی‌شود؛
 *   • ندارد و بعدی‌ها هم ندارند ⇒ به آخرِ منتشرشده رسیده؛ همراهِ تولید جلو می‌رود.
 * بعد سراغِ مجموعهٔ بعدی. `pub` = خروجیِ `ytPublished_`.
 */
function igNextEp_(pub, st, orderIn) {
  var done = igDoneMap_(st), busy = {};
  (st.inflight || []).forEach(function (x) { busy[String(x.ep)] = 1; });
  var order = orderIn || igOrder_(pub, st);
  var isPub = function (e) {
    var r = pub[ENRICH_SHOW_SPECIAL + ':' + e];
    return !!(r && r.videoId && String(r.privacy || '').toLowerCase() === 'public');
  };
  var gaps = [], caught = [];
  for (var s = 0; s < order.length; s++) {
    var S = order[s], eps = S.eps || [];
    for (var i = 0; i < eps.length; i++) {
      var x = eps[i], e = Number(x.ep);
      if (done[String(e)]) continue;
      if (busy[String(e)]) continue;
      var label = x.recap ? 'مرورِ بزرگ (' + e + ')' : 'درسِ ' + x.lesson;
      if (igFailHold_(st, e)) { gaps.push('«' + S.name + '» ' + label + ': سه بار نشد، تا ' + (Number(CFG.IG_RETRY_H) || 24) + ' ساعت دیگر دوباره'); break; }
      if (isPub(e)) {
        var r = pub[ENRICH_SHOW_SPECIAL + ':' + e];
        st.gaps = gaps; st.caught = caught;
        return { ep: e, url: String(r.url || ('https://youtu.be/' + r.videoId)), series: S.name, title: String(r.title || ''),
                 recap: !!x.recap, lesson: Number(x.lesson) || 0 };
      }
      var later = false;
      for (var j = i + 1; j < eps.length && !later; j++) if (isPub(eps[j].ep)) later = true;
      if (later) gaps.push('«' + S.name + '» ' + label + ': ویدئوی عمومیِ یوتیوب ندارد، درس‌های بعدی دارند — منتظر می‌ماند');
      else caught.push(S.name);
      break;
    }
  }
  st.gaps = gaps; st.caught = caught;
  return null;
}

/** درسِ قبلیِ همین مجموعه هنوز منتشر نشده؟ ⇒ برچسبش، یا ''. انتشار همیشه به ترتیب (۹.۳۰). */
function igEarlierPending_(st, ep) {
  var done = igDoneMap_(st), order = igOrderDec_((st.order && st.order.s) || []);
  for (var s = 0; s < order.length; s++) {
    var eps = order[s].eps || [], at = -1;
    for (var i = 0; i < eps.length; i++) if (Number(eps[i].ep) === Number(ep)) at = i;
    if (at < 0) continue;
    for (var k = 0; k < at; k++) if (!done[String(eps[k].ep)]) return eps[k].recap ? 'مرورِ بزرگ (' + eps[k].ep + ')' : 'درسِ ' + eps[k].lesson;
    return '';
  }
  return '';
}

/** پوشهٔ «اینستاگرام» درونِ پوشهٔ قسمت — همه‌چیزِ ریلز این‌جاست. */
function igFolder_(epFolder) {
  var nm = CFG.IG_FOLDER || 'اینستاگرام';
  var it = epFolder.getFoldersByName(nm);
  return it.hasNext() ? it.next() : epFolder.createFolder(nm);
}
function igPlanRead_(fo) {
  try { var it = fo.getFilesByName('_ig.json'); if (it.hasNext()) return JSON.parse(it.next().getBlob().getDataAsString()); } catch (e) {}
  return null;
}
function igPlanWrite_(fo, p) {
  var body = JSON.stringify(p, null, 1);
  var it = fo.getFilesByName('_ig.json');
  if (it.hasNext()) { it.next().setContent(body); return; }
  fo.createFile(Utilities.newBlob(body, 'application/json', '_ig.json'));
}

/** متنِ درس برای مدل — سرفصل‌ها و روایت، بی قلاب و جمع‌بندیِ رادیویی. */
function igLessonText_(ep, cap) {
  var L = [];
  if (ep && ep.title) L.push('عنوان: ' + ep.title);
  ((ep && ep.sections) || []).forEach(function (s) {
    if (!s) return;
    if (s.heading) L.push('## ' + s.heading);
    if (s.narration) L.push(String(s.narration));
  });
  var t = L.join('\n');
  return t.length > cap ? t.slice(0, cap) : t;
}

function igPrompt_(ep, seriesName, lesson, opt) {
  opt = opt || {};
  var W = igWords_(opt);
  if (opt.recap) return igPromptRecap_(ep, seriesName, opt, W);
  /* ══ یک فکر، نه هفت شعار (۹.۲۵) ══ ریلزِ اول «چنگی به دل نزد … ارتباطِ معنایی محتوا اصلاً خوب نبود». پرامپتِ ۹.۲۱
     «۵ تا ۸ جملهٔ کوتاه، هر کدام با تصویرِ خودش» می‌خواست؛ مدل هم هفت جملهٔ مستقل نوشت: قلاب می‌پرسید «چرا شبهه با زور
     حل نمی‌شود؟»، جملهٔ دوم دربارهٔ «گلِ نازک» بود، سوم دربارهٔ انقلابیان، و جوابِ قلاب در جملهٔ چهارم. حالا یک متنِ
     پیوسته با یک خط فکری خواسته می‌شود؛ تکه‌کردن و تصویر را کد انجام می‌دهد. */
  return [
    'تو نویسندهٔ ریلزِ اینستاگرام برای **مخاطبِ عام** هستی — کسی که دارد صفحه را رد می‌کند و فلسفه نخوانده. از درسِ زیر **یک** متنِ گفتاریِ پیوستهٔ ' + (CFG.IG_SEC || '45 تا 75') + ' ثانیه‌ای بنویس.',
    'هدف دو چیز است، با هم: (۱) همین ریلز **خودش یک چیزِ تازه و کامل** به بیننده بدهد که ارزشِ دیدن داشته باشد؛ (۲) او را **تشنهٔ** درسِ کامل کند.',
    'زبان: ساده، صمیمی، تصویری و زنده — مثلِ کسی که برای دوستش یک کشفِ جالب تعریف می‌کند. اصطلاحِ فلسفی و جملهٔ سنگین ممنوع؛',
    'اگر مفهومی ناگزیر است، با یک موقعیتِ روزمره (خانه، خیابان، گوشی، کار) نشانش بده، نه با تعریف.',
    'مجموعه: «' + seriesName + '»' + (lesson ? ' — درسِ ' + lesson : ''),
    '',
    'اول idea را بنویس: **یک** ایدهٔ مشخص از همین درس که در یک جمله گفتنی است — نه فهرستِ مطالبِ درس.',
    'بعد script: یک متنِ پیوسته (' + faDigitsOut_(String(W.lo)) + ' تا ' + faDigitsOut_(String(W.hi)) + ' واژه) که فقط همان یک ایده را باز می‌کند، با این خط:',
    '  ۱) قلاب: پرسش یا نکتهٔ شگفتی که شنونده را نگه می‌دارد («آیا می‌دانستید …؟» یا پرسشی تیز) — حداکثر ۱۴ واژه؛',
    '  ۲) چرا مهم است، در یک جمله؛',
    '  ۳) خودِ ایده، گام به گام — هر جمله از جملهٔ قبل بیرون می‌آید («چون…»، «پس…»، «یعنی…»، «اما…»)؛',
    '  ۴) یک مثالِ ملموس از خودِ درس؛',
    '  ۵) **جوابِ روشنِ همان قلاب** — و در یک جملهٔ پایانیِ کوتاه، پرسشِ بزرگ‌تری که جوابش در درسِ کامل است (کنجکاوی، نه تبلیغ).',
    '• هر جمله باید بی جملهٔ قبلی‌اش ناقص به نظر برسد؛ اگر جمله‌ای را بشود برداشت و چیزی کم نشود، آن جمله جای ندارد.',
    '• تشبیه یا مثالِ تازه فقط اگر همان ایده را روشن‌تر کند؛ موضوعِ دوم ممنوع.',
    '• جمله‌ها کوتاه (حداکثر ۲۲ واژه)، فارسیِ روان و گفتاریِ رسمی.',
    '• هیچ تاریخ، روز، «امروز»، «در این قسمت»، «پادکست»، «شنوندگانِ عزیز» یا شمارهٔ قسمت ننویس؛ دعوت به یوتیوب را هم **ننویس** — خودِ برنامه می‌افزاید.',
    '• ادعا و نام و عدد فقط از خودِ درس.',
    '• scenes = ۴ یا ۵ توصیفِ انگلیسیِ تصویرِ نقاشی‌گونه، به ترتیبِ همان خط (قلاب، چرایی، ایده، مثال، جواب)؛ بی هیچ نوشته، حرف، عدد یا لوگو.',
    '• coverTitle = عنوانِ کاور، حداکثر ۶ واژه، همان پرسشِ قلاب به کوتاه‌ترین شکل.',
    '• caption = کپشنِ اینستاگرام: سطرِ اول یک جملهٔ کنجکاوکننده (همان که زیرِ ریلز پیش از «بیشتر» دیده می‌شود، حداکثر ۱۲۰ نویسه)، بعد ۲ تا ۳ جملهٔ ساده که همان ایده را بگوید و به درسِ کامل دعوت کند. پیوند و برچسب ننویس.',
    '• ytDesc = توضیحِ شورتزِ یوتیوب: ۳ تا ۵ جمله — بیننده در این ویدئو چه می‌فهمد، چرا مهم است، و درسِ کامل چه چیزِ بیشتری می‌دهد؛ واژه‌های کلیدیِ جست‌وجوپذیرِ همین موضوع را طبیعی در جمله‌ها بیاور. پیوند و برچسب ننویس.',
    '• tags = ۸ تا ۱۵ برچسبِ مرتبط، بی #. story = یک جملهٔ کوتاه برای استوری.',
    '• emph = ۴ تا ۸ واژه یا عبارتِ کوتاهِ کلیدی (۱ تا ۳ واژه) که **عیناً** در script آمده‌اند — روی تصویر برجسته می‌شوند.',
    '',
    'متنِ درس:',
    igLessonText_(ep, Number(CFG.IG_SRC_CHARS) || 9000)
  ].join('\n');
}

/** بازهٔ واژه: درس ۵۰–۲۱۰ (هدف ۸۰–۱۵۰)، مرور ۲۰۰–۴۰۰؛ `maxWords` وقتی صدای قبلی از سه دقیقه گذشت. */
function igWords_(opt) {
  opt = opt || {};
  var lo = 80, hi = 150, min = 50, max = 210;
  if (opt.recap) { var R = CFG.IG_RECAP_WORDS || [200, 400]; lo = Number(R[0]) || 200; hi = Number(R[1]) || 400; min = Math.round(lo * 0.75); max = Math.round(hi * 1.1); }
  var cap = Number(opt.maxWords) || 0;
  if (cap > 0) { hi = Math.min(hi, cap); max = Math.min(max, cap); lo = Math.min(lo, Math.round(cap * 0.8)); min = Math.min(min, lo); }
  return { lo: lo, hi: hi, min: min, max: max };
}

/**
 * ریلزِ مرورِ بزرگ (۹.۳۰): «برای مرورهای بزرگ زمانِ ریلز و شورت رو کمی بیشتر کن، حدودِ سه دقیقه نهایتاً … ولی چون مرور
 * دیگه نباید خلاصه‌ش کنی». مرور خودش چکیدهٔ چند درس است؛ ریلزِ یک‌ایده‌ای از آن، خلاصهٔ خلاصه می‌شد. پس این‌جا **مسیر**:
 * درس‌ها به ترتیب، هر کدام یک گامِ روشن، پیوندِ هر گام به بعدی — با همان زبانِ عام‌فهم.
 */
function igPromptRecap_(ep, seriesName, opt, W) {
  return [
    'تو نویسندهٔ ریلزِ «مرورِ بزرگ» برای **مخاطبِ عام** هستی. از مرورِ زیر **یک** متنِ گفتاریِ پیوستهٔ ' + (CFG.IG_RECAP_SEC || '120 تا 170') +
      ' ثانیه‌ای (' + faDigitsOut_(String(W.lo)) + ' تا ' + faDigitsOut_(String(W.hi)) + ' واژه) بنویس.',
    'مجموعه: «' + seriesName + '»' + (opt.range ? ' — ' + opt.range : ' — مرورِ بزرگ'),
    'این **خلاصهٔ خلاصه نیست**: مسیرِ درس‌ها را به همان ترتیب بگو — هر درس یا بخش یک گامِ روشن با نکتهٔ اصلی‌اش، و هر گام از گامِ قبلی',
    'بیرون بیاید («اول…»، «بعد…»، «همین ما را می‌رساند به…»). یک مثالِ روزمره هر جا مفهوم سنگین است. بیننده باید در پایان بداند این',
    'مسیر از کجا شروع شد، به کجا رسید و چرا هر گام لازم بود — و بخواهد درس‌ها را کامل ببیند.',
    'زبان: ساده، صمیمی، زنده؛ اصطلاحِ فلسفیِ بی‌توضیح و جملهٔ سنگین ممنوع.',
    'idea = مسیرِ کلِ مرور در یک جمله. قلاب (جملهٔ اول): پرسشی که کلِ مسیر جوابش است — حداکثر ۱۴ واژه.',
    '• جمله‌ها کوتاه (حداکثر ۲۲ واژه). هیچ تاریخ، «امروز»، «در این قسمت»، «پادکست» یا شمارهٔ قسمت؛ دعوت به یوتیوب را **ننویس**.',
    '• ادعا و نام و عدد فقط از خودِ مرور.',
    '• scenes = ۷ تا ۹ توصیفِ انگلیسیِ تصویرِ نقاشی‌گونه به ترتیبِ مسیر؛ بی هیچ نوشته، حرف، عدد یا لوگو.',
    '• coverTitle = حداکثر ۶ واژه. caption = سطرِ اولِ کنجکاوکننده (حداکثر ۱۲۰ نویسه) + ۲ تا ۳ جمله؛ پیوند و برچسب ننویس.',
    '• ytDesc = ۴ تا ۶ جمله برای یوتیوب: این مرور کدام درس‌ها را به چه ترتیبی می‌پیماید و هر کدام چه می‌دهد؛ واژه‌های کلیدی طبیعی. پیوند و برچسب ننویس.',
    '• tags = ۸ تا ۱۵ برچسب، بی #. story = یک جملهٔ کوتاه. emph = ۴ تا ۸ واژهٔ کلیدیِ ۱ تا ۳ واژه‌ای که **عیناً** در script آمده‌اند.',
    '',
    'متنِ مرور:',
    igLessonText_(ep, Math.max(Number(CFG.IG_SRC_CHARS) || 9000, 14000))
  ].join('\n');
}

/** متنِ پیوسته ⇒ جمله‌ها (مرزِ جمله «.!؟?…»)؛ جملهٔ خیلی کوتاه به بعدی می‌چسبد. */
function igSplit_(t) {
  var out = [], cur = '';
  var parts = String(t || '').replace(/\s+/g, ' ').trim().split(/([.!؟?…]+)\s+/);
  for (var i = 0; i < parts.length; i += 2) {
    var seg = (parts[i] || '') + (parts[i + 1] || '');
    cur = cur ? cur + ' ' + seg : seg;
    if (cur.split(' ').length >= 5 || i + 2 >= parts.length) { if (cur.trim()) out.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** خروجیِ مدل ⇒ برنامهٔ تمیز، یا {why}. جمله‌ای که تاریخ/«پادکست»/یوتیوب دارد ⇒ کلِ متن رد (متنِ پیوسته را نمی‌شود سوراخ کرد). */
function igPlanTrim_(r, opt) {
  var W = igWords_(opt);
  if (!r || !r.script) return { why: 'مدل متنی نداد' };
  var bad = /(یوتیوب|youtube|در این قسمت|این قسمت|پادکست|شنوندگان|\d{4}\/\d|۱۴۰[۰-۹]|20\d\d|سالِ? [۰-۹\d]{4})/;
  var today = function (t) { return /امروز/.test(t.replace(/(تا (به )?|دنیای |جهانِ? |انسانِ? |جامعهٔ )امروز/g, '')); };
  var sents = igSplit_(r.script);
  for (var b = 0; b < sents.length; b++) if (bad.test(sents[b]) || today(sents[b])) return { why: 'جملهٔ ناروا: «' + sents[b].slice(0, 60) + '»' };
  var words = sents.join(' ').split(' ').length;
  if (sents.length < 4) return { why: 'کمتر از ۴ جمله (' + sents.length + ')' };
  if (words < W.min) return { why: 'متن کوتاه است (' + words + ' واژه)' };
  if (words > W.max) return { why: 'متن بلند است (' + words + ' واژه)' };
  var scenes = (r.scenes || []).map(function (x) { return String(x || '').slice(0, 400); }).filter(Boolean).slice(0, (opt && opt.recap) ? 10 : 6);
  var lines = sents.map(function (t, i) {
    return { text: t, scene: scenes.length ? scenes[Math.min(scenes.length - 1, Math.floor(i * scenes.length / sents.length))] : '' };
  });
  var tags = (r.tags || []).map(function (x) { return String(x || '').replace(/^#/, '').replace(/\s+/g, '_').trim(); })
    .filter(function (x) { return x && x.length < 40; }).slice(0, 15);
  var joined = sents.join(' ');
  var emph = (r.emph || []).map(function (x) { return String(x || '').replace(/\s+/g, ' ').trim(); })
    .filter(function (x) { return x && x.split(' ').length <= 3 && joined.indexOf(x) !== -1; }).slice(0, 8);
  return { idea: String(r.idea || '').trim().slice(0, 200), hook: lines[0].text.slice(0, 140), lines: lines, scenes: scenes, emph: emph,
           coverTitle: String(r.coverTitle || '').trim().slice(0, 60), caption: String(r.caption || '').trim().slice(0, 1200),
           story: String(r.story || '').trim().slice(0, 140), tags: tags, words: words,
           ytDesc: String(r.ytDesc || '').trim().slice(0, 1500) };
}

/**
 * داورِ پیوستگی (۹.۲۵) — فراخوانِ جدا: یک ایده؟ هر جمله از قبلی می‌آید؟ جملهٔ پایانی جوابِ قلاب است؟ همه از درس؟
 * ⇒ { ok, why, fix } — `fix` متنِ بازنویسی‌شده وقتی ایراد هست (همان قیدها). نشنیدنِ داور ⇒ رد، نه تأییدِ خاموش.
 */
function igJudge_(p, lesson, opt) {
  opt = opt || {};
  var W = igWords_(opt);
  var L = ['تو داورِ سخت‌گیرِ یک ریلزِ آموزشیِ فارسی هستی. متنِ ریلز را کنارِ درس بخوان و فقط با «بله» یا «خیر» جواب بده:',
           opt.recap ? 'oneIdea: متن **یک مسیرِ پیوسته** از درس‌های مرور، به همان ترتیب، است؟ (فهرستِ بی‌پیوند یا جاانداختنِ گامِ اصلی = خیر)'
                     : 'oneIdea: کلِ متن **فقط یک** ایده را باز می‌کند؟ (فهرستِ چند نکته = خیر)',
           'flows: هر جمله از جملهٔ قبلش بیرون می‌آید؟ (جمله‌ای که بشود برداشت و چیزی کم نشود = خیر)',
           'answersHook: جملهٔ پایانی جوابِ روشنِ پرسشِ جملهٔ اول است؟',
           'faithful: هر ادعا در خودِ درس هست؟',
           'popular: یک بینندهٔ عادی (نه فیلسوف) آن را راحت می‌فهمد و تا آخر نگاه می‌کند؟ (اصطلاحِ سنگین یا لحنِ درسی = خیر)',
           'thirst: بیننده چیزی واقعی یاد گرفت **و** کنجکاوِ درسِ کامل شد؟',
           'weak: ضعیف‌ترین جمله و چرا (یک سطر).',
           'fix: اگر یکی «خیر» است، کلِ متن را بازنویسی کن — ' + (opt.recap ? 'مسیرِ درس‌ها به ترتیب، هر گام از قبلی' : 'یک ایده') +
             '، زبانِ ساده و صمیمی برای مخاطبِ عام، خطِ پیوسته (قلاب ⇐ چرایی ⇐ ' + (opt.recap ? 'گام‌های مسیر' : 'ایده گام‌به‌گام') +
             ' ⇐ مثالِ روزمره ⇐ جوابِ قلاب ⇐ پرسشِ بزرگ‌ترِ درسِ کامل)، ' + W.lo + ' تا ' + W.hi + ' واژه، بی تاریخ و «پادکست» و یوتیوب. اگر همه «بله»، fix خالی.',
           '', 'ایدهٔ اعلام‌شده: ' + (p.idea || '—'), '', 'متنِ ریلز:', p.lines.map(function (x) { return x.text; }).join(' '),
           '', 'درس:', String(lesson || '').slice(0, 6000)];
  var r = null;
  try { r = geminiText_(L.join('\n'), IG_JUDGE_SCHEMA, 4096); } catch (e) { return { ok: false, why: 'داور جواب نداد: ' + String(e.message || e).slice(0, 80), fix: '' }; }
  if (!r) return { ok: false, why: 'داور جواب نداد', fix: '' };
  var yes = function (v) { return /^(بله|آری|yes)/i.test(String(v || '').trim()); };
  var miss = [];
  if (!yes(r.oneIdea)) miss.push('یک ایده نیست');
  if (!yes(r.flows)) miss.push('جمله‌ها پیوسته نیستند');
  if (!yes(r.answersHook)) miss.push('جوابِ قلاب نمی‌آید');
  if (!yes(r.faithful)) miss.push('ادعای بیرون از درس');
  if (!yes(r.popular)) miss.push('برای مخاطبِ عام سنگین است');
  if (!yes(r.thirst)) miss.push('چیزی نمی‌دهد یا کنجکاو نمی‌کند');
  return { ok: !miss.length, why: miss.join('، ') + (r.weak ? ' — ' + String(r.weak).slice(0, 120) : ''), fix: String(r.fix || '').trim() };
}

/** برچسبِ درس برای کپشن و عنوان: «درسِ ۵» یا «مرورِ بزرگِ درس‌های ۱ تا ۱۵». */
function igLessonLabel_(plan) {
  if (plan.recap) return plan.range ? String(plan.range) : 'مرورِ بزرگ';
  return plan.lesson ? 'درسِ ' + faDigitsOut_(String(plan.lesson)) : '';
}

/** برچسب‌ها: پایه + مدل، بی تکرار، تا `max`. */
function igTags_(plan, max) {
  var tags = [];
  (CFG.IG_TAGS_BASE || []).concat(plan.tags || []).forEach(function (t) { if (t && tags.indexOf(t) === -1 && tags.length < max) tags.push(t); });
  return tags;
}

/**
 * کپشنِ اینستاگرام (۹.۳۰ — «کپشن‌ها مناسبِ یوتیوب و اینستاگرام درست تهیه بشه»): سطرِ اول قلابی است که پیش از «بیشتر» دیده
 * می‌شود؛ بعد متن؛ بعد «کجا کامل است» با نامِ کانال و مجموعه و شمارهٔ درس (پیوندِ کپشنِ اینستاگرام کلیک‌پذیر نیست، پس نام هم
 * لازم است)؛ و ۱۲ برچسب، نه ۳۰ — برچسبِ بی‌ربطِ زیاد دسترسی را کم می‌کند. بی ایموجی (۹.۲۴).
 */
function igCaption_(plan, ytUrl, seriesName, lesson) {
  var mk = null;
  try { mk = ytMarkSpec_(); } catch (e) { mk = null; }
  var chan = (mk && mk.name) || 'رد پای حقیقت';
  var lab = igLessonLabel_({ recap: plan.recap, range: plan.range, lesson: lesson });
  var s = String(plan.caption || '').trim() + '\n\n' +
          'نسخهٔ کامل در یوتیوب، کانالِ «' + chan + '»' + ((mk && mk.handle) ? ' (' + mk.handle + ')' : '') + ':\n' + ytUrl + '\n' +
          'مجموعهٔ «' + seriesName + '»' + (lab ? ' — ' + lab : '') + '\n\n' +
          igTags_(plan, 12).map(function (t) { return '#' + t; }).join(' ');
  return s.length > 2200 ? s.slice(0, 2200) : s;
}

/**
 * عنوان و توضیحِ شورتزِ یوتیوب (۹.۳۰): عنوان = عنوانِ کاور + مجموعه و درس + #Shorts (≤۱۰۰)؛ توضیح = متنِ ویژهٔ یوتیوب
 * (`ytDesc`، جست‌وجوپذیر) + پیوندِ درسِ کامل + پیوندِ پلی‌لیستِ مجموعه + پیوندِ کانال + برچسب‌ها (سه تای اول بالای عنوان
 * دیده می‌شوند؛ بیش از ۱۵ یعنی یوتیوب همه را نادیده می‌گیرد).
 */
function igShortMeta_(plan, plUrl) {
  var mk = null;
  try { mk = ytMarkSpec_(); } catch (e) { mk = null; }
  var lab = igLessonLabel_(plan);
  var head = String(plan.plan.coverTitle || plan.plan.hook || plan.title || '').replace(/[«»]/g, '').trim();
  var tail = ' | ' + String(plan.series || '').slice(0, 40) + (lab ? '، ' + lab : '') + ' #Shorts';
  var title = (head.slice(0, Math.max(20, 100 - tail.length)) + tail).slice(0, 100);
  var tags = igTags_(plan.plan, 14);
  var desc = igCapClean_(String(plan.plan.ytDesc || plan.plan.caption || '')) + '\n\n' +
             'نسخهٔ کامل' + (lab ? ' (' + lab + ' از مجموعهٔ «' + plan.series + '»)' : '') + ':\n' + plan.yt + '\n' +
             (plUrl ? '\nهمهٔ درس‌های «' + plan.series + '» به ترتیب:\n' + plUrl + '\n' : '') +
             ((mk && mk.handle) ? '\nکانالِ «' + ((mk && mk.name) || 'رد پای حقیقت') + '»: https://www.youtube.com/' + mk.handle + '\n' : '') +
             '\n#Shorts ' + tags.map(function (t) { return '#' + t; }).join(' ');
  return { title: title, desc: desc.slice(0, 4900), tags: tags };
}

/* ───── مراحل ───── */

function igStepPlan_(it, fo) {
  var epFo = DriveApp.getFolderById(it.folderId);
  var meta = ytEpisodeMeta_(epFo);
  var ep = meta && meta.ep;
  if (!ep || !ep.sections) return { fail: '_special.json یا متنِ درس پیدا نشد' };
  var seriesName = String(meta.seriesName || it.series || '');
  /* شمارهٔ درس از **پوشهٔ مجموعه** (۸.۶۸ — `lesson`ِ پرونده یک بار «درس ۸» برای درسِ ۱۳ داد)؛ مرورِ بزرگ بازه‌اش را. */
  var recap = !!(it.recap || meta.recap), lesson = Number(it.lesson) || 0, range = '';
  try {
    var par = epFo.getParents(), lessons = par.hasNext() ? ytSeriesLessons_(par.next()) : [];
    for (var q = 0; q < lessons.length; q++) if (Number(lessons[q].ep) === Number(it.ep)) { recap = recap || !!lessons[q].recap; if (!lesson) lesson = lessons[q].lesson; }
    if (recap) range = ytRecapRange_(meta, lessons) || '';
  } catch (eL) {}
  if (!lesson && !recap) lesson = Number(meta.lesson) || 0;
  var opt = { recap: recap, range: range ? 'مرورِ بزرگِ ' + range.replace(/^مرورِ\s*(بزرگِ\s*)?/, '') : '', maxWords: Number(it.maxWords) || 0 };
  var r = null;
  try { r = geminiText_(igPrompt_(ep, seriesName, lesson, opt), IG_REEL_SCHEMA, 8192); }
  catch (e) { return { wait: 'مدلِ متن: ' + String(e.message || e).slice(0, 120) }; }
  var p = igPlanTrim_(r, opt);
  if (!p.lines) return { fail: 'متنِ ریلز پذیرفته نشد: ' + p.why };
  /* داوریِ پیوستگی: یک بازنویسی، و دوباره داوری. ضعیف منتشر نمی‌شود — شکست یعنی تلاشِ دوباره با مدلِ تازه. */
  var lessonTxt = igLessonText_(ep, recap ? 14000 : (Number(CFG.IG_SRC_CHARS) || 9000));
  var jd = { ok: true, why: '' };
  if (CFG.IG_JUDGE !== false) {
    jd = igJudge_(p, lessonTxt, opt);
    if (!jd.ok && jd.fix) {
      var p2 = igPlanTrim_({ idea: p.idea, script: jd.fix, scenes: p.scenes, coverTitle: p.coverTitle, caption: p.caption,
                             story: p.story, tags: p.tags, emph: p.emph, ytDesc: p.ytDesc }, opt);
      if (p2.lines) {
        var jd2 = igJudge_(p2, lessonTxt, opt);
        if (jd2.ok) { p = p2; jd = { ok: true, why: 'بازنویسی شد: ' + jd.why }; }
        else jd = jd2;
      }
    }
    if (!jd.ok) return { fail: 'داورِ پیوستگی نپذیرفت: ' + jd.why };
  }
  p.judge = jd.why || 'پیوسته';
  p.lines.push({ text: IG_CTA_LINE, scene: '', cta: true });
  p.recap = recap; p.range = opt.range;
  var plan = { v: Number(CFG.IG_PLAN_V) || 2, key: it.key, ep: it.ep, series: seriesName, seriesKey: String(meta.seriesKey || ''), lesson: lesson,
               recap: recap, range: opt.range, title: String(ep.title || ''),
               yt: it.yt, at: nowStr_(), phase: 'voice', plan: p,
               caption: igCaption_(p, it.yt, seriesName, lesson),
               voice: (ep.__cast && ep.__cast.lead) || CFG.TTS_VOICE_SPECIAL || CFG.TTS_VOICE };
  igPlanWrite_(fo, plan);
  try {
    var oldT = fo.getFilesByName('ریلز — متن و کپشن.txt');
    while (oldT.hasNext()) oldT.next().setTrashed(true);
    fo.createFile(Utilities.newBlob('ایده: ' + (p.idea || '') + '\nداور: ' + (p.judge || '') + '\n\n' +
                                    p.lines.map(function (x) { return x.text; }).join('\n') + '\n\n—— کپشنِ اینستاگرام ——\n' + plan.caption +
                                    '\n\n—— توضیحِ شورتزِ یوتیوب ——\n' + (p.ytDesc || ''),
                                    'text/plain', 'ریلز — متن و کپشن.txt'));
  } catch (eT) {}
  return { ok: true, plan: plan };
}

/**
 * صدا (۹.۲۶): **کلِ متن یک‌جا**، با اعراب و نشانه‌های لحن (همان `vowelizeText_`ِ پادکست) و دستورِ لحنِ قصه‌گو —
 * «گویندگی خوب نبود و حالت و روح نداشت»: هر جمله جدا ساخته می‌شد، پس هر جمله مثلِ جملهٔ اولِ یک متن، تخت و بی پیوند،
 * خوانده می‌شد. جملهٔ دعوت جدا ساخته می‌شود تا نسخهٔ شورتز سرِ آغازش تمیز بریده شود. زمانِ جمله‌ها این‌جا با نسبتِ
 * نویسه تخمین زده می‌شود؛ رانر زمانِ واقعیِ هر واژه را از خودِ صدا می‌گیرد (tools/reelalign.py).
 */
function igStepVoice_(it, fo, plan, deadline) {
  var sr = Number(CFG.SAMPLE_RATE) || 24000, gap = Math.round(sr * 0.45) * 2, lead = Math.round(sr * 0.15) * 2;
  var lines = plan.plan.lines, body = [], cta = null;
  for (var i = 0; i < lines.length; i++) { if (lines[i].cta) cta = lines[i]; else body.push(lines[i]); }
  var plain = body.map(function (x) { return x.text; }).join(' ');
  var vow = '';
  if (CFG.IG_VOWELIZE !== false) { try { vow = vowelizeText_(plain) || ''; } catch (eV) { vow = ''; } }
  plan.vowelized = !!vow;
  var b1 = null, b2 = null;
  try { b1 = ttsChunk_(applyPron_(vow || plain), String(CFG.IG_VOICE_STYLE || ''), plan.voice, true); }
  catch (e) { return { wait: 'گفتارساز: ' + String(e.message || e).slice(0, 120) }; }
  if (!b1) return { wait: 'گفتارساز صدایی نداد' };
  if (cta) {
    if (Date.now() > deadline) return { wait: 'وقت تمام شد (صدای جملهٔ پایانی)' };
    try { b2 = ttsChunk_(applyPron_(cta.text), String(CFG.IG_VOICE_STYLE || ''), plan.voice, true); } catch (e2) { b2 = null; }
    if (!b2) return { wait: 'گفتارساز صدای جملهٔ پایانی را نداد' };
  }
  var bytes = [];
  for (var z = 0; z < lead; z++) bytes.push(0);
  var p1 = Utilities.base64Decode(alignB64_(b1));
  var a0 = bytes.length / (sr * 2);
  for (var k = 0; k < p1.length; k++) bytes.push(p1[k]);
  var a1 = bytes.length / (sr * 2);
  /* نسبتِ نویسه درونِ صدای بدنه — جمله‌ها پشتِ‌هم. */
  var L = body.map(function (x) { return Math.max(1, String(x.text).replace(/\s+/g, '').length); });
  var tot = L.reduce(function (a, b) { return a + b; }, 0) || 1, acc = 0, times = [];
  for (var bi = 0; bi < body.length; bi++) {
    var t0 = a0 + (a1 - a0) * acc / tot; acc += L[bi];
    times.push({ t0: Math.round(t0 * 100) / 100, t1: Math.round((a0 + (a1 - a0) * acc / tot) * 100) / 100 });
  }
  if (b2) {
    for (var g = 0; g < gap; g++) bytes.push(0);
    var c0 = bytes.length / (sr * 2), p2 = Utilities.base64Decode(alignB64_(b2));
    for (var k2 = 0; k2 < p2.length; k2++) bytes.push(p2[k2]);
    times.push({ t0: Math.round(c0 * 100) / 100, t1: Math.round(bytes.length / (sr * 2) * 100) / 100 });
    for (var g2 = 0; g2 < lead * 3; g2++) bytes.push(0);
  }
  var wav = Utilities.newBlob(wavHeader54_(bytes.length).concat(bytes), 'audio/wav', 'ریلز — صدا.wav');
  var old = fo.getFilesByName('ریلز — صدا.wav');
  while (old.hasNext()) old.next().setTrashed(true);
  var f = fo.createFile(wav);
  plan.audioId = f.getId();
  plan.times = times;
  plan.seconds = Math.round(bytes.length / (sr * 2) * 10) / 10;
  /* سقفِ سه دقیقه (۹.۳۰): شورتزِ یوتیوب تا ۱۸۰ ثانیه است. بلندتر ⇒ از نو با متنی که به همان نسبت کوتاه‌تر است. */
  var capS = Math.max(30, Number(CFG.IG_MAX_SEC) || 178);
  if (plan.seconds > capS) {
    it.maxWords = Math.max(60, Math.floor((Number(plan.plan.words) || 150) * (capS - 12) / plan.seconds));
    return { fail: 'صدا ' + plan.seconds + ' ثانیه شد (سقف ' + capS + ') — از نو با حداکثر ' + it.maxWords + ' واژه' };
  }
  plan.phase = 'img';
  return { ok: true };
}

/** تصویر است؟ نام یا نوعِ فایل — هر کدام که در دسترس بود. */
function igIsImg_(f) {
  var mt = '';
  try { mt = String(f.getMimeType() || ''); } catch (e) { mt = ''; }
  return /^image\//.test(mt) || /\.(png|jpe?g|webp)$/i.test(String(f.getName() || ''));
}

function igStepImages_(it, fo, plan, deadline) {
  var lines = plan.plan.lines, want = Math.min(Math.max(1, Number(plan.recap ? CFG.IG_RECAP_IMG_N : CFG.IG_IMG_N) || 5), lines.length - 1);
  var ids = [], how = '';
  /* ۱) نقاشی‌های خودِ درس، اگر هست — به ترتیبِ نام (صحنه ۰۱، ۰۲…)، پخش روی کلِ درس. */
  try {
    var epFo = DriveApp.getFolderById(it.folderId), lvf = epFo.getFoldersByName(CFG.LV_FOLDER || 'تصویرها');
    if (lvf.hasNext()) {
      var all = [], fi = lvf.next().getFiles();
      while (fi.hasNext()) { var f = fi.next(); if (igIsImg_(f) && !/^کاور/.test(f.getName())) all.push(f); }
      all.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
      if (all.length) {
        for (var i = 0; i < want; i++) {
          var src = all[Math.min(all.length - 1, Math.floor((i + 0.5) * all.length / want))];
          if (ids.length && ids[ids.length - 1].src === src.getId()) continue;
          var cp = src.makeCopy('ریلز — تصویر ' + (ids.length + 1), fo);
          ids.push({ id: cp.getId(), src: src.getId() });
        }
        how = 'نقاشی‌های درس';
      }
    }
  } catch (eL) {}
  /* ۲) وگرنه تصویرِ عمودیِ تازه — فقط اگر تصویرسازی روشن است و سقفِ ماه جا دارد. */
  if (!ids.length) {
    var model = '';
    try { model = lvGenOn_() ? String((lvGenModel_() || {}).id || '') : ''; } catch (eM) { model = ''; }
    if (model && lvGenRoom_(model) >= want) {
      for (var j = 0; j < want; j++) {
        if (Date.now() > deadline) return { wait: 'وقت تمام شد (تصویرِ ' + (j + 1) + ')' };
        var scs = plan.plan.scenes || [];
        var ln = scs.length ? { scene: scs[Math.min(scs.length - 1, Math.floor(j * scs.length / want))] }
                            : lines[Math.min(lines.length - 2, Math.floor(j * (lines.length - 1) / want))];
        var pr = 'Vertical 9:16 painterly editorial illustration for an educational Persian video. ' +
                 'Absolutely no text, letters, numbers, captions, signs or logos. ' + String(ln.scene || ln.text);
        var g = lvGenOne_(model, pr, { aspect: '9:16' });
        if (g && g.blob) ids.push({ id: fo.createFile(g.blob.setName('ریلز — تصویر ' + (ids.length + 1) + '.png')).getId(), gen: true });
      }
      how = 'تصویرهای تازه (' + ids.length + ')';
    } else {
      how = 'بی تصویر — ' + (model ? 'سقفِ هزینهٔ ماهانهٔ تصویرسازی' : 'تصویرسازی خاموش است');
    }
  }
  plan.imgs = ids;
  plan.imgHow = how;
  plan.phase = 'ask';
  return { ok: true };
}

function igStepAsk_(it, fo, plan) {
  var n = (plan.imgs || []).length, L = plan.plan.lines;
  var lines = L.map(function (x, i) {
    var img = n ? Math.min(n - 1, Math.floor(i * n / Math.max(1, L.length - 1))) : -1;
    return { t0: plan.times[i].t0, t1: plan.times[i].t1, text: x.text, img: img, cta: !!x.cta };
  });
  var mk = null;
  try { mk = ytMarkSpec_(); } catch (eM) {}
  var sig = sha256Hex_(plan.audioId + '|' + (plan.imgs || []).map(function (x) { return x.id; }).join(',') + '|' + plan.plan.hook).slice(0, 12);
  var row = { key: it.key, sig: sig, at: nowStr_(),
              audio: { id: plan.audioId, url: ytDlUrl_(plan.audioId) },
              imgs: (plan.imgs || []).map(function (x) { return { id: x.id, url: ytDlUrl_(x.id) }; }),
              lines: lines, hook: plan.plan.hook, kicker: plan.series, coverTitle: plan.plan.coverTitle || plan.plan.hook,
              emph: plan.plan.emph || [], short: CFG.IG_SHORTS !== false,
              end: { l1: 'نسخهٔ کاملِ این درس در یوتیوب', l2: (mk && mk.name) || 'رد پای حقیقت',
                     handle: (mk && mk.handle) || '' },
              mark: { logoUrl: (mk && mk.logoUrl) ? String(mk.logoUrl).replace(/=s\d+-/, '=s800-') : '' } };
  ytShareOn_(plan.audioId);
  (plan.imgs || []).forEach(function (x) { ytShareOn_(x.id); });
  var d = ytRenderRead_();
  d.reels = (d.reels || []).filter(function (x) { return x && x.key !== it.key; });
  d.reels.push(row);
  if (!ytRenderSave_(d)) return { wait: 'صفِ رانر نوشته نشد' };
  try { ytQueueShare_(); } catch (eQ) {}
  try { ghRenderDue_('ریلزِ ' + it.key); } catch (eG) {}
  plan.sig = sig;
  plan.askedAt = nowStr_();
  plan.phase = 'got';
  return { ok: true };
}

function igStepGot_(it, fo, plan) {
  var doc = ytRenderDocFetch_(), r = doc && doc.reels && doc.reels[it.key];
  if (!r || !r.url || String(r.sig) !== String(plan.sig)) {
    var hrs = (Date.now() - parseWhen_(String(plan.askedAt || ''))) / 3600000;
    return { wait: 'رانر هنوز نساخته' + (isFinite(hrs) ? ' (' + Math.round(hrs) + ' ساعت)' : '') };
  }
  plan.video = r.url; plan.cover = r.cover; plan.seconds = r.seconds || plan.seconds;
  plan.short = String(r.short || ''); plan.shortSeconds = Number(r.shortSeconds) || 0; plan.align = String(r.align || '');
  try {
    var b = UrlFetchApp.fetch(r.url, { muteHttpExceptions: true, followRedirects: true });
    if (b.getResponseCode() === 200) fo.createFile(b.getBlob().setName('ریلز — ' + String(plan.title || it.key).slice(0, 60) + '.mp4'));
    var c = UrlFetchApp.fetch(r.cover, { muteHttpExceptions: true, followRedirects: true });
    if (c.getResponseCode() === 200) fo.createFile(c.getBlob().setName('ریلز — کاور.jpg'));
    /* نسخهٔ شورتزِ یوتیوب هم در همین پوشه (۹.۲۶: «نسخهٔ شورتز هم ذیلِ همون فولدر») — زیرپوشه، نه خودِ پوشهٔ قسمت:
       `ytVideoIn_` هر mp4ِ پوشهٔ قسمت را ویدئوی قسمت می‌گیرد. */
    if (plan.short) {
      var sh = UrlFetchApp.fetch(plan.short, { muteHttpExceptions: true, followRedirects: true });
      if (sh.getResponseCode() === 200) fo.createFile(sh.getBlob().setName('شورتز — ' + String(plan.title || it.key).slice(0, 60) + '.mp4'));
    }
  } catch (eS) { plan.saveWhy = String(eS.message || eS).slice(0, 100); }
  ytShareOff_(plan.audioId);
  (plan.imgs || []).forEach(function (x) { ytShareOff_(x.id); });
  var d = ytRenderRead_();
  var before = (d.reels || []).length;
  d.reels = (d.reels || []).filter(function (x) { return x && x.key !== it.key; });
  if (d.reels.length !== before) ytRenderSave_(d);
  plan.phase = 'ok';
  return { ok: true };
}

/** فهرستِ تأییدِ صاحبِ برنامه — `docs/ig-approve.json` در گیت‌هاب. */
function igApproved_() {
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.IG_APPROVE_FILE || 'docs/ig-approve.json'), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return {};
    var j = JSON.parse(res.getContentText()), m = {};
    (j.approved || []).forEach(function (k) { m[String(k)] = 1; });
    return m;
  } catch (e) { return {}; }
}

function igStepOk_(it, plan, st) {
  var need = Math.max(0, Number(CFG.IG_APPROVE) || 0);
  if ((Number((st.stats || {}).published) || 0) >= need) { plan.phase = 'pub'; return { ok: true }; }
  if (igApproved_()[it.key]) { plan.phase = 'pub'; plan.approvedAt = nowStr_(); return { ok: true }; }
  if (!plan.askedOwner) {
    var msg = '📱 ریلزِ اینستاگرام آماده است و منتظرِ تأییدِ شماست (' + it.key + ')\n«' + plan.plan.hook + '»\n' +
              'ویدئو: ' + plan.video + '\nکاور: ' + plan.cover + '\n\nبرای انتشار، تأیید را به کلاد بگویید.';
    try { tgSend_(msg); } catch (eT) {}
    try { mailQueue_('instagram', 'ریلزِ اینستاگرام منتظرِ تأیید — ' + it.key, msg); } catch (eM) {}
    plan.askedOwner = nowStr_();
  }
  return { wait: 'منتظرِ تأیید (' + ((Number((st.stats || {}).published) || 0) + 1) + ' از ' + need + ')' };
}

/** نویسهٔ چهاربایتی (ایموجی) و نیمه‌جفتِ تنها بیرون — کپشنِ برنامه‌هایی که پیش از ۹.۲۴ ساخته شدند هم پاک می‌رود. */
function igCapClean_(t) {
  return String(t || '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[ \t]+\n/g, '\n').replace(/(^|\n)[ \t]+/g, '$1');
}

/** فراخوانِ Graph؛ کلید در سرآیند. ⇒ {code, j} */
function igApi_(method, path, params) {
  var url = String(CFG.IG_GRAPH || 'https://graph.facebook.com/v23.0') + path;
  var opt = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + igToken_() } };
  if (params && method === 'post') opt.payload = params;
  else if (params) url += (url.indexOf('?') === -1 ? '?' : '&') + Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
  var res = UrlFetchApp.fetch(url, opt), j = {};
  try { j = JSON.parse(res.getContentText() || '{}'); } catch (e) { j = {}; }
  return { code: res.getResponseCode(), j: j };
}
function igErr_(r) { return String((r && r.j && r.j.error && r.j.error.message) || ('پاسخِ ' + (r && r.code))).slice(0, 160); }

/** ظرف را تا «FINISHED» می‌پاید ⇒ '' یا دلیل. */
function igWaitContainer_(cid, deadline) {
  while (Date.now() < deadline) {
    var r = igApi_('get', '/' + cid, { fields: 'status_code,status' });
    var s = String((r.j && r.j.status_code) || '');
    if (s === 'FINISHED') return '';
    if (s === 'ERROR' || s === 'EXPIRED') return 'ظرف: ' + s + ' — ' + String(r.j.status || '').slice(0, 120);
    Utilities.sleep(15000);
  }
  return 'wait';
}

function igStepPub_(it, plan, st, deadline) {
  var a = igAcct_();
  if (!a) return { wait: 'حسابِ اینستاگرام ثبت نیست' };
  var day = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  st.stats = st.stats || {};
  if (st.stats.day !== day) { st.stats.day = day; st.stats.dayN = 0; }
  if ((Number(st.stats.dayN) || 0) >= Math.max(1, Number(CFG.IG_PER_DAY) || 4)) return { wait: 'سهمِ امروز پر شد' };
  if (!plan.reelCid) {
    var c = igApi_('post', '/' + a.ig + '/media', { media_type: 'REELS', video_url: plan.video, cover_url: plan.cover,
                                                    caption: igCapClean_(plan.caption), share_to_feed: 'true' });
    if (!(c.j && c.j.id)) return { fail: 'ظرفِ ریلز ساخته نشد: ' + igErr_(c) };
    plan.reelCid = String(c.j.id);
  }
  if (!plan.reelId) {
    var w = igWaitContainer_(plan.reelCid, deadline);
    if (w === 'wait') return { wait: 'ویدئو در متا هنوز آماده نیست' };
    if (w) { plan.reelCid = ''; return { fail: w }; }
    var p = igApi_('post', '/' + a.ig + '/media_publish', { creation_id: plan.reelCid });
    if (!(p.j && p.j.id)) return { fail: 'انتشارِ ریلز: ' + igErr_(p) };
    plan.reelId = String(p.j.id);
    st.media = st.media || {};
    st.media[plan.reelId] = it.key;
    var mk = Object.keys(st.media);
    if (mk.length > 80) delete st.media[mk[0]];
    try { plan.permalink = String((igApi_('get', '/' + plan.reelId, { fields: 'permalink' }).j || {}).permalink || ''); } catch (eP) {}
    st.stats.dayN = (Number(st.stats.dayN) || 0) + 1;
    st.stats.published = (Number(st.stats.published) || 0) + 1;
  }
  /* استوری: کاورِ همان ریلز. شکستش ریلز را «نشد» نمی‌کند — ریلز منتشر شده و منتشرشده برنمی‌گردد. */
  if (CFG.IG_STORY !== false && !plan.storyId && !plan.storyWhy) {
    var s = igApi_('post', '/' + a.ig + '/media', { media_type: 'STORIES', image_url: plan.cover });
    if (s.j && s.j.id) {
      var ws = igWaitContainer_(String(s.j.id), deadline);
      if (!ws) {
        var ps = igApi_('post', '/' + a.ig + '/media_publish', { creation_id: String(s.j.id) });
        if (ps.j && ps.j.id) plan.storyId = String(ps.j.id); else plan.storyWhy = igErr_(ps);
      } else if (ws !== 'wait') plan.storyWhy = ws;
    } else plan.storyWhy = igErr_(s);
  }
  plan.phase = 'yts';
  try { tgSend_('✅ ریلزِ اینستاگرام منتشر شد: ' + (plan.permalink || plan.reelId) + '\n«' + plan.plan.hook + '»'); } catch (eT) {}
  return { ok: true };
}

/**
 * شورتزِ یوتیوب (۹.۲۶) — همان ریلز بی کارتِ پایانی و بی جملهٔ دعوت. «جوری که قاطیِ پلی‌لیست‌های درس‌نامه و از همه جا
 * نشه و خودش ویدئوی کوتاه حساب بشه»: ویدئوی عمودیِ زیرِ سه دقیقه را یوتیوب خودش «شورتز» می‌شمرد؛ این‌جا به **هیچ**
 * پلی‌لیستی افزوده نمی‌شود. توضیح: همان کپشن + نشانیِ ویدئوی کاملِ درس + نشانیِ پلی‌لیستِ مجموعه. اول unlisted،
 * و فقط پس از وارسیِ نشتی (`ytLeaks_`) عمومی — همان دروازهٔ ویدئوهای کامل. تأیید همان کلیدِ ریلز است: محتوا یکی است.
 * شکستِ شورتز ریلزِ منتشرشده را برنمی‌گرداند؛ علتش در `shortWhy` و تب می‌نشیند. سهمیه ⇒ صبر تا فردا.
 */
function igShortPub_(it, plan) {
  if (CFG.IG_SHORTS === false) { plan.shortWhy = 'خاموش (IG_SHORTS)'; return { ok: true }; }
  if (!plan.short) { plan.shortWhy = 'رانر نسخهٔ شورتز نداد'; return { ok: true }; }
  if (plan.shortId) { igShortThumb_(plan); return { ok: true }; }
  var yt = ytSvc_();
  if (!yt) { plan.shortWhy = ytOffWhy_(); return { ok: true }; }
  var plUrl = '';
  try {
    var pl = ytPlFor_({ show: ENRICH_SHOW_SPECIAL, seriesKey: plan.seriesKey || '' }, plan.series, CFG.SPECIAL_SHOW_NAME);
    if (pl && pl.id) plUrl = 'https://www.youtube.com/playlist?list=' + pl.id;
  } catch (eP) {}
  var sm = igShortMeta_(plan, plUrl), title = sm.title, desc = sm.desc;
  var leaks = ytLeaks_(title + '\n' + desc);
  if (!igShortQuotaOk_()) return { wait: 'سهمیهٔ یوتیوب برای قسمت‌های کاملِ امروز کنار گذاشته شده' };
  if (!ytQuotaTake_(YT_COST.videosInsert, true)) return { wait: 'سهمیهٔ آپلودِ یوتیوب امروز تمام شد' };
  var blob = null;
  try {
    var res = UrlFetchApp.fetch(plan.short, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) { plan.shortWhy = 'دانلودِ نسخهٔ شورتز: ' + res.getResponseCode(); return { ok: true }; }
    blob = res.getBlob().setName('short.mp4').setContentType('video/mp4');
  } catch (eD) { plan.shortWhy = 'دانلودِ نسخهٔ شورتز: ' + String(eD.message || eD).slice(0, 100); return { ok: true }; }
  try {
    var made = yt.Videos.insert({
      snippet: { title: title, description: desc, tags: sm.tags,
                 categoryId: CFG.YT_CATEGORY_SPECIAL || '27', defaultLanguage: CFG.YT_LANG || 'fa', defaultAudioLanguage: CFG.YT_LANG || 'fa' },
      status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false }
    }, 'snippet,status', blob);
    plan.shortId = made && made.id ? String(made.id) : '';
  } catch (eU) { plan.shortWhy = 'آپلودِ شورتز: ' + String(eU.message || eU).slice(0, 160); return { ok: true }; }
  if (!plan.shortId) { plan.shortWhy = 'یوتیوب شناسه برنگرداند'; return { ok: true }; }
  plan.shortUrl = 'https://www.youtube.com/shorts/' + plan.shortId;
  try { var qS = ytQuota_(); qS.shorts = (Number(qS.shorts) || 0) + 1; ytQuotaSave_(qS); } catch (eQs) {}
  igShortThumb_(plan);
  if (leaks.length) { plan.shortWhy = 'نشتیِ خصوصی در متن — unlisted ماند'; return { ok: true }; }
  try {
    if (ytQuotaTake_(YT_COST.videosUpdate, false)) {
      yt.Videos.update({ id: plan.shortId, status: { privacyStatus: 'public', selfDeclaredMadeForKids: false } }, 'status');
      plan.shortPublic = true;
    } else plan.shortWhy = 'سهمیهٔ به‌روزرسانی — unlisted ماند';
  } catch (eV) { plan.shortWhy = 'عمومی نشد: ' + String(eV.message || eV).slice(0, 120); }
  try { tgSend_('▶️ شورتزِ یوتیوب: ' + plan.shortUrl + (plan.shortPublic ? '' : ' (هنوز unlisted — ' + (plan.shortWhy || '') + ')')); } catch (eT) {}
  return { ok: true };
}

/**
 * سهمیهٔ شورتز (۹.۳۲) — «جداش کن». ریلز دیگر پشتِ شورتز نمی‌ایستد (صفِ `st.shortQ`)، و شورتز هم نباید جای قسمتِ
 * کاملِ همان روز را بگیرد: یک آپلود ۱۶۰۰ واحد است و سقفِ روزانهٔ موتور ۹۰۰۰. پس شورتز فقط وقتی می‌رود که پس از آن، برای
 * `IG_SHORT_KEEP_UP` آپلودِ کاملِ **هنوز نرفتهٔ** امروز جا بماند. آپلودهای کامل = همهٔ آپلودها منهای شورتزها (`q.shorts`).
 */
function igShortQuotaOk_() {
  var q = ytQuota_();
  var cap = Math.max(100, Number(CFG.YT_QUOTA_UNITS) || 9000);
  var full = Math.max(0, (Number(q.uploads) || 0) - (Number(q.shorts) || 0));
  var keep = Math.max(0, (Number(CFG.IG_SHORT_KEEP_UP) || 0) - full) * (YT_COST.videosInsert + YT_COST.thumbSet + YT_COST.videosUpdate);
  var need = YT_COST.videosInsert + YT_COST.videosUpdate + YT_COST.thumbSet;
  return (Number(q.units) || 0) + need + keep <= cap;
}

/** شورتزی که منتظرِ سهمیه است به صف — ریلزِ همان درس تمام‌شده حساب می‌شود و جای ریلزِ بعدی را نمی‌گیرد. */
function igShortEnqueue_(st, it) {
  st.shortQ = st.shortQ || [];
  if (st.shortQ.some(function (x) { return x.key === it.key; })) return;
  st.shortQ.push({ key: it.key, ep: it.ep, folderId: it.folderId });
}

/**
 * صفِ شورتز، **به ترتیب**: فقط سرِ صف؛ اگر منتظرِ سهمیه است، بقیه هم منتظر می‌مانند — شورتزِ درسِ ۵ پیش از درسِ ۴ بالا
 * نمی‌رود. ⇒ شمارِ شورتزهای رفته در این دور.
 */
function igShortQueueRun_(st, deadline) {
  var q = st.shortQ || [], n = 0;
  while (q.length && Date.now() < deadline - 30000) {
    var h = q[0], fo = null, plan = null;
    try { fo = igFolder_(DriveApp.getFolderById(h.folderId)); plan = igPlanRead_(fo); } catch (eF) {}
    if (!plan) { q.shift(); continue; }
    if (plan.shortId) { q.shift(); continue; }
    var r = igShortPub_(h, plan);
    if (r.wait) { st.shortWhy = r.wait; break; }
    plan.shortQueued = '';
    igPlanWrite_(fo, plan);
    q.shift(); n++;
  }
  st.shortQ = q;
  if (!q.length) st.shortWhy = '';
  return n;
}

/**
 * کاورِ شورتز (۹.۳۱) — «برای ویدیوهای شورت یوتیوب کاور میخواد … فکر کنم نذاشتی». نگذاشته بودم: `igShortPub_` فقط
 * `videos.insert` می‌زد و کاوری که رانر برای همین ریلز ساخته بود (`plan.cover`، ۱۰۸۰×۱۹۲۰) فقط به اینستاگرام می‌رفت.
 * همان کاور با `thumbnails.set` (همان راهی که ویدئوهای کامل می‌روند، همان سهمیهٔ `thumbSet`). شکستش شورتز را «نشد»
 * نمی‌کند — ویدئو منتشر شده — ولی علت در `shortThumbWhy` می‌ماند و دیگر هر دور تکرار نمی‌شود. سقفِ ۲ مگِ یوتیوب پیش از
 * فرستادن سنجیده می‌شود، نه با خطای بی‌نامِ API. ⇒ true اگر نشست.
 */
function igShortThumb_(plan) {
  if (!plan || !plan.shortId || plan.shortThumb || plan.shortThumbWhy) return !!(plan && plan.shortThumb);
  if (CFG.YT_THUMB === false) return false;
  if (!plan.cover) { plan.shortThumbWhy = 'کاوری از رانر نیامده'; return false; }
  var yt = ytSvc_();
  if (!yt) return false;                                   // بعداً دوباره؛ دلیلی ثبت نمی‌شود چون عیبِ کاور نیست
  if (!ytQuotaTake_(YT_COST.thumbSet, false)) return false;
  try {
    var res = UrlFetchApp.fetch(plan.cover, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) { plan.shortThumbWhy = 'دانلودِ کاور: ' + res.getResponseCode(); return false; }
    var blob = res.getBlob();
    var n = blob.getBytes().length;
    if (n > 2 * 1024 * 1024) { plan.shortThumbWhy = 'کاور ' + Math.round(n / 1024) + ' کیلوبایت است؛ سقفِ یوتیوب ۲ مگ'; return false; }
    yt.Thumbnails.set(plan.shortId, blob.setName('cover.jpg').setContentType('image/jpeg'));
    plan.shortThumb = true;
    return true;
  } catch (e) { plan.shortThumbWhy = 'کاورِ شورتز: ' + String(e.message || e).slice(0, 120); return false; }
}

/**
 * جبرانِ شورتزهایی که پیش از ۹.۳۱ بی کاور منتشر شدند — یک‌بار، خودش خاموش می‌شود (`st.thumbRetro`). از روی `_ig.json`ها
 * (نه فهرستِ دستی): هر برنامه‌ای که `shortId` دارد و نه `shortThumb` نه `shortThumbWhy`. سه تا در هر دور.
 */
function igShortThumbRetro_(st, deadline) {
  if (st.thumbRetro) return 0;
  var left = 0, did = 0;
  var it = DriveApp.searchFiles('title = "_ig.json" and trashed = false');
  while (it.hasNext() && Date.now() < deadline - 20000) {
    var f = it.next(), p = null;
    try { p = JSON.parse(f.getBlob().getDataAsString()); } catch (eJ) { continue; }
    if (!p || !p.shortId || p.shortThumb || p.shortThumbWhy) continue;
    if (did >= 3) { left++; break; }
    igShortThumb_(p);
    if (p.shortThumb || p.shortThumbWhy) { f.setContent(JSON.stringify(p, null, 1)); did++; }
    else left++;
  }
  if (!left && !it.hasNext()) st.thumbRetro = nowStr_();
  return did;
}

/** یک ردیف در تبِ «انتشار در اینستاگرام». */
function igLog_(it, plan) {
  var sh = igSheet_(CFG.IG_TAB || 'انتشار در اینستاگرام',
                    ['زمان', 'قسمت', 'مجموعه', 'درس', 'قلاب', 'ریلز', 'استوری', 'یوتیوب', 'تصویرها', 'ثانیه', 'شورتزِ یوتیوب', 'ایده']);
  sh.appendRow([nowStr_(), it.ep, plan.series, igLessonLabel_(plan), plan.plan.hook, plan.permalink || plan.reelId || '',
                plan.storyId ? 'منتشر شد' : (plan.storyWhy || ''), plan.yt, plan.imgHow || '', plan.seconds || '',
                plan.shortUrl ? plan.shortUrl + (plan.shortPublic ? '' : ' (unlisted)') : (plan.shortWhy || (plan.shortQueued ? 'در صفِ شورتز' : '')), plan.plan.idea || '']);
}

/* ───── گردانندهٔ اجرای جدا ───── */

/** درِ ساعتی: فقط Properties؛ کار در اجرای جدای خودش (همان شکلِ `speakAbArm_`). */
function igArm_() {
  if (!igOn_()) return false;
  var st = igState_();
  if (st.armedAt && Date.now() - Number(st.armedAt) < 50 * 60000) return false;
  if (engineBusyForSwap_()) return false;
  st.armedAt = Date.now();
  igStateSave_(st);
  clearRetryTriggers_('igTick');
  ScriptApp.newTrigger('igTick').timeBased().after(60000).create();
  return true;
}

/** یک دور: ریلزهای در جریان یک گام جلو، و اگر جا هست یکی تازه. */
function igTick() {
  runEnter_('igTick');
  var t0 = Date.now(), deadline = t0 + Math.max(60, Number(CFG.IG_TICK_SEC) || 240) * 1000;
  var st = igState_();
  try {
    try { clearRetryTriggers_('igTick'); } catch (eC) {}
    if (!igOn_()) return null;
    /* ۹.۳۹: اول، نه پشتِ گام‌ها — پشتِ «اگر ۵۰ ثانیه مانده» بود و گامِ تصویر کلِ ۲۴۰ ثانیه را می‌خورد، پس پس از نصبِ ۹.۳۸
       تب‌ها سرِ جایشان ماندند («رفرش کردم، هنوز هستن»). کارش چند خواندنِ هاب است و یک بار در عمر. */
    if (!st.hubRetired) { try { igHubRetire_(st); } catch (eHp) {} }
    st.inflight = st.inflight || [];
    if (st.inflight.length < Math.max(1, Number(CFG.IG_INFLIGHT) || 2)) {
      var nx = igNextEp_(ytPublished_(getHub_()), st);
      if (nx) {
        var fo0 = ytFolderOf_(ENRICH_SHOW_SPECIAL, nx.ep, nx.series);
        if (fo0) st.inflight.push({ key: 'ig:' + ENRICH_SHOW_SPECIAL + ':' + nx.ep, ep: nx.ep, series: nx.series,
                                    folderId: fo0.getId(), yt: nx.url, phase: 'plan', at: nowStr_(),
                                    recap: nx.recap ? 1 : 0, lesson: nx.lesson || 0 });
        else { st.fails = st.fails || {}; st.fails[String(nx.ep)] = 9; st.lastWhy = 'پوشهٔ قسمتِ ' + nx.ep + ' پیدا نشد'; }
      }
    }
    var keep = [];
    for (var i = 0; i < st.inflight.length; i++) {
      var it = st.inflight[i], res = null;
      if (Date.now() > deadline) { keep.push(it); continue; }
      try { res = igStep_(it, st, deadline); } catch (e) { res = { wait: String(e.message || e).slice(0, 140) }; }
      it.why = res.wait || res.fail || '';
      if (it.sincePhase !== it.phase) { it.sincePhase = it.phase; it.since = Date.now(); }
      if (res.done) { st.done = (st.done ? st.done + ',' : '') + it.ep; st.lastAt = nowStr_(); continue; }
      if (res.fail) {
        st.fails = st.fails || {};
        st.fails[String(it.ep)] = (Number(st.fails[String(it.ep)]) || 0) + 1;
        st.lastWhy = it.key + ': ' + res.fail;
        /* سقفِ تلاش ⇒ کنار تا `IG_RETRY_H`، بعد همان درس دوباره (۹.۳۰) — رها کردن یعنی جاافتادن. */
        if (st.fails[String(it.ep)] >= Math.max(1, Number(CFG.IG_TRY_MAX) || 3)) {
          st.failAt = st.failAt || {}; st.failAt[String(it.ep)] = Date.now();
          continue;
        }
        it.phase = 'plan';                         // از نو، با مدلِ تازه
      }
      keep.push(it);
    }
    st.inflight = keep;
    if ((st.shortQ || []).length) { try { igShortQueueRun_(st, deadline); } catch (eSq) { st.shortWhy = String(eSq.message || eSq).slice(0, 120); } }
    if (deadline - Date.now() > 40000) { try { igShortThumbRetro_(st, deadline); } catch (eTr) { st.thumbWhy = String(eTr.message || eTr).slice(0, 120); } }
    if (deadline - Date.now() > 60000) { try { igInsights_(st, deadline); } catch (eIn) { st.lastWhy = 'آمار: ' + String(eIn.message || eIn).slice(0, 120); } }
    return null;
  } finally {
    st.armedAt = 0;
    st.ranAt = nowStr_();
    st.ranMs = Date.now();
    igStateSave_(st);
    runExit_('igTick');
  }
}

/** یک گامِ یک ریلز. ⇒ {done} | {ok} | {wait} | {fail} */
function igStep_(it, st, deadline) {
  var fo = igFolder_(DriveApp.getFolderById(it.folderId));
  var plan = it.phase === 'plan' ? null : igPlanRead_(fo);
  if (it.phase !== 'plan' && !plan) it.phase = 'plan';
  /* برنامه‌ای با پرامپتِ کهنه که هنوز منتشر نشده، از نو (۹.۲۵): «ارتباطِ معنایی اصلاً خوب نبود» برای ریلزی گفته شد
     که منتظرِ تأیید بود؛ تأییدِ آن یعنی انتشارِ همان شعارهای جدا. منتشرشده دست نمی‌خورد. */
  if (plan && !plan.reelId && (Number(plan.v) || 1) < (Number(CFG.IG_PLAN_MIN) || 3)) {
    try { var dq = ytRenderRead_(); var nb = (dq.reels || []).length;
          dq.reels = (dq.reels || []).filter(function (x) { return x && x.key !== it.key; });
          if (dq.reels.length !== nb) ytRenderSave_(dq); } catch (eQ) {}
    it.phase = 'plan'; plan = null;
  }
  var r;
  for (var guard = 0; guard < 8 && Date.now() < deadline; guard++) {
    if (it.phase === 'plan') { r = igStepPlan_(it, fo); if (!r.ok) return r; plan = r.plan; it.phase = plan.phase; continue; }
    if (plan.phase === 'voice') r = igStepVoice_(it, fo, plan, deadline);
    else if (plan.phase === 'img') r = igStepImages_(it, fo, plan, deadline);
    else if (plan.phase === 'ask') r = igStepAsk_(it, fo, plan);
    else if (plan.phase === 'got') r = igStepGot_(it, fo, plan);
    else if (plan.phase === 'ok') r = igStepOk_(it, plan, st);
    else if (plan.phase === 'pub') {
      /* انتشار به ترتیبِ درس (۹.۳۰): دو ریلز هم‌زمان ساخته می‌شوند، ولی درسِ ۵ پیش از درسِ ۴ منتشر نمی‌شود. */
      var pend = igEarlierPending_(st, it.ep);
      if (pend) return { wait: 'منتظرِ انتشارِ ' + pend + ' همین مجموعه' };
      r = igStepPub_(it, plan, st, deadline);
    }
    else if (plan.phase === 'yts') {
      /* ۹.۳۲: شورتزِ منتظرِ سهمیه ریلز را نگه نمی‌دارد — به صف می‌رود و ریلز تمام می‌شود. و اگر صف پُر است، این هم
         پشتِ آن می‌ایستد، وگرنه شورتزِ درسِ بعد پیش از درسِ قبل بالا می‌رفت. */
      r = (st.shortQ || []).length ? { wait: 'صف' } : igShortPub_(it, plan);
      if (r.wait) { plan.shortQueued = nowStr_(); igShortEnqueue_(st, it); r = { ok: true }; }
      if (r.ok) { plan.phase = 'done'; plan.doneAt = nowStr_(); try { igLog_(it, plan); } catch (eL) {} }
    }
    else if (plan.phase === 'done') return { done: true };
    else { plan.phase = 'voice'; continue; }
    igPlanWrite_(fo, plan);
    it.phase = plan.phase;
    if (!r.ok) return r;
    if (plan.phase === 'done') return { done: true };
  }
  return { wait: 'ادامه در دورِ بعد' };
}

/** خطِ آمار برای خطِ روزانه: عدد وقتی هست، دلیل وقتی نیست — هر بخش جدا. */
function igInsLine_(ins) {
  if (!ins) return '. آمار و نظرها هنوز خوانده نشده';
  var w = ins.why || {}, L = [];
  if (ins.followers !== undefined) L.push(ins.followers + ' دنبال‌کننده');
  L.push(ins.posts + ' پست در «اینستاگرام — آمار»');
  L.push(ins.newComments + ' نظرِ تازه');
  L.push(w.msgs ? 'پیام‌ها: نشد — ' + w.msgs : ins.newMsgs + ' پیامِ تازه');
  if (w.posts) L.push('آمار/نظرها: ' + w.posts);
  if (w.account) L.push('حساب: ' + w.account);
  return '. آمار (' + ins.at + '): ' + L.join('، ');
}

/** برای `_STATUS.json` — فقط Properties. */
function igStatus_() {
  var st = igState_(), a = igAcct_();
  var on = CFG.IG_ON !== false && !!a;
  var done = String(st.done || '').split(',').filter(Boolean).length;
  var fl = st.inflight || [];
  var out = { on: on, user: a ? a.user : '', done: done, published: Number((st.stats || {}).published) || 0,
              today: (st.stats || {}).day === Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd') ? Number(st.stats.dayN) || 0 : 0,
              inflight: fl.map(function (x) { return { key: x.key, phase: x.phase, why: x.why || '' }; }),
              lastAt: st.lastAt || '', lastWhy: st.lastWhy || '', ranAt: st.ranAt || '', ins: st.ins || null,
              gaps: st.gaps || [], caught: st.caught || [], book: igBookUrl_(),
              shortQ: (st.shortQ || []).map(function (x) { return x.ep; }), shortWhy: st.shortWhy || '',
              order: igOrderDec_((st.order && st.order.s) || []).map(function (S) {
                var dn = igDoneMap_(st), n = S.eps.filter(function (x) { return dn[String(x.ep)]; }).length;
                return { series: S.name, done: n, total: S.eps.length };
              }) };
  out.line = !a ? 'اینستاگرام: کلید ثبت نشده (منوی «۴) کلیدِ اینستاگرام (متا)»).'
    : 'اینستاگرام @' + a.user + ': ' + out.published + ' ریلز منتشر شده، امروز ' + out.today + '؛ در جریان: ' +
      (fl.length ? fl.map(function (x) { return x.key.split(':').pop() + ' (' + x.phase + (x.why ? ' — ' + x.why : '') + ')'; }).join('، ') : 'هیچ') +
      (out.lastWhy ? '. آخرین ایراد: ' + out.lastWhy : '') +
      igInsLine_(st.ins) +
      ((st.shortQ || []).length ? '. شورتزِ در صف: ' + st.shortQ.length + ' (به ترتیب؛ ' + (st.shortWhy || 'دورِ بعد') + ')' : '') +
      ((st.gaps || []).length ? '. ⚠️ ترتیب: ' + st.gaps.join(' · ') : '') +
      (igBookUrl_() ? '. دفتر: ' + igBookUrl_() : '') +
      '. ⟨شما⟩ هایلایت، بیو و برچسبِ پیوندِ استوری از API در دسترس نیست — از خودِ اپ.';
  return out;
}

/**
 * سلامتِ روزانه: خطِ اینستاگرام **همیشه** در یادداشت‌ها (سکوت با «هیچ ریلزی نرفت» یکی است)، و مسئلهٔ روز وقتی
 * (۱) روشن است ولی اجرای جدا بیش از `IG_IDLE_H` ساعت ندویده، یا (۲) ریلزی بیش از `IG_STUCK_H` ساعت در یک گام
 * مانده — مگر گامِ «تأیید» که کارِ صاحبِ برنامه است، نه خرابی — یا (۳) درسی به سقفِ تلاش رسید و کنار رفت.
 */
function igHealth_(problems, notes) {
  var s = igStatus_();
  if (s.line) notes.push(s.line);
  if (!s.on) return s;
  var st = igState_(), now = Date.now(), bad = [];
  var ran = Number(st.ranMs) || 0;
  if (igToken_() && (!ran || now - ran > (Number(CFG.IG_IDLE_H) || 6) * 3600000))
    bad.push('اجرای ریلز ' + (ran ? Math.round((now - ran) / 3600000) + ' ساعت است' : 'هرگز') + ' ندویده');
  (st.inflight || []).forEach(function (x) {
    if (x.phase === 'ok') return;
    if (!x.since || x.sincePhase !== x.phase) return;
    var h = (now - Number(x.since)) / 3600000;
    if (h > (Number(CFG.IG_STUCK_H) || 30)) bad.push(x.key + ' ' + Math.round(h) + ' ساعت در گامِ «' + x.phase + '»' + (x.why ? ' — ' + x.why : ''));
  });
  /* ۹.۳۰: «جاافتادن» دیگر کنار گذاشتنِ بی‌صدا نیست — مجموعه سرِ همان درس می‌ایستد، و این‌جا گفته می‌شود. */
  (st.gaps || []).forEach(function (g) { bad.push('ترتیب: ' + g); });
  if ((st.inflight || []).length === 0 && !(st.gaps || []).length && st.order && (st.caught || []).length && igToken_())
    notes.push('📱 ریلزها به آخرین درسِ منتشرشدهٔ همهٔ مجموعه‌ها رسیده‌اند؛ همراهِ تولید جلو می‌روند.');
  if (bad.length) {
    problems.push('📱 اینستاگرام: ' + bad.join(' · '));
    try {
      logSelfFinding_(getHub_(), {
        priority: 'متوسط', category: 'اینستاگرام', key: 'ig-stuck',
        title: 'ریلزِ اینستاگرام جلو نمی‌رود',
        detail: bad.join(' · '),
        instruction: 'گام‌ها در src/38_Instagram.gs (igStep_). «got» دیرکرده یعنی رانر (`reels` در `_YT-RENDER.json` و ' +
                     '`docs/renders.json`)؛ «pub» یعنی Graph (پیامِ خطا در why)؛ «ندویده» یعنی igArm_ در vbrCollectHourly. ' +
                     '`_ig.json`ِ پوشهٔ «اینستاگرام»ِ همان قسمت را بخوان.',
        owner: ROWNER_CODE
      });
    } catch (eF) {}
  }
  return s;
}

/* ═══════════════ آمار، نظرها و پیام‌ها (۹.۲۲) ═══════════════
   صاحبِ برنامه: «… داده‌های اینستاگرام مثلِ بازدیدها و کامنت‌های زیرِ ویدئوها و بازخوردها و مسیج‌ها رو … در شیت
   ثبت کنه و نشون بده».

   سه تب، سه شکلِ داده — چون سه پرسشِ جدا جوابشان است:
   • «اینستاگرام — آمار»: یک ردیف برای هر پست (به‌روز می‌شود، نه افزوده): بازدید، دسترسی، لایک، نظر، اشتراک،
     ذخیره، میانگینِ تماشا. «الان چطور است؟»
   • «اینستاگرام — نظرها»: فقط افزوده؛ هر نظر یک بار، با شناسه‌اش. «چه کسی چه گفت، و از کِی؟»
   • «اینستاگرام — پیام‌ها»: فقط افزوده؛ هر پیامِ دایرکت یک بار.

   منبعِ فهرستِ پست‌ها **خودِ حساب** است (`/{ig}/media`)، نه حافظهٔ موتور: پستی که دستی گذاشته شده هم آمار دارد.
   هر بخش جدا شکست می‌خورد و دلیلش جدا ثبت می‌شود (`st.ins.why`): کلیدی که دسترسیِ پیام ندارد نباید آمار را هم
   بخواباند — و «پیام‌ها: دسترسی نیست — <پیامِ خودِ متا>» در خطِ روزانه، به‌جای سکوت.

   هر `IG_INS_HOURS` ساعت؛ تازه‌ترین `IG_INS_RECENT` پست هر بار، و بقیه به نوبت (`insCur`) — آمارِ پستِ کهنه کند
   عوض می‌شود و ۲۰۰ فراخوان در ساعت سقفِ متاست. */

/**
 * دفترِ اینستاگرام — یک شیتِ **جدا** از هاب (۹.۳۰). صاحبِ برنامه پرسید «اون شیت ببین درست بازدیدها و کامنت‌ها و مسیج‌ها
 * … رصد می‌کنه یا نه» — نمی‌کرد: از نخستین خواندن هر بار «Service Spreadsheets timed out while accessing document» روی هابِ
 * ۲۹ مگابایتی، و درمانِ ۹.۲۴ (ساعتِ بعد دوباره) همان دیوار را دوباره می‌زد. سه تبِ آمار/نظر/پیام و دفترِ انتشار حالا در
 * «اینستاگرام — انتشار، آمار، نظرها و پیام‌ها» زیرِ OUTPUT/«اینستاگرام»اند؛ شناسه در Properties، نه جست‌وجوی نام.
 */
function igBook_() {
  var pr = props_(), id = '';
  try { id = String(pr.getProperty(PK.IG_BOOK) || ''); } catch (e) { id = ''; }
  if (id) { try { return SpreadsheetApp.openById(id); } catch (eO) { id = ''; } }
  var ss = SpreadsheetApp.create(String(CFG.IG_BOOK_NAME || 'اینستاگرام — انتشار، آمار، نظرها و پیام‌ها'));
  try {
    var root = outFolder_(), nm = String(CFG.IG_BOOK_FOLDER || 'اینستاگرام');
    var it = root.getFoldersByName(nm), fo = it.hasNext() ? it.next() : root.createFolder(nm);
    DriveApp.getFileById(ss.getId()).moveTo(fo);
  } catch (eM) {}
  try { pr.setProperty(PK.IG_BOOK, ss.getId()); } catch (eP) {}
  return ss;
}
function igBookUrl_() {
  try { var id = String(props_().getProperty(PK.IG_BOOK) || ''); return id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : ''; }
  catch (e) { return ''; }
}

/**
 * تب‌های کهنهٔ اینستاگرام در هاب، کنار (۹.۳۸) — «اگر این دوتا تب در شیتِ اصلی دیگه کار نمی‌کنن … حذفش کن، ولی با دقتِ بسیار».
 * از ۹.۳۰ همه‌چیزِ اینستاگرام در دفترِ جداست (هابِ ۲۹ مگابایتی هر نوشتن را «timed out» می‌کرد) و ۹.۳۴ فقط نشانیِ دفتر را در
 * ردیفِ ۲ِ این تب‌ها گذاشت. حالا: تبی که **جز سرستون و همان نشانی هیچ نداشت** حذف می‌شود؛ تبی که حتی یک ردیفِ دیگر دارد حذف
 * **نمی‌شود** — فقط نامش «بایگانی — …» می‌شود تا با تبِ دفتر اشتباه نشود (داده‌ای که شاید ارزش داشته باشد، پاک نمی‌شود). هیچ
 * کدی جز همین تابع این نام‌ها را در هاب نمی‌خوانَد (`igSheet_` فقط دفتر را باز می‌کند). شکستِ هاب ⇒ پرچم نمی‌خورد، دورِ بعد.
 * ⇒ {deleted, renamed}
 */
function igHubRetire_(st) {
  if (st.hubRetired) return null;
  var hub = getHub_(), out = { deleted: [], renamed: [] };
  [CFG.IG_TAB, CFG.IG_STATS_TAB, CFG.IG_COMMENTS_TAB, CFG.IG_MSGS_TAB].forEach(function (t) {
    var sh = t ? hub.getSheetByName(t) : null;
    if (!sh) return;
    var last = sh.getLastRow(), empty = last <= 1;
    if (last === 2) {
      var r2 = sh.getRange(2, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
      var a2 = String(r2[0] == null ? '' : r2[0]);
      empty = (!a2 || /^⬅ از نسخهٔ ۹\.۳۰/.test(a2)) && r2.slice(1).every(function (x) { return x === '' || x == null; });
    }
    if (empty && hub.getSheets().length > 1) { hub.deleteSheet(sh); out.deleted.push(t); }
    else { sh.setName('بایگانی — ' + t); out.renamed.push(t); }
  });
  st.hubRetired = nowStr_();
  if (out.deleted.length || out.renamed.length) {
    logLine_('تب‌های کهنهٔ اینستاگرام در هاب: حذف ' + out.deleted.length + (out.renamed.length ? '، بایگانی (داده داشت) ' + out.renamed.join('، ') : ''));
  }
  return out;
}

/** تبِ دفترِ اینستاگرام با سرستون، اگر نیست ساخته می‌شود (برگهٔ پیش‌فرضِ خالی کنار می‌رود). */
function igSheet_(name, head) {
  var hub = igBook_(), sh = hub.getSheetByName(name);
  if (!sh) {
    sh = hub.insertSheet(name); sh.appendRow(head); try { sh.setFrozenRows(1); } catch (e) {}
    try { var d0 = hub.getSheetByName('Sheet1') || hub.getSheetByName('برگه۱'); if (d0 && d0.getLastRow() === 0) hub.deleteSheet(d0); } catch (eD) {}
  }
  return sh;
}

/** همهٔ صفحه‌های یک پاسخِ Graph (تا `max`). ⇒ {data[], why} */
function igPaged_(path, params, max) {
  var out = [], r = igApi_('get', path, params), guard = 0;
  while (true) {
    if (r.code !== 200) return { data: out, why: igErr_(r) };
    out = out.concat((r.j && r.j.data) || []);
    var nx = r.j && r.j.paging && r.j.paging.next;
    if (!nx || out.length >= max || ++guard > 20) break;
    var res = UrlFetchApp.fetch(String(nx), { method: 'get', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + igToken_() } });
    var j = {};
    try { j = JSON.parse(res.getContentText() || '{}'); } catch (e) { j = {}; }
    r = { code: res.getResponseCode(), j: j };
  }
  return { data: out.slice(0, max), why: '' };
}

/** آمارِ یک پست؛ اگر متا نامِ سنجه‌ای را نشناخت، با فهرستِ کوتاه‌تر دوباره. ⇒ {m:{}, why} */
function igMediaInsights_(m) {
  var reel = String(m.media_product_type || '') === 'REELS';
  var sets = [reel ? 'views,reach,likes,comments,shares,saved,total_interactions,ig_reels_avg_watch_time'
                   : 'views,reach,likes,comments,shares,saved,total_interactions',
              'reach,likes,comments,shares,saved'];
  var why = '';
  for (var i = 0; i < sets.length; i++) {
    var r = igApi_('get', '/' + m.id + '/insights', { metric: sets[i] });
    if (r.code === 200) {
      var o = {};
      ((r.j && r.j.data) || []).forEach(function (x) {
        var v = x && x.values && x.values[0] ? x.values[0].value : (x && x.total_value ? x.total_value.value : '');
        o[x.name] = v;
      });
      return { m: o, why: '' };
    }
    why = igErr_(r);
  }
  return { m: null, why: why };
}

/** کدام قسمت: از نقشه‌ای که انتشار نوشت؛ وگرنه از پیوندِ یوتیوبِ کپشن. */
/** «@نام (پیوندِ صفحه‌اش)» — برای تلگرام، تا با یک لمس به صفحهٔ همان کس برسد. */
function igWhoLine_(u) {
  u = String(u || '').replace(/^@/, '');
  return u ? '@' + u + ' (instagram.com/' + u + ')' : '@?';
}

/** «ig:special:5» ⇒ «درس‌نامه، قسمتِ ۵»؛ «yt:…» یا تهی ⇒ «پستِ دستی». */
function igKeyLabel_(key) {
  var m = /^ig:([^:]+):(\d+)$/.exec(String(key || ''));
  if (!m) return 'پستِ دستی';
  var show = m[1] === ENRICH_SHOW_SPECIAL ? (CFG.SPECIAL_SHOW_NAME || 'درس‌نامه') : (CFG.SHOW_NAME || m[1]);
  return show + '، قسمتِ ' + faDigitsOut_(m[2]);
}

function igMediaKey_(m, st) {
  var k = (st.media || {})[String(m.id)];
  if (k) return k;
  var mm = /youtu\.?be(?:\.com)?\/(?:watch\?v=)?([A-Za-z0-9_-]{6,})/.exec(String(m.caption || ''));
  return mm ? 'yt:' + mm[1] : '';
}

/** آمار و نظرها. ⇒ {posts, comments, why} */
function igInsightsPosts_(a, st, deadline) {
  var out = { posts: 0, comments: 0, newComments: [], why: '' };
  var lst = igPaged_('/' + a.ig + '/media', { fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count', limit: 50 },
                     Number(CFG.IG_INS_MAX) || 500);
  if (lst.why && !lst.data.length) { out.why = 'فهرستِ پست‌ها: ' + lst.why; return out; }
  var all = lst.data.sort(function (x, y) { return String(y.timestamp) < String(x.timestamp) ? -1 : 1; });
  var nR = Math.max(1, Number(CFG.IG_INS_RECENT) || 25), nW = Math.max(0, Number(CFG.IG_INS_ROTATE) || 15);
  var pick = all.slice(0, nR), rest = all.slice(nR);
  if (rest.length && nW) {
    var c0 = (Number(st.insCur) || 0) % rest.length;
    for (var w = 0; w < Math.min(nW, rest.length); w++) pick.push(rest[(c0 + w) % rest.length]);
    st.insCur = (c0 + Math.min(nW, rest.length)) % rest.length;
  }
  var HEAD = ['شناسهٔ پست', 'زمانِ انتشار', 'نوع', 'قسمت', 'آغازِ کپشن', 'پیوند', 'بازدید', 'دسترسی', 'لایک', 'نظر',
              'اشتراک', 'ذخیره', 'کلِ تعامل', 'میانگینِ تماشا (ثانیه)', 'آخرین به‌روزرسانی', 'یادداشت'];
  var sh = igSheet_(CFG.IG_STATS_TAB || 'اینستاگرام — آمار', HEAD);
  var last = sh.getLastRow(), rowOf = {};
  if (last > 1) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (v, i) { rowOf[String(v[0])] = i + 2; });
  var csh = igSheet_(CFG.IG_COMMENTS_TAB || 'اینستاگرام — نظرها',
                     ['شناسهٔ نظر', 'زمان', 'پست', 'قسمت', 'کاربر', 'متن', 'لایک', 'پاسخ به', 'ثبت']);
  var seen = {}, cl = csh.getLastRow();
  if (cl > 1) csh.getRange(2, 1, cl - 1, 1).getValues().forEach(function (v) { seen[String(v[0])] = 1; });
  var cRows = [], insWhy = '', comWhy = '';
  for (var i = 0; i < pick.length; i++) {
    if (Date.now() > deadline) { out.why = 'وقت کم آمد پس از ' + i + ' پست'; break; }
    var m = pick[i], ins = igMediaInsights_(m), I = ins.m || {};
    if (!ins.m) insWhy = ins.why;
    var key = igMediaKey_(m, st);
    var row = [String(m.id), String(m.timestamp || '').replace('T', ' ').slice(0, 16), String(m.media_product_type || m.media_type || ''),
               key, String(m.caption || '').split('\n')[0].slice(0, 80), String(m.permalink || ''),
               I.views !== undefined ? I.views : '', I.reach !== undefined ? I.reach : '',
               I.likes !== undefined ? I.likes : (m.like_count || 0), I.comments !== undefined ? I.comments : (m.comments_count || 0),
               I.shares !== undefined ? I.shares : '', I.saved !== undefined ? I.saved : '',
               I.total_interactions !== undefined ? I.total_interactions : '',
               I.ig_reels_avg_watch_time !== undefined ? Math.round(Number(I.ig_reels_avg_watch_time) / 100) / 10 : '',
               nowStr_(), ins.m ? '' : 'آمار: ' + ins.why];
    if (rowOf[row[0]]) sh.getRange(rowOf[row[0]], 1, 1, row.length).setValues([row]);
    else { sh.appendRow(row); rowOf[row[0]] = sh.getLastRow(); }
    out.posts++;
    if ((Number(m.comments_count) || 0) > 0) {
      var cm = igPaged_('/' + m.id + '/comments', { fields: 'id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}', limit: 50 }, 200);
      if (cm.why) comWhy = cm.why;
      cm.data.forEach(function (c) {
        [c].concat((c.replies && c.replies.data) || []).forEach(function (x, j) {
          if (!x || !x.id || seen[String(x.id)]) return;
          seen[String(x.id)] = 1;
          cRows.push([String(x.id), String(x.timestamp || '').replace('T', ' ').slice(0, 16), String(m.permalink || m.id), key,
                      String(x.username || ''), String(x.text || ''), Number(x.like_count) || 0, j ? String(c.id) : '', nowStr_()]);
          /* ۹.۳۳: «بهتره مشخص کنه زیر کدوم پست بوده … لینکِ پست با نظر و آیدیِ فرد با هم بیاد» — با زیاد شدنِ پست‌ها،
             نظرِ بی‌نشانی خوانده نمی‌شود. */
          out.newComments.push(igWhoLine_(x.username) + ': «' + String(x.text || '').slice(0, 120) + '»' +
                               (j ? ' (پاسخ)' : '') + '\n   ↳ زیرِ ' + igKeyLabel_(key) + ': ' + String(m.permalink || m.id));
        });
      });
    }
  }
  if (cRows.length) csh.getRange(csh.getLastRow() + 1, 1, cRows.length, cRows[0].length).setValues(cRows);
  out.comments = cRows.length;
  if (insWhy) out.why = (out.why ? out.why + ' · ' : '') + 'آمار: ' + insWhy;
  if (comWhy) out.why = (out.why ? out.why + ' · ' : '') + 'نظرها: ' + comWhy;
  if (lst.why) out.why = (out.why ? out.why + ' · ' : '') + 'فهرست: ' + lst.why;
  return out;
}

/** پیام‌های دایرکت — با کلیدِ صفحه (از همان کلید گرفته می‌شود، نه ذخیره، نه چاپ). ⇒ {n, newMsgs[], why} */
function igInsightsMsgs_(a, deadline) {
  var out = { n: 0, newMsgs: [], why: '' };
  if (!a.page) { out.why = 'شناسهٔ صفحهٔ فیسبوک ثبت نیست — کلید را یک بار دیگر از منو بگذارید'; return out; }
  var pt = igApi_('get', '/' + a.page, { fields: 'access_token' });
  var ptok = pt.code === 200 && pt.j && pt.j.access_token ? String(pt.j.access_token) : '';
  if (!ptok) { out.why = 'کلیدِ صفحه داده نشد: ' + igErr_(pt); return out; }
  var url = String(CFG.IG_GRAPH || 'https://graph.facebook.com/v23.0') + '/' + a.page +
            '/conversations?platform=instagram&fields=' + encodeURIComponent('id,updated_time,participants,messages.limit(20){id,message,from,created_time}') + '&limit=25';
  var res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ptok } });
  var j = {};
  try { j = JSON.parse(res.getContentText() || '{}'); } catch (e) { j = {}; }
  if (res.getResponseCode() !== 200) { out.why = igErr_({ code: res.getResponseCode(), j: j }); return out; }
  var sh = igSheet_(CFG.IG_MSGS_TAB || 'اینستاگرام — پیام‌ها', ['شناسهٔ پیام', 'زمان', 'گفت‌وگو', 'از', 'متن', 'ثبت']);
  var seen = {}, last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (v) { seen[String(v[0])] = 1; });
  var rows = [];
  ((j && j.data) || []).forEach(function (cv) {
    ((cv.messages && cv.messages.data) || []).forEach(function (m) {
      if (!m || !m.id || seen[String(m.id)]) return;
      seen[String(m.id)] = 1;
      var from = m.from ? String(m.from.username || m.from.name || m.from.id || '') : '';
      rows.push([String(m.id), String(m.created_time || '').replace('T', ' ').slice(0, 16), String(cv.id || ''), from,
                 String(m.message || ''), nowStr_()]);
      if (from !== String(a.user || '')) out.newMsgs.push('✉️ ' + igWhoLine_(from) + ': «' + String(m.message || '').slice(0, 120) + '»');
    });
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  out.n = rows.length;
  return out;
}

/** یک دورِ آمار — درونِ igTick، پس از گام‌های انتشار و فقط اگر وقت مانده. */
function igInsights_(st, deadline) {
  var a = igAcct_();
  if (!a || CFG.IG_INS_ON === false) return null;
  var every = Math.max(1, Number(CFG.IG_INS_HOURS) || 6) * 3600000;
  if (st.ins && st.ins.ms && Date.now() - Number(st.ins.ms) < every) return null;
  var ins = { ms: Date.now(), at: nowStr_(), why: {} };
  var acc = igApi_('get', '/' + a.ig, { fields: 'followers_count,media_count' });
  if (acc.code === 200) { ins.followers = Number(acc.j.followers_count) || 0; ins.mediaCount = Number(acc.j.media_count) || 0; }
  else ins.why.account = igErr_(acc);
  var p = { posts: 0, comments: 0, newComments: [], why: '' };
  try { p = igInsightsPosts_(a, st, deadline); } catch (eP) { p.why = String(eP.message || eP).slice(0, 140); }
  ins.posts = p.posts; ins.newComments = p.comments;
  if (p.why) ins.why.posts = p.why;
  var g = { n: 0, newMsgs: [], why: '' };
  if (CFG.IG_MSGS_ON !== false) {
    try { g = igInsightsMsgs_(a, deadline); } catch (eM) { g.why = String(eM.message || eM).slice(0, 140); }
    if (g.why) ins.why.msgs = g.why;
  }
  ins.newMsgs = g.n;
  /* شکستِ خواندن ⇒ ساعتِ بعد دوباره، نه شش ساعتِ دیگر (۹.۲۴): اولین خواندنِ واقعی با «Service Spreadsheets timed out»
     روی هاب افتاد و تا شش ساعت هیچ عددی نمی‌آمد. */
  if (ins.why.posts && !ins.posts) ins.ms = Date.now() - every + 3600000;
  /* تازه‌ها به تلگرام — فقط وقتی هست، و کوتاه. */
  var news = p.newComments.slice(0, 5).concat(g.newMsgs.slice(0, 5));
  if (news.length && CFG.IG_INS_TG !== false) {
    try { tgSend_('📱 اینستاگرام — ' + (p.comments ? p.comments + ' نظرِ تازه' : '') + (p.comments && g.newMsgs.length ? '، ' : '') +
                  (g.newMsgs.length ? g.newMsgs.length + ' پیامِ تازه' : '') + '\n' + news.join('\n')); } catch (eT) {}
  }
  st.ins = ins;
  return ins;
}
