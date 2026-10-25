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
  /* ۹.۵۵: ساده تب به تب — نقشه، گام‌ها، یافته‌ها همان لحظه، نوارِ دقیق، و ادامه از همان‌جا. */
  const mem = {};
  h.ctx.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const before = h.calls.length;
  vm.runInContext('(function(){' + simple + '}).call(null);', h.ctx, { timeout: 5000 });
  const made = h.calls.slice(before);
  ok('۵.۲ فشارش نقشهٔ تب‌ها را می‌خواهد (`srchLexStart`)، نه یک فراخوانِ ۲۳۰ ثانیه‌ای',
     made.length === 1 && made[0].fn === 'srchLexStart',
     'گرفت: ' + JSON.stringify(made.map((c) => c.fn)));
  ok('۵.۳ و متنِ کاربر و تیکِ منبع را با خودش می‌برد',
     made[0].args[0] === 'هزینه' && made[0].args[1] === true,
     'گرفت: ' + JSON.stringify(made[0].args));
  ok('۵.۴ و «در حالِ خواندنِ فهرستِ تب‌ها» را نشان می‌دهد', /تب‌ها/.test(h.get('semh').innerHTML));
  const PL = [{ id: 'H', name: 'تبِ یک', src: '' }, { id: 'H', name: 'تبِ دو', src: '' }];
  h.reply('srchLexStart', { ok: true, terms: ['هزینه'], plan: PL, notes: [] });
  const g1 = h.calls.filter((c) => c.fn === 'srchLexStep').pop();
  ok('۵.۴-ب گامِ اول: تبِ صفر، با همان واژه‌ها و نقشه', !!g1 && g1.args[3] === 0 && JSON.stringify(g1.args[1]) === '["هزینه"]');
  const it1 = (t, row, sc) => ({ where: 'بانک', tab: 'تبِ یک', row: row, title: t, score: sc });
  h.reply('srchLexStep', { ok: true, items: [it1('یافتهٔ کم', 4, 2)], rest: [9, 10], next: 0, all: 2, read: 1, notes: [] });
  ok('۵.۴-پ یافته همان لحظه، و ردیف‌های ماندهٔ همان تب در گامِ بعد (نه تبِ بعد)', /یافتهٔ کم/.test(h.get('lex').innerHTML) &&
     h.calls.filter((c) => c.fn === 'srchLexStep').pop().args[3] === 0 &&
     JSON.stringify(h.calls.filter((c) => c.fn === 'srchLexStep').pop().args[4]) === '[9,10]' && /2 ردیفِ باقی/.test(h.get('semh').innerHTML));
  h.reply('srchLexStep', { ok: true, items: [it1('یافتهٔ پرامتیاز', 9, 8)], rest: [], next: 1, all: 2, read: 2, notes: [] });
  const lx = h.get('lex').innerHTML;
  ok('۵.۴-ت نوار: ۱ از ۲ (۵۰٪)؛ فهرست به ترتیبِ امتیاز', /1 از 2/.test(h.get('semh').innerHTML) && /width:50%/.test(h.get('semh').innerHTML) &&
     lx.indexOf('یافتهٔ پرامتیاز') < lx.indexOf('یافتهٔ کم'));
  ok('۵.۴-ث پیشرفت در مرورگر ماند: از تبِ ۱', !!mem.srchLex && JSON.parse(mem.srchLex).from === 1 && JSON.parse(mem.srchLex).items.length === 2);
  /* قطع ⇒ همان پرسش دوباره ⇒ از تبِ ۱، با یافته‌های قبلی، بی نقشهٔ تازه. */
  const nStart = h.calls.filter((c) => c.fn === 'srchLexStart').length;
  vm.runInContext('(function(){' + simple + '}).call(null);', h.ctx, { timeout: 5000 });
  const g3 = h.calls.filter((c) => c.fn === 'srchLexStep').pop();
  ok('۵.۴-ج قطع شد و دوباره زد ⇒ از همان تب ادامه، یافته‌های قبلی سرِ جا', h.calls.filter((c) => c.fn === 'srchLexStart').length === nStart &&
     g3.args[3] === 1 && /یافتهٔ پرامتیاز/.test(h.get('lex').innerHTML) && /ادامه/.test(h.get('semh').innerHTML));
  h.reply('srchLexStep', { ok: true, items: [], rest: [], next: 2, all: 2, read: 0, notes: [] });
  ok('۵.۴-چ پایان: ۲ از ۲، ۱۰۰٪، «کامل»، و حافظهٔ ادامه پاک', /2 از 2/.test(h.get('semh').innerHTML) && /width:100%/.test(h.get('semh').innerHTML) &&
     /کامل/.test(h.get('semh').innerHTML) && !mem.srchLex);
  /* ══ ۵.۵ مخرج، با همان عددهای ۲۳ سپتامبر (۷٫۵۱) ══
     آن روز پنجره نوشت «۳ تب گشته شد» و صاحبِ برنامه آن را «همه‌اش را گشت»
     خواند — درست هم خواند، چون مخرجی نبود. پس این سنجه خودِ `show` را
     **اجرا** می‌کند و به متنِ واقعیِ پنجره نگاه می‌کند، نه به کدی که آن را
     می‌سازد: همان تفاوتی که ۷٫۴۳ گران تمام شد. */
  vm.runInContext('show({mode:"ساده",sheets:3,sheetsAll:40,read:658,scanned:658,' +
                  'ms:226000,items:[],notes:[],terms:[]});', h.ctx, { timeout: 5000 });
  const shown = h.get('lex').innerHTML;
  ok('۵.۵ نتیجه مخرجِ پوشش را نشان می‌دهد و نه فقط صورت',
     /3\s*تب\s*از\s*40/.test(shown),
     'گرفت: ' + shown.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120));
}

