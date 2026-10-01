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
const fs = require('fs');
const { ok, summary, quiet } = L;
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
L.installStub();

// ═════ ۵) ریشهٔ «پرامپت‌خوانی»: دستورِ هر تکه فقط یک سطرِ کوتاه ═════
console.log('\n=== ۵. دستورِ گفتار دیگر «خواندنی» نیست ===');
{
  const style = 'آرام، روشن و معلم‌وار. شمرده و با اطمینان، مثل مدرسی که می‌خواهد مطلب جا بیفتد. ' +
                'روی تعریف‌ها و اصطلاح‌ها تأکید کن و پیش از هر مفهوم تازه یک مکث کوتاه بگذار. ' +
                'این بخشِ «چرا این درس» است: شمرده، با تأکید، و کمی آهسته‌تر.';
  const TEXT = 'متنِ درسِ امروز دربارهٔ الگوهای نموداری است. '.repeat(15);
  const p = ttsPayloads_(TEXT, null, style, 'Kore');
  const sent = p.generateContent.body.contents[0].parts[0].text;
  const cue = p.generateContent.body.systemInstruction.parts[0].text;

  /* ۵٫۵۹ فرضِ این پنج سنجه را عوض کرد.
   *
   * تا اینجا طرح این بود: «دستور را کوتاه کن و سطرِ اول بگذار تا خوانده
   * نشود». همان طرح بود که باگ را می‌ساخت — کوتاهیِ دستور احتمالِ خوانده‌شدن
   * را کم می‌کند، صفر نمی‌کند، و «کم» برای چیزی که آبروی برنامه را می‌برد
   * کافی نیست. حالا دستور اصلاً در متن نیست.
   *
   * پس سنجه‌ها همان *قصد* را نگه می‌دارند (دستور کوتاه، بی نشانه‌های قدیمی)
   * ولی در جای درست می‌سنجند — و یکی از قبل قوی‌تر است: «در متن نیست».
   */
  ok('5.1 متنِ فرستاده‌شده عیناً خودِ گفتار است و بس', sent === TEXT,
     JSON.stringify(sent.slice(0, 60)));
  ok('5.2 دستور کوتاه است حتی با لحنِ بلندِ درس‌نامه',
     cue.length <= (CFG.TTS_CUE_MAX + 40), cue.length + ' نویسه');
  ok('5.3 هیچ‌کدام از نشانه‌های دستورِ قدیمی (که خوانده می‌شد) نیست',
     sent.indexOf('قاعدهٔ شمارهٔ یک') === -1 && sent.indexOf('•') === -1 &&
     sent.indexOf('هیچ‌کدام از دستورهای بالا') === -1);
  ok('5.4 دستور با «:» تمام می‌شود', /فقط این متن را اجرا کن:$/.test(cue));
  ok('5.5 و هیچ تکه‌ای از دستور در متن نیست — سنجهٔ اصلیِ ۵٫۵۹',
     sent.indexOf('فقط این متن را اجرا کن') === -1 &&
     sent.indexOf('با صدای') === -1 && sent.indexOf(cue) === -1);
  ok('5.6 دستور از یک‌دهمِ دستورِ قبلی کوتاه‌تر است', cue.length < 350, cue.length);
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
  const hoF = serF.createFile(Utilities.newBlob(
    JSON.stringify({ cat: 'قدیم', chapters: [] }), 'application/json', '_HANDOUT.json'));
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
  /* ══ ۶٫۵۱ — جزوه هم دسته دارد و تا امروز کهنه می‌ماند ══
     `_HANDOUT.json` دستهٔ مجموعه را روی جلدِ جزوه چاپ می‌کند. تغییرِ دسته
     تا امروز به آن نمی‌رسید، پس کتاب تا ابد دستهٔ قبلی را نشان می‌داد —
     درست همان «جزئی‌ترین ارکان» که خواسته شده بود. */
  ok('3.14ح دستهٔ جزوهٔ همان مجموعه هم به‌روز شد',
     JSON.parse(hoF.getBlob().getDataAsString()).cat === 'دستهٔ نو',
     JSON.parse(hoF.getBlob().getDataAsString()).cat);
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
  ok('و تکهٔ دستوردار همچنان دستور دارد — ولی جدا از متن (۵٫۵۹)',
     /فقط این متن را اجرا کن:/.test(withCue.generateContent.body.systemInstruction.parts[0].text) &&
     withCue.generateContent.body.contents[0].parts[0].text === TXT);
  ok('صدا در هر دو یکی است (صدا از voiceConfig می‌آید نه از دستور)',
     noCue.generateContent.body.generationConfig.speechConfig.voiceConfig
          .prebuiltVoiceConfig.voiceName === 'Kore');

  /* ══ قالبِ سوم: پیشوندِ متن (۷٫۸۹) ══
     سه مدل پشتِ‌هم هر دو قالبِ فیلددار را رد کردند، پس دستور باید از راهی
     برود که خودِ این خانواده مدل مستندش کرده: «<دستور>: <متن>». */
  ok('۷٫۸۹ قالبِ پیشوندی هست و متن **دست‌نخورده** در انتهایش می‌نشیند',
     !!withCue.prompted &&
     withCue.prompted.body.contents[0].parts[0].text.slice(-TXT.length) === TXT &&
     withCue.prompted.body.contents[0].parts[0].text.length > TXT.length,
     /* ══ شاهد هم باید نگهبان داشته باشد، نه فقط شرط ══
        نگارشِ اول فقط شرط را گارد کرده بود؛ ولی آرگومانِ **شاهد** پیش از
        صدا زدنِ `ok` ارزیابی می‌شود، پس با نبودنِ `prompted` کلِ مجموعه با
        TypeError می‌مُرد و هیچ سنجه‌ای گزارش نمی‌شد — یعنی شکستنِ عمدی
        «هیچ‌جا نمی‌افتاد» در حالی که واقعاً افتاده بود. */
     withCue.prompted &&
       JSON.stringify(withCue.prompted.body.contents[0].parts[0].text).slice(0, 110));
  ok('۷٫۸۹-ب و هیچ فیلدِ دستوری در آن نیست — همان چیزی که مدل رد می‌کرد',
     !!withCue.prompted && !withCue.prompted.body.systemInstruction &&
     !withCue.prompted.body.instructions);
  ok('۷٫۸۹-پ مرزِ دستور و متن یک دونقطه است، نه چسباندنِ خام (۵٫۵۹)',
     !!withCue.prompted &&
     /:\n$/.test(withCue.prompted.body.contents[0].parts[0].text.slice(0, -TXT.length)),
     withCue.prompted && JSON.stringify(withCue.prompted.body.contents[0].parts[0]
       .text.slice(0, -TXT.length).slice(-24)));
  ok('۷٫۸۹-ت تکهٔ بی‌دستور در این قالب هم فقط خودِ متن است',
     !!noCue.prompted && noCue.prompted.body.contents[0].parts[0].text === TXT,
     noCue.prompted && JSON.stringify(noCue.prompted.body.contents[0].parts[0].text).slice(0, 60));

  /* ══ و مدلی که فیلد را رد کرده، دستورش را **از دست نمی‌دهد** ══
     این همان رگرسیونی است که ۳۰ سپتامبر نمونهٔ گویندهٔ دوم را نساخت: نقشهٔ
     بدها یعنی «قالبِ دیگری برو»، نه «لحن را بینداز». */
  {
    const liveTts = ttsModel_();
    ttsCueBadAdd_(liveTts, nowStr_());
    const after = ttsPayloads_(TXT, liveTts, 'گرم', 'Kore', true);
    ok('۷٫۸۹-ث مدلِ در نقشه، فیلدِ دستور نمی‌گیرد',
       !after.generateContent.body.systemInstruction && !after.interactions.body.instructions);
    /* نگارشِ ۷٫۸۹ این را «ولی دستورش از راهِ پیشوند همچنان می‌رود» می‌نامید.
       از ۸.۰۷ آن ادعا دیگر درست نیست — پیشوند پیش‌فرض خاموش است. قالب
       **ساخته** می‌شود (گزینه سرِ جایش است)، ولی «می‌رود» را سنجهٔ ۸.۰۷
       پایین‌تر رد می‌کند. متنِ سنجه به همان چیزی که می‌سنجد برگردانده شد،
       نه حذف (قاعدهٔ ۷٫۶۸). */
    ok('۷٫۸۹-ج قالبِ پیشوندی همچنان ساخته می‌شود — گزینه‌ای برای روزی که لازم شود',
       !!after.prompted && after.prompted.body.contents[0].parts[0].text.length > TXT.length &&
       after.prompted.body.contents[0].parts[0].text.slice(-TXT.length) === TXT,
       after.prompted && JSON.stringify(after.prompted.body.contents[0].parts[0].text).slice(0, 90));
    delete global.__PROPS[PK.TTS_CUE_BAD];
    delete global.__PROPS[PK.TTS_CUE_OFF];
  }

  /* ══ و کلِ مسیر، نه فقط سازندهٔ بسته (۷٫۸۹) ══
     سنجه‌های بالا `ttsPayloads_` را تنها امتحان می‌کنند؛ آنچه واقعاً باید
     ثابت شود رفتارِ `ttsChunkTry_` است وقتی مدل فیلد را رد می‌کند — همان
     چیزی که ۳۰ سپتامبر در تولید افتاد. پس `geminiFetch_` جوری بدل می‌شود
     که **فقط** قالبِ فیلددار را رد کند (با همان پیامِ واقعیِ گوگل). */
  {
    const realFetch = global.geminiFetch_;
    const realProps = JSON.stringify(global.__PROPS);
    delete global.__PROPS[PK.TTS_CUE_BAD];
    delete global.__PROPS[PK.TTS_CUE_OFF];
    delete global.__PROPS[PK.TTS_MODE];
    const SCRIPT = 'مَتنِ آزمایشی.';
    const seen = [];
    /* ══ بدَل باید سه حالت را از هم تشخیص بدهد، نه دو تا ══
       نگارشِ اولم هر بسته‌ای را که فیلد نداشت «پیشوندی» می‌نامید — ولی
       تکهٔ **بی‌دستور** هم فیلد ندارد. یعنی «لحن از راهِ پیشوند رفت» و
       «لحن دور انداخته شد» یک برچسب می‌گرفتند، و شکستنِ عمدیِ همان
       سقوط هیچ سنجه‌ای را قرمز نمی‌کرد. حالا از روی **متن** داوری
       می‌شود: پیشوند یعنی متنِ فرستاده‌شده از خودِ متن بلندتر است. */
    global.geminiFetch_ = function (url, body) {
      const hasField = !!(body && (body.systemInstruction || body.instructions));
      const sent = (body && body.contents && body.contents[0] &&
                    body.contents[0].parts[0].text) || '';
      seen.push(hasField ? 'field' : (sent.length > SCRIPT.length ? 'prompted' : 'nocue'));
      if (hasField) throw new Error('HTTP 400 — Developer instruction is not enabled for this model');
      return { candidates: [{ content: { parts: [{ inlineData: { data: 'QUJD' } }] } }] };
    };
    let outB64 = null, threw = '';
    try { outB64 = ttsChunkTry_(SCRIPT, 'گرم', 'Kore', true); }
    catch (e) { threw = String(e.message || e); }
    global.geminiFetch_ = realFetch;

    ok('۷٫۸۹-چ وقتی فیلد رد می‌شود، صدا باز هم ساخته می‌شود',
       !!outB64 && !threw, 'خطا: ' + threw + ' · مسیرها: ' + seen.join('→'));
    /* ══ این سنجه، پیش از ۸.۰۷، دقیقاً همان رفتاری را تضمین می‌کرد که گوشِ
       صاحبِ برنامه ردش کرد ══
       متنش می‌گفت «آخرین تلاش همان قالبِ پیشوندی است، **نه تسلیمِ بی‌لحن**» —
       یعنی `nocue` را عیب می‌شمرد. و `nocue` همان سقوطِ امنِ ۵٫۵۹ است: افت به
       سمتِ سکوت، نه به سمتِ چسباندن. یک سنجه می‌تواند خوانشِ غلط را همان‌قدر
       محکم قفل کند که خوانشِ درست را (۷٫۶۸/۷٫۴۶)، و این نمونه‌اش است.
       برگردانده شد به چیزی که واقعاً باید محافظت شود: **صدا ساخته می‌شود و
       آخرین راه بی‌دستور است، نه پیشوند.** */
    ok('۷٫۸۹-ح و آخرین تلاش بی‌دستور است — افت به سمتِ سکوت، نه چسباندن (۸.۰۷)',
       seen[seen.length - 1] === 'nocue' && seen.indexOf('prompted') === -1,
       seen.join('→'));
    ok('۷٫۸۹-خ هر دو قالبِ فیلددار پیش از آن امتحان شده‌اند',
       seen.filter((x) => x === 'field').length >= 2, seen.join('→'));
    /* و حکمِ مدل ثبت می‌شود، وگرنه فردا همان دو فراخوانِ دورریز تکرار
       می‌شود — ۵٫۸۴: یک بار یاد بگیر، نه سیزده بار. */
    ok('۷٫۸۹-د حکمِ «فیلد را نمی‌پذیرد» ثبت شد',
       !!(global.__PROPS[PK.TTS_CUE_BAD] || '').length,
       String(global.__PROPS[PK.TTS_CUE_BAD] || '(خالی)').slice(0, 80));
    /* ══ و قالبِ پیشوندی «ترجیحی» نمی‌شود ══
       دو قالبِ فیلددار ساختاراً نمی‌توانند خوانده شوند، پس امن‌ترند و باید
       همیشه اول بمانند. اگر پیشوند ترجیحی شود، روزی که مدلی فیلد را
       بپذیرد باز هم اول پیشوند می‌رود — یعنی ریسکِ ۵٫۵۹ بی‌دلیل می‌مانَد. */
    ok('۷٫۸۹-ذ ولی پیشوند به‌عنوانِ قالبِ ترجیحی ذخیره نمی‌شود',
       String(global.__PROPS[PK.TTS_MODE] || '') !== 'prompted',
       'ترجیح: ' + String(global.__PROPS[PK.TTS_MODE] || '(هیچ)'));
    global.__PROPS = JSON.parse(realProps);
  }

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
     cueL.indexOf('\n') === -1 && cueL.length <= CFG.TTS_CUE_MAX + 25, cueL.length + '');
  ok('و همچنان با نشانهٔ مرزِ متن تمام می‌شود', /فقط این متن را اجرا کن:$/.test(cueL));
}

