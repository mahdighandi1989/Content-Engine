/**
 * run_media_render_test.js — ویدئوی «از همه جا» با رسانه‌های خودِ منبع (۸.۹۶)، **با ffmpegِ واقعی**.
 *
 * رسانه‌های ساختگی ولی واقعی ساخته می‌شوند — کلیپِ عمودی با صدا، کلیپِ افقی، عکسِ عمودی، عکسِ پهن، و
 * صدای گفتار با مکث — و همان مسیرِ تولید (`buildVideo`) ویدئو را می‌سازد. سنجه‌ها از **خودِ فایلِ
 * خروجی** خوانده می‌شوند: مدت، هم‌طولیِ صدا و تصویر، رنگِ قاب‌ها، صدای لحظه. سنجه‌ای که فقط متنِ
 * فرمان را بسنجد، همان است که ۷٫۴۳ یک لایه بالاتر از جای شکست ایستاد.
 */
'use strict';
require('./lib/root.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const R = require('../tools/render.js');
const MKIT = require('../tools/mediakit.js');
const FF = R.ffmpegExe();

let pass = 0;
function ok(name, cond, ev) {
  if (cond) { pass++; console.log('  ✅ ' + name + (ev ? ' — ' + String(ev).slice(0, 240) : '')); return; }
  console.log('  ❌ ' + name + (ev ? ' — ' + String(ev).slice(0, 400) : ''));
  throw new Error('FAILED: ' + name);
}
const ff = a => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y'].concat(a));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mrt-'));
const P = n => path.join(dir, n);

/* گفتار: ۳٫۵ ثانیه صدا، ۰٫۶ ثانیه مکث — مکث‌ها جای مرزِ صحنه و لحظه‌اند. */
ff(['-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*300*t)*lt(mod(t\\,4.1)\\,3.5)':s=24000:d=50", '-ac', '1',
    '-c:a', 'pcm_s16le', P('narr.wav')]);
