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
import fa2latin

API = "https://huggingface.co/api/models"

# هر ردیف: (عنوانِ فارسی، پارامترهای پرس‌وجو)
# ══ یک مثبتِ کاذب که باید نوشته شود، وگرنه دوباره دنبالش می‌رویم ══
# اجرای #۱۹ فهرستِ «هر TTSی که زبانش fa اعلام شده» را داد و
# `Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice` با ۲٫۵ میلیون دانلود در آن بود —
# با کلونِ صدا از سه ثانیه. READMEِ خودش را خواندم: **ده** زبان دارد
# (چینی، انگلیسی، ژاپنی، کره‌ای، آلمانی، فرانسه، روسی، پرتغالی، اسپانیایی،
# ایتالیایی) و فارسی در آن نیست. همان داستانِ Chatterbox و XTTS.
# فیلترِ زبانِ Hugging Face این را نمی‌گیرد؛ فقط خواندنِ کارتِ مدل می‌گیرد.
# (نسخهٔ Base برای تنظیمِ دقیق ساخته شده — اگر روزی خودمان آموزش دادیم،
#  آن‌وقت دوباره جای بحث دارد، نه حالا.)
# و `alikhabazian/Xtts_persian_v2` مخزنی است با دو فایلِ خالی: هیچ وزنی
# در آن نیست.
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


# ══ نامزدهایی که اسکنِ اجرای #۱۰ رو کرد ══
#
# آن اسکن دو چیز نشان داد که قبلاً نداشتیم:
#  • یک Chatterboxِ **فارسی** — و Chatterbox در اجرای #۲ رنگِ صدای رضوی را
#    از بیست ثانیه گرفته بود و تنها چیزی که کم داشت زبان بود.
#  • یک F5ِ فارسی که ورودی‌اش **IPA** است — یعنی تلفظ دیگر حدس نیست.
#
# ولی «هست» با «می‌شود استفاده کرد» یکی نیست: یک مخزنِ gguf شاید فقط برای
# اجراکنندهٔ دیگری باشد، و یک F5ِ IPA بی vocab.txt به درد نمی‌خورد. فهرستِ
# فایل‌ها این را در چند ثانیه می‌گوید — بی دانلود، بی حدس، بی یک اجرای
# چهل‌دقیقه‌ایِ دیگر.
CANDIDATES = [
    # ══ و سرنخی که از READMEِ نامزدِ دیگری درآمد ══
    # داشتم برای MOSS-TTS-Nano موتور می‌ساختم که README خودش سه چیز گفت:
    # سقفِ عملیِ هر گفته پنج ثانیه، خروجیِ حسی تخت، و — دربارهٔ کارِ خودش —
    # «برای فارسیِ بلند، OmniVoice ابزارِ بهتری است». نویسنده‌ای که مدلِ
    # خودش را برای کارِ ما نامناسب اعلام کند، حرفش را باید جدی گرفت.
    "k2-fsa/OmniVoice",
    # ══ سرنخی که از READMEِ نامزدِ اول درآمد (اجرای #۱۸) ══
    # `mazrba/...-gguf` فقط برای اجراکنندهٔ CrispASR است و بستهٔ پایتونیِ
    # Chatterbox نمی‌خواندش — پس رهایش کرده بودیم. ولی README خودش
    # می‌گوید از کجا آمده: `Thomcles/Chatterbox-TTS-Persian-Farsi`. آن
    # یکی قالبِ عادی دارد، و Chatterbox در اجرای #۲ رنگِ صدای رضوی را از
    # بیست ثانیه گرفته بود. یعنی دری که بسته اعلام کرده بودم، بسته نبود؛
    # فقط از پنجرهٔ درستش نگاه نکرده بودم.
    # ══ و پروانه‌اش، که اسکنِ #۱۹ خواند: cc-by-nc-4.0 ══
    # یعنی غیرتجاری. کانال قرار است درآمد داشته باشد، پس این هم مثلِ
    # KiaBush و XTTS از نظرِ **انتشار** بسته است. نسخهٔ gguf که خودش را
    # `license: mit` می‌نامد این را عوض نمی‌کند: بسته‌بندیِ دوباره
    # پروانهٔ پایه را نمی‌شوید.
    "Thomcles/Chatterbox-TTS-Persian-Farsi",
    "mazrba/Chatterbox-TTS-Persian-gguf",
    # G2Pِ رسمیِ همان چک‌پوینتی که «خیلی بهتر» شد — از اجرای #۱۹ پیدا شد
    # و حالا در خودِ آزمایشگاه به کار می‌رود.
    "KiaBush/persian-text-to-ipa-byt5",
    # MOSSِ بزرگ‌تر (Realtime، نه Nano). Nano خودش سقفِ پنج ثانیه دارد؛
    # این یکی هنوز سنجیده نشده.
    "hamidfzm/MOSS-TTS-Realtime-Persian-lora",
    "KiaBush/Persian-IPA-to-Speech-F5",
    "KEYHAN-A/aava-tts-persian-3b",
    "nimaaaAI/MOSS-TTS-Nano-Persian",
    "alikhabazian/Xtts_persian_v2",
]


