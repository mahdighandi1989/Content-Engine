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
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs'];
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
  /* ۳.۵ تا ۵٫۷۱ رفتارِ *غلط* را تثبیت می‌کرد و همین باعث شد باگ دیده نشود.
   * درخواست: «۱۰ ثانیه، از ثانیهٔ ۵» روی فایلی که ۶ ثانیه است.
   * رفتارِ قدیم: یک ثانیه برمی‌گرداند — چون شروع را نگه می‌داشت و بقیه را
   * می‌بُرید. در تولید همین شد «موسیقیِ یک‌ثانیه‌ای»: مدل برای قطعهٔ
   * ۲۴ثانیه‌ای startSec=۲۳ داد و از هشت ثانیه یک ثانیه رسید.
   * رفتارِ درست: وقتی قطعه به‌اندازهٔ خواسته‌شده جا ندارد، شروع عقب کشیده
   * می‌شود و **بیشترین صدای ممکن** داده می‌شود — نه کمترین. */
  const over = musicSamples_(w, info, 5, 10);
  ok('۳.۵ درخواستِ بلندتر از فایل، بیشترین صدای ممکن را می‌دهد نه کمترین',
     Math.abs(over.length - 6 * CFG.SAMPLE_RATE) <= 2, over.length + '');
  const late2 = musicSamples_(w, info, 5, 3);
  ok('۳.۵-ب و شروعِ دیرهنگام عقب کشیده می‌شود تا طولِ کامل برسد',
     Math.abs(late2.length - 3 * CFG.SAMPLE_RATE) <= 2, late2.length + '');
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

  /* ۶٫۷۰: «یهو قطع نشه؛ با شیبِ ملایم‌تری محو بشه.» شیبِ خطی در لحظهٔ
     رسیدن به سکوت هنوز با سرعتِ کامل پایین می‌رود؛ S در هر دو سر شیبِ
     صفر دارد. سنجه: در ۱۰٪ مانده به آخرِ محو، خطی ۰٫۱ می‌داد (~۱۰۰۰)؛
     S زیر ۰٫۰۳ است (~۲۵۰). همین آستانه دو شیب را از هم جدا می‌کند. */
  const f2 = musicShape_(flat(), 1, 2, 2);
  const foN = 2 * CFG.SAMPLE_RATE;
  ok('۴.۷ فرودِ محو S است، نه خطی — لحظهٔ خاموشی شنیده نمی‌شود',
     Math.abs(f2[f2.length - Math.floor(foN * 0.1)]) < 0.03 * 10000,
     f2[f2.length - Math.floor(foN * 0.1)] + '');
  ok('۴.۷-ب و ورودش هم آهسته می‌خزد، نه با خطِ راست',
     Math.abs(f2[Math.floor(foN * 0.1)]) < 0.03 * 10000,
     f2[Math.floor(foN * 0.1)] + '');
}

console.log('\n=== ۴-ب. بسترِ پایانی — musicBedIn_ (۶٫۷۰) ===');
{
  /* «از چند ثانیه قبل از اینکه گوینده آخرین جملات رو بگه موسیقی شروع به
     پخش کنه با شیبِ ملایم و بعدش کم‌کم زیاد بشه.» سرِ قطعهٔ پایان دو
     مرحله دارد: تا سطحِ بستر زیرِ گفتار، بعد اوج تا بلندیِ کامل. */
  const SR2 = CFG.SAMPLE_RATE;
  const mk = (sec) => { const a = []; for (let i = 0; i < SR2 * sec; i++) a.push(10000); return a; };
  const b = musicBedIn_(mk(20), 6, 3, 0.35);
  ok('۴-ب.۱ از سکوت شروع می‌شود', Math.abs(b[0]) < 100, b[0] + '');
  ok('۴-ب.۲ در پایانِ بستر، به سطحِ بستر رسیده — نه بیشتر',
     Math.abs(b[6 * SR2 - 2] - 3500) < 200, b[6 * SR2 - 2] + '');
  ok('۴-ب.۳ نیمهٔ بستر، نیمهٔ سطحِ بستر است — S از وسطش می‌گذرد',
     Math.abs(b[3 * SR2] - 1750) < 150, b[3 * SR2] + '');
  ok('۴-ب.۴ و در ربعِ اول از ربعِ خطی کم‌صداتر است — ورودِ ملایم',
     b[Math.floor(1.5 * SR2)] < 0.25 * 3500, b[Math.floor(1.5 * SR2)] + '');
  ok('۴-ب.۵ بعد از رفتنِ گفتار، کم‌کم اوج می‌گیرد و کامل می‌شود',
     Math.abs(b[9 * SR2 + 10] - 10000) < 150 && b[7 * SR2] > 3500 &&
     b[7 * SR2] < 7000, b[7 * SR2] + ' → ' + b[9 * SR2 + 10]);
  ok('۴-ب.۶ و بقیهٔ قطعه دست‌نخورده است', b[12 * SR2] === 10000);

  // قطعهٔ کوتاه: بستر و اوج با هم کوچک می‌شوند، نه اینکه کل قطعه را بخورند.
  const s = musicBedIn_(mk(8), 6, 3, 0.35);
  let full = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === 10000) full++;
  ok('۴-ب.۷ در قطعهٔ کوتاه دستِ‌کم ۳۰٪ با بلندیِ کامل می‌ماند',
     full >= Math.floor(s.length * 0.3) - 2, full + ' از ' + s.length);
  ok('۴-ب.۸ و باز از سکوت شروع می‌شود', Math.abs(s[0]) < 100);

  // و اتصال به مسیرِ واقعی: clipOf برای پایانْ bedIn می‌فرستد و محوِ ورود صفر.
  const fs2 = require('fs');
  const p23s = fs2.readFileSync('src/23_Music.gs', 'utf8');
  ok('۴-ب.۹ برشِ قطعه bedIn را می‌شناسد و بعدِ شکلِ اصلی اعمالش می‌کند',
     /if \(opt\.bedIn\) musicBedIn_\(s, opt\.bedIn\.under, opt\.bedIn\.rise, opt\.bedIn\.bed\)/.test(p23s));
  ok('۴-ب.۱۰ و لبهٔ «bed» محوِ ورودِ صفر می‌گیرد — دو شیب در هم ضرب نشوند',
     /opts\.inEdge === 'bed'\) \? 0/.test(p23s));
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