/* کلیپِ عمودی با صدا (۶۰۰ هرتز)، کلیپِ افقی با صدا (۹۰۰ هرتز)، عکسِ عمودی، عکسِ پهن */
ff(['-f', 'lavfi', '-i', 'testsrc2=s=720x1280:r=30:d=14', '-f', 'lavfi', '-i', 'sine=f=600:d=14',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', P('vclip.mp4')]);
ff(['-f', 'lavfi', '-i', 'testsrc=s=1280x720:r=30:d=12', '-f', 'lavfi', '-i', 'sine=f=900:d=12',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', P('hclip.mp4')]);
ff(['-f', 'lavfi', '-i', 'mandelbrot=s=900x1350', '-frames:v', '1', P('vphoto.jpg')]);
ff(['-f', 'lavfi', '-i', 'smptehdbars=s=1600x900', '-frames:v', '1', P('wphoto.jpg')]);
ff(['-f', 'lavfi', '-i', 'color=c=0x223344:s=1280x720:d=1', '-frames:v', '1', P('cover.png')]);

const url = n => 'file://' + P(n);
const durSec = R.wavSeconds(P('narr.wav'));

console.log('=== ۱) قاب: افقی پر، عمودی کامل با حاشیهٔ تار — هیچ نوارِ سیاه ===');
{
  const lum = (file, x, y, w, h) => {
    const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf',
      'crop=' + w + ':' + h + ':' + x + ':' + y + ',scale=1:1,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-'],
      { maxBuffer: 1 << 20 });
    return r.stdout && r.stdout.length ? r.stdout[0] : -1;
  };
  MKIT.photo(FF, P('vphoto.jpg'), P('fv.jpg'));
  MKIT.photo(FF, P('wphoto.jpg'), P('fw.jpg'));
  const p1 = MKIT.probe(FF, P('fv.jpg')), p2 = MKIT.probe(FF, P('fw.jpg'));
  ok('۱.۱ هر دو عکس ۱۹۲۰×۱۰۸۰', p1.w === 1920 && p1.h === 1080 && p2.w === 1920 && p2.h === 1080,
     JSON.stringify([p1, p2]));
  const edge = lum(P('fv.jpg'), 0, 300, 200, 400);
  ok('۱.۲ عکسِ عمودی: دو طرف تار و رنگی است، نه سیاه', edge > 12, 'روشناییِ لبه ' + edge);
  const c = MKIT.clip(FF, P('vclip.mp4'), P('cv.mp4'), 2, 5);
  const pc = MKIT.probe(FF, c.file);
  ok('۱.۳ کلیپِ عمودی ⇒ ۱۹۲۰×۱۰۸۰، بی‌صدا، همان طول', pc.w === 1920 && pc.h === 1080 && !pc.audio &&
     Math.abs(pc.dur - 5) < 0.2, JSON.stringify(pc));
  ok('۱.۴ و آخرین قابش برای ادامهٔ صحنه ساخته شد', fs.existsSync(c.still) && fs.statSync(c.still).size > 1000);
  const c2 = MKIT.clip(FF, P('vclip.mp4'), P('cv2.mp4'), 12, 9);
  ok('۱.۵ تکهٔ بیش از ته کلیپ بریده نمی‌شود (از ۱۲ تا ۱۴)', Math.abs(MKIT.probe(FF, c2.file).dur - 2) < 0.3,
     String(MKIT.probe(FF, c2.file).dur));
}

console.log('=== ۱-ب) کارتِ پایانیِ ریل و صحنهٔ بلندتر از کلیپ (۹.۱۰، نمونهٔ ۷۳) ===');
{
  /* ریلِ ۸ ثانیه‌ای + ۳ ثانیه کارتِ پایانیِ تیره و ساکن (مثلِ نشانِ اینستاگرام) */
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=720x1280:r=30:d=8', '-f', 'lavfi', '-i', 'color=c=0x1a1a1a:s=720x1280:r=30:d=3',
      '-filter_complex', '[1:v]drawbox=x=320:y=600:w=80:h=80:color=white:t=fill[e];[0:v][e]concat=n=2:v=1:a=0[v]',
      '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', P('reel.mp4')]);
  const pr = MKIT.probe(FF, P('reel.mp4'));
  const ce = MKIT.contentEnd(FF, P('reel.mp4'), pr);
  ok('۱.۶ پایانِ محتوا پیش از کارتِ پایانی (~۸ از ۱۱)', ce > 7 && ce < 8.6, String(ce));
  const ceN = MKIT.contentEnd(FF, P('vclip.mp4'), MKIT.probe(FF, P('vclip.mp4')));
  ok('۱.۷ کلیپِ بی کارتِ پایانی بریده نمی‌شود', Math.abs(ceN - 14) < 0.3, String(ceN));
  const lumAt = (file, t) => {
    const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', file, '-vf',
      'scale=64:36,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
    return r.stdout || Buffer.alloc(0);
  };
  const mean = b => b.length ? b.reduce((a, x) => a + x, 0) / b.length : -1;
  const c3 = MKIT.clip(FF, P('reel.mp4'), P('cr.mp4'), 0, 24, pr, null, { fill: true });
  const d3 = MKIT.probe(FF, c3.file).dur;
  ok('۱.۸ صحنهٔ ۲۴ ثانیه‌ای با ریلِ ۸ ثانیه‌ای ⇒ ویدئو تا آخرِ صحنه، با قاب‌های پُرکننده',
     Math.abs(d3 - 24) < 0.4 && c3.filled >= 2 && c3.played < 8.7, JSON.stringify({ d3, filled: c3.filled, played: c3.played }));
  const tail = [9, 13, 17, 21, 23.5].map(t => mean(lumAt(c3.file, t)));
  ok('۱.۹ هیچ‌جای پُرکننده کارتِ تیرهٔ پایانی نیست', tail.every(v => v > 50), tail.map(Math.round).join(','));
  const sdiff = (a, b) => { let x = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) x += Math.abs(a[i] - b[i]); return x / Math.max(1, a.length); };
  const mv = [[10, 12], [14, 16], [19, 21]].map(([a, b]) => sdiff(lumAt(c3.file, a), lumAt(c3.file, b)));
  ok('۱.۱۰ پُرکننده ساکن نیست: هر دو ثانیه قاب عوض می‌شود', mv.every(v => v > 1.5), mv.map(v => v.toFixed(1)).join(','));
  const st3 = mean(spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-i', c3.still, '-vf', 'scale=64:36,format=gray',
    '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 }).stdout || Buffer.alloc(0));
  ok('۱.۱۱ «آخرین قاب» (برای کارتِ نوشتهٔ بعدی) از محتواست، نه از کارتِ پایانی', st3 > 50, String(Math.round(st3)));
  const c4 = MKIT.clip(FF, P('reel.mp4'), P('cr4.mp4'), 0, 24, pr, null, {});
  ok('۱.۱۲ بی `fill` همان رفتارِ پیشین (فقط تکهٔ کلیپ)', c4.filled === 0 && MKIT.probe(FF, c4.file).dur < 8.8,
     String(MKIT.probe(FF, c4.file).dur));
}

