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
  ok('۵.۳ بذرِ گلدوز همان تبدیل را بی رنگ هم می‌خواهد و برچسبش تازه است (۹.۲۴)', seedG.ab === 'nc' && /«ه» با و بی رنگ/.test(seedG.tag));
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
  saved = null;
  vbrAsk_('آزمون', '13', 'F', 'spk-x', 't', { soul: 'روشن', ab: 'nc' });
  ok('۶.۲-ب «nc» ⇒ نسخهٔ دوم همان تبدیل بی رنگ (۹.۲۴)', saved.items[0].ab && saved.items[0].ab.nocolour === true, JSON.stringify(saved.items[0].ab));
  ok('۶.۳-پ کپشنِ نسخهٔ «همخوانِ بی‌واک از ورودی» (۹.۵۳)', /همخوانِ بی‌واک از ورودی/.test(vbrPitchLine_({ abOut: { uv: true, url: 'https://x/uv.wav' } })));
  ok('۶.۳-ب کپشنِ نسخهٔ بی‌رنگ', /همان تبدیل، بی رنگ/.test(vbrPitchLine_({ abOut: { nocolour: true, url: 'https://x/nc.wav' } })));
  const bp = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۶.۴ پل protectِ تبدیلِ دوم را به جای خودش می‌گذارد', /a2\[a2\.index\("--rvc-protect"\) \+ 1\] = abProt/.test(bp) &&
     /rec\["ab"\] = \{"indexRate": abRate, "protect": abProt, "nocolour": bool\(abIt\.get\("nocolour"\)\), "url": u\}/.test(bp) &&
     /preColour = best/.test(bp) && /if abIt\.get\("nocolour"\) and preColour != best:/.test(bp));
}

