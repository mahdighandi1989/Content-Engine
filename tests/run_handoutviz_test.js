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
  const flow = hvizHtml_({ kind: 'روندنما', items: [{ label: 'آ' }, { label: 'ب' }] }, '');
  ok('۳.۷ روندنما بینِ گام‌ها فلش دارد', flow.indexOf('hvz-ar') !== -1);
  const cyc = hvizHtml_({ kind: 'چرخه', items: [{ label: 'آ' }, { label: 'ب' }] }, '');
  ok('۳.۸ چرخه نشانِ بازگشت به آغاز دارد', cyc.indexOf('hvz-loop') !== -1);
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
     r.calls === 2 && r.made === 0 && !book.chapters[0].viz);
  // تا سقفِ تلاش، بعد رها
  handoutVizFill_(book, 5); handoutVizFill_(book, 5); handoutVizFill_(book, 5);
  const before = calls;
  r = handoutVizFill_(book, 5);
  ok('۴.۲ پس از ' + CFG.HANDOUT_TRY_MAX + ' تلاش، فصل رها می‌شود (فراخوانِ تازه نمی‌رود)',
     calls === before && r.gaveUp === 2, 'calls=' + calls + ' gaveUp=' + r.gaveUp);
  // مدل بیدار شد ولی فصل رهاست — تا امضا عوض شود
  give = { intro: { kind: 'نقشهٔ ذهنی', title: 'پیش‌نما',
                    items: [{ label: 'م', to: 'ch1' }, { label: 'ت', to: 's1' }, { label: 'گ', to: 's2' }] },
           recap: { kind: 'روندنما', items: [{ label: 'الف', to: 's1' }, { label: 'ب', to: 's2' }] },
           secs: [{ at: 's1', kind: 'تقابل',
                    items: [{ label: 'حس', group: 'حس' }, { label: 'عقل', group: 'عقل' }] },
                  { at: 'ناموجود', kind: 'کارت‌ها', items: [{ label: 'آ' }, { label: 'ب' }] }] };
  book.chapters[0].sections[0].adds = [{ body: 'تکمیل از درسِ بعد' }];   // امضا عوض شد
  r = handoutVizFill_(book, 5);
  ok('۴.۳ امضای تازه سابقهٔ رهاکردن را صفر می‌کند و فصل پر می‌شود',
     book.chapters[0].viz && !!book.chapters[0].viz.intro, JSON.stringify(r));
  ok('۴.۴ نمودارِ میان‌بخشی با شناسهٔ ساختگی نمی‌نشیند',
     book.chapters[0].viz.secs.length === 1 && book.chapters[0].viz.secs[0].at === 's1');
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
  ok('۴.۷ نمودارِ میان‌بخشی تهِ همان بخش است',
     html.indexOf('hvz-cmp') > html.indexOf('id="s1"') &&
     html.indexOf('hvz-cmp') < html.indexOf('id="s2"'));
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

console.log('\n✅ هر ' + pass + ' آزمونِ نمودارهای جزوه گذشت.');