console.log('\n══ ۵-ب) هوشمند: معنا گام‌به‌گام، یافته‌ها همان لحظه، نوارِ دقیق (۹.۴۶) ══');
/* «۹۰ ثانیه کمه … نتیجه‌ها یکی یکی وقتی پیدا میشن نمایش داده بشن … یه نوار پر شونده دقیق.» */
{
  const { html } = ran['srchHtml_'] || {};
  const h = makeCtx(Object.assign({ html: html }, SEED.srchHtml_));
  for (const b of scripts(html)) vm.runInContext(b, h.ctx, { timeout: 5000 });
  const smart = onclicks(html).filter((e) => /هوشمند/.test(e))[0];
  vm.runInContext('(function(){' + smart + '}).call(null);', h.ctx, { timeout: 5000 });
  const fns = h.calls.map((c) => c.fn);
  ok('۵-ب.۱ هوشمند دو رشته راه می‌اندازد: واژه‌ها (بی معنا درونش) و آغازِ معنا',
     fns.indexOf('srchRun') !== -1 && fns.indexOf('srchSemStart') !== -1 &&
     h.calls.filter((c) => c.fn === 'srchRun')[0].args[3] === false, JSON.stringify(h.calls.map((c) => [c.fn, c.args.length])));
  const it = (t, row, sem) => ({ where: 'بانک', tab: 'تبِ آزمون', row: row, title: t, sem: sem, score: 0, fit: 'یافتهٔ معنایی' });
  h.reply('srchSemStart', { ok: true, vp: 'VP', order: [5, 2, 9, 0], all: 4 });
  const s1 = h.calls.filter((c) => c.fn === 'srchSemStep').pop();
  ok('۵-ب.۲ گامِ اول از کشوی صفر، با همان بردار و ترتیب', !!s1 && s1.args[0] === 'VP' &&
     JSON.stringify(s1.args[1]) === '[5,2,9,0]' && s1.args[2] === 0);
  h.reply('srchSemStep', { ok: true, items: [it('یافتهٔ نخست', 7, 0.71)], next: 1, all: 4, done: false, best: 0.71 });
  ok('۵-ب.۳ یافتهٔ گامِ اول **همان لحظه** دیده می‌شود، پیش از پایان', /یافتهٔ نخست/.test(h.get('sem').innerHTML));
  ok('۵-ب.۴ نوار عددِ دقیق دارد: ۱ از ۴ (۲۵٪)', /1 از 4/.test(h.get('semh').innerHTML) && /width:25%/.test(h.get('semh').innerHTML),
     h.get('semh').innerHTML.replace(/<[^>]*>/g, ' ').slice(0, 120));
  const s2 = h.calls.filter((c) => c.fn === 'srchSemStep').pop();
  ok('۵-ب.۵ گامِ دوم از همان‌جا ادامه می‌دهد و کفِ امتیاز را با خودش می‌برد',
     s2 !== s1 && s2.args[2] === 1 && Math.abs(s2.args[3] - (0.71 - 0.25)) < 1e-9, JSON.stringify(s2.args.slice(2)));
  h.reply('srchSemStep', { ok: true, items: [it('یافتهٔ دوم', 3, 0.9), it('یافتهٔ نخست', 7, 0.71)], next: 3, all: 4, done: false, best: 0.9 });
  const semH = h.get('sem').innerHTML;
  ok('۵-ب.۶ یافتهٔ تازه بالاتر می‌نشیند (به ترتیبِ معنا) و تکراری دوباره نمی‌آید',
     semH.indexOf('یافتهٔ دوم') !== -1 && semH.indexOf('یافتهٔ دوم') < semH.indexOf('یافتهٔ نخست') &&
     semH.split('یافتهٔ نخست').length === 2);
  /* واژه‌ها برمی‌گردند و یکی از همان ردیف‌ها را دارند ⇒ در فهرستِ معنا دوباره نشان داده نمی‌شود. */
  h.reply('srchRun', { ok: true, mode: 'هوشمند', sheets: 3, sheetsAll: 3, read: 10, scanned: 10, ms: 1000,
                       items: [{ where: 'بانک', tab: 'تبِ آزمون', row: 3, title: 'یافتهٔ دوم', score: 9 }], notes: [], terms: [] });
  ok('۵-ب.۷ آنچه واژه‌ها هم آوردند از فهرستِ معنا کنار می‌رود (یک بار دیده می‌شود)',
     /یافتهٔ دوم/.test(h.get('lex').innerHTML) && !/یافتهٔ دوم/.test(h.get('sem').innerHTML) && /یافتهٔ نخست/.test(h.get('sem').innerHTML));
  h.reply('srchSemStep', { ok: true, items: [], next: 4, all: 4, done: true, best: 0 });
  ok('۵-ب.۸ پایان: ۴ از ۴، ۱۰۰٪، و «کامل» گفته می‌شود', /4 از 4/.test(h.get('semh').innerHTML) &&
     /width:100%/.test(h.get('semh').innerHTML) && /کامل/.test(h.get('semh').innerHTML));
  const nAfter = h.calls.filter((c) => c.fn === 'srchSemStep').length;
  ok('۵-ب.۹ و پس از پایان گامِ دیگری خواسته نمی‌شود', nAfter === 3, String(nAfter));
  /* گامی که جلو نرفت ⇒ می‌ایستد و می‌گوید، نه حلقهٔ بی‌انتها. */
  vm.runInContext('(function(){' + smart + '}).call(null);', h.ctx, { timeout: 5000 });
  h.reply('srchSemStart', { ok: true, vp: 'VP', order: [1, 2], all: 2 });
  h.reply('srchSemStep', { ok: false, items: [], next: 0, all: 2, done: false, note: 'خطای آزمون' });
  ok('۵-ب.۱۰ گامی که جلو نرفت: ایستادن با علت، نه تکرارِ بی‌انتها',
     /ایستاد/.test(h.get('semh').innerHTML) && /خطای آزمون/.test(h.get('semh').innerHTML) &&
     h.calls.filter((c) => c.fn === 'srchSemStep').length === 4);
}