console.log('=== ۹) موسیقی از تبدیل نمی‌گذرد، و هر صدا گامِ خودش را دارد (۹.۳۶) ===');
{
  /* ۱۷ اکتبر: «صدای گلدوز افتضاح … آهنگِ شروعِ اون قسمت هم داغون». قسمتِ ساختگی، همان شکلِ «از همه جا»:
     ۰–۴ موسیقی، ۴–۱۰ صدای زن (۲۱۰ هرتز)، ۱۰–۱۶ صدای مرد (۱۲۰)، ۱۶–۲۰ پلِ موسیقی، ۲۰–۲۶ باز صدای زن. */
  const d9 = fs.mkdtempSync(path.join(os.tmpdir(), 'vgrp-'));
  const res = py(`import numpy as np,os
os.makedirs("vb",exist_ok=True)
sr=16000
def tone(f,sec,amp=0.3):
    t=np.arange(int(sec*sr))/sr
    return (amp*(np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*2*f*t)+0.25*np.sin(2*np.pi*3*f*t))/1.75).astype(np.float32)
mus=lambda sec:(0.2*np.sin(2*np.pi*440*np.arange(int(sec*sr))/sr)*np.sin(2*np.pi*0.5*np.arange(int(sec*sr))/sr)).astype(np.float32)
x=np.concatenate([mus(4),tone(210,6),tone(120,6),mus(4),tone(210,6)])
src=${JSON.stringify(path.join(d9, 'src.wav'))}
v.writeMono(src,x,sr)
segs=[[0,4,"m"],[4,7,"t"],[7,10,"t"],[10,13,"t"],[13,16,"t"],[16,20,"m"],[20,23,"t"],[23,26,"t"]]
g=v.voiceGroups(segs,x,sr,158.0)
one=v.voiceGroups([[4,7,"t"],[7,10,"t"]],x,sr,158.0)
# «تبدیل»ِ ساختگیِ هر گروه: صدای دیگر و بلندیِ دیگر، تا معلوم شود هر تکه از کجا آمده
o0=${JSON.stringify(path.join(d9, 'g0.wav'))};o1=${JSON.stringify(path.join(d9, 'g1.wav'))}
n=len(x);t=np.arange(n)/sr
v.writeMono(o0,(0.9*np.sin(2*np.pi*158*t)).astype(np.float32),sr)
v.writeMono(o1,(0.9*np.sin(2*np.pi*159*t)).astype(np.float32),sr)
dst=${JSON.stringify(path.join(d9, 'mix.wav'))}
m=v.assemble(src,[o0,o1],g["speech"],g["assign"],dst)
y,_=v.readMono(dst)
def corr(a,b):
    a=a-a.mean();b=b-b.mean();return float((a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum()+1e-12))
w=lambda a,b:slice(int(a*sr),int(b*sr))
c0,_=v.readMono(o0);c1,_=v.readMono(o1)
rms=lambda z:float(np.sqrt((z*z).mean()))
print(json.dumps({"g":g["groups"],"assign":g["assign"],"one":len(one["groups"]),"mix":m,
 "musA":corr(y[w(0.5,3.5)],x[w(0.5,3.5)]),"musB":corr(y[w(16.5,19.5)],x[w(16.5,19.5)]),
 "fem":corr(y[w(4.5,9.5)],c0[w(4.5,9.5)]),"male":corr(y[w(10.5,15.5)],c1[w(10.5,15.5)]),
 "fem2":corr(y[w(20.5,25.5)],c0[w(20.5,25.5)]),
 "lvl":rms(y[w(4.5,9.5)])/rms(x[w(4.5,9.5)])}))`);
  const g = res.g;
  ok('۹.۱ دو گروهِ صدا از گفتارِ تنها (موسیقی سنجیده نمی‌شود): زن ~۲۱۰ ⇒ گام منفی، مرد ~۱۲۰ ⇒ گام مثبت؛ بزرگ‌تر اول',
     g.length === 2 && Math.abs(g[0].hz - 210) < 12 && Math.abs(g[1].hz - 120) < 8 && g[0].pitch <= -4 && g[1].pitch >= 4 &&
     g[0].secs === 12 && g[1].secs === 6 && res.assign.join(',') === '0,0,1,1,0,0', JSON.stringify(res.g) + ' ' + res.assign);
  ok('۹.۲ یک صدا ⇒ یک گروه (دو تبدیل برای هیچ نیست)', res.one === 1);
  ok('۹.۳ موسیقیِ آغاز و پل از خودِ ورودی، دست‌نخورده', res.musA > 0.99 && res.musB > 0.99, res.musA.toFixed(3) + ' / ' + res.musB.toFixed(3));
  ok('۹.۴ هر تکهٔ گفتار از تبدیلِ گروهِ خودش — زن از گروهِ ۱، مرد از گروهِ ۲، و زنِ پس از پل باز از گروهِ ۱',
     res.fem > 0.99 && res.male > 0.99 && res.fem2 > 0.99, [res.fem, res.male, res.fem2].map(x => x.toFixed(3)).join(' / '));
  ok('۹.۵ بلندیِ گفتار همان بلندیِ ورودی (نسبتِ گفتار و موسیقی عوض نمی‌شود)', Math.abs(res.lvl - 1) < 0.05, res.lvl.toFixed(3));
  ok('۹.۶ چیدن ثبت می‌شود: چند ثانیه از تبدیل، چند ثانیه از ورودی', Math.abs(res.mix.speechSec - 18) < 0.5 && Math.abs(res.mix.keptSec - 8) < 0.5,
     JSON.stringify(res.mix));
  const bp9 = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۹.۷ runOne: با نقشه ⇒ گروه‌ها، یک تبدیل برای هر گروه با گامِ خودش، چیدن؛ چیدنِ نشده ردیف را نمی‌بندد',
     /vg = voiceGroups\(segs, xs, srS, float\(tgt\)\)/.test(bp9) && /a3\[a3\.index\("--rvc-pitch"\) \+ 1\] = str\(g\["pitch"\]\)/.test(bp9) &&
     /mix = assemble\("vb\/src\.wav", gOuts/.test(bp9) && /چیدنِ گفتار و موسیقی نشد[^\n]*\n\s*return 1/.test(bp9));
  try { fs.rmSync(d9, { recursive: true, force: true }); } catch (e) {}
}

