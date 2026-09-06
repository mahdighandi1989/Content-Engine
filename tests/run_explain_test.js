/* run_explain_test.js — عصری‌سازیِ درس‌نامه (بخشِ ۲۹) و سدِ کلیشه در برنامهٔ متنوع.
 *
 * خواستهٔ صاحبِ برنامه دو تکه داشت و هر دو تکه اینجا اجرا می‌شود:
 *
 *   «یه نفر غیر از اون گوینده در لا‌به‌لای هر مطلب بیاد توضیح بده … با
 *    مثال‌های امروزی و ملموس … نه اینکه از محتوای اصلی عدول کنه … این نیاز
 *    به بررسی داره برای هر قسمت که کجا این یه نفر بیاد … و گاهی هم باید
 *    تغییر کنه»
 *
 *   «تفسیرهای غلط و کلیشه‌ای و فازهای نصیحت‌گونه» — نمونه‌اش خاطرهٔ ترسناکِ
 *    تاکسی که «کمکِ اجتماعی» خوانده شد.
 *
 * سنجه‌ها عمداً توابع را می‌دوانند: قابلیتی که فقط در متنِ کد دیده شود،
 * اجرا نشده است — و این ریپو هفت بار همین را دیده.
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
  '26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

/* اندازه‌ها عمداً پارامتری‌اند: سهمِ عصری‌سازی هم به طولِ درس بسته است و هم
   به جای باقی‌مانده تا سقفِ «یک فایل»، و یک نمونهٔ ثابت نمی‌تواند هر دو سد
   را نشان بدهد. */
const SEC = (n, reps) => ({ heading: 'بخشِ ' + n,
                    narration: ('مفهومِ شمارهٔ ' + n + ' در این درس تعریف می‌شود و ' +
                                'تمایزش با مفهومِ پیشین روشن می‌گردد. ').repeat(reps || 20),
                    tone: 'آموزشی' });
/* ══ اندازهٔ پیش‌فرض از خودِ سقف می‌آید (۶٫۲۹) ══
   تا ۶٫۲۸ اینجا عددِ ثابتِ ۲۰ بود و درسِ نمونه ۶٬۳۵۸ نویسه می‌شد. وقتی سقفِ
   «یک فایل» از اندازه‌گیریِ واقعیِ صدا آمد و پایین‌تر نشست، همان نمونه از
   سقف زد بیرون و سهمِ عصری‌سازی صفر شد — یعنی نمونه‌ای که قرار بود *سهم* را
   بسنجد، ناگهان *سقف* را می‌سنجید. نمونه‌ای که به ثابتی بیرون از خودش بسته
   باشد، روزی که آن ثابت درست شود می‌شکند.
   ضریب عمداً ۰٫۸۴ است: درسی به این اندازه، سهمِ ۱۳ درصدی‌اش دو توضیحِ کامل
   (بالای EXPLAIN_MIN_CHARS) را می‌خرد — که همان چیزی است که بلوکِ ۳ می‌سنجد. */
/* اندازه از **نیازِ واقعی** حساب می‌شود، نه از یک ضریبِ جادویی: درسِ نمونه
   باید آن‌قدر بلند باشد که سهمِ `EXPLAIN_PCT` درصدی‌اش **دو توضیحِ کامل**
   (هرکدام بالای `EXPLAIN_MIN_CHARS`) را بخرد — چون بلوکِ ۳ دقیقاً همین را
   می‌سنجد. ضریبِ ثابتِ ۰٫۸۴ برای ۱۳٪ و کفِ ۲۶۰ تنظیم شده بود و با تغییرِ
   هر دو در ۶٫۴۳ بی‌صدا کم آورد. */
const _needBase = Math.ceil((2 * (Number(CFG.EXPLAIN_MIN_CHARS) + 260) + 300) *
                            100 / Number(CFG.EXPLAIN_PCT));
const REPS = Math.max(6, Math.round(_needBase / (4 * 76)));
const mkEp = (k, reps) => ({ title: 'درسِ آزمایشی',
                             sections: Array.from({ length: k },
                                                  (_, i) => SEC(i, reps || REPS)) });
/* همان طولِ کل، با هر شمارِ بخش — تا بلوکی که دربارهٔ *جای* قطعه‌هاست، ناخواسته
   دربارهٔ *سهم* نشود. */
const mkEpSized = k => mkEp(k, Math.max(4, Math.round(REPS * 4 / k)));
/* طولِ نمونه‌ها عمداً واقعی است: از ۶٫۲۸ کفِ پذیرش EXPLAIN_MIN_CHARS است،
   چون توضیحی که یکی دو مثالِ ملموس داشته باشد زیر آن نمی‌شود — و کفِ ۸۰
   نویسهٔ قبلی یعنی یک جملهٔ تعارفی هم می‌گذشت، که کاربر همان را شنید. */
/* طول از **کفِ اعلام‌شده** ساخته می‌شود، نه از عددِ ثابت: ۶٫۴۳ کف را
   ۲۶۰ ← ۵۰۰ برد و همین نمونه‌ها یک‌شبه زیرِ کف افتادند، در حالی که چیزی
   خراب نشده بود. نمونه‌ای که به ثابتی بیرون از خودش بسته باشد، روزی که آن
   ثابت درست شود می‌شکند — همان درسی که REPS در ۶٫۲۹ گرفت. */
