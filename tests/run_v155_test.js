/* ══ آزمونِ ۱۵.۵ — فریزِ ۸۸ (کلیپِ کوتاه‌تر از صحنه)، و ۸۹ بی انتظار تا شب ══
 * ۲ نوامبر: «۸۸ ساعت ۱۳:۰۶ دبی باز از سنجش رانر رد شد با فریز ۲۴۷٫۷ تا ۲۶۸٫۳ ثانیه … ۸۹ هنوز فهرست‌نشده است؛ اگر ممکن
 * است بدون انتظار تا شب عمومی شود».
 */
require('./lib/root.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

console.log('\n=== ۱) کلیپِ منبعِ کوتاه‌تر از صحنه تکرار می‌شود، نه قابِ ساکن ===');
{
  const S = require('../tools/scenekit.js');
  const a = S.fullPlan(30, 52), b = S.fullPlan(52, 52), c = S.fullPlan(50, 52);
  ok('۱.۱ کمبودِ ۲۲ ثانیه ⇒ تکرار (همان شکلِ ۸۸)', a.loop === true && a.only === true, JSON.stringify(a));
  ok('۱.۲ کلیپِ به‌اندازه ⇒ کلِ صحنه، بی تکرار', b.only === true && b.loop === false);
  ok('۱.۳ کمبودِ کوچک (زیرِ loopFrom) ⇒ راهِ قبلی', c.only === false && c.loop === false);
  const sk = fs.readFileSync('tools/scenekit.js', 'utf8');
  ok('۱.۴ ورودیِ کلیپِ تکرارشونده با -stream_loop، و مرجعِ سنجش از دورِ نخستِ همان کلیپ',
     /if \(cp\.loop\) a\.push\('-stream_loop', '-1'\);/.test(sk) && /if \(cp && cp\.loop\) \{[\s\S]{0,700}ref\[k\] = cp\.file; refT\[k\] = tl0;/.test(sk));
  const R = require('../tools/render.js');
  let ff = null; try { ff = R.ffmpegExe(); execFileSync(ff, ['-version']); } catch (e) { ff = null; }
  if (ff) {
    const M = require('../tools/mediakit.js');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'v155-'));
    const src = path.join(tmp, 's.mp4'), out = path.join(tmp, 'o.mp4');
    execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=24:d=6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', src]);
    /* همان زنجیرهٔ scenekit برای `only` با تکرار */
    execFileSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-stream_loop', '-1', '-i', src, '-filter_complex',
      '[0:v]trim=duration=20,setpts=PTS-STARTPTS,fps=24,scale=640:360:force_original_aspect_ratio=increase,crop=640:360,setsar=1,format=yuv420p[o]',
      '-map', '[o]', '-c:v', 'libx264', '-preset', 'veryfast', out]);
    const dur = Number(execFileSync(ff.replace(/ffmpeg$/, 'ffprobe').indexOf('ffprobe') >= 0 && fs.existsSync(ff.replace(/ffmpeg$/, 'ffprobe')) ? ff.replace(/ffmpeg$/, 'ffprobe') : 'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString()) || 0;
    const fz = M.freezes(ff, out, M.MK.freezeMax);
    ok('۱.۵ کلیپِ ۶ ثانیه‌ای ⇒ ۲۰ ثانیه حرکت، بی یخ‌زدگی', dur >= 19.5 && !fz.length, JSON.stringify({ dur, fz }));
  } else ok('۱.۶ ffmpeg نیست — سنجیده نشد', true);
}

console.log('\n=== ۲) صفِ عمومی‌کردن هر ساعت، نه فقط روزی یک بار ===');
{
  const store = {};
  const keepP = global.props_;
  global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } });
  const keep = {};
  ['ytOn_', 'getHub_', 'ytPublished_', 'ytSvc_', 'ytPublicGate_', 'ytRenderMapCached_', 'ytHandsOff_', 'ytLog_', 'ytApprDoneAdd_'].forEach(k => { keep[k] = global[k]; });
  const flips = [];
  global.ytOn_ = () => true; global.getHub_ = () => ({});
  global.ytPublished_ = () => ({ 'variety:89': { videoId: 'V89', privacy: 'unlisted', title: 't', url: 'u' } });
  global.ytSvc_ = () => ({ Videos: { update: b => { flips.push(b.id); } } });
  global.ytPublicGate_ = () => ({ ok: true }); global.ytRenderMapCached_ = () => ({});
  global.ytHandsOff_ = () => false; global.ytLog_ = () => {}; global.ytApprDoneAdd_ = () => {};
  const r = ytFlipDueTick_();
  ok('۲.۱ بذرِ ۸۹ در نوبتِ ساعتی عمومی شد', r.flipped === 1 && flips.join() === 'V89', JSON.stringify(r));
  const r2 = ytFlipDueTick_();
  ok('۲.۲ نوبتِ بعد: صف خالی، هیچ خواندنِ دفتری', r2.checked === 0 && flips.length === 1);
  const src = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۲.۳ سیم: ytFlipDueTick_ در نوبتِ ساعتیِ یوتیوب، پیش از بازسنجیِ روزانه',
     src.indexOf('var fdT = ytFlipDueTick_();') > 0 && src.indexOf('var fdT = ytFlipDueTick_();') < src.indexOf('ytRedoStuckNightly_(Math.min(45000, left() - 20000)); ytStuckTickMark_();'));
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
  global.props_ = keepP;
}

summary('۱۵.۵');
