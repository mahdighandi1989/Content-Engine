/* run_recap_test.js — قسمتِ مرورِ بزرگ (بخشِ ۳۰).
 *
 * خواستهٔ صاحبِ برنامه:
 *
 *   «چون الان بالای ۱۷ قسمت پادکست درس‌نامه تولید شده و مفاهیم سخته، یه
 *    پادکست به صورت استثنا … تا همهٔ مفاهیم قسمت‌های گذشته رو اون یه نفر با
 *    همون لحن و سادگی و مثال‌های بسیار ملموس … بیاد توضیح بده … و این هم در
 *    یوتیوب دقیقاً در جای خودش در اون پلی‌لیست درس‌نامهٔ مربوطه ذخیره بشه و
 *    کپشن و اسمش … همه درست ثبت بشه … متن اعراب‌گذاری بشه و مجدد بررسی بشه
 *    و فولدر داشته باشه در قسمت مربوطه در درایو.»
 *
 * بیشترِ آن خواسته‌ها را این بخش *نمی‌سازد* — تحویلشان می‌دهد به ماشینی که
 * از قبل هست. پس سنجهٔ اصلیِ اینجا این است که تحویل درست انجام شود:
 * `PK.SP_PENDING` روی مرحلهٔ `speak`، پوشه سرِ جایش، و ردیف در تب. اگر آن
 * سه درست باشند، اعراب‌گذاری و بازبینی و موسیقی و ایمیل و یوتیوب همان‌هایی
 * هستند که سی و نه سشنِ آزمونِ دیگر نگهشان می‌دارند.
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
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

// ── فیکسچر: هاب، رجیستری، پوشهٔ مجموعه، جزوه، و n قسمتِ ثبت‌شده ──────────
const hub = new Spread('هاب');
global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
global.getHub_ = () => hub;
const sf = global.__ROOT_FOLDER.createFolder('۰۱ — معرفت‌شناسی');

function setSeries(key, name, folderId) {
  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = key; row[SC.NAME - 1] = name;
  row[SC.FOLDER - 1] = folderId; row[SC.LEVEL - 1] = 'مقدماتی';
  row[SC.CAT - 1] = 'علمی و آموزشی';
  reg.getRange(reg.getLastRow() + 1, 1, 1, SERIES_HEADERS.length).setValues([row]);
}
function addParts(name, n) {
  const sp = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
  for (let i = 0; i < n; i++) {
    const r = new Array(SPECIAL_HEADERS.length).fill('');
    r[0] = i + 1; r[XC.SERIES - 1] = name;
    sp.getRange(sp.getLastRow() + 1, 1, 1, SPECIAL_HEADERS.length).setValues([r]);
  }
}
const BOOK = {
  seriesKey: 'kEp', seriesName: 'معرفت‌شناسی', chapters: [
    { id: 'c1', title: 'مبانی', sections: [
      { id: 's1', title: 'تعریفِ معرفت', body: 'معرفت باورِ صادقِ موجه است. ' .repeat(20) },
      { id: 's2', title: 'باور و صدق', body: 'باور حالتی ذهنی است. '.repeat(20) }] },
    { id: 'c2', title: 'انواعِ علم', sections: [
      { id: 's3', title: 'حضوری و حصولی', body: 'علمِ حضوری بی‌واسطه است. '.repeat(20) }] }
  ], refs: [], episodes: []
};
sf.createFile(Utilities.newBlob(JSON.stringify(BOOK), 'application/json', handoutJsonName_()));
setSeries('kEp', 'معرفت‌شناسی', sf.getId());
addParts('معرفت‌شناسی', 9);

console.log('=== ۱) انتخابِ مجموعه: کف، یک‌بار، و درِ بازگشت ===');
{
  delete global.__PROPS[PK.RECAP_DONE];
  const reg = readSeriesReg_(hub);
  const first = (r) => { const a = recapCandidates_(hub, r, ''); return a.length ? a[0] : null; };
  let p = first(reg);
  ok('۱.۱ مجموعه‌ای با نُه قسمت انتخاب می‌شود', p && p.name === 'معرفت‌شناسی', p && p.name);
  ok('۱.۲ و شمارِ قسمت‌هایش از تب خوانده می‌شود', p.made === 9, String(p.made));

  /* «مروری که چیزی برای مرور ندارد» نباید ساخته شود — و کف هشت است چون با
     سه چهار درس هنوز چیزی برای مرورِ بزرگ نیست. */
  const keep = CFG.RECAP_MIN_PARTS;
  CFG.RECAP_MIN_PARTS = 20;
  ok('۱.۳ زیرِ کف، هیچ', first(reg) === null);
  CFG.RECAP_MIN_PARTS = keep;

  recapMarkDone_('kEp', 12);
  ok('۱.۴ مجموعه‌ای که مرور گرفته، دوباره انتخاب نمی‌شود',
     first(reg) === null);
  /* ولی «یک‌بار‌مصرفِ بی‌درِ بازگشت» شکلی است که این ریپو مدام به آن می‌خورَد
     (۵٫۹۵). اگر مرور بد در بیاید یا مجموعه ده درسِ دیگر بگیرد، باید بشود. */
  ok('۱.۵ ولی درِ بازگشت هست', recapReopen_('kEp') === true &&
     first(reg) !== null);
  ok('۱.۶ و بازکردنِ چیزی که بسته نیست، دروغ نمی‌گوید',
     recapReopen_('نیست') === false);
}

