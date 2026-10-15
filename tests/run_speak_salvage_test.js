/* نجاتِ واژه‌به‌واژه (۹.۰۶) — قسمتِ ۷۳: دو بخش از شش بی‌اعراب خوانده شد، چون مدل یک واژهٔ محاوره را
 * «درست» کرد («بیان» ← «بیاین») و دیگری یک نیم‌فاصله گذاشت («راهروهای» ← «راهروها‌ی»). برای یک واژه، کلِ بخش. */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 220) : ''));
};
global.logLine_ = () => {};
const vow = t => t.replace(/([آ-ی])(?=[آ-ی])/g, '$1َ');      // اعرابِ ساختگی: فتحه پس از هر حرفِ میانی

console.log('=== ۱) مدل یک واژه را عوض کرد ⇒ بقیهٔ بخش اعراب دارد، حروفِ متن دست نخورده ===');
const P = 'سخنگو می‌گوید همه مردم باید به کمک ما بیان و کمتر آب بخورن و مصرف آبشون رو در منازل کم کنن تنها راهش همینه';
const bad = vow(P.replace('بیان', 'بیاین'));
global.geminiText_ = () => ({ v: bad });
const out = vowelizePiece_(P);
ok('۱.۱ بخش بی‌اعراب نماند', !!out && /َ/.test(out), out.slice(0, 120));
ok('۱.۲ حروفِ خودِ متن ماند («بیان»، نه «بیاین») و وارسی می‌گذرد', verifySpeak_(P, out) && /بیان/.test(out.replace(/[ًٌٍَُِّْٰ]/g, '')) && !/بیاین/.test(out.replace(/[ًٌٍَُِّْٰ]/g, '')));
ok('۱.۳ علت پاک شد (یافتهٔ speak-skipped نمی‌سازد)', VOWEL_LAST_WHY_ === '');

console.log('=== ۲) جوابی که به متن ربطی ندارد ⇒ همان «نشد» (نجات چیزی نمی‌سازد) ===');
global.geminiText_ = () => ({ v: vow('این متن کاملاً دیگری است که هیچ ربطی به آن بخش ندارد و فقط شبیه فارسی است') });
ok('۲.۱ پوششِ کم ⇒ خالی، با علت', vowelizePiece_(P) === '' && /ناهم‌خوان/.test(VOWEL_LAST_WHY_), VOWEL_LAST_WHY_);

console.log('=== ۳) شنونده متنِ بی‌اعراب می‌شنود و اصلاح روی متنِ اعراب‌دار می‌نشیند (۹.۰۷) ===');
let seen = '';
global.ttsWavOf_ = () => 'WAV';
global.geminiShort_ = (parts) => { seen = parts[0].text; return { ok: 1 }; };
global.extractText_ = () => JSON.stringify({ errs: [{ word: 'جدا', heard: 'جُدا با کسرهٔ اضافه', kind: 'تلفظ', fix: 'جُدا' }] });
const MT = 'شِنیدَم بَعد اَز دو ماهِ جُدا شُدی';
const r = ttsListenCheck_(Utilities.base64Encode([0, 0, 0, 0]), MT);
ok('۳.۱ متنی که به شنونده می‌رسد هیچ اعرابی ندارد', seen.indexOf('دو ماه جدا') !== -1 && !/[ًٌٍَُِّْ]/.test(seen.split('متن:\n')[1] || 'x'), (seen.split('متن:\n')[1] || '').slice(0, 60));
ok('۳.۲ و از معنا داوری می‌خواهد، نه از اعرابِ ما', /در همین جمله و با همین/.test(seen) && /کسرهٔ اضافه/.test(seen));
ok('۳.۳ خطای شنیده‌شده با واژهٔ بی‌اعراب پذیرفته می‌شود', r.errs.length === 1 && r.errs[0].word === 'جدا', JSON.stringify(r.errs));
const fixed = ttsListenApplyFix_(MT, [{ word: 'ماه', kind: 'تلفظ', fix: 'ماه' }]);
ok('۳.۴ اصلاح روی واژهٔ اعراب‌دار با همان حروف می‌نشیند (کسرهٔ بی‌جای «ماهِ» برداشته شد)',
   /دو ماه جُدا/.test(fixed) && !/ماهِ/.test(fixed) && verifySpeak_(stripTashkil_(MT), fixed), fixed);

console.log('=== ۴) حالت‌های پرهیجان تلفظ را قربانی نمی‌کنند (۹.۰۹) ===');
const hot = ['بلند', 'کمی‌بلند', 'تند', 'سنگین', 'کشیده'].map(k => speakSpanDef_(k));
ok('۴.۱ هیچ دستوری «صدای بلند»/فریاد نمی‌خواهد', hot.every(d => !/صدای بلند|فریاد بزن|بلندتر/.test(d.cue)), hot.map(d => d.cue).join(' | '));
ok('۴.۲ هر پنج حالتِ پرهیجان صریحاً درستیِ واژه/واکه را می‌خواهد', hot.every(d => /واکه|تلفظ|هجایی|شمرده/.test(d.cue)));

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ نجاتِ واژه‌به‌واژه گذشت.');
