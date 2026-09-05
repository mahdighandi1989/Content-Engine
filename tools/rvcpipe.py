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
    # ══ و ابزارِ دانلود، که خودش می‌تواند همان را بشکند ══
    # اجرای #۳۹: برای آوردنِ وزن‌ها `pip install --upgrade huggingface_hub`
    # زدم، نسخهٔ ۱٫۳۰ آمد، و `transformers 4.49` که سقفِ `<1.0` دارد سرِ
    # import مُرد. یعنی بسته‌ای که برای قدمِ «دانلود» اضافه شد، قدمِ
    # «استخراج» را شکست — سه قدم بعدتر و با خطایی که نامِ من در آن نبود.
    # پس اینجا پین می‌شود، در همان یک فهرست، نه با ارتقای موردی.
    "huggingface_hub>=0.26.0,<1.0",
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

import io

RVC_REPO = "https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI"
HF_WEIGHTS = "lj1995/VoiceConversionWebUI"

# ══ دارایی‌ها ══
# از بخشِ «模型与运行目录»ِ READMEِ خودشان. مسیرها را کد مستقیم
# می‌خوانَد، پس دقیقاً همین‌ها باید باشند.
#   (الگوی include برای hf download، مقصدِ محلی)
ASSETS = [
    ("hubert_base/*", "assets"),        # رمزگذارِ محتوا (ContentVec)
]
# پایهٔ آموزش: فقط همان جفتی که با نرخِ نمونه می‌خوانَد، نه کلِ پوشه.
# `pretrained_v2/*` چند گیگابایت است و ما دو فایل از آن لازم داریم؛ در
# Colab این تفاوتِ چند دقیقه است و روی رانر تفاوتِ موفقیت و مهلت.
PRETRAINED = "pretrained_v2/f0%s%s.pth"
ASSET_FILES = [
    ("rmvpe.pt", "assets/rmvpe"),       # استخراجِ زیروبمی
]
# و یکی که همه فراموشش می‌کنند: `logs/mute` نمونه‌های سکوتِ آموزش است
# و از یک zipِ جدا می‌آید. بدونش آموزش سرِ ساختِ دیتاست می‌افتد، با
# خطایی که نامِ mute را نمی‌برد.
ASSET_MUTE = ("mute.zip", ".model-downloads")


def assetCmds_(py="python", sr="40k", hf="hf"):
    """دستورهای دانلودِ دارایی‌ها، به ترتیب."""
    cmds = [[py, "-m", "pip", "install", "--upgrade", "huggingface_hub"]]
    for pattern, dest in ASSETS:
        cmds.append([hf, "download", HF_WEIGHTS, "--revision", "main",
                     "--include", pattern, "--local-dir", dest])
    for side in ("G", "D"):
        cmds.append([hf, "download", HF_WEIGHTS, PRETRAINED % (side, sr),
                     "--revision", "main", "--local-dir", "assets"])
    for fname, dest in ASSET_FILES:
        cmds.append([hf, "download", HF_WEIGHTS, fname,
                     "--revision", "main", "--local-dir", dest])
    cmds.append([hf, "download", HF_WEIGHTS, ASSET_MUTE[0],
                 "--revision", "main", "--local-dir", ASSET_MUTE[1]])
    cmds.append([py, "-m", "zipfile", "-e",
                 "%s/%s" % (ASSET_MUTE[1], ASSET_MUTE[0]), "logs"])
    return cmds


def inferAssetCmds_(py="python", hf="hf", dest="assets"):
    """فقط دو دارایی‌ای که **تبدیل** لازم دارد، از همان منبعِ سنجیده‌شده.

    ══ چرا این تابع جداست ══
    `assetCmds_` پنج چیز می‌آورد، از جمله وزن‌های پایهٔ آموزش که با هم
    نزدیک نیم گیگابایت‌اند و در تبدیل هیچ کاربردی ندارند.

    ══ و چرا اصلاً دانلود می‌کنیم، وقتی خودِ کتابخانه بلد است ══
    `infer-rvc-python` اگر مسیری ندهی، همین دو را از آینه‌ای شخصی
    می‌گیرد (`r3gm/...`). آن آینه پروانه‌اش سنجیده نشده و ما قاعده‌ای
    داریم که در کلِ این کار نگه داشته شده: **پروانهٔ وزن‌ها حاکم است، نه
    پروانهٔ کد.** پس همان‌هایی را می‌دهیم که از اول سنجیده‌ایم —
    ContentVec ‏MIT از `lj1995`، و RMVPE ‏Apache-2.0. کتابخانه هر دو را
    از مسیرِ محلی می‌پذیرد (`hubert_path` و `rmvpe_path`).
    """
    cmds = []
    for pattern, sub in ASSETS:
        cmds.append([hf, "download", HF_WEIGHTS, "--revision", "main",
                     "--include", pattern, "--local-dir", dest])
    for fname, sub in ASSET_FILES:
        cmds.append([hf, "download", HF_WEIGHTS, fname, "--revision", "main",
                     "--local-dir", "%s/%s" % (dest, sub.split("/")[-1])])
    return cmds


