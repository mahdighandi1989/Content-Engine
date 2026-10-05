/* overlay — نوشتهٔ رویِ نقاشیِ صحنه (۸.۴۵).
 *
 * ══ چرا این فایل هست ══
 * ۵ اکتبر، دربارهٔ درسِ ۳۸: «عکس‌ها خیلی مفهومی بودن ولی هیچ نوشته‌ای نبود روی
 * عکس‌ها … حالتِ برداری روی عکس‌ها هم بیاد بدونِ اینکه روی جایی بیاد که خرابش
 * کنه … نه اینکه یه اسلاید برداری باشه یکی تصویری … نوشته‌ها با فونت‌های مختلف و
 * رنگ‌های مختلف، معنی‌دار و هماهنگ با عکس». نمونه‌هایش: تیتری درشت با واژهٔ
 * کلیدیِ رنگی/ماژیکی، ستونی کنارِ تصویر با چند نکته، جدولِ دوستونهٔ «ساده/تقاطع»،
 * نقل‌قول با گیومهٔ درشت، و سه کارتِ پشتِ‌هم با پیکان.
 *
 * ══ سه قول، و هر سه در کد ══
 *   ۱) **روی جای مهم نمی‌نشیند.** جای نوشته از خودِ تصویر خوانده می‌شود: کم‌جنب‌وجوش‌ترین
 *      ناحیه (کمترین انرژیِ لبه) میانِ چند جای ممکن، و هرگز روی گوشهٔ نشانِ کانال.
 *      نوشته‌ای که باید روی شلوغی بنشیند (جدول، گام‌ها) قابِ نیمه‌کدرِ خودش را دارد.
 *   ۲) **رنگ از خودِ تصویر.** روشنیِ همان ناحیه تیره/روشن بودنِ نوشته را می‌گوید، و
 *      رنگِ تأکید از فامِ غالبِ نقاشی می‌آید — اگر نقاشی تک‌فام است، مکملِ همان فام.
 *   ۳) **برچسبی که خودش را نسنجد، ادعاست.** خروجیِ `render` جای انتخاب‌شده، انرژیِ
 *      آن و رنگ‌ها را برمی‌گرداند تا در `renders.json` ثبت و دیده شود.
 *
 * مرز: مثلِ scenekit **شبکه ندارد**؛ ورودی فایلِ محلی است.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const OV = {
  w: 1920, h: 1080,
  aw: 96, ah: 54,                // ابعادِ نسخهٔ کوچکِ تحلیل
  kinds: ['headline', 'points', 'compare', 'quote', 'steps'],
  fadeIn: 0.9, fade: 0.5,
  // جاهای ممکن، به مختصاتِ ۱۹۲۰×۱۰۸۰. پایینِ ۸۱۰ مالِ زیرنویس است.
  /* ══ جا از **اندازهٔ واقعیِ نوشته** و **خودِ تصویر** پیدا می‌شود ══
     نگارشِ اول چند جعبهٔ ثابت داشت (راست/چپ/بالا) و میانگینِ شلوغیِ هر جعبه را
     می‌سنجید؛ روی صحنهٔ ۴۴ِ درسِ ۳۸ جعبهٔ چپ «آرام‌ترین» بود و نوشته روی صورتِ
     آدمِ صحنه نشست. حالا نوشته اول کشیده و اندازه‌اش از پیکسل‌های خودش خوانده
     می‌شود، بعد همهٔ جاهای ممکن با همان اندازه روی نقشهٔ شلوغی لغزانده می‌شوند. */
  width: { headline: 1120, points: 660, quote: 700, compare: 1180, steps: 1320 },
  safe: { x0: 56, y0: 44, x1: 1864, y1: 816 },   // زیرِ ۸۱۶ مالِ زیرنویس است
  calm: 8,       // زیرِ این شلوغی: بی پرده، فقط سایهٔ نوشته
  busy: 16,      // بالای این: نوشتهٔ کناری نمی‌نشیند — تصویر جای خالی ندارد
  busyPanel: 20, // جدول و گام‌ها قاب دارند، ولی روی شلوغی همان «اسلایدِ جدا» می‌شوند
  mass: 0.012,   // سهمِ تودهٔ تیره (آدم، شیءِ اصلی) درونِ جعبه؛ بیشتر ⇒ نه (سرِ آدمِ صحنهٔ ۲۰: ۰٫۰۱۷)
  origin: 100,   // جای کشیدنِ نوشته در صفحه، پیش از برش
  fonts: {
    body: "'Vazirmatn','Noto Sans Arabic',sans-serif",
    display: "'Lalezar','Vazirmatn','Noto Sans Arabic',sans-serif",
    naskh: "'Noto Naskh Arabic','Vazirmatn',serif",
    nastaliq: "'Noto Nastaliq Urdu','Noto Naskh Arabic',serif",
    kufi: "'Noto Kufi Arabic','Vazirmatn',sans-serif"
  }
};

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fa = s => String(s == null ? '' : s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };

