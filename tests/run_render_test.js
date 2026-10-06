/**
 * run_render_test.js — آزمونِ `tools/render.js`
 *
 * ══ چرا این فایل تا امروز نبود، و چرا بودنش لازم است ══
 * `tools/render.js` **هر ویدئویی که در یوتیوب منتشر می‌شود** را می‌سازد —
 * ۸۴ ردیف در `docs/renders.json` — و تا امروز **هیچ سنجه‌ای نداشت**. نه
 * رفتاری، نه ساختاری. پایینش یک `main();` خالی بود، پس `require` کردنش کلِ
 * کار را راه می‌انداخت و نوشتنِ سنجه ناممکن بود.
 *
 * و حالا که شاخهٔ اسلایدشو اضافه می‌شود، اولین چیزی که باید قفل شود
 * **رفتارِ امروز** است: ردیفی که `visuals` ندارد باید عیناً همان کاورِ
 * تک‌تصویریِ امروز را بگیرد. قولِ «چیزی خراب نمی‌شود» بی این سنجه، یک جمله
 * است.
 *
 * ══ و این مجموعه ffmpeg را واقعاً اجرا می‌کند ══
 * «بازبین‌ها کد رو فقط نبینن و اجرا باید بکنن» — حرفِ خودِ صاحبِ برنامه. پس
 * این‌جا تصویر و صوتِ واقعی ساخته می‌شود، اسلایدشوی واقعی رندر می‌شود، و
 * مدتِ خروجی با `ffmpeg -i` خوانده می‌شود. یک سنجه که فقط متنِ فرمان را
 * بسنجد، همان سنجه‌ای است که ۷٫۴۳ یک لایه بالاتر از محلِ شکست ایستاد.
 */

'use strict';

require('./lib/root.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const R = require('../tools/render.js');

let pass = 0;
function ok(name, cond, evidence) {
  if (cond) { pass++; console.log('  ✅ ' + name + (evidence ? ' — ' + evidence : '')); return; }
  console.log('  ❌ ' + name + (evidence ? ' — ' + evidence : ''));
  /* سرورِ آزمون باید کشته شود وگرنه پردازه جا می‌مانَد. و خروجیِ ناصفر لازم
     است چون حلقهٔ ۵۱ مجموعه با کدِ خروجی داوری می‌کند — بی آن، یک مجموعهٔ
     شکسته سبز شمرده می‌شود (همان `| head -1`ی که نبودِ ffmpeg را سبز رد کرد). */
  try { stopServer(); } catch (e) {}
  throw new Error('FAILED: ' + name);
}

/* ── بستر: ffmpeg و فایل‌های واقعی ─────────────────────────────────────── */

const FF = R.ffmpegExe();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rndr-'));
function ff(args) {
  cp.execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y'].concat(args),
                  { stdio: 'pipe' });
}
/** مدتِ واقعیِ یک MP4، از خودِ ffmpeg. فایلِ نیمه‌نوشته `Duration` ندارد. */
function durOf(file) {
  const r = cp.spawnSync(FF, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = String(r.stderr).match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) return -1;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}
