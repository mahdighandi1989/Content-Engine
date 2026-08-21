/* run_v59_test.js — شش درخواستِ حیاتیِ نسخهٔ ۵٫۹، هر کدام «اجرا» می‌شود.
 *
 * ۱) دو نسخه متن: متنِ صوتیِ اعراب‌دار (ذخیره در پوشهٔ قسمت) + متنِ خواندنیِ سالم.
 * ۲) ممنوعیتِ تفسیرِ بی‌مبنا در پرامپتِ نویسنده.
 * ۳) تخته: جستجو + شماره/دستهٔ دستی + قفلِ داوری + اصلاحِ گذشته.
 * ۴) «مشاهدهٔ ضروری» با بازهٔ دقیق، در سند و ایمیل و تلگرام و صوت.
 * ۵) دستورِ گفتارِ کوتاه — پرامپت دیگر خواندنی نیست.
 * ۶) هیچ شناسه و لینکی در گفتار.
 */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const L = require('./lib/probe_r4_lib.js');
const { ok, summary, quiet } = L;
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
L.installStub();

// ═════ ۵) ریشهٔ «پرامپت‌خوانی»: دستورِ هر تکه فقط یک سطرِ کوتاه ═════
console.log('\n=== ۵. دستورِ گفتار دیگر «خواندنی» نیست ===');
{
  const style = 'آرام، روشن و معلم‌وار. شمرده و با اطمینان، مثل مدرسی که می‌خواهد مطلب جا بیفتد. ' +
                'روی تعریف‌ها و اصطلاح‌ها تأکید کن و پیش از هر مفهوم تازه یک مکث کوتاه بگذار. ' +
                'این بخشِ «چرا این درس» است: شمرده، با تأکید، و کمی آهسته‌تر.';
  const p = ttsPayloads_('متنِ درسِ امروز دربارهٔ الگوهای نموداری است. '.repeat(15), null, style, 'Kore');
  const sent = p.generateContent.body.contents[0].parts[0].text;
  const line1 = sent.split('\n')[0];
  ok('5.1 کلِ دستور یک سطر است و متن از سطرِ دوم', sent.indexOf('\n') === line1.length);
  ok('5.2 دستور کوتاه است حتی با لحنِ بلندِ درس‌نامه',
     line1.length <= (CFG.TTS_CUE_MAX + 40), line1.length + ' نویسه');
  ok('5.3 هیچ‌کدام از نشانه‌های دستورِ قدیمی (که خوانده می‌شد) نیست',
     sent.indexOf('قاعدهٔ شمارهٔ یک') === -1 && sent.indexOf('•') === -1 &&
     sent.indexOf('هیچ‌کدام از دستورهای بالا') === -1);
  ok('5.4 دستور با «:» به متن می‌رسد', /فقط این متن را اجرا کن:$/.test(line1));
  ok('5.5 متنِ واقعی غالب است', line1.length < sent.length / 2,
     line1.length + ' از ' + sent.length);
  // مقایسه با گذشته: دستورِ قبلی ~۲۲۰۰ نویسه بود و متن تهِ آن
  ok('5.6 دستور از یک‌دهمِ دستورِ قبلی کوتاه‌تر است', line1.length < 350, line1.length);
}

