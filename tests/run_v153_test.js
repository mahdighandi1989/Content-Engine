/* ══ آزمونِ ۱۵.۳ — فریزِ صحنه، عمومیِ جامانده، و درخواستِ رندرِ ۱۶ روزه ══
 * ۲ نوامبر: «اولین کار رفع فریز صحنه است (۸۶ و ۸۸ و ۹۰، کلیپ تمام می‌شود و فقط پس‌زمینهٔ تار ثابت می‌ماند) …
 * دلیل بازماندن ۸۹ در حالت فهرست‌نشده و درخواست ساخت ۱۶ روزه را روشن کن.»
 */
require('./lib/root.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const store = {};
const keepProps = global.props_;
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); },
                         deleteProperty: k => { delete store[k]; } });

console.log('\n=== ۱) ذخیرهٔ سهمیه برای عمومی‌کردن ===');
{
  const day = Utilities.formatDate(new Date(), String(CFG.YT_QUOTA_TZ || 'America/Los_Angeles'), 'yyyy-MM-dd');
  store[PK.YT_QUOTA] = JSON.stringify({ day: day, units: 8680, uploads: 3, blocked: '' });
  const a = ytQuotaTake_(50, false);
  const b = ytQuotaTake_(50, false, true);
  const q = JSON.parse(store[PK.YT_QUOTA]);
  ok('۱.۱ کارِ عادی به ذخیره دست نمی‌زند', a === false, JSON.stringify(q));
  ok('۱.۲ عمومی‌کردن از ذخیره می‌خورد', b === true && q.units === 8730);
  store[PK.YT_QUOTA] = JSON.stringify({ day: day, units: 8990, uploads: 3, blocked: '' });
  ok('۱.۳ سقفِ کل همچنان سقف است', ytQuotaTake_(50, false, true) === false);
  const src = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۱.۴ هر دو درِ عمومی‌کردن (آپلود و بازسنجی) از ذخیره می‌خورند',
     /else if \(gate\.ok && !ytQuotaTake_\(YT_COST\.videosUpdate, false, true\)\)/.test(src) &&
     /textLanded && String\(rec\.privacy \|\| ''\) !== \(CFG\.YT_PRIVACY_FINAL \|\| 'public'\) &&\s*ytQuotaTake_\(YT_COST\.videosUpdate, false, true\)/.test(src));
  ok('۱.۵ نماندنِ سهمیه سرِ آپلود دیگر بی‌صدا نیست: در صفِ عمومی‌کردن می‌نشیند',
     /ytFlipDueAdd_\(String\(item\.key \|\| \(item\.show \+ ':' \+ item\.ep\)\), vid, 'سهمیهٔ امروز برای عمومی‌کردن نماند'\)/.test(src));
}

