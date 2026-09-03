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

import argparse, io, json, os, re, shutil, subprocess, sys, time, traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fa2latin

# متنِ آزمون: یک جملهٔ واقعیِ اعراب‌دار از خودِ زنجیرهٔ ما. اعراب عمدی است —
# سدِ `speak`/`speak2` موتور همین را تولید می‌کند و ورودیِ واقعیِ هر موتورِ
# صدا همین خواهد بود، نه متنِ بی‌اعراب.
DEFAULT_TEXT = (
    "دَر بَررَسیِ مَعرِفَت‌شِناسیِ اِدراک، پِیوَندِ میانِ حِس و باوَر اَز اَهَمیَتی "
    "بُنیادی بَرخوردار اَست. تَجرُبهٔ دیداری به خودیِ خود می‌تَوانَد پایه‌ای "
    "اُستوار بَرایِ شِکل‌گیریِ شِناخت باشَد."
)

ENGINES = {
    # ══ چرا این اول آمد (اجرای #۲) ══
    # اجرای دوم دو چیز را با هم ثابت کرد: Chatterbox رنگِ صدای مرجع را از
    # ۲۰ ثانیه **گرفت** («نزدیک به صدای رضوی»)، ولی واژه‌ها بی‌معنا بودند.
    # علتش را از داخلِ خودِ بسته درآوردم: `SUPPORTED_LANGUAGES` بیست‌وسه
    # زبان دارد و فارسی در آن **نیست** (عربی و عبری و ترکی هست).
    # یعنی نیمهٔ سختِ کار — گرفتنِ صدا — جواب داده و فقط نیمهٔ زبان مانده.
    # و همان بسته کلاسِ `ChatterboxVC` را دارد: تبدیلِ صدا. واژه‌ها را از
    # صوتِ مبدأ می‌گیرد (خروجیِ Gemini، فارسیِ درست) و فقط رنگِ صدا را عوض
    # می‌کند. پس مسئلهٔ زبان اصلاً پیش نمی‌آید.
    "chatterboxvc": {
        "family": "تبدیلِ صدا (رنگِ صدا عوض می‌شود، واژه‌ها نه)",
        "pip": ["chatterbox-tts"],
        "code_license": "MIT",
        "needs_src": True,
        "persian": "زبان‌مستقل — واژه‌ها از صوتِ مبدأ می‌آیند",
        "note": "خروجی واترمارکِ نامحسوسِ Perth می‌گیرد (داخلِ خودِ کتابخانه)",
    },
    "seedvc": {
        "family": "تبدیلِ صدا (رنگِ صدا عوض می‌شود، واژه‌ها نه)",
        # ══ اجرای #۵: همان خطا، چون اشتباهی را نصفه فهمیدم ══
        # اجرای #۳ گفت «TorchCodec is required». من آن را «ffmpeg نیست»
        # خواندم و از apt نصبش کردم — و f5 با همان اصلاح باز شد، که
        # تأییدِ دروغینی به من داد. ولی برای seedvc پیامْ *واقعاً* همان
        # چیزی بود که نوشته بود: بستهٔ پایتونیِ torchcodec اصلاً نصب
        # نبود. یک خطا دو علتِ ممکن داشت و من زودتر از موعد یکی را
        # انتخاب کردم.
        "pip": ["seed-vc", "torchcodec"],
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
        # اجرای #۲: «Coqui TTS requires PyTorch … but they were not found».
        # coqui-tts عمداً تورچ را وابستگیِ خودش نمی‌گذارد (نسخه‌اش به
        # سخت‌افزار بستگی دارد)، پس باید صریح نصب شود.
        # اجرای #۳: «cannot import name 'isin_mps_friendly' from
        # transformers.pytorch_utils» — coqui-tts با transformersِ تازه
        # نمی‌سازد. سقف می‌گذاریم. (این موتور کم‌ارزش‌ترین است چون وزن‌هایش
        # غیرتجاری‌اند؛ فقط برای کامل‌شدنِ تصویر می‌ماند.)
        "pip": ["torch", "torchaudio", "transformers<4.50", "coqui-tts"],
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
    """
    مسیرِ ffmpeg — اول از خودِ سیستم، بعد از PyPI.

    ══ اجرای #۴، و شکلِ آشنای اشتباه ══
    اجرای #۳ نشان داد torchcodec به کتابخانه‌های اشتراکیِ ffmpeg نیاز دارد،
    پس در گردش‌کار از `imageio-ffmpeg` (باینریِ استاتیک) به `apt` رفتم. و
    همان‌جا خطِ نصبِ imageio-ffmpeg را برداشتم — در حالی که این تابع هنوز
    از آن می‌پرسید. نتیجه: هر پنج کار با
    `ModuleNotFoundError: No module named 'imageio_ffmpeg'` افتادند، پیش از
    آنکه هیچ مدلی امتحان شود.

    درسش همان درسِ همیشگیِ این ریپوست، این بار روی خودم: **وقتی سازوکاری
    را عوض می‌کنی، دنبالِ هر چیزی بگرد که به سازوکارِ قبلی وابسته بود.**
    حالا هیچ‌کدام تنها راه نیست: اگر `ffmpeg` روی PATH باشد همان، وگرنه
    باینریِ PyPI. هر دو محیط کار می‌کند.
    """
    import shutil
    p = shutil.which("ffmpeg")
    if p:
        return p
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


def cutAtPause_(src, dst, max_sec=11.5, min_sec=4.0):
    """
    برشِ نمونه سرِ یک **مکث**، زیرِ سقفِ دوازده‌ثانیه‌ایِ f5.

    ══ چرا (سؤالِ صاحبِ برنامه: «می‌شود ۱۸ ثانیه؟») ══
    نه — و دلیلش سلیقهٔ من نیست، در خودِ کدِ f5 است:

        if len(aseg) > 12000:
            aseg = aseg[:12000]

    هرچه بدهیم، بیش از دوازده ثانیه‌اش را خودش می‌بُرد. ولی نکتهٔ مهم‌تر
    این است که *چطور* می‌بُرد: اول با `split_on_silence` دنبالِ مکث
    می‌گردد و سرِ یک پاسِ طبیعی می‌بُرد، نه وسطِ واژه.

    یعنی برشِ ده‌ثانیه‌ایِ من — که کورکورانه سرِ ثانیهٔ ده قیچی می‌کرد — از
    کارِ خودِ f5 **بدتر** بود. آن را «بهبود» نامیده بودم.

    و خواستهٔ او هم درست است: ده ثانیه برای شنیدنِ رنگِ یک صدا کم است.
    پس تا نزدیکِ سقف می‌رویم و سرِ آخرین مکثِ پیش از آن می‌بُریم — هم
    بلندترین نمونهٔ ممکن، هم برشِ تمیز، و هم f5 دیگر لازم نیست خودش
    ببُرد، پس متنِ مرجعی که دستی داده شود دقیقاً به همین تکه می‌خورَد.
    """
    f = ffmpeg()
    r = sh([f, "-hide_banner", "-i", src, "-af",
            "silencedetect=noise=-38dB:d=0.22", "-f", "null", "-"],
           capture_output=True)
    log = (r.stderr or b"").decode("utf-8", "replace")
    starts = []
    for m in re.finditer(r"silence_start:\s*([0-9.]+)", log):
        try: starts.append(float(m.group(1)))
        except ValueError: pass
    good = [t for t in starts if min_sec <= t <= max_sec]
    cut = max(good) if good else max_sec
    r2 = sh([f, "-y", "-i", src, "-t", "%.3f" % cut, "-c", "copy", dst],
            capture_output=True)
    if r2.returncode != 0:
        raise RuntimeError("برش نشد: " + r2.stderr.decode("utf-8", "replace")[-400:])
    print("برشِ نمونه: %.2f ثانیه (%s)" %
          (cut, "سرِ مکث" if good else "سکوتی پیدا نشد؛ سرِ سقف"), flush=True)
    return dst, cut, len(starts)


def probe(path):
    """
    چند ثانیه است و چند هرتز — عدد، نه حدس.

    اجرای #۲: chatterbox صوتِ سالم ساخت و همین تابع با «unknown format: 3»
    ترکید، چون `wave`ی پایتون WAVِ ممیزشناور (قالبِ ۳) را نمی‌خواند. یعنی
    سنجه‌ای که برای *گزارش* نوشته شده بود، خودش را جای *نتیجه* جا زد و یک
    موفقیت را خطا نشان داد. هر دو قالب خوانده می‌شود، و اگر باز هم نشد،
    «نمی‌دانم» برمی‌گردد نه استثنا.
    """
    try:
        import soundfile as sf
        i = sf.info(path)
        return {"seconds": round(i.duration, 2), "rate": i.samplerate,
                "channels": i.channels, "format": i.subtype}
    except Exception:
        pass
    try:
        import wave
        with wave.open(path, "rb") as w:
            return {"seconds": round(w.getnframes() / float(w.getframerate()), 2),
                    "rate": w.getframerate(), "channels": w.getnchannels()}
    except Exception as e:
        return {"unknown": str(e)[:120]}


# ───────────────────────── موتورها ─────────────────────────
# هر کدام یا فایل می‌سازد یا استثنا می‌دهد. هیچ‌کدام «تقریباً موفق» ندارد.

def patch_bigvgan():
    """
    ══ وصلهٔ امضای کهنه در bigvganِ بسته‌بندی‌شده (اجرای #۱) ══

    اجرای اول اینجا شکست خورد:

        TypeError: BigVGAN._from_pretrained() missing 2 required
        keyword-only arguments: 'proxies' and 'resume_download'

    یعنی `huggingface_hub` دیگر این دو را به `_from_pretrained` پاس
    نمی‌دهد، ولی نسخهٔ bigvganی که داخلِ seed-vc بسته‌بندی شده هنوز
    بی‌مقدار‌پیش‌فرض می‌خواهدشان.

    **پین‌کردنِ نسخه چاره نیست**: خودِ `seed-vc 0.4.3` صریح
    `huggingface-hub>=0.28.1` را لازم دارد، پس پایین‌بردنش یعنی جنگیدن با
    وابستگی‌ها و شکستنِ جای دیگر. راهِ درست، وصله‌زدنِ همان یک امضاست:
    دو پارامتر مقدارِ پیش‌فرض می‌گیرند و هرچه هم پاس داده نشود، کار می‌کند.

    وصله در گزارش ثبت می‌شود — وصله‌ای که بی‌صدا بزنیم، فردا کسی نمی‌داند
    چرا کد با بالادست فرق دارد.
    """
    import re
    info = {"patched": False, "files": []}
    try:
        import seed_vc
    except Exception as e:
        info["error"] = "seed_vc وارد نشد: %s" % e
        return info
    base = os.path.dirname(seed_vc.__file__)
    for root, _dirs, files in os.walk(base):
        for fn in files:
            if not fn.endswith(".py"):
                continue
            fp = os.path.join(root, fn)
            try:
                txt = open(fp, encoding="utf-8").read()
            except Exception:
                continue
            if "_from_pretrained" not in txt or "proxies" not in txt:
                continue
            new_txt = txt
            # فقط داخلِ امضا، و فقط همان دو نامی که خطا شکایتشان را کرد.
            new_txt = re.sub(r"(\n\s*)proxies(\s*:\s*[^,\n=]+)?(\s*),",
                             lambda m: "%sproxies%s = None%s," %
                                       (m.group(1), m.group(2) or "", m.group(3)),
                             new_txt)
            new_txt = re.sub(r"(\n\s*)resume_download(\s*:\s*[^,\n=]+)?(\s*),",
                             lambda m: "%sresume_download%s = False%s," %
                                       (m.group(1), m.group(2) or "", m.group(3)),
                             new_txt)
            if new_txt != txt:
                open(fp, "w", encoding="utf-8").write(new_txt)
                info["patched"] = True
                info["files"].append(os.path.relpath(fp, base))
    return info


def run_seedvc(ref, src, text, out):
    """تبدیلِ صدا: صوتِ Gemini + نمونهٔ گوینده → همان واژه‌ها با رنگِ صدای او."""
    if not src:
        raise RuntimeError("این موتور به یک صوتِ مبدأ نیاز دارد (خروجیِ Gemini). "
                           "src_id را در ورودیِ اکشن بدهید.")
    dst = os.path.join(out, "seedvc.wav")
    # اجرای #۲ سرِ پنجاه دقیقه کشته شد. روی CPU، سی قدمِ انتشار برای ۱۷
    # ثانیه صوت گران است — و این خودش خبرِ مهمی برای *تولید* است، نه فقط
    # برای آزمایش. با ده قدم می‌شود فهمید مسئله محاسبه است یا دانلودِ مدل.
    r = sh([sys.executable, "-m", "seed_vc.inference",
            "--source", src, "--target", ref, "--output", out,
            "--diffusion-steps", "10", "--f0-condition", "False"],
           capture_output=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).decode("utf-8", "replace")[-1500:])
    # ══ ورودی را به‌جای خروجی گزارش کردم (اجرای #۶) ══
    # اینجا «هر wavی جز dst» را خروجی می‌گرفتم، و پوشه سه wav داشت:
    # reference و source-gemini که خودم ساخته بودمشان، و خروجیِ واقعی.
    # `os.listdir` ترتیب قول نمی‌دهد، پس source-gemini انتخاب شد و گزارش
    # گفت «خروجی: source-gemini.wav» — یعنی سنجهٔ سرعت روی ورودی حساب شد.
    # قاعده‌اش همان قاعدهٔ همیشگی است: خروجی را با **نامش** بشناس، نه با
    # «هرچه ماند».
    known = {"reference.wav", "source-gemini.wav", os.path.basename(dst)}
    made = sorted(f for f in os.listdir(out)
                  if f.endswith(".wav") and f not in known)
    if os.path.exists(dst):
        return dst
    if made:
        return os.path.join(out, made[0])
    raise RuntimeError("موتور تمام شد ولی هیچ فایلِ تازه‌ای نساخت")


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


def f5Resolve_(ckpt, vocab):
    """
    شناسهٔ مخزن → نشانیِ دقیقِ فایل.

    اسکنِ اجرای #۶ نشان داد `Lumos675/F5_TTS_Persian` وجود دارد. ولی برای
    دادنش به f5 باید نامِ **فایلِ** داخلش را دانست، و آن یک رفت‌وبرگشتِ
    دیگر با صاحبِ برنامه بود. شبکهٔ این ماشین باز است، پس خودش می‌پرسد:
    کافی است «Lumos675/F5_TTS_Persian» نوشته شود.

    اگر نشانیِ کامل (`hf://…`) داده شود، دست نمی‌خورد.
    """
    if not ckpt or ckpt.startswith("hf://") or "/" not in ckpt or ckpt.count("/") > 1:
        return ckpt, vocab
    import json as _j, urllib.request
    url = "https://huggingface.co/api/models/" + ckpt
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "voicelab"})
        with urllib.request.urlopen(req, timeout=45) as r:
            info = _j.loads(r.read().decode("utf-8"))
    except Exception as e:
        print("فهرستِ فایل‌های مخزن گرفته نشد: %s" % str(e)[:200], flush=True)
        return ckpt, vocab
    files = [x.get("rfilename", "") for x in (info.get("siblings") or [])]
    print("فایل‌های مخزن:", files[:40], flush=True)
    # وزن‌ها: safetensors بر pt مقدم است؛ در هر دو، تازه‌ترین/بزرگ‌ترین گام.
    weights = [f for f in files if f.endswith((".safetensors", ".pt"))]
    weights.sort(key=lambda f: (f.endswith(".safetensors"), f))
    got = "hf://%s/%s" % (ckpt, weights[-1]) if weights else ckpt
    if not vocab:
        vocs = [f for f in files if f.endswith(".txt") and "vocab" in f.lower()]
        if vocs:
            vocab = "hf://%s/%s" % (ckpt, vocs[0])
    print("چک‌پوینت:", got, "| واژگان:", vocab or "(پیش‌فرض)", flush=True)
    return got, vocab


