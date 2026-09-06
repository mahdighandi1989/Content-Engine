#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voicetrain.py — آموزشِ RVC روی رانرِ گیت‌هاب: تکه‌تکه، و از سرگرفتنی.

══ چرا این فایل هست ══

Colab به مرورگرِ بازِ کاربر وابسته است و اتصالِ او هر چند دقیقه می‌افتاد.
Kaggle چهار بار «Canceled by backend. Exit code: 137» داد، هر بار در نقطهٔ
دیگری — بعد از وزن‌ها، سرِ دانلود، سرِ ساختِ دیتاست، وسطِ pip — و هر
فرضیه‌ای که ساختیم با عدد رد شد: رم ۰٫۴ تا ۲٫۴ گیگ از ۳۰، دیسک همیشه
بیش از ۱۹ گیگ آزاد، پوشهٔ خروجی در آخرین اجرا یک فایلِ صفر مگابایتی.
یعنی هیچ‌کدام از آن‌ها را کدِ ما نکُشت.

وقتی چهار بار پشتِ سرِ هم روی سکویی شکست خوردی و هیچ شاهدی هم به تو
نمی‌دهد، مسئله دیگر «فرضیهٔ بعدی» نیست؛ مسئله این است که ماشین دستِ تو
نیست. رانرِ گیت‌هاب هست: لاگِ کامل، خروجِ مشخص، و هیچ‌کس وسطِ کار
کنسلش نمی‌کند.

══ بهایش ══

رانر GPU ندارد. آموزش روی CPU همان کار را می‌کند و کندتر — ولی چون
هیچ‌کس پای آن ننشسته، کندی فقط یعنی «فردا به‌جای امشب». `train.py` روی
CPU اجرا می‌شود (backend روی gloo می‌افتد و هر فراخوانِ cuda پشتِ
`is_available()` است)؛ اجرای #۴۴ همین را ثابت کرد.

══ چطور تکه‌تکه ══

سقفِ هر job شش ساعت است. پس هر اجرا **بودجه** دارد: هر قدم فقط تا
پایانِ بودجه اجازهٔ کار دارد و بعد با آرامی متوقف می‌شود تا کش ذخیره
شود. RVC خودش از تازه‌ترین چک‌پوینت ادامه می‌دهد
(`utils.latest_checkpoint_path` در `train.py`)، پس اجرای بعدی از همان‌جا
راه می‌افتد. کشته‌شدنِ ناگهانی همان و ذخیره‌نشدنِ کش همان — برای همین
مهلت را خودمان می‌گذاریم، نه اینکه منتظرِ تبرِ گیت‌هاب بمانیم.

══ چه چیزی در کش می‌ماند ══