/* «روحِ خواندن» (۷٫۱۰–۷٫۱۲) — یادآورِ سنجیده، و سدّی که نباید بشکند.

   `tools/stylecard.py` روی هشت ضبطِ واقعی گفت ۶۲٪ مکث‌های او **درونِ** جمله
   است. `TTS_FLOW_HINT` دقیقاً عکسش را می‌خواست («مکث فقط جای نشانه‌ها»). پس
   یادآورِ تازه **جایگزین** می‌شود نه اضافه — دوتایی هم بودجه را می‌شکند و هم
   دو دستورِ متناقض می‌دهد.

   و سقفِ ۳۲۰ یک سدّ است، نه سلیقه: یک بار دستورِ بلند باعث شد مدل خودِ دستور
   را وسطِ قسمت بلند بخوانَد. پس هر بندِ این بلوک دربارهٔ همان سدّ است.  */
{
  const vowelled = 'بابا بِه خانه آمَد وَ ما را صِدا زَد.';
  const onWas = CFG.SPEAK_STYLE_ON;

  // ── خاموش: هیچ‌چیزِ امروز عوض نمی‌شود ──
  CFG.SPEAK_STYLE_ON = false;
  const off = ttsCue_('گرم', vowelled);
  ok('خاموش که باشد، یادآورِ سبک نمی‌رود', off.indexOf('سرِ نقطه') === -1);
  ok('و یادآورِ روان‌خوانیِ فعلی سرِ جایش است', /واژه‌به‌واژه/.test(off));

  // ── روشن: جایگزین می‌شود، نه اضافه ──
  CFG.SPEAK_STYLE_ON = true;
  const on = ttsCue_('گرم', vowelled);
  /* یادآور **کامل** سنجیده می‌شود، نه سرش. جهشی که بازسازی را وادار کند
     فقط ۶۰ نویسهٔ اولِ یادآور را نگه دارد، از سنجهٔ `/سرِ نقطه/` رد می‌شد —
     در حالی که جملهٔ «پایانِ هر عبارت را کمی فرود بیاور» یکی از دو یافتهٔ
     اندازه‌گیری‌شده است و کلِ این تغییر برای همان نوشته شده. نصفِ یک دستور،
     دستور نیست. */
  ok('روشن که باشد، یادآورِ سنجیده **کامل** می‌رود',
     on.indexOf(CFG.SPEAK_STYLE_HINT) !== -1, on.slice(0, 120));
  ok('و یادآورِ قبلی **جایش را می‌دهد**، کنارش نمی‌ماند',
     !/واژه‌به‌واژه/.test(on));
  ok('لهجه همچنان می‌رود', /افغانی/.test(on));
  ok('و زیرِ سقف است', on.length <= CFG.TTS_CUE_MAX + 25, on.length + ' نویسه');

  /* ── و آن سکوتی که نباید بیفتد ──
     یادآور در انتهای رشته است، پس بریدنِ ساده اول همان را می‌خورَد: یک لحنِ
     بخشِ بلند می‌توانست دستورِ سنجیده را بی‌صدا حذف کند و هیچ خطایی بلند
     نشود. همان «قابلیتی که خودش را خاموش می‌کند». پس وقتی سبک روشن است،
     لحنِ بخش کوتاه می‌شود نه یادآور.  */
  const huge = 'آرام، روشن و معلم‌وار. شمرده و با اطمینان، مثل مدرسی که می‌خواهد مطلب ' +
               'جا بیفتد. روی تعریف‌ها و اصطلاح‌ها تأکید کن و پیش از هر مفهوم تازه یک ' +
               'مکث کوتاه بگذار. این بخشِ «چرا این درس» است: شمرده و کمی آهسته‌تر.';
  const big = ttsCue_(huge, vowelled);
  ok('با لحنِ بخشِ بسیار بلند هم یادآورِ سنجیده **کامل** زنده می‌مانَد',
     big.indexOf(CFG.SPEAK_STYLE_HINT) !== -1, big.length + ' نویسه');
  ok('و لهجه هم زنده می‌مانَد', /افغانی/.test(big));
  ok('و باز هم زیرِ سقف', big.length <= CFG.TTS_CUE_MAX + 25, big.length + '');
  ok('و با نشانهٔ مرزِ متن تمام می‌شود', /فقط این متن را اجرا کن:$/.test(big));

  // ── متنِ بی‌اعراب: اولویت با تلفظ است، نه سبک ──
  const plainOn = ttsCue_('گرم', 'بابا به خانه آمد و ما را صدا زد.');
  ok('متنِ بی‌اعراب همچنان یادآورِ تلفظ می‌گیرد', /زیر و زبر/.test(plainOn));

  /* ══ و همان شاخه، این‌بار با لحنِ بلند — نقصی که بازبینیِ خصمانه پیدا کرد ══

     نگهبانِ بازسازی اولْ `deep` بود، یعنی «سبک روشن است» — نه «یادآورِ سبک
     واقعاً در دستور نشست». در شاخهٔ بی‌اعراب عمداً یادآورِ تلفظ انتخاب شده و
     `deep` کنار گذاشته شده؛ ولی بازسازی همان تصمیم را بی‌صدا لغو می‌کرد،
     یادآورِ تلفظ را می‌انداخت، و چون نتیجه باز از سقف بلندتر می‌شد بریدنِ ته
     خودِ یادآورِ سبک را هم نصفه می‌کرد. آن‌چه به مدل می‌رسید:
     «… بگذار نه، فقط این متن را اجرا کن:» — جمله‌ای بریده روی حرفِ نفی.

     سنجه از هر ادعایی محکم‌تر بسته شده: در این شاخه، روشن و خاموش باید
     **عیناً یک رشته** بدهند. یعنی قابلیتی که خاموش اعلام شده، در مسیری که
     مالِ خودش نیست هیچ ردی نمی‌گذارد. */
  const plainTxt = 'بابا به خانه آمد و ما را صدا زد.';
  CFG.SPEAK_STYLE_ON = true;  const plainHugeOn  = ttsCue_(huge, plainTxt);
  CFG.SPEAK_STYLE_ON = false; const plainHugeOff = ttsCue_(huge, plainTxt);
  ok('بی‌اعراب + لحنِ بلند: روشن و خاموش عیناً یکی‌اند',
     plainHugeOn === plainHugeOff, plainHugeOn.slice(-70));
  ok('و نیمهٔ بریدهٔ یادآورِ سبک به مدل نمی‌رسد',
     plainHugeOn.indexOf('درونِ جمله') === -1, plainHugeOn.slice(-70));

  CFG.SPEAK_STYLE_ON = onWas;

  /* ── و دو قولی که تا امروز هیچ سنجه‌ای پشتشان نبود ──

     هر دو با جهشِ عمدیِ سرچشمه پیدا شدند، نه با خواندنش: `SPEAK_STYLE_ON`
     را `true` کردم و هیچ‌چیز نشکست؛ `finally` را برداشتم و هیچ‌چیز نشکست.
     یعنی همان دو جمله‌ای که این نسخه به صاحبِ برنامه می‌گوید — «پیش‌فرض
     خاموش است» و «پرچم حتماً برداشته می‌شود» — تا این‌جا فقط در توضیحِ کد
     نوشته بودند، و توضیحِ کد چیزی را نگه نمی‌دارد. */
  /* مسیرِ پرچمِ موقت، که تا امروز صفر پوشش داشت: برداشتنِ کاملش از `ttsCue_`
     هیچ سنجه‌ای را نمی‌شکست، در حالی که کلِ `runStyleProbe` روی همین سوار
     است. و پرچم **تاریخِ انقضا** دارد، چون Apps Script اجرا را سرِ شش دقیقه
     بی خطا می‌کُشد و `finally` اجرا نمی‌شود — بی آن، یک اجرای کشته‌شده هر دو
     پادکست را تا ابد با سبکی می‌خوانْد که کسی روشنش نکرده. */
  CFG.SPEAK_STYLE_ON = false;
  styleProbeSet_(true);
  const viaFlag = ttsCue_('گرم', vowelled);
  ok('۱۲٫۲ پرچمِ موقت، سبک را روشن می‌کند حتی وقتی تنظیم خاموش است',
     viaFlag.indexOf(CFG.SPEAK_STYLE_HINT) !== -1, viaFlag.slice(-60));
  props_().setProperty(PK.STYLE_PROBE,
    String(new Date().getTime() - (Number(CFG.STYLE_PROBE_TTL_MIN) + 5) * 60000));
  const stale = ttsCue_('گرم', vowelled);
  ok('۱۲٫۳ و پرچمِ کهنه (اجرای کشته‌شده) نادیده گرفته می‌شود',
     stale.indexOf(CFG.SPEAK_STYLE_HINT) === -1 && /واژه‌به‌واژه/.test(stale),
     stale.slice(-60));
  styleProbeSet_(null);
  ok('۱۲٫۴ و برداشتنش همه‌چیز را به حالتِ امروز برمی‌گردانَد',
     ttsCue_('گرم', vowelled) === off);
  CFG.SPEAK_STYLE_ON = onWas;

  const cfgSrc = fs.readFileSync('src/00_Config.gs', 'utf8');
  /* ۲۰ سپتامبر: صاحبِ برنامه دو نمونهٔ رنگی را شنید و گفت «دومی بهتر بود».
     پس پرچم روشن شد — و این سنجه از «باید خاموش باشد» به «باید **تصمیمِ
     گرفته‌شده** باشد» تغییر کرد. عمداً هنوز سنجه‌ای هست: عوض کردنِ این خط
     باید از همین‌جا هم رد شود تا کسی بی‌تصمیم برش نگردانَد. */
  ok('۱۲٫۱ تصمیمِ گرفته‌شده در سرچشمه ثبت است (۲۰ سپتامبر: روشن)',
     /^\s*SPEAK_STYLE_ON:\s*true,\s*$/m.test(cfgSrc),
     (cfgSrc.match(/^\s*SPEAK_STYLE_ON:.*$/m) || ['—'])[0].trim());
}

