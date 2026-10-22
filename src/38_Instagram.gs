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
  ytDesc: { type: 'string' }, kicker: { type: 'string' },
  names: { type: 'array', items: { type: 'string' } }
}, required: ['idea', 'script', 'scenes', 'coverTitle', 'caption', 'tags', 'emph', 'ytDesc', 'kicker'] };

/**
 * برچسبِ سبزِ روی ریلز و کاور (۹.۵۱). «اون متن تو باکس برای ائودی رو هم نباید انگلیسی بنویسه که معرفی کتاب بشه باید
 * فارسی و کوتاه باشه … که مخاطب فارسی فرار نکنه». تا ۹.۵۰ نامِ خامِ مجموعه بود — برای آئودی عنوانِ انگلیسیِ کامل کتاب.
 * نامِ فارسیِ کوتاه ⇒ همان؛ وگرنه پیشنهادِ مدل اگر فارسی و کوتاه است؛ وگرنه **هیچ** برچسبی — برچسبِ لاتین هرگز.
 */
function igKicker_(series, k) {
  var ok = function (t) { t = String(t || '').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
                          return (t.length >= 2 && t.length <= 32 && !/[A-Za-z]/.test(t)) ? t : ''; };
  return ok(series) || ok(k);
}

/** خطای حساب/دسترسی، نه خطای این درس (۹.۵۱): «API access blocked» سه بار به حسابِ درسِ ۹ِ مصباح نوشته شد. */
function igAcctErr_(t) {
  return /access blocked|oauth|access token|session has expired|permission|rate limit|request limit|too many|try again later|temporar|unavailable|unexpected error/i.test(String(t || ''));
}

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

/* ══ دو ریلز برای هر درس، از مجموعهٔ دوم (۹.۶۹) ══
   «وقتی وارد مجموعهٔ بعدیِ درس‌نامه می‌شه … تعدادِ ریلز و شورت برای هر درس دوتا بشه جای یکی … بعضی وقتا یه ریلز و شورت
   نمی‌تونه نشون بده دقیقاً اون درس دربارهٔ چیه». واحدِ کار «بخش» است: `14` بخشِ ۱ِ قسمتِ ۱۴، `14.2` بخشِ ۲. همهٔ حالت‌ها
   (انجام‌شده، شکست، صف) با همین شناسه؛ بخشِ ۱ همان شناسهٔ قدیمی است، پس مصباح و هر چه پیش‌تر ساخته شده دست نمی‌خورد. */
