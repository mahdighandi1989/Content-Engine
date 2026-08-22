/* بانکِ موسیقی و افکت (بخشِ ۲۳).
 *
 * اینجا ریاضیِ صداست، پس خرابی‌اش بی‌صداست: یک برشِ غلط یا یک بلندیِ اشتباه
 * هیچ خطایی نمی‌دهد و فقط در گوش شنیده می‌شود. پس خودِ نمونه‌ها سنجیده
 * می‌شوند، نه اینکه فرض کنیم توابع کارشان را کرده‌اند.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs',
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

/* ساختِ یک WAV واقعی در حافظه، با هر نرخ/کانال/عمقی که بخواهیم. */
function mkWav(rate, ch, bits, seconds, sampleAt) {
  const frames = Math.floor(rate * seconds);
  const bps = bits / 8, dataLen = frames * ch * bps;
  const b = [];
  const str = s => { for (const c of s) b.push(c.charCodeAt(0)); };
  const u32 = v => b.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
  const u16 = v => b.push(v & 255, (v >>> 8) & 255);
  str('RIFF'); u32(36 + dataLen); str('WAVE');
  str('fmt '); u32(16); u16(1); u16(ch); u32(rate);
  u32(rate * ch * bps); u16(ch * bps); u16(bits);
  str('LIST'); u32(4); str('INFO');           // چانکِ اضافه، عمداً
  str('data'); u32(dataLen);
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < ch; c++) {
      const v = sampleAt(f, c) | 0;
      const u = v < 0 ? v + 65536 : v;
      b.push(u & 255, (u >>> 8) & 255);
    }
  }
  return b.map(x => x > 127 ? x - 256 : x);
}

console.log('\n=== ۱. خواندنِ هدرِ WAV ===');
{
  const w = mkWav(44100, 2, 16, 0.5, () => 1000);
  const info = wavInfo_(w);
  ok('۱.۱ نرخ و کانال و عمق درست خوانده شد',
     info.rate === 44100 && info.channels === 2 && info.bits === 16,
     JSON.stringify({ r: info.rate, c: info.channels, b: info.bits }));
  ok('۱.۲ از چانکِ اضافه (LIST) رد شد و data را یافت', info.dataLen === Math.floor(44100 * 0.5) * 4,
     info.dataLen + '');
  ok('۱.۳ مدت درست حساب شد', Math.abs(info.seconds - 0.5) < 0.01, info.seconds.toFixed(3));
  ok('۱.۴ قالبِ موتور شناخته می‌شود',
     musicNative_(wavInfo_(mkWav(CFG.SAMPLE_RATE, 1, 16, 0.2, () => 5))) === true);
  ok('۱.۵ و قالبِ ناهمخوان، نه', musicNative_(info) === false);
  ok('۱.۶ دادهٔ بی‌معنی هدر ندارد', wavInfo_([1, 2, 3]) === null);
}

console.log('\n=== ۲. تبدیل به قالبِ موتور ===');
{
  // استریو ۴۴٫۱: کانال چپ ۱۰۰۰، راست ۲۰۰۰ → تک‌کانالهٔ ۱۵۰۰
  const w = mkWav(44100, 2, 16, 1, (f, c) => (c === 0 ? 1000 : 2000));
  const s = musicSamples_(w, wavInfo_(w), 0, 1);
  ok('۲.۱ نرخ به نرخِ موتور رسید',
     Math.abs(s.length - CFG.SAMPLE_RATE) <= 2, s.length + ' نمونه');
  const mid = s[Math.floor(s.length / 2)];
  ok('۲.۲ دو کانال میانگین شدند (۱۰۰۰ و ۲۰۰۰ → ۱۵۰۰)', Math.abs(mid - 1500) < 5, mid + '');
  const w8 = mkWav(8000, 1, 16, 1, () => 800);
  const s8 = musicSamples_(w8, wavInfo_(w8), 0, 1);
  ok('۲.۳ نرخِ پایین‌تر هم بالا کشیده می‌شود',
     Math.abs(s8.length - CFG.SAMPLE_RATE) <= 2, s8.length + '');
  ok('۲.۴ و مقدارها دست‌نخورده می‌مانند',
     Math.abs(s8[Math.floor(s8.length / 2)] - 800) < 5);
}

