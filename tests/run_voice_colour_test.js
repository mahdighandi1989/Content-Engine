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

console.log('=== ۵) شنیدنِ ورودی و خروجی، و تبدیلِ دوم (۹.۱۱، «آنجا» ⇐ aonja) ===');
{
  /* مدلِ شنیدنِ بدَل: ورودی «همسایه‌ها می‌گفتند آنجا» را درست می‌شنود، خروجی «آونجا» */
  const r = py(`
class W:
    def __init__(s,a,b,w): s.start,s.end,s.word=a,b,w
class S:
    def __init__(s,a,b,t,ws): s.start,s.end,s.text,s.words=a,b,t,ws
class M:
    def transcribe(s,path,**k):
        if path=='SRC': return ([S(1.0,3.0,'همسایه‌ها می‌گفتند آنجا',[W(1.0,1.8,'همسایه‌ها'),W(1.9,2.5,'می‌گفتند'),W(2.5,3.0,'آنجا')]),
                                 S(4.0,5.0,'زمان آهسته است',[W(4.0,4.4,'زمان'),W(4.4,4.7,'آهسته'),W(4.7,5.0,'است')])],None)
        if path=='OUT': return ([S(1.0,3.0,'',[W(1.0,1.8,'همسایه‌ها'),W(1.9,2.5,'می‌گفتند'),W(2.5,3.0,'آونجا')]),
                                 S(4.0,5.0,'',[W(4.0,4.4,'زموآن'),W(4.4,4.7,'آهسته'),W(4.7,5.0,'است')])],None)
        return ([S(1.0,3.0,'',[W(1.0,1.8,'همسایه‌ها'),W(1.9,2.5,'می‌گفتند'),W(2.5,3.0,'آنجا')]),
                 S(4.0,5.0,'',[W(4.0,4.4,'زمان'),W(4.4,4.7,'آهسته'),W(4.7,5.0,'است')])],None)
print(json.dumps(v.hearCompare('SRC','OUT','ALT',model=M()),ensure_ascii=False))`);
  ok('۵.۱ هم‌خوانیِ خروجی با ورودی کمتر از ۱۰۰٪ و تبدیلِ دوم ۱۰۰٪', r && r.srcOut < 0.97 && r.alt === 1 && r.n === 2, JSON.stringify(r).slice(0, 300));
  ok('۵.۲ بدترین جمله با متنِ ورودی و آنچه از خروجی شنیده شد گزارش می‌شود', r.worst[0].out.indexOf('آونجا') >= 0 || r.worst[0].out.indexOf('زموآن') >= 0,
     JSON.stringify(r.worst[0]));
  const seedG = CFG.VOICE_SOUL_SEED.find(s => s.speaker === 'spk-1g0r95d');
  ok('۵.۳ بذرِ گلدوز تبدیلِ دوم با protect ۰٫۱۵ می‌خواهد و برچسبش تازه است (۹.۲۳)', seedG.ab === 'p0.15' && /«ه» نه «خ»/.test(seedG.tag));
  saved = null;
  global.vintReadResult_ = () => ({ speakers: { 'spk-x': { prev: { fileIds: ['O1'] } } } });
  vbrAsk_('آزمون', '10', 'F', 'spk-x', 't', { soul: 'روشن', colour: 'prev', ab: '0.6' });
  ok('۵.۴ ردیفِ پل index_rateِ تبدیلِ دوم را دارد، و ردیفِ بی‌درخواست ندارد',
     saved.items[0].ab && saved.items[0].ab.indexRate === '0.6' && (vbrAsk_('آزمون', '11', 'F', 'spk-x', 't', { soul: 'روشن' }), saved.items[0].ab === undefined),
     JSON.stringify(saved.items[0].ab));
  const vb2 = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
  ok('۵.۵ انتخاب ⇒ ردیف ⇒ نتیجه سیم‌کشی شده', /seedAb\[sk\] = String\(se\.ab\)/.test(vb2) && /if \(pick\.ab\) tagO\.ab = pick\.ab;/.test(vb2) &&
     /if \(hit\.hear\) it\.hearOut = hit\.hear;/.test(vb2) && /if \(hit\.ab\) it\.abOut = hit\.ab;/.test(vb2));
  const line = vbrPitchLine_({ hearOut: { srcOut: 0.81, alt: 0.9, worst: [{ src: 'آنجا', out: 'آونجا' }] }, abOut: { indexRate: '0.6', url: 'https://x/ab.wav' } });
  ok('۵.۶ کپشن هر دو عدد و نشانیِ تبدیلِ دوم را می‌گوید', /81٪/.test(line) && /90٪/.test(line) && /https:\/\/x\/ab\.wav/.test(line), line);
  const bp2 = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۵.۷ پل: شنیدن فقط برای نمونه، و تبدیلِ دوم شکستش ردیف را نمی‌اندازد',
     /if str\(key\)\.startswith\("نمونه"\):/.test(bp2) && /::warning title=تبدیلِ دوم نشد::/.test(bp2) &&
     /"faster-whisper/.test(fs.readFileSync('.github/workflows/voice-bridge.yml', 'utf8')));
}