// ═════ ۶) پاک‌سازیِ گفتار از شناسه و لینک ═════
console.log('\n=== ۶. هیچ شناسه و لینکی به گوش نمی‌رسد ===');
{
  const dirty = 'در ویدیوی 1hKcfoJeqaWrxfSUZgUu4nIwORgpg با جزئیات گفته شد. ' +
                'فایل lecture01_final.mp4 را ببینید. ' +
                'منبع: https://example.com/a?b=c و ایمیلِ ali@example.com. ' +
                'سند 19QNuF9v4zQ5FCfd5M8iMZkDLRBru هم همین را می‌گوید. متنِ عادی سالم می‌ماند.';
  const c = speakSanitize_(dirty);
  ok('6.1 شناسهٔ درایو حذف شد', c.indexOf('1hKcfoJeqaWrxfSUZgUu') === -1, c.slice(0, 80));
  ok('6.2 نامِ فایلِ پسوند‌دار حذف شد', c.indexOf('.mp4') === -1);
  ok('6.3 لینک با عبارتِ گفتنی جایگزین شد',
     c.indexOf('https://') === -1 && c.indexOf('نشانی‌اش در سندِ همین قسمت آمده') !== -1);
  ok('6.4 ایمیل حذف شد', c.indexOf('@') === -1);
  ok('6.5 متنِ عادی دست نخورد', c.indexOf('متنِ عادی سالم می‌ماند') !== -1);
  ok('6.6 «سند + شناسه» با نامِ گفتنی جایگزین شد', c.indexOf('که نشانی‌اش در سندِ قسمت آمده') !== -1, c);
  // و در خودِ خطِ تولیدِ تکه‌ها اعمال می‌شود، نه فقط به‌عنوان تابعِ آزاد
  const ep = { hook: 'سلام. فایل abc123def456ghi789jkl.pdf مهم است.', sections: [], outro: '' };
  const chunks = buildChunks_(ep, 'متفرقه', 1);
  ok('6.7 تکهٔ صوتیِ ساخته‌شده شناسه ندارد',
     chunks.length && chunks.every(ch => ch.text.indexOf('abc123def456') === -1),
     chunks.length ? chunks[0].text.slice(0, 60) : 'بی‌تکه');
}

// ═════ ۲) و ۴) پرامپتِ نویسنده: تفسیرممنوع + مشاهدهٔ ضروری ═════
console.log('\n=== ۲ و ۴. قاعده‌های تازهٔ نویسنده ===');
{
  const wp = buildPrompt_('احساسی و نوستالژی',
    [{ id: 'A1', kind: 'ویدیو', topic: 'م', msg: 'پ', summary: 'خ', date: '', body: '', vibe: '' }],
    '', '', [], todayWords_(), []);
  ok('2.1 ممنوعیتِ تفسیرِ بی‌مبنا با نمونهٔ واقعی آمده',
     wp.indexOf('تفسیرِ بی‌مبنا مطلقاً ممنوع') !== -1 && wp.indexOf('مرثیه') !== -1 &&
     wp.indexOf('توصیف کن؛ تفسیر نکن') !== -1);
  ok('2.2 و راهِ درستِ گذارِ بی‌پیوند هم گفته شده', wp.indexOf('هذیانِ ربط‌ساز') !== -1);
  ok('4.1 قاعدهٔ mustSee آمده و بازهٔ ساختگی ممنوع است',
     wp.indexOf('mustSee') !== -1 && wp.indexOf('بازه را هرگز از خودت') !== -1);
  ok('4.2 جملهٔ گفتاریِ دعوت هم خواسته شده', wp.indexOf('همین دعوت را') !== -1);
  ok('6.8 قاعدهٔ «هیچ شناسه‌ای در گفتار» در پرامپت هست',
     wp.indexOf('نامِ فایلِ حرف‌وعددی نیاور') !== -1);
  ok('4.3 در قالبِ خروجی (اسکیمای پاسخ) mustSee تعریف شده',
     JSON.stringify(EPISODE_SCHEMA).indexOf('mustSee') !== -1 &&
     JSON.stringify(SPECIAL_SCHEMA).indexOf('mustSee') !== -1);
  const sp = buildSpecialPrompt_({ seriesName: 'دوره', covers: [], chunks: [],
    enrich: [], when: todayWords_(), orders: [], recapText: '' });
  ok('4.4 درس‌نامه: بازه فقط از فیلدِ خودِ قطعه', sp.indexOf('فیلدِ «بازه»ی خودِ همان قطعه') !== -1);
  ok('2.3 درس‌نامه: تفسیرممنوع', sp.indexOf('تفسیرِ بی‌مبنا ممنوع') !== -1);
}