console.log('\n=== ۲) عمومیِ جامانده، بی بازنویسیِ متن ===');
{
  const keep = {};
  ['ytOn_', 'getHub_', 'ytPublished_', 'ytRedoOne_', 'ytSvc_', 'ytPublicGate_', 'ytRenderMapCached_', 'ytHandsOff_',
   'ytLog_', 'ytApprDoneAdd_', 'ytApprovedSafe_', 'ytOwnerPrivList_'].forEach(k => { keep[k] = global[k]; });
  const day = Utilities.formatDate(new Date(), String(CFG.YT_QUOTA_TZ || 'America/Los_Angeles'), 'yyyy-MM-dd');
  store[PK.YT_QUOTA] = JSON.stringify({ day: day, units: 8800, uploads: 3, blocked: '' });
  delete store[PK.YT_FLIP_DUE];
  const flips = [], redo = [], logs = [];
  global.ytOn_ = () => true; global.getHub_ = () => ({});
  global.ytPublished_ = () => ({ 'variety:89': { videoId: 'V89', privacy: 'unlisted', at: '2026-08-10 16:59', title: 't89', url: 'u89' },
                                 'variety:86': { videoId: 'V86', privacy: 'unlisted', at: '2026-08-01 10:00' } });
  global.ytRedoOne_ = (s, e) => { redo.push(s + ':' + e); return { ok: false, changed: [], why: 'سنجشِ خودکارِ ویدئو رد کرد' }; };
  global.ytSvc_ = () => ({ Videos: { update: (b) => { flips.push(b.id + '=' + b.status.privacyStatus); } } });
  global.ytPublicGate_ = (k) => ({ ok: k === 'variety:89', why: k === 'variety:89' ? '' : 'یخ زد' });
  global.ytRenderMapCached_ = () => ({ 'variety:89': { mode: 'media', qa: { ok: true } } });
  global.ytHandsOff_ = () => false;
  global.ytLog_ = (h, r) => { logs.push(r); };
  global.ytApprDoneAdd_ = () => {}; global.ytApprovedSafe_ = () => ({}); global.ytOwnerPrivList_ = () => [];
  const out = ytRedoStuckNightly_(60000);
  ok('۲.۱ بذرِ ۸۹ مستقیم عمومی شد', flips.join() === 'V89=public' && out.flipped === 1, JSON.stringify({ flips, out }));
  ok('۲.۲ ۸۹ از راهِ بازنویسیِ متن نرفت؛ ۸۶ (سدِ قاب) همان راهِ قبلی', redo.join() === 'variety:86', redo.join());
  ok('۲.۳ ردیفِ دفتر «عمومی شد» با علت', logs.length === 1 && logs[0].privacy === 'public' && /سهمیه/.test(logs[0].note));
  const fd = JSON.parse(store[PK.YT_FLIP_DUE] || '{}');
  ok('۲.۴ از صف بیرون رفت و بذر دوباره نمی‌نشیند', !fd['variety:89'] && fd['~seed:variety:89'] === 1 && !ytFlipDueGet_()['variety:89'], JSON.stringify(fd));
  // دستِ صاحبِ کانال
  ytFlipDueAdd_('variety:89', 'V89', 'x'); flips.length = 0;
  global.ytHandsOff_ = () => true;
  const r2 = ytFlipDirect_({}, 'variety', '89', { videoId: 'V89', privacy: 'private' });
  ok('۲.۵ ویدئوی خصوصی‌شده به دستِ او دست نمی‌خورد', !r2.ok && !flips.length && /خصوصی/.test(r2.why));
  // سهمیه تمام
  global.ytHandsOff_ = () => false; ytFlipDueAdd_('variety:89', 'V89', 'x');
  store[PK.YT_QUOTA] = JSON.stringify({ day: day, units: 8990, uploads: 3, blocked: '' });
  const r3 = ytFlipDirect_({}, 'variety', '89', { videoId: 'V89', privacy: 'unlisted' });
  ok('۲.۶ سهمیه نماند ⇒ علت گفته و در صف می‌ماند', !r3.ok && /سهمیه/.test(r3.why) && !!ytFlipDueGet_()['variety:89']);
  // سدِ بسته
  store[PK.YT_QUOTA] = JSON.stringify({ day: day, units: 0, uploads: 0, blocked: '' });
  global.ytPublicGate_ = () => ({ ok: false, why: 'یخ زد' });
  const r4 = ytFlipDirect_({}, 'variety', '89', { videoId: 'V89', privacy: 'unlisted' });
  ok('۲.۷ سدِ بسته ⇒ عمومی نمی‌شود و راهِ کامل امتحان می‌شود', !r4.ok && r4.retry === true && !flips.length);
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
}

console.log('\n=== ۳) ردیفِ نمونهٔ کهنه (درخواستِ ۱۶ روزه) ===');
{
  const keep = { r: global.ytRenderRead_, s: global.ytRenderSave_, c: global.ghRenderDueClear_ };
  let saved = null, cleared = 0;
  const rows = [{ key: 'variety:72-3-نمونه', status: 'در انتظار', at: '2026-07-14 21:24' },
                { key: 'variety:72-2-نمونه', status: 'رسید' },
                { key: 'variety:90', status: 'در انتظار' }];
  global.ytRenderRead_ = () => ({ items: rows.map(x => Object.assign({}, x)) });
  global.ytRenderSave_ = d => { saved = d; return true; };
  global.ghRenderDueClear_ = () => { cleared++; };
  delete store[PK.VM_SAMPLE_SWEEP];
  const n = vmSampleTick_();
  const it = (saved && saved.items) || [];
  ok('۳.۱ نمونه‌سازیِ خاموش هم ردیفِ کهنه را می‌بندد («کنار رفت»، نه «رسید»)', it[0] && it[0].status === 'کنار رفت' && it[0].closedWhy, JSON.stringify(it[0]));
  ok('۳.۲ درخواستِ واقعیِ در انتظار دست نخورد', it[2].status === 'در انتظار' && cleared === 0);
  saved = null;
  vmSampleTick_();
  ok('۳.۳ روزی یک بار', saved === null);
  delete store[PK.VM_SAMPLE_SWEEP];
  const kv = CFG.VM_SAMPLE; CFG.VM_SAMPLE = { ep: '72', rev: 3, folderId: 'F' };
  saved = null; vmSampleStaleSweep_(CFG.VM_SAMPLE);
  ok('۳.۴ نمونهٔ جاری بسته نمی‌شود', saved === null);
  CFG.VM_SAMPLE = kv;
  global.ytRenderRead_ = keep.r; global.ytRenderSave_ = keep.s; global.ghRenderDueClear_ = keep.c;
}

