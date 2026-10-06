/**
 * 36_VoiceBridge.gs — «پلِ رنگِ صدا»: صوتِ قسمت می‌رود، تبدیل می‌شود، برمی‌گردد
 *
 * ══ خواستهٔ صاحبِ برنامه، و ترتیبی که خواست ══
 *
 * «بساز این پل … بساز و بسنجش و ناظر باید همیشه حواسش بهش باشه ایراداتش
 * اصلاح کنه.» سه کار است، به همین ترتیب: ساختن، سنجیدن، و زیرِ نظر بودن.
 *
 * ══ آنچه پل هست و آنچه نیست ══
 *
 * بخشِ ۳۲ **شیوهٔ خواندن** را عوض می‌کند (مکث، کشش، ریتم) و هیچ تبدیلی
 * نمی‌کند. بخشِ ۳۳ **مدل می‌سازد**. هیچ‌کدام صدای قسمت را عوض نمی‌کنند.
 * پل این است: فایلِ WAVِ همین قسمت برود بیرون، با مدلِ گوینده تبدیل شود،
 * و برگردد در پوشهٔ همان قسمت.
 *
 * ══ چرا بیرون، و چرا **همین** بیرون ══
 *
 * Apps Script نه ffmpeg دارد، نه GPU، نه بیش از شش دقیقه وقت. این همان
 * دیواری است که بخشِ ۲۷ برای ویدئو به آن خورد — و جوابش از پیش ساخته و
 * ۱۸۰ بار آزموده شده: موتور فایل را موقتاً «هرکس با لینک» می‌کند و در
 * صف می‌گذارد؛ اکشن می‌سازد و خروجی را **release asset** می‌کند؛ موتور
 * برمی‌دارد و اشتراک را پس می‌گیرد. راهِ دومی ساختن یعنی دو جای شکست و
 * نصفِ تاریخچه در هرکدام.
 *
 * ══ و آنچه این نسخه عمداً نمی‌کند ══
 *
 * **صوتِ منتشرشده را عوض نمی‌کند.** فایلِ تبدیل‌شده کنارِ اصلی می‌نشیند با
 * نامی که خودش را معرفی می‌کند. دلیلش ترتیبی است که خودِ او خواست
 * («بساز و بسنجش») و یک واقعیت: صدای یک پادکستِ روزانه را پیش از آنکه
 * کسی شنیده باشدش عوض کنی، فردا نمی‌شود پسش گرفت — قسمت رفته، ایمیل
 * رفته، تلگرام رفته. `CFG.VBR_REPLACE` آن دکمه است و خاموش است.
 *
 * ══ و اصلِ سرتاسریِ این پرونده، اینجا هم ══
 *
 * هیچ‌چیز پاک نمی‌شود. اصلِ WAV دست‌نخورده می‌مانَد، حتی وقتی تبدیل خوب
 * درآمده باشد. اگر روزی معلوم شود تبدیل بد بوده، فایلِ اصلی همان‌جاست.
 */

/** نامِ فایلِ صف. */
function vbrFileName_() { return String(CFG.VBR_FILE || '_VOICE-RENDER.json'); }

/** صفِ فعلی — همیشه با شکلِ درست، حتی اگر فایل نباشد یا خراب باشد. */
function vbrRead_() {
  var d = null;
  try {
    var it = outFolder_().getFilesByName(vbrFileName_());
    if (it.hasNext()) d = JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
  } catch (e) { d = null; }
  if (!d || typeof d !== 'object') d = {};
  if (Object.prototype.toString.call(d.items) !== '[object Array]') d.items = [];
  return d;
}

/** ذخیرهٔ صف، و گشودنِ اشتراکش — اکشن به‌عنوانِ «هیچ‌کس» می‌آید. */
function vbrSave_(d) {
  d.rev = (Number(d.rev) || 0) + 1;
  d.at = nowStr_();
  d.engine = String(CFG.CODE_VERSION || '');
  d.note = 'صفِ پلِ رنگِ صدا. موتور (بخشِ ۳۶) می‌نویسد، گردش‌کارِ ' +
           'voice-bridge می‌خوانَد. دست‌نویس نکنید — بازنویسی می‌شود.';
  try {
    putOutJson_(vbrFileName_(), d);
    /* ══ اشتراک را خاموش نبلع — درسِ ۷٫۳۳ ══
       صفِ گویندگان چهار اجرا پشتِ‌هم مُرد چون این سه خط در یک `catch`
       خالی بودند و درایو برای فایلِ بی‌اشتراک به‌جای JSON یک صفحهٔ HTML
       می‌دهد، نه خطای ۴۰۳. */
    var it = outFolder_().getFilesByName(vbrFileName_());
    if (it.hasNext() && !driveShareOn_(it.next().getId())) {
      logLine_('اشتراکِ «' + vbrFileName_() + '» باز نشد — پل صف را نمی‌بیند.');
    }
    return true;
  } catch (e) {
    logLine_('صفِ پل نوشته نشد: ' + e.message);
    return false;
  }
}

/**
 * پوشهٔ مدل‌ها، زیرِ OUTPUT.
 *
 * ══ چرا کپی و نه اشتراکِ فایلِ اصلی ══
 * مدل در پوشهٔ «voice-models» است که **بیرونِ OUTPUT** است، و قاعدهٔ اولِ
 * این پرونده می‌گوید نوشتن فقط در OUTPUT. عوض کردنِ اشتراکِ فایلی بیرونِ
 * OUTPUT هم دست‌بردن در جایی است که اجازه‌اش را نداریم. کپی‌گرفتن اما
 * خواندنِ آنجا و نوشتن اینجاست — و سودِ جانبی‌اش این است که مدل وارد
 * همان رژیمِ پشتیبان می‌شود و به artifactی که ۱۷ اکتبر منقضی می‌شود
 * بند نیست.
 */
function vbrFolder_() {
  var name = String(CFG.VBR_FOLDER || 'مدل‌های صدا');
  var root = outFolder_();
  var it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}

/**
 * مدلِ این گوینده، آماده و گشوده — یا دلیلِ نبودنش.
 *
 * یک بار کپی می‌شود و بعد فقط پیدا. نامِ کپی کلیدِ گوینده را دارد، چون
 * دو گوینده با یک نامِ فایل همان باگی است که ۷٫۲۱ در `dsSig_` گرفت: مدلِ
 * یکی برای دیگری «موجود» شمرده می‌شود و هیچ خطایی بلند نمی‌شود.
 */
function vbrModel_(key) {
  var k = String(key || '').trim();
  var out = { ok: false, pth: '', index: '', why: '' };
  if (!k) { out.why = 'کلیدِ گوینده خالی است'; return out; }
  var fold = vbrFolder_();
  var want = { pth: k + '.pth', index: k + '.index' };
  var have = {};
  for (var kind in want) {
    if (!Object.prototype.hasOwnProperty.call(want, kind)) continue;
    var it = fold.getFilesByName(want[kind]);
    if (it.hasNext()) have[kind] = it.next();
  }
  // نبودِ کپی: از بذر بساز، اگر بذری برایش هست.
  if (!have.pth) {
    var seed = (CFG.VBR_SEED_MODELS || {})[k] || null;
    if (!seed || !seed.pth) {
      /* ══ پیامی که نگوید چه باید کرد، پیامِ ناکارآمد است (۷٫۴۵) ══
         این حالت **حالتِ عادیِ گویندهٔ دوم** است، نه یک خرابیِ نادر: مدل در
         artifactِ گیت‌هاب آموزش دیده و از آنجا بیرون نمی‌آید (artifact از
         بیرونِ Actions دانلود نمی‌شود، و `UrlFetchApp` هم سقفِ ۵۰ مگابایت
         دارد در حالی که مدل بزرگ‌تر است). یعنی راهی که موتور خودش برود
         وجود ندارد و **یک بار** باید دستی گذاشته شود. پس پیام باید نامِ
         دقیقِ دو فایل و جای دقیقشان را بگوید، وگرنه نامِ اشتباه یک شکستِ
         بی‌صدای دیگر است. */
      out.why = 'مدلِ «' + k + '» در پوشهٔ «' + (CFG.VBR_FOLDER || 'مدل‌های صدا') +
                '» نیست. یک بار دستی بگذاریدش: دو فایل با همین نام‌ها — «' +
                want.pth + '» و «' + want.index + '» — در همان پوشه زیرِ OUTPUT. ' +
                'نامِ فایل باید **دقیقاً** کلیدِ گوینده باشد، وگرنه موتور پیدایش نمی‌کند.';
      out.needFiles = [want.pth, want.index];
      out.folder = String(CFG.VBR_FOLDER || 'مدل‌های صدا');
      try { out.folderUrl = fold.getUrl(); } catch (eU) { out.folderUrl = ''; }
      return out;
    }
    try {
      have.pth = DriveApp.getFileById(String(seed.pth)).makeCopy(want.pth, fold);
      if (seed.index && !have.index) {
        have.index = DriveApp.getFileById(String(seed.index)).makeCopy(want.index, fold);
      }
      logLine_('مدلِ «' + k + '» در OUTPUT کپی شد — دیگر به artifact بند نیست.');
    } catch (e) {
      out.why = 'کپیِ مدل نشد: ' + String(e.message).slice(0, 90);
      return out;
    }
  }
  /* ایندکس اختیاری است: بی آن هم تبدیل انجام می‌شود، فقط `index_rate`
     بی‌اثر می‌ماند. نبودنش دلیلِ زمین گذاشتنِ کل کار نیست. */
  for (var kk in have) {
    if (!Object.prototype.hasOwnProperty.call(have, kk)) continue;
    try { driveShareOn_(have[kk].getId()); } catch (eS) {}
    out[kk] = ytDlUrl_(have[kk].getId());
  }
  out.ok = !!out.pth;
  if (!out.ok) out.why = 'فایلِ مدل پیدا نشد';
  return out;
}

/* ═══════════ مدلِ گویندهٔ تازه، خودکار به «مدل‌های صدا» (۸.۴۱) ═══════════
 *
 * او پرسید «یعنی من دارم چی رو بعد از سی روز از دست میدم؟». جوابِ راست:
 * مدلِ هر گویندهٔ **تازه**، تا امروز. آموزش در گیت‌هاب تمام می‌شود و مدل در
 * artifact می‌مانَد؛ artifact سی روز بعد پاک می‌شود و از Apps Script دانلود
 * نمی‌شود. `vbrModel_` تا امروز فقط می‌توانست بگوید «دستی بگذاریدش» — و این
 * پیام (۷٫۷۵) درست بود ولی کار را به او حواله می‌داد.
 *
 * حالا `voice-intake` مدل را تکه‌تکه و **موقتاً** در یک Release می‌گذارد و
 * نشانی و اثرانگشتش را در `docs/voices.json` (`modelDrop`) می‌نویسد. موتور:
 *   ۱) هر ساعت (و شبانه) می‌پرسد تحویلی منتظر هست یا نه — فقط زمان‌بندی،
 *      چون برداشتنِ ۸۰ مگابایت جای تریگرِ ساعتیِ ارزان نیست (۶٫۳۷/۷٫۸۴).
 *   ۲) در اجرای جدای خودش (`runVoiceModelFetch`) تکه‌ها را با «بارگذاریِ
 *      ازسرگیری‌پذیرِ» درایو یکی می‌کند — چون یک فایلِ ۵۵ مگابایتی از سقفِ
 *      ۵۰ مگابایتیِ هر پاسخ و هر blob بزرگ‌تر است — و **اثرانگشتِ کلِ فایل**
 *      را از خودِ درایو می‌خوانَد و با `sha256`ِ تحویل مقایسه می‌کند.
 *      ناهمخوان ⇒ فایل به سطل می‌رود؛ مدلِ خراب از مدلِ نبوده بدتر است، چون
 *      «موجود» شمرده می‌شود و هر تبدیل را بی‌صدا خراب می‌کند (درسِ RIFFِ
 *      `musicFetch_`: به چیزی که رسید نگاه کن، نه به اسمش).
 *   ۳) «رسید» را در صفِ گویندگان می‌نویسد (`models`)، و `voicemodel.py
 *      --clean` با همان تکه‌ها را از Release پاک می‌کند — قرینهٔ `dropCollected`.
 *   ۴) همان گوینده را در فهرستِ نمونهٔ خودکار می‌گذارد: داستانِ آزمون با
 *      صدای او ساخته و به تلگرام فرستاده می‌شود، بی هیچ تیکی.
 *
 * شکستِ پیاپی (`VBR_MODEL_TRY_MAX`) یافتهٔ کد است، با راهِ دستی در پیامش —
 * چون مدلِ منتظر سقفِ زمان دارد و پس از آن از Release پاک می‌شود.
 *
 * ══ ۸.۴۲: «سریع پاک نکنه … زحمات چند روزه از بین بره» ══
 * او درست نگران بود، و یک جا حق داشت که فقط نگرانی نبود: فایلی که از قبل
 * **با همان اندازه** در پوشه بود، «همان مدل» شمرده می‌شد. ولی `.pth`ِ RVC
 * اندازه‌اش را از معماری می‌گیرد، نه از داده — آموزشِ دوبارهٔ همان گوینده با
 * همان شمارِ دور تقریباً همیشه همان اندازه را دارد. یعنی مدلِ تازه هرگز بالا نمی‌رفت، مدلِ
 * قدیم سرِ جایش می‌ماند، «رسید» ثبت می‌شد و گیت‌هاب تکه‌های تازه را پاک
 * می‌کرد: کارِ چند روز آموزش، بی هیچ خطا. حالا:
 *   • هم‌اندازه فقط با **اثرانگشتِ درایو** «همان» است (`vbrDriveMeta_`).
 *   • «رسید» به گیت‌هاب فقط وقتی می‌رود که اثرانگشتِ خودِ درایو با تحویل یکی
 *     باشد (`sha: 1`). اندازهٔ درست بی اثرانگشت، مدل را قابلِ استفاده می‌کند
 *     ولی نسخهٔ گیت‌هاب را پاک‌شدنی نمی‌کند؛ ساعتِ بعد دوباره سنجیده می‌شود.
 *   • مدلِ قبلی به «پیشین» می‌رود، نه به سطل (`vbrModelAside_`).
 *   • گویندهٔ آماده‌ای که مدلش نیست در صف (`missing`) نوشته می‌شود و
 *     `voicemodel.py --redrop` همان را از artifactِ آموزش دوباره می‌فرستد —
 *     راهِ دستی دیگر تنها راه نیست.
 */
var VBR_MD_WAIT = 'منتظرِ موتور';

/** تحویل‌های منتظر در `docs/voices.json`: `[{key, name, md}]`. */
function vbrModelDrops_(doc) {
  var out = [];
  var sp = doc && doc.speakers;
  if (!sp || typeof sp !== 'object') return out;
  for (var k in sp) {
    if (!Object.prototype.hasOwnProperty.call(sp, k)) continue;
    var md = sp[k] && sp[k].modelDrop;
    if (!md || md.state !== VBR_MD_WAIT || !md.pth || !(md.pth.parts || []).length) continue;
    out.push({ key: String(k), name: String((sp[k] && sp[k].name) || k), md: md });
  }
  return out;
}

function vbrModelPk_(name) {
  try {
    var o = JSON.parse(props_().getProperty(name) || '{}');
    return (o && typeof o === 'object' && !(o instanceof Array)) ? o : {};
  } catch (e) { return {}; }
}

/**
 * تحویلی که همین موتور قبلاً برداشته — با `drop` (زمانِ همان تحویل) نه فقط کلید.
 * برداشتی که اثرانگشتش هنوز از درایو نیامده (`sha: 0`) برداشته‌شده شمرده
 * نمی‌شود: ساعتِ بعد دوباره می‌پرسد، و آن‌وقت یا یکی است (تأیید) یا نیست
 * (بارگذاریِ دوباره). بی این، یک «هم‌اندازه»ِ نسنجیده برای همیشه می‌ماند.
 */
function vbrModelTaken_(have, d) {
  var h = have && have[d.key];
  return !!(h && h.ok && h.sha !== 0 && String(h.drop || '') === String(d.md.at || ''));
}

/**
 * زمان‌بندِ ارزان. `opt.doc` اگر خواننده از قبل دارد؛ `opt.scanManual` (فقط
 * شبانه) گویندهٔ آماده‌ای را هم که مدلش **دستی** در درایو گذاشته شده، به
 * فهرستِ نمونهٔ خودکار می‌برد.
 */
function vbrModelDropDue_(opt) {
  opt = opt || {};
  var out = { pending: 0, scheduled: false, why: '' };
  if (CFG.VBR_ON === false || CFG.VBR_MODEL_AUTO === false) { out.why = 'خاموش (تصمیم)'; return out; }
  var doc = opt.doc || null;
  if (!doc) { try { doc = vintReadResult_(); } catch (eR) { doc = null; } }
  if (!doc) { out.why = 'docs/voices.json خوانده نشد'; return out; }
  if (opt.scanManual) { try { vbrSoulAutoScan_(doc); } catch (eA) {} }
  var have = vbrModelPk_('VMODEL_HAVE');
  var drops = vbrModelDrops_(doc).filter(function (d) { return !vbrModelTaken_(have, d); });
  out.pending = drops.length;
  /* ══ گویندهٔ آماده‌ای که مدلش نه در درایو است نه در راه ══
     تحویلی که پیش از برداشتن منقضی شد (موتور سه روز نتوانست)، یا گوینده‌ای
     که پیش از ۸.۴۱ آموزش دید و کسی مدلش را نیاورد. بی این شمارش، سکوت
     همان «همه‌چیز سالم است» خوانده می‌شد. فقط شبانه، چون پیمایشِ پوشه است. */
  if (opt.scanManual) { try { vbrModelMissingScan_(doc, drops); } catch (eM) {} }
  if (!drops.length) return out;
  var max = Math.max(1, Number(CFG.VBR_MODEL_TRY_DAY) || 4);
  var today = String(nowStr_()).slice(0, 10), n = 0;
  try {
    var parts = String(props_().getProperty('VMODEL_DAY') || '').split('|');
    if (parts[0] === today) n = Number(parts[1]) || 0;
  } catch (eP) {}
  if (n >= max) { out.why = 'سقفِ امروز پر شد (' + n + ')'; return out; }
  try {
    clearRetryTriggers_('runVoiceModelFetch');
    ScriptApp.newTrigger('runVoiceModelFetch').timeBased().after(60 * 1000).create();
    props_().setProperty('VMODEL_DAY', today + '|' + (n + 1));
    out.scheduled = true;
  } catch (eT) { out.why = 'زمان‌بندی نشد: ' + String((eT && eT.message) || eT).slice(0, 60); }
  return out;
}

/** گویندگانِ آماده (نه پیش‌ساخته) بی مدل در درایو و بی تحویلِ منتظر ⇒ `VMODEL_MISSING`. */
function vbrModelMissingScan_(doc, drops) {
  var sp = doc && doc.speakers, miss = {};
  if (!sp || typeof sp !== 'object') return miss;
  var wait = {};
  for (var i = 0; i < (drops || []).length; i++) wait[drops[i].key] = 1;
  var fold = null;
  for (var k in sp) {
    if (!Object.prototype.hasOwnProperty.call(sp, k)) continue;
    var s = sp[k] || {};
    if (String(s.stage || '') !== 'آماده' || s.preexisting || wait[k]) continue;
    if (!fold) fold = vbrFolder_();
    if (fold.getFilesByName(k + '.pth').hasNext()) continue;
    var md = s.modelDrop || null;
    var why = md && md.state === 'منقضی'
      ? 'تحویلش پیش از برداشتن منقضی شد (' + String(md.closedAt || md.at || '') + ')'
      : 'هیچ تحویلی برایش نیامده';
    /* آنچه گیت‌هاب در فرستادنِ دوباره دید، از همان `docs/voices.json` — تا
       خطِ روزانه بگوید راهِ خودکار هنوز باز است یا بسته شد (۸.۴۲). */
    var rf = s.modelRedropFail || null;
    var rn = Number(s.modelRedrops) || 0;
    miss[k] = { name: String(s.name || k), why: why, redrops: rn,
                gone: !!(rf && rf.gone), redropWhy: rf ? String(rf.why || '').slice(0, 160) : '' };
  }
  var prev = '';
  try { prev = String(props_().getProperty('VMODEL_MISSING') || ''); } catch (eP) {}
  var cur = JSON.stringify(miss);
  try { props_().setProperty('VMODEL_MISSING', cur); } catch (e) {}
  /* صف همین حالا، نه شبِ بعد — ولی فقط وقتی چیزی عوض شد: یک خواندن و یک
     نوشتن روی فایلی که هر ساعت هم نوشته می‌شود، نه هر شب برای هیچ. */
  if (cur !== (prev || '{}')) {
    try { vintQueueModels_(null); }
    catch (eQ) { try { logLine_('فهرستِ «مدلِ جامانده» در صفِ گویندگان نوشته نشد: ' + eQ.message); } catch (eQ2) {} }
  }
  return miss;
}

/** اجرای جدا — نامِ خودش، تا پاک‌کردنش به تریگرِ روزانه نخورد. */
function runVoiceModelFetch() {
  runEnter_('runVoiceModelFetch');
  var note = '';
  try {
    try { clearRetryTriggers_('runVoiceModelFetch'); } catch (e0) {}
    var r = vbrModelFetchAll_();
    note = r.map(function (x) { return x.key + ':' + (x.ok ? 'رسید' : 'نشد'); }).join(' ');
    return r;
  } finally { runExit_('runVoiceModelFetch', note); }
}

function vbrModelFetchAll_() {
  var res = [];
  var doc = null;
  try { doc = vintReadResult_(); } catch (eD) { doc = null; }
  if (!doc) return res;
  var have = vbrModelPk_('VMODEL_HAVE');
  var drops = vbrModelDrops_(doc).filter(function (d) { return !vbrModelTaken_(have, d); });
  var t0 = new Date().getTime();
  var budget = Math.max(60000, Number(CFG.VBR_MODEL_BUDGET_MS) || 270000);
  for (var i = 0; i < drops.length; i++) {
    /* هر گوینده دست‌کم دو دقیقه وقت می‌خواهد؛ آنچه جا نشد، ساعتِ بعد. */
    if (i > 0 && new Date().getTime() - t0 > budget - 120000) break;
    var d = drops[i], r = null;
    try { r = vbrModelFetchOne_(d); }
    catch (e) { r = { ok: false, why: String((e && e.message) || e).slice(0, 160) }; }
    r.key = d.key; r.name = d.name;
    res.push(r);
    vbrModelAfter_(d, r);
  }
  return res;
}

/** پس از هر تلاش: ثبت، خبر، صف، نمونه — یا شمارشِ شکست. */
function vbrModelAfter_(d, r) {
  var fa = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
  var fail = vbrModelPk_('VMODEL_FAIL');
  if (r.ok) {
    var have = vbrModelPk_('VMODEL_HAVE');
    var prev = have[d.key];
    /* اولین برداشتِ **همین** تحویل خبر دارد؛ تکرارش (اثرانگشتی که ساعتِ بعد
       رسید) فقط ثبت می‌شود — دو «✅ آمد» برای یک مدل، یکی را دروغ می‌کند. */
    var first = !(prev && prev.ok && String(prev.drop || '') === String(d.md.at || ''));
    have[d.key] = { ok: 1, at: first ? nowStr_() : String(prev.at || nowStr_()),
                    drop: String(d.md.at || ''),
                    pth: Number(r.sizes && r.sizes.pth) || 0,
                    index: Number(r.sizes && r.sizes.index) || 0,
                    sha: r.verified ? 1 : 0 };
    try { props_().setProperty('VMODEL_HAVE', JSON.stringify(have)); } catch (eS) {}
    delete fail[d.key];
    try { props_().setProperty('VMODEL_FAIL', JSON.stringify(fail)); } catch (eF) {}
    /* «رسید» به صف، تا گیت‌هاب تکه‌ها را پاک کند — بی این، مدل تا سقفِ زمان
       عمومی می‌ماند. بخشِ ۳۳ پیش از این است، پس فراخوان رو به عقب است.
       `vintModelsForQueue_` برداشتِ بی‌اثرانگشت را **نمی‌نویسد** (۸.۴۲). */
    try { vintQueueModels_(have); }
    catch (eQ) { try { logLine_('«رسید»ِ مدل در صفِ گویندگان نوشته نشد: ' + eQ.message); } catch (eQ2) {} }
    if (!first) {
      if (r.verified && prev && prev.sha === 0) {
        try { logLine_('اثرانگشتِ مدلِ «' + d.key + '» حالا از درایو رسید و با تحویل یکی بود؛ ' +
                       'نسخهٔ موقتِ گیت‌هاب از این پس پاک‌شدنی است.'); } catch (eL0) {}
      }
      return;
    }
    var seeded = false;
    try { seeded = vbrSoulAutoAdd_(d.key); } catch (eA) { seeded = false; }
    var fold = String(CFG.VBR_FOLDER || 'مدل‌های صدا');
    var msg = '✅ مدلِ صدای «' + d.name + '» خودکار از گیت‌هاب به درایو آمد (پوشهٔ «' + fold + '»، ' +
              fa(Math.round((r.sizes.pth || 0) / 1048576)) + ' مگابایت' +
              (r.verified
                ? '، اثرانگشتش را خودِ درایو حساب کرد و با تحویل یکی بود).'
                : '، اندازه‌اش درست بود ولی اثرانگشتش هنوز از درایو نیامده). ' +
                  'تا آن نیامده، نسخهٔ گیت‌هاب پاک نمی‌شود؛ ساعتِ بعد دوباره سنجیده می‌شود.') +
              (r.moved && r.moved.length
                ? '\nمدلِ قبلیِ همین گوینده پاک نشد: به «' + fold + '/' +
                  String(CFG.VBR_MODEL_OLD_FOLDER || 'پیشین') + '» رفت.' : '') +
              '\nاصلِ مدل در artifactِ آموزش در گیت‌هاب هم تا ۹۰ روز می‌مانَد.' +
              (seeded ? '\nنمونهٔ آزمونش (داستانِ «ساعت‌ساز» با صدای او) در یکی دو ساعتِ آینده ' +
                        'ساخته و همین‌جا فرستاده می‌شود.' : '') +
              '\nروشن‌کردنِ ردیفش برای پادکست‌ها تصمیمِ شماست.';
    try { mailQueue_('گویندهٔ تازه', 'مدلِ «' + d.name + '» به درایو آمد', msg); } catch (eM) {}
    try { tgSend_(msg); } catch (eT) {}
    try { logLine_('مدلِ «' + d.key + '» از تحویلِ ' + d.md.at + ' در درایو نشست' +
                   (r.verified ? '' : ' (اثرانگشت هنوز نیامده)') + '.'); } catch (eL) {}
    return;
  }
  var cur = fail[d.key] && String(fail[d.key].drop) === String(d.md.at) ? fail[d.key] : { n: 0 };
  cur.n = (Number(cur.n) || 0) + 1;
  cur.why = String(r.why || 'نامعلوم').slice(0, 200);
  cur.at = nowStr_(); cur.drop = String(d.md.at || ''); cur.name = d.name;
  fail[d.key] = cur;
  try { props_().setProperty('VMODEL_FAIL', JSON.stringify(fail)); } catch (eF2) {}
  try { logLine_('مدلِ «' + d.key + '» برداشته نشد (' + cur.n + '): ' + cur.why); } catch (eL2) {}
  var max = Math.max(1, Number(CFG.VBR_MODEL_TRY_MAX) || 3);
  if (cur.n === max) {
    var hint = 'راهِ دستی تا وقتی تکه‌ها پاک نشده‌اند: از اجرای آموزشِ همین گوینده در گیت‌هاب ' +
               '(artifactِ «voice-' + d.key + '») دو فایل را بردارید و با این نام‌ها در پوشهٔ «' +
               String(CFG.VBR_FOLDER || 'مدل‌های صدا') + '» زیرِ OUTPUT بگذارید: «' + d.key +
               '.pth» و «' + d.key + '.index».';
    try {
      logSelfFinding_(getHub_(), {
        /* کلیدِ کوتاه: شناسهٔ ردیف بیش از ۲۴ نویسه را هش می‌کند، و آن‌وقت
           بستنِ ردیف با نامِ کلید در `answers` (۷٫۴۸) ممکن نیست. */
        priority: 'جدی', category: 'گویندهٔ تازه', key: 'vmodel-' + d.key,
        title: 'مدلِ «' + d.name + '» ' + cur.n + ' بار از گیت‌هاب به درایو نیامد',
        detail: 'آخرین علت: ' + cur.why + '. تحویل: ' + d.md.at + '. پس از سقفِ زمان، ' +
                'تکه‌ها از Release پاک می‌شوند.',
        instruction: 'علت را در `vbrResumableUpload_`/`vbrModelFetchOne_` پیدا کن (اسکوپِ درایو؟ ' +
                     'سقفِ اندازه؟ اثرانگشتِ ناهمخوان؟). ' + hint,
        owner: ROWNER_CODE
      });
    } catch (eF3) {}
    var m2 = '⚠️ مدلِ صدای «' + d.name + '» سه بار از گیت‌هاب به درایو نیامد. علت: ' + cur.why +
             '\n' + hint;
    try { mailQueue_('گویندهٔ تازه', 'مدلِ «' + d.name + '» به درایو نیامد', m2); } catch (eM2) {}
    try { tgSend_(m2); } catch (eT2) {}
  }
}