/**
 * نوشتهٔ یک صحنه، پاک‌شده. هرچه نامعتبر است `null` — و `null` یعنی صحنه همان
 * تصویرِ بی‌نوشته می‌ماند، نه یک قابِ نیمه‌ساخته.
 */
function ovNorm(ov) {
  if (!ov || typeof ov !== 'object') return null;
  const kind = String(ov.kind || '').trim();
  if (OV.kinds.indexOf(kind) === -1) return null;
  const lines = (Array.isArray(ov.lines) ? ov.lines : []).map(x => cut(fa(x), 90)).filter(Boolean);
  const out = { kind: kind, title: cut(fa(ov.title), kind === 'quote' ? 140 : 60), lines: [],
                a: cut(fa(ov.a), 28), b: cut(fa(ov.b), 28), side: String(ov.side || '').trim(),
                keys: (Array.isArray(ov.keys) ? ov.keys : []).map(x => cut(fa(x), 30)).filter(Boolean).slice(0, 4) };
  if (kind === 'headline') { if (!out.title) return null; out.lines = lines.slice(0, 1); }
  if (kind === 'points') { out.lines = lines.slice(0, 3); if (!out.lines.length) return null; }
  if (kind === 'quote') { if (!out.title) return null; }
  if (kind === 'steps') { out.lines = lines.map(x => cut(x, 34)).slice(0, 3); if (out.lines.length < 2) return null; }
  if (kind === 'compare') {
    // هر ردیف: «برچسب: راست | چپ»
    out.rows = [];
    for (const l of lines.slice(0, 3)) {
      const m = String(l).split('|');
      if (m.length < 2) continue;
      const left = m[1].trim(), right = m[0].trim();
      const lab = (right.indexOf(':') > 0) ? right.slice(0, right.indexOf(':')).trim() : '';
      const rv = lab ? right.slice(right.indexOf(':') + 1).trim() : right;
      out.rows.push({ lab: cut(lab, 18), r: cut(rv, 32), l: cut(left, 32) });
    }
    if (!out.a || !out.b || !out.rows.length) return null;
  }
  return out;
}

/** نسخهٔ کوچکِ RGB از یک تصویر — همان برش و اندازه‌ای که ویدئو می‌بیند. */
function analyze(ff, img) {
  const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-i', img, '-frames:v', '1',
    '-vf', 'scale=' + OV.w + ':' + OV.h + ':force_original_aspect_ratio=increase,crop=' + OV.w + ':' + OV.h +
           ',scale=' + OV.aw + ':' + OV.ah + ':flags=area,format=rgb24', '-f', 'rawvideo', '-'],
    { maxBuffer: 8 * 1024 * 1024 });
  const b = r.stdout;
  if (!b || b.length < OV.aw * OV.ah * 3) return null;
  const n = OV.aw * OV.ah, g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = 0.299 * b[i * 3] + 0.587 * b[i * 3 + 1] + 0.114 * b[i * 3 + 2];
  // انرژیِ لبه: اختلافِ هر نقطه با همسایهٔ راست و پایین
  const e = new Float32Array(n);
  for (let y = 0; y < OV.ah; y++) for (let x = 0; x < OV.aw; x++) {
    const i = y * OV.aw + x;
    const dx = x + 1 < OV.aw ? Math.abs(g[i] - g[i + 1]) : 0;
    const dy = y + 1 < OV.ah ? Math.abs(g[i] - g[i + OV.aw]) : 0;
    e[i] = dx + dy;
  }
  return { rgb: b.subarray(0, n * 3), g: g, e: e };
}

