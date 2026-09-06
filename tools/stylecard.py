#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
stylecard.py — «روحِ خواندن» را از یک ضبط بیرون می‌کشد، به‌صورتِ عدد.

══ مسئله ══

مدلِ تبدیلِ صدا رنگِ صدا را می‌گیرد و بس. مکث‌ها، کشش‌ها، سرعت و فرودِ
پایانِ جمله — چیزی که کاربر «روح» می‌نامد — هیچ‌کدام خروجیِ آن مدل
نیستند؛ **ورودی**‌اش‌اند و از صوتِ مبدأ (خروجیِ Gemini) می‌آیند. پس
اگر بخواهیم رضوی‌جور خوانده شود، باید به **Gemini** گفت.

و «رضوی‌جور بخوان» یک آرزوست، نه یک دستور. این فایل آن آرزو را به
مشخصات تبدیل می‌کند.

══ چرا اندازه، و نه توصیف ══

می‌شد از یک مدل خواست به صدای رضوی گوش کند و سبکش را توصیف کند. ولی
آن توصیف نه تکرارپذیر است، نه سنجیدنی، و هیچ راهی نمی‌دهد بفهمیم
اجرا شد یا نه. عددها هر سه را می‌دهند:

  • همیشه یکی درمی‌آیند (کلید و اینترنت هم نمی‌خواهند)
  • می‌شود همان‌ها را روی **خروجیِ Gemini** هم اندازه گرفت
  • پس «چقدر از دستور اجرا شد؟» جوابِ عددی دارد، نه حدس

همان قاعدهٔ همیشگیِ این مخزن: تحلیلی که به تصمیم وصل نشود، تزئین است.
اینجا تحلیل مستقیم به متنِ دستور تبدیل می‌شود و بعد همان تحلیل، اجرای
دستور را می‌سنجد.

══ چه چیزی اندازه گرفته می‌شود — و چه چیزی عمداً نه ══

اندازه گرفته می‌شود: سرعتِ روایت، طولِ بندهای پیوسته، توزیعِ مکث‌ها
(کوتاه/میانی/بلند)، محدوده و میانهٔ زیروبم، فرودِ پایانِ بند، دامنهٔ
دینامیک، و «چقدر نگه می‌دارد» (دُمِ بلندِ طولِ بندها).