console.log('=== ۲) ورودی: جزوهٔ همان مجموعه، نه هفده پوشه ===');
{
  const t = recapBookText_(BOOK, 100000);
  ok('۲.۱ عنوانِ فصل‌ها می‌آید', t.indexOf('مبانی') !== -1 && t.indexOf('انواعِ علم') !== -1);
  ok('۲.۲ و متنِ بخش‌ها', t.indexOf('علمِ حضوری بی‌واسطه است') !== -1);
  /* سقف باید *همه‌جا* ببُرد، نه فقط ته. فصل‌های اولِ کتاب نباید کلِ جا را
     بخورند، وگرنه درس‌های تازه — همان‌هایی که هنوز جا نیفتاده‌اند — اصلاً
     به پرامپت نمی‌رسند. */
  const cut = recapBookText_(BOOK, 300);
  ok('۲.۳ سقف رعایت می‌شود و بریدگی اعلام می‌شود',
     cut.length < 800 && cut.indexOf('جا نشد') !== -1, String(cut.length));
  ok('۲.۴ متنِ خیلی بلندِ یک بخش هم کوتاه می‌شود',
     recapBookText_({ chapters: [{ title: 'ف', sections: [
       { title: 'ب', body: 'x'.repeat(5000) }] }] }, 100000).length < 1500);
}

console.log('=== ۳) پرامپت: «ملموس» یک قاعده است، نه یک صفت ===');
{
  let sent = '';
  global.__STUB = (url, body) => {
    sent = String(body.contents[0].parts[0].text);
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'مرورِ بزرگ', hook: 'قلاب.',
      sections: [{ heading: 'یک', narration: 'م'.repeat(400), tone: 'خودمانی' },
                 { heading: 'دو', narration: '' },
                 { heading: 'سه', narration: 'ن'.repeat(400) }],
      outro: 'پایان.', summary: 'خ.' }) }] } }] } };
  };
  const ep = recapWrite_(BOOK, 'معرفت‌شناسی');
  ok('۳.۱ نمونه‌های ملموس در پرامپت نام برده شده‌اند',
     sent.indexOf('صفِ نانوایی') !== -1 && sent.indexOf('اجاره‌خانه') !== -1);
  ok('۳.۲ و ضدنمونه هم — «فرض کنید فیلسوفی…»',
     sent.indexOf('فرض کنید فیلسوفی') !== -1);
  ok('۳.۳ «همهٔ مفاهیمِ مهم را پوشش بده»', sent.indexOf('پوشش بده') !== -1);
  ok('۳.۴ ترتیب از ساده به سخت، نه ترتیبِ کتاب',
     sent.indexOf('از ساده به سخت') !== -1);
  ok('۳.۵ و مرزِ «از محتوای درس عدول نکن»', sent.indexOf('عدول نکن') !== -1);
  ok('۳.۶ متنِ جزوه واقعاً داخلِ پرامپت است',
     sent.indexOf('علمِ حضوری بی‌واسطه است') !== -1);

  ok('۳.۷ بخشِ خالی دور انداخته می‌شود', ep && ep.sections.length === 2,
     ep && String(ep.sections.length));
  ok('۳.۸ و قسمت خودش را «مرور» علامت می‌زند', ep.isRecap === true);
  ok('۳.۹ بخش‌ها chunkNos خالی دارند (مکان‌نمای درس جلو نمی‌رود)',
     ep.sections.every(s => (s.chunkNos || []).length === 0));

  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ title: 'x', hook: '', sections: [], outro: '' }) }] } }] } });
  ok('۳.۱۰ پاسخِ بی‌بخش یعنی null، نه یک قسمتِ خالی',
     recapWrite_(BOOK, 'م') === null);
}