# نویسه‌های اعراب — یک تعریف، چون سه جا لازم می‌شود و دو تعریف یعنی یکی
# روزی کهنه می‌شود.
TASHKIL_ = "".join(chr(c) for c in list(range(0x064B, 0x0653)) + [0x0670, 0x0640])


def noTash_(t):
    return "".join(ch for ch in (t or "") if ch not in TASHKIL_)


def vocabAudit_(vocab, texts):
    """
    آیا واژگانِ این چک‌پوینت، نویسه‌های متنِ ما را **دارد**؟

    ══ چرا این سؤال، سؤالِ درجه‌یک است ══

    از خودِ کدِ f5 (`model/utils.py`):

        vocab_char_map.get(c, 0)
        assert vocab_char_map[" "] == 0, "0 is used for unknown char"

    یعنی هر نویسهٔ ناشناخته **فاصله** می‌شود — نه حذف، نه نویسهٔ خاص:
    فاصله. اگر اعراب در واژگان نباشد، «دَر» به «د ر» تبدیل می‌شود و مدل
    به‌جای یک واژه، دو حرفِ جدا می‌بیند. آن‌وقت رنگِ صدا (که از صوتِ مرجع
    می‌آید) درست می‌مانَد و **واژه‌ها خراب** می‌شوند — که دقیقاً همان چیزی
    است که شنیده شد.

    این را نمی‌شود حدس زد و نمی‌شود از روی کیفیتِ خروجی فهمید. یک فایلِ
    متنیِ چندکیلوبایتی جواب را قطعی می‌دهد.
    """
    out = {"vocab": vocab or "(پیش‌فرض — انگلیسی/چینی)"}
    if not vocab:
        # واژگانِ پیش‌فرضِ f5 روی Emilia ZH-EN ساخته شده و اصلاً حرفِ فارسی
        # ندارد؛ گفتنش بهتر از دانلودِ بی‌فایده است.
        out["ok"] = False
        out["note"] = "واژگانِ سفارشی داده نشده — پیش‌فرضِ f5 حرفِ فارسی ندارد."
        return out
    src = vocab
    if vocab.startswith("hf://"):
        pr = vocab[5:].split("/")
        if len(pr) >= 3:
            src = "https://huggingface.co/%s/%s/resolve/main/%s" % (
                pr[0], pr[1], "/".join(pr[2:]))
    try:
        if src.startswith("http"):
            import urllib.request
            req = urllib.request.Request(src, headers={"User-Agent": "voicelab"})
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read().decode("utf-8", "replace")
        else:
            raw = io.open(src, encoding="utf-8").read()
    except Exception as e:
        out["ok"] = False
        out["error"] = str(e)[:200]
        out["source"] = src
        return out
    # همان‌طور که f5 می‌خوانَد: هر سطر یک نویسه، و `char[:-1]` یعنی فقط
    # نویسهٔ پایانِ سطر کنار می‌رود.
    lines = raw.split("\n")
    chars = set(ln for ln in lines)
    out["ok"] = True
    out["size"] = len(lines)
    out["source"] = src
    miss = {}
    for name, t in (texts or {}).items():
        bad = sorted(set(c for c in (t or "") if c not in chars))
        if bad:
            miss[name] = {
                "chars": ["U+%04X %s" % (ord(c), c) for c in bad][:30],
                "count": sum(1 for c in (t or "") if c not in chars),
                "pct": round(100.0 * sum(1 for c in (t or "") if c not in chars)
                             / max(1, len(t or "")), 1),
            }
    out["missing"] = miss
    out["tashkil_in_vocab"] = {"U+%04X" % ord(c): (c in chars) for c in TASHKIL_}
    out["tashkil_supported"] = all(out["tashkil_in_vocab"].values())
    out["zwnj_in_vocab"] = ("\u200c" in chars)
    return out


