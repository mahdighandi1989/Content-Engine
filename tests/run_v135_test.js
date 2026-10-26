/* ══ آزمونِ ۱۳.۵ — گلدوز: «کمی بم‌تر، در همان مفهوم»، و «خش مثلِ نوارِ قدیمی» در کدام مرحله ══
 * صاحبِ کانال: «ه بهتر شد ولی هنوز گاهی خ … صدا کمی بم‌تر ولی در همان مفهوم و شباهت به گلدوز … نمونه‌های مقایسه‌ای (۰٫۵ و ۱ و ۱٫۵
 * نیم‌پردهٔ بم‌تر) بدون تغییر در تولید … خش و خراش … از خودِ تبدیل است یا از نرم‌کردنِ خ یا از برش و وصله … اگر معیار نداریم بساز.»
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const cp = require('child_process');

/* ── ۱) سنجهٔ خش: نسبت به مرحلهٔ قبل در همان لحظه — ابطال‌پذیر ── */
const R = JSON.parse(cp.execFileSync('python3', ['-c', `
import sys, json, wave, numpy as np
sys.path.insert(0, "tools"); import voicebridge as v
sr = 16000; t = np.arange(sr * 20) / sr; rng = np.random.default_rng(5)
f0 = 130 * (1 + 0.05 * np.sin(2 * np.pi * 0.3 * t)); ph = 2 * np.pi * np.cumsum(f0) / sr
env = (np.sin(2 * np.pi * 0.7 * t) > -0.6).astype(np.float32)
x = (0.25 * env * sum(np.sin(k * ph) / k for k in range(1, 30))).astype(np.float32)
def w(p, y):
    o = wave.open(p, "wb"); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes()); o.close()
w("/tmp/c135a.wav", x)
y = x.copy()
for p_ in rng.choice(np.nonzero(env > 0)[0], 400, replace=False): y[p_] += 0.15 * np.sign(rng.standard_normal())
w("/tmp/c135b.wav", y)
w("/tmp/c135q.wav", x * 0.3)
r = lambda o: {k: o.get(k) for k in ("absPerMin", "addedPerMin", "nearBound", "farBound")}
print(json.dumps({"self": r(v.crackleScan("/tmp/c135a.wav", "/tmp/c135a.wav")),
                  "clicks": r(v.crackleScan("/tmp/c135b.wav", "/tmp/c135a.wav", bounds=[5, 10])),
                  "quiet": r(v.crackleScan("/tmp/c135q.wav", "/tmp/c135a.wav")),
                  "pe": v.pitchExact(["-0.5", "+2", "-4", "-1.5", " "])[0]}))
`]).toString().trim().split('\n').pop());
ok('۱.۱ همان فایل در برابرِ خودش ⇒ صفر خشِ افزوده', R.self.addedPerMin === 0, JSON.stringify(R.self));
ok('۱.۲ ۴۰۰ ضربهٔ ساختگی روی گفتار ⇒ خشِ افزوده دیده می‌شود (کمینه، نه همهٔ ضربه‌ها)', R.clicks.addedPerMin > 20, JSON.stringify(R.clicks));
ok('۱.۳ کنار و دور از مرزِ تکه جدا شمرده می‌شوند', R.clicks.nearBound != null && R.clicks.farBound != null);
ok('۱.۴ فقط آرام‌تر شدن (بلندیِ دیگر) خش نیست — انرژی نسبت به میانهٔ خودِ هر فایل', R.quiet.addedPerMin === 0, JSON.stringify(R.quiet));

/* ── ۲) نیم‌پردهٔ کسری، از درِ آزمایشگاه ── */
ok('۲.۱ `pitchExact` کسری را نگه می‌دارد و رشته‌های همیشگی را عوض نمی‌کند', JSON.stringify(R.pe) === JSON.stringify(['-0.5', '2', '-4', '-1.5']), JSON.stringify(R.pe));
const vl = fs.readFileSync('tools/voicelab.py', 'utf8'), vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
ok('۲.۲ کتابخانه `int()` می‌کند ⇒ بخشِ صحیح از `pitch_lvl`، بخشِ کسری در `VC.get_f0`', /conf\["pitch_lvl"\] = int\(pf_\)/.test(vl) &&
   /OPT\["_pitch_frac"\] = pf_ - int\(pf_\)/.test(vl) && /_rp\.VC\.get_f0 = _gf/.test(vl) && /f0_up_key \+ float\(OPT\.get\("_pitch_frac"\) or 0\.0\)/.test(vl));

