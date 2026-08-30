/* نمودارهای جزوه (۶٫۵۷): مدل تشخیص می‌دهد، کد رندر و کلیک‌پذیری را ضمانت می‌کند.
   می‌سنجد:
   • نقشهٔ کتاب بی‌مدل ساخته می‌شود و هر شاخه به لنگرِ واقعیِ فصل می‌رود
   • پیشنهادِ مدل پاک‌سازی می‌شود: نوعِ ناشناخته، شناسهٔ ساختگی، گرهٔ خالی
   • هر شش نوع رندر می‌شوند و لینک‌ها به لنگرهایی می‌روند که واقعاً در HTML هستند
   • امضا: فصلِ بی‌تغییر فراخوانِ دوباره نمی‌گیرد؛ فصلِ تکمیل‌شده می‌گیرد
   • مدلِ خواب: بی‌خطا، بی‌نمودار، و پس از سقفِ تلاش رها — امضای تازه بازش می‌کند
   • جاروی شبانه مکان‌نما دارد و فقط وقتی چیزی ساخت می‌نویسد */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
// خودش پوشه را می‌خواند — پس هرگز از فایلِ تازهٔ src جا نمی‌مانَد (قاعدهٔ ۴٫۲)
const FILES = fs.readdirSync('src').filter(f => /^\d\d_.*\.gs$/.test(f)).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

global.__PROPS = {}; global.__SS = {}; global._ssCache = null;
global.DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');

// ── کتابِ نمونه ──
function mkBook() {
  return { seriesName: 'معرفت‌شناسی', seriesKey: 'k', cat: 'فلسفی', level: '',
    revision: 2, updatedAt: '', episodes: [{ n: '1' }, { n: '2' }], refs: [],
    roadmap: {}, chapters: [
      { id: 'ch1', title: 'چیستیِ معرفت', intro: 'درآمد',
        sections: [
          { id: 's1', title: 'تعریفِ سه‌جزئی', body: 'باور صادقِ موجه. '.repeat(30), refs: [], adds: [] },
          { id: 's2', title: 'اشکالِ گتیه', body: 'مثالِ نقض. '.repeat(30), refs: [], adds: [] }
        ] },
      { id: 'ch2', title: 'منابعِ شناخت', intro: '',
        sections: [{ id: 's3', title: 'حس و عقل', body: 'دو منبع. '.repeat(30), refs: [], adds: [] }] }
    ] };
}

console.log('=== ۱) نقشهٔ کتاب: بی‌مدل، کلیک‌شو، به لنگرِ واقعی ===');
{
  const book = mkBook();
  const map = hvizBookMap_(book);
  ok('۱.۱ ساخته می‌شود و نقشهٔ ذهنی است', map.indexOf('hvz-mm') !== -1);
  ok('۱.۲ هر فصل یک شاخهٔ لینک‌دار دارد',
     map.indexOf('href="#ch1"') !== -1 && map.indexOf('href="#ch2"') !== -1);
  const html = handoutHtml_(book);
  ok('۱.۳ در HTML جزوه می‌نشیند', html.indexOf('نقشهٔ کتاب در یک نگاه') !== -1);
  ok('۱.۴ و مقصدِ هر کلیک واقعاً در همان صفحه هست',
     html.indexOf('id="ch1"') !== -1 && html.indexOf('id="ch2"') !== -1);
  ok('۱.۵ کتابِ تک‌فصلی نقشه نمی‌گیرد (نقشهٔ یک‌شاخه مسخره است)',
     hvizBookMap_({ seriesName: 'x', chapters: [mkBook().chapters[0]] }) === '');
}

console.log('\n=== ۲) پاک‌سازیِ پیشنهادِ مدل ===');
{
  const idsOk = hvizIds_(mkBook());
  const d = hvizClean_({ kind: 'نوعِ من‌درآوردی', title: 'ت', items: [
    { label: 'الف', to: 's1' }, { label: 'ب', to: 'شناسهٔ-ساختگی' },
    { label: '' }, { label: 'ج', to: 's3', detail: 'د' }
  ] }, idsOk);
  ok('۲.۱ نوعِ ناشناخته به «کارت‌ها» می‌افتد', d.kind === 'کارت‌ها');
  ok('۲.۲ شناسهٔ ساختگی لینک نمی‌شود ولی گره می‌ماند',
     d.items.length === 3 && d.items[1].to === '' && d.items[1].label === 'ب');
  ok('۲.۳ گرهٔ بی‌متن می‌افتد', d.items.every(x => x.label));
  ok('۲.۴ نمودارِ تک‌گره رد می‌شود',
     hvizClean_({ kind: 'کارت‌ها', items: [{ label: 'تنها' }] }, idsOk) === null);
}