def inferAssetPaths_(dest="assets"):
    """جایی که `inferAssetCmds_` آن دو را می‌گذارد — در یک تعریف با آن."""
    import os as _os
    return {
        "hubert": _os.path.join(dest, "hubert_base"),
        "rmvpe": _os.path.join(dest, ASSET_FILES[0][1].split("/")[-1],
                               ASSET_FILES[0][0]),
    }


def env(root, base=None):
    """محیطِ اجرای هر قدم — و اینجا یک دامِ واقعی هست.

    ══ چرا PYTHONPATH لازم است ══
    هر پنج اسکریپت از ریشهٔ مخزن import می‌کنند (`infer.audio`،
    `train.dataset.slicer2`، `i18n.i18n`، `tools.progress`). ولی وقتی
    `python train/preprocess.py` اجرا شود، پایتون **پوشهٔ اسکریپت** را در
    `sys.path` می‌گذارد، نه پوشهٔ جاری را. یعنی `import infer` پیدا نمی‌شود.

    و هیچ‌کدام از آن پنج اسکریپت `sys.path` را دست نمی‌زند — گشتم:
    نه `sitecustomize.py` هست، نه `conftest.py`، نه `train/__init__.py`،
    نه اسکریپتِ راه‌اندازی که متغیر را بگذارد. خودِ `webui.py` هم فقط
    `cwd` را می‌گذارد و PYTHONPATH را ست نمی‌کند.

    پس بدونِ این خط، قدمِ اول با `ModuleNotFoundError: No module named
    'infer'` می‌میرد — پیش از آنکه حتی یک فایل خوانده شود. این دقیقاً همان
    چیزی است که اگر از روی یک آموزشِ اینترنتی می‌رفتیم، وسطِ Colab پیدا
    می‌شد نه اینجا.
    """
    import os as _os
    e = dict(base if base is not None else _os.environ)
    old = e.get("PYTHONPATH", "")
    e["PYTHONPATH"] = root + ((_os.pathsep + old) if old else "")
    return e


