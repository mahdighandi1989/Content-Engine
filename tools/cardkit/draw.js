/* cardkit — کارت را در HTML می‌کشد، نه در اسلایدز.
   اسلایدز فقط مستطیل/بیضی/لوزی/خط/متن دارد. این‌جا SVG هست: بافت، خطِ
   دست‌کشیده، هایلایتر، پیکان، و مهم‌تر از همه **ظاهرشدنِ تدریجی**. */
'use strict';
const FONT = "'Noto Sans Arabic','Noto Naskh Arabic',sans-serif";
const W = 1920, H = 1080;

/* درهم‌سازِ ثابت: یک شناسه همیشه همان لرزش را می‌دهد، پس دو بارِ ساخت
   یک فایل یکسان می‌دهد (وگرنه هر رندر تصویرِ دیگری می‌شد). */
function rnd(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** خطِ دست‌کشیده: خطِ راست با لرزشِ عمودیِ کوچک. */
function wob(x1, y1, x2, y2, seed, amp) {
  const r = rnd(seed), n = 8, dx = (x2 - x1) / n, dy = (y2 - y1) / n;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= n; i++) {
    const t = (r() - 0.5) * 2 * (amp == null ? 3 : amp);
    d += ` L ${(x1 + dx * i + nx * t).toFixed(1)} ${(y1 + dy * i + ny * t).toFixed(1)}`;
  }
  return d;
}
/** بیضیِ دست‌کشیده دورِ یک ناحیه — «دورش خط کشیدن». */
function wobEllipse(cx, cy, rx, ry, seed) {
  const r = rnd(seed); let d = '';
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2 + 0.35;
    const k = 1 + (r() - 0.5) * 0.035;
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
    d += (i ? ' L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
}
/** پیکانِ دست‌کشیده، راست‌به‌چپ. */
function arrowRTL(x, y, len, seed, col) {
  const x2 = x - len;
  return `<path d="${wob(x, y, x2, y, seed, 2.5)}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/>`
    + `<path d="M ${x2 + 16} ${y - 9} L ${x2} ${y} L ${x2 + 16} ${y + 9}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}
/** هایلایترِ ماژیکی پشتِ متن — مستطیلِ کمی کج با لبهٔ نامنظم. */
function marker(x, y, w, h, seed, col) {
  const r = rnd(seed), j = () => (r() - 0.5) * 6;
  return `<path d="M ${x + j()} ${y + j()} L ${x + w + j()} ${y - 2 + j()} L ${x + w + j()} ${y + h + j()} L ${x + j()} ${y + h + 2 + j()} Z" fill="${col}" opacity="0.55"/>`;
}

const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const fa = s => String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/* ── بافت: دانهٔ کاغذ. بافت همان چیزی است که «تخت» را «زنده» می‌کند. ── */
function texture(p) {
  return `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7"/>
    <feColorMatrix type="saturate" values="0"/></filter>
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="${p.grain == null ? 0.09 : p.grain}" style="mix-blend-mode:multiply"/>
  ${p.grid ? `<pattern id="gr" width="${p.grid}" height="${p.grid}" patternUnits="userSpaceOnUse">
    <path d="M ${p.grid} 0 L 0 0 0 ${p.grid}" fill="none" stroke="${p.ink}" stroke-opacity="0.09" stroke-width="1.4"/></pattern>
  <rect width="${W}" height="${H}" fill="url(#gr)"/>` : ''}
  ${p.wash ? `<radialGradient id="wa" cx="18%" cy="78%" r="62%"><stop offset="0%" stop-color="${p.accent}" stop-opacity="0.16"/><stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/></radialGradient><rect width="${W}" height="${H}" fill="url(#wa)"/>` : ''}
  ${p.rule ? `<rect x="${W*0.055}" y="${H*0.055}" width="${W*0.89}" height="${H*0.89}" fill="none" stroke="${p.accent}" stroke-opacity="0.30" stroke-width="2"/><rect x="${W*0.062}" y="${H*0.062}" width="${W*0.876}" height="${H*0.876}" fill="none" stroke="${p.accent}" stroke-opacity="0.16" stroke-width="1"/>` : ''}
  <radialGradient id="vig" cx="50%" cy="45%" r="75%">
    <stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${p.vig == null ? 0.07 : p.vig}"/>
  </radialGradient><rect width="${W}" height="${H}" fill="url(#vig)"/>`;
}
module.exports = { W, H, FONT, wob, wobEllipse, arrowRTL, marker, esc, fa, texture, rnd };