/* «روحِ خواندن» — پرچمِ موقت باید برداشته شود، حتی وقتی کار می‌شکند.

   `runStyleProbe` برای ساختنِ نمونهٔ «با روح»، `PK.STYLE_PROBE` را موقتاً
   می‌گذارد. اگر بمانَد، موتور تا ابد در حالتی می‌مانْد که هیچ‌کس انتخابش
   نکرده — و چون `SPEAK_STYLE_ON` هنوز false است، هیچ‌جا هم نوشته نیست چرا.
   این سنجه خودِ تابع را **اجرا** می‌کند، نه اینکه دنبالِ واژهٔ finally در
   متنِ کد بگردد: سنجه‌ای که به شکلِ کد تکیه کند، با اولین بازنویسی می‌میرد.  */
console.log('\n=== ۱۲-ب. نمونهٔ سبک: پرچمِ موقت نمی‌مانَد ===');
{
  global.__PROPS = {}; global.__SS = {}; global._ssCache = null;
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  global.DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');

  const unQ = quiet();
  const r = runStyleProbe();
  unQ();
  ok('۱۲-ب٫۱ هر دو نمونه ساخته شد', r && r.ok === true && r.made.length === 2,
     JSON.stringify(r && r.made || []).slice(0, 120));
  ok('۱۲-ب٫۲ و پرچمِ موقت پس از اجرای موفق نمانده',
     props_().getProperty(PK.STYLE_PROBE) === null,
     String(props_().getProperty(PK.STYLE_PROBE)));

  // و مهم‌تر: وقتی وسطِ کار می‌شکند. بدونِ finally، پرچمِ دورِ «با روح»
  // سرِ جایش می‌مانْد و هر قسمتِ بعدی با سبکی خوانده می‌شد که کسی
  // روشنش نکرده بود.
  const realTts = global.ttsChunkTry_;
  global.ttsChunkTry_ = function () { throw new Error('مدل در دسترس نیست'); };
  const unQ2 = quiet();
  const r2 = runStyleProbe();
  unQ2();
  global.ttsChunkTry_ = realTts;
  ok('۱۲-ب٫۳ شکستِ وسطِ کار، تابع را نمی‌ترکانَد', r2 && r2.ok === false);
  ok('۱۲-ب٫۴ و پرچم باز هم برداشته شده — سدّ اصلیِ این بخش',
     props_().getProperty(PK.STYLE_PROBE) === null,
     String(props_().getProperty(PK.STYLE_PROBE)));

  /* و نشانهٔ شبانه: «یک بار، نه هر شب» فقط وقتی راست است که نشانه به چیزی
     گره بخورد که هر شب عوض نمی‌شود. گره‌خوردن به `CODE_VERSION` در این مخزن
     یعنی هر شب، چون این مخزن روزی یک نسخه می‌دهد — یعنی همان ادعا، وارونه. */
  const nightSrc = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const blk = nightSrc.slice(nightSrc.indexOf('PK.STYLE_PROBE_DONE') - 400,
                             nightSrc.lastIndexOf('PK.STYLE_PROBE_DONE') + 200);
  ok('۱۲-ب٫۵ نشانهٔ شبانه به متنِ یادآور گره خورده، نه به شمارهٔ نسخه',
     blk.indexOf('CFG.SPEAK_STYLE_HINT') !== -1 &&
     blk.indexOf('CODE_VERSION') === -1);
  /* و نشانه فقط با **موفقیت** ثبت می‌شود: بی این قید، یک شبِ ناموفق نمونه را
     تا ابد «انجام‌شده» می‌کرد و دیگر هرگز ساخته نمی‌شد. */
  ok('۱۲-ب٫۶ و فقط وقتی ثبت می‌شود که نمونه واقعاً ساخته شده باشد',
     /if\s*\(\s*spR\s*&&\s*spR\.ok\s*\)\s*props_\(\)\.setProperty\(\s*PK\.STYLE_PROBE_DONE/
       .test(blk.replace(/\s+/g, ' ').replace(/ /g, ' ')) ||
     /spR && spR\.ok/.test(blk));
}

/* ══ ۱۲-پ) نمونه‌ای که دو فایلِ یکسان بسازد، بدتر از نبودنش است (۷٫۱۱) ══

   ۷٫۱۰ دقیقاً همین‌جا شکست و هیچ سنجه‌ای نگرفتش: `STYLE_PROBE_LINE` بی‌اعراب
   بود، پس `ttsCue_` شاخهٔ یادآورِ **تلفظ** را می‌گرفت و یادآورِ سبک اصلاً
   نمی‌نشست. دو فایل بایت‌به‌بایت یکی می‌شدند، تابع «✅ هر دو نمونه ساخته شد»
   می‌گفت، نشانهٔ «انجام شد» ثبت می‌شد و دیگر تکرار نمی‌شد — و صاحبِ برنامه با
   شنیدنِ دو فایلِ یکسان نتیجه می‌گرفت «کارت اثری ندارد».

   سنجهٔ قبلی فقط می‌شمرد: `ok===true && made.length===2`. یعنی تابع را اجرا
   می‌کرد و تأیید می‌کرد خروجی تولید شد، در حالی که کاری که تابع برایش نوشته
   شده انجام نمی‌شد. سنجهٔ درست یک جمله است: **دو نمونه باید فرق داشته باشند.** */
console.log('\n=== ۱۲-پ. نمونهٔ سبک: دو فایل باید واقعاً فرق کنند ===');
{
  global.__PROPS = {}; global.__SS = {}; global._ssCache = null;
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  global.DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');
  const onWas2 = CFG.SPEAK_STYLE_ON;
  CFG.SPEAK_STYLE_ON = false;

  ok('۱۲-پ٫۱ متنِ نمونه اعراب‌دار است — وگرنه یادآورِ سبک هرگز نمی‌نشیند',
     speakVowelledOk_(STYLE_PROBE_LINE, STYLE_PROBE_LINE) === true,
     'چگالی: ' + ((STYLE_PROBE_LINE.match(/[\u064B-\u0652]/g) || []).length /
                  (STYLE_PROBE_LINE.match(/[\u0621-\u064A]/g) || []).length).toFixed(3));

  styleProbeSet_(true);  const pOn  = ttsCue_('آرام و روایی', STYLE_PROBE_LINE);
  styleProbeSet_(null); const pOff = ttsCue_('آرام و روایی', STYLE_PROBE_LINE);
  ok('۱۲-پ٫۲ و دو دستورِ نمونه واقعاً فرق دارند', pOn !== pOff, pOn.slice(-55));
  ok('۱۲-پ٫۳ دستورِ «با روح» یادآورِ سنجیده را **کامل** دارد',
     pOn.indexOf(CFG.SPEAK_STYLE_HINT) !== -1);
  ok('۱۲-پ٫۴ و هیچ‌کدام دو نقطهٔ پشتِ هم ندارند',
     pOn.indexOf('..') === -1 && pOff.indexOf('..') === -1);

  /* و سدّ: اگر به هر دلیلی دو دستور یکی درآیند — بی‌اعرابیِ متن، یادآورِ
     خالی، یا خاموشیِ دستور در `ttsPayloads_` — هیچ فایلی نباید نوشته شود.
     این‌جا با خالی‌کردنِ یادآور همان حالت ساخته می‌شود. */
  const hintWas = CFG.SPEAK_STYLE_HINT;
  CFG.SPEAK_STYLE_HINT = '';
  const unQ3 = quiet();
  const rBad = runStyleProbe();
  unQ3();
  CFG.SPEAK_STYLE_HINT = hintWas;
  ok('۱۲-پ٫۵ دو دستورِ یکسان ⇒ هیچ فایلی نوشته نمی‌شود و ok=false',
     rBad.ok === false && rBad.made.length === 0, JSON.stringify(rBad.made));
  ok('۱۲-پ٫۶ و دلیلش گفته می‌شود، نه اینکه ✅ بگوید',
     rBad.error.indexOf('یکی درآمد') !== -1, rBad.error.slice(0, 70));
  ok('۱۲-پ٫۷ و پرچمِ موقت باز هم نمانده',
     props_().getProperty(PK.STYLE_PROBE) === null);

  /* و سنجهٔ آخر، که جهشِ «هیچ‌وقت پرچم را روشن نکن» را می‌گیرد: دستوری که
     در **خودِ اجرا** برای هر نمونه ساخته می‌شود ضبط می‌شود و باید فرق کند.
     سنجهٔ قبلی فقط دو فایل می‌شمرد، و دو فایلِ یکسان هم دو فایل است. */
  const seen = [];
  const realSyn = global.ttsChunkTry_;
  // در **لحظهٔ صداگذاریِ هر فایل** پرچم را می‌خوانیم، نه جای دیگر: خودآزمونِ
  // تابع پیش از حلقه اجرا می‌شود و اگر آن را بشماریم، جهشی که حلقه را
  // خاموش کند از دستمان در می‌رود — همان چیزی که بازبینیِ سوم نشان داد.
  global.ttsChunkTry_ = function (tx, st, v) { seen.push(styleProbeOn_()); return realSyn(tx, st, v); };
  const unQ4 = quiet();
  const rGood = runStyleProbe();
  unQ4();
  global.ttsChunkTry_ = realSyn;
  ok('۱۲-پ٫۸ در اجرای واقعی، یکی با پرچم و یکی بی پرچم صداگذاری شد',
     rGood.ok === true && seen.length === 2 &&
     seen.filter(Boolean).length === 1, JSON.stringify(seen));

  /* و کفِ محافظ: یادآوری که در سقف جا نشود، نصفه فرستاده نمی‌شود. */
  CFG.SPEAK_STYLE_HINT = hintWas + ' ' + hintWas + ' ' + hintWas;
  CFG.SPEAK_STYLE_ON = true;
  const tooBig = ttsCue_('گرم', 'بابا بِه خانه آمَد وَ ما را صِدا زَد.');
  CFG.SPEAK_STYLE_HINT = hintWas;
  ok('۱۲-پ٫۹ یادآورِ جا‌نشدنی کامل کنار می‌رود، نصفه نمی‌رود',
     tooBig.indexOf('مکث‌ها را بیشتر') === -1 &&
     tooBig.length <= CFG.TTS_CUE_MAX + 25, tooBig.slice(-55));
  ok('۱۲-پ٫۱۰ و لهجه در آن حالت هم سرِ جایش می‌مانَد', /افغانی/.test(tooBig));

  CFG.SPEAK_STYLE_ON = onWas2;
}

/* ══ ۱۲-ت) چهار وعده که تا ۷٫۱۲ هیچ سنجه‌ای نداشتند، و لحنی که می‌افتاد ══

   بازبینیِ خصمانه هر چهار را با جهش آزمود و هر چهار سبز ماندند: برداشتنِ
   قفل، نادیده‌گرفتنِ جوابِ `mailQueue_`، نوشتن در ریشهٔ OUTPUT، و ثبتِ
   نشانهٔ شبانه بی‌قیدِ موفقیت. وعده‌ای که سنجه ندارد، یک جمله در کامنت است. */
console.log('\n=== ۱۲-ت. وعده‌های نمونهٔ سبک، سنجیده ===');
{
  global.__PROPS = {}; global.__SS = {}; global._ssCache = null;
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  global.DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');

  // ── قفل: مشغول بودن یعنی هیچ کاری، و پرچم دست‌نخورده ──
  const realLock = global.LockService;
  global.LockService = { getScriptLock: () => ({ tryLock: () => false, releaseLock: () => {} }) };
  const unL = quiet(); const rBusy = runStyleProbe(); unL();
  ok('۱۲-ت٫۱ قفلِ گرفته ⇒ هیچ فایلی، و دلیلِ «busy»',
     rBusy.ok === false && rBusy.made.length === 0 && rBusy.error === 'busy');
  ok('۱۲-ت٫۲ و پرچمِ موقت اصلاً گذاشته نشد',
     props_().getProperty(PK.STYLE_PROBE) === null);
  // و پرتابِ خودِ قفل هم نباید از تابع بیرون بزند
  global.LockService = { getScriptLock: () => { throw new Error('lock svc down'); } };
  let threw = false;
  const unL2 = quiet();
  try { runStyleProbe(); } catch (e) { threw = true; }
  unL2();
  global.LockService = realLock;
  ok('۱۲-ت٫۳ پرتابِ سرویسِ قفل از تابع بیرون نمی‌زند', threw === false);

  // ── فایل‌ها در زیرپوشه، نه در ریشهٔ OUTPUT ──
  const unD = quiet(); const rOk = runStyleProbe(); unD();
  const root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const names = (fo) => { const it = fo.getFiles(), a = []; while (it.hasNext()) a.push(it.next().getName()); return a; };
  const rootNames = names(root);
  const sub = root.getFoldersByName(CFG.VOICE_AUDIT_FOLDER).next();
  ok('۱۲-ت٫۴ هیچ نمونه‌ای در ریشهٔ OUTPUT ننشست',
     rootNames.filter(n => n.indexOf('نمونهٔ سبک') === 0).length === 0, rootNames.join(' · '));
  ok('۱۲-ت٫۵ و هر دو در پوشهٔ داوریِ صداها هستند',
     rOk.ok === true && names(sub).filter(n => n.indexOf('نمونهٔ سبک') === 0).length === 2,
     names(sub).join(' · '));

  // ── جوابِ صفِ ایمیل چک می‌شود ──
  const realMQ = global.mailQueue_;
  let logged = '';
  const realLog = global.logLine_;
  global.mailQueue_ = () => false;
  global.logLine_ = function (m) { logged += String(m) + '\n'; };
  const unM = quiet(); runStyleProbe(); unM();
  global.mailQueue_ = realMQ; global.logLine_ = realLog;
  ok('۱۲-ت٫۶ صفِ ایمیلِ خراب در سیاهه رد می‌گذارد، نه سکوت',
     logged.indexOf('صفِ ایمیل نپذیرفت') !== -1, logged.slice(0, 120));

  // ── و لحنِ بخش نباید قربانیِ یادآور شود ──
  const onWas3 = CFG.SPEAK_STYLE_ON;
  const base = 'آرام، روشن و معلم‌وار. شمرده و با اطمینان، مثل مدرسی که می‌خواهد ' +
               'مطلب جا بیفتد. روی تعریف‌ها و اصطلاح‌ها تأکید کن و پیش از هر مفهوم ' +
               'تازه یک مکث کوتاه بگذار.';
  const tones = [base + ' این آغاز برنامه است: گرم و دعوت‌کننده.',
                 base + ' این مرورِ قسمت‌های قبل است: سریع‌تر و سبک‌تر از بدنهٔ درس.',
                 base + ' این پایانِ برنامه است: جمع‌بندی‌کننده و آرام.'];
  const vow = 'بابا بِه خانه آمَد وَ ما را صِدا زَد.';
  CFG.SPEAK_STYLE_ON = true;
  const cues = tones.map(t => ttsCue_(t, vow));
  CFG.SPEAK_STYLE_ON = onWas3;
  ok('۱۲-ت٫۷ سه لحنِ متفاوت، سه دستورِ متفاوت می‌دهند — نه یکی',
     new Set(cues).size === 3, new Set(cues).size + ' از ۳');
  ok('۱۲-ت٫۸ و آن‌چه نگه داشته می‌شود **دُمِ متمایز** است، نه پایهٔ مشترک',
     cues[0].indexOf('دعوت‌کننده') !== -1 && cues[2].indexOf('جمع‌بندی') !== -1,
     cues[0].slice(-95));
  /* و برش وسطِ واژه نمی‌افتد. این را روی خودِ `styleFit_` می‌سنجیم نه روی
     رشتهٔ نهایی: نگارشِ اولِ همین سنجه `indexOf('، ')` می‌گرفت که اولین
     ویرگولِ **پایهٔ لحن** است نه جداکنندهٔ لحنِ بخش، و نتیجه‌اش یک شکستِ
     دروغین بود. سنجه‌ای که چیزِ اشتباه را بسنجد، از نبودنش بهتر نیست. */
  const room = CFG.TTS_CUE_MAX -
    ('با صدای ' + CFG.TTS_STYLE_BASE + '، ' + '. ' + CFG.SPEAK_STYLE_HINT).length;
  ok('۱۲-ت٫۹ آن‌چه از لحن می‌مانَد، تکه‌ای دست‌نخورده از خودِ لحن است',
     tones.every(t => { const f = styleFit_(t, room);
       return f.length > 0 && f.length <= room && t.indexOf(f) !== -1; }),
     JSON.stringify(styleFit_(tones[0], room)));
  // و یک جملهٔ تنهای بلندتر از جا: از سر بریده می‌شود، روی مرزِ واژه
  const oneLong = 'عددها و مفهوم‌ها را شمرده بگو، بدون هیجان و بدون لحنِ نمایشی، ' +
                  'و هر اصطلاح را جدا جدا و با تأکیدِ روشن ادا کن تا جا بیفتد';
  const cut = styleFit_(oneLong, 40);
  ok('۱۲-ت٫۹ب جملهٔ تنهای بلند هم روی مرزِ واژه بریده می‌شود',
     cut.length <= 40 && oneLong.indexOf(cut) !== -1 &&
     oneLong.charAt(oneLong.indexOf(cut) - 1) === ' ', JSON.stringify(cut));
  ok('۱۲-ت٫۱۰ و یادآور در هر سه کامل است',
     cues.every(c => c.indexOf(CFG.SPEAK_STYLE_HINT) !== -1));

  /* ── اشتراکِ موقت: بی آن، کلِ مرحلهٔ بعدی شکست می‌خورد ──
     آزمایشگاهِ صدا از بیرونِ درایو فایل را با یک آدرسِ عمومی برمی‌دارد؛
     فایلِ خصوصی آن‌جا به‌جای صوت یک صفحهٔ HTML می‌دهد. صاحبِ برنامه گفت روح
     را جدا از رنگ نمی‌تواند داوری کند، پس این مرحله اختیاری نیست. */
  const sub2 = root.getFoldersByName(CFG.VOICE_AUDIT_FOLDER).next();
  const shared = [];
  { const it = sub2.getFiles();
    while (it.hasNext()) { const f = it.next();
      if (String(f.getName()).indexOf('نمونهٔ سبک') === 0) shared.push(f); } }
  ok('۱۲-ت٫۱۲ هر دو نمونه «هرکس با لینک» شدند',
     shared.length === 2 &&
     shared.every(f => f._share && f._share.access === DriveApp.Access.ANYONE_WITH_LINK),
     shared.map(f => JSON.stringify(f._share)).join(' · '));

  /* و پس گرفته می‌شود — ولی نه همان شب. مهلت لازم است: بینِ ساختِ شبانه و
     اجرای آزمایشگاه دستِ‌کم یک روز فاصله است، و اشتراکی که پیش از استفاده
     بسته شود همان اشتراکی است که انگار هرگز نبود. */
  const n0 = styleProbeUnshare_();
  ok('۱۲-ت٫۱۳ فایلِ تازه همان شب اشتراکش پس گرفته نمی‌شود',
     n0 === 0 && shared.every(f => f._share.access === DriveApp.Access.ANYONE_WITH_LINK),
     n0 + ' فایل');
  shared.forEach(f => { f._created =
    new Date(new Date().getTime() - (Number(CFG.STYLE_PROBE_SHARE_HOURS) + 6) * 3600000); });
  const n1 = styleProbeUnshare_();
  ok('۱۲-ت٫۱۴ ولی فایلِ کهنه پس گرفته می‌شود',
     n1 === 2 && shared.every(f => f._share.access === DriveApp.Access.PRIVATE),
     n1 + ' فایل');

  /* و دوقلو نداریم: بخشِ ۲۷ همان تعریف را صدا می‌زند، نه نسخهٔ دومِ خودش.
     «یک دوقلو که یک‌بار درست شود، یک‌بار درست شده است» — و بخشِ ۲۰ هم
     نمی‌تواند از ۲۷ صدا بزند، که همان وسوسهٔ کپی را می‌ساخت. */
  const src18 = fs.readFileSync('src/18_Files.gs', 'utf8');
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۱۲-ت٫۱۵ تعریفِ اشتراک یک‌جاست و بخشِ ۲۷ همان را صدا می‌زند',
     /function driveShareOn_/.test(src18) &&
     !/function driveShareOn_/.test(src27) &&
     /function ytShareOn_\s*\([^)]*\)\s*\{\s*return driveShareOn_/.test(src27));

  // ── پرچمِ مهرِ آینده باید مرده حساب شود ──
  CFG.SPEAK_STYLE_ON = false;
  props_().setProperty(PK.STYLE_PROBE, String(new Date().getTime() + 365 * 86400000));
  /* از ۷٫۱۷ سه حالت داریم: `null` یعنی «پرچم چیزی نمی‌گوید، تنظیم تصمیم
     می‌گیرد». مهرِ آینده باید همین شود — نه «روشن»، و نه «صریح خاموش». */
  ok('۱۲-ت٫۱۱ مهرِ زمانیِ آینده نادیده گرفته می‌شود (نه روشن، نه خاموشِ صریح)',
     styleProbeOn_() === null);
  styleProbeSet_(null);
  CFG.SPEAK_STYLE_ON = onWas3;
}