// ═════ ۴) رندر: سند و تلگرام ═════
console.log('\n=== ۴-ب. جعبهٔ مشاهدهٔ ضروری در سند و تلگرام ===');
{
  const ep = { title: 'ت', hook: 'ه', outro: 'او', summary: 'خ', tags: [],
    sections: [{ heading: 'ب۱', narration: 'متن.', tone: '', sourceIds: ['A1'],
      mustSee: [{ source: 'A1', where: 'دقیقهٔ ۱۲:۳۰ تا ۱۵:۰۰',
                  why: 'الگوی نموداری فقط دیدنی است', benefit: 'تشخیصِ سه‌قله در نمودارِ واقعی' }] }] };
  const items = [{ id: 'A1', kind: 'ویدیو', topic: 'الگوی سه‌قله', score: 80,
                   link: 'https://drive.google.com/file/d/A1/view' }];
  const html = episodeHtml_(7, ep, items, 'مالی', []);
  ok('4.5 جعبه در سند هست، با بازه و چرا و فایده',
     html.indexOf('مشاهدهٔ ضروری') !== -1 && html.indexOf('دقیقهٔ ۱۲:۳۰ تا ۱۵:۰۰') !== -1 &&
     html.indexOf('الگوی نموداری فقط دیدنی است') !== -1 &&
     html.indexOf('تشخیصِ سه‌قله') !== -1);
  ok('4.6 و به خودِ منبع لینک دارد', html.indexOf('file/d/A1/view') !== -1);
  // تلگرام
  const sends = [];
  const realTg = global.tgSend_;
  global.tgSend_ = function (m) { sends.push(String(m)); };
  const n = tgMustSeeBlock_(ep, items);
  global.tgSend_ = realTg;
  ok('4.7 پیامِ تلگرامی هم رفت', n === 1 && sends.length === 1 &&
     sends[0].indexOf('مشاهدهٔ ضروری') !== -1 && sends[0].indexOf('۱۲:۳۰') !== -1,
     sends.length + ' پیام');
  // شناسهٔ خیالی در mustSee دور انداخته می‌شود
  const ep2 = { sections: [{ heading: 'ب', narration: 'م', sourceIds: ['A1'],
    mustSee: [{ source: 'GHOST', why: 'چرا' }, { source: 'A1', why: 'درست' }] }] };
  scrubSourceIds_(ep2, items, []);
  ok('4.8 mustSee با شناسهٔ ناموجود حذف شد و درست‌ها ماندند',
     ep2.sections[0].mustSee.length === 1 && ep2.sections[0].mustSee[0].source === 'A1');
}

