/* ══ آزمونِ ۱۴.۱ — Content-ID، ریلیز، و بازآموزیِ پرباندِ گلدوز (پیامِ صاحبِ کانال، ۲۸ اکتبر عصر) ══
 * ۱) لحظه‌ای که صدای کلیپ موسیقی دارد ننشیند (`musicgate.py` در رانر) — ریشهٔ ادعای ۸۵ (۹:۲۲–۹:۵۵)
 * ۲) بانکِ موسیقی: مجوزِ نامعلوم نه پخش نه آورده می‌شود، حتی با تأییدِ سلیقه
 * ۳) پس از هر انتشار: اثرِ Content-ID (مسدودی/رد) خوانده، در «گزارش‌های نظارت» ثبت و یک بار گفته می‌شود
 * ۴) ریلیز: فقط قسمت‌هایی که «رسید»اند، در یوتیوب‌اند و mp4شان در درایو هست، پاک می‌شوند
 * ۵) گلدوز: سدِ پهنای باندِ واقعی پیش از دیتاست، اثرِ انگشتِ تازه، خبرِ شمار، و نمونهٔ «پس از بازآموزی»
 */
require('./lib/root.js');
const fs = require('fs');
const cp = require('child_process');
const os = require('os');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const src = n => fs.readFileSync('src/' + fs.readdirSync('src').find(f => f.indexOf(String(n).slice(0, 3)) === 0), 'utf8');

const tmp = fs.mkdtempSync(os.tmpdir() + '/v141-');
let numpy = true;
try { cp.execFileSync('python3', ['-c', 'import numpy'], { stdio: 'ignore' }); } catch (e) { numpy = false; }