def steps(exp, dataset_dir, root, sr="40k", f0method="rmvpe", epochs=200,
          save_every=50, version="v2", gpus="", n_p=2, batch=8, py="python",
          latest=0):
    """
    پنج قدمِ آموزش، به ترتیب، با آرگومان‌های دقیق.

    `exp` نامِ تجربه است (مثلاً "razavi") و `root` ریشهٔ مخزنِ RVC.

    ══ دامِ ۱: مسیرِ کامل در برابرِ نام ══
    `preprocess` مسیرِ **کاملِ** `<root>/logs/<exp>` را می‌گیرد، ولی
    `train` فقط **نامِ** `<exp>` را. اگر جابه‌جا بدهی، پوشه‌ای مثلِ
    `logs/<root>/logs/<exp>` ساخته می‌شود و قدمِ بعدی چیزی پیدا نمی‌کند
    — بی خطای روشن. خودِ webui.py هم همین تفکیک را دارد
    (`exp_dir` در برابرِ `exp_dir1`)؛ از آنجا خوانده شده.

    ══ دامِ ۲: چرا `-m` و نه مسیرِ فایل (اجرای #۳۷) ══
    اجرای #۳۷ اینجا افتاد:

        train/preprocess.py → from train.dataset.slicer2 import Slicer
          → train/train.py → from train import utils
        ImportError: cannot import name 'utils' from partially
                     initialized module 'train' (circular import)

    «حلقهٔ دوّار» تشخیصِ پایتون است، نه علت. علت این است که با
    `python train/preprocess.py`، پوشهٔ `<root>/train` اولِ `sys.path`
    می‌نشیند — و در آن پوشه فایلی به نامِ `train.py` هست. پس نامِ `train`
    به آن **فایل** حل می‌شود، نه به **بستهٔ** `<root>/train/`. یعنی
    `PYTHONPATH` لازم بود ولی کافی نبود؛ خودش هم نمی‌توانست کافی باشد،
    چون مسئله چیزی است که پایتون **جلوترش** می‌گذارد.

    `python -m train.preprocess` هر دو را با هم حل می‌کند: پوشهٔ جاری
    (ریشه) روی مسیر می‌آید و پوشهٔ اسکریپت نمی‌آید، پس سایه‌ای نمی‌مانَد.
    `sys.argv` هم دست‌نخورده است، پس ترتیبِ آرگومان‌ها همان است.
    """
    logdir = "%s/logs/%s" % (root, exp)
    pre = "assets/" + PRETRAINED
    out = []

    # ۱) برش و نرمال‌سازی. آخری `per` است (طولِ هر برش به ثانیه).
    out.append(("preprocess", [
        py, "-m", "train.preprocess", dataset_dir, sr.replace("k", "000"),
        str(n_p), logdir, "False", "3.0"]))

    # ۲) زیروبمی. شکلِ CPU: mode exp_dir n_p f0method
    out.append(("extract_f0", [
        py, "-m", "train.dataset.extract_f0", "cpu", logdir, str(n_p), f0method]))

    # ۳) ویژگی‌های hubert. شکلِ CPU دقیقاً ۶ آرگومان بعد از نامِ اسکریپت
    #    است (`len(sys.argv) == 7`): device n_part i_part exp_dir version
    #    is_half. یکی کم یا زیاد، به شاخهٔ GPU می‌افتد و argv را غلط
    #    می‌خوانَد.
    dev = "cuda" if gpus else "cpu"
    out.append(("extract_feature", [
        py, "-m", "train.dataset.extract_hubert_feature", dev, "1", "0",
        logdir, version, "False"]))

    # ۴) آموزش. `-sw 1` مهم است: بدونش فقط چک‌پوینت‌های بزرگِ G_*.pth
    #    می‌مانَد و مدلِ کوچکِ قابلِ‌استفاده در assets/weights ساخته
    #    نمی‌شود — یعنی ساعت‌ها آموزش، و هیچ فایلی که بشود به کار برد.
    train = [py, "-m", "train.train", "-e", exp, "-sr", sr, "-f0", "1",
             "-bs", str(batch), "-te", str(epochs), "-se", str(save_every),
             "-pg", pre % ("G", sr), "-pd", pre % ("D", sr),
             # ══ `-l 1` یعنی فقط آخرین چک‌پوینت نگه داشته شود ══
             # وقتی پوشهٔ کار روی درایو باشد (تا اجرا بتواند از سرگرفته
             # شود)، نگه‌داشتنِ همهٔ چک‌پوینت‌ها یعنی چند گیگابایت نوشتن
             # روی درایو. برای از سرگیری فقط آخری لازم است.
             "-l", str(int(latest)), "-c", "0", "-sw", "1", "-v", version]
    # روی CPU پرچمِ `-g` اصلاً نباید بیاید — webui.py هم دو شاخهٔ جدا
    # دارد و بی‌GPU آن را حذف می‌کند، نه اینکه تهی بفرستد.
    if gpus:
        train += ["-g", gpus]
    out.append(("train", train))

    # ۵) ایندکسِ بازیابی (همان «Retrieval» در نامِ RVC).
    out.append(("train_index", [
        py, "-m", "train.train_index", exp, version, "assets/indices",
        str(n_p), "auto"]))
    return out



# ══ کارهایی که خودِ اسکریپت‌ها انجام نمی‌دهند ══
# WebUI پیش از هر قدم چیزهایی می‌سازد که اسکریپت‌ها فرض می‌کنند هست.
# اجرای #۳۸ دقیقاً همین‌جا افتاد:
#     FileNotFoundError: .../logs/smoke/preprocess.log
# اسکریپت لاگ را **باز** می‌کند ولی پوشه و فایلش را نمی‌سازد.
LOG_FILES = ("preprocess.log", "extract_f0_feature.log", "train_index.log",
             "train.log")


