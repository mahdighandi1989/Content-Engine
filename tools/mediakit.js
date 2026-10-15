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
  segMax: 60,
  tailMax: 12, tailMin: 0.8, tailDark: 38, tailStill: 0.6,   // ۹.۱۰: کارتِ پایانیِ ریل جزوِ محتوا نیست
  fillFrom: 4, fillSeg: 8, fillMax: 8,
  collageMax: 4,                                              // ۹.۱۱: کاشی‌های کلاژِ پیش‌نمایش                        // ۹.۱۰: صحنهٔ بلندتر از کلیپ ⇒ چند قابِ متحرک، نه یک قابِ ساکن                      // بلندترین تکهٔ کلیپ که برای یک صحنه بریده می‌شود
  lead: 0.6,                       // چند ثانیه پیش از عبارت (تا جمله از وسط شروع نشود)
  momentMin: 3, momentTail: 0.7,
  fadeV: 0.35, fadeA: 0.45,      // ۹.۰۰: پایانِ صدا ۰٫۱۲ ثانیه بود — «سریع قطع می‌شد»
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

/* ══ چیدمان (۸.۹۹) ══
 * صاحبِ برنامه نمونهٔ اول را دید: «همش اون اسکرین و عکس و کلیپ در وسطِ کادر بود و بقیه‌ش رو مات می‌کرد
 * … گاهی در چپ و راست و گاهی در وسط دیده بشن و در قسمت‌های خالی و مات‌شده حالتِ برداری و نوشتاری».
 * پس سه جعبه، و رسانهٔ غیرِافقی به نوبت در یکی‌شان می‌نشیند؛ نیمهٔ خالی جای کارتِ برداری است (کارت جای
 * آرامِ قاب را خودش پیدا می‌کند — `overlay.analyze`). سایهٔ نرم زیرِ رسانه، تا از پس‌زمینه جدا شود. */
const BOX = {
  center: { cx: 960, bw: 1700, bh: 1000 },
  left: { cx: 600, bw: 1000, bh: 1000 },
  right: { cx: 1320, bw: 1000, bh: 1000 }
};
const LAYOUTS = ['left', 'center', 'right'];
const ev = v => Math.max(2, Math.round(v / 2) * 2);
const wideAr = ar => ar >= MK.wideMin && ar <= MK.wideMax;

/**
 * جعبهٔ محتوا (۸.۹۹): «اسکرین‌ها رو خوب برش نمی‌زد و با همون شکلی که تو موبایل گرفته شده بود رو صفحه
 * می‌آورد … هیچی از عکس و اسکرین دیده نمی‌شد و خیلی همه‌چیز ریز بود». نوارِ وضعیتِ گوشی، نوارِ پایین
 * (پیام، دکمه‌ها) و حاشیهٔ یکدست بریده می‌شود تا خودِ محتوا بزرگ‌تر بنشیند.
 * - اسکرین‌شاتِ گوشی (عمودیِ کشیده): ۶٪ بالا و ۱۱٫۵٪ پایین (نوارِ «پیام» و دکمه‌های اینستاگرام در نمونهٔ ۷۲ با ۸٪ می‌ماند)، بعد حاشیهٔ تخت.
 * - بقیه: فقط حاشیهٔ تخت و یکرنگ با لبه، حداکثر ۱۲٪ از هر سو — آسمانِ صاف بخشی از عکس است.
 * برشی که بیش از نیمی را ببَرد پذیرفته نمی‌شود (یعنی سنجش اشتباه کرده). بازگشت به پیکسلِ اصلی، یا null.
 */
