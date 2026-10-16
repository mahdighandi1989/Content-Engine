/**
 * run_reel_test.js — ریلزِ عمودیِ اینستاگرام (۹.۲۱)، **با ffmpeg و کرومِ واقعی**.
 *
 * صدای ساختگی، یک نقاشیِ افقیِ درس (۱۶:۹) و یک تصویرِ عمودی؛ همان `reelkit.build` که رانر صدا می‌زند ریلز و
 * کاور را می‌سازد و سنجه‌ها از **خودِ فایل‌های خروجی** خوانده می‌شوند: اندازهٔ ۱۰۸۰×۱۹۲۰، مدتِ برابر با صدا، صدا
 * هست، تصویرِ افقی پیمایش می‌شود (قابِ آغاز و پایانِ یک تکه فرق دارند)، زیرنویس روی قاب نشسته، و کارتِ پایانی.
 */
'use strict';
require('./lib/root.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const R = require('../tools/render.js');
const RK = require('../tools/reelkit.js');
const SKIT = require('../tools/scenekit.js');
const CK = require('../tools/cardkit/index.js');
const MKIT = require('../tools/mediakit.js');
const FF = R.ffmpegExe();

let pass = 0;
function ok(name, cond, ev) {
  if (cond) { pass++; console.log('  ✅ ' + name + (ev ? ' — ' + String(ev).slice(0, 240) : '')); return; }
  console.log('  ❌ ' + name + (ev ? ' — ' + String(ev).slice(0, 400) : ''));
  throw new Error('FAILED: ' + name);
}
const ff = a => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y'].concat(a));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
const P = n => path.join(dir, n);

console.log('=== ۱) تکه‌ها و حرکت ===');
{
  const lines = [{ t0: 0.2, t1: 3, text: 'الف', img: 0 }, { t0: 3.2, t1: 6, text: 'ب', img: 0 },
                 { t0: 6.2, t1: 9, text: 'پ', img: 1 }, { t0: 9.2, t1: 12, text: 'ت', img: -1 }];
  const sg = RK.segmentsOf(lines, 12.5);
  ok('۱.۱ جمله‌های پشتِ‌همِ یک تصویر یک تکه‌اند و تکه‌ها کلِ صدا را بی شکاف می‌پوشانند',
     sg.length === 3 && sg[0].t0 === 0 && sg[0].t1 === 6.2 && sg[1].t1 === 9.2 && sg[2].t1 === 12.5 && sg[2].img === -1, JSON.stringify(sg));
  const fL = RK.motionFilter(1920, 1080, 5, 0), fP = RK.motionFilter(1080, 1920, 5, 0);
  ok('۱.۲ تصویرِ افقی در قابِ عمودی پیمایش می‌شود (کلِ نقاشی، نه برشِ وسط)؛ عمودی نزدیک می‌شود',
     /crop=1080:1920:x='\(\d+\)\*t\/5\.000'/.test(fL) && /scale=3414:1920/.test(fL) && /zoompan/.test(fP), fL + ' | ' + fP);
}

console.log('=== ۲) ساختِ واقعی ===');
{
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*300*t)':s=24000:d=12", '-ac', '1', '-c:a', 'pcm_s16le', P('a.wav')]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=1920x1080:d=1', '-frames:v', '1', P('wide.png')]);
  ff(['-f', 'lavfi', '-i', 'mandelbrot=s=768x1344', '-frames:v', '1', P('tall.png')]);
  const exe = CK.chromeExe();
  const reel = { hook: 'آیا می‌دانستید معرفت‌شناسی از پرسشِ «از کجا می‌دانم؟» شروع می‌شود؟', kicker: 'معرفت‌شناسی',
    coverTitle: 'از کجا می‌دانم؟',
    lines: [{ t0: 0.1, t1: 3.0, text: 'آیا می‌دانستید معرفت‌شناسی از یک پرسش شروع می‌شود؟', img: 0 },
            { t0: 3.2, t1: 6.0, text: 'پرسشی ساده: از کجا می‌دانم که می‌دانم؟', img: 0 },
            { t0: 6.2, t1: 9.0, text: 'و پاسخش راهِ هر شناختی را روشن می‌کند.', img: 1 },
            { t0: 9.2, t1: 12.0, text: 'نسخهٔ کاملِ این درس را در یوتیوب ببینید.', img: 1 }],
    end: { l1: 'نسخهٔ کاملِ این درس در یوتیوب', l2: 'رد پای حقیقت', handle: '@truth_trace1' } };
  const io = { wav: P('a.wav'), dur: R.wavSeconds(P('a.wav')),
    imgs: [{ file: P('wide.png'), w: 1920, h: 1080 }, { file: P('tall.png'), w: 768, h: 1344 }],
    mark: {}, dir: dir, ff: ff, shoot: (html, png, w, h) => SKIT.shoot(exe, html, png, w, h, ff) };
  const r = RK.build(reel, io, P('reel.mp4'));
  const pr = MKIT.probe(FF, r.file) || {};
  ok('۲.۱ ریلز ۱۰۸۰×۱۹۲۰، با صدا، به طولِ صدا', pr.w === 1080 && pr.h === 1920 && pr.audio && Math.abs(pr.dur - 12) < 0.4, JSON.stringify(pr));
  const fr = t => spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', r.file, '-vf', 'scale=54:96,format=gray',
    '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 }).stdout || Buffer.alloc(0);
  const sd = (x, y) => { let d = 0; for (let i = 0; i < Math.min(x.length, y.length); i++) d += Math.abs(x[i] - y[i]); return d / Math.max(1, x.length); };
  ok('۲.۲ تصویرِ افقی در طولِ تکه‌اش حرکت می‌کند (قابِ ۰٫۵ و ۵٫۵ یکی نیستند)', sd(fr(0.5), fr(5.5)) > 3, sd(fr(0.5), fr(5.5)).toFixed(1));
  const band = (b, y0, y1) => { let v = 0, k = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 54; x++) { v += b[y * 54 + x]; k++; } return v / k; };
  /* ۲.۳: کارتِ پایانی (۹ تا ۱۲) تمام‌قاب و تیره است؛ پیش از آن تصویرِ روشنِ ماندلبرو/تست. */
  const endF = fr(11.0), midF = fr(7.5);
  ok('۲.۳ کارتِ پایانی روی جملهٔ آخر: قابِ تیره و مات، متفاوت از تصویرِ پیش از آن', band(endF, 0, 96) < band(midF, 0, 96) && sd(endF, midF) > 8,
     band(endF, 0, 96).toFixed(0) + ' < ' + band(midF, 0, 96).toFixed(0));
  const cp = MKIT.probe(FF, r.cover) || {};
  ok('۲.۴ کاورِ JPEGِ ۱۰۸۰×۱۹۲۰ کنارِ ویدئو', cp.w === 1080 && cp.h === 1920 && R.sniffKind(r.cover) === 'jpeg', JSON.stringify(cp));
  ok('۲.۵ جمله‌های میانی زیرنویس گرفتند؛ جملهٔ اول همان قلابِ بالای قاب است (نه دو بار) و جملهٔ آخر زیرِ کارتِ پایانی', r.subs === 2 && r.segs === 2, JSON.stringify(r));
}

