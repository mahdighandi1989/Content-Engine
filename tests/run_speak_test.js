/* run_speak_test.js — متنِ صوتی: نشانه‌گذاریِ آوایی و بازبینیِ اجباری (۶٫۲۰).
 *
 * خواستهٔ کاربر دو تکه داشت و هر دو تکه اینجا «اجرا» می‌شود، نه خوانده:
 *
 *   «فقط اعراب‌گذاری نباشد، بلکه با نشانه‌گذاری‌ها و سایر موارد به مدل
 *    حالی کند تا اشتباه خوانده نشود»
 *   «بعد از یک بار نوشته حتماً دقایقی بعدش مجدد بررسی بشه … این بررسی
 *    مجدد خیلی مهمه»
 *
 * و نمونه‌اش «بایستیم» بود: با فتحه روی ب، «با» شنیده می‌شود. نکتهٔ اصلی
 * این است که تا ۶٫۱۹ آن غلط از *هر دو* سدِ موجود رد می‌شد — verifySpeak_
 * می‌گفت واژه‌ها همان‌اند و speakVowelledOk_ می‌گفت نشانه کم نیست. هیچ‌کدام
 * قرار نبود بگویند نشانه درست است. سنجهٔ ۲٫۱ همان را ثابت می‌کند.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs',
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs',
  '26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

global.__PROPS['GEMINI_API_KEY'] = 'TEST';

// نمونهٔ واقعیِ کاربر. «بایستیم» = بـ + ایستادن؛ کسره روی ب و نیم‌فاصله،
// وگرنه «با» خوانده می‌شود.
const BAD = 'ما باید همین‌جا بَایستیم و نگاه کنیم.';
const GOOD = 'ما باید همین‌جا بِ‌ایستیم، و نگاه کنیم.';
const PLAIN = 'ما باید همین‌جا بایستیم و نگاه کنیم.';

/* و همان جمله با اعرابِ کامل — یک بار غلط، یک بار درست. «کامل» لازم است،
   چون سدِ چگالی روی متنِ کم‌نشانه اصلاً باز نمی‌شود و آن‌وقت سنجهٔ ۲ چیزی
   را نشان نمی‌داد که ادعا می‌کند. */
const V = s => s.replace(/([آ-يٮ-ە])/g, '$1َ');
const VBAD = V(PLAIN);                                   // فتحه روی ب ← «با»
const VGOOD = VBAD.replace('بَا', 'بِ‌ا')
                  .replace(' وَ ', '، وَ ');

console.log('=== ۱) پوستهٔ مقایسه: نشانه آزاد، واژه قفل ===');
{
  ok('۱.۱ اعراب و نیم‌فاصله در پوسته دیده نمی‌شوند',
     speakCmp_(BAD) === speakCmp_(PLAIN) && speakCmp_(GOOD) !== speakCmp_(PLAIN),
     JSON.stringify(speakCmp_(GOOD)));
  /* و همین‌جاست که تا ۶٫۱۹ کار می‌ایستاد: ویرگولِ افزوده پوسته را عوض
     می‌کرد، وارسی می‌شکست، و بخش با متنِ *بی‌اعراب* خوانده می‌شد. یعنی
     «بهتر بخوان» نتیجه‌اش «بدتر بخوان» بود. */
  ok('۱.۲ ولی استخوان، ویرگول را هم نمی‌بیند',
     speakBone_(GOOD) === speakBone_(PLAIN), JSON.stringify(speakBone_(GOOD)));
  ok('۱.۳ حرف و رقم اما استخوان‌اند: «۱۳۵۷» و «۱۹۷۹» یکی نمی‌شوند',
     speakBone_('سالِ ۱۳۵۷') !== speakBone_('سالِ ۱۹۷۹'));
  ok('۱.۴ و مرزِ جمله هم استخوان است — نقطه برداشتنی نیست',
     speakBone_('رفت. آمد.') !== speakBone_('رفت آمد.'));
}

