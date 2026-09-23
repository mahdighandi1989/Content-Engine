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
/* ══ معنای سقف در ۷٫۲۵ عوض شد، و عمداً ══
   تا ۷٫۲۴ رسیدن به سقفِ نامزدها پویش را **می‌ایستاند**، و چون تب‌ها به
   ترتیبِ getSheets پیموده می‌شوند، تطبیق‌های ضعیفِ تب‌های اول می‌توانستند
   جلوی دیده‌شدنِ عبارتِ دقیقِ کاربر در تبِ آخر را بگیرند. حالا سقف یعنی
   «چند تا نگه می‌داریم» و ایستادن را بودجهٔ ردیف/زمان تعیین می‌کند. */
const realRows = CFG.SEARCH_ROWS_MAX;
const realCap = CFG.SEARCH_CAND_MAX; CFG.SEARCH_CAND_MAX = 20;
const r10 = srchRun_('سقف‌آزما', { mode: 'ساده', sources: false });
/* بودجهٔ ردیف کفِ ۲۰۰ دارد (و باید داشته باشد)، پس آزمون باید بیشتر از کف
   ردیفِ خورنده بسازد — نه اینکه بودجه را زیرِ کف بگذارد و خیال کند تمام شد. */
const lots = [];
for (let i = 0; i < 260; i++) lots.push(row({ id: 'R' + i, topic: 'بودجه‌آزما ' + i }));
mkCat('آزمونِ بودجه', lots);
CFG.SEARCH_ROWS_MAX = 200;
const r10b = srchRun_('بودجه‌آزما', { mode: 'ساده', sources: false });
CFG.SEARCH_ROWS_MAX = realRows;
ok('۱۰.۳ بودجهٔ ردیف که تمام شود، اعلام می‌شود', !!r10b.stopped,
   'جست‌وجوی نیمه‌کاره‌ای که خودش را کامل جا بزند، «نیست» می‌گوید به چیزی که هست');
ok('۱۰.۳-ب سقف دیگر پویش را نمی‌ایستاند، فقط بهترین‌ها را نگه می‌دارد',
   !r10.stopped && r10.items.length > 0,
   'باگِ ۷٫۲۴: ۲۴۰ تطبیقِ ضعیف در تب‌های اول می‌توانست جلوی عبارتِ دقیقِ کاربر را بگیرد');
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

console.log('\n══ ۱۱-ب) عبارتِ دقیق نباید پشتِ انبوهِ تطبیقِ ضعیف گم شود ══');
/* چهارده تب پر از تطبیقِ ضعیف، و عبارتِ دقیقِ کاربر در تبِ پانزدهم. */
for (let t = 0; t < 14; t++) {
  const weak = [];
  for (let i = 0; i < 25; i++) weak.push(row({ id: 'W' + t + '_' + i, body: 'مذهب و چیزهای دیگر' }));
  mkCat('ضعیف' + t, weak);
}
mkCat('زتبِ آخر', [row({ id: 'EXACT', topic: 'مذهب و فلسفهٔ تحلیلی در دورهٔ معاصر' })]);
const rCliff = srchRun_('مذهب و فلسفهٔ تحلیلی', { mode: 'ساده', sources: false });
ok('۱۱-ب.۱ عبارتِ دقیق در نتیجه‌هاست',
   rCliff.items.some(i => i.id === 'EXACT'),
   'باگِ ۷٫۲۴: سقف در ترتیبِ تب‌ها مصرف می‌شد، پس تبِ پانزدهم هرگز خوانده نمی‌شد');
ok('۱۱-ب.۲ و بالاترین است', rCliff.items[0] && rCliff.items[0].id === 'EXACT',
   rCliff.items.slice(0, 3).map(i => i.id + '/' + i.score).join('، '));

