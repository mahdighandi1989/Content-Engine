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

console.log('\n══ نامِ فارسیِ برنامه — همان چیزی که پنجره می‌نویسد و تبلیغ می‌کند (۷٫۵۵) ══');
/* ══ چرا سنجه‌های بالا سبز بودند و ایراد باز بود ══
   آن‌ها `personaShowOk_('درس‌نامه', 'درس‌نامه')` صدا می‌زنند — یعنی نام
   در برابرِ نام. ولی موتور در تولید **کلید** می‌فرستد: `personaFor_` و
   `vbrSpeakerPick_` هر دو `'special'`/`'variety'` می‌دهند. پس سنجه
   حالتی را می‌سنجید که سامانهٔ در حالِ اجرا هرگز نمی‌سازد — سومین بارِ
   همین شکل در این هفته (۷٫۴۶، ۷٫۵۲، و حالا این).
   این سنجه‌ها با همان عددهایی کار می‌کنند که تولید می‌فرستد. */
{
  const L = knownShows_();
  const KEY = L.filter(x => x.name === 'درس‌نامه')[0].key;   // 'special'
  ok('نامِ فارسی در برابرِ **کلید** می‌خورد',
     personaShowOk_('درس‌نامه', KEY, KEY) === true,
     'تخته با یک تیک همین را در سلول می‌نویسد؛ بی این، «فقط برای ' +
     'درس‌نامه» یعنی «برای هیچ‌کدام»');
  ok('و نامِ برنامهٔ دیگر نمی‌خورد',
     personaShowOk_('درس‌نامه', 'variety', 'variety') === false);
  ok('کلیدِ لاتین هم مثلِ قبل می‌خورد',
     personaShowOk_(KEY, KEY, KEY) === true);

  /* و همان در ستونِ «قسمت‌های موردی» — شکلی که راهنمای خودِ پنجره
     («مثال: درس‌نامه ۴۷») و پیامِ خطای ذخیره هر دو تبلیغش می‌کنند. */
  ok('«درس‌نامه ۱۸» همان قسمت را می‌گیرد',
     personaOnceHit_('درس‌نامه 18', 'همه', KEY, 'razavi', 18) === true,
     'شکلی که ابزار تبلیغ می‌کند و بی‌صدا کار نکند، بدترین خرابیِ اینجاست');
  ok('ولی قسمتِ دیگرِ همان برنامه را نه',
     personaOnceHit_('درس‌نامه 18', 'همه', KEY, 'razavi', 19) === false);
  ok('و همان شماره در برنامهٔ دیگر را هم نه',
     personaOnceHit_('درس‌نامه 18', 'همه', 'variety', 'razavi', 18) === false,
     'ورودیِ نام‌دار فقط به همان برنامه می‌خورَد');
  ok('۱۸ با ۱۸۰ اشتباه نمی‌شود',
     personaOnceHit_('درس‌نامه 18', 'همه', KEY, 'razavi', 180) === false);

  /* ══ و از **خودِ دروازهٔ پل** بپرس، نه از تابع تنها ══
     ردیفِ واقعیِ ۲۴ سپتامبر: خاموش، هر ۳ قسمت، هر دو برنامه تیک‌خورده،
     و «درس‌نامه 18» در قسمت‌های موردی. */
  const row = [];
  row[PC.KEY - 1] = 'razavi'; row[PC.NAME - 1] = 'بهروز رضوی';
  row[PC.ON - 1] = false; row[PC.SHOWS - 1] = 'همه'; row[PC.EVERY - 1] = 3;
  row[PC.STYLE - 1] = 'آرام و روایی بخوان'; row[PC.MODES - 1] = '';
  row[PC.ONCE - 1] = 'درس‌نامه 18';
  ok('پل برای همان قسمت، همان گوینده را برمی‌دارد',
     vbrSpeakerPick_([row], KEY, 18).key === 'razavi' &&
     vbrSpeakerPick_([row], KEY, 18).why === 'موردی',
     'گرفت: ' + JSON.stringify(vbrSpeakerPick_([row], KEY, 18)));
  ok('و برای قسمت‌های دیگر هیچ‌کس — چون ردیف خاموش است',
     vbrSpeakerPick_([row], KEY, 19).key === '' &&
     vbrSpeakerPick_([row], 'variety', 18).key === '',
     'ردیفِ خاموش نباید ناگهان دائمی شود');
}

