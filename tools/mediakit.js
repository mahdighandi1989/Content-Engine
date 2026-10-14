'use strict';
/**
 * رسانه‌های خودِ منبع برای ویدئوی «از همه جا» (۸.۹۶) — طرفِ رانر.
 *
 * موتور می‌گوید کدام کلیپ یا عکس از کدام ثانیهٔ گفتار روی صفحه بیاید، و برای کلیپ کدام **تکهٔ
 * گفتارِ خودش** («clipQuote»). این‌جا سه کار می‌شود، همه با ffmpeg، بی هیچ مدلِ پولی:
 *
 *   ۱) **کدام تکه** — `clipfind.py` گفتارِ کلیپ را با زمانِ هر واژه می‌شنود و همان عبارت را پیدا
 *      می‌کند؛ کلیپ از همان‌جا بریده می‌شود. نشنید یا نیافت ⇒ از آغازِ کلیپ، و گفته می‌شود.
 *   ۲) **قاب** — خواستهٔ صاحبِ برنامه: «از نظرِ هم‌سایز بودن با کادر برش بزنه … ظاهر و زیبایی را به
 *      هم نزنه». رسانهٔ افقی قاب را پر می‌کند. رسانهٔ عمودی یا مربعی (بیشترِ کلیپ‌های منبع) اگر بُریده
 *      شود، دو-سومش — چهره، نوشته — دور ریخته می‌شود؛ پس **کامل** در وسط می‌نشیند و دو طرفش با
 *      نسخهٔ تار و تیره‌ترِ خودش پر می‌شود. هیچ نوار سیاهی، هیچ چهرهٔ بریده‌ای.
 *   ۳) **صدا** — زیرِ گفتار، کلیپ بی‌صداست. «لحظه»ها جدا ساخته می‌شوند: همان تکه، با صدای خودش
 *      (بلندیِ یکسان‌شده، آغاز و پایانِ نرم)، و رانر آن را **لای** گفتار می‌گذارد — گوینده ساکت است،
 *      نه زیرِ صدای کلیپ؛ و هرگز روی موسیقی.
 *
 * هیچ‌چیز این‌جا ویدئو را زمین نمی‌زند: رسانه‌ای که نیامد یا خوانده نشد، صحنه‌اش به قبلی می‌پیوندد
 * (scenekit) و یادداشت می‌شود.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const MK = {
  w: 1920, h: 1080, fps: 24,      // همان SK.fps — لحظه و تکه‌های بی‌صدا باید بی بازکدگذاری پشتِ‌هم بنشینند
  wideMin: 1.55, wideMax: 2.1,     // در این بازه قاب را پر می‌کند؛ بیرونش کامل + حاشیهٔ تار
  segMax: 60,                      // بلندترین تکهٔ کلیپ که برای یک صحنه بریده می‌شود
  lead: 0.6,                       // چند ثانیه پیش از عبارت (تا جمله از وسط شروع نشود)
  momentMin: 3, momentTail: 0.7,
  fadeV: 0.25, fadeA: 0.12,
  loud: 'loudnorm=I=-16:TP=-1.5:LRA=11',
  crf: 20
};

/** مدت، اندازه و صدا داشتن — از گزارشِ خودِ ffmpeg. خوانده نشد ⇒ null. */
function probe(ff, file) {
  const r = spawnSync(ff, ['-hide_banner', '-i', file], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const t = String(r.stderr || '');
  const d = t.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const v = t.match(/Stream #[^\n]*Video:[^\n]*?(\d{2,5})x(\d{2,5})/);
  if (!v) return null;
  /* چرخشِ ضبطِ گوشی: ویدئوی «۱۹۲۰×۱۰۸۰» با rotate=90 در واقع عمودی است. ffmpeg هنگامِ خواندن
     خودش می‌چرخاند، پس اندازهٔ **نمایش** همان جابه‌جاشده است. */
  let w = Number(v[1]), h = Number(v[2]);
  if (/rotate\s*:\s*-?(90|270)|rotation of -?(90|270)/i.test(t)) { const z = w; w = h; h = z; }
  return { dur: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0,
           w: w, h: h, audio: /Stream #[^\n]*Audio:/.test(t) };
}

/** قاب: افقی ⇒ پر؛ وگرنه کامل در وسط + نسخهٔ تار و تیرهٔ خودش در پس‌زمینه. */
function frameFilter(w, h, inl, outl) {
  const ar = w && h ? w / h : 16 / 9;
  if (ar >= MK.wideMin && ar <= MK.wideMax) {
    return '[' + inl + ']scale=' + MK.w + ':' + MK.h + ':force_original_aspect_ratio=increase,crop=' + MK.w + ':' +
           MK.h + ',setsar=1,format=yuv420p[' + outl + ']';
  }
  return '[' + inl + ']split=2[' + outl + 'a][' + outl + 'b];' +
    '[' + outl + 'a]scale=480:270:force_original_aspect_ratio=increase,crop=480:270,boxblur=18:2,' +
    'eq=brightness=-0.10:saturation=0.75,scale=' + MK.w + ':' + MK.h + '[' + outl + 'g];' +
    '[' + outl + 'b]scale=' + MK.w + ':' + Math.round(MK.h * 0.96) + ':force_original_aspect_ratio=decrease[' + outl + 'f];' +
    '[' + outl + 'g][' + outl + 'f]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[' + outl + ']';
}

function run(ff, args) {
  execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y'].concat(args), { stdio: ['ignore', 'ignore', 'pipe'] });
}

/** عکس ⇒ JPEGِ ۱۹۲۰×۱۰۸۰ با همان قاب. */
function photo(ff, file, out) {
  const p = probe(ff, file) || { w: 0, h: 0 };
  run(ff, ['-i', file, '-frames:v', '1', '-filter_complex', frameFilter(p.w, p.h, '0:v', 'o'), '-map', '[o]',
           '-q:v', '3', out]);
  return out;
}

/**
 * تکه‌ای از کلیپ ⇒ MP4ِ بی‌صدای ۱۹۲۰×۱۰۸۰، و آخرین قابش (برای وقتی که صحنه از کلیپ بلندتر است).
 * `skip` = {at, len} (زمانِ خودِ کلیپ): همان تکه‌ای که «لحظه» با صدایش پخش می‌کند، از این تکهٔ
 * بی‌صدا **برداشته** می‌شود — وگرنه بیننده پس از لحظه همان را دوباره، بی‌صدا، می‌بیند.
 */
function clip(ff, file, out, from, len, info, skip) {
  const p = info || probe(ff, file);
  if (!p) throw new Error('کلیپ خوانده نشد');
  const L = Math.max(1, Math.min(MK.segMax, len, Math.max(1, p.dur - from)));
  let pre = '[0:v]fps=' + MK.fps + '[s];';
  let inArgs = ['-ss', from.toFixed(2), '-t', L.toFixed(2), '-i', file];
  if (skip && skip.at > from + 0.3 && skip.at + skip.len < p.dur - 0.5) {
    const a = skip.at - from, b = skip.at + skip.len - from;
    const rest = Math.max(0.5, Math.min(L - a, p.dur - (skip.at + skip.len)));
    inArgs = ['-ss', from.toFixed(2), '-t', (b + rest).toFixed(2), '-i', file];
    pre = '[0:v]fps=' + MK.fps + ',split=2[p1][p2];[p1]trim=end=' + a.toFixed(3) + ',setpts=PTS-STARTPTS[q1];' +
          '[p2]trim=start=' + b.toFixed(3) + ',setpts=PTS-STARTPTS[q2];[q1][q2]concat=n=2:v=1:a=0[s];';
  } else if (skip && skip.at <= from + 0.3) {
    /* لحظه همان آغازِ این تکه است ⇒ تکهٔ بی‌صدا از پایانِ لحظه شروع می‌شود. */
    const f2 = Math.min(Math.max(0, p.dur - 1), skip.at + skip.len);
    inArgs = ['-ss', f2.toFixed(2), '-t', Math.max(1, Math.min(L, p.dur - f2)).toFixed(2), '-i', file];
  }
  run(ff, inArgs.concat(['-filter_complex', pre + frameFilter(p.w, p.h, 's', 'o'),
           '-map', '[o]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(MK.crf),
           '-pix_fmt', 'yuv420p', '-r', String(MK.fps), out]));
  const still = out.replace(/\.mp4$/, '') + '-last.jpg';
  run(ff, ['-sseof', '-0.2', '-i', out, '-frames:v', '1', '-q:v', '3', still]);
  return { file: out, still: still, len: L };
}

/** «لحظه»: همان تکه، **با صدای خودش** — بلندیِ یکسان، آغاز و پایانِ نرم، صوتِ ۴۸ کیلوهرتزِ دوکاناله. */
function moment(ff, file, outV, outA, from, len, info, enc) {
  const p = info || probe(ff, file);
  if (!p || !p.audio) throw new Error('کلیپِ لحظه صدا ندارد');
  const L = Math.max(MK.momentMin, Math.min(len, Math.max(1, p.dur - from)));
  const fv = MK.fadeV, fa = MK.fadeA;
  run(ff, ['-ss', from.toFixed(2), '-t', L.toFixed(2), '-i', file,
           '-filter_complex', '[0:v]fps=' + MK.fps + '[s];' + frameFilter(p.w, p.h, 's', 'f') +
           ';[f]fade=t=in:st=0:d=' + fv + ',fade=t=out:st=' + (L - fv).toFixed(2) + ':d=' + fv + '[o]',
           '-map', '[o]', '-an'].concat(enc).concat([outV]));
  run(ff, ['-ss', from.toFixed(2), '-t', L.toFixed(2), '-i', file, '-vn',
           '-af', MK.loud + ',afade=t=in:st=0:d=' + fa + ',afade=t=out:st=' + (L - fa).toFixed(2) + ':d=' + fa +
           ',aresample=48000', '-ac', '2', '-c:a', 'pcm_s16le', outA]);
  return { len: L };
}

/**
 * جای عبارت در گفتارِ هر کلیپ — یک بار بارگذاریِ مدل برای همه (`clipfind.py`).
 * بیرون از اکشن، یا وقتی ابزار نیست ⇒ همه «نشنیدم»، نه «نبود».
 */
function find(reqs, dir) {
  const out = reqs.map(() => ({ found: false, why: 'شنیده نشد' }));
  if (!reqs.length) return out;
  if (process.env.GITHUB_ACTIONS !== 'true' && process.env.CLIPFIND !== '1') {
    return reqs.map(() => ({ found: false, why: 'بیرون از اکشن شنیده نشد' }));
  }
  try {
    const f = path.join(dir, 'clipfind.json');
    fs.writeFileSync(f, JSON.stringify(reqs));
    const res = execFileSync('python3', [path.join(__dirname, 'clipfind.py'), f],
                             { encoding: 'utf8', timeout: 12 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 });
    const j = JSON.parse(String(res).trim().split('\n').pop());
    if (Array.isArray(j) && j.length === reqs.length) return j;
    return out.map(() => ({ found: false, why: 'پاسخِ شنیدن ناقص بود' }));
  } catch (e) {
    return out.map(() => ({ found: false, why: 'شنیدن نشد: ' + String(e.message).split('\n')[0].slice(0, 80) }));
  }
}

/**
 * جای «لحظه»ها روی صوتِ گفتار: نزدیک‌ترین مکث به زمانِ موتور (±۲٫۵ ثانیه)، هرگز درونِ موسیقی،
 * و دست‌کم ۲۰ ثانیه از هم. آنچه جا نشد ⇒ کنار، با علت.
 */
function placeMoments(moments, sil, mute, durSec, notes) {
  const inMute = t => (mute || []).some(m => t > Number(m[0]) - 0.5 && t < Number(m[1]) + 0.5);
  const out = [];
  for (const m of (moments || []).slice().sort((a, b) => a.at - b.at)) {
    let best = null, bd = 2.6;
    for (const s of (sil || [])) {
      const d = Math.abs(s - m.at);
      if (d < bd && !inMute(s)) { bd = d; best = s; }
    }
    if (best === null) { notes.push('لحظهٔ ' + Math.round(m.at) + 's: مکثی بیرون از موسیقی نزدیکش نبود'); continue; }
    if (best < 3 || best > durSec - 3) { notes.push('لحظهٔ ' + Math.round(m.at) + 's: لبهٔ قسمت'); continue; }
    if (out.length && best - out[out.length - 1].at < 20) { notes.push('لحظهٔ ' + Math.round(m.at) + 's: نزدیکِ لحظهٔ قبلی'); continue; }
    out.push(Object.assign({}, m, { at: Math.round(best * 1000) / 1000 }));
  }
  return out;
}

/**
 * لای‌گذاریِ لحظه‌ها، **بی بازکدگذاری**: ویدئوی بی‌صدا سرِ قاب‌های کلیدیِ همان زمان‌ها (scenekit
 * با `kf` گذاشته) بریده می‌شود؛ صوت به نمونه بریده می‌شود؛ تکه‌ها و لحظه‌ها پشتِ‌هم.
 * @return {{inserts: Array<{at:number, d:number}>}}
 */
function splice(ff, silent, wav, parts, dest, dir) {
  const W = path.join(dir, 'narr48.wav');
  run(ff, ['-i', wav, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', W]);
  const vl = [], al = [], inserts = [];
  let prev = 0, k = 0;
  const cutV = (a, b, out) => {
    /* آغاز کمی **پس** از قابِ کلیدی (نیم‌هزارم): گردکردن نباید جست‌وجو را به قابِ کلیدیِ پیشین ببرد. */
    const args = ['-ss', (a ? a + 0.0005 : 0).toFixed(4)];
    if (b !== null) args.push('-to', b.toFixed(4));
    run(ff, args.concat(['-i', silent, '-c', 'copy', '-avoid_negative_ts', 'make_zero', out]));
  };
  const cutA = (a, b, out) => {
    const f = 'atrim=start=' + a.toFixed(4) + (b !== null ? ':end=' + b.toFixed(4) : '') + ',asetpts=PTS-STARTPTS';
    run(ff, ['-i', W, '-af', f, '-c:a', 'pcm_s16le', out]);
  };
  for (const p of parts) {
    const v = path.join(dir, 'spv' + k + '.mp4'), a = path.join(dir, 'spa' + k + '.wav');
    cutV(prev, p.at, v); cutA(prev, p.at, a);
    vl.push(v); al.push(a);
    vl.push(p.v); al.push(p.a);
    inserts.push({ at: Math.round(p.at * 10) / 10, d: Math.round(p.len * 10) / 10 });
    prev = p.at; k++;
  }
  const v = path.join(dir, 'spv' + k + '.mp4'), a = path.join(dir, 'spa' + k + '.wav');
  cutV(prev, null, v); cutA(prev, null, a);
  vl.push(v); al.push(a);
  const lv = path.join(dir, 'spv.txt'), la = path.join(dir, 'spa.txt');
  fs.writeFileSync(lv, vl.map(x => "file '" + x + "'").join('\n'));
  fs.writeFileSync(la, al.map(x => "file '" + x + "'").join('\n'));
  const V = path.join(dir, 'spall.mp4'), A = path.join(dir, 'spall.wav');
  run(ff, ['-f', 'concat', '-safe', '0', '-i', lv, '-c', 'copy', V]);
  run(ff, ['-f', 'concat', '-safe', '0', '-i', la, '-c', 'copy', A]);
  run(ff, ['-i', V, '-i', A, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
           '-shortest', '-movflags', '+faststart', dest]);
  return { inserts: inserts };
}

module.exports = { MK, probe, frameFilter, photo, clip, moment, find, placeMoments, splice };
