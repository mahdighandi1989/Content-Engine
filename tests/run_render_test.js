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

stopServer();
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
