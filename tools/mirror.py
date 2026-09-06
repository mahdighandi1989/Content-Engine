#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mirror.py — نسخهٔ پشتیبانِ همهٔ چیزهایی که مالِ ما نیستند ولی بی آن‌ها
صدای رضوی اجرا نمی‌شود.

══ مسئله ══

مدلِ صدا مالِ ماست: روی صدای خودِ او آموزش دیده و در درایو است. ولی
**اجرا**یش به سه چیزِ بیرونی بند است:

  ۱. بستهٔ `infer-rvc-python` از PyPI — نگه‌داریِ یک نفر.
  ۲. ContentVec و RMVPE از یک مخزنِ شخصیِ Hugging Face (`lj1995`).
  ۳. وزن‌های پایهٔ RVC، اگر روزی بخواهیم دوباره آموزش بدهیم.

هیچ‌کدام قرارداد یا تضمینی به ما نداده‌اند. اگر فردا پاک شوند، مدلِ ما
سالم است و اجرا نمی‌شود — و این بدترین شکلِ وابستگی است، چون تا روزی
که اتفاق بیفتد نامرئی است.

══ چه چیزی آینه می‌شود و چه چیزی عمداً نه ══

torch و خانواده‌اش (nvidia، triton) **دانلود می‌شوند تا کامل بودنِ
بقیه ثابت شود، ولی فرستاده نمی‌شوند**. دو دلیل: دو و نیم گیگابایت‌اند،
و شکنندهٔ این زنجیره نیستند — torch روی PyPI، روی pytorch.org، در conda
و در هر آینه‌ای هست. چیزی که یک نفر نگه می‌دارد شکننده است، نه چیزی که
نصفِ صنعت به آن بند است.

══ و چرا فقط «دانلود» بس نیست ══

انبوهی از فایل که کسی نداند چطور به کارشان ببرد، آینه نیست. پس:

  `pack`    — می‌آورد، اثرانگشت می‌گیرد، قفل می‌نویسد
  `verify`  — هر فایل را با قفل می‌سنجد (اندازه و SHA-256)
  `restore` — از همان پوشه نصب می‌کند، بی اینترنت

