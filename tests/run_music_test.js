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
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs', '33_VoiceIntake.gs', '34_Search.gs', '35_Embed.gs', '36_VoiceBridge.gs'];
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
  /* ══ بانکِ نمونه باید تأییدِ شنیداری داشته باشد (۷٫۶۸) ══
     تا ۷٫۶۶ هر سه ردیف `heard` نداشتند و همه‌چیز سبز بود — یعنی بدَل
     دقیقاً همان حالتی را عادی نشان می‌داد که در تولید فاجعه بود. بدَلی
     که در جایی سهل‌گیر باشد که تولید باید سخت‌گیر باشد، هیچ چیزی را
     ثابت نمی‌کند (۷٫۲۴). حالا شنیده‌شده‌اند، و نشنیده‌ها سنجهٔ خودشان
     را دارند (۷٫۱۴). */
  const HEARD = '✅ مدل شنید: آهنگ';
  const bank = [
    { row: 2, id: 'A', name: 'calm-piano', mood: 'آرام، امیدوار', slots: 'شروع، پایان', sec: 40, gain: 1, used: 0, lastAt: '', heard: HEARD },
    { row: 3, id: 'B', name: 'news-hit',   mood: 'کوبنده، خبری',  slots: 'شروع',        sec: 30, gain: 1, used: 5, lastAt: '', heard: HEARD },
    { row: 4, id: 'C', name: 'short-sting', mood: 'خنثی',         slots: 'میانه',       sec: 6,  gain: 1, used: 1, lastAt: '', heard: HEARD }
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

  /* ══ ۷٫۱۴ — و این سنجه تا ۷٫۶۶ **باورِ غلط را قفل کرده بود** ══
     متنِ قبلی‌اش این بود: «ردیفِ بی‌داوری با این سد کنار گذاشته نمی‌شود —
     سدِ «نامعلوم» جای دیگری است». آن «جای دیگر» برای **موسیقی** هرگز
     وجود نداشت: از ۵٫۶۵ فقط جلوی پخشِ *افکت* گرفته می‌شد.

     نتیجه‌اش را صاحبِ برنامه با گوشش پیدا کرد، نه هیچ سنجه‌ای: نفس‌کشیدن،
     صدای موتور و خیابان، سرِ آغاز و پایانِ قسمت‌هایی که منتشر شده بودند.
     مدرکِ مستقیم از درایو، شناسنامهٔ یک قطعهٔ بانک در ۲۳ سپتامبر:
     `"heard": ""` کنارِ `"verdict": "مدل نشنید؛ از روی اندازه‌ها: …"`.

     و راهنمای همین مخزن، دربارهٔ همین بخش، از قبل نوشته بود: «پیش‌فرض ردّ
     است … مدلِ غایب، تأییدِ خاموش نیست». کد خلافش را می‌کرد و **این سنجه
     خلافش را تضمین می‌کرد**. سنجه می‌تواند یک خوانشِ غلط را به همان
     محکمیِ یک خوانشِ درست قفل کند، و هیچ‌چیز در یک مجموعهٔ سبز این دو را
     از هم جدا نمی‌کند (۷٫۴۶). */
  const unheard = [Object.assign({}, drone, { heard: '', note: '' })];
  ok('۷.۱۴ قطعه‌ای که هیچ‌کس نشنیده، آغازِ برنامه نمی‌شود',
     musicPick_(unheard, 'شروع', 'آرام') === null,
     'سکوت از صدای موتور بهتر است');
  ok('۷.۱۴-ب و در هیچ جایگاهِ دیگری هم پخش نمی‌شود',
     musicPick_(unheard, 'میانه', 'آرام') === null &&
     musicPick_(unheard, 'پایان', 'آرام') === null,
     'وسطِ برنامه هم منتشر می‌شود');
  ok('۷.۱۴-پ «❓» هم نامعلوم است، نه تأیید',
     musicPick_([Object.assign({}, drone,
        { heard: '❓ نامعلوم — کسی به این گوش نداده', note: '' })],
        'شروع', 'آرام') === null);
  /* و تنها استثنا آدم است — همان قاعده‌ای که `heardCanEdge_` از روزِ اول
     داشت: سلیقهٔ کاربر پاک نمی‌شود. */
  ok('۷.۱۴-ت ولی اگر آدم یادداشت گذاشته باشد، پخش می‌شود',
     (musicPick_([Object.assign({}, drone,
        { heard: '', note: 'خودم گوش دادم، آهنگِ خوبی است' })],
        'شروع', 'آرام') || {}).id === 'D',
     'یادداشتِ «خودکار — …» یادداشتِ آدم نیست');
  ok('۷.۱۴-ث و یادداشتِ خودکار تأیید نیست',
     musicPick_([Object.assign({}, drone,
        { heard: '', note: 'خودکار — می‌توانید عوضش کنید' })],
        'شروع', 'آرام') === null);
  /* و قطعهٔ تأییدشده باید همچنان پخش شود، وگرنه سد همه‌چیز را بسته است. */
  ok('۷.۱۴-ج قطعهٔ تأییدشده دست‌نخورده پخش می‌شود',
     (musicPick_([Object.assign({}, drone,
        { heard: '✅ مدل شنید: آهنگ', note: 'خودکار — …' })],
        'شروع', 'آرام') || {}).id === 'D');

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

/* ══════════════════════════════════════════════════════════════════════
 * ۱۴) عددی که فقط در یک شیت زندگی می‌کرد (۷٫۶۸)
 *
 * تأییدِ شنیداری از ۵٫۶۵ در تب نوشته می‌شد و صاحبِ برنامه شیت باز
 * نمی‌کند (۵٫۹۰). پس ماه‌ها قطعهٔ نشنیده سرِ آغازِ قسمت‌ها پخش شد و تنها
 * گزارش‌دهنده‌اش گوشِ خودِ او بود. جمله باید **هر روز** بیاید.
 * ══════════════════════════════════════════════════════════════════════ */
console.log('\n=== ۱۴. جملهٔ روزانه و یافتهٔ «نشنیده» ===');
{
  ok('۱۴.۱ وقتی همه شنیده شده‌اند، سطر آرام است',
     !/شنیده‌نشده/.test(musicLine_({ enabled: true, playable: 9, unheard: 0 })),
     musicLine_({ enabled: true, playable: 9, unheard: 0 }));
  const bad = musicLine_({ enabled: true, playable: 2, unheard: 7, unheardEdge: 4 });
  /* «راهِ حل» تا ۸.۳۱ «از منو بزنید» بود — کار به صاحبِ برنامه حواله می‌شد،
     در حالی که موتور خودش هر شب می‌شنود و علتِ انباشت سقفِ ۴۸ توکنیِ خودِ ما
     بود (۸.۳۲). سنجه حالا قراردادِ تازه را می‌گوید: موتور، نه منو. */
  /* ══ ۸.۵۴: این سنجه تا امروز یک وعدهٔ دروغ را تضمین می‌کرد ══
     می‌خواست سطر بگوید «موتور هر شب …» — عددی از CFG، نه از رویداد. سه روز عددِ ۷۱
     تکان نخورد و همان جمله رفت، چون بلوکِ بازشنوی اصلاً اجرا نمی‌شد (۷٫۶۸: سنجه‌ای
     که باگ را تضمین کند). حالا: عدد، بی حواله به منو، و **هیچ** وعدهٔ «هر شب». */
  ok('۱۴.۲ و وقتی نیستند، عدد می‌آید — بی حواله به منو و بی وعدهٔ «هر شب»',
     /شنیده‌نشده/.test(bad) && /۷/.test(bad) && !/از منو/.test(bad) && !/هر شب تا/.test(bad), bad);
  /* «۴۰ قطعه» کنارِ برنامهٔ بی‌موسیقی گمراه‌کننده است — عددی که باید گفته
     شود «قابلِ پخش» است. */
  ok('۱۴.۳ سطر عددِ قابلِ پخش را می‌گوید، نه شمارِ فایل‌ها',
     /قابلِ پخش: ۲/.test(bad), bad);

  /* و یافته: یک شبِ بد یافته نمی‌سازد، ولی وضعی که پاک نشود می‌سازد.
     مُهر را خودِ رویداد می‌نویسد، نه شمارنده‌ای که هر شب بازنشانی شود. */
  const P = props_();
  P.deleteProperty(PK.MUSIC_UNHEARD_AT);
  ok('۱۴.۴ اولین شبِ نشنیده، یافته نمی‌سازد — فقط مُهر می‌زند',
     musicUnheardCheck_(getHub_(), { unheard: 3 }) === false &&
     !!P.getProperty(PK.MUSIC_UNHEARD_AT),
     P.getProperty(PK.MUSIC_UNHEARD_AT) || '—');
  const old = new Date(Date.now() - 9 * 86400000);
  P.setProperty(PK.MUSIC_UNHEARD_AT, Utilities.formatDate(old, CFG.TZ || 'Asia/Dubai', 'yyyy-MM-dd HH:mm'));
  ok('۱۴.۵ ولی ۹ روز که گذشت، می‌سازد',
     musicUnheardCheck_(getHub_(), { unheard: 3 }) === true);
  /* و به محضِ صفر شدن، مُهر پاک می‌شود — وگرنه وضعِ رفع‌شده تا ابد
     گزارش می‌شود، همان چیزی که هشدار را به نویز تبدیل می‌کند. */
  ok('۱۴.۶ و صفر که شد، مُهر پاک می‌شود',
     musicUnheardCheck_(getHub_(), { unheard: 0 }) === false &&
     !P.getProperty(PK.MUSIC_UNHEARD_AT));
  /* سنجندهٔ خودوارسی: تا این عدد بالای صفر است، ردیف با ادعای یک بیانیه
     بسته نمی‌شود (۷٫۵۷). */
  const mp = selfVerifyMap_()['music-unheard'];
  ok('۱۴.۷ و سنجنده‌اش خودِ همان عدد را می‌خواند',
     !!mp && mp.still({ music: { unheard: 3 } }) === true &&
     mp.still({ music: { unheard: 0 } }) === false &&
     mp.still({}) === null && mp.still({ music: {} }) === null,
     'نبودِ عدد یعنی «نمی‌دانم»، نه «حل شد»');
}

/* ══════════════════════════════════════════════════════════════════════
 * ۱۵) دکمهٔ «🔎 بازبینیِ بانک» — پرداختِ یک قلم از دفترِ بدهی (۷٫۷۱)
 *
 * این دکمه در `MENU_DEBT` بود، یعنی هیچ مجموعه‌ای نامش را هم نبرده بود.
 * و امروز همان دکمه‌ای است که به صاحبِ برنامه گفته شد بزند تا صفِ
 * قطعه‌های شنیده‌نشده را خالی کند — یعنی **یک دکمه را توصیه کردم که
 * هرگز فشار داده نشده بود**. درسِ ۷٫۴۳ با نامِ خودش: بازبین اجرا می‌کند،
 * نمی‌خوانَد.
 * ══════════════════════════════════════════════════════════════════════ */
console.log('\n=== ۱۵. دکمهٔ بازبینیِ بانک، واقعاً فشرده ===');
{
  const hub = getHub_();
  const sh = hub.getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  const before = sh ? sh.getLastRow() : 0;

  let threw = '', r = null;
  try { r = runMusicRecheck(); } catch (e) { threw = e.message; }
  ok('۱۵.۱ فشارِ دکمه خطا نمی‌دهد', threw === '', threw);
  /* و چیزی برمی‌گرداند که بشود رویش حساب کرد — دکمه‌ای که کار کند و
     نگوید چه کرد، از دکمهٔ خراب سخت‌تر تشخیص داده می‌شود (۱۹.۴ پل). */
  ok('۱۵.۲ و شمارشش را برمی‌گرداند',
     !!r && typeof r.checked === 'number' && typeof r.moved === 'number' &&
     Object.prototype.toString.call(r.notes) === '[object Array]',
     JSON.stringify(r && { checked: r.checked, moved: r.moved, kept: r.kept }));
  ok('۱۵.۳ و تبِ موسیقی را خراب نمی‌کند',
     !sh || sh.getLastRow() >= before, 'پیش ' + before + ' · پس ' + (sh && sh.getLastRow()));

  /* ══ و مهم‌ترینش: روی بانکِ واقعی چه می‌کند ══
     یک قطعهٔ شنیده‌نشده در بانک بگذار و ببین این دکمه آن را **می‌بیند**.
     اگر نبیند، جمله‌ای که به او گفتم («این دکمه همه را یک‌جا می‌شنود»)
     دروغ بوده. */
  const seenNames = [];
  try {
    const bank = musicBank_();
    for (let i = 0; i < bank.length; i++) {
      if (!heardPlayable_(bank[i].heard, bank[i].note)) seenNames.push(bank[i].name);
    }
  } catch (e) {}
  /* ══ ۱۵.۵ و جمله‌ای که همین اجرا پیدایش کرد ══
     مدل در دسترس نبود، صفر قطعه شنیده شد، دو قطعه بی‌داوری ماندند — و
     پنجره بست با «همه‌شان موسیقی‌اند». «هیچ‌کدام رد نشد» با «همه تأیید
     شدند» یکی نیست، و از ۷٫۶۸ فرقشان این است که دومی یعنی برنامه
     موسیقی دارد و اولی یعنی ندارد. */
  {
    const msg = [];
    const realLog = global.logLine_;
    global.logLine_ = (t) => msg.push(String(t));
    try { runMusicRecheck(); } catch (e) {}
    global.logLine_ = realLog;
    const txt = msg.join(' ');
    const un = musicStatus_().unheard;
    ok('۱۵.۵ با قطعهٔ بی‌داوری، «همه‌شان موسیقی‌اند» گفته نمی‌شود',
       un > 0 ? txt.indexOf('همه‌شان موسیقی‌اند') === -1 : true,
       'نشنیده: ' + un + ' · ' + txt.slice(-150));
    ok('۱۵.۵-ب و می‌گوید که پخش نمی‌شوند',
       un > 0 ? /پخش نمی‌شود/.test(txt) : true, txt.slice(-110));
  }

  ok('۱۵.۴ و شمارِ «شنیده‌نشده» از همان بانکی می‌آید که پخش از آن انتخاب می‌کند',
     typeof musicStatus_().unheard === 'number' &&
     musicStatus_().unheard === seenNames.length,
     'وضعیت ' + musicStatus_().unheard + ' · بانک ' + seenNames.length);
}

console.log('\n=== ۱۹. حلقه‌ای که بسته نمی‌شد: تلاشِ ناموفق هم ثبت می‌شود (۸.۰۳) ===');
{
  /* ══ باگی که صاحبِ برنامه با **گوشش** پیدا کرد و عدد اثباتش کرد ══
   * «چند روز است موسیقی یا کار نمی‌کند یا افتضاح است.» گزارش‌های خودِ موتور:
   *   ۲۹ سپتامبر: ۹۹ قطعه · ۶۲ شنیده‌نشده
   *   ۳۰ سپتامبر: ۱۰۵ قطعه · ۶۸ شنیده‌نشده
   * یعنی در یک شب شش تا آمد و **صفر تا** شنیده شد. علت یک شرط بود:
   * داوری فقط وقتی نوشته می‌شد که مدل **قطعی** جواب داده باشد. مدل که
   * نمی‌شنید، هیچ ردی نمی‌مانْد، و همان قطعه فردا شب دوباره در صف بود —
   * هر شب بایت‌هایش خوانده می‌شد و حلقه هرگز بسته نمی‌شد.
   * و از بیرون «۶۸ شنیده‌نشده» شبیهِ «هنوز نرسیده‌ایم» بود، در حالی که
   * واقعیت «هفته‌هاست می‌پرسیم و جواب نمی‌گیریم» است. */
  const F = musicFolder_();
  const nm = 'قطعهٔ نامعلوم.wav';
  F.createFile(Utilities.newBlob(
    Utilities.newBlob(mkWav(44100, 1, 16, 20, (i) => Math.round(9000 * Math.sin(i / 42))))
      .getBytes(), 'audio/wav', nm));
  musicScan_();

  /* مدل جواب نمی‌دهد — همان حالتی که ماه‌ها واقعاً در آن بودیم. */
  const listenWas = global.musicListen_;
  global.musicListen_ = () => '';

  const r1 = musicRecheck_(null, { onlyUnknown: true, cap: 5, budgetMs: 60000 });
  const meta1 = musicMeta_(nm) || {};
  ok('۱۹.۱ تلاشِ ناموفق ثبت می‌شود، نه اینکه بی‌رد بماند',
     Number(meta1.tries) === 1 && String(meta1.lastTry || '').length > 4,
     'تلاش=' + meta1.tries + ' · ' + (r1.tried || 0) + ' بار مدل جواب نداد');

  /* ۱۹.۲ — و **شمرده بالا می‌رود**: بی این، «چند بار پرسیده‌ایم» را
     نمی‌شود دانست و تفاوتِ «نرسیده‌ایم» با «جواب نمی‌دهد» گم می‌مانَد. */
  musicRecheck_(null, { onlyUnknown: true, cap: 5, budgetMs: 60000 });
  musicRecheck_(null, { onlyUnknown: true, cap: 5, budgetMs: 60000 });
  const meta3 = musicMeta_(nm) || {};
  ok('۱۹.۲ شمارِ تلاش با هر بار بالا می‌رود', Number(meta3.tries) === 3, String(meta3.tries));

  /* ۱۹.۳ — پس از سقف، از صفِ **شبانه** بیرون می‌رود. نه پاک می‌شود و نه
     پخش: فقط هر شب بایت‌هایش خوانده نمی‌شود تا جای بقیه را نگیرد. */
  const tmaxWas = CFG.MUSIC_HEAR_TRY_MAX;
  CFG.MUSIC_HEAR_TRY_MAX = 3;
  const r4 = musicRecheck_(null, { onlyUnknown: true, cap: 5, budgetMs: 60000 });
  const meta4 = musicMeta_(nm) || {};
  ok('۱۹.۳ پس از سقفِ تلاش، از صفِ شبانه بیرون می‌رود',
     Number(meta4.tries) === 3, 'تلاش هنوز ' + meta4.tries + ' · بررسی‌شده ' + r4.checked);

  /* ۱۹.۵ — و وقتی مدل **بشنود**، داوری ثبت می‌شود و قطعه قابلِ پخش می‌شود:
     نیمهٔ دومِ حلقه، وگرنه ۱۹.۱ می‌توانست با «هیچ‌وقت چیزی ثبت نکن» هم سبز
     بماند. */
  CFG.MUSIC_HEAR_TRY_MAX = tmaxWas;
  global.musicListen_ = () => 'آهنگ';
  musicRecheck_(null, { onlyUnknown: true, cap: 5, budgetMs: 60000 });
  const meta5 = musicMeta_(nm) || {};
  ok('۱۹.۵ وقتی مدل می‌شنود، داوری ثبت می‌شود و حلقه بسته می‌شود',
     String(meta5.heard || '').indexOf('آهنگ') !== -1,
     'شنیده=«' + (meta5.heard || '') + '»');

  /* ۱۹.۴ — ولی **دکمهٔ منو بی‌قید است**: دری که آدم بتواند بازش کند بسته
     نمی‌شود (۵.۹۵). بی این، قطعه‌ای که چهار شب بدشانس بود تا ابد بیرون
     می‌مانْد و هیچ‌کس نمی‌توانست برش گرداند. */
  /* **ترتیب مهم است و خودِ سنجه نشانش داد:** نگارشِ اول این بند را پیش از
     ۱۹.۵ گذاشته بودم، و چون بی‌قید است شمارِ تلاش را به سقف رساند — بعد
     ۱۹.۵ روی قطعه‌ای اجرا شد که دیگر در صف نبود و برای کدِ **درست** قرمز شد.
     سنجه‌ای که حالتِ سنجهٔ بعدی را خراب کند، خودش یک باگ است. */
  const rAll = musicRecheck_(null, {});
  ok('۱۹.۴ بازبینیِ بی‌قید (دکمهٔ منو) همه را می‌بیند، حتی از سقف گذشته‌ها',
     rAll.checked >= 1, 'بررسی‌شده ' + rAll.checked);

  global.musicListen_ = listenWas;
}

console.log('\n=== ۲۰. آوردنِ موسیقی پشتِ سرِ انبار می‌ایستد (۸.۰۳) ===');
{
  /* ترتیب در کارِ شبانه: **اول شنیدن، بعد آوردن** — و اگر انبارِ
     شنیده‌نشده پر باشد، اصلاً نیاوریم. آوردنِ چیزی که نمی‌توانیم پخشش
     کنیم نه بانک را بهتر می‌کند نه عدد را؛ فقط هر دو را بدتر می‌کند. */
  const p21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const iHear = p21.indexOf("'بازبینیِ شنیداریِ نامعلوم‌ها'");
  const iGet = p21.indexOf("'گشتن و آوردنِ موسیقی'");
  ok('۲۰.۱ شنیدن پیش از آوردن اجرا می‌شود',
     iHear > 0 && iGet > 0 && iHear < iGet,
     'شنیدن @' + iHear + ' · آوردن @' + iGet);

  ok('۲۰.۲ و انبارِ پر، آوردن را کلاً متوقف می‌کند',
     /MUSIC_UNHEARD_STOP/.test(p21) && /mUnheard >= mStop/.test(p21));

  /* ۲۰.۳ — و این توقف **گفته** می‌شود، نه بی‌صدا: قابلیتی که خودش را
     خاموش کند و کسی نفهمد، همان چیزی است که بانک را هفته‌ها خالی نگه داشت. */
  ok('۲۰.۳ توقفِ آوردن در سیاهه گفته می‌شود',
     /آوردنِ موسیقی امشب رد شد/.test(p21));
}

console.log('\n=== ۲۱. ۴۸ توکن و مدلی که پیش از جواب فکر می‌کند (۸.۳۲) ===');
{
  /* ══ ۷۱ قطعهٔ نشنیده، و علتش در خودِ موتور بود ══
   * سیاههٔ هر شب: «شنیدنِ مدل نتیجه نداد: جوابِ خام «»». `musicListen_` با
   * `maxOutputTokens: 48` می‌پرسید و مدلِ فکرکننده همان ۴۸ را صرفِ فکر کرد.
   * پس از چهار «تلاش»، قطعه برای همیشه از صفِ شبانه بیرون رفت و خطِ روزانه
   * کار را به منوی صاحبِ برنامه حواله داد. بدَلِ این مجموعه `musicListen_`
   * را یکسره عوض می‌کرد، پس خودِ درخواست هرگز دیده نشده بود. */
  const F = musicFolder_();
  const wavB = Utilities.newBlob(mkWav(44100, 1, 16, 20, (i) => Math.round(9000 * Math.sin(i / 37)))).getBytes();
  const info = wavInfo_(wavB);
  const stubWas = global.__STUB;
  const keyWas = global.__PROPS['GEMINI_API_KEY'];
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';      // این مجموعه کلید ندارد؛ بی آن درخواست هرگز نمی‌رود
  const models = (url, body) => (typeof stubWas === 'function' ? stubWas(url, body)
    : { code: 200, json: { models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] } });
  const bodies = [];
  const answer = (txt) => ({ code: 200, json: { candidates: [{ content: { parts: [{ text: txt }] } }] } });
  global.__STUB = function (url, body) {
    if (url.indexOf(':generateContent') === -1) return models(url, body);
    bodies.push(body);
    /* مدلِ واقعی: با سقفِ کوچک و فکر، چیزی جز فکر نمی‌ماند */
    const g = body.generationConfig || {};
    if (g.thinkingConfig && Number(g.maxOutputTokens) < 512) {
      return { code: 200, json: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }],
                                  usageMetadata: { thoughtsTokenCount: Number(g.maxOutputTokens) } } };
    }
    return answer('آهنگ');
  };
  const h1 = musicListen_(wavB, info, 'آزمون.wav');
  const g1 = (bodies[0] || {}).generationConfig || {};
  ok('۲۱.۱ شنیدن سقفی دارد که فکرِ مدل نمی‌خوردش، و جواب می‌آید',
     h1 === 'آهنگ' && Number(g1.maxOutputTokens) >= 1024 &&
     g1.thinkingConfig && Number(g1.thinkingConfig.thinkingBudget) <= 256,
     'جواب «' + h1 + '» · سقف ' + g1.maxOutputTokens + ' · فکر ' + JSON.stringify(g1.thinkingConfig || null));

  /* ۲۱.۱-ب — و کف **ساختاری** است: صدازننده‌ای که سقفِ کوچک بخواهد (همان
     خطای ۴۸ و ۲۵۶)، باز هم ۱۰۲۴ می‌فرستد. */
  bodies.length = 0;
  geminiShort_([{ text: 'گوش کن' }], { min: 48 });
  ok('۲۱.۱-ب سقفِ کمتر از ۱۰۲۴ از صدازننده پذیرفته نمی‌شود',
     Number(((bodies[0] || {}).generationConfig || {}).maxOutputTokens) >= 1024,
     String(((bodies[0] || {}).generationConfig || {}).maxOutputTokens));

  /* ۲۱.۲ — مدلی که `thinkingConfig` را نمی‌شناسد: یک بار بی آن، و به خاطر سپرده. */
  bodies.length = 0;
  global.__STUB = function (url, body) {
    if (url.indexOf(':generateContent') === -1) return models(url, body);
    bodies.push(body);
    if ((body.generationConfig || {}).thinkingConfig) {
      return { code: 400, json: { error: { message: 'Invalid JSON payload: Unknown name "thinkingConfig"' } } };
    }
    return answer('زمینه');
  };
  const dropKey = Object.keys(global.__PROPS).filter((k) => /DROP/i.test(k));
  dropKey.forEach((k) => delete global.__PROPS[k]);
  const h2 = musicListen_(wavB, info, 'آزمون.wav');
  const n2 = bodies.length;
  const h3 = musicListen_(wavB, info, 'آزمون.wav');
  ok('۲۱.۲ ردِ «فکر» یک بار بی آن پرسیده و به خاطر سپرده می‌شود',
     h2 === 'زمینه' && h3 === 'زمینه' && n2 === 2 && bodies.length === 3 &&
     !(bodies[2].generationConfig || {}).thinkingConfig,
     'جواب‌ها ' + h2 + '/' + h3 + ' · فراخوان‌ها ' + n2 + ' ⇒ ' + bodies.length);
  /* ۲۱.۴ — و اگر باز هم بریده آمد (سقف یا فکرِ بی‌پایان)، یک بار با سقفِ
     بزرگ و بی فکر؛ و پاسخِ مسدود علتش را با خود می‌آورد — «جوابِ خام «»»
     به‌تنهایی هیچ نمی‌گفت. */
  bodies.length = 0;
  global.__STUB = function (url, body) {
    if (url.indexOf(':generateContent') === -1) return models(url, body);
    bodies.push(body);
    if (Number((body.generationConfig || {}).maxOutputTokens) < 4096) {
      return { code: 200, json: { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] } };
    }
    return answer('آهنگ');
  };
  const j4 = geminiShort_([{ text: 'گوش کن' }], { min: 1024 });
  global.__STUB = function (url, body) {
    if (url.indexOf(':generateContent') === -1) return models(url, body);
    return { code: 200, json: { promptFeedback: { blockReason: 'SAFETY' }, candidates: [] } };
  };
  const j5 = geminiShort_([{ text: 'گوش کن' }], { min: 1024 });
  ok('۲۱.۴ پاسخِ بریده یک بار بزرگ‌تر و بی فکر پرسیده می‌شود؛ پاسخِ مسدود علتش را دارد',
     extractText_(j4) === 'آهنگ' && bodies.length === 2 &&
     Number(bodies[1].generationConfig.maxOutputTokens) >= 4096 && !bodies[1].generationConfig.thinkingConfig &&
     /SAFETY/.test(String(j5._why || '')),
     'فراخوان ' + bodies.length + ' · متن «' + extractText_(j4) + '» · علت «' + (j5._why || '') + '»');
  global.__STUB = stubWas;
  if (keyWas === undefined) delete global.__PROPS['GEMINI_API_KEY']; else global.__PROPS['GEMINI_API_KEY'] = keyWas;
  Object.keys(global.__PROPS).filter((k) => /DROP/i.test(k)).forEach((k) => delete global.__PROPS[k]);

  /* ۲۱.۳ — «تلاش»هایی که با سقفِ ۴۸ ثبت شدند، تلاش نبودند. قطعه‌ای که ۸.۳۱
     با `tries: "4"` (بی نسخه) از صف بیرون کرد، حالا دوباره در صف است — و
     بی هیچ دستی، چون صاحبِ برنامه منو نمی‌زند. */
  const nm = 'قطعهٔ ردشده با ۴۸ توکن.wav';
  F.createFile(Utilities.newBlob(wavB, 'audio/wav', nm));
  musicScan_();
  const m0 = musicMeta_(nm) || {};
  m0.tries = '4'; m0.lastTry = '2026-10-01 02:40'; m0.verdict = 'مدل نشنید'; delete m0.hv; delete m0.heard;
  musicMetaWrite_(nm, m0);
  const listenWas = global.musicListen_;
  global.musicListen_ = () => '';
  const r3 = musicRecheck_(null, { onlyUnknown: true, cap: 50, budgetMs: 60000 });
  const m3 = musicMeta_(nm) || {};
  ok('۲۱.۳ تلاشِ نسخهٔ پیشینِ «شنیدن» شمرده نمی‌شود — قطعه دوباره در صفِ شبانه است',
     Number(m3.tries) === 1 && String(m3.hv) === String(CFG.MUSIC_HEAR_VER) && r3.checked >= 1,
     'تلاش ' + m3.tries + ' · نسخه ' + m3.hv + ' · بررسی‌شده ' + r3.checked);
  global.musicListen_ = listenWas;
}