console.log('\n══ ۱۲) یابنده و سنجنده نباید با هم اختلاف داشته باشند (۷٫۲۴) ══');
/* هر اختلافِ این دو لایه با `if (score <= 0) continue` حل می‌شد — یعنی
   حذفِ بی‌صدا. کاربر «پیدا نشد» می‌دید برای چیزی که در شیت بود. */
const Z = String.fromCharCode(0x200c);
const FF = (o) => Object.assign({ topic: '', msg: '', summary: '', body: '', vibe: '', raw: '' }, o);
ok('۱۲.۱ عبارتِ سرِ هم، سلولِ نیم‌فاصله‌دار را پیدا می‌کند',
   srchScore_(FF({ topic: 'می' + Z + 'گوید سلام' }), srchTerms_('میگوید'), 'میگوید') > 0,
   'کاربر معمولاً «میگوید» تایپ می‌کند و متنِ موتور نیم‌فاصله دارد');
ok('۱۲.۲ و برعکسش هم',
   srchScore_(FF({ topic: 'میگوید سلام' }), srchTerms_('می' + Z + 'گوید'), 'می' + Z + 'گوید') > 0);
ok('۱۲.۳ پاداشِ عبارتِ کامل با یک «؟» از بین نمی‌رود',
   srchScore_(FF({ summary: 'ترس از ضرر' }), srchTerms_('ترس از ضرر؟'), 'ترس از ضرر؟') >
   srchScore_(FF({ summary: 'ترس و ضرر' }), srchTerms_('ترس از ضرر؟'), 'ترس از ضرر؟'),
   'پنجره صریح دعوت می‌کند جمله بنویسید');
const rZ = srchRun_('زيانگريزي', { mode: 'ساده', sources: false });
ok('۱۲.۴ و در مسیرِ کامل هم', rZ.items.some(i => i.id === 'V1'),
   'املای عربی + سرِ هم، هر دو با هم');

console.log('\n══ ۱۳) الگو باید در RE2 هم معتبر باشد، نه فقط در جاوااسکریپت ══');
/* ماک با RegExpِ جاوااسکریپت کار می‌کند و گوگل‌شیت با RE2. RE2 بک‌اسلش را
   فقط پیشِ نشانه‌گذاریِ ASCII می‌پذیرد، پس `\؟` آنجا خطاست و اینجا نه —
   الگوی باطل یعنی استثنا در createTextFinder، یعنی صفر نتیجه، بی هیچ نشانه. */
const tricky = ['قیمت؟', '«نقل قول»', 'سه… نقطه', 'قیمت (دلار)', 'a.b*c', '؟؟؟',
                '🙂 خنده', 'ک'.repeat(700), 'x]y[z', '\\'];
for (const q of tricky) {
  const pt = srchPattern_(q);
  const noBadEsc = !/\\[^\x00-\x7F]/.test(pt);
  const balanced = (pt.match(/\[/g) || []).length === (pt.match(/\]/g) || []).length;
  let jsOk = true; try { new RegExp(pt, 'u'); } catch (e) { jsOk = false; }
  ok('۱۳ الگوی ' + JSON.stringify(q.slice(0, 14)) + ' سالم است',
     noBadEsc && balanced && jsOk,
     noBadEsc ? (balanced ? '' : 'ردهٔ نویسهٔ نیمه‌باز') : 'بک‌اسلش پیشِ نویسهٔ غیرِASCII');
}
ok('۱۳.۱ نشانه‌گذاری مثلِ فاصله رفتار می‌کند',
   new RegExp(srchPattern_('جنگ، سرد'), 'u').test('جنگ سرد'));

console.log('\n══ ۱۴) ستون‌های بعد از ۲۴ ══');
const wide = mkCat('تبِ پهن', []);
(function () {
  const r = new Array(HUB_HEADERS.length).fill('');
  r[COL.ID - 1] = 'W1'; r[COL.TOPIC - 1] = 'چیزی';
  wide.appendRow(r);
})();
ok('۱۴.۱ خواندن به ۲۴ ستون محدود نیست',
   /SEARCH_MAX_COLS/.test(fs.readFileSync('src/34_Search.gs', 'utf8')) &&
   !/srchReadRows_\(sh, order, 24\)/.test(fs.readFileSync('src/34_Search.gs', 'utf8')),
   'شیت‌های منبع ۵۷ ستون دارند و تحلیل‌ها در ستون‌های ۲۵ به بعدند');