const toA = (v, full, small) => Math.round(v * small / full);

/** میانگینِ انرژی و روشنی در یک جعبه (مختصاتِ ۱۹۲۰×۱۰۸۰). */
function boxStats(an, bx) {
  const x0 = toA(bx.x, OV.w, OV.aw), x1 = Math.max(x0 + 1, toA(bx.x + bx.w, OV.w, OV.aw));
  const y0 = toA(bx.y, OV.h, OV.ah), y1 = Math.max(y0 + 1, toA(bx.y + bx.h, OV.h, OV.ah));
  let es = 0, ls = 0, n = 0;
  for (let y = y0; y < Math.min(y1, OV.ah); y++) for (let x = x0; x < Math.min(x1, OV.aw); x++) {
    const i = y * OV.aw + x; es += an.e[i]; ls += an.g[i]; n++;
  }
  return { energy: n ? es / n : 99, lum: n ? ls / n / 255 : 0.5 };
}

const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * بهترین جا برای جعبه‌ای به اندازهٔ w×h: کمترین شلوغی، با ترجیحِ لبه‌ها (نوشته
 * کنارِ تصویر می‌نشیند، نه وسطش)، دور از نشانِ کانال. `side` پیشنهادِ موتور است
 * (به نقاش گفته بود همان‌جا را خلوت بگذارد) و فقط وقتی برنده است که از بهترین
 * خیلی شلوغ‌تر نباشد — تصویر حرفِ آخر را می‌زند، نه وعده.
 */
