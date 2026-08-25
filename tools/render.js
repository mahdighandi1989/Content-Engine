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

function ff(args) { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y'].concat(args),
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

/** تصویرِ ثابت + صوت → MP4. */
function makeMp4(cover, wav, dest) {
  ff(['-loop', '1', '-framerate', '2', '-i', cover, '-i', wav,
      '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '2',
      '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,' +
             'pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-shortest', '-movflags', '+faststart', dest]);
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
      makeMp4(cover, joined, out);
      const size = fs.statSync(out).size;
      if (size < 5000) throw new Error('MP4 بسیار کوچک درآمد (' + size + ' بایت)');

      if (!rel) rel = ensureRelease();
      const name = String(it.key).replace(/[^A-Za-z0-9]+/g, '-') + '.mp4';
      const url = uploadAsset(rel, out, name);
      if (!url) throw new Error('نشانیِ فایلِ آپلودشده برنگشت');

      map.items[it.key] = { url: url, bytes: size, parts: wavs.length,
                            at: new Date().toISOString().slice(0, 16).replace('T', ' ') };
      made++;
      log('  ✔ ' + name + ' — ' + Math.round(size / 1048576) + ' مگابایت');
      rel = JSON.parse(gh(['https://api.github.com/repos/' + REPO + '/releases/tags/' + TAG]));
    } catch (e) {
      // یک ردیفِ خراب نباید بقیه را زمین بگذارد — ولی بی‌صدا هم رد نمی‌شود
      log('  ✗ ' + it.key + ' — ' + e.message);
    } finally {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  if (made) writeMap(map);
  log('ساخته شد: ' + made);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
}

main();
