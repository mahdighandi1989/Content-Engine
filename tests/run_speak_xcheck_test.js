/* اعرابِ دو منبعِ مستقل، و داوری فقط روی اختلاف (۹.۰۰).
 *
 * ریشهٔ «fohashi» در قسمتِ ۷۲ (۹:۰۱) روی دادهٔ همان قسمت پیدا شد، و این سنجه‌ها روی **همان داده** می‌دوند
 * (`tests/fixtures/speak72.json`، عیناً از `_episode.json`):
 *   ۱) اعرابِ Cowork («فَحّاشی‌ها»، درست) با وجودِ عنوانِ اول و پیش‌نویسِ متفاوت روی متنِ نهایی منتقل می‌شود.
 *   ۲) تعارضِ واقعی از اختلافِ نگارش جدا می‌شود؛ «فُحّاشی / فَحّاشی» تعارض است.
 *   ۳) داوری فقط روی اختلاف‌ها، و حروفِ واژه هرگز عوض نمی‌شود.
 *   ۴) `speakStep_` همهٔ این را در مسیرِ واقعی می‌دوانَد — هر دو برنامه از همین در می‌گذرند.
 *   ۵) بخشی که اعراب‌گذارِ موتور ردش کرد، با اعرابِ Cowork خوانده می‌شود نه خام.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 220) : ''));
};
const fx = JSON.parse(fs.readFileSync('tests/fixtures/speak72.json', 'utf8'));
const plain = speakSanitize_(fx.plain4), eng = fx.engine4, cow = speakSanitize_(fx.cowork4);

console.log('=== ۱) اعرابِ Cowork روی متنِ نهایی ===');
ok('۱.۰ (شاهدِ ریشه) همان اعرابِ Cowork با وارسیِ واژه‌به‌واژه رد می‌شد', !verifySpeak_(plain, cow), vowelWhyOf_(plain, cow));
ok('۱.۰-ب (شاهدِ ریشه) Cowork «فَحّاشی» نوشته بود و موتور «فُحّاشی»', cow.indexOf('فَحّاشی') !== -1 && eng.indexOf('فُحّاشی') !== -1);
const tr = speakTransfer_(plain, cow);
ok('۱.۱ انتقال: پوشش بالا، وارسی و چگالی می‌گذرد', tr.cov > 0.7 && verifySpeak_(plain, tr.t) && speakVowelledOk_(plain, tr.t), tr.cov.toFixed(2));
ok('۱.۲ «فَحّاشی‌ها» با نیم‌فاصلهٔ خودِ متن رسید؛ عنوانِ بخش وارد نشد',
   tr.t.indexOf('فَحّاشی‌ها') !== -1 && speakLetters_(tr.t) === speakLetters_(plain));
ok('۱.۳ حروفِ واژه از منبع نمی‌آید — فقط اعراب', speakMarkMove_('فحاشی‌ها', 'فَحّاشیها') === 'فَحّاشی‌ها');

console.log('=== ۲) تعارضِ واقعی، نه اختلافِ نگارش ===');
ok('۲.۱ فُحّاشی / فَحّاشی تعارض است', speakConflict_('فُحّاشی', 'فَحّاشی'));
ok('۲.۲ کسرهٔ اضافهٔ حرفِ آخر تعارض است (مَسیر / مَسیرِ)', speakConflict_('مَسیر', 'مَسیرِ'));
ok('۲.۳ علامتِ نبوده در یک طرف تعارض نیست (اَصلی / اصلی)', !speakConflict_('اَصلیِ', 'اصلیِ'));
ok('۲.۴ «هِ»ی بی‌صدای پایانی و سکون تعارض نیستند (شُده / شُدِه، می‌آزْمایند)',
   !speakConflict_('شُده', 'شُدِه') && !speakConflict_('آزْمایند', 'آزمایند'));
const dis = speakDisagree_(eng, tr.t);
ok('۲.۵ روی دادهٔ واقعی: «فُحّاشی‌ها» در فهرستِ اختلاف است، با جملهٔ خودش',
   dis.some(d => d.a.indexOf('فُحّاشی') !== -1 && d.b.indexOf('فَحّاشی') !== -1 && /پِی می/.test(d.sent)),
   dis.map(d => d.a + '|' + d.b).join(' · '));
ok('۲.۶ و فهرست کوتاه است — فقط تعارض‌ها (≤ ۸ در این بخش)', dis.length >= 3 && dis.length <= 8, String(dis.length));

console.log('=== ۳) داوری فقط روی اختلاف ===');
const realGem = global.geminiText_;
let asked = '';
global.geminiText_ = (p) => {
  asked = p;
  const n = (p.match(/^\d+\) جمله/gm) || []).length;
  const picks = [];
  for (let i = 1; i <= n; i++) {
    const line = p.split('\n').find(l => l.indexOf(i + ') جمله') === 0);
    const opt = p.split('\n')[p.split('\n').indexOf(line) + 1];
    picks.push({ n: String(i), pick: /فَحّاشی/.test(opt) ? '2' : (i === 1 ? '3' : '1'), w: i === 1 ? 'کلمه‌ٔدیگر' : '' });
  }
  return { picks: picks };
};
const xc = speakXcheck_(plain, eng, cow, 0);
ok('۳.۱ داور فقط اختلاف‌ها را دید، هر کدام با جمله؛ قاعدهٔ «ساخت، نه هم‌ریشه» در پرسش است',
   (asked.match(/^\d+\) جمله/gm) || []).length === dis.length && /فُحش» ولی «فَحّاشی/.test(asked));
ok('۳.۲ نتیجه «فَحّاشی‌ها» دارد و «فُحّاشی» نه', xc.t.indexOf('فَحّاشی‌ها') !== -1 && xc.t.indexOf('فُحّاشی') === -1, JSON.stringify(xc.ex));
ok('۳.۳ پاسخِ «۳» با حروفِ دیگر کنار رفت — حروفِ متن دست نخورد', speakLetters_(xc.t) === speakLetters_(eng) && verifySpeak_(eng, xc.t));
ok('۳.۴ شمارش ثبت شد (منبع، اختلاف، برگزیده‌ها)', xc.src === 'cowork' && xc.dis === dis.length && xc.b >= 1, JSON.stringify({ src: xc.src, dis: xc.dis, a: xc.a, b: xc.b, c: xc.c }));
global.geminiText_ = () => { throw new Error('quota'); };
const xc2 = speakXcheck_(plain, eng, cow, 0);
ok('۳.۵ داوری نشد ⇒ همان اعرابِ قبلی (بدتر از امروز نمی‌شود)', xc2.t === eng);

console.log('=== ۴) مسیرِ واقعی: speakStep_ ===');
{
  const keep = global.vowelizeText_;
  /* اعرابِ موتور روی همین متنِ ساده (متنِ ذخیره‌شده عنوان را هم داشت) — همان اعراب، همان «فُحّاشی». */
  const engT = speakTransfer_(plain, eng).t;
  ok('۴.۰ (شاهد) اعرابِ موتور روی همین متن «فُحّاشی» دارد', engT.indexOf('فُحّاشی') !== -1 && verifySpeak_(plain, engT));
  global.vowelizeText_ = (t) => (t === plain ? engT : '');
  global.geminiText_ = (p) => ({ picks: (p.match(/^\d+\) جمله/gm) || []).map((x, i) => ({ n: String(i + 1),
    pick: p.split('\n').filter(l => /گزینهٔ ۱/.test(l))[i].indexOf('فَحّاشی') !== -1 ? '2' : '1' })) });
  const ep = { sections: [{ heading: fx.heading4, narration: fx.plain4 }], __ctashkil: { sections: { '0': fx.cowork4 } } };
  const segs = [{ kind: 'body', secIndex: 0, heading: fx.heading4, text: fx.plain4 }];
  const r = speakStep_(ep, segs, Date.now() + 600000, () => {});
  const sg = ep.__speakSegs[0];
  ok('۴.۱ متنِ صوتیِ نهایی «فَحّاشی‌ها» دارد', r.done && sg.t.indexOf('فَحّاشی‌ها') !== -1 && sg.t.indexOf('فُحّاشی') === -1);
  ok('۴.۲ ردِ کار در پروندهٔ قسمت می‌ماند (x)', sg.x && sg.x.src === 'cowork' && sg.x.dis >= 1, JSON.stringify(sg.x));

  console.log('=== ۵) بخشی که موتور ردش کرد ===');
  global.vowelizeText_ = () => '';
  global.geminiText_ = () => ({ picks: [] });
  const ep1 = { sections: [{ narration: fx.plain1 }], __ctashkil: { sections: { '0': fx.cowork1 } } };
  speakStep_(ep1, [{ kind: 'body', secIndex: 0, text: fx.plain1 }], Date.now() + 600000, () => {});
  ok('۵.۱ (قسمتِ ۷۲ همین بخش را خام خواند: «' + fx.skip1.slice(0, 40) + '») حالا با اعرابِ Cowork',
     ep1.__speakSegs[0].t && !ep1.__speakSegs[0].skip && speakVowelledOk_(speakSanitize_(fx.plain1), ep1.__speakSegs[0].t));
  global.vowelizeText_ = keep;
}
global.geminiText_ = realGem;

console.log('=== ۶) سیم‌کشی ===');
{
  const y = fs.readFileSync('src/03_Producer.gs', 'utf8'), sp = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۶.۱ هر دو برنامه از speakStep_ می‌گذرند (و xcheck در خودِ speakStep_ است)',
     /speakStep_\(ep, segsSpk/.test(y) && /speakStep_\(ep, segsSp/.test(sp) &&
     /xc = speakXcheck_\(plain, v, fromCt \? '' : candRaw, deadline\)/.test(y));
  ok('۶.۲ نظرِ دوم از مدلِ دیگر ممکن است (geminiText_ opt.model)', /var model = \(opt && opt\.model\) \|\| textModel_\(\);/.test(y));
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ اعرابِ دو منبعی گذشت.');