function contentBox(ff, file, info, opt) {
  const p = info || probe(ff, file);
  if (!p || !p.w || !p.h) return null;
  const SW = 160;
  let buf;
  try {
    buf = execFileSync(ff, ['-hide_banner', '-loglevel', 'error'].concat(opt && opt.at ? ['-ss', String(opt.at)] : [])
      .concat(['-i', file, '-frames:v', '1', '-vf', 'scale=' + SW + ':-2,format=gray', '-f', 'rawvideo', '-']),
      { maxBuffer: 32 * 1024 * 1024 });
  } catch (e) { return null; }
  const H = Math.floor(buf.length / SW);
  if (H < 24) return null;
  const at = (x, y) => buf[y * SW + x];
  const stat = (n, f) => { let m = 0, q = 0; for (let i = 0; i < n; i++) { const v = f(i); m += v; q += v * v; } m /= n; return { m, sd: Math.sqrt(Math.max(0, q / n - m * m)) }; };
  const row = (y, l, r) => stat(r - l + 1, i => at(l + i, y));
  const col = (x, t, b) => stat(b - t + 1, i => at(x, t + i));
  const ar = p.w / p.h;
  const phone = !!(opt && opt.photo) && ar <= 0.62;
  let top = phone ? Math.round(H * 0.06) : 0, bot = phone ? Math.round(H * 0.885) : H - 1;
  let left = 0, right = SW - 1;
  const capY = Math.round(H * (phone ? 0.25 : 0.12)), capX = Math.round(SW * 0.12);
  const edge = row(top, 0, SW - 1).m;
  const flat = (st, ref) => st.sd < 4.5 && Math.abs(st.m - ref) < 8;
  const t0 = top, b0 = bot;
  while (top < bot && top - t0 < capY && flat(row(top, left, right), edge)) top++;
  const edgeB = row(bot, 0, SW - 1).m;
  while (bot > top && b0 - bot < capY && flat(row(bot, left, right), edgeB)) bot--;
  const edgeL = col(0, top, bot).m, edgeR = col(SW - 1, top, bot).m;
  while (left < right && left < capX && flat(col(left, top, bot), edgeL)) left++;
  while (right > left && SW - 1 - right < capX && flat(col(right, top, bot), edgeR)) right--;
  const w = right - left + 1, h = bot - top + 1;
  if (w < SW * 0.5 || h < H * 0.5) return null;
  const kx = p.w / SW, ky = p.h / H;
  const box = { x: ev(left * kx), y: ev(top * ky), w: ev(w * kx), h: ev(h * ky) };
  box.w = Math.min(box.w, p.w - box.x); box.h = Math.min(box.h, p.h - box.y);
  if (box.w >= p.w * 0.97 && box.h >= p.h * 0.97) return null;
  return box;
}

/** هندسهٔ رسانه در قاب: اندازه و جایِ نشستن در جعبهٔ چیدمان. */
function placeIn(cw, ch, layout) {
  const L = BOX[layout] || BOX.center;
  const sc = Math.min(L.bw / cw, L.bh / ch);
  const fw = ev(cw * sc), fh = ev(ch * sc);
  return { fw: fw, fh: fh, x: ev(L.cx - fw / 2), y: ev(Math.max(40, 540 - fh / 2)), L: L };
}

const BG = (inl, outl) => '[' + inl + ']scale=480:270:force_original_aspect_ratio=increase,crop=480:270,boxblur=18:2,' +
  'eq=brightness=-0.12:saturation=0.72,scale=' + MK.w + ':' + MK.h + '[' + outl + ']';
const SHADOW = (inl, outl, x, y, w, h) => '[' + inl + ']drawbox=x=' + (x + 16) + ':y=' + (y + 20) + ':w=' + w + ':h=' + h +
  ':color=black@0.55:t=fill,boxblur=14:1[' + outl + ']';

/**
 * قاب: افقی ⇒ پر؛ وگرنه کامل در جعبهٔ چیدمان + پس‌زمینهٔ تارِ خودش + سایه.
 * `opt.box` (جعبهٔ محتوا) پیش از هر چیز بریده می‌شود؛ `opt.layout` جعبه را می‌گوید.
 */
function frameFilter(w, h, inl, outl, opt) {
  const o = opt || {};
  const cw = o.box ? o.box.w : w, ch = o.box ? o.box.h : h;
  const crop = o.box ? 'crop=' + o.box.w + ':' + o.box.h + ':' + o.box.x + ':' + o.box.y + ',' : '';
  const ar = cw && ch ? cw / ch : 16 / 9;
  if (wideAr(ar)) {
    return '[' + inl + ']' + crop + 'scale=' + MK.w + ':' + MK.h + ':force_original_aspect_ratio=increase,crop=' + MK.w + ':' +
           MK.h + ',setsar=1,format=yuv420p[' + outl + ']';
  }
  const g = placeIn(cw || 9, ch || 16, o.layout || 'center');
  return '[' + inl + ']' + crop + 'split=2[' + outl + 'a][' + outl + 'b];' +
    BG(outl + 'a', outl + 'g0') + ';' + SHADOW(outl + 'g0', outl + 'g', g.x, g.y, g.fw, g.fh) + ';' +
    '[' + outl + 'b]scale=' + g.fw + ':' + g.fh + '[' + outl + 'f];' +
    '[' + outl + 'g][' + outl + 'f]overlay=' + g.x + ':' + g.y + ',setsar=1,format=yuv420p[' + outl + ']';
}

