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
  /* «داخلِ try است» را باید از ساختار پرسید، نه از اینکه اولین دستورِ بلوک
     باشد: ۵٫۹۶ چند خط آماده‌سازی پیش از فراخوان گذاشت و این سنجه شکست،
     در حالی که مرز دست‌نخورده بود. سنجه‌ای که با یک کامنت بشکند، آنچه را
     می‌گوید نمی‌سنجد. */
  const inTry = (txt, call) => {
    const at = txt.indexOf(call);
    if (at === -1) return false;
    const before = txt.slice(0, at);
    const t = before.lastIndexOf('try {');
    if (t === -1) return false;
    // بینِ آن try و فراخوان نباید بلوکِ try دیگری بسته شده باشد
    return before.slice(t).indexOf('} catch') === -1;
  };
  ok('۸.۵ فراخوانِ عکس‌برداری در تولید، در try است',
     inTry(p3, 'auditSnap_(ENRICH_SHOW_VARIETY'));
  ok('۸.۶ و در درس‌نامه هم', inTry(p14, 'auditSnap_(ENRICH_SHOW_SPECIAL'));

  const nBefore = names(auditFolder_()).length;
  const oldF = auditFolder_().getFilesByName('_AUDIT-variety-007.json').next();
  oldF._created = new Date(Date.now() - 400 * 86400000); oldF._updated = oldF._created;
  ok('۸.۷ عکسِ کهنه هرس می‌شود', auditPrune_(45) === 1);
  ok('۸.۸ و بقیه می‌مانند', names(auditFolder_()).length === nBefore - 1);
}

console.log('=== ۹) اِسنادِ معتبر به refs نباید «شکسته» شمرده شود ===');
{
  // ۵٫۸۱ — scrubSourceIds_ در ۰۳ شناسه‌های items و refs را هر دو «معتبر»
  // می‌شمارد؛ اگر auditSnap_ فقط items بگیرد، بخشی که به یک refs اِسناد داده
  // به‌غلط «شکسته» می‌شود (قسمت ۱۵/۱۶: broken=2 با اینکه اسنادها معتبر بودند).
  const REFS = [
    { id: 'R9', kind: 'ویدیو', topic: 'قسمتِ پیشین', msg: 'ارجاع به قسمتِ پیشین',
      summary: 'خلاصهٔ ارجاع', body: 'ر'.repeat(50) }
  ];
  const EP2 = {
    hook: 'سلام.', outro: 'پایان.', connection: 'پیوند.',
    sections: [
      { heading: 'ارجاع به گذشته', narration: 'همان‌طور که پیش‌تر گفتیم…', sourceIds: ['R9'] }
    ]
  };
  const snap9 = auditSnap_('variety',
    { showName: CFG.SHOW_NAME, episode: 8, title: 'عنوان', category: 'طنز و سرگرمی', targetMin: 10 },
    EP2, ITEMS.concat(REFS), []);
  const det9 = auditDeterministic_(snap9);
  ok('۹.۱ شناسهٔ refs در عکس ذخیره می‌شود', !!snap9.sources['R9']);
  ok('۹.۲ اِسنادِ معتبر به refs شکسته شمرده نمی‌شود', det9.broken === 0, JSON.stringify(det9));

  // وارسیِ سیمِ فراخوان: محلِ واقعیِ تولید باید items و refs را با هم بدهد.
  const p3b = fs.readFileSync('src/03_Producer.gs', 'utf8');
  ok('۹.۳ فراخوانِ تولید، items و refs را با هم به عکس می‌دهد',
     /auditSnap_\(ENRICH_SHOW_VARIETY[\s\S]{0,700}items\.concat\(refs\), fid\);/.test(p3b));
}