console.log('=== ۴) صدا: کلِ قسمت با صدای «آن یک نفر» ===');
{
  /* ══ چرا این بلوک شکلِ عجیبی دارد ══
   * نسخهٔ اولِ recapCast_ کلیدِ `mates` را می‌خواند — کلیدی که روی *پرونده*
   * اصلاً ذخیره نمی‌شود (ensureCast_ آن را هنگام برگرداندن از all.slice(1)
   * می‌سازد). تابع بی‌صدا false می‌داد و مرور با صدای همیشگی خوانده می‌شد.
   * پس نمونهٔ اینجا عمداً *دقیقاً* همان چیزی است که روی پرونده می‌نشیند:
   * {lead, all, genders, note} و نه یک شیءِ ساختگیِ راحت‌تر. */
  const stored = () => ({ __cast: { lead: 'Kore', all: ['Kore', 'Puck', 'Charon'],
                                    genders: ['f', 'm', 'm'], note: '' } });
  const ep = stored();
  ok('۴.۱ همراهِ اول می‌شود گویندهٔ اصلیِ این قسمت',
     recapCast_(ep) === true && ep.__cast.lead === 'Puck', ep.__cast.lead);
  /* گویندهٔ اصلیِ همیشگی حذف نمی‌شود — همراه می‌شود. حذفش یعنی بخش‌هایی که
     نقش‌گزینی به او می‌داد، بی‌صاحب می‌ماندند. */
  ok('۴.۲ و گویندهٔ اصلیِ همیشگی همراه می‌شود، نه حذف',
     ep.__cast.all.length === 3 && ep.__cast.all[1] === 'Kore',
     JSON.stringify(ep.__cast.all));
  ok('۴.۳ جنسیت‌ها با ترتیبِ تازه جابه‌جا می‌شوند',
     ep.__cast.genders.join('') === 'mfm', ep.__cast.genders.join(''));
  /* و آنچه ensureCast_ بعداً از همین پرونده می‌سازد، باید همان باشد —
     وگرنه دو جای کد دو نظرِ متفاوت دربارهٔ گویندهٔ این قسمت دارند. */
  const back = ensureCast_(ep, ENRICH_SHOW_SPECIAL, 1, 'علمی و آموزشی');
  ok('۴.۴ و ensureCast_ هم همان را می‌خوانَد',
     back.lead === 'Puck' && back.mates[0] === 'Kore', JSON.stringify(back));
  ok('۴.۵ با یک صدا، چیزی عوض نمی‌شود',
     recapCast_({ __cast: { lead: 'Kore', all: ['Kore'], genders: ['f'] } }) === false);
  ok('۴.۶ و بی نقش‌گزینی هم', recapCast_({}) === false);
}