/** چیدمانِ صحنهٔ k‌ام از رسانه‌های غیرِافقی — به نوبت، تا هیچ‌وقت همه وسط نباشند. */
function layoutOf(k) { return LAYOUTS[((k % LAYOUTS.length) + LAYOUTS.length) % LAYOUTS.length]; }

/**
 * عکس ⇒ کلیپِ زنده (۸.۹۹). «افکت روی تصاویر اصلاً مشاهده نکردم»: پیش‌تر عکس یک قابِ ساکن بود و
 * کلِ قاب — پس‌زمینهٔ تار هم — کمی جابه‌جا می‌شد. حالا فقط **خودِ عکس** حرکت دارد:
 * - افقی: کن‌برنز (نزدیک‌شدنِ آرام ۸٪) روی کلِ قاب؛
 * - اسکرین‌شاتِ بلند: بزرگ (پهنای ۸۶۰) و **پیمایشِ آرام از بالا به پایین** — همان کاری که آدم با
 *   گوشی می‌کند؛ نوشته خوانا می‌شود، به‌جای اینکه کلِ صفحه ریز در وسط بنشیند؛
 * - بقیه: در جعبهٔ چیدمان، با نزدیک‌شدنِ آرام ۶٪ و سایه.
 */
function photoClip(ff, file, out, len, opt) {
  const p = probe(ff, file) || { w: 0, h: 0 };
  const box = contentBox(ff, file, p, { photo: true });
  const cw = box ? box.w : p.w, ch = box ? box.h : p.h;
  const crop = box ? 'crop=' + box.w + ':' + box.h + ':' + box.x + ':' + box.y + ',' : '';
  const L = Math.max(1, len);
  const N = Math.max(2, Math.round(L * MK.fps));
  const ar = cw && ch ? cw / ch : 16 / 9;
  const layout = (opt && opt.layout) || 'center';
  let fc, kind;
  if (opt && opt.card) {
    /* کارتِ نوشته (۹.۰۱): کاورِ قسمت، محو و تیره‌تر، با زومِ آرام — نوشتهٔ برداری قهرمانِ قاب است. */
    kind = 'card';
    fc = '[0:v]' + crop + 'scale=' + MK.w + ':' + MK.h + ':force_original_aspect_ratio=increase,crop=' + MK.w + ':' + MK.h +
         ',boxblur=40:3,eq=brightness=-0.16:saturation=0.8,scale=' + (MK.w * 2) + ':' + (MK.h * 2) +
         ",zoompan=z='1+0.05*on/" + N + "':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=" + MK.w + 'x' + MK.h +
         ':fps=' + MK.fps + ',setsar=1,format=yuv420p[o]';
  } else if (!cw || !ch || wideAr(ar) || ar > MK.wideMax) {
    kind = 'kb';
    fc = '[0:v]' + crop + 'scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,' +
         "zoompan=z='1+0.08*on/" + N + "':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=" + MK.w + 'x' + MK.h +
         ':fps=' + MK.fps + ',setsar=1,format=yuv420p[o]';
  } else {
    const Bx = BOX[layout] || BOX.center;
    const fwS = ev(Math.min(Bx.bw, 860)), fhS = ev(ch * fwS / cw);
    if (ch / cw > 1.25 && fhS > 1000 * 1.12 && L >= 4) {
      kind = 'scroll';
      const x = ev(Bx.cx - fwS / 2), travel = fhS - 1000;
      const yE = "'40-" + travel + '*(0.5-0.5*cos(PI*min(1,max(0,(t-1.0)/' + Math.max(0.5, L - 2.0).toFixed(2) + '))))' + "'";
      fc = '[0:v]' + crop + 'split=2[a][b];' + BG('a', 'g0') + ';' + SHADOW('g0', 'g', x, 0, fwS, MK.h) + ';' +
           '[b]scale=' + fwS + ':' + fhS + '[f];[g][f]overlay=x=' + x + ':y=' + yE + ':eval=frame,setsar=1,format=yuv420p[o]';
    } else {
      kind = 'kb';
      const g = placeIn(cw, ch, layout);
      fc = '[0:v]' + crop + 'split=2[a][b];' + BG('a', 'g0') + ';' + SHADOW('g0', 'g', g.x, g.y, g.fw, g.fh) + ';' +
           '[b]scale=' + (g.fw * 2) + ':' + (g.fh * 2) + ",zoompan=z='1+0.06*on/" + N +
           "':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=" + g.fw + 'x' + g.fh + ':fps=' + MK.fps + '[f];' +
           '[g][f]overlay=' + g.x + ':' + g.y + ',setsar=1,format=yuv420p[o]';
    }
  }
  run(ff, ['-loop', '1', '-framerate', String(MK.fps), '-t', L.toFixed(2), '-i', file, '-filter_complex', fc,
           '-map', '[o]', '-an', '-t', L.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(MK.crf),
           '-pix_fmt', 'yuv420p', '-r', String(MK.fps), out]);
  const still = out.replace(/\.mp4$/, '') + '-first.jpg';
  run(ff, ['-i', out, '-frames:v', '1', '-q:v', '3', still]);
  return { file: out, still: still, len: L, kind: kind, box: box, layout: kind === 'card' || wideAr(ar) ? 'fill' : layout };
}

