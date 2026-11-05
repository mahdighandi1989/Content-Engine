// 17.4 — دورِ دوره‌ای وقتی پشتِ سهمیه می‌ماند، علت را در سیاهه می‌نویسد (special:95، ۵ نوامبر).
require('./lib/root.js');
const fs = require('fs');
const src = fs.readFileSync('src/27_YouTube.gs', 'utf8');
let fail = 0;
function ok(c, m) { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; }
const tick = src.slice(src.indexOf('function ytTick_('), src.indexOf('function ytTick_(') + 9000);
ok(/if \(r0\.quota\) out\.why \+=/.test(tick), '۱ — r0.quota به why می‌رسد');
ok(tick.indexOf('r0.quota') > tick.indexOf('var r0 = ytRunDue_('), '۲ — پس از ytRunDue_');
const pub = src.slice(src.indexOf("runEnter_('ytPublishTick')"), src.indexOf("runEnter_('ytPublishTick')") + 3000);
ok(/منتشر شد\.' \+\s*\(r\.why && !r\.published/.test(pub), '۳ — سطرِ «۰ منتشر شد» علت را دارد');
const due = src.slice(src.indexOf('function ytRunDue_('), src.indexOf('function ytRunDue_(') + 4000);
ok(/if \(r\.quota\) \{ out\.quota = true; break; \}/.test(due), '۴ — ytRunDue_ هنوز quota را برمی‌گرداند');
// ساختگی: منطقِ پیوند
function line(r) { return 'یوتیوبِ دوره‌ای: ' + r.queued + ' به صف، ' + r.collected + ' ویدئو برداشته شد، ' + r.published + ' منتشر شد.' + (r.why && !r.published ? ' — ' + r.why : ''); }
ok(/سهمیه/.test(line({ queued: 0, collected: 1, published: 0, why: 'سهمیه' })), '۵ — علت در سطر');
ok(!/—/.test(line({ queued: 0, collected: 0, published: 1, why: 'x' })), '۶ — انتشارِ موفق بی‌علت');
if (fail) { console.log(fail + ' FAIL'); process.exit(1); } console.log('ALL PASS');
