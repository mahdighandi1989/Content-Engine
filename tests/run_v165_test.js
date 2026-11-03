/* ══ آزمونِ ۱۶.۵ — هشدارِ «رندر ۶ ساعت منتظر» برای کاری که ویدئو نبود ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const store = {}, kicks = [];
const keep = { props_: global.props_, ghKick_: global.ghKick_, ghToken_: global.ghToken_, ghRenderStallTell_: global.ghRenderStallTell_ };
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } });
global.ghKick_ = (wf, why) => { kicks.push(why); return { ok: true }; };
ghRenderDue_('کاورِ مربعیِ پلی‌لیست');
ok('۱.۱ کارِ غیرِویدئویی: راه‌اندازی آری، نشانهٔ «منتظر» نه', kicks.length === 1 && !store[PK.GH_RENDER_DUE] && !store[PK.GH_RENDER_SINCE]);
ghRenderDue_('درخواستِ رندرِ variety:92');
ok('۱.۲ درخواستِ ویدئو همچنان نشانه می‌گذارد', !!store[PK.GH_RENDER_DUE] && !!store[PK.GH_RENDER_SINCE]);
store[PK.GH_RENDER_DUE] = nowStr_() + '|بنرِ کانال'; store[PK.GH_RENDER_SINCE] = nowStr_();
let told = 0; global.ghRenderStallTell_ = () => { told++; };
ghRenderKickDue_();
ok('۱.۳ نشانهٔ کهنهٔ غیرِویدئویی پاک می‌شود و هشدار نمی‌دهد', !store[PK.GH_RENDER_DUE] && !store[PK.GH_RENDER_SINCE] && told === 0);
Object.keys(keep).forEach(k => { global[k] = keep[k]; });
summary('۱۶.۵');