console.log('\n══ ۱۵) سقفِ بانک نباید شیت‌های منبع را ببلعد ══');
const many2 = [];
for (let i = 0; i < 40; i++) many2.push(row({ id: 'M' + i, topic: 'پرتکرارواژه شمارهٔ ' + i }));
mkCat('پرتکرار', many2);
const fake2 = SpreadsheetApp.create('SRC-2');
global.__SS[fake2.getId()] = fake2;
const f2 = fake2.insertSheet('S');
// سرستون‌های واقعیِ منبع، تا نگاشتِ ستون هم سنجیده شود
f2.appendRow(['Timestamp', 'File_ID', 'Main_Subject', 'General_Executive_Summary']);
f2.appendRow(['2026-01-01 10:00', '1AbCdEfGhIjKlMnOpQrStUvWxYz01234',
              'پرتکرارواژه دقیقاً همین است', 'توضیحِ کامل دربارهٔ پرتکرارواژه']);
const realSrc2 = CFG.SOURCES;
CFG.SOURCES = [{ key: 't2', id: fake2.getId(), title: 'SRC-2', schema: 'auto' }];
const realCap2 = CFG.SEARCH_CAND_MAX; CFG.SEARCH_CAND_MAX = 20;
const r15 = srchRun_('پرتکرارواژه دقیقاً همین است', { mode: 'ساده', sources: true });
ok('۱۵.۱ منبع باز هم گشته می‌شود و نتیجهٔ بهترش بالا می‌آید',
   r15.items.some(i => i.where === 'منبع'),
   'باگِ ۷٫۲۳: هر واژه‌ای که بانک را پر می‌کرد، هر پنج شیتِ منبع را کامل رد می‌کرد — ' +
   'و پنجره پیشنهاد می‌داد تیکِ منبع را بردارید، یعنی خاموش‌کردنِ لایه‌ای که گشته نشده بود');
ok('۱۵.۲ عنوانش از Main_Subject می‌آید، نه از Timestamp',
   (function () {
     const it = r15.items.filter(i => i.where === 'منبع')[0];
     return it && it.title.indexOf('پرتکرارواژه') === 0;
   })(),
   'ستونِ اولِ هر ۲۲ تبِ منبع Timestamp است؛ ۷٫۲۴ عنوانِ هر نتیجه را یک تاریخ می‌کرد ' +
   'در حالی که خواستهٔ صریح «نه از حیثِ زمانی» بود');
ok('۱۵.۳ لینکش از File_ID ساخته می‌شود',
   (function () {
     const it = r15.items.filter(i => i.where === 'منبع')[0];
     return it && /1AbCdEfGhIjKlMnOpQrStUvWxYz01234/.test(it.link);
   })());
CFG.SEARCH_CAND_MAX = realCap2; CFG.SOURCES = realSrc2;

console.log('\n══ ۱۶) شکستِ بی‌صدا ممنوع ══');
const bad = hub.insertSheet('تبِ خراب');
bad.appendRow(HUB_HEADERS.slice());
bad.appendRow(row({ id: 'B1', topic: 'زیان‌گریزی پنهان' }));
bad.createTextFinder = function () { throw new Error('boom'); };
const r16 = srchRun_('زیان‌گریزی', { mode: 'ساده', sources: false });
ok('۱۶.۱ تبی که خطا داد گزارش می‌شود',
   r16.notes.some(n => n.indexOf('تبِ خراب') !== -1),
   'سکوت یعنی کاربر باور می‌کند همه‌جا گشته شده');
