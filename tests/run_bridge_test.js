/* run_bridge_test.js — ارجاعِ میان‌مجموعه‌ای (بخشِ ۳۱).
 *
 * خواستهٔ صاحبِ برنامه، عیناً:
 *
 *   «می‌خوام برای هر مجموعه انتخاب کنم که مجموعه‌های قبلی که تولیدات و جزوه
 *    براشون انجام شده رو از لیستی انتخاب کنم … مجموعهٔ فعلی باید به‌عنوانِ
 *    ستون‌فقرات باقی بمونه و اصلاً نباید متنش با اون متن‌ها قاطی بشه … ولی
 *    اگر مجموعه‌هایی انتخاب شده بودن، باید در جاهایی که لازمه بهشون ارجاع
 *    داده بشه و رابطشون رو بگه … این نباشه که برای درسِ یکِ مجموعهٔ
 *    انتخاب‌شده لزوماً به درسِ یکِ مجموعهٔ مرجع هدایت بشه، بلکه باید به همهٔ
 *    محتوا مراجعه بشه.»
 *
 * سه چیز از این خواسته سنجیدنی است و هر سه اینجا سنجیده می‌شود: کلِ کتاب
 * دیده می‌شود نه درسِ متناظر · مرزِ ستون‌فقرات در کد است نه در خواهش ·
 * ارجاع ثبت می‌شود و به جزوه و مرور هم می‌رسد.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
/* پوشه را می‌خواند، نه فهرستِ دستی: نگهبانِ `run_wiring_test.js` ۴٫۲ دقیقاً
   برای فهرست‌های دستیِ کهنه ساخته شده، و شکلی که آن نگهبان به‌رسمیت
   می‌شناسد همین `readdirSync('src')` است. */
const DIR = 'src/';
const FILES = fs.readdirSync('src').filter(f => /^\d\d_.*\.gs$/.test(f)).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

// ── فیکسچر: دو مجموعه، هر کدام پوشه و جزوه و قسمت‌های ساخته‌شده ──────────
const hub = new Spread('هاب');
global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
global.getHub_ = () => hub;

function addSeries(key, name, folderName) {
  const f = global.__ROOT_FOLDER.createFolder(folderName);
  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = key; row[SC.NAME - 1] = name;
  row[SC.FOLDER - 1] = f.getId(); row[SC.LEVEL - 1] = 'مقدماتی';
  row[SC.CAT - 1] = 'علمی و آموزشی';
  reg.getRange(reg.getLastRow() + 1, 1, 1, SERIES_HEADERS.length).setValues([row]);
  return f;
}
function addParts(name, n) {
  const sp = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
  for (let i = 0; i < n; i++) {
    const r = new Array(SPECIAL_HEADERS.length).fill('');
    r[0] = i + 1; r[XC.SERIES - 1] = name; r[XC.TITLE - 1] = 'درسِ ' + (i + 1);
    sp.getRange(sp.getLastRow() + 1, 1, 1, SPECIAL_HEADERS.length).setValues([r]);
  }
}
function putBook(folder, book) {
  const it = folder.getFilesByName(handoutJsonName_());
  if (it.hasNext()) it.next().setContent(JSON.stringify(book));
  else folder.createFile(Utilities.newBlob(JSON.stringify(book), 'application/json',
                                           handoutJsonName_()));
}

const fEp = addSeries('kEp', 'معرفت‌شناسی', '۰۱ — معرفت‌شناسی');
const fGod = addSeries('kGod', 'خداشناسی', '۰۲ — خداشناسی');
addSeries('kNew', 'مجموعهٔ بی‌درس', '۰۳ — بی‌درس');
addParts('معرفت‌شناسی', 9);
addParts('خداشناسی', 3);

/* جزوهٔ معرفت‌شناسی: فصلِ آخرش (ملاکِ صدق) همان چیزی است که با خداشناسی نسبت
   دارد — نه فصلِ اولش. سنجهٔ «کلِ کتاب دیده می‌شود» روی همین بنا شده. */
putBook(fEp, { seriesKey: 'kEp', seriesName: 'معرفت‌شناسی', refs: [], episodes: [], chapters: [
  { id: 'c1', title: 'مبانی', addedIn: '1', sections: [
    { id: 's1', title: 'تعریفِ معرفت', body: 'الف. '.repeat(20),
      takeaway: 'معرفت باورِ صادقِ موجه است.', addedIn: '1' }] },
  { id: 'c2', title: 'انواعِ علم', addedIn: '4', sections: [
    { id: 's2', title: 'حضوری و حصولی', body: 'ب. '.repeat(20),
      takeaway: 'علمِ حضوری بی‌واسطه است.', addedIn: '4' }] },
  { id: 'c3', title: 'ملاکِ صدق', addedIn: '9', sections: [
    { id: 's3', title: 'چگونه صدقِ یک گزاره را بسنجیم', body: 'ج. '.repeat(20),
      takeaway: 'صدق با تطابق و انسجام سنجیده می‌شود.', addedIn: '9' }] }
] });

console.log('=== ۱) انتخابِ آدم: ستون، و چیزی که پذیرفته نمی‌شود ===');
{
  const reg = readSeriesReg_(hub);
  ok('۱.۱ ستونِ مرجع جدا از «مجموعه‌های مرتبط» است',
     SC.XREF !== SC.RELATED && SERIES_HEADERS.length >= SC.XREF,
     'XREF=' + SC.XREF + ' RELATED=' + SC.RELATED);

  let un = quiet();
  const r = bridgeSave_(hub, 'kGod', ['kEp']);
  un();
  ok('۱.۲ انتخاب ثبت می‌شود', r.ok === true && r.n === 1, JSON.stringify(r));
  ok('۱.۳ و از رجیستری خوانده می‌شود',
     bridgeKeys_(readSeriesReg_(hub).byKey['kGod']).join(',') === 'kEp');

  /* مجموعه هرگز مرجعِ خودش نیست: کتابِ خودش دو بار در پرامپت می‌آمد و مدل
     به «قبلاً گفتیم» ارجاع می‌داد که در همین قسمت گفته می‌شود. */
  un = quiet();
  const r2 = bridgeSave_(hub, 'kGod', ['kGod', 'kEp', 'kEp', 'نامعلوم']);
  un();
  ok('۱.۴ خودش، تکراری و شناسهٔ ناموجود کنار می‌روند',
     r2.keys.join(',') === 'kEp', JSON.stringify(r2.keys));

  ok('۱.۵ و سقفِ شمارِ مرجع رعایت می‌شود',
     bridgeKeys_({ vals: (function () {
       const v = new Array(SERIES_HEADERS.length).fill('');
       v[SC.XREF - 1] = 'a،b،c،d،e،f'; return v;
     })() }).length === Number(CFG.BRIDGE_MAX_SERIES));
}

console.log('\n=== ۲) فهرستِ انتخاب: فقط مجموعه‌ای که درس دارد ===');
{
  const cands = bridgeCandidates_(hub, readSeriesReg_(hub));
  const keys = cands.map(c => c.key);
  ok('۲.۱ مجموعه‌های باقسمت می‌آیند',
     keys.indexOf('kEp') !== -1 && keys.indexOf('kGod') !== -1, keys.join(','));
  /* تیکی که هیچ اثری نداشته باشد بدتر از نبودنِ تیک است: مجموعهٔ بی‌درس
     جزوه‌ای ندارد که ارجاعی از آن در بیاید. */
  ok('۲.۲ ولی مجموعهٔ بی‌درس نمی‌آید', keys.indexOf('kNew') === -1);
  ok('۲.۳ و پرقسمت‌ترین اول است', cands[0].key === 'kEp', cands[0].key);
}

console.log('\n=== ۳) کلِ کتاب دیده می‌شود، نه درسِ متناظر ===');
{
  /* ══ صریح‌ترین بندِ خواسته ══
   * «این نباشه که برای درسِ یکِ مجموعهٔ انتخاب‌شده لزوماً به درسِ یکِ مجموعهٔ
   *  مرجع هدایت بشه، بلکه باید به همهٔ محتوا مراجعه بشه.»
   * پس همهٔ فصل‌ها باید در متنِ پرامپت باشند — از جمله فصلِ آخر، که در این
   * فیکسچر همان فصلی است که واقعاً نسبت دارد. */
  const reg = readSeriesReg_(hub);
  const corpus = bridgeCorpus_(reg, ['kEp']);
  ok('۳.۱ کتاب خوانده می‌شود', corpus.length === 1 && corpus[0].key === 'kEp');
  ok('۳.۲ و **هر سه فصل** در آن است، نه فقط اولی',
     corpus[0].text.indexOf('مبانی') !== -1 &&
     corpus[0].text.indexOf('انواعِ علم') !== -1 &&
     corpus[0].text.indexOf('ملاکِ صدق') !== -1);
  ok('۳.۳ و نکتهٔ کلیدیِ بخش‌ها هم می‌آید، نه فقط عنوان',
     corpus[0].text.indexOf('صدق با تطابق و انسجام سنجیده می‌شود') !== -1);
  /* مجموعه‌ای که جزوه ندارد اصلاً وارد پرامپت نمی‌شود — وگرنه مدل یک نامِ
     خالی می‌دید و دربارهٔ چیزی که ندیده حرف می‌زد. */
  ok('۳.۴ مجموعهٔ بی‌جزوه وارد نمی‌شود',
     bridgeCorpus_(reg, ['kGod']).length === 0);
}