/* ۷. حالتِ خودکار.

   خواسته این بود که خودِ سیستم حال‌وهوا و قطعه و جای برش را تعیین کند، نه
   اینکه آدم سه ستون را پر کند. ولی «مدل تصمیم می‌گیرد» نباید یعنی «مدل هرچه
   گفت». شناسه‌ای که در بانک نیست باید دور ریخته شود و قاعده جایش را بگیرد،
   وگرنه یک شناسهٔ ساختگی قسمت را بی‌موسیقی می‌کند.                          */
console.log('\n=== ۷. انتخابِ خودکار با مدل ===');
{
  const bank = [
    { row: 2, id: 'A', name: 'calm-piano', mood: 'آرام، امیدوار', slots: 'شروع، پایان', sec: 40, gain: 1, used: 0, lastAt: '' },
    { row: 3, id: 'B', name: 'news-hit',   mood: 'کوبنده، خبری',  slots: 'شروع',        sec: 30, gain: 1, used: 5, lastAt: '' },
    { row: 4, id: 'C', name: 'short-sting', mood: 'خنثی',         slots: 'میانه',       sec: 6,  gain: 1, used: 1, lastAt: '' }
  ];
  const realGem = global.geminiText_;

  global.geminiText_ = () => ({ introId: 'B', introStart: 5, outroId: 'A', outroStart: 12,
                                bridgeId: 'C', gain: 0.5, mood: 'کوبنده، خبری', why: 'قسمتِ خبری' });
  let plan = musicPlanModel_(bank, { title: 'ت', category: 'سیاسی و خبری' });
  ok('۷.۱ انتخابِ مدل پذیرفته می‌شود', plan.introId === 'B' && plan.outroId === 'A',
     JSON.stringify(plan).slice(0, 90));
  ok('۷.۲ ثانیهٔ شروعِ برش هم می‌آید', plan.introStart === 5 && plan.outroStart === 12);
  ok('۷.۳ بلندی در بازهٔ مجاز پذیرفته می‌شود', plan.gain === 0.5);

  global.geminiText_ = () => ({ introId: 'شناسهٔ-ساختگی', outroId: 'A', mood: 'آرام' });
  plan = musicPlanModel_(bank, {});
  ok('۷.۴ شناسهٔ ساختگی دور ریخته می‌شود', plan.introId === '', JSON.stringify(plan.introId));
  ok('۷.۵ ولی شناسهٔ درستِ کنارش می‌ماند', plan.outroId === 'A');

  global.geminiText_ = () => ({ introId: 'A', gain: 99, mood: 'آرام' });
  plan = musicPlanModel_(bank, {});
  ok('۷.۶ بلندیِ بیرون از بازه پذیرفته نمی‌شود', plan.gain === 0);

  global.geminiText_ = () => { throw new Error('مدل جواب نداد'); };
  ok('۷.۷ شکستِ مدل، تولید را زمین نمی‌زند', musicPlanModel_(bank, {}) === null);

  const savedAuto = CFG.MUSIC_AUTO;
  CFG.MUSIC_AUTO = false;
  global.geminiText_ = () => ({ introId: 'A', mood: 'آرام' });
  ok('۷.۸ با خاموش‌بودنِ حالتِ خودکار، اصلاً از مدل پرسیده نمی‌شود',
     musicPlanModel_(bank, {}) === null);
  CFG.MUSIC_AUTO = savedAuto;

  // قاعده باید همچنان مستقل کار کند — پشتیبانِ حالتِ خودکار همین است
  const byRule = musicPick_(bank, 'شروع', 'کوبنده خبری');
  ok('۷.۹ قاعده هم بی مدل کار می‌کند', byRule && byRule.id === 'B', byRule && byRule.id);
  const calm = musicPick_(bank, 'شروع', 'آرام امیدوار');
  ok('۷.۱۰ و حال‌وهوای دیگر، قطعهٔ دیگری می‌آورد', calm && calm.id === 'A', calm && calm.id);
  ok('۷.۱۱ برای جایگاهی که قطعه ندارد، چیزی برنمی‌گرداند',
     musicPick_(bank, 'جایگاهِ‌ناموجود', 'آرام') === null);

  /* ══ ۷٫۱۲ زمینه، هرگز شروع یا پایان (۶٫۸۸) ══
     دو شبِ پیاپی موسیقیِ آغازِ درس‌نامه یک درونِ گرانولار بود: صاحبِ برنامه
     شنید «یکی دارد آرام زمزمه می‌کند» و فردایش «سوتِ زودپز». هیچ سدی
     نشکسته بود — آن فایل‌ها واقعاً موسیقی‌اند و همهٔ سنجه‌ها را می‌گذرانند.
     جایگاهشان را `musicAutoTag_` از روی **نامِ فایل** حدس زده بود، تابعی
     که هرگز صدا را نمی‌شنود، با پیش‌فرضِ «شروع، پایان».
     پس سد باید در خودِ انتخاب باشد، نه در برچسبی که همان حدس‌زن نوشته. */
  const drone = { id: 'D', name: 'زمزمهٔ کشیده', kind: 'موسیقی', mood: 'آرام',
                  slots: 'شروع، پایان، میانه', sec: 120, used: 0, lastAt: '',
                  gain: 0.8, heard: '✅ مدل شنید: زمینهٔ کشیده — نه شروع، نه پایان',
                  note: 'خودکار — می‌توانید عوضش کنید' };
  const onlyDrone = [drone];
  ok('۷.۱۲ زمینه برای «شروع» انتخاب نمی‌شود، حتی وقتی تنها گزینه است',
     musicPick_(onlyDrone, 'شروع', 'آرام') === null);
  ok('۷.۱۲-ب و برای «پایان» هم نه',
     musicPick_(onlyDrone, 'پایان', 'آرام') === null);
  ok('۷.۱۲-پ ولی برای «میانه» بله — زیرِ حرف نشستن کارِ همین است',
     (musicPick_(onlyDrone, 'میانه', 'آرام') || {}).id === 'D');

  // و اگر آدم خودش نوشته باشد، انتخابِ او می‌مانَد: سلیقهٔ کاربر پاک نمی‌شود.
  const human = [Object.assign({}, drone, { note: 'خودم گوش دادم، برای شروع خوب است' })];
  ok('۷.۱۳ اگر یادداشت را آدم نوشته باشد، سد برداشته می‌شود',
     (musicPick_(human, 'شروع', 'آرام') || {}).id === 'D');

  // ردیفی که هرگز شنیده نشده، سدِ لبه نمی‌خورد — سدِ «نامعلوم» جای دیگری است
  const unheard = [Object.assign({}, drone, { heard: '', note: '' })];
  ok('۷.۱۴ ردیفِ بی‌داوری با این سد کنار گذاشته نمی‌شود',
     (musicPick_(unheard, 'شروع', 'آرام') || {}).id === 'D');

  // مدل عددها را رشته می‌فرستد (قالب‌ها عمداً رشته‌ای‌اند، چون همین مدل قالبِ
  // عددی را رد می‌کند). پس تبدیل باید همین‌جا انجام شود.
  global.geminiText_ = () => ({ introId: 'A', introStart: '7', gain: '0.4', mood: 'آرام' });
  plan = musicPlanModel_(bank, {});
  ok('۷.۱۲ عددِ رشته‌ای درست خوانده می‌شود',
     plan.introStart === 7 && plan.gain === 0.4, JSON.stringify(plan.introStart) + ' / ' + plan.gain);
  global.geminiText_ = () => ({ introId: 'A', introStart: 'سه', gain: 'زیاد', mood: 'آرام' });
  plan = musicPlanModel_(bank, {});
  ok('۷.۱۳ عددِ نامفهوم به صفر می‌افتد، نه به NaN',
     plan.introStart === 0 && plan.gain === 0);

  global.geminiText_ = realGem;
}


