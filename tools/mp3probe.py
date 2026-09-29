#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mp3probe.py — «این ضبط چه کیفیتی دارد؟»، بی دانلودِ کاملِ فایل.

══ چرا این فایل لازم شد ══
۷٫۸۰ نشان داد که هیچ‌جای این خط تولید نرخِ نمونه را نگاه نمی‌کرد، و
`vintProbeOne_` (بخشِ ۳۳) آن سد را ساخت. ولی آن سد **یک** فایل از هر
گوینده را می‌سنجد — `spk.files[0]` — و ترتیبِ `getFiles()` هیچ وعده‌ای
نیست. در پوشه‌ای که ۲۷ فایلِ ۱۱ کیلوهرتزی و ۳۰ فایلِ تازه قاتیِ هم
باشند، آن یک فایل جوابِ کلِ پوشه می‌شود؛ هر دو جهتش غلط است.

و از کانتینرِ کلاد `drive.usercontent.google.com` را پراکسی می‌بندد
(۴۰۳). پس سنجشِ روی‌درخواست جایی می‌رود که شبکه‌اش باز است: رانرِ
گیت‌هاب. همان تقسیمِ کارِ `_YT-RENDER.json` — موتور تصمیم می‌گیرد،
اکشن کار می‌کند.

══ چرا فقط سرِ فایل خوانده می‌شود ══
هدرِ اولین فریمِ MPEG همه‌چیزی را که می‌خواهیم دارد. ۳۰ فایلِ هفت
مگابایتی یعنی ۲۱۰ مگابایت دانلود برای جوابی که در ۱۲۸ کیلوبایتِ اول
هست. `Range` می‌گیریم، `Content-Range` اندازهٔ کل را می‌دهد، و مدت از
آن حساب می‌شود.

══ و بایت‌ها با هدرشان داوری می‌شوند، نه با پسوند ══
درایو به درخواستِ یک فایلِ بسته با **صفحهٔ HTML** جواب می‌دهد نه با
۴۰۳ (۷٫۳۳). پس اگر آنچه رسید فریمِ MPEG نداشت، همان گفته می‌شود — نه
«صفر هرتز»، که عددی است که کسی رویش تصمیم می‌گیرد.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

HEAD_BYTES = 131072          # ۱۲۸ کیلوبایت؛ هدر همیشه اینجاست
DL = "https://drive.usercontent.google.com/download?id=%s&export=download&confirm=t"

BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
SR = [[44100, 48000, 32000], [22050, 24000, 16000], [11025, 12000, 8000]]


def say(msg):
    print(msg, flush=True)


def head_(url, nbytes=HEAD_BYTES):
    """سرِ فایل + اندازهٔ کل. برمی‌گرداند (bytes, total, why)."""
    rq = urllib.request.Request(url, headers={
        "Range": "bytes=0-%d" % (nbytes - 1),
        "User-Agent": "mp3probe/1",
    })
    try:
        with urllib.request.urlopen(rq, timeout=90) as r:
            buf = r.read(nbytes)
            cr = r.headers.get("Content-Range") or ""
            total = 0
            m = re.search(r"/(\d+)\s*$", cr)
            if m:
                total = int(m.group(1))
            elif r.headers.get("Content-Length"):
                total = int(r.headers["Content-Length"])
            return buf, total, ""
    except urllib.error.HTTPError as e:
        return b"", 0, "HTTP %s" % e.code
    except Exception as e:                                   # noqa: BLE001
        return b"", 0, str(e)


def id3len_(b):
    """طولِ برچسبِ ID3v2 در سرِ فایل — صفر اگر نباشد."""
    if len(b) > 10 and b[0:3] == b"ID3":
        return 10 + ((b[6] & 0x7F) << 21 | (b[7] & 0x7F) << 14 |
                     (b[8] & 0x7F) << 7 | (b[9] & 0x7F))
    return 0


def frame_(b, start):
    """اولین فریمِ معتبرِ MPEG صوتیِ لایهٔ ۳ از این نقطه به بعد."""
    i, n = start, len(b)
    while i < n - 4:
        if b[i] == 0xFF and (b[i + 1] & 0xE0) == 0xE0:
            ver = (b[i + 1] >> 3) & 3
            layer = (b[i + 1] >> 1) & 3
            bri = (b[i + 2] >> 4) & 0xF
            sri = (b[i + 2] >> 2) & 3
            if layer == 1 and bri not in (0, 15) and sri != 3 and ver != 1:
                vk = 0 if ver == 3 else (1 if ver == 2 else 2)
                return {
                    "at": i,
                    "mpeg": {3: "1", 2: "2", 0: "2.5"}[ver],
                    "kbps": (BR1 if ver == 3 else BR2)[bri],
                    "sr": SR[vk][sri],
                    "ch": 1 if ((b[i + 3] >> 6) & 3) == 3 else 2,
                    # نمونه در هر فریم: MPEG1 لایهٔ ۳ برابرِ ۱۱۵۲، بقیه ۵۷۶
                    "spf": 1152 if ver == 3 else 576,
                }
        i += 1
    return None


