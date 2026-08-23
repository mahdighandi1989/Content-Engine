# Content-Engine — agent brief (CLAUDE.md)

> این فایل، بریفِ عاملِ کلاد برای این ریپوست. هر سشن اولْ این را بخواند.
> Read this first. It encodes the rules that keep the auto-update cycle intact.

## What this is
A single-file Google Apps Script engine ("موتور محتوا") that produces two daily
Persian podcasts — «از همه جا از همه رنگ» (variety, published 07:00 Dubai) and
«درس‌نامه» (specialist, 08:00) — by reading five **read-only** Google Sheets and
writing audio/text/status to a Drive OUTPUT folder.

The deployed engine is ONE file, `engine.gs` **at the repo root**, assembled from
the 26 section files in `src/` by `tools/build.js`. `CODE_VERSION` lives near the
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
src/                 26 numbered sections — the source of truth for the code
tools/               build.js + build_header.txt
tests/               the 34 run_*.js suites
tests/lib/           root.js (path anchor) · mock.js (GAS mock) · probe_r4_lib.js
tests/fixtures/      newsheets.json · videos.jsonl · photos.jsonl
docs/                drive_layout.md · prompts/ (بدنه‌ها + bootstrap)
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
7b. **If the change touches anything the Cowork prompts rely on** — a function
   name, a menu item, a `_STATUS.json` key, a schedule hour, the OUTPUT layout —
   do BOTH in the same session: write `promptImpact` in `manifest.json` **and
   create `_PROMPT-<kind>-v<N+1>.md`** in Drive's OUTPUT root, whose header says
   `> برای نسخهٔ موتور: <this version>`. Mirror it into `docs/prompts/`.
   From 5.48 the engine enforces this: on install it records the version as a
   debt (`PK.PROMPT_DUE`), and `promptFreshNag_` compares that debt against each
   prompt's declared version **every night** until a new file clears it.
   From 5.52 the debt is narrower in two ways, so the nag stays credible: a
   version with an empty `promptImpact` records no debt at all (before that,
   5.49–5.51 all demanded new prompt files while touching nothing prompts rely
   on), and `promptImpactKinds` (e.g. `["monitor"]`) names which families the
   debt applies to — omit it and it means all of them. A warning that fires for
   nothing is the warning people learn to ignore.
   The pre-5.48 reminder put the version in its own title, so
   `codeRowSatisfied_` closed it the night the code installed — it warned once
   and went quiet forever. That is exactly how 5.46 shipped with a stale prompt.
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

## Background music (section 23)
Tracks live in a Drive folder under OUTPUT («موسیقی و افکت») and are catalogued
in the «موسیقی» tab. `runMusicScan` reads each file's WAV header, records
duration and format, and never overwrites the columns a human fills in (mood,
slots, gain, notes) — a scan that erased the curator's taste would be worse
than no scan.

**WAV only.** Apps Script cannot decode MP3 and no library is reachable; a
non-WAV file is catalogued and marked «قالب ناسازگار» rather than silently
skipped. Anything else (rate, channels, depth) is converted at use time:
channels averaged, rate linearly resampled.

Music enters the episode as a chunk carrying `pcm` instead of `text`.
`synthesizeStep_` splices it straight into the buffer, so music costs no model
quota and offers no chance to be read aloud. `ttsCueWanted_` skips backwards
over music chunks — otherwise every sting would force an extra style cue.

**Auto mode** (`CFG.MUSIC_AUTO`, on by default) asks the model twice, in
different places. Nightly, `musicAutoTag_` fills mood/slots/gain for tracks the
curator left blank — it only has the filename and duration to go on, which is
enough because music filenames are almost always descriptive, and it stamps
«خودکار» so a guess is never mistaken for a decision. Per episode,
`musicPlanModel_` picks the tracks, the second to cut from, and the gain, given
the title, section headings and the **cast** — because what sets an episode's
mood is those, not the category label; two «علمی و آموزشی» episodes can want
opposite music. The model proposes and the code decides: an id that is not in
the bank is dropped and the rule-based `musicPick_` takes over, so a
hallucinated id can never leave an episode silent.

