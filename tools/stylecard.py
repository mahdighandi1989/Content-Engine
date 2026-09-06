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
import re
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

# ══ چقدر صدا لازم است تا کارت معنا داشته باشد ══
# اولین اجرای واقعی روی **۳۰ ثانیه** رفت (پیش‌فرضِ خانهٔ فرم، که برای
# «چند ثانیه تبدیل شود» نوشته شده بود نه برای اندازه‌گیریِ سبک) و
# کارت را از ۷ عبارت ساخت. میانهٔ ۷ عدد، سبکِ یک گوینده نیست؛ حالِ
# او در همان نیم‌دقیقه است. عددها پایین‌اند چون هر یک از این‌ها
# **میانه**‌اند و میانه با نمونهٔ کم می‌لرزد، نه چون سخت‌گیرم.
STYLE_WINDOW = 240.0        # پنجرهٔ پیش‌فرضِ اندازه‌گیری
STYLE_MIN_PHRASES = 20      # کمتر از این، کارت هشدارِ «نمونه کم» می‌گیرد
STYLE_MIN_GAPS = 30


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


def stylePitchOf_(y, rate, spans):
    """زیروبم را فقط روی **گفتار** بسنج، نه روی کلِ فایل.

    ══ چرا، با عدد ══
    `yin` روی سکوت هم عدد می‌دهد؛ عددی که فیلترِ ۶۰ تا ۳۵۰ هرتز
    بیرونش نمی‌اندازد چون در همان بازه می‌افتد. و رضوی **نیمی** از
    وقتش ساکت است — یعنی نیمی از فریم‌هایی که «بازهٔ زیروبمِ او» را
    می‌ساختند، اصلاً صدای او نبودند.

    اندازه‌گیریِ واقعی روی همان ضبط: بازه با سکوت ۴٫۳ نیم‌پرده،
    بی سکوت ۶٫۷. و روی صوتِ Gemini که فقط ۱۰٪ ساکت است، ۱۰٫۸ در
    برابرِ ۹٫۳ — یعنی سکوت هر دو را به هم نزدیک نشان می‌داد و
    نتیجه‌گیری «رضوی خیلی مهارشده‌تر است» تا حدی ساختهٔ همین خطا بود.

    و مهم‌تر از خودِ عدد: حالت‌ها این را روی بندها حساب می‌کردند و
    کارتِ اصلی روی کلِ پنجره — دو تعریفِ متفاوت که کنارِ هم در یک
    جمله چاپ می‌شدند («۹٫۹ در برابرِ ۴٫۳»).
    """
    import numpy as np
    import dsprep as D
    if not spans:
        return {}
    try:
        cat = np.concatenate([np.asarray(D.dsSlice_(y, rate, a, b),
                                         dtype="float32")
                              for a, b in spans])
    except Exception:
        return {}
    return stylePitch_(cat, rate) or {}


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


def styleAgg_(talk, gaps, lv, total):
    """جمع‌بندیِ عددها از مواد — کلِ ضبط باشد یا یک حالت.

    ══ چرا یک تابع و نه دو ══
    کارتِ حالت اولین بار عددهای خودش را با عددهای کلِ ضبط قاطی کرد و
    نتیجه‌اش این خط بود: «هر عبارت حدودِ ۷٫۱ ثانیه (گاهی تا ۲٫۹)» —
    صدکِ ۹۵ کوچک‌تر از میانه، چون یکی مالِ حالت بود و آن‌یکی مالِ کلِ
    ضبط. عددهایی که با هم خوانده می‌شوند باید از یک جمع‌بندی بیایند.
    """
    short = [g for g in gaps if g < PAUSE_SHORT]
    mid = [g for g in gaps if PAUSE_SHORT <= g < PAUSE_SENT]
    long_ = [g for g in gaps if g >= PAUSE_SENT]
    return {
        "seconds": round(total, 1),
        "speech_pct": round(100.0 * float(sum(talk)) / max(1e-9, total)),
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
        # ══ اندازهٔ نمونه، کنارِ خودِ عددها ══
        # هر عددِ بالا میانه است. بی این دو، یک کارتِ ساخته‌شده از ۷
        # عبارت دقیقاً مثلِ کارتِ ۲۰۰ عبارت به نظر می‌رسد — و همان است
        # که اجرای اول را بی‌ارزش کرد بی آنکه چیزی خطا بدهد.
        "gaps_measured": len(gaps),
    }


