#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voiceintake.py — گویندهٔ تازه: از صفِ درایو تا مدلِ سنجیده‌شده.

══ چرا این فایل هست ══
موتور (بخشِ ۳۳) می‌تواند پوشه را ببیند و تصمیم بگیرد، ولی نمی‌تواند
آموزش بدهد: Apps Script نه ffmpeg دارد، نه GPU، نه شش دقیقه بیشتر
وقت. پس همان مرزی کشیده شد که بخشِ ۲۷ برای ویدئو کشید و بخشِ ۲۳ برای
موسیقی — موتور **صف می‌نویسد**، اکشن **کار می‌کند**، موتور **نتیجه را
برمی‌دارد**. این فایل نیمهٔ دوم است.

══ و چرا حالتِ کار در گیت می‌نشیند، نه در درایو ══
اکشن می‌تواند در ریپو بنویسد (`docs/renders.json` سال‌هاست همین کار را
می‌کند) ولی برای نوشتن در درایو رمز می‌خواهد. موتور هم gitHub raw را
از قبل می‌خوانَد — همان راهی که `engine.gs` هر شب از آن می‌آید. پس
`docs/voices.json` جایی است که هر دو طرف بی هیچ رمزی به آن می‌رسند.

══ ماشینِ حالت ══
    (تازه) ─dispatch─→ آموزش ─┬─(هنوز)→ dispatch دوباره، همان‌جا
                              ├─(شکست)→ ناموفق
                              └─(done)→ سنجش ─→ آماده
موتور «ناموفق» را می‌شمارد و پس از `tryMax` بار خودش «رهاشده» می‌کند؛
شمردن آنجاست چون تاریخچه آنجاست.

