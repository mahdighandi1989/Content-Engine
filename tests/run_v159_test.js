/* ══ آزمونِ ۱۵.۹ — «۱ قابِ خالی (صحنهٔ ۳۶)» در ساختِ تازهٔ ۸۶ ══
 * ۱۵.۷ کلیپِ پیشین را محو و در حلقه پشتِ کارت گذاشت؛ یخ رفت، ولی هر بار که حلقه به آغاز/پایانِ تیرهٔ همان کلیپ رسید
 * ~۱ ثانیه تقریباً سیاه شد (۷۰۸٫۵، ۷۸۸، ۸۰۹، ۸۴۴٫۵ث). fixture: ۸ ثانیه از خودِ ویدئوی ۸۶ (۷۸۴–۷۹۲ث) که درزِ ۷۸۸ را دارد.
 */
require('./lib/root.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const R = require('../tools/render.js');
const M = require('../tools/mediakit.js');

/* ۱) منطقِ پنجره بی ffmpeg */
const r1 = M.liveRun([2, 2, 20, 20, 20, 20, 20, 20, 20, 20, 3, 20, 20], 4);
ok('۱.۱ بلندترین تکهٔ زنده: ۰٫۵ تا ۲٫۵ ثانیه، بریدنی', r1 && r1.a === 0.5 && r1.b === 2.5 && r1.cut === true, JSON.stringify(r1));
ok('۱.۲ تکهٔ زندهٔ کوتاه‌تر از ۲ ثانیه ⇒ null (خودِ عکس، کنارِ کارت)', M.liveRun([2, 20, 20, 20, 2, 2], 4) === null);
const r3 = M.liveRun([20, 20, 20, 20, 20, 20, 20, 20, 20], 4);
ok('۱.۳ کلیپِ سراسر زنده بریده نمی‌شود', r3 && r3.cut === false, JSON.stringify(r3));

let ff = null; try { ff = R.ffmpegExe(); execFileSync(ff, ['-version']); } catch (e) { ff = null; }
if (ff) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v159-'));
  const seam = 'tests/fixtures/card86_seam.mp4';
  const b0 = M.blankSecs(ff, seam);
  ok('۲.۱ درزِ واقعیِ ۸۶ دیده می‌شود (ثانیهٔ ۴ از fixture = ۷۸۸ِ ویدئو)', b0 && b0.length >= 1 && b0[0] >= 3.5 && b0[0] <= 4.5, JSON.stringify(b0));
  const old = M.photoClip(ff, 'tests/fixtures/card86_dark.jpg', path.join(tmp, 'old.mp4'), 25, { card: true, bgVideo: seam });
  const bo = M.blankSecs(ff, old.file);
  console.log('  (مرجع: کدِ ۱۵.۷ با کلِ کلیپ در حلقه: ' + bo.length + ' قابِ خالی در ' + JSON.stringify(bo) + ')');
  ok('۲.۲ کدِ پیشین (کلِ کلیپ در حلقه) همان «قابِ خالی» را بازمی‌سازد', bo.length >= 3);
  const w = M.cardLive(ff, seam);
  ok('۲.۳ تکهٔ زنده پیش از درز است و بریده می‌شود', w && w.cut && w.b <= 4 && w.b - w.a >= 2, JSON.stringify(w));
  const cut = M.cutLive(ff, seam, w, path.join(tmp, 'live.mp4'));
  const nw = M.photoClip(ff, 'tests/fixtures/card86_dark.jpg', path.join(tmp, 'new.mp4'), 25, { card: true, bgVideo: cut });
  const bn = M.blankSecs(ff, nw.file), fz = M.freezes(ff, nw.file, M.MK.freezeMax);
  ok('۲.۴ کدِ تازه: ۲۵ ثانیه کارت، صفر قابِ خالی', nw.kind === 'card' && bn.length === 0, JSON.stringify(bn));
  ok('۲.۵ و هنوز بی یخ‌زدگی (درسِ ۱۵.۷ سرِ جایش)', !fz.length, JSON.stringify(fz));
} else ok('۲.۰ ffmpeg نیست — سنجیده نشد', true);

const rj = fs.readFileSync('tools/render.js', 'utf8');
ok('۳.۱ رانر پیش از ساختِ کارت تکهٔ زنده را می‌گیرد', /MKIT\.cardLive\(FF, bgv\)/.test(rj) && /MKIT\.cutLive\(FF, bgv, lw/.test(rj));
ok('۳.۲ و خروجیِ کارت را می‌بیند؛ خالی ⇒ خودِ عکسِ صحنه', /MKIT\.blankSecs\(FF, pc\.file\)/.test(rj) && /srcImg = g\.file; st\.cardBlank/.test(rj));
ok('۳.۳ سنجهٔ خالیِ رانر همان آستانهٔ QA است', M.MK.qaBlankSd === require('../tools/scenekit.js').SK.qaBlankSd);
summary('۱۵.۹');
