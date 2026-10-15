/* رنگِ ضبط‌های خودِ گوینده (۹.۰۵).
 *
 * صاحبِ برنامه دو مدلِ گلدوز را شنید: «قدیمی با اینکه بی‌کیفیت‌تره شبیه‌تره، چون حالتِ رادیویی‌تر شده» —
 * و سنجهٔ ما برعکس گفته بود (۰٫۸۵۱ در برابرِ ۰٫۷۶۶)، چون مرجعش یکی از ضبط‌های آموزشِ مدلِ تازه بود.
 * او «مدلِ تازه + رنگِ رادیویی» را برگزید: خروجی به شکلِ طیفِ ضبط‌های قدیمِ خودش برده می‌شود.
 */
require('./lib/root.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 220) : ''));
};
global.logLine_ = () => {};

console.log('=== ۱) رنگ روی صوتِ واقعی (ffmpeg) — مرجعِ «رادیویی» ===');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcol-'));
const ff = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y'].concat(a));
ff(['-f', 'lavfi', '-i', "anoisesrc=c=pink:d=30:r=40000,volume='0.6+0.4*sin(2*PI*3*t)':eval=frame", path.join(dir, 'out.wav')]);
ff(['-f', 'lavfi', '-i', "anoisesrc=c=pink:d=30:r=11025,volume='0.6+0.4*sin(2*PI*3*t)':eval=frame,highpass=f=250,lowpass=f=3500",
    '-c:a', 'libmp3lame', path.join(dir, 'ref.mp3')]);
const py = code => JSON.parse(execFileSync('python3', ['-c', 'import sys,json;sys.path.insert(0,"tools");import voicebridge as v\n' + code]).toString());
const r = py(`r=v.colourMatch(${JSON.stringify(path.join(dir, 'out.wav'))},[${JSON.stringify(path.join(dir, 'ref.mp3'))}],${JSON.stringify(path.join(dir, 'col.wav'))})
a=v.ltas(${JSON.stringify(path.join(dir, 'out.wav'))});b=v.ltas(${JSON.stringify(path.join(dir, 'col.wav'))})
i8=v.COLOUR_BANDS.index(8000);i1=v.COLOUR_BANDS.index(1000)
r['hiOut']=float(a[i8]-a[i1]);r['hiCol']=float(b[i8]-b[i1]);print(json.dumps(r))`);
ok('۱.۱ رنگ گرفت و طیف به مرجع نزدیک‌تر شد', r.ok === true && r.after < r.before, JSON.stringify(r));
ok('۱.۲ بالای پهنای باندِ ضبطِ قدیم خاموش شد (۸ کیلوهرتز دست‌کم ۱۵ دسی‌بل پایین‌تر)', r.hiCol < r.hiOut - 15,
   r.hiOut.toFixed(1) + ' ⇒ ' + r.hiCol.toFixed(1));
const bad = py(`print(json.dumps(v.colourMatch(${JSON.stringify(path.join(dir, 'out.wav'))},[${JSON.stringify(path.join(dir, 'nope.mp3'))}],${JSON.stringify(path.join(dir, 'x.wav'))})))`);
ok('۱.۳ مرجعِ خوانده‌نشده ⇒ «نشد»، نه «شد»', bad.ok === false && /مرجع/.test(bad.why), bad.why);

console.log('=== ۲) موتور: ردیفِ پل ضبط‌های قدیمِ او را با خودش می‌برد و پس می‌گیرد ===');
const shared = {}, off = {};
global.vintReadResult_ = () => ({ speakers: { 'spk-x': { fileIds: ['N1', 'N2'], prev: { fileIds: ['O1', 'O2', 'O3', 'O4'] } } } });
global.vbrModel_ = () => ({ ok: true, pth: 'P', index: 'I' });
global.personaPitch_ = () => ({ pitch: '0', src: 'ردیفِ خودش' });
global.vbrAudio_ = () => [{ id: 'A1', name: 'a — کامل.wav' }];
global.vbrMapCached_ = () => ({});
global.driveShareOn_ = id => { shared[id] = 1; return true; };
global.driveShareOff_ = id => { off[id] = 1; return true; };
let saved = null;
global.vbrRead_ = () => ({ items: [] });
global.vbrSave_ = d => { saved = d; return true; };
const a1 = vbrAsk_('آزمون', '1', 'F', 'spk-x', 't', { soul: 'روشن', colour: 'prev' });
const row = saved && saved.items[0];
ok('۲.۱ سه ضبط از آموزشِ **پیشین** (نه ضبط‌های مدلِ تازه)، با نشانی و اشتراک',
   a1.ok && row.colour && row.colour.from === 'prev' && row.colour.refs.map(x => x.id).join() === 'O1,O2,O3' &&
   /O1/.test(row.colour.refs[0].url) && shared.O1 && shared.O3 && !shared.N1, JSON.stringify(row && row.colour));
