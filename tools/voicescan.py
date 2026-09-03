#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voicescan.py — «آیا اصلاً مدلی برای فارسی هست؟»

══ چرا این فایل لازم شد ══

پس از پنج اجرا یک چیز قطعی شد: هیچ‌کدام از چک‌پوینت‌های **پایه** فارسی
نمی‌دانند. Chatterbox بیست‌وسه زبان دارد و فارسی در آن نیست؛ XTTS هفده
زبان دارد و نیست؛ f5 پایه انگلیسی و چینی است.

ولی این پایانِ راه نیست، چون `f5-tts_infer-cli` آرگومان‌های `--ckpt_file`
و `--vocab_file` دارد: یعنی می‌شود چک‌پوینتِ **دیگری** به آن داد. اگر
کسی f5 را روی فارسی تنظیمِ دقیق (fine-tune) کرده باشد، آن‌وقت f5 هم
فارسی می‌داند هم کلونِ صدا می‌کند — و این دقیقاً چیزی است که می‌خواهیم.

آیا چنین چیزی هست؟ **نمی‌دانم**، و از محیطِ من Hugging Face بسته است
(۴۰۳). پس این اسکریپت روی همان ماشینی می‌رود که شبکه‌اش باز است و
می‌پرسد. جوابِ «نمی‌دانم» را نباید حدس زد وقتی می‌شود پرسید.

هیچ مدلی دانلود نمی‌شود — فقط فهرست. چند ثانیه طول می‌کشد.
"""

import json, os, sys, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voicelab as V

API = "https://huggingface.co/api/models"

# هر ردیف: (عنوانِ فارسی، پارامترهای پرس‌وجو)
QUERIES = [
    ("f5 روی فارسی تنظیم شده؟",        {"search": "f5-tts persian"}),
    ("f5 روی فارسی — واژهٔ دیگر",       {"search": "f5 farsi"}),
    ("هر TTSی که زبانش fa اعلام شده",   {"filter": "text-to-speech", "language": "fa"}),
    ("XTTS روی فارسی؟",                 {"search": "xtts persian"}),
    ("هر مدلِ گفتارِ فارسی",            {"search": "persian tts"}),
    ("تبدیلِ صدا (زبان‌مستقل)",         {"search": "voice conversion rvc"}),
    # ══ «اگر صاحبِ مخزن خصوصی‌اش کند چه؟» — سؤالِ خودِ صاحبِ برنامه ══
    # جوابِ درست «نسخهٔ پشتیبان می‌گیریم» است، ولی نیمهٔ دومش این است که
    # بدانیم اصلاً بدیلی هست یا نه. سه واژهٔ دیگر، چند ثانیه، هر بار.
    ("f5 — نامِ دیگرِ فارسی",           {"search": "f5-tts farsi"}),
    ("هر چه f5 و fine-tune",            {"search": "f5-tts finetune"}),
    ("گفتارِ فارسی، هر معماری",         {"filter": "text-to-speech", "search": "persian"}),
]


def ask(params):
    q = dict(params)
    q.update({"sort": "downloads", "direction": "-1", "limit": "12"})
    url = API + "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"User-Agent": "content-engine-voicelab"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    out = {"at": None, "queries": []}
    import time
    out["at"] = time.strftime("%Y-%m-%d %H:%M")
    for title, params in QUERIES:
        row = {"title": title, "params": params, "models": []}
        try:
            for m in ask(params):
                row["models"].append({
                    "id": m.get("modelId") or m.get("id"),
                    "downloads": m.get("downloads", 0),
                    "likes": m.get("likes", 0),
                    "pipeline": m.get("pipeline_tag") or "",
                })
        except Exception as e:
            row["error"] = str(e)[:200]
        out["queries"].append(row)

    print("# نقشهٔ مدل‌های فارسی روی Hugging Face\n")
    for row in out["queries"]:
        print("## " + row["title"])
        if row.get("error"):
            print("خطا: " + row["error"] + "\n")
            continue
        if not row["models"]:
            print("چیزی پیدا نشد.\n")
            continue
        print("| مدل | دانلود | لایک | نوع |")
        print("|---|---:|---:|---|")
        for m in row["models"]:
            print("| `%s` | %s | %s | %s |" %
                  (m["id"], m["downloads"], m["likes"], m["pipeline"]))
        print("")
    # ══ سؤالی که ارزانِ چند ثانیه است و جوابش کلِ کیفیت را توضیح می‌دهد ══
    #
    # `vocab_char_map.get(c, 0)` و `assert vocab_char_map[" "] == 0`: در f5
    # هر نویسهٔ ناشناخته **فاصله** می‌شود. اگر اعرابِ ما در واژگانِ این
    # چک‌پوینت نباشد، «دَر» به «د ر» بدل می‌شود — صدا سالم می‌مانَد و
    # واژه‌ها می‌پاشند، دقیقاً همان چیزی که شنیده شد. این را نمی‌شود از
    # روی خروجی فهمید، ولی یک فایلِ متنیِ کوچک قطعی‌اش می‌کند.
    #
    # و اینجا انجام می‌شود نه در کارِ سنگین، چون این کار همیشه تمام می‌شود:
    # اجرای #۹ سرِ سقفِ زمان لغو شد و هیچ تشخیصی به دست نیامد.
    ck = (os.environ.get("F5_CKPT") or "").strip()
    if ck:
        got, vo = V.f5Resolve_(ck, (os.environ.get("F5_VOCAB") or "").strip())
        txt = os.environ.get("LAB_TEXT") or V.DEFAULT_TEXT
        aud = V.vocabAudit_(vo, {"با اعراب": txt, "بی اعراب": V.noTash_(txt)})
        out["vocab_audit"] = {"ckpt": got, "vocab": vo, "audit": aud}
        print("## واژگانِ `%s`\n" % ck)
        if not aud.get("ok"):
            print("خوانده نشد: %s\n" % (aud.get("error") or aud.get("note") or "—"))
        else:
            print("- اندازه: **%s** نویسه" % aud.get("size"))
            print("- اعراب در واژگان هست؟ **%s**" %
                  ("بله" if aud.get("tashkil_supported") else "**نه**"))
            print("- نیم‌فاصله هست؟ **%s**" %
                  ("بله" if aud.get("zwnj_in_vocab") else "نه"))
            for k, v in (aud.get("missing") or {}).items():
                print("- در متنِ «%s»: %s نویسهٔ ناشناخته (%s٪) → همه **فاصله** می‌شوند: %s"
                      % (k, v["count"], v["pct"], "، ".join(v["chars"][:12])))
            if not (aud.get("missing") or {}):
                print("- هیچ نویسهٔ ناشناخته‌ای نیست.")
        print("")

    with open("voicescan.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
