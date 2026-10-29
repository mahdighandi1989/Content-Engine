/* ══ آزمونِ ۱۳.۹ — دو خواستهٔ صاحبِ کانال، ۲۷ اکتبر ══
 * ۱) رندر: «۵.۸ گیگ release و صفِ ۵۰ دقیقه‌ای دوباره مشکل نشود — هشدار برای رندر ۶ ساعت بدون آپلود»
 *    اندازهٔ ریلیز در نقشه، کارِ ساخته‌شده ولی برداشته‌نشده، و یک پیامِ تلگرام برای هر نوبتِ انتظار
 * ۲) گلدوز: «ه هنوز خ؛ س ش چ ج زبان‌گرفته» — سنجهٔ سایشی‌ها در هر مرحله، و نمونهٔ مقایسه‌ای (خام / مدلِ پیشین / ملایم)
 */
require('./lib/root.js');
const fs = require('fs');
const cp = require('child_process');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const src = n => fs.readFileSync('src/' + fs.readdirSync('src').find(f => f.indexOf(String(n).slice(0, 3)) === 0), 'utf8');

console.log('\n=== ۱) رندر: ریلیز، «ساخته ولی بالا نرفته»، و هشدارِ شش‌ساعته ===');
{
  const R = require('../tools/render.js');
  R.relStat({ assets: [{ name: 'a', size: 2e9 }, { name: 'b', size: 1.5e9 }] });
  ok('۱.۱ رانر شمار و حجمِ ریلیز را از پاسخِ خودِ گیت‌هاب می‌گیرد', R.RELSTAT.assets === 2 && R.RELSTAT.bytes === 3.5e9);
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۱.۲ نقشه `release` را می‌نویسد، و هر کارِ تمام‌شده همان لحظه روی دیسک است (کشته‌شدنِ کارِ بعدی آن را نمی‌بَرد)',
     /m\.release = \{ assets: RELSTAT\.assets/.test(rj) && (rj.match(/try \{ writeMap\(map\); \} catch \(eWm\) \{\}/g) || []).length >= 2);
  const yml = fs.readFileSync('.github/workflows/render.yml', 'utf8');
  ok('۱.۳ گامِ ثبتِ نشانی‌ها با always() — حتی وقتی job سرِ ۵۰ دقیقه کشته شد', /if: always\(\) && steps\.probe\.outputs\.work == '1'/.test(yml));

  /* سلامتی: یک ردیفِ ساخته‌شده ۷ ساعت پیش و برداشته‌نشده، یکی تازه، و ریلیزِ ۸۱۰ فایلی */
  const keepR = global.ytRenderRead_, keepM = global.ytRenderMap_, keepRel = global.ytRenderRel_;
  const ago = h => new Date(Date.now() - h * 3600000).toISOString().slice(0, 16).replace('T', ' ');
  global.ytRenderRead_ = () => ({ items: [
    { key: 'variety:85', status: 'در انتظار', shared: true, sharedAt: ago(9) },
    { key: 'special:85', status: 'در انتظار', shared: true, sharedAt: ago(1) },
    { key: 'special:86', status: 'در انتظار', shared: true, sharedAt: ago(7) }] });
  global.ytRenderMap_ = () => ({ 'variety:85': { url: 'u', at: ago(7) } });
  global.ytRenderRel_ = () => ({ assets: 810, gb: 8.4 });
  const w = whRenderLag_();
  ok('۱.۴ «ساخته شده ولی ۶+ ساعت آپلود نشده» جدا شمرده می‌شود (زمانِ UTCِ رانر)، ساخته‌نشده‌ها جدا',
     w && w.made === 1 && w.madeHours === 7 && w.n === 2 && w.relBad === true, JSON.stringify(w || {}).slice(0, 200));
  const probs = [], notes = [];
  const keepH = global.watchdogHeartbeats_;
  global.watchdogHeartbeats_ = () => [w];
  watchdog_({}, probs, notes);
  ok('۱.۵ سه ایراد: ریلیزِ نزدیکِ سقفِ ۱۰۰۰، ویدئوی ساخته‌ولی‌برنداشته، و کارِ ۷ ساعت ساخته‌نشده (آستانه ۶ ساعت، نه یک روز)',
     probs.some(p => /ریلیزِ «renders»/.test(p) && /۱۰۰۰/.test(p)) && probs.some(p => /ساخته شده ولی/.test(p)) &&
     probs.some(p => /ساخته نشده‌اند/.test(p)), probs.join(' | ').slice(0, 300));
  global.ytRenderMap_ = () => ({ 'variety:85': { url: 'u', at: ago(2) }, 'special:86': { url: 'u2', at: ago(1) } });
  global.ytRenderRead_ = () => ({ items: [{ key: 'variety:85', status: 'در انتظار', shared: true, sharedAt: ago(3) }] });
  global.ytRenderRel_ = () => ({ assets: 528, gb: 5.77 });
  ok('۱.۶ همه‌چیز در مهلت ⇒ هیچ ردیفی (بی هشدارِ دروغ)', whRenderLag_() === null);
  global.ytRenderMap_ = () => ({ 'variety:72-3-نمونه': { url: 'u', at: ago(324) } });
  global.ytRenderRead_ = () => ({ items: [{ key: 'variety:72-3-نمونه', status: 'در انتظار', shared: true, sharedAt: ago(50) }] });
  ok('۱.۶-ب نمونه‌ای که عمداً برداشته نمی‌شود «ساخته ولی آپلودنشده» نیست (۱۴.۳ — ۳۲۴ ساعت هشدارِ دروغ)', whRenderLag_() === null);
  global.ytRenderRead_ = keepR; global.ytRenderMap_ = keepM; global.ytRenderRel_ = keepRel; global.watchdogHeartbeats_ = keepH;

  /* هشدارِ ساعتی: SINCE با درخواستِ بعدی جابه‌جا نمی‌شود، پیام یک بار */
  const sent = [];
  const keepE = global.tgEnabled_, keepS = global.tgSend_, keepK = global.ghKick_;
  global.tgEnabled_ = () => true; global.tgSend_ = t => { sent.push(t); return true; };
  global.ghKick_ = () => ({ ok: true });
  ghRenderDueClear_();
  ghRenderDue_('درخواستِ رندرِ variety:85');
  const s0 = props_().getProperty(PK.GH_RENDER_SINCE);
  props_().setProperty(PK.GH_RENDER_SINCE, ago(7).replace(/-/g, '-'));
  const sinceOld = props_().getProperty(PK.GH_RENDER_SINCE);
  ghRenderDue_('درخواستِ رندرِ special:85');
  ok('۱.۷ نخستین لحظهٔ انتظار نگه داشته می‌شود؛ درخواستِ تازه آن را جلو نمی‌کشد', !!s0 && props_().getProperty(PK.GH_RENDER_SINCE) === sinceOld);
  const keepParse = global.parseWhen_;
  global.parseWhen_ = s => { const m = /^(\d{4}-\d\d-\d\d) (\d\d:\d\d)$/.exec(String(s)); return m ? new Date(m[1] + 'T' + m[2] + ':00Z').getTime() : keepParse(s); };
  const a1 = ghRenderStallTell_(), a2 = ghRenderStallTell_();
  ok('۱.۸ ۶+ ساعت انتظار ⇒ یک پیامِ تلگرام با پیوندِ لاگ؛ بارِ دوم ساکت', a1 && a1.told && a1.hrs >= 6 && a2 === null &&
     sent.length === 1 && /actions\/workflows\/render\.yml/.test(sent[0]), JSON.stringify({ a1, a2, n: sent.length }));
  ghRenderDueClear_();
  ok('۱.۹ برداشتنِ آخرین ویدئو هر دو نشانه را پاک می‌کند (نوبتِ بعدی دوباره خبر می‌دهد)',
     !props_().getProperty(PK.GH_RENDER_SINCE) && !props_().getProperty(PK.GH_RENDER_TOLD));
  ok('۱.۱۰ درِ ساعتی هشدار را پیش از سدِ توکن صدا می‌زند (بی توکن هم خبر می‌رسد)',
     /try \{ ghRenderStallTell_\(\); \} catch \(eSt\) \{\}\s*\n\s*if \(!ghToken_\(\)\) return null;/.test(src('21_')));
  global.tgEnabled_ = keepE; global.tgSend_ = keepS; global.ghKick_ = keepK; global.parseWhen_ = keepParse;
}