function place(an, w, h, kind, side, avoid) {
  const S = OV.safe, aw = OV.aw, ah = OV.ah, sx = OV.w / aw, sy = OV.h / ah;
  const rw = Math.max(1, Math.ceil(w / sx)), rh = Math.max(1, Math.ceil(h / sy));
  // تصویرِ انتگرالیِ شلوغی
  const I = new Float64Array((aw + 1) * (ah + 1));
  for (let y = 0; y < ah; y++) {
    let row = 0;
    for (let x = 0; x < aw; x++) {
      row += an ? an.e[y * aw + x] : 10;
      I[(y + 1) * (aw + 1) + x + 1] = I[y * (aw + 1) + x + 1] + row;
    }
  }
  /* ══ میانگین کافی نیست: آدمِ صحنه یک تودهٔ جدا از زمینه است ══
     جعبه‌ای که بیشترش آسمان است و گوشه‌اش سرِ آدمِ صحنه، میانگینِ آرامی دارد —
     همان که در آزمونِ صحنهٔ ۲۰ کارتِ وسطی را روی سرش نشاند. «بیشینهٔ لبه» جواب
     نداد: خط‌های نازکِ آسمان هم لبهٔ تیز دارند (سنجیده شد: ۱۲۰ برای آسمانِ خالی).
     ولی در نسخهٔ کوچکِ میانگین‌گرفته، خطِ نازک به رنگِ زمینه نزدیک می‌شود و تودهٔ پر
     (لباس، مو، شیءِ اصلی) جدا می‌ماند. پس سهمِ خانه‌هایی سنجیده می‌شود که از روشنیِ
     **میانگینِ همان جعبه** خیلی دورند. نگارشِ اول «تیره» را با روشنیِ **کلِ تصویر**
     تعریف می‌کرد و پنلِ فیروزه‌ایِ صحنهٔ ۵ — خودش زمینه — را «توده» خواند. */
  /* (رنگ هم آزموده شد: ابرهای سفید روی آسمانِ آبی را «توده» خواند و زنجیرِ صحنهٔ ۵
     را باز هم ندید. سنجهٔ پیکسلی سقف دارد؛ «کجای تصویر خالی است» را داور — که خودِ
     تصویر را می‌بیند — می‌گوید و این‌جا فقط `side` می‌رسد.) */
  const G = new Float64Array((aw + 1) * (ah + 1));
  for (let y = 0; y < ah; y++) {
    let row = 0;
    for (let x = 0; x < aw; x++) {
      row += an ? an.g[y * aw + x] : 128;
      G[(y + 1) * (aw + 1) + x + 1] = G[y * (aw + 1) + x + 1] + row;
    }
  }
  const mass = (x0, y0, x1, y1) => {
    if (!an) return 0;
    const n = Math.max(1, (x1 - x0) * (y1 - y0));
    const m = (G[y1 * (aw + 1) + x1] - G[y0 * (aw + 1) + x1] - G[y1 * (aw + 1) + x0] + G[y0 * (aw + 1) + x0]) / n;
    let c = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (Math.abs(an.g[y * aw + x] - m) > 72) c++;
    return c / n;
  };
  const sum = (x0, y0, x1, y1) => I[y1 * (aw + 1) + x1] - I[y0 * (aw + 1) + x1] - I[y1 * (aw + 1) + x0] + I[y0 * (aw + 1) + x0];
  const lum = (x0, y0, x1, y1) => {
    if (!an) return 0.5;
    let t = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { t += an.g[y * aw + x]; n++; }
    return n ? t / n / 255 : 0.5;
  };
  const gx0 = Math.ceil(S.x0 / sx), gy0 = Math.ceil(S.y0 / sy);
  const gx1 = Math.floor(S.x1 / sx) - rw, gy1 = Math.floor(S.y1 / sy) - rh;
  const panel = (kind === 'compare' || kind === 'steps');
  let best = null, worst = null;     // بهترینِ مجاز، و بهترینِ کل (برای گزارشِ «شلوغ»)
  for (let y = gy0; y <= gy1; y++) for (let x = gx0; x <= gx1; x++) {
    const bx = { x: x * sx, y: y * sy, w: w, h: h };
    if (avoid && hit(bx, avoid)) continue;
    /* داور گفته کجای تصویر خالی است ⇒ فقط همان‌جا (۸.۴۵). گفتهٔ داور بر سنجهٔ
       پیکسلی مقدم است، چون او تصویر را **می‌بیند**؛ سنجهٔ پیکسلی بعد فقط جای دقیق
       را درونِ همان نوار پیدا می‌کند و شلوغی را باز هم رد می‌کند. */
    if (side === 'right' && x + rw / 2 < aw * 0.55) continue;
    if (side === 'left' && x + rw / 2 > aw * 0.45) continue;
    if (side === 'top' && y + rh / 2 > ah * 0.42) continue;
    const e = sum(x, y, x + rw, y + rh) / (rw * rh);
    const cx = (x + rw / 2) / aw;                                  // ۰ تا ۱
    const edge = Math.min(x - gx0, gx1 - x) / Math.max(1, gx1 - gx0);   // ۰ = لبه
    const top = (y - gy0) / Math.max(1, gy1 - gy0);
    let at = cx > 0.62 ? 'right' : cx < 0.38 ? 'left' : (top < 0.25 ? 'top' : 'center');
    // جدول و گام‌ها قابِ خودشان را دارند و وسط هم می‌نشینند؛ بقیه لبه را می‌خواهند
    const pen = panel ? 0 : 6 * Math.min(edge, kind === 'headline' ? Math.min(edge, top) : edge);
    const bonus = (side && side === at) ? -1.2 : 0;
    const pk = mass(x, y, x + rw, y + rh);
    /* `60 * pk` **ترجیح** است، نه سد: میانِ دو جای هم‌آرام، آنکه توده ندارد را
       برمی‌گزیند. سد همان `busy` پایین است (۱۳.۲-ب). شکستنِ این جمله هیچ سنجه‌ای را
       سرخ نکرد، چون ترجیحِ لبه معمولاً همان جا را می‌دهد (۷٫۷۱: برچسبِ راست). */
    const sc = e + 60 * pk + pen + bonus;
    const cand = { sc: sc, e: e, pk: pk, at: at, x: Math.round(bx.x), y: Math.round(bx.y), gx: x, gy: y };
    const bz = e > (panel ? OV.busyPanel : OV.busy) || pk > OV.mass;
    /* بهترین **میانِ جاهای مجاز**، نه بهترین و بعد پرسیدن که مجاز است یا نه:
       صحنهٔ ۳۸ِ درسِ ۳۸ جای خلوتش وسط بود (میانِ قفسه‌ها و آدم) و جستجو لبهٔ راست
       را برمی‌گزید — که آدم آن‌جا بود — و بعد کلِ نوشته را دور می‌انداخت. */
    if (!bz && (!best || sc < best.sc)) best = cand;
    if (!worst || sc < worst.sc) worst = cand;
  }
  const pickd = best || worst;
  if (!pickd) return null;
  return { k: pickd.at, box: { x: pickd.x, y: pickd.y, w: w, h: h }, energy: pickd.e, peak: pickd.pk,
           lum: lum(pickd.gx, pickd.gy, pickd.gx + rw, pickd.gy + rh), busy: !best };
}

