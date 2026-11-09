/* ══ آزمونِ ۱۷.۹ — نوشتنِ وضعیت در پایانِ تولید، در اجرای جدا ══
   شاهدِ ۹ نوامبر: produceSpecialContinue سرِ «وضعیت: contentAudit» در ۳۴۹ث کشته شد؛ STATUS_COST = ۷۳ث سد را باز گذاشته بود. */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const fs = require('fs');
const P = PropertiesService.getScriptProperties();
const wsWas = global.writeStatus_, armWas = global.statusLaterArm_, t0Was = RUN_T0_;
let wrote = 0, armed = 0;
global.writeStatus_ = () => { wrote++; return {}; };
P.setProperty(PK.STATUS_COST, JSON.stringify({ totalSec: 73 }));

// ۱ — حالتِ واقعی: ۲۵۰ ثانیه گذشته، برآورد ۷۳ث ⇒ سدِ قدیم اجازه می‌داد (۲۵۰+۷۳+۳۰=۳۵۳ < ۳۵۵)؛ حالا در همین اجرا نمی‌نویسد.
global.statusLaterArm_ = () => { armed++; return true; };
RUN_T0_ = Date.now() - 250 * 1000;
let r = statusAfterRun_(null, 'درس‌نامه 99 کامل شد');
ok('۱.۱ تریگر ساخته شد ⇒ در همین اجرا نوشته نشد', wrote === 0, wrote);
ok('۱.۲ اجرای جدا مسلح شد', armed === 1, armed);
ok('۱.۳ برمی‌گرداند null', r === null);
RUN_T0_ = Date.now() - 10 * 1000; statusAfterRun_(null, 'x');
ok('۱.۴ حتی اولِ اجرا هم نمی‌نویسد (عددِ اجرای دیگر برآورد نیست)', wrote === 0 && armed === 2, wrote + '/' + armed);

// ۲ — تریگر ساخته نشد ⇒ سدِ پیشین سرِ جایش
global.statusLaterArm_ = () => false;
RUN_T0_ = Date.now() - 40 * 1000; statusAfterRun_(null, 'x');
ok('۲.۱ بی تریگر و وقتِ کافی ⇒ همین‌جا نوشته شد', wrote === 1, wrote);
RUN_T0_ = Date.now() - 300 * 1000; statusAfterRun_(null, 'x');
ok('۲.۲ بی تریگر و ۳۰۰ث گذشته ⇒ سپرده به بعد', wrote === 1, wrote);

// ۳ — statusLaterArm_ واقعی در ماک: تریگر می‌سازد و بدهی می‌گذارد
global.statusLaterArm_ = armWas;
P.deleteProperty(PK.STATUS_DUE);
RUN_T0_ = Date.now() - 250 * 1000; statusAfterRun_(null, 'x');
ok('۳.۱ مسیرِ واقعی: بدهیِ STATUS_DUE ثبت شد (تا نوشتنِ موفق دیده می‌شود)', !!P.getProperty(PK.STATUS_DUE));
ok('۳.۲ مسیرِ واقعی: در همین اجرا نوشته نشد', wrote === 1, wrote);

// ۴ — هر دو پایانِ تولید هنوز از statusAfterRun_ می‌گذرند (نه writeStatus_ مستقیم)
const p3 = fs.readFileSync('src/03_Producer.gs', 'utf8'), p14 = fs.readFileSync('src/14_Special.gs', 'utf8');
ok('۴.۱ «از همه جا» و درس‌نامه از statusAfterRun_', p3.includes("statusAfterRun_(hub, 'قسمت '") && p14.includes("statusAfterRun_(hub, 'درس‌نامه '"));
ok('۴.۲ هیچ‌کدام writeStatus_ را مستقیم صدا نمی‌زنند', !/writeStatus_\(/.test(p3) && !/writeStatus_\(/.test(p14));

global.writeStatus_ = wsWas; global.statusLaterArm_ = armWas; RUN_T0_ = t0Was;
summary('۱۷.۹');