console.log('\n=== ۴) پرامپتِ کشف: نسبت لزوماً هم‌موضوعی نیست ===');
{
  const reg = readSeriesReg_(hub);
  const corpus = bridgeCorpus_(reg, ['kEp']);
  const p = bridgePrompt_({ seriesName: 'خداشناسی', partName: 'اثباتِ واجب',
                            digest: 'گزاره‌هایی دربارهٔ وجودِ خدا.' }, corpus);

  /* ══ مهم‌ترین بندِ کلِ بخش ══
   * «این مثال رو زدم که ارتباط رو لزوماً بر اساسِ این پیدا نکنی که هر دو
   *  راجع به یه چیز صحبت کردن.» مثالِ خودش (معرفت‌شناسی مقدم بر خداشناسی)
   *  در پرامپت هست، چون یک مثالِ واقعی از ده سطر توضیح بیشتر کار می‌کند. */
  ok('۴.۱ صریح می‌گوید نسبت لزوماً هم‌موضوعی نیست',
     p.indexOf('نسبت لزوماً هم‌موضوعی نیست') !== -1);
  ok('۴.۲ و مثالِ خودِ صاحبِ برنامه در آن است',
     p.indexOf('معرفت‌شناسی') !== -1 && p.indexOf('خداشناسی') !== -1 &&
     p.indexOf('ابزارِ آن سنجش') !== -1);
  ok('۴.۳ و می‌گوید «چرا آن ترتیب انتخاب شده» را بپرس',
     p.indexOf('چرا آن ترتیب انتخاب شده') !== -1);
  ok('۴.۴ به کلِ کتاب نگاه کن، نه درسِ متناظر',
     p.indexOf('به کلِ آن کتاب نگاه کن، نه به درسِ متناظر') !== -1);
  ok('۴.۵ مرزِ ستون‌فقرات در پرامپت هست',
     p.indexOf('ستون‌فقرات') !== -1 &&
     p.indexOf('پادکستِ «خداشناسی» را گوش می‌دهد') !== -1);
  ok('۴.۶ و «هیچ نسبتی» جوابِ مجازی است، نه شکست',
     p.indexOf('این جوابِ درستی است، نه شکست') !== -1);
  /* «هم‌موضوع» ضعیف‌ترین نسبت است و آخرِ فهرست — تا مدل اول سراغِ نسبت‌های
     ساختاری برود. */
  const kinds = Object.keys(BRIDGE_KINDS);
  ok('۴.۷ «هم‌موضوع» آخرین نسبتِ فهرست است',
     kinds[kinds.length - 1] === 'هم‌موضوع', kinds.join('، '));
}

console.log('\n=== ۵) سدها در کد، نه در پرامپت ===');
{
  const names = { kEp: 'معرفت‌شناسی' };
  const good = { seriesKey: 'kEp', kind: 'ابزارِ سنجش', claim: 'ملاکِ صدق را داد.',
                 relation: 'گزاره‌های اینجا با آن سنجیده می‌شوند.',
                 atHeading: 'اثباتِ واجب', strength: 'قوی',
                 say: 'ببین، آنجا در معرفت‌شناسی گفتیم صدقِ یک گزاره را چطور می‌سنجیم؛ ' +
                      'همان ملاک دقیقاً همین‌جا به کار می‌آید.' };
  const t = (x) => bridgeTrim_([Object.assign({}, good, x)], names, { headings: [] });

  ok('۵.۱ ارجاعِ سالم می‌مانَد', t({}).length === 1);
  /* توهّمِ شناسه در مدل‌ها عادی است؛ ارجاع به مجموعه‌ای که اصلاً انتخاب نشده
     یعنی حرف‌زدن از کتابی که مدل ندیده. */
  ok('۵.۲ شناسهٔ ساختگی حذف می‌شود', t({ seriesKey: 'kX' }).length === 0);
  ok('۵.۳ نسبتِ اختراعی هم', t({ kind: 'یک‌جور دیگر' }).length === 0);
  /* پرامپت گفته بود «ضعیف را نده». سقفی که فقط در پرامپت گفته شده، سقف نیست. */
  ok('۵.۴ و ارجاعِ «ضعیف» — که خودِ پرامپت گفته بود نده', t({ strength: 'ضعیف' }).length === 0);
  ok('۵.۵ اشارهٔ بی‌محتوا هم', t({ say: 'خب.' }).length === 0);

  /* ══ ۶٫۸۳ — مرزِ «لوث شدن» جابه‌جا شد ══
     تا ۶٫۸۲ کلیدِ یکتایی خودِ مجموعه بود: «یک مجموعه، یک ارجاع در هر قسمت».
     با یک مجموعهٔ مرجعِ تیک‌خورده — که حالتِ واقعی است — این یعنی سقفِ عملیِ
     هر درس **یک**، هرچه هم کشف شده باشد. دادهٔ واقعی همین بود: شش درسِ
     «Audi» و شش ارجاع، یک‌به‌یک. یعنی هر دو نسخه‌ای که ورودیِ کشف را بهتر
     کردند (۶٫۸۱، ۶٫۸۲) در خروجی هیچ اثری نداشتند.
     خواستهٔ صاحبِ برنامه صریح است: «در هر قسمت از درسِ اصلی باید به همهٔ
     متنِ مرجع مراجعه کند» — جمع، به‌ازای هر بخش. پس مرز شد «مجموعه + بخش». */
  const two = bridgeTrim_([good, Object.assign({}, good, { atHeading: 'ب' })],
                          names, { headings: [] });
  ok('۵.۶ دو بخشِ متفاوت، دو نسبتِ متفاوت — هر دو می‌مانند', two.length === 2,
     JSON.stringify(two.map((x) => x.atHeading)));
  const same = bridgeTrim_([good, Object.assign({}, good, { claim: 'چیزِ دیگری' })],
                           names, { headings: [] });
  ok('۵.۶-ب ولی دو ارجاع به یک کتاب در **یک** بخش، هنوز لوث است',
     same.length === 1);
  /* و «بخشِ نامعلوم» نباید درِ پشتی باشد: ارجاعِ بی‌جا جای نشستن ندارد. */
  const noAt = bridgeTrim_([Object.assign({}, good, { atHeading: '' }),
                            Object.assign({}, good, { atHeading: '' })],
                           names, { headings: [] });
  ok('۵.۶-پ و دو ارجاعِ بی‌عنوانِ بخش هم یکی می‌شوند', noAt.length === 1);

  const many = [];
  for (let i = 0; i < 9; i++) many.push(Object.assign({}, good, { atHeading: 'بخش ' + i }));
  ok('۵.۷ و سقفِ شمارِ ارجاع در کد اعمال می‌شود',
     bridgeTrim_(many, names, { headings: [] }).length === Number(CFG.BRIDGE_MAX_LINKS),
     String(bridgeTrim_(many, names, { headings: [] }).length));
}

console.log('\n=== ۶) بلوکِ نویسنده: مرز دوباره گفته می‌شود ===');
{
  const plan = { links: [{ seriesKey: 'kEp', seriesName: 'معرفت‌شناسی', kind: 'ابزارِ سنجش',
                           claim: 'ملاکِ صدق', chapter: 'ملاکِ صدق',
                           relation: 'اینجا لازم می‌شود', atHeading: 'اثباتِ واجب',
                           say: 'ب'.repeat(60), strength: 'قوی' }] };
  const b = bridgeBlock_(plan, 'خداشناسی');
  ok('۶.۱ بلوک ساخته می‌شود', b.indexOf('ارجاع به مجموعه‌های پیشین') !== -1);
  ok('۶.۲ و محلِ دقیقِ ارجاع را می‌گوید', b.indexOf('در بخشِ «اثباتِ واجب»') !== -1);
  /* ══ چرا مرز دو بار گفته می‌شود ══
   * یک بار به مدلی که *پیشنهاد* می‌دهد، یک بار به مدلی که *می‌نویسد*. کسی
   * که می‌نویسد پرامپتِ قبلی را ندیده — و همان کسی است که می‌تواند متن را
   * قاطی کند. */
  ok('۶.۳ مرزِ ستون‌فقرات برای نویسنده هم تکرار می‌شود',
     b.indexOf('ستون‌فقرات است') !== -1 &&
     b.indexOf('بحثِ آن مجموعه را اینجا باز نکن') !== -1);
  ok('۶.۴ و نامِ مجموعهٔ مرجع باید گفته شود',
     b.indexOf('ارجاعِ بی‌نام، ارجاع نیست') !== -1);
  ok('۶.۵ بی ارجاع، بلوکی هم نیست', bridgeBlock_({ links: [] }, 'خ') === '');
}