console.log('\n=== ۱) موسیقی در صدای کلیپ ===');
{
  if (numpy) {
    const py = `
import sys, numpy as np, wave
sr=16000; rng=np.random.default_rng(3); d=sys.argv[1]
def w(p,x):
    x=np.clip(x,-1,1)
    with wave.open(p,"wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((x*32767).astype("<i2").tobytes())
t=np.arange(int(sr*20))/sr
# گفتارِ ساختگی: زیروبمِ لغزان (۱۰۰ تا ۱۸۰ هرتز، هر ۲۰۰ میلی‌ثانیه عوض)، هجا و مکث
f0=110+50*np.sin(2*np.pi*0.7*t)+25*np.sin(2*np.pi*3.1*t)
ph=2*np.pi*np.cumsum(f0)/sr
env=(np.sin(2*np.pi*2.2*t)>0.1).astype(float)*(np.sin(2*np.pi*0.25*t)>-0.6)
sp=sum(np.sin(k*ph)/k for k in range(1,12))*env*0.25+0.003*rng.standard_normal(len(t))
w(d+"/speech.wav",sp)
# موسیقی: آکوردهای نگه‌داشته (هر دو ثانیه یک آکورد) زیرِ همان گفتار
mu=np.zeros(len(t))
for i,ch in enumerate([[220,277,330],[196,247,294],[175,220,262],[165,208,247]]*3):
    a=int(i*2*sr); b=min(len(t),a+2*sr)
    for f in ch: mu[a:b]+=0.08*np.sin(2*np.pi*f*t[a:b])
w(d+"/bed.wav",sp+mu)
`;
    cp.execFileSync('python3', ['-c', py, tmp]);
    const run = f => JSON.parse(cp.execFileSync('python3', ['tools/musicgate.py', tmp + '/' + f], { encoding: 'utf8' }));
    const a = run('speech.wav'), b = run('bed.wav');
    ok('۱.۱ گفتارِ تنها موسیقی خوانده نمی‌شود', a.music === false, JSON.stringify(a));
    ok('۱.۲ همان گفتار با آکوردِ نگه‌داشتهٔ زیرش موسیقی است، با علت', b.music === true && /نگه‌داشته/.test(b.why) && b.tonal > a.tonal, JSON.stringify(b));
  } else ok('۱.۱ (numpy نیست؛ سنجه در رانر)', true);
  const R = require('../tools/render.js');
  const g = R.musicGateOf(tmp + '/nope.wav');
  ok('۱.۳ شکستِ سنجه ⇒ موسیقی (پیش‌فرضِ رد)، با علت', g.music === true && /سنجهٔ موسیقی نشد/.test(g.why), JSON.stringify(g));
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  const i1 = rj.indexOf('const mg = musicGateOf(a);'), i2 = rj.indexOf('parts.push({ at: m.at, v: v, a: a');
  ok('۱.۴ دروازه پیش از نشستنِ لحظه است و لحظهٔ رد‌شده `continue` می‌شود (جمله‌های گوینده سرِ جا)', i1 > 0 && i2 > i1 &&
     /if \(mg\.music\) \{[\s\S]{0,260}continue;/.test(rj.slice(i1, i2)));
  ok('۱.۵ رانر numpy را نصب می‌کند', /pip install --quiet imageio-ffmpeg numpy/.test(fs.readFileSync('.github/workflows/render.yml', 'utf8')));
}

console.log('\n=== ۲) بانکِ موسیقی ===');
{
  const hub = getHub_();
  const sh = ensureTab_(hub, CFG.MUSIC_TAB || 'موسیقی', MUSIC_HEADERS);
  const row = (id, name, srcTxt) => { const r = new Array(MUSIC_HEADERS.length).fill(''); r[MC.ID - 1] = id; r[MC.NAME - 1] = name;
    r[MC.KIND - 1] = 'موسیقی'; r[MC.FMT - 1] = 'WAV'; r[MC.SEC - 1] = 60; r[MC.SRC - 1] = srcTxt; sh.appendRow(r); };
  row('m-cc0', 'a.wav', 'Piano — https://creativecommons.org/publicdomain/zero/1.0/');
  row('m-by', 'b.wav', 'Loop — https://creativecommons.org/licenses/by/4.0/');
  row('m-unk', 'c.wav', 'Kollo — archive.org 78rpm');
  row('m-nc', 'd.wav', 'X — https://creativecommons.org/licenses/by-nc/4.0/');
  const keepMr = global.mrMap_;
  global.mrMap_ = () => ({ 'm-unk': { verdict: 'تأیید' } });
  const ids = musicBank_(hub).map(x => x.id);
  ok('۲.۱ مالکیتِ عمومی و CC BY می‌مانند؛ نامعلوم (حتی با «تأیید»ِ سلیقه) و NC بیرون — فایل‌ها پاک نمی‌شوند',
     ids.indexOf('m-cc0') >= 0 && ids.indexOf('m-by') >= 0 && ids.indexOf('m-unk') < 0 && ids.indexOf('m-nc') < 0 && sh.getLastRow() === 5, ids.join());
  global.mrMap_ = keepMr;
  ok('۲.۲ گشتن در archive.org هم فقط مجوزِ معلوم را می‌آورد (موسیقی و جلوه)', CFG.MUSIC_LICENSE_STRICT === true &&
     (src('23_').match(/musicLicense_\((s)?lic\)\.ok !== true\) continue;/g) || []).length === 2);
}