console.log('\n=== ۲۲. آنچه پخش می‌شود شنیده می‌شود — نه فقط وسطِ فایل (۸.۳۳) ===');
{
  /* داوریِ بانک هشت ثانیه از **وسطِ** فایل را می‌شنود؛ آغازِ قسمت از ثانیه‌ای
     پخش می‌شود که نقشه انتخاب کرده. قطعه‌ای که وسطش آهنگ است و سرش صدای
     خیابان، از داوریِ بانک می‌گذشت. این بند از درِ خودِ `musicWrap_` و با
     **کلیدِ قسمت** وارد می‌شود — بی کلید، نقشه تازه نیست و هیچ شنیدنی رخ
     نمی‌دهد؛ همهٔ آزمون‌های پیشینِ این فایل همان‌طور بودند و برای همین هیچ‌کدام
     این در را نمی‌دیدند. */
  const hub = getHub_();
  const sh = hub.getSheetByName(CFG.MUSIC_TAB);
  const F = musicFolder_();
  const mk = (nm, slots) => {
    F.createFile(Utilities.newBlob(mkWav(24000, 1, 16, 20, (i) => Math.round(6000 * Math.sin(i / 30))),
                                   'audio/wav', nm));
    return [nm, slots];
  };
  const want = [mk('noisy-intro.wav', 'شروع، پایان'), mk('clean-song.wav', 'شروع، پایان'),
                mk('bed-pad.wav', 'میانه'), mk('noisy-bed.wav', 'میانه')];
  musicScan_(hub);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  for (let r = 0; r < rows.length; r++) {
    const w = want.filter((x) => x[0] === String(rows[r][MC.NAME - 1]))[0];
    if (!w) continue;
    sh.getRange(r + 2, MC.SLOTS).setValue(w[1]);
    sh.getRange(r + 2, MC.HEARD).setValue('✅ آهنگ');      // داوریِ بانک: وسطِ فایل آهنگ است
    sh.getRange(r + 2, MC.NOTE).setValue('');
  }
  const bank = musicBank_(hub);
  const noisy = bank.filter((b) => b.name === 'noisy-intro.wav')[0];
  const noisyBed = bank.filter((b) => b.name === 'noisy-bed.wav')[0];
  const planWas = global.musicPlanModel_, listenWas = global.musicListen_;
  /* پل را هم مدل پیشنهاد می‌دهد، و همان پل در بازهٔ پخش صدای خیابان است. */
  global.musicPlanModel_ = () => ({ introId: noisy.id, introStart: '3', outroId: noisy.id, outroStart: '0',
                                    bridges: [{ after: '1', id: noisyBed.id }], mood: 'آرام' });
  const calls = [];
  global.musicListen_ = (b, info, name, st) => {
    calls.push({ name: name, st: st });
    return /noisy/.test(name) ? 'جلوه' : (/bed/.test(name) ? 'زمینه' : 'آهنگ');
  };
  const chunks = []; for (let i = 0; i < 6; i++) chunks.push({ text: 'ت' + i });
  const bounds = [{ at: 0, kind: 'hook' }, { at: 1, kind: 'body', heading: 'الف' },
                  { at: 3, kind: 'body', heading: 'ب' }, { at: 5, kind: 'body', heading: 'پ' },
                  { at: 6, kind: 'outro' }];
  delete global.__PROPS[PK.MUSIC_PLAN];
  const opt = { mood: 'آرام', bounds: bounds, show: 'variety', episode: '901' };
  const labels = (r) => r.chunks.filter((c) => c.pcm).map((c) => c.label);
  const r1 = musicWrap_(chunks, hub, Object.assign({}, opt));
  const L1 = labels(r1);
  const introL = L1.filter((l) => /آغاز/.test(l))[0] || '';
  const outroL = L1.filter((l) => /پایان/.test(l))[0] || '';
  const heardNoisy = calls.filter((c) => /noisy/.test(c.name));
  ok('۲۲.۱ بازهٔ پخشِ آغاز شنیده می‌شود (همان ثانیهٔ برشِ نقشه) و قطعهٔ نامناسب جانشین می‌گیرد',
     introL && !/noisy/.test(introL) && outroL && !/noisy/.test(outroL) &&
     heardNoisy.some((c) => c.st === 3) && !L1.some((l) => /noisy/.test(l)) &&
     calls.some((c) => /noisy-bed/.test(c.name)),
     'آغاز «' + introL + '» · پایان «' + outroL + '» · شنیده‌ها ' +
     JSON.stringify(calls.map((c) => c.name + '@' + c.st)));

  /* ازسرگیری: نقشه با نتیجهٔ شنیدن ذخیره شد، پس اجرای بعد **هیچ** نمی‌پرسد و
     تکه‌ها همان‌اند — وگرنه شمارهٔ تکهٔ ذخیره‌شده می‌لغزد. */
  calls.length = 0;
  global.musicPlanModel_ = () => { throw new Error('ازسرگیری نباید نقشهٔ تازه بخواهد'); };
  let r2;
  try { r2 = musicWrap_(chunks, hub, Object.assign({}, opt)); }
  catch (e) { r2 = { chunks: [{ pcm: 'x', label: 'خطا: ' + e.message }] }; }
  ok('۲۲.۲ ازسرگیری هیچ چیزی را دوباره نمی‌شنود و همان تکه‌ها را می‌دهد',
     calls.length === 0 && JSON.stringify(labels(r2)) === JSON.stringify(L1),
     calls.length + ' شنیدن · ' + JSON.stringify(labels(r2)));

  /* نشنیدن یعنی نه: مدل در دسترس نیست ⇒ هیچ موسیقی‌ای پخش نمی‌شود، و گفته می‌شود. */
  global.musicPlanModel_ = () => ({ introId: noisy.id, outroId: noisy.id, bridges: [], mood: 'آرام' });
  /* لبه‌ها شنیده نمی‌شوند، ولی پلِ بستر شنیده می‌شود — پس قسمت موسیقی دارد و
     «قفلِ دوم» نقشه را بازنویسی می‌کند؛ «حذف شد»ِ لبه‌ها باید از آن جان به در ببرد. */
  global.musicListen_ = (b, info, name) => (/bed-pad/.test(name) ? 'زمینه' : '');
  const edges = (r) => labels(r).filter((l) => /آغاز|پایان/.test(l));
  const r3 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '902' }));
  const cached3 = (JSON.parse(global.__PROPS[PK.MUSIC_PLAN] || '{}') || {})['variety#902'] || {};
  ok('۲۲.۳ لبه‌ای که شنیده نشد بی‌موسیقی است — نه موسیقیِ نشنیده؛ و نقشه همین را به خاطر می‌سپارد',
     edges(r3).length === 0 && labels(r3).some((l) => /bed-pad/.test(l)) &&
     cached3.introNone === true && cached3.outroNone === true,
     JSON.stringify(labels(r3)) + ' · ' + JSON.stringify({ i: cached3.introNone, o: cached3.outroNone }));
  /* و ازسرگیریِ همان قسمت هم بی‌موسیقی می‌مانَد: ازسرگیری نمی‌شنود (۲۲.۲)، پس
     اگر «حذف شد» از نقشهٔ ذخیره‌شده خوانده نشود، قطعهٔ ردشده بی‌داوری پخش می‌شود. */
  global.musicPlanModel_ = () => { throw new Error('ازسرگیری نباید نقشهٔ تازه بخواهد'); };
  let r3b;
  try { r3b = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '902' })); }
  catch (e) { r3b = { chunks: [{ pcm: 'x', label: 'خطا: ' + e.message }] }; }
  ok('۲۲.۳-ب ازسرگیری هم لبه‌ها را بی‌موسیقی نگه می‌دارد — «حذف شد» از قفلِ نقشه خوانده می‌شود',
     edges(r3b).length === 0 && JSON.stringify(labels(r3b)) === JSON.stringify(labels(r3)),
     JSON.stringify(labels(r3b)));
  global.musicPlanModel_ = () => ({ introId: noisy.id, outroId: noisy.id, bridges: [], mood: 'آرام' });

  /* هیچ‌چیز شنیده نشد ⇒ هیچ قطعه‌ای نیست ⇒ «قفلِ دوم» اصلاً نوشته نمی‌شود. پس
     تنها چیزی که نقشه را نگه می‌دارد ذخیرهٔ پس از شنیدن است — بی آن ازسرگیری
     نقشهٔ تازه می‌خواهد و هر بار دوباره می‌شنود. */
  global.musicListen_ = () => '';
  const r5 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '904' }));
  global.musicPlanModel_ = () => { throw new Error('ازسرگیری نباید نقشهٔ تازه بخواهد'); };
  let r5b;
  try { r5b = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '904' })); }
  catch (e) { r5b = { chunks: [{ pcm: 'x', label: 'خطا: ' + e.message }] }; }
  ok('۲۲.۳-پ قسمتی که هیچ موسیقی‌ای نگرفت هم نقشه‌اش را نگه می‌دارد — ازسرگیری نمی‌پرسد',
     labels(r5).length === 0 && labels(r5b).length === 0, JSON.stringify(labels(r5b)));
  global.musicPlanModel_ = () => ({ introId: noisy.id, outroId: noisy.id, bridges: [], mood: 'آرام' });

  /* سلیقهٔ آدم: قطعه‌ای که او برایش یادداشت نوشته شنیده نمی‌شود و پخش می‌شود. */
  for (let r = 0; r < rows.length; r++) {
    if (String(rows[r][MC.NAME - 1]) === 'noisy-intro.wav') sh.getRange(r + 2, MC.NOTE).setValue('دستی: همین را می‌خواهم');
  }
  calls.length = 0;
  global.musicListen_ = (b, info, name, st) => { calls.push({ name: name, st: st }); return ''; };
  const r4 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '903' }));
  ok('۲۲.۴ قطعه‌ای که آدم تأییدش کرده بی شنیدنِ مدل پخش می‌شود',
     /* «noisy-intro» دقیق، نه هر «noisy»: از ۸.۶۰ پل‌های کم از آهنگ‌های شنیده‌شدهٔ دیگر پر
        می‌شوند و «noisy-bed» یکی از آن‌هاست که درست شنیده می‌شود. ادعا دربارهٔ همان قطعهٔ آدم است. */
     labels(r4).some((l) => /آغاز/.test(l) && /noisy-intro/.test(l)) && !calls.some((c) => /noisy-intro/.test(c.name)),
     JSON.stringify(labels(r4)));
  for (let r = 0; r < rows.length; r++) {
    if (String(rows[r][MC.NAME - 1]) === 'noisy-intro.wav') sh.getRange(r + 2, MC.NOTE).setValue('');
  }

  /* و برش واقعاً از همان ثانیه است: نمونهٔ اولِ بریده برابرِ نمونهٔ ثانیهٔ ۵ِ فایل. */
  const wb = Utilities.newBlob(mkWav(8000, 1, 16, 12, (i) => Math.floor(i / 8000) * 1000)).getBytes();
  const wi = wavInfo_(wb);
  /* ثانیهٔ ۱، نه ۵: وسطِ این فایلِ ۱۲ ثانیه‌ای خودش ثانیهٔ ۵ است، پس «۵» با
     رفتارِ قدیم (از وسط) هم همان عدد را می‌داد و سنجه هیچ نمی‌سنجید. */
  const ex = Utilities.base64Decode(musicExcerpt_(wb, wi, 2, 1));
  const v0 = ((ex[44] & 255) | ((ex[45] & 255) << 8));
  ok('۲۲.۵ بریدهٔ شنیدن از ثانیهٔ خواسته‌شده برداشته می‌شود، نه از وسط',
     v0 === 1000, 'نمونهٔ اول ' + v0);

  /* آغاز و پایان «آهنگ» می‌خواهند؛ پل «زمینه» را هم می‌پذیرد — بستری که زیرِ
     گذارِ دو بخش خوب است، سرِ برنامه «بی‌آغاز» شنیده می‌شود. */
  const bed = musicBank_(hub).filter((b) => b.name === 'bed-pad.wav')[0];
  global.musicListen_ = () => 'زمینه';
  const sEdge = musicSegOk_(bed, 0, 'شروع'), sMid = musicSegOk_(bed, 0, 'میانه');
  ok('۲۲.۶ «زمینه» برای پل بس است، برای آغاز نه',
     sEdge.ok === false && sMid.ok === true, JSON.stringify({ edge: sEdge, mid: sMid }));

  global.musicPlanModel_ = planWas; global.musicListen_ = listenWas;
  delete global.__PROPS[PK.MUSIC_PLAN];
}