/* ══ ۱۳) «خاموش» نباید یعنی «برای همیشه» (۷٫۱۵) ══

   ۱۹ سپتامبر، دکمهٔ نمونهٔ سبک زده شد و `runStyleProbe` درست امتناع کرد:
   «دستورِ هر دو نمونه یکی درآمد». علتش نه اعراب بود نه یادآور — از ۹ سپتامبر
   مدلِ گفتارساز قالبِ دستور را رد کرده بود و موتور حکمش را **برای همیشه**
   ثبت کرده بود. کامنتِ خودِ کد می‌گفت «تا وقتی مدل عوض نشود دیگر امتحان
   نمی‌شود». نتیجه: ده روز هر تکهٔ هر دو پادکست بی هیچ دستورِ لحنی خوانده شد،
   و هیچ‌چیز قرار نبود خودش برش گردانَد.

   و مدلی که رد کرده بود `…-preview` است — یعنی همان چیزی که رفتارش بی عوض
   شدنِ نامش عوض می‌شود. «یک‌بار یاد بگیر و دیگر نپرس» برای آن یعنی «هرگز». */
console.log('\n=== ۱۳. حکمِ «دستور را نمی‌پذیرد» تاریخِ انقضا دارد ===');
{
  global.__PROPS = {}; global.__SS = {}; global._ssCache = null;
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  const M = 'gemini-x-tts-preview';
  const days = Number(CFG.TTS_CUE_RETRY_DAYS);
  ok('۱۳٫۱ پنجرهٔ امتحانِ دوباره تعریف شده و مثبت است', isFinite(days) && days > 0, days + ' روز');

  ok('۱۳٫۲ مدلی که هرگز رد نکرده، خاموش نیست', ttsCueOffNow_(M) === false);

  /* `nowStr_()` آرگومان نمی‌گیرد — همیشه «الان» می‌دهد. نگارشِ اولِ همین
     سنجه فکر می‌کرد می‌گیرد، پس هر سه مهر روی یک لحظه می‌نشست و سه بند
     الکی قرمز شدند. مهر را با همان قالبِ `nowStr_` دستی می‌سازیم. */
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const stamp = (agoDays) => {
    const d = new Date(Date.parse(nowStr_().replace(' ', 'T')) - agoDays * 86400000);
    props_().setProperty(PK.TTS_CUE_OFF, M);
    props_().setProperty(PK.TTS_CUE_OFF_AT,
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()));
  };
  stamp(0);
  ok('۱۳٫۳ تازه که رد کرده، خاموش است', ttsCueOffNow_(M) === true);
  stamp(days + 1);
  ok('۱۳٫۴ ولی پس از پنجره، دوباره امتحان می‌شود — همان چیزی که ده روز نبود',
     ttsCueOffNow_(M) === false);

  /* و حکم فقط برای همان مدل است: مدلِ دیگر نباید قربانیِ آن شود. */
  ok('۱۳٫۵ حکم فقط مالِ همان مدل است', ttsCueOffNow_('gemini-other-tts') === false);

  /* و دستور واقعاً دوباره فرستاده می‌شود — سنجهٔ رفتاری، نه متنی. */
  const cueOf = (m) => {
    const p = ttsPayloads_('مَتنِ آزمایشی.', m, 'گرم', 'Kore', true);
    const si = p.generateContent.body.systemInstruction;
    return (si && si.parts && si.parts[0] && si.parts[0].text) || '';
  };
  stamp(0);
  /* `cueOf` عمداً فقط قالبِ **فیلددار** را می‌خوانَد: ادعای این سنجه از
     ۷٫۸۹ این است که فیلد بسته می‌ماند، نه اینکه لحن قطع شود. */
  ok('۱۳٫۶ در پنجرهٔ خاموشی هیچ دستوری در فیلد فرستاده نمی‌شود', cueOf(M) === '');
  ok('۱۳٫۶-ب ولی همان لحظه دستور از راهِ پیشوند می‌رود (۷٫۸۹)',
     ttsPayloads_('مَتنِ آزمایشی.', M, 'گرم', 'Kore', true)
       .prompted.body.contents[0].parts[0].text.indexOf('با صدای') === 0);
  stamp(days + 1);
  ok('۱۳٫۷ و پس از آن دوباره دستور می‌رود', cueOf(M).indexOf('با صدای') === 0,
     cueOf(M).slice(0, 40));

  /* خطِ روزانه باید فرقِ «خاموش» و «در نوبتِ امتحان» را بگوید — وگرنه
     خواننده فرض می‌کند هیچ‌وقت، و همان فرض بود که ده روز طول کشید. */
  const realTM = global.ttsModel_;
  global.ttsModel_ = () => M;
  stamp(0);
  const s1 = ttsCueStatus_();
  stamp(days + 1);
  const s2 = ttsCueStatus_();
  global.ttsModel_ = realTM;
  /* ══ این ادعا هم در ۷٫۸۹ وارونه شد و همین‌جا ثبت می‌شود ══
     تا ۷٫۸۸ ردشدنِ فیلد یعنی «لحن نمی‌رود»، پس `ok === false` درست بود.
     از ۷٫۸۹ دستور از راهِ پیشوندِ متن می‌رود، پس `ok` باید درست باشد —
     ولی سطر همچنان موظف است **مدل و مسیر** را نام ببرد، وگرنه همان
     «همه‌چیز خوب است»ی می‌شود که چیزی را پنهان می‌کند. */
  ok('۱۳٫۸ در ردشدنِ فیلد، سطر مسیرِ جایگزین و نامِ مدل را می‌گوید',
     s1.ok === true && s1.line.indexOf('پیشوندِ متن') !== -1 &&
     s1.line.indexOf(M) !== -1, s1.line);
  ok('۱۳٫۹ و در نوبتِ امتحان، دیگر «خاموش» نمی‌گوید',
     s2.ok === true && s2.line.indexOf('نوبتِ امتحانِ دوباره') !== -1, s2.line);

  props_().deleteProperty(PK.TTS_CUE_OFF);
  props_().deleteProperty(PK.TTS_CUE_OFF_AT);
}