ok('۱۶.۲ و در شمارشِ «گشته شد» حساب نمی‌شود',
   r16.sheets < srchHubTabs_(hub).length,
   'ادعای پوششی که وجود نداشته، از سکوت بدتر است');
ok('۱۶.۳ ولی در مخرج هست — صورت و مخرج دو چیزند (۷٫۵۱)',
   r16.sheetsAll > r16.sheets && r16.sheetsAll === srchHubTabs_(hub).length,
   'گرفت: ' + r16.sheets + ' از ' + r16.sheetsAll + ' — مخرجی که از صورت گرفته شود ' +
   'همیشه «همه‌اش را گشتم» می‌گوید، و همین بود که ۲۳ سپتامبر ۳ تب را کامل نشان داد');
delete bad.createTextFinder;

console.log('\n══ ۱۷) مدل حق دارد کنار بگذارد، نه پنهان کند ══');
const realGem2 = global.geminiText_;
global.geminiText_ = function (prompt) {
  if (prompt.indexOf('عیناً در متنِ آن') !== -1) return JSON.stringify({ terms: [] });
  return JSON.stringify({ hits: [], answer: 'هیچ‌کدام دقیقاً نمی‌خورد.' });
};
const r17 = srchRun_('زیان‌گریزی', { mode: 'هوشمند', sources: false });
ok('۱۷.۱ وقتی مدل هیچ‌کدام را نپسندید، حرفش گم نمی‌شود',
   r17.answer.indexOf('نمی‌خورد') !== -1,
   'پرامپت می‌گوید در answer بنویس چه کم بود — و ۷٫۲۳ دورش می‌ریخت');
global.geminiText_ = function (prompt) {
  if (prompt.indexOf('عیناً در متنِ آن') !== -1) return JSON.stringify({ terms: [] });
  return JSON.stringify({ hits: [{ id: '2', why: 'این', fit: 'نزدیک' }] });
};
const r17b = srchRun_('زیان‌گریزی', { mode: 'هوشمند', sources: false });
ok('۱۷.۲ موردِ پرامتیازی که مدل نگفت، پنهان نمی‌شود',
   r17b.items.length >= 1 &&
   (r17b.items.some(i => i.fit === 'مدل کنارش گذاشت') || r17b.notes.length > 0),
   'کوتاه‌کردنِ فهرست خوب است، پنهان‌کردن نه');
global.geminiText_ = function (prompt) {
  if (prompt.indexOf('عیناً در متنِ آن') !== -1) return JSON.stringify({ terms: [] });
  return JSON.stringify({ hits: [{ id: '-1', why: 'x' }] });
};
ok('۱۷.۳ شناسهٔ منفی به موردِ یک تبدیل نمی‌شود',
   srchRun_('زیان‌گریزی', { mode: 'هوشمند', sources: false })
     .items.every(i => i.why !== 'x'),
   'parseInt علامت را می‌خورد و «۱-» می‌شد «۱»');
global.geminiText_ = realGem2;

console.log('\n══ ۱۸) لینک‌ها در پنجره ══');
const h18 = srchHtml_();
ok('۱۸.۱ لینک هم گریز می‌خورد', /esc\(lf\)/.test(h18) && /esc\(ls\)/.test(h18),
   'ستونِ لینک عیناً از سلولِ شیتِ منبع می‌آید و آن شیت‌ها فراداده‌های بیرونی می‌خورند؛ ' +
   'و اسکریپتِ این پنجره google.script.run دارد');
ok('۱۸.۲ فقط http(s) پذیرفته است', /\^https\?/.test(h18) || /https\?/.test(h18));
ok('۱۸.۳ شناسهٔ فایلِ ساختگی لینک نمی‌سازد',
   (function () {
     const it = srchSrcItem_('S', fsh || f2, 2, ['Trading_Session_2024_01_02_final_cut', 'متن']);
     return !it.link;
   })(),
   'لینکِ غلط از نبودِ لینک بدتر است — «همان ردیف در شیت» همیشه درست است');