def styleMeasure_(path, seconds=STYLE_WINDOW):
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
    lv = [D.dbOf_(D.dsSlice_(y, rate, a, b)) for a, b in spans]
    out = styleAgg_(talk, gaps, lv, total)
    out.update(stylePitchOf_(y, rate, spans))
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
             "شده. هر بند زیر، یک عدد پشتش هست." % m.get("seconds"), ""]
    # ══ کارت باید بگوید از چند عبارت ساخته شده ══
    # وگرنه کارتِ ۷ عبارتی و کارتِ ۲۰۰ عبارتی یک شکل‌اند، و کسی که
    # می‌خواندش راهی ندارد بداند به کدام‌شان اعتماد کند.
    nph, ngap = m.get("phrases_measured", 0), m.get("gaps_measured", 0)
    if nph < STYLE_MIN_PHRASES or ngap < STYLE_MIN_GAPS:
        lines += ["> **نمونه کم بود** — %d عبارت و %d مکث. عددهای زیر "
                  "میانه‌اند و با نمونهٔ کم می‌لرزند؛ پیش از تکیه کردن به "
                  "آن‌ها، دستِ‌کم %d ثانیه صدا بدهید." % (
                      nph, ngap, int(STYLE_WINDOW)), ""]
    lines.append("## ریتم")
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
    # ══ «کجا» به‌اندازهٔ «چقدر» فرق می‌گذارد ══
    # اولین سنجشِ واقعی این را نشان داد: مکث‌های رضوی ۷۱٪ **درونِ**
    # جمله‌اند، و صوتِ Gemini نیمی از مکث‌هایش را برای مرزِ بند نگه
    # می‌دارد. یعنی یکی جمله را می‌شکند و معلق نگه می‌دارد، آن‌یکی
    # جمله را یک‌نفس می‌خوانَد و بعد می‌ایستد. عددِ «مکث در دقیقه» هر
    # دو را یکسان نشان می‌دهد.
    mix = m.get("pause_mix_pct") or {}
    if mix.get("short", 0) >= 55:
        lines.append(
            "- **بیشترِ مکث‌ها را در دلِ جمله بگذار، نه فقط سرِ نقطه** "
            "(حدودِ %d درصدِ مکث‌هایش درونِ جمله است). جمله را وسطش "
            "بشکن و همان‌جا نگه دار — این چیزی است که به روایت تعلیق "
            "می‌دهد." % mix["short"])
    lines.append("")
    lines.append("## آهنگ و دامنه")
    rng = m.get("range_semitones", 0)
    lines.append(
        "- دامنهٔ زیروبم %s باشد (حدودِ %.1f نیم‌پرده) — %s." % (
            _band(rng, 6, 12, "بسیار مهار‌شده", "مهارشده", "باز و پرنوسان"),
            rng,
            "نه یکنواخت و بی‌جان، نه پرهیجان" if rng < 12 else "پرحرکت"))
    # ══ چرا هر دو جهت، و نه فقط «فرود» ══
    # نسخهٔ اول فقط شاخهٔ منفی را داشت، چون فرضم این بود که یک روایتگر
    # جمله را پایین می‌آورد. اندازه‌گیری عکسش را گفت: عبارت‌های رضوی
    # **بالا** تمام می‌شوند (+۱٫۸ نیم‌پرده) و Gemini پایین می‌آید
    # (−۲٫۳). و با مکث‌های درون‌جمله‌ای جور درمی‌آید: او جمله را نصفه
    # رها می‌کند، پس صدایش هم باید معلق بماند. کارتی که فقط یک جهت را
    # بلد است، دربارهٔ گویندهٔ واقعی ساکت می‌مانَد — که همان شد.
    fall = m.get("phrase_fall_semitones")
    if fall is not None and fall < -0.5:
        lines.append(
            "- **پایانِ هر عبارت را فرود بیاور** (حدودِ %.1f نیم‌پرده "
            "پایین‌تر از آغازش). جمله را بالا رها نکن." % abs(fall))
    elif fall is not None and fall > 0.5:
        lines.append(
            "- **پایانِ عبارت را معلق نگه دار** (حدودِ %.1f نیم‌پرده "
            "بالاتر از آغازش) — جز آنجا که جمله واقعاً تمام می‌شود. "
            "تعلیق کارِ همین بالا ماندن است؛ فرودِ زودهنگام، شنونده را "
            "رها می‌کند." % fall)
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

# ══ نسبت برای همه‌چیز جواب نمی‌دهد ══
# اولین سنجشِ درست این را نشان داد: فرودِ پایانِ عبارتِ رضوی +۰٫۲
# نیم‌پرده است (یعنی تقریباً صاف) و جمینای −۲٫۸. اختلاف سه نیم‌پرده
# است — واقعی، ولی کوچک. نسبت آن را **۱۵۰۰٪** گزارش کرد، چون مخرج
# نزدیکِ صفر بود. عددی که فقط به‌خاطرِ کوچکیِ هدف بزرگ شده، در هر
# فهرستِ اولویت بالای همه می‌نشیند و بقیه را می‌پوشاند.
#
# پس هر سنجه با واحدِ خودش داوری می‌شود: ثانیه و نیم‌پرده با اختلافِ
# مطلق (چون «۰٫۳ در برابر ۰٫۴ ثانیه» با «۳ در برابر ۴ ثانیه» یک چیز
# نیست، هرچند هر دو ۳۳٪‌اند)، و نسبت‌ها و درصدها با نسبت.
STYLE_TOL = {
    "speech_pct": ("rel", 0.25),
    "phrase_seconds_median": ("rel", 0.25),
    "pauses_per_minute": ("rel", 0.25),
    "hold_ratio": ("rel", 0.25),
    "pause_short_median": ("abs", 0.10),      # ثانیه
    "pause_sentence_median": ("abs", 0.15),   # ثانیه
    "range_semitones": ("abs", 1.5),          # نیم‌پرده
    "phrase_fall_semitones": ("abs", 1.0),    # نیم‌پرده
}


