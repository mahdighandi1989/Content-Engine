#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rvcpipe.py — زنجیرهٔ دستورهای آموزشِ RVC، در **یک** نسخه.

══ چرا این فایل جداست ══

آموزشِ RVC روی GPU انجام می‌شود و رانرهای گیت‌هاب CPU‌اند، پس آموزش
جای دیگری اجرا می‌شود (Colab). یعنی دقیقاً همان وضعیتی که این ریپو
بارها از آن ضربه خورده: **دو نسخه از یک متن، که با دست هم‌گام نگه
داشته شوند.** پرامپت‌ها یازده نسخه این‌طور بودند تا `promptSyncFromRepo_`
آمد و گفت گیت منبع است و آن‌طرف می‌خوانَد.

پس همان الگو: زنجیره اینجاست، و نوت‌بوک این فایل را از خودِ گیت‌هاب
raw می‌گیرد. اگر فردا یک آرگومان عوض شود، یک جا عوض می‌شود.

══ این دستورها از کجا آمده‌اند ══

از خودِ سورسِ RVC خوانده شده‌اند، نه از آموزش‌های اینترنتی: ترتیبِ
`sys.argv` هر اسکریپت و `argparse` خودِ train. مسیرهای قدیمی
(`infer/modules/train/...`) که در همهٔ آموزش‌ها هست روی `main` دیگر
وجود ندارد — ۴۰۴ می‌دهد. چیدمانِ فعلی `train/...` است.

