/**
 * 32_Persona.gs — «صداها»: یک گویندهٔ مهمان کنارِ بقیه، نه به‌جای بقیه
 *
 * ══ خواستهٔ صاحبِ برنامه، عیناً ══
 *
 * «وقتی متصل شد نمی‌خوام همش صدای رضوی باشه و می‌خوام مثل یه صدا کنار
 * صداهای دیگه باشه و دوره‌ای باشه و ثبت بشه و بشه حذف کرد … حسب وایب و
 * فضا و موضوع.»
 *
 * پس این بخش یک جدول است، نه یک کلید. هر ردیف یک «شخصیتِ خواندن» است:
 * فعال یا نه، برای کدام برنامه‌ها، هر چند قسمت یک بار، با چه دستوری، و
 * با چه حالت‌هایی. حذفش هم یعنی همان ردیف را خاموش کنی.
 *
 * ══ این بخش رنگِ صدا را عوض نمی‌کند — و آن را صریح می‌نویسیم ══
 *
 * چیزی که اینجا اعمال می‌شود **شیوهٔ خواندن** است: مکث، طولِ عبارت،
 * دامنه، کشش. رنگِ صدا (تیمبر) کارِ مدلِ تبدیل است و Apps Script نه
 * می‌تواند اجرایش کند و نه کتابخانه‌اش را دارد — دقیقاً همان دیواری که
 * بخشِ ۲۷ برای ویدئو به آن خورد. اگر روزی رنگِ صدا هم لازم شد، راهش
 * همان است: پرونده‌ای مثل `_YT-RENDER.json` که بیرون از موتور پردازش
 * شود. اینجا هیچ ادعایی دربارهٔ تیمبر نمی‌شود.
 *
 * ══ چرا متنِ دستور در خودِ شیت است ══
 *
 * چون تنها کسی که می‌تواند بگوید «این خوب درنیامد» صاحبِ برنامه است، و
 * دری که آدم نتواند بازش کند دروازه نیست. کارت‌های سبک را آزمایشگاهِ
 * صدا از روی صوتِ واقعی می‌سازد (هر جمله‌اش یک عدد پشتش دارد)، ولی
 * جایی که اجرا می‌شود همین سلول است و ویرایشش با اوست.
 *
 * ══ و چرا پیش‌فرضْ خاموش است ══
 *
 * «تقویمِ تولید» پیش‌فرضش روشن است چون خاموشی‌اش رفتار را عوض می‌کرد.
 * اینجا برعکس: روشن بودنِ یک ردیفِ تازه یعنی همان شبی که کد نصب شد،
 * خوانشِ هر قسمت عوض می‌شود بی آنکه کسی خواسته باشد. ردیف ساخته
 * می‌شود، خبرش داده می‌شود، و روشن کردنش با اوست.
 */

/* ══ ستونِ تازه **در انتها** می‌نشیند، نه وسط (۷٫۴۱) ══
   `ensureTab_` فقط سطرِ سرصفحه را بازنویسی می‌کند، نه داده را. پس ستونی
   که وسط اضافه شود، برچسبِ تازه را روی دادهٔ قدیمی می‌گذارد: «آخرین
   تصمیم» زیرِ عنوانِ دیگری می‌نشیند و هیچ خطایی بلند نمی‌شود. همان باگی
   که یک بار در داشبورد افتاد و توضیحش در `ensureTab_` هست. */
/* ستونِ تازه به **انتها** می‌رود، نه وسط (۷٫۴۱): `ensureTab_` فقط سطرِ
   سربرگ را بازمی‌نویسد و دست به داده نمی‌زند، پس ستونی که وسط جا بیفتد
   برچسب‌های تازه را روی مقدارهای کهنه می‌نشاند، بی هیچ خطایی. */
var PERSONA_HEADERS = ['کلید', 'نام', 'فعال', 'برنامه‌ها', 'هر چند قسمت',
                       'دستورِ سبک', 'حالت‌ها', 'آخرین تصمیم', 'آخرین استفاده',
                       'قسمت‌های موردی', 'قسمت‌های تولیدشده (تیک‌خورده)'];

/** شمارهٔ ستون‌ها (۱-بنیان) — همان الگوی `CC` در بخشِ ۲۵. */
var PC = { KEY: 1, NAME: 2, ON: 3, SHOWS: 4, EVERY: 5, STYLE: 6, MODES: 7,
           LAST: 8, USED: 9, ONCE: 10, PICK: 11 };

/**
 * ردیف‌های جدول، بی سرصفحه — با همان اصطلاحی که بقیهٔ موتور می‌خوانَد.
 *
 * `getDataRange` وسوسه‌انگیز است ولی ستون‌های ناخواسته را هم می‌آورد و
 * در آزمونِ محلی اصلاً وجود ندارد. `getLastRow` + بازهٔ صریح همان چیزی
 * است که `calBoardData_` می‌کند.
 */
function personaRows_(sh) {
  var s = sh || personaTab_();
  var last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2, 1, last - 1, PERSONA_HEADERS.length).getValues();
}


function personaTab_(hub) {
  return ensureTab_(hub || getHub_(), CFG.PERSONA_TAB || 'صداها',
                    PERSONA_HEADERS);
}

/** همان واژه‌های «بله/خیر» که تقویم می‌فهمد — دو فهرست یعنی دو رفتار. */
function personaOn_(v) {
  return calOn_(v);
}

/**
 * «برنامه‌ها» را بخوان: «همه» یا فهرستی با کاما.
 *
 * نامِ برنامه در شیت همان نامی است که آدم می‌نویسد، و آدم «درس‌نامه» را
 * گاهی «درس نامه» می‌نویسد. پس مقایسه روی نامِ فشرده (بی فاصله و بی
 * نیم‌فاصله) انجام می‌شود، وگرنه یک نیم‌فاصله ردیف را بی‌صدا از کار
 * می‌اندازد.
 */
function personaShowOk_(cell, show, key) {
  var t = String(cell == null ? '' : cell).trim();
  if (!t || t === 'همه' || t === '*') return true;
  var norm = function (s) {
    return String(s || '').replace(/[\s‌]+/g, '');
  };
  var want = [norm(show), norm(key)];
  /* ══ نامِ فارسیِ برنامه هم باید بخورد (۷٫۵۵) ══
     تا ۷٫۵۴ فقط کلیدِ داخلی (`variety`/`special`) سنجیده می‌شد، در حالی
     که **هر دو راهی که صاحبِ برنامه از آن‌ها استفاده می‌کند نامِ فارسی
     می‌دهند**:
       • تختهٔ انتخاب تیک‌ها را از `knownShows_().name` می‌سازد و همان را
         در سلول می‌نویسد. با هر دو تیک سلول «همه» می‌شود و اتفاقاً کار
         می‌کرد؛ با **یک** تیک سلول «درس‌نامه» می‌شد و آن ردیف دیگر برای
         هیچ قسمتی انتخاب نمی‌شد. یعنی «فقط برای درس‌نامه» یعنی «برای
         هیچ‌کدام».
       • راهنمای خودِ همان پنجره «درس‌نامه ۴۷» را نمونه می‌دهد و پیامِ
         خطای ذخیره هم همان را تکرار می‌کند — و آن شکل هرگز نمی‌خورد.
     شکلی که خودِ ابزار تبلیغ می‌کند و بی‌صدا کار نمی‌کند، بدترین شکلِ
     خرابی در این مخزن است: کاربر باور می‌کند تنظیم کرده. */
  try {
    var L = knownShows_() || [];
    for (var s = 0; s < L.length; s++) {
      if (norm(L[s].key) === norm(show)) want.push(norm(L[s].name));
    }
  } catch (eK) {}
  var parts = t.split(/[،,]/);
  for (var i = 0; i < parts.length; i++) {
    var p = norm(parts[i]);
    if (!p) continue;
    if (want.indexOf(p) !== -1) return true;
  }
  return false;
}

/**
 * نوبتِ این صداست یا نه.
 *
 * «هر چند قسمت» یعنی هر nاُمین قسمت. خالی یا ۱ یعنی همیشه. شمارهٔ قسمت
 * مبناست، نه تاریخ و نه شمارنده‌ای که خودمان نگه داریم: شمارهٔ قسمت
 * چیزی است که هم در نام پوشه هست و هم در ردیفِ شیت، پس «چرا امروز این
 * صدا؟» جوابِ قابلِ وارسی دارد.
 */
function personaTurn_(every, epNum) {
  var n = Math.floor(Number(every) || 0);
  if (!(n > 1)) return true;
  var e = Math.floor(Number(epNum) || 0);
  if (!(e > 0)) return false;   // شمارهٔ نامعلوم، نوبتِ نامعلوم
  return (e % n) === 0;
}