console.log('=== ۲) جای لحظه: روی مکث، هرگز روی موسیقی، فاصله‌دار ===');
{
  const sil = [3.8, 7.9, 12.0, 16.1, 20.2, 24.3, 28.4, 44.9];
  const notes = [];
  const pl = MKIT.placeMoments([{ at: 24.0 }, { at: 26.0 }, { at: 45.0 }, { at: 1.0 }], sil, [[44, 48]], 50, notes);
  ok('۲.۱ لحظهٔ اول روی نزدیک‌ترین مکث (۲۴٫۳)', pl.length === 1 && pl[0].at === 24.3, JSON.stringify(pl));
  ok('۲.۲ لحظهٔ نزدیکِ قبلی، روی موسیقی و لبه کنار رفتند — با علت', notes.length === 3, notes.join(' | '));
}

console.log('=== ۳) سرتاسری: ویدئوی رسانه‌ای با یک لحظه ===');
{
  const it = { key: 'variety:999', media: true, coverTitle: 'آزمون', coverKicker: 'از همه جا', coverFoot: 'قسمت ۹۹۹',
    scenes: [
      { n: 1, t0: 0, url: url('vclip.mp4'), say: 'الف', media: { kind: 'video', quote: 'عبارتِ کلیپِ عمودی' } },
      { n: 2, t0: 12.3, url: url('vphoto.jpg'), say: 'ب', media: { kind: 'photo' } },
      { n: 3, t0: 24.6, url: url('hclip.mp4'), say: 'پ', media: { kind: 'video', quote: 'عبارتِ کلیپِ افقی' } },
      { n: 4, t0: 36.9, url: url('wphoto.jpg'), say: 'ت', media: { kind: 'photo' } }
    ],
    moments: [{ at: 24.0, url: url('hclip.mp4'), quote: 'عبارتِ کلیپِ افقی', max: 5 }],
    mute: [[44, 48]] };
  /* شنیدن بیرون از اکشن نیست؛ جوابِ «پیدا شد» ساختگی است تا مسیرِ برش و لای‌گذاری واقعاً بدود. */
  const realFind = MKIT.find;
  MKIT.find = reqs => reqs.map(r => /افقی/.test(r.quote) ? { found: true, from: 3, to: 5.5, score: 1 }
                                                          : { found: false, why: 'آزمون: نشنیدم' });
  const t0 = Date.now();
  const vr = R.buildVideo(it, P('cover.png'), P('narr.wav'), durSec, P('out.mp4'), dir);
  MKIT.find = realFind;
  const sec = Math.round((Date.now() - t0) / 1000);
  ok('۳.۱ حالتِ «media» ساخته شد، نه افتادن به مسیرِ دیگر', vr.mode === 'media' && vr.n === 4,
     JSON.stringify({ mode: vr.mode, n: vr.n, notes: vr.notes }));
  ok('۳.۲ دو کلیپ و دو عکس؛ یکی از جای عبارت، یکی (نشنیده) از آغاز — و گفته شد', vr.media.clips === 2 &&
     vr.media.photos === 2 && vr.media.found === 1 && vr.media.notFound === 1 &&
     (vr.notes || []).some(x => /از آغاز/.test(x)), JSON.stringify(vr.media));
  const pr = MKIT.probe(FF, P('out.mp4'));
  const ins = vr.inserts || [];
  ok('۳.۳ یک لحظه لای گفتار نشست، سرِ مکث', ins.length === 1 && Math.abs(ins[0].at - 24.3) < 0.15,
     JSON.stringify(ins));
  ok('۳.۴ ویدئو به اندازهٔ همان لحظه از صوت بلندتر است', Math.abs(pr.dur - (durSec + ins[0].d)) < 0.35,
     'ویدئو ' + pr.dur + ' · صوت ' + durSec + ' · لحظه ' + ins[0].d);
  const sd = t => {
    const r = spawnSync(FF, ['-hide_banner', '-i', P('out.mp4'), '-map', '0:' + t, '-f', 'null', '-'], { encoding: 'utf8' });
    const m = String(r.stderr).match(/time=(\d+):(\d+):([\d.]+)/g);
    if (!m) return -1;
    const z = m[m.length - 1].match(/(\d+):(\d+):([\d.]+)/);
    return Number(z[1]) * 3600 + Number(z[2]) * 60 + Number(z[3]);
  };
  const dv = sd('v'), da = sd('a');
  ok('۳.۵ صدا و تصویر هم‌طول‌اند — هیچ ناهم‌زمانیِ تدریجی پس از لحظه', Math.abs(dv - da) < 0.25, 'تصویر ' + dv + ' · صدا ' + da);
  /* صدای لحظه: ۹۰۰ هرتزِ خودِ کلیپ؛ پس از لحظه دوباره ۳۰۰ هرتزِ گفتار */
  const tone = (t) => {
    const r = spawnSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-t', '0.5', '-i', P('out.mp4'),
      '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 22 });
    const b = r.stdout; let zc = 0, prev = 0, en = 0;
    for (let i = 0; i + 1 < b.length; i += 2) { const v = b.readInt16LE(i); if ((v >= 0) !== (prev >= 0)) zc++; prev = v; en += Math.abs(v); }
    return { hz: Math.round(zc / 2 / 0.5), lvl: Math.round(en / (b.length / 2)) };
  };
  const inMo = tone(ins[0].at + 1.0), after = tone(ins[0].at + ins[0].d + 1.5), before = tone(20.5);
  ok('۳.۶ درونِ لحظه صدای خودِ کلیپ (~۹۰۰ هرتز) شنیده می‌شود', Math.abs(inMo.hz - 900) < 60 && inMo.lvl > 300,
     JSON.stringify(inMo));
  ok('۳.۷ پیش و پس از لحظه گفتار (~۳۰۰ هرتز) — گوینده از همان جا ادامه می‌دهد', Math.abs(before.hz - 300) < 30 &&
     Math.abs(after.hz - 300) < 30, JSON.stringify([before, after]));
  ok('۳.۸ زیرِ گفتار صدای کلیپ نیست (صحنهٔ کلیپِ عمودی، ثانیهٔ ۲)', Math.abs(tone(2.0).hz - 300) < 30,
     JSON.stringify(tone(2.0)));
  ok('۳.۹ سنجشِ قاب‌ها (پیش از لای‌گذاری) گذشت', vr.qa && vr.qa.ok === true, JSON.stringify(vr.qa));
  /* پس از لحظه، تصویر **پسِ** همان تکه را نشان می‌دهد، نه دوباره خودش را (بی‌صدا). سنجه از خودِ
     قاب‌ها: قابِ ۱٫۵ ثانیه پس از لحظه (بیرون از میان‌محوِ مرزِ صحنه) به کلیپ در ~۷٫۷ (پس از تکه) نزدیک‌تر است تا ~۴٫۲ (تکرارِ تکه). */
  const SKIT = require('../tools/scenekit.js');
  const after1 = SKIT.gray(FF, P('out.mp4'), ins[0].at + ins[0].d + 1.5);
  const dPost = SKIT.mad(after1, SKIT.gray(FF, P('hclip.mp4'), 7.7));
  const dIn = SKIT.mad(after1, SKIT.gray(FF, P('hclip.mp4'), 4.25));
  ok('۳.۱۰ پس از لحظه، کلیپ از پسِ تکهٔ با‌صدا ادامه می‌یابد — نه تکرارِ بی‌صدای همان', dPost < 3 && dIn > dPost * 3,
     'فاصله با «پس از تکه» ' + dPost.toFixed(1) + ' · با «درونِ تکه» ' + dIn.toFixed(1));
  console.log('    (ساخت ' + sec + ' ثانیه)');
}

