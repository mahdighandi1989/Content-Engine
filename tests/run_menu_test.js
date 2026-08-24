/* منو: هر گزینه، و مرزهایی که پشتِ آن گزینه‌ها هستند (۵٫۹۵).
 *
 * این سنجه از یک وارسیِ کاملِ منو بیرون آمد: چهل‌ویک گزینه، هر کدام با
 * وابستگی‌هایش. سه چیز پیدا شد که هیچ آزمونی نمی‌گرفت، و هر سه از یک جنس‌اند
 * — کدی که *ادعا* می‌کند کاری را کرده، بی آنکه کسی از خودِ نتیجه بپرسد:
 *
 *  ۱) «حذف زمان‌بندی» فهرستِ دستی‌نوشتهٔ ده‌تایی داشت و سه تریگر را جا
 *     می‌گذاشت (prepareEpisode، prepareSpecialEpisode، selfUpdateDaily) —
 *     ولی پیامش می‌گفت «زمان‌بندی حذف شد».
 *  ۲) «بازگشت به نسخهٔ پشتیبانِ کد» تازه‌ترین فایلِ «پیش از»دارِ پوشهٔ کدها را
 *     برمی‌داشت — و آن فایل هر شب که تحلیلگرِ منبع نصب شود، مالِ تحلیلگر
 *     است، نه موتور.
 *  ۳) «بررسی و نصبِ کدِ تازه» هنوز از _CODE-LATEST.json حرف می‌زد؛ مسیری که
 *     از ۵٫۱۲ مرده است.
 *
 * سنجه‌ها عمداً از **خودِ توابع** می‌پرسند، نه از متنِ کد.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

/* گزینه‌های منو، از خودِ فایلِ منو — نه از فهرستی که این‌جا دوباره نوشته شود.
   فهرستِ دستی همان چیزی است که در removeTriggers کهنه شد. */