/**
 * یک گوینده: هر دو فایل، یکی‌یکی.
 *
 * فایلی که از قبل در پوشه هست فقط وقتی «همین مدل» است که **اثرانگشتِ
 * درایو**ش با تحویل یکی باشد — نه اندازه‌اش (۸.۴۲). `.pth`ِ RVC اندازه‌اش را
 * از معماری می‌گیرد، پس آموزشِ دوباره همان اندازه را دارد؛ با سنجهٔ اندازه،
 * مدلِ تازه هرگز بالا نمی‌رفت و نسخهٔ گیت‌هاب‌اش پس از «رسید» پاک می‌شد.
 * هم‌اندازه با اثرانگشتِ **نیامده** همان می‌مانَد ولی `verified` نمی‌گیرد —
 * بارگذاریِ دوباره برای چیزی که شاید همان است، بی‌دلیل یک فایلِ تکراری
 * می‌سازد، و ساعتِ بعد دوباره سنجیده می‌شود.
 *
 * فایلِ هم‌نامِ قدیمی فقط **پس از** وارسیِ فایلِ تازه کنار می‌رود — و به
 * «پیشین»، نه به سطل.
 */
function vbrModelFetchOne_(d) {
  var fold = vbrFolder_();
  var out = { ok: false, why: '', sizes: {}, verified: true, moved: [] };
  var kinds = ['pth', 'index'];
  for (var i = 0; i < kinds.length; i++) {
    var kind = kinds[i], spec = d.md[kind];
    if (!spec) continue;
    var name = d.key + '.' + kind;
    var size = Number(spec.size) || 0;
    var want = String(spec.sha256 || '').toLowerCase();
    var olds = [], it = fold.getFilesByName(name), same = null, sameSha = '';
    while (it.hasNext()) {
      var f = it.next();
      if (!same && size && Number(f.getSize()) === size) {
        var hs = String(vbrDriveMeta_(f.getId()).sha256Checksum || '').toLowerCase();
        if (!hs || !want || hs === want) { same = f; sameSha = hs; continue; }
      }
      olds.push(f);
    }
    if (same) {
      out.sizes[kind] = size;
      if (!(sameSha && want)) { out.verified = false; continue; }
      /* «همین» با اثرانگشت ثابت شد؛ هم‌نامِ دیگری که کنارش مانده، `getFilesByName`ِ
         پل ممکن است به‌جای آن بخوانَد — پس کنار می‌رود، نه پاک. */
      for (var j0 = 0; j0 < olds.length; j0++) {
        try { out.moved.push(vbrModelAside_(olds[j0])); } catch (eO0) {}
      }
      continue;
    }
    var up = vbrResumableUpload_(fold.getId(), name, spec);
    if (!up.ok) { out.why = name + ': ' + up.why; return out; }
    if (!up.shaChecked) out.verified = false;
    for (var j = 0; j < olds.length; j++) {
      try { out.moved.push(vbrModelAside_(olds[j])); } catch (eO) {}
    }
    out.sizes[kind] = up.size;
  }
  out.ok = !!out.sizes.pth;
  if (!out.ok && !out.why) out.why = 'فایلِ .pth در تحویل نبود';
  if (!out.ok) out.verified = false;
  return out;
}

/**
 * مدلِ قبلی به «پیشین»، با زمانِ کنار رفتن در نامش — هرگز به سطل.
 *
 * سطلِ درایو سی روز بعد خالی می‌شود، و مدلی که با آموزشِ تازه کنار رفت همان
 * است که اگر گوشِ او تازه را نپسندید باید برگردد. نامِ تازه عمداً دیگر
 * `<کلید>.pth` نیست: حتی اگر روزی کسی آن را به پوشهٔ اصلی برگرداند، پل آن را
 * با مدلِ زنده اشتباه نمی‌گیرد مگر آن‌که نامش را دستی پس بدهد.
 */
function vbrModelAside_(f) {
  var fold = vbrFolder_();
  var nm = String(CFG.VBR_MODEL_OLD_FOLDER || 'پیشین');
  var it = fold.getFoldersByName(nm);
  var sub = it.hasNext() ? it.next() : fold.createFolder(nm);
  var was = String(f.getName());
  var to = was + ' — کنار رفت ' + String(nowStr_()).slice(0, 16);
  f.setName(to);
  f.moveTo(sub);
  try { logLine_('مدلِ پیشینِ «' + was + '» به «' + nm + '» رفت (پاک نشد): ' + to); } catch (e) {}
  return to;
}

/** اندازه و اثرانگشتِ یک فایل از خودِ درایو — `{size, sha256Checksum}`؛ نبودنش `{}`. */
function vbrDriveMeta_(id, tok) {
  try {
    var mr = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) +
                               '?fields=size,sha256Checksum&supportsAllDrives=true',
                               { headers: { Authorization: 'Bearer ' + (tok || ScriptApp.getOAuthToken()) },
                                 muteHttpExceptions: true });
    if (mr.getResponseCode() !== 200) return {};
    return JSON.parse(mr.getContentText() || '{}') || {};
  } catch (e) { return {}; }
}

/**
 * بارگذاریِ ازسرگیری‌پذیرِ درایو، تکه‌به‌تکه از نشانی‌های تحویل.
 *
 * چرا این راه: `DriveApp.createFile` یک blob می‌خواهد و blob سقفِ ۵۰ مگابایت
 * دارد؛ مدل ۵۵ است. این API همان فایل را در چند درخواست می‌سازد و هیچ‌وقت
 * کلِ فایل در حافظه نیست. هر تکه همان `Blob`ِ پاسخِ دانلود است — به آرایهٔ
 * بایت تبدیل نمی‌شود، چون آرایهٔ ۳۲ میلیون‌عنصریِ جاوااسکریپت خودش حافظهٔ
 * اجرا را می‌خورد.
 *
 * `followRedirects: false` روی PUT حیاتی است: درایو برای «ادامه بده» کدِ
 * ۳۰۸ می‌دهد، و دنبال‌کردنش یعنی درخواستِ بعدی جای دیگری برود.
 */
function vbrResumableUpload_(folderId, name, spec) {
  var tok = ScriptApp.getOAuthToken();
  var total = Number(spec.size) || 0;
  var parts = spec.parts || [];
  if (!total || !parts.length) return { ok: false, why: 'تحویل اندازه یا تکه ندارد' };
  var sum = 0;
  for (var s0 = 0; s0 < parts.length; s0++) sum += Number(parts[s0].size) || 0;
  if (sum !== total) return { ok: false, why: 'جمعِ تکه‌ها (' + sum + ') با اندازهٔ فایل (' + total + ') نمی‌خوانَد' };
  var init = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
    { method: 'post', contentType: 'application/json; charset=UTF-8',
      payload: JSON.stringify({ name: name, parents: [String(folderId)],
                                mimeType: 'application/octet-stream' }),
      headers: { Authorization: 'Bearer ' + tok,
                 'X-Upload-Content-Type': 'application/octet-stream',
                 'X-Upload-Content-Length': String(total) },
      muteHttpExceptions: true });
  var c0 = init.getResponseCode();
  if (c0 !== 200) {
    return { ok: false, why: 'آغازِ بارگذاری: HTTP ' + c0 + ' ' +
             String(init.getContentText() || '').slice(0, 120) +
             (c0 === 403 ? ' — اسکوپِ درایو؟' : '') };
  }
  var hd = {};
  try { hd = init.getAllHeaders(); } catch (eH) { try { hd = init.getHeaders(); } catch (eH2) { hd = {}; } }
  var loc = hd.Location || hd.location || '';
  if (loc instanceof Array) loc = loc[0];
  if (!loc) return { ok: false, why: 'درایو نشانیِ نشستِ بارگذاری را نداد' };
  var off = 0, last = null;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i] || {};
    var got = UrlFetchApp.fetch(String(p.url || ''), { muteHttpExceptions: true, followRedirects: true });
    if (got.getResponseCode() !== 200) {
      return { ok: false, why: 'تکهٔ ' + (i + 1) + ' از گیت‌هاب: HTTP ' + got.getResponseCode() };
    }
    var sz = Number(p.size) || 0;
    var end = off + sz - 1;
    var put = UrlFetchApp.fetch(String(loc), {
      method: 'put', contentType: 'application/octet-stream', payload: got.getBlob(),
      headers: { 'Content-Range': 'bytes ' + off + '-' + end + '/' + total },
      muteHttpExceptions: true, followRedirects: false });
    var c = put.getResponseCode();
    var lastPart = (i === parts.length - 1);
    if (lastPart ? (c !== 200 && c !== 201) : c !== 308) {
      return { ok: false, why: 'تکهٔ ' + (i + 1) + ' به درایو: HTTP ' + c + ' ' +
               String(put.getContentText() || '').slice(0, 100) };
    }
    off = end + 1;
    last = put;
  }
  var id = '';
  try { id = String((JSON.parse(last.getContentText() || '{}') || {}).id || ''); } catch (eJ) { id = ''; }
  if (!id) return { ok: false, why: 'درایو شناسهٔ فایلِ ساخته‌شده را نداد' };
  /* ══ اثرانگشت از خودِ درایو، نه از امید ══
     اندازهٔ درست با بایت‌های غلط هم ممکن است. `sha256Checksum` را درایو
     خودش از بایت‌هایی که نشسته حساب می‌کند. نبودنش رد نیست (گاهی دیر
     پر می‌شود) ولی گفته می‌شود؛ ناهمخوانی‌اش رد است. */
  var meta = vbrDriveMeta_(id, tok);
  var bad = '';
  if (meta.size != null && Number(meta.size) !== total) bad = 'اندازهٔ نشسته ' + meta.size + ' به‌جای ' + total;
  else if (meta.sha256Checksum && spec.sha256 &&
           String(meta.sha256Checksum).toLowerCase() !== String(spec.sha256).toLowerCase()) {
    bad = 'اثرانگشتِ نشسته با تحویل یکی نیست';
  }
  if (bad) {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (eT) {}
    return { ok: false, why: bad + ' — فایل به سطل رفت' };
  }
  return { ok: true, id: id, size: total, sha: String(meta.sha256Checksum || ''),
           shaChecked: !!meta.sha256Checksum };
}

/** خطِ روزانهٔ مدل‌ها — فقط Script Properties، بی هیچ خواندنی (۷٫۶۳). */
function vbrModelStatus_() {
  var out = { fail: 0, recent: 0, line: '' };
  var fa = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
  var fail = vbrModelPk_('VMODEL_FAIL'), have = vbrModelPk_('VMODEL_HAVE');
  var L = [];
  for (var k in fail) {
    if (!Object.prototype.hasOwnProperty.call(fail, k)) continue;
    out.fail++;
    L.push('⚠️ مدلِ «' + String(fail[k].name || k) + '» هنوز از گیت‌هاب به درایو نیامده (' +
           fa(fail[k].n) + ' تلاش): ' + String(fail[k].why || ''));
  }
  var miss = vbrModelPk_('VMODEL_MISSING');
  for (var mk in miss) {
    if (!Object.prototype.hasOwnProperty.call(miss, mk) || fail[mk]) continue;
    out.fail++;
    var mm = miss[mk] || {};
    var files = 'دو فایلِ «' + mk + '.pth» و «' + mk + '.index»';
    /* سه حالت و سه جملهٔ متفاوت (۸.۴۲): راهِ خودکار هنوز باز است، بسته شد
       چون artifact دیگر نیست، یا بسته شد چون بارها فرستاده شد و نرسید. جملهٔ
       یکسان برای هر سه یعنی او نمی‌فهمد کِی کارِ او شروع می‌شود. */
    var how = mm.gone
      ? 'artifactِ آموزشش هم دیگر در گیت‌هاب نیست (' + String(mm.redropWhy || '') + ') — اگر ' + files +
        ' جای دیگری هست در همان پوشه بگذارید، وگرنه این گوینده آموزشِ دوباره می‌خواهد'
      : (Number(mm.redrops) || 0) >= Math.max(1, Number(CFG.VBR_MODEL_REDROP_MAX) || 3)
        ? 'گیت‌هاب ' + fa(mm.redrops) + ' بار از artifactِ آموزش دوباره فرستاد و نرسید — علت در موتور است ' +
          '(یافتهٔ «vmodel-' + mk + '»)؛ تا آن درست شود، ' + files + ' را از artifactِ «voice-' + mk +
          '» دستی در همان پوشه بگذارید'
        : 'گیت‌هاب در نوبتِ بعدیِ گویندگان (هر شش ساعت) آن را خودکار از artifactِ آموزش دوباره می‌فرستد' +
          (mm.redropWhy ? ' — بارِ قبل نشد: ' + String(mm.redropWhy) : '') + '. اگر نیامد، ' + files +
          ' را از artifactِ «voice-' + mk + '» در همان پوشه بگذارید';
    L.push('⚠️ گویندهٔ «' + String(mm.name || mk) + '» آماده است ولی مدلش در «' +
           String(CFG.VBR_FOLDER || 'مدل‌های صدا') + '» نیست — ' + String(mm.why || '') + '. ' + how + '.');
  }
  var now = new Date().getTime();
  for (var h in have) {
    if (!Object.prototype.hasOwnProperty.call(have, h)) continue;
    var t = Date.parse(String(have[h].at || '').replace(' ', 'T'));
    if (isFinite(t) && now - t < 7 * 86400000) {
      out.recent++;
      L.push('مدلِ «' + h + '» خودکار به درایو آمد (' + String(have[h].at || '').slice(0, 10) + ')' +
             (have[h].sha === 0 ? '، اثرانگشتش هنوز از درایو نیامده و نسخهٔ گیت‌هاب تا آمدنش می‌مانَد' : '') + '.');
    }
  }
  out.line = L.join(' · ');
  return out;
}

/* ═══════════ نمونهٔ آزمونِ خودکار برای گویندهٔ تازه (۸.۴۱) ═══════════
 *
 * تا امروز نمونهٔ خودکار فقط برای گوینده‌هایی ساخته می‌شد که کسی دستی در
 * `VOICE_SOUL_SEED` نوشته بود — یعنی هر گویندهٔ تازه یک نسخهٔ کد می‌خواست، یا
 * تیک و دکمه. حالا هر گوینده‌ای که آماده شد **و** مدلش در «مدل‌های صدا»
 * هست، خودش به فهرست می‌آید: با تحویلِ خودکار (`vbrModelAfter_`)، یا اگر
 * مدل دستی گذاشته شد، با وارسیِ شبانه (`vbrSoulAutoScan_`). همان سدهای
 * `runVoiceSoulTest` برقرارند و هیچ‌کدام دور زده نمی‌شود.
 *
 * فهرست یک بار برای هر گوینده است و هرگز خودبه‌خود پاک نمی‌شود؛ تکرار را
 * همان سدِ صف می‌گیرد که `VOICE_SOUL_SEED` را می‌گیرد (۷٫۸۲: بی‌حالتِ تازه).
 */
var VBR_AUTO_SEED_TAG = 'نمونهٔ خودکارِ گویندهٔ تازه · مکث به اندازهٔ خودش';

function vbrSoulAutoAdd_(key) {
  if (CFG.VOICE_SOUL_AUTO === false) return false;
  var k = String(key || '').trim();
  if (!k) return false;
  var m = vbrModelPk_('VSOUL_AUTO');
  if (m[k]) return true;
  m[k] = nowStr_();
  try { props_().setProperty('VSOUL_AUTO', JSON.stringify(m)); } catch (e) { return false; }
  return true;
}

/** بذرها — یک تعریف برای زمان‌بند و انتخاب‌گر: دستیِ CFG، به‌علاوهٔ خودکار. */
function vbrSoulSeeds_() {
  /* ══ هویتِ نمونه مدل را هم دارد (۸.۴۳) ══
     نمونه با (گوینده، متن، برچسب) شناخته می‌شود (۷٫۸۶). مدلِ تازهٔ همان گوینده —
     آموزشِ دوباره — هیچ‌کدام را عوض نمی‌کند، پس نمونهٔ «ساعت‌ساز» با صدای تازه
     «قبلاً ساخته شده» حساب می‌شد و هرگز ساخته نمی‌شد؛ در حالی که خبرِ پایانِ آموزش
     همین را وعده می‌دهد. مُهرِ تحویلِ مدل (`VMODEL_HAVE`) به برچسب می‌چسبد — فقط
     وقتی اثرانگشتش تأیید شده — و بی تحویل (مدلِ دستی) برچسب همان می‌مانَد، پس
     امروز هیچ نمونهٔ تکراری‌ای ساخته نمی‌شود. همان قاعدهٔ ۷٫۸۶: «چیزی که برای
     سنجیدنِ یک پارامتر ساخته می‌شود، هویتش باید آن پارامتر را داشته باشد». */
  var have = vbrModelPk_('VMODEL_HAVE');
  var stamp = function (spk) {
    var h = have[String(spk || '').trim()];
    return (h && h.ok && h.sha !== 0 && h.drop) ? ' · مدلِ ' + String(h.drop).slice(0, 10) : '';
  };
  var out = (CFG.VOICE_SOUL_SEED || []).map(function (sd) {
    var c = {};
    for (var k0 in sd) if (Object.prototype.hasOwnProperty.call(sd, k0)) c[k0] = sd[k0];
    c.tag = String(sd.tag || '') + stamp(sd.speaker);
    return c;
  });
  if (CFG.VOICE_SOUL_AUTO === false) return out;
  var cfg = {};
  for (var i = 0; i < out.length; i++) cfg[String((out[i] || {}).speaker || '').trim()] = 1;
  var auto = vbrModelPk_('VSOUL_AUTO');
  var keys = Object.keys(auto).sort();
  for (var j = 0; j < keys.length; j++) {
    if (cfg[keys[j]]) continue;              // دستی برنده است — برچسبش را او گذاشته
    out.push({ speaker: keys[j], show: 'آزمون', ep: 'ساعت‌ساز', text: 'ساعت‌ساز',
               tag: VBR_AUTO_SEED_TAG + stamp(keys[j]), auto: 1 });
  }
  return out;
}

/** شبانه: گویندهٔ آماده‌ای که مدلش (دستی یا خودکار) در درایو هست. */
function vbrSoulAutoScan_(doc) {
  var n = 0;
  if (CFG.VOICE_SOUL_AUTO === false) return n;
  var sp = doc && doc.speakers;
  if (!sp || typeof sp !== 'object') return n;
  var auto = vbrModelPk_('VSOUL_AUTO'), cfg = {};
  var seeds = CFG.VOICE_SOUL_SEED || [];
  for (var i = 0; i < seeds.length; i++) cfg[String((seeds[i] || {}).speaker || '').trim()] = 1;
  var fold = null;
  for (var k in sp) {
    if (!Object.prototype.hasOwnProperty.call(sp, k)) continue;
    var s = sp[k] || {};
    if (String(s.stage || '') !== 'آماده' || s.preexisting || auto[k] || cfg[k]) continue;
    if (!fold) fold = vbrFolder_();
    if (fold.getFilesByName(k + '.pth').hasNext() && vbrSoulAutoAdd_(k)) n++;
  }
  return n;
}

/** فایل‌های صوتیِ یک قسمت، مرتب — همان تعریفی که بخشِ ۲۷ دارد. */
function vbrAudio_(folderId) {
  var out = [];
  try {
    var fold = DriveApp.getFolderById(String(folderId));
    /* ══ همان تعریفِ بخشِ ۲۷، نه یک تعریفِ دوم ══
       `ytAudioParts_` ترتیب را از **نام** می‌خوانَد نه از اندازه یا ترتیبِ
       درایو، و مجموعهٔ ناقص را رد می‌کند — چون نیمِ یک قسمت که منتشر شود
       مثلِ یک قسمتِ دیرشده برگشت‌پذیر نیست (۶٫۱). ساختنِ تعریفِ دومِ
       «صوتِ کاملِ قسمت» یعنی روزی یکی از آن دو بی‌صدا کهنه می‌شود.
       کلیدش `parts` است؛ نسخهٔ اولِ همین تابع `files` خواند و هر درخواست
       با «فایلِ صوتی‌ای نیست» رد می‌شد — آزمون گرفتش. */
    var got = ytAudioParts_(fold);
    var list = (got && got.parts) || [];
    for (var i = 0; i < list.length; i++) {
      out.push({ id: list[i].getId(), name: list[i].getName() });
    }
  } catch (e) {}
  return out;
}

/**
 * این قسمت با شیوهٔ خواندنِ **همین** گوینده خوانده شده بود؟
 *
 * ══ چرا این پرسش وجود دارد (۷٫۷۳) ══
 * صاحبِ برنامه قسمتِ ۴۹ را کامل شنید و گفت «مثل کسی می‌خواند که متوجه
 * نیست چه می‌خواند و فقط صدایش مثلِ رضوی است». درست بود، و علتش ساختاری
 * است نه کیفی: RVC **رنگ** را عوض می‌کند و هیچ تصمیمی دربارهٔ مکث و کشش
 * و دامنه نمی‌گیرد. آن‌ها ورودیِ این مدل‌اند، نه خروجی‌اش (۷٫۳۴) — و از
 * خوانشِ جمینای می‌آیند، یعنی از بخشِ ۳۲.
 *
 * صوتِ قسمتِ ۴۹ ماه‌ها پیش و با خوانشِ عادی ساخته شده بود. پس پل رنگ را
 * درست گذاشت و روحی نبود که بگذارد. و تلگرام همان را «قسمت ۴۹ با صدای
 * رضوی» نامید — ادعایی که نیمی‌اش درست بود و **هیچ‌کجا گفته نشد**. همان
 * شکلِ ۷٫۲۴: ادعای کمی-نادرست از بی-ادعا بدتر است، چون کسی دوباره
 * وارسی‌اش نمی‌کند.
 *
 * ══ و «نامعلوم» ≠ «نه» ══
 * قسمت‌های پیش از ۷٫۷۳ `__persona` را در پروندهٔ خود ندارند، چون تا این
 * نسخه هیچ‌جا نوشته نمی‌شد. نبودنِ نشانه یعنی نمی‌دانیم، و هشداری که برای
 * حالتِ سالم هم بلند شود، همان هشداری است که خوانده نمی‌شود (۷٫۴۰).
 */
/**
 * برچسبِ ردیف برای نمونهٔ «رنگ و روح» — و **چرا از خودِ کار پرسیده می‌شود**.
 *
 * ══ ۷٫۷۹ ══
 * تا اینجا `soul: 'روح'` ثابت نوشته می‌شد، چون این مسیر همین حالا متن را با
 * شیوهٔ خواندنِ خودِ گوینده می‌خوانَد. ادعا درست بود **به شرطی که دستورِ لحن
 * به مدل برسد** — و ۲۷ سپتامبر نرسید: مدلِ صوتی قالبش را نپذیرفت و
 * `ttsCue.on` خاموش شد. ثابت‌نویسیِ «روح» یعنی ادعایی که هیچ ورودی ندارد،
 * و ادعای بی‌ورودی همیشه بالاخره دروغ می‌شود.
 *
 * سدِ اصلی بالاتر است (اگر لحن خاموش باشد نمونه ساخته نمی‌شود). این تابع
 * حالتِ دومی را می‌گیرد: لحن **وسطِ ساخت** خاموش شود. آن‌وقت ردیف باید
 * «رنگ‌تنها» برود، وگرنه کپشنِ تلگرام و سطرِ روزانه چیزی می‌گویند که نشد.
 */
/** مهرِ «آخرین باری که یک تکه بی‌دستور ساخته شد» — رشته، یا خالی. */
function ttsCueDropAt_() {
  try { return String(props_().getProperty(PK.TTS_CUE_DROP_AT) || ''); } catch (e) { return ''; }
}

/* ══ و شاهدِ نشانه‌ها روی **ردیف**، نه در پیامِ پنجره‌ای که کسی نمی‌بیند (۸٫۱۴) ══
   ۸٫۱۰ این را درست نوشت: «آنچه در نمونه نیست، به نام گفته می‌شود … سکوت
   این‌جا یعنی او چهار دقیقه گوش می‌دهد و خیال می‌کند دربارهٔ گیومه قضاوت
   کرده، در حالی که گیومه‌ای نبوده.» و همان جمله را در `say()` گذاشت — یعنی
   در پنجرهٔ دکمهٔ منو.

   ولی از ۷٫۸۲/۷٫۸۴ آن دکمه **دیگر راهِ اصلی نیست**: نمونه را `VOICE_SOUL_SEED`
   هر روز خودش زمان‌بندی می‌کند و هیچ انسانی پنجره‌ای باز نمی‌کند. پس آن
   جمله به هیچ‌کس نمی‌رسید — عیناً ۷٫۶۲: درمانی که روی راهی گذاشته شده که
   پیموده نمی‌شود. و شاهدش با پایانِ اجرا می‌مُرد (۷٫۴۴).

   مدرکِ واقعیِ ۱ اکتبر: ردیفِ «نمونهٔ روح — razavi · نشانه‌گذاریِ لحن:53»
   با `soul: رنگ‌تنها` بسته شد، یعنی `marks` دروغ نبود — **خالی** بود: متنِ
   نمونه‌ای که نامش «نشانه‌گذاریِ لحن» است به سقفِ `SPEAK_PROSODY_MIN` نرسید،
   و هیچ‌جا — نه ردیف، نه کپشن — این را نگفت. فایل با همان نام رفت.

   پس عدد و پوشش روی ردیف می‌نشینند و از آن‌جا به کپشنِ تلگرام می‌روند، چون
   او همان‌جا می‌شنود نه در درایو (۷٫۶۸/۵٫۹۰). و `why` دلیلِ نگرفتنِ ترمیم را
   می‌آورد تا فردا علت در صف باشد، نه در حافظهٔ یک اجرا. */