// ═════ ۱) متنِ صوتیِ اعراب‌دار ═════
console.log('\n=== ۱. دو نسخه متن: صوتیِ اعراب‌دار + خواندنیِ سالم ===');
{
  ok('1.1 وارسیِ «واژه‌به‌واژه همان متن»، اعراب را نادیده می‌گیرد و واژه را نه',
     verifySpeak_('کتابِ من', 'کِتابِ مَن') === true &&
     verifySpeak_('کتاب من', 'کتاب تو') === false &&
     verifySpeak_('کتاب من', 'کِتابِ مَنِ خوب') === false);
  ok('1.2 حتی متنِ ازقبل‌اعراب‌دار «به اعتماد» پذیرفته نمی‌شود (مقایسه پوسته‌ای است)',
     verifySpeak_('کِتابِ مَن', 'کُتُبِ مَن') === false);

  // پیشنهادِ Cowork فقط با وارسی پذیرفته می‌شود
  const plain = 'این جملهٔ آزمایشیِ نسبتاً بلندی است که باید اعراب بگیرد و سالم بماند.';
  const good = plain.replace(/([\u0622-\u064A\u066E-\u06D5])/g, '$1َ');
  const ep = { hook: plain, sections: [], outro: '',
               __ctashkil: { hook: good } };
  const segs = [{ text: plain, kind: 'hook' }];
  const far = new Date().getTime() + 10 * 60 * 1000;
  let r = speakStep_(ep, segs, far, function () {});
  ok('1.3 پیشنهادِ سالمِ Cowork پذیرفته شد، بی هیچ فراخوانِ مدل',
     r.done && ep.__speakSegs[0] && ep.__speakSegs[0].t === good);

  const ep2 = { hook: plain, sections: [], outro: '',
                __ctashkil: { hook: 'متنِ عوض‌شده‌ای که ربطی به اصل ندارد.' } };
  const before = (L.STATS.speakCalls || 0);
  r = speakStep_(ep2, [{ text: plain, kind: 'hook' }], far, function () {});
  ok('1.4 پیشنهادِ خیانت‌کار رد شد و مدل خودش اعراب گذاشت',
     r.done && ep2.__speakSegs[0].t && verifySpeak_(plain, ep2.__speakSegs[0].t) &&
     (L.STATS.speakCalls || 0) > before,
     'فراخوانِ مدل: ' + ((L.STATS.speakCalls || 0) - before));

  // تکهٔ صوتی از نسخهٔ اعراب‌دار ساخته می‌شود، متنِ خواندنی سالم می‌ماند
  const chunks = buildChunks_(ep, 'متفرقه', 3);
  ok('1.5 تکهٔ صوتی اعراب‌دار است', chunks.length && hasTashkil_(chunks[0].text),
     chunks.length ? chunks[0].text.slice(0, 50) : '-');
  ok('1.6 متنِ خواندنی (hook) بی‌اعراب و دست‌نخورده ماند', ep.hook === plain);

  // فایلِ «متن صوتی» در پوشهٔ قسمت
  const made = [];
  const folder = { getFilesByName: () => ({ hasNext: () => false }),
                   createFile: (b) => { made.push({ name: b.getName(), body: b.getDataAsString() }); return {}; } };
  writeSpeakFile_(folder, 'قسمت 0003', ep, segs);
  ok('1.7 فایلِ متنِ صوتی در پوشه ذخیره شد و اعراب دارد',
     made.length === 1 && made[0].name.indexOf('متن صوتی (اعراب‌گذاری کامل)') !== -1 &&
     hasTashkil_(made[0].body), made.length ? made[0].name : '-');

  // مدارشکن: مدلِ خراب پادکست را گروگان نمی‌گیرد
  const realStub = global.__STUB;
  global.__STUB = function (url, body) {
    if (String(body && body.contents && body.contents[0].parts[0].text).indexOf('اعراب‌گذاریِ کامل') !== -1) {
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: '{"v":"چیزِ بی‌ربط"}' }] } }] } };
    }
    return realStub(url, body);
  };
  const ep3 = { hook: plain, sections: [{ heading: 'ب', narration: plain, tone: '' },
                                        { heading: 'ب۲', narration: plain, tone: '' }], outro: plain };
  const segs3 = [{ text: plain, kind: 'hook' }, { text: plain, kind: 'body', secIndex: 0 },
                 { text: plain, kind: 'body', secIndex: 1 }, { text: plain, kind: 'outro' }];
  const un3 = quiet();
  const r3 = speakStep_(ep3, segs3, far, function () {});
  un3();
  global.__STUB = realStub;
  ok('1.8 مدلِ همیشه‌خراب: بعد از سه شکست همه با متنِ ساده می‌روند (بی حلقهٔ ابدی)',
     r3.done === true && r3.dead === true &&
     segs3.every((sg, i) => speakTextOf_(ep3, i, sg.text) === sg.text));
}