def styleCompare_(target, actual):
    """کارتِ هدف در برابرِ آنچه واقعاً خوانده شد."""
    rows, off = {}, 0
    for k in STYLE_KEYS:
        t, a = target.get(k), actual.get(k)
        if t is None or a is None:
            continue
        mode, tol = STYLE_TOL.get(k, ("rel", 0.25))
        # ══ دو عددِ گردشده تفاضلِ گردشده ندارند ══
        # 0.4 − 0.3 در ممیزِ شناور 0.10000000000000003 است، که از
        # آستانهٔ ۰٫۱ بزرگ‌تر است. بی این گِرد کردن، سنجه‌ای که دقیقاً
        # روی آستانه بنشیند بسته به نویزِ ممیز گاهی «اشکال» می‌شود و
        # گاهی نه — و گزارشی که بین دو اجرا می‌لرزد، خوانده نمی‌شود.
        d = round(a - t, 4)
        lim = max(abs(t) * tol if mode == "rel" else tol, 1e-6)
        # `severity` یعنی «چند برابرِ آستانه»، و تنها عددی است که در
        # همهٔ واحدها قابلِ مقایسه است — پس ترتیبِ اولویت با اوست.
        # ══ `bool(...)` اضافه نیست ══
        # عددهای زیروبم از `np.log2` می‌آیند، پس `np.float64`اند — و
        # آن در JSON بی‌صدا رد می‌شود چون **زیرکلاسِ `float`** است. ولی
        # مقایسه‌شان `np.bool_` می‌دهد که زیرکلاسِ `bool` **نیست**، و
        # کلِ گزارش را سرِ آخرین خط می‌ترکاند. آزمونم این را نگرفت چون
        # با عددِ پایتونیِ دستی نوشته شده بود، نه با چیزی که واقعاً
        # ذخیره می‌شود — همان درسِ `recapCast_` در CLAUDE.md.
        row = {"target": float(t), "actual": float(a),
               "diff": round(float(d), 2), "unit": mode,
               "tolerance": round(float(lim), 2),
               "severity": round(float(abs(d) / lim), 2),
               "off": bool(abs(d) > lim + 1e-9)}
        if mode == "rel":
            row["off_pct"] = int(round(100 * abs(d) / max(1e-9, abs(t))))
        rows[k] = row
        if row["off"]:
            off += 1
    return {"fields": rows, "off_count": off,
            "followed": off == 0 and bool(rows)}


# ══════════════════════════════════════════════════════════════════════
# لایهٔ حالت‌ها — یک گوینده یک‌جور نمی‌خوانَد
# ══════════════════════════════════════════════════════════════════════
#
# کارتِ بالا میانهٔ کلِ یک ضبط است، و میانه دقیقاً همان چیزی را پنهان
# می‌کند که پرسش بود: رضوی جای تعلیق طورِ دیگری می‌خواند تا جای
# توضیح. صاحبِ برنامه همین را پرسید — «حس‌هایی که در عصبانیت و خنده و
# شادی و هیجان و ناراحتی» — و خواست جدا از «روح» کارِ موازی نشود.
#
# ══ چرا خوشه‌بندیِ خودِ گوینده، و نه یک ردهٔ احساسات ══
#
# می‌شد مدلی را روی «عصبانی/شاد/غمگین» آموزش داد و به صدای رضوی داد.
# سه ایراد دارد و هر سه کشنده‌اند: (۱) آن مدل‌ها روی صدای بازیگرِ
# انگلیسی‌زبانِ اغراق‌شده آموزش دیده‌اند و روایتِ آرامِ فارسی هیچ‌جای
# آن نقشه نیست؛ (۲) برچسبی که از بیرون بیاید با آنچه واقعاً در صدا
# هست جور درنمی‌آید و ما راهی برای رد کردنش نداریم؛ (۳) و مهم‌تر،
# چیزی که به Gemini می‌دهیم عدد است نه برچسب — پس برچسب حتی لازم
# نیست.
#
# آنچه لازم است این است: **این گوینده چند جورِ متمایز می‌خوانَد، و
# عددهای هر جور چیست.** آن را از خودِ ضبط‌هایش می‌شود درآورد.
#
# ══ و نام‌گذاری کارِ گوش است، نه کارِ کد ══
#
# کد می‌تواند بگوید «این خوشه پرمکث‌تر و بم‌تر است». نمی‌تواند بگوید
# «این حالتِ تعلیق است». پس برای هر حالت یک **نمونهٔ شنیدنی** از
# نزدیک‌ترین بند به مرکزِ خوشه بیرون می‌آید و نام‌گذاری با آدم است —
# همان الگوی «شواهدِ شنیدنی، نه حکم» که بخشِ دیتاست دارد.