def info(repo):
    """
    ══ پروانه را از API بگیر، نه از grepِ README ══
    گزارشِ اجرای #۲۱ برای k2-fsa/OmniVoice نوشت «پروانهٔ وزن‌ها در کارتِ
    مدل نیامد» — چون کارتش خطِ `license:` ندارد. ولی Hugging Face پروانه
    را در فراداده‌اش نگه می‌دارد، جدا از متنِ کارت. و این برای موتوری که
    الان ارزان‌ترین نامزد است، سؤالِ باز نمی‌مانَد: کانال قرار است درآمد
    داشته باشد و «نمی‌دانم» همان‌قدر مانع است که «غیرتجاری».
    """
    url = "https://huggingface.co/api/models/%s" % repo
    req = urllib.request.Request(url, headers={"User-Agent": "content-engine-voicelab"})
    with urllib.request.urlopen(req, timeout=45) as r:
        d = json.loads(r.read().decode("utf-8"))
    card = d.get("cardData") or {}
    return {"license": card.get("license") or "اعلام نشده",
            "license_name": card.get("license_name"),
            "base_model": card.get("base_model"),
            "downloads": d.get("downloads"), "likes": d.get("likes"),
            "tags": [t for t in (d.get("tags") or []) if t.startswith("license:")]}