def f5SpeedFit_(refText, genText):
    """
    اصلاحِ **بودجهٔ زمانِ** تولید — عددی که مستقیم از فرمولِ خودِ f5 درمی‌آید.

    `infer_batch_process` طولِ خروجی را این‌طور می‌سازد:

        ref_text_len = len(ref_text.encode("utf-8"))
        gen_text_len = len(gen_text.encode("utf-8"))
        duration = ref_audio_len + int(ref_audio_len / ref_text_len
                                       * gen_text_len / local_speed)

    یعنی «چند ثانیه حرف بزن» را از نسبتِ **بایت‌ها** حساب می‌کند. متنِ ما
    اعراب دارد و متنِ مرجع (رونویسِ ویسپر) ندارد — و هر اعراب دو بایت است.
    برای متنِ آزمونِ ما این نسبت ۱٫۲۴ است: مدل ۲۴٪ زمانِ بیشتر از آنچه
    واژه‌ها لازم دارند می‌گیرد و ناچار است پُرش کند — کِش‌دادن، مکث‌های
    نابه‌جا، و گاهی هجای اضافه.

    و اندازه‌گیریِ خروجیِ اجرای #۹ همین را نشان داد: نمونهٔ رضوی ۶۴٪ گفتار
    بود و خروجیِ ما ۷۷٪ — یعنی پیوسته‌تر و کِش‌دارتر، نه شبیه‌تر.

    پس `--speed` را دقیقاً به همان نسبت بالا می‌بریم تا بودجه با واژه‌ها
    بخوانَد. اگر متنِ مرجع هم اعراب داشته باشد، این عدد خودبه‌خود ۱ می‌شود.
    """
    def b(t):
        return len((t or "").encode("utf-8"))
    a = b(genText) / float(max(1, b(noTash_(genText))))
    c = b(noTash_(refText)) / float(max(1, b(refText)))
    return round(a * c, 3)