console.log('\n=== ۷) سرتاسری: از انتخاب تا سیاهه ===');
{
  const reg = readSeriesReg_(hub);
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ links: [
      { seriesKey: 'kEp', kind: 'ابزارِ سنجش', claim: 'ملاکِ صدق آنجا داده شد.',
        chapter: 'ملاکِ صدق', relation: 'گزاره‌های این درس با آن سنجیده می‌شوند.',
        atHeading: 'اثباتِ واجب', strength: 'قوی',
        say: 'ببین، در معرفت‌شناسی گفتیم صدقِ یک گزاره را چطور می‌سنجیم؛ ' +
             'همان ملاک دقیقاً همین‌جاست.' },
      { seriesKey: 'ساختگی', kind: 'تنش', claim: 'x', relation: 'y',
        atHeading: 'z', say: 'ق'.repeat(60) }
    ] }) }] } }] } });
  const un = quiet();
  const out = bridgeFor_(hub, reg, reg.byKey['kGod'],
                         { seriesName: 'خداشناسی', partName: 'اثباتِ واجب',
                           digest: 'متنِ خام', headings: [] });
  un();
  ok('۷.۱ ارجاع ساخته شد و شناسهٔ ساختگی افتاد',
     out.links.length === 1 && out.links[0].seriesName === 'معرفت‌شناسی',
     JSON.stringify(out.links.map(x => x.seriesKey)));
  ok('۷.۲ و بلوکِ پرامپت آماده است', out.block.indexOf('معرفت‌شناسی') !== -1);

  /* «حتماً باید این ارجاعات در جایی ثبتِ دقیق و کامل بشه.» */
  bridgeLog_(hub, 42, 'خداشناسی', out.links);
  const back = bridgeOfSeries_(hub, 'خداشناسی', 10);
  ok('۷.۳ در سیاهه ثبت می‌شود و برمی‌گردد',
     back.length === 1 && back[0].refSeries === 'معرفت‌شناسی' &&
     back[0].kind === 'ابزارِ سنجش', JSON.stringify(back));
  ok('۷.۴ و همهٔ اجزای ارجاع ثبت شده‌اند',
     back[0].claim.indexOf('ملاکِ صدق') !== -1 &&
     back[0].relation.indexOf('سنجیده') !== -1 && back[0].at === 'اثباتِ واجب');

  /* همان نسبت در چند قسمت: یک بار بس است — وگرنه جزوه و مرور همان جمله را
     هفده بار می‌گرفتند. */
  bridgeLog_(hub, 43, 'خداشناسی', out.links);
  ok('۷.۵ نسبتِ تکراری در فهرستِ جزوه/مرور یک بار می‌آید',
     bridgeOfSeries_(hub, 'خداشناسی', 10).length === 1);

  /* مجموعهٔ بی‌مرجع اصلاً فراخوانِ مدل نمی‌کند: هزینه‌ای که بی‌جهت خرج شود،
     همان چیزی است که ۶٫۱۳ دربارهٔ سهمیه یاد داد. */
  let called = 0;
  global.__STUB = () => { called++; return { code: 500, json: {} }; };
  const un2 = quiet();
  bridgeFor_(hub, reg, reg.byKey['kEp'],
             { seriesName: 'معرفت‌شناسی', partName: 'x', digest: 'y', headings: [] });
  un2();
  ok('۷.۶ مجموعهٔ بی‌مرجع هیچ فراخوانی نمی‌کند', called === 0, String(called));
}

console.log('\n=== ۸) ارجاع‌ها جزوِ محتوا شده‌اند: جزوه، مرور، و سطرِ روزانه ===');
{
  /* «اگر آن مجموعه ارجاعاتی داشته برای تولیدِ پادکست‌هاش، قاعدتاً باید این
     در خودِ مرور و حتی جزوه همگی مورد استفاده و ثبت قرار بگیره و بحث بشه،
     چون در واقع جزوِ خودِ محتوا شده.» */
  const blk = bridgeRecapBlock_(bridgeOfSeries_(hub, 'خداشناسی', 10));
  ok('۸.۱ متنِ ارجاع‌ها برای پرامپت ساخته می‌شود',
     blk.indexOf('معرفت‌شناسی') !== -1 && blk.indexOf('ابزارِ سنجش') !== -1);
  ok('۸.۲ و می‌گوید نباید حذف شوند', blk.indexOf('نه اینکه') !== -1);

  const s26 = fs.readFileSync('src/26_Handout.gs', 'utf8');
  const s30 = fs.readFileSync('src/30_Recap.gs', 'utf8');
  ok('۸.۳ جزوه از همان سیاهه می‌خواند', s26.indexOf('bridgeOfSeries_') !== -1);
  ok('۸.۴ مرور هم', s30.indexOf('bridgeOfSeries_') !== -1);

  /* قاعدهٔ ۵٫۹۰: چیزی که فقط در یک تب بماند، از نظرِ صاحبِ برنامه وجود ندارد. */
  const st = bridgeStatus_(hub);
  ok('۸.۵ سطرِ روزانه ساخته می‌شود و عدد دارد',
     st.line.indexOf('ارجاعِ میان‌مجموعه‌ای') === 0 && st.n === 2,
     st.line);
  const s08 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۸.۶ و در ایمیلِ روزانه و _STATUS.json می‌نشیند',
     s08.indexOf('bridgeStatus_(hub)') !== -1 &&
     s08.indexOf('bridge: (function') !== -1);
}

console.log('\n=== ۹) نویسندهٔ درس بلوک را می‌گیرد، و تخته دکمه دارد ===');
{
  const s14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۹.۱ پرامپتِ درس‌نامه بلوکِ ارجاع را می‌گیرد',
     s14.indexOf('if (ctx.bridgeBlock)') !== -1);
  ok('۹.۲ و پیش از «ساختار خروجی» می‌آید — نه بعد از بستنِ ساختار',
     s14.indexOf('if (ctx.bridgeBlock)') < s14.indexOf("L.push('══ ساختار خروجی ══')"));
  ok('۹.۳ فراخوانِ رو به جلو در try/catch است (بارگذارِ جزئی نباید تولید را بخواباند)',
     /try \{[\s\S]{0,900}bridgeFor_\(/.test(s14));
  /* و آنچه در پروندهٔ قسمت می‌نشیند، ارجاعِ **سنجیده‌شده** است نه نقشه —
     تفصیلش در بلوکِ ۱۱. */
  ok('۹.۴ و ارجاع‌های سنجیده‌شده در پروندهٔ قسمت ثبت می‌شوند',
     s14.indexOf('bridges: (ctx.__bridgesUsed || [])') !== -1 &&
     s14.indexOf('bridgeLog_(hub, epNum, seriesName') !== -1);

  const s15 = fs.readFileSync('src/15_Board.gs', 'utf8');
  ok('۹.۵ تخته ستونِ انتخاب دارد', s15.indexOf('bridgeCell_') !== -1 &&
     s15.indexOf('مجموعه‌های مرجع') !== -1);
  ok('۹.۶ و دکمه‌اش به تابعِ سمتِ سرور وصل است',
     s15.indexOf('.uiBridgeSave(k,v)') !== -1 && typeof uiBridgeSave === 'function');

  /* فهرست یک بار برای همهٔ ردیف‌ها خوانده می‌شود، نه یکی به‌ازای هر مجموعه —
     همان قاعده‌ای که ۵٫۸۷ و ۶٫۲۲ و ۶٫۴۰ گذاشتند. */
  ok('۹.۷ فهرستِ مرجع‌ها یک بار خوانده می‌شود',
     (s15.match(/bridgeCandidates_\(/g) || []).length === 1);

  const un = quiet();
  const rSave = uiBridgeSave('kGod', ['kEp']);
  un();
  ok('۹.۸ دکمه پاسخِ {ok,message} می‌دهد',
     rSave.ok === true && rSave.message.indexOf('ثبت شد') !== -1, rSave.message);
  const un2 = quiet();
  const rNone = uiBridgeSave('kGod', []);
  un2();
  ok('۹.۹ و برداشتنِ همهٔ تیک‌ها هم پیامِ روشن دارد',
     rNone.ok === true && rNone.message.indexOf('بی‌ارجاع') !== -1, rNone.message);
}

console.log('\n=== ۱۰) خاموشی و بی‌ارجاع بودن، خرابی نیست ===');
{
  const reg = readSeriesReg_(hub);
  const keep = CFG.BRIDGE_ENABLED;
  CFG.BRIDGE_ENABLED = false;
  const off = bridgeFor_(hub, reg, reg.byKey['kGod'],
                         { seriesName: 'خ', partName: 'x', digest: 'y', headings: [] });
  CFG.BRIDGE_ENABLED = keep;
  ok('۱۰.۱ خاموش یعنی بلوکِ خالی، نه استثنا', off.block === '' && off.links.length === 0);

  /* «یک قسمتِ بی‌ارجاع سالم است؛ یک قسمت با ارجاعِ ساختگی نیست.» */
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ links: [], none: 'نسبتِ واقعی‌ای نبود.' }) }] } }] } });
  const un = quiet();
  bridgeSave_(hub, 'kGod', ['kEp']);
  const empty = bridgeFor_(hub, reg, readSeriesReg_(hub).byKey['kGod'],
                           { seriesName: 'خ', partName: 'x', digest: 'y', headings: [] });
  un();
  ok('۱۰.۲ «نسبتی نبود» جوابِ سالمی است', empty.block === '' && empty.none !== '');

  /* و اگر مدل اصلاً جواب ندهد، تولید نباید بخوابد: ارجاع یک افزوده است. */
  global.__STUB = () => ({ code: 500, json: {} });
  const un2 = quiet();
  const bad = bridgeFor_(hub, reg, readSeriesReg_(hub).byKey['kGod'],
                         { seriesName: 'خ', partName: 'x', digest: 'y', headings: [] });
  un2();
  ok('۱۰.۳ شکستِ مدل هم قسمت را نمی‌خواباند', bad.block === '' && bad.links.length === 0);
}

