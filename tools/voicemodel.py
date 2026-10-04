#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voicemodel.py — مدلِ گویندهٔ تازه، خودکار از گیت‌هاب به درایو (۸.۴۱).

══ چرا این فایل هست ══
آموزشِ هر گویندهٔ تازه در گیت‌هاب تمام می‌شود و مدلش در artifactِ همان
اجراست. artifact دو عیب دارد: **سی روز بعد پاک می‌شود**، و از بیرونِ
Actions دانلود نمی‌شود — نه از Apps Script، نه از کانتینرِ کلاد. پس تا
امروز کسی (صاحبِ برنامه) باید دستی دو فایل را برمی‌داشت، نامِ یکی را عوض
می‌کرد و در «مدل‌های صدا» می‌گذاشت. برای گلدوز همین کار را ۲۷ سپتامبر کرد.
گامی که به دستِ آدم بند باشد، روزی که او درگیرِ چیزِ دیگری است انجام
نمی‌شود — و این‌جا یعنی سی روز بعد مدلی که ۴ تا ۵ روز آموزش دیده بود
از بین می‌رود.

══ راه همان راهِ پل است، نه راهِ دوم ══
`voicebridge.py` صدای تبدیل‌شده را به‌صورتِ release asset بالا می‌گذارد،
موتور برش می‌دارد، و پس از برداشتن پاک می‌شود (`dropCollected`). مدل
هم همین راه را می‌رود:

    --drop KEY model.pth [model.index]
        تکه‌تکه (هر تکه ۳۲ مگابایت — زیرِ سقفِ ۵۰ مگابایتیِ UrlFetchApp)
        در Releaseِ «voice-model-drop»، و نشانیِ تکه‌ها و اثرانگشتِ کلِ
        فایل در `docs/voices.json` (`speakers[KEY].modelDrop`).
    --clean
        صفِ گویندگان را از درایو می‌خوانَد؛ هر مدلی که موتور گفته «رسید»
        (`models` در صف) **و هر مدلی که بیش از EXPIRE_H ساعت منتظر مانده**
        از Release پاک می‌شود. فایلِ بی‌صاحب در همان Release هم.

══ بهای این راه، صریح ══
مدلِ صدای یک آدمِ واقعی چند ساعت روی لینکِ عمومی می‌نشیند — این ریپو
عمومی است و Releaseهایش هم. صاحبِ برنامه این را دانست و پذیرفت (۴ اکتبر).
دو سد کوتاهش می‌کنند: موتور هر ساعت سر می‌زند، و پاک‌شدن پس از تأییدِ
موتور یا پس از EXPIRE_H، هر کدام زودتر. **و هیچ‌وقت پیش از تأییدِ
موتور به دلیلِ دیگری پاک نمی‌شود جز سقفِ زمان** — پاک‌کردنِ چیزی که
هنوز برداشته نشده یعنی مدل گم شد.