console.log('\n=== ۲۳. بازشنوی اجرای جدای خودش را دارد، و رهاشده‌ها صف را نمی‌خورند (۸.۵۴) ===');
{
  /* ۶ اکتبر: «قابلِ پخش ۷ · شنیده‌نشده ۷۱ … موتور هر شب تا ۱۲ تا را خودش می‌شنود»، سه
     روزِ پیاپی همان عدد، و درسِ ۴۰ بی آغاز و پایان. بازشنوی پشتِ نُه بلوکِ کارِ شبانه
     بود و کارِ شبانه هر شب زودتر مُرد. و زیرش قفلی دیگر: صف **پیش از** سدِ تلاش بریده
     می‌شد، پس اگر سرِ صف رهاشده‌ها بودند، هیچ قطعهٔ منتظری هرگز نوبت نمی‌گرفت. */
  const F = musicFolder_();
  const listenWas = global.musicListen_;
  const tmaxWas = CFG.MUSIC_HEAR_TRY_MAX;
  CFG.MUSIC_HEAR_TRY_MAX = 2;
  const mkTrack = (nm, hz) => F.createFile(Utilities.newBlob(
    Utilities.newBlob(mkWav(44100, 1, 16, 20, (i) => Math.round(9000 * Math.sin(i / hz)))).getBytes(),
    'audio/wav', nm));
  /* سه قطعهٔ رهاشده (مدل دو بار نشنیدشان) و یک قطعهٔ منتظر. */
  const dead = ['رها ۱.wav', 'رها ۲.wav', 'رها ۳.wav'];
  dead.forEach((nm, i) => mkTrack(nm, 30 + i));
  mkTrack('منتظر.wav', 51);
  musicScan_();
  dead.forEach((nm) => musicMetaWrite_(nm, { tries: '2', hv: String(CFG.MUSIC_HEAR_VER || ''), title: nm }));
  /* رهاشده‌ها را عمداً سرِ صف می‌نشانیم — همان «لبهٔ اخیر»ی که رتبهٔ صفر می‌گیرد. */
  global.__PROPS[PK.MUSIC_LAST] = JSON.stringify({ edges: dead });

  global.musicListen_ = () => 'آهنگ';
  const r1 = musicRecheck_(null, { onlyUnknown: true, cap: 1, budgetMs: 60000 });
  /* صفِ این مجموعه از بندهای قبل هم قطعهٔ نشنیده دارد؛ ادعا این است که با سقفِ ۱،
     **یک قطعهٔ منتظر** شنیده می‌شود و هیچ رهاشده‌ای جایش را نمی‌گیرد. با کدِ ۸.۵۳ صف پیش
     از سد بریده می‌شد، سه رهاشدهٔ سرِ صف رد می‌شدند و هیچ‌چیز شنیده نمی‌شد. */
  const deadHeard = dead.filter((nm) => String((musicMeta_(nm) || {}).heard || '')).length;
  ok('۲۳.۱ رهاشده‌ها سقف را نمی‌خورند: با سقفِ ۱ یک قطعهٔ منتظر شنیده می‌شود',
     r1.checked === 1 && Number(r1.heard) === 1 && Number(r1.skipped) >= 3 && deadHeard === 0,
     'سنجیده ' + r1.checked + ' · شنیده ' + r1.heard + ' · رهاشده ' + r1.skipped);

  /* ۲۳.۲ — اجرای جدا کلِ صف را می‌شمارد (شناسنامه، نه بایت) تا «رهاشده» از «منتظر» جدا گفته شود. */
  mkTrack('منتظرِ دوم.wav', 61);
  mkTrack('منتظرِ سوم.wav', 71);
  musicScan_();
  global.musicListen_ = () => '';
  const r2 = musicRecheck_(null, { onlyUnknown: true, cap: 1, budgetMs: 60000, countAll: true });
  ok('۲۳.۲ با countAll بقیهٔ صف شمرده می‌شود — رهاشده و منتظر جدا',
     Number(r2.skipped) >= 3 && Number(r2.waiting) >= 1 && r2.checked === 1,
     JSON.stringify({ checked: r2.checked, skipped: r2.skipped, waiting: r2.waiting, tried: r2.tried }));

  /* ۲۳.۳ — زمان‌بند فقط Properties می‌خوانَد و یک اجرای یک‌باره می‌سازد. */
  global.__TRIGGERS.length = 0;
  delete global.__PROPS[PK.MUSIC_REHEAR_DAY];
  delete global.__PROPS[PK.MUSIC_REHEAR_LAST];
  global.__PROPS[PK.MUSIC_UNHEARD_N] = '5';
  const hubWas = global.getHub_;
  let hubCalls = 0;
  global.getHub_ = function () { hubCalls++; return hubWas.apply(this, arguments); };
  const d1 = musicRehearDue_();
  const nT = global.__TRIGGERS.filter((t) => t.getHandlerFunction() === 'musicRehearLater').length;
  ok('۲۳.۳ شنیده‌نشده هست ⇒ اجرای جدا زمان‌بندی می‌شود، بی خواندنِ هاب',
     d1 === true && nT === 1 && hubCalls === 0, 'زمان‌بندی ' + d1 + ' · تریگر ' + nT + ' · هاب ' + hubCalls);
  const d2 = musicRehearDue_();
  ok('۲۳.۴ تا فاصله نرسیده، دوباره زمان‌بندی نمی‌شود',
     d2 === false && global.__TRIGGERS.filter((t) => t.getHandlerFunction() === 'musicRehearLater').length === 1);
  /* دو قفل که یکدیگر را می‌پوشانند (۷.۴۱): فاصله را کنار می‌گذاریم تا فقط «اجرای قبلی هنوز
     هست» جلوی تریگرِ دوم را بگیرد. */
  const dd = JSON.parse(global.__PROPS[PK.MUSIC_REHEAR_DAY]); dd.at = 0;
  global.__PROPS[PK.MUSIC_REHEAR_DAY] = JSON.stringify(dd);
  const d2b = musicRehearDue_();
  ok('۲۳.۴-ب تا اجرای قبلی هنوز در فهرست است، تریگرِ دوم ساخته نمی‌شود',
     d2b === false && global.__TRIGGERS.filter((t) => t.getHandlerFunction() === 'musicRehearLater').length === 1);
  global.getHub_ = hubWas;

  /* ۲۳.۵ — صفر شنیده‌نشده ⇒ هیچ کاری. */
  global.__TRIGGERS.length = 0;
  delete global.__PROPS[PK.MUSIC_REHEAR_DAY];
  global.__PROPS[PK.MUSIC_UNHEARD_N] = '0';
  ok('۲۳.۵ صفِ خالی چیزی زمان‌بندی نمی‌کند', musicRehearDue_() === false && global.__TRIGGERS.length === 0);

  /* ۲۳.۶ — و سقفِ روزانه: پس از `RUNS_DAY` اجرا، امروز دیگر نه. */
  global.__PROPS[PK.MUSIC_UNHEARD_N] = '5';
  const today = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  global.__PROPS[PK.MUSIC_REHEAR_DAY] = JSON.stringify({ day: today, n: Number(CFG.MUSIC_REHEAR_RUNS_DAY) || 4, at: 0 });
  ok('۲۳.۶ سقفِ روزانهٔ اجراها نگه داشته می‌شود', musicRehearDue_() === false && global.__TRIGGERS.length === 0);

  /* ۲۳.۷ — رهاشده‌ها از عددِ «منتظر» کم می‌شوند: وقتی همهٔ شنیده‌نشده‌ها رهاشده‌اند، اجرایی
     ساخته نمی‌شود — وگرنه چهار بار در روز همان رهاشده‌ها شمرده می‌شدند. */
  delete global.__PROPS[PK.MUSIC_REHEAR_DAY];
  global.__PROPS[PK.MUSIC_UNHEARD_N] = '3';
  global.__PROPS[PK.MUSIC_REHEAR_LAST] = JSON.stringify({ at: '2026-08-18 01:00', skipped: 3 });
  ok('۲۳.۷ وقتی همهٔ شنیده‌نشده‌ها رهاشده‌اند، اجرای جدا ساخته نمی‌شود',
     musicRehearDue_() === false && global.__TRIGGERS.length === 0);

  /* ۲۳.۸ — اجرای جدا شاهد می‌نویسد، و سطرِ روزانه از همان شاهد حرف می‌زند. */
  delete global.__PROPS[PK.MUSIC_REHEAR_LAST];
  global.musicListen_ = () => 'آهنگ';
  const rl = musicRehearLater();
  const w = JSON.parse(global.__PROPS[PK.MUSIC_REHEAR_LAST] || 'null') || {};
  ok('۲۳.۸ اجرای جدا شاهدِ خودش را می‌نویسد',
     rl.ok === true && w.via === 'اجرای جدا' && Number(w.heard) >= 1 && Number(w.skipped) >= 3,
     JSON.stringify(w));
  global.__PROPS[PK.MUSIC_UNHEARD_N] = '999';      // عددی که هیچ حالتی نمی‌سازد — تا نوشتنِ تازه دیده شود
  const st = musicStatus_();
  ok('۲۳.۹ سطرِ روزانه از شاهد می‌گوید — کِی، چند تأیید، چند رهاشده — نه از تنظیم',
     /آخرین بازشنوی/.test(st.line) && /رهاشده/.test(st.line) && !/هر شب تا/.test(st.line) &&
     String(global.__PROPS[PK.MUSIC_UNHEARD_N]) === String(st.unheard), st.line);
  delete global.__PROPS[PK.MUSIC_REHEAR_LAST];
  const st0 = musicLine_({ enabled: true, playable: 1, unheard: 4, rehear: null });
  ok('۲۳.۱۰ بی شاهد، همین را می‌گوید — نه وعده', /هیچ شاهدی/.test(st0), st0);

  /* ۲۳.۱۱ — آوردنِ قطعهٔ تازه پشتِ رهاشده‌ها نمی‌ایستد: کارِ شبانه آن‌ها را از عدد کم می‌کند. */
  const p21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۲۳.۱۱ سقفِ آوردن رهاشده‌ها را حساب نمی‌کند',
     /mUnheard = Math\.max\(0, mUnheard - Number\(wSk\.skipped\)\)/.test(p21));

  /* ۲۳.۱۲ — زمان‌بند روی تریگرِ ساعتی است، **پیش از** سدِ پل. */
  const p36 = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
  const iM = p36.indexOf('musicRehearDue_();'), iG = p36.indexOf("if (CFG.VBR_ON === false) return null;", p36.indexOf('function vbrCollectHourly'));
  ok('۲۳.۱۲ زمان‌بندِ بازشنوی پیش از سدِ VBR_ON در تریگرِ ساعتی است', iM > 0 && iG > 0 && iM < iG,
     'بازشنوی @' + iM + ' · سد @' + iG);

  /* ۲۳.۱۳ (۸.۶۲) — اجرای جدای ۷ اکتبر ۰۳:۲۴ کشته شد و **هیچ** شاهدی نماند: شاهد پس از پویش نوشته
     می‌شد و پویش با شنیدن و شمارش از شش دقیقه گذشت (۷٫۶۴). حالا شاهد **پیش از** پویش، و جای پا پیش از هر گام. */
  const scanWas = global.musicScan_;
  let scanSeen = [];
  global.musicScan_ = function () {
    scanSeen.push({ last: global.__PROPS[PK.MUSIC_REHEAR_LAST] || '', step: global.__PROPS[PK.MUSIC_REHEAR_STEP] || '' });
    return scanWas.apply(this, arguments);
  };
  mkTrack('منتظرِ چهارم.wav', 81);
  scanWas();
  delete global.__PROPS[PK.MUSIC_REHEAR_LAST]; delete global.__PROPS[PK.MUSIC_SCAN_DUE];
  global.musicListen_ = () => 'آهنگ';
  const rl2 = musicRehearLater();
  const st13 = JSON.parse(global.__PROPS[PK.MUSIC_REHEAR_STEP] || 'null') || {};
  ok('۲۳.۱۳ شاهدِ بازشنوی پیش از پویش نشسته، جای پا «پویشِ تب» سرِ پویش و «پایان» در آخر',
     rl2.ok === true && scanSeen.length === 1 && /اجرای جدا/.test(scanSeen[0].last) &&
     /پویشِ تب/.test(scanSeen[0].step) && st13.step === 'پایان' && st13.fin === true,
     JSON.stringify({ scans: scanSeen.length, step: st13, at: scanSeen[0] && scanSeen[0].step }));

  /* ۲۳.۱۴ — وقتِ پویش نماند ⇒ پویش نمی‌شود، «اجرای بعد» ثبت می‌شود، و اجرای بعد **اول** پویش می‌کند. */
  const byWas = CFG.MUSIC_REHEAR_SCAN_BY_MS;
  CFG.MUSIC_REHEAR_SCAN_BY_MS = 1;
  mkTrack('منتظرِ پنجم.wav', 91);
  scanWas();
  scanSeen = [];
  musicRehearLater();
  const w14 = JSON.parse(global.__PROPS[PK.MUSIC_REHEAR_LAST] || 'null') || {};
  const due14 = !!global.__PROPS[PK.MUSIC_SCAN_DUE];
  const scans14 = scanSeen.length;
  CFG.MUSIC_REHEAR_SCAN_BY_MS = byWas;
  scanSeen = [];
  musicRehearLater();
  ok('۲۳.۱۴ وقتِ پویش نماند ⇒ به اجرای بعد، و اجرای بعد اول پویش می‌کند و نشانه پاک می‌شود',
     w14.scan === 'اجرای بعد' && due14 && scans14 === 0 && scanSeen.length >= 1 &&
     /مانده از اجرای قبل/.test(scanSeen[0].step) && !global.__PROPS[PK.MUSIC_SCAN_DUE],
     JSON.stringify({ scan: w14.scan, due: due14, scans14: scans14, next: scanSeen.map(x => x.step) }));
  global.musicScan_ = scanWas;

  /* ۲۳.۱۵ — اجرایی که آغاز شد و «پایان» ننوشت، در سطرِ روزانه با نامِ گام می‌آید؛ تازه‌اش نه. */
  global.__PROPS[PK.MUSIC_REHEAR_STEP] = JSON.stringify({ step: 'شنیدن', at: '2026-08-18 03:24', fin: false });
  const s15 = musicStatus_();
  global.__PROPS[PK.MUSIC_REHEAR_STEP] = JSON.stringify({ step: 'شنیدن', at: nowStr_(), fin: false });
  const s15b = musicStatus_();
  ok('۲۳.۱۵ اجرای کشته‌شدهٔ بازشنوی با گامش در سطرِ روزانه؛ اجرای در جریان نه',
     /کشته شد/.test(s15.line) && s15.line.indexOf('«شنیدن»') !== -1 && !/کشته شد/.test(s15b.line),
     s15.line.slice(-160));
  delete global.__PROPS[PK.MUSIC_REHEAR_STEP];

  global.musicListen_ = listenWas;
  CFG.MUSIC_HEAR_TRY_MAX = tmaxWas;
  global.__TRIGGERS.length = 0;
}