console.log('\n=== ۱۱) ثبت پس از سنجشِ متنِ واقعی، نه پس از نقشه ===');
{
  /* ══ باگی که بازبینیِ دقیق پیدایش کرد ══
   * نقشهٔ ارجاع یک *درخواست* است؛ نویسنده می‌تواند نادیده‌اش بگیرد. تا پیش
   * از این، همان نقشه ثبت می‌شد — پس سیاهه، پروندهٔ قسمت، جزوه و مرورِ بزرگ
   * هر چهار می‌گفتند به «معرفت‌شناسی» ارجاع داده شد، در حالی که در صوت یک
   * کلمه‌اش هم نبود. و چون جزوه و مرور از همین سیاهه می‌خوانند، آن ادعای
   * غلط وارد محتوای بعدی هم می‌شد.
   * «هیچ‌کس به خروجی گوش نداد؛ فقط ورودی عوض شد.» */
  const links = [{ seriesKey: 'kEp', seriesName: 'معرفت‌شناسی', kind: 'ابزارِ سنجش',
                   claim: 'ملاکِ صدق', chapter: '', relation: 'r',
                   atHeading: 'اثباتِ واجب', say: 'ب'.repeat(60), strength: 'قوی' }];

  const ignored = { title: 'اثباتِ واجب', sections: [{ heading: 'اثباتِ واجب',
    narration: 'در این درس دربارهٔ برهانِ وجوب و امکان حرف می‌زنیم و بس. '.repeat(8) }] };
  const v1 = bridgeVerify_(ignored, links);
  ok('۱۱.۱ ارجاعی که در متن نیامده، «نیامده» شمرده می‌شود',
     v1.used.length === 0 && v1.missed.length === 1, JSON.stringify(v1.missed.length));

  const applied = { title: 'اثباتِ واجب', sections: [{ heading: 'اثباتِ واجب',
    narration: 'یادت هست در معرفت‌شناسی گفتیم صدقِ گزاره را چطور می‌سنجیم؟ ' +
               'همان ملاک دقیقاً همین‌جا به کار می‌آید. '.repeat(4) }] };
  const v2 = bridgeVerify_(applied, links);
  ok('۱۱.۲ و ارجاعی که آمده، «آمده»', v2.used.length === 1 && v2.missed.length === 0);

  /* سنجه محافظه‌کار است — همان قاعدهٔ recapCoverage_: نامی که هیچ واژهٔ
     شاخصی ندارد قابلِ داوری نیست، و «نمی‌دانم» را نباید «نیامده» گزارش کرد. */
  const noTerms = [Object.assign({}, links[0], { seriesName: 'الف ب' })];
  ok('۱۱.۳ نامِ بی‌واژهٔ شاخص «نیامده» اعلام نمی‌شود',
     bridgeVerify_(ignored, noTerms).missed.length === 0);

  /* ══ ۱۱.۴ عمق (۶٫۵۶): «آمده» کافی نیست؛ گذرا باید نشانه بخورد ══
     ۶٫۵۵ پنجرهٔ ±۲۰۰ نویسه روی متنِ پیوسته می‌گرفت که تقریباً همیشه پُر بود
     — سنجه‌ای که همیشه قبول بدهد، از روزِ اول مرده است. حالا جمله‌های
     حاملِ نام + جملهٔ پیرو سنجیده می‌شوند. */
  const thinEp = { title: 'x', sections: [{ heading: 'ه', narration:
    'بحثِ امروز دربارهٔ توجیه است. ' +
    'در معرفت‌شناسی هم آمده. ' +          // نام‌بردنِ کوتاه
    'خب. ' +                               // جملهٔ پیروِ کوتاه
    'حالا برویم سراغِ ادامهٔ بحثِ خودمان که مفصل است و ربطی به آن ندارد. '.repeat(6) }] };
  const vThin = bridgeVerify_(thinEp, [Object.assign({}, links[0])]);
  ok('۱۱.۴ ارجاعِ یک‌جمله‌ایِ گذرا، thin نشانه می‌خورد',
     vThin.used.length === 1 && vThin.used[0].thin === true,
     JSON.stringify(vThin.used[0] && vThin.used[0].thin));
  /* فیکسچرِ «آمده»ی ۱۱.۲ خودش گذراست (۱۰۹ نویسه دربارهٔ مرجع) — و سنجهٔ
     تازه درست همان را می‌گوید. ارجاعِ مفصل یعنی بندی که چهار جزء را دارد. */
  const fullEp = { title: 'x', sections: [{ heading: 'ه', narration:
    'یادت هست در مجموعهٔ معرفت‌شناسی گفتیم صدقِ یک گزاره را با چه ملاکی می‌سنجیم؟ ' +
    'آن‌جا نشان دادیم که بی معیارِ توجیه، هیچ ادعایی را نمی‌شود از حدس جدا کرد. ' +
    'حالا همان ابزار دقیقاً به کارِ همین بحث می‌آید: ادعای این درس هم تا از آن ' +
    'صافی نگذرد، فقط یک ادعاست. ' +
    'پس اگر آن مجموعه را شنیده باشی، این‌جا داری ثمره‌اش را می‌بینی. ' +
    'و حالا ادامهٔ بحثِ خودمان. '.repeat(3) }] };
  const vFull = bridgeVerify_(fullEp, [Object.assign({}, links[0])]);
  ok('۱۱.۵ ارجاعِ مفصل thin نمی‌خورد',
     vFull.used.length === 1 && vFull.used[0].thin === false,
     JSON.stringify(vFull.used[0] && vFull.used[0].thin));
  ok('۱۱.۴ اعراب و نیم‌فاصله مانعِ تطبیق نیست',
     bridgeVerify_({ sections: [{ heading: 'ب', narration: 'در مَعرفت شناسی گفتیم…' }] },
                   links).used.length === 1);

  /* و مسیرِ تولید باید *سنجیده* را ثبت کند، نه نقشه را. */
  const s14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۱۱.۵ تولید، سنجیده را ثبت می‌کند نه نقشه را',
     s14.indexOf('bridgeLog_(hub, epNum, seriesName, ctx.__bridgesUsed') !== -1 &&
     s14.indexOf('bridgeLog_(hub, epNum, seriesName, ctx.__bridges ||') === -1);
  ok('۱۱.۶ و سنجش پیش از نوشتنِ پروندهٔ قسمت انجام می‌شود',
     s14.indexOf('bridgeVerify_(ep, ctx.__bridges') < s14.indexOf('bridges: (ctx.__bridgesUsed'));
  ok('۱۱.۷ نیامده‌ها هم ثبت می‌شوند، نه اینکه بی‌صدا بیفتند',
     s14.indexOf('bridgesMissed:') !== -1);
  /* همه‌شان نیامدن یعنی بلوک اصلاً خوانده نشده — ایرادِ ساختاری، با کلیدِ
     ثابت تا تکرارش تکرار شمرده شود. */
  ok('۱۱.۸ و اگر هیچ‌کدام نیامد، یافته ثبت می‌شود',
     s14.indexOf("key: 'bridge-ignored'") !== -1);
  /* اگر خودِ سنجش شکست، ادعای نسنجیده ثبت نمی‌شود. */
  ok('۱۱.۹ شکستِ سنجش یعنی ثبتِ خالی، نه ثبتِ نسنجیده',
     /catch \(eBv\) \{[\s\S]{0,200}__bridgesUsed = \[\]/.test(s14));
}