console.log('=== ۵) تحویل به ماشینِ درس‌نامه ===');
{
  delete global.__PROPS[PK.RECAP_DONE];
  delete global.__PROPS[PK.SP_PENDING];
  global.__PROPS[PK.SP_EP_NUM] = '17';
  global.__STUB = (url, body) => {
    const t = String(body.contents[0].parts[0].text);
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] } };
    if (t.indexOf('مرورِ بزرگ') === -1 && t.indexOf('پادکستِ آموزشی') === -1) {
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: '{}' }] } }] } };
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'هرچه تا اینجا گفتیم، خیلی ساده', hook: 'یه مرورِ بزرگ.',
      sections: [{ heading: 'معرفت یعنی چه', narration: 'م'.repeat(900), tone: 'خودمانی' },
                 { heading: 'علمِ حضوری', narration: 'ن'.repeat(900), tone: 'خودمانی' }],
      outro: 'تا قسمتِ بعد.', summary: 'مرورِ همهٔ مفاهیم.' }) }] } }] } };
  };
  const un = quiet();
  const r = runRecapEpisode({});
  un();
  ok('۵.۱ ساخته شد', r.ok === true, JSON.stringify(r));
  /* شماره‌اش از همه بالاتر است — و بخشِ ۲۷ جایگاهِ ویدئو را از «چند قسمتِ
     منتشرشده شمارهٔ کمتری دارند» حساب می‌کند، پس مرور خودبه‌خود ته
     پلی‌لیستِ همان مجموعه می‌نشیند. کدِ جایگاهِ ویژه‌ای لازم نیست — و کدِ
     ویژه همان چیزی است که فردا از قلم می‌افتد. */
  ok('۵.۲ شمارهٔ قسمت، بعدیِ درس‌نامه است', r.episode === 18, String(r.episode));

  const st = JSON.parse(global.__PROPS[PK.SP_PENDING]);
  /* این سنجهٔ اصلیِ این بخش است: تحویل روی مرحلهٔ speak. از آنجا به بعد
     اعراب‌گذاری، بازبینیِ ۶٫۲۰، نقش‌گزینی، موسیقی، ادغام، ایمیل، تلگرام و
     بدهیِ یوتیوب همان‌هایی هستند که آزمون‌های دیگر نگهشان می‌دارند. */
  ok('۵.۳ و روی مرحلهٔ «متنِ صوتی» تحویل داده شد (نه enrich، نه explain)',
     st.phase === 'speak', st.phase);

  const folder = DriveApp.getFolderById(st.folderId);
  ok('۵.۴ پوشه‌اش زیرِ پوشهٔ همان مجموعه است',
     folder.getName().indexOf('مرورِ بزرگ') !== -1, folder.getName());
  ok('۵.۵ و نامش شمارهٔ قسمت را دارد', /قسمت 018/.test(folder.getName()), folder.getName());

  const meta = JSON.parse(folder.getFilesByName('_special.json').next()
                                .getBlob().getDataAsString());
  ok('۵.۶ _special.json همان‌جاست و نشانِ مرور دارد',
     meta.recap === true && meta.epNum === 18);
  ok('۵.۷ و مجموعه‌اش را می‌شناسد (پلی‌لیست و جزوه از همین می‌آیند)',
     meta.seriesKey === 'kEp' && meta.seriesName === 'معرفت‌شناسی');
  /* و در مسیرِ واقعی هم واقعاً عوض شده باشد — نه فقط در آزمونِ تکیِ بالا.
     نقش‌گزینیِ عادی همیشه all[0] را گویندهٔ اصلی می‌گذارد؛ اگر lead هنوز
     همان باشد، recapCast_ در عمل کاری نکرده. */
  ok('۵.۸ صدای مرور با گویندهٔ پیش‌فرضِ نقش‌گزینی فرق دارد',
     meta.ep.__cast && meta.ep.__cast.all.length > 1 &&
     meta.ep.__cast.lead === meta.ep.__cast.all[0] &&
     meta.ep.__cast.all[1] !== meta.ep.__cast.lead,
     JSON.stringify(meta.ep.__cast));

  const sp = hub.getSheetByName(CFG.SPECIAL_TAB);
  const last = sp.getRange(sp.getLastRow(), 1, 1, SPECIAL_HEADERS.length).getValues()[0];
  ok('۵.۹ ردیفش در تبِ قسمت‌ها ثبت شد', Number(last[0]) === 18 &&
     String(last[XC.SERIES - 1]) === 'معرفت‌شناسی');
  ok('۵.۱۰ و صریح می‌گوید درسِ تازه نیست',
     String(last[13]).indexOf('مرور است') !== -1, String(last[13]));

  ok('۵.۱۱ مجموعه علامتِ «مرور گرفت» خورد', !!recapDone_()['kEp']);
  const un2 = quiet();
  const again = runRecapEpisode({});
  un2();
  ok('۵.۱۲ و اجرای دوباره، قسمتِ دوم نمی‌سازد', again.ok === false, again.reason);
}

console.log('=== ۶) جزوه: مرور فصلی اضافه نمی‌کند ===');
{
  /* اگر مرور به‌عنوان «قسمت» شمرده شود، تا ابد «واردنشده» می‌مانَد:
     پرکنندهٔ عقب‌ماندگی هر شب صفش می‌کند، مدل چیزی برای افزودن پیدا
     نمی‌کند، و پس از HANDOUT_TRY_MAX «رهاشده» ثبت می‌شود — یک هشدارِ
     دائمی برای کاری که اصلاً قرار نبود انجام شود. */
  const eps = handoutSeriesEpisodes_(sf);
  ok('۶.۱ قسمتِ مرور در فهرستِ قسمت‌های جزوه نیست', !eps['18'], JSON.stringify(Object.keys(eps)));

  const other = sf.createFolder('قسمت 007');
  other.createFile(Utilities.newBlob(JSON.stringify({ epNum: 7, seriesKey: 'kEp' }),
                                     'application/json', '_special.json'));
  ok('۶.۲ ولی قسمتِ عادی هست', !!handoutSeriesEpisodes_(sf)['7']);
}

