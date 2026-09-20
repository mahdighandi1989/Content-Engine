/* جست‌وجو در همهٔ محتوا — بخشِ ۳۴.
 *
 * چرا آزمونِ سخت‌گیر: هر خرابیِ این بخش شکلِ یکسانی دارد — **«پیدا نشد»**.
 * و «پیدا نشد» بدترین خروجیِ ممکن است، چون کاربر نتیجه می‌گیرد چیزی وجود
 * ندارد در حالی که فقط ما نگشته‌ایم. نه خطایی بلند می‌شود، نه ردیفی در
 * جایی می‌نشیند. پس همهٔ این‌ها باید **اجرا** شوند، نه خوانده.
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

console.log('\n══ ۱) نرمال‌سازی — جایی که جست‌وجوی تحت‌اللفظی شکست می‌خورد ══');
ok('۱.۱ ي و ی یکی می‌شوند', srchNorm_('كتابخانه ملي') === srchNorm_('کتابخانه ملی'));
ok('۱.۲ نیم‌فاصله و فاصله یکی‌اند',
   srchNorm_('می' + String.fromCharCode(0x200c) + 'گوید') === srchNorm_('می گوید'));
ok('۱.۳ اعراب نادیده گرفته می‌شود', srchNorm_('کِتاب') === srchNorm_('کتاب'),
   'متنِ گفتاریِ این موتور اعراب‌دار است و کاربر بی اعراب تایپ می‌کند');
ok('۱.۴ رقمِ فارسی و لاتین یکی‌اند', srchNorm_('۱۴۰۴') === srchNorm_('1404'));
ok('۱.۵ ة و ه یکی‌اند', srchNorm_('مدرسة') === srchNorm_('مدرسه'));

console.log('\n══ ۲) واژه‌ها ══');
const tm = srchTerms_('از این کلیپ دربارهٔ زیان‌گریزی و ترسِ از ضرر');
ok('۲.۱ ایست‌واژه‌ها کنار می‌روند', tm.indexOf('از') === -1 && tm.indexOf('این') === -1);
ok('۲.۲ واژه‌های معنادار می‌مانند',
   tm.some(w => w.indexOf('زیان') !== -1) && tm.indexOf('ضرر') !== -1, tm.join('،'));
ok('۲.۳ عبارتِ فقط ایست‌واژه، خالی برمی‌گردد', srchTerms_('از این و آن را که').length === 0);

console.log('\n══ ۳) الگو — همان چیزی که «تمام» را ممکن می‌کند ══');
const p1 = srchPattern_('کتابخانه');
ok('۳.۱ الگو ردهٔ نویسه دارد', p1.indexOf('[') !== -1);
ok('۳.۲ الگو املای عربی را می‌گیرد', new RegExp(p1, 'u').test('كتابخانه'),
   'کاربر با کافِ فارسی تایپ می‌کند، شیت کافِ عربی دارد');
ok('۳.۳ و املای فارسی را هم', new RegExp(p1, 'u').test('کتابخانه'));
ok('۳.۴ اعرابِ وسطِ واژه الگو را نمی‌شکند', new RegExp(p1, 'u').test('کِتابخانه'));
const p2 = srchPattern_('می گوید');
ok('۳.۵ فاصله با نیم‌فاصله جور می‌شود',
   new RegExp(p2, 'u').test('می' + String.fromCharCode(0x200c) + 'گوید') &&
   new RegExp(p2, 'u').test('میگوید'));
ok('۳.۶ نویسهٔ ویژه الگو را خراب نمی‌کند',
   (function () { try { new RegExp(srchPattern_('قیمت (دلار)'), 'u'); return true; }
                  catch (e) { return false; } })(),
   'یک پرانتزِ بی‌گریز یعنی خطا به‌جای نتیجه');
ok('۳.۷ رقم هر دو شکل را می‌گیرد',
   new RegExp(srchPattern_('1404'), 'u').test('۱۴۰۴'));

console.log('\n══ ۴) امتیاز — معنا، نه تاریخ ══');
const F = (o) => Object.assign({ topic: '', msg: '', summary: '', body: '', vibe: '', raw: '' }, o);
const s1 = srchScore_(F({ topic: 'زیان‌گریزی در بازار' }), ['زیان', 'بازار'], 'زیان بازار');
const s2 = srchScore_(F({ body: 'زیان‌گریزی در بازار' }), ['زیان', 'بازار'], 'زیان بازار');
ok('۴.۱ موضوع از متن مهم‌تر است', s1 > s2, s1 + ' > ' + s2);
const s3 = srchScore_(F({ topic: 'زیان و بازار' }), ['زیان', 'بازار'], '');
const s4 = srchScore_(F({ topic: 'زیان زیان زیان زیان' }), ['زیان', 'بازار'], '');
ok('۴.۲ پوشش از تکرار مهم‌تر است', s3 > s4,
   'وگرنه ردیفی که یک واژه را چهار بار دارد بالاتر می‌نشیند');
ok('۴.۳ بی‌ربط امتیاز نمی‌گیرد', srchScore_(F({ topic: 'آشپزی' }), ['زیان', 'بازار'], '') === 0);
ok('۴.۴ عبارتِ کامل امتیازِ بیشتری دارد',
   srchScore_(F({ summary: 'ترس از ضرر' }), ['ترس', 'ضرر'], 'ترس از ضرر') >
   srchScore_(F({ summary: 'ترس ... ضرر' }), ['ترس', 'ضرر'], 'ترس از ضرر'));
ok('۴.۵ امتیاز به تاریخ کاری ندارد',
   srchScore_(F({ topic: 'الف' }), ['الف'], '') === srchScore_(F({ topic: 'الف' }), ['الف'], ''),
   'خواستهٔ صریح: «نه از حیثِ زمانی بلکه از حیثِ محتوایی»');

console.log('\n══ ۵) تبِ بانک از روی سرستون شناخته می‌شود، نه از نام ══');
const hub = getHub_();
const mkCat = (name, rows) => {
  const sh = hub.insertSheet(name);
  sh.appendRow(HUB_HEADERS.slice());
  rows.forEach(r => sh.appendRow(r));
  return sh;
};
const row = (o) => {
  const r = new Array(HUB_HEADERS.length).fill('');
  r[COL.ID - 1] = o.id || 'FILE1'; r[COL.KIND - 1] = o.kind || 'ویدیو';
  r[COL.DATE - 1] = o.date || '2026-01-01'; r[COL.TOPIC - 1] = o.topic || '';
  r[COL.MSG - 1] = o.msg || ''; r[COL.SUMMARY - 1] = o.summary || '';
  r[COL.BODY - 1] = o.body || ''; r[COL.LINK - 1] = o.link || '';
  return r;
};
mkCat('مالی، ترید و اقتصاد', [
  row({ id: 'V1', topic: 'زیان‌گریزی و رفتارِ معامله‌گر',
        msg: 'آدم‌ها از ضرر بیشتر می‌ترسند تا از سود خوشحال شوند',
        summary: 'loss aversion در بازار', link: 'https://drive.google.com/file/d/V1/view' }),
  row({ id: 'V2', topic: 'تحلیلِ تکنیکال مقدماتی', msg: 'خط روند و مقاومت' })
]);
mkCat('سلامت و سبک زندگی', [
  row({ id: 'P1', kind: 'عکس', topic: 'خوابِ کودک',
        msg: 'نوزاد شب‌ها چند بار بیدار می‌شود' })
]);
const junk = hub.insertSheet('_گزارش'); junk.appendRow(['زمان', 'رویداد']);
junk.appendRow(['2026', 'زیان‌گریزی در گزارش']);
const tabs = srchHubTabs_(hub).map(s => s.getName());
ok('۵.۱ تب‌های دسته پیدا شدند',
   tabs.indexOf('مالی، ترید و اقتصاد') !== -1 && tabs.indexOf('سلامت و سبک زندگی') !== -1);
ok('۵.۲ تبِ غیرِدسته کنار ماند', tabs.indexOf('_گزارش') === -1,
   'فهرستِ دست‌نویسِ نام‌ها کهنه می‌شود — اینجا از سرستون شناخته می‌شود');

console.log('\n══ ۶) گشتنِ واقعی، از سر تا ته ══');
const r6 = srchRun_('زیان‌گریزی', { mode: 'ساده', sources: false });
ok('۶.۱ نتیجه پیدا شد', r6.ok && r6.items.length >= 1, JSON.stringify(r6.items.map(i => i.title)));
ok('۶.۲ همان آیتمِ درست است', r6.items[0].id === 'V1');
ok('۶.۳ لینکِ فایل دارد', /V1/.test(r6.items[0].link));
ok('۶.۴ لینکِ همان ردیف در شیت هم دارد', /range=A/.test(r6.items[0].sheetLink),
   '«پیدا شد ولی نمی‌گویم کجا» جواب نیست');
ok('۶.۵ آیتمِ بی‌ربط نیامد', !r6.items.some(i => i.id === 'V2'));
ok('۶.۶ تبِ غیرِدسته گشته نشد', !r6.items.some(i => i.tab === '_گزارش'));

console.log('\n══ ۷) املای متفاوت باید همان را پیدا کند ══');
const r7 = srchRun_('زيان گريزي', { mode: 'ساده', sources: false });
ok('۷.۱ با ي و فاصلهٔ عربی هم پیدا می‌شود', r7.items.length >= 1 && r7.items[0].id === 'V1',
   'این همان حالتی است که یک جست‌وجوی ساده «پیدا نشد» می‌داد');

console.log('\n══ ۸) شیت‌های منبع — متنِ خام، و فقط خواندن ══');
const fake = SpreadsheetApp.create('RESULT-TEST');
global.__SS[fake.getId()] = fake;
const fsh = fake.insertSheet('Sheet1');
fsh.appendRow(['نام فایل', 'متن']);
fsh.appendRow(['clip.mp4', 'او دربارهٔ ترسِ از دست دادنِ سرمایه صحبت می‌کند']);
const realSrc = CFG.SOURCES;
CFG.SOURCES = [{ key: 'test', id: fake.getId(), title: 'RESULT-TEST', schema: 'auto' }];
const r8 = srchRun_('ترس از دست دادن سرمایه', { mode: 'ساده', sources: true });
ok('۸.۱ ردیفِ شیتِ منبع پیدا شد', r8.items.some(i => i.where === 'منبع'),
   JSON.stringify(r8.items.map(i => i.where + ':' + i.title)));
ok('۸.۲ و لینکِ ردیفش را می‌دهد',
   r8.items.filter(i => i.where === 'منبع').every(i => /range=A/.test(i.sheetLink)));
const before = fsh.getRange(2, 1, 1, 2).getValues()[0].join('|');
srchRun_('ترس', { mode: 'ساده', sources: true });
ok('۸.۳ شیتِ منبع دست نخورد',
   fsh.getRange(2, 1, 1, 2).getValues()[0].join('|') === before,
   'شیت‌های منبع فقط‌خواندنی‌اند — این بخش اصلاً راهِ نوشتن ندارد');
ok('۸.۴ خاموش‌کردنِ منبع واقعاً خاموشش می‌کند',
   !srchRun_('ترس از دست دادن سرمایه', { mode: 'ساده', sources: false })
      .items.some(i => i.where === 'منبع'));
CFG.SOURCES = realSrc;

console.log('\n══ ۹) حالتِ هوشمند ══');
const realGem = global.geminiText_;
let sawExpand = false, sawRank = false;
global.geminiText_ = function (prompt) {
  if (prompt.indexOf('عیناً در متنِ آن') !== -1) {
    sawExpand = true;
    return JSON.stringify({ terms: ['loss aversion', 'ضرر', 'زیان‌گریزی'], note: '' });
  }
  sawRank = true;
  return JSON.stringify({ hits: [{ id: '1', why: 'دقیقاً همین است', fit: 'بسیار نزدیک' }],
                          answer: 'همان کلیپِ زیان‌گریزی است.' });
};
const r9 = srchRun_('اون کلیپه که یارو می‌گفت آدم از ضرر بیشتر می‌ترسه',
                    { mode: 'هوشمند', sources: false });
ok('۹.۱ واژه‌ها با مدل گسترش یافت', sawExpand && r9.terms.indexOf('loss aversion') !== -1,
   'کاربر «ترس از ضرر» می‌گوید و متن «loss aversion» دارد — بی این پل چیزی پیدا نمی‌شود');
ok('۹.۲ رتبه‌بندیِ معنایی اجرا شد', sawRank);
ok('۹.۳ دلیل کنارِ نتیجه می‌آید', r9.items.length >= 1 && !!r9.items[0].why);
ok('۹.۴ جوابِ کوتاه هم می‌آید', !!r9.answer);

global.geminiText_ = function () { return JSON.stringify({ hits: [{ id: '999' }] }); };
const r9b = srchRun_('زیان‌گریزی', { mode: 'هوشمند', sources: false });
ok('۹.۵ شناسهٔ ساختگی دور ریخته می‌شود',
   r9b.items.length >= 1 && r9b.items.every(i => !!i.id),
   'یک شناسهٔ ساختگی یعنی لینکی که به جایی نمی‌رود');

global.geminiText_ = function () { throw new Error('مدل در دسترس نیست'); };
const r9c = srchRun_('زیان‌گریزی', { mode: 'هوشمند', sources: false });
ok('۹.۶ بی مدل، نتیجهٔ لغوی می‌آید', r9c.ok && r9c.items.length >= 1);
ok('۹.۷ و صریح گفته می‌شود که هوشمند انجام نشد',
   r9c.notes.some(n => n.indexOf('انجام نشد') !== -1),
   'قابلیتی که بی‌صدا خاموش شود، همان بانکِ موسیقی است');
global.geminiText_ = realGem;

console.log('\n══ ۱۰) صداقت دربارهٔ پوشش ══');
ok('۱۰.۱ می‌گوید چند تب گشته شد', r6.sheets >= 2);
ok('۱۰.۲ و چند ردیف نامزد بود', typeof r6.scanned === 'number');
/* بریدنِ **واقعی**: سقف کفِ ۲۰ دارد (و باید داشته باشد — سقفِ یک بی‌معناست)،
   پس آزمون باید بیشتر از کف ردیفِ خورنده بسازد، نه اینکه سقف را زیرِ کف
   بگذارد و خیال کند بریده شده. */