console.log('\n=== ۳) Content-ID پس از انتشار ===');
{
  ok('۳.۱ اثرِ ادعا از videos.list خوانده می‌شود', ytClaimOf_({ status: { uploadStatus: 'processed' }, contentDetails: {} }) === '' &&
     /در (2|۲) کشور مسدود/.test(ytClaimOf_({ contentDetails: { regionRestriction: { blocked: ['DE', 'US'] } } })) &&
     ytClaimOf_({ contentDetails: { regionRestriction: { allowed: [] } } }) === 'در همهٔ کشورها مسدود' &&
     /^رد شد: claim/.test(ytClaimOf_({ status: { uploadStatus: 'rejected', rejectionReason: 'claim' } })));
  const hub = getHub_();
  const sh = ensureTab_(hub, CFG.YT_TAB, YT_HEADERS);
  const add = (show, ep, vid, title) => { const r = new Array(YT_HEADERS.length).fill(''); r[YU.AT - 1] = '2026-10-28 2:58'; r[YU.SHOW - 1] = show;
    r[YU.EP - 1] = ep; r[YU.VID - 1] = vid; r[YU.TITLE - 1] = title; r[YU.PRIV - 1] = 'public'; sh.appendRow(r); };
  add('از همه جا از همه رنگ', 85, 'V85', 'ترفندهای هوش مصنوعی'); add('از همه جا از همه رنگ', 82, 'V82', 'طلاق به خاطر خروپف'); add('درس‌نامه', 85, 'S85', 'شکاکیت');
  const keepS = global.ytSvc_, keepQ = global.ytQuotaTake_, keepT = global.tgSend_, keepE = global.tgEnabled_, keepF = global.logSelfFinding_, keepM = global.mailQueue_;
  const items = { V85: { id: 'V85', contentDetails: { regionRestriction: { blocked: ['DE', 'FR', 'US'] } }, status: {} },
                  V82: { id: 'V82', contentDetails: { regionRestriction: { allowed: [] } }, status: {} },
                  S85: { id: 'S85', contentDetails: {}, status: { uploadStatus: 'processed' } } };
  let calls = 0;
  global.ytSvc_ = () => ({ Videos: { list: (part, q) => { calls++; return { items: q.id.split(',').map(v => items[v]).filter(Boolean) }; } } });
  global.ytQuotaTake_ = () => true;
  const sent = [], finds = [], mails = [];
  global.tgEnabled_ = () => true; global.tgSend_ = t => { sent.push(t); return true; };
  global.logSelfFinding_ = (h, f) => { finds.push(f); };
  global.mailQueue_ = (k, t, b) => { mails.push(k); return true; };
  props_().deleteProperty(PK.YT_CLAIM_WATCH);
  const o = ytClaimScan_(hub);
  ok('۳.۲ دو ویدئوی مسدود پیدا شد، سالم نه؛ یک فراخوانِ videos.list برای همه', o.hit.length === 2 && calls === 1 &&
     o.hit.map(x => x.vid).sort().join() === 'V82,V85', JSON.stringify(o.hit));
  ok('۳.۳ هر کدام: ردیفِ «گزارش‌های نظارت» با کلیدِ خودش و صاحبِ «کاربر»، یک تلگرام، یک خبر برای ایمیلِ ۱۰ صبح',
     finds.length === 2 && finds.every(f => /^yt-claim-V8[25]$/.test(f.key) && f.owner === 'کاربر' && /Studio/.test(f.detail)) &&
     sent.length === 2 && mails.length === 2 && /بریدنِ همان بازه/.test(sent[0]));
  ytClaimScan_(hub);
  ok('۳.۴ همان حال در دورِ بعد دوباره خبر نمی‌شود', sent.length === 2 && finds.length === 2);
  items.V85 = { id: 'V85', contentDetails: {}, status: {} };
  ytClaimScan_(hub);
  const ln = ytClaimWatchLine_();
  ok('۳.۵ رفعِ ادعا دیده می‌شود و خطِ روزانه فقط مسدودِ مانده را می‌گوید', ln.hit.length === 1 && /variety:82|82/.test(ln.line) && !/V85/.test(JSON.stringify(ln.hit)), ln.line);
  const keepK = CFG.YT_CLAIM_KNOWN;
  CFG.YT_CLAIM_KNOWN = ['V85'];
  const lb = ytClaimWatchLine_();
  ok('۳.۷ ویدئویی که Studio مسدود گفته و این راه سالم دید ⇒ خطِ «Data API نشان نمی‌دهد» (و ایراد، نه یادداشت)',
     lb.blind.join() === 'V85' && /نشان نمی‌دهد/.test(lb.line) && /clW\.hit\.length \|\| clW\.blind\.length \? problems : notes/.test(src('08_')), lb.line);
  CFG.YT_CLAIM_KNOWN = keepK;
  ok('۳.۶ در ytPublishTick و در _STATUS.youtube', /ytClaimDue_\(\)\) \{\s*\n\s*try \{ ytClaimScan_\(\); \}/.test(src('27_')) && /out\.claims = ytClaimWatchLine_\(\);/.test(src('27_')));
  global.ytSvc_ = keepS; global.ytQuotaTake_ = keepQ; global.tgSend_ = keepT; global.tgEnabled_ = keepE; global.logSelfFinding_ = keepF; global.mailQueue_ = keepM;
}