console.log('\n══ ۵-پ) جمع‌بندیِ حینِ جست‌وجو، نمایشِ همه، خروجی، و حافظه (۹.۴۸) ══');
{
  const { html } = ran['srchHtml_'] || {};
  const h = makeCtx(Object.assign({ html: html }, SEED.srchHtml_));
  for (const b of scripts(html)) vm.runInContext(b, h.ctx, { timeout: 5000 });
  const smart = onclicks(html).filter((e) => /هوشمند/.test(e))[0];
  vm.runInContext('(function(){' + smart + '}).call(null);', h.ctx, { timeout: 5000 });
  /* حافظه: رشتهٔ واژه‌ها با شیت‌های منبع می‌میرد ⇒ یک بارِ دیگر بی آن‌ها، و گفته می‌شود. */
  const r0 = h.calls.filter((c) => c.fn === 'srchRun')[0];
  r0.failure({ message: 'Out of memory error.' });
  const runs = h.calls.filter((c) => c.fn === 'srchRun');
  ok('۵-پ.۱ «Out of memory» ⇒ همان جست‌وجو بی شیت‌های منبع، یک بار', runs.length === 2 && runs[0].args[2] === true && runs[1].args[2] === false);
  h.reply('srchSemStart', { ok: true, vp: 'VP', order: [0, 1], all: 2 });
  const it = (t, row, sem) => ({ where: 'بانک', tab: 'تب', row: row, title: t, sem: sem, score: 0, fit: 'یافتهٔ معنایی', fields: { summary: 'خلاصهٔ ' + t } });
  const many = []; for (let i = 0; i < 200; i++) many.push(it('یافته-' + i, 100 + i, 0.9 - i / 1000));
  h.reply('srchSemStep', { ok: true, items: many, next: 1, all: 2, done: false, best: 0.9 });
  ok('۵-پ.۲ همهٔ ۲۰۰ یافته نشان داده می‌شوند، نه ۱۵۰', (h.get('sem').innerHTML.match(/id="r\d+"/g) || []).length === 200,
     String((h.get('sem').innerHTML.match(/id="r\d+"/g) || []).length));
  ok('۵-پ.۳ هر یافته شمارهٔ ثابت دارد (#۱ …)', /#1 · یافته-0/.test(h.get('sem').innerHTML) && /id=\\?"r1\\?"|id="r1"/.test(h.get('sem').innerHTML));
  const d1 = h.calls.filter((c) => c.fn === 'srchDigestStep');
  ok('۵-پ.۴ استخراجِ جمع‌بندی **حینِ** جست‌وجو شروع شد، یک دسته در پرواز', d1.length === 1 && d1[0].args[1].length === 40 &&
     d1[0].args[1][0].n === '1' && /خلاصهٔ یافته-0/.test(d1[0].args[1][0].t), JSON.stringify(d1.map((c) => c.args[1].length)));
  ok('۵-پ.۵ دکمهٔ خروجی همان‌جا هست، با شمارِ یافته‌ها', /exportNow\(\)/.test(h.get('exp').innerHTML) && /200 یافته/.test(h.get('exp').innerHTML));
  /* دسته‌ها یکی‌یکی؛ هر جواب دستهٔ بعد را می‌فرستد، تا ته. */
  let guard = 0;
  while (guard++ < 20) {
    const last = h.calls.filter((c) => c.fn === 'srchDigestStep').pop();
    if (last.__done) break;
    last.__done = true;
    const ns = last.args[1].map((x) => x.n);
    last.success({ ok: true, found: ns[0] === '1' ? [{ name: 'شاوشنگ', note: 'در دو فهرست', refs: ['1', '2'] }] : [] });
  }
  const steps = h.calls.filter((c) => c.fn === 'srchDigestStep');
  ok('۵-پ.۶ همهٔ ۲۰۰ یافته خوانده شدند (۵ دستهٔ ۴۰تایی)، هیچ‌کدام جا نماند',
     steps.length === 5 && steps.reduce((a, c) => a + c.args[1].length, 0) === 200, String(steps.length));
  ok('۵-پ.۷ پیش از پایانِ هر دو رشته، ترتیبِ پایانی خواسته نمی‌شود', !h.calls.some((c) => c.fn === 'srchDigestFinal'));
  h.reply('srchSemStep', { ok: true, items: [], next: 2, all: 2, done: true, best: 0 });
  ok('۵-پ.۸ معنا تمام، ولی واژه‌ها هنوز نه ⇒ هنوز نه', !h.calls.some((c) => c.fn === 'srchDigestFinal'));
  h.reply('srchRun', { ok: true, mode: 'هوشمند', sheets: 3, sheetsAll: 3, read: 1, scanned: 1, ms: 1, items: [], notes: [], terms: [] });
  ok('۵-پ.۹ و حافظه‌ای که کم آمد گفته شد', /حافظه/.test(h.get('lex').innerHTML));
  const fin = h.calls.filter((c) => c.fn === 'srchDigestFinal');
  ok('۵-پ.۱۰ هر دو تمام ⇒ ترتیبِ پایانی با همهٔ اقلام', fin.length === 1 && fin[0].args[1].length === 1 &&
     fin[0].args[1][0].refs.join() === '1,2', JSON.stringify(fin.map((c) => c.args[1])));
  h.reply('srchDigestFinal', { ok: true, answer: 'شاوشنگ بیشتر آمد', rows: [{ name: 'شاوشنگ', why: 'دو فهرست', refs: ['1', '2'] }] });
  const dg = h.get('dig').innerHTML;
  ok('۵-پ.۱۱ جعبهٔ جمع‌بندی: نام، چرا، و پیوند به همان یافته‌ها', /شاوشنگ/.test(dg) && /href=#r1/.test(dg) && /href=#r2/.test(dg) && /200 یافته/.test(dg), dg.slice(0, 160));
  vm.runInContext('exportNow()', h.ctx, { timeout: 5000 });
  const ex = h.calls.filter((c) => c.fn === 'srchExport').pop();
  ok('۵-پ.۱۲ خروجی همهٔ یافته‌ها و جمع‌بندی را می‌برد', ex && ex.args[1].length === 200 && ex.args[1][0].n === 1 &&
     ex.args[2].rows[0].name === 'شاوشنگ');
  ex.success({ ok: true, n: 200, sheetUrl: 'https://docs.google.com/x', xlsxUrl: 'https://docs.google.com/x/export?format=xlsx', htmlUrl: 'https://drive.google.com/h' });
  ok('۵-پ.۱۳ و پیوندهای شیت، اکسل و HTML نشان داده می‌شوند', /format=xlsx/.test(h.get('exp').innerHTML) && /HTML/.test(h.get('exp').innerHTML));
}

console.log('\n══ ۵-ت) داوری: یافتهٔ نامربوط از فهرست و خروجی کنار می‌رود (۹.۴۹) ══');
{
  const { html } = ran['srchHtml_'] || {};
  const h = makeCtx(Object.assign({ html: html }, SEED.srchHtml_));
  for (const b of scripts(html)) vm.runInContext(b, h.ctx, { timeout: 5000 });
  const smart = onclicks(html).filter((e) => /هوشمند/.test(e))[0];
  vm.runInContext('(function(){' + smart + '}).call(null);', h.ctx, { timeout: 5000 });
  h.reply('srchSemStart', { ok: true, vp: 'VP', order: [0], all: 1 });
  const it = (t, row) => ({ where: 'بانک', tab: 'تب', row: row, title: t, sem: 0.8, score: 0, fit: 'یافتهٔ معنایی', fields: {} });
  h.reply('srchSemStep', { ok: true, items: [it('سریالِ بریکینگ بد', 1), it('تلاوتِ قرآن', 2), it('معامله‌گری', 3)], next: 1, all: 1, done: true });
  h.reply('srchRun', { ok: true, mode: 'هوشمند', sheets: 1, sheetsAll: 1, read: 1, scanned: 1, ms: 1,
                       items: [{ where: 'بانک', tab: 'ت۲', row: 9, title: 'انرژیِ همنشین', score: 15 }], notes: [], terms: [] });
  for (let g = 0; g < 5; g++) {
    const d = h.calls.filter((c) => c.fn === 'srchDigestStep').pop();
    if (d.__done) break; d.__done = true;
    d.success({ ok: true, found: [], keep: d.args[1].map((x) => x.n).filter((n) => n === '1') });
  }
  const semH = h.get('sem').innerHTML, lexH = h.get('lex').innerHTML;
  ok('۵-ت.۱ فقط یافتهٔ مربوط می‌ماند؛ دسته‌ای که داور هیچ‌کدام را نگه نداشت، ۵ نزدیک‌ترش نشان داده می‌شود (۱۰.۷)', /بریکینگ بد/.test(semH) && !/تلاوت/.test(semH) && !/معامله‌گری/.test(semH) &&
     /انرژیِ همنشین/.test(lexH), lexH.replace(/<[^>]*>/g, ' ').slice(0, 120));
  ok('۵-ت.۴ و دسته‌ای که هیچ‌کدام را نگه نداشت، با یادداشتِ خودش گفته می‌شود (۱۰.۷)', /دسته را داور هیچ‌کدام/.test(semH));
  ok('۵-ت.۲ و شمارِ کنارگذاشته‌ها گفته می‌شود', /2 یافته را داور با خواستهٔ شما نامربوط دانست/.test(semH));
  vm.runInContext('exportNow()', h.ctx, { timeout: 5000 });
  const ex = h.calls.filter((c) => c.fn === 'srchExport').pop();
  ok('۵-ت.۳ خروجی همان چیزی است که نشان داده می‌شود: مربوط‌ها و ۵ نزدیک‌ترِ دستهٔ بی‌نگه‌داشت (۱۰.۷)', ex.args[1].length === 2 && ex.args[1][0].title === 'سریالِ بریکینگ بد');
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
  'runMusicAuto', 'runMusicScan',   // runMusicRecheck پرداخت شد (۷٫۷۱)
  'runOrganizeFolders', 'runProduceSpecialEnriched', 'runProduceVarietyEnriched',
  'runRecapNow', 'runRejudgeAll', 'runSelfUpdateDiagnose',
  'runShowSourceVerdict', 'runSyncNow', 'runVoiceAudition',
  'runVoiceIntake', 'runYouTubeStats',
  'setApiKey', 'showEnrichStatus', 'showPersonaBoard',
  'showStatus', 'testGemini',   // testTelegram پرداخت شد (۸.۸۶)
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

console.log('\n══ ۸) جعبهٔ سبکِ تصویر روی تخته — کنترلی که جای کارش بنشیند (۸.۱۳) ══');
/* صاحبِ برنامه پرسید «کجای این قسمت تنظیماتی که برای ویدئوی درس‌نامه گفتی
   گذاشتی؟» و جوابِ راست «هیچ‌جا» بود: ستونِ «سبکِ تصویر» از ۷.۹۶ در رجیستری
   هست و `lvStyleAt_` می‌خوانَدش، ولی راهی برای عوض‌کردنش جز ویرایشِ دستیِ
   شیت نبود — و او شیت باز نمی‌کند (۵.۶۱/۷.۳۵).

   و ادعا **از همان دری سنجیده می‌شود که تولید از آن وارد می‌شود** (۷.۳۵):
   از تخته ذخیره می‌کنیم، بعد از `lvStyleAt_` می‌پرسیم چه می‌بیند — نه اینکه
   تخته را دوباره بخوانیم، که فقط ثابت می‌کند تخته با خودش جور است. */
{
  const hub = getHub_();
  /* ردیفِ واقعی ساخته می‌شود، چون این بند دربارهٔ **ذخیره‌شدن در رجیستری**
     است: تختهٔ خالی فقط ثابت می‌کند تخته با خودش جور است (۷.۶۱ — بدَلی که
     خالی‌تر از تولید باشد، چیزی را ثابت نمی‌کند). */
  {
    const sh = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = 'sty-test';
    v[SC.NAME - 1] = 'مجموعهٔ آزمونِ سبک';
    v[SC.TOPIC - 1] = 'معرفت‌شناسی';
    v[SC.STATUS - 1] = SST.ACTIVE;
    sh.appendRow(v);
  }
  const reg = readSeriesReg_(hub);
  const keys = Object.keys(reg.byKey);
  if (!keys.length) {
    ok('۸.۰ رجیستری ردیفی دارد تا بشود سنجید', false, 'هیچ مجموعه‌ای نیست');
  } else {
    const k = 'sty-test';

    /* ۸.۱ — ذخیره از تخته، و خواندن از همان تابعی که کارت‌ها را می‌سازد. */
    const want = LV_STYLES[3].key;            // یک سبکِ غیرِ پیش‌فرض
    const r1 = uiLvStyleSave(k, want);
    /* از همان امضایی که تولید صدا می‌زند: `lvStyleAt_(hub, item, meta, name)`
       — ردیف را مستقیم نمی‌دهیم، چون تولید هم نمی‌دهد (۷.۶۲). */
    const seen = lvStyleAt_(getHub_(), { seriesKey: k }, null, '');
    ok('۸.۱ سبکی که از تخته ثبت شود، همان است که سازندهٔ کارت می‌بیند',
       r1.ok === true && seen === want,
       JSON.stringify({ ok: r1.ok, want: want, seen: seen }));

    /* ۸.۲ — و «خودکار» یک گزینهٔ صریح است، نه خانهٔ خالیِ مبهم: برمی‌گردد به
       انتخابِ خودِ موتور از روی موضوع. */
    const r2 = uiLvStyleSave(k, '');
    const auto = lvStyleAt_(getHub_(), { seriesKey: k }, null, '');
    ok('۸.۲ «خودکار» سبک را به انتخابِ موتور برمی‌گرداند، نه به سبکِ قبلی',
       r2.ok === true && auto !== want && auto !== '',
       JSON.stringify({ ok: r2.ok, auto: auto, wasnt: want }));

    /* ۸.۳ — سبکِ ناشناخته **رد** می‌شود و مجازها را نام می‌برد. خانه‌ای که
       حرفِ کاربر را بی‌صدا عوض کند، او را به این باور می‌رساند که چیزی را
       تنظیم کرده (۷.۸۱). */
    const r3 = uiLvStyleSave(k, 'سبکِ خیالی');
    ok('۸.۳ سبکِ ناشناخته رد می‌شود و مجازها را نام می‌برد',
       r3.ok === false && LV_STYLES.some(x => String(r3.message).indexOf(x.key) !== -1),
       String(r3.message).slice(0, 110));

    /* ۸.۴ — و جعبه واقعاً روی تخته رندر می‌شود و به تابعِ موجود وصل است.
       همان شکلی که ۵.۶۱ از آن می‌ترسد: دکمه‌ای که بی‌صدا هیچ کاری نکند. */
    const html = uiBoardHtml();
    const hasSel = /onchange="lvStyle\(this\)"/.test(html);
    const callsFn = /google\.script\.run[\s\S]{0,120}?\.uiLvStyleSave\(/.test(html);
    ok('۸.۴ جعبه روی تخته هست و به uiLvStyleSave وصل است',
       hasSel && callsFn && typeof uiLvStyleSave === 'function',
       'select=' + hasSel + ' · call=' + callsFn);

    /* ۸.۵ — و هر هشت سبک در فهرست می‌آید، با پیش‌نمایشِ رنگ. انتخابی که
       نتیجه‌اش را نشود دید، انتخاب نیست — و فهرست از `LV_STYLES` می‌آید نه
       دست‌نویس، وگرنه سبکِ نهم که اضافه شود بی‌صدا جا می‌مانَد (۵.۹۵). */
    const missing = LV_STYLES.map(x => x.key)
      .filter(kk => html.indexOf('>' + kk + '</option>') === -1);
    ok('۸.۵ هر سبکِ LV_STYLES در فهرستِ تخته هست',
       missing.length === 0, missing.length ? missing.join('، ') : 'همه');
    ok('۸.۵-ب و پیش‌نمایشِ رنگ از پالتِ واقعی می‌آید',
       html.indexOf('class="sw"') !== -1 &&
       LV_STYLES.some(x => html.indexOf(x.pal.ac) !== -1),
       'swatch=' + (html.indexOf('class="sw"') !== -1));
  }
}

console.log('\n══ ۹) بدهیِ منو: عددی که دیده شود (۸.۱۳) ══');
/* «ناظر به تمام موارد منو نظارت می‌کنه؟» — عدد بود (۳۴ از ۵۸) و **هیچ‌جا
   دیده نمی‌شد**، چون در همین فایلِ آزمون زندگی می‌کرد. بدهی‌ای که دیده نشود
   معافیت است. حالا `tools/build.js` می‌شماردش و در `src/00_Config.gs`
   می‌نویسد، و `healthCheck` هر روز می‌گویدش. */
{
  const menuSrc = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const realTotal = (menuSrc.match(/\.addItem\s*\(/g) || []).length;
  ok('۹.۱ عددِ تولیدشده با شمارشِ واقعیِ منو می‌خواند',
     BUILD_MENU_.total === realTotal,
     'تولیدشده ' + BUILD_MENU_.total + ' · واقعی ' + realTotal +
     ' — اگر نخواند یعنی build گرفته نشده و عدد کهنه است');
  ok('۹.۲ و بدهی با دفترِ بدهیِ همین فایل می‌خواند',
     BUILD_MENU_.debt === MENU_DEBT.length,
     'تولیدشده ' + BUILD_MENU_.debt + ' · دفتر ' + MENU_DEBT.length);
  ok('۹.۳ و بدهی از کلِ گزینه‌ها بیشتر نیست',
     BUILD_MENU_.debt <= BUILD_MENU_.total && BUILD_MENU_.total > 0,
     BUILD_MENU_.debt + '/' + BUILD_MENU_.total);

  /* ۹.۴ — و عدد **هر روز در گزارش می‌آید**. بی این، همان جایی می‌مانَد که
     بود: یک فایلِ آزمون که فقط با گشتنِ عمدی پیدا می‌شود. در یادداشت‌ها، نه
     در مسئله‌ها — کارِ باقی‌مانده خرابی نیست (۷.۴۰). */
  {
    const h = healthCheck();
    const line = (h.notes || []).filter(x => String(x).indexOf('پوششِ سنجهٔ منو') !== -1);
    ok('۹.۴ عدد هر روز در گزارشِ سلامت می‌آید',
       line.length === 1 &&
       line[0].indexOf(faDigitsOut_(String(BUILD_MENU_.total))) !== -1,
       line[0] || 'نیامد');
    ok('۹.۴-ب و در مسئله‌ها نمی‌آید — بدهی خرابی نیست',
       (h.problems || []).every(x => String(x).indexOf('پوششِ سنجهٔ منو') === -1));
  }
}

console.log('\n══ ۱۰) جعبهٔ سطحِ تصویرسازی — درِ دومی که ۸.۱۳ ندیدش (۸.۱۵) ══');
/* او پرسید «آیا تمامِ چیزهایی که برای تنظیماتِ تولیدِ ویدیوِ مجموعه‌ها هست
   رعایت کردی؟» و جوابِ راست باز هم «نه» بود: ستونِ «تصویرسازی» از ۸.۰۱ در
   رجیستری است و خواستهٔ صریحِ خودش بود، و ۸.۱۳ که درِ «سبکِ تصویر» را ساخت
   این یکی را جا گذاشت. یعنی همان عیب، یک ستون آن‌طرف‌تر، در نسخه‌ای که برای
   همین عیب نوشته شده بود.

   و مثلِ §۸، ادعا **از دری سنجیده می‌شود که تولید از آن وارد می‌شود**:
   از تخته ذخیره می‌کنیم، بعد از `lvLevelAt_` می‌پرسیم چه می‌بیند. */
{
  const hub = getHub_();
  {
    const sh = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = 'lvl-test';
    v[SC.NAME - 1] = 'مجموعهٔ آزمونِ سطح';
    v[SC.STATUS - 1] = SST.ACTIVE;
    sh.appendRow(v);
  }
  const k = 'lvl-test';

  /* خانهٔ خالی = پیش‌فرض، نه «نگفته»: اگر این دو یکی گرفته شوند، روزی
     «پیش‌فرض» به «خاموش» تفسیر می‌شود و ویدئو بی‌صدا تک‌تصویری می‌ماند. */
  ok('۱۰.۱ خانهٔ خالی یعنی پیش‌فرض',
     lvLevelAt_(hub, { seriesKey: k }, {}) === String(CFG.LV_LEVEL_DEFAULT || 'کم'),
     lvLevelAt_(hub, { seriesKey: k }, {}));

  const r1 = uiLvLevelSave(k, 'زیاد');
  ok('۱۰.۲ ذخیره از تخته به رجیستری می‌رسد و تولید همان را می‌بیند',
     !!(r1 && r1.ok === true) &&
     lvLevelAt_(getHub_(), { seriesKey: k }, {}) === 'زیاد',
     JSON.stringify({ r: r1, read: lvLevelAt_(getHub_(), { seriesKey: k }, {}) }));

  /* سطحِ ناشناخته با **اسم** رد می‌شود، قرینهٔ `uiLvStyleSave`: خانه‌ای که
     بی‌صدا نادیده گرفته شود یعنی او چیزی انتخاب کرده که هرگز اثر نمی‌کند و
     هیچ‌وقت نمی‌فهمد (۷.۴۱). و مقدارِ قبلی باید دست‌نخورده بمانَد. */
  const bad = uiLvLevelSave(k, 'متوسط');
  ok('۱۰.۳ سطحِ ناشناخته رد می‌شود، مجازها را می‌گوید، و مقدارِ قبلی نمی‌پرد',
     !!(bad && bad.ok === false) &&
     (CFG.LV_LEVELS || []).every((x) => String(bad.message).indexOf(x) !== -1) &&
     lvLevelAt_(getHub_(), { seriesKey: k }, {}) === 'زیاد',
     JSON.stringify({ msg: bad && bad.message,
                      still: lvLevelAt_(getHub_(), { seriesKey: k }, {}) }));

  /* ══ و وعدهٔ سطح با واقعیتِ امروز سنجیده می‌شود ══
     «کم» و «زیاد» هر دو نقاشیِ ساخته‌شده می‌خواهند. اگر لایهٔ ۳ خاموش باشد و
     رسید این را نگوید، او سطح را عوض کرده و ویدئو عوض نشده — همان «سطحی که
     انتخاب شد و هیچ اثری نداشت» که اصلِ شکایتِ امروز بود. */
  {
    const genWas = CFG.LV_GEN_ENABLED;
    CFG.LV_GEN_ENABLED = false;
    try { props_().deleteProperty(PK.LV_GEN_ON); } catch (e) {}
    /* رسید تابعِ خودش نیست؛ `boardReceipt_` می‌سازدش. پس همان را می‌گیریم و
       **متنی که واقعاً به او نشان داده می‌شود** سنجیده می‌شود، نه بازخوانیِ
       یک رشته در آزمون (۷.۶۲: درِ تولید، نه خودِ تابع). */
    const realRc = global.boardReceipt_;
    let seen = null;
    global.boardReceipt_ = function (okk, title, lines) {
      seen = { ok: okk, title: String(title || ''),
               lines: (lines || []).map(String) };
      return realRc ? realRc.apply(null, arguments) : null;
    };
    let r2 = null;
    try { r2 = uiLvLevelSave(k, 'کم'); } finally {
      global.boardReceipt_ = realRc;
    }
    const joined = seen ? seen.lines.join(' ⏎ ') : '';
    ok('۱۰.۴ با لایهٔ ۳ خاموش، رسید می‌گوید «کم» امروز فقط کارتِ متنی است',
       /* نگارشِ اول دنبالِ «کارتِ برداری» می‌گشت — یعنی عبارتی که خودم
          تایپ کرده بودم. ۸.۱۶ متن را به «کارتِ متنی» عوض کرد و سنجه روی
          کدِ **درست** سرخ شد: ادعایی که با نثرِ نویسنده‌اش سنجیده شود،
          حافظهٔ او را می‌سنجد نه کد را (۷.۶۹). حالا سه چیزِ **معنادار**
          خواسته می‌شود: خاموش‌بودن گفته شود، سقفِ واقعی بیاید، و نامِ همان
          گزینهٔ منو که باید بزند — و نامِ گزینه از منبعِ منو خوانده می‌شود. */
       !!(r2 && r2.ok === true) && !!seen && seen.ok === true &&
       /خاموش/.test(joined) &&
       (() => {
         const ms = fs.readFileSync('src/05_Setup.gs', 'utf8');
         const mi = ms.match(/\.addItem\(\s*'([^']*)'\s*,\s*'runLvGenToggle'\s*\)/);
         return !!mi && joined.indexOf(mi[1]) !== -1;
       })() &&
       joined.indexOf(faDigitsOut_(String(CFG.LV_GEN_USD_MONTH))) !== -1,
       JSON.stringify({ r: r2 }) + ' · رسید: ' + joined.slice(0, 220) +
       ' — سطحی که عوض شود و ویدئو عوض نشود، همان شکایتِ امروز است');
    CFG.LV_GEN_ENABLED = genWas;
  }

  /* و روی **خودِ صفحه**: ستون و جعبه‌اش باید رندر شوند، وگرنه تنظیم هست و
     دری ندارد — عیبی که این بند برای آن نوشته شده (۵.۶۱/۷.۴۳). */
  {
    const page = seriesBoardHtml_(seriesBoardData_(getHub_()));
    ok('۱۰.۵ ستونِ «تصویرسازی» و جعبه‌اش روی تخته رندر می‌شوند',
       page.indexOf('<th>تصویرسازی</th>') !== -1 &&
       /onchange="lvLevel\(this\)"/.test(page),
       'th=' + (page.indexOf('<th>تصویرسازی</th>') !== -1) +
       ' · select=' + /onchange="lvLevel\(this\)"/.test(page));
    /* و دکمه‌ای که به تابعِ ناموجود وصل باشد بی‌صدا هیچ نمی‌کند (۵.۶۱) —
       پس نامی که صفحه صدا می‌زند باید واقعاً وجود داشته باشد. */
    ok('۱۰.۵-ب و تابعی که صفحه صدا می‌زند وجود دارد',
       typeof uiLvLevelSave === 'function' &&
       page.indexOf('.uiLvLevelSave(') !== -1,
       'fn=' + (typeof uiLvLevelSave) +
       ' · call=' + (page.indexOf('.uiLvLevelSave(') !== -1));
  }
}

console.log('\n══ ۱۱) «چی با چی» و برچسبی که نتیجه را بگوید (۸.۱۶) ══');
/* دو ایرادِ خودش، جلوِ همین تخته:
   «فکر کردم یه جوری میشه انتخاب کرد ترکیبی یعنی چی با چی» — و «ترکیبی»
   تا دیروز یک ظاهرِ ثابت بود که `mix: true`اش هیچ‌جا خوانده نمی‌شد.
   «کم و زیاد و خاموش کلماتِ کلیشه‌ای و گنگی هستن» — و بودند: اندازه را
   می‌گفتند، نه نتیجه را. */
{
  const hub = getHub_();
  {
    const sh = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = 'mix-test';
    v[SC.NAME - 1] = 'مجموعهٔ آزمونِ ترکیب';
    v[SC.STATUS - 1] = SST.ACTIVE;
    sh.appendRow(v);
  }
  const k = 'mix-test';

  /* و ادعا از همان دری که تولید وارد می‌شود: ذخیره از تخته، بعد پرسش از
     `lvStyleAt_` — نه بازخوانیِ خودِ تخته (۷.۳۵). */
  const r1 = uiLvStyleSave(k, 'نقشِ ایرانی', 'چاپِ قدیمی');
  const seen = lvStyleAt_(getHub_(), { seriesKey: k }, {});
  const st = lvStyleFind_(seen) || lvStyleOf_(readSeriesReg_(getHub_()).byKey[k].vals).style;
  ok('۱۱.۱ ترکیبِ انتخابیِ خودش ذخیره می‌شود و تولید همان را می‌بیند',
     !!(r1 && r1.ok === true) && seen.indexOf('نقشِ ایرانی') !== -1 &&
     seen.indexOf('چاپِ قدیمی') !== -1,
     JSON.stringify({ r: r1, seen: seen }));

  /* و واقعاً **ترکیب** است، نه یک نامِ طولانی: رنگ از اولی، نقش از دومی. */
  {
    const comp = lvStyleOf_(readSeriesReg_(getHub_()).byKey[k].vals);
    ok('۱۱.۱-ب و ترکیب یعنی رنگ از اولی و نقش از دومی',
       comp.style.composed === true &&
       comp.style.pal === lvStyleFind_('نقشِ ایرانی').pal &&
       comp.style.frame === lvStyleFind_('چاپِ قدیمی').frame,
       JSON.stringify({ key: comp.key, frame: comp.style.frame,
                        base: comp.style.base, motif: comp.style.motif }));
  }

  /* نقش روی «خودکار» رد می‌شود **با اسم**: پایه هنوز معلوم نیست، پس ترکیبی
     هم نیست — و انتخابی که بی‌صدا دور انداخته شود همان ۷.۴۱ است. */
  const au = uiLvStyleSave(k, 'خودکار', 'چاپِ قدیمی');
  ok('۱۱.۲ نقش روی «خودکار» رد می‌شود و دلیلش گفته می‌شود',
     !!(au && au.ok === false) && /پایه/.test(String(au.message)),
     JSON.stringify({ r: au }));

  /* «خودکار» باید **دوام بیاورد**: خانهٔ خالی را `lvStyleAudit_` هر شب پر
     می‌کند، پس اگر خالی ذخیره شود انتخابِ او یک شب بیشتر زنده نمی‌مانَد. */
  {
    uiLvStyleSave(k, 'خودکار', '');
    const raw = String(readSeriesReg_(getHub_()).byKey[k].vals[SC.LVSTYLE - 1] || '');
    const before = raw;
    lvStyleAudit_(getHub_());
    const after = String(readSeriesReg_(getHub_()).byKey[k].vals[SC.LVSTYLE - 1] || '');
    ok('۱۱.۳ «خودکار» خالی ذخیره نمی‌شود و سوئیپِ شبانه رویش نمی‌نویسد',
       before !== '' && after === before,
       JSON.stringify({ before: before, after: after }) +
       ' — خالی یعنی «دست نخورده» و هر شب با پیشنهاد پر می‌شود');
  }

  /* و برچسب‌ها: مقدارِ ذخیره‌شده همان خاموش/کم/زیاد می‌مانَد (وگرنه
     `lvLevelOf_` نمی‌شناسدش) ولی متنی که او می‌بیند باید **نتیجه** را
     بگوید. فهرست از `CFG.LV_LEVELS` خوانده می‌شود نه دست‌نویس، وگرنه سطحِ
     چهارمی که فردا اضافه شود این سنجه را سبز می‌گذارد (۷.۵۹). */
  {
    const page = seriesBoardHtml_(seriesBoardData_(getHub_()));
    const miss = (CFG.LV_LEVELS || []).filter((lv) => {
      const w = lvLevelWhat_(lv);
      return page.indexOf('value="' + lv + '"') === -1 ||
             (w && page.indexOf(w) === -1);
    });
    ok('۱۱.۴ هر سطح با توضیحِ نتیجه‌اش روی تخته می‌آید، نه فقط «کم/زیاد»',
       miss.length === 0 && (CFG.LV_LEVELS || []).length > 0,
       miss.length ? 'بی‌توضیح: ' + miss.join('، ')
                   : (CFG.LV_LEVELS || []).map((x) => x + '=' + lvLevelWhat_(x)).join(' · ').slice(0, 200));

    /* و جعبهٔ دومِ سبک («+ نقش») واقعاً رندر می‌شود و هر دو جعبه نقشِ خود را
       اعلام می‌کنند — بی `data-role` کدِ صفحه نمی‌داند کدام کدام است و
       دکمه بی‌صدا مقدارِ غلط می‌فرستد (۵.۶۱/۷.۴۳). */
    /* ⚠️ الگو باید **کلِ مقدار** را بگیرد، نه پیشوندش: نگارشِ اول
       `/data-role="motif"/` بود و شکستنِ عمدی (`motif` ⇒ `motifX`) هیچ‌جا
       ننشست، چون رشتهٔ بلندتر همان پیشوند را در خود دارد. دقیقاً تلهٔ
       `pt"+i`ِ ۷.۸۱. نقلِ‌قولِ بسته، همان یک نویسه‌ای است که فرق می‌کند. */
    const hasRole = (r) => page.indexOf('data-role="' + r + '"') !== -1;
    ok('۱۱.۵ هر دو جعبهٔ سبک روی تخته‌اند و نقششان اعلام شده',
       hasRole('base') && hasRole('motif') &&
       page.indexOf('.uiLvStyleSave(k,v,mv)') !== -1,
       'base=' + hasRole('base') + ' · motif=' + hasRole('motif') +
       ' · call=' + (page.indexOf('.uiLvStyleSave(k,v,mv)') !== -1));
  }
}

console.log('\n══ ۱۲) «خودش انتخاب کند» روی تخته — و فهرستی که رونوشت نباشد (۸.۱۸) ══');
{
  const k = Object.keys(readSeriesReg_(getHub_()).byKey)[0];

  /* ۱۲.۱ — فهرستِ نقش روی **خودِ صفحه** رونوشتِ فهرستِ بالا نیست و هر گزینه
     می‌گوید چه می‌کشد. او این را جلوِ همین جعبه گفت: «اون لیستِ نقش چرا
     محتواش مثلِ لیستِ بالاییشه؟» — و سنجه‌ای که فقط `lvMotifs_()` را صدا
     بزند، صفحه را ندیده (۷.۴۳: نگهبان یک لایه بالاتر از شکستگی). */
  {
    uiLvStyleSave(k, 'کاغذبری', '');
    const page = seriesBoardHtml_(seriesBoardData_(getHub_()));
    const sel = page.slice(page.indexOf('data-role="motif"'));
    const body = sel.slice(0, sel.indexOf('</select>'));
    const mo = lvMotifs_();
    const named = mo.filter((m) => body.indexOf(m.what) !== -1).length;
    /* سبکی که `frame`ش تکراری است **نباید** در این جعبه باشد: گزینه‌ای که
       عوض‌کردنش هیچ تفاوتی در تصویر نمی‌دهد، همان برچسبِ توخالی است. */
    const dup = LV_STYLES.filter((x) => !mo.some((m) => m.key === x.key));
    const leaked = dup.filter((x) => body.indexOf('value="' + x.key + '"') !== -1);
    ok('۱۲.۱ جعبهٔ نقش هر نقش را با توضیحش می‌آورد و تکراری‌ها را نمی‌آورد',
       named === mo.length && mo.length > 0 && dup.length > 0 && leaked.length === 0,
       named + ' از ' + mo.length + ' توضیح‌دار · کنارگذاشته: ' +
       dup.map((x) => x.key).join('،') +
       (leaked.length ? ' · نشتی: ' + leaked.map((x) => x.key).join('،') : ''));
  }

  /* ۱۲.۲ — «خودکار» گزینهٔ **صریحِ** جعبهٔ سطح است و ذخیره هم می‌شود. تا
     ۸.۱۷ فقط خانهٔ خالی بود، و خالی یعنی `LV_LEVEL_DEFAULT` — یعنی هیچ
     تشخیصی در کار نبود. «نگفته» با «بسپار به خودش» یکی نیست (۸.۱۳). */
  {
    const r = uiLvLevelSave(k, 'خودکار');
    const cell = String(readSeriesReg_(getHub_()).byKey[k].vals[SC.LVLEVEL - 1] || '');
    const page = seriesBoardHtml_(seriesBoardData_(getHub_()));
    ok('۱۲.۲ «خودکار» روی جعبهٔ سطح هست، ذخیره می‌شود، و خالی نمی‌مانَد',
       r && r.ok === true && cell === 'خودکار' &&
       page.indexOf('value="خودکار"') !== -1,
       JSON.stringify({ ok: r && r.ok, cell: cell }));

    /* و ردیفی که سطحش «خودکار» است، کارِ مدل را می‌گیرد — از همان دری که
       تولید می‌رود (`lvLevelAt_`)، نه با خواندنِ خانه (۷.۶۲). */
    ok('۱۲.۳ و همان خانه در تولید حرفِ مدل را می‌گیرد',
       lvLevelAt_(getHub_(), { seriesKey: k }, {}, { level: 'زیاد' }) === 'زیاد',
       lvLevelAt_(getHub_(), { seriesKey: k }, {}, { level: 'زیاد' }));

    /* و سطحِ ناشناخته همچنان رد می‌شود — باز کردنِ در برای «خودکار» نباید
       در را برای هر رشته‌ای باز کند. */
    const bad = uiLvLevelSave(k, 'خیلی زیاد');
    ok('۱۲.۴ ولی سطحِ ناشناخته هنوز با اسم رد می‌شود',
       bad && bad.ok === false && String(bad.message).indexOf('خیلی زیاد') !== -1,
       bad ? String(bad.message).slice(0, 70) : 'جواب نیامد');
  }
}

console.log('\n══ ۲۰) همهٔ گزینه‌های منو زیرِ نظر — هر زدن ثبت، هر خطا یافته (۸.۷۳) ══');
{
  /* ۱۱ اکتبر جست‌وجو در هر دو حالت «Out of memory error» داد و موتور خبر نداشت: فقط شمارِ
     بی‌آزمون‌ها ساخته می‌شد، نه ردی از زدن و نتیجه. */
  const menu = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const fns = []; const re = /addItem\('[^']*',\s*'([A-Za-z_][A-Za-z0-9_]*)'\)/g; let m;
  while ((m = re.exec(menu))) if (fns.indexOf(m[1]) === -1) fns.push(m[1]);
  const listed = BUILD_MENU_ITEMS_.map((x) => x[0]);
  ok('۲۰.۱ هر گزینهٔ منو در فهرستِ زیرِ نظر است (از build، نه دست‌نویس)',
     fns.every((f) => listed.indexOf(f) !== -1), fns.filter((f) => listed.indexOf(f) === -1).join(','));
  ok('۲۰.۲ درِ جست‌وجو (srchRun) و درهای تخته هم در فهرست‌اند',
     listed.indexOf('srchRun') !== -1 && listed.indexOf('uiCalSave') !== -1 && listed.indexOf('personaBoardSave') !== -1);
  ok('۲۰.۳ هنگامِ بارگذاری پیچیده شده‌اند', global.srchRun && global.srchRun.__menuWrapped === true &&
     global.healthCheck && global.healthCheck.__menuWrapped === true);
  delete global.__PROPS[PK.MENU_LOG];
  const realInner = global.srchRun.__menuInner;
  global.srchRun.__menuInner = null;
  // خطای واقعی از درونِ تابعِ پیچیده — با جایگزینیِ موقتِ درونی
  const saved = global.srchRun;
  global.srchRun = function () { return menuRun_('srchRun', function () { throw new Error('Out of memory error.'); }, this, arguments); };
  let threw = false;
  try { global.srchRun('کس مگو', 'smart', true); } catch (e) { threw = /memory/.test(e.message); }
  global.srchRun = saved; saved.__menuInner = realInner;
  const st1 = menuStatus_();
  ok('۲۰.۴ خطا به پنجره می‌رسد (پرتاب می‌شود) و ثبت می‌شود', threw && st1.fails.length === 1 &&
     /memory/.test(st1.fails[0].err) && st1.ok === false && /❌ خطا/.test(st1.line), JSON.stringify(st1.fails));
  const hub = getHub_(); const rep = hub.getSheetByName(CFG.REPORT_TAB);
  const vals = rep && rep.getLastRow() >= 1 ? rep.getRange(1, 1, rep.getLastRow(), rep.getLastColumn()).getValues().map((r) => r.join(' | ')).join('\n') : '';
  ok('۲۰.۵ و همان لحظه یافتهٔ «کد» می‌شود (صفِ ساختِ نسخهٔ بعد)', /جست‌وجو|srchRun/.test(vals) && /Out of memory/.test(vals),
     vals.slice(-300));
  const m2 = JSON.parse(global.__PROPS[PK.MENU_LOG]);
  m2.runBackupNow = { n: 0, open: Date.now() - 20 * 60000 };
  global.__PROPS[PK.MENU_LOG] = JSON.stringify(m2);
  const st2 = menuStatus_();
  ok('۲۰.۶ اجرایی که شروع شد و تمام نشد (کشته شد) هم ایراد است', st2.died.some((d) => d.name === 'runBackupNow') && /کشته شد/.test(st2.line),
     st2.line);
  delete global.__PROPS[PK.MENU_LOG];
  const okRun = menuRun_('runSyncNow', function () { return 42; }, null, []);
  const st3 = menuStatus_();
  ok('۲۰.۷ زدنِ موفق: مقدار برمی‌گردد، «۷ روز» شمرده می‌شود، و خط بی ❌ است', okRun === 42 && st3.used7 === 1 && st3.ok === true &&
     !/❌/.test(st3.line) && st3.tracked === BUILD_MENU_ITEMS_.length, st3.line);
  /* ۲۰.۸ — درِ پنجره‌ای که خطا را **برمی‌گرداند** نه پرتاب می‌کند (srchRun همین بود). */
  const realSr = global.srchRun.__menuInner;
  const fakeInner = function () { return { ok: false, items: [], notes: ['خطا: Out of memory error.'] }; };
  const wrapped = function () { return menuRun_('srchRun', fakeInner, this, arguments); };
  const r8 = wrapped('x', 'simple', true);
  const st8 = menuStatus_();
  ok('۲۰.۸ جوابِ {ok:false} با متنِ خطا هم خطا ثبت می‌شود (و به پنجره همان جواب می‌رسد)',
     r8.ok === false && st8.fails.length === 1 && /memory/.test(st8.fails[0].err), JSON.stringify(st8.fails));
  delete global.__PROPS[PK.MENU_LOG];
  const md = fs.readFileSync('docs/menu.md', 'utf8');
  ok('۲۰.۹ هر گزینه و درِ پنجره «فلسفه و کار» دارد (docs/menu.md از توضیحِ خودِ تابع)',
     BUILD_MENU_ITEMS_.every((x) => x[4] === 1) && md.indexOf('بی‌توضیح') === -1,
     BUILD_MENU_ITEMS_.filter((x) => x[4] !== 1).map((x) => x[0]).join(','));
  void realSr;
}

console.log('\n══ ۱۳) بدهیِ منو: «آزمونِ تلگرام» — هر سه راه، با اجرا (۸.۸۶) ══');
/* سه راهی که صاحبِ برنامه با زدنِ این گزینه می‌بیند: توکن یا چت خالی ⇒ راهنمای Script Properties
   و **هیچ** فراخوانی به تلگرام؛ اتصالِ سالم ⇒ یک پیامِ آزمایشی و نامِ ربات؛ خطای API ⇒ «ناموفق»
   با متنِ خطا، نه سکوت. تابعِ واقعیِ منو اجرا می‌شود؛ فقط درِ شبکه (`tgApi_`/`tgSend_`) بدل است. */
{
  const alerts = [], calls = [];
  const uiWas = global.__UI;
  global.__UI = { alert: (t, m) => { alerts.push(String(t) + '|' + String(m)); }, ButtonSet: { OK: 'OK' } };
  const apiWas = global.tgApi_, sendWas = global.tgSend_;
  const tokWas = global.__PROPS[PK.TG_TOKEN], chatWas = global.__PROPS[PK.TG_CHAT];
  global.tgApi_ = (m) => { calls.push('api:' + m); return { ok: true, result: { username: 'ce_bot' } }; };
  global.tgSend_ = (t) => { calls.push('send:' + t); return true; };
  try {
    delete global.__PROPS[PK.TG_TOKEN]; global.__PROPS[PK.TG_CHAT] = '123';
    testTelegram();
    ok('۱۳.۱ توکنِ خالی ⇒ راهنمای Script Properties با «توکن: خالی»، و هیچ فراخوانی به تلگرام',
       alerts.length === 1 && /TELEGRAM_BOT_TOKEN/.test(alerts[0]) && /توکن: خالی/.test(alerts[0]) &&
       /شناسهٔ چت: ثبت شده/.test(alerts[0]) && calls.length === 0, JSON.stringify({ alerts, calls }));
    alerts.length = 0;
    global.__PROPS[PK.TG_TOKEN] = 'T0K';
    testTelegram();
    ok('۱۳.۲ اتصالِ سالم ⇒ getMe و یک پیامِ آزمایشی، و نامِ ربات در پنجره',
       calls.join(',') === 'api:getMe,send:✅ <b>اتصال برقرار است.</b>\nموتور محتوای آرشیو از این پس قسمت‌ها را همین‌جا می‌فرستد.' &&
       alerts.length === 1 && /@ce_bot/.test(alerts[0]) && /چت: 123/.test(alerts[0]), JSON.stringify({ alerts, calls }));
    alerts.length = 0; calls.length = 0;
    global.tgApi_ = () => { throw new Error('Unauthorized'); };
    testTelegram();
    ok('۱۳.۳ خطای API ⇒ «ناموفق» با متنِ خطا، و پیامی فرستاده نمی‌شود',
       alerts.length === 1 && /ناموفق: Unauthorized/.test(alerts[0]) && calls.length === 0, JSON.stringify({ alerts, calls }));
  } finally {
    global.tgApi_ = apiWas; global.tgSend_ = sendWas; global.__UI = uiWas;
    if (tokWas === undefined) delete global.__PROPS[PK.TG_TOKEN]; else global.__PROPS[PK.TG_TOKEN] = tokWas;
    if (chatWas === undefined) delete global.__PROPS[PK.TG_CHAT]; else global.__PROPS[PK.TG_CHAT] = chatWas;
  }
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