console.log('=== ۲) سدهای موجود، «درستیِ» اعراب را نمی‌سنجند ===');
{
  /* این سنجه یک عیب را ثبت می‌کند، نه یک قابلیت. هدفش این است که اگر روزی
     کسی خواست پاسِ بازبینی را بردارد، اینجا سیاه و سفید ببیند چه چیزی را
     برمی‌دارد: تنها چیزی که غلطِ «بَایستیم» را می‌گیرد همان پاس است. */
  ok('۲.۱ «بَایستیم» از وارسیِ واژه‌به‌واژه رد می‌شود', verifySpeak_(PLAIN, VBAD));
  ok('۲.۲ و از چگالیِ اعراب هم', speakVowelledOk_(PLAIN, VBAD));
  ok('۲.۳ پس تنها سدِ باقی‌مانده، بازبینیِ معنایی است',
     typeof speakReviewPiece_ === 'function');
}

console.log('=== ۳) نشانه‌گذاریِ آوایی: افزودن آزاد، دست‌بردن ممنوع ===');
{
  ok('۳.۱ ویرگولِ افزوده پذیرفته می‌شود', verifySpeak_(PLAIN, GOOD));
  ok('۳.۲ سه‌نقطه و خط‌تیره هم',
     verifySpeak_('او رفت و برنگشت.', 'او رفت — و برنگشت.') &&
     verifySpeak_('او رفت و برنگشت.', 'او رفت… و برنگشت.'));
  /* ولی سه‌نقطه‌ای که *جای نقطه* بنشیند، مکث نیست — مرزِ جمله را عوض
     می‌کند، و مرزِ جمله همان چیزی است که هرگز دستِ مدل نیست. */
  ok('۳.۲-ب مگر آنکه جای نقطهٔ پایان بنشیند',
     !verifySpeak_('او رفت و برنگشت.', 'او رفت و برنگشت…'));
  ok('۳.۳ ولی واژهٔ عوض‌شده نه',
     !verifySpeak_(PLAIN, 'ما باید همین‌جا بِ‌نشینیم، و نگاه کنیم.'));
  ok('۳.۴ و واژهٔ افزوده نه',
     !verifySpeak_(PLAIN, 'ما باید حتماً همین‌جا بِ‌ایستیم و نگاه کنیم.'));
  ok('۳.۵ و شکستنِ جمله نه',
     !verifySpeak_(PLAIN, 'ما باید همین‌جا بِ‌ایستیم. و نگاه کنیم.'));
  /* خاموش‌کردنِ نشانه‌گذاری باید *دقیقاً* رفتارِ پیشین را برگرداند —
     وگرنه «خاموش» یعنی «یک چیزِ سومِ نامعلوم». */
  const keep = CFG.SPEAK_MARKS;
  CFG.SPEAK_MARKS = false;
  ok('۳.۶ با SPEAK_MARKS=false همان سخت‌گیریِ پیشین برمی‌گردد',
     !verifySpeak_(PLAIN, VGOOD) && verifySpeak_(PLAIN, VBAD));
  CFG.SPEAK_MARKS = keep;
}

