/* نشانِ کانال — و **جابه‌جا می‌شود**.
 *
 * خواستهٔ صریحِ صاحبِ برنامه: نشان در گوشه باشد، شناسهٔ کانال زیرش، و هر چند
 * دقیقه جایش عوض شود «تا کسی نتواند بعداً لوگوی خودش را رویش بگذارد».
 *
 * سه قیدی که با هم می‌آیند و اگر یکی‌شان را رها کنی، خواسته نقض می‌شود:
 *   ۱) هرگز روی متن نیفتد — پس گوشه‌ای که نشان می‌گیرد، سربرگ/پانویس از آن
 *      کنار می‌روند. جای نشان **ورودیِ** چیدمان است، نه چیزی که رویش کشیده شود.
 *   ۲) زشت نشود — کوچک، کم‌رنگ، با هالهٔ نرم تا روی زمینهٔ روشن و تیره هر دو
 *      خوانده شود.
 *   ۳) جابه‌جایی سرِ **مرزِ کارت** بیفتد، نه وسطِ یک کارت: پرشِ نشان وسطِ یک
 *      تصویرِ ثابت، خودش یک خطای بصری است.
 */
'use strict';
const CORNERS = ['br', 'tl', 'bl', 'tr'];      // ترتیبِ چرخش

/** گوشهٔ نشان در ثانیهٔ t. از زمانِ **شروعِ کارت** می‌آید تا وسطِ کارت نپرد. */
function cornerAt(t, everySec) {
  const e = Math.max(30, Number(everySec) || 180);
  return CORNERS[Math.floor(Math.max(0, Number(t) || 0) / e) % CORNERS.length];
}

/** جعبهٔ ممنوعه — چیدمان باید از آن دوری کند. */
function box(corner, W, H, M) {
  const w = 250, h = 118;
  const x = (corner === 'br' || corner === 'tr') ? W - M - w : M;
  const y = (corner === 'br' || corner === 'bl') ? H - M - h : M - 24;
  return { x: x, y: y, w: w, h: h };
}

/**
 * SVG نشان. `logo` یک data-URI است (اگر باشد)؛ نبودش خطا نیست — تک‌نگارهٔ
 * حرفِ اولِ کانال کشیده می‌شود، که از هیچ بهتر است و ادعای دروغ نمی‌کند.
 */
function draw(opt) {
  const { corner, W, H, M, handle, name, logo, ink } = opt;
  const b = box(corner, W, H, M);
  const cx = b.x + b.w / 2, top = b.y + 6, s = 62;
  const o = ['<!--mark-->'];
  o.push(`<filter id="mkS" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#000" flood-opacity="0.28"/></filter>`);
  o.push(`<g opacity="${opt.opacity == null ? 0.62 : opt.opacity}" filter="url(#mkS)">`);
  if (logo) {
    o.push(`<image x="${cx - s / 2}" y="${top}" width="${s}" height="${s}" href="${logo}" preserveAspectRatio="xMidYMid meet"/>`);
  } else {
    const ch = String(name || '?').trim().charAt(0) || '?';
    o.push(`<circle cx="${cx}" cy="${top + s / 2}" r="${s / 2}" fill="none" stroke="${ink}" stroke-width="3"/>`);
    o.push(`<text x="${cx}" y="${top + s / 2 + 13}" text-anchor="middle" font-size="34" font-weight="800" fill="${ink}">${ch}</text>`);
  }
  if (handle) {
    o.push(`<text x="${cx}" y="${top + s + 30}" text-anchor="middle" font-size="24" font-weight="600" fill="${ink}" letter-spacing="0.4">${String(handle).replace(/[<>&]/g, '')}</text>`);
  }
  o.push('</g><!--/mark-->');
  return o.join('');
}
module.exports = { CORNERS, cornerAt, box, draw };
