/* ══ آزمونِ ۱۶.۱ — «_STATUS از ۲۰:۱۸ ننوشته، همهٔ اجراها Completed» ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const store = {}, logs = [];
const keep = { props_: global.props_, logLine_: global.logLine_, writeStatus_: global.writeStatus_, getHub_: global.getHub_ };
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); } });
global.logLine_ = m => logs.push(m);
global.getHub_ = () => ({});
global.writeStatus_ = () => { throw new Error('Drive: خطای آزمونی'); };
let threw = '';
try { runWriteStatusNow(); } catch (e) { threw = e.message; }
const f = JSON.parse(store[PK.STATUS_FAIL] || 'null') || {};
ok('۱.۱ اجرای دستی خطا را نمی‌بلعد (در Executions دیده می‌شود)', /خطای آزمونی/.test(threw));
ok('۱.۲ و علت در Properties و سیاهه می‌ماند', f.who === 'دستی' && /خطای آزمونی/.test(f.why) && logs.some(m => /نوشتنِ _STATUS نشد/.test(m)), JSON.stringify(f));
global.writeStatus_ = () => ({});
ok('۱.۳ موفق ⇒ پیامِ ثانیه', /نوشته شد در \d+ ثانیه/.test(runWriteStatusNow()));
const sy = fs.readFileSync('src/02_Sync.gs', 'utf8');
ok('۲.۱ سینک دیگر خطای نوشتنِ وضعیت را نمی‌بلعد', /catch \(e\) \{ statusFailNote_\('سینک', e\); \}/.test(sy) && !/writeStatus_\(hub, 'همگام‌سازی کامل شد'\); \} catch \(e\) \{\}/.test(sy));
ok('۲.۳ ۱۶.۲: سینک نوشتن را به اجرای جدا می‌سپارد', /if \(!statusLaterArm_\(\)\)/.test(sy));
ok('۲.۲ _STATUS.statusFail از همان Properties', /statusFail: \(function \(\) \{ try \{ return JSON\.parse\(props_\(\)\.getProperty\(PK\.STATUS_FAIL\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
Object.keys(keep).forEach(k => { global[k] = keep[k]; });
summary('۱۶.۱');
