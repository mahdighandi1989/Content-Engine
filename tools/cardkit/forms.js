/* شکل‌ها از **محتوا** می‌آیند، نه از یک منوی سبک: دو چیز رودررو ⇒ split،
   زنجیرهٔ استدلال ⇒ chain، یک ایدهٔ مرکزی ⇒ focus، نقلِ مستقیم ⇒ quote،
   پرسش ⇒ question. هر عنصر `at` دارد: در کدام ضرب ظاهر شود.
   نکتهٔ مهم: روی <svg> هرگز direction="rtl" نمی‌گذاریم — معنیِ text-anchor
   را برعکس می‌کند و کلِ چیدمان از قاب بیرون می‌زند (سنجیده شد). RTL فقط
   داخلِ foreignObject، جایی که واقعاً متنِ چندخطی داریم. */
'use strict';
const K = require('./draw.js');
const IC = require('./icons.js');
const MARK = require('./mark.js');
const { W, H, esc, wob, wobEllipse, arrowRTL, marker } = K;

const M = 130;                                  // حاشیهٔ امن
const RIGHT = W - M;

function txt(x, y, s, o) {
  o = o || {};
  return `<text x="${x}" y="${y}" text-anchor="${o.a || 'end'}" font-size="${s}"` +
    ` fill="${o.c}" font-weight="${o.w || 400}"${o.op ? ` opacity="${o.op}"` : ''}>${esc(o.t)}</text>`;
}
function wrap(x, y, w, h, size, col, t, align, weight) {
  return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml"` +
    ` style="font-family:${K.FONT};direction:rtl;font-size:${size}px;line-height:1.55;color:${col};` +
    `text-align:${align || 'right'};font-weight:${weight || 400}">${esc(t)}</div></foreignObject>`;
}
/* ══ نشانِ کانال **ورودیِ** چیدمان است، نه لایه‌ای رویش ══
 * اگر نشان گوشهٔ بالا-راست بنشیند، سربرگ می‌رود بالا-چپ؛ اگر پایین-چپ
 * بنشیند، پانویس می‌رود پایین-راست. بی این، نشانِ جابه‌جاشونده یک روز روی
 * متن می‌افتد و کسی هم نمی‌فهمد تا ویدئو منتشر شده باشد. */
function chrome(c, p) {
  const o = [];
  const mk = c.mark || null;
  const kickLeft = mk && mk.corner === 'tr';
  const footRight = mk && mk.corner === 'bl';
  if (c.kicker) {
    const kx = kickLeft ? M : RIGHT;
    o.push(txt(kx, 112, 30, { t: c.kicker, c: p.accent, w: 600, a: kickLeft ? 'start' : 'end' }));
    o.push(`<path d="${wob(kx, 132, kx + (kickLeft ? 210 : -210), 132, c.kicker, 2)}" fill="none" stroke="${p.accent}" stroke-width="3" stroke-linecap="round" opacity="0.6"/>`);
  }
  if (c.foot) {
    const fx = footRight ? RIGHT : M;
    o.push(txt(fx, H - 62, 24, { t: c.foot, c: p.ink, op: 0.4, a: footRight ? 'end' : 'start' }));
  }
  if (mk) o.push(MARK.draw({ corner: mk.corner, W: W, H: H, M: M, handle: mk.handle,
                             name: mk.name, logo: mk.logo, ink: p.ink, opacity: mk.opacity }));
  return o.join('');
}

/* ══ جعبهٔ نشان، واقعاً جای می‌گیرد ══
 * جابه‌جاکردنِ سربرگ و پانویس کافی نبود: با نشانِ گوشهٔ پایین-راست، سومین
 * بندِ ستونِ راست دقیقاً زیرِ نشان می‌افتاد. سنجیده شد، در یک فریمِ واقعی.
 * پس نشان یک **بالابَر** می‌دهد: محتوای همان سمت به‌اندازهٔ ارتفاعِ جعبه
 * بالا می‌آید. سمتِ دیگر دست‌نخورده می‌مانَد، تا فضای خالیِ بی‌دلیل نسازیم. */
const MARK_H = 132;
function lift(c, side) {            // بالابَر برای نشانِ گوشهٔ **پایین**
  const mk = c.mark; if (!mk) return 0;
  const cr = mk.corner;
  if (cr !== 'br' && cr !== 'bl') return 0;
  if (side === 'any') return MARK_H;
  return ((cr === 'br' && side === 'r') || (cr === 'bl' && side === 'l')) ? MARK_H : 0;
}
/* و قرینه‌اش برای گوشهٔ **بالا** — که سنجهٔ ۳.۲ خودش پیدایش کرد، بعد از
   آنکه توخالی‌بودنش رفع شد: با نشانِ بالا-راست، عنوانِ راست‌چین دقیقاً زیرِ
   نشان می‌نشست. یک قرینه که فقط نیمه‌اش ساخته شده باشد، همان نیمهٔ دیگر را
   یک روز روی متن می‌اندازد. */