`logs/` (ویژگی‌های استخراج‌شده و چک‌پوینت‌ها)، `assets/` (وزن‌های پایه و
مدلِ نهایی) و `dataset/` (تکه‌های تمیز). کلونِ RVC در کش نیست: چند ثانیه
است و `.git` دارد.
"""

import io
import os
import glob
import json
import time
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

VOICE = os.environ.get("VT_VOICE", "razavi")
SR = os.environ.get("VT_SR", "40k")
EPOCHS = int(os.environ.get("VT_EPOCHS", "60"))
BATCH = int(os.environ.get("VT_BATCH", "8"))
SAVE_EVERY = int(os.environ.get("VT_SAVE_EVERY", "5"))
BUDGET = float(os.environ.get("VT_BUDGET_MIN", "290")) * 60.0

# ══ چهار ضبطِ بهروز رضوی ══
# پوشهٔ «TEST» در درایو. اشتراکشان باید «هر کسی با لینک» بماند —
# رانر با هویتِ هیچ‌کس وارد نمی‌شود.
#   D1736591T18498032(Web).mp3 · D1736592T10213625(Web).mp3
#   D1736591T18630070(Web).mp3 · D1738956T14935309(Web).mp3
DRIVE_IDS = [
    "1YRI2p7Qv3hh2dcNPMZDmbNUel0XCYWKX",
    "1cBUasKKB2Q5JjLfpZfyjBC7ZNo72KAiD",
    "1izlhA9PRU0VWcmL-Gw7lFaW2LJ3nLUKv",
    "1QdJzUi8sk5LhuUqjHeCi9Kb4UgRYq4P5",
]

T0 = time.time()


def left_():
    """چند ثانیه از بودجه مانده."""
    return BUDGET - (time.time() - T0)


def say_(msg):
    print("[%5.0f ثانیه · %4.0f دقیقه مانده] %s"
          % (time.time() - T0, left_() / 60.0, msg), flush=True)


def run_(cmd, cwd=None, env=None, budget=None):
    """اجرا با مهلت — و توقفِ آرام، نه کشته‌شدنِ ناگهانی.

    اگر بودجه تمام شود، SIGTERM می‌فرستیم و ده ثانیه فرصت می‌دهیم.
    نکتهٔ اصلی این نیست که فرایند تمیز بمیرد؛ این است که **ما**
    برگردیم تا کش ذخیره شود. یک قدمِ نیمه‌تمام با چک‌پوینتِ ذخیره‌شده
    از یک قدمِ نیمه‌تمامِ گم‌شده بی‌نهایت بهتر است.

    برمی‌گرداند: (کدِ خروج، آیا مهلت تمام شد)
    """
    b = left_() if budget is None else min(budget, left_())
    if b <= 0:
        return 124, True
    p = subprocess.Popen(cmd, cwd=cwd, env=env)
    try:
        return p.wait(timeout=b), False
    except subprocess.TimeoutExpired:
        p.terminate()
        try:
            p.wait(timeout=10)
        except subprocess.TimeoutExpired:
            p.kill()
            p.wait()
        return 124, True


def pip_(pkgs):
    code, _to = run_([sys.executable, "-m", "pip", "install", "-q"] + pkgs)
    if code:
        raise SystemExit("نصبِ وابستگی‌ها شکست خورد (کد %d)" % code)


def steps_done_(root):
    """تازه‌ترین گامِ آموزش، از نامِ چک‌پوینت‌ها.

    `train.py` چک‌پوینت را `G_<step>.pth` می‌نامد و خودش تازه‌ترین را
    پیدا می‌کند. پس همین‌جا هم پیشرفت را از نام می‌خوانیم، نه از یک
    فایلِ وضعیتِ جداگانه که می‌تواند با واقعیت فرق کند.
    """
    best = 0
    for p in glob.glob(os.path.join(root, "logs", VOICE, "G_*.pth")):
        nm = os.path.basename(p)[2:-4]
        if nm.isdigit():
            best = max(best, int(nm))
    return best


def _newest_(root):
    """تازه‌ترین زمانِ نوشتنِ چک‌پوینت — شاهدِ اینکه آموزش واقعاً جلو رفت."""
    best = 0.0
    for p in glob.glob(os.path.join(root, "logs", VOICE, "*.pth")):
        try:
            best = max(best, os.path.getmtime(p))
        except OSError:
            pass
    return best


def main():
    work = os.environ.get("VT_WORK") or os.path.expanduser("~/rvcwork")
    root = os.environ.get("VT_ROOT") or os.path.join(
        os.environ.get("RUNNER_TEMP", "/tmp"), "rvc")
    out = os.environ.get("VT_OUT") or os.path.join(work, "out")
    for d in (work, out, os.path.join(work, "logs"),
              os.path.join(work, "assets"), os.path.join(work, "dataset")):
        os.makedirs(d, exist_ok=True)

    # ── کد ──
    if not os.path.isdir(root):
        code, _ = run_(["git", "clone", "--depth", "1", "-q",
                        "https://github.com/RVC-Project/"
                        "Retrieval-based-Voice-Conversion-WebUI", root])
        if code:
            raise SystemExit("کلونِ RVC شکست خورد")
    # ══ کارِ ماندگار بیرون از کلون است ══
    # کلون هر اجرا تازه ساخته می‌شود؛ چیزی که باید بماند در `work`
    # است و با پیوند سرِ جایش می‌نشیند. همان کاری که نسخهٔ Colab با
    # درایو می‌کند.
    for nm in ("logs", "assets"):
        tgt = os.path.join(root, nm)
        if os.path.islink(tgt):
            continue
        if os.path.isdir(tgt):
            for f in os.listdir(tgt):
                dst = os.path.join(work, nm, f)
                if not os.path.exists(dst):
                    shutil.move(os.path.join(tgt, f), dst)
            shutil.rmtree(tgt)
        os.symlink(os.path.join(work, nm), tgt)

    import rvcpipe as P
    import dsprep as D

    o = P.outputs(VOICE, root)
    # ══ «مدل هست» یعنی «برای چند دور هست» ══
    # وجودِ فایل به‌تنهایی شرطِ درستی نیست: اگر کسی بعداً ۱۲۰ دور
    # بخواهد، این شرط او را در چند ثانیه با «از پیش ساخته شده»
    # برمی‌گرداند و هیچ دورِ تازه‌ای آموزش نمی‌بیند — بی هیچ خطایی.
    # به کاربر گفته شده «ادامه دادن رایگان است»؛ قولی که کد نگه ندارد،
    # قول نیست. پس هدفِ همان ساخت را از `state.json` می‌خوانیم و فقط
    # وقتی می‌ایستیم که به آن رسیده باشیم. نبودِ آن فایل یعنی
    # نمی‌دانیم، و «نمی‌دانم» باید به آموزش ختم شود نه به سکوت.
    if os.path.exists(o["model"]):
        at = 0
        try:
            st = json.loads(io.open(os.path.join(out, "state.json"),
                                    encoding="utf-8").read())
            at = int(st.get("epochs_target") or 0)
        except (IOError, OSError, ValueError, TypeError):
            pass
        if at >= EPOCHS:
            say_("مدل از پیش برای %d دور ساخته شده: %s" % (at, o["model"]))
            return finish_(P, root, out)
        say_("مدل برای %d دور هست و حالا %d خواسته شده — ادامه می‌دهیم"
             % (at, EPOCHS))

    # ── وابستگی‌ها ──
    say_("نصبِ وابستگی‌ها")
    pip_(["torch", "torchaudio", "--index-url",
          "https://download.pytorch.org/whl/cpu"])
    pip_(P.TRAIN_DEPS + D.DS_DEPS + ["gdown"])

    # ── وزن‌های پایه ──
    # ══ «دارایی‌ها هستند» یعنی هر دوتاشان ══
    # آخرین فرمانِ این دسته `mute.zip` را در `logs` باز می‌کند، و
    # `preTrain_` بدونِ آن ردیف‌های mute را ندارد. اگر شرطِ پرش فقط
    # وزن‌ها را ببیند، اجرایی که کشش نیمه‌کاره مانده این قدم را رد
    # می‌کند و کمبود سه قدم بعد و با نامی دیگر ظاهر می‌شود.
    have = (os.path.exists(os.path.join(root, "assets", "hubert_base",
                                        "pytorch_model.bin"))
            and os.path.isdir(os.path.join(root, "logs", "mute",
                                           "0_gt_wavs")))
    if not have:
        say_("وزن‌های پایه")
        hf = shutil.which("hf") or shutil.which("huggingface-cli") or "hf"
        for cmd in P.assetCmds_(py=sys.executable, sr=SR, hf=hf):
            if cmd[:3] == [sys.executable, "-m", "pip"]:
                continue
            if cmd[0] in ("hf", "huggingface-cli"):
                cmd[0] = hf
            code, _ = run_(cmd, cwd=root)
            if code:
                raise SystemExit("دانلودِ دارایی شکست خورد: %s" % cmd[:3])
    else:
        say_("وزن‌های پایه از پیش هستند")

    # ── دیتاست ──
    ds = os.path.join(work, "dataset")
    if [f for f in os.listdir(ds) if f.endswith(".wav")]:
        say_("دیتاست از پیش آماده است: %d تکه"
             % len([f for f in os.listdir(ds) if f.endswith(".wav")]))
    else:
        import gdown
        raw = os.path.join(work, "raw")
        os.makedirs(raw, exist_ok=True)
        srcs = []
        for i, fid in enumerate(DRIVE_IDS):
            dst = os.path.join(raw, "in%d" % (i + 1))
            if not (os.path.exists(dst) and os.path.getsize(dst) > 100000):
                say_("دانلودِ %d از %d" % (i + 1, len(DRIVE_IDS)))
                gdown.download(id=fid, output=dst, quiet=True)
            if os.path.exists(dst) and os.path.getsize(dst) > 100000:
                srcs.append(dst)
            else:
                say_("نیامد (اشتراکِ لینک؟): %s" % fid)
        if not srcs:
            raise SystemExit("هیچ ضبطی نیامد — اشتراکِ فایل‌ها باید "
                             "«هر کسی با لینک» باشد")
        say_("ساختِ دیتاست از %d ضبط" % len(srcs))
        segs, rep = D.buildDataset_(
            srcs, ds, sampleDir=out,
            onFile=lambda rows: say_("  %s → %d تکه"
                                     % (rows[-1]["file"][:28],
                                        rows[-1].get("segments", 0))))
        io.open(os.path.join(out, "dataset-report.json"), "w",
                encoding="utf-8").write(
            json.dumps(rep, ensure_ascii=False, indent=1))
        say_(rep["line"])
        if not segs:
            raise SystemExit("هیچ تکه‌ای نماند")

    # ── زنجیره ──
    P.preLog_(root, VOICE)
    env = P.env(root)
    chain = P.steps(VOICE, ds, root, sr=SR, f0method="rmvpe", epochs=EPOCHS,
                    save_every=SAVE_EVERY, version="v2", gpus="", n_p=2,
                    batch=BATCH, py=sys.executable, latest=1)
    feat = os.path.join(root, "logs", VOICE, "3_feature768")
    for nm, cmd in chain:
        if nm in ("preprocess", "extract_f0", "extract_feature") \
                and os.path.isdir(feat) and os.listdir(feat):
            say_("%s: از پیش انجام شده" % nm)
            continue
        if nm == "train_index" and not os.path.exists(o["model"]):
            say_("ایندکس نمی‌سازیم تا آموزش تمام شود")
            break
        if nm == "train":
            info = P.preTrain_(root, VOICE, sr=SR, version="v2")
            say_("فهرستِ آموزش: %s" % info)
            if not info["from_dataset"]:
                raise SystemExit("فهرست خالی است — استخراج چیزی نساخت")
            # ══ ردیف‌ها را پیش از پنج ساعت آموزش بسنج ══
            # اجرای ۳ بعدِ هشت ثانیه از عمقِ DataLoaderِ torch مُرد، با
            # خطایی که نامِ فایلِ خراب در آن نبود. چهار بایت از هر فایل
            # چند ثانیه است و جواب را همین‌جا می‌دهد.
            chk = P.filelistCheck_(root, VOICE)
            if chk.get("bad_count"):
                say_("%d ردیفِ خراب کنار گذاشته شد؛ نمونه: %s"
                     % (chk["bad_count"], " · ".join(chk["bad"])))
            if chk["kept"] < 50:
                raise SystemExit(
                    "فهرست پس از وارسی خالی شد (%d از %d سالم)"
                    % (chk["kept"], chk["rows"]))
            say_("فهرستِ سالم: %d ردیف" % chk["kept"])
            say_("آموزش از گامِ %d، هدف %d دور" % (steps_done_(root), EPOCHS))
            before = _newest_(root)
        if left_() <= 60:
            say_("بودجه تمام شد؛ «%s» به اجرای بعدی می‌ماند" % nm)
            break
        t0 = time.time()
        say_("=== %s ===" % nm)
        code, timedout = run_(cmd, cwd=root, env=env)
        say_("%s: %ds%s" % (nm, time.time() - t0,
                            " (مهلت تمام شد)" if timedout else ""))
        if code and not timedout:
            raise SystemExit("قدمِ «%s» شکست خورد (کد %d)" % (nm, code))
        # ══ کدِ صفر شاهدِ کار نیست ══
        # `train.py` کارِ اصلی را در یک Process جدا انجام می‌دهد. وقتی
        # آن بچه می‌میرد، پدر با کدِ **صفر** برمی‌گردد — اجرای ۳ همین‌طور
        # «موفق» ثبت شد در حالی که هشت ثانیه بعدِ شروع مرده بود. همان
        # شکلی که این مخزن قبلاً در `savee` دیده بود: خروجیِ موفق، بی
        # هیچ فایلی. پس شاهد را از دیسک می‌خواهیم، نه از کدِ خروج.
        if nm == "train" and not timedout and _newest_(root) <= before:
            raise SystemExit(
                "آموزش با کدِ صفر برگشت ولی هیچ چک‌پوینتِ تازه‌ای نساخت "
                "— یعنی داخلش شکست خورده. لاگِ بالا را ببینید.")
        if timedout:
            break

    return finish_(P, root, out)


def finish_(P, root, out):
    """چه ساخته شد، و آیا کار تمام است."""
    o = P.outputs(VOICE, root)
    done = os.path.exists(o["model"])
    made = []
    if done:
        made.append(shutil.copy(o["model"], out))
        for f in sorted(os.listdir(o["index_dir"])):
            if f.endswith(".index"):
                made.append(shutil.copy(os.path.join(o["index_dir"], f), out))
    st = {"voice": VOICE, "epochs_target": EPOCHS, "done": done,
          "steps": steps_done_(root), "files": [os.path.basename(m)
                                                for m in made]}
    io.open(os.path.join(out, "state.json"), "w", encoding="utf-8").write(
        json.dumps(st, ensure_ascii=False, indent=1))
    # ══ یک خط، آخرِ همه ══
    # لاگِ یک joب هزار خط است؛ چیزی که تصمیم به آن بسته است باید
    # آخرین چیزی باشد که چشم می‌بیند.
    if done:
        say_("تمام شد ✔ — %s" % ", ".join(st["files"]))
    else:
        say_("هنوز تمام نشده — گامِ %d؛ اجرای بعدی از همین‌جا ادامه می‌دهد"
             % st["steps"])
    ghout = os.environ.get("GITHUB_OUTPUT")
    if ghout:
        io.open(ghout, "a", encoding="utf-8").write(
            "done=%s\n" % ("true" if done else "false"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