MODES_WINDOW = 900.0        # مادهٔ خام برای حالت‌ها: ربعِ ساعت، نه چهار دقیقه
MODE_MIN_SEC = 12.0         # کوتاه‌تر از این، «نسبتِ سکوت» معنا ندارد
MODE_MAX_SEC = 45.0
# ══ سکوتِ یک‌ونیم‌ثانیه‌ای مرزِ بخش است، نه نفس ══
# بی این، بندی که به کفِ دوازده‌ثانیه نرسیده از روی یک مرزِ واقعی
# رد می‌شود و دو جور خواندن را با هم میانگین می‌گیرد — دقیقاً همان
# چیزی که این لایه قرار است جدا کند. در آزمونِ دو-گویندهٔ واقعی
# دیده شد: هشت بند، هر کدام با ~۶ ثانیه از یکی و ~۱۷ ثانیه از
# آن‌یکی.
#
# و عددش از خودِ داده آمده، نه از حدس: میانهٔ مکث‌های بلندِ رضوی در
# سنجشِ ۲۴۰ ثانیه‌ای **۱٫۵ ثانیه** است. یعنی همین‌جا خودش موضوع را
# عوض می‌کند. `PAUSE_SENT` (یک ثانیه) مرزِ جمله می‌مانَد و از رویش
# رد می‌شویم؛ از این یکی نه.
MODE_HARD_SEC = 1.5
MODE_MIN_PASSAGES = 12      # کمتر از این، خوشه‌بندی تئاتر است
MODE_MIN_MEMBERS = 3        # خوشهٔ دو-عضوی حالت نیست، پرت است
MODE_SIL_MIN = 0.15         # زیرِ این، «حالتی در کار نیست» جوابِ درست است
MODE_KS = (2, 3, 4)

# ══ چرا این پنج و نه هر چه داریم ══
# `pauses_per_minute` تقریباً از دو تای اولی درمی‌آید و `hold_ratio` و
# `phrase_fall_semitones` روی یک بندِ پانزده‌ثانیه‌ای از چهار-پنج عدد
# میانه می‌گیرند — یعنی نویز. در خوشه‌بندی هر بُعد وزنِ برابر دارد، پس
# یک بُعدِ نویزی دقیقاً به‌اندازهٔ یک بُعدِ واقعی خوشه‌ها را جابه‌جا
# می‌کند. هر دو گزارش می‌شوند، ولی در تصمیم نمی‌آیند.
MODE_KEYS = ("speech_pct", "phrase_seconds_median", "range_semitones",
             "pitch_rel_semitones", "level_rel_db")

# نامِ فارسیِ هر محور — کارت را آدم می‌خواند، نه کد.
MODE_FA = {
    "speech_pct": "درصدِ زمانی که حرف می‌زند",
    "phrase_seconds_median": "طولِ هر عبارتِ پیوسته (ثانیه)",
    "pauses_per_minute": "مکث در دقیقه",
    "range_semitones": "دامنهٔ زیروبم (نیم‌پرده)",
    "phrase_fall_semitones": "فرودِ پایانِ عبارت (نیم‌پرده)",
}

# ══ صفتِ تفضیلی ذخیره می‌شود، ساخته نمی‌شود ══
# چسباندنِ «تر» با نیم‌فاصله به هر واژه‌ای، فارسیِ غلط می‌سازد:
# «بلند‌تر» و «زیر‌تر» هر دو اشتباه‌اند («بلندتر»، «زیرتر») ولی
# «پیوسته‌تر» و «آرام‌تر» درست. قاعده‌ای که کد بتواند حدس بزند وجود
# ندارد؛ پس هر دو سرِ هر محور همان‌طور که خوانده می‌شود نوشته شده.
# (کمِ محور، زیادِ محور)
MODE_WORDS = {
    "speech_pct": ("پرمکث‌تر", "پیوسته‌تر"),
    "phrase_seconds_median": ("کوتاه‌عبارت‌تر", "بلندعبارت‌تر"),
    "range_semitones": ("مهارشده‌تر", "پرنوسان‌تر"),
    "pitch_rel_semitones": ("بم‌تر", "زیرتر"),
    "level_rel_db": ("آرام‌تر", "بلندتر"),
}