/**
 * پیش‌نمایشِ آغاز به‌شکلِ کلاژ (۹.۱۱). صاحبِ برنامه: «شکلِ تیزر باید جوری باشه که فکر نکنیم داره همون اول رفته
 * سراغِ اصلِ مطلب … چند کلیپ و عکس همه تو یه کادر باشه و کم‌کم هرکدوم تکون‌هایی بخورن … برای هر کلیپ متفاوت».
 * پیش از این هر پیش‌نمایش یک کلیپِ تمام‌قد بود — درست شبیهِ خودِ قسمت. حالا همهٔ رسانه‌های پیش‌نمایش با هم در
 * یک قاب‌اند: هر کاشی حرکتِ خودش را دارد (دامنه، دوره و فازِ جدا، کمی چرخیده)، به نوبت وارد می‌شوند، و رسانهٔ
 * همین صحنه بزرگ‌تر و جلوتر است؛ صحنهٔ بعدیِ پیش‌نمایش کانون را به کاشیِ دیگر می‌بَرد.
 * `tiles` = [{file, kind:'video'|'photo', from}] · `feat` = شمارهٔ کاشیِ این صحنه.
 */
function collage(ff, tiles, feat, out, len) {
  const T = tiles.slice(0, MK.collageMax);
  if (feat >= T.length) feat = 0;
  const n = T.length, L = Math.max(2, len);
  const a = [], f = [];
  T.forEach(t => {
    if (t.kind === 'photo') a.push('-loop', '1', '-framerate', String(MK.fps), '-t', L.toFixed(2), '-i', t.file);
    else a.push('-ss', Math.max(0, Number(t.from) || 0).toFixed(2), '-t', L.toFixed(2), '-stream_loop', '-1', '-i', t.file);
  });
  const ft = T[feat];
  if (ft.kind === 'photo') a.push('-loop', '1', '-framerate', String(MK.fps), '-t', L.toFixed(2), '-i', ft.file);
  else a.push('-ss', Math.max(0, Number(ft.from) || 0).toFixed(2), '-t', L.toFixed(2), '-stream_loop', '-1', '-i', ft.file);
  f.push('[' + n + ':v]fps=' + MK.fps + ',scale=480:270:force_original_aspect_ratio=increase,crop=480:270,boxblur=20:3,' +
         'scale=' + MK.w + ':' + MK.h + ',eq=brightness=-0.18:saturation=0.8,setsar=1,format=yuv420p,trim=duration=' + L.toFixed(2) + '[bg]');
  const gap = MK.w / (n + 1);
  const order = T.map((_, i) => i).filter(i => i !== feat).concat([feat]);   // کاشیِ این صحنه آخر ⇒ رو
  let cur = 'bg';
  order.forEach((i, k) => {
    const big = i === feat;
    const w = ev(big ? 470 : 360), h = ev(w * 16 / 9 > 900 ? 900 : w * 16 / 9);
    const ang = big ? 0 : ((i % 2 ? 1 : -1) * (2 + i)) * Math.PI / 180;
    const amp = big ? 6 : 14 + 5 * i, per = 3.2 + 1.1 * i, ph = i * 1.3;
    const x0 = Math.round(gap * (i + 1) - w / 2), y0 = Math.round((MK.h - h) / 2);
    const dim = big ? '' : ',eq=brightness=-0.10:saturation=0.75';
    const t0 = big ? 0 : 0.35 * (k + 1);
    f.push('[' + i + ':v]fps=' + MK.fps + ',scale=' + w + ':' + h + ':force_original_aspect_ratio=increase,crop=' + w + ':' + h + dim +
           ',pad=' + (w + 10) + ':' + (h + 10) + ':5:5:white,format=rgba,rotate=a=' + ang.toFixed(4) +
           ':c=none:ow=rotw(' + ang.toFixed(4) + '):oh=roth(' + ang.toFixed(4) + '),fade=t=in:st=' + t0.toFixed(2) +
           ':d=0.5:alpha=1,trim=duration=' + L.toFixed(2) + ',setpts=PTS-STARTPTS[t' + i + ']');
    const nx = 'c' + k;
    f.push('[' + cur + '][t' + i + "]overlay=x='" + x0 + '+' + (amp * 0.6).toFixed(1) + '*sin(2*PI*t/' + (per * 1.7).toFixed(2) + '+' + ph.toFixed(2) +
           ")':y='" + y0 + '+' + amp.toFixed(1) + '*sin(2*PI*t/' + per.toFixed(2) + '+' + (ph + 0.7).toFixed(2) + ")':eof_action=pass[" + nx + ']');
    cur = nx;
  });
  run(ff, a.concat(['-filter_complex', f.join(';'), '-map', '[' + cur + ']', '-an', '-t', L.toFixed(2),
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(MK.crf), '-pix_fmt', 'yuv420p', '-r', String(MK.fps), out]));
  const still = out.replace(/\.mp4$/, '') + '-last.jpg';
  run(ff, ['-sseof', '-0.2', '-i', out, '-frames:v', '1', '-q:v', '3', still]);
  return { file: out, still: still, len: L, tiles: n };
}