/* ۸. موسیقی نباید قسمت را دو تکه کند، و نباید نامرئی بماند.

   سه چیز را سؤالِ صاحبِ برنامه بیرون کشید و هر سه واقعی بودند:
   درس‌نامه اصلاً موسیقی نمی‌گرفت؛ بودجهٔ یک فایل جای موسیقی را کنار نگذاشته
   بود (اتفاقاً جا می‌شد، که تضمین نیست)؛ و موسیقی نه در وضعیت بود نه در
   وارسیِ سلامت — یعنی همان نقطهٔ کوری که درس‌نامه داشت.                      */
console.log('\n=== ۸. بودجهٔ زمان و دیده‌شدن ===');
{
  const budget = musicBudgetSec_();
  ok('۸.۱ بودجهٔ موسیقی حساب می‌شود', budget > 0, budget + ' ثانیه');
  const speech = oneFileMaxChars_() / (CFG.SPEECH_CHARS_PER_SEC || 13.7);
  const cap = CFG.MERGE_MAX_BYTES / ((CFG.SAMPLE_RATE || 24000) * 2);
  ok('۸.۲ گفتار + موسیقی زیرِ سقفِ یک فایل می‌ماند', speech + budget <= cap,
     Math.round(speech + budget) + ' از ' + Math.round(cap) + ' ثانیه');

  // اگر موسیقی بلندتر شود، سقفِ گفتار باید خودش پایین بیاید
  const savedI = CFG.MUSIC_INTRO_SEC, savedO = CFG.MUSIC_OUTRO_SEC;
  const before = oneFileMaxChars_();
  CFG.MUSIC_INTRO_SEC = 60; CFG.MUSIC_OUTRO_SEC = 60;
  const after = oneFileMaxChars_();
  ok('۸.۳ موسیقیِ بلندتر، سقفِ گفتار را پایین می‌آورد', after < before,
     before + ' → ' + after);
  const speech2 = after / (CFG.SPEECH_CHARS_PER_SEC || 13.7);
  ok('۸.۴ و باز هم از سقف نمی‌گذرد', speech2 + musicBudgetSec_() <= cap,
     Math.round(speech2 + musicBudgetSec_()) + ' از ' + Math.round(cap));
  CFG.MUSIC_INTRO_SEC = savedI; CFG.MUSIC_OUTRO_SEC = savedO;

  const savedE = CFG.MUSIC_ENABLED;
  CFG.MUSIC_ENABLED = false;
  ok('۸.۵ با موسیقیِ خاموش، بودجه صفر است', musicBudgetSec_() === 0);
  CFG.MUSIC_ENABLED = savedE;

  // هر دو برنامه باید از همین مسیر بگذرند
  const fs2 = require('fs');
  const prod = fs2.readFileSync('src/03_Producer.gs', 'utf8');
  const spec = fs2.readFileSync('src/14_Special.gs', 'utf8');
  ok('۸.۶ «از همه جا از همه رنگ» موسیقی می‌گیرد', prod.indexOf('musicWrap_(') !== -1);
  ok('۸.۷ «درس‌نامه» هم موسیقی می‌گیرد', spec.indexOf('musicWrap_(') !== -1);
  ok('۸.۸ و هر دو استفاده را ثبت می‌کنند',
     prod.indexOf('musicRecordOnce_') !== -1 && spec.indexOf('musicRecordOnce_') !== -1);
  /* و از راهِ یک‌بارِه، نه مستقیم. صداگذاری برای مهلتِ شش‌دقیقه‌ای چند بار
     از سر گرفته می‌شود و buildChunks_ هر بار از نو اجرا می‌شود؛ فراخوانِ
     مستقیمِ musicMarkUsed_/musicRemember_ یعنی شمارندهٔ «بارِ استفاده» سه
     برابر و — بدتر — حافظهٔ «قسمتِ قبل» که انتخابِ همین قسمت را عوض می‌کند.
     در قسمتِ ۱۸ همین شد. */
  ok('۸.۸-ب و هیچ‌کدام مستقیم ثبت نمی‌کنند',
     prod.indexOf('musicMarkUsed_(') === -1 && spec.indexOf('musicMarkUsed_(') === -1 &&
     prod.indexOf('musicRemember_(') === -1 && spec.indexOf('musicRemember_(') === -1);

  const health = fs2.readFileSync('src/08_Health.gs', 'utf8');
  ok('۸.۹ موسیقی در فایلِ وضعیت می‌آید', health.indexOf('musicStatus_()') !== -1);
  ok('۸.۱۰ و وارسیِ سلامت هم می‌سنجدش', health.indexOf('بانکِ موسیقی خالی است') !== -1);
  // بانکِ خالی حالتِ طبیعی است و نباید هر روز هشدار بدهد؛ ایراد آن است که
  // بانک قطعه دارد و باز هم چیزی پخش نشده.
  ok('۸.۱۱ بانکِ خالی یادداشت است نه ایراد',
     health.indexOf("notes.push('بانکِ موسیقی خالی است") !== -1);
  ok('۸.۱۲ ولی پخش‌نشدن با بانکِ پر، ایراد است',
     health.indexOf("هیچ موسیقی‌ای پخش نشد") !== -1);
}