function streamsOf(file) {
  const r = cp.spawnSync(FF, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  return String(r.stderr).split('\n').filter(l => /Stream #/.test(l)).join(' | ');
}

function mkWav(sec, dest) {
  ff(['-f', 'lavfi', '-i', 'sine=f=220:d=' + sec, '-ac', '1', '-ar', '44100', dest]);
  return dest;
}
function mkPng(dest, w, h, seed) {
  ff(['-f', 'lavfi', '-i', 'nullsrc=s=' + w + 'x' + h +
      ",geq=r='120+90*sin(X/" + (140 + seed * 9) + '+' + seed +
      ")':g='110+80*cos(Y/" + (160 + seed * 7) + '+' + seed +
      ")':b='150+70*sin((X+Y)/" + (200 + seed * 11) + ")'",
      '-frames:v', '1', dest]);
  return dest;
}

/* ── یک سرورِ محلی، در **پردازهٔ جدا** ────────────────────────────────────
 *
 * ══ چرا پردازهٔ جدا، و نه `http.createServer` در همین نود ══
 * `fetchTo` در `render.js` از `execFileSync` استفاده می‌کند، که **حلقهٔ
 * رویداد را می‌بندد**. پس یک سرورِ درون‌پردازه هرگز وصل را نمی‌پذیرد و
 * curl تا انتهای `--max-time` منتظر می‌مانَد: بن‌بستِ کامل. اولین نگارشِ
 * این مجموعه دقیقاً همین شد و ۶۰۰ ثانیه ایستاد و هیچ سنجه‌ای هم نگفت چرا.
 *
 * `python3 -m http.server` پردازهٔ جداست، پس مسدود نمی‌شود. و یک حسنِ دیگر
 * دارد: نوعِ محتوا را از **پسوند** حدس می‌زند، پس فایلی به نامِ `liar.png`
 * که بدنه‌اش HTML است با `Content-Type: image/png` سرو می‌شود — عیناً همان
 * دروغی که درایو برای فایلِ غیرعمومی می‌گوید (۷.۳۳)، و باید با سرآیندِ
 * بایت‌ها گرفته شود نه با هدرِ HTTP.
 */
const WWW = fs.mkdtempSync(path.join(TMP, 'www-'));
const PORT = 8100 + (process.pid % 1200);
const BASE = 'http://127.0.0.1:' + PORT;
const srv = cp.spawn('python3', ['-m', 'http.server', String(PORT),
                                 '--bind', '127.0.0.1', '--directory', WWW],
                     { stdio: 'ignore' });
function stopServer() { try { srv.kill('SIGKILL'); } catch (e) {} }

/** تا سرور بالا نیامده، سنجه‌ها بی‌معنا هستند. */
function waitServer() {
  for (let i = 0; i < 80; i++) {
    const r = cp.spawnSync('curl', ['-sS', '-o', '/dev/null', '--max-time', '2',
                                    BASE + '/'], { encoding: 'utf8' });
    if (r.status === 0) return true;
    cp.spawnSync('sleep', ['0.25']);
  }
  return false;
}
function serve(name, file) {
  fs.copyFileSync(file, path.join(WWW, name));
  return BASE + '/' + name;
}
function serveRaw(name, body) {
  fs.writeFileSync(path.join(WWW, name), body);
  return BASE + '/' + name;
}
if (!waitServer()) { stopServer(); throw new Error('سرورِ آزمون بالا نیامد'); }

/* ════════════════════════════════════════════════════════════════════════ */
console.log('\n══ ۱) رفتارِ امروز، قفل‌شده ══');
{
  const d = fs.mkdtempSync(path.join(TMP, 'a-'));
  const wav = mkWav(6, path.join(d, 'a.wav'));
  const cover = mkPng(path.join(d, 'c.png'), 1280, 720, 1);
  const out = path.join(d, 'o.mp4');

  /* ۱.۱ — **مرزِ اصلیِ کلِ این کار.** ردیفی که `visuals` ندارد نباید هیچ
     مسیرِ تازه‌ای برود. اگر این سنجه بشکند، یعنی ۸۴ ویدئوی موجود و هر
     ویدئوی بعدی در خطرند. */
  const noVis = R.buildVideo({ key: 'x:1' }, cover, wav, 6, out, d);
  ok('۱.۱ ردیفِ بی‌تصویر، همان مسیرِ کاورِ امروز را می‌رود',
     noVis.mode === 'cover' && (noVis.notes || []).length === 0 &&
     !fs.existsSync(out),
     'گرفت: ' + JSON.stringify(noVis) + ' — و هیچ فایلی نساخت، یعنی ' +
     '`makeMp4`ِ امروز دست‌نخورده صدا زده می‌شود');

  R.makeMp4(cover, wav, out);
  const dd = durOf(out);
  ok('۱.۲ و همان `makeMp4` هنوز MP4ِ سالمِ ۷۲۰p می‌سازد',
     fs.statSync(out).size > 5000 && Math.abs(dd - 6) < 0.6 &&
     /1280x720/.test(streamsOf(out)),
     'مدت ' + dd.toFixed(2) + ' ثانیه · ' + streamsOf(out).slice(0, 78));

  /* ۱.۳ — مدت از سرآیندِ WAV. کلِ زمان‌بندیِ تصویرها روی این عدد سوار
     می‌شود، پس حدس‌زدنی نیست. */
  const w7 = mkWav(7.5, path.join(d, 'b.wav'));
  const s7 = R.wavSeconds(w7);
  ok('۱.۳ مدتِ صوت از سرآیندِ خودش خوانده می‌شود، نه حدس',
     Math.abs(s7 - 7.5) < 0.05,
     'گرفت: ' + s7.toFixed(3) + ' برای یک WAVِ ۷٫۵ ثانیه‌ای');

  /* ۱.۳-ب — و فایلِ نیمه‌نوشته: اندازهٔ اعلام‌شده در هدر دروغ می‌گوید.
     همان اشتباهی که خودم یک بار با خواندنِ MP4ِ نیمه‌نوشته کردم. */
  const half = path.join(d, 'half.wav');
  const raw = fs.readFileSync(w7);
  fs.writeFileSync(half, raw.slice(0, Math.floor(raw.length / 2)));
  const sh = R.wavSeconds(half);
  ok('۱.۳-ب فایلِ نیمه‌نوشته مدتِ واقعی می‌دهد، نه عددِ هدر',
     sh > 3 && sh < 4.2,
     'گرفت: ' + sh.toFixed(3) + ' — هدر ۷٫۵ می‌گفت، روی دیسک نیمه بود');
}

console.log('\n══ ۲) کدام تصویر معتبر است ══');
{
  ok('۲.۱ نبودِ فیلد، فهرستِ خالی می‌دهد و نه خطا',
     R.visualsOf({}).length === 0 && R.visualsOf({ visuals: [] }).length === 0 &&
     R.visualsOf(null).length === 0,
     'موتورِ قدیمی این فیلد را نمی‌نویسد؛ نبودش باید بی‌صدا و بی‌خطر باشد');

  const v = R.visualsOf({ visuals: [
    { url: 'https://a/1.png', sec: 5 },
    { url: 'ftp://a/2.png' },                 // نشانیِ بی‌معنا
    { url: '' },                              // خالی
    { u: 'http://a/3.png', seconds: 9 },      // نامِ دیگرِ فیلدها
    { url: 'javascript:alert(1)' }            // و این هم نه
  ] });
  ok('۲.۲ فقط http(s) می‌ماند و نامِ دیگرِ فیلدها هم خوانده می‌شود',
     v.length === 2 && v[0].sec === 5 && v[1].sec === 9,
     'گرفت: ' + JSON.stringify(v));
}

console.log('\n══ ۳) زمان‌بندی — قاعدهٔ بی‌شکاف ══');
{
  /* ۳.۱ — خواستهٔ صریحِ صاحبِ برنامه: «اون مدت زمان که درست می‌کنه با
     تصویر باشه». پس جمعِ سهم‌ها باید **دقیقاً** مدتِ صوت باشد. */
  for (const [n, dur] of [[3, 60], [7, 300], [15, 1140], [2, 20]]) {
    const vis = [];
    for (let i = 0; i < n; i++) vis.push({ url: 'https://a/' + i, sec: 1 + (i % 4) });
    const tl = R.timelineOf(vis, dur);
    const sum = tl.reduce((a, b) => a + b.visible, 0);
    ok('۳.۱ ' + n + ' تصویر در ' + dur + ' ثانیه: جمعِ سهم‌ها دقیقاً مدتِ صوت است',
       Math.abs(sum - dur) < 0.02,
       'جمع ' + sum.toFixed(3) + ' در برابرِ ' + dur + ' — شکاف یعنی صفحهٔ سیاه');
  }

  /* ۳.۲ — تعدادِ زیاد در قسمتِ کوتاه: **تعداد کم می‌شود، نه اینکه همه خرد
     شوند**. یک تصویرِ نیم‌ثانیه‌ای دیده نمی‌شود، پس بودنش بی‌معناست. */
  const many = [];
  for (let i = 0; i < 40; i++) many.push({ url: 'https://a/' + i, sec: 1 });
  const tlM = R.timelineOf(many, 30);
  ok('۳.۲ تصویرِ زیاد در قسمتِ کوتاه: تعداد کم می‌شود، نه مدتِ هر کدام',
     tlM.length < 40 && tlM.length >= 1 &&
     tlM.every(x => x.visible >= 3.9) &&
     Math.abs(tlM.reduce((a, b) => a + b.visible, 0) - 30) < 0.02,
     tlM.length + ' تصویر ماند، کوتاه‌ترین ' +
     Math.min.apply(null, tlM.map(x => x.visible)).toFixed(2) + ' ثانیه');

  /* ۳.۳ — هر تکه یک `xfade` بیشتر از سهمِ دیده‌شدنی‌اش ورودی می‌گیرد، **جز
     آخری**. مدتِ خروجیِ زنجیره Σclip − XF×(N−1) است؛ اگر آخری هم `+XF`
     بگیرد، خروجی یک ثانیه بلندتر از صوت می‌شود و آن یک ثانیه سکوتِ ته
     هر قسمت است. اجرای واقعی همین را داد (۳۰٫۹۲ برای صوتِ ۳۰ ثانیه) و
     `-shortest` هم دقیق نبُرید. */
  const tl3 = R.timelineOf([{ url: 'https://a/1', sec: 2 },
                            { url: 'https://a/2', sec: 2 },
                            { url: 'https://a/3', sec: 2 }], 60);
  const total3 = tl3.reduce((a, b) => a + b.clip, 0) - 1.0 * (tl3.length - 1);
  ok('۳.۳ همه `+یک میان‌محوی` جز آخری — تا مدتِ خروجی دقیقاً مدتِ صوت شود',
     tl3.slice(0, -1).every(x => Math.abs(x.clip - x.visible - 1.0) < 0.01) &&
     Math.abs(tl3[tl3.length - 1].clip - tl3[tl3.length - 1].visible) < 0.01 &&
     Math.abs(total3 - 60) < 0.02,
     'مدتِ خروجیِ زنجیره ' + total3.toFixed(3) + ' برای صوتِ ۶۰ ثانیه · ' +
     JSON.stringify(tl3.map(x => ({ v: x.visible, c: x.clip }))));
}

console.log('\n══ ۴) سقفِ بایت ══');
{
  /* عددی که موتور رویش تصمیم می‌گیرد: بالای ۵۰ مگابایت نمی‌تواند برش دارد. */
  const v = R.vmaxFor(1140, 45, 128000);
  const implied = ((v + 128000) * 1140) / 8 / 1048576;
  ok('۴.۱ نرخِ بیت از مدتِ خودِ قسمت می‌آید و زیرِ سقف می‌نشیند',
     implied <= 45.2 && implied > 40,
     'برای ۱۹ دقیقه: ' + Math.round(v / 1000) + ' کیلوبیت ⇒ ' +
     implied.toFixed(1) + ' مگابایت (سقف ۴۵)');

  ok('۴.۱-ب قسمتِ بسیار بلند به نرخِ بی‌معنا نمی‌رسد — کفی هست',
     R.vmaxFor(100000, 45, 128000) === 120000,
     'گرفت: ' + R.vmaxFor(100000, 45, 128000) + ' — زیرِ این، تصویر دیگر تصویر نیست');
}

console.log('\n══ ۵) اسلایدشوی واقعی — ffmpeg اجرا می‌شود ══');
{
  const d = fs.mkdtempSync(path.join(TMP, 's-'));
  const wav = mkWav(30, path.join(d, 'a.wav'));
  const cover = mkPng(path.join(d, 'c.png'), 1280, 720, 0);
  const out = path.join(d, 'o.mp4');

  /* تصویرها با نسبت‌های **مختلف** — چون واقعیت همین است و `crop`/`pad` باید
     یک‌دستشان کند. */
  const dims = [[1920, 1080], [1600, 900], [1024, 768], [2000, 1000], [1280, 1280]];
  const vis = [];
  for (let i = 0; i < dims.length; i++) {
    const f = mkPng(path.join(d, 'p' + i + '.png'), dims[i][0], dims[i][1], i + 2);
    vis.push({ url: serve('p' + i + '.png', f), sec: 1 + (i % 3) });
  }

  const r = R.buildVideo({ key: 'special:99', visuals: vis }, cover, wav, 30, out, d);
  const dd = durOf(out);

  /* شاهد **محافظت‌شده**: در حالتِ کاور فایلی ساخته نمی‌شود، پس `statSync`
     پیش از آنکه `ok` بتواند گزارش دهد می‌ترکید و شکستِ سنجه به شکلِ یک
     TypeErrorِ نامربوط درمی‌آمد — یعنی «افتاد» و «نیفتاد» یک شکل داشتند. */
  const outKB = fs.existsSync(out) ? Math.round(fs.statSync(out).size / 1024) : -1;
  ok('۵.۱ اسلایدشو ساخته شد و **مدتش دقیقاً مدتِ صوت است**',
     r.mode === 'slides' && r.n === 5 && Math.abs(dd - 30) < 0.25,
     'حالت=' + r.mode + ' · مدت ' + dd.toFixed(2) + ' در برابرِ صوتِ ۳۰ ثانیه · ' +
     (r.n || 0) + ' تصویر در ' + (r.groups || 0) + ' دسته · ' + outKB + ' کیلوبایت' +
     ((r.notes || []).length ? ' · ' + JSON.stringify(r.notes).slice(0, 110) : ''));

  ok('۵.۱-ب و هر دو جریان در آن است، با ابعادِ ۱۰۸۰p',
     /1920x1080/.test(streamsOf(out)) && /Audio/.test(streamsOf(out)),
     streamsOf(out).slice(0, 110));

  ok('۵.۲ یک دسته برای پنج تصویر — و این نسخهٔ پوچ نیست، §۵.۴ ادامه‌اش است',
     r.groups === 1,
     r.groups + ' دسته برای ۵ تصویر (دستهٔ پیش‌فرض ۸ است)');

  /* ══ ۵.۳ — سنجه‌ای که دوباره نشانه گرفته شد، نه پاک (۷.۹۴) ══
     نگارشِ اولش می‌سنجید که رانر JPEGهای ~۹۰۰ پیکسلیِ جزوه را می‌سازد و به
     ریلیز می‌فرستد. گامِ ۴ نشان داد آن یک مسیرِ دومِ بی‌فایده بود: جزوه همان
     تصویرِ درایو را با `sz=w900` در هر اندازه‌ای می‌گیرد، و نشانیِ ریلیز
     **عمومیِ همیشگی** است — مرزی که `voice-lab.yml` از روزِ اول نوشته و
     `dropCollected` برای پلِ صدا پیاده می‌کند.
     پس آنچه واقعاً باید محافظت شود این است: **رانر نسخهٔ دومِ عمومی از
     تصویرهای قسمت نمی‌سازد.** روی دیسکِ کارِ همین ساخت، هیچ JPEGی نباید
     باشد، و خروجی هیچ فهرستی از فایلِ اضافی برنمی‌گرداند. */
  const leftovers = fs.readdirSync(d).filter(f => /\.(jpe?g)$/i.test(f));
  ok('۵.۳ رانر نسخهٔ دومِ عمومی از تصویرها نمی‌سازد — یک مرز، نه یک بهینه‌سازی',
     leftovers.length === 0 && r.handout === undefined &&
     require('../tools/render.js').handoutJpegs === undefined,
     leftovers.length ? leftovers.join(' | ') : 'هیچ فایلِ JPEGی روی دیسک نماند');
}

console.log('\n══ ۵-ب) مسیرِ چنددسته — همانی که برای حافظه ساخته شد ══');
{
  /* ══ چرا این بند جدا هست ══
     ساختِ دسته‌دسته برای **حافظه** است نه زیبایی: یک فرمانِ ffmpeg با ۹۰
     ورودیِ ۱۹۲۰×۱۰۸۰ و ۸۹ `xfade`ِ زنجیره‌ای با SIGKILL مُرد (سنجیده شد،
     ۳۰ سپتامبر). §۵ با پنج تصویر **یک** دسته می‌سازد، یعنی گذرِ دومِ
     پیوندِ دسته‌ها و ریاضیِ افستش آن‌جا هرگز اجرا نمی‌شود.

     نگارشِ اولِ همین سنجه `groups >= 1` بود — که برای هر ساختِ موفقی درست
     است و هیچ چیزی را نگه نمی‌داشت. همان تلهٔ «سنجه‌ای که حالتِ راحت را
     می‌سنجد» که این پرونده بارها ثبتش کرده. این‌جا **بیشتر از یک دسته**
     ساخته می‌شود و مدتِ خروجی سنجیده می‌شود — چون اگر ریاضیِ افستِ گذرِ
     دوم غلط باشد، ویدئو از صوت کوتاه‌تر یا بلندتر درمی‌آید. */
  const d = fs.mkdtempSync(path.join(TMP, 'm-'));
  const wav = mkWav(60, path.join(d, 'a.wav'));
  const cover = mkPng(path.join(d, 'c.png'), 1280, 720, 7);
  const out = path.join(d, 'o.mp4');
  const vis = [];
  for (let i = 0; i < 10; i++) {
    const f = mkPng(path.join(d, 'q' + i + '.png'),
                    1600 + (i % 3) * 200, 900 - (i % 4) * 100, i + 11);
    vis.push({ url: serve('q' + i + '.png', f), sec: 1 });
  }
  const r2 = R.buildVideo({ key: 'special:98', visuals: vis }, cover, wav, 60, out, d);
  const d2 = durOf(out);
  ok('۵.۴ ده تصویر ⇒ بیش از یک دسته، و مدت هنوز دقیقاً مدتِ صوت است',
     r2.mode === 'slides' && r2.n === 10 && r2.groups > 1 &&
     Math.abs(d2 - 60) < 0.25,
     'حالت=' + r2.mode + ' · ' + (r2.n || 0) + ' تصویر در ' + (r2.groups || 0) +
     ' دسته · مدت ' + d2.toFixed(2) + ' در برابرِ ۶۰ ثانیه' +
     ((r2.notes || []).length ? ' · ' + JSON.stringify(r2.notes).slice(0, 90) : ''));

  /* و فایل‌های میانیِ دسته‌ها نباید جا بمانند: یک قسمتِ بلند ده‌ها فایلِ
     چندمگابایتی تولید می‌کند و دیسکِ رانر بی‌نهایت نیست. */
  const left = fs.readdirSync(d).filter(f => /^g\d+\.mp4$/.test(f));
  ok('۵.۵ فایل‌های میانیِ دسته‌ها پاک می‌شوند',
     left.length === 0,
     'باقی‌مانده: ' + JSON.stringify(left));
}

console.log('\n══ ۵-پ) نرخِ فریمِ ورودی — باگی که فقط از زمان دیده می‌شد ══');
{
  /* ══ چرا این بند هست ══
   * `-loop 1 -t <clip>` با نرخِ پیش‌فرضِ ورودی (۲۵) یعنی `clip×25` فریمِ
   * **ورودی**، و `zoompan` برای هر فریمِ ورودی `d` فریم می‌سازد. پس یک تکهٔ
   * هفت‌ثانیه‌ای ۲۹٬۴۰۰ فریم می‌داد: **۲۰ دقیقه و ۲۵ ثانیه ویدئو برای هفت
   * ثانیه کار**، در ۲ دقیقه و ۳۰ ثانیه پردازنده به‌جای ۱٫۲ ثانیه.
   *
   * و **خروجی درست بود** — گذرِ دوم با افستِ مطلق می‌بُرید و `-t` تهش را
   * می‌زد. پس هیچ سنجهٔ درستی‌ای قرمز نمی‌شد و هیچ خطایی هیچ‌جا نبود. تنها
   * نشانه‌اش زمان بود: کلِ این مجموعه ۹ دقیقه می‌بُرد، حالا یک دقیقه.
   *
   * در تولید این یعنی یک قسمتِ ۱۹ دقیقه‌ای ~۴۰ دقیقه می‌بُرد و از سقفِ ۵۰
   * دقیقه‌ایِ اکشن رد می‌شد — ویدئو ساخته نمی‌شد و کسی نمی‌فهمید چرا.
   */
  const src = fs.readFileSync('tools/render.js', 'utf8');
  ok('۵.۶ هر تصویر **یک** فریمِ ورودی می‌دهد، نه ۲۵ فریم در هر ثانیه',
     /'-loop',\s*'1',\s*'-framerate',\s*'1',\s*'-t',\s*'1'/.test(src),
     'بی این، `zoompan` برای هر فریمِ ورودی d فریم می‌سازد و کار ۱۷۵ برابر ' +
     'می‌شود — بی هیچ خطایی، چون خروجی درست است');

  /* و یک شاهدِ رفتاری، چون سنجهٔ متنی یک لایه بالاتر از محلِ شکست است.
     این **هدفِ کارایی نیست** — مرزش صد برابرِ زمانِ واقعی است. چیزی که
     می‌گیرد یک اشتباهِ ساختاریِ ۱۷۵ برابری است، نه چند درصد کندی. */
  const d = fs.mkdtempSync(path.join(TMP, 't-'));
  const wav = mkWav(10, path.join(d, 'a.wav'));
  const cover = mkPng(path.join(d, 'c.png'), 1280, 720, 5);
  const out = path.join(d, 'o.mp4');
  const vis = [];
  for (let i = 0; i < 3; i++) {
    vis.push({ url: serve('t' + i + '.png',
                          mkPng(path.join(d, 't' + i + '.png'), 1920, 1080, i + 21)),
               sec: 1 });
  }
  const t0 = Date.now();
  const rt = R.buildVideo({ key: 'x:9', visuals: vis }, cover, wav, 10, out, d);
  const el = (Date.now() - t0) / 1000;
  ok('۵.۶-ب و ساختِ ده ثانیه ویدئو، ده ثانیه کار است نه بیست دقیقه',
     rt.mode === 'slides' && el < 45 && Math.abs(durOf(out) - 10) < 0.25,
     el.toFixed(1) + ' ثانیه برای ۱۰ ثانیه ویدئو (مرز ۴۵ — پیش از اصلاح ~۲۵۰ ' +
     'ثانیه می‌شد) · مدت ' + durOf(out).toFixed(2));
}

console.log('\n══ ۶) شکست، به کاور برمی‌گردد — نه به قسمتِ بی‌ویدئو ══');
{
  const d = fs.mkdtempSync(path.join(TMP, 'f-'));
  const wav = mkWav(8, path.join(d, 'a.wav'));
  const cover = mkPng(path.join(d, 'c.png'), 1280, 720, 9);
  const out = path.join(d, 'o.mp4');

  /* ۶.۱ — نشانی‌هایی که هیچ‌کدام نمی‌آیند. باید کاور شود، با دلیل، بی خطا. */
  const bad = R.buildVideo({ key: 'x:2', visuals: [
    { url: BASE + '/nope-1.png' }, { url: BASE + '/nope-2.png' }
  ] }, cover, wav, 8, out, d);
  ok('۶.۱ تصویری که نیامد ⇒ کاورِ امروز، با دلیلِ نوشته‌شده، بی پرتِ خطا',
     bad.mode === 'cover' && (bad.notes || []).length >= 1,
     'گرفت: ' + JSON.stringify(bad.notes).slice(0, 120));

  /* ۶.۲ — و صفحهٔ HTMLی که با کدِ ۲۰۰ و `Content-Type: image/png` می‌آید.
     همان چیزی که درایو برای فایلِ غیرعمومی می‌دهد (۷.۳۳). بایت‌ها باید
     ردش کنند، نه هدرِ HTTP. */
  /* ══ و این بدنه عمداً بلند است ══
     نگارشِ اول ۴۸ بایت بود، و `sniffKind` کفِ ۶۴ بایتی دارد — پس فایل
     **به‌خاطرِ اندازه** رد می‌شد و هرگز به وارسیِ «<» نمی‌رسید. سنجه سبز بود
     به دلیلِ غلط، و آن شاخه کدِ مرده. شکستنِ عمدیِ آن وارسی هیچ‌جا نیفتاد و
     همین لوش داد. صفحهٔ ورودِ گوگل — همان چیزی که درایو برای فایلِ غیرعمومی
     می‌دهد — کیلوبایتی است، پس بدَل هم باید باشد. */
  const liarUrl = serveRaw('liar.png',
    '<!DOCTYPE html><html><head><title>Sign in - Google Accounts</title></head>' +
    '<body><div id="view_container">' + 'x'.repeat(400) + '</div></body></html>');
  const liar = R.buildVideo({ key: 'x:3', visuals: [
    { url: liarUrl }, { url: liarUrl }
  ] }, cover, wav, 8, out, d);
  ok('۶.۲ صفحهٔ HTML با Content-Type دروغین، از سدِ بایت‌ها نمی‌گذرد',
     liar.mode === 'cover' &&
     (liar.notes || []).some(x => /بایت‌ها تصویر نبود/.test(x)),
     'گرفت: ' + JSON.stringify(liar.notes).slice(0, 130));

  /* ۶.۳ — یک تصویرِ سالم تنها هم کافی نیست: اسلایدشو حداقل دو تصویر
     می‌خواهد و با یکی باید به کاور برگردد، نه اینکه ویدئوی تک‌فریمِ
     نصفه بسازد. */
  const oneUrl = serve('one.png', mkPng(path.join(d, 'one.png'), 1920, 1080, 4));
  const one = R.buildVideo({ key: 'x:4', visuals: [
    { url: oneUrl }, { url: BASE + '/gone.png' }
  ] }, cover, wav, 8, out, d);
  ok('۶.۳ با یک تصویرِ سالم هم به کاور برمی‌گردد و می‌گوید چرا',
     one.mode === 'cover' &&
     (one.notes || []).some(x => /کمتر از دو تصویر/.test(x)),
     'گرفت: ' + JSON.stringify(one.notes).slice(0, 120));
}

console.log('\n══ ۷) سرآیندِ بایت‌ها، نه پسوند ══');
{
  const d = fs.mkdtempSync(path.join(TMP, 'k-'));
  const png = mkPng(path.join(d, 'x.png'), 400, 300, 3);
  const jpg = path.join(d, 'x.jpg');
  ff(['-i', png, '-frames:v', '1', jpg]);
  const html = path.join(d, 'x.png2');
  /* بلندتر از کفِ ۶۴ بایتی، وگرنه اندازه ردش می‌کند و وارسیِ «<» سنجیده
     نمی‌شود — همان دلیلی که این سنجه یک بار به دلیلِ غلط سبز بود. */
  fs.writeFileSync(html, '<!DOCTYPE html><html><head><title>Sign in</title></head>' +
                         '<body>' + 'y'.repeat(300) + '</body></html>');
  const tiny = path.join(d, 'tiny.png');
  fs.writeFileSync(tiny, 'ab');
  /* و یک فایلِ **بلند** که هیچ قالبِ شناخته‌ای نیست — تا «ناشناخته» هم از
     راهِ خودش سنجیده شود، نه از راهِ کفِ اندازه. */
  const junk = path.join(d, 'junk.png');
  fs.writeFileSync(junk, Buffer.concat([Buffer.from([1, 2, 3, 4]), Buffer.alloc(300, 7)]));

  ok('۷.۱ PNG و JPEG از سرآیندشان شناخته می‌شوند، و صفحهٔ HTML رد',
     R.sniffKind(png) === 'png' && R.sniffKind(jpg) === 'jpeg' &&
     R.sniffKind(html) === '' && R.sniffKind(tiny) === '' &&
     R.sniffKind(junk) === '',
     'گرفت: png=' + R.sniffKind(png) + ' jpg=' + R.sniffKind(jpg) +
     ' html(' + fs.statSync(html).size + 'ب)="' + R.sniffKind(html) +
     '" tiny="' + R.sniffKind(tiny) + '" junk(' + fs.statSync(junk).size +
     'ب)="' + R.sniffKind(junk) + '"');
}

console.log('\n══ ۸) شکلِ ردیفِ نقشه — موتورِ امروز باید بخوانَدش ══');
{
  /* ۸.۱ — ردیفی که کاور گرفته نباید فیلدِ تازه‌ای داشته باشد. اگر داشته
     باشد، موتورِ امروز (که این فیلدها را نمی‌شناسد) یک «چیزِ ناشناخته»
     می‌بیند — همان شکلی که ۷.۴۶ هفته‌ها بی‌صدا ماند. */
  const src = fs.readFileSync('tools/render.js', 'utf8');
  const gated = /if \(vr\.mode === 'slides'\) \{[\s\S]{0,260}?visuals = vr\.n/.test(src);
  ok('۸.۱ فیلدهای تازه فقط در حالتِ اسلاید نوشته می‌شوند',
     gated && /map\.items\[it\.key\] = \{ url: url, bytes: size, parts: wavs\.length,/.test(src),
     'ردیفِ کاور همان چهار کلیدِ امروز را دارد، پس موتورِ امروز هم می‌خوانَدش');

  /* ۸.۲ — و سقفِ ۵۰ مگابایت **گفته** می‌شود. موتور خودش هم می‌فهمد، ولی
     آن‌جا یک شبانه‌روز دیرتر است. */
  ok('۸.۲ گذشتن از سقفِ ۵۰ مگابایت در لاگ گفته می‌شود',
     /49 \* 1024 \* 1024/.test(src) && /از سقفِ ۵۰/.test(src),
     'وگرنه موتور فردا شب رد می‌کند و کسی نمی‌داند چرا');
}

console.log('\n=== ۹) حرکت نباید متنِ کارت را ببُرد (۸.۰۰) ===');
{
  /* ══ باگی که نه خواندنِ کد نشانش داد و نه هیچ سنجه‌ای ══
   * ویدئوی نمونه ساخته شد و به **یک فریمِ وسطِ حرکت** نگاه شد: سرِ بخش
   * بریده بود، اولِ هر گلوله بریده بود، نوارِ کناری و نوارِ پایین رفته
   * بودند. علت یک ضرب است: کن‌برنز تا ۱٫۱۸ می‌رفت و لغزشِ افقی همهٔ
   * `1 - 1/z` را از یک لبه می‌بُرد (۱۵٫۳٪)، در حالی که `lvCardDraw_` متن
   * را با ۷٫۵٪ حاشیه می‌گذارد.
   *
   * دو عددِ وابسته در دو فایلِ مختلف که هیچ‌کس کنارِ هم نگذاشته بود — همان
   * شکلِ ۷٫۳۰/۷٫۳۱، این بار بینِ یک `.gs` و یک `.js`. پس این سنجه حاشیه را
   * **از خودِ منبعِ موتور** می‌خواند، نه از یک عددِ دستی: اگر روزی
   * `lvCardDraw_` حاشیه را کم کند، این‌جا قرمز می‌شود. */
  const rsrc = fs.readFileSync('tools/render.js', 'utf8');
  const esrc = fs.readFileSync('src/27_YouTube.gs', 'utf8');

  /* **تنگ‌ترین** حاشیه، نه حاشیهٔ یک تابع. نگارشِ اولِ این سنجه فقط
     `lvCardDraw_` را می‌دید (۰٫۰۷۵) و `lvFlowDraw_` — که جعبه‌های نمودار را
     با ۰٫۰۷ می‌گذارد — از قلم می‌افتاد. سنجه‌ای که فقط یکی از چند مصرف‌کننده
     را ببیند، همان درِ بازی است که ۶.۲۰ درباره‌اش نوشته شده. */
  const pads = (esrc.match(/var pad = W \* ([0-9.]+)/g) || [])
    .map(x => Number(x.replace(/[^0-9.]/g, '')));
  const pad = pads.length ? Math.min.apply(null, pads) : NaN;
  ok('۹.۱ تنگ‌ترین حاشیهٔ کارت از خودِ منبعِ موتور خوانده شد',
     isFinite(pad) && pad > 0 && pad < 0.5 && pads.length >= 2,
     pads.length + ' حاشیه در بخشِ ۲۷، تنگ‌ترین ' + pad);

  const mSafe = rsrc.match(/safe:\s*([0-9.]+)/);
  const safe = mSafe ? Number(mSafe[1]) : NaN;
  ok('۹.۲ و رِندر همان عدد را می‌شناسد — دو عدد در دو فایل از هم دور نمی‌افتند',
     safe === pad, 'رِندر ' + safe + ' در برابرِ موتور ' + pad);

  /* ۹.۳ — حسابِ اصلی: بدترین حالت (لغزشِ افقیِ کامل) همهٔ `1 - 1/z` را از
     یک لبه می‌بَرد. آن باید **کمتر** از حاشیه باشد، نه مساوی: مساوی یعنی
     صفر حاشیهٔ خطا، و همان بود که باگ را ساخت. */
  const mUse = rsrc.match(/safeUse:\s*([0-9.]+)/);
  const zmax = 1 / (1 - safe * Number(mUse[1]));
  const worst = 1 - 1 / zmax;
  ok('۹.۳ بدترین بُرشِ حرکت کمتر از حاشیهٔ امنِ کارت است',
     worst < pad && worst > 0.01,
     'بُرش ' + (worst * 100).toFixed(1) + '٪ در برابرِ حاشیهٔ ' + (pad * 100) + '٪');

  /* ۹.۴ — و سقف در **رشتهٔ واقعیِ ffmpeg** هم همان است، نه عددی دستی که
     کنارِ یک ثابتِ درست بنشیند: آن دقیقاً همان کدِ مرده‌ای است که این
     مخزن بارها خورده. */
  ok('۹.۴ سقف در رشتهٔ فیلتر از همان ZMAX می‌آید، نه از عددِ دستی',
     (rsrc.match(/ZMAX\.toFixed\(6\)/g) || []).length >= 2 && !/1\.18/.test(rsrc),
     'ZMAX در رشتهٔ فیلتر: ' + (rsrc.match(/ZMAX\.toFixed\(6\)/g) || []).length +
     ' بار · «۱٫۱۸»ِ کهنه هنوز در فایل هست؟ ' + /1\.18/.test(rsrc));
}

console.log('\n=== ۱۰) کارت‌های برداری: تصویرِ هر کارت و شاهدِ حالت (۸.۲۶) ===');
{
  /* ۱۰.۱ — تصویرِ ساخته‌شدهٔ هر کارت **این‌جا** برداشته می‌شود (cardkit هیچ
     چیزی دانلود نمی‌کند)، با بایت‌ها سنجیده می‌شود نه با پسوند، و پیش از
     جاسازی کوچک می‌شود. یک HTMLِ دروغ‌گو (فایلی که اشتراکش باز نشده) کارت را
     بی‌تصویر می‌گذارد و **گفته** می‌شود — کلِ ویدئو زمین نمی‌خورد. */
  const d = fs.mkdtempSync(path.join(TMP, 'bg-'));
  const good = serve('bg-good.png', mkPng(path.join(d, 'g.png'), 1600, 900, 3));
  const liar = serveRaw('bg-liar.png', '<html><body>Sign in</body></html>'.repeat(40));
  const spec = { cards: [ { form: 'focus', at: 0, headline: 'یک', bgUrl: good },
                          { form: 'quote', at: 9, headline: 'دو', bgUrl: liar },
                          { form: 'quote', at: 19, headline: 'سه' } ] };
  const notes = [];
  const n = R.specBackdrops(spec, d, notes);
  ok('۱۰.۱ تصویرِ درست جاسازی می‌شود، دروغ‌گو نه — و گفته می‌شود',
     n === 1 && /^data:image\/jpeg;base64,/.test(spec.cards[0].bg || '') &&
     !spec.cards[1].bg && !spec.cards[2].bg && notes.length === 1 && /کارتِ 2:/.test(notes[0]),
     n + ' جاسازی · ' + (spec.cards[0].bg || '').length + ' نویسه · ' + notes.join(' | '));

  /* ۱۰.۲ — و حالتِ «کارت» در نقشه شاهد دارد. تا ۸.۲۵ این مسیر هیچ ردی
     نمی‌گذاشت و سیاهه‌اش «کاورِ تک‌تصویری» می‌نوشت: روزی که کارت‌ها واقعاً
     ساخته شوند، از بیرون با ویدئوی تک‌قاب یک شکل بود. */
  const src = fs.readFileSync('tools/render.js', 'utf8');
  ok('۱۰.۲ حالتِ «کارت» در نقشه `mode/cards` می‌نویسد و سیاهه‌اش «کاور» نمی‌گوید',
     /if \(vr\.mode === 'cards'\) \{[\s\S]{0,200}?mode = 'cards'[\s\S]{0,120}?cards = vr\.cards/.test(src) &&
     /vr\.mode === 'cards' \? /.test(src),
     'نقشه و سیاهه');
}

console.log('\n=== ۱۱) نگه‌داشتنِ یک درخواستِ مشخص، با سقف (۸.۳۰) ===');
{
  /* ۱۱.۱ — نگه‌داشتن به **همان ردیف** بسته است: ردیفی که موتور بازنویسی کرد
     (`at` تازه) همان اجرا ساخته می‌شود؛ پس از `until` هم با هر چه هست؛ و
     کلیدِ دیگر هرگز. بی این سه مرز، نگه‌داشتن یا ویدئو را برای همیشه می‌خوابانَد
     یا درخواستِ درست‌شده را هم پشتِ در نگه می‌دارد. */
  const h = { 'special:59': { at: '2026-10-03 09:01', until: '2026-10-04T08:00:00Z', why: 'آزمون' } };
  const t0 = new Date('2026-10-03T12:00:00Z');
  const same = R.heldNow({ key: 'special:59', at: '2026-10-03 09:01' }, h, t0);
  const fresh = R.heldNow({ key: 'special:59', at: '2026-10-04 03:10' }, h, t0);
  const late = R.heldNow({ key: 'special:59', at: '2026-10-03 09:01' }, h, new Date('2026-10-04T08:00:01Z'));
  const other = R.heldNow({ key: 'special:60', at: '2026-10-04 09:01' }, h, t0);
  const broken = R.heldNow({ key: 'special:59', at: '2026-10-03 09:01' },
                           { 'special:59': { at: '2026-10-03 09:01', until: 'فردا' } }, t0);
  ok('۱۱.۱ همان ردیف نگه داشته می‌شود؛ ردیفِ بازنویسی‌شده، پس از سقف و کلیدِ دیگر نه',
     !!same && /آزمون/.test(same) && fresh === '' && late === '' && other === '' && broken === '',
     JSON.stringify([same, fresh, late, other, broken]));

  /* ۱۱.۲ — و از **درِ اجرا**: `main` ردیفِ نگه‌داشته را نمی‌سازد و می‌گوید.
     خواندنِ متن بس نیست (۷٫۴۴)؛ فیلتر باید روی همان فهرستی باشد که حلقه
     می‌پیماید. */
  const src = fs.readFileSync('tools/render.js', 'utf8');
  const mi = src.indexOf('function main()');
  const body = src.slice(mi, src.indexOf('\nfunction ', mi + 10) > 0 ? src.indexOf('\nfunction ', mi + 10) : undefined);
  ok('۱۱.۲ حلقهٔ ساخت روی فهرستِ پس از نگه‌داشتن می‌چرخد و نگه‌داشته را نام می‌برد',
     /* از ۸.۵۵ فیلتر در `itemsTodo` است — یک تعریف برای پروب و کار؛ پس سنجه می‌پرسد
        حلقه روی خروجیِ همان تابع می‌چرخد و آن تابع واقعاً نگه‌داشته را کنار می‌گذارد. */
     /itemsTodo\(queue, map, hold/.test(body) && /const items = T\.items, ready = T\.ready, todo = T\.todo/.test(body) &&
     /for \(const it of todo\)/.test(body) && /نگه داشته شد: /.test(body) &&
     R.itemsTodo({ items: [{ key: 'special:59', at: '2026-10-03 09:01', status: 'در انتظار' }] }, { items: {} },
                 { 'special:59': { at: '2026-10-03 09:01', until: '2026-10-04T08:00:00Z', why: 'آزمون' } }, t0).todo.length === 0,
     'main');
}

console.log('\n══ ۱۲) صحنه‌های مصور (۸.۳۱): تصویرِ تمام‌صفحه، مرز روی مکث، سنجش از خودِ ویدئو ══');
{
  const SKIT = require('../tools/scenekit.js');
  /* ۱۲.۱ — ردیفِ بی‌صحنه یا با کمتر از سه صحنهٔ معتبر، این حالت را نمی‌گیرد. */
  const s3 = SKIT.scenesOf({ scenes: [{ n: 2, t0: 20, url: 'https://a/2' }, { n: 1, t0: 0, url: 'https://a/1' },
                                      { n: 3, t0: 40, url: 'nope' }, { n: 4, t0: 60, url: 'https://a/4' }] });
  ok('۱۲.۱ صحنه‌های معتبر به ترتیبِ زمان؛ نشانیِ بی‌معنا رد؛ کمتر از سه یعنی «نه»',
     s3 && s3.length === 3 && s3[0].n === 1 && s3[2].n === 4 &&
     SKIT.scenesOf({ scenes: [{ t0: 0, url: 'https://a' }, { t0: 5, url: 'https://b' }] }) === null &&
     SKIT.scenesOf({}) === null,
     JSON.stringify(s3 && s3.map(x => x.n)));

  /* ۱۲.۲ — زمان‌بندی: از صفر تا آخر، بی شکاف؛ مرز روی نزدیک‌ترین مکث (اگر
     نزدیک باشد)؛ صحنهٔ خیلی کوتاه به قبلی می‌پیوندد. */
  const sc = [{ t0: 0 }, { t0: 10.4 }, { t0: 12.0 }, { t0: 25 }, { t0: 40 }];
  const tl = SKIT.timeline(sc, 50, [11.5, 24.1, 33]);
  const sum = tl.reduce((a, b) => a + b.d, 0);
  ok('۱۲.۲ زمان‌بندی بی شکاف و بی سرریز؛ مرز روی مکث؛ صحنهٔ کوتاه ادغام',
     tl[0].t0 === 0 && Math.abs(sum - 50) < 0.01 && tl[1].t0 === 11.5 && tl[2].t0 === 24.1 &&
     tl[3].t0 === 40 && tl.length === 4 && tl.every((x, i) => i === 0 || Math.abs(x.t0 - (tl[i - 1].t0 + tl[i - 1].d)) < 0.01),
     JSON.stringify(tl));

  /* ۱۲.۳ — حرکت آرام است و هرگز از قاب بیرون نمی‌زند: چهار گوشهٔ منبع در هر
     دو سرِ صحنه درونِ تصویر می‌مانند، و سه نوعِ حرکت هر سه هست. */
  /* همان تابع‌هایی که عبارتِ ffmpeg دارد (min/max/pow) — حرکتِ نرم‌آغاز از ۸.۵۶ آن‌ها را به کار می‌برد. */
  const ev = (e, on) => Function('W', 'H', 'on', 'min', 'max', 'pow', 'return (' + String(e) + ');')(1920, 1080, on, Math.min, Math.max, Math.pow);
  let inside = true; const kinds = new Set();
  for (let g = 0; g < 6; g++) {
    const N = 240, m = SKIT.motion(g, N);
    const at = on => ({ x0: ev(m.x0, on), x1: ev(m.x1, on), y0: ev(m.y0, on), y2: ev(m.y2, on) });
    const a = at(0), b = at(N);
    for (const q of [a, b]) {
      if (!(q.x0 >= -0.01 && q.x1 <= 1920.01 && q.y0 >= -0.01 && q.y2 <= 1080.01 && q.x0 < q.x1 && q.y0 < q.y2)) inside = false;
    }
    kinds.add(Math.abs(b.x0 - a.x0) < 0.01 ? 'ثابت' : (b.x1 - b.x0 < a.x1 - a.x0 - 1 ? 'نزدیک' :
              (b.x1 - b.x0 > a.x1 - a.x0 + 1 ? 'دور' : 'لغزش')));
  }
  ok('۱۲.۳ حرکتِ آرام در قاب می‌مانَد؛ نزدیک‌شدن، دورشدن و لغزش هر سه هست', inside && kinds.size >= 3,
     [...kinds].join('، '));
  /* ۱۲.۳-ب — «فقط زوم این و زوم اوت» (۶ اکتبر): بی کانون، شش صحنهٔ پشتِ‌هم دست‌کم چهار
     حرکتِ متفاوت دارند — گذرِ افقی در هر دو جهت و پایین‌آمدنِ عمودی هم. */
  const sig = [];
  for (let g = 0; g < 6; g++) {
    const m = SKIT.motion(g, 240);
    const a0 = { x: ev(m.x0, 0), y: ev(m.y0, 0), w: ev(m.x1, 0) - ev(m.x0, 0) };
    const a1 = { x: ev(m.x0, 240), y: ev(m.y0, 240), w: ev(m.x1, 240) - ev(m.x0, 240) };
    const dz = Math.sign(Math.round(a1.w - a0.w)), dxx = Math.sign(Math.round(a1.x - a0.x)), dyy = Math.sign(Math.round(a1.y - a0.y));
    sig.push(dz ? (dz < 0 ? 'نزدیک' : 'دور') + (Math.abs(a1.x - a0.x - (a0.w - a1.w) / 2) > 5 ? '-مورب' : '')
                : (dxx ? (dxx < 0 ? 'گذر←' : 'گذر→') : (dyy ? 'عمودی' : 'ثابت')));
  }
  const kinds2 = new Set(sig);
  ok('۱۲.۳-ب بی کانون، شش حرکتِ آرامِ متفاوت — نه فقط نزدیک و دور', kinds2.size >= 5 &&
     kinds2.has('گذر←') && kinds2.has('گذر→') && kinds2.has('عمودی'), sig.join('، '));
  /* ۱۲.۳-پ — گذر به‌سوی کانون: از سمتِ دیگر راه می‌افتد و به کانون می‌رسد، درونِ قاب. */
  const tv = SKIT.motion(1, 240, { k: 'travel', x: 0.8, y: 0.4, z: 0.14 });
  const cx = on => (ev(tv.x0, on) + ev(tv.x1, on)) / 2;
  let tIn = true;
  for (const on of [0, 60, 120, 180, 240]) {
    if (!(ev(tv.x0, on) >= -0.01 && ev(tv.x1, on) <= 1920.01 && ev(tv.y0, on) >= -0.01 && ev(tv.y2, on) <= 1080.01)) tIn = false;
  }
  /* پنجرهٔ ۸۶٪ی فقط ۱۴٪ِ پهنا جا دارد؛ «رسیدن» یعنی تا لبهٔ ممکن به سمتِ کانون. */
  const wc = 1920 * (1 - 0.14);
  ok('۱۲.۳-پ «travel» از سمتِ دیگر به کانون می‌رسد و در قاب می‌مانَد',
     tIn && cx(0) < 960 && Math.abs(cx(240) - (1920 - wc / 2)) < 1 && cx(120) > cx(0),
     [cx(0), cx(120), cx(240)].map(Math.round).join(' → '));
  /* ۱۲.۳-ت — گذارِ میانِ صحنه‌ها از معنا: بخشِ تازه ⇒ سیاهیِ کوتاه؛ روایت ⇒ حل‌شدن؛ ایده ⇒ نرم و یکی‌درمیان. */
  ok('۱۲.۳-ت گذار از بخش و ضرب: fadeblack / dissolve / smoothright‌ـfade',
     SKIT.xfadeOf({ sec: 1 }, { sec: 2, beat: 'ایده' }, 1) === 'fadeblack' &&
     SKIT.xfadeOf({ sec: 2 }, { sec: 2, beat: 'روایت' }, 1) === 'dissolve' &&
     SKIT.xfadeOf({ sec: 2 }, { sec: 2, beat: 'ایده' }, 1) === 'smoothright' &&
     SKIT.xfadeOf({ sec: 2 }, { sec: 2, beat: 'ایده' }, 2) === 'fade');

  /* ۱۲.۴ — **از درِ اجرا:** چهار صحنهٔ واقعی روی سرورِ محلی، صوت با مکث،
     زیرنویس و نشانِ کانال. ویدئو ساخته می‌شود، مدتش همان صوت است، سنجشِ خودِ
     فایل هر چهار صحنه را سرِ جایش می‌بیند، و کاورِ ۱۲۸۰×۷۲۰ از نقاشیِ درس. */
  const d = fs.mkdtempSync(path.join(TMP, 'sc-'));
  const wav = path.join(d, 'a.wav');
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*220*t)*between(mod(t,6),0,5.1)':s=24000:d=24", '-ac', '1', wav]);
  const urls = [];
  for (let i = 1; i <= 4; i++) urls.push(serve('scene' + i + '.png', mkPng(path.join(d, 'p' + i + '.png'), 1344, 768, i * 5)));
  const it = { key: 'special:test', mode: 'scenes',
    scenes: urls.map((u, i) => ({ n: i + 1, t0: i * 6 + (i ? 0.3 : 0), url: u, caption: i % 2 ? '' : 'مفهومِ ' + (i + 1) })),
    sceneCover: { url: urls[2] }, coverTitle: 'چرا احتمالِ بالا معرفت نیست؟', coverKicker: 'معرفت‌شناسی', coverFoot: 'درس ۳۷',
    mark: { handle: '@test-channel', name: 'آزمون', everySec: 12, opacity: 0.7 } };
  const dest = path.join(d, 'out.mp4');
  const t0 = Date.now();
  const vr = R.buildVideo(it, null, wav, R.wavSeconds(wav), dest, d);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const thumbOk = vr.thumbFile && R.sniffKind(vr.thumbFile) === 'jpeg';
  let tw = 0, th = 0;
  if (thumbOk) { const r = cp.spawnSync(FF, ['-hide_banner', '-i', vr.thumbFile], { encoding: 'utf8' });
                 const m = String(r.stderr).match(/, (\d+)x(\d+)/); if (m) { tw = +m[1]; th = +m[2]; } }
  ok('۱۲.۴ ویدئوی صحنه‌ای ساخته می‌شود؛ سنجش از خودِ فایل هر صحنه را سرِ جایش می‌بیند؛ کاور ۱۲۸۰×۷۲۰',
     vr.mode === 'scenes' && vr.n === 4 && vr.qa && vr.qa.ok === true && vr.qa.matched === 4 &&
     Math.abs(durOf(dest) - 24) < 0.6 && vr.snapped >= 1 && thumbOk && tw === 1280 && th === 720,
     'حالت ' + vr.mode + ' · ' + secs + ' ثانیه · سنجش ' + JSON.stringify(vr.qa) + ' · مدت ' + durOf(dest).toFixed(2) +
     ' · مکث ' + vr.snapped + ' · کاور ' + tw + '×' + th + ((vr.notes || []).length ? ' · ' + vr.notes.join(' | ') : ''));

  /* ۱۲.۵ — **سنجش واقعاً می‌سنجد:** همان ویدئو، با نقشه‌ای که دو تصویرش جابه‌جا
     شده — یعنی ویدئویی که صحنه‌اش جای دیگری است — رد می‌شود. */
  const tlOk = [0, 6.3, 12.3, 18.3].map((t, i) => ({ n: i + 1, t0: t, d: i < 3 ? 6 : 5.7,
                                                     img: path.join(d, 's' + String(i + 1).padStart(3, '0') + '.jpg') }));
  const sw = tlOk.map(x => Object.assign({}, x));
  const tmp = sw[1].img; sw[1].img = sw[2].img; sw[2].img = tmp;
  const qBad = SKIT.qa(FF, dest, sw, 24);
  const qGood = SKIT.qa(FF, dest, tlOk, 24);
  ok('۱۲.۵ صحنهٔ جابه‌جا را سنجش می‌گیرد و با علت رد می‌کند',
     qGood.ok === true && qBad.ok === false && qBad.miss.length >= 2 && /سرِ جای خودش/.test(qBad.why),
     'درست ' + qGood.matched + '/' + qGood.n + ' · جابه‌جا ' + qBad.matched + '/' + qBad.n + ' — ' + qBad.why);

  /* ۱۲.۵-ب — دو حالتی که ۱۲.۵ نمی‌دید، و شکستنِ عمدی نشانش داد:
     (الف) **تصویرِ هم‌سبک.** تصویرهای یک سری عمداً شبیه‌اند، پس «به خودش
     نزدیک‌تر از سقف» کافی نیست: قابی که در زمانِ صحنهٔ ۲ عملاً تصویرِ صحنهٔ ۳ را
     نشان می‌دهد ممکن است به تصویرِ ۲ هم زیرِ سقف نزدیک باشد. سدِ واقعی مقایسه با
     همسایه است. ساختنش: تصویرِ صحنهٔ ۲ در نقشه کمی روشن‌تر از قابِ واقعی، و
     همسایه‌اش **دقیقاً** همان قاب. با برداشتنِ مقایسهٔ همسایه، ۱۲.۵ سبز می‌ماند.
     (ب) **قابِ خالی.** ویدئوی سراسر سیاه نباید «سرِ جایش نیست» بخورد — علتش
     چیزِ دیگری است و باید به نام بیاید؛ بی سنجهٔ انحرافِ معیار، سیاه فقط
     «نامطابق» شمرده می‌شد. */
  const near = path.join(d, 'near2.jpg');
  ff(['-i', tlOk[1].img, '-vf', 'eq=brightness=0.05', near]);
  const nb = tlOk.map(x => Object.assign({}, x));
  nb[1].img = near;                       // نقشه: «صحنهٔ ۲ این است» — شبیه، نه همان
  nb[0].img = tlOk[1].img;                // و همسایه‌اش دقیقاً همان قاب
  const qNear = SKIT.qa(FF, dest, nb, 24);
  const ownNear = SKIT.mad(SKIT.gray(FF, dest, 6.3 + 3), SKIT.gray(FF, near));
  const black = path.join(d, 'black.mp4');
  ff(['-f', 'lavfi', '-i', 'color=c=black:s=640x360:d=24:r=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', black]);
  const qBlack = SKIT.qa(FF, black, tlOk, 24);
  ok('۱۲.۵-ب قابی که به همسایه نزدیک‌تر است «سرِ جایش نیست»، حتی زیرِ سقف؛ قابِ سیاه «خالی» نام می‌گیرد',
     ownNear <= SKIT.SK.qaMad && qNear.miss.indexOf(2) !== -1 &&
     qBlack.blank.length === 4 && qBlack.ok === false && /قابِ خالی/.test(qBlack.why),
     'اختلافِ خود ' + ownNear.toFixed(1) + ' (سقف ' + SKIT.SK.qaMad + ') · نامطابق ' + JSON.stringify(qNear.miss) +
     ' · سیاه: خالی ' + qBlack.blank.length + ' — ' + qBlack.why);

  /* ۱۲.۶ — نگه‌داشتنِ «فقط کارت» صحنه‌ها را نگه نمی‌دارد (درسِ ۶۰). */
  const hC = { 'special:60': { until: '2099-01-01T00:00:00Z', why: 'کارت', cardsOnly: true } };
  ok('۱۲.۶ نگه‌داشتنِ «فقط کارت» ردیفِ کارتی را نگه می‌دارد و ردیفِ صحنه‌ای را نه',
     !!R.heldNow({ key: 'special:60', at: 'x' }, hC) && R.heldNow({ key: 'special:60', at: 'y', mode: 'scenes' }, hC) === '');

  /* ۱۲.۷ — و نقشه **سنجش و کاور را می‌نویسد**؛ بی آن موتور نمی‌داند ویدئو سالم
     است و هرگز عمومی‌اش نمی‌کند. خواندنِ متنِ `main`، چون این مسیر گیت‌هاب
     می‌خواهد. */
  const src = fs.readFileSync('tools/render.js', 'utf8');
  ok('۱۲.۷ نقشه حالت، سنجش و کاورِ صحنه‌ای را برای موتور ثبت می‌کند',
     /map\.items\[it\.key\]\.qa = vr\.qa/.test(src) && /'-cover\.jpg', 'image\/jpeg'\)/.test(src) &&
     /map\.items\[it\.key\]\.thumb = tu/.test(src) && /map\.items\[it\.key\]\.mode = 'scenes'/.test(src));
}

console.log('\n══ ۱۳) نوشتهٔ رویِ نقاشی و نشانِ بی‌مربع (۸.۴۵) ══');
{
  const OVL = require('../tools/overlay.js');
  const SKIT = require('../tools/scenekit.js');
  const CK = require('../tools/cardkit/index.js');
  const d = fs.mkdtempSync(path.join(TMP, 'ov-'));

  /* ۱۳.۱ — نوشتهٔ نامعتبر `null` است (صحنه بی‌نوشته می‌ماند، نه نیمه‌کاره). */
  ok('۱۳.۱ نوع‌های ناشناخته و نوشتهٔ ناقص رد؛ جدول فقط ردیفِ «|»دار',
     OVL.ovNorm({ kind: 'banner', title: 'x' }) === null &&
     OVL.ovNorm({ kind: 'points', lines: [] }) === null &&
     OVL.ovNorm({ kind: 'compare', a: 'الف', b: 'ب', lines: ['بی جداکننده'] }) === null &&
     (OVL.ovNorm({ kind: 'compare', a: 'الف', b: 'ب', lines: ['قوت: قطعی | محتمل'] }) || {}).rows.length === 1 &&
     /۳/.test(OVL.ovNorm({ kind: 'headline', title: 'سه 3' }).title));

  /* ۱۳.۲ — **جای نوشته از خودِ تصویر:** تصویری با تودهٔ تیره (آدمِ صحنه) در چپ و
     زمینهٔ آرام در راست ⇒ نوشتهٔ کناری در راست، دور از توده. تصویرِ سراسر شلوغ ⇒
     نوشته نمی‌نشیند و «شلوغ» گفته می‌شود. */
  const subj = path.join(d, 'subj.png');
  ff(['-f', 'lavfi', '-i', 'nullsrc=s=1920x1080', '-vf',
      "geq=r='if(lt(hypot(X-520,Y-560),260),25,222)':g='if(lt(hypot(X-520,Y-560),260),30,218)':b='if(lt(hypot(X-520,Y-560),260),40,208)'",
      '-frames:v', '1', subj]);
  const busy = path.join(d, 'busy.png');
  /* شلوغیِ **به اندازهٔ چیزها**، نه نویز: نویزِ ریز در نسخهٔ کوچکِ میانگین‌گرفته صاف
     می‌شود (نگارشِ اولِ همین سنجه با `random` انرژیِ ۸ داد — «آرام»). خطوطِ
     نقاشی و چهارخانهٔ درشت شلوغ می‌مانند، و همین را می‌خواهیم بسنجیم. */
  ff(['-f', 'lavfi', '-i', 'nullsrc=s=1920x1080', '-vf',
      "geq=r='if(mod(floor(X/40)+floor(Y/40),2),20,230)':g='if(mod(floor(X/40)+floor(Y/40),2),20,230)':b='if(mod(floor(X/40)+floor(Y/40),2),20,230)'",
      '-frames:v', '1', busy]);
  const an = OVL.analyze(FF, subj);
  const pl = OVL.place(an, 700, 420, 'points', '', null);
  const anB = OVL.analyze(FF, busy);
  const plB = OVL.place(anB, 700, 420, 'points', '', null);
  ok('۱۳.۲ نوشتهٔ کناری روی جای آرام می‌نشیند و نه روی تودهٔ تیره؛ تصویرِ شلوغ نوشته نمی‌گیرد',
     pl && !pl.busy && pl.box.x > 900 && !(pl.box.x < 780 && pl.box.x + pl.box.w > 260) && plB && plB.busy === true,
     JSON.stringify({ pl: pl && { k: pl.k, x: pl.box.x, y: pl.box.y, e: Math.round(pl.energy) },
                      busy: plB && { busy: plB.busy, e: Math.round(plB.energy) } }));

  /* ۱۳.۳ — **رنگ از خودِ تصویر:** زمینهٔ روشن نوشتهٔ تیره، زمینهٔ تیره نوشتهٔ روشن. */
  const palL = OVL.palette(an, { lum: 0.85 }, 0), palD = OVL.palette(an, { lum: 0.2 }, 0);
  /* ۱۳.۳-ب — **تأکید از زمینه جدا می‌شود:** روی نقاشیِ رنگارنگِ فیروزه‌ای (همان پنلِ
     صحنهٔ ۵ِ درسِ ۳۸)، فامِ تأکید دست‌کم ۱۲۰ درجه از فامِ غالب فاصله دارد. نگارشِ اول
     همان فام را ۲۰ درجه می‌چرخاند و واژهٔ کلیدیِ آبی روی فیروزه‌ای داد. */
  const teal = path.join(d, 'teal.png');
  ff(['-f', 'lavfi', '-i', 'nullsrc=s=1920x1080', '-vf',
      "geq=r='20+20*sin(X/90)':g='120+30*sin(Y/70)':b='130+30*cos(X/80)'", '-frames:v', '1', teal]);
  const palT = OVL.palette(OVL.analyze(FF, teal), { lum: 0.3 }, 0);
  const hA = Number((/hsl\((\d+)/.exec(palT.a1) || [])[1]);
  const dh = Math.min(Math.abs(hA - palT.hue), 360 - Math.abs(hA - palT.hue));
  ok('۱۳.۳-ب فامِ تأکید روی نقاشیِ رنگارنگ هم از فامِ غالب دور است', palT.vivid === true && dh >= 120,
     'غالب ' + palT.hue + ' · تأکید ' + hA + ' · فاصله ' + dh);
  /* (سنجهٔ پیشینِ ۱۳.۲-ب — «نوشته وسطِ تودهٔ تیرهٔ یکدست نمی‌نشیند» — برداشته شد و
     این عمدی است: درونِ یک تودهٔ یکدستِ بزرگ، از روی پیکسل با یک زمینهٔ تیره (پنلِ
     فیروزه‌ایِ صحنهٔ ۵) فرقی ندارد. سنجهٔ «تیره نسبت به کلِ تصویر» آن را می‌گرفت و
     زمینهٔ صحنهٔ ۵ را هم «توده» می‌خواند؛ سنجهٔ «نسبت به میانگینِ جعبه» زمینه را درست
     می‌خوانَد و این را نه. جدا کردنشان کارِ داور است که تصویر را می‌بیند (`space`)، و
     سدِ «روی توده نه» در ۱۳.۲-ت با سمتِ داور سنجیده می‌شود.) */
  /* ۱۳.۲-پ — و **وقتی جای بهتری هست، همان پیدا می‌شود**، نه «هیچ»: سد (`busy`)
     جلوی نشستن روی توده را می‌گیرد و این سنجه می‌پرسد که سد جستجو را بی‌جا نمی‌بندد.
     (جملهٔ توده در امتیاز این‌جا بار ندارد — شکستنش سبز ماند، چون ترجیحِ لبه همان
     جای خلوت را می‌دهد؛ در کد «ترجیح» برچسب خورده، نه سد.) */
  const blob2 = path.join(d, 'blob2.png');
  ff(['-f', 'lavfi', '-i', 'nullsrc=s=1920x1080', '-vf',
      "geq=r='if(lt(X,960),if(mod(floor(X/40)+floor(Y/40),2),20,230),if(lt(hypot(X-1420,Y-250),250),28,226))'" +
      ":g='if(lt(X,960),if(mod(floor(X/40)+floor(Y/40),2),20,230),if(lt(hypot(X-1420,Y-250),250),30,222))'" +
      ":b='if(lt(X,960),if(mod(floor(X/40)+floor(Y/40),2),20,230),if(lt(hypot(X-1420,Y-250),250),36,212))'",
      '-frames:v', '1', blob2]);
  const plN = OVL.place(OVL.analyze(FF, blob2), 520, 200, 'quote', '', null);
  const inDisk2 = plN && Math.hypot(plN.box.x + plN.box.w / 2 - 1420, plN.box.y + plN.box.h / 2 - 250) < 250 + 60;
  ok('۱۳.۲-پ جای خلوتِ کنارِ توده پیدا می‌شود، نه «هیچ»', !!plN && !plN.busy && !inDisk2,
     JSON.stringify(plN && { x: plN.box.x, y: plN.box.y, busy: plN.busy, inDisk: inDisk2 }));
  /* ۱۳.۲-ت — **سمتی که داور دید، حرفِ آخر است:** داور گفت «چپ» (جایی که توده
     هست) ⇒ نوشته به راست نمی‌گریزد؛ همان‌جا شلوغ است پس نمی‌نشیند. بی گفتهٔ داور،
     جستجو آزاد است و راست را پیدا می‌کند. */
  const plL = OVL.place(an, 700, 420, 'points', 'left', null);
  ok('۱۳.۲-ت سمتِ داور محدود می‌کند: «چپ» روی توده ⇒ نه؛ بی سمت ⇒ راست',
     !!plL && plL.busy === true && plL.box.x + plL.box.w / 2 < 960 && pl && pl.box.x > 900,
     JSON.stringify(plL && { x: plL.box.x, busy: plL.busy }));
  ok('۱۳.۳ زمینهٔ روشن ⇒ نوشتهٔ تیره؛ تیره ⇒ روشن', palL.ink !== palD.ink && palL.dark === false && palD.dark === true,
     palL.ink + ' / ' + palD.ink);

  /* ۱۳.۴ — **از درِ اجرا:** ویدئوی صحنه‌ای با نوشته روی دو صحنه. ویدئو ساخته
     می‌شود، سنجش هنوز هر صحنه را سرِ جایش می‌بیند (مرجعِ صحنهٔ نوشته‌دار همان
     نقاشی **با** نوشته است)، و قابِ وسطِ صحنهٔ نوشته‌دار واقعاً با نقاشیِ خام فرق
     دارد — یعنی نوشته کشیده شده، نه فقط شمرده. */
  const wav = path.join(d, 'a.wav');
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*220*t)*between(mod(t,8),0,7.1)':s=24000:d=32", '-ac', '1', wav]);
  const urls = [serve('ov1.png', subj)];
  for (let i = 2; i <= 4; i++) urls.push(serve('ov' + i + '.png', mkPng(path.join(d, 'q' + i + '.png'), 1344, 768, i * 7)));
  const it = { key: 'special:ov', mode: 'scenes',
    scenes: urls.map((u, i) => ({ n: i + 1, t0: i * 8 + (i ? 0.3 : 0), url: u, caption: 'زیرنویس ' + (i + 1),
      ov: i === 0 ? { kind: 'points', title: 'دو راهِ انتقال', lines: ['قیاس: نتیجه ضرورتاً می‌آید', 'استقرا: فقط محتمل'], keys: ['ضرورتاً'] }
        : i === 2 ? { kind: 'headline', title: 'توجیه منتقل می‌شود', keys: ['توجیه'], side: 'top' }
        : i === 3 ? { kind: 'compare', title: 'دو راه', a: 'قیاس', b: 'استقرا',
                      lines: ['قوت: قطعی | محتمل', 'خطر: مقدمهٔ غلط | نمونهٔ کم', 'نمونه: هندسه | آمار'] } : null })),
    coverTitle: 'آزمون', mark: { handle: '@test-channel', name: 'آزمون', everySec: 16, opacity: 0.5 } };
  const dest = path.join(d, 'ov.mp4');
  const vr = R.buildVideo(it, null, wav, R.wavSeconds(wav), dest, d);
  const raw1 = SKIT.gray(FF, path.join(d, 's001.jpg'));
  const fr1 = SKIT.gray(FF, dest, 4);
  const diff = SKIT.mad(fr1, raw1);
  // نوارِ پایینِ قاب (جای زیرنویس): صحنهٔ نوشته‌دار زیرنویس ندارد، صحنهٔ ۲ دارد
  const low = (a, b) => { let t = 0, n = 0; for (let i = 48 * 22 * 3; i < 48 * 26 * 3; i++) { t += Math.abs(a[i] - b[i]); n++; } return t / n; };
  const capOv = low(fr1, raw1);
  /* نوشته **کشیده** شد، نه فقط شمرده: قاب به «نقاشی با نوشته» نزدیک‌تر است تا به
     نقاشیِ خام. (نگارشِ اول فقط «با خام فرق دارد» می‌پرسید، و حرکتِ آرامِ دوربین
     به‌تنهایی همان فرق را می‌ساخت — شکستنِ عمدی سبز ماند.) */
  const ref0 = fs.existsSync(path.join(d, 'ref0.jpg')) ? SKIT.gray(FF, path.join(d, 'ref0.jpg')) : null;
  const drawn = !!ref0 && SKIT.mad(fr1, ref0) < SKIT.mad(fr1, raw1);
  const capPlain = low(SKIT.gray(FF, dest, 12), SKIT.gray(FF, path.join(d, 's002.jpg')));
  ok('۱۳.۴ ویدئو با نوشته ساخته شد؛ سنجش سالم؛ نوشته واقعاً روی قاب است؛ زیرنویسِ همان صحنه برداشته شد',
     vr.mode === 'scenes' && vr.qa && vr.qa.ok === true && vr.ov && vr.ov.asked === 3 && vr.ov.placed >= 2 &&
     (vr.ov.kinds.compare || 0) === 1 && diff > 1.0 && drawn && capOv < capPlain / 2 &&
     vr.refs === vr.ov.placed,
     JSON.stringify({ mode: vr.mode, qa: vr.qa && { ok: vr.qa.ok, m: vr.qa.matched, why: vr.qa.why },
                      ov: vr.ov, refs: vr.refs, diff: diff.toFixed(2), drawn: drawn, cap: capOv.toFixed(1) + '/' + capPlain.toFixed(1), notes: vr.notes }));

  /* ۱۳.۵ — **نشان بی مربعِ سیاه:** آواتاری با زمینهٔ سیاه (همان شکلِ عکسِ پروفایلِ
     کانال: ۸۷٪ سیاه) بریده و بی‌زمینه می‌شود؛ گوشه‌ها شفاف‌اند. */
  const av = path.join(d, 'av.jpg');
  ff(['-f', 'lavfi', '-i', 'nullsrc=s=240x240', '-vf',
      "geq=r='if(lt(hypot(X-120,Y-115),55),40,0)':g='if(lt(hypot(X-120,Y-115),55),170,0)':b='if(lt(hypot(X-120,Y-115),55),120,0)'",
      '-frames:v', '1', av]);
  const lg = CK.logoClean(serve('av.jpg', av), d, FF);
  let alphaCorner = -1, lw = 0, lh = 0;
  if (/^data:image\/png/.test(lg.data)) {
    const pf = path.join(d, 'lg.png');
    fs.writeFileSync(pf, Buffer.from(lg.data.split(',')[1], 'base64'));
    const r = cp.spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-i', pf, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
                           { maxBuffer: 4 * 1024 * 1024 });
    const pr = cp.spawnSync(FF, ['-hide_banner', '-i', pf], { encoding: 'utf8' });
    const m = String(pr.stderr).match(/, (\d+)x(\d+)/); if (m) { lw = +m[1]; lh = +m[2]; }
    if (r.stdout && r.stdout.length >= 4) alphaCorner = r.stdout[3];
  }
  ok('۱۳.۵ نشانِ زمینه‌سیاه بریده و شفاف می‌شود',
     /بی‌زمینه/.test(lg.how) && lw > 0 && lw < 160 && lh < 160 && alphaCorner === 0,
     lg.how + ' · ' + lw + '×' + lh + ' · آلفای گوشه ' + alphaCorner);
  // و عکسی که زمینهٔ ساده ندارد دست نمی‌خورد — و گفته می‌شود
  const lg2 = CK.logoClean(serve('av2.png', mkPng(path.join(d, 'av2.png'), 240, 240, 3)), d, FF);
  ok('۱۳.۵-ب عکسِ بی‌زمینهٔ ساده خام می‌ماند و علتش گفته می‌شود', /^data:image/.test(lg2.data) && /خام/.test(lg2.how), lg2.how);

  /* ۱۳.۶ — جوهرِ نشان با روشنیِ زیرِ گوشه عوض می‌شود. */
  const mL = SKIT.markHtml({ handle: '@x', name: 'x', logo: '' }, 'br', true);
  const mD = SKIT.markHtml({ handle: '@x', name: 'x', logo: '' }, 'br', false);
  ok('۱۳.۶ روی گوشهٔ روشن جوهرِ تیره، روی تیره روشن', /#1C2230/.test(mL) && /#FFFFFF/.test(mD) && !/#1C2230/.test(mD));

  /* ۱۳.۷ — و نقشه نوشته و نشان را برای موتور ثبت می‌کند. */
  const src = fs.readFileSync('tools/render.js', 'utf8');
  ok('۱۳.۷ نقشه آمارِ نوشته و حالِ نشان را می‌نویسد',
     /map\.items\[it\.key\]\.ov = vr\.ov/.test(src) && /map\.items\[it\.key\]\.logo = vr\.logo/.test(src) &&
     /CK\.logoClean\(/.test(src));
}

console.log('\n══ ۱۴) حرکتِ معنادار و کلیپِ آغاز (۸.۵۱) ══');
{
  const SKIT = require('../tools/scenekit.js');
  const W = 1920, H = 1080;
  /* ۱۴.۱ — ورودی‌ها: فقط push/reveal با جایِ معقول؛ بزرگ‌نمایی در مرز؛ کلیپ فقط با نشانی. */
  const a = SKIT.mvOf({ k: 'push', x: 1.4, y: -0.2, z: 0.9 });
  const b = SKIT.mvOf({ k: 'reveal', x: 0.3, y: 0.6 });
  ok('۱۴.۱ حرکت فقط با «چه کند» و «کجا»؛ جا و اندازه در مرز؛ کلیپ فقط با نشانی',
     a && a.x === 1 && a.y === 0 && a.z === 0.25 && b && b.z === SKIT.SK.focusZoom &&
     SKIT.mvOf({ k: 'drift', x: 0.5, y: 0.5 }) === null && SKIT.mvOf({ k: 'push', x: 'x', y: 0.5 }) === null &&
     SKIT.mvOf(null) === null && SKIT.clipOf({ url: 'nope', sec: 8 }) === null &&
     SKIT.clipOf({ url: 'https://a/c.mp4' }).sec === 8,
     JSON.stringify({ a: a, b: b }));

  /* ۱۴.۲ — حرکتِ کانون‌دار: کانون روی صفحه **ثابت** می‌مانَد (چشم به همان‌جا می‌رود)،
     قاب هرگز از تصویر بیرون نمی‌زند، push نزدیک می‌شود و reveal دور، و صحنهٔ نوشته‌دار
     فقط حرکتِ آرام می‌گیرد (نوشته جایش را از تصویرِ ساکن گرفته). */
  // همان توابعِ عبارتِ ffmpeg که حرکت به کار می‌بَرد
  const ev = (e, on) => Function('W', 'H', 'on', 'min', 'max', 'pow', 'return (' + String(e) + ');')(W, H, on, Math.min, Math.max, Math.pow);
  let fixed = true, inside = true;
  const N = 240;
  for (const px of [0, 0.27, 0.8, 1]) {
    for (const k of ['push', 'reveal']) {
      const m = SKIT.motion(3, N, { k: k, x: px, y: 0.4, z: 0.2 });
      for (const on of [0, 60, 120, 240]) {
        const x0 = ev(m.x0, on), x1 = ev(m.x1, on), y0 = ev(m.y0, on), y2 = ev(m.y2, on);
        if (!(x0 >= -0.01 && x1 <= W + 0.01 && y0 >= -0.01 && y2 <= H + 0.01 && x0 < x1 && y0 < y2)) inside = false;
        const sx = (px * W - x0) / (x1 - x0) * W, sy = (0.4 * H - y0) / (y2 - y0) * H;
        if (Math.abs(sx - px * W) > 0.5 || Math.abs(sy - 0.4 * H) > 0.5) fixed = false;
      }
    }
  }
  const wOf = (m, on) => ev(m.x1, on) - ev(m.x0, on);
  const mp = SKIT.motion(3, N, { k: 'push', x: 0.7, y: 0.3, z: 0.2 });
  const mr = SKIT.motion(3, N, { k: 'reveal', x: 0.7, y: 0.3, z: 0.2 });
  const mg = SKIT.motion(3, N, { k: 'push', x: 0.7, y: 0.3, z: 0.2 }, SKIT.SK.zoom);
  ok('۱۴.۲ کانون روی صفحه ثابت، قاب درونِ تصویر، push نزدیک و reveal دور، نوشته‌دار آرام',
     fixed && inside && Math.abs(wOf(mp, 0) - W) < 0.5 && Math.abs(wOf(mp, N) - W * 0.8) < 0.5 &&
     Math.abs(wOf(mr, 0) - W * 0.8) < 0.5 && Math.abs(wOf(mr, N) - W) < 0.5 &&
     Math.abs(wOf(mg, N) - W * (1 - SKIT.SK.zoom)) < 0.5,
     'ثابت ' + fixed + ' · درون ' + inside + ' · push ' + wOf(mp, 0).toFixed(0) + '⇒' + wOf(mp, N).toFixed(0) +
     ' · reveal ' + wOf(mr, 0).toFixed(0) + '⇒' + wOf(mr, N).toFixed(0) + ' · آرام ' + wOf(mg, N).toFixed(0));

  /* ۱۴.۳ — **از درِ اجرا:** چهار صحنه؛ نخستین با کلیپِ آغاز (ویدئویی که آشکارا با
     نقاشی فرق دارد تا دیده شود کدام پخش شد)، دومی push و سومی reveal. */
  const d = fs.mkdtempSync(path.join(TMP, 'mv-'));
  const wav = path.join(d, 'a.wav');
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*220*t)*between(mod(t,6),0,5.1)':s=24000:d=30", '-ac', '1', wav]);
  const urls = [];
  for (let i = 1; i <= 4; i++) urls.push(serve('mv' + i + '.png', mkPng(path.join(d, 'p' + i + '.png'), 1344, 768, i * 5 + 2)));
  const clipSrc = path.join(d, 'clipsrc.mp4');
  /* ثانیهٔ اولِ کلیپ یک‌رنگ است و بقیه‌اش الگوی متحرک: کلیپی که در طولِ خودش عوض نشود،
     نمی‌گوید سنجش قابِ **همان ثانیه** را مرجع گرفته یا قابِ اول را (۱۴.۵). */
  ff(['-f', 'lavfi', '-i', 'color=c=0x8a1c1c:s=1280x720:r=24:d=1', '-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=24:d=4',
      '-filter_complex', '[0:v][1:v]concat=n=2:v=1[v]', '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clipSrc]);
  const clipUrl = serve('clip1.mp4', clipSrc);
  const mk = (cu) => ({ key: 'special:mv', mode: 'scenes', coverTitle: 'آزمونِ حرکت',
    scenes: [{ n: 1, t0: 0, url: urls[0], clip: { url: cu, sec: 5 } },
             { n: 2, t0: 11.5, url: urls[1], mv: { k: 'push', x: 0.8, y: 0.3, z: 0.25 } },
             { n: 3, t0: 17.5, url: urls[2], mv: { k: 'reveal', x: 0.2, y: 0.7, z: 0.25 } },
             { n: 4, t0: 23.5, url: urls[3] }] });
  const dest = path.join(d, 'out.mp4');
  const vr = R.buildVideo(mk(clipUrl), null, wav, R.wavSeconds(wav), dest, d);
  const clipF = path.join(d, 'c001.mp4'), still1 = path.join(d, 's001.jpg');
  const f2 = SKIT.gray(FF, dest, 2.0), f7 = SKIT.gray(FF, dest, 7.5);
  const onClip = SKIT.mad(f2, SKIT.gray(FF, clipF, 2.0)), onStill2 = SKIT.mad(f2, SKIT.gray(FF, still1));
  const late = SKIT.mad(f7, SKIT.gray(FF, still1)), lateClip = SKIT.mad(f7, SKIT.gray(FF, clipF, 4.9));
  ok('۱۴.۳ کلیپ در آغاز پخش می‌شود و بعد همان نقاشی؛ حرکت‌ها نشستند؛ سنجش هر چهار صحنه را سرِ جایش دید',
     vr.mode === 'scenes' && vr.qa && vr.qa.ok === true && vr.qa.matched === 4 &&
     vr.clip && vr.clip.used === 1 && vr.mv === 2 &&
     onClip < onStill2 && onClip <= SKIT.SK.qaMad && late < lateClip && late <= SKIT.SK.qaMad &&
     Math.abs(durOf(dest) - 30) < 0.6,
     'سنجش ' + JSON.stringify(vr.qa) + ' · کلیپ ' + JSON.stringify(vr.clip) + ' · حرکت ' + vr.mv +
     ' · ثانیهٔ ۲: کلیپ ' + onClip.toFixed(1) + ' / نقاشی ' + onStill2.toFixed(1) +
     ' · ثانیهٔ ۷٫۵: نقاشی ' + late.toFixed(1) + ' / کلیپ ' + lateClip.toFixed(1) +
     ((vr.notes || []).length ? ' · ' + vr.notes.join(' | ') : ''));

  /* ۱۴.۴ — حرکت واقعاً به کانون می‌رود: نزدیکِ پایانِ صحنهٔ push، قاب به برشِ حولِ
     کانون نزدیک‌تر است تا به کلِ تصویر؛ و reveal برعکس، در آغاز. */
  const cropRef = (img, z, px, py, out) => {
    const cw = Math.round(W * (1 - z)), ch = Math.round(H * (1 - z));
    ff(['-i', img, '-vf', 'scale=' + W + ':' + H + ',crop=' + cw + ':' + ch + ':' + Math.round(px * W * z) + ':' +
        Math.round(py * H * z) + ',scale=' + W + ':' + H, '-frames:v', '1', out]);
    return SKIT.gray(FF, out);
  };
  const s2 = path.join(d, 's002.jpg'), s3 = path.join(d, 's003.jpg');
  const fPush = SKIT.gray(FF, dest, 11.5 + 5.6);
  const pushNear = SKIT.mad(fPush, cropRef(s2, 0.25 * 0.95, 0.8, 0.3, path.join(d, 'cr2.jpg')));
  const pushFull = SKIT.mad(fPush, SKIT.gray(FF, s2));
  const fRev = SKIT.gray(FF, dest, 17.5 + 0.9);
  const revNear = SKIT.mad(fRev, cropRef(s3, 0.25 * 0.95, 0.2, 0.7, path.join(d, 'cr3.jpg')));
  const revFull = SKIT.mad(fRev, SKIT.gray(FF, s3));
  ok('۱۴.۴ push در پایان روی کانون است و reveal در آغاز؛ هر دو از «کلِ تصویر» دورترند',
     pushNear < pushFull && revNear < revFull,
     'push: کانون ' + pushNear.toFixed(1) + ' / کل ' + pushFull.toFixed(1) +
     ' · reveal: کانون ' + revNear.toFixed(1) + ' / کل ' + revFull.toFixed(1));

  /* ۱۴.۴-ب — مرجعِ سنجشِ صحنهٔ متحرک همان برشی است که **در همان لحظه** دیده می‌شود: به قابِ
     واقعیِ ویدئو نزدیک‌تر از کلِ تصویر. بی آن، قابِ وسطِ یک صحنهٔ پرجزئیات با ۱۲٪ نزدیک‌شدن
     «سرِ جایش نیست» می‌خورد و سدِ انتشار ویدئوی سالم را نگه می‌داشت. (تصویرهای این آزمون
     نرم‌اند و ۱۴.۳ بی این مرجع هم سبز می‌ماند — پس این ادعا جدا سنجیده می‌شود.) */
  const refm = path.join(d, 'refm1.jpg');
  const fq = SKIT.gray(FF, dest, 11.55 + 3);
  const ownCrop = fs.existsSync(refm) ? SKIT.mad(fq, SKIT.gray(FF, refm)) : 255;
  const ownFull = SKIT.mad(fq, SKIT.gray(FF, s2));
  ok('۱۴.۴-ب مرجعِ صحنهٔ متحرک برشِ همان لحظه است، نزدیک‌تر از کلِ تصویر به قابِ واقعی',
     vr.refs === 2 && fs.existsSync(refm) && ownCrop < ownFull / 2,
     'مرجع‌ها ' + vr.refs + ' · برش ' + ownCrop.toFixed(1) + ' / کل ' + ownFull.toFixed(1));

  /* ۱۴.۵ — مرجعِ سنجش از کلیپ است وقتی لحظهٔ سنجش درونِ کلیپ است، و سنجه واقعاً
     می‌سنجد: با مرجعِ نقاشی برای همان لحظه رد می‌شود. */
  const tA = [{ n: 1, t0: 0, d: 11.55, img: still1, ref: clipF, refT: 2, qt: 2 }];
  const tB = [{ n: 1, t0: 0, d: 11.55, img: still1, qt: 2 }];
  const qA = SKIT.qa(FF, dest, tA, 30), qB = SKIT.qa(FF, dest, tB, 30);
  ok('۱۴.۵ سنجش قابِ کلیپ را با خودِ کلیپ می‌سنجد، و نقاشی را برای همان لحظه رد می‌کند',
     qA.matched === 1 && qB.matched === 0, JSON.stringify({ a: qA.miss, b: qB.miss }));

  /* ۱۴.۶ — کلیپی که بایت‌هایش ویدئو نیست (صفحهٔ HTML، ۷.۳۳) ⇒ همان نقاشی، گفته
     می‌شود، و ویدئوی درس زمین نمی‌خورد. */
  const liar = serveRaw('liar.mp4', '<html>not shared</html>' + ' '.repeat(200));
  const d2 = fs.mkdtempSync(path.join(TMP, 'mv2-'));
  const dest2 = path.join(d2, 'out.mp4');
  const vr2 = R.buildVideo(mk(liar), null, wav, R.wavSeconds(wav), dest2, d2);
  ok('۱۴.۶ کلیپِ خراب ⇒ نقاشیِ ثابت با علت؛ ویدئو سالم',
     vr2.mode === 'scenes' && vr2.qa && vr2.qa.ok === true && vr2.clip && vr2.clip.used === 0 &&
     (vr2.notes || []).some(x => /کلیپِ صحنهٔ 1: بایت‌ها ویدئو نبود/.test(x)),
     JSON.stringify(vr2.clip) + ' · ' + (vr2.notes || []).join(' | '));

  /* ۱۴.۷ — نقشه حرکت و کلیپ را برای موتور ثبت می‌کند. */
  const src = fs.readFileSync('tools/render.js', 'utf8');
  ok('۱۴.۷ نقشه شمارِ حرکت و حالِ کلیپ را می‌نویسد',
     /map\.items\[it\.key\]\.mv = vr\.mv/.test(src) && /map\.items\[it\.key\]\.clip = vr\.clip/.test(src) &&
     /clips: clips/.test(src));
}

console.log('\n══ ۱۵) کاورِ مربعِ پلی‌لیست و پروب (۸.۵۵) ══');
{
  const SKIT = require('../tools/scenekit.js');
  /* ۱۵.۱ — «کاری هست» یک تعریف دارد، و امضای نقشه نقاشیِ مجموعه را هم در خود دارد:
     رسیدنِ نقاشی کاور را یک بار از نو می‌خواهد و بعد دیگر نه. */
  const q = { items: [], plCovers: [{ key: 'series:a', name: 'الف', sig: 's1', pal: {} }] };
  const m0 = { items: {} };
  const t0 = R.plCoversTodo(q, m0).length;
  const m1 = { items: {}, plCovers: { 'series:a': { sig: 's1', req: 's1' } } };
  const t1 = R.plCoversTodo(q, m1).length;
  const m2 = { items: {}, plCovers: { 'series:a': { sig: 's1', req: 's1' } },
               art: { 'series:a': { url: 'x', from: 'special:62' } } };
  const t2 = R.plCoversTodo(q, m2).length;
  const m3 = { items: {}, plCovers: { 'series:a': { sig: R.plCoverSig(q.plCovers[0], m2), req: 's1' } },
               art: m2.art };
  const t3 = R.plCoversTodo(q, m3).length;
  ok('۱۵.۱ کاورِ پلی‌لیست: نخواسته ⇒ می‌سازد، ساخته ⇒ نه، نقاشیِ تازه ⇒ یک بار دیگر',
     t0 === 1 && t1 === 0 && t2 === 1 && t3 === 0, [t0, t1, t2, t3].join(','));

  /* ۱۵.۲ — پروب و کار از همان دو تابع می‌پرسند (۷.۷۸): ردیفِ ساخته‌شده یا
     نگه‌داشته کار نیست. */
  const qi = { items: [{ key: 'special:1', status: 'در انتظار' }, { key: 'special:2', status: 'در انتظار' },
                       { key: 'special:3', status: 'رسید' }] };
  const T = R.itemsTodo(qi, { items: { 'special:2': { url: 'u' } } }, {}, new Date());
  const src = fs.readFileSync('tools/render.js', 'utf8');
  const probeAt = src.indexOf("process.argv.indexOf('--probe')");
  const pw0 = R.probeWork({ items: [], plCovers: [] }, { items: {} }, {}, new Date());
  const pw1 = R.probeWork(q, m0, {}, new Date());                       // فقط کاورِ پلی‌لیست
  const pw2 = R.probeWork(qi, { items: {} }, {}, new Date());           // فقط ویدئو
  const pw3 = R.probeWork(qi, { items: { 'special:1': { url: 'u' }, 'special:2': { url: 'u' } } }, {}, new Date());
  ok('۱۵.۲ پروب همان «ساخته‌نشده و نگه‌داشته‌نشده» را می‌شمارد که کار — و کاورِ پلی‌لیست هم کار است',
     T.todo.length === 1 && T.todo[0].key === 'special:1' && probeAt !== -1 &&
     /probeWork\(queue, map, hold/.test(src.slice(probeAt, probeAt + 400)) &&
     pw0 === '0' && pw1 === '1' && pw2 === '1' && pw3 === '0',
     JSON.stringify(T.todo) + ' · ' + [pw0, pw1, pw2, pw3].join(','));

  /* ۱۵.۲-ب — جایگزینی (۸.۵۷): ردیفِ «replace» با ویدئوی قبلیِ همان کلید ساخته‌شده نیست؛
     فقط ردیفِ نقشه با همان replace. پروب هم همان را می‌گوید، و نقشه replace را ثبت می‌کند. */
  const qr = { items: [{ key: 'special:62', status: 'در انتظار', replace: 'r1' }] };
  const mOld = { items: { 'special:62': { url: 'old' } } }, mNew = { items: { 'special:62': { url: 'new', replace: 'r1' } } };
  ok('۱۵.۲-ب ردیفِ جایگزینی با ویدئوی قبلی ساخته می‌شود، با همان replace نه؛ نقشه replace را می‌نویسد',
     R.itemsTodo(qr, mOld, {}, new Date()).todo.length === 1 && R.itemsTodo(qr, mNew, {}, new Date()).todo.length === 0 &&
     R.probeWork(qr, mOld, {}, new Date()) === '1' && R.probeWork(qr, mNew, {}, new Date()) === '0' &&
     /if \(it\.replace\) map\.items\[it\.key\]\.replace = String\(it\.replace\)/.test(src));

  /* ۱۵.۳ — کاورِ مربع واقعاً مربع است، زیرِ دو مگابایت، و نامِ تکراری روی آن نیست. */
  const CK = require('../tools/cardkit/index.js');
  const exe = CK.chromeExe();
  const d = fs.mkdtempSync(path.join(TMP, 'pl-'));
  const html = SKIT.plCoverHtml({ key: 'show:variety', name: 'از همه جا از همه رنگ',
                                  kicker: 'از همه جا از همه رنگ', show: 'از همه جا از همه رنگ',
                                  pal: { bg: '#1E1B4B', fg: '#EEF2FF', ac: '#A78BFA' } }, '');
  const png = SKIT.shoot(exe, html, path.join(d, 'pl.png'), 1400, 1400, ff);
  const jpg = path.join(d, 'pl.jpg');
  ff(['-i', png, '-q:v', '3', '-frames:v', '1', jpg]);
  const wh = cp.spawnSync(FF.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-show_entries', 'stream=width,height',
                          '-of', 'csv=p=0', jpg], { encoding: 'utf8' });
  const dims = (wh.stdout || '').trim() || (function () {
    const b = fs.readFileSync(jpg); let i = 2;
    while (i < b.length) { if (b[i] !== 0xFF) { i++; continue; } const mk = b[i + 1];
      if (mk >= 0xC0 && mk <= 0xC2) return ((b[i + 7] << 8) | b[i + 8]) + ',' + ((b[i + 5] << 8) | b[i + 6]);
      i += 2 + ((b[i + 2] << 8) | b[i + 3]); }
    return '?'; })();
  const once = (html.match(/از همه جا از همه رنگ/g) || []).length;
  ok('۱۵.۳ کاورِ پلی‌لیست ۱۴۰۰×۱۴۰۰، زیرِ ۲ مگابایت، و نامِ برنامه یک بار — نه سه بار',
     dims === '1400,1400' && fs.statSync(jpg).size < 2 * 1024 * 1024 && R.sniffKind(jpg) === 'jpeg' && once === 1,
     dims + ' · ' + Math.round(fs.statSync(jpg).size / 1024) + 'KB · نام ' + once + ' بار');

  /* ۱۵.۴ — ویدئوی صحنه‌ای با کلیدِ پلی‌لیست، نقاشیِ مربعِ بی‌نوشته‌اش را هم می‌دهد؛
     بی کلید، نه (ردیف‌های قدیمی همان شکلِ دیروز). */
  const wav = path.join(d, 'a.wav');
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*220*t)*between(mod(t,6),0,5.1)':s=24000:d=30", '-ac', '1', wav]);
  const pu = serve('plart.png', mkPng(path.join(d, 'p.png'), 1344, 768, 9));
  const pu2 = serve('plart2.png', mkPng(path.join(d, 'p2.png'), 1344, 768, 23));
  const pu3 = serve('plart3.png', mkPng(path.join(d, 'p3.png'), 1344, 768, 37));
  const it = (k) => Object.assign({ key: 'special:pl', mode: 'scenes', coverTitle: 'کاور',
    sceneCover: { url: pu }, scenes: [{ n: 1, t0: 0, url: pu }, { n: 2, t0: 11.5, url: pu2 },
                                      { n: 3, t0: 20.5, url: pu3 }] }, k ? { plKey: k } : {});
  const da = fs.mkdtempSync(path.join(TMP, 'pla-')), db = fs.mkdtempSync(path.join(TMP, 'plb-'));
  const va = R.buildVideo(it('series:a'), null, wav, R.wavSeconds(wav), path.join(da, 'o.mp4'), da);
  const vb = R.buildVideo(it(''), null, wav, R.wavSeconds(wav), path.join(db, 'o.mp4'), db);
  let artWh = '';
  try { artWh = cp.spawnSync(FF.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-show_entries', 'stream=width,height',
          '-of', 'csv=p=0', va.artFile], { encoding: 'utf8' }).stdout.trim(); } catch (e) { artWh = '?'; }
  ok('۱۵.۴ با کلیدِ پلی‌لیست نقاشیِ مربعِ ۱۴۰۰ هم ساخته می‌شود، بی کلید نه',
     !!va.artFile && R.sniffKind(va.artFile) === 'jpeg' && (artWh === '1400,1400' || artWh === '') && !vb.artFile,
     'با کلید ' + (va.artFile ? artWh || 'ساخته شد' : 'نه') + ' · بی کلید ' + (vb.artFile ? 'ساخته شد' : 'نه') +
     ' · ' + va.mode + ' ' + (va.notes || []).join(' | '));
}

console.log('\n══ ۱۶) کارت، نه جملهٔ معلق؛ می‌آید، ساخته می‌شود و می‌رود (۸.۵۶) ══');
{
  const OVL = require('../tools/overlay.js');
  const SKIT = require('../tools/scenekit.js');
  const d = fs.mkdtempSync(path.join(TMP, 'cd-'));
  /* ۱۶.۱ — یک قلم، وزیرمتن؛ نه نستعلیقِ اردو (که «مستقیم» را بالاتر از جمله نشانْد)، نه
     لاله‌زار، و گیومه کشیده نه نویسهٔ «❞». */
  const pal = OVL.palette(null, { lum: 0.8 }, 0);
  const kinds = [{ kind: 'headline', title: 'باورها تحت فرمانِ اراده نیستند', lines: ['باور از شواهد می‌آید'] },
                 { kind: 'quote', title: 'با کشیدنِ بندِ کفش نمی‌توان از زمین بلند شد', lines: [] },
                 { kind: 'points', title: 'دو راه', lines: ['قیاس', 'استقرا'] },
                 { kind: 'steps', title: '', lines: ['الف', 'ب', 'ج'] },
                 { kind: 'compare', title: 'دو راه', a: 'الف', b: 'ب', lines: ['قوت: قطعی | محتمل'] }];
  const htmls = kinds.map((k, i) => OVL.html(OVL.ovNorm(k), 800, pal, i + 1, true, 'right'));
  ok('۱۶.۱ همهٔ کارت‌ها وزیرمتن؛ بی نستعلیق و لاله‌زار؛ گیومه کشیده',
     htmls.every(h => /Vazirmatn/.test(h) && !/Nastaliq|Lalezar|Naskh/.test(h) && !/❞/.test(h)) &&
     /<svg[^>]*><path/.test(htmls[1]) && htmls.every(h => /class="cd"|display:inline-flex/.test(h)),
     htmls.map(h => (h.match(/font-family:[^;]+/) || [''])[0]).join(' | ').slice(0, 200));
  /* ۱۶.۲ — مرحله‌ها: سطرِ k فقط در مرحلهٔ k نمایان است؛ کارت فقط در مرحلهٔ ۰. */
  const pts = OVL.ovNorm(kinds[2]);
  const s0 = OVL.html(pts, 800, pal, 1, true, 'right', 0), s2 = OVL.html(pts, 800, pal, 1, true, 'right', 2);
  const visCount = h => (h.match(/visibility:visible/g) || []).length;
  ok('۱۶.۲ مرحله‌ها: کارت و تیتر در ۰، سطرِ دوم فقط در ۲',
     OVL.stagesOf(pts) === 2 && OVL.stagesOf(OVL.ovNorm(kinds[0])) === 0 &&
     /class="cd" style=""/.test(s0) && /class="cd" style="visibility:hidden;"/.test(s2) && visCount(s2) === 1,
     JSON.stringify({ v0: visCount(s0), v2: visCount(s2) }));
  /* ۱۶.۳ — پنجره: آن‌قدر که خوانده شود، نه تمامِ صحنه؛ سطرِ اول پس از نشستنِ کارت؛ همه پیش از پایان. */
  const w1 = OVL.windowOf(50, 0.9, 3), w2 = OVL.windowOf(8, 0.9, 0);
  ok('۱۶.۳ کارت روی صحنهٔ ۵۰ ثانیه‌ای ~۱۴ ثانیه می‌مانَد؛ سطرها پشتِ‌هم و پیش از پایان؛ صحنهٔ کوتاه تا پیش از برش',
     w1.end < 20 && w1.end > 10 && w1.at[0] <= w1.st + 1.2 && w1.at[0] < w1.at[1] && w1.at[2] <= w1.end - 2 &&
     w2.end <= 8 - 0.7 + 1e-9, JSON.stringify({ w1: w1, w2: w2 }));
  /* ۱۶.۴ — جای کارت: تودهٔ کوچکِ **رنگی** (سرِ نارنجیِ صحنهٔ ۱۹ِ درسِ ۴۰، روشنیِ نزدیک به کاغذ)
     و جعبهٔ کانونِ داور هر دو را نمی‌پوشاند. */
  const paper = path.join(d, 'paper.png');
  ff(['-f', 'lavfi', '-i', 'nullsrc=s=1920x1080', '-vf',
      "geq=r='if(lt(hypot(X-430,Y-470),60),210,236)':g='if(lt(hypot(X-430,Y-470),60),150,232)':b='if(lt(hypot(X-430,Y-470),60),70,224)'",
      '-frames:v', '1', paper]);
  const anP = OVL.analyze(FF, paper);
  const plL = OVL.place(anP, 900, 420, 'headline', 'left', null);      // سمتی که فقط با توده جا دارد
  const plA = OVL.place(anP, 900, 420, 'headline', '', null);
  const hitHead = b => b && b.x < 490 && b.x + b.w > 370 && b.y < 530 && b.y + b.h > 410;
  const focus = SKIT.fbBox({ x: 0.75, y: 0.3, w: 0.3, h: 0.4 });
  const plF = OVL.place(anP, 700, 360, 'points', '', [focus]);
  const plFr = OVL.place(anP, 700, 360, 'points', 'right', [focus]);   // راست همه زیرِ کانون است
  const hitF = b => b && b.x < focus.x + focus.w && b.x + b.w > focus.x && b.y < focus.y + focus.h && b.y + b.h > focus.y;
  ok('۱۶.۴ کارت نه روی تودهٔ کوچکِ رنگی می‌نشیند نه روی کانونِ داور',
     plL && plL.busy === true && plA && !plA.busy && !hitHead(plA.box) && plF && !plF.busy && !hitF(plF.box) &&
     (plFr === null || plFr.busy === true),
     JSON.stringify({ left: plL && plL.busy, a: plA && plA.box, f: plF && plF.box, fr: plFr, focus: focus }));

  /* ۱۶.۵ — **از درِ اجرا:** صحنهٔ ۴۰ ثانیه‌ای با کارتِ سه‌نکته‌ای. در پنجره کارت هست و سطرِ سوم
     دیرتر از اول می‌آید؛ پس از پنجره کارت رفته و نقاشی تنهاست؛ سنجشِ ویدئو سالم است. */
  /* زمینهٔ یکدست: حرکتِ دوربین روی آن دیده نمی‌شود، پس هر فرقی با نقاشیِ خام فقط کارت است
     (نگارشِ اول دیسکی داشت و حرکتِ آرام به‌تنهایی همان فرق را می‌ساخت — «رفتنِ کارت» دیده
     نمی‌شد؛ همان تلهٔ ۱۳.۴). */
  const calm = path.join(d, 'calm.png');
  ff(['-f', 'lavfi', '-i', 'color=c=0xEDEAE4:s=1920x1080', '-frames:v', '1', calm]);
  const wav = path.join(d, 'a.wav');
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*220*t)*between(mod(t,9),0,8)':s=24000:d=60", '-ac', '1', wav]);
  const u2 = serve('cd2.png', mkPng(path.join(d, 'q2.png'), 1344, 768, 5));
  const u3 = serve('cd3.png', mkPng(path.join(d, 'q3.png'), 1344, 768, 9));
  const it = { key: 'special:cd', mode: 'scenes', coverTitle: 'آزمون',
    scenes: [{ n: 1, t0: 0, url: serve('cd1.png', calm), sec: 1, beat: 'ایده',
               ov: { kind: 'points', title: 'سه نکته', lines: ['نکتهٔ یکم کوتاه', 'نکتهٔ دوم کوتاه', 'نکتهٔ سوم کوتاه'], side: 'left' },
               fb: { x: 0.78, y: 0.59, w: 0.24, h: 0.42 } },
             { n: 2, t0: 40, url: u2, sec: 2, beat: 'روایت' }, { n: 3, t0: 50, url: u3, sec: 2, beat: 'ایده' }] };
  const dest = path.join(d, 'cd.mp4');
  const vr = R.buildVideo(it, null, wav, R.wavSeconds(wav), dest, d);
  /* قاب با قاب، هر دو از خودِ ویدئو (نه با PNGِ خام: تبدیلِ رنگِ yuv خودش فرقِ ثابتی می‌سازد). */
  const Wn = OVL.windowOf(40, OVL.OV.fadeIn, 3);
  const f0 = SKIT.gray(FF, dest, 0.3);
  const fA = SKIT.gray(FF, dest, Wn.at[0] + 0.6), fC = SKIT.gray(FF, dest, Wn.at[2] + 0.8), fZ = SKIT.gray(FF, dest, Wn.end + 2.5);
  const mA = SKIT.mad(fA, f0), mC = SKIT.mad(fC, f0), mZ = SKIT.mad(fZ, f0);
  /* سطرهای متن در شبکهٔ ۴۸×۲۷ گم می‌شوند؛ «یکی‌یکی» با شمارِ پیکسل‌های تیرهٔ متن در ۹۶۰×۵۴۰ سنجیده می‌شود. */
  const ink = t => {
    const r = cp.spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', dest, '-frames:v', '1',
                                '-vf', 'scale=960:540,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 8 * 1024 * 1024 });
    let n = 0; for (const v of r.stdout || []) if (v < 110) n++; return n;
  };
  const iA = ink(Wn.at[0] + 0.6), iB = ink(Wn.at[1] + 0.6), iC = ink(Wn.at[2] + 0.8);
  ok('۱۶.۵ کارت می‌آید، سطرها یکی‌یکی ساخته می‌شوند، و پس از پنجره نقاشی تنهاست؛ سنجش سالم',
     vr.mode === 'scenes' && vr.ov && vr.ov.placed === 1 && vr.qa && vr.qa.ok === true &&
     mA > 0.6 && mZ < 0.2 && iB > iA * 1.15 && iC > iB * 1.1 && vr.xf && (vr.xf.fadeblack || 0) === 1,
     JSON.stringify({ mA: mA.toFixed(2), mC: mC.toFixed(2), mZ: mZ.toFixed(2), ink: [iA, iB, iC], ov: vr.ov, xf: vr.xf,
                      qa: vr.qa && vr.qa.ok, notes: vr.notes }));
}

console.log('\n══ ۱۷) کارت روی کانونِ داور نمی‌نشیند — از درِ ساختِ ویدئو (۸.۵۶) ══');
{
  const OVL = require('../tools/overlay.js');
  const d = fs.mkdtempSync(path.join(TMP, 'fb-'));
  /* زمینهٔ یکدست: جای طبیعیِ کارت بالا-چپ است. کانونِ داور را همان‌جا می‌گذاریم؛ کارت باید
     جای دیگری برود. سنجش با فرقِ قابِ کارت‌دار و قابِ پیش از کارت، درونِ جعبهٔ کانون و بیرونش. */
  const u = path.join(d, 'u.png');
  ff(['-f', 'lavfi', '-i', 'color=c=0xEDEAE4:s=1920x1080', '-frames:v', '1', u]);
  const wav = path.join(d, 'a.wav');
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*220*t)*between(mod(t,9),0,8)':s=24000:d=40", '-ac', '1', wav]);
  const fb = { x: 0.27, y: 0.2, w: 0.5, h: 0.36 };
  const it = { key: 'special:fb', mode: 'scenes', coverTitle: 'آزمون',
    scenes: [{ n: 1, t0: 0, url: serve('fb1.png', u), sec: 1,
               ov: { kind: 'headline', title: 'کانون را نپوشان', lines: ['کارت جای دیگری می‌نشیند'] }, fb: fb },
             { n: 2, t0: 22, url: serve('fb2.png', mkPng(path.join(d, 'q2.png'), 1344, 768, 3)), sec: 1 },
             { n: 3, t0: 31, url: serve('fb3.png', mkPng(path.join(d, 'q3.png'), 1344, 768, 7)), sec: 1 }] };
  const dest = path.join(d, 'fb.mp4');
  const vr = R.buildVideo(it, null, wav, R.wavSeconds(wav), dest, d);
  const grab = t => cp.spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', dest, '-frames:v', '1',
                                      '-vf', 'scale=480:270,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 4 * 1024 * 1024 }).stdout;
  const a = grab(0.3), b = grab(OVL.OV.fadeIn + 3);
  const X0 = Math.floor((fb.x - fb.w / 2) * 480), X1 = Math.ceil((fb.x + fb.w / 2) * 480);
  const Y0 = Math.floor((fb.y - fb.h / 2) * 270), Y1 = Math.ceil((fb.y + fb.h / 2) * 270);
  let inside = 0, outside = 0;
  for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) {
    const dd = Math.abs(a[y * 480 + x] - b[y * 480 + x]) > 25;
    if (!dd) continue;
    if (x >= Math.max(0, X0) && x < X1 && y >= Math.max(0, Y0) && y < Y1) inside++; else outside++;
  }
  ok('۱۷.۱ کارت نشست ولی نه درونِ جعبهٔ کانون', vr.ov && vr.ov.placed === 1 && outside > 500 && inside < outside * 0.05,
     JSON.stringify({ inside: inside, outside: outside, ov: vr.ov, notes: vr.notes }));
}

stopServer();
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