/** HSV از RGB (۰..۱). */
function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h: h, s: mx ? d / mx : 0, v: mx };
}

/**
 * رنگ‌ها از خودِ نقاشی. فامِ غالب با وزنِ «سیری × روشنی» شمرده می‌شود؛ نقاشیِ
 * تک‌فام (سیریِ کم) تأکیدِ **مکمل** می‌گیرد — آبیِ خاکستری با کهربایی — چون
 * تأکیدی هم‌فامِ زمینه دیده نمی‌شود.
 */
function palette(an, region, n) {
  const dark = region.lum < 0.55;
  const bins = new Float32Array(12);
  let satSum = 0, cnt = 0;
  if (an) {
    for (let i = 0; i < an.rgb.length; i += 3) {
      const c = hsv(an.rgb[i], an.rgb[i + 1], an.rgb[i + 2]);
      satSum += c.s; cnt++;
      if (c.s > 0.18 && c.v > 0.25) bins[Math.floor(c.h / 30) % 12] += c.s * c.v;
    }
  }
  let best = 0;
  for (let i = 1; i < 12; i++) if (bins[i] > bins[best]) best = i;
  const hue = best * 30 + 15;
  const vivid = cnt && (satSum / cnt) > 0.28 && bins[best] > 0;
  /* تأکید **مکملِ فامِ غالب** است، چه نقاشی تک‌فام باشد چه رنگارنگ: نگارشِ اول
     برای نقاشیِ رنگارنگ همان فام را کمی می‌چرخاند و روی پنلِ فیروزه‌ایِ صحنهٔ ۵
     واژهٔ کلیدیِ **آبی** داد — تأکیدی که از زمینه جدا نمی‌شود. */
  const h1 = (hue + 180) % 360;
  const h2 = (h1 + 150 + (n % 2) * 60) % 360;   // رنگِ دوم برای ستونِ دوم / گامِ دوم
  const L1 = dark ? 66 : 40, L2 = dark ? 72 : 36;
  return {
    dark: dark,
    ink: dark ? '#FBF7EF' : '#1C2230',
    soft: dark ? 'rgba(251,247,239,.86)' : 'rgba(28,34,48,.82)',
    scrim: dark ? '8,12,22' : '250,247,240',
    panel: dark ? 'rgba(10,14,24,.80)' : 'rgba(252,250,245,.88)',
    line: dark ? 'rgba(251,247,239,.28)' : 'rgba(28,34,48,.22)',
    a1: 'hsl(' + Math.round(h1) + ',78%,' + L1 + '%)',
    a2: 'hsl(' + Math.round(h2) + ',70%,' + L2 + '%)',
    marker: 'hsla(' + Math.round(h1) + ',90%,' + (dark ? 58 : 62) + '%,.92)',
    markerInk: '#16181D',
    hue: Math.round(hue), vivid: !!vivid
  };
}

/** واژه‌های کلیدی، رنگی یا ماژیکی — فقط اگر واقعاً در متن باشند. */
function hl(text, keys, pal, mode) {
  let s = esc(text);
  for (const k of (keys || [])) {
    const e = esc(k);
    if (!e || s.indexOf(e) === -1) continue;
    const span = mode === 'marker'
      ? '<span style="background:' + pal.marker + ';color:' + pal.markerInk + ';padding:0 .18em;border-radius:.18em;box-decoration-break:clone;-webkit-box-decoration-break:clone">' + e + '</span>'
      : mode === 'under'
        ? '<span style="color:' + pal.a1 + ';border-bottom:.08em solid ' + pal.a1 + '">' + e + '</span>'
        : '<span style="color:' + pal.a1 + '">' + e + '</span>';
    s = s.split(e).join(span);
  }
  return s;
}