console.log('=== ۴) فهرستِ دام‌ها یک نسخه دارد و در هر دو پرامپت هست ===');
{
  /* دو نسخه از یک فهرست یعنی روزی یکی جلو می‌افتد و آن‌یکی بی‌صدا کهنه
     می‌شود. پس هر دو پرامپت باید از همان تابع تغذیه شوند — و راهِ سنجشش
     این است که متنِ واقعیِ فرستاده‌شده را بگیریم، نه اینکه کد را بخوانیم. */
  const seen = [];
  global.__STUB = (url, body) => {
    const t = String(body.contents[0].parts[0].text);
    seen.push(t);
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ v: GOOD }) }] } }] } };
  };
  vowelizePiece_(PLAIN);
  speakReviewPiece_(PLAIN, BAD);
  ok('۴.۱ نمونهٔ «بایستیم» در پرامپتِ نوشتن هست',
     seen[0].indexOf('بِ‌ایستیم') !== -1);
  ok('۴.۲ و در پرامپتِ بازبینی هم',
     seen[seen.length - 1].indexOf('بِ‌ایستیم') !== -1);
  ok('۴.۳ هر دو از همان یک فهرست تغذیه می‌شوند',
     seen[0].indexOf(SPEAK_TRAPS[0]) !== -1 &&
     seen[seen.length - 1].indexOf(SPEAK_TRAPS[0]) !== -1);
  ok('۴.۴ و دو پرامپت از هم قابلِ تشخیص‌اند (وگرنه در آزمون‌ها جای هم می‌نشینند)',
     seen[0].indexOf('اعراب‌گذاریِ کامل') !== -1 &&
     seen[seen.length - 1].indexOf('بازبینیِ نشانه‌گذاریِ متنِ صوتی') !== -1);
  /* تکهٔ متن باید دقیقاً یک بار و در ته پرامپت بیاید — دو تکه‌شدنش، همان
     چیزی است که یک بار کلِ اعراب‌گذاری را در آزمون‌ها از کار انداخت. */
  ok('۴.۵ متن در ته پرامپتِ نوشتن است و پرامپت فقط یک مرزِ دوخطی دارد',
     seen[0].split('\n\n').length === 2 &&
     seen[0].split('\n\n')[1] === PLAIN);
}

console.log('=== ۵) بازبینی: اصلاح می‌پذیرد، تحریف نه ===');
{
  const mk = ans => { global.__STUB = () => ({ code: 200, json: { candidates: [{ content: {
    parts: [{ text: JSON.stringify(ans) }] } }] } }); };

  mk({ v: VGOOD, n: '۱', note: 'کسرهٔ پیشوند جا افتاده بود' });
  let r = speakReviewPiece_(PLAIN, VBAD);
  ok('۵.۱ اصلاحِ درست پذیرفته و «تغییرکرده» علامت می‌خورد',
     r && r.t === VGOOD && r.changed === true, r && r.t);

  mk({ v: V('ما باید همین‌جا بنشینیم و نگاه کنیم.'), n: '۱' });
  ok('۵.۲ ولی بازبینی که واژه عوض کند، دور انداخته می‌شود',
     speakReviewPiece_(PLAIN, VBAD) === null);

  mk({ v: VBAD, n: '۰' });
  r = speakReviewPiece_(PLAIN, VBAD);
  ok('۵.۳ «چیزی نبود» یعنی همان متن، بی نشانِ تغییر',
     r && r.t === VBAD && r.changed === false, r && String(r.changed));

  mk({ v: '' });
  ok('۵.۴ پاسخِ خالی یعنی ناموفق، نه یعنی «متنِ خالی»',
     speakReviewPiece_(PLAIN, VBAD) === null);

  /* اعرابِ ازدست‌رفته هم «اصلاح» نیست: بازبینی حق ندارد متن را به حالتِ
     بی‌اعراب برگرداند، وگرنه یک پاسِ تنبل کلِ کارِ مرحلهٔ قبل را پس می‌گیرد. */
  mk({ v: PLAIN, n: '۱' });
  ok('۵.۵ و بازبینی‌ای که اعراب را برمی‌دارد هم دور انداخته می‌شود',
     speakReviewPiece_(PLAIN, VBAD) === null);

  global.__STUB = () => { throw new Error('down'); };
  ok('۵.۶ و مدلِ از دسترس خارج، بازبینی را ناموفق می‌کند نه اجرا را',
     speakReviewPiece_(PLAIN, VBAD) === null);
}

