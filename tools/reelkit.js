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

/**
 * صافیِ ffmpeg برای یک تصویر در قابِ عمودی — حرکتِ **گوناگون** (۹.۲۶: «جلوه‌های تصویری به کار نرفته بود»):
 * k%3 = ۰ نزدیک‌شدن، ۱ پیمایش (افقی) یا دورشدن، ۲ دورشدن. افقی هرگز بریده و دور ریخته نمی‌شود.
 */
function motionFilter(iw, ih, d, k) {
  const W = RK.w, H = RK.h, fr = Math.max(1, Math.round(d * RK.fps));
  const wide = iw && ih && iw / ih >= 1.0;
  if (wide && k % 3 === 1) {
    const sw = Math.ceil(iw * H / ih / 2) * 2;
    const span = Math.max(0, sw - W);
    const x = Math.floor(k / 3) % 2 ? '(' + span + ')*(1-t/' + d.toFixed(3) + ')' : '(' + span + ')*t/' + d.toFixed(3);
    return 'scale=' + sw + ':' + H + ',crop=' + W + ':' + H + ":x='" + x + "':y=0,fps=" + RK.fps + ',setsar=1,format=yuv420p';
  }
  const zin = k % 3 === 0;
  const z = zin ? "min(1+0.16*on/" + fr + ",1.16)" : "max(1.16-0.16*on/" + fr + ",1.0)";
  /* افقی: کلِ ارتفاع پر و میانه‌اش دیده می‌شود؛ حرکتِ زوم با کمی لغزش تا قاب «زنده» باشد. */
  const xs = wide ? "iw/2-(iw/zoom/2)+(iw/zoom/6)*sin(on/" + fr + "*3.14)" : "iw/2-(iw/zoom/2)";
  return 'scale=' + (W * 2) + ':' + (H * 2) + ':force_original_aspect_ratio=increase,crop=' + (W * 2) + ':' + (H * 2) +
         ",zoompan=z='" + z + "':x='" + xs + "':y='ih/2-(ih/zoom/2)':d=" + fr +
         ':s=' + W + 'x' + H + ':fps=' + RK.fps + ',setsar=1,format=yuv420p';
}

const TRANS = ['fade', 'slideleft', 'circleopen', 'smoothup', 'fadeblack', 'radial'];

function frameCss() {
  return '<style>html,body{margin:0;width:' + RK.w + 'px;height:' + RK.h + 'px;background:transparent;font-family:' + FONT +
         ';direction:rtl}.k{color:#ffe14d}.hl{background:#ffe14d;color:#0b0f18;padding:0 14px;border-radius:14px;' +
         'box-decoration-break:clone;-webkit-box-decoration-break:clone}</style>';
}

/** نشان بی مربعِ سیاه (۹.۲۶): پس‌زمینهٔ تیرهٔ تصویرِ نشان با `screen` حذف می‌شود. */
function logoImg(mark, px) {
  return mark && mark.logo ? '<img src="' + mark.logo + '" style="width:' + px + 'px;height:' + px + 'px;mix-blend-mode:screen">' : '';
}

/**
 * عبارت‌ها: هر جمله به تکه‌های ۲ تا ۴ واژه‌ای (مرز روی «،؛:» اگر هست)، با زمانِ واژه‌ها. ⇒ [{text, a, b, line}]
 * `wt` زمانِ هر واژهٔ همهٔ جمله‌ها پشتِ‌هم (از tools/reelalign.py)؛ نبود ⇒ نسبتِ نویسه درونِ بازهٔ همان جمله.
 */