══ چیزی که این فایل عمداً نمی‌کند ══
هیچ صدایی را روی هیچ قسمتی نمی‌نشاند. «پلِ رنگِ صدا» کارِ این نیست و
صاحبِ برنامه صریح گفت تا اجازه ندهد ساخته نشود. اینجا مدل **آماده**
می‌شود و می‌ایستد.
"""

import io
import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, "docs", "voices.json")
SAMPLES = os.path.join(ROOT, "docs", "voice-samples")

# همان واژه‌هایی که موتور می‌نویسد و می‌خوانَد. دو فهرست یعنی دو رفتار،
# پس اینجا فقط یک کپی هست و هر تغییری باید در `VINT_ST` هم بیفتد.
ST_SEEN, ST_QUEUED = "دیده‌شد", "در صف"
ST_TRAIN, ST_MEASURE = "آموزش", "سنجش"
ST_READY, ST_THIN = "آماده", "دادهٔ کم"
ST_FAIL, ST_GIVEUP = "ناموفق", "رهاشده"
DONE = (ST_READY, ST_GIVEUP)

REPO = os.environ.get("GITHUB_REPOSITORY", "mahdighandi1989/Content-Engine")


def say(m):
    print(m, flush=True)


def sh(args, check=False):
    r = subprocess.run(args, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError("%s → %s" % (" ".join(args[:3]), r.stderr[:400]))
    return r


def loadState(strict=True):
    """حالتِ گویندگان.

    ══ چرا خرابیِ این فایل باید **بایستد** (۷٫۲۲) ══
    این کش نیست؛ تنها چیزی است که موتور می‌خوانَد. ۷٫۲۱ هر خطایی را
    می‌بلعید و `{}` برمی‌گرداند، و `saveState` بعدی رویش می‌نوشت —
    یعنی یک فایلِ نیمه‌نوشته یعنی همهٔ گویندگانِ تمام‌شده از صفر آموزش
    می‌بینند و همه دوباره «✅ آماده» اعلام می‌شوند، از جمله ردیفِ
    دستیِ رضوی. نبودنِ فایل عادی است (بارِ اول)؛ **بد بودنش** نه.
    """
    if not os.path.exists(STATE):
        return {"rev": 0, "at": "", "speakers": {}}
    try:
        d = json.load(io.open(STATE, encoding="utf-8"))
    except Exception as e:
        if strict:
            raise SystemExit(
                "::error title=حالتِ گویندگان خوانده نشد::%s خراب است (%s). "
                "هیچ کاری انجام نشد تا حالتِ موجود پاک نشود." % (STATE, e))
        return {"rev": 0, "at": "", "speakers": {}}
    if not isinstance(d, dict) or not isinstance(d.get("speakers"), dict):
        if strict:
            raise SystemExit(
                "::error title=حالتِ گویندگان شکلِ درستی ندارد::%s باید شیئی با "
                "کلیدِ speakers (شیء) باشد. هیچ کاری انجام نشد." % STATE)
        return {"rev": 0, "at": "", "speakers": {}}
    return d


def saveState(d):
    d["rev"] = int(d.get("rev") or 0) + 1
    d["at"] = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    io.open(STATE, "w", encoding="utf-8").write(
        json.dumps(d, ensure_ascii=False, indent=1) + "\n")
    say("نوشته شد: docs/voices.json (rev %s)" % d["rev"])


def fetchQueue(fid):
    """صف را از درایو بردار.

    ⚠ درایو برای فایلی که «هرکس با لینک» نباشد **HTML** برمی‌گرداند، نه
    خطای ۴۰۳. پس شکستِ JSON اینجا تقریباً همیشه یعنی «اشتراک باز نیست»
    و پیام باید همان را بگوید، وگرنه ساعت‌ها دنبالِ باگی می‌گردی که
    نیست. همان درسی که `musicFetch_` با هدرِ RIFF گرفت: به نوعِ اعلامی
    اعتماد نکن، به چیزی که واقعاً رسیده نگاه کن.
    """
    url = "https://drive.usercontent.google.com/download?id=%s&export=download" % fid
    try:
        with urllib.request.urlopen(url, timeout=90) as r:
            raw = r.read()
    except Exception as e:
        say("::error::صفِ گویندگان برداشته نشد: %s" % e)
        return None
    head = raw[:200].lstrip()
    if head[:1] in (b"<",):
        say("::error title=صف خوانده نشد::درایو به‌جای JSON یک صفحهٔ HTML داد. "
            "یعنی فایل «هر کسی با لینک» نیست. موتور شبانه اشتراکش را باز "
            "می‌کند؛ اگر این پیام ماند، VOICE_QUEUE_ID را وارسی کن.")
        return None
    try:
        doc = json.loads(raw.decode("utf-8-sig"))
    except Exception as e:
        say("::error::صفِ گویندگان JSON نبود: %s" % e)
        return None
    # به نوعِ اعلامی اعتماد نکن، به چیزی که واقعاً رسیده نگاه کن — یک
    # فهرست یا یک عدد از `json.loads` سالم درمی‌آید و بعد `main()` را با
    # AttributeError می‌کشد.
    if not isinstance(doc, dict):
        say("::error::صفِ گویندگان باید یک شیء باشد، %s رسید." % type(doc).__name__)
        return None
    return doc


def runInfo(run_id):
    """وضعیتِ یک اجرا — از خودِ گیت‌هاب، نه از حافظهٔ ما."""
    r = sh(["gh", "run", "view", str(run_id), "-R", REPO,
            "--json", "status,conclusion,databaseId"])
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout)
    except Exception:
        return None


def dispatch(voice, file_ids, epochs, fresh):
    """یک اجرای آموزش راه بینداز و شناسه‌اش را برگردان.

    `gh workflow run` شناسهٔ اجرا را برنمی‌گرداند، پس تازه‌ترین اجرای
    همان گردش‌کار خوانده می‌شود. این یک پنجرهٔ کوچکِ مسابقه دارد — اگر
    کسی هم‌زمان دستی اجرا کند، شناسهٔ او برداشته می‌شود. برای همین
    `voice` هم از خودِ اجرا وارسی می‌شود و اگر جور نبود، دفعهٔ بعد
    تصحیح می‌شود: حدسِ اشتباه، حالتِ اشتباهِ ماندگار نمی‌سازد.
    """
    args = ["gh", "workflow", "run", "voice-train.yml", "-R", REPO,
            "-f", "voice=" + voice, "-f", "file_ids=" + ",".join(file_ids),
            "-f", "epochs=" + str(epochs)]
    if fresh:
        args += ["-f", "allow_fresh=true"]
    r = sh(args)
    if r.returncode != 0:
        say("::warning::راه‌اندازیِ آموزشِ «%s» نشد: %s" % (voice, r.stderr[:300]))
        return ""
    import time
    time.sleep(12)          # گیت‌هاب اجرا را بی‌درنگ فهرست نمی‌کند
    q = sh(["gh", "run", "list", "-R", REPO, "-w", "voice-train.yml",
            "-L", "1", "--json", "databaseId,createdAt"])
    try:
        rows = json.loads(q.stdout)
        return str(rows[0]["databaseId"]) if rows else ""
    except Exception:
        return ""


def artifactState(run_id, voice, dest):
    """`state.json` از artifactِ آن اجرا — تنها جوابِ «تمام شد؟».

    فایلِ نهایی از آموزشِ **قبلی** هم می‌تواند مانده باشد، پس «فایل هست»
    جوابِ این سؤال نیست؛ `finish_` دقیقاً برای همین `done` را می‌نویسد.
    """
    os.makedirs(dest, exist_ok=True)
    r = sh(["gh", "run", "download", str(run_id), "-R", REPO,
            "-n", "voice-" + voice, "-D", dest])
    if r.returncode != 0:
        say("برداشتنِ artifactِ %s نشد: %s" % (run_id, r.stderr[:200]))
        return None
    p = os.path.join(dest, "state.json")
    if not os.path.exists(p):
        return None
    try:
        return json.load(io.open(p, encoding="utf-8"))
    except Exception:
        return None


def plan(q, st):
    """یک گام برای هر گوینده. بیش از یک گام در یک اجرا یعنی حالتی که
    هیچ‌کس نمی‌تواند بازسازی‌اش کند."""
    sp = st["speakers"]
    active = sum(1 for k, v in sp.items()
                 if v.get("stage") in (ST_TRAIN, ST_MEASURE))
    cap = max(1, int(q.get("maxActive") or 2))
    minutes = max(1, int(q.get("minMinutes") or 20))
    epochs = int(os.environ.get("VI_EPOCHS", "32"))
    measure = ""
    changed = False

    for item in (q.get("speakers") or []):
        key = str(item.get("key") or "").strip()
        if not key:
            continue
        name = str(item.get("name") or key)
        ids = [str(f.get("id")) for f in (item.get("files") or []) if f.get("id")]
        cur = sp.get(key) or {}
        stage = cur.get("stage") or ""
        if stage in DONE:
            continue
        cur.setdefault("name", name)
        cur["name"] = name
        cur["files"] = len(ids)

        if stage == ST_MEASURE:
            # ══ «و نه measure» بود، و همان «و» باگ بود (۷٫۲۲) ══
            # وقتی سهمِ سنجشِ این دور را گویندهٔ دیگری گرفته بود، این یکی
            # از همین شرط رد می‌شد و مستقیم می‌افتاد توی بلوکِ «گویندهٔ
            # تازه» — یعنی یک آموزشِ تمام‌شده دور ریخته می‌شد و آموزشی
            # چندساعته از نو راه می‌افتاد، و در لاگ «پیشرفت» گزارش می‌شد.
            # در پیش‌فرضِ maxActive=2 سقفِ هم‌زمانی تصادفاً پنهانش می‌کرد.
            if not measure:
                measure = key
            continue

        if stage == ST_TRAIN:
            rid_ = str(cur.get("runId") or "")
            info = None if rid_ in ("", "?") else runInfo(rid_)
            if not info:
                say("«%s»: اجرای %s پیدا نشد؛ از نو راه می‌افتد." % (name, cur.get("runId")))
                stage = ""
            elif info.get("status") != "completed":
                say("«%s»: آموزش در جریان است (%s)." % (name, info.get("status")))
                continue
            elif info.get("conclusion") != "success":
                cur["stage"] = ST_FAIL
                cur["note"] = "اجرای آموزش قرمز تمام شد (%s)." % info.get("conclusion")
                sp[key] = cur
                changed = True
                say("«%s»: آموزش شکست خورد." % name)
                continue
            else:
                stt = artifactState(cur.get("runId"), key,
                                    os.path.join("vi-art", key))
                if stt is None:
                    # ══ artifact نرسید ⇒ شکست، نه «ادامه بده» (۷٫۲۲) ══
                    # ۷٫۲۱ اینجا می‌افتاد توی شاخهٔ «هنوز تمام نشده» و یک
                    # آموزشِ پنج‌ساعتهٔ تازه راه می‌انداخت — هر شش ساعت، تا
                    # ابد. و چون هیچ ردیفِ «ناموفق» نوشته نمی‌شد، شمارندهٔ
                    # موتور بالا نمی‌رفت، پس «رهاشده» **هرگز** ممکن نبود.
                    # artifact پس از ۳۰ روز منقضی می‌شود، یعنی این مسیر
                    # محتمل‌ترین مسیرِ شکست است، نه نادرترین.
                    cur["stage"] = ST_FAIL
                    cur["note"] = ("artifactِ اجرای %s برداشته نشد "
                                   "(منقضی شده یا نامش جور نیست)."
                                   % cur.get("runId"))
                    sp[key] = cur
                    changed = True
                    say("::warning title=artifact نرسید::«%s»: artifactِ اجرای %s "
                        "برداشته نشد؛ ناموفق ثبت شد." % (name, cur.get("runId")))
                    continue
                if stt.get("done"):
                    cur["stage"] = ST_MEASURE
                    cur["epochs"] = stt.get("epochs_reached")
                    cur["note"] = "آموزش تمام شد؛ نوبتِ سنجش."
                    sp[key] = cur
                    changed = True
                    if not measure:
                        measure = key
                    say("«%s»: آموزش تمام شد (دورِ %s)." % (name, cur["epochs"]))
                    continue
                # هنوز تمام نشده: آموزش عمداً تکه‌تکه است، پس ادامه می‌دهیم.
                if active >= cap:
                    say("«%s»: نوبتش هست ولی سقفِ هم‌زمانی پر است." % name)
                    continue
                rid = dispatch(key, ids, epochs, False)
                if rid:
                    cur["runId"] = rid
                    cur["note"] = "ادامهٔ آموزش از دورِ %s." % (
                        (stt or {}).get("epochs_reached", "؟"))
                    sp[key] = cur
                    changed = True
                    active += 1
                    say("«%s»: ادامهٔ آموزش، اجرای %s." % (name, rid))
                continue

        # تازه، یا ناموفقی که موتور هنوز رهایش نکرده
        if not ids:
            cur["stage"] = ST_THIN
            cur["note"] = "هیچ فایلِ صوتیِ قابلِ استفاده‌ای در صف نبود."
            sp[key] = cur
            changed = True
            continue
        est = int(item.get("estMinutes") or 0)
        if est and est < minutes:
            # حدس است نه اندازه‌گیری، پس **جلو نمی‌گیرد** — فقط ثبت می‌شود.
            say("«%s»: حدسِ طول %d دقیقه است، زیرِ کفِ %d. ادامه می‌دهیم و "
                "عددِ واقعی را پس از پاک‌سازی می‌نویسیم." % (name, est, minutes))
        if active >= cap:
            say("«%s»: در نوبت؛ سقفِ هم‌زمانی (%d) پر است." % (name, cap))
            continue
        # هرگز دوباره allow_fresh نده وقتی یک بار چیزی راه افتاده — حتی
        # اگر شناسه‌اش را گم کرده باشیم. کشِ موجود ارزشِ بیشتری دارد از
        # یک شروعِ تمیز.
        fresh = not cur.get("runId") and not cur.get("everDispatched")
        cur["everDispatched"] = True
        rid = dispatch(key, ids, epochs, fresh)
        cur["fileIds"] = ids          # مرجعِ سنجش از همین برداشته می‌شود
        if rid:
            cur["stage"] = ST_TRAIN
            cur["runId"] = rid
            cur["note"] = "آموزش راه افتاد (%d فایل)." % len(ids)
            sp[key] = cur
            changed = True
            active += 1
            say("«%s»: آموزش راه افتاد، اجرای %s." % (name, rid))
        else:
            # ══ شناسهٔ اجرا گم شد ⇒ باز هم بنویس (۷٫۲۲) ══
            # ۷٫۲۱ در این حالت **هیچ‌چیز** نمی‌نوشت و هیچ خطی چاپ نمی‌کرد.
            # چون `fresh = not cur.get("runId")`، اجرای بعدی دوباره با
            # `allow_fresh=true` می‌رفت — همان پرچمی که هست تا کسی کارِ
            # پیشین را دور نریزد. یعنی یک آموزش یتیم می‌شد و یکی از صفر
            # شروع، با لاگی کاملاً سبز.
            cur["stage"] = ST_TRAIN
            cur["runId"] = cur.get("runId") or "?"
            cur["note"] = ("راه افتاد ولی شناسهٔ اجرا خوانده نشد؛ "
                           "دورِ بعد وارسی می‌شود.")
            sp[key] = cur
            changed = True
            active += 1
            say("::warning title=شناسهٔ اجرا گم شد::«%s»: gh اجرا را راه انداخت "
                "ولی شناسه‌اش خوانده نشد. allow_fresh دیگر فرستاده نمی‌شود." % name)

    return changed, measure


def record(key, sim, samples, note, ok=True):
    """نتیجهٔ سنجش را ثبت کن."""
    st = loadState()
    cur = st["speakers"].get(key) or {}
    cur["stage"] = ST_READY if ok else ST_FAIL
    if sim:
        cur["similarity"] = sim
    cur["samples"] = samples
    cur["note"] = note
    st["speakers"][key] = cur
    saveState(st)


def runIdOf(key):
    """شناسهٔ اجرای آموزشِ یک گوینده."""
    st = loadState()
    return str((st["speakers"].get(key) or {}).get("runId") or "")


def bestSim(lab):
    """بهترین عددِ شباهت از گزارشِ آزمایشگاه.

    گزارش چند گونه دارد (ترکیب‌های `index_rate`/`protect`) و `best` را
    خودِ آزمایشگاه انتخاب می‌کند. نبودنش خطا نیست: یعنی تبدیل انجام نشد،
    و آن را همان‌جا که هست باید گفت، نه با یک عددِ ساختگی.
    """
    import glob
    best = None
    for p in glob.glob(os.path.join(lab, "**", "*.json"), recursive=True):
        try:
            d = json.load(io.open(p, encoding="utf-8"))
        except Exception:
            continue
        b = (d.get("rvc") or {}).get("best") or {}
        v = b.get("out_vs_ref")
        if v is None:
            continue
        try:
            v = float(v)
        except Exception:
            continue
        # «بهترین» یعنی بیشترین، نه «آخرینی که glob دید» — نامش، توضیحش و
        # عددی که اعلام می‌شود هر سه بیشترین را وعده می‌دهند.
        if best is None or v > best:
            best = v
    return "" if best is None else ("%.3f" % best)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--plan"
    if mode == "--runid":
        sys.stdout.write(runIdOf(sys.argv[2]))
        return 0
    if mode == "--refid":
        st = loadState()
        ids = (st["speakers"].get(sys.argv[2]) or {}).get("fileIds") or []
        sys.stdout.write(str(ids[0]) if ids else "")
        return 0
    if mode == "--sim":
        sys.stdout.write(bestSim(sys.argv[2] if len(sys.argv) > 2 else "lab"))
        return 0
    if mode == "--record":
        key = sys.argv[2]
        sim = sys.argv[3] if len(sys.argv) > 3 else ""
        note = sys.argv[4] if len(sys.argv) > 4 else ""
        d = os.path.join(SAMPLES, key)
        files = []
        if os.path.isdir(d):
            files = ["docs/voice-samples/%s/%s" % (key, f)
                     for f in sorted(os.listdir(d)) if f.lower().endswith(".wav")]
        record(key, sim, files, note, ok=bool(files))
        return 0

    fid = os.environ.get("VOICE_QUEUE_ID", "").strip()
    if not fid:
        say("::error::VOICE_QUEUE_ID تنظیم نشده.")
        return 1
    q = fetchQueue(fid)
    if q is None:
        return 1
    # ══ «هرگز نوشته نشده» ≠ «نوشته شد و خالی بود» (۷٫۳۳) ══
    # `vintQueue_` هر بار `rev` را یکی بالا می‌برد و `at` را مهر می‌زند، پس
    # هر صفی که واقعاً از بخشِ ۳۳ آمده باشد rev ≥ ۱ دارد. rev صفر یعنی
    # فایل دست‌ساز است و هیچ کارِ شبانه‌ای رویش ننشسته — و بی این وارسی
    # چنین فایلی «۰ گوینده» خوانده می‌شد و اجرا **سبز**. آن سبز بدترین
    # خروجیِ ممکن است: گویندهٔ منتظر هست و هیچ‌کس خبردار نمی‌شود. قرمزِ
    # صادق بهتر از سبزِ دروغ.
    # (و عمداً فقط `rev`: `at` هم همیشه مهر می‌خورد، ولی شرطِ دوم چیزی به
    # این سؤال اضافه نمی‌کند و فقط یک راهِ اضافه برای غلط‌شدن است.)
    if int(q.get("rev") or 0) < 1:
        say("::error title=صف هنوز نوشته نشده::فایلِ صف خوانده شد ولی موتور "
            "هرگز رویش ننوشته (rev %s). یعنی کارِ شبانهٔ بخشِ ۳۳ اجرا نشده و "
            "«۰ گوینده» اینجا یعنی «نمی‌دانم»، نه «کسی نیست»."
            % q.get("rev"))
        return 1
    say("صف: rev %s · %d گوینده" % (q.get("rev"), len(q.get("speakers") or [])))
    st = loadState()
    changed, measure = plan(q, st)
    if changed:
        saveState(st)
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        io.open(gh, "a", encoding="utf-8").write(
            "measure=%s\nchanged=%s\n" % (measure, "true" if changed else "false"))
    say("سنجشِ این دور: %s" % (measure or "—"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