console.log('\n=== ۲۴. لبه‌ای که شنیده‌شده ندارد، همان لحظه می‌شنود (۸.۵۶) ===');
{
  /* درسِ ۴۰ (۶ اکتبر) بی آغاز و پایان رفت: `missing: ["شروع","پایان"]`، هفت قطعهٔ
     قابلِ پخش هیچ‌کدام برای لبه، و ۵۴ نامزدِ برچسب‌خورده که هیچ‌کس نشنیده بود. سدِ
     ۷.۶۸ (نشنیده پخش نمی‌شود) درست است؛ عیب این بود که تنها گوش، بازشنویِ شبانه بود. */
  const hub = getHub_();
  const sh = hub.getSheetByName(CFG.MUSIC_TAB);
  const F = musicFolder_();
  /* هیچ قطعهٔ موجودی لبه نمی‌گیرد — همان حالتِ ۶ اکتبر. */
  const rows0 = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  for (let r = 0; r < rows0.length; r++) { sh.getRange(r + 2, MC.SLOTS).setValue('میانه'); sh.getRange(r + 2, MC.NOTE).setValue(''); }
  const mk = (nm, hz) => F.createFile(Utilities.newBlob(
    Utilities.newBlob(mkWav(44100, 1, 16, 20, (i) => Math.round(9000 * Math.sin(i / hz)))).getBytes(), 'audio/wav', nm));
  ['کشف-درون.wav', 'کشف-سرش‌بد.wav', 'کشف-آهنگ.wav'].forEach((nm, i) => mk(nm, 23 + i * 7));
  musicScan_(hub);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  for (let r = 0; r < rows.length; r++) {
    if (/^کشف-/.test(String(rows[r][MC.NAME - 1]))) {
      sh.getRange(r + 2, MC.SLOTS).setValue('شروع، پایان');
      sh.getRange(r + 2, MC.HEARD).setValue('❓ نامعلوم — کسی به این گوش نداده');
      /* نامزدهای بد **جلوتر** از آهنگ رتبه می‌گیرند تا شنیدنِ هر سه سنجیده شود. */
      sh.getRange(r + 2, MC.MOOD).setValue(/آهنگ/.test(String(rows[r][MC.NAME - 1])) ? '' : 'آرام');
    }
  }
  const heardOf = (nm) => { const b = musicBank_(hub).filter((x) => x.name === nm)[0]; return b ? b.heard : ''; };
  const planWas = global.musicPlanModel_, listenWas = global.musicListen_;
  global.musicPlanModel_ = () => ({ bridges: [], mood: 'آرام' });
  const calls = [];
  global.musicListen_ = (b, info, name, st) => {
    calls.push(name + '@' + st);
    if (/درون/.test(name)) return 'زمینه';
    if (/سرش‌بد/.test(name)) return st === 0 ? 'زمینه' : 'آهنگ';
    return 'آهنگ';
  };
  const chunks = []; for (let i = 0; i < 4; i++) chunks.push({ text: 'ت' + i });
  const opt = { mood: 'آرام', bounds: [], show: 'special', episode: '940' };
  const labels = (r) => r.chunks.filter((c) => c.pcm).map((c) => c.label);
  delete global.__PROPS[PK.MUSIC_PLAN];
  const r1 = musicWrap_(chunks, hub, Object.assign({}, opt));
  const L1 = labels(r1);
  ok('۲۴.۱ آغاز و پایان از نامزدهای نشنیده پیدا می‌شوند — همان لحظه شنیده، «آهنگ»، و سرش هم آهنگ',
     L1.some((l) => /آغاز/.test(l) && /کشف-آهنگ/.test(l)) && L1.some((l) => /پایان/.test(l) && /کشف-آهنگ/.test(l)) &&
     !(r1.missing || []).length, JSON.stringify(L1) + ' · missing ' + JSON.stringify(r1.missing) + ' · ' + calls.join(' '));
  ok('۲۴.۲ داوری در تب می‌نشیند — بانک یاد می‌گیرد و قسمتِ بعد دوباره نمی‌پرسد',
     /✅.*آهنگ/.test(heardOf('کشف-آهنگ.wav')) && /✅.*زمینه/.test(heardOf('کشف-درون.wav')) &&
     String((musicMeta_('کشف-آهنگ.wav') || {}).heard) === 'آهنگ',
     heardOf('کشف-آهنگ.wav') + ' · ' + heardOf('کشف-درون.wav'));
  ok('۲۴.۳ «آهنگ»ی که سرش آهنگ نیست لبه نمی‌شود (آنچه پخش می‌شود شنیده می‌شود، ۸.۳۳)',
     !L1.some((l) => /سرش‌بد/.test(l)) && calls.some((c) => /سرش‌بد.*@0/.test(c)), calls.join(' '));

  /* ازسرگیری همان را می‌دهد و هیچ نمی‌شنود. */
  calls.length = 0;
  global.musicPlanModel_ = () => { throw new Error('ازسرگیری نباید نقشهٔ تازه بخواهد'); };
  let r2; try { r2 = musicWrap_(chunks, hub, Object.assign({}, opt)); }
  catch (e) { r2 = { chunks: [{ pcm: 'x', label: 'خطا: ' + e.message }] }; }
  ok('۲۴.۴ ازسرگیری همان لبه‌ها را می‌دهد و چیزی نمی‌شنود',
     calls.length === 0 && JSON.stringify(labels(r2)) === JSON.stringify(L1), calls.length + ' · ' + JSON.stringify(labels(r2)));

  /* هیچ نامزدی «آهنگ» نیست ⇒ همان سکوتِ قبلی، به‌خاطر سپرده، با علت در سیاهه. */
  for (let r = 0; r < rows.length; r++) {
    if (/^کشف-آهنگ/.test(String(rows[r][MC.NAME - 1]))) sh.getRange(r + 2, MC.HEARD).setValue('❓ نامعلوم');
  }
  musicMetaWrite_('کشف-آهنگ.wav', { title: 'کشف-آهنگ' });
  global.musicListen_ = (b, info, name, st) => { calls.push(name + '@' + st); return 'زمینه'; };
  global.musicPlanModel_ = () => ({ bridges: [], mood: 'آرام' });
  calls.length = 0;
  const r3 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '941' }));
  const c3 = (JSON.parse(global.__PROPS[PK.MUSIC_PLAN] || '{}') || {})['special#941'] || {};
  ok('۲۴.۵ وقتی هیچ نامزدی آهنگ نیست، لبه بی‌موسیقی می‌مانَد — نه موسیقیِ نشنیده — و نقشه به خاطر می‌سپارد',
     !labels(r3).some((l) => /آغاز|پایان/.test(l)) && c3.introNone === true && c3.outroNone === true &&
     (r3.missing || []).indexOf('شروع') !== -1, JSON.stringify(labels(r3)) + ' · ' + JSON.stringify(c3));
  /* ازسرگیریِ همان قسمت دوباره نمی‌شنود — شنیدن فقط در ساختِ تازهٔ نقشه است. نامزدها دوباره
     «نشنیده» می‌شوند تا اگر ازسرگیری می‌شنید، چیزی برای شنیدن داشت. */
  for (let r = 0; r < rows.length; r++) {
    if (/^کشف-/.test(String(rows[r][MC.NAME - 1]))) sh.getRange(r + 2, MC.HEARD).setValue('❓ نامعلوم');
  }
  calls.length = 0;
  global.musicPlanModel_ = () => { throw new Error('ازسرگیری نباید نقشهٔ تازه بخواهد'); };
  try { musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '941' })); } catch (e) { calls.push('خطا: ' + e.message); }
  global.musicPlanModel_ = () => ({ bridges: [], mood: 'آرام' });
  ok('۲۴.۵-ب ازسرگیریِ قسمتِ بی‌لبه هیچ نامزدی را دوباره نمی‌شنود', calls.length === 0, calls.join(' '));

  /* سقفِ شمار: N=1 ⇒ برای هر لبه یک نامزد. */
  const nWas = CFG.MUSIC_EDGE_DISCOVER_N;
  CFG.MUSIC_EDGE_DISCOVER_N = 1;
  for (let r = 0; r < rows.length; r++) {
    if (/^کشف-/.test(String(rows[r][MC.NAME - 1]))) sh.getRange(r + 2, MC.HEARD).setValue('❓ نامعلوم');
  }
  calls.length = 0;
  const logWas = global.logLine_, logs = [];
  global.logLine_ = (t) => { logs.push(String(t)); };
  musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '942' }));
  global.logLine_ = logWas;
  const whole = calls.filter((c) => /@undefined/.test(c)).length;
  const edgeLog = (slot) => (logs.filter((l) => new RegExp('موسیقیِ ' + slot + ' این قسمت نشد — (\\d+)').test(l))[0] || '');
  const nOf = (l) => Number((l.match(/نشد — (\d+)/) || [])[1]);
  /* سهمِ هر لبه جدا: بی سقفِ لبه، آغاز همهٔ بودجه را می‌خورد و پایان هیچ نامزدی نمی‌شنید. */
  ok('۲۴.۶ سقفِ شمار نگه داشته می‌شود — هر لبه حداکثر N نامزد، و پایان هم سهمش را می‌گیرد',
     whole === 2 && nOf(edgeLog('شروع')) === 1 && nOf(edgeLog('پایان')) === 1, calls.join(' ') + ' · ' + logs.join(' | '));
  CFG.MUSIC_EDGE_DISCOVER_N = nWas;

  /* خاموش ⇒ رفتارِ پیشین (کلیدِ برگشت). */
  CFG.MUSIC_EDGE_DISCOVER = false;
  calls.length = 0;
  musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '943' }));
  ok('۲۴.۷ کلیدِ خاموش هیچ نامزدی را نمی‌شنود', calls.length === 0, calls.join(' '));
  CFG.MUSIC_EDGE_DISCOVER = true;

  /* ۲۴.۸ — پل: آهنگِ شنیده‌شده پیش از «طنینِ» زمینه. */
  const bank = [{ id: 'z', name: 'طنین.wav', kind: 'موسیقی', mood: '', slots: 'میانه', sec: 30, used: 0, heard: '✅ مدل شنید: زمینهٔ کشیده', note: '', lastAt: '' },
                { id: 'a', name: 'آهنگ.wav', kind: 'موسیقی', mood: '', slots: 'میانه', sec: 30, used: 3, heard: '✅ مدل شنید: آهنگ (ملودی‌دار)', note: '', lastAt: '' }];
  const pb = musicPick_(bank, 'میانه', '', '');
  ok('۲۴.۸ پلِ ملودی‌دار پیش از طنینِ کشیده — حتی با مصرفِ بیشتر', pb && pb.id === 'a', pb && pb.name);

  global.musicPlanModel_ = planWas; global.musicListen_ = listenWas;
  delete global.__PROPS[PK.MUSIC_PLAN];
}