Every schema field is a string, gain and seconds included. This repo's model
rejects any schema carrying `integer`/`number`/`boolean`; `run_real_test.js`
enforces it across the whole codebase, and it caught this section.

When the bank has nothing for a slot, `musicWish_` appends to
`_MUSIC-WISH.json` in OUTPUT — the same request channel the enrichment task
already uses for text. Nothing breaks if no one picks it up; the episode is
simply built without music.

**What is not possible here.** A music bed *under* the narration for a whole
episode means sample-wise addition over ~14M samples; Google's six-minute limit
does not allow it. The feasible route is mixing into each speech chunk inside
the existing loop, which is a separate piece of work — not promised by this
section.

Bytes in Apps Script are signed. Every read of a 16-bit sample must mask the
high byte before shifting; without it, negative samples become nonsense that
raises no error and is only audible. `run_music_test.js` ۵.۱/۶.۲ hold that line.

## The OUTPUT folder has a layout (docs/drive_layout.md)

OUTPUT's **root** holds only what the engine looks up by name — `_STATUS.json`,
the hub, `_CODE-LATEST.json`, in-flight `_ENRICH-*`, not-yet-ingested `_REPORT-*`,
`_MUSIC-WISH.json`, the `_PROMPT-*.md` control files. `getFilesByName()` never
searches subfolders, so moving any of these makes the engine silently blind.
Everything else belongs in a subfolder.

Two prunes decide what may move, and both scan the root only:
`pruneEnrichFiles_` (10 days, called from `selfUpdateDaily`) and
`pendingReportFiles_`. That is why the
`_ENRICH-*` files must stay at root — subfoldered, they would never be cleaned.
Ingested reports are the opposite: `markReportDone_` moves each to
«بایگانی — گزارش‌های خوانده‌شده» and `pruneReportArchive_` trims it at 60 days.

`outLayoutCheck_` (section 8) compares the root against the known-name list and
reports anything unrecognised into `_STATUS.json` (`outLayout`) and the health
alerts. It only *reports* — the engine never deletes something it doesn't know.

**The map is `docs/drive_layout.md`, and it is the only copy.** `outReadmeSync_`
fetches it nightly and mirrors it into OUTPUT as
«README — نقشهٔ پوشهٔ OUTPUT.md» — so never hand-edit that file in Drive, it is
overwritten. Any layout change ships as: edit `docs/drive_layout.md` **in the
same commit** as the code, plus a row in its «تاریخچهٔ تغییرهای چیدمان» table.

Prompt texts live in Drive (`_PROMPT-*-v<N>.md`, append-only — a new version is a
new file, never an overwrite). A copy of each goes in `docs/prompts/` so git has
the history.

## Production calendar (section 25)
The owner's only way to stop a show used to be deleting its trigger — manual,
and easy to forget to undo. The «تقویمِ تولید» tab in the hub now holds one row
per show: «فعال» (بله/خیر), «روزهای هفته», «استثناها», and «آخرین تصمیم».

`calGate_(key, name)` runs at the top of `produceEpisode` and
`produceSpecialEpisode` and returns `{ok, why}`. Three things about it matter:

- **It writes its decision back into the row, every run.** That column is the
  only honest answer to "did my setting actually take effect?" — the engine
  shows rather than claims. A missing decision for today means the trigger
  never fired, which is a different (and worse) problem than a paused show.
- **It fails open.** If the tab can't be read the episode is still produced and
  the failure is logged. An unintended silent podcast is worse than an extra
  episode, and nobody notices silence for days.
- **There is no list of shows anywhere in section 25.** An unknown key creates
  its own row defaulting to «فعال / همه», so the next podcast appears in the
  calendar with no code change. `run_calendar_test.js` ۶ asserts this with a
  key that doesn't exist yet.