vbrUnshare_(row);
ok('۲.۲ اشتراکِ مرجع‌ها هم با صوتِ قسمت پس گرفته می‌شود', off.A1 && off.O1 && off.O2 && off.O3);
global.vintReadResult_ = () => ({ speakers: { 'spk-x': { fileIds: ['N1'] } } });
saved = null;
const a2 = vbrAsk_('آزمون', '2', 'F', 'spk-x', 't', { soul: 'روشن', colour: 'prev' });
ok('۲.۳ بی ضبطِ قدیم ⇒ ردیف ساخته نمی‌شود و علت گفته می‌شود', !a2.ok && /مرجع/.test(a2.why) && !saved, a2.why);
saved = null;
const a3 = vbrAsk_('آزمون', '3', 'F', 'spk-x', 't', { soul: 'روشن' });
ok('۲.۴ بی درخواستِ رنگ، ردیف همان است که بود', a3.ok && saved.items[0].colour === undefined);
ok('۲.۵ کپشن فاصلهٔ طیف را می‌گوید', /رنگِ ضبط‌های قدیمِ خودش: فاصلهٔ طیف 18\.8 ⇒ 16\.4/.test(
   vbrPitchLine_({ colourOut: { ok: true, from: 'prev', before: 18.76, after: 16.41 } })));

console.log('=== ۳) سیم‌کشی: بذر ⇒ انتخاب ⇒ ردیف ⇒ پل ===');
const seed = CFG.VOICE_SOUL_SEED.find(s => s.speaker === 'spk-1g0r95d');
ok('۳.۱ بذرِ گلدوز رنگِ «prev» دارد و برچسبش تازه است (۷٫۸۶)', seed && seed.colour === 'prev' && /رنگِ ضبط‌های قدیم/.test(seed.tag));
const vb = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
ok('۳.۲ انتخاب رنگ را می‌برد و نمونه آن را به ردیف می‌دهد',
   /seedColour\[sk\] = String\(se\.colour\)/.test(vb) && /colour: seedColour\[k\] \|\| ''/.test(vb) &&
   /if \(pick\.colour\) tagO\.colour = pick\.colour;/.test(vb) && /if \(hit\.colour\) it\.colourOut = hit\.colour;/.test(vb));
const bp = fs.readFileSync('tools/voicebridge.py', 'utf8');
ok('۳.۳ پل: رنگ پیش از بلندی، و رنگِ نگرفته ردیف را نمی‌بندد',
   bp.indexOf('colourMatch(best, cref') > 0 && bp.indexOf('colourMatch(best, cref') < bp.indexOf('loud = loudFix(best') &&
   /if not colour\.get\("ok"\):\n\s+say\("::error title=رنگ گرفته نشد::[^\n]*\n\s+return 1/.test(bp));
const vi = fs.readFileSync('src/33_VoiceIntake.gs', 'utf8');
ok('۳.۴ خبرِ پایانِ آموزش می‌گوید مرجعِ سنجه به نفعِ مدلِ تازه کج است', /به نفعِ ' \+\s*'مدلِ تازه کج است/.test(vi));

console.log('=== ۴) ردیفِ تازه رانر را همان لحظه راه می‌اندازد (۹.۰۸) ===');
const kicks = [];
global.ghKick_ = (wf, why) => { kicks.push(wf); return { ok: true }; };
global.vintReadResult_ = () => ({ speakers: { 'spk-x': { prev: { fileIds: ['O1'] } } } });
saved = null;
vbrAsk_('آزمون', '9', 'F', 'spk-x', 't', { soul: 'روشن', colour: 'prev' });
ok('۴.۱ voice-bridge.yml راه افتاد', kicks.indexOf('voice-bridge.yml') !== -1, kicks.join());

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
console.log('\n✅ همهٔ ' + pass + ' سنجهٔ رنگِ ضبط‌های خودِ گوینده گذشت.');
