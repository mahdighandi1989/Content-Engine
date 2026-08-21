/* root.js — لنگرِ مسیرها.
 *
 * آزمون‌ها در `tests/` هستند، اما مسیرهای نسبی‌شان (`src/`، `engine.gs`،
 * `tests/fixtures/…`) از **ریشهٔ ریپو** حساب می‌شود. این فایل cwd را روی ریشه
 * می‌گذارد تا هر آزمون از هر جایی اجرا شود:
 *     node tests/run_engine_test.js      (از ریشه)
 *     node run_engine_test.js            (از داخلِ tests/)
 *
 * هر `run_*.js` باید این را پیش از هر require دیگری صدا بزند، چون بعضی libها
 * (مثل probe_r4_lib.js) همان لحظهٔ import از `src/` می‌خوانند.
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
process.chdir(ROOT);


/* ساعتِ آزمون‌ها ثابت است.
 *
 * پیش از این، آزمون‌ها ساعتِ واقعیِ ماشین را می‌دیدند و ۱۱ سوئیت فقط بعد از
 * ساعتِ انتشار سبز می‌شدند: بینِ نیمه‌شب تا ۷ صبح قرمز، بعدش سبز. رفتارِ موتور
 * درست بود — `enrichWorthWaiting_` پیش از ساعتِ انتشار قسمت را عقب می‌اندازد تا
 * غنی‌سازیِ اینترنتی برسد — این آزمون‌ها بودند که بی‌آنکه بگویند فرض کرده بودند
 * «الان بعد از ۷ است». نتیجه‌اش این بود که «همه سبز» به ساعتِ اجرا بستگی داشت،
 * که یعنی هیچ.
 *
 * پس ساعت را می‌بندیم. عقربه همچنان جلو می‌رود (فاصله‌ها و سقف‌های زمانی سالم
 * می‌مانند)، فقط مبدأ ثابت است. برای وارسیِ رفتارِ موتور در ساعتی دیگر:
 *     TEST_NOW=2026-08-18T03:00:00Z node tests/run_board_test.js
 */
const FIXED = Date.parse(process.env.TEST_NOW || '2026-08-18T12:00:00Z');
if (isFinite(FIXED)) {
  const Real = Date;
  const bootedAt = Real.now();
  const shifted = () => FIXED + (Real.now() - bootedAt);
  class FixedDate extends Real {
    constructor(...a) { if (a.length === 0) super(shifted()); else super(...a); }
    static now() { return shifted(); }
  }
  global.Date = FixedDate;
}

/* خروجی‌های آزمون در ریشهٔ ریپو نریزند.
 *
 * چند سوئیت فایلِ صوتی و HTML و گزارش می‌سازند. چون cwd روی ریشه پین است، همه
 * همان‌جا می‌نشستند و ریشه‌ای که قرار بود فقط چهار فایل داشته باشد شلوغ می‌شد.
 * .gitignore جلوی وارد شدنشان به گیت را می‌گرفت، ولی جلوی ریختنشان را نه.
 */
const fs = require('fs');
const OUT = path.join(ROOT, 'tests', '_out');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const outPath = (name) => path.join(OUT, name);

module.exports = { ROOT, OUT, outPath };
