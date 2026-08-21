# Content-Engine — agent brief (CLAUDE.md)

> این فایل، بریفِ عاملِ کلاد برای این ریپوست. هر سشن اولْ این را بخواند.
> Read this first. It encodes the rules that keep the auto-update cycle intact.

## What this is
A single-file Google Apps Script engine ("موتور محتوا") that produces two daily
Persian podcasts — «از همه جا از همه رنگ» (variety, published 07:00 Dubai) and
«درس‌نامه» (specialist, 08:00) — by reading five **read-only** Google Sheets and
writing audio/text/status to a Drive OUTPUT folder.

The deployed engine is ONE file, `engine.gs` **at the repo root**, assembled from
the 23 section files in `src/` by `tools/build.js`. `CODE_VERSION` lives near the
top of `src/00_Config.gs`.

## Absolute rules (never violate)
- The five SOURCE spreadsheets and their folders are **READ-ONLY**. Never write,
  rename, move, or delete anything in them.
- All writes go to the OUTPUT folder only. **Never** write in the backup folder.
- **RUN the tests** — never just read the code. A change isn't done until every
  `tests/run_*.js` suite passes.
- The user is cost-conscious: prefer the cheap path. Don't spin up review-fleet
  agents unless explicitly asked.

## Repo layout
```
engine.gs · manifest.json · README.md · CLAUDE.md   ← MUST stay at the root
src/                 23 numbered sections — the source of truth for the code
tools/               build.js + build_header.txt
tests/               the 27 run_*.js suites
tests/lib/           root.js (path anchor) · mock.js (GAS mock) · probe_r4_lib.js
tests/fixtures/      newsheets.json · videos.jsonl · photos.jsonl
docs/                monitor_prompt_current.txt
archive/             historical only — NEVER a build/test source
```
**Hard constraint:** `engine.gs` and `manifest.json` must stay at the repo root —
the engine reads them from the root raw URLs. `tools/build.js` always writes
`engine.gs` to the root no matter where you invoke it from.

## Build & test
```sh
node tools/build.js                                   # -> writes root engine.gs
for f in tests/run_*.js; do node "$f" || echo "FAILED: $f"; done   # ALL must pass
```
Tests read the sections from `src/` and use `tests/lib/mock.js` (a Node mock of
the GAS runtime). Each suite requires `tests/lib/root.js` first, which pins the
cwd to the repo root — so the suites run from any directory.

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
3. `node tools/build.js` to rebuild the root `engine.gs`.
4. Run every `tests/run_*.js`; all green.
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

## Source-sheet scripts (section 22) — audit, auto-install, verdict
Some SOURCE sheets carry their own Apps Script (photo analyzer, video analyzer).
`CFG.SOURCE_SCRIPTS` lists them — a script's id cannot be discovered from its
sheet, so it is configured once and the link is then verified (`parentId` when
bound, else the sheet id appearing in its own source). A sheet absent from the
list simply has no script; that is not a fault.

The analyzers have their own release channel, parallel to the engine's but
separate from it: `sources/<key>/analyzer.gs` + `sources/<key>/manifest.json`
(`version`, `sha256`, `baseSha256`, `requiredFunctions`, `resolves`). Nightly,
`srcNightly_` runs **verdict first, then install** — reversed, tonight's install
would blur into last night's and no error could be attributed.

**Three gates before any write** (`srcVerify_`): package sha matches its
manifest · every `requiredFunctions` entry is present (triggers bind by name) ·
`baseSha256` matches the live code. The third one means a hand-edited analyzer
stops the install instead of losing your edit. `srcJoinJs_` must be the *only*
way live JS is hashed — computing it differently in two places is exactly the
bug that once blocked every install (`run_srcscripts_test.js` ۹.۱-ب).

**Install** (`srcInstall_`) backs the live code up to the Drive «کدها» folder
first, writes one `SERVER_JS` file and preserves every other file verbatim, so
`appsscript.json` (scopes) and any HTML stay untouched. It stamps the install
time plus a **baseline**: how often each `resolves` signature fired in the
equal-length window before the swap.

**Verdict** (`srcVerdict_`), `CFG.SRC_VERDICT_HOURS` later, asks two separate
questions. *Did the thing we fixed stop happening?* — each signature's hit count
in the window after the install. *Did we make it worse?* — code-kind error rate
vs the baseline rate. Only the second triggers `srcRollback_`, which restores the
Drive backup and blocks that sha from auto-reinstalling, so a bad package cannot
loop. A signature that is still firing means the fix was insufficient, not that
things got worse — that gets reported, not reverted.