console.log('=== ۶) «ه» ⇐ «خ»: شمارِ «خ»ِ افزوده و تبدیلِ دوم با protect (۹.۲۳) ===');
{
  /* داده عینِ نمونهٔ ساعت‌ساز (۱۵ اکتبر): ورودی «همسایه‌ها هم با خنده»، خروجی «خمسایه‌ها خم با خنده». */
  const r = py(`
class W:
    def __init__(s,a,b,w): s.start,s.end,s.word=a,b,w
class S:
    def __init__(s,a,b,t,ws): s.start,s.end,s.text,s.words=a,b,t,ws
class M:
    def transcribe(s,path,**k):
        if path=='SRC': return ([S(1.0,3.0,'همسایه‌ها هم با خنده',[W(1.0,1.8,'همسایه‌ها'),W(1.9,2.2,'هم'),W(2.2,2.5,'با'),W(2.5,3.0,'خنده')]),
                                 S(4.0,5.0,'هیچ وقت',[W(4.0,4.4,'هیچ'),W(4.4,5.0,'وقت')])],None)
        if path=='OUT': return ([S(1.0,3.0,'',[W(1.0,1.8,'خمسایه‌ها'),W(1.9,2.2,'خم'),W(2.2,2.5,'با'),W(2.5,3.0,'خنده')]),
                                 S(4.0,5.0,'',[W(4.0,4.4,'خیچ'),W(4.4,5.0,'وقت')])],None)
        return ([S(1.0,3.0,'',[W(1.0,1.8,'همسایه‌ها'),W(1.9,2.2,'هم'),W(2.2,2.5,'با'),W(2.5,3.0,'خنده')]),
                 S(4.0,5.0,'',[W(4.0,4.4,'هیچ'),W(4.4,5.0,'وقت')])],None)
print(json.dumps(v.hearCompare('SRC','OUT','ALT',model=M()),ensure_ascii=False))`);
  ok('۶.۱ «خ»ِ افزوده شمرده می‌شود — «خ»ِ خودِ «خنده» نه', r && r.khOut === 3 && r.khAlt === 0 && r.khSrc === 1, JSON.stringify({ khOut: r && r.khOut, khAlt: r && r.khAlt, khSrc: r && r.khSrc }));
  saved = null;
  global.vintReadResult_ = () => ({ speakers: { 'spk-x': { prev: { fileIds: ['O1'] } } } });
  vbrAsk_('آزمون', '12', 'F', 'spk-x', 't', { soul: 'روشن', ab: 'p0.15' });
  ok('۶.۲ «p0.15» ⇒ تبدیلِ دوم با protect، نه index_rate', saved.items[0].ab && saved.items[0].ab.protect === '0.15' && !saved.items[0].ab.indexRate,
     JSON.stringify(saved.items[0].ab));
  const line = vbrPitchLine_({ hearOut: { srcOut: 0.84, alt: 0.9, khOut: 23, khAlt: 2, worst: [] }, abOut: { protect: '0.15', url: 'https://x/ab.wav' } });
  ok('۶.۳ کپشن شمارِ «خ»ِ افزوده را برای هر دو و protectِ تبدیلِ دوم را می‌گوید', /: 23، تبدیلِ دوم 2/.test(line) && /protect/.test(line) && /https:\/\/x\/ab\.wav/.test(line), line);
  const bp = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۶.۴ پل protectِ تبدیلِ دوم را به جای خودش می‌گذارد', /a2\[a2\.index\("--rvc-protect"\) \+ 1\] = abProt/.test(bp) &&
     /rec\["ab"\] = \{"indexRate": abRate, "protect": abProt, "url": u\}/.test(bp));
}

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
console.log('\n✅ همهٔ ' + pass + ' سنجهٔ رنگِ ضبط‌های خودِ گوینده گذشت.');