def stylePassages_(spans):
    """بندها را سرِ مکث‌های بلند ببُر — مرز را خودِ گوینده گذاشته.

    بریدنِ کور هر ۲۰ ثانیه، یک جملهٔ آرام و نیمهٔ یک جملهٔ تند را در
    یک بند می‌گذارد و میانگینِ چیزی می‌شود که وجود ندارد. مکثِ بلند
    همان‌جایی است که خودِ او موضوع را عوض می‌کند.

    ══ و مرزِ واقعی بر کفِ طول مقدم است ══
    نسخهٔ اول فقط وقتی می‌بُرید که بند به دوازده ثانیه رسیده باشد. پس
    بندی که هنوز کوتاه بود از روی یک سکوتِ بلند **رد می‌شد** و دو
    طرفش را با هم میانگین می‌گرفت. در آزمون با دو گویندهٔ واقعی دیده
    شد: یک بند با پنج ثانیه از یکی و هفده ثانیه از آن‌یکی. حالا سکوتِ
    دوثانیه‌ای همیشه می‌بُرد و تکهٔ کوتاهِ باقی‌مانده **دور ریخته
    می‌شود**، نه اینکه به بندِ بعدی بچسبد: با ربعِ ساعت ماده، انداختنِ
    چند تکهٔ کوتاه ارزان است و آلوده کردنِ یک بند نیست.
    """
    if not spans:
        return [], 0.0
    out, drop = [], 0.0

    def close(a0, b0):
        if (b0 - a0) >= MODE_MIN_SEC:
            out.append((a0, b0))
            return 0.0
        return max(0.0, b0 - a0)

    start, prev = spans[0][0], spans[0][1]
    for a, b in spans[1:]:
        gap = a - prev
        if gap >= MODE_HARD_SEC or (prev - start) >= MODE_MAX_SEC or \
                (gap >= PAUSE_SENT and (prev - start) >= MODE_MIN_SEC):
            drop += close(start, prev)
            start = a
        prev = b
    drop += close(start, prev)
    return out, round(drop, 1)


def styleVec_(y, rate, spans, a, b, base):
    """بردارِ سبکِ یک بند. `base` عددهای کلِ همان گوینده است.

    زیروبم و بلندی **نسبت به خودِ او** سنجیده می‌شوند، نه مطلق: پرسش
    این است که در این بند بم‌تر از عادتِ خودش می‌خوانَد یا نه.
    """
    import numpy as np
    import dsprep as D
    sub = [(max(s, a), min(e, b)) for s, e in spans if e > a and s < b]
    sub = [(s, e) for s, e in sub if e - s > 0.05]
    if len(sub) < 3:
        return None
    total = float(b - a)
    talk = [e - s for s, e in sub]
    gaps = [sub[i][0] - sub[i - 1][1] for i in range(1, len(sub))]
    gaps = [g for g in gaps if g >= PAUSE_MICRO]
    p = stylePitchOf_(y, rate, sub)
    lv = [D.dbOf_(D.dsSlice_(y, rate, s, e)) for s, e in sub]
    # ══ موادِ خام می‌مانَد، نه فقط میانه‌اش ══
    # عددهای یک حالت باید از **جمعِ بندهایش** درآیند، نه از میانهٔ
    # میانه‌ها؛ و بی نگه داشتنِ خودِ فهرست‌ها آن ممکن نیست.
    raw = {"_talk": talk, "_gaps": gaps, "_lv": lv, "_spans": sub}
    med = p.get("median_hz") or 0.0
    bmed = base.get("median_hz") or 0.0
    v = {
        "at": round(a, 1), "seconds": round(total, 1),
        "speech_pct": round(100.0 * sum(talk) / max(1e-9, total)),
        "phrase_seconds_median": round(_pct(talk, 50), 2),
        "pauses_per_minute": round(60.0 * len(gaps) / max(1e-9, total), 1),
        "range_semitones": p.get("range_semitones", 0.0),
        "pitch_rel_semitones": (round(12 * float(np.log2(med / bmed)), 2)
                                if med > 0 and bmed > 0 else 0.0),
        # `or` اینجا نمی‌آید: `_level_med` یک دسی‌بل است و صفر بودنش
        # مقدارِ معتبری است، نه «نداریم».
        "level_rel_db": round(_pct(lv, 50) - (
            base["_level_med"] if base.get("_level_med") is not None
            else _pct(lv, 50)), 1),
        "phrases": len(sub),
    }
    v.update(styleFall_(y, rate, sub))
    v.update(raw)
    return v


def _kmeans_(X, k, seed=7, restarts=8):
    """k-means با بذرِ ثابت.

    ثابت بودن شرط است، نه سلیقه: این مخزن یک بخشِ کامل دارد دربارهٔ
    چیزی که در هر اجرا از نو ساخته می‌شود و هر بار جوابِ دیگری می‌دهد
    (`musicWrap_`). کارتِ حالت‌ها اگر هر بار خوشه‌ها را جابه‌جا کند،
    نامی که آدم رویشان گذاشته بی‌معنا می‌شود.
    """
    import numpy as np
    n = len(X)
    rng = np.random.RandomState(seed)
    best = None
    for _r in range(restarts):
        idx = [int(rng.randint(n))]
        for _ in range(k - 1):
            d = ((X[:, None, :] - X[idx][None, :, :]) ** 2).sum(-1).min(1)
            s = float(d.sum())
            if s <= 0:
                idx.append(int(rng.randint(n)))
                continue
            idx.append(int(np.searchsorted(np.cumsum(d / s), rng.rand())))
        C = X[idx].astype("float64").copy()
        lab = np.full(n, -1, dtype=int)
        for _it in range(60):
            nl = ((X[:, None, :] - C[None, :, :]) ** 2).sum(-1).argmin(1)
            if (nl == lab).all():
                break
            lab = nl
            for j in range(k):
                m = lab == j
                if m.any():
                    C[j] = X[m].mean(0)
        inertia = float(((X - C[lab]) ** 2).sum())
        if best is None or inertia < best[2]:
            best = (lab.copy(), C.copy(), inertia)
    return best