/* ══ ۱۴) شناسهٔ ردیفِ گزارش باید یکتا باشد (۷٫۱۶) ══
   گزارشِ بی‌شناسه به رشتهٔ برهنهٔ 'RPT' برمی‌گشت، پس دو گزارشِ کاملاً متفاوت
   هر دو `RPT#1` می‌ساختند. سه گزارشِ پیاپیِ ناظر (۱۷–۱۹ سپتامبر) نوشتند
   «هنوز باز، هنوز جدی» و هر بار از بستنِ ردیف‌ها صرفِ‌نظر کرد، چون بستنِ
   یکی می‌توانست ردیفِ نامربوطی را هم ببندد. یک خطِ کد، خودِ خوداصلاحی را
   قفل کرده بود. */
console.log('\n=== ۱۴. شناسهٔ ردیفِ گزارش یکتاست ===');
{
  const f = { priority: 'متوسط', category: 'عمومی', title: 'ت', detail: 'د',
              instruction: 'ک', owner: 'کد' };
  const a = reportRow_({ at: '2026-09-17 08:00' }, f, 0)[0];
  const b = reportRow_({ at: '2026-09-18 08:00' }, f, 0)[0];
  ok('۱۴٫۱ دو گزارشِ بی‌شناسه در دو روز، دو شناسهٔ متفاوت می‌گیرند',
     a !== b, a + '  vs  ' + b);
  ok('۱۴٫۲ و شناسه دیگر «RPT#1»ِ برهنه نیست', a !== 'RPT#1' && b !== 'RPT#1', a);
  ok('۱۴٫۳ شناسهٔ صریحِ گزارش همچنان محترم است',
     reportRow_({ reportId: 'ENG-X', at: '2026-09-18 08:00' }, f, 2)[0] === 'ENG-X#3');
}

