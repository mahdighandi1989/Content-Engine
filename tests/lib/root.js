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
module.exports = { ROOT };