const _unit = n => 'ببین، ساده‌اش این است که ' + n + '. فرض کن گوشی‌ات را برداشته‌ای و ' +
                   'یک پیام در گروه می‌فرستی؛ همان اتفاق اینجا هم می‌افتد. ';
const _fill = (n, over) => {
  const want = Number(CFG.EXPLAIN_MIN_CHARS) + (over || 60);
  let t = '';
  while (t.length < want) t += _unit(n);
  return t;
};
const TXT = n => _fill(n, 120);
/* نمونهٔ جمع‌وجورترِ بالای کف — برای بلوکی که می‌خواهد **سقفِ تعداد** را
   بسنجد نه سقفِ سهم. */
const TXTS = n => _fill(n, 20);

console.log('=== ۱) فقط درس‌نامه، و فقط وقتی روشن است ===');
{
  ok('۱.۱ درس‌نامه بله', explainOn_(ENRICH_SHOW_SPECIAL) === true);
  /* خواستهٔ صریح: «برای پادکست از همه جا از همه رنگ این موضوع لازم نیست.»
     یعنی نبودنش آنجا یک تصمیم است، نه یک نقص. */
  ok('۱.۲ «از همه جا از همه رنگ» نه', explainOn_(ENRICH_SHOW_VARIETY) === false);
  const keep = CFG.EXPLAIN_ENABLED;
  CFG.EXPLAIN_ENABLED = false;
  ok('۱.۳ و خاموشیِ صریح یعنی هیچ‌کدام', explainOn_(ENRICH_SHOW_SPECIAL) === false);
  CFG.EXPLAIN_ENABLED = keep;
}

console.log('=== ۲) سهمِ نویسه‌ای: ۱۳٪، ولی هرگز بیرون‌زده از «یک فایل» ===');
{
  /* اندازهٔ نمونه از خودِ سقف گرفته می‌شود، نه از یک عددِ ثابت: از ۶٫۲۹ سقفِ
     «یک فایل» از اندازه‌گیریِ واقعیِ صدا می‌آید و می‌تواند عوض شود. نمونه‌ای
     که تصادفاً سرِ سقف بنشیند، این سنجه را — که دربارهٔ سهمِ ۱۳٪ است — به
     سنجهٔ سقف تبدیل می‌کند و «شکست»ش هیچ چیزی نمی‌گوید. */
  const ep = mkEp(4);
  const base = specialNarration_(ep).length;
  const b = explainBudget_(ep);
  /* سهم از خودِ CFG خوانده می‌شود، نه از عددِ ثابت: ۶٫۴۳ آن را ۱۳ ← ۲۰ برد
     («از این حالتِ خیلی مسخره و کوتاه در بیاد») و سنجه‌ای که عدد را در خودش
     تکرار کند، هر بار با تغییرِ یک تنظیم می‌شکند بی آنکه چیزی خراب شده باشد. */
  ok('۲.۱ سهمِ اعلام‌شدهٔ متنِ درس است',
     b === Math.round(base * Number(CFG.EXPLAIN_PCT) / 100),
     b + ' از ' + base + ' (' + CFG.EXPLAIN_PCT + '٪)');

  /* ۵٫۹۶ دوباره: «سقفی که مرحلهٔ بعد بتواند رویش اضافه کند، سقف نیست.»
     عصری‌سازی همان مرحلهٔ بعد است، پس نگهبانِ دومش همین‌جاست. */
  /* اندازه از خودِ specialNarration_ گرفته می‌شود، نه از طولِ رشته‌ای که
     ساختیم: عنوان و جداکننده هم در آن حساب می‌شوند و اختلافِ چندنویسه‌ای
     این سنجه را شکننده می‌کرد. */
  const big = { sections: [{ heading: 'ب', narration: 'م'.repeat(specialFileCap_() - 50) }] };
  const room = Math.max(0, specialFileCap_() - specialNarration_(big).length);
  /* ولی این نگهبان **فقط وقتی «یک فایل» خواسته شده** معنا دارد. از ۶٫۴۳ که
     دو فایل مجاز است (خواستهٔ صریحِ صاحبِ برنامه)، اعمالش یعنی عصری‌سازی را
     بی‌دلیل خفه کنیم — قیدی که برداشته شده نباید از راهِ دیگری برگردد.
     پس سنجه هر دو حالت را می‌سنجد، نه اینکه یکی‌شان را نادیده بگیرد. */
  if (CFG.SPECIAL_ONE_FILE === true) {
    ok('۲.۲ وقتی «یک فایل» خواسته شده و متن سرِ سقف است، سهم به جای باقی‌مانده می‌رسد',
       room > 0 && room < 100 && explainBudget_(big) === room,
       explainBudget_(big) + ' = ' + room);
  } else {
    ok('۲.۲ با خاموش‌بودنِ «یک فایل»، سقفِ فایل سهمِ عصری‌سازی را نمی‌بندد',
       explainBudget_(big) > room,
       explainBudget_(big) + ' > جای یک فایل (' + room + ')');
  }
  const over = { sections: [{ heading: 'ب', narration: 'م'.repeat(specialFileCap_() + 500) }] };
  if (CFG.SPECIAL_ONE_FILE === true) {
    ok('۲.۳ و اگر جایی نمانده، صفر — نه اینکه از سقف بزند بیرون',
       explainBudget_(over) === 0, String(explainBudget_(over)));
  } else {
    /* با خاموش‌بودنِ «یک فایل»، «جا نمانده» بی‌معناست — قسمت در دو فایل
       می‌رود. ولی سهم هنوز باید نسبتِ اعلام‌شده باشد، نه بی‌کران: قیدی که
       برداشته می‌شود نباید سقفِ نسبت را هم با خودش ببرد. */
    ok('۲.۳ با خاموش‌بودنِ «یک فایل»، سهم همان نسبتِ اعلام‌شده می‌مانَد',
       explainBudget_(over) ===
         Math.round(specialNarration_(over).length * Number(CFG.EXPLAIN_PCT) / 100),
       String(explainBudget_(over)));
  }

  /* و سهمش باید از پیش کنار گذاشته شده باشد، وگرنه هیچ‌وقت جا نیست. */
  ok('۲.۴ سقفِ نگارش هم سهمِ عصری‌سازی را کنار می‌گذارد',
     specialWriteCap_() < Math.floor(specialFileCap_() / (1 + 12 / 100)),
     specialWriteCap_() + ' < ' + Math.floor(specialFileCap_() / 1.12));
}

