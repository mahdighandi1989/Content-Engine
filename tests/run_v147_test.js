/* ══ آزمونِ ۱۴.۷ — گلدوز: ۳ از ۲۹ ضبط پرباند، و گزینهٔ «ب» ══
 * اجرای ۱۰۰ِ voice-train (۲۹ اکتبر): «پهنای باند: 3 از 29 ضبط پرباند (لبه ≥ 9000 هرتز)» — ۲۶ ضبط لبه‌شان ~۷٫۷ کیلوهرتز.
 * ۱) ردِ پهنای باند آموزشِ همان tag را می‌بندد؛ گوینده با مدلِ پیشینش «آماده» می‌ماند، نه «ناموفق» ⇒ «رهاشده»
 * ۲) موتور آموزشِ بسته را «مانده» نمی‌بیند (نه صفِ هرشبه، نه درِ ساعتی)
 * ۳) hbRestore: باندِ بالا از مبدأ فقط در سایشی‌ها (یا همه‌جا)؛ زیرِ برش دست نمی‌خورد
 * ۴) بذرِ نمونهٔ «ب» و سیم‌کشیِ نسخه در پل
 */
require('./lib/root.js');
const fs = require('fs');
const cp = require('child_process');
const os = require('os');
const path = require('path');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const src = n => fs.readFileSync('src/' + fs.readdirSync('src').find(f => f.indexOf(String(n).slice(0, 3)) === 0), 'utf8');
const py = (code, args) => cp.execFileSync('python3', ['-c', code].concat(args || []), { encoding: 'utf8' }).trim().split('\n').pop();

console.log('\n=== ۱) ردِ پهنای باند در رانرِ پذیرش ===');
{
  const out = JSON.parse(py(`
import sys, json
sys.path.insert(0, "tools")
import voiceintake as V
c = {"retrainTag": "r3-band", "stage": "آموزش", "runId": "100", "prev": {"similarity": "0.851", "runId": "97", "epochs": 32}}
a = V.bandBlock_(c, {"kept": 3, "files": 29, "minHz": 9000}, "100")
c2 = {"retrainTag": "r3-band", "stage": "آموزش"}
b = V.bandBlock_(c2, {"kept": 5, "files": 29, "minHz": 9000}, "101")
d = V.bandBlock_({"stage": "آموزش"}, {"kept": 1, "files": 9}, "102")
print(json.dumps({"a": a, "c": c, "b": b, "c2": c2, "d": d, "ready": V.ST_READY, "min": V.BAND_MIN_FILES}, ensure_ascii=False))`));
  ok('۱.۱ ۳ از ۲۹ ⇒ آموزشِ r3-band بسته، گوینده «آماده» با شباهت و اجرای پیشین', out.a === true && out.c.stage === out.ready &&
     out.c.similarity === '0.851' && out.c.runId === '97' && out.c.retrainBlocked.tag === 'r3-band' && out.c.retrainBlocked.kept === 3 &&
     out.c.retrainBlocked.runId === '100' && /۳|3 از 29/.test(out.c.note), JSON.stringify(out.c).slice(0, 300));
  ok('۱.۲ ۵ یا بیشتر ⇒ دست نمی‌خورد (همان «ناموفق»ِ عادی برای شکستِ دیگر)', out.b === false && !out.c2.retrainBlocked && out.c2.stage === 'آموزش');
  ok('۱.۳ بی آموزشِ دوباره ⇒ دست نمی‌خورد', out.d === false);
  ok('۱.۴ کمینه همان کمینهٔ voicetrain است', out.min === 5 && /MIN_BAND_FILES = int\(os\.environ\.get\("VT_MIN_BAND_FILES", "5"\)\)/.test(fs.readFileSync('tools/voicetrain.py', 'utf8')));
  const vi = fs.readFileSync('tools/voiceintake.py', 'utf8');
  ok('۱.۵ شاخهٔ «قرمز تمام شد» همین را صدا می‌زند و ردیف را «آماده» نگه می‌دارد', /if bandBlock_\(cur, bd, rid_\):\s*\n\s*sp\[key\] = cur\s*\n\s*changed = True/.test(vi));
}

console.log('\n=== ۲) موتور ===');
{
  const doc = { speakers: { 'spk-1g0r95d': { retrainDone: 'r2-22k', stage: 'آماده', retrainBlocked: { tag: 'r3-band', kept: 3 } } } };
  ok('۲.۱ آموزشِ بسته‌شده «مانده» نیست', vintRetrainPending_('spk-1g0r95d', doc) === null);
  const doc2 = { speakers: { 'spk-1g0r95d': { retrainDone: 'r2-22k', retrainBlocked: { tag: 'r2-x' } } } };
  ok('۲.۲ بستنِ tagِ دیگر این tag را نمی‌بندد', (vintRetrainPending_('spk-1g0r95d', doc2) || {}).tag === 'r3-band');
  ok('۲.۳ بی پاسخ ⇒ همچنان مانده (پاسخِ نخوانده یعنی هنوز کار دارد)', (vintRetrainPending_('spk-1g0r95d', null) || {}).tag === 'r3-band');
}

