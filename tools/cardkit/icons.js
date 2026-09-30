/* نشانه‌های مفهومی — دست‌کشیده، نه آیکنِ آماده. این‌ها چیزی‌اند که کارت را
   از «جدول» به «تصویر» می‌بَرند: یک مثلث برای قضیه، یک خوشه برای «صد ذهن»،
   یک زنجیر برای استدلال. کدام‌شان بیاید، از محتوا می‌آید. */
'use strict';
const { rnd, wob, wobEllipse } = require('./draw.js');

function triangle(cx, cy, s, col, seed) {          // قضیهٔ هندسی
  const a = [cx - s, cy + s * 0.62], b = [cx + s, cy + s * 0.62], c = [cx - s, cy - s * 0.62];
  return `<path d="${wob(a[0],a[1],b[0],b[1],seed+'1',2.5)}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/>
  <path d="${wob(b[0],b[1],c[0],c[1],seed+'2',2.5)}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/>
  <path d="${wob(c[0],c[1],a[0],a[1],seed+'3',2.5)}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/>
  <path d="M ${a[0]+22} ${a[1]} L ${a[0]+22} ${a[1]-22} L ${a[0]} ${a[1]-22}" fill="none" stroke="${col}" stroke-width="3" opacity="0.75"/>`;
}
function many(cx, cy, s, col, seed) {              // «به شمارِ ذهن‌ها»
  const r = rnd(seed), o = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, rad = s * (0.35 + r() * 0.75);
    const x = cx + Math.cos(a) * rad * 1.25, y = cy + Math.sin(a) * rad * 0.8;
    o.push(`<path d="${wobEllipse(x, y, 13 + r() * 7, 13 + r() * 7, seed + i)}" fill="none" stroke="${col}" stroke-width="2.6" opacity="${0.45 + r() * 0.5}"/>`);
  }
  return o.join('');
}
function mind(cx, cy, s, col, seed) {              // رخدادِ درونِ ذهن
  return `<path d="${wobEllipse(cx, cy, s * 0.95, s * 0.8, seed)}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/>
  <path d="${wob(cx - s*0.45, cy + s*0.1, cx + s*0.1, cy - s*0.3, seed+'a', 6)}" fill="none" stroke="${col}" stroke-width="2.6" opacity="0.7"/>
  <path d="${wob(cx - s*0.1, cy + s*0.35, cx + s*0.5, cy - s*0.05, seed+'b', 6)}" fill="none" stroke="${col}" stroke-width="2.6" opacity="0.7"/>`;
}
function ear(cx, cy, s, col, seed) {               // شنیدن
  const o = [`<path d="${wobEllipse(cx, cy, s*0.5, s*0.7, seed)}" fill="none" stroke="${col}" stroke-width="4"/>`];
  for (let i = 1; i <= 3; i++)
    o.push(`<path d="${wobEllipse(cx - s*0.2, cy, s*(0.55+i*0.30), s*(0.55+i*0.30), seed+i)}" fill="none" stroke="${col}" stroke-width="2.4" opacity="${0.5 - i*0.11}" stroke-dasharray="10 16"/>`);
  return o.join('');
}
function link(cx, cy, s, col, seed) {              // زنجیرهٔ استدلال
  const o = [];
  for (let i = -1; i <= 1; i++)
    o.push(`<path d="${wobEllipse(cx + i * s * 0.75, cy, s * 0.5, s * 0.34, seed + i)}" fill="none" stroke="${col}" stroke-width="4"/>`);
  return o.join('');
}
function q(cx, cy, s, col, seed) {                 // پرسش
  return `<path d="${wobEllipse(cx, cy, s, s*0.95, seed)}" fill="none" stroke="${col}" stroke-width="3.5" opacity="0.5" stroke-dasharray="14 14"/>
  <text x="${cx}" y="${cy + s*0.45}" text-anchor="middle" font-size="${s*1.3}" fill="${col}" font-weight="800" opacity="0.9">؟</text>`;
}
module.exports = { triangle, many, mind, ear, link, q };

function tag(cx, cy, s, col, seed) {               // برچسبِ تخفیف
  const { wob, wobEllipse } = require('./draw.js');
  return `<path d="M ${cx-s} ${cy-s*0.55} L ${cx+s*0.35} ${cy-s*0.55} L ${cx+s} ${cy} L ${cx+s*0.35} ${cy+s*0.55} L ${cx-s} ${cy+s*0.55} Z" fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="${cx+s*0.45}" cy="${cy}" r="8" fill="${col}" opacity="0.8"/>
  <text x="${cx-s*0.25}" y="${cy+s*0.2}" text-anchor="middle" font-size="${s*0.6}" fill="${col}" font-weight="800">٪</text>`;
}
function doc(cx, cy, s, col, seed) {               // قبض / کاغذ
  const { wob } = require('./draw.js');
  const o = [`<path d="M ${cx-s*0.62} ${cy-s*0.85} L ${cx+s*0.62} ${cy-s*0.85} L ${cx+s*0.62} ${cy+s*0.85} L ${cx-s*0.62} ${cy+s*0.85} Z" fill="none" stroke="${col}" stroke-width="4" stroke-linejoin="round"/>`];
  for (let i = 0; i < 4; i++)
    o.push(`<path d="${wob(cx+s*0.42, cy-s*0.45+i*s*0.36, cx-s*0.42, cy-s*0.45+i*s*0.36, seed+i, 2)}" fill="none" stroke="${col}" stroke-width="2.6" opacity="${i===3?0.9:0.45}"/>`);
  return o.join('');
}
module.exports.tag = tag; module.exports.doc = doc;
