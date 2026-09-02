#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
slim_ckpt.py — چک‌پوینتِ ۵٫۴ گیگی را به وزن‌های لازم کوچک می‌کند.

نسخهٔ پشتیبانِ `Lumos675/F5_TTS_Persian` ۵٫۱ گیگابایت درآمد و همه‌اش هم
`model_last.pt` بود. علتش این است که آن فایل یک چک‌پوینتِ **کاملِ آموزش**
است: وزن‌ها + حالتِ بهینه‌ساز + شمارندهٔ گام. برای *استفاده* فقط وزن‌های
EMA لازم است، که کسری از آن است.

چرا فایلِ جدا و نه heredoc در گردش‌کار: پایان‌دهندهٔ heredoc باید در ستونِ
صفر باشد، و داخلِ YAML همه‌چیز تورفته است. ترفندِ تورفتگی همان چیزی است
که فردا یک نفر بی‌صدا خرابش می‌کند؛ فایلِ واقعی این مشکل را ندارد.
"""

import os, sys

def main():
    if len(sys.argv) < 2:
        print("مسیرِ چک‌پوینت را بدهید."); return 0
    src = sys.argv[1]
    if not os.path.exists(src):
        print("چک‌پوینتی در «%s» نبود؛ نسخهٔ لاغر ساخته نشد." % src); return 0
    import torch
    d = torch.load(src, map_location="cpu", weights_only=False)
    if not isinstance(d, dict):
        print("شکلِ چک‌پوینت دیکشنری نیست:", type(d)); return 0
    keep = {}
    for k in ("ema_model_state_dict", "model_state_dict"):
        if k in d:
            keep[k] = d[k]
            print("کلیدِ وزن‌ها:", k)
            break
    if not keep:
        print("کلیدِ وزن‌ها پیدا نشد. کلیدهای موجود:", list(d)[:20]); return 0
    dst = os.path.join(os.path.dirname(src), "model_slim.pt")
    torch.save(keep, dst)
    a, b = os.path.getsize(src) / 2**30, os.path.getsize(dst) / 2**30
    print("لاغر شد: %.2f گیگ → %.2f گیگ" % (a, b))
    # نسخهٔ سنگین در بسته نمی‌آید؛ اصلش روی Hugging Face می‌ماند و اگر
    # روزی لازم شد دوباره برداشته می‌شود.
    os.remove(src)
    return 0

if __name__ == "__main__":
    sys.exit(main())
