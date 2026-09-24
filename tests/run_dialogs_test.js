/* پنجره‌ها — **فشار دادنِ دکمه**، نه خواندنِ کد.
 *
 * ══ چرا این مجموعه هست ══
 * ۲۲ سپتامبر صاحبِ برنامه گفت: «هرچی رو دکمهٔ جست‌وجوی ساده می‌زنم هیچ
 * اثری نداره.» درست بود — و تختهٔ انتخابِ گوینده هم از روزِ ساختش همین‌طور
 * بود، بی آنکه کسی بفهمد.
 *
 * نگهبانِ موجود می‌پرسید «تابعی که `google.script.run` صدا می‌زند وجود
 * دارد؟» و جوابش برای هر دو **بله** بود. سؤال درست بود و یک لایه بالاتر
 * از خرابی: تابعِ سرور بود، ولی کدی که باید صدایش می‌زد اصلاً پارس
 * نمی‌شد.
 *
 * و خودِ صاحبِ برنامه سرِ ساختِ همین‌ها گفته بود:
 *   «بازبین‌ها کد رو فقط نبینن و اجرا باید بکنن.»
 * این همان است. هر پنجره رندر می‌شود، اسکریپتش **اجرا** می‌شود، و هر
 * `onclick` **واقعاً فشار داده می‌شود**.
 */