def tree(repo):
    # `recursive=true` لازم است: بی آن، `examples/` فقط یک مدخلِ «پوشه»
    # است و فایل‌های داخلش اصلاً دیده نمی‌شوند — و ما دقیقاً دنبالِ
    # `examples/metadata.json` بودیم و گزارش گفت «نیست».
    url = "https://huggingface.co/api/models/%s/tree/main?recursive=true" % repo
    req = urllib.request.Request(url, headers={"User-Agent": "content-engine-voicelab"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


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
    print("## فایل‌های نامزدها — «هست» با «می‌شود استفاده کرد» یکی نیست\n")
    out["candidates"] = []
    for repo in CANDIDATES:
        row = {"id": repo, "files": []}
        try:
            row["meta"] = info(repo)
        except Exception as e:
            row["meta_error"] = str(e)[:200]
        try:
            for f in tree(repo):
                if f.get("type") != "file":
                    continue
                row["files"].append({"path": f.get("path"),
                                     "mb": round((f.get("size") or 0) / 1048576.0, 1)})
        except Exception as e:
            row["error"] = str(e)[:160]
        out["candidates"].append(row)
        print("### `%s`" % repo)
        # پروانه پیش از فهرستِ فایل‌ها می‌آید، چون تصمیم را همین می‌گیرد:
        # مخزنی که وزنش غیرتجاری است، هرچقدر هم فایلِ خوب داشته باشد
        # برای کانالی که قرار است درآمد داشته باشد بسته است.
        if row.get("meta"):
            m = row["meta"]
            print("**پروانهٔ اعلام‌شده:** `%s` · دانلود: %s · لایک: %s%s\n"
                  % (m["license"], m["downloads"], m["likes"],
                     (" · پایه: `%s`" % m["base_model"]) if m.get("base_model") else ""))
        elif row.get("meta_error"):
            print("پروانه خوانده نشد: %s\n" % row["meta_error"])
        if row.get("error"):
            print("خطا: %s\n" % row["error"])
            continue
        # فایلِ نمونه‌های مخزن، اگر باشد: قالبِ ورودیِ واقعی را از دستِ اول
        # می‌گوید. برای KiaBush یک `examples/metadata.json` هست و ما به‌جای
        # خواندنش، الفبای ورودی‌اش را حدس زدیم.
        # ══ پیش از هر «میرور کنیم و بهترش کنیم»، پروانه را بخوان ══
        # `NOTICE.md` و `RELEASE_STATUS.md` در آن مخزن تصادفی نیستند؛ نویسنده‌ای
        # که در شناسنامهٔ نمونه‌هایش نوشته «unofficial … not affiliated with or
        # endorsed by the speaker»، احتمالاً شرطی هم گذاشته. تصمیمِ «نسخه
        # برداریم و رویش کار کنیم» بی خواندنِ این‌ها، تصمیم نیست — حدس است.
        for lic in ("NOTICE.md", "RELEASE_STATUS.md", "LICENSE", "README.md"):
            if not any(f["path"] == lic for f in row["files"]):
                continue
            try:
                u = "https://huggingface.co/%s/resolve/main/%s" % (repo, lic)
                rq = urllib.request.Request(u, headers={"User-Agent": "content-engine-voicelab"})
                with urllib.request.urlopen(rq, timeout=45) as rr:
                    body = rr.read().decode("utf-8", "replace")[:2500]
                row.setdefault("terms", {})[lic] = body
                print("**`%s`**\n\n```\n%s\n```\n" % (lic, body))
            except Exception as e:
                print("(`%s` خوانده نشد: %s)\n" % (lic, str(e)[:120]))
        meta = [f["path"] for f in row["files"]
                if f["path"].endswith(".json") and "example" in f["path"].lower()]
        for mp in meta[:1]:
            try:
                u = "https://huggingface.co/%s/resolve/main/%s" % (repo, urllib.parse.quote(mp))
                rq = urllib.request.Request(u, headers={"User-Agent": "content-engine-voicelab"})
                with urllib.request.urlopen(rq, timeout=45) as rr:
                    row["examples"] = rr.read().decode("utf-8", "replace")[:1200]
                print("**`%s`**\n\n```json\n%s\n```\n" % (mp, row["examples"]))
            except Exception as e:
                print("(`%s` خوانده نشد: %s)\n" % (mp, str(e)[:120]))
        big = sorted(row["files"], key=lambda x: -x["mb"])[:10]
        print("| فایل | مگابایت |")
        print("|---|---:|")
        for f in big:
            print("| `%s` | %s |" % (f["path"], f["mb"]))
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
    # ══ واژگانِ **هر** نامزدی که vocab.txt دارد ══
    # تا اجرای #۱۵ فقط چک‌پوینتی سنجیده می‌شد که در فرم نوشته شده بود. یعنی
    # ارزان‌ترین و قطعی‌ترین سنجهٔ این ابزار، به یاد ماندنِ یک خانهٔ فرم بند
    # بود — و آن اجرا با خانهٔ خالی رفت و هیچ ممیزی‌ای نشد.
    txt = os.environ.get("LAB_TEXT") or V.DEFAULT_TEXT
    todo = []
    ck = (os.environ.get("F5_CKPT") or "").strip()
    if ck:
        todo.append(ck)
    for row in out.get("candidates", []):
        rid = row.get("id")
        if rid and rid not in todo and any(
                f["path"].endswith("vocab.txt") for f in row.get("files", [])):
            todo.append(rid)
    out["vocab_audit"] = []
    for ck in todo:
        got, vo = V.f5Resolve_(ck, "")
        aud = V.vocabAudit_(vo, {"با اعراب": txt, "بی اعراب": V.noTash_(txt),
                                 "IPA": fa2latin.convert(txt, "ipa")})
        out["vocab_audit"].append({"ckpt": got, "vocab": vo, "audit": aud})
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
        # ══ آنچه واقعاً در واژگان هست ══
        # «۱۰۰٪ ناشناخته» دو معنی دارد و تا وقتی خودِ مدخل‌ها را نبینیم
        # نمی‌شود گفت کدام: یا مدل الفبای دیگری می‌خواهد، یا خوانندهٔ ما
        # فایل را غلط می‌خوانَد. اجرای #۱۴ همین ابهام را ساخت.
        if aud.get("sample"):
            print("- طولِ مدخل‌ها: `%s`" % aud.get("entry_lengths"))
            print("- چهل مدخلِ اول: `%s`" % " ".join(aud["sample"]))
        print("")

    with open("voicescan.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