/** پوستهٔ HTML: زمینهٔ شفاف و جعبهٔ نوشته در جای خودش. */
function shell(inner, w, extraCss, fixed) {
  /* پهنای جعبه **به اندازهٔ نوشته** (جز جدول و گام‌ها): اندازه‌ای که پیش از
     جاگذاری سنجیده می‌شود باید با چیدمانِ نهایی یکی باشد، حتی وقتی تیتر وسط‌چین
     می‌شود. */
  return '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:' + OV.w + 'px;height:' + OV.h +
    'px;background:transparent;overflow:hidden}*{box-sizing:border-box}' +
    '.bx{position:absolute;left:' + OV.origin + 'px;top:' + OV.origin + 'px;' +
    (fixed ? 'width:' + w + 'px;' : 'width:max-content;max-width:' + w + 'px;') +
    'direction:rtl}' + (extraCss || '') + '</style><div class="bx">' + inner + '</div>';
}

/** پرده‌ای نرم از لبهٔ قاب تا نوشته خوانا بماند و نقاشی پیدا. */
function scrimCss(pal, calm) {
  /* زمینهٔ آرام پرده نمی‌خواهد: پردهٔ روشن روی کاغذِ روشن فقط نقاشی را
     کم‌رنگ می‌کند (صحنهٔ ۴۴ در نگارشِ اول). جای شلوغ‌تر یک هالهٔ نرم می‌گیرد،
     نه یک قابِ لبه‌دار. */
  if (calm) return '';
  return '.bx::before{content:"";position:absolute;inset:-34px -44px;z-index:-1;border-radius:40px;' +
    'background:rgba(' + pal.scrim + ',.62);filter:blur(22px)}';
}

/**
 * HTML هر نوع. چیدمان‌ها برگرفته از نمونه‌هایی که صاحبِ برنامه فرستاد؛ تنوع با
 * شمارهٔ صحنه (`n`) — دو صحنهٔ پشتِ‌هم یک شکل نمی‌گیرند.
 */