def _sil_(X, lab):
    """سیلوئت: خوشه‌ها واقعاً جدا هستند یا ما خط کشیده‌ایم.

    بی این عدد، k-means **همیشه** k خوشه می‌دهد — حتی روی ابری که
    هیچ ساختاری ندارد. آن‌وقت برای گوینده‌ای که یک‌جور می‌خواند سه
    «حالت» می‌سازیم و سه دستورِ متفاوت به Gemini می‌دهیم که هیچ‌کدام
    از صدا نیامده‌اند.
    """
    import numpy as np
    n = len(X)
    ks = sorted(set(int(x) for x in lab))
    if len(ks) < 2 or n <= len(ks):
        return 0.0
    Dm = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(-1))
    vals = []
    for i in range(n):
        own = int(lab[i])
        same = (lab == own).copy()
        same[i] = False
        if not same.any():
            vals.append(0.0)
            continue
        ai = float(Dm[i][same].mean())
        bi = min(float(Dm[i][lab == j].mean()) for j in ks if j != own)
        vals.append((bi - ai) / max(ai, bi, 1e-9))
    return float(np.mean(vals))


def modeName_(cenZ, n):
    """نامِ حالت از دو محوری که بیشترین فاصله را با عادتِ خودِ او دارند.

    `cenZ` مرکزِ خوشه در فضای استانداردشده است، پس هر مؤلفه‌اش خودش
    «چند انحرافِ معیار از عادتِ این گوینده» است.
    """
    z = sorted(((float(cenZ[i]), MODE_KEYS[i])
                for i in range(len(MODE_KEYS))), key=lambda t: -abs(t[0]))
    parts = []
    for val, key in z[:2]:
        if abs(val) < 0.35:        # این محور چیزی برای گفتن ندارد
            continue
        lo, hi = MODE_WORDS[key]
        parts.append(hi if val > 0 else lo)
    if not parts:
        return "حالتِ %d — میانه" % n
    return "حالتِ %d — %s" % (n, " و ".join(parts))