# پوشه‌هایی که WebUI هنگام بالا آمدن می‌سازد و اسکریپت‌ها فرض می‌کنند
# هستند. اجرای #۴۱ سرِ همین ایستاد و شکلش آموزنده است: هر پنج قدم کدِ
# صفر دادند و هیچ مدلی ساخته نشد، چون `savee` در مسیرِ **نسبیِ**
# `assets/weights/<name>.pth` می‌نویسد و آن پوشه نبود — و خودش استثنا را
# می‌بلعد و متنِ خطا را به‌عنوانِ **مقدارِ بازگشتی** برمی‌گرداند، که
# آموزش آن را «موفق» لاگ می‌کند. یعنی شکستی که هیچ کدِ خطایی ندارد.
RUNTIME_DIRS = ("assets/weights", "assets/indices", "assets/rmvpe",
                "assets/pretrained", "assets/pretrained_v2")


def preLog_(root, exp):
    """پوشه‌های اجرا و فایل‌های لاگِ خالی — پیش از هر قدمی."""
    import os as _os
    for rel in RUNTIME_DIRS:
        _os.makedirs(_os.path.join(root, *rel.split("/")), exist_ok=True)
    d = _os.path.join(root, "logs", exp)
    _os.makedirs(d, exist_ok=True)
    for nm in LOG_FILES:
        f = _os.path.join(d, nm)
        if not _os.path.exists(f):
            io.open(f, "w", encoding="utf-8").close()
    return d


def _stems(d, ext=None):
    """نگاشتِ نامِ پایه به نامِ واقعیِ فایل، فقط از فایل‌های درست.

    الگوی نام‌گذاری را حدس نمی‌زنیم (`x.npy`؟ `x.wav.npy`؟) — از روی
    آنچه واقعاً روی دیسک هست ساخته می‌شود. هم دقیق‌تر است، هم اگر آن‌ها
    فردا نام‌گذاری را عوض کنند نمی‌شکند.

    ══ چرا `ext` لازم شد (اجرای ۳ روی رانر) ══
    `setdefault` روی فهرستِ مرتب یعنی **هر فایلِ ناخوانده‌ای که زودتر
    مرتب شود، جای فایلِ درست را می‌گیرد** — و چون فقط یک ردیف عوض
    می‌شود، شمارشِ ردیف‌ها ثابت می‌ماند. اجرای ۲ و ۳ هر دو گزارش دادند
    `rows: 541, from_dataset: 541`؛ اجرای ۲ ده دور آموزش داد و اجرای ۳
    در هشت ثانیه با «File format b'\\x80\\x02\\x8a\\n' not understood»
    مُرد — که سرآیندِ یک فایلِ `.pth` است، نه WAV.

    یک شمارشِ درست، شاهدِ محتوای درست نیست. حالا هر پوشه فقط
    پسوندِ خودش را می‌پذیرد.
    """
    import os as _os
    out = {}
    if not _os.path.isdir(d):
        return out
    for fn in sorted(_os.listdir(d)):
        if ext and not fn.endswith(ext):
            continue
        out.setdefault(fn.split(".")[0], fn)
    return out


# ══ سرآیندِ هر ستون، برای وارسیِ فهرست ══
# ستونِ اول WAV است و بقیه `.npy`. هر کدام سرآیندِ خودش را دارد و
# چهار بایت خواندن جواب را قطعی می‌کند.
FILELIST_MAGIC = (b"RIFF", b"\x93NUM", b"\x93NUM", b"\x93NUM")