console.log('=== ۱۰) درس‌نامه «آموزش» است، نه «گزارش» (۶٫۱۰) ===');
{
  /* ══ چرا این معیار جدا شد ══
     قسمت ۱۵ درس‌نامه هر شش بخشش هم «فراتر از خام» بود هم «پیوندِ ساختگی» —
     و یافته هر شب به قسمتِ بعد دستور می‌داد چیزی اضافه نکند، یعنی بازخوردی
     که درس را بدتر می‌کرد. صددرصد غلط‌بودنِ یک قسمت تقریباً همیشه یعنی
     معیار غلط است، نه متن. */
  const srcA = fs.readFileSync('src/24_ContentAudit.gs', 'utf8');
  const body = srcA.slice(srcA.indexOf('var isLesson ='),
                          srcA.indexOf("blocks.join('\\n\\n')"));
  ok('۹.۱ معیار به برنامه وابسته است، نه یکی برای هر دو',
     body.indexOf('isLesson ?') !== -1);
  ok('۹.۲ و درس‌نامه با ENRICH_SHOW_SPECIAL تشخیص داده می‌شود، نه با نام',
     srcA.indexOf('String(snap.show) === ENRICH_SHOW_SPECIAL') !== -1);
  /* آنچه معلم می‌کند نباید ایراد شمرده شود. */
  const lesson = body.slice(body.indexOf('isLesson ?'), body.indexOf('] : ['));
  ok('۹.۳ توضیح و مثال و ساده‌کردن «وفادار» شمرده می‌شوند',
     lesson.indexOf('مثال') !== -1 && lesson.indexOf('وفادارند') !== -1);
  ok('۹.۴ ولی ادعای بی‌ریشه همچنان «فراتر» است — سنجه از بین نرفته',
     lesson.indexOf('ریشه ندارد') !== -1);
  ok('۹.۵ و جمله‌های ربطِ آموزشی «ساختگی» شمرده نمی‌شوند',
     lesson.indexOf('کارِ معلم‌اند') !== -1);
  /* و معیارِ برنامهٔ ترکیبی دست‌نخورده مانده — یک اصلاح نباید دیگری را ببرد. */
  const variety = body.slice(body.indexOf('] : ['));
  ok('۹.۶ معیارِ «از همه جا از همه رنگ» دست‌نخورده است',
     variety.indexOf('یک کلیپ، یک عکس، یک سند') !== -1);
}