function igUid_(x) { return String(Number(x && x.ep) || 0) + (Number(x && x.part) > 1 ? '.' + Number(x.part) : ''); }
/** چند بخش: مرورِ بزرگ همیشه یکی (طولش جداست)؛ مجموعهٔ شمارهٔ `IG_PARTS_FROM` به بعد (۰ = نخستین) `IG_PARTS`. */
function igPartsFor_(seriesIdx, recap) {
  if (recap) return 1;
  var from = Number(CFG.IG_PARTS_FROM);
  if (isNaN(from)) from = 1;
  return Number(seriesIdx) >= from ? Math.max(1, Math.min(3, Number(CFG.IG_PARTS) || 1)) : 1;
}
/** برچسبِ بخش: «۱ از ۲» یا ''. */
function igPartLabel_(x) {
  return Number(x && x.parts) > 1 ? faDigitsOut_(String(Number(x.part) || 1)) + ' از ' + faDigitsOut_(String(x.parts)) : '';
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
 * مجموعهٔ بعدی فقط وقتی که همهٔ درس‌ها و مرورهای این یکی انجام شده (۹.۵۱) — گیر، جاافتادن یا رسیدن به آخرِ منتشرشده همه می‌ایستند. `pub` = خروجیِ `ytPublished_`.
 */
function igNextEp_(pub, st, orderIn) {
  var done = igDoneMap_(st), busy = {};
  (st.inflight || []).forEach(function (x) { busy[igUid_(x)] = 1; });
  var order = orderIn || igOrder_(pub, st);
  var isPub = function (e) {
    var r = pub[ENRICH_SHOW_SPECIAL + ':' + e];
    return !!(r && r.videoId && String(r.privacy || '').toLowerCase() === 'public');
  };
  var gaps = [], caught = [];
  for (var s = 0; s < order.length; s++) {
    var S = order[s], eps = S.eps || [];
    for (var i = 0; i < eps.length; i++) {
      var x = eps[i], e = Number(x.ep), np = igPartsFor_(s, x.recap);
      for (var pt = 1; pt <= np; pt++) {
      var uid = igUid_({ ep: e, part: pt });
      if (done[uid]) continue;
      if (busy[uid]) continue;
      var label = (x.recap ? 'مرورِ بزرگ (' + e + ')' : 'درسِ ' + x.lesson) + (np > 1 ? ' (' + igPartLabel_({ part: pt, parts: np }) + ')' : '');
      /* ۹.۵۱: مجموعه‌ای که گیر کرده، مجموعهٔ بعدی را **راه نمی‌دهد** — «مگه ریلزها برای مصباح تموم شده؟ … برای ائودی
         داره ریلز میذاره». تا ۹.۵۰ `break` فقط از همین مجموعه بیرون می‌رفت و حلقه سراغِ آئودی می‌رفت. فقط مجموعه‌ای که
         به آخرِ منتشرشده‌اش رسیده (`caught`) مجموعهٔ بعدی را هم‌زمان راه می‌دهد. */
      if (igFailHold_(st, uid)) { gaps.push('«' + S.name + '» ' + label + ': سه بار نشد، تا ' + (Number(CFG.IG_RETRY_H) || 24) + ' ساعت دیگر دوباره'); st.gaps = gaps; st.caught = caught; return null; }
      if (isPub(e)) {
        var r = pub[ENRICH_SHOW_SPECIAL + ':' + e];
        st.gaps = gaps; st.caught = caught;
        return { ep: e, url: String(r.url || ('https://youtu.be/' + r.videoId)), series: S.name, title: String(r.title || ''),
                 recap: !!x.recap, lesson: Number(x.lesson) || 0, part: pt, parts: np, sIdx: s };
      }
      var later = false;
      for (var j = i + 1; j < eps.length && !later; j++) if (isPub(eps[j].ep)) later = true;
      if (later) { gaps.push('«' + S.name + '» ' + label + ': ویدئوی عمومیِ یوتیوب ندارد، درس‌های بعدی دارند — منتظر می‌ماند');
                   st.gaps = gaps; st.caught = caught; return null; }
      /* ۹.۵۱: «باید یه مجموعه کامل تموم بشه بره بعدی». رسیدن به آخرِ منتشرشده هم مجموعهٔ بعدی را راه نمی‌دهد — مجموعه
         می‌ایستد تا درسِ بعدی‌اش در یوتیوب عمومی شود. */
      caught.push(S.name);
      st.gaps = gaps; st.caught = caught;
      return null;
      }
    }
  }
  st.gaps = gaps; st.caught = caught;
  return null;
}

/** درسِ قبلیِ همین مجموعه هنوز منتشر نشده؟ ⇒ برچسبش، یا ''. انتشار همیشه به ترتیب (۹.۳۰). */
function igEarlierPending_(st, ep, part) {
  var done = igDoneMap_(st), order = igOrderDec_((st.order && st.order.s) || []);
  var me = Math.max(1, Number(part) || 1);
  for (var s = 0; s < order.length; s++) {
    var eps = order[s].eps || [], at = -1;
    for (var i = 0; i < eps.length; i++) if (Number(eps[i].ep) === Number(ep)) at = i;
    if (at < 0) continue;
    for (var k = 0; k <= at; k++) {
      var np = igPartsFor_(s, eps[k].recap), last = k < at ? np : me - 1;
      for (var pt = 1; pt <= last; pt++) {
        if (done[igUid_({ ep: eps[k].ep, part: pt })]) continue;
        return (eps[k].recap ? 'مرورِ بزرگ (' + eps[k].ep + ')' : 'درسِ ' + eps[k].lesson) +
               (np > 1 ? ' (' + igPartLabel_({ part: pt, parts: np }) + ')' : '');
      }
    }
    return '';
  }
  return '';
}

/** ریلزِ آماده‌ای که فقط منتظرِ انتشارِ درسِ پیشینِ همان مجموعه است (۹.۵۸) — جای کار نمی‌گیرد. */
function igWaitsEarlier_(st, x) {
  return !!x && String(x.phase) === 'pub' && !!igEarlierPending_(st, x.ep, x.part);
}

/** پوشهٔ «اینستاگرام» درونِ پوشهٔ قسمت — همه‌چیزِ ریلز این‌جاست. */
function igFolder_(epFolder, part) {
  var nm = (CFG.IG_FOLDER || 'اینستاگرام') + (Number(part) > 1 ? ' ' + faDigitsOut_(String(Number(part))) : '');
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

/**
 * بخش‌های درس برای ریلزِ `part` از `parts` (۹.۶۹): سرفصل‌ها به ترتیب، به `parts` تکهٔ تقریباً هم‌وزن (به نویسه) — مرز همیشه
 * سرِ یک سرفصل، هرگز وسطش؛ و هر تکه دست‌کم یک سرفصل. ⇒ آرایهٔ اندیس‌ها.
 */
function igPartSecs_(ep, part, parts) {
  var secs = (ep && ep.sections) || [], n = secs.length, P = Math.max(1, Number(parts) || 1), me = Math.max(1, Math.min(P, Number(part) || 1));
  if (P <= 1 || n < 2) { var all = []; for (var a = 0; a < n; a++) all.push(a); return all; }
  P = Math.min(P, n);
  var w = secs.map(function (x) { return String((x && x.narration) || '').length + 1; }), tot = w.reduce(function (x, y) { return x + y; }, 0);
  /* هر مرز نزدیک‌ترین سرِ سرفصل به سهمِ برابر — نه «نخستین جایی که از سهم گذشت» (که ۴۰۰/۳۰۰/۳۵۰/۳۸۰ را ۳ به ۱ می‌بُرد). */
  var cum = [0];
  for (var c = 0; c < n; c++) cum.push(cum[c] + w[c]);
  var cuts = [], prev = 0;
  for (var k = 1; k < P; k++) {
    var best = -1, bestD = Infinity, target = tot * k / P;
    for (var j = prev + 1; j <= n - (P - k); j++) {
      var d = Math.abs(cum[j] - target);
      if (d < bestD) { bestD = d; best = j; }
    }
    cuts.push(best); prev = best;
  }
  var lo = me === 1 ? 0 : cuts[me - 2], hi = me === P ? n : cuts[me - 1], out = [];
  for (var j = lo; j < hi; j++) out.push(j);
  return out;
}

/** متنِ درس برای مدل — سرفصل‌ها و روایت، بی قلاب و جمع‌بندیِ رادیویی. `only` = فقط این اندیس‌ها (بخشِ یک ریلز). */
/**
 * متنِ مرور برای نویسنده **و** داور (۹.۸۸) — هر بخش سهمِ برابر، نه «۱۴۰۰۰ نویسهٔ اول». مرورِ آئودی ۹ بخش و ۳۸ دقیقه بود؛ برشِ
 * از سر یعنی نویسنده فقط چند درسِ اول را می‌دید و بقیه را از خودش پر می‌کرد، و داور (که ۱۲۰۰۰ می‌دید، کمتر از نویسنده) همان را
 * «ادعای بیرون از درس» می‌زد — ایرادِ سختی که نرم‌شدنِ ۲۴ساعته هم برش نمی‌دارد. ریلزِ ۱۹ سه بار پشتش ایستاد.
 */
function igRecapText_(ep, cap) {
  var secs = ((ep && ep.sections) || []).filter(function (x) { return x && (x.heading || x.narration); });
  var full = igLessonText_(ep, 1e9);
  if (full.length <= cap || !secs.length) return full.slice(0, cap);
  var head = ep && ep.title ? 'عنوان: ' + ep.title + '\n' : '';
  var each = Math.max(400, Math.floor((cap - head.length) / secs.length) - 40);
  return (head + secs.map(function (x) {
    var n = String(x.narration || '');
    return (x.heading ? '## ' + x.heading + '\n' : '') + (n.length > each ? n.slice(0, each).replace(/\s+\S*$/, '') + ' …' : n);
  }).join('\n')).slice(0, cap);
}

function igLessonText_(ep, cap, only) {
  var L = [], keep = null;
  if (only) { keep = {}; only.forEach(function (i) { keep[i] = 1; }); }
  if (ep && ep.title) L.push('عنوان: ' + ep.title);
  ((ep && ep.sections) || []).forEach(function (s, si) {
    if (keep && !keep[si]) return;
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
    '• kicker = نامِ مجموعه برای برچسبِ روی تصویر: **فارسی**، ۲ تا ۴ واژه، بی هیچ حرفِ لاتین — اگر نامِ مجموعه انگلیسی یا عنوانِ کتاب است، موضوعش را کوتاه به فارسی بگو (مثلاً «معرفت‌شناسیِ آئودی»).',
    '• emph = ۴ تا ۸ واژه یا عبارتِ کوتاهِ کلیدی (۱ تا ۳ واژه) که **عیناً** در script آمده‌اند — روی تصویر برجسته می‌شوند.',
    '• names = نامِ هر شخص، اثر یا مثالِ مشخصی (مثلِ «گتیه»، «ساعتِ خوابیده») که در script آمده — خالی اگر نیست.',
    igPartBlock_(ep, opt),
    igSeenBlock_(opt),
    '',
    'متنِ درس' + (Number(opt.parts) > 1 ? ' — **فقط بخشِ این ریلز** (بقیهٔ درس در ریلزِ دیگر است):' : ':'),
    igLessonText_(ep, Number(CFG.IG_SRC_CHARS) || 9000, Number(opt.parts) > 1 ? igPartSecs_(ep, opt.part, opt.parts) : null)
  ].join('\n');
}

/**
 * بخشِ این ریلز از درس (۹.۶۹): «دو ریلز که تمامِ خلاصهٔ یک درس رو بتونه پوشش بده». هر ریلز تکهٔ خودش از سرفصل‌ها را
 * می‌گیرد و فهرستِ سرفصل‌های تکهٔ دیگر را می‌بیند (تا چیزی دو بار گفته نشود و چیزی هم جا نیفتد)؛ بخشِ دوم ایده و قلابِ
 * بخشِ اول را هم می‌بیند. هر کدام **به‌تنهایی کامل** است — بیننده ممکن است فقط یکی را ببیند.
 */
function igPartBlock_(ep, opt) {
  var P = Number(opt && opt.parts) || 1;
  if (P <= 1) return '';
  var me = Number(opt.part) || 1, secs = (ep && ep.sections) || [], mine = igPartSecs_(ep, me, P), other = [];
  for (var i = 0; i < secs.length; i++) if (mine.indexOf(i) === -1 && secs[i] && secs[i].heading) other.push('«' + secs[i].heading + '»');
  var L = ['',
    '══ این ریلزِ ' + faDigitsOut_(String(me)) + ' از ' + faDigitsOut_(String(P)) + ' برای همین درس است ══',
    'این درس ' + faDigitsOut_(String(P)) + ' ریلز دارد که **با هم کلِ خلاصهٔ درس را می‌پوشانند**؛ این یکی فقط بخشِ ' +
      (me === 1 ? 'نخستِ' : 'بعدیِ') + ' درس را (متنِ زیر). ایدهٔ این ریلز باید **مهم‌ترین حرفِ همین بخش** باشد، نه حرفِ کلِ درس.',
    other.length ? 'سرفصل‌های بخشِ دیگرِ درس (این‌ها را این‌جا باز نکن؛ ریلزِ دیگر می‌گوید): ' + other.join('، ') : '',
    'این ریلز باید **به‌تنهایی کامل** باشد — بیننده شاید فقط همین یکی را ببیند؛ «در ریلزِ قبل گفتیم» یا «بخشِ دوم» ننویس.'];
  if (opt.otherIdea) L.push('ریلزِ دیگرِ همین درس این را گفته: «' + String(opt.otherIdea).slice(0, 300) + '» — همان ایده، همان قلاب و همان مثال را تکرار نکن.');
  return L.filter(function (x) { return x !== ''; }).join('\n');
}

/**
 * آنچه صفحه پیش‌تر گفته (۹.۶۹): «وقتی می‌رسی به آئودی … چون هر دو معرفت‌شناسی هستن بعضی چیزا تکراری به نظر برسه … اون
 * مفاهیم رو به طورِ دیگه و بدونِ تکرارِ اسم‌های قبلاً برده‌شده، از جنبه‌های دیگه … با حفظِ وفاداریِ کامل به اون درس». فقط
 * ایده‌ها و نام‌های **مجموعه‌های دیگر** — تکرار درونِ همان مجموعه کارِ خودِ درس است.
 */
function igSeenBlock_(opt) {
  var seen = (opt && opt.seen) || [];
  if (!seen.length) return '';
  var names = {}, ideas = [];
  seen.forEach(function (x) {
    if (x.idea) ideas.push('• ' + String(x.idea).slice(0, 140));
    (x.names || []).forEach(function (n) { if (n) names[String(n).trim()] = 1; });
  });
  var nm = Object.keys(names).slice(0, 60);
  return ['',
    '══ آنچه این صفحه پیش‌تر، در مجموعهٔ دیگری از همین رشته، گفته ══',
    ideas.slice(-40).join('\n'),
    nm.length ? 'نام‌ها و مثال‌هایی که آن‌جا آمده: ' + nm.join('، ') : '',
    'دنبال‌کنندهٔ این صفحه این‌ها را دیده. اگر مفهومِ این درس با یکی از آن‌ها هم‌پوشان است، **تکرارش نکن**: از زاویهٔ دیگر بگو، ' +
      'جنبه‌ای که آن‌جا گفته نشد را بگو، یا کاربرد و پیامدِ تازه‌اش را — با **همان وفاداریِ کامل** به همین درس و بی ناقص گذاشتنِ آن. ' +
      'نام‌ها و مثال‌های بالا را دوباره نیاور، مگر خودِ این درس جز همان چیزی نداشته باشد؛ آن‌وقت با مثالِ تازه‌ای از خودِ درس.'].filter(function (x) { return x !== ''; }).join('\n');
}

/* ── حافظهٔ ایده‌های منتشرشده (۹.۶۹) — یک فایل در پوشهٔ دفترِ اینستاگرام، نه Properties (سقفِ ۹ کیلوبایت) ── */
function igSeenFile_() {
  var root = outFolder_(), nm = CFG.IG_BOOK_FOLDER || 'اینستاگرام';
  var it = root.getFoldersByName(nm), fo = it.hasNext() ? it.next() : root.createFolder(nm);
  var f = fo.getFilesByName('_IG-IDEAS.json');
  return f.hasNext() ? f.next() : fo.createFile(Utilities.newBlob('{"items":[]}', 'application/json', '_IG-IDEAS.json'));
}
function igSeenRead_() {
  try { var d = JSON.parse(igSeenFile_().getBlob().getDataAsString()); return (d && Array.isArray(d.items)) ? d.items : []; }
  catch (e) { return []; }
}
/** ثبتِ یک ریلزِ انجام‌شده — تکراری (همان uid) جایگزین می‌شود، نه افزوده. */
function igSeenAdd_(plan, uid) {
  try {
    if (!plan || !plan.plan) return false;
    var items = igSeenRead_().filter(function (x) { return x && x.uid !== uid; });
    items.push({ uid: uid, series: String(plan.series || ''), idea: String(plan.plan.idea || '').slice(0, 200),
                 cover: String(plan.plan.coverTitle || '').slice(0, 80), names: (plan.plan.names || []).slice(0, 8), at: nowStr_() });
    if (items.length > 400) items = items.slice(-400);
    igSeenFile_().setContent(JSON.stringify({ items: items }, null, 1));
    return true;
  } catch (e) { return false; }
}
/** ایده‌های **مجموعه‌های دیگر** برای این مجموعه. */
function igSeenFor_(seriesName) {
  return igSeenRead_().filter(function (x) { return x && x.series && x.series !== String(seriesName || ''); });
}

/**
 * یک بار: ریلزهای انجام‌شدهٔ پیش از ۹.۶۹ در حافظه — مصباحِ ۱ تا ۱۷ پیش از نخستین ریلزِ آئودی. از `_ig.json`ِ هر پوشه؛
 * با بودجه، و با مکان‌نما تا اجرای کشته‌شده از سر نرود.
 */
function igSeenSeed_(st, deadline) {
  if (st.seenSeeded) return 0;
  var order = igOrderDec_((st.order && st.order.s) || []), done = igDoneMap_(st), have = {}, n = 0;
  igSeenRead_().forEach(function (x) { if (x && x.uid) have[x.uid] = 1; });
  for (var s = 0; s < order.length; s++) {
    var eps = order[s].eps || [];
    for (var i = 0; i < eps.length; i++) {
      var uid = String(eps[i].ep);
      if (!done[uid] || have[uid]) continue;
      if (Date.now() > deadline - 20000) return n;
      try {
        var fo0 = ytFolderOf_(ENRICH_SHOW_SPECIAL, eps[i].ep, order[s].name);
        var pl = fo0 ? igPlanRead_(igFolder_(fo0, 1)) : null;
        if (pl && igSeenAdd_(pl, uid)) n++;
        have[uid] = 1;
      } catch (e) {}
    }
  }
  st.seenSeeded = nowStr_();
  return n;
}

/** بازهٔ واژه: درس ۵۰–۲۱۰ (هدف ۸۰–۱۵۰)، مرور ۲۰۰–۴۰۰؛ `maxWords` وقتی صدای قبلی از سه دقیقه گذشت. */
function igWords_(opt) {
  opt = opt || {};
  var lo = 80, hi = 150, min = 50, max = 210;
  if (opt.recap) { var R = CFG.IG_RECAP_WORDS || [200, 400]; lo = Number(R[0]) || 200; hi = Number(R[1]) || 400; min = Math.round(lo * 0.75); max = Math.round(hi * 1.1); }
  var flo = Number(opt.minWords) || 0;
  if (flo > 0) { lo = Math.max(lo, flo); min = Math.max(min, Math.round(flo * 0.9)); hi = Math.max(hi, lo); max = Math.max(max, Math.round(hi * 1.1)); }
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
    'idea = مسیرِ کلِ مرور در یک جمله. **جملهٔ اول بگوید این مرورِ درس‌های گذشته است** (مثلاً «مروری بر ' + (opt.range ? String(opt.range).replace(/^مرورِ\s*(بزرگِ\s*)?/, '') : 'درس‌هایی که گذشت') + '…»)؛',
    'قلاب (جملهٔ دوم): پرسشی که کلِ مسیر جوابش است — حداکثر ۱۴ واژه. coverTitle نباید مثلِ عنوانِ یک درسِ تازه باشد.',
    '• جمله‌ها کوتاه (حداکثر ۲۲ واژه). هیچ تاریخ، «امروز»، «در این قسمت»، «پادکست» یا شمارهٔ قسمت؛ دعوت به یوتیوب را **ننویس**.',
    '• ادعا و نام و عدد فقط از خودِ مرور.',
    '• scenes = ۷ تا ۹ توصیفِ انگلیسیِ تصویرِ نقاشی‌گونه به ترتیبِ مسیر؛ بی هیچ نوشته، حرف، عدد یا لوگو.',
    '• coverTitle = حداکثر ۶ واژه. caption = سطرِ اولِ کنجکاوکننده (حداکثر ۱۲۰ نویسه) + ۲ تا ۳ جمله؛ پیوند و برچسب ننویس.',
    '• ytDesc = ۴ تا ۶ جمله برای یوتیوب: این مرور کدام درس‌ها را به چه ترتیبی می‌پیماید و هر کدام چه می‌دهد؛ واژه‌های کلیدی طبیعی. پیوند و برچسب ننویس.',
    '• tags = ۸ تا ۱۵ برچسب، بی #. story = یک جملهٔ کوتاه. emph = ۴ تا ۸ واژهٔ کلیدیِ ۱ تا ۳ واژه‌ای که **عیناً** در script آمده‌اند.',
    '',
    'متنِ مرور:',
    igRecapText_(ep, Math.max(Number(CFG.IG_SRC_CHARS) || 9000, 14000))
  ].join('\n');
}

/**
 * ══ «متن بلند است» دیگر از نو نوشتن نیست، کوتاه کردن است (۹.۹۹) ══
 * مرورِ بزرگِ ۲۱ِ مصباح سه بار با «متن بلند است (۳۸۵ واژه)» رد شد و ۶ ساعت ایستاد — و ۲۲ پشتش. سقفِ واژه از صدای نسخهٔ
 * قبلی آمده بود (`maxWords`)، و مدل واژهٔ فارسی نمی‌شمارد: هر بار از صفر می‌نوشت و باز کمی بیشتر. نوشتنِ دوباره همگرا نمی‌شود؛
 * ویرایشِ همان متن با عددِ روشن می‌شود. یک فراخوانِ کوتاه‌کردن، و همان سدِ `igPlanTrim_` روی نتیجه — سقف عوض نمی‌شود.
 */
var IG_SHORT_SCHEMA = { type: 'object', properties: { script: { type: 'string' } }, required: ['script'] };
function igShorten_(r, opt, p0) {
  var W = igWords_(opt);
  var want = Math.max(W.min, Math.round(Math.min(W.hi, W.max) * 0.9));
  var s = null;
  try {
    s = geminiText_(['این متنِ گفتاریِ فارسی ' + String(p0.why || '').replace(/^متن بلند است\s*/, '') + ' است و باید **حداکثر ' + want +
                     ' واژه** شود. کوتاهش کن: جمله‌های فرعی و تکرار را بردار، ترتیب و همهٔ گام‌های اصلی و جملهٔ اول و پایانی بماند؛',
                     'چیزِ تازه‌ای نیفزا، لحن همان بماند. فقط script را برگردان.', '', String((r && r.script) || '')].join('\n'),
                    IG_SHORT_SCHEMA, 8192);
  } catch (e) { return { why: p0.why + '؛ کوتاه‌کردن جواب نداد: ' + String(e.message || e).slice(0, 60) }; }
  var p = igPlanTrim_(Object.assign({}, r, { script: String((s && s.script) || '') }), opt);
  if (!p.lines) return { why: p0.why + '؛ پس از کوتاه‌کردن: ' + p.why };
  p.shortened = 1;
  return p;
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
  /* ۹.۶۴: «امروز» فقط وقتی ناروا است که به **همین قسمت** اشاره کند («درسِ امروز»، «امروز می‌خواهیم…»). ریلزِ درسِ ۱۵ِ مصباح
     با «خیلی‌ها امروز می‌گویند حقیقتی وجود ندارد» — یعنی «این روزها» — رد شد و کلِ متن از نو رفت؛ ۱۶ و ۱۷ِ آماده پشتش ایستادند. */
  var today = function (t) {
    return /(درس|قسمت|برنامه|جلسه|بحث|موضوع|گفت‌وگو)[ِیٔ]?\s*‌?(ی\s)?امروز(?!ه)|امروز\s+(می‌خواهیم|قرار است|با هم|درباره|می‌پردازیم|سراغ|به سراغ|یاد می‌گیریم|می‌بینیم که)/.test(t);
  };
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
           ytDesc: String(r.ytDesc || '').trim().slice(0, 1500), kicker: String(r.kicker || '').trim().slice(0, 60),
           names: (r.names || []).map(function (x) { return String(x || '').trim().slice(0, 40); }).filter(Boolean).slice(0, 8) };
}

/**
 * داورِ پیوستگی (۹.۲۵) — فراخوانِ جدا: یک ایده؟ هر جمله از قبلی می‌آید؟ جملهٔ پایانی جوابِ قلاب است؟ همه از درس؟
 * ⇒ { ok, why, fix } — `fix` متنِ بازنویسی‌شده وقتی ایراد هست (همان قیدها). نشنیدنِ داور ⇒ رد، نه تأییدِ خاموش.
 */
function igJudge_(p, lesson, opt) {
  opt = opt || {};
  var W = igWords_(opt);
  /* ══ اعلامِ «مرور» جزوِ داوری نیست (۹.۸۰) ══
     ۹.۷۳ خواست جملهٔ اولِ مرور بگوید «مروری بر درس‌های ۱ تا ۱۸» و قلاب را به جملهٔ دوم برد — ولی داور همان پرسش‌های قبل را
     داشت: «جمله‌ای که بشود برداشت و چیزی کم نشود = خیر» (اعلام دقیقاً همین است)، «جملهٔ پایانی جوابِ جملهٔ اول است؟» (اعلام
     پرسش نیست)، و «هر ادعا در خودِ درس هست؟» — و متنِ مرور نمی‌گوید «درس‌های ۱ تا ۱۸». سه بار رد، دو تایش «سخت»، پس نرم‌شدنِ
     بیست‌وچهار ساعته هم نجاتش نمی‌داد: درسِ ۱۹ برای همیشه می‌ایستاد و ۲۰ پشتش. حالا اعلام از متنِ داوری بیرون است و بازه
     به داور گفته می‌شود. */
  var judged = (p.lines || []).filter(function (x) { return !x.cta; });
  var head = '';
  if (opt.recap && judged.length > 1 && /^\s*مروری?\s/.test(String(judged[0].text || ''))) { head = String(judged[0].text); judged = judged.slice(1); }
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
           '', 'ایدهٔ اعلام‌شده: ' + (p.idea || '—'),
           opt.recap ? 'این ریلزِ مرورِ ' + (String(opt.range || '').replace(/^مرورِ\s*(بزرگِ\s*)?/, '') || 'درس‌های گذشتهٔ مجموعه') +
             ' است' + (head ? '؛ جملهٔ اعلامِ «' + head + '» پیش از متن می‌آید و جزوِ داوری نیست — «جملهٔ اول» یعنی نخستین جملهٔ متنِ زیر.' : '.') : '',
           '', 'متنِ ریلز:', judged.map(function (x) { return x.text; }).join(' '),
           /* ۹.۸۸: داور همان متنی را می‌بیند که نویسنده دید — کمتر از آن یعنی «بیرون از درس» برای چیزی که در درس بود. */
           '', opt.recap ? 'متنِ مرور:' : 'درس:', String(lesson || '').slice(0, opt.recap ? 16000 : 6000)];
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
  /* سخت = نادرست یا گسسته؛ نرم = سلیقهٔ «عامه‌پسند/کنجکاوی» (۹.۵۶) — فقط سخت جلوی تلاشِ آخر را می‌گیرد. */
  var hard = miss.filter(function (x) { return x !== 'برای مخاطبِ عام سنگین است' && x !== 'چیزی نمی‌دهد یا کنجکاو نمی‌کند'; }).length;
  return { ok: !miss.length, hard: hard, why: miss.join('، ') + (r.weak ? ' — ' + String(r.weak).slice(0, 120) : ''), fix: String(r.fix || '').trim() };
}