console.log('\n=== ۳) هر شش نوع رندر می‌شوند و لینک‌ها سالم‌اند ===');
{
  const kinds = ['نقشهٔ ذهنی', 'روندنما', 'چرخه', 'سلسله‌مراتب', 'تقابل', 'کارت‌ها'];
  for (const k of kinds) {
    const items = [{ label: 'یک', to: 's1', group: 'راست' }, { label: 'دو', to: 's2', group: 'چپ' },
                   { label: 'سه', to: '', group: 'راست' }];
    const h = hvizHtml_({ kind: k, title: 'ع', note: 'ن', items: items }, 'ب');
    ok('۳ «' + k + '» رندر شد و لینک دارد',
       h.indexOf('hvz') !== -1 && h.indexOf('href="#s1"') !== -1 &&
       h.indexOf('href="#s2"') !== -1, h.slice(0, 60));
  }
  /* ۶٫۶۶ — «چند نمونه‌ای که رسم شده بود شبیه هم بودن»: هر نوع باید شکلِ
     ساختاریِ خودش را داشته باشد، نه فقط برچسبش را. */
  const flow = hvizHtml_({ kind: 'روندنما', items: [{ label: 'آ' }, { label: 'ب' }] }, '');
  ok('۳.۷ روندنما گامِ شماره‌دار و فلش دارد',
     flow.indexOf('hvz-ar') !== -1 && flow.indexOf('hvz-no') !== -1);
  const cyc = hvizHtml_({ kind: 'چرخه', items: [{ label: 'آ' }, { label: 'ب' }, { label: 'ج' }] }, '');
  ok('۳.۸ چرخه چیدمانِ دایره‌ایِ واقعی دارد (مختصاتِ محاسبه‌شده)',
     cyc.indexOf('hvz-orbit') !== -1 && /right:\d+(\.\d+)?%/.test(cyc) &&
     cyc.indexOf('hvz-hub') !== -1);
  const pyr = hvizHtml_({ kind: 'سلسله‌مراتب', items: [
    { label: 'آ', group: 'سطح ۱' }, { label: 'ب', group: 'سطح ۲' }] }, '');
  ok('۳.۹ سلسله‌مراتب هرمِ پهن‌شونده است (عرضِ سطرها متفاوت)',
     pyr.indexOf('hvz-pyr') !== -1 && /width:46%/.test(pyr) && /width:100%/.test(pyr));
  const cm = hvizHtml_({ kind: 'نقشهٔ مفهومی', items: [
    { label: 'مرکز' }, { label: 'گره', detail: 'پیش‌نیازِ', to: 's1' }] }, '');
  ok('۳.۱۰ نقشهٔ مفهومی یالِ برچسب‌دار دارد',
     cm.indexOf('hvz-rel') !== -1 && cm.indexOf('پیش‌نیازِ') !== -1);
  ok('۳.۱۱ مترادف‌ها به نوعِ درست می‌رسند («دیاگرام فرآیند»، «لایه‌ای»، «ماتریس مقایسه»)',
     hvizKindOf_('دیاگرام فرآیند') === 'روندنما' &&
     hvizKindOf_('لایه‌ای') === 'سلسله‌مراتب' &&
     hvizKindOf_('ماتریس مقایسه') === 'تقابل');
}