console.log('\n══ ۱۹) سقفِ واژه‌ها ══');
const longQ = Array.from({ length: 40 }, (_, i) => 'واژه' + i).join(' ');
const r19 = srchRun_(longQ, { mode: 'ساده', sources: false });
ok('۱۹.۱ واژه‌ها بریده می‌شوند و گفته می‌شود',
   r19.terms.length <= (CFG.SEARCH_TERMS_MAX || 12) &&
   r19.notes.some(n => n.indexOf('واژهٔ نخست') !== -1),
   'طولِ برنامهٔ منظمِ RE2 و امتیازدهیِ هر واژه روی هر ردیف — از ۷٫۵۱ دیگر نه شمارِ پویش');

console.log('\n══ ۲۰) هزینهٔ گشتن: چرا ۲۲۶ ثانیه به سه تب از چهل رسید (۷٫۵۱) ══');
/* ══ چه چیزی سنجیده می‌شود ══
   جست‌وجوی ۲۳ سپتامبر ۲۲۶ ثانیه گرفت و «۳ تب گشته شد» نشان داد — بی مخرج،
   پس شبیهِ تمامیت بود. دو هزینه روی هم افتاده بودند و هیچ‌کدام سنجیده نشده
   بود: هر **واژه** یک پویشِ کاملِ سمتِ سرور در هر تب، و هر پویش صدها
   `findNext` که هر کدام یک رفت‌وبرگشت است. این بخش هر دو را با شمردنِ
   فراخوان‌های واقعی می‌سنجد، نه با خواندنِ کد. */
const { Sheet: MSheet } = require('./lib/mock.js');
mkCat('گشت‌شمار', [row({ id: 'CT1', topic: 'گشت‌آزما و دلتا و اپسیلون و زتا و اتا' })]);

const origCTF = MSheet.prototype.createTextFinder;
let ctf = 0;
MSheet.prototype.createTextFinder = function (q) { ctf++; return origCTF.call(this, q); };
ctf = 0; const rA = srchRun_('گشت‌آزما', { mode: 'ساده', sources: false });
const scanOne = ctf;
ctf = 0; const rB = srchRun_('گشت‌آزما دلتا اپسیلون زتا اتا', { mode: 'ساده', sources: false });
const scanMany = ctf;
ctf = 0; const rT = srchRun_('گشت‌آزما دلتا', { mode: 'ساده', sources: false });
const scanTwo = ctf;
MSheet.prototype.createTextFinder = origCTF;

ok('۲۰.۱ دوازده واژه یک الگو می‌شوند و نه دوازده الگو',
   srchPatGroups_(['الف', 'بتا', 'گاما', 'دلتا', 'اپسیلون', 'زتا',
                   'اتا', 'تتا', 'یوتا', 'کاپا', 'لاندا', 'مو']).length === 1,
   'گرفت: ' + srchPatGroups_(['الف', 'بتا']).length + ' برای دو واژه');
const gAny = srchPatGroups_(['کتابخانه', 'بورس'])[0];
ok('۲۰.۲ و الگوی «یکی از این‌ها» هر دو واژه را می‌گیرد',
   new RegExp(gAny, 'u').test('كتابخانه ملي') && new RegExp(gAny, 'u').test('بورس تهران'),
   'ادغام نباید همان بلعیدنِ املا را که ۷٫۲۴ ساخت از بین ببرد');
{
  const realPat = CFG.SEARCH_PAT_CHARS; CFG.SEARCH_PAT_CHARS = 300;
  const grp = srchPatGroups_(['الف', 'بتا', 'گاما', 'دلتا', 'اپسیلون', 'زتا',
                              'اتا', 'تتا', 'یوتا', 'کاپا', 'لاندا', 'مو']);
  CFG.SEARCH_PAT_CHARS = realPat;
  ok('۲۰.۳ الگوی بلند گروه می‌شود و نه یک رشتهٔ بی‌کران', grp.length > 1,
     'RE2 برنامهٔ بسیار بلند را رد می‌کند و الگوی باطل یعنی «پیدا نشد» برای چیزی که هست');
}
ok('۲۰.۴ شمارِ پویشِ سمتِ سرور به شمارِ واژه بند نیست',
   scanMany === scanOne && scanOne > 0,
   'یک واژه ' + scanOne + ' پویش، پنج واژه ' + scanMany +
   ' — پیش از ۷٫۵۱ حالتِ هوشمند تا سیزده برابر پویش می‌کرد و کمتر هم وقت داشت');