/** برچسبِ درس برای کپشن و عنوان: «درسِ ۵» یا «مرورِ بزرگِ درس‌های ۱ تا ۱۵». */
function igLessonLabel_(plan) {
  if (plan.recap) return plan.range ? String(plan.range) : 'مرورِ بزرگ';
  var pl = igPartLabel_(plan);
  return plan.lesson ? 'درسِ ' + faDigitsOut_(String(plan.lesson)) + (pl ? '، بخشِ ' + pl : '') : '';
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
  var lab = igLessonLabel_({ recap: plan.recap, range: plan.range, lesson: lesson, part: plan.part, parts: plan.parts });
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
  var sn = igKicker_(plan.series, plan.plan.kicker) || String(plan.series || '');
  var tail = ' | ' + sn.slice(0, 40) + (lab ? '، ' + lab : '') + ' #Shorts';
  var title = (head.slice(0, Math.max(20, 100 - tail.length)) + tail).slice(0, 100);
  var tags = igTags_(plan.plan, 14);
  var desc = igCapClean_(String(plan.plan.ytDesc || plan.plan.caption || '')) + '\n\n' +
             'نسخهٔ کامل' + (lab ? ' (' + lab + ' از مجموعهٔ «' + sn + '»)' : '') + ':\n' + plan.yt + '\n' +
             (plUrl ? '\nهمهٔ درس‌های «' + plan.series + '» به ترتیب:\n' + plUrl + '\n' : '') +
             ((mk && mk.handle) ? '\nکانالِ «' + ((mk && mk.name) || 'رد پای حقیقت') + '»: https://www.youtube.com/' + mk.handle + '\n' : '') +
             '\n#Shorts ' + tags.map(function (t) { return '#' + t; }).join(' ');
  return { title: title, desc: desc.slice(0, 4900), tags: tags };
}

/** صدای ریلز (۹.۷۳): `IG_VOICE` — از همان درِ `ttsVoiceFree_`، پس صدای کنارگذاشته جای خودش را به هم‌جنسِ مجاز می‌دهد؛ خالی ⇒ گویندهٔ اصلیِ درس. */
function igVoice_(ep) {
  var v = String(CFG.IG_VOICE || '').trim();
  if (v) return ttsVoiceFree_(v);
  return (ep && ep.__cast && ep.__cast.lead) || CFG.TTS_VOICE_SPECIAL || CFG.TTS_VOICE;
}

/**
 * بازهٔ مرور از خودِ پوشهٔ مجموعه (۹.۷۳) ⇒ «درس‌های ۱ تا ۱۸» یا ''. درس‌های پیش از این قسمت تا مرورِ قبلی — همان چیزی که مرور
 * پشتِ سر می‌گذارد. `ytRecapRange_` به فیلدهای پرونده تکیه دارد و برای مرورِ ۱۹ِ مصباح خالی برگشت.
 */
function igRecapRange_(lessons, ep) {
  var L = lessons || [], at = -1;
  for (var i = 0; i < L.length; i++) if (Number(L[i].ep) === Number(ep)) at = i;
  if (at < 1) return '';
  var lo = 0, hi = 0;
  for (var k = at - 1; k >= 0; k--) {
    if (L[k].recap) break;
    var n = Number(L[k].lesson) || 0;
    if (!n) continue;
    if (!hi || n > hi) hi = n;
    if (!lo || n < lo) lo = n;
  }
  if (!lo || !hi) return '';
  return lo === hi ? 'درسِ ' + faDigitsOut_(String(lo)) : 'درس‌های ' + faDigitsOut_(String(lo)) + ' تا ' + faDigitsOut_(String(hi));
}