/* ══ ۱۵) درخواستِ غنی‌سازی: قفل نباید بی‌صدا یک روز را ببرد (۷٫۱۸) ══

   از ۱۰ تا ۲۰ سپتامبر هیچ `_ENRICH-REQ-*` نوشته نشد. خودِ تسکِ Cowork
   نوشته بود «تا موتور درخواست ننویسد، غنی‌سازی کاری ندارد» — و راست
   می‌گفت. ریشه: ۷٫۰۱ ادغامِ `_MUSIC-FEED.json` را داخلِ `syncCatalog` (هر
   ۲ ساعت، قفلِ مشترک) گذاشت؛ اجرای ساعتِ ۴ پشتِ آن قفل ماند و **بی‌صدا
   تسلیم شد** — و درخواست فقط در همان اجرا نوشته می‌شود.

   و نگهبان مقصر را اشتباه نشان می‌داد: «روتینِ Cowork را وارسی کنید». */
console.log('\n=== ۱۵. قفلِ گرفته: تلاشِ دوباره، و مقصرِ درست ===');
{
  global.__PROPS = {}; global.__SS = {}; global._ssCache = null;
  ok('۱۵٫۱ تلاشِ دوباره در روز سقف دارد (نه حلقهٔ بی‌پایان)',
     Number(CFG.BUSY_RETRY_MAX) > 0 && Number(CFG.BUSY_RETRY_MIN) >= 2,
     CFG.BUSY_RETRY_MAX + ' بار، هر ' + CFG.BUSY_RETRY_MIN + ' دقیقه');

  const made = [];
  const realNew = global.ScriptApp.newTrigger;
  global.ScriptApp.newTrigger = function (fn) {
    made.push(fn);
    return { timeBased: () => ({ after: () => ({ create: () => {} }) }) };
  };
  const un = quiet();
  const a = busyRetry_('produceEpisodeRetry');
  un();
  ok('۱۵٫۲ قفل که گرفته باشد، دوباره زمان‌بندی می‌شود — نه تسلیم',
     a === true && made.indexOf('produceEpisodeRetry') !== -1, made.join(','));

  // و سقف واقعاً می‌بندد
  const unq = quiet();
  let last = true;
  for (let i = 0; i < Number(CFG.BUSY_RETRY_MAX) + 2; i++) last = busyRetry_('produceEpisodeRetry');
  unq();
  global.ScriptApp.newTrigger = realNew;
  ok('۱۵٫۳ و پس از سقفِ روزانه دیگر تلاش نمی‌کند', last === false);

  /* نامِ تریگرِ تلاش باید **جدا** باشد: پاک کردنش هرگز نباید به تریگرِ
     روزانهٔ تولید بخورد. این سنجه همان مرز را می‌بندد. */
  const src3 = fs.readFileSync('src/03_Producer.gs', 'utf8');
  ok('۱۵٫۴ تلاشِ دوباره نامِ جدا دارد، نه نامِ تریگرِ روزانه',
     /function produceEpisodeRetry\(\)/.test(src3) &&
     /clearRetryTriggers_\('produceEpisodeRetry'\)/.test(src3));

  /* و مهرِ «موتور پرسید» جدا از مهرِ «تسک پاسخ داد» ثبت می‌شود. */
  const src19 = fs.readFileSync('src/19_Enrich.gs', 'utf8');
  ok('۱۵٫۵ نوشتنِ درخواست، زمانِ خودش را مهر می‌زند',
     /PK\.ENRICH_REQ_AT/.test(src19));

  /* نگهبان: تا موتور نپرسیده، سکوتِ تسک بدهی نیست. */
  const src8 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۱۵٫۶ نگهبانِ طرفِ موتور هست، و تسک بی‌جا متهم نمی‌شود',
     /key: 'enrichReq'/.test(src8) && /taskIdle/.test(src8));
}