console.log('=== ۶) واژه‌های سخت → تبِ تلفظ: تنها سدش «همان حروف» است ===');
{
  const rows = speakHardRows_(
    'بایستیم => بِ‌ایستیم\n' +
    '«ملل» => «مِلَل»\n' +
    'بایستیم => بِ‌ایستیم\n' +          // تکراری
    'نظیر => همانند\n' +                 // ← واژهٔ دیگری است، نه املای دیگر
    'خط بی‌فلش\n', 10);
  ok('۶.۱ املای آواییِ هم‌حرف پذیرفته می‌شود',
     rows.length === 2 && rows[0][0] === 'بایستیم' && rows[0][1] === 'بِ‌ایستیم',
     JSON.stringify(rows));
  ok('۶.۲ گیومه پاک می‌شود', rows[1][0] === 'ملل' && rows[1][1] === 'مِلَل');
  /* این سدِ اصلی است: هرچه از اینجا رد شود، تا ابد روی هر قسمت می‌نشیند و
     دیگر هیچ وارسی‌ای نمی‌بیند — چون تبِ تلفظ *بعد* از وارسی اعمال می‌شود.
     پس «جایگزینی که واژهٔ دیگری باشد» باید همین‌جا بمیرد. */
  ok('۶.۳ ولی جایگزینی که واژهٔ دیگری است، نه',
     !rows.some(r => r[1] === 'همانند'));
  ok('۶.۴ و سقف رعایت می‌شود',
     speakHardRows_('الف => اَلِف\nب => بِ\nپ => پِ\n', 2).length === 2);
}

console.log('=== ۷) افزودن به تبِ تلفظ: فقط افزودن ===');
{
  const hub = new Spread('hub', 'HUBS');
  global.__SS['HUBS'] = hub;
  global.__PROPS['HUB_ID'] = 'HUBS';
  _hubCache = null; _pronCache = null;
  const sh = ensurePronTab_(hub);
  const before = sh.getLastRow();

  /* «ملل» از قبل در PRON_SEED هست و باید همان‌جا بیفتد — یعنی این فراخوان
     سه واژه می‌گیرد و دو تا می‌نویسد. */
  let n = speakLearn_([['بایستیم', 'بِ‌ایستیم'], ['نایستاد', 'نَ‌ایستاد'],
                       ['ملل', 'مِلَل']], 'آزمون ۱');
  ok('۷.۱ سطرِ تازه افزوده می‌شود و واژهٔ ازپیش‌موجود نه', n === 2, 'n=' + n);
  ok('۷.۲ و ستونِ «منبعِ سطر» ساخته شد',
     String(sh.getRange(1, 4).getValue()).indexOf('منبع') !== -1);
  const row = sh.getRange(before + 1, 1, 1, 4).getValues()[0];
  ok('۷.۳ سطرِ خودکار فعال است ولی «خودکار» بودنش نوشته شده',
     row[2] === 'بله' && String(row[3]).indexOf('خودکار') === 0, JSON.stringify(row));

  n = speakLearn_([['بایستیم', 'چیزِ دیگری']], 'آزمون ۲');
  ok('۷.۴ واژه‌ای که هست، دوباره نوشته نمی‌شود', n === 0);
  const again = sh.getRange(before + 1, 1, 1, 2).getValues()[0];
  ok('۷.۵ و سطرِ موجود بازنویسی نمی‌شود', again[1] === 'بِ‌ایستیم', again[1]);

  /* «مِلَل» از قبل در PRON_SEED هست؛ نباید دوباره افزوده شده باشد —
     تشخیصِ تکراری باید بی‌اعتنا به اعراب باشد، وگرنه هر بار یک نسخهٔ تازه. */
  const all = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
                .map(r => pronStrip_(String(r[0])).text).filter(Boolean);
  ok('۷.۶ تکراری بی‌اعتنا به اعراب گرفته می‌شود',
     all.filter(x => x === 'ملل').length === 1, JSON.stringify(all.filter(x => x === 'ملل')));

  ok('۷.۷ و آموخته‌ها همان قسمت اعمال می‌شوند (کش تازه می‌شود)',
     applyPron_('باید بایستیم').indexOf('بِ‌ایستیم') !== -1,
     applyPron_('باید بایستیم'));
}

