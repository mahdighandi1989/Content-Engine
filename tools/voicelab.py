#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voicelab.py — آزمایشگاهِ صدا. گامِ صفرِ «شبیه‌سازیِ صدا».

══ این فایل چه چیزی را می‌سنجد و چرا ══

خواستهٔ صاحبِ برنامه: پادکست با صدای یک گویندهٔ مشخص خوانده شود. راهی که
اول به ذهن می‌رسد — «فرکانس‌ها را دربیاور و به مدل بگو» — بن‌بست است: کلِ
صداسازیِ موتور از `ttsPayloads_` می‌گذرد و آنجا فقط یک **نام** فرستاده
می‌شود (`prebuiltVoiceConfig.voiceName`)، از فهرستِ ۲۲تاییِ آماده. هیچ
فیلدی برای نمونهٔ صوتی وجود ندارد. پس مدلِ دیگری باید صدا را بسازد.

و دو خانوادهٔ متفاوت از مدل‌ها این کار را می‌کنند — که فرقشان برای ما
تعیین‌کننده است:

  الف) **TTS با کلونینگ** (xtts, f5, chatterbox): متن + نمونهٔ صدا را
       می‌گیرد و از صفر می‌خواند. اشکالش این است که باید **فارسی بلد
       باشد**، و فارسی در فهرستِ رسمیِ بیشترشان نیست.

  ب) **تبدیلِ صدا** (seedvc): یک صوتِ آماده را می‌گیرد و رنگِ صدایش را به
       نمونه نزدیک می‌کند. **این برای ما بهتر است**، چون صوتِ آماده‌مان
       خروجیِ Gemini است که فارسی را با اعرابِ درست می‌خواند. یعنی درستیِ
       فارسی از مسیرِ امروزی می‌آید و فقط رنگِ صدا عوض می‌شود.

══ قاعدهٔ این فایل ══
هیچ ادعایی نمی‌کند. هر موتور یا کار می‌کند و خروجی می‌دهد، یا خطایش
**عیناً** در گزارش می‌آید. اجرایی که همهٔ موتورها در آن شکست بخورند هم
اجرای موفقی است — چون جوابِ «کدام‌ها اصلاً کار می‌کنند» را می‌دهد.