The menu item does the work, not just a readout: it seeds the tab and every
show's row on first open (5.53 — before that the row appeared only after the
first *automatic* run, so someone installing today and wanting tonight off had
nothing to edit), and it pauses/resumes by number («۱», «۱،۲», «همه») via
`calPickIdx_`. The example exception dates in that dialog are labelled as
examples — unlabelled, they read as the current setting, which is exactly how
they were read.

`knownShows_()` (section 19) is the engine's single list of shows, used for
display names and for seeding. The gate still needs no list at all.

Manual runs pass `{manual: true}` and skip the gate — the owner pressing the
button has already decided. `produceEpisodeContinue` deliberately skips it too:
an episode started yesterday must be allowed to finish today.

Exceptions accept Jalali (`۱۴۰۵/۰۶/۱۰ تا ۱۴۰۵/۰۶/۲۰ = تعطیل`) and Gregorian
dates, Persian or Latin digits. A `= فعال` line beats a `= تعطیل` one and even
overrides the weekday filter, so one day can be reopened inside a long break
without deleting the whole range.

Note `faNumber_` spells numbers as words («هزار و چهارصد و پنج») — the date
column uses `faDigitsOut_`.

## Two settings that must move together
`SPECIAL_ONE_FILE` is the case study. Turning it on changed `specialMaxChars_`
and nothing else — five other places still said `SPECIAL_TARGET_MINUTES` (15
min), including the prompt line two lines above the cap it contradicted, and a
review order that told the model «کوتاه ننویس». The engine spent every day
pulling toward 15 minutes while one line asked for 11. Every درس‌نامه episode
came out two files, and health didn't complain because it compared against 15
too. `specialTargetMin_()` is now the single source; adding a sixth caller of
the raw config value is the regression `run_oneshot_test.js` ۱.۳ blocks.

**A cap stated only in a prompt is not a cap.** The model ignored
«از N نویسه بیشتر نشود» daily. `specialCondense_` enforces it in code — and
refuses any condensed version that lost a section, because a dropped lesson
never comes back (the cursor moves past it) while two files are merely ugly.

## Anything rebuilt on resume must be deterministic
`renderAudioStep_` resumes across the 6-minute cap and re-runs `buildChunks_` /
`buildSpecialChunks_` each time — but `synthesizeStep_` continues from a saved
`chunkIdx` taken against the *previous* array. `musicWrap_` was asking the
model for a fresh plan on every resume, so one more or fewer bridge would shift
every index: chunks skipped or repeated, no error, audible only. It stayed
invisible because the bank is empty and that branch never ran. The plan is now
computed once per (show, episode) and cached in `PK.MUSIC_PLAN`.

The duplicate records in `_MUSIC-WISH.json` were this bug's only visible
symptom — seven wishes where three and four were byte-identical. When a data
file shows the same row N times, look for the loop that re-runs, not the writer.

## Dead code is the failure mode here
Three real bugs in this repo were all the same shape: a function written,
commented, and unit-tested — but never called. `sfxAllow_` guarded effects
that were never placed; `pruneEnrichFiles_` promised a 10-day prune that
never ran (and `docs/drive_layout.md` stated it as fact); `musicWish_` sat
behind an early return so an empty bank could never bootstrap itself. None
raised an error. `tests/run_wiring_test.js` now fails if any private
(`name_`) function has no caller, and asserts the specific call sites that
carry a promise to the user. Add to its LEGACY allowlist only with a reason.

A fourth shape joined them in 5.52: **a test loader that doesn't know about a
section.** Most suites list the section files by hand; 21 of them still ended
at `24_ContentAudit.gs`, so every call into section 25 raised a ReferenceError
that the surrounding try/catch swallowed. The suites stayed green while the
real path was never exercised once. `run_wiring_test.js` ۴.۱/۴.۲ now fail if
`tools/build.js` or any hand-listed loader is missing a file that exists in
`src/`.

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