function html(ov, w, pal, n, calm, k) {
  const mode = ['marker', 'color', 'under'][n % 3];
  const F = OV.fonts;
  const shadow = pal.dark ? 'text-shadow:0 2px 14px rgba(0,0,0,.55);' : 'text-shadow:0 1px 10px rgba(255,255,255,.6);';
  if (ov.kind === 'headline') {
    const disp = n % 2 === 0 ? F.display : F.body;
    const len = ov.title.length;
    const fs = len > 30 ? 66 : len > 18 ? 78 : 92;
    const align = k === 'top' ? 'center' : 'right';
    const inner = '<div style="font-family:' + disp + ';font-weight:900;font-size:' + fs + 'px;line-height:1.35;color:' +
      pal.ink + ';text-align:' + align + ';' + shadow + '">' + hl(ov.title, ov.keys, pal, mode) + '</div>' +
      (ov.lines[0] ? '<div style="margin-top:18px;font-family:' + F.body + ';font-weight:500;font-size:40px;line-height:1.6;color:' +
        pal.soft + ';text-align:' + align + ';' + shadow + '">' + hl(ov.lines[0], ov.keys, pal, 'color') + '</div>' : '');
    return shell(inner, w, scrimCss(pal, calm));
  }
  if (ov.kind === 'points') {
    const rows = ov.lines.map(l =>
      '<div style="display:flex;gap:22px;align-items:stretch;margin:16px 0">' +
      '<div style="flex:0 0 7px;border-radius:4px;background:' + pal.a1 + '"></div>' +
      '<div style="font-family:' + F.body + ';font-weight:500;font-size:' + (l.length > 60 ? 36 : 40) +
      'px;line-height:1.62;color:' + pal.ink + ';' + shadow + '">' + hl(l, ov.keys, pal, mode) + '</div></div>').join('');
    const inner = (ov.title ? '<div style="font-family:' + F.body + ';font-weight:900;font-size:56px;line-height:1.4;' +
      'color:' + pal.ink + ';margin-bottom:14px;' + shadow + '">' + hl(ov.title, ov.keys, pal, 'color') + '</div>' : '') + rows;
    return shell(inner, w, scrimCss(pal, calm));
  }
  if (ov.kind === 'quote') {
    const nast = ov.title.length <= 48 && n % 2 === 1;
    const fs = nast ? 66 : (ov.title.length > 90 ? 46 : 54);
    // «❞» آینه نمی‌شود؛ «» در متنِ راست‌به‌چپ وارونه کشیده می‌شود
    const inner = '<div style="font-family:' + F.body + ';font-weight:900;font-size:140px;line-height:.7;color:' + pal.a1 +
      ';height:76px">❞</div>' +
      '<div style="font-family:' + (nast ? F.nastaliq : F.naskh) + ';font-weight:700;font-size:' + fs +
      'px;line-height:' + (nast ? 2.0 : 1.6) + ';color:' + pal.ink + ';' + shadow + '">' + hl(ov.title, ov.keys, pal, mode) + '</div>' +
      (ov.lines[0] ? '<div style="margin-top:16px;font-family:' + F.body + ';font-weight:600;font-size:34px;color:' + pal.a1 + '">— ' +
        esc(ov.lines[0]) + '</div>' : '');
    return shell(inner, w, scrimCss(pal, calm));
  }
  if (ov.kind === 'compare') {
    const cell = (t, c) => '<div style="font-family:' + F.body + ';font-weight:700;font-size:40px;line-height:1.5;color:' +
      pal.ink + ';text-align:center">' + (t.lab ? '<span style="opacity:.85">' + esc(t.lab) + ': </span>' : '') +
      '<span style="color:' + c + '">' + esc(t.v) + '</span></div>';
    const rows = ov.rows.map(r => '<div style="display:grid;grid-template-columns:1fr 1fr;border-top:2px solid ' + pal.line +
      ';padding:18px 0">' + cell({ lab: r.lab, v: r.r }, pal.a1) + cell({ lab: r.lab, v: r.l }, pal.a2) + '</div>').join('');
    const inner = '<div style="background:' + pal.panel + ';border-radius:34px;padding:40px 56px;box-shadow:0 12px 50px rgba(0,0,0,.28)">' +
      (ov.title ? '<div style="font-family:' + F.display + ';font-size:62px;line-height:1.4;color:' + pal.ink +
        ';text-align:center;margin-bottom:10px">' + hl(ov.title, ov.keys, pal, 'color') + '</div>' : '') +
      '<div style="display:grid;grid-template-columns:1fr 1fr;padding-bottom:12px">' +
      '<div style="font-family:' + F.body + ';font-weight:900;font-size:50px;color:' + pal.a1 + ';text-align:center">' + esc(ov.a) + '</div>' +
      '<div style="font-family:' + F.body + ';font-weight:900;font-size:50px;color:' + pal.a2 + ';text-align:center;border-right:2px solid ' +
      pal.line + '">' + esc(ov.b) + '</div></div>' + rows + '</div>';
    return shell(inner, w, '', true);
  }
  if (ov.kind === 'steps') {
    const cols = [pal.a1, pal.a2, pal.a1];
    const card = (t, i) => '<div style="flex:1;background:' + pal.panel + ';border-radius:28px;padding:30px 28px;' +
      'box-shadow:0 10px 40px rgba(0,0,0,.22);border-top:8px solid ' + cols[i % 3] + '">' +
      '<div style="font-family:' + F.display + ';font-size:58px;line-height:1;color:' + cols[i % 3] + '">' + fa(i + 1) + '</div>' +
      '<div style="margin-top:14px;font-family:' + F.body + ';font-weight:700;font-size:38px;line-height:1.5;color:' + pal.ink + '">' +
      hl(t, ov.keys, pal, 'color') + '</div></div>';
    const arrow = '<div style="flex:0 0 60px;display:flex;align-items:center;justify-content:center;font-size:56px;color:' +
      pal.ink + ';' + shadow + '">←</div>';
    const parts = [];
    ov.lines.forEach((t, i) => { if (i) parts.push(arrow); parts.push(card(t, i)); });
    const inner = (ov.title ? '<div style="font-family:' + F.display + ';font-size:64px;line-height:1.4;color:' + pal.ink +
      ';text-align:center;margin-bottom:26px;' + shadow + '">' + hl(ov.title, ov.keys, pal, 'color') + '</div>' : '') +
      '<div style="display:flex;align-items:stretch">' + parts.join('') + '</div>';
    return shell(inner, w, '', true);
  }
  return '';
}