/**
 * «قسمت‌های موردی» را بخوان — یک ورودی در هر خط یا جداشده با کاما.
 *
 * ══ چرا این ستون هست (۷٫۴۱) ══
 * خواستهٔ صاحبِ برنامه، ۲۰ سپتامبر، عیناً: «بتونم … چه به صورتِ **دائم
 * یا موردی** از صدایی که استفاده کردیم استفاده کنم».
 * آنچه ساخته شده بود فقط «هر چند قسمت» بود — یعنی **دوره‌ای**، نه
 * موردی. «این قسمتِ خاص را با صدای او بساز» هیچ راهی نداشت، و من تا
 * امروز نگفته بودم که ندارد.
 *
 * شکل‌های پذیرفته، همان اصطلاحِ «استثناها»ی تقویم:
 *   ۴۷            · ۴۷ تا ۵۰            · 47-50
 *   درس‌نامه ۴۷    · درس‌نامه ۴۷ تا ۵۰    · variety 47
 * رقمِ فارسی و لاتین هر دو، و نیم‌فاصله در نامِ برنامه بی‌اثر است —
 * همان `personaShowOk_` که «درس نامه» و «درس‌نامه» را یکی می‌داند.
 *
 * ══ و چرا خطِ نافهم **برگردانده** می‌شود، نه دور انداخته ══
 * `personaModes_` خطِ ناقص را کنار می‌گذارد و درست است: یک حالتِ کمتر
 * یعنی افتِ کیفیت. اینجا برعکس — خطی که خوانده نشود یعنی **قسمتی که
 * صاحبِ برنامه خواسته و بی‌صدا نخواهد گرفت**، و او هرگز نمی‌فهمد. پس
 * ناخوانا را به بالادست گزارش می‌کنیم.
 */
function personaOnceParse_(cell) {
  var out = { items: [], bad: [] };
  var raw = String(cell == null ? '' : cell);
  var parts = raw.split(/[\r\n،,؛;]+/);
  for (var i = 0; i < parts.length; i++) {
    var t = String(parts[i] || '').trim();
    if (!t) continue;
    /* رقم‌ها لاتین می‌شوند ولی متنِ نامِ برنامه دست نمی‌خورد. */
    var d = (typeof faDigits_ === 'function') ? faDigits_(t) : t;
    var m = d.match(/^(.*?)(\d+)\s*(?:تا|-|–|—|to)\s*(\d+)\s*$/);
    var one = d.match(/^(.*?)(\d+)\s*$/);
    var showPart = '', a = 0, b = 0;
    if (m) { showPart = m[1]; a = Number(m[2]); b = Number(m[3]); }
    else if (one) { showPart = one[1]; a = Number(one[2]); b = a; }
    else { out.bad.push(t); continue; }
    if (!(a > 0) || !(b > 0)) { out.bad.push(t); continue; }
    if (b < a) { var sw = a; a = b; b = sw; }
    out.items.push({ show: String(showPart || '').trim(), from: a, to: b });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════
 *  فهرست به‌جای تایپ — و دو کارِ متفاوت که یکی به نظر می‌رسیدند (۷٫۵۹)
 *
 *  خواستهٔ صاحبِ برنامه، عیناً: «یه کاری کنی که لیستی باشه جای تایپی و
 *  برای پادکست‌ها قسمت‌هایی که تولید شده رو نشون بده و بتونم هر چند تا
 *  که می‌خوام تیک بزنم … و برای درس‌هایی که ساخته نشده بتونم شماره‌ش رو
 *  تایپ کنم که موعدش رسید انجام بشه، و باید لیست برای هر نوع پادکست
 *  جدا باشه».
 *
 *  او خودش درست تفکیک کرده، و تفکیکش در کد هم واقعی است:
 *   • قسمتِ **تولیدشده** → صوتش همین حالا هست → همین حالا تبدیل می‌شود.
 *     (پل، بخشِ ۳۶ — صوت می‌رود، با صدای گوینده برمی‌گردد.)
 *   • قسمتِ **ساخته‌نشده** → هنوز صوتی ندارد → تنظیم می‌ماند تا روزش.
 *     (همان ستونِ «قسمت‌های موردی»، با دروازهٔ ۷٫۵۸ روی شماره‌های گذشته.)
 *
 *  پس دو ستون، نه یکی. یک ستون یعنی «۱۸» گاهی «تبدیلش کن» باشد و گاهی
 *  «وقتی ساختی…» — و هیچ‌کس نتواند بگوید کدام.
 *
 *  ══ و فهرست از کجا می‌آید ══
 *  تبِ قسمت‌های هر برنامه **کاملِ** آن چیزی است که تولید شده؛ ولی برای
 *  تبدیل، شناسهٔ **پوشهٔ** قسمت لازم است و آن فقط در `_YT-RENDER.json`
 *  هست. امروز آن فایل ۴۵ قسمت از ۵۰ درس‌نامه را دارد و متنوع را از ۲۰
 *  به بعد. پس فهرست از تب ساخته می‌شود (کامل) و پوشه از آن فایل می‌آید،
 *  و قسمتی که پوشه‌اش شناخته نیست **نشان داده می‌شود ولی تیک نمی‌خورد،
 *  با نوشتنِ علتش**. پنهان کردنش یعنی او فکر کند آن قسمت وجود ندارد —
 *  همان «همه‌چیز خوب به نظر می‌رسد» که این پرونده گران‌ترین جمله‌اش
 *  می‌داند.
 * ══════════════════════════════════════════════════════════════════════ */

/** تبِ قسمت‌های یک برنامه و ستون‌هایش. برنامهٔ ناشناخته: `null`. */
function personaEpTab_(show) {
  var k = String(show || '').trim();
  if (k === ENRICH_SHOW_SPECIAL) {
    return { tab: CFG.SPECIAL_TAB, headers: SPECIAL_HEADERS,
             num: XC.NUM, at: XC.AT, title: XC.TITLE, series: XC.SERIES };
  }
  if (k === ENRICH_SHOW_VARIETY) {
    return { tab: CFG.TAB_PODCASTS, headers: PODCAST_HEADERS,
             num: 1, at: 2, title: 3, series: 0 };
  }
  return null;
}

/** نقشهٔ «برنامه:قسمت» → شناسهٔ پوشه، از صفِ رندر. یک خواندن، نه یکی در هر ردیف. */
function personaFolderMap_() {
  var m = {};
  try {
    var d = ytRenderRead_();
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      var f = String(it.folderId || '');
      if (!f) continue;
      m[String(it.show) + ':' + String(it.ep)] = f;
    }
  } catch (e) {}
  return m;
}

/**
 * قسمت‌های تولیدشدهٔ یک برنامه — تازه‌ترین اول.
 *
 * سقف هست چون پنجره باید باز شود، ولی **شمارِ کل هم برمی‌گردد**: فهرستی
 * که بگوید «اینها هستند» در حالی که بخشی را نشان نمی‌دهد، همان جوابِ
 * ناقصی است که خودش را کامل نشان می‌دهد (۷٫۲۳).
 */
function personaEpisodesFor_(show, capOpt, mapOpt) {
  var out = { show: String(show || ''), items: [], total: 0, shown: 0,
              noFolder: 0, capped: false };
  var t = personaEpTab_(out.show);
  if (!t) return out;
  var cap = Math.max(1, Number(capOpt) || Number(CFG.PERSONA_EP_LIST) || 40);
  var map = mapOpt || personaFolderMap_();
  var sh;
  try {
    var hub = getHub_();
    sh = hub.getSheetByName(t.tab);
  } catch (e) { out.error = e.message; return out; }
  if (!sh || sh.getLastRow() < 2) return out;
  var vals;
  try { vals = sh.getRange(2, 1, sh.getLastRow() - 1, t.headers.length).getValues(); }
  catch (e2) { out.error = e2.message; return out; }
  var all = [];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    var num = Math.floor(Number(faDigits_(String(v[t.num - 1] || ''))) || 0);
    if (!(num > 0)) continue;
    var ttl = String(v[t.title - 1] || '').trim();
    if (t.series && String(v[t.series - 1] || '').trim()) {
      ttl = String(v[t.series - 1]).trim() + ' — ' + ttl;
    }
    var fid = map[out.show + ':' + num] || '';
    all.push({ ep: num, title: ttl.slice(0, 110),
               at: String(v[t.at - 1] || '').slice(0, 10),
               folder: fid, can: !!fid });
    if (!fid) out.noFolder++;
  }
  all.sort(function (a, b) { return b.ep - a.ep; });
  out.total = all.length;
  out.items = all.slice(0, cap);
  out.shown = out.items.length;
  out.capped = out.total > out.shown;
  return out;
}