def styleModes_(path, name="گوینده", seconds=MODES_WINDOW, sampleDir=None):
    """چند جورِ متمایزِ خواندن، از خودِ ضبط‌های همان گوینده.

    خروجی همیشه معتبر است، حتی وقتی حالتی پیدا نشود: «یک حالت» جوابِ
    درستِ گوینده‌ای است که یک‌جور می‌خواند، و بهتر از سه دستورِ ساختگی.
    """
    import numpy as np
    import dsprep as D
    from silero_vad import load_silero_vad

    tmp = tempfile.mkdtemp(prefix="modes-")
    y, rate = D.dsDecode_(path, os.path.join(tmp, "v.wav"), D.VAD_SR)
    total = len(y) / float(rate)
    # ══ جابه‌جاییِ پنجره باید نگه داشته شود ══
    # وقتی از وسطِ فایل بریده می‌شود، هر `at` نسبت به همان برش است.
    # `modeSamples_` ولی از فایلِ **اصلی** می‌بُرد — پس بی این عدد،
    # نمونهٔ شنیدنیِ هر حالت از جای اشتباه درمی‌آید و کسی نمی‌فهمد،
    # چون صوتِ سالمی است، فقط مالِ آنجا نیست.
    offset = 0.0
    if total > seconds:
        s0 = int((total - seconds) / 2.0 * rate)
        offset = s0 / float(rate)
        y = y[s0:s0 + int(seconds * rate)]
        total = len(y) / float(rate)
    spans = D.dsSpeech_(y, rate, load_silero_vad())
    if not spans:
        return {"error": "هیچ گفتاری پیدا نشد", "seconds": round(total, 1)}

    base = stylePitchOf_(y, rate, spans)
    base["_level_med"] = _pct([D.dbOf_(D.dsSlice_(y, rate, a, b))
                               for a, b in spans], 50)
    passages, dropped = stylePassages_(spans)
    vecs = []
    for a, b in passages:
        v = styleVec_(y, rate, spans, a, b, base)
        if v:
            vecs.append(v)

    # ══ دورریزِ زیاد یعنی این ضبط بندِ بلند ندارد ══
    # سکوت‌های بلندِ پیاپی، تکه‌های زیرِ کف می‌سازند و همه دور ریخته
    # می‌شوند. آن‌وقت خوشه‌بندی روی نیمی از ضبط انجام شده و کسی
    # نمی‌داند — مگر اینکه بگوییم.
    note = ("%s ثانیه از %s کنار گذاشته شد (تکه‌های زیرِ %d ثانیه)"
            % (dropped, round(total, 1), int(MODE_MIN_SEC))) \
        if dropped > 0.25 * total else ""
    out = {"seconds": round(total, 1), "passages": len(vecs),
           "window_offset_seconds": round(offset, 1),
           "dropped_seconds": dropped, "dropped_note": note,
           "passage_seconds_median": round(_pct(
               [v["seconds"] for v in vecs], 50), 1) if vecs else 0.0,
           "vectors": vecs}
    if len(vecs) < MODE_MIN_PASSAGES:
        out["modes"] = []
        out["why"] = ("فقط %d بند به دست آمد؛ برای خوشه‌بندی دستِ‌کم %d "
                      "لازم است. صدای بیشتری بدهید."
                      % (len(vecs), MODE_MIN_PASSAGES))
        return _stripRaw_(out)

    X0 = np.array([[float(v[k]) for k in MODE_KEYS] for v in vecs])
    mu, sd = X0.mean(0), X0.std(0)
    # ══ بی این خط، `speech_pct` تنها بُعدِ مؤثر است ══
    # دامنه‌اش ۰ تا ۱۰۰ است و بقیه چند واحد؛ فاصلهٔ اقلیدسی یعنی
    # خوشه‌بندی فقط روی نسبتِ سکوت.
    X = (X0 - mu) / np.where(sd > 1e-9, sd, 1.0)

    tries = []
    for k in MODE_KS:
        if len(vecs) < k * MODE_MIN_MEMBERS:
            continue
        lab, cen, inertia = _kmeans_(X, k)
        sizes = [int((lab == j).sum()) for j in range(k)]
        tries.append({"k": k, "silhouette": round(_sil_(X, lab), 3),
                      "sizes": sizes, "_lab": lab, "_cen": cen,
                      "ok": min(sizes) >= MODE_MIN_MEMBERS})
    out["tried"] = [{kk: t[kk] for kk in ("k", "silhouette", "sizes", "ok")}
                    for t in tries]
    good = [t for t in tries if t["ok"] and t["silhouette"] >= MODE_SIL_MIN]
    if not good:
        best = max(tries, key=lambda t: t["silhouette"]) if tries else None
        out["modes"] = []
        out["why"] = ("هیچ خوشهٔ واقعی‌ای پیدا نشد (بهترین سیلوئت %s، "
                      "کفِ لازم %s) — یعنی این گوینده در این ضبط تقریباً "
                      "یک‌جور می‌خوانَد. یک کارت بس است."
                      % (best["silhouette"] if best else "—", MODE_SIL_MIN))
        return _stripRaw_(out)

    win = max(good, key=lambda t: t["silhouette"])
    lab, cen = win["_lab"], win["_cen"]
    # ══ بی این خط، فایلِ حالت‌ها قابلِ وارسی نیست ══
    # کلِ ادعای این لایه «این بند در آن حالت افتاد» است. اگر عضویت
    # نوشته نشود، تنها راهِ بررسیِ درستی‌اش این است که آدم از روی
    # میانه‌ها حدس بزند — یعنی همان چیزی که قرار بود از حدس دربیاید.
    for i, v in enumerate(vecs):
        v["mode"] = int(lab[i]) + 1
    out["k"] = win["k"]
    out["silhouette"] = win["silhouette"]
    modes = []
    for j in range(win["k"]):
        members = [i for i in range(len(vecs)) if int(lab[i]) == j]
        # نمایندهٔ شنیدنی: نزدیک‌ترین بند به مرکزِ خوشه.
        d = [float(((X[i] - cen[j]) ** 2).sum()) for i in members]
        rep = members[int(np.argmin(d))]
        num = modeNumbers_(y, rate, [vecs[i] for i in members])
        # نسبی‌ها میانهٔ بندهایند (خودشان نسبت به کلِ گوینده تعریف
        # شده‌اند، پس جمع‌بندیِ دوباره معنا ندارد).
        for k2 in ("pitch_rel_semitones", "level_rel_db"):
            vals = [vecs[i].get(k2) for i in members
                    if vecs[i].get(k2) is not None]
            if vals:
                num[k2] = round(_pct(vals, 50), 2)
        modes.append({
            "n": j + 1,
            "name": modeName_(cen[j], j + 1),
            "passages": len(members),
            "share_pct": round(100.0 * len(members) / len(vecs)),
            "numbers": num,
            "sample": {"at": vecs[rep]["at"],
                       "seconds": vecs[rep]["seconds"]},
            "_rep": rep,
        })
    modes.sort(key=lambda m: -m["share_pct"])
    out["modes"] = modes

    # ══ نمونهٔ شنیدنی، وگرنه نام‌گذاری حدس است ══
    if sampleDir:
        out["samples"] = modeSamples_(path, modes, sampleDir, name,
                                      offset)
    for m in modes:
        m.pop("_rep", None)
    return _stripRaw_(out)


def _stripRaw_(out):
    """فهرست‌های خام کارشان تمام شده و در JSON صدها عددند.

    روی **هر** مسیرِ خروج، نه فقط مسیرِ موفق: دو خروجِ زودهنگام هم
    همین `vectors` را برمی‌گردانند.
    """
    for v in (out.get("vectors") or []):
        for k in ("_talk", "_gaps", "_lv", "_spans"):
            v.pop(k, None)
    return out