console.log('\n=== ۱۱) داورِ درس‌نامه متنِ کاملِ درس را می‌بیند (۸.۶۶) ===');
{
  /* ══ شاهد: `_AUDIT-special-062.json`ِ واقعی (درسِ ۴۰ِ آئودی) ══
   * C2 در عکس ۱۲۰۰ نویسه بود و دقیقاً با «درختان عظیم بلوط … را می‌بینم که تاب
   * می‌خورند» تمام می‌شد — نیمه‌کاره؛ داور از آن ۹۰۰ نویسه می‌دید. حکمِ ثبت‌شده:
   * «مثال مفصل وزش باد و تماشای درختان بلوط در متنِ خامِ ارائه‌شده (C1 و C2)
   * وجود ندارد و از متن اصلی کتاب که در تکه‌ها غایب است آورده شده است». قطعهٔ
   * درس تا ۱۴۰۰۰ نویسه است، پس مثالِ کتاب در نیمهٔ دومش «فراتر از خام» می‌شد. */
  const HEAD = '[صفحه ۲۰۵ / سرفصل‌های فصل] فصل ۹: ساختار و معماری معرفت. ';
  const OAK = 'بیرون از پنجره نگاه می‌کنم و درختان عظیم بلوط و لاله‌درختی را می‌بینم ' +
              'که تاب می‌خورند و برگ‌هایشان رو به بالا می‌چرخد؛ پس باور دارم باد می‌وزد.';
  const PAD = 'زنجیره‌ای از باورها که هر یک بر دیگری تکیه دارد و پایانی می‌خواهد. ';
  const C1 = HEAD + PAD.repeat(130) + OAK + PAD.repeat(20);      // مثال در نویسهٔ ~۸۸۰۰
  const C2 = 'قطعهٔ دوم: آیا زنجیرهٔ دوری ممکن است؟ ' + PAD.repeat(60);
  ok('۱۱.۰ بدَل شکلِ واقعی دارد: مثال پس از نویسهٔ ۱۲۰۰ است و قطعه زیرِ سقفِ قطعهٔ درس',
     C1.indexOf(OAK) > 5000 && C1.length < CFG.SPECIAL_CHUNK_CHARS, C1.indexOf(OAK) + ' / ' + C1.length);
  const SP_EP = { hook: 'سلام.', outro: 'پایان.', connection: 'مرور.', sections: [
    { heading: 'طرحِ مسئلهٔ معماریِ معرفت', narration: 'وقتی باد می‌وزد و درختانِ بلوط تاب می‌خورند، باورِ ما استنتاجی است.', sourceIds: ['C1', 'C2'] },
    { heading: 'زنجیرهٔ دوری', narration: 'زنجیرهٔ دوری خودش را توجیه نمی‌کند.', sourceIds: ['C1', 'C2'] },
    { heading: 'ارجاع', narration: 'در مجموعهٔ دیگر هم همین را دیدیم.', sourceIds: ['C2', 'BRIDGE0'] }
  ] };
  const SP_ITEMS = [
    { id: 'C1', topic: '', msg: '', summary: '', body: C1, whole: true },
    { id: 'C2', topic: '', msg: '', summary: '', body: C2, whole: true },
    { id: 'BRIDGE0', topic: 'ارجاع به مجموعهٔ «مصباح»', msg: '', summary: 'رابطه', body: 'ب'.repeat(3000) }
  ];
  auditPending_().forEach(auditMarkDone_);
  const snap = auditSnap_(ENRICH_SHOW_SPECIAL,
    { showName: CFG.SPECIAL_SHOW_NAME, episode: 62, title: 'معماری معرفت', category: 'Audi', targetMin: 16 },
    SP_EP, SP_ITEMS, []);
  ok('۱۱.۱ قطعهٔ درس کامل و با طولِ واقعی در عکس می‌نشیند',
     snap.sources.C1.body === C1 && snap.sources.C1.len === C1.length && snap.sources.C1.whole === true,
     snap.sources.C1.body.length + ' از ' + C1.length);
  ok('۱۱.۱-ب قلمِ غیرِدرس همان سقفِ قبلی را دارد — عکس بی‌حد بزرگ نمی‌شود',
     snap.sources.BRIDGE0.body.length === CFG.AUDIT_BODY_MAX && !snap.sources.BRIDGE0.whole,
     String(snap.sources.BRIDGE0.body.length));

  let judgePrompt = '', verdicts = null;
  const stubJudge = () => function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] } };
    judgePrompt = body.contents[0].parts[0].text;
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      verdict: 'ضعیف', advice: '—', sections: verdicts }) }] } }] } };
  };
  verdicts = [
    { i: '0', fit: 'مناسب', linked: 'واقعی', faithful: 'فراتر', why: 'مثالِ بلوط' },
    { i: '1', fit: 'مناسب', linked: 'واقعی', faithful: 'وفادار', why: '' },
    { i: '2', fit: 'مناسب', linked: 'واقعی', faithful: 'وفادار', why: '' }];
  global.__STUB = stubJudge();
  const r1 = auditRun_(1);
  ok('۱۱.۲ داور مثالِ نیمهٔ دومِ قطعه را می‌بیند (از درِ auditRun_)',
     r1.done === 1 && judgePrompt.indexOf(OAK) !== -1, 'جای مثال در پرسش: ' + judgePrompt.indexOf(OAK));
  ok('۱۱.۳ هر قطعهٔ درس یک بار در پرسش است، نه یک بار برای هر بخش',
     judgePrompt.split(PAD.repeat(3)).length > 2 &&
     judgePrompt.indexOf(HEAD) === judgePrompt.lastIndexOf(HEAD), String(judgePrompt.length));
  ok('۱۱.۴ قلمِ غیرِدرس (ارجاع) هنوز کنارِ بخشِ خودش می‌آید',
     judgePrompt.indexOf('• BRIDGE0') !== -1);
  ok('۱۱.۵ با متنِ کامل، «فراتر» هنوز «فراتر» است — سنجه برداشته نشده',
     r1.results[0].unfaith === 1 && r1.results[0].unsure === 0, JSON.stringify(r1.results[0]));
  ok('۱۱.۶ و پرسش می‌گوید پیش از «فراتر» همهٔ متن را بگرد',
     judgePrompt.indexOf('همهٔ آن را بگرد') !== -1);

  /* عکسِ پیش از ۸.۶۶ (همان `_AUDIT-special-064.json` که امشب داوری می‌شود):
     قطعه‌ها ۱۲۰۰ نویسه، بی `len` و بی `whole`. داوری نمی‌تواند متنِ رفته را
     برگرداند؛ می‌تواند بگوید ندید، و کد «فراتر»ِ آن بخش را نسنجیده بشمارد. */
  const legacy = JSON.parse(JSON.stringify(snap));
  legacy.episode = 64;
  for (const k of ['C1', 'C2']) {
    legacy.sources[k] = { kind: '', topic: '', msg: '', summary: '',
                          body: C1.slice(0, CFG.AUDIT_BODY_MAX) };
  }
  auditPutJson_(auditSnapName_(ENRICH_SHOW_SPECIAL, 64), legacy);
  verdicts = [
    { i: '0', fit: 'مناسب', linked: 'واقعی', faithful: 'فراتر', why: 'مثالِ بلوط' },
    { i: '1', fit: 'مناسب', linked: 'واقعی', faithful: 'فراتر', why: 'مثالِ دیگر' },
    { i: '2', fit: 'مناسب', linked: 'ساختگی', faithful: 'وفادار', why: 'پیوند' }];
  global.__STUB = stubJudge();
  const r2 = auditRun_(1);
  const x2 = r2.results[0] || {};
  ok('۱۱.۷ عکسِ کهنه: پرسش می‌گوید قطعه بریده است',
     judgePrompt.indexOf('[بریده: فقط ' + CFG.AUDIT_BODY_MAX) !== -1, String(judgePrompt.indexOf('[بریده')));
  ok('۱۱.۸ و «فراتر»ِ بخشی که قطعه‌اش بریده بود، «نسنجیده» شمرده می‌شود نه «فراتر»',
     x2.unfaith === 0 && x2.unsure === 2, JSON.stringify(x2));
  ok('۱۱.۹ «پیوندِ ساختگی» دست نمی‌خورد — فقط وفاداری به متنِ دیده‌شده بسته است',
     x2.fake === 1 && String(x2.worst).indexOf('پیوندِ ساختگی') !== -1, String(x2.worst));

  /* برنامهٔ ترکیبی عوض نشده: بلوکِ «متنِ خامِ درس» ندارد و «فراتر» همان است. */
  auditSnap_('variety', { showName: CFG.SHOW_NAME, episode: 70, title: 't', category: 'c', targetMin: 10 },
    EP, ITEMS, []);
  verdicts = [
    { i: '0', fit: 'مناسب', linked: 'واقعی', faithful: 'فراتر', why: 'انگیزه' },
    { i: '1', fit: 'مناسب', linked: 'واقعی', faithful: 'وفادار', why: '' },
    { i: '2', fit: 'نامعلوم', linked: 'نامعلوم', faithful: 'نامعلوم', why: '' }];
  global.__STUB = stubJudge();
  const r3 = auditRun_(1);
  ok('۱۱.۱۰ «از همه جا»: بی بلوکِ درس و «فراتر» همان «فراتر»',
     judgePrompt.indexOf('متنِ خامِ درس') === -1 && r3.results[0].unfaith === 1 && r3.results[0].unsure === 0,
     JSON.stringify(r3.results[0]));

  /* مهلت: متنِ کامل پرسش را بزرگ کرد؛ کارِ شبانه قسمتِ بعد را فقط با وقت شروع می‌کند. */
  auditSnap_('variety', { showName: CFG.SHOW_NAME, episode: 71, title: 't', category: 'c', targetMin: 10 }, EP, ITEMS, []);
  auditSnap_('variety', { showName: CFG.SHOW_NAME, episode: 72, title: 't', category: 'c', targetMin: 10 }, EP, ITEMS, []);
  global.__STUB = stubJudge();
  const r4 = auditRun_(3, Date.now() - 1);
  ok('۱۱.۱۱ مهلتِ گذشته: نخستین داوری می‌شود، بعدی نه — و گفته می‌شود',
     r4.done === 1 && r4.stopped === 'مهلت', JSON.stringify({ done: r4.done, stopped: r4.stopped }));
  const nightly11 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const at11 = nightly11.indexOf("nightHas_(45000, 'سنجهٔ محتوا')");
  ok('۱۱.۱۲ کارِ شبانه مهلت می‌دهد، و مهلت زیرِ نگهبانِ همان بلوک است (۷٫۳۱)',
     nightly11.slice(at11, at11 + 300).indexOf('CFG.AUDIT_RUN_MS') !== -1 &&
     CFG.AUDIT_RUN_MS < 45000, String(CFG.AUDIT_RUN_MS));
  ok('۱۱.۱۳ سقفِ قطعهٔ درس در عکس دست‌کم سقفِ قطعهٔ تولید است',
     CFG.AUDIT_LESSON_BODY_MAX >= CFG.SPECIAL_CHUNK_CHARS &&
     CFG.AUDIT_LESSON_PROMPT_MAX >= CFG.SPECIAL_SOURCE_CHARS,
     CFG.AUDIT_LESSON_BODY_MAX + ' / ' + CFG.AUDIT_LESSON_PROMPT_MAX);
  global.__STUB = null;
}