def saveRep_():
    """
    گزارش را **همین حالا** روی دیسک بنویس، نه در پایان.

    اجرای #۹ سرِ پنجاه دقیقه لغو شد و چون گزارش فقط در پایان نوشته می‌شد،
    دو چیزی که کلِ آن اجرا برای دیدنشان بود — جای برشِ نمونه و آنچه
    رونویس شنید — هرگز دیده نشدند. تشخیصی که فقط در صورتِ موفقیت به دست
    بیاید، دقیقاً وقتی نیست که لازمش داری.
    """
    rep, out = OPT.get("_rep"), OPT.get("_out")
    if not isinstance(rep, dict) or not out:
        return
    for k in ("resolved", "variants", "ref_cut", "ref_used", "vocab_audit",
              "speed_fit", "ref_text_source", "ref_text_final", "alphabet_note"):
        if OPT.get(k) is not None:
            rep[k] = OPT[k]
    if OPT.get("heard") is not None:
        rep["ref_text_heard"] = OPT["heard"]
    try:
        with io.open(os.path.join(out, "report-%s.json" % rep.get("engine", "x")),
                     "w", encoding="utf-8") as f:
            f.write(json.dumps(rep, ensure_ascii=False, indent=1))
    except Exception as e:
        print("گزارش ذخیره نشد: %s" % str(e)[:200], flush=True)


