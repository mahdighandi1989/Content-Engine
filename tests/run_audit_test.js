/* دیدبانِ محتوا (بخشِ ۲۴) — متنِ نهایی در برابرِ متنِ خام.
 *
 * چرا آزمونِ جدا: اینجا دو چیز می‌تواند بی‌صدا خراب شود. یکی اینکه عکس‌برداری
 * انجام نشود (آن‌وقت فردا هیچ‌چیز برای داوری نیست و کسی خبردار نمی‌شود)، و
 * دیگری اینکه یافتهٔ مدل به مسیرِ کد برود یا برعکس — که یعنی یا هر شب یک
 * نسخهٔ بی‌مورد ساخته می‌شود، یا ایرادِ واقعیِ سازوکار تا ابد به مدل تذکر
 * داده می‌شود بی‌آنکه مدل بتواند کاری بکند.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const names = fo => { const it = fo.getFiles(), a = []; while (it.hasNext()) a.push(it.next().getName()); return a; };

/* یک قسمتِ نمونه: سه بخش، که بخشِ سوم عمداً بی‌منبع است. */
const EP = {
  hook: 'سلام. قلاب.', outro: 'پایان.', connection: 'پیوند.',
  sections: [
    { heading: 'گربه روی دیوار', narration: 'گربه‌ای از دیوار بالا رفت و پایین آمد.', sourceIds: ['V1'] },
    { heading: 'بازار طلا', narration: 'قیمت طلا امروز بالا رفت.', sourceIds: ['P2'] },
    { heading: 'بی‌منبع', narration: 'این بخش از هیچ‌جا نیامده.', sourceIds: [] }
  ]
};
const ITEMS = [
  { id: 'V1', kind: 'ویدیو', topic: 'گربه', msg: 'گربه از دیوار بالا رفت', summary: 'خلاصهٔ گربه', body: 'ب'.repeat(4000) },
  { id: 'P2', kind: 'عکس', topic: 'طلا', msg: 'قیمت طلا', summary: 'خلاصهٔ طلا', body: 'ط'.repeat(50) }
];

console.log('=== ۱) عکس‌برداری در لحظهٔ تولید ===');
{
  const snap = auditSnap_('variety',
    { showName: CFG.SHOW_NAME, episode: 7, title: 'عنوان', category: 'طنز و سرگرمی', targetMin: 10 },
    EP, ITEMS, [{ kind: 'جملهٔ بلند', section: 'الف', text: 'نمونه' }]);
  ok('۱.۱ عکس ساخته شد', !!snap);
  ok('۱.۲ در پوشهٔ خودش می‌نشیند، نه در ریشه',
     names(auditFolder_()).indexOf('_AUDIT-variety-007.json') !== -1);
  const root = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  ok('۱.۳ ریشه شلوغ نمی‌شود',
     names(root).filter(n => n.indexOf('_AUDIT-') === 0).length === 0);
  ok('۱.۴ هر سه بخش با روایت و شناسه ذخیره شده‌اند',
     snap.sections.length === 3 && snap.sections[0].ids[0] === 'V1');
  ok('۱.۵ متنِ خام هم ذخیره شده — بی آن، فردا چیزی برای مقایسه نیست',
     !!snap.sources['V1'] && snap.sources['V1'].topic === 'گربه');
  ok('۱.۶ متنِ خامِ بلند بریده می‌شود (سقفِ حجمِ عکس)',
     snap.sources['V1'].body.length === CFG.AUDIT_BODY_MAX, String(snap.sources['V1'].body.length));
  ok('۱.۷ نشانه‌های واژه‌ایِ همان لحظه هم همراهش می‌آیند', snap.lex.length === 1);
}

console.log('=== ۲) وارسیِ قطعی: اِسناد ===');
{
  const snap = auditReadJson_(auditFolder_().getFilesByName('_AUDIT-variety-007.json').next());
  const det = auditDeterministic_(snap);
  ok('۲.۱ بخشِ بی‌منبع شمرده می‌شود', det.noSrc === 1, JSON.stringify(det));
  ok('۲.۲ درصدِ اِسناد درست است', det.attribPct === 67, String(det.attribPct));
  ok('۲.۳ اِسنادِ سالم شکسته شمرده نمی‌شود', det.broken === 0);

  // شناسه‌ای که در منابع نیست = اِسنادِ شکسته
  const bad = JSON.parse(JSON.stringify(snap));
  bad.sections[0].ids = ['V1', 'GHOST'];
  const det2 = auditDeterministic_(bad);
  ok('۲.۴ شناسهٔ ناموجود گرفته می‌شود', det2.broken === 1 && det2.brokenIds[0] === 'GHOST');
}