/**
 * تیک‌ها ← متن، و متن ← تیک‌ها.
 *
 * ذخیره‌شده همان شکلِ «قسمت‌های موردی» است («درس‌نامه ۱۸، درس‌نامه ۲۰»)
 * تا `personaOnceParse_` همان‌جور بخوانَدش و یک زبانِ دوم لازم نشود. و
 * آدمی که سلول را باز کند می‌فهمد چه نوشته — شناسهٔ ماشینی نمی‌فهمید.
 */
function personaPickText_(list) {
  var seen = {}, out = [];
  var L = list || [];
  for (var i = 0; i < L.length; i++) {
    var raw = String(L[i] || '').trim();
    if (!raw) continue;
    var at = raw.lastIndexOf(':');
    if (at === -1) continue;
    var sh = raw.slice(0, at), ep = Math.floor(Number(faDigits_(raw.slice(at + 1))) || 0);
    if (!sh || !(ep > 0)) continue;
    var k = sh + ':' + ep;
    if (seen[k]) continue;
    seen[k] = true;
    out.push(personaShowName_(sh) + ' ' + faDigitsOut_(String(ep)));
  }
  return out.join('، ');
}

/** متنِ ستونِ تیک‌ها ← مجموعهٔ «برنامه:قسمت»، برای علامت زدنِ فهرست. */
function personaPickSet_(cell, showsCell) {
  var set = {};
  var p = personaOnceParse_(cell);
  for (var i = 0; i < p.items.length; i++) {
    var it = p.items[i];
    var shows = [];
    try {
      var L = knownShows_() || [];
      for (var s = 0; s < L.length; s++) {
        var k = String(L[s].key);
        if (it.show) { if (personaShowOk_(it.show, k, k)) shows.push(k); }
        else if (personaShowOk_(showsCell, k, k)) shows.push(k);
      }
    } catch (eS) {}
    for (var j = 0; j < shows.length; j++) {
      for (var e = it.from; e <= it.to; e++) set[shows[j] + ':' + e] = true;
    }
  }
  return set;
}

/** نامِ نمایشیِ یک برنامه از کلیدش؛ ناشناخته، خودِ کلید. */
function personaShowName_(key) {
  try {
    var L = knownShows_() || [];
    for (var i = 0; i < L.length; i++) {
      if (String(L[i].key) === String(key)) return String(L[i].name || key);
    }
  } catch (e) {}
  return String(key || '');
}

/**
 * شمارهٔ قسمتی که این برنامه **بعداً** می‌سازد — و شمارهٔ در جریان.
 *
 * هر دو برنامه شمارنده‌ای در `props_()` دارند که پس از ساختِ هر قسمت
 * جلو می‌رود، و شمارهٔ قسمتِ تازه `شمارنده + ۱` است. پس:
 *   • `cur`  = آخرین شماره‌ای که ساخته شده (یا همین حالا در جریان است)
 *   • `next` = شمارهٔ قسمتِ بعدی
 *
 * هیچ فهرستی از برنامه‌ها اینجا نیست — کلید را `knownShows_` می‌دهد و
 * برنامهٔ ناشناخته `0` می‌گیرد، یعنی «نمی‌دانم»، که هیچ‌چیز را رد نمی‌کند.
 * همان قاعدهٔ `calGate_`: نبودِ فهرست یعنی برنامهٔ بعدی بی تغییرِ کد می‌آید.
 */
function personaEpCursor_(show) {
  var out = { cur: 0, next: 0, known: false };
  var key = '';
  try {
    var n = function (s) { return String(s == null ? '' : s).trim(); };
    var L = knownShows_() || [];
    for (var i = 0; i < L.length; i++) {
      if (n(L[i].key) === n(show) || n(L[i].name) === n(show)) { key = n(L[i].key); break; }
    }
  } catch (eK) {}
  if (!key) key = String(show || '').trim();
  var prop = '';
  if (key === ENRICH_SHOW_SPECIAL) prop = PK.SP_EP_NUM;
  else if (key === ENRICH_SHOW_VARIETY) prop = PK.EP_NUM;
  if (!prop) return out;
  try {
    var v = parseInt(props_().getProperty(prop) || '0', 10);
    if (!isFinite(v) || v < 0) return out;
    out.cur = v; out.next = v + 1; out.known = true;
  } catch (e) {}
  return out;
}

/**
 * ══ شماره‌ای که دیگر نمی‌آید، تنظیم نیست — سکوت است (۷٫۵۸) ══
 *
 * صاحبِ برنامه «درس نامه 18» را نوشت و پرسید «کی تولید می‌کنه؟». جواب
 * **هرگز** بود: پنجاه قسمتِ درس‌نامه ساخته شده و ۱۸ ماه‌ها پیش گذشته.
 * خط درست خوانده می‌شد، نامِ برنامه درست می‌خورد، ذخیره هم می‌شد — و
 * هیچ‌وقت هیچ قسمتی نمی‌گرفت.
 *
 * این دقیقاً همان چیزی است که `personaOnceParse_` دربارهٔ خطِ ناخوانا
 * می‌گوید: «خطی که خوانده نشود یعنی قسمتی که او خواسته و بی‌صدا نخواهد
 * گرفت، و او هرگز نمی‌فهمد». خطِ **خوانا ولی گذشته** همان نتیجه را
 * می‌دهد و تا امروز هیچ دری جلویش نبود — یک لایه پایین‌تر از دری که
 * ۷٫۴۱ ساخت.
 *
 * مرز، عمداً `cur` است و نه `next`: قسمتی که همین حالا در جریان است
 * شماره‌اش برابرِ شمارنده است، و رد کردنش یعنی «همین قسمتی که دارد
 * ساخته می‌شود» نشدنی شود. و «نمی‌دانم» (شمارندهٔ ناخوانا یا برنامهٔ
 * ناشناخته) هیچ‌چیز را رد نمی‌کند — شکِ سنجنده در را نمی‌بندد، همان
 * قاعدهٔ ۷٫۵۷ یک بخش آن‌طرف‌تر.
 */
function personaOncePast_(items, showsCell) {
  var out = { past: [], live: 0, next: {}, any: false };
  var list = items || [];
  var cur = function (sh) {
    var c = personaEpCursor_(sh);
    if (c.known) out.next[sh] = c.next;
    return c;
  };
  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    /* ورودیِ بی‌نام به هر برنامه‌ای می‌خورَد که ردیف اجازه بدهد، پس فقط
       وقتی گذشته است که برای **همهٔ** آن برنامه‌ها گذشته باشد. */
    var shows = [];
    try {
      var L = knownShows_() || [];
      for (var s = 0; s < L.length; s++) {
        var k = String(L[s].key);
        if (it.show) { if (personaShowOk_(it.show, k, k)) shows.push(k); }
        else if (personaShowOk_(showsCell, k, k)) shows.push(k);
      }
    } catch (eS) {}
    if (!shows.length) { out.live++; continue; }   // نمی‌دانیم کجا — رد نمی‌کنیم
    var allPast = true, anyKnown = false;
    for (var j = 0; j < shows.length; j++) {
      var c = cur(shows[j]);
      if (!c.known) { allPast = false; continue; }
      anyKnown = true;
      if (it.to >= c.cur) allPast = false;
    }
    if (anyKnown && allPast) {
      out.past.push({ show: it.show || shows.join('، '), from: it.from, to: it.to });
    } else out.live++;
  }
  out.any = out.past.length > 0;
  return out;
}

/**
 * این قسمت در «قسمت‌های موردی» نام برده شده؟
 *
 * دو قاعده و بس:
 *   • ورودیِ **نام‌دار** فقط به همان برنامه می‌خورَد — نام بردنِ برنامه
 *     صریح‌تر از دامنهٔ پیش‌فرضِ ردیف است.
 *   • ورودیِ **بی‌نام** هر برنامه‌ای را می‌گیرد که «برنامه‌ها»ی ردیف
 *     اجازه بدهد.
 *
 * و شمارهٔ نامعلوم **هرگز** نمی‌خورَد: وگرنه هر قسمتی که شماره‌اش خوانده
 * نشده، صدای مهمان می‌گرفت — درست برعکسِ «موردی».
 */
function personaOnceHit_(cell, showsCell, show, key, epNum) {
  var e = Math.floor(Number(epNum) || 0);
  if (!(e > 0)) return false;
  var p = personaOnceParse_(cell);
  for (var i = 0; i < p.items.length; i++) {
    var it = p.items[i];
    if (e < it.from || e > it.to) continue;
    if (it.show) {
      if (personaShowOk_(it.show, show, key)) return true;
      continue;
    }
    if (personaShowOk_(showsCell, show, key)) return true;
  }
  return false;
}

