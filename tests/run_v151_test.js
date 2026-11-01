/* ══ آزمونِ ۱۵.۱ — «از همه جا»: هیچ قسمتِ غیرعلمی بالا نمی‌رود، و صدای کلیپ در فایلِ نهایی سنجیده می‌شود ══
 * ۱ نوامبر: «قسمت ۸۲ … طلاق به خاطر خروپف … طنز» عمومی شد؛ «کلیپ‌ها پخش می‌شد ولی فقط صدای گوینده».
 * ۱) لایهٔ کد: منبعِ بی دروازهٔ ۱۳.۴ ⇒ رد، بی مدل
 * ۲) لایهٔ محتوا: مدل «خیر» ⇒ رد؛ «بله» ⇒ می‌گذرد؛ مدل نبود ⇒ منتظر (نه انتشار)؛ داوری یک بار ثبت می‌شود
 * ۳) سیم‌کشی: پیش از آپلود، و جایگزینیِ دستوری هم از این در می‌گذرد
 * ۴) رانر: صدای هر لحظه روی ثانیه‌های فایلِ نهایی
 * ۵) ۸۲ در فهرستِ کنارگذاشته، بیرون از جایگزینی
 */
require('./lib/root.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const gated = [{ id: 'a', vgLoose: false }, { id: 'b', vgLoose: true, vgSci: true }];
const ep = { title: 'مغز و دوپامین', summary: 'زیست‌شناسیِ تمرکز', sections: [{ title: 'دوپامین', narration: 'مغز …' }] };

console.log('\n=== ۱) لایهٔ کد ===');
{
  ok('۱.۱ منبعِ بی نشانِ دروازه ⇒ رد با دلیل', /پیش از دروازهٔ منبعِ علمی/.test(ytSciSrcWhy_({ items: [{ id: 'x' }, { id: 'y', vgLoose: false }] })));
  ok('۱.۲ بی‌مجموعهٔ بی «بله»ی داور ⇒ رد', /بی «بله»ی داورِ علمی/.test(ytSciSrcWhy_({ items: [{ id: 'x', vgLoose: true }] })));
  ok('۱.۳ همه از دروازه گذشته ⇒ خالی', ytSciSrcWhy_({ items: gated }) === '');
  ok('۱.۴ بی منبع ⇒ رد', /ثبت نیست/.test(ytSciSrcWhy_({ ep: ep })));
}

console.log('\n=== ۲) لایهٔ محتوا ===');
{
  const keep = global.geminiText_;
  let calls = 0, ans = { scientific: 'خیر', why: 'طنزِ خانوادگی' };
  global.geminiText_ = () => { calls++; return ans; };
  props_().deleteProperty(PK.YT_SCI);
  const a = ytVarSci_({ show: 'variety', ep: '82', key: 'variety:82' }, { ep: ep, items: [{ id: 'x' }] });
  ok('۲.۱ قسمتِ پیش از دروازه ⇒ رد از کد، بی پرسیدن از مدل', a.ok === false && a.by === 'کد' && calls === 0, JSON.stringify(a));
  const b = ytVarSci_({ show: 'variety', ep: '91', key: 'variety:91' }, { ep: ep, items: gated });
  ok('۲.۲ مدل «خیر» ⇒ رد', b.ok === false && b.by === 'مدل' && calls === 1);
  ans = { scientific: 'بله', why: 'زیست‌شناسیِ مغز' };
  const c = ytVarSci_({ show: 'variety', ep: '92', key: 'variety:92' }, { ep: ep, items: gated });
  ok('۲.۳ مدل «بله» ⇒ می‌گذرد', c.ok === true && calls === 2);
  ytVarSci_({ show: 'variety', ep: '92', key: 'variety:92' }, { ep: ep, items: gated });
  ok('۲.۴ داوری یک بار — دوباره پرسیده نمی‌شود', calls === 2);
  global.geminiText_ = () => { throw new Error('quota'); };
  const d = ytVarSci_({ show: 'variety', ep: '93', key: 'variety:93' }, { ep: ep, items: gated });
  ok('۲.۵ مدل نبود ⇒ منتظر، نه انتشار، و ثبت نمی‌شود', d.ok === false && d.wait === true && !ytSciMap_()['variety:93']);
  ok('۲.۶ درس‌نامه از این در نمی‌گذرد', ytVarSci_({ show: 'special', ep: '90', key: 'special:90' }, {}).ok === true);
  global.geminiText_ = keep;
  props_().deleteProperty(PK.YT_SCI);
}

console.log('\n=== ۳) سیم‌کشی ===');
{
  const s = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const i = s.indexOf('var sci = ytVarSci_(item, meta);'), j = s.indexOf('var meta = ytEpisodeMeta_(folder);');
  ok('۳.۱ داوری درست پس از خواندنِ پروندهٔ قسمت و پیش از ساختنِ آپلود', i > j && j > 0 && i - j < 400 && s.indexOf('yt.Videos.insert(', i) > i);
  ok('۳.۲ رد ⇒ از صف بیرون و در «کنارگذاشته» با دلیل', /pkS\.push\(Object\.assign\(\{\}, item, \{ why: 'غیرعلمی \('/.test(s));
  ok('۳.۳ روشن است', CFG.YT_SCI_GATE === true && typeof PK.YT_SCI === 'string');
}

console.log('\n=== ۴) رانر: صدای کلیپ در فایلِ نهایی ===');
{
  const R = require('../tools/render.js');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-'));
  cp.execFileSync('python3', ['-c', `
import numpy as np, wave, sys
sr=48000; x=np.zeros(sr*20); x[sr*5:sr*9]=0.3*np.sin(2*np.pi*220*np.arange(sr*4)/sr)
w=wave.open(sys.argv[1],'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x*32767).astype('<i2').tobytes()); w.close()`, d + '/a.wav']);
  cp.execFileSync(R.ffmpegExe(), ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=black:s=64x36:d=20', '-i', d + '/a.wav', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', d + '/v.mp4']);
  const one = R.clipSoundOf(d + '/v.mp4', { stat: { asked: 1, made: 1 }, inserts: [{ at: 5, d: 4 }] }, { clips: 2 });
  ok('۴.۱ لحظه‌ای که صدا دارد شنیده می‌شود', one.heard === 1 && one.quiet.length === 0, JSON.stringify(one));
  const two = R.clipSoundOf(d + '/v.mp4', { stat: { asked: 2, made: 2 }, inserts: [{ at: 5, d: 4 }, { at: 9, d: 4 }] }, { clips: 2 });
  ok('۴.۲ لحظهٔ بی‌صدا در فایل (پس از جابه‌جاییِ لحظهٔ اول) گرفته می‌شود', two.heard === 1 && two.quiet.length === 1 && two.quiet[0].at === 13, JSON.stringify(two));
  const none = R.clipSoundOf(d + '/v.mp4', { stat: { asked: 3, made: 0, why: ['73s: موسیقی در صدای کلیپ'] }, inserts: [] }, { clips: 10 });
  ok('۴.۳ کلیپ هست و لحظه‌ای نماند ⇒ علت گفته می‌شود', /موسیقی/.test(none.why) && none.made === 0);
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۴.۴ لحظهٔ ساخته‌ای که در فایل شنیده نشد سنجش را رد می‌کند', /qa\.clipSound\.made > 0 && qa\.clipSound\.heard < qa\.clipSound\.made\) \{\s*qa\.ok = false/.test(rj));
}

console.log('\n=== ۵) ۸۲ ===');
{
  const rt = JSON.parse(fs.readFileSync('docs/yt-retire.json', 'utf8')).items['variety:82'] || {};
  ok('۵.۱ ۸۲ِ تازه در فهرستِ کنارگذاشته (خصوصی، پاک نه)', (rt.dup || []).indexOf('AsEl3Jzlgk0') !== -1 && /طنز/.test(rt.why));
  ok('۵.۲ و دیگر در فهرستِ جایگزینی نیست', !JSON.parse(fs.readFileSync('docs/yt-replace.json', 'utf8')).items['variety:82']);
}

summary('۱۵.۱');