console.log('=== ۸) مرحلهٔ بازبینی روی یک قسمت ===');
{
  const segs = [{ text: PLAIN, kind: 'hook' },
                { text: 'بخشِ دوم. متنی برای خواندن.', kind: 'body', secIndex: 0 }];
  const ep = { __speakSegs: [] };
  for (let i = 0; i < segs.length; i++) {
    ep.__speakSegs[i] = { h: speakHash_(speakSanitize_(segs[i].text)),
                          t: V(speakSanitize_(segs[i].text)) };
  }
  let calls = 0;
  global.__STUB = (url, body) => {
    calls++;
    const t = String(body.contents[0].parts[0].text);
    const v = t.split('── علامت‌گذاری‌شده ──\n')[1] || '';
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ v: v + '', n: '۰' }) }] } }] } };
  };
  const far = new Date().getTime() + 3600000;
  let r = speakReview_(ep, segs, far, function () {}, 'آزمون ۳');
  ok('۸.۱ هر دو بخش بازبینی شد', r.done && r.seen === 2, JSON.stringify(r));
  ok('۸.۲ و نشانِ بازبینی روی بخش‌ها نشست',
     ep.__speakSegs.every(e => e.r === 1));

  const was = calls;
  r = speakReview_(ep, segs, far, function () {}, 'آزمون ۴');
  ok('۸.۳ اجرای دوم دوباره‌کاری نمی‌کند', r.seen === 0 && calls === was);

  /* بخشی که اعراب نگرفته، چیزی برای بازبینی ندارد — و نباید یک فراخوانِ
     بی‌حاصل خرج کند. */
  const ep2 = { __speakSegs: [{ h: 'x', skip: true }, null] };
  r = speakReview_(ep2, segs, far, function () {}, 'آزمون ۵');
  ok('۸.۴ بخشِ بی‌اعراب بازبینی نمی‌شود', r.seen === 0);

  /* و متنِ کهنه هم نه: اگر متنِ بخش عوض شده باشد، امضا نمی‌خواند. */
  const ep3 = { __speakSegs: [{ h: 'کهنه', t: 'چیزی' }] };
  r = speakReview_(ep3, [segs[0]], far, function () {}, 'آزمون ۶');
  ok('۸.۵ متنِ کهنه هم نه', r.seen === 0);

  /* خاموشیِ صریح باید واقعاً یعنی هرگز. */
  const keep = CFG.SPEAK_REVIEW;
  CFG.SPEAK_REVIEW = false;
  const ep4 = { __speakSegs: [{ h: speakHash_(speakSanitize_(PLAIN)), t: VBAD }] };
  ok('۸.۶ با SPEAK_REVIEW=false هیچ فراخوانی نمی‌رود',
     speakReview_(ep4, [segs[0]], far, function () {}, 'x').seen === 0);
  CFG.SPEAK_REVIEW = keep;
}

