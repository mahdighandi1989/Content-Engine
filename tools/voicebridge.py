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

══ چند قسمت در هر اجرا، با بودجهٔ ساعتی ══
تبدیل بلادرنگ نیست: `realtime_factor` ۱٫۱ تا ۱٫۴، یعنی قسمتِ نوزده‌دقیقه‌ای
~۲۰ تا ۲۵ دقیقه. تا ۷٫۷۷ اینجا **یکی** در هر اجرا بود، با این استدلال که
jobـِ کشته‌شده سرِ سقف هیچ خروجی‌ای نمی‌دهد — «نه حتی برای آن یکی که تمام
شده بود». آن نگرانی درست بود و جوابش جای دیگری است: نقشه پس از **هر** ردیف
ذخیره می‌شود و مرحلهٔ ثبتش در گردش‌کار `if: always()` دارد، پس کارِ
تمام‌شده گم نمی‌شود.

و آن سقف برای قسمتِ نوزده‌دقیقه‌ای بسته شده بود، نه برای نمونهٔ
چهاردقیقه‌ایِ «رنگ و روح». دو تیک یعنی دو اجرا، و با cron شش‌ساعته تا ۱۲
ساعت انتظار. معیار حالا **زمان** است: `VBR_RUN_BUDGET_MIN`.

