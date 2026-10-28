#!/usr/bin/env python3
"""پهنای باندِ **واقعیِ** یک ضبط — نه نرخِ نمونهٔ سرآیندش (۱۴.۱).

گلدوز با ضبط‌های «۲۲ کیلوهرتزی» (`r2-22k`) دوباره آموزش دید و باز سنجهٔ سایشی‌ها نشان داد مدل بالای ~۵ کیلوهرتز چیزی
نمی‌سازد: «س/ش» از ۷٫۶ به ۳٫۵ کیلوهرتز و تیزی ۱۴٫۶ دسی‌بل پایین. نرخِ سرآیند فقط سقفِ ممکن است؛ MP3ِ کم‌بیت یا ضبطِ
۱۱ کیلوهرتزیِ بالانمونه‌شده همان ۲۲۰۵۰ را می‌گوید و بالای ۵ تا ۸ کیلوهرتز هیچ ندارد. این‌جا طیفِ میانگینِ قاب‌های گفتار
گرفته می‌شود و لبه همان بسامدی است که طیف از آن به بعد ۴۵ دسی‌بل زیرِ سطحِ ۱ تا ۴ کیلوهرتز می‌افتد و دیگر برنمی‌گردد.
ورودی: هر فایلی که ffmpeg بخوانَد. خروجی JSON روی stdout.
"""
import json
import subprocess
import sys

import numpy as np

SR = 44100


def decode(path, sec=600, ff="ffmpeg"):
    raw = subprocess.check_output([ff, "-loglevel", "error", "-i", path, "-t", str(sec), "-ac", "1", "-ar", str(SR),
                                   "-f", "s16le", "-"])
    return np.frombuffer(raw, "<i2").astype(np.float32) / 32768.0


def bandEdge(x, drop=45.0, n=4096):
    hop = n // 2
    nf = (len(x) - n) // hop
    if nf < 20:
        return {"edgeHz": None, "why": "کوتاه"}
    w = np.hanning(n).astype(np.float32)
    acc, cnt = np.zeros(n // 2 + 1), 0
    e = np.array([float((x[i * hop:i * hop + n] ** 2).mean()) for i in range(nf)])
    thr = np.percentile(e, 70)                       # فقط قاب‌های پرانرژی (گفتار)، نه مکث و نویز
    for i in range(nf):
        if e[i] < thr:
            continue
        acc += np.abs(np.fft.rfft(x[i * hop:i * hop + n] * w)) ** 2
        cnt += 1
    db = 10 * np.log10(acc / max(1, cnt) + 1e-20)
    f = np.fft.rfftfreq(n, 1.0 / SR)
    ref = np.median(db[(f >= 1000) & (f <= 4000)])
    sm = np.convolve(db, np.ones(9) / 9, mode="same")
    live = np.nonzero((sm > ref - drop) & (f > 1000))[0]
    edge = float(f[live[-1]]) if len(live) else 0.0
    hi = float(np.median(db[(f >= 6000) & (f <= 10000)]) - ref)
    return {"edgeHz": int(round(edge)), "hi6to10Db": round(hi, 1), "frames": int(cnt)}


if __name__ == "__main__":
    out = []
    for p in sys.argv[1:]:
        try:
            r = bandEdge(decode(p))
        except Exception as ex:
            r = {"edgeHz": None, "why": str(ex)[:80]}
        r["file"] = p
        out.append(r)
    print(json.dumps(out, ensure_ascii=False))