function drop(c, side) {
  const mk = c.mark; if (!mk) return 0;
  const cr = mk.corner;
  if (cr !== 'tr' && cr !== 'tl') return 0;
  if (side === 'any') return MARK_H;
  return ((cr === 'tr' && side === 'r') || (cr === 'tl' && side === 'l')) ? MARK_H : 0;
}

const icon = (name, cx, cy, s, col, seed) => (IC[name] ? IC[name](cx, cy, s, col, seed) : '');

/* ── focus ── یک ایده در مرکز، نشانه‌اش کنارش، اصطلاح‌ها دورش */
function focus(c, p) {
  const el = [], cx = W * 0.60, cy = H * 0.45;
  if (c.icon) el.push({ at: 0, s: icon(c.icon, W * 0.215, cy, 120, p.accent, c.headline) });
  el.push({ at: 1, s: txt(cx + 380, cy, 92, { t: c.headline, c: p.ink, w: 800 }) });
  el.push({ at: 2, s: `<path d="${wob(cx + 380, cy + 34, cx - 250, cy + 34, c.headline, 3)}" fill="none" stroke="${p.mark}" stroke-width="18" stroke-linecap="round" opacity="0.75"/>` });
  (c.items || []).slice(0, 3).forEach((t, i) => {
    const y = cy + 150 + i * 78;
    el.push({ at: 3 + i * 2, s:
      `<circle cx="${cx + 380}" cy="${y - 13}" r="8" fill="${p.accent}" opacity="0.9"/>` +
      txt(cx + 350, y, 42, { t: t, c: p.ink, op: 0.88 }) });
  });
  return el;
}

/* ── split ── دو چیز رودررو، هر کدام با نشانهٔ خودش */
function split(c, p) {
  const el = [], mid = W / 2, gap = 70;
  const dr = drop(c, 'any');
  const cols = [
    { d: c.right, r: RIGHT, at: 2, side: 'r' },   // ستونِ راست = اولِ خواندن
    { d: c.left, r: mid - gap, at: 3, side: 'l' }
  ];
  el.push({ at: 0, s: txt(RIGHT, H * 0.215 + drop(c, 'r'), 78, { t: c.headline, c: p.ink, w: 800 }) });
  el.push({ at: 1, s: `<path d="${wob(mid, H * 0.30 + dr * 0.5, mid, H * 0.86 - lift(c, 'any') * 0.55, 'd' + c.headline, 5)}" fill="none" stroke="${p.ink}" stroke-width="2.5" opacity="0.2"/>` });
  cols.forEach(({ d, r, at, side }) => {
    if (!d) return;
    const up = lift(c, side);
    const tw = String(d.title).length * 26 + 40;
    el.push({ at: at, s: marker(r - tw + 8, H * 0.325 + dr * 0.5 - 44, tw, 56, d.title, p.mark)
      + txt(r, H * 0.325 + dr * 0.5, 50, { t: d.title, c: p.ink, w: 700 }) });
    if (d.icon) el.push({ at: at + 1, s: icon(d.icon, r - (mid - M - gap) / 2, H * 0.50 - up * 0.45, 78, p.accent, d.title) });
    (d.items || []).slice(0, 3).forEach((t, i) => {
      const y = H * 0.665 - up + i * 72;
      el.push({ at: at + 3 + i * 2, s:
        `<circle cx="${r}" cy="${y - 13}" r="7" fill="${p.accent}" opacity="0.85"/>` +
        txt(r - 28, y, 38, { t: t, c: p.ink, op: 0.88 }) });
    });
  });
  return el;
}

/* ── chain ── زنجیرهٔ استدلال، راست‌به‌چپ */
function chain(c, p) {
  const el = [], st = (c.steps || []).slice(0, 3), n = st.length || 1;
  el.push({ at: 0, s: txt(RIGHT, H * 0.215 + drop(c, 'r'), 74, { t: c.headline, c: p.ink, w: 800 }) });
  const gap = 78, bw = Math.floor((W - M * 2 - gap * (n - 1)) / n), bh = 250, y = H * 0.40;
  st.forEach((t, i) => {
    const x = RIGHT - bw - i * (bw + gap);
    el.push({ at: 1 + i * 2, s:
      `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="28" fill="${p.card}" stroke="${p.ink}" stroke-opacity="0.12" stroke-width="2"/>` +
      `<circle cx="${x + bw - 34}" cy="${y + 36}" r="19" fill="${p.accent}" opacity="0.15"/>` +
      `<text x="${x + bw - 34}" y="${y + 45}" text-anchor="middle" font-size="24" fill="${p.accent}" font-weight="700">${K.fa(String(i + 1))}</text>` +
      wrap(x + 32, y + 72, bw - 64, bh - 96, 34, p.ink, t, 'right', 500) });
    if (i < n - 1) el.push({ at: 2 + i * 2, s: arrowRTL(x - 16, y + bh / 2, gap - 14, 'a' + i, p.accent) });
  });
  if (c.note) el.push({ at: 1 + n * 2, s: txt(RIGHT, H * 0.80 - lift(c, 'any') * 0.7, 40, { t: c.note, c: p.ink, op: 0.7 }) });
  return el;
}