console.log('=== ۵) یافتنِ عبارت در گفتارِ کلیپ — روی شنیده‌های واقعی (۸.۹۸) ===');
{
  /* نمونهٔ ۷۲: شش کلیپ، هر شش «پیدا نشد» و هر سه لحظه با آن‌ها. واژه‌های این‌جا همان است که whisperِ
     small روی رانر از چهار کلیپِ واقعی شنید؛ پایتونِ رانر (clipfind.py) خودش داوری می‌کند. */
  const fx = JSON.parse(fs.readFileSync('tests/fixtures/clipwords.json', 'utf8'));
  const py = `
import sys, json
sys.path.insert(0, 'tools')
import clipfind as C
fx = json.load(open('tests/fixtures/clipwords.json', encoding='utf-8'))
out = []
for c in fx['clips']:
    words = [(t, s, e) for w, s, e in c['words'] for t in C.norm(w)]
    r = C.best_window(words, c['quote']); f = C.best_window(words, fx['fake'])
    out.append({'id': c['id'], 'ok': C.accept(r), 'from': r[1], 's': round(r[0], 2), 'sec': round(r[3], 2),
                'fake': C.accept(f), 'fs': round(f[0], 2)})
print(json.dumps(out))
`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  const got = JSON.parse((r.stdout || '[]').trim().split('\n').pop() || '[]');
  const byId = {}; got.forEach(g => { byId[g.id] = g; });
  ok('۵.۰ پایتونِ یابنده اجرا شد', got.length === fx.clips.length, r.stderr);
  for (const c of fx.clips) {
    const g = byId[c.id];
    if (c.expect === null) ok('۵.۱ ' + c.id.slice(0, 6) + ': صدای درهم ⇒ رد، نه جای غلط', g && !g.ok, JSON.stringify(g));
    else if (c.expect === 'any') ok('۵.۲ ' + c.id.slice(0, 6) + ': پیدا شد', g && g.ok, JSON.stringify(g));
    else ok('۵.۳ ' + c.id.slice(0, 6) + ': پیدا شد و سرِ جای درست', g && g.ok && g.from >= c.expect[0] && g.from <= c.expect[1], JSON.stringify(g));
  }
  /* ۹.۰۰ — نمونهٔ دوم: لحظهٔ «سروش» ۶٫۷ ثانیه و سرِ آخرین واژهٔ عبارت بریده شد. بخش‌های گفتاریِ واقعیِ کلیپِ
     «باید بپذیرم…» (whisper): ۴٫۷–۸٫۴، ۸٫۴–۱۲٫۲، ۱۲٫۹–۱۶٫۲. */
  const se = spawnSync('python3', ['-c', `
import sys; sys.path.insert(0, 'tools'); import clipfind as C
sp = [(0.0, 4.7), (4.7, 8.4), (8.4, 12.2), (12.9, 16.2), (16.2, 19.7), (19.7, 40.0)]
print(C.sentence_end(sp, 4.74, 7.9), C.sentence_end(sp, 4.74, 11.0), C.sentence_end(sp, 4.74, 19.0))`], { encoding: 'utf8' });
  const ends = String(se.stdout || '').trim().split(/\s+/).map(Number);
  ok('۵.۵ لحظه تا پایانِ جملهٔ گوینده می‌رود (نه آخرین واژهٔ عبارت)، دست‌کم ۶ ثانیه، حداکثر ۲۰',
     ends[0] === 12.2 && ends[1] === 12.2 && ends[2] <= 24.74 && ends[2] >= 19.7, se.stdout + se.stderr);
  /* ۹.۰۴ — عبارت دقیق پیدا نشد ⇒ بخشِ اصلیِ گفتارِ خودِ کلیپ، نه سکوت. کلیپِ اولِ قسمتِ ۷۲ (`1sP7uKbZ`، بهترین
     پنجره ۰٫۵۴ نزدیکِ ثانیهٔ ۴٫۶) در نمونهٔ پنجم اصلاً با صدا پخش نشد. */
  const mp = spawnSync('python3', ['-c', `
import sys, json; sys.path.insert(0, 'tools'); import clipfind as C
sp = [(0.0, 4.7), (4.7, 8.4), (8.4, 12.2), (12.9, 16.2), (16.2, 19.7), (30.0, 35.0)]
fx = json.load(open('tests/fixtures/clipwords.json', encoding='utf-8'))
c = [x for x in fx['clips'] if x['id'].startswith('1sP7uKbZ')][0]
words = [(t, s, e) for w, s, e in c['words'] for t in C.norm(w)]
bw = C.best_window(words, c['quote'])
print(json.dumps([C.main_part(sp, None), C.main_part(sp, 9.0), C.main_part([], None), round(bw[0], 2), C.accept(bw)]))`], { encoding: 'utf8' });
  let M = null; try { M = JSON.parse(String(mp.stdout).trim()); } catch (e) {}
  ok('۵.۷ بی نشانه ⇒ بلندترین گفتارِ پیوسته، ۶ تا ۲۰ ثانیه، از آغازِ جمله', M && M[0].from === 0 && M[0].end === 8.4 && M[0].how === 'longest', mp.stdout + mp.stderr);
  ok('۵.۸ نشانهٔ احتمالی ⇒ آغازِ همان جملهٔ گوینده (نه آغازِ کلِ گفتار)', M && M[1].from === 8.4 && M[1].end === 16.2 && M[1].how === 'probable', JSON.stringify(M && M[1]));
  ok('۵.۹ کلیپِ بی‌گفتار ⇒ هیچ (null)', M && M[2] === null);
  ok('۵.۱۰ (شاهد) کلیپِ اولِ قسمتِ ۷۲ با سنجشِ دقیق رد می‌شد — همان «اصلاً پخش نشد»', M && M[3] >= 0.45 && M[4] === false, String(M && M[3]));
  const rj5 = fs.readFileSync('tools/render.js', 'utf8');
  ok('۵.۱۱ رانر لحظه و آغازِ صحنه را از `main` می‌گیرد وقتی عبارت پیدا نشد',
     /const fb = h && !h\.found && h\.main/.test(rj5) && /from = Math\.max\(0, Number\(h\.main\.from\) - MKIT\.MK\.lead\)/.test(rj5) &&
     /'main': main_part\(cache\[f \+ '#spans'\], bw\[1\] if bw\[0\] >= 0\.45 else None\)/.test(fs.readFileSync('tools/clipfind.py', 'utf8')));
  ok('۵.۶ رانر طولِ لحظه را از `end` می‌گیرد', /const stop = fb \? Number\(fb\.end\) : \(Number\(h\.end\) > Number\(h\.to\)/.test(rj5));
  ok('۵.۴ جملهٔ ساختگی در هیچ کلیپی پذیرفته نمی‌شود', got.every(g => !g.fake), JSON.stringify(got.map(g => g.fs)));
}

console.log('=== ۶) چیدمان و حرکت (۸.۹۹) — «همه وسط، ریز، بی‌افکت» ===');
{
  /* اسکرین‌شاتِ ساختگیِ گوشی: نوارِ وضعیتِ خاکستری بالا، حاشیهٔ سفید، محتوای پرجزئیات، نوارِ تیرهٔ پایین. */
  const shot = P('shot.png');
  ff(['-f', 'lavfi', '-i', 'color=c=white:s=1080x2400:d=1', '-f', 'lavfi', '-i', 'mandelbrot=s=1000x1500:end_pts=1',
      '-filter_complex', '[0:v]drawbox=x=0:y=0:w=1080:h=110:color=0x707070:t=fill,drawbox=x=0:y=2180:w=1080:h=220:color=0x202020:t=fill[b];' +
      '[b][1:v]overlay=40:330,format=rgb24', '-frames:v', '1', shot]);
  const box = MKIT.contentBox(FF, shot, null, { photo: true });
  ok('۶.۱ جعبهٔ محتوا: نوارِ وضعیت، حاشیهٔ سفیدِ بالا و نوارِ پایین بریده شد؛ خودِ محتوا ماند',
     box && box.y >= 300 && box.y <= 345 && box.y + box.h <= 1850 && box.y + box.h >= 1790 && box.x >= 30 && box.x <= 50,
     JSON.stringify(box));
  const pc = MKIT.photoClip(FF, shot, P('shot.mp4'), 8, { layout: 'right' });
  ok('۶.۲ اسکرین‌شاتِ بلند ⇒ «پیمایش»، و ۱۹۲۰×۱۰۸۰ به همان طول', pc.kind === 'scroll' &&
     Math.abs(MKIT.probe(FF, pc.file).dur - 8) < 0.2 && MKIT.probe(FF, pc.file).w === 1920, JSON.stringify(pc.kind));
  const lumaAt = (f, t, x, y, w, h) => {
    const b = execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', f, '-frames:v', '1',
      '-vf', 'crop=' + w + ':' + h + ':' + x + ':' + y + ',scale=16:16,format=gray', '-f', 'rawvideo', '-']);
    return Array.from(b);
  };
  const diff = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
  const dScroll = diff(lumaAt(pc.file, 0.5, 900, 100, 800, 800), lumaAt(pc.file, 7.5, 900, 100, 800, 800));
  ok('۶.۳ خودِ اسکرین‌شات حرکت می‌کند (آغاز و پایان فرق دارند)', dScroll > 8, dScroll.toFixed(1));
  const dLeft = diff(lumaAt(pc.file, 0.5, 40, 100, 500, 800), lumaAt(pc.file, 7.5, 40, 100, 500, 800));
  ok('۶.۴ چیدمانِ «راست»: نیمهٔ چپ پس‌زمینهٔ آرام است — جای کارتِ برداری', dLeft < 4, dLeft.toFixed(1));
  const wide = P('wide.png');
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=1600x900:d=1', '-frames:v', '1', wide]);
  const pw = MKIT.photoClip(FF, wide, P('wide.mp4'), 6, { layout: 'left' });
  const dKb = diff(lumaAt(pw.file, 0.3, 560, 240, 800, 600), lumaAt(pw.file, 5.7, 560, 240, 800, 600));
  ok('۶.۵ عکسِ افقی ⇒ کن‌برنز روی کلِ قاب (افکت دیده می‌شود)', pw.layout === 'fill' && pw.kind === 'kb' && dKb > 3, dKb.toFixed(1));
  ok('۶.۶ چیدمان‌ها به نوبت‌اند، نه همه وسط', ['left', 'center', 'right'].every((L, i) => MKIT.layoutOf(i) === L) && MKIT.layoutOf(3) === 'left');
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۶.۷ رانر عکس را کلیپِ زنده می‌کند و «لحظه» چیدمانِ صحنه‌اش را می‌گیرد',
     /MKIT\.photoClip\(FF, srcImg, out \+ '\.mp4', want, \{ layout: layOf\[s\.n\], card: isCard \}\)/.test(rj) &&
     /MKIT\.moment\(FF, g\.file, v, a, c\.from, c\.len, g\.info, enc, \{ layout: c\.layout/.test(rj));
}

