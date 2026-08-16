# Content-Engine — agent brief (CLAUDE.md)

> این فایل، بریفِ عاملِ کلاد برای این ریپوست. هر سشن اولْ این را بخواند.
> Read this first. It encodes the rules that keep the auto-update cycle intact.

## What this is
A single-file Google Apps Script engine ("موتور محتوا") that produces two daily
Persian podcasts — «از همه جا از همه رنگ» (variety, published 07:00 Dubai) and
«درس‌نامه» (specialist, 08:00) — by reading five **read-only** Google Sheets and
writing audio/text/status to a Drive OUTPUT folder.

The deployed engine is ONE file, `engine.gs`, assembled from the 22 section files
in `src/` by `build.js`. `CODE_VERSION` lives near the top of `src/00_Config.gs`.

## Absolute rules (never violate)
- The five SOURCE spreadsheets and their folders are **READ-ONLY**. Never write,
  rename, move, or delete anything in them.
- All writes go to the OUTPUT folder only. **Never** write in the backup folder.
- **RUN the tests** — never just read the code. A change isn't done until every
  `run_*.js` suite passes.
- The user is cost-conscious: prefer the cheap path. Don't spin up review-fleet
  agents unless explicitly asked.

## Build & test
```sh
# from the repo root
node build.js                 # -> writes engine.gs (header from build_header.txt)
for f in run_*.js; do node "$f" || echo "FAILED: $f"; done   # ALL must pass
```
Tests read the sections from `src/` and use `mock.js` (a Node mock of the GAS
runtime). If a fresh clone can't find paths, run everything from the repo root.

## The auto-update cycle (how a code change reaches the engine)
From v5.12 the **source of truth is this GitHub repo**. Nightly (2:30 Dubai) the
engine fetches `manifest.json` (raw); if `version` > running `CODE_VERSION`, it
fetches `engine.gs` (raw), verifies **SHA-256 + in-file version + required
functions + Google's compiler**, installs via the Apps Script API, then
`afterCodeSwap` re-arms triggers and notifies (Telegram + email). It also saves a
copy to the Drive «کدها» folder.

### Shipping a change — the handshake (do ALL of these)
1. Edit the relevant file(s) in `src/`. Make ALL coordinated edits together (a
   change to one function + its callers ships as one complete build).
2. New version = `max(running, this repo's CODE_VERSION) + 0.1`. Set
   `CODE_VERSION` in `src/00_Config.gs` to it **exactly** — the engine rejects a
   package whose in-file version ≠ manifest version (the real 5.9/5.8 bug).
3. `node build.js` to rebuild `engine.gs`.
4. Run every `run_*.js`; all green.
5. `sha256sum engine.gs` → hex.
6. Update `manifest.json`:
   `{version, codeFile:"engine.gs", sha256, releasedAt, summary, fixes:[...], sourceReportIds:[...]}`.
7. Append a new row to the **Changelog** table in `README.md` (version, date,
   one-line summary). Every shipped change is recorded there.
8. `git add -A && git commit && git push origin main` — **push directly, always.**
   Never hand the file to the user and wait for a manual push; the workflow ends
   with your own push. (The engine installs it that night; if the user also pasted
   it manually, the engine sees "up-to-date" — no double install.)
9. NEVER push a version older than running (no downgrade). NEVER ship a partial
   file — always the complete `engine.gs`.

## Key IDs
- OUTPUT Drive folder: `19o4q7KIuxvWFkEe45QUbI5qP2hJPWELq`
  (code archive subfolder: «کدها — نسخه‌های موتور»)
- Backup folder — **READ-ONLY, never write**: `1OwBYvetCndcuRcFcQLmrJ79sFhynLNno`
- Apps Script project (the engine's own — never touch other projects):
  `1HhFoQFVgQvJF7lJSl1smYcRcCHKnO0xDbNXkMlCgGK2CBicy2X_AVr4_`
- This repo: `github.com/mahdighandi1989/Content-Engine` (public)

## Reports / errors → fixes
The engine logs issues to the «گزارش‌های نظارت» tab and `_STATUS.json` in OUTPUT.
A monitor session reads these, fixes in `src/`, tests, and ships via the handshake
above; note answered rows in `manifest.json`'s `sourceReportIds`.

## Emergency revert
Set `CODE_SOURCE: 'drive'` in `src/00_Config.gs` to fall back to the old
Drive-based update path. The Apps Script menu also has «بازگشت به نسخهٔ پشتیبانِ کد».

## تمیزیِ ریپو (Repo hygiene)
منبعِ حقیقت این‌هاست: `src/` + `engine.gs` + `manifest.json` + تست‌ها + `CLAUDE.md` +
`README.md`. اگر در ریشه فایلِ کهنه/تکراری ظاهر شد (نسخه‌های قدیمیِ `_CODE-v*.gs`،
زیپ‌های آپلودشده مثلِ `*.tgz`، خروجی‌های ادیتور)، آن را به `archive/` ببر، نه اینکه
پاک کنی و نه اینکه منبع حسابش کنی. ریشهٔ ریپو فقط مجموعهٔ کاریِ واقعی بماند.

هرگز از فایل‌های `archive/` ساخت/تست نکن. فهرستِ آنچه بایگانی شده و چرا، در
[`archive/README.md`](./archive/README.md) است.

## تسک‌های زمان‌بندی‌شدهٔ مرتبط با این موتور (دو تا)

۱) **«غنی‌سازی اینترنتی پادکست‌ها»** — هر ساعت، دقیقهٔ ۲۰ (cron: `20 * * * *`). یک
   سشنِ Cowork که پیش از صداگذاری، متنِ هر قسمت را با جست‌وجوی وب کامل‌تر می‌کند و
   نسخهٔ اعراب‌دار (tashkil) را می‌سازد؛ جواب را به‌صورتِ `_ENRICH-<show>-<NNN>.json`
   در پوشهٔ OUTPUT درایو می‌گذارد. با کدِ ریپو کاری ندارد (با درایو/شیت‌ها کار
   می‌کند)؛ مستقل و بی‌تداخل است.

۲) **«نظارت روزانه»** — هر روز ۱۲:۰۰ دبی (cron: `0 8 * * *` به‌وقتِ UTC). یک سشنِ
   Cowork که `_STATUS.json` و گزارش‌ها را می‌خواند، دو پادکست و پشتیبان و داوریِ
   مجموعه‌ها را چک می‌کند، `_REPORT-YYYYMMDD.json` می‌سازد، و وقتی باگی پیدا شود
   نسخهٔ تازهٔ کد را می‌سازد.

   ⚠️ **نکتهٔ هماهنگیِ مهم:** پرامپتِ فعلیِ این تسک (`monitor_prompt_current.txt`)
   هنوز کدِ تازه را در **درایو** می‌گذارد (روشِ نسخهٔ ۵٫۱۰)، اما موتورِ ۵٫۱۲ کد را از
   **گیت‌هاب** می‌خواند. پس تا وقتی این تسک به‌روز نشده، ساخته‌هایش را موتور نمی‌بیند.
   این تسک باید عوض شود تا به‌جای درایو، در همین ریپو build/test کند، Changelog و
   `manifest.json` را بالا ببرد و push کند. (این کار بیرون از این ریپوست؛ صاحبِ
   پروژه گفته خودش/دستیارش ترتیبش را می‌دهد — اگر ازت خواسته شد، آماده باش که
   پرامپتِ آن تسک را هم به جریانِ گیت‌هابی تغییر دهی.)