console.log('\n=== ۱۲) کدِ مرده نماند، و فراخوانِ رو به جلو محافظت شد ===');
{
  /* `bridgeTrim_` یک نگاشتِ عنوان می‌ساخت و هرگز نمی‌خواندش. حذفش صرفاً
     تمیزکاری نبود: نبودنش می‌گوید نقشه **پیش از** نوشتن ساخته می‌شود، پس
     هنوز بخشی وجود ندارد که با آن سنجیده شود. */
  const s31 = fs.readFileSync('src/31_Bridge.gs', 'utf8');
  ok('۱۲.۱ نگاشتِ بی‌مصرفِ عنوان‌ها حذف شد',
     s31.indexOf('heads[String(secs[h])]') === -1);
  /* پارامترِ سوم از ۶٫۴۶ `strictKeys` است، نه `ctx`: سخت‌گیریِ خودکار در
     همان سد اعمال می‌شود، نه در شاخه‌ای جدا که روزی فراموش شود. */
  ok('۱۲.۲ و bridgeTrim_ دیگر ctx نمی‌گیرد',
     /function bridgeTrim_\(links, names(, strictKeys)?\)/.test(s31) &&
     s31.indexOf('ctx.headings') === -1);

  /* قاعدهٔ ۲۱→۲۲: بخشی که رو به جلو صدا زده می‌شود باید در try/catch باشد،
     وگرنه بارگذارِ جزئی با ReferenceError کلِ تخته را می‌خواباند. */
  const s15 = fs.readFileSync('src/15_Board.gs', 'utf8');
  ok('۱۲.۳ فراخوانِ bridgeCell_ در try/catch است',
     /try \{ H\.push\(bridgeCell_\(x, d\)\); \}/.test(s15));

  /* و تخته واقعاً با ستونِ تازه رندر می‌شود — نه فقط در نظر. */
  const d = seriesBoardData_(hub);
  const html = seriesBoardHtml_(d);
  ok('۱۲.۴ تخته با ستونِ تازه رندر می‌شود', html.length > 1000 &&
     html.indexOf('مجموعه‌های مرجع') !== -1);
  ok('۱۲.۵ و تیکِ مرجع در آن هست', html.indexOf('class="bxChk"') !== -1);
  /* شمارِ خانه‌های هر ردیف با شمارِ سرستون‌ها بخواند — وگرنه جدول می‌شکند. */
  const firstRow = (html.match(/<tr class="[^"]*srow"[\s\S]*?<\/tr>/) || [''])[0];
  const nTd = (firstRow.match(/<td/g) || []).length;
  const nTh = ((html.match(/<tr><th>اولویت[\s\S]*?<\/tr>/) || [''])[0].match(/<th/g) || []).length;
  ok('۱۲.۶ شمارِ خانه‌ها با سرستون‌ها می‌خواند', nTd === nTh, nTd + ' / ' + nTh);
}

console.log('\n=== ۱۳) حلقهٔ داوریِ کیفیت، بی آنکه کسی چیزی بفرستد (۶٫۴۶) ===');
{
  /* ══ خواستهٔ صاحبِ برنامه ══
   * «بدونِ اینکه من بخوام چیزی بفرستم، همین ارجاع‌دادن‌ها ثبت بشه و اون
   *  مطالبی که ارجاع شده همگی دیده و بررسی بشه … تعیینِ کیفیت بشه، و اگر
   *  لازم شد خودکار برای اصلاحاتش کاری انجام بشه … و بعدش هم پیگیری بشه.»
   *
   * ۶٫۴۴ فقط می‌پرسید «آیا در متن آمد؟» — سنجهٔ حضور، نه کیفیت. یعنی ارجاعی
   * که نامِ مجموعه را می‌گفت ولی حرفی به آن نسبت می‌داد که در کتابش **نیست**،
   * بی هیچ اعتراضی رد می‌شد. و آن دقیقاً همان چیزی است که «حرفه‌ای بودن رو
   * زیرِ سؤال» می‌برد. */
  delete global.__PROPS[PK.BRIDGE_DONE];
  delete global.__PROPS[PK.BRIDGE_STRICT];
  const reg = readSeriesReg_(hub);
  const links = [{ seriesKey: 'kEp', seriesName: 'معرفت‌شناسی', kind: 'ابزارِ سنجش',
                   claim: 'ملاکِ صدق', relation: 'r', atHeading: 'الف',
                   say: 'س'.repeat(60), strength: 'متوسط' }];
  const ep = { sections: [{ heading: 'الف',
    narration: 'در معرفت‌شناسی گفتیم صدق چطور سنجیده می‌شود. '.repeat(6) }] };

  ok('۱۳.۱ عکسِ داوری در تولید نوشته می‌شود',
     bridgeSnap_(51, 'خداشناسی', links, ep) === true);
  ok('۱۳.۲ و در صفِ داوری می‌نشیند', bridgePending_().length === 1);
  /* داوری در مسیرِ تولید انجام نمی‌شود: بودجهٔ شش‌دقیقه‌ای، قاعدهٔ ۵٫۶۸. */
  const s14b = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۱۳.۳ تولید فقط عکس می‌گیرد، داوری نمی‌کند',
     s14b.indexOf('bridgeSnap_(epNum') !== -1 && s14b.indexOf('bridgeAuditOne_') === -1);

  // ── داوریِ بد: نسبتِ دروغ به کتاب ──
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ verdicts: [{ series: 'معرفت‌شناسی', faithful: 'خیر',
      depth: 'سطحی', backbone: 'حفظ شد', natural: 'طبیعی',
      why: 'چنین حرفی در آن کتاب نیست.' }] }) }] } }] } });
  let un = quiet();
  const r1 = bridgeAuditRun_(2);
  un();
  ok('۱۳.۴ داوری انجام شد و ایراد را گرفت',
     r1.done === 1 && r1.n === 1 && r1.bad === 1, JSON.stringify(r1));
  const at = hub.getSheetByName(CFG.BRIDGE_AUDIT_TAB);
  ok('۱۳.۵ و در تبِ داوری ثبت شد', at && at.getLastRow() === 2);
  ok('۱۳.۶ عکسِ داوری‌شده دوباره داوری نمی‌شود', bridgePending_().length === 0);

  /* یافته با کلیدی که جفتِ مجموعه‌ها را دارد — تا تکرارش تکرار شمرده شود،
     نه ردیفِ تازهٔ هر شب. و مالکش «کد» است، پس در صفِ NEEDS_CODE می‌نشیند
     و سشنِ ناظر نسخهٔ بعد را از رویش می‌سازد: همان «پیگیری» که او خواست. */
  const rt = hub.getSheetByName(CFG.REPORT_TAB || 'گزارش‌های نظارت');
  const rtxt = rt ? rt.getRange(1, 1, rt.getLastRow(), rt.getLastColumn())
                      .getValues().map(r => r.join(' ')).join('\n') : '';
  ok('۱۳.۷ یافتهٔ «وفاداری» ثبت شد و مالکش کد است',
     rtxt.indexOf('bridge-unfaithful-kEp') !== -1 && rtxt.indexOf('کد') !== -1);

  // ── اصلاحِ خودکار: بارِ دوم، سخت‌گیری روشن می‌شود ──
  bridgeSnap_(52, 'خداشناسی', links, ep);
  un = quiet(); bridgeAuditRun_(2); un();
  const st = bridgeStrict_();
  ok('۱۳.۸ پس از دو داوریِ بد، سخت‌گیریِ خودکار روشن شد',
     st['kEp'] && st['kEp'].on === true, JSON.stringify(st));
  /* و همان سخت‌گیری در همان سدِ کد اعمال می‌شود: از این پس ارجاعِ «متوسط»
     رد نمی‌شود. */
  const names = { kEp: 'معرفت‌شناسی' };
  const mid = [{ seriesKey: 'kEp', kind: 'ابزارِ سنجش', claim: 'c', relation: 'r',
                 atHeading: 'h', say: 'س'.repeat(60), strength: 'متوسط' }];
  ok('۱۳.۹ و ارجاعِ «متوسط» از آن مجموعه دیگر رد نمی‌شود',
     bridgeTrim_(mid, names, st).length === 0);
  ok('۱۳.۹-ب ولی «قوی» هنوز می‌گذرد',
     bridgeTrim_([Object.assign({}, mid[0], { strength: 'قوی' })], names, st).length === 1);
  /* و درِ بازگشت: یک داوریِ خوب قفل را برمی‌دارد. گیتی که باز نشود، همان
     شکلی است که این ریپو مدام به آن می‌خورَد. */
  bridgeStrictBump_('kEp', false);
  ok('۱۳.۱۰ یک داوریِ خوب قفل را برمی‌دارد',
     bridgeStrict_()['kEp'].on === false);

  /* و همه‌جا ثبت: سطرِ روزانه و _STATUS.json — چون او شیت باز نمی‌کند. */
  const bs = bridgeAuditStatus_(hub);
  ok('۱۳.۱۱ سطرِ روزانه ساخته می‌شود و ایراد را می‌گوید',
     bs.line.indexOf('داوریِ ارجاع‌ها') === 0 && bs.n === 2 && bs.bad === 2, bs.line);
  const s08b = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۱۳.۱۲ و در ایمیل و _STATUS.json می‌نشیند',
     s08b.indexOf('bridgeAuditStatus_(hub)') !== -1 &&
     s08b.indexOf('bridgeAudit: (function') !== -1);
  const s21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۱۳.۱۳ کارِ شبانه پشتِ نگهبانِ بودجه صدایش می‌زند',
     /nightHas_\(\d+, 'داوریِ ارجاع‌ها'\)/.test(s21) && s21.indexOf('bridgeAuditRun_') !== -1);

  /* ══ داوری با ورودیِ خالی، حکم می‌دهد نه شهادت (درسِ ۵٫۹۶) ══
     اگر کتابِ مرجع خوانده نشود، مدل اصلاً صدا زده نمی‌شود. */
  let called = 0;
  global.__STUB = () => { called++; return { code: 200, json: {} }; };
  const un3 = quiet();
  const bad = bridgeAuditOne_(hub, { getName: () => '_BRIDGE-099.json',
    getBlob: () => ({ getDataAsString: () => JSON.stringify({ epNum: 99,
      seriesName: 'خ', links: [{ seriesKey: 'nope', seriesName: 'ن' }], text: 'x' }) }) }, reg);
  un3();
  ok('۱۳.۱۴ بی کتابِ مرجع، مدل اصلاً صدا زده نمی‌شود',
     called === 0 && bad.ok === false, bad.why);
}