const setup = fs.readFileSync('src/05_Setup.gs', 'utf8');
const MENU = [...setup.matchAll(/\.addItem\(\s*'[^']*'\s*,\s*'([A-Za-z_$][\w$]*)'\s*\)/g)]
  .map(m => m[1]);

console.log('=== ۱) هر گزینهٔ منو یک تابعِ واقعی است ===');
{
  ok('۱.۱ منو خوانده شد', MENU.length >= 40, MENU.length + ' گزینه');
  const missing = MENU.filter(fn => typeof global[fn] !== 'function');
  ok('۱.۲ هیچ گزینه‌ای تابعِ گم‌شده ندارد', missing.length === 0, missing.join('، '));
  /* دو بار تعریف‌شدن بدتر از نبودن است: در فایلِ سرِهم‌شده دومی اولی را
     بی‌صدا می‌بلعد و رفتارِ منو به ترتیبِ فایل‌ها بند می‌شود. */
  const dup = MENU.filter(fn =>
    (src.match(new RegExp('^function ' + fn + '\\s*\\(', 'gm')) || []).length !== 1);
  ok('۱.۳ و هیچ‌کدام دو بار تعریف نشده', dup.length === 0, dup.join('، '));
}

console.log('=== ۲) حذفِ زمان‌بندی همان چیزی را برمی‌دارد که نصب گذاشته ===');
{
  /* این سنجه عمداً فهرستِ تریگرها را **نمی‌نویسد**. installTriggers را
     می‌دواند و بعد removeTriggers را، و می‌پرسد چه ماند. قابلیتِ بعدی که
     زمان‌بندیِ خودش را بیاورد، بی هیچ ویرایشی این‌جا پوشش دارد — و اگر
     removeTriggers دوباره عقب بیفتد، همین‌جا می‌شکند. */
  global.__TRIGGERS.length = 0;
  global.__UI = null;                       // بی‌پنجره، مثل اجرای زمان‌بندی
  installTriggers();
  const made = global.__TRIGGERS.map(t => t.getHandlerFunction()).sort();
  ok('۲.۱ نصب، زمان‌بندی‌ها را ساخت', made.length >= 8, made.join('، '));
  ok('۲.۲ و آماده‌سازیِ متن و نصبِ شبانه هم در آن هست',
     made.indexOf('prepareEpisode') !== -1 && made.indexOf('selfUpdateDaily') !== -1);

  const r = removeTriggers(true);
  const left = global.__TRIGGERS.map(t => t.getHandlerFunction());
  ok('۲.۳ پس از حذف، جز منو چیزی نمی‌ماند',
     left.filter(f => f !== 'onOpen').length === 0, left.join('، ') || '(خالی)');
  ok('۲.۴ منو دست‌نخورده می‌ماند', left.indexOf('onOpen') !== -1);
  ok('۲.۵ و چه چیزی رفت را برمی‌گرداند (ادعا نمی‌کند، نشان می‌دهد)',
     r && r.removed && r.removed.length >= 8, String(r && r.removed && r.removed.length));

  /* و دو بار نصب، تریگرِ تکراری نمی‌سازد. تا ۵٫۹۴ سه‌تا می‌ساخت — دو
     selfUpdateDaily یعنی دو کارِ شبانهٔ هم‌زمان روی یک پروژه. */
  global.__TRIGGERS.length = 0;
  installTriggers(); const once = global.__TRIGGERS.length;
  installTriggers(); const twice = global.__TRIGGERS.length;
  ok('۲.۶ فشردنِ دوبارهٔ «نصب زمان‌بندی» تکراری نمی‌سازد',
     once === twice, once + ' ← ' + twice);

  /* و خودِ وضعیت باید نام‌ها را بگوید، نه فقط شمار را — تکراری فقط از نام
     پیداست. */
  const lst = trigList_();
  ok('۲.۷ «نمایش وضعیت» نامِ زمان‌بندی‌ها را می‌آورد',
     lst.indexOf('produceEpisode') !== -1 && lst.indexOf('selfUpdateDaily') !== -1);
  global.__TRIGGERS.length = 0;
}

console.log('=== ۳) مرزِ کدِ موتور و کدِ تحلیلگرها ===');
{
  /* پوشهٔ «کدها» هر دو خانواده را دارد و هر دو در نامشان «پیش از» دارند.
     در دادهٔ واقعیِ ۲۴ اوت چهار فایلِ «منبع — … — پیش از نصبِ …» در همان
     پوشه بودند. تحلیلگرها هر شب نصب می‌شوند و موتور هر چند روز یک بار —
     پس تازه‌ترینِ پوشه معمولاً مالِ تحلیلگر است. */
  const analyzer = 'function onOpen(){}\nfunction analyzePhoto_(){}\n';
  const bad = engineTextProblems_(analyzer);
  ok('۳.۱ کدِ تحلیلگر «کدِ موتور» شناخته نمی‌شود', bad.length > 0, bad[0]);

  const engine = fs.readFileSync('engine.gs', 'utf8');
  ok('۳.۲ ولی خودِ engine.gs بی‌ایراد رد می‌شود',
     engineTextProblems_(engine).length === 0);

  /* پشتیبانِ واقعیِ موتور، رشتهٔ به‌هم‌چسبیدهٔ فایل‌های SERVER_JS است — نه
     خودِ engine.gs. آن هم باید قبول شود، وگرنه بازگشت هرگز کار نمی‌کند. */
  const asBackup = '\n/* ═══ موتور-محتوا ═══ */\n' + engine;
  ok('۳.۳ و شکلِ پشتیبان (با سرصفحهٔ فایل) هم قبول است',
     engineTextProblems_(asBackup).length === 0);

  /* و دروازه در خودِ installSource_ است، نه در فیلترِ نام — چون نام را
     می‌شود عوض کرد و مسیرِ بعدی می‌تواند فیلتر را از قلم بیندازد (همان
     کاری که installCodeRollback کرده بود). */
  let put = false;
  global.__STUB = () => { put = true; return { json: {} }; };
  const res = installSource_(analyzer, '1.2', 'آزمون');
  ok('۳.۴ installSource_ کدِ غیرموتور را پیش از هر تماسِ API رد می‌کند',
     res && res.ok === false && res.reason === 'not-engine' && put === false);
}

console.log('=== ۴) پیام‌هایی که از مکانیزمِ مرده حرف می‌زنند ===');
{
  /* «دستوری که غلط باشد از نبودنش بدتر است»: خواننده یا کارِ بی‌فایده
     می‌کند یا یاد می‌گیرد پیام‌ها را نخواند. */
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const menuFn = su.slice(su.indexOf('function runSelfUpdateNow'));
  const body = menuFn.slice(0, menuFn.indexOf('\n}'));
  ok('۴.۱ «نصبِ کدِ تازه» بی‌قید از _CODE-LATEST.json حرف نمی‌زند',
     body.indexOf('_CODE-LATEST.json') === -1 || body.indexOf("CODE_SOURCE === 'github'") !== -1);
  ok('۴.۲ و در حالتِ گیت‌هاب، گیت‌هاب را نام می‌برد',
     body.indexOf('گیت‌هاب') !== -1);
  /* و روالِ «فایل را از Cowork بگیر و Code.gs را عوض کن» هیچ‌جای موتور
     نمانده باشد — از ۵٫۱۲ موتور خودش نصب می‌کند. */
  ok('۴.۳ روالِ دستیِ پیش از ۵٫۱۲ هیچ‌جا تبلیغ نمی‌شود',
     src.indexOf('محتویات Code.gs') === -1 && src.indexOf('را در Code.gs بچسبانید') === -1);
}

console.log('=== ۵) بازسازیِ یک‌بارهٔ عنوانِ فصل‌ها ===');
{
  /* ۵٫۹۳ ورودی را تمیز کرد؛ فصل‌هایی که پیش از آن ساخته شده بودند
     دست‌نخورده ماندند. در جزوهٔ «معرفت شناسی» شش فصل پیشوندِ «فصل N:»
     داشتند و فهرست «فصل ۳: فصل ۳ — …» می‌شد. */
  const book = { chapters: [
    { id: 'c1', title: 'فصل ۱: تعریفِ معرفت', sections: [] },
    { id: 'c2', title: 'فصل 2 — منابعِ معرفت', sections: [] },
    { id: 'c3', title: '۳) شکاکیت', sections: [] },
    { id: 'c4', title: 'توجیه و صدق', sections: [] }
  ], refs: [], episodes: [], revision: 4 };
  const n = handoutRetitleBook_(book);
  ok('۵.۱ سه عنوانِ کهنه مرتب شد', n === 3, String(n));
  ok('۵.۲ و پیشوندها واقعاً رفته‌اند',
     book.chapters[0].title === 'تعریفِ معرفت' &&
     book.chapters[1].title === 'منابعِ معرفت' &&
     book.chapters[2].title === 'شکاکیت', book.chapters.map(c => c.title).join(' | '));
  ok('۵.۳ عنوانِ سالم دست‌نخورده می‌ماند', book.chapters[3].title === 'توجیه و صدق');
  /* دومین اجرا نباید چیزی عوض کند — وگرنه جارو هر شب همهٔ ۲۶۴ فایل را
     از نو می‌نوشت و تاریخِ تغییرشان را جابه‌جا می‌کرد. */
  ok('۵.۴ اجرای دوباره هیچ‌چیز را عوض نمی‌کند', handoutRetitleBook_(book) === 0);
  /* و هرگز عنوان را خالی نمی‌کند: فصلی که فقط «فصل ۵» نام دارد، نامش را
     نگه می‌دارد. عنوانِ خالی در فهرست، بدتر از عنوانِ زشت است. */
  const bare = { chapters: [{ id: 'c1', title: 'فصل ۵', sections: [] }] };
  handoutRetitleBook_(bare);
  ok('۵.۵ عنوان هرگز خالی نمی‌شود', String(bare.chapters[0].title).length > 0,
     bare.chapters[0].title);
}

console.log('=== ۶) بازسازی سه در دارد، نه یکی ===');
{
  /* نشانه‌ای که فقط کد بتواند بازش کند، سد است نه دروازه. این ریپو بارها
     از همین ضربه خورده. سه مسیر باید عنوان‌ها را مرتب کنند. */
  const h = fs.readFileSync('src/26_Handout.gs', 'utf8');
  const up = h.slice(h.indexOf('function handoutUpdate_'));
  ok('۶.۱ هر کتابی که به‌روز می‌شود، همان‌جا مرتب می‌شود',
     up.slice(0, up.indexOf('\nfunction ')).indexOf('handoutRetitleBook_') !== -1);
  const one = h.slice(h.indexOf('function handoutOneSeries_'));
  ok('۶.۲ دکمهٔ ذیلِ هر مجموعه هم مرتب می‌کند',
     one.slice(0, one.indexOf('\nfunction ')).indexOf('handoutRetitleBook_') !== -1);
  const nightly = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۶.۳ و جاروی شبانه به کتاب‌هایی می‌رسد که دیگر درسِ تازه نمی‌گیرند',
     nightly.indexOf('handoutRetitle_(') !== -1);
  /* جاروی شبانه پشتِ نگهبانِ زمان باشد، وگرنه کاری که واقعاً درس وارد
     می‌کند قربانیِ یک اصلاحِ آرایشی می‌شود (درسِ ۵٫۶۸). */
  const seg = nightly.slice(nightly.indexOf('handoutRetitle_(') - 400,
                            nightly.indexOf('handoutRetitle_(') + 60);
  ok('۶.۴ و پشتِ nightHas_ است', seg.indexOf('nightHas_') !== -1);
}

console.log('=== ۷) تریگرِ تکراری/گم‌شده را خودِ موتور می‌گوید ===');
{
  /* «من هیچ‌وقت نمی‌روم توی شیت و تب‌ها را نگاه کنم» — پس چیزی که فقط با
     باز کردنِ ویرایشگرِ Apps Script دیده شود، دیده نمی‌شود. تریگرِ تکراری
     دقیقاً از همان جنس بود: هیچ خطایی نمی‌داد و هیچ‌جا نوشته نمی‌شد. */
  global.__TRIGGERS.length = 0;
  delete global.__PROPS[PK.SCHED_OFF];
  installTriggers();
  const good = trigNames_();
  ok('۷.۱ وقتی همه‌چیز سرِ جایش است، نه تکراری نه گم',
     good.dups.length === 0 && good.missing.length === 0,
     JSON.stringify({ d: good.dups, m: good.missing }));

  // یک تریگرِ تکراری، دستی — همان چیزی که «نصب زمان‌بندی» تا ۵٫۹۴ می‌ساخت
  ScriptApp.newTrigger('selfUpdateDaily').timeBased().create();
  const dup = trigNames_();
  ok('۷.۲ تکراری شناخته می‌شود', dup.dups.length === 1 &&
     dup.dups[0].indexOf('selfUpdateDaily') === 0, dup.dups.join('، '));

  // و یکی را برداریم: گم‌شده هم باید دیده شود
  global.__TRIGGERS.length = 0;
  installTriggers();
  const idx = global.__TRIGGERS.findIndex(t => t.getHandlerFunction() === 'produceSpecialEpisode');
  global.__TRIGGERS.splice(idx, 1);
  const miss = trigNames_();
  ok('۷.۳ گم‌شده هم شناخته می‌شود',
     miss.missing.indexOf('produceSpecialEpisode') !== -1, miss.missing.join('، '));

  /* ولی خاموشیِ عمدی هشدار نیست. کسی که «حذف زمان‌بندی» را زده، هر روز
     نباید یک هشدارِ «نصب نیست» بگیرد — این همان هشداری است که آدم یاد
     می‌گیرد نادیده بگیرد. */
  global.__PROPS[PK.SCHED_OFF] = nowStr_();
  const off = trigNames_();
  ok('۷.۴ ولی خاموشیِ عمدی هشدار ندارد',
     off.missing.length === 0 && off.off === true);
  delete global.__PROPS[PK.SCHED_OFF];

  /* و فهرست باید در _STATUS.json باشد، چون ناظر جای دیگری برای دیدن ندارد. */
  const h = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۷.۵ و در _STATUS.json نوشته می‌شود', h.indexOf('triggerNames:') !== -1);
  ok('۷.۶ و به ایرادهای سلامت هم می‌رود',
     h.indexOf('زمان‌بندیِ تکراری هست') !== -1);

  /* یک فهرست، دو خواننده: «چه چیزی باید نصب باشد» فقط یک جا نوشته شده. */
  const su = fs.readFileSync('src/05_Setup.gs', 'utf8');
  ok('۷.۷ فهرستِ «باید نصب باشد» یک منبع دارد',
     (su.match(/function wantedTriggers_/g) || []).length === 1 &&
     (su.match(/wantedTriggers_\(\)/g) || []).length >= 2);
  global.__TRIGGERS.length = 0;
}

console.log('\n✅ ' + pass + ' سنجهٔ منو و بازسازی، همه سبز.');
