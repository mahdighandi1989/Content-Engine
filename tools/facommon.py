#!/usr/bin/env python3
"""فهرستِ واژه‌های رایجِ فارسی برای `speakSparse_` (۹.۱۶) — بازسازی‌پذیر، نه دست‌نویس.

منبع: FrequencyWords، Hermit Dave — content/2018/fa/fa_50k.txt (بسامدِ واژه در زیرنویس‌های
OpenSubtitles). کد MIT است و محتوا CC-BY-SA-4.0؛ نام و نشانیِ منبع همین‌جا و در سرِ فهرست
در src/03_Producer.gs می‌ماند.
https://github.com/hermitdave/FrequencyWords

چرا زیرنویس: پرسش این است که «گفتارساز این واژه را بی‌اعراب درست می‌گوید؟» و واژه‌ای که در
گفتارِ روزمره هزاران بار آمده، همان است که مدل هزاران بار شنیده. نوشتار (ویکی‌پدیا) بسامدِ
واژهٔ نوشتاری را می‌دهد، نه شنیداری.

    python3 tools/facommon.py fa_50k.txt > /tmp/list.txt
    # بعد میانِ /* FA_COMMON:BEGIN */ و /* FA_COMMON:END */ در src/03_Producer.gs

آستانه (MIN) عمدی است: «هندسه» (۸۷ بار) زیرِ آن می‌مانَد و اعراب می‌گیرد — همان واژه‌ای که
۸.۰۳ بی‌اعراب «handese» خوانده شد؛ «مدرسه» (۱۰٬۵۷۳)، «توجیه» (۲۰۴) و «بگذارید» (۱۵۹) بالای
آن‌اند — هر سه را اعراب‌گذارِ ما غلط نوشت و گفتارساز وفادارانه غلط خواند.
"""
import re
import sys

MIN = 150


def key(w):
    w = w.replace('ي', 'ی').replace('ك', 'ک').replace('‌', '').replace('ـ', '')
    return re.sub('[ً-ٰٟ]', '', w)


def main(path):
    seen, out = set(), []
    for line in open(path, encoding='utf-8'):
        parts = line.split()
        if len(parts) != 2 or int(parts[1]) < MIN:
            continue
        w = key(parts[0])
        if not re.fullmatch('[ء-يپچژکگیآ]+', w) or w in seen:
            continue
        seen.add(w)
        out.append(w)
    sys.stdout.write('|'.join(out))


if __name__ == '__main__':
    main(sys.argv[1])