function vbrSoulTag_(cueBefore, label, dropBefore, marks, cover, rich, why) {
  var ev = {};
  if (cover) {
    ev.markHave = (cover.have && cover.have.length) ? cover.have.join(' · ') : '';
    ev.markMiss = (cover.miss && cover.miss.length) ? cover.miss.join(' · ') : '';
  }
  if (rich != null && isFinite(Number(rich))) ev.markRich = Number(rich);
  if (why) ev.markWhy = String(why);
  var fin = function (soul, soulWhy) {
    var r = { label: label, soul: soul, soulWhy: soulWhy };
    for (var k in ev) {
      if (Object.prototype.hasOwnProperty.call(ev, k)) r[k] = ev[k];
    }
    return r;
  };
  var now = null;
  try { now = ttsCueStatus_(); } catch (e) { now = null; }
  var onBefore = !(cueBefore && cueBefore.ok === false);
  var onNow = !(now && now.ok === false);
  /* ══ و شاهدِ رویداد، نه فقط پرچم (۷٫۸۹) ══
     قالبِ پیشوندی یعنی پرچم می‌تواند درست بماند در حالی که تکه‌ای واقعاً
     بی‌دستور ساخته شده. اگر مهرِ «دور انداخته شد» بینِ شروع و پایانِ همین
     ساخت عوض شده باشد، این نمونه رنگ‌تنهاست، هر چه پرچم بگوید. */
  var dropped = false;
  try { dropped = ttsCueDropAt_() !== String(dropBefore == null ? '' : dropBefore); }
  catch (eD) { dropped = false; }
  if (onBefore && onNow && !dropped) {
    return fin('روح', 'همین حالا با شیوهٔ خواندنِ خودش خوانده شد');
  }
  var how = (dropped ? 'دستورِ لحن در ساختِ دستِ‌کم یک تکه دور انداخته شد'
                    : 'دستورِ لحن وسطِ ساخت خاموش شد') +
            ((now && now.model) ? ' (مدلِ «' + now.model + '»)' : '');
  /* ══ حالتِ سوم، چون دو تا دیگر هیچ‌کدام راست نبودند (۸٫۰۹) ══
     «رنگ‌تنها» یعنی هیچ‌چیز لحن را نبرده؛ ولی اگر متن نشانهٔ لحن داشته
     باشد، لحن از همان‌جا رفته و «رنگ‌تنها» دروغ است — از آن سمتی که ۷٫۷۹
     دربارهٔ «روح» هشدار داد. و «روح» هم نیست، چون کارتِ شیوهٔ خواندن به
     مدل نرسید. پس نامِ خودش را دارد، و در کپشن هم دیده می‌شود. */
  if (marks) {
    return fin('لحن از نشانه‌ها',
               how + '؛ ولی متن نشانه‌گذاریِ لحن دارد، پس لحن از ' +
               'نشانه‌های متن می‌آید نه از کارتِ شیوهٔ خواندن');
  }
  return fin('رنگ‌تنها',
             how + '؛ بخشی از این نمونه بی شیوهٔ خواندن ساخته شده');
}

function vbrSoul_(folderId, speakerKey) {
  var out = { state: 'نامعلوم', why: 'پروندهٔ قسمت خوانده نشد' };
  var meta = null;
  try {
    meta = ytEpisodeMeta_(DriveApp.getFolderById(String(folderId)));
  } catch (e) {
    out.why = 'پوشهٔ قسمت باز نشد: ' + String((e && e.message) || e).slice(0, 60);
    return out;
  }
  if (!meta || !meta.ep) return out;
  var ep = meta.ep;
  if (typeof ep.__persona === 'undefined') {
    out.why = 'این قسمت پیش از ثبتِ شیوهٔ خواندن ساخته شده؛ معلوم نیست';
    return out;
  }
  var p = ep.__persona;
  if (!p || !String(p.key || '').trim()) {
    out.state = 'رنگ‌تنها';
    out.why = 'با خوانشِ عادی خوانده شده، نه با شیوهٔ خواندنِ او';
    return out;
  }
  if (String(p.key) === String(speakerKey || '')) {
    out.state = 'روح';
    out.why = 'با شیوهٔ خواندنِ خودش خوانده شده';
    return out;
  }
  out.state = 'رنگ‌تنها';
  out.why = 'با شیوهٔ خواندنِ «' + String(p.name || p.key) + '» خوانده شده';
  return out;
}

/**
 * یک قسمت را به صف بگذار.
 *
 * ══ سقف چه چیزی را می‌شمرد (درسِ ۶٫۳۷) ══
 * «منتظرِ ساخت» و «منتظرِ برداشت» دو چیزند. سقفی که دومی را هم بشمرد،
 * وقتی برداشت یک بار شکست بخورد **برای همیشه** صف را قفل می‌کند و از
 * بیرون همه‌چیز سالم به نظر می‌رسد. این سقف فقط ردیف‌هایی را می‌شمرد که
 * هنوز خروجی‌شان ساخته نشده.
 */
function vbrAsk_(show, epNum, folderId, speaker, title, opts) {
  if (CFG.VBR_ON === false) return { ok: false, why: 'پل خاموش است' };
  var key = String(show) + ':' + String(epNum);
  var d = vbrRead_();
  for (var i = 0; i < d.items.length; i++) {
    if (String(d.items[i].key) === key) return { ok: false, why: 'قبلاً خواسته شده' };
  }
  var map = vbrMapCached_();
  var pend = 0;
  for (var j = 0; j < d.items.length; j++) {
    var x = d.items[j];
    if (String(x.status || '') !== 'در انتظار') continue;
    if (map && map[String(x.key)] && map[String(x.key)].url) continue;   // ساخته شده
    pend++;
  }
  var cap = Math.max(1, Number(CFG.VBR_MAX) || 4);
  if (pend >= cap) return { ok: false, why: 'صف پر است (' + pend + ')' };

  var mdl = vbrModel_(speaker);
  if (!mdl.ok) return { ok: false, why: mdl.why };
  /* ══ گام، به ازای هر گوینده (۷٫۸۱) ══
     تا امروز `CFG.VBR_PITCH` سراسری بود: عددی که برای رضوی سنجیده شد، روی
     هر کسی. گلدوز با آن −۱۲ عددِ ۰٫۵۵۶ گرفت و با گامِ ۰، ۰٫۷۸۶ — یعنی
     «اصلا مثل خودش نیست» از همین یک عدد می‌آمد. `src` هم ذخیره می‌شود،
     چون «پیش‌فرض» یعنی این گام برای این آدم هرگز سنجیده نشده و ردیف باید
     بتواند همین را بگوید. یک خواندنِ شیت اینجا هزینه نیست: `vbrModel_` و
     `vbrAudio_` هر دو پوشهٔ درایو را می‌گردند و این تابع شبی چند بار
     صدا زده می‌شود، نه روی مسیرِ داغ (۷٫۶۳/۷٫۷۲). */
  var pit = personaPitch_(speaker);
  var au = vbrAudio_(folderId);
  if (!au.length) return { ok: false, why: 'فایلِ صوتی‌ای در پوشهٔ قسمت نیست' };

  var row = { key: key, show: String(show), ep: String(epNum),
              title: String(title || ''), folderId: String(folderId || ''),
              speaker: String(speaker), tries: 0, at: nowStr_(),
              status: 'در انتظار',
              model: { pth: mdl.pth, index: mdl.index },
              params: { pitch: pit.pitch,
                        /* پیش‌فرضِ اینجا باید با `CFG` یکی باشد: اگر
                           روزی آن کلید نباشد، این خط بی‌صدا همان ۱٫۰ را
                           برمی‌گرداند که ۷٫۷۰ عمداً کنارش گذاشت. دو عدد
                           در دو جا که کسی با هم نسنجیده باشد — ۷٫۳۰/۷٫۳۱. */
                        indexRate: String(CFG.VBR_INDEX_RATE || '1.0'),
                        protect: String(CFG.VBR_PROTECT || '0.33') },
              pitchSrc: pit.src,
              audio: [] };
  /* گامِ بالا پشتیبان است؛ اگر هدف هست، گردش‌کار گام را از زیروبمِ خودِ
     ورودی حساب می‌کند (۸٫۲۴). */
  if (pit.targetHz) row.params.targetHz = String(pit.targetHz);
  /* ══ و هدف از ضبط‌های خودِ گوینده، وقتی CFG چیزی نگفته (۸.۳۷) ══
     کارتِ سبک زیروبمِ او را می‌سنجد و از ۸.۳۷ در `docs/voices.json` نگه
     می‌دارد. گلدوز هفته‌ها با گامِ ثابت ساخته شد در حالی که عددش در سیاههٔ
     همان اجرا بود. دستِ او در ردیف هنوز برنده است (۷٫۸۱). */
  else if (pit.src !== 'ردیفِ خودش') {
    var hz = vbrStyleHz_(speaker);
    if (hz) {
      row.params.targetHz = hz;
      row.pitchSrc = 'خودکار، هدف ' + hz + ' هرتز (زیروبمِ ضبط‌های خودش)';
    }
  }
  for (var a = 0; a < au.length; a++) {
    try { driveShareOn_(au[a].id); } catch (eA) {}
    row.audio.push({ id: au[a].id, name: au[a].name, url: ytDlUrl_(au[a].id) });
  }
  row.shared = true;
  var o = opts || {};
  /* برچسبِ نمایشی، وقتی این ردیف «خودِ قسمت» نیست بلکه نمونه‌ای از آن است
     (۷٫۷۴). بی آن، فایل و کپشنِ تلگرام «قسمت ۴۹ با صدای …» می‌شدند برای
     چیزی که چهار دقیقه از آن قسمت است — همان ادعای نیمه‌ای که این نسخه و
     نسخهٔ پیش هر دو دربارهٔ آن نوشته‌اند. */
  if (o.label) row.label = String(o.label);
  /* رنگ و روح، و کدامش را این ردیف می‌آورد (۷٫۷۳). اینجا سنجیده می‌شود نه
     سرِ تحویل: پروندهٔ قسمت همین حالا در دسترس است و ماه‌ها بعد ممکن است
     نباشد — و اگر سرِ تحویل خوانده شود، یک خطای گذرا ادعا را بی‌صدا به
     «نامعلوم» تنزل می‌دهد. */
  if (o.soul) { row.soul = String(o.soul); row.soulWhy = String(o.soulWhy || ''); }
  else {
    try {
      var sl = vbrSoul_(folderId, speaker);
      row.soul = sl.state; row.soulWhy = sl.why;
    } catch (eSl) { row.soul = 'نامعلوم'; row.soulWhy = 'سنجیده نشد'; }
  }
  /* ══ شاهدِ نشانه‌های لحن، اگر این ردیف نمونه‌ای است که آن را سنجیده (۸٫۱۴) ══
     حضورشان شرط است نه همیشگی: ردیفِ «خودِ قسمت» چنین سنجشی ندارد و نوشتنِ
     رشتهٔ خالی روی آن یعنی کپشن هر شب دربارهٔ چیزی حرف بزند که سنجیده نشده —
     و «نسنجیده» با «نبودن» یکی نیست (۸٫۰۵). */
  if (o.spanLine) row.spanLine = String(o.spanLine).slice(0, 260);
  if (o.markHave != null || o.markMiss != null) {
    row.markHave = String(o.markHave == null ? '' : o.markHave);
    row.markMiss = String(o.markMiss == null ? '' : o.markMiss);
    if (o.markRich != null) row.markRich = Number(o.markRich);
    if (o.markWhy) row.markWhy = String(o.markWhy);
  }
  d.items.push(row);
  return vbrSave_(d) ? { ok: true, key: key, parts: row.audio.length }
                     : { ok: false, why: 'صف ذخیره نشد' };
}

/**
 * شناسهٔ صف همان است که گردش‌کار دنبالش می‌گردد؟
 *
 * این تله دو بار در این مخزن افتاده (`ytQueueIdOk_`, `vintQueueIdOk_`) و
 * شکلش هر بار یکی است: فایل پاک و دوباره ساخته می‌شود، `putOutJson_`
 * شناسهٔ تازه می‌دهد، گردش‌کار همچنان کهنه را می‌خوانَد، و **هیچ خطایی
 * بلند نمی‌شود** — صف پر است و هیچ قسمتی تبدیل نمی‌شود. دو بار کافی
 * است؛ این یکی از روزِ اول وارسی می‌شود.
 *
 * «نشد» ≠ «عوض شد»: اگر پوشه خوانده نشود یا فایل هنوز ساخته نشده باشد،
 * این یک اتهام نیست.
 */
function vbrQueueIdOk_() {
  var want = String(CFG.VBR_QUEUE_ID || ''), got = '';
  if (!want) return { ok: true, want: '', got: '' };
  try {
    var it = outFolder_().getFilesByName(vbrFileName_());
    if (it.hasNext()) got = it.next().getId();
  } catch (e) { return { ok: true, want: want, got: '' }; }
  if (!got) return { ok: true, want: want, got: '' };
  return { ok: got === want, want: want, got: got };
}

/**
 * صفِ پل در درایو «هرکس با لینک» هست؟ — و اگر نیست، همین‌جا باز می‌شود.
 *
 * ══ چرا این لازم شد، یک روز بعد از اینکه قرینه‌اش را ساختم (۷٫۳۹) ══
 * ۷٫۳۳ همین را برای صفِ **گویندگان** ساخت، با این جمله در توضیحش:
 * «تشخیص و اصلاح به یک مسیرِ بسته گره خورده بودند». بخشِ ۳۶ را روزِ بعد
 * نوشتم و همان گره را دوباره ساختم — و این بار سفت‌تر:
 *
 * `vbrSave_` تنها جایی است که اشتراک را باز می‌کند، و فقط از دو راه
 * صدا زده می‌شود: `vbrAsk_` که **گویندهٔ روشن** لازم دارد، و
 * `vbrIngest_` که **ردیفِ موجود** لازم دارد. یعنی تا وقتی صاحبِ برنامه
 * ردیفی را روشن نکرده، صف هرگز باز نمی‌شود و هر اجرای گردش‌کار تا ابد
 * قرمز می‌مانَد — بی آنکه موتور جایی بگوید چرا.
 *
 * و هیچ نگهبانی نمی‌گرفتش: `vbrStuckCheck_` شرطش `waiting > 0` است و
 * صفِ خالی ساختاراً از آن دروازه رد نمی‌شود. یعنی **دقیقاً در حالتی که
 * هشدار لازم است، خاموش بود** — همان زنگِ ۷٫۲۲ و ۷٫۲۷، بارِ سوم.
 *
 * پس این وارسی از آن مسیر مستقل است، از `healthCheck` صدا زده می‌شود،
 * و **خودش باز می‌کند**: دری که آدم باید دستی بازش کند در نیست (۵٫۹۵).
 */
function vbrQueueShare_() {
  var out = { ok: true, missing: false, fixed: false, error: '' };
  var f = null;
  try {
    var it = outFolder_().getFilesByName(vbrFileName_());
    if (it.hasNext()) f = it.next();
  } catch (e) { out.error = e.message; return out; }   // نشد ≠ بسته است
  if (!f) { out.missing = true; return out; }          // هنوز ساخته نشده: تقصیر نیست
  try {
    if (String(f.getSharingAccess()) === String(DriveApp.Access.ANYONE_WITH_LINK)) return out;
  } catch (e2) { out.error = e2.message; return out; }
  out.ok = false;
  out.fixed = driveShareOn_(f.getId());
  if (!out.fixed && !out.error) out.error = 'setSharing نشد';
  return out;
}

/** نقشهٔ خروجی‌ها، از gitHub raw. یک بار در هر اجرا. */
var _vbrMapMemo = null;
function vbrMapCached_() {
  if (_vbrMapMemo !== null) return _vbrMapMemo;
  try { _vbrMapMemo = vbrMap_(); } catch (e) { _vbrMapMemo = null; }
  return _vbrMapMemo;
}

function vbrMap_() {
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.VBR_MAP || 'docs/voice-renders.json'),
                { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    var d = JSON.parse(res.getContentText());
    var m = (d && d.items) || null;
    return (m && typeof m === 'object' &&
            Object.prototype.toString.call(m) !== '[object Array]') ? m : null;
  } catch (e) { return null; }
}

/**
 * بایت‌هایی که رسیدند واقعاً WAV هستند یا نه.
 *
 * همان قاعدهٔ `musicFetch_` و `ytMp4Ok_`: نه پسوند، نه `Content-Type` —
 * سرآیندِ خودِ فایل. صفحهٔ خطای گیت‌هاب هم بایت برمی‌گرداند، و فایلِ
 * خرابی که در پوشهٔ قسمت بنشیند یک روز پخش می‌شود.
 */
function vbrWavOk_(blob) {
  var b = null;
  try { b = blob.getBytes(); } catch (e) { return { ok: false, why: 'بایت‌ها خوانده نشدند' }; }
  var min = Math.max(1000, Number(CFG.VBR_MIN_BYTES) || 200000);
  if (!b || b.length < min) {
    return { ok: false, why: 'فایل بسیار کوچک است (' + (b ? b.length : 0) + ' بایت)' };
  }
  var riff = '', wave = '';
  for (var i = 0; i < 4; i++) riff += String.fromCharCode(b[i] & 0xFF);
  for (var j = 8; j < 12; j++) wave += String.fromCharCode(b[j] & 0xFF);
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    return { ok: false, why: 'WAV نیست — سرآیندِ RIFF/WAVE ندارد' };
  }
  return { ok: true, why: '' };
}

/** نامِ فایلِ تبدیل‌شده — خودش را معرفی می‌کند، تا با اصل اشتباه نشود. */
function vbrOutName_(item, speakerName) {
  var base = String((item && item.label) || ('قسمت ' + String(item.ep)));
  return base + String(CFG.VBR_SUFFIX || ' — با صدای ') +
         String(speakerName || item.speaker) + '.wav';
}

/**
 * نامِ یک تکه. تکِ تنها همان نامِ قبلی را دارد؛ چندتایی «۱ از ۲» می‌گیرد.
 *
 * همان قاعدهٔ نام‌گذاریِ `ytAudioParts_` در بخشِ ۲۷: ترتیب از **نام**
 * خوانده می‌شود، نه از حجم و نه از ترتیبِ گشتنِ درایو.
 */
function vbrPieceName_(item, speakerName, i, n) {
  var nm = vbrOutName_(item, speakerName);
  if (Number(n) <= 1) return nm;
  var fa = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
  return nm.replace(/\.wav$/, '') + ' ' + fa(i + 1) + ' از ' + fa(n) + '.wav';
}

/**
 * تکه‌های یک خروجی، به ترتیب — و **هرگز نیمی از یک مجموعه**.
 *
 * ══ چرا نقشه دو شکل دارد ══
 * تا ۷٫۶۵ نقشه یک `url` داشت. اولین خروجیِ واقعی ۷۰٫۹ مگابایت شد و
 * `UrlFetchApp` سقفِ ۵۰ مگابایتی دارد، پس از ۷٫۶۶ گردش‌کار خروجی را
 * تکه‌تکه می‌کند و `urls` می‌نویسد. `url` فقط وقتی نوشته می‌شود که
 * **یک** تکه باشد — عمدی: موتورِ قدیمی‌تر که `urls` را نمی‌شناسد، در
 * حالتِ چندتکه هیچ چیز برنمی‌دارد و منتظر می‌مانَد، به‌جای اینکه نیمی از
 * قسمت را کنارِ اصل بگذارد. همان امتناعِ `ytAudioParts_` از انتشارِ
 * مجموعهٔ ناقص؛ نیمهٔ یک قسمت از تأخیرِ یک قسمت بدتر است.
 */
function vbrHitPieces_(hit) {
  var out = [];
  if (!hit) return out;
  var us = hit.urls;
  if (us && Object.prototype.toString.call(us) === '[object Array]' && us.length) {
    var bs = (Object.prototype.toString.call(hit.pieceBytes) === '[object Array]')
      ? hit.pieceBytes : [];
    for (var i = 0; i < us.length; i++) {
      if (!us[i]) return [];                 // یک نشانیِ غایب ⇒ مجموعه ناقص است
      out.push({ url: String(us[i]), bytes: Number(bs[i]) || 0 });
    }
    return out;
  }
  if (hit.url) out.push({ url: String(hit.url), bytes: Number(hit.bytes) || 0 });
  return out;
}

/** یک تکه را بردار و کنارِ اصل بگذار. اصل دست نمی‌خورد. */
function vbrFetchOne_(item, piece, nm) {
  /* ══ سقف پیش از دانلود سنجیده می‌شود، نه بعدش (۷٫۶۶) ══
     نقشه خودش حجم را نوشته، پس این سنجش **هیچ فراخوانِ شبکه‌ای ندارد** —
     و مهم‌تر: خطای «پاسخ بزرگ‌تر از حد» چیزی است که هیچ تلاشِ دوباره‌ای
     حلش نمی‌کند، پس نباید به‌عنوانِ تلاشِ ناموفق شمرده شود. `hard` همین
     را می‌گوید. */
  var cap = Math.max(1000000, Number(CFG.VBR_MAX_BYTES) || 45000000);
  if (piece.bytes && piece.bytes > cap) {
    return { ok: false, hard: true,
             why: 'تکه ' + Math.round(piece.bytes / 1000000) + ' مگابایت است و ' +
                  'سقفِ برداشتِ ما ' + Math.round(cap / 1000000) +
                  ' مگابایت — گردش‌کار باید ریزتر تکه کند' };
  }
  var res = null;
  try {
    res = UrlFetchApp.fetch(String(piece.url), { muteHttpExceptions: true, followRedirects: true });
  } catch (e) { return { ok: false, why: 'دانلود نشد: ' + String(e.message).slice(0, 80) }; }
  if (res.getResponseCode() !== 200) return { ok: false, why: 'کدِ ' + res.getResponseCode() };
  var blob = null;
  try { blob = res.getBlob(); } catch (e2) { return { ok: false, why: 'بایت‌ها خوانده نشدند' }; }
  var chk = vbrWavOk_(blob);
  if (!chk.ok) return { ok: false, why: chk.why };
  try {
    var fold = DriveApp.getFolderById(String(item.folderId));
    // هم‌نامِ قبلی؟ جایگزین می‌شود، ولی **اصل** هرگز دست نمی‌خورد.
    var old = fold.getFilesByName(nm);
    while (old.hasNext()) { try { old.next().setTrashed(true); } catch (eT) {} }
    var f = fold.createFile(blob.setName(nm));
    return { ok: true, why: '', id: f.getId(), name: nm,
             bytes: (blob.getBytes() || []).length };
  } catch (e3) { return { ok: false, why: 'در پوشه ننشست: ' + String(e3.message).slice(0, 80) }; }
}

/**
 * کلِ خروجی را بردار — همه‌اش یا هیچ‌اش.
 *
 * تکه‌ای که نشست و بعد تکهٔ بعدی نیامد، **پاک می‌شود**: مجموعهٔ نیمه در
 * پوشهٔ قسمت همان چیزی است که بخشِ ۲۷ از انتشارش امتناع می‌کند، و اینجا
 * بدتر هم هست چون نامش می‌گوید «با صدای فلانی» و کسی که بشنود فکر
 * می‌کند قسمت همین‌قدر بوده.
 */
function vbrFetch_(item, hit, speakerName) {
  var ps = vbrHitPieces_(hit);
  if (!ps.length) return { ok: false, why: 'نقشه نشانیِ کاملی ندارد' };
  var made = [], bytes = 0, names = [];
  for (var i = 0; i < ps.length; i++) {
    var nm = vbrPieceName_(item, speakerName, i, ps.length);
    var r = vbrFetchOne_(item, ps[i], nm);
    if (!r.ok) {
      for (var j = 0; j < made.length; j++) {
        try { DriveApp.getFileById(made[j]).setTrashed(true); } catch (eT) {}
      }
      return { ok: false, hard: r.hard === true,
               why: (ps.length > 1 ? 'تکهٔ ' + (i + 1) + ' از ' + ps.length + ': ' : '') + r.why };
    }
    made.push(r.id); names.push(r.name); bytes += Number(r.bytes) || 0;
  }
  return { ok: true, why: '', id: made[0], ids: made,
           name: names.join(' + '), bytes: bytes, pieces: ps.length };
}

/** اشتراکِ موقتِ یک ردیف را پس بگیر — پیش از بستنِ ردیف، نه بعدش. */
function vbrUnshare_(item) {
  var n = 0;
  var au = (item && item.audio) || [];
  for (var i = 0; i < au.length; i++) {
    try { if (driveShareOff_(au[i].id)) n++; } catch (e) {}
  }
  return n;
}

/**
 * پاسخ‌ها را بردار و ردیف‌ها را ببند.
 *
 * ردیفی که خروجی‌اش نیامده دست نمی‌خورد؛ ردیفی که آمده و برداشته شد
 * «رسید» می‌شود و اشتراکش پس گرفته می‌شود. تلاشِ ناموفق شمرده می‌شود و
 * پس از `VBR_TRY_MAX` ردیف «رهاشده» می‌شود — **جدا از «در انتظار»
 * شمرده می‌شود**، چون «در انتظار» یعنی هنوز قرار است اتفاقی بیفتد و
 * گزارشِ چیزی که هرگز نمی‌افتد به‌عنوانِ «در انتظار» همان است که هشدار
 * را به نویز تبدیل می‌کند (۵٫۸۸).
 */