console.log('=== ۹) کارنامه: «ایرادی نبود» از «اجرا نشد» جدا می‌شود ===');
{
  /* هفت بار در این ریپو تحلیلی نوشته شد و هیچ تصمیمی به آن وصل نشد. سطرِ
     روزانه و این ارتقا، تصمیمِ وصل‌شده به این تحلیل‌اند. */
  delete global.__PROPS[PK.SPEAK_REV];
  let s = speakReviewStatus_();
  ok('۹.۱ بی هیچ اجرایی، خودش را «هنوز هیچ» اعلام می‌کند',
     s.line.indexOf('هنوز') !== -1 && s.ok === true, s.line);

  for (let i = 0; i < 5; i++) speakRevLog_('ق ' + i, 3, 0, 0, []);
  s = speakReviewStatus_();
  ok('۹.۲ پنج قسمت بی هیچ اصلاحی، از یادداشت به مشکل ارتقا می‌یابد',
     s.ok === false && s.line.indexOf('بی‌اثر') !== -1, s.line);

  speakRevLog_('ق ۵', 3, 2, 1, ['کسرهٔ پیشوند']);
  s = speakReviewStatus_();
  ok('۹.۳ ولی یک اصلاحِ واقعی، هشدار را می‌بندد', s.ok === true, s.line);
  ok('۹.۴ و کارنامه عدد دارد، نه صفت — و عددش فارسی است',
     /[۰-۹]/.test(s.line) && !/\d/.test(s.line) && s.fixed === 2, s.line);

  /* کارنامه نباید بی‌مرز رشد کند: props هر کلید ۹ کیلوبایت سقف دارد. */
  for (let i = 0; i < 30; i++) speakRevLog_('ق' + i, 1, 1, 0, []);
  ok('۹.۵ کارنامه ده تای آخر را نگه می‌دارد',
     JSON.parse(global.__PROPS[PK.SPEAK_REV]).length === 10);
}

console.log('=== ۱۰) دستورِ گفتار: یادآورِ درست برای متنِ درست ===');
{
  /* گزارشِ کاربر: «گویا جدا جدا روی کلمات فقط تمرکز می‌کند». همان‌جا پیش
     می‌آید که متن پُر از نشانه است. پس یادآورِ پیوستگی جای همان‌جاست. */
  const cueV = ttsCue_('آرام', VGOOD.repeat(6));
  const cueP = ttsCue_('آرام', PLAIN.repeat(6));
  ok('۱۰.۱ متنِ اعراب‌دار یادآورِ روان‌خوانی می‌گیرد',
     cueV.indexOf('عبارت‌به‌عبارت') !== -1, cueV);
  ok('۱۰.۲ متنِ بی‌اعراب همان یادآورِ تلفظِ پیشین را',
     cueP.indexOf(CFG.TTS_PRON_HINT) !== -1 &&
     cueP.indexOf('عبارت‌به‌عبارت') === -1, cueP);
  ok('۱۰.۳ و هیچ‌کدام از سقفِ دستور رد نمی‌شود',
     cueV.length <= CFG.TTS_CUE_MAX + 40 && cueP.length <= CFG.TTS_CUE_MAX + 40,
     cueV.length + '/' + cueP.length);
}