console.log('\n=== ۴) پر کردن: امضا، سقفِ فراخوان، رهاکردن ===');
{
  let calls = 0, give = null;
  global.geminiText_ = function (prompt, schema) {
    calls++;
    if (give === null) return null;
    return JSON.parse(JSON.stringify(give));
  };
  const book = mkBook();
  // مدلِ خواب: بی‌خطا، بی‌نمودار
  let r = handoutVizFill_(book, 5);
  ok('۴.۱ مدلِ خواب: فراخوان رفت، نموداری نیامد، خطایی نه',
     r.calls === 2 && r.made === 0 && !book.chapters[0].viz, 'calls=' + r.calls);
  // تا سقفِ تلاش، بعد رها
  handoutVizFill_(book, 5); handoutVizFill_(book, 5); handoutVizFill_(book, 5);
  const before = calls;
  r = handoutVizFill_(book, 5);
  ok('۴.۲ پس از ' + CFG.HANDOUT_TRY_MAX + ' تلاش، فصل رها می‌شود (فراخوانِ تازه نمی‌رود)',
     calls === before && r.gaveUp === 2, 'calls=' + calls + ' gaveUp=' + r.gaveUp);
  // مدل بیدار شد ولی فصل رهاست — تا امضا عوض شود (قراردادِ تک‌نمودار، ۶٫۶۵)
  give = { kind: 'نقشهٔ ذهنی', title: 'پیش‌نما',
           items: [{ label: 'م', to: 'ch1' }, { label: 'ت', to: 's1' }, { label: 'گ', to: 's2' }] };
  book.chapters[0].sections[0].adds = [{ body: 'تکمیل از درسِ بعد' }];   // امضا عوض شد
  r = handoutVizFill_(book, 5);
  ok('۴.۳ امضای تازه سابقهٔ رهاکردن را صفر می‌کند و فصل پر می‌شود',
     book.chapters[0].viz && !!book.chapters[0].viz.intro, JSON.stringify(r));
  ok('۴.۴ هر فصل آماده‌سازی و مرور می‌گیرد و میان‌بخشی هم پرسیده می‌شود',
     !!book.chapters[0].viz.recap && book.chapters[0].viz.secDone === true,
     JSON.stringify(book.chapters[0].viz.recap || null).slice(0, 60));
  ok('۴.۴-ب پرامپتِ مرور، نوعِ آماده‌سازی را می‌گوید تا هم‌شکل نشوند',
     (function () {
       let seen = [];
       global.geminiText_ = function (pr) { seen.push(pr);
         return { kind: 'کارت‌ها', items: [{ label: 'آ' }, { label: 'ب' }] }; };
       const bx = mkBook();
       const unX = quiet(); handoutVizFill_(bx, 9); unX();
       return seen.some(x => x.indexOf('از نوعِ «کارت‌ها» استفاده نکن') !== -1);
     })());
  const c2 = calls;
  r = handoutVizFill_(book, 5);
  ok('۴.۵ فصلِ هم‌امضا دیگر فراخوان نمی‌گیرد (مجانی)', calls === c2 && r.calls === 0);
  // و در HTML واقعاً می‌نشینند، سرِ جای درست
  const html = handoutHtml_(book);
  const iIntro = html.indexOf('پیش از خواندنِ فصل');
  const iRecap = html.indexOf('مرورِ فصل');
  const iCh2 = html.indexOf('id="ch2"');
  ok('۴.۶ آماده‌سازی پیش از بخش‌ها، مرور پس از آن‌ها و پیش از فصلِ بعد',
     iIntro !== -1 && iRecap !== -1 && iIntro < iRecap && iRecap < iCh2);
  book.chapters[0].viz.secs = [{ at: 's1', kind: 'تقابل',
    items: [{ label: 'حس', group: 'حس' }, { label: 'عقل', group: 'عقل' }] }];
  const html2 = handoutHtml_(book);
  ok('۴.۷ نمودارِ میان‌بخشی تهِ همان بخش است',
     html2.indexOf('hvz-cmp') > html2.indexOf('id="s1"') &&
     html2.indexOf('hvz-cmp') < html2.indexOf('id="s2"'));
}

console.log('\n=== ۵) جاروی شبانه: مکان‌نما، نوشتنِ فقط هنگامِ ساخت ===');
{
  global.geminiText_ = function () {
    return { recap: { kind: 'کارت‌ها', items: [{ label: 'آ', to: '' }, { label: 'ب', to: '' }] } };
  };
  const hub = getHub_();
  const sh = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  for (let i = 1; i <= 2; i++) {
    const f = root.createFolder('سری' + i);
    f.createFile(Utilities.newBlob(JSON.stringify(mkBook()), 'application/json', handoutJsonName_()));
    const v = []; while (v.length < SERIES_HEADERS.length) v.push('');
    v[SC.KEY - 1] = 'k' + i; v[SC.NAME - 1] = 'سری' + i; v[SC.STATUS - 1] = SST.NEW;
    v[SC.FOLDER - 1] = f.getId();
    sh.appendRow(v);
  }
  const un = quiet(); const r = handoutVizSweep_(10, 60000); un();
  ok('۵.۱ جارو فصل‌های کتاب‌های قدیمی را پر کرد', r.made >= 2 && r.series === 2,
     JSON.stringify(r));
  ok('۵.۲ نتیجه برای سطرِ روزانه ثبت شد و خط دارد',
     hvizStatus_().line.indexOf('نمودارهای جزوه') === 0, hvizStatus_().line);
  const un2 = quiet(); const r2 = handoutVizSweep_(10, 60000); un2();
  ok('۵.۳ دورِ دوم چیزی نمی‌سازد (همه هم‌امضا)', r2.made === 0, JSON.stringify(r2));
}

