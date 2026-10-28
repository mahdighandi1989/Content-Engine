#!/usr/bin/env python3
"""موسیقی در صدای یک کلیپ هست یا نه — پیش از آنکه آن صدا «لحظه» شود (۱۴.۱).

۲۸ اکتبر: «از همه جا» ۸۵ در یوتیوب Content-ID خورد («Organ Variation — Hans Zimmer»، ۹:۲۲–۹:۵۵) و ۸۲ کامل
مسدود شد. آن بازه نه موسیقیِ بانک بود و نه گفتارِ گوینده: لحظه‌ای بود که کلیپِ منبع با **صدای خودش** پخش می‌شد،
و آن کلیپ زیرِ حرفش موسیقیِ فیلم داشت. هیچ سنجه‌ای نمی‌پرسید که در صدای کلیپ چه هست.

سنجه: گفتار زیروبمش را مدام می‌لغزانَد و میانِ جمله‌ها خالی است؛ موسیقی نُت‌هایش را نگه می‌دارد و مکث‌ها را پر
می‌کند. پس دو عدد، هر دو از طیف:
  tonal — سهمِ قاب‌های فعالی که دست‌کم دو قلهٔ طیفی‌شان ≥۲۵۰ میلی‌ثانیه سرِ یک بسامد مانده (نُتِ نگه‌داشته)؛
  fill  — سهمِ قاب‌هایی که انرژی دارند (گفتارِ تنها مکث دارد؛ زیرِ موسیقی مکث پر می‌شود).
خروجی JSON روی stdout. آستانه‌ها در musicVerdict، جدا از اندازه‌گیری.
"""
import json
import sys
import wave

import numpy as np

SR = 16000


def readMono16k(path):
    with wave.open(path, "rb") as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    if sw != 2:
        raise ValueError("فقط WAVِ ۱۶ بیتی")
    x = np.frombuffer(raw, "<i2").astype(np.float32) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(1)
    if sr != SR:
        m = int(len(x) * SR / sr)
        x = np.interp(np.linspace(0, len(x) - 1, m), np.arange(len(x)), x).astype(np.float32)
    return x


def musicScan(x, t0=0.0, t1=None, win=1024, hop=512, sustain=8):
    a = int(t0 * SR)
    b = len(x) if t1 is None else min(len(x), int(t1 * SR))
    x = x[a:b]
    nf = max(0, (len(x) - win) // hop)
    if nf < sustain + 4:
        return {"sec": round(len(x) / SR, 1), "tonal": 0.0, "fill": 0.0, "frames": nf}
    w = np.hanning(win).astype(np.float32)
    idx = np.arange(win)[None, :] + hop * np.arange(nf)[:, None]
    S = np.abs(np.fft.rfft(x[idx] * w, axis=1)) + 1e-9
    db = 20 * np.log10(S)
    f = np.fft.rfftfreq(win, 1.0 / SR)
    band = (f >= 80) & (f <= 4000)
    e = 10 * np.log10((S[:, band] ** 2).sum(1) + 1e-12)
    act = e > np.percentile(e, 95) - 35
    d = db[:, band]
    # قله: بیشینهٔ محلی و ≥۱۲ دسی‌بل بالای میانهٔ همان قاب
    med = np.median(d, axis=1, keepdims=True)
    pk = (d > med + 12) & (d >= np.roll(d, 1, 1)) & (d >= np.roll(d, -1, 1))
    # نگه‌داشته: همان بسامد (±۱ خانه) در `sustain` قابِ پیشین هم قله بوده
    near = pk | np.roll(pk, 1, 1) | np.roll(pk, -1, 1)
    held = pk.copy()
    for k in range(1, sustain):
        held[k:] &= near[:-k]
    held[:sustain] = False
    tonalF = held.sum(1) >= 2
    na = max(1, int(act.sum()))
    return {"sec": round(len(x) / SR, 1), "frames": int(nf),
            "tonal": round(float((tonalF & act).sum()) / na, 3),
            "fill": round(float(act.mean()), 3)}


def musicVerdict(r, tonalMax=0.12, fillMax=0.97, tonalWithFill=0.08):
    """موسیقی ⇔ نُتِ نگه‌داشتهٔ زیاد؛ یا مکثی که هرگز خالی نمی‌شود **همراهِ** نُتِ نگه‌داشتهٔ کمتر. «پُر» به‌تنهایی نه —
    تکهٔ کوتاهی از گفتارِ پیوسته هم کم مکث دارد. سنجیده (۲۸ اکتبر): گفتارِ خالصِ گوینده ۰٫۰۵ / ۰٫۷۸؛ دو کلیپِ اینستاگرامی
    با موسیقیِ زمینه ۰٫۴۴ / ۰٫۹۴ و ۰٫۴۵ / ۱٫۰ — یکی همان که Content-ID خورد."""
    why = []
    t, f = r.get("tonal", 0), r.get("fill", 0)
    if t > tonalMax:
        why.append("نُتِ نگه‌داشته در %d٪ قاب‌ها (سقف %d٪)" % (round(t * 100), round(tonalMax * 100)))
    elif f > fillMax and t > tonalWithFill:
        why.append("مکث‌ها پر است (%d٪) و نُتِ نگه‌داشته %d٪" % (round(f * 100), round(t * 100)))
    return {"music": bool(why), "why": "؛ ".join(why)}


def main(argv):
    path = argv[1]
    t0 = float(argv[2]) if len(argv) > 2 else 0.0
    t1 = float(argv[3]) if len(argv) > 3 else None
    r = musicScan(readMono16k(path), t0, t1)
    r.update(musicVerdict(r))
    print(json.dumps(r, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv)