console.log('=== ۱۰) تبدیلی که جلوتر از ورودی است، پیش از چیدن هم‌تراز می‌شود (۹.۴۴) ===');
{
  /* ۱۷ اکتبر: «حالم به هم خورد … مثلِ وقتی نوار جمع می‌کنه». گفتارِ تبدیل‌شدهٔ قسمتِ ۷۵ ۰٫۸۵ ثانیه جلوتر از ورودی بود و
     هر تکه با ثانیه‌های ورودی بریده می‌شد. سنجهٔ ۹ تبدیلِ ساختگی را **هم‌تراز** می‌ساخت — همان شکلِ راحت، نه شکلِ واقعی. */
  const d10 = fs.mkdtempSync(path.join(os.tmpdir(), 'valign-'));
  const res = py(`import numpy as np,os
os.makedirs("vb",exist_ok=True)
sr=16000
rng=np.random.default_rng(7)
def speechish(sec,f):
    n=int(sec*sr);t=np.arange(n)/sr
    env=np.zeros(n,dtype=np.float32);i=0
    while i<n:                                  # هجاهایی با طول و مکثِ ناهمسان، مثلِ گفتار
        L=int(sr*rng.uniform(0.08,0.3));G=int(sr*rng.uniform(0.03,0.25))
        env[i:i+L]=np.hanning(max(2,min(L,n-i)))[:max(0,min(L,n-i))];i+=L+G
    return (0.4*env*np.sin(2*np.pi*f*t)).astype(np.float32)
mus=lambda sec:(0.15*np.sin(2*np.pi*440*np.arange(int(sec*sr))/sr)).astype(np.float32)
x=np.concatenate([mus(4),speechish(12,200),mus(4),speechish(10,200)])
src=${JSON.stringify(path.join(d10, 'src.wav'))};v.writeMono(src,x,sr)
segs=[[0,4,"m"],[4,10,"t"],[10,16,"t"],[16,20,"m"],[20,30,"t"]]
sp=[(4.0,10.0),(10.0,16.0),(20.0,30.0)]
SH=0.85                                          # همان عددِ واقعی
conv=np.concatenate([x[int(SH*sr):],np.zeros(int(SH*sr),dtype=np.float32)])*1.3   # «تبدیل»: همان گفتار، ۰٫۸۵ ثانیه جلوتر
cp=${JSON.stringify(path.join(d10, 'c.wav'))};v.writeMono(cp,conv,sr)
dst=${JSON.stringify(path.join(d10, 'mix.wav'))}
m=v.assemble(src,[cp],sp,[0,0,0],dst)
y,_=v.readMono(dst)
w=lambda a,b:slice(int(a*sr),int(b*sr))
def corr(a,b):
    a=a-a.mean();b=b-b.mean();return float((a*b).sum()/np.sqrt((a*a).sum()*(b*b).sum()+1e-12))
bad=np.random.default_rng(1).standard_normal(len(x)).astype(np.float32)*0.2
bp=${JSON.stringify(path.join(d10, 'bad.wav'))};v.writeMono(bp,bad,sr)
err=""
try: v.assemble(src,[bp],sp,[0,0,0],${JSON.stringify(path.join(d10, 'bad-mix.wav'))})
except Exception as e: err=str(e)
print(json.dumps({"m":m,"sp1":corr(y[w(4.5,15.5)],x[w(4.5,15.5)]),"sp2":corr(y[w(20.5,29.5)],x[w(20.5,29.5)]),
 "mus":corr(y[w(16.2,19.8)],x[w(16.2,19.8)]),"err":err}))`);
  ok('۱۰.۱ جابه‌جاییِ ۰٫۸۵ ثانیه‌ای پیدا می‌شود', Math.abs(res.m.lagSec[0] + 0.85) <= 0.02 && res.m.lagCorr[0] > 0.9, JSON.stringify(res.m));
  ok('۱۰.۲ و گفتارِ چیده‌شده همان گفتارِ ورودی در همان ثانیه است — نه واژه‌های تکهٔ بعد',
     res.sp1 > 0.98 && res.sp2 > 0.98 && res.m.alignCorr > 0.95, res.sp1.toFixed(3) + ' / ' + res.sp2.toFixed(3));
  ok('۱۰.۳ موسیقیِ میانه دست‌نخورده', res.mus > 0.99, res.mus.toFixed(3));
  ok('۱۰.۴ تبدیلی که با ورودی نمی‌خواند تحویل نمی‌شود (پرتاب ⇒ ردیف بسته نمی‌شود)', /نمی‌خواند/.test(res.err), res.err.slice(0, 120));
  try { fs.rmSync(d10, { recursive: true, force: true }); } catch (e) {}
}