پروانه‌ها (اجرای اسکنِ #۳۵): کدِ RVC ‏MIT · وزن‌ها (lj1995) ‏MIT ·
ContentVec ‏MIT · RMVPE ‏Apache-2.0.
"""

# ══ وابستگی‌ها: از importهای واقعی، نه از فایلِ requirements ══
# فایلِ `requirments_cu128_py312.txt` دو مشکل دارد: در خطِ اولش
# `--index-url` را روی آینه‌ای در چین قفل می‌کند (که از Colab کند یا
# بسته است و روی خطِ فرمان هم به‌سادگی override نمی‌شود)، و کلِ پشتهٔ
# WebUI را می‌آورد — gradio 3.14، pydantic 1.x، fastapi قدیمی،
# pymss، onnxruntime-gpu. ما WebUI را اجرا نمی‌کنیم؛ پنج اسکریپت را
# اجرا می‌کنیم. نصبِ pydantic 1.x در Colab بی‌دلیل چیزهای دیگر را
# می‌شکند.
#
# پس فهرست از importهای همان پنج اسکریپت و ماژول‌هایی که صدا می‌زنند
# درآمده: preprocess · extract_f0 · extract_hubert_feature ·
# train_index · train، به‌علاوهٔ infer/audio · infer/hubert ·
# infer/rmvpe · train/utils · infer/module/models · train/process_ckpt.
TRAIN_DEPS = [
    "numpy<2",              # RVC هنوز NumPy 1.x است
    "scipy<2",
    "librosa>=0.10.2,<0.11",
    "soundfile>=0.13.0,<1",
    "av>=15.1.0,<16",       # infer/audio.py
    "ffmpeg-python>=0.2.0,<1",
    "praat-parselmouth>=0.4.5,<1",   # روشِ f0 «pm»
    "faiss-cpu>=1.13.0,<2",          # ساختِ ایندکس
    "scikit-learn>=1.6.0,<2",        # MiniBatchKMeans در train_index
    "transformers>=4.49.0,<4.50",    # HubertModel در infer/hubert.py
    "tensorboard>=2.19.0",           # torch.utils.tensorboard در train.py
    "matplotlib>=3.8.2,<4",          # train/utils.py هنگام لاگ‌گیری
    "einops>=0.8.0,<1",
    "local-attention>=1.11.0,<2",
    "tqdm>=4.67.0,<5",
    "PyYAML>=6.0.1",
    "coloredlogs>=15.0,<16",
]

# torch/torchaudio عمداً اینجا نیستند: در Colab از پیش نصب‌اند و با
# CUDAِ همان ماشین جفت شده‌اند. نصبِ دوباره‌شان بهترین حالت اتلافِ وقت
# است و بدترین حالت شکستنِ CUDA.

RVC_REPO = "https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI"
HF_WEIGHTS = "lj1995/VoiceConversionWebUI"

# ══ دارایی‌ها ══
# از بخشِ «模型与运行目录»ِ READMEِ خودشان. مسیرها را کد مستقیم
# می‌خوانَد، پس دقیقاً همین‌ها باید باشند.
#   (الگوی include برای hf download، مقصدِ محلی)
ASSETS = [
    ("hubert_base/*", "assets"),        # رمزگذارِ محتوا (ContentVec)
    ("pretrained_v2/*", "assets"),      # پایهٔ آموزشِ v2
]
ASSET_FILES = [
    ("rmvpe.pt", "assets/rmvpe"),       # استخراجِ زیروبمی
]
# و یکی که همه فراموشش می‌کنند: `logs/mute` نمونه‌های سکوتِ آموزش است
# و از یک zipِ جدا می‌آید. بدونش آموزش سرِ ساختِ دیتاست می‌افتد، با
# خطایی که نامِ mute را نمی‌برد.
ASSET_MUTE = ("mute.zip", ".model-downloads")


def assetCmds_(py="python"):
    """دستورهای دانلودِ دارایی‌ها، به ترتیب."""
    cmds = [[py, "-m", "pip", "install", "--upgrade", "huggingface_hub"]]
    for pattern, dest in ASSETS:
        cmds.append(["hf", "download", HF_WEIGHTS, "--revision", "main",
                     "--include", pattern, "--local-dir", dest])
    for fname, dest in ASSET_FILES:
        cmds.append(["hf", "download", HF_WEIGHTS, fname,
                     "--revision", "main", "--local-dir", dest])
    cmds.append(["hf", "download", HF_WEIGHTS, ASSET_MUTE[0],
                 "--revision", "main", "--local-dir", ASSET_MUTE[1]])
    cmds.append([py, "-m", "zipfile", "-e",
                 "%s/%s" % (ASSET_MUTE[1], ASSET_MUTE[0]), "logs"])
    return cmds


def steps(exp, dataset_dir, root, sr="40k", f0method="rmvpe", epochs=200,
          save_every=50, version="v2", gpus="", n_p=2, batch=8, py="python"):
    """
    پنج قدمِ آموزش، به ترتیب، با آرگومان‌های دقیق.

    `exp` نامِ تجربه است (مثلاً "razavi") و `root` ریشهٔ مخزنِ RVC.

    ══ دامی که اینجا هست ══
    `preprocess.py` مسیرِ **کاملِ** `<root>/logs/<exp>` را می‌گیرد، ولی
    `train.py` فقط **نامِ** `<exp>` را. اگر جابه‌جا بدهی، پوشه‌ای مثلِ
    `logs/<root>/logs/<exp>` ساخته می‌شود و قدمِ بعدی چیزی پیدا نمی‌کند
    — بی خطای روشن. خودِ webui.py هم همین تفکیک را دارد
    (`exp_dir` در برابرِ `exp_dir1`)؛ از آنجا خوانده شده.
    """
    logdir = "%s/logs/%s" % (root, exp)
    pre = "assets/pretrained_v2/f0%s" + sr + ".pth"
    out = []

    # ۱) برش و نرمال‌سازی. آخری `per` است (طولِ هر برش به ثانیه).
    out.append(("preprocess", [
        py, "train/preprocess.py", dataset_dir, sr.replace("k", "000"),
        str(n_p), logdir, "False", "3.0"]))

    # ۲) زیروبمی. شکلِ CPU: mode exp_dir n_p f0method
    out.append(("extract_f0", [
        py, "train/dataset/extract_f0.py", "cpu", logdir, str(n_p), f0method]))

    # ۳) ویژگی‌های hubert. شکلِ CPU دقیقاً ۶ آرگومان بعد از نامِ اسکریپت
    #    است (`len(sys.argv) == 7`): device n_part i_part exp_dir version
    #    is_half. یکی کم یا زیاد، به شاخهٔ GPU می‌افتد و argv را غلط
    #    می‌خوانَد.
    dev = "cuda" if gpus else "cpu"
    out.append(("extract_feature", [
        py, "train/dataset/extract_hubert_feature.py", dev, "1", "0",
        logdir, version, "False"]))

    # ۴) آموزش. `-sw 1` مهم است: بدونش فقط چک‌پوینت‌های بزرگِ G_*.pth
    #    می‌مانَد و مدلِ کوچکِ قابلِ‌استفاده در assets/weights ساخته
    #    نمی‌شود — یعنی ساعت‌ها آموزش، و هیچ فایلی که بشود به کار برد.
    train = [py, "train/train.py", "-e", exp, "-sr", sr, "-f0", "1",
             "-bs", str(batch), "-te", str(epochs), "-se", str(save_every),
             "-pg", pre % "G", "-pd", pre % "D",
             "-l", "0", "-c", "0", "-sw", "1", "-v", version]
    # روی CPU پرچمِ `-g` اصلاً نباید بیاید — webui.py هم دو شاخهٔ جدا
    # دارد و بی‌GPU آن را حذف می‌کند، نه اینکه تهی بفرستد.
    if gpus:
        train += ["-g", gpus]
    out.append(("train", train))

    # ۵) ایندکسِ بازیابی (همان «Retrieval» در نامِ RVC).
    out.append(("train_index", [
        py, "train/train_index.py", exp, version, "assets/indices",
        str(n_p), "auto"]))
    return out


def outputs(exp, root):
    """جایی که محصولِ نهایی می‌نشیند — همان دو فایلی که باید برداری."""
    return {
        "model": "%s/assets/weights/%s.pth" % (root, exp),
        "index_dir": "%s/assets/indices" % root,
        "logs": "%s/logs/%s" % (root, exp),
    }
