#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fa2latin.py — فارسی به لاتین، به IPA، و به املای انگلیسی‌خوان.

══ ایدهٔ صاحبِ برنامه، و چرا اصلاً شدنی است ══

«برای مدل‌هایی که فارسی نمی‌فهمند ولی انگلیسی می‌فهمند، فارسی را فینگلیش
بنویسیم — و برای تلفظ از همان نشانه‌گذاریِ دیکشنری‌ها استفاده کنیم.»

نکتهٔ کلیدی این است که این ایده **فقط به‌خاطرِ زنجیرهٔ اعرابِ موتور شدنی
است**. «کرم» بی‌اعراب سه واژه است: kerm، karam، kerem. هیچ برنامه‌ای
نمی‌تواند بی‌اعراب فارسی را به لاتین برگرداند، چون خودِ خطِ فارسی مصوت‌ها
را نمی‌نویسد. ولی متنی که از مرحلهٔ `speak` بیرون می‌آید اعراب دارد — یعنی
مصوت‌ها **نوشته شده‌اند** و برگردان قطعی می‌شود، نه حدسی.

پس این کار جایگزینِ اعراب‌گذاری نیست؛ **مصرف‌کنندهٔ** آن است.

══ سه خروجی، چون سه مصرف‌کننده هست ══

  finglish — رومی‌نویسیِ متعارفِ فارسی (kh, gh, sh, â). برای آدم خواناست
             و برای مدلی که حروفِ لاتین می‌شناسد ورودیِ معتبری است.
  respell  — همان، ولی با املای **انگلیسی**: â→ah, i→ee, u→oo, e→eh.
             این همان «نشانه‌گذاریِ دیکشنری» است که خواسته شد، و برای یک
             مدلِ انگلیسی‌آموخته محتمل‌ترین راهِ خواندنِ درست است.
  ipa      — الفبای آوانگاریِ بین‌المللی. برای مدل‌هایی که ورودی‌شان IPA
             است — مثل `KiaBush/Persian-IPA-to-Speech-F5` که اسکن پیدا کرد.

══ آنچه این ابزار **نمی‌تواند** بکند ══

