/* ══ آزمونِ ۱۷.۸ — پس از تمام‌شدنِ مجموعهٔ جاری، اول مجموعهٔ بعدیِ همان دستهٔ دستی (R-20261108-02) ══
   حالتِ واقعیِ ۸ نوامبر: مصباح ۱ و آئودی ۲ (فلسفی و اعتقادی) تمام، خداشناسی ۲ (مذهبی و معنوی)، تحلیلِ فلسفی ۳ (فلسفی و اعتقادی). */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const FA = 'فلسفی و اعتقادی', MZ = 'مذهبی و معنوی';
const mk = (key, name, st, mo, mcat, last) => {
  const v = new Array(SERIES_HEADERS.length).fill(''); v[SC.KEY - 1] = key; v[SC.NAME - 1] = name; v[SC.STATUS - 1] = st;
  if (mo !== null) v[SC.MORDER - 1] = mo; v[SC.MCAT - 1] = mcat || ''; v[SC.LAST_EP_AT - 1] = last || '';
  return { key, row: 0, vals: v };
};
const build = (rows) => { const reg = { rows, byKey: {} }; rows.forEach((r, i) => { r.row = i + 2; reg.byKey[r.key] = r; }); return reg; };
const prt = (chunks, done) => { const v = new Array(20).fill(''); v[SP.CHUNKS - 1] = chunks; v[SP.DONE_TO - 1] = done; return { vals: v }; };
const parts = { byKey: { mesbah: [prt(15, 15)], audi: [prt(86, 86)], theo: [prt(218, 0)], intro: [prt(110, 0)], ethics: [prt(10, 0)], none: [prt(9, 0)] } };
const rowsNow = () => [
  mk('mesbah', 'معرفت‌شناسیِ مصباح', SST.ACTIVE, 1, FA, '2026-08-28 5:06'),
  mk('theo', 'خداشناسی', SST.NEW, 2, MZ),
  mk('ethics', 'فلسفهٔ اخلاق', SST.NEW, 4, MZ),
  mk('audi', 'Audi (2011) Epistemology', SST.ACTIVE, 2, FA, '2026-11-08 5:08'),
  mk('intro', 'An Introduction To Philosophical Analysis', SST.NEW, 3, FA),
  mk('none', 'بی‌شماره در همان دسته', SST.NEW, null, FA)
];
const P = PropertiesService.getScriptProperties();
const keepT = CFG.SERIES_AUTO_CAT_TRUST; CFG.SERIES_AUTO_CAT_TRUST = false;
P.deleteProperty(PK.SP_PIN);
P.setProperty(PK.SP_SERIES, 'audi');
let plan = pickSeriesPlan_({}, build(rowsNow()), parts);
ok('۱.۱ آئودی تمام ⇒ «تحلیلِ فلسفی» (همان دسته، #۳)، نه خداشناسی (#۲ دستهٔ دیگر)', plan.rec && plan.rec.key === 'intro', plan.rec && plan.rec.key);
ok('۱.۲ مصباح و آئودی بی‌کار ⇒ در «spent» (بسته می‌شوند)', plan.spent.map((r) => r.key).sort().join(',') === 'audi,mesbah');
ok('۱.۳ ردیفِ بی‌شمارهٔ همان دسته وارد نوبت نشد', plan.rec.key !== 'none');
let q = seriesQueuePlan_({}, build(rowsNow()), parts);
ok('۲.۱ پیش‌بینیِ صف همان قاعده را دارد: تحلیل ← خداشناسی ← اخلاق', q.rows.map((x) => x.key).join(',') === 'intro,theo,ethics', q.rows.map((x) => x.key).join(','));
// همان دسته دیگر چیزی ندارد ⇒ به ترتیبِ شماره در کل
const rows2 = rowsNow(); rows2.find((r) => r.key === 'intro').vals[SC.STATUS - 1] = SST.DONE;
plan = pickSeriesPlan_({}, build(rows2), parts);
ok('۳.۱ همان دسته تمام ⇒ کوچک‌ترین شمارهٔ کل (خداشناسی #۲)', plan.rec && plan.rec.key === 'theo');
// کلید خاموش ⇒ رفتارِ پیشین
CFG.SERIES_SAME_CAT_FIRST = false;
plan = pickSeriesPlan_({}, build(rowsNow()), parts);
ok('۳.۲ SERIES_SAME_CAT_FIRST=false ⇒ رفتارِ پیشین (خداشناسی #۲)', plan.rec && plan.rec.key === 'theo');
CFG.SERIES_SAME_CAT_FIRST = true;
// آخرین مجموعه دستهٔ دستی ندارد ⇒ قاعدهٔ دسته بی‌اثر
const rows3 = rowsNow(); rows3.find((r) => r.key === 'audi').vals[SC.MCAT - 1] = '';
plan = pickSeriesPlan_({}, build(rows3), parts);
ok('۳.۳ دستهٔ دستیِ آخرین مجموعه خالی ⇒ فقط شماره (خداشناسی)', plan.rec && plan.rec.key === 'theo');
// مجموعهٔ فعالِ کاردار همچنان مقدم
const parts4 = JSON.parse(JSON.stringify(parts)); parts4.byKey.audi = [prt(86, 80)];
plan = pickSeriesPlan_({}, build(rowsNow()), parts4);
ok('۳.۴ آئودی هنوز کار دارد ⇒ همان آئودی', plan.rec && plan.rec.key === 'audi');
// سنجاق همچنان مقدم
P.setProperty(PK.SP_PIN, 'series:theo');
plan = pickSeriesPlan_({}, build(rowsNow()), parts);
ok('۳.۵ سنجاقِ دستی بر قاعدهٔ دسته مقدم است', plan.rec && plan.rec.key === 'theo');
P.deleteProperty(PK.SP_PIN);
// هیچ شماره و دسته‌ای نوشته نشد
const rr = rowsNow(), before = JSON.stringify(rr.map((r) => [r.vals[SC.MORDER - 1], r.vals[SC.MCAT - 1]]));
pickSeriesPlan_({}, build(rr), parts);
ok('۴.۱ انتخاب هیچ شماره یا دستهٔ دستی را عوض نمی‌کند', JSON.stringify(rr.map((r) => [r.vals[SC.MORDER - 1], r.vals[SC.MCAT - 1]])) === before);
CFG.SERIES_AUTO_CAT_TRUST = keepT;
summary('۱۷.۸');