console.log('=== ۱۱) «ه» ⇐ «خ»: همخوانِ بی‌واک از ورودی (۹.۵۳) ===');
{
  /* ورودی: واکهٔ ۱۵۰ هرتزی + نفسِ نویزی در ۰٫۸ تا ۱٫۰؛ خروجیِ «تبدیل‌شده»: واکهٔ ۱۱۰ هرتزی + نویزی دیگر جای همان نفس.
     نرخِ ورودی ۲۴ کیلوهرتز و خروجی ۱۶ — مثلِ جمینای و RVC. */
  const d11 = fs.mkdtempSync(path.join(os.tmpdir(), 'vuv-'));
  const res = py(`import numpy as np, wave
d=${JSON.stringify(d11)}; sr=16000; rng=np.random.default_rng(1)
def w(p,x,r):
  o=wave.open(p,'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(r); o.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes()); o.close()
t=np.arange(sr*2)/sr
src=0.3*np.sin(2*np.pi*150*t); src[int(0.8*sr):int(1.0*sr)]=0.05*rng.standard_normal(int(0.2*sr))
out=0.3*np.sin(2*np.pi*110*t); out[int(0.8*sr):int(1.0*sr)]=0.12*rng.standard_normal(int(0.2*sr))
w(d+'/s.wav',np.interp(np.arange(48000)/24000.0,t,src),24000); w(d+'/o.wav',out,sr)
r=v.uvSplice(d+'/o.wav',d+'/s.wav',d+'/z.wav'); z,_=v._wavRead(d+'/z.wav')
c=lambda a,b: float(np.corrcoef(a,b)[0,1]); W=lambda a,b: slice(int(a*sr),int(b*sr))
r['breath']=c(z[W(.85,.95)],src[W(.85,.95)]); r['vowel']=c(z[W(.3,.5)],out[W(.3,.5)]); r['n']=len(z)
r['bad']=v.uvSplice(d+'/o.wav',d+'/nope.wav',d+'/x.wav')
print(json.dumps(r))`);
  ok('۱۱.۱ نفسِ خروجی همان نفسِ ورودی شد (نرخِ ۲۴ ⇐ ۱۶ هم‌تراز)، واکهٔ تبدیل‌شده دست‌نخورده', res.ok === true && res.breath > 0.9 && res.vowel > 0.999 &&
     res.n === 32000 && Math.abs(res.gainDb) < 1, JSON.stringify(res));
  ok('۱۱.۲ ورودیِ خوانده‌نشده ⇒ «نشد»، خروجیِ اصلی دست‌نخورده می‌مانَد', res.bad.ok === false);
  const vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۱۱.۳ سیم: `ab.uv` ⇒ uvSplice روی همان خروجیِ نهایی، پیش از شنیدن؛ نامِ دارایی و رکورد «uv» دارند',
     /if abIt\.get\("uv"\):[\s\S]*?uvSplice\(best, "vb\/src\.wav"/.test(vb) && vb.indexOf('uvSplice(best') < vb.indexOf('hear = hearCompare(') &&
     /rec\["ab"\]\["uv"\] = uvRes/.test(vb));
  /* ۹.۵۴: ماسک از طیف — واکهٔ ۲۲۰ هرتزیِ پرهارمونیک (مثلِ گفتار) نباید جابه‌جا شود؛ نسخهٔ ۹.۵۳ نیمِ گفتار را جابه‌جا کرد. */
  const r2 = py(`import numpy as np
sr=40000; t=np.arange(sr*3)/sr
v=sum((0.3/k)*np.sin(2*np.pi*220*k*t) for k in range(1,12))
rng=np.random.default_rng(2); x=v.copy(); x[int(1.0*sr):int(1.12*sr)]=0.08*rng.standard_normal(int(0.12*sr))
x[int(2.0*sr):int(2.6*sr)]=0.08*rng.standard_normal(int(0.6*sr))
m,h=v_=v.uvMask(x,sr) if False else v.uvMask(x,sr)
print(json.dumps({"vowel":float(m[:90].mean()),"fric":float(m[102:110].mean()),"long":float(m[205:255].mean())}))`.replace('v=sum', 'vv=sum').replace('x=v.copy()', 'x=vv.copy()').replace('m,h=v_=v.uvMask(x,sr) if False else v.uvMask(x,sr)', 'm,h=v.uvMask(x,sr)'));
  ok('۱۱.۴ ماسک از طیف (۹.۵۴): واکهٔ پرهارمونیک نه، همخوانِ ۱۲۰ میلی‌ثانیه‌ای بله، رشتهٔ ۶۰۰ میلی‌ثانیه‌ای نه',
     r2.vowel < 0.05 && r2.fric > 0.8 && r2.long < 0.05, JSON.stringify(r2));
  const r3 = py(`import numpy as np, wave
sr=16000; d=${JSON.stringify(d11)}
def seg(f0a,f0b,dur):
  t=np.arange(int(dur*sr))/sr; f=np.linspace(f0a,f0b,len(t)); ph=2*np.pi*np.cumsum(f)/sr
  return sum((0.25/k)*np.sin(k*ph) for k in range(1,6))
z=np.zeros(int(0.5*sr))
x=np.concatenate([z,seg(150,110,1.2),z,seg(120,120,0.9),seg(120,170,0.3),z,seg(140,105,1.2),z])
o=wave.open(d+'/r.wav','wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes()); o.close()
print(json.dumps(v.riseScan(d+'/r.wav')))`);
  ok('۱۱.۵ riseScan (۹.۵۴): سه عبارت پیش از مکث، فقط دومی بالارونده — همان ثانیه', r3 && r3.pauses === 3 && r3.rise === 1 &&
     Math.abs(r3.at[0] - 3.4) < 0.3, JSON.stringify(r3));
  ok('۱۱.۶ سیم: riseScan روی ورودی، در رکورد؛ ttsCue_ یادآورِ سراسری را با TTS_DEEP_OFF_ نمی‌گذارد',
     /rise = riseScan\("vb\/src\.wav"\)/.test(vb) && /rec\["rise"\] = rise/.test(vb) &&
     /!TTS_DEEP_OFF_/.test(fs.readFileSync('src/03_Producer.gs', 'utf8')));
  try { fs.rmSync(d11, { recursive: true, force: true }); } catch (e) {}
}