══ و چرا `--probe` ══
نصبِ کتابخانه‌های RVC چند دقیقه است. برای اینکه cron بتواند تندتر بزند
بی آنکه هر دو ساعت آن هزینه را بدهیم، گردش‌کار اول همین فایل را با
`--probe` صدا می‌زند (فقط stdlib، چند ثانیه) و نصبِ سنگین را تنها وقتی
انجام می‌دهد که کاری باشد. **تعریفِ «کاری هست» یکی است** — هر دو از
`pending()` می‌آید؛ دو تعریف یعنی روزی یکی‌شان بی‌صدا کهنه می‌شود.
"""

import hashlib
import io
import json
import os
import subprocess
import re
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


def dropCollected(rel, q, mp):
    """هرچه موتور برداشته، از Release پاک کن.

    ══ چرا این لازم بود ══
    `voice-lab.yml` از روزِ اول Release را رد کرده و دلیلش را نوشته:
    «این ریپو عمومی است و خروجیِ این آزمایش، صدای کلون‌شدهٔ یک شخصِ
    حقیقی است … لینکی که عمومی شد، فردا بهترش می‌کنیم ندارد.»

    و پل دقیقاً همان کار را می‌کرد — یک قسمتِ کاملِ پانزده‌دقیقه‌ای با
    صدای کلون‌شدهٔ او، روی یک Releaseِ عمومی، برای همیشه. دو بخشِ یک
    مخزن دربارهٔ یک چیز دو حکم داشتند و هیچ‌کس با هم ندیده بودشان.

    ══ و چرا حذف، نه توقفِ انتشار ══
    Release تنها راهی است که موتور می‌تواند فایل را بردارد (artifact از
    بیرونِ Actions دانلود نمی‌شود). پس مثل اشتراکِ موقتِ درایو: باز
    می‌شود، استفاده می‌شود، **و پس گرفته می‌شود**. `vbrUnshare_` همین را
    سمتِ درایو می‌کند؛ این قرینه‌اش است.

    ══ مرز: فقط چیزی که واقعاً برداشته شده ══
    ملاک وضعیتِ «رسید» در صفِ خودِ موتور است، نه گذشتِ زمان. فایلی که
    هنوز برداشته نشده پاک شود یعنی قسمت برای همیشه از دست رفت — و نقشه
    هم می‌گوید «انجام شد»، پس دوباره هم ساخته نمی‌شود.
    """
    done = set()
    for it in (q.get("items") or []):
        if str(it.get("status") or "") == "رسید":
            done.add(str(it.get("key") or ""))
    # میان‌بُر، نه نگهبان: بی این خط هم `want` خالی می‌مانَد و چیزی پاک
    # نمی‌شود. شکستنش هیچ سنجه‌ای را قرمز نکرد و همین را می‌گوید — خطی که
    # شبیهِ سد باشد و سد نباشد، نفرِ بعدی را گمراه می‌کند.
    if not done:
        return 0
    want = set()
    for key in done:
        rec = mp["items"].get(key) or {}
        for u in (rec.get("urls") or ([rec["url"]] if rec.get("url") else [])):
            want.add(str(u).rsplit("/", 1)[-1])
    n = 0
    for a in (rel.get("assets") or []):
        if a.get("name") not in want:
            continue
        try:
            gh(["-X", "DELETE",
                "https://api.github.com/repos/%s/releases/assets/%s" % (REPO, a["id"])])
            n += 1
        except Exception as e:
            say("پاک نشد: %s — %s" % (a.get("name"), str(e)[:80]))
    if n:
        say("  ↺ %d فایلِ برداشته‌شده از Release پاک شد (صدای کلون‌شده "
            "عمومی نمی‌مانَد)." % n)
    return n


def assetName(key, i, n):
    """نامِ دارایی — **فقط ASCII**، و یکتا.

    ══ یک اجرای واقعی این را ثابت کرد (۷٫۷۷) ══
    تا ۷٫۷۳ هر کلیدی `show:ep` بود و `show` همیشه لاتین (`special`,
    `variety`). ۷٫۷۴ کلیدِ «نمونهٔ روح — <گوینده>:<قسمت>» را آورد و نامِ
    دارایی از همان کلید ساخته می‌شد، پس اولین اجرا با

        curl: (3) URL rejected: Malformed input to a URL function

    مُرد — **بعد از** اینکه تبدیل کامل شده بود (۲۶۱ ثانیه خروجی، ۲۸۰
    ثانیه کار). یعنی کلِ هزینهٔ رانر خرج شد و چیزی ننشست.

    نامِ دارایی یک جزئیاتِ حمل‌ونقل است، نه چیزی که کسی ببیند: نامِ فایل
    در درایو و کپشنِ تلگرام را موتور از روی `label` می‌سازد. پس به‌جای
    درگیرِ کدگذاریِ URL شدن، نام ASCII می‌شود.

    و **هش لازم است، نه تزئین**: دو کلیدِ فارسیِ متفاوت می‌توانند به یک
    اسلاگ برسند («نمونهٔ روح — razavi:53» و «نمونهٔ دیگر — razavi:53» هر
    دو `-razavi-53`) و آن‌وقت `uploadAsset` اولی را پاک می‌کند تا دومی را
    بگذارد — یعنی نمونهٔ یک گوینده بی‌صدا جای دیگری را می‌گیرد. همان
    شکلِ `dsSig_` در بخشِ ۳۳.
    """
    out = []
    for ch in str(key):
        out.append(ch if (ord(ch) < 128 and (ch.isalnum() or ch in "._-")) else "-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    slug = slug.strip("-.") or "asset"
    tag = hashlib.sha1(str(key).encode("utf-8")).hexdigest()[:8]
    tail = ".wav" if n <= 1 else "-%dof%d.wav" % (i + 1, n)
    return "%s-%s%s" % (slug[:60], tag, tail)


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


def pieceCap():
    """سقفِ هر تکه، بایت. پیش‌فرض ۴۰ مگ.

    ══ چرا تکه‌تکه (۷٫۶۶) ══
    `UrlFetchApp` — تنها راهی که موتور دارد — پاسخِ بزرگ‌تر از ۵۰ مگابایت
    را نمی‌گیرد. اولین خروجیِ واقعیِ پل ۷۰٫۹ مگابایت شد، یعنی گردش‌کار سبز
    می‌شد و موتور هرگز نمی‌توانست برش دارد. همین سقف را بخشِ ۲۷ برای
    **آپلودِ** یوتیوب از روزِ اول نوشته بود؛ طرفِ دانلودش بسته نبود.
    ۴۰ و نه ۴۵: هدرِ WAV و گردکردنِ مرزِ فریم چند کیلوبایت اضافه می‌کنند و
    سقفی که درست سرِ لبه بنشیند سقف نیست.
    """
    try:
        mb = float(os.environ.get("VBR_PIECE_MB", "40"))
    except ValueError:
        mb = 40.0
    return int(max(4.0, mb) * 1048576)


def splitWav(path, cap):
    """فایل را به تکه‌های زیرِ `cap` ببُر و فهرستِ **مرتب** را بده.

    ترتیب از نامِ خودِ ffmpeg (`%03d`) می‌آید و با `sorted` پایدار است —
    نه از حجم و نه از ترتیبِ گشتنِ پوشه. همان قاعدهٔ `ytAudioParts_`.

    و بازبینی پس از بُرش اجباری است: جمعِ طولِ تکه‌ها باید با طولِ اصل
    بخوانَد. بُرشی که چیزی گم کند از تحویل ندادن بدتر است، چون نامِ
    فایل‌ها می‌گوید «کلِ قسمت».
    """
    size = os.path.getsize(path)
    sec = wavSeconds(path)
    if size <= cap:
        return [path]
    if sec <= 0:
        return []
    rate = float(size) / sec                      # بایت بر ثانیه، از خودِ فایل
    segSec = max(10, int(cap / rate))
    pat = "vb/piece%03d.wav"
    for f in sorted(__import__("glob").glob("vb/piece*.wav")):
        os.remove(f)
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-i", path,
                           "-f", "segment", "-segment_time", str(segSec),
                           "-c", "copy", pat])
    out = sorted(__import__("glob").glob("vb/piece*.wav"))
    if not out:
        return []
    tot = sum(wavSeconds(p) for p in out)
    if abs(tot - sec) > max(1.0, sec * 0.01):
        say("::error title=بُرش ناقص::%.1f ثانیه در تکه‌ها برابرِ %.1f ثانیهٔ "
            "اصل نیست." % (tot, sec))
        return []
    for p in out:
        if os.path.getsize(p) > cap:
            say("::error title=تکه بزرگ ماند::%s — %d بایت"
                % (p, os.path.getsize(p)))
            return []
    return out


def f0Stats(path, maxFrames=3000, capHz=None):
    """زیروبمِ میانه و سهمِ قاب‌های زیرِ ۷۰ هرتز (۸٫۲۴).

    numpy و wave، نه کتابخانهٔ دیگر — و import همین‌جا، چون `--probe` باید
    بی numpy بدود. خودهمبستگی روی قاب‌های ۶۰ میلی‌ثانیه‌ای؛ قابی که
    تناوبش ضعیف است (خِرخِر، همخوان، سکوت) شمرده نمی‌شود. `None` یعنی
    «نسنجیدم»، نه «صفر» — و صدازننده باید این دو را جدا کند.
    """
    try:
        import wave
        import numpy as np
        with wave.open(path, "rb") as w:
            sr = w.getframerate()
            ch = w.getnchannels()
            if w.getsampwidth() != 2:
                return None
            x = np.frombuffer(w.readframes(w.getnframes()),
                              dtype="<i2").astype(np.float32) / 32768.0
    except Exception:
        return None
    if ch > 1:
        x = x[:len(x) // ch * ch].reshape(-1, ch).mean(1)
    d = max(1, int(sr // 8000))
    x = x[:len(x) // d * d].reshape(-1, d).mean(1)
    sr = float(sr) / d
    win, hop = int(sr * 0.06), int(sr * 0.02)
    if len(x) <= win:
        return None
    starts = list(range(0, len(x) - win, hop))
    if len(starts) > maxFrames:
        starts = [int(v) for v in np.linspace(0, len(x) - win - 1, maxFrames)]
    lo, hi = int(sr / 300), int(sr / 40)
    F = []
    for s0 in starts:
        fr = x[s0:s0 + win]
        fr = fr - fr.mean()
        if float((fr ** 2).mean()) < 4e-4:          # ~ rms 0.02: سکوت
            continue
        c = np.correlate(fr, fr, "full")[win - 1:]
        if hi >= len(c) or c[0] <= 0:
            continue
        k = lo + int(np.argmax(c[lo:hi]))
        if c[k] / c[0] > 0.3:
            F.append(sr / k)
    if len(F) < 20:
        return None
    F = np.array(F)
    med = float(np.median(F))
    out = {"medianHz": round(med, 1),
           "lowPct": int(round(100.0 * float((F < 70).mean()))),
           "frames": int(len(F)),
           # ۱۲.۵: سنجهٔ اوج — «گاهی ناگهان زیر و زنانه می‌شود». میانه آن را نمی‌بیند؛ این دو عدد می‌بینند.
           "p95Hz": round(float(np.percentile(F, 95)), 1),
           "highPct": round(100.0 * float((F > med * 2 ** (4 / 12.0)).mean()), 1)}
    if capHz:
        out["capHz"] = round(float(capHz), 1)
        out["overPct"] = round(100.0 * float((F > float(capHz)).mean()), 1)
    return out


# ══ بلندیِ خروجی (۸.۳۷) ══
# ۴ اکتبر صاحبِ برنامه گفت صدای گلدوز در برابرِ ضبط‌های خودِ او «خیلی صدا و
# حجمش پایینه». تا این‌جا **هیچ** مرحله‌ای بلندیِ خروجی را نمی‌سنجید یا تعیین
# نمی‌کرد: مبدأ به ‎−18 LUFS‎ می‌رسید، RVC هرچه داد همان نوشته می‌شد. پس بلندیِ
# هر نمونه به مدل و ورودی بند بود و هیچ‌جا ثبت نمی‌شد. حالا یک **گینِ ثابت**
# برای کلِ فایل تا هدفِ رایجِ پادکست (۱۶−) می‌رود — ثابت، نه پویا، تا تفاوتِ
# بلندیِ درونِ فایل دست نخورد (۸.۲۷) — و قله‌ای که از سقف بگذرد فقط همان
# قله محدود می‌شود. عددِ پیش و پس در نقشه ثبت می‌شود و به کپشن می‌رسد.
LOUD_TARGET = -16.0      # LUFS
LOUD_TP = -1.5           # dBFS


def loudMeasure(path):
    """`(بلندیِ یکپارچه، قلهٔ واقعی)` یا `None` — «نسنجیدم»، نه صفر."""
    import math
    try:
        r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", path,
                            "-af", "loudnorm=I=%s:TP=%s:print_format=json"
                            % (LOUD_TARGET, LOUD_TP), "-f", "null", "-"],
                           capture_output=True, timeout=900)
        txt = (r.stderr or b"").decode("utf-8", "replace")
        a, b = txt.rfind("{"), txt.rfind("}")
        j = json.loads(txt[a:b + 1])
        i, tp = float(j["input_i"]), float(j["input_tp"])
    except Exception:
        return None
    if not (math.isfinite(i) and math.isfinite(tp)) or i < -70:
        return None
    return i, tp


def loudGain(i, tp, target=LOUD_TARGET, ceil=LOUD_TP):
    """گینِ ثابت تا هدف، و اینکه آیا قله پس از آن از سقف می‌گذرد."""
    g = round(float(target) - float(i), 2)
    return g, (float(tp) + g) > float(ceil)


def loudFix(src, dst):
    """خروجی را به بلندیِ هدف برسان. `None` یعنی دست نخورد (و گفته می‌شود)."""
    m = loudMeasure(src)
    if not m:
        return None
    i, tp = m
    g, lim = loudGain(i, tp)
    af = "volume=%.2fdB" % g
    if lim:
        # فقط قله‌های بالای سقف؛ `level=0` تا محدودکننده خودش دوباره بلندی را
        # عوض نکند. سقفِ نمونه یک دسی‌بل زیرِ سقفِ قلهٔ واقعی است، چون قلهٔ
        # میانِ دو نمونه از قلهٔ خودِ نمونه بالاتر است — سنجیده شد: با سقفِ
        # برابر، قلهٔ واقعی ۰٫۸− درآمد، نه ۱٫۵−.
        af += (",alimiter=limit=%.4f:level=0:attack=5:release=60"
               % (10 ** ((LOUD_TP - 1.0) / 20.0)))
    subprocess.check_call(["ffmpeg", "-y", "-nostdin", "-loglevel", "error", "-i", src,
                           "-af", af, "-c:a", "pcm_s16le", dst])
    m2 = loudMeasure(dst)
    return {"rawLufs": round(i, 1), "rawTp": round(tp, 1), "gainDb": g,
            "limited": bool(lim), "lufs": round(m2[0], 1) if m2 else None,
            "tp": round(m2[1], 1) if m2 else None}


# ══ رنگِ ضبط‌های خودِ گوینده (۹.۰۵) ══
# صاحبِ برنامه دو مدلِ گلدوز را شنید: «قدیمی با اینکه بی‌کیفیت‌تره شبیه‌تره، چون حالتِ رادیویی‌تر
# شده». مدلِ تازه روی ضبط‌های تمیزِ ۲۲ کیلوهرتزی آموزش دید؛ صدایی که او از گلدوز می‌شناسد ضبط‌های
# قدیمِ رادیویی است. این تفاوت **رنگِ کانال** است نه هویتِ گوینده، پس با آموزشِ دوباره درمان نمی‌شود
# — با هم‌رنگ کردنِ طیف درمان می‌شود. حدس نمی‌زنیم «رادیو» یعنی چه: میانگینِ طیفِ بلندمدتِ (LTAS)
# خودِ ضبط‌های او سنجیده می‌شود و خروجی در ۲۸ نوارِ یک‌سوم‌اکتاو به همان شکل درمی‌آید. بالای پهنای
# باندِ ضبطِ قدیم، خروجی همان‌قدر خاموش می‌شود — یعنی «بی‌کیفیت» به همان اندازه که او شنیده.
COLOUR_BANDS = [63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
                2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500]
COLOUR_SR = 32000
COLOUR_CUT, COLOUR_BOOST = -30.0, 9.0


def ltas(path, maxSec=240, sr=COLOUR_SR):
    """طیفِ بلندمدت روی **گفتار** (قاب‌های پرانرژی)، به دسی‌بل در هر نوار — یا `None`."""
    import numpy as np
    try:
        raw = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-t", str(maxSec), "-i", path,
                              "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                             capture_output=True, timeout=600).stdout
    except Exception:
        return None
    x = np.frombuffer(raw, dtype=np.float32)
    n, hop = 2048, 1024
    if x.size < n * 20:
        return None
    k = (x.size - n) // hop
    fr = np.lib.stride_tricks.as_strided(x, shape=(k, n), strides=(x.strides[0] * hop, x.strides[0]))
    e = (fr ** 2).mean(axis=1)
    keep = e > np.percentile(e, 50)          # نیمهٔ پرانرژی = گفتار، نه مکث و نفس
    if keep.sum() < 10:
        return None
    P = (np.abs(np.fft.rfft(fr[keep] * np.hanning(n), axis=1)) ** 2).mean(axis=0)
    f = np.fft.rfftfreq(n, 1.0 / sr)
    out = []
    for c in COLOUR_BANDS:
        lo, hi = c / 2 ** (1 / 6.0), c * 2 ** (1 / 6.0)
        m = (f >= lo) & (f < hi)
        out.append(10 * np.log10(P[m].mean() + 1e-12) if m.any() else -120.0)
    return np.array(out)


def colourGains(refDb, outDb):
    """گینِ هر نوار تا شکلِ مرجع: میانهٔ ۲۵۰ تا ۴۰۰۰ صفر (بلندی کارِ loudFix است)، محدود و نرم."""
    import numpy as np
    g = np.asarray(refDb, float) - np.asarray(outDb, float)
    mid = [i for i, c in enumerate(COLOUR_BANDS) if 250 <= c <= 4000]
    g = g - float(np.median(g[mid]))
    g = np.clip(g, COLOUR_CUT, COLOUR_BOOST)
    sm = g.copy()
    for i in range(1, len(g) - 1):
        sm[i] = (g[i - 1] + 2 * g[i] + g[i + 1]) / 4.0
    return np.clip(sm, COLOUR_CUT, COLOUR_BOOST)


def colourDist(refDb, outDb):
    """فاصلهٔ دو شکلِ طیف (دسی‌بل، پس از هم‌ترازیِ میانه) — عددی که «نزدیک‌تر شد؟» را جواب می‌دهد."""
    import numpy as np
    d = np.asarray(refDb, float) - np.asarray(outDb, float)
    mid = [i for i, c in enumerate(COLOUR_BANDS) if 250 <= c <= 4000]
    d = np.clip(d - float(np.median(d[mid])), -40, 40)
    return round(float(np.sqrt((d ** 2).mean())), 2)


def colourMatch(src, refs, dst):
    """خروجی را به رنگِ ضبط‌های مرجع ببر. `{ok, why, ...}` — «نشد» هرگز بی‌صدا «شد» نمی‌شود."""
    import numpy as np
    R = [r for r in (ltas(p) for p in refs) if r is not None]
    if not R:
        return {"ok": False, "why": "طیفِ هیچ ضبطِ مرجعی خوانده نشد"}
    ref = 10 * np.log10(np.mean([10 ** (r / 10.0) for r in R], axis=0) + 1e-12)
    o = ltas(src)
    if o is None:
        return {"ok": False, "why": "طیفِ خروجی خوانده نشد"}
    g = colourGains(ref, o)
    ent = ";".join("entry(%d,%.1f)" % (c, v) for c, v in zip(COLOUR_BANDS, g))
    subprocess.check_call(["ffmpeg", "-y", "-nostdin", "-loglevel", "error", "-i", src,
                           "-af", "firequalizer=gain_entry='%s'" % ent, "-c:a", "pcm_s16le", dst])
    o2 = ltas(dst)
    before, after = colourDist(ref, o), (colourDist(ref, o2) if o2 is not None else None)
    if after is None or after >= before:
        return {"ok": False, "why": "رنگ نزدیک‌تر نشد (%.1f ⇒ %s دسی‌بل)" % (before, after),
                "before": before, "after": after}
    return {"ok": True, "refs": len(R), "before": before, "after": after,
            "maxCut": round(float(g.min()), 1), "maxBoost": round(float(g.max()), 1)}


def _hnorm(t):
    import re
    t = re.sub(r"[\u064B-\u0652\u0670\u200c]", "", str(t or ""))
    t = t.replace("\u064a", "\u06cc").replace("\u0643", "\u06a9")
    return re.sub(r"[^\u0600-\u06FF]", "", t)


def _wavRead(path):
    import wave
    import numpy as np
    with wave.open(path, "rb") as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if sw != 2:
        raise ValueError("فقط ۱۶ بیتی")
    x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if ch > 1:
        x = x[:len(x) // ch * ch].reshape(-1, ch).mean(1)
    return x, sr


def uvMask(x, sr, hopS=0.01, winS=0.025, lowMax=0.25, floorDb=-30.0, maxRun=25):
    """قاب‌های **همخوانِ بی‌واک** (ه، س، ش، ف، خ…) — ۹.۵۴: از طیف، نه از خودهمبستگی.
    نسخهٔ ۹.۵۳ تناوب را با پنجرهٔ هنینگ می‌سنجید و اریبیِ پنجره را جبران نمی‌کرد؛ واکه‌ها «کم‌تناوب» خوانده شدند و
    روی خروجیِ واقعیِ رضوی ۴۷٪ قاب‌ها جابه‌جا شد — شنیدن از ۰٫۸۴ به ۰٫۵۵ افتاد. حالا: سهمِ انرژیِ زیرِ ۱ کیلوهرتز
    کمتر از `lowMax` (همخوانِ بی‌واک انرژی‌اش بالاست، واکه پایین)، بلندی بالای `floorDb` نسبت به صدکِ ۹۵ (نفسِ
    کم‌جان و سکوت نه)، و رشته‌ای بلندتر از `maxRun` قاب (۲۵۰ میلی‌ثانیه) همخوان نیست — کنار می‌رود. روی همان خروجی
    ~۱۹٪ از قاب‌های گفتار، که اندازهٔ همخوان‌های بی‌واک در گفتارِ فارسی است."""
    import numpy as np
    hop, win = max(1, int(sr * hopS)), max(8, int(sr * winS))
    n = max(0, (len(x) - win) // hop + 1)
    if n == 0:
        return np.zeros(0, bool), hop
    m = np.zeros(n, bool)
    f = np.fft.rfftfreq(win, 1.0 / sr)
    w = np.hanning(win)
    db = np.zeros(n)
    for a in range(0, n, 4000):                     # تکه‌تکه، نه کلِ فایل در حافظه
        b = min(n, a + 4000)
        idx = np.arange(win)[None, :] + hop * np.arange(a, b)[:, None]
        S = np.abs(np.fft.rfft(x[idx] * w[None, :], axis=1)) ** 2
        tot = S.sum(1) + 1e-12
        m[a:b] = (S[:, f < 1000].sum(1) / tot) < lowMax
        db[a:b] = 10 * np.log10(tot)
    m &= db > np.percentile(db, 95) + floorDb
    # رشتهٔ بلند همخوان نیست
    i = 0
    while i < n:
        if m[i]:
            k = i
            while k < n and m[k]:
                k += 1
            if k - i > maxRun:
                m[i:k] = False
            i = k
        else:
            i += 1
    return m, hop


def riseScan(path, minPause=0.2):
    """۹.۵۴ — «جملهٔ خبری را جوری می‌خواند که انگار سؤالیه یا تعجبیه». پیش از هر مکثِ ≥ ۲۰۰ میلی‌ثانیه (۳۰ دسی‌بل زیرِ صدکِ ۹۵)، زیروبمِ
    ۱۵۰ میلی‌ثانیهٔ آخرِ عبارت با ۶۰۰ میلی‌ثانیهٔ پیش از آن سنجیده می‌شود؛ بیش از ۲ نیم‌پرده بالا رفتن = «پایانِ
    بالارونده». RVC زیروبمِ ورودی را فقط جابه‌جا می‌کند، پس این را روی **ورودی** می‌سنجیم: عدد می‌گوید از خواندن است
    یا نه. ⇒ {pauses, rise, pct, at:[ثانیه‌ها]} یا None."""
    import numpy as np
    try:
        x, sr = _wavRead(path)
    except Exception:
        return None
    d = max(1, int(sr // 8000))
    x = x[:len(x) // d * d].reshape(-1, d).mean(1)
    sr = float(sr) / d
    hop, win = int(sr * 0.01), int(sr * 0.04)
    n = (len(x) - win) // hop + 1
    if n < 100:
        return None
    lo, hi = int(sr / 400), int(sr / 70)
    rms = np.zeros(n)
    f0 = np.zeros(n)
    for i in range(n):
        fr = x[i * hop:i * hop + win]
        fr = fr - fr.mean()
        e = float((fr ** 2).mean())
        rms[i] = np.sqrt(e)
        if e < 1e-6:
            continue
        c = np.correlate(fr, fr, "full")[win - 1:]
        nrm = np.sqrt(c[0] * np.array([float((fr[k:] ** 2).sum()) for k in range(lo, hi)]) + 1e-12)
        r = c[lo:hi] / nrm
        k = int(np.argmax(r))
        if r[k] > 0.5:
            f0[i] = sr / (lo + k)
    sil = rms < np.percentile(rms, 95) * 10 ** (-30 / 20.0)
    need = int(minPause / 0.01)
    pauses, rise, at = 0, 0, []
    i = 0
    while i < n:
        if sil[i]:
            k = i
            while k < n and sil[k]:
                k += 1
            if k - i >= need and i > 80:
                seg = f0[max(0, i - 75):i]
                v = seg[seg > 0]
                if len(v) >= 12:
                    pauses += 1
                    tail, head = np.median(v[-8:]), np.median(v[:-8])
                    st = 12 * np.log2(tail / head)
                    if st > 2.0:
                        rise += 1
                        if len(at) < 30:
                            at.append(round(i * 0.01, 1))
            i = k
        else:
            i += 1
    if not pauses:
        return None
    return {"pauses": pauses, "rise": rise, "pct": round(100.0 * rise / pauses, 1), "at": at}


def uvSplice(outPath, srcPath, dstPath, fadeS=0.008):
    """۹.۵۳ — «ه» ⇐ «خ»: همخوانِ بی‌واکِ خروجی با همان بازهٔ **ورودی** عوض می‌شود.
    سه درمان روی خودِ تبدیل («protect» ۰٫۱۵: ۴۰ در برابرِ ۴۳؛ بی رنگ: ۴۲ در برابرِ ۳۹؛ خوانشِ ساده: ۳۵) «خ» را نبست —
    مدل خودش «ه»ِ نفس‌مانند را «خ» می‌سازد. «ه»ِ ورودی درست است (whisper همان بازه را «ه» می‌شنود) و همخوانِ بی‌واک
    زیروبم ندارد، پس رنگِ گوینده‌ای در آن نیست که از دست برود. تبدیل زمان را نگه می‌دارد، پس همان قاب‌ها جابه‌جا
    می‌شوند. بلندیِ ورودی با نسبتِ بلندیِ قاب‌های واک‌دارِ دو فایل هم‌تراز می‌شود؛ مرزها با محوِ ۸ میلی‌ثانیه‌ای.
    ⇒ {ok, frames, pct, gainDb} یا {ok: False, why}."""
    import wave
    import numpy as np
    try:
        y, sr = _wavRead(outPath)
        s, ssr = _wavRead(srcPath)
    except Exception as e:
        return {"ok": False, "why": str(e)[:120]}
    if ssr != sr:
        t = np.arange(int(len(s) * float(sr) / ssr)) * (float(ssr) / sr)
        s = np.interp(t, np.arange(len(s)), s).astype(np.float32)
    n = min(len(y), len(s))
    if n < sr:
        return {"ok": False, "why": "کوتاه"}
    y, s = y[:n].copy(), s[:n]
    m, hop = uvMask(s, sr)
    if not m.any():
        return {"ok": False, "why": "قابِ بی‌واکی پیدا نشد"}
    mOut, _ = uvMask(y, sr)
    # بلندی از قاب‌های واک‌دارِ هر دو (نه بی‌واک‌ها: آن‌ها همان چیزی‌اند که عوض می‌شوند)
    voiced = ~m[:len(mOut)] & ~mOut[:len(m)]   # قاب‌های غیرِ همخوانِ هر دو
    seg = lambda x_: np.array([np.sqrt((x_[i * hop:(i + 1) * hop] ** 2).mean() + 1e-12) for i in np.nonzero(voiced)[0][:4000]])
    ry, rs = seg(y), seg(s)
    g = float(np.median(ry) / max(1e-9, np.median(rs))) if len(ry) and len(rs) else 1.0
    g = min(4.0, max(0.25, g))
    w = np.zeros(n, np.float32)
    for i in np.nonzero(m)[0]:
        w[i * hop:min(n, (i + 1) * hop)] = 1.0
    k = max(1, int(sr * fadeS))
    w = np.convolve(w, np.ones(k, np.float32) / k, mode="same")
    z = (1.0 - w) * y + w * (s * g)
    z = np.clip(z, -1.0, 1.0)
    with wave.open(dstPath, "wb") as wo:
        wo.setnchannels(1)
        wo.setsampwidth(2)
        wo.setframerate(sr)
        wo.writeframes((z * 32767.0).astype("<i2").tobytes())
    return {"ok": True, "frames": int(m.sum()), "pct": round(100.0 * m.mean(), 1),
            "gainDb": round(20 * np.log10(g), 1)}


# ۱۰.۷: «خ»ی که از ورودی برمی‌گردد **غیرفعال** است. فیلتر قاب‌هایی را با صدای جمینای (مبدأ، پیش از تبدیل) پر می‌کرد،
# یعنی هر چند صدیم، صدای گویندهٔ اصلی برای لحظه‌ای وسط کلمه پخش می‌شد — و شنونده این را «قطع‌شدن» و «جمینای» شنید.
# روشن کردنش فقط با VBR_HX=1 و برای آزمایشِ جدا.
HX_SPLICE_ON = os.environ.get("VBR_HX") == "1"


def fricSplice(outPath, srcPath, dstPath, thrDb=8.0, maxPct=12.0, maxRun=18, fadeS=0.01):
    """۹.۶۳ — «ه» ⇐ «خ»، این بار از **تفاوتِ دو فایل**، نه از ماسکِ ورودی. `uvSplice` (۹.۵۳/۹.۵۴) قاب‌هایی را عوض می‌کرد که
    در ورودی بی‌واک‌اند؛ «ه»ِ فارسی میانِ دو واکه بیشتر واک‌دار و نفس‌آلود است ([ɦ])، پس از ماسک بیرون می‌ماند — روی نمونه‌های
    ۱۸ اکتبر فقط ۱۱–۱۲٪ قاب‌ها عوض شد و «خ»ِ افزوده ۳۲⇐۳۰ و ۴۶⇐۴۰ ماند. «خ» سایشِ نرم‌کامی است: انرژیِ نویزیِ ۱٫۲ تا ۶
    کیلوهرتز که در ورودیِ همان لحظه نیست. پس: انرژیِ همان باند در هر دو فایل، هر کدام نسبت به میانهٔ گفتارِ خودش (تا رنگِ
    کلیِ دو صدا داوری نکند)؛ قابی که خروجی‌اش `thrDb` بیشتر از ورودی سایش دارد و سایش سهمِ بزرگِ خودِ قاب است، از ورودی
    برمی‌گردد. «س» و «ش» در هر دو فایل‌اند، پس تفاوت نمی‌سازند و دست نمی‌خورند. تبدیل زمان را نگه می‌دارد، پس جابه‌جا کردن
    هرگز واژهٔ دیگری نمی‌آورد — بدترین حالتش چند ده میلی‌ثانیه رنگِ جمینای است. رشتهٔ بلندتر از `maxRun` قاب سایش نیست
    (ناهم‌ترازی است) و کنار می‌رود؛ و اگر بیش از `maxPct` درصدِ گفتار نشان شد، آستانه بالا می‌رود تا همان سقف.
    ⇒ {ok, frames, pct, gainDb, thrDb} یا {ok: False, why}."""
    import wave
    import numpy as np
    try:
        y, sr = _wavRead(outPath)
        s, ssr = _wavRead(srcPath)
    except Exception as e:
        return {"ok": False, "why": str(e)[:120]}
    if ssr != sr:
        t = np.arange(int(len(s) * float(sr) / ssr)) * (float(ssr) / sr)
        s = np.interp(t, np.arange(len(s)), s).astype(np.float32)
    n = min(len(y), len(s))
    if n < sr:
        return {"ok": False, "why": "کوتاه"}
    y, s = y[:n].copy(), s[:n]
    hop, win = max(1, int(sr * 0.01)), max(8, int(sr * 0.025))
    nf = (n - win) // hop + 1
    f = np.fft.rfftfreq(win, 1.0 / sr)
    band = (f >= 1200) & (f <= min(6000, sr / 2 - 1))
    w = np.hanning(win)

    def feats(x):
        tot, fb = np.zeros(nf), np.zeros(nf)
        for a in range(0, nf, 4000):
            b = min(nf, a + 4000)
            idx = np.arange(win)[None, :] + hop * np.arange(a, b)[:, None]
            S = np.abs(np.fft.rfft(x[idx] * w[None, :], axis=1)) ** 2
            tot[a:b] = S.sum(1) + 1e-12
            fb[a:b] = S[:, band].sum(1) + 1e-12
        return 10 * np.log10(tot), 10 * np.log10(fb), fb / tot
    to, bo, so = feats(y)
    ts, bs, ss = feats(s)
    speech = (to > np.percentile(to, 95) - 35) & (ts > np.percentile(ts, 95) - 35)
    if speech.sum() < 50:
        return {"ok": False, "why": "گفتار پیدا نشد"}
    diff = (bo - np.median(bo[speech])) - (bs - np.median(bs[speech]))
    cand = speech & (so > 0.35)

    def mark(th):
        m = cand & (diff > th)
        m = m | np.r_[m[1:], False] | np.r_[False, m[:-1]] | np.r_[m[2:], False, False] | np.r_[False, False, m[:-2]]
        i = 0
        while i < nf:
            if m[i]:
                k = i
                while k < nf and m[k]:
                    k += 1
                if k - i > maxRun:
                    m[i:k] = False
                i = k
            else:
                i += 1
        return m
    th = float(thrDb)
    m = mark(th)
    while 100.0 * m.sum() / max(1, speech.sum()) > maxPct and th < 30:
        th += 2.0
        m = mark(th)
    if not m.any():
        return {"ok": False, "why": "سایشِ افزوده‌ای پیدا نشد"}
    voiced = speech & ~m
    seg = lambda x_: np.array([np.sqrt((x_[i * hop:i * hop + win] ** 2).mean() + 1e-12) for i in np.nonzero(voiced)[0][:4000]])
    ry, rs = seg(y), seg(s)
    g = float(np.median(ry) / max(1e-9, np.median(rs))) if len(ry) and len(rs) else 1.0
    g = min(4.0, max(0.25, g))
    wv = np.zeros(n, np.float32)
    for i in np.nonzero(m)[0]:
        wv[i * hop:min(n, i * hop + win)] = 1.0
    k = max(1, int(sr * fadeS))
    wv = np.convolve(wv, np.ones(k, np.float32) / k, mode="same")
    z = np.clip((1.0 - wv) * y + wv * (s * g), -1.0, 1.0)
    with wave.open(dstPath, "wb") as wo:
        wo.setnchannels(1)
        wo.setsampwidth(2)
        wo.setframerate(sr)
        wo.writeframes((z * 32767.0).astype("<i2").tobytes())
    return {"ok": True, "frames": int(m.sum()), "pct": round(100.0 * m.sum() / max(1, speech.sum()), 1),
            "gainDb": round(20 * np.log10(g), 1), "thrDb": th}


def hearCompare(src, out, alt=None, model=None):
    """۹.۱۱: شنیدنِ ورودی و خروجی روی **همان بازه‌های زمانی** — تبدیل زمان را نگه می‌دارد، پس هر جمله‌ای که
    whisper در صدای جمینای شنید، با همان بازه از خروجی مقایسه می‌شود. واژه‌ای که در ورودی درست و در خروجی خراب
    است، تبدیل خرابش کرد؛ واژه‌ای که در ورودی هم خراب است، خواندن. «آنجا» ⇐ aonja (۱۵ اکتبر) را بی این نمی‌شد
    به یکی نسبت داد. شکست در شنیدن خروجی را نمی‌اندازد: None برمی‌گردد و «نشنیدم» ثبت می‌شود."""
    import difflib
    try:
        from faster_whisper import WhisperModel
        m = model or WhisperModel(os.environ.get("HEAR_MODEL", "small"), device="cpu", compute_type="int8")
    except Exception as e:
        say("::warning title=شنیدن نشد::مدل بارگذاری نشد: %s" % str(e)[:120])
        return None

    def words(path):
        segs, _ = m.transcribe(path, language="fa", word_timestamps=True, vad_filter=True, beam_size=1)
        S, W = [], []
        for sg in segs:
            S.append((float(sg.start), float(sg.end), sg.text.strip()))
            for w in (sg.words or []):
                W.append((float(w.start), float(w.end), w.word))
        return S, W

    def window(W, a, b):
        return " ".join(w[2].strip() for w in W if w[0] >= a - 0.15 and w[1] <= b + 0.15)

    S, _ = words(src)
    if not S:
        return None
    _, Wo = words(out)
    Wa = words(alt)[1] if alt else None
    segs, so, sa = [], [], []
    kh = {"src": 0, "out": 0, "alt": 0}
    for a, b, t in S:
        n = _hnorm(t)
        if len(n) < 4:
            continue
        o = window(Wo, a, b)
        r = difflib.SequenceMatcher(None, n, _hnorm(o), autojunk=False).ratio()
        so.append(r)
        row = {"t": round(a, 1), "src": t[:120], "out": o.strip()[:120], "s": round(r, 2)}
        # ۹.۲۳: «ه» ⇐ «خ» — «هم» ⇐ «خم»، «همیشه» ⇐ «خمیشه» در تقریباً هر جملهٔ نمونهٔ ساعت‌ساز. «خ»ی که در خروجی
        # هست و در ورودیِ همان بازه نیست، از تبدیل آمده.
        ks, ko = n.count("\u062e"), _hnorm(o).count("\u062e")
        kh["src"] += ks
        kh["out"] += max(0, ko - ks)
        if ko > ks:
            row["kh"] = ko - ks
        if Wa is not None:
            al = window(Wa, a, b)
            ra = difflib.SequenceMatcher(None, n, _hnorm(al), autojunk=False).ratio()
            sa.append(ra)
            row["alt"] = al.strip()[:120]
            row["sa"] = round(ra, 2)
            kh["alt"] += max(0, _hnorm(al).count("\u062e") - n.count("\u062e"))
        segs.append(row)
    if not so:
        return None
    res = {"srcOut": round(sum(so) / len(so), 3), "n": len(so),
           "worst": sorted(segs, key=lambda x: x["s"])[:6], "segs": segs[:80]}
    res["khOut"] = kh["out"]
    res["khSrc"] = kh["src"]
    if sa:
        res["alt"] = round(sum(sa) / len(sa), 3)
        res["khAlt"] = kh["alt"]
    return res


# ══ موسیقی از تبدیل نمی‌گذرد، و هر صدا گامِ خودش را دارد (۹.۳۶) ══
# ۱۷ اکتبر صاحبِ برنامه دو خروجیِ گلدوز را شنید: «صدای گلدوز افتضاح … حتی آهنگِ شروعِ اون قسمت هم داغون بود».
# دو علت، هر دو در این فایل: (۱) کلِ صوت — موسیقیِ آغاز و پل‌ها هم — از RVC می‌گذشت، و RVC موسیقی را «گلدوز» می‌کند؛
# (۲) زیروبمِ ورودی روی **کلِ** فایل سنجیده می‌شد (موسیقی هم) و یک گام برای همه بود، در حالی که «از همه جا» چند گوینده
# دارد — زن و مرد. گامی که صدای زن را به گلدوز می‌رساند، صدای مرد را یک‌سوم اکتاو زیرِ او می‌بَرد. همان درسِ ۱۸ و ۱۸-ب:
# گام برای صدای **مبدأ** معنا دارد — و مبدأ این‌جا یکی نیست.
# موتور نقشهٔ `segs` را از `_times.json` می‌فرستد (گفتار/موسیقی، تکه‌به‌تکه). این‌جا: زیروبمِ هر تکهٔ گفتار، گروه‌بندیِ صداها
# (حداکثر دو گروه — بزرگ‌ترین فاصله در لگاریتمِ هرتز)، یک تبدیل برای هر گروه با گامِ خودش، و چیدنِ خروجی: هر تکهٔ گفتار از
# تبدیلِ گروهِ خودش، با بلندیِ همان تکه در ورودی، و **موسیقی و هر جای دیگر از خودِ ورودی**.

def readMono(path):
    """(آرایهٔ float32، نرخ) — WAVِ ۱۶بیتی؛ چندکاناله میانگین می‌شود."""
    import wave
    import numpy as np
    with wave.open(path, "rb") as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(w.getnframes())
    if sw != 2:
        raise ValueError("WAVِ %d بایتی" % sw)
    x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if ch > 1:
        x = x[:len(x) // ch * ch].reshape(-1, ch).mean(1)
    return x, sr


def writeMono(path, x, sr):
    import wave
    import numpy as np
    y = (np.clip(x, -1.0, 1.0) * 32767.0).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(sr))
        w.writeframes(y.tobytes())


def f0Frames(x, sr, maxFrames=600):
    """زیروبمِ قاب‌های واک‌دار — همان روشِ `f0Stats`، روی آرایه."""
    import numpy as np
    d = max(1, int(sr // 8000))
    x = x[:len(x) // d * d].reshape(-1, d).mean(1)
    sr = float(sr) / d
    win, hop = int(sr * 0.06), int(sr * 0.02)
    if len(x) <= win:
        return []
    starts = list(range(0, len(x) - win, hop))
    if len(starts) > maxFrames:
        starts = [int(v) for v in np.linspace(0, len(x) - win - 1, maxFrames)]
    lo, hi = int(sr / 300), int(sr / 40)
    F = []
    for s0 in starts:
        fr = x[s0:s0 + win]
        fr = fr - fr.mean()
        if float((fr ** 2).mean()) < 4e-4:
            continue
        c = np.correlate(fr, fr, "full")[win - 1:]
        if hi >= len(c) or c[0] <= 0:
            continue
        k = lo + int(np.argmax(c[lo:hi]))
        if c[k] / c[0] > 0.3:
            F.append(sr / k)
    return F


def f0Track(x, sr, hop=0.02, win=0.06):
    """⇒ [(ثانیه، هرتز یا ۰)] برای همهٔ قاب‌ها — همان روشِ `f0Frames`، بی سقفِ شمار، با زمان (۱۲.۵)."""
    import numpy as np
    d = max(1, int(sr // 8000))
    x = x[:len(x) // d * d].reshape(-1, d).mean(1)
    sr2 = float(sr) / d
    w, h = int(sr2 * win), int(sr2 * hop)
    lo, hi = int(sr2 / 300), int(sr2 / 40)
    out = []
    for s0 in range(0, max(0, len(x) - w), h):
        fr = x[s0:s0 + w]
        fr = fr - fr.mean()
        hz = 0.0
        if float((fr ** 2).mean()) >= 4e-4:
            c = np.correlate(fr, fr, "full")[w - 1:]
            if hi < len(c) and c[0] > 0:
                k = lo + int(np.argmax(c[lo:hi]))
                if c[k] / c[0] > 0.3:
                    hz = sr2 / k
        out.append(((s0 + w / 2.0) / sr2, hz))
    return out


# ══ سقفِ اوجِ زیروبم (۱۲.۵، فقط با `f0cap` روی ردیف — یعنی فقط نمونه) ══
# Charon ~۱۲۵ هرتز است و گلدوز ۱۵۸؛ کلِ صدا چند نیم‌پرده بالا می‌رود و هر اوجِ جمینای با آن به محدودهٔ صدای زن می‌رسد. جاهایی
# که زیروبمِ خروجی بیش از `f0cap` نیم‌پرده بالای هدفِ گوینده است، از تبدیلِ دومی با گامِ پایین‌تر برداشته می‌شوند — با هم‌ترازی
# و محوِ کوتاه در دو لبه. RVC از بیرون دستی به منحنیِ زیروبمش نمی‌دهد؛ این راهِ ساختنی همان است که `segPitch` رفت: تبدیلِ دیگر،
# و برداشتنِ تکه‌ها — این بار در اندازهٔ چند صد میلی‌ثانیه، نه کلِ جمله.
def capRegions(track, capHz, minLen=0.08, gap=0.12, pad=0.05, spans=None):
    """⇒ [(a,b)] جاهایی که زیروبم از `capHz` بالاتر است؛ فقط درونِ `spans` (گفتار) اگر داده شود."""
    regs = []
    for t, hz in track:
        if hz > capHz:
            if regs and t - regs[-1][1] <= gap:
                regs[-1][1] = t
            else:
                regs.append([t, t])
    out = []
    for a, b in regs:
        a, b = max(0.0, a - pad), b + pad
        if b - a < minLen:
            continue
        if spans:
            ins = [(max(a, sa), min(b, sb)) for sa, sb in spans if min(b, sb) - max(a, sa) > 0]
            if not ins:
                continue
            a, b = min(x[0] for x in ins), max(x[1] for x in ins)
        out.append((round(a, 3), round(b, 3)))
    return out


def capSplice(bestPath, altPath, regions, dst, fade=0.02):
    """تکه‌های `regions` از `altPath` (هم‌تراز با `bestPath`) جای همان تکه‌ها می‌نشینند. ⇒ {"sec","lagSec","corr"}"""
    import numpy as np
    x, sr = readMono(bestPath)
    q = "vb/capalt.wav"
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-i", altPath, "-ac", "1", "-ar", str(sr), q])
    v = readMono(q)[0]
    dur = len(x) / float(sr)
    L, c = alignLag(x, v, sr, [(0.0, dur)])
    y = x.copy()
    nf = max(1, int(fade * sr))
    ramp = np.linspace(0.0, 1.0, nf, dtype=np.float32)
    sec = 0.0
    for a, b in regions:
        i0, i1 = int(a * sr), min(int(b * sr), len(x))
        if i0 + L < 0 or i1 + L > len(v) or i1 - i0 < 3 * nf:
            continue
        seg, ref = v[i0 + L:i1 + L].copy(), x[i0:i1]
        rs, ro = float(np.sqrt((ref ** 2).mean())), float(np.sqrt((seg ** 2).mean()))
        if ro > 1e-5 and rs > 1e-5:
            seg *= min(4.0, rs / ro)
        seg[:nf] = ref[:nf] * (1 - ramp) + seg[:nf] * ramp
        seg[-nf:] = seg[-nf:] * (1 - ramp) + ref[-nf:] * ramp
        y[i0:i1] = seg
        sec += (i1 - i0) / float(sr)
    writeMono(dst, y, sr)
    return {"sec": round(sec, 1), "lagSec": round(L / float(sr), 3), "corr": round(c, 2)}


VOICE_SPLIT = 1.25       # نسبتِ زیروبمِ دو گروه که از آن به بعد «دو صدا»ست، نه نوسانِ یک صدا
VOICE_MIN_SHARE = 0.08   # گروهی کمتر از این سهم از گفتار، گروهِ جدا نمی‌شود (یک جملهٔ بلند/بم کافی نیست)


def voiceGroups(segs, x, sr, targetHz):
    """⇒ {"groups":[{"hz","pitch","secs"}], "speech":[(a,b)], "assign":[g…]} یا None («نسنجیدم»)."""
    import math
    import numpy as np
    speech = [(float(a), float(b)) for a, b, k in segs if k != "m" and float(b) - float(a) >= 0.3]
    if not speech or not targetHz:
        return None
    meds = []
    for a, b in speech:
        F = f0Frames(x[int(a * sr):int(b * sr)], sr)
        meds.append(float(np.median(F)) if len(F) >= 8 else None)
    got = [(i, m) for i, m in enumerate(meds) if m]
    if not got:
        return None
    dur = [b - a for a, b in speech]
    lg = sorted((math.log2(m), i) for i, m in got)
    cut = None
    if 2 ** (lg[-1][0] - lg[0][0]) >= VOICE_SPLIT and len(lg) >= 2:
        gaps = [(lg[j + 1][0] - lg[j][0], j) for j in range(len(lg) - 1)]
        g, j = max(gaps)
        if 2 ** g >= 1.08:
            cut = (lg[j][0] + lg[j + 1][0]) / 2.0
    assign = [None] * len(speech)
    for i, m in got:
        assign[i] = 0 if (cut is None or math.log2(m) < cut) else 1
    tot = sum(dur)
    if cut is not None:
        sh1 = sum(dur[i] for i in range(len(speech)) if assign[i] == 1) / tot
        if sh1 < VOICE_MIN_SHARE or sh1 > 1 - VOICE_MIN_SHARE:
            cut = None
            assign = [0 if a is not None else None for a in assign]
    last = None
    for i in range(len(assign)):            # تکهٔ نسنجیده ⇒ گروهِ تکهٔ پیش از خودش (همان گوینده ادامه می‌دهد)
        if assign[i] is None:
            assign[i] = last if last is not None else 0
        last = assign[i]
    groups = []
    for gi in sorted(set(assign)):
        ms = [meds[i] for i in range(len(speech)) if assign[i] == gi and meds[i]]
        ws = [dur[i] for i in range(len(speech)) if assign[i] == gi and meds[i]]
        order = np.argsort(ms)
        cw, half, hz = 0.0, sum(ws) / 2.0, ms[order[0]]
        for o in order:                     # میانهٔ وزنی (به طولِ تکه)
            cw += ws[o]
            if cw >= half:
                hz = ms[o]
                break
        groups.append({"hz": round(float(hz), 1), "pitch": autoPitch(hz, targetHz),
                       "secs": round(sum(dur[i] for i in range(len(speech)) if assign[i] == gi), 1)})
    # گروهِ بزرگ‌تر اول: تبدیلِ اصلی و گامِ ثبت‌شده مالِ اوست
    if len(groups) == 2 and groups[1]["secs"] > groups[0]["secs"]:
        groups = [groups[1], groups[0]]
        assign = [1 - a for a in assign]
    return {"groups": groups, "speech": speech, "assign": assign, "meds": meds}


# ══ زیروبمِ هر تکه (۱۱.۴، آزمایشی — فقط با `segPitch` روی ردیف) ══
# صاحبِ کانال نمونهٔ درسِ ۷۴ِ گلدوز را شنید: «سرِ تغییرِ حالت از کانسپتِ صدایش بیرون می‌رفت». `voiceGroups` برای هر گوینده
# **یک** گام می‌گذارد (میانهٔ وزنیِ کلِ فایل)، پس تکه‌ای که جمینای با حالتِ دیگری زیرتر یا بم‌تر خوانده همان گام را می‌گیرد
# و از محدودهٔ طبیعیِ گوینده بیرون می‌افتد. این‌جا فقط **بیرون‌زدگی** برگردانده می‌شود: تکه‌ای که کمتر از `SEGP_TOL`
# نیم‌پرده با میانهٔ گروهش فرق دارد دست نمی‌خورد (حالت و آهنگِ جمله سرِ جایش)، و بیش از آن، فقط مازاد — با سقفِ
# `SEGP_CAP` — جبران می‌شود. هر گامِ تازه یک تبدیلِ کامل است، پس شمارشان سقف دارد (`SEGP_MAX`).
SEGP_TOL = 2.0
SEGP_CAP = 4
SEGP_MAX = 4


def segPitchPlan(vg, tol=SEGP_TOL, cap=SEGP_CAP, maxVar=SEGP_MAX):
    """⇒ {"pitch":[گامِ هر تکه], "moved":n, "variants":[گام‌های تازه], "maxDev":نیم‌پرده} یا None."""
    import math
    if not vg or not vg.get("meds"):
        return None
    out, moved, maxDev = [], 0, 0.0
    for i, g in enumerate(vg["assign"]):
        G = vg["groups"][g]
        m = vg["meds"][i]
        p = int(G["pitch"])
        if m and G["hz"]:
            dev = 12.0 * math.log2(float(m) / float(G["hz"]))
            maxDev = max(maxDev, abs(dev))
            ex = max(0.0, abs(dev) - tol)
            if ex >= 0.5:
                corr = int(round(min(float(cap), ex)))
                p = p - corr if dev > 0 else p + corr
                moved += 1
        out.append(p)
    base = set(int(G["pitch"]) for G in vg["groups"])
    extra = sorted(set(out) - base, key=lambda q: -sum(1 for x in out if x == q))
    keep = set(extra[:maxVar])
    for i, p in enumerate(out):                 # گامی که جا نشد ⇒ نزدیک‌ترین گامِ ساخته‌شده
        if p not in base and p not in keep:
            cand = sorted(base | keep, key=lambda q: abs(q - p))
            out[i] = cand[0]
    return {"pitch": out, "moved": moved, "variants": sorted(keep), "maxDev": round(maxDev, 1),
            "tol": tol, "cap": cap}


ALIGN_MAX_SEC = 3.0      # ۹.۴۴: بیشینهٔ جابه‌جاییِ کلِ تبدیل نسبت به ورودی که جست‌وجو می‌شود
ALIGN_LOCAL_SEC = 0.15   # و برای هر تکه، پالایشِ دورِ همان عدد (رانشِ آرام میانِ تکه‌های تبدیل)
ALIGN_MIN_CORR = 0.6     # پوشِ گفتارِ چیده‌شده با ورودی کمتر از این بخواند ⇒ تحویل نمی‌شود


def _env(x, sr, hop=0.01):
    import numpy as np
    h = max(1, int(sr * hop))
    m = len(x) // h
    return np.sqrt((x[:m * h].reshape(m, h) ** 2).mean(1)) if m else np.zeros(0, dtype=np.float32)


def _ncorr(a, b):
    import numpy as np
    a = a - a.mean()
    b = b - b.mean()
    d = float(np.sqrt((a * a).sum() * (b * b).sum()))
    return float((a * b).sum() / d) if d > 1e-12 else 0.0


def alignLag(x, v, sr, speech, maxSec=ALIGN_MAX_SEC):
    """جابه‌جاییِ تبدیل نسبت به ورودی (نمونه): v[i + lag] همان x[i] است. ⇒ (lag، همبستگی).

    ۱۷ اکتبر، قسمتِ ۷۵: گفتارِ تبدیل‌شده ۰٫۸۴ تا ۰٫۸۸ ثانیه **جلوتر** از ورودی بود (پوشِ صدا در نُه نقطه، همبستگی ۰٫۷۶–۰٫۸۹)،
    و `assemble` هر تکه را با ثانیه‌های **ورودی** از تبدیل می‌برید — هر تکه وسطِ یک واژه شروع و وسطِ واژهٔ بعد تمام می‌شد:
    «مثلِ وقتی نوار جمع می‌کنه». نمونه‌های ساعت‌ساز این را نداشتند چون کلِ فایل یک‌جا تبدیل می‌شد و چیزی بریده نمی‌شد."""
    import numpy as np
    hop = 0.01
    ex, ev = _env(x, sr, hop), _env(v, sr, hop)
    mask = np.zeros(len(ex), dtype=bool)
    for a, b in speech:
        mask[int(a / hop):int(b / hop)] = True
    idx = np.nonzero(mask)[0]
    if len(idx) < 50:
        return 0, 0.0
    if float(ex[idx].std()) < 0.1 * float(ex[idx].mean() + 1e-9):
        return 0, 1.0                       # پوشِ تخت (نه گفتار) چیزی برای هم‌ترازی ندارد
    mf = int(maxSec / hop)
    best = (0, -2.0)
    for L in range(-mf, mf + 1):
        j = idx + L
        ok = (j >= 0) & (j < len(ev))
        if ok.sum() < len(idx) * 0.8:
            continue
        c = _ncorr(ex[idx[ok]], ev[j[ok]])
        if c > best[1]:
            best = (L, c)
    return int(best[0] * hop * sr), best[1]


def _segLag(x, v, sr, a, b, lag0, span=ALIGN_LOCAL_SEC):
    """پالایشِ جابه‌جایی برای یک تکه، دورِ `lag0`."""
    hop = 0.01
    h = int(sr * hop)
    i0, i1 = int(a * sr), int(b * sr)
    ex = _env(x[i0:i1], sr, hop)
    if len(ex) < 30 or float(ex.std()) < 0.1 * float(ex.mean() + 1e-9):
        return lag0
    best = (lag0, -2.0)
    for d in range(-int(span / hop), int(span / hop) + 1):
        L = lag0 + d * h
        j0, j1 = i0 + L, i1 + L
        if j0 < 0 or j1 > len(v):
            continue
        ev = _env(v[j0:j1], sr, hop)
        n = min(len(ex), len(ev))
        c = _ncorr(ex[:n], ev[:n])
        if c > best[1]:
            best = (L, c)
    return best[0]


def assemble(srcPath, outPaths, speech, assign, dst, fade=0.015, lagSegs=None):
    """هر تکهٔ گفتار از تبدیلِ گروهِ خودش (با بلندیِ همان تکه در ورودی)؛ بقیه — موسیقی، آغاز، پایان — از خودِ ورودی.
    `lagSegs[i]`: تکه‌هایی که هم‌ترازیِ خروجیِ i با آن‌ها سنجیده شود (۱۱.۴: تبدیل‌های گامِ دیگرِ همان گروه، که فقط چند تکه
    از آن‌ها برداشته می‌شود، با همهٔ تکه‌های گروه هم‌تراز می‌شوند — چند تکه برای سنجشِ جابه‌جایی کم است)."""
    import numpy as np
    x, sr = readMono(srcPath)
    ys = []
    for i, p in enumerate(outPaths):
        q = "vb/asm%d.wav" % i
        subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-i", p, "-ac", "1", "-ar", str(sr), q])
        ys.append(readMono(q)[0])
    y = x.copy()
    nf = max(1, int(fade * sr))
    ramp = np.linspace(0.0, 1.0, nf, dtype=np.float32)
    swapped = 0.0
    # ۹.۴۴: هر تبدیل اول با ورودی هم‌تراز می‌شود — کل، بعد هر تکه.
    lags, cors = [], []
    for gi, v in enumerate(ys):
        sp = (lagSegs[gi] if lagSegs and gi < len(lagSegs) and lagSegs[gi] else
              [speech[i] for i in range(len(speech)) if assign[i] == gi])
        L, c = alignLag(x, v, sr, sp) if sp else (0, 0.0)
        lags.append(L)
        cors.append(c)
    for (a, b), g in zip(speech, assign):
        v = ys[g]
        L = _segLag(x, v, sr, a, b, lags[g])
        i0, i1 = int(a * sr), min(int(b * sr), len(x))
        if i0 + L < 0:
            i0 = -L
        if i1 + L > len(v):
            i1 = len(v) - L
        if i1 - i0 < 2 * nf:
            continue
        seg, ref = v[i0 + L:i1 + L].copy(), x[i0:i1]
        rs, ro = float(np.sqrt((ref ** 2).mean())), float(np.sqrt((seg ** 2).mean()))
        if ro > 1e-5 and rs > 1e-5:
            seg *= min(4.0, rs / ro)        # بلندیِ همان تکه در ورودی — نسبتِ گفتار و موسیقی همان می‌مانَد
        seg[:nf] = ref[:nf] * (1 - ramp) + seg[:nf] * ramp
        seg[-nf:] = seg[-nf:] * (1 - ramp) + ref[-nf:] * ramp
        y[i0:i1] = seg
        swapped += (i1 - i0) / float(sr)
    # نگهبان: گفتارِ چیده‌شده باید همان گفتارِ ورودی باشد (همان زمان‌بندیِ واژه‌ها) — وگرنه تحویل نمی‌شود.
    speechAll = [p for p in speech]
    hop = 0.01
    ex, ey = _env(x, sr, hop), _env(y, sr, hop)
    m = np.zeros(len(ex), dtype=bool)
    for a, b in speechAll:
        m[int(a / hop):int(b / hop)] = True
    n = min(len(ex), len(ey))
    m = m[:n]
    flat = m.sum() <= 50 or float(ex[:n][m].std()) < 0.1 * float(ex[:n][m].mean() + 1e-9)
    after = 1.0 if flat else _ncorr(ex[:n][m], ey[:n][m])
    info = {"speechSec": round(swapped, 1), "keptSec": round(len(x) / float(sr) - swapped, 1),
            "lagSec": [round(L / float(sr), 3) for L in lags], "lagCorr": [round(c, 2) for c in cors],
            "alignCorr": round(after, 2)}
    if after < ALIGN_MIN_CORR:
        raise RuntimeError("گفتارِ چیده‌شده با ورودی نمی‌خواند (همبستگیِ پوش %.2f، جابه‌جایی %s ثانیه) — تحویل نمی‌شود"
                           % (after, info["lagSec"]))
    writeMono(dst, y, sr)
    return info


def autoPitch(srcHz, targetHz):
    """گام به نیم‌پرده از نسبتِ دو زیروبم — محدود، چون عددِ پرت یعنی سنجشِ خراب."""
    import math
    st = 12.0 * math.log2(float(targetHz) / float(srcHz))
    return int(max(-14, min(6, round(st))))


PITCH_SLACK = 3      # نیم‌پرده دورتر از گامِ هرتزی = گامِ صدای دیگری


def asWav_(path):
    """ورودیِ آزمایشگاه mp3 هم هست؛ `f0Stats` فقط WAVِ ۱۶ بیتی می‌خوانَد."""
    if not path or not os.path.exists(path):
        return None
    try:
        import wave
        with wave.open(path, "rb") as w:
            if w.getsampwidth() == 2:
                return path
    except Exception:
        pass
    dst = path + ".f0.wav"
    try:
        subprocess.check_call(["ffmpeg", "-y", "-nostdin", "-loglevel", "error",
                               "-i", path, "-ac", "1", "-ar", "16000",
                               "-c:a", "pcm_s16le", dst])
        return dst
    except Exception:
        return None


PITCH_GATE = 2.0     # نیم‌پرده فاصلهٔ خروجی از هدف که دیگر «همان گوینده» نیست


def pitchGateErr(stOut, pitchAuto, vg=None):
    """خروجی به زیروبمِ هدف رسید؟ ⇒ '' یا علت. فقط یک گروهِ صدا (قسمتِ چندصدایی میانهٔ مشترک ندارد)."""
    import math
    try:
        if not stOut or not pitchAuto or (vg and len(vg.get("groups") or []) > 1):
            return ""
        t, o = float(pitchAuto.get("targetHz") or 0), float(stOut.get("medianHz") or 0)
        if t <= 0 or o <= 0:
            return ""
        d = 12.0 * math.log(o / t, 2)
        if abs(d) <= PITCH_GATE:
            return ""
        return "زیروبمِ خروجی %.0f هرتز، هدف %.0f (%+.1f نیم‌پرده؛ گامِ خواسته %s)" % (o, t, d, pitchAuto.get("pitch"))
    except Exception:
        return ""


def pitchExact(tokens):
    """گام‌های «دقیق» (`--rvc-pitch-exact`) — همان شکلِ خروجیِ `pitchResolve`: **رشته**، نه عدد (۲۰ اکتبر).

    نگارشِ ۹.۶۸ همین را در voicelab با `int(...)` می‌ساخت و نام‌گذاریِ فایل (`pv.startswith("-")`) روی عدد
    افتاد: سه اجرای پل (۱۵۱–۱۵۳) هر کدام شش دقیقه دویدند و بی یک فایل مُردند. سنجه فقط متنِ کد را
    می‌خواند، پس سبز ماند — خواندن به‌جای اجرا."""
    steps = [str(int(round(float(str(t).strip())))) for t in tokens if str(t).strip()]
    return steps, {"exact": True, "steps": steps, "dropped": [], "auto": None}


def pitchResolve(tokens, src, ref, targetHz=None):
    """گام‌های جاروبِ آزمایشگاه — از هرتزِ همین مبدأ، نه از حافظه (۱۴ اکتبر).

    ══ چه شد ══
    A/Bِ گلدوز با گامِ «۰، +۲، +۴» ساخته شد: +۴ گامِ درستِ نمونهٔ ساعت‌ساز
    بود که مبدأش ۱۲۹ هرتز بود. این مبدأ ۱۹۸ هرتز است و گلدوز ۱۵۱، پس
    گامِ درست ‎−۴ است — هر سه نمونه ۴ تا ۸ نیم‌پرده زیر‌تر از خودِ او
    درآمدند، و صاحبِ برنامه هر دو مدل را «افتضاح» شنید. همان اشتباهِ رضوی
    (قاعدهٔ ۱۸: «گام برای صدای مبدأ معنا دارد، نه برای گوینده»)، این بار
    در آزمایشگاه، با دستِ من. پل از ۸.۲۴ گام را از هرتز می‌گیرد؛
    آزمایشگاه عدد را از ورودیِ فرم برمی‌داشت و هیچ‌چیز نمی‌سنجیدش.

    ══ حالا ══
    `auto`، `auto-1`، `auto+2` … از هرتزِ همین مبدأ و همین مرجع (یا
    `targetHz`) حساب می‌شوند، و عددِ دستی‌ای که بیش از `PITCH_SLACK`
    نیم‌پرده از گامِ هرتزی دور است **کنار می‌رود** و گفته می‌شود — چون
    نمونهٔ صدای مردی که زنانه درآمده، به شنونده چیزی دربارهٔ مدل
    نمی‌گوید؛ فقط وقتِ او را می‌گیرد. سنجیده نشد (فایلِ خراب) ⇒ همان
    عددها، با هشدار؛ `auto` بی سنجش ‎0 می‌شود و گفته می‌شود.
    """
    toks = [str(t).strip() for t in tokens if str(t).strip()]
    sS = f0Stats(asWav_(src) or "") if src else None
    tHz = None
    try:
        tHz = float(targetHz) if targetHz else None
    except (TypeError, ValueError):
        tHz = None
    rS = None
    if tHz is None and ref:
        rS = f0Stats(asWav_(ref) or "")
        tHz = rS["medianHz"] if rS else None
    chk = {"srcHz": sS["medianHz"] if sS else None, "targetHz": tHz,
           "auto": None, "dropped": [], "steps": []}
    if sS and tHz:
        chk["auto"] = autoPitch(sS["medianHz"], tHz)
    out = []
    for t in toks:
        m = re.match(r"^auto\s*([+-]\s*\d+)?$", t, re.I)
        if m:
            off = int(m.group(1).replace(" ", "")) if m.group(1) else 0
            out.append((chk["auto"] or 0) + off)
            continue
        try:
            v = int(round(float(t)))
        except ValueError:
            chk["dropped"].append(t)
            continue
        if chk["auto"] is not None and abs(v - chk["auto"]) > PITCH_SLACK:
            chk["dropped"].append(t)
            continue
        out.append(v)
    if not out:
        out = [chk["auto"] if chk["auto"] is not None else 0]
    seen = []
    for v in out:
        if v not in seen:
            seen.append(v)
    chk["steps"] = [str(v) for v in seen]
    return chk["steps"], chk


def pending(q, mp):
    """کدام ردیف‌ها واقعاً کار دارند — **تنها** تعریفِ این پرسش.

    هم `--probe` این را می‌پرسد و هم اجرای واقعی. دو تعریف یعنی روزی
    probe «کاری نیست» بگوید و اجرا کار داشته باشد (یا برعکس: نصبِ
    چندین‌دقیقه‌ای برای هیچ)، و هیچ‌چیز نشان نمی‌دهد.

    ══ چرا «در نقشه هست» کافی نیست ══
    نقشه هم پاسخ است و هم دفترِ «انجام‌شده». ورودی‌های پیش از ۷٫۶۶ یک
    `url` تکی دارند و ممکن است از سقفِ دانلودِ موتور بزرگ‌تر باشند —
    یعنی پاسخی که هرگز برداشته نمی‌شود. و چون کلید در نقشه است، هیچ
    اجرای بعدی هم دوباره نمی‌سازدش: پاسخ تا ابد غیرقابلِ‌استفاده
    می‌مانَد و هیچ‌جا نمی‌گوید.

    پس معیار «دستورِ پخت» است، نه «وجود داشتن» — همان `EMB_TEXT_VER`
    در ۷٫۲۷: ردیفی که با دستورِ قدیمی ساخته شده انجام‌شده حساب نمی‌شود.
    ورودیِ بی `urls` یک بار دوباره تبدیل می‌شود و بس، چون خروجیِ تازه
    `urls` دارد. هیچ آدمی چیزی را دستی پاک نمی‌کند (۵٫۹۵).

    ══ و ترتیب: نمونه‌ها جلوتر از جاروبِ خودکار (۷٫۸۶) ══
    موتور ردیف‌هایش را به ترتیبِ درست **می‌خواهد** — ۷٫۵۹ و ۷٫۸۲ هر دو
    `vbrSeedAsk_`/`vbrAskPicked_` را پیش از `vbrAskDue_` گذاشتند، با این
    جمله که «چیزی که خواسته شده نباید پشتِ قسمت‌هایی که کسی انتخابشان
    نکرده منتظر بماند». و بعد همین‌جا، یک لایه آن‌طرف‌تر، به ترتیبِ ورود
    مصرف می‌شد و آن چیدمان را باطل می‌کرد: کارِ شبانه دو قسمتِ کاملِ
    ~۲۵ دقیقه‌ای را ساعتِ ۰۲:۳۰ در صف می‌گذارد و نمونهٔ چهاردقیقه‌ای یک
    ساعت بعد می‌نشیند، پس با بودجهٔ ۴۵ دقیقه‌ای دو اجرا (چهار ساعت)
    پشتش می‌ماند.

    `label` از ۷٫۷۴ دقیقاً معنای «این ردیف خودِ قسمت نیست، نمونه‌ای از
    آن است» را دارد، پس همان تفکیک‌کننده است. و چیزی از دست نمی‌رود:
    `VBR_REPLACE` خاموش است، یعنی خروجیِ یک قسمت منتشر نمی‌شود و یک
    اجرا دیرتر آمدنش هیچ هزینه‌ای ندارد؛ نمونه اما برای همین حالا ساخته
    شده، تا گوشِ او داوری کند.

    `sorted` پایدار است، پس ترتیبِ درونِ هر گروه دست نمی‌خورد.
    """
    def done(key):
        rec = (mp.get("items") or {}).get(key)
        if not rec:
            return False
        us = rec.get("urls")
        # ۹.۴۴: خروجیِ چیده‌شده بی `alignCorr` با چیدنِ ناهم‌تراز ساخته شد (گفتار ۰٫۸۵ ثانیه جابه‌جا) — انجام‌شده نیست.
        mx = rec.get("mix")
        if isinstance(mx, dict) and mx.get("alignCorr") is None:
            return False
        return bool(us) and isinstance(us, list)
    out = [it for it in (q.get("items") or [])
           if str(it.get("status") or "") == "در انتظار"
           and not done(str(it.get("key") or ""))
           and (it.get("audio") or []) and (it.get("model") or {}).get("pth")]
    return sorted(out, key=lambda it: 0 if str(it.get("label") or "").strip() else 1)


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

    if "--probe" in sys.argv:
        # ══ فقط نگاه، بی هیچ نوشتنی ══
        # `dropCollected` عمداً در اجرای واقعی بی‌قیدوشرط است؛ اینجا نه:
        # probe یک پرسش است، و پرسشی که چیزی پاک کند دیگر probe نیست.
        n = len(pending(q, mp))
        say("probe: %d ردیفِ بی‌خروجی" % n)
        out = os.environ.get("GITHUB_OUTPUT") or ""
        line = "work=%s\n" % ("yes" if n else "no")
        if out:
            with io.open(out, "a", encoding="utf-8") as fh:
                fh.write(line)
        sys.stdout.write(line)
        return 0

    # ══ اول پس‌گرفتن، بعد کارِ تازه ══
    # همان ترتیبی که `vbrNightly_` دارد: اول برداشت و بستن، بعد درخواست.
    # و این‌جا بی‌قید اجرا می‌شود، حتی وقتی کارِ تازه‌ای نیست — وگرنه
    # روزی که صف خالی است، فایلِ عمومی هم پاک نمی‌شود.
    try:
        dropCollected(ensureRelease(), q, mp)
    except Exception as eD:
        say("پاک‌سازیِ Release انجام نشد: %s" % str(eD)[:120])
    todo = pending(q, mp)
    say("صف: rev %s · %d ردیف · %d تای بی‌خروجی"
        % (q.get("rev"), len(q.get("items") or []), len(todo)))
    if not todo:
        say("کاری نیست.")
        return 0

    # ══ چند ردیف در یک اجرا، با بودجهٔ ساعتی ══
    # سقفِ «یکی در هر اجرا» برای قسمتِ نوزده‌دقیقه‌ای بسته شده بود (~۲۵
    # دقیقه رانر) و هیچ‌وقت برای نمونهٔ چهاردقیقه‌ای بازنگری نشد. نتیجه‌اش
    # را صاحبِ برنامه پرداخت: دو تیک یعنی دو اجرا، و با cron شش‌ساعته تا
    # ۱۲ ساعت انتظار برای دو فایلِ چهاردقیقه‌ای.
    #
    # معیار **زمان** است نه تعداد، چون همان چیزی است که واقعاً کم می‌آید:
    # ردیفِ تازه فقط وقتی شروع می‌شود که از بودجه نگذشته باشیم، پس ردیفی
    # که شروع شد همیشه ~۳۰ دقیقهٔ کاملِ خودش را دارد. حسابش در
    # `run_voicepipe_test.js` ۱۸ از روی خودِ منبع سنجیده می‌شود:
    #     نصبِ کتابخانه‌ها + بودجه + بلندترین ردیف ≤ timeout-minutesِ job
    budgetMin = float(os.environ.get("VBR_RUN_BUDGET_MIN") or "45")
    tStart = __import__("time").time()
    okN, badN, left = 0, 0, 0
    for i, it in enumerate(todo):
        spent = (__import__("time").time() - tStart) / 60.0
        if i > 0 and spent >= budgetMin:
            left = len(todo) - i
            say("بودجهٔ %.0f دقیقه‌ایِ اجرا پر شد (%.1f دقیقه). %d ردیف "
                "برای اجرای بعد می‌مانَد." % (budgetMin, spent, left))
            break
        # ══ ردیفِ بعد نباید چیزی از ردیفِ پیش ببیند ══
        # `vblab` را با `rvc-*.wav` می‌گردیم و **بزرگ‌ترین** را برمی‌داریم.
        # اگر خروجیِ ردیفِ پیش سرِ جایش بماند، ردیفِ دوم می‌تواند صوتِ
        # گویندهٔ اول را به نامِ گویندهٔ دوم آپلود کند — بی هیچ خطایی، و
        # فقط با گوش شنیدنی. همان شکلِ `dsSig_`: پروندهٔ یک نفر برای
        # نفرِ دیگر «موجود» حساب شود.
        __import__("shutil").rmtree("vb", ignore_errors=True)
        __import__("shutil").rmtree("vblab", ignore_errors=True)
        # ══ یک ردیفِ خراب، ردیف‌های سالم را با خودش نمی‌بَرد (۷٫۵۹) ══
        # و نقشه پس از **هر** ردیف ذخیره می‌شود، پس اجرایی که وسطِ کار
        # کشته شود آنچه تمام کرده را نگه می‌دارد.
        if runOne(it, mp) == 0:
            okN += 1
        else:
            badN += 1
    say("اجرا: %d موفق · %d ناموفق · %d در نوبتِ اجرای بعد" % (okN, badN, left))
    return 1 if badN else 0


def runOne(it, mp):
    """یک ردیفِ صف: برداشتنِ صوت و مدل، تبدیل، آپلود، ثبت در نقشه."""
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
    # ══ گام از زیروبمِ خودِ ورودی، نه یک عددِ ثابت (۸٫۲۴) ══
    # −۱۲ روی صدای مبدأِ زن‌گونه درست بود؛ روی صدای مرد، رضوی را یک اکتاو
    # زیرِ خودش می‌بُرد — ۶۰ هرتز در برابرِ ۱۰۶٫۹ِ صدای واقعی‌اش. اگر سنجش
    # نشد، همان گامِ پشتیبان می‌مانَد و این **گفته می‌شود**، نه بی‌صدا.
    pitch = str(pr.get("pitch", "-12"))
    pitchAuto = None
    tgt = pr.get("targetHz")
    if tgt:
        try:
            tgtF = float(tgt)
        except (TypeError, ValueError):
            tgtF = 0.0
        stIn = f0Stats("vb/src.wav") if tgtF > 0 else None
        if stIn:
            pitch = str(autoPitch(stIn["medianHz"], tgtF))
            pitchAuto = {"srcHz": stIn["medianHz"], "targetHz": tgtF,
                         "pitch": int(pitch)}
            say("  گامِ خودکار: ورودی %.1f هرتز ⇒ هدف %.1f ⇒ %s نیم‌پرده"
                % (stIn["medianHz"], tgtF, pitch))
        else:
            say("::warning title=زیروبمِ ورودی سنجیده نشد::گامِ پشتیبان %s به کار رفت."
                % pitch)
    # ══ گروه‌های صدا و نقشهٔ موسیقی (۹.۳۶) ══
    vg, segs = None, it.get("segs") or []
    if segs and tgt:
        try:
            xs, srS = readMono("vb/src.wav")
            vg = voiceGroups(segs, xs, srS, float(tgt))
        except Exception as e:
            say("::warning title=گروه‌بندیِ صدا نشد::%s" % str(e)[:200])
            vg = None
        if vg:
            pitch = str(vg["groups"][0]["pitch"])
            pitchAuto = {"srcHz": vg["groups"][0]["hz"], "targetHz": float(tgt), "pitch": int(pitch),
                         "groups": vg["groups"], "by": "speech-only"}
            say("  گروه‌های صدا (فقط گفتار، بی موسیقی): " + " · ".join(
                "%.0f هرتز ⇒ %+d نیم‌پرده (%.0f ثانیه)" % (g["hz"], g["pitch"], g["secs"]) for g in vg["groups"]))
    elif not segs:
        say("::warning title=نقشهٔ گفتار/موسیقی نیامد::کلِ فایل با یک گام تبدیل می‌شود و موسیقی هم از تبدیل می‌گذرد.")
    args = ["python3", "tools/voicelab.py", "--engine", "rvc",
            "--ref", "vb/src.wav",          # voicelab مرجع را اجباری می‌داند
            "--src", "vb/src.wav", "--out", "vblab",
            "--src-seconds", str(int(srcSec) + 1),
            # ══ گینِ ثابت برای مبدأ (۸.۲۷) ══
            # `loudnorm`ِ پویا بلندیِ هر چند ثانیه را جدا به هدف می‌رساند؛
            # پس «آرام» و «بلند»ی که موتور در خودِ صدا ساخته، پیش از تبدیل
            # صاف می‌شدند. یک عدد برای کلِ فایل، تفاوت را نگه می‌دارد.
            "--src-static",
            "--rvc-model", "vb/model.pth",
            "--rvc-pitch", pitch,
            # ۲۰ اکتبر: گامِ پل از گفتارِ تنها حساب شده؛ آزمایشگاه آن را از نو نسنجد و کنار نگذارد.
            "--rvc-pitch-exact",
            "--rvc-index-rate", str(pr.get("indexRate", "1.0")),
            "--rvc-protect", str(pr.get("protect", "0.33")),
            # ══ عددِ شباهت کارِ آزمایشگاه است، نه کارِ تولید ══
            # `rvcSim_` جاسازیِ گویندهٔ speechbrain را روی **کلِ** فایل
            # حساب می‌کند. در آزمایشگاه همان چیزی است که «بهترین ترکیب»
            # را انتخاب می‌کند؛ اینجا یک ترکیب بیشتر نیست و نقشه هیچ
            # عددی از آن ثبت نمی‌کند — هیچ‌کس نمی‌خوانَدش.
            #
            # و هزینه‌اش فقط وقت نیست: ۲۶ سپتامبر اجرای ۱۹ تبدیل را
            # ۰۷:۴۸:۲۳ **تمام کرد** و ۰۷:۴۹:۱۴ وسطِ همین سنجش با
            # `The runner has received a shutdown signal` کشته شد. صوتِ
            # آماده رفت چون کاری که لازم نبود بینِ «ساخته شد» و «ثبت شد»
            # ایستاده بود. لغو از سمتِ گیت‌هاب را نمی‌شود بست؛ پنجره‌اش
            # را می‌شود کوچک کرد.
            "--no-sim"]
    if haveIdx:
        args += ["--rvc-index", "vb/model.index"]
    t0 = __import__("time").time()
    # ══ خروجی را بلعیدن ممنوع ══
    # نسخهٔ اولِ voice-intake با `|| echo` شکست را به «آماده» تبدیل کرد.
    subprocess.check_call(args)
    mins = (__import__("time").time() - t0) / 60.0
    # ══ تبدیلِ دوم برای نمونه (۹.۱۱) ══ همان ورودی، همان گام، فقط `index_rate`ِ دیگر — شکستش ردیف را نمی‌اندازد.
    # ۹.۲۳: تبدیلِ دوم `protect`ِ دیگر هم می‌تواند داشته باشد — محافظِ همخوانِ بی‌واک و نفس، جایی که «ه» ⇐ «خ» از آن است.
    abIt = it.get("ab") or {}
    altRaw, abRate, abProt = None, str(abIt.get("indexRate") or ""), str(abIt.get("protect") or "")
    abLabel = ("index_rate " + abRate if abRate else "") + (" protect " + abProt if abProt else "")
    if abRate or abProt:
        try:
            a2 = list(args)
            a2[a2.index("--out") + 1] = "vblab-ab"
            if abRate:
                a2[a2.index("--rvc-index-rate") + 1] = abRate
            if abProt:
                a2[a2.index("--rvc-protect") + 1] = abProt
            subprocess.check_call(a2)
            for root, _dirs, files in os.walk("vblab-ab"):
                for f in files:
                    if f.startswith("rvc-") and f.endswith(".wav"):
                        altRaw = os.path.join(root, f)
            say("  تبدیلِ دوم (%s): %s" % (abLabel.strip(), "ساخته شد" if altRaw else "فایلی نداد"))
        except Exception as e:
            say("::warning title=تبدیلِ دوم نشد::%s" % str(e)[:200])

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
    mix = None
    segP = None
    if vg:
        try:
            gOuts = [best]
            for gi, g in enumerate(vg["groups"][1:], start=1):
                a3 = list(args)
                a3[a3.index("--out") + 1] = "vblab-g%d" % gi
                a3[a3.index("--rvc-pitch") + 1] = str(g["pitch"])
                subprocess.check_call(a3)
                o3 = []
                for root, _dirs, files in os.walk("vblab-g%d" % gi):
                    o3 += [os.path.join(root, f) for f in files if f.startswith("rvc-") and f.endswith(".wav")]
                if not o3:
                    raise RuntimeError("تبدیلِ گروهِ %d فایلی نداد" % (gi + 1))
                gOuts.append(sorted(o3, key=lambda p: -os.path.getsize(p))[0])
            asg, lagS = vg["assign"], None
            if it.get("segPitch"):
                sp = segPitchPlan(vg)
                if sp and sp["variants"]:
                    pOut = {int(g["pitch"]): gi for gi, g in enumerate(vg["groups"])}
                    lagS = [[vg["speech"][i] for i in range(len(vg["speech"])) if vg["assign"][i] == gi]
                            for gi in range(len(vg["groups"]))]
                    for vp in sp["variants"]:
                        a4 = list(args)
                        a4[a4.index("--out") + 1] = "vblab-p%+d" % vp
                        a4[a4.index("--rvc-pitch") + 1] = str(vp)
                        subprocess.check_call(a4)
                        o4 = []
                        for root, _dirs, files in os.walk("vblab-p%+d" % vp):
                            o4 += [os.path.join(root, f) for f in files if f.startswith("rvc-") and f.endswith(".wav")]
                        if not o4:
                            raise RuntimeError("تبدیلِ گامِ %+d فایلی نداد" % vp)
                        gOuts.append(sorted(o4, key=lambda q: -os.path.getsize(q))[0])
                        pOut[vp] = len(gOuts) - 1
                        # هم‌ترازی با همهٔ تکه‌های گروهی که بیشترِ تکه‌های این گام از آن‌اند
                        gs = [vg["assign"][i] for i in range(len(sp["pitch"])) if sp["pitch"][i] == vp]
                        lagS.append(lagS[max(set(gs), key=gs.count)] if gs else [])
                    asg = [pOut.get(int(p), vg["assign"][i]) for i, p in enumerate(sp["pitch"])]
                if sp:
                    segP = {"moved": sp["moved"], "of": len(sp["pitch"]), "variants": sp["variants"],
                            "maxDev": sp["maxDev"], "tol": sp["tol"], "cap": sp["cap"]}
                    say("  زیروبمِ هر تکه: %d از %d تکه برگردانده شد (بیشترین فاصله %.1f نیم‌پرده؛ گام‌های تازه: %s)"
                        % (sp["moved"], len(sp["pitch"]), sp["maxDev"], ", ".join("%+d" % v for v in sp["variants"]) or "هیچ"))
            mix = assemble("vb/src.wav", gOuts, vg["speech"], asg, "vb/mixed.wav", lagSegs=lagS)
            best = "vb/mixed.wav"
            say("  چیدن: %.0f ثانیه گفتار از تبدیل، %.0f ثانیه (موسیقی و باقی) از خودِ ورودی"
                % (mix["speechSec"], mix["keptSec"]))
        except Exception as e:
            # تبدیلِ دوم یا چیدن نشد ⇒ ردیف بسته نمی‌شود: خروجیِ «موسیقیِ گلدوزی» همان چیزی است که این نسخه برای بستنش آمد.
            say("::error title=چیدنِ گفتار و موسیقی نشد::%s — ردیف بسته نمی‌شود." % str(e)[:200])
            return 1
    # ══ سقفِ اوج (۱۲.۵) ══ فقط وقتی ردیف خواسته — نمونه؛ شکستش ردیف را نمی‌اندازد و علتش ثبت می‌شود.
    f0capRes = None
    if it.get("f0cap"):
        try:
            import math
            import numpy as np
            capSt = float(it.get("f0cap") or 3)
            tHz = float((pitchAuto or {}).get("targetHz") or 0)
            if not tHz:
                raise RuntimeError("هدفِ زیروبمِ گوینده معلوم نیست")
            capHz = tHz * 2 ** (capSt / 12.0)
            xb, srb = readMono(best)
            tr = f0Track(xb, srb)
            spans = [sp for i, sp in enumerate(vg["speech"]) if vg["assign"][i] == 0] if vg else None
            regs = capRegions(tr, capHz, spans=spans)
            voiced = [h for _t, h in tr if h > 0]
            before = round(100.0 * sum(1 for h in voiced if h > capHz) / max(1, len(voiced)), 1)
            if not regs:
                f0capRes = {"capSt": capSt, "targetHz": round(tHz, 1), "capHz": round(capHz, 1), "regions": 0, "sec": 0,
                            "pitch": "—", "overBefore": before, "overAfter": before}
            else:
                over = [h for _t, h in tr if h > capHz]
                k = int(min(5, max(2, math.ceil(12 * math.log2(float(np.median(over)) / capHz)) + 1)))
                base = int((vg["groups"][0]["pitch"]) if vg else int(pitch))
                a5 = list(args)
                a5[a5.index("--out") + 1] = "vblab-cap"
                a5[a5.index("--rvc-pitch") + 1] = str(base - k)
                subprocess.check_call(a5)
                o5 = []
                for root, _dirs, files in os.walk("vblab-cap"):
                    o5 += [os.path.join(root, f) for f in files if f.startswith("rvc-") and f.endswith(".wav")]
                if not o5:
                    raise RuntimeError("تبدیلِ گامِ %+d فایلی نداد" % (base - k))
                sp5 = capSplice(best, sorted(o5, key=lambda q: -os.path.getsize(q))[0], regs, "vb/f0cap.wav")
                best = "vb/f0cap.wav"
                xa, sra = readMono(best)
                va = [h for _t, h in f0Track(xa, sra) if h > 0]
                after = round(100.0 * sum(1 for h in va if h > capHz) / max(1, len(va)), 1)
                f0capRes = {"capSt": capSt, "targetHz": round(tHz, 1), "capHz": round(capHz, 1), "regions": len(regs),
                            "sec": sp5["sec"], "pitch": "%+d" % (base - k), "lagSec": sp5["lagSec"], "corr": sp5["corr"],
                            "overBefore": before, "overAfter": after}
            say("  سقفِ اوج: %s" % json.dumps(f0capRes, ensure_ascii=False))
        except Exception as e:
            f0capRes = {"why": str(e)[:160]}
            say("::warning title=سقفِ اوج نشد::%s" % str(e)[:200])

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

    # ══ رنگ، پیش از بلندی (۹.۰۵) ══ ردیفی که رنگ خواسته و نگرفته، **بسته نمی‌شود**: فایلی که نامش
    # «رنگِ ضبط‌های قدیم» است و همان صدای تمیز را دارد، همان ادعای نیمه‌ای است که او باید بگیرد.
    colour = None
    preColour = best          # ۹.۲۴: همان تبدیل، پیش از رنگ — برای سنجشِ «ه» ⇐ «خ» با و بی رنگ
    cw = it.get("colour") or {}
    if cw.get("refs"):
        cref = []
        for i, r in enumerate(cw["refs"][:4]):
            p = "vb/cref%d.audio" % i
            if grab(r.get("url"), p):
                cref.append(p)
        colour = colourMatch(best, cref, os.path.join(os.path.dirname(best), "colour-out.wav")) \
            if cref else {"ok": False, "why": "هیچ ضبطِ مرجعی برداشته نشد"}
        if not colour.get("ok"):
            say("::error title=رنگ گرفته نشد::%s — %s" % (key, colour.get("why")))
            return 1
        best = os.path.join(os.path.dirname(best), "colour-out.wav")
        colour["from"] = str(cw.get("from") or "")
        say("  رنگ: فاصلهٔ طیف با ضبط‌های خودش %.1f ⇒ %.1f دسی‌بل (%d مرجع، بیشترین کاهش %.0f)"
            % (colour["before"], colour["after"], colour["refs"], colour["maxCut"]))

    # بلندی، پیش از بُرش — تا همهٔ تکه‌ها یک گین داشته باشند (۸.۳۷). شکست
    # در سنجش خروجی را نمی‌اندازد: فایلِ خام می‌رود و «نسنجیدم» ثبت می‌شود.
    loud = None
    try:
        normed = os.path.join(os.path.dirname(best), "loud-out.wav")
        loud = loudFix(best, normed)
        if loud and wavSeconds(normed) >= outSec * 0.99:
            best = normed
            say("  بلندی: %.1f ⇒ %s LUFS (گینِ %+.1f دسی‌بل%s)"
                % (loud["rawLufs"], loud["lufs"], loud["gainDb"],
                   "، قله محدود شد" if loud["limited"] else ""))
        else:
            loud = None
            say("::warning title=بلندیِ خروجی سنجیده نشد::فایلِ خام رفت.")
    except Exception as e:
        loud = None
        say("::warning title=بلندیِ خروجی تنظیم نشد::%s" % str(e)[:200])

    altOut = None
    # ۹.۲۴: «nocolour» = تبدیلِ دوم همان تبدیلِ اول است، فقط بی رنگ — بی هیچ تبدیلِ اضافه. protect «خ» را نبست
    # (۴۰ در برابرِ ۴۳)؛ نامزدِ بعدی همسان‌سازیِ طیف با ضبط‌های ۱۱ کیلوهرتزیِ قدیمِ اوست (تا ‎−۲۷ دسی‌بل): «ه» نفسِ
    # پهن‌باند است و بی بسامدهای بالا «خ» شنیده می‌شود. حدس نیست تا سنجیده شود.
    if abIt.get("nocolour") and preColour != best:
        try:
            nl0 = os.path.join(os.path.dirname(preColour), "loud-nc.wav")
            altOut = nl0 if loudFix(preColour, nl0) else preColour
            abLabel = "بی رنگ"
        except Exception as e:
            say("::warning title=نسخهٔ بی‌رنگ ساخته نشد::%s" % str(e)[:200])
    # ۹.۵۳: «uv» = همان خروجیِ اصلی، با همخوان‌های بی‌واکِ ورودی — بی هیچ تبدیلِ اضافه.
    uvRes = None
    if abIt.get("uv"):
        try:
            uvp = os.path.join(os.path.dirname(best), "uv-out.wav")
            uvRes = uvSplice(best, "vb/src.wav", uvp)
            if uvRes.get("ok"):
                altOut = uvp
                abLabel = "همخوانِ بی‌واک از ورودی"
                say("  همخوانِ بی‌واک از ورودی: %d قاب (%.1f٪)، هم‌ترازی %+.1f دسی‌بل"
                    % (uvRes["frames"], uvRes["pct"], uvRes["gainDb"]))
            else:
                say("::warning title=همخوانِ بی‌واک جابه‌جا نشد::%s" % uvRes.get("why", ""))
        except Exception as e:
            say("::warning title=همخوانِ بی‌واک جابه‌جا نشد::%s" % str(e)[:200])
    if altRaw:
        try:
            cur = altRaw
            if cw.get("refs") and colour and colour.get("ok"):
                cref = ["vb/cref%d.audio" % i for i in range(4) if os.path.exists("vb/cref%d.audio" % i)]
                cc = colourMatch(cur, cref, os.path.join(os.path.dirname(cur), "colour-ab.wav"))
                if cc.get("ok"):
                    cur = os.path.join(os.path.dirname(cur), "colour-ab.wav")
            nl = os.path.join(os.path.dirname(cur), "loud-ab.wav")
            if loudFix(cur, nl):
                cur = nl
            altOut = cur
        except Exception as e:
            say("::warning title=تبدیلِ دوم پرداخت نشد::%s" % str(e)[:200])
    # ۹.۶۳: «خ»ی که تبدیل افزود، روی **خروجیِ اصلی** درمان می‌شود (نه نسخهٔ دوم) — همان فایلی که او می‌شنود؛ و نسخهٔ
    # بی‌درمان «تبدیلِ دوم» می‌شود تا شنیدن هر دو را در یک اجرا بشمارد (`khOut` با درمان، `khAlt` بی آن).
    hxRes = None
    if it.get("hx") and HX_SPLICE_ON:
        try:
            hxp = os.path.join(os.path.dirname(best), "hx-out.wav")
            hxRes = fricSplice(best, "vb/src.wav", hxp)
            if hxRes.get("ok"):
                if not altOut:
                    altOut = best
                    abLabel = "بی درمانِ «خ»"
                best = hxp
                say("  سایشِ افزوده از ورودی: %d قاب (%.1f٪ گفتار)، آستانه %.0f دسی‌بل"
                    % (hxRes["frames"], hxRes["pct"], hxRes["thrDb"]))
            else:
                say("::warning title=درمانِ «خ» نشد::%s" % hxRes.get("why", ""))
        except Exception as e:
            hxRes = {"ok": False, "why": str(e)[:120]}
            say("::warning title=درمانِ «خ» نشد::%s" % str(e)[:200])
    hear = None
    rise = None
    riseEnd = None
    if str(key).startswith("نمونه"):
        try:
            rise = riseScan("vb/src.wav")
            if rise:
                say("  پایانِ بالارونده پیش از مکث (ورودی): %d از %d (%.0f٪)" % (rise["rise"], rise["pauses"], rise["pct"]))
            # ۹.۶۳: مکثِ ≥ ۴۰۰ میلی‌ثانیه = پایانِ جمله؛ کاما بالا رفتنِ طبیعیِ «ادامه دارد» است و در این عدد نیست.
            riseEnd = riseScan("vb/src.wav", minPause=0.4)
            if riseEnd:
                say("  پایانِ جمله‌ها بالارونده: %d از %d (%.0f٪)" % (riseEnd["rise"], riseEnd["pauses"], riseEnd["pct"]))
        except Exception as e:
            say("::warning title=پایانِ عبارت‌ها سنجیده نشد::%s" % str(e)[:200])
        try:
            hear = hearCompare("vb/src.wav", best, altOut)
            if hear:
                say("  شنیدن: خروجی با ورودی %.0f٪ هم‌خوان، «خ»ِ افزوده %d%s" % (hear["srcOut"] * 100, hear.get("khOut", 0),
                    (" · تبدیلِ دوم %.0f٪، «خ»ِ افزوده %d" % (hear["alt"] * 100, hear.get("khAlt", 0))) if "alt" in hear else ""))
        except Exception as e:
            say("::warning title=شنیدن نشد::%s" % str(e)[:200])

    cap = pieceCap()
    pieces = splitWav(best, cap)
    if not pieces:
        say("::error title=تکه‌تکه نشد::خروجی زیرِ سقفِ دانلود بُرش نخورد؛ "
            "ردیف بسته نمی‌شود.")
        return 1

    rel = ensureRelease()
    urls, pbytes = [], []
    for i, pp in enumerate(pieces):
        nm = assetName(key, i, len(pieces))
        u = uploadAsset(rel, pp, nm)
        if not u:
            say("::error title=آپلود نشد::%s — نشانی برنگشت." % nm)
            return 1
        urls.append(u)
        pbytes.append(os.path.getsize(pp))

    # ══ `url` فقط برای تکِ تنها ══
    # موتورِ ۷٫۶۵ و پیش‌تر `urls` را نمی‌شناسد و فقط `url` را می‌خوانَد. پس
    # در حالتِ چندتکه `url` **نوشته نمی‌شود** — عمدی: آن موتور منتظر
    # می‌مانَد به‌جای اینکه تکهٔ اول را به‌عنوانِ کلِ قسمت کنارِ اصل بگذارد.
    # همان امتناعِ بخشِ ۲۷ از انتشارِ مجموعهٔ ناقص.
    rec = {"urls": urls, "pieceBytes": pbytes, "bytes": sum(pbytes),
           "seconds": round(outSec, 1), "minutes": round(mins, 1),
           "parts": len(parts), "pieces": len(pieces),
           "speaker": str(it.get("speaker") or ""),
           "at": __import__("datetime").datetime.utcnow()
           .strftime("%Y-%m-%dT%H:%M:%SZ")}
    if len(urls) == 1:
        rec["url"] = urls[0]
    rec["pitch"] = pitch
    if loud:
        rec["loud"] = loud
    if pitchAuto:
        rec["pitchAuto"] = pitchAuto
    if mix:
        rec["mix"] = mix
    if colour:
        rec["colour"] = colour
    if hear:
        rec["hear"] = hear
    if rise:
        rec["rise"] = rise
    if riseEnd:
        rec["riseEnd"] = riseEnd
    if hxRes:
        rec["hx"] = hxRes
    if segP:
        rec["segPitch"] = segP
    if f0capRes:
        rec["f0cap"] = f0capRes
    if altOut and (abRate or abProt or abIt.get("nocolour") or abIt.get("uv") or (hxRes and hxRes.get("ok"))):
        try:
            nm = assetName(key + " · ab" + (abRate or "") + ("p" + abProt if abProt else "") + ("nc" if abIt.get("nocolour") else "") + ("uv" if abIt.get("uv") else ""), 0, 1)
            u = uploadAsset(rel, altOut, nm)
            if u:
                rec["ab"] = {"indexRate": abRate, "protect": abProt, "nocolour": bool(abIt.get("nocolour")), "url": u}
                if abIt.get("uv"):
                    rec["ab"]["uv"] = uvRes
        except Exception as e:
            say("::warning title=تبدیلِ دوم آپلود نشد::%s" % str(e)[:200])
    # ══ خروجی هم سنجیده می‌شود، چون ورودی سنجیدن یعنی امید (۸٫۲۴) ══
    # «رضوی مثلِ قبل بود» تنها شاهدِ ۱ اکتبر بود — گوشِ او. این عدد همان را
    # پیش از او می‌گوید: میانهٔ زیرِ ۷۵ یا سهمِ بزرگِ زیرِ ۷۰ هرتز یعنی خروجی
    # در محدودهٔ خِرخِر نشسته.
    stOut = f0Stats(best, capHz=(float((pitchAuto or {}).get("targetHz") or 0) * 2 ** (3 / 12.0)) or None)
    if stOut:
        rec["f0Out"] = stOut
        # ══ سدِ گام (۲۰ اکتبر) ══ صدایی که گامش به هدف نرسیده، آن گوینده نیست؛ به شنونده نمی‌رسد.
        gErr = pitchGateErr(stOut, pitchAuto, vg)
        if gErr:
            say("::error title=گامِ خروجی به هدف نرسید::%s — ردیف بسته نمی‌شود." % gErr)
            return 1
        if stOut["medianHz"] < 75 or stOut["lowPct"] >= 40:
            rec["f0Warn"] = ("زیروبمِ خروجی %.0f هرتز، %d٪ زیرِ ۷۰ — محدودهٔ "
                             "خِرخِر" % (stOut["medianHz"], stOut["lowPct"]))
            say("::warning title=خروجی خیلی بم::%s — %s" % (key, rec["f0Warn"]))
    mp["items"][key] = rec
    saveMap(mp)
    say("  ✔ %s — %.1f مگابایت (خامش %.1f) در %d تکه، %.1f ثانیه، %.1f دقیقه کار"
        % (key, sum(pbytes) / 1048576.0, size / 1048576.0,
           len(pieces), outSec, mins))
    return 0


if __name__ == "__main__":
    sys.exit(main())
