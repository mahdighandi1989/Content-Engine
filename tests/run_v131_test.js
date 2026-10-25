/* ══ آزمونِ ۱۳.۱ — وارسیِ کیفیتِ صدا (شکستن، لرزش، مرز)، ساختِ دوبارهٔ تکهٔ خراب، و سدی که صوتِ خراب را واردِ قسمت نمی‌کند ══
 * صاحبِ کانال گلدوز را شنید: «لرزشِ خفیفِ مداوم … خروسی: ته‌ِ صدا ناگهان می‌شکند و به سوتِ نازک می‌پرد … قطعهٔ خراب دوباره ساخته
 * شود، نه اینکه وارد قسمت شود … تا تأیید VBR_EP_HOLD روشن.»
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

/* ── ۱) سنجه روی سیگنالِ ساختگی: صاف، شکستن، لرزش — و ابطال‌پذیر ── */
const py = require('child_process').execFileSync('python3', ['-c', `
import sys, json, numpy as np
sys.path.insert(0, "tools")
import voicebridge as v
sr = 16000
def tone(hzs):
    ph, out = 0.0, []
    for hz in hzs:
        n = int(0.01 * sr)
        for _ in range(n):
            ph += 2 * np.pi * hz / sr
            out.append(0.3 * (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph)))
    return np.array(out, dtype=np.float32)
base = [150.0] * 1000                                    # ۱۰ ثانیه صاف
crack = list(base); crack[300:320] = [320.0] * 20; crack[700:715] = [330.0] * 15   # دو شکستنِ ~۲۰۰ و ۱۵۰ میلی‌ثانیه
blip = list(base); blip[500:502] = [320.0] * 2                                       # ۲۰ میلی‌ثانیه — خطای ردیاب، نه شکستن
vib = [150.0 * 2 ** (1.2 * np.sin(2 * np.pi * 7 * i * 0.01) / 12.0) for i in range(1000)]   # لرزشِ ۷ هرتز، ±۱٫۲ نیم‌پرده
res = {}
for name, h in (("steady", base), ("crack", crack), ("vib", vib), ("blip", blip)):
    p = "/tmp/q_%s.wav" % name
    v.writeMono(p, tone(h), sr)
    q = v.qualityScan(p, bounds=[3.0, 7.0])
    res[name] = {"c": len(q["cracks"]), "j": q["jitterSt"], "bad": v.qualityBad(q), "t": [c["t"] for c in q["cracks"]]}
print(json.dumps(res))
`]).toString();
const R = JSON.parse(py.trim().split('\n').pop());
ok('۱.۱ صدای صاف: بی شکستن، لرزشِ کم، سالم', R.steady.c === 0 && R.steady.j < 0.05 && !R.steady.bad, JSON.stringify(R.steady));
ok('۱.۲ «خروسی»: هر دو شکستن با جا (حدودِ ۳ و ۷ ثانیه) و بی صدای صاف ⇒ رد', R.crack.c === 2 && Math.abs(R.crack.t[0] - 3.0) < 0.15 && Math.abs(R.crack.t[1] - 7.0) < 0.15 && /شکستن/.test(R.crack.bad), JSON.stringify(R.crack));
ok('۱.۲-ب قابِ تکِ ۲۰ میلی‌ثانیه‌ای (خطای ردیاب) شکستن شمرده نمی‌شود', R.blip.c === 0, JSON.stringify(R.blip));
ok('۱.۳ لرزشِ مداوم: میانگینِ لرزش بالای سقف ⇒ رد', R.vib.j > 0.18 && /لرزش/.test(R.vib.bad), JSON.stringify(R.vib));

/* ── ۲) سیم‌کشیِ رانر و موتور ── */
const vb = fs.readFileSync('tools/voicebridge.py', 'utf8'), vl = fs.readFileSync('tools/voicelab.py', 'utf8'), s36 = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
ok('۲.۱ voicelab: صافیِ زیروبم و پوشِ بلندی از بیرون (پیش‌فرض همان ۳ و ۰٫۲۵)', /"--rvc-filter-radius", default="3"/.test(vl) && /"--rvc-rms-mix", default="0.25"/.test(vl) &&
   /"respiration_median_filtering": int\(float\(OPT\.get\("rvc_filter_radius"\) or 3\)\)/.test(vl));
ok('۲.۲ رانر: وارسی پس از تبدیل، ساختِ دوباره با صافیِ ۷ و پوشِ ۰٫۵، بهتر از دو می‌ماند؛ «خام» ساختِ دوباره ندارد', /qual = qualityScan\(best/.test(vb) &&
   /if qual\["bad"\] and not vg and not it\.get\("qNoRetry"\):/.test(vb) && /"qRetryFilter", "7"/.test(vb) && /rec\["qualityFail"\] = qual\["bad"\]/.test(vb));
ok('۲.۳ موتور: صوتِ قسمتِ ردشده جای اصلی نمی‌نشیند؛ نمونه با گزارش می‌رود', /if \(hit\.qualityFail && !\/\^نمونه\/\.test/.test(s36) && /it\.status = 'ردِ کیفیت'/.test(s36) && /🔬 کیفیت: شکستنِ صدا/.test(s36));
ok('۲.۴ آستانه‌ها از CFG به ردیف', /row\.params\.qCrackPerMin = String\(CFG\.VBR_Q_CRACK_PER_MIN/.test(s36) && CFG.VBR_Q_CRACK_PER_MIN === 2.5 && CFG.VBR_Q_JITTER_ST === 0.18);

/* ── ۳) نمونه‌های تازه و مرزِ تولید ── */
const sd = (CFG.VOICE_SOUL_SEED || []).filter((x) => x.qNoRetry);
ok('۳.۱ دو نمونهٔ خام: گامِ ۰، دستورِ تازهٔ او، Charon و صدای پایهٔ دیگر، بی پردازش', sd.length === 2 && sd.every((x) => x.pitchFix === '0' && x.cueFix === 'آرام، پایدار، بدونِ لرزش، با پایان‌بندیِ طبیعی' &&
   !x.f0cap && !x.colour && !x.segPitch && !x.calm && x.nospans) && sd.some((x) => x.voice === 'Charon') && sd.some((x) => x.voice !== 'Charon'));
ok('۳.۲ تولید دست نخورد: VBR_EP_HOLD روشن، VBR_SEG_PITCH خاموش', CFG.VBR_EP_HOLD === true && CFG.VBR_SEG_PITCH === false);

summary('۱۳.۱');