/* ۹. شناختِ فایل از روی خودِ موج، نه نامش.

   نامِ فایل حدس است. «calm-piano.wav» ممکن است سکوت باشد، دانلودِ نصفه باشد،
   یا چیزِ دیگری. پس سلامت اندازه گرفته می‌شود.                               */
console.log('\n=== ۹. اندازه‌گیریِ فایل ===');
{
  const sine = (amp, hz) => mkWav(CFG.SAMPLE_RATE, 1, 16, 3,
    f => Math.round(amp * Math.sin(2 * Math.PI * hz * f / CFG.SAMPLE_RATE)));

  const good = sine(9000, 220);
  const pg = musicProbe_(good, wavInfo_(good));
  ok('۹.۱ موسیقیِ سالم پذیرفته می‌شود', musicVerdict_(pg).ok, JSON.stringify(pg));
  ok('۹.۲ بلندی اندازه گرفته می‌شود', pg.rms > 4000 && pg.rms < 9000, pg.rms + '');
  ok('۹.۳ سکوتِ ناچیز', pg.silentPct === 0);

  const silent = mkWav(CFG.SAMPLE_RATE, 1, 16, 3, () => 0);
  const ps = musicProbe_(silent, wavInfo_(silent));
  const vs = musicVerdict_(ps);
  ok('۹.۴ فایلِ سکوت رد می‌شود', !vs.ok, vs.why);

  const tiny = mkWav(CFG.SAMPLE_RATE, 1, 16, 3, () => 20);
  const vt = musicVerdict_(musicProbe_(tiny, wavInfo_(tiny)));
  ok('۹.۵ فایلِ تقریباً بی‌صدا هم رد می‌شود', !vt.ok, vt.why);

  const short = mkWav(CFG.SAMPLE_RATE, 1, 16, 1, () => 9000);
  ok('۹.۶ قطعهٔ یک‌ثانیه‌ای هم رد می‌شود',
     !musicVerdict_(musicProbe_(short, wavInfo_(short))).ok);

  // بافت: فرکانسِ بالا باید نرخِ گذر از صفر را بالا ببرد
  const low = musicProbe_(sine(9000, 80), wavInfo_(sine(9000, 80)));
  const high = musicProbe_(sine(9000, 4000), wavInfo_(sine(9000, 4000)));
  ok('۹.۷ فرکانسِ بالاتر، نرخِ گذر از صفرِ بیشتر', high.zcr > low.zcr * 3,
     low.zcr + ' → ' + high.zcr);
  ok('۹.۸ و در توصیفِ بافت دیده می‌شود',
     musicTexture_(low).indexOf('نرم') !== -1 && musicTexture_(high).indexOf('پرنویز') !== -1,
     musicTexture_(low) + ' | ' + musicTexture_(high));
  ok('۹.۹ دادهٔ ناقص، اندازه‌گیری را زمین نمی‌زند', musicProbe_([1, 2, 3], null) === null);
}