console.log('\n=== ۴) پاک‌کردنِ ریلیز ===');
{
  const hub = getHub_();
  const ago = d => Utilities.formatDate(new Date(Date.now() - d * 86400000), 'Asia/Dubai', 'yyyy-MM-dd HH:mm');
  const fo1 = global.__ROOT_FOLDER.createFolder('ep1'), fo2 = global.__ROOT_FOLDER.createFolder('ep2'), fo3 = global.__ROOT_FOLDER.createFolder('ep3');
  fo1.createFile(Utilities.newBlob('x'.repeat(1200000), 'video/mp4', 'قسمت 1 — ویدئو.mp4'));
  fo2.createFile(Utilities.newBlob('x'.repeat(2000), 'video/mp4', 'قسمت 2 — ویدئو.mp4'));     // کوچک ⇒ مشکوک
  fo3.createFile(Utilities.newBlob('x'.repeat(1200000), 'video/mp4', 'قسمت 3 — ویدئو.mp4'));
  const keepR = global.ytRenderRead_, keepW = global.ytRenderSave_, keepP = global.ytPublished_;
  let saved = null;
  global.ytRenderRead_ = () => ({ items: [
    { key: 'special:1', show: 'special', ep: 1, status: 'رسید', doneAt: ago(3), folderId: fo1.getId() },
    { key: 'special:2', show: 'special', ep: 2, status: 'رسید', doneAt: ago(3), folderId: fo2.getId() },
    { key: 'special:3', show: 'special', ep: 3, status: 'رسید', doneAt: ago(0.2), folderId: fo3.getId() },
    { key: 'special:4', show: 'special', ep: 4, status: 'در انتظار', doneAt: '', folderId: fo1.getId() },
    { key: 'special:5', show: 'special', ep: 5, status: 'رسید', doneAt: ago(5), folderId: fo1.getId() }] });
  global.ytRenderSave_ = d => { saved = d; return true; };
  global.ytPublished_ = () => ({ 'special:1': { videoId: 'a' }, 'special:2': { videoId: 'b' }, 'special:3': { videoId: 'c' }, 'special:4': { videoId: 'd' } });
  const o = ytRenderPruneMark_(30000, hub);
  ok('۴.۱ فقط «رسید» + کهنه‌تر از دو روز + منتشرشده + mp4ِ درایو ≥ یک مگ', saved && JSON.stringify(saved.prune) === '["special:1"]' && o.noDrive === 1,
     JSON.stringify({ p: saved && saved.prune, o }));
  global.ytRenderRead_ = keepR; global.ytRenderSave_ = keepW; global.ytPublished_ = keepP;
  const R = require('../tools/render.js');
  const map = { items: { 'special:1': { url: 'https://github.com/x/releases/download/renders/special-1.mp4' }, 'special:9': { url: 'u/special-9.mp4' } } };
  const r = R.pruneRelease({ prune: ['special:1', 'special:9'] }, map, { assets: [] });
  ok('۴.۲ رانر: فایلی که در ریلیز نیست فقط «pruned» می‌شود، و قلمِ pruned دیگر «ساخته» شمرده نمی‌شود',
     r.deleted === 0 && map.items['special:1'].pruned && R.builtFor({ key: 'special:1' }, map) === false && R.builtFor({ key: 'special:9' }, map) === false);
  ok('۴.۳ موتور قلمِ pruned را برنمی‌دارد', ytRenderBuilt_({ key: 'special:1' }, { 'special:1': { url: 'u', pruned: '2026-10-29' } }) === null);
}

