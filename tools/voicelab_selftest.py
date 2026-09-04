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

    # ── تکه‌بندی ──
    segs = V.dsSegments_([[(0.0, 4.0), (4.5, 9.0), (9.5, 20.0)]])
    eq(all(V.DS_SEG_MIN <= b - a <= V.DS_SEG_MAX + 0.01 for a, b in segs), True,
       "هر تکه بینِ ۳ تا ۱۰ ثانیه است: %s" % [round(b - a, 1) for a, b in segs])
    eq(V.dsSegments_([[(0.0, 1.0)]]), [], "و تکهٔ کوتاه‌تر از سه ثانیه نمی‌مانَد")

    # ── نمونه باید نماینده باشد، نه n تای اول ──
    eq(V.dsPick_(list(range(100)), 4), [0, 25, 50, 75],
       "نمونه از سراسرِ فهرست برداشته می‌شود")
    eq(V.dsPick_([1, 2], 5), [1, 2], "و کمتر از خواسته، همان که هست")

    print("\nهمه گذشت.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
