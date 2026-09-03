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

import io, json, os, sys, tempfile

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

    print("\nهمه گذشت.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
