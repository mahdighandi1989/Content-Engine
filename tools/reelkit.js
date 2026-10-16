/* reelkit — ریلزِ عمودیِ اینستاگرام برای درس‌نامه (۹.۲۱).
 *
 * صاحبِ برنامه: «ریلزِ کوتاه … خودش یه محتوا باشه، مثلاً "آیا می‌دانستید که در معرفت‌شناسی…" که قلابِ علاقه
 * بسازه … و اشاره کنه کاملش در یوتیوب است». موتور متن، صدا و تصویرها را می‌سازد و در `_YT-RENDER.json`
 * (`reels`) می‌گذارد؛ این‌جا فقط کشیده می‌شود: ۱۰۸۰×۱۹۲۰، هر تصویر با حرکت، زیرنویسِ هر جمله، قلاب بالای قاب
 * در جملهٔ اول، و کارتِ پایانیِ «نسخهٔ کامل در یوتیوب» روی جملهٔ آخر.
 *
 * تصویرِ افقیِ درس (۱۶:۹) بریده و دور ریخته نمی‌شود: در قابِ عمودی **از چپ به راست پیمایش** می‌شود تا کلِ نقاشی
 * دیده شود — همان «به قالبِ ریلز درآوردن» که او خواست. تصویرِ عمودی (ساختهٔ همین مسیر) آرام نزدیک می‌شود.
 * نبودِ تصویر خطا نیست: زمینهٔ رنگیِ ساده، چون ریلزِ بی‌تصویر از ریلزِ نساخته بهتر است.
 *
 * مرز: هیچ چیزی دانلود یا آپلود نمی‌کند؛ ورودی فایل‌های محلی، خروجی MP4 و JPEGِ کاور.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RK = { w: 1080, h: 1920, fps: 30, endMin: 3.0 };

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FONT = "'Vazirmatn','Noto Sans Arabic',sans-serif";

/** خطوطِ پشتِ‌همی که یک تصویر دارند یک تکهٔ تصویری‌اند ⇒ [{img, t0, t1}] تا پایانِ صدا. */
function segmentsOf(lines, dur) {
  const L = (lines || []).filter(x => x && isFinite(Number(x.t0)));
  const out = [];
  for (let i = 0; i < L.length; i++) {
    const t0 = i === 0 ? 0 : Number(L[i].t0);
    const t1 = i + 1 < L.length ? Number(L[i + 1].t0) : dur;
    const img = Number.isInteger(L[i].img) ? L[i].img : -1;
    const last = out[out.length - 1];
    if (last && last.img === img) last.t1 = t1;
    else out.push({ img: img, t0: t0, t1: t1 });
  }
  if (!out.length) out.push({ img: -1, t0: 0, t1: dur });
  out[out.length - 1].t1 = Math.max(out[out.length - 1].t1, dur);
  return out.filter(s => s.t1 - s.t0 > 0.05);
}

/** صافیِ ffmpeg برای یک تصویر در قابِ عمودی: افقی ⇒ پیمایش، عمودی ⇒ نزدیک‌شدن. */
function motionFilter(iw, ih, d, k) {
  const W = RK.w, H = RK.h, fr = Math.max(1, Math.round(d * RK.fps));
  if (iw && ih && iw / ih >= 1.0) {
    const sw = Math.ceil(iw * H / ih / 2) * 2;                 // پهنای تصویر وقتی بلندی‌اش ۱۹۲۰ است
    const span = Math.max(0, sw - W);
    const x = k % 2 ? '(' + span + ')*(1-t/' + d.toFixed(3) + ')' : '(' + span + ')*t/' + d.toFixed(3);
    return 'scale=' + sw + ':' + H + ',crop=' + W + ':' + H + ":x='" + x + "':y=0,fps=" + RK.fps + ',setsar=1,format=yuv420p';
  }
  return 'scale=' + (W * 2) + ':' + (H * 2) + ':force_original_aspect_ratio=increase,crop=' + (W * 2) + ':' + (H * 2) +
         ",zoompan=z='min(1+0.10*on/" + fr + ",1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + fr +
         ':s=' + W + 'x' + H + ':fps=' + RK.fps + ',setsar=1,format=yuv420p';
}

function frameCss() {
  return '<style>html,body{margin:0;width:' + RK.w + 'px;height:' + RK.h + 'px;background:transparent;font-family:' + FONT +
         ';direction:rtl}</style>';
}