/* ══ ۱۶) یافتهٔ «جدی»ِ مالِ موتور که تکرار شود، وارد صفِ کد می‌شود (۷٫۱۹) ══

   ۱۰ تا ۲۰ سپتامبر: تسکِ غنی‌سازی هر روز یافته‌ای «جدی» با مالکِ «موتور»
   نوشت («موتور از ۱۲ سپتامبر هیچ درخواستی ننوشته»). `reportRow_` مالک را از
   روی کلمهٔ «کد» تشخیص می‌دهد، و «موتور» آن را ندارد — پس ردیف «تازه» ماند و
   هرگز وارد صفی نشد که نسخهٔ بعدی از رویش ساخته می‌شود. ده روز دیده شد،
   نوشته شد، و هیچ‌کس موظف نبود برش دارد.

   دیدن هیچ‌وقت نیمهٔ گم‌شده نبود؛ **موظف‌شدن** بود. */
console.log('\n=== ۱۶. تکرارِ یافتهٔ جدیِ موتور، تکلیف می‌سازد ===');
{
  global.__PROPS = {}; global.__SS = {}; global._ssCache = null;
  global.DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');
  const hub = getHub_();
  const sh = ensureTab_(hub, CFG.TAB_REPORTS || 'گزارش‌های نظارت', REPORT_HEADERS);

  const f = { priority: 'جدی', category: 'موتور', key: 'engine-no-enrich-req',
              title: 'موتور درخواستِ غنی‌سازی نمی‌نویسد',
              detail: 'د', instruction: 'ک', owner: 'موتور' };
  const rep = { reportId: 'TASK-1', at: '2026-09-20 06:40' };

  sh.appendRow(reportRow_(rep, f, 0));
  const row0 = sh.getRange(2, 1, 1, REPORT_HEADERS.length).getValues()[0];
  ok('۱۶٫۱ بارِ اول مالکش موتور است و وارد صفِ کد نمی‌شود — همان رفتارِ درست',
     String(row0[RC.OWNER - 1]) !== ROWNER_CODE &&
     String(row0[RC.STATUS - 1]) !== RST.NEEDS_CODE,
     row0[RC.OWNER - 1] + ' / ' + row0[RC.STATUS - 1]);

  const prevOf = () => ({ row: 2, vals: sh.getRange(2, 1, 1, REPORT_HEADERS.length).getValues()[0] });
  const need = Number(CFG.ENGINE_ESCALATE_SEEN);
  const unq = quiet();
  let v = '';
  for (let i = 2; i <= need; i++) {
    v = touchExisting_(sh, prevOf(), { reportId: 'TASK-1', at: '2026-09-2' + i + ' 06:40' }, f);
  }
  unq();
  const rowN = sh.getRange(2, 1, 1, REPORT_HEADERS.length).getValues()[0];
  ok('۱۶٫۲ پس از ' + need + ' بار دیدن، به صفِ «نیازمند تعویض کد» می‌رود',
     String(rowN[RC.OWNER - 1]) === ROWNER_CODE &&
     String(rowN[RC.STATUS - 1]) === RST.NEEDS_CODE,
     rowN[RC.OWNER - 1] + ' / ' + rowN[RC.STATUS - 1]);
  ok('۱۶٫۳ و دلیلِ ارتقا در خودِ ردیف نوشته می‌شود',
     String(rowN[RC.DONE - 1]).indexOf('ارتقا به صفِ کد') !== -1,
     String(rowN[RC.DONE - 1]).slice(0, 60));
  /* نگارشِ اولِ این سنجه «ستونِ تلگرام باید خالی بماند» می‌گفت — غلط بود:
     ستون پاک می‌شود تا هشدار **لازم** شود، و بلافاصله `alertCodeRows_`
     می‌فرستدش و دوباره پُرش می‌کند. چیزی که اهمیت دارد رفتنِ هشدار است، نه
     خالی ماندنِ خانه. */
  ok('۱۶٫۴ و هشدارِ تازه واقعاً فرستاده می‌شود',
     String(rowN[RC.TG - 1] || '') !== '', String(rowN[RC.TG - 1] || '(خالی)'));

  /* و یافتهٔ «متوسط» ارتقا نمی‌گیرد — وگرنه صفِ کد پر می‌شود از چیزهایی که
     موتور خودش در قسمتِ بعد جبرانشان می‌کند، و صفی که همه‌چیز در آن باشد
     صف نیست. */
  const g = { priority: 'متوسط', category: 'موتور', key: 'engine-soft',
              title: 'یک ایرادِ محتوایی', detail: 'د', instruction: 'ک', owner: 'موتور' };
  sh.appendRow(reportRow_({ reportId: 'TASK-2', at: '2026-09-20 06:40' }, g, 0));
  const unq2 = quiet();
  for (let i = 2; i <= need + 2; i++) {
    touchExisting_(sh, { row: 3, vals: sh.getRange(3, 1, 1, REPORT_HEADERS.length).getValues()[0] },
                   { reportId: 'TASK-2', at: '2026-09-2' + i + ' 06:40' }, g);
  }
  unq2();
  const soft = sh.getRange(3, 1, 1, REPORT_HEADERS.length).getValues()[0];
  ok('۱۶٫۵ ولی یافتهٔ «متوسط» هرچقدر تکرار شود ارتقا نمی‌گیرد',
     String(soft[RC.OWNER - 1]) !== ROWNER_CODE,
     soft[RC.OWNER - 1] + ' / ' + soft[RC.STATUS - 1]);
}


/* ══ ۸.۰۷) قالبِ پیشوندی خاموش است — گوشِ صاحبِ برنامه حکم داد ══
 *
 * او نمونهٔ ۶دقیقه‌ایِ قسمتِ ۵۳ را گوش داد: «داره دستور لحن رو در چند جا
 * میخونن». پس فرضِ ۷٫۸۹ — که دونقطه مرزی است که مدل رویش آموزش دیده — غلط
 * بود، و ۵٫۵۹ از روزِ اول درست گفته بود: هر شکلی که دستور و متن را در یک
 * رشته بگذارد، مدل را به حدس وامی‌دارد.
 *
 * این بند **رفتار** را می‌سنجد نه شکلِ بسته را: از همان دری که تولید
 * می‌رود (`ttsChunkTry_`) و با دیدنِ بدنهٔ واقعیِ درخواست. */
console.log('\n=== ۸.۰۷) پیشوندِ دستور، پیش‌فرض خاموش ===');
{
  const TX = 'یک جملهٔ آزمایشی برای گفتار.';
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';   // بندهای قبلی پاکش می‌کنند
  const liveM = ttsModel_();
  const bodies = [];
  const realFetch = global.geminiFetch_;
  global.geminiFetch_ = function (url, body) {
    bodies.push(body);
    return { candidates: [{ content: { parts: [{ inlineData: { data: 'AAAA' } }] } }] };
  };
  /* مدل فیلد را رد کرده ⇒ پیش از ۸.۰۷ مستقیم سراغِ پیشوند می‌رفت. */
  ttsCueBadAdd_(liveM, nowStr_());
  const keepPre = CFG.TTS_CUE_PREFIX, keepVer = CFG.TTS_CUE_VERIFY;
  CFG.TTS_CUE_VERIFY = false;             // نگهبانِ شنیداری موضوعِ این بند نیست

  CFG.TTS_CUE_PREFIX = false;
  bodies.length = 0;
  ttsChunkTry_(TX, 'گرم', 'Kore', true);
  const sent = bodies.map(b => {
    try { return String(b.contents[0].parts[0].text); } catch (e) { return String(b.input || ''); }
  });
  ok('۸.۰۷.۱ با پیشوندِ خاموش، هیچ درخواستی دستور را درونِ متن نمی‌برد',
     sent.length > 0 && sent.every(t => t === TX),
     JSON.stringify(sent.map(t => t.slice(0, 40))));

  /* و مهرِ «دستور انداخته شد» می‌خورَد — وگرنه `vbrSoulTag_` همان فایل را
     «روح» برچسب می‌زند، که دقیقاً دروغی است که ۷٫۷۹ برایش نوشته شد. */
  ok('۸.۰۷.۲ و مهرِ «دستور انداخته شد» می‌خورَد، پس برچسب «روح» نمی‌شود',
     !!global.__PROPS[PK.TTS_CUE_DROP_AT],
     String(global.__PROPS[PK.TTS_CUE_DROP_AT] || 'نخورد'));

  /* و روشن‌کردنِ کلید واقعاً راه را باز می‌کند — وگرنه «گزینه» حرف است. */
  CFG.TTS_CUE_PREFIX = true;
  bodies.length = 0;
  ttsChunkTry_(TX, 'گرم', 'Kore', true);
  const sent2 = bodies.map(b => {
    try { return String(b.contents[0].parts[0].text); } catch (e) { return ''; }
  });
  ok('۸.۰۷.۳ و با کلیدِ روشن، پیشوند واقعاً فرستاده می‌شود — پس گزینه است نه کدِ مرده',
     sent2.some(t => t.length > TX.length && t.slice(-TX.length) === TX),
     JSON.stringify(sent2.map(t => t.slice(0, 40))));

  CFG.TTS_CUE_PREFIX = keepPre; CFG.TTS_CUE_VERIFY = keepVer;
  global.geminiFetch_ = realFetch;
}

