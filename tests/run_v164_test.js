/* ══ آزمونِ ۱۶.۴ — statusLater مسلح شد و ننوشت ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const store = {}, logs = [], made = [];
const keep = {}; ['props_', 'logLine_', 'ScriptApp', 'clearRetryTriggers_', 'writeStatus_', 'getHub_'].forEach(k => { keep[k] = global[k]; });
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } });
global.logLine_ = m => logs.push(m);
global.clearRetryTriggers_ = () => {};
global.ScriptApp = { newTrigger: fn => ({ timeBased: () => ({ after: () => ({ create: () => made.push(fn) }) }) }) };
statusLaterArm_();
ok('۱.۱ مسلح‌شدن بدهی می‌گذارد', !!store[PK.STATUS_DUE]);
ok('۱.۲ زیرِ ۲۰ دقیقه کاری نمی‌کند', statusDueCheck_() === null);
const d = JSON.parse(store[PK.STATUS_DUE]); d.armed -= 30 * 60000; store[PK.STATUS_DUE] = JSON.stringify(d);
const r = statusDueCheck_();
ok('۱.۳ ۳۰ دقیقه بی نوشتن ⇒ سطرِ سیاهه و مسلح‌شدنِ دوباره', r && r.rearmed && made.length === 2 && logs.some(m => /هرگز شروع نشد/.test(m)), JSON.stringify(r));
for (let i = 0; i < 3; i++) { const x = JSON.parse(store[PK.STATUS_DUE]); x.armed -= 30 * 60000; store[PK.STATUS_DUE] = JSON.stringify(x); statusDueCheck_(); }
ok('۱.۴ پس از سه بار رها می‌شود (حلقه نمی‌سازد)', !store[PK.STATUS_DUE] && logs.some(m => /دیگر مسلح نمی‌شود/.test(m)));
global.getHub_ = () => ({}); global.writeStatus_ = () => ({});
statusLaterArm_(); statusLater();
ok('۲.۱ نوشتنِ موفق بدهی را پاک می‌کند و شروع را مهر می‌زند', !store[PK.STATUS_DUE] && !!store[PK.STATUS_LATER_RAN]);
ok('۳.۱ سیم: دورِ ساعتیِ یوتیوب بدهی را می‌بیند', /statusDueCheck_\(\)/.test(fs.readFileSync('src/27_YouTube.gs', 'utf8')));
Object.keys(keep).forEach(k => { global[k] = keep[k]; });
summary('۱۶.۴');