/* ۱۰. خویشتن‌داری در افکت.

   «یک بار اسمِ باران آمد» نباید صدای باران بسازد. معیار باید ساختاری باشد،
   و درس‌نامه اصلاً افکت نگیرد.                                              */
console.log('\n=== ۱۰. افکت فقط وقتی بجاست ===');
{
  const secs = [
    { heading: 'شهر و باران', narration: 'در این بخش از باران می‌گوییم.' },
    { heading: 'اقتصاد', narration: 'یک بار به باران اشاره شد و تمام.' },
    { heading: 'طبیعت', narration: 'باران آمد. باران بند نیامد. باران همه‌جا بود.' }
  ];
  const picks = [0, 1, 2].map(i => ({ section: i, word: 'باران', id: 'X' }));
  const savedCap = CFG.MUSIC_SFX_MAX_PER_EP, savedOn = CFG.MUSIC_SFX_ENABLED;

  CFG.MUSIC_SFX_MAX_PER_EP = 5;
  const v = sfxAllow_(secs, picks, 'variety');
  ok('۱۰.۱ واژه در سرِ بخش، بجاست', v.some(x => x.section === 0));
  ok('۱۰.۲ تکرارِ چندباره در همان بخش، بجاست', v.some(x => x.section === 2));
  ok('۱۰.۳ اشارهٔ گذرا (یک بار) رد می‌شود', !v.some(x => x.section === 1),
     JSON.stringify(v.map(x => x.section)));

  CFG.MUSIC_SFX_MAX_PER_EP = 1;
  ok('۱۰.۴ سقفِ هر قسمت رعایت می‌شود', sfxAllow_(secs, picks, 'variety').length === 1);
  ok('۱۰.۵ درس‌نامه اصلاً افکت نمی‌گیرد', sfxAllow_(secs, picks, 'special').length === 0);
  CFG.MUSIC_SFX_ENABLED = false;
  ok('۱۰.۶ و با خاموش‌بودن، هیچ', sfxAllow_(secs, picks, 'variety').length === 0);
  CFG.MUSIC_SFX_ENABLED = savedOn; CFG.MUSIC_SFX_MAX_PER_EP = savedCap;

  ok('۱۰.۷ واژهٔ کوتاه یا خالی پذیرفته نمی‌شود',
     sfxAllow_(secs, [{ section: 0, word: 'ا', id: 'X' }], 'variety').length === 0);
  ok('۱۰.۸ بخشِ ناموجود، خطا نمی‌سازد',
     sfxAllow_(secs, [{ section: 99, word: 'باران', id: 'X' }], 'variety').length === 0);
}

