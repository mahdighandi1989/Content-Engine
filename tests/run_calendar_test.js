/* تقویمِ تولید (بخشِ ۲۵).
 *
 * چرا آزمونِ سخت‌گیر: این تنها جایی است که صاحبِ برنامه می‌تواند تولید را
 * متوقف کند. اگر خاموشی کار نکند، قسمت ساخته و منتشر می‌شود در روزی که
 * نباید — و اگر برعکس، دروازه اشتباهی ببندد، پادکست بی‌صدا قطع می‌شود و
 * هیچ خطایی هم نمی‌آید. هر دو سمت اینجا سنجیده می‌شوند.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

const hub = getHub_();
const sh = () => calTab_(hub);
const rowOf = key => {
  const s = sh(), last = s.getLastRow();
  const v = s.getRange(2, 1, last - 1, CAL_HEADERS.length).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][CC.KEY - 1]) === key) return i + 2;
  return -1;
};
const setCell = (key, col, val) => sh().getRange(rowOf(key), col).setValue(val);
const today = calToday_();

console.log('=== ۱) ردیف خودبه‌خود ساخته می‌شود ===');
{
  const g = calGate_('variety', 'از همه جا از همه رنگ');
  ok('۱.۱ برنامهٔ تازه به‌طور پیش‌فرض روشن است', g.ok === true, g.why);
  ok('۱.۲ ردیفش در تب ساخته شد', rowOf('variety') > 0);
  const v = sh().getRange(rowOf('variety'), 1, 1, CAL_HEADERS.length).getValues()[0];
  ok('۱.۳ پیش‌فرض: فعال و همهٔ روزها',
     String(v[CC.ON - 1]) === 'بله' && String(v[CC.DAYS - 1]) === 'همه');
  ok('۱.۴ و تصمیم در همان ردیف نوشته شد — این تنها راهِ اطمینان است',
     String(v[CC.LAST - 1]).indexOf('ساخته شد') !== -1, String(v[CC.LAST - 1]));
}

console.log('=== ۲) توقفِ موقت ===');
{
  setCell('variety', CC.ON, 'خیر');
  const g = calGate_('variety', 'از همه جا از همه رنگ');
  ok('۲.۱ «خیر» جلوی تولید را می‌گیرد', g.ok === false, g.why);
  ok('۲.۲ و دلیلش نوشته می‌شود', g.why.indexOf('فعال') !== -1, g.why);
  const v = sh().getRange(rowOf('variety'), CC.LAST).getValue();
  ok('۲.۳ در تب هم ثبت شد', String(v).indexOf('تعطیل') !== -1, String(v));

  setCell('variety', CC.ON, 'بله');
  ok('۲.۴ و با «بله» دوباره از سر گرفته می‌شود',
     calGate_('variety', 'ب').ok === true);
  // املاهای گوناگون
  for (const no of ['خاموش', 'no', 'FALSE', 'تعطیل', '0']) {
    setCell('variety', CC.ON, no);
    ok('۲ «' + no + '» هم یعنی خاموش', calGate_('variety', 'ب').ok === false);
  }
  setCell('variety', CC.ON, 'بله');
}

console.log('=== ۳) روزهای هفته ===');
{
  setCell('variety', CC.DAYS, today.weekday);
  ok('۳.۱ روزِ امروز در فهرست باشد → ساخته می‌شود',
     calGate_('variety', 'ب').ok === true);
  const other = FA_WEEKDAYS.filter(d => d !== today.weekday)[0];
  setCell('variety', CC.DAYS, other);
  const g = calGate_('variety', 'ب');
  ok('۳.۲ نباشد → تعطیل', g.ok === false, g.why);
  ok('۳.۳ و دلیل نامِ روز را می‌گوید', g.why.indexOf(today.weekday) !== -1, g.why);
  setCell('variety', CC.DAYS, 'همه');
  ok('۳.۴ «همه» یعنی هر روز', calGate_('variety', 'ب').ok === true);
  setCell('variety', CC.DAYS, '');
  ok('۳.۵ خالی هم یعنی هر روز — پیش‌فرضِ امن', calGate_('variety', 'ب').ok === true);
  setCell('variety', CC.DAYS, 'همه');
}

console.log('=== ۴) استثنا برای یک بازه ===');
{
  const j = today.j, jy = Math.floor(j / 10000), jm = Math.floor(j / 100) % 100, jd = j % 100;
  const fa = (y, m, d) => y + '/' + m + '/' + d;
  // بازه‌ای که امروز داخلش است
  setCell('variety', CC.EXC, fa(jy, jm, Math.max(1, jd - 1)) + ' تا ' + fa(jy, jm, jd + 1) + ' = تعطیل');
  const g = calGate_('variety', 'ب');
  ok('۴.۱ بازهٔ شمسی امروز را تعطیل می‌کند', g.ok === false, g.why);
  ok('۴.۲ و متنِ خودِ استثنا در دلیل می‌آید', g.why.indexOf('تا') !== -1, g.why);

  // بازه‌ای که امروز بیرونش است
  setCell('variety', CC.EXC, fa(jy, jm, jd) + ' تا ' + fa(jy, jm, jd) + ' = تعطیل');
  ok('۴.۳ یک روزِ تکی هم کار می‌کند', calGate_('variety', 'ب').ok === false);
  setCell('variety', CC.EXC, fa(jy - 1, 1, 1) + ' تا ' + fa(jy - 1, 1, 5) + ' = تعطیل');
  ok('۴.۴ بازهٔ گذشته اثری ندارد', calGate_('variety', 'ب').ok === true);

  // میلادی
  const g2 = today.g, gy = Math.floor(g2 / 10000), gm = Math.floor(g2 / 100) % 100, gd = g2 % 100;
  setCell('variety', CC.EXC, gy + '-' + gm + '-' + gd + ' = تعطیل');
  ok('۴.۵ تاریخِ میلادی هم پذیرفته است', calGate_('variety', 'ب').ok === false);

  // رقمِ فارسی
  setCell('variety', CC.EXC, faDigitsOut_(jy) + '/' + faDigitsOut_(jm) + '/' + faDigitsOut_(jd) + ' = تعطیل');
  ok('۴.۶ رقمِ فارسی هم خوانده می‌شود', calGate_('variety', 'ب').ok === false);
}

console.log('=== ۵) استثنای استثنا ===');
{
  const j = today.j, jy = Math.floor(j / 10000), jm = Math.floor(j / 100) % 100, jd = j % 100;
  const fa = (y, m, d) => y + '/' + m + '/' + d;
  // یک بازهٔ بلندِ تعطیل، و وسطش یک روزِ فعال. بی این، بازهٔ بلند هیچ راهِ
  // فرار نداشت و برای یک روز باید کلِ استثنا پاک می‌شد.
  setCell('variety', CC.EXC,
    fa(jy, jm, 1) + ' تا ' + fa(jy, jm, 29) + ' = تعطیل\n' + fa(jy, jm, jd) + ' = فعال');
  const g = calGate_('variety', 'ب');
  ok('۵.۱ «فعال» بر «تعطیل» مقدم است', g.ok === true, g.why);
  ok('۵.۲ و در تصمیم هم پیداست', g.why.indexOf('استثنای فعال') !== -1, g.why);

  // و «فعال» حتی روزِ هفته را هم دور می‌زند
  setCell('variety', CC.DAYS, FA_WEEKDAYS.filter(d => d !== today.weekday)[0]);
  ok('۵.۳ استثنای فعال، محدودیتِ روزِ هفته را هم دور می‌زند',
     calGate_('variety', 'ب').ok === true);
  setCell('variety', CC.DAYS, 'همه');
  setCell('variety', CC.EXC, '');
}

console.log('=== ۶) هر پادکستِ آینده ===');
{
  // هیچ‌جای بخشِ ۲۵ فهرستی از برنامه‌ها نیست. یک کلیدِ ناشناخته باید همان‌قدر
  // کار کند که variety می‌کند — وگرنه ادعای «برنامه‌های بعدی» توخالی است.
  const g = calGate_('podcast-tazeh', 'برنامهٔ تازه');
  ok('۶.۱ برنامهٔ ناشناخته پیش‌فرضِ روشن می‌گیرد', g.ok === true);
  ok('۶.۲ و ردیفِ خودش را دارد', rowOf('podcast-tazeh') > 0);
  setCell('podcast-tazeh', CC.ON, 'خیر');
  ok('۶.۳ و مستقل خاموش می‌شود',
     calGate_('podcast-tazeh', 'برنامهٔ تازه').ok === false &&
     calGate_('variety', 'ب').ok === true);
}

console.log('=== ۷) مرزهایی که نباید شکسته شوند ===');
{
  const p3 = fs.readFileSync('src/03_Producer.gs', 'utf8');
  const p14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  const p5 = fs.readFileSync('src/05_Setup.gs', 'utf8');

  ok('۷.۱ دروازه در تولیدِ «از همه جا» هست', /calGate_\(ENRICH_SHOW_VARIETY/.test(p3));
  ok('۷.۲ و در درس‌نامه', /calGate_\(ENRICH_SHOW_SPECIAL/.test(p14));
  ok('۷.۳ فقط وقتی manual نیست', /if \(!opt\.manual\)[\s\S]{0,400}calGate_\(ENRICH_SHOW_VARIETY/.test(p3));
  ok('۷.۴ اجرای دستیِ منو با manual صدا زده می‌شود',
     /produceEpisode\(\{ manual: true \}\)/.test(p5) &&
     /produceSpecialEpisode\(\{ manual: true \}\)/.test(p5));
  // ادامهٔ کارِ نیمه‌تمام هرگز نباید از دروازه رد شود
  ok('۷.۵ ادامهٔ صداگذاری از دروازه رد نمی‌شود',
     /function produceEpisodeContinue\(\)\s*\{\s*return renderAudioStep_\(\);/.test(p3));
  ok('۷.۶ اگر تقویم بترکد، تولید ادامه می‌یابد — سکوتِ ناخواسته بدتر است',
     /catch \(eCal\)[\s\S]{0,120}logLine_/.test(p3));
}

console.log('=== ۸) دیده‌شدن در وضعیت ===');
{
  const st = calStatus_();
  ok('۸.۱ همهٔ برنامه‌ها در وضعیت می‌آیند', st.shows.length >= 2);
  const v = st.shows.filter(s => s.key === 'variety')[0];
  ok('۸.۲ با آخرین تصمیمشان', !!v && v.last.length > 0, v && v.last);
  const p8 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۸.۳ و کلیدِ calendar در _STATUS.json هست', /calendar:.*calStatus_\(\)/.test(p8));
}

console.log('=== ۹) تقویم از داخلِ تختهٔ مجموعه‌ها ===');
{
  /* خواستهٔ صاحبِ برنامه: تقویم باید ذیلِ همان جایی باشد که مجموعه‌ها را
   * مدیریت می‌کند، نه گزینه‌ای جدا در منو.
   *
   * و نگرانیِ صریحش: «نکنه از ظاهر فکر کنم درسته ولی پر از باگ باشه».
   * پس اینجا *رفتار* سنجیده می‌شود نه ظاهر: پس از هر ذخیره، خودِ دروازه —
   * همان calGate_ که سنجه‌های بالا داشت — پرسیده می‌شود.
   */
  const hubSS = getHub_();
  const oldT = hubSS.getSheetByName(CFG.CAL_TAB);
  if (oldT) hubSS.deleteSheet(oldT);

  const d0 = calBoardData_();
  ok('۹.۱ تخته همان بار اول ردیفِ هر دو برنامه را می‌سازد',
     d0.shows.length === 2, JSON.stringify(d0.shows.map(s => s.key)));
  ok('۹.۲ و پیش‌فرض: روشن، با هر هفت روز تیک‌خورده',
     d0.shows.every(s => s.on === true && s.allDays === true &&
                    s.days.length === 7 && s.days.every(Boolean)),
     JSON.stringify(d0.shows[0]));

  const k = d0.shows[0].key, nm = d0.shows[0].name;
  const ALL = FA_WEEKDAYS.map(() => true);

  calBoardSave_(k, false, ALL, '');
  ok('۹.۳ خاموش‌کردن از تخته، دروازه را می‌بندد',
     calGate_(k, nm).ok === false, calGate_(k, nm).why);
  ok('۹.۴ و برنامهٔ دیگر دست‌نخورده می‌ماند',
     calGate_(d0.shows[1].key, d0.shows[1].name).ok === true);

  calBoardSave_(k, true, ALL, '');
  ok('۹.۵ روشن‌کردن دوباره، از سر می‌گیرد', calGate_(k, nm).ok === true);
  ok('۹.۶ و هفت تیک به «همه» تبدیل می‌شود، نه فهرستِ هفت‌تایی',
     calBoardData_().shows.filter(s => s.key === k)[0].allDays === true);

  const today = calToday_();
  const idx = FA_WEEKDAYS.indexOf(today.weekday);
  calBoardSave_(k, true, FA_WEEKDAYS.map((_, i) => i === idx), '');
  ok('۹.۷ فقط روزِ امروز تیک بخورد → ساخته می‌شود', calGate_(k, nm).ok === true);
  const not = FA_WEEKDAYS.map((_, i) => i !== idx);
  calBoardSave_(k, true, not, '');
  const g = calGate_(k, nm);
  ok('۹.۸ امروز تیک نخورده باشد → تعطیل', g.ok === false, g.why);
  ok('۹.۹ و تیک‌ها همان‌طور که ذخیره شده‌اند برمی‌گردند — نه بیشتر نه کمتر',
     JSON.stringify(calBoardData_().shows.filter(s => s.key === k)[0].days) ===
     JSON.stringify(not));

  // مرزی که مبهم بود: هیچ روزی تیک نخورده
  const r0 = calBoardSave_(k, true, FA_WEEKDAYS.map(() => false), '');
  ok('۹.۱۰ «روشن ولی هیچ روزی» صریحاً به خاموش تبدیل می‌شود',
     r0.on === false && /خاموش/.test(r0.note), JSON.stringify(r0));
  ok('۹.۱۱ و دروازه هم همان را می‌گوید', calGate_(k, nm).ok === false);

  // استثناها از همان کادر
  const jy = Math.floor(today.j / 10000), jm = Math.floor(today.j / 100) % 100,
        jd = today.j % 100;
  calBoardSave_(k, true, ALL, jy + '/' + jm + '/' + jd + ' = تعطیل');
  ok('۹.۱۲ استثنای امروز از کادرِ تخته اثر می‌گذارد', calGate_(k, nm).ok === false);
  ok('۹.۱۳ و متنش سالم برمی‌گردد',
     calBoardData_().shows.filter(s => s.key === k)[0].exceptions.indexOf('تعطیل') !== -1);
  calBoardSave_(k, true, ALL, '');
  ok('۹.۱۴ و برداشتنش هم اثر می‌گذارد', calGate_(k, nm).ok === true);

  // پادکستِ آینده هنوز خودبه‌خود می‌آید
  calGate_('podcast-1407', 'برنامهٔ ۱۴۰۷');
  ok('۹.۱۵ برنامهٔ ناشناخته خودش در تخته پیدا می‌شود',
     calBoardData_().shows.filter(s => s.key === 'podcast-1407').length === 1);

  // و پوستهٔ تخته
  const u = uiCalSave(k, false, ALL, '');
  ok('۹.۱۶ uiCalSave پیامِ خواندنی می‌دهد', u.ok === true && /متوقف/.test(u.message),
     u.message);
  ok('۹.۱۷ و واقعاً اثر گذاشته', calGate_(k, nm).ok === false);
  const bad = uiCalSave(null, true, null, null);
  ok('۹.۱۸ ورودیِ خراب پنجره را نمی‌ترکاند', bad && typeof bad.ok === 'boolean',
     JSON.stringify(bad));
  uiCalSave(k, true, ALL, '');
  ok('۹.۱۹ و در پایان همه‌چیز به حالِ سالم برگشت', calGate_(k, nm).ok === true);
}