console.log('=== ۷) کارتِ نوشته (۹.۰۱) — «حالت برداری کم استفاده شده بود» ===');
{
  const cov = P('cover.png');
  ff(['-f', 'lavfi', '-i', 'testsrc2=s=1280x720:d=1', '-frames:v', '1', cov]);
  const pk = MKIT.photoClip(FF, cov, P('card.mp4'), 6, { layout: 'right', card: true });
  const pr = MKIT.probe(FF, pk.file);
  ok('۷.۱ کارت ⇒ تمام‌قاب ۱۹۲۰×۱۰۸۰ به همان طول', pk.kind === 'card' && pk.layout === 'fill' && pr.w === 1920 &&
     Math.abs(pr.dur - 6) < 0.2, pk.kind + ' ' + pr.w + ' ' + pr.dur);
  /* لبه‌های تیز (اختلافِ دو پیکسلِ کنارِ هم > ۱۲) در اندازهٔ واقعی: نوشته و خط در تصویرِ محو نمی‌مانَد. */
  const sdOf = (f, t) => {
    const b = Array.from(execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', f, '-frames:v', '1',
      '-vf', 'crop=480:480:720:300,format=gray', '-f', 'rawvideo', '-']));
    const m = b.reduce((a, v) => a + v, 0) / b.length;
    let sharp = 0; for (let i = 1; i < b.length; i++) if (Math.abs(b[i] - b[i - 1]) > 12) sharp++;
    return { m: Math.round(m), sharp: sharp };
  };
  const kb = MKIT.photoClip(FF, cov, P('cardkb.mp4'), 6, { layout: 'right' });
  const a = sdOf(pk.file, 1), b = sdOf(kb.file, 1);
  ok('۷.۲ پس‌زمینهٔ کارت محو و تیره‌تر از همان کاور است — جای نوشته', a.sharp < b.sharp * 0.2 && a.m < b.m,
     JSON.stringify({ card: a, plain: b }));
  /* ۹.۰۴: سنجهٔ شلوغی تصویرِ صحنه را می‌بیند؛ در نمونهٔ پنجم ده کارت از نوزده «شلوغ» کنار رفتند و کاورِ خالی ماند.
     shoot بدَل است (مستطیلِ مات روی زمینهٔ شفاف) — آنچه سنجیده می‌شود تصمیمِ جاگذاری است، نه مرورگر. */
  const OVL = require('../tools/overlay.js');
  const busy = P('busy.png');
  ff(['-f', 'lavfi', '-i', 'mandelbrot=s=1920x1080', '-frames:v', '1', busy]);
  const ctx = { ff: FF, ffRun: a => ff(a), dir: dir, shoot: (h, png) => {
    ff(['-f', 'lavfi', '-i', 'color=c=black@0:s=1920x1080,format=rgba', '-f', 'lavfi', '-i', 'color=c=white:s=640x420,format=rgba',
        '-filter_complex', 'overlay=200:200:format=auto', '-frames:v', '1', png]); return png; } };
  const ov = OVL.ovNorm({ kind: 'points', title: 'تیتر', lines: ['یک', 'دو', 'سه'] });
  const r0 = OVL.render(ctx, ov, busy, 1, []);
  const r1 = OVL.render(ctx, ov, busy, 2, [], { force: true });
  ok('۷.۳ زمینهٔ شلوغ بی force ⇒ کنار می‌رود؛ صحنهٔ کارت (force) ⇒ می‌نشیند، با پنل (نه آرام) و سه مرحلهٔ آشکارشدن',
     r0 && r0.skip === 'busy' && r1 && r1.file && fs.existsSync(r1.file) && r1.forced === true && r1.calm === false &&
     (r1.stages || []).length === 3, JSON.stringify({ r0: r0 && r0.skip, r1: r1 && (r1.skip || r1.forced), st: r1 && (r1.stages || []).length }));
  const sk = fs.readFileSync('tools/scenekit.js', 'utf8');
  ok('۷.۴ scenekit برای صحنهٔ کارت force می‌فرستد', /OVL\.render\(ovCtx, s\.ov, ctx\.imgs\[String\(s\.n\)\], k, avoid, \{ force: !!\(s\.media && s\.media\.card\) \}\)/.test(sk));
}

console.log('=== ۴) سیم‌کشی ===');
{
  const r = fs.readFileSync('tools/render.js', 'utf8');
  ok('۴.۱ نقشهٔ رندر حالت، آمارِ رسانه و inserts را می‌نویسد', /map\.items\[it\.key\]\.mode = vr\.mode/.test(r) &&
     /map\.items\[it\.key\]\.inserts = vr\.inserts/.test(r) && /map\.items\[it\.key\]\.media = vr\.media/.test(r));
  const w = fs.readFileSync('.github/workflows/render.yml', 'utf8');
  ok('۴.۲ رانر faster-whisper دارد (همان که clipfind.py می‌خواهد)', /faster-whisper/.test(w));
}

if (process.env.KEEP !== '1') { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {} } else console.log('    (پوشه ماند: ' + dir + ')');
console.log('\n✅ همهٔ ' + pass + ' سنجهٔ ساختِ ویدئوی رسانه‌ای گذشت.');
