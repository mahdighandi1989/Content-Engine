#!/usr/bin/env node
/**
 * رندرِ ویدئوی یوتیوب — طرفِ بیرونیِ کار.
 *
 * ══ چرا این فایل وجود دارد ══
 * یوتیوب ویدئو می‌خواهد و Apps Script ویدئو نمی‌سازد. این را می‌شد از روزِ
 * اول نوشت و نوشتیم — ولی درخواست‌ها هفت هفته بی‌جواب ماند، دقیقاً همان‌طور
 * که بانکِ موسیقی خالی ماند: یک طرف کاری را نمی‌توانست و هیچ‌کس نپرسید چرا.
 * پاسخ با آزمایش آمد، نه با حدس: سشن‌های ابری اصلاً به drive.google.com
 * دسترسی ندارند. اینجا دارند.
 *
 * قرارداد، در سه خط:
 *   ۱) صف را از درایو بخوان (موتور فایل را «هرکس با لینک» کرده).
 *   ۲) هر ردیفِ «در انتظار» که هنوز در docs/renders.json نیست را بساز.
 *   ۳) نشانی‌اش را در docs/renders.json بنویس. موتور بقیه‌اش را می‌داند.
 *
 * و یک قاعده که همه‌جای این ریپو تکرار شده: **بایت‌ها را باور کن، نه نام و
 * نه Content-Type را.** یک صفحهٔ HTMLی گوگل هم ۲۰۰ برمی‌گرداند.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

/* شناسهٔ ثابتِ `_YT-RENDER.json` در پوشهٔ OUTPUT. از بیرون راهی برای
   جست‌وجو در درایو نیست، پس ثابت نوشته می‌شود — و موتور در `ytQueueIdOk_`
   می‌پاید که عوض نشده باشد و اگر شد، در سلامتِ روزانه فریاد می‌زند. */
const QUEUE_ID = '1qerT_vwZpOTFhMXYv-J0m2cIC8Eiv8L-';

const MAP_FILE   = path.join(__dirname, '..', 'docs', 'renders.json');
const TAG        = 'renders';           // برچسبِ ریلیزی که فایل‌ها زیرش می‌نشینند
const MAX_PER_RUN = 3;                  // بیش از این، اجرا طولانی و پرخطر می‌شود
const REPO       = process.env.GITHUB_REPOSITORY || 'mahdighandi1989/Content-Engine';
const TOKEN      = process.env.GITHUB_TOKEN || '';

function log(s) { console.log(s); }
/** ۹.۱۳: هر گامِ سنگینِ ساخت با ساعت و حافظهٔ آزاد — اجرای ۳۶۴/۳۶۵ پانزده دقیقه بی هیچ خطی مردند. */
function stage(s) { log('  ▸ ' + new Date().toISOString().slice(11, 19) + ' ' + s + ' · حافظهٔ آزاد ' + Math.round(os.freemem() / 1048576) + 'M'); }

function dlUrl(id) {
  return 'https://drive.usercontent.google.com/download?id=' +
         encodeURIComponent(id) + '&export=download&confirm=t';
}

/** دانلود به فایل. بایت‌ها از حافظه رد نمی‌شوند تا صوتِ ۳۰ مگابایتی مسئله نشود. */
function fetchTo(url, dest) {
  execFileSync('curl', ['-sSL', '--fail', '--retry', '3', '--retry-delay', '2',
                        '--max-time', '600', '-o', dest, url], { stdio: 'inherit' });
  return fs.statSync(dest).size;
}

function head(file, n) {
  const fd = fs.openSync(file, 'r');
  const b = Buffer.alloc(n);
  fs.readSync(fd, b, 0, n, 0);
  fs.closeSync(fd);
  return b;
}

/** واقعاً WAV است؟ سرآیندِ RIFF/WAVE، نه پسوند. */
function isWav(file) {
  if (fs.statSync(file).size < 1000) return false;
  const b = head(file, 12);
  return b.slice(0, 4).toString('latin1') === 'RIFF' &&
         b.slice(8, 12).toString('latin1') === 'WAVE';
}

/** و PNG؟ */
function isPng(file) {
  if (fs.statSync(file).size < 200) return false;
  return head(file, 8).toString('hex') === '89504e470d0a1a0a';
}

function readMap() {
  try {
    const d = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    if (d && d.items && typeof d.items === 'object') return d;
  } catch (e) {}
  return { updatedAt: '', note: '', items: {} };
}

