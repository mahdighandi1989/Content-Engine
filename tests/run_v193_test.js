/* ══ آزمونِ ۱۹.۳ — ریلیزِ renders پر شد: فایل‌های ریلز هم پاک می‌شوند ══
 * ۲۵ نوامبر: ریلیزِ renders ۱۰۰۰ از ۱۰۰۰ (سقفِ گیت‌هاب) و ۶۵۰ تایش ریلز بود — mp4، شورتز و کاور. پاک‌کردنِ ۱۴.۱ فقط
 * قسمت‌های یوتیوب را می‌شناخت. (RPT-202611221414#1)
 */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const old = '2026-08-01 10:00';
const U = n => 'https://github.com/x/releases/download/renders/reel-ig-special-' + n + '.mp4';
function planFile(p, withReel, small) {
  const fo = global.__ROOT_FOLDER.createFolder('درس ' + p.ep);
  const f = fo.createFile(Utilities.newBlob(JSON.stringify(p), 'application/json', '_ig.json'));
  if (withReel) fo.createFile(Utilities.newBlob('x'.repeat(small ? 2000 : 1200000), 'video/mp4', 'ریلز — درس ' + p.ep + '.mp4'));
  return f;
}

console.log('\n=== ۱) موتور: کدام ریلز پاک‌شدنی است ===');
{
  const keep = {};
  ['ytRenderRead_', 'ytRenderSave_'].forEach(k => { keep[k] = global[k]; });
  let saved = null;
  let store = { items: [], prune: ['special:5'] };
  global.ytRenderRead_ = () => JSON.parse(JSON.stringify(store));
  global.ytRenderSave_ = d => { saved = d; store = JSON.parse(JSON.stringify(d)); };
  const base = n => ({ ep: n, video: U(n), sig: 's' + n, phase: 'done', reelId: 'R' + n, doneAt: old,
                       short: U(n + '-short'), shortId: 'Y' + n, shortThumb: true });
  const reels = {};
  [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(n => { reels['ig:special:' + n] = { url: U(n), sig: 's' + n }; });
  reels['ig:special:4'].sig = 'NEW';                 // از نو ساخته شده
  reels['ig:special:9'].pruned = '2026-11-01';       // پیش‌تر پاک شده
  const files = [
    planFile(base(1), true),                                                   // همه‌چیز تمام ⇒ پاک
    planFile(Object.assign(base(2), { shortQueued: '2026-11-20 10:00' }), true), // شورتز در صف ⇒ بماند
    planFile(Object.assign(base(3), { phase: 'yts' }), true),                  // هنوز تمام نشده
    planFile(base(4), true),                                                   // امضای کهنه
    planFile(Object.assign(base(6), { shortId: '', shortWhy: '' }), true),     // شورتز نه رفته نه علتی دارد
    planFile(Object.assign(base(7), { doneAt: new Date(Date.now() - 3600000).toISOString().slice(0, 16).replace('T', ' ') }), true), // تازه
    planFile(base(8), false),                                                  // بی نسخهٔ درایو
    planFile(Object.assign(base(10), { video: U(10) }), true),                 // در نقشه نیست
    planFile(Object.assign(base(11), { shortId: 'Y11', shortThumb: false, shortThumbWhy: '' }), true)
  ];
  reels['ig:special:11'] = { url: U(11), sig: 's11' };
  const st = { shortQ: [{ key: 'ig:special:2' }] };
  const r = igReelPruneMark_(st, 60000, files, { reels });
  const pr = (saved && saved.prune) || [];
  ok('۱.۱ ریلزِ تمام‌شده با نسخهٔ درایو ⇒ پاک‌شدنی', pr.indexOf('ig:special:1') !== -1, JSON.stringify(pr));
  ok('۱.۲ فقط همان یکی (صف، ناتمام، امضای کهنه، شورتزِ بی‌علت، تازه، بی درایو، بی نقشه، کاورِ شورتز)',
     JSON.stringify(pr) === '["special:5","ig:special:1"]', JSON.stringify(pr));
  ok('۱.۳ بی نسخهٔ درایو شمرده می‌شود', r.noDrive === 1, JSON.stringify(r));
  ok('۱.۴ شاهد در وضعِ اینستاگرام', st.relPrune && st.relPrune.added === 1 && st.relPrune.sum === 1 && st.relPrune.ms > 0, JSON.stringify(st.relPrune));
  ok('۱.۵ تا ۶ ساعت نوبتِ بعد نیست', igReelPruneDue_(st) === false && igReelPruneDue_({}) === true);
  saved = null;
  const r2 = igReelPruneMark_(st, 60000, [files[0]], { reels });
  ok('۱.۶ کلیدِ ثبت‌شده دوباره افزوده نمی‌شود', r2.added === 0 && saved === null);
  const keepC = CFG.IG_REL_PRUNE; CFG.IG_REL_PRUNE = false;
  ok('۱.۷ خاموش ⇒ هیچ', igReelPruneMark_({}, 60000, files, { reels }).why === 'خاموش' && igReelPruneDue_({}) === false);
  CFG.IG_REL_PRUNE = keepC;
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
}

console.log('\n=== ۲) رانر: پاک‌کردنِ سه فایلِ ریلز ===');
{
  const R = require('../tools/render.js');
  const map = { items: {}, reels: {
    'ig:special:1': { url: U(1), short: U('1-short'), cover: 'https://github.com/x/releases/download/renders/reel-ig-special-1-cover.jpg', sig: 'a' },
    'ig:special:2': { url: U(2), sig: 'b' } } };
  const rel = { assets: [{ id: 1, name: 'reel-ig-special-1.mp4', size: 10 }, { id: 2, name: 'reel-ig-special-1-short.mp4', size: 10 },
                         { id: 3, name: 'reel-ig-special-1-cover.jpg', size: 1 }, { id: 4, name: 'reel-ig-special-2.mp4', size: 10 },
                         { id: 5, name: 'special-3.mp4', size: 10 }] };
  ok('۲.۱ پروب: کلیدِ پاک‌نشده کار است', R.pruneTodo({ prune: ['ig:special:1'] }, map).length === 1);
  /* حذفِ بدَل — آزمون هرگز DELETEِ واقعی به گیت‌هاب نمی‌فرستد. اول یک شکست: pruned نمی‌خورد تا دورِ بعد دوباره تلاش شود. */
  const gone = [];
  const r0 = R.pruneRelease({ prune: ['ig:special:1'] }, map, JSON.parse(JSON.stringify(rel)), 60, id => { if (id === 2) throw new Error('x'); gone.push(id); });
  ok('۲.۲ یک حذفِ ناموفق ⇒ pruned نمی‌خورد', r0.failed === 1 && r0.deleted === 2 && !map.reels['ig:special:1'].pruned, JSON.stringify(r0));
  gone.length = 0;
  const r = R.pruneRelease({ prune: ['ig:special:1'] }, map, rel, 60, id => { gone.push(id); });
  ok('۲.۲-ب هر سه فایل (mp4، شورتز، کاور) پاک و pruned', r.deleted === 3 && JSON.stringify(gone) === '[1,2,3]' && !!map.reels['ig:special:1'].pruned, JSON.stringify({ r, gone }));
  ok('۲.۳ ریلزِ دیگر و قسمت دست نخوردند', rel.assets.some(a => a.id === 4) && rel.assets.some(a => a.id === 5));
  ok('۲.۴ پاک‌شده دیگر کار نیست', R.pruneTodo({ prune: ['ig:special:1'] }, map).length === 0);
  const q = { reels: [{ key: 'ig:special:1', sig: 'a', audio: { url: 'u' } }, { key: 'ig:special:2', sig: 'b', audio: { url: 'u' } }] };
  ok('۲.۵ ریلزِ پاک‌شده که دوباره خواسته شود، از نو ساخته می‌شود (همان امضا)', JSON.stringify(R.reelsTodo(q, map).map(x => x.key)) === '["ig:special:1"]');
}

console.log('\n=== ۳) موتور: فایلِ پاک‌شده برداشته نمی‌شود، و سیم‌کشی ===');
{
  const fs = require('fs');
  const s = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  ok('۳.۱ igStepGot_ ریلزِ pruned را «هنوز نساخته» می‌خواند', /r\.pruned \|\| String\(r\.sig\)/.test(s));
  ok('۳.۲ igTick علامت‌گذاری را صدا می‌زند', /igReelPruneDue_\(st\)\) \{\s*try \{ igReelPruneMark_\(st,/.test(s));
  const h = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۳.۳ هشدارِ ریلیز دیگر «⟨شما⟩» نیست', !/HY_ \+ 'ریلیزِ «renders»/.test(h) && /ریلزهای تمام‌شده \(۱۹\.۳\)/.test(h));
}

summary();