console.log('=== ۳) نقشه: پیشنهادِ مدل با سه سد ===');
{
  const mk = spots => { global.__STUB = () => ({ code: 200, json: { candidates: [{ content: {
    parts: [{ text: JSON.stringify({ spots: spots }) }] } }] } }); };

  let ep = mkEp(4);
  mk([{ section: '1', at: 'انتها', why: 'سنگین است', text: TXT('یک') },
      { section: '۳', at: 'ابتدا', why: 'اصطلاح دارد', text: TXT('دو') }]);
  let r = explainPlan_(ep, 5, 'مجموعهٔ آزمایشی');
  ok('۳.۱ دو جا پذیرفته شد', r.ok && r.n === 2, JSON.stringify(r));
  ok('۳.۲ رقمِ فارسی هم شمارهٔ بخش است', ep.__explain.spots[1].section === 3);
  ok('۳.۳ «ابتدا»/«انتها» درست خوانده شد',
     ep.__explain.spots[0].at === 'after' && ep.__explain.spots[1].at === 'before');

  ep = mkEp(4);
  mk([{ section: '99', at: 'انتها', text: TXT('سه') }]);
  r = explainPlan_(ep, 5, 'م');
  /* شمارهٔ ناموجود = توهمِ مدل. چسباندنش به بخشِ صفر یعنی توضیحی که سرِ جای
     غلط پخش می‌شود — از نبودنش بدتر، چون شنونده گمراه می‌شود. */
  ok('۳.۴ شمارهٔ بخشِ ناموجود دور انداخته می‌شود، نه اینکه به بخشِ صفر بچسبد',
     !r.ok && !ep.__explain, r.why);

  ep = mkEp(4);
  mk([{ section: '1', at: 'انتها', text: 'خیلی کوتاه.' }]);
  ok('۳.۵ متنِ تعارفیِ کوتاه هم', explainPlan_(ep, 5, 'م').ok === false);

  ep = mkEp(4);
  mk([{ section: '1', at: 'انتها', text: TXT('چهار') },
      { section: '1', at: 'انتها', text: TXT('پنج') }]);
  ok('۳.۶ دو توضیح در یک جا، یکی می‌شود', explainPlan_(ep, 5, 'م').n === 1);

  /* هشت بخش، هشت پیشنهادِ کوتاه — یعنی سهمِ نویسه‌ای جا دارد و تنها چیزی که
     جلو را می‌گیرد سقفِ *تعداد* است. اگر متن‌ها بلند بودند، این سنجه ممکن
     بود به‌خاطرِ سهم بگذرد و ادعای خودش را ثابت نکند. */
  /* ══ و یک واقعیتِ تازه که باید ثبت شود (۶٫۲۹) ══
     با سقفِ اندازه‌گیری‌شدهٔ «یک فایل»، سهمِ ۱۳ درصدی در یک درسِ *واقعی* هرگز
     سه توضیحِ کاملِ بالای EXPLAIN_MIN_CHARS را نمی‌خرد — یعنی در عمل «سهم»
     زودتر از «شمار» می‌بُرد و EXPLAIN_MAX_SPOTS دیگر سدِ فعال نیست. این خودش
     یک خبر است، نه یک عیب: سه توضیحِ بریده بدتر از دو توضیحِ کامل است.
     ولی سدِ شمار باید همچنان *کار* کند، وگرنه روزی که سهم بالا برود کسی
     نمی‌داند هنوز هست یا نه. پس اینجا سهم موقتاً باز می‌شود تا فقط شمار
     بماند — همان چیزی که این بلوک ادعایش را دارد. */
  const keepPct = CFG.EXPLAIN_PCT;
  CFG.EXPLAIN_PCT = 70;   // ۶٫۵۵: سهمِ واقعی ۲۵ شد؛ برای بازماندنِ سهم عددِ بزرگ‌تر لازم است
  ep = mkEp(8, 8);
  mk(Array.from({ length: 8 }, (_, i) => ({ section: String(i), at: 'انتها', text: TXTS(i) })));
  r = explainPlan_(ep, 5, 'م');
  let sum0 = 0;
  for (let q = 0; q < CFG.EXPLAIN_MAX_SPOTS; q++) sum0 += TXTS(q).length;
  ok('۳.۷-الف نمونه طوری چیده شده که سهم مانعِ سقفِ تعداد نشود',
     sum0 <= explainBudget_(ep) && TXTS(0).length >= 80,
     sum0 + ' ≤ ' + explainBudget_(ep));
  /* «توضیح‌دهنده‌ای که همه‌جا هست، گویندهٔ دوم است و درس را دو برابر می‌کند.» */
  ok('۳.۷ پس سقفِ تعداد است که می‌بُرد',
     r.n === CFG.EXPLAIN_MAX_SPOTS, 'n=' + r.n);
  CFG.EXPLAIN_PCT = keepPct;
  /* و بلافاصله همان نمونه با سهمِ واقعی: حالا سهم است که می‌بُرد. */
  ok('۳.۷-ب با سهمِ واقعی، «سهم» زودتر از «شمار» می‌بُرد',
     explainPlan_(mkEp(4), 5, 'م').n < CFG.EXPLAIN_MAX_SPOTS);

  ep = mkEp(4);
  mk([{ section: '0', at: 'انتها', text: TXT('الف') },
      { section: '1', at: 'انتها', text: TXT('ب') },
      { section: '2', at: 'انتها', text: TXT('پ') }]);
  explainPlan_(ep, 5, 'م');
  let sum = 0; ep.__explain.spots.forEach(s => { sum += s.text.length; });
  ok('۳.۸ و مجموعِ نویسه از سهم نمی‌گذرد',
     sum <= explainBudget_(ep), sum + ' ≤ ' + explainBudget_(ep));

  ep = mkEp(4);
  global.__STUB = () => { throw new Error('down'); };
  r = explainPlan_(ep, 5, 'م');
  ok('۳.۹ مدلِ از دسترس خارج، قسمت را زمین نمی‌زند', r.ok === false && !!r.why, r.why);

  ep = mkEp(4);
  mk([{ section: '1', at: 'انتها', text: TXT('شش') }]);
  explainPlan_(ep, 5, 'م');
  const sig = ep.__explain.sig;
  global.__STUB = () => { throw new Error('نباید دوباره پرسیده شود'); };
  r = explainPlan_(ep, 5, 'م');
  ok('۳.۱۰ اجرای دوباره روی همان متن، فراخوانِ تازه نمی‌زند',
     r.ok && ep.__explain.sig === sig, r.why);
  /* ولی متنی که عوض شده، نقشهٔ کهنه را نمی‌پذیرد: توضیحی که به «بخشِ ۳»
     اشاره کند وقتی بخشِ ۳ دیگر آن نیست، بدتر از نبودنش است. */
  // بخشِ افزوده عمداً کوتاه است: نمونه باید زیرِ سقفِ «یک فایل» بماند، وگرنه
  // سهم صفر می‌شود و این سنجه به‌جای «نقشه از نو ساخته شد» چیزِ دیگری می‌سنجد.
  ep.sections.push(SEC(9, 4));
  mk([{ section: '0', at: 'انتها', text: TXT('هفت') }]);
  explainPlan_(ep, 5, 'م');
  ok('۳.۱۱ ولی با عوض‌شدنِ متن، نقشه از نو ساخته می‌شود',
     ep.__explain.sig !== sig);
}