و خودِ `pack` در پایان نصبِ آفلاین را **امتحان می‌کند**؛ آینه‌ای که
آزموده نشده باشد، فقط یک آرزوست.
"""

import argparse
import hashlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rvcpipe as P                                    # noqa: E402

LOCK = "tools/mirror_lock.json"

# ══ خانواده‌ای که دانلود می‌شود ولی فرستاده نمی‌شود ══
HEAVY = ("torch", "torchaudio", "torchvision", "nvidia", "triton",
         "cusparselt")

# بسته‌هایی که **تبدیل** لازم دارد. آموزش فهرستِ خودش را دارد
# (`P.TRAIN_DEPS`) و در `pack --train` می‌آید.
INFER_PKGS = ["infer-rvc-python>=1.3.1,<2", "soundfile>=0.13.0,<1"]

# اگر روزی بسته‌ای فقط sdist داشته باشد، بی این‌ها ساخته نمی‌شود.
BUILD_PKGS = ["pip", "setuptools", "wheel"]


def sh_(cmd, **kw):
    print("$ " + " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=False, **kw)


def sha_(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def heavy_(name):
    """آیا این بسته از خانوادهٔ سنگین است.

    ══ چرا برابری و نه پیشوند ══
    `startswith("torch")` هم `torchcrepe` را می‌گیرد — بسته‌ای کوچک و
    دقیقاً از همان جنسِ شکننده‌ای که آینه برایش ساخته شده. یک حرفِ
    اضافه در یک شرط، و آن بسته بی‌صدا از آینه بیرون می‌ماند.
    """
    n = name.lower().replace("_", "-")
    return any(n == p or n.startswith(p + "-") for p in HEAVY)


def hfRev_(repo):
    """شمارهٔ کامیتِ واقعی، نه «main».

    «main» یک نشانگر است و فردا جای دیگری را نشان می‌دهد. قفلی که به
    نشانگر ببندد، چیزی را قفل نکرده.
    """
    try:
        from huggingface_hub import HfApi
        return str(HfApi().repo_info(repo).sha or "")
    except Exception as e:
        print("نسخهٔ مخزن گرفته نشد (%s): %s" % (repo, str(e)[:120]))
        return ""


def scan_(root):
    """هر فایل، با اندازه و اثرانگشت — مسیرها نسبت به ریشهٔ آینه."""
    out = []
    for base, _dirs, files in os.walk(root):
        for f in sorted(files):
            p = os.path.join(base, f)
            if os.path.islink(p):
                continue
            out.append({"path": os.path.relpath(p, root).replace(os.sep, "/"),
                        "bytes": os.path.getsize(p), "sha256": sha_(p)})
    out.sort(key=lambda r: r["path"])
    return out


def packWeights_(dest):
    """ContentVec و RMVPE — از همان منبعِ سنجیده‌شده، نه از آینهٔ شخصی."""
    os.makedirs(dest, exist_ok=True)
    for cmd in P.inferAssetCmds_(sys.executable, "hf", dest):
        r = sh_(cmd)
        if r.returncode != 0:
            raise SystemExit("دانلودِ دارایی شکست خورد: " + " ".join(cmd))
    return {"repo": P.HF_WEIGHTS, "revision": hfRev_(P.HF_WEIGHTS)}


def packWheels_(dest, groups, heavy=None):
    """بستهٔ چرخِ همهٔ وابستگی‌ها — و جدا کردنِ خانوادهٔ سنگین.

    ══ چرا گروه‌گروه و نه یک فراخوان ══
    فهرستِ تبدیل و فهرستِ آموزش پین‌های متفاوت دارند (آموزش
    `numpy<2` می‌خواهد، تبدیل بازتر است). یک `pip download` روی هر دو،
    آن‌ها را **با هم** حل می‌کند و سرِ اولین ناسازگاری می‌افتد — یعنی
    آینهٔ تبدیل به‌خاطرِ نیازِ آموزش ساخته نمی‌شود، در حالی که این دو
    هیچ‌وقت با هم نصب نمی‌شوند.

    خانوادهٔ سنگین **دانلود می‌شود** (کنارِ آینه، نه داخلش) تا آزمونِ
    نصبِ آفلاین بتواند کامل بودنِ بقیه را ثابت کند.
    """
    # ══ «کنارِ آینه» یعنی بیرونِ آن، نه یک پوشه پایین‌تر ══
    # نسخهٔ اول `dest + "-heavy"` می‌ساخت، و `dest` خودش
    # `mirror/wheels` بود — پس خانوادهٔ سنگین در `mirror/wheels-heavy`
    # می‌نشست، یعنی **داخلِ** همان پوشه‌ای که بالا می‌رود. نتیجه:
    # ۳۶۲۵ مگابایت فرستاده شد که ۲۸۶۱ مگابایتش دقیقاً همان چیزی بود
    # که نوشته بودیم نمی‌فرستیم. متن درست بود و مسیر غلط.
    heavy = heavy or (os.path.abspath(dest).rstrip(os.sep) + "-heavy")
    os.makedirs(dest, exist_ok=True)
    os.makedirs(heavy, exist_ok=True)
    for g in groups:
        if not g:
            continue
        # ══ `pip wheel` و نه `pip download` ══
        # اجرای اولِ همین گردش‌کار سرِ همین افتاد: `pyworld` فقط
        # **sdist** دارد، و نصبِ یک sdist یعنی ساختنش، و ساختن به
        # وابستگی‌های زمانِ ساخت (`wheel`، `setuptools`، `Cython`)
        # نیاز دارد که `pip download` هرگز نمی‌آوردشان. یعنی آینه‌ای
        # داشتیم که روی ماشینِ آفلاین نصب نمی‌شد — و فقط چون آزمونش
        # را گذاشته بودیم معلوم شد.
        #
        # `pip wheel` همان‌جا می‌سازدشان و همه‌چیز به چرخِ باینری
        # تبدیل می‌شود. هزینه‌اش این است که چرخ‌ها برای **همین
        # سکو** (cp311/manylinux x86_64) ساخته می‌شوند — همان جایی
        # که بازیابی هم انجام می‌شود.
        r = sh_([sys.executable, "-m", "pip", "wheel",
                 "--wheel-dir", dest] + list(g))
        if r.returncode != 0:
            raise SystemExit("pip wheel شکست خورد: " + " ".join(g))
    moved = []
    for f in sorted(os.listdir(dest)):
        if heavy_(f.split("-")[0]):
            shutil.move(os.path.join(dest, f), os.path.join(heavy, f))
            moved.append(f)
    return {"excluded": moved, "excluded_dir": heavy}


def restore_(root, pkgs, extra=None, py=None):
    """نصب از خودِ آینه، بی اینترنت."""
    args = [py or sys.executable, "-m", "pip", "install", "--no-index",
            "--find-links", os.path.join(root, "wheels")]
    for d in (extra or []):
        args += ["--find-links", d]
    return sh_(args + list(pkgs)).returncode


def probeVenv_(root, pkgs, extra=None):
    """نصبِ آفلاین در یک محیطِ **تازه** — نه در پایتونی که خودمان آلوده‌اش کرده‌ایم.

    ══ سوراخی که نزدیک بود از دستم برود ══
    نسخهٔ اول در همان پایتونِ کار نصب می‌کرد، جایی که `huggingface_hub`
    و چند بستهٔ دیگر از قدم‌های قبلی **از پیش نصب بودند**. یعنی اگر
    یکی از آن‌ها در آینه نمی‌بود، آزمون باز هم سبز می‌شد. آزمونی که
    محیطش را از قبل آماده کرده باشد، چیزی را ثابت نمی‌کند.
    """
    import venv
    d = tempfile.mkdtemp(prefix="probe-")
    venv.EnvBuilder(with_pip=True).create(d)
    py = os.path.join(d, "bin", "python")
    if not os.path.exists(py):
        py = os.path.join(d, "Scripts", "python.exe")
    return restore_(root, pkgs, extra=extra, py=py)


def cmd_pack(a):
    root = a.out
    if os.path.isdir(root):
        shutil.rmtree(root)
    os.makedirs(root)
    lock = {"tool": "tools/mirror.py", "why": "وابستگی‌های بیرونیِ اجرای صدا"}

    print("\n── وزن‌ها ──")
    lock["weights"] = packWeights_(os.path.join(root, "assets"))

    print("\n── چرخ‌ها ──")
    groups = [list(INFER_PKGS), list(BUILD_PKGS)]
    if a.train:
        groups.append(list(P.TRAIN_DEPS))
    lock["packages"] = {"infer": list(INFER_PKGS),
                        "train": list(P.TRAIN_DEPS) if a.train else []}
    # پوشهٔ سنگین **خواهرِ** ریشهٔ آینه است، نه فرزندش: هرچه زیرِ
    # `root` باشد در بایگانی می‌رود و در قفل می‌نشیند.
    lock["wheels"] = packWheels_(
        os.path.join(root, "wheels"), groups,
        heavy=os.path.abspath(root).rstrip(os.sep) + "-heavy")

    print("\n── آزمونِ نصبِ آفلاین ──")
    # ══ آینه‌ای که آزموده نشده، آرزوست ══
    # اینجا معلوم می‌شود بستهٔ چرخ واقعاً بسته است یا نه: نصب بی
    # اینترنت، فقط از همین پوشه (به‌علاوهٔ خانوادهٔ سنگین که عمداً
    # فرستاده نمی‌شود ولی روی PyPI همیشه هست).
    code = probeVenv_(root,
                      [p.split(">=")[0].split("==")[0] for p in INFER_PKGS],
                      extra=[lock["wheels"]["excluded_dir"]])
    lock["offline_install_ok"] = (code == 0)

    lock["files"] = scan_(root)
    lock["total_bytes"] = sum(f["bytes"] for f in lock["files"])
    # ══ ادعا باید سنجیده شود، نه نوشته ══
    # «خانوادهٔ سنگین فرستاده نمی‌شود» یک جمله در توضیح بود و یک بار
    # هم غلط از آب درآمد. حالا شرط است.
    stray = [f["path"] for f in lock["files"]
             if heavy_(os.path.basename(f["path"]).split("-")[0])]
    if stray:
        raise SystemExit("خانوادهٔ سنگین داخلِ آینه ماند: %s"
                         % ", ".join(stray[:5]))
    io.open(os.path.join(root, "mirror_lock.json"), "w",
            encoding="utf-8").write(
        json.dumps(lock, ensure_ascii=False, indent=1) + "\n")
    io.open(LOCK, "w", encoding="utf-8").write(
        json.dumps(lock, ensure_ascii=False, indent=1) + "\n")
    print("\nآینه: %d فایل · %.1f مگابایت · نصبِ آفلاین: %s"
          % (len(lock["files"]), lock["total_bytes"] / 1048576.0,
             "بله" if lock["offline_install_ok"] else "**نه**"))
    if not lock["offline_install_ok"]:
        raise SystemExit("نصبِ آفلاین شکست خورد — آینه ناقص است")
    return 0


def cmd_verify(a):
    """هر فایل در برابرِ قفل. یک بایت هم فرق کند، می‌گوید."""
    lk = json.loads(io.open(a.lock or LOCK, encoding="utf-8").read())
    bad, miss = [], []
    for f in lk.get("files", []):
        p = os.path.join(a.dir, f["path"])
        if not os.path.exists(p):
            miss.append(f["path"]); continue
        if os.path.getsize(p) != f["bytes"] or sha_(p) != f["sha256"]:
            bad.append(f["path"])
    print("سالم: %d · گم: %d · خراب: %d"
          % (len(lk.get("files", [])) - len(bad) - len(miss),
             len(miss), len(bad)))
    for x in (miss + bad)[:20]:
        print("  ✗ " + x)
    return 1 if (bad or miss) else 0


def cmd_restore(a):
    code = restore_(a.dir, [p.split(">=")[0].split("==")[0]
                            for p in INFER_PKGS])
    if code != 0:
        print("نصب از آینه شکست خورد. اگر خطا دربارهٔ torch است، همان "
              "یکی عمداً در آینه نیست: از PyPI یا pytorch.org بیاورش.")
        return code
    paths = P.inferAssetPaths_(os.path.join(a.dir, "assets"))
    print("نصب شد. مسیرِ دارایی‌ها:")
    print(json.dumps(paths, ensure_ascii=False, indent=1))
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p1 = sub.add_parser("pack", help="بیاور، اثرانگشت بگیر، قفل بنویس")
    p1.add_argument("--out", default="mirror")
    p1.add_argument("--train", action="store_true",
                    help="وابستگی‌های آموزشِ دوباره را هم بردار")
    p1.set_defaults(fn=cmd_pack)
    p2 = sub.add_parser("verify", help="آینه را با قفل بسنج")
    p2.add_argument("dir")
    p2.add_argument("--lock", default="")
    p2.set_defaults(fn=cmd_verify)
    p3 = sub.add_parser("restore", help="از آینه نصب کن، بی اینترنت")
    p3.add_argument("dir")
    p3.set_defaults(fn=cmd_restore)
    a = ap.parse_args()
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
