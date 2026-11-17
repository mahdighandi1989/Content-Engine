/* ══ آزمونِ ۱۸.۵ — ویدئوی ساده‌ای که کنار رفت، درخواستِ صحنه را نمی‌بندد (variety:103) ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const keepLog = global.logLine_; global.logLine_ = () => {};
const keep = {}; const stub = (n, f) => { keep[n] = global[n]; global[n] = f; };
let store, map;
stub('ytRenderRead_', () => store);
stub('ytRenderSave_', (d) => { store = d; });
stub('ytRenderMapCached_', () => map);
stub('ytDlUrl_', (id) => 'u:' + id);
const plainRow = () => ({ key: 'variety:103', show: 'variety', ep: '103', status: 'رسید', at: '2026-11-15 18:58' });
const scenes = [{ id: 's1' }, { id: 's2' }];
const ask = (extra) => ytRenderAsk_(Object.assign({ show: 'variety', ep: '103', title: 't', folderId: 'F', visuals: [], scenes: scenes,
  audio: [{ id: 'a', name: 'a.wav' }], audioKind: 'full', outName: 'o' }, extra || {}));

store = { items: [plainRow()] }; map = { 'variety:103': { url: 'https://x/variety-103.mp4' } };
let r = ask();
let row = store.items.filter(x => x.key === 'variety:103');
ok('۱.۱ ردیفِ «رسید»ِ ساده + نقشهٔ ساده ⇒ درخواستِ صحنه نوشته می‌شود', r === true || r === undefined || row.length === 1 && (row[0].scenes || []).length === 2);
ok('۱.۲ همان ردیف بازنویسی شد، نه ردیفِ دوم، و «در انتظار» برای رانر', row.length === 1 && (row[0].scenes || []).length === 2 && row[0].status === 'در انتظار');
ok('۱.۳ با برچسبِ جایگزینی (رانر آن را «ساخته‌نشده» می‌بیند)', /^plain-/.test(String(row[0].replace || '')));
ok('۱.۴ رانر: ردیفِ برچسب‌دار با نقشهٔ بی‌برچسب ساخته‌نشده است', ytRenderBuilt_(row[0], map) === false || ytRenderBuilt_(row[0], map) == null);
const n0 = JSON.stringify(store);
r = ask();
ok('۱.۵ دورِ بعد (بی برچسب در صف) دوباره نمی‌نویسد — حلقه نیست', JSON.stringify(store) === n0 && !r);

store = { items: [plainRow()] }; map = { 'variety:103': { url: 'u', mode: 'media' } };
r = ask();
ok('۲.۱ ویدئوی رسانه‌ای (نه ساده) ⇒ مثلِ قبل رد می‌شود', !r && !(store.items[0].scenes || []).length);
store = { items: [Object.assign(plainRow(), { scenes: [{ id: 'x' }] })] }; map = { 'variety:103': { url: 'u' } };
r = ask();
ok('۲.۲ ردیفِ قبلی خودش صحنه دارد ⇒ دست نمی‌خورد', !r && store.items[0].scenes.length === 1);
store = { items: [plainRow()] }; map = { 'variety:103': { url: 'u' } };
r = ytRenderAsk_({ show: 'variety', ep: '103', visuals: [], audio: [] });
ok('۲.۳ درخواستِ بی‌صحنه ⇒ دست نمی‌خورد', !r && !store.items[0].replace);
store = { items: [{ key: 'special:90', show: 'special', ep: '90', status: 'رسید' }] }; map = { 'special:90': { url: 'u', mode: 'scenes' } };
r = ytRenderAsk_({ show: 'special', ep: '90', visuals: [], scenes: scenes, audio: [] });
ok('۲.۴ درس‌نامهٔ صحنه‌ایِ ساخته‌شده ⇒ دست نمی‌خورد', !r && !store.items[0].replace);

for (const k of Object.keys(keep)) global[k] = keep[k];
global.logLine_ = keepLog;
summary('۱۸.۵');