console.log('\n=== ۳. برش از میانهٔ قطعه ===');
{
  // موجی که مقدارش شمارهٔ ثانیه است: ثانیهٔ سوم مقدارِ ۳۰۰۰ دارد
  const w = mkWav(CFG.SAMPLE_RATE, 1, 16, 6, f => Math.floor(f / CFG.SAMPLE_RATE) * 1000);
  const info = wavInfo_(w);
  const whole = musicSamples_(w, info, 0, 6);
  ok('۳.۱ کلِ قطعه شش ثانیه است', Math.abs(whole.length - 6 * CFG.SAMPLE_RATE) <= 2);
  const cut = musicSamples_(w, info, 3, 2);
  ok('۳.۲ برشِ دو ثانیه‌ای از ثانیهٔ سوم، دو ثانیه است',
     Math.abs(cut.length - 2 * CFG.SAMPLE_RATE) <= 2, cut.length + '');
  ok('۳.۳ و واقعاً از ثانیهٔ سوم شروع شده', Math.abs(cut[10] - 3000) < 5, cut[10] + '');
  ok('۳.۴ و به ثانیهٔ پنجم نرسیده', Math.abs(cut[cut.length - 10] - 4000) < 5,
     cut[cut.length - 10] + '');
  const over = musicSamples_(w, info, 5, 10);
  ok('۳.۵ درخواستِ بلندتر از خودِ فایل، تا انتها برش می‌خورد',
     over.length <= CFG.SAMPLE_RATE + 2 && over.length > 0, over.length + '');
  ok('۳.۶ شروع پس از پایانِ فایل، خالی برمی‌گرداند',
     musicSamples_(w, info, 99, 1).length === 0);
}

console.log('\n=== ۴. بلندی و محوِ نرم ===');
{
  const flat = () => { const a = []; for (let i = 0; i < CFG.SAMPLE_RATE * 4; i++) a.push(10000); return a; };
  const g = musicShape_(flat(), 0.5, 0, 0);
  ok('۴.۱ نصف‌کردنِ بلندی', Math.abs(g[100] - 5000) <= 1, g[100] + '');
  const f = musicShape_(flat(), 1, 1, 1);
  ok('۴.۲ اولِ محو، نزدیکِ صفر است', Math.abs(f[0]) < 100, f[0] + '');
  ok('۴.۳ وسط، دست‌نخورده است', Math.abs(f[Math.floor(f.length / 2)] - 10000) < 50);
  ok('۴.۴ آخرِ محو هم نزدیکِ صفر است', Math.abs(f[f.length - 1]) < 100, f[f.length - 1] + '');
  const loud = musicShape_(flat(), 10, 0, 0);
  ok('۴.۵ بلندیِ زیاد به بیرونِ بازهٔ ۱۶ بیتی نمی‌زند (کلیپ می‌شود)',
     loud[0] === 32767, loud[0] + '');
  const neg = musicShape_([-10000, -10000], 10, 0, 0);
  ok('۴.۶ سمتِ منفی هم کلیپ می‌شود', neg[0] === -32768, neg[0] + '');
}