console.log('=== ۴) بریدن روی مرزِ جمله ===');
{
  const t = 'جملهٔ اول کامل است. جملهٔ دوم هم همین‌طور. و این سومی است.';
  const c = explainTrim_(t, 40);
  ok('۴.۱ روی نقطه بریده می‌شود', /\.$/.test(c) && c.length <= 40, JSON.stringify(c));
  /* بریدنِ وسطِ جمله در متنِ گفتنی یعنی صدایی که وسطِ حرف قطع می‌شود، و آن
     را شنونده می‌شنود — برخلافِ متنی که فقط خوانده می‌شود. */
  ok('۴.۲ و اگر جملهٔ کامل جا نشد، هیچ برمی‌گردد نه نصفِ جمله',
     explainTrim_('یک جملهٔ بسیار طولانی بی هیچ نقطه‌ای در میانه‌اش', 20) === '');
}

console.log('=== ۵) قطعه‌ها سرِ جای درست در فهرستِ بخش‌ها می‌نشینند ===');
{
  const ep = mkEpSized(3);
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ spots: [
      { section: '0', at: 'انتها', text: TXT('الف') },
      { section: '2', at: 'ابتدا', text: TXT('ب') }] }) }] } }] } });
  explainPlan_(ep, 4, 'م');
  const segs = specialSegments_(ep, 'علمی و آموزشی');
  const kinds = segs.map(s => s.kind + (s.secIndex === undefined ? '' : ':' + s.secIndex));
  ok('۵.۱ توضیحِ «انتها» پس از بخشِ خودش می‌آید',
     kinds.indexOf('explain:0') === kinds.indexOf('body:0') + 1, kinds.join(' '));
  ok('۵.۲ و توضیحِ «ابتدا» پیش از بخشِ خودش',
     kinds.indexOf('explain:2') === kinds.indexOf('body:2') - 1, kinds.join(' '));
  ok('۵.۳ هیچ بخشی از بین نرفت',
     kinds.filter(k => k.indexOf('body:') === 0).length === 3);
  ok('۵.۴ و لحنش با بدنهٔ درس یکی نیست',
     segs[kinds.indexOf('explain:0')].style.indexOf('خودمانی') !== -1);

  /* و بی نقشه، فهرست دقیقاً همان چیزی است که پیش از ۶٫۲۱ بود. */
  const plain = specialSegments_(mkEpSized(3), 'علمی و آموزشی');
  ok('۵.۵ بی نقشه، هیچ قطعهٔ تازه‌ای اضافه نمی‌شود',
     plain.every(s => s.kind !== 'explain'));
}