function vbrIngest_(hub) {
  var out = { got: [], failed: [], unshared: 0, abandoned: 0, told: 0, tooBig: 0 };
  if (CFG.VBR_ON === false) return out;
  var map = vbrMapCached_();
  if (!map) return out;
  var d = vbrRead_(), changed = false;
  var names = {};
  try { names = vbrSpeakerNames_(); } catch (eN) { names = {}; }
  for (var i = 0; i < d.items.length; i++) {
    var it = d.items[i];
    if (String(it.status || '') !== 'در انتظار') continue;
    var hit = map[String(it.key)];
    if (!hit || !vbrHitPieces_(hit).length) continue;
    var r = vbrFetch_(it, hit, names[String(it.speaker)] || it.speaker);
    if (r.ok) {
      it.status = 'رسید'; it.doneAt = nowStr_(); it.outId = r.id;
      if (it.hardWhy) delete it.hardWhy;
      it.outName = r.name; it.bytes = r.bytes;
      it.seconds = Number(hit.seconds) || 0;
      it.pieces = Number(r.pieces) || 1;
      if (r.ids && r.ids.length > 1) it.outIds = r.ids;
      it.jobMinutes = Number(hit.minutes) || 0;
      /* گام و زیروبمِ خروجی، از گزارشِ خودِ گردش‌کار (۸٫۲۴) — تا کپشن عددی
         را بگوید که پیش از گوشِ او سنجیده شد، نه یک ادعا. */
      if (hit.pitch != null) it.pitchUsed = String(hit.pitch);
      if (hit.pitchAuto) it.pitchAuto = hit.pitchAuto;
      if (hit.f0Out) it.f0Out = hit.f0Out;
      if (hit.f0Warn) it.f0Warn = String(hit.f0Warn);
      if (hit.loud) it.loud = hit.loud;          // بلندیِ پیش و پس (۸.۳۷)
      out.unshared += vbrUnshare_(it);
      /* خبر در تلگرام، **پس از** بسته‌شدنِ ردیف و داخلِ try: یک قطعیِ
         تلگرام نباید ردیفی را که واقعاً رسیده ناموفق کند. */
      var tell = { sent: false, how: '', why: 'صدا زده نشد' };
      try { tell = vbrTgTell_(it, names[String(it.speaker)] || it.speaker, r); }
      catch (eT) { tell = { sent: false, how: '', why: eT.message }; }
      if (tell.sent) out.told = (Number(out.told) || 0) + 1;
      out.got.push({ key: it.key, name: r.name, bytes: r.bytes,
                     seconds: it.seconds, minutes: it.jobMinutes,
                     told: tell.sent, how: tell.how });
      vbrLog_(hub, it, 'رسید', r.name +
              (tell.sent ? ' · تلگرام: ' + tell.how : ' · تلگرام نرفت: ' + tell.why));
    } else if (r.hard) {
      /* ══ سقف، تلاشِ ناموفق نیست (۷٫۶۶) ══
         تلاش شمردن یعنی پس از `VBR_TRY_MAX` ردیف «رهاشده» می‌شود — و
         «رهاشده» یعنی «دیگر اتفاقی نمی‌افتد»، که برای خرابیِ خودِ ما
         دروغ است: خروجی آمده، فقط ریزتر تکه نشده. شبانه هم هر شب تلاش
         می‌کند، پس بی این تفکیک قسمتِ ۴۹ سه شب بعد خودبه‌خود رها می‌شد.
         همان قاعدهٔ «رهاشده جدا از عقب‌مانده» (۵٫۸۸) و «هشدار با موضوعِ
         غلط» (۷٫۱۸/۷٫۳۲).

         و ردیف در کارنامه فقط وقتی نوشته می‌شود که **دلیل عوض شده** —
         وگرنه هر شب یک ردیفِ تکراری، که کارنامه را بی‌مصرف می‌کند. */
      var was = String(it.hardWhy || '');
      it.lastWhy = r.why; it.hardWhy = r.why;
      out.tooBig++;
      if (was !== r.why) vbrLog_(hub, it, 'برداشته نشد', r.why);
      out.failed.push({ key: it.key, why: r.why, tries: Number(it.tries) || 0, hard: true });
      changed = changed || (was !== r.why);
      continue;
    } else {
      it.tries = (Number(it.tries) || 0) + 1;
      it.lastWhy = r.why;
      /* شکستِ نرم یعنی سقف دیگر مانع نیست (گردش‌کار ریزتر تکه کرده) — پس
         شاهدِ سقف پاک می‌شود، وگرنه یک حالتِ رفع‌شده تا ابد گزارش می‌شود. */
      if (it.hardWhy) delete it.hardWhy;
      var max = Math.max(1, Number(CFG.VBR_TRY_MAX) || 3);
      if (it.tries >= max) {
        it.status = 'رهاشده'; it.doneAt = nowStr_();
        out.unshared += vbrUnshare_(it);
        out.abandoned++;
        vbrLog_(hub, it, 'رهاشده', r.why);
      } else {
        vbrLog_(hub, it, 'ناموفق', r.why);
      }
      out.failed.push({ key: it.key, why: r.why, tries: it.tries });
    }
    changed = true;
  }
  if (changed) vbrSave_(d);
  return out;
}

/**
 * فایلِ تبدیل‌شده رسید ⇒ همان‌جا در تلگرام بگو (۷٫۵۳).
 *
 * ══ چرا لازم شد ══
 * خواستهٔ صریحِ صاحبِ برنامه: «همین صوتِ قدیمی که با صدای رضوی یا هرکسِ
 * دیگه‌ست تو تلگرامم ارسال کنه که یادم بمونه گوشش بدم».
 *
 * و دلیلِ عمیق‌ترش همان قاعدهٔ همیشگیِ این پرونده است: **صاحبِ برنامه
 * درایو را باز نمی‌کند.** فایلی که فقط در یک پوشه بنشیند، عملاً ساخته
 * نشده — و کلِ این بخش برای یک قضاوت ساخته شده که فقط او می‌تواند
 * بکند: «شبیهِ اوست؟». قضاوتی که به یادآوری بند باشد، همان قضاوتی است
 * که انجام نمی‌شود.
 *
 * ══ سه پله، چون اندازه دستِ ما نیست ══
 * تلگرام برای ربات سقفِ حجم دارد و صوتِ یک قسمت WAV است، نه MP3 — یعنی
 * یک قسمتِ بلند می‌تواند از سقف رد شود. پس: اول `sendAudio` (که همان‌جا
 * قابلِ پخش است و بهترین حالت است)، بعد `sendDocument`، و اگر هیچ‌کدام
 * نشد **دستِ‌کم یک پیام با لینک**. سقوط به سمتِ «کمتر راحت» است، نه به
 * سمتِ سکوت — چون سکوت یعنی او هرگز نمی‌فهمد فایلی آمده.
 * همان پلهٔ `sendAudio` → `sendDocument` را بخشِ ۷ از روزِ اول دارد؛
 * الگوی دومی ساخته نشد.
 *
 * ══ و هرگز کارِ اصلی را نمی‌شکند ══
 * فراخوانش در `vbrIngest_` داخلِ try است و نتیجه‌اش فقط گزارش می‌شود.
 * یک قطعیِ تلگرام نباید ردیفی را که واقعاً «رسید» است ناموفق کند.
 */
/**
 * یک سطرِ کوتاه دربارهٔ گام و زیروبمِ خروجی — یا هیچ (۸٫۲۴).
 * «−۱۲ ثابت» تا امروز هیچ‌جا گفته نمی‌شد، و همان بود که رضوی را یک اکتاو
 * زیرِ خودش می‌نشاند. عددی که گوش را از پیش خبر می‌کند، در کپشن می‌آید.
 */
function vbrPitchLine_(item, faD) {
  var f = faD || function (x) { return String(x); };
  if (!item) return '';
  var a = item.pitchAuto, o = item.f0Out, out = '';
  if (a && a.srcHz && a.targetHz) {
    out = 'گامِ خودکار ' + f(a.pitch) + ' نیم‌پرده (ورودی ' + f(Math.round(a.srcHz)) +
          ' ⇒ هدف ' + f(Math.round(a.targetHz)) + ' هرتز)';
  } else if (item.pitchUsed != null && String(item.pitchUsed) !== '') {
    out = 'گام ' + f(item.pitchUsed) + ' نیم‌پرده';
  }
  if (o && o.medianHz) {
    out += (out ? ' · ' : '') + 'خروجی ' + f(Math.round(o.medianHz)) + ' هرتز';
  }
  /* بلندی هم سنجیده و گفته می‌شود (۸.۳۷): «صدا و حجمش پایینه» تا امروز هیچ
     عددی پشتش نداشت، چون هیچ مرحله‌ای بلندیِ خروجی را نمی‌سنجید. */
  var L = item.loud;
  if (L && L.rawLufs != null && L.lufs != null) {
    out += (out ? ' · ' : '') + 'بلندی ' + f(Number(L.rawLufs).toFixed(1)) + ' ⇒ ' +
           f(Number(L.lufs).toFixed(1)) + ' LUFS';
  }
  if (item.f0Warn) out += (out ? ' · ' : '') + '⚠️ ' + String(item.f0Warn);
  return out ? '\n🎚 ' + tgEsc_(out) : '';
}

function vbrTgTell_(item, speakerName, got) {
  var out = { sent: false, how: '', why: '' };
  try {
    if (CFG.VBR_TELL === false) { out.why = 'خاموش'; return out; }
    if (!tgEnabled_()) { out.why = 'تلگرام تنظیم نشده'; return out; }
  } catch (e0) { out.why = 'تلگرام در دسترس نیست'; return out; }

  var who = String(speakerName || (item && item.speaker) || '—');
  var ep = String((item && item.ep) || '—');
  var title = String((item && item.title) || '');
  var link = '';
  try { link = driveLink_((got && got.id) || item.outId || ''); } catch (eL) { link = ''; }

  /* متن کوتاه می‌مانَد چون caption در تلگرام سقف دارد و این پیام قرار
     است **در گوشی** خوانده شود، نه روی صفحهٔ بزرگ. */
  /* ══ رنگ، یا رنگ و روح (۷٫۷۳) ══
     «قسمت ۴۹ با صدای رضوی» ادعایی بود که نیمی‌اش درست بود: رنگ عوض شده
     بود و شیوهٔ خواندن نه. حالا همان‌جا که ادعا می‌شود، گفته می‌شود — چون
     او از تلگرام می‌شنود، نه از درایو. و «نامعلوم» ساکت می‌مانَد: هشداری
     که برای حالتِ سالم هم بلند شود، خوانده نمی‌شود. */
  var soul = String((item && item.soul) || '');
  var soulLine = '';
  if (soul === 'روح') {
    soulLine = '\n\n🎨 <b>رنگ و روح، هر دو</b> — این قسمت با شیوهٔ خواندنِ خودش ' +
               'خوانده و بعد تبدیل شده.';
  } else if (soul === 'لحن از نشانه‌ها') {
    soulLine = '\n\n🎨 <b>رنگ، و لحن از نشانه‌های متن</b> — ' +
               tgEsc_(String((item && item.soulWhy) || '')) +
               '. یعنی تعجب و پرسش و تعلیق از نشانه‌های خودِ متن می‌آید.';
  } else if (soul === 'رنگ‌تنها') {
    soulLine = '\n\n⚠️ <b>فقط رنگ</b> — ' +
               tgEsc_(String((item && item.soulWhy) || '')) +
               '. پس مکث و کشش و دامنه از او نیست؛ تبدیل رنگ را عوض می‌کند، ' +
               'شیوهٔ خواندن را نه.';
  }
  /* ══ و آنچه در این نمونه **نیست**، همان‌جا که می‌شنود (۸٫۱۴) ══
     ۸٫۱۰ این جمله را ساخت و در `say()` گذاشت، یعنی در پنجرهٔ دکمهٔ منو — و
     از ۷٫۸۲/۷٫۸۴ نمونه را بذر می‌سازد و هیچ‌کس آن پنجره را باز نمی‌کند. پس
     جمله‌ای که ساخته شد تا او اشتباهی قضاوت نکند، به او نمی‌رسید.
     «نسنجیده» با «سالم» یکی نیست، و اگر نشانه‌ای در متن نباشد، شنیدنِ
     چهار دقیقه دربارهٔ آن نشانه **هیچ** جوابی نمی‌دهد. */
  var markLine = '';
  /* `faDigitsOut_` در بخشِ ۲۵ است و بارکنندهٔ جزئیِ آزمون‌ها ممکن است آن را
     نداشته باشد — همان گاردی که `faP` چند خط پایین‌تر دارد. */
  var faD = function (x) {
    try { return faDigitsOut_(String(x)); } catch (eF) { return String(x); }
  };
  if (item && item.markHave != null) {
    var mr = (item.markRich == null) ? '' :
             (' (' + tgEsc_(faD(item.markRich)) + ' در هزار نویسه)');
    markLine = '\n\n🎵 <b>نشانه‌های لحن در این نمونه</b>' + mr + ': ' +
               tgEsc_(String(item.markHave || '—'));
    if (String(item.markMiss || '')) {
      markLine += '\n⚠️ <b>در این نمونه نیست، پس دربارهٔ این‌ها قضاوت نکنید:</b> ' +
                  tgEsc_(String(item.markMiss));
    } else {
      markLine += '\n✅ هر هفت نشانه هست — هر هفت را می‌توانید بسنجید.';
    }
    if (String(item.markWhy || '')) {
      markLine += '\n' + tgEsc_(String(item.markWhy));
    }
  }
  /* ══ گام و حالت‌ها، کوتاه (۸٫۲۴) ══
     caption سقفِ ۱۰۲۴ نویسه دارد و از قبل پر است؛ پس این دو سطر فقط وقتی
     می‌نشینند که جا باشد — بلندترشدن یعنی شکستنِ کلِ ارسال، که بدتر از
     نگفتنِ دو عدد است. */
  var pitchLine = vbrPitchLine_(item, faD);
  var spanLine = (item && item.spanLine) ? '\n🎭 ' + tgEsc_(String(item.spanLine)) : '';
  var head = String((item && item.label) || ('قسمت ' + ep));
  var capOf = function (extra) {
    return '🎙 <b>' + tgEsc_(head) + ' با صدای ' + tgEsc_(who) + '</b>' +
           (title ? '\n' + tgEsc_(title) : '') +
           '\n\nاین <b>آزمایشی</b> است و کنارِ فایلِ اصلی نشسته — ' +
           'صوتی که منتشر و ایمیل شد عوض نشده.' + soulLine + markLine + extra +
           '\n\nتنها چیزی که هیچ کدی جوابش را نمی‌دهد: <b>شبیهِ اوست؟</b>';
  };
  var capLen = function (c) { return String(c).replace(/<[^>]+>/g, '').length; };
  var cap = capOf(pitchLine + spanLine);
  if (capLen(cap) > 1000) cap = capOf(pitchLine);
  if (capLen(cap) > 1000) cap = capOf('');

  /* ══ چند تکه ⇒ چند پیام، و هر کدام شمارهٔ خودش را دارد (۷٫۶۶) ══
     تا ۷٫۶۵ فقط `got.id` فرستاده می‌شد. با خروجیِ چندتکه آن یعنی نیمِ
     قسمت زیرِ عنوانِ «قسمت ۴۹ با صدای رضوی» — همان ادعای نیمه‌ای که
     همین نسخه در پوشهٔ درایو جلوش را گرفت. مرز در دو جا لازم است، چون
     او از تلگرام می‌شنود، نه از درایو. */
  var ids = (got && got.ids && got.ids.length) ? got.ids
            : [String((got && got.id) || item.outId || '')];
  var faP = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
  var okAny = false;
  for (var pi = 0; pi < ids.length; pi++) {
    var blob = null;
    try { blob = DriveApp.getFileById(String(ids[pi])).getBlob(); }
    catch (eB) { blob = null; }
    if (!blob) continue;
    var capP = cap + (ids.length > 1
      ? '\n\n<b>تکهٔ ' + faP(pi + 1) + ' از ' + faP(ids.length) + '</b>' : '');
    var ttl = (item && item.label ? String(item.label) : 'قسمت ' + ep) + ' — ' + who +
              (ids.length > 1 ? ' (' + (pi + 1) + '/' + ids.length + ')' : '');
    var done = false;
    try {
      tgApi_('sendAudio', { chat_id: tgChat_(), audio: blob, caption: capP,
                            parse_mode: 'HTML', title: ttl, performer: who });
      out.how = 'صوت'; done = true;
    } catch (e1) { out.why = String(e1 && e1.message || e1).slice(0, 80); }
    if (!done) {
      try {
        tgApi_('sendDocument', { chat_id: tgChat_(), document: blob,
                                 caption: capP, parse_mode: 'HTML' });
        out.how = 'فایل'; done = true;
      } catch (e2) { out.why = String(e2 && e2.message || e2).slice(0, 80); }
    }
    if (done) okAny = true;
    /* یک تکهٔ نرفته یعنی مجموعه ناقص رسیده — پس به پلهٔ لینک سقوط
       می‌کنیم، نه اینکه «رفت» بگوییم. */
    else { okAny = false; break; }
  }
  if (okAny) { out.sent = true; return out; }

  /* آخرین پله: حجم از سقف رد شده یا بایت‌ها خوانده نشدند. لینک همیشه
     می‌رود، وگرنه او اصلاً خبردار نمی‌شود که فایلی آمده. */
  try {
    tgSend_(cap + (link ? '\n\n' + link : '') +
            '\n<i>(حجمش برای تلگرام زیاد بود؛ از لینک بردارید.)</i>');
    out.sent = true; out.how = 'لینک'; return out;
  } catch (e3) { out.why = String(e3 && e3.message || e3).slice(0, 80); }
  return out;
}

/** نامِ فارسیِ هر گوینده، از همان `docs/voices.json` که بخشِ ۳۳ می‌خوانَد. */
/** زیروبمِ میانهٔ ضبط‌های خودِ گوینده از کارتِ سبک، یا '' (۸.۳۷). */
function vbrStyleHz_(speaker) {
  try {
    var doc = vintReadResult_();
    var sp = doc && doc.speakers && doc.speakers[String(speaker)];
    var hz = Number(sp && sp.style && sp.style.medianHz);
    return (isFinite(hz) && hz >= 60 && hz <= 350) ? String(Math.round(hz * 10) / 10) : '';
  } catch (e) { return ''; }
}

function vbrSpeakerNames_() {
  var out = {};
  try {
    var doc = vintReadResult_();
    var sp = (doc && doc.speakers) || null;
    if (!sp || typeof sp !== 'object') return out;
    for (var k in sp) {
      if (!Object.prototype.hasOwnProperty.call(sp, k)) continue;
      if (sp[k] && sp[k].name) out[k] = String(sp[k].name);
    }
  } catch (e) {}
  return out;
}

var VBR_TAB = 'کارنامهٔ پلِ صدا';
var VBR_HEADERS = ['زمان', 'قسمت', 'گوینده', 'نتیجه', 'توضیح', 'ثانیه', 'دقیقهٔ کار'];

/**
 * یک ردیف در تاریخچه — موفق و ناموفق، هر دو.
 *
 * `_STATUS.json` جوابِ «الان چند تا» را می‌دهد؛ سؤالی که وقتی چیزی خراب
 * می‌شود واقعاً می‌پرسی «از کِی» است، و جوابش فقط از تاریخچه درمی‌آید.
 * همان دلیلی که تبِ «کاربردِ جزوه» برایش ساخته شد.
 */
function vbrLog_(hub, item, result, note) {
  try {
    var h = hub || getHub_();
    var sh = h.getSheetByName(VBR_TAB);
    if (!sh) {
      sh = h.insertSheet(VBR_TAB);
      sh.appendRow(VBR_HEADERS);
    }
    sh.appendRow([nowStr_(), String(item.key || ''), String(item.speaker || ''),
                  String(result || ''), String(note || '').slice(0, 300),
                  Number(item.seconds) || '', Number(item.jobMinutes) || '']);
  } catch (e) {
    try { logLine_('کارنامهٔ پل نوشته نشد: ' + e.message); } catch (e2) {}
  }
}

/** چند روز است قدیمی‌ترین درخواستِ بی‌جواب مانده. */
function vbrStuckDays_() {
  var d = vbrRead_(), worst = 0, now = new Date().getTime();
  for (var i = 0; i < d.items.length; i++) {
    if (String(d.items[i].status || '') !== 'در انتظار') continue;
    var t = parseWhen_(String(d.items[i].at || ''));
    if (isNaN(t)) continue;
    var days = Math.floor((now - t) / 86400000);
    if (days > worst) worst = days;
  }
  return worst;
}

/**
 * وضعیتِ روزانه — سطری که **هر روز** هست، حتی وقتی خبری نیست.
 *
 * سطرِ خالی نه خبر است نه هشدار؛ فقط شبیهِ سلامت است. همان درسی که
 * `voiceIntake.line` و `handoutStatus_().line` از آن آمدند.
 */
function vbrStatus_() {
  var out = { on: CFG.VBR_ON !== false, replace: CFG.VBR_REPLACE === true,
              waiting: 0, done: 0, abandoned: 0, stuckDays: 0, ok: true, line: '',
              answered: 0, tooBig: 0, tooBigWhy: '',
              colourOnly: 0, colourWhy: '' };
  try {
    var d = vbrRead_();
    /* ══ «هرگز نوشته نشده» ≠ «نوشته شد و خالی بود» ══
       همان تفکیکی که `voicebridge.py` سرِ `rev < 1` می‌گذارد — ولی آن‌جا
       فقط گردش‌کار را قرمز می‌کند، و گردش‌کار را صاحبِ برنامه نمی‌بیند.
       سمتِ موتور هم باید همین را بگوید، وگرنه «هنوز هیچ قسمتی تبدیل
       نشده» شبیهِ سلامت خوانده می‌شود در حالی که یعنی کارِ شبانه اصلاً
       به این بخش نرسیده.

       و **بلافاصله** پس از `vbrRead_` خوانده می‌شود، نه پایین‌تر: اگر
       یکی از فراخوانی‌های بعدی پرت کند، `everWritten` نامقدار می‌مانَد و
       سطرِ روزانه کارِ شبانه را به چیزی متهم می‌کند که نکرده. اتهام باید
       از جایی بیاید که نمی‌تواند به‌خطا بیفتد. */
    out.rev = Number(d.rev) || 0;
    out.everWritten = out.rev >= 1;
    /* ══ «بی‌پاسخ» با «پاسخ آمد و برداشته نشد» یکی نیست (۷٫۶۶) ══
       تا ۷٫۶۵ هر ردیفِ «در انتظار» بی‌پاسخ حساب می‌شد، پس یک خروجیِ
       بزرگ‌ترازِ سقف سه روز بعد یافتهٔ `voice-bridge-stuck` می‌ساخت با
       جملهٔ «هیچ خروجی‌ای ننشسته» — که **دروغ** بود: نشسته بود، ما
       نمی‌توانستیم برش داریم. همان «متهم کردنِ طرفِ اشتباه» (۷٫۱۸/۷٫۳۲).

       ══ و چرا از خودِ ردیف خوانده می‌شود، نه از نقشه ══
       نسخهٔ اولِ همین بند `vbrMapCached_()` را صدا می‌زد. ولی `vbrStatus_`
       را `writeStatus_` صدا می‌زند — یعنی سرِ `healthCheck` و هر
       `syncCatalog` — پس یک فراخوانِ شبکه به داغ‌ترین تابعِ موتور اضافه
       می‌شد. این **عیناً** اشتباهِ ۷٫۶۳ است: هزینه گذاشتن روی همان تابعی
       که تازه از هزینه مُرده بود. و سه مجموعهٔ آزمون هم همان‌جا شکستند،
       چون پاسخ‌های ماک‌شدهٔ مدل یکی جابه‌جا شد.
       شاهد همان‌جایی نوشته می‌شود که حادثه رخ داده: `vbrIngest_` روی ردیف
       `hardWhy` می‌زند. پس این شمارش **هیچ خواندنِ تازه‌ای ندارد** — همان
       شرطِ `selfVerifyMap_`. */
    for (var i = 0; i < d.items.length; i++) {
      var itS = d.items[i];
      var st = String(itS.status || '');
      if (st === 'در انتظار') {
        out.waiting++;
        var hw = String(itS.hardWhy || '');
        /* «پاسخ آمد» یعنی یا سقف جلویش را گرفت، یا دستِ‌کم یک تلاش شده —
           هر دو فقط وقتی ممکن‌اند که نقشه نشانی داشته باشد. ردیفی که
           هیچ‌کدام را ندارد، واقعاً بی‌پاسخ است. */
        if (hw || (Number(itS.tries) || 0) > 0) out.answered++;
        if (hw) {
          out.tooBig++;
          if (!out.tooBigWhy) out.tooBigWhy = String(itS.key) + ' — ' + hw;
        }
        /* ══ رنگ بی روح، گفته می‌شود پیش از رسیدن (۷٫۷۳) ══
           «نامعلوم» شمرده نمی‌شود: نبودِ نشانه یعنی نمی‌دانیم، و هشداری
           برای حالتی که ممکن است سالم باشد، هشداری است که خوانده نمی‌شود
           (۷٫۴۰). ولی «رنگ‌تنها» را **می‌دانیم**، و دانستنش پیش از شنیدنِ
           پانزده دقیقه صرفه‌جویی است. */
        if (String(itS.soul || '') === 'رنگ‌تنها') {
          out.colourOnly++;
          if (!out.colourWhy) {
            out.colourWhy = String(itS.key) + ' — ' + String(itS.soulWhy || '');
          }
        }
      }
      else if (st === 'رسید') out.done++;
      else if (st === 'رهاشده') out.abandoned++;
    }
    out.stuckDays = vbrStuckDays_();
    var prows = vbrSpeakerRows_();          // یک بار، برای هر دو پرسش
    out.speaker = vbrSpeakerOn_(prows);
    out.onceKeys = vbrSpeakerOnce_(prows);
    try { out.pickedKeys = vbrSpeakerPicked_(prows); } catch (ePk) { out.pickedKeys = []; }
    /* مشکلِ دوم به سطر **اضافه** می‌شود، نه اینکه جایش را بگیرد — ۷٫۲۲
       اینجا `return` می‌کرد و شمارشِ گیرکردن را هم کور می‌کرد. */
    var qi = vbrQueueIdOk_();
    if (!qi.ok) out.queueId = qi;
    var qs = vbrQueueShare_();
    if (!qs.ok) out.queueShare = qs;
  } catch (e) { out.error = e.message; }

  var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (e) { return String(n); } };
  if (!out.on) {
    out.line = 'پلِ رنگِ صدا: خاموش است.';
    return out;
  }
  var bits = [];
  if (out.done) bits.push('ساخته‌شده: ' + fa(out.done));
  if (out.waiting) bits.push('در انتظار: ' + fa(out.waiting));
  if (out.abandoned) bits.push('رهاشده: ' + fa(out.abandoned));
  /* این جدا از «در انتظار» گفته می‌شود، چون علتش جای دیگری است و راهِ
     حلش هم: گردش‌کار باید ریزتر تکه کند، نه اینکه صبر کنیم. */
  if (out.tooBig) {
    out.ok = false;
    bits.push('برداشته نشد (حجم): ' + fa(out.tooBig) +
              (out.tooBigWhy ? ' — ' + out.tooBigWhy : ''));
  }
  /* ══ «هرگز نوشته نشده» را **همیشه** بگو (۷٫۴۶) ══
     تا ۷٫۴۵ این جمله زیرِ شرطِ «گوینده‌ای روشن است» بود، پس دقیقاً در
     حالتِ شروع — که هیچ گوینده‌ای روشن نیست — هرگز نمی‌آمد. و همان حالت
     است که گردش‌کارِ voice-bridge را چهار بار پشتِ هم قرمز کرد با جملهٔ
     «موتور هرگز رویش ننوشته (rev 0)»، در حالی که سطرِ روزانه می‌گفت
     «هیچ گویندهٔ روشنی نیست» — که سالم به نظر می‌رسد.

     این دو یک چیز نیستند: «گوینده‌ای انتخاب نشده» تصمیمِ صاحبِ برنامه
     است، ولی «صف یک بار هم نوشته نشده» یعنی **کارِ شبانه هرگز به بخشِ ۳۶
     نرسیده** — و آن، هر کسی که روشن باشد یا نباشد، ایراد است. زنگی که در
     همان حالتی که برایش ساخته شده به صدا در نیاید، زنگ نیست (۷٫۲۲/۷٫۲۷/۷٫۳۹). */
  if (!out.everWritten) {
    out.ok = false;
    bits.push('صف یک بار هم نوشته نشده — یعنی کارِ شبانه هرگز به این بخش ' +
              'نرسیده' + (out.speaker ? '؛ و گویندهٔ «' + out.speaker + '» روشن است' : ''));
  }
  /* این ایراد نیست و `ok` را پایین نمی‌آورد: تبدیل درست کار کرده. ولی
     نتیجه‌اش نیمهٔ کار است و اگر گفته نشود، او پانزده دقیقه گوش می‌دهد تا
     خودش کشفش کند — همان چیزی که یک بار شد. */
  if (out.colourOnly) {
    bits.push('فقط رنگ (بی شیوهٔ خواندنِ او): ' + fa(out.colourOnly) +
              (out.colourWhy ? ' — ' + out.colourWhy : '') +
              '؛ برای «رنگ و روح» ردیفِ گوینده باید پیش از تولیدِ قسمت روشن باشد');
  }
  if (!bits.length) {
    /* ══ حالت‌های خالی، و کدامشان ایراد است ══
       «هیچ گوینده‌ای روشن نیست» سالم است و انتخابِ صاحبِ برنامه — و گفتنش
       همان کاری است که باید بکند: می‌گوید دقیقاً چه چیزی لازم است.
       هشداری که برای حالتِ سالم بزند، همان هشداری است که یاد می‌گیرند
       نادیده بگیرند. */
    if (!out.speaker && (out.pickedKeys || []).length) {
      /* ۷٫۶۲: همان منطق، برای ستونِ تیکِ قسمت‌های تولیدشده. صاحبِ برنامه
         ۲۴ سپتامبر درس‌نامه ۴۹ را تیک زد و سطرِ روزانه گفت «هیچ گویندهٔ
         روشنی نیست» — که سالم به نظر می‌رسد در حالی که کارِ تیک‌خورده‌اش
         اصلاً به صف نمی‌رسید. سطری که حالتِ زنده را سالم نشان بدهد، همان
         سطری است که خوانده شدنش را از دست می‌دهد. */
      bits.push('هیچ ردیفی روشن نیست، ولی «' + out.pickedKeys.join('» و «') +
                '» قسمتِ تولیدشده تیک خورده — همان‌ها تبدیل می‌شوند');
    } else if (!out.speaker && (out.onceKeys || []).length) {
      /* حالتی که تا ۷٫۴۵ اصلاً وجود نداشت و حالا باید نامش برده شود:
         ردیف خاموش است ولی قسمت‌های موردی دارد. گفتنِ «هیچ گویندهٔ روشنی
         نیست» اینجا دروغ نیست ولی گمراه‌کننده است — کاری هست که قرار است
         بشود. */
      bits.push('هیچ ردیفی روشن نیست، ولی «' + out.onceKeys.join('» و «') +
                '» قسمت‌های موردی دارد — همان‌ها تبدیل می‌شوند و بس');
    } else if (!out.speaker) {
      bits.push('هیچ گویندهٔ روشنی در «صداها» نیست — تا ردیفی روشن نشود ' +
                '(یا شمارهٔ قسمتی در «قسمت‌های موردی» نوشته نشود) ' +
                'قسمتی برای تبدیل انتخاب نمی‌شود');
    } else {
      bits.push('هنوز هیچ قسمتی تبدیل نشده');
    }
  }
  out.line = 'پلِ رنگِ صدا — ' + bits.join(' · ');
  /* این جمله هر روز می‌آید و عمدی است: تا وقتی جای صوتِ منتشرشده را
     نگرفته، نبودِ این جمله می‌تواند به‌معنای «پس گرفت» خوانده شود. */
  out.line += out.replace
    ? ' · ⚠️ صوتِ منتشرشده **با همین** ساخته می‌شود.'
    : ' · فایلِ تبدیل‌شده کنارِ اصل می‌نشیند؛ صوتِ منتشرشده عوض نشده.';
  var days = Math.max(1, Number(CFG.VBR_STUCK_DAYS) || 3);
  if ((out.waiting - out.answered) > 0 && out.stuckDays >= days) {
    out.ok = false;
    out.line += ' — و ' + fa(out.stuckDays) + ' روز است پاسخی از گردش‌کارِ پل نرسیده.';
  }
  if (out.queueShare) {
    out.line += out.queueShare.fixed
      ? ' ⚠️ اشتراکِ «' + vbrFileName_() + '» بسته بود و باز شد — تا این ' +
        'لحظه گردش‌کار به‌جای صف یک صفحهٔ HTML می‌گرفت و قرمز می‌شد.'
      : ' ⚠️ اشتراکِ «' + vbrFileName_() + '» بسته است و باز نشد (' +
        (out.queueShare.error || '—') + ') — تا باز نشود هیچ قسمتی تبدیل نمی‌شود.';
    if (!out.queueShare.fixed) out.ok = false;
  }
  if (out.queueId) {
    out.ok = false;
    out.line += ' ⚠️ شناسهٔ «' + vbrFileName_() + '» عوض شده — گردش‌کار دنبالِ ' +
                out.queueId.want + ' می‌گردد ولی فایل حالا ' + out.queueId.got +
                ' است. تا به‌روز نشدنِ VBR_QUEUE_ID هیچ قسمتی تبدیل نمی‌شود.';
  }
  /* مدل‌های تحویلی (۸.۴۱) — فقط وقتی چیزی هست: شکست، یا رسیدنِ این هفته. */
  try {
    var ms = vbrModelStatus_();
    out.models = ms;
    if (ms.line) out.line += ' · ' + ms.line;
    if (ms.fail) out.ok = false;
  } catch (eMs) {}
  return out;
}

