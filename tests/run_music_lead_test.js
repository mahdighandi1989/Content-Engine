/* موسیقی → گفتار: تلفیق روی خودِ صدا، نه روی سکوتِ آغازِ گفتار (۹.۰۱).
 *
 * نمونهٔ چهارمِ قسمتِ ۷۲ (variety:72-4)، سنجیده روی صوتِ خودِ ویدئو: سرِ ۵۷ ثانیه موسیقی در نیم‌ثانیه از ‎−۲۷ به
 * ‎−۷۶ دسی‌بل افتاد، نیم‌ثانیه سکوت، بعد گوینده. صاحبِ برنامه: «موسیقی فید نمی‌شود … و یهو قطع می‌شود».
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 200) : ''));
};
const SR = CFG.SAMPLE_RATE || 24000;
const pcm = (silSec, toneSec) => {
  const n0 = Math.round(silSec * SR), n1 = Math.round(toneSec * SR), b = [];
  for (let i = 0; i < n0 + n1; i++) {
    let v = i < n0 ? (i % 7) - 3 : Math.round(8000 * Math.sin(2 * Math.PI * 220 * i / SR));
    if (v < 0) v += 65536;
    const lo = v & 255, hi = (v >>> 8) & 255;
    b.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi);
  }
  while (b.length % 6) b.push(0);
  return Utilities.base64Encode(b);
};
const secOf = b64 => Utilities.base64Decode(b64).length / 2 / SR;

console.log('=== ۱) سکوتِ آغاز برداشته می‌شود، صدا نه ===');
const a = pcm(1.0, 0.5);
const t = pcmLeadTrim_(a, 0.12);
ok('۱.۱ یک ثانیه سکوت ⇒ ۰٫۱۲ ثانیه ماند', Math.abs(secOf(t) - 0.62) < 0.01, secOf(a).toFixed(3) + ' → ' + secOf(t).toFixed(3));
ok('۱.۲ برش روی مرزِ گروهِ base64 (صوت خراب نمی‌شود)', a.endsWith(t) && (a.length - t.length) % 8 === 0);
ok('۱.۳ تکهٔ بی سکوت دست نمی‌خورد', pcmLeadTrim_(pcm(0, 0.5), 0.12) === pcm(0, 0.5));
ok('۱.۴ سه ثانیهٔ اول همه سکوت ⇒ دست نمی‌خورد (حرفِ دیر بهتر از حرفِ بریده)', pcmLeadTrim_(pcm(3.2, 0.3), 0.12) === pcm(3.2, 0.3));

console.log('=== ۲) سیم‌کشی: فقط موسیقی → گفتار، پیش از تلفیق ===');
const p = fs.readFileSync('src/03_Producer.gs', 'utf8');
const i1 = p.indexOf('b64 = pcmLeadTrim_(b64, Number(CFG.MUSIC_SPEECH_LEAD_SEC) || 0.12)');
const i2 = p.indexOf('var mix = pcmXfade_(buf[buf.length - 1], b64, xs, !curMusic, xm);');
ok('۲.۱ برش پیش از pcmXfade_ و فقط وقتی قبلی موسیقی و این گفتار است',
   i1 > 0 && i2 > i1 && /if \(!curMusic && prevMusic === true && CFG\.MUSIC_XFADE !== false\) \{\s*try \{ b64 = pcmLeadTrim_/.test(p));

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ آغازِ گفتار پس از موسیقی گذشت.');