console.log('\n=== ۲۵. پلِ آهنگین همان لحظه شنیده می‌شود؛ قسمتِ بی‌آهنگ شمرده می‌شود (۸.۵۷) ===');
{
  /* درسِ ۴۰ سه پل داشت و «از همه جا»ِ ۶ اکتبر دو تا — همه طنینِ پنج‌ثانیه‌ای. او گفت «موسیقی
     ندارد». ۸.۵۶ شنیدنِ همان لحظه را فقط برای لبه‌ها ساخت. */
  const hub = getHub_();
  const sh = hub.getSheetByName(CFG.MUSIC_TAB);
  const F = musicFolder_();
  const mk = (nm, hz) => F.createFile(Utilities.newBlob(
    Utilities.newBlob(mkWav(44100, 1, 16, 20, (i) => Math.round(9000 * Math.sin(i / hz)))).getBytes(), 'audio/wav', nm));
  ['پل-درون.wav', 'پل-طنین.wav', 'پل-آهنگ۱.wav', 'پل-آهنگ۲.wav'].forEach((nm, i) => mk(nm, 31 + i * 5));
  musicScan_(hub);
  const rowsAll = () => sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  const reset = () => {
    const rows = rowsAll();
    for (let r = 0; r < rows.length; r++) {
      const nm = String(rows[r][MC.NAME - 1]);
      if (/^کشف-/.test(nm)) { sh.getRange(r + 2, MC.HEARD).setValue('✅ مدل شنید: زمینهٔ کشیده'); continue; }
      /* قطعه‌های بخش‌های پیشین پل نمی‌گیرند، تا نامزدهای این بند همان‌هایی باشند که ساخته شد. */
      if (!/^پل-/.test(nm)) { sh.getRange(r + 2, MC.SLOTS).setValue('پایان'); continue; }
      sh.getRange(r + 2, MC.SLOTS).setValue('میانه');
      sh.getRange(r + 2, MC.NOTE).setValue('');
      /* طنینِ شنیده‌شده تنها قطعهٔ قابلِ پخشِ میانه است — همان حالتِ ۶ اکتبر. */
      sh.getRange(r + 2, MC.HEARD).setValue(/درون/.test(nm) ? '✅ مدل شنید: زمینهٔ کشیده' : '❓ نامعلوم');
      /* طنینِ نشنیده جلوتر رتبه می‌گیرد تا ردش هم سنجیده شود. */
      sh.getRange(r + 2, MC.MOOD).setValue(/طنین|درون/.test(nm) ? 'آرام' : '');
      musicMetaWrite_(nm, { title: nm.replace(/\.wav$/, '') });
    }
  };
  reset();
  const heardOf = (nm) => { const b = musicBank_(hub).filter((x) => x.name === nm)[0]; return b ? b.heard : ''; };
  const planWas = global.musicPlanModel_, listenWas = global.musicListen_, logWas = global.logLine_;
  global.musicPlanModel_ = () => ({ bridges: [], mood: 'آرام' });
  const calls = [];
  global.musicListen_ = (b, info, name, st) => { calls.push(name + '@' + st); return /پل-آهنگ/.test(name) ? 'آهنگ' : 'زمینه'; };
  const chunks = []; for (let i = 0; i < 8; i++) chunks.push({ text: 'ت' + i });
  const bounds = [1, 3, 5, 7].map((at, i) => ({ at: at, kind: 'section', heading: 'بخش ' + i, tone: '' }));
  const opt = { mood: 'آرام', bounds: bounds, show: 'variety', episode: '960' };
  const brLabels = (r) => r.chunks.filter((c) => c.pcm && /میانه/.test(c.label)).map((c) => c.label);
  delete global.__PROPS[PK.MUSIC_PLAN];
  const r1 = musicWrap_(chunks, hub, Object.assign({}, opt));
  const B1 = brLabels(r1);
  ok('۲۵.۱ طنین‌ها جایشان را به آهنگِ همین حالا شنیده‌شده می‌دهند — دو پل، هر دو آهنگ',
     B1.length === 2 && B1.every((l) => /پل-آهنگ/.test(l)) && !B1.some((l) => /درون/.test(l)),
     JSON.stringify(B1) + ' · ' + calls.join(' '));
  ok('۲۵.۲ داوری‌ها در تب می‌نشینند؛ طنینِ نشنیده رد و ثبت شد',
     /✅.*آهنگ/.test(heardOf('پل-آهنگ۱.wav')) && /✅.*زمینه/.test(heardOf('پل-طنین.wav')) &&
     calls.some((c) => /پل-طنین/.test(c)), heardOf('پل-آهنگ۱.wav') + ' · ' + heardOf('پل-طنین.wav'));
  calls.length = 0;
  global.musicPlanModel_ = () => { throw new Error('ازسرگیری نباید نقشهٔ تازه بخواهد'); };
  let r2; try { r2 = musicWrap_(chunks, hub, Object.assign({}, opt)); } catch (e) { r2 = { chunks: [] }; calls.push('خطا ' + e.message); }
  ok('۲۵.۳ ازسرگیری همان پل‌ها را می‌دهد و چیزی نمی‌شنود',
     calls.length === 0 && JSON.stringify(brLabels(r2)) === JSON.stringify(B1), calls.join(' ') + JSON.stringify(brLabels(r2)));
  global.musicPlanModel_ = () => ({ bridges: [], mood: 'آرام' });

  /* سقفِ شمار: N=1 ⇒ فقط یک نامزدِ میانه شنیده می‌شود (طنین، که رد می‌شود). */
  reset();
  const nWas = CFG.MUSIC_BRIDGE_DISCOVER_N;
  CFG.MUSIC_BRIDGE_DISCOVER_N = 1;
  calls.length = 0;
  const r4 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '961' }));
  const brCalls = calls.filter((c) => /^پل-/.test(c) && /@undefined/.test(c)).length;
  ok('۲۵.۴ سقفِ شمارِ پل نگه داشته می‌شود — یک نامزد، و طنین می‌مانَد چون آهنگی پذیرفته نشد',
     brCalls === 1 && brLabels(r4).every((l) => /درون/.test(l)), calls.join(' ') + ' · ' + JSON.stringify(brLabels(r4)));
  CFG.MUSIC_BRIDGE_DISCOVER_N = nWas;

  /* آهنگِ شنیده‌شده به اندازهٔ کف هست ⇒ هیچ نامزدی شنیده نمی‌شود. */
  reset();
  const rows = rowsAll();
  for (let r = 0; r < rows.length; r++) {
    if (/^پل-آهنگ/.test(String(rows[r][MC.NAME - 1]))) sh.getRange(r + 2, MC.HEARD).setValue('✅ مدل شنید: آهنگ (ملودی‌دار)');
  }
  calls.length = 0;
  const r5 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '962' }));
  ok('۲۵.۵ پلِ آهنگینِ شنیده‌شده کافی است ⇒ شنیدنِ تازه‌ای نیست',
     !calls.some((c) => /@undefined/.test(c) && /^پل-/.test(c)) && brLabels(r5).every((l) => /پل-آهنگ/.test(l)),
     calls.join(' ') + JSON.stringify(brLabels(r5)));

  /* شنیدنِ بازه خاموش ⇒ کشفِ پل هم خاموش (همان کلیدِ ۸.۳۳). */
  reset();
  const segWas = CFG.MUSIC_HEAR_SEGMENT;
  CFG.MUSIC_HEAR_SEGMENT = false;
  calls.length = 0;
  musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '963' }));
  CFG.MUSIC_HEAR_SEGMENT = segWas;
  ok('۲۵.۵-ب شنیدنِ بازه خاموش ⇒ هیچ نامزدِ پلی شنیده نمی‌شود',
     !calls.some((c) => /^پل-/.test(c)), calls.join(' '));

  /* ── قسمتِ بی‌آهنگ شمرده می‌شود (۸.۵۷) ── */
  delete global.__PROPS[PK.MUSIC_EDGE_MISS]; delete global.__PROPS[PK.MUSIC_LOGGED];
  const lastWas = global.__PROPS[PK.MUSIC_LAST];
  musicRecordOnce_(hub, { picks: [], missing: ['شروع', 'پایان'], mood: 'آرام' }, 'variety#970', 'قسمت 970', 'ش');
  const last1 = JSON.parse(global.__PROPS[PK.MUSIC_LAST] || '{}');
  const em1 = musicEdgeMissState_();
  ok('۲۵.۶ قسمتِ بی هیچ موسیقی هم ثبت می‌شود — «آخرین» همان قسمت است، نه قسمتِ قبلی',
     last1.episode === 'قسمت 970' && em1.n === 1 && /شروع/.test(em1.why), JSON.stringify(last1) + JSON.stringify(em1));
  musicRecordOnce_(hub, { picks: [], missing: ['شروع', 'پایان'] }, 'variety#970', 'قسمت 970', 'ش');
  ok('۲۵.۶-ب همان قسمت دو بار شمرده نمی‌شود', musicEdgeMissState_().n === 1);
  const drone = { id: 'd', row: 0, name: 'طنین.wav', kind: 'موسیقی', mood: '', gain: 1, sec: 20, used: 0, heard: '✅ مدل شنید: زمینهٔ کشیده' };
  musicRecordOnce_(hub, { picks: [pickOf_(drone, 'شروع'), pickOf_(drone, 'پایان')], missing: [] }, 'special#971', 'درس‌نامه 971', 'د');
  const em2 = musicEdgeMissState_();
  const found = [], fWas = global.logSelfFinding_;
  global.logSelfFinding_ = (h, f) => { found.push(f); };
  const fired = musicEdgeMissCheck_(hub);
  global.logSelfFinding_ = fWas;
  ok('۲۵.۷ فقط طنین هم «بی‌آهنگ» است؛ دو قسمتِ پیاپی ⇒ یافتهٔ جدیِ کد',
     em2.n === 2 && /فقط طنین/.test(em2.why) && fired === true &&
     found.some((f) => f.key === 'music-edge-missing' && f.owner === ROWNER_CODE && f.priority === 'جدی'),
     JSON.stringify(em2) + ' · ' + JSON.stringify(found.map((f) => f.key)));
  const lineBad = musicLine_({ enabled: true, playable: 7, unheard: 0, edgeMiss: em2 });
  const song = { id: 's', row: 0, name: 'آهنگ.wav', kind: 'موسیقی', mood: '', gain: 1, sec: 30, used: 0, heard: '✅ مدل شنید: آهنگ (ملودی‌دار)' };
  musicRecordOnce_(hub, { picks: [pickOf_(song, 'شروع'), pickOf_(song, 'پایان')], missing: [] }, 'special#972', 'درس‌نامه 972', 'د');
  const em3 = musicEdgeMissState_();
  const found2 = []; global.logSelfFinding_ = (h, f) => { found2.push(f); };
  musicEdgeMissCheck_(hub); global.logSelfFinding_ = fWas;
  ok('۲۵.۸ قسمتِ آهنگین شمار را صفر می‌کند؛ خطِ روزانه فقط وقتِ ایراد می‌گوید',
     em3.n === 0 && !found2.length && /۲ قسمتِ پیاپی بی موسیقیِ آهنگین/.test(lineBad) &&
     !/پیاپی بی موسیقی/.test(musicLine_({ enabled: true, playable: 7, unheard: 0, edgeMiss: em3 })),
     lineBad + ' · ' + JSON.stringify(em3));
  const vf = selfVerifyMap_()['music-edge-missing'];
  ok('۲۵.۹ سنجندهٔ یافته از همان شمار می‌خوانَد؛ نبودنِ شاهد «نمی‌دانیم» است',
     vf && vf.still({ music: { edgeMiss: { n: 2 } } }) === true && vf.still({ music: { edgeMiss: { n: 0 } } }) === false &&
     vf.still({ music: {} }) === null);
  if (lastWas === undefined) delete global.__PROPS[PK.MUSIC_LAST]; else global.__PROPS[PK.MUSIC_LAST] = lastWas;
  delete global.__PROPS[PK.MUSIC_EDGE_MISS];

  global.musicPlanModel_ = planWas; global.musicListen_ = listenWas; global.logLine_ = logWas;
  delete global.__PROPS[PK.MUSIC_PLAN];
}