def filelistCheck_(root, exp, keep=True):
    """هر ردیفِ فهرست را با سرآیندِ واقعیِ فایل بسنج.

    ══ چرا پیش از آموزش، نه وسطش ══
    یک ردیفِ خراب پنج ساعت بعد و از عمقِ DataLoaderِ torch بیرون
    می‌زند، با ردِ خطایی که نامِ فایل در آن نیست. خواندنِ چهار بایت از
    ۵۴۱ فایل چند ثانیه است و جواب را همین‌جا می‌دهد.

    ردیف‌های خراب حذف می‌شوند نه اینکه کلِ کار بایستد — ولی اگر چیزی
    نماند، ایستادن درست‌ترین کار است.
    """
    import os as _os
    fp = _os.path.join(root, "logs", exp, "filelist.txt")
    if not _os.path.exists(fp):
        return {"rows": 0, "bad": [], "kept": 0}
    with io.open(fp, encoding="utf-8") as f:
        rows = [ln for ln in f.read().splitlines() if ln.strip()]
    good, bad = [], []
    for ln in rows:
        cols = ln.split("|")
        why = ""
        if len(cols) < 5:
            why = "ستون کم"
        else:
            for i in range(4):
                try:
                    with open(cols[i], "rb") as fh:
                        head = fh.read(4)
                except (IOError, OSError):
                    why = "نیست: %s" % cols[i]
                    break
                if head != FILELIST_MAGIC[i]:
                    why = "سرآیندِ ستونِ %d: %r (%s)" % (i + 1, head, cols[i])
                    break
        if why:
            bad.append(why)
        else:
            good.append(ln)
    if keep and bad and good:
        with io.open(fp, "w", encoding="utf-8") as f:
            f.write("\n".join(good))
    return {"rows": len(rows), "bad": bad[:5], "bad_count": len(bad),
            "kept": len(good)}


def preTrain_(root, exp, sr="40k", version="v2", spk=0):
    """`config.json` و `filelist.txt` — پس از استخراج، پیش از آموزش.

    ══ دو نکته که از خودِ webui.py خوانده شد ══
    ۱. برای نرخِ ۴۰k پیکربندی از پوشهٔ **v1** برداشته می‌شود، حتی وقتی
       نسخهٔ مدل v2 است. شرطشان صریح است و اگر برعکسش کنی، آموزش با
       ابعادِ ناجور شروع می‌شود.
    ۲. به فهرست، ردیف‌های «سکوت» از `logs/mute` اضافه می‌شود. همان‌هایی
       که از `mute.zip` آمدند — و اگر آن دانلود جا بیفتد، اینجا معلوم
       می‌شود نه وسطِ آموزش.
    """
    import json as _json
    import os as _os
    import random as _random
    import shutil as _shutil

    d = _os.path.join(root, "logs", exp)
    cfgDir = "v1" if (version == "v1" or sr == "40k") else "v2"
    srcCfg = _os.path.join(root, "configs", cfgDir, "%s.json" % sr)
    if not _os.path.exists(srcCfg):
        raise RuntimeError("پیکربندی پیدا نشد: %s" % srcCfg)
    dstCfg = _os.path.join(d, "config.json")
    if not _os.path.exists(dstCfg):
        _shutil.copyfile(srcCfg, dstCfg)

    feaDim = "3_feature256" if version == "v1" else "3_feature768"
    dirs = [_os.path.join(d, "0_gt_wavs"), _os.path.join(d, feaDim),
            _os.path.join(d, "2a_f0"), _os.path.join(d, "2b-f0nsf")]
    exts = [".wav", ".npy", ".npy", ".npy"]
    maps = [_stems(dirs[i], exts[i]) for i in range(4)]
    names = set(maps[0])
    for m in maps[1:]:
        names &= set(m)

    lines = []
    for nm in sorted(names):
        lines.append("|".join(
            [_os.path.join(dirs[i], maps[i][nm]) for i in range(4)]
            + [str(spk)]))

    mute = _os.path.join(root, "logs", "mute")
    mdirs = [_os.path.join(mute, "0_gt_wavs"), _os.path.join(mute, feaDim),
             _os.path.join(mute, "2a_f0"), _os.path.join(mute, "2b-f0nsf")]
    mmaps = [_stems(mdirs[i], exts[i]) for i in range(4)]
    mnames = set(mmaps[0])
    for m in mmaps[1:]:
        mnames &= set(m)
    for nm in sorted(mnames):
        lines.append("|".join(
            [_os.path.join(mdirs[i], mmaps[i][nm]) for i in range(4)]
            + [str(spk)]))

    _random.shuffle(lines)
    with io.open(_os.path.join(d, "filelist.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return {"config": cfgDir + "/%s.json" % sr, "rows": len(lines),
            "from_dataset": len(names), "from_mute": len(mnames)}


def outputs(exp, root):
    """جایی که محصولِ نهایی می‌نشیند — همان دو فایلی که باید برداری."""
    return {
        "model": "%s/assets/weights/%s.pth" % (root, exp),
        "index_dir": "%s/assets/indices" % root,
        "logs": "%s/logs/%s" % (root, exp),
    }