══ چرا تکه‌ها اندازهٔ ثابتِ ۳۲ مگابایت دارند ══
موتور با «بارگذاریِ ازسرگیری‌پذیرِ» درایو تکه‌به‌تکه می‌نویسد، و درایو
همهٔ تکه‌ها جز آخری را **مضربِ ۲۵۶ کیلوبایت** می‌خواهد. ۳۲ مگابایت هم
مضرب است و هم زیرِ سقفِ یک پاسخِ UrlFetchApp.
"""

import datetime
import hashlib
import io
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voiceintake import fetchQueue, loadState, saveState, say  # noqa: E402

REPO = os.environ.get("GITHUB_REPOSITORY", "mahdighandi1989/Content-Engine")
TAG = os.environ.get("VM_RELEASE_TAG", "voice-model-drop")
PIECE = 32 * 1024 * 1024
# فقط برای آزمون: تکهٔ کوچک‌تر، ولی همچنان مضربِ ۲۵۶ کیلوبایت — قاعدهٔ درایو
# در آزمون هم شکسته نمی‌شود، وگرنه آزمون چیزی جز تولید را می‌سنجید.
if os.environ.get("VM_PIECE_KB"):
    _kb = int(os.environ["VM_PIECE_KB"])
    if _kb <= 0 or _kb % 256:
        raise SystemExit("VM_PIECE_KB باید مضربِ ۲۵۶ باشد")
    PIECE = _kb * 1024
EXPIRE_H = float(os.environ.get("VM_EXPIRE_H", "72"))

# همان واژه‌هایی که موتور (بخشِ ۳۶، `vbrModelDrop*`) می‌خوانَد.
DS_WAIT, DS_TAKEN, DS_EXPIRED = "منتظرِ موتور", "برداشته شد", "منقضی"


def gh(args):
    """فراخوانِ API با توکنِ خودِ اجرا — همان شکلِ `voicebridge.gh`."""
    tok = os.environ.get("GH_TOKEN", "")
    base = ["curl", "-sS", "--fail-with-body",
            "-H", "Authorization: Bearer " + tok,
            "-H", "Accept: application/vnd.github+json"]
    return subprocess.check_output(base + args).decode("utf-8")


def ensureRelease():
    try:
        return json.loads(gh(["https://api.github.com/repos/%s/releases/tags/%s"
                              % (REPO, TAG)]))
    except Exception:
        pass
    body = json.dumps({"tag_name": TAG, "name": "voice model drop (temporary)",
                       "body": "مدلِ گویندهٔ تازه، فقط تا وقتی موتور برش دارد. "
                               "ساختهٔ گردش‌کار؛ پس از برداشتن پاک می‌شود.",
                       "draft": False, "prerelease": True})
    return json.loads(gh(["-X", "POST",
                          "https://api.github.com/repos/%s/releases" % REPO,
                          "-d", body]))


def assetSlug(key):
    """نامِ دارایی فقط ASCII — درسِ `voicebridge.assetName` (۷٫۷۷)."""
    out = []
    for ch in str(key):
        out.append(ch if (ord(ch) < 128 and (ch.isalnum() or ch in "._-")) else "-")
    slug = "".join(out).strip("-.") or "speaker"
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug[:40]


def sha256File(path):
    h = hashlib.sha256()
    with io.open(path, "rb") as f:
        for blk in iter(lambda: f.read(1 << 20), b""):
            h.update(blk)
    return h.hexdigest()


def splitFile(path, size=PIECE):
    """فایل ⇒ تکه‌های هم‌اندازه (جز آخری). `[(مسیر، اندازه، sha256)]`."""
    out = []
    with io.open(path, "rb") as f:
        n = 0
        while True:
            blk = f.read(size)
            if not blk:
                break
            n += 1
            p = "%s.part%02d" % (path, n)
            io.open(p, "wb").write(blk)
            out.append((p, len(blk), hashlib.sha256(blk).hexdigest()))
    return out


def upload(rel, path, name):
    for a in (rel.get("assets") or []):
        if a.get("name") == name:
            try:
                gh(["-X", "DELETE",
                    "https://api.github.com/repos/%s/releases/assets/%s" % (REPO, a["id"])])
            except Exception:
                pass
    out = gh(["-X", "POST",
              "-H", "Content-Type: application/octet-stream",
              "--data-binary", "@" + path,
              "https://uploads.github.com/repos/%s/releases/%s/assets?name=%s"
              % (REPO, rel["id"], name)])
    return json.loads(out).get("browser_download_url", "")


def nowZ():
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def drop(key, pth, index=""):
    """مدل را تکه‌تکه بالا بگذار و در `docs/voices.json` بنویس. ۰ یعنی شد."""
    if not key or not os.path.isfile(pth):
        say("::error::مدلِ «%s» برای تحویل پیدا نشد (%s)." % (key, pth))
        return 1
    st = loadState()
    cur = st["speakers"].get(key) or {}
    rel = ensureRelease()
    stamp = hashlib.sha1((key + nowZ()).encode("utf-8")).hexdigest()[:8]
    rec = {"v": 1, "at": nowZ(), "state": DS_WAIT, "expireH": EXPIRE_H}
    for kind, path in (("pth", pth), ("index", index)):
        if not path or not os.path.isfile(path):
            continue
        whole = {"name": "%s.%s" % (key, kind), "size": os.path.getsize(path),
                 "sha256": sha256File(path), "parts": []}
        pieces = splitFile(path)
        for i, (p, sz, h) in enumerate(pieces):
            nm = "%s-%s.%s.p%02dof%02d" % (assetSlug(key), stamp, kind, i + 1, len(pieces))
            url = upload(rel, p, nm)
            if not url:
                say("::error::تکهٔ %s بالا نرفت." % nm)
                return 1
            whole["parts"].append({"url": url, "size": sz, "sha256": h})
            os.remove(p)
        rec[kind] = whole
        say("  ⬆ %s: %d تکه، %d بایت" % (whole["name"], len(whole["parts"]), whole["size"]))
    if "pth" not in rec:
        say("::error::فایلِ .pth نبود؛ چیزی تحویل نشد.")
        return 1
    cur["modelDrop"] = rec
    st["speakers"][key] = cur
    saveState(st)
    say("✅ مدلِ «%s» برای موتور گذاشته شد؛ پس از برداشتن (یا %g ساعت) پاک می‌شود."
        % (key, EXPIRE_H))
    return 0


def ageHours(at):
    try:
        t = datetime.datetime.strptime(str(at), "%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return 1e9          # تاریخِ ناخوانا: کهنه فرض کن — سمتِ امنِ «عمومی نماند»
    return (datetime.datetime.utcnow() - t).total_seconds() / 3600.0


def clean(q):
    """تحویل‌شده‌ها و منقضی‌ها را از Release پاک کن. برمی‌گرداند: آیا voices.json عوض شد."""
    st = loadState()
    have = (q or {}).get("models") or {}
    if not isinstance(have, dict):
        have = {}
    keep = set()           # دارایی‌هایی که هنوز باید بمانند
    kill = []              # (key, state)
    for key, sp in st["speakers"].items():
        md = (sp or {}).get("modelDrop") or None
        if not isinstance(md, dict) or md.get("state") != DS_WAIT:
            continue
        got = have.get(key) if isinstance(have.get(key), dict) else None
        # تأیید باید مالِ **همین** تحویل باشد: تأییدِ تحویلِ قبلیِ همان گوینده
        # (آموزشِ دوباره) نباید تکه‌های تازه را پیش از برداشتن پاک کند.
        if got and got.get("ok") and str(got.get("drop") or md.get("at")) == str(md.get("at")):
            kill.append((key, DS_TAKEN))
        elif ageHours(md.get("at")) > float(md.get("expireH") or EXPIRE_H):
            kill.append((key, DS_EXPIRED))
        else:
            for kind in ("pth", "index"):
                for part in ((md.get(kind) or {}).get("parts") or []):
                    keep.add(str(part.get("url") or "").rsplit("/", 1)[-1])
    try:
        rel = json.loads(gh(["https://api.github.com/repos/%s/releases/tags/%s" % (REPO, TAG)]))
    except Exception:
        rel = None
    n = 0
    if rel:
        # هر دارایی‌ای که مالِ یک تحویلِ منتظر نیست، می‌رود — این Release فقط
        # برای همین کار است، پس چیزِ دیگری در آن جا ندارد (تحویلی که کامیتش
        # شکست، فایلش را بی‌صاحب گذاشته بود).
        for a in (rel.get("assets") or []):
            if a.get("name") in keep:
                continue
            try:
                gh(["-X", "DELETE",
                    "https://api.github.com/repos/%s/releases/assets/%s" % (REPO, a["id"])])
                n += 1
            except Exception as e:
                say("پاک نشد: %s — %s" % (a.get("name"), str(e)[:80]))
    if n:
        say("  ↺ %d تکهٔ مدل از Release پاک شد (مدلِ صدا عمومی نمی‌مانَد)." % n)
    if not kill:
        return False
    for key, state in kill:
        md = st["speakers"][key]["modelDrop"]
        md["state"] = state
        md["closedAt"] = nowZ()
        for kind in ("pth", "index"):
            if isinstance(md.get(kind), dict):
                md[kind]["parts"] = [{"size": p.get("size"), "sha256": p.get("sha256")}
                                     for p in (md[kind].get("parts") or [])]
        say("  • %s: %s" % (key, state))
    saveState(st)
    return True


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "--drop":
        if len(sys.argv) < 4:
            say("::error::کاربرد: --drop KEY model.pth [model.index]")
            return 1
        return drop(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "")
    if mode == "--clean":
        fid = os.environ.get("VOICE_QUEUE_ID", "")
        q = fetchQueue(fid) if fid else None
        # صفِ ناخوانا تأییدی ندارد، ولی سقفِ زمان هنوز اجرا می‌شود: بی‌صفی
        # نباید یعنی «مدل برای همیشه عمومی».
        changed = clean(q or {})
        out = os.environ.get("GITHUB_OUTPUT", "")
        if out:
            io.open(out, "a", encoding="utf-8").write(
                "changed=%s\n" % ("true" if changed else "false"))
        return 0
    say("::error::حالتِ ناشناخته: %s" % mode)
    return 1


if __name__ == "__main__":
    sys.exit(main())