console.log('\n=== ۵) گلدوز: پهنای باندِ واقعی ===');
{
  const rt = CFG.VOICE_RETRAIN['spk-1g0r95d'];
  ok('۵.۱ بازآموزیِ تازه با tagِ خودش (همان فایل‌های ۲۹ سپتامبر)؛ VBR_EP_HOLD روشن', rt.tag === 'r3-band' && rt.since === '2026-09-29' && CFG.VBR_EP_HOLD === true);
  const py = `
import sys, os, json
sys.path.insert(0, "tools")
os.environ["VT_FILE_IDS"] = ",".join("id%02dxxxxxxxx" % i for i in range(7))
os.environ["VT_VOICE"] = "spk-1g0r95d"
import voicetrain as V
out = sys.argv[1]
edges = [12000, 11000, 6000, 9500, 15000, 5000, 10000]
keep = V.bandGate_(["f%d" % i for i in range(7)], out, probe=lambda p: {"edgeHz": edges[int(p[1:])], "hi6to10Db": -10})
rep = json.load(open(os.path.join(out, "band-report.json")))
r2 = None
try:
    V.bandGate_(["f%d" % i for i in range(7)], out, probe=lambda p: {"edgeHz": 5000})
except SystemExit as e:
    r2 = str(e)
s1 = V.dsSig_(); V.MIN_BAND = 0; s0 = V.dsSig_()
print(json.dumps({"keep": keep, "kept": rep["kept"], "low": [x["n"] for x in rep["rows"] if not x["ok"]], "stop": r2 or "", "sigDiff": s1 != s0, "ver": V.DS_SIG_VER}, ensure_ascii=False))`;
  let res = null, err = '';
  try { res = JSON.parse(cp.execFileSync('python3', ['-c', py, tmp], { encoding: 'utf8', env: Object.assign({}, process.env) }).trim().split('\n').pop()); }
  catch (e) { err = String(e.stdout || e.message).slice(0, 300); }
  ok('۵.۲ ضبط‌های زیرِ ۹ کیلوهرتز کنار، با شماره؛ گزارش در artifact', res && res.keep.join() === 'f0,f1,f3,f4,f6' && res.kept === 5 && res.low.join() === '3,6', err || JSON.stringify(res));
  ok('۵.۳ کمتر از ۵ ضبطِ پرباند ⇒ آموزش شروع نمی‌شود، با علت و چاره', res && /پرباند است/.test(res.stop) && /ضبطِ تازه/.test(res.stop), res && res.stop);
  ok('۵.۴ سد در اثرِ انگشت است (کشِ r2 «ادامه» خوانده نمی‌شود)', res && res.sigDiff === true && res.ver === 4);
  const vi = fs.readFileSync('tools/voiceintake.py', 'utf8');
  ok('۵.۵ گزارش هم در شکست و هم در موفقیت به دفترِ صداها می‌رسد', /bd = bandReport\(rid_, key\)/.test(vi) && /cur\["band"\] = \{"minHz"/.test(vi));
  /* خبرِ تلگرام یک بار */
  const keepR = global.vintReadResult_, keepT = global.tgSend_, keepO = global.vintOn_;
  const sent = [];
  global.vintOn_ = () => true; global.tgSend_ = t => { sent.push(t); return true; };
  props_().deleteProperty('VINT_WATCH');
  const doc = { speakers: { 'spk-1g0r95d': { name: 'گلدوز', stage: VINT_ST.TRAIN, runId: '9', epochs: 0, retrainTag: 'r3-band',
                band: { minHz: 9000, files: 29, kept: 21, low: [[3, 6100], [7, 5200]] } } } };
  vintTrainWatch_(doc); vintTrainWatch_(doc);
  const bm = sent.filter(t => /پهنای باند/.test(t));
  ok('۵.۶ شمارِ پرباند و شمارهٔ ضبط‌های کنارگذاشته یک بار به تلگرام', bm.length === 1 && /۲۱ از ۲۹/.test(bm[0]) && /ضبطِ ۳/.test(bm[0]), sent.join(' | ').slice(0, 300));
  global.vintReadResult_ = keepR; global.tgSend_ = keepT; global.vintOn_ = keepO;
  /* نمونهٔ پس از بازآموزی */
  VBR_RT_DOC_ = { d: { speakers: { 'spk-1g0r95d': { retrainDone: 'r2-22k' } } } };
  const a0 = vbrRetrainDone_('spk-1g0r95d', 'r3-band');
  VBR_RT_DOC_ = { d: { speakers: { 'spk-1g0r95d': { retrainDone: 'r3-band' } } } };
  const a1 = vbrRetrainDone_('spk-1g0r95d', 'r3-band');
  VBR_RT_DOC_ = null;
  const sd = (CFG.VOICE_SOUL_SEED || []).filter(s => s.afterRetrain === 'r3-band');
  ok('۵.۷ نمونهٔ «پس از بازآموزی» تا «آماده» شدنِ r3-band ساخته نمی‌شود، بعد با سنجهٔ سایشی‌ها و Charonِ خام و مدلِ پیشین',
     a0 === false && a1 === true && sd.length === 1 && sd[0].variants === 'raw,old' && /afterRetrain && !vbrRetrainDone_\(key/.test(src('36_')));
}

summary('۱۴.۱');