console.log('=== ۱۱) بن‌بستِ بانکِ خالی، لینک، و تاریخچه ===');
{
  // ۱۱٫۱ — مهم‌ترین: بانکِ خالی باید خواسته بنویسد، وگرنه هرگز پر نمی‌شود.
  // بی این، همان نقشه‌ای که «عمداً موسیقی نمی‌گذارم تا سیستم خودش دانلود کند»
  // بی‌صدا شکست می‌خورد: موسیقی نیست چون بانک خالی است، و بانک خالی می‌ماند
  // چون هیچ خواسته‌ای نوشته نشده.
  const hub = getHub_();
  const old = hub.getSheetByName(CFG.MUSIC_TAB);
  if (old) hub.deleteSheet(old);
  const it0 = global.__ROOT_FOLDER.getFilesByName(MUSIC_WISH_());
  while (it0.hasNext()) it0.next().setTrashed(true);

  const r = musicWrap_([{ text: 'الف' }], hub, { category: 'طنز و سرگرمی', title: 'ت' });
  ok('۱۱.۱ بانکِ خالی هم خواسته می‌نویسد', !!getOutJson_(MUSIC_WISH_()),
     JSON.stringify(r.missing));
  const w = getOutJson_(MUSIC_WISH_());
  ok('۱۱.۲ خواسته شروع و پایان را می‌خواهد',
     JSON.stringify(w.items[w.items.length - 1].slots).indexOf('شروع') !== -1);
  ok('۱۱.۳ و تکه‌های گفتار دست‌نخورده برمی‌گردند', r.chunks.length === 1);

  // ۱۱٫۴ — ستونِ لینک
  const f = musicFolder_().createFile(
    Utilities.newBlob(mkWav(24000, 1, 16, 20, i => 1000), 'audio/wav', 'calm.wav'));
  musicScan_(hub);
  const sh = hub.getSheetByName(CFG.MUSIC_TAB);
  const row = sh.getRange(2, 1, 1, MUSIC_HEADERS.length).getValues()[0];
  ok('۱۱.۴ ستونِ لینک پر می‌شود',
     String(row[MC.LINK - 1]).indexOf('drive.google.com') !== -1, String(row[MC.LINK - 1]));

  // ۱۱٫۵ — تاریخچه: کدام قطعه، کدام قسمت، کدام جایگاه
  const bank = musicBank_(hub);
  bank[0].slot = 'شروع';
  musicMarkUsed_(hub, [bank[0]], 'قسمت 7', 'از همه جا از همه رنگ');
  const hs = hub.getSheetByName(CFG.MUSE_TAB);
  ok('۱۱.۵ تبِ تاریخچه ساخته شد', !!hs);
  const h = hs.getRange(2, 1, 1, MUSE_HEADERS.length).getValues()[0];
  ok('۱۱.۶ جایگاه ثبت می‌شود', String(h[MU.SLOT - 1]) === 'شروع', String(h[MU.SLOT - 1]));
  ok('۱۱.۷ نامِ برنامه و قسمت هم', String(h[MU.SHOW - 1]) === 'از همه جا از همه رنگ' &&
     String(h[MU.EP - 1]) === 'قسمت 7');
  ok('۱۱.۸ و لینکِ خودِ قطعه', String(h[MU.LINK - 1]).indexOf('drive.google.com') !== -1);
  ok('۱۱.۹ شمارندهٔ ردیفِ بانک هم بالا رفت',
     Number(sh.getRange(2, MC.USED).getValue()) === 1);
}