console.log('\n=== ۲) گلدوز: سایشی‌ها در هر مرحله و نمونهٔ مقایسه ===');
{
  /* سنجهٔ پایتونی روی سیگنالِ ساختگی: مرحله‌ای که «س» را کُند کرد و مرحله‌ای که «ه» را «خ» کرد نامیده می‌شوند */
  const dir = fs.mkdtempSync(require('os').tmpdir() + '/fric-');
  const py = `
import sys, json, numpy as np, wave
sys.path.insert(0, "tools")
import voicebridge as vb
sr=24000; rng=np.random.default_rng(1)
def w(p,x):
    x=np.clip(x,-1,1)
    with wave.open(p,"wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((x*32767).astype("<i2").tobytes())
def bp(x,a,b):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/sr); X[(f<a)|(f>b)]=0; return np.fft.irfft(X,len(x))
t=np.arange(int(sr*0.3))/sr; s=[]
for i in range(12):
    s += [0.3*np.sin(2*np.pi*140*t), 0.3*bp(rng.standard_normal(len(t)),5000,11000), 0.1*bp(rng.standard_normal(len(t)),1500,5000)]
x=np.concatenate(s); d=sys.argv[1]
w(d+"/s.wav",x); w(d+"/c.wav",x); w(d+"/dull.wav",bp(x,50,6000)); w(d+"/kh.wav",x+0.25*bp(x,1000,3000))
r=vb.fricScan([("خام",d+"/s.wav"),("تبدیل",d+"/c.wav"),("کُند",d+"/dull.wav")],d+"/s.wav")
r2=vb.fricScan([("خام",d+"/s.wav"),("خ‌شده",d+"/kh.wav")],d+"/s.wav")
print(json.dumps({"a":r,"b":r2,"one":vb.fricOne(d+"/dull.wav",d+"/s.wav")},ensure_ascii=False))`;
  let res = null, err = '';
  try { res = JSON.parse(cp.execFileSync('python3', ['-c', py, dir], { encoding: 'utf8', timeout: 60000 })); }
  catch (e) { err = String(e.message || e).slice(0, 200); }
  if (res === null && /No module named 'numpy'/.test(err)) {
    ok('۲.۰ (numpy نیست؛ سنجهٔ پایتونی در رانر آزموده می‌شود)', true);
  } else {
    ok('۲.۱ قاب‌های «س/ش» و «ه/خ» در مبدأ جدا شمرده می‌شوند', res && res.a.nSib > 50 && res.a.nH > 50, err || JSON.stringify(res && res.a).slice(0, 160));
    ok('۲.۲ مرحله‌ای که تیزیِ «س» را پایین آورد مقصر نامیده می‌شود؛ مرحلهٔ بی‌تغییر نه',
       res && /^کُند/.test(res.a.guiltySib || '') && res.a.stages[1].dSharp === 0, JSON.stringify(res && res.a.stages).slice(0, 200));
    ok('۲.۳ مرحله‌ای که «ه» را به «خ» برد (انرژیِ ۱ تا ۳ ک) نامیده می‌شود', res && /^خ‌شده/.test(res.b.guiltyH || '') && !res.b.guiltySib);
    ok('۲.۴ سنجهٔ یک‌فایلی برای نسخه‌های مقایسه', res && res.one.sibSharpDb < res.a.stages[0].sibSharpDb && res.one.sibCentroid > 0);
  }
  const vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۲.۵ رانر مرحله‌ها را به ترتیب می‌سنجد: خام ⇐ RVC ⇐ رنگ ⇐ بلندی ⇐ «خ» نرم ⇐ هر گامِ بم‌تر',
     /stg = \[\("Charon خام", "vb\/src\.wav"\), \("پس از RVC", rawConv\)\]/.test(vb) && /fricScan\(stg \+ paStages/.test(vb) &&
     /paStages\.append\(\("گامِ %s \(بم‌تر\)" % p2, cur7\)\)/.test(vb) && /rec\["fric"\] = fric/.test(vb));
  ok('۲.۶ نسخه‌های «raw»، «old» (مدلِ پیشین با ایندکسِ خودش) و «mild:ir/pr» از همان مبدأ و همان مسیرِ پس از تبدیل',
     /if vv == "raw":/.test(vb) && /"vb\/modelOld\.pth"/.test(vb) && /vv\.startswith\("mild:"\)/.test(vb) && /rec\["variants"\] = variants/.test(vb));

  /* موتور: مدلِ پیشین از «پیشین» (تازه‌ترین)، و اشتراکش پس گرفته می‌شود */
  const fold = vbrFolder_();
  const sub = fold.createFolder(String(CFG.VBR_MODEL_OLD_FOLDER || 'پیشین'));
  sub.createFile(Utilities.newBlob('a', 'application/octet-stream', 'spk-1g0r95d.pth — کنار رفت 2026-09-30 10:00'));
  const nw = sub.createFile(Utilities.newBlob('b', 'application/octet-stream', 'spk-1g0r95d.pth — کنار رفت 2026-10-14 15:25'));
  const ix = sub.createFile(Utilities.newBlob('c', 'application/octet-stream', 'spk-1g0r95d.index — کنار رفت 2026-10-14 15:26'));
  sub.createFile(Utilities.newBlob('d', 'application/octet-stream', 'spk-other.pth — کنار رفت 2026-10-20 10:00'));
  const mo = vbrModelOld_('spk-1g0r95d');
  ok('۲.۷ تازه‌ترین مدلِ کنارگذاشتهٔ همین گوینده، با ایندکس و تاریخ', mo.ok && mo.ids.length === 2 && mo.ids[0].id === nw.getId() &&
     mo.ids[1].id === ix.getId() && mo.from === '2026-10-14 15:25', JSON.stringify(mo).slice(0, 200));
  ok('۲.۸ گوینده‌ای بی مدلِ پیشین ⇒ علت، نه شکست', !vbrModelOld_('spk-none').ok && /پیشین/.test(vbrModelOld_('spk-none').why));
  const offs = [];
  const keepOff = global.driveShareOff_;
  global.driveShareOff_ = id => { offs.push(id); return true; };
  vbrUnshare_({ audio: [{ id: 'A' }], modelOld: { ids: mo.ids } });
  ok('۲.۹ اشتراکِ مدلِ پیشین هم با صوتِ قسمت پس گرفته می‌شود', offs.length === 3 && offs.indexOf(nw.getId()) >= 0);
  global.driveShareOff_ = keepOff;

  const vbs = src('36_');
  ok('۲.۱۰ بذر ⇐ انتخاب ⇐ ردیف: `variants` همه‌جا می‌رسد و «old» مدلِ پیشین را در ردیف می‌گذارد',
     /seedVariants\[sk\] = String\(se\.variants\)/.test(vbs) && /variants: seedVariants\[k\] \|\| ''/.test(vbs) &&
     /tagO\.variants = pick\.variants/.test(vbs) && /row\.modelOld = \{ pth: mo\.pth/.test(vbs) && /row\.modelOldWhy = mo\.why/.test(vbs));
  ok('۲.۱۱ پیامِ نمونه سایشی‌ها را مرحله‌به‌مرحله و نسخه‌های مقایسه را با پیوند می‌گوید',
     /it\.fricOut = hit\.fric/.test(vbs) && /it\.variantsOut = hit\.variants/.test(vbs) && /بیشترین کُندشدنِ «س\/ش»/.test(vbs));
  const sd = (CFG.VOICE_SOUL_SEED || []).filter(s => s.variants && !s.afterRetrain && !/\bhb\b/.test(s.variants));   // ۱۴.۷: بذرِ «ب» آزمونِ خودش را دارد
  ok('۲.۱۲ بذرِ مقایسهٔ گلدوز: Charonِ خام، مدلِ پیشین، تبدیلِ ملایم، و بهترینِ تازه (گامِ ۰، «خ» نرم) — فقط نمونه',
     sd.length === 1 && sd[0].speaker === 'spk-1g0r95d' && sd[0].variants === 'raw,old,mild:0.5/0.5' && sd[0].hx === 'soft' && sd[0].pitchFix === '0');
  ok('۲.۱۳ مرزِ تولید سرِ جاست: VBR_EP_HOLD روشن، VBR_SEG_PITCH خاموش', CFG.VBR_EP_HOLD === true && CFG.VBR_SEG_PITCH !== true);
}

summary('۱۳.۹');
