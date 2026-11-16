/* ══ آزمونِ ۱۸.۴ — منبعِ کم‌رسانه «ایراد» نیست: نقاشی می‌رود و یافتهٔ «جدی»ِ vm-fallback نمی‌سازد (variety:103) ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const keepLog = global.logLine_; global.logLine_ = () => {};
const keep = {}; const stub = (n, f) => { keep[n] = global[n]; global[n] = f; };
let noted = null, written = null;
stub('vmOn_', () => true); stub('vmNote_', (k, r) => { noted = r; }); stub('vmWrite_', (f, d) => { written = d; });
const ctx = { show: 'variety', epRaw: '103' };

/* ۱ — سابقهٔ پیش از ۱۸.۴ (بی پرچم) از روی علتش «کم‌رسانه» شناخته می‌شود */
ok('۱.۱ «فقط 2 صحنه از 2 رسانه» زیرِ کفِ ۳ ⇒ few', vmFewWhy_('فقط 2 صحنه از 2 رسانه درآمد (3 بار)') === true);
ok('۱.۲ «فقط 2 صحنه از 9 رسانه» ⇒ نه few (منبع رسانه داشت؛ ایرادِ چیدن است)', vmFewWhy_('فقط 2 صحنه از 9 رسانه درآمد') === false);
ok('۱.۳ «فقط 1 رسانه رونوشت شد» ⇒ نه few (خرابیِ رونوشت)', vmFewWhy_('فقط 1 رسانه رونوشت شد') === false);

stub('vmRead_', () => ({ phase: 'plan', failed: 3, why: 'فقط 2 صحنه از 2 رسانه درآمد (3 بار)', at: '2026-11-15 18:58' }));
let r = vmBuild_({}, {}, {}, ctx);
ok('۱.۴ شکستِ نهاییِ کم‌رسانه ⇒ final و few در vmNote_', r.final === true && r.few === true && noted && noted.few === true && noted.final === true);
stub('vmRead_', () => ({ phase: 'plan', failed: 3, why: 'مدل جواب نداد: x (3 بار)', at: '2026-11-15 18:58' }));
r = vmBuild_({}, {}, {}, ctx);
ok('۱.۵ شکستِ نهاییِ دیگر ⇒ final ولی نه few', r.final === true && !r.few && noted.few === false);

/* ۲ — وضعیت: کم‌رسانه سالم، شکستِ واقعی همچنان ایراد با متنِ درست */
const P = {}; stub('props_', () => ({ getProperty: k => P[k] || null, setProperty: (k, v) => { P[k] = v; } }));
stub('ytShowOff_', () => false);
P[PK.VM_LAST] = JSON.stringify({ key: 'variety:103', at: 'x', ok: false, why: 'فقط 2 صحنه از 2 رسانه درآمد (3 بار)' });
let s = vmStatus_();
ok('۲.۱ سابقهٔ کهنهٔ ۱۰۳ ⇒ ok و خطی که «ایراد نیست» می‌گوید', s.ok === true && s.few === true && /نقاشی/.test(s.line) && !/❌/.test(s.line));
P[PK.VM_LAST] = JSON.stringify({ key: 'variety:110', at: 'x', ok: false, final: true, why: 'فقط 1 رسانه رونوشت شد' });
s = vmStatus_();
ok('۲.۲ رونوشتِ ناموفق ⇒ هنوز ایراد، با «نقاشی» نه «ویدئوی ساده»', s.ok === false && /❌/.test(s.line) && /نقاشی/.test(s.line) && !/ویدئوی ساده/.test(s.line));

/* ۳ — vmHealth_ برای کم‌رسانه یافته نمی‌سازد */
let logged = 0; stub('logSelfFinding_', () => { logged++; }); stub('getHub_', () => ({}));
P[PK.VM_LAST] = JSON.stringify({ key: 'variety:103', at: 'x', ok: false, final: true, few: true, why: 'فقط 2 صحنه از 2 رسانه درآمد' });
const pr = [], no = []; vmHealth_(pr, no);
ok('۳.۱ کم‌رسانه ⇒ نه مسئله، نه یافتهٔ vm-fallback؛ خطش در یادداشت‌ها', logged === 0 && pr.length === 0 && no.length === 1);
P[PK.VM_LAST] = JSON.stringify({ key: 'variety:110', at: 'x', ok: false, final: true, why: 'فقط 1 رسانه رونوشت شد' });
vmHealth_(pr, no);
ok('۳.۲ شکستِ واقعی ⇒ همچنان یافته', logged === 1 && pr.length === 1);

for (const k of Object.keys(keep)) global[k] = keep[k];
global.logLine_ = keepLog;
summary('۱۸.۴');
