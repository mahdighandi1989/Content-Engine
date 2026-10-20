/* موسیقی → گفتار: تلفیق روی خودِ صدا، نه روی سکوتِ آغازِ گفتار (۹.۰۱).
 *
 * نمونهٔ چهارمِ قسمتِ ۷۲ (variety:72-4)، سنجیده روی صوتِ خودِ ویدئو: سرِ ۵۷ ثانیه موسیقی در نیم‌ثانیه از ‎−۲۷ به
 * ‎−۷۶ دسی‌بل افتاد، نیم‌ثانیه سکوت، بعد گوینده. صاحبِ برنامه: «موسیقی فید نمی‌شود … و یهو قطع می‌شود».
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 200) : ''));
};
const SR = CFG.SAMPLE_RATE || 24000;
const pcm = (silSec, toneSec) => {
  const n0 = Math.round(silSec * SR), n1 = Math.round(toneSec * SR), b = [];
  for (let i = 0; i < n0 + n1; i++) {
    let v = i < n0 ? (i % 7) - 3 : Math.round(8000 * Math.sin(2 * Math.PI * 220 * i / SR));
    if (v < 0) v += 65536;
    const lo = v & 255, hi = (v >>> 8) & 255;
    b.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi);
  }
  while (b.length % 6) b.push(0);
  return Utilities.base64Encode(b);
};
const secOf = b64 => Utilities.base64Decode(b64).length / 2 / SR;

console.log('=== ۱) سکوتِ آغاز برداشته می‌شود، صدا نه ===');
const a = pcm(1.0, 0.5);
const t = pcmLeadTrim_(a, 0.12);
ok('۱.۱ یک ثانیه سکوت ⇒ ۰٫۱۲ ثانیه ماند', Math.abs(secOf(t) - 0.62) < 0.01, secOf(a).toFixed(3) + ' → ' + secOf(t).toFixed(3));
ok('۱.۲ برش روی مرزِ گروهِ base64 (صوت خراب نمی‌شود)', a.endsWith(t) && (a.length - t.length) % 8 === 0);
ok('۱.۳ تکهٔ بی سکوت دست نمی‌خورد', pcmLeadTrim_(pcm(0, 0.5), 0.12) === pcm(0, 0.5));
ok('۱.۴ سه ثانیهٔ اول همه سکوت ⇒ دست نمی‌خورد (حرفِ دیر بهتر از حرفِ بریده)', pcmLeadTrim_(pcm(3.2, 0.3), 0.12) === pcm(3.2, 0.3));

console.log('=== ۲) سیم‌کشی: فقط موسیقی → گفتار، پیش از تلفیق ===');
const p = fs.readFileSync('src/03_Producer.gs', 'utf8');
const i1 = p.indexOf('b64 = pcmLeadTrim_(b64, Number(CFG.MUSIC_SPEECH_LEAD_SEC) || 0.12)');
const i2 = p.indexOf('var mix = pcmXfade_(buf[buf.length - 1], b64, xs, !curMusic, xm);');
ok('۲.۱ برش پیش از pcmXfade_ و فقط وقتی قبلی موسیقی و این گفتار است',
   i1 > 0 && i2 > i1 && /if \(!curMusic && prevMusic === true && CFG\.MUSIC_XFADE !== false\) \{\s*try \{ b64 = pcmLeadTrim_/.test(p));

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ آغازِ گفتار پس از موسیقی گذشت.');

console.log('=== ۳) مرزِ دو اجرا کنارِ موسیقی: تلفیق از روی بخشِ پیشین (۹.۴۰) ===');
{
  /* «موسیقی داره پخش میشه یهو همه‌چیز قطع میشه و گوینده حرف میزنه.» درس‌نامهٔ ۷۴: «بخش ۱» فقط موسیقیِ آغاز (۱۸ ثانیه)
     بود و دو ثانیهٔ اولِ گفتار سکوتِ دیجیتال داشت — چون هر اجرا `buf` را از نو شروع می‌کرد. این‌جا همان دو اجرا ساخته
     می‌شوند: اجرای اول فقط موسیقی (مهلت تمام)، اجرای دوم گفتار. */
  const mono = (n, f) => { const b = []; for (let i = 0; i < n; i++) { let v = f(i); if (v < 0) v += 65536;
    const lo = v & 255, hi = (v >>> 8) & 255; b.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi); }
    while (b.length % 6) b.push(0); return Utilities.base64Encode(b); };
  const music = mono(SR * 8, () => 6000);                                         // موسیقیِ ثابت: میانگینِ مثبت
  const speech = mono(SR * 6, (i) => Math.round(6000 * Math.sin(2 * Math.PI * 220 * i / SR)));   // میانگینِ صفر
  const realTts = global.ttsChunk_, realCue = global.ttsCueWanted_;
  global.ttsChunk_ = () => speech; global.ttsCueWanted_ = () => false;
  const chunks = [{ pcm: music, xfade: 3 }, { text: 'گفتار' }];
  const run = (useCarry) => {
    const folder = DriveApp.getFolderById('nope').createFolder('ep-' + (useCarry ? 'c' : 'n'));
    const r1 = synthesizeStep_(chunks, 'ت', folder, 0, 1, Date.now() - 1, null, 0);
    const st = { chunkIdx: r1.chunkIdx, files: r1.files.slice(), partNo: r1.partNo };
    const carry = useCarry ? synthCarry_(st, chunks) : null;
    const base = carry ? st.files.slice(0, -1) : st.files.slice();
    const r2 = synthesizeStep_(chunks, 'ت', folder, st.chunkIdx, st.partNo, Date.now() + 600000, null, r1.secs, carry);
    const all = base.concat(r2.files);
    const live = folder.getFiles(); const ids = []; while (live.hasNext()) { const f = live.next(); if (!f._trashed) ids.push(f.getId()); }
    return { r1, carry, all, ids };
  };
  const meanAt = (fileRec, fromSec, lenSec) => {
    const b = DriveApp.getFileById(fileRec.id).getBlob().getBytes().slice(54);
    let s = 0, n = 0;
    for (let k = Math.floor(fromSec * SR); k < Math.floor((fromSec + lenSec) * SR); k++) { s += rd16_(b, k * 2); n++; }
    return s / n;
  };
  const c = run(true);
  ok('۳.۱ اجرای اول فقط موسیقی نوشت و کنارِ موسیقی ایستاد — همان «بخش ۱»ِ ۱۸ ثانیه‌ای',
     c.r1.files.length === 1 && c.r1.chunkIdx === 1);
  ok('۳.۲ synthCarry_ مرزِ موسیقی→گفتار را می‌گیرد و بخشِ پیشین را بی سرِ wav برمی‌گرداند',
     !!c.carry && c.carry.prevMusic === true && c.carry.b64 === alignB64_(music) && c.carry.prevXf === 3);
  ok('۳.۳ فایلِ پیشین به سطل رفت و جانشینش تنها بخشِ زنده است — نه دو نسخه از یک موسیقی',
     c.all.length === 1 && c.ids.length === 1 && c.ids[0] === c.all[0].id, JSON.stringify(c.ids));
  const mid = meanAt(c.all[0], 8 - 1.5, 0.5);                 // وسطِ ناحیهٔ هم‌پوشانی (۳ ثانیهٔ آخرِ موسیقی)
  ok('۳.۴ موسیقی زیرِ نخستین ثانیه‌های گفتار هست — بستر، نه سکوت',
     mid > 0.15 * 6000 && mid < 0.7 * 6000, mid.toFixed(0));
  const n = run(false);
  const midN = meanAt(n.all[1], 0.5, 0.5);                    // بی ادامه: گفتار تنها
  ok('۳.۵ و بی آن (همان رفتارِ تا ۹.۳۹) زیرِ گفتار هیچ موسیقی‌ای نیست — همین بود که شنیده شد',
     Math.abs(midN) < 200 && n.all.length === 2, midN.toFixed(0));
  ok('۳.۶ مرزِ دو گفتار ادامه نمی‌خواهد — فقط مرزِ کنارِ موسیقی خوانده می‌شود',
     synthCarry_({ chunkIdx: 1, files: [{ id: 'x' }] }, [{ text: 'a' }, { text: 'b' }]) === null);
  ok('۳.۷ هر دو برنامه ادامه را به synthesizeStep_ می‌دهند',
     /synthCarry_\(st, chunks\)[\s\S]{0,400}synthesizeStep_\([\s\S]{0,200}, carry\)/.test(fs.readFileSync('src/03_Producer.gs', 'utf8')) &&
     /synthCarry_\(st, chunks\)[\s\S]{0,400}synthesizeStep_\([\s\S]{0,200}, carry\)/.test(fs.readFileSync('src/14_Special.gs', 'utf8')));
  global.ttsChunk_ = realTts; global.ttsCueWanted_ = realCue;
}