console.log('=== ۳) شمارشِ برچسب‌های مدل ===');
{
  const secs = EP.sections;
  const tal = auditTally_({ verdict: 'ضعیف', sections: [
    { i: '0', fit: 'مناسب', linked: 'واقعی', faithful: 'وفادار', why: 'خوب' },
    { i: '1', fit: 'نامناسب', linked: 'ساختگی', faithful: 'فراتر', why: 'انگیزه‌ای به عکس نسبت داده شده' }
  ] }, secs);
  ok('۳.۱ هر سه ایراد جدا شمرده می‌شوند',
     tal.unfit === 1 && tal.fake === 1 && tal.unfaith === 1, JSON.stringify(tal));
  ok('۳.۲ بدترین نمونه با نامِ بخش می‌آید',
     tal.worst.indexOf('بازار طلا') !== -1, tal.worst);
  const good = auditTally_({ sections: [
    { i: '0', fit: 'مناسب', linked: 'واقعی', faithful: 'وفادار', why: '' }] }, secs);
  ok('۳.۳ کارِ درست علامت نمی‌خورد',
     good.unfit === 0 && good.fake === 0 && good.unfaith === 0 && !good.worst);
  const fa = auditTally_({ sections: [
    { i: '۱', fit: 'نامناسب', linked: 'واقعی', faithful: 'وفادار', why: 'ی' }] }, secs);
  ok('۳.۴ شمارهٔ بخش با رقمِ فارسی هم خوانده می‌شود',
     fa.worst.indexOf('بازار طلا') !== -1, fa.worst);
}

console.log('=== ۴) دو مسیرِ اصلاح، و مرزشان ===');
{
  const hub = getHub_();
  const rt = () => {
    const sh = hub.getSheetByName(CFG.REPORT_TAB);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues();
  };
  const before = rt().length;

  // ایرادِ نگارش → مسئولش موتور است، پس دستور می‌گیرد و به قسمت بعد می‌رود
  auditFindings_(hub, { show: 'variety', showName: 'ب', episode: 7 },
    { sections: 3, noSrc: 0, broken: 0, brokenIds: [], attribPct: 100 },
    { unfit: 0, fake: 1, unfaith: 2, worst: 'نمونه' },
    { verdict: 'ضعیف', advice: 'کمتر تفسیر کن' });
  let rows = rt().slice(before);
  ok('۴.۱ ایرادِ نگارش یک ردیف ساخت', rows.length === 1);
  ok('۴.۲ مسئولش «موتور» است، نه کد',
     String(rows[0][RC.OWNER - 1]) === ROWNER_ENGINE, String(rows[0][RC.OWNER - 1]));
  ok('۴.۳ و دستور دارد، پس در قسمت بعد به پرامپت می‌رود',
     String(rows[0][RC.INSTR - 1]).length > 20);
  ok('۴.۴ وضعیتش «نیازمند تعویض کد» نیست',
     String(rows[0][RC.STATUS - 1]) !== RST.NEEDS_CODE, String(rows[0][RC.STATUS - 1]));

  // ایرادِ سازوکار → باید به صفِ تعویضِ کد برود
  const before2 = rt().length;
  auditFindings_(hub, { show: 'variety', showName: 'ب', episode: 8 },
    { sections: 3, noSrc: 0, broken: 2, brokenIds: ['GHOST', 'X9'], attribPct: 100 },
    null, null);
  const rows2 = rt().slice(before2);
  ok('۴.۵ اِسنادِ شکسته یک ردیف ساخت', rows2.length === 1);
  ok('۴.۶ و این یکی به صفِ تعویضِ کد می‌رود',
     String(rows2[0][RC.STATUS - 1]) === RST.NEEDS_CODE, String(rows2[0][RC.STATUS - 1]));
  ok('۴.۷ مسئولش «کد» است',
     String(rows2[0][RC.OWNER - 1]) === ROWNER_CODE, String(rows2[0][RC.OWNER - 1]));
}

console.log('=== ۵) اِسنادِ ضعیف: یک شب اتفاق است، چند شب خرابی ===');
{
  const hub = getHub_();
  const cnt = () => {
    const sh = hub.getSheetByName(CFG.REPORT_TAB);
    if (!sh || sh.getLastRow() < 2) return 0;
    return sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues()
      .filter(r => String(r[RC.TITLE - 1]).indexOf('اِسنادِ منبع') === 0).length;
  };
  global.__PROPS[PK.AUDIT_BAD] = '0';
  const weak = { sections: 4, noSrc: 3, broken: 0, brokenIds: [], attribPct: 25 };
  auditFindings_(hub, { show: 'v', showName: 'ب', episode: 1 }, weak, null, null);
  ok('۵.۱ شبِ اول یافتهٔ کد نمی‌سازد', cnt() === 0);
  auditFindings_(hub, { show: 'v', showName: 'ب', episode: 2 }, weak, null, null);
  ok('۵.۲ شبِ دوم هم نه', cnt() === 0);
  auditFindings_(hub, { show: 'v', showName: 'ب', episode: 3 }, weak, null, null);
  ok('۵.۳ شبِ سوم می‌سازد', cnt() === 1, 'شمارنده: ' + global.__PROPS[PK.AUDIT_BAD]);
  // یک شبِ سالم شمارنده را صفر می‌کند، وگرنه یک بدشانسیِ قدیمی تا ابد می‌ماند
  auditFindings_(hub, { show: 'v', showName: 'ب', episode: 4 },
    { sections: 4, noSrc: 0, broken: 0, brokenIds: [], attribPct: 100 }, null, null);
  ok('۵.۴ شبِ سالم شمارنده را صفر می‌کند',
     String(global.__PROPS[PK.AUDIT_BAD]) === '0', String(global.__PROPS[PK.AUDIT_BAD]));
}

