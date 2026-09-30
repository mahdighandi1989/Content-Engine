/* کارت‌های ویدئو (tools/cardkit) — ۸.۰۱
 *
 * چرا این مجموعه هست: تا ۸.۰۰ کارت‌ها در اسلایدز کشیده می‌شدند و خروجی
 * «اسلایدشوِ متن» بود. حالا در SVG کشیده می‌شوند، و سه چیز می‌تواند بی‌صدا
 * خراب شود — هر سه یک بار واقعاً خراب شدند و این سنجه‌ها از همان‌ها زاده‌اند:
 *   ۱) `direction="rtl"` روی ریشهٔ SVG معنیِ text-anchor را برعکس می‌کند و
 *      کلِ چیدمان از قاب بیرون می‌زند. دیده شد، در یک فریمِ واقعی.
 *   ۲) نشانِ کانال روی متن می‌افتد. دیده شد: با نشانِ پایین-راست، سومین
 *      بندِ ستونِ راست دقیقاً زیرش بود.
 *   ۳) زمانِ ضرب‌ها از گفتار جدا می‌شود و تصویر جلو می‌زند.
 */
require('./lib/root.js');
const fs = require('fs');
const F = require('../tools/cardkit/forms.js');
const L = require('../tools/cardkit/look.js');
const MK = require('../tools/cardkit/mark.js');

let pass = 0;
function ok(name, cond, ev) {
  if (cond) { pass++; console.log('  ✅ ' + name + (ev ? ' — ' + ev : '')); return; }
  console.log('  ❌ ' + name + (ev ? ' — ' + ev : ''));
  throw new Error('FAILED: ' + name);
}
const PAL = L.LOOKS[0].pal;
const CARD = {
  form: 'split', kicker: 'سربرگ', foot: 'پانویس', at: 0, end: 40,
  anchors: [0, 12, 26], headline: 'یک محتوا، صد فرایند',
  right: { title: 'محتوا', icon: 'triangle', items: ['یک', 'دو', 'سه'] },
  left: { title: 'فرایند', icon: 'many', items: ['الف', 'ب', 'پ'] }
};

console.log('=== ۱) ضرب‌ها و چیدمان ===');
{
  const r = F.beats(CARD, PAL);
  ok('۱.۱ یک کارت چند ضرب می‌دهد، نه یکی', r.svg.length >= 8, r.svg.length + ' ضرب');

  /* ۱.۲ — **ریشهٔ SVG هرگز direction=rtl ندارد.** این همان یک صفت است که
     چیدمان را از قاب بیرون می‌بَرد، و از خواندنِ کد پیدا نشد: از نگاه‌کردن
     به تصویر پیدا شد. */
  const root = r.svg[0].slice(0, r.svg[0].indexOf('>') + 1);
  ok('۱.۲ ریشهٔ SVG جهتِ RTL ندارد — وگرنه text-anchor برعکس می‌شود',
     root.indexOf('direction') === -1 && /viewBox="0 0 1920 1080"/.test(root), root.slice(0, 96));

  /* ۱.۳ — هیچ عنصری بیرونِ قاب نیست. */
  const last = r.svg[r.svg.length - 1];
  const xs = (last.match(/ x="(-?[\d.]+)"/g) || []).map(m => Number(m.match(/-?[\d.]+/)[0]));
  ok('۱.۳ هیچ مختصاتِ افقی بیرونِ قاب نیست',
     xs.length > 3 && xs.every(v => v >= -60 && v <= 1980),
     xs.length + ' مختصات، کمینه ' + Math.min.apply(null, xs) + ' بیشینه ' + Math.max.apply(null, xs));

  /* ۱.۴ — متنِ روی کارت **کوتاه** است. ایرادِ اصلیِ نگارشِ پیشین این بود که
     جمله‌های گوینده را عیناً روی تصویر می‌ریخت. */
  const longest = ['محتوا', 'فرایند'].concat(CARD.right.items, CARD.left.items)
    .reduce((m, t) => Math.max(m, t.length), 0);
  ok('۱.۴ بندهای کارت کوتاه‌اند، نه جملهٔ گوینده', longest <= 40, 'بلندترین ' + longest + ' نویسه');
}