/**
 * حالت‌های یک صدا، از سلولِ «حالت‌ها».
 *
 * هر خط:  نام | کلیدواژه‌ها با کاما | دستور
 * خطِ ناقص کنار گذاشته می‌شود، نه اینکه کلِ سلول را باطل کند — یک
 * غلطِ تایپی در حالتِ سوم نباید حالتِ اول را هم از بین ببرد.
 */
function personaModes_(cell) {
  var out = [];
  var lines = String(cell == null ? '' : cell).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (!t) continue;
    var p = t.split('|');
    if (p.length < 3) continue;
    var name = p[0].trim();
    var cue = p.slice(2).join('|').trim();
    if (!name || !cue) continue;
    var keys = [];
    var ks = p[1].split(/[،,]/);
    for (var j = 0; j < ks.length; j++) {
      var k = ks[j].trim();
      if (k) keys.push(k);
    }
    out.push({ name: name, keys: keys, cue: cue });
  }
  return out;
}

/**
 * کدام حالت به این بخش می‌خورَد.
 *
 * ورودی `tone` همان چیزی است که نویسندهٔ قسمت برای هر بخش نوشته — یعنی
 * وایبِ همان بخش، که خواستهٔ صریحِ صاحبِ برنامه بود. اگر هیچ کلیدواژه‌ای
 * نخورد، **هیچ حالتی انتخاب نمی‌شود** و دستورِ پایه اجرا می‌شود؛ حالتِ
 * تصادفی بدتر از نبودِ حالت است.
 */
function personaModePick_(modes, tone) {
  var t = String(tone || '');
  if (!t || !modes || !modes.length) return null;
  var best = null, bestN = 0;
  for (var i = 0; i < modes.length; i++) {
    var n = 0;
    for (var j = 0; j < modes[i].keys.length; j++) {
      if (t.indexOf(modes[i].keys[j]) !== -1) n++;
    }
    if (n > bestN) { bestN = n; best = modes[i]; }
  }
  return best;
}

/**
 * صدای این قسمت — یا هیچ.
 *
 * ══ چرا باز شکست می‌خورد (fail open) ══
 * خواندنِ یک شیت نباید قسمت را بکشد. اگر جدول خوانده نشود، قسمت با
 * خوانشِ عادیِ خودش ساخته می‌شود و خطا در سیاهه می‌نشیند — همان قاعدهٔ
 * `calGate_`. یک قسمتِ عادی از یک قسمتِ نساخته بهتر است.
 *
 * ══ و چرا تصمیم در همان ردیف نوشته می‌شود ══
 * «آخرین تصمیم» تنها جوابِ صادق به «تنظیمِ من واقعاً اثر کرد؟» است.
 * نبودِ تصمیم برای امروز یعنی این کد اصلاً اجرا نشده، که خبرِ دیگری
 * است — و بدتر.
 */
function personaFor_(show, epNum) {
  if (CFG.PERSONA_ENABLED === false) return null;
  var sh, rows;
  try {
    sh = personaTab_();
    rows = personaRows_(sh);
  } catch (e) {
    logLine_('جدولِ صداها خوانده نشد؛ قسمت با خوانشِ عادی ادامه یافت: '
             + e.message);
    return null;
  }
  var picked = null, pickedRow = 0, notes = [], pickedWhy = '';

  /* ══ دو پیمایش، و «موردی» اول (۷٫۴۱) ══
     «موردی» دربارهٔ **همین یک قسمت** است و «دائم» دربارهٔ همه؛ مشخص‌تر
     برنده است. یعنی «معمولاً صدای عادی، ولی این قسمت را با صدای او» —
     که عیناً همان چیزی است که خواسته شد.

     و «موردی» از «فعال» و «هر چند قسمت» رد می‌شود، وگرنه «موردی» چیزی
     جز همان «دوره‌ای» نبود: برای یک قسمت مجبور بودی ردیف را روشن کنی،
     که یعنی دائمی‌اش کنی. دقیقاً کاری که نمی‌خواست. */
  var pass, i, v, key, name, rowNo, cue;
  for (pass = 0; pass < 2 && !picked; pass++) {
    for (i = 0; i < rows.length; i++) {
      v = rows[i];
      key = String(v[PC.KEY - 1] || '').trim();
      if (!key) continue;
      name = String(v[PC.NAME - 1] || '').trim() || key;
      rowNo = i + 2;                         // ردیفِ ۱ سرصفحه است
      var once = false;
      try {
        once = personaOnceHit_(v[PC.ONCE - 1], v[PC.SHOWS - 1], show, key, epNum);
      } catch (eO) { once = false; }

      if (pass === 0) {
        if (!once) continue;                 // پیمایشِ موردی: فقط نام‌بردگان
      } else {
        if (once) continue;                  // در پیمایشِ اول دیده شد
        if (!personaOn_(v[PC.ON - 1])) { notes.push([rowNo, 'خاموش']); continue; }
        if (!personaShowOk_(v[PC.SHOWS - 1], show, show)) {
          notes.push([rowNo, 'برای این برنامه نیست']); continue;
        }
        if (!personaTurn_(v[PC.EVERY - 1], epNum)) {
          notes.push([rowNo, 'نوبتش نیست (هر ' +
                      (Math.floor(Number(v[PC.EVERY - 1])) || 1) + ' قسمت)']);
          continue;
        }
      }

      cue = String(v[PC.STYLE - 1] || '').trim();
      if (!cue) {
        /* ردیفی که بی‌صدا کنار گذاشته شود، کسی را منتظرِ چیزی می‌گذارد
           که نمی‌آید — و در حالتِ موردی بدتر، چون او **این** قسمت را
           خواسته بود. پس دلیلش در همان ردیف نوشته می‌شود. */
        notes.push([rowNo, once
          ? 'قسمتِ موردی بود ولی دستورِ سبک خالی است'
          : 'دستورِ سبک خالی است']);
        continue;
      }
      if (!picked) {
        picked = { key: key, name: name, cue: cue, once: once,
                   modes: personaModes_(v[PC.MODES - 1]) };
        pickedRow = rowNo;
        pickedWhy = once ? 'انتخاب شد (موردی)' : 'انتخاب شد';
      } else {
        notes.push([rowNo, once
          ? 'صدای دیگری زودتر برای همین قسمت انتخاب شد'
          : 'صدای دیگری زودتر انتخاب شد']);
      }
    }
  }
  // تصمیمِ هر ردیف در خودِ ردیف — چه انتخاب شده باشد چه نه.
  try {
    var stamp = (typeof calToday_ === 'function') ? calToday_().fa : '';
    for (var n = 0; n < notes.length; n++) {
      sh.getRange(notes[n][0], PC.LAST).setValue(stamp + ' — ' + notes[n][1]);
    }
    if (pickedRow) {
      sh.getRange(pickedRow, PC.LAST).setValue(stamp + ' — ' + pickedWhy);
      sh.getRange(pickedRow, PC.USED).setValue(
        stamp + ' — ' + String(show || '') + ' ' + String(epNum || ''));
    }
  } catch (eW) {}
  if (picked) {
    logLine_('صدای مهمانِ این قسمت: ' + picked.name +
             (picked.once ? ' — موردی، برای همین قسمت' : '') +
             ' (' + picked.modes.length + ' حالت)');
  }
  return picked;
}

/**
 * دستورِ سبکِ این بخش — پایه، به‌علاوهٔ حالتی که به وایبِ بخش می‌خورَد.
 *
 * ══ چرا اول می‌آید و نه آخر ══
 * `ttsCue_` کلِ دستور را سرِ ۳۲۰ نویسه می‌بُرد. هرچه آخر باشد اول قربانی
 * می‌شود — و اگر شخصیتِ خواندن آخر بنشیند، در بلندترین بخش‌ها بی‌صدا
 * حذف می‌شود و کسی نمی‌فهمد چرا آن قسمت «رضوی‌جور» نبود.
 */
