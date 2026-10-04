/* scenekit — صحنه‌های مصورِ تمام‌صفحه، از ردیفِ صف به MP4 (۸.۳۱).
 *
 * ══ چرا این فایل هست ══
 * ۴ اکتبر، ویدئوی درسِ ۵۹: «فقط متن بود · نقاشی کو · متن‌ها می‌رفتن و
 * می‌اومدن و صدا اصلاً هماهنگ نبود». کارت‌های cardkit متن بودند و نقاشی زیرِ
 * پرده‌ای ۶۲٪ گم می‌شد. این‌جا نقش برعکس است: **تصویر خودِ محتواست**.
 *
 * ══ سه قول، و هر سه در کد ══
 *   ۱) **بی قابِ خالی.** صحنهٔ اول از ثانیهٔ صفر، آخری تا پایانِ صوت؛ صحنه‌ای
 *      که تصویرش نیامد، زمانش را به قبلی می‌دهد — هرگز سیاهی.
 *   ۲) **بی لرزش.** zoompan و crop هر دو روی پیکسلِ درست گرد می‌کنند و حرکتِ
 *      آرام را پله‌پله می‌کنند — همان «صفحه هی می‌لرزه»ِ ۳۰ سپتامبر. این‌جا
 *      `perspective` با درون‌یابی است: حرکت زیرپیکسلی و پیوسته. سنجیده شد:
 *      اختلافِ قاب‌به‌قاب با crop پله‌ای بود (۰ ⇒ ۰٫۸ ⇒ ۰)، با این یکنواخت (~۰٫۰۳).
 *   ۳) **هم‌زمان با گفتار، و سنجیده نه ادعاشده.** مرزِ هر صحنه از زمانِ واقعیِ
 *      جمله می‌آید (موتور) و این‌جا روی نزدیک‌ترین مکث می‌نشیند؛ و پس از ساخت،
 *      از **خودِ ویدئو** قابِ وسطِ هر صحنه برداشته و با تصویرِ همان صحنه مقایسه
 *      می‌شود (`qa`). موتور ویدئویی را که این سنجش ردش کند عمومی نمی‌کند.
 *
 * مرزِ این ماژول مثلِ cardkit: **چیزی دانلود و آپلود نمی‌کند.** ورودی
 * فایل‌های محلی است؛ شبکه کارِ render.js است.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const MARK = require('./cardkit/mark.js');
const K = require('./cardkit/draw.js');

const SK = {
  w: 1920, h: 1080, fps: 24,
  xf: 0.6,            // میان‌محوی میانِ دو صحنه (ثانیه)
  zoom: 0.035,        // بیشینهٔ حرکت: ۳٫۵٪ از هر لبه — آرام، نه تبلیغ
  group: 10,          // صحنه در هر دستهٔ ffmpeg (حافظه به دسته بند است، نه به قسمت)
  capFrom: 0.5, capTo: 7.0, capFade: 0.45,
  capY: 820, capH: 220,   // نوارِ زیرنویس: پایینِ قاب (قرصِ زیرنویس ۸۴ پیکسل بالاتر از لبه)
  snap: 2.5,          // بیشینهٔ جابه‌جاییِ مرز تا نزدیک‌ترین مکث (ثانیه)
  minSec: 4,          // صحنهٔ کوتاه‌تر از این دیده نمی‌شود ⇒ به قبلی می‌پیوندد
  qaMad: 30,          // بیشینهٔ اختلافِ میانگینِ خاکستری (۰ تا ۲۵۵) برای «همان تصویر»
  qaBlankSd: 6,       // انحرافِ معیارِ کمتر از این ⇒ قابِ خالی
  crf: 23, audioBps: 128000, capMB: 45
};

/** صحنه‌های معتبرِ یک ردیف؛ کمتر از سه ⇒ `null` (این حالت معنا ندارد). */
function scenesOf(it) {
  const a = it && it.scenes;
  if (!Array.isArray(a)) return null;
  const out = [];
  for (const x of a) {
    const url = String((x && x.url) || '').trim();
    // file:// فقط برای آزمون است؛ موتور همیشه https می‌نویسد (`ytDlUrl_`)
    if (!/^(https?|file):\/\//i.test(url)) continue;
    out.push({ n: Number(x.n) || out.length + 1, t0: Math.max(0, Number(x.t0) || 0),
               url: url, fileId: String(x.fileId || ''), caption: String(x.caption || '').trim() });
  }
  out.sort((p, q) => p.t0 - q.t0);
  return out.length >= 3 ? out : null;
}

/** وسطِ هر مکث در صوت — جایی که عوض‌شدنِ تصویر به چشم «سرِ جمله» می‌آید. */
function silences(ff, wav) {
  const r = spawnSync(ff, ['-hide_banner', '-nostats', '-i', wav,
    '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = [];
  let s = null;
  for (const line of String(r.stderr || '').split('\n')) {
    let m = line.match(/silence_start: (-?[0-9.]+)/);
    if (m) s = Number(m[1]);
    m = line.match(/silence_end: ([0-9.]+)/);
    if (m && s !== null) { out.push((Math.max(0, s) + Number(m[1])) / 2); s = null; }
  }
  return out;
}

/**
 * زمان‌بندی: مرزها روی مکث، بی شکاف، بی سرریز.
 * @return {Array<{i:number, t0:number, d:number}>} به ترتیب، جمعِ d = مدتِ صوت
 */
function timeline(scenes, durSec, sil) {
  const dur = Math.max(1, Number(durSec) || 1);
  const sl = (sil || []).slice().sort((a, b) => a - b);
  const near = t => {
    let best = t, bd = SK.snap + 1;
    for (const x of sl) { const d = Math.abs(x - t); if (d < bd) { bd = d; best = x; } if (x > t + SK.snap) break; }
    return bd <= SK.snap ? best : t;
  };
  const b = [0];
  for (let i = 1; i < scenes.length; i++) {
    let t = Math.min(dur, near(scenes[i].t0));
    if (t - b[b.length - 1] < SK.minSec) { b.push(null); continue; }   // خیلی کوتاه ⇒ ادغام
    b.push(t);
  }
  const out = [];
  for (let i = 0; i < scenes.length; i++) {
    if (b[i] === null) continue;
    let j = i + 1;
    while (j < scenes.length && b[j] === null) j++;
    const end = j < scenes.length ? b[j] : dur;
    if (end - b[i] > 0.05) out.push({ i: i, t0: Math.round(b[i] * 100) / 100,
                                      d: Math.round((end - b[i]) * 1000) / 1000 });
  }
  return out;
}

/* ══ پنجرهٔ بلندتر، بعد بریدن — چیزی که فقط دیدنِ کاور نشانش داد ══
   `--window-size` اندازهٔ **پنجره** است نه نمای صفحه؛ نمای صفحه کوتاه‌تر
   درمی‌آید و ته‌اش سیاه می‌مانَد. همان چیزی که cardkit با ۱۹۲۰×۱۲۰۰ دور می‌زند.
   پس پنجره بلندتر گرفته و نتیجه دقیقاً به w×h بریده می‌شود. */
function shoot(exe, html, png, w, h, ffRun) {
  const f = png + '.html';
  fs.writeFileSync(f, html);
  const raw = png.replace(/\.png$/, '') + '.raw.png';
  execFileSync(exe, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=' + w + ',' + (h + 240),
    '--default-background-color=00000000', '--screenshot=' + raw, 'file://' + f], { stdio: 'ignore' });
  if (ffRun) ffRun(['-i', raw, '-vf', 'crop=' + w + ':' + h + ':0:0', '-frames:v', '1', png]);
  else fs.renameSync(raw, png);
  return png;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** زیرنویسِ کوتاهِ پایینِ قاب، روی زمینهٔ شفاف. */
function captionHtml(text) {
  return '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:' + SK.w +
    'px;height:' + SK.h + 'px;background:transparent;overflow:hidden}' +
    '.c{position:absolute;bottom:84px;left:50%;transform:translateX(-50%);direction:rtl;' +
    'font-family:' + K.FONT + ';font-size:50px;font-weight:700;color:#fff;' +
    'background:rgba(8,12,22,.66);padding:14px 38px 18px;border-radius:20px;white-space:nowrap;' +
    'box-shadow:0 6px 24px rgba(0,0,0,.25)}</style><div class="c">' + esc(text) + '</div>';
}

/** نشانِ کانال در یک گوشه، روی زمینهٔ شفاف — همان طرحِ cardkit، رنگِ روشن. */
function markHtml(mark, corner) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + SK.w + '" height="' + SK.h +
    '" viewBox="0 0 ' + SK.w + ' ' + SK.h + '" font-family="' + K.FONT.replace(/"/g, "'") + '">' +
    MARK.draw({ corner: corner, W: SK.w, H: SK.h, M: 70, handle: mark.handle, name: mark.name,
                logo: mark.logo, ink: '#FFFFFF', opacity: Math.max(0.55, Number(mark.opacity) || 0.7) }) +
    '</svg>';
  return '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent;' +
    'overflow:hidden}svg{display:block}</style>' + svg;
}

/**
 * کاورِ بندانگشتی: نقاشیِ خودِ درس، تمام‌قاب، و عنوان روی سایه‌ای نرم در
 * سمتِ راست. ۱۲۸۰×۷۲۰ JPEG، زیرِ سقفِ ۲ مگابایتِ یوتیوب.
 */
function coverHtml(imgData, it) {
  const title = String(it.coverTitle || it.title || '').trim();
  const kicker = String(it.coverKicker || '').trim();
  const foot = String(it.coverFoot || '').trim();
  const fs1 = title.length > 30 ? 62 : (title.length > 20 ? 70 : 80);
  return '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:1280px;height:720px;' +
    'overflow:hidden;background:#111}' +
    '.bg{position:absolute;inset:0;background:url(' + imgData + ') center/cover no-repeat}' +
    '.sh{position:absolute;inset:0;background:linear-gradient(270deg,rgba(6,10,20,.86) 0%,' +
    'rgba(6,10,20,.62) 38%,rgba(6,10,20,0) 64%)}' +
    '.t{position:absolute;right:56px;top:50%;transform:translateY(-50%);width:560px;direction:rtl;' +
    'font-family:' + K.FONT + ';color:#fff;text-align:right}' +
    '.k{font-size:28px;font-weight:600;opacity:.88;margin-bottom:14px}' +
    '.h{font-size:' + fs1 + 'px;font-weight:800;line-height:1.28;text-shadow:0 3px 16px rgba(0,0,0,.45)}' +
    '.f{display:inline-block;margin-top:22px;font-size:30px;font-weight:700;background:#F2C14E;' +
    'color:#1b1b1b;padding:6px 22px 10px;border-radius:14px}</style>' +
    '<div class="bg"></div><div class="sh"></div><div class="t">' +
    (kicker ? '<div class="k">' + esc(kicker) + '</div>' : '') +
    '<div class="h">' + esc(title) + '</div>' +
    (foot ? '<div class="f">' + esc(foot) + '</div>' : '') + '</div>';
}

/** حرکتِ آرامِ صحنهٔ g: بزرگ‌نمایی، کوچک‌نمایی، یا لغزشِ افقی — یکی‌درمیان. */
function motion(g, N) {
  const z = SK.zoom.toFixed(4);
  const p = '(on/' + N + ')';
  if (g % 3 === 2) {
    const zx = '(' + z + '*W)', zy = '(' + z + '*H)';
    const sx = '(' + z + '*W*0.9*(2*' + p + '-1)*' + (g % 2 ? '1' : '-1') + ')';
    return { x0: zx + '+' + sx, y0: zy, x1: 'W-' + zx + '+' + sx, y1: zy,
             x2: zx + '+' + sx, y2: 'H-' + zy, x3: 'W-' + zx + '+' + sx, y3: 'H-' + zy };
  }
  const Z = g % 2 === 0 ? '(' + z + '*' + p + ')' : '(' + z + '*(1-' + p + '))';
  return { x0: Z + '*W', y0: Z + '*H', x1: 'W-' + Z + '*W', y1: Z + '*H',
           x2: Z + '*W', y2: 'H-' + Z + '*H', x3: 'W-' + Z + '*W', y3: 'H-' + Z + '*H' };
}

/** نرخِ بیتِ مجاز تا فایل زیرِ سقفِ موتور بماند. */
function vmaxFor(durSec) {
  const d = Math.max(1, Number(durSec) || 1);
  return Math.max(120000, Math.floor((SK.capMB * 1024 * 1024 * 8) / d) - SK.audioBps);
}

/**
 * ساختِ ویدئو.
 * @param ctx {ff, exe, wav, durSec, dest, dir, imgs:{n:file}, mark, notes}
 */
function build(it, ctx) {
  const scenes = scenesOf(it);
  if (!scenes) throw new Error('کمتر از سه صحنه');
  const notes = ctx.notes || [];
  // تصویری که نیامد ⇒ صحنه‌اش به قبلی می‌پیوندد (هرگز قابِ خالی)
  const have = scenes.filter(s => ctx.imgs[String(s.n)]);
  if (have.length < 3) throw new Error('کمتر از سه تصویرِ صحنه رسید');
  if (have.length < scenes.length) notes.push((scenes.length - have.length) + ' صحنه تصویر نگرفت و به قبلی پیوست');
  have[0].t0 = 0;
  const sil = silences(ctx.ff, ctx.wav);
  const tl = timeline(have, ctx.durSec, sil);
  const snapped = tl.filter((x, k) => k && Math.abs(x.t0 - have[x.i].t0) > 0.05).length;

  /* لایه‌های شفاف: زیرنویس‌ها و نشان (هر گوشه یک بار). هر کدام **به اندازهٔ
     خودش بریده می‌شود** و همان‌جا می‌نشیند: آمیختنِ یک PNGِ تمام‌قابِ شفاف روی
     هر قاب، سنجیده شد، رندر را تقریباً دو برابر کند می‌کرد — برای چند صد
     پیکسل که واقعاً چیزی دارند. */
  const capFile = {}, markFile = {}, markPos = {};
  const crop = (src, x, y, w, h, out) => {
    ctx.ffRun(['-i', src, '-vf', 'crop=' + w + ':' + h + ':' + x + ':' + y, '-frames:v', '1', out]);
    return out;
  };
  tl.forEach((x, k) => {
    const s = have[x.i];
    if (s.caption && x.d >= 3.5) {
      const full = shoot(ctx.exe, captionHtml(s.caption), path.join(ctx.dir, 'capf' + k + '.png'), SK.w, SK.h, ctx.ffRun);
      capFile[k] = crop(full, 0, SK.capY, SK.w, SK.capH, path.join(ctx.dir, 'cap' + k + '.png'));
    }
  });
  const corners = {};
  if (ctx.mark && ctx.mark.handle) {
    tl.forEach((x, k) => { corners[k] = MARK.cornerAt(x.t0, ctx.mark.everySec); });
    for (const c of new Set(Object.values(corners))) {
      const full = shoot(ctx.exe, markHtml(ctx.mark, c), path.join(ctx.dir, 'markf-' + c + '.png'), SK.w, SK.h, ctx.ffRun);
      const b = MARK.box(c, SK.w, SK.h, 70);
      const bx = Math.max(0, Math.round(b.x - 24)), by = Math.max(0, Math.round(b.y - 24));
      const bw = Math.min(SK.w - bx, Math.round(b.w + 48)), bh = Math.min(SK.h - by, Math.round(b.h + 60));
      markFile[c] = crop(full, bx, by, bw, bh, path.join(ctx.dir, 'mark-' + c + '.png'));
      markPos[c] = { x: bx, y: by };
    }
  }

  const vmax = vmaxFor(ctx.durSec);
  const parts = [];
  for (let g0 = 0; g0 < tl.length; g0 += SK.group) {
    const grp = tl.slice(g0, g0 + SK.group);
    const a = [], f = [];
    let inIdx = 0;
    grp.forEach((x, k) => {
      const gk = g0 + k;
      const clip = x.d + (k === grp.length - 1 ? 0 : SK.xf);
      const N = Math.max(2, Math.round(clip * SK.fps));
      const m = motion(gk, N);
      a.push('-loop', '1', '-framerate', String(SK.fps), '-t', clip.toFixed(3), '-i', ctx.imgs[String(have[x.i].n)]);
      const iv = inIdx++;
      let chain = '[' + iv + ':v]scale=' + SK.w + ':' + SK.h + ':flags=bicubic,' +
        "perspective=x0='" + m.x0 + "':y0='" + m.y0 + "':x1='" + m.x1 + "':y1='" + m.y1 +
        "':x2='" + m.x2 + "':y2='" + m.y2 + "':x3='" + m.x3 + "':y3='" + m.y3 +
        "':interpolation=linear:eval=frame,setsar=1[b" + k + ']';
      f.push(chain);
      let cur = 'b' + k;
      if (capFile[gk]) {
        a.push('-loop', '1', '-framerate', String(SK.fps), '-t', clip.toFixed(3), '-i', capFile[gk]);
        const ic = inIdx++;
        const end = Math.max(SK.capFrom + 1, Math.min(SK.capTo, x.d - 0.8));
        f.push('[' + ic + ':v]format=rgba,fade=t=in:st=' + SK.capFrom + ':d=' + SK.capFade +
               ':alpha=1,fade=t=out:st=' + end.toFixed(2) + ':d=' + SK.capFade + ':alpha=1[c' + k + ']');
        f.push('[' + cur + '][c' + k + ']overlay=0:' + SK.capY + ':shortest=1[bc' + k + ']');
        cur = 'bc' + k;
      }
      if (corners[gk] && markFile[corners[gk]]) {
        a.push('-loop', '1', '-framerate', String(SK.fps), '-t', clip.toFixed(3), '-i', markFile[corners[gk]]);
        const im = inIdx++;
        const mp = markPos[corners[gk]] || { x: 0, y: 0 };
        f.push('[' + cur + '][' + im + ':v]overlay=' + mp.x + ':' + mp.y + ':shortest=1[bm' + k + ']');
        cur = 'bm' + k;
      }
      f.push('[' + cur + ']format=yuv420p[v' + k + ']');
    });
    let prev = 'v0', off = grp[0].d;
    for (let k = 1; k < grp.length; k++) {
      const lab = k === grp.length - 1 ? 'vout' : ('x' + k);
      f.push('[' + prev + '][v' + k + ']xfade=transition=fade:duration=' + SK.xf.toFixed(2) +
             ':offset=' + off.toFixed(3) + '[' + lab + ']');
      prev = lab; off += grp[k].d;
    }
    const last = grp.length > 1 ? 'vout' : 'v0';
    const outp = path.join(ctx.dir, 'sc' + String(parts.length).padStart(3, '0') + '.mp4');
    ctx.ffRun(a.concat(['-filter_complex', f.join(';'), '-map', '[' + last + ']',
      '-c:v', 'libx264', '-preset', 'faster', '-crf', String(SK.crf),
      '-maxrate', String(vmax), '-bufsize', String(vmax * 2),
      '-pix_fmt', 'yuv420p', '-r', String(SK.fps), '-g', String(SK.fps * 10), '-an', outp]));
    parts.push(outp);
  }
  const lst = path.join(ctx.dir, 'scl.txt');
  fs.writeFileSync(lst, parts.map(p => "file '" + p + "'").join('\n'));
  const silent = path.join(ctx.dir, 'scall.mp4');
  ctx.ffRun(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent]);
  ctx.ffRun(['-i', silent, '-i', ctx.wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
             '-t', String(Math.max(1, Number(ctx.durSec) || 1)),
             '-shortest', '-movflags', '+faststart', ctx.dest]);
  for (const p of parts) { try { fs.unlinkSync(p); } catch (e) {} }
  try { fs.unlinkSync(silent); } catch (e) {}
  return { scenes: tl.length, want: scenes.length, snapped: snapped, silences: sil.length,
           groups: parts.length, vmax: vmax, tl: tl.map(x => ({ n: have[x.i].n, t0: x.t0, d: x.d,
           img: ctx.imgs[String(have[x.i].n)] })) };
}

/* ══ رنگی، نه خاکستری — چیزی که آزمونِ واقعی نشانش داد ══
   نگارشِ اول قاب را خاکستری می‌سنجید و دو تصویرِ هم‌شکل با رنگِ متفاوت را
   یکی می‌دید: ۲ صحنه از ۱۲ «سرِ جایش نیست» خورد در حالی که بود. تصویرهای یک
   سری عمداً هم‌سبک‌اند، پس تفاوتشان بیشتر در رنگ و ترکیب است تا در روشنی. */
const QW = 48, QH = 27, QROWS = 21;     // ۲۱ ردیفِ بالایی: زیرنویس و پانویس بیرون

/** قابِ کوچکِ RGB از یک فایل (ویدئو در ثانیهٔ t، یا تصویر). */
function gray(ff, file, t) {
  const a = ['-hide_banner', '-loglevel', 'error'];
  if (t !== undefined) a.push('-ss', String(Math.max(0, t).toFixed(2)));
  a.push('-i', file, '-frames:v', '1',
         '-vf', 'scale=' + SK.w + ':' + SK.h + ':force_original_aspect_ratio=increase,crop=' + SK.w + ':' + SK.h +
                ',scale=' + QW + ':' + QH + ',format=rgb24', '-f', 'rawvideo', '-');
  const r = spawnSync(ff, a, { maxBuffer: 8 * 1024 * 1024 });
  const b = r.stdout;
  return (b && b.length >= QW * QH * 3) ? b.subarray(0, QW * QH * 3) : null;
}

/** میانگینِ اختلافِ پیکسل (۰ تا ۲۵۵)، روی ردیف‌های بالایی. */
function mad(a, b) {
  if (!a || !b) return 255;
  let s = 0, n = 0;
  for (let i = 0; i < QW * QROWS * 3; i++) { s += Math.abs(a[i] - b[i]); n++; }
  return s / n;
}

function sd(a) {
  if (!a) return 0;
  let m = 0;
  for (let i = 0; i < a.length; i++) m += a[i];
  m /= a.length;
  let v = 0;
  for (let i = 0; i < a.length; i++) v += (a[i] - m) * (a[i] - m);
  return Math.sqrt(v / a.length);
}

/** مدتِ واقعیِ یک فایلِ رسانه از سرآیندِ ffmpeg. */
function mediaSeconds(ff, file) {
  const r = spawnSync(ff, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = String(r.stderr || '').match(/Duration: (\d+):(\d+):([0-9.]+)/);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
}

/**
 * سنجشِ ویدئوی ساخته‌شده — **از خودِ فایل**، نه از نقشه.
 * وسطِ هر صحنه یک قاب برداشته و با تصویرِ همان صحنه و دو همسایه‌اش مقایسه
 * می‌شود: باید به خودش نزدیک‌تر باشد تا به همسایه‌ها. و هیچ قابی خالی نباشد.
 */
function qa(ff, dest, tl, durSec) {
  const out = { n: tl.length, matched: 0, miss: [], blank: [], ok: false, why: '', durDiff: 0 };
  const src = {};
  for (const x of tl) if (!src[x.img]) src[x.img] = gray(ff, x.img);
  for (let k = 0; k < tl.length; k++) {
    const x = tl[k];
    const t = x.t0 + Math.min(x.d * 0.5, Math.max(0.3, x.d - 0.9));
    const fr = gray(ff, dest, t);
    if (!fr || sd(fr) < SK.qaBlankSd) { out.blank.push(x.n); continue; }
    const own = mad(fr, src[x.img]);
    let ok = own <= SK.qaMad;
    for (const j of [k - 1, k + 1]) {
      if (j < 0 || j >= tl.length || tl[j].img === x.img) continue;
      if (mad(fr, src[tl[j].img]) < own) ok = false;
    }
    if (ok) out.matched++; else out.miss.push(x.n);
  }
  const vd = mediaSeconds(ff, dest);
  out.durDiff = Math.round(Math.abs(vd - (Number(durSec) || 0)) * 10) / 10;
  const why = [];
  if (out.blank.length) why.push(out.blank.length + ' قابِ خالی (صحنهٔ ' + out.blank.slice(0, 5).join('، ') + ')');
  if (out.matched < Math.ceil(out.n * 0.9)) why.push('فقط ' + out.matched + ' از ' + out.n + ' صحنه سرِ جای خودش دیده شد');
  if (out.durDiff > 2) why.push('مدتِ ویدئو ' + out.durDiff + ' ثانیه با صوت فرق دارد');
  out.ok = !why.length;
  out.why = why.join(' · ');
  return out;
}

module.exports = { SK, scenesOf, silences, timeline, captionHtml, markHtml, coverHtml,
                   motion, vmaxFor, build, gray, mad, sd, qa, mediaSeconds, shoot };