console.log('\n══ ۸) روزی یک قسمتِ تازه — و تلاشِ دوباره‌ای که بی‌حافظه بود ══');
/* ══ ۲۳ سپتامبر، دو قسمتِ «از همه جا از همه رنگ» ══
   ۴۹ ساعتِ ۰۷:۲۱ تمام شد و ۰۷:۲۳ قسمتِ ۵۰ از نو نوشته شد — و قسمتِ دوم
   **بی غنی‌سازی** بود (مهلتش نبود)، ۵:۲۵ در برابرِ ۱۰:۲۷.

   علت: `produceEpisodeRetry` هیچ حافظه‌ای ندارد. قفل که گرفته بود یک
   تلاشِ دوباره زمان‌بندی شد؛ تا آن تلاش رسید `PK.PENDING` خالی بود، و
   خالی بودنِ آن برای `produceEpisode` یعنی «قسمتِ تازه بساز».

   این سنجه‌ها **اجرا** می‌کنند، نه اینکه متن را بخوانند. */
{
  const P = global.__PROPS;
  const clearMade = () => {
    for (const k of Object.keys(P)) {
      if (k.indexOf(PK.EP_MADE_DAY) === 0) delete P[k];
    }
  };
  clearMade();
  ok('۸.۱ روزِ خالی یعنی هنوز ساخته نشده',
     epMadeToday_(ENRICH_SHOW_VARIETY) === false);

  epMarkMade_(ENRICH_SHOW_VARIETY);
  ok('۸.۲ پس از مُهر، همان برنامه «امروز ساخته شده» است',
     epMadeToday_(ENRICH_SHOW_VARIETY) === true);
  ok('۸.۳ ولی برنامهٔ دیگر دست‌نخورده می‌مانَد',
     epMadeToday_(ENRICH_SHOW_SPECIAL) === false,
     'وگرنه یک مُهر هر دو پادکست را می‌خواباند');

  /* ══ ۸.۳-ب — جهتی که ۷٫۴۴ نسنجید و ۲۴ سپتامبر هزینه‌اش را داد ══
     سنجهٔ ۸.۳ می‌پرسید «آیا مُهرِ یکی، دیگری را هم خوابانده؟» — یعنی
     مثبتِ کاذب. زیانِ واقعی **منفیِ کاذب** بود: مُهرِ دومی، مُهرِ اولی
     را پاک می‌کرد، چون هر دو در یک ویژگی می‌نشستند. ترتیبِ تریگرها
     (۰۴:۰۰ و ۰۵:۰۰) یعنی تا ساعتِ هفت خانه `special|…` بود، و آن صبح
     «از همه جا از همه رنگ» دو قسمت داد: ۵۱ در ۰۷:۱۵ و ۵۲ در ۰۷:۵۲.
     سنجهٔ کهنه سبز بود — **یک ادعا می‌تواند خوانشِ غلط را به همان
     محکمی قفل کند که خوانشِ درست را** (۷٫۴۶). */
  epMarkMade_(ENRICH_SHOW_SPECIAL);
  ok('۸.۳-ب و مُهرِ برنامهٔ دوم، مُهرِ اولی را پاک نمی‌کند',
     epMadeToday_(ENRICH_SHOW_VARIETY) === true &&
     epMadeToday_(ENRICH_SHOW_SPECIAL) === true,
     'مُهری که دو برنامه در آن شریک باشند، مُهرِ هیچ‌کدام نیست (۵٫۹۶)');

  /* مُهرِ دیروز نباید امروز را ببندد. */
  clearMade();
  P[PK.EP_MADE_DAY + '_' + ENRICH_SHOW_VARIETY] = ENRICH_SHOW_VARIETY + '|2000-01-01';
  ok('۸.۴ مُهرِ روزِ دیگر امروز را نمی‌بندد',
     epMadeToday_(ENRICH_SHOW_VARIETY) === false);

  /* و حالا از **خودِ دروازه** بپرس. */
  delete P[PK.PENDING];
  epMarkMade_(ENRICH_SHOW_VARIETY);
  const r = produceEpisode();
  ok('۸.۵ مسیرِ خودکار قسمتِ دومِ امروز را نمی‌سازد',
     r && r.ok === false && r.reason === 'already-today',
     'گرفت: ' + JSON.stringify(r));

  /* ۸.۵-ب همان، ولی پس از آنکه درس‌نامه هم مُهر زده — یعنی دقیقاً
     وضعیتِ ساعتِ هفتِ صبح. این سنجه است که ۲۴ سپتامبر را می‌گرفت. */
  delete P[PK.PENDING];
  epMarkMade_(ENRICH_SHOW_SPECIAL);
  const r2 = produceEpisode();
  ok('۸.۵-ب و پس از مُهرِ درس‌نامه هم همچنان نمی‌سازد',
     r2 && r2.ok === false && r2.reason === 'already-today',
     'گرفت: ' + JSON.stringify(r2 && r2.reason) +
     ' — این همان حالتی است که صبحِ ۲۴ سپتامبر دو قسمت ساخت');

  /* و درِ صاحبِ برنامه باز می‌مانَد — همان قاعدهٔ `calGate_`. */
  const rm = produceEpisode({ manual: true });
  ok('۸.۶ ولی اجرای دستی از این نگهبان رد می‌شود',
     !(rm && rm.reason === 'already-today'),
     'گرفت: ' + JSON.stringify(rm && rm.reason));

  /* ══ ۸.۸ — خانهٔ مشترکِ کدِ قبلی، در روزِ نصب ══
     موتور می‌تواند وسطِ روز نصب شود (۷٫۴۶ ساعتِ ۰۹:۴۳). برنامه‌ای که
     همان روز و با کدِ قبلی مُهر خورده، خانهٔ تازه‌اش خالی است. */
  clearMade();
  const today8 = String(nowStr_()).slice(0, 10);
  P[PK.EP_MADE_DAY] = ENRICH_SHOW_SPECIAL + '|' + today8;
  ok('۸.۸ مُهرِ خانهٔ مشترکِ کدِ قبلی همچنان شمرده می‌شود',
     epMadeToday_(ENRICH_SHOW_SPECIAL) === true);
  ok('۸.۸-ب ولی فقط برای برنامهٔ خودش',
     epMadeToday_(ENRICH_SHOW_VARIETY) === false,
     'مقدارِ یک برنامه نباید برای برنامهٔ دیگر «ساخته شده» معنی بدهد');
  epMarkMade_(ENRICH_SHOW_VARIETY);
  ok('۸.۸-پ و خانهٔ مشترک پاک نمی‌شود — وگرنه مُهرِ آن یکی می‌رود',
     epMadeToday_(ENRICH_SHOW_SPECIAL) === true &&
     epMadeToday_(ENRICH_SHOW_VARIETY) === true,
     'همان سوراخ، از درِ دیگر');
  clearMade();
  delete P[PK.EP_MADE_DAY];
}
/* و قرینه‌اش در درس‌نامه — باگی که در یکی از دو قرینه پیدا شود، در هر دو
   درست می‌شود (۵٫۹۵). این سنجه از متن می‌پرسد چون اجرای کاملِ درس‌نامه
   مجموعه و مکان‌نما می‌خواهد؛ ولی خودِ `epMadeToday_` بالا اجرا شد. */