/** زیرنویسِ یک جمله، پایینِ قاب. */
function subHtml(text) {
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;left:64px;right:64px;top:1230px;display:flex;justify-content:center">' +
    '<div style="background:rgba(9,13,22,.78);color:#fff;font-weight:700;font-size:52px;line-height:1.6;' +
    'padding:22px 36px;border-radius:28px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.45)">' + esc(text) + '</div></div>';
}

/** قلابِ بالای قاب در جملهٔ اول، با نامِ مجموعه و نشان. */
function hookHtml(hook, kicker, mark) {
  const logo = mark && mark.logo ? '<img src="' + mark.logo + '" style="width:92px;height:92px;border-radius:50%;' +
    'box-shadow:0 4px 18px rgba(0,0,0,.5)">' : '';
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;top:150px;left:60px;right:60px;text-align:center">' +
    (kicker ? '<div style="display:inline-block;background:#1fbf8f;color:#08131c;font-weight:800;font-size:34px;' +
      'padding:8px 26px;border-radius:40px;margin-bottom:22px">' + esc(kicker) + '</div>' : '') +
    '<div style="color:#ffe14d;font-weight:900;font-size:66px;line-height:1.45;text-shadow:0 4px 24px rgba(0,0,0,.85)">' +
    esc(hook) + '</div></div>' +
    (logo ? '<div style="position:absolute;top:40px;left:40px">' + logo + '</div>' : '');
}

/** کارتِ پایانی: «نسخهٔ کامل در یوتیوب»، تمام‌قاب و مات. */
function endHtml(end, mark, bgData) {
  const logo = mark && mark.logo ? '<img src="' + mark.logo + '" style="width:240px;height:240px;border-radius:50%;' +
    'box-shadow:0 8px 40px rgba(0,0,0,.6)">' : '';
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;inset:0;background:' + (bgData ? 'url(' + bgData + ') center/cover' : '#0d1726') + '"></div>' +
    '<div style="position:absolute;inset:0;background:rgba(6,10,18,.82)"></div>' +
    '<div style="position:absolute;top:470px;left:70px;right:70px;text-align:center;color:#fff">' + logo +
    '<div style="margin-top:46px;font-weight:900;font-size:64px;line-height:1.5">' + esc(end.l1 || 'نسخهٔ کاملِ این درس در یوتیوب') + '</div>' +
    '<div style="margin-top:22px;font-weight:700;font-size:46px;color:#1fbf8f">' + esc(end.l2 || '') + '</div>' +
    (end.handle ? '<div style="margin-top:30px;font-size:44px;direction:ltr;color:#ffe14d">' + esc(end.handle) + '</div>' : '') +
    '<div style="margin-top:56px;font-size:38px;color:#cfd8e3">' + esc(end.l3 || 'لینک در کپشن') + '</div></div>';
}

/** کاورِ ریلز: تصویرِ اول، عنوانِ کوتاه و نامِ مجموعه. */
function coverHtml(title, kicker, mark, bgData) {
  const logo = mark && mark.logo ? '<img src="' + mark.logo + '" style="width:120px;height:120px;border-radius:50%">' : '';
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;inset:0;background:' + (bgData ? 'url(' + bgData + ') center/cover' : '#0d1726') + '"></div>' +
    '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(5,9,16,.9) 75%)"></div>' +
    '<div style="position:absolute;left:70px;right:70px;bottom:330px;text-align:center">' +
    (kicker ? '<div style="display:inline-block;background:#1fbf8f;color:#08131c;font-weight:800;font-size:36px;' +
      'padding:8px 28px;border-radius:40px;margin-bottom:26px">' + esc(kicker) + '</div>' : '') +
    '<div style="color:#fff;font-weight:900;font-size:84px;line-height:1.4;text-shadow:0 6px 30px rgba(0,0,0,.8)">' +
    esc(title) + '</div></div>' +
    (logo ? '<div style="position:absolute;top:60px;left:0;right:0;text-align:center">' + logo + '</div>' : '');
}

function dataUrl(file) {
  try {
    const b = fs.readFileSync(file);
    const png = b[0] === 0x89 && b[1] === 0x50, jpg = b[0] === 0xFF && b[1] === 0xD8;
    if (!png && !jpg) return '';
    return 'data:image/' + (png ? 'png' : 'jpeg') + ';base64,' + b.toString('base64');
  } catch (e) { return ''; }
}

/**
 * reel: {lines:[{t0,t1,text,img}], hook, kicker, coverTitle, end:{l1,l2,l3,handle}}
 * io:   {wav, dur, imgs:[{file,w,h}|null], mark:{logo}, dir, ff, probe, shoot(html,png,w,h)}
 * ⇒ {file, cover, seconds, segs, subs}
 */