/* ══ ۹) شماره‌ای که دیگر نمی‌آید (۷٫۵۸) ══
 *
 * ۲۴ سپتامبر، عیناً: او «درس نامه 18» را در «قسمت‌های موردی» نوشت و
 * پرسید «درست عمل می‌کنه؟ کی تولید می‌کنه؟». خط **درست** خوانده می‌شد،
 * نامِ برنامه **درست** می‌خورد (۷٫۵۵ همین را درست کرده بود)، ذخیره هم
 * می‌شد — و جوابِ «کی؟» **هرگز** بود: پنجاه قسمتِ درس‌نامه ساخته شده.
 *
 * این همان خرابیِ خطِ ناخواناست، یک لایه پایین‌تر: چیزی ذخیره می‌شود که
 * هیچ‌وقت اثر نمی‌کند و او هرگز نمی‌فهمد. پس همان‌طور رد می‌شود.
 *
 * و اینجا از **خودِ مسیرِ ذخیره** پرسیده می‌شود، نه از تابعِ تنها. */
{
  console.log('\n══ ۹) شمارهٔ گذشته ══');
  const P = props_();
  P.setProperty(PK.SP_EP_NUM, '50');
  P.setProperty(PK.EP_NUM, '50');

  ok('۹.۱ شمارندهٔ هر برنامه خوانده می‌شود',
     personaEpCursor_('special').next === 51 &&
     personaEpCursor_('variety').next === 51 &&
     personaEpCursor_('special').cur === 50,
     JSON.stringify(personaEpCursor_('special')));

  /* برنامهٔ ناشناخته «نمی‌دانم» است، نه «گذشته» — وگرنه پادکستِ بعدی که
     اضافه شود، هر تنظیمِ موردی‌اش رد می‌شد. */
  ok('۹.۲ برنامهٔ ناشناخته «نمی‌دانم» می‌دهد',
     personaEpCursor_('podcast-e-jadid').known === false &&
     personaEpCursor_('podcast-e-jadid').next === 0);

  const past = (c) => personaOncePast_(personaOnceParse_(c).items, 'همه');
  ok('۹.۳ «درس نامه 18» گذشته است',
     past('درس نامه 18').past.length === 1 && past('درس نامه 18').live === 0,
     JSON.stringify(past('درس نامه 18').past));
  ok('۹.۴ دامنه‌ای که به آینده می‌رسد، زنده است',
     past('درس نامه 18 تا 60').past.length === 0 && past('درس نامه 18 تا 60').live === 1,
     'بخشی از آن هنوز می‌آید، پس رد کردنش غلط است');
  /* و خطِ **آمیخته** — یکی گذشته، یکی آینده. تنها حالتی که مرزِ
     «فقط وقتی همه‌اش گذشته باشد» را واقعاً می‌سنجد: با «هر گذشته‌ای
     رد شود» این ذخیره شکست می‌خورد و قسمتِ ۶۰ بی‌صدا از دست می‌رفت. */
  const mix = past('درس نامه 18، درس‌نامه ۶۰');
  ok('۹.۴-ب خطِ آمیخته رد نمی‌شود — قسمتِ آینده‌اش نباید قربانی شود',
     mix.past.length === 1 && mix.live === 1,
     JSON.stringify({ past: mix.past.length, live: mix.live }));
  /* مرز عمداً `cur` است نه `next`: قسمتی که همین حالا در جریان است
     شماره‌اش برابرِ شمارنده است و باید بشود برایش تنظیم کرد. */
  ok('۹.۵ قسمتِ در جریان (برابرِ شمارنده) گذشته حساب نمی‌شود',
     past('۵۰').past.length === 0 && past('۴۹').past.length === 1,
     '۵۰ در جریان است، ۴۹ گذشته');

  // ── از خودِ مسیرِ ذخیره ─────────────────────────────────────────
  const K = 'pastcheck';
  const t = personaTab_(hub);
  const rr = new Array(PERSONA_HEADERS.length).fill('');
  rr[PC.KEY - 1] = K; rr[PC.NAME - 1] = 'آزمونِ گذشته';
  rr[PC.ON - 1] = 'خیر'; rr[PC.SHOWS - 1] = 'همه'; rr[PC.EVERY - 1] = 1;
  rr[PC.STYLE - 1] = 'آرام بخوان';
  t.getRange(t.getLastRow() + 1, 1, 1, PERSONA_HEADERS.length).setValues([rr]);

  const save = (once) => personaBoardSave_(K, false, ['درس‌نامه'], 1,
                                           'آرام بخوان', '', once);
  const bad = save('درس نامه 18');
  ok('۹.۶ ذخیره، خطِ سراسر گذشته را رد می‌کند',
     bad.ok === false && /گذشته است/.test(String(bad.why)),
     String(bad.why).slice(0, 90));
  ok('۹.۶-ب و شمارهٔ قسمتِ بعدی را می‌گوید',
     /۵۱/.test(String(bad.why)),
     'رد کردن بدونِ عددِ درست یعنی او باید حدس بزند');
  /* و از **خودِ مسیرِ ذخیره**: خطِ آمیخته باید بگذرد. سنجهٔ ۹.۴-ب تابع را
     می‌سنجد و این دروازه را — و تنها این یکی است که «هر گذشته‌ای رد شود»
     را قرمز می‌کند، چون شرطِ دروازه جای دیگری است. */
  const mixSave = save('درس نامه 18، درس‌نامه ۶۰');
  ok('۹.۶-پ ذخیره، خطِ آمیخته را رد نمی‌کند',
     mixSave.ok === true && mixSave.onceCount === 2,
     JSON.stringify(mixSave.ok ? { onceCount: mixSave.onceCount } : mixSave.why));

  const good = save('درس‌نامه ۵۱');
  ok('۹.۷ و شمارهٔ آینده ذخیره می‌شود',
     good.ok === true && good.onceCount === 1,
     JSON.stringify(good));
  ok('۹.۷-ب و واقعاً در سلول نشست',
     String(get(K, PC.ONCE)).indexOf('۵۱') !== -1,
     String(get(K, PC.ONCE)));

  /* ══ شکِ سنجنده در را نمی‌بندد — مرزِ ۷٫۵۷، یک بخش آن‌طرف‌تر ══
     و راهِ واقعیِ «نمی‌دانم» **برنامهٔ ناشناخته** است، نه خانهٔ پاک‌شده:
     خانهٔ نبوده صفر خوانده می‌شود، یعنی «هنوز چیزی ساخته نشده»، که
     درست است و هیچ شماره‌ای را گذشته نمی‌کند. سنجهٔ پیشینِ من همین دو
     را یکی گرفته بود و راهی می‌رفت که نامش را نمی‌برد. */
  P.deleteProperty(PK.SP_EP_NUM);
  ok('۹.۸ خانهٔ نبوده «صفر» است، نه «نامعلوم»',
     personaEpCursor_('special').known === true &&
     personaEpCursor_('special').cur === 0 &&
     save('درس نامه 18').ok === true,
     'موتورِ نو هنوز چیزی نساخته، پس هیچ شماره‌ای گذشته نیست');
  P.setProperty(PK.SP_EP_NUM, '50');
  /* و برنامه‌ای که شمارنده‌اش را نمی‌شناسیم: هیچ‌چیز رد نمی‌شود، وگرنه
     پادکستِ بعدی که اضافه شود هر تنظیمِ موردی‌اش رد می‌شد. */
  const unk = personaOncePast_(personaOnceParse_('podcast-e-jadid 3').items, 'همه');
  ok('۹.۸-ب برنامهٔ ناشناخته هیچ‌چیز را رد نمی‌کند',
     unk.past.length === 0,
     'شکِ سنجنده در را نمی‌بندد (۷٫۵۷)');

  // ── و تخته خودش عدد را نشان می‌دهد، پیش از نوشتن ──────────────
  const bd = personaBoardData_();
  ok('۹.۹ تخته شمارهٔ قسمتِ بعدی را نشان می‌دهد',
     (bd.nextEp || []).length === 2 && /۵۱/.test(bd.nextEp.join(' ')),
     JSON.stringify(bd.nextEp));
  const htm = String(personaBoardHtml_());
  ok('۹.۹-ب و در خودِ صفحه چاپ می‌شود',
     htm.indexOf('قسمتِ بعدی') !== -1,
     'عددِ درست باید پیش از نوشتن جلوی چشم باشد، نه پس از خطا');
}