console.log('=== ۶) صدا: «یه نفر غیر از اون گوینده» ===');
{
  const cast = { lead: 'Kore', mates: ['Puck', 'Charon'], all: ['Kore', 'Puck', 'Charon'] };
  const mk = slot => ([
    { text: 'قلاب', kind: 'hook', tone: '' },
    { text: 'ب'.repeat(4000), kind: 'body', tone: 'آموزشی', secIndex: 0 },
    { text: TXT('x'), kind: 'explain', tone: 'خودمانی', secIndex: 0, explainSlot: slot },
    { text: 'ب'.repeat(4000), kind: 'body', tone: 'آموزشی', secIndex: 1 },
    { text: 'پایان', kind: 'outro', tone: '' }
  ]);
  let segs = assignSegmentVoices_(mk(0), cast, 'علمی و آموزشی');
  const xi = 2;
  /* این سنجهٔ اصلیِ این بخش است. حلقهٔ بازتوزیع پایین‌ترِ assignSegmentVoices_
     بلندترین بخش‌ها را به گویندهٔ اصلی برمی‌گردانَد تا سهمش زیرِ ۴۵٪ نیفتد؛
     اگر قطعهٔ توضیح‌دهنده هم در آن حلقه بود، روزی پس گرفته می‌شد و کلِ
     قابلیت بی‌صدا از بین می‌رفت. */
  ok('۶.۱ توضیح‌دهنده هرگز گویندهٔ اصلی نیست',
     segs[xi].voice !== cast.lead, segs[xi].voice);
  ok('۶.۲ و بخش‌های بدنه همچنان بازتوزیع می‌شوند',
     segs[1].voice === cast.lead || segs[3].voice === cast.lead);

  /* «گاهی هم باید تغییر کنه» — نوبت از شمارهٔ قسمت می‌آید. */
  const v0 = assignSegmentVoices_(mk(0), cast, 'ع')[xi].voice;
  const v1 = assignSegmentVoices_(mk(1), cast, 'ع')[xi].voice;
  ok('۶.۳ و در قسمتِ بعد صدایش عوض می‌شود', v0 !== v1, v0 + ' → ' + v1);
  ok('۶.۴ ولی در یک قسمت ثابت می‌مانَد',
     assignSegmentVoices_(mk(1), cast, 'ع')[xi].voice === v1);

  /* تنها یک صدا: متن ارزشِ خودش را دارد و نگه داشته می‌شود. */
  const solo = { lead: 'Kore', mates: [], all: ['Kore'] };
  ok('۶.۵ با یک صدا، متن می‌مانَد و صدا ناچار همان اصلی است',
     assignSegmentVoices_(mk(0), solo, 'ع')[xi].voice === 'Kore');
}

console.log('=== ۷) پرامپت: مرزهای محتوایی واقعاً فرستاده می‌شوند ===');
{
  let sent = '';
  global.__STUB = (url, body) => {
    sent = String(body.contents[0].parts[0].text);
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ spots: [{ section: '0', at: 'انتها', text: TXT('y') }] }) }] } }] } };
  };
  const ep = mkEp(3);
  explainPlan_(ep, 7, 'مجموعهٔ فلسفه');
  /* «نه اینکه از محتوای اصلی عدول کنه» — مهم‌ترین مرزِ این بخش. */
  ok('۷.۱ «عدول نکن» در پرامپت هست', sent.indexOf('عدول نکن') !== -1);
  ok('۷.۲ و «نصیحت نکن» هم', sent.indexOf('نصیحت نکن') !== -1);
  ok('۷.۳ و «خلاصه نکن، ساده کن»', sent.indexOf('خلاصه نکن') !== -1);
  ok('۷.۴ متنِ کاملِ بخش‌ها داده می‌شود، نه فقط عنوان‌ها',
     sent.indexOf('تمایزش با مفهومِ پیشین') !== -1);
  ok('۷.۵ و سقفِ نویسه عدد دارد', sent.indexOf(String(explainBudget_(ep))) !== -1);
  ok('۷.۶ نامِ مجموعه هم', sent.indexOf('مجموعهٔ فلسفه') !== -1);
}