/* ───── مراحل ───── */

function igStepPlan_(it, fo) {
  var epFo = DriveApp.getFolderById(it.folderId);
  var meta = ytEpisodeMeta_(epFo);
  var ep = meta && meta.ep;
  if (!ep || !ep.sections) return { fail: '_special.json یا متنِ درس پیدا نشد' };
  var seriesName = String(meta.seriesName || it.series || '');
  /* شمارهٔ درس از **پوشهٔ مجموعه** (۸.۶۸ — `lesson`ِ پرونده یک بار «درس ۸» برای درسِ ۱۳ داد)؛ مرورِ بزرگ بازه‌اش را. */
  var recap = !!(it.recap || meta.recap), lesson = Number(it.lesson) || 0, range = '', lessons = [];
  try {
    var par = epFo.getParents();
    lessons = par.hasNext() ? ytSeriesLessons_(par.next()) : [];
    for (var q = 0; q < lessons.length; q++) if (Number(lessons[q].ep) === Number(it.ep)) { recap = recap || !!lessons[q].recap; if (!lesson) lesson = lessons[q].lesson; }
    if (recap) range = ytRecapRange_(meta, lessons) || '';
  } catch (eL) {}
  if (!lesson && !recap) lesson = Number(meta.lesson) || 0;
  var opt = { recap: recap, range: range ? 'مرورِ بزرگِ ' + range.replace(/^مرورِ\s*(بزرگِ\s*)?/, '') : '', maxWords: Number(it.maxWords) || 0,
              minWords: Number(it.minWords) || 0, part: recap ? 1 : (Number(it.part) || 1), parts: recap ? 1 : (Number(it.parts) || 1) };
  /* ۹.۶۹: بخشِ دیگرِ همین درس، اگر نوشته شده — تا ایده و مثال دو بار نیاید. */
  if (opt.parts > 1) {
    for (var op = 1; op <= opt.parts; op++) {
      if (op === opt.part) continue;
      try { var oPl = igPlanRead_(igFolder_(epFo, op)); if (oPl && oPl.plan && oPl.plan.idea) opt.otherIdea = (opt.otherIdea ? opt.otherIdea + ' / ' : '') + oPl.plan.idea; } catch (eOp) {}
    }
  }
  /* ۹.۶۹: آنچه صفحه در مجموعه‌های دیگر گفته — آئودی پس از مصباح. */
  try { opt.seen = igSeenFor_(seriesName); } catch (eSn) { opt.seen = []; }
  var r = null;
  /* ۹.۵۶: درسِ ۱۳ِ مصباح سه بار با «برای مخاطبِ عام سنگین است» رد شد و هر بار از صفر و کور نوشته شد — درس‌های ۱۴ و ۱۵ِ
     آماده پشتش ایستادند و آن روز هیچ ریلزی نرفت. حالا علتِ ردِ قبلی به نویسنده گفته می‌شود. */
  var prevWhy = String(it.prevWhy || '').replace(/^داورِ پیوستگی نپذیرفت:\s*/, '').trim();
  var prompt = igPrompt_(ep, seriesName, lesson, opt) +
    (prevWhy && /داور/.test(String(it.prevWhy || '')) ? '\n\nنسخهٔ پیشینِ همین ریلز را داور رد کرد، به این دلیل: «' + prevWhy +
      '». همان خطا را تکرار نکن: ساده‌تر، با مثالِ روزمره، و اصطلاحِ سنگین را یا کنار بگذار یا با زبانِ کوچه توضیح بده.' : '');
  try { r = geminiText_(prompt, IG_REEL_SCHEMA, 8192); }
  catch (e) { return { wait: 'مدلِ متن: ' + String(e.message || e).slice(0, 120) }; }
  var p = igPlanTrim_(r, opt);
  if (!p.lines && /متن بلند است/.test(String(p.why || ''))) p = igShorten_(r, opt, p);
  if (!p.lines) return { fail: 'متنِ ریلز پذیرفته نشد: ' + p.why };
  /* داوریِ پیوستگی: یک بازنویسی، و دوباره داوری. ضعیف منتشر نمی‌شود — شکست یعنی تلاشِ دوباره با مدلِ تازه. */
  var lessonTxt = recap ? igRecapText_(ep, Math.max(Number(CFG.IG_SRC_CHARS) || 9000, 14000)) : igLessonText_(ep, Number(CFG.IG_SRC_CHARS) || 9000);
  var jd = { ok: true, why: '' };
  if (CFG.IG_JUDGE !== false) {
    jd = igJudge_(p, lessonTxt, opt);
    if (!jd.ok && jd.fix) {
      var p2 = igPlanTrim_({ idea: p.idea, script: jd.fix, scenes: p.scenes, coverTitle: p.coverTitle, caption: p.caption,
                             story: p.story, tags: p.tags, emph: p.emph, ytDesc: p.ytDesc, kicker: p.kicker, names: p.names }, opt);
      if (p2.lines) {
        var jd2 = igJudge_(p2, lessonTxt, opt);
        if (jd2.ok) { p = p2; jd = { ok: true, why: 'بازنویسی شد: ' + jd.why }; }
        else { jd = jd2; jd.p = p2; }
      }
    }
    /* تلاشِ آخر (۹.۵۶): ایرادِ فقط-نرم مانعِ انتشار نیست — درستی، یک‌ایدگی، پیوستگی و جوابِ قلاب هنوز شرط‌اند. وگرنه درسی
       ذاتاً نظری (معرفت‌شناسی) هر ۲۴ ساعت سه بار رد می‌شد و کلِ مجموعه پشتش می‌ماند. */
    var lastTry = (Number(it.tryN) || 0) >= Math.max(1, Number(CFG.IG_TRY_MAX) || 3) - 1;
    /* ══ سخت‌گیری با گذرِ زمان نرم می‌شود (۹.۵۷) — «اینطور نباشه هی نگران باشم که چرا دیر شد یا گیر کرد» ══
       ترتیب اجباری است، پس یک درسِ گیرکرده کلِ مجموعه را نگه می‌دارد. سه پله، از نخستین تلاشِ همین درس:
       • تا `IG_LENIENT_H`: داور کامل؛ • پس از آن (یا تلاشِ آخر): ایرادِ فقط-نرم مانع نیست؛
       • پس از `IG_FORCE_H`: داور فقط مشاور است — تنها «ادعای بیرون از درس» جلوی انتشار را می‌گیرد، چون نادرست
         منتشرکردن جبران‌پذیر نیست و دیرکرد هست. */
    var ageH = Number(it.ageH) || 0;
    var force = ageH >= (Number(CFG.IG_FORCE_H) || 24);
    var lenient = lastTry || force || ageH >= (Number(CFG.IG_LENIENT_H) || 12);
    if (!jd.ok && lenient && jd.hard === 0) { if (jd.p) p = jd.p; jd = { ok: true, why: (lastTry ? 'تلاشِ آخر' : 'پس از ' + Math.round(ageH) + ' ساعت') + '، فقط ایرادِ نرم: ' + jd.why }; }
    if (!jd.ok && force && !/ادعای بیرون از درس|داور جواب نداد/.test(jd.why)) {
      if (jd.p) p = jd.p;
      jd = { ok: true, why: 'پس از ' + Math.round(ageH) + ' ساعت گیر، داور مشاور شد (درست بود؛ ایراد: ' + jd.why + ')' };
    }
    if (!jd.ok) return { fail: 'داورِ پیوستگی نپذیرفت: ' + jd.why };
  }
  p.judge = jd.why || 'پیوسته';
  p.kicker = igKicker_(seriesName, p.kicker);
  /* ══ مرور باید از همان ثانیهٔ اول و روی کاور «مرور» باشد (۹.۷۳) ══
     ریلزِ مرورِ ۱۹ِ مصباح با قلابِ «چطور مطمئن شویم عقل و حواس ما…» و کاورِ «ترازوی عقل و حواس سالم است؟» رفت — شبیهِ درس‌های
     اول، و بیننده نمی‌فهمید این مرورِ گذشته است. `ytRecapRange_` برای آن پوشه خالی برگشته بود، پس هیچ‌جا «مرور» نبود. حالا بازه از
     خودِ پوشهٔ مجموعه حساب می‌شود، کاور برچسبِ «مرورِ درس‌های …» می‌گیرد (عنوان کوتاه می‌ماند)، و اگر جملهٔ اول «مرور» را نگفت،
     یک جملهٔ کوتاهِ آغاز از کد پیش از آن می‌نشیند — قول در کد، نه در درخواست. */
  if (recap) {
    var rr0 = '';
    try { rr0 = igRecapRange_(lessons, it.ep); } catch (eRr) { rr0 = ''; }
    if (!opt.range && rr0) opt.range = 'مرورِ بزرگِ ' + rr0;
    var rShort = String(opt.range || '').replace(/^مرورِ\s*(بزرگِ\s*)?/, '').trim();
    if (!/مرور/.test(String((p.lines[0] || {}).text || ''))) {
      p.lines.unshift({ text: rShort ? 'مروری بر ' + rShort + '.' : 'مروری بر درس‌های گذشته.', scene: (p.lines[0] || {}).scene || '' });
      p.recapIntro = 1;
    }
    p.hook = String(p.lines[0].text).slice(0, 140);
    p.kicker = rShort ? 'مرورِ ' + rShort : 'مرورِ بزرگِ درس‌های گذشته';
  }
  p.lines.push({ text: IG_CTA_LINE, scene: '', cta: true });
  p.recap = recap; p.range = opt.range;
  var plan = { v: Number(CFG.IG_PLAN_V) || 2, key: it.key, ep: it.ep, part: opt.part, parts: opt.parts,
               series: seriesName, seriesKey: String(meta.seriesKey || ''), lesson: lesson,
               recap: recap, range: opt.range, title: String(ep.title || ''),
               yt: it.yt, at: nowStr_(), phase: 'voice', plan: p,
               caption: igCaption_({ caption: p.caption, tags: p.tags, recap: recap, range: opt.range, part: opt.part, parts: opt.parts },
                                   it.yt, p.kicker || seriesName, lesson),
               voice: igVoice_(ep) };
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
/**
 * صدای بدنهٔ ریلز (۹.۹۹): گفتارساز متنِ بلند را گاهی با «The audio stream could not be completed» رد می‌کند — و همان متن
 * هر بار رد می‌شد (ریلزِ ۲۱ِ مصباح). پس از یک شکستِ کامل، متن را در مرزِ جمله به دو نیم می‌کنیم و هر نیم را جدا می‌سازیم؛
 * پیش از آن همان یک فراخوانِ قدیمی است، پس صدای موفق بی‌تغییر می‌ماند. برمی‌گرداند: آرایهٔ base64 از تکه‌های PCM به ترتیب.
 */
function igTtsPcm_(text, plan) {
  var style = String(CFG.IG_VOICE_STYLE || '');
  var first = null;
  try { first = ttsChunk_(applyPron_(text), style, plan.voice, true); }
  catch (e) { if (String(text).split(/\s+/).length < 60) throw e; }
  if (first) return [first];
  var sents = igSplit_(text), a = [], b = [], acc = 0, tot = String(text).length;
  for (var i = 0; i < sents.length; i++) { if (acc < tot / 2) a.push(sents[i]); else b.push(sents[i]); acc += sents[i].length; }
  if (!a.length || !b.length) throw new Error('متن برای دونیم‌کردن کوتاه است');
  return [a.join(' '), b.join(' ')].map(function (t) {
    var r = ttsChunk_(applyPron_(t), style, plan.voice, true);
    if (!r) throw new Error('گفتارساز صدایی نداد');
    return r;
  });
}

function igStepVoice_(it, fo, plan, deadline) {
  var sr = Number(CFG.SAMPLE_RATE) || 24000, gap = Math.round(sr * 0.45) * 2, lead = Math.round(sr * 0.15) * 2;
  var lines = plan.plan.lines, body = [], cta = null;
  for (var i = 0; i < lines.length; i++) { if (lines[i].cta) cta = lines[i]; else body.push(lines[i]); }
  var plain = body.map(function (x) { return x.text; }).join(' ');
  /* اعراب جدا و ذخیره (۹.۸۷): یک فراخوانِ مدل روی کلِ متنِ مرور، پیش از گفتارساز؛ در یک اجرا با هم از سقف می‌گذشتند. */
  var vow = '';
  if (CFG.IG_VOWELIZE !== false) {
    if (plan.vowFor === plain) vow = String(plan.vowText || '');
    else {
      try { vow = vowelizeText_(plain) || ''; } catch (eV) { vow = ''; }
      plan.vowText = vow; plan.vowFor = plain;
      return { ok: true };   // برنامه نوشته می‌شود؛ گفتارساز در دورِ بعدِ همین حلقه، با سدِ وقت
    }
  }
  plan.vowelized = !!vow;
  var b1 = null, b2 = null;
  try { b1 = igTtsPcm_(vow || plain, plan); }
  catch (e) { return { wait: 'گفتارساز: ' + String(e.message || e).slice(0, 120) }; }
  if (!b1 || !b1.length) return { wait: 'گفتارساز صدایی نداد' };
  if (cta) {
    if (Date.now() > deadline) return { wait: 'وقت تمام شد (صدای جملهٔ پایانی)' };
    try { b2 = ttsChunk_(applyPron_(cta.text), String(CFG.IG_VOICE_STYLE || ''), plan.voice, true); } catch (e2) { b2 = null; }
    if (!b2) return { wait: 'گفتارساز صدای جملهٔ پایانی را نداد' };
  }
  var bytes = [];
  for (var z = 0; z < lead; z++) bytes.push(0);
  var p1 = [];
  for (var bj = 0; bj < b1.length; bj++) { var dj = Utilities.base64Decode(alignB64_(b1[bj])); for (var dk = 0; dk < dj.length; dk++) p1.push(dj[dk]); }
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
    it.minWords = 0;
    return { fail: 'صدا ' + plan.seconds + ' ثانیه شد (سقف ' + capS + ') — از نو با حداکثر ' + it.maxWords + ' واژه' };
  }
  /* ۹.۶۱: کفِ مرورِ بزرگ — «حدودِ سه دقیقه ولی نه بیشتر». سقف بود و کف نبود: مرورِ ۹۰ ثانیه‌ای هم می‌گذشت. کوتاه‌تر از
     `IG_RECAP_MIN_SEC` ⇒ از نو با واژهٔ بیشتر، به همان نسبت — فقط دو بارِ نخست، تا مدلی که بلندتر نمی‌نویسد مرور را نگه ندارد. */
  var floS = Number(CFG.IG_RECAP_MIN_SEC) || 0;
  if (plan.recap && floS > 0 && plan.seconds < floS && (Number(it.tryN) || 0) < 2) {
    it.minWords = Math.ceil((Number(plan.plan.words) || 300) * (floS + 10) / Math.max(1, plan.seconds));
    it.maxWords = 0;
    return { fail: 'مرور ' + plan.seconds + ' ثانیه شد (کف ' + floS + ') — از نو با دست‌کم ' + it.minWords + ' واژه' };
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

/** متنِ ریلز کنارِ تصویرِ q از n — همان پخشی که `igStepAsk_` جمله‌ها را روی تصویرها می‌نشاند. */
function igImgLine_(plan, q, n) {
  var L = (plan.plan && plan.plan.lines) || [];
  var k = Math.min(Math.max(0, L.length - 2), Math.floor(q * Math.max(1, L.length - 1) / Math.max(1, n)));
  return String((L[k] && L[k].text) || '');
}

/**
 * سدِ تصویرِ ریلز (۹.۵۴) ⇒ {ok, why}. هر تصویر ({file} یا {blob}) با متنش به `lvSceneJudge_` می‌رود؛ نوشته، حرف، عدد یا
 * چهرهٔ واقعی در **یکی** ⇒ رد. داوری که جواب نداد یا تصویری را نسنجید ⇒ رد — نشنیدن تأیید نیست (۷.۶۸).
 */
function igImgGate_(items) {
  if (!items || !items.length) return { ok: false, why: 'تصویری نبود' };
  var batch = [];
  for (var i = 0; i < items.length; i++) {
    var bl = null;
    try { bl = items[i].blob || items[i].file.getBlob(); } catch (eB) { bl = null; }
    if (!bl) return { ok: false, why: 'تصویرِ ' + (i + 1) + ' خوانده نشد' };
    batch.push({ n: i + 1, text: items[i].text || '', mime: bl.getContentType() || 'image/png',
                 b64: Utilities.base64Encode(bl.getBytes()) });
  }
  var v = null;
  try { v = lvSceneJudge_(batch); } catch (eJ) { return { ok: false, why: 'داورِ تصویر: ' + String(eJ.message || eJ).slice(0, 80) }; }
  for (var k = 1; k <= batch.length; k++) {
    var r = v && v[String(k)];
    if (!r) return { ok: false, why: 'داور تصویرِ ' + k + ' را نسنجید' };
    if (r.txt) return { ok: false, why: 'تصویرِ ' + k + ' نوشته داشت' + (r.why ? ' (' + r.why + ')' : '') };
    if (r.holy) return { ok: false, why: 'تصویرِ ' + k + ' پیکرِ پیامبر یا چهره‌ای مقدس را نشان می‌داد' + (r.why ? ' (' + r.why + ')' : '') };
    if (r.face) return { ok: false, why: 'تصویرِ ' + k + ' چهرهٔ واقعی داشت' };
  }
  return { ok: true, why: '' };
}

function igStepImages_(it, fo, plan, deadline) {
  var lines = plan.plan.lines, want = Math.min(Math.max(1, Number(plan.recap ? CFG.IG_RECAP_IMG_N : CFG.IG_IMG_N) || 5), lines.length - 1);
  var ids = [], how = '';
  /* ۱) نقاشی‌های خودِ درس، اگر هست — به ترتیبِ نام (صحنه ۰۱، ۰۲…)، پخش روی کلِ درس. ۹.۶۱: درسی که تصویرهایش یک بار
     رد شد (`it.noLesson`) دیگر سراغِ «تصویرها»ی درس نمی‌رود — همان قاب‌های نوشته‌دار دوباره به داور نمی‌روند. */
  plan.imgOk = 0;
  if (!it.noLesson) try {
    var epFo = DriveApp.getFolderById(it.folderId), lvf = epFo.getFoldersByName(CFG.LV_FOLDER || 'تصویرها');
    if (lvf.hasNext()) {
      var all = [], fi = lvf.next().getFiles();
      while (fi.hasNext()) { var f = fi.next(); if (igIsImg_(f) && !/^کاور/.test(f.getName())) all.push(f); }
      all.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
      if (all.length) {
        var pick = [];
        for (var i = 0; i < want; i++) {
          var src = all[Math.min(all.length - 1, Math.floor((i + 0.5) * all.length / want))];
          if (pick.length && pick[pick.length - 1].getId() === src.getId()) continue;
          pick.push(src);
        }
        /* ۹.۵۴: «نه کاور درستی داشت نه نوشته‌هاش درست بودن» — درسِ ۱۳ِ مصباح در «تصویرها» نمودارهای نوشته‌دارِ قدیمی
           داشت («Apple → نفی»، «… سیب بودن نفی می‌شود»)، نه نقاشی؛ ریلز آن‌ها را عمودی برید و نوشتهٔ خودش رویشان نشست.
           هر تصویرِ درس پیش از ریلز از داورِ تصویر (`lvSceneJudge_`، همان که صحنه‌ها را می‌سنجد) می‌گذرد: یکی نوشته یا
           چهرهٔ واقعی داشت ⇒ هیچ‌کدام (سبکِ یک‌دست)، و تصویرِ عمودیِ تازه. داوری که جواب نداد هم «نه» است. */
        var gate = igImgGate_(pick.map(function (f, q) { return { file: f, text: igImgLine_(plan, q, pick.length) }; }));
        if (gate.ok) {
          for (var q = 0; q < pick.length; q++) {
            var cp = pick[q].makeCopy('ریلز — تصویر ' + (ids.length + 1), fo);
            ids.push({ id: cp.getId(), src: pick[q].getId() });
          }
          how = 'نقاشی‌های درس';
          plan.imgOk = IG_IMG_GATE_V;
        } else {
          plan.imgGate = gate.why;
        }
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
                 'Absolutely no text, letters, numbers, captions, signs or logos. ' + LV_HOLY_EN + ' ' + String(ln.scene || ln.text);
        var g = null, tries = 0;
        /* ۹.۵۴: تصویرِ تازه هم همان داوری را می‌گذرد؛ نوشته یا چهره ⇒ یک بار از نو، باز بد ⇒ کنار (کمتر، نه بد). */
        while (tries < 2 && Date.now() < deadline) {
          tries++;
          g = lvGenOne_(model, pr, { aspect: '9:16' });
          if (!(g && g.blob)) break;
          var gg = igImgGate_([{ blob: g.blob, text: String(ln.text || ln.scene || '') }]);
          if (gg.ok) break;
          plan.imgGate = gg.why; g = null;
        }
        if (g && g.blob) ids.push({ id: fo.createFile(g.blob.setName('ریلز — تصویر ' + (ids.length + 1) + '.png')).getId(), gen: true });
      }
      if (ids.length) plan.imgOk = IG_IMG_GATE_V;   // هر تصویرِ تازه‌ای که ماند، از سد گذشته است
      how = 'تصویرهای تازه (' + ids.length + ')' + (plan.imgGate ? ' — ' + plan.imgGate : '');
    } else {
      how = 'بی تصویر — ' + (model ? 'سقفِ هزینهٔ ماهانهٔ تصویرسازی' : 'تصویرسازی خاموش است');
    }
  }
  /* ۹.۶۱: ریلزِ بی‌تصویر ساخته نمی‌شود — همان پس‌زمینهٔ خالی که «داغون» دیده شد. منتظر می‌ماند و علت در `why` است. */
  if (!ids.length) { plan.imgs = []; plan.imgHow = how; return { wait: 'تصویرِ پذیرفته‌شده نیست — ' + how }; }
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
              lines: lines, hook: plan.plan.hook, kicker: plan.recap && /^مرور/.test(String(plan.plan.kicker || '')) ? plan.plan.kicker : igKicker_(plan.series, plan.plan.kicker), coverTitle: plan.plan.coverTitle || plan.plan.hook,
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
    if (!(c.j && c.j.id)) { var ce = igErr_(c); return igAcctErr_(ce) ? { wait: 'حساب/دسترسی: ' + ce } : { fail: 'ظرفِ ریلز ساخته نشد: ' + ce }; }
    plan.reelCid = String(c.j.id);
  }
  if (!plan.reelId) {
    var w = igWaitContainer_(plan.reelCid, deadline);
    if (w === 'wait') return { wait: 'ویدئو در متا هنوز آماده نیست' };
    if (w) { plan.reelCid = ''; return { fail: w }; }
    var p = igApi_('post', '/' + a.ig + '/media_publish', { creation_id: plan.reelCid });
    if (!(p.j && p.j.id)) { var pe = igErr_(p); return igAcctErr_(pe) ? { wait: 'حساب/دسترسی: ' + pe } : { fail: 'انتشارِ ریلز: ' + pe }; }
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
  /* ۹.۶۹: «یوتیوب هم دوتا» — شورتز در روز سقفِ خودش را دارد، جدا از سهمیهٔ واحد. */
  var shDay = Math.max(0, Number(CFG.IG_SHORTS_PER_DAY) || 0);
  if (shDay && (Number(ytQuota_().shorts) || 0) >= shDay) return { wait: 'سهمِ شورتزِ امروز (' + shDay + ') پر شد' };
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
  /* ۹.۵۴: «ویدیو درس‌نامهٔ امروز هنوز منتشر نشده». ۱۸ اکتبر: دو آپلودِ کامل (۷۴ِ دیروز که تازه از سنجش گذشت، و ۷۶) سهمِ
     «دو قسمتِ امروز» را پر کرد و سه شورتز باقی را خورد؛ درسِ ۷۵ ساعتِ ۱۰:۲۶ آماده شد و سهمیه نبود. ذخیره حالا دست‌کم
     به اندازهٔ قسمت‌های کاملی است که **همین الان** در صفِ انتشارند (`ytDueList_`)، نه فقط «دو منهای آنچه امروز رفت». */
  var due = 0;
  try { due = ytDueList_().length; } catch (eD) { due = 0; }
  /* ۹.۸۸: ذخیره برای **کلِ** صف یعنی وقتی صف از چهار گذشت (۲۱ اکتبر: شش، از جمله variety:71ِ بی‌صدا از ۱۳ اکتبر)، هیچ
     شورتزی هرگز نمی‌رفت — ۶ × ۱۷۰۰ از سقفِ ۹۰۰۰ بیشتر است. صفِ عقب‌افتاده در یک روز خالی نمی‌شود؛ ذخیره برای قسمت‌های امروز
     و یکی بیشتر کافی است، و شورتز هم روزی دست‌کم یک نوبت می‌گیرد. */
  due = Math.min(due, Math.max(1, Number(CFG.IG_SHORT_KEEP_MAX) || 3));
  var keep = Math.max(due, Math.max(0, (Number(CFG.IG_SHORT_KEEP_UP) || 0) - full)) * (YT_COST.videosInsert + YT_COST.thumbSet + YT_COST.videosUpdate);
  var need = YT_COST.videosInsert + YT_COST.videosUpdate + YT_COST.thumbSet;
  return (Number(q.units) || 0) + need + keep <= cap;
}

/** شورتزی که منتظرِ سهمیه است به صف — ریلزِ همان درس تمام‌شده حساب می‌شود و جای ریلزِ بعدی را نمی‌گیرد. */
function igShortEnqueue_(st, it) {
  st.shortQ = st.shortQ || [];
  if (st.shortQ.some(function (x) { return x.key === it.key; })) return;
  st.shortQ.push({ key: it.key, ep: it.ep, part: Number(it.part) || 1, folderId: it.folderId });
}

/**
 * صفِ شورتز، **به ترتیب**: فقط سرِ صف؛ اگر منتظرِ سهمیه است، بقیه هم منتظر می‌مانند — شورتزِ درسِ ۵ پیش از درسِ ۴ بالا
 * نمی‌رود. ⇒ شمارِ شورتزهای رفته در این دور.
 */
function igShortQueueRun_(st, deadline) {
  var q = st.shortQ || [], n = 0;
  while (q.length && Date.now() < deadline - 30000) {
    var h = q[0], fo = null, plan = null;
    try { fo = igFolder_(DriveApp.getFolderById(h.folderId), h.part); plan = igPlanRead_(fo); } catch (eF) {}
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
    igAcctUnfail_(st);
    /* ۹.۵۱، یک بار: ریلزِ درسِ ۱ِ آئودی (قسمتِ ۲۲) پیش از تمام شدنِ مصباح و با برچسبِ انگلیسی رفت و صاحبِ برنامه بایگانی‌اش
       کرد — نوبتِ خودش دوباره ساخته می‌شود، با برچسبِ فارسی. */
    /* ۹.۵۴، یک بار: ریلزِ درسِ ۱۳ِ مصباح با نمودارهای نوشته‌دار رفت و صاحبِ برنامه بایگانی‌اش کرد — از «انجام‌شده» بیرون
       (شورتزِ در صفش را قاعدهٔ ۹.۵۲ برمی‌دارد) و از نو، با سدِ تصویر؛ درسِ ۱۴ تا آن منتشر نشود منتظر می‌ماند. */
    /* ۹.۵۶: درسِ ۱۳ از نگه‌داشتنِ ۲۴ساعته بیرون، یک‌راست به تلاشِ آخر (با علتِ ردِ قبلی و پذیرشِ ایرادِ نرم). */
    /* ۹.۵۷: درسی که پیش از این نسخه گیر کرد، سنش را از همان گیر می‌شمارد، نه از امروز. */
    /* ۹.۶۱، یک بار: ریلزهای ۱۴ و ۱۵ِ مصباح با قاب‌های متنیِ درس (نه نقاشی) منتشر شدند — صاحبِ برنامه ۱۴ را بایگانی کرد.
       هر دو از «انجام‌شده» بیرون و از نو، بی «تصویرها»ی درس؛ شورتزِ در صف یا در راهشان برداشته می‌شود، و اگر شورتزی
       همین حالا بالا رفته بود، خصوصی (نه پاک) — همان ویدئوی زشت. ۱۶ تا این دو منتشر نشوند منتظر می‌ماند (ترتیب). */
    /* ۹.۷۳، یک بار: ریلزِ مرورِ ۱۹ِ مصباح بی «مرور» روی کاور و آغاز، با عکس‌هایی چند ثانیه جلوتر از گفتار و صدای «Gacrux» رفت —
       صاحبِ برنامه بایگانی‌اش کرد. ۱۹ از «انجام‌شده» بیرون و از نو؛ ۲۰ِ هنوز منتشرنشده (همان صدا و همان زمان‌بندی) هم از نو.
       درس‌های بعدی تا ۱۹ منتشر نشود منتظر می‌مانند (`igEarlierPending_`)، و شورتزِ در صفِ ۱۹ با قاعدهٔ ۹.۵۲ برداشته می‌شود. */
    /* ۹.۸۰، یک بار: ریلزِ ۱۹ سه بار پشتِ داوری که اعلامِ «مرور» را می‌سنجید رد شد — شمارِ شکست صفر، تا با داورِ درست همین حالا برود. */
    if (st.redo973 && !st.unfail980) { ['19'].forEach(function (e) { ['fails', 'failAt', 'firstAt', 'failWhy'].forEach(function (k) { if (st[k]) delete st[k][e]; }); }); st.unfail980 = 1; }
    if (!st.redo973) { try { igRedoEps_(st, ['19', '20'], { '19': 'https://www.instagram.com/reel/DeuJ3IPiNW3/' }); } catch (eR3) { st.lastWhy = 'redo973: ' + String(eR3.message || eR3).slice(0, 100); } st.redo973 = 1; }
    if (!st.redo961) { try { igRedo961_(st); } catch (eR) { st.lastWhy = 'redo961: ' + String(eR.message || eR).slice(0, 100); } st.redo961 = 1; }
    if (!st.redo957) {
      st.firstAt = st.firstAt || {};
      Object.keys(st.failAt || {}).forEach(function (e) { if (!st.firstAt[e]) st.firstAt[e] = Number(st.failAt[e]) || Date.now(); });
      st.redo957 = 1;
    }
    if (!st.redo956) {
      if (st.failAt && st.failAt['13']) delete st.failAt['13'];
      if (st.fails && Number(st.fails['13']) >= 1 && Number(st.fails['13']) < 9) st.fails['13'] = Math.max(1, Number(CFG.IG_TRY_MAX) || 3) - 1;
      st.redo956 = 1;
    }
    if (!st.redo954) {
      st.done = String(st.done || '').split(',').filter(function (x) { return x && x !== '13'; }).join(',');
      st.redo954 = 1;
    }
    if (!st.redo951) {
      st.done = String(st.done || '').split(',').filter(function (x) { return x && x !== '22'; }).join(',');
      st.redo951 = 1;
    }
    /* ۹.۵۲: شورتزِ ریلزی که دیگر «انجام‌شده» نیست بالا نمی‌رود — «اره از صف درش بیار» (شورتزِ همان درسِ ۱ِ آئودی). هر
       ردیفِ صف هم‌زمان با «انجام‌شده» شدنِ ریلزش می‌آید؛ ردیفی که ریلزش از «انجام‌شده» بیرون رفته، پس‌گرفته شده است. */
    if ((st.shortQ || []).length) {
      var dm = igDoneMap_(st);
      st.shortQ = st.shortQ.filter(function (x) { return x && dm[igUid_(x)]; });
    }
    /* ══ بن‌بست (۹.۵۸) ══ درسِ ۱۳ِ مصباح پس از ۹.۵۶/۹.۵۷ هم نیامد: ۱۴ و ۱۵ِ آماده هر دو جای `IG_INFLIGHT` (۲) را گرفته
       بودند و «منتظرِ انتشارِ درسِ ۱۳» بودند، و ۱۳ چون جا نبود هرگز وارد نمی‌شد. هیچ درمانی روی داور به این‌جا نمی‌رسید.
       ریلزی که فقط منتظرِ درسِ پیشین است کار نمی‌کند، پس جا نمی‌گیرد؛ سقفِ کل سه برابر، تا صف بی‌حد نشود. */
    /* ۹.۶۹: حافظهٔ ایده‌های مصباح پیش از نخستین ریلزِ آئودی — یک بار. */
    if (!st.seenSeeded && st.order && deadline - Date.now() > 120000) { try { igSeenSeed_(st, Date.now() + 60000); } catch (eSs) {} }
    var capIn = Math.max(1, Number(CFG.IG_INFLIGHT) || 2);
    var activeIn = st.inflight.filter(function (x) { return !igWaitsEarlier_(st, x); }).length;
    if (activeIn < capIn && st.inflight.length < capIn * 3) {
      var nx = igNextEp_(ytPublished_(getHub_()), st);
      if (nx) {
        var fo0 = ytFolderOf_(ENRICH_SHOW_SPECIAL, nx.ep, nx.series), nUid = igUid_(nx);
        if (fo0) st.inflight.push({ key: 'ig:' + ENRICH_SHOW_SPECIAL + ':' + nUid, ep: nx.ep, part: nx.part || 1, parts: nx.parts || 1,
                                    sIdx: nx.sIdx || 0, series: nx.series,
                                    folderId: fo0.getId(), yt: nx.url, phase: igResumePhase_(fo0, nx.part), at: nowStr_(),
                                    recap: nx.recap ? 1 : 0, lesson: nx.lesson || 0 });
        else { st.fails = st.fails || {}; st.fails[nUid] = 9; st.lastWhy = 'پوشهٔ قسمتِ ' + nx.ep + ' پیدا نشد'; }
      }
    }
    /* ══ اجرای کشته‌شده شاهد دارد (۹.۸۷) ══ «ریلز ۱۹ … بازم جایی گیر کرده»: گامِ صدای مرورِ سه‌دقیقه‌ای (اعراب + گفتارساز)
       از سقفِ شش‌دقیقه‌ایِ Apps Script گذشت و اجرا وسطِ گام کشته شد — `finally` نمی‌دود، پس نه وضع ذخیره شد، نه برنامه، نه
       فایلِ صدا؛ درِ ساعتی همان را دوباره راه انداخت و همان‌جا مُرد. شش ساعت، هیچ پیامی. حالا پیش از هر گام «کجا هستم»
       ذخیره می‌شود؛ اجرای بعد اگر آن را ببیند یعنی قبلی کشته شده — شمرده و گفته می‌شود، و سومی شکست است (و خبر می‌شود). */
    if (st.stepAt && st.stepAt.u) {
      var ku = st.stepAt.u;
      st.killed = st.killed || {}; st.killed[ku] = (Number(st.killed[ku]) || 0) + 1;
      st.lastWhy = 'اجرای پیشین وسطِ گامِ «' + st.stepAt.phase + '» ِ ' + ku + ' کشته شد (سقفِ شش دقیقه) — بارِ ' + st.killed[ku];
      if (st.killed[ku] >= 3) {
        st.fails = st.fails || {}; st.fails[ku] = (Number(st.fails[ku]) || 0) + 1;
        st.failWhy = st.failWhy || {}; st.failWhy[ku] = 'سه اجرا پیاپی وسطِ گامِ «' + st.stepAt.phase + '» کشته شد (سقفِ شش‌دقیقه‌ایِ Apps Script)';
        st.killed[ku] = 0;
      }
      st.stepAt = null;
    }
    /* گامِ صدا سنگین‌ترین است و وقتِ تازه می‌خواهد — اول نوبت می‌گیرد. */
    st.inflight.sort(function (a, b) { return (a.phase === 'voice' ? 0 : 1) - (b.phase === 'voice' ? 0 : 1); });
    var keep = [], again = false;
    for (var i = 0; i < st.inflight.length; i++) {
      var it = st.inflight[i], res = null;
      if (Date.now() > deadline) { keep.push(it); continue; }
      var u = igUid_(it);
      st.firstAt = st.firstAt || {};
      if (!st.firstAt[u]) st.firstAt[u] = Date.now();
      it.ageH = (Date.now() - Number(st.firstAt[u])) / 3600000;
      it.tryN = Number((st.fails || {})[u]) || 0;
      it.prevWhy = (st.failWhy || {})[u] || '';
      it.noLesson = (st.noLessonImg || {})[u] ? 1 : 0;
      st.stepAt = { u: u, phase: it.phase, at: nowStr_() }; igStateSave_(st);
      try { res = igStep_(it, st, deadline); } catch (e) { res = { wait: String(e.message || e).slice(0, 140) }; }
      st.stepAt = null;
      if (st.killed && st.killed[u] && (res.done || res.ok || (res.wait && !res.again))) delete st.killed[u];
      if (res.again) again = true;
      it.why = res.wait || res.fail || '';
      if (it.sincePhase !== it.phase) { it.sincePhase = it.phase; it.since = Date.now(); }
      if (res.done) { st.done = (st.done ? st.done + ',' : '') + u; st.lastAt = nowStr_(); if (st.firstAt) delete st.firstAt[u]; continue; }
      if (res.fail) {
        st.fails = st.fails || {};
        st.fails[u] = (Number(st.fails[u]) || 0) + 1;
        st.lastWhy = it.key + ': ' + res.fail;
        st.failWhy = st.failWhy || {}; st.failWhy[u] = String(res.fail).slice(0, 120);
        /* سقفِ تلاش ⇒ کنار تا `IG_RETRY_H`، بعد همان درس دوباره (۹.۳۰) — رها کردن یعنی جاافتادن. */
        if (st.fails[u] >= Math.max(1, Number(CFG.IG_TRY_MAX) || 3)) {
          st.failAt = st.failAt || {}; st.failAt[u] = Date.now();
          continue;
        }
        /* از نو با مدلِ تازه — جز شکستِ انتشار (۹.۵۱): ویدئوی ساخته‌شده دوباره ساخته نمی‌شد، فقط انتشار دوباره. */
        if (it.phase !== 'pub') it.phase = 'plan';
      }
      keep.push(it);
    }
    st.inflight = keep;
    if ((st.shortQ || []).length) { try { igShortQueueRun_(st, deadline); } catch (eSq) { st.shortWhy = String(eSq.message || eSq).slice(0, 120); } }
    if (deadline - Date.now() > 40000) { try { igShortThumbRetro_(st, deadline); } catch (eTr) { st.thumbWhy = String(eTr.message || eTr).slice(0, 120); } }
    if (deadline - Date.now() > 60000) { try { igInsights_(st, deadline); } catch (eIn) { st.lastWhy = 'آمار: ' + String(eIn.message || eIn).slice(0, 120); } }
    try { igStuckTell_(st); } catch (eSt) {}
    /* گامی که برای وقتِ کم ایستاد، یک دقیقهٔ دیگر در اجرای تازه — نه یک ساعتِ دیگر پشتِ درِ ساعتی (۹.۸۷). سقف در ساعت، تا
       گامی که هیچ‌وقت در یک اجرا جا نمی‌شود چرخهٔ دقیقه‌ای نسازد. */
    if (again) {
      var hr = String(nowStr_()).slice(0, 13);
      if (st.quickH !== hr) { st.quickH = hr; st.quickN = 0; }
      if ((Number(st.quickN) || 0) < (Number(CFG.IG_QUICK_PER_H) || 6)) {
        st.quickN = (Number(st.quickN) || 0) + 1;
        try { clearRetryTriggers_('igTick'); ScriptApp.newTrigger('igTick').timeBased().after(60000).create(); st.quickAt = nowStr_(); } catch (eQk) {}
      }
    }
    return null;
  } finally {
    st.armedAt = 0;
    st.ranAt = nowStr_();
    st.ranMs = Date.now();
    igStateSave_(st);
    runExit_('igTick');
  }
}

/**
 * ریلزهایی که از نو ساخته می‌شوند (۹.۷۳ — تعمیمِ ۹.۶۱): از «انجام‌شده»، صفِ شورتز و در جریان بیرون؛ برنامه‌شان به گامِ «plan»
 * برمی‌گردد (ریلزِ منتشرنشده هم، وگرنه `igResumePhase_` از گامِ آماده ادامه می‌داد و همان صدا و تصویر را می‌فرستاد)؛ شورتزی که
 * بالا رفته بود خصوصی (نه پاک)، و پیوندِ ریلزِ بایگانی‌شده در برنامه می‌ماند.
 */
function igRedoEps_(st, eps, arch) {
  arch = arch || {};
  var fid = {};
  (st.inflight || []).concat(st.shortQ || []).forEach(function (x) { if (x && x.folderId && eps.indexOf(String(x.ep)) !== -1) fid[String(x.ep)] = x.folderId; });
  st.done = String(st.done || '').split(',').filter(function (x) { return x && eps.indexOf(x) === -1; }).join(',');
  st.shortQ = (st.shortQ || []).filter(function (x) { return x && eps.indexOf(String(x.ep)) === -1; });
  st.inflight = (st.inflight || []).filter(function (x) { return x && eps.indexOf(String(x.ep)) === -1; });
  st.archived = st.archived || {};
  var n = 0;
  eps.forEach(function (e) {
    if (arch[e]) st.archived[e] = arch[e];
    if (st.fails) delete st.fails[e];
    if (st.failAt) delete st.failAt[e];
    if (st.firstAt) delete st.firstAt[e];
    if (st.failWhy) delete st.failWhy[e];
    var epFo = null;
    try { epFo = fid[e] ? DriveApp.getFolderById(fid[e]) : ytFolderOf_(ENRICH_SHOW_SPECIAL, Number(e)); } catch (eF0) { epFo = null; }
    if (!epFo) return;
    try {
      var fo = igFolder_(epFo), plan = igPlanRead_(fo);
      if (!plan) return;
      if (plan.shortId) {
        var yt = ytSvc_();
        if (yt && ytQuotaTake_(YT_COST.videosUpdate, false)) {
          yt.Videos.update({ id: plan.shortId, status: { privacyStatus: 'private', selfDeclaredMadeForKids: false } }, 'status');
          plan.shortHidden = plan.shortId;
        }
      }
      if (plan.reelId || arch[e]) plan.archivedReel = plan.permalink || arch[e];
      plan.redoFrom = String(plan.phase || '');
      plan.phase = 'plan';
      igPlanWrite_(fo, plan);
      n++;
    } catch (eF) { st.lastWhy = 'redo (' + e + '): ' + String(eF.message || eF).slice(0, 100); }
  });
  return n;
}

function igRedo961_(st) {
  var eps = ['14', '15'], arch = { '14': 'https://www.instagram.com/reel/DerQYQUiZtR/', '15': 'https://www.instagram.com/reel/DerQmhmDI5e/' };
  var fid = {};
  (st.inflight || []).concat(st.shortQ || []).forEach(function (x) { if (x && eps.indexOf(String(x.ep)) !== -1) fid[String(x.ep)] = x.folderId; });
  st.done = String(st.done || '').split(',').filter(function (x) { return x && eps.indexOf(x) === -1; }).join(',');
  st.shortQ = (st.shortQ || []).filter(function (x) { return x && eps.indexOf(String(x.ep)) === -1; });
  st.inflight = (st.inflight || []).filter(function (x) { return x && eps.indexOf(String(x.ep)) === -1; });
  st.noLessonImg = st.noLessonImg || {};
  st.archived = st.archived || {};
  eps.forEach(function (e) {
    st.noLessonImg[e] = 1;
    st.archived[e] = arch[e];
    if (st.fails) delete st.fails[e];
    if (st.failAt) delete st.failAt[e];
    if (st.firstAt) delete st.firstAt[e];
    if (!fid[e]) return;
    try {
      var fo = igFolder_(DriveApp.getFolderById(fid[e])), plan = igPlanRead_(fo);
      if (!plan) return;
      if (plan.shortId) {
        var yt = ytSvc_();
        if (yt && ytQuotaTake_(YT_COST.videosUpdate, false)) {
          yt.Videos.update({ id: plan.shortId, status: { privacyStatus: 'private', selfDeclaredMadeForKids: false } }, 'status');
          plan.shortHidden = plan.shortId;
        }
      }
      plan.archivedReel = plan.permalink || arch[e];
      igPlanWrite_(fo, plan);
    } catch (eF) { st.lastWhy = 'redo961 (' + e + '): ' + String(eF.message || eF).slice(0, 100); }
  });
  return true;
}

/**
 * شکستی که از حساب بود، شکستِ درس نیست (۹.۵۱): شمارش و نگه‌داشتنش پاک می‌شود — درسِ ۹ِ مصباح با «API access blocked»
 * سه بار شمرده شد و ۲۴ ساعت کنار رفت، در حالی که خودِ درس هیچ ایرادی نداشت. پیش از ۹.۵۱ علت فقط در `lastWhy` بود.
 */
function igAcctUnfail_(st) {
  var f = st.fails || {}, fw = st.failWhy || {}, n = 0;
  Object.keys(f).forEach(function (e) {
    var why = fw[e] || (String(st.lastWhy || '').indexOf(':' + e + ':') !== -1 ? st.lastWhy : '');
    if (Number(f[e]) < 9 && igAcctErr_(why)) { delete f[e]; delete fw[e]; if (st.failAt) delete st.failAt[e]; n++; }
  });
  st.fails = f; st.failWhy = fw;
  return n;
}

/** درسی که دوباره به صف می‌آید از همان گامی ادامه می‌دهد که برنامه‌اش دارد (۹.۵۱) — ویدئوی آماده دوباره ساخته نمی‌شود. */
function igResumePhase_(fo0, part) {
  try {
    var pl = igPlanRead_(igFolder_(fo0, part));
    if (pl && !pl.reelId && (Number(pl.v) || 1) >= (Number(CFG.IG_PLAN_MIN) || 3) &&
        ['voice', 'img', 'ask', 'got', 'ok', 'pub'].indexOf(String(pl.phase)) !== -1) return String(pl.phase);
  } catch (e) {}
  return 'plan';
}

/**
 * سدِ تصویر روی درِ انتشار (۹.۶۱) — «ریلزِ درسِ ۱۴ باز داغون بود … مگه نگفتی درستش کردی». سدِ ۹.۵۴ فقط در گامِ تصویر بود؛
 * ۱۴ و ۱۵ِ مصباح تصویرشان را **پیش از** نصبِ آن گام برداشته بودند (قاب‌های متنیِ «تصویرها»ی درس، نه نقاشی) و از همان
 * گامِ بعدی ادامه دادند — هیچ‌وقت از سد نگذشتند و منتشر شدند. ریلزِ منتشرنشده‌ای که تصویرِ درس دارد و مُهرِ گذر از سد
 * (`imgOk`) ندارد، پیش از ساخت و انتشار به گامِ تصویر برمی‌گردد. سد باید سرِ در باشد، نه روی یکی از راه‌های رسیدن به آن.
 */
/* نسخهٔ سد (۹.۶۶): ۲ = داور «پیکرِ مقدس» را هم می‌پرسد. مُهرِ کهنه‌تر یعنی سدِ امروز را نگذشته — ریلزِ منتشرنشده دوباره. */
var IG_IMG_GATE_V = 2;
function igImgUnchecked_(plan) {
  if (!plan || plan.reelId || Number(plan.imgOk) >= IG_IMG_GATE_V) return false;
  if (['ask', 'got', 'ok', 'pub'].indexOf(String(plan.phase)) === -1) return false;
  /* تصویرِ ساخته‌شده هم (۹.۶۶): سدِ پیش از ۹.۶۶ پیکرِ مقدس را نمی‌پرسید، پس مُهرِ کهنه برای هیچ‌کدام کافی نیست. */
  return (plan.imgs || []).some(function (x) { return x && (x.src || x.id); });
}

/** برنامه به گامِ تصویر — ویدئو، کاور و شورتزِ ساخته‌شده از تصویرهای ردشده کنار می‌روند. */
function igImgReset_(plan) {
  plan.imgs = []; plan.imgOk = 0; plan.imgHow = '';
  ['video', 'cover', 'short', 'shortSeconds', 'sig', 'askedAt', 'align', 'reelCid'].forEach(function (k) { delete plan[k]; });
  plan.phase = 'img';
  return plan;
}

/** یک گامِ یک ریلز. ⇒ {done} | {ok} | {wait} | {fail} */
function igStep_(it, st, deadline) {
  var fo = igFolder_(DriveApp.getFolderById(it.folderId), it.part);
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
  if (plan && igImgUnchecked_(plan)) {
    try { var dq2 = ytRenderRead_(); var nb2 = (dq2.reels || []).length;
          dq2.reels = (dq2.reels || []).filter(function (x) { return x && x.key !== it.key; });
          if (dq2.reels.length !== nb2) ytRenderSave_(dq2); } catch (eQ2) {}
    igImgReset_(plan);
    st.noLessonImg = st.noLessonImg || {}; st.noLessonImg[igUid_(it)] = 1; it.noLesson = 1;
    igPlanWrite_(fo, plan);
    it.phase = plan.phase;
  }
  var r;
  for (var guard = 0; guard < 8 && Date.now() < deadline; guard++) {
    if (it.phase === 'plan') { r = igStepPlan_(it, fo); if (!r.ok) return r; plan = r.plan; it.phase = plan.phase; continue; }
    if (plan.phase === 'voice') {
      /* ۹.۸۷: صدای مرور (اعراب + گفتارساز) چند دقیقه است؛ آغازش با وقتِ کم یعنی کشته شدن وسطِ کار. */
      var needV = Math.max(30, Number(CFG.IG_VOICE_NEED_SEC) || 170) * 1000;
      if (deadline - Date.now() < needV) return { wait: 'وقتِ این اجرا برای ساختِ صدا کم بود — اجرای تازه تا یک دقیقهٔ دیگر', again: true };
      r = igStepVoice_(it, fo, plan, deadline);
    }
    else if (plan.phase === 'img') r = igStepImages_(it, fo, plan, deadline);
    else if (plan.phase === 'ask') r = igStepAsk_(it, fo, plan);
    else if (plan.phase === 'got') r = igStepGot_(it, fo, plan);
    else if (plan.phase === 'ok') r = igStepOk_(it, plan, st);
    else if (plan.phase === 'pub') {
      /* انتشار به ترتیبِ درس (۹.۳۰): دو ریلز هم‌زمان ساخته می‌شوند، ولی درسِ ۵ پیش از درسِ ۴ منتشر نمی‌شود. */
      var pend = igEarlierPending_(st, it.ep, it.part);
      if (pend) return { wait: 'منتظرِ انتشارِ ' + pend + ' همین مجموعه' };
      r = igStepPub_(it, plan, st, deadline);
    }
    else if (plan.phase === 'yts') {
      /* ۹.۳۲: شورتزِ منتظرِ سهمیه ریلز را نگه نمی‌دارد — به صف می‌رود و ریلز تمام می‌شود. و اگر صف پُر است، این هم
         پشتِ آن می‌ایستد، وگرنه شورتزِ درسِ بعد پیش از درسِ قبل بالا می‌رفت. */
      r = (st.shortQ || []).length ? { wait: 'صف' } : igShortPub_(it, plan);
      if (r.wait) { plan.shortQueued = nowStr_(); igShortEnqueue_(st, it); r = { ok: true }; }
      if (r.ok) { plan.phase = 'done'; plan.doneAt = nowStr_(); try { igLog_(it, plan); } catch (eL) {}
                  try { igSeenAdd_(plan, igUid_(it)); } catch (eSa) {} }
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
              gaps: st.gaps || [], caught: st.caught || [], book: igBookUrl_(), held: igHeld_(st),
              shortQ: (st.shortQ || []).map(function (x) { return igUid_(x); }), shortWhy: st.shortWhy || '',
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
      (out.held.length ? '. ⏸ کنار تا تلاشِ بعد: ' + out.held.map(function (h) { return 'درسِ ' + h.ep + ' (' + h.tries + ' بار، ' + h.ageH + ' ساعت؛ ' + h.why + ')'; }).join(' · ') : '') +
      (igBookUrl_() ? '. دفتر: ' + igBookUrl_() : '') +
      '. ⟨شما⟩ هایلایت، بیو و برچسبِ پیوندِ استوری از API در دسترس نیست — از خودِ اپ.';
  return out;
}

/**
 * درس‌هایی که به سقفِ تلاش رسیده‌اند و تا `IG_RETRY_H` کنارند (۹.۵۷). پیش از این هیچ‌جا دیده نمی‌شدند: درس از
 * `inflight` بیرون می‌رفت، پس نه خطِ روزانه نامش را می‌برد نه `igHealth_` (که فقط `inflight` را می‌پایید) — درسِ ۱۳ِ
 * مصباح همین‌طور یک روزِ کامل ریلزها را نگه داشت و تنها نشانه‌اش «امروز ۰» بود.
 */
function igHeld_(st) {
  var maxTry = Math.max(1, Number(CFG.IG_TRY_MAX) || 3), f = st.fails || {}, out = [];
  Object.keys(f).forEach(function (e) {
    var n = Number(f[e]) || 0;
    if (n < maxTry || n >= 9) return;
    var fa = Number((st.firstAt || {})[e]) || 0;
    out.push({ ep: Number(e), tries: n, ageH: fa ? Math.round((Date.now() - fa) / 3600000) : 0,
               why: String((st.failWhy || {})[e] || '').slice(0, 90) });
  });
  return out;
}

/**
 * «ریلزها جایی بعداً گیر نکنه و بی‌خبر نمونم» (۹.۶۹). خطِ روزانه و یافته فقط در ایمیلِ ده صبح بودند؛ گیرِ ساعتِ یازده تا
 * فردا ده صبح دیده نمی‌شد. حالا همان سه وضع — درسِ کنارگذاشته پس از سقفِ تلاش، گامی که بیش از `IG_STUCK_H` ساعت مانده،
 * و ترتیبی که سرِ درسی بی ویدئوی عمومی ایستاده — همان لحظه به تلگرام، هر کدام **یک بار** (تا عوض شود). سکوتِ تلگرام یعنی
 * چیزی گیر نیست، نه اینکه کسی نگاه نکرد.
 */
function igStuckTell_(st) {
  var now = Date.now(), msgs = [];
  igHeld_(st).forEach(function (h) { msgs.push('درسِ ' + h.ep + ' پس از ' + h.tries + ' تلاش کنار رفت (دوباره پس از ' + (Number(CFG.IG_RETRY_H) || 6) + ' ساعت) — ' + h.why); });
  (st.inflight || []).forEach(function (x) {
    if (x.phase === 'ok' || !x.since || x.sincePhase !== x.phase) return;
    var h = (now - Number(x.since)) / 3600000;
    if (h > (Number(CFG.IG_STUCK_H) || 30)) msgs.push(x.key + ' ' + Math.round(h) + ' ساعت در گامِ «' + x.phase + '»' + (x.why ? ' — ' + x.why : ''));
  });
  (st.gaps || []).forEach(function (g) { msgs.push('ترتیب: ' + g); });
  var sig = msgs.join(' | ').slice(0, 900);
  if (!msgs.length) { st.stuckSig = ''; return false; }
  if (st.stuckSig === sig) return false;
  st.stuckSig = sig;
  try { tgSend_('📱 ریلزِ اینستاگرام گیر کرده:\n• ' + tgEsc_(msgs.join('\n• ')) + '\nخودش دوباره تلاش می‌کند؛ این پیام تا وضع عوض نشود تکرار نمی‌شود.'); } catch (e) { return false; }
  return true;
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
  /* ۹.۵۸: منتظرِ درسی که نه در جریان است نه کنار رفته ⇒ بن‌بست — دیده می‌شود، هرچند ۹.۵۸ راهش را بسته. */
  (st.inflight || []).forEach(function (x) {
    if (!igWaitsEarlier_(st, x)) return;
    if (!x.since || (now - Number(x.since)) < 3 * 3600000) return;
    var anyEarlierBusy = (st.inflight || []).some(function (y) { return Number(y.ep) < Number(x.ep) && !igWaitsEarlier_(st, y); });
    if (!anyEarlierBusy && !(s.held || []).length) bad.push(x.key + ' ' + (x.why || 'منتظرِ درسِ پیشین') + '، ولی آن درس نه در جریان است نه کنار رفته (بن‌بست)');
  });
  /* ۹.۵۷: درسی که کنار رفته هم دیده می‌شود — همان درس کلِ مجموعه را نگه می‌دارد. */
  (s.held || []).forEach(function (h) { bad.push('درسِ ' + h.ep + ' پس از ' + h.tries + ' تلاش کنار رفت (' + h.ageH + ' ساعت از نخستین تلاش) — ' + h.why); });
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
