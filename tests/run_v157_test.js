/* ══ آزمونِ ۱۵.۷ — یخِ ۸۶ و ۸۸ صحنهٔ کارت بود ══
 * قاب‌های ۸۶ (اجرای ۹۳۰، با کدِ ۱۵.۵): ۵۴۵ تا ۵۵۶ و ۷۸۳ تا ۸۰۸ کارتِ «نکته‌ها» روی محوِ تیرهٔ آخرین قابِ کلیپِ پیشین؛ پس از
 * رفتنِ کارت فقط همان محوِ تقریباً سیاه با زومِ ۵٪. کدِ پیشین روی همان قاب: یخِ ۱۸٫۳ ثانیه.
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
let ff = null; try { ff = R.ffmpegExe(); execFileSync(ff, ['-version']); } catch (e) { ff = null; }
if (ff) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v157-'));
  const img = path.join(tmp, 'dark.jpg'), vid = path.join(tmp, 'prev.mp4');
  /* قابِ تیره و کم‌جزئیات، مثلِ زمینهٔ کارتِ ۸۶ */
  execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:d=1', '-vf',
    'boxblur=10:2,eq=brightness=-0.3:saturation=0.5', '-frames:v', '1', img]);
  execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=24:d=6',
    '-vf', 'eq=brightness=-0.3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', vid]);
  /* قابِ واقعیِ زمینهٔ کارتِ ۸۶ (ثانیهٔ ۵۴۸ِ اجرای ۹۳۰) — کدِ پیشین روی همین قاب ۱۸٫۳ ثانیه یخ زد. */
  const a = M.photoClip(ff, 'tests/fixtures/card86_dark.jpg', path.join(tmp, 'c1.mp4'), 25, { card: true });
  const b = M.photoClip(ff, img, path.join(tmp, 'c2.mp4'), 25, { card: true, bgVideo: vid });
  const fa = M.freezes(ff, a.file, M.MK.freezeMax), fb = M.freezes(ff, b.file, M.MK.freezeMax);
  console.log('  (مرجع: کارتِ ۸۶ با کدِ پیشین ۱۸٫۳ ثانیه یخ زد؛ c1/c2 با کدِ تازه)');
  ok('۱.۱ کارت روی قابِ واقعیِ ۸۶: ۲۵ ثانیه بی یخ‌زدگی', a.kind === 'card' && !fa.length, JSON.stringify(fa));
  ok('۱.۲ کارت با زمینهٔ کلیپِ پیشین (در حلقه): بی یخ‌زدگی', b.kind === 'card' && !fb.length, JSON.stringify(fb));
  ok('۱.۳ کلیپِ ۶ ثانیه‌ای زمینهٔ ۲۵ ثانیه را پر می‌کند', (M.probe(ff, b.file) || {}).dur >= 24.5, JSON.stringify(M.probe(ff, b.file)));
} else ok('۱.۰ ffmpeg نیست — سنجیده نشد', true);

const rj = fs.readFileSync('tools/render.js', 'utf8');
ok('۲.۱ کارتِ پس از کلیپ زمینه‌اش را از خودِ کلیپِ پیشین می‌گیرد',
   /got\[scenes\[i - 1\]\.url\]\.kind === 'video'\s*\? clips\[String\(scenes\[i - 1\]\.n\)\]/.test(rj) && /bgVideo: prevClip && fs\.existsSync\(prevClip\) \? prevClip : ''/.test(rj));
summary('۱۵.۷');