function build(reel, io, out) {
  const dir = io.dir, ff = io.ff, dur = Number(io.dur) || 0;
  if (!(dur > 2)) throw new Error('صدای ریلز کوتاه‌تر از ۲ ثانیه است');
  const lines = (reel.lines || []).filter(x => x && String(x.text || '').trim());
  if (!lines.length) throw new Error('ریلز هیچ جمله‌ای ندارد');
  const segs = segmentsOf(lines, dur);
  const parts = [];
  segs.forEach((s, k) => {
    const d = s.t1 - s.t0, f = path.join(dir, 'seg' + String(k).padStart(2, '0') + '.mp4');
    const im = s.img >= 0 ? (io.imgs || [])[s.img] : null;
    if (im && im.file && fs.existsSync(im.file)) {
      ff(['-loop', '1', '-framerate', String(RK.fps), '-t', d.toFixed(3), '-i', im.file,
          '-vf', motionFilter(im.w, im.h, d, k), '-frames:v', String(Math.max(1, Math.round(d * RK.fps))),
          '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-r', String(RK.fps), f]);
    } else {
      ff(['-f', 'lavfi', '-i', 'color=c=0x0d1726:s=' + RK.w + 'x' + RK.h + ':d=' + d.toFixed(3) + ':r=' + RK.fps,
          '-vf', 'format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', f]);
    }
    parts.push(f);
  });
  const list = path.join(dir, 'segs.txt');
  fs.writeFileSync(list, parts.map(p => "file '" + p + "'").join('\n') + '\n');
  const base = path.join(dir, 'base.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', base]);

  /* لایه‌ها: قلاب روی جملهٔ اول، زیرنویسِ هر جمله، کارتِ پایانی روی جملهٔ آخر (کمینه `endMin` ثانیه). */
  const ov = [];
  const lastT0 = Number(lines[lines.length - 1].t0) || 0;
  const endT0 = Math.max(0, Math.min(lastT0, dur - RK.endMin));
  const firstImg = (io.imgs || []).find(x => x && x.file && fs.existsSync(x.file));
  const bg = firstImg ? dataUrl(firstImg.file) : '';
  if (reel.hook) ov.push({ html: hookHtml(reel.hook, reel.kicker, io.mark), a: 0, b: Math.min(endT0, Number(lines[0].t1) || 4) });
  lines.forEach((x, i) => {
    const a = Number(x.t0) || 0, b = i + 1 < lines.length ? Number(lines[i + 1].t0) : dur;
    if (a >= endT0 - 0.01) return;                   // جملهٔ پایانی زیرِ کارتِ پایانی است
    if (i === 0 && reel.hook) return;                // جملهٔ اول همان قلابِ بالای قاب است؛ دو بار نوشتنش تکرار است
    ov.push({ html: subHtml(x.text), a: a, b: Math.min(b, endT0) });
  });
  ov.push({ html: endHtml(reel.end || {}, io.mark, bg), a: endT0, b: dur + 1 });
  const args = ['-i', base, '-i', io.wav];
  ov.forEach((o, i) => {
    o.png = io.shoot(o.html, path.join(dir, 'ov' + String(i).padStart(2, '0') + '.png'), RK.w, RK.h);
    args.push('-loop', '1', '-i', o.png);
  });
  const fl = [];
  let cur = '0:v';
  ov.forEach((o, i) => {
    const nx = 'v' + i;
    fl.push('[' + cur + '][' + (i + 2) + ':v]overlay=0:0:shortest=1:enable=\'between(t,' + o.a.toFixed(3) + ',' + o.b.toFixed(3) + ')\'[' + nx + ']');
    cur = nx;
  });
  ff(args.concat(['-filter_complex', fl.join(';'), '-map', '[' + cur + ']', '-map', '1:a',
    '-t', dur.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-maxrate', '6M', '-bufsize', '12M',
    '-pix_fmt', 'yuv420p', '-r', String(RK.fps), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', out]));

  const cpng = io.shoot(coverHtml(reel.coverTitle || reel.hook || '', reel.kicker, io.mark, bg), path.join(dir, 'cover.png'), RK.w, RK.h);
  const cover = path.join(dir, 'cover.jpg');
  ff(['-i', cpng, '-q:v', '3', '-frames:v', '1', cover]);
  return { file: out, cover: cover, seconds: Math.round(dur * 10) / 10, segs: segs.length, subs: ov.length - 1 - (reel.hook ? 1 : 0) };
}

module.exports = { RK, segmentsOf, motionFilter, subHtml, hookHtml, endHtml, coverHtml, build };