/* ── quote ── متنِ کم، فضای زیاد */
function quote(c, p) {
  const el = [];
  el.push({ at: 0, s: `<text x="${RIGHT}" y="${H * 0.33 + drop(c, 'r')}" text-anchor="end" font-size="200" fill="${p.accent}" opacity="0.22" font-weight="800">”</text>` });
  el.push({ at: 1, s: wrap(M, H * 0.31 + drop(c, 'any') * 0.5, W - M * 2, H * 0.44, 60, p.ink, c.headline, 'right', 700) });
  if (c.note) el.push({ at: 3, s: txt(RIGHT, H * 0.83 - lift(c, 'any') * 0.8, 34, { t: c.note, c: p.ink, op: 0.55 }) });
  return el;
}

/* ── question ── */
function question(c, p) {
  const el = [];
  el.push({ at: 0, s: icon('q', W * 0.5, H * 0.26 + drop(c, 'any') * 0.6, 74, p.accent, c.headline) });
  el.push({ at: 1, s: wrap(M, H * 0.40 + drop(c, 'any') * 0.4, W - M * 2, H * 0.30, 82, p.ink, c.headline, 'center', 800) });
  if (c.note) el.push({ at: 3, s: `<foreignObject x="${W * 0.18}" y="${H * 0.70 - lift(c, 'any') * 0.75}" width="${W * 0.64}" height="${H * 0.2}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${K.FONT};direction:rtl;font-size:38px;line-height:1.5;color:${p.ink};opacity:0.7;text-align:center">${esc(c.note)}</div></foreignObject>` });
  return el;
}

const FORMS = { focus, split, chain, quote, question };

/* ══ ضرب‌ها به **جمله** بسته می‌شوند، نه به تقسیمِ حسابیِ زمان ══
 * باگی که این را لازم کرد، سنجیده شد: در نمونهٔ پیشین پنج کارت از شش،
 * متنی را نشان می‌دادند که ۱۱ تا ۸۰ ثانیه **قبل** گفته شده بود — چون زمان
 * به‌تساوی بین کارت‌ها تقسیم می‌شد و هیچ‌جای خط تولید نمی‌دانست کدام جمله
 * در کدام ثانیه گفته می‌شود.
 * `c.anchors` ثانیه‌های واقعیِ جمله‌هاست. هر سطحِ `at` به یکی از آن‌ها
 * می‌چسبد؛ سطح‌های بیشتر از لنگرها بینِ دو لنگر پخش می‌شوند، پس ریتم تند
 * می‌مانَد **بی‌آنکه** از گفتار جلو بزند. */
function beats(c, p) {
  const els = (FORMS[c.form] || focus)(c, p);
  const maxAt = els.reduce((m, e) => Math.max(m, e.at), 0);
  const A = (c.anchors || []).slice().sort((a, b) => a - b);
  const end = Number(c.end);
  const svg = [], times = [];
  for (let k = 0; k <= maxAt; k++) {
    svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${K.FONT}">
${K.texture(p)}
${chrome(c, p)}
${els.filter(e => e.at <= k).map(e => e.s).join('\n')}
</svg>`);
  }
  /* نگاشتِ سطح ⇒ ثانیه: سطحِ i به لنگرِ متناظرش، و اگر لنگر کم بود، بینِ
     لنگرِ قبلی و بعدی (یا پایانِ کارت) به‌تساوی. */
  if (A.length) {
    const per = (maxAt + 1) / A.length;
    for (let k = 0; k <= maxAt; k++) {
      const gi = Math.min(A.length - 1, Math.floor(k / per));
      const g0 = A[gi], g1 = (gi + 1 < A.length) ? A[gi + 1] : end;
      const inG = k - Math.ceil(gi * per), nG = Math.max(1, Math.ceil((gi + 1) * per) - Math.ceil(gi * per));
      times.push(g0 + (g1 - g0) * (inG / nG));
    }
  }
  return { svg: svg, times: times, end: end };
}
module.exports = { beats, FORMS, M };