const DANGLE = /^(از|به|در|با|تا|که|و|یا|برای|بر|اگر|چون|اما|ولی|یعنی|مثل|مثلِ|این|آن|هر|چه|بی|نه|هم|همین|همان)$/;
const bareW = w => String(w || '').replace(/[\u064B-\u0652\u0670«»"'،؛:,.!?؟…]/g, '');
function phrasesOf(lines, wt) {
  const out = [];
  let wi = 0;
  lines.forEach((ln, li) => {
    const ws = String(ln.text || '').split(/\s+/).filter(Boolean);
    let times = null;
    if (wt && wt.length >= wi + ws.length) times = wt.slice(wi, wi + ws.length);
    wi += ws.length;
    if (!times) {
      const L = ws.map(w => Math.max(1, w.length)), tot = L.reduce((a, b) => a + b, 0) || 1;
      let acc = 0; const a0 = Number(ln.t0) || 0, b0 = Number(ln.t1) || a0 + 1;
      times = L.map(n => { const a = a0 + (b0 - a0) * acc / tot; acc += n; return [a, a0 + (b0 - a0) * acc / tot]; });
    }
    let cur = [];
    const flush = () => { if (!cur.length) return; out.push({ text: cur.map(x => x.w).join(' '), a: cur[0].a, b: cur[cur.length - 1].b, line: li }); cur = []; };
    ws.forEach((w, k) => {
      cur.push({ w: w, a: times[k][0], b: times[k][1] });
      const brk = /[،؛:,]$/.test(w) && cur.length >= 2;
      const glued = /\u0650$/.test(w) && cur.length < 5 && k + 1 < ws.length;     // «پشتِ | در» از هم جدا نشوند (کسرهٔ اضافه)
      /* ۹.۲۹: عبارت روی واژه‌ای که ادامه می‌خواهد تمام نشود — ریلزِ اول «تمامِ تصمیم‌هایمان غلط از» و «درست مثلِ بازاری که»
         نشان داد: جملهٔ نیمه، خواندنی نیست. */
      const dangle = DANGLE.test(bareW(w)) && cur.length < 6 && k + 1 < ws.length;
      if (!glued && !dangle && (cur.length >= 4 || brk || (cur.length >= 3 && k + 2 === ws.length))) flush();
    });
    flush();
  });
  /* هر عبارت تا آغازِ عبارتِ بعدیِ همان جمله بماند — چشمک نزند. */
  for (let i = 0; i + 1 < out.length; i++) if (out[i + 1].line === out[i].line) out[i].b = out[i + 1].a;
  return out;
}

/** واژه‌های کلیدی درونِ عبارت ⇒ HTMLِ برجسته. */
function markKeys(text, emph, cls) {
  let h = esc(text);
  (emph || []).slice().sort((a, b) => b.length - a.length).forEach(k => {
    const e = esc(String(k || '').trim());
    if (e.length >= 2 && h.indexOf(e) !== -1) h = h.split(e).join('<span class="' + cls + '">' + e + '</span>');
  });
  return h;
}

const POS = [790, 420, 1240];               // میانه، بالا، پایین — هر جمله جای خودش
/** یک عبارت: درشت، بی کادر؛ جا و شکل با شمارهٔ جمله عوض می‌شود. */
function phraseHtml(ph, emph) {
  const v = ph.line % 3, top = POS[ph.line % POS.length];
  const shadow = 'text-shadow:0 0 2px #000,0 4px 18px rgba(0,0,0,.9),0 0 40px rgba(0,0,0,.6);-webkit-text-stroke:2px rgba(0,0,0,.55)';
  let body;
  if (v === 0) body = '<div style="color:#fff;font-weight:900;font-size:84px;line-height:1.35;' + shadow + '">' + markKeys(ph.text, emph, 'k') + '</div>';
  else if (v === 1) body = '<div style="color:#fff;font-weight:800;font-size:74px;line-height:1.6;' + shadow + '">' + markKeys(ph.text, emph, 'hl') + '</div>';
  else body = '<div style="color:#fff;font-weight:900;font-size:92px;line-height:1.3;letter-spacing:-1px;' + shadow + '">' + markKeys(ph.text, emph, 'k') + '</div>';
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;left:60px;right:60px;top:' + top + 'px;text-align:center">' + body + '</div>';
}

/** قلابِ بالای قاب در جملهٔ اول، با نامِ مجموعه و نشان. */
function hookHtml(hook, kicker, mark, emph) {
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;top:300px;left:60px;right:60px;text-align:center">' +
    (kicker ? '<div style="display:inline-block;background:#1fbf8f;color:#08131c;font-weight:800;font-size:34px;' +
      'padding:8px 26px;border-radius:40px;margin-bottom:26px">' + esc(kicker) + '</div>' : '') +
    '<div style="color:#fff;font-weight:900;font-size:80px;line-height:1.4;text-shadow:0 4px 24px rgba(0,0,0,.9),0 0 50px rgba(0,0,0,.6)">' +
    markKeys(hook, emph, 'k') + '</div></div>' +
    '<div style="position:absolute;top:40px;left:40px">' + logoImg(mark, 104) + '</div>';
}

/** کارتِ پایانی: «نسخهٔ کامل در یوتیوب» — بی «لینک در کپشن» (۹.۲۶). */
function endHtml(end, mark, bgData) {
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;inset:0;background:' + (bgData ? 'url(' + bgData + ') center/cover' : '#0d1726') + '"></div>' +
    '<div style="position:absolute;inset:0;background:rgba(6,10,18,.82)"></div>' +
    '<div style="position:absolute;top:500px;left:70px;right:70px;text-align:center;color:#fff">' + logoImg(mark, 260) +
    '<div style="margin-top:46px;font-weight:900;font-size:66px;line-height:1.5">' + esc(end.l1 || 'نسخهٔ کاملِ این درس در یوتیوب') + '</div>' +
    '<div style="margin-top:22px;font-weight:700;font-size:46px;color:#1fbf8f">' + esc(end.l2 || '') + '</div>' +
    (end.handle ? '<div style="margin-top:30px;font-size:44px;direction:ltr;color:#ffe14d">' + esc(end.handle) + '</div>' : '') +
    '</div>';
}

/** کاورِ ریلز: تصویرِ اول، عنوانِ کوتاه و نامِ مجموعه. */
function coverHtml(title, kicker, mark, bgData) {
  return '<!doctype html><meta charset="utf-8">' + frameCss() +
    '<div style="position:absolute;inset:0;background:' + (bgData ? 'url(' + bgData + ') center/cover' : '#0d1726') + '"></div>' +
    '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(5,9,16,.9) 75%)"></div>' +
    '<div style="position:absolute;left:70px;right:70px;bottom:330px;text-align:center">' +
    (kicker ? '<div style="display:inline-block;background:#1fbf8f;color:#08131c;font-weight:800;font-size:36px;' +
      'padding:8px 28px;border-radius:40px;margin-bottom:26px">' + esc(kicker) + '</div>' : '') +
    '<div style="color:#fff;font-weight:900;font-size:84px;line-height:1.4;text-shadow:0 6px 30px rgba(0,0,0,.8)">' +
    esc(title) + '</div></div>' +
    '<div style="position:absolute;top:60px;left:0;right:0;text-align:center">' + logoImg(mark, 130) + '</div>';
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
 * زمانِ جمله‌ها از خودِ صدا (۹.۷۳) — «عکس‌ها چندین ثانیه زودتر از صدای گوینده و نوشته‌ها می‌آمدند». موتور `t0/t1` را با نسبتِ
 * نویسه تخمین می‌زند؛ زیرنویس از ۹.۲۶ زمانِ واقعیِ هر واژه را داشت ولی تکه‌های تصویر و کارتِ پایانی هنوز روی همان تخمین
 * بودند، و در ریلزِ ۱۷۰ ثانیه‌ای اختلاف به چند ثانیه رسید. حالا آغاز و پایانِ هر جملهٔ بدنه از نخستین و واپسین واژه‌اش، و
 * جملهٔ دعوت پس از واپسین واژهٔ بدنه. بی زمانِ واژه (هم‌ترازی نشد) ⇒ همان تخمین، بی تغییر.
 */
function retime(lines, wt, dur) {
  if (!wt || !wt.length) return lines;
  const body = lines.filter(x => !x.cta);
  const need = body.reduce((n, x) => n + String(x.text).split(/\s+/).filter(Boolean).length, 0);
  if (wt.length < need) return lines;
  let wi = 0, lastEnd = 0;
  return lines.map(x => {
    const y = Object.assign({}, x);
    if (x.cta) {
      y.t0 = Math.max(lastEnd, Math.min(Number(x.t0) || lastEnd, dur));
      if (!(Number(y.t1) > y.t0)) y.t1 = dur;
      return y;
    }
    const n = String(x.text).split(/\s+/).filter(Boolean).length;
    if (n) {
      y.t0 = Number(wt[wi][0]);
      y.t1 = Number(wt[wi + n - 1][1]);
      lastEnd = y.t1;
    }
    wi += n;
    return y;
  });
}

/**
 * reel: {lines:[{t0,t1,text,img,cta}], hook, kicker, coverTitle, emph:[...], end:{l1,l2,handle}, short}
 * io:   {wav, dur, imgs:[{file,w,h}|null], mark:{logo}, dir, ff, shoot(html,png,w,h), wordTimes?}
 * ⇒ {file, cover, short?, shortSeconds?, seconds, segs, subs}
 */
function build(reel, io, out) {
  const dir = io.dir, ff = io.ff, dur = Number(io.dur) || 0;
  if (!(dur > 2)) throw new Error('صدای ریلز کوتاه‌تر از ۲ ثانیه است');
  const lines = retime((reel.lines || []).filter(x => x && String(x.text || '').trim()), io.wordTimes, dur);
  if (!lines.length) throw new Error('ریلز هیچ جمله‌ای ندارد');
  const segs = segmentsOf(lines, dur);
  /* ── تکه‌ها با حرکتِ گوناگون، به هم با گذار (xfade) ── هر تکه جز آخری X ثانیه بلندتر ساخته می‌شود تا گذار از سهمِ
     دیده‌شدنی‌اش نخورد؛ جمعِ خروجی = مدتِ صدا. */
  const X = segs.length > 1 ? 0.45 : 0;
  const parts = [];
  segs.forEach((s, k) => {
    const d = (s.t1 - s.t0) + (k + 1 < segs.length ? X : 0), f = path.join(dir, 'seg' + String(k).padStart(2, '0') + '.mp4');
    const im = s.img >= 0 ? (io.imgs || [])[s.img] : null;
    if (im && im.file && fs.existsSync(im.file)) {
      ff(['-loop', '1', '-framerate', String(RK.fps), '-t', d.toFixed(3), '-i', im.file,
          '-vf', motionFilter(im.w, im.h, d, k), '-frames:v', String(Math.max(1, Math.round(d * RK.fps))),
          '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-r', String(RK.fps), f]);
    } else {
      ff(['-f', 'lavfi', '-i', 'color=c=0x0d1726:s=' + RK.w + 'x' + RK.h + ':d=' + d.toFixed(3) + ':r=' + RK.fps,
          '-vf', 'format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', f]);
    }
    parts.push({ f: f, d: s.t1 - s.t0 });
  });
  const base = path.join(dir, 'base.mp4');
  if (parts.length === 1) fs.copyFileSync(parts[0].f, base);
  else {
    const a = [], fl = [];
    parts.forEach(p => a.push('-i', p.f));
    let cur = '0:v', off = 0;
    for (let k = 1; k < parts.length; k++) {
      off += parts[k - 1].d;
      const nx = 'x' + k;
      fl.push('[' + cur + '][' + k + ':v]xfade=transition=' + TRANS[(k - 1) % TRANS.length] + ':duration=' + X + ':offset=' + off.toFixed(3) + '[' + nx + ']');
      cur = nx;
    }
    ff(a.concat(['-filter_complex', fl.join(';'), '-map', '[' + cur + ']', '-an', '-c:v', 'libx264', '-preset', 'veryfast',
      '-crf', '20', '-r', String(RK.fps), '-pix_fmt', 'yuv420p', base]));
  }

  /* ── لایه‌ها ── قلاب روی جملهٔ اول؛ هر جملهٔ دیگر عبارت‌به‌عبارت (جا و شکل به نوبت)؛ کارتِ پایانی روی جملهٔ دعوت. */
  const ctaI = lines.findIndex(x => x.cta);
  const lastT0 = Number(lines[ctaI >= 0 ? ctaI : lines.length - 1].t0) || 0;
  const endT0 = Math.max(0, Math.min(lastT0, dur - RK.endMin));
  const firstImg = (io.imgs || []).find(x => x && x.file && fs.existsSync(x.file));
  const bg = firstImg ? dataUrl(firstImg.file) : '';
  const emph = reel.emph || [];
  const ov = [];
  if (reel.hook) ov.push({ html: hookHtml(reel.hook, reel.kicker, io.mark, emph), a: 0, b: Math.min(endT0, Number(lines[0].t1) || 4) });
  const body = lines.filter(x => !x.cta);
  const phs = phrasesOf(body, io.wordTimes);
  phs.forEach(ph => {
    if (ph.line === 0 && reel.hook) return;            // جملهٔ اول همان قلابِ بالای قاب است
    if (ph.a >= endT0 - 0.01) return;
    ov.push({ html: phraseHtml(ph, emph), a: ph.a, b: Math.min(ph.b, endT0) });
  });
  const endOv = { html: endHtml(reel.end || {}, io.mark, bg), a: endT0, b: dur + 1, end: true };
  ov.forEach((o, i) => { o.png = io.shoot(o.html, path.join(dir, 'ov' + String(i).padStart(3, '0') + '.png'), RK.w, RK.h); });
  endOv.png = io.shoot(endOv.html, path.join(dir, 'ovend.png'), RK.w, RK.h);

  /* ══ همهٔ لایه‌ها یک ورودی‌اند، نه یک ورودی برای هر لایه (۲۰ اکتبر) ══
     نگارشِ ۹.۲۶ هر عبارت را `-loop 1 -i png` می‌کرد: ffmpeg هر ورودیِ حلقه‌ای را از ثانیهٔ صفر رمزگشایی و صف می‌کند تا
     `enable`ش برسد — ~۱۰۰ مگ برای هر لایهٔ ۱۰۸۰×۱۹۲۰. ریلزِ پرعبارت به ۱۵ گیگ رسید و رانر دو بار وسطِ کار کشته شد
     (اجراهای ۵۲۱ و ۵۲۲، «Run failed: render-youtube-video»). حالا خطِ زمانِ لایه‌ها یک فهرستِ concat است — شفاف میانِ
     لایه‌ها، و هر لایه تا آغازِ بعدی — پس حافظه با شمارِ لایه‌ها بالا نمی‌رود. */
  let blank = '';
  const timeline = (layers, T, tag) => {
    if (!blank) {
      blank = path.join(dir, 'ovblank.png');
      /* `format` درونِ خودِ منبع، نه با `-vf`: آن‌جا رنگ اول بی‌آلفا ساخته می‌شود و «شفاف» سیاهِ کدر درمی‌آید
         (۲.۶ همین را گرفت: شورتز میانِ عبارت‌ها سیاه بود). */
      ff(['-f', 'lavfi', '-i', 'color=c=black@0.0:s=' + RK.w + 'x' + RK.h + ',format=rgba', '-frames:v', '1', blank]);
    }
    const ls = layers.filter(o => o.png && o.b > o.a).slice().sort((x, y) => x.a - y.a);
    const rows = ['ffconcat version 1.0'];
    const put = (f, d) => { if (d > 0.0005) rows.push("file '" + f.replace(/'/g, "'\\''") + "'", 'duration ' + d.toFixed(4)); };
    let t = 0, last = blank;
    ls.forEach((o, i) => {
      const a = Math.max(t, Math.min(T, o.a));
      const b = Math.min(T, o.b, i + 1 < ls.length ? Math.max(a, ls[i + 1].a) : T);
      put(blank, a - t);
      if (b > a) { put(o.png, b - a); last = o.png; t = b; } else t = a;
    });
    if (T > t) { put(blank, T - t); last = blank; }
    rows.push("file '" + last.replace(/'/g, "'\\''") + "'");   // concat: مدتِ آخرین ردیف بی تکرارش خوانده نمی‌شود
    const lf = path.join(dir, 'ov-' + tag + '.ffconcat');
    fs.writeFileSync(lf, rows.join('\n') + '\n');
    return lf;
  };
  /* یک گذر: نوارِ پیشرفت بالای قاب و کمی سایه‌روشنِ لبه (vignette)، سپس خطِ زمانِ لایه‌ها. */
  const render = (layers, T, file, tag) => {
    const args = ['-i', base, '-i', io.wav, '-f', 'lavfi', '-i', 'color=c=0xffe14d:s=' + RK.w + 'x10:r=' + RK.fps,
                  '-f', 'concat', '-safe', '0', '-i', timeline(layers, T, tag)];
    const fl = ['[0:v]vignette=angle=PI/5[vg]', "[vg][2:v]overlay=x='-W+W*t/" + T.toFixed(3) + "':y=0:shortest=1[pb]",
                '[3:v]fps=' + RK.fps + ',format=rgba,setpts=PTS-STARTPTS[ovs]',
                '[pb][ovs]overlay=0:0:eof_action=pass[vo]'];
    ff(args.concat(['-filter_complex', fl.join(';'), '-map', '[vo]', '-map', '1:a',
      '-t', T.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-maxrate', '6M', '-bufsize', '12M',
      '-pix_fmt', 'yuv420p', '-r', String(RK.fps), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart', file]));
  };
  render(ov.concat([endOv]), dur, out, 'reel');
  /* ── نسخهٔ شورتز (۹.۲۶): همان، بی کارتِ پایانی و بی جملهٔ دعوت — صدا سرِ آغازِ دعوت بریده می‌شود. ── */
  let short = '', shortT = 0;
  if (reel.short && ctaI > 0) {
    shortT = Math.min(dur, (Number(lines[ctaI].t0) || dur) + 0.25);
    short = path.join(dir, 'short.mp4');
    render(ov.filter(o => o.a < shortT).map(o => Object.assign({}, o, { b: Math.min(o.b, shortT) })), shortT, short, 'short');
  }

  const cpng = io.shoot(coverHtml(reel.coverTitle || reel.hook || '', reel.kicker, io.mark, bg), path.join(dir, 'cover.png'), RK.w, RK.h);
  const cover = path.join(dir, 'cover.jpg');
  ff(['-i', cpng, '-q:v', '3', '-frames:v', '1', cover]);
  return { file: out, cover: cover, short: short, shortSeconds: Math.round(shortT * 10) / 10, seconds: Math.round(dur * 10) / 10,
           segs: segs.length, subs: ov.length - (reel.hook ? 1 : 0), phrases: phs.length, trans: Math.max(0, segs.length - 1) };
}

module.exports = { RK, TRANS, retime, segmentsOf, motionFilter, phrasesOf, phraseHtml, markKeys, hookHtml, endHtml, coverHtml, build };