console.log('\n=== ۱۴) دو مرحله: اول کلِ کتاب، بعد متنِ کاملِ خواندنی‌ها (۶٫۸۱) ===');
{
  /* ══ گزارشی که این را لازم کرد ══
   * «خیلی جاها می‌توانست ارتباط بدهد ولی نتوانسته تشخیص بدهد و گویا خیلی
   *  سطحی بررسی می‌کند… در حالی که خودم می‌بینم خیلی ارتباط دارند، چه از
   *  جهتِ تأییدِ مطالبِ هم، چه از جهتِ نقض یا رد.»
   * عیب در پرامپت نبود، در **ورودی** بود: کاشف فقط اسکلتِ کتاب را می‌دید —
   * عنوان‌ها و یک خط چکیده. با فهرستِ مطالب می‌شود فهمید دو کتاب هم‌موضوع‌اند
   * یا نه؛ نمی‌شود فهمید یکی دیگری را تأیید می‌کند یا رد. */
  const reg = readSeriesReg_(hub);
  const corpus = bridgeCorpus_(reg, ['kEp']);
  ok('۱۴.۱ فهرست حالا شناسهٔ بخش‌ها را دارد — بی آن نمی‌شود گفت «این را کامل بخوان»',
     /\[s\w+\]/.test(corpus[0].text), corpus[0].text.split('\n')[1]);
  ok('۱۴.۲ و خودِ کتاب همراهش می‌آید تا دو بار از درایو خوانده نشود',
     !!(corpus[0].book && corpus[0].book.chapters));

  // متنِ ژرف: فقط بخش‌های انتخاب‌شده، و متنِ کاملشان
  const anySec = corpus[0].book.chapters[corpus[0].book.chapters.length - 1].sections[0];
  const deep = bridgeDeepText_(corpus, [{ seriesKey: 'kEp', sectionId: anySec.id }]);
  ok('۱۴.۳ متنِ کاملِ همان بخش می‌آید، نه چکیده‌اش',
     deep.n === 1 && deep.text.indexOf(String(anySec.body).slice(0, 40)) !== -1,
     JSON.stringify(deep.text.slice(0, 80)));
  ok('۱۴.۴ و شناسهٔ ساختگی چیزی اضافه نمی‌کند',
     bridgeDeepText_(corpus, [{ seriesKey: 'kEp', sectionId: 'ساختگی' }]).n === 0);

  // پرامپتِ کشف هر دو را دارد: فهرستِ کل + متنِ کاملِ خواندنی‌ها
  const p2 = bridgePrompt_({ seriesName: 'خداشناسی', partName: 'اثباتِ واجب',
                             digest: 'گزاره‌هایی دربارهٔ وجودِ خدا.' }, corpus, deep);
  ok('۱۴.۵ پرامپت هم فهرستِ کلِ کتاب را دارد هم متنِ کاملِ بخش‌های نزدیک',
     p2.indexOf('فهرستِ کاملِ مجموعهٔ مرجع') !== -1 &&
     p2.indexOf('متنِ کاملِ بخش‌های مرتبط') !== -1);
  ok('۱۴.۶ و صریح می‌گوید برای *هر بخشِ* این درس جداگانه بگرد',
     p2.indexOf('برای هر بخشِ این درس جداگانه بگرد') !== -1);
  ok('۱۴.۷ و تأیید و نقض را با نام می‌خواهد — چون در عنوان‌ها پیدا نیستند',
     /\*\*تأیید\*\*/.test(p2) && /\*\*نقض\*\*/.test(p2));
  ok('۱۴.۸ و این دو نسبت در فهرستِ نسبت‌های مجاز هم هستند',
     !!BRIDGE_KINDS['تأیید'] && !!BRIDGE_KINDS['نقض']);

  // پرامپتِ پیش‌آهنگ: کلِ کتاب را می‌بیند و فقط انتخاب می‌کند
  const sp = bridgeScoutPrompt_({ seriesName: 'خداشناسی', partName: 'اثباتِ واجب',
                                  digest: 'گزاره‌هایی دربارهٔ وجودِ خدا.' }, corpus);
  ok('۱۴.۹ پیش‌آهنگ صریح می‌گوید کارش کشفِ نسبت نیست',
     sp.indexOf('کشفِ نسبت نیست') !== -1);
  ok('۱۴.۱۰ و کلِ فصل‌ها را می‌بیند، با هیچ تناظرِ شماره‌ای',
     sp.indexOf('ملاکِ صدق') !== -1 &&
     sp.indexOf('هیچ تناظری میان شمارهٔ این درس') !== -1);

  /* و مرزِ ایمنی: اگر پیش‌آهنگ نتیجه نداد، همان مسیرِ دیروز اجرا می‌شود —
     یک قابلیتِ تازه نباید چیزی را که کار می‌کرد بشکند. */
  const realG = global.geminiText_;
  let calls = 0;
  global.geminiText_ = (pr) => {
    calls++;
    if (pr.indexOf('کشفِ نسبت نیست') !== -1) return null;      // پیش‌آهنگ خاموش
    return { links: [{ seriesKey: 'kEp', kind: 'تأیید', claim: 'ج', chapter: 'ف',
                       relation: 'ر', atHeading: 'ب', say: 'م'.repeat(60),
                       strength: 'قوی' }], none: '' };
  };
  const un = quiet();
  const plan = bridgePlan_({ seriesName: 'خداشناسی', partName: 'x', digest: 'y' }, corpus);
  un();
  ok('۱۴.۱۱ پیش‌آهنگِ ناموفق مسیر را نمی‌خواباند', !!plan && plan.links.length === 1);
  ok('۱۴.۱۲ و شمارِ بخش‌های کامل‌خوانده‌شده گزارش می‌شود', plan.deepRead === 0);
  calls = 0;
  global.geminiText_ = (pr) => {
    calls++;
    if (pr.indexOf('کشفِ نسبت نیست') !== -1) {
      return { picks: [{ seriesKey: 'kEp', sectionId: anySec.id, why: 'نزدیک' }] };
    }
    ok('۱۴.۱۳ کاشف متنِ کاملِ بخشِ انتخاب‌شده را می‌بیند',
       pr.indexOf('متنِ کاملِ بخش‌های مرتبط') !== -1);
    return { links: [], none: 'چیزی نبود' };
  };
  const un2 = quiet();
  const plan2 = bridgePlan_({ seriesName: 'خداشناسی', partName: 'x', digest: 'y' }, corpus);
  un2();
  ok('۱۴.۱۴ دو فراخوان رفت: پیش‌آهنگ و کاشف', calls === 2, calls + '');
  ok('۱۴.۱۵ و شمارِ بخش‌های ژرف‌خوانده‌شده ثبت شد', plan2.deepRead === 1);
  global.geminiText_ = realG;

  /* ══ و طرفِ دیگرِ همان خواسته (۶٫۸۱) ══
   * «در هر قسمت از درسِ اصلی باید به همهٔ متنِ مرجع مراجعه کند» — یعنی همهٔ
   * *درس* هم باید دیده شود. `digest` تا امروز `slice(0, 12000)` از متنی
   * بود که تا ۴۲٬۰۰۰ نویسه می‌رسد: عملاً فقط ربعِ اولِ درس. نسبتی که با
   * نیمهٔ دومِ درس داشت، هرگز پیدا نمی‌شد. */
  /* هشت بلوکِ هم‌اندازه با نشانهٔ یکتا در سرِ هرکدام. با هشت پنجرهٔ
     هم‌فاصله، هر پنجره سرِ یک بلوک می‌افتد — پس «پوششِ سراسری» را می‌شود
     قطعی سنجید، نه با امیدِ اینکه یک نشانهٔ کوچک تصادفاً داخلِ پنجره بیفتد. */
  const NB = 8, BLK = 2500;
  let long = '';
  for (let b = 0; b < NB; b++) {
    long += 'نشانهٔ' + b + ' ' + 'م'.repeat(BLK - 10);
  }
  const dg = bridgeDigest_(long, 6000);
  let seen = 0;
  for (let b = 0; b < NB; b++) if (dg.indexOf('نشانهٔ' + b) !== -1) seen++;
  ok('۱۴.۱۶ خلاصه از سراسرِ درس برداشته می‌شود، نه از ربعِ اولش',
     seen >= NB - 1 && dg.indexOf('نشانهٔ' + (NB - 1)) !== -1,
     seen + ' بلوک از ' + NB + '، شاملِ آخری');
  ok('۱۴.۱۷ و سقف رعایت می‌شود', dg.length <= 6200, dg.length + '');
  ok('۱۴.۱۸ متنِ کوتاه دست‌نخورده می‌مانَد', bridgeDigest_('کوتاه', 6000) === 'کوتاه');
  const sp14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۱۴.۱۹ و مسیرِ واقعیِ درس‌نامه از همین می‌گذرد',
     /var digest = bridgeDigest_\(allText, 12000\);/.test(sp14));
}

