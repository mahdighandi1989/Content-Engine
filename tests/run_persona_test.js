/* «صداها» — بخشِ ۳۲.
 *
 * چرا آزمونِ سخت‌گیر: خواستهٔ صریحِ صاحبِ برنامه این بود که «همش صدای
 * رضوی نباشه» و «بشه حذف کرد». هر دو خرابیِ ممکن اینجا بی‌صدایند: اگر
 * دروازه نگیرد، هر قسمت با دستورِ او خوانده می‌شود و هیچ خطایی نمی‌آید؛
 * اگر بیش از حد بگیرد، قابلیت هست و هرگز اجرا نمی‌شود — همان شکلی که
 * `sfxAllow_` و `musicWish_` داشتند.
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

const hub = getHub_();
const sh = () => personaTab_(hub);
const rowOf = key => {
  const s = sh(), last = s.getLastRow();
  if (last < 2) return -1;
  const v = s.getRange(2, 1, last - 1, PERSONA_HEADERS.length).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][PC.KEY - 1]) === key) return i + 2;
  return -1;
};
const set = (key, col, val) => sh().getRange(rowOf(key), col).setValue(val);
const get = (key, col) => sh().getRange(rowOf(key), col).getValue();

console.log('\n۱ — بذر: ردیف ساخته می‌شود و **خاموش** است');
ok('بار اول ساخته می‌شود', personaSeed_() === true);
ok('بار دوم دوباره ساخته نمی‌شود', personaSeed_() === false);
ok('ردیفِ رضوی هست', rowOf('razavi') > 1);
// ══ چرا خاموش ══
// روشن بودنِ یک ردیفِ تازه یعنی خوانشِ هر قسمت همان شبِ نصب عوض شود،
// بی آنکه کسی خواسته باشد. «تقویمِ تولید» برعکس است چون خاموشی‌اش
// رفتار را عوض می‌کرد.
ok('و خاموش است', personaOn_(get('razavi', PC.ON)) === false,
   String(get('razavi', PC.ON)));
ok('پس امروز هیچ صدایی انتخاب نمی‌شود',
   personaFor_('از همه جا از همه رنگ', 3) === null);

console.log('\n۲ — روشن که شد، انتخاب می‌شود — و «هر چند قسمت» رعایت می‌شود');
set('razavi', PC.ON, 'بله');
set('razavi', PC.EVERY, 3);
ok('قسمتِ ۳ نوبتِ اوست', !!personaFor_('از همه جا از همه رنگ', 3));
ok('قسمتِ ۴ نه', personaFor_('از همه جا از همه رنگ', 4) === null);
ok('قسمتِ ۶ بله', !!personaFor_('از همه جا از همه رنگ', 6));
// شمارهٔ نامعلوم یعنی نوبتِ نامعلوم — و نامعلوم نباید «بله» باشد.
ok('شمارهٔ صفر نوبت نمی‌گیرد', personaTurn_(3, 0) === false);
ok('«هر ۱ قسمت» یعنی همیشه', personaTurn_(1, 7) === true);
ok('خالی هم یعنی همیشه', personaTurn_('', 7) === true);

console.log('\n۳ — تصمیم در خودِ ردیف نوشته می‌شود');
// این تنها جوابِ صادق به «تنظیمِ من اثر کرد؟» است. نبودِ تصمیم یعنی
// این کد اصلاً اجرا نشده — خبرِ دیگری، و بدتر.
personaFor_('از همه جا از همه رنگ', 3);
ok('انتخاب ثبت شد', String(get('razavi', PC.LAST)).indexOf('انتخاب شد') !== -1,
   String(get('razavi', PC.LAST)));
personaFor_('از همه جا از همه رنگ', 4);
ok('و ردنشدن هم ثبت می‌شود',
   String(get('razavi', PC.LAST)).indexOf('نوبتش نیست') !== -1,
   String(get('razavi', PC.LAST)));
ok('و «آخرین استفاده» فقط وقتی انتخاب شده پر است',
   String(get('razavi', PC.USED)).indexOf('3') !== -1);

console.log('\n۴ — «برنامه‌ها»: نیم‌فاصله نباید ردیف را بی‌صدا از کار بیندازد');
ok('«همه» یعنی همه', personaShowOk_('همه', 'درس‌نامه') === true);
ok('خالی هم یعنی همه', personaShowOk_('', 'درس‌نامه') === true);
ok('نامِ درست می‌خورد', personaShowOk_('درس‌نامه', 'درس‌نامه') === true);
// همان نام، بی نیم‌فاصله — آدم این‌طور می‌نویسد.
ok('«درس نامه» هم می‌خورد', personaShowOk_('درس نامه', 'درس‌نامه') === true);
ok('فهرستِ چندتایی', personaShowOk_('درس‌نامه، از همه جا از همه رنگ',
                                     'از همه جا از همه رنگ') === true);
ok('و برنامهٔ دیگر نمی‌خورد', personaShowOk_('درس‌نامه', 'از همه جا از همه رنگ') === false);
set('razavi', PC.SHOWS, 'درس‌نامه');
ok('پس برنامهٔ متنوع صدای مهمان نمی‌گیرد',
   personaFor_('از همه جا از همه رنگ', 3) === null);
ok('ولی درس‌نامه می‌گیرد', !!personaFor_('درس‌نامه', 3));
set('razavi', PC.SHOWS, 'همه');

console.log('\n۵ — حالت‌ها از روی وایبِ همان بخش');
const p = personaFor_('درس‌نامه', 3);
ok('دو حالت خوانده شد', p.modes.length === 2, JSON.stringify(p.modes.map(m => m.name)));
const m1 = personaModePick_(p.modes, 'سوگ و اندوه');
const m2 = personaModePick_(p.modes, 'روایت تاریخی');
ok('وایبِ سوگ → حالتِ باطمأنینه', m1 && m1.name.indexOf('طمأنینه') !== -1,
   m1 && m1.name);
ok('وایبِ روایت → حالتِ روان', m2 && m2.name.indexOf('روان') !== -1, m2 && m2.name);
// ══ حالتِ تصادفی بدتر از نبودِ حالت است ══
ok('وایبِ ناشناخته هیچ حالتی نمی‌گیرد',
   personaModePick_(p.modes, 'چیزی که در فهرست نیست') === null);
ok('و بی وایب هم همین‌طور', personaModePick_(p.modes, '') === null);
ok('سلولِ خراب کلِ حالت‌ها را باطل نمی‌کند',
   personaModes_('الف | ک | دستور\nخطِ ناقص\nب | ک۲ | دستورِ دوم').length === 2);

console.log('\n۶ — دستور جلوی دستورِ بخش می‌نشیند، نه پشتش');
// `ttsCue_` سرِ ۳۲۰ نویسه می‌بُرد؛ هرچه آخر باشد اول قربانی می‌شود.
const segs = [{ text: 'الف', tone: 'سوگ', style: 'سبکِ بخش' },
              { text: 'ب', tone: 'روایت تاریخی', style: 'سبکِ دیگر' }];
const n = personaApply_(segs, p);
ok('روی هر دو بخش اعمال شد', n === 2);
ok('و اول نشسته', segs[0].style.indexOf('سبکِ بخش') > 10, segs[0].style.slice(0, 40));
ok('سبکِ خودِ بخش پاک نشده', segs[0].style.indexOf('سبکِ بخش') !== -1);
ok('هر بخش حالتِ خودش را گرفت',
   segs[0].style !== segs[1].style);
ok('و متنِ بخش دست نخورده', segs[0].text === 'الف');

console.log('\n۷ — تصمیم یک بار گرفته می‌شود (درسِ musicWrap_)');
// `renderAudioStep_` با هر از سرگیری `buildChunks_` را دوباره می‌سازد.
// اگر انتخاب هر بار از شیت خوانده شود، ویرایشِ وسطِ کار نیمهٔ دومِ قسمت
// را با دستورِ دیگری می‌خوانَد — بی هیچ خطایی، فقط شنیدنی.
const ep = {};
const first = personaEnsure_(ep, 'درس‌نامه', 3);
ok('بارِ اول انتخاب شد', !!first);
set('razavi', PC.ON, 'خیر');            // وسطِ کار خاموشش کن
const again = personaEnsure_(ep, 'درس‌نامه', 3);
ok('بارِ دوم همان تصمیم می‌مانَد', again === first);
ok('و در پروندهٔ قسمت ذخیره شده', ep.__persona === first);
// و «هیچ صدایی» هم یک تصمیم است و باید ذخیره شود.
const ep2 = {};
ok('تصمیمِ «هیچ» هم گرفته می‌شود', personaEnsure_(ep2, 'درس‌نامه', 3) === null);
ok('و ذخیره می‌شود', ep2.__persona === null &&
   typeof ep2.__persona !== 'undefined');
set('razavi', PC.ON, 'بله');

console.log('\n۸ — باز شکست می‌خورد: خواندنِ شیت نباید قسمت را بکشد');
const realHub = getHub_;
global.getHub_ = () => { throw new Error('شیت در دسترس نیست'); };
let fell = null;
try { fell = personaFor_('درس‌نامه', 3); } catch (e) { fell = 'EXCEPTION'; }
global.getHub_ = realHub;
ok('خطا نمی‌دهد و «هیچ صدا» برمی‌گرداند', fell === null, String(fell));

console.log('\n۹ — قلاب‌ها واقعاً در هر دو برنامه هستند');
// قابلیتی که نوشته و آزموده شود ولی صدا زده نشود، سه بار در این مخزن
// اتفاق افتاده. اینجا از خودِ سورس پرسیده می‌شود.
const prod = fs.readFileSync('src/03_Producer.gs', 'utf8');
const spec = fs.readFileSync('src/14_Special.gs', 'utf8');
ok('برنامهٔ متنوع صدا می‌زند', /personaEnsure_\(ep, ENRICH_SHOW_VARIETY/.test(prod));
ok('درس‌نامه صدا می‌زند', /personaEnsure_\(ep, ENRICH_SHOW_SPECIAL/.test(spec));
ok('و هر دو اعمالش می‌کنند',
   /personaApply_\(segs, per\)/.test(prod) && /personaApply_\(segs, perS\)/.test(spec));
// و بذر جایی صدا زده می‌شود، وگرنه تب هرگز ساخته نمی‌شود.
const upd = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
ok('بذر در کارِ شبانه صدا زده می‌شود', /personaSeed_\(\)/.test(upd));

console.log('\n۱۰ — این بخش دربارهٔ رنگِ صدا هیچ ادعایی نمی‌کند');
// Apps Script نمی‌تواند مدلِ تبدیلِ صدا را اجرا کند. ادعای نکرده،
// انتظارِ نساخته.
const s32 = fs.readFileSync('src/32_Persona.gs', 'utf8');
ok('صریح نوشته شده', s32.indexOf('رنگِ صدا') !== -1 &&
   s32.indexOf('تیمبر') !== -1);

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