console.log('=== ۸) کارنامه: خاموشیِ بی‌صدا دیده می‌شود ===');
{
  delete global.__PROPS[PK.EXPLAIN];
  let s = explainStatus_();
  ok('۸.۱ بی هیچ اجرایی، خودش را اعلام می‌کند',
     s.line.indexOf('هنوز') !== -1 && s.ok === true, s.line);
  for (let i = 0; i < 5; i++) explainLog_(i, 0, 0, 'مدل جایی پیشنهاد نداد');
  s = explainStatus_();
  /* «قابلیتی که خودش را بی‌صدا خاموش کند» — بانکِ موسیقی هفته‌ها همین بود. */
  ok('۸.۲ پنج قسمتِ پیاپیِ بی‌توضیح، مشکل است نه یادداشت',
     s.ok === false && s.line.indexOf('پیاپی') !== -1, s.line);
  explainLog_(6, 2, 900, '');
  s = explainStatus_();
  ok('۸.۳ و یک قسمتِ موفق هشدار را می‌بندد', s.ok === true, s.line);
  ok('۸.۴ عددها فارسی‌اند', /[۰-۹]/.test(s.line) && !/\d/.test(s.line), s.line);
  for (let i = 0; i < 30; i++) explainLog_(i, 1, 100, '');
  ok('۸.۵ کارنامه ده تای آخر را نگه می‌دارد',
     JSON.parse(global.__PROPS[PK.EXPLAIN]).length === 10);

  /* ══ «چرا امروز نشد» باید همان روز گفته شود (۶٫۷۷) ══
   * قسمتِ ۲۵ بی عصری‌سازی رفت و علتش — سهمِ نویسه‌ایِ ناکافی، چون خودِ درس
   * کوتاه بود — فقط در انبارِ داخلی ماند: خطِ روزانه آن را تنها پس از پنج
   * شبِ خشک می‌گفت. صاحبِ برنامه شیت و انبار باز نمی‌کند (قاعدهٔ ۵٫۹۰). */
  delete global.__PROPS[PK.EXPLAIN];
  explainLog_(25, 0, 0, explainSkipWhy_(756, 900, 3025));
  s = explainStatus_();
  ok('۸.۶ یک قسمتِ بی‌توضیح، همان روز در خطِ روزانه گفته می‌شود',
     /آخرین قسمت/.test(s.line) && /هیچ توضیح‌دهنده‌ای نگرفت/.test(s.line), s.line);
  ok('۸.۷ و علتش هم با خودش می‌آید — نه فقط «نشد»',
     /سهمِ نویسه‌ای/.test(s.line) && /کوتاه بوده/.test(s.line));
  ok('۸.۷-ب و رقم‌هایش فارسی‌اند — این خط را آدم می‌خواند',
     /۷۵۶/.test(s.line) && !/\d/.test(s.line), s.line);
  ok('۸.۸ ولی یک شبِ بی‌توضیح «مشکل» نیست — هشداری که هر شب بزند خوانده نمی‌شود',
     s.ok === true);
  ok('۸.۹ و آخرین قسمت در وضعیت هم ثبت می‌شود، برای ناظر',
     s.last && String(s.last.ep) === '25' && s.last.n === 0 && /سهمِ نویسه/.test(s.last.why));
  explainLog_(26, 2, 900, '');
  s = explainStatus_();
  ok('۸.۱۰ و قسمتِ موفق همان‌جا با شمارِ توضیح‌ها گزارش می‌شود',
     /آخرین قسمت/.test(s.line) && /توضیح‌دهنده\./.test(s.line) &&
     !/نگرفت/.test(s.line), s.line);

  // و علتِ خودِ سد باید عدد داشته باشد، وگرنه اقدام‌پذیر نیست
  const p29 = fs.readFileSync('src/29_Explain.gs', 'utf8');
  ok('۸.۱۱ علتِ «سهم کافی نبود» یک تعریف دارد و همان‌جا صدا زده می‌شود',
     /out\.why = explainSkipWhy_\(budget, min, baseN\);/.test(p29) &&
     /function explainSkipWhy_/.test(p29));
  ok('۸.۱۲ و متنِ درس را هم می‌شمارد، تا معلوم باشد کوتاهی از کجاست',
     explainSkipWhy_(756, 900, 3025).indexOf('۳۰۲۵') !== -1,
     explainSkipWhy_(756, 900, 3025));
}