// ═════ ۳) تخته: قفلِ دستی + ترتیب + جستجو ═════
console.log('\n=== ۳. شماره و دستهٔ دستی + قفلِ داوری + جستجو ===');
{
  const mk = (morder, mcat) => {
    const v = [];
    while (v.length < SERIES_HEADERS.length) v.push('');
    v[SC.KEY - 1] = 'k'; v[SC.NAME - 1] = 'دوره'; v[SC.STATUS - 1] = SST.NEW;
    v[SC.ORDER - 1] = 7; v[SC.CAT - 1] = 'دستهٔ خودکار';
    if (morder) v[SC.MORDER - 1] = morder;
    if (mcat) v[SC.MCAT - 1] = mcat;
    return v;
  };
  ok('3.1 دستهٔ دستی بر خودکار مقدم است',
     seriesCatOf_(mk('', 'دستهٔ من')) === 'دستهٔ من' &&
     seriesCatOf_(mk('', '')) === 'دستهٔ خودکار');
  ok('3.2 شمارهٔ دستی (حتی با رقمِ فارسی) خوانده می‌شود',
     seriesMOrder_(mk('۳', '')) === 3 && !isFinite(seriesMOrder_(mk('', ''))));
  ok('3.3 قفل: شماره یا دسته، هر کدام', seriesManualLock_(mk('2', '')) === true &&
     seriesManualLock_(mk('', 'د')) === true && seriesManualLock_(mk('', '')) === false);
  ok('3.4 ترتیبِ مؤثر: دستی همیشه جلوتر از هر خودکاری',
     seriesEffOrder_(mk('5', '')) < seriesEffOrder_(mk('', '')) &&
     seriesEffOrder_(mk('', '')) === 7);
  ok('3.5 ردیفِ قفل‌شده برای درس‌نامه واجدِ شرط است (داوری کنارش نمی‌گذارد)',
     seriesEligible_(mk('1', ''), 'k', null) === true);

  // داوری و مرتب‌ساز، ردیفِ قفل را نمی‌بینند
  const lockRow = { key: 'k', row: 2, vals: mk('1', 'دستهٔ من') };
  const freeRow = { key: 'k2', row: 3, vals: (function () { const v = mk('', ''); v[SC.KEY - 1] = 'k2'; return v; })() };
  const reg = { rows: [lockRow, freeRow], byKey: { k: lockRow, k2: freeRow }, sheet: null };
  const need = seriesNeedingJudgement_(reg);
  ok('3.6 صفِ داوری فقط ردیفِ آزاد را دارد',
     need.length === 1 && need[0].key === 'k2', need.map(x => x.key).join(','));

  // تختهٔ HTML: جستجو + دکمه‌ها + نشانِ قفل
  const d = { enabled: true, specialHour: 8, rescanHours: 6, scannedAt: '', version: '5.9',
    pin: null, judge: null, judgedAt: 'x', current: null, totals: { pct: 0, doneChunks: 0,
    chunks: 0, done: 0, active: 0, reopened: 0, queued: 0, skipped: 0, series: 1 },
    episodesMade: 0, excluded: [],
    groups: [{ cat: 'دستهٔ من', pct: 0, series: [{ key: 'k', name: 'دوره', cat: 'دستهٔ من',
      morder: 2, mcat: 'دستهٔ من', msub: 'زیر', locked: true, level: '', order: 7,
      levelRank: 1, topic: 'ت', about: '', manual: '', isCourse: true, unsure: false,
      status: SST.NEW, parts: 1, donePartsN: 0, chunks: 5, doneChunks: 0, pct: 0,
      episodes: 0, lastEpAt: '', isCurrent: false, isPinned: false, hasWork: true,
      cscore: 0, byRule: false, partRows: [] }],
      chunks: 5, doneChunks: 0, episodes: 0, minOrder: 1, minLevel: 1, bestScore: 0,
      hasWork: true, pinned: false, hasCurrent: false }] };
  const html = seriesBoardHtml_(d);
  ok('3.7 جعبهٔ جستجو هست و کار می‌کند (تابع + فیلترِ گروه)',
     html.indexOf('id="q"') !== -1 && html.indexOf('function doSearch()') !== -1 &&
     html.indexOf('data-hay=') !== -1 && html.indexOf('class="grp"') !== -1);
  ok('3.8 شمارهٔ دستی با نشانِ «دستی» دیده می‌شود', html.indexOf('دستی') !== -1);
  ok('3.9 نشانِ قفل و دکمه‌های تنظیم/برداشتن هست',
     html.indexOf('🔒 تنظیمِ دستی') !== -1 && html.indexOf('setManual(this)') !== -1 &&
     html.indexOf('clearManual(this)') !== -1 && html.indexOf('uiSetManual') !== -1);
  ok('3.9ب فرمِ یکجای دستی (جایِ سه پنجرهٔ پشتِ‌هم) با شماره/دسته/زیردسته هست',
     html.indexOf('id="moOv"') !== -1 && html.indexOf('id="moNum"') !== -1 &&
     html.indexOf('id="moCat"') !== -1 && html.indexOf('id="moNew"') !== -1 &&
     html.indexOf('id="moSub"') !== -1 && html.indexOf('function moSave(') !== -1 &&
     html.indexOf('MO_CATS') !== -1);
  ok('3.9پ نامِ دسته فقط از data-attribute می‌آید و داخلِ رشتهٔ کد تزریق نمی‌شود',
     html.indexOf("setManual('") === -1 && html.indexOf('data-name=') !== -1);
  ok('3.10 زیر‌دسته هم نمایش داده می‌شود', html.indexOf('زیر‌دسته: ') !== -1);
}

