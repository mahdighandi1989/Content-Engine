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

function vbrSoulTag_(cueBefore, label, dropBefore) {
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
    return { label: label, soul: 'روح',
             soulWhy: 'همین حالا با شیوهٔ خواندنِ خودش خوانده شد' };
  }
  return { label: label, soul: 'رنگ‌تنها',
           soulWhy: (dropped ? 'دستورِ لحن در ساختِ دستِ‌کم یک تکه دور انداخته شد'
                             : 'دستورِ لحن وسطِ ساخت خاموش شد') +
                    ((now && now.model) ? ' (مدلِ «' + now.model + '»)' : '') +
                    '؛ بخشی از این نمونه بی شیوهٔ خواندن ساخته شده' };
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
  } else if (soul === 'رنگ‌تنها') {
    soulLine = '\n\n⚠️ <b>فقط رنگ</b> — ' +
               tgEsc_(String((item && item.soulWhy) || '')) +
               '. پس مکث و کشش و دامنه از او نیست؛ تبدیل رنگ را عوض می‌کند، ' +
               'شیوهٔ خواندن را نه.';
  }
  var head = String((item && item.label) || ('قسمت ' + ep));
  var cap = '🎙 <b>' + tgEsc_(head) + ' با صدای ' + tgEsc_(who) + '</b>' +
            (title ? '\n' + tgEsc_(title) : '') +
            '\n\nاین <b>آزمایشی</b> است و کنارِ فایلِ اصلی نشسته — ' +
            'صوتی که منتشر و ایمیل شد عوض نشده.' + soulLine +
            '\n\nتنها چیزی که هیچ کدی جوابش را نمی‌دهد: <b>شبیهِ اوست؟</b>';

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
    var ttl = 'قسمت ' + ep + ' — ' + who +
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
  var list = CFG.VOICE_SOUL_SEED || [];
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
    /* ══ بذرِ موتور، کنارِ تیکِ او — نه به‌جایش (۷٫۸۴) ══
       تیک یعنی «دکمه را که زدم، این را بساز» و ۷٫۷۴ همین را تعریف کرد؛
       اگر موتور خودش روی تیک عمل کند، معنای آن ستون بی‌خبر عوض می‌شود.
       پس بذر مجموعهٔ **جداگانه**ای است و ردیفِ برگشتی می‌گوید کدام بود:
       فقط بذر به‌طور خودکار ساخته می‌شود. */
    var sd = CFG.VOICE_SOUL_SEED || [];
    for (var sdi = 0; sdi < sd.length; sdi++) {
      var se = sd[sdi] || {};
      if (String(se.speaker || '').trim() !== key) continue;
      if (!se.show || !se.ep) continue;
      var sk = String(se.show) + ':' + String(se.ep);
      set[sk] = 1; seeded[sk] = 1;
      seedTag[sk] = String(se.tag == null ? '' : se.tag).trim();
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
      var item = map[k];
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
  var cueChk = null;
  try { cueChk = ttsCueStatus_(); } catch (eC) { cueChk = null; }
  /* مهر **پیش از** ساخت برداشته می‌شود؛ مقایسه‌اش پس از ساخت می‌گوید در
     همین نمونه تکه‌ای بی‌دستور ساخته شد یا نه (۷٫۸۹). */
  var dropChk = '';
  try { dropChk = ttsCueDropAt_(); } catch (eD0) { dropChk = ''; }
  if (cueChk && cueChk.ok === false) {
    say('⚠️ الان **شیوهٔ خواندن به مدل نمی‌رسد**، پس این نمونه فقط رنگِ صدا ' +
        'می‌گرفت — همان چیزی که دیروز گرفتید.\n\n' + String(cueChk.line || '') +
        '\n\nخودش درست می‌شود: وارسیِ سلامتِ ۱۰:۰۰ دبی یک مدلِ صوتیِ دیگر ' +
        'را امتحان می‌کند (`ttsCueSwitch_`). وقتی سطرِ «دستورِ لحن» در نامهٔ ' +
        '۱۰ صبح گفت «روشن»، همین دکمه را بزنید و نمونه هر دو را خواهد داشت.' +
        '\n\nتیکِ شما سرِ جایش می‌مانَد؛ چیزی گم نشد.');
    return { ok: false, why: 'دستورِ لحن خاموش است: ' + String(cueChk.model || ''),
             speaker: pick.key, cueOff: true };
  }
  var txt = '';
  try { txt = epSpeakText_(pick.item.folderId); } catch (eT) { txt = ''; }
  if (!txt) {
    var w = 'متنِ اعراب‌دارِ قسمت ' + String(pick.item.ep) + ' در پروندهٔ خودش نیست ' +
            '(قسمت‌های قدیمی `__speakSegs` ندارند)';
    say('⚠️ ' + w + '.\n\nیک قسمتِ تازه‌تر را تیک بزنید.');
    return { ok: false, why: w };
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

  var res = { ok: false, why: '' }, made = null, sec = 0, cut = 0;
  var deadline = new Date().getTime() +
                 (Number(CFG.STYLE_PROBE_BUDGET_MS) || 240000);
  try {
    var pieces = splitForTts_(txt);
    var accB64 = '';
    for (var i = 0; i < pieces.length; i++) {
      if (new Date().getTime() > deadline) { cut = pieces.length - i; break; }
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
      var b1 = ttsChunk_(pieces[i], pick.cue, CFG.TTS_VOICE);
      if (!b1) { cut = pieces.length - i; break; }
      accB64 += alignB64_(b1);
    }
    if (!accB64) { res.why = 'پاسخِ صوتیِ خالی'; throw new Error(res.why); }
    var bytes = Utilities.base64Decode(
      Utilities.base64Encode(wavHeader54_((alignB64_(accB64).length / 4) * 3)) +
      alignB64_(accB64));
    sec = Math.round((bytes.length - 54) / ((Number(CFG.SAMPLE_RATE) || 24000) * 2));

    /* پوشهٔ خودش، و نامی که «کامل» دارد: `vbrAudio_` از همان
       `ytAudioParts_`ِ بخشِ ۲۷ می‌گذرد و تعریفِ دومِ «صوتِ کاملِ قسمت»
       ساختن یعنی روزی یکی از آن دو کهنه می‌شود. */
    var root = outFolder_();
    var pName = CFG.VBR_SOUL_FOLDER || 'نمونهٔ رنگ و روح';
    var it0 = root.getFoldersByName(pName);
    var par = it0.hasNext() ? it0.next() : root.createFolder(pName);
    /* برچسب هم باید بگوید کدام سنجش است: دو فایل به نامِ «نمونهٔ رنگ و
       روح — قسمت ۵۳» در تلگرام از هم تشخیص داده نمی‌شوند، و او همان‌جا
       می‌شنود نه در درایو (۷٫۸۶). */
    var label = 'نمونهٔ رنگ و روح — قسمت ' + String(pick.item.ep) +
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
    var r = vbrAsk_(vbrSoulShow_(pick.key, pick.tag), pick.item.ep, sub.getId(), pick.key,
                    String(pick.item.title || ''),
                    vbrSoulTag_(cueChk, label, dropChk));
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
          '\nمتن از: قسمت ' + String(pick.item.ep) +
          '\nطولِ ساخته‌شده: ' + dur +
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
          '**همان کاملش** به تلگرام می‌آید — مثل هر تبدیلِ دیگر، پس چند ' +
          'ساعت طول می‌کشد.' +
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