function run(ff, args) {
  execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y'].concat(args), { stdio: ['ignore', 'ignore', 'pipe'] });
}

/** عکس ⇒ JPEGِ ۱۹۲۰×۱۰۸۰ با همان قاب. */
function photo(ff, file, out, opt) {
  const p = probe(ff, file) || { w: 0, h: 0 };
  const o = Object.assign({ box: contentBox(ff, file, p, { photo: true }) }, opt || {});
  run(ff, ['-i', file, '-frames:v', '1', '-filter_complex', frameFilter(p.w, p.h, '0:v', 'o', o), '-map', '[o]',
           '-q:v', '3', out]);
  return out;
}

/**
 * تکه‌ای از کلیپ ⇒ MP4ِ بی‌صدای ۱۹۲۰×۱۰۸۰، و آخرین قابش (برای وقتی که صحنه از کلیپ بلندتر است).
 * `skip` = {at, len} (زمانِ خودِ کلیپ): همان تکه‌ای که «لحظه» با صدایش پخش می‌کند، از این تکهٔ
 * بی‌صدا **برداشته** می‌شود — وگرنه بیننده پس از لحظه همان را دوباره، بی‌صدا، می‌بیند.
 */
/**
 * پایانِ محتوای کلیپ (۹.۱۰): ریل‌های اینستاگرام با کارتِ پایانیِ تیره و نشانِ اینستاگرام تمام می‌شوند.
 * نمونهٔ قسمتِ ۷۳ همان را «آخرین قاب» گرفت و بیست‌وچند ثانیه نگه داشت — دو بار. پس دنبالهٔ تیره یا ساکنِ
 * انتهای کلیپ (حداکثر `tailMax` ثانیه) جزوِ محتوا حساب نمی‌شود. دنباله‌ای کوتاه‌تر از `tailMin` بریده نمی‌شود.
 */
function contentEnd(ff, file, p) {
  const dur = Number(p && p.dur) || 0;
  if (dur < 4) return dur;
  const span = Math.min(MK.tailMax + 1, dur - 2), t0 = dur - span, rate = 4;
  let buf = null;
  try {
    buf = execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-ss', t0.toFixed(2), '-i', file, '-an',
      '-vf', 'fps=' + rate + ',scale=32:24,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 22 });
  } catch (e) { return dur; }
  const fsz = 32 * 24, n = Math.floor(buf.length / fsz);
  if (n < 3) return dur;
  const mean = i => { let a = 0; for (let j = 0; j < fsz; j++) a += buf[i * fsz + j]; return a / fsz; };
  const diff = i => { let a = 0; for (let j = 0; j < fsz; j++) a += Math.abs(buf[i * fsz + j] - buf[(i - 1) * fsz + j]); return a / fsz; };
  let k = n - 1;
  while (k > 0 && (mean(k) < MK.tailDark || diff(k) < MK.tailStill)) k--;
  const cut = t0 + (k + 1) / rate;
  return (dur - cut >= MK.tailMin) ? Math.max(2, cut) : dur;
}