function writeMap(m) {
  m.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  m.note = 'این فایل را tools/render.js می‌نویسد و موتور (ytRenderMap_) می‌خواند. ' +
           'کلید همان key در _YT-RENDER.json است. دستی ویرایشش نکنید.';
  fs.mkdirSync(path.dirname(MAP_FILE), { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(m, null, 1) + '\n');
}

/* ── گیت‌هاب: ریلیز و فایل‌هایش ─────────────────────────────────────────── */

function gh(args) {
  const out = execFileSync('curl', ['-sS', '--fail-with-body',
    '-H', 'Authorization: Bearer ' + TOKEN,
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28'].concat(args), { encoding: 'utf8' });
  return out;
}

function ensureRelease() {
  try {
    return JSON.parse(gh(['https://api.github.com/repos/' + REPO + '/releases/tags/' + TAG]));
  } catch (e) { /* هنوز نیست */ }
  return JSON.parse(gh(['-X', 'POST', 'https://api.github.com/repos/' + REPO + '/releases',
    '-d', JSON.stringify({
      tag_name: TAG, name: 'ویدئوهای رندرشده',
      body: 'فایل‌های MP4 که tools/render.js می‌سازد و موتور برمی‌دارد. ' +
            'پس از انتشار در یوتیوب قابلِ حذف‌اند.',
      draft: false, prerelease: true
    })]));
}

function uploadAsset(rel, file, name, ctype) {
  // نامِ تکراری اول پاک می‌شود، وگرنه گیت‌هاب ۴۲۲ می‌دهد و اسمِ فایل را عوض می‌کند
  for (const a of (rel.assets || [])) {
    if (a.name === name) {
      try { gh(['-X', 'DELETE', 'https://api.github.com/repos/' + REPO + '/releases/assets/' + a.id]); }
      catch (e) {}
    }
  }
  const res = JSON.parse(gh([
    '-X', 'POST', '-H', 'Content-Type: ' + (ctype || 'video/mp4'),
    '--data-binary', '@' + file,
    'https://uploads.github.com/repos/' + REPO + '/releases/' + rel.id +
      '/assets?name=' + encodeURIComponent(name)]));
  return res.browser_download_url || '';
}

/* ── ffmpeg ─────────────────────────────────────────────────────────────── */

/**
 * مسیرِ واقعیِ ffmpeg.
 *
 * ══ باگی که اولین رندرِ واقعی نشان داد (۲۶ اوت) ══
 * `ubuntu-latest` دیگر ffmpeg ندارد — هشت قسمت با
 * `spawnSync ffmpeg ENOENT` رد شدند. و مرحلهٔ وارسیِ خودِ اکشن **سبز شد**،
 * چون `ffmpeg -version | head -1` کدِ خروجیِ `head` را می‌دهد نه `ffmpeg` را.
 * یک وارسی که نمی‌تواند شکست بخورد، وارسی نیست — همان درسی که این ریپو
 * بارها گرفته.
 *
 * پس مسیر این‌جا **پیدا** می‌شود، نه فرض: اول PATH، بعد باینریِ استاتیکِ
 * `imageio-ffmpeg` از PyPI (که در همین محیط آزموده شده و در چند ثانیه
 * می‌آید). اگر هیچ‌کدام نبود، کار می‌ترکد — بی ffmpeg هیچ ویدئویی ساخته
 * نمی‌شود و یک اجرای سبزِ بی‌محصول بدترین حالت است.
 */
let FFMPEG = '';
function ffmpegExe() {
  if (FFMPEG) return FFMPEG;
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    FFMPEG = 'ffmpeg';
    return FFMPEG;
  } catch (e) { /* روی PATH نیست */ }
  try {
    execFileSync('python3', ['-m', 'pip', 'install', '--quiet', 'imageio-ffmpeg'],
                 { stdio: 'inherit' });
    FFMPEG = execFileSync('python3',
      ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8' }).trim();
    execFileSync(FFMPEG, ['-version'], { stdio: 'ignore' });
    log('ffmpeg از PyPI آورده شد: ' + FFMPEG);
    return FFMPEG;
  } catch (e2) {
    throw new Error('ffmpeg پیدا نشد و از PyPI هم نیامد: ' +
                    String(e2.message).split('\n')[0]);
  }
}

function ff(args) { execFileSync(ffmpegExe(), ['-hide_banner', '-loglevel', 'error', '-y'].concat(args),
                                 { stdio: 'inherit' }); }

/**
 * چند WAV → یک WAV، **به همان ترتیبی که داده شده**.
 * ترتیب اینجا تصمیم گرفته نمی‌شود؛ موتور در `ytAudioParts_` گرفته و از نام
 * خوانده، نه از اندازه. یک بار همین اشتباه شد و نیمهٔ دومِ یک درس به‌جای
 * کلِ آن منتشر می‌شد.
 */
function joinWavs(files, dest, dir) {
  if (files.length === 1) { fs.copyFileSync(files[0], dest); return; }
  const list = path.join(dir, 'parts.txt');
  fs.writeFileSync(list, files.map(f => "file '" + f.replace(/'/g, "'\\''") + "'").join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', dest]);
}

/**
 * مدتِ یک WAV از **سرآیندِ خودش**.
 *
 * `ffprobe` در باینریِ استاتیکِ `imageio-ffmpeg` نیست، پس مدت از هدر خوانده
 * می‌شود: نرخِ بایت در ثانیه در `fmt ` است و اندازهٔ داده در `data`. این
 * عددی است که کلِ زمان‌بندیِ تصویرها رویش سوار می‌شود، پس حدس‌زدنی نیست.
 */
function wavSeconds(file) {
  const st = fs.statSync(file);
  const b = head(file, Math.min(st.size, 4096));
  if (b.slice(0, 4).toString('latin1') !== 'RIFF') return 0;
  let p = 12, bps = 0;
  while (p + 8 <= b.length) {
    const id = b.slice(p, p + 4).toString('latin1');
    const sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ' && p + 16 <= b.length) bps = b.readUInt32LE(p + 16);  // byteRate
    if (id === 'data') {
      // اندازهٔ اعلام‌شده می‌تواند دروغ باشد (فایلِ نیمه‌نوشته)؛ کوچک‌ترِ
      // «آنچه نوشته» و «آنچه واقعاً هست» درست است.
      const real = st.size - (p + 8);
      const n = (sz > 0 && sz <= real) ? sz : real;
      return bps > 0 ? n / bps : 0;
    }
    p += 8 + sz + (sz % 2);
  }
  return 0;
}

/** تصویرِ ثابت + صوت → MP4. */
function makeMp4(cover, wav, dest) {
  ff(['-loop', '1', '-framerate', '2', '-i', cover, '-i', wav,
      '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '2',
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,' +
             'pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-shortest', '-movflags', '+faststart', dest]);
}

/* ── اسلایدشو: از یک تصویر به N تصویر ───────────────────────────────────── */

/**
 * قالبِ واقعیِ بایت‌ها — نه پسوند و نه Content-Type. هر دو دروغ می‌گویند و
 * یک صفحهٔ خطا هم بایت برمی‌گرداند با کدِ ۲۰۰. همان قاعدهٔ `isWav`/`isPng`،
 * این‌بار برای هر چیزی که ممکن است در یک اسلاید بنشیند.
 */
function sniffKind(file) {
  let st;
  try { st = fs.statSync(file); } catch (e) { return ''; }
  if (st.size < 64) return '';
  const b = head(file, 16);
  if (b.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (b.slice(0, 3).toString('hex') === 'ffd8ff') return 'jpeg';
  if (b.slice(0, 6).toString('latin1') === 'GIF89a' ||
      b.slice(0, 6).toString('latin1') === 'GIF87a') return 'gif';
  if (b.slice(0, 4).toString('latin1') === 'RIFF' &&
      b.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (b.slice(0, 4).toString('hex') === '1a45dfa3') return 'webm';
  if (b.slice(4, 8).toString('latin1') === 'ftyp') return 'mp4';
  if (b.slice(0, 1).toString('latin1') === '<') return '';   // صفحهٔ HTML
  return '';
}

/**
 * سقفِ نرخِ بیت، از **مدتِ خودِ قسمت**.
 *
 * ══ چرا این تابع وجود دارد ══
 * موتور فایل را با `UrlFetchApp` برمی‌دارد و با Apps Script بالا می‌فرستد؛
 * هر دو سقفِ ~۵۰ مگابایت دارند و بخشِ ۲۷ خودش می‌گوید «با نرخِ کمتر رندر
 * شود». سنجیده شد (۳۰ سپتامبر): یک قسمتِ ۱۹ دقیقه‌ای با کن‌برنز و `crf`
 * تنها **۱۴۸ مگابایت** درمی‌آید — یعنی موتور اصلاً نمی‌تواند برش دارد.
 *
 * و `crf` کم‌کردن هم جواب نیست، چون به محتوا بند است. و `-b:v` تنها هم
 * جواب نیست، چون حتی برای تصویرِ کاملاً ثابت تا سقف بیت می‌ریزد و فایل
 * *همیشه* ۴۵ مگابایت می‌شود، که هدر است. راهِ درست هر دو با هم است:
 * کیفیت از `crf`، سقف از `maxrate` — و هرکدام کوچک‌تر شد، همان.
 *
 * یک عددِ سنجیده برای اطمینان: بدترین حالتِ ممکن (۹۰ تصویر، کن‌برنز روی
 * همه، ۱۰۸۰p، ۲۴fps، ۱۹ دقیقه) با همین سقف **۴۰٫۶۷ مگابایت** شد.
 */
function vmaxFor(durSec, capMB, audioBps) {
  const d = Math.max(1, Number(durSec) || 1);
  const cap = (Number(capMB) || VIS.capMB) * 1024 * 1024;
  const v = Math.floor((cap * 8) / d) - (Number(audioBps) || VIS.audioBps);
  return Math.max(120000, v);            // زیرِ این، تصویر دیگر تصویر نیست
}

/** تنظیم‌های اسلایدشو. یک جا، تا دو عدد در دو جا از هم دور نیفتند. */
const VIS = {
  w: 1920, h: 1080, fps: 24,
  xfade: 1.0,                 // مدتِ میان‌محوی
  group: 8,                   // چند تصویر در هر دستهٔ ffmpeg
  capMB: 45,                  // سقفِ بایت — زیرِ ۵۰ مگابایتِ Apps Script با حاشیه
  audioBps: 128000,
  minSec: 4.0,                // کوتاه‌تر از این، تصویر دیده نمی‌شود
  crf: 23,
  /* ══ حاشیهٔ امن، و باگی که فقط **نگاه کردن به یک فریم** نشانش داد ══
   * کن‌برنز تا ۱٫۱۸ بزرگ‌نمایی می‌کرد. بزرگ‌نماییِ z یعنی `1 - 1/z` از قاب
   * بیرون می‌ماند، و وقتی کارت افقی هم می‌لغزد **همهٔ** آن از یک طرف کم
   * می‌شود: در ۱٫۱۸ یعنی ۱۵٫۳٪ از یک لبه. و `lvCardDraw_` متن را با
   * `pad = W * 0.075` می‌گذارد — یعنی ۷٫۵٪. پس متنِ هر کارت، در اوجِ
   * حرکت، **بریده می‌شد**: سرِ بخش، اولِ هر گلوله، نوارِ کناری و نوارِ
   * پایین. هیچ خطایی هم نمی‌داد.
   * دو عدد در دو فایل که کسی کنارِ هم نگذاشته بودشان — همان شکلِ ۷٫۳۰/۷٫۳۱،
   * این بار بینِ یک `.gs` و یک `.js`. پس سقف دیگر عددِ دستی نیست: از
   * `safe` درمی‌آید، و `run_render_test.js` همان ۰٫۰۷۵ را **از خودِ منبعِ
   * موتور** می‌خواند و می‌سنجد. */
  safe: 0.07,                 // حاشیهٔ امنِ کارت — **تنگ‌ترین** pad در بخشِ ۲۷
  safeUse: 0.8,               // چقدر از آن حاشیه خرج شود (بقیه، حاشیهٔ خطا)
  /* گونه‌های میان‌محوی. یکنواخت نبودن، بخشی از «حرفه‌ای به نظر رسیدن» است —
     ولی تعدادشان کم است تا ویدئو شبیهِ نمایشِ افکت نشود. */
  trans: ['fade', 'smoothleft', 'wipeleft', 'fade', 'smoothright'],
  max: 120                    // بیش از این تصویر، نه لازم است نه امن
};

/**
 * فهرستِ تصویرهای معتبرِ یک ردیف.
 *
 * **نبودنش خطا نیست.** یک ردیفِ بی `visuals` — یا نسخهٔ قدیمیِ موتور که
 * این فیلد را نمی‌نویسد — باید *عیناً* مسیرِ امروز را برود. این تابع همان
 * مرز است و `run_render_test.js` رویش سنجه دارد.
 */
function visualsOf(it) {
  const v = (it && it.visuals) || null;
  if (!Array.isArray(v) || !v.length) return [];
  const out = [];
  for (const x of v) {
    const url = String((x && (x.url || x.u)) || '').trim();
    if (!/^https?:\/\//i.test(url)) continue;     // نشانیِ بی‌معنا، رد
    out.push({ url: url, sec: Math.max(0, Number(x.sec || x.seconds || 0)) || 0,
               kind: String(x.kind || '') });
    if (out.length >= VIS.max) break;
  }
  return out;
}

/**
 * زمان‌بندی — و قاعدهٔ **بی‌شکاف**.
 *
 * خواستهٔ صریحِ صاحبِ برنامه: «اون مدت زمان که درست می‌کنه با تصویر باشه».
 * پس این یک قاعده است نه یک آرزو: از ثانیهٔ صفر تا آخرین ثانیه هر لحظه
 * تصویری دارد. «بیشترِ مدت با تصویر» جوابِ آن خواسته نیست.
 *
 * وزن‌ها از سهمِ هر بخش می‌آید (که موتور حساب می‌کند)، ولی **جمعشان با
 * مدتِ سنجیده‌شدهٔ صوت مقیاس می‌شود** — نه با آنچه موتور حدس زده. اگر
 * تصویری برای بخشی نیامده باشد، سهمش به همسایه‌ها می‌رسد، پس صفحهٔ سیاه
 * ساخته نمی‌شود.
 *
 * و مدتِ *ورودیِ* هر تکه یک `xfade` بیشتر از سهمِ دیده‌شدنی‌اش است، چون
 * میان‌محوی از دو طرف می‌خورد. نتیجه: خروجی همیشه یک `xfade` بلندتر از صوت
 * است و `-shortest` می‌بُردش — یعنی شکاف **ساختاراً** ناممکن است.
 */
function timelineOf(vis, durSec) {
  const n = vis.length;
  const dur = Math.max(1, Number(durSec) || 1);
  if (!n) return [];
  // اگر حتی با کمینه جا نمی‌شوند، از آخر کم می‌کنیم — نه اینکه همه را خرد کنیم
  let keep = Math.max(1, Math.min(n, Math.floor(dur / VIS.minSec)));
  const use = vis.slice(0, keep);
  let w = use.map(x => (x.sec > 0 ? x.sec : 1));
  let tot = w.reduce((a, b) => a + b, 0) || use.length;
  let vs = w.map(x => (dur * x) / tot);
  // کمینه را رعایت کن و کمبود را از بلندترین‌ها بگیر
  for (let pass = 0; pass < 4; pass++) {
    const short = vs.filter(x => x < VIS.minSec).length;
    if (!short) break;
    let need = 0;
    vs = vs.map(x => { if (x < VIS.minSec) { need += VIS.minSec - x; return VIS.minSec; } return x; });
    const donors = vs.map((x, i) => (x > VIS.minSec ? i : -1)).filter(i => i >= 0);
    const pool = donors.reduce((a, i) => a + (vs[i] - VIS.minSec), 0);
    if (pool <= 0) break;
    for (const i of donors) vs[i] -= need * ((vs[i] - VIS.minSec) / pool);
  }
  // و جمع را **دقیقاً** روی مدتِ صوت بنشان: بی شکاف، بی سرریز
  const sum = vs.reduce((a, b) => a + b, 0);
  vs = vs.map(x => (x * dur) / sum);
  /* ══ و این‌جا یک ثانیه بود که آزمون گرفتش ══
   * مدتِ خروجیِ زنجیره = Σclip − XF×(N−1). اگر **همهٔ** تکه‌ها `v+XF` باشند،
   * خروجی می‌شود Σv + XF — یعنی **دقیقاً یک ثانیه بلندتر از صوت**، و آن یک
   * ثانیه سکوتِ ته‌ِ هر قسمت است. `-shortest` هم دقیق نمی‌بُرد: آزمون ۳۰٫۳۸
   * و ۳۰٫۹۲ داد برای صوتِ ۳۰ ثانیه.
   *
   * تکهٔ **آخر** میان‌محویِ بعدی ندارد، پس `+XF` هم نمی‌خواهد:
   *   Σclip = Σv + (N−1)×XF  ⇒  خروجی = Σv = مدتِ صوت. دقیق.
   * و `v` آخر همیشه از `minSec` بزرگ‌تر است، پس میان‌محویِ ورودی‌اش جا
   * می‌شود. */
  return use.map((x, i) => ({
    url: x.url, kind: x.kind,
    visible: Math.round(vs[i] * 1000) / 1000,
    clip: Math.round((vs[i] + (i === use.length - 1 ? 0 : VIS.xfade)) * 1000) / 1000
  }));
}

/** یک زنجیرهٔ کن‌برنز + میان‌محوی روی n ورودی. برچسبِ آخر `vout` است. */
function visFilter(items, idx0) {
  const parts = [];
  for (let i = 0; i < items.length; i++) {
    const N = Math.max(2, Math.round(items[i].clip * VIS.fps));
    const g = idx0 + i;
    /* کن‌برنز: بزرگ‌نمایی و کوچک‌نماییِ یکی‌درمیان تا یکنواخت نشود، و
       هر سوم یکی افقی می‌لغزد. عددها کوچک‌اند: حرکتِ آرام حرفه‌ای است،
       حرکتِ تند تبلیغ است. */
    /* سقفِ بزرگ‌نمایی از حاشیهٔ امن درمی‌آید، نه از سلیقه: بدترین حالت
       (لغزشِ افقیِ کامل) همهٔ `1 - 1/z` را از یک لبه می‌بَرد، پس
       `1 - 1/z ≤ safe × safeUse` ⇒ `z ≤ 1/(1 - safe × safeUse)`. */
    const ZMAX = 1 / (1 - VIS.safe * VIS.safeUse);
    const amp = (ZMAX - 1).toFixed(6);
    const z = (g % 2 === 0)
      ? 'min(1+' + (Number(amp) / N).toFixed(8) + '*on,' + ZMAX.toFixed(6) + ')'
      : 'max(' + ZMAX.toFixed(6) + '-' + (Number(amp) / N).toFixed(8) + '*on,1.00)';
    const x = (g % 3 === 2) ? '(iw-iw/zoom)*on/' + N : 'iw/2-(iw/zoom/2)';
    /* ══ باگی که فقط اجرای واقعی نشانش داد (۳۰ سپتامبر) ══
       `scale=W:-2` با `force_original_aspect_ratio=increase` با هم
       نمی‌خوانند: برای یک تصویرِ ۲۰۰۰×۱۰۰۰ نتیجه ۲۳۴۲×۱۱۷۱ می‌شود و
       `crop` ۱۳۱۸ می‌خواهد ⇒ «Invalid too big or non positive size».
       اصطلاحِ درستِ «پوشاندن» **هر دو بُعد را صریح** می‌دهد تا خروجی قطعاً
       بزرگ‌تر یا برابرِ قابِ برش باشد. بی این، هر تصویری که نسبتش از ۱۶:۹
       پهن‌تر باشد کلِ اسلایدشو را می‌ترکاند و قسمت به کاور برمی‌گشت —
       بی‌صدا، چون خودِ `buildVideo` می‌گیردش. */
    const cw = Math.round(VIS.w * 1.22), ch = Math.round(VIS.h * 1.22);
    parts.push('[' + i + ':v]scale=' + cw + ':' + ch + ':' +
      'force_original_aspect_ratio=increase,crop=' + cw +
      ':' + ch + ",zoompan=z='" + z + "':x='" + x +
      "':y='ih/2-(ih/zoom/2)':d=" + N + ':s=' + VIS.w + 'x' + VIS.h +
      ':fps=' + VIS.fps + ',setsar=1,format=yuv420p[v' + i + ']');
  }
  let prev = 'v0', off = items[0].clip - VIS.xfade;
  for (let i = 1; i < items.length; i++) {
    const lab = (i < items.length - 1) ? ('x' + i) : 'vout';
    parts.push('[' + prev + '][v' + i + ']xfade=transition=' +
      VIS.trans[(idx0 + i - 1) % VIS.trans.length] +
      ':duration=' + VIS.xfade.toFixed(2) + ':offset=' + off.toFixed(2) +
      '[' + lab + ']');
    prev = lab; off += items[i].clip - VIS.xfade;
  }
  return { parts: parts, last: (items.length > 1 ? 'vout' : 'v0') };
}

/**
 * اسلایدشو + صوت → MP4.
 *
 * ══ چرا دسته‌دسته و نه یک فرمان ══
 * یک فرمانِ ffmpeg با ۹۰ ورودیِ ۱۹۲۰×۱۰۸۰ و ۸۹ `xfade`ِ زنجیره‌ای **با
 * SIGKILL مُرد** — حافظه، نه منطق (سنجیده شد، ۳۰ سپتامبر). گرافِ فیلتر
 * همه‌اش را با هم نگه می‌دارد. پس هر دسته جدا روی دیسک می‌نشیند و بعد
 * دسته‌ها به هم می‌پیوندند: حافظه به اندازهٔ *یک دسته* بند است، نه به کلِ
 * قسمت — و یک قسمتِ خیلی بلند هم دیگر خطری ندارد.
 */
function buildSlideshow(files, tl, wav, durSec, dest, dir) {
  const items = tl.map((t, i) => ({ file: files[i], clip: t.clip }));
  const vmax = vmaxFor(durSec, VIS.capMB, VIS.audioBps);
  const groups = [];

  for (let g0 = 0; g0 < items.length; g0 += VIS.group) {
    const grp = items.slice(g0, g0 + VIS.group);
    const f = visFilter(grp, g0);
    const out = path.join(dir, 'g' + String(groups.length).padStart(3, '0') + '.mp4');
    const a = [];
    /* ══ باگی که یک سنجشِ زمان لو داد، و بزرگ‌ترینشان بود ══
     * `-loop 1 -t <clip>` با نرخِ پیش‌فرضِ ورودی (۲۵) یعنی `clip×25` فریمِ
     * **ورودی**، و `zoompan` برای **هر فریمِ ورودی** `d` فریم می‌سازد. پس یک
     * تکهٔ هفت‌ثانیه‌ای ۱۷۵ فریمِ ورودی می‌داد × d=168 ⇒ ۲۹٬۴۰۰ فریم، یعنی
     * **۲۰ دقیقه و ۲۵ ثانیه ویدئو برای هفت ثانیه کار** — و ۲ دقیقه و ۳۰
     * ثانیه پردازنده به‌جای ۱٫۲ ثانیه. سنجیده شد، ۳۰ سپتامبر.
     *
     * خروجی **درست** بود، چون گذرِ دوم با افستِ مطلق می‌بُرید و `-t` تهش را
     * می‌زد — پس هیچ خطایی هیچ‌جا نبود، فقط ۱۷۵ برابر هزینه. یک قسمتِ واقعیِ
     * ۱۹ دقیقه‌ای این‌طور ~۴۰ دقیقه می‌بُرد و از سقفِ ۵۰ دقیقه‌ایِ اکشن رد
     * می‌شد — یعنی ویدئو هیچ‌وقت ساخته نمی‌شد و کسی هم نمی‌فهمید چرا.
     *
     * `-framerate 1 -t 1` یعنی **دقیقاً یک فریمِ ورودی**، و `zoompan` همان
     * `d` فریم را می‌سازد و بس.
     *
     * و درسِ جدا: در سنجشِ اولم «۰٫۲۹× زمانِ واقعی» را دیدم و سؤال نکردم.
     * ۳۳۵ ثانیه برای کاری که ~۱۰ ثانیه است. **عددی که اندازه گرفتی ولی
     * نپرسیدی آیا معقول است، اندازه‌گیری نیست.** */
    for (const it of grp) a.push('-loop', '1', '-framerate', '1', '-t', '1',
                                 '-i', it.file);
    a.push('-filter_complex', f.parts.join(';'), '-map', '[' + f.last + ']',
           '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
           '-pix_fmt', 'yuv420p', '-r', String(VIS.fps),
           '-g', String(VIS.fps * 10), '-an', out);
    ff(a);
    // مدتِ دسته: جمعِ تکه‌ها منهای میان‌محوی‌های داخلی
    groups.push({ file: out,
                  dur: grp.reduce((x, y) => x + y.clip, 0) - VIS.xfade * (grp.length - 1) });
  }

  const a2 = [];
  for (const g of groups) a2.push('-i', g.file);
  a2.push('-i', wav);
  const parts = groups.map((g, i) => '[' + i + ':v]setsar=1,format=yuv420p[a' + i + ']');
  let prev = 'a0', off = groups[0].dur - VIS.xfade;
  for (let i = 1; i < groups.length; i++) {
    const lab = (i < groups.length - 1) ? ('y' + i) : 'vout';
    parts.push('[' + prev + '][a' + i + ']xfade=transition=fade:duration=' +
      VIS.xfade.toFixed(2) + ':offset=' + off.toFixed(2) + '[' + lab + ']');
    prev = lab; off += groups[i].dur - VIS.xfade;
  }
  const lastLab = (groups.length > 1 ? 'vout' : 'a0');
  a2.push('-filter_complex', parts.join(';'), '-map', '[' + lastLab + ']',
          '-map', String(groups.length) + ':a',
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(VIS.crf),
          '-maxrate', String(vmax), '-bufsize', String(vmax * 2),
          '-pix_fmt', 'yuv420p', '-r', String(VIS.fps), '-g', String(VIS.fps * 10),
          '-c:a', 'aac', '-b:a', String(Math.round(VIS.audioBps / 1000)) + 'k',
          '-ac', '2',
          /* ══ این سقف، بیمه است — و این را باید صریح نوشت ══
           * اولین تشخیصم این بود که «`-shortest` روی خروجیِ فیلترشده قابلِ
           * اتکا نیست»، چون مدتِ رندرشده بین اجراها عوض می‌شد: ۳۰٫۳۸ و
           * ۳۰٫۹۲ و ۳۱٫۲۱ برای یک صوتِ ۳۰ ثانیه‌ای. **آن تشخیص غلط بود.**
           * لرزشِ مدت نشانهٔ باگِ نرخِ فریمِ ورودی بود (چند خط پایین‌تر،
           * ۱۷۵ برابر فریم)، نه نقصی در `-shortest`.
           *
           * شاهدش: با اصلاحِ آن باگ، **برداشتنِ این `-t` هیچ سنجه‌ای را قرمز
           * نمی‌کند** — امتحان شد. پس این خط امروز باربر نیست و هیچ سنجه‌ای
           * هم نگهش نمی‌دارد.
           *
           * می‌مانَد، به‌عنوانِ سقفِ صریح روی چیزی که منتشر می‌شود: مدتِ
           * ویدئو نباید هرگز از مدتِ صوت بگذرد، هر غافلگیریِ آینده‌ای هم در
           * زمان‌بندیِ فیلترها پیش بیاید. ولی «بیمه» با «سد» یکی نیست، و
           * خطی که شکلِ سد داشته باشد و نباشد، خوانندهٔ بعدی را گمراه
           * می‌کند. */
          '-t', String(Math.max(1, Number(durSec) || 1)),
          '-shortest', '-movflags', '+faststart', dest);
  ff(a2);
  for (const g of groups) { try { fs.unlinkSync(g.file); } catch (e) {} }
  return { groups: groups.length, vmax: vmax };
}

/* ══ چرا نسخهٔ جزوه این‌جا ساخته **نمی‌شود** (۷٫۹۴) ══
 * گامِ ۱ این‌جا JPEGهای ~۹۰۰ پیکسلی می‌ساخت و به‌عنوانِ asset به ریلیز
 * می‌فرستاد، تا جزوه برشان دارد. گامِ ۴ که نوبتِ خودِ جزوه شد، معلوم شد آن
 * یک **مسیرِ دومِ بی‌فایده** بود:
 *   · `drive.google.com/thumbnail?id=…&sz=w900` همان تصویر را در همان
 *     اندازه می‌دهد، بی هیچ فایلِ تازه و هیچ انتقالی؛
 *   · و نشانیِ ریلیز **عمومیِ همیشگی** است. `voice-lab.yml` از روزِ اول
 *     نوشته که خروجیِ کارِ ما نباید از یک ریپوی عمومی منتشر بماند، و
 *     `dropCollected` همان مرز را برای پلِ صدا پیاده می‌کند. دو مسیر برای
 *     یک کار، یکی‌شان با یک سطحِ عمومیِ تازه، همان شکلی است که این مخزن
 *     بارها تاوانش را داده.
 * پس برداشته شد، و سنجه‌اش به چیزی که واقعاً محافظت می‌کرد نشانه گرفته شد
 * (۷٫۶۸: سنجه را دوباره نشانه بگیر، پاک نکن): رانر **نسخهٔ دومِ عمومی از
 * تصویرهای قسمت نمی‌سازد**.
 */

/**
 * **مرزِ «چیزی خراب نمی‌شود».**
 *
 * اگر ردیف `visuals` نداشته باشد، یا دانلودشان کافی نباشد، یا ساختِ
 * اسلایدشو بترکد — همان `makeMp4`ِ امروز اجرا می‌شود. یعنی بدترین حالتِ
 * این قابلیت، **وضعیتِ امروز** است، نه یک قسمتِ بی‌ویدئو.
 *
 * و شکست بی‌صدا رد نمی‌شود: دلیلش در `notes` می‌نشیند و به `docs/renders.json`
 * می‌رسد، تا ناظر بداند چرا این قسمت اسلاید نگرفت.
 */
/* ══ مسیرِ تازه: کارت‌ها این‌جا کشیده می‌شوند، از روی «مشخصاتِ تصویری» ══
 *
 * ردیفی که `spec` ندارد **عیناً** مسیرِ امروز را می‌رود — قولِ «چیزی خراب
 * نمی‌شود» همین شرط است، نه یک جمله در سند.
 *
 * و سه تفاوتِ بنیادی با مسیرِ قدیم، که هر سه از ایرادهای سنجیده‌شده آمدند:
 *   ۱) **هیچ zoompan نیست.** کن‌برنز روی متنِ برداری لرزش می‌دهد، و همان
 *      «هی صفحه می‌لرزه» بود. حرکت مالِ محتواست: عناصر یکی‌یکی می‌آیند.
 *   ۲) **زمانِ هر ضرب از گفتار می‌آید** (`at`)، نه از تقسیمِ حسابیِ مدت.
 *      در نمونهٔ پیشین پنج کارت از شش، متنی را نشان می‌دادند که ۱۱ تا ۸۰
 *      ثانیه قبل گفته شده بود.
 *   ۳) ضرب‌ها **زیاد و کوتاه**اند (~۳ ثانیه)، نه ~۷۶ ثانیه.
 */
function specOf(it) {
  const s = it && it.spec;
  if (!s || typeof s !== 'object' || !Array.isArray(s.cards) || !s.cards.length) return null;
  return s;
}

/* ══ تصویرِ ساخته‌شدهٔ هر کارت — این‌جا برداشته می‌شود، نه در cardkit (۸.۲۶) ══
 * مرزِ cardkit این است که چیزی دانلود نکند؛ پس این‌جا، کنارِ بقیهٔ دانلودها.
 * بایت‌ها باور می‌شوند نه پسوند (`sniffKind`): فایلی که اشتراکش باز نشده یک
 * صفحهٔ HTML برمی‌گرداند، نه خطا (درسِ ۷٫۳۳). و تصویر پیش از جاسازی با ffmpeg
 * به ۱۹۲۰×۱۰۸۰ و JPEG کوچک می‌شود: هر ضربِ کارت یک فایلِ HTMLِ جدا است و
 * یک PNGِ چندمگابایتی در هر کدام یعنی صدها مگابایت برای هیچ.
 * نشد ⇒ کارتِ ساده و یک خطِ یادداشت؛ هرگز کلِ ویدئو زمین نمی‌خورد. */
function specBackdrops(spec, dir, notes) {
  let n = 0;
  (spec.cards || []).forEach((c, ci) => {
    if (!c || !c.bgUrl || c.bg) return;
    const f = path.join(dir, 'bg' + String(ci).padStart(2, '0'));
    try {
      fetchTo(c.bgUrl, f);
      const k = sniffKind(f);
      if (k !== 'png' && k !== 'jpeg') {
        notes.push('تصویرِ کارتِ ' + (ci + 1) + ': بایت‌ها تصویر نبود');
        return;
      }
      let use = f, mime = 'image/' + k;
      try {
        const j = f + '.jpg';
        ff(['-i', f, '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
            '-q:v', '4', '-frames:v', '1', j]);
        if (sniffKind(j) === 'jpeg') { use = j; mime = 'image/jpeg'; }
      } catch (e) {}
      c.bg = 'data:' + mime + ';base64,' + fs.readFileSync(use).toString('base64');
      n++;
    } catch (e) {
      notes.push('تصویرِ کارتِ ' + (ci + 1) + ': ' + String(e.message).split('\n')[0].slice(0, 60));
    }
  });
  return n;
}

function buildSpecVideo(spec, wav, durSec, dest, dir, notes) {
  const CK = require('./cardkit/index.js');
  const bgs = specBackdrops(spec, dir, notes || []);
  const shots = CK.build(spec, path.join(dir, 'cards'));
  if (shots.length < 2) throw new Error('کمتر از دو ضرب ساخته شد');

  const t0 = Number(spec.t0) || 0, t1 = Number(spec.t1) || (t0 + durSec);
  const items = [];
  for (let i = 0; i < shots.length; i++) {
    const a = shots[i].at - t0;
    const b = (i + 1 < shots.length ? shots[i + 1].at : t1) - t0;
    if (b - a > 0.05) items.push({ f: shots[i].file, d: b - a });
  }
  /* آخرین ضرب تا پایانِ صوت کشیده می‌شود — وگرنه ثانیه‌های آخر سیاه می‌شوند،
     و یک قابِ سیاه در انتها بدترین چیزی است که بیننده می‌بیند. */
  const sum = items.reduce((x, y) => x + y.d, 0);
  if (durSec - sum > 0.05) items[items.length - 1].d += (durSec - sum);

  const vmax = vmaxFor(durSec, VIS.capMB, VIS.audioBps);
  const XF = 0.42, G = 10, parts = [];
  for (let g0 = 0; g0 < items.length; g0 += G) {
    const grp = items.slice(g0, g0 + G), a = [], f = [];
    grp.forEach((it2, i) => {
      a.push('-loop', '1', '-framerate', String(VIS.fps),
             '-t', (it2.d + (i === grp.length - 1 ? 0 : XF)).toFixed(3), '-i', it2.f);
      f.push(`[${i}:v]crop=1920:1080:0:0,scale=${VIS.w}:${VIS.h},setsar=1,format=yuv420p[v${i}]`);
    });
    let prev = 'v0', off = grp[0].d;
    for (let i = 1; i < grp.length; i++) {
      const lab = (i === grp.length - 1) ? 'vout' : ('x' + i);
      f.push(`[${prev}][v${i}]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(3)}[${lab}]`);
      prev = lab; off += grp[i].d;
    }
    const outp = path.join(dir, 'sg' + String(parts.length).padStart(3, '0') + '.mp4');
    ff(a.concat(['-filter_complex', grp.length > 1 ? f.join(';') : f[0].replace('[v0]', '[vout]'),
      '-map', '[vout]', '-c:v', 'libx264', '-crf', String(VIS.crf), '-preset', 'medium',
      '-maxrate', String(vmax), '-bufsize', String(vmax * 2),
      '-pix_fmt', 'yuv420p', '-r', String(VIS.fps), outp]));
    parts.push(outp);
  }
  const lst = path.join(dir, 'sl.txt');
  fs.writeFileSync(lst, parts.map(p => `file '${p}'`).join('\n'));
  const silent = path.join(dir, 'sall.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent]);
  ff(['-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-shortest', '-movflags', '+faststart', dest]);
  return { beats: items.length, cards: spec.cards.length, vmax: vmax, bgs: bgs,
           marks: Array.from(new Set(spec.cards.map(c =>
             CK.mark.cornerAt(Number(c.at) || 0, spec.mark && spec.mark.everySec)))) };
}

/** نشانِ بریده را در `docs/brand/channel-mark.png` می‌گذارد — فقط اگر واقعاً بریده
 *  شده و با نسخهٔ موجود فرق دارد؛ گام «commit»ِ گردش‌کار آن را بالا می‌برد. */
function brandMarkSave(lg) {
  if (!lg || !/^data:image\/png;base64,/.test(lg.data || '') || !/بی‌زمینه/.test(lg.how || '')) return false;
  const buf = Buffer.from(lg.data.split(',')[1], 'base64');
  const out = path.join(__dirname, '..', 'docs', 'brand', 'channel-mark.png');
  try { if (fs.existsSync(out) && fs.readFileSync(out).equals(buf)) return false; } catch (e) {}
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return true;
}

/* ══ صحنه‌های مصور (۸.۳۱) — از همه مقدم ══
 * ردیفِ `mode: 'scenes'` تصویرِ تمام‌صفحهٔ هر صحنه را با ثانیهٔ شروعش دارد.
 * دانلود این‌جاست (مرزِ scenekit: شبکه ندارد)، و بایت‌ها باور می‌شوند نه
 * نشانی: فایلی که اشتراکش باز نیست صفحهٔ HTML برمی‌گرداند (۷.۳۳).
 * نشد ⇒ با علت به مسیرِ بعدی؛ هرگز کلِ قسمت زمین نمی‌خورد. */
/* ══ رسانه‌های خودِ منبع (۸.۹۶) ══
 * «از همه جا»: تصویرِ هر صحنه خودِ کلیپ یا عکسی است که گوینده درباره‌اش حرف می‌زند. هر نشانی یک
 * بار دانلود می‌شود (کلیپی که دو صحنه یا یک لحظه هم دارد)، بایت‌ها باور می‌شوند نه پسوند، و هر
 * کلیپ از همان تکه‌ای بریده می‌شود که عبارتش را موتور گفته (`clipfind.py`). نشد ⇒ صحنه به قبلی
 * می‌پیوندد (scenekit)، با یادداشت. */
function prepMedia(it, scenes, dir, notes, placed) {
  const MKIT = require('./mediakit.js');
  const FF = ffmpegExe();
  const got = {}, imgs = {}, clips = {}, full = {};
  const st = { clips: 0, photos: 0, found: 0, notFound: 0, failed: 0, why: [] };
  const fileOf = url => {
    if (got[url] !== undefined) return got[url];
    const f = path.join(dir, 'm' + String(Object.keys(got).length).padStart(3, '0'));
    try {
      fetchTo(url, f);
      const k = sniffKind(f);
      const info = MKIT.probe(FF, f);
      got[url] = (k === 'png' || k === 'jpeg' || k === 'webp' || k === 'gif')
        ? { file: f, kind: 'photo', info: info }
        : (info && info.dur > 0.5 ? { file: f, kind: 'video', info: info } : null);
      if (!got[url]) notes.push('رسانه: بایت‌ها نه تصویر بود نه ویدئو');
    } catch (e) {
      got[url] = null;
      notes.push('رسانه دانلود نشد: ' + String(e.message).split('\n')[0].slice(0, 60));
    }
    return got[url];
  };
  for (const s of scenes) fileOf(s.url);
  for (const m of (it.moments || [])) if (m && m.url) fileOf(m.url);
  /* یک بار شنیدن برای همه: عبارتِ هر کلیپ (صحنه‌ها و لحظه‌ها) */
  const reqs = [], reqOf = {};
  const ask = (url, quote) => {
    const g = got[url];
    if (!g || g.kind !== 'video' || !quote) return -1;
    const key = url + '|' + quote;
    if (reqOf[key] === undefined) { reqOf[key] = reqs.length; reqs.push({ file: g.file, quote: quote }); }
    return reqOf[key];
  };
  const scIdx = scenes.map(s => ask(s.url, s.media && s.media.quote));
  const moIdx = (placed || []).map(m => ask(m.url, m.quote));
  const heard = MKIT.find(reqs, dir);
  stage('شنیدنِ کلیپ‌ها تمام شد (' + reqs.length + ')');
  /* ══ برشِ هر لحظه، **یک بار** — همان که صحنه دورش می‌بُرد و همان که با صدا لای گفتار می‌نشیند ══
     دو حسابِ جدا برای «لحظه از کجا تا کجا» یعنی روزی یکی چند ثانیه با دیگری فرق کند و بیننده تکه‌ای
     را دو بار ببیند یا تکه‌ای را هرگز. */
  const moCut = (placed || []).map((m, i) => {
    const g = got[m.url], h = moIdx[i] >= 0 ? heard[moIdx[i]] : null;
    if (!g || g.kind !== 'video') return { m: m, ok: false, why: 'کلیپ نرسید' };
    /* ۹.۰۴: عبارتِ مدل دقیق پیدا نشد ⇒ «بخشِ اصلیِ گفتارِ» خودِ کلیپ (`h.main` از clipfind) با صدایش — نه هیچ.
       «اولین کلیپ رو که اصلاً پخش هم نکرد چه برسه که بخواد با صدا هم باشه». */
    const fb = h && !h.found && h.main && Number(h.main.end) > Number(h.main.from) ? h.main : null;
    if (!h || (!h.found && !fb)) return { m: m, ok: false, why: 'عبارت در کلیپ پیدا نشد (' + ((h && h.why) || '') + ')' };
    let from = Math.max(0, Number(fb ? fb.from : h.from) - 0.25);
    /* ۹.۰۰: تا پایانِ جملهٔ گوینده (`h.end` از clipfind)، نه تا آخرین واژهٔ عبارت — «یه قسمتِ خیلی کوتاه
       بود و سریع قطع می‌شد». */
    let stop = fb ? Number(fb.end) : (Number(h.end) > Number(h.to) ? Number(h.end) : Number(h.to));
    const sz = momentSize(h.spans, from, stop, g, m);
    from = sz.from; stop = sz.stop;
    const len = Math.min(sz.cap, stop - from + MKIT.MK.momentTail, (g.info.end || g.info.dur) - from);
    if (len < MKIT.MK.momentMin) return { m: m, ok: false, why: 'تکهٔ شنیده‌شده کوتاه بود' };
    return { m: m, ok: true, url: m.url, from: from, len: len, fb: fb ? fb.how : '', how: sz.how };
  });
  /* ══ چیدمان و حرکت (۸.۹۹) ══ هر رسانهٔ غیرِافقی به نوبت چپ/وسط/راست؛ عکس کلیپِ زنده می‌شود (کن‌برنز یا
     پیمایشِ اسکرین‌شاتِ بلند) و قابِ هر کلیپ از حاشیهٔ تختِ خودش بریده می‌شود. «لحظه» همان چیدمانِ صحنه‌اش
     را می‌گیرد — وگرنه وسطِ صحنه رسانه از چپ به وسط می‌پرد. */
  let lay = 0;
  const layOf = {}, usedTo = {};
  scenes.forEach(s => { layOf[s.n] = MKIT.layoutOf(lay++); });
  st.layouts = {};
  for (const m of moCut) {
    if (!m.ok) continue;
    const sc = scenes.filter(x => x.url === m.url && x.t0 <= m.m.at + 0.6).pop();
    m.layout = sc ? layOf[sc.n] : 'center';
  }
  const teaserPool = [];
  scenes.forEach(s => { if (s.media && s.media.teaser && got[s.url] && teaserPool.indexOf(s.url) < 0) teaserPool.push(s.url); });
  /* ۹.۱۸ — «تو اسلاید اول یه دونه کلیپ رو نشون نداد»: کاشی‌ها فقط از رسانه‌های برچسبِ پیش‌نمایش می‌آمدند و کلیپِ
     «اولین مصاحبهٔ استخدامی» برچسب نداشت. پیش‌نمایش تصویرِ **همهٔ** قسمت است: هر کلیپِ دیگرِ قسمت (اول ویدئوها، بعد
     عکس‌ها) تا سقفِ کاشی‌ها به آن می‌پیوندد. */
  if (teaserPool.length) {
    ['video', 'photo'].forEach(kd => scenes.forEach(s => {
      if (teaserPool.length < MKIT.MK.collageMax && got[s.url] && got[s.url].kind === kd && teaserPool.indexOf(s.url) < 0) teaserPool.push(s.url);
    }));
  }
  /* و هر کاشی یک برنامه برای **کلِ** پیش‌نمایش، نه برای هر صحنه‌اش (MKIT.teaserPlan) — صحنهٔ بعدی ادامه است، نه از نو. */
  const tzIdx = scenes.map((s, i) => (s.media && s.media.teaser ? i : -1)).filter(i => i >= 0);
  const tz0 = tzIdx.length ? scenes[tzIdx[0]].t0 : 0;
  const tzEnd = tzIdx.length ? (tzIdx[tzIdx.length - 1] + 1 < scenes.length ? scenes[tzIdx[tzIdx.length - 1] + 1].t0 : tz0 + 30) : 0;
  const tzPlan = MKIT.teaserPlan(teaserPool.map(u => ({ kind: got[u].kind, dur: got[u].info.end || got[u].info.dur })), tzEnd - tz0);
  st.teaserTiles = teaserPool.length;
  st.teaserSec = Math.round((tzEnd - tz0) * 10) / 10;
  scenes.forEach((s, i) => {
    const g = got[s.url];
    if (!g) { st.failed++; return; }
    stage('برشِ صحنهٔ ' + s.n + ' (' + g.kind + (s.media && s.media.teaser ? '، پیش‌نمایش' : '') + ')');
    const out = path.join(dir, 'ms' + String(s.n).padStart(3, '0'));
    const want = (i + 1 < scenes.length ? scenes[i + 1].t0 - s.t0 : 30) + 2;
    try {
      if (s.media && s.media.teaser && teaserPool.length >= 2) {
        /* ۹.۱۱: پیش‌نمایش = کلاژِ همهٔ رسانه‌های پیش‌نمایش در یک قاب، کانون روی رسانهٔ همین صحنه. */
        try {
          const el = Math.max(0, s.t0 - tz0);
          const tiles = teaserPool.map((u, k) => ({ file: got[u].file, kind: got[u].kind === 'photo' ? 'photo' : 'video',
                                                    from: (tzPlan[k].from + el * tzPlan[k].speed) % Math.max(1, got[u].info.end || got[u].info.dur || 1),
                                                    speed: tzPlan[k].speed }));   // کوتاه‌تر از حتی کند ⇒ حلقه، ولی هرگز جلوتر از پایان
          const cl = MKIT.collage(FF, tiles, Math.max(0, teaserPool.indexOf(s.url)), out + '.mp4', want);
          clips[String(s.n)] = cl.file; imgs[String(s.n)] = cl.still; full[String(s.n)] = true;
          st.teaser = (st.teaser || 0) + 1;
          return;
        } catch (eC) { notes.push('کلاژِ پیش‌نمایش نشد (صحنهٔ ' + s.n + '): ' + String(eC.message).split('\n')[0].slice(0, 60)); }
      }
      if (g.kind === 'photo' || (s.media && s.media.kind === 'photo')) {
        if (g.kind !== 'photo') { st.failed++; notes.push('صحنهٔ ' + s.n + ': عکس نبود'); return; }
        /* ۹.۰۴: کارتِ نوشته روی تصویرِ محوِ **همان رسانه‌ای** که پیشش بود (آخرین قابِ کلیپ یا خودِ عکس)، نه کاور. */
        const isCard = !!(s.media && s.media.card);
        const prevImg = isCard && i > 0 ? imgs[String(scenes[i - 1].n)] : '';
        const srcImg = prevImg && fs.existsSync(prevImg) ? prevImg : g.file;
        const pc = MKIT.photoClip(FF, srcImg, out + '.mp4', want, { layout: layOf[s.n], card: isCard });
        if (isCard && srcImg !== g.file) st.cardOwn = (st.cardOwn || 0) + 1;
        if (pc.kind === 'card') st.cards = (st.cards || 0) + 1;
        clips[String(s.n)] = pc.file; imgs[String(s.n)] = pc.still; full[String(s.n)] = true;
        st.layouts[pc.kind === 'scroll' ? 'scroll' : pc.layout] = (st.layouts[pc.kind === 'scroll' ? 'scroll' : pc.layout] || 0) + 1;
        if (pc.box) st.cropped = (st.cropped || 0) + 1;
        st.photos++;
        return;
      }
      const end = i + 1 < scenes.length ? scenes[i + 1].t0 : 1e9;
      const h = scIdx[i] >= 0 ? heard[scIdx[i]] : null;
      /* لحظهٔ همین کلیپ درونِ همین صحنه ⇒ کلیپِ بی‌صدا طوری شروع می‌شود که **درست سرِ لحظه** به
         آغازِ تکهٔ با‌صدا برسد؛ لحظه همان‌جا با صدا ادامه‌اش می‌دهد و پس از آن، تصویر از **پسِ**
         همان تکه پی گرفته می‌شود — پیوسته، بی تکرار. */
      const mc = !(s.media && s.media.teaser) && moCut.find(c => c.ok && c.url === s.url && c.m.at >= s.t0 - 0.6 && c.m.at < end);
      let from = 0, skip = null;
      const cont = !!(s.media && s.media.cont) && usedTo[s.url] !== undefined;
      if (cont) {
        /* ادامه (۹.۰۳): پس از کارتِ نوشته، همان کلیپ از جایی که صحنهٔ پیشینش ایستاد — نه از نو (تکرار)، نه کاور.
           کلیپی که دیگر چیزی ندارد، تکهٔ پایانی‌اش را نشان می‌دهد. */
        const gE = g.info.end || g.info.dur;   // ۹.۱۰: بی کارتِ پایانیِ ریل
        from = Math.min(usedTo[s.url], Math.max(0, gE - Math.min(want, gE)));
      } else if (mc) {
        const rel = Math.max(0, mc.m.at - s.t0);
        from = Math.max(0, mc.from - rel);
        skip = { at: mc.from, len: mc.len };
        st.found++;
      } else if (h && h.found) {
        from = Math.max(0, Number(h.from) - MKIT.MK.lead);
        if (from + want > g.info.dur) from = Math.max(0, g.info.dur - want);
        st.found++;
      } else if (s.media && s.media.teaser) {
        /* پیش‌نمایشِ آغاز (۸.۹۸): از میانهٔ کلیپ، نه از جایی که صحنهٔ اصلی‌اش بعداً نشان می‌دهد. */
        from = Math.max(0, Math.min(g.info.dur - want, g.info.dur * 0.45));
      } else if (h && h.main && Number(h.main.end) > Number(h.main.from)) {
        /* ۹.۰۴: عبارت دقیق پیدا نشد ولی گفتارِ کلیپ شنیده شد ⇒ از بخشِ اصلیِ گفتار، نه از ثانیهٔ اول. */
        from = Math.max(0, Number(h.main.from) - MKIT.MK.lead);
        if (from + want > g.info.dur) from = Math.max(0, g.info.dur - want);
        st.mainPart = (st.mainPart || 0) + 1;
        st.why.push('صحنهٔ ' + s.n + ': عبارت دقیق نبود ⇒ بخشِ اصلیِ گفتار (' + h.main.how + ')');
      } else {
        /* بی عبارت یا نشنیده ⇒ از آغاز؛ کلیپِ بلند از ثانیهٔ اول، تا قابِ سیاهِ آغاز نیاید. */
        from = g.info.dur > 8 ? 1 : 0;
        if (scIdx[i] >= 0) { st.notFound++; st.why.push('صحنهٔ ' + s.n + ': ' + ((h && h.why) || 'شنیده نشد')); }
      }
      if (g.box === undefined) g.box = MKIT.contentBox(FF, g.file, g.info, { at: Math.min(Math.max(0, g.info.dur - 0.5), from + 1) });
      const cOpt = { layout: layOf[s.n], box: g.box, fill: true };   // ۹.۱۰: صحنهٔ بلندتر از کلیپ ⇒ چند قابِ متحرک
      const c = MKIT.clip(FF, g.file, out + '.mp4', from, want, g.info, skip, cOpt);
      if (!(s.media && s.media.teaser)) usedTo[s.url] = Math.max(usedTo[s.url] || 0, from + (c.played || c.len) + (skip ? skip.len : 0));
      const ar = (g.box ? g.box.w / g.box.h : g.info.w / g.info.h);
      const lk = (ar >= MKIT.MK.wideMin && ar <= MKIT.MK.wideMax) ? 'fill' : layOf[s.n];
      st.layouts[lk] = (st.layouts[lk] || 0) + 1;
      if (g.box) st.cropped = (st.cropped || 0) + 1;
      clips[String(s.n)] = c.file; imgs[String(s.n)] = c.still; full[String(s.n)] = true;
      st.clips++;
      if (c.filled) { st.filled = (st.filled || 0) + 1; st.filledSec = Math.round((st.filledSec || 0) + c.len - c.played); }
      if (c.cut > 0) { st.tailCut = (st.tailCut || 0) + 1; }
    } catch (e) {
      st.failed++;
      notes.push('صحنهٔ ' + s.n + ': ' + String(e.message).split('\n')[0].slice(0, 70));
    }
  });
  if (st.why.length) notes.push('برشِ کلیپ از آغاز: ' + st.why.slice(0, 4).join(' · '));
  return { imgs: imgs, clips: clips, full: full, got: got, heard: heard, moCut: moCut, stat: st };
}

/**
 * اندازهٔ هر «لحظه» از خودِ کلیپ (۹.۱۱). صاحبِ برنامه: «زمانِ خیلی کمی برای پخشِ خودِ کلیپ اختصاص می‌ده …
 * حسبِ هر کلیپ و پادکست این محدودیت رو تنظیم کن به طوری که بیننده بتونه بیشتر از محتواهای کلیپ استفاده کنه».
 * پیش از این هر لحظه دقیقاً **یک جمله** از گویندهٔ کلیپ بود (۷ تا ۹ ثانیه در نمونهٔ ۷۳) و سقفِ ۳۰ ثانیه‌ایِ تنظیمات
 * هرگز به آن نمی‌رسید. حالا: کلیپی که کلِ گفتارش تا `whole` ثانیه است **همه‌اش** با صدای خودش پخش می‌شود؛ کلیپِ
 * بلندتر از جای عبارت تا پایانِ جمله‌ای که دست‌کم `target` ثانیه را پر کند، حداکثر `cap`. هرگز وسطِ جمله بریده نمی‌شود.
 */
function momentSize(spans, from, stop, g, m) {
  const MKIT = require('./mediakit.js');
  if (g.info.end === undefined) { try { g.info.end = MKIT.contentEnd(ffmpegExe(), g.file, g.info); } catch (e) { g.info.end = g.info.dur; } }
  const E = Math.min(g.info.dur, g.info.end || g.info.dur);
  const cap = Math.max(MKIT.MK.momentMin, Number(m.max) || 20), whole = Math.max(cap, Number(m.whole) || 0);
  const S = (spans || []).map(x => [Number(x[0]), Number(x[1])]).filter(x => x[1] > x[0] && x[0] < E).sort((a, b) => a[0] - b[0]);
  if (!S.length) return { from: from, stop: stop, cap: cap, how: 'sentence' };
  const s0 = Math.max(0, S[0][0] - 0.3), s1 = Math.min(E, S[S.length - 1][1] + 0.5);
  if (s1 - s0 <= whole) return { from: s0, stop: s1, cap: whole + 1, how: 'whole' };
  const target = Math.max(cap * 0.7, stop - from);
  let end = stop;
  for (const sp of S) {
    if (sp[1] <= end + 0.05) continue;
    if (sp[1] - from > cap) break;
    end = sp[1];
    if (end - from >= target) break;
  }
  return { from: from, stop: Math.min(E, end), cap: cap, how: 'window' };
}

/** لحظه‌ها پس از ساختِ ویدئو و سنجشش: هر کدام همان تکهٔ شنیده‌شده، با صدای خودش. */
function spliceMoments(it, placed, mp, silent, wav, dest, dir, notes) {
  const MKIT = require('./mediakit.js');
  const SKIT = require('./scenekit.js');
  const FF = ffmpegExe();
  const enc = ['-c:v', 'libx264', '-preset', 'faster', '-crf', String(SKIT.SK.crf), '-pix_fmt', 'yuv420p',
               '-r', String(SKIT.SK.fps), '-g', String(SKIT.SK.fps * 10)];
  const parts = [], st = { asked: (it.moments || []).length, placed: placed.length, made: 0, why: [] };
  for (const c of (mp.moCut || [])) {
    const m = c.m;
    if (!c.ok) { st.why.push(Math.round(m.at) + 's: ' + c.why); continue; }
    const g = mp.got[c.url];
    try {
      const v = path.join(dir, 'mo' + parts.length + '.mp4'), a = path.join(dir, 'mo' + parts.length + '.wav');
      const r = MKIT.moment(FF, g.file, v, a, c.from, c.len, g.info, enc, { layout: c.layout || 'center', box: g.box || null });
      parts.push({ at: m.at, v: v, a: a, len: r.len, cut: Number(m.cut) || 0 });
      if (m.cut) st.replaced = (st.replaced || 0) + 1;                  // ۹.۱۴: جای بازگویی، نه کنارش
      st.made++;
      st.sec = Math.round((st.sec || 0) + r.len);                       // ۹.۱۱: چند ثانیه از خودِ کلیپ‌ها با صدایشان
      if (c.how === 'whole') st.whole = (st.whole || 0) + 1;
      if (c.fb) st.fallback = (st.fallback || 0) + 1;      // ۹.۰۴: «بخشِ اصلیِ گفتار»، نه عبارتِ دقیق
    } catch (e) { st.why.push(Math.round(m.at) + 's: ' + String(e.message).split('\n')[0].slice(0, 60)); }
  }
  if (!parts.length) { if (st.why.length) notes.push('لحظه‌ها: ' + st.why.join(' · ')); return { stat: st, inserts: [] }; }
  const tmp = dest + '.mo.mp4';
  const r = MKIT.splice(FF, silent, wav, parts, tmp, dir);
  fs.renameSync(tmp, dest);
  if (st.why.length) notes.push('لحظه‌ها: ' + st.why.join(' · '));
  return { stat: st, inserts: r.inserts };
}

function buildScenesVideo(it, scenes, wav, durSec, dest, dir, notes) {
  const SKIT = require('./scenekit.js');
  const CK = require('./cardkit/index.js');
  /* جای لحظه‌ها **پیش از** هر چیز: هم برشِ کلیپِ صحنه به آن بسته است (تکهٔ لحظه از آن برداشته
     می‌شود) و هم قابِ کلیدی که لای‌گذاری را بی بازکدگذاری می‌کند. */
  let placed = [];
  if (it.media && (it.moments || []).length) {
    placed = require('./mediakit.js').placeMoments(it.moments, SKIT.silences(ffmpegExe(), wav), it.mute, durSec, notes);
    /* ══ روی شبکهٔ قاب (آزمونِ واقعی نشانش داد) ══ قابِ کلیدیِ «۲۴٫۳» در ۲۴ قاب بر ثانیه سرِ ۲۴٫۳۳۳
       می‌نشیند؛ برشِ بی‌بازکدگذاری که ۲۴٫۳ بخواهد به قابِ کلیدیِ **پیشین** (۲۲٫۲۹) برمی‌گردد و دو ثانیه
       تصویرِ صحنهٔ قبل تکرار می‌شود. پس زمانِ لحظه خودش روی قاب است: قابِ کلیدی، برشِ تصویر، برشِ صوت و
       `inserts` همه همین یک عدد. */
    placed.forEach(m => {
      m.at = Math.ceil(m.at * SKIT.SK.fps - 1e-6) / SKIT.SK.fps;
      if (m.cut) m.cut = Math.round(m.cut * SKIT.SK.fps) / SKIT.SK.fps;   // ۹.۱۴: پایانِ بازه هم روی قاب
    });
  }
  stage('رسانه‌ها: دانلود، شنیدن و برش');
  const mp = it.media ? prepMedia(it, scenes, dir, notes, placed) : null;
  const imgs = mp ? mp.imgs : {};
  for (const s of (mp ? [] : scenes)) {
    const f = path.join(dir, 's' + String(s.n).padStart(3, '0'));
    try {
      fetchTo(s.url, f);
      const k = sniffKind(f);
      if (k !== 'png' && k !== 'jpeg') { notes.push('صحنهٔ ' + s.n + ': بایت‌ها تصویر نبود'); continue; }
      const j = f + '.jpg';
      ff(['-i', f, '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
          '-q:v', '3', '-frames:v', '1', j]);
      if (sniffKind(j) === 'jpeg') imgs[String(s.n)] = j;
    } catch (e) {
      notes.push('صحنهٔ ' + s.n + ': ' + String(e.message).split('\n')[0].slice(0, 60));
    }
  }
  /* کلیپِ آغاز (۸.۵۱): بایت‌ها باور می‌شوند — «ftyp» در سرِ فایل. نرسید یا ویدئو نبود
     ⇒ همان نقاشیِ ثابت، و گفته می‌شود؛ ویدئوی درس هرگز برای کلیپ زمین نمی‌خورد. */
  const clips = mp ? mp.clips : {};
  for (const s of (mp ? [] : scenes)) {
    if (!s.clip || !imgs[String(s.n)]) continue;
    const f = path.join(dir, 'c' + String(s.n).padStart(3, '0') + '.mp4');
    try {
      fetchTo(s.clip.url, f);
      if (sniffKind(f) !== 'mp4') { notes.push('کلیپِ صحنهٔ ' + s.n + ': بایت‌ها ویدئو نبود'); continue; }
      clips[String(s.n)] = f;
    } catch (e) {
      notes.push('کلیپِ صحنهٔ ' + s.n + ': ' + String(e.message).split('\n')[0].slice(0, 60));
    }
  }
  const mark = it.mark && it.mark.handle ? Object.assign({}, it.mark) : null;
  if (mark && mark.logoUrl && !mark.logo) {
    const lg = CK.logoClean(mark.logoUrl, dir, ffmpegExe());
    mark.logo = lg.data; mark.logoClean = lg.how;
    /* همان نشانِ بی‌زمینه برای واترمارکِ خودِ یوتیوب (۸.۴۵): موتور ابزارِ تصویر
       ندارد و این فایل را از گیت‌هاب می‌خوانَد. فقط اگر عوض شده نوشته می‌شود. */
    try { brandMarkSave(lg); } catch (eB) { notes.push('نشانِ واترمارک ذخیره نشد: ' + String(eB.message).slice(0, 60)); }
  }
  const exe = CK.chromeExe();
  stage('صحنه‌ها: ساختِ ویدئو');
  const r = SKIT.build(it, { ff: ffmpegExe(), ffRun: ff, exe: exe, wav: wav, durSec: durSec, genre: String(it.genre || ''),
                             dest: dest, dir: dir, imgs: imgs, clips: clips, mark: mark, notes: notes,
                             full: mp ? mp.full : null,
                             kf: mp ? mp.moCut.filter(c => c.ok).map(c => c.m.at) : [],
                             keepSilent: !!(mp && mp.moCut.some(c => c.ok)) });
  stage('سنجشِ قاب‌ها');
  const qa = SKIT.qa(ffmpegExe(), dest, r.tl, durSec);
  /* ══ شنیدنِ هم‌زمانی (۸.۸۰) ══ سه نقطه، با تشخیصِ گفتار: آنچه در زمانِ صحنه گفته می‌شود با
     گفتارِ خودِ صحنه می‌خواند؟ نبودِ ابزار یعنی «نشنیدم» (ok:null)، نه «ناهم‌زمان». */
  let sync = null;
  try {
    const sayOf = {};
    for (const x of scenes) if (x.say) sayOf[x.n] = x.say;
    const pts = r.tl.filter(x => sayOf[x.n]).map(x => ({ n: x.n, t0: x.t0, say: sayOf[x.n] }));
    if (process.env.GITHUB_ACTIONS !== 'true' && process.env.AVSYNC !== '1') {
      sync = { ok: null, why: 'بیرون از اکشن شنیده نشد' };
    } else if (pts.length >= 3) {
      const sf = path.join(dir, 'avsync.json');
      fs.writeFileSync(sf, JSON.stringify(pts));
      stage('شنیدنِ هم‌زمانی (avsync)');
      const res = execFileSync('python3', [path.join(__dirname, 'avsync.py'), dest, sf, String(durSec)],
                               { encoding: 'utf8', timeout: 8 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
      sync = JSON.parse(String(res).trim().split('\n').pop());
    } else {
      sync = { ok: null, why: 'گفتارِ صحنه‌ها همراهِ درخواست نبود' };
    }
  } catch (eS) {
    sync = { ok: null, why: 'شنیدن نشد: ' + String(eS.message).split('\n')[0].slice(0, 90) };
  }
  qa.sync = sync;

  // کاورِ بندانگشتی از نقاشیِ خودِ درس
  let thumb = '', artFile = '';
  try {
    let src = '';
    if (it.sceneCover && it.sceneCover.url) {
      const cf = path.join(dir, 'coverscene');
      fetchTo(it.sceneCover.url, cf);
      const k = sniffKind(cf);
      if (k === 'png' || k === 'jpeg') src = cf;
    }
    if (!src) src = r.tl.length ? r.tl[0].img : '';
    if (src) {
      const cj = path.join(dir, 'cover1280.jpg');
      ff(['-i', src, '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
          '-q:v', '3', '-frames:v', '1', cj]);
      const data = 'data:image/jpeg;base64,' + fs.readFileSync(cj).toString('base64');
      const png = SKIT.shoot(exe, SKIT.coverHtml(data, it), path.join(dir, 'thumb.png'), 1280, 720, ff);
      const tj = path.join(dir, 'thumb.jpg');
      ff(['-i', png, '-q:v', '3', '-frames:v', '1', tj]);
      if (sniffKind(tj) === 'jpeg' && fs.statSync(tj).size < 2 * 1024 * 1024) thumb = tj;
      /* نقاشیِ همین درس، مربع و بی نوشته — پس‌زمینهٔ کاورِ پلی‌لیستِ مجموعه (۸.۵۵).
         فقط برای ردیفی که کلیدِ پلی‌لیست دارد؛ نقشه آن را یک بار برای هر مجموعه
         نگه می‌دارد، پس کاورِ پلی‌لیست با هر درس عوض نمی‌شود. */
      if (it.plKey) {
        try {
          const aj = path.join(dir, 'art1400.jpg');
          ff(['-i', src, '-vf', 'scale=1400:1400:force_original_aspect_ratio=increase,crop=1400:1400',
              '-q:v', '3', '-frames:v', '1', aj]);
          if (sniffKind(aj) === 'jpeg') artFile = aj;
        } catch (eA) { notes.push('نقاشیِ مربعِ مجموعه نشد: ' + String(eA.message).split('\n')[0].slice(0, 60)); }
      }
    }
  } catch (e) { notes.push('کاورِ صحنه‌ای نشد: ' + String(e.message).split('\n')[0].slice(0, 60)); }
  /* لحظه‌ها پس از سنجش: سنجش و شنیدنِ هم‌زمانی روی ویدئوی هم‌طولِ صوت است (زمانِ صحنه‌ها همان). */
  let mo = null;
  if (mp && placed.length && r.silent) {
    stage('لحظه‌ها: برش و لای‌گذاری');
    try { mo = spliceMoments(it, placed, mp, r.silent, wav, dest, dir, notes); }
    catch (eMo) { notes.push('لای‌گذاریِ لحظه‌ها نشد، ویدئو بی لحظه: ' + String(eMo.message).split('\n')[0].slice(0, 80)); }
  }
  const media = mp ? Object.assign({}, mp.stat, { moments: mo ? mo.stat : { asked: (it.moments || []).length, placed: placed.length, made: 0 } }) : null;
  return { media: media, inserts: mo ? mo.inserts : [],
           n: r.scenes, want: r.want, snapped: r.snapped, silences: r.silences,
           groups: r.groups, qa: qa, thumbFile: thumb, artFile: artFile, ov: r.ov, mv: r.mv || 0, clip: r.clip, xf: r.xf || null,
           refs: r.tl.filter(x => x.ref).length,     // صحنه‌هایی که سنجش «با نوشته» دیدشان
           logo: mark ? (mark.logo ? (mark.logoClean || 'خام') : 'بی تصویر') : 'بی نشان' };
}

function buildVideo(it, cover, wav, durSec, dest, dir) {
  const notes = [];
  /* صحنه‌های مصور از همه مقدم‌اند (۸.۳۱)؛ بعد مشخصاتِ برداری؛ بعد اسلایدها. */
  const sc = require('./scenekit.js').scenesOf(it);
  if (sc) {
    try {
      const r = buildScenesVideo(it, sc, wav, durSec, dest, dir, notes);
      return Object.assign({ mode: it.media ? 'media' : 'scenes', notes: notes }, r);
    } catch (e) {
      notes.push('صحنه‌ها نشد، مسیرِ بعدی: ' + String(e.message).split('\n')[0].slice(0, 90));
    }
  }
  /* مشخصاتِ تصویری از همه مقدم است؛ نبودش یعنی موتورِ قدیم، و آن مسیر
     دست‌نخورده می‌مانَد. */
  const spec = specOf(it);
  if (spec) {
    try {
      const r = buildSpecVideo(spec, wav, durSec, dest, dir, notes);
      return { mode: 'cards', n: r.beats, cards: r.cards, bgs: r.bgs, marks: r.marks, notes: notes };
    } catch (e) {
      notes.push('کشیدنِ کارت‌ها نشد، مسیرِ قدیم: ' +
                 String(e.message).split('\n')[0].slice(0, 90));
    }
  }
  const vis = visualsOf(it);
  if (!vis.length) return { mode: 'cover', notes: notes };

  const files = [], kept = [];
  for (let i = 0; i < vis.length; i++) {
    const f = path.join(dir, 'i' + String(i).padStart(3, '0'));
    try {
      fetchTo(vis[i].url, f);
      const k = sniffKind(f);
      if (!k) { notes.push('تصویرِ ' + (i + 1) + ': بایت‌ها تصویر نبود'); continue; }
      files.push(f); kept.push(vis[i]);
    } catch (e) {
      notes.push('تصویرِ ' + (i + 1) + ': ' + String(e.message).split('\n')[0].slice(0, 60));
    }
  }
  if (files.length < 2) {
    notes.push('کمتر از دو تصویر ماند — کاورِ تک‌تصویری');
    return { mode: 'cover', notes: notes };
  }

  const tl = timelineOf(kept, durSec);
  try {
    const r = buildSlideshow(files.slice(0, tl.length), tl, wav, durSec, dest, dir);
    return { mode: 'slides', n: tl.length, groups: r.groups, vmax: r.vmax,
             notes: notes };
  } catch (e) {
    notes.push('ساختِ اسلایدشو نشد، کاور گذاشته شد: ' +
               String(e.message).split('\n')[0].slice(0, 80));
    return { mode: 'cover', notes: notes };
  }
}

/* ══ نگه‌داشتنِ یک درخواستِ مشخص، نه یک قسمت ══
 * ۳ اکتبر، درسِ ۵۹: درخواست با سه کارت نوشته شده بود و صاحبِ برنامه خواست
 * ویدئو یک روز صبر کند تا موتور با نسخهٔ تازه از نو بسازدش. یوتیوب ویدئوی
 * منتشرشده را عوض نمی‌کند، پس «امروز بد» برنگشتنی است و «فردا درست» نه.
 *
 * نگه‌داشتن به **همان ردیف** بسته است، نه به کلید: `at` ثبت می‌شود و وقتی
 * موتور ردیف را بازنویسی کند (`at` تازه)، نگه‌داشتن خودش بی‌اثر می‌شود و
 * درخواستِ تازه همان اجرا ساخته می‌شود — کسی لازم نیست چیزی را باز کند.
 * و **سقف دارد** (`until`): نگه‌داشتنی که موتور هرگز جوابش را ندهد، پس از
 * آن با همان درخواستِ قبلی می‌رود. ویدئوی ساده از ویدئوی نیامده بهتر است. */
const HOLD_FILE = path.join(__dirname, '..', 'docs', 'render-hold.json');
function readHold() {
  try {
    const d = JSON.parse(fs.readFileSync(HOLD_FILE, 'utf8'));
    return (d && d.items && typeof d.items === 'object') ? d.items : {};
  } catch (e) { return {}; }
}
/** دلیلِ نگه‌داشتن، یا '' اگر نگه داشته نمی‌شود. */
function heldNow(it, hold, now) {
  const h = (hold || {})[String((it || {}).key || '')];
  if (!h) return '';
  if (h.at && String(h.at) !== String(it.at || '')) return '';      // ردیف بازنویسی شده
  /* «فقط کارت» (۸.۳۱): نگه‌داشتنی که برای ماندنِ ردیفِ کارتی تا رسیدنِ صحنه‌ها
     گذاشته شده، خودِ صحنه‌ها را نگه نمی‌دارد. */
  if (h.cardsOnly && String(it.mode || '') === 'scenes') return '';
  const until = Date.parse(String(h.until || ''));
  if (!isFinite(until) || (now || new Date()).getTime() >= until) return '';
  return String(h.why || 'نگه‌داشته') + ' (تا ' + new Date(until).toISOString().slice(0, 16) + 'Z)';
}

/* ── کاورِ مربعِ پلی‌لیست (۸.۵۵) ──────────────────────────────────────────
 * موتور در `_YT-RENDER.json` فهرستِ `plCovers` می‌گذارد؛ این‌جا هر کدام که امضایش
 * با نقشه نمی‌خوانَد کشیده می‌شود. امضای نقشه = امضای درخواست + نقاشیِ مجموعه
 * (اگر هست)، پس رسیدنِ نقاشی کاور را یک بار از نو می‌سازد و بعد دیگر نه.
 */
/* ══ نامِ فارسی همه را یکی می‌کرد (۸.۶۸) ══ هر نویسهٔ غیرِلاتین «-» می‌شد، پس «series:معرفت شناسی …»
   و هر مجموعهٔ فارسیِ دیگری همه «pl-series.jpg» بودند و هر کاور کاورِ قبلی را رونویسی می‌کرد. کلیدی که
   نویسهٔ غیرِلاتین دارد چند رقم از اثرِ انگشتِ خودش را می‌گیرد؛ کلیدهای لاتین همان نامِ قبلی را دارند. */
function slugOf(k) {
  const s = String(k || '');
  const base = s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
  if (!/[^\x00-\x7F]/.test(s)) return base;
  return base + '-' + require('crypto').createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 10);
}

const PL_COVER_DRAW = 'f2';   // ۸.۶۸: قاب به بدنه دوخته شد — هر کاورِ کشیده‌شده یک بار از نو

function plCoverSig(pc, map) {
  const art = (map.art || {})[pc.key];
  return String(pc.sig || '') + (art && art.from ? '|' + art.from : '') + '|' + PL_COVER_DRAW;
}

/** کدام کاورهای پلی‌لیست کشیدن می‌خواهند. یک تعریف برای پروب و برای کار. */
function plCoversTodo(queue, map) {
  const list = Array.isArray(queue && queue.plCovers) ? queue.plCovers : [];
  const have = map.plCovers || {};
  return list.filter(pc => pc && pc.key && pc.sig &&
                     String((have[pc.key] || {}).sig || '') !== plCoverSig(pc, map));
}

function buildPlCovers(todo, map, tmp) {
  if (!todo.length) return 0;
  const SKIT = require('./scenekit.js');
  const CK = require('./cardkit/index.js');
  const exe = CK.chromeExe();
  let rel = null, n = 0;
  for (const pc of todo) {
    const dir = fs.mkdtempSync(path.join(tmp, 'pl-'));
    try {
      let artData = '';
      const art = (map.art || {})[pc.key];
      if (art && art.url) {
        try {
          const af = path.join(dir, 'art');
          fetchTo(art.url, af);
          if (sniffKind(af) === 'jpeg') artData = 'data:image/jpeg;base64,' + fs.readFileSync(af).toString('base64');
          else if (sniffKind(af) === 'png') artData = 'data:image/png;base64,' + fs.readFileSync(af).toString('base64');
        } catch (eA) { log('  نقاشیِ ' + pc.key + ' نیامد — کاورِ رنگی: ' + String(eA.message).split('\n')[0]); }
      }
      const png = SKIT.shoot(exe, SKIT.plCoverHtml(pc, artData), path.join(dir, 'pl.png'), 1400, 1400, ff);
      const jpg = path.join(dir, 'pl.jpg');
      ff(['-i', png, '-q:v', '3', '-frames:v', '1', jpg]);
      if (sniffKind(jpg) !== 'jpeg') throw new Error('JPEG ساخته نشد');
      const size = fs.statSync(jpg).size;
      if (size > 2 * 1024 * 1024) throw new Error('کاور ' + Math.round(size / 1024) + ' کیلوبایت است');
      if (!rel) rel = ensureRelease();
      const url = uploadAsset(rel, jpg, 'pl-' + slugOf(pc.key) + '.jpg', 'image/jpeg');
      if (!url) throw new Error('نشانی برنگشت');
      map.plCovers = map.plCovers || {};
      map.plCovers[pc.key] = { url: url, req: String(pc.sig), sig: plCoverSig(pc, map), w: 1400, h: 1400,
                               art: !!artData, at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
      rel = JSON.parse(gh(['https://api.github.com/repos/' + REPO + '/releases/tags/' + TAG]));
      n++;
      log('  ✔ کاورِ مربعِ پلی‌لیست ' + pc.key + (artData ? ' (با نقاشیِ مجموعه)' : ' (رنگیِ سبکِ مجموعه)'));
    } catch (e) {
      log('  ✗ کاورِ مربعِ پلی‌لیست ' + pc.key + ' — ' + e.message);
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  }
  return n;
}

/* ── بنرِ کانال (۸.۸۸) ──────────────────────────────────────────────────
 * همان راهِ کاورِ مربع: موتور `banner` را در `_YT-RENDER.json` می‌گذارد، این‌جا
 * ۲۵۶۰×۱۴۴۰ کشیده می‌شود و نشانی در `docs/renders.json` (`banner`) می‌نشیند.
 * موتور فقط وقتی برش می‌دارد که `req` با امضای درخواستِ خودش بخوانَد.
 */
const BANNER_DRAW = 'b1';

function bannerTodo(queue, map) {
  const bn = queue && queue.banner;
  if (!bn || !bn.sig) return null;
  const have = map.banner || {};
  return String(have.sig || '') === String(bn.sig) + '|' + BANNER_DRAW ? null : bn;
}

function buildBanner(bn, map, tmp) {
  if (!bn) return 0;
  const SKIT = require('./scenekit.js');
  const CK = require('./cardkit/index.js');
  const dir = fs.mkdtempSync(path.join(tmp, 'bn-'));
  try {
    const png = SKIT.shoot(CK.chromeExe(), SKIT.bannerHtml(bn), path.join(dir, 'bn.png'), 2560, 1440, ff);
    const jpg = path.join(dir, 'bn.jpg');
    ff(['-i', png, '-q:v', '2', '-frames:v', '1', jpg]);
    if (sniffKind(jpg) !== 'jpeg') throw new Error('JPEG ساخته نشد');
    const size = fs.statSync(jpg).size;
    if (size > 6 * 1024 * 1024) throw new Error('بنر ' + Math.round(size / 1024) + ' کیلوبایت است (سقفِ یوتیوب ۶ مگ)');
    const url = uploadAsset(ensureRelease(), jpg, 'channel-banner-' + slugOf(bn.sig) + '.jpg', 'image/jpeg');
    if (!url) throw new Error('نشانی برنگشت');
    map.banner = { url: url, req: String(bn.sig), sig: String(bn.sig) + '|' + BANNER_DRAW, w: 2560, h: 1440,
                   at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    log('  ✔ بنرِ کانال ۲۵۶۰×۱۴۴۰');
    return 1;
  } catch (e) {
    log('  ✗ بنرِ کانال — ' + e.message);
    return 0;
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }
}

/* ── ریلزِ اینستاگرام (۹.۲۱) ──────────────────────────────────────────────
 * همان راهِ کاورِ پلی‌لیست: موتور فهرستِ `reels` را در `_YT-RENDER.json` می‌گذارد (صدا، تصویرها، جمله‌ها با زمان)،
 * این‌جا با `reelkit` کشیده می‌شود و نشانیِ MP4 و کاورش در `docs/renders.json` (`reels`) می‌نشیند. جدا از `items`
 * عمداً: سقفِ صفِ یوتیوب و هشدارِ «درخواستِ مانده»اش نباید با ریلز پر یا روشن شود.
 */
const REEL_MAX_PER_RUN = 4;
function reelsTodo(queue, map) {
  const list = Array.isArray(queue && queue.reels) ? queue.reels : [];
  const have = map.reels || {};
  return list.filter(r => r && r.key && r.sig && r.audio && r.audio.url &&
                     String((have[r.key] || {}).sig || '') !== String(r.sig));
}

function buildReels(todo, map, tmp) {
  if (!todo.length) return 0;
  const RKIT = require('./reelkit.js');
  const SKIT = require('./scenekit.js');
  const CK = require('./cardkit/index.js');
  const MKIT = require('./mediakit.js');
  const exe = CK.chromeExe();
  let rel = null, n = 0;
  for (const r of todo.slice(0, REEL_MAX_PER_RUN)) {
    const dir = fs.mkdtempSync(path.join(tmp, 'reel-'));
    try {
      const wav = path.join(dir, 'a.wav');
      fetchTo(r.audio.url, wav);
      if (!isWav(wav)) throw new Error('صدای ریلز واقعاً WAV نیست — شاید اشتراکش باز نیست');
      const imgs = (r.imgs || []).map((im, i) => {
        if (!im || !im.url) return null;
        try {
          const f = path.join(dir, 'img' + i);
          fetchTo(im.url, f);
          const k = sniffKind(f);
          if (k !== 'png' && k !== 'jpeg') return null;
          const pr = MKIT.probe(ffmpegExe(), f) || {};
          return { file: f, w: Number(pr.w) || 0, h: Number(pr.h) || 0 };
        } catch (eI) { return null; }
      });
      let logo = '';
      try { if (r.mark && r.mark.logoUrl) logo = CK.logoClean(r.mark.logoUrl, dir, ffmpegExe()).data; } catch (eL) { logo = ''; }
      const out = path.join(dir, 'reel.mp4');
      const res = RKIT.build(r, { wav: wav, dur: wavSeconds(wav), imgs: imgs, mark: { logo: logo }, dir: dir, ff: ff,
        shoot: (html, png, w, h) => SKIT.shoot(exe, html, png, w, h, ff) }, out);
      const size = fs.statSync(out).size;
      if (size < 20000) throw new Error('MP4ِ ریلز بسیار کوچک درآمد (' + size + ' بایت)');
      if (!rel) rel = ensureRelease();
      const slug = 'reel-' + slugOf(r.key);
      const url = uploadAsset(rel, out, slug + '.mp4');
      const cover = uploadAsset(rel, res.cover, slug + '-cover.jpg', 'image/jpeg');
      if (!url || !cover) throw new Error('نشانیِ فایلِ آپلودشده برنگشت');
      map.reels = map.reels || {};
      map.reels[r.key] = { url: url, cover: cover, sig: String(r.sig), seconds: res.seconds, bytes: size,
                           imgs: imgs.filter(Boolean).length, segs: res.segs, subs: res.subs,
                           at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
      rel = JSON.parse(gh(['https://api.github.com/repos/' + REPO + '/releases/tags/' + TAG]));
      n++;
      log('  ✔ ریلزِ ' + r.key + ' — ' + res.seconds + ' ثانیه، ' + res.segs + ' تصویر/تکه، ' + Math.round(size / 1048576) + ' مگ');
    } catch (e) {
      log('  ✗ ریلزِ ' + r.key + ' — ' + String(e.message).split('\n')[0]);
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  }
  return n;
}

/* ── شناسهٔ کانال، امروزی (۸.۹۰) ──
 * نشانِ هر ردیف همان شناسه‌ای را دارد که روزِ درخواست بود. صاحبِ برنامه «@truce-trace» را به
 * «@truth_trace1» برد؛ ردیف‌های در صف هنوز قدیمی را می‌بردند. `markHandle`ِ صف، که موتور هر بار
 * می‌نویسد، بر نشانِ هر ردیف (و مشخصاتِ کارت‌هایش) می‌نشیند. برمی‌گرداند چند ردیف عوض شد. */
function brandMark(queue) {
  const h = String((queue && queue.markHandle) || '').trim();
  if (!/^@[A-Za-z0-9._-]{3,}$/.test(h)) return 0;
  let n = 0;
  for (const it of (Array.isArray(queue.items) ? queue.items : [])) {
    for (const m of [it && it.mark, it && it.spec && it.spec.mark]) {
      if (m && m.handle && m.handle !== h) { m.handle = h; n++; }
    }
  }
  return n;
}

/** پاسخِ پروب: «کاری هست» = ویدئوی ساخته‌نشده یا کاورِ پلی‌لیستِ کشیده‌نشده. */
function probeWork(queue, map, hold, now) {
  return (itemsTodo(queue, map, hold, now).todo.length || plCoversTodo(queue, map).length || reelsTodo(queue, map).length ||
          bannerTodo(queue, map)) ? '1' : '0';
}

/** ردیف‌های ساخته‌نشده و نگه‌داشته‌نشده — یک تعریف برای پروب و برای کار. */
/* ══ جایگزینی (۸.۵۷) ══ ویدئوی منتشرشده‌ای که صاحبِ برنامه خواست از نو ساخته شود، همان
   کلید را دارد و نقشه برایش نشانیِ ویدئوی قبلی را. ردیفِ دارای `replace` فقط وقتی «ساخته‌شده»
   است که ردیفِ نقشه همان `replace` را داشته باشد — همان تعریفِ `ytRenderBuilt_` در موتور. */
function builtFor(x, map) {
  const m = map.items[x.key];
  if (!m) return false;
  if (x.replace && String(m.replace || '') !== String(x.replace)) return false;
  return true;
}

function itemsTodo(queue, map, hold, now) {
  const items = Array.isArray(queue && queue.items) ? queue.items : [];
  const ready = items.filter(x => String(x.status || '') === 'در انتظار' && !builtFor(x, map));
  const todo = ready.filter(x => !heldNow(x, hold, now));
  return { items: items, ready: ready, todo: todo };
}

/* ── کار ────────────────────────────────────────────────────────────────── */

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
  const qFile = path.join(tmp, 'queue.json');

  /* ══ چیزی که فقط اجرای واقعی نشانش داد ══
     گوگل برای فایلی که به‌اشتراک گذاشته نشده **۲۰۰ برمی‌گرداند**، با یک
     صفحهٔ HTMLی ورود — نه ۴۰۳ و نه هیچ خطایی. پس «curl موفق شد» چیزی دربارهٔ
     دسترسی نمی‌گوید؛ تنها سنجهٔ درست این است که بدنه واقعاً JSON باشد. همان
     قاعدهٔ musicFetch_ در این ریپو: بایت‌ها را باور کن، نه کدِ وضعیت را.

     و هر دو حالت یک معنا دارند — «هنوز نمی‌شود خواندش» — که در ساعت‌های اولِ
     پس از یک نسخهٔ تازه کاملاً عادی است و خودش درمان می‌شود. هر ساعت قرمزشدن
     برایش، همان هشداری است که آدم یاد می‌گیرد نبیند. اگر واقعاً برنگشت،
     زنگِ خطر جای دیگری است و باید هم آن‌جا باشد: YT_STUCK_DAYS و
     ytQueueIdOk_ در خودِ موتور. */
  let queue = null, why = '';
  try {
    fetchTo(dlUrl(QUEUE_ID), qFile);
    const raw = fs.readFileSync(qFile, 'utf8');
    try { queue = JSON.parse(raw); }
    catch (e) {
      why = /^\s*</.test(raw)
        ? 'به‌جای فایل، صفحهٔ HTMLی گوگل رسید — یعنی هنوز «هرکس با لینک» نیست'
        : 'بدنه JSON نبود: ' + raw.slice(0, 60).replace(/\s+/g, ' ');
    }
  } catch (e) { why = 'دانلود نشد: ' + String(e.message).split('\n')[0]; }

  if (!queue) {
    log('صف هنوز خواندنی نیست — ' + why + '.');
    log('موتور در اولین اجرای شبانه بازش می‌کند. QUEUE_ID = ' + QUEUE_ID);
    return;
  }
  const nMark = brandMark(queue);
  if (nMark) log('شناسهٔ کانال روی ' + nMark + ' ردیف به ' + queue.markHandle + ' به‌روز شد.');
  const map = readMap();

  const hold = readHold();
  const T = itemsTodo(queue, map, hold, new Date());
  const items = T.items, ready = T.ready, todo = T.todo;
  for (const x of ready) {
    const h = heldNow(x, hold, new Date());
    if (h) log('نگه داشته شد: ' + x.key + ' — ' + h);
  }
  const plTodo = plCoversTodo(queue, map);
  log('صف: ' + items.length + ' ردیف، ' + todo.length + ' تای ساخته‌نشده' +
      (ready.length > todo.length ? ' (' + (ready.length - todo.length) + ' نگه داشته)' : '') +
      (plTodo.length ? ' · ' + plTodo.length + ' کاورِ مربعِ پلی‌لیست' : '') + '.');
  /* ══ پروب (۸.۵۵) ══
     گیت‌هاب کرانِ «هر ساعت» را عملاً هر ۳ تا ۹ ساعت اجرا کرد؛ ویدئوی درسِ ۴۰
     از ۱۳:۲۹ تا ۱۴:۳۷ منتظر ماند تا دستی راه افتاد. کران حالا هر ده دقیقه است،
     و هر اجرای بی‌کار فقط همین خواندنِ صف را می‌کند: ffmpeg و قلم و کروم فقط
     وقتی کاری هست نصب می‌شوند. «کاری هست» همان دو تعریفِ بالاست — پروب و کار
     از یک تابع می‌پرسند، وگرنه روزی یکی «نه» می‌گوید و دیگری کار دارد (۷.۷۸). */
  if (process.argv.indexOf('--probe') !== -1) {
    const work = probeWork(queue, map, hold, new Date());
    log('پروب: ' + (work === '1' ? 'کار هست' : 'کاری نیست') + '.');
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'work=' + work + '\n');
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
    return;
  }
  const rlTodo = reelsTodo(queue, map);
  if (rlTodo.length) log('ریلزِ اینستاگرام: ' + rlTodo.length + ' تا در صف.');
  if (!todo.length && !plTodo.length && !bannerTodo(queue, map) && !rlTodo.length) { log('کاری نیست.'); return; }

  let rel = null, made = 0;
  const runT0 = Date.now();
  for (const it of todo) {
    if (made >= MAX_PER_RUN) { log('سقفِ این اجرا پر شد؛ بقیه دفعهٔ بعد.'); break; }
    /* ویدئوی صحنه‌ای ~۱٫۲ برابرِ مدتش زمان می‌برد (سنجیده روی همین کانتینر)؛
       سه درسِ پانزده‌دقیقه‌ای از سقفِ ۵۰ دقیقه‌ایِ کار می‌گذرد و کارِ کشته‌شده
       هیچ خروجی‌ای نمی‌دهد. پس پس از ۲۵ دقیقه، بقیه دفعهٔ بعد. */
    if (made && Date.now() - runT0 > 25 * 60 * 1000) { log('وقتِ این اجرا رو به پایان است؛ بقیه دفعهٔ بعد.'); break; }
    const dir = fs.mkdtempSync(path.join(tmp, 'ep-'));
    try {
      const audio = Array.isArray(it.audio) ? it.audio : [];
      if (!audio.length) throw new Error('هیچ صوتی در ردیف نیست');

      const wavs = [];
      for (let i = 0; i < audio.length; i++) {
        const u = audio[i].url || dlUrl(audio[i].id);
        const f = path.join(dir, 'a' + String(i).padStart(3, '0') + '.wav');
        const n = fetchTo(u, f);
        if (!isWav(f)) throw new Error('بخشِ ' + (i + 1) + ' واقعاً WAV نیست (' + n + ' بایت) — ' +
                                       'شاید اشتراکش برداشته شده باشد');
        wavs.push(f);
      }

      const cover = path.join(dir, 'cover.png');
      let haveCover = false;
      if (it.coverUrl || it.coverFileId) {
        try {
          fetchTo(it.coverUrl || dlUrl(it.coverFileId), cover);
          haveCover = isPng(cover);
        } catch (e) { haveCover = false; }
      }
      if (!haveCover) {
        // بی کاور هم ویدئو ساخته می‌شود؛ نبودِ تصویر نباید یک قسمت را زمین بگذارد
        ff(['-f', 'lavfi', '-i', 'color=c=0x101820:s=1280x720:d=1', '-frames:v', '1', cover]);
        log('  کاور نیامد — پس‌زمینهٔ ساده گذاشته شد.');
      }

      const joined = path.join(dir, 'all.wav');
      joinWavs(wavs, joined, dir);
      const out = path.join(dir, 'out.mp4');
      log('• ' + it.key + ' — ' + wavs.length + ' بخش، ' + (it.audioKind || '') + ' …');

      /* مدتِ **سنجیده‌شدهٔ** صوت، از خودِ فایل. زمان‌بندیِ تصویرها رویش
         مقیاس می‌شود، نه روی عددی که موتور حدس زده — وگرنه شکاف یا سرریز. */
      const durSec = wavSeconds(joined);
      const vr = buildVideo(it, cover, joined, durSec, out, dir);
      if (vr.mode === 'cover') makeMp4(cover, joined, out);
      for (const nt of (vr.notes || [])) log('    · ' + nt);

      const size = fs.statSync(out).size;
      if (size < 5000) throw new Error('MP4 بسیار کوچک درآمد (' + size + ' بایت)');
      /* سقفِ ۵۰ مگابایتِ Apps Script: اگر رد شد، موتور نمی‌تواند برش دارد.
         خودش می‌گوید «با نرخِ کمتر رندر شود»، ولی این‌جا گفتنش زودتر و
         با عددِ واقعی است. */
      if (size > 49 * 1024 * 1024) {
        log('    · ⚠ ' + Math.round(size / 1048576) + ' مگابایت — از سقفِ ۵۰ ' +
            'مگابایتِ موتور می‌گذرد');
      }

      if (!rel) rel = ensureRelease();
      const base = String(it.key).replace(/[^A-Za-z0-9]+/g, '-');
      const name = base + '.mp4';
      const url = uploadAsset(rel, out, name);
      if (!url) throw new Error('نشانیِ فایلِ آپلودشده برنگشت');

      map.items[it.key] = { url: url, bytes: size, parts: wavs.length,
                            at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
      if (it.replace) map.items[it.key].replace = String(it.replace);
      /* فیلدهای تازه **فقط وقتی اسلاید ساخته شده** نوشته می‌شوند. ردیفی که
         کاورِ تک‌تصویری گرفته، عیناً همان شکلِ امروز را دارد — یعنی موتورِ
         امروز هم می‌تواند بخوانَدش. */
      if (vr.mode === 'slides') {
        map.items[it.key].visuals = vr.n;
        map.items[it.key].seconds = Math.round(durSec);
      }
      /* ══ و کارت‌های برداری هم شاهد دارند (۸.۲۶) ══
         تا امروز این مسیر هیچ ردی در نقشه نمی‌گذاشت و سیاهه‌اش «کاورِ
         تک‌تصویری» می‌نوشت — یعنی روزی که کارت‌ها واقعاً ساخته شوند، از بیرون
         با ویدئوی تک‌قاب یک شکل بود. `mode` برای همین است. */
      if (vr.mode === 'cards') {
        map.items[it.key].mode = 'cards';
        map.items[it.key].cards = vr.cards;
        map.items[it.key].beats = vr.n;
        map.items[it.key].bgs = vr.bgs || 0;
        map.items[it.key].seconds = Math.round(durSec);
      }
      /* ══ صحنه‌ها و سنجشِ ویدئو (۸.۳۱) ══
         `qa` همان چیزی است که موتور پیش از عمومی‌کردن می‌پرسد: هر صحنه از
         خودِ فایل سرِ جایش دیده شد؟ قابِ خالی نبود؟ */
      if (vr.mode === 'scenes' || vr.mode === 'media') {
        map.items[it.key].mode = vr.mode;
        /* رسانه‌های منبع (۸.۹۶): چند کلیپ و عکس، چند برش از جای عبارت، و لحظه‌ها — و `inserts` که
           موتور با آن زمانِ فصل‌های توضیح را جلو می‌بَرد. */
        if (vr.media) map.items[it.key].media = vr.media;
        if (vr.inserts && vr.inserts.length) map.items[it.key].inserts = vr.inserts;
        map.items[it.key].scenes = vr.n;
        map.items[it.key].want = vr.want;
        map.items[it.key].snapped = vr.snapped;
        map.items[it.key].seconds = Math.round(durSec);
        map.items[it.key].qa = vr.qa;
        // نوشته‌های رویِ نقاشی: چند خواسته شد، چند نشست، چند جای خالی نداشت (۸.۴۵)
        /* همیشه، حتی صفر (۸.۵۶): «هیچ کارتی خواسته نشد» خودش خبر است و موتور کفش را می‌سنجد. */
        map.items[it.key].ov = vr.ov || { asked: 0, placed: 0, busy: 0, failed: 0, kinds: {} };
        if (vr.logo) map.items[it.key].logo = vr.logo;
        /* حرکتِ معنادار و کلیپِ آغاز (۸.۵۱): چند صحنه حرکتِ کانون‌دار گرفت، و کلیپ
           خواسته شد / نشست / چرا نه — تا «ساختیم» از «دیده شد» جدا بماند. */
        if (vr.mv) map.items[it.key].mv = vr.mv;
        if (vr.clip && vr.clip.asked) map.items[it.key].clip = vr.clip;
        if (vr.xf) map.items[it.key].xf = vr.xf;          // گذارهای به‌کاررفته (۸.۵۶) — شاهدِ «فقط محو» نبودن
        if (vr.thumbFile) {
          try {
            const tu = uploadAsset(rel, vr.thumbFile, base + '-cover.jpg', 'image/jpeg');
            if (tu) map.items[it.key].thumb = tu;
          } catch (eT) { (vr.notes = vr.notes || []).push('کاور بالا نرفت: ' + String(eT.message).slice(0, 60)); }
        }
        if (vr.artFile && it.plKey && !(map.art && map.art[it.plKey])) {
          try {
            const au = uploadAsset(rel, vr.artFile, 'art-' + slugOf(it.plKey) + '.jpg', 'image/jpeg');
            if (au) {
              map.art = map.art || {};
              map.art[it.plKey] = { url: au, from: it.key,
                                    at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
            }
          } catch (eAr) { (vr.notes = vr.notes || []).push('نقاشیِ مجموعه بالا نرفت: ' + String(eAr.message).slice(0, 60)); }
        }
      }
      if ((vr.notes || []).length) map.items[it.key].notes = vr.notes.slice(0, 6);
      made++;
      log('  ✔ ' + name + ' — ' + Math.round(size / 1048576) + ' مگابایت' +
          (vr.mode === 'slides' ? ' · ' + vr.n + ' تصویر در ' + vr.groups + ' دسته'
            : vr.mode === 'cards' ? ' · ' + vr.cards + ' کارتِ برداری، ' + vr.n + ' ضرب' +
                                    (vr.bgs ? '، ' + vr.bgs + ' با تصویرِ ساخته‌شده' : '')
            : (vr.mode === 'scenes' || vr.mode === 'media') ? ' · ' + vr.n + (vr.mode === 'media' ? ' صحنهٔ رسانهٔ منبع (' : ' صحنهٔ مصور (') + vr.snapped + ' مرز روی مکث) · سنجش: ' +
                                     (vr.qa && vr.qa.ok ? '✔ ' + vr.qa.matched + '/' + vr.qa.n
                                                         : '✗ ' + ((vr.qa && vr.qa.why) || ''))
            : ' · کاورِ تک‌تصویری'));
      rel = JSON.parse(gh(['https://api.github.com/repos/' + REPO + '/releases/tags/' + TAG]));
    } catch (e) {
      // یک ردیفِ خراب نباید بقیه را زمین بگذارد — ولی بی‌صدا هم رد نمی‌شود
      log('  ✗ ' + it.key + ' — ' + e.message);
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  /* کاورهای مربعِ پلی‌لیست پس از ویدئوها: اگر ویدئوی این اجرا نقاشیِ تازه‌ای برای
     مجموعه آورد، کاورِ پلی‌لیست همین اجرا با آن ساخته می‌شود، نه اجرای بعد. */
  let plMade = 0;
  try { plMade = buildPlCovers(plCoversTodo(queue, map), map, tmp); }
  catch (ePl) { log('کاورهای پلی‌لیست: ' + String(ePl.message).split('\n')[0]); }
  let bnMade = 0;
  try { bnMade = buildBanner(bannerTodo(queue, map), map, tmp); }
  catch (eBn) { log('بنرِ کانال: ' + String(eBn.message).split('\n')[0]); }
  let rlMade = 0;
  try { rlMade = buildReels(rlTodo, map, tmp); }
  catch (eRl) { log('ریلزِ اینستاگرام: ' + String(eRl.message).split('\n')[0]); }
  if (made || plMade || bnMade || rlMade) writeMap(map);
  log('ساخته شد: ' + made + ' از ' + Math.min(todo.length, MAX_PER_RUN) + ' تلاش' +
      (plMade ? ' · ' + plMade + ' کاورِ پلی‌لیست' : ''));
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

  /* ══ یک اجرای سبزِ بی‌محصول، بدترین حالت است ══
   * وقتی کاری برای انجام بود و **هیچ‌کدام** نشد، ایراد از یک قسمتِ خراب
   * نیست؛ از کلِ محیط است (همان ENOENTِ ffmpeg). آن باید قرمز شود تا دیده
   * شود. ولی یک قسمتِ خرابِ تنها نباید هفته‌ها اکشن را قرمز نگه دارد —
   * هشدارِ همیشه‌قرمز همان هشداری است که آدم یاد می‌گیرد نبیند. */
  if (todo.length && made === 0 && !plMade && !bnMade && !rlMade) {
    log('هیچ ویدئویی ساخته نشد در حالی که ' + todo.length + ' تا در صف بود.');
    process.exitCode = 1;
  }
}

/* ── قابلِ آزمون بودن ─────────────────────────────────────────────────────
 * تا امروز پایینِ این فایل یک `main();` خالی بود، پس `require` کردنش کلِ
 * کار را راه می‌انداخت و **هیچ سنجهٔ رفتاری‌ای نمی‌شد برایش نوشت**. این
 * فایل هر ویدئویی که منتشر می‌شود را می‌سازد؛ بی‌آزمون بودنش همان شکلی
 * است که این ریپو بارها بهایش را داده.
 */
if (require.main === module) main();

module.exports = {
  isWav, isPng, sniffKind, wavSeconds, ffmpegExe, makeMp4,
  vmaxFor, timelineOf, visualsOf, buildSlideshow, buildVideo,
  specOf, buildSpecVideo, specBackdrops, visFilter, heldNow, readHold, buildScenesVideo, prepMedia, spliceMoments,
  momentSize, plCoversTodo, plCoverSig, buildPlCovers, bannerTodo, buildBanner, brandMark, itemsTodo, slugOf, probeWork, builtFor,
  reelsTodo, buildReels
};