def run_f5(ref, src, text, out):
    """
    ══ چرا این موتور تنها امیدِ واقعیِ باقی‌مانده است ══

    پنج اجرا ثابت کرد هیچ چک‌پوینتِ پایه‌ای فارسی نمی‌داند. ولی از خودِ
    کدِ f5 (`infer_cli.py`) این را خواندم:

        elif ckpt_file.startswith("hf://"):
            ckpt_file = str(cached_path(ckpt_file))

    یعنی می‌شود چک‌پوینتِ **دیگری** به آن داد، مستقیم از Hugging Face، با
    دو آرگومان و بی هیچ تغییرِ دیگری. مدل‌های آماده‌اش (F5TTS_Base،
    F5TTS_v1_Base، E2TTS_Base) همه انگلیسی/چینی‌اند — ولی اگر کسی f5 را
    روی فارسی تنظیمِ دقیق کرده باشد، آن‌وقت **هم فارسی داریم هم کلونِ
    صدا**، که هیچ‌کدام از موتورهای دیگر با هم ندارند.

    آیا چنین چیزی هست؟ کارِ `scan` جوابش را می‌دهد. این تابع فقط در را
    باز نگه می‌دارد تا آن جواب، یک کلیک با شنیدن فاصله داشته باشد.
    """
    ck, vo = f5Resolve_(str(OPT.get("f5_ckpt") or "").strip(),
                        str(OPT.get("f5_vocab") or "").strip())
    OPT["resolved"] = {"ckpt": ck, "vocab": vo}
    nfe = str(OPT.get("f5_nfe") or "").strip()

    """
    ══ سه علتِ ساختاری، همه از خودِ کدِ f5 — نه حدس (پس از اجرای #۹) ══

    اجرای #۹ لغو شد ولی خروجی‌اش شنیده شد و حکم روشن بود: «صدا مثل همونه
    ولی کلمات به شدت بد میخونه و اعراب و لحن اصلاً خوب نیست.» یعنی نیمهٔ
    سختِ کار — گرفتنِ رنگِ صدا — جواب داده و چیزی در **متن** خراب است.
    منبعِ f5 را خواندم؛ سه چیز پیدا شد که هر سه همین را می‌سازند:

    ۱) **نویسهٔ ناشناخته، فاصله می‌شود.** `vocab_char_map.get(c, 0)` و
       `assert vocab_char_map[" "] == 0`. اگر اعراب در واژگانِ این
       چک‌پوینت نباشد، «دَر» می‌شود «د ر»: مدل واژه نمی‌بیند، حرفِ جدا
       می‌بیند. `vocabAudit_` این را با یک فایلِ متنی قطعی می‌کند.

    ۲) **بودجهٔ زمان از نسبتِ بایت‌ها می‌آید.** متنِ ما اعراب دارد و
       رونویسِ مرجع ندارد، پس بودجه ۲۴٪ بیش از نیازِ واژه‌هاست و مدل
       ناچار است پُرش کند. `f5SpeedFit_` همان نسبت را از `--speed` پس
       می‌گیرد. اندازه‌گیریِ خروجیِ #۹ همین را تأیید کرد: ۷۷٪ گفتار در
       برابرِ ۶۴٪ در نمونهٔ رضوی.

    ۳) **خودِ f5 نمونه را دوباره می‌بُرد** — `split_on_silence` با
       `keep_silence=1000` و شرطِ «اگر با تکهٔ بعدی از ۱۲ ثانیه گذشت،
       بایست». برشِ تمیزِ ۱۰٫۹ ثانیه‌ایِ ما می‌تواند همان‌جا به ~۶ ثانیه
       آب برود، بی هیچ خطایی. آن‌وقت متنِ مرجع دو برابرِ صوتِ مرجع است و
       بودجه نصف می‌شود. پس این مرحله را **خودمان** اجرا می‌کنیم، فایلش
       را نگه می‌داریم (`reference-used.wav`) و رونویس را از **همان**
       می‌گیریم — تا متن و صوتِ مرجع هرگز از هم نیفتند.
    """
    # ── ۱. برشِ سرِ مکث (کارِ ما) ──
    try:
        ref, cutSec, nSil = cutAtPause_(ref, os.path.join(out, "reference-cut.wav"))
        OPT["ref_cut"] = {"seconds": round(cutSec, 2), "silences_found": nSil}
    except Exception as eC:
        print("برشِ سرِ مکث نشد؛ با همان نمونه ادامه: %s" % str(eC)[:200], flush=True)
    saveRep_()

    # ── ۲. همان آماده‌سازی‌ای که f5 خودش می‌کند، ولی جلوی چشم ──
    rt = str(OPT.get("f5_ref_text") or "").strip()
    try:
        from f5_tts.infer.utils_infer import preprocess_ref_audio_text, transcribe
        # متنِ ساختگی می‌دهیم تا این فراخوان فقط **صوت** را ببُرد و
        # رونویس را خودمان با زبانِ صریح بگیریم.
        used, _ = preprocess_ref_audio_text(ref, "…")
        keep = os.path.join(out, "reference-used.wav")
        try:
            shutil.copyfile(used, keep)
            used = keep
        except Exception:
            pass
        info = probe(used)
        OPT["ref_used"] = {"file": os.path.basename(used), "info": info}
        cut = float((OPT.get("ref_cut") or {}).get("seconds") or 0)
        sec = float((info or {}).get("seconds") or 0)
        if cut and sec and sec < cut - 1.0:
            OPT["ref_used"]["warning"] = (
                "f5 نمونه را از %.2f به %.2f ثانیه کوتاه کرد — متنِ مرجع "
                "باید فقط همین تکه باشد." % (cut, sec))
            print("::warning::" + OPT["ref_used"]["warning"], flush=True)
        ref = used
        saveRep_()
        # زبان را صریح می‌گوییم: ویسپر بی‌راهنما فارسی را گاهی عربی یا
        # اردو تشخیص می‌دهد و آن‌وقت متنِ مرجع اصلاً زبانِ دیگری است.
        heard = str(transcribe(ref, language="fa") or "").strip()
        OPT["heard"] = heard
        print("\n── آنچه رونویس از نمونهٔ به‌کاررفته شنید ──\n%s\n"
              % heard[:400], flush=True)
    except Exception as e:
        OPT["heard"] = "رونویس/آماده‌سازی انجام نشد: %s" % str(e)[:300]
        print(OPT["heard"], flush=True)
    if rt:
        OPT["ref_text_source"] = "دستیِ شما"
        print("── و آنچه شما دادید ──\n%s\n" % rt[:400], flush=True)
    else:
        h = OPT.get("heard") or ""
        rt = h if h and not h.startswith("رونویس") else ""
        OPT["ref_text_source"] = "رونویسِ خودکار (صریحاً پاس داده شد)"
    # ══ متنِ مرجع باید هم‌الفبای متنِ تولید باشد ══
    # f5 هر دو را در **یک** رشته به مدل می‌دهد (`[ref_text + gen_text]`).
    # یک نیمه فارسی و نیمهٔ دیگر لاتین یعنی مدل وسطِ کار الفبا عوض
    # می‌کند — که هیچ‌جا در آموزشش ندیده.
    alp = str(OPT.get("alphabet") or "fa")
    if alp != "fa" and rt:
        rt = fa2latin.convert(rt, alp)
        OPT["ref_text_source"] += " · برگردانده به %s" % alp
    OPT["ref_text_final"] = rt
    saveRep_()

    # ── ۳. واژگان: آیا اعرابِ ما اصلاً نویسهٔ شناخته‌شده است؟ ──
    noTash = noTash_(text)
    aud = vocabAudit_(vo, {"با اعراب": text, "بی اعراب": noTash, "متنِ مرجع": rt})
    OPT["vocab_audit"] = aud
    print("واژگان:", json.dumps(aud, ensure_ascii=False)[:900], flush=True)
    saveRep_()

    # اگر واژگان خوانده شد و اعراب در آن نبود، فرستادنِ اعراب یعنی
    # فاصله‌پاشیدن وسطِ واژه‌ها. اگر خوانده نشد، رفتارِ پیشین می‌مانَد —
    # «نمی‌دانم» نباید تصمیمِ تازه بسازد.
    tashOk = (not aud.get("ok")) or aud.get("tashkil_supported")
    sendText = text if tashOk else noTash
    fit = f5SpeedFit_(rt, sendText) if rt else 1.0
    OPT["speed_fit"] = {"speed": fit, "text": "با اعراب" if sendText is text else "بی اعراب",
                        "why": "اعراب در واژگان هست" if tashOk else
                               "اعراب در واژگان نیست؛ بی‌اعراب فرستاده شد"}
    saveRep_()

    # ── ۴. دو اجرا: تشخیص، و شاهد ──
    # شاهد همان چیزی است که اجرای #۹ کرد (متنِ اعراب‌دار، سرعتِ ۱). بدونِ
    # شاهد، «بهتر شد» فقط یک احساس است.
    runs = [(("fit"), sendText, fit, "متن و بودجهٔ زمانِ اصلاح‌شده")]
    if sendText is not text or abs(fit - 1.0) > 0.02:
        runs.append(("asis", text, 1.0, "همان که اجرای پیشین کرد — شاهد"))
    made, notes = None, []
    for name, txt, spd, why in runs:
        fn = "f5-%s.wav" % name
        cmd = ["f5-tts_infer-cli", "--ref_audio", ref, "--ref_text", rt,
               "--gen_text", txt, "--output_dir", out, "--output_file", fn,
               "--speed", "%.3f" % spd]
        if nfe:
            cmd += ["--nfe_step", nfe]
        if ck:
            cmd += ["--ckpt_file", ck]
        if vo:
            cmd += ["--vocab_file", vo]
        # بودجه‌ای که فرمولِ f5 می‌دهد — تا بشود با طولِ واقعیِ خروجی سنجید.
        refSec = float(((OPT.get("ref_used") or {}).get("info") or {}).get("seconds") or 0)
        want = 0.0
        if refSec and rt:
            want = refSec * len(txt.encode("utf-8")) / float(
                max(1, len(rt.encode("utf-8")))) / spd
        print("\n=== %s — %s (سرعت %.3f) ===\n%s\n"
              % (name, why, spd, txt[:160]), flush=True)
        r = sh(cmd, capture_output=True)
        path = os.path.join(out, fn)
        row = {"name": name, "why": why, "speed": spd, "chars": len(txt),
               "expected_seconds": round(want, 2)}
        if r.returncode == 0 and os.path.exists(path):
            row["ok"] = True
            row["info"] = probe(path)
            made = made or path
        else:
            row["ok"] = False
            row["error"] = (r.stderr or r.stdout).decode("utf-8", "replace")[-500:]
        notes.append(row)
        OPT["variants"] = notes
        saveRep_()
    if not made:
        raise RuntimeError("هیچ اجرایی خروجی نداد: " +
                           json.dumps(notes, ensure_ascii=False)[:1200])
    return made


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