/**
 * درخواستی که بی‌پاسخ بماند، **خودش** یافته است.
 *
 * درسِ بانکِ موسیقی (هفت هفته سکوت، صفر فایل) از روزِ اول اعمال می‌شود،
 * نه پس از آن. و یک شبِ بد یافته نمی‌سازد.
 */
function vbrStuckCheck_(hub, st) {
  try {
    var days = Math.max(1, Number(CFG.VBR_STUCK_DAYS) || 3);
    /* ردیفی که نقشه جوابش را دارد بی‌پاسخ نیست — حتی اگر برداشته نشده
       باشد. آن یکی موضوعِ دیگری است و یافتهٔ خودش را دارد (۷٫۶۶). */
    if (!st || st.stuckDays < days) return false;
    if ((Number(st.waiting) || 0) - (Number(st.answered) || 0) <= 0) return false;
    logSelfFinding_(hub || getHub_(), {
      priority: 'جدی', category: 'پلِ صدا', key: 'voice-bridge-stuck',
      title: 'صفِ پلِ رنگِ صدا ' + st.stuckDays + ' روز است بی‌پاسخ مانده',
      detail: st.waiting + ' قسمت در «' + vbrFileName_() + '» منتظرند و هیچ ' +
              'خروجی‌ای در ' + (CFG.VBR_MAP || 'docs/voice-renders.json') +
              ' ننشسته. یعنی تبدیل انجام نمی‌شود.',
      instruction: 'در گیت‌هاب تبِ Actions را ببین: گردش‌کارِ `voice-bridge` ' +
                   'اجرا شده؟ قرمز است؟ صفِ درایو «هرکس با لینک» هست؟ ' +
                   'اگر اجرا سبز است ولی نقشه عوض نشده، مرحلهٔ آپلودِ ' +
                   'release asset را نگاه کن. پس از اصلاح، فردا وارسی کن ' +
                   'که ردیفِ تازه‌ای در «' + VBR_TAB + '» نشسته باشد.',
      owner: ROWNER_CODE
    });
    return true;
  } catch (e) { return false; }
}

/**
 * خروجی‌ای که آمد و در سقفِ دانلود جا نشد، **خودش** یافته است — و
 * موضوعش با «بی‌پاسخ ماندن» یکی نیست.
 *
 * ══ چرا یافته و نه یک جملهٔ دیگر در ایمیل ══
 * یک جمله در ایمیلِ فردا جایش را به جملهٔ دیگری می‌دهد؛ یافته نه. و
 * این وضع تا نسخهٔ تازهٔ کد (یا گردش‌کار) عوض نشود خودبه‌خود حل نمی‌شود،
 * پس صفِ `NEEDS_CODE` جای درستش است. بدونِ این، ردیف در «در انتظار»
 * می‌مانَد و سه روز بعد `voice-bridge-stuck` گردش‌کار را به کاری متهم
 * می‌کند که کرده است.
 *
 * یک شبِ بد یافته نمی‌سازد لازم نیست اینجا: این حالت گذرا نیست — حجمِ
 * فایل فردا کوچک‌تر نمی‌شود.
 *
 * ══ و چرا درِ دومی روی `healthCheck` گذاشته نشد ══
 * قاعدهٔ ۷٫۳۹/۷٫۴۶ می‌گوید وارسی را روی مسیرِ مستقل هم بگذار. ولی ۷٫۶۳
 * بهایش را داد: شش درِ دومِ مستقل روی همان یک تابعِ روزانه سوار شده بود
 * و هیچ‌کس جمعشان را با سقف نسنجیده بود — و آن تابع مُرد. اینجا کانالِ
 * مستقل از قبل هست و هزینه‌ای ندارد: `vbrStatus_().line` هر روز در
 * ایمیلِ ۱۰:۰۰ می‌آید و خودش این وضع را با نام می‌گوید. یافته حافظهٔ
 * دیرپاست، سطرِ روزانه چشمِ هر روز.
 */
function vbrBigCheck_(hub, st) {
  try {
    if (!st || !(Number(st.tooBig) || 0)) return false;
    logSelfFinding_(hub || getHub_(), {
      priority: 'جدی', category: 'پلِ صدا', key: 'voice-bridge-toobig',
      title: 'خروجیِ پل آمد ولی از سقفِ دانلودِ Apps Script بزرگ‌تر است',
      detail: st.tooBig + ' قسمت در «' + vbrFileName_() + '» خروجی دارند و ' +
              'برداشته نمی‌شوند' + (st.tooBigWhy ? ' (' + st.tooBigWhy + ')' : '') +
              '. `UrlFetchApp` پاسخِ بزرگ‌تر از ۵۰ مگابایت را نمی‌گیرد، پس ' +
              'هیچ تلاشِ دوباره‌ای این را حل نمی‌کند — و همین است که این ' +
              'ردیف‌ها «رهاشده» نمی‌شوند.',
      instruction: 'گردش‌کارِ `voice-bridge` باید خروجی را ریزتر تکه کند: ' +
                   '`tools/voicebridge.py` تکه‌ها را زیرِ VBR_PIECE_MB نگه ' +
                   'می‌دارد و `urls` می‌نویسد. اگر نقشه هنوز `url` تکی دارد، ' +
                   'یعنی گردش‌کار با نسخهٔ قدیمی اجرا شده — دوباره اجرا شود. ' +
                   'پاسخ را با کلیدِ همین یافته در manifest بنویس.',
      owner: ROWNER_CODE
    });
    return true;
  } catch (e) { return false; }
}

/**
 * دورِ شبانهٔ پل.
 *
 * ترتیب عمدی است: اول برداشتِ پاسخ‌ها (تا صف باز شود)، بعد درخواستِ تازه.
 * برعکسش یعنی سقفِ صف با ردیف‌هایی پر می‌ماند که جوابشان همین حالا
 * آماده بود.
 */
/**
 * صف را بنویس، حتی وقتی چیزی برای نوشتن نیست.
 *
 * ══ چرا لازم است (۷٫۴۰) ══
 * `voicebridge.py` هر صفِ `rev < 1` را رد می‌کند و این عمدی است: «هرگز
 * نوشته نشده» با «نوشته شد و خالی بود» یکی نیست، و سبزِ «۰ قسمت» روی
 * فایلی که موتور هرگز ندیده، یک سبزِ دروغ است (۷٫۳۳).
 *
 * ولی تا پیش از این، موتور صف را فقط وقتی می‌نوشت که **کاری** داشت —
 * یعنی گوینده‌ای روشن بود. پس تا وقتی صاحبِ برنامه ردیفی را روشن نکرده،
 * گردش‌کار هر شش ساعت قرمز می‌شد، برای حالتی که اصلاً ایراد نیست.
 * **هشداری که برای حالتِ سالم بزند، همان هشداری است که یاد می‌گیرند
 * نادیده‌اش بگیرند** — و این پرونده همین یک جمله را بارها نوشته.
 *
 * قرینه‌اش در بخشِ ۳۳ از روزِ اول همین بود: `vintQueue_` بی‌قید می‌نویسد،
 * پس `rev ≥ 1` یعنی «موتور زنده است و نگاه کرد» و `at` یعنی «کِی نگاه
 * کرد». دلیلِ خالی بودن جای دیگری گفته می‌شود — در سطرِ روزانه، همان‌جا
 * که او می‌خوانَد، نه در تبِ Actions که به‌تصادف بازش می‌کند.
 *
 * و یک سودِ جانبی که اتفاقی نیست: `vbrSave_` اشتراک را هم باز می‌کند،
 * پس شبی که کارِ شبانه به این بخش برسد، درِ بسته هم باز می‌شود.
 */
/**
 * برداشتنِ خروجی، ساعتی — دری که نه به کارِ شبانه بند است و نه به سلامت.
 *
 * ══ چرا لازم شد (۷٫۷۸) ══
 * ۷٫۷۷ تبدیل را تند کرد (چند ردیف در یک اجرا، cronِ دوساعته) و تنگنا
 * جابه‌جا شد: خروجی حالا زیرِ دو ساعت آماده است ولی موتور روزی **دو بار**
 * سراغش می‌رود — ۰۲:۳۰ و ۱۰:۰۰. صاحبِ برنامه‌ای که ۱۱ صبح تیک بزند، تا
 * ۰۲:۳۰ِ فردا چیزی نمی‌بیند: پانزده ساعت برای کاری که ده دقیقه پیش تمام
 * شده بود.
 *
 * ══ چرا تریگرِ خودش، و نه مهمانِ یک تابعِ دیگر ══
 * وسوسه این بود که به `syncCatalog` (هر دو ساعت) اضافه شود. آن دقیقاً
 * ۷٫۶۳/۷٫۷۲ است: هزینه گذاشتن روی مسیری که کسی رویش ایستاده — و
 * `syncCatalog` خودش `writeStatus_` را صدا می‌زند، همان جایی که ۷٫۶۶ یک
 * فراخوانیِ شبکه را اشتباهی گذاشت و سه مجموعه قرمز شد. مهمانی که مهمانِ
 * دیگری بود، روزی که میزبان گرسنه بمانَد گرسنه می‌مانَد (۶٫۳۷، یوتیوب).
 *
 * ══ و چرا ارزان است ══
 * وقتی جوابی نیامده باشد: یک خواندنِ `_VOICE-RENDER.json` و یک fetchِ
 * کوچکِ `docs/voice-renders.json`. هابِ ۲۹ مگابایتی **فقط** وقتی خوانده
 * می‌شود که چیزی واقعاً رسیده باشد و یک ردیفِ کارنامه لازم شود — پس
 * `hub` عمداً پاس داده نمی‌شود.
 */
/**
 * نمونهٔ «روح» را خودِ موتور بخواهد — بی هیچ دکمه‌ای (۷٫۸۴).
 *
 * ══ چرا تریگرِ خودش، و نه همین‌جا ══
 * ساختِ این نمونه ~چهار دقیقه فراخوانِ TTS است و سقفِ Apps Script شش
 * دقیقه. روی تریگرِ ساعتی — که کارش برداشتِ ارزانِ خروجی است — یعنی
 * خوردنِ کلِ اجرا و گرسنه گذاشتنِ برداشت (۶٫۳۷: مهمان، وقتی میزبان کم
 * بیاورد، گرسنه می‌مانَد). پس این تابع فقط **زمان‌بندی** می‌کند و کارِ
 * سنگین در اجرای خودش می‌افتد — همان الگوی `busyRetry_`.
 *
 * ══ و سقفِ روزانه، چون سه سد می‌توانند ردش کنند ══
 * `runVoiceSoulTest` سه جا امتناع می‌کند: شیوهٔ خواندنِ خالی، مدلِ نبوده،
 * و دستورِ لحنِ خاموش (۷٫۷۹). هیچ‌کدام دور زده نمی‌شود — ولی اگر یکی‌شان
 * پایدار باشد، زمان‌بندیِ بی‌سقف یعنی ساعتی یک تریگرِ تازه تا ابد. سقف
 * روزانه است: برخوردِ گذرا جبران می‌شود، خرابیِ پایدار حلقه نمی‌شود.
 *
 * ══ فقط بذر ══
 * تیکِ او دست‌نخورده می‌مانَد: `vbrSoulPick_` می‌گوید انتخابش از بذر بود یا
 * از تیک، و تیک همان معنای ۷٫۷۴ را دارد — «دکمه را که زدم».
 */
function vbrSoulSeedDue_() {
  var out = { scheduled: false, why: '' };
  /* دستی + خودکار (۸.۴۱) — همان تعریفی که `vbrSoulPick_` می‌خوانَد. */
  var list = vbrSoulSeeds_();
  if (!list.length) return out;

  /* ══ زمان‌بند باید ارزان بماند — و نگارشِ اولم نبود ══
     نخست `vbrSoulPick_()` را همین‌جا صدا می‌زدم، و آن `personaTab_()` →
     `getHub_()` است: یک پاسِ تعمیرِ تب روی هابِ ۲۹ مگابایتی، ساعتی یک بار،
     روی همان تریگری که کارش برداشتِ ارزان است. `run_bridge_voice_test.js`
     ۲۶٫۳ گرفتش — همان درسِ ۷٫۶۳/۷٫۷۲/۷٫۸۲ برای بارِ چهارم، این بار نه روی
     `healthCheck` بلکه روی تریگرِ ساعتی.

     پس اینجا فقط سه چیزِ ارزان پرسیده می‌شود: فهرستِ بذر (مفت)، صف (یک
     خواندنِ کوچک که این تابع از قبل می‌کند)، و شمارندهٔ روز (Script
     Properties). سه سدِ واقعی — شیوهٔ خواندن، مدل، و دستورِ لحن — داخلِ
     **اجرای خودش** می‌افتند، که جای درستشان هم همان است: `runVoiceSoulTest`
     پیش از خرجِ ~چهار دقیقه هر سه را می‌سنجد (۷٫۷۹) و تمیز امتناع می‌کند.
     بهای این کار یک اجرای بی‌حاصل است در بدترین حالت، و سقفِ روزانه
     بسته‌اش می‌کند.

     و اثرِ جانبی‌اش بهتر از نگارشِ اول است: این تابع دیگر **هیچ** چیزی از
     ستونِ تیک نمی‌دانَد، پس تیکِ او ساختاراً نمی‌تواند کارِ خودکار راه
     بیندازد — معنای ۷٫۷۴ آن ستون دست‌نخورده می‌مانَد. */
  /* ══ شمارندهٔ روز **پیش از** انتخاب خوانده می‌شود (۷٫۸۷) ══
     چون نوبت را همین عدد می‌چرخانَد — پایین‌تر. و صرفه‌جویی‌اش هم واقعی
     است: روزی که سقف پر شده، صف هم خوانده نمی‌شود. */
  var max = Math.max(1, Number(CFG.VOICE_SOUL_SEED_MAX_DAY) || 2);
  var today = String(nowStr_()).slice(0, 10);
  var pkey = 'VSOUL_SEED_DAY';
  var n = 0;
  try {
    var parts = String(props_().getProperty(pkey) || '').split('|');
    if (parts[0] === today) n = Number(parts[1]) || 0;
  } catch (eP) {}
  if (n >= max) { out.why = 'سقفِ امروز پر شد (' + n + ')'; return out; }

  var pend = null;
  try {
    var q = vbrRead_();
    var have = {};
    for (var z = 0; z < (q.items || []).length; z++) have[String(q.items[z].key)] = 1;
    var wait = [];
    for (var i = 0; i < list.length; i++) {
      var se = list[i] || {};
      var sp = String(se.speaker || '').trim();
      if (!sp || !se.show || !se.ep) {
        /* ردیفِ ناقص نام برده می‌شود، بی‌صدا رد نمی‌شود (۷٫۴۱). */
        out.why = 'ردیفِ ناقص در VOICE_SOUL_SEED: ' + JSON.stringify(se);
        return out;
      }
      /* شناسه از `vbrSoulShow_` می‌آید، نه دستی — وگرنه این خط و خطِ
         قرینه‌اش در `vbrSoulPick_` دو تعریف می‌شوند و یکی‌شان بی‌صدا
         کهنه می‌شود (۷٫۸۶). */
      if (have[vbrSoulShow_(sp, se.tag) + ':' + String(se.ep)]) continue;
      wait.push(se);
    }
    /* ══ نوبت می‌چرخد، وگرنه نفرِ دوم هرگز نوبت نمی‌گیرد (۷٫۸۷) ══
       نگارشِ ۷٫۸۶ همیشه **اولین** بذرِ در انتظار را برمی‌داشت. اگر آن یکی
       نتواند وارد صف شود — صف پر باشد، مدلش نباشد، دستورِ لحن خاموش شود —
       در `have` هم نمی‌نشیند، پس فراخوانِ بعدی دوباره همان را برمی‌دارد و
       سقفِ روز با یک بذرِ ناکام پر می‌شود. نفرِ دوم هیچ‌وقت نوبت نمی‌گیرد.
       عیناً ۷٫۷۵، این بار در زمان‌بند به‌جای دکمه.

       چرخش از **همان شمارنده‌ای** می‌آید که از قبل بود، پس هیچ حالتِ تازه‌ای
       ذخیره نمی‌شود (۷٫۸۲): اجرای اولِ روز بذرِ ۰، اجرای دوم بذرِ ۱. */
    if (wait.length) pend = wait[n % wait.length];
  } catch (e) {
    out.why = 'صفِ پل خوانده نشد: ' + String((e && e.message) || e).slice(0, 60);
    return out;
  }
  if (!pend) { out.why = 'برای همهٔ بذرها نمونه ساخته شده'; return out; }

  try {
    clearRetryTriggers_('runVoiceSoulSeed');
    ScriptApp.newTrigger('runVoiceSoulSeed').timeBased().after(60 * 1000).create();
    props_().setProperty(pkey, today + '|' + (n + 1));
    out.scheduled = true;
    out.speaker = String(pend.speaker);
    out.ep = String(pend.ep);
    /* ══ و اینجا `logLine_` صدا زده **نمی‌شود** ══
       نگارشِ اول می‌زد، و `run_bridge_voice_test.js` ۲۶٫۳ قرمز شد: `logLine_`
       خودش سیاهه را در هاب می‌نویسد، یعنی `getHub_()`، یعنی یک پاسِ تعمیرِ
       تب روی ۲۹ مگابایت — دقیقاً همان هزینه‌ای که ۷٫۶۳ از آن مُرد، این بار
       نه در منطق بلکه در **گزارش دادن**. هزینه‌ای که شبیهِ مفت است.
       و از دست نمی‌رود: یک دقیقهٔ دیگر خودِ `runVoiceSoulTest` سطرش را
       می‌نویسد — چه بسازد چه امتناع کند — و ردیفِ صف و تلگرام نتیجه را
       دارند. سطرِ «یک اجرا زمان‌بندی شد» ارزشش کمتر از یک خواندنِ هاب است. */
  } catch (eT) {
    out.why = 'زمان‌بندی نشد: ' + String((eT && eT.message) || eT).slice(0, 60);
  }
  return out;
}


/** نامِ جدا، تا پاک کردنش هرگز به تریگرِ روزانه نخورد — قرینهٔ `produceEpisodeRetry`. */
function runVoiceSoulSeed() {
  try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
  return runVoiceSoulTest();
}


function vbrCollectHourly() {
  /* شاهدِ اجرا (۸.۱۱): مهر **پیش از** کار، تا از کشته‌شدنِ اجرا جان
     به در ببرد — ۷.۴۴، این بار برای همهٔ تریگرها نه فقط شبانه.
     `finally` پایانِ تمیز را تضمین می‌کند؛ کشته‌شدنِ سرِ شش دقیقه را
     نه — و دقیقاً همان حالتی است که این شاهد برایش ساخته شده. */
  runEnter_('vbrCollectHourly');
  try {
  /* ══ آموزشِ گویندگان زیرِ نظر، پیش از سدِ پل (۸.۴۳) ══
     آموزش به روشن‌بودنِ پل ربطی ندارد؛ پشتِ `VBR_ON` بودنش یعنی روزی که پل
     خاموش است، چند روز آموزش بی هیچ خبری بماند. همان یک خواندنِ
     `docs/voices.json` به زمان‌بندِ مدل هم داده می‌شود — دو خواندن برای یک
     فایل در یک اجرا هزینهٔ بی‌دلیل است. */
  var vdoc = null;
  try { vdoc = vintReadResult_(); } catch (eVd) { vdoc = null; }
  try { vintTrainWatch_(vdoc); } catch (eTw) {}
  /* صفِ گویندگان که شبانه نوشته نشد — فقط زمان‌بندی، بی هاب (۸.۵۳). پیش از
     سدِ پل، به همان دلیلِ بالا: گوینده به پل ربطی ندارد. */
  try { vintQueueDue_(); } catch (eQd) {}
  if (CFG.VBR_ON === false) return null;
  /* ══ درِ دومِ درخواستِ بذر — اینجا، نه روی `healthCheck` (۷٫۸۲) ══
     بذر در کارِ شبانه هم هست، ولی آن بلوک پشتِ `nightHas_` است و شبی که
     وقت کم بیاید دقیقاً شبی است که این نمونه لازم است (۷٫۴۶/۷٫۶۲). نگارشِ
     اول درِ دوم را روی `healthCheck` گذاشت و **غلط بود**: مسیرِ رسیدن به
     سدِ تکرار از `vbrMapCached_()` می‌گذرد که یک فراخوانِ شبکه است، یعنی
     هزینه روی همان تابعی که ۷٫۶۳ نوشت از هزینه مُرده — و در آزمون هم یک
     پاسخِ ماک را می‌خورد و همه‌چیزِ بعدش را جابه‌جا می‌کرد (۷٫۶۶؛
     `run_health_test.js` گرفتش).
     اینجا جای درستش است: تریگرِ ساعتیِ خودش، ارزان، و **دوازده برابر**
     بیشتر از یک بار در روز. */
  try { vbrSeedAsk_(); } catch (eSd) {
    try { logLine_('درخواستِ بذرِ پل ناموفق: ' + eSd.message); } catch (eSdb) {}
  }
  /* و نمونهٔ «روح» — فقط **زمان‌بندی** می‌شود، کارِ سنگین اینجا نمی‌افتد. */
  try { vbrSoulSeedDue_(); } catch (eSs) {
    try { logLine_('بذرِ نمونهٔ روح ناموفق: ' + eSs.message); } catch (eSsb) {}
  }
  /* مدلِ گویندهٔ تازه (۸.۴۱): فقط زمان‌بندی — یک خواندنِ کوچکِ gitHub raw،
     بی هاب. هر ساعت، چون هر ساعتِ انتظار یعنی یک ساعتِ دیگر مدل روی
     لینکِ عمومی. */
  try { vbrModelDropDue_(vdoc ? { doc: vdoc } : null); } catch (eMd) {
    try { logLine_('وارسیِ مدلِ تحویلی ناموفق: ' + eMd.message); } catch (eMdb) {}
  }
  try {
    var r = vbrIngest_(null);
    /* سیاهه فقط وقتی چیزی شد — سطرِ «۰ برداشته شد» ساعتی یک بار، یعنی
       سیاهه‌ای که کسی نمی‌خوانَد (قاعدهٔ همین پرونده دربارهٔ هشدارِ
       بی‌موضوع). */
    if (r && ((r.got && r.got.length) || (r.failed && r.failed.length))) {
      try {
        logLine_('برداشتِ ساعتیِ پل: ' + (r.got || []).length + ' رسید، ' +
                 (r.failed || []).length + ' نشد');
      } catch (eL) {}
    }
    return r;
  } catch (e) {
    try { logLine_('برداشتِ ساعتیِ پل ناموفق: ' + e.message); } catch (e2) {}
    return null;
  }

  } finally { runExit_('vbrCollectHourly'); }
}