console.log('\n=== ۵. رفت و برگشتِ base64 ===');
{
  const s = [0, 1000, -1000, 32767, -32768];
  const b64 = musicB64_(s.slice());
  const back = Utilities.base64Decode(b64);
  const u = k => back[k] < 0 ? back[k] + 256 : back[k];
  const rd = i => { const v = u(i) | (u(i + 1) << 8); return (v & 0x8000) ? v - 65536 : v; };
  ok('۵.۱ همان نمونه‌ها برمی‌گردند',
     rd(0) === 0 && rd(2) === 1000 && rd(4) === -1000, [rd(0), rd(2), rd(4)].join(','));
  ok('۵.۲ طولِ base64 هم‌ترازِ چسباندن است', b64.length % 4 === 0);
  // alignB64_ عمداً تا چند بایتِ آخر را می‌بُرد تا مرزِ نمونهٔ ۱۶ بیتی نشکند.
  // این یعنی کسری از یک میلی‌ثانیه از تهِ قطعه کم می‌شود — بی‌اهمیت برای صدا،
  // ولی باید کرانه‌اش سنجیده شود وگرنه فردا به یک بریدگیِ شنیدنی تبدیل شود.
  ok('۵.۳ بایت‌ها روی مرزِ نمونه می‌مانند', back.length % 2 === 0, back.length + ' بایت');
  const lost = s.length - back.length / 2;
  ok('۵.۴ و از دو نمونه بیشتر بریده نمی‌شود', lost >= 0 && lost <= 2, lost + ' نمونه');
  const big = []; for (let i = 0; i < 4800; i++) big.push(i % 2 ? -20000 : 20000);
  const bb = Utilities.base64Decode(musicB64_(big.slice()));
  const u2 = k => bb[k] < 0 ? bb[k] + 256 : bb[k];
  const rd2 = i => { const v = u2(i) | (u2(i + 1) << 8); return (v & 0x8000) ? v - 65536 : v; };
  ok('۵.۵ در قطعهٔ واقعی، کرانه‌های مثبت و منفی هر دو سالم‌اند',
     rd2(0) === 20000 && rd2(2) === -20000, rd2(0) + ' / ' + rd2(2));
  ok('۵.۶ و تلفات در قطعهٔ واقعی ناچیز است',
     (big.length - bb.length / 2) <= 2, (big.length - bb.length / 2) + ' نمونه از ' + big.length);
}

/* ۶. نمونه‌های منفی — همان باگی که ۵.۱ گرفت.
   بایت‌های Apps Script علامت‌دارند؛ اگر بایتِ بالا پیش از جابه‌جایی ماسک نشود
   هر نمونهٔ منفی عددی بی‌معنا می‌شود. خطایی نمی‌دهد، فقط شنیده می‌شود. */
console.log('\n=== ۶. موجِ واقعی با نیمهٔ منفی ===');
{
  const w = mkWav(CFG.SAMPLE_RATE, 1, 16, 1,
                  f => Math.round(12000 * Math.sin(2 * Math.PI * 100 * f / CFG.SAMPLE_RATE)));
  const s = musicSamples_(w, wavInfo_(w), 0, 1);
  let mn = 0, mx = 0;
  for (const v of s) { if (v < mn) mn = v; if (v > mx) mx = v; }
  ok('۶.۱ قلهٔ مثبت درست است', Math.abs(mx - 12000) < 200, mx + '');
  ok('۶.۲ قلهٔ منفی هم درست است (باگِ ماسک)', Math.abs(mn + 12000) < 200, mn + '');
  const ratio = s.filter(v => v < 0).length / s.length;
  ok('۶.۳ حدودِ نیمی از نمونه‌ها منفی‌اند', ratio > 0.4 && ratio < 0.6,
     Math.round(ratio * 100) + '٪');
  const st = mkWav(44100, 2, 16, 1, (f, c) => (c === 0 ? -8000 : -4000));
  const ss = musicSamples_(st, wavInfo_(st), 0, 1);
  ok('۶.۴ میانگینِ دو کانالِ منفی هم درست است',
     Math.abs(ss[Math.floor(ss.length / 2)] + 6000) < 50,
     ss[Math.floor(ss.length / 2)] + '');
}

console.log('\n✅ هر ' + pass + ' آزمونِ بانکِ موسیقی گذشت.');