def modeNumbers_(y, rate, members):
    """عددهای یک حالت — از **جمعِ بندهایش**، با همان جمع‌بندیِ کارتِ اصلی.

    نه میانهٔ میانه‌ها: میانهٔ میانه‌ها صدکِ ۹۵ و نسبتِ مکث‌ها را
    نمی‌سازد، و کارتی که نصفِ عددهایش از جای دیگری بیاید همان کارتِ
    ناهم‌خوانی است که یک بار ساختیم.
    """
    import numpy as np
    talk, gaps, lv, spans = [], [], [], []
    total = 0.0
    for v in members:
        talk += v.get("_talk") or []
        gaps += v.get("_gaps") or []
        lv += v.get("_lv") or []
        spans += v.get("_spans") or []
        total += float(v.get("seconds") or 0)
    num = styleAgg_(talk, gaps, lv, total)
    num["phrases_measured"] = len(talk)
    if spans:
        num.update(stylePitchOf_(y, rate, spans))
        num.update(styleFall_(y, rate, spans))
    return num


def modeSamples_(path, modes, outDir, name, offset=0.0):
    """از فایلِ اصلی (نرخِ خودش) یک برش برای هر حالت بیرون بیاور.

    `offset` جابه‌جاییِ پنجرهٔ تحلیل نسبت به فایل است. بی آن، هر برش
    از جای دیگری درمی‌آید — صوتِ سالمی که مالِ آن حالت نیست.
    """
    import soundfile as sf
    made, err = [], ""
    try:
        if not os.path.isdir(outDir):
            os.makedirs(outDir)
        info = sf.info(path)
        sr = info.samplerate
    except Exception as e:
        return {"files": [], "error": str(e)[:200]}
    for m in modes:
        # عددی که گزارش می‌شود باید همان عددی باشد که بریده شد —
        # وگرنه کسی که می‌خواهد همان‌جا را در فایلِ اصلی پیدا کند،
        # جای دیگری را باز می‌کند.
        a = round(float(m["sample"]["at"]) + offset, 1)
        b = a + float(m["sample"]["seconds"])
        i0 = max(0, int(a * sr))
        i1 = min(int(info.frames), int(b * sr))
        if i1 - i0 < sr:
            continue
        fn = os.path.join(outDir, "MODE%d-%s.wav" % (m["n"], _slug_(name)))
        try:
            # تکه‌ای خوانده می‌شود، نه کلِ فایل: ربعِ ساعت صوت در
            # ممیزِ دوبل صدها مگابایت است، برای بیست ثانیه برش.
            seg, _sr = sf.read(path, start=i0, stop=i1, always_2d=False)
            sf.write(fn, seg, sr)
            made.append(os.path.basename(fn))
            m["sample"]["file"] = os.path.basename(fn)
            m["sample"]["at_in_file"] = a
        except Exception as e:
            err = str(e)[:200]
    return {"files": made, "error": err}


def _slug_(s):
    return re.sub(r"\s+", "-", (s or "").strip()) or "voice"


def modeCard_(mode, base, name):
    """کارتِ یک حالت: همان قالب، به‌علاوهٔ «فرقش با عادتِ خودش چیست»."""
    # ══ هر عددِ این کارت مالِ همین حالت است ══
    # نسخهٔ اول عددهای کلِ ضبط را پایه می‌گرفت و چند تا را عوض می‌کرد.
    # حاصلش این خط بود: «هر عبارت حدودِ ۷٫۱ ثانیه (گاهی تا ۲٫۹)» —
    # صدکِ ۹۵ کوچک‌تر از میانه. `base` حالا فقط برای **مقایسه** است.
    own = mode.get("numbers") or {}
    card = styleCard_(own, "%s — %s" % (name, mode.get("name") or
                                        "حالتِ %s" % mode.get("n", "?")))
    lines = [card["instruction"], "", "## این حالت چه فرقی دارد"]
    for k, (lo, hi) in MODE_WORDS.items():
        t, a = base.get(k), own.get(k)
        if t is None or a is None or k in ("pitch_rel_semitones",
                                           "level_rel_db"):
            continue
        if abs(a - t) < max(0.15 * abs(t), 1e-9):
            continue
        lines.append("- %s: **%s** در برابرِ %s در حالتِ معمولِ او (%s)"
                     % (MODE_FA.get(k, k), a, t, hi if a > t else lo))
    for k in ("pitch_rel_semitones", "level_rel_db"):
        a = (mode.get("numbers") or {}).get(k)
        if a is None or abs(a) < 0.5:
            continue
        lo, hi = MODE_WORDS[k]
        unit = "نیم‌پرده" if k == "pitch_rel_semitones" else "دسی‌بل"
        lines.append("- نسبت به عادتِ خودش **%.1f %s %s** می‌خوانَد."
                     % (abs(a), unit, hi if a > 0 else lo))
    lines += ["", "این حالت %d درصدِ ضبط را می‌گیرد (%d بند)."
              % (mode.get("share_pct", 0), mode.get("passages", 0))]
    if (mode.get("sample") or {}).get("file"):
        lines.append("نمونهٔ شنیدنیِ همین حالت: `%s` — بشنوید و نامش را "
                     "خودتان بگذارید." % mode["sample"]["file"])
    card["instruction"] = "\n".join(lines)
    return card