console.log('=== ۱۲) موسیقیِ میانه سرِ مرزِ بخش‌ها، نه هر چند تکه ===');
{
  const hub = getHub_();
  // بانکی با یک قطعهٔ «میانه»
  const sh = hub.getSheetByName(CFG.MUSIC_TAB);
  musicFolder_().createFile(
    Utilities.newBlob(mkWav(24000, 1, 16, 12, i => 900), 'audio/wav', 'bridge.wav'));
  musicScan_(hub);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  for (let r = 0; r < rows.length; r++) {
    if (String(rows[r][MC.NAME - 1]) === 'bridge.wav') {
      sh.getRange(r + 2, MC.SLOTS).setValue('میانه');
    }
  }

  // شش تکه، ولی فقط دو مرزِ واقعی: تکهٔ ۱ (بخش الف) و تکهٔ ۴ (بخش ب)
  const chunks = [];
  for (let i = 0; i < 6; i++) chunks.push({ text: 'ت' + i });
  const bounds = [
    { at: 0, kind: 'hook', heading: '' },
    { at: 1, kind: 'body', heading: 'بخشِ الف' },
    { at: 4, kind: 'body', heading: 'بخشِ ب' },
    { at: 6, kind: 'outro', heading: '' }
  ];
  global.__STUB = () => ({ code: 200, json: { candidates: [{ content: { parts: [{
    text: '{"mood":"آرام"}' }] } }] } });

  const r = musicWrap_(chunks, hub, { mood: 'آرام', bounds: bounds, show: 'variety' });
  const at = [];
  r.chunks.forEach((c, i) => { if (c.pcm && /میانه/.test(c.label || '')) at.push(i); });
  ok('۱۲.۱ حداکثر یک قطعهٔ میانه در پشتوانه', at.length <= 1, 'تعداد: ' + at.length);

  // مهم‌ترین: موسیقی نباید وسطِ روایتِ یک بخش بیفتد. تکه‌های گفتار را
  // بشمار و ببین موسیقی دقیقاً سرِ یکی از مرزهاست.
  let spoken = -1, okPos = true;
  for (const c of r.chunks) {
    if (c.pcm) {
      if (/میانه/.test(c.label || '')) {
        const nextSpoken = spoken + 1;
        if (!bounds.some(b => b.at === nextSpoken)) okPos = false;
      }
      continue;
    }
    spoken++;
  }
  ok('۱۲.۲ موسیقی دقیقاً سرِ مرزِ یک بخش می‌نشیند، نه وسطِ بخش', okPos);

  // مدل می‌تواند مرز و قطعه را انتخاب کند
  const bank = musicBank_(hub);
  const brId = bank.filter(b => b.slots.indexOf('میانه') !== -1)[0].id;
  const r2 = musicWrap_(chunks, hub, { mood: 'آرام', bounds: bounds, show: 'variety',
    plan: { bridges: [{ after: '1', id: brId }] } });
  let sp2 = -1, atIdx = -1;
  for (const c of r2.chunks) {
    if (c.pcm) { if (/میانه/.test(c.label || '')) atIdx = sp2 + 1; continue; }
    sp2++;
  }
  ok('۱۲.۳ مرزی که مدل گفت رعایت می‌شود', atIdx === 4, 'سرِ تکهٔ ' + atIdx);

  // شناسهٔ ساختگی و مرزِ بیرون از بازه دور ریخته می‌شوند
  const r3 = musicWrap_(chunks, hub, { mood: 'آرام', bounds: bounds, show: 'variety',
    plan: { bridges: [{ after: '99', id: brId }, { after: '0', id: 'GHOST' }] } });
  const n3 = r3.chunks.filter(c => c.pcm && /میانه/.test(c.label || '')).length;
  ok('۱۲.۴ مرزِ بیرون از بازه و شناسهٔ ساختگی رد می‌شوند', n3 <= 1, 'تعداد: ' + n3);

  // بی هیچ مرزی (مثلِ درس‌نامه که bounds نمی‌دهد) نباید بترکد
  const r4 = musicWrap_(chunks, hub, { mood: 'آرام', show: 'special' });
  ok('۱۲.۵ بی مرز هم کار می‌کند', Array.isArray(r4.chunks));
}

