#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""voicebridge.py — نیمهٔ بیرونیِ «پلِ رنگِ صدا» (بخشِ ۳۶).

══ تقسیمِ کار ══
موتور صف را در `_VOICE-RENDER.json` می‌نویسد و فایل‌ها را موقتاً «هرکس با
لینک» می‌کند. این‌جا: بردار، بچسبان، تبدیل کن، به‌عنوانِ release asset بالا
بگذار، و نشانی را در `docs/voice-renders.json` بنویس. موتور برمی‌دارد و
اشتراک را پس می‌گیرد.

══ چرا release asset و نه artifact ══
artifact سی روز بعد می‌میرد و از بیرونِ Actions هم دانلود نمی‌شود (لینکش
به blob storage می‌رود). همان انتخابی که `tools/render.js` برای ویدئو کرد
و ۱۸۰ بار جواب داده.

══ و چرا یک قسمت در هر اجرا ══
تبدیل بلادرنگ نیست: `realtime_factor` ۱٫۱ تا ۱٫۴، یعنی قسمتِ نوزده‌دقیقه‌ای
~۲۰ تا ۲۵ دقیقه. دو تا در یک job یعنی نزدیک شدن به سقفِ زمانی، و jobی که
سرِ سقف کشته شود هیچ خروجی‌ای نمی‌دهد — نه حتی برای آن یکی که تمام شده بود.
"""

import io
import json
import os
import subprocess
import sys
import urllib.request

REPO = os.environ.get("GITHUB_REPOSITORY", "")
TAG = os.environ.get("VBR_RELEASE_TAG", "voice-bridge")
MAP = "docs/voice-renders.json"


def say(m):
    sys.stdout.write(str(m) + "\n")
    sys.stdout.flush()


def gh(args):
    """فراخوانِ API با توکنِ خودِ اجرا."""
    tok = os.environ.get("GH_TOKEN", "")
    base = ["curl", "-sS", "--fail-with-body",
            "-H", "Authorization: Bearer " + tok,
            "-H", "Accept: application/vnd.github+json"]
    return subprocess.check_output(base + args).decode("utf-8")


def fetchQueue(fid):
    """صف را از درایو بردار.

    ⚠ درایو برای فایلی که «هرکس با لینک» نباشد **HTML** برمی‌گرداند، نه
    خطای ۴۰۳ — همان تله‌ای که صفِ گویندگان چهار اجرا در آن افتاد (۷٫۳۳).
    پس شکستِ JSON اینجا تقریباً همیشه یعنی «اشتراک باز نیست».
    """
    url = ("https://drive.usercontent.google.com/download?id=%s&export=download"
           % fid)
    try:
        with urllib.request.urlopen(url, timeout=120) as r:
            raw = r.read()
    except Exception as e:
        say("::error::صفِ پل برداشته نشد: %s" % e)
        return None
    if raw[:200].lstrip()[:1] in (b"<",):
        say("::error title=صف خوانده نشد::درایو به‌جای JSON یک صفحهٔ HTML داد. "
            "یعنی فایل «هر کسی با لینک» نیست. موتور شبانه اشتراکش را باز "
            "می‌کند؛ اگر این پیام ماند، VBR_QUEUE_ID را وارسی کن.")
        return None
    try:
        doc = json.loads(raw.decode("utf-8-sig"))
    except Exception as e:
        say("::error::صفِ پل JSON نبود: %s" % e)
        return None
    if not isinstance(doc, dict):
        say("::error::صفِ پل باید یک شیء باشد، %s رسید." % type(doc).__name__)
        return None
    return doc


def grab(url, dst):
    """یک فایل را بردار — و **بایت‌هایش** را باور کن، نه نامش."""
    try:
        with urllib.request.urlopen(str(url), timeout=600) as r:
            data = r.read()
    except Exception as e:
        say("  ✗ برداشته نشد: %s" % e)
        return False
    if len(data) < 1000 or data[:200].lstrip()[:1] in (b"<",):
        say("  ✗ چیزی که رسید فایل نبود (%d بایت)" % len(data))
        return False
    io.open(dst, "wb").write(data)
    return True


def loadMap():
    if os.path.isfile(MAP):
        try:
            d = json.load(io.open(MAP, encoding="utf-8"))
            if isinstance(d, dict) and isinstance(d.get("items"), dict):
                return d
        except Exception:
            pass
    return {"rev": 0, "items": {}}


def saveMap(d):
    d["rev"] = int(d.get("rev") or 0) + 1
    d["at"] = __import__("datetime").datetime.utcnow().strftime(
        "%Y-%m-%dT%H:%M:%SZ")
    d["note"] = ("خروجیِ پلِ رنگِ صدا. گردش‌کارِ voice-bridge می‌نویسد و موتور "
                 "(بخشِ ۳۶) از gitHub raw می‌خوانَد. دست‌نویس نکنید.")
    os.makedirs(os.path.dirname(MAP), exist_ok=True)
    io.open(MAP, "w", encoding="utf-8").write(
        json.dumps(d, ensure_ascii=False, indent=1) + "\n")


def ensureRelease():
    try:
        return json.loads(gh(["https://api.github.com/repos/%s/releases/tags/%s"
                              % (REPO, TAG)]))
    except Exception:
        pass
    body = json.dumps({"tag_name": TAG, "name": "voice bridge output",
                       "body": "خروجیِ تبدیلِ صدا — ساختهٔ گردش‌کار، نه دست.",
                       "draft": False, "prerelease": True})
    return json.loads(gh(["-X", "POST",
                          "https://api.github.com/repos/%s/releases" % REPO,
                          "-d", body]))


def uploadAsset(rel, path, name):
    """فایل را بالا بگذار. هم‌نامِ قبلی اول پاک می‌شود، وگرنه ۴۲۲ می‌دهد."""
    for a in (rel.get("assets") or []):
        if a.get("name") == name:
            try:
                gh(["-X", "DELETE",
                    "https://api.github.com/repos/%s/releases/assets/%s"
                    % (REPO, a["id"])])
            except Exception:
                pass
    out = gh(["-X", "POST",
              "-H", "Content-Type: application/octet-stream",
              "--data-binary", "@" + path,
              "https://uploads.github.com/repos/%s/releases/%s/assets?name=%s"
              % (REPO, rel["id"], name)])
    return json.loads(out).get("browser_download_url", "")


def joinWavs(paths, dst):
    """چند بخش را به یک فایل بچسبان — با ffmpeg، چون بخش‌ها ممکن است
    نرخ و کانالِ یکسان نداشته باشند و چسباندنِ خامِ بایت‌ها سکوت می‌دهد."""
    if len(paths) == 1:
        subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error",
                               "-i", paths[0], "-ac", "1", "-ar", "40000", dst])
        return
    lst = dst + ".txt"
    io.open(lst, "w", encoding="utf-8").write(
        "".join("file '%s'\n" % os.path.abspath(p) for p in paths))
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error",
                           "-f", "concat", "-safe", "0", "-i", lst,
                           "-ac", "1", "-ar", "40000", dst])


def wavSeconds(path):
    """طولِ فایل، از هدرِ خودش. کتابخانهٔ استاندارد، بی وابستگیِ تازه."""
    try:
        import wave
        w = wave.open(path, "rb")
        try:
            n, fr = w.getnframes(), w.getframerate()
        finally:
            w.close()
        return (float(n) / float(fr)) if fr else 0.0
    except Exception:
        return 0.0


def main():
    fid = os.environ.get("VBR_QUEUE_ID", "").strip()
    if not fid:
        say("::error::VBR_QUEUE_ID تنظیم نشده.")
        return 1
    q = fetchQueue(fid)
    if q is None:
        return 1
    # «هرگز نوشته نشده» ≠ «نوشته شد و خالی بود» — همان درسِ ۷٫۳۳.
    if int(q.get("rev") or 0) < 1:
        say("::error title=صف هنوز نوشته نشده::فایلِ صف خوانده شد ولی موتور "
            "هرگز رویش ننوشته (rev %s)." % q.get("rev"))
        return 1

    mp = loadMap()
    todo = [it for it in (q.get("items") or [])
            if str(it.get("status") or "") == "در انتظار"
            and str(it.get("key") or "") not in mp["items"]
            and (it.get("audio") or []) and (it.get("model") or {}).get("pth")]
    say("صف: rev %s · %d ردیف · %d تای بی‌خروجی"
        % (q.get("rev"), len(q.get("items") or []), len(todo)))
    if not todo:
        say("کاری نیست.")
        return 0

    it = todo[0]                      # یکی در هر اجرا — بالا توضیح داده شد
    key = str(it["key"])
    say("• %s — %d بخشِ صوتی، گوینده %s"
        % (key, len(it["audio"]), it.get("speaker")))
    os.makedirs("vb", exist_ok=True)

    parts = []
    for i, a in enumerate(it["audio"]):
        dst = "vb/p%d.wav" % i
        if not grab(a.get("url"), dst):
            say("::error title=صوت برداشته نشد::%s — %s"
                % (key, a.get("name")))
            return 1
        parts.append(dst)
    if not grab((it["model"] or {}).get("pth"), "vb/model.pth"):
        say("::error title=مدل برداشته نشد::%s" % key)
        return 1
    haveIdx = bool((it["model"] or {}).get("index")) and \
        grab(it["model"]["index"], "vb/model.index")

    joinWavs(parts, "vb/src.wav")
    src = os.path.getsize("vb/src.wav")
    say("  ورودی: %.1f مگابایت" % (src / 1048576.0))

    # ══ کلِ قسمت، نه پنجرهٔ پیش‌فرضِ آزمایشگاه ══
    # `voicelab.py` ابزارِ **سنجش** است: `refAudition_` از فایل یک پنجره
    # برمی‌دارد و `--src-seconds` طولِ آن پنجره است — پیش‌فرضش **۱۲ ثانیه**.
    # اینجا هیچ‌وقت پاس داده نمی‌شد، پس پل سال‌ها می‌توانست «موفق» باشد و
    # از یک قسمتِ پانزده‌دقیقه‌ای دوازده ثانیه تحویل بدهد. ۲۶ سپتامبر دقیقاً
    # همین شد: ورودی ۹۰۲٫۷ ثانیه، خروجی ۱۱٫۸۴ ثانیه، و اجرا سبز.
    # عدد از طولِ واقعیِ همین فایل می‌آید، نه از یک ثابتِ حدسی.
    srcSec = wavSeconds("vb/src.wav")
    if srcSec <= 0:
        say("::error title=طولِ صوت خوانده نشد::هدرِ vb/src.wav معتبر نیست.")
        return 1
    say("  طولِ ورودی: %.1f ثانیه" % srcSec)

    pr = it.get("params") or {}
    args = ["python3", "tools/voicelab.py", "--engine", "rvc",
            "--ref", "vb/src.wav",          # voicelab مرجع را اجباری می‌داند
            "--src", "vb/src.wav", "--out", "vblab",
            "--src-seconds", str(int(srcSec) + 1),
            "--rvc-model", "vb/model.pth",
            "--rvc-pitch", str(pr.get("pitch", "-12")),
            "--rvc-index-rate", str(pr.get("indexRate", "1.0")),
            "--rvc-protect", str(pr.get("protect", "0.33"))]
    if haveIdx:
        args += ["--rvc-index", "vb/model.index"]
    t0 = __import__("time").time()
    # ══ خروجی را بلعیدن ممنوع ══
    # نسخهٔ اولِ voice-intake با `|| echo` شکست را به «آماده» تبدیل کرد.
    subprocess.check_call(args)
    mins = (__import__("time").time() - t0) / 60.0

    outs = []
    for root, _dirs, files in os.walk("vblab"):
        for f in files:
            if f.startswith("rvc-") and f.endswith(".wav"):
                outs.append(os.path.join(root, f))
    if not outs:
        say("::error title=خروجی ساخته نشد::تبدیل فایلی نداد؛ ردیف بسته نمی‌شود.")
        return 1
    outs.sort(key=lambda p: -os.path.getsize(p))
    best = outs[0]
    size = os.path.getsize(best)
    outSec = wavSeconds(best)
    # ══ نگهبان باید با **ورودی** سنجیده شود ══
    # سقفِ ثابتِ ۲۰۰ کیلوبایت یک لایه پایین‌ترِ خرابی ایستاده بود: نمونهٔ
    # ۱۲ ثانیه‌ای ۰٫۹ مگابایت است و راحت از آن رد می‌شد. چیزی که باید
    # سنجیده شود نسبتِ خروجی به ورودی است — «آیا کلِ قسمت تبدیل شد؟»
    if outSec < srcSec * 0.7:
        say("::error title=خروجی ناقص::%.1f ثانیه از %.1f ثانیهٔ ورودی — "
            "کلِ قسمت تبدیل نشده، پس ردیف بسته نمی‌شود." % (outSec, srcSec))
        return 1

    rel = ensureRelease()
    name = key.replace(":", "-").replace("/", "-") + ".wav"
    url = uploadAsset(rel, best, name)
    if not url:
        say("::error title=آپلود نشد::نشانیِ فایل برنگشت.")
        return 1

    mp["items"][key] = {"url": url, "bytes": size,
                        "minutes": round(mins, 1),
                        "parts": len(parts),
                        "speaker": str(it.get("speaker") or ""),
                        "at": __import__("datetime").datetime.utcnow()
                        .strftime("%Y-%m-%dT%H:%M:%SZ")}
    saveMap(mp)
    say("  ✔ %s — %.1f مگابایت، %.1f دقیقه کار"
        % (name, size / 1048576.0, mins))
    return 0


if __name__ == "__main__":
    sys.exit(main())