function vbrQueueEnsure_() {
  return vbrSave_(vbrRead_());
}

/**
 * درخواست‌هایی که **خودِ موتور** می‌زند، از `CFG.VBR_SEED_ASKS` (۷٫۸۲).
 *
 * چرا لازم شد: تا امروز نمونهٔ یک گوینده فقط از دکمهٔ منو در صف می‌نشست.
 * یعنی برای سنجیدنِ گامِ یک گوینده — کاری که ۷٫۸۱ تازه ضروری‌اش کرد — یک
 * ضربهٔ دستِ صاحبِ برنامه لازم بود. ۷٫۶۴: «موتور باید خودش را بسنجد؛ صاحبِ
 * برنامه ابزارِ سنجش نیست»، و سنجشی که به کارِ دستی بند باشد همان سنجشی
 * است که انجام نمی‌شود.
 *
 * ══ بی هیچ حالتِ ذخیره‌شده ══
 * `vbrAsk_` خودش کلیدِ تکراری را «قبلاً خواسته شده» رد می‌کند، و نقشه هم
 * کلیدِ ساخته‌شده را نگه می‌دارد. پس این تابع می‌تواند هر شب و هر ۱۰ صبح
 * اجرا شود و هیچ‌جا پرچمی نمی‌نشیند — نه پرچمی که انسان نتواند بازش کند
 * (۵٫۹۵)، نه شمارنده‌ای که نویسنده‌اش صفرش کند (۷٫۲۲).
 *
 * ══ گام اینجا نوشته نمی‌شود ══
 * `vbrAsk_` خودش `personaPitch_` را می‌پرسد. نوشتنِ گام در این فهرست یعنی
 * دو تعریف برای «گامِ این گوینده»، و دو تعریف همان است که یکی‌شان روزی
 * بی‌صدا کهنه می‌مانَد.
 *
 * ردیفِ گوینده روشن نمی‌شود و صدای دائمِ هیچ قسمتی عوض نمی‌شود — مرزِ
 * «موردی» در ۷٫۴۱، عیناً.
 */
function vbrSeedAsk_() {
  var out = { asked: [], skipped: [], notes: [] };
  var list = CFG.VBR_SEED_ASKS || [];
  if (!list.length) return out;
  /* ══ کلیدهای موجود، **یک** خواندن، پیش از هر `vbrAsk_` ══
     `vbrAsk_` خودش کلیدِ تکراری را رد می‌کند و آن سدِ پشتیبان سرِ جایش
     می‌مانَد — ولی برای رسیدن به آن، `vbrMapCached_()` را می‌پرسد و آن یک
     **فراخوانِ شبکه** است. این تابع از `healthCheck` هم صدا زده می‌شود، و
     ۷٫۶۳/۷٫۶۶ دقیقاً همین بودند: به تابعی که تازه از هزینه مُرده هزینه
     اضافه نکن. پس در روزِ عادی — که همهٔ بذرها از قبل در صف‌اند — این تابع
     یک خواندنِ کوچکِ صف است و صفر فراخوانِ شبکه.
     (و در آزمون‌ها همان فراخوان یک پاسخِ ماک را می‌خورد و هرچه بعدش است
     را جابه‌جا می‌کند — `run_health_test.js` همین را گرفت.) */
  var have = {};
  try {
    var d0 = vbrRead_();
    for (var q = 0; q < (d0.items || []).length; q++) have[String(d0.items[q].key)] = true;
  } catch (eR) {
    out.notes.push('صفِ پل خوانده نشد: ' + eR.message);
    return out;
  }
  for (var i = 0; i < list.length; i++) {
    var sd = list[i] || {};
    if (!sd.show || !sd.ep || !sd.speaker || !sd.folderId) {
      /* ردیفِ ناقص **نام برده می‌شود**، نه بی‌صدا رد: این فهرست دستی نوشته
         می‌شود و غلطِ تایپی در آن یعنی نمونه‌ای که هرگز نمی‌آید و هیچ‌کس
         نمی‌فهمد چرا (۷٫۴۱). */
      out.notes.push('ردیفِ ناقص در VBR_SEED_ASKS: ' + JSON.stringify(sd));
      continue;
    }
    var kk = String(sd.show) + ':' + String(sd.ep);
    if (have[kk]) { out.skipped.push(kk + ' — از قبل در صف است'); continue; }
    try {
      var r = vbrAsk_(String(sd.show), String(sd.ep), String(sd.folderId),
                      String(sd.speaker), String(sd.title || ''),
                      { label: String(sd.label || '') });
      if (r && r.ok !== false) out.asked.push(String(sd.speaker) + ':' + String(sd.ep));
      else out.skipped.push(String(sd.speaker) + ':' + String(sd.ep) + ' — ' + (r && r.why));
    } catch (e) {
      /* ══ پرتاب «نمی‌دانیم» است، نه «خراب است» (۷٫۶۳/۷٫۴۰) ══
         نگارشِ اول این را در `notes` می‌ریخت و `healthCheck` هم `notes` را
         «ایراد» حساب می‌کرد — یعنی یک تپقِ گذرای درایو، ایمیلِ هشدارِ روز
         را می‌فرستاد. `run_health_test.js` («سکوت یعنی سلامت») همین را
         گرفت. ایرادِ قطعی فقط ردیفِ ناقص است، که یک غلطِ تایپیِ دستی و
         تکرارشونده است؛ بقیه خبر است، نه هشدار. */
      out.skipped.push(String(sd.speaker) + ':' + String(sd.ep) +
                       ' — پرتاب: ' + e.message);
    }
  }
  return out;
}


function vbrNightly_(hub) {
  var out = { on: CFG.VBR_ON !== false, wrote: false, ingest: null, asked: 0, seeded: null, status: null };
  if (!out.on) { out.status = vbrStatus_(); return out; }
  var h = hub || null;
  try { if (!h) h = getHub_(); } catch (eH) {}
  /* پیش از هر کارِ دیگر: صف نوشته شود، حتی خالی. بعدش هم `vbrAsk_` و
     `vbrIngest_` ممکن است دوباره بنویسند — بالا رفتنِ دوبارهٔ rev در یک
     شب بی‌ضرر است؛ ننوشتنِ اصلاً نیست. */
  try { out.wrote = vbrQueueEnsure_(); }
  catch (eQ) { try { logLine_('صفِ پل نوشته نشد: ' + eQ.message); } catch (eQb) {} }
  try { out.ingest = vbrIngest_(h); }
  catch (e1) { try { logLine_('برداشتِ پل ناموفق: ' + e1.message); } catch (e1b) {} }
  /* پیش از `vbrAskDue_`: درخواستِ صریح باید جلوتر از جاروبِ خودکار بنشیند،
     همان ترتیبی که ۷٫۵۹ برای تیک‌ها گذاشت — وگرنه چیزی که خواسته شده پشتِ
     قسمت‌هایی می‌مانَد که کسی انتخابشان نکرده. */
  try { out.seeded = vbrSeedAsk_(); }
  catch (eS) { try { logLine_('درخواستِ بذرِ پل ناموفق: ' + eS.message); } catch (eSb) {} }
  try { out.asked = vbrAskDue_(h); }
  catch (e2) { try { logLine_('درخواستِ پل نوشته نشد: ' + e2.message); } catch (e2b) {} }
  /* مدلِ تحویلی، و گویندهٔ آماده‌ای که مدلش دستی آمد (۸.۴۱). */
  try { out.models = vbrModelDropDue_({ scanManual: true }); }
  catch (eMd) { try { logLine_('وارسیِ مدلِ تحویلی ناموفق: ' + eMd.message); } catch (eMdb) {} }
  try {
    out.status = vbrStatus_();
    vbrStuckCheck_(h, out.status);
    vbrBigCheck_(h, out.status);
  } catch (e3) {}
  return out;
}

/**
 * کدام قسمت‌ها نوبتشان است.
 *
 * از همان صفِ یوتیوب برداشته می‌شود، چون آنجا دقیقاً «قسمت‌هایی که
 * صوتشان کامل در پوشه هست» فهرست شده‌اند — و ساختنِ یک تعریفِ دومِ
 * «قسمتِ آماده» یعنی روزی یکی از آن دو بی‌صدا کهنه می‌شود.
 *
 * گویندهٔ پیش‌فرض از تبِ «صداها» می‌آید: ردیفی که **روشن** باشد. اگر
 * هیچ ردیفی روشن نباشد، پل کاری ندارد — و این درست است، چون انتخابِ
 * گوینده کارِ صاحبِ برنامه است نه حدسِ کد.
 */
function vbrAskDue_(hub) {
  var rows = vbrSpeakerRows_();
  if (!vbrSpeakerAny_(rows)) return 0;
  var n = 0;
  /* ══ تیک‌های صریح **اول**، پیش از تازه‌ترین‌ها (۷٫۵۹) ══
     ستونِ «قسمت‌های تولیدشده» یعنی او خودش این قسمت را انتخاب کرده.
     انتخابِ صریح بر «تازه‌ترین» مقدم است، وگرنه دو تبدیلِ هر شب را
     ردیف‌های خودکار می‌خورند و چیزی که او تیک زده هفته‌ها در نوبت
     می‌ماند — یعنی دکمه‌ای که کار می‌کند ولی نتیجه‌اش نمی‌آید. */
  try { n += vbrAskPicked_(rows); } catch (eP) {}
  if (n >= 2) return n;
  try {
    var d = ytRenderRead_();
    /* ══ از آخر، یعنی از تازه‌ترین ══
       صف به ترتیبِ ورود پر می‌شود و ردیف‌های رسیده هم در آن می‌مانند، پس
       ابتدایش قدیمی‌ترین قسمت‌هاست. پیمایش از ابتدا یعنی اولین چیزی که
       صاحبِ برنامه می‌شنود قسمتی از هفته‌ها پیش است — قسمتی که یادش
       نیست چطور بود، پس نمی‌تواند مقایسه‌اش کند.
       و کلِ این نسخه برای همان یک قضاوت ساخته شده: «شبیهِ اوست یا نه؟»
       نمونه‌ای که نشود با چیزی مقایسه‌اش کرد، آن قضاوت را ممکن نمی‌کند. */
    for (var i = d.items.length - 1; i >= 0; i--) {
      var it = d.items[i];
      if (!it.folderId) continue;
      /* گوینده **به ازای هر قسمت** انتخاب می‌شود، نه یک بار برای همه:
         «موردی» دربارهٔ همین یک قسمت است (۷٫۴۵). */
      var pick = vbrSpeakerPick_(rows, it.show, it.ep);
      if (!pick.key) continue;
      var r = vbrAsk_(it.show, it.ep, it.folderId, pick.key, it.title);
      if (r.ok) n++;
      if (n >= 2) break;         // دو تا در هر شب؛ رانرِ رایگان بی‌انتها نیست
    }
  } catch (e) {}
  return n;
}

/**
 * قسمت‌هایی که خودش در تخته تیک زده — پیش از هر چیزِ خودکار.
 *
 * فهرست از همان `_YT-RENDER.json` خوانده می‌شود که `vbrAskDue_` می‌خوانَد:
 * شناسهٔ پوشه فقط آنجاست، و دو راه برای یک چیز یعنی دو جای خرابی و نصفِ
 * تاریخچه در هرکدام. قسمتی که پوشه‌اش نباشد رد می‌شود — و تخته از اول
 * تیکش را نمی‌دهد، پس این حالت نباید پیش بیاید؛ اگر آمد، بی‌صدا نمی‌ماند.
 */
function vbrAskPicked_(rowsOpt) {
  var rows = rowsOpt || vbrSpeakerRows_();
  var n = 0;
  var map = null;
  for (var i = 0; i < rows.length; i++) {
    var key = String(rows[i][PC.KEY - 1] || '').trim();
    if (!key) continue;
    var cell = String(rows[i][PC.PICK - 1] == null ? '' : rows[i][PC.PICK - 1]).trim();
    if (!cell) continue;
    var set;
    try { set = personaPickSet_(cell, rows[i][PC.SHOWS - 1]); } catch (eS) { continue; }
    if (!map) {
      map = {};
      try {
        var d = ytRenderRead_();
        for (var q = 0; q < d.items.length; q++) {
          var it = d.items[q];
          if (!it.folderId) continue;
          map[String(it.show) + ':' + String(it.ep)] = it;
        }
      } catch (eR) { map = {}; }
    }
    for (var k in set) {
      if (!Object.prototype.hasOwnProperty.call(set, k)) continue;
      var item = map[k];
      if (!item) {
        vbrLog_(null, { key: k, show: '', ep: '', speaker: key }, 'رد',
                'پوشهٔ این قسمت شناخته نیست');
        continue;
      }
      /* ══ یک تیکِ خراب نباید تیک‌های سالم را با خود ببرد ══
         تنها فراخوانندهٔ این تابع `vbrAskDue_` است و آنجا در `catch` خالی
         نشسته — پس هر پرتابی اینجا یعنی **همهٔ** تیک‌های این ردیف بی‌صدا
         دور ریخته می‌شوند و او هیچ‌وقت نمی‌فهمد چرا قسمتی که تیک زده
         نیامد. `if (!item)` حالتِ شناخته را می‌گیرد؛ این یکی برای آن
         چیزی است که هنوز نمی‌دانیم. */
      var r;
      try { r = vbrAsk_(item.show, item.ep, item.folderId, key, item.title); }
      catch (eA) {
        vbrLog_(null, { key: k, show: item.show, ep: item.ep, speaker: key },
                'رد', 'درخواست ساخته نشد: ' + eA.message);
        continue;
      }
      if (r && r.ok) n++;
      /* «قبلاً خواسته شده» خطا نیست: تیک می‌مانَد و هر شب دوباره دیده
         می‌شود، پس صف نباید هر شب از آن پر شود. */
      if (n >= 2) return n;
    }
  }
  return n;
}

/** ردیف‌های تبِ «صداها» — یک بار خوانده می‌شود، نه یک بار به ازای هر قسمت. */
function vbrSpeakerRows_() {
  try { return personaRows_(personaTab_()); } catch (e) { return []; }
}

/** کلیدِ گویندهٔ روشن در تبِ «صداها» — بالاترین ردیف، همان قاعدهٔ بخشِ ۳۲. */
function vbrSpeakerOn_(rows) {
  var rs = rows || vbrSpeakerRows_();
  for (var i = 0; i < rs.length; i++) {
    var k = String(rs[i][PC.KEY - 1] || '').trim();
    if (!k) continue;
    if (personaOn_(rs[i][PC.ON - 1])) return k;
  }
  return '';
}

/**
 * کلیدهایی که «قسمت‌های موردی» دارند — بی توجه به روشن/خاموش.
 *
 * ══ نیمهٔ گم‌شدهٔ ۷٫۴۱، یک بخش آن‌طرف‌تر (۷٫۴۵) ══
 * صاحبِ برنامه ۲۰ سپتامبر در یک جمله خواست «چه به صورتِ **دائم یا
 * موردی** از صدایی که استفاده کردیم استفاده کنم». ۷٫۴۱ «موردی» را
 * ساخت — ولی فقط برای **شیوهٔ خواندن** (بخشِ ۳۲). پلِ رنگِ صدا که یک
 * نسخه جلوتر ساخته شد، هنوز فقط `فعال = بله` را می‌دید. یعنی «این یک
 * قسمت را با رنگِ صدای او بساز» هیچ راهی نداشت: برای گرفتنِ رنگ باید
 * ردیف را روشن می‌کردی، و روشن کردن یعنی دائم — دقیقاً همان چیزی که
 * او نمی‌خواست.
 *
 * پس همان مرزِ ۷٫۴۱ عیناً تکرار می‌شود: «موردی» از «فعال» **عبور
 * می‌کند**، وگرنه «موردی» فقط نامِ دیگری برای «دائم» است.
 */
function vbrSpeakerOnce_(rows) {
  var rs = rows || vbrSpeakerRows_(), out = [];
  for (var i = 0; i < rs.length; i++) {
    var k = String(rs[i][PC.KEY - 1] || '').trim();
    if (!k) continue;
    try {
      if (personaOnceParse_(rs[i][PC.ONCE - 1]).items.length) out.push(k);
    } catch (e) {}
  }
  return out;
}

/**
 * گویندگانی که **قسمتِ تولیدشده‌ای تیک خورده‌اند** (۷٫۶۲).
 *
 * قرینهٔ `vbrSpeakerOnce_`، برای ستونی که ۷٫۵۹ افزود. بدونِ این،
 * `vbrSpeakerAny_` فقط «روشن» و «موردی» را می‌دید و `vbrAskDue_` پیش از
 * رسیدن به `vbrAskPicked_` برمی‌گشت — یعنی **درمانی روی راهی که هرگز
 * پیموده نمی‌شود** (۷٫۴۶، در کدی که پس از خواندنِ همان درس نوشته شد).
 */
function vbrSpeakerPicked_(rows) {
  var rs = rows || vbrSpeakerRows_(), out = [];
  for (var i = 0; i < rs.length; i++) {
    var k = String(rs[i][PC.KEY - 1] || '').trim();
    if (!k) continue;
    try {
      if (personaOnceParse_(rs[i][PC.PICK - 1]).items.length) out.push(k);
    } catch (e) {}
  }
  return out;
}

/** آیا اصلاً کسی هست؟ — دروازهٔ ارزان، پیش از خواندنِ صفِ یوتیوب. */
function vbrSpeakerAny_(rows) {
  var rs = rows || vbrSpeakerRows_();
  /* هر سه راهی که کار می‌سازند. هر ستونِ تازه‌ای که کار بسازد باید
     **همین‌جا** هم بیاید، وگرنه سازوکارش پشتِ این دروازه می‌مانَد و
     هیچ خطایی هم نمی‌دهد (۷٫۶۲). */
  return !!(vbrSpeakerOn_(rs) || vbrSpeakerOnce_(rs).length ||
            vbrSpeakerPicked_(rs).length);
}

/**
 * گویندهٔ **این** قسمت — دو پاس، همان ترتیبِ `personaFor_`.
 *
 * «موردی» بر «دائم» می‌چربد چون دربارهٔ همین یک قسمت است و آن دیگری
 * دربارهٔ همه — و قسمتِ بعدی باز همان گویندهٔ دائم را می‌گیرد.
 */
function vbrSpeakerPick_(rows, show, epRaw) {
  var rs = rows || vbrSpeakerRows_();
  var e = String(epRaw == null ? '' : epRaw);
  try { if (typeof faDigits_ === 'function') e = faDigits_(e); } catch (eD) {}
  for (var i = 0; i < rs.length; i++) {
    var k = String(rs[i][PC.KEY - 1] || '').trim();
    if (!k) continue;
    try {
      if (personaOnceHit_(rs[i][PC.ONCE - 1], rs[i][PC.SHOWS - 1], show, k, e)) {
        return { key: k, why: 'موردی' };
      }
    } catch (eH) {}
  }
  var on = vbrSpeakerOn_(rs);
  return on ? { key: on, why: 'دائم' } : { key: '', why: '' };
}

/** منو: «🌉 پلِ رنگِ صدا — تبدیلِ آخرین قسمت». */
/**
 * گویندهٔ نمونهٔ «رنگ و روح» و قسمتی که او تیک زده.
 *
 * از همان دو ستونی خوانده می‌شود که `vbrAskPicked_` و `personaFor_`
 * می‌خوانند — «قسمت‌های تولیدشده» و «قسمت‌های موردی». **کنترلِ تازه‌ای
 * ساخته نشد**، چون کنترلی که جایی جز کارِ خودش بنشیند پیدا نمی‌شود (۵٫۶۱)
 * و او همین دو ستون را از ۷٫۵۹ بلد است.
 *
 * ردیف باید «شیوهٔ خواندن» داشته باشد، وگرنه روحی برای گذاشتن نیست و این
 * تابع همان کارِ پل را دوباره می‌کرد. «فعال» شرط نیست: تیک از «فعال» رد
 * می‌شود (۷٫۴۱) و این کار عمداً یک نمونه است، نه تولید.
 */
/**
 * نامِ «برنامه»یِ یک نمونهٔ روح در صف — **یک تعریف، چهار خواننده**.
 *
 * ══ چرا این لازم شد (۷٫۸۶) ══
 * شناسهٔ یک نمونهٔ روح تا امروز (گوینده، قسمت) بود و هیچ چیزِ دیگری. آن روزی
 * درست بود که تنها پرسش «آیا یک بار ساخته شد؟» باشد. ولی نمونه برای
 * **داوریِ پارامتر** ساخته می‌شود، و ۷٫۸۱/۷٫۸۵ گامِ گلدوز را از −۱۲ به ۰ و
 * بعد به −۲ بردند. پس دقیقاً چیزی که نمونه برای سنجیدنش وجود دارد عوض شد و
 * شناسه همان ماند: ردیفِ «نمونهٔ روح — spk-1g0r95d:53» با وضعیتِ «رسید» در صف
 * نشسته بود — ساختهٔ ۲۷ سپتامبر، با گامِ −۱۲ و بی دستورِ لحن — و هم
 * `vbrSoulSeedDue_` و هم `vbrSoulPick_` روی آن می‌گفتند «ساخته شده».
 * یعنی بذرِ ۷٫۸۴ هرگز چیزی نمی‌ساخت و پیامش «برای همهٔ بذرها نمونه ساخته
 * شده» بود: سالم به نظر می‌رسید و هیچ نبود. **همان شکلِ ۷٫۴۶/۷٫۶۲** — درمانی
 * روی راهی که هرگز طی نمی‌شود — این بار در خودِ شناسه.
 *
 * `tag` همان `EMB_TEXT_VER`ِ ۷٫۲۷ است: یک واژهٔ کوتاه در بذر که می‌گوید «این
 * سنجشِ تازه‌ای است». عوضش کن، نمونهٔ تازه ساخته می‌شود؛ عوضش نکن، هیچ.
 * **هیچ حالتِ تازه‌ای هم ذخیره نمی‌شود** (۷٫۸۲): بی‌تکراری از همان سدِ صف
 * می‌آید که از قبل بود.
 *
 * و عمداً یک **برچسب** است نه یک تنظیم: گامِ واقعی از `personaPitch_` می‌آید
 * و از هیچ‌جای دیگر (۷٫۳۰/۷٫۳۱ — دو عدد در دو جا که کسی با هم نسنجیده).
 * گامِ این نمونه را همان‌جا باید عوض کرد، نه اینجا.
 *
 * ولی چرا از `personaPitch_` خوانده نمی‌شود تا خودکار باشد؟ چون
 * `vbrSoulSeedDue_` باید **ارزان** بماند: `personaPitch_` بی ردیف‌های آماده
 * `personaTab_()` → `getHub_()` است، یعنی یک پاسِ تعمیرِ تب روی هابِ ۲۹
 * مگابایتی، ساعتی یک بار — همان هزینه‌ای که ۷٫۶۳ از آن مُرد و ۳۱٫۳-ب برایش
 * قرمز می‌شود. دو تعریفِ متفاوت برای یک شناسه هم بدتر است: زمان‌بند هر شب
 * زمان‌بندی می‌کرد و انتخاب‌کننده هر شب رد می‌کرد.
 *
 * پیشوندِ خالی (`vbrSoulShow_('', '')`) همان چیزی است که پویشِ صف با آن
 * ردیف‌های روح را می‌شناسد — پس آن هم از همین یک تعریف می‌آید.
 */
function vbrSoulShow_(speakerKey, tag) {
  var t = String(tag == null ? '' : tag).trim();
  return 'نمونهٔ روح — ' + String(speakerKey == null ? '' : speakerKey) +
         (t ? ' · ' + t : '');
}


/**
 * ══ متنِ آزمونِ گویندگان (۸٫۲۵) ══
 *
 * او خواست برای سنجیدنِ رضوی و گلدوز متنی باشد «خارج از درس‌نامه … که تمام
 * مواردِ نگارشی داخلش بگنجه و دستوراتِ جدید رو هم بتونن انجام بدن». درسِ
 * معرفت‌شناسی جایی برای نجوا یا لبخند ندارد؛ و نشانه یا حالتی که در نمونه
 * نیست، سنجیده نمی‌شود — فقط خیال می‌کنی سنجیده شد (۸٫۱۰).
 *
 * پس یک داستانِ کوتاه، با دو قاعده:
 * - **هر ده نشانه و هر نُه حالت، جایی که معنا خودش می‌خواهد** — نه پشتِ‌هم
 *   برای شمارش. نشانه‌ای که به‌زور بنشیند، خودش لحنِ غلط می‌سازد.
 * - **جای حالت‌ها ثابت است، نه انتخابِ مدل.** این آزمونِ گوینده است، نه آزمونِ
 *   انتخاب‌گر: اگر هر بار مدل جای دیگری را «آرام» کند، دو گوینده روی دو چیزِ
 *   متفاوت سنجیده می‌شوند. انتخابِ خودِ مدل در قسمت‌ها سنجیده می‌شود.
 *
 * و یک تلهٔ شکستنِ جمله که باید نوشته شود: پایان‌بندی **درونِ** گیومه یا
 * پرانتز («… دارد؟») مرزِ جمله نیست — `speakSentSplit_` پس از نشانه فاصله
 * می‌خواهد و «»» نشانهٔ پایان نیست — پس دو جمله یکی می‌شوند و همهٔ شماره‌های
 * بعد یکی جابه‌جا. گیومه و پرانتز این‌جا فقط وسطِ جمله‌اند.
 *
 * `ver` را هر بار متن عوض شد بالا ببر: نسخهٔ اعراب‌دارِ ذخیره‌شده به همین
 * گره خورده، و متنِ تازه با اعرابِ متنِ کهنه یعنی واژه‌هایی که با هم نمی‌خوانند.
 */