Error rows are attributed per analyzer through `errSource` (a prefix match on
the report's source column). Without it, one analyzer's errors would be judged
against another's code.

**Three finding categories, not two.** `ROWNER_SRCCODE` = the analyzer's code is
at fault. `ROWNER_ENGINE` = the engine's podcast work is at fault. The third,
`ROWNER_ENGSRC`, is the one that kept having no home: *the engine's machinery for
handling source code is at fault*. Every real instance so far needed an engine
version, not an analyzer one — the live-code fingerprint computed two different
ways (blocking every install), the verdict with no baseline, the analyzers having
no notification channel. `srcCycleHealth_` raises these automatically after N
consecutive bad nights (one bad night can be a network blip). Because
`ROWNER_ENGSRC` contains «کد», `reportRow_` routes it to `ROWNER_CODE` /
`NEEDS_CODE` — the queue a monitor session builds the next engine version from.
That is safe: a `NEEDS_CODE` row is a marker, never a payload; installs always
come from GitHub's `manifest.json` + `engine.gs`.

**The boundary that must never move.** Findings carry `ROWNER_SRCCODE`,
deliberately *without* the word «کد» in it: `reportRow_` turns any owner
containing «کد» into `ROWNER_CODE` with status `NEEDS_CODE`, which feeds the
engine's own installer — and that installer replaces `engine.gs`. An analyzer's
source reaching that path would overwrite the engine.
`tests/run_srcscripts_test.js` asserts this through `reportRow_` itself, not a
restatement of the rule.

Rollback restores *code*, never sheet data. An analyzer that corrupts rows is
not undone by reverting it — which is why the shipped `cleanErrorRows` deletes
only rows whose status is `ERROR` **and** whose every analysis column is empty.

Sections must not depend forwards (21 → 22). Hoisting hides it in the assembled
file, but every partial loader in `tests/` breaks with a ReferenceError. The two
calls 21 makes into 22 (`auditSourceScripts`, `srcNightly_`) sit inside
try/catch for exactly that reason.

## Reports / errors → fixes
The engine logs issues to the «گزارش‌های نظارت» tab and `_STATUS.json` in OUTPUT.
A monitor session reads these, fixes in `src/`, tests, and ships via the handshake
above; note answered rows in `manifest.json`'s `sourceReportIds`.

## Emergency revert
Set `CODE_SOURCE: 'drive'` in `src/00_Config.gs` to fall back to the old
Drive-based update path. The Apps Script menu also has «بازگشت به نسخهٔ پشتیبانِ کد».

## تمیزیِ ریپو (Repo hygiene)
منبعِ حقیقت این‌هاست: `src/` + `engine.gs` + `manifest.json` + `tests/` + `tools/` +
`CLAUDE.md` + `README.md`. **ریشه فقط چهار فایل + پوشه‌ها را نگه می‌دارد** — چیزِ
تازه‌ای در ریشه نریز؛ جایش `tools/` یا `tests/` یا `docs/` است.

اگر فایلِ کهنه/تکراری ظاهر شد (نسخه‌های قدیمیِ `_CODE-v*.gs`، خروجی‌های ادیتور)،
آن را به `archive/` ببر، نه اینکه پاک کنی و نه اینکه منبع حسابش کنی.

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

   این تسک **روی همین ریپو کار می‌کند** و خودش با دستِ کاملِ handshake نسخه می‌دهد:
   `src/` را ویرایش می‌کند، build و تست می‌گیرد، Changelog و `manifest.json` را بالا
   می‌برد و مستقیم push می‌کند. ۵٫۲۴ و ۵٫۲۵ ساختهٔ همین تسک‌اند.

   ⚠️ **یعنی دو نفر همزمان روی این ریپو می‌نویسند.** پیش از هر تغییری
   `git fetch origin main` بزن و شمارهٔ نسخه را از `max(running, origin/main)` بردار،
   نه از حافظه. یک بار همین برخورد پیش آمد (ناظر ۵٫۱۸ را push کرد وسطِ کارِ من) و
   با rebase و شماره‌گذاریِ دوباره حل شد.

   `docs/monitor_prompt_current.txt` نسخهٔ بایگانی‌شدهٔ پرامپت است و ممکن است از
   پرامپتِ واقعیِ تسک عقب باشد — مرجع نیست.