require('./lib/root.js');
const fs = require('fs');
const { makeCtx, scripts, onclicks, vm } = require('./lib/dialogdom.js');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter((f) => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const hush = (f) => { const o = console.log; console.log = () => {};
  try { return f(); } finally { console.log = o; } };

/* فهرستِ پنجره‌ها از `showModalDialog` درمی‌آید، نه از دست — فهرستِ دستی
   همان چیزی است که ۵٫۹۵ و ۷٫۲۳ بهایش را دادند. */
const BUILDERS = (function () {
  const out = {};
  const re = /createHtmlOutput\(\s*([A-Za-z_][\w]*)\s*\(/g;
  let m;
  while ((m = re.exec(src))) out[m[1]] = true;
  const re2 = /showModalDialog\(/g;
  // و هر تابعی که نامش به Html_ ختم می‌شود و در همان فایل صدا زده شده
  const re3 = /\b([A-Za-z_][\w]*Html_?)\s*\(\s*\)/g;
  while ((m = re3.exec(src))) if (/Html_?$/.test(m[1])) out[m[1]] = true;
  return Object.keys(out).filter((n) => typeof global[n] === 'function');
})();

console.log('\n══ ۱) پنجره‌ها پیدا می‌شوند، از روی خودِ کد ══');
ok('۱.۱ دستِ‌کم سه پنجره', BUILDERS.length >= 3, BUILDERS.join(', '));

/* مقدارهای ورودیِ هر پنجره. بی این، دکمه‌ای که روی ورودیِ خالی برمی‌گردد
   «بی‌خطا» به‌نظر می‌رسد و هیچ‌چیز صدا زده نمی‌شود — سبزِ دروغ. */
const SEED = {
  srchHtml_: { values: { q: 'هزینه' }, checked: { src: true } }
};

console.log('\n══ ۲) اسکریپتِ هر پنجره **اجرا** می‌شود ══');
const ran = {};
for (const name of BUILDERS) {
  let html = '';
  try { html = hush(() => String(global[name]())); }
  catch (e) { ok('۲.x ' + name + ' رندر شد', false, e.message); }
  const blocks = scripts(html);
  if (!blocks.length) continue;                 // پنجرهٔ بی‌اسکریپت، ایراد نیست
  const seed = Object.assign({ html: html }, SEED[name] || {});
  const h = makeCtx(seed);
  let err = '';
  for (const b of blocks) {
    try { vm.runInContext(b, h.ctx, { timeout: 5000 }); }
    catch (e) { err = e.message; break; }
  }
  ok('۲ «' + name + '» اسکریپتش بی‌خطا اجرا شد', !err, err);
  ran[name] = { html, h };
}

console.log('\n══ ۳) و هر دکمه واقعاً فشار داده می‌شود ══');
/* ══ نکتهٔ اصلی ══
   اینجاست که باگِ ۲۲ سپتامبر می‌افتاد: `go` تعریف نشده بود، پس فشار دادن
   یک `ReferenceError` می‌داد — که در مرورگر بی‌صدا بود و اینجا نیست. */
let totalClicks = 0, totalCalls = 0;
for (const name of Object.keys(ran)) {
  const { html, h } = ran[name];
  const clicks = onclicks(html);
  if (!clicks.length) continue;
  const bad = [];
  /* `this` در `onclick` خودِ دکمه است. بی آن، هر دستگیره‌ای که
     `calSave(this)` صدا می‌زند روی `undefined` می‌افتد و شکستش مالِ این
     ابزار است نه مالِ موتور. */
  const btns = h.dom.all.filter((n) => n.getAttribute('onclick'));
  for (let ci = 0; ci < clicks.length; ci++) {
    const expr = clicks[ci];
    const before = h.calls.length;
    h.ctx.__btn = btns[ci] || null;
    try { vm.runInContext('(function(){' + expr + '}).call(__btn);', h.ctx, { timeout: 5000 }); }
    catch (e) { bad.push(expr.slice(0, 40) + ' → ' + e.message); }
    totalClicks++;
    totalCalls += h.calls.length - before;
  }
  ok('۳ «' + name + '»: ' + clicks.length + ' دکمه بی‌خطا فشار داده شد',
     bad.length === 0, bad.slice(0, 3).join(' | '));
}
ok('۳.۹ و روی‌هم دکمه‌ها فشار داده شدند', totalClicks >= 3,
   'گرفت: ' + totalClicks);

console.log('\n══ ۴) دکمه‌ای که هیچ تابعِ سروری صدا نمی‌زند، نام برده می‌شود ══');
/* هر دکمه لازم نیست سرور را صدا بزند (بستن، لغو، باز/بستهٔ نمایشی).
   ولی پنجره‌ای که **هیچ** دکمه‌اش به سرور نرسد، یعنی هیچ کاری نمی‌کند —
   و این دقیقاً حالتی است که دو روز کسی نفهمید. */
{
  const dead = [];
  for (const name of Object.keys(ran)) {
    const { html, h } = ran[name];
    if (!onclicks(html).length) continue;
    if (!h.calls.length) dead.push(name);
  }
  ok('۴.۱ هیچ پنجره‌ای بی‌کار نیست', dead.length === 0,
     dead.length ? 'هیچ دکمه‌ای به سرور نرسید: ' + dead.join(', ')
                 : totalCalls + ' فراخوانیِ سرور از ' + totalClicks + ' فشار');
}

console.log('\n══ ۵) جست‌وجو: همان چیزی که او فشار می‌دهد ══');
/* سنجهٔ اختصاصی، چون این همان دکمه‌ای است که شکایت از آن شد. */
{
  const { html, h } = ran['srchHtml_'] || {};
  ok('۵.۰ پنجرهٔ جست‌وجو اجرا شد', !!h);
  const simple = onclicks(html).filter((e) => /ساده/.test(e))[0];
  ok('۵.۱ دکمهٔ «جست‌وجوی ساده» پیدا شد', !!simple, String(simple));
  const before = h.calls.length;
  vm.runInContext('(function(){' + simple + '}).call(null);', h.ctx, { timeout: 5000 });
  const made = h.calls.slice(before);
  ok('۵.۲ فشارش `srchRun` را صدا می‌زند',
     made.length === 1 && made[0].fn === 'srchRun',
     'گرفت: ' + JSON.stringify(made.map((c) => c.fn)));
  ok('۵.۳ و متنِ کاربر و حالت را با خودش می‌برد',
     made[0].args[0] === 'هزینه' && made[0].args[1] === 'ساده',
     'گرفت: ' + JSON.stringify(made[0].args));
  ok('۵.۴ و «در حالِ گشتن» را نشان می‌دهد',
     /گشتن/.test(h.get('out').innerHTML),
     'بی این، کاربر نمی‌داند فشارش کارگر شد یا نه');
  /* ══ ۵.۵ مخرج، با همان عددهای ۲۳ سپتامبر (۷٫۵۱) ══
     آن روز پنجره نوشت «۳ تب گشته شد» و صاحبِ برنامه آن را «همه‌اش را گشت»
     خواند — درست هم خواند، چون مخرجی نبود. پس این سنجه خودِ `show` را
     **اجرا** می‌کند و به متنِ واقعیِ پنجره نگاه می‌کند، نه به کدی که آن را
     می‌سازد: همان تفاوتی که ۷٫۴۳ گران تمام شد. */
  vm.runInContext('show({mode:"ساده",sheets:3,sheetsAll:40,read:658,scanned:658,' +
                  'ms:226000,items:[],notes:[],terms:[]});', h.ctx, { timeout: 5000 });
  const shown = h.get('out').innerHTML;
  ok('۵.۵ نتیجه مخرجِ پوشش را نشان می‌دهد و نه فقط صورت',
     /3\s*تب\s*از\s*40/.test(shown),
     'گرفت: ' + shown.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120));
}

console.log('\n══ ۶) تختهٔ گویندگان: همان دکمه‌ای که فردا لازم است ══');
{
  const { html, h } = ran['personaBoardHtml_'] || {};
  ok('۶.۰ تخته اجرا شد', !!h);
  ok('۶.۱ و داده‌اش را از سرور می‌خواهد',
     h.calls.some((c) => c.fn === 'personaBoardData'),
     'گرفت: ' + JSON.stringify(h.calls.map((c) => c.fn)));

  /* ══ ۶.۲ و جوابِ سرور را **می‌گیرد و می‌کشد** (۷٫۶۱) ══
     تا امروز همین‌جا تمام می‌شد: «صدا زده شد؟ بله». و صفحه در تولید سه
     نسخه روی «در حالِ خواندن…» ماند، چون `draw` یک `ReferenceError`
     می‌داد (`D` به‌جای `d`) و هیچ‌جا دیده نمی‌شد. پرسشِ درست یک لایه
     پایین‌تر است: **وقتی داده رسید، صفحه واقعاً پر می‌شود؟**

     و ردیف باید **وجود داشته باشد**: با `rows: []` کلِ حلقهٔ کارت‌ها —
     جایی که این خطا بود — هرگز اجرا نمی‌شود. یک هابِ خالی این پنجره را
     همیشه سبز نشان می‌داد. */
  const t = personaTab_(getHub_());
  const row = new Array(PERSONA_HEADERS.length).fill('');
  row[PC.KEY - 1] = 'probe'; row[PC.NAME - 1] = 'گویندهٔ آزمون';
  row[PC.ON - 1] = 'خیر'; row[PC.SHOWS - 1] = 'همه'; row[PC.EVERY - 1] = 1;
  row[PC.STYLE - 1] = 'آرام بخوان';
  t.getRange(t.getLastRow() + 1, 1, 1, PERSONA_HEADERS.length).setValues([row]);
  const data = JSON.parse(JSON.stringify(hush(() => personaBoardData_())));
  ok('۶.۲-آ دادهٔ سرور دستِ‌کم یک ردیف دارد',
     (data.rows || []).length >= 1,
     'وگرنه حلقهٔ کارت‌ها اجرا نمی‌شود و این سنجه چیزی را نمی‌سنجد');

  let drew = '', boom = '';
  try { h.reply('personaBoardData', data); drew = String(h.get('box').innerHTML || ''); }
  catch (e) { boom = e.constructor.name + ': ' + e.message; }
  ok('۶.۲ جوابِ سرور که رسید، صفحه بی‌خطا کشیده می‌شود', !boom, boom);
  ok('۶.۲-ب و جعبه واقعاً پر می‌شود (نه اینکه روی «در حالِ خواندن» بماند)',
     drew.length > 200 && drew.indexOf('در حالِ خواندن') === -1,
     'طول: ' + drew.length);
  ok('۶.۳ و بعدش فهرستِ قسمت‌ها را جدا می‌خواهد',
     h.calls.some((c) => c.fn === 'personaEpisodeLists'),
     'بارِ اول نباید منتظرِ فهرست بماند — ۷٫۶۰');
}

console.log('\n══ ۷) دفترِ بدهی — کدام گزینهٔ منو هرگز آزموده نشده ══');
/* ══ چرا این فهرست اینجاست، و چرا فهرست است نه عدد ══
   ۲۲ سپتامبر صاحبِ برنامه پرسید: «الان خیلی چیزای دیگه که درست کردی رو
   امتحان نکردم و اونا رو چی؟»
   جوابِ صادق این بود که نمی‌دانستیم — هیچ‌جا نوشته نبود کدام قابلیت
   آزموده شده و کدام نه.

   این فهرست **معافیت نیست، بدهی است.** هر نامی که اینجاست یعنی گزینه‌ای
   در منو که هیچ مجموعه‌ای حتی نامش را نبرده. قاعده یک‌طرفه است:
     • نامی از اینجا حذف شود = خوب (آزمونی برایش نوشته شده).
     • گزینهٔ تازه‌ای در منو که آزمونی ندارد ⇒ این سنجه **می‌افتد**، و
       نویسنده‌اش باید یا آزمون بنویسد یا عمداً اینجا بنویسدش.
   همان وارونه‌سازیِ ۷٫۲۹: فهرستِ «چه چیزی مجاز است» را آدم می‌نویسد و
   توجیه می‌کند، نه اینکه کد بی‌صدا از کنارش رد شود. */
const MENU_DEBT = [
  'checkSources', 'fullRebuild', 'refreshModels',
  'runAuditSourceScripts', 'runBackupNow', 'runBlockVoice',
  'runContentAudit', 'runContentSearch', 'runEmbedBuild',
  'runEmbedRebuild', 'runEmbedSelfTest', 'runIngestReports',
  'runInstallSourceUpdates', 'runJudgeSeries', 'runLocalJudgeAll',
  'runMusicAuto', 'runMusicRecheck', 'runMusicScan',
  'runOrganizeFolders', 'runProduceSpecialEnriched', 'runProduceVarietyEnriched',
  'runRecapNow', 'runRejudgeAll', 'runSelfUpdateDiagnose',
  'runShowSourceVerdict', 'runSyncNow', 'runVoiceAudition',
  'runVoiceBridge', 'runVoiceIntake', 'runYouTubeStats',
  'setApiKey', 'showEnrichStatus', 'showPersonaBoard',
  'showStatus', 'testGemini', 'testTelegram',
];
{
  const menu = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const fns = [];
  const re = /addItem\('[^']*',\s*'([A-Za-z_][A-Za-z0-9_]*)'\)/g;
  let m;
  while ((m = re.exec(menu))) if (fns.indexOf(m[1]) === -1) fns.push(m[1]);
  ok('۷.۱ گزینه‌های منو از خودِ کد خوانده شدند', fns.length >= 40,
     fns.length + ' گزینه');

  /* ══ و خودِ دفترِ بدهی از شمارش بیرون است ══
     اولین نسخه‌اش این را نداشت و عدد **صفر** درآمد: نام‌ها در همین فایل
     نوشته شده‌اند، پس هر کدام «در یک مجموعه دیده شد» به حساب می‌آمدند و
     بدهی خودش را پرداخت‌شده نشان می‌داد.
     سنجه‌ای که با نوشتنِ خودش سبز شود چیزی نمی‌سنجد — همان درسی که این
     هفته سه بار تکرار شد. پس بلوکِ MENU_DEBT از متن حذف می‌شود. */
  const suites = fs.readdirSync('tests').filter((f) => /^run_.*\.js$/.test(f))
    .map((f) => fs.readFileSync('tests/' + f, 'utf8'))
    .join('\n')
    .replace(/const MENU_DEBT = \[[\s\S]*?\n\];/, '');
  const untested = fns.filter((f) =>
    !new RegExp('\\b' + f + '\\b').test(suites));

  const surprise = untested.filter((f) => MENU_DEBT.indexOf(f) === -1);
  ok('۷.۲ گزینهٔ تازه بی‌آزمون اضافه نشده', surprise.length === 0,
     surprise.length ? 'بی‌آزمون و ثبت‌نشده: ' + surprise.join(', ')
                     : untested.length + ' بدهیِ ثبت‌شده از ' + fns.length + ' گزینه');

  const paid = MENU_DEBT.filter((f) => untested.indexOf(f) === -1);
  if (paid.length) {
    console.log('  ℹ️ ' + paid.length + ' بدهی پرداخت شده — از MENU_DEBT حذفشان کنید: '
                + paid.join(', '));
  }
  /* و همین عدد باید جایی باشد که آدم ببیندش، نه فقط در لاگِ تست. */
  ok('۷.۳ عدد گفته می‌شود، نه پنهان',
     untested.length <= MENU_DEBT.length,
     'آزموده‌نشده: ' + untested.length + ' از ' + fns.length +
     ' — هر کدام یعنی قابلیتی که تا کسی دستی امتحانش نکند، خرابی‌اش دیده نمی‌شود');
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