function personaStyle_(p, tone) {
  if (!p) return '';
  var m = personaModePick_(p.modes, tone);
  var s = String(p.cue || '').trim();
  if (m && m.cue) s += (s ? ' ' : '') + String(m.cue).trim();
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * ردیفِ یک صدای تازه — با شواهدِ اندازه‌گیری‌شده، و **خاموش**.
 *
 * عددهای درونِ متن از آزمایشگاهِ صدا می‌آیند: ۶۰ دقیقه از چهار ضبطِ
 * بهروز رضوی، ۱۰۹ بند، دو حالت که خودِ صاحبِ برنامه با گوش تأییدشان
 * کرد («۱ بریده‌بریده و پرتوقف، ۲ روان‌تر و کشیده‌تر»).
 */
function personaSeed_() {
  var sh = personaTab_();
  var rows = personaRows_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][PC.KEY - 1] || '').trim() === 'razavi') return false;
  }
  sh.appendRow([
    'razavi', 'بهروز رضوی', 'خیر', 'همه', 3,
    'آرام و روایی بخوان: حدودِ ۶۰ درصدِ زمان حرف بزن و بقیه را سکوت. هر ' +
    'عبارت حدودِ ۱٫۷ ثانیه و بعد مکث؛ در دلِ جمله ۰٫۳ ثانیه، میانِ دو ' +
    'جمله ۰٫۷، و پیش از جملهٔ کلیدی ۱٫۳ ثانیه سکوت. تأکید را با مکث و ' +
    'کشش بساز، نه با بلند کردنِ صدا.',
    'بریده‌بریده و باطمأنینه | سوگ, معنوی, مذهبی, تعلیق, هشدار | ' +
    'جمله‌ها را کوتاه بشکن و بایست؛ حدودِ ۲۳ مکث در دقیقه.\n' +
    'روان و کشیده | روایت, تاریخی, داستان, فرهنگی, مستند | ' +
    'بلندتر یک‌نفس برو و کمتر بایست (حدودِ ۱۵ مکث در دقیقه)؛ ' +
    'گاهی یک عبارت را بیشتر بکش.',
    '', '']);
  return true;
}

/**
 * تختهٔ «شیوهٔ خواندن» — خواندنِ همان تب، نه یک مدلِ دادهٔ دوم.
 *
 * ══ چرا این ساخته شد (۷٫۳۵) ══
 * صاحبِ برنامه ۲۰ سپتامبر پرسید: «**انتخاب صدای گوینده برای پادکست رو در
 * منو کدوم گزینه میشه انتخاب کرد؟**» جوابِ درست آن روز این بود: **هیچ
 * گزینه‌ای**. تبی هست که باید با دست ویرایش شود — و او شیت باز نمی‌کند.
 * برای «تقویمِ تولید» همین درس در ۵٫۶۱ گرفته شده بود («کنترلی که جای کارش
 * نباشد پیدا نمی‌شود») و اینجا به کار نرفت.
 *
 * ══ مرزی که از ۵٫۶۱ عیناً تکرار می‌شود ══
 * این تخته فقط همان **تب و همان ستون‌ها**یی را می‌خوانَد و می‌نویسد که
 * `personaFor_` می‌خوانَد. مدلِ داده دست نخورد، پس آزمونِ آن تابع همچنان
 * نگهبانش است و پنجره‌ای که بشکند نمی‌تواند تولید را بشکند.
 *
 * ══ و «آخرین تصمیم» عمداً خواندنی است ══
 * آن ستون را موتور می‌نویسد و تنها جوابِ صادق به «تنظیمِ من واقعاً اثر
 * کرد؟» است. اگر تخته اجازهٔ ویرایشش را بدهد، همان آینه‌ای که قرار بود
 * حقیقت را نشان دهد، دستکاری‌شدنی می‌شود.
 */
function personaBoardData_() {
  var out = { enabled: CFG.PERSONA_ENABLED !== false, shows: [], rows: [],
              nextEp: [], eps: [], note: '' };
  try {
    var L = knownShows_();
    for (var i = 0; i < L.length; i++) {
      out.shows.push(L[i].name);
      /* شمارهٔ قسمتِ بعدیِ هر برنامه، برای راهنمای «قسمت‌های موردی» (۷٫۵۸).
         ناخوانا یعنی چیزی نشان نده — عددِ حدسی بدتر از نبودنش است. */
      try {
        var c = personaEpCursor_(L[i].key);
        if (c.known) out.nextEp.push(String(L[i].name) + ' ' + faDigitsOut_(String(c.next)));
      } catch (eC) {}
    }
    /* فهرستِ قسمت‌های تولیدشده، **یکی برای هر برنامه** — خواستهٔ صریح.
       نقشهٔ پوشه‌ها یک بار خوانده می‌شود و به هر دو داده می‌شود. */
    var fmap = personaFolderMap_();
    for (var g = 0; g < L.length; g++) {
      var lst = personaEpisodesFor_(L[g].key, 0, fmap);
      if (!lst.total && !lst.error) continue;
      out.eps.push({ key: String(L[g].key), name: String(L[g].name),
                     total: faDigitsOut_(String(lst.total)),
                     shown: faDigitsOut_(String(lst.shown)),
                     noFolder: lst.noFolder ? faDigitsOut_(String(lst.noFolder)) : '',
                     items: lst.items.map(function (x) {
                       return { ep: x.ep, epFa: faDigitsOut_(String(x.ep)),
                                title: x.title, at: x.at, can: !!x.can, on: false };
                     }) });
    }
  } catch (eS) {}
  var sh;
  try { sh = personaTab_(); } catch (e) { out.note = 'تبِ صداها خوانده نشد: ' + e.message; return out; }
  var rows;
  try { rows = personaRows_(sh); } catch (e2) { out.note = e2.message; return out; }
  for (var r = 0; r < rows.length; r++) {
    var v = rows[r];
    var key = String(v[PC.KEY - 1] || '').trim();
    if (!key) continue;
    out.rows.push({
      key: key,
      name: String(v[PC.NAME - 1] || '').trim() || key,
      on: personaOn_(v[PC.ON - 1]),
      shows: String(v[PC.SHOWS - 1] == null ? '' : v[PC.SHOWS - 1]).trim() || 'همه',
      every: Math.max(1, Math.floor(Number(v[PC.EVERY - 1]) || 1)),
      cue: String(v[PC.STYLE - 1] == null ? '' : v[PC.STYLE - 1]),
      modes: String(v[PC.MODES - 1] == null ? '' : v[PC.MODES - 1]),
      once: String(v[PC.ONCE - 1] == null ? '' : v[PC.ONCE - 1]),
      /* تیک‌ها **به ازای هر گوینده**‌اند، ولی فهرست یکی است و میانِ همه
         مشترک. پس هر ردیف مجموعهٔ خودش را با خود می‌بَرد، وگرنه تیکِ یک
         گوینده روی فهرستِ همه دیده می‌شد. */
      pickSet: (function () {
        try {
          var st = personaPickSet_(v[PC.PICK - 1], v[PC.SHOWS - 1]), a = [];
          for (var q in st) if (Object.prototype.hasOwnProperty.call(st, q)) a.push(q);
          return a;
        } catch (eP) { return []; }
      })(),
      last: String(v[PC.LAST - 1] == null ? '' : v[PC.LAST - 1]),
      used: String(v[PC.USED - 1] == null ? '' : v[PC.USED - 1]),
      row: r + 2
    });
  }
  /* ══ ترتیب یک واقعیتِ رفتاری است، نه آرایش ══
     `personaFor_` **اولین** ردیفِ واجد شرایط را برمی‌دارد و بقیه را
     «صدای دیگری زودتر انتخاب شد» می‌زند. اگر تخته این را نگوید، کسی که
     دو ردیف را روشن می‌کند منتظرِ چیزی می‌مانَد که هرگز نمی‌آید. */
  var onCount = 0;
  for (var j = 0; j < out.rows.length; j++) if (out.rows[j].on) onCount++;
  if (onCount > 1) {
    out.note = 'بیش از یک ردیف روشن است. هر قسمت فقط **یک** صدای مهمان ' +
               'می‌گیرد و بالاترین ردیفِ واجدِ شرایط برنده می‌شود.';
  }
  return out;
}

/**
 * ذخیرهٔ یک ردیف — در همان سلول‌هایی که `personaFor_` می‌خوانَد.
 *
 * «روشن ولی هیچ برنامه‌ای» به خاموش تبدیل نمی‌شود، بلکه **رد** می‌شود:
 * در تقویم «همه‌روز» معنای طبیعی داشت، اینجا فهرستِ خالی یعنی «نمی‌دانم
 * کجا» و حدسش هر دو جهت غلط است. و دستورِ خالی با ردیفِ روشن هم رد
 * می‌شود، چون `personaFor_` آن ردیف را بی‌صدا کنار می‌گذارد و آدم فکر
 * می‌کند روشنش کرده.
 */