console.log('\n=== ۶) ثبت، پیگیری، هشدار — نه فقط یک سطرِ فراموش‌شونده ===');
{
  // مجموعهٔ تازه با کتابِ بی‌نمودار + مدلِ خواب
  global.geminiText_ = function () { return null; };
  const hub = getHub_();
  const sh = hub.getSheetByName(CFG.SERIES_TAB);
  const root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const f3 = root.createFolder('سری۳');
  f3.createFile(Utilities.newBlob(JSON.stringify(mkBook()), 'application/json', handoutJsonName_()));
  const v = []; while (v.length < SERIES_HEADERS.length) v.push('');
  v[SC.KEY - 1] = 'k3'; v[SC.NAME - 1] = 'سری۳'; v[SC.STATUS - 1] = SST.NEW;
  v[SC.FOLDER - 1] = f3.getId();
  sh.appendRow(v);
  const un = quiet();
  handoutVizSweep_(10, 60000);   // دورِ ۱: نوبت پر، هیچ ساخته نشد
  handoutVizSweep_(10, 60000);   // دورِ ۲
  const st2 = hvizStatus_();
  handoutVizSweep_(10, 60000);   // دورِ ۳ → یافته
  un();
  ok('۶.۱ تاریخچه نگه داشته می‌شود، نه فقط عکسِ آخر — «از کِی؟» جواب دارد',
     JSON.parse(props_().getProperty(PK.HVIZ_LAST)).length >= 4);
  ok('۶.۲ دو دورِ بد هنوز هشدار نیست (یک شبِ بد می‌تواند قطعیِ مدل باشد)',
     st2.ok === true && Number(props_().getProperty(PK.HVIZ_BAD)) >= 2, st2.line);
  const st3 = hvizStatus_();
  ok('۶.۳ سهمین دورِ پیاپی: سطرِ سلامت به «ایرادها» می‌رود',
     st3.ok === false && st3.line.indexOf('handout-viz-stuck') !== -1, st3.line);
  const rp = hub.getSheetByName(CFG.REPORT_TAB);
  const rows = rp ? rp.getRange(1, 1, rp.getLastRow(), rp.getLastColumn()).getValues() : [];
  ok('۶.۴ و یافتهٔ ماندگار در صفِ گزارش‌هاست — سطرِ ایمیل فردا جایگزین می‌شود، یافته نه',
     rows.some(r => r.join(' ').indexOf('handout-viz-stuck') !== -1));
  // دورِ موفق، شمارنده را صفر می‌کند
  global.geminiText_ = function () {
    return { recap: { kind: 'کارت‌ها', items: [{ label: 'آ' }, { label: 'ب' }] } };
  };
  for (const cc of JSON.parse(f3.getFilesByName(handoutJsonName_()).next().getBlob().getDataAsString()).chapters) {}
  const un3 = quiet();
  // دورِ چهارمِ خواب: تلاش‌های سری۳ به سقف می‌رسند و فصل‌هایش «رهاشده» می‌شوند
  global.geminiText_ = function () { return null; };
  handoutVizSweep_(10, 60000);
  global.geminiText_ = function () {
    return { recap: { kind: 'کارت‌ها', items: [{ label: 'آ' }, { label: 'ب' }] } };
  };
  // و یک کتابِ چهارم که دورِ سازنده چیزی برای ساختن داشته باشد:
  const f4 = root.createFolder('سری۴');
  f4.createFile(Utilities.newBlob(JSON.stringify(mkBook()), 'application/json', handoutJsonName_()));
  const v4 = []; while (v4.length < SERIES_HEADERS.length) v4.push('');
  v4[SC.KEY - 1] = 'k4'; v4[SC.NAME - 1] = 'سری۴'; v4[SC.STATUS - 1] = SST.NEW;
  v4[SC.FOLDER - 1] = f4.getId();
  sh.appendRow(v4);
  handoutVizSweep_(20, 60000);
  un3();
  ok('۶.۵ دورِ سازنده شمارندهٔ گیر را صفر می‌کند',
     !props_().getProperty(PK.HVIZ_BAD) && hvizStatus_().ok === true, hvizStatus_().line);
  ok('۶.۶ فصل‌های رهاشده در سطرِ روزانه با درِ بازشدنشان می‌آیند',
     hvizStatus_().line.indexOf('رهاشده') !== -1 &&
     hvizStatus_().line.indexOf('دکمهٔ جزوه') !== -1, hvizStatus_().line);
}

console.log('\n=== ۶ب) پاسخِ آمده ولی بی‌نمودار، علتش را می‌گوید (۶٫۶۲) ===');
{
  const book = mkBook();
  global.geminiText_ = function () { return { blah: 1, chart: [] }; };
  const un = quiet(); const r = handoutVizFill_(book, 2); un();
  ok('۶ب.۱ پاسخِ بدشکل «مدل جواب نداد» گزارش نمی‌شود؛ شکلش گفته می‌شود',
     r.why.indexOf('نمودارِ معتبری نداشت') !== -1 && r.why.indexOf('blah') !== -1, r.why);
  global.geminiText_ = function () {
    return { kind: 'کارت‌ها', items: [{ label: 'آ', to: 's1' }, { label: 'ب' }] };
  };
  const book2 = mkBook();
  const un2 = quiet(); handoutVizFill_(book2, 5); un2();
  ok('۶ب.۲ تک‌نمودار مسیرِ اصلی است — آماده‌سازی و مرور هر دو پر می‌شوند',
     !!(book2.chapters[0].viz && book2.chapters[0].viz.intro &&
        book2.chapters[0].viz.recap) &&
     book2.chapters[0].viz.recap.items.length === 2);
  ok('۶ب.۳ و پرامپت قراردادِ تک‌نمودار را با مثال در خودش دارد',
     (function () {
       let seen = '';
       global.geminiText_ = function (pr) { seen = pr; return null; };
       const un3 = quiet(); handoutVizFill_(mkBook(), 1); un3();
       return seen.indexOf('{"kind":"نقشهٔ ذهنی"') !== -1 &&
              seen.indexOf('**یک** نمودار') !== -1;
     })());
}