ok('۸.۷ درس‌نامه هم همین نگهبان را دارد',
   /epMadeToday_\(ENRICH_SHOW_SPECIAL\)/.test(
     fs.readFileSync('src/14_Special.gs', 'utf8')),
   'وگرنه فردا همان دو قسمت برای درس‌نامه تکرار می‌شود');

console.log('\n══ ۹) شبی که کشته شد — نشانه‌ای که از کشته‌شدن جان به در ببرد ══');
/* ══ ۲۱ تا ۲۳ سپتامبر ══
   از بلوکِ «اثر انگشتِ معنایی» به بعد هیچ‌چیز اجرا نشد — نه اثر انگشت،
   نه انتشارِ یوتیوب، نه داوریِ ارجاع‌ها. و `nightStarve` هر روز می‌گفت
   «هر شب فهرست تا آخر می‌رود».

   چرا دروغ نمی‌گفت و باز هم غلط بود: اپس‌اسکریپت اجرا را سرِ شش دقیقه
   **می‌کُشد**، و همان کُشتن `nightEnd_` را هم می‌کُشد — یعنی تنها
   شاهدی که `nightStarve` از آن تغذیه می‌کند، دقیقاً در حالتی که لازم
   است نوشته نمی‌شود. نشانه باید **پیش از** کار نوشته شود. */
{
  const P = global.__PROPS;
  delete P[PK.NIGHT_AT];
  ok('۹.۱ بی هیچ ضربانی، ادعایی هم نیست', nightDeath_().died === false);

  // شبِ امروز، وسطِ کار: هنوز مرگ نیست — ممکن است ادامه داشته باشد.
  nightAtSave_('اثر انگشتِ معنایی');
  ok('۹.۲ شبِ جاری «مُرده» شمرده نمی‌شود', nightDeath_().died === false,
     'وگرنه هر شب وسطِ کار یک هشدارِ دروغ می‌داد');

  // همان ضربان، ولی مالِ روزی گذشته و بی «پایان» ⇒ آن شب مُرد.
  P[PK.NIGHT_AT] = JSON.stringify(
    { day: 'روزِ-گذشته', at: 'اثر انگشتِ معنایی', ts: '2026-09-23 02:46' });
  const d = nightDeath_();
  ok('۹.۳ شبِ گذشته‌ای که به «پایان» نرسیده، مُرده است',
     d.died === true && d.at === 'اثر انگشتِ معنایی',
     'گرفت: ' + JSON.stringify(d));

  /* ══ و «پایان» را **خودِ موتور** باید بنویسد ══
     اولش اینجا با دست `at: 'پایان'` گذاشته بودم و سنجه سبز ماند حتی
     وقتی آن سطر را از `nightEnd_` برداشتم — یعنی حالتی را می‌سنجید که
     سیستمِ واقعی شاید هرگز نسازد (درسِ ۷٫۲۲). پس از خودِ `nightEnd_`
     پرسیده می‌شود. */
  delete P[PK.NIGHT_AT];
  _nightMore = '';                       // یعنی فهرست تا آخر رفت
  nightEnd_(0);
  const done = JSON.parse(P[PK.NIGHT_AT] || 'null');
  ok('۹.۴ پایانِ سالم را خودِ `nightEnd_` مُهر می‌زند',
     !!done && done.at === 'پایان',
     'گرفت: ' + JSON.stringify(done));

  // و آن مُهر، فردا مرگ گزارش نمی‌کند.
  P[PK.NIGHT_AT] = JSON.stringify(
    { day: 'روزِ-گذشته', at: done && done.at, ts: '2026-09-23 02:46' });
  ok('۹.۴-ب و شبی که تا آخر رفت، فردا مرگ نیست',
     nightDeath_().died === false,
     'وگرنه هر شبِ سالم هم هشدار می‌داد — همان هشداری که نادیده‌اش می‌گیرند');
  delete P[PK.NIGHT_AT];
}
/* و ضربان باید **پیش** از کار نوشته شود، نه پس از آن: بلوکی که وقت را
   خورد و اجرا را به کشتن داد، اگر پس از کار ثبت شود هرگز ثبت نمی‌شود. */
ok('۹.۵ ضربان پیش از کار نوشته می‌شود، نه پس از آن', (function () {
   const src = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
   const i = src.indexOf('if (nightLeft_() >= needMs) {');
   if (i < 0) return false;
   const body = src.slice(i, i + 400);
   return body.indexOf('nightAtSave_(what)') !== -1 &&
          body.indexOf('nightAtSave_(what)') < body.indexOf('return true');
 })(), 'وگرنه نشانه فقط وقتی هست که لازمش نداریم');

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
