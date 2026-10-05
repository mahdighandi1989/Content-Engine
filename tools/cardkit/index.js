/* cardkit — از «مشخصاتِ تصویریِ یک قسمت» به فهرستی از PNGهای زمان‌دار.
 *
 * چرا این‌جا و نه در اسلایدز: اسلایدزِ گوگل فقط مستطیل، بیضی، لوزی، خط و
 * متن می‌کشد. بافت، خطِ دست‌کشیده، هایلایتر، پیکان و **ظاهرشدنِ تدریجی** از
 * آن پنج شکل درنمی‌آیند — و همان بود که خروجی را به «اسلایدشوِ متن» تبدیل
 * کرده بود. این‌جا SVG است و روی رانر کشیده می‌شود، همان‌جا که ffmpeg هست.
 *
 * مرزِ این ماژول: **هیچ چیزی دانلود نمی‌کند و هیچ چیزی آپلود نمی‌کند.**
 * ورودی spec، خروجی فایل‌های PNG و زمان‌ها. هر چه شبکه لازم دارد، بیرون
 * از این‌جا انجام می‌شود (قاعدهٔ همان تقسیمِ کارِ `_YT-RENDER.json`).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const F = require('./forms.js');
const L = require('./look.js');
const MARK = require('./mark.js');

/** مرورگر را پیدا کن — روی رانرِ گیت‌هاب کروم هست، در کانتینرِ ما پلی‌رایت. */
function chromeExe() {
  const c = [process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
             '/usr/bin/chromium-browser', '/usr/bin/chromium',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].filter(Boolean);
  for (const p of c) { try { if (fs.existsSync(p)) return p; } catch (e) {} }
  try {
    const g = fs.readdirSync('/opt/pw-browsers').filter(d => /^chromium-/.test(d));
    for (const d of g) { const p = '/opt/pw-browsers/' + d + '/chrome-linux/chrome';
      if (fs.existsSync(p)) return p; }
  } catch (e) {}
  throw new Error('مرورگری برای کشیدنِ کارت پیدا نشد');
}

/**
 * spec ⇒ [{file, at, hold}] به‌ترتیبِ زمان.
 * `at` ثانیهٔ مطلقِ **همان قسمت** است (نه نسبت به پنجره) — تبدیلش کارِ
 * صداکننده است، چون فقط او می‌داند کدام بازه را می‌سازد.
 */
/* تصویرِ نشان یک بار برداشته و **درونِ SVG** می‌نشیند: کروم فایلِ محلی را
   می‌کشد و اجازهٔ شبکه ندارد، پس یک `href` به نشانیِ بیرونی خالی درمی‌آید —
   بی هیچ خطایی، که بدترین شکلش است. نشدنش خطا نیست: تک‌نگارهٔ حرفِ اول
   کشیده می‌شود، که از نشانِ نبودن بهتر است و ادعای دروغ هم نمی‌کند. */