console.log('\n=== ۲) زمان از گفتار می‌آید ===');
{
  const r = F.beats(CARD, PAL);
  ok('۲.۱ هر ضرب ثانیهٔ خودش را دارد', r.times.length === r.svg.length, r.times.length + '/' + r.svg.length);
  ok('۲.۲ زمان‌ها صعودی‌اند و از لنگرِ اول عقب‌تر نمی‌روند',
     r.times.every((t, i) => i === 0 ? t >= CARD.anchors[0] - 1e-6 : t >= r.times[i - 1] - 1e-6),
     r.times.map(t => t.toFixed(1)).join(' → '));
  ok('۲.۳ و از پایانِ کارت جلو نمی‌زنند',
     r.times[r.times.length - 1] <= CARD.end + 1e-6,
     'آخرین ' + r.times[r.times.length - 1].toFixed(1) + ' در برابرِ پایانِ ' + CARD.end);

  /* ۲.۴ — **لنگرها واقعاً اثر دارند.** بی این سنجه، `anchors` می‌توانست
     نادیده گرفته شود و ضرب‌ها به‌تساوی پخش شوند — یعنی دقیقاً همان باگی که
     این ساختار برای رفعش ساخته شد، بی‌صدا برگردد. */
  const near = CARD.anchors.map(a => r.times.reduce((m, t) => Math.min(m, Math.abs(t - a)), 1e9));
  ok('۲.۴ روی هر لنگر واقعاً یک ضرب می‌نشیند',
     near.every(d => d < 0.6), near.map(d => d.toFixed(2)).join(' · '));
}

