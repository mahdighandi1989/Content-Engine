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

function uploadAsset(rel, file, name) {
  // نامِ تکراری اول پاک می‌شود، وگرنه گیت‌هاب ۴۲۲ می‌دهد و اسمِ فایل را عوض می‌کند
  for (const a of (rel.assets || [])) {
    if (a.name === name) {
      try { gh(['-X', 'DELETE', 'https://api.github.com/repos/' + REPO + '/releases/assets/' + a.id]); }
      catch (e) {}
    }
  }
  const res = JSON.parse(gh([
    '-X', 'POST', '-H', 'Content-Type: video/mp4',
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
    const z = (g % 2 === 0)
      ? 'min(1+' + (0.18 / N).toFixed(6) + '*on,1.18)'
      : 'max(1.18-' + (0.18 / N).toFixed(6) + '*on,1.00)';
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
function buildVideo(it, cover, wav, durSec, dest, dir) {
  const notes = [];
  const vis = visualsOf(it);
  if (!vis.length) return { mode: 'cover', notes: [] };

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
  const items = Array.isArray(queue.items) ? queue.items : [];
  const map = readMap();

  const todo = items.filter(x => String(x.status || '') === 'در انتظار' && !map.items[x.key]);
  log('صف: ' + items.length + ' ردیف، ' + todo.length + ' تای ساخته‌نشده.');
  if (!todo.length) { log('کاری نیست.'); return; }

  let rel = null, made = 0;
  for (const it of todo) {
    if (made >= MAX_PER_RUN) { log('سقفِ این اجرا پر شد؛ بقیه دفعهٔ بعد.'); break; }
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
      /* فیلدهای تازه **فقط وقتی اسلاید ساخته شده** نوشته می‌شوند. ردیفی که
         کاورِ تک‌تصویری گرفته، عیناً همان شکلِ امروز را دارد — یعنی موتورِ
         امروز هم می‌تواند بخوانَدش. */
      if (vr.mode === 'slides') {
        map.items[it.key].visuals = vr.n;
        map.items[it.key].seconds = Math.round(durSec);
      }
      if ((vr.notes || []).length) map.items[it.key].notes = vr.notes.slice(0, 6);
      made++;
      log('  ✔ ' + name + ' — ' + Math.round(size / 1048576) + ' مگابایت' +
          (vr.mode === 'slides' ? ' · ' + vr.n + ' تصویر در ' + vr.groups + ' دسته'
                                : ' · کاورِ تک‌تصویری'));
      rel = JSON.parse(gh(['https://api.github.com/repos/' + REPO + '/releases/tags/' + TAG]));
    } catch (e) {
      // یک ردیفِ خراب نباید بقیه را زمین بگذارد — ولی بی‌صدا هم رد نمی‌شود
      log('  ✗ ' + it.key + ' — ' + e.message);
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  if (made) writeMap(map);
  log('ساخته شد: ' + made + ' از ' + Math.min(todo.length, MAX_PER_RUN) + ' تلاش');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

  /* ══ یک اجرای سبزِ بی‌محصول، بدترین حالت است ══
   * وقتی کاری برای انجام بود و **هیچ‌کدام** نشد، ایراد از یک قسمتِ خراب
   * نیست؛ از کلِ محیط است (همان ENOENTِ ffmpeg). آن باید قرمز شود تا دیده
   * شود. ولی یک قسمتِ خرابِ تنها نباید هفته‌ها اکشن را قرمز نگه دارد —
   * هشدارِ همیشه‌قرمز همان هشداری است که آدم یاد می‌گیرد نبیند. */
  if (todo.length && made === 0) {
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
  vmaxFor, timelineOf, visualsOf, buildSlideshow, buildVideo
};