// ۵٫۶۲ — شناسنامه‌ها قطعه نیستند
{
  const F = musicFolder_();
  F.createFile(Utilities.newBlob('{"title":"x"}', 'application/json',
                                 '_MUSIC-META-x.json'));
  const before = musicScan_();
  let listed = false;
  const sh = getHub_().getSheetByName(CFG.MUSIC_TAB);
  const last = sh.getLastRow();
  if (last > 1) {
    const v = sh.getRange(2, MC.NAME, last - 1, 1).getValues();
    listed = v.some(r => /_MUSIC-META-/.test(String(r[0])));
  }
  console.log((!listed ? '  ✅' : '  ❌') +
    ' شناسنامهٔ JSON به‌عنوان قطعهٔ «ناسازگار» فهرست نمی‌شود');
  if (listed) throw new Error('sidecar catalogued as a broken track');
}

// ۶٫۸۷ — WAVِ اعشاری (IEEE float) دیگر رد نمی‌شود، درست خوانده می‌شود
console.log('\n=== ۱۳. WAVِ اعشاری (IEEE float) ===');
{
  function floatBytesLE_(v) {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, v, true);
    return Array.from(new Uint8Array(buf)).map(x => x > 127 ? x - 256 : x);
  }
  function mkWavFloat(rate, ch, seconds, sampleAt) {
    const frames = Math.floor(rate * seconds);
    const bps = 4, dataLen = frames * ch * bps;
    const b = [];
    const str = s => { for (const c of s) b.push(c.charCodeAt(0)); };
    const u32 = v => b.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
    const u16 = v => b.push(v & 255, (v >>> 8) & 255);
    str('RIFF'); u32(36 + dataLen); str('WAVE');
    str('fmt '); u32(16); u16(3); u16(ch); u32(rate);   // فرمتِ ۳ = اعشاریِ IEEE
    u32(rate * ch * bps); u16(ch * bps); u16(32);
    str('data'); u32(dataLen);
    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < ch; c++) b.push(...floatBytesLE_(sampleAt(f, c)));
    }
    return b;
  }

  const info = wavInfo_(mkWavFloat(44100, 1, 0.1, () => 0.5));
  ok('۱۳.۱ فرمت و عمق درست خوانده شد', info.format === 3 && info.bits === 32);
  ok('۱۳.۲ اعشاری شناخته می‌شود', wavIsFloat32_(info) === true);
  ok('۱۳.۳ PCMِ صحیح حساب نمی‌شود', wavIsPcm_(info) === false);
  ok('۱۳.۴ ولی خواندنی است', wavReadable_(info) === true);

  const w = mkWavFloat(44100, 1, 1, () => 0.5);
  const s = musicSamples_(w, wavInfo_(w), 0, 1);
  const mid = s[Math.floor(s.length / 2)];
  ok('۱۳.۵ نمونهٔ ۰٫۵ به مقیاسِ PCM رسید (≈۱۶۳۸۴)', Math.abs(mid - 16384) < 50, mid + '');

  const wNeg = mkWavFloat(44100, 1, 1, () => -1);
  const sNeg = musicSamples_(wNeg, wavInfo_(wNeg), 0, 1);
  const midNeg = sNeg[Math.floor(sNeg.length / 2)];
  ok('۱۳.۶ نمونهٔ ‎-۱ به ‎-۳۲۷۶۷ رسید', Math.abs(midNeg - (-32767)) < 5, midNeg + '');

  // موجِ سینوسیِ اعشاری، مثلِ خروجیِ واقعیِ یک DAW یا archive.org
  const wSine = mkWavFloat(44100, 1, 2, f => Math.sin(2 * Math.PI * 440 * f / 44100) * 0.6);
  const infoS = wavInfo_(wSine);
  const pr = musicProbe_(wSine, infoS);
  ok('۱۳.۷ سنجه روی فایلِ اعشاری هم کار می‌کند', !!pr && pr.rms > 0, JSON.stringify(pr));
  const vd = musicVerdict_(pr, infoS);
  ok('۱۳.۸ فایلِ اعشاریِ سالم دیگر رد نمی‌شود (باگِ ۹ نامزدِ رد‌شده)', vd.ok === true, JSON.stringify(vd));

  // فرمتِ واقعاً ناشناخته (نه ۱، نه ۳/۳۲) هنوز درست رد می‌شود
  const wBad = mkWav(44100, 1, 16, 0.1, () => 100);
  wBad[20] = 7; // فرمت را به یک عددِ ناشناخته دستکاری کن
  const infoBad = wavInfo_(wBad);
  ok('۱۳.۹ فرمتِ واقعاً ناشناخته هنوز رد می‌شود', wavReadable_(infoBad) === false, infoBad.format + '');
}

console.log('\n✅ هر ' + pass + ' آزمونِ بانکِ موسیقی گذشت.');