/* ══ ۸.۰۷-ب) نشانه‌های لو‌رفتن از خودِ دستور می‌آیند، نه فقط از فهرستِ دستی ══
 * `CUE_MARKERS` هفت عبارتِ دست‌نویس است، و از ۷٫۳۴ متنِ دستور برای هر گوینده
 * **اندازه‌گیری** می‌شود — پس واژه‌هایش از پیش معلوم نیست و هیچ فهرستِ ثابتی
 * پوششش نمی‌دهد. */
console.log('\n=== ۸.۰۷-ب) نشانهٔ لو‌رفتن از متنِ دستور مشتق می‌شود ===');
{
  const realFetch2 = global.geminiFetch_;
  const CUE = 'خویشتنْدارانه و بسیار آهسته بخوان';   // هیچ واژه‌اش در CUE_MARKERS نیست
  const BODY = 'متنِ قسمت دربارهٔ چیزِ دیگری است.';
  global.geminiFetch_ = function () {
    return { candidates: [{ content: { parts: [
      { text: 'خویشتنْدارانه و بسیار آهسته بخوان ' + BODY } ] } }] };
  };
  const v = ttsCueLeaked_('AAAAAAAA', CUE, BODY);
  ok('۸.۰۷-ب.۱ دستوری که هیچ واژه‌اش در فهرستِ دستی نیست، باز هم گرفته می‌شود',
     v.leaked === true, JSON.stringify(v).slice(0, 120));

  /* و برعکسش: واژه‌ای که در **خودِ متنِ گفتار** هم هست نشانه نمی‌شود، وگرنه
     قسمتی که واقعاً دربارهٔ همان موضوع حرف می‌زند هر بار دوباره ساخته می‌شد. */
  global.geminiFetch_ = function () {
    return { candidates: [{ content: { parts: [{ text: 'خویشتنْدارانه زندگی کرد.' }] } }] };
  };
  const v2 = ttsCueLeaked_('AAAAAAAA', CUE, 'او خویشتنْدارانه زندگی کرد.');
  /* ۸.۰۷-ب.۲ — این ادعا **دو قفلِ مستقل** دارد و هر کدام تنها هم کافی است:
     کوتاه‌کنندهٔ درونِ حلقهٔ مشتق‌سازی، و شرطِ `body.indexOf(mk) === -1` در
     حلقهٔ تطبیق. برداشتنِ هر یک به‌تنهایی سنجه را سرخ **نمی‌کند** — آزمودم؛
     با برداشتنِ هر دو سرخ می‌شود. این‌جا آن را عیب نمی‌دانم (رفتار درست دو
     بار محافظت شده)، ولی ثبتش می‌کنم تا کسی گمان نکند این سنجه یکی از آن
     دو را تنهایی تضمین می‌کند — همان ادعای بیش‌ازحدی که ۷٫۴۱ ثبتش کرده. */
  ok('۸.۰۷-ب.۲ ولی واژه‌ای که در متنِ گفتار هم هست، نشانه شمرده نمی‌شود',
     v2.leaked === false, JSON.stringify(v2).slice(0, 120));

  /* ══ ۸.۰۷-ب.۳ — اشتراکِ **تصادفیِ یک واژه** لو‌رفتن نیست ══
     نگارشِ اولِ مشتق‌سازی هر واژهٔ ۵حرفی را نشانه گرفت، و
     `run_reports_test.js` همان لحظه سرخ شد: متنِ شنیده‌شدهٔ سالم با دستور یک
     واژهٔ معمولی مشترک داشت و «لو رفته» اعلام شد. پیامدش عکسِ هدفِ این نسخه
     بود — هر تکه بی‌دستور از نو ساخته می‌شد، یعنی **هر قسمت صاف**. پس واحدِ
     شاهد سه واژهٔ پیاپی است: جمله‌ای که گفته شده سه واژهٔ پیاپی دارد،
     اشتراکِ تصادفی ندارد. */
  global.geminiFetch_ = function () {
    return { candidates: [{ content: { parts: [
      { text: 'او آهسته از پنجره بیرون را نگاه کرد.' } ] } }] };
  };
  const v3 = ttsCueLeaked_('AAAAAAAA', 'خویشتنْدارانه و بسیار آهسته بخوان',
                           'او از پنجره بیرون را نگاه کرد.');
  ok('۸.۰۷-ب.۳ اشتراکِ تصادفیِ یک واژه («آهسته») لو‌رفتن شمرده نمی‌شود',
     v3.leaked === false, JSON.stringify(v3).slice(0, 140));
  global.geminiFetch_ = realFetch2;
}


/* ══ ۸.۰۷-پ) «مدل نشنید» تأییدِ خاموش نیست — ولی فقط آن‌جا که خطر هست ══
 * `ttsCueLeaked_` وقتی مدلِ شنونده در دسترس نباشد `failed` می‌دهد، و تا ۸.۰۷
 * همان یعنی «لو نرفته» ⇒ تکهٔ وارسی‌نشده منتشر می‌شد. همان شکلِ ۷٫۶۸ («مدل
 * نشنید» را تأیید خواندن)، یک بخش آن‌طرف‌تر.
 * و مرزش هزینه را صفر می‌کند: دستورِ درونِ **فیلد** ساختاراً خوانده نمی‌شود،
 * پس بستنِ آن‌جا یعنی روزی که مدلِ متن قطع است هر قسمت صاف شود — هزینه بی
 * خطرِ متناظر. فقط قالبِ **پیشوندی** ریسک دارد. */
console.log('\n=== ۸.۰۷-پ) نشنیدن، برای قالبِ پیشوندی تأیید نیست ===');
{
  const TX = 'یک جملهٔ آزمایشی برای گفتار.';
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  const liveM2 = ttsModel_();
  const realLeak2 = global.ttsCueLeaked_;
  const keepPre2 = CFG.TTS_CUE_PREFIX, keepVer2 = CFG.TTS_CUE_VERIFY;
  CFG.TTS_CUE_VERIFY = true;
  global.ttsCueLeaked_ = function () { return { leaked: false, heard: '', failed: true }; };

  const seen = [];
  const realFetch3 = global.geminiFetch_;
  global.geminiFetch_ = function (url, body) {
    let t = '';
    try { t = String(body.contents[0].parts[0].text); } catch (e) { t = String(body.input || ''); }
    const hasField = !!(body.systemInstruction || body.instructions);
    seen.push(hasField ? 'field' : (t.length > TX.length ? 'prompted' : 'nocue'));
    return { candidates: [{ content: { parts: [{ inlineData: { data: 'QUJD' } }] } }] };
  };

  /* الف) دستور از راهِ **پیشوند** و وارسی نشد ⇒ بی‌دستور از نو */
  ttsCueBadAdd_(liveM2, nowStr_());        // فیلد رد شده ⇒ پیشوند
  CFG.TTS_CUE_PREFIX = true;
  seen.length = 0;
  props_().deleteProperty(PK.TTS_CUE_DROP_AT);
  ttsGuarded_(TX, 'گرم', 'Kore', true);
  ok('۸.۰۷-پ.۱ پیشوند + وارسیِ ناموفق ⇒ تکه بی‌دستور از نو ساخته می‌شود',
     seen.indexOf('prompted') !== -1 && seen[seen.length - 1] === 'nocue',
     seen.join('→'));
  ok('۸.۰۷-پ.۲ و مهر می‌خورَد، پس برچسب «روح» نمی‌شود',
     !!global.__PROPS[PK.TTS_CUE_DROP_AT],
     String(global.__PROPS[PK.TTS_CUE_DROP_AT] || 'نخورد'));

  /* ب) دستور از راهِ **فیلد** و وارسی نشد ⇒ تکه می‌مانَد. بستنِ این‌جا یعنی
     یک روزِ بی‌مدلِ متن = همهٔ قسمت‌ها صاف، بی هیچ خطرِ متناظر. */
  global.__PROPS[PK.TTS_CUE_BAD] = '{}';
  delete global.__PROPS[PK.TTS_CUE_OFF];
  delete global.__PROPS[PK.TTS_CUE_OFF_AT];
  seen.length = 0;
  props_().deleteProperty(PK.TTS_CUE_DROP_AT);
  ttsGuarded_(TX, 'گرم', 'Kore', true);
  ok('۸.۰۷-پ.۳ ولی فیلد + وارسیِ ناموفق ⇒ تکه می‌مانَد و بی‌دلیل صاف نمی‌شود',
     seen.indexOf('field') !== -1 && seen.indexOf('nocue') === -1,
     seen.join('→') + ' — دستورِ درونِ فیلد ساختاراً خوانده نمی‌شود (۵٫۵۹)');

  global.ttsCueLeaked_ = realLeak2; global.geminiFetch_ = realFetch3;
  CFG.TTS_CUE_PREFIX = keepPre2; CFG.TTS_CUE_VERIFY = keepVer2;
  props_().deleteProperty(PK.TTS_CUE_DROP_AT);
}

process.exit(summary('شش درخواستِ نسخهٔ ۵٫۹') ? 1 : 0);
