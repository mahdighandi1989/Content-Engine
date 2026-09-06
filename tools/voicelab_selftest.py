#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voicelab_selftest.py — منطقِ خالصِ آزمایشگاه، بی هیچ مدل و بی هیچ شبکه.

══ چرا هست ══

اجرای #۴ و #۶ هر دو یک شکل داشتند: کدِ خودم خراب بود و چهل دقیقه بعد
فهمیدم — یک بار چون `ffmpeg()` هنوز بسته‌ای را وارد می‌کرد که حذفش کرده
بودم، یک بار چون خروجی را از روی «هر wavی جز مقصد» برمی‌داشتم و ورودی را
خروجی گزارش کردم. هیچ‌کدام به مدل ربطی نداشت و هر دو در دو ثانیه روی همین
ماشین پیدا می‌شدند.

پس هر چیزی در `voicelab.py` که **مدل لازم ندارد** اینجا سنجیده می‌شود، و
کارِ `scan` — که همیشه اجرا می‌شود و ارزان است — پیش از هر کارِ سنگینی
اجرایش می‌کند.
"""

import io
import re, json, os, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voicelab as V


def eq(got, want, what):
    if got != want:
        raise AssertionError("%s: %r ≠ %r" % (what, got, want))
    print("  ✓ %s" % what)


def near(got, want, tol, what):
    if abs(got - want) > tol:
        raise AssertionError("%s: %r ≉ %r" % (what, got, want))
    print("  ✓ %s (%.3f)" % (what, got))


def _stubOmni():
    """
    بدل‌های omnivoice/torch/soundfile — یک بار، برای دو بخش.

    وزن‌های بدل عمداً ساده‌اند (هر نویسه ۱، نیم‌فاصله هم ۱): چیزی که
    اینجا سنجیده می‌شود «آیا نیم‌فاصله از هر دو متن برداشته می‌شود و
    درصدش درست حساب می‌شود» است، نه عددهای جدولِ واقعی.
    """
    import types as _t
    ZW = "\u200c"

    class _Est(object):
        def calculate_total_weight(self, t):
            return float(len(t))

        def estimate_duration(self, g, r, f, **kw):
            return float(len(g)) * 2

    dur = _t.ModuleType("omnivoice.utils.duration")
    dur.RuleDurationEstimator = _Est
    mods = {
        "omnivoice": _t.ModuleType("omnivoice"),
        "omnivoice.utils": _t.ModuleType("omnivoice.utils"),
        "omnivoice.utils.duration": dur,
        "huggingface_hub": _t.ModuleType("huggingface_hub"),
        "soundfile": _t.ModuleType("soundfile"),
        "torch": _t.ModuleType("torch"),
    }
    mods["torch"].float32 = "fp32"
    for n, m in mods.items():
        sys.modules.setdefault(n, m)
    return ZW


def main():
    txt = V.DEFAULT_TEXT
    plain = V.noTash_(txt)

    print("۱ — بی‌اعراب‌سازی")
    eq(any(c in V.TASHKIL_ for c in plain), False, "هیچ اعرابی نمی‌مانَد")
    eq("‌" in plain, True, "نیم‌فاصله می‌مانَد — نویسهٔ ساختاری است، نه اعراب")

    # ══ عددی که مستقیم از فرمولِ f5 می‌آید ══
    # duration = ref_audio_len + ref_audio_len/len(ref)*len(gen)/speed
    # پس اگر متنِ ما اعراب دارد و متنِ مرجع ندارد، بودجه به همان نسبت باد
    # می‌کند و مدل ناچار است پُرش کند. `--speed` دقیقاً همان را پس می‌گیرد.
    print("۲ — اصلاحِ بودجهٔ زمان")
    near(V.f5SpeedFit_("سلام من اینجا هستم", txt),
         len(txt.encode()) / float(len(plain.encode())), 0.001,
         "مرجعِ بی‌اعراب + متنِ اعراب‌دار = نسبتِ بایت‌ها")
    near(V.f5SpeedFit_("سلام من اینجا هستم", plain), 1.0, 0.001,
         "هر دو بی‌اعراب یعنی اصلاحی لازم نیست")
    near(V.f5SpeedFit_("سَلامِ مَن", "بَررَسیِ اِدراک"), 1.0, 0.06,
         "هر دو اعراب‌دار هم یعنی ≈۱")

    # ══ چرا این مهم‌ترین سنجه است ══
    # `vocab_char_map.get(c, 0)` و `assert vocab_char_map[" "] == 0`:
    # نویسهٔ ناشناخته **فاصله** می‌شود. یعنی اگر اعراب در واژگان نباشد،
    # «دَر» به «د ر» تبدیل می‌شود — واژه‌ها می‌پاشند و صدا سالم می‌مانَد.
    print("۳ — ممیزیِ واژگان")
    d = tempfile.mkdtemp()
    base = sorted(set(plain))
    no = os.path.join(d, "v_no.txt")
    yes = os.path.join(d, "v_yes.txt")
    with io.open(no, "w", encoding="utf-8") as f:
        f.write("\n".join([" "] + [c for c in base if c != " "]) + "\n")
    with io.open(yes, "w", encoding="utf-8") as f:
        f.write("\n".join([" "] + [c for c in base if c != " "] +
                          list(V.TASHKIL_)) + "\n")
    a = V.vocabAudit_(no, {"با اعراب": txt, "بی اعراب": plain})
    b = V.vocabAudit_(yes, {"با اعراب": txt, "بی اعراب": plain})
    eq(a["tashkil_supported"], False, "واژگانِ بی‌اعراب: اعراب پشتیبانی نمی‌شود")
    eq("بی اعراب" in a["missing"], False, "و متنِ بی‌اعراب کاملاً پوشش دارد")
    eq(a["missing"]["با اعراب"]["pct"] > 15, True,
       "بیش از ۱۵٪ نویسه‌های متنِ اعراب‌دار به فاصله بدل می‌شود")
    eq(a["zwnj_in_vocab"], True, "نیم‌فاصله جدا از اعراب سنجیده می‌شود")
    eq(b["tashkil_supported"], True, "واژگانِ اعراب‌دار: پشتیبانی می‌شود")
    eq(b["missing"], {}, "و هیچ نویسه‌ای گم نیست")
    eq(V.vocabAudit_("", {"x": txt})["ok"], False,
       "بی واژگانِ سفارشی، جواب «نمی‌دانم» است نه «خوب است»")

    crlf = os.path.join(d, "v_crlf.txt")
    with io.open(crlf, "w", encoding="utf-8", newline="") as f:
        f.write("\r\n".join([" "] + [c for c in base if c != " "] +
                             list(V.TASHKIL_)) + "\r\n")
    cr = V.vocabAudit_(crlf, {"با اعراب": txt})
    eq(cr["missing"], {},
       "واژگانِ CRLF هم درست خوانده می‌شود — وگرنه «۱۰۰٪ ناشناخته» می‌گفت")
    eq(max(cr["entry_lengths"]) <= 1, True,
       "و طولِ مدخل‌ها گزارش می‌شود تا «تک‌نویسه است؟» حدس نباشد")

    # ══ گزارشی که فقط در پایان نوشته شود، وقتی لازم است وجود ندارد ══
    # اجرای #۹ سرِ سقفِ زمان لغو شد و همان دو عددی که کلِ اجرا برای دیدنشان
    # بود، هرگز نوشته نشدند.
    print("۴ — گزارشِ پله‌پله")
    o = tempfile.mkdtemp()
    V.OPT.clear()
    V.OPT["_rep"] = {"engine": "f5"}
    V.OPT["_out"] = o
    V.OPT["ref_cut"] = {"seconds": 10.92}
    V.saveRep_()
    got = json.load(io.open(os.path.join(o, "report-f5.json"), encoding="utf-8"))
    eq(got["ref_cut"]["seconds"], 10.92, "برشِ نمونه پیش از تولید ثبت می‌شود")
    V.OPT["heard"] = "چیزی که شنیده شد"
    V.saveRep_()
    got = json.load(io.open(os.path.join(o, "report-f5.json"), encoding="utf-8"))
    eq(got["ref_text_heard"], "چیزی که شنیده شد", "رونویس هم پیش از تولید ثبت می‌شود")
    V.OPT.clear()

    # ══ و یک بار کلِ مسیرِ f5 را بی مدل بدوان ══
    # اجرای #۶ خروجی را «هر wavی جز مقصد» گرفت و ورودی را نتیجه گزارش
    # کرد؛ اجرای #۴ ماژولی را وارد می‌کرد که خودم حذفش کرده بودم. هیچ‌کدام
    # به مدل ربط نداشت — هر دو با دواندنِ همین مسیر روی بدل‌ها پیدا می‌شدند.
    print("۵ — مسیرِ کاملِ f5 روی بدل‌ها")
    import types, wave, struct
    w = tempfile.mkdtemp()

    def wav(path, sec=2.0, rate=24000):
        f = wave.open(path, "wb")
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(struct.pack("<%dh" % int(rate * sec), *([0] * int(rate * sec))))
        f.close()
        return path

    ref = wav(os.path.join(w, "ref.wav"), 10.9)
    mod = types.ModuleType("f5_tts.infer.utils_infer")
    mod.preprocess_ref_audio_text = lambda a, t: (a, t)
    mod.transcribe = lambda a, language=None: "متن شنیده شده بدلی"
    pkg = types.ModuleType("f5_tts"); inf = types.ModuleType("f5_tts.infer")
    sys.modules["f5_tts"] = pkg; sys.modules["f5_tts.infer"] = inf
    sys.modules["f5_tts.infer.utils_infer"] = mod

    seen = []

    class R(object):
        returncode = 0
        stdout = b""
        stderr = b""

    def fakeSh(cmd, **kw):
        seen.append(cmd)
        i = cmd.index("--output_file")
        wav(os.path.join(cmd[cmd.index("--output_dir") + 1], cmd[i + 1]), 19.9)
        return R()

    realSh, realCut = V.sh, V.cutAtPause_
    V.sh = fakeSh
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 10.9), 10.9, 5)
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "f5"}
        V.OPT["_out"] = w
        V.OPT["f5_ckpt"] = "hf://kasi/mokhzan/model.safetensors"
        V.OPT["f5_vocab"] = yes
        V.OPT["f5_ref_text"] = ""
        V.OPT["f5_nfe"] = "32"
        made = V.run_f5(ref, "", txt, w)
        rep = json.load(io.open(os.path.join(w, "report-f5.json"), encoding="utf-8"))
    finally:
        V.sh, V.cutAtPause_ = realSh, realCut

    eq(os.path.basename(made), "f5-fit.wav", "خروجیِ برگشتی همان فایلِ اصلاح‌شده است")
    eq(len(seen), 2, "دو اجرا: تشخیص و شاهد")

    # ══ و وقتی شاهد با تشخیص یکی است، دو بار اجرا نمی‌شود ══
    # `is not` هویت را می‌سنجد نه مقدار را: در حالتِ ipa دو رشتهٔ برابر ولی
    # جدا ساخته می‌شد و شاهدی اجرا می‌شد که هیچ متغیری را نمی‌سنجید —
    # ۲۵ دقیقه محاسبه، و دو فایل که تفاوتشان فقط تصادفِ نمونه‌برداری بود.
    seen2 = []
    # برشِ سرِ مکث به ffmpeg نیاز دارد و کارِ اسکن ffmpeg ندارد؛ اینجا
    # موضوعِ آزمون نیست، پس بدل می‌ماند. (وگرنه هر اجرا یک خطِ خطای
    # بی‌ربط چاپ می‌کرد — و خطای بی‌ربط، همان چیزی است که آدم یاد
    # می‌گیرد نادیده بگیرد.)
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 10.9), 10.9, 5)
    V.sh = lambda cmd, **kw: (seen2.append(cmd), wav(os.path.join(
        cmd[cmd.index("--output_dir") + 1], cmd[cmd.index("--output_file") + 1]), 5.0), R())[-1]
    V.OPT.clear()
    V.OPT["_rep"] = {"engine": "f5"}; V.OPT["_out"] = w
    V.OPT["f5_ckpt"] = "hf://kasi/mokhzan/model.safetensors"
    V.OPT["f5_vocab"] = yes; V.OPT["f5_ref_text"] = "متن مرجع"; V.OPT["f5_nfe"] = "32"
    V.run_f5(ref, "", V.noTash_(txt), w)      # متنی که بی‌اعرابش خودش است
    # فقط فراخوانِ خودِ f5 شمرده می‌شود؛ برشِ نمونه هم `sh` صدا می‌زند.
    gen2 = [c for c in seen2 if c and str(c[0]).endswith("f5-tts_infer-cli")]
    eq(len(gen2), 1, "یک اجرا، چون شاهد با تشخیص مو‌به‌مو یکی می‌شد")
    eq("one_run_why" in V.OPT, True, "و دلیلش در گزارش نوشته می‌شود")

    eq(seen[0][seen[0].index("--speed") + 1], "1.244",
       "بودجهٔ زمان با نسبتِ اعراب اصلاح می‌شود")
    eq(seen[1][seen[1].index("--speed") + 1], "1.000", "و شاهد دست‌نخورده می‌مانَد")
    eq(seen[0][seen[0].index("--ref_text") + 1], "متن شنیده شده بدلی",
       "رونویس صریحاً پاس داده می‌شود، نه اینکه f5 خودش دوباره حدس بزند")
    eq(rep["ref_used"]["file"], "reference-used.wav",
       "همان صوتی که به مدل رفت، نگه داشته می‌شود")
    eq([v["name"] for v in rep["variants"]], ["fit", "asis"], "هر دو در گزارش‌اند")
    eq(rep["variants"][0]["expected_seconds"] > 0, True,
       "بودجهٔ پیش‌بینی‌شده ثبت می‌شود تا با طولِ واقعی سنجیده شود")
    # ══ بدل‌ها را همین‌جا پس بده ══
    # بلوکِ بالا `V.sh` را جایگزین کرد و برنگرداند، پس هر بخشِ بعدی که
    # `sh` صدا بزند بدلِ f5 را می‌گیرد — و خطایش («--output_dir نیست»)
    # هیچ ربطی به آن بخش ندارد. نشتِ بدل، سخت‌ترین نوعِ خطاست چون در
    # جای اشتباه ظاهر می‌شود.
    V.sh, V.cutAtPause_ = realSh, realCut
    V.OPT.clear()

    # ══ انتخابِ نمونه: تنها معیارِ ردکننده باید واقعاً رد کند ══
    # موسیقیِ زیرِ گفتار در نمونه، در **هر** قسمتِ تولیدشده بازتولید
    # می‌شود. یک نمونهٔ خوش‌آهنگِ موزیک‌دار بدترین انتخابِ ممکن است، و
    # گوش آن را «باکیفیت» می‌شنود.
    print("۶ — سنجشِ نمونهٔ صدا")
    import wave as _w, struct as _s, math as _m
    d2 = tempfile.mkdtemp()

    def synth(path, bed=0.0, rate=24000, sec=30.0):
        """گفتارِ ساختگی: بلوک‌های صدا با مکث میانشان، به‌اضافهٔ بسترِ دلخواه."""
        n = int(rate * sec)
        out = []
        for i in range(n):
            t = i / float(rate)
            on = (t % 2.2) < 1.6                      # ۱٫۶ ثانیه حرف، ۰٫۶ مکث
            v = 0.0
            if on:
                v += 0.30 * _m.sin(2 * _m.pi * 180 * t) * (1 + 0.5 * _m.sin(2 * _m.pi * 7 * t))
            v += bed * _m.sin(2 * _m.pi * 220 * t)
            out.append(max(-32767, min(32767, int(v * 32767))))
        f = _w.open(path, "wb")
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
        f.writeframes(_s.pack("<%dh" % n, *out)); f.close()
        return path

    clean = V.refScore_(synth(os.path.join(d2, "clean.wav")))
    beded = V.refScore_(synth(os.path.join(d2, "bed.wav"), bed=0.05))
    eq(clean["floor_db"] < -40, True,
       "گفتارِ تمیز: کفِ سکوت پایین است (%.0f dB)" % clean["floor_db"])
    eq("reject" in clean, False, "و رد نمی‌شود")
    eq("reject" in beded, True,
       "نمونهٔ موزیک‌دار رد می‌شود (کف %.0f dB)" % beded["floor_db"])
    eq(clean["score"] > beded["score"], True, "و نمرهٔ تمیز بالاتر است")
    eq(clean["pauses"] > 0, True, "مکث‌های قابلِ برش شمرده می‌شوند")

    # ══ و کفِ سکوت باید در سطحِ **پنجره** تصمیم بسازد ══
    # فایلی که نیمی‌اش موسیقی دارد و نیمی پاک است: کفِ کلِ فایل پاک
    # درمی‌آید (ساکت‌ترین قاب‌ها از تکهٔ پاک می‌آیند) و اگر تصمیم از روی
    # آن گرفته شود، پنجره‌ای از وسطِ موسیقی انتخاب می‌شود.
    def half(path, rate=24000, sec=120.0):
        n = int(rate * sec); out = []
        for i in range(n):
            t = i / float(rate)
            on = (t % 2.2) < 1.6
            bed = 0.06 if t < sec / 2 else 0.0      # نیمهٔ اول موزیک‌دار
            v = (0.30 * _m.sin(2 * _m.pi * 180 * t) if on else 0.0)
            v += bed * _m.sin(2 * _m.pi * 220 * t)
            out.append(max(-32767, min(32767, int(v * 32767))))
        f = _w.open(path, "wb"); f.setnchannels(1); f.setsampwidth(2)
        f.setframerate(rate); f.writeframes(_s.pack("<%dh" % n, *out)); f.close()
        return path

    h = V.refScore_(half(os.path.join(d2, "half.wav")))
    eq(h["at_second"] >= 55, True,
       "پنجره از نیمهٔ پاک انتخاب می‌شود (ثانیهٔ %s)" % h["at_second"])
    eq(h["window_floor_db"] < -40, True,
       "و کفِ همان پنجره پاک است (%.0f dB)" % h["window_floor_db"])
    eq("reject" in h, False, "پس فایل رد نمی‌شود — جای پاکش پیدا شد")

    # ══ ۷ — بودجهٔ زمانِ OmniVoice، و جایی که برای فارسی غلط می‌زند ══
    # این همان سنجه‌ای است که در f5 **بعد** از دو اجرای تلف‌شده نوشته شد.
    # اینجا پیش از اولین اجرا نوشته می‌شود، و دو چیزِ متضاد را می‌گوید:
    # اعراب رایگان‌اند (که در f5 نبودند)، ولی نیم‌فاصله — که اصلاً صدا
    # ندارد — گران حساب می‌شود.
    print("۷ — بودجهٔ زمانِ OmniVoice")
    # ══ چرا اینجا بدل و نه بستهٔ واقعی ══
    # این خودآزمون در کارِ **اسکن** می‌دود، که هیچ بستهٔ سنگینی نصب
    # نمی‌کند. اگر به omnivoice وابسته‌اش کنم، همه‌جا رد می‌شود — و
    # آزمونی که همه‌جا رد شود، آزمون نیست. پس منطقِ *خودم* اینجا سنجیده
    # می‌شود، و عددهای واقعیِ جدول (اعراب ۰٫۰ · نیم‌فاصله ۲٫۲) از خودِ
    # بستهٔ ۰٫۲٫۱ خوانده شده‌اند و در هر گزارشِ اجرا چاپ می‌شوند.
    _stubOmni()
    aud = V.durAudit_("متنِ مرجع.", txt, 250)
    eq(aud["zwnj_in_text"], txt.count(V.ZWNJ_),
       "نیم‌فاصله‌های متن شمرده می‌شوند (%d تا)" % aud["zwnj_in_text"])
    eq(aud["frames_zwnj_free"] < aud["frames_default"], True,
       "بودجهٔ اصلاح‌شده کوتاه‌تر از پیش‌فرض است — نیم‌فاصله صدا ندارد")
    eq(aud["overestimate_pct"] > 0, True,
       "و مقدارش گزارش می‌شود (%.1f٪)" % aud["overestimate_pct"])
    z = V.durAudit_("متنِ مرجع.", txt.replace(V.ZWNJ_, ""), 250)
    eq(z["overestimate_pct"], 0.0,
       "متنِ بی نیم‌فاصله اصلاحی نمی‌خواهد — سنجه بی‌جهت هشدار نمی‌دهد")

    # ══ ۸ — مسیرِ کاملِ omnivoice روی بدل‌ها ══
    # همان دلیلِ بخشِ ۵: خطاهای اجرای #۴ و #۶ هیچ‌کدام به مدل ربط نداشتند.
    # اینجا سه چیز سنجیده می‌شود که فقط با دواندنِ مسیر پیدا می‌شوند:
    # ارزان اول اجرا می‌شود، بودجه اجرای گران را می‌گیرد، و نسبتِ سرعت
    # برای **هر** اجرا جدا نوشته می‌شود.
    print("۸ — مسیرِ کاملِ omnivoice روی بدل‌ها")
    w2 = tempfile.mkdtemp()
    calls = []
    _stubOmni()

    class FakePrompt(object):
        def __init__(self):
            class T(object):
                shape = (8, 250)
            self.ref_audio_tokens = T()
            self.ref_text = "متنِ مرجعِ بدلی."

    class FakeTok(object):
        unk_token_id = 3

        def __call__(self, t, add_special_tokens=False):
            class O(object):
                pass
            o = O(); o.input_ids = list(range(10, 10 + len(t) // 2))
            return o

        def decode(self, ids):
            return txt

    class FakeCfg(object):
        frame_rate = 25.0

    class FakeAT(object):
        config = FakeCfg()

    class FakeModel(object):
        sampling_rate = 24000

        def __init__(self):
            self.text_tokenizer = FakeTok()
            self.audio_tokenizer = FakeAT()

        def parameters(self):
            return []

        def load_asr_model(self):
            pass

        def transcribe(self, a):
            return "متنِ مرجعِ بدلی"

        def create_voice_clone_prompt(self, ref_audio=None, ref_text=None):
            return FakePrompt()

        def generate(self, **kw):
            calls.append(kw)
            import numpy as _np
            return [_np.zeros(24000 * 5, dtype="float32")]

    sys.modules["omnivoice"].OmniVoice = types.SimpleNamespace(
        from_pretrained=lambda p, **kw: FakeModel())
    sys.modules["huggingface_hub"].snapshot_download = lambda r, **kw: w2
    # ══ وصله‌ای که برداشته نشود، آزمونِ بعدی را می‌شکند ══
    # این خط `soundfile.write` را **سراسری** عوض می‌کرد و هیچ‌وقت
    # برنمی‌گرداند. بخشِ ۳۲ که چند صد خط پایین‌تر اضافه شد، خروجی‌اش
    # پنج‌ثانیه‌ای درمی‌آمد در حالی که مبدأ چهار ثانیه بود — و آزمونِ
    # «طول حفظ شد» می‌افتاد، بی آنکه هیچ ربطی به کدِ سنجیده‌شده داشته
    # باشد. یک وصلهٔ نشت‌کرده، آزمونی می‌سازد که دربارهٔ خودش دروغ
    # می‌گوید.
    realSfWrite = sys.modules["soundfile"].write
    sys.modules["soundfile"].write = lambda p, a, sr: wav(p, 5.0)
    io.open(os.path.join(w2, "README.md"), "w", encoding="utf-8").write(
        "---\nlicense: apache-2.0\n---\nکارتِ مدلِ بدلی\n")

    realCut2 = V.cutAtPause_
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 9.0), 9.0, 4)
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "omnivoice"}; V.OPT["_out"] = w2
        V.OPT["f5_nfe"] = "32"
        V.OPT["ref_text"] = "متنِ مرجعِ بدلی"
        made2 = V.run_omnivoice(wav(os.path.join(w2, "r.wav"), 30.0), "", txt, w2)
        rep2 = json.load(io.open(os.path.join(w2, "report-omnivoice.json"),
                                 encoding="utf-8"))
    finally:
        V.cutAtPause_ = realCut2

    eq(os.path.basename(made2), "omnivoice_tashkil.wav",
       "خروجیِ برگشتی همان متنِ اعراب‌دار است — ورودیِ واقعیِ موتور")

    eq(rep2["model_facts"]["weights_license"], "apache-2.0",
       "پروانهٔ وزن‌ها از کارتِ مدل خوانده می‌شود، نه از پروانهٔ کد")
    eq(all(v.get("realtime_factor") is not None for v in rep2["variants"]), True,
       "نسبتِ سرعت برای هر اجرا جدا نوشته می‌شود، نه یکی برای همه")
    eq(rep2["vocab_audit"]["unknown_tokens"], 0, "ممیزیِ واژگان اجرا می‌شود")
    eq(calls[0]["language"], "fa", "زبان صریحاً fa فرستاده می‌شود")
    eq(calls[0]["duration"] > 0, True, "و بودجهٔ زمانِ اصلاح‌شده پاس داده می‌شود")
    eq(rep2["ref_text_source"].startswith("دست‌نویس"), True,
       "متنِ دست‌نویس استفاده می‌شود وقتی داده شده")

    # ══ و سدِ بودجه باید واقعاً ببندد ══
    # این سد به‌خاطرِ اجرای #۱۱ هست: صد و پنجاه دقیقه خرج شد و هیچ فایلی
    # نماند. سدی که آزموده نشود، همان شکلی است که این ریپو بارها خورده —
    # کدی که نوشته و شرح داده شده و هرگز اجرا نشده.
    import time as _time
    calls2 = []

    class SlowModel(FakeModel):
        def generate(self, **kw):
            calls2.append(kw)
            _time.sleep(1.1)
            import numpy as _np
            return [_np.zeros(24000 * 5, dtype="float32")]

    sys.modules["omnivoice"].OmniVoice = types.SimpleNamespace(
        from_pretrained=lambda p, **kw: SlowModel())
    realBudget = V.OMNI_BUDGET_SEC
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 9.0), 9.0, 4)
    try:
        V.OMNI_BUDGET_SEC = 1   # اولی ~۱٫۱ ثانیه می‌بَرد، پس گذشته+برآورد از یک می‌گذرد
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "omnivoice"}; V.OPT["_out"] = w2
        V.OPT["f5_nfe"] = "32"; V.OPT["ref_text"] = "متنِ مرجعِ بدلی"
        V.run_omnivoice(wav(os.path.join(w2, "r.wav"), 30.0), "", txt, w2)
        rep3 = json.load(io.open(os.path.join(w2, "report-omnivoice.json"),
                                 encoding="utf-8"))
    finally:
        V.OMNI_BUDGET_SEC = realBudget
        V.cutAtPause_ = realCut2
    eq(len(calls2), 1,
       "وقتی برآوردِ اجرای دوم از بودجه بگذرد، اجرا نمی‌شود")
    eq("skipped" in rep3["variants"][1], True,
       "و دلیلش در گزارش می‌آید — نه اینکه بی‌صدا غیب شود")
    V.OPT.clear()

    # ══ ۹ — سه فهرست که باید با هم بخوانند ══
    # `removeTriggers` در خودِ موتور ده نامِ دست‌نویس داشت و سه زمان‌بندیِ
    # تازه را جا گذاشت — یک سال بی‌صدا. اینجا همان شکل سه‌جاست: تعریفِ
    # موتور، اجراکننده‌اش، و گزینهٔ فرم. هر کدام بدونِ دیگری یعنی
    # «انتخاب می‌شود و هیچ نمی‌کند» یا «هست و از فرم نمی‌شود صدایش کرد».
    print("۹ — هم‌خوانیِ فهرستِ موتورها")
    eq(sorted(V.ENGINES), sorted(V.RUNNERS),
       "هر موتور هم تعریف دارد هم اجراکننده")
    wf = io.open(os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), ".github", "workflows", "voice-lab.yml"),
        encoding="utf-8").read()
    m = re.search(r"options: \[([^\]]+)\]", wf)
    opts = set(x.strip() for x in m.group(1).split(",")) if m else set()
    eq(sorted(set(V.ENGINES) - opts), [],
       "هر موتور از فرم قابلِ انتخاب است")
    eq(sorted(opts - set(V.ENGINES) - {"all", "scan-only"}), [],
       "و هیچ گزینهٔ فرمی به هیچ‌جا اشاره نمی‌کند")
    # ══ و اینجا `search` غلط بود ══
    # اولین `engines=…`ی که در فایل می‌آید `[]` است (گزینهٔ scan-only).
    # با `search` حلقه روی فهرستِ خالی می‌چرخید و آزمون **بی هیچ سنجشی**
    # سبز می‌شد. دقیقاً همان چیزی که این بخش برای گرفتنش نوشته شده.
    plans = [json.loads(x) for x in re.findall(r"engines=(\[[^\]]*\])' >>", wf)]
    named = [n for p_ in plans for n in p_]
    eq(len(named) > 0, True, "فهرستِ «همه» در گردش‌کار پیدا شد (%d نام)" % len(named))
    for name in named:
        eq(name in V.ENGINES, True, "«همه» موتورِ موجود صدا می‌زند: %s" % name)

    # ══ ۱۰ — مسیرِ IPA هرگز از CLI نمی‌گذرد ══
    # اندازه‌گیریِ قطعی روی متنِ آزمونِ خودمان: `convert_char_to_pinyin`
    # که CLI همیشه اجرا می‌کند، IPA را از ۱۳ فاصله به ۲۷ فاصله می‌بَرد —
    # «bæɾɾæsiːje» می‌شود «bæɾɾæ siː je». روی متنِ **فارسی** هیچ کاری
    # نمی‌کند (۱۳ → ۱۳)، پس فقط همان مسیری خراب بود که بهترین نتیجه را
    # داده بود. بستهٔ رسمیِ خودِ سازنده آن تابع را کنار می‌گذارد.
    # این آزمون قراردادِ اصلاح را نگه می‌دارد: با الفبای ipa، هیچ فرمانی
    # به f5-tts_infer-cli نمی‌رود.
    print("۱۰ — مسیرِ IPA از بستهٔ رسمی می‌گذرد، نه CLI")
    w3 = tempfile.mkdtemp()
    synths, cmds = [], []

    class FakeTTS(object):
        def __init__(self, model_id=None, device=None):
            self.model_id = model_id

        def synthesize(self, ipa, reference_audio=None, reference_ipa=None,
                       output=None, **kw):
            synths.append({"ipa": ipa, "ref": reference_ipa, "out": str(output)})
            wav(str(output), 6.0)
            return output

    class FakeG2P(object):
        def __init__(self, device=None):
            pass

        def convert(self, t, **kw):
            return "ɡ2pː " + t[:20]

    pk = types.ModuleType("persian_ipa_to_speech_f5")
    pk.PersianIPAToSpeechF5 = FakeTTS
    pk.PersianTextToIPA = FakeG2P
    sys.modules["persian_ipa_to_speech_f5"] = pk

    realSh3, realCut3 = V.sh, V.cutAtPause_
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 10.0), 10.0, 5)
    V.sh = lambda cmd, **kw: (cmds.append(cmd), R())[-1]
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "f5"}; V.OPT["_out"] = w3
        V.OPT["alphabet"] = "ipa"
        V.OPT["f5_ckpt"] = "KiaBush/Persian-IPA-to-Speech-F5"
        V.OPT["f5_vocab"] = ""; V.OPT["f5_nfe"] = "32"
        V.OPT["f5_ref_text"] = "متنِ مرجع"
        V.OPT["text_fa"] = txt
        made3 = V.run_f5(wav(os.path.join(w3, "r.wav"), 30.0), "",
                         "dæɾ bæɾɾæsiːje mæʔɾefætʃenɒːsiː", w3)
        rep4 = json.load(io.open(os.path.join(w3, "report-f5.json"),
                                 encoding="utf-8"))
    finally:
        V.sh, V.cutAtPause_ = realSh3, realCut3

    eq([c for c in cmds if c and str(c[0]).endswith("f5-tts_infer-cli")], [],
       "هیچ فرمانی به CLI نرفت — وگرنه IPA دوباره تکه‌تکه می‌شد")
    eq(len(synths), 2, "دو اجرا: برگردانِ من، و G2Pِ رسمی")
    eq(synths[0]["ipa"].startswith("dæɾ"), True, "اولی همان برگردانِ ماست")
    eq(synths[1]["ipa"].startswith("ɡ2pː"), True, "دومی از G2Pِ خودِ مدل آمد")
    eq(rep4["g2p_compare"]["same"], False,
       "و تفاوتِ دو برگردان ثبت می‌شود — تنها راهِ فهمیدنِ اینکه نقص از کدام است")
    eq(os.path.basename(made3), "f5ipa-raw.wav", "خروجیِ برگشتی درست است")
    V.OPT.clear()

    # ══ ۱۱ — هشدارِ متنِ مرجعِ بی‌اعراب واقعاً بلند می‌شود ══
    # `coverage` از اول وجود داشت و فقط روی متنِ **تولید** اجرا می‌شد؛
    # متنِ مرجع — که f5 آن را در همان رشته به مدل می‌دهد — هرگز سنجیده
    # نشد. و اولین نسخهٔ خودِ این هشدار به کلیدِ `dry` نگاه می‌کرد که
    # وجود ندارد، پس هیچ‌وقت بلند نمی‌شد. آزمون هر دو را می‌بندد.
    print("۱۱ — متنِ مرجعِ بی‌اعراب هشدار می‌گیرد")
    bare = ("کلنجار می رفت و عرق میریخت تا مغز استخوانش خسته بود اما حس "
            "میکرد ماهی هم خسته شده و دارد کم کم بالا می آید")
    vow = ("کَلَنجار می رَفت وَ عَرَق میریخت تا مَغزِ اُستُخوانَش خَستِه بود "
           "اَمّا حِس میکَرد ماهی هَم خَستِه شُدِه وَ دارَد کَم کَم بالا می آیَد")
    import fa2latin as F
    eq(F.coverage(vow)["vowelless_count"], 0,
       "متنِ اعراب‌دار هیچ خوشهٔ همخوانی نمی‌سازد")
    eq(F.coverage(bare)["vowelless_count"] > 5, True,
       "و بی‌اعرابش می‌سازد (%d واژه)" % F.coverage(bare)["vowelless_count"])

    w4 = tempfile.mkdtemp()
    synths4 = []

    class FakeTTS4(object):
        def __init__(self, model_id=None, device=None):
            pass

        def synthesize(self, ipa, reference_audio=None, reference_ipa=None,
                       output=None, **kw):
            synths4.append(reference_ipa)
            wav(str(output), 6.0)
            return output

    sys.modules["persian_ipa_to_speech_f5"].PersianIPAToSpeechF5 = FakeTTS4
    realCut4 = V.cutAtPause_
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 10.0), 10.0, 5)
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "f5"}; V.OPT["_out"] = w4
        V.OPT["alphabet"] = "ipa"; V.OPT["f5_nfe"] = "32"
        V.OPT["f5_ckpt"] = "KiaBush/Persian-IPA-to-Speech-F5"; V.OPT["f5_vocab"] = ""
        V.OPT["f5_ref_text"] = bare
        V.OPT["text_fa"] = vow
        V.run_f5(wav(os.path.join(w4, "r.wav"), 30.0), "", "dæɾ bæɾɾæsiː", w4)
        rep5 = json.load(io.open(os.path.join(w4, "report-f5.json"),
                                 encoding="utf-8"))
    finally:
        V.cutAtPause_ = realCut4
    eq("ref_text_warning" in rep5, True,
       "متنِ مرجعِ بی‌اعراب در گزارش هشدار می‌گیرد — نه اینکه بی‌صدا بد خوانده شود")
    eq(rep5["ref_coverage"]["vowelless_count"] > 5, True,
       "و شمارِ واژه‌های خراب ثبت می‌شود")
    V.OPT.clear()

    # ══ ۱۲ — نشانه‌گذاریِ بیرونِ واژگانِ مدل ══
    # متنِ آزمون فقط «,» و «.» داشت، پس هرگز دیده نشد که متنِ واقعیِ یک
    # قسمت پر از «—» و «…» است و بستهٔ رسمی برای نویسهٔ ناشناخته **خطا**
    # می‌دهد. یعنی روزِ اول که متنِ واقعی برود، هیچ صوتی ساخته نمی‌شود.
    print("۱۲ — نشانه‌های تایپوگرافیک به معادلِ آوایی می‌روند")
    got = V.ipaSafe_("ʔuː ɡoft — sokuːt… «bæle»")
    eq("—" in got or "…" in got or "«" in got, False,
       "خط‌تیره و سه‌نقطه و گیومه رفتند: %r" % got)
    eq(got.count(","), 1, "خط‌تیره ویرگول شد (مکثِ هم‌اندازه)")
    eq(got.count("."), 1, "و سه‌نقطه نقطه شد")
    eq(V.ipaSafe_("dæɾ bæɾ, ʔæst."), "dæɾ bæɾ, ʔæst.",
       "و متنی که مشکل ندارد دست‌نخورده می‌مانَد")

    # ══ ۱۳ — نامی که داده است و مثلِ تابع صدا زده شده ══
    # در `voicescan` تابعِ گزارشی به اسمِ `out` نوشتم؛ ولی `out` در همان
    # تابع یک **دیکشنری** است. پایتون تا لحظهٔ اجرا چیزی نمی‌گوید، و آن
    # لحظه وسطِ کارِ اسکن است. نه نحو این را می‌گیرد نه هیچ آزمونی که
    # شبکه لازم داشته باشد. پس خودِ درخت را می‌خوانیم.
    print("۱۳ — دادهٔ محلی مثلِ تابع صدا زده نشده")
    import ast as _ast
    bad = []
    # ══ فهرستِ فایل‌ها هم می‌تواند کهنه شود ══
    # این ریپو یک درسِ ثبت‌شده دارد: گاردی که یک در را نبیند، آن در را
    # باز می‌گذارد (بخشِ «۴٫۲» در راهنما). پس به‌جای فهرستِ دستی، هر
    # پایتونِ `tools/` اسکن می‌شود — ماژولِ بعدی که اضافه شود، خودش
    # پوشش داده می‌شود، بی آنکه کسی یادش بیفتد.
    toolsDir = os.path.dirname(os.path.abspath(__file__))
    pyFiles = sorted(f for f in os.listdir(toolsDir) if f.endswith(".py"))
    eq("dsprep.py" in pyFiles and "rvcpipe.py" in pyFiles, True,
       "ماژول‌های تازه در دامنهٔ اسکن‌اند (%d فایل)" % len(pyFiles))
    for fn in pyFiles:
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), fn)
        tree = _ast.parse(io.open(path, encoding="utf-8").read())
        for node in _ast.walk(tree):
            if not isinstance(node, (_ast.FunctionDef, _ast.AsyncFunctionDef)):
                continue
            data = set()
            for st in _ast.walk(node):
                if isinstance(st, _ast.Assign):
                    for t in st.targets:
                        if isinstance(t, _ast.Name) and isinstance(
                                st.value, (_ast.Dict, _ast.List, _ast.Set,
                                           _ast.Constant, _ast.DictComp,
                                           _ast.ListComp)):
                            data.add(t.id)
            for st in _ast.walk(node):
                if (isinstance(st, _ast.Call) and isinstance(st.func, _ast.Name)
                        and st.func.id in data):
                    bad.append("%s:%d %s()" % (fn, st.lineno, st.func.id))
    eq(bad, [], "هیچ نامِ داده‌ای مثلِ تابع صدا زده نشده")

    # ══ ۱۴ — دو انتخابِ نمونه روی هم نمی‌نویسند ══
    # نام‌های خروجیِ `refAudition_` ثابت بودند (`reference.wav`). وقتی
    # همین تابع را برای صوتِ **مبدأ** هم صدا زدم، فراخوانِ دوم نمونهٔ
    # صدای انتخاب‌شده را روی خودش می‌نوشت و آزمایش با صوتِ اشتباه جلو
    # می‌رفت، بی هیچ خطایی.
    print("۱۴ — انتخابِ نمونه و انتخابِ مبدأ روی هم نمی‌نویسند")
    d3 = tempfile.mkdtemp()
    realSh4, realScore, realWav = V.sh, V.refScore_, V.to_wav

    def shMake(cmd, **kw):
        wav(cmd[-1], 3.0)          # هر فرمانی فایلِ آخرش را می‌سازد
        return R()

    V.sh = shMake
    V.refScore_ = lambda p, **kw: {"score": 1.0, "at_second": 0.0}
    V.to_wav = lambda src, dst, **kw: wav(dst, 3.0)
    try:
        r1 = V.refAudition_([wav(os.path.join(d3, "x.wav"), 30.0)], d3, 5)
        r2 = V.refAudition_([wav(os.path.join(d3, "y.wav"), 30.0)], d3, 5,
                            tag="source-gemini")
    finally:
        V.sh, V.refScore_, V.to_wav = realSh4, realScore, realWav
    eq(r1 != r2, True, "دو فایلِ جدا ساخته می‌شود (%s / %s)"
       % (os.path.basename(r1), os.path.basename(r2)))
    eq(os.path.exists(r1) and os.path.exists(r2), True, "و هر دو سرِ جایشان‌اند")
    # ══ نامزدها نباید در پوشهٔ خروجی بمانند ══
    # اجرای #۴۲: چهار ضبطِ نیم‌ساعته، و بایگانی ۹۸ مگابایت شد چون هر
    # نامزد تا ده دقیقه صوتِ خام در `out` می‌نشست. آن‌ها میانی‌اند.
    leftovers = [x for x in os.listdir(d3) if "-cand" in x]
    eq(leftovers, [], "هیچ فایلِ نامزدی در پوشهٔ خروجی نمی‌مانَد")

    eq("source-gemini_audition" in V.OPT, True,
       "و گزارشِ هرکدام جدا ثبت می‌شود")
    V.OPT.clear()

    # ══ ۱۵ — مسیرِ کاملِ moss روی بدل‌ها ══
    # هر موتورِ تازه‌ای که ساختم، اولین خطایش ربطی به مدل نداشت: نامِ
    # نقطهٔ ورود، ترتیبِ اجراها، فایلی که ساخته نشد. اینجا هم همان.
    # و یک چیزِ مخصوصِ این موتور: اثباتِ اینکه وصلهٔ فارسی **اثر گذاشت**.
    print("۱۵ — مسیرِ کاملِ moss روی بدل‌ها")
    w5 = tempfile.mkdtemp()
    gens = []

    class FakeParam(object):
        def __init__(self, v):
            self.v = v

        def numel(self):
            return 100

        def detach(self):
            return self

        def float(self):
            return self

        def abs(self):
            return self

        def sum(self):
            return self

        def item(self):
            return self.v

    class FakeMoss(object):
        vals = [1.0]
        lora = []          # نام‌های پارامترِ LoRA — سنجهٔ درست همین است

        def eval(self):
            return self

        def float(self):
            return self

        def parameters(self):
            return [FakeParam(v) for v in self.vals]

        def named_parameters(self):
            out_ = [("llm.layer0.weight", FakeParam(1.0))]
            out_ += [(n, FakeParam(0.5)) for n in self.lora]
            return out_

    class FakeInf(object):
        def __init__(self, *a, **kw):
            pass

        def generate(self, text=None, **kw):
            gens.append(text[0])
            return [[[1, 2, 3]]]

    class FakeCodec(object):
        def eval(self):
            return self

        def float(self):
            return self

        def decode(self, t, **kw):
            # شکلِ واقعی: dec["audio"][0].cpu().detach()
            leaf = types.SimpleNamespace()
            leaf.cpu = lambda: leaf
            leaf.detach = lambda: leaf
            return {"audio": [leaf]}

    mm = types.ModuleType("mossttsrealtime.modeling_mossttsrealtime")
    mm.MossTTSRealtime = types.SimpleNamespace(
        from_pretrained=lambda *a, **kw: FakeMoss())
    inm = types.ModuleType("inferencer")
    inm.MossTTSRealtimeInference = FakeInf
    pf = types.ModuleType("peft")
    # ══ چرا سنجه عوض شد ══
    # نسخهٔ اول قدرمطلقِ چهل پارامترِ **اول** را پیش و پس مقایسه می‌کرد.
    # ولی PeftModel مدل را می‌پیچد، پس ترتیبِ parameters() عوض می‌شود و
    # آن عدد تفاوتِ **ترتیب** را نشان می‌داد، نه تفاوتِ وزن. گزارش
    # «نشست» می‌داد و هیچ چیزی را ثابت نمی‌کرد.
    # پارامترهای LoRA نام دارند؛ سنجهٔ بی‌ابهام همان است.
    pf.PeftModel = types.SimpleNamespace(
        from_pretrained=lambda m, i, **kw: type(
            "L", (FakeMoss,), {"lora": ["llm.layer0.lora_A.weight",
                                        "llm.layer0.lora_B.weight"]})())
    tr = types.ModuleType("transformers")
    tr.AutoTokenizer = types.SimpleNamespace(from_pretrained=lambda *a, **kw: None)
    tr.AutoModel = types.SimpleNamespace(from_pretrained=lambda *a, **kw: FakeCodec())
    ta = types.ModuleType("torchaudio")
    ta.save = lambda p_, a_, sr: wav(p_, 7.0)
    tch = sys.modules.get("torch") or types.ModuleType("torch")
    tch.tensor = lambda x: types.SimpleNamespace(permute=lambda *a: x)
    for n, m in (("mossttsrealtime", types.ModuleType("mossttsrealtime")),
                 ("mossttsrealtime.modeling_mossttsrealtime", mm),
                 ("inferencer", inm), ("peft", pf), ("transformers", tr),
                 ("torchaudio", ta), ("torch", tch)):
        sys.modules[n] = m

    realSh5 = V.sh
    V.sh = lambda cmd, **kw: (os.makedirs(cmd[-1], exist_ok=True), R())[-1]
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 11.5), 11.5, 4)
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "moss"}; V.OPT["_out"] = w5
        made5 = V.run_moss(wav(os.path.join(w5, "r.wav"), 30.0), "", txt, w5)
        rep6 = json.load(io.open(os.path.join(w5, "report-moss.json"),
                                 encoding="utf-8"))
    finally:
        sys.modules["soundfile"].write = realSfWrite
        V.sh, V.cutAtPause_ = realSh5, realCut2

    eq(os.path.basename(made5), "moss_lora.wav", "خروجیِ برگشتی درست است")
    eq(len(gens), 2, "دو اجرا: با وصله، و شاهدِ بی‌وصله")
    eq(rep6["model_facts"]["lora"]["attached"], True,
       "و اثبات از روی **نامِ** پارامترهای LoRA، نه از ترتیبشان")
    eq(rep6["model_facts"]["lora"]["lora_params"], 2, "هر دو پارامتر دیده شد")
    eq("lora_warning" in rep6, False, "پس هشدارِ بی‌جا نمی‌دهد")
    V.OPT.clear()

    # و وقتی وصله هیچ وزنی را عوض نکند، همان‌جا هشدار می‌دهد — وگرنه
    # «فارسیِ بد» را به حسابِ وصله‌ای می‌گذاشتیم که اصلاً اجرا نشده.
    pf.PeftModel = types.SimpleNamespace(from_pretrained=lambda m, i, **kw: FakeMoss())
    V.sh = lambda cmd, **kw: (os.makedirs(cmd[-1], exist_ok=True), R())[-1]
    V.cutAtPause_ = lambda src, dst, **kw: (wav(dst, 11.5), 11.5, 4)
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "moss"}; V.OPT["_out"] = tempfile.mkdtemp()
        V.run_moss(wav(os.path.join(w5, "r2.wav"), 30.0), "", txt, V.OPT["_out"])
        rep7 = json.load(io.open(os.path.join(V.OPT["_out"], "report-moss.json"),
                                 encoding="utf-8"))
    finally:
        V.sh, V.cutAtPause_ = realSh5, realCut2
    eq("lora_warning" in rep7, True,
       "وصله‌ای که هیچ وزنی را عوض نکند، هشدار می‌گیرد")
    V.OPT.clear()

    # ══ ۱۶ — هر موتوری که torchaudio دارد، torchcodec هم می‌خواهد ══
    # سه بار: اجرای #۳ (f5 و seedvc، یک علت و دو شکستِ ظاهراً بی‌ربط) و
    # حالا MOSS با همان پیامِ «TorchCodec is required». دانش در ریپو بود —
    # در ردیفِ seedvc نوشته شده بود — ولی به موتورِ بعدی نرسید.
    # دانستنی که در یک ردیف باشد و در ردیفِ بعدی نباشد، دانسته نیست.
    print("۱۶ — وابستگیِ صوتی جا نمی‌مانَد")
    miss = [k for k, v in V.ENGINES.items()
            if any("torchaudio" in p_ for p_ in v["pip"])
            and not any("torchcodec" in p_ for p_ in v["pip"])]
    eq(miss, [], "هیچ موتوری torchaudio بی torchcodec ندارد")

    # ══ ۱۷ — پینِ مخزن خوانده می‌شود، نه به یاد آورده ══
    # سه سدِ پیاپیِ MOSS هر سه محیطی بودند و هیچ‌کدام ربطی به فارسی
    # نداشت. آخری «create_causal_mask() got an unexpected keyword
    # argument» بود — پیامی که نمی‌گوید «نسخه‌ات غلط است». مخزن پینش را
    # در pyproject نوشته بود و من کارتِ مدل را برای API خوانده بودم و
    # pyproject را نه.
    print("۱۷ — پینِ مخزن با نصبِ واقعی سنجیده می‌شود")
    d4 = tempfile.mkdtemp()
    io.open(os.path.join(d4, "pyproject.toml"), "w", encoding="utf-8").write(
        'dependencies = [\n  "transformers==5.0.0",\n  "numpy==0.0.1",\n'
        '  "torch>=2.4",\n]\n')
    pins = V.mossPins_(d4)
    eq(sorted(pins["pinned"]), ["numpy", "transformers"],
       "فقط پینِ دقیق (==) شمرده می‌شود، نه >= ")
    eq("numpy" in pins["mismatch"], True,
       "و اختلافِ نسخه گزارش می‌شود، نه اینکه خطای رمزی بدهد")
    eq(V.mossPins_(tempfile.mkdtemp()).get("note") is not None, True,
       "و نبودِ pyproject خودش خطا نمی‌سازد")

    # ══ ۱۸ — مسیرِ کاملِ openvoice روی بدل‌ها ══
    # و مخصوصاً یک چیز: چیدمانِ چک‌پوینت. نشانیِ رسمی‌شان روی S3 مرده
    # است (۴۰۴) و از HF می‌آید؛ اگر نامِ فایل‌ها فرق کند، کد باید فهرستِ
    # آنچه آمده را بگوید، نه اینکه با «فایل نیست» بمیرد.
    print("۱۸ — مسیرِ کاملِ openvoice روی بدل‌ها")
    w6 = tempfile.mkdtemp()
    ckdir = tempfile.mkdtemp()
    os.makedirs(os.path.join(ckdir, "converter"), exist_ok=True)
    io.open(os.path.join(ckdir, "converter", "config.json"), "w").write("{}")
    io.open(os.path.join(ckdir, "converter", "checkpoint.pth"), "w").write("x")
    convs = []

    class FakeTCC(object):
        # ══ بدل باید **کدِ آن‌ها** را تقلید کند، نه فرضِ من از آن را ══
        # نسخهٔ اولِ بدل پرچم را نادیده می‌گرفت (پس «wavmark نیست» را
        # ندید). نسخهٔ دوم پرچم را قبول می‌کرد (پس ندید که سازندهٔ واقعی
        # همهٔ kwargs را به کلاسِ پایه پاس می‌دهد و آنجا رد می‌شود).
        # کدِ واقعی این است، و بدل حالا همان است:
        #     def __init__(self, *args, **kwargs):
        #         super().__init__(*args, **kwargs)   ← پرچم را نمی‌شناسد
        #         if kwargs.get('enable_watermark', True): import wavmark
        def __init__(self, *args, **kwargs):
            if "enable_watermark" in kwargs:
                raise TypeError("OpenVoiceBaseClass.__init__() got an "
                                "unexpected keyword argument 'enable_watermark'")
            if kwargs.get("enable_watermark", True):
                __import__("wavmark")
            self.cfg = args[0] if args else None
            self.watermark_model = object()

        def load_ckpt(self, p_):
            self.pth = p_

        def extract_se(self, refs):
            return ("se", tuple(refs) if isinstance(refs, list) else refs)

        def convert(self, audio_src_path=None, src_se=None, tgt_se=None,
                    output_path=None, tau=None):
            convs.append({"src": src_se, "tgt": tgt_se, "tau": tau})
            wav(str(output_path), 9.0)

    ovapi = types.ModuleType("openvoice.api")
    ovapi.ToneColorConverter = FakeTCC
    sys.modules["openvoice"] = types.ModuleType("openvoice")
    sys.modules["openvoice.api"] = ovapi
    sys.modules["huggingface_hub"].snapshot_download = lambda r, **kw: ckdir

    realSh6, realWav6 = V.sh, V.to_wav
    V.sh = lambda cmd, **kw: (os.makedirs(cmd[-1], exist_ok=True), R())[-1]
    V.to_wav = lambda s_, d_, **kw: wav(d_, 8.0)
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "openvoice"}; V.OPT["_out"] = w6
        V.OPT["ref_inputs"] = ["a.input", "b.input", "c.input"]
        made6 = V.run_openvoice(wav(os.path.join(w6, "r.wav"), 11.0),
                                wav(os.path.join(w6, "s.wav"), 12.0), txt, w6)
        rep8 = json.load(io.open(os.path.join(w6, "report-openvoice.json"),
                                 encoding="utf-8"))
    finally:
        V.sh, V.to_wav = realSh6, realWav6

    eq(os.path.basename(made6), "openvoice_whole.wav", "خروجیِ برگشتی همان شاهد است")
    eq([v["name"] for v in rep8["variants"]], ["whole", "clean"],
       "دو اجرا، و متغیرشان تمیزیِ مرجع است")
    eq([c["tau"] for c in convs], [0.3, 0.3],
       "tau در هر دو یکی است — آن پرسش بسته شد")
    eq(len(rep8["variants"][0]["refs"]), 3, "شاهد از هر سه ضبطِ کامل تغذیه می‌شود")
    eq("ref_clean" in rep8, True, "و گزارشِ تمیزکاری ثبت می‌شود")
    eq(rep8["model_facts"]["weights"], "checkpoint.pth",
       "وزن در چیدمانِ چک‌پوینت پیدا می‌شود")
    V.OPT.clear()

    # ══ ۱۹ — پالایهٔ مرجع: تصمیم، و قاعدهٔ «هرگز تهی نکن» ══
    # روی صوتِ واقعی هم آزمودمش (نیمی موزیک‌دار: دو تکهٔ آلوده افتادند و
    # سه تکهٔ پاک ماندند)، ولی آن به ffmpeg نیاز دارد و کارِ اسکن ندارد.
    # آنچه اینجا می‌ماند منطقِ تصمیم است — و مهم‌تر از همه این‌که پالایه
    # نتواند همه‌چیز را بیندازد. پالایه‌ای که می‌تواند ورودی را تهی کند،
    # اول باید به خودش شک کند.
    print("۱۹ — پالایهٔ مرجع هرگز تهی برنمی‌گردد")
    d5 = tempfile.mkdtemp()
    realSh7, realScore7, realProbe = V.sh, V.refScore_, V.probe
    V.probe = lambda p_: {"seconds": 150.0}
    V.sh = lambda cmd, **kw: (wav(cmd[-1], 30.0), R())[-1]
    try:
        # هیچ تکه‌ای از سد نمی‌گذرد — باید بهترین بماند، نه هیچ‌کدام
        V.refScore_ = lambda p_, **kw: {"window_floor_db": -10.0, "speech_pct": 20}
        dst, log = V.refClean_(wav(os.path.join(d5, "a.wav"), 150.0), d5, "z")
        eq(log["chunks_kept"], 1,
           "وقتی هیچ تکه‌ای از سد نگذرد، بهترین می‌مانَد — نه هیچ‌کدام")
        # و وقتی همه خوب‌اند، همه می‌مانند
        V.refScore_ = lambda p_, **kw: {"window_floor_db": -60.0, "speech_pct": 70}
        dst2, log2 = V.refClean_(wav(os.path.join(d5, "b.wav"), 150.0), d5, "y")
        eq(log2["chunks_kept"], log2["chunks_total"],
           "و وقتی همه تمیزند، هیچ‌کدام بی‌جهت کنار گذاشته نمی‌شود")
    finally:
        V.sh, V.refScore_, V.probe = realSh7, realScore7, realProbe

    # ── ۲۰ ─────────────────────────────────────────────────────────────
    # جدولِ خلاصهٔ پروانه‌ها کلیدهای همان ردیفی را می‌خوانَد که خودِ اسکن
    # می‌سازد. اولین نسخه‌اش `row["repo"]` را خواند — کلیدی که هیچ‌جا
    # نوشته نمی‌شود — و ستونِ نام برای هر ده نامزد `None` درمی‌آمد بی
    # هیچ خطایی. همان شکلِ همیشگی: خواننده‌ای که کلیدی می‌خواهد که
    # نویسنده هرگز ننوشته. اینجا از خودِ سورس پرسیده می‌شود، نه از حافظه.
    print("۲۰ — خلاصهٔ پروانه‌ها فقط کلیدهای موجود را می‌خوانَد")
    import ast as _a
    src = io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "voicescan.py"), encoding="utf-8").read()
    tree = _a.parse(src)
    fns = {n.name: n for n in tree.body
           if isinstance(n, (_a.FunctionDef, _a.AsyncFunctionDef))}
    eq(sorted(set(["main", "licSummary_"]) - set(fns)), [],
       "هر دو تابع در سورس هستند")

    written = set()
    for st in _a.walk(fns["main"]):
        # row = {"id": ..., "files": ...}
        if (isinstance(st, _a.Assign) and len(st.targets) == 1
                and isinstance(st.targets[0], _a.Name)
                and st.targets[0].id == "row"
                and isinstance(st.value, _a.Dict)):
            for k in st.value.keys:
                if isinstance(k, _a.Constant):
                    written.add(k.value)
        # row["meta"] = ...
        if isinstance(st, _a.Assign):
            for t in st.targets:
                if (isinstance(t, _a.Subscript) and isinstance(t.value, _a.Name)
                        and t.value.id == "row"
                        and isinstance(t.slice, _a.Constant)):
                    written.add(t.slice.value)

    read = set()
    for st in _a.walk(fns["licSummary_"]):
        if (isinstance(st, _a.Call) and isinstance(st.func, _a.Attribute)
                and st.func.attr == "get"
                and isinstance(st.func.value, _a.Name)
                and st.func.value.id == "row" and st.args
                and isinstance(st.args[0], _a.Constant)):
            read.add(st.args[0].value)
        if (isinstance(st, _a.Subscript) and isinstance(st.value, _a.Name)
                and st.value.id == "row"
                and isinstance(st.slice, _a.Constant)):
            read.add(st.slice.value)
    eq(sorted(read - written), [],
       "هیچ کلیدی خوانده نمی‌شود که اسکن ننوشته باشد (نوشته: %s)"
       % sorted(written))

    # و حکم‌ها: ناشناخته «نامعلوم» است، نه «آزاد». حدسِ خوش‌بینانه همان
    # چیزی است که یک بار XTTS را وارد کرد.
    import voicescan as S
    eq(S.licVerdict_("mit")[0], "آزاد", "MIT آزاد است")
    eq(S.licVerdict_("cc-by-nc-4.0")[0], "بسته", "غیرتجاری بسته است")
    eq(S.licVerdict_("")[0], "نامعلوم", "پروانهٔ نداشته نامعلوم است")
    eq(S.licVerdict_("some-new-license")[0], "نامعلوم",
       "پروانهٔ ناشناخته نامعلوم است، نه آزاد")
    buf = io.StringIO()
    realOut = sys.stdout
    sys.stdout = buf
    try:
        S.licSummary_({"candidates": [
            {"id": "a/b", "meta": {"license": "mit"}},
            {"id": "c/d", "meta_error": "403"},
        ]})
    finally:
        sys.stdout = realOut
    txt = buf.getvalue()
    eq("a/b" in txt and "c/d" in txt, True, "هر دو نامزد در جدول‌اند")
    eq("None" in txt, False, "هیچ ستونی None نیست")

    # ── ۲۱ ─────────────────────────────────────────────────────────────
    # چهار شناسهٔ درایو داده شد، سه مرجع به مدل رسید، و گزارش هیچ نگفت.
    # خطا فقط چاپ شده بود — و چاپ در لاگی که کسی تا آخر نمی‌خواندش
    # یعنی نگفتن. عدد باید در گزارش باشد، هم وقتی کم است هم وقتی درست
    # است؛ وگرنه نبودنِ هشدار را نمی‌شود از نگاه‌نکردن تشخیص داد.
    print("۲۱ — کم‌رسیدنِ مرجع‌ها در گزارش ثبت می‌شود")
    d6 = tempfile.mkdtemp()
    realWav8 = V.to_wav

    def _picky(src_, dst_, **kw):
        if "bad" in str(src_):
            raise RuntimeError("۴۰۴")
        return wav(dst_, 8.0)

    V.to_wav = _picky
    try:
        V.OPT.clear(); V.OPT["_rep"] = {"engine": "t"}; V.OPT["_out"] = d6
        got = V.refsPrepare_(["ok1", "bad2", "ok3"], d6, "p")
        eq(len(got), 2, "فقط مرجع‌های سالم برمی‌گردند")
        rp = V.OPT["ref_prepare"]
        eq((rp["asked"], rp["ready"]), (3, 2), "خواسته و رسیده هر دو ثبت‌اند")
        eq(rp["failed"][0]["index"], 2, "کدام یکی نرسید هم ثبت است")
        eq("warning" in rp, True, "و هشدار داده می‌شود")
        eq("ref_prepare" in json.loads(io.open(
            os.path.join(d6, "report-t.json"), encoding="utf-8").read()), True,
            "و در فایلِ گزارش نشسته، نه فقط در لاگ")

        # و وقتی همه سالم‌اند: عدد هست، هشدار نیست
        V.OPT.clear(); V.OPT["_rep"] = {"engine": "t"}; V.OPT["_out"] = d6
        V.refsPrepare_(["ok1", "ok2"], d6, "q")
        rp2 = V.OPT["ref_prepare"]
        eq((rp2["asked"], rp2["ready"]), (2, 2), "شمارش در حالتِ سالم هم هست")
        eq("warning" in rp2, False, "ولی هشدارِ بی‌جا نمی‌دهد")
    finally:
        V.to_wav = realWav8

    # ── ۲۲ ─────────────────────────────────────────────────────────────
    # زنجیرهٔ RVC روی ماشینِ دیگری اجرا می‌شود، پس اینجا هیچ‌وقت واقعاً
    # اجرا نمی‌شود — و چیزی که اجرا نمی‌شود، بی‌صدا خراب می‌ماند. این
    # بخش شکلِ آرگومان‌ها را نگه می‌دارد؛ همان‌هایی که از خودِ سورسِ RVC
    # خوانده شدند و هر کدام یک دامِ واقعی‌اند.
    print("۲۲ — شکلِ آرگومان‌های زنجیرهٔ RVC")
    import rvcpipe as P
    got = dict((n, c) for n, c in P.steps("ex", "/ds", "/root", n_p=2))
    eq(sorted(got), ["extract_f0", "extract_feature", "preprocess",
                     "train", "train_index"], "هر پنج قدم هست")

    # ══ هیچ قدمی با مسیرِ فایل اجرا نمی‌شود ══
    # اجرای #۳۷ اینجا افتاد: `python train/preprocess.py` پوشهٔ
    # `<root>/train` را اولِ sys.path می‌گذارد، و آنجا `train.py` هست که
    # بستهٔ `train/` را سایه می‌اندازد. `-m` تنها شکلی است که کار می‌کند.
    for name_, cmd_ in got.items():
        eq(cmd_[1], "-m", "%s با -m اجرا می‌شود" % name_)
        eq([a for a in cmd_ if a.endswith(".py")], [],
           "%s هیچ مسیرِ فایلی ندارد" % name_)

    def arg(cmd_, i):
        """آرگومانِ i-ام پس از نامِ ماژول — نه شمارهٔ ثابت در فهرست."""
        return cmd_[cmd_.index("-m") + 2 + i]

    # دامِ ۱: preprocess مسیرِ کامل می‌گیرد، train فقط نام. جابه‌جا شدنشان
    # پوشه‌ای می‌سازد که قدمِ بعدی پیدا نمی‌کند، بی خطای روشن.
    eq(arg(got["preprocess"], 3), "/root/logs/ex", "preprocess مسیرِ کامل می‌گیرد")
    eq(got["train"][got["train"].index("-e") + 1], "ex",
       "ولی train فقط نامِ تجربه را")

    # دامِ ۲: شاخهٔ CPU در extract_hubert_feature با شمارشِ argv انتخاب
    # می‌شود (`len(sys.argv) == 7`). یکی کم یا زیاد، به شاخهٔ GPU می‌افتد
    # و آرگومان‌ها را غلط می‌خوانَد.
    eq(len(got["extract_feature"]) - got["extract_feature"].index("-m") - 1, 7,
       "extract_hubert_feature دقیقاً ۷ آرگومان دارد (شاخهٔ CPU)")

    # دامِ ۳: بی `-sw 1` ساعت‌ها آموزش انجام می‌شود و مدلِ قابلِ‌استفاده
    # ساخته نمی‌شود — فقط چک‌پوینت‌های بزرگ.
    eq(got["train"][got["train"].index("-sw") + 1], "1",
       "پرچمِ ذخیرهٔ مدلِ نهایی روشن است")
    # `-l` باید از پارامتر بیاید: روی درایو فقط آخرین چک‌پوینت را
    # می‌خواهیم (وگرنه چند گیگابایت)، روی دیسکِ محلی فرقی ندارد.
    eq(got["train"][got["train"].index("-l") + 1], "0",
       "پیش‌فرض همهٔ چک‌پوینت‌ها نگه داشته می‌شوند")
    onlyLast = dict(P.steps("ex", "/ds", "/root", latest=1))["train"]
    eq(onlyLast[onlyLast.index("-l") + 1], "1",
       "و با latest=1 فقط آخری")

    # دامِ ۴: روی CPU پرچمِ -g نباید بیاید.
    eq("-g" in got["train"], False, "بی‌GPU پرچمِ -g اصلاً نمی‌آید")
    onGpu = dict(P.steps("ex", "/ds", "/root", gpus="0"))["train"]
    eq(onGpu[onGpu.index("-g") + 1], "0", "و با GPU می‌آید")
    eq(arg(dict(P.steps("ex", "/ds", "/root", gpus="0"))["extract_feature"], 0),
       "cuda", "و استخراجِ ویژگی هم روی cuda می‌رود")

    # نرخِ نمونه به هرتز تبدیل می‌شود، نه «40k» خام.
    eq(arg(got["preprocess"], 1), "40000", "نرخِ نمونه به هرتز داده می‌شود")
    eq(got["train"][got["train"].index("-sr") + 1], "40k",
       "ولی train همان «40k» را می‌خواهد")

    # و پایه‌های از پیش آموزش‌دیده باید با همان نرخ جفت باشند.
    tj = " ".join(got["train"])
    eq("f0G40k.pth" in tj and "f0D40k.pth" in tj, True,
       "پایهٔ G و D با نرخِ نمونه جفت‌اند")

    # torch در فهرستِ نصب نیست — در Colab هست و نصبِ دوباره CUDA را
    # می‌شکند.
    eq([d for d in P.TRAIN_DEPS if d.split(">")[0].split("<")[0].split("=")[0]
        in ("torch", "torchaudio")], [], "torch در فهرستِ نصب نیست")

    # ══ سقفِ huggingface_hub، و چرا ══
    # اجرای #۳۹: ارتقای موردیِ این بسته نسخهٔ ۱٫۳۰ را آورد و
    # `transformers 4.49` که سقفِ `<1.0` دارد سرِ import مُرد — سه قدم
    # بعدتر. بسته‌ای که برای یک قدم اضافه شود می‌تواند قدمِ دیگری را
    # بشکند؛ جایش همین یک فهرست است، با سقف.
    hub = [d for d in P.TRAIN_DEPS if d.startswith("huggingface_hub")]
    eq(len(hub), 1, "huggingface_hub در فهرست هست")
    eq("<1.0" in hub[0], True,
       "و سقفِ زیرِ ۱٫۰ دارد، چون transformers همین را می‌خواهد: %s" % hub[0])
    # و هیچ‌جای آزمایشگاه ارتقای بی‌سقفش نمی‌کند.
    src2 = io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "voicelab.py"), encoding="utf-8").read()
    eq('"--upgrade", "huggingface_hub"' in src2, False,
       "و هیچ‌جا بی‌سقف ارتقا داده نمی‌شود")

    # ── ۲۳ ─────────────────────────────────────────────────────────────
    # مسیرِ کاملِ rvcsmoke روی بدل‌ها. این موتور روی رانر ساعت‌ها طول
    # می‌کشد، پس اگر منطقش فقط آنجا سنجیده شود، هر اشتباهِ کوچک یک ساعت
    # هزینه دارد. اینجا در چند صدم ثانیه سنجیده می‌شود.
    print("۲۳ — مسیرِ کاملِ rvcsmoke روی بدل‌ها")
    import shutil as _sh
    import rvcpipe as P
    d7 = tempfile.mkdtemp()
    realSh9, realWav9, realProbe9, realWhich = V.sh, V.to_wav, V.probe, _sh.which
    realTail9 = V.shTail_
    seen = []

    def _mk(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        io.open(path, "w", encoding="utf-8").write("x" * 2048)

    def _sh9(cmd, timeout=None, **kw):
        seen.append({"cmd": list(cmd), "cwd": kw.get("cwd"),
                     "env": kw.get("env")})
        root9 = kw.get("cwd") or ""
        mod = cmd[cmd.index("-m") + 1] if "-m" in cmd else ""
        # بدل‌ها همان چیزهایی را می‌سازند که قدم‌های واقعی می‌سازند، تا
        # `preTrain_` روی فایل‌سیستمِ واقعی سنجیده شود نه با بدلِ دیگر.
        ex = os.path.join(root9, "logs", "smoke")
        mu = os.path.join(root9, "logs", "mute")
        if mod == "train.preprocess":
            _mk(os.path.join(root9, "configs", "v1", "40k.json"))
            for base in (ex, mu):
                _mk(os.path.join(base, "0_gt_wavs", "a.wav"))
        if mod == "train.dataset.extract_f0":
            for base in (ex, mu):
                _mk(os.path.join(base, "2a_f0", "a.wav.npy"))
                _mk(os.path.join(base, "2b-f0nsf", "a.wav.npy"))
        if mod == "train.dataset.extract_hubert_feature":
            for base in (ex, mu):
                _mk(os.path.join(base, "3_feature768", "a.npy"))
        # برابری، نه «شامل بودن»: «train.train_index» رشتهٔ
        # «train.train» را در خود دارد.
        if mod == "train.train":
            _mk(os.path.join(root9, "assets", "weights", "smoke.pth"))
        if mod == "train.train_index":
            _mk(os.path.join(root9, "assets", "indices", "smoke.index"))
        return R()

    def _tail9(cmd, tailLines=40, **kw):
        _sh9(cmd, **kw)
        return "", 0

    V.sh = _sh9
    V.shTail_ = _tail9
    V.to_wav = lambda s_, d_, **kw: wav(d_, 30.0)
    V.probe = lambda p_: {"seconds": 30.0}
    _sh.which = lambda n: "/usr/bin/hf" if n == "hf" else None
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "rvcsmoke"}; V.OPT["_out"] = d7
        V.OPT["ref_inputs"] = ["a.input", "b.input"]
        got = V.run_rvcsmoke(None, None, None, d7)
        eq(os.path.basename(got), "smoke.pth", "مدل برگردانده می‌شود، نه صوت")

        # `pip` و `zipfile` هم با `-m` اجرا می‌شوند، پس صرفِ وجودِ `-m`
        # کافی نیست: قدم‌های آموزش با پیشوندِ ماژولشان شناخته می‌شوند.
        def _mod(c):
            return c[c.index("-m") + 1] if "-m" in c else ""

        names = [c["cmd"] for c in seen]
        mods = [_mod(c) for c in names if _mod(c).startswith("train.")]
        eq(mods, ["train.preprocess", "train.dataset.extract_f0",
                  "train.dataset.extract_hubert_feature", "train.train",
                  "train.train_index"], "پنج قدم، به ترتیب و با نامِ ماژول")

        # مهم‌ترین دو چیز: از ریشهٔ مخزن اجرا می‌شوند، و PYTHONPATH دارند.
        # بی دومی، قدمِ اول با ModuleNotFoundError می‌میرد.
        five = [c for c in seen if _mod(c["cmd"]).startswith("train.")]
        rootDir = os.path.join(V.OPT["rvc"]["work_dir"], "rvc")
        eq(sorted(set(c["cwd"] for c in five)), [rootDir],
           "هر پنج قدم از ریشهٔ مخزن اجرا می‌شوند")
        eq(all((c["env"] or {}).get("PYTHONPATH", "").startswith(rootDir)
               for c in five), True, "و PYTHONPATH ریشه را دارد")
        # و کارگاه بیرونِ پوشهٔ خروجی است، وگرنه کلِ RVC بایگانی می‌شود.
        eq(V.OPT["rvc"]["work_dir"].startswith(os.path.abspath(d7)), False,
           "کارگاه بیرونِ پوشهٔ خروجی است")

        # نامِ فرمانِ hf حدس زده نمی‌شود.
        eq(V.OPT["rvc"]["hf_bin"], "hf", "فرمانِ hf از PATH پیدا می‌شود")
        eq(len(V.OPT["rvc_steps"]), 5, "پنج قدم گزارش شدند")

        # ══ پوشه‌های اجرا پیش از هر قدمی ساخته می‌شوند ══
        # اجرای #۴۱: هر پنج قدم کدِ صفر و هیچ مدلی، چون `assets/weights`
        # نبود و `savee` استثنایش را می‌بلعد. شکستی بی کدِ خطا.
        for rel in P.RUNTIME_DIRS:
            eq(os.path.isdir(os.path.join(rootDir, *rel.split("/"))), True,
               "پوشهٔ %s پیش از اجرا ساخته می‌شود" % rel)

        # ── آماده‌سازیِ پیش از آموزش، روی فایل‌سیستمِ واقعی ──
        pt = V.OPT["rvc"]["pre_train"]
        eq(pt["config"], "v1/40k.json",
           "برای ۴۰k پیکربندی از v1 برداشته می‌شود، نه v2")
        eq((pt["from_dataset"], pt["from_mute"]), (1, 1),
           "فهرست هم از دیتاست ردیف دارد هم از سکوت")
        fl = io.open(os.path.join(rootDir, "logs", "smoke", "filelist.txt"),
                     encoding="utf-8").read().splitlines()
        eq(len(fl), 2, "دو ردیف نوشته شد")
        eq(all(len(ln.split("|")) == 5 for ln in fl), True,
           "هر ردیف پنج ستون دارد (چهار مسیر و شمارهٔ گوینده)")
        # نامِ فایل‌ها حدس زده نمی‌شود؛ از روی دیسک خوانده می‌شود.
        eq(all("a.wav.npy" in ln for ln in fl), True,
           "نامِ واقعیِ فایلِ f0 در ردیف آمده، نه الگوی حدسی")
    finally:
        V.sh, V.to_wav, V.probe = realSh9, realWav9, realProbe9
        V.shTail_ = realTail9
        _sh.which = realWhich

    # و دو شکستی که باید **شکست** باشند، نه سکوت.
    def _run(shFn, tag):
        d = tempfile.mkdtemp()
        a, b, c, w = V.sh, V.to_wav, V.probe, _sh.which
        tl = V.shTail_
        V.sh = shFn

        def _t(cmd, tailLines=40, **kw):
            # همان پیش‌نیازهایی که قدم‌های واقعی می‌سازند، وگرنه اجرا سرِ
            # سدِ دیگری می‌ایستد و این آزمون چیزی را که هدفش بود نمی‌سنجد.
            r9 = kw.get("cwd") or ""
            m9 = cmd[cmd.index("-m") + 1] if "-m" in cmd else ""
            if m9 == "train.preprocess":
                _mk(os.path.join(r9, "configs", "v1", "40k.json"))
                for base in ("smoke", "mute"):
                    _mk(os.path.join(r9, "logs", base, "0_gt_wavs", "a.wav"))
                    _mk(os.path.join(r9, "logs", base, "2a_f0", "a.wav.npy"))
                    _mk(os.path.join(r9, "logs", base, "2b-f0nsf", "a.wav.npy"))
                    _mk(os.path.join(r9, "logs", base, "3_feature768", "a.npy"))
            r_ = shFn(cmd, **kw)
            return ("ModuleNotFoundError: No module named 'x'"
                    if r_.returncode else ""), r_.returncode

        V.shTail_ = _t
        V.to_wav = lambda s_, d_, **kw: wav(d_, 30.0)
        V.probe = lambda p_: {"seconds": 30.0}
        _sh.which = lambda n: "/usr/bin/hf" if n == "hf" else None
        try:
            V.OPT.clear()
            V.OPT["_rep"] = {"engine": "rvcsmoke"}; V.OPT["_out"] = d
            V.OPT["ref_inputs"] = ["a.input"]
            V.run_rvcsmoke(None, None, None, d)
            return None
        except Exception as e:
            return str(e)
        finally:
            V.sh, V.to_wav, V.probe, _sh.which = a, b, c, w
            V.shTail_ = tl

    class _Bad(object):
        returncode = 1
        stdout = stderr = b""

    msg = _run(lambda cmd, timeout=None, **kw:
               (_Bad() if "train.dataset.extract_f0" in cmd else R()), "f0")
    eq(msg is not None and "extract_f0" in msg, True,
       "قدمی که کدِ ناصفر بدهد، اجرا را متوقف می‌کند و نامش در خطاست")
    eq("No module named" in (msg or ""), True,
       "و علتِ واقعی در خودِ پیام است، نه فقط شمارهٔ کد")

    # و شکلِ بدترِ شکست: همهٔ قدم‌ها کدِ صفر می‌دهند و هیچ فایلی نیست.
    msg2 = _run(lambda cmd, timeout=None, **kw: R(), "silent")
    eq(msg2 is not None and "مدلی" in msg2, True,
       "کدِ صفر بی فایل، «موفق» حساب نمی‌شود")

    # ── ۲۴ ─────────────────────────────────────────────────────────────
    # این دو، ستونِ عیب‌یابیِ کارِ دور هستند. اگر خودشان غلط باشند، هر
    # اجرای بعدی «کد ۱» می‌دهد و باز هم هیچ.
    print("۲۴ — گرفتنِ خروجیِ فرمان و بیرون‌کشیدنِ علت")
    t, c = V.shTail_([sys.executable, "-c", "import nosuchmod_xyz"])
    eq(c, 1, "کدِ خروج درست برمی‌گردد")
    eq("No module named" in t, True, "و خروجیِ خطا نگه داشته می‌شود")
    eq(V.errGist_(t).startswith("ModuleNotFoundError"), True,
       "و گویاترین خط بیرون کشیده می‌شود: %s" % V.errGist_(t)[:60])

    t2, c2 = V.shTail_([sys.executable, "-c", "print('ok')"])
    eq((c2, t2.strip()), (0, "ok"), "و اجرای سالم هم خروجی‌اش را می‌دهد")

    # دُم واقعاً دُم است — نه کلِ خروجی.
    t3, _ = V.shTail_([sys.executable, "-c",
                       "print('\\n'.join(str(i) for i in range(500)))"],
                      tailLines=5)
    eq(t3.splitlines(), ["495", "496", "497", "498", "499"],
       "فقط آخرین خطوط نگه داشته می‌شود")

    # و وقتی هیچ نشانه‌ای نیست، آخرین خط بهتر از هیچ است.
    eq(V.errGist_("just a line\nlast line"), "last line",
       "بی نشانه، آخرین خط برمی‌گردد")
    eq(V.errGist_(""), "خروجی‌ای نبود", "و خروجیِ تهی هم پیامِ خودش را دارد")

    # ── ۲۵ ─────────────────────────────────────────────────────────────
    # منطقِ جداکردنِ موسیقی با صدای **ساختگی** سنجیده می‌شود، نه با بدل:
    # اینجا می‌شود دقیقاً دانست کجا گفتار است و کجا موسیقی، پس جواب را
    # می‌شود با واقعیت سنجید نه با انتظارِ خودم.
    print("۲۵ — جداکردنِ موسیقی از روایت")
    import numpy as _np

    SR = V.VAD_SR

    def _sig(parts):
        """parts: فهرستِ (ثانیه، دامنه). نویز = گفتار، دامنهٔ صفر = سکوت."""
        rng = _np.random.RandomState(7)
        out = []
        for sec, amp in parts:
            n = int(sec * SR)
            out.append(rng.randn(n).astype("float32") * amp if amp else
                       _np.zeros(n, dtype="float32"))
        return _np.concatenate(out)

    eq(V.dbOf_(_np.zeros(100, dtype="float32")), -120.0, "سکوت ۱۲۰- است")
    eq(round(V.dbOf_(_np.ones(100, dtype="float32")), 1), 0.0,
       "دامنهٔ یک، صفر دسی‌بل است")

    # ── سرِ فایل و تهِ فایل هم فاصله‌اند؛ تیزر دقیقاً همان‌جاست ──
    y = _sig([(2.0, 0.0), (3.0, 0.2), (1.0, 0.0)])
    gaps = V.dsGaps_(y, SR, [(2.0, 5.0)], 6.0)
    eq([(g["start"], g["end"]) for g in gaps], [(0.0, 2.0), (5.0, 6.0)],
       "فاصلهٔ ابتدا و انتها هر دو دیده می‌شوند")

    # ── دروازهٔ ۱: مکثی که بلند بماند، دسته را می‌شکند ──
    # «گفتار» اینجا باید مکث‌های ریز داشته باشد وگرنه دروازهٔ دوم — به
    # درستی — همان را بسترِ موسیقی می‌بیند. اولین بار همین شد و آزمون
    # درست ایراد گرفت: نویزِ یکسره گفتار نیست.
    def _talk(sec, amp=0.2):
        return [(0.4, amp), (0.1, 0.0)] * int(sec / 0.5)

    # گفتار ۰٫۲ ، مکثِ «موسیقی‌دار» ۰٫۱ (یعنی ۶ دسی‌بل پایین‌تر، نه ۳۰)
    y2 = _sig(_talk(3.0) + [(2.0, 0.1)] + _talk(3.0))
    sp2 = [(0.0, 3.0), (5.0, 8.0)]
    g2 = V.dsGaps_(y2, SR, sp2, 8.0)
    keep2, drop2 = V.dsRuns_(y2, SR, sp2, g2, V.dbOf_(y2[:int(3 * SR)]))
    eq(len(keep2), 2, "مکثِ بلند دسته را به دو نیم می‌کند")
    eq(any("موسیقی" in d["why"] for d in drop2), True, "و خودش دور ریخته می‌شود")

    # و همان با مکثِ **ساکت** یک دسته می‌مانَد
    y3 = _sig(_talk(3.0) + [(2.0, 0.0)] + _talk(3.0))
    g3 = V.dsGaps_(y3, SR, sp2, 8.0)
    keep3, _ = V.dsRuns_(y3, SR, sp2, g3, V.dbOf_(y3[:int(3 * SR)]))
    eq(len(keep3), 1, "ولی مکثِ ساکت نمی‌شکندش")

    # ── دروازهٔ ۲: بستری که VAD نمی‌بیند ──
    # اینجا هیچ مکثی نیست که سنجیده شود — صدا یکسره است. تنها نشانه این
    # است که کفِ داخلِ گفتار هم پایین نمی‌آید.
    solid = _sig([(6.0, 0.2)])                      # بی هیچ مکثِ ریز
    withPauses = _sig([(0.4, 0.2), (0.1, 0.0)] * 12)  # گفتارِ واقعی
    fl1 = V.dsFloorDb_(solid, SR, 0.0, 6.0) - V.dbOf_(solid)
    fl2 = V.dsFloorDb_(withPauses, SR, 0.0, 6.0) - V.dbOf_(withPauses)
    eq(fl1 > V.DS_FLOOR_REL_DB, True,
       "صدای یکسره کفِ بالا دارد (%.1f دسی‌بل)" % fl1)
    eq(fl2 < V.DS_FLOOR_REL_DB, True,
       "و گفتارِ مکث‌دار کفِ پایین (%.1f دسی‌بل)" % fl2)
    k4, d4 = V.dsRuns_(solid, SR, [(0.0, 6.0)], [], V.dbOf_(solid))
    eq((len(k4), len(d4)), (0, 1), "پس دستهٔ یکسره دور ریخته می‌شود")
    eq("بستر" in d4[0]["why"], True, "با همان دلیل: بسترِ موسیقی")

    # ══ دروازهٔ بستر، روی تک‌تکِ تکه‌ها ══
    # بازخوردِ کاربر: در یک تکهٔ نگه‌داشته، ثانیهٔ ۲۵ تا ۳۴ موسیقی زیرِ
    # صدا داشت. علت این بود که سنجه روی کلِ دستهٔ پیوسته اعمال می‌شد و
    # نُه ثانیه در میانگینِ یک دقیقه گم می‌شد. حالا هر تکه جدا سنجیده
    # می‌شود — و این آزمون دقیقاً همان شکل را می‌سازد.
    mixed = _np.concatenate([_sig(_talk(20.0)),          # بیست ثانیه تمیز
                             _sig([(9.0, 0.15)]),        # نُه ثانیه یکسره
                             _sig(_talk(20.0))])
    lvl = V.dbOf_(mixed)
    okA, relA = V.dsSegOk_(mixed, SR, 2.0, 10.0, lvl)     # داخلِ بخشِ تمیز
    okB, relB = V.dsSegOk_(mixed, SR, 22.0, 28.0, lvl)    # داخلِ بخشِ یکسره
    eq(okA, True, "تکهٔ تمیز می‌مانَد (کف %.1f)" % relA)
    eq(okB, False, "و تکهٔ رویِ بستر می‌افتد (کف %.1f)" % relB)
    eq(relA < relB, True, "و عددشان جهتِ درست دارد")

    # ── تکه‌بندی ──
    segs = V.dsSegments_([[(0.0, 4.0), (4.5, 9.0), (9.5, 20.0)]])
    eq(all(V.DS_SEG_MIN <= b - a <= V.DS_SEG_MAX + 0.01 for a, b in segs), True,
       "هر تکه بینِ ۳ تا ۱۰ ثانیه است: %s" % [round(b - a, 1) for a, b in segs])
    eq(V.dsSegments_([[(0.0, 1.0)]]), [], "و تکهٔ کوتاه‌تر از سه ثانیه نمی‌مانَد")

    # ── نمونه باید نماینده باشد، نه n تای اول ──
    eq(V.dsPick_(list(range(100)), 4), [0, 25, 50, 75],
       "نمونه از سراسرِ فهرست برداشته می‌شود")
    eq(V.dsPick_([1, 2], 5), [1, 2], "و کمتر از خواسته، همان که هست")

    # ── ۲۶ ─────────────────────────────────────────────────────────────
    # `buildDataset_` مسیری است که **هم** آزمایشگاه اجرا می‌کند **هم**
    # نوت‌بوکِ Colab. یعنی اگر اینجا خراب باشد، آنچه با گوش داوری شده با
    # آنچه واقعاً آموزش می‌بیند یکی نیست — و هیچ‌چیز این را نشان نمی‌دهد.
    print("۲۶ — چیدمانِ ساختِ دیتاست (مسیرِ مشترکِ آزمایشگاه و Colab)")
    import dsprep as D
    import types as _ty

    if "silero_vad" not in sys.modules:
        _sv = _ty.ModuleType("silero_vad")
        _sv.load_silero_vad = lambda *a, **k: object()
        _sv.get_speech_timestamps = lambda *a, **k: []
        sys.modules["silero_vad"] = _sv

    d8 = tempfile.mkdtemp()
    segDir, sampDir = os.path.join(d8, "segs"), os.path.join(d8, "s")
    os.makedirs(segDir); os.makedirs(sampDir)
    realD = (D.dsDecode_, D.dsSpeech_, D.dsWriteCuts_, D.dsJoin_)
    seen8 = []

    def _cuts(src_, cuts_, out_, prefix_, rate=None, limit=None):
        made_, got_ = [], 0.0
        for k, (a_, b_) in enumerate(cuts_):
            if limit is not None and got_ >= limit:
                break
            f_ = os.path.join(out_, "%s%d.wav" % (prefix_, k))
            io.open(f_, "w", encoding="utf-8").write("x")
            made_.append(f_)
            got_ += (b_ - a_)
        return made_

    # سیگنالِ بدل باید **ساختارِ گفتار** داشته باشد: سکوتِ محض گفتار
    # نیست و دروازهٔ دوم به‌درستی ردش می‌کند (همان چیزی که بخشِ ۲۵ هم
    # نشان داد). پس نویزِ تکه‌تکه با مکث‌های ریز.
    def _speechy(rate_, secs=60.0):
        import numpy as _n
        rng_ = _n.random.RandomState(3)
        one = _n.concatenate([
            rng_.randn(int(0.4 * rate_)).astype("float32") * 0.2,
            _n.zeros(int(0.1 * rate_), dtype="float32")])
        return _n.tile(one, int(secs / 0.5))

    D.dsDecode_ = lambda src_, dst_, rate_: (_speechy(rate_), rate_)
    D.dsSpeech_ = lambda y_, sr_, m_: ([] if "quiet" in str(seen8) and False
                                       else [(0.0, 20.0), (25.0, 50.0)])
    D.dsWriteCuts_ = _cuts
    # ══ دروازهٔ گوینده، بی نیاز به خودِ مدل ══
    # منطقش تماماً numpy است: مرکزِ خوشهٔ غالب و شباهت به آن. پس بردارها
    # را خودمان می‌سازیم — اکثریت در یک جهت، دو تا در جهتِ دیگر — و
    # می‌سنجیم که همان دو تا بیفتند.
    realEnc = (D.dsEncoder_, D.dsEmbed_)
    D.dsEncoder_ = lambda tmp_: object()

    def _emb(enc_, y_, sr_, spans_):
        import numpy as _n
        me = _n.array([1.0, 0.0, 0.0])
        other = _n.array([0.0, 1.0, 0.0])
        return [other if k % 5 == 4 else me for k in range(len(spans_))]

    D.dsEmbed_ = _emb
    D.dsJoin_ = lambda parts_, dst_: (io.open(dst_, "w",
                                              encoding="utf-8").write("x"), dst_)[1]
    try:
        segs8, rep8 = D.buildDataset_(["a.mp3", "b.mp3"], segDir,
                                      sampleDir=sampDir,
                                      onFile=lambda f: seen8.append(len(f)))
        eq(len(rep8["files"]), 2, "هر دو فایل گزارش شدند")
        eq(seen8, [1, 2], "و گزارش پس از هر فایل به‌روز شد، نه فقط در پایان")
        eq(segs8 != [], True, "تکه ساخته شد (%d تا)" % len(segs8))
        eq(sorted(rep8["samples"]), ["dropped", "kept"],
           "هر دو نمونهٔ شنیدنی ساخته می‌شوند")
        eq(os.path.isfile(os.path.join(sampDir, "SAMPLE-kept.wav")), True,
           "و در پوشهٔ نمونه می‌نشینند")
        # توزیعِ کفِ تکه‌ها باید گزارش شود، وگرنه آستانه هیچ‌وقت
        # قابلِ تنظیم نیست — فقط حکمش دیده می‌شود، نه دلیلش.
        eq("seg_floor_rel_db" in rep8["files"][0], True,
           "توزیعِ کفِ تکه‌ها گزارش می‌شود")
        eq(rep8["files"][0]["seg_floor_cut"] == D.DS_FLOOR_REL_DB, True,
           "و آستانهٔ به‌کاررفته کنارش می‌آید")

        # ── دروازهٔ گوینده ──
        eq("گویندهٔ دیگر" in json.dumps(rep8["files"], ensure_ascii=False), True,
           "تکه‌های گویندهٔ غریبه با همان دلیل کنار گذاشته می‌شوند")
        eq(rep8["speaker_cut"] == D.DS_SPK_MIN, True, "آستانهٔ گوینده گزارش می‌شود")
        eq(len(rep8["speaker_sims"]) > 0, True, "و توزیعِ شباهت‌ها هم")
        eq(min(rep8["speaker_sims"]) < D.DS_SPK_MIN, True,
           "کمینهٔ شباهت زیرِ آستانه است (یعنی واقعاً غریبه‌ای بود)")

        # خطِ خلاصه: تصمیم به این بسته است، پس باید یک‌جا و کامل باشد.
        eq(isinstance(rep8.get("line"), str) and len(rep8["line"]) > 20, True,
           "خطِ خلاصه ساخته می‌شود: %s" % rep8.get("line", "")[:70])
        for must in ("تکه", "دقیقه", "شباهت", "رد"):
            eq(must in rep8["line"], True, "و «%s» در آن هست" % must)

        eq(sorted(rep8["thresholds"]), ["floor_rel_db", "gap_rel_db",
                                        "speaker_min"],
           "آستانه‌ها در گزارش می‌آیند — تا اگر بد بودند دیده شوند")
        eq([x for x in os.listdir(segDir) if x.startswith("seg")] != [], True,
           "تکه‌ها در پوشهٔ خودشان‌اند، نه کنارِ نمونه‌ها")
        eq([x for x in os.listdir(sampDir) if x.startswith("seg")], [],
           "و پوشهٔ نمونه فقط نمونه دارد")

        # سقفِ مجموع واقعاً می‌بُرد
        _, rep9 = D.buildDataset_(["a.mp3", "b.mp3"], segDir, totalMax=5.0)
        eq(rep9["capped"], True, "سقفِ مجموع اعمال می‌شود")
        eq(rep9["kept_seconds"] >= 5.0, True, "و در گزارش دیده می‌شود")

        # فایلی که هیچ گفتاری ندارد، بی‌صدا رد نمی‌شود
        D.dsSpeech_ = lambda y_, sr_, m_: []
        _, rep10 = D.buildDataset_(["c.mp3"], segDir)
        eq(rep10["files"][0].get("skipped") is not None, True,
           "فایلِ بی‌گفتار با دلیل ثبت می‌شود، نه بی‌صدا کنار گذاشته")
    finally:
        (D.dsDecode_, D.dsSpeech_, D.dsWriteCuts_, D.dsJoin_) = realD
        (D.dsEncoder_, D.dsEmbed_) = realEnc

    # ── ۲۷ ─────────────────────────────────────────────────────────────
    # نوت‌بوکِ Colab روی هیچ ماشینی از ما اجرا نمی‌شود — روی ماشینِ گوگل
    # و با دستِ کاربر. یعنی تنها چیزی که می‌تواند خرابی‌اش را پیش از او
    # بگیرد همین بخش است.
    print("۲۷ — نوت‌بوک‌های آموزش")
    import ast as _a2
    toolsD = os.path.dirname(os.path.abspath(__file__))
    # ══ فهرستِ دستی کهنه می‌شود ══
    # بخشِ ۱۳ همین را یاد داد: هر نوت‌بوکی که در `tools/` باشد سنجیده
    # می‌شود، نه فهرستی که کسی باید یادش بیفتد به‌روزش کند.
    books = sorted(f for f in os.listdir(toolsD) if f.endswith(".ipynb"))
    eq(len(books) >= 1, True, "نوت‌بوک‌ها پیدا شدند: %s" % books)

    for bk in books:
        nb = json.loads(io.open(os.path.join(toolsD, bk),
                                encoding="utf-8").read())
        codes = [c for c in nb["cells"] if c["cell_type"] == "code"]
        eq(len(codes) >= 8, True, "%s: %d سلولِ کد" % (bk, len(codes)))

        bad = []
        for k, c in enumerate(codes):
            try:
                _a2.parse("".join(c["source"]))
            except SyntaxError as e:
                bad.append("%d: %s" % (k, str(e)[:60]))
        eq(bad, [], "%s: همهٔ سلول‌ها نحواً درست‌اند" % bk)

        allSrc = "\n".join("".join(c["source"]) for c in codes)

        # ══ منطق از مخزن، نه کپیِ داخلِ نوت‌بوک ══
        # اگر روزی کسی برای «ساده‌تر شدن» تابعی را داخلش کپی کند، از
        # همان روز آنچه کاربر آموزش می‌دهد با آنچه ما داوری کرده‌ایم فرق
        # می‌کند — و هیچ‌چیز نشانش نمی‌دهد.
        eq("raw.githubusercontent.com" in allSrc, True,
           "%s: ماژول‌ها از گیت‌هاب raw" % bk)
        for mod in ("rvcpipe.py", "dsprep.py"):
            eq(mod in allSrc, True, "%s: %s گرفته می‌شود" % (bk, mod))
        for fn in ("def steps(", "def buildDataset_(", "def preTrain_("):
            eq(fn in allSrc, False, "%s: «%s» کپی نشده" % (bk, fn))

        for call in ("P.preLog_(", "P.preTrain_("):
            eq(call in allSrc, True, "%s: %s صدا زده می‌شود" % (bk, call))

        # ══ آموزش روی GPU ══
        # بی این، هر دو سکو روی CPU آموزش می‌دهند — بی هیچ خطایی، فقط
        # بیست برابر کندتر.
        eq("gpus='0'" in allSrc or 'gpus="0"' in allSrc, True,
           "%s: آموزش با GPU" % bk)
        eq("nvidia-smi" in allSrc, True, "%s: نبودنِ کارت اول گرفته می‌شود" % bk)
        eq("P.outputs(" in allSrc and "os.path.exists" in allSrc, True,
           "%s: وجودِ مدل پیش از اعلامِ پایان سنجیده می‌شود" % bk)
        eq("latest=1" in allSrc, True, "%s: فقط آخرین چک‌پوینت" % bk)
        for again in ("از پیش انجام شده", "از پیش آماده است"):
            eq(again in allSrc, True,
               "%s: کارِ انجام‌شده تکرار نمی‌شود («%s»)" % (bk, again))

        # ══ آنچه مخصوصِ هر سکوست ══
        if "colab" in bk:
            # قطعیِ اتصال نباید کار را از صفر کند: هرچه ساخته می‌شود باید
            # روی درایو بنشیند، و درایو باید **پیش از** آموزش وصل شود.
            idx = [k for k, c in enumerate(codes)
                   if "drive.mount" in "".join(c["source"])]
            tr = [k for k, c in enumerate(codes)
                  if "P.preTrain_(" in "".join(c["source"])]
            eq(len(idx), 1, "%s: درایو یک بار وصل می‌شود" % bk)
            eq(idx[0] < tr[0], True,
               "%s: و پیش از آموزش، نه بعدش" % bk)
            eq("os.symlink" in allSrc, True,
               "%s: logs با پیوند به درایو می‌رود" % bk)
        if "kaggle" in bk:
            # اینترنتِ خاموش پیش‌فرضِ Kaggle است و سه سلول بعد به شکلِ
            # «دانلود ناموفق» ظاهر می‌شود. همان اول پرسیده می‌شود.
            eq("Internet" in allSrc, True,
               "%s: خاموش بودنِ اینترنت اول گرفته می‌شود" % bk)
            eq("/kaggle/working" in allSrc, True,
               "%s: خروجی در پوشهٔ خروجیِ Kaggle می‌نشیند" % bk)
            eq("drive.mount" in allSrc, False,
               "%s: به درایو وصل نمی‌شود (آنجا نیست)" % bk)

            # ══ کشته‌شدنِ خاموش ══
            # اجرای اولِ Kaggle با «Exit code: 137» مُرد و لاگ هیچ
            # نگفت. دو چیز آن را خاموش کرده بود و هر دو اینجا بسته
            # می‌شود: خروجیِ بلوکی (که بافرِ نانوشته را با فرایند
            # می‌کُشد) و قدم‌هایی که هیچ عددی از خودشان به‌جا
            # نمی‌گذارند. ۱۳۷ از بیرون هیچ دلیلی ندارد؛ تنها شاهد
            # چیزی است که خودمان پیش از مرگ چاپ کرده باشیم.
            eq("line_buffering" in allSrc, True,
               "%s: خروجی خطِ‌به‌خط نوشته می‌شود، نه بلوکی" % bk)
            eq("def res(" in allSrc, True, "%s: گزارشِ رم و دیسک هست" % bk)
            eq(allSrc.count("res(") >= 8, True,
               "%s: و بعدِ هر قدمِ سنگین صدا زده می‌شود (%d بار)"
               % (bk, allSrc.count("res(")))
            eq("MemAvailable" in allSrc and "disk_usage" in allSrc, True,
               "%s: هم رم و هم دیسک — ۱۳۷ هر دو را می‌سازد" % bk)
            # ══ و عددِ درست، نه عددی که در دسترس است ══
            # داخلِ کانتینر `/proc/meminfo` حافظهٔ میزبان را می‌دهد، نه
            # سهمِ کانتینر. ابزارِ سنجشی که عددِ دیگری را می‌سنجد بدتر
            # از نبودنش است: با اطمینان اشتباه می‌کند.
            eq("memory.current" in allSrc and "memory.max" in allSrc, True,
               "%s: سقفِ حافظه از cgroup خوانده می‌شود" % bk)

            # ══ آنچه دو اجرا را کُشت، برنمی‌گردد ══
            # هر دو اجرا دقیقاً سرِ اولین دانلود از گوگل‌درایو مُردند
            # (رم ۱٫۳ گیگ، دیسک ۱۹ گیگ آزاد — یعنی نه حافظه بود نه جا).
            # ضبط‌ها حالا از Datasetِ خودِ Kaggle خوانده می‌شوند و هیچ
            # دانلودی در کار نیست. اگر روزی کسی gdown را برگرداند،
            # اینجا می‌ایستد.
            eq("gdown" in allSrc, False,
               "%s: دیگر از درایو دانلود نمی‌کند" % bk)
            eq("AUDIO_EXT" in allSrc and "os.walk('/kaggle/input')" in allSrc,
               True, "%s: ضبط‌ها از Dataset خوانده می‌شوند" % bk)
            eq("SAMPLE-" in allSrc, True,
               "%s: نمونه‌های اجرای پیشین ضبطِ خام حساب نمی‌شوند" % bk)

            # ══ پوشهٔ خروجی جای کارِ میانی نیست ══
            # سه اجرا وقتی مُردند که کلونِ RVC و ۵۵۰ مگابایت وزن در
            # `/kaggle/working` نشسته بود — همان پوشه‌ای که Kaggle
            # به‌عنوانِ خروجیِ نسخه می‌پایدش. کارِ موقت باید بیرونش
            # باشد، نه اینکه در پایان از آنجا پاک شود: پاک کردن در
            # پایان جای نگذاشتن از اول را نمی‌گیرد.
            eq("'/kaggle/temp'" in allSrc, True,
               "%s: کارِ موقت جای خودش را دارد" % bk)
            for bad in ("WORK = OUT", "OUT + '/rvc'", "OUT + '/work'"):
                eq(bad in allSrc, False,
                   "%s: «%s» نیست — خروجی جای کار نیست" % (bk, bad))

            # ══ از سرگرفتن ══
            # نسخهٔ Colab این را دارد (logs روی درایو)، نسخهٔ Kaggle
            # نداشت: هر کشته‌شدن یعنی از صفر. اینجا راهش خروجیِ اجرای
            # پیشین است که به‌عنوانِ ورودی برمی‌گردد.
            eq("/kaggle/input/" in allSrc, True,
               "%s: چک‌پوینتِ اجرای پیشین برداشته می‌شود" % bk)
            eq("RESUME" in allSrc, True,
               "%s: و توشهٔ اجرای بعدی گذاشته می‌شود" % bk)

    # ── ۲۸ ─────────────────────────────────────────────────────────────
    # مرکزِ خوشه باید روی **اکثریت** بنشیند، نه بینِ دو گروه. اگر
    # میانگینِ ساده بگیریم، چند تکهٔ غریبه مرکز را به سمتِ خودشان
    # می‌کشند و آن‌وقت هم خودشان قبول می‌شوند هم بخشی از تکه‌های درست رد.
    print("۲۸ — مرکزِ خوشهٔ گوینده روی اکثریت می‌نشیند")
    import numpy as _np2
    import dsprep as D2
    me = _np2.array([1.0, 0.0, 0.0])
    other = _np2.array([0.0, 1.0, 0.0])
    embs = [me] * 12 + [other] * 3
    c = D2.dsCentroid_(embs)
    sims = D2.dsSpeakerSims_(embs, c)
    eq(round(sims[0], 2) >= 0.99, True,
       "تکه‌های اکثریت شباهتِ نزدیک به یک دارند (%.2f)" % sims[0])
    eq(sims[-1] < D2.DS_SPK_MIN, True,
       "و غریبه‌ها زیرِ آستانه می‌افتند (%.2f)" % sims[-1])

    # و اگر همه یکی باشند، هیچ‌کس نباید بیفتد
    same = D2.dsSpeakerSims_([me] * 8, D2.dsCentroid_([me] * 8))
    eq(min(same) >= 0.99, True, "وقتی همه یک گوینده‌اند، هیچ‌کس نمی‌افتد")

    # ورودیِ تهی نباید بترکاند
    eq(D2.dsCentroid_([]), None, "فهرستِ تهی مرکز ندارد، و خطا هم نمی‌دهد")
    eq(D2.dsSpeakerSims_([me], None), [1.0],
       "و بی مرکز، همه قبول‌اند نه همه رد — دروازه‌ای که مدلش نیامده باید باز باشد")

    # ── ۲۹ ─────────────────────────────────────────────────────────────
    # آموزش روی رانرِ گیت‌هاب تکه‌تکه است: هر job تا پنج ساعت کار
    # می‌کند و بقیه‌اش می‌ماند برای بعد. کلِ این ایده روی دو چیز سوار
    # است — مهلتی که **خودمان** می‌گذاریم، و کشی که **همیشه** ذخیره
    # می‌شود. اگر هرکدام بشکند، هیچ خطایی بلند نمی‌شود: هر شش ساعت یک
    # اجرا از صفر شروع می‌کند و هیچ‌وقت به آخر نمی‌رسد.
    print("۲۹ — آموزشِ تکه‌تکه روی رانر")
    import time
    import voicetrain as VT

    # ── مهلت واقعاً کار می‌کند ──
    # این تنها راهی است که ما پیش از تبرِ گیت‌هاب برمی‌گردیم. اگر
    # نگیرد، job کشته می‌شود و کش ذخیره نمی‌شود.
    t0 = time.time()
    code, timedout = VT.run_([sys.executable, "-c",
                              "import time; time.sleep(30)"], budget=1.5)
    dt = time.time() - t0
    eq(timedout, True, "قدمِ طولانی با مهلت متوقف شد")
    eq(code, 124, "و کدِ مهلت برمی‌گردد، نه صفر")
    eq(dt < 15, True, "و واقعاً برگشت (%.1f ثانیه)" % dt)

    code2, to2 = VT.run_([sys.executable, "-c", "print(1)"], budget=60)
    eq((code2, to2), (0, False), "قدمِ کوتاه سالم تمام می‌شود")

    # ── پیشرفت از نامِ چک‌پوینت خوانده می‌شود ──
    w29 = tempfile.mkdtemp()
    os.makedirs(os.path.join(w29, "logs", VT.VOICE))
    eq(VT.steps_done_(w29), 0, "بی چک‌پوینت، گامِ صفر")
    for nm in ("G_2333.pth", "G_11665.pth", "D_11665.pth", "G_x.pth"):
        io.open(os.path.join(w29, "logs", VT.VOICE, nm), "w").write(u"x")
    eq(VT.steps_done_(w29), 11665,
       "تازه‌ترین گام از نام خوانده می‌شود، و نامِ بی‌عدد نمی‌ترکاند")

    # ── آموزش روی CPU است، نه GPU ──
    # رانر کارتِ گرافیک ندارد. اگر روزی `gpus` پر شود، `extract_feature`
    # روی cuda می‌رود و با خطایی می‌میرد که ربطش به این تصمیم پیدا نیست.
    src29 = io.open(os.path.join(os.path.dirname(os.path.abspath(
        VT.__file__)), "voicetrain.py"), encoding="utf-8").read()
    eq('gpus=""' in src29, True, "آموزش با CPU خوانده می‌شود")
    eq("latest=1" in src29, True, "فقط تازه‌ترین چک‌پوینت نگه می‌ماند")

    # ── گردش‌کار ──
    wf = io.open(os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(VT.__file__))), ".github", "workflows",
        "voice-train.yml"), encoding="utf-8").read()

    # ══ مهم‌ترین خطِ کلِ این فایل ══
    # ذخیرهٔ کش باید `if: always()` باشد. نیمه‌کاره ماندن حالتِ عادیِ
    # این گردش‌کار است؛ اگر کش فقط در حالتِ موفق ذخیره شود، هیچ اجرایی
    # از اجرای قبل چیزی تحویل نمی‌گیرد و آموزش هرگز تمام نمی‌شود — بی
    # اینکه هیچ‌چیز قرمز شود.
    eq("if: always()" in wf[:wf.index("actions/cache/save")], True,
       "کش همیشه ذخیره می‌شود، نه فقط وقتی همه‌چیز خوب پیش رفت")
    eq("restore-keys" in wf, True, "و اجرای بعدی تازه‌ترین کش را برمی‌دارد")
    keys = [ln.split(":", 1)[1].strip() for ln in wf.splitlines()
            if ln.strip().startswith("key:")]
    eq(len(set(keys)), 1, "کلیدِ ذخیره و بازیابی یکی است: %s" % set(keys))
    eq(all(k.startswith("rvc-razavi-") for k in keys), True,
       "و پیشوندش با restore-keys جور است")

    # ══ بودجه باید از مهلتِ job کمتر باشد ══
    # اگر برعکس شود، گیت‌هاب پیش از ما job را می‌کُشد و کش — که تنها
    # حاملِ ساعت‌ها کار است — ذخیره نمی‌شود.
    budget = int([ln.split("'")[1] for ln in wf.splitlines()
                  if "VT_BUDGET_MIN" in ln][0])
    tmo = int([ln.split(":")[1] for ln in wf.splitlines()
               if "timeout-minutes" in ln][0])
    eq(budget < tmo - 30, True,
       "بودجهٔ کار (%d دقیقه) دستِ‌کم نیم‌ساعت زیرِ مهلتِ job (%d) است"
       % (budget, tmo))
    eq("concurrency" in wf, True,
       "دو اجرای همزمان نداریم — دو کش که همدیگر را خراب کنند")

    # ══ «مدل هست» شرطِ کافی نیست ══
    # به کاربر گفته شد «ادامه دادن رایگان است: همان چک‌پوینت را
    # برمی‌دارد و جلو می‌رود». اگر شرطِ پرش فقط وجودِ فایل را ببیند،
    # درخواستِ ۱۲۰ دور در چند ثانیه با «از پیش ساخته شده» برمی‌گردد و
    # هیچ دورِ تازه‌ای آموزش نمی‌بیند — بی هیچ خطایی. قولی که کد نگه
    # ندارد، قول نیست.
    eq("epochs_target" in src29 and "at >= EPOCHS" in src29, True,
       "پرش از آموزش، هدفِ دورها را هم می‌سنجد نه فقط وجودِ فایل را")

    # ══ و همان دروازه، اگر عددِ هدف دو جا باشد، برضدِ ما کار می‌کند ══
    # اجرای زمان‌بندی‌شده هیچ ورودی‌ای ندارد، پس `inputs.epochs` تهی
    # است و همیشه شاخهٔ `||` می‌ماند. آن شاخه روی ۶۰ جا مانده بود و
    # خانهٔ فرم ۲۰۰ می‌گفت. حاصل: اجرای دستی هدف را ۲۰۰ می‌نوشت و بعد
    # هر اجرای خودکار با هدفِ ۶۰ می‌آمد، «قبلاً رسیده» می‌دید و در چند
    # ثانیه **موفق** تمام می‌شد. سیزده اجرای سبز، صفر دورِ آموزش، هیچ
    # خطایی. همان شکلِ همیشگی: یک عدد در دو جا.
    inDef = [ln.split("'")[1] for ln in wf.splitlines()
             if ln.strip().startswith("default: '")]
    envDef = [ln.split("||")[1].split("'")[1] for ln in wf.splitlines()
              if "VT_EPOCHS" in ln and "||" in ln]
    eq(envDef and inDef and envDef[0] == inDef[0], True,
       "هدفِ اجرای خودکار همان پیش‌فرضِ فرم است (%s در برابر %s)"
       % (envDef, inDef))

    # ══ و «هدف» شاهدِ «تمام شد» نیست ══
    # `state.json` در هر اجرا نوشته می‌شود، از جمله اجرایی که سرِ
    # بودجه نصفه ماند — با `epochs_target` برابرِ همان چیزی که
    # **خواسته** شده بود. پس اولین اجرای ۲۰۰ که مهلتش تمام شود، هدف
    # را ۲۰۰ ثبت می‌کند و اجرای بعدی «از پیش برای ۲۰۰ دور ساخته شده»
    # می‌گوید و در چند ثانیه سبز تمام می‌شود. فایلِ مدل هم واقعاً
    # هست — از دورِ ۶۰ — پس هیچ‌چیز قرمز نمی‌شود و زنجیره حوالیِ دورِ
    # ۷۰ برای همیشه می‌ایستد. سه اجرای اول همین را انجام می‌دادند اگر
    # دروازه یک نسخه زودتر ساخته شده بود.
    eq("was and at >= EPOCHS" in src29, True,
       "پرش فقط وقتی است که اجرای پیشین **تمام** شده باشد")
    eq("complete=not broke" in src29, True,
       "و «تمام شد» را خودِ حلقه می‌گوید، نه وجودِ فایل")
    eq(src29.count("broke = True") >= 3, True,
       "هر سه خروجِ زودهنگام «تمام نشد» ثبت می‌شوند (%d)"
       % src29.count("broke = True"))
    # و رفتارش، نه فقط متنش:
    fin29 = VT.finish_.__code__
    eq("complete" in fin29.co_varnames, True, "finish_ همین را می‌پذیرد")

    # ══ و کدِ درست نباید به دادهٔ غلطِ به‌جا‌مانده اعتماد کند ══
    # `state.json`های نسخهٔ پیشین در کش زنده‌اند و `done: true`
    # دارند که آنجا فقط یعنی «فایلی هست». بی شمارهٔ طرح، اجرای بعدیِ
    # همین کدِ اصلاح‌شده همان‌جا می‌ایستاد که قرار بود نایستد.
    eq('"schema": 2' in src29 and "sch < 2" in src29, True,
       "state.jsonِ نسخهٔ پیشین قابلِ اتکا شمرده نمی‌شود")

    # ══ «تا کجا رسیده‌ایم» را آموزش می‌نویسد، نه ما ══
    d29 = tempfile.mkdtemp()
    w29 = os.path.join(d29, "assets", "weights")
    os.makedirs(w29)
    eq(VT.epochsDone_(d29), 0, "بی هیچ عکسی، صفر")
    for nm in ("%s_e5_s100.pth", "%s_e70_s1400.pth", "%s.pth",
               "%s_e999_s1.index", "other_e900_s1.pth"):
        io.open(os.path.join(w29, nm.replace("%s", VT.VOICE, 1)),
                "w").write("x")
    eq(VT.epochsDone_(d29), 70,
       "بالاترین دورِ عکس‌گرفته‌شده خوانده می‌شود، و نه فایلِ گویندهٔ دیگر")

    # ── ۳۰ ─────────────────────────────────────────────────────────────
    # اولین اجرای واقعی روی رانرِ گیت‌هاب با `ModuleNotFoundError:
    # imageio_ffmpeg` ایستاد. آن import یک **راهِ گریز** بود — «اول
    # باینریِ سیستم، بعد از PyPI» — و در هیچ فهرستِ وابستگی نبود. روی
    # Colab و Kaggle هر دو از پیش هستند، پس سه ماه هیچ‌وقت اجرا نشد و
    # هیچ‌چیز نشان نداد که نمی‌تواند اجرا شود.
    #
    # همان شکلِ همیشگیِ این مخزن: کدی که نوشته و توضیح داده شده و
    # هرگز نمی‌توانسته کار کند. اینجا با خودِ سورس بسته می‌شود، نه با
    # فهرستی که کسی باید یادش بیفتد به‌روزش کند.
    print("۳۰ — هرچه dsprep import می‌کند، در فهرستِ وابستگی‌هاش هست")
    import ast as _a3
    dsSrc = io.open(os.path.join(os.path.dirname(os.path.abspath(
        __file__)), "dsprep.py"), encoding="utf-8").read()
    tree3 = _a3.parse(dsSrc)
    mods = set()
    for n in _a3.walk(tree3):
        if isinstance(n, _a3.Import):
            mods |= set(a.name.split(".")[0] for a in n.names)
        elif isinstance(n, _a3.ImportFrom) and n.module and n.level == 0:
            mods.add(n.module.split(".")[0])
    mods -= set(getattr(sys, "stdlib_module_names", ()))

    # ══ تنها معافیت، با دلیل ══
    # torch را هیچ‌کدام از سه سکو از ما نمی‌خواهد: Colab و Kaggle آن را
    # از پیش و جفت‌شده با CUDAِ خودشان دارند، و رانر نسخهٔ CPU را جدا
    # نصب می‌کند. گذاشتنش در DS_DEPS یعنی روی دو سکو دوباره‌نصبی که
    # بهترین حالت وقت می‌برد و بدترین حالت CUDA را می‌شکند.
    OWNED = {"torch"}
    import dsprep as D3
    have = set()
    for spec in D3.DS_DEPS:
        nm = spec.split(">")[0].split("<")[0].split("=")[0].strip()
        have.add(nm.replace("-", "_").lower())
    missing = sorted(m for m in mods
                     if m.lower() not in have and m not in OWNED)
    eq(missing, [],
       "هیچ importِ بی‌وابستگی نمانده (DS_DEPS: %s)" % ", ".join(D3.DS_DEPS))
    eq("imageio_ffmpeg" in mods and "imageio_ffmpeg" in have, True,
       "و همان یکی که رانر را زمین زد، حالا هست")

    # ── ۳۱ ─────────────────────────────────────────────────────────────
    # اجرای ۲ روی رانر ده دورِ کامل آموزش داد. اجرای ۳ همان فهرست را
    # ساخت — `rows: 541, from_dataset: 541`، عددهای یکسان — و هشت
    # ثانیه بعد از عمقِ DataLoaderِ torch مُرد:
    #   ValueError: File format b'\x80\x02\x8a\n' not understood
    # آن چهار بایت سرآیندِ یک فایلِ `.pth` است، نه WAV.
    #
    # علت: `_stems` روی فهرستِ مرتب `setdefault` می‌کرد، پس هر فایلِ
    # ناخوانده‌ای که زودتر مرتب شود جای فایلِ درست را می‌گیرد — و چون
    # فقط **یک ردیف** عوض می‌شود، شمارش دست‌نخورده می‌ماند. یک شمارشِ
    # درست، شاهدِ محتوای درست نیست.
    print("۳۱ — فهرستِ آموزش: نامِ درست، و محتوای درست")
    import rvcpipe as P31
    w31 = tempfile.mkdtemp()
    gt = os.path.join(w31, "0_gt_wavs")
    os.makedirs(gt)
    io.open(os.path.join(gt, "0_0.wav"), "w").write(u"x")
    io.open(os.path.join(gt, "0_0.pth"), "w").write(u"x")   # مزاحمِ زودترمرتب

    eq(P31._stems(gt)["0_0"], "0_0.pth",
       "بی فیلتر، فایلِ ناخوانده جای فایلِ درست را می‌گیرد (همان باگ)")
    eq(P31._stems(gt, ".wav")["0_0"], "0_0.wav",
       "با فیلترِ پسوند، فایلِ درست انتخاب می‌شود")
    eq(len(P31._stems(gt, ".wav")), 1,
       "و شمارش هم همان یک است — عددی که قبلاً گول می‌زد")

    # ── وارسیِ فهرست: چهار بایت، پیش از پنج ساعت ──
    root31 = tempfile.mkdtemp()
    d31 = os.path.join(root31, "logs", "t")
    os.makedirs(d31)
    okw = os.path.join(d31, "ok.wav")
    open(okw, "wb").write(b"RIFF" + b"\x00" * 40)
    npys = []
    for i in range(3):
        q = os.path.join(d31, "n%d.npy" % i)
        open(q, "wb").write(b"\x93NUMPY" + b"\x00" * 20)
        npys.append(q)
    badw = os.path.join(d31, "bad.wav")
    open(badw, "wb").write(b"\x80\x02\x8a\n" + b"\x00" * 40)  # همان .pth
    good = "|".join([okw] + npys + ["0"])
    bad = "|".join([badw] + npys + ["0"])
    gone = "|".join([os.path.join(d31, "nope.wav")] + npys + ["0"])
    io.open(os.path.join(d31, "filelist.txt"), "w", encoding="utf-8").write(
        "\n".join([good, bad, good, gone]))

    rep31 = P31.filelistCheck_(root31, "t")
    eq(rep31["rows"], 4, "چهار ردیف خوانده شد")
    eq(rep31["kept"], 2, "دو ردیفِ سالم ماند")
    eq(rep31["bad_count"], 2, "و دو ردیفِ خراب گرفته شد")
    eq(any("\\x80\\x02" in b or "x80" in b for b in rep31["bad"]), True,
       "دلیلِ خرابی نامِ فایل و سرآیندش را دارد: %s" % rep31["bad"])
    left = io.open(os.path.join(d31, "filelist.txt"),
                   encoding="utf-8").read().splitlines()
    eq(len(left), 2, "و فایل روی دیسک هم پاک‌سازی شد")
    eq(all(okw in ln for ln in left), True, "فقط ردیف‌های سالم ماندند")

    # ── کدِ صفر شاهدِ کار نیست ──
    # `train.py` کارِ اصلی را در یک Process جدا می‌کند؛ مرگِ آن بچه با
    # کدِ صفرِ پدر پوشیده می‌شود. اجرای ۳ دقیقاً همین‌طور «موفق» ثبت شد.
    src31 = io.open(os.path.join(os.path.dirname(os.path.abspath(
        __file__)), "voicetrain.py"), encoding="utf-8").read()
    eq("_newest_(root) <= before" in src31, True,
       "آموزشِ بی چک‌پوینتِ تازه، موفق حساب نمی‌شود")
    eq("filelistCheck_" in src31, True, "و فهرست پیش از آموزش سنجیده می‌شود")

    # ── ۳۲ ─────────────────────────────────────────────────────────────
    # تکهٔ «تبدیل»: مدلِ آموزش‌دیده را به کار می‌گیرد. سه چیز اینجا
    # می‌تواند بی سروصدا خراب باشد و هر سه بسته می‌شود.
    print("۳۲ — تبدیلِ صدا با مدلِ خودمان")
    import wave as _wv
    import struct as _st

    def wav32(path, sec=3.0, rate=16000, amp=0):
        f = _wv.open(path, "wb")
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
        n = int(rate * sec)
        f.writeframes(_st.pack("<%dh" % n, *([amp] * n)))
        f.close()
        return path

    w32 = tempfile.mkdtemp()
    outd = os.path.join(w32, "out"); os.makedirs(outd)
    srcw = wav32(os.path.join(w32, "src.wav"), 4.0)
    refw = wav32(os.path.join(w32, "ref.wav"), 4.0)
    mdl = os.path.join(w32, "razavi.pth"); io.open(mdl, "w").write(u"x")
    idx = os.path.join(w32, "razavi.index"); io.open(idx, "w").write(u"x")

    # دارایی‌های سنجیده‌شده را از پیش می‌گذاریم تا دانلود اجرا نشود
    import rvcpipe as P32
    ap32 = P32.inferAssetPaths_(os.path.abspath(outd).rstrip(os.sep)
                                + "-assets")
    os.makedirs(ap32["hubert"])
    os.makedirs(os.path.dirname(ap32["rmvpe"]), exist_ok=True)
    io.open(ap32["rmvpe"], "w").write(u"x")

    seen = {}

    class FakeLoader(object):
        def __init__(self, only_cpu=False, hubert_path=None, rmvpe_path=None,
                     **kw):
            seen["init"] = {"only_cpu": only_cpu, "hubert": hubert_path,
                            "rmvpe": rmvpe_path}

        def apply_conf(self, **kw):
            seen["conf"] = kw

        def generate_from_cache(self, audio_data=None, tag=None, **kw):
            seen["gen"] = {"audio": audio_data, "tag": tag}
            import numpy as _np
            return _np.zeros(int(16000 * 4.0), dtype="float32"), 16000

    fake32 = types.ModuleType("infer_rvc_python")
    fake32.BaseLoader = FakeLoader
    sys.modules["infer_rvc_python"] = fake32

    realSim = V.rvcSim_
    # هر گام عددِ خودش را می‌گیرد تا انتخابِ «بهترین» واقعاً سنجیده شود
    sims32 = [{"src_vs_ref": 0.31, "out_vs_ref": 0.44, "gain": 0.13,
               "moved_toward_target": True},
              {"src_vs_ref": 0.31, "out_vs_ref": 0.51, "gain": 0.20,
               "moved_toward_target": True},
              {"src_vs_ref": 0.31, "out_vs_ref": 0.79, "gain": 0.48,
               "moved_toward_target": True},
              {"src_vs_ref": 0.31, "out_vs_ref": 0.72, "gain": 0.41,
               "moved_toward_target": True}]
    V.rvcSim_ = lambda paths, out: sims32.pop(0)
    try:
        V.OPT.clear()
        V.OPT["_rep"] = {"engine": "rvc"}
        V.OPT["_out"] = outd
        V.OPT["rvc_model"] = mdl
        V.OPT["rvc_index"] = idx
        # ══ چرا هر سه با کاما ══
        # بارِ اول فقط گام با کاما آزموده شد و آن دوتای دیگر با یک
        # مقدار. کد هم دقیقاً همان‌قدر درست بود: روی رانر با
        #   ValueError: could not convert string to float: '0.66,0.85,1.0'
        # مُرد. قابلیتی که برای سه چیز نوشته شود و برای یکی آزموده،
        # برای همان یکی کار می‌کند.
        V.OPT["rvc_pitch"] = "0,-12"
        V.OPT["rvc_index_rate"] = "0.66,0.85"
        V.OPT["rvc_protect"] = "0.33"
        made32 = V.run_rvc(refw, srcw, "متنی که خوانده نمی‌شود", outd)
        rep32 = dict(V.OPT["_rep"])
    finally:
        V.rvcSim_ = realSim
        V.OPT.clear()

    # ══ چند گام، نه یکی ══
    # RVC زیروبمِ مبدأ را نگه می‌دارد؛ صوتِ Gemini صدای زن است و رضوی
    # مردی با صدای بم. با گامِ صفر خروجی هرقدر هم بافتِ رضوی را بگیرد،
    # «صدای رضوی» نمی‌شود — که گزارشِ اولین اجرای واقعی همین بود.
    eq([r["name"] for r in rep32["rvc"]["variants"]],
       ["rvc-p+0-i66-pr33.wav", "rvc-p+0-i85-pr33.wav",
        "rvc-p-12-i66-pr33.wav", "rvc-p-12-i85-pr33.wav"],
       "برای هر ترکیبِ هر سه اهرم یک فایل، و نام خودش ترکیبش را می‌گوید")
    eq(all(os.path.exists(os.path.join(outd, r["name"]))
           for r in rep32["rvc"]["variants"]), True, "و همه روی دیسک‌اند")
    eq(rep32["rvc"]["best"]["file"], "rvc-p-12-i66-pr33.wav",
       "بهترین با عدد انتخاب می‌شود، نه با ترتیب")
    eq(os.path.basename(made32), "rvc-p-12-i66-pr33.wav",
       "و همان به آزمایشگاه برگردانده می‌شود")

    # ══ دارایی‌ها نباید در خروجی بنشینند ══
    # ۳۴۰ مگابایت ContentVec و RMVPE داخلِ artifact یعنی کاربر برای
    # رسیدن به چند فایلِ صوتی، ۳۴۴ مگابایت دانلود می‌کند.
    eq(os.path.isdir(os.path.join(outd, "assets")), False,
       "پوشهٔ دارایی‌ها داخلِ خروجی نیست")

    # ══ جاروب روی هر سه اهرم، نه فقط گام ══
    # جاروبِ اول ثابت کرد گام تعیین‌کننده است ولی روی فلات می‌نشیند.
    # آنچه می‌ماند ایندکس و محافظ است؛ اگر این دو از فرم قابلِ جاروب
    # نباشند، هر آزمایش یک اجرای جدا می‌خواهد.
    eq(sorted(rep32["rvc"]["sweep"]), ["index_rate", "pitch", "protect"],
       "هر سه اهرم در گزارش ثبت می‌شوند")

    # ══ ۱: دارایی از منبعِ سنجیده‌شده، نه آینهٔ پیش‌فرضِ بسته ══
    # اگر مسیر ندهیم، کتابخانه ContentVec و RMVPE را از مخزنی شخصی
    # می‌گیرد که پروانه‌اش سنجیده نشده. قاعدهٔ کلِ این کار از روزِ اول
    # این بوده که **پروانهٔ وزن‌ها حاکم است، نه پروانهٔ کد**.
    eq(seen["init"]["hubert"], ap32["hubert"],
       "ContentVecِ سنجیده‌شده داده می‌شود")
    eq(seen["init"]["rmvpe"], ap32["rmvpe"], "RMVPEِ سنجیده‌شده داده می‌شود")
    eq(seen["init"]["only_cpu"], True, "روی CPU اجرا می‌شود")

    # ══ ۲: واژه‌ها از مبدأ می‌آیند، نه از متن ══
    # کلِ معماری روی همین بند است. اگر روزی کسی متن را به این موتور
    # بدهد، یعنی زبان دوباره وارد ماجرا شده — همان چیزی که سه موتورِ
    # قبلی سرش شکستند.
    eq(seen["gen"]["audio"], srcw, "ورودی، صوتِ مبدأ است")
    eq(seen["conf"]["file_model"], mdl, "مدلِ خودمان به کار می‌رود")
    eq(seen["conf"]["file_index"], idx, "و ایندکسش")
    eq(seen["conf"]["pitch_algo"], "rmvpe",
       "همان روشِ زیروبمی که در آموزش هم به کار رفت")

    # ══ ۳: شاهد در گزارش، نه فقط یک فایل ══
    eq(rep32["rvc"]["length"]["kept"], True,
       "طول حفظ شد — یعنی واژه‌ها دست‌نخورده‌اند")
    eq(rep32["rvc"]["variants"][1]["speaker"]["moved_toward_target"], True,
       "و حرکتِ شباهت برای هر گام جدا ثبت شد")

    # ══ وابستگیِ شاهد هم وابستگی است ══
    # اولین اجرای واقعی با مدل، این را برگرداند:
    #   "speaker": {"error": "No module named 'speechbrain'"}
    # یعنی تنها عددی که به «کار کرد یا نه» جواب می‌داد اصلاً محاسبه
    # نشد، چون فهرستِ بسته‌ها فقط چیزی را داشت که *تبدیل* لازم دارد.
    # همان شکلِ `imageio_ffmpeg`، یک فایل آن‌طرف‌تر.
    eq(any("speechbrain" in x for x in V.ENGINES["rvc"]["pip"]), True,
       "مدلِ سنجشِ گوینده نصب می‌شود، وگرنه گزارش عدد ندارد")

    # ══ ایندکسِ نبوده باید اعلام شود، نه اینکه بی‌صدا رد شود ══
    V.OPT.clear()
    V.OPT["_rep"] = {"engine": "rvc"}; V.OPT["_out"] = outd
    V.OPT["rvc_model"] = mdl
    V.OPT["rvc_index"] = os.path.join(w32, "nope.index")
    V.OPT["rvc_pitch"] = "0"
    V.OPT["rvc_index_rate"] = "0.66"
    V.OPT["rvc_protect"] = "0.33"
    V.rvcSim_ = lambda paths, out: {}
    try:
        V.run_rvc(refw, srcw, "", outd)
    finally:
        V.rvcSim_ = realSim
        V.OPT.clear()
    eq(seen["conf"]["file_index"], "",
       "ایندکسِ نبوده کنار گذاشته می‌شود، نه اینکه مسیرِ بی‌فایل برود")

    # ══ عددی که کاربر می‌خواند، خودش باید سنجیده شده باشد ══
    # `rvcSim_` تنها چیزی است که به سؤالِ «کار کرد یا نه» جواب می‌دهد
    # پیش از اینکه کسی گوش کند. با رمزگذارِ بدلی سنجیده می‌شود تا
    # مدلِ واقعی دانلود نشود — منطقِ کسینوس و «تغییر» همان است.
    import dsprep as D32
    import numpy as _np32

    vecs32 = {"ref": [1.0, 0.0, 0.0], "src": [0.2, 0.98, 0.0],
              "out": [0.9, 0.44, 0.0]}
    order32 = []

    class FakeEnc(object):
        def encode_batch(self, t):
            key = order32.pop(0)
            v = _np32.array(vecs32[key], dtype="float64")
            return _T32(v / _np32.linalg.norm(v))

    class _T32(object):
        def __init__(self, v):
            self.v = v

        def squeeze(self):
            return self

        def detach(self):
            return self

        def cpu(self):
            return self

        def numpy(self):
            return self.v

    # `dsEmbed_` دو چیز از torch می‌خواهد و torchِ این آزمون بدلی است.
    class _NoGrad32(object):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    th32 = sys.modules["torch"]
    saved32 = (getattr(th32, "no_grad", None), getattr(th32, "from_numpy", None))
    th32.no_grad = _NoGrad32
    th32.from_numpy = lambda a: a
    realEnc32 = D32.dsEncoder_
    D32.dsEncoder_ = lambda tmp: FakeEnc()
    try:
        order32[:] = ["ref", "src", "out"]
        sim32 = V.rvcSim_({"ref": refw, "src": srcw, "out": made32}, outd)
    finally:
        D32.dsEncoder_ = realEnc32

    eq(sim32["out_vs_ref"] > sim32["src_vs_ref"], True,
       "خروجی به گوینده نزدیک‌تر از مبدأ است (%s > %s)"
       % (sim32["out_vs_ref"], sim32["src_vs_ref"]))
    eq(sim32["moved_toward_target"], True, "و «حرکت شد» ثبت می‌شود")
    eq(round(sim32["gain"], 3),
       round(sim32["out_vs_ref"] - sim32["src_vs_ref"], 3),
       "تغییر دقیقاً تفاضلِ همان دو عدد است، نه چیزِ دیگری")

    # و وقتی هیچ اتفاقی نیفتاده — همان حالتی که بی این سنجه شبیهِ
    # موفقیت به نظر می‌رسد
    D32.dsEncoder_ = lambda tmp: FakeEnc()
    try:
        vecs32["out"] = list(vecs32["src"])
        order32[:] = ["ref", "src", "out"]
        flat32 = V.rvcSim_({"ref": refw, "src": srcw, "out": made32}, outd)
    finally:
        D32.dsEncoder_ = realEnc32
        th32.no_grad, th32.from_numpy = saved32
    eq(flat32["moved_toward_target"], False,
       "تبدیلی که هیچ نکرده، موفق اعلام نمی‌شود (تغییر %s)" % flat32["gain"])

    # ══ ۴: هر خانهٔ فرم باید واقعاً به جایی برود ══
    # همان شکلِ خرابی که `run_wiring_test.js ۵.۲` در موتور می‌گیرد:
    # دکمه‌ای که هست و هیچ نمی‌کند. اینجا خانه‌ای که پر می‌شود و به
    # هیچ فرمانی نمی‌رسد.
    wfl = io.open(os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), ".github", "workflows",
        "voice-lab.yml"), encoding="utf-8").read()
    body = wfl.split("jobs:", 1)[1]
    fields = re.findall(r"^      ([a-z0-9_]+):$", wfl.split("jobs:", 1)[0],
                        re.M)
    dead = [f for f in fields if ("inputs.%s" % f) not in body]
    eq(dead, [], "هیچ خانهٔ فرمی بی‌مصرف نمانده")
    for need in ("--rvc-model", "--rvc-index"):
        eq(need in wfl, True, "%s به فرمان می‌رسد" % need)

    # ══ ۴-ب: نمونه‌ها از پوشه خوانده شوند، نه از یک فهرستِ دستی ══
    # اجرای #۵۷ هشت شناسه گرفت و گزارشش پنج فایل داشت: مرحلهٔ دانلود
    # درست کار می‌کرد و مرحلهٔ ساختِ فرمان `ref1..ref5` را **دستی**
    # نوشته بود. نه خطایی، نه هشداری — فقط سه ضبط که هیچ‌وقت نرسیدند.
    # این همان الگوی «فهرستِ دستی از کاری که کد می‌کند» است که در موتور
    # سه تریگر را جا انداخت؛ پس اینجا هم نگهبان می‌گیردش.
    build = wfl.split("ARGS=(--engine", 1)[1].split("\n          if [ -f src.input ]", 1)[0]
    # توضیح‌ها سنجیده نمی‌شوند — همین‌جا نامِ `ref5.input` در شرحِ خودِ باگ
    # هست، و نگهبانی که متن را با فرمان یکی بگیرد، اولین قربانی‌اش
    # توضیحِ همان چیزی است که می‌پاید.
    cmds = "\n".join(l for l in build.splitlines() if not l.strip().startswith("#"))
    eq(re.search(r"ref[0-9]+\.input", cmds) is None, True,
       "فهرستِ نمونه‌ها دستی نوشته نشده")
    eq("ls ref*.input" in cmds, True, "نمونه‌ها از خودِ پوشه خوانده می‌شوند")

    # ── ۳۳ ─────────────────────────────────────────────────────────────
    # کارتِ سبک: نیمهٔ دومِ یک گوینده. مدلِ تبدیل رنگِ صدا را می‌دهد و
    # مکث و کشش از صوتِ مبدأ می‌آید — پس این متن است که به Gemini
    # می‌گوید چطور بخواند. اگر متن غلط باشد، هیچ خطایی بلند نمی‌شود؛
    # فقط قسمت بد خوانده می‌شود.
    print("۳۳ — کارتِ سبک: هر جمله از یک عدد")
    import stylecard as SC

    razavi33 = {"seconds": 180.0, "speech_pct": 64,
                "phrase_seconds_median": 2.4, "phrase_seconds_p95": 5.8,
                "hold_ratio": 2.4, "pauses_per_minute": 22.0,
                "pause_short_median": 0.28, "pause_sentence_median": 0.62,
                "pause_para_median": 1.3, "level_spread_db": 12.0,
                "range_semitones": 9.0, "phrase_fall_semitones": -2.6,
                "phrases_measured": 140, "gaps_measured": 190}
    gemini33 = dict(razavi33, speech_pct=90, phrase_seconds_median=5.8,
                    pauses_per_minute=8.0, hold_ratio=1.24)

    cR = SC.styleCard_(razavi33, "رضوی")["instruction"]
    cG = SC.styleCard_(gemini33, "جمینای")["instruction"]

    # ══ عبارتِ بلند یعنی بی‌نفس، نه آرام ══
    # نسخهٔ اول طولِ عبارت را نشانهٔ آرامی گرفت و برای صوتی با ۹۰٪ گفتار
    # و عبارت‌های ۵٫۸ ثانیه‌ای نوشت «بسیار آرام و سنگین» — دقیقاً وارونهٔ
    # چیزی که در صدا بود. آرامیِ روایت را **سکوت** می‌سازد.
    eq("کم‌نفس" in cG, True, "۹۰٪ گفتار «کم‌نفس» خوانده می‌شود")
    eq("پرحرفی نکن" in cG, True, "و هشدارش را می‌گیرد")
    eq("آرام و روایی" in cR, True, "۶۴٪ گفتار «آرام و روایی» است")
    eq("کم‌نفس" in cR, False, "و آن هشدار برایش صادر نمی‌شود")

    # هر عددِ تعیین‌کننده باید در متن دیده شود — وگرنه «دستورِ دقیق»
    # همان توصیفِ کلی است با ظاهرِ بهتر.
    for want in ("0.28", "0.62", "1.3", "22.0", "64"):
        eq(want in cR, True, "عددِ %s در دستور آمده" % want)

    eq("کِش" in cR or "نگه دار" in cR, True,
       "کششِ بلند (نسبتِ %s) در دستور هست" % razavi33["hold_ratio"])
    eq("فرود" in cR, True, "فرودِ پایانِ عبارت گفته می‌شود")

    # ══ حلقهٔ بسته ══
    # بی این، کارت فقط یک آرزوی دقیق‌تر است.
    gap = SC.styleCompare_(razavi33, gemini33)
    eq(gap["followed"], False, "خروجیِ فعلی سبکِ هدف را رعایت نکرده")
    eq(gap["fields"]["speech_pct"]["off_pct"] >= 25, True,
       "و مهم‌ترین تفاوت — نسبتِ سکوت — گرفته می‌شود (%d%%)"
       % gap["fields"]["speech_pct"]["off_pct"])
    same = SC.styleCompare_(razavi33, dict(razavi33))
    eq(same["followed"], True, "و وقتی یکی باشند، «رعایت شد» می‌گوید")
    eq(SC.styleCompare_({}, {})["followed"], False,
       "مقایسهٔ تهی «رعایت شد» نیست — نبودِ شاهد، شاهدِ نبودن نیست")

    # ورودیِ خراب نباید کارتِ بی‌معنا بسازد
    bad33 = SC.styleCard_({"error": "هیچ گفتاری پیدا نشد"}, "x")
    eq(bad33["instruction"], "", "بی اندازه‌گیری، دستوری هم نیست")

    # ── ۳۴ ─────────────────────────────────────────────────────────────
    # اجرای واقعیِ اولِ کارتِ سبک سالم تمام شد، هیچ خطایی نداد، و
    # بی‌ارزش بود: از **۳۰ ثانیه** و ۷ عبارت ساخته شده بود، چون خانهٔ
    # «چند ثانیه» برای نمونهٔ کلونینگ نوشته شده بود نه برای
    # اندازه‌گیریِ سبک. هیچ‌کدام از این چهار چیز خطا بلند نمی‌کنند —
    # فقط عددِ غلط می‌دهند، که بدترین شکلِ خرابی در این ریپوست.
    print("۳۴ — کارتِ سبک: نمونه باید بلند، خام و بی‌سوگیری باشد")

    # ══ الف: پنجرهٔ بلند اجباری است، و فرم نمی‌تواند کوتاهش کند ══
    eq(V.ENGINES["style"].get("ref_window", 0) >= SC.STYLE_WINDOW, True,
       "موتورِ سبک پنجرهٔ %d ثانیه‌ای می‌خواهد" % SC.STYLE_WINDOW)
    srcV = io.open(V.__file__.replace(".pyc", ".py"), encoding="utf-8").read()
    eq("max(refSec, win_)" in srcV and "max(srcSec, win_)" in srcV, True,
       "و عددِ فرم را کف می‌زند، نه اینکه به آن تن بدهد")
    eq(V.ENGINES["style"].get("text_out"), True,
       "خروجی‌اش متن است، پس WAV پنداشته نمی‌شود")

    # ══ ب: پنجره به همان طولی سنجیده شود که بریده می‌شود ══
    # فایلی می‌سازیم که نیمهٔ اولش تمیز است و نیمهٔ دومش موسیقیِ
    # بی‌مکث. با پنجرهٔ سی‌ثانیه‌ایِ ثابت، «بهترین جا» ابتدای فایل
    # می‌شد و بعد ۱۲۰ ثانیه از همان‌جا بریده می‌شد — یعنی موسیقی
    # داخلِ برش. حالا اگر پنجره ۱۲۰ باشد، باید همان اول را بدهد ولی
    # با نمره‌ای که موسیقی را دیده باشد.
    import math as _m34, wave as _w34, array as _a34
    d34 = tempfile.mkdtemp()
    def mk34(path, secs, rate=24000):
        w = _w34.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2)
        w.setframerate(rate)
        a = _a34.array("h")
        for i in range(int(secs * rate)):
            t = i / float(rate)
            # نیمهٔ اول: گفتارِ ساختگی با مکث‌های واقعی (سکوتِ مطلق)
            # نیمهٔ دوم: موجِ پیوسته و بی‌سکوت — یعنی «موسیقی»
            if t < secs / 2.0:
                on = (int(t) % 3) != 2          # دو ثانیه صدا، یک ثانیه سکوت
                v = 9000 * _m34.sin(2 * _m34.pi * 140 * t) if on else 0
            else:
                v = 9000 * _m34.sin(2 * _m34.pi * 300 * t)
            a.append(int(v))
        w.writeframes(a.tobytes()); w.close()
        return path
    f34 = mk34(os.path.join(d34, "half.wav"), 120.0)
    r30 = V.refScore_(f34, seconds=30.0)
    r90 = V.refScore_(f34, seconds=90.0)
    # با پنجرهٔ ۹۰ ثانیه‌ای، هر جایی که انتخاب شود ناچار موسیقی را
    # در بر می‌گیرد — پس نمره باید بدتر از پنجرهٔ کوتاه باشد. اگر
    # طولِ پنجره در نمره اثر نکند، این دو برابرند.
    eq(r90["score"] < r30["score"], True,
       "طولِ پنجره در نمره اثر دارد (۳۰→%s، ۹۰→%s)"
       % (r30["score"], r90["score"]))

    # ══ پ: در حالتِ خنثی، سکوت جریمه نمی‌شود ══
    # نمرهٔ معمول پنجره‌ای با ۶۶٪ گفتار را می‌خواهد. برای *انتخابِ
    # نمونه* درست است، ولی وقتی داریم نسبتِ سکوت را **اندازه
    # می‌گیریم**، همان معیار جواب را از پیش تعیین می‌کند.
    # دو ضبطِ یکسان جز در نسبتِ سکوت: یکی پرحرف، یکی ساکت‌تر. نمرهٔ
    # معمول باید پرحرف را بالاتر بنشاند (نمونهٔ کلونینگِ بهتر)، و
    # نمرهٔ خنثی باید بینشان تفاوتی نگذارد.
    def mkTalk34(path, secs, onSec, offSec, rate=24000):
        w = _w34.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2)
        w.setframerate(rate)
        a = _a34.array("h")
        per = onSec + offSec
        for i in range(int(secs * rate)):
            t = i / float(rate)
            on = (t % per) < onSec
            a.append(int(9000 * _m34.sin(2 * _m34.pi * 140 * t)) if on else 0)
        w.writeframes(a.tobytes()); w.close()
        return path
    talky = mkTalk34(os.path.join(d34, "talky.wav"), 60.0, 2.0, 1.0)   # ۶۶٪
    quiet34 = mkTalk34(os.path.join(d34, "quiet.wav"), 60.0, 1.0, 1.5)  # ۴۰٪
    nT = V.refScore_(talky, seconds=30.0)["score"]
    nQ = V.refScore_(quiet34, seconds=30.0)["score"]
    eq(nT - nQ > 5.0, True,
       "نمرهٔ معمول پرحرف را ترجیح می‌دهد (%s در برابر %s)" % (nT, nQ))
    xT = V.refScore_(talky, seconds=30.0, neutral=True)["score"]
    xQ = V.refScore_(quiet34, seconds=30.0, neutral=True)["score"]
    eq(abs(xT - xQ) < 1.0, True,
       "و خنثی بینشان فرقی نمی‌گذارد (%s در برابر %s)" % (xT, xQ))
    eq("neutral=neutral_" in srcV, True, "و موتورِ سبک خنثی صدا می‌زند")

    # ══ ت: سنجش روی برشِ خام، نه نرمال‌شده ══
    # `to_wav` بهرهٔ پویا می‌زند؛ یکی از عددهای کارت «نوسانِ بلندی»
    # است. سنجیدنش پس از loudnorm یعنی سنجیدنِ کارِ خودمان.
    base34 = os.path.join(d34, "reference.wav")
    io.open(base34, "wb").write(b"RIFF" + b"\0" * 4000)
    eq(V.styleRaw_(base34), base34, "برشِ خام نبود، همان نرمال‌شده")
    cut34 = os.path.join(d34, "reference-chosen-window.wav")
    io.open(cut34, "wb").write(b"RIFF" + b"\0" * 4000)
    eq(V.styleRaw_(base34), cut34, "برشِ خام بود، همان انتخاب می‌شود")

    # ══ ث: کارت باید بگوید از چند عبارت ساخته شده ══
    thin34 = dict(razavi33, phrases_measured=7, gaps_measured=11,
                  seconds=29.9)
    cT = SC.styleCard_(thin34, "رضوی")["instruction"]
    eq("نمونه کم بود" in cT, True, "کارتِ ۷ عبارتی هشدارِ نمونهٔ کم می‌گیرد")
    eq("نمونه کم بود" in cR, False, "و کارتِ ۱۴۰ عبارتی نمی‌گیرد")

    # ══ ج: پایانِ عبارت هر دو جهت دارد ══
    # اندازه‌گیریِ واقعی عکسِ فرضم را گفت: رضوی عبارت را **بالا** تمام
    # می‌کند (+۱٫۸) و Gemini پایین (−۲٫۳). کارتِ اولی که فقط شاخهٔ
    # «فرود» را داشت، دربارهٔ گویندهٔ واقعی هیچ نگفت.
    upC = SC.styleCard_(dict(razavi33, phrase_fall_semitones=1.8),
                        "رضوی")["instruction"]
    eq("معلق" in upC, True, "عبارتِ رو به بالا «تعلیق» می‌شود")
    eq("فرود بیاور" in upC, False, "و دستورِ وارونه نمی‌گیرد")
    eq("فرود بیاور" in cR, True, "و عبارتِ رو به پایین همچنان «فرود»")

    # ══ چ: جای مکث، نه فقط اندازه‌اش ══
    mixC = SC.styleCard_(dict(razavi33, pause_mix_pct={
        "short": 71, "sentence": 29, "paragraph": 0}), "رضوی")["instruction"]
    eq("در دلِ جمله" in mixC and "71" in mixC, True,
       "۷۱٪ مکثِ درون‌جمله‌ای در دستور می‌آید")
    evenC = SC.styleCard_(dict(razavi33, pause_mix_pct={
        "short": 25, "sentence": 25, "paragraph": 50}), "رضوی")["instruction"]
    eq("بیشترِ مکث‌ها را در دلِ جمله" in evenC, False,
       "و برای پخشِ یکنواخت ادعا نمی‌شود")

    # ══ ح: هر واحد با معیارِ خودش ══
    # عددهای واقعیِ اجرای ۲۴۰ ثانیه‌ای. فرودِ پایانِ عبارتِ رضوی +۰٫۲
    # نیم‌پرده است و جمینای −۲٫۸: اختلاف سه نیم‌پرده، واقعی ولی کوچک.
    # نسبت آن را **۱۵۰۰٪** گزارش می‌کرد، چون مخرج نزدیکِ صفر بود — و
    # در هر فهرستِ اولویت بالای «۵۱٪ در برابر ۸۴٪ سکوت» می‌نشست، که
    # تفاوتِ واقعیِ این دو خواننده است.
    R240 = {"speech_pct": 51, "phrase_seconds_median": 1.6,
            "pause_short_median": 0.3, "pause_sentence_median": 0.6,
            "pauses_per_minute": 15.2, "range_semitones": 6.8,
            "phrase_fall_semitones": 0.2, "hold_ratio": 2.5}
    G240 = {"speech_pct": 84, "phrase_seconds_median": 4.6,
            "pause_short_median": 0.4, "pause_sentence_median": 0.7,
            "pauses_per_minute": 8.5, "range_semitones": 11.1,
            "phrase_fall_semitones": -2.8, "hold_ratio": 2.72}
    g240 = SC.styleCompare_(R240, G240)
    fall = g240["fields"]["phrase_fall_semitones"]
    eq(fall["off"], True, "سه نیم‌پرده اختلافِ فرود، همچنان اشکال است")
    eq(fall["severity"] < 5, True,
       "ولی شدتش نجومی نیست (%s برابرِ آستانه، نه ۱۵ برابر)"
       % fall["severity"])
    top = max(g240["fields"].items(), key=lambda kv: kv[1]["severity"])[0]
    eq(top, "phrase_seconds_median",
       "بالای فهرست، بزرگ‌ترین تفاوتِ واقعی است نه کوچک‌ترین مخرج (%s)"
       % top)
    eq(g240["fields"]["pause_sentence_median"]["off"], False,
       "۰٫۶ در برابر ۰٫۷ ثانیه اشکال شمرده نمی‌شود")
    eq(g240["fields"]["hold_ratio"]["off"], False,
       "و کششی که جمینای درست انجام می‌دهد، اشکال شمرده نمی‌شود")
    eq(g240["off_count"], 5, "پنج سنجه از هشت بیرونِ آستانه (%d)"
       % g240["off_count"])
    # و آنچه هست باید همان چیزی باشد که گوش می‌شنود:
    eq(g240["fields"]["speech_pct"]["off"], True, "نسبتِ سکوت اشکال است")
    # و سنجه‌ای که دقیقاً روی آستانه بنشیند نباید بین دو اجرا برقصد:
    eq(g240["fields"]["pause_short_median"]["off"], False,
       "۰٫۴ منهای ۰٫۳ روی آستانهٔ ۰٫۱ می‌نشیند، نه بیرونش")

    # ── ۳۵ ─────────────────────────────────────────────────────────────
    # لایهٔ حالت‌ها: یک گوینده یک‌جور نمی‌خوانَد، و کارتِ میانه دقیقاً
    # همان چیزی را پنهان می‌کند که پرسش بود. اینجا سه چیز باید درست
    # باشد و هیچ‌کدام خطا بلند نمی‌کنند: مرزِ بندها، خوشه‌های واقعی
    # در برابرِ خط‌کشیِ الکی، و اینکه عددهای هر کارت مالِ خودش باشد.
    print("۳۵ — حالت‌ها: مرزِ درست، خوشهٔ واقعی، عددِ خودی")
    scSrc0 = io.open(SC.__file__.replace(".pyc", ".py"),
                     encoding="utf-8").read()

    # ══ الف: مرزِ بند ══
    # باگی که آزمونِ دو-گویندهٔ واقعی لو داد: بندی که به کفِ طول
    # نرسیده بود از روی یک سکوتِ بلند **رد می‌شد** و دو جور خواندن
    # را با هم میانگین می‌گرفت — هشت بند از هجده، هر کدام با ۶ ثانیه
    # از یکی و ۱۷ ثانیه از آن‌یکی.
    def spans35(chunks):
        """(طولِ گفتار، مکثِ بعدش) → فهرستِ بازه‌ها"""
        out, t = [], 0.0
        for dur, gap in chunks:
            out.append((t, t + dur))
            t += dur + gap
        return out
    # پنج ثانیه گفتار، بعد سکوتِ ۱٫۶ ثانیه‌ای (مرزِ بخش)، بعد ۲۰ ثانیه:
    # تکهٔ پنج‌ثانیه‌ای باید دور ریخته شود، نه اینکه به بعدی بچسبد.
    ps, dr = SC.stylePassages_(spans35(
        [(5.0, 1.6)] + [(4.0, 0.3)] * 5 + [(4.0, 1.6)] + [(4.0, 0.3)] * 4))
    eq(len(ps) >= 1, True, "بندی ساخته شد (%d)" % len(ps))
    eq(round(ps[0][0], 1) >= 6.0, True,
       "تکهٔ کوتاهِ پیش از مرزِ بخش وارد بندِ بعدی نشد (شروع %.1f)"
       % ps[0][0])
    eq(dr >= 4.9, True, "و به‌عنوان دورریخته ثبت شد (%s ثانیه)" % dr)
    for a, b in ps:
        eq(b - a >= SC.MODE_MIN_SEC, True,
           "هیچ بندی زیرِ کف نیست (%.1f)" % (b - a))
    # ══ مکثِ جمله می‌چسبانَد، مرزِ بخش می‌بُرد ══
    # همان مادهٔ خام، فقط با مکثِ متفاوت: با مکثِ یک‌ثانیه‌ای تکه‌ها
    # به هم می‌چسبند تا به کف برسند؛ با یک‌ونیم‌ثانیه هر تکه جدا
    # می‌مانَد و چون هیچ‌کدام به کف نمی‌رسند، **هیچ بندی** نمی‌مانَد.
    # دومی نتیجهٔ درست است، نه شکست: ضبطی که فقط تکه‌های شش‌ثانیه‌ایِ
    # جدا دارد، بندی برای سنجیدن ندارد — و `dropped` می‌گوید چرا.
    p1, d1 = SC.stylePassages_(spans35([(6.0, 1.0)] * 6))
    p2, d2 = SC.stylePassages_(spans35([(6.0, 1.6)] * 6))
    eq(len(p1) >= 2 and all(b - a >= SC.MODE_MIN_SEC for a, b in p1), True,
       "مکثِ جمله بند را نمی‌شکند: %d بند" % len(p1))
    eq(len(p2), 0, "مرزِ بخش می‌بُرد و تکه‌های کوتاه نمی‌مانند")
    eq(d2 >= 35.0, True, "و همه‌اش به‌عنوان دورریخته ثبت است (%s)" % d2)
    eq(SC.stylePassages_([]), ([], 0.0), "ورودیِ تهی نمی‌ترکد")

    # ══ ب: خوشه‌ها باید **واقعی** باشند ══
    # k-means روی ابرِ بی‌ساختار هم k خوشه می‌دهد. اگر سیلوئت دروازه
    # نباشد، برای گوینده‌ای که یک‌جور می‌خواند سه دستورِ متفاوت
    # می‌سازیم که هیچ‌کدام از صدا نیامده‌اند.
    import numpy as _np35
    rng35 = _np35.random.RandomState(3)
    two = _np35.vstack([rng35.randn(20, 5) - 3.0, rng35.randn(20, 5) + 3.0])
    lab35, cen35, _in35 = SC._kmeans_(two, 2)
    eq(SC._sil_(two, lab35) > 0.6, True,
       "دو ابرِ جدا، سیلوئتِ بالا (%.2f)" % SC._sil_(two, lab35))
    eq(sorted(_np35.bincount(lab35).tolist()), [20, 20],
       "و هر کدام بیست عضو")
    blob = rng35.randn(40, 5)
    eq(SC._sil_(blob, SC._kmeans_(blob, 3)[0]) < SC.MODE_SIL_MIN + 0.2, True,
       "ابرِ بی‌ساختار سیلوئتِ پایین می‌گیرد")
    # و بذر ثابت است — وگرنه نامی که آدم روی حالت گذاشته فردا
    # حالتِ دیگری را نشان می‌دهد (درسِ `musicWrap_`).
    eq((SC._kmeans_(two, 2)[0] == lab35).all(), True,
       "دو بار اجرا، همان خوشه‌بندی")

    # ══ پ: عددهای هر کارت مالِ خودش ══
    # نسخهٔ اول عددهای کلِ ضبط را پایه می‌گرفت و چند تا را عوض
    # می‌کرد، و کارت این را نوشت: «هر عبارت حدودِ ۷٫۱ ثانیه (گاهی تا
    # ۲٫۹)» — صدکِ ۹۵ کوچک‌تر از میانه، چون از دو جا آمده بودند.
    agg35 = SC.styleAgg_([1.0, 2.0, 3.0, 9.0], [0.3, 0.6, 1.4], 
                         [-20.0, -22.0, -24.0], 60.0)
    eq(agg35["phrase_seconds_p95"] >= agg35["phrase_seconds_median"], True,
       "صدکِ ۹۵ هرگز زیرِ میانه نیست")
    eq(sum(agg35["pause_mix_pct"].values()) in (99, 100, 101), True,
       "نسبتِ مکث‌ها جمعش صد است")
    mode35 = {"n": 1, "name": "حالتِ 1 — پرمکث‌تر", "share_pct": 60,
              "passages": 9,
              "numbers": dict(agg35, phrase_fall_semitones=-2.0,
                              range_semitones=9.0, phrases_measured=40,
                              gaps_measured=30),
              "sample": {"at": 0, "seconds": 20}}
    txt35 = SC.modeCard_(mode35, dict(razavi33, phrase_seconds_p95=99.9),
                         "رضوی")["instruction"]
    eq("99.9" not in txt35, True,
       "عددی که فقط در کارتِ کلی هست، به کارتِ حالت نشت نمی‌کند")
    eq(str(agg35["phrase_seconds_p95"]) in txt35, True,
       "و صدکِ خودِ حالت در متن هست")

    # ══ ت: نام از عددها می‌آید ══
    z35 = [0.0] * len(SC.MODE_KEYS)
    z35[SC.MODE_KEYS.index("speech_pct")] = -1.4
    eq("پرمکث‌تر" in SC.modeName_(z35, 2), True, "محورِ سکوت در نام می‌آید")
    eq("حالتِ 2" in SC.modeName_(z35, 2), True, "و شماره‌اش")
    eq(SC.modeName_([0.0] * len(SC.MODE_KEYS), 1).endswith("میانه"), True,
       "و حالتی که با عادتِ خودش فرقی ندارد، «میانه» است نه یک صفتِ ساختگی")

    # ══ چ: زیروبم یک تعریف دارد، و آن تعریف «فقط گفتار» است ══
    # `yin` روی سکوت هم عدد می‌دهد و فیلترِ ۶۰–۳۵۰ هرتز بیرونش
    # نمی‌اندازد. رضوی نیمی از وقتش ساکت است، یعنی نیمی از فریم‌هایی
    # که «بازهٔ زیروبمِ او» را می‌ساختند صدای او نبودند: ۴٫۳ نیم‌پرده
    # با سکوت در برابرِ ۶٫۷ بی آن. و بدتر — حالت‌ها این را روی بندها
    # حساب می‌کردند و کارتِ اصلی روی کلِ پنجره، بعد کنارِ هم چاپ
    # می‌شدند.
    eq("stylePitchOf_(y, rate, spans)" in scSrc0, True,
       "کارتِ اصلی زیروبم را از گفتار می‌گیرد")
    # دو جا `yin` لازم است (آمارِ کل · فرودِ هر عبارت) ولی بازه و
    # قابشان باید یکی باشد، وگرنه دو عددی که کنارِ هم چاپ می‌شوند دو
    # چیزِ متفاوت‌اند — همان درسِ `srcJoinJs_`.
    eq(scSrc0.count("**YIN)"), scSrc0.count("librosa.yin("),
       "هر فراخوانِ yin از همان یک تعریف می‌آید (%d از %d)"
       % (scSrc0.count("**YIN)"), scSrc0.count("librosa.yin(")))
    eq("fmin=60" not in scSrc0.split("YIN = {")[1], True,
       "و هیچ‌جا بازه دستی نوشته نشده")
    eq("styleF0_(y, rate)" not in scSrc0, True,
       "هیچ‌جا زیروبم روی کلِ فایل (با سکوت) حساب نمی‌شود")

    # ══ ح: نمونهٔ شنیدنی باید از همان‌جا باشد که ادعا می‌شود ══
    # وقتی پنجره از **وسطِ** فایل بریده می‌شود، هر `at` نسبت به آن
    # برش است ولی برشِ صوتی از فایلِ اصلی گرفته می‌شود. بی نگه داشتنِ
    # جابه‌جایی، نمونه صوتِ سالمی است که مالِ آن حالت نیست — و کسی
    # نمی‌فهمد، چون خطایی در کار نیست. نام‌گذاری با گوش انجام می‌شود،
    # پس نمونهٔ اشتباه یعنی نامِ اشتباه روی همهٔ کارت‌ها.
    # و همان پنجره برای هر دو، وگرنه «۹٫۹ در برابرِ ۴٫۳» دو
    # اندازه‌گیری از دو بازهٔ متفاوت است.
    eq(srcV.count("seconds=MODES_WINDOW"), 2,
       "کارتِ اصلی و مبدأ هر دو همان پنجرهٔ حالت‌ها را می‌گیرند")
    eq(V.ENGINES["style"]["ref_window"] == int(SC.MODES_WINDOW), True,
       "و پنجرهٔ خودِ موتور هم همان است")

    eq('sc.get("offset", 0.0)' in scSrc0, True,
       "برشِ نمونه جابه‌جاییِ پنجرهٔ همان ضبط را می‌گیرد")
    eq('smp.get("src")' in scSrc0, True,
       "و از همان ضبطی می‌بُرد که نماینده‌اش در آن است")
    eq('smp["at_in_file"] = a' in scSrc0, True,
       "و عددی که گزارش می‌شود همان است که بریده شد")

    # ══ خ: گزارش باید واقعاً JSON بشود — با عددهای **واقعی** ══
    # اجرای ۵۴ روی رانر سه دقیقه دوید و سرِ آخرین خط ترکید:
    # «Object of type bool_ is not JSON serializable». علتش یک مقایسه
    # در `styleCompare_` بود: عددهای زیروبم از `np.log2` می‌آیند، پس
    # `np.float64`اند — و آن در JSON بی‌صدا رد می‌شود چون **زیرکلاسِ
    # `float`** است. ولی `a > b` رویشان `np.bool_` می‌دهد که زیرکلاسِ
    # `bool` **نیست**.
    #
    # و بخشِ ۳۴ همین را آزموده بود و نگرفت، چون عددهایش را دستی و
    # پایتونی نوشته بودم. آزمونی که شکلِ راحت را بسازد نه شکلِ واقعی
    # را، دقیقاً همان چیزی را از دست می‌دهد که برایش نوشته شده —
    # همان درسِ `recapCast_`.
    npR = {"range_semitones": round(12 * _np35.log2(117.2 / 79.0), 1),
           "phrase_fall_semitones": round(12 * _np35.log2(1.02), 1),
           "speech_pct": 51, "phrase_seconds_median": 1.6,
           "pause_short_median": 0.3, "pause_sentence_median": 0.6,
           "pauses_per_minute": 15.2, "hold_ratio": 2.5}
    npG = dict(npR, range_semitones=round(12 * _np35.log2(204.4 / 107.9), 1),
               speech_pct=84)
    eq(type(npR["range_semitones"]).__name__, "float64",
       "عددِ زیروبم واقعاً numpy است (شکلِ واقعی، نه راحت)")
    gnp = SC.styleCompare_(npR, npG)
    for kk, vv in gnp["fields"].items():
        eq(type(vv["off"]) is bool, True,
           "«%s»: پرچمِ اشکال بولِ پایتون است نه numpy" % kk)
    json.dumps({"gap": gnp})      # همان خطی که روی رانر ترکید

    # و مرزِ ایمن، برای هر چیزی که فردا اضافه شود:
    eq(V.jdump_({"x": _np35.bool_(True), "y": _np35.int64(3),
                 "z": _np35.array([1.0, 2.0])}) is not None, True,
       "دروازهٔ گزارش هر نوعِ numpy را رد می‌کند")
    eq(json.loads(V.jdump_({"x": _np35.bool_(True)}))["x"], True,
       "و مقدارش را درست نگه می‌دارد")
    eq(srcV.count("json.dumps(rep"), 0,
       "هیچ گزارشی بی دروازه نوشته نمی‌شود")

    # ══ د: خوشه‌ای که شنیده نشود، حالت نیست ══
    # اجرای ۵۵ دو خوشه داد، سیلوئت ۰٫۲۶، و صاحبِ برنامه هر دو نمونه
    # را شنید: «تقریباً یکی بودند؛ نمی‌شد تشخیص داد در چه حالتی بیان
    # شده». عددها همان را می‌گفتند و من ندیده بودم — تنها تفاوتِ
    # واقعی زیروبمِ میانه بود، ۲٫۹ نیم‌پرده. سیلوئت این را نمی‌گیرد:
    # بی‌واحد است و فقط می‌گوید نقطه‌ها دو دسته‌اند.
    cReal = _np35.array([[82, 1.9, 7.6, -1.02, -0.1],
                         [75, 1.5, 7.6, 1.86, 1.5]], dtype="float64")
    sepR = SC.modeSep_(cReal)
    eq(sepR["ok"], False,
       "همان دو خوشهٔ اجرای ۵۵ رد می‌شوند (%.2f برابرِ آستانه)"
       % sepR["weakest"]["times"])
    eq("آستانهٔ شنیدن" in sepR["line"], True, "و دلیلش نوشته می‌شود")
    # و جداییِ واقعی (رضوی در برابرِ خوانشِ جمینای) رد نمی‌شود
    sepT = SC.modeSep_(_np35.array([[51, 1.6, 6.8, 0.0, 0.0],
                                    [84, 4.6, 11.1, 0.0, 0.0]],
                                   dtype="float64"))
    eq(sepT["ok"], True, "ولی تفاوتِ واقعی رد نمی‌شود (%.1f برابر)"
       % sepT["weakest"]["times"])
    # ══ و زیروبمِ مطلق به‌تنهایی تصمیم نمی‌گیرد ══
    # در یک قصه، بم‌تر یا زیرتر خواندن اغلب یعنی کدام جمله، نه چه
    # حالتی. اگر این محور تعیین‌کننده بود، همان رانشِ ۲٫۹ نیم‌پرده
    # دوباره از دروازه رد می‌شد.
    sepP = SC.modeSep_(_np35.array([[70, 1.7, 7.0, -4.0, 0.0],
                                    [70, 1.7, 7.0, 4.0, 0.0]],
                                   dtype="float64"))
    eq(sepP["ok"], False, "هشت نیم‌پرده اختلافِ زیروبم هم به‌تنهایی بس نیست")
    eq("pitch_rel_semitones" not in SC.MODE_SEP_DECIDES, True,
       "چون زیروبم پشتیبان است، نه داور")

    # ══ ر: نمونه‌ها هم‌اندازه، و مرزِ هر حالت گفته شود ══
    # اجرای ۵۶ دو نمونه داد، ۱۴٫۸ و ۴۵ ثانیه. کسی که باید پشتِ هم
    # بشنودشان و فرق را بگوید، نباید یکی سه برابرِ آن‌یکی باشد. و
    # سیلوئتِ ۰٫۲۳ یعنی این‌ها دو جزیره نیستند، یک طیف‌اند با دو سر —
    # کارتی که این را نگوید، قاطعیتی نشان می‌دهد که در صدا نیست.
    eq('min(float(smp.get("seconds", 0.0)), MODE_SAMPLE_SEC)' in scSrc0, True,
       "طولِ نمونه سقف دارد (%s ثانیه)" % SC.MODE_SAMPLE_SEC)
    soft = SC.modeCard_(dict(mode35, distinct={
        "vs": 2, "axis": "phrase_seconds_median", "diff": 0.94,
        "tolerance": 0.51, "times": 1.84}), razavi33, "رضوی")["instruction"]
    firm = SC.modeCard_(dict(mode35, distinct={
        "vs": 2, "axis": "speech_pct", "diff": 33, "tolerance": 12.75,
        "times": 2.59}), razavi33, "رضوی")["instruction"]
    eq("مرزِ ملایمی است" in soft, True, "مرزِ ضعیف را ملایم می‌خوانَد")
    eq("یک طیف‌اند" in soft, True, "و می‌گوید چرا")
    eq("مرزِ محکمی است" in firm, True, "و مرزِ قوی را محکم")
    eq("1.8" in soft and "2.6" in firm, True,
       "و عددِ «چند برابرِ آستانه» در هر دو هست")

    # ══ ذ: حالت‌ها از چند ضبط، با مبنای هر ضبط ══
    # تنوعِ لحن بینِ برنامه‌هاست نه لزوماً داخلِ یکی. ولی اگر مبنای
    # بلندی و زیروبم مشترک باشد، خوشه‌ها «ضبطِ ۱ در برابرِ ضبطِ ۳»
    # درمی‌آیند و ما اسمش را «حالت» می‌گذاریم.
    eq("styleOneFile_" in scSrc0 and 'base["_level_med"]' in scSrc0, True,
       "هر ضبط مبنای خودش را دارد")
    eq(SC.styleModes_([])["error"] is not None, True,
       "فهرستِ تهی خطا می‌دهد، نه خوشه")
    eq("audition_windows" in srcV, True,
       "آزمایشگاه پنجرهٔ هر چهار نامزد را نگه می‌دارد")
    eq('OPT.get("audition_windows")' in srcV, True,
       "و لایهٔ حالت‌ها همه‌شان را می‌گیرد")

    # ══ چ: یک چیز، یک تعریف ══
    # `dsprep.py` یازده خط را عیناً دو بار داشت — `DS_TOTAL_MAX` و
    # `dsPick_`. امروز بی‌ضرر بود چون هر دو نسخه یکی بودند، ولی روزی
    # که کسی یکی را ویرایش کند، آن‌یکی بی‌صدا برنده می‌شود و ویرایش
    # هیچ اثری ندارد. همان شکلِ `srcJoinJs_`: یک چیز که دو جا تعریف
    # شود، باگ است — فقط هنوز نه.
    import ast as _a36, collections as _c36
    here36 = os.path.dirname(os.path.abspath(__file__))
    for fn36 in ("dsprep.py", "rvcpipe.py", "stylecard.py", "mirror.py",
                 "voicelab.py", "voicetrain.py"):
        tree36 = _a36.parse(io.open(os.path.join(here36, fn36),
                                    encoding="utf-8").read())
        nm36 = []
        for nd in tree36.body:
            if isinstance(nd, (_a36.FunctionDef, _a36.ClassDef)):
                nm36.append(nd.name)
            elif isinstance(nd, _a36.Assign):
                for tg in nd.targets:
                    if isinstance(tg, _a36.Name):
                        nm36.append(tg.id)
        dup36 = sorted(k for k, v in _c36.Counter(nm36).items() if v > 1)
        eq(dup36, [], "%s: هیچ نامی دو بار تعریف نشده" % fn36)

    # ══ ح: سقفِ دیتاست باید قابلِ عوض کردن باشد ══
    # چهل دقیقه از راهنماییِ عمومیِ RVC آمده، نه از آزمونِ ما. تا وقتی
    # کلِ صدا ۳۹ دقیقه بود اهمیتی نداشت؛ با چند ساعت صدا این عدد
    # **تصمیم** می‌گیرد، و تصمیمی که نشود سنجیدش فرض است.
    eq("--ds-max-minutes" in srcV, True, "سقفِ دیتاست از فرمان می‌آید")
    eq("totalMax=cap" in srcV, True, "و واقعاً به سازندهٔ دیتاست می‌رسد")
    eq("ds_max_minutes" in wfl, True, "و خانه‌اش در فرم هست")

    # ══ ث: هیچ‌کدام از اینها نباید بی‌صدا بی‌مصرف بماند ══
    # قاعدهٔ خودِ این مخزن: سه باگِ واقعی همگی یک شکل داشتند — تابعی
    # نوشته و توضیح‌داده و آزموده، که هیچ‌جا صدا زده نمی‌شد. این
    # لایه یک‌جا ده تابع اضافه کرد.
    both = scSrc0 + srcV
    dead35 = []
    for fn in re.findall(r"^def (\w+_)\(", scSrc0, re.M):
        if len(re.findall(r"\b%s\b" % re.escape(fn), both)) < 2:
            dead35.append(fn)
    eq(dead35, [], "هیچ تابعی در stylecard بی‌صدازننده نمانده")

    # ══ ج: و سیم‌کشیِ آزمایشگاه واقعاً فایل‌ها را می‌سازد ══
    # اولین نسخهٔ همین سیم‌کشی متغیرِ حلقه را `m` گذاشته بود، همان
    # نامِ اندازه‌گیریِ کلِ گوینده — یعنی کارتِ هر حالت روی خودش
    # سوار می‌شد. چنین چیزی خطا نمی‌دهد، فقط کارتِ غلط می‌سازد.
    o35 = tempfile.mkdtemp()
    # ورودی‌های صوتیِ سنگین نباید در بایگانی بمانند — صد مگابایت برای
    # موتوری که هیچ صوتی نمی‌سازد. ولی نمونه‌های حالت باید بمانند.
    io.open(os.path.join(o35, "reference.wav"), "wb").write(b"RIFF" + b"\0" * 900)
    io.open(os.path.join(o35, "MODE9-x.wav"), "wb").write(b"RIFF" + b"\0" * 900)
    savedV = (V.styleMeasure_, V.styleModes_, V.styleRaw_)
    try:
        V.styleMeasure_ = lambda p, **kw: dict(razavi33, seconds=900.0)
        V.styleRaw_ = lambda p: p
        V.styleModes_ = lambda p, nm, **kw: {
            "seconds": 900.0, "passages": 20, "silhouette": 0.4, "k": 2,
            "vectors": [{"at": 1.0, "mode": 1}],
            "modes": [{"n": i, "name": "حالتِ %d — پرمکث‌تر" % i,
                       "share_pct": 50, "passages": 10,
                       "numbers": dict(razavi33,
                                       speech_pct={1: 40, 2: 80}[i]),
                       "sample": {"at": 0, "seconds": 20}} for i in (1, 2)]}
        V.OPT["_rep"] = {"style": {}}
        V.OPT["_out"] = o35
        V.OPT["style_name"] = "آزمون"
        V.run_style("ref.wav", "", "", o35)
    finally:
        V.styleMeasure_, V.styleModes_, V.styleRaw_ = savedV
    made35 = sorted(os.listdir(o35))
    eq(any(f.endswith("-modes.json") for f in made35), True,
       "فایلِ حالت‌ها ساخته شد: %s" % made35)
    cards35 = [f for f in made35 if re.search(r"-\d\.md$", f)]
    eq(len(cards35), 2, "برای هر حالت یک کارت (%s)" % cards35)
    t1 = io.open(os.path.join(o35, cards35[0]), encoding="utf-8").read()
    t2 = io.open(os.path.join(o35, cards35[1]), encoding="utf-8").read()
    eq(t1 != t2, True, "و دو کارت یکی نیستند")
    a35 = t1 if "**40 درصدِ**" in t1 else t2
    b35 = t2 if a35 is t1 else t1
    eq("**40 درصدِ**" in a35 and "**80 درصدِ**" in b35, True,
       "هر کارت عددِ حالتِ خودش را دارد")
    eq("**80 درصدِ**" not in a35 and "**40 درصدِ**" not in b35, True,
       "و عددِ آن‌یکی حالت را ندارد")
    eq("reference.wav" not in made35, True,
       "ورودیِ صوتی در بایگانی نمی‌مانَد (%s)" % made35)
    eq("MODE9-x.wav" in made35, True, "ولی نمونهٔ حالت دست‌نخورده ماند")

    # ── ۳۶ ─────────────────────────────────────────────────────────────
    # آینهٔ وابستگی‌های بیرونی. مدلِ صدا مالِ ماست، ولی اجرایش به بستهٔ
    # `infer-rvc-python` (نگه‌داریِ یک نفر) و دو وزن از یک مخزنِ شخصیِ
    # Hugging Face بند است. اگر پاک شوند، مدل سالم است و اجرا نمی‌شود —
    # بدترین شکلِ وابستگی، چون تا روزِ حادثه نامرئی است.
    print("۳۶ — آینه: چه چیزی نگه داشته می‌شود و چطور ثابت می‌شود")
    import mirror as MR

    # ══ الف: خانوادهٔ سنگین درست تشخیص داده شود ══
    # `startswith("torch")` هم `torchcrepe` را می‌گرفت — بسته‌ای کوچک و
    # دقیقاً از همان جنسِ شکننده‌ای که آینه برایش ساخته شده. یک حرفِ
    # اضافه در یک شرط، و آن بسته بی‌صدا از آینه بیرون می‌مانَد.
    for nm in ("torch", "torchaudio", "nvidia_cublas_cu12", "triton"):
        eq(MR.heavy_(nm), True, "«%s» سنگین است و فرستاده نمی‌شود" % nm)
    for nm in ("torchcrepe", "torchfcpe", "numpy", "faiss-cpu"):
        eq(MR.heavy_(nm), False, "«%s» در آینه می‌مانَد" % nm)

    # ══ ب: قفل باید خرابی را بگیرد، وگرنه فقط یک فهرست است ══
    d36 = tempfile.mkdtemp()
    os.makedirs(os.path.join(d36, "wheels"))
    for nm, body in (("wheels/a.whl", b"AAA" * 40), ("b.txt", b"B" * 17)):
        io.open(os.path.join(d36, nm), "wb").write(body)
    lk36 = {"files": MR.scan_(d36)}
    eq([f["path"] for f in lk36["files"]], ["b.txt", "wheels/a.whl"],
       "مسیرها نسبی و مرتب‌اند")
    eq(all(len(f["sha256"]) == 64 for f in lk36["files"]), True,
       "و هر کدام اثرانگشت دارند")
    lp36 = os.path.join(d36, "lock.json")
    io.open(lp36, "w", encoding="utf-8").write(json.dumps(lk36))

    class _A36(object):
        pass
    a36 = _A36(); a36.dir = d36; a36.lock = lp36
    eq(MR.cmd_verify(a36), 0, "آینهٔ سالم می‌گذرد")
    # یک بایت
    fp = os.path.join(d36, "b.txt")
    io.open(fp, "wb").write(b"B" * 16 + b"C")
    eq(MR.cmd_verify(a36), 1, "یک بایتِ عوض‌شده گرفته می‌شود")
    io.open(fp, "wb").write(b"B" * 17)
    os.remove(os.path.join(d36, "wheels", "a.whl"))
    eq(MR.cmd_verify(a36), 1, "و فایلِ گم‌شده هم")

    # ══ پ: «main» یک نشانگر است، نه یک قفل ══
    # قفلی که به شاخه ببندد چیزی را قفل نکرده — فردا جای دیگری را
    # نشان می‌دهد.
    mrSrc = io.open(MR.__file__.replace(".pyc", ".py"),
                    encoding="utf-8").read()
    eq("def hfRev_" in mrSrc and "repo_info" in mrSrc, True,
       "شمارهٔ کامیتِ واقعی گرفته می‌شود، نه نامِ شاخه")

    # ══ ت: آینه‌ای که آزموده نشده، آرزوست ══
    eq("offline_install_ok" in mrSrc and "raise SystemExit" in mrSrc, True,
       "نصبِ آفلاین آزموده می‌شود و شکستش کار را می‌اندازد")

    # ══ و اجرای اول همین را ثابت کرد ══
    # `pip download` بستهٔ `pyworld` را به‌صورتِ **sdist** آورد (چرخ
    # ندارد)، و نصبِ یک sdist یعنی ساختنش، و ساختن به `wheel` و
    # `setuptools` نیاز دارد که در آینه نبودند. آینه‌ای داشتیم که روی
    # ماشینِ آفلاین نصب نمی‌شد — و فقط چون آزمونش را گذاشته بودیم
    # معلوم شد.
    # فرمانِ واقعی سنجیده می‌شود، نه واژه در توضیح — توضیح‌ها همین
    # درس را نقل می‌کنند و اگر متن را بشماریم، همیشه پیدا می‌شود.
    eq('"pip", "wheel"' in mrSrc, True,
       "چرخ‌ها ساخته می‌شوند، نه فقط دانلود")
    eq('"pip", "download"' not in mrSrc, True,
       "و `pip download` دیگر صدا زده نمی‌شود — sdist را نمی‌سازد")
    eq(all(x in MR.BUILD_PKGS for x in ("setuptools", "wheel")), True,
       "ابزارِ ساخت هم در آینه می‌مانَد")

    # ══ و سوراخی که نزدیک بود از دستم برود ══
    # نسخهٔ اول در همان پایتونِ کار نصب می‌کرد، جایی که چند بسته از
    # قدم‌های قبلی **از پیش نصب بودند**. اگر یکی‌شان در آینه نمی‌بود،
    # آزمون باز هم سبز می‌شد. آزمونی که محیطش را از قبل آماده کرده
    # باشد، چیزی را ثابت نمی‌کند.
    eq("def probeVenv_" in mrSrc and "EnvBuilder" in mrSrc, True,
       "آزمونِ آفلاین در محیطِ تازه انجام می‌شود")
    eq("probeVenv_(root," in mrSrc, True, "و `pack` از همان استفاده می‌کند")
    # و پین‌های ناسازگارِ تبدیل/آموزش نباید همدیگر را بشکنند:
    eq(MR.packWheels_.__code__.co_varnames[0], "dest", "امضا سرِ جایش است")
    eq("groups" in MR.packWheels_.__code__.co_varnames, True,
       "چرخ‌ها گروه‌گروه حل می‌شوند، نه یک‌جا")

    # ══ ج: «کنارِ آینه» یعنی بیرونِ آن ══
    # نسخهٔ اول پوشهٔ سنگین را `dest + "-heavy"` می‌ساخت و `dest`
    # خودش `mirror/wheels` بود — پس در `mirror/wheels-heavy` می‌نشست،
    # یعنی داخلِ همان چیزی که بالا می‌رود. بایگانی ۳۶۲۵ مگابایت شد که
    # ۲۸۶۱ مگابایتش دقیقاً همانی بود که نوشته بودیم نمی‌فرستیم. متن
    # درست بود و مسیر غلط — و تا قفل را نخواندم معلوم نشد.
    eq('heavy=os.path.abspath(root)' in mrSrc, True,
       "پوشهٔ سنگین خواهرِ ریشهٔ آینه است، نه فرزندش")
    eq("خانوادهٔ سنگین داخلِ آینه ماند" in mrSrc, True,
       "و اگر باز هم داخل ماند، `pack` می‌افتد — ادعا سنجیده می‌شود")
    # همان را روی مسیرهای واقعی بسنج:
    hv = os.path.abspath("mirror").rstrip(os.sep) + "-heavy"
    eq(hv.startswith(os.path.abspath("mirror") + os.sep), False,
       "و مسیرش واقعاً بیرونِ ریشه می‌افتد (%s)" % hv)

    # ══ ث: و گردش‌کارش قفل را در گیت نگه می‌دارد ══
    # artifact نودی روز بیشتر نمی‌مانَد. اگر قفل هم با آن برود، آینهٔ
    # بی‌شناسنامه داریم: فایل‌هایی که کسی نمی‌داند از کجا آمده‌اند.
    wfm = io.open(os.path.join(os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), ".github", "workflows",
        "voice-mirror.yml"), encoding="utf-8").read()
    eq("tools/mirror.py verify mirror" in wfm, True,
       "گردش‌کار آینه را با قفلِ خودش می‌سنجد")
    eq("git add tools/mirror_lock.json" in wfm, True,
       "و قفل در مخزن می‌مانَد")
    # ══ و فایلِ **تازه** را هم می‌بیند ══
    # اجرای دومِ واقعی موفق شد و این مرحله «قفل عوض نشده» گفت و هیچ
    # نکرد: قفل هرگز در گیت نبوده، و `git diff --quiet` روی مسیرِ
    # ردگیری‌نشده صفر برمی‌گرداند. مرحله‌ای که کارش نگه داشتنِ
    # شناسنامه بود، سبز تمام شد و شناسنامه‌ای نگه نداشت — همان شکلی
    # که این مخزن بارها دیده.
    eq("git status --porcelain" in wfm, True,
       "فایلِ تازه هم «تغییر» شمرده می‌شود")
    eq("git diff --quiet -- tools/mirror_lock.json" not in wfm, True,
       "و آن شرطِ کور دیگر نیست")
    eq("contents: write" in wfm, True, "با همان اجازهٔ لازم و نه بیشتر")

    print("\nهمه گذشت.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
