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

  /* دو ارجاع به یک کتاب در یک قسمت دقیقاً همان «لوث شدن»ی است که او از آن
     ترسید: «بدونِ لوث شدن و بی‌معنی شدن». */
  const two = bridgeTrim_([good, Object.assign({}, good, { atHeading: 'ب' })],
                          names, { headings: [] });
  ok('۵.۶ یک مجموعه، یک ارجاع در هر قسمت', two.length === 1);

  const many = [];
  for (let i = 0; i < 9; i++) many.push(Object.assign({}, good));
  ok('۵.۷ و سقفِ شمارِ ارجاع در کد اعمال می‌شود',
     bridgeTrim_(many, names, { headings: [] }).length <= Number(CFG.BRIDGE_MAX_LINKS));
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
  ok('۱۲.۲ و bridgeTrim_ دیگر ctx نمی‌گیرد',
     /function bridgeTrim_\(links, names\)/.test(s31));

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

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