function personaBoardSave_(key, on, shows, every, cue, modes, once, picks) {
  var sh = personaTab_();
  var rows = personaRows_(sh);
  var at = -1;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][PC.KEY - 1] || '').trim() === String(key || '').trim()) { at = i + 2; break; }
  }
  if (at < 0) return { ok: false, why: 'ردیفی با کلیدِ «' + key + '» نیست.' };

  var list = [];
  for (var j = 0; j < (shows || []).length; j++) {
    var t = String(shows[j] || '').trim();
    if (t) list.push(t);
  }
  var cell = (!list.length || list.length >= ((knownShows_() || []).length || 1))
             ? 'همه' : list.join('، ');
  var cueT = String(cue == null ? '' : cue).trim();

  if (on && !list.length) {
    return { ok: false, why: 'روشن است ولی هیچ برنامه‌ای تیک نخورده. ' +
             'اگر برای همه است، همه را تیک بزنید.' };
  }
  if (on && !cueT) {
    return { ok: false, why: 'روشن است ولی «دستورِ سبک» خالی است — ' +
             'موتور چنین ردیفی را بی‌صدا کنار می‌گذارد.' };
  }
  /* درِ سوم، از همان جنسِ دو تای بالا (۷٫۳۵): قسمتِ موردی نوشته شده ولی
     دستورِ سبک خالی است. پذیرفتنش یعنی او باور کند برای آن قسمت تنظیم
     کرده، و آن قسمت با خوانشِ عادی ساخته شود. */
  if (String(once == null ? '' : once).trim() && !cueT) {
    return { ok: false, why: 'برای «قسمت‌های موردی» چیزی نوشته‌اید ولی ' +
             '«دستورِ سبک» خالی است — موتور چنین ردیفی را کنار می‌گذارد، ' +
             'پس آن قسمت‌ها با خوانشِ عادی ساخته می‌شوند.' };
  }
  var n = Math.floor(Number(every) || 1);
  if (!(n >= 1)) n = 1;

  /* ══ خطِ ناخوانا ذخیره نمی‌شود، و دلیلش گفته می‌شود (۷٫۴۱) ══
     `personaModes_` خطِ ناقص را بی‌صدا کنار می‌گذارد و آنجا درست است —
     یک حالتِ کمتر یعنی افتِ کیفیت. اینجا برعکس: خطی که خوانده نشود
     یعنی **قسمتی که او خواسته و نخواهد گرفت**، و هیچ‌جا نمی‌فهمد.
     پس ذخیره رد می‌شود و خودِ آن خط نام برده می‌شود. */
  var onceT = String(once == null ? '' : once).trim();
  var op = personaOnceParse_(onceT);
  if (op.bad.length) {
    return { ok: false, why: 'این خط از «قسمت‌های موردی» خوانده نشد: «' +
             op.bad[0] + '». شمارهٔ قسمت لازم است — مثلِ ۴۷ یا ۴۷ تا ۵۰ ' +
             'یا درس‌نامه ۴۷.' };
  }
  /* ══ و درِ چهارم: شماره‌ای که دیگر نمی‌آید (۷٫۵۸) ══
     خطِ خوانا که همه‌اش گذشته باشد، همان نتیجهٔ خطِ ناخوانا را دارد —
     ذخیره می‌شود، درست به نظر می‌رسد، و هیچ قسمتی نمی‌گیرد. پس مثلِ آن
     رد می‌شود، و **شمارهٔ قسمتِ بعدی گفته می‌شود**؛ رد کردن بدونِ گفتنِ
     عددِ درست یعنی او باید حدس بزند. */
  var pastChk = personaOncePast_(op.items, cell);
  if (pastChk.any && !pastChk.live) {
    var pz = pastChk.past[0];
    var nx = [];
    for (var nk in pastChk.next) {
      if (!Object.prototype.hasOwnProperty.call(pastChk.next, nk)) continue;
      nx.push(personaShowName_(nk) + ' ' + faDigitsOut_(String(pastChk.next[nk])));
    }
    return { ok: false, why: 'قسمت ' + faDigitsOut_(String(pz.from)) +
             (pz.to !== pz.from ? ' تا ' + faDigitsOut_(String(pz.to)) : '') +
             ' گذشته است و دیگر ساخته نمی‌شود، پس این تنظیم هیچ‌وقت اثر ' +
             'نمی‌کرد.' + (nx.length ? ' قسمتِ بعدی: ' + nx.join(' · ') + '.' : '') };
  }

  /* ══ تیک‌های قسمت‌های تولیدشده — ستونِ جدا، عمداً (۷٫۵۹) ══
     دروازهٔ «شمارهٔ گذشته» (۷٫۵۸) اینجا **اعمال نمی‌شود** و نباید بشود:
     تمامِ معنای این ستون گذشته است. یک ستون برای هر دو کار یعنی «۱۸»
     گاهی «تبدیلش کن» باشد و گاهی «وقتی ساختی…»، و هیچ‌کس نتواند بگوید
     کدام. */
  var pickT = '';
  try { pickT = personaPickText_(picks || []); } catch (ePk) { pickT = ''; }
  /* `undefined` یعنی «تخته این را نفرستاد» (نسخهٔ کهنهٔ پنجره یا فراخوانِ
     دیگری) و باید سلولِ موجود **دست‌نخورده** بماند؛ آرایهٔ خالی یعنی «هیچ
     تیکی نیست» و باید پاک کند. یکی گرفتنشان یعنی هر ذخیره‌ای از هر جای
     دیگر، انتخاب‌های او را بی‌صدا پاک می‌کند. */
  var touchPick = (picks !== undefined && picks !== null);

  sh.getRange(at, PC.ON).setValue(on ? 'بله' : 'خیر');
  sh.getRange(at, PC.SHOWS).setValue(cell);
  sh.getRange(at, PC.EVERY).setValue(n);
  sh.getRange(at, PC.STYLE).setValue(cueT);
  sh.getRange(at, PC.MODES).setValue(String(modes == null ? '' : modes).trim());
  sh.getRange(at, PC.ONCE).setValue(onceT);
  if (touchPick) sh.getRange(at, PC.PICK).setValue(pickT);
  return { ok: true, key: String(key), on: !!on, shows: cell, every: n,
           once: onceT, onceCount: op.items.length,
           picks: touchPick ? pickT : String(rows[at - 2][PC.PICK - 1] || ''),
           pickCount: touchPick ? (pickT ? pickT.split('، ').length : 0) : -1 };
}

/**
 * ردیفِ یک گویندهٔ تازه، از کارتِ سبکِ اندازه‌گیری‌شده‌اش — و **خاموش**.
 *
 * ══ چرا این تابع لازم شد (۷٫۳۴) ══
 * صاحبِ برنامه در ۲۰ سپتامبر نوشت: «اگر بخوام گویندهٔ جدیدی اضافه کنم که
 * صداش رو و **روح و رنگش** رو کلون کنی این رو انجام بدی و اضافه کنی؟» و
 * جواب گرفت «بله». ولی تا امروز فقط **رنگ** کلون می‌شد: ابزارِ
 * اندازه‌گیریِ روح (`voicelab.py --engine style`) ساخته شده بود، آزمون
 * داشت، برای رضوی **با دست** اجرا شده بود — و در `voice-intake.yml`
 * صفر بار صدا زده می‌شد. یعنی برای هر گویندهٔ تازه، نیمی از خواستهٔ او
 * بی‌صدا انجام نمی‌شد.
 *
 * این هفتمین نمونهٔ همان شکل در این مخزن است: تحلیلی که نوشته شد، تست
 * خورد، و به تصمیم وصل نشد.
 *
 * ══ و چرا **خاموش** ══
 * `personaSeed_` هم همین کار را می‌کند و دلیلش آنجا نوشته شده: ردیفِ
 * روشن یعنی همان شبی که کد نصب شد، خوانشِ هر قسمت عوض می‌شود بی آنکه
 * کسی خواسته باشد. ردیف ساخته می‌شود، خبرش داده می‌شود، و روشن کردنش
 * با اوست.
 *
 * ══ و چرا هرگز ردیفِ موجود را بازنویسی نمی‌کند ══
 * ستونِ «دستورِ سبک» جایی است که او با دست تنظیمش می‌کند («تنها کسی که
 * می‌تواند بگوید این خوب درنیامد صاحبِ برنامه است»). یک دورِ تازهٔ
 * اندازه‌گیری که روی ویرایشِ او بنویسد، همان اسکنِ موسیقی است که سلیقهٔ
 * کیوریتور را پاک می‌کرد.
 */
function personaAddFromCard_(key, name, card) {
  if (!key || !card || !String(card.cue || '').trim()) return false;
  var sh = personaTab_();
  var rows = personaRows_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][PC.KEY - 1] || '').trim() === String(key)) return false;
  }
  sh.appendRow([String(key), String(name || key), 'خیر', 'همه', 3,
                String(card.cue || ''), String(card.modes || ''), '', '']);
  return true;
}

/**
 * هر گوینده‌ای که کارتِ سبک دارد و ردیف ندارد، ردیفش ساخته شود.
 *
 * از بخشِ ۳۳ صدا زده می‌شود، چون آن‌جاست که `docs/voices.json` خوانده
 * می‌شود. برمی‌گردانَد چند ردیف ساخته شد، تا گزارشِ روزانه بتواند
 * بگوید — اعلامی که کسی نبیند، اعلام نیست.
 */
