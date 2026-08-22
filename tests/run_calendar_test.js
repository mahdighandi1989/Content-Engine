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

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