var VOICE_TEST_TEXTS = {
  'ساعت‌ساز': {
    ver: '1',
    title: 'ساعت‌سازِ کوچهٔ باریک',
    blocks: [
      { k: '', t: 'در کوچه‌ای باریک، پشتِ بازارِ قدیمیِ شهر، پیرمردی ساعت‌ساز زندگی می‌کرد که همه «استاد رحیم» صدایش می‌کردند. مغازه‌اش کوچک بود؛ اما هر کس یک بار پا به آن‌جا می‌گذاشت، دیگر هرگز فراموشش نمی‌کرد.' },
      { k: '', t: 'دیوارها پر بود از ساعت: ساعت‌های دیواری، ساعت‌های جیبی، ساعت‌های شماطه‌دار — و حتی یک ساعتِ آفتابی، که هیچ‌کس نمی‌دانست در مغازه‌ای سرپوشیده چه می‌کند. خودش می‌گفت آن ساعتِ آفتابی دقیق‌ترین ساعتِ مغازه است (البته فقط روزهای آفتابی).' },
      { k: '', t: 'بوی روغن و چوبِ کهنه همیشه در هوا بود، و صدای تیک‌تاکِ صدها ساعت با هم، مثلِ نفس‌کشیدنِ آرامِ یک موجودِ زنده، فضا را پر می‌کرد. مشتری‌ها می‌گفتند آن‌جا زمان آهسته‌تر می‌گذرد؛ و شاید راست می‌گفتند.' },
      { k: 'لبخند', t: 'همسایه‌ها هم با خنده می‌گفتند استاد رحیم بهترین (؟) ساعت‌سازِ شهر است، چون خودش هیچ‌وقت سرِ وقت در مغازه را باز نمی‌کرد.' },
      { k: '', t: 'یک روزِ پاییزی، پسرکی ده‌ساله در را باز کرد و آهسته جلو آمد. دستانش می‌لرزید. ساعتِ جیبیِ کهنه‌ای را روی پیشخوان گذاشت؛ شیشه‌اش ترک خورده بود و عقربه‌هایش روی هفت و ده دقیقه ایستاده بودند.' },
      { k: 'مکث' },
      { k: '', t: 'استاد رحیم عینکش را روی بینی جابه‌جا کرد، ساعت را برداشت و مدتی بی‌صدا نگاهش کرد. بعد پرسید: می‌دانی این ساعت چند سال دارد؟' },
      { k: '', t: 'پسرک سرش را تکان داد. پیرمرد گفت این ساعت از خودِ او هم پیرتر است. پسرک با تعجب گفت: از شما هم پیرتر؟!' },
      { k: 'آرام', t: 'بعد آهسته‌تر گفت که ساعت مالِ پدربزرگش بوده است. پدربزرگی که پارسال، در یک شبِ زمستانی، برای همیشه رفته بود…' },
      { k: '', t: 'استاد رحیم چیزی نگفت. فقط سر تکان داد، چراغِ کوچکِ میزِ کارش را روشن کرد و جعبهٔ ابزارش را جلو کشید.' },
      { k: '', t: 'سال‌ها بود که کسی چنین ساعتی برایش نیاورده بود. ساختنش به روزگاری برمی‌گشت که هنوز در شهر برق نبود، و هر چرخ‌دنده‌اش را با دست تراشیده بودند.' },
      { k: 'تند', t: 'یکی‌یکی بیرونشان آورد: پیچ‌گوشتیِ ریز، ذره‌بین، موچینِ نقره‌ای، روغن‌دانِ کوچک، فنرهای یدکی، و دفترچه‌ای جلدچرمی که همهٔ رازهای کارش را در آن نوشته بود.' },
      { k: 'سنگین', t: 'پیش از آنکه درِ ساعت را باز کند، رو به پسرک کرد و گفت: اگر عجله کنی، این چرخ‌دنده‌های ظریف برای همیشه می‌شکنند. در این کار، هیچ‌چیز جای صبر را نمی‌گیرد.' },
      { k: '', t: 'ساعت‌ها گذشت. پسرک روی چهارپایهٔ چوبی نشسته بود و نگاه می‌کرد؛ گاهی به دستانِ پیرمرد، گاهی به عقربه‌های بی‌حرکت، و گاهی به کوچه، که کم‌کم تاریک می‌شد.' },
      { k: '', t: 'یک بار پرسید: چرا این‌قدر طول می‌کشد؟ استاد بی آنکه سر بلند کند جواب داد که ساعتی که هفتاد سال کار کرده، حق دارد چند ساعتی هم برای خودش وقت بخواهد.' },
      { k: 'نجوا', t: 'وسطِ کار، استاد خم شد و طوری که انگار رازی را می‌گوید، زیرِ لب گفت که «قلبِ هر ساعتی همین فنرِ کوچک است»، نه آن عقربه‌هایی که همه نگاهشان می‌کنند.' },
      { k: '', t: 'بعد قطره‌ای روغن روی محور چکاند، پیچِ آخر را بست، و ساعت را آرام کنارِ گوشش برد.' },
      { k: 'مکث' },
      { k: 'بلند', t: 'ناگهان صدای تیک‌تاک در مغازه پیچید! ساعت دوباره زنده شده بود!' },
      { k: 'کمی‌بلند', t: 'پسرک از جا پرید و گفت: این همان صدایی است که هر شب از اتاقِ پدربزرگ می‌شنیدم!' },
      { k: '', t: 'پیرمرد ساعت را در دستِ کوچکِ پسرک گذاشت و دستش را رویش بست. پسرک کیفِ پولش را درآورد؛ اما استاد سرش را به نشانهٔ نه تکان داد. پسرک پرسید: پس چرا پول نمی‌گیرید؟' },
      { k: 'کشیده', t: 'استاد رحیم لبخندی زد و گفت: بعضی چیزها را نمی‌شود با پول اندازه گرفت؛ مثلِ صدای کسی که دیگر نیست.' },
      { k: '', t: 'آن روز پسرک فهمید که ساعت‌ها فقط زمان را نشان نمی‌دهند — گاهی آدم‌ها را هم به یاد می‌آورند. و شاید برای همین است که هنوز، در آن کوچهٔ باریک، صدای تیک‌تاک از پشتِ شیشه‌ها شنیده می‌شود.' }
    ]
  }
};

function vtestDef_(id) {
  var d = VOICE_TEST_TEXTS[String(id == null ? '' : id)];
  return (d && d.blocks && d.blocks.length) ? d : null;
}

/**
 * بلوک‌ها ⇒ متنِ ساده و حالت‌ها با **شمارهٔ جمله**. شمارش با همان
 * `speakSentSplit_` است که گفتارساز با آن تکه می‌کند — تعریفِ دوم یعنی روزی
 * «آرام» روی جملهٔ کناری می‌نشیند و هیچ خطایی نمی‌دهد (۸٫۲۴).
 */
function vtestPlain_(def) {
  var parts = [], spans = [], n = 0, pauseNext = false;
  for (var i = 0; i < def.blocks.length; i++) {
    var b = def.blocks[i] || {};
    var k = String(b.k || '');
    var t = String(b.t || '').replace(/\s+/g, ' ').trim();
    if (k === 'مکث' && !t) { pauseNext = true; continue; }
    if (!t) continue;
    var c = speakSentSplit_(t).length;
    if (pauseNext) { spans.push({ from: String(n + 1), k: 'مکث' }); pauseNext = false; }
    if (k) spans.push({ from: String(n + 1), to: String(n + c), k: k });
    parts.push(t);
    n += c;
  }
  return { text: parts.join(' '), spans: spans, n: n };
}

/** پوشهٔ نمونه‌های رنگ و روح در OUTPUT — یک تعریف برای سازنده و متنِ آزمون. */
function vbrSoulFolder_() {
  var root = outFolder_();
  var pName = CFG.VBR_SOUL_FOLDER || 'نمونهٔ رنگ و روح';
  var it = root.getFoldersByName(pName);
  return it.hasNext() ? it.next() : root.createFolder(pName);
}

function vtestMarksSame_(a, b) {
  var ha = speakProsody_(a).has || {}, hb = speakProsody_(b).has || {};
  var keys = {};
  var k;
  for (k in ha) if (Object.prototype.hasOwnProperty.call(ha, k)) keys[k] = 1;
  for (k in hb) if (Object.prototype.hasOwnProperty.call(hb, k)) keys[k] = 1;
  for (k in keys) {
    if (!Object.prototype.hasOwnProperty.call(keys, k)) continue;
    if ((ha[k] || 0) !== (hb[k] || 0)) return false;
  }
  return true;
}

/**
 * متنِ آزمونِ اعراب‌دار — **یک بار** ساخته و ذخیره، برای هر دو گوینده.
 *
 * ══ چرا ذخیره، نه هر بار از نو ══
 * اعراب‌گذاری کارِ مدل است و دو بار پرسیدن دو جوابِ کمی متفاوت می‌دهد؛ آن‌وقت
 * رضوی و گلدوز روی دو متنِ متفاوت سنجیده می‌شوند — همان چیزی که این متن
 * برای از بین بردنش ساخته شد. و سقفِ شش‌دقیقه: اعراب (~یک دقیقه) و صداسازی
 * (~چهار دقیقه) با هم در یک اجرا جا نمی‌شوند، پس اولی اجرای خودش را دارد.
 *
 * ══ و نشانه‌ها دست نمی‌خورند ══
 * اعراب‌گذارِ قسمت‌ها نشانه‌گذاریِ لحن هم می‌کند — «.» را «!» می‌کند. این‌جا
 * نشانه‌ها را خودم گذاشته‌ام و جایشان طراحی شده، پس اعراب‌گذار با
 * `SPEAK_MARKS: false` پرسیده می‌شود («نشانه‌ها همان بمانند»)، و هر تکه‌ای که
 * باز هم نشانه‌ای را عوض کند یا شمارِ جمله را، **متنِ ساده‌اش** می‌مانَد —
 * بی‌اعراب بهتر از نشانهٔ گمشده، چون آزمون دربارهٔ همان نشانه‌هاست.
 *
 * `{ok, t, spans, title, fresh, vowelled, pieces, why}`
 */
function vtestText_(id) {
  var def = vtestDef_(id);
  if (!def) return { ok: false, why: 'متنِ آزمونِ «' + id + '» تعریف نشده' };
  var p = vtestPlain_(def);
  var tr = speakSpanTrim_({ spans: p.spans }, p.n);
  var out = { ok: true, t: '', spans: tr.spans, title: def.title, fresh: false,
              vowelled: 0, pieces: 0, why: '', n: p.n };
  var dk = Object.keys(tr.drop || {});
  if (dk.length) out.why = 'حالتِ ردشده در متنِ آزمون: ' + dk.join('، ');

  var fname = 'متنِ آزمونِ گویندگان — ' + id + ' — نسخهٔ ' + def.ver + '.json';
  var h = speakHash_(p.text);
  var par = vbrSoulFolder_();
  try {
    var itF = par.getFilesByName(fname);
    if (itF.hasNext()) {
      var c = JSON.parse(itF.next().getBlob().getDataAsString());
      if (c && c.h === h && c.t &&
          speakSentSplit_(String(c.t)).length === p.n) {
        out.t = String(c.t);
        out.vowelled = Number(c.vowelled) || 0;
        out.pieces = Number(c.pieces) || 0;
        return out;
      }
    }
  } catch (eR) {}

  var pcs = speakPieces_(p.text, 1500);
  var acc = [], notes = {};
  var keep = CFG.SPEAK_MARKS;
  for (var i = 0; i < pcs.length; i++) {
    var v = '';
    CFG.SPEAK_MARKS = false;
    try { v = vowelizePiece_(pcs[i]); }
    catch (eV) { v = ''; }
    finally { CFG.SPEAK_MARKS = keep; }
    var w = '';
    if (!v) w = 'اعراب نگرفت';
    else if (speakSentSplit_(v).length !== speakSentSplit_(pcs[i]).length) w = 'شمارِ جمله عوض شد';
    else if (!vtestMarksSame_(pcs[i], v)) w = 'نشانه عوض شد';
    if (w) { acc.push(pcs[i]); notes[w] = (notes[w] || 0) + 1; }
    else { acc.push(v); out.vowelled++; }
  }
  out.pieces = pcs.length;
  var t = acc.join(' ');
  /* و سدِ بیرونی: اگر سرِهم‌شده شمارِ جمله‌ها را نگه ندارد، همهٔ حالت‌ها
     جابه‌جا می‌نشینند — پس کلِ متنِ ساده، نه متنی که شماره‌هایش دروغ است. */
  if (speakSentSplit_(t).length !== p.n) { t = p.text; out.vowelled = 0; notes['سرِهم‌شده جابه‌جا شد'] = 1; }
  out.t = t;
  out.fresh = true;
  var nk = Object.keys(notes);
  if (nk.length) {
    out.why = (out.why ? out.why + ' · ' : '') + nk.map(function (k) {
      return k + (notes[k] > 1 ? ' ×' + notes[k] : '');
    }).join('، ');
  }
  try {
    var old = par.getFilesByName(fname);
    while (old.hasNext()) old.next().setTrashed(true);
    par.createFile(Utilities.newBlob(JSON.stringify({
      id: id, ver: def.ver, h: h, t: t, vowelled: out.vowelled,
      pieces: out.pieces, why: out.why, at: nowStr_()
    }), 'application/json', fname));
  } catch (eW) {
    out.why = (out.why ? out.why + ' · ' : '') + 'ذخیره نشد: ' + String(eW.message || eW).slice(0, 60);
  }
  return out;
}

function vbrSoulPick_() {
  var out = { ok: false, why: '' };
  var rows = [];
  try { rows = vbrSpeakerRows_(); } catch (e) {
    out.why = 'تبِ «صداها» خوانده نشد: ' + String((e && e.message) || e).slice(0, 60);
    return out;
  }
  /* ══ آنچه یک بار ساخته شد، نوبتِ بعدی را نمی‌گیرد (۷٫۷۵) ══
     نگارشِ ۷٫۷۴ همیشه **اولین** ردیفِ واجدِ شرط را برمی‌داشت. صاحبِ برنامه
     دو گوینده دارد و پرسید «برای هر دو چطور؟» — و جواب این بود که با تیکِ
     هر دو، هر بار فشار دادن سراغِ ردیفِ اول می‌رفت و `vbrAsk_` با «قبلاً
     خواسته شده» ردش می‌کرد، پس نفرِ دوم **هرگز** نوبت نمی‌گرفت. دکمه‌ای که
     بارِ دوم کار نکند، برای کسی که دو گوینده دارد یعنی نصفِ قابلیت.
     پس جفتِ (گوینده، قسمت)ی که از قبل در صف است رد می‌شود و فشارِ دوم
     خودش می‌رود سرِ بعدی. */
  var already = {};
  try {
    var q0 = vbrRead_();
    for (var z = 0; z < q0.items.length; z++) {
      var k0 = String(q0.items[z].key || '');
      if (k0.indexOf(vbrSoulShow_('', '')) === 0) already[k0] = 1;
    }
  } catch (eQ) { already = {}; }

  var map = null, noCue = [], done = [];
  for (var i = 0; i < rows.length; i++) {
    var key = String(rows[i][PC.KEY - 1] || '').trim();
    if (!key) continue;
    var name = String(rows[i][PC.NAME - 1] || '').trim() || key;
    var cue = String(rows[i][PC.STYLE - 1] || '').trim();
    /* ══ فقط ستونِ «قسمت‌های تولیدشده»، عمداً ══
       ۷٫۵۹ این دو ستون را از هم جدا کرد و جداییِ درستی بود: «تولیدشده»
       یعنی صوتش همین حالا هست، «موردی» یعنی قسمتی که هنوز ساخته نشده.
       این نمونه از **متنِ خودِ قسمت** ساخته می‌شود، پس قسمتِ نساخته
       متنی هم ندارد. خواندنِ «موردی» اینجا یعنی وعده‌ای که همیشه رد
       می‌شود — و بی‌صدا. */
    var cell = String(rows[i][PC.PICK - 1] == null ? '' : rows[i][PC.PICK - 1]).trim();
    var set = {};
    var seeded = {};
    var seedTag = {};
    var seedItem = {};
    /* ══ بذرِ موتور، کنارِ تیکِ او — نه به‌جایش (۷٫۸۴) ══
       تیک یعنی «دکمه را که زدم، این را بساز» و ۷٫۷۴ همین را تعریف کرد؛
       اگر موتور خودش روی تیک عمل کند، معنای آن ستون بی‌خبر عوض می‌شود.
       پس بذر مجموعهٔ **جداگانه**ای است و ردیفِ برگشتی می‌گوید کدام بود:
       فقط بذر به‌طور خودکار ساخته می‌شود. */
    var sd = vbrSoulSeeds_();
    for (var sdi = 0; sdi < sd.length; sdi++) {
      var se = sd[sdi] || {};
      if (String(se.speaker || '').trim() !== key) continue;
      if (!se.show || !se.ep) continue;
      var sk = String(se.show) + ':' + String(se.ep);
      set[sk] = 1; seeded[sk] = 1;
      seedTag[sk] = String(se.tag == null ? '' : se.tag).trim();
      /* متنِ آزمون پوشهٔ قسمت ندارد و در `_YT-RENDER.json` نیست (۸٫۲۵)؛
         شیءِ خودش را می‌سازد. */
      if (se.text) {
        var vd = vtestDef_(se.text);
        if (vd) seedItem[sk] = { show: String(se.show), ep: String(se.ep),
                                 title: vd.title, text: String(se.text) };
      }
    }
    if (cell) {
      try {
        var tset = personaPickSet_(cell, rows[i][PC.SHOWS - 1]) || {};
        for (var tk in tset) {
          if (Object.prototype.hasOwnProperty.call(tset, tk)) set[tk] = 1;
        }
      } catch (eS) {}
    }
    var any = false;
    for (var kk in set) { if (Object.prototype.hasOwnProperty.call(set, kk)) { any = true; break; } }
    if (!any) continue;
    /* ردیفی که تیک دارد و شیوهٔ خواندن ندارد **نام‌برده** می‌شود، نه بی‌صدا
       رد. او تیک زده و منتظرِ چیزی است؛ سکوت یعنی هرگز نمی‌فهمد چرا نیامد
       (همان قاعدهٔ `personaOnceParse_`، ۷٫۴۱). */
    if (!cue) { noCue.push(name); continue; }
    if (!map) {
      map = {};
      try {
        var d = ytRenderRead_();
        for (var q = 0; q < d.items.length; q++) {
          var it = d.items[q];
          if (!it.folderId) continue;
          map[String(it.show) + ':' + String(it.ep)] = it;
        }
      } catch (eR) { map = {}; }
    }
    for (var k in set) {
      if (!Object.prototype.hasOwnProperty.call(set, k)) continue;
      var item = seedItem[k] || map[k];
      if (!item) continue;                       // پوشه‌اش شناخته نیست
      /* برچسبِ بذر بخشی از شناسه است (۷٫۸۶): نمونه‌ای که با گامِ دیگری
         ساخته شده، «همان نمونه» نیست. تیکِ او برچسب ندارد، پس رفتارش
         عیناً همان ۷٫۷۵ می‌مانَد. */
      var tg = seedTag[k] || '';
      if (already[vbrSoulShow_(key, tg) + ':' + String(item.ep)]) {
        done.push(name + ' — قسمت ' + String(item.ep) +
                  (tg ? ' · ' + tg : ''));
        continue;                                // این یکی ساخته شده
      }
      return { ok: true, key: key, name: name, cue: cue, item: item,
               seeded: !!seeded[k], tag: tg };
    }
  }
  /* «همه‌اش ساخته شده» با «چیزی تیک نخورده» یکی نیست، و گفتنِ دومی به‌جای
     اولی یعنی او فکر می‌کند تیکش گم شده. */
  if (done.length) {
    out.done = done;
    out.why = 'برای همهٔ تیک‌ها نمونه ساخته شده: ' + done.join(' · ') +
              '. برای نمونهٔ تازه، قسمتِ دیگری را تیک بزنید';
    return out;
  }
  /* «تیک خورده» گفته نمی‌شود، چون ممکن است از بذرِ موتور آمده باشد نه از
     دستِ او (۷٫۸۴). نسبت دادنِ کاری که نکرده، همان دستورِ غلطی است که این
     پرونده می‌گوید از نبودِ دستور بدتر است. */
  out.why = noCue.length
    ? ('برای ردیفِ «' + noCue.join('» و «') + '» قسمتی در نوبت است ولی ستونِ ' +
       '«شیوهٔ خواندن»ش خالی است — بی آن روحی برای گذاشتن نیست')
    : 'هیچ قسمتی در ستونِ «قسمت‌های تولیدشده» تیک نخورده';
  return out;
}

/**
 * «رنگ و روح» روی یک قسمتِ **ساخته‌شده** — یک نمونهٔ بلند، نه کلِ قسمت.
 *
 * ══ چرا این تابع لازم شد (۷٫۷۴) ══
 * پل صوتِ موجودِ قسمت را تبدیل می‌کند، و خوانش در آن صوت **پخته** است.
 * پس روی قسمتی که ماه‌ها پیش با خوانشِ عادی ساخته شده، پل ساختاراً فقط
 * می‌تواند رنگ بگذارد — همان چیزی که ۷٫۷۳ نوشت و صاحبِ برنامه پیشش شنید.
 * جوابِ «برای گلدوز هم همین کار را بکنم، ولی رنگ و روح با هم؟» تا دیروز
 * این بود: «نه، مگر قسمتِ تازه‌ای تولید شود».
 *
 * این تابع راهِ سومی می‌سازد که نه تولیدِ دوبارهٔ کلِ قسمت است و نه نمونهٔ
 * ساختگی: **متنِ خودِ آن قسمت** (اعراب‌دار، از `__speakSegs`) با **شیوهٔ
 * خواندنِ همان گوینده** خوانده می‌شود، و همان فایل از راهِ عادیِ پل
 * می‌گذرد تا رنگ هم بگیرد. خروجی در تلگرام می‌آید، مثل هر تبدیلِ دیگر.
 *
 * ══ و چرا ~چهار دقیقه و نه پانزده ══
 * سقفِ شش‌دقیقه‌ایِ Apps Script. پانزده دقیقه صدا یعنی ~۱۵ فراخوانِ TTS و
 * یک ماشینِ ادامه‌پذیر — که همان `renderAudioStep_` است و تنها بخشی از این
 * مخزن که بی‌دلیل نباید دست بخورد. چهار دقیقه از بیست ثانیه بی‌نهایت
 * بهتر است و امروز شدنی است؛ پانزده دقیقه از راهِ تولیدِ قسمتِ تازه با
 * ردیفِ روشن می‌آید. هر دو راه گفته می‌شوند، نه یکی.
 */