console.log('=== ۱۱) از نوشتن تا بازبینی تا ذخیره، سرتاسر ===');
{
  /* خواستهٔ صریحِ کاربر: «متنِ اعراب‌گذاری‌شده و نشانه‌گذاری‌شده باید همان
     جایی که قبلاً ذخیره می‌شد برای هر پادکست دقیق ذخیره بشه». دو جا بود و
     دو جا می‌ماند: ep.__speakSegs (که در _episode.json می‌نشیند) و فایلِ
     «متن صوتی» در پوشهٔ قسمت. این بلوک همان مسیر را می‌دواند. */
  const plain = 'ما باید همین‌جا بایستیم و به آن نگاه کنیم تا معنایش روشن شود.';
  // «بایستیم» با فتحه (غلط) و با کسره+نیم‌فاصله (درست) — دقیقاً نمونهٔ کاربر.
  const WRONG = V('بایستیم'), RIGHT = V('بایستیم').replace('بَاَ', 'بِ‌اَ');
  const segs = [{ text: plain, kind: 'hook' }];
  const ep = { hook: plain, sections: [], outro: '' };
  const far = new Date().getTime() + 3600000;

  // مرحلهٔ یک: مدل اعراب می‌گذارد — ولی کسرهٔ پیشوند را غلط می‌گذارد.
  global.__STUB = (url, body) => {
    const t = String(body.contents[0].parts[0].text);
    if (t.indexOf('اعراب‌گذاریِ کامل') !== -1) {
      const piece = t.split('\n\n').slice(1).join('\n\n').replace(/\n\nیادآوری:[\s\S]*$/, '');
      return { code: 200, json: { candidates: [{ content: { parts: [{
        text: JSON.stringify({ v: V(piece) }) }] } }] } };
    }
    // مرحلهٔ دو: بازبین همان غلط را می‌گیرد و کسره و ویرگول می‌گذارد.
    const v = (t.split('── علامت‌گذاری‌شده ──\n')[1] || '')
                .replace(WRONG, RIGHT).replace(' وَ ', '، وَ ');
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ v: v, n: '۱', note: 'کسرهٔ پیشوندِ فعل',
                             hard: 'بایستیم => بِ‌ایستیم' }) }] } }] } };
  };

  let r = speakStep_(ep, segs, far, function () {});
  ok('۱۱.۱ مرحلهٔ نوشتن، متنِ اعراب‌دار ساخت', r.done && !!ep.__speakSegs[0].t);
  ok('۱۱.۲ ولی «بایستیم» را با فتحه ساخت و هیچ سدی نگرفتش',
     ep.__speakSegs[0].t.indexOf(WRONG) !== -1 &&
     verifySpeak_(plain, ep.__speakSegs[0].t) &&
     speakVowelledOk_(plain, ep.__speakSegs[0].t));

  const hub = new Spread('hub', 'HUBE');
  global.__SS['HUBE'] = hub; global.__PROPS['HUB_ID'] = 'HUBE';
  _hubCache = null; _pronCache = null; ensurePronTab_(hub);
  delete global.__PROPS[PK.SPEAK_REV];

  let saved = 0;
  const rv = speakReview_(ep, segs, far, function () { saved++; }, 'آزمونِ سرتاسری');
  ok('۱۱.۳ بازبینی یک اصلاح ثبت کرد', rv.done && rv.fixed === 1, JSON.stringify(rv));
  ok('۱۱.۴ و متنِ ذخیره‌شده حالا کسرهٔ درست دارد',
     ep.__speakSegs[0].t.indexOf(RIGHT) !== -1 &&
     ep.__speakSegs[0].t.indexOf(WRONG) === -1, ep.__speakSegs[0].t);
  ok('۱۱.۵ و ویرگولِ عبارت‌بندی هم، بی آنکه واژه‌ای عوض شود',
     ep.__speakSegs[0].t.indexOf('،') !== -1 &&
     verifySpeak_(plain, ep.__speakSegs[0].t));
  ok('۱۱.۶ هر بخش که تمام شد ذخیره می‌شود (اجرای قطع‌شده کار را دوباره نمی‌کند)',
     saved >= 1, 'saved=' + saved);
  ok('۱۱.۷ و واژهٔ سخت به تبِ تلفظ رفت', rv.learned === 1, 'learned=' + rv.learned);

  const made = [];
  const folder = { getFilesByName: () => ({ hasNext: () => false }),
                   createFile: b => { made.push(b.getDataAsString()); return {}; } };
  writeSpeakFile_(folder, 'قسمت 0001', ep, segs);
  ok('۱۱.۸ فایلِ «متن صوتی» همان نسخهٔ بازبینی‌شده را دارد',
     made.length === 1 && made[0].indexOf('بِ‌ا') !== -1, made[0]);

  /* و تکهٔ صوتی هم — چون همین است که به گفتارساز می‌رود. */
  const chunks = buildChunks_(ep, 'متفرقه', 1);
  ok('۱۱.۹ و تکهٔ فرستاده‌شده به گفتارساز هم همان است',
     chunks.length && chunks[0].text.indexOf('بِ') !== -1,
     chunks.length ? chunks[0].text.slice(0, 60) : '-');
  ok('۱۱.۱۰ ولی متنِ خواندنی دست‌نخورده ماند', ep.hook === plain);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