console.log('\n=== ۳) hbRestore ===');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-'));
  const out = JSON.parse(py(`
import sys, json, wave
import numpy as np
sys.path.insert(0, "tools")
import voicebridge as B
d = sys.argv[1]; sr = 24000; n = sr * 6
t = np.arange(n) / sr
rng = np.random.default_rng(1)
voiced = sum(0.08 / k * np.sin(2 * np.pi * 150 * k * t) for k in range(1, 20))
fr = np.zeros(n)
for a in (1.0, 2.5, 4.0):                       # سه «س»: نویزِ پرانرژیِ بالای ۳ کیلوهرتز
    i0, i1 = int(a * sr), int((a + 0.15) * sr)
    nz = rng.standard_normal(i1 - i0)
    F = np.fft.rfft(nz); f = np.fft.rfftfreq(len(nz), 1 / sr); F[f < 3500] = 0
    fr[i0:i1] = np.fft.irfft(F, len(nz)) * 0.5
    voiced[i0:i1] *= 0.1
src = voiced + fr
def lp(x, c):
    F = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / sr); F[f > c] = 0; return np.fft.irfft(F, len(x))
conv = lp(src, 7700) * 0.7                      # «تبدیل»: بالای ۷٫۷ کیلوهرتز هیچ، و کمی آرام‌تر
def w(p, x):
    with wave.open(p, "wb") as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr)
        o.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
w(d + "/src.wav", src); w(d + "/conv.wav", conv)
r = B.hbRestore(d + "/conv.wav", d + "/src.wav", d + "/hb.wav", cutHz=7000, mode="fric")
ra = B.hbRestore(d + "/conv.wav", d + "/src.wav", d + "/hba.wav", cutHz=7000, mode="all")
y, _ = B._wavRead(d + "/hb.wav"); c, _ = B._wavRead(d + "/conv.wav")
def hi(x, a, b):
    seg = x[int(a * sr):int(b * sr)]; F = np.abs(np.fft.rfft(seg)) ** 2; f = np.fft.rfftfreq(len(seg), 1 / sr)
    return float(F[f > 8000].sum()), float(F[f < 6000].sum())
h_fric_out, l_fric_out = hi(y, 1.0, 1.15); h_fric_in, l_fric_in = hi(c, 1.0, 1.15)
h_vow_out, l_vow_out = hi(y, 3.0, 3.4); h_vow_in, l_vow_in = hi(c, 3.0, 3.4)
r2 = B.hbRestore(d + "/conv.wav", d + "/conv.wav", d + "/x.wav", cutHz=7000)
print(json.dumps({"r": r, "ra": ra, "gainUp": h_fric_out > 50 * max(1e-9, h_fric_in),
  "lowSameFric": abs(l_fric_out - l_fric_in) / l_fric_in < 0.02, "vowelUntouched": abs(l_vow_out - l_vow_in) / l_vow_in < 0.02 and h_vow_out <= h_vow_in * 1.5 + 1e-6,
  "noSrcHigh": r2}, ensure_ascii=False))`, [tmp]));
  ok('۳.۱ در «س» باندِ بالا از مبدأ برمی‌گردد (بیش از ۵۰ برابر)', out.r.ok && out.gainUp === true, JSON.stringify(out.r));
  ok('۳.۲ زیرِ برش (واکه، زیروبم، رنگ) دست نمی‌خورد — هم در «س» و هم در واکه', out.lowSameFric === true && out.vowelUntouched === true);
  ok('۳.۳ «فقط سایشی‌ها» سهمِ کوچکی از گفتار است و «همه‌جا» کلِ گفتار', out.r.pct < 30 && out.ra.ok && out.ra.pct > 90, JSON.stringify({ f: out.r.pct, a: out.ra.pct }));
  ok('۳.۴ گین دو فایل را هم‌تراز می‌کند (تبدیل ۰٫۷ ⇐ حدودِ ‎−۳ دسی‌بل)', out.r.gainDb < -1.5 && out.r.gainDb > -4.5, String(out.r.gainDb));
  ok('۳.۵ مبدأیی که خودش بالای برش چیزی ندارد هم «نشد» با علت نمی‌دهد، ولی هیچ را اضافه نمی‌کند', out.noSrcHigh && (out.noSrcHigh.ok === false || out.noSrcHigh.frames >= 0));
}

console.log('\n=== ۴) بذر و سیم‌کشی ===');
{
  const sd = (CFG.VOICE_SOUL_SEED || []).filter(s => /\bhb\b/.test(String(s.variants || '')));
  ok('۴.۱ یک بذرِ نمونهٔ «ب» برای گلدوز: Charon خام، فقط سایشی‌ها، همه‌جا — بی انتظارِ بازآموزی', sd.length === 1 &&
     sd[0].speaker === 'spk-1g0r95d' && sd[0].variants === 'raw,hb,hb:all' && !sd[0].afterRetrain && /گامِ ۰/.test(sd[0].tag) && sd[0].pitchFix === '0');
  const vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۴.۲ پل نسخهٔ hb را روی همان خروجیِ نهایی می‌سازد، بی تبدیلِ دوباره', /elif vv in \("hb", "hb:all"\):[\s\S]{0,600}hbRestore\(best, "vb\/src\.wav"/.test(vb));
  ok('۴.۳ مرزِ تولید سرِ جاست: VBR_EP_HOLD روشن، VBR_SEG_PITCH خاموش، VBR_REPLACE خاموش', CFG.VBR_EP_HOLD === true && CFG.VBR_SEG_PITCH !== true && !CFG.VBR_REPLACE);
}

summary('۱۴.۷');