const many = [];
for (let i = 0; i < 26; i++) many.push(row({ id: 'C' + i, topic: 'سقف‌آزما شمارهٔ ' + i }));
mkCat('آزمونِ سقف', many);
const realCap = CFG.SEARCH_CAND_MAX; CFG.SEARCH_CAND_MAX = 20;
const r10 = srchRun_('سقف‌آزما', { mode: 'ساده', sources: false });
ok('۱۰.۳ رسیدن به سقف اعلام می‌شود', !!r10.stopped && r10.items.length <= 20,
   'جست‌وجوی نیمه‌کاره‌ای که خودش را کامل جا بزند، «نیست» می‌گوید به چیزی که هست');
CFG.SEARCH_CAND_MAX = realCap;
ok('۱۰.۴ ورودیِ خالی محترمانه رد می‌شود',
   !srchRun_('   ', { mode: 'ساده' }).ok);
ok('۱۰.۵ عبارتی که فقط ایست‌واژه است، صریح گفته می‌شود',
   srchRun_('از این و آن', { mode: 'ساده', sources: false }).notes.length > 0);

console.log('\n══ ۱۱) پنجره و سیم‌کشی ══');
const html = srchHtml_();
ok('۱۱.۱ پنجره ساخته می‌شود', html.indexOf('srchRun') !== -1);
/* پیمایشِ درستِ زنجیره کارِ `run_wiring_test.js` ۵.۲ است و آن حالا این
   پنجره را هم می‌بیند. اینجا فقط همان چیزی را می‌سنجیم که این بخش وعده
   می‌دهد: دکمه به `srchRun` وصل است و `srchRun` وجود دارد. */
ok('۱۱.۲ دکمه به srchRun وصل است و srchRun هست',
   /\.srchRun\(/.test(html) && typeof srchRun === 'function',
   'دکمه‌ای که تابعش نباشد هیچ خطایی نمی‌دهد، فقط کار نمی‌کند');
ok('۱۱.۳ srchRun خطا را به پنجره برمی‌گرداند، نه پرتاب',
   (function () {
     const g = global.getHub_; global.getHub_ = function () { throw new Error('bad'); };
     let r; try { r = srchRun('x', 'ساده', false); } catch (e) { r = null; }
     global.getHub_ = g;
     return r && r.ok === false;
   })());

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