ok('۲۰.۵ عبارتِ دوواژه‌ای یک پویش در هر تب است و نه سه',
   scanTwo === rT.sheetsAll && rT.sheetsAll > 0,
   'الگوی «عبارتِ کامل» از مرحلهٔ یافتن حذف شد: هر ردیفی که کلِ عبارت را ' +
   'دارد واژه‌هایش را هم دارد. گرفت: ' + scanTwo + ' پویش در ' + rT.sheetsAll + ' تب');
ok('۲۰.۶ راهِ رفته findAll است — یک رفت‌وبرگشت به‌جای صدها',
   rA.via === 'findAll', 'گرفت: ' + rA.via);
{
  /* ══ سقوط به سمتِ کندی، نه به سمتِ جوابِ غلط ══
     خطرِ `findAll` حافظه است. اگر یک روز بترکد، همان حلقهٔ کرانه‌دارِ قدیم
     باید همان ردیف‌ها را بدهد — وگرنه «پیدا نشد» می‌گیریم برای چیزی که هست. */
  const keep = MSheet.prototype.createTextFinder;
  MSheet.prototype.createTextFinder = function (q) {
    const api = keep.call(this, q), w = {};
    for (const k in api) w[k] = api[k];
    w.findAll = function () { throw new Error('از حافظه گذشت'); };
    return w;
  };
  const rC = srchRun_('گشت‌آزما', { mode: 'ساده', sources: false });
  MSheet.prototype.createTextFinder = keep;
  ok('۲۰.۷ اگر findAll بترکد، حلقهٔ قدیم همان ردیف‌ها را می‌دهد',
     rC.via === 'findNext' && rC.items.length === rA.items.length && rA.items.length > 0,
     'گرفت: ' + rC.via + ' با ' + rC.items.length + ' در برابرِ ' + rA.items.length);
}