/* ══ ۱۰) فهرست به‌جای تایپ (۷٫۵۹) ══
 *
 * خواستهٔ صاحبِ برنامه: «لیستی باشه جای تایپی … قسمت‌هایی که تولید شده رو
 * نشون بده و بتونم هر چند تا که می‌خوام تیک بزنم … و برای درس‌هایی که
 * ساخته نشده بتونم شماره‌ش رو تایپ کنم … و لیست برای هر نوع پادکست جدا
 * باشه».
 *
 * اینجا **اجرا** می‌شود: تب‌ها پر می‌شوند، تخته خوانده می‌شود، ذخیره با
 * تیک‌ها صدا زده می‌شود، و از **خودِ صفِ پل** پرسیده می‌شود چه شد. */
{
  console.log('\n══ ۱۰) فهرستِ قسمت‌های تولیدشده ══');

  // ── تبِ درس‌نامه: چهار قسمت ─────────────────────────────────────
  const spt = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
  const mkSp = (n, t) => {
    const r = new Array(SPECIAL_HEADERS.length).fill('');
    r[XC.NUM - 1] = n; r[XC.AT - 1] = '2026-09-0' + (n % 9 + 1) + ' 05:00';
    r[XC.SERIES - 1] = 'معرفت‌شناسی'; r[XC.TITLE - 1] = t;
    return r;
  };
  spt.getRange(spt.getLastRow() + 1, 1, 4, SPECIAL_HEADERS.length)
     .setValues([mkSp(47, 'درسِ چهل‌وهفت'), mkSp(48, 'درسِ چهل‌وهشت'),
                 mkSp(49, 'درسِ چهل‌ونه'), mkSp(50, 'درسِ پنجاه')]);
  // ── تبِ متنوع: دو قسمت ──────────────────────────────────────────
  const vat = ensureTab_(hub, CFG.TAB_PODCASTS, PODCAST_HEADERS);
  const mkVa = (n, t) => {
    const r = new Array(PODCAST_HEADERS.length).fill('');
    r[0] = n; r[1] = '2026-09-10 07:00'; r[2] = t;
    return r;
  };
  vat.getRange(vat.getLastRow() + 1, 1, 2, PODCAST_HEADERS.length)
     .setValues([mkVa(51, 'قسمتِ پنجاه‌ویک'), mkVa(52, 'قسمتِ پنجاه‌ودو')]);

  // ── پوشه‌ها: همه جز درس‌نامهٔ ۴۸ ─────────────────────────────────
  putOutJson_('_YT-RENDER.json', { updatedAt: '', note: '', items: [
    { key: 'special:47', show: 'special', ep: '47', title: 'درسِ چهل‌وهفت', folderId: 'F47', status: 'رسید' },
    { key: 'special:49', show: 'special', ep: '49', title: 'درسِ چهل‌ونه',  folderId: 'F49', status: 'رسید' },
    { key: 'special:50', show: 'special', ep: '50', title: 'درسِ پنجاه',    folderId: 'F50', status: 'رسید' },
    { key: 'variety:52', show: 'variety', ep: '52', title: 'قسمتِ ۵۲',      folderId: 'V52', status: 'رسید' }
  ] });

  const L = personaEpisodesFor_('special');
  ok('۱۰.۱ قسمت‌های تولیدشده خوانده می‌شوند، تازه‌ترین اول',
     L.total === 4 && L.items[0].ep === 50 && L.items[3].ep === 47,
     L.items.map(x => x.ep).join('،'));
  ok('۱۰.۲ عنوان و مجموعه با هم می‌آیند',
     /معرفت‌شناسی/.test(L.items[0].title) && /پنجاه/.test(L.items[0].title),
     L.items[0].title);

  /* قسمتی که پوشه‌اش شناخته نیست **پنهان نمی‌شود** — نشان داده می‌شود و
     تیک نمی‌خورد. پنهان کردنش یعنی او فکر کند آن قسمت وجود ندارد. */
  const e48 = L.items.filter(x => x.ep === 48)[0];
  ok('۱۰.۳ قسمتِ بی‌پوشه نشان داده می‌شود ولی تیک‌خور نیست',
     !!e48 && e48.can === false && L.noFolder === 1,
     'can=' + (e48 && e48.can) + ' · بی‌پوشه: ' + L.noFolder);
  ok('۱۰.۴ و بقیه تیک‌خورند',
     L.items.filter(x => x.ep !== 48).every(x => x.can === true));

  // ── فهرست برای هر برنامه **جدا** ───────────────────────────────
  const K2 = 'lister';
  const t2 = personaTab_(hub);
  const r2 = new Array(PERSONA_HEADERS.length).fill('');
  r2[PC.KEY - 1] = K2; r2[PC.NAME - 1] = 'گویندهٔ فهرست';
  r2[PC.ON - 1] = 'خیر'; r2[PC.SHOWS - 1] = 'همه'; r2[PC.EVERY - 1] = 1;
  r2[PC.STYLE - 1] = 'آرام بخوان';
  t2.getRange(t2.getLastRow() + 1, 1, 1, PERSONA_HEADERS.length).setValues([r2]);

  const D = personaBoardData_();
  ok('۱۰.۵ فهرست برای هر برنامه جداست',
     (D.eps || []).length === 2 &&
     D.eps.filter(g => g.key === 'special')[0].items.length === 4 &&
     D.eps.filter(g => g.key === 'variety')[0].items.length === 2,
     JSON.stringify(D.eps.map(g => g.key + ':' + g.items.length)));

  // ── ذخیره با تیک: پراکنده، نه پشتِ‌هم ──────────────────────────
  const sv = personaBoardSave_(K2, false, ['درس‌نامه'], 1, 'آرام بخوان', '', '',
                               ['special:47', 'special:50']);
  ok('۱۰.۶ تیک‌های پراکنده ذخیره می‌شوند',
     sv.ok === true && sv.pickCount === 2, JSON.stringify(sv.picks));
  ok('۱۰.۶-ب و در سلول به زبانِ آدم نوشته می‌شود',
     /درس‌نامه ۴۷/.test(String(get(K2, PC.PICK))) &&
     /درس‌نامه ۵۰/.test(String(get(K2, PC.PICK))),
     String(get(K2, PC.PICK)));

  /* `undefined` یعنی «تخته نفرستاد» و باید دست نخورد؛ آرایهٔ خالی یعنی
     «هیچ تیکی نیست» و باید پاک کند. یکی گرفتنشان یعنی هر ذخیره‌ای از هر
     جای دیگر، انتخاب‌های او را بی‌صدا پاک می‌کرد. */
  personaBoardSave_(K2, false, ['درس‌نامه'], 1, 'آرام بخوان', '', '');
  ok('۱۰.۷ ذخیرهٔ بی‌تیک (نسخهٔ کهنه) انتخاب‌ها را پاک نمی‌کند',
     /درس‌نامه ۴۷/.test(String(get(K2, PC.PICK))),
     String(get(K2, PC.PICK)));
  personaBoardSave_(K2, false, ['درس‌نامه'], 1, 'آرام بخوان', '', '', []);
  ok('۱۰.۷-ب ولی آرایهٔ خالی یعنی «هیچ‌کدام» و پاک می‌کند',
     String(get(K2, PC.PICK)).trim() === '', JSON.stringify(get(K2, PC.PICK)));

  /* تیک‌ها **واقعاً وارد صفِ پل می‌شوند** — ولی آن سنجه آنجاست که مدل و
     پوشهٔ قسمت هست: `run_bridge_voice_test.js` §۱۸. اینجا صدا زدنش فقط
     «مدلی نیست» می‌داد، یعنی راهی جز آنچه نامش را می‌برد. */
  personaBoardSave_(K2, false, ['درس‌نامه'], 1, 'آرام بخوان', '', '',
                    ['special:47', 'special:48']);

  // ── تیک‌ها به ازای هر گوینده‌اند، نه سراسری ─────────────────────
  const K3 = 'lister2';
  const r3 = new Array(PERSONA_HEADERS.length).fill('');
  r3[PC.KEY - 1] = K3; r3[PC.NAME - 1] = 'گویندهٔ دوم';
  r3[PC.ON - 1] = 'خیر'; r3[PC.SHOWS - 1] = 'همه'; r3[PC.EVERY - 1] = 1;
  r3[PC.STYLE - 1] = 'تند بخوان';
  t2.getRange(t2.getLastRow() + 1, 1, 1, PERSONA_HEADERS.length).setValues([r3]);
  const D2 = personaBoardData_();
  const rowA = D2.rows.filter(x => x.key === K2)[0];
  const rowB = D2.rows.filter(x => x.key === K3)[0];
  ok('۱۰.۹ تیکِ یک گوینده روی گویندهٔ دیگر دیده نمی‌شود',
     (rowA.pickSet || []).length === 2 && (rowB.pickSet || []).length === 0,
     JSON.stringify({ a: rowA.pickSet, b: rowB.pickSet }));

  // ── و خودِ پنجره: جعبه‌ها و فرستادنشان ──────────────────────────
  const htm2 = String(personaBoardHtml_());
  ok('۱۰.۱۰ پنجره جعبهٔ تیک دارد',
     htm2.indexOf('type=\'checkbox\' class=\'pk') !== -1 ||
     htm2.indexOf('class=\\\'pk') !== -1,
     'وگرنه فهرستی نیست که تیک بخورد');
  /* آرگومان‌ها خودشان پرانتز دارند (`getElementById(...)`)، پس الگویی که
     تا نخستین پرانتزِ بسته بخوانَد چیزی را نمی‌سنجد. از خودِ **پایانِ
     فراخوان** پرسیده می‌شود. */
  const callAt = htm2.indexOf('personaBoardSave(r.key');
  ok('۱۰.۱۰-ب و ذخیره تیک‌ها را هم می‌فرستد',
     callAt !== -1 && htm2.slice(callAt, callAt + 400).indexOf(',picks);') !== -1,
     'آرگومانِ جاافتاده یعنی دکمه بی‌صدا هیچ نمی‌کند (۷٫۴۱)');
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