console.log('\n=== صفِ داوری که رشد می‌کند، باید خودش حرف بزند ===');
{
  /* ══ گزارشِ ۲۷ اوت ══
   * «صفِ داوری از ۲۵ اوت گیر کرده بود — به‌جای کم‌شدن از ۴ به ۶ رسیده بود.»
   * سه شب، و موتور یک کلمه نگفت. علتش ساختاری بود: وقتی بودجهٔ شبانه تمام
   * شود `auditRun_` **اصلاً اجرا نمی‌شود**، پس هر هشداری که داخلش باشد هم
   * اجرا نمی‌شود. تنها کسی که فهمید، آدمی بود که گزارش را خواند.
   * پس سنجه در `healthCheck` زندگی می‌کند، نه در کارِ شبانه. */
  delete global.__PROPS[PK.AUDIT_QSEEN];
  const q0 = auditQueueStatus_(null);
  ok('صفِ داوری هر روز یک سطر دارد — حتی وقتی ایرادی نیست', !!q0.line && q0.ok === true, q0.line);

  // صفی می‌سازیم و «امروز» را جلو می‌بریم
  global.__PROPS[PK.AUDIT_QSEEN] = JSON.stringify({ n: 99, since: '2026-08-25' });
  const q1 = auditQueueStatus_(null);
  ok('صفی که کوتاه نشده، شمارِ روز را می‌گوید', q1.days >= 0, q1.line);

  /* و «بلند» با «گیرکرده» یکی نیست: صفی که کوتاه می‌شود سالم است، هرچقدر
     هم بلند باشد — وگرنه هر شبِ پرکار یک هشدارِ دروغ می‌ساخت. */
  global.__PROPS[PK.AUDIT_QSEEN] = JSON.stringify({ n: 999, since: '2026-08-01' });
  const q2 = auditQueueStatus_(null);
  ok('صفی که کوتاه‌تر شده، شمارنده‌اش صفر می‌گیرد', q2.ok === true && q2.days === 0,
     JSON.stringify(q2));
  delete global.__PROPS[PK.AUDIT_QSEEN];

  /* و ترتیبِ کارِ شبانه: داوری باید جلوتر از کارهای «امشب نشد، فردا» باشد. */
  const nightly = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const iAudit = nightly.indexOf("nightHas_(45000, 'سنجهٔ محتوا')");
  const iMusic = nightly.indexOf("nightHas_(90000, 'گشتن و آوردنِ موسیقی')");
  const iRecap = nightly.indexOf("nightHas_(60000, 'قسمتِ مرورِ بزرگ')");
  ok('سنجهٔ محتوا پیش از گشتنِ موسیقی می‌آید', iAudit > 0 && iAudit < iMusic,
     iAudit + ' < ' + iMusic);
  ok('و پیش از مرورِ بزرگ', iAudit < iRecap);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