console.log('\n=== ۶پ) بدشکلی‌های رایجِ مدل تحمل می‌شوند (۶٫۶۴) ===');
{
  const idsOk = hvizIds_(mkBook());
  const asStr = hvizClean_(JSON.stringify({ kind: 'کارت‌ها',
    items: [{ label: 'آ', to: 's1' }, { label: 'ب' }] }), idsOk);
  ok('۶پ.۱ نمودارِ رشته‌شده باز می‌شود', !!asStr && asStr.items.length === 2);
  const strItems = hvizClean_({ kind: 'روندنما', items: ['گامِ یک', 'گامِ دو', 'گامِ سه'] }, idsOk);
  ok('۶پ.۲ آرایهٔ رشته‌ای، گره می‌شود', !!strItems && strItems.items[0].label === 'گامِ یک');
  global.geminiText_ = function () { return { intro: { kind: 'x' } }; };
  const un = quiet(); const r = handoutVizFill_(mkBook(), 1); un();
  ok('۶پ.۳ علتِ رد، نمونهٔ خودِ پاسخ را نشان می‌دهد',
     r.why.indexOf('نمونهٔ پاسخ') !== -1 && r.why.indexOf('kind') !== -1, r.why);
}

console.log('\n=== ۷) نقشهٔ راهِ جزوهٔ تمام‌شده (۶٫۶۰) ===');
{
  /* عددِ ۷٪ که برای همیشه ماند: meta.progress از SC.CUR_CHUNK پر می‌شد —
     قطعهٔ جاریِ قسمتِ جاری، نه پیشرفتِ کل. */
  global.geminiText_ = function () { return null; };
  const hub = getHub_();
  const ps = ensureTab_(hub, CFG.SERIES_PART_TAB, SPART_HEADERS);
  const mkPart = (key, file, chunks, doneTo) => {
    const v = []; while (v.length < SPART_HEADERS.length) v.push('');
    v[SP.KEY - 1] = key; v[SP.FILE - 1] = file; v[SP.CHUNKS - 1] = chunks;
    v[SP.DONE_TO - 1] = doneTo; ps.appendRow(v);
  };
  mkPart('kd', 'f1', 100, 100);
  mkPart('kd', 'f2', 106, 106);
  const pr = handoutProgressOf_(hub, 'kd');
  ok('۷.۱ پیشرفتِ واقعی جمعِ «تا کجا»ی همهٔ قسمت‌هاست', pr.done === 206 && pr.total === 206,
     JSON.stringify(pr));
  ok('۷.۲ و قسمتِ تمام‌شده بیش از خودش نمی‌شمرد',
     (mkPart('kd2', 'g', 50, 90), handoutProgressOf_(hub, 'kd2').done === 50));
  // مجموعهٔ تمام‌شده با کتابِ نقشهٔ‌راهِ کهنه — جاروی شبانه باید تازه‌اش کند
  const root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const fd = root.createFolder('تمام‌شده');
  const bk = mkBook();
  bk.roadmap = { intro: 'م', stages: [{ title: 'آ', outcome: 'ب', state: 'در جریان' },
                                       { title: 'پ', outcome: 'ت', state: 'پیشِ رو' }],
                 progress: { done: '15', total: '206', pct: '7' } };
  // فصل‌هایش را از پیش نموداردار می‌کنیم تا فقط اثرِ نقشهٔ راه سنجیده شود
  for (const cc of bk.chapters) cc.viz = { sig: hvizSig_(cc), at: 'x' };
  fd.createFile(Utilities.newBlob(JSON.stringify(bk), 'application/json', handoutJsonName_()));
  const sh7 = hub.getSheetByName(CFG.SERIES_TAB);
  const v7 = []; while (v7.length < SERIES_HEADERS.length) v7.push('');
  v7[SC.KEY - 1] = 'kd'; v7[SC.NAME - 1] = 'تمام‌شده'; v7[SC.STATUS - 1] = SST.DONE;
  v7[SC.FOLDER - 1] = fd.getId();
  sh7.appendRow(v7);
  const un7 = quiet(); handoutVizSweep_(10, 60000); un7();
  const bk2 = JSON.parse(fd.getFilesByName(handoutJsonName_()).next().getBlob().getDataAsString());
  ok('۷.۳ جارو نقشهٔ راهِ کتابِ تمام‌شده را ۱۰۰٪ کرد',
     bk2.roadmap.progress.pct === '100', JSON.stringify(bk2.roadmap.progress));
  ok('۷.۴ و همهٔ مرحله‌ها «انجام‌شده» شدند',
     bk2.roadmap.stages.every(x => x.state === 'انجام‌شده'),
     bk2.roadmap.stages.map(x => x.state).join('،'));
  const html7 = fd.getFilesByName(handoutHtmlName_(bk2.seriesName)).hasNext();
  ok('۷.۵ و جزوهٔ تازه رندر شد (فقط برای نقشهٔ راه هم رندر لازم است)', html7);
}