def run_chatterboxvc(ref, src, text, out):
    """
    تبدیلِ صدا با همان بسته‌ای که در اجرای #۲ نصبش ۱۱۰ ثانیه طول کشید و
    صدای مرجع را درست گرفت. متن اینجا اصلاً به کار نمی‌رود — و همین نکته‌اش
    است: واژه‌ها از `src` می‌آیند، که خروجیِ فارسیِ خودِ موتور است.
    """
    if not src:
        raise RuntimeError("این موتور به صوتِ مبدأ نیاز دارد (خروجیِ Gemini).")
    import torch, torchaudio
    from chatterbox.vc import ChatterboxVC
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", dev, flush=True)
    m = ChatterboxVC.from_pretrained(device=dev)
    wav = m.generate(src, target_voice_path=ref)
    dst = os.path.join(out, "chatterboxvc.wav")
    torchaudio.save(dst, wav, m.sr)
    return dst


RUNNERS = {"chatterboxvc": run_chatterboxvc, "seedvc": run_seedvc,
           "chatterbox": run_chatterbox, "f5": run_f5, "xtts": run_xtts}

# تنظیماتِ اجرا که موتورها می‌خوانند. یک دیکشنریِ ساده، چون امضای
# RUNNERها یکی است و نباید برای یک موتور عوض شود.
OPT = {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", required=True, choices=sorted(ENGINES))
    ap.add_argument("--ref", required=True, help="نمونهٔ صدای گوینده")
    ap.add_argument("--src", default="", help="صوتِ فارسیِ Gemini (برای تبدیلِ صدا)")
    ap.add_argument("--text", default=DEFAULT_TEXT)
    ap.add_argument("--out", default="voicelab-out")
    # این «چقدر مواد بده» است، نه «چقدر استفاده کن»: برشِ نهایی را
    # cutAtPause_ سرِ یک مکث و زیرِ سقفِ دوازده‌ثانیه‌ایِ f5 انجام می‌دهد.
    # هرچه سخاوتمندتر، انتخابِ مکث بهتر.
    ap.add_argument("--ref-seconds", type=int, default=30)
    # آزمایشی که ارزان نباشد، دو بار انجام نمی‌شود.
    ap.add_argument("--src-seconds", type=int, default=12)
    # چک‌پوینتِ سفارشیِ f5 — «hf://کاربر/مخزن/فایل» یا مسیرِ محلی
    ap.add_argument("--f5-ckpt", default="")
    ap.add_argument("--f5-vocab", default="")
    # متنِ دقیقِ نمونهٔ مرجع. خالی یعنی f5 خودش با ASR پیاده‌اش کند — و
    # پیاده‌سازیِ غلط، تلفظِ غلط می‌سازد.
    ap.add_argument("--f5-ref-text", default="")
    ap.add_argument("--f5-nfe", default="")
    # ══ ایدهٔ صاحبِ برنامه: الفبا را عوض کن، نه مدل را ══
    # «برای مدل‌هایی که فارسی نمی‌فهمند ولی انگلیسی می‌فهمند، فارسی را
    # فینگلیش بنویسیم — و برای تلفظ از نشانه‌گذاریِ دیکشنری‌ها.»
    # این را نمی‌شود با استدلال جواب داد، چون سؤالش «چطور به گوش می‌آید»
    # است. پس یک پرچم، و همان مسیرِ موجود.
    ap.add_argument("--alphabet", default="fa",
                    choices=["fa"] + sorted(fa2latin.MODES))
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    OPT["f5_ckpt"] = a.f5_ckpt
    OPT["f5_vocab"] = a.f5_vocab
    OPT["f5_ref_text"] = a.f5_ref_text
    OPT["f5_nfe"] = a.f5_nfe
    OPT["alphabet"] = a.alphabet
    # برگردان اینجا انجام می‌شود، نه در run_f5: این آزمایشِ **متن** است، نه
    # آزمایشِ f5. Chatterbox و XTTS هم انگلیسی می‌دانند و فارسی نه — یعنی
    # دقیقاً همان مدل‌هایی که این ایده برایشان طرح شده.
    if a.alphabet != "fa":
        cov = fa2latin.coverage(a.text)
        a.text = fa2latin.convert(a.text, a.alphabet)
        OPT["alphabet_note"] = {"mode": a.alphabet, "coverage": cov,
                                "sent": a.text[:400]}
        print("متن به %s برگردانده شد:\n%s\n" % (a.alphabet, a.text[:300]),
              flush=True)
    meta = ENGINES[a.engine]
    rep = {"engine": a.engine, "at": time.strftime("%Y-%m-%d %H:%M"),
           "family": meta["family"], "code_license": meta["code_license"],
           "persian_note": meta["persian"], "ok": False}
    if a.engine == "f5" and (a.f5_ckpt or a.f5_vocab):
        rep["custom_checkpoint"] = {"ckpt": a.f5_ckpt, "vocab": a.f5_vocab}
    # از این لحظه، هر گامِ مهم گزارش را روی دیسک می‌نویسد — نه فقط پایان.
    OPT["_rep"], OPT["_out"] = rep, a.out
    saveRep_()

    # ── آماده‌سازیِ نمونه ──
    ref = to_wav(a.ref, os.path.join(a.out, "reference.wav"), seconds=a.ref_seconds)
    rep["reference"] = probe(ref)
    src = ""
    if a.src:
        src = to_wav(a.src, os.path.join(a.out, "source-gemini.wav"),
                     seconds=a.src_seconds)
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
            if a.engine == "seedvc":
                rep["patch"] = patch_bigvgan()
                print("وصله:", json.dumps(rep["patch"], ensure_ascii=False), flush=True)
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
            # ورودیِ خام را ثبت می‌کردم؛ آنچه واقعاً به مدل رفت چیزِ دیگری
            # است (شناسهٔ مخزن به نشانیِ فایل حل می‌شود). گزارشی که ورودی
            # را جای اجرا بگذارد، همان اشتباهِ اجرای #۶ است.
            if a.engine == "f5":
                rep["ref_text_given"] = bool(a.f5_ref_text)
                rep["nfe_step"] = a.f5_nfe or "(پیش‌فرض ۳۲)"
            # ══ عددی که تصمیمِ *تولید* را می‌گیرد، نه کیفیت ══
            # seedvc در اجرای #۳ تبدیل را انجام داد — ۱۵۶۶ ثانیه برای ۱۲
            # ثانیه صوت. یعنی یک قسمتِ نوزده‌دقیقه‌ای روی همین ماشین از
            # چهل ساعت می‌گذرد. کیفیتِ عالی هم این را نجات نمی‌دهد، پس
            # این نسبت باید در گزارش باشد نه در ذهن.
            try:
                # ══ عدد را روی همهٔ چیزی که ساخته شد بشمار، نه یکی ══
                # اجرای #۱۰ «۲۱۰ برابرِ بلادرنگ» گزارش کرد و ۶۷ ساعت برای یک
                # قسمت. ولی آن اجرا **دو** فایل ساخت و کلِ زمان به حسابِ
                # اولی نوشته شد. عددِ درست ۹۴ است. گزارشی که هزینهٔ دو کار را
                # به یکی ببندد، همان اشتباهِ «ورودی را خروجی گزارش کردن» است
                # با لباسِ دیگر — و این عدد است که تصمیمِ تولید را می‌گیرد.
                sec = 0.0
                for v in (OPT.get("variants") or []):
                    sec += float(((v or {}).get("info") or {}).get("seconds") or 0)
                if not sec:
                    sec = float((rep.get("output_info") or {}).get("seconds") or 0)
                rep["generated_seconds_total"] = round(sec, 2)
                if sec > 0:
                    rep["realtime_factor"] = round(rep["run_seconds"] / sec, 1)
                    rep["episode_hours_19min"] = round(
                        rep["realtime_factor"] * 19 * 60 / 3600.0, 1)
            except Exception:
                pass

    saveRep_()
    print("\n=== گزارش ===")
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    # شکستِ یک موتور، شکستِ آزمایش نیست: خودِ خبر همان چیزی است که می‌خواستیم.
    return 0


if __name__ == "__main__":
    sys.exit(main())