console.log('=== ۱۵) قولِ «کلِ کتاب دیده می‌شود» نباید به اندازهٔ کتاب وابسته باشد (۶٫۸۲) ===');
{
  /* ۶٫۸۱ گفت پیش‌آهنگ اسکلتِ **کلِ** کتاب را می‌بیند. `bridgeCorpus_` وقتی از
     سقف می‌گذشت `break` می‌زد — یعنی همان قول، برای کتابِ بزرگ، بی‌صدا
     می‌شکست. روی جزوهٔ واقعیِ معرفت‌شناسی (۷۲ بخش) اسکلت ۱۵٬۸۵۶ نویسه بود،
     زیرِ سقفِ ۲۰٬۰۰۰؛ یعنی امروز درست کار می‌کرد و حدودِ درسِ ۲۴ خراب
     می‌شد. قولی که به بختِ اندازهٔ داده وابسته باشد، قول نیست. */
  const many = { seriesKey: 'kBig', seriesName: 'کتابِ بزرگ', refs: [], episodes: [],
                 chapters: [] };
  for (let i = 1; i <= 40; i++) {
    many.chapters.push({ id: 'C' + i, title: 'فصلِ ' + i, addedIn: String(i), sections: [
      { id: 'SEC' + i, title: 'بخشِ شمارهٔ ' + i, body: 'متن. '.repeat(50),
        takeaway: ('چکیدهٔ بخشِ ' + i + '؛ ').repeat(20), addedIn: String(i) }] });
  }
  const fBig = addSeries('kBig', 'کتابِ بزرگ', '۰۴ — بزرگ');
  putBook(fBig, many);
  const reg = readSeriesReg_(hub);
  const cp = bridgeCorpus_(reg, ['kBig']);
  ok('۱۵.۱ کتاب خوانده شد', cp.length === 1 && cp[0].sections === 40);
  let all = true;
  for (let i = 1; i <= 40; i++) {
    if (cp[0].text.indexOf('[SEC' + i + ']') === -1) all = false;
  }
  ok('۱۵.۲ شناسهٔ هر ۴۰ بخش در فهرست هست — هیچ‌کدام نیفتاد', all);
  ok('۱۵.۳ و آخرین فصل — که همیشه اولین قربانیِ بریدنِ ته بود — هست',
     cp[0].text.indexOf('فصلِ 40') !== -1 && cp[0].text.indexOf('[SEC40]') !== -1);
  ok('۱۵.۴ نشانهٔ «جا نشد» دیگر وجود ندارد', cp[0].text.indexOf('جا نشد') === -1);
  ok('۱۵.۵ و سقف رعایت شده — چکیده کوتاه شد، نه فهرست',
     cp[0].text.length <= (CFG.BRIDGE_CORPUS_CHARS + 200), String(cp[0].text.length));
  /* و وقتی چکیده‌ها آن‌قدر کوچک می‌شوند که بی‌فایده‌اند، اصلاً نمی‌آیند و
     ضعیف‌شدن **گفته** می‌شود — قابلیتی که بی‌صدا خاموش شود، همان بانکِ
     موسیقی است. */
  const huge = { seriesKey: 'kHuge', seriesName: 'کتابِ عظیم', refs: [], episodes: [],
                 chapters: [] };
  for (let i = 1; i <= 400; i++) {
    huge.chapters.push({ id: 'H' + i, title: 'فصلِ ' + i, addedIn: String(i), sections: [
      { id: 'HS' + i, title: 'بخشِ ' + i, body: 'x', takeaway: 'چکیده', addedIn: String(i) }] });
  }
  putBook(addSeries('kHuge', 'کتابِ عظیم', '۰۵ — عظیم'), huge);
  const cp2 = bridgeCorpus_(readSeriesReg_(hub), ['kHuge']);
  let all2 = true;
  for (let i = 1; i <= 400; i++) if (cp2[0].text.indexOf('[HS' + i + ']') === -1) all2 = false;
  ok('۱۵.۶ حتی در کتابِ ۴۰۰بخشی هم هر بخش نام برده می‌شود', all2);
  ok('۱۵.۷ و «تنگ‌شدن» علامت می‌خورد تا بی‌صدا نماند', cp2[0].tight === true);
}

console.log('=== ۱۶) سیاههٔ ارجاع باید تغییرِ نامِ مجموعه را تاب بیاورد (۶٫۸۲) ===');
{
  /* تختهٔ مجموعه‌ها برای همین هست که نام عوض شود. سیاهه نام را ثبت می‌کرد و
     جزوه و مرور با نامِ امروزی دنبالش می‌گشتند: لحظهٔ تغییرِ نام، همهٔ
     ارجاع‌های گذشته از دیدِ هر دو ناپدید می‌شدند — بی خطا، بی ردیفِ خالی.
     همان تلهٔ ۶٫۷۱ در جای تازه. */
  const link = { seriesKey: 'kEp', seriesName: 'معرفت‌شناسی', kind: 'پیش‌نیاز',
                 claim: 'ادعای مرجع', relation: 'نسبتش', atHeading: 'سرفصل',
                 say: 'متنِ گفته‌شده' };
  ok('۱۶.۱ سیاهه با کلید نوشته می‌شود',
     bridgeLog_(hub, 7, 'خداشناسی', [link], 'kGod') === true);
  ok('۱۶.۲ ستونِ کلید در سرستون‌ها هست',
     BRIDGE_HEADERS[BRIDGE_HEADERS.length - 1] === 'کلیدِ مجموعه');
  const has = (l, c) => l.some((x) => x.claim === c);
  ok('۱۶.۳ با نامِ امروز پیدا می‌شود',
     has(bridgeOfSeries_(hub, 'خداشناسی', 24, 'kGod'), 'ادعای مرجع'));
  /* و این سنجهٔ اصلی است: نام عوض شد، ردیف هنوز پیداست. */
  ok('۱۶.۴ و پس از تغییرِ نامِ مجموعه هم — چون کلید عوض نمی‌شود',
     has(bridgeOfSeries_(hub, 'خداشناسیِ تطبیقی', 24, 'kGod'), 'ادعای مرجع'));
  ok('۱۶.۵ ولی ردیفِ کلیددارِ یک مجموعه به مجموعهٔ دیگر نمی‌رود',
     !has(bridgeOfSeries_(hub, 'خداشناسی', 24, 'kEp'), 'ادعای مرجع'));
  /* ردیف‌های پیش از ۶٫۸۲ کلید ندارند؛ آن‌ها باید هنوز با نام پیدا شوند،
     وگرنه همین اصلاح خودش تاریخچه را می‌بلعد — و «تحلیل‌های قبلی هرگز
     خراب نشوند» قاعدهٔ ثابتِ این ریپوست. */
  const sh = hub.getSheetByName(CFG.BRIDGE_TAB);
  sh.getRange(sh.getLastRow() + 1, 1, 1, 9).setValues([[
    nowStr_(), '3', 'خداشناسی', 'معرفت‌شناسی', 'روش', 'سرفصلِ کهنه',
    'ادعای کهنه', 'نسبتِ کهنه', 'گفتهٔ کهنه']]);
  const both = bridgeOfSeries_(hub, 'خداشناسی', 24, 'kGod');
  ok('۱۶.۶ ردیفِ بی‌کلیدِ قدیمی با نام هنوز خوانده می‌شود — کنارِ کلیددار',
     has(both, 'ادعای کهنه') && has(both, 'ادعای مرجع'),
     JSON.stringify(both.map((x) => x.claim)));
}

console.log('=== ۱۷) سنجشِ گفته‌شدن باید به همان بخش تنگ شود (۶٫۸۳) ===');
{
  /* وقتی هر کتاب فقط یک ارجاع در هر قسمت داشت، «نامِ مرجع جایی در متن هست؟»
     کافی بود. حالا که یک کتاب می‌تواند در سه بخش سه نسبت داشته باشد، آن
     سنجه هر سه را با **یک** بار نام‌بردن قبول می‌کرد — یعنی همان دروغی که
     bridgeVerify_ برای جلوگیری‌اش نوشته شد، سه‌برابر. */
  const ep = { title: 'د', sections: [
    { heading: 'الف', narration: 'در مجموعهٔ معرفت‌شناسی گفتیم که ملاکِ صدق چیست، ' +
        'و همان ملاک دقیقاً همین‌جا لازم می‌شود؛ بی آن، این گزاره را نمی‌شود سنجید. ' +
        'پس آنچه آنجا آموختیم، اینجا ابزارِ کار است و بدونش راه بسته می‌مانَد.' },
    { heading: 'ب', narration: 'این بخش هیچ نامی از هیچ مجموعهٔ دیگری نمی‌برد و ' +
        'تماماً دربارهٔ موضوعِ خودِ همین درس است، بی هیچ اشاره‌ای به بیرون.' }] };
  const mk = (at) => ({ seriesKey: 'kEp', seriesName: 'معرفت‌شناسی',
                        kind: 'ابزارِ سنجش', claim: 'ملاکِ صدق',
                        relation: 'اینجا لازم می‌شود', atHeading: at, say: 'x' });
  const v = bridgeVerify_(ep, [mk('الف'), mk('ب')]);
  ok('۱۷.۱ ارجاعی که در بخشِ خودش گفته شده، «گفته‌شده» است',
     v.used.length === 1 && v.used[0].atHeading === 'الف',
     JSON.stringify(v.used.map((x) => x.atHeading)));
  ok('۱۷.۲ و ارجاعی که بخشِ خودش نامی از مرجع ندارد، «نیامده» است — حتی وقتی ' +
     'نامِ همان کتاب در بخشِ دیگری آمده',
     v.missed.length === 1 && v.missed[0].atHeading === 'ب',
     JSON.stringify(v.missed.map((x) => x.atHeading)));
  /* ══ ۱۷.۵ — بازسازیِ دقیقِ قسمتِ ۲۷ (۶٫۸۳) ══
     مرجعِ واقعی «معرفت شناسی مجتبی مصباح» است و درس هم معرفت‌شناسی. سنجهٔ
     پیشین با یک «معرفت» یا «شناسی» قبول می‌داد، پس گفت ارجاع «گفته شد» و
     `thin:false` — در حالی که در کلِ ۸٬۴۹۱ نویسهٔ متن «مصباح» یک بار هم
     نیامده بود. و چون دروغ گفت، هشدارِ `bridge-ignored` که از پیش آمادهٔ
     همین حالت بود هرگز بلند نشد. */
  /* درازای متن عمداً واقع‌گرایانه است (قسمتِ ۲۷: ۸٬۴۹۱ نویسه، ده‌ها جمله):
     آستانهٔ کمیابی نسبی است، پس فیکسچرِ چهارجمله‌ای رفتارِ واقعی را نشان
     نمی‌دهد — «شناسی» در چهار جمله کمیاب است و در یک درسِ واقعی نیست. */
  const body27 = ['در بررسی معرفت‌شناسی ادراک، پیوند میان حس و باور از اهمیت ' +
                  'بنیادی برخوردار است.'];
  for (let i = 0; i < 40; i++) {
    body27.push('در معرفت‌شناسیِ ادراک، شناساییِ باورِ پایه گامِ شمارهٔ ' + i +
                ' است و معرفتِ حاصل از آن شناختی روشن پدید می‌آورد.');
  }
  const ep27 = { title: 'ادراک', sections: [
    { heading: 'ادراک، مفهوم‌سازی و باور', narration: body27.join(' ') }] };
  const l27 = { seriesKey: 'kEp', seriesName: 'معرفت شناسی مجتبی مصباح',
                kind: 'تأیید', claim: 'تمایزِ ادراکِ ساده از قضاوت',
                relation: 'تأیید', atHeading: 'ادراک، مفهوم‌سازی و باور', say: 'x' };
  const v27 = bridgeVerify_(ep27, [l27]);
  ok('۱۷.۵ «معرفت» و «شناسی» واژهٔ خودِ درس‌اند، نه نامِ کتاب — پس نیامده',
     v27.missed.length === 1 && v27.used.length === 0,
     JSON.stringify({ used: v27.used.length, missed: v27.missed.length }));
  /* و همان متن، این بار با نامِ کتاب واقعاً گفته‌شده. */
  const ep27b = JSON.parse(JSON.stringify(ep27));
  ep27b.sections[0].narration +=
    ' در مجموعهٔ معرفت‌شناسیِ مجتبی مصباح هم همین تمایز آمده بود: آنجا گفتیم ' +
    'خطای ادراکی به ساحتِ قضاوت بازمی‌گردد نه به احساسِ خام، و همین حرف از ' +
    'راهی دیگر همان چیزی است که اینجا به آن رسیدیم. دو مسیرِ مستقل، یک نتیجه.';
  const v27b = bridgeVerify_(ep27b, [l27]);
  ok('۱۷.۶ ولی وقتی نامِ کتاب واقعاً گفته شود، «گفته‌شده» است',
     v27b.used.length === 1 && v27b.missed.length === 0);
  /* نردبانِ دوم: نامی که همهٔ واژه‌هایش واژهٔ خودِ درس‌اند، هنوز قابلِ سنجش
     است — «نمی‌دانم» نباید «نیامده» شود. */
  const epC = { sections: [{ heading: 'ب', narration:
    'معرفت و شناخت. معرفت و شناخت. معرفت و شناخت. معرفت و شناخت.' }] };
  const vC = bridgeVerify_(epC, [{ seriesKey: 'kEp', seriesName: 'معرفت شناخت',
                                   kind: 'تأیید', atHeading: 'ب', say: 'x' }]);
  ok('۱۷.۷ نامی که تماماً از واژگانِ خودِ درس است، به نردبانِ دوم می‌رود',
     vC.used.length === 1);

  /* و سوگیریِ محافظه‌کار سرِ جایش: عنوانی که با هیچ بخشی جور در نمی‌آید،
     «نیامده» گزارش نمی‌شود — دامنه به کلِ متن برمی‌گردد. */
  const v2 = bridgeVerify_(ep, [mk('عنوانی که اصلاً وجود ندارد')]);
  ok('۱۷.۸ عنوانِ ناشناخته دامنه را به کلِ متن برمی‌گرداند، نه به رد',
     v2.used.length === 1 && v2.missed.length === 0);
  ok('۱۷.۹ و ارجاعِ بی‌عنوانِ بخش هم همان‌طور',
     bridgeVerify_(ep, [mk('')]).used.length === 1);
}