console.log('\n=== ۳) نشانِ کانال: جابه‌جا می‌شود و روی متن نمی‌افتد ===');
{
  /* ۳.۱ — می‌گردد، و هر چهار گوشه را می‌بیند. اگر یک گوشه هرگز نیاید،
     خواستهٔ «کسی نتواند لوگوی خودش را رویش بگذارد» نصفه است. */
  const seen = {};
  for (let t = 0; t < 1200; t += 30) seen[MK.cornerAt(t, 180)] = true;
  ok('۳.۱ نشان در طولِ یک قسمت هر چهار گوشه را می‌بیند',
     Object.keys(seen).length === 4, Object.keys(seen).join(' · '));

  ok('۳.۱-ب و در یک بازهٔ کوتاه نمی‌پرد — جابه‌جایی سرِ مرزِ بازه است',
     MK.cornerAt(10, 180) === MK.cornerAt(170, 180) &&
     MK.cornerAt(170, 180) !== MK.cornerAt(190, 180),
     MK.cornerAt(10, 180) + ' → ' + MK.cornerAt(190, 180));

  /* ۳.۲ — **هیچ عنصری داخلِ جعبهٔ نشان نیست، در هیچ‌کدام از چهار گوشه.**
     این سنجه از یک فریمِ واقعی زاده شد، نه از خواندنِ کد. */
  const bad = [];
  for (const cr of MK.CORNERS) {
    const c = Object.assign({}, CARD, { mark: { corner: cr, handle: '@x', name: 'د' } });
    const r = F.beats(c, PAL);
    const svg = r.svg[r.svg.length - 1];
    const b = MK.box(cr, 1920, 1080, 130);
    /* گروهِ خودِ نشان کنار گذاشته می‌شود؛ بقیهٔ عناصر سنجیده می‌شوند.
       نگارشِ اولِ این سنجه SVG را از `<filter id="mkS">` **می‌بُرید** — و چون
       `chrome()` پیش از عناصرِ کارت نوشته می‌شود، آن برش کلِ محتوا را دور
       می‌ریخت و سنجه توخالی بود: با برداشتنِ کاملِ عقب‌بَر هم سبز مانْد.
       حالا فقط بلوکِ نشان، با نشانه‌گذاریِ صریحِ خودش، حذف می‌شود. */
    const body = svg.replace(/<!--mark-->[\s\S]*?<!--\/mark-->/g, '');
    const pts = [];
    (body.match(/<text[^>]* x="(-?[\d.]+)" y="(-?[\d.]+)"/g) || []).forEach(m => {
      const n = m.match(/x="(-?[\d.]+)" y="(-?[\d.]+)"/); pts.push([+n[1], +n[2]]);
    });
    (body.match(/<circle cx="(-?[\d.]+)" cy="(-?[\d.]+)"/g) || []).forEach(m => {
      const n = m.match(/cx="(-?[\d.]+)" cy="(-?[\d.]+)"/); pts.push([+n[1], +n[2]]);
    });
    (body.match(/<foreignObject x="(-?[\d.]+)" y="(-?[\d.]+)" width="(-?[\d.]+)" height="(-?[\d.]+)"/g) || []).forEach(m => {
      const n = m.match(/x="(-?[\d.]+)" y="(-?[\d.]+)" width="(-?[\d.]+)" height="(-?[\d.]+)"/);
      pts.push([+n[1] + +n[3] / 2, +n[2] + +n[4]]);
    });
    for (const [x, y] of pts) {
      if (x >= b.x - 10 && x <= b.x + b.w + 10 && y >= b.y - 10 && y <= b.y + b.h + 10) {
        bad.push(cr + ' @ ' + x.toFixed(0) + ',' + y.toFixed(0));
      }
    }
  }
  ok('۳.۲ در هیچ گوشه‌ای عنصری داخلِ جعبهٔ نشان نمی‌افتد',
     bad.length === 0, bad.length ? bad.join(' | ') : 'هر چهار گوشه تمیز');

  /* ۳.۳ — و نشان **واقعاً کشیده می‌شود**؛ بی این، ۳.۲ با نکشیدنِ نشان هم
     سبز می‌مانْد. */
  const withMk = F.beats(Object.assign({}, CARD, { mark: { corner: 'br', handle: '@ce', name: 'د' } }), PAL);
  ok('۳.۳ نشان و شناسهٔ کانال روی کارت هستند',
     withMk.svg[0].indexOf('@ce') !== -1 && withMk.svg[0].indexOf('mkS') !== -1);

  /* ۳.۴ — تصویرِ نشان باید **درونِ** SVG بنشیند. کروم فایلِ محلی را می‌کشد و
     اجازهٔ شبکه ندارد، پس یک `href` به نشانیِ بیرونی خالی درمی‌آید، بی هیچ
     خطایی — که بدترین شکلِ خرابی است. */
  const withLogo = F.beats(Object.assign({}, CARD, { mark: {
    corner: 'br', handle: '@ce', name: 'د', logo: 'data:image/png;base64,AAAA' } }), PAL);
  ok('۳.۴ تصویرِ نشان به‌صورتِ داده درونِ SVG می‌نشیند، نه نشانیِ بیرونی',
     withLogo.svg[0].indexOf('data:image/png;base64') !== -1 &&
     !/href="https?:/.test(withLogo.svg[0]));

  /* ۳.۵ — و **نبودِ تصویر خطا نیست**: تک‌نگارهٔ حرفِ اولِ نامِ کانال کشیده
     می‌شود. یک نشانِ خالی بدتر از یک تک‌نگاره است. */
  ok('۳.۵ بی تصویر، تک‌نگارهٔ حرفِ اول کشیده می‌شود',
     withMk.svg[0].indexOf('<circle') !== -1 && withMk.svg[0].indexOf('>د<') !== -1);
}

console.log('\n=== ۴) ظاهر از محتوا می‌آید، نه یک تمِ ثابت ===');
{
  const a = L.lookFor('فلسفی و اعتقادی', 'معرفت‌شناسی', []);
  const b = L.lookFor('تاریخ اسلام', 'سیرهٔ نبوی', []);
  const c = L.lookFor('علوم تجربی', 'فیزیک', []);
  ok('۴.۱ دو محتوای متفاوت دو ظاهرِ متفاوت می‌گیرند',
     a.key !== b.key && b.key !== c.key && a.pal.bg !== b.pal.bg,
     [a.key, b.key, c.key].join(' · '));
  ok('۴.۲ محتوای ناشناخته ظاهرِ پیش‌فرض می‌گیرد، نه خطا',
     L.lookFor('چیزی که نیست', '', []).key === L.LOOKS[0].key);
  ok('۴.۲-ب و همان ورودی همیشه همان ظاهر را می‌دهد',
     L.lookFor('تاریخ اسلام', 'س', []).key === L.lookFor('تاریخ اسلام', 'س', []).key);
  /* ۴.۳ — هر ظاهر باید کنتراستِ واقعی داشته باشد: متن روی زمینه خوانده شود.
     یک پالتِ زیبا که متنش خوانده نشود، بدتر از پالتِ زشت است. */
  const lum = h => { const v = parseInt(h.slice(1), 16);
    return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255; };
  const weak = L.LOOKS.filter(x => Math.abs(lum(x.pal.bg) - lum(x.pal.ink)) < 0.45);
  ok('۴.۳ در هر ظاهر، متن روی زمینه کنتراست دارد',
     weak.length === 0, weak.map(x => x.key).join(' · ') || 'هر ' + L.LOOKS.length + ' ظاهر');
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ کارت گذشت.');