console.log('=== ۶) یک دورِ کامل، با مدلِ ساختگی ===');
{
  global.__STUB = function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] } };
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      verdict: 'قابل قبول', advice: 'کمتر تفسیر کن',
      sections: [
        { i: '0', fit: 'مناسب', linked: 'واقعی', faithful: 'وفادار', why: 'درست' },
        { i: '1', fit: 'مناسب', linked: 'ساختگی', faithful: 'فراتر', why: 'ادعای بی‌پایه' },
        { i: '2', fit: 'نامعلوم', linked: 'نامعلوم', faithful: 'نامعلوم', why: 'بی‌منبع' }
      ] }) }] } }] } };
  };
  const r = auditRun_(5);
  ok('۶.۱ یک قسمت داوری شد', r.done === 1, JSON.stringify(r.results));
  const x = r.results[0];
  ok('۶.۲ نتیجه هر دو جنسِ سنجه را دارد',
     x.attribPct === 67 && x.unfaith === 1 && x.fake === 1, JSON.stringify(x));
  const sh = getHub_().getSheetByName(CFG.TAB_AUDIT);
  ok('۶.۳ تبِ «سنجهٔ محتوا» ساخته شد', !!sh);
  const row = sh.getRange(2, 1, 1, AUDIT_HEADERS.length).getValues()[0];
  ok('۶.۴ ردیفش نامِ برنامه و شمارهٔ قسمت را دارد',
     String(row[AC.EP - 1]) === '7' && String(row[AC.SHOW - 1]) === CFG.SHOW_NAME);
  ok('۶.۵ و داوری و درصدِ اِسناد', String(row[AC.VERDICT - 1]) === 'قابل قبول' &&
     String(row[AC.ATTRIB - 1]) === '67٪', String(row[AC.ATTRIB - 1]));
  ok('۶.۶ دورِ دوم همان عکس را دوباره داوری نمی‌کند', auditRun_(5).done === 0);
}

console.log('=== ۷) هر پادکستِ آینده، بی تغییرِ کد ===');
{
  // هیچ‌جای این بخش فهرستی از برنامه‌ها نیست. یک کلیدِ ناشناخته باید همان‌قدر
  // کار کند که «variety» می‌کند — وگرنه ادعای «هر پادکستِ بعدی» توخالی است.
  auditSnap_('podcast-tazeh',
    { showName: 'برنامهٔ تازه', episode: 1, title: 'ت', category: 'د', targetMin: 12 },
    { hook: 'ه', outro: 'پ', sections: [
      { heading: 'الف', narration: 'متن.', sourceIds: ['V1'] }] }, ITEMS, []);
  const r = auditRun_(5);
  ok('۷.۱ برنامهٔ ناشناخته هم داوری شد', r.done === 1, JSON.stringify(r.results));
  ok('۷.۲ با نامِ خودش ثبت شد', r.results[0].showName === 'برنامهٔ تازه');
}

console.log('=== ۸) مرزها ===');
{
  ok('۸.۱ پوشهٔ عکس‌ها در وارسیِ چیدمان شناخته است',
     outRootFolderNames_().indexOf(CFG.AUDIT_FOLDER) !== -1);
  const lay = outLayoutCheck_();
  ok('۸.۲ پس سرگردان شمرده نمی‌شود',
     lay.strays.map(s => s.name).indexOf(CFG.AUDIT_FOLDER) === -1,
     lay.strays.map(s => s.name).join(' · '));
  ok('۸.۳ در schema هیچ number/integer/boolean نیست',
     !/"(number|integer|boolean)"/.test(JSON.stringify(AUDIT_SCHEMA)));
  ok('۸.۴ وضعیت برای ناظر خلاصه می‌سازد', !!auditStatus_().lastAt);

  // فراخوانِ رو به جلو (۳ و ۱۴ → ۲۴) باید در try/catch باشد، وگرنه بارگذارِ
  // جزئیِ آزمون‌ها با ReferenceError می‌شکند.
  const p3 = fs.readFileSync('src/03_Producer.gs', 'utf8');
  const p14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۸.۵ فراخوانِ عکس‌برداری در تولید، در try است',
     /try\s*\{\s*\n\s*auditSnap_\(ENRICH_SHOW_VARIETY/.test(p3));
  ok('۸.۶ و در درس‌نامه هم', /try\s*\{\s*\n\s*auditSnap_\(ENRICH_SHOW_SPECIAL/.test(p14));

  const nBefore = names(auditFolder_()).length;
  const oldF = auditFolder_().getFilesByName('_AUDIT-variety-007.json').next();
  oldF._created = new Date(Date.now() - 400 * 86400000); oldF._updated = oldF._created;
  ok('۸.۷ عکسِ کهنه هرس می‌شود', auditPrune_(45) === 1);
  ok('۸.۸ و بقیه می‌مانند', names(auditFolder_()).length === nBefore - 1);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