اندازه گرفته **نمی‌شود**: اینکه دقیقاً کدام واژه کشیده می‌شود. آن به
هم‌ترازیِ واژه‌به‌واژهٔ متن و صدا نیاز دارد که اینجا نداریم — و
ادعایش، همان «تحلیلِ نوشته‌شده و هرگز اجرانشده»ای می‌شود که این مخزن
یک بخشِ کامل دربارهٔ آن دارد. به‌جایش یک **نمایندهٔ صادق** گزارش
می‌شود: نسبتِ صدکِ ۹۵ به میانهٔ طولِ بندها، که «چقدر گاهی می‌کشد» را
نشان می‌دهد بی آنکه بگوید کجا.
"""

import io
import os
import tempfile

# `librosa` برای زیروبم (yin). بقیه از dsprep می‌آید که خودش فهرست دارد.
STYLE_DEPS = ["librosa>=0.10.2,<0.11"]

# ══ مرزهای مکث ══
# از روی کاری که مکث می‌کند، نه از روی عددِ گرد: زیرِ ۱۵۰ms مکث نیست،
# تنفسِ میانِ واژه است. تا ۴۵۰ms مکثِ درونِ جمله. تا یک ثانیه مرزِ
# جمله. بالاتر، مرزِ بند — همان‌جا که گوینده «فصل عوض می‌کند».
PAUSE_MICRO = 0.15
PAUSE_SHORT = 0.45
PAUSE_SENT = 1.0


def _pct(xs, q):
    """صدک، بی numpy.percentile — تا روی فهرستِ خالی هم نترکد."""
    if not xs:
        return 0.0
    ys = sorted(xs)
    i = max(0, min(len(ys) - 1, int(round((len(ys) - 1) * q / 100.0))))
    return float(ys[i])


def stylePitch_(y, rate):
    """زیروبم: میانه، بازه، و **فرودِ پایانِ بند**.

    فرود همان چیزی است که یک روایتِ آرام را از یک خبرخوانی جدا می‌کند:
    جمله پایین تمام می‌شود. اندازه‌اش تفاوتِ میانهٔ نیمهٔ اول و نیمهٔ
    دومِ هر بند است، به نیم‌پرده — واحدی که گوش با آن می‌شنود و
    Gemini هم با آن دستور می‌گیرد.
    """
    import numpy as np
    import librosa
    try:
        f0 = librosa.yin(np.asarray(y, dtype="float32"), fmin=60, fmax=350,
                         sr=rate, frame_length=1024)
    except Exception:
        return {}
    f0 = np.asarray(f0, dtype="float64")
    v = f0[np.isfinite(f0) & (f0 > 60) & (f0 < 350)]
    if len(v) < 20:
        return {}
    med = float(np.median(v))
    lo, hi = _pct(list(v), 10), _pct(list(v), 90)
    # ══ بازه از صدکِ ۲۵ و ۷۵، نه ۱۰ و ۹۰ ══
    # اولین اجرا روی صوتِ واقعی ۲۲٫۷ نیم‌پرده داد — بازه‌ای که هیچ
    # گوینده‌ای ندارد. علتش خطای اوکتاوِ yin است: چند فریمِ پرت روی
    # نصف یا دو برابرِ فرکانسِ واقعی می‌افتند و صدکِ ۱۰ و ۹۰ را با خود
    # می‌برند. صدکِ ۲۵ و ۷۵ همان‌جا می‌ماند.
    # عددی که در دستور می‌نشیند باید مقاوم باشد، وگرنه دستور دربارهٔ
    # خطای اندازه‌گیری صادر می‌شود نه دربارهٔ گوینده.
    q1, q3 = _pct(list(v), 25), _pct(list(v), 75)
    return {
        "median_hz": round(med, 1),
        "p10_hz": round(lo, 1),
        "p90_hz": round(hi, 1),
        "q1_hz": round(q1, 1),
        "q3_hz": round(q3, 1),
        # به نیم‌پرده: عددی که بینِ گوینده‌های مختلف قابلِ مقایسه است،
        # برخلافِ هرتز که با جنسیت و سن جابه‌جا می‌شود.
        "range_semitones": round(12 * np.log2(q3 / q1), 1) if q1 > 0 else 0.0,
        "range_wide_semitones": (round(12 * np.log2(hi / lo), 1)
                                 if lo > 0 else 0.0),
    }


def styleFall_(y, rate, spans):
    """فرودِ پایانِ هر بند، به نیم‌پرده. منفی یعنی پایین می‌آید."""
    import numpy as np
    import librosa
    falls = []
    for a, b in spans:
        if b - a < 1.0:
            continue
        seg = np.asarray(y[int(a * rate):int(b * rate)], dtype="float32")
        try:
            f0 = librosa.yin(seg, fmin=60, fmax=350, sr=rate,
                             frame_length=1024)
        except Exception:
            continue
        f0 = np.asarray(f0, dtype="float64")
        ok = np.isfinite(f0) & (f0 > 60) & (f0 < 350)
        f0 = f0[ok]
        if len(f0) < 12:
            continue
        h = len(f0) // 2
        a1, a2 = float(np.median(f0[:h])), float(np.median(f0[h:]))
        if a1 > 0 and a2 > 0:
            falls.append(12 * float(np.log2(a2 / a1)))
    if not falls:
        return {}
    return {"phrase_fall_semitones": round(_pct(falls, 50), 1),
            "phrases_measured": len(falls)}


def styleMeasure_(path, seconds=180.0):
    """همهٔ عددهای سبک، از یک ضبط.

    `seconds` سقفِ بررسی است: سبکِ یک گوینده در سه دقیقه پیداست و
    خواندنِ بیست دقیقه فقط وقت می‌برد.
    """
    import numpy as np
    import dsprep as D
    from silero_vad import load_silero_vad

    tmp = tempfile.mkdtemp(prefix="style-")
    y, rate = D.dsDecode_(path, os.path.join(tmp, "v.wav"), D.VAD_SR)
    total = len(y) / float(rate)
    if total > seconds:
        # از وسط، نه از اول: ابتدای ضبط‌ها تیزر و معرفی است.
        s0 = int((total - seconds) / 2.0 * rate)
        y = y[s0:s0 + int(seconds * rate)]
        total = len(y) / float(rate)
    spans = D.dsSpeech_(y, rate, load_silero_vad())
    if not spans:
        return {"error": "هیچ گفتاری پیدا نشد", "seconds": round(total, 1)}

    talk = [b - a for a, b in spans]
    gaps = []
    for i in range(1, len(spans)):
        g = spans[i][0] - spans[i - 1][1]
        if g >= PAUSE_MICRO:
            gaps.append(g)
    short = [g for g in gaps if g < PAUSE_SHORT]
    mid = [g for g in gaps if PAUSE_SHORT <= g < PAUSE_SENT]
    long_ = [g for g in gaps if g >= PAUSE_SENT]
    spoken = float(sum(talk))
    lv = [D.dbOf_(D.dsSlice_(y, rate, a, b)) for a, b in spans]

    out = {
        "seconds": round(total, 1),
        "speech_pct": round(100.0 * spoken / max(1e-9, total)),
        # ── ریتمِ روایت ──
        "phrase_seconds_median": round(_pct(talk, 50), 2),
        "phrase_seconds_p95": round(_pct(talk, 95), 2),
        # «چقدر گاهی می‌کشد» — نمایندهٔ صادقِ کشش، بی ادعای اینکه
        # می‌داند کدام واژه کشیده شده.
        "hold_ratio": round(_pct(talk, 95) / max(0.01, _pct(talk, 50)), 2),
        # ── مکث‌ها ──
        "pauses_per_minute": round(60.0 * len(gaps) / max(1e-9, total), 1),
        "pause_short_median": round(_pct(short, 50), 2),
        "pause_sentence_median": round(_pct(mid, 50), 2),
        "pause_para_median": round(_pct(long_, 50), 2),
        "pause_mix_pct": {
            "short": round(100.0 * len(short) / max(1, len(gaps))),
            "sentence": round(100.0 * len(mid) / max(1, len(gaps))),
            "paragraph": round(100.0 * len(long_) / max(1, len(gaps))),
        },
        # ── دینامیک ──
        "level_spread_db": round(_pct(lv, 90) - _pct(lv, 10), 1),
    }
    out.update(stylePitch_(y, rate))
    out.update(styleFall_(y, rate, spans))
    return out


# ══ از عدد به دستور ══
# چرا قاعده و نه مدل: این متن باید تکرارپذیر باشد و بی کلید و اینترنت
# ساخته شود، و مهم‌تر — هر جمله‌اش باید **از یک عدد** آمده باشد تا
# بتوان همان را دوباره سنجید. یک مدل می‌توانست زیباتر بنویسد و
# چیزهایی بگوید که در صدا نبود.
def _band(v, lo, hi, a, b, c):
    return a if v < lo else (b if v < hi else c)


def styleCard_(m, name="گوینده"):
    """کارتِ سبک: عددها، و دستورِ ساخته‌شده از همان عددها."""
    if m.get("error"):
        return {"name": name, "numbers": m, "instruction": "",
                "error": m["error"]}
    ph = m.get("phrase_seconds_median", 0)
    lines = ["# سبکِ خواندن — %s" % name, "",
             "این دستور از اندازه‌گیریِ %s ثانیه از صدای واقعیِ او ساخته "
             "شده. هر بند زیر، یک عدد پشتش هست." % m.get("seconds"), "",
             "## ریتم"]
    # ══ عبارتِ بلند یعنی بی‌نفس، نه آرام ══
    # نسخهٔ اول طولِ عبارت را نشانهٔ آرامی گرفته بود و برای صوتی با
    # عبارت‌های ۵٫۸ ثانیه‌ای نوشت «بسیار آرام و سنگین» — در حالی که آن
    # صوت ۹۰٪ وقت حرف می‌زد و تقریباً نفس نمی‌کشید. آرامیِ یک روایت را
    # **سکوت** می‌سازد، نه طولِ عبارت.
    talkPct = m.get("speech_pct", 0)
    ppm = m.get("pauses_per_minute", 0)
    lines.append(
        "- %s: حدودِ **%d درصدِ** زمان حرف بزن و بقیه را سکوت کن." % (
            _band(talkPct, 70, 85, "آرام و روایی — سکوت بخشی از خواندن است",
                  "متعادل", "پیوسته و کم‌نفس"), talkPct))
    lines.append(
        "- هر عبارتِ پیوسته حدودِ %.1f ثانیه (گاهی تا %.1f)، و بعد مکث."
        % (ph, m.get("phrase_seconds_p95", ph)))
    if talkPct >= 85:
        lines.append(
            "- **پرحرفی نکن.** بی مکث خواندن، متن را از روایت به "
            "اعلامیه تبدیل می‌کند.")
    if m.get("hold_ratio", 0) >= 2.0:
        lines.append(
            "- گاه‌به‌گاه یک عبارت را **بلندتر از بقیه** نگه دار (تا %.1f "
            "برابرِ معمول) — این کشش امضای اوست، نه اتفاق."
            % m["hold_ratio"])
    lines.append("")
    lines.append("## مکث — مهم‌ترین بخش")
    lines.append(
        "- در دلِ جمله حدودِ **%.2f ثانیه** مکث کن." % m.get("pause_short_median", 0.3))
    lines.append(
        "- میانِ دو جمله حدودِ **%.2f ثانیه**." % m.get("pause_sentence_median", 0.6))
    if m.get("pause_para_median"):
        lines.append(
            "- میانِ دو بند یا پیش از جملهٔ کلیدی، **%.1f ثانیه** سکوت — "
            "نترس از سکوت." % m["pause_para_median"])
    lines.append(
        "- روی هم حدودِ **%s مکث در هر دقیقه**. این عدد را کم نکن؛ شتاب "
        "گرفتن اولین چیزی است که این سبک را از بین می‌برد."
        % m.get("pauses_per_minute", 0))
    lines.append("")
    lines.append("## آهنگ و دامنه")
    rng = m.get("range_semitones", 0)
    lines.append(
        "- دامنهٔ زیروبم %s باشد (حدودِ %.1f نیم‌پرده) — %s." % (
            _band(rng, 6, 12, "بسیار مهار‌شده", "مهارشده", "باز و پرنوسان"),
            rng,
            "نه یکنواخت و بی‌جان، نه پرهیجان" if rng < 12 else "پرحرکت"))
    fall = m.get("phrase_fall_semitones")
    if fall is not None and fall < -0.5:
        lines.append(
            "- **پایانِ هر عبارت را فرود بیاور** (حدودِ %.1f نیم‌پرده "
            "پایین‌تر از آغازش). جمله را بالا رها نکن." % abs(fall))
    lines.append(
        "- بلندیِ صدا را در بازه‌ای %s نگه دار (حدودِ %.0f دسی‌بل نوسان)؛ "
        "تأکید را با مکث و کشش بساز، نه با بلند کردنِ صدا." % (
            _band(m.get("level_spread_db", 0), 10, 18, "بسیار یکدست",
                  "یکدست", "متغیر"), m.get("level_spread_db", 0)))
    return {"name": name, "numbers": m, "instruction": "\n".join(lines)}


# ══ حلقهٔ بسته ══
# بی این تابع، کارت فقط یک آرزوی دقیق‌تر است. با آن، «چقدر اجرا شد؟»
# جوابِ عددی دارد و می‌شود دستور را اصلاح کرد.
STYLE_KEYS = ("speech_pct", "phrase_seconds_median", "pause_short_median",
              "pause_sentence_median", "pauses_per_minute",
              "range_semitones", "phrase_fall_semitones", "hold_ratio")


def styleCompare_(target, actual):
    """کارتِ هدف در برابرِ آنچه واقعاً خوانده شد."""
    rows, off = {}, 0
    for k in STYLE_KEYS:
        t, a = target.get(k), actual.get(k)
        if t is None or a is None:
            continue
        d = a - t
        rel = abs(d) / max(1e-9, abs(t))
        rows[k] = {"target": t, "actual": a, "diff": round(d, 2),
                   "off_pct": round(100 * rel)}
        # ۲۵٪ اختلاف یعنی گوش تفاوت را می‌شنود. کمتر از آن، نویز است.
        if rel > 0.25:
            off += 1
    return {"fields": rows, "off_count": off,
            "followed": off == 0 and bool(rows)}