console.log('=== ۹) برنامهٔ متنوع: سدِ تفسیرِ کلیشه‌ای و نصیحت‌گونه ===');
{
  /* گزارشِ واقعیِ کاربر: خاطرهٔ ترسناکِ پیرزنِ تاکسی به‌عنوان «کمکِ اجتماعی»
     خوانده شد. این با قاعدهٔ ۸-چ (تفسیرِ بی‌مبنا) گرفته نمی‌شد، چون اینجا
     چیزی «ساخته» نشده بود — فقط معنا تخت شده بود. */
  const when = todayWords_();
  const items = [{ id: 'X1', kind: 'عکس', summary: 'خ', body: 'م', topic: 'ت', msg: 'پ',
                   vibe: 'و', link: '', date: '' }];
  const p = buildPrompt_('اجتماعی و مردمی', items, '', '', [], when, []);
  ok('۹.۱ قاعدهٔ «تا آخر بخوان، بعد تصمیم بگیر» در پرامپت هست',
     p.indexOf('اول تا آخرِ هر آیتم را بخوان') !== -1);
  ok('۹.۲ و نمونهٔ واقعیِ تاکسی، نه یک قاعدهٔ انتزاعی',
     p.indexOf('تاکسی') !== -1 && p.indexOf('پیرزنی') !== -1);
  ok('۹.۳ «نتیجه‌گیریِ اخلاقی نچسبان»',
     p.indexOf('نتیجه‌گیریِ اخلاقی نچسبان') !== -1);
  /* و حدسِ خودِ کاربر دربارهٔ ریشه: «شاید محتواها در شیت‌ها در دسته‌های
     اشتباه رفتن … و مدل بر اساس اون دسته می‌بینه». */
  ok('۹.۴ و دسته «برچسبِ بایگانی است، نه عینکِ خواندن»',
     p.indexOf('برچسبِ بایگانی') !== -1 && p.indexOf('misfiled') !== -1);
  ok('۹.۵ شمای پاسخ هم فیلدِ misfiled را دارد',
     !!EPISODE_SCHEMA.properties.misfiled);
}

console.log('=== ۱۰) آیتمِ بددسته → یافته، نه جابه‌جاییِ خودکار ===');
{
  const hub = new Spread('hub', 'HUBX');
  global.__SS['HUBX'] = hub; global.__PROPS['HUB_ID'] = 'HUBX';
  _hubCache = null;
  ensureTab_(hub, CFG.REPORT_TAB, REPORT_HEADERS);
  const items = [{ id: 'A1' }, { id: 'A2' }];
  const rows = () => hub.getSheetByName(CFG.REPORT_TAB)._d.slice(1);

  let n = misfiledReport_(hub, { misfiled: [
    { id: 'A1', should: 'داستان و خاطره', why: 'خاطرهٔ ترسناک است' },
    { id: 'GHOST', should: 'ورزشی' },              // در آیتم‌های این قسمت نیست
    { id: 'A2', should: 'اجتماعی و مردمی' }        // همان دستهٔ فعلی
  ] }, 12, 'اجتماعی و مردمی', items);
  ok('۱۰.۱ فقط شناسهٔ واقعی و دستهٔ متفاوت شمرده می‌شود', n === 1, 'n=' + n);
  ok('۱۰.۲ و یک ردیفِ گزارش ساخته شد', rows().length === 1, String(rows().length));

  /* کلید بر پایهٔ دسته است نه قسمت: تکرارِ یک اشتباه در یک دسته همان چیزی
     است که باید دیده شود، و ردیفِ تازه به‌ازای هر قسمت آن تکرار را پنهان
     می‌کند — درسِ «خانوادهٔ نامِ فایل» در ۵٫۹۶. */
  misfiledReport_(hub, { misfiled: [{ id: 'A1', should: 'داستان و خاطره' }] },
                  13, 'اجتماعی و مردمی', items);
  ok('۱۰.۳ تکرار در همان دسته، ردیفِ تازه نمی‌سازد', rows().length === 1,
     String(rows().length));

  ok('۱۰.۴ و قسمتی بی هیچ موردی، هیچ ردیفی نمی‌سازد',
     misfiledReport_(hub, {}, 14, 'اجتماعی و مردمی', items) === 0 &&
     rows().length === 1);

  /* عمداً فقط گزارش: قاعدهٔ صریحِ صاحبِ برنامه این است که تحلیل‌های قبلی
     به هیچ وجه خراب و پاک نشوند. */
  /* ستونِ ۹ «مالکِ» ردیف است و ستونِ ۱۰ وضعیتش. اگر مالک واژهٔ «کد» داشته
     باشد، reportRow_ آن را به صفِ NEEDS_CODE می‌فرستد — یعنی صفی که نسخهٔ
     بعدیِ موتور از رویش ساخته می‌شود. یک آیتمِ بددسته کارِ کد نیست و نباید
     آن صف را شلوغ کند. */
  ok('۱۰.۵ ردیف مالِ موتور است، نه صفِ تغییرِ کد',
     rows()[0][8] === ROWNER_ENGINE && rows()[0][9] !== RST.NEEDS_CODE,
     JSON.stringify(rows()[0][8]) + ' / ' + JSON.stringify(rows()[0][9]));
}