console.log('\n=== ۸) وِن — گونهٔ تازه، با شکلِ واقعیِ خودش (۶٫۷۲) ===');
{
  ok('۸.۱ مترادف‌ها به «وِن» می‌رسند',
     hvizKindOf_('وِن') === 'وِن' && hvizKindOf_('ون') === 'وِن' &&
     hvizKindOf_('Venn') === 'وِن' && hvizKindOf_('ون دیاگرام') === 'وِن' &&
     hvizKindOf_('هم‌پوشانی') === 'وِن');
  const idsOk = hvizIds_(mkBook());
  const dV = hvizClean_({ kind: 'وِن', title: 'معرفت', items: [
    { label: 'باور', group: 'ذهن', to: 's1' },
    { label: 'صدق', group: 'جهان', to: 's2' },
    { label: 'باورِ صادقِ موجه', group: 'مشترک', to: 's1' }
  ] }, idsOk);
  ok('۸.۲ وِنِ دوناحیه‌ای پذیرفته می‌شود', dV && dV.kind === 'وِن');
  const hV = hvizHtml_(dV, '');
  ok('۸.۳ رندر، دایره‌های واقعی است: دو دایرهٔ تزئینی + سه ناحیهٔ متن',
     hV.indexOf('hvz-vd2') !== -1 &&
     hV.indexOf('hvca') !== -1 && hV.indexOf('hvcb') !== -1 &&
     hV.indexOf('hvz-za') !== -1 && hV.indexOf('hvz-zm') !== -1 &&
     hV.indexOf('hvz-zb') !== -1);
  ok('۸.۳-الف و عدسی به اسم می‌گوید مشترکِ کدام دوتاست، نه فقط «مشترک»',
     hV.indexOf('مشترکِ ذهن و جهان') !== -1);
  ok('۸.۳-ب و نامِ هر دایره برچسبِ بیرونی دارد — مثلِ مرجعِ صاحبِ برنامه',
     hV.indexOf('hvn-tag hvt-a') !== -1 && hV.indexOf('hvn-tag hvt-b') !== -1);
  ok('۸.۴ گره‌هایش کلیک‌شو به لنگرِ واقعی‌اند',
     hV.indexOf('href="#s1"') !== -1 && hV.indexOf('href="#s2"') !== -1);
  ok('۸.۵ وِنِ تک‌ناحیه، وِن نیست — به کارت‌ها می‌افتد',
     hvizClean_({ kind: 'وِن', items: [{ label: 'آ' }, { label: 'ب' }] },
                idsOk).kind === 'کارت‌ها');
  ok('۸.۵-ب سه دایره هم کشیده می‌شود؛ بیش از سه، صادقانه نیست و تقابل می‌شود',
     (function () {
       const it = (g) => ({ label: 'x', group: g });
       const d3 = hvizClean_({ kind: 'وِن', items: [it('الف'), it('ب'), it('ج'),
                                                    it('مشترک')] }, idsOk);
       const h3 = hvizHtml_(d3, '');
       const d4 = hvizClean_({ kind: 'وِن', items: [it('الف'), it('ب'), it('ج'),
                                                    it('د')] }, idsOk);
       return d3.kind === 'وِن' && h3.indexOf('hvz-vd3') !== -1 &&
              h3.indexOf('hvcc') !== -1 && h3.indexOf('hvz-zc') !== -1 &&
              d4.kind === 'تقابل';
     })());
  ok('۸.۶ و CSSِ دایره‌ها و ناحیه‌ها در برگِ سبک هست',
     HANDOUT_CSS_.indexOf('.hvca{') !== -1 && HANDOUT_CSS_.indexOf('.hvz-vd2 .hvz-zm{') !== -1 &&
     HANDOUT_CSS_.indexOf('.hvk-venn') !== -1 &&
     HANDOUT_CSS_.indexOf('aspect-ratio:1;border-radius:50%') !== -1);

  /* «اصلاً مشخص نمی‌کنه چی بین کدوم دایره‌ها مشترکه» — سه‌دایره‌ای باید هر
     هفت ناحیه را جدا بکشد: اختصاصی‌ها، سه عدسیِ دوبه‌دو، و مرکزِ هر سه. */
  const it7 = (l, g) => ({ label: l, group: g });
  const d7 = hvizClean_({ kind: 'وِن', items: [
    it7('درون‌نگری', 'تجربه'), it7('بداهت', 'عقل'), it7('تواتر', 'گواهی'),
    it7('علومِ تجربی', 'تجربه و عقل'), it7('تاریخ', 'تجربه و گواهی'),
    it7('ریاضیاتِ آموخته', 'عقل و گواهی'), it7('باورِ موجه', 'مشترک')
  ] }, idsOk);
  ok('۸.۷-الف مشترکِ دوبه‌دو، دایرهٔ چهارم شمرده نمی‌شود — وِن می‌مانَد',
     d7 && d7.kind === 'وِن');
  const h7 = hvizHtml_(d7, '');
  ok('۸.۷-ب هر جفت در عدسیِ هندسیِ خودش می‌نشیند',
     h7.indexOf('hvz-zab') !== -1 && h7.indexOf('hvz-zac') !== -1 &&
     h7.indexOf('hvz-zbc') !== -1);
  ok('۸.۷-پ و هر عدسی به اسم می‌گوید مالِ کدام دوتاست',
     h7.indexOf('مشترکِ تجربه و عقل') !== -1 &&
     h7.indexOf('مشترکِ تجربه و گواهی') !== -1 &&
     h7.indexOf('مشترکِ عقل و گواهی') !== -1);
  ok('۸.۷-ت و مرکز، «مشترکِ هر سه» است',
     h7.indexOf('مشترکِ هر سه') !== -1 && h7.indexOf('باورِ موجه') !== -1);
  ok('۸.۷-ث «مشترکِ الف و ب»ِ صریح هم به همان عدسیِ جفت می‌رود',
     (function () {
       const dx = hvizClean_({ kind: 'وِن', items: [
         it7('آ', 'تجربه'), it7('ب', 'عقل'), it7('ج', 'گواهی'),
         it7('د', 'مشترکِ تجربه و عقل')
       ] }, idsOk);
       return hvizHtml_(dx, '').indexOf('hvz-zab') !== -1;
     })());
  ok('۸.۷ پرامپت وِن را با جای کاربردش معرفی می‌کند',
     (function () {
       let seen = '';
       global.geminiText_ = function (pr) { seen = pr;
         return { kind: 'وِن', items: [{ label: 'آ', group: 'یک' }, { label: 'ب', group: 'مشترک' }] }; };
       const un = quiet(); handoutVizFill_(mkBook(), 1); un();
       return seen.indexOf('«وِن»') !== -1 && seen.indexOf('باورِ صادقِ موجه') !== -1;
     })());
}

