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
    for fn in ("voicelab.py", "voicescan.py", "fa2latin.py"):
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
        def __init__(self, cfg, device=None, enable_watermark=True):
            # ══ چرا این بدل پرچم را می‌سنجد ══
            # سازندهٔ واقعی وقتی این True باشد همان‌جا `import wavmark`
            # می‌کند. بدلِ اولِ من پرچم را نادیده می‌گرفت، پس آزمون سبز
            # ماند و اجرا با «No module named 'wavmark'» افتاد. بدلی که
            # قرارداد را نسنجد، فقط خودش را می‌سنجد.
            if enable_watermark:
                raise ImportError("No module named 'wavmark'")
            self.cfg = cfg

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

    eq(os.path.basename(made6), "openvoice_one.wav", "خروجیِ برگشتی درست است")
    eq([v["name"] for v in rep8["variants"]], ["one", "all"],
       "دو اجرا: یک نمونه، و میانگینِ همهٔ نمونه‌ها")
    eq(len(rep8["variants"][1]["refs"]), 3,
       "و دومی واقعاً هر سه ضبط را به مدل می‌دهد، نه یکی")
    eq(rep8["model_facts"]["weights"], "checkpoint.pth",
       "وزن در چیدمانِ چک‌پوینت پیدا می‌شود")
    V.OPT.clear()

    print("\nهمه گذشت.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