/**
 * صحنه‌ای بلندتر از کلیپ (۹.۱۰): به‌جای نگه‌داشتنِ یک قاب برای ده‌ها ثانیه، چند قابِ **از درونِ همان
 * تکه**، هر کدام با حرکتِ آرام، با میان‌محو پشتِ کلیپ می‌نشینند. نمونهٔ ۷۳: ۱۱۲ ثانیه از ۴۶۷ عملاً ساکن بود.
 */
function fillTail(ff, out, L, rest) {
  const n = Math.max(1, Math.min(MK.fillMax, Math.ceil(rest / MK.fillSeg)));
  const xf = 0.5, seg = rest / n + xf;
  const tmp = out.replace(/\.mp4$/, '') + '-c.mp4';
  fs.renameSync(out, tmp);
  const a = ['-i', tmp], f = [];
  for (let i = 0; i < n; i++) {
    const at = Math.min(Math.max(0.1, L - 0.3), (i + 0.5) * L / n);
    const img = out.replace(/\.mp4$/, '') + '-f' + i + '.jpg';
    run(ff, ['-ss', at.toFixed(2), '-i', tmp, '-frames:v', '1', '-q:v', '3', img]);
    a.push('-loop', '1', '-framerate', String(MK.fps), '-t', seg.toFixed(3), '-i', img);
    const z = 1.12, dx = i % 2 ? '(iw-ow)*(1-t/' + seg.toFixed(3) + ')' : '(iw-ow)*t/' + seg.toFixed(3);
    f.push('[' + (i + 1) + ':v]scale=' + ev(MK.w * z) + ':' + ev(MK.h * z) + ",crop=" + MK.w + ':' + MK.h +
           ":x='" + dx + "':y='(ih-oh)/2',setsar=1,format=yuv420p,settb=1/" + MK.fps + '[p' + i + ']');
  }
  f.push('[0:v]setsar=1,format=yuv420p,settb=1/' + MK.fps + '[p_]');
  let cur = 'p_', off = L;
  for (let i = 0; i < n; i++) {
    off -= xf;
    f.push('[' + cur + '][p' + i + ']xfade=transition=fade:duration=' + xf + ':offset=' + off.toFixed(3) + '[x' + i + ']');
    cur = 'x' + i; off += seg;
  }
  run(ff, a.concat(['-filter_complex', f.join(';'), '-map', '[' + cur + ']', '-an', '-c:v', 'libx264',
                    '-preset', 'veryfast', '-crf', String(MK.crf), '-pix_fmt', 'yuv420p', '-r', String(MK.fps), out]));
  try { fs.unlinkSync(tmp); } catch (e) {}
  return n;
}

function clip(ff, file, out, from, len, info, skip, opt) {
  const p = info || probe(ff, file);
  if (!p) throw new Error('کلیپ خوانده نشد');
  if (p.end === undefined) p.end = contentEnd(ff, file, p);
  const E = Math.min(p.dur, p.end || p.dur);
  if (from > E - 1) from = Math.max(0, E - Math.min(len, E));
  const L = Math.max(1, Math.min(MK.segMax, len, Math.max(1, E - from)));
  let pre = '[0:v]fps=' + MK.fps + '[s];';
  let inArgs = ['-ss', from.toFixed(2), '-t', L.toFixed(2), '-i', file];
  if (skip && skip.at > from + 0.3 && skip.at + skip.len < E - 0.5) {
    const a = skip.at - from, b = skip.at + skip.len - from;
    const rest = Math.max(0.5, Math.min(L - a, E - (skip.at + skip.len)));
    inArgs = ['-ss', from.toFixed(2), '-t', (b + rest).toFixed(2), '-i', file];
    pre = '[0:v]fps=' + MK.fps + ',split=2[p1][p2];[p1]trim=end=' + a.toFixed(3) + ',setpts=PTS-STARTPTS[q1];' +
          '[p2]trim=start=' + b.toFixed(3) + ',setpts=PTS-STARTPTS[q2];[q1][q2]concat=n=2:v=1:a=0[s];';
  } else if (skip && skip.at <= from + 0.3) {
    /* لحظه همان آغازِ این تکه است ⇒ تکهٔ بی‌صدا از پایانِ لحظه شروع می‌شود. */
    const f2 = Math.min(Math.max(0, E - 1), skip.at + skip.len);
    inArgs = ['-ss', f2.toFixed(2), '-t', Math.max(1, Math.min(L, E - f2)).toFixed(2), '-i', file];
  }
  run(ff, inArgs.concat(['-filter_complex', pre + frameFilter(p.w, p.h, 's', 'o', opt),
           '-map', '[o]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(MK.crf),
           '-pix_fmt', 'yuv420p', '-r', String(MK.fps), out]));
  const still = out.replace(/\.mp4$/, '') + '-last.jpg';
  run(ff, ['-sseof', '-0.2', '-i', out, '-frames:v', '1', '-q:v', '3', still]);
  const played = Math.min(L, (probe(ff, out) || {}).dur || L);
  let filled = 0;
  if (opt && opt.fill && len - played >= MK.fillFrom) filled = fillTail(ff, out, played, len - played);
  return { file: out, still: still, len: filled ? len : L, played: L, filled: filled, cut: Math.round((p.dur - E) * 10) / 10 };
}