function runVoiceSoulTest() {
  var ui = ui_();
  var say = function (m) {
    logLine_('نمونهٔ رنگ و روح: ' + String(m).replace(/\n+/g, ' ').slice(0, 200));
    if (ui) ui.alert('نمونهٔ بلند با رنگ و روح', m, ui.ButtonSet.OK); else console.log(m);
  };
  var pick = vbrSoulPick_();
  if (!pick.ok) {
    say('⚠️ ' + pick.why + '.\n\nراهش: منو ← «🎚 شیوهٔ خواندنِ گویندگان» ← ' +
        'ردیفِ گوینده ← یک قسمتِ تولیدشده را تیک بزنید (ستونِ «شیوهٔ خواندن» ' +
        'هم باید پر باشد)، بعد همین دکمه.');
    return { ok: false, why: pick.why };
  }
  /* مدل پیش از ساختنِ صدا سنجیده می‌شود، نه بعدش: ~چهار دقیقه فراخوانِ TTS
     خرج کردن و بعد سرِ صف فهمیدن که مدلی نیست، هم هزینه است هم پیامِ
     دیرهنگام. و او همین حالا جلوی پنجره ایستاده، پس این تنها جایی است که
     جملهٔ «چه باید بکنی» واقعاً خوانده می‌شود. */
  var mdlChk = null;
  try { mdlChk = vbrModel_(pick.key); } catch (eM) { mdlChk = null; }
  if (mdlChk && !mdlChk.ok) {
    say('⚠️ ' + String(mdlChk.why || 'مدلِ این گوینده آماده نیست') +
        (mdlChk.folderUrl ? '\n\n' + mdlChk.folderUrl : '') +
        '\n\nتا مدل سرِ جایش نباشد، رنگِ صدا گذاشته نمی‌شود — پس نمونه هم ' +
        'ساخته نمی‌شود، که بهتر از ساختنِ چهار دقیقه صوتِ بی‌رنگ است.');
    return { ok: false, why: String(mdlChk.why || 'مدل نیست'), speaker: pick.key };
  }
  /* ══ متن و نشانه‌گذاری **پیش از** سدِ دستورِ لحن (۸٫۰۹) ══
     ۸٫۰۸ کارِ لحن را به نشانه‌های خودِ متن سپرد، و سدِ ۷٫۷۹ از دنیایی مانده
     بود که در آن لحن **فقط** از فیلدِ دستور می‌آمد: با خاموش‌بودنِ دستور،
     نمونه رد می‌شد. یعنی دقیقاً نمونه‌ای که برای سنجشِ نشانه‌ها ساخته
     می‌شود، هرگز ساخته نمی‌شد — سدی که برای دنیای قبل درست بود و جلوِ
     درمانِ دنیای بعد را می‌گرفت.
     پس ترتیب عوض شد: اول متن خوانده و نشانه‌گذاری می‌شود، بعد سد تصمیم
     می‌گیرد. بهایش یک فراخوانِ **متنی** روی مسیرِ ردشدن است — در برابرِ
     چهار دقیقه TTS که سد جلویش را می‌گیرد، ارزان؛ و بی آن، تصمیم ممکن
     نیست. */
  var txt = '';
  /* ══ متنِ آزمون (۸٫۲۵) ══
     اعراب یک بار ساخته می‌شود و اجرای خودش را دارد: با صداسازی در یک اجرا
     از شش دقیقه می‌گذرد. اجرای بعدی یک دقیقه بعد خودش زمان‌بندی می‌شود —
     یک بار در عمرِ هر نسخهٔ متن، چون بعد از آن از پرونده خوانده می‌شود. */
  var vtest = null;
  if (pick.item && pick.item.text) {
    try { vtest = vtestText_(pick.item.text); }
    catch (eVt) { vtest = { ok: false, why: String((eVt && eVt.message) || eVt).slice(0, 100) }; }
    if (!vtest.ok) {
      say('⚠️ متنِ آزمون آماده نشد: ' + vtest.why);
      return { ok: false, why: vtest.why, speaker: pick.key };
    }
    if (vtest.fresh) {
      try {
        clearRetryTriggers_('runVoiceSoulSeed');
        ScriptApp.newTrigger('runVoiceSoulSeed').timeBased().after(60 * 1000).create();
      } catch (eSch) {}
      say('✅ متنِ آزمونِ «' + vtest.title + '» اعراب گرفت (' + vtest.vowelled + ' از ' +
          vtest.pieces + ' تکه)' + (vtest.why ? ' — ' + vtest.why : '') +
          ' و ذخیره شد. ساختِ صدا یک دقیقهٔ دیگر در اجرای جدا شروع می‌شود؛ ' +
          'هر دو با هم در سقفِ شش‌دقیقه جا نمی‌شوند.');
      return { ok: false, why: 'متنِ آزمون آماده شد؛ ساخت در اجرای بعد',
               pending: true, speaker: pick.key };
    }
    txt = vtest.t;
  }
  if (!vtest) { try { txt = epSpeakText_(pick.item.folderId); } catch (eT) { txt = ''; } }
  if (!txt) {
    var w = 'متنِ اعراب‌دارِ قسمت ' + String(pick.item.ep) + ' در پروندهٔ خودش نیست ' +
            '(قسمت‌های قدیمی `__speakSegs` ندارند)';
    say('⚠️ ' + w + '.\n\nیک قسمتِ تازه‌تر را تیک بزنید.');
    return { ok: false, why: w };
  }

  /* ══ و نشانه‌گذاریِ لحن، پیش از خواندن (۸٫۰۸) ══
     صاحبِ برنامه گفت «اونجایی که باید مثل با تعجب یا سوالی بگه چی؟». این
     نمونه از متنِ **ذخیره‌شدهٔ** قسمت ساخته می‌شود، و قسمت‌های پیش از ۸٫۰۸
     آن نشانه‌ها را ندارند — چون تا دیروز از `verifySpeak_` نمی‌گذشتند. پس
     نمونه‌ای که برای داوریِ **لحن** ساخته شود و متنش بی‌نشانه باشد، چیزی را
     که نامش را دارد نمی‌سنجد: ۷٫۸۶ عیناً، «چیزی که برای سنجشِ یک پارامتر
     ساخته می‌شود باید آن پارامتر را در خودش داشته باشد».

     سدها همان سدهای همیشه‌اند — `speakMarkUp_` جوابش را از `verifySpeak_`
     می‌گذرانَد و اگر گویاتر نشد `null` می‌دهد — پس بدترین حالت همان متنِ
     قبلی است و نمونه ساخته می‌شود، فقط بی لحنِ تازه. و عدد در پیام می‌آید
     نه یک برچسب: اگر نگرفت باید دیده شود (۷٫۷۹). */
  /* `prRich` و `prWhy` از ۸٫۱۴: عدد و دلیل باید از این اجرا **بیرون** بروند،
     وگرنه با پایانِ اجرا می‌مانند و فردا کسی نمی‌داند ترمیم گرفت یا نه. */
  var prMsg = '', prMarks = false, prCover = null, prRich = null, prWhy = '';
  try {
    var needP = Number(CFG.SPEAK_PROSODY_MIN);
    if (!isFinite(needP) || needP <= 0) needP = 3;
    if (CFG.SPEAK_MARKS !== false && typeof speakMarkUp_ === 'function') {
      var pA = speakProsody_(txt);
      /* ══ سقف این‌جا چگالی نیست، **پوشش** است (۸٫۱۰) ══
         در قسمت، نشانه جایی می‌نشیند که معنا بخواهد و چگالی سنجهٔ درستی است.
         در نمونه، پرسش این است: «گفتارساز گیومه را لحن می‌کند یا بلند
         می‌خوانَد؟» — و آن پرسش روی متنی که گیومه ندارد **بی‌جواب** می‌مانَد.
         پس ترمیم وقتی می‌رود که نشانه‌ای **کم** باشد، نه وقتی چگالی کم باشد. */
      var cv0 = speakMarkCover_(txt);
      if (!cv0.ok || pA.richPer1k < needP) {
        var mkS = speakMarkUp_(txt, txt, true);
        if (mkS && mkS.t) {
          txt = mkS.t;
          prMsg = 'نشانه‌گذاریِ لحن: ' + pA.richPer1k + ' ⇒ ' + mkS.after.richPer1k +
                  ' نشانهٔ گویا در هزار نویسه (' + mkS.after.kinds + ' نوع)' +
                  ' · ' + mkS.ok + ' از ' + mkS.blocks + ' بند' +
                  (mkS.why ? ' (' + mkS.why + ')' : '');
        } else {
          /* **علت** می‌آید، نه «نگرفت» (۸٫۲۲): «واژه‌ها عوض شدند»، «شمارِ
             پایان‌بندی عوض شد»، «مدل جواب نداد» و «گویاتر نشد» چهار چارهٔ
             کاملاً متفاوت دارند، و تا امروز هر چهار یک جمله می‌شدند. */
          prMsg = 'نشانه‌گذاریِ لحن نگرفت (' + pA.richPer1k +
                  ' نشانهٔ گویا در هزار مانْد' +
                  ((mkS && mkS.why) ? ' — ' + mkS.why : '') +
                  ') — متنِ قسمت همان‌طور خوانده می‌شود';
          /* فقط همین حالت دلیل دارد: ترمیم **خواسته شد و نگرفت**. دو حالتِ
             دیگر خبرِ خوب‌اند و تکرارشان در کپشن همان هشداری است که یاد
             می‌گیرند نخوانند (۷٫۴۰/۸٫۰۵). */
          prWhy = 'ℹ️ ترمیمِ نشانه‌گذاری نگرفت؛ متنِ قسمت همان‌طور خوانده شد.';
        }
      } else {
        prMsg = 'متنِ قسمت از قبل هر هفت نشانه را دارد (' + pA.richPer1k + ' در هزار)';
      }
      /* ══ و آنچه در نمونه **نیست** باید نام برده شود ══
         سکوت این‌جا یعنی او چهار دقیقه گوش می‌دهد و بعد خیال می‌کند دربارهٔ
         گیومه قضاوت کرده، در حالی که گیومه‌ای نبوده. «نسنجیده» با «سالم» یکی
         نیست — همان مرزِ «نامعلومِ» ۸٫۰۵. */
      prCover = speakMarkCover_(txt);
      prMsg += '\nنشانه‌های موجود در این نمونه: ' +
               (prCover.have.length ? prCover.have.join(' · ') : '—') +
               (prCover.miss.length
                 ? '\n⚠️ در این نمونه نیست، پس دربارهٔ این‌ها قضاوت نکنید: ' +
                   prCover.miss.join(' · ')
                 : '\n✅ هر هفت نشانه در متن هست — هر هفت را می‌توانید بسنجید.');
    }
    /* ══ شاهد، از **متنی که واقعاً خوانده می‌شود** ══
       نه از «ترمیم گرفت یا نه» و نه از پرچمی که خودمان بالا برده باشیم: اگر
       جوابِ مدل رد شد، متن همان متنِ قبلی است و باید همان سنجیده شود. و اگر
       متن از قبل نشانه داشت، ترمیمی در کار نبوده و شاهد باز هم هست. این
       تفاوت همان چیزی است که ۷٫۷۹ از آن درس گرفت: برچسب از رویداد بیاید،
       نه از امید. */
    prRich = speakProsody_(txt).richPer1k;
    prMarks = prRich >= needP;
  } catch (ePm) { prMsg = ''; prMarks = false; prRich = null; }

  /* ══ و دستورِ لحن، پیش از خرجِ چهار دقیقه (۷٫۷۹) ══
     صاحبِ برنامه هر دو نمونه را شنید و گفت آن ویژگیِ صدای رضوی هنوز در
     همهٔ کلمات هست. حق داشت، و علتش در `_STATUS.json`ِ خودِ موتور نوشته
     بود: `ttsCue.on = false` از ۲۷ سپتامبر ۱۹:۳۳، چون مدلِ صوتی قالبِ
     دستور را نپذیرفت — «تکه‌ها بی‌لحن ساخته می‌شوند». هر دو نمونه صبحِ
     بعد ساخته شدند، یعنی **بی شیوهٔ خواندن**. پس برچسبِ «روح» روی آن
     ردیف‌ها دروغ بود و من همان را دو بار به او گفتم.

     `vbrSoul_` نمی‌توانست بگیردش: ۷٫۷۳ آن را ساخت که `ep.__persona` را
     بخوانَد، یعنی «آیا شیوهٔ خواندن **انتخاب** شد» — نه «آیا به مدل
     **رسید**». شاهدی که خودِ خرابی را نمی‌بیند. دو شاهد در یک سامانه که
     هر روز با هم مخالف بودند و هیچ‌وقت کنارِ هم گذاشته نشدند (۷٫۵۷).

     و امتناع درست‌تر از ساختن است: کلِ کارِ این دکمه داوریِ **روح** است.
     چهار دقیقه فراخوانِ TTS خرج کردن تا فایلی بدهد که همان «رنگ‌تنها»ی
     دیروز است، هم هزینه است هم یک ادعای نادرستِ دیگر. */
  /* ══ حالت‌ها (۸٫۲۴) ══
     کشیده، بلند، کمی بلندتر، آرام، نجوا … — آنچه نشانهٔ نگارشی نمی‌تواند
     بگوید. مدلِ متنی جدول را می‌خوانَد و فقط **شمارهٔ جمله** می‌دهد؛ گوینده
     هرگز نشانه‌ای نمی‌بیند. پس از نشانه‌گذاری، چون شمارش روی متنی است که
     واقعاً خوانده می‌شود. */
  var spanPlan = { spans: [], why: 'خاموش' };
  try {
    /* متنِ آزمون جای حالت‌هایش را خودش دارد: این آزمونِ گوینده است، نه
       آزمونِ انتخاب‌گر — دو گوینده باید روی **همان** جاها سنجیده شوند. */
    if (vtest) spanPlan = { spans: vtest.spans || [], why: 'متنِ آزمون حالتی ندارد' };
    else if (CFG.SPEAK_SPANS !== false && typeof speakSpanPlan_ === 'function') {
      spanPlan = speakSpanPlan_(txt, true);
    }
  } catch (eSp) { spanPlan = { spans: [], why: 'سنجیده نشد: ' + String(eSp.message || eSp).slice(0, 60) }; }
  var cueChk = null;
  try { cueChk = ttsCueStatus_(); } catch (eC) { cueChk = null; }
  /* مهر **پیش از** ساخت برداشته می‌شود؛ مقایسه‌اش پس از ساخت می‌گوید در
     همین نمونه تکه‌ای بی‌دستور ساخته شد یا نه (۷٫۸۹). */
  var dropChk = '';
  try { dropChk = ttsCueDropAt_(); } catch (eD0) { dropChk = ''; }
  /* ══ و سد فقط وقتی می‌بندد که **هیچ‌چیز** لحن را نبرد (۸٫۰۹) ══
     دو راه برای رسیدنِ لحن هست: فیلدِ دستور، و نشانه‌های خودِ متن. اگر متن
     نشانه دارد، خاموش‌بودنِ دستور یعنی «نیمی از راه»، نه «هیچ راهی» — و
     نمونه ساخته می‌شود، با برچسبی که راستش را می‌گوید. اگر هیچ‌کدام نیست،
     امتناع همان‌قدر درست است که در ۷٫۷۹ بود: چهار دقیقه خرج کردن برای
     فایلی که دیروز هم همان بود. */
  if (cueChk && cueChk.ok === false && !prMarks) {
    say('⚠️ الان **شیوهٔ خواندن به مدل نمی‌رسد** و متنِ این قسمت هم نشانهٔ ' +
        'لحن ندارد، پس این نمونه فقط رنگِ صدا می‌گرفت — همان چیزی که دیروز ' +
        'گرفتید.\n\n' + String(cueChk.line || '') +
        '\n\nخودش درست می‌شود: وارسیِ سلامتِ ۱۰:۰۰ دبی یک مدلِ صوتیِ دیگر ' +
        'را امتحان می‌کند (`ttsCueSwitch_`). وقتی سطرِ «دستورِ لحن» در نامهٔ ' +
        '۱۰ صبح گفت «روشن»، همین دکمه را بزنید و نمونه هر دو را خواهد داشت.' +
        '\n\nتیکِ شما سرِ جایش می‌مانَد؛ چیزی گم نشد.');
    return { ok: false, why: 'دستورِ لحن خاموش است: ' + String(cueChk.model || ''),
             speaker: pick.key, cueOff: true };
  }
  /* ══ قفل، چون این کار پرچمِ سبک را عوض می‌کند ══
     عیناً دلیلِ `runStyleProbe`: اگر وسطِ صداگذاریِ یک قسمتِ منتشرشدنی
     زده شود، نیمی از تکه‌های آن قسمت یادآورِ سبک می‌گیرند و نیمی نه. */
  var lock = null, got = false;
  try { lock = LockService.getScriptLock(); got = lock.tryLock(20000); }
  catch (eLk) { got = false; }
  if (!got) {
    say('⚠️ الان اسکریپتِ دیگری در حال اجراست (احتمالاً صداگذاریِ قسمت). ' +
        'چند دقیقهٔ دیگر دوباره بزنید.');
    return { ok: false, why: 'busy' };
  }

  var res = { ok: false, why: '' }, made = null, sec = 0, cut = 0, spanLine = '';
  var deadline = new Date().getTime() +
                 (Number(CFG.STYLE_PROBE_BUDGET_MS) || 240000);
  try {
    /* سبکِ مکثِ همین گوینده (۸.۴۱) — همان تعریفِ قسمت‌ها: «مکث» به اندازهٔ
       «میانِ بندها»ی خودش، و هر مکثی که گفتارساز کوتاه‌تر از اندازهٔ او
       گذاشت، کشیده. تا او همان چیزی را بشنود که قسمتِ واقعی خواهد داشت. */
    var perS = { cue: pick.cue, name: pick.name, key: pick.key };
    var pzS = null, gapsS = null;
    try { pzS = speakMoodPause_(perS); } catch (ePz) { pzS = null; }
    try { gapsS = speakStyleGaps_(perS); } catch (eGp) { gapsS = null; }
    var pieces = (spanPlan.spans && spanPlan.spans.length)
      ? speakSpanPieces_(txt, spanPlan.spans, pzS && pzS.src !== 'پیش‌فرض' ? pzS.sec : 0)
      : splitForTts_(txt).map(function (x) { return { t: x, k: '' }; });
    var accB64 = '', spanAt = [], bps = (Number(CFG.SAMPLE_RATE) || 24000) * 2;
    var gy = { n: 0, add: 0, v: 0, t: 0 }, prevSpeech = false;
    for (var i = 0; i < pieces.length; i++) {
      if (new Date().getTime() > deadline) { cut = pieces.length - i; break; }
      var atSec = Math.round(((alignB64_(accB64).length / 4) * 3) / bps);
      /* «مکث» به گفتارساز نمی‌رود: سکوتِ واقعی، که نمی‌شود بلند خواندش. */
      if (pieces[i].pause) {
        accB64 += speakSilenceB64_(pieces[i].pause);
        spanAt.push({ k: 'مکث', s: atSec });
        prevSpeech = false;
        continue;
      }
      if (pieces[i].k && (!i || pieces[i - 1].k !== pieces[i].k)) {
        spanAt.push({ k: pieces[i].k, s: atSec });
      }
      /* مهرِ تازه پیش از هر تکه: `STYLE_PROBE_TTL_MIN` پنج دقیقه است و
         انقضای وسطِ کار یعنی نیمهٔ دومِ نمونه بی روح ساخته می‌شود، بی هیچ
         خطایی — همان تلهٔ ۷٫۷۳ در `runStyleProbe`. */
      styleProbeSet_(true);
      /* ══ همان نگهبانی که قسمتِ منتشرشده دارد (۸.۰۷) ══
         تا امروز این‌جا `ttsChunkTry_` بود — یعنی **بی هیچ نگهبانی**. مسیرِ
         قسمتِ واقعی از `ttsChunk_` می‌رود و `ttsGuarded_` شش ثانیهٔ خروجی را
         می‌شنود و تکهٔ لو‌داده را بی‌دستور از نو می‌سازد؛ این مسیر از آن رد
         نمی‌شد. نتیجه: ۱ اکتبر صاحبِ برنامه در نمونهٔ ۶دقیقه‌ایِ قسمتِ ۵۳
         شنید که گوینده دستور را **در چند جا** می‌خوانَد، و هیچ‌جا صدا
         درنیامد — چون نگهبان روی این راه نبود.
         و نمونه‌ای که برای **داوری** ساخته می‌شود باید دستِ‌کم همان‌قدر
         نگهبان داشته باشد که چیزی که منتشر می‌شود؛ وگرنه عیبی که در
         تولید گرفته می‌شود، در همان فایلی که قرار است قضاوت شود می‌مانَد. */
      var b1 = ttsChunk_(pieces[i].t,
                         pieces[i].k ? speakSpanStyle_(pieces[i].k, pick.cue) : pick.cue,
                         CFG.TTS_VOICE);
      if (!b1) { cut = pieces.length - i; break; }
      /* ══ حالت رسید یا نه — از رویدادِ همین تکه، نه از امید (۸.۲۷) ══
         حالت روی دستورِ لحن سوار است؛ اگر دستورِ **همین تکه** دور انداخته شد،
         بلندی و سرعتش در خودِ صدا ساخته می‌شود، و آنچه در صدا ساختنی نیست
         «نشد» ثبت می‌شود تا کپشن جایش را با ثانیه ادعا نکند. */
      if (pieces[i].k) {
        var how = 'دستور';
        if (TTS_CUE_DROPPED_ || (cueChk && cueChk.ok === false)) {
          var dsp = null;
          try { dsp = speakMoodDsp_(b1, pieces[i].k); } catch (eDsp) { dsp = null; }
          /* بی سرعت، نشانهٔ پایانِ جمله هنوز در متن نشسته است (۸.۳۶) — «نشد» نیست. */
          var dfn = speakSpanDef_(pieces[i].k);
          if (dsp) { b1 = dsp; how = 'صدا'; } else how = (dfn && dfn.mark) ? 'نشانه' : 'نشد';
        }
        var lastAt = spanAt[spanAt.length - 1];
        if (lastAt && lastAt.k === pieces[i].k) {
          lastAt.how = (!lastAt.how || lastAt.how === how) ? how : 'بخشی';
        }
      }
      if (gapsS) {
        try {
          var gst = speakGapStretch_(b1, gapsS, speakSentSplit_(pieces[i].t).length);
          if (gst) {
            b1 = gst.b64; gy.v += gst.v; gy.t += gst.t;
            if (gst.n) { gy.n += gst.n; gy.add += gst.add; }
          }
        } catch (eGs) {}
        if (prevSpeech && gapsS.sent > 0) {
          var ge = 0;
          try { ge = speakGapEdge_(accB64, b1, gapsS.sent); } catch (eGe) { ge = 0; }
          if (ge > 0) { accB64 += speakSilenceB64_(ge); gy.n++; gy.add += ge; }
        }
      }
      accB64 += alignB64_(b1);
      prevSpeech = true;
    }
    if (!accB64) { res.why = 'پاسخِ صوتیِ خالی'; throw new Error(res.why); }
    var bytes = Utilities.base64Decode(
      Utilities.base64Encode(wavHeader54_((alignB64_(accB64).length / 4) * 3)) +
      alignB64_(accB64));
    sec = Math.round((bytes.length - 54) / ((Number(CFG.SAMPLE_RATE) || 24000) * 2));

    /* پوشهٔ خودش، و نامی که «کامل» دارد: `vbrAudio_` از همان
       `ytAudioParts_`ِ بخشِ ۲۷ می‌گذرد و تعریفِ دومِ «صوتِ کاملِ قسمت»
       ساختن یعنی روزی یکی از آن دو کهنه می‌شود. */
    var par = vbrSoulFolder_();
    /* برچسب هم باید بگوید کدام سنجش است: دو فایل به نامِ «نمونهٔ رنگ و
       روح — قسمت ۵۳» در تلگرام از هم تشخیص داده نمی‌شوند، و او همان‌جا
       می‌شنود نه در درایو (۷٫۸۶). */
    var label = (vtest ? 'نمونهٔ رنگ و روح — متنِ آزمونِ «' + vtest.title + '»'
                       : 'نمونهٔ رنگ و روح — قسمت ' + String(pick.item.ep)) +
                (pick.tag ? ' · ' + pick.tag : '');
    var subNm = label + ' — ' + pick.name;
    var it1 = par.getFoldersByName(subNm);
    var sub = it1.hasNext() ? it1.next() : par.createFolder(subNm);
    var fnm = subNm + ' — کامل.wav';
    var old = sub.getFilesByName(fnm);
    while (old.hasNext()) old.next().setTrashed(true);
    made = sub.createFile(Utilities.newBlob(bytes, 'audio/wav', fnm));

    /* و از همین‌جا به راهِ عادیِ پل. `soul` صریح داده می‌شود چون این پوشه
       `_episode.json` ندارد و `vbrSoul_` درست می‌گفت «نامعلوم» — ولی ما
       **می‌دانیم**: همین حالا با شیوهٔ خواندنِ خودش خوانده شد. */
    var tagO = vbrSoulTag_(cueChk, label, dropChk, prMarks, prCover, prRich, prWhy);
    /* جای هر حالت در فایل، تا گوش بداند کجا را بسنجد — همان درسِ ۸٫۱۰: آنچه
       شنونده نداند کجاست، قضاوت نمی‌شود. */
    spanLine = speakSpanWhere_(spanAt) ||
               ('حالت‌ها: هیچ — ' + String(spanPlan.why || 'نامعلوم'));
    if (gapsS) {
      try {
        var styS = speakStyleSum_({ gaps: gapsS, by: pick.name }, gy);
        var slS = speakStyleLine_(styS);
        if (slS) spanLine += '\n' + slS;
      } catch (eSl) {}
    }
    tagO.spanLine = spanLine;
    var r = vbrAsk_(vbrSoulShow_(pick.key, pick.tag), pick.item.ep, sub.getId(), pick.key,
                    String(pick.item.title || ''), tagO);
    res.ok = !!(r && r.ok);
    res.why = (r && r.why) || '';
  } catch (e) {
    res.why = res.why || String((e && e.message) || e).slice(0, 150);
  } finally {
    try { styleProbeSet_(null); } catch (eD) {}      // برداشتن، نه خاموشِ صریح
    try { if (lock) lock.releaseLock(); } catch (eL) {}
  }

  var dur = (typeof castClock_ === 'function') ? castClock_(sec) : String(sec) + 'ث';
  var m = (res.ok ? '✅ نمونه ساخته شد و به صفِ پل رفت.' : '⚠️ ناقص.') +
          '\n\nگوینده: ' + pick.name +
          (vtest ? '\nمتن از: متنِ آزمونِ «' + vtest.title + '» — همان متن برای هر دو گوینده'
                 : '\nمتن از: قسمت ' + String(pick.item.ep)) +
          '\nطولِ ساخته‌شده: ' + dur +
          (prMsg ? '\n' + prMsg : '') +
          (spanLine ? '\n🎭 ' + spanLine : '') +
          (cut ? '\n⚠️ ' + faDigitsOut_(String(cut)) + ' تکه ساخته نشد (وقت یا مدل).' : '') +
          (made ? '\n' + made.getUrl() : '') +
          (res.why ? '\nپیام: ' + res.why : '') +
          /* ══ جمله‌ای که او را ترساند، و ترسش بی‌جا بود (۷٫۷۶) ══
             نگارشِ ۷٫۷۴ می‌گفت «این فایل روحِ خواندنِ او را دارد و هنوز
             رنگش را نه» — که دربارهٔ **فایلِ میانی** درست بود، ولی او
             خواند «پس نتیجه‌ای که می‌گیرم ناقص است» و پرسید. جمله‌ای که
             خبرِ خوب را بد بفهماند، همان‌قدر بد است که خبرِ بد را خوب
             (۷٫۴۰، از طرفِ دیگر). حالا هر دو مرحله با هم گفته می‌شوند. */
          '\n\n✅ **نتیجه‌ای که می‌گیرید رنگ و روح، هر دو را دارد.**' +
          '\nفایلی که همین حالا در درایو نشست، مرحلهٔ **اول** است: خوانشِ ' +
          'او (روح)، هنوز بی رنگِ صدا. گردش‌کارِ پل رنگ را رویش می‌گذارد و ' +
          /* «چند ساعت» از روزِ تبدیلِ شش‌ساعته مانده بود (۸.۳۹). */
          '**همان کاملش** به تلگرام می‌آید. پل هر دو ساعت می‌دود و موتور هر ' +
          'ساعت برمی‌دارد، پس معمولاً یک تا سه ساعت.' +
          '\n\nو برای پانزده دقیقهٔ کامل: ردیفِ او را **پیش از تولیدِ قسمتِ بعدی** ' +
          'روشن کنید؛ آن قسمت از اول با شیوهٔ خواندنِ او ساخته می‌شود و پل رنگش را ' +
          'می‌گذارد. روی قسمتی که قبلاً ساخته شده، خوانش پخته است و تغییرش یعنی ' +
          'ساختنِ دوبارهٔ کلِ صوت.';
  say(m);
  return { ok: res.ok, why: res.why, seconds: sec, cut: cut,
           speaker: pick.key, ep: String(pick.item.ep),
           url: made ? made.getUrl() : '' };
}

function runVoiceBridge() {
  var ui = ui_();
  var r = vbrNightly_(null);
  var st = r.status || vbrStatus_();
  var msg = st.line + '\n\n';
  if (r.ingest && r.ingest.got.length) {
    msg += 'برداشته شد:\n';
    for (var i = 0; i < r.ingest.got.length; i++) {
      var g = r.ingest.got[i];
      msg += '• ' + g.key + ' — ' + g.name + '\n';
    }
    msg += '\n';
  }
  if (r.asked) msg += 'درخواستِ تازه: ' + r.asked + ' قسمت.\n';
  /* ══ سه راه، نه دو (۷٫۶۳) ══
     این متن دو راه را نام می‌بُرد و ۷٫۵۹ راهِ سوم را ساخته بود: تیکِ
     قسمت‌های تولیدشده. همان تیکی که ۷٫۶۲ دروازهٔ شبانه را بابتش درست
     کرد — یعنی دقیقاً راهی که او استفاده می‌کند، در راهنماییِ همین
     دکمه غایب بود. دستورِ نیمه‌کامل از دستورِ نبوده بدتر است: خواننده
     نتیجه می‌گیرد راهِ سوم وجود ندارد. */
  if (!vbrSpeakerAny_()) {
    msg += '\n⚠️ نه ردیفی در تبِ «صداها» روشن است، نه جایی شمارهٔ قسمتی ' +
           'در «قسمت‌های موردی» نوشته شده، و نه قسمتی تیک خورده — پس پل ' +
           'نمی‌داند با صدای چه کسی تبدیل کند. از منو ' +
           '«🎚 شیوهٔ خواندنِ گویندگان» را باز کنید و یکی از این سه را ' +
           'انجام دهید: ردیف را روشن کنید (دائم)، یا شمارهٔ قسمتی که هنوز ' +
           'ساخته نشده را بنویسید (موردی)، یا از فهرستِ قسمت‌های ' +
           'تولیدشده هر چند تا که می‌خواهید تیک بزنید.';
  }
  if (!ui) { console.log(msg); return msg; }
  ui.alert('پلِ رنگِ صدا', msg, ui.ButtonSet.OK);
  return msg;
}
