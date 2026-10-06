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
  slide: 0.6, slideDx: 70,     // ورودِ کارت: لغزشی کوتاه از سمتِ خودش (۸.۵۶)
  showMin: 7, showBase: 5.5, showPer: 2.8, showTail: 3.2,   // پنجرهٔ دیده‌شدن (`windowOf`)
  // جاهای ممکن، به مختصاتِ ۱۹۲۰×۱۰۸۰. پایینِ ۸۱۰ مالِ زیرنویس است.
  /* ══ جا از **اندازهٔ واقعیِ نوشته** و **خودِ تصویر** پیدا می‌شود ══
     نگارشِ اول چند جعبهٔ ثابت داشت (راست/چپ/بالا) و میانگینِ شلوغیِ هر جعبه را
     می‌سنجید؛ روی صحنهٔ ۴۴ِ درسِ ۳۸ جعبهٔ چپ «آرام‌ترین» بود و نوشته روی صورتِ
     آدمِ صحنه نشست. حالا نوشته اول کشیده و اندازه‌اش از پیکسل‌های خودش خوانده
     می‌شود، بعد همهٔ جاهای ممکن با همان اندازه روی نقشهٔ شلوغی لغزانده می‌شوند. */
  /* کارت جای نقاشی را می‌گیرد؛ پس جمع‌وجور (۸.۵۶): نگارشِ اولِ کارتِ نکته‌ها ۶۴۰ پیکسل
     بلندی داشت — سه‌پنجمِ قاب. */
  width: { headline: 820, points: 860, quote: 760, compare: 1040, steps: 1240 },
  safe: { x0: 56, y0: 44, x1: 1864, y1: 816 },   // زیرِ ۸۱۶ مالِ زیرنویس است
  calm: 8,       // زیرِ این شلوغی: بی پرده، فقط سایهٔ نوشته
  busy: 16,      // بالای این: نوشتهٔ کناری نمی‌نشیند — تصویر جای خالی ندارد
  busyPanel: 20, // جدول و گام‌ها قاب دارند، ولی روی شلوغی همان «اسلایدِ جدا» می‌شوند
  mass: 0.012,   // سهمِ تودهٔ تیره (آدم، شیءِ اصلی) درونِ جعبه؛ بیشتر ⇒ نه (سرِ آدمِ صحنهٔ ۲۰: ۰٫۰۱۷)
  /* کارت (۸.۵۶) قابِ خودش را دارد: خط‌های نازکِ نقاشی زیرش خوانایی را نمی‌کشند. آنچه
     نباید پوشانده شود آدم و کانونِ صحنه است — آدم با این سهمِ توده (سرِ یک آدم ۰٫۱ به بالا)
     و کانون با جعبهٔ داور (`avoid`). */
  massCard: 0.05,
  solidCheck: true,
  origin: 100,   // جای کشیدنِ نوشته در صفحه، پیش از برش
  fonts: {
    /* یک قلم، با وزن‌های گوناگون (۸.۵۶): نستعلیقِ اردو خطِ کرسیِ فارسی را نمی‌شناسد و
       «مستقیم» را بالاتر از جمله نشانْد؛ لاله‌زار برای کارتِ آموزشی نمایشی است. */
    body: "'Vazirmatn','Noto Sans Arabic',sans-serif"
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
function place(an, w, h, kind, side, avoid, low) {
  const S = low ? { x0: OV.safe.x0, y0: OV.safe.y0, x1: OV.safe.x1, y1: OV.h - 40 } : OV.safe, aw = OV.aw, ah = OV.ah, sx = OV.w / aw, sy = OV.h / ah;
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
  /* تودهٔ **یکپارچه** (۸.۵۶): سهمِ توده فقط «چه‌قدر» را می‌گوید، نه «کجا»؛ سرِ نارنجیِ
     صحنهٔ ۱۹ِ درسِ ۴۰ (هفتاد پیکسل) در جعبه‌ای نهصدپیکسلی کمتر از ۱٪ بود و کارت رویش
     نشست. خانه‌ای که خودش و سه همسایه‌اش (راست، پایین، قطر) همه دور از روشنیِ میانگینِ
     جعبه‌اند، یعنی چیزی پُر و دست‌کم چهل پیکسلی — نه خطی نازک. یکی کافی است. */
  /* و **رنگ**، نه فقط روشنی: سرِ نارنجی با روشنیِ ۱۵۹ روی کاغذِ ۲۳۰ تنها ۷۱ فاصله داشت
     و از سدِ روشنی رد شد. فاصلهٔ رنگی (جمعِ سه کانال) همان را ۲۷۰ می‌بیند. */
  const C3 = [0, 1, 2].map(c => {
    const T = new Float64Array((aw + 1) * (ah + 1));
    for (let y = 0; y < ah; y++) {
      let row = 0;
      for (let x = 0; x < aw; x++) {
        row += an ? an.rgb[(y * aw + x) * 3 + c] : 128;
        T[(y + 1) * (aw + 1) + x + 1] = T[y * (aw + 1) + x + 1] + row;
      }
    }
    return T;
  });
  const solid = (x0, y0, x1, y1) => {
    if (!an) return false;
    const n = Math.max(1, (x1 - x0) * (y1 - y0));
    const box = T => (T[y1 * (aw + 1) + x1] - T[y0 * (aw + 1) + x1] - T[y1 * (aw + 1) + x0] + T[y0 * (aw + 1) + x0]) / n;
    const m = box(G), mr = box(C3[0]), mg = box(C3[1]), mb = box(C3[2]);
    const far = (x, y) => {
      const i = y * aw + x;
      if (Math.abs(an.g[i] - m) > 72) return true;
      return Math.abs(an.rgb[i * 3] - mr) + Math.abs(an.rgb[i * 3 + 1] - mg) + Math.abs(an.rgb[i * 3 + 2] - mb) > 150;
    };
    for (let y = y0; y < y1 - 1; y++) for (let x = x0; x < x1 - 1; x++) {
      if (far(x, y) && far(x + 1, y) && far(x, y + 1) && far(x + 1, y + 1)) return true;
    }
    return false;
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
    if (avoid && (Array.isArray(avoid) ? avoid.some(a => hit(bx, a)) : hit(bx, avoid))) continue;
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
    const bonus = ((side && side === at) ? -1.2 : 0) + (low ? -3 * top : 0);
    const pk = mass(x, y, x + rw, y + rh);
    /* `60 * pk` **ترجیح** است، نه سد: میانِ دو جای هم‌آرام، آنکه توده ندارد را
       برمی‌گزیند. سد همان `busy` پایین است (۱۳.۲-ب). شکستنِ این جمله هیچ سنجه‌ای را
       سرخ نکرد، چون ترجیحِ لبه معمولاً همان جا را می‌دهد (۷٫۷۱: برچسبِ راست). */
    const sc = e + 60 * pk + pen + bonus;
    const cand = { sc: sc, e: e, pk: pk, at: at, x: Math.round(bx.x), y: Math.round(bx.y), gx: x, gy: y };
    const bz = e > OV.busyPanel || pk > OV.massCard || (OV.solidCheck && solid(x, y, x + rw, y + rh));
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

/**
 * ══ کارت، نه جملهٔ معلق (۸.۵۶) ══
 * ۶ اکتبر، درسِ ۴۰: «اون ترکیبِ متن و تصویر افتضاح بود … یکیش مثلِ این داغون و خراب
 * و زشت … فقط یه جملهٔ ساده و درهم تنیده». قاب‌ها نشان دادند چرا: تیترهایی که فقط
 * سایه داشتند و روی نقاشی «معلق» بودند، و نقل‌قولی با قلمِ نستعلیقِ اردو که خطِ کرسیِ
 * فارسی را نمی‌شناسد — «مستقیم» بالاتر از بقیهٔ جمله نشست و یک «❞»ِ کهربایی کنارش.
 *
 * حالا هر نوشته یک **کارت** است: قابِ نیمه‌شفافِ هم‌رنگِ همان ناحیه، نوارِ تأکید در
 * لبهٔ راست، برچسبِ کوچکِ نوع («مفهومِ کلیدی»، «گام‌به‌گام»…) و یک قلم: وزیرمتن —
 * قلمی که فارسی را درست می‌نشانَد. نستعلیق و لاله‌زار دیگر به کار نمی‌روند.
 *
 * و کارت **ساخته می‌شود**، نه پرتاب: `stage` می‌گوید کدام بخش دیده شود. مرحلهٔ ۰ قاب
 * و تیتر است؛ مرحلهٔ k (k≥۱) **فقط** سطرِ k‌اُم — همان جای همیشگی‌اش، چون چیدمان با
 * `visibility` نگه داشته می‌شود — تا رانر نکته‌ها را یکی‌یکی، هم‌پای گفتار، بیاورد.
 */
const KICK = { headline: 'مفهومِ کلیدی', points: 'نکته‌ها', steps: 'گام‌به‌گام', compare: 'مقایسه', quote: 'جملهٔ کلیدی' };

/** شمارِ مرحله‌های هر کارت (بی مرحلهٔ ۰). */
function stagesOf(ov) {
  if (!ov) return 0;
  if (ov.kind === 'points' || ov.kind === 'steps') return ov.lines.length;
  if (ov.kind === 'compare') return (ov.rows || []).length;
  return 0;
}

function html(ov, w, pal, n, calm, k, stage) {
  const F = OV.fonts;
  const st = (stage === undefined || stage === null) ? -1 : Number(stage);   // -1 = همه
  /* «نمایان» باید صریح باشد: فرزندِ کارتِ پنهان، پنهانی را به ارث می‌برد (نگارشِ اول
     همین‌جا سطرهای مرحله را نمی‌کشید — دیدنِ خروجی نشانش داد، نه خواندن). */
  const vis = i => (st === -1 || st === i) ? 'visibility:visible;' : 'visibility:hidden;';
  const cardVis = (st === -1 || st === 0) ? '' : 'visibility:hidden;';
  const accInk = pal.dark ? '#0E1320' : '#FFFFFF';
  const kicker = ov.kind === 'headline' && /[؟?]\s*$/.test(ov.title) ? 'پرسش' : KICK[ov.kind];
  const base = '.cd{position:relative;background:' + pal.panel + ';border:1px solid ' + pal.line +
    ';border-radius:26px;padding:26px 40px 30px 36px;box-shadow:0 18px 54px rgba(0,0,0,' + (pal.dark ? '.34' : '.18') + ');' +
    'font-family:' + F.body + ';color:' + pal.ink + '}' +
    '.cd::after{content:"";position:absolute;top:24px;bottom:24px;right:0;width:8px;border-radius:4px;background:' + pal.a1 + '}' +
    '.kk{display:flex;align-items:center;gap:10px;font-weight:700;font-size:24px;color:' + pal.a1 + ';margin-bottom:8px}' +
    '.kk i{display:inline-block;width:12px;height:12px;border-radius:50%;background:' + pal.a1 + '}' +
    '.tt{font-weight:800;line-height:1.38;color:' + pal.ink + '}' +
    '.sb{margin-top:10px;font-weight:500;font-size:31px;line-height:1.55;color:' + pal.soft + '}' +
    '.nm{flex:0 0 46px;width:46px;height:46px;border-radius:50%;background:' + pal.a1 + ';color:' + accInk +
    ';display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px;margin-top:2px}';
  const kick = '<div class="kk"><i></i>' + esc(kicker) + '</div>';
  if (ov.kind === 'headline') {
    const len = ov.title.length;
    const fs = len > 30 ? 50 : len > 18 ? 58 : 66;
    const inner = '<div class="cd" style="' + cardVis + '">' + kick +
      '<div class="tt" style="font-size:' + fs + 'px">' + hl(ov.title, ov.keys, pal, 'color') + '</div>' +
      (ov.lines[0] ? '<div class="sb">' + hl(ov.lines[0], ov.keys, pal, 'color') + '</div>' : '') + '</div>';
    return shell(inner, w, base);
  }
  if (ov.kind === 'points') {
    const rows = ov.lines.map((l, i) =>
      '<div style="display:flex;gap:18px;align-items:flex-start;margin-top:16px;' + vis(i + 1) + '">' +
      '<div class="nm">' + fa(i + 1) + '</div>' +
      '<div style="font-weight:600;font-size:' + (l.length > 44 ? 31 : 34) + 'px;line-height:1.5;color:' + pal.ink + '">' +
      hl(l, ov.keys, pal, 'color') + '</div></div>').join('');
    const inner = '<div class="cd" style="' + cardVis + '">' + kick +
      (ov.title ? '<div class="tt" style="font-size:44px;' + vis(0) + '">' + hl(ov.title, ov.keys, pal, 'color') + '</div>' : '') +
      rows + '</div>';
    return shell(inner, w, base);
  }
  if (ov.kind === 'quote') {
    const fs = ov.title.length > 80 ? 36 : (ov.title.length > 50 ? 40 : 46);
    /* گیومه کشیده می‌شود، نه نویسه: «❞» در هر قلمی شکلِ دیگری دارد و در درسِ ۴۰ یک
       لکهٔ کهربایی شد. دو قطرهٔ گرد، با رنگِ تأکید. */
    const q = '<svg width="56" height="42" viewBox="0 0 74 56" style="display:block;margin-bottom:8px">' +
      '<path fill="' + pal.a1 + '" d="M2 56V32C2 14 12 4 30 0l3 8C22 12 17 19 17 28h13v28zM42 56V32C42 14 52 4 70 0l3 8C62 12 57 19 57 28h13v28z"/></svg>';
    const inner = '<div class="cd" style="' + cardVis + '">' + q +
      '<div class="tt" style="font-weight:600;font-size:' + fs + 'px;line-height:1.62">«' +
      hl(ov.title, ov.keys, pal, 'color') + '»</div>' +
      (ov.lines[0] ? '<div class="sb" style="font-weight:700;font-size:26px;color:' + pal.a1 + '">— ' + esc(ov.lines[0]) + '</div>' : '') +
      '</div>';
    return shell(inner, w, base);
  }
  if (ov.kind === 'compare') {
    /* سه ستون: برچسبِ ردیف (راست)، طرفِ اول، طرفِ دوم — برچسب ستونِ خودش را دارد و
       میانِ دو خط معلق نمی‌مانَد (نگارشِ اولِ همین کارت). */
    const hasLab = ov.rows.some(r => r.lab);
    const cols = (hasLab ? 'auto ' : '') + '1fr 1fr';
    const chip = (t, c) => '<div style="font-weight:800;font-size:32px;text-align:center;color:' + accInk +
      ';background:' + c + ';border-radius:16px;padding:6px 16px 10px">' + esc(t) + '</div>';
    const cell = (t, c) => '<div style="font-weight:700;font-size:31px;line-height:1.4;color:' + pal.ink +
      ';text-align:center;background:' + (pal.dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.035)') +
      ';border-bottom:3px solid ' + c + ';border-radius:12px;padding:10px 12px 12px">' + esc(t) + '</div>';
    const lab = (t, i) => hasLab ? '<div style="font-weight:700;font-size:25px;color:' + pal.soft +
      ';align-self:center;padding-left:8px;' + vis(i) + '">' + esc(t || '') + '</div>' : '';
    const rows = ov.rows.map((r, i) =>
      lab(r.lab, i + 1) + '<div style="' + vis(i + 1) + '">' + cell(r.r, pal.a1) + '</div>' +
      '<div style="' + vis(i + 1) + '">' + cell(r.l, pal.a2) + '</div>').join('');
    const inner = '<div class="cd" style="' + cardVis + '">' + kick +
      (ov.title ? '<div class="tt" style="font-size:42px;margin-bottom:14px">' + hl(ov.title, ov.keys, pal, 'color') + '</div>' : '') +
      '<div style="display:grid;grid-template-columns:' + cols + ';gap:14px 20px;align-items:stretch">' +
      (hasLab ? '<div></div>' : '') + chip(ov.a, pal.a1) + chip(ov.b, pal.a2) + rows + '</div></div>';
    return shell(inner, w, base, true);
  }
  if (ov.kind === 'steps') {
    const card = (t, i) => '<div style="flex:1;' + vis(i + 1) + 'background:' + pal.panel + ';border:1px solid ' + pal.line +
      ';border-radius:22px;padding:20px 22px 24px;box-shadow:0 12px 40px rgba(0,0,0,' + (pal.dark ? '.3' : '.16') + ')">' +
      '<div class="nm" style="margin:0 0 10px">' + fa(i + 1) + '</div>' +
      '<div style="font-weight:700;font-size:31px;line-height:1.45;color:' + pal.ink + '">' + hl(t, ov.keys, pal, 'color') + '</div></div>';
    /* پیکانِ میانِ گام‌ها به چپ — ترتیبِ خواندنِ فارسی؛ کشیده، نه نویسه. */
    const arrow = i => '<div style="flex:0 0 64px;display:flex;align-items:center;justify-content:center;' + vis(i + 1) + '">' +
      '<svg width="44" height="44" viewBox="0 0 44 44"><path d="M30 8 14 22l16 14" fill="none" stroke="' + pal.a1 +
      '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
    const parts = [];
    ov.lines.forEach((t, i) => { if (i) parts.push(arrow(i)); parts.push(card(t, i)); });
    const head = '<div style="display:inline-flex;' + cardVis + 'background:' + pal.panel + ';border:1px solid ' + pal.line +
      ';border-radius:20px;padding:10px 26px 14px;margin-bottom:16px;align-items:center;gap:12px">' +
      '<span style="width:14px;height:14px;border-radius:50%;background:' + pal.a1 + '"></span>' +
      '<span style="font-weight:800;font-size:' + (ov.title ? 40 : 28) + 'px;color:' + (ov.title ? pal.ink : pal.a1) + '">' +
      (ov.title ? hl(ov.title, ov.keys, pal, 'color') : esc(KICK.steps)) + '</span></div>';
    const inner = '<div style="font-family:' + F.body + '">' + head +
      '<div style="display:flex;align-items:stretch">' + parts.join('') + '</div></div>';
    return shell(inner, w, base, true);
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
 * بارِ دوم با رنگ‌هایی که از **همان جای** تصویر خوانده شد. کارتی که مرحله دارد
 * (نکته‌ها، گام‌ها، ردیف‌های مقایسه) برای هر مرحله یک PNGِ جدا می‌گیرد با **همان
 * برش**، تا رانر سطرها را یکی‌یکی بیاورد (۸.۵۶).
 * `avoid` یک جعبه یا فهرستی از جعبه‌هاست — گوشهٔ نشان، و کانونِ صحنه که داور در
 * خودِ تصویر پیدا کرد: کارت روی همان چیزی که گوینده درباره‌اش حرف می‌زند نمی‌نشیند.
 * @return {{file, stages, x, y, w, h, k, energy, lum, accent}|{skip}|null}
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
  const widths = panelK ? [W0] : [W0, Math.round(W0 * 0.8), Math.max(440, Math.round(W0 * 0.66))];
  let w = W0, bb = null, where = null;
  for (let wi = 0; wi < widths.length; wi++) {
    w = widths[wi];
    const m = ctx.shoot(html(o, w, palette(an, { lum: 0.7 }, n), n, true, 'right'),
                        path.join(ctx.dir, 'ovm' + n + '.png'));
    bb = alphaBox(ctx.ff, m);
    try { fs.unlinkSync(m); } catch (e) {}
    if (!bb) return null;
    where = place(an, bb.w + 2 * marg, bb.h + 2 * marg, o.kind, o.side, avoid);
    if (where && !where.busy) break;
  }
  /* سمتِ داور جا نداشت ⇒ یک جست‌وجوی آزاد، با همان سدهای توده و کانون (۸.۵۶). داور
     کلِ نقاشی را دیده و قابِ متحرک را نه؛ کارتی که به‌خاطرِ یک سمت دور ریخته شود، همان
     «سه چهار مورد در بیست دقیقه» است. «هیچ جایی در آن سمت» (`null`، همه زیرِ کانون)
     هم همین است، نه شکست. */
  if ((!where || where.busy) && o.side) {
    for (let wi = 0; wi < widths.length; wi++) {
      w = widths[wi];
      const m = ctx.shoot(html(o, w, palette(an, { lum: 0.7 }, n), n, true, 'right'),
                          path.join(ctx.dir, 'ovm' + n + '.png'));
      bb = alphaBox(ctx.ff, m);
      try { fs.unlinkSync(m); } catch (e) {}
      if (!bb) return null;
      const w2 = place(an, bb.w + 2 * marg, bb.h + 2 * marg, o.kind, '', avoid);
      if (w2 && !w2.busy) { where = w2; break; }
    }
  }
  /* و برای تیتر و نقل، نوارِ پایین (lower third) — پهن و کوتاه، همان‌جا که زیرنویس
     می‌نشست و صحنهٔ کارت‌دار زیرنویس ندارد. سدها همان‌اند. */
  if ((!where || where.busy) && (o.kind === 'headline' || o.kind === 'quote')) {
    w = Math.round(W0 * 1.35);
    const m = ctx.shoot(html(o, w, palette(an, { lum: 0.7 }, n), n, true, 'right'),
                        path.join(ctx.dir, 'ovm' + n + '.png'));
    bb = alphaBox(ctx.ff, m);
    try { fs.unlinkSync(m); } catch (e) {}
    if (!bb) return null;
    const w3 = place(an, bb.w + 2 * marg, bb.h + 2 * marg, o.kind, '', avoid, true);
    if (w3 && !w3.busy) { where = w3; where.low = true; }
  }
  if (!where) return null;
  if (where.busy) return { skip: 'busy', k: where.k, kind: o.kind, energy: Math.round(where.energy * 10) / 10,
                           mass: Math.round(where.peak * 1000) / 1000 };
  const calm = where.energy < OV.calm;
  const pal = palette(an, where, n);
  const cx = Math.max(0, bb.x - pad), cy = Math.max(0, bb.y - pad);
  const cw = Math.min(OV.w - cx, bb.w + 2 * pad), ch = Math.min(OV.h - cy, bb.h + 2 * pad);
  const cut = (stage, name) => {
    const full = ctx.shoot(html(o, w, pal, n, calm, where.k, stage), path.join(ctx.dir, name + 'f.png'));
    const out = path.join(ctx.dir, name + '.png');
    ctx.ffRun(['-y', '-i', full, '-vf', 'crop=' + cw + ':' + ch + ':' + cx + ':' + cy, '-frames:v', '1', out]);
    try { fs.unlinkSync(full); } catch (e) {}
    return out;
  };
  const nSt = stagesOf(o);
  const file = cut(nSt ? 0 : -1, 'ov' + n);
  const stages = [];
  for (let i = 1; i <= nSt; i++) stages.push(cut(i, 'ov' + n + '-s' + i));
  return { file: file, stages: stages, x: where.box.x + marg - (bb.x - cx), y: where.box.y + marg - (bb.y - cy), w: cw, h: ch,
           k: where.k, kind: o.kind, energy: Math.round(where.energy * 10) / 10, mass: Math.round(where.peak * 1000) / 1000,
           lum: Math.round(where.lum * 100) / 100, accent: pal.a1, vivid: pal.vivid, calm: calm };
}

/**
 * پنجرهٔ دیده‌شدنِ کارت در صحنه‌ای به طولِ `d` ثانیه، از `from` (پس از کلیپ) — ۸.۵۶.
 * تا ۸.۵۵ نوشته تمامِ صحنه می‌ماند: روی صحنهٔ پنجاه‌ثانیه‌ای یعنی یک اسلاید، و نقاشی
 * هرگز تنها دیده نمی‌شد. حالا آن‌قدر که خوانده شود — پایه + هر مرحله — و بعد نقاشی
 * دوباره مالِ بیننده است. مرحله‌ها با فاصلهٔ برابر درونِ همان پنجره می‌آیند.
 * @return {{st:number, end:number, at:number[]}}
 */
function windowOf(d, from, nStages) {
  const st = Math.max(0, from);
  const want = Math.max(OV.showMin, OV.showBase + OV.showPer * nStages);
  const end = Math.max(st + 1.2, Math.min(d - 0.7, st + want));
  /* سطرِ اول درست پس از نشستنِ کارت می‌آید — کارتِ خالی که دو ثانیه منتظر بماند، قابِ
     بی‌معناست (نخستین ساختِ واقعی نشانش داد) — و آخری پیش از دُمِ پنجره. */
  const first = st + OV.slide + 0.35, last = Math.max(first, end - OV.showTail);
  const at = [];
  for (let i = 0; i < nStages; i++) {
    at.push(Math.round((nStages > 1 ? first + (last - first) * i / (nStages - 1) : first) * 100) / 100);
  }
  return { st: Math.round(st * 100) / 100, end: Math.round(end * 100) / 100, at: at };
}

module.exports = { OV, ovNorm, analyze, boxStats, place, palette, html, render, alphaBox, hsv, stagesOf, windowOf };