console.log('=== ۴) شکلِ گذرها: گوینده کامل، موسیقی زیرِ حرف (۹.۴۰) ===');
{
  const flat = (n, v) => { const b = []; for (let i = 0; i < n; i++) { let x = v; if (x < 0) x += 65536;
    const lo = x & 255, hi = (x >>> 8) & 255; b.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi); }
    return Utilities.base64Encode(b); };
  const one = flat(SR * 10, 10000), zero = flat(SR * 10, 0);
  const tailOf = (m, sec) => { const b = Utilities.base64Decode(m[0]); const out = [];
    for (let k = b.length / 2 - Math.floor(sec * SR); k < b.length / 2; k++) out.push(rd16_(b, k * 2) / 10000); return out; };
  const xs = Number(CFG.MUSIC_XFADE_EDGE_SEC);
  const gM = tailOf(pcmXfade_(one, zero, xs, true), xs);    // موسیقی → گفتار: شیبِ موسیقی
  ok('۴.۱ موسیقی در نیمهٔ گذر هنوز زیرِ حرف است (نه نصف‌شده در یک ثانیه و مُرده)',
     gM[Math.floor(SR * xs * 0.5)] > 0.15, gM[Math.floor(SR * xs * 0.5)].toFixed(2));
  const gS = tailOf(pcmXfade_(one, zero, 3.5, false, 'bed'), 3.5);   // گفتار → پلِ بستر: شیبِ گفتار
  ok('۴.۲ گفتار → پل: واژهٔ آخر محو نمی‌شود (تا ۸۰ میلی‌ثانیهٔ پایانی کامل)',
     gS[SR * 3.5 - Math.floor(SR * 0.1)] > 0.99, gS[SR * 3.5 - Math.floor(SR * 0.1)].toFixed(2));
  const s = new Array(SR * 12).fill(10000);
  musicBedIn_(s, 3.5, Number(CFG.MUSIC_BED_RISE_SEC), Number(CFG.MUSIC_OUTRO_BED));
  ok('۴.۳ سرِ پل: از سکوت تا بستر زیرِ حرف، بعد تا بلندیِ کامل',
     s[0] === 0 && Math.abs(s[Math.floor(SR * 3.5)] / 10000 - Number(CFG.MUSIC_OUTRO_BED)) < 0.02 &&
     s[Math.floor(SR * (3.5 + Number(CFG.MUSIC_BED_RISE_SEC)))] === 10000);
}
console.log('\n' + pass + ' passed');