function personaSyncCards_(state) {
  var made = [];
  if (!state) return made;
  for (var k in state) {
    if (!Object.prototype.hasOwnProperty.call(state, k)) continue;
    var sp = state[k] || {};
    var card = sp.style || null;
    if (!card || !String(card.cue || '').trim()) continue;
    try {
      if (personaAddFromCard_(k, sp.name || k, card)) made.push(sp.name || k);
    } catch (e) {
      try { logLine_('ردیفِ سبکِ «' + k + '» ساخته نشد: ' + e.message); } catch (e2) {}
    }
  }
  return made;
}

/**
 * تصمیمِ صدا **یک بار** گرفته می‌شود و در پروندهٔ قسمت می‌مانَد.
 *
 * ══ چرا، و این درس از کجا آمد ══
 * `renderAudioStep_` با هر از سرگیری `buildChunks_` را دوباره می‌سازد.
 * اگر انتخابِ صدا هر بار از شیت خوانده شود، ویرایشِ صاحبِ برنامه وسطِ
 * ساختِ یک قسمت، نیمهٔ دومِ همان قسمت را با دستورِ دیگری می‌خوانَد —
 * بی هیچ خطایی، فقط شنیدنی. `musicWrap_` دقیقاً همین را داشت.
 *
 * `null` هم یک تصمیم است و ذخیره می‌شود: «امروز صدای مهمانی نبود».
 */
function personaEnsure_(ep, show, epNum) {
  if (!ep) return null;
  if (typeof ep.__persona !== 'undefined') return ep.__persona;
  var p = null;
  try {
    p = personaFor_(show, epNum);
  } catch (e) {
    logLine_('انتخابِ صدای مهمان انجام نشد: ' + e.message);
    p = null;
  }
  ep.__persona = p || null;
  return ep.__persona;
}

/**
 * دستورِ شخصیت را جلوی دستورِ هر بخش بگذار.
 *
 * جلو، نه پشت: `ttsCue_` سرِ ۳۲۰ نویسه می‌بُرد و هرچه آخر باشد اول
 * قربانی می‌شود. و `hook` و `outro` هم می‌گیرندش — قابِ رادیوییِ قسمت
 * هم بخشی از خوانش است، نه استثنای آن.
 */
function personaApply_(segs, p) {
  if (!p || !segs || !segs.length) return 0;
  var n = 0;
  for (var i = 0; i < segs.length; i++) {
    var add = personaStyle_(p, segs[i].tone);
    if (!add) continue;
    segs[i].style = add + ' ' + String(segs[i].style || '');
    n++;
  }
  return n;
}


/* ══════════════════════════════════════════════════════════════════════
   پنجرهٔ «شیوهٔ خواندنِ گویندگان»

   ══ چرا اینجا و نه در منوی متن ══
   یک تب با نُه ستون که باید با دست ویرایش شود، برای کسی که شیت باز
   نمی‌کند یعنی «نیست». همان درسِ ۵٫۶۱.

   ══ و چرا دکمه‌ها همه تابعِ موجود صدا می‌زنند ══
   `google.script.run.X()` روی `X`ی که وجود ندارد **هیچ خطایی نمی‌دهد** و
   هیچ آزمونی نمی‌شکند؛ دکمه فقط کاری نمی‌کند. `run_wiring_test.js` ۵٫۲
   همین را می‌گیرد، و این پنجره هم از همان در می‌گذرد.
   ══════════════════════════════════════════════════════════════════════ */

/** بی‌زیرخط، چون از HTML صدا زده می‌شود. */
function personaBoardData() {
  try { return personaBoardData_(); }
  catch (e) { return { enabled: false, shows: [], rows: [], note: 'خطا: ' + e.message }; }
}

/** بی‌زیرخط، چون از HTML صدا زده می‌شود. */
function personaBoardSave(key, on, shows, every, cue, modes, once, picks) {
  /* ══ آرگومانِ تازه باید **اینجا هم** اضافه شود (۷٫۴۱) ══
     `google.script.run` همین پوشش را صدا می‌زند. پارامترِ جاافتاده هیچ
     خطایی نمی‌دهد: تخته مقدار را می‌فرستد، پوشش دورش می‌ریزد، و دکمه
     بی‌صدا هیچ نمی‌کند — همان خرابی‌ای که ۵٫۲ برایش هست. */
  try { return personaBoardSave_(key, on, shows, every, cue, modes, once, picks); }
  catch (e) { return { ok: false, why: 'خطا: ' + e.message }; }
}

/** منو: «🎚 شیوهٔ خواندنِ گویندگان — انتخاب برای پادکست». */
function showPersonaBoard() {
  var ui = ui_();
  var html = personaBoardHtml_();
  if (!ui) { console.log(html.slice(0, 400)); return html; }
  var out = HtmlService.createHtmlOutput(html).setWidth(1040).setHeight(740);
  ui.showModalDialog(out, 'شیوهٔ خواندنِ گویندگان');
}

