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
const { execFileSync } = require('child_process');
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
function build(spec, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const exe = chromeExe();
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
module.exports = { build, chromeExe, looks: L.LOOKS, lookFor: L.lookFor, mark: MARK };