console.log('=== ۵) «اگر طولانی هم بود … زیرِ صحبتِ گوینده با صدای کم پخش بشه» (۹.۸۴) ===');
{
  const mono = (n, f) => { const b = []; for (let i = 0; i < n; i++) { let v = f(i); if (v < 0) v += 65536;
    const lo = v & 255, hi = (v >>> 8) & 255; b.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi); }
    while (b.length % 6) b.push(0); return Utilities.base64Encode(b); };
  /* بازهٔ ۴۰ ثانیه‌ایِ او برای آغاز (جای معمول ۱۸) ⇒ ۲۲ ثانیه زیرِ گفتار */
  const tr = { id: 'T', name: 't', range: { from: 0, to: 40 } };
  const uo = musicUnderOut_(tr, 18);
  ok('۵.۱ بازهٔ بلند ⇒ خروجِ «زیرِ گفتار» به اندازهٔ زیادی‌اش؛ بی بازه یا کوتاه ⇒ همان رفتارِ قبل',
     uo.xmodeOut === 'under' && Math.abs(uo.xfadeOut - 22) < 0.01 && !musicUnderOut_({ id: 'x' }, 18).xmodeOut && !musicUnderOut_({ range: { from: 0, to: 18.5 } }, 18).xmodeOut, JSON.stringify(uo));
  const music = mono(SR * 40, () => 6000);
  const speech = mono(SR * 30, (i) => Math.round(6000 * Math.sin(2 * Math.PI * 220 * i / SR)));
  const realTts = global.ttsChunk_, realCue = global.ttsCueWanted_;
  global.ttsChunk_ = () => speech; global.ttsCueWanted_ = () => false;
  const folder = DriveApp.getFolderById('nope').createFolder('under');
  const chunks = [Object.assign({ pcm: music, xfade: 3 }, uo), { text: 'گفتار' }];
  const r = synthesizeStep_(chunks, 'ز', folder, 0, 1, Date.now() + 600000, null, 0);
  global.ttsChunk_ = realTts; global.ttsCueWanted_ = realCue;
  const b = DriveApp.getFileById(r.files[r.files.length - 1].id).getBlob().getBytes().slice(54);
  const meanAt = (fromSec, lenSec) => { let s = 0, n = 0; for (let k = Math.floor(fromSec * SR); k < Math.floor((fromSec + lenSec) * SR); k++) { s += rd16_(b, k * 2); n++; } return s / n; };
  const total = b.length / 2 / SR;
  /* گفتار از ثانیهٔ ۱۸ شروع می‌شود (۴۰ − ۲۲)؛ موسیقیِ ثابت میانگینِ مثبت دارد، گفتار میانگینِ صفر */
  const alone = meanAt(10, 1), under = meanAt(18 + 10, 1), after = meanAt(18 + 25, 1);
  ok('۵.۲ پیش از گفتار موسیقی کامل', Math.abs(alone - 6000) < 300, alone.toFixed(0));
  ok('۵.۳ ده ثانیه پس از آغازِ گفتار، موسیقی هنوز زیرِ حرف هست — کم‌صدا (بستر)', under > 0.15 * 6000 && under < 0.3 * 6000, under.toFixed(0));
  ok('۵.۴ و پس از پایانِ بازه رفته است؛ کلِ فایل = ۴۰ + ۳۰ − ۲۲ ثانیه (هم‌پوشانی، نه دنباله)', Math.abs(after) < 200 && Math.abs(total - 48) < 0.6, after.toFixed(0) + ' / ' + total.toFixed(2));
  ok('۵.۵ هر دو جای موسیقی (آغاز و پل) خروجِ «زیرِ گفتار» را می‌گیرند', (fs.readFileSync('src/23_Music.gs', 'utf8').match(/musicUnderOut_\((intro|w\.track),/g) || []).length === 2);
}