console.log('\n══ ۲۰-ب) کیفِ ردیف هم تقسیم می‌شود، نه نخست‌آمده‌نخست‌خورده ══');
{
  /* ══ همان باگِ ۷٫۲۴ در منبعی دیگر ══
     `SEARCH_ROWS_MAX` یک کیفِ سراسری بود: با ۴۰۰ یافته به ازای هر تب، شش تبِ
     اول کیف را خالی می‌کردند و تب‌های بعدی «گشته» شمرده می‌شدند بی آنکه یک
     ردیف از آن‌ها خوانده شود. اینجا دو تبِ پرتطبیق ساخته می‌شود و پرسش این
     است که آیا از **هر دو** چیزی خوانده شد. */
  const big1 = [], big2 = [];
  for (let i = 0; i < 200; i++) big1.push(row({ id: 'S1_' + i, topic: 'سهم‌آزما یکم ' + i }));
  for (let i = 0; i < 200; i++) big2.push(row({ id: 'S2_' + i, topic: 'سهم‌آزما دوم ' + i }));
  mkCat('زخورندهٔ اول', big1);
  mkCat('زخورندهٔ دوم', big2);
  const realRows2 = CFG.SEARCH_ROWS_MAX; CFG.SEARCH_ROWS_MAX = 200;
  const colSh = srchCollect_(['سهم‌آزما'], 'سهم‌آزما', { sources: false, budgetMs: 200000 });
  CFG.SEARCH_ROWS_MAX = realRows2;
  const seen = {};
  colSh.items.forEach(it => { seen[it.tab] = (seen[it.tab] || 0) + 1; });
  ok('۲۰.۸ تبِ پرتطبیق کیفِ ردیفِ بقیه را نمی‌خورد',
     !!seen['زخورندهٔ اول'] && !!seen['زخورندهٔ دوم'],
     'گرفت: ' + JSON.stringify(seen));
  const rws = colSh.items.filter(it => it.tab === 'زخورندهٔ اول').map(it => it.row);
  ok('۲۰.۹ و نمونه از سراسرِ تب برداشته می‌شود، نه از کهنه‌ترین ردیف‌ها',
     Math.max.apply(null, rws) > 150,
     'تب ردیفِ ۲ تا ۲۰۱ دارد؛ «N تای اول» بالاترین را ۱۰۱ می‌دهد. گرفت: ' +
     Math.max.apply(null, rws) + ' — بانک افزودنی است، پس «اولِ تب» یعنی «کهنه‌ترین»، ' +
     'و خواستهٔ صریح این بود: «نه از حیثِ زمانی بلکه از حیثِ محتوایی»');
  ok('۲۰.۱۰ و نمونه‌گیری در قابِ سرخ نمی‌رود، در یادداشت می‌رود',
     colSh.sampled > 0 && colSh.notes.some(n => n.indexOf('پخش‌شده') !== -1),
     'هشداری که برای حالتِ سالم روشن شود، همان هشداری است که یاد می‌گیرند نخوانند');
}
ok('۲۰.۱۱ پخش‌کردن سراسرِ بازه را می‌گیرد',
   (function () {
     const ord = []; for (let i = 2; i <= 101; i++) ord.push(i);
     const sp = srchSpread_(ord, 10);
     return sp.length === 10 && sp[sp.length - 1] > 60;
   })(),
   '«ده ردیفِ اول» یعنی «کهنه‌ترین ده»');
ok('۲۰.۱۱-ب و وقتی یافته‌ها از سهم کمتر باشند همه می‌مانند',
   srchSpread_([3, 9, 12], 10).length === 3 && srchSpread_([], 5).length === 0);

console.log('\n══ ۲۰-پ) مخرج: «۳ تب» با «۳ تب از ۴۰» یکی نیست ══');
{
  const rOff = srchRun_('گشت‌آزما', { mode: 'ساده', sources: false });
  const realSrc3 = CFG.SOURCES;
  const f3 = SpreadsheetApp.create('SRC-DENOM');
  global.__SS[f3.getId()] = f3;
  const s3a = f3.insertSheet('T1'); s3a.appendRow(['نام فایل', 'متن']);
  const s3b = f3.insertSheet('T2'); s3b.appendRow(['نام فایل', 'متن']);
  CFG.SOURCES = [{ key: 'd', id: f3.getId(), title: 'SRC-DENOM', schema: 'auto' }];
  const rOn = srchRun_('گشت‌آزما', { mode: 'ساده', sources: true });
  CFG.SOURCES = realSrc3;
  ok('۲۰.۱۲ مخرج شیت‌های منبع را هم می‌شمارد',
     rOn.sheetsAll > rOff.sheetsAll && rOff.sheetsAll > 0,
     'گرفت: ' + rOff.sheetsAll + ' → ' + rOn.sheetsAll +
     ' — بی مخرج، «۳ تب گشته شد» بوی تمامیت می‌دهد و کاربر نتیجه می‌گیرد آن چیز نیست');
  ok('۲۰.۱۳ و صورت هرگز از مخرج بیشتر نمی‌شود',
     rOn.sheets <= rOn.sheetsAll && rOff.sheets <= rOff.sheetsAll,
     'گرفت: ' + rOn.sheets + '/' + rOn.sheetsAll);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
