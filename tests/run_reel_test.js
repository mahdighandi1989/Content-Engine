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

console.log('=== ۱) تکه‌ها، حرکت و عبارت‌ها ===');
{
  const lines = [{ t0: 0.2, t1: 3, text: 'الف', img: 0 }, { t0: 3.2, t1: 6, text: 'ب', img: 0 },
                 { t0: 6.2, t1: 9, text: 'پ', img: 1 }, { t0: 9.2, t1: 12, text: 'ت', img: -1 }];
  const sg = RK.segmentsOf(lines, 12.5);
  ok('۱.۱ جمله‌های پشتِ‌همِ یک تصویر یک تکه‌اند و تکه‌ها کلِ صدا را بی شکاف می‌پوشانند',
     sg.length === 3 && sg[0].t0 === 0 && sg[0].t1 === 6.2 && sg[1].t1 === 9.2 && sg[2].t1 === 12.5 && sg[2].img === -1, JSON.stringify(sg));
  const f = [0, 1, 2].map(k => RK.motionFilter(1920, 1080, 5, k));
  ok('۱.۲ حرکتِ گوناگون (۹.۲۶): نزدیک‌شدن، پیمایشِ کلِ نقاشیِ افقی، دورشدن', /min\(1\+0\.16/.test(f[0]) &&
     /crop=1080:1920:x='\(\d+\)\*t\/5\.000'/.test(f[1]) && /scale=3414:1920/.test(f[1]) && /max\(1\.16-0\.16/.test(f[2]), f.join(' | '));
  const ph = RK.phrasesOf([{ t0: 0, t1: 4, text: 'یک دو سه چهار پنج شش هفت' }, { t0: 4, t1: 6, text: 'هشت، نه ده' }]);
  const ph2 = RK.phrasesOf([{ t0: 0, t1: 4, text: 'یک دو، سه چهار پنج شش هفت هشت' }]);
  ok('۱.۳ عبارت‌های ۲ تا ۴ واژه‌ای، مرز روی «،» (نه پس از یک واژهٔ تنها)، و هر عبارت تا عبارتِ بعدیِ همان جمله می‌ماند', ph.length === 3 &&
     ph[0].text === 'یک دو سه چهار' && ph[1].text === 'پنج شش هفت' && ph[2].text === 'هشت، نه ده' && ph[0].b === ph[1].a && ph[2].line === 1 &&
     ph2[0].text === 'یک دو،' && ph2.every(x => x.text.split(' ').length <= 4),
     JSON.stringify(ph.map(x => [x.text, +x.a.toFixed(2), +x.b.toFixed(2)])));
  const wt = [[0, .5], [.5, 1], [1, 1.5], [1.5, 2], [2, 2.5], [2.5, 3], [3, 3.6], [4.1, 4.6], [4.6, 5], [5, 5.9]];
  ok('۱.۴ زمانِ واژه از هم‌ترازی (faster-whisper) اگر هست', RK.phrasesOf([{ t0: 0, t1: 4, text: 'یک دو سه چهار پنج شش هفت' },
     { t0: 4, t1: 6, text: 'هشت، نه ده' }], wt)[2].a === 4.1);
  const real = ['اگر سنگِ ترازوی ما خراب باشد، تمامِ تصمیم‌هایمان غلط از آب درمی‌آید.',
                'درست مثل بازاری که پارچه‌فروش متر دارد و میوه‌فروش ترازو؛ همه دارند جنس می‌فروشند، اما یک نفر باید بپرسد آیا این سنگِ ترازو خودش دقیق است؟']
                .map((x, i) => ({ t0: i * 10, t1: i * 10 + 9, text: x }));
  const phR = RK.phrasesOf(real), ends = phR.slice(0, -1).filter((p, i) => phR[i + 1].line === p.line).map(p => p.text.split(' ').pop());
  ok('۱.۴-ب ریلزِ اول (۹.۲۹): هیچ عبارتی روی «از/که/و/…» تمام نمی‌شود — «غلط از» و «بازاری که» نیمه‌جمله بودند',
     !ends.some(w => /^(از|به|در|با|تا|که|و|یا|مثل|این|آن|اما)$/.test(w)) && phR.every(x => x.text.split(' ').length <= 6),
     JSON.stringify(phR.map(x => x.text)));
  const hp = [0, 1, 2].map(li => RK.phraseHtml({ text: 'دانستن یعنی باورِ درست', line: li }, ['دانستن']));
  ok('۱.۵ هر جمله جای و شکلِ خودش را دارد، بی کادر؛ واژهٔ کلیدی برجسته', new Set(hp.map(h => /top:(\d+)px/.exec(h)[1])).size === 3 &&
     hp.every(h => !/background:rgba\(9,13,22/.test(h)) && /class="k">دانستن/.test(hp[0]) && /class="hl">دانستن/.test(hp[1]));
  const eh = RK.endHtml({ l1: 'نسخهٔ کاملِ این درس در یوتیوب', l2: 'رد پای حقیقت', handle: '@x' }, { logo: 'data:x' }, '');
  ok('۱.۶ کارتِ پایانی بی «لینک در کپشن»، نشان بی مربعِ سیاه (screen)', !/لینک در کپشن/.test(eh) && /mix-blend-mode:screen/.test(eh));
}

console.log('=== ۲) ساختِ واقعی ===');
{
  ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*300*t)':s=24000:d=12", '-ac', '1', '-c:a', 'pcm_s16le', P('a.wav')]);
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=1920x1080:d=1', '-frames:v', '1', P('wide.png')]);
  ff(['-f', 'lavfi', '-i', 'mandelbrot=s=768x1344', '-frames:v', '1', P('tall.png')]);
  const exe = CK.chromeExe();
  const reel = { hook: 'آیا می‌دانستید معرفت‌شناسی از پرسشِ «از کجا می‌دانم؟» شروع می‌شود؟', kicker: 'معرفت‌شناسی',
    coverTitle: 'از کجا می‌دانم؟', emph: ['از کجا می‌دانم', 'شناختی'], short: true,
    lines: [{ t0: 0.1, t1: 3.0, text: 'آیا می‌دانستید معرفت‌شناسی از یک پرسش شروع می‌شود؟', img: 0 },
            { t0: 3.2, t1: 6.0, text: 'پرسشی ساده: از کجا می‌دانم که می‌دانم؟', img: 0 },
            { t0: 6.2, t1: 9.0, text: 'و پاسخش راهِ هر شناختی را روشن می‌کند.', img: 1 },
            { t0: 9.2, t1: 12.0, text: 'نسخهٔ کاملِ این درس در یوتیوب است.', img: 1, cta: true }],
    end: { l1: 'نسخهٔ کاملِ این درس در یوتیوب', l2: 'رد پای حقیقت', handle: '@truth_trace1' } };
  const io = { wav: P('a.wav'), dur: R.wavSeconds(P('a.wav')),
    imgs: [{ file: P('wide.png'), w: 1920, h: 1080 }, { file: P('tall.png'), w: 768, h: 1344 }],
    mark: {}, dir: dir, ff: ff, shoot: (html, png, w, h) => SKIT.shoot(exe, html, png, w, h, ff) };
  const calls = [];
  io.ff = (a) => { calls.push(a); return ff(a); };
  const r = RK.build(reel, io, P('reel.mp4'));
  const pr = MKIT.probe(FF, r.file) || {};
  /* ۲.۰ (۲۰ اکتبر): رانر دو بار با ۱۵ گیگ حافظه کشته شد — هر لایه یک ورودیِ `-loop 1` بود و ffmpeg هر کدام را از ثانیهٔ صفر
     صف می‌کرد. گذرِ نهایی حالا شمارِ ورودیِ ثابت دارد (ویدئو، صدا، نوار، خطِ زمانِ لایه‌ها)، هرچند لایه که باشد. */
  const fin = calls.filter(a => a.indexOf('+faststart') !== -1);
  ok('۲.۰ گذرِ نهایی ورودیِ جدا برای هر لایه ندارد — همهٔ لایه‌ها یک خطِ زمانِ concat‌اند',
     fin.length === 2 && fin.every(a => a.filter(x => x === '-i').length === 4 && a.indexOf('-loop') === -1 && a.indexOf('concat') !== -1),
     JSON.stringify(fin.map(a => a.filter(x => x === '-i').length)));
  ok('۲.۱ ریلز ۱۰۸۰×۱۹۲۰، با صدا، به طولِ صدا', pr.w === 1080 && pr.h === 1920 && pr.audio && Math.abs(pr.dur - 12) < 0.4, JSON.stringify(pr));
  const fr = (t, f) => spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', f || r.file, '-vf', 'scale=54:96,format=gray',
    '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 }).stdout || Buffer.alloc(0);
  const sd = (x, y) => { let d = 0; for (let i = 0; i < Math.min(x.length, y.length); i++) d += Math.abs(x[i] - y[i]); return d / Math.max(1, x.length); };
  ok('۲.۲ تصویر در طولِ تکه‌اش حرکت می‌کند (قابِ ۰٫۵ و ۵٫۵ یکی نیستند)', sd(fr(0.5), fr(5.5)) > 3, sd(fr(0.5), fr(5.5)).toFixed(1));
  const band = (b, y0, y1) => { let v = 0, k = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 54; x++) { v += b[y * 54 + x]; k++; } return v / k; };
  const endF = fr(11.0), midF = fr(7.5);
  ok('۲.۳ کارتِ پایانی روی جملهٔ دعوت: قابِ تیره و مات', band(endF, 0, 96) < band(midF, 0, 96) && sd(endF, midF) > 8,
     band(endF, 0, 96).toFixed(0) + ' < ' + band(midF, 0, 96).toFixed(0));
  ok('۲.۳-ب میانِ دو عبارت (لایهٔ شفاف) تصویرِ زیر دیده می‌شود، نه قابِ سیاه', band(fr(3.1), 0, 96) > 40, band(fr(3.1), 0, 96).toFixed(0));
  const cp = MKIT.probe(FF, r.cover) || {};
  ok('۲.۴ کاورِ JPEGِ ۱۰۸۰×۱۹۲۰ کنارِ ویدئو', cp.w === 1080 && cp.h === 1920 && R.sniffKind(r.cover) === 'jpeg', JSON.stringify(cp));
  ok('۲.۵ جمله‌های میانی عبارت‌به‌عبارت؛ جملهٔ اول قلاب است؛ دو تصویر با یک گذار', r.phrases >= 4 && r.subs >= 3 && r.segs === 2 && r.trans === 1, JSON.stringify(r));
  const sp = MKIT.probe(FF, r.short) || {};
  ok('۲.۶ نسخهٔ شورتز: عمودی، تا آغازِ جملهٔ دعوت، بی کارتِ پایانی', sp.w === 1080 && sp.h === 1920 && sp.audio &&
     Math.abs(sp.dur - 9.45) < 0.35 && band(fr(9.0, r.short), 0, 96) > band(endF, 0, 96) + 5, JSON.stringify(sp));
  /* نوارِ پیشرفت: ردیف‌های بالای قاب در ثانیهٔ ۹ زردتر از ثانیهٔ ۱ (پهن‌تر شده). */
  const top = (t) => { const b = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', r.short, '-vf', 'crop=1080:8:0:0,scale=108:1,format=gray',
    '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 }).stdout; let v = 0; for (const x of b) v += x; return v / b.length; };
  ok('۲.۷ نوارِ پیشرفت بالای قاب پیش می‌رود', top(8.5) > top(1.0) + 20, top(1.0).toFixed(0) + ' ⇒ ' + top(8.5).toFixed(0));
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

console.log('=== ۴) هم‌ترازیِ واژه‌ها با صدا (tools/reelalign.py، ۹.۲۶) ===');
{
  const out = execFileSync('python3', ['-c', `
import sys, json; sys.path.insert(0, 'tools')
import reelalign as r
words = ['دانستن', 'یعنی', 'باورِ', 'درست']
heard = [(1.0, 1.5, 'دانستن'), (1.6, 1.9, 'یعنی'), (2.0, 2.4, 'باور'), (2.5, 3.2, 'درس')]
print(json.dumps({'a': r.align(words, heard), 'p': r.proportional(words, 0, 4)}))`], { encoding: 'utf8' });
  const j = JSON.parse(out.trim());
  ok('۴.۱ هر واژهٔ متن روی واژهٔ شنیده‌شدهٔ خودش، با whisperِ کج‌نویس هم («درس» برای «درست»)', j.a.length === 4 &&
     j.a[0][0] === 1.0 && j.a[1][0] > 1.4 && j.a[1][1] < 2.1 && j.a[3][1] === 3.2 && j.a.every((x, i) => !i || x[0] >= j.a[i - 1][0]), JSON.stringify(j.a));
  ok('۴.۲ پشتیبانِ نسبتِ نویسه کلِ بازه را بی شکاف می‌پوشاند', j.p[0][0] === 0 && j.p[3][1] === 4 && j.p.every((x, i) => !i || x[0] === j.p[i - 1][1]));
  ok('۴.۳ رانر هم‌ترازی را پیش از ساختن می‌خواهد و نسخهٔ شورتز را بالا می‌برد', /const wordTimes = reelWordTimes\(r, wav, dir\);/.test(fs.readFileSync('tools/render.js', 'utf8')) &&
     /slug \+ '-short\.mp4'/.test(fs.readFileSync('tools/render.js', 'utf8')));
}

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
console.log('\n✅ همهٔ ' + pass + ' سنجهٔ ریلز گذشت.');