/** «لحظه»: همان تکه، **با صدای خودش** — بلندیِ یکسان، آغاز و پایانِ نرم، صوتِ ۴۸ کیلوهرتزِ دوکاناله. */
function moment(ff, file, outV, outA, from, len, info, enc, opt) {
  const p = info || probe(ff, file);
  if (!p || !p.audio) throw new Error('کلیپِ لحظه صدا ندارد');
  const L = Math.max(MK.momentMin, Math.min(len, Math.max(1, p.dur - from)));
  const fv = MK.fadeV, fa = MK.fadeA;
  run(ff, ['-ss', from.toFixed(2), '-t', L.toFixed(2), '-i', file,
           '-filter_complex', '[0:v]fps=' + MK.fps + '[s];' + frameFilter(p.w, p.h, 's', 'f', opt) +
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
    const prevEnd = out.length ? out[out.length - 1].at + (out[out.length - 1].cut || 0) : -1e9;
    if (out.length && best - prevEnd < 20) { notes.push('لحظهٔ ' + Math.round(m.at) + 's: نزدیکِ لحظهٔ قبلی'); continue; }
    /* ۹.۱۴: لحظه‌ای که جای بازگوییِ دیالوگ می‌نشیند (`cut`): پایانِ بازه هم روی مکث، وگرنه وسطِ نفس بریده می‌شود. */
    let cut = 0;
    if (Number(m.cut) > 0) {
      const want = Number(m.at) + Number(m.cut);
      let be = null, bed = 2.6;
      for (const s of (sil || [])) {
        const d = Math.abs(s - want);
        if (d < bed && s > best + 1 && !inMute(s)) { bed = d; be = s; }
      }
      if (be !== null && be < durSec - 3) cut = Math.round((be - best) * 1000) / 1000;
      else notes.push('لحظهٔ ' + Math.round(m.at) + 's: پایانِ بازگویی روی مکث نیفتاد — لحظه کنارِ گفتار می‌نشیند');
    }
    out.push(Object.assign({}, m, { at: Math.round(best * 1000) / 1000, cut: cut }));
  }
  return out;
}

/**
 * لای‌گذاریِ لحظه‌ها: ویدئوی بی‌صدا تکه‌تکه با شمارِ قابِ معین بازکدگذاری می‌شود (۹.۱۳)؛ صوت به
 * نمونه بریده می‌شود؛ تکه‌ها و لحظه‌ها پشتِ‌هم با copy.
 * @return {{inserts: Array<{at:number, d:number}>}}
 */
function splice(ff, silent, wav, parts, dest, dir) {
  /* ۹.۱۱: بریدن **بی بازکدگذاری** فقط سرِ قابِ کلیدی دقیق است. وقتی قابِ کلیدی سرِ لحظه ننشسته بود، بُرش به
     قابِ کلیدیِ پیشین برمی‌گشت و ویدئو از آن‌جا به بعد عقب می‌افتاد: در نمونهٔ ۷۳ لحظهٔ دوم ۳٫۴ ثانیه دیرتر
     از صدایش آمد و لحظهٔ سوم تصویرِ کلیپِ دیگری روی صدای «اونی که بیشترین حقوق رو می‌گیره» نشاند — «صدای کلیپ
     با تصویرش اصلاً سینک نیست». حالا هر تکه با trim/atrim در **یک** گذر بریده و پیوند زده می‌شود: جای هر لحظه
     از ساختار درست است، نه از اینکه قابِ کلیدی کجا افتاده. */
  /* ۹.۱۳: اجرای ۳۶۴ و ۳۶۵ِ رانر هر دو وسطِ ساختِ نمونهٔ ۷۳ با «shutdown signal» مردند. یک گذرِ همه‌چیز
     (split به n شاخه + n×۲ ورودی + concat) حافظه‌اش به چیدمانِ صف‌های ffmpeg بسته است، نه به ما. حالا هر تکه
     جدا و با **شمارِ قابِ معین** ساخته می‌شود (دقت همان: برشِ ورودی با بازکدگذاری روی قاب دقیق است، و لحظه
     روی شبکهٔ قاب است)، و پیوند با copy — حافظهٔ هر گام کران دارد. */
  const fps = MK.fps;
  const W = path.join(dir, 'narr48.wav');
  run(ff, ['-i', wav, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', W]);
  const V = 'fps=' + fps + ',scale=' + MK.w + ':' + MK.h + ',setsar=1,format=yuv420p';
  const enc = ['-an', '-c:v', 'libx264', '-preset', 'faster', '-crf', String(MK.crf), '-pix_fmt', 'yuv420p',
               '-r', String(fps), '-video_track_timescale', '12288'];
  const AO = ['-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le'];
  const vl = [], al = [], inserts = [];
  let prev = 0, k = 0;
  const piece = (a, b) => {                                   // تکهٔ بی‌صدا + صوتِ گفتار، [a, b)
    const v = path.join(dir, 'spv' + k + '.mp4'), au = path.join(dir, 'spa' + k + '.wav');
    const args = ['-ss', a.toFixed(4), '-i', silent, '-vf', V];
    if (b !== null) args.push('-frames:v', String(Math.round((b - a) * fps)));
    run(ff, args.concat(enc, [v]));
    run(ff, ['-i', W, '-af', 'atrim=start=' + a.toFixed(4) + (b !== null ? ':end=' + b.toFixed(4) : '') + ',asetpts=PTS-STARTPTS'].concat(AO, [au]));
    vl.push(v); al.push(au); k++;
  };
  for (const p of parts) {
    piece(prev, p.at);
    const n = Math.max(1, Math.round(p.len * fps)), len = n / fps;   // درازای لحظه هم روی شبکهٔ قاب
    const v = path.join(dir, 'spv' + k + '.mp4'), au = path.join(dir, 'spa' + k + '.wav');
    run(ff, ['-i', p.v, '-vf', V + ',tpad=stop_mode=clone:stop_duration=2', '-frames:v', String(n)].concat(enc, [v]));
    run(ff, ['-i', p.a, '-af', 'aresample=48000,apad=whole_dur=' + len.toFixed(4) + ',atrim=end=' + len.toFixed(4)].concat(AO, [au]));
    vl.push(v); al.push(au); k++;
    const cut = Math.max(0, Number(p.cut) || 0);              // ۹.۱۴: بازگوییِ همان دیالوگ از گفتار برداشته می‌شود
    inserts.push(cut ? { at: Math.round(p.at * 10) / 10, d: Math.round(len * 10) / 10, cut: Math.round(cut * 10) / 10 }
                     : { at: Math.round(p.at * 10) / 10, d: Math.round(len * 10) / 10 });
    prev = p.at + cut;
  }
  piece(prev, null);
  const lv = path.join(dir, 'spv.txt'), la = path.join(dir, 'spa.txt');
  fs.writeFileSync(lv, vl.map(x => "file '" + x + "'").join('\n'));
  fs.writeFileSync(la, al.map(x => "file '" + x + "'").join('\n'));
  const A = path.join(dir, 'spall.wav');
  run(ff, ['-f', 'concat', '-safe', '0', '-i', la, '-c', 'copy', A]);
  run(ff, ['-f', 'concat', '-safe', '0', '-i', lv, '-i', A, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
           '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', dest]);
  return { inserts: inserts };
}

module.exports = { collage, contentEnd, fillTail, MK, BOX, probe, contentBox, placeIn, layoutOf, frameFilter, photo, photoClip, clip, moment, find, placeMoments, splice };