// ═════ ۳-ب) ثبتِ دستی + اصلاحِ گذشته، سرِ هم ═════
console.log('\n=== ۳-ب. uiSetManual: ثبت + قفل + تغییرنامِ پوشهٔ درایو ===');
{
  global.__PROPS = {};
  global.__SS = {}; global._ssCache = null;
  global.DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');
  const hub = getHub_();
  const sh = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const v = [];
  while (v.length < SERIES_HEADERS.length) v.push('');
  v[SC.KEY - 1] = 'dore x'; v[SC.NAME - 1] = 'دورهٔ ایکس'; v[SC.STATUS - 1] = SST.NEW;
  v[SC.ORDER - 1] = 9; v[SC.CAT - 1] = 'قدیم';
  sh.appendRow(v);

  // پوشهٔ مجموعه با نامِ شماره‌ٔ خودکارِ قدیم
  const root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const showF = root.createFolder(CFG.SPECIAL_FOLDER);
  const serF = showF.createFolder('09 — دورهٔ ایکس');
  const epF = serF.createFolder('20260810 — قسمتِ قدیمی');
  epF.createFile(Utilities.newBlob(JSON.stringify({ seriesKey: 'dore x', seriesCat: 'قدیم' }),
                 'application/json', '_special.json'));
  // ثبتِ شناسهٔ پوشه در رجیستری
  const reg0 = readSeriesReg_(hub);
  reg0.byKey['dore x'].vals[SC.FOLDER - 1] = serF.getId();
  sh.getRange(reg0.byKey['dore x'].row, SC.FOLDER, 1, 1).setValue(serF.getId());

  const un = quiet();
  const r = uiSetManual('dore x', '۱', 'دستهٔ نو', 'زیرِ نو');
  un();
  ok('3.11 ثبت شد', r && r.ok === true, JSON.stringify(r).slice(0, 120));
  const reg1 = readSeriesReg_(hub);
  const nv = reg1.byKey['dore x'].vals;
  ok('3.12 سه ستونِ دستی نوشته شدند',
     String(nv[SC.MORDER - 1]) === '1' && nv[SC.MCAT - 1] === 'دستهٔ نو' &&
     nv[SC.MSUB - 1] === 'زیرِ نو');
  ok('3.13 پوشهٔ درایوِ مجموعه به شمارهٔ تازه تغییرنام یافت',
     serF.getName() === '01 — دورهٔ ایکس', serF.getName());
  const patched = JSON.parse(epF.getFilesByName('_special.json').next().getBlob().getDataAsString());
  ok('3.14 پروندهٔ قسمتِ قبلی هم دستهٔ تازه گرفت', patched.seriesCat === 'دستهٔ نو',
     patched.seriesCat);
  // نسخهٔ ۵٫۱۱ — خواستهٔ صریحِ کاربر: دسته باید پوشهٔ درایو را هم (عقب‌گرد) جابه‌جا کند
  const parF = serF.getParents().next();
  ok('3.14ب پوشهٔ مجموعه زیرِ دستهٔ تازه «دستهٔ نو» منتقل شد',
     parF.getName() === 'دستهٔ نو', parF.getName());
  ok('3.14پ و آن دستهٔ تازه، خودش زیرِ پوشهٔ اصلیِ درس‌نامه است',
     parF.getParents().next().getName() === CFG.SPECIAL_FOLDER,
     parF.getParents().next().getName());
  ok('3.14ت قسمتِ قبلی هنوز داخلِ همان پوشهٔ مجموعه است (جابه‌جایی، محتوا را گم نکرد)',
     serF.getFoldersByName('20260810 — قسمتِ قدیمی').hasNext());
  // اجرای دوباره با همان دسته: نه خطا، نه جابه‌جاییِ تکراری (idempotent)
  const unAg = quiet();
  const rAgain = uiSetManual('dore x', '۱', 'دستهٔ نو', 'زیرِ نو');
  unAg();
  ok('3.14ث اجرای دوبارهٔ همان دسته، پوشه را جابه‌جا/خراب نمی‌کند',
     rAgain.ok === true && serF.getParents().next().getName() === 'دستهٔ نو' &&
     serF.getName() === '01 — دورهٔ ایکس');
  // بررسیِ مستقیمِ کمک‌تابع‌های نسخهٔ ۵٫۱۱
  ok('3.14ج دستهٔ خالی یا «متفرقه» → ریشهٔ درس‌نامه (بی‌تودرتو)',
     seriesCatFolder_('').getName() === CFG.SPECIAL_FOLDER &&
     seriesCatFolder_(MISC_TITLE).getName() === CFG.SPECIAL_FOLDER);
  ok('3.14چ نامِ خطرناکِ دسته برای پوشه پاک‌سازی می‌شود',
     !/[\/\\:*?"<>|]/.test(safeFolderName_('a/b:c*?"<x>|d')) &&
     safeFolderName_('a/b:c*?"<x>|d').length > 0);
  ok('3.15 پیامِ برگشتی کارهای انجام‌شده را می‌گوید',
     r.message.indexOf('تغییر نام') !== -1 || r.message.indexOf('به‌روز شد') !== -1,
     r.message.slice(0, 200));

  // شمارهٔ نامعتبر رد می‌شود
  const un2 = quiet();
  const bad = uiSetManual('dore x', 'abc', '', '');
  un2();
  ok('3.16 شمارهٔ نامعتبر با پیامِ روشن رد شد', bad.ok === false);
  // برداشتن
  const un3 = quiet();
  const cl = uiClearManual('dore x');
  un3();
  const nv2 = readSeriesReg_(hub).byKey['dore x'].vals;
  ok('3.17 برداشتنِ تنظیم، ستون‌ها را خالی و قفل را باز کرد',
     cl.ok === true && !seriesManualLock_(nv2) &&
     String(nv2[SC.MORDER - 1] || '') === '' && String(nv2[SC.MCAT - 1] || '') === '');
}

// ═════ ۳-پ) انتخابِ تولید، شمارهٔ دستی را مقدم می‌کند ═════
console.log('\n=== ۳-پ. صفِ تولید با شمارهٔ دستی ===');
{
  const mkRec = (key, morder, order, judged) => {
    const v = [];
    while (v.length < SERIES_HEADERS.length) v.push('');
    v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; v[SC.STATUS - 1] = SST.NEW;
    v[SC.ORDER - 1] = order; v[SC.CAT - 1] = 'د';
    v[SC.IS_COURSE - 1] = judged ? SJ.YES : '';
    if (morder) v[SC.MORDER - 1] = morder;
    return v;
  };
  // pickSeriesPlan_ کارِ واقعی می‌خواهد؛ ما فقط ترتیبِ صف را می‌سنجیم
  const rows = [{ key: 'a', row: 2, vals: mkRec('a', '', 1, true) },
                { key: 'b', row: 3, vals: mkRec('b', '4', 50, true) },
                { key: 'c', row: 4, vals: mkRec('c', '', 2, true) }];
  const sorted = rows.slice().sort((x, y) => seriesEffOrder_(x.vals) - seriesEffOrder_(y.vals));
  ok('3.18 «ب» با شمارهٔ دستیِ ۴، جلوتر از ترتیب‌های خودکارِ ۱ و ۲ نشست',
     sorted[0].key === 'b', sorted.map(x => x.key).join(','));
}


/* دستورِ لحن نباید با هر تکه تکرار شود.

   شکایتِ واقعی و تکراری: «گوینده وسطِ متن، دستورِ لحن را هم می‌خواند». کوتاه‌کردنِ
   دستور کمش کرد ولی تمامش نکرد، چون تعدادِ دفعات دست‌نخورده مانده بود — یک
   قسمتِ ۱۴ دقیقه‌ای بیش از ده تکه دارد و هر تکه دستورِ خودش را می‌گرفت. هر بار
   یک شانسِ تازه برای همان اشتباه.                                              */
{
  const mk = (style, voice) => ({ text: 'متنِ نمونه.', style: style, voice: voice });
  const chunks = [mk('گرم', 'A'), mk('گرم', 'A'), mk('گرم', 'A'),
                  mk('جدی', 'A'), mk('جدی', 'A'), mk('جدی', 'B')];
  const saved = CFG.TTS_CUE_MODE;

  CFG.TTS_CUE_MODE = 'perSection';
  const got = chunks.map((_, i) => ttsCueWanted_(chunks, i));
  ok('دستور فقط با نخستین تکهٔ هر لحن می‌رود',
     got.join(',') === 'true,false,false,true,false,true', got.join(','));
  ok('و تعدادِ دفعات از ۶ به ۳ رسید', got.filter(Boolean).length === 3);
  ok('تکهٔ نخست همیشه دستور می‌گیرد', got[0] === true);
  ok('عوض‌شدنِ لحن دوباره دستور می‌فرستد', got[3] === true);
  ok('عوض‌شدنِ صدا هم دوباره دستور می‌فرستد', got[5] === true);

  // متنِ فرستاده‌شده در تکهٔ بی‌دستور باید *فقط* خودِ متن باشد
  global.__PROPS['GEMINI_API_KEY'] = global.__PROPS['GEMINI_API_KEY'] || 'TEST';
  const TXT = 'یک جملهٔ آزمایشی برای گفتار.';
  const withCue = ttsPayloads_(TXT, null, 'گرم', 'Kore', true);
  const noCue = ttsPayloads_(TXT, null, 'گرم', 'Kore', false);
  ok('تکهٔ بی‌دستور هیچ سطرِ اضافه‌ای ندارد',
     noCue.generateContent.body.contents[0].parts[0].text === TXT,
     JSON.stringify(noCue.generateContent.body.contents[0].parts[0].text).slice(0, 80));
  ok('و تکهٔ دستوردار همچنان دستور دارد',
     /فقط این متن را اجرا کن:/.test(withCue.generateContent.body.contents[0].parts[0].text));
  ok('صدا در هر دو یکی است (صدا از voiceConfig می‌آید نه از دستور)',
     noCue.generateContent.body.generationConfig.speechConfig.voiceConfig
          .prebuiltVoiceConfig.voiceName === 'Kore');

  CFG.TTS_CUE_MODE = 'perChunk';
  ok('حالتِ قدیمی هنوز در دسترس است',
     chunks.map((_, i) => ttsCueWanted_(chunks, i)).every(Boolean));
  CFG.TTS_CUE_MODE = saved;
}


/* دستورِ لهجه باید همیشه برود — حتی وقتی متن اعراب دارد.

   گزارشِ کاربر: «اکثر گوینده‌ها الف را مثل افغان‌ها و تاجیک‌ها می‌کشند؛ بابا را
   baawbaaw می‌گویند». علتش این بود که یادآورِ تلفظ فقط به متنِ بی‌اعراب چسبانده
   می‌شد، با این استدلال که متنِ اعراب‌دار خودش راهنماست. آن استدلال برای صدای
   کوتاه درست است و برای لهجه غلط: اعراب هیچ‌جا نمی‌گوید «ا» ایرانی باشد یا
   افغانی. پس دقیقاً همان دستوری که جلوی این را می‌گرفت، در تولید خاموش بود.  */
{
  const vowelled = 'بابا بِه خانه آمَد وَ ما را صِدا زَد.';
  const plain = 'بابا به خانه آمد و ما را صدا زد.';
  const cueV = ttsCue_('گرم', vowelled);
  const cueP = ttsCue_('گرم', plain);

  ok('لهجه در متنِ اعراب‌دار هم فرستاده می‌شود', /افغانی/.test(cueV), cueV.slice(0, 90));
  ok('و در متنِ بی‌اعراب هم', /افغانی/.test(cueP));
  ok('یادآورِ صدای کوتاه فقط به متنِ بی‌اعراب می‌چسبد',
     /زیر و زبر/.test(cueP) && !/زیر و زبر/.test(cueV));

  // لحنِ بلندِ درس‌نامه نباید لهجه را از سطر بیرون کند
  const longStyle = 'آرام، روشن و معلم‌وار. شمرده و با اطمینان، مثل مدرسی که می‌خواهد مطلب ' +
                    'جا بیفتد. روی تعریف‌ها و اصطلاح‌ها تأکید کن و پیش از هر مفهوم تازه یک ' +
                    'مکث کوتاه بگذار. این بخشِ «چرا این درس» است: شمرده و کمی آهسته‌تر.';
  const cueL = ttsCue_(longStyle, vowelled);
  ok('با لحنِ بلند هم لهجه سرِ جایش می‌ماند (بریدن از ته است)', /افغانی/.test(cueL),
     cueL.length + ' نویسه');
  ok('و هنوز یک سطرِ زیرِ سقف است',
     cueL.indexOf('\n') === -1 && cueL.length <= CFG.TTS_CUE_MAX + 30, cueL.length + '');
  ok('و همچنان با نشانهٔ مرزِ متن تمام می‌شود', /فقط این متن را اجرا کن:$/.test(cueL));
}

process.exit(summary('شش درخواستِ نسخهٔ ۵٫۹') ? 1 : 0);