الفبا را عوض می‌کند؛ زبان را نه. مدلی که فارسی نشنیده، «خ» و «ق» و «آ» را
هرگز تولید نکرده و نزدیک‌ترین صدای انگلیسی را می‌گذارد. یعنی انتظارِ درست
«فارسیِ درست ولی با لهجه» است، نه فارسیِ بومی. این را باید شنید و قضاوت
کرد، و همین ابزار شنیدنش را ممکن می‌کند.
"""

import re

ZWNJ = "‌"
FATHE, KASRE, ZAMME = "َ", "ِ", "ُ"
SUKUN, SHADDA = "ْ", "ّ"
TANVIN = {"ً": "an", "ٌ": "on", "ٍ": "en"}
HARAKAT = FATHE + KASRE + ZAMME + SUKUN + SHADDA + "".join(TANVIN) + "ٰ"

# هر همخوان یک ردیف: (فینگلیش، املای انگلیسی، IPA)
CONS = {
    "ب": ("b", "b", "b"),     "پ": ("p", "p", "p"),     "ت": ("t", "t", "t"),
    "ث": ("s", "s", "s"),     "ج": ("j", "j", "d͡ʒ"),    "چ": ("ch", "ch", "t͡ʃ"),
    "ح": ("h", "h", "h"),     "خ": ("kh", "kh", "x"),   "د": ("d", "d", "d"),
    "ذ": ("z", "z", "z"),     "ر": ("r", "r", "ɾ"),     "ز": ("z", "z", "z"),
    "ژ": ("zh", "zh", "ʒ"),   "س": ("s", "s", "s"),     "ش": ("sh", "sh", "ʃ"),
    "ص": ("s", "s", "s"),     "ض": ("z", "z", "z"),     "ط": ("t", "t", "t"),
    "ظ": ("z", "z", "z"),     "ع": ("'", "", "ʔ"),      "غ": ("gh", "gh", "ɣ"),
    "ف": ("f", "f", "f"),     "ق": ("gh", "gh", "ɢ"),   "ک": ("k", "k", "k"),
    "گ": ("g", "g", "ɡ"),     "ل": ("l", "l", "l"),     "م": ("m", "m", "m"),
    "ن": ("n", "n", "n"),     "ه": ("h", "h", "h"),     "ی": ("y", "y", "j"),
    "و": ("v", "v", "v"),     "ء": ("'", "", "ʔ"),      "أ": ("'", "", "ʔ"),
    "ؤ": ("'", "", "ʔ"),      "ئ": ("y", "y", "j"),
}
# مصوت‌ها — کوتاه‌ها از اعراب می‌آیند، بلندها از حرف
VOW = {
    "a":  ("a", "a", "æ"),    "e":  ("e", "eh", "e"),   "o":  ("o", "o", "o"),
    "â":  ("â", "ah", "ɒ"),   "i":  ("i", "ee", "iː"),  "u":  ("u", "oo", "uː"),
    "ow": ("ow", "oh", "ou̯"),
}
MODES = {"finglish": 0, "respell": 1, "ipa": 2}


def _isCons(ch):
    return ch in CONS


def _isFa(ch):
    return ch in CONS or ch in HARAKAT or ch in "اآ" or ch in (ZWNJ, "ٔ")


def _words(text):
    """
    متن را به تکه‌های «واژه» و «غیرواژه» می‌شکند.

    قاعده‌های ی/و/ه به «اولِ واژه» و «آخرِ واژه» بند است، پس مرزِ واژه باید
    پیش از هر تصمیمی معلوم باشد — نه وسطِ حلقه حدس زده شود. نیم‌فاصله جزوِ
    واژه است (می‌تَوانَد یک واژه است، نه دو تا).
    """
    out, buf = [], ""
    for ch in text:
        if _isFa(ch):
            buf += ch
        else:
            if buf:
                out.append((True, buf))
                buf = ""
            out.append((False, ch))
    if buf:
        out.append((True, buf))
    return out


def _word(w, m):
    """
    یک واژه → فهرستِ نشانه‌ها، هر کدام ('c'|'v', متن).

    ══ چرا نشانه، نه رشته ══
    املای انگلیسی بی مرزِ هجا خوانا نیست — دیکشنری‌ها «pro-nun-ci-a-tion»
    می‌نویسند نه «pronunciation». مرزِ هجا را فقط وقتی می‌شود گذاشت که
    بدانیم هر تکه همخوان است یا مصوت، و آن را باید همین‌جا نگه داشت؛
    بازشناختنش از روی رشتهٔ نهایی حدس‌زدنِ دوباره است.

    ══ سه تصمیمی که فقط با اعراب ممکن است ══
    «و» همخوان است یا مصوتِ او؟ «ی» همخوان است یا مصوتِ ای؟ «ه» پایانی
    صداست یا مصوتِ e؟ هر سه به اعرابِ حرفِ کناری بند است. متنِ بی‌اعراب
    این را ندارد — و متنی که از مرحلهٔ `speak` می‌آید دارد.
    """
    o = []
    i, n = 0, len(w)
    short = (FATHE, KASRE, ZAMME)

    def put(k, key):
        o.append((k, VOW[key][m] if k == "v" else CONS[key][m]))

    # «و» به‌تنهایی یک واژه است: حرفِ ربط.
    if w == "و":
        return [("c", "v"), ("v", VOW["a"][m])]

    while i < n:
        ch = w[i]
        nxt = w[i + 1] if i + 1 < n else ""
        nxt2 = w[i + 2] if i + 2 < n else ""
        prev = w[i - 1] if i else ""

        if ch == ZWNJ:
            if w[i + 1:] == "ای":
                put("v", "i"); break
            i += 1
            continue

        if ch == "آ":
            put("v", "â"); i += 1; continue

        if ch == "ا":
            # الفِ آغازِ واژه تکیه‌گاهِ مصوتِ کوتاه است (اِدراک = edrâk)؛
            # الفِ میانی و پایانی مصوتِ بلند (باور = bâvar).
            if i == 0:
                if nxt in short:
                    put("v", {FATHE: "a", KASRE: "e", ZAMME: "o"}[nxt]); i += 2
                else:
                    put("v", "a"); i += 1
            else:
                put("v", "â"); i += 1
            continue

        if ch in CONS:
            # ══ «خو» — استثنای مشهورِ خطِ فارسی ══
            # خواب/خواهر: واو نوشته می‌شود و خوانده نمی‌شود. خور/خوردن:
            # واو همان مصوتِ کوتاهِ o است. هیچ‌کدام قاعدهٔ عمومیِ «و» نیست.
            if ch == "خ" and nxt == "و":
                o.append(("c", CONS["خ"][m]))
                if nxt2 and nxt2 in "اآ":
                    i += 2          # واو خوانده نمی‌شود؛ الف کارِ خودش را می‌کند
                else:
                    put("v", "o"); i += 2
                continue

            if ch == "و":
                # «وا» پس از همخوانِ برهنه: واو هم مصوتِ o است هم همخوانِ v
                # (اُستوار = ostovâr). اگر همخوانِ پیشین اعراب داشته باشد،
                # واو فقط همخوان است (تَوانَد = tavânad) — و این تمایز باز
                # هم فقط با اعراب ممکن است.
                if nxt and nxt in "اآ" and prev in CONS:
                    put("v", "o"); put("c", "و"); i += 1; continue
                if nxt in short or nxt == SHADDA or (nxt and nxt in "اآ"):
                    pass                          # همخوان: دَوَم = davam
                elif prev == FATHE and o:
                    o[-1] = ("v", VOW["ow"][m])   # دوگانه‌واکه: نَو = now
                    i += 1
                    continue
                elif prev in CONS:
                    put("v", "u"); i += 1         # مصوت: دود = dud
                    continue

            if ch == "ی":
                # کسرهٔ **پایانِ واژه** اضافه است، نه اعرابِ این حرف. اگر
                # این را جلوتر نگیریم، «بَررَسیِ» به barrasy-e بدل می‌شود:
                # همان «ی» یک بار همخوان خوانده شده و یک بار مصوت.
                if nxt == KASRE and i + 2 == n and prev in CONS:
                    put("v", "i")
                    o.append(("z", VOW["e"][m]))
                    i += 2
                    continue
                if nxt in short or nxt == SHADDA:
                    pass                          # همخوان: اَهَمیَت
                elif prev in short and o:
                    o[-1] = ("v", {FATHE: "ay", KASRE: "ey",
                                   ZAMME: "oy"}[prev] if m < 2 else
                                  {FATHE: "æj", KASRE: "ej", ZAMME: "oj"}[prev])
                    i += 1
                    # کسرهٔ اضافه پس از دوگانه‌واکه
                    continue
                elif prev in CONS:
                    put("v", "i"); i += 1         # مصوت: دیر = dir
                    continue

            # ══ «ه» پایانی پس از حرفِ برهنه = مصوتِ e ══
            if ch == "ه" and i > 0 and prev in CONS:
                if i == n - 1 or nxt == ZWNJ:
                    put("v", "e"); i += 1; continue
                if nxt == "ٔ":                      # تَجرُبهٔ = tajrobe-ye
                    put("v", "e")
                    o.append(("z", VOW["e"][m]))
                    i += 2
                    continue

            put("c", ch)
            i += 1
            if i < n and w[i] == SHADDA:
                put("c", ch); i += 1
            if i < n and w[i] in short:
                key = {FATHE: "a", KASRE: "e", ZAMME: "o"}[w[i]]
                # کسرهٔ پایانِ واژه = اضافه، و اضافه یک هجای جداست.
                if w[i] == KASRE and i == n - 1:
                    o.append(("z", VOW["e"][m]))
                else:
                    put("v", key)
                i += 1
            elif i < n and w[i] in TANVIN:
                o.append(("v", TANVIN[w[i]])); i += 1
            elif i < n and w[i] == SUKUN:
                i += 1
            continue

        i += 1
    return o


def _join(toks, m):
    """
    نشانه‌ها → رشته. فقط در حالتِ املای انگلیسی مرزِ هجا گذاشته می‌شود.

    قاعده‌های متعارف: میانِ دو مصوت، یک همخوان به هجای بعد می‌رود
    (ba-va) و از دو همخوان یکی به هجای پیش (bar-ra).
    """
    if m != 1:
        # فینگلیش و IPA: اضافه با خط‌تیره دیده شود — برای آدم خواناتر است
        # و مرزِ واژه را نگه می‌دارد.
        out = []
        for i, (k, t) in enumerate(toks):
            if k != "z":
                out.append(t); continue
            glide = i and toks[i - 1][0] in ("v", "z")
            out.append("-" + (("y" if m == 0 else "j") if glide else "") + t)
        return "".join(out)
    # املای انگلیسی: اضافه یک هجای عادی است، چون این متن قرار است **خوانده**
    # شود نه دیده. خط‌تیره اینجا معنیِ دیگری دارد: مرزِ هجا.
    toks = [("v", t) if k == "z" else (k, t) for k, t in toks]
    out, run = [], 0
    for i, (k, t) in enumerate(toks):
        if k == "c":
            run += 1
            # آیا این همخوان آغازِ هجای تازه است؟
            nextIsV = i + 1 < len(toks) and toks[i + 1][0] == "v"
            if out and nextIsV and run == 1 and toks[i - 1][0] == "v":
                out.append("-")
            elif out and nextIsV and run > 1:
                out.append("-")
                run = 1
        else:
            if out and toks[i - 1][0] == "v":
                out.append("-y" if t[0] in "aeiou" else "-")
            run = 0
        out.append(t)
    return "".join(out).replace("--", "-").strip("-")


def convert(text, mode="finglish"):
    """
    متنِ فارسیِ اعراب‌دار → لاتین/IPA.

    هر چیزی که فارسی نیست (نقطه، ویرگول، رقم، حرفِ لاتین) دست‌نخورده
    می‌مانَد: مرزِ جمله مالِ نویسنده است، نه مالِ این ابزار — همان قاعده‌ای
    که `speakBone_` در خودِ موتور دارد.
    """
    m = MODES.get(mode)
    if m is None:
        raise ValueError("حالتِ ناشناخته: %s (یکی از %s)" % (mode, sorted(MODES)))
    out = []
    for isW, part in _words(text):
        out.append(_join(_word(part, m), m) if isW else part)
    s = "".join(out)
    s = "".join(PUNCT.get(c, DIGITS.get(c, c)) for c in s)
    return re.sub(r"[ \t]{2,}", " ", s).strip()


# نقطه‌گذاری و رقمِ فارسی هم باید برگردد. برای مدلی که فارسی نمی‌داند،
# «،» یک نویسهٔ ناشناخته است و به فاصله بدل می‌شود — یعنی مکثِ جمله را
# می‌خورَد، همان چیزی که کلِ این کار برای درست‌کردنش است.
PUNCT = {"،": ",", "؛": ";", "؟": "?", "٬": ",", "٫": ".", "«": '"', "»": '"',
         "ـ": "", "٪": "%"}
DIGITS = dict(zip("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
DIGITS.update(dict(zip("٠١٢٣٤٥٦٧٨٩", "0123456789")))


def coverage(text):
    """
    چند درصدِ نویسه‌های این متن اصلاً قابلِ برگردان است؟

    یک برگردانِ ناقص که بی سروصدا نویسه‌ها را می‌اندازد، همان شکلِ
    «نویسهٔ ناشناخته فاصله می‌شود» است با لباسِ دیگر. پس شمرده می‌شود.
    """
    fa = [c for c in text if _isFa(c)]
    ok = [c for c in fa if c in CONS or c in "اآ" or c in HARAKAT
          or c in (ZWNJ, "ٔ")]
    # ══ سنجهٔ واقعیِ کیفیت: واژه‌های بی‌مصوت ══
    # این ابزار مصوت‌ها را از **اعراب** می‌خوانَد. واژهٔ بی‌اعراب به یک
    # خوشهٔ همخوان بدل می‌شود («درست» → drst) که هیچ مدلی نمی‌تواند
    # بخوانَد. پس درصدِ پوششِ نویسه‌ها کافی نیست؛ باید شمرد چند واژه بی
    # هیچ مصوتی بیرون آمده — همان‌ها که اعرابشان جا مانده.
    # سنجهٔ درست «واژهٔ بی هیچ مصوت» نیست — «درست» بی‌اعراب drst می‌شود ولی
    # «بررسی» می‌شود brrsi که یک مصوت دارد و باز هم ناخواناست. فارسی هیچ‌گاه
    # سه همخوانِ پیاپی ندارد؛ پس همان نشانهٔ قطعیِ «اعرابش جا مانده» است.
    dry = []
    for w in convert(text, "finglish").split():
        core = w.lower()
        # kh/sh/ch/zh هر کدام **یک** همخوان‌اند نه دو. بی این تبدیل،
        # «بَرخوردار» — که کاملاً درست است — خوشهٔ سه‌تایی شمرده می‌شود و
        # هشدار برای چیزِ سالم بلند می‌شود؛ همان هشداری که آدم یاد می‌گیرد
        # نادیده بگیرد.
        for d in ("kh", "sh", "ch", "zh"):
            core = core.replace(d, "K")
        core = "".join(c for c in core if c.isalpha() or c == "â")
        run = 0
        for c in core:
            run = 0 if c in "aeiouâ" else run + 1
            if run >= 3:
                dry.append(w); break
    return {"fa_chars": len(fa),
            "known": len(ok),
            "pct": round(100.0 * len(ok) / max(1, len(fa)), 1),
            "unknown": sorted(set(c for c in fa if c not in ok)),
            "vowelless_words": dry[:20],
            "vowelless_count": len(dry)}


if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "finglish"
    txt = sys.argv[2] if len(sys.argv) > 2 else sys.stdin.read()
    print(convert(txt, mode))