console.log('=== ۱۸) داوری‌ای که هرگز اجرا نشد باید خودش را لو بدهد (۶٫۸۴) ===');
{
  /* وضعیتِ واقعیِ ۲ سپتامبر: `bridgeAudit = {n:0, bad:0, pending:6}` — شش عکس
     در صف، صفر داوری، از ۶٫۴۶ تا امروز. و هیچ جمله‌ای در هیچ سیاهه‌ای که
     بگوید چرا، چون `bridgeAuditRun_` مقدارِ `why` را دور می‌ریخت. این مهم
     است چون داوری **تنها** سنجهٔ درستیِ ارجاع است: بی آن فقط می‌دانیم
     ارجاعی گفته شده، نه اینکه نسبتش راست بوده. */
  delete global.__PROPS[PK.BRIDGE_AUD_BAD];
  const sh = ensureTab_(hub, CFG.BRIDGE_TAB || 'ارجاع‌های میان‌مجموعه‌ای', BRIDGE_HEADERS);
  // عکسی که هرگز داوری‌شدنی نیست: مجموعهٔ مرجعش در رجیستری نیست
  auditPutJson_(bridgeSnapName_(91), {
    at: nowStr_(), epNum: 91, seriesName: 'خداشناسی',
    links: [{ seriesKey: 'kGHOST', seriesName: 'مجموعهٔ ناموجود', kind: 'روش',
              claim: 'الف', relation: 'ب', atHeading: 'ج' }],
    text: 'متنی که هیچ نامی ندارد.'
  });
  let r = null;
  for (let night = 1; night <= 3; night++) r = bridgeAuditRun_(2);
  ok('۱۸.۱ عکسِ داوری‌نشده در صف می‌مانَد، «انجام‌شده» نمی‌خورد', r.done === 0);
  ok('۱۸.۲ و علتش دیگر دور ریخته نمی‌شود',
     r.why.length >= 1 && /کتابِ مرجع خوانده نشد/.test(r.why[0]), JSON.stringify(r.why));
  const found = String(global.__PROPS[PK.BRIDGE_AUD_BAD] || '0');
  ok('۱۸.۳ شب‌های بی‌داوری شمرده می‌شوند', Number(found) >= 3, found);
  /* یک شبِ بد قطعیِ شبکه است؛ سه شبِ پیاپی یعنی داور کار نمی‌کند. */
  const rows = hub.getSheetByName(CFG.REPORT_TAB || 'گزارش‌های نظارت');
  let hasFinding = false;
  if (rows && rows.getLastRow() > 1) {
    const v = rows.getRange(2, 1, rows.getLastRow() - 1, rows.getLastColumn()).getValues();
    hasFinding = v.some((row) => row.join(' ').indexOf('داوریِ کیفیتِ ارجاع‌ها اجرا نمی‌شود') !== -1);
  }
  ok('۱۸.۴ پس از سه شب، یافتهٔ کد ثبت می‌شود', hasFinding);
  /* و سطرِ روزانه باید معنایش را بگوید، نه دو عدد که خواننده کنارِ هم بگذارد.
     هابِ تازه، چون هابِ این سوئیت از بخش‌های پیشین ردیفِ داوری دارد. */
  const st = bridgeAuditStatus_(new Spread('هاب۱۸'));
  ok('۱۸.۵ سطرِ روزانه صریح می‌گوید هنوز هیچ نسبتی سنجیده نشده',
     st.n === 0 && st.pending >= 1 &&
     st.line.indexOf('هیچ ارجاعی تا امروز داوری نشده') !== -1, st.line);
}

/* ══ ۱۹) «نسبتش با این درس» یا یک جمله است یا هیچ (۶٫۹۵) ══
   دادهٔ واقعی: در جزوهٔ «Audi» هر ۱۴ ارجاع `relation` را برابرِ `kind`
   داشتند، پس ستونِ «نسبتش با این درس» ستونِ «نسبت» را تکرار می‌کرد و
   ستونی که همیشه پر است هرگز مشکوک نمی‌شود. علتِ ریشه‌ای: `relation` در
   شِما «الزامی» بود ولی شرحش فقط در یک کامنتِ جاوااسکریپت. */
{
  console.log('\n══ ۱۹) نسبت، نه نامِ نسبت ══');
  ok('۱۹.۱ نامِ دستهٔ خودش، نسبت نیست', bridgeRelation_('تکمیل', 'تکمیل') === '');
  ok('۱۹.۲ نامِ دستهٔ دیگری هم نسبت نیست', bridgeRelation_('تأیید', 'تکمیل') === '');
  ok('۱۹.۳ نقطه‌گذاری آن را نجات نمی‌دهد', bridgeRelation_('تکمیل.', 'تکمیل') === '');
  ok('۱۹.۴ چیزی کوتاه‌تر از یک جمله هم نه', bridgeRelation_('مرتبط است', 'تکمیل') === '');
  const real = 'آنجا خطای حسی به قضاوتِ ذهن نسبت داده شده و همین‌جا همان تفکیک ادامه پیدا می‌کند.';
  ok('۱۹.۵ ولی یک جملهٔ واقعی می‌مانَد', bridgeRelation_(real, 'تکمیل') === real);

  /* و سدّ در `bridgeTrim_` است، نه در فراخوانِ جدا — همان قاعدهٔ همیشگیِ
     این ریپو: مرزی که هر صدازننده باید خودش رعایت کند، مرز نیست. */
  const names = { k1: 'کتابِ یک' };
  const trimmed = bridgeTrim_([{
    seriesKey: 'k1', kind: 'تکمیل', claim: 'گزارهٔ آن کتاب',
    relation: 'تکمیل', atHeading: 'بخشِ یک', strength: 'قوی',
    say: 'یک جملهٔ گفتاریِ به‌قدرِ کافی بلند که از سدِ چهل نویسه رد شود و طبیعی بنشیند.'
  }], names, {});
  ok('۱۹.۶ trim ارجاع را نگه می‌دارد ولی نسبتِ تکراری را خالی می‌کند',
     trimmed.length === 1 && trimmed[0].relation === '', JSON.stringify(trimmed[0] || {}));
  ok('۱۹.۷ و خالی‌بودن شمرده می‌شود', bridgeRelationGap_(trimmed) === 1);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