console.log('=== ۱۱) بازبینیِ محتوایی — «دوباره قبل از تولید بررسی بشه» ===');
{
  /* ══ چرا این بلوک هست ══
   * خواستهٔ صریح: «این هم متنش باید دقیق تنظیم بشه و **دوباره قبل از تولید
   * بررسی بشه**.» در ۶٫۲۱ این را جا انداختم — متنِ توضیح‌دهنده فقط از
   * بازبینیِ *تلفظ* رد می‌شد، که دربارهٔ اعراب حرف می‌زند نه معنا. هیچ سدی
   * نمی‌پرسید «این اصلاً چیزی را توضیح می‌دهد؟»، و صاحبِ برنامه در قسمتِ
   * واقعی شنید: «یکی‌اش خیلی بی‌معنی بود… بی‌ربط حرف زده.» */
  const ep = mkEpSized(3);
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ spots: [
      { section: '0', at: 'انتها', text: TXT('الف') },
      { section: '2', at: 'انتها', text: TXT('ب') }] }) }] } }] } });
  explainPlan_(ep, 4, 'م');
  ok('۱۱.۱ دو توضیح ساخته شد', ep.__explain.spots.length === 2);

  const judge = v => { global.__STUB = () => ({ code: 200, json: { candidates: [{ content: {
    parts: [{ text: JSON.stringify({ verdicts: v }) }] } }] } }); };

  judge([{ section: '0', keep: 'بله', why: 'خوب است' },
         { section: '2', keep: 'خیر', why: 'بی‌ربط و بی‌مثال' }]);
  const r = explainReview_(ep);
  ok('۱۱.۲ توضیحِ بی‌ربط انداخته می‌شود', r.dropped === 1 && r.kept === 1, JSON.stringify(r));
  ok('۱۱.۳ و همان که ماند، درست همان است که داور نگه داشت',
     ep.__explain.spots.length === 1 && Number(ep.__explain.spots[0].section) === 0);
  ok('۱۱.۴ و علتش ثبت می‌شود', r.notes.join(' ').indexOf('بی‌ربط') !== -1, r.notes.join(' '));

  /* ══ پیش‌فرض نگه‌داشتن است، نه انداختن ══
   * داوری که در دسترس نباشد نباید کلِ عصری‌سازی را خاموش کند — همان قاعدهٔ
   * «مدلِ غایب، تأییدِ خاموش نیست» ولی در جهتِ درست: اینجا نبودِ داور
   * دلیلِ انداختن نیست، چون متن از سدهای دیگر رد شده. */
  const ep2 = mkEpSized(3);
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ spots: [{ section: '1', at: 'انتها', text: TXT('پ') }] }) }] } }] } });
  explainPlan_(ep2, 4, 'م');
  global.__STUB = () => { throw new Error('down'); };
  ok('۱۱.۵ داورِ از دسترس خارج، توضیح را نمی‌اندازد',
     explainReview_(ep2).kept === 1 && ep2.__explain.spots.length === 1);

  const ep3 = mkEpSized(3);
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ spots: [{ section: '1', at: 'انتها', text: TXT('ت') }] }) }] } }] } });
  explainPlan_(ep3, 4, 'م');
  judge([{ section: '1', keep: 'شاید', why: '' }]);
  ok('۱۱.۶ و جوابِ نامفهومِ داور هم یعنی نگه‌دار',
     explainReview_(ep3).dropped === 0);
}

console.log('=== ۱۲) کفِ طول: تیکهٔ بریده از نبودنش بدتر است ===');
{
  /* صاحبِ برنامه شنید: «یکی دو تیکه دیدم که خیلی کوتاه بود». علتش این بود
     که وقتی متنِ درس نزدیکِ سقفِ «یک فایل» می‌نشیند سهم فرو می‌ریزد، و کفِ
     ۸۰ نویسهٔ قبلی اجازه می‌داد تیکه‌های بریده هم بمانند. */
  ok('۱۲.۱ کف واقعی است، نه یک جملهٔ تعارفی', Number(CFG.EXPLAIN_MIN_CHARS) >= 250);
  /* ══ نمونه از **درسِ کوتاه** ساخته می‌شود، نه از فشارِ سقفِ یک فایل (۶٫۴۳) ══
   * تا ۶٫۴۲ این بلوک درسی می‌ساخت که تا لبِ سقفِ «یک فایل» پر باشد، تا سهم
   * فرو بریزد. با خاموش‌شدنِ آن کلید (خواستهٔ صاحبِ برنامه) آن راه دیگر سهم
   * را کم نمی‌کند و سنجه شکست — در حالی که قاعده‌ای که می‌سنجید هنوز درست
   * است: **سهمی که به کف نرسد یعنی هیچ توضیحی، نه توضیحِ بریده.**
   * یک درسِ کوتاه همان وضع را می‌سازد و به هیچ کلیدی بند نیست. */
  const shortLen = Math.floor(Number(CFG.EXPLAIN_MIN_CHARS) * 100 /
                              Number(CFG.EXPLAIN_PCT)) - 200;
  const tight = { sections: [{ heading: 'ب', narration: 'م'.repeat(Math.max(200, shortLen)) }] };
  ok('۱۲.۱-ب و نمونه واقعاً زیرِ کف است',
     explainBudget_(tight) < Number(CFG.EXPLAIN_MIN_CHARS),
     explainBudget_(tight) + ' < ' + CFG.EXPLAIN_MIN_CHARS);
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ spots: [{ section: '0', at: 'انتها', text: TXT('ث') }] }) }] } }] } });
  const rr = explainPlan_(tight, 4, 'م');
  ok('۱۲.۲ سهمی که به کف نمی‌رسد یعنی هیچ توضیحی، نه توضیحِ بریده',
     rr.ok === false && !tight.__explain, rr.why);
  /* و وقتی سهم حتی به کفِ *یک* توضیح هم نمی‌رسد، صریح گفته می‌شود —
     نه اینکه در سکوت هیچ توضیحی نسازد. */
  ok('۱۲.۳ و اگر سهم به کفِ یک توضیح هم نرسد، علتش صریح است',
     rr.ok === false && /کافی نبود/.test(rr.why), rr.why);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