console.log('\n=== ۴) فریزِ صحنه: لحظه‌ای که کلیپ را تمام کرده (رانر) ===');
{
  const R = require('../tools/render.js');
  const M = require('../tools/mediakit.js');
  let ff = null; try { ff = R.ffmpegExe(); execFileSync(ff, ['-version']); } catch (e) { ff = null; }
  if (!ff) ok('۴.۰ ffmpeg نیست — بخشِ رانر سنجیده نشد', true);
  else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v153-'));
    const src = path.join(tmp, 'src.mp4');
    execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=24:d=20',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', src]);
    const info = M.probe(ff, src);
    const c = M.clip(ff, src, path.join(tmp, 'o.mp4'), 0, 15, info, { at: 0, len: 18 }, { layout: 'center', fill: true });
    const fz = M.freezes(ff, c.file, M.MK.freezeMax);
    ok('۴.۱ لحظه ۱۸ از ۲۰ ثانیه را خورده ⇒ تکهٔ بی‌صدا همان کلیپ از آغاز', c.replayed === true && c.filled === 0 && !fz.length,
       JSON.stringify({ replayed: c.replayed, filled: c.filled, fz }));
    const d = M.clip(ff, src, path.join(tmp, 'p.mp4'), 0, 8, info, { at: 0, len: 6 }, { layout: 'center', fill: true });
    ok('۴.۲ وقتی پس از لحظه کلیپ باقی دارد، همان راهِ قبلی (از پایانِ لحظه)', d.replayed === false);
  }
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۴.۳ بازپخش در یادداشتِ رندر گفته می‌شود', /if \(c\.replayed\) \{ st\.replayed = /.test(rj));
}

console.log('\n=== ۵) وضعِ دفترِ درخواست‌ها با اندازهٔ واقعی ذخیره می‌شود ===');
{
  const items = [];
  for (let i = 0; i < 240; i++) items.push({ id: 'R-2026' + String(1000 + i) + '-0' + (i % 9), state: i % 7 === 0 ? 'انجام و سنجیده شد'
    : 'ناظر نتوانست بسنجد (' + 'شاهد در _STATUS نبود؛ پوشه باز نشد و فایل خوانده نشد'.repeat(2) + ')' });
  const today = items.slice(0, 8).map(x => x.id);
  const full = JSON.stringify({ items });
  const r = reqStatusSave_({ ok: false, n: 240, done: 35, bad: 3, stale: 100, line: '📒 '.concat('خطِ بلند '.repeat(300)), today, items });
  const raw = store[PK.REQ_STATUS] || '';
  const c = reqStatusCached_() || {};
  ok('۵.۱ دفترِ ~' + Math.round(Buffer.byteLength(full) / 1024) + ' کیلوبایتی زیرِ سقف ذخیره شد', r === true && Buffer.byteLength(raw) <= 8000, Buffer.byteLength(raw));
  ok('۵.۲ سهمِ امروز و شمارش‌ها دست‌نخورده', JSON.stringify(c.today) === JSON.stringify(today) && c.n === 240 && c.stale === 100);
  ok('۵.۳ ردیف‌های تازه (نه «انجام») پیش از «انجام»ها می‌مانند', (c.items || []).every(x => x.state !== 'انجام و سنجیده شد') && c.itemsDoneHidden > 0,
     JSON.stringify({ n: (c.items || []).length, h: c.itemsDoneHidden, cut: c.itemsCut }));
}

global.props_ = keepProps;
summary('۱۵.۳');