function logoData(url, dir) {
  if (!url || !/^https?:\/\//.test(url)) return '';
  try {
    const f = path.join(dir, 'logo.bin');
    execFileSync('curl', ['-sSL', '--max-time', '25', '-o', f, url], { stdio: 'ignore' });
    const b = fs.readFileSync(f);
    if (b.length < 200) return '';
    const png = b[0] === 0x89 && b[1] === 0x50;
    const jpg = b[0] === 0xFF && b[1] === 0xD8;
    if (!png && !jpg) return '';                 // بایت‌ها را باور کن، نه پسوند را
    return 'data:image/' + (png ? 'png' : 'jpeg') + ';base64,' + b.toString('base64');
  } catch (e) { return ''; }
}

/**
 * نشانِ کانال **بی آن مربعِ سیاه** (۸.۴۵).
 *
 * تصویرِ نشان از عکسِ پروفایلِ کانال می‌آید: ۲۴۰×۲۴۰، JPEG، بی کانالِ شفافیت، و
 * ۸۷٪ِ پیکسل‌هایش سیاه (سنجیده). پس `<image>` یک مربعِ تیره روی ویدئو می‌گذاشت —
 * همان «مربعِ سیاهی که زشتش کرده». این‌جا رنگِ زمینه از **چهار گوشه** خوانده
 * می‌شود؛ اگر گوشه‌ها هم‌رنگ‌اند، همان رنگ شفاف می‌شود و تصویر به جعبهٔ خودِ
 * نشان بریده می‌شود. گوشه‌های ناهم‌رنگ یعنی عکسی که زمینهٔ ساده ندارد: آن‌وقت
 * دست نمی‌خورد و **گفته می‌شود** (`how`)، چون بریدنِ حدسی بدتر از مربع است.
 * @return {{data:string, how:string}}
 */
function logoClean(url, dir, ff) {
  const raw = logoData(url, dir);
  if (!raw) return { data: '', how: 'تصویرِ نشان نیامد' };
  try {
    const exe = ff || 'ffmpeg';
    const src = path.join(dir, 'logo.bin');
    const p = spawnSync(exe, ['-hide_banner', '-loglevel', 'error', '-i', src, '-frames:v', '1',
      '-vf', 'scale=240:240,format=rgb24', '-f', 'rawvideo', '-'], { maxBuffer: 4 * 1024 * 1024 });
    const b = p.stdout, W = 240, H = 240;
    if (!b || b.length < W * H * 3) return { data: raw, how: 'خام (خوانده نشد)' };
    const px = (x, y) => { const i = (y * W + x) * 3; return [b[i], b[i + 1], b[i + 2]]; };
    const cs = [px(2, 2), px(W - 3, 2), px(2, H - 3), px(W - 3, H - 3)];
    const dist = (a, c) => Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) + Math.abs(a[2] - c[2]);
    if (cs.some(c => dist(c, cs[0]) > 36)) return { data: raw, how: 'خام (زمینهٔ ساده ندارد)' };
    const bg = [0, 1, 2].map(k => Math.round(cs.reduce((t, c) => t + c[k], 0) / 4));
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (dist(px(x, y), bg) > 60) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    }
    if (x1 < 0 || (x1 - x0) < 20 || (y1 - y0) < 20) return { data: raw, how: 'خام (نشانی جدا از زمینه پیدا نشد)' };
    const m = 6;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
    x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
    const hex = '0x' + bg.map(v => ('0' + v.toString(16)).slice(-2)).join('');
    const out = path.join(dir, 'logo-clean.png');
    execFileSync(exe, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-frames:v', '1', '-vf',
      'scale=240:240,crop=' + (x1 - x0 + 1) + ':' + (y1 - y0 + 1) + ':' + x0 + ':' + y0 +
      ',format=rgba,colorkey=' + hex + ':0.16:0.10', out], { stdio: 'ignore' });
    const png = fs.readFileSync(out);
    if (png.length < 200 || png[0] !== 0x89) return { data: raw, how: 'خام (بریدن نشد)' };
    return { data: 'data:image/png;base64,' + png.toString('base64'),
             how: 'بریده و بی‌زمینه (' + (x1 - x0 + 1) + '×' + (y1 - y0 + 1) + ' از ۲۴۰)' };
  } catch (e) { return { data: raw, how: 'خام (' + String(e.message).split('\n')[0].slice(0, 40) + ')' }; }
}

function build(spec, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const exe = chromeExe();
  if (spec.mark && spec.mark.logoUrl && !spec.mark.logo) {
    spec.mark.logo = logoClean(spec.mark.logoUrl, dir).data;
  }
  const look = spec.look || L.lookFor(spec.cat, spec.seriesName, spec.tones);
  const pal = spec.palette || look.pal;
  const out = [];
  (spec.cards || []).forEach((c, ci) => {
    const mk = spec.mark ? Object.assign({}, spec.mark,
      { corner: MARK.cornerAt(Number(c.at) || 0, spec.mark.everySec) }) : null;
    const card = Object.assign({}, c, { mark: mk });
    const r = F.beats(card, pal);
    r.svg.forEach((svg, bi) => {
      const nm = 'k' + String(ci).padStart(2, '0') + '_' + String(bi).padStart(2, '0');
      const h = path.join(dir, nm + '.html');
      fs.writeFileSync(h, '<!doctype html><meta charset="utf-8"><style>' +
        'html,body{margin:0;padding:0;width:1920px;height:1080px;overflow:hidden;background:' +
        pal.bg + '}svg{display:block}</style>' + svg);
      const raw = path.join(dir, nm + '.raw.png');
      execFileSync(exe, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
        '--force-device-scale-factor=1', '--window-size=1920,1200',
        '--screenshot=' + raw, 'file://' + h], { stdio: 'ignore' });
      out.push({ file: raw, at: r.times[bi], card: ci, beat: bi });
    });
  });
  out.sort((a, b) => a.at - b.at);
  return out;
}
module.exports = { build, chromeExe, logoData, logoClean, looks: L.LOOKS, lookFor: L.lookFor, mark: MARK };