══ پروانه (license) ══
پروانهٔ *کد* با پروانهٔ *وزن‌های مدل* یکی نیست و این تلهٔ واقعی است:
`coqui-tts` کدش MPL است ولی وزن‌های XTTS-v2 زیرِ CPML و **غیرتجاری**‌اند.
کانالِ ما قرار است درآمد داشته باشد، پس هر موتور پروانهٔ هر دو را در
گزارش می‌آورد.
"""

import argparse, json, os, subprocess, sys, time, traceback

# متنِ آزمون: یک جملهٔ واقعیِ اعراب‌دار از خودِ زنجیرهٔ ما. اعراب عمدی است —
# سدِ `speak`/`speak2` موتور همین را تولید می‌کند و ورودیِ واقعیِ هر موتورِ
# صدا همین خواهد بود، نه متنِ بی‌اعراب.
DEFAULT_TEXT = (
    "دَر بَررَسیِ مَعرِفَت‌شِناسیِ اِدراک، پِیوَندِ میانِ حِس و باوَر اَز اَهَمیَتی "
    "بُنیادی بَرخوردار اَست. تَجرُبهٔ دیداری به خودیِ خود می‌تَوانَد پایه‌ای "
    "اُستوار بَرایِ شِکل‌گیریِ شِناخت باشَد."
)

ENGINES = {
    "seedvc": {
        "family": "تبدیلِ صدا (رنگِ صدا عوض می‌شود، واژه‌ها نه)",
        "pip": ["seed-vc"],
        "code_license": "GPL",
        "needs_src": True,
        "persian": "زبان‌مستقل — واژه‌ها را نمی‌سازد، پس فارسی برایش موضوع نیست",
    },
    "chatterbox": {
        "family": "TTS با کلونینگ",
        "pip": ["chatterbox-tts"],
        "code_license": "MIT",
        "needs_src": False,
        "persian": "باید سنجیده شود — فهرستِ زبان‌هایش را همین اجرا چاپ می‌کند",
    },
    "f5": {
        "family": "TTS با کلونینگ",
        "pip": ["f5-tts"],
        "code_license": "MIT (کد)",
        "needs_src": False,
        "persian": "چک‌پوینتِ پایه انگلیسی/چینی است؛ فارسی باید سنجیده شود",
    },
    "xtts": {
        "family": "TTS با کلونینگ",
        "pip": ["coqui-tts"],
        "code_license": "MPL-2.0 (کد) · وزن‌ها: CPML — **غیرتجاری**",
        "needs_src": False,
        "persian": "فارسی در فهرستِ رسمیِ ۱۷ زبانِ XTTS-v2 **نیست**",
    },
}


def sh(cmd, **kw):
    """اجرای فرمان با خروجیِ زنده — تا در سیاههٔ اکشن دیده شود."""
    print("$ " + " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=False, **kw)


def ffmpeg():
    """همان ترفندِ tools/render.js: باینریِ استاتیک از PyPI، بی نیاز به sudo."""
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def to_wav(src, dst, seconds=None, rate=24000):
    """
    نرمال‌سازیِ نمونه: تک‌کاناله، ۲۴ کیلوهرتز، بی سکوتِ ابتدا و انتها.

    ۲۴ کیلوهرتز عمدی است: خروجیِ Gemini TTS در همین پروژه دقیقاً همین است
    (`CFG.SAMPLE_RATE`)، پس هر چیزی که بسازیم بی تبدیلِ دوباره کنارِ بقیهٔ
    صدا می‌نشیند. و `silenceremove` چون سکوتِ ابتدای فایل، به‌اندازهٔ نویز
    کیفیتِ نمونه‌برداری را خراب می‌کند.
    """
    f = ffmpeg()
    cmd = [f, "-y", "-i", src, "-ac", "1", "-ar", str(rate),
           "-af", "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-45dB,"
                  "areverse,silenceremove=start_periods=1:start_silence=0.1:start_threshold=-45dB,areverse,"
                  "loudnorm=I=-18:TP=-2"]
    if seconds:
        cmd += ["-t", str(seconds)]
    cmd += [dst]
    r = sh(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg: " + r.stderr.decode("utf-8", "replace")[-800:])
    return dst


def probe(path):
    """چند ثانیه است و چند هرتز — عدد، نه حدس."""
    import wave
    with wave.open(path, "rb") as w:
        return {"seconds": round(w.getnframes() / float(w.getframerate()), 2),
                "rate": w.getframerate(), "channels": w.getnchannels()}


# ───────────────────────── موتورها ─────────────────────────
# هر کدام یا فایل می‌سازد یا استثنا می‌دهد. هیچ‌کدام «تقریباً موفق» ندارد.

def run_seedvc(ref, src, text, out):
    """تبدیلِ صدا: صوتِ Gemini + نمونهٔ گوینده → همان واژه‌ها با رنگِ صدای او."""
    if not src:
        raise RuntimeError("این موتور به یک صوتِ مبدأ نیاز دارد (خروجیِ Gemini). "
                           "src_id را در ورودیِ اکشن بدهید.")
    dst = os.path.join(out, "seedvc.wav")
    r = sh([sys.executable, "-m", "seed_vc.inference",
            "--source", src, "--target", ref, "--output", out,
            "--diffusion-steps", "30", "--f0-condition", "False"],
           capture_output=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).decode("utf-8", "replace")[-1500:])
    made = [f for f in os.listdir(out) if f.endswith(".wav") and f != os.path.basename(dst)]
    return dst if os.path.exists(dst) else (os.path.join(out, made[0]) if made else None)


def run_chatterbox(ref, src, text, out):
    import torch
    from chatterbox.tts import ChatterboxTTS
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", dev, flush=True)
    m = ChatterboxTTS.from_pretrained(device=dev)
    wav = m.generate(text, audio_prompt_path=ref)
    import torchaudio
    dst = os.path.join(out, "chatterbox.wav")
    torchaudio.save(dst, wav, m.sr)
    return dst


def run_f5(ref, src, text, out):
    dst = os.path.join(out, "f5.wav")
    r = sh(["f5-tts_infer-cli", "--ref_audio", ref, "--ref_text", "",
            "--gen_text", text, "--output_dir", out, "--output_file", "f5.wav"],
           capture_output=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).decode("utf-8", "replace")[-1500:])
    return dst


def run_xtts(ref, src, text, out):
    """
    فارسی در فهرستِ زبان‌های XTTS-v2 نیست. عمداً هم `fa` و هم `ar` امتحان
    می‌شود: اگر `fa` رد شد، عربی نزدیک‌ترین الفبای موجود است و دستِ‌کم
    می‌فهمیم خروجی چقدر بد است — «نمی‌شود» را باید شنید، نه فرض کرد.
    """
    from TTS.api import TTS
    os.environ["COQUI_TOS_AGREED"] = "1"
    t = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    made = None
    for lang in ("fa", "ar"):
        dst = os.path.join(out, "xtts_%s.wav" % lang)
        try:
            t.tts_to_file(text=text, speaker_wav=ref, language=lang, file_path=dst)
            made = made or dst
            print("xtts: زبانِ %s پذیرفته شد" % lang, flush=True)
        except Exception as e:
            print("xtts: زبانِ %s رد شد — %s" % (lang, str(e)[:300]), flush=True)
    if not made:
        raise RuntimeError("نه fa پذیرفته شد نه ar")
    return made


RUNNERS = {"seedvc": run_seedvc, "chatterbox": run_chatterbox,
           "f5": run_f5, "xtts": run_xtts}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", required=True, choices=sorted(ENGINES))
    ap.add_argument("--ref", required=True, help="نمونهٔ صدای گوینده")
    ap.add_argument("--src", default="", help="صوتِ فارسیِ Gemini (برای تبدیلِ صدا)")
    ap.add_argument("--text", default=DEFAULT_TEXT)
    ap.add_argument("--out", default="voicelab-out")
    ap.add_argument("--ref-seconds", type=int, default=20)
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    meta = ENGINES[a.engine]
    rep = {"engine": a.engine, "at": time.strftime("%Y-%m-%d %H:%M"),
           "family": meta["family"], "code_license": meta["code_license"],
           "persian_note": meta["persian"], "ok": False}

    # ── آماده‌سازیِ نمونه ──
    ref = to_wav(a.ref, os.path.join(a.out, "reference.wav"), seconds=a.ref_seconds)
    rep["reference"] = probe(ref)
    src = ""
    if a.src:
        src = to_wav(a.src, os.path.join(a.out, "source-gemini.wav"))
        rep["source"] = probe(src)
    if meta["needs_src"] and not src:
        rep["error"] = "این موتور به صوتِ مبدأ نیاز دارد و داده نشد."
    else:
        # ── نصب ──
        t0 = time.time()
        r = sh([sys.executable, "-m", "pip", "install", "--quiet"] + meta["pip"])
        rep["install_seconds"] = round(time.time() - t0)
        if r.returncode != 0:
            rep["error"] = "نصبِ %s ناموفق بود" % ", ".join(meta["pip"])
        else:
            # ══ نامِ نقطهٔ ورود را حدس زده‌ام؛ پس واقعیتش را چاپ کن ══
            # اگر حدسم غلط باشد، این چند خط تفاوتِ «اجرا شکست خورد» با
            # «اجرا شکست خورد و نامِ درست این است» را می‌سازد — و اجرای
            # بعدی را از یک حدسِ دیگر بی‌نیاز می‌کند.
            for pkg in meta["pip"]:
                q = sh([sys.executable, "-m", "pip", "show", "-f", pkg],
                       capture_output=True)
                txt = (q.stdout or b"").decode("utf-8", "replace")
                tops, bins = set(), set()
                for ln in txt.splitlines():
                    ln = ln.strip()
                    if ln.endswith(".py") and "/" in ln:
                        tops.add(ln.split("/")[0])
                    if ln.startswith("../../../bin/"):
                        bins.add(ln.rsplit("/", 1)[-1])
                rep.setdefault("packages", {})[pkg] = {
                    "modules": sorted(m for m in tops if not m.startswith(("_", "."))) [:12],
                    "commands": sorted(bins)[:12],
                }
            print("بسته‌ها:", json.dumps(rep.get("packages", {}), ensure_ascii=False), flush=True)
            # ── اجرا ──
            t1 = time.time()
            try:
                made = RUNNERS[a.engine](ref, src, a.text, a.out)
                if not made or not os.path.exists(made):
                    raise RuntimeError("موتور بی‌خطا تمام شد ولی فایلی نساخت")
                rep["ok"] = True
                rep["output"] = os.path.basename(made)
                rep["output_info"] = probe(made)
            except Exception as e:
                rep["error"] = str(e)[:2000]
                rep["traceback"] = traceback.format_exc()[-1500:]
            rep["run_seconds"] = round(time.time() - t1)

    with open(os.path.join(a.out, "report-%s.json" % a.engine), "w", encoding="utf-8") as f:
        json.dump(rep, f, ensure_ascii=False, indent=1)
    print("\n=== گزارش ===")
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    # شکستِ یک موتور، شکستِ آزمایش نیست: خودِ خبر همان چیزی است که می‌خواستیم.
    return 0


if __name__ == "__main__":
    sys.exit(main())