console.log('=== ۱۲) «ه» ⇐ «خ» از تفاوتِ دو فایل (۹.۶۳) ===');
{
  /* ورودی: واکه + «ه»ِ نفس‌آلود (نویزِ کم و بم) + «س» (نویزِ تیزِ ۴–۶ کیلوهرتز). خروجی: واکهٔ تبدیل‌شده + «خ» (نویزِ قویِ ۱٫۵–۳
     کیلوهرتز) جای همان «ه» + همان «س» با نویزِ دیگر. فقط «خ» باید به «ه»ِ ورودی برگردد. */
  const d12 = fs.mkdtempSync(path.join(os.tmpdir(), 'vhx-'));
  const res = py(`import numpy as np, wave
d=${JSON.stringify(d12)}; sr=16000; rng=np.random.default_rng(3); n=sr*3; t=np.arange(n)/sr
def w(p,x,r):
  o=wave.open(p,'wb'); o.setnchannels(1); o.setsampwidth(2); o.setframerate(r); o.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes()); o.close()
def bandnoise(lo,hi,m,amp):
  F=np.fft.rfft(rng.standard_normal(m)); f=np.fft.rfftfreq(m,1/sr); F[(f<lo)|(f>hi)]=0; x=np.fft.irfft(F,m); return amp*x/np.abs(x).max()
vow=lambda f0: sum((0.25/k)*np.sin(2*np.pi*f0*k*t) for k in range(1,10))
S=slice(int(0.8*sr),int(0.9*sr)); Z=slice(int(2.0*sr),int(2.12*sr)); m1=S.stop-S.start; m2=Z.stop-Z.start
src=vow(120); src[S]=0.1*src[S]+bandnoise(100,900,m1,0.05); src[Z]=bandnoise(4000,6000,m2,0.3)
out=vow(110); out[S]=bandnoise(1500,3000,m1,0.35); out[Z]=bandnoise(4000,6000,m2,0.3)
w(d+'/s.wav',src,sr); w(d+'/o.wav',out,sr)
r=v.fricSplice(d+'/o.wav',d+'/s.wav',d+'/z.wav'); z,_=v._wavRead(d+'/z.wav')
c=lambda a,b: float(np.corrcoef(a,b)[0,1]); W=lambda a,b: slice(int(a*sr),int(b*sr))
r['h']=c(z[W(.82,.88)],src[W(.82,.88)]); r['s']=c(z[W(2.02,2.1)],out[W(2.02,2.1)]); r['vowel']=c(z[W(.3,.5)],out[W(.3,.5)])
r['bad']=v.fricSplice(d+'/o.wav',d+'/nope.wav',d+'/x.wav')
print(json.dumps(r))`);
  ok('۱۲.۱ «خ»ی که فقط در خروجی است به «ه»ِ ورودی برمی‌گردد؛ «س» که در هر دو هست و واکه دست نمی‌خورند',
     res.ok === true && res.h > 0.9 && res.s > 0.99 && res.vowel > 0.999 && res.pct < 12, JSON.stringify(res));
  ok('۱۲.۲ ورودیِ خوانده‌نشده ⇒ «نشد»', res.bad.ok === false);
  const vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۱۲.۳ سیم: `hx` روی خروجیِ اصلی پیش از شنیدن، نسخهٔ بی‌درمان «تبدیلِ دوم» برای شمردن؛ پایانِ جمله‌ها (مکثِ ۰٫۴) در رکورد',
     /if it\.get\("hx"\) and HX_SPLICE_ON:[\s\S]*?fricSplice\(best, "vb\/src\.wav"/.test(vb) && vb.indexOf('fricSplice(best') < vb.indexOf('hear = hearCompare(') &&
     /altOut = best/.test(vb) && /riseEnd = riseScan\("vb\/src\.wav", minPause=0\.4\)/.test(vb) && /rec\["riseEnd"\] = riseEnd/.test(vb) &&
     /rec\["hx"\] = hxRes/.test(vb));
  const eng = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
  ok('۱۲.۴ سیم در موتور: سدِ پایانِ بالارونده پیش از تلگرام، و `hx` به صفِ رانر می‌رسد',
     eng.indexOf('vbrRiseHold_(it)') > 0 && eng.indexOf('vbrRiseHold_(it)') < eng.indexOf('tell = vbrTgTell_(it') && /if \(o\.hx\) row\.hx = true/.test(eng));
  try { fs.rmSync(d12, { recursive: true, force: true }); } catch (e) {}
}