/** جعبهٔ پیکسل‌های غیرشفافِ یک PNG (در مختصاتِ صفحه). */
function alphaBox(ff, png) {
  const k = 4, W = OV.w / k, H = OV.h / k;
  const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-i', png,
    '-vf', 'scale=' + W + ':' + H + ':flags=area,format=rgba', '-f', 'rawvideo', '-'], { maxBuffer: 8 * 1024 * 1024 });
  const b = r.stdout;
  if (!b || b.length < W * H * 4) return null;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (b[(y * W + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  return { x: x0 * k, y: y0 * k, w: (x1 - x0 + 1) * k, h: (y1 - y0 + 1) * k };
}

/**
 * ساختِ لایهٔ نوشتهٔ یک صحنه: PNGِ شفاف به اندازهٔ نوشته، و جایش.
 * دو بار کشیده می‌شود: بارِ اول فقط برای **اندازه** (جا به اندازه بسته است)،
 * بارِ دوم با رنگ‌هایی که از **همان جای** تصویر خوانده شد.
 * @return {{file, x, y, w, h, k, energy, lum, accent}|{skip}|null}
 */
function render(ctx, ov, img, n, avoid) {
  const o = ovNorm(ov);
  if (!o) return null;
  const an = analyze(ctx.ff, img);
  const marg = 36, pad = 96;
  /* ══ جا نشد؟ باریک‌تر ══
     صحنهٔ ۳۸ِ درسِ ۳۸ میانِ قفسه‌ها و آدم ۶۰۰ پیکسل جای خالی داشت و نوشتهٔ ۷۳۰
     پیکسلی در آن جا نمی‌شد؛ همان نوشته با ۴۴۰ پیکسل جا شد. پس پیش از کنار گذاشتنِ
     صحنه، نوشته باریک‌تر (و بلندتر) کشیده و دوباره جا داده می‌شود. جدول و گام‌ها
     باریک نمی‌شوند: ستون‌هایشان معنا دارند. */
  const panelK = (o.kind === 'compare' || o.kind === 'steps');
  const W0 = OV.width[o.kind] || 700;
  const widths = panelK ? [W0] : [W0, Math.round(W0 * 0.8), Math.max(420, Math.round(W0 * 0.66))];
  let w = W0, bb = null, where = null;
  for (let wi = 0; wi < widths.length; wi++) {
    w = widths[wi];
    const m = ctx.shoot(html(o, w, palette(an, { lum: 0.7 }, n), n, true, 'right'),
                        path.join(ctx.dir, 'ovm' + n + '.png'));
    bb = alphaBox(ctx.ff, m);
    try { fs.unlinkSync(m); } catch (e) {}
    if (!bb) return null;
    where = place(an, bb.w + 2 * marg, bb.h + 2 * marg, o.kind, o.side, avoid);
    if (!where || !where.busy) break;
  }
  if (!where) return null;
  if (where.busy) return { skip: 'busy', k: where.k, kind: o.kind, energy: Math.round(where.energy * 10) / 10,
                           mass: Math.round(where.peak * 1000) / 1000 };
  const calm = where.energy < OV.calm;
  const pal = palette(an, where, n);
  const full = ctx.shoot(html(o, w, pal, n, calm, where.k), path.join(ctx.dir, 'ovf' + n + '.png'));
  const cx = Math.max(0, bb.x - pad), cy = Math.max(0, bb.y - pad);
  const cw = Math.min(OV.w - cx, bb.w + 2 * pad), ch = Math.min(OV.h - cy, bb.h + 2 * pad);
  const out = path.join(ctx.dir, 'ov' + n + '.png');
  ctx.ffRun(['-y', '-i', full, '-vf', 'crop=' + cw + ':' + ch + ':' + cx + ':' + cy, '-frames:v', '1', out]);
  try { fs.unlinkSync(full); } catch (e) {}
  return { file: out, x: where.box.x + marg - (bb.x - cx), y: where.box.y + marg - (bb.y - cy), w: cw, h: ch,
           k: where.k, kind: o.kind, energy: Math.round(where.energy * 10) / 10, mass: Math.round(where.peak * 1000) / 1000,
           lum: Math.round(where.lum * 100) / 100, accent: pal.a1, vivid: pal.vivid, calm: calm };
}

module.exports = { OV, ovNorm, analyze, boxStats, place, palette, html, render, alphaBox, hsv };