/* ── ۳) رانر: نمونه‌های بم‌تر از همان مبدأ، و خشِ هر مرحله ── */
ok('۳.۱ هر نمونهٔ بم‌تر همان مسیر را می‌رود: تبدیل ⇐ بلندی ⇐ «خ» نرم، با گامِ (گامِ نمونه + جابه‌جایی)',
   /p2 = "%g" % \(float\(pitch\) \+ float\(pv\)\)/.test(vb) && /cur7 = n7 if loudFix\(f7, n7\) else f7/.test(vb) && /fricSplice\(cur7, "vb\/src\.wav", h7, mode="soft"/.test(vb));
ok('۳.۲ خشِ هر مرحله نسبت به فایلِ پیش از خودش: تبدیل/مبدأ، رنگ، بلندی، «خ»', /"conv": crackleScan\(rawConv, "vb\/src\.wav", bounds=bnds\)/.test(vb) &&
   /crackle\["colour"\] = crackleScan\(preLoud, rawConv\)/.test(vb) && /crackle\["soft"\] = crackleScan\(best, altOut\)/.test(vb) && /rec\["crackle"\] = crackle/.test(vb) && /rec\["pitchAlt"\] = pAlts/.test(vb));

/* ── ۴) موتور: بذر، ردیف، تلگرام ── */
const seeds = CFG.VOICE_SOUL_SEED || [];
const sd = seeds.filter((x) => x.pitchAlt);
ok('۴.۱ بذرِ تازه: گلدوز، درسِ ۷۴، Charon، «خ» نرم، گامِ ۰ و سه نسخهٔ بم‌تر', sd.length === 1 && sd[0].speaker === 'spk-1g0r95d' && sd[0].pitchFix === '0' &&
   sd[0].hx === 'soft' && sd[0].pitchAlt === '-0.5,-1,-1.5', JSON.stringify(sd));
const s36 = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
ok('۴.۲ بذر ⇐ انتخاب ⇐ ردیف ⇐ رانر (پاک‌شده از هر نویسهٔ غیرعددی)', /seedPAlt\[sk\] = String\(se\.pitchAlt\)/.test(s36) && /pitchAlt: seedPAlt\[k\] \|\| ''/.test(s36) &&
   /tagO\.pitchAlt = pick\.pitchAlt/.test(s36) && /row\.params\.pitchAlt = String\(o\.pitchAlt\)\.replace\(/.test(s36) && /it\.pitchAltOut = hit\.pitchAlt/.test(s36));
const sent = []; const realTg = global.tgSend_; global.tgSend_ = (t) => { sent.push(t); return true; };
try {
  vbrTgMeasure_({ key: 'نمونهٔ روح — آزمون', crackleOut: { conv: { addedPerMin: 5.2, nearBound: 9.1, farBound: 4.8, added: [12.3, 40.1] }, loud: { addedPerMin: 0 }, soft: { addedPerMin: 1.1 } },
                  pitchAltOut: [{ delta: '-1', pitch: '-1', url: 'https://x/y.wav', medianHz: 120, crackPerMin: 3.9, crackle: 5.0 }] }, 'گلدوز');
} catch (e) { sent.push('ERR ' + e.message); }
global.tgSend_ = realTg;
const tg = sent.join('\n');
ok('۴.۳ تلگرام: خشِ هر مرحله با کنار/دورِ مرز، و هر نمونهٔ بم‌تر با نشانی و هرتز', /📼 خشِ افزوده .*تبدیل 5\.2 \(کنارِ مرزِ تکه‌ها 9\.1، دور از مرز 4\.8\).*بلندی 0 · نرم‌کردنِ «خ» 1\.1/.test(tg) &&
   /🎚 گامِ -1 \(-1 نیم‌پرده\): https:\/\/x\/y\.wav · میانه 120 هرتز/.test(tg), tg.slice(0, 400));

/* ── ۵) تولید دست نخورد ── */
ok('۵.۱ VBR_EP_HOLD روشن، VBR_SEG_PITCH خاموش، VBR_REPLACE خاموش', CFG.VBR_EP_HOLD === true && CFG.VBR_SEG_PITCH === false && CFG.VBR_REPLACE === false);
ok('۵.۲ `pitchAlt` فقط از بذرِ نمونه می‌آید: تنها نویسندهٔ `tagO.pitchAlt` انتخابِ بذر است و هیچ CFGِ قسمتی نیست',
   (s36.match(/tagO\.pitchAlt =/g) || []).length === 1 && /if \(se\.pitchAlt\) seedPAlt\[sk\]/.test(s36) && !/CFG\.VBR_PITCH_ALT/.test(s36));

summary('۱۳.۵');