console.log('=== ۳) سیم‌کشیِ رانر ===');
{
  const q = { reels: [{ key: 'ig:special:1', sig: 's1', audio: { url: 'u' } }, { key: 'ig:special:2', sig: 's2', audio: { url: 'u' } },
                      { key: 'ig:special:3', sig: 's3' }] };
  const map = { items: {}, reels: { 'ig:special:1': { sig: 's1', url: 'x' }, 'ig:special:2': { sig: 'old', url: 'y' } } };
  const td = R.reelsTodo(q, map);
  ok('۳.۱ فقط ریلزِ ساخته‌نشده یا با امضای تازه، و فقط آن‌که صدا دارد', td.length === 1 && td[0].key === 'ig:special:2', JSON.stringify(td.map(x => x.key)));
  ok('۳.۲ پروب ریلز را «کار» می‌شمرد', R.probeWork({ items: [], reels: q.reels }, map, {}, new Date()) === '1');
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۳.۳ اجرای اصلی ریلزها را می‌سازد و نقشه را می‌نویسد', /rlMade = buildReels\(rlTodo, map, tmp\)/.test(rj) && /if \(made \|\| plMade \|\| bnMade \|\| rlMade\) writeMap\(map\)/.test(rj));
}

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
console.log('\n✅ همهٔ ' + pass + ' سنجهٔ ریلز گذشت.');