console.log('\n=== ۲۶. پلِ میانهٔ کم از همان آهنگ‌های شنیده‌شده، از جای دیگرشان؛ و پایانِ بلند (۸.۶۰) ===');
{
  /* او: «موسیقی‌های میانی فقط یه دونه پخش میشه؟» — درس‌نامهٔ ۷ اکتبر: آغاز و پایان یک آهنگ،
     و تنها پل یک «طنینِ کشیده». بانک آهنگِ شنیدهٔ کم دارد و هیچ قطعه‌ای دو بار نمی‌آمد. */
  const hub = getHub_();
  const sh = hub.getSheetByName(CFG.MUSIC_TAB);
  const F = musicFolder_();
  const mk = (nm, secs, hz) => F.createFile(Utilities.newBlob(
    Utilities.newBlob(mkWav(24000, 1, 16, secs, (i) => Math.round(9000 * Math.sin(i / hz)))).getBytes(), 'audio/wav', nm));
  mk('تم-آهنگ.wav', 60, 23); mk('پل-طنین۲.wav', 20, 41);
  musicScan_(hub);
  const rowsAll = () => sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues();
  const setup = () => {
    const rows = rowsAll();
    for (let r = 0; r < rows.length; r++) {
      const nm = String(rows[r][MC.NAME - 1]);
      sh.getRange(r + 2, MC.NOTE).setValue('');
      if (nm === 'تم-آهنگ.wav') {            // فقط برای لبه برچسب خورده — همان حالتِ واقعی
        sh.getRange(r + 2, MC.SLOTS).setValue('شروع، پایان');
        sh.getRange(r + 2, MC.HEARD).setValue('✅ مدل شنید: آهنگ (ملودی‌دار)');
        sh.getRange(r + 2, MC.MOOD).setValue('آرام');
      } else if (nm === 'پل-طنین۲.wav') {
        sh.getRange(r + 2, MC.SLOTS).setValue('میانه');
        sh.getRange(r + 2, MC.HEARD).setValue('✅ مدل شنید: زمینهٔ کشیده');
      } else {
        /* بقیهٔ بانکِ بخش‌های پیشین بیرون: نشنیده و بی جایگاهِ میانه. */
        sh.getRange(r + 2, MC.SLOTS).setValue('افکت');
        sh.getRange(r + 2, MC.HEARD).setValue('❓ نامعلوم');
      }
    }
  };
  setup();
  const planWas = global.musicPlanModel_, listenWas = global.musicListen_, clipWas = global.musicClip_;
  const theme = musicBank_(hub).filter((x) => x.name === 'تم-آهنگ.wav')[0];
  global.musicPlanModel_ = () => ({ introId: theme.id, outroId: theme.id, bridges: [], mood: 'آرام' });
  const calls = [];
  let rejectAt = -1;
  global.musicListen_ = (b, info, name, st) => {
    calls.push(name + '@' + st);
    if (/تم-آهنگ/.test(name)) return Number(st) === rejectAt ? 'زمینه' : 'آهنگ';
    return /طنین/.test(name) ? 'زمینه' : '';
  };
  const clips = [];
  global.musicClip_ = (id, o) => { clips.push({ id: id, o: o }); return clipWas(id, o); };
  const chunks = []; for (let i = 0; i < 12; i++) chunks.push({ text: 'ت' + i });
  const bounds = [1, 3, 5, 7, 9, 11].map((at, i) => ({ at: at, kind: 'section', heading: 'بخش ' + i, tone: '' }));
  const opt = { mood: 'آرام', bounds: bounds, show: 'special', episode: '980' };
  const brL = (r) => r.chunks.filter((c) => c.pcm && /میانه/.test(c.label)).map((c) => c.label);
  const brStarts = () => clips.filter((c) => c.id === theme.id && !c.o.bedIn && Number(c.o.lenSec) <= Number(CFG.MUSIC_BRIDGE_SEC))
                              .map((c) => Number(c.o.startSec));
  delete global.__PROPS[PK.MUSIC_PLAN];
  const floor = Math.min(Number(CFG.MUSIC_BRIDGE_MAX) || 0,
                         Math.ceil(bounds.length / (Number(CFG.MUSIC_BRIDGE_EVERY_SECTIONS) || 2)));
  const r1 = musicWrap_(chunks, hub, Object.assign({}, opt));
  const B1 = brL(r1), S1 = brStarts();
  ok('۲۶.۱ پل‌ها تا کف پر می‌شوند، از آهنگِ شنیده‌شده — نه یک طنین',
     floor >= 3 && B1.length === floor && B1.every((l) => /تم-آهنگ/.test(l)) && !B1.some((l) => /طنین/.test(l)),
     'کف ' + floor + ' · ' + JSON.stringify(B1));
  ok('۲۶.۲ هر پل از جای دیگرِ قطعه — هیچ بازه‌ای دو بار، و نه همان بازهٔ آغاز',
     S1.length === floor && new Set(S1).size === S1.length &&
     S1.every((s) => Math.abs(s - 0) >= Number(CFG.MUSIC_BRIDGE_SEC)),     // آغاز از ثانیهٔ ۰ پخش شد
     JSON.stringify(S1));
  ok('۲۶.۳ و هر بازهٔ تازه پیش از پخش شنیده شد — همان ثانیه',
     S1.every((s) => calls.indexOf('تم-آهنگ.wav@' + s) !== -1), calls.join(' '));
  /* ازسرگیری: همان پل‌ها، همان ثانیه‌ها، بی هیچ شنیدنی. */
  calls.length = 0; clips.length = 0;
  global.musicPlanModel_ = () => { throw new Error('ازسرگیری نباید نقشهٔ تازه بخواهد'); };
  let r2; try { r2 = musicWrap_(chunks, hub, Object.assign({}, opt)); } catch (e) { r2 = { chunks: [] }; calls.push('خطا ' + e.message); }
  ok('۲۶.۴ ازسرگیری همان پل‌ها را از همان ثانیه‌ها می‌دهد و چیزی نمی‌شنود',
     calls.length === 0 && JSON.stringify(brL(r2)) === JSON.stringify(B1) &&
     JSON.stringify(brStarts()) === JSON.stringify(S1), calls.join(' ') + ' · ' + JSON.stringify(brStarts()));
  global.musicPlanModel_ = () => ({ introId: theme.id, outroId: theme.id, bridges: [], mood: 'آرام' });

  /* بازه‌ای که «زمینه» شنیده شود پخش نمی‌شود — بازهٔ بعدی شنیده می‌شود. */
  rejectAt = S1[1];
  calls.length = 0; clips.length = 0;
  const r3 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '981' }));
  ok('۲۶.۵ بازه‌ای که آهنگ شنیده نشد پخش نمی‌شود — نشنیدن یعنی نه (۷.۶۸)',
     brStarts().indexOf(rejectAt) === -1 && calls.indexOf('تم-آهنگ.wav@' + rejectAt) !== -1,
     'رد ' + rejectAt + ' · پخش ' + JSON.stringify(brStarts()));
  rejectAt = -1;

  /* بی این قابلیت، همان یک طنین — یعنی پرشدن از خودِ همین قابلیت است. */
  const reWas = CFG.MUSIC_BRIDGE_REUSE;
  CFG.MUSIC_BRIDGE_REUSE = false;
  const r4 = musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '982' }));
  CFG.MUSIC_BRIDGE_REUSE = reWas;
  ok('۲۶.۶ کلیدِ خاموش ⇒ همان رفتارِ دیروز: یک پل، طنین',
     brL(r4).length === 1 && /طنین/.test(brL(r4)[0]), JSON.stringify(brL(r4)));

  /* ── پایانِ قسمت: محوِ بلندِ «دنباله» ── */
  clips.length = 0;
  musicWrap_(chunks, hub, Object.assign({}, opt, { episode: '983' }));
  const oc = clips.filter((c) => c.o && c.o.bedIn)[0];
  const oLen = Math.min(Number(CFG.MUSIC_OUTRO_SEC), theme.sec || 60);
  ok('۲۶.۷ موسیقیِ پایان با محوِ «دنباله» و بلند تمام می‌شود — نه سه ثانیه S',
     !!oc && oc.o.fadeCurve === 'tail' &&
     Math.abs(Number(oc.o.fadeOut) - Math.min(Number(CFG.MUSIC_OUTRO_FADE_SEC), oLen * Number(CFG.MUSIC_OUTRO_FADE_MAX_FRAC))) < 0.01 &&
     Number(oc.o.fadeOut) >= 8, JSON.stringify(oc && { f: oc.o.fadeOut, c: oc.o.fadeCurve }));
  {
    const SR = CFG.SAMPLE_RATE || 24000, n = 20 * SR, fo = 8;
    const a = [], b = [];
    for (let i = 0; i < n; i++) { a.push(10000); b.push(10000); }
    musicShape_(a, 1, 0, fo, 'tail'); musicShape_(b, 1, 0, fo);
    const mid = n - Math.floor(fo * SR / 2), q3 = n - Math.floor(fo * SR / 4);
    ok('۲۶.۸ شکلِ دنباله: نیمهٔ محو ~۱۲− دسی‌بل (S هنوز ۶−)، و آرام به صفر می‌رسد',
       Math.abs(a[mid] - 2500) < 60 && Math.abs(b[mid] - 5000) < 60 && a[q3] < b[q3] && a[n - 1] < 20,
       a[mid] + ' / ' + b[mid] + ' · ' + a[q3] + ' / ' + b[q3]);
  }
  ok('۲۶.۹ تلفیق‌ها و پل بلندترند — شیبِ ملایم بی زمانِ کافی ممکن نیست',
     Number(CFG.MUSIC_BRIDGE_SEC) >= 10 && Number(CFG.MUSIC_XFADE_BRIDGE_SEC) >= 3 &&
     Number(CFG.MUSIC_XFADE_EDGE_SEC) >= 4.5 && Number(CFG.MUSIC_OUTRO_FADE_SEC) >= 8 &&
     2 * Number(CFG.MUSIC_XFADE_BRIDGE_SEC) < Number(CFG.MUSIC_BRIDGE_SEC),
     CFG.MUSIC_BRIDGE_SEC + '/' + CFG.MUSIC_XFADE_BRIDGE_SEC + '/' + CFG.MUSIC_XFADE_EDGE_SEC);

  /* ── شمارشِ پل‌ها و یافته ── */
  delete global.__PROPS[PK.MUSIC_EDGE_MISS]; delete global.__PROPS[PK.MUSIC_LOGGED];
  const lastWas = global.__PROPS[PK.MUSIC_LAST];
  const song = { id: 's2', row: 0, name: 'آهنگ.wav', kind: 'موسیقی', mood: '', gain: 1, sec: 30, used: 0, heard: '✅ مدل شنید: آهنگ (ملودی‌دار)' };
  const tone = { id: 't2', row: 0, name: 'طنین.wav', kind: 'موسیقی', mood: '', gain: 1, sec: 20, used: 0, heard: '✅ مدل شنید: زمینهٔ کشیده' };
  const thinMw = { picks: [pickOf_(song, 'شروع'), pickOf_(tone, 'میانه'), pickOf_(song, 'پایان')], missing: [], bridgeFloor: 3 };
  musicRecordOnce_(hub, thinMw, 'special#990', 'درس‌نامه 990', 'د');
  const e1 = musicEdgeMissState_();
  ok('۲۶.۱۰ پل‌ها جدا شمرده می‌شوند — آغاز و پایانِ آهنگین «یک پلِ طنین» را نمی‌پوشانند',
     e1.n === 0 && e1.br === 1 && e1.brMelo === 0 && e1.brFloor === 3 && e1.brN === 1, JSON.stringify(e1));
  musicRecordOnce_(hub, thinMw, 'special#991', 'درس‌نامه 991', 'د');
  const fnd = [], fWas = global.logSelfFinding_;
  global.logSelfFinding_ = (h, f) => { fnd.push(f); };
  musicEdgeMissCheck_(hub);
  global.logSelfFinding_ = fWas;
  const line = musicLine_({ enabled: true, playable: 7, unheard: 0, edgeMiss: musicEdgeMissState_() });
  ok('۲۶.۱۱ دو قسمتِ پیاپی کمتر از کف ⇒ یافتهٔ کد؛ و خطِ روزانه همیشه شمارِ پل‌ها را می‌گوید',
     fnd.some((f) => f.key === 'music-bridge-thin' && f.owner === ROWNER_CODE) &&
     /پل‌های میانهٔ آخرین قسمت/.test(line) && /کمتر از کف/.test(line), line + ' · ' + JSON.stringify(fnd.map((f) => f.key)));
  const full = { picks: [pickOf_(song, 'شروع'), pickOf_(song, 'میانه'), pickOf_(song, 'میانه'), pickOf_(song, 'میانه'), pickOf_(song, 'پایان')],
                 missing: [], bridgeFloor: 3 };
  musicRecordOnce_(hub, full, 'special#992', 'درس‌نامه 992', 'د');
  const vb = selfVerifyMap_()['music-bridge-thin'];
  ok('۲۶.۱۲ قسمتِ کامل شمار را صفر می‌کند؛ سنجنده از همان شمار می‌خوانَد',
     musicEdgeMissState_().brN === 0 && vb && vb.still({ music: { edgeMiss: { brN: 2 } } }) === true &&
     vb.still({ music: { edgeMiss: { brN: 0 } } }) === false && vb.still({ music: {} }) === null,
     JSON.stringify(musicEdgeMissState_()));
  if (lastWas === undefined) delete global.__PROPS[PK.MUSIC_LAST]; else global.__PROPS[PK.MUSIC_LAST] = lastWas;
  delete global.__PROPS[PK.MUSIC_EDGE_MISS];
  global.musicPlanModel_ = planWas; global.musicListen_ = listenWas; global.musicClip_ = clipWas;
  delete global.__PROPS[PK.MUSIC_PLAN];
}

console.log('\n✅ هر ' + pass + ' آزمونِ بانکِ موسیقی گذشت.');