def xing_(b, fr):
    """تعدادِ فریم از هدرِ Xing/Info — تنها راهِ مدتِ دقیق در VBR."""
    if not fr:
        return 0
    seek = b[fr["at"]:fr["at"] + 200]
    for tag in (b"Xing", b"Info"):
        k = seek.find(tag)
        if k < 0:
            continue
        flags = int.from_bytes(seek[k + 4:k + 8], "big")
        if flags & 1 and len(seek) >= k + 12:
            return int.from_bytes(seek[k + 8:k + 12], "big")
    return 0


def probe(fid, name=""):
    """یک شناسهٔ درایو → اندازه‌های واقعیِ همان فایل."""
    out = {"id": fid, "name": name, "ok": False}
    buf, total, why = head_(DL % fid)
    out["bytes"] = total
    if why:
        out["why"] = why
        return out
    if not buf:
        out["why"] = "هیچ بایتی نرسید"
        return out
    low = buf[:400].lstrip().lower()
    if low.startswith(b"<!doctype") or low.startswith(b"<html"):
        out["why"] = "درایو صفحهٔ HTML داد، نه فایل — یعنی عمومی نیست"
        return out
    skip = id3len_(buf)
    fr = frame_(buf, skip if skip < len(buf) else 0)
    if not fr:
        out["why"] = "فریمِ MPEG پیدا نشد (%d بایت خوانده شد)" % len(buf)
        return out
    frames = xing_(buf, fr)
    audio = max(0, total - skip)
    if frames and fr["sr"]:
        sec = frames * fr["spf"] / float(fr["sr"])
        how = "Xing"
    elif fr["kbps"]:
        sec = audio * 8.0 / (fr["kbps"] * 1000.0)
        how = "CBR"
    else:
        sec = 0.0
        how = "—"
    out.update({"ok": True, "mpeg": fr["mpeg"], "kbps": fr["kbps"],
                "sr": fr["sr"], "ch": fr["ch"], "seconds": round(sec, 1),
                "minutes": round(sec / 60.0, 1), "id3": skip, "how": how})
    return out


def ids_(argv):
    """شناسه‌ها از آرگومان‌ها و از محیط — با هر جداکننده‌ای."""
    raw = " ".join(argv) + " " + (os.environ.get("MP3PROBE_IDS") or "")
    got, seen = [], {}
    for tok in re.split(r"[\s,;]+", raw):
        tok = tok.strip()
        if not tok:
            continue
        m = re.search(r"[-\w]{20,}", tok)
        if not m:
            continue
        k = m.group(0)
        if k not in seen:
            seen[k] = 1
            got.append(k)
    return got


def main(argv):
    want = ids_(argv)
    if not want:
        say("هیچ شناسه‌ای داده نشد. MP3PROBE_IDS یا آرگومان.")
        return 2
    say("سنجشِ %d فایل — فقط سرِ هر فایل خوانده می‌شود.\n" % len(want))
    rows = []
    for k in want:
        r = probe(k)
        rows.append(r)
        if r["ok"]:
            say("%s  %5d Hz · %3d kbps · %s · %6.1f دقیقه · %s" % (
                k, r["sr"], r["kbps"],
                "مونو" if r["ch"] == 1 else "استریو",
                r["minutes"], r["how"]))
        else:
            say("%s  ✖ %s" % (k, r.get("why") or "نامعلوم"))
    ok = [r for r in rows if r["ok"]]
    say("")
    if ok:
        by = {}
        for r in ok:
            key = "%d Hz · %d kbps · %s" % (
                r["sr"], r["kbps"], "مونو" if r["ch"] == 1 else "استریو")
            by.setdefault(key, []).append(r)
        say("── گروه‌ها ──")
        for key in sorted(by):
            g = by[key]
            say("%s → %d فایل، %.1f دقیقه" % (
                key, len(g), sum(x["minutes"] for x in g)))
        say("")
        say("جمعِ سنجیده‌شده: %d فایل، %.1f دقیقه (%.1f ساعت)" % (
            len(ok), sum(x["minutes"] for x in ok),
            sum(x["minutes"] for x in ok) / 60.0))
    bad = [r for r in rows if not r["ok"]]
    if bad:
        say("سنجیده نشد: %d فایل" % len(bad))
    say("")
    say("JSON<<")
    say(json.dumps({"files": rows}, ensure_ascii=False))
    say(">>JSON")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