/** پنجره. یک کارت به ازای هر ردیف؛ هیچ ستونی که موتور می‌نویسد ویرایش‌پذیر نیست. */
function personaBoardHtml_() {
  var H = [];
  H.push('<!DOCTYPE html><html><head><meta charset="utf-8"><style>');
  H.push('body{font-family:Tahoma,Vazirmatn,sans-serif;direction:rtl;margin:14px;color:#1f2430;background:#fff}');
  H.push('h2{margin:0 0 4px;font-size:17px}');
  H.push('.sub{color:#5b6472;font-size:12px;margin-bottom:10px;line-height:1.7}');
  H.push('.warn{background:#fff6e5;border:1px solid #f0c674;border-radius:8px;padding:8px 10px;margin:8px 0;font-size:12px}');
  H.push('.card{border:1px solid #dfe3ea;border-radius:10px;padding:12px;margin:10px 0;background:#fbfcfe}');
  H.push('.hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}');
  H.push('.nm{font-weight:bold;font-size:15px}');
  H.push('.tag{font-size:11px;color:#5b6472;background:#eef1f6;border-radius:6px;padding:2px 7px}');
  H.push('.grid{display:flex;gap:16px;flex-wrap:wrap;margin:8px 0}');
  H.push('label{font-size:12px;color:#39414f}');
  H.push('textarea{width:100%;box-sizing:border-box;font-family:inherit;font-size:12px;');
  H.push('direction:rtl;border:1px solid #cfd5df;border-radius:7px;padding:7px;line-height:1.7}');
  H.push('input[type=number]{width:60px;padding:3px}');
  H.push('button{background:#2c6bed;color:#fff;border:0;border-radius:7px;padding:7px 15px;cursor:pointer;font-family:inherit}');
  H.push('button:disabled{background:#9db4e6;cursor:default}');
  H.push('.last{font-size:11px;color:#5b6472;margin-top:6px}');
  H.push('.msg{font-size:12px;margin-right:10px}');
  /* فهرست باید **درونِ خودش** بلغزد، وگرنه پنجرهٔ ۵۰ قسمتیْ دکمهٔ ذخیره را
     از دسترس بیرون می‌بَرد و کنترلی که دیده نشود کنترل نیست (۷٫۳۵). */
  H.push('.eps{margin:6px 0;border:1px solid #d7dbe0;border-radius:6px}');
  H.push('.epsh{background:#f2f4f7;padding:5px 8px;font-size:12px;font-weight:bold}');
  H.push('.epl{max-height:150px;overflow:auto;padding:4px 8px}');
  H.push('.ep{display:block;font-size:12px;font-weight:normal;padding:2px 0}');
  H.push('.ep.off{opacity:.55}');
  H.push('.dim{color:#6b7280;font-weight:normal}');
  H.push('.bad{color:#c0392b}.good{color:#1e8449}');
  H.push('</style></head><body>');
  H.push('<h2>شیوهٔ خواندنِ گویندگان</h2>');
  H.push('<div class="sub">هر کارت یک «شخصیتِ خواندن» است: مکث، کشش، ریتم، دامنه. ' +
         '<b>این رنگِ صدا نیست</b> — صدا همان صدای همیشگی می‌مانَد و فقط طرزِ خواندنش عوض می‌شود.<br>' +
         'هر قسمت فقط <b>یک</b> صدای مهمان می‌گیرد: بالاترین کارتِ روشنی که برنامه و نوبتش بخورَد. ' +
         '«آخرین تصمیم» را خودِ موتور می‌نویسد و ویرایش‌پذیر نیست — تنها جوابِ صادق به «تنظیمم اثر کرد؟».</div>');
  H.push('<div id="warn"></div><div id="box">در حالِ خواندن…</div>');
  H.push('<script>');
  H.push('var DATA=null;');
  H.push('function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){');
  /* ══ دو بک‌اسلش، نه یکی (۷٫۴۳) ══
     این رشته تک‌کوتیشن است، پس `\"` در همین‌جا به `"` فرو می‌ریزد و آنچه
     در پنجره می‌نشیند `,""":"&quot;"` می‌شود — یک خطای نحوی که **کلِ**
     بلوکِ <script> را می‌کُشد. آن‌وقت `esc` و `draw` و `save` هیچ‌کدام
     تعریف نمی‌شوند و هر دکمه بی‌صدا هیچ نمی‌کند. */
  H.push('return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}');
  H.push('function draw(d){DATA=d;');
  H.push('document.getElementById("warn").innerHTML = d.note?("<div class=\'warn\'>"+esc(d.note)+"</div>"):"";');
  H.push('if(!d.rows||!d.rows.length){document.getElementById("box").innerHTML=');
  H.push('"<div class=\'warn\'>هنوز هیچ گوینده‌ای کارتِ سبک ندارد. هر نمونه‌ای که در پوشهٔ «voice cloning» بگذارید، کارتش خودکار ساخته می‌شود و اینجا ظاهر می‌شود.</div>";return;}');
  H.push('var H=[];for(var i=0;i<d.rows.length;i++){var r=d.rows[i];');
  H.push('H.push("<div class=\'card\' id=\'c"+i+"\'>");');
  H.push('H.push("<div class=\'hd\'><span class=\'nm\'>"+esc(r.name)+"</span>");');
  H.push('H.push("<span class=\'tag\'>"+esc(r.key)+"</span>");');
  H.push('H.push("<label><input type=\'checkbox\' id=\'on"+i+"\' "+(r.on?"checked":"")+"> روشن</label>");');
  H.push('H.push("<label>هر <input type=\'number\' min=\'1\' id=\'ev"+i+"\' value=\'"+r.every+"\'> قسمت یک بار</label>");');
  H.push('H.push("</div><div class=\'grid\'>");');
  H.push('for(var j=0;j<d.shows.length;j++){var on=(r.shows==="همه")||(r.shows.indexOf(d.shows[j])!==-1);');
  H.push('H.push("<label><input type=\'checkbox\' class=\'sh"+i+"\' value=\'"+esc(d.shows[j])+"\' "+(on?"checked":"")+"> "+esc(d.shows[j])+"</label>");}');
  H.push('H.push("</div>");');
  H.push('H.push("<label>دستورِ سبک</label><textarea id=\'cu"+i+"\' rows=\'4\'>"+esc(r.cue)+"</textarea>");');
  H.push('H.push("<label>حالت‌ها — هر خط: <code>نام | وایب‌ها با کاما | دستور</code>. وایبِ خالی یعنی این حالت هرگز انتخاب نمی‌شود.</label>");');
  H.push('H.push("<textarea id=\'mo"+i+"\' rows=\'4\'>"+esc(r.modes)+"</textarea>");');
  /* ══ «موردی» همین‌جا، نه در منویی دیگر (۵٫۶۱ و ۷٫۳۵) ══
     کنترلی که جایی جز کنارِ کاری که کنترل می‌کند بنشیند، پیدا نمی‌شود. */
  H.push('H.push("<label>قسمت‌های موردی — فقط همین قسمت‌ها، حتی اگر ردیف خاموش باشد.<br>");');
  H.push('H.push("مثال: <code>۴۷</code> · <code>۴۷ تا ۵۰</code> · <code>درس‌نامه ۴۷</code>. رقمِ فارسی و لاتین هر دو.");');
  /* ══ شمارهٔ قسمتِ بعدی، همین‌جا (۷٫۵۸) ══
     او «درس‌نامه ۱۸» نوشت و پرسید «کی تولید می‌کنه؟» — هجده ماه‌ها پیش
     گذشته بود. ذخیره حالا چنین خطی را رد می‌کند، ولی رد کردن نیمهٔ کار
     است: عددِ درست باید **پیش از نوشتن** جلوی چشم باشد، نه پس از خطا.
     ۵٫۶۱/۷٫۳۵: کنترل جایی می‌نشیند که کار آنجاست. */
  H.push('if(D.nextEp&&D.nextEp.length)H.push("<br><b>قسمتِ بعدی:</b> "+esc(D.nextEp.join(" · "))+" — شمارهٔ گذشته اثری ندارد.");');
  H.push('H.push("</label>");');
  H.push('H.push("<textarea id=\'oc"+i+"\' rows=\'2\'>"+esc(r.once)+"</textarea>");');
  /* ══ فهرست به‌جای تایپ، و یکی برای هر برنامه (۷٫۵۹) ══
     خواستهٔ او: «لیستی باشه جای تایپی … و باید لیست برای هر نوع پادکست
     جدا باشه». قسمتی که پوشه‌اش شناخته نیست **نشان داده می‌شود ولی
     تیک نمی‌خورد، با نوشتنِ علتش** — پنهان کردنش یعنی او فکر کند آن
     قسمت اصلاً وجود ندارد. */
  H.push('H.push("<label>قسمت‌های تولیدشده — تیک بزنید تا با این صدا تبدیل شوند (پشتِ‌هم یا پراکنده).</label>");');
  H.push('for(var g=0;g<(D.eps||[]).length;g++){var G=D.eps[g];');
  H.push('H.push("<div class=\'eps\'><div class=\'epsh\'>"+esc(G.name)+" — "+esc(G.shown)+" از "+esc(G.total)+" قسمت");');
  H.push('if(G.noFolder)H.push(" · <span class=\'dim\'>"+esc(G.noFolder)+" تا پوشه‌شان شناخته نیست</span>");');
  H.push('H.push("</div><div class=\'epl\'>");');
  H.push('for(var e=0;e<G.items.length;e++){var E=G.items[e];var id="p"+i+"_"+g+"_"+e;');
  H.push('var vv=G.key+":"+E.ep;var on=(r.pickSet||[]).indexOf(vv)!==-1;');
  H.push('H.push("<label class=\'ep"+(E.can?"":" off")+"\'><input type=\'checkbox\' class=\'pk"+i+"\' id=\'"+id+"\' value=\'"+esc(vv)+"\'"+(on?" checked":"")+(E.can?"":" disabled")+">");');
  H.push('H.push("<b>"+esc(E.epFa)+"</b> "+esc(E.title||"—")+(E.at?" <span class=\'dim\'>"+esc(E.at)+"</span>":"")');
  H.push('+(E.can?"":" <span class=\'dim\'>— پوشه‌اش شناخته نیست، تبدیل نمی‌شود</span>")+"</label>");}');
  H.push('H.push("</div></div>");}');
  H.push('H.push("<div class=\'last\'>آخرین تصمیمِ موتور: <b>"+(esc(r.last)||"—")+"</b>");');
  H.push('if(r.used)H.push(" · آخرین استفاده: "+esc(r.used));');
  H.push('H.push("</div><div style=\'margin-top:8px\'><button id=\'b"+i+"\' onclick=\'save("+i+")\'>ذخیره</button>");');
  H.push('H.push("<span class=\'msg\' id=\'m"+i+"\'></span></div></div>");}');
  H.push('document.getElementById("box").innerHTML=H.join("");}');
  H.push('function save(i){var r=DATA.rows[i];');
  H.push('var shows=[];var cs=document.getElementsByClassName("sh"+i);');
  H.push('for(var k=0;k<cs.length;k++) if(cs[k].checked) shows.push(cs[k].value);');
  H.push('var picks=[];var ps=document.getElementsByClassName("pk"+i);');
  H.push('for(var q=0;q<ps.length;q++) if(ps[q].checked) picks.push(ps[q].value);');
  H.push('var b=document.getElementById("b"+i),m=document.getElementById("m"+i);');
  H.push('b.disabled=true;m.className="msg";m.textContent="در حالِ ذخیره…";');
  H.push('google.script.run.withSuccessHandler(function(res){b.disabled=false;');
  H.push('if(res&&res.ok){m.className="msg good";m.textContent="ذخیره شد.";}');
  H.push('else{m.className="msg bad";m.textContent=(res&&res.why)||"ذخیره نشد.";}})');
  H.push('.withFailureHandler(function(e){b.disabled=false;m.className="msg bad";');
  H.push('m.textContent="ذخیره نشد: "+e.message;})');
  H.push('.personaBoardSave(r.key,document.getElementById("on"+i).checked,shows,');
  H.push('document.getElementById("ev"+i).value,document.getElementById("cu"+i).value,');
  H.push('document.getElementById("mo"+i).value,document.getElementById("oc"+i).value,picks);}');
  H.push('google.script.run.withSuccessHandler(draw).withFailureHandler(function(e){');
  H.push('document.getElementById("box").textContent="خوانده نشد: "+e.message;}).personaBoardData();');
  H.push('</script></body></html>');
  return H.join('');
}
