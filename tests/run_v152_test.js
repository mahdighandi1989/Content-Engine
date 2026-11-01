/* ══ آزمونِ ۱۵.۲ — فایلِ ریلیز تا سنجش و عمومی‌شدن می‌ماند؛ موسیقی از گفتارِ کلیپ جدا می‌شود ══
 * ۱ نوامبر: «پاک‌کردن فایل ریلیز بعد از آپلود را طوری کن که تا بررسی کیفیت و صدا تمام نشده و قسمت عمومی نشده پاک نشود»
 * و «جداسازی موسیقی از گفتار در صدای کلیپ را بساز» (۸۶ و ۸۸ هر لحظه‌شان را به سدِ موسیقی باختند).
 */
require('./lib/root.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

console.log('\n=== ۱) نشانه‌گذاریِ پاک‌کردن ===');
{
  const keep = {};
  ['ytRenderRead_', 'ytRenderSave_', 'ytPublished_', 'ytRenderMapCached_', 'getHub_'].forEach(k => { keep[k] = global[k]; });
  const keepD = global.DriveApp;
  const old = '2026-08-01 10:00';   // ساعتِ بدَل ۱۸ اوت است
  let saved = null;
  const rows = ['variety:90', 'variety:91', 'variety:92', 'variety:93', 'special:94'].map(k => ({ key: k, status: 'رسید', doneAt: old, folderId: 'F' + k }));
  global.ytRenderRead_ = () => ({ items: rows.map(x => Object.assign({}, x)), prune: [] });
  global.ytRenderSave_ = d => { saved = d; };
  global.getHub_ = () => ({});
  global.ytPublished_ = () => ({ 'variety:90': { videoId: 'a', privacy: 'public' }, 'variety:91': { videoId: 'b', privacy: 'unlisted' },
    'variety:92': { videoId: 'c', privacy: 'public' }, 'variety:93': { videoId: 'd', privacy: 'public' }, 'special:94': { videoId: 'e', privacy: 'public' } });
  global.ytRenderMapCached_ = () => ({ 'variety:90': { mode: 'media', qa: { ok: true, clipSound: { made: 0 } } }, 'variety:91': { mode: 'media', qa: { ok: true, clipSound: {} } },
    'variety:92': { mode: 'media', qa: { ok: true } }, 'special:94': { mode: 'scenes', qa: { ok: true } } });
  const big = { getSize: () => 5e6, getName: () => 'x — ویدئو.mp4', getMimeType: () => 'video/mp4' };
  global.DriveApp = Object.assign({}, keepD, { getFolderById: () => ({}) });
  const kv = global.ytVideoIn_; global.ytVideoIn_ = () => big;
  const r = ytRenderPruneMark_(60000, {});
  const pr = (saved && saved.prune) || [];
  ok('۱.۱ عمومی و سنجیده (و صدای کلیپ سنجیده) ⇒ پاک می‌شود', pr.indexOf('variety:90') !== -1 && pr.indexOf('special:94') !== -1, JSON.stringify(pr));
  ok('۱.۲ Unlisted ⇒ می‌ماند', pr.indexOf('variety:91') === -1);
  ok('۱.۳ رسانه‌ای بی سنجشِ صدای کلیپ ⇒ می‌ماند', pr.indexOf('variety:92') === -1);
  ok('۱.۴ بی هیچ سنجشی ⇒ می‌ماند', pr.indexOf('variety:93') === -1);
  ok('۱.۵ نگه‌داشته‌ها شمرده می‌شوند', r.held === 3, JSON.stringify(r));
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
  global.DriveApp = keepD; global.ytVideoIn_ = kv;
}

console.log('\n=== ۲) جداسازیِ موسیقی (رانر) ===');
{
  const R = require('../tools/render.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-'));
  const bin = path.join(tmp, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'python3'), '#!/bin/sh\ncp "$2" "$3"\necho \'{"ok": true, "why": "", "sec": 3.2}\'\n');
  fs.chmodSync(path.join(bin, 'python3'), 0o755);
  fs.writeFileSync(path.join(tmp, 'a.wav'), 'RIFF');
  const keepP = process.env.PATH;
  process.env.PATH = bin + ':' + keepP;
  const v = R.vocalsOf(path.join(tmp, 'a.wav'), tmp);
  fs.writeFileSync(path.join(bin, 'python3'), '#!/bin/sh\necho \'{"ok": false, "why": "نصبِ demucs نشد: x", "sec": 0}\'\n');
  const w = R.vocalsOf(path.join(tmp, 'a.wav'), tmp + '/n');
  process.env.PATH = keepP;
  ok('۲.۱ خروجیِ ابزار خوانده می‌شود', v.ok === true && fs.existsSync(v.file) && v.sec === 3.2, JSON.stringify(v));
  ok('۲.۲ شکست ⇒ علت، بی پرتاب', w.ok === false && /demucs/.test(w.why), JSON.stringify(w));
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۲.۳ فقط وقتی سنجه پس از جداسازی دیگر موسیقی نشنود، گفتارِ جداشده جای صدای کلیپ می‌نشیند',
     /const mg2 = musicGateOf\(vs\.file\);\s*if \(!mg2\.music\) \{\s*fs\.copyFileSync\(vs\.file, a\);/.test(rj));
  ok('۲.۴ جداسازی پیش از کنار گذاشتنِ لحظه، و کنار گذاشتن همچنان پیش‌فرضِ شک', rj.indexOf('const vs = vocalsOf(a, dir);') < rj.indexOf("موسیقی در صدای کلیپ (' + mg.why"));
  const py = fs.readFileSync('tools/vocalsep.py', 'utf8');
  ok('۲.۵ ابزار: demucs دوشاخه روی CPU، و نصب فقط وقتی لازم است', /--two-stems=vocals/.test(py) && /download\.pytorch\.org\/whl\/cpu/.test(py) && /import demucs/.test(py));
}

summary('۱۵.۲');