console.log('=== ۷) کارنامه ===');
{
  const s = recapStatus_();
  ok('۷.۱ سطرِ روزانه ساخته می‌شود و نامِ مجموعه را دارد',
     s.line.indexOf('معرفت‌شناسی') !== -1, s.line);
  ok('۷.۲ عددهایش فارسی‌اند', /[۰-۹]/.test(s.line) && !/\d/.test(s.line), s.line);
  delete global.__PROPS[PK.RECAP_DONE];
  ok('۷.۳ و پیش از هر مروری، خودش را اعلام می‌کند',
     recapStatus_().line.indexOf('هنوز') !== -1, recapStatus_().line);
}

console.log('=== ۸) دو قسمت هم‌زمان، هرگز ===');
{
  global.__PROPS[PK.SP_PENDING] = JSON.stringify({ epNum: 5, phase: 'audio' });
  /* PK.SP_PENDING یک کلید بیشتر نیست: دو قسمتِ هم‌زمان یعنی یکی از آن دو
     نیمه‌کاره رها می‌شود و هیچ خطایی هم نمی‌دهد. */
  ok('۸.۱ وقتی درس‌نامه‌ای در حالِ صداگذاری است، مرور ساخته نمی‌شود',
     runRecapEpisode({ force: true }).reason === 'busy');
  ok('۸.۲ و کارِ شبانه هم همین را می‌گوید', recapNightly_().reason === 'busy');
  delete global.__PROPS[PK.SP_PENDING];
  const keep = CFG.RECAP_ENABLED;
  CFG.RECAP_ENABLED = false;
  ok('۸.۳ خاموشیِ صریح یعنی کارِ شبانه هم کاری نمی‌کند',
     recapNightly_().reason === 'off');
  CFG.RECAP_ENABLED = keep;
}

console.log('=== ۹) مجموعهٔ بی‌جزوه صف را نمی‌بندد ===');
{
  /* ══ چرا این سنجه هست ══
   * نسخهٔ اول فقط «بهترین» نامزد را برمی‌گرداند و اگر آن یکی جزوه نداشت
   * همان‌جا می‌ایستاد. یعنی یک مجموعهٔ بی‌جزوه با بیشترین قسمت، صف را برای
   * همیشه می‌بست: هر شب همان انتخاب می‌شد، هر شب «جزوه ندارد» می‌گرفت، و
   * مجموعه‌ای که آماده بود هرگز نوبت نمی‌گرفت — بی هیچ خطایی. */
  delete global.__PROPS[PK.RECAP_DONE];
  delete global.__PROPS[PK.SP_PENDING];
  const big = global.__ROOT_FOLDER.createFolder('۰۲ — مجموعهٔ بی‌جزوه');
  setSeries('kNoBook', 'بی‌جزوه', big.getId());
  addParts('بی‌جزوه', 30);                       // از «معرفت‌شناسی» پرقسمت‌تر
  const reg = readSeriesReg_(hub);
  const cands = recapCandidates_(hub, reg, '');
  ok('۹.۱ نامزدها مرتب‌اند و بی‌جزوه اولِ صف است',
     cands.length >= 2 && cands[0].name === 'بی‌جزوه', cands.map(c => c.name).join(','));

  global.__PROPS[PK.SP_EP_NUM] = '40';
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: JSON.stringify({ title: 'مرور', hook: 'ه.',
      sections: [{ heading: 'ی', narration: 'م'.repeat(900) }], outro: 'پ.' }) }] } }] } });
  const un = quiet();
  const r = runRecapEpisode({});
  un();
  ok('۹.۲ ولی مروری که ساخته می‌شود مالِ مجموعهٔ آماده است',
     r.ok === true && r.series === 'معرفت‌شناسی', JSON.stringify(r));
  ok('۹.۳ و مجموعهٔ بی‌جزوه علامتِ «انجام شد» نمی‌خورد',
     !recapDone_()['kNoBook']);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
