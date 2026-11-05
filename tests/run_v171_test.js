/* ══ آزمونِ ۱۷.۱ — ترکیبِ دسته‌های علمی وقتی هیچ‌کدام تنها چهار نامزد ندارد ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const G = ['tabStats_', 'fetchRows_', 'buildCandidates_', 'vgApply_', 'vgSkipNow_', 'readIndex_', 'catLockOrder_', 'pickCategoryFrom_', 'catLockNote_', 'logLine_'];
const keep = {}; G.forEach(k => { keep[k] = global[k]; });
const per = { 'علمی و آموزشی': 2, 'روانشناسی و رشد فردی': 2, 'فرهنگی، تاریخی و ادبی': 1 };
let skip = [];
global.logLine_ = () => {};
global.vgSkipNow_ = () => skip;
global.tabStats_ = (h, name) => ({ sheet: name, rows: Array.from({ length: 6 }, (_, i) => ({ row: i + 2, fresh: i === 0 })) });
global.buildCandidates_ = rows => rows;
global.fetchRows_ = (sh, name, rows) => rows.map(r => ({ id: name + ':' + r, cat: name }));
global.vgApply_ = (h, items) => items.slice(0, per[items[0] && items[0].cat] || 0);   // دروازه: فقط چند تا از هر دسته می‌مانَد
const lock = Object.keys(per).map(n => ({ name: n, s: 0 }));

const c = sciCombine_({}, lock);
ok('۱.۱ سه دستهٔ کم (۲+۲+۱) با هم پنج نامزد می‌سازند', c && c.combined && c.items.length === 5 && c.members.length === 3);
ok('۱.۲ عنوان نامِ واقعیِ پرنامزدترین دسته است و هر آیتم دستهٔ خودش را دارد', c && per[c.title] === 2 && c.items.some(x => x.cat === 'فرهنگی، تاریخی و ادبی'));
per['روانشناسی و رشد فردی'] = 0; per['فرهنگی، تاریخی و ادبی'] = 1;
ok('۱.۳ کمتر از چهار ⇒ null (جبرانِ عادی)', sciCombine_({}, lock) === null);
per['روانشناسی و رشد فردی'] = 2; per['فرهنگی، تاریخی و ادبی'] = 1;
skip = [SCI_COMBINE_KEY];
ok('۱.۴ ترکیبی که امروز قسمت نساخت دوباره امتحان نمی‌شود', sciCombine_({}, lock) === null);
skip = [];

// ۲) pickCategory_: قفل هیچ دسته‌ای نداد ⇒ ترکیب، پیش از رتبه‌بندیِ همهٔ دسته‌ها
const calls = [];
global.readIndex_ = () => Object.keys(per).map(n => ({ name: n, elig: 100, fresh: 1 })).concat([{ name: 'طنز و سرگرمی', elig: 900, fresh: 50 }]);
global.catLockOrder_ = () => lock;
global.pickCategoryFrom_ = (h, ranked, all) => { calls.push(all); return all ? null : { title: 'طنز و سرگرمی' }; };
global.catLockNote_ = () => {};
const p = pickCategory_({});
ok('۲.۱ ترکیبِ علمی برگزیده شد، نه «طنز و سرگرمی»', p && p.combined === true && calls.length === 1 && calls[0] === true);
const hold = CFG.VG_SCI_COMBINE; CFG.VG_SCI_COMBINE = false; calls.length = 0;
const p2 = pickCategory_({});
ok('۲.۲ خاموش ⇒ همان رفتارِ قبلی', p2 && p2.title === 'طنز و سرگرمی' && calls.length === 2);
CFG.VG_SCI_COMBINE = hold;
G.forEach(k => { global[k] = keep[k]; });

const src = fs.readFileSync('src/03_Producer.gs', 'utf8');
ok('۳.۱ شکستِ ترکیب کلیدِ خودش را کنار می‌گذارد، نه یک دستهٔ واقعی', /vgSkipAdd_\(picked\.combined \? SCI_COMBINE_KEY : picked\.title\)/.test(src));
summary('۱۷.۱');