console.log('\n=== ۹) ترازِ گونه‌ها و بازتنوع (۶٫۷۲) ===');
{
  /* دادهٔ واقعی که این را لازم کرد: از ۵۳ نمودارِ جزوهٔ «معرفت‌شناسی»،
     ۲۰ سلسله‌مراتب + ۱۸ تقابل = ۷۲٪؛ روندنما ۴، چرخه ۲، وِن صفر. */
  const mkMono = () => {
    const b = mkBook();
    // شش فصل، همه با نمودارِ هم‌گونه — یکنواختیِ واقعی
    b.chapters = [];
    for (let i = 0; i < 6; i++) {
      b.chapters.push({ id: 'c' + i, title: 'فصل ' + i,
        sections: [{ id: 'cs' + i, title: 'ب', body: 'متن. '.repeat(30), refs: [], adds: [] }],
        viz: { sig: hvizSig_({ id: 'c' + i, title: 'فصل ' + i, sections: [] }),
               intro: { kind: 'سلسله‌مراتب', items: [{ label: 'آ' }, { label: 'ب' }] },
               recap: { kind: 'سلسله‌مراتب', items: [{ label: 'آ' }, { label: 'ب' }] },
               secDone: true, secs: [] } });
    }
    return b;
  };

  const cs = hvizCensus_(mkMono());
  ok('۹.۱ سرشماری درست می‌شمارد', cs.total === 12 && cs.by['سلسله‌مراتب'] === 12,
     JSON.stringify(cs.by));

  // ── تراز به پرامپت می‌رسد ──
  let seenP = '';
  global.geminiText_ = function (pr) { seenP = pr;
    return { kind: 'روندنما', items: [{ label: 'آ' }, { label: 'ب' }] }; };
  const bMono = mkMono();
  bMono.chapters.push({ id: 'c9', title: 'فصلِ تازه',
    sections: [{ id: 'cs9', title: 'ب', body: 'متن. '.repeat(30), refs: [], adds: [] }] });
  const un1 = quiet(); handoutVizFill_(bMono, 1); un1();
  ok('۹.۲ پرامپتِ فصلِ تازه ترازِ کلِ کتاب را می‌گوید',
     seenP.indexOf('ترازِ گونه‌ها در کلِ این جزوه') !== -1 &&
     seenP.indexOf('سلسله‌مراتب ۱۲') !== -1);
  ok('۹.۳ و گونهٔ چیره را با نام می‌گوید که جز در ناگزیری نرود',
     seenP.indexOf('سهمِ بزرگی') !== -1);
  ok('۹.۴ و گونه‌های هنوز نیامده را پیش می‌کشد — وِن و روندنما جایشان همین‌جاست',
     seenP.indexOf('هنوز هیچ‌جا نیامده‌اند') !== -1 && seenP.indexOf('«وِن»') !== -1);

  // ── بازتنوع: فقط جای چیرگی، جوابِ هم‌گونه پذیرفته نمی‌شود ──
  let asked = 0;
  global.geminiText_ = function (pr) { asked++;
    return { kind: 'روندنما', items: [{ label: 'گام', to: '' }, { label: 'گامِ دو' }] }; };
  const b2 = mkMono();
  const un2 = quiet(); const dv = hvizDiversify_(b2, 2); un2();
  ok('۹.۵ گونهٔ چیره شناخته و تا سقفِ داده‌شده از نو پرسیده می‌شود',
     dv.dominant === 'سلسله‌مراتب' && dv.calls === 2 && dv.redone === 2,
     JSON.stringify(dv));
  ok('۹.۶ جایگزین واقعاً در کتاب نشست و گونه‌اش فرق دارد',
     b2.chapters.filter(c => c.viz && c.viz.recap &&
                             c.viz.recap.kind === 'روندنما').length === 2);
  global.geminiText_ = function () {
    return { kind: 'سلسله‌مراتب', items: [{ label: 'آ' }, { label: 'ب' }] }; };
  const b3 = mkMono();
  const un3 = quiet(); const dv2 = hvizDiversify_(b3, 2); un3();
  ok('۹.۷ جوابِ هم‌گونه پذیرفته نمی‌شود — نمودارِ قبلی می‌مانَد و تلاش شمرده می‌شود',
     dv2.redone === 0 &&
     b3.chapters[0].viz.recap.kind === 'سلسله‌مراتب' &&
     Number(b3.chapters[0].viz.divTried.n) === 1, JSON.stringify(dv2));
  const un3b = quiet(); hvizDiversify_(b3, 2); hvizDiversify_(b3, 2); un3b();
  const exhausted = b3.chapters.every(c => Number((c.viz.divTried || {}).n || 0) >= 2 ||
                                           !c.viz.divTried);
  ok('۹.۸ و پس از سقفِ تلاش، آن فصل دیگر برای تنوع پرسیده نمی‌شود',
     (function () { let n = 0;
       global.geminiText_ = function () { n++;
         return { kind: 'سلسله‌مراتب', items: [{ label: 'آ' }, { label: 'ب' }] }; };
       const unq = quiet(); const d4 = hvizDiversify_(b3, 9); unq();
       // شش فصل × سقفِ ۲ تلاش = ۱۲؛ چهار بارِ قبلی رفته، پس اینجا ۸ می‌ماند
       return d4.calls <= 8 && exhausted !== undefined;
     })());

  const bBal = mkMono();
  bBal.chapters.forEach((c, i) => {
    if (i % 2) { c.viz.intro.kind = 'روندنما'; c.viz.recap.kind = 'وِن'; }
    else { c.viz.recap.kind = 'تقابل'; }
  });
  const dv3 = hvizDiversify_(bBal, 2);
  ok('۹.۹ کتابِ متوازن اصلاً پرسیده نمی‌شود — دروازه خودش بسته می‌شود',
     dv3.calls === 0 && dv3.share < 0.5, JSON.stringify(dv3));
  ok('۹.۱۰ و کتابِ کم‌نمودار هم نه — یکنواختیِ سه‌تایی معنا ندارد',
     hvizDiversify_({ chapters: [{ id: 'a', title: 't', sections: [],
       viz: { intro: { kind: 'تقابل', items: [] }, recap: null, secDone: true, secs: [] } }] },
       2).calls === 0);

  // ── سیم‌کشی: جارو و دکمه هر دو بازتنوع را صدا می‌زنند ──
  const p26v = fs.readFileSync('src/26_Handout.gs', 'utf8');
  ok('۹.۱۱ جاروی شبانه با ته‌ماندهٔ بودجه بازتنوع می‌کند و ساخته‌ها را رندر',
     /dv = hvizDiversify_\(book, Math\.min\(2, cap - out\.calls\)\)/.test(p26v) &&
     /r\.made \|\| rmCh2 \|\| fx \|\| dv\.redone/.test(p26v));
  ok('۹.۱۲ دکمهٔ مجموعه هم — و رسیدش ترازِ گونه‌ها را می‌گوید',
     /dvb = hvizDiversify_\(book, 4\)/.test(p26v) &&
     /گونه‌های این جزوه اکنون: /.test(p26v));
  ok('۹.۱۳ نمودارِ میانی گونه‌های همین فصل را در avoid می‌گیرد',
     /avSec\.join\('» و «'\)/.test(p26v));
}

console.log('\n✅ هر ' + pass + ' آزمونِ نمودارهای جزوه گذشت.');