console.log('\n=== ۱۳) گامِ پل بازسنجی و کنار گذاشته نمی‌شود، و خروجیِ دور از هدف به شنونده نمی‌رسد (۹.۶۸) ===');
{
  /* رضوی با مبدأ Alnilam ‎−۷ خواست و ۱۶۰ هرتز درآمد (هدف ۱۰۷)؛ گلدوز +۴ خواست و ۱۳۱ شد (هدف ۱۵۸). */
  const g = py(`print(json.dumps({
    'alnilam': v.pitchGateErr({'medianHz':160.0},{'targetHz':106.9,'pitch':-7}),
    'goldooz': v.pitchGateErr({'medianHz':131.1},{'targetHz':158.0,'pitch':4}),
    'ok': v.pitchGateErr({'medianHz':108.1},{'targetHz':106.9,'pitch':-4}),
    'multi': v.pitchGateErr({'medianHz':160.0},{'targetHz':106.9,'pitch':-7},{'groups':[1,2]}),
    'none': v.pitchGateErr(None,{'targetHz':106.9})}))`);
  ok('۱۳.۱ دو نمونهٔ واقعیِ ۱۹ اکتبر رد می‌شوند؛ نمونهٔ درست نه؛ قسمتِ چندصدایی و بی‌سنجش دست نمی‌خورد',
     /160/.test(g.alnilam) && /131/.test(g.goldooz) && g.ok === '' && g.multi === '' && g.none === '', JSON.stringify(g));
  const vb13 = fs.readFileSync('tools/voicebridge.py', 'utf8'), vl13 = fs.readFileSync('tools/voicelab.py', 'utf8');
  ok('۱۳.۲ پل `--rvc-pitch-exact` می‌فرستد و آزمایشگاه با آن `pitchResolve` را دور می‌زند؛ سد پیش از ثبت',
     /"--rvc-pitch", pitch,[\s\S]{0,200}"--rvc-pitch-exact",/.test(vb13) && /add_argument\("--rvc-pitch-exact", action="store_true"/.test(vl13) &&
     /if OPT\.get\("rvc_pitch_exact"\):[\s\S]{0,900}else:\s*\n\s*steps_, pchk_ = pitchResolve\(/.test(vl13) &&
     /OPT\["rvc_pitch_exact"\] = bool\(a\.rvc_pitch_exact\)/.test(vl13) && /gErr = pitchGateErr\(stOut, pitchAuto, vg\)[\s\S]{0,200}return 1/.test(vb13));
}

try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
console.log('\n✅ همهٔ ' + pass + ' سنجهٔ رنگِ ضبط‌های خودِ گوینده گذشت.');
