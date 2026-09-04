#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dsprep.py — جداکردنِ موسیقی از روایت، در **یک** نسخه.

══ چرا جداست ══
همین منطق دو جا اجرا می‌شود: در آزمایشگاه (برای اینکه با گوش داوری
شود) و در نوت‌بوکِ Colab (برای اینکه خوراکِ واقعیِ آموزش را بسازد).
دو نسخه از یک متن که با دست هم‌گام نگه داشته شوند، همان شکستی است که
این ریپو بارها خورده — پرامپت‌ها یازده نسخه این‌طور بودند. پس مثلِ
`rvcpipe.py`: منبع اینجاست و نوت‌بوک همین فایل را از گیت‌هاب raw
می‌گیرد.

و به همین دلیل به هیچ‌چیزِ `voicelab.py` وابسته نیست: نه به گزارش‌نویسی،
نه به OPT. فقط صدا می‌گیرد و تصمیم برمی‌گرداند. گزارش‌دادن کارِ
صدازننده است.
"""

import io
import math
import os
import shutil
import subprocess
import tempfile


def ffmpeg():
    """مسیرِ ffmpeg — اول از سیستم، بعد از PyPI."""
    p = shutil.which("ffmpeg")
    if p:
        return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def sh(cmd, timeout=None, **kw):
    """اجرای فرمان، با مهلت. هر فرمانِ بی‌مهلت روزی کلِ کار را می‌خورَد."""
    print("$ " + " ".join(cmd), flush=True)
    try:
        return subprocess.run(cmd, check=False, timeout=timeout, **kw)
    except subprocess.TimeoutExpired:
        class _T(object):
            returncode = 124
        print("مهلت تمام شد (%ss)" % timeout, flush=True)
        return _T()


# ══ آماده‌سازیِ دیتاست از ضبط‌های بلند ══
# ضبط‌های داستان‌خوانیِ رضوی نیم‌ساعته‌اند و تیزر و میان‌برنامه دارند.
# موسیقی در دادهٔ آموزش سم است: RVC رنگِ صدا را از **هرچه در فایل باشد**
# یاد می‌گیرد، پس «صدا روی موسیقی» را یاد می‌گیرد و بعد همان را می‌سازد.
DS_SR = 40000          # نرخِ خروجی، جفت با آموزشِ RVC
VAD_SR = 16000         # نرخی که مدلِ VAD می‌خواهد
DS_GAP_MIN = 0.30      # کوتاه‌تر از این، مکث حساب نمی‌شود
DS_SEG_MIN = 3.0       # RVC تکه‌های سه تا ده ثانیه‌ای می‌خواهد
DS_SEG_MAX = 10.0
DS_SAMPLE_SEC = 45     # طولِ هر نمونهٔ شنیداری

# ══ دو آستانه، هر دو نسبی ══
# سطحِ ضبط از فایلی به فایلِ دیگر فرق می‌کند، پس آستانهٔ مطلق (مثلاً
# «زیر ۵۰- دسی‌بل») روی یکی درست کار می‌کند و روی دیگری نه. هر دو نسبت
# به سطحِ گفتارِ **همان تکه** سنجیده می‌شوند.
DS_GAP_REL_DB = -30.0    # مکثی که از گفتار کمتر از این پایین‌تر باشد: چیزی پخش است
DS_FLOOR_REL_DB = -28.0  # کفِ داخلِ گفتار هم که بالا بماند: بسترِ موسیقی
# ══ چرا از ۲۲- به ۲۸- سفت شد، و چرا این کافی نبود ══
# کاربر در تکه‌های نگه‌داشته موسیقیِ زیرِ روایت شنید (ثانیهٔ ۲۵ تا ۳۴).
# سفت‌کردنِ آستانه نیمی از جواب است؛ نیمِ مهم‌ترش این بود که این سنجه
# روی **کلِ یک دستهٔ پیوسته** اعمال می‌شد. دسته‌ای یک‌دقیقه‌ای که فقط نُه
# ثانیه‌اش بستر دارد، در صدکِ پنجمِ کلِ دسته گم می‌شود و دست‌نخورده قبول
# می‌شود. حالا هر **تکه** جدا سنجیده می‌شود، پس همان نُه ثانیه می‌افتد و
# بقیهٔ دسته می‌مانَد.


def dbOf_(x):
    """RMS به دسی‌بل. سکوتِ مطلق ۱۲۰- می‌شود، نه منفیِ بی‌نهایت."""
    import numpy as np
    if x is None or len(x) == 0:
        return -120.0
    r = float(np.sqrt(np.mean(np.square(np.asarray(x, dtype="float64")))))
    return max(-120.0, 20.0 * math.log10(r)) if r > 0 else -120.0


def dsDecode_(src, dst, rate):
    """رمزگشاییِ خام: تک‌کاناله، با نرخِ خواسته‌شده، بی هیچ دستکاری.

    عمداً از `to_wav` استفاده نمی‌شود: آن سکوتِ ابتدا و انتها را می‌بُرد و
    نرمال‌سازی می‌کند، و اینجا دقیقاً همان چیزهایی که او دور می‌ریزد
    شواهدِ ما هستند.
    """
    import numpy as np
    import soundfile as sf
    r = sh([ffmpeg(), "-y", "-loglevel", "error", "-i", src,
            "-ac", "1", "-ar", str(rate), dst], timeout=1800)
    if r.returncode != 0 or not os.path.exists(dst):
        raise RuntimeError("رمزگشاییِ %s ناموفق بود" % os.path.basename(src))
    y, sr = sf.read(dst, dtype="float32", always_2d=False)
    return np.asarray(y).reshape(-1), sr


def dsSpeech_(y, rate, model):
    """بازه‌های گفتار، بر حسبِ ثانیه."""
    import numpy as np
    import torch
    from silero_vad import get_speech_timestamps
    t = torch.from_numpy(np.asarray(y, dtype="float32"))
    got = get_speech_timestamps(t, model, sampling_rate=rate,
                                return_seconds=True)
    return [(float(g["start"]), float(g["end"])) for g in got]


def dsSlice_(y, rate, a, b):
    return y[max(0, int(a * rate)):max(0, int(b * rate))]


def dsGaps_(y, rate, speech, total):
    """فاصله‌های بینِ گفتار، با بلندیِ هرکدام.

    سرِ فایل و تهِ فایل هم فاصله‌اند — و تیزرِ آغازین دقیقاً همان‌جاست.
    """
    edges, prev = [], 0.0
    for a, b in speech:
        if a - prev >= DS_GAP_MIN:
            edges.append((prev, a))
        prev = b
    if total - prev >= DS_GAP_MIN:
        edges.append((prev, total))
    return [{"start": round(a, 2), "end": round(b, 2),
             "db": round(dbOf_(dsSlice_(y, rate, a, b)), 1)} for a, b in edges]


def dsFloorDb_(y, rate, a, b, hop=0.02):
    """کفِ انرژی **داخلِ** یک بازهٔ گفتار.

    ══ چرا این دروازهٔ دوم لازم است ══
    دروازهٔ اول مکث‌های بینِ جمله‌ها را می‌سنجد. ولی اگر موسیقی یکسره زیرِ
    روایت باشد، VAD همه‌جا را «گفتار» می‌بیند و مکثی برای سنجیدن نمی‌مانَد.
    میانِ خودِ کلمه‌ها هم مکث هست — چند صدم ثانیه — و در گفتارِ تمیز آن
    لحظه‌ها به کف می‌افتند. اگر نیفتند، چیزی زیرش پخش است.
    """
    import numpy as np
    seg = dsSlice_(y, rate, a, b)
    n = max(1, int(hop * rate))
    if len(seg) < n * 4:
        return dbOf_(seg)
    frames = [dbOf_(seg[i:i + n]) for i in range(0, len(seg) - n, n)]
    return float(np.percentile(np.asarray(frames), 5))


def dsRuns_(y, rate, speech, gaps, speechDb):
    """گفتارها را به «دسته»های پیوسته ببُر — هرجا موسیقی هست، ببُر.

    برمی‌گرداند: (دسته‌های پذیرفته، دورریخته‌ها با دلیل).
    """
    loud = set()
    for g in gaps:
        if g["db"] - speechDb > DS_GAP_REL_DB:
            loud.add((g["start"], g["end"]))

    runs, cur = [], []
    for i, (a, b) in enumerate(speech):
        if cur:
            pa = cur[-1][1]
            broken = any(abs(s - pa) < 0.011 and e <= a + 0.011
                         for s, e in loud)
            if broken:
                runs.append(cur)
                cur = []
        cur.append((a, b))
    if cur:
        runs.append(cur)

    keep, drop = [], [{"start": s, "end": e, "why": "موسیقی/غیرِ گفتار"}
                      for s, e in sorted(loud)]
    for r in runs:
        a, b = r[0][0], r[-1][1]
        fl = dsFloorDb_(y, rate, a, b)
        # دروازهٔ دوم: کفِ داخلِ گفتار هم که بالا بماند، بستر پخش است.
        if fl - speechDb > DS_FLOOR_REL_DB:
            drop.append({"start": round(a, 2), "end": round(b, 2),
                         "why": "بسترِ موسیقی زیرِ روایت",
                         "floor_rel_db": round(fl - speechDb, 1)})
        else:
            keep.append(r)
    return keep, drop


def dsCap_(a, b):
    """بازه را به تکه‌های زیرِ سقف ببُر، با طولِ برابر.

    ══ چرا جدا از حلقه ══
    نسخهٔ اول سقف را فقط **داخلِ** حلقه می‌سنجید، پس آخرین تکه — که بعد
    از حلقه اضافه می‌شد — از هیچ دروازه‌ای رد نمی‌شد و ۱۰٫۵ ثانیه درآمد.
    و بازهٔ گفتارِ پیوسته‌ای که خودش از سقف بلندتر باشد اصلاً بریده
    نمی‌شد. یک شرط در دو جا نوشته شده بود و یکی‌شان جا مانده بود؛ حالا
    همه از یک در رد می‌شوند.
    """
    n = max(1, int(math.ceil((b - a) / DS_SEG_MAX)))
    step = (b - a) / float(n)
    return [(a + i * step, a + (i + 1) * step) for i in range(n)]


def dsSegOk_(y, rate, a, b, speechDb):
    """آیا این **تکه** بسترِ موسیقی دارد؟ (نسبت به سطحِ گفتارِ فایل)

    برمی‌گرداند (سالم؟، اختلافِ کف بر حسبِ دسی‌بل) — عدد هم برمی‌گردد تا
    گزارش بتواند توزیعش را نشان دهد. آستانه‌ای که فقط حکمش دیده شود و
    عددش نه، آستانه‌ای است که هیچ‌وقت نمی‌شود درست تنظیمش کرد.
    """
    rel = dsFloorDb_(y, rate, a, b) - speechDb
    return rel <= DS_FLOOR_REL_DB, round(rel, 1)


def dsSegments_(runs):
    """هر دسته را به تکه‌های ۳ تا ۱۰ ثانیه‌ای ببُر، ترجیحاً سرِ مکث‌ها."""
    spans = []
    for r in runs:
        start, last = r[0][0], r[0][1]
        for a, b in r[1:]:
            if b - start > DS_SEG_MAX:
                spans.append((start, last))
                start = a
            last = b
        spans.append((start, last))
    out = []
    for a, b in spans:
        out += [(x, y_) for x, y_ in dsCap_(a, b) if y_ - x >= DS_SEG_MIN]
    return out


def dsWriteCuts_(src, cuts, out, prefix, rate=DS_SR, limit=None):
    """برش‌ها را از فایلِ اصلی بیرون بکش. یک فراخوانِ ffmpeg برای هرکدام."""
    made, got = [], 0.0
    for i, (a, b) in enumerate(cuts):
        if limit is not None and got >= limit:
            break
        dst = os.path.join(out, "%s%04d.wav" % (prefix, i + 1))
        r = sh([ffmpeg(), "-y", "-loglevel", "error", "-ss", "%.3f" % a,
                "-t", "%.3f" % (b - a), "-i", src, "-ac", "1",
                "-ar", str(rate), dst], timeout=300)
        if r.returncode == 0 and os.path.exists(dst):
            made.append(dst)
            got += (b - a)
    return made


def dsJoin_(parts, dst):
    """چند تکه را به یک فایل بچسبان (برای نمونهٔ شنیداری)."""
    if not parts:
        return None
    lst = dst + ".txt"
    with io.open(lst, "w", encoding="utf-8") as f:
        for p in parts:
            f.write("file '%s'\n" % os.path.abspath(p).replace("'", "'\\''"))
    r = sh([ffmpeg(), "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
            "-i", lst, "-c", "copy", dst], timeout=600)
    return dst if r.returncode == 0 and os.path.exists(dst) else None


DS_TOTAL_MAX = 2400.0   # چهل دقیقه؛ بیشتر از این بازدهِ RVC کم می‌شود


def dsPick_(items, n):
    """n تا از سراسرِ فهرست، نه n تای اول — نمونه باید نماینده باشد."""
    if len(items) <= n:
        return list(items)
    step = len(items) / float(n)
    return [items[int(i * step)] for i in range(n)]

DS_TOTAL_MAX = 2400.0   # چهل دقیقه؛ بیشتر از این بازدهِ RVC کم می‌شود


def dsPick_(items, n):
    """n تا از سراسرِ فهرست، نه n تای اول — نمونه باید نماینده باشد."""
    if len(items) <= n:
        return list(items)
    step = len(items) / float(n)
    return [items[int(i * step)] for i in range(n)]


def buildDataset_(paths, segDir, sampleDir=None, totalMax=DS_TOTAL_MAX,
                  onFile=None):
    """از ضبط‌های بلند، تکه‌های تمیزِ آموزش بساز — و شواهدش را هم.

    ══ چرا اینجا و نه در آزمایشگاه ══
    این همان چیدمانی است که هم آزمایشگاه اجرا می‌کند (تا با گوش داوری
    شود) و هم نوت‌بوکِ Colab (تا خوراکِ واقعیِ آموزش را بسازد). اگر دو
    جا نوشته شود، روزی یکی‌شان عوض می‌شود و آنچه داوری شده با آنچه
    آموزش می‌بیند یکی نخواهد بود — و هیچ‌چیز این را نشان نمی‌دهد.

    برمی‌گرداند: (فهرستِ تکه‌ها، گزارش). `sampleDir` اگر داده شود، دو
    فایلِ شنیدنی هم ساخته می‌شود: نگه‌داشته‌ها و دورریخته‌ها.
    """
    from silero_vad import load_silero_vad

    model = load_silero_vad()
    tmp = tempfile.mkdtemp(prefix="ds-")
    files, segAll, keepDemo, dropDemo = [], [], [], []
    kept = 0.0

    for i, sp in enumerate(paths):
        y, sr = dsDecode_(sp, os.path.join(tmp, "v%d.wav" % i), VAD_SR)
        total = len(y) / float(sr)
        speech = dsSpeech_(y, sr, model)
        row = {"file": os.path.basename(sp), "seconds": round(total, 1),
               "speech_parts": len(speech)}
        if not speech:
            row["skipped"] = "هیچ گفتاری پیدا نشد"
            files.append(row)
            if onFile:
                onFile(files)
            continue

        lv = sorted(dbOf_(dsSlice_(y, sr, a, b)) for a, b in speech)
        speechDb = lv[len(lv) // 2]
        gaps = dsGaps_(y, sr, speech, total)
        keep, drop = dsRuns_(y, sr, speech, gaps, speechDb)
        # ── دروازهٔ بستر، این‌بار روی تک‌تکِ تکه‌ها ──
        segs, segRel = [], []
        for a_, b_ in dsSegments_(keep):
            ok, rel = dsSegOk_(y, sr, a_, b_, speechDb)
            segRel.append(rel)
            if ok:
                segs.append((a_, b_))
            else:
                drop.append({"start": round(a_, 2), "end": round(b_, 2),
                             "why": "بسترِ موسیقی (تکه)", "floor_rel_db": rel})
        row.update({
            "speech_seconds": round(sum(b - a for a, b in speech), 1),
            "speech_db": round(speechDb, 1),
            "gaps": len(gaps),
            # توزیع را هم می‌دهیم، نه فقط حکم را: اگر آستانه بد باشد،
            # از روی همین عددها معلوم می‌شود، نه با حدس.
            "gap_rel_db": sorted(round(g["db"] - speechDb, 1) for g in gaps)[:40],
            # توزیعِ کفِ **همهٔ** تکه‌ها — نگه‌داشته و ردشده با هم. آستانهٔ
            # بعدی از روی این عددها تنظیم می‌شود، نه با حدس.
            "seg_floor_rel_db": sorted(segRel),
            "seg_floor_cut": DS_FLOOR_REL_DB,
            "dropped": drop[:20],
            "dropped_count": len(drop),
            "segments": len(segs),
            "segment_seconds": round(sum(b - a for a, b in segs), 1),
        })
        files.append(row)
        if onFile:
            onFile(files)

        room = max(0.0, totalMax - kept)
        made = dsWriteCuts_(sp, segs, segDir, "seg%d_" % (i + 1), limit=room)
        kept += sum(b - a for a, b in segs[:len(made)])
        segAll += made
        if sampleDir:
            keepDemo += dsPick_(made, 3)
            dropDemo += dsWriteCuts_(
                sp, [(d["start"], d["end"]) for d in dsPick_(drop, 3)],
                tmp, "drop%d_" % (i + 1), limit=20.0)

    rep = {"files": files, "segments": len(segAll),
           "kept_seconds": round(kept, 1), "capped": kept >= totalMax,
           "thresholds": {"gap_rel_db": DS_GAP_REL_DB,
                          "floor_rel_db": DS_FLOOR_REL_DB}}
    if sampleDir:
        # ══ شواهدِ شنیدنی ══
        # این ریپو یک درسِ گران دارد: سه نسخه پشتِ هم باگی «رفع‌شده»
        # اعلام شد چون هیچ‌کس به خروجی گوش نداد. پس ابزار حکم صادر
        # نمی‌کند؛ نمونه‌اش را می‌دهد.
        rep["samples"] = {
            "kept": dsJoin_(dsPick_(keepDemo, 12),
                            os.path.join(sampleDir, "SAMPLE-kept.wav")),
            "dropped": dsJoin_(dsPick_(dropDemo, 12),
                               os.path.join(sampleDir, "SAMPLE-dropped.wav")),
        }
    return segAll, rep
