# Content-Engine — agent brief (CLAUDE.md)

> این فایل، بریفِ عاملِ کلاد برای این ریپوست. هر سشن اولْ این را بخواند.
> Read this first. It encodes the rules that keep the auto-update cycle intact.

## What this is
A single-file Google Apps Script engine ("موتور محتوا") that produces two daily
Persian podcasts — «از همه جا از همه رنگ» (variety, published 07:00 Dubai) and
«درس‌نامه» (specialist, 08:00) — by reading five **read-only** Google Sheets and
writing audio/text/status to a Drive OUTPUT folder.

The deployed engine is ONE file, `engine.gs` **at the repo root**, assembled from
the 32 section files in `src/` by `tools/build.js`. `CODE_VERSION` lives near the
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
src/                 32 numbered sections — the source of truth for the code
tools/               build.js + build_header.txt
tests/               the 50 run_*.js suites
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

7c-0. **From 5.85 you no longer upload prompts by hand.** `promptSyncFromRepo_`
   fetches `docs/prompts/_PROMPT-<kind>-v<N>.md` from GitHub raw nightly and
   creates any version the OUTPUT root is missing — the same path
   `outReadmeSync_` already used for the layout map. So writing the file under
   `docs/prompts/` and pushing it **is** shipping it. It only ever adds a
   higher version and never overwrites an existing one (prompts are
   append-only and a task may be reading one right now), and it calls
   `promptPrune_` immediately after adding so the old version leaves the root
   in the same run. Upload by hand only when it must land this hour rather
   than tonight.
   This was a manual step for eleven prompt versions, and the real cost was
   never the effort: it was **two copies of one text kept in sync by hand**,
   with nothing checking that git's copy and the task's copy still matched.

7c. **If you do place a prompt in Drive by hand, move `v<N>` out of the
   root in the same session** — into «بایگانی — پرامپت‌های پیشین»
   (`1bAj5nQA9Umr9mTW5pubeDNwpOPCV1moB`), with
   `mcp__Google_Drive__update_file` + `parentId`. Never delete it.
   `promptPrune_` does this nightly, but nightly is not soon enough: between
   your upload and 02:30 the root holds two versions of the same prompt, and the
   task or the routine can read the wrong one. On 23 August eight stale versions
   were sitting in the root and the owner had to point it out twice — the second
   time asking, correctly, why he has to keep reminding us.
   From 5.68 `outLayoutCheck_` reports them (`outLayout.oldPrompts`) so the
   engine complains rather than the owner, but the fix is not to leave them
   there in the first place.
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

**Two moments, and both must see the episode.** Choosing a track per episode
(`musicPlanModel_`) and filling the bank (`musicSeek_`) are separate, and until
5.58 only the first was even partly informed. The planner got the title and
section headings but not each section's **`tone`** — the vibe, which is exactly
what music has to match, and which had been sitting in `segs[i].tone` since the
start. And the seek was fully blind, so the bank filled with random tracks and
"pick the one that fits the vibe" ran over that randomness: theatre, not choice.
Boundaries now carry `tone` and `voice`; bridge boundaries show the vibe on
*both* sides (a bridge marks a change of mood — where the mood does not change,
none is needed); and `musicSeekTerms_` translates the moods actually recorded in
`_MUSIC-WISH.json` into English search terms. Speech words are stripped even
from the model's own suggestion.

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

**How the bank fills — and why it stayed empty for weeks.** When the bank has
nothing for a slot, `musicWish_` appends to `_MUSIC-WISH.json`. The design was
always that the enrichment task then fetches it from the web, and the task's
prompt said so. But the task reported it *cannot* download, convert and upload
audio in the cloud environment — and nobody connected that open report to the
next step. Seven wishes piled up, zero files arrived.

From 5.55 the work is split along what each side can actually do: **the task
writes a direct URL into `_MUSIC-FEED.json`; the engine downloads it** with
`UrlFetchApp` — the same tool that already fetches `engine.gs` nightly. From
5.56 the engine does not wait for the task either: `musicSeek_` queries
**archive.org** for whichever slot the bank still lacks. That source is chosen
for one reason — its `metadata` endpoint lists every file with format, size and
licence, so a candidate is rejected *before* being downloaded. Everywhere else
you must download to find out, and most free-music sites serve MP3 only, which
Apps Script cannot decode.

`musicFetch_` verifies the **RIFF/WAVE header of the bytes it received**, never
the extension or `Content-Type`; both lie. A broken file in the bank is worse
than an empty bank — it gets picked every night and plays silence. Rejections go
back into the same feed file with a reason, so nobody re-proposes the same MP3.
Three per night, and a URL fetched once is never fetched again, so a file the
user deletes stays deleted.

**Seeking never downloads.** It only appends candidates to the feed; every
download goes through `musicFetch_` with the same three gates and the same
recorded rejection. Two download paths would mean two places to fail and half a
history in each.

**Is it even music?** 5.56 fetched three files and two were speech — one a
129-second debate address at 16 kHz. Two mistakes: the search matched `intro`
in free text (which catches «Opening Remarks …»), and `mediatype:(audio)` on
archive.org means *any* sound — lectures, sermons, audiobooks. The search now
draws from music collections (`netlabels`, `audio_music`) instead.

The deeper miss: nothing asked whether the file was music. `musicProbe_` had
measured silence ratio and steadiness since 5.43, and its own comment said
«گفتار پر از مکث» — but no decision was ever built on it. That is the fourth
instance in this repo of analysis written and never turned into a gate.
`musicAccept_` now layers sample rate (< 22 kHz = a speech recording), speech
words in the name, and the waveform pattern — and gives the last word to
`musicListen_`, which sends the model a real eight-second excerpt as
`inlineData`. It is the only check that actually *hears*. **The default is
reject:** if the model is unavailable the measurements stand and doubt means
no. An absent model is not silent approval.

Rejects are moved to a subfolder, never deleted — if the check is wrong, the
file is still there.

**Nothing generates music.** No model composes anything — the model only chooses
which existing track plays where and where to cut it.

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

Two things it reports that are **not** unrecognised names, and are worse for
exactly that reason — a known name draws no attention: `dups` (the same known
name twice; `getFilesByName` returns one of them and does not promise which, and
`putOutJson_` trashes the rest on its next write) and `oldPrompts` (a prompt
version that is not the highest of its family). Both mean a reader can silently
get the wrong file.

**The nightly job runs in importance order, not in the order things were added**
(5.68). Verdict → **code install** → housekeeping → heavy work, and every heavy
block sits behind `nightHas_`. Before that, the install was the last line of
`selfUpdateDaily`, behind music seeking, a 150-second download budget, and a
scan that read every bank file's bytes; Apps Script kills a run at six minutes
without an error, so on a busy night nothing after the music ran — including the
install. Anything you add to the nightly goes **after** the housekeeping and
**behind a `nightHas_` guard**, or it will starve the things that matter.

**The map is `docs/drive_layout.md`, and it is the only copy.** `outReadmeSync_`
fetches it nightly and mirrors it into OUTPUT as
«README — نقشهٔ پوشهٔ OUTPUT.md» — so never hand-edit that file in Drive, it is
overwritten. Any layout change ships as: edit `docs/drive_layout.md` **in the
same commit** as the code, plus a row in its «تاریخچهٔ تغییرهای چیدمان» table.

Prompt texts live in Drive (`_PROMPT-*-v<N>.md`, append-only — a new version is a
new file, never an overwrite). A copy of each goes in `docs/prompts/` so git has
the history.

## The handout — one per series, not per episode (section 26)
The owner's ask: «نسبت به هر مجموعه‌ای که یاد می‌گیرم … یک جزوه باشد که هر سری با
تولید پادکست به‌روزرسانی بشه … و بشه با کلیک روی فهرست به مطلب هدایت شد.»

Each درس‌نامه series folder carries `_HANDOUT.json` (the structural book) and
«جزوه — <name>.html» (the rendered one). Two files, not one: keeping only the
HTML would mean the model must re-read and re-understand its own output every
night — a fresh chance to break what was already right.

**The model returns a patch, never a book.** `handoutApply_` only ever *adds*:
a new chapter, a section inside an existing chapter (`intoChapter`), or an
appended paragraph on an old section (`amend`, shown as «تکمیل از درسِ N»).
That last one is the whole point of the request — a later lesson often completes
an earlier one, and it must land *there*, not at the end. A hallucinated id is
never fatal: an unknown `chapterId` becomes its own chapter, an unknown
`sectionId` becomes a section. A lost lesson does not come back.

**Podcast prose is not book prose.** `hook`/`outro`/`recap` never reach the
handout writer at all — they are radio framing by definition. Inside the
narration, `handoutDePodcast_` drops radio sentences, and (as everywhere in this
repo) it can never empty a section: if every sentence looks like radio, the
detection was wrong and the original text stands.

**Facts from code, prose from the model.** The roadmap's per-stage state
(«انجام‌شده/در جریان/پیشِ رو») is computed from the registry's chunk cursor, not
asked. A roadmap that shows a finished stage as upcoming is worse than none.

**References are footnotes, numbered like a book** — per chapter, with a
back-link, plus a full کتاب‌نامه. A ref's number never changes once assigned;
old chapters' footnotes point at it. `_PROMPT-enrich-v11.md` §CITE makes the
enrichment task supply title/publisher/date/url and a verbatim quote, because
those fields are now printed, not just stored.

**It never delays an episode.** The end of a درس‌نامه run records a debt
(`PK.HANDOUT_DUE`) *first* and only then builds if time remains; the nightly is
the safety net. Reverse that order and a killed run silently drops a lesson.

**Past episodes matter too.** `handoutBackfill_` (5.86) queues every produced
lesson missing from its handout, with a cursor because 264 series do not fit in
one run. `handoutRunDue_` groups by series (one folder walk, not one per lesson)
and builds **in lesson order** — a book's chapter 5 cannot precede chapter 1, and
`amend` cannot reference a lesson not yet written.

**Which episodes exist is answered by the folder, never by the registry column.**
«قسمت‌های پادکست» carries a date glued to the numbers in real data
(`Fri Jan 02 2026 … 3 4 5`), so counting words gives 22 where 13 is right and
counting digits is no better (`02`, `2026`). That made an up-to-date handout
report "behind" every single day.

**The tab is «کاربردِ جزوه», one row per attempt — successes and failures both.**
`_STATUS.json` answers "how many chapters now"; the question you actually ask
when something breaks is "since when", and only history answers that. Persistent
lag (`HANDOUT_STUCK_DAYS`) raises a `ROWNER_CODE` finding into the `NEEDS_CODE`
queue — a sentence in the health mail is replaced tomorrow, a finding is not.
One bad night raises nothing: a warning that fires for a busy night is the
warning people learn to ignore.

**The control lives under the series it belongs to** (5.87) — a «جزوه» column in
«مجموعه‌های آموزشی و پیشرفت» with the link, counts, coverage and a per-series
rebuild button, plus a summary panel. Same boundary as the calendar board in
5.61: the board only *reads* (one read of the «کاربردِ جزوه» tab for all 264
series, never 264 Drive round-trips) and its buttons call functions that already
had tests. A broken window cannot break handout building.

**A lesson that cannot be written is abandoned, not retried forever** (5.88).
Attempts are counted in the book; after `HANDOUT_TRY_MAX` the lesson stops being
re-queued — otherwise the nightly backfill re-queued it every night, burning a
model call and a sheet row each time, and the coverage gap never closed so the
`handout-stuck` finding could never resolve. `abandoned` is counted **separately
from `behind`**: "behind" means something is still going to happen, and reporting
an unfixable item as behind forever is how a warning becomes noise. The per-series
button clears the attempt record — a gate that a human cannot open is not a gate.

**Cleaning the input does not fix what is already written** (5.95). 5.93 added
`handoutTitleClean_` so a new chapter never carries «فصل ۳:» in its own title —
but the chapters written before it kept theirs, and the contents page read
«فصل ۳: فصل ۳ — …» every night. `handoutRetitleBook_` is the retro-fix, and it has
three doors on purpose: every book that gets a new lesson is cleaned in
`handoutUpdate_`, the per-series button cleans regardless of any flag, and
`handoutRetitle_` sweeps the rest nightly with a cursor and switches itself off
when the round completes. It writes only when something actually changed — a
cosmetic migration must not restamp 264 files. A one-shot flag no human can reopen
is the failure shape this repo keeps hitting; the button is the door.

**The daily check rotates and never blinds permanently** (5.88). The scan cap used
to count from the top of the registry, so series past it were never checked on any
night. Now: every series ever seen with a problem stays on a permanent watch list
until it is fixed, plus a rotating window with a cursor over the rest.
`pending` means "not their turn tonight", not "unseen", and `cycleNights` says how
long a full round takes.

**The owner never opens a sheet — so nothing may live only in one** (5.90).
`handoutStatus_().line` is a ready Persian sentence that is present *every day,
including when everything is fine*, and rides into the health notes; the episode
email and Telegram carry a direct link to the handout itself. The monitor prompt
(v10) forbids writing "go look at tab X" — it looks, and brings the answer —
and mandates a fixed daily table so silence can never be mistaken for health.

The monitor checks it every day (`_PROMPT-monitor-v10.md` §۴٫۷) — including
opening an actual handout, because the code tests can see the file's shape but
not its quality.

## YouTube publishing (section 27)
The one fact everything else is shaped by: **YouTube takes video, not audio, and
Apps Script cannot make video** — no ffmpeg, no library, and the six-minute cap
rules out encoding fourteen minutes of frames. Write that down rather than hoping
a way turns up; there isn't one. So the work splits the same way music split in
5.55: the engine decides what to publish, writes title/description/tags, builds
the cover, orders the playlists and uploads; something else turns WAV + cover into
an MP4 and drops it in the episode folder. The request lives in `_YT-RENDER.json`,
and **a request left unanswered for `YT_STUCK_DAYS` is itself a reported problem** —
that is the music-bank lesson, applied from day one instead of after seven weeks.

**One video is one whole episode** (6.1). An episode too long for a single WAV
ships as «… یکجا ۱ از ۲» and «… یکجا ۲ از ۲»; neither carries the word «کامل».
The first picker fell back to *the largest WAV* when it found no «کامل» — so a
two-file lesson published its **second half** as the whole episode, with the
duration, chapters and description all computed from that half and no error
anywhere. `ytAudioParts_` returns the ordered list, reads the order from the name
rather than from size or Drive's iteration order, and **refuses to publish an
incomplete set**: a half episode that goes public is not recoverable the way a
delayed one is.

**Order is guaranteed twice, independently** (5.98). `getFolders()` promises no
order, so the queue is sorted by (show, series, episode) both when filled and when
consumed. But the real guarantee is elsewhere: a video's playlist position is
computed as *how many already-published episodes of this playlist have a lower
number* — never "append", and never "episode minus one" (one abandoned episode
would shift every later one). So even when uploads run out of order, the playlist
reads correctly, and a late-arriving old episode inserts itself above the newer
ones. Two independent guards for one promise, because the ordering the owner
actually sees is the playlist's.

**One series, one playlist.** The upload path once keyed playlists by series
*name* and the sync path by registry *key* — the same series could get two
playlists. `ytPlKey_` is now the single definition and the queue carries the
series identity with it. Registry key beats name deliberately: the name changes
(that is the point of the board), the playlist must not.

**Cover text is written for the cover, not borrowed from the title.** A YouTube
title has 100 characters and is read beside the video; a thumbnail is read at
postage-stamp size. One string for both makes both bad, so the model returns
`coverTitle` (≤42 chars) separately, with a good and a bad example in the prompt.

**`_yt.json` in each episode folder is the answer to "what if it got it wrong?"**
The publish plan is built once, reused across nights, and is a plain file a human
or the monitor can edit. `runYouTubeRedo` then pushes title, description, tags and
cover onto the already-published video through `videos.update` and
`thumbnails.set` — no re-upload, so view count and URL survive. The leak scan runs
again on that path too: a hand-edited description must pass the same gate, because
the gate belongs at the door, not on one of the roads to it.

**The privacy boundary is in code, not in the prompt.** The channel is public and
a Drive link that goes public cannot be "better tomorrow" the way an episode's
prose can. So `ytLeaks_` runs on the *final* text, the video uploads as `unlisted`,
and only a clean scan flips it to `public`; a leak logs a «جدی» finding owned by
code and the video stays unlisted. Web sources stay in the description and Drive
links never do — the owner asked for exactly that split.

**Playlists read the series registry, never YouTube's memory.** Renaming or
renumbering a series on the board changes the playlist's title and the order of
its items, because the desired order is computed from the registry and only the
differences are sent. The playlist URL lands in the «پلی‌لیست یوتیوب» column so it
is visible where the series is, the same rule the handout column follows.

**The channel's own identity has a boundary that must be stated, not discovered.**
`brandingSettings` (description, keywords), `channelBanners`, `watermarks`,
`unsubscribedTrailer` and `channelSections` are all writable, so the engine keeps
them. The profile picture, the channel links and the contact email are **not
reachable from the Data API at all**. Without that line written down, the monitor
reports them as unfinished work every single day — a warning for something that
cannot change is the warning people stop reading. They are logged as «کارِ شما»
and reminded weekly instead.

Two rules protect the owner's own channel, which carries 117 videos that are not
ours: home-tab sections are **only ever added**, never deleted or reordered, and
stay under YouTube's twelve; and the trailer is set only when it is empty. Filling
a blank is help, overwriting a person's choice is not.

The banner exposes a general trap: Google Slides' PNG export does not announce its
pixel size, and YouTube rejects a banner under 2048×1152. Guessing means a rejected
upload every night with an error that names nothing. `ytPngSize_` reads the IHDR
header — twelve bytes, an exact answer — and a too-small banner is never sent, with
the real numbers in the reason.

**Quota is taken before it is spent**, in two separate buckets (uploads, units) —
both close with a bare 403 that names neither. `search.list` costs 100 units and is
never used anywhere in the section: what we published is in the sheet, and the
sheet is one read.

Chapters are estimated from each section's character share, scaled to the measured
duration. That is deliberate: recording real offsets means touching the synthesis
loop, the one part of this repo that should never be disturbed without cause, and
a few seconds of drift in a chapter marker costs nothing next to having no chapters
at all. YouTube's own rules (start at 00:00, three minimum, none under ten seconds)
are enforced in code.

Covers are 1280×720 cards the engine composes in Slides and exports as PNG. Not
stock imagery: the channel is meant to earn, and every borrowed image is a licence
question. Custom thumbnails need a verified channel — if `thumbnails.set` fails the
row records why instead of failing silently.

## The spoken text: markup, and a mandatory second look (section 3, 6.20)

Every episode has two texts — the readable one (email, doc) and the **spoken**
one, which is the readable text with pronunciation markup. Marking up means
three tools, not one: **diacritics**, **ZWNJ**, and **phrasing punctuation**.

The owner heard «بایستیم» read as if it began with «با». It does not — it is
بـ + ایستادن, so the prefix takes a kasra and the alef starts its own syllable.
The fix that works is the **ZWNJ**: «بِ‌ایستیم» has no «با» left to read.
`SPEAK_TRAPS` is the ten-item catalogue of this class, in one copy, feeding both
the writer prompt and the reviewer prompt — two copies means one silently goes
stale.

**Every gate that existed was structural, never semantic.** `verifySpeak_` proves
the same words are present; `speakVowelledOk_` proves enough diacritic density.
Neither says the diacritics are *right*, so «بَایستیم» passed both. That is the
whole reason for the `speak2` phase: minutes after writing, the marked-up text is
put beside the original and reviewed. Writing and judging are deliberately two
separate calls — one call that both writes and judges confirms its own answer,
and that is exactly the shape that let three versions in a row declare the cue
bug fixed while it was not.

**`speakBone_` is the second comparison shell** and the reason markup is possible
at all. `speakCmp_` keeps punctuation, so until 6.20 every comma the model added
broke verification and that section was read **without diacritics** — the request
"read it better" produced "read it worse", silently. Bone ignores `،؛:—–…` but
keeps `.!؟`, letters and digits: sentence boundaries are never the model's to
move. And bone replaces marks with a **space**, not with nothing — `speakCmp_`
eats the spaces around punctuation, so deleting a comma would otherwise fuse two
words.

A word that stays wrong even with correct diacritics goes into the «تلفظ» tab and
stays fixed forever — append only, never overwriting a human row, and only when
the replacement's *letters* are identical. That tab is applied **after**
verification, so whatever gets in has no gate left behind it.

## Contemporizing درس‌نامه — "that other person" (section 29)

A second voice — never the lead — comes in a few times per lesson and says the
same thing colloquially, with one or two concrete present-day examples. Where it
comes in is **analysed per episode** (the owner asked for exactly that), which is
why it is its own call after enrichment rather than a field in the writer prompt:
the writer does not yet know which section came out heavy.

It sits **before `speak`**, so its text goes through diacritics and the 6.20
review like any other segment — no new code needed for that, because it is a
segment.

Before or after a section, never inside one: splitting a `narration` would break
`secIndex`, `sourceIds`, the handout and the content audit, all of which depend
on it being whole. With five or six sections, "after §2 and after §4" *is*
interleaving.

**"Someone other than that narrator" is a constraint, not a preference.** The
explain segment is excluded from the lead-share redistribution loop; had it been
inside, the loop that returns the longest sections to the lead would one day take
it back and the whole feature would vanish silently.

Its share is `EXPLAIN_PCT` (13, the owner's own number) of the lesson text, and
`specialWriteCap_` reserves it up front while `explainBudget_` is the second guard
on the one-file ceiling — 5.96 again, applied in advance this time.

## The big recap episode — once per series (section 30)

Its input is **the series' handout**, not seventeen episode folders:
`_HANDOUT.json` already is every concept of every past lesson, chapter-organised
and stripped of radio phrasing, and it is refreshed nightly.

It builds no new production path. It writes `ep`, makes the folder and the row,
and hands `PK.SP_PENDING` over at phase `speak`; from there the ordinary درس‌نامه
machine does diacritics, review, casting, music, merge, email, Telegram and the
YouTube debt. Its playlist position is right for free — section 27 computes
position from the episode number, and the recap takes the next one, so it lands
at the end, which is where a recap belongs. **No special-case positioning code,
because special-case code is what gets forgotten next.**

A recap adds no chapter to the handout, and that filter lives in
`handoutSeriesEpisodes_` — the single place the handout counts episodes — not at
each counter. Without it the recap would stay "not yet entered" forever, be
re-queued nightly, and after `HANDOUT_TRY_MAX` be logged as abandoned: a
permanent warning for work that was never meant to happen.

`recapCast_` had a bug worth remembering: it read `ep.__cast.mates`, a key that is
never stored — `ensureCast_` derives mates from `all.slice(1)` when it returns.
So it silently returned `false` and the whole recap would have been read in the
usual voice. **A test that only asserted "lead is defined" passed anyway.** The
suite now builds the exact stored shape, not a convenient one.

## A phase name the running code doesn't know goes forward, never in place (6.22)

The phase chain grows most versions (`speak2` in 6.20, `explain` in 6.21). If the
code goes **backwards** — automatic rollback and the rollback button are both
real — an episode saved mid-flight under a newer name matches no branch, the
function returns undefined, and `resumeStalled_` merely re-schedules it: an
endless, errorless loop whose only symptom is a podcast that never arrives.
`SPEAK_PHASES_` is the single list both shows read, and an unknown name is sent
straight to `audio`. `run_speak_test.js` ۱۲.۲ extracts every phase name from the
source and fails if one is missing from the list, so the next phase someone adds
is caught here.

## Cross-series references — the current series stays the backbone (section 31)

The owner's ask: «برای هر مجموعه انتخاب کنم که مجموعه‌های قبلی … از لیستی انتخاب
کنم … یه ارتباطِ معنایی بده با مجموعهٔ فعلی. مجموعهٔ فعلی باید ستون‌فقرات باقی
بمونه و اصلاً نباید متنش با اون متن‌ها قاطی بشه.»

A «مجموعه‌های مرجع» column (`SC.XREF`) holds the keys the owner ticked on the
board. At production time `bridgeFor_` reads each referenced series' **whole
handout** and asks the model, in a **separate call before writing**, what the
relationship is.

**The input is the whole book, never the matching lesson.** His words: «این نباشه
که برای درسِ یکِ مجموعهٔ انتخاب‌شده لزوماً به درسِ یکِ مجموعهٔ مرجع هدایت بشه.»
`_HANDOUT.json` already is every concept of every lesson, so "all the content" is
one file read — and lesson order plays no part in choosing where a reference lands.

**The relationship is usually not topical, and that is the whole point.** His own
example is quoted verbatim in the prompt: epistemology is placed before theology
on purpose; no heading is shared, yet theology's propositions need the tool
epistemology supplies to judge them true or false. Seven kinds are defined and
`هم‌موضوع` is deliberately **last** — if all the model finds is "both are about
God", that reference is not worth making.

**The backbone boundary is in code, not in a request.** `bridgeTrim_` drops a
hallucinated series id, an invented kind, a `ضعیف` link, an empty gesture, and a
second link to the same book; it enforces `BRIDGE_MAX_LINKS`. And the boundary is
stated **twice** — once to the model that proposes, once to the model that writes,
because the writer never saw the first prompt and is the one who could blend the
texts.

**No real relationship means no reference.** «بدونِ لوث شدن … جوری که حرفه‌ای بودن
رو زیرِ سؤال نبره.» An episode without references is healthy; one with a fabricated
reference is not.

Recorded in three places, and the handout and the recap both read from the same
log — «چون در واقع جزوِ خودِ محتوا شده». One source, never a second copy.

## Two settings that must move together — and one that moved (6.43)
`SPECIAL_ONE_FILE` is now **false**, by the owner's explicit decision: «سقفِ هر
صوتِ درس‌نامه را بگذار حداقل روی ۱۵ دقیقه و اگر در دو فایل شد مشکلی ندارد.» With
references, contemporizing and enrichment all landing after the writer, a 10.8-minute
ceiling made all four of them half-finished.

But «هدف» must mean the length of the **finished** episode. `specialReserve_` is the
single definition of what the later stages take, and it is applied in *both* modes —
before 6.43 it only applied when one-file was on, so a "fifteen-minute" target came
out at twenty-two. A number that is never the real length of anything is not a target.

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

**The control lives inside the series board, not in the menu** (5.61). A control
that sits somewhere other than the work it controls does not get found. The panel
at the top of «مجموعه‌های آموزشی و پیشرفت» carries one box per show: on/off, the
seven weekday ticks (all ticked by default), the exceptions box, and the engine's
own last decision. `calBoardData_` / `calBoardSave_` read and write the **same tab
and the same columns** `calGate_` reads — the data model was deliberately left
untouched, so the gate's suite still guards it and a broken dialog cannot break
production.

Seven ticks are stored as «همه», not a seven-item list — that is what
`calDayOk_` already understood. And «on, but no day ticked» is converted to off
with an explicit note: it used to fall through to "every day", the exact opposite
of what the user meant.

**A dialog button that silently does nothing is the worst failure shape here.**
`google.script.run.X()` against a missing `X` raises no error and breaks no test;
the button just does nothing. `run_wiring_test.js` ۵.۲ extracts every such call
from the rendered board and asserts the function exists — walking the chain by
paren depth, because `withSuccessHandler`'s argument is itself a function.

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

## One operational email a day (5.91)
The engine used to send six to eight a day: install succeeded, backup succeeded,
prompts are stale, a finding needs code, health. **When everything has its own
email, none of them get read** — and the real alert is lost among the routine.

`mailQueue_` collects routine news; `healthCheck` (10:00 Dubai) sends it as one
email. 10:00 is the only point where the night job (02:30), the backup (03:00)
and both episodes (07:00, 08:00) are done and the monitor (12:00) has not run yet.
It sends **even with zero problems** when there is news — silence cannot be told
apart from a dead system.

Immediate still means immediate for what cannot wait until 10:00: the one-time
install authorisation (it blocks the whole chain), a failed backup, and a code
rollback. Everything else queues.

`mailQueue_` returns `false` rather than throwing. Callers that treat a queued
notice as delivered **must check the return value** — otherwise a broken queue
counts as delivered and the alert is lost, which is exactly what the alert
exists to prevent (`run_v43_tests.js` ۱۹).

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

## A fix that only changes the input is not a fix
The narrator sometimes read the style cue aloud instead of the script. Reported
across several sessions, declared fixed each time, and back each time — because
every fix rewrote the *wording* of the cue (shorter, one line, ending in a colon)
while the cause was structural: `ttsPayloads_` joined cue and script into one
string, so the model had to **guess** which line was an instruction. No wording
makes a guess reliable; shortening only lowers the odds, and "lower odds" is not
enough for something that costs the show its credibility.

The cue now goes in `systemInstruction`, the script in `contents` — a boundary,
not a request. But the reason this bug could be declared fixed three times is
that **nobody ever listened to the output**; only the input changed.
`ttsCueLeaked_` sends the first six seconds of the actual audio back to the model
and asks what it hears. A marker present in the audio but absent from the script
means the cue leaked: that chunk is re-synthesized without a cue and a «جدی»
finding is logged. Failing to hear is not a leak (an unavailable model would
otherwise rebuild every episode), but it is logged.

Degradation always goes toward silence, never back to concatenation:
if the API rejects the new shape, the chunk is built **with no cue at all**.
`TTS_CUE_MODE:'off'` is the structurally safe setting — and it now actually
means never (any unknown value used to mean "always cue", the opposite of its
name).

## A guard that cannot see one door leaves that door open (6.20)

`run_wiring_test.js` ۴٫۲ exists for exactly one failure shape: a test loader that
doesn't know about a section, so every call into it raises a ReferenceError the
surrounding try/catch swallows while the suite stays green. It scanned
`tests/run_*.js` — and `tests/lib/probe_r4_lib.js`, which six suites take their
source from, stopped at section 22. Sections 23–28 had been invisible to those
six for months, in the one place the guard was built to look at. It now scans
`tests/lib/` too.

## A wrong reading is not always an invented one (6.21)

Rule ۸-چ bans unfounded interpretation — motives, feelings, causes not in the
source. It did not catch the real report: a scary story (an old woman asks a girl
for her taxi seat; the girl gives it up, takes another car, that car crashes and
everyone dies, and then it turns out there was no old woman) read aloud as "social
help" and closed with a few lines of advice. **Nothing was invented there. The
meaning was flattened.** Rule ۸-خ covers that: read the item to the end before
deciding what it is; a twist ending *is* the item; never staple a moral on.

The owner's own guess about the root cause got its own rule: the category is a
filing label, not a reading lens (۸-ذ), and the new `misfiled` field lets the
writer — the only party that reads every item in full — report the mismatch in the
call it is already making. It only ever **reports**: moving a row between tabs is
a delete and an insert, and the standing rule is that prior analyses are never
damaged. The finding is keyed on the *category*, not the episode, so a repeated
mistake shows as a repeat instead of a fresh row every night.

## داوری که فقط ۹۰۰ نویسه از درس را می‌دید (8.66)

ایرادِ مزمنِ سه‌روزه: «سنجهٔ محتوا در درس‌نامه قسمت ۶۱/۶۲ — فراتر از خام، پیوندِ ساختگی». علت از
`_AUDIT-special-062.json`ِ واقعی درآمد، نه از خواندنِ کد: عکسِ محتوا هر منبع را ۱۲۰۰ نویسه نگه می‌داشت
(`AUDIT_BODY_MAX`) و `auditSourceText_` آن را باز به ۹۰۰ می‌بُرید — و قطعهٔ درس تا ۱۴۰۰۰ نویسه است
(`SPECIAL_CHUNK_CHARS`). C2 در عکس دقیقاً با «درختان عظیم بلوط و لاله درختی را می‌بینم که تاب می‌خورند…»
تمام می‌شد، و داور نوشت: «مثال مفصل وزش باد و تماشای درختان بلوط در متنِ خامِ ارائه‌شده (C1 و C2) وجود
ندارد و از متن اصلی کتاب که در تکه‌ها غایب است آورده شده است». مثالِ خودِ آئودی بود. قسمتِ ۶۱ همین را
برای «پس‌زدنِ خودرو و دارکوب» گفت.

**و بدتر از هشدارِ دروغ:** همان یافته دستوری به قسمتِ بعد می‌داد — «فقط آنچه در خام هست را بگو؛ توصیف
کن، تفسیر نکن» — یعنی نویسنده‌ای که قطعهٔ کامل را دیده بود، باید مثال‌های کتاب را کنار می‌گذاشت. همان
شکلِ ۶٫۱۰ (معیاری که درس را بدتر می‌کرد)، این بار از درِ یک سقفِ اندازه که برای قلم‌های بانک درست بود و
برای متنِ درس نه.

- **متنِ درس کامل ذخیره می‌شود.** `fakeItems` قطعه‌ها را `whole: true` می‌دهد؛ `auditSnap_` برای آن‌ها
  `AUDIT_LESSON_BODY_MAX` (≥ سقفِ قطعه) و `len` (طولِ واقعی) می‌نویسد. قلم‌های دیگر (ارجاع، مکمل، بانک)
  همان ۱۲۰۰ — عکس بی‌حد بزرگ نمی‌شود.
- **یک بار در پرسش، نه شش بار.** `auditLessonText_` همهٔ قطعه‌ها را یک بار بالای پرسش می‌گذارد و هر
  بخش فقط شناسه را می‌بیند؛ سقفِ کل `AUDIT_LESSON_PROMPT_MAX` (≥ `SPECIAL_SOURCE_CHARS`).
- **آنچه کامل دیده نشد، با کد «نسنجیده» است، نه با خواهش.** قطعه‌ای که بریده نشان داده شد «[بریده]»
  می‌گیرد و `auditTally_` «فراتر»ِ بخشی را که چنین قطعه‌ای دارد در `unsure` می‌شمارد — نبودنِ مثال در
  بریده شاهدِ افزودن نیست. «پیوند» و «انتخاب» دست نمی‌خورند. عکس‌های پیش از ۸.۶۶ (بی `len`، با ۱۲۰۰
  نویسه) خودشان «بریده» شناخته می‌شوند — یعنی `_AUDIT-special-064.json` که امشب داوری می‌شود.
- **خرج ≤ نگهبان** (۷٫۳۱): پرسش بزرگ‌تر شد، پس `auditRun_` مهلت می‌گیرد (`AUDIT_RUN_MS` زیرِ ۴۵ ثانیهٔ
  `nightHas_`) و قسمتِ بعدی را فقط با وقت شروع می‌کند.

**«از همه جا» عمداً دست نخورد:** آن‌جا قلم‌ها خلاصه و پیامِ تحلیل‌گر دارند و داوری‌اش «خوب» است.

**سنجش:** پانزده شکستنِ عمدی با پشتیبانِ همان اجرا (`run_audit_test.js` §۱۱ با شکلِ واقعیِ قطعهٔ C2، و
`run_special_test.js` از درِ خودِ تولید). سیزده روی سنجهٔ خودشان؛ «همیشه نسنجیده» اول روی ۳.۱ و ۶.۲
نشست (همان ادعا از درِ قبلی) و با `ok`ِ نپرتابنده ۱۱.۵ و ۱۱.۱۰ هم سرخ‌اند؛ برداشتنِ «فقط درس‌نامه» سبز
ماند و درست هم بود — در «از همه جا» نه `whole` هست نه `C<n>`، میان‌بُر است و همین برچسب را گرفت (۷٫۷۱).

**قاعده:** سقفی که برای یک جنس داده درست است (قلمِ بانک)، روی جنسِ دیگر (متنِ درس) بی‌صدا معنای سنجه
را عوض می‌کند. وقتی داور می‌گوید «در خام نیست»، اول ببین **چه مقدار از خام** را دید.

## کلیپی که باز روی تاریخ افتاد، تیتری که نیمه‌کاره و چسبیده بود، و خطی که «نه روی تاریخ» می‌گفت (8.65)

ویدئوی درسِ ۴۱ (special:64، رندرِ ۷ اکتبر ۰۹:۴۵) قاب‌به‌قاب دیده و شنیده شد — قاب‌ها با ffmpeg از خودِ MP4،
و ثانیه‌های کلیپ با whisper. آنچه درست بود: کارتِ نقل (قاب، وزیرمتن، نوارِ تأکید، کنارِ کانونِ داور نه رویش، ~۶
ثانیه)، گذارِ صحنه‌ها (حل‌شدن در ۵۸٫۱)، حرکت (۳۰ از ۴۰). سه چیز نه:

- **کلیپ باز روی تاریخ.** ۸.۵۶ صحنه‌ای را کنار گذاشت که «فقط تاریخ» بود. این بار برش‌زن جملهٔ تاریخ را با پنجاه
  ثانیهٔ بعدش یکی کرد (صحنهٔ ۱: ۰ تا ۵۸٫۱، ۴۳۳ نویسه) — «فقط تاریخ» نبود، کلیپ گرفت، و کلیپ از **آغازِ** صحنه پخش
  می‌شود. whisper در ثانیه‌های ۰ تا ۸ شنید: «درس‌نامه، چهارشنبه، پانزدهم مهر…». همان چیزی که او ۶ اکتبر گفت نباید
  باشد، از درِ دیگر. پرسشِ درست «این صحنه دربارهٔ چیست» نبود؛ «**وقتی کلیپ پخش می‌شود چه گفته می‌شود**» بود.
  `lvClipSaid_` متن را به نسبتِ زمان (با ۲۵٪ حاشیه) می‌بُرد و `lvClipScene_` صحنه‌ای را که تاریخ در همان ثانیه‌هاست
  کنار می‌گذارد. با همان نقشه کلیپ روی صحنهٔ ۲ (۵۸٫۱) می‌نشیند.
- **خطی که «نه روی تاریخ» می‌گفت.** خطِ روزانهٔ همان روز: «✅ ساخته و داوری شد (روی صحنهٔ ۱، نه روی تاریخ)». جمله
  از **انتخاب** می‌خواند، نه از آنچه زیرِ کلیپ گفته شد — ادعای بی‌ورودی (۷.۷۹). حالا `clip.said` (`date`/`lesson`)
  از همان سنجه، هم در انتخاب و هم برای کلیپِ در راه، و خط فقط با `lesson` می‌گوید «نه روی تاریخ»؛ با `date` هشدار.
- **تیترِ نیمه‌کاره و چسبیده.** نخستین کارتِ ویدئو: «معماری شناخت و توجیه باورهاایدهاستوار و ساختار…». توضیحِ
  `lvSceneOvNorm_` از ۸.۴۵ می‌گفت «نه با نوشتهٔ نیمه‌کاره» و `cut` درست همان را با «…» می‌ساخت — توضیح و کد ضدِ هم.
  حالا بلندتر از سقف ⇒ رد. و واژهٔ چسبیده (`lvOvGlued_`): واژهٔ فارسیِ بی نیم‌فاصله با `LV_OV_GLUE_LEN` (۱۳) حرف
  یا بیشتر که در متنِ **همان صحنه** نیست. بلندترین واژهٔ همان درسِ بیست‌دقیقه‌ای ۱۱ حرف بود؛ بی متن داوری نمی‌شود.
  هر دو درِ کارت (پرسشِ صحنه‌ها و پرکردن) متنِ صحنه را می‌دهند، و ردشده‌ها شمرده می‌شوند (`ovBad`، `ovFill.rejected`).

- **ساخته‌شده و منتشرنشده ⇒ از نو، نه منتشر** (`lvScenePreFix_`). درسِ ۴۱ ساعت ۰۹:۴۵ رندر شد و چون سهمیهٔ آن روز
  تمام بود، منتظرِ آپلود ماند. جایگزینیِ ۸.۵۷ فقط **منتشرشده** را می‌گیرد («انتشارِ عادی همان ویدئوی تازه را
  می‌سازد») — ولی این‌جا انتشارِ عادی همان ویدئوی معیوب را می‌برد. حالا `ytUploadOne_` پیش از آپلود می‌پرسد: کلیپ روی
  تاریخ است یا کارتی بریده/چسبیده هست؟ ⇒ کلیپ از نو انتخاب، کارتِ معیوب کنار (و پرکردنِ کارت از نو)، ویدئوی قبلی به
  «پیشین» (نه سطل)، و ردیفِ رندر با برچسبِ `prefix-<نسخه>` از همان درِ جایگزینی (`ytRenderBuilt_` یک تعریف). اول
  نقشه، بعد ویدئو: نوشتن که نشد، بدترین حالت همان ویدئوی قبلی است. **یک بار** (`preFix`) — حتی اگر عیب بماند، چون
  «بساز، کنار بگذار، بساز» حلقهٔ بی‌پایان است.

**آنچه این نسخه نمی‌کند، صریح:** اگر درسِ ۴۱ پیش از نصبِ امشب آپلود شود — دفترِ سهمیهٔ موتور روزِ دبی را می‌شمارد و
نیمه‌شبِ دبی صفر می‌شود، در حالی که سهمیهٔ واقعیِ یوتیوب ساعتِ ۱۱ دبی — دیگر «منتشرنشده» نیست و فقط جایگزینی (تصمیمِ
او) درستش می‌کند. درسِ ۴۱ با ۸.۵۹ ساخته شد؛ یکنواختیِ کارت‌هایش (۷ از ۴۰، همه تیتر و نقل، بی سطر) همان است که ۸.۶۰
درمانش را دارد و امشب با ۸.۶۰ تا ۸.۶۵ نصب می‌شود.

**سنجش:** بیست‌وچهار شکستنِ عمدی با پشتیبانِ همان اجرا (`run_youtube_test.js` §۹۱، از درهای `lvClipStep_`،
`lvScenePlanAsk_`، `lvSceneOvFill_` و `ytUploadOne_`، با متن و زمانِ واقعیِ سه صحنهٔ نخستِ درسِ ۴۱). بیست‌وسه روی سنجهٔ
خودشان نشستند؛ «یک بار» اول سبز ماند، چون پس از نخستین ازنوسازی عیبی نمانده بود که دوباره دیده شود — سدِ دوم رویش
را پوشانده بود (۷.۴۱). ۹۱.۹-ب حالا عیب را پس از ازنوسازی عمداً برمی‌گرداند و نشست.

**قاعده:** وقتی کاری «روی صحنهٔ N» می‌نشیند، بپرس **در کدام ثانیه‌های** آن صحنه، و آن‌جا چه گفته می‌شود. صحنه واحدِ
تصویر است، نه واحدِ معنا.

## «مرورِ درس‌های ۳۴ تا ۶۱» — همان شمارهٔ سراسری، از درِ مرور (8.64)

۸.۶۳ نوشت «شمارهٔ عنوان در کد». برای درس درست بود؛ برای مرور نه. `ytRecapRange_` دامنه را از `recapScope`
(«پس از درسِ ۳۳») و `recapUpto` (۶۱) می‌خواند — و هر دو `addedIn`ِ جزوه‌اند، یعنی شمارهٔ **سراسریِ** قسمت. پس
مرورِ بزرگِ آئودی امشب «مرورِ درس‌های ۳۴ تا ۶۱» می‌شد: دقیقاً همان چیزی که او گفته بود نباید در عنوان بیاید.
سنجهٔ ۹۰.۳ سبز بود چون `recapUpto: 40` را **دستی** می‌ساخت — عددی که تولید هرگز نمی‌نویسد (۷.۲۲). علت از
خواندنِ `_special.json`ِ واقعیِ همان مرور درآمد، پیش از نصب.

- **«درسِ چندم» یک تعریف دارد:** `ytLessonOf_` = شمارِ قسمت‌های غیرِمرورِ پوشهٔ مجموعه تا آن شماره (همان
  `ytSeriesLessons_` که پیمایشِ عنوان می‌خوانَد). مرورِ ۶۳ ⇒ «درس‌های ۱۳ تا ۳۹»؛ مرورِ اول ⇒ «۱ تا ۱۲».
- **بی فهرست هیچ** — شمارهٔ سراسری هرگز «درس» خوانده نمی‌شود؛ عنوان آن‌وقت فقط «مرورِ بزرگ» می‌گیرد. هر دو
  ctx (آپلود و `ytRedoOne_`) از `ytRecapRangeOf_(meta, folder)` می‌خوانند؛ ۹۰.۱۳ از درِ خودِ `ytRedoOne_` می‌سنجد.
- **مرورِ تازه از سرچشمه درست است:** `runRecapEpisode` شمارهٔ درس را همان‌جا که دامنه ساخته می‌شود
  برمی‌گرداند — `recapLessonFrom/To` در پرونده، و برچسبِ «فقط درس‌های ۱۳ تا ۳۹» برای نویسنده، ایمیل و تخته.
  شمارهٔ سراسری فقط برای ماشین می‌مانَد (`recapUpto`، مقایسه با `addedIn`). «انتخابی» برچسب می‌گیرد و بازه
  نه، و مروری که اشتباهی برگزیده شده «درسِ پیش از خودش» خوانده نمی‌شود.

**آنچه این نسخه نمی‌کند، صریح:** صدای مرورِ ۶۳ همان است که ساخته شد و می‌گوید «درس‌های بعد از درسِ سی و
سه»؛ جایگزینیِ خودکار فقط تصویر را از نو می‌سازد، نه صدا را. مرورِ ۶۳ تا درسِ ۳۹ است، چون جزوه آن شب تا
قسمتِ ۶۱ را داشت — و عنوان همین را می‌گوید، نه «تا ۴۰».

**سنجش:** هفت شکستنِ عمدی با پشتیبانِ همان اجرا، هر هفت روی سنجهٔ خودشان؛ یکی («بی فهرست ⇒ هیچ» را
بردار) سبز ماند و درست هم بود: بی فهرست `to` صفر می‌شود و همان '' برمی‌گردد — میان‌بُر است و در کد همین
برچسب را گرفت (۷.۷۱).

**قاعده:** وقتی یک عدد را «درس» می‌نامی، بپرس از کجا آمده. در این مخزن دو شماره هست و هر دو «درس» صدا زده
می‌شوند؛ فقط یکی را بیننده می‌بیند.

## «درس ۶۳» بعد از «درس ۴۰»، و درسی که اصلاً نبود — از خودِ صفحهٔ پلی‌لیست (8.63)

او مرورِ بزرگِ آئودی را در پلی‌لیست دید: «… - درس ۶۳» بعد از «درس ۴۰»، بی نقاشی، با کاورِ اسلایدز. و پرسید درس‌های
قبل و بعد چیزی جا افتاده یا نه. جواب از **صفحهٔ عمومیِ همان پلی‌لیست** درآمد (`ytInitialData`ِ صفحهٔ تماشا، ۴۱ قلم)،
نه از دفترِ خودمان — و بیش از آنچه او دیده بود:
- درس‌های ۱ تا ۳: «درس‌نامه ۲۲»، «درس ۲۳»، «… آئودی ۲۴» (پیش از ۶.۵۵)؛ مرورِ اول (special:34): «درس ۳۴».
- **درسِ ۲۰ (special:42) هرگز منتشر نشد.** پوشه، صدا و پرونده‌اش هست؛ `_yt.json` و ویدئو نه. درس‌های ۱۳ تا ۱۶ِ
  مصباح (special:13–16) هم همین‌طور.

**سه علت، هر سه در کد:**
- **شمارهٔ عنوان فقط در پرامپت بود** (۶.۵۵)، و فقط وقتی شمارهٔ درس معلوم بود. مرور شمارهٔ درس ندارد، پس تنها عدد
  «۶۳» بود. `ytTitleNum_` حالا **در کد** می‌بُرد: شمارهٔ سراسریِ **همین** قسمت (با «درس»، «درس‌نامه»، «قسمت» یا عددِ
  تنهای آخر) ⇒ «درس L»؛ در مرور ⇒ «مرورِ درس‌های A تا B» (از `recapMode`/`recapScope`/`recapUpto`ِ پروندهٔ خودش).
  محافظه‌کار است: عددِ دیگر («۹۹ درصد») و «از همه جا» دست نمی‌خورند. هم در ساختِ تازه و هم در `_yt.json`ِ ذخیره‌شده
  (بازنوشته با `titleWas`) — چون آپلودِ جایگزین و `ytRedoOne_` نقشهٔ ذخیره‌شده را می‌خوانند.
- **منتشرشده‌ها** با `ytTitleSweep_` یک دور پیموده می‌شوند: شمارهٔ درس از **پوشهٔ مجموعه** (قسمت‌ها به ترتیب، مرورها
  بیرون)، و اگر پروندهٔ قسمت شمارهٔ دیگری بگوید **دست نمی‌خورد** و «نگه داشته شد» گفته می‌شود — عنوانِ غلطِ تازه بدتر
  از کهنه است. اصلاح از درِ همیشگیِ `ytRedoOne_` (videos.update؛ بازدید و نشانی می‌مانند)، `YT_TITLE_FIX_MAX` در هر
  اجرا، و پس از یک دور خاموش. خطِ «🔢» هر روز.
- **مکان‌نمای کاوشِ گذشته هر بار صفر می‌شد.** در `ytBackfill_` پس از نوشتنِ مکان‌نما، خطِ بعدی آن را `'0'` می‌کرد و
  `wrapped` را همیشه true. یعنی هر کاوش فقط ۱۲ پوشهٔ اولِ فهرستِ مرتب را دید؛ قسمتی که در لحظهٔ تولید به صف نرسید،
  هرگز نرسید — بی هیچ خطا. حالا مکان‌نما می‌مانَد، و یک مرز: هر مجموعه (و «از همه جا») فقط از **نخستین قسمتِ
  منتشرشده‌اش** به بعد پر می‌شود؛ وگرنه «از همه جا» ۱۹ قسمتِ پیش از یوتیوب را یک‌جا می‌فرستاد.

**و کارتِ ساده دیگر نخستین جوابِ «نشد» نیست.** تا ۸.۶۲ نخستین «نشد»ِ نقشهٔ صحنه همان دم `fallback` بود و همان ویدئو
عمومی می‌شد. حالا تا `LV_SCENE_FAIL_MAX` بار با فاصلهٔ `LV_SCENE_RETRY_MIN` دوباره پرسیده می‌شود و ویدئو «منتظر» است؛
علت‌هایی که با تکرار عوض نمی‌شوند (درسِ کوتاه، زمان‌بندیِ ناجور) همان دم کارت می‌شوند — صبر برایشان فقط تأخیر است.
و ویدئوی کارتیِ دورانِ صحنه (از `LV_SCENE_REPAIR_FROM`) **خودش** در فهرستِ جایگزینیِ ۸.۵۷ می‌نشیند (`ytSceneRepairList_`،
از نقشهٔ رندرِ `mode: cards`)، یک بار با `LV_SCENE_REPAIR_TAG`؛ نقشهٔ ناشدهٔ قبلی کنار می‌رود (`wasWhy`) تا «دو بار نشد»
دوباره همان کارت را نسازد؛ و اگر تختهٔ آن مجموعه صحنه نخواهد («خاموش»)، دست نمی‌خورد. مرورِ بزرگِ ۶۳ از همین راه
جایگزین می‌شود — بی نوشتنِ دستیِ کلید در `docs/yt-replace.json`: آن فایل را ۸.۵۹ِ در حالِ کار هم می‌خواند و با کدِ
قدیم همان کارت را دوباره می‌ساخت.

**قاعده:** وقتی او می‌پرسد «چیزی جا افتاده؟»، جواب را از **آنچه بیننده می‌بیند** بگیر، نه از دفترِ خودمان. دفتر
می‌گفت «۹۷ منتشرشده، رهاشده ۰»؛ صفحهٔ پلی‌لیست می‌گفت درسِ ۲۰ نیست.

**سنجش:** شانزده شکستنِ عمدی با پشتیبانِ همان اجرا، هر شانزده روی سنجهٔ خودشان (۷۱.۶، §۹۰). یکی اول سبز ماند: «علتِ قطعی
همان دم کارت» هیچ سنجه‌ای نداشت؛ ۷۱.۶-پ ساخته شد و نشست.

**آنچه این نسخه نمی‌کند، صریح:** جایگاهِ پلی‌لیست با شمارهٔ درس برابر نیست و نمی‌شود: مرورها هم در همان پلی‌لیست‌اند
(درسِ ۴۱ قلمِ ۴۲ است). پرکردنِ حفره‌ها (درسِ ۲۰، مصباح ۱۳ تا ۱۶) با سقفِ آپلودِ روزانه چند روز طول می‌کشد و قدیمی‌ترها
اول می‌روند؛ ترتیبِ پلی‌لیست از شمارهٔ قسمت حساب می‌شود، پس سرِ جایشان می‌نشینند.

## وارسیِ ۸.۵۴/۸.۵۵ پس از نصب: کاوری که درست بود و باز ۵۰۰ گرفت، و بازشنوی‌ای که بی‌ردپا مُرد (8.62)

روتینِ «Verify 8.54 + 8.55 after install» نُه پرسش داشت؛ هفت تا از دادهٔ زنده جوابِ «بله» گرفتند (کاورِ نقاشیِ ویدئوها
سنجیده و سرِ جایش، نگهبانِ قسمت بی کشته، کارِ شبانه تا «پایان»، `stuckWhy` خالی چون گیرکرده‌ای نیست، کارِ کدِ ناظر و
سطرِ «🔧» هست، فقط v98 در ریشه، و رندر با راه‌اندازیِ موتور ساعتی نه چندساعته). دو تا نه:

**کاورِ پلی‌لیست: درخواست درست بود و یوتیوب باز «500: Internal error encountered» داد.** رانر ۶ اکتبر ۲۲:۲۴ سه کاورِ
۱۴۰۰×۱۴۰۰ کشید (JPEG، ۴۸ تا ۱۲۱ کیلوبایت — دانلود و سنجیده شد)، و بدنه با سندِ discovery یکی است (`type: hero`، ابعاد،
`playlistId`). پس حدسِ ۸.۵۵ («اندازه») درست بود ولی کافی نبود. علتِ واقعی **ثابت نشده**؛ این نسخه دو کار می‌کند که هر
دو بی‌ضررند:
- **اول می‌پرسد، بعد می‌فرستد.** `playlistImages.list` (یک واحد، با `parent` — `playlistId` در فهرستِ پارامترهایش
  نیست) ⇒ تصویرِ «hero» هست ⇒ `update` (PUT با شناسهٔ همان تصویر)؛ نیست ⇒ `insert`. پرسشی که خودش نشد جلوی درج را
  نمی‌گیرد.
- **هر تلاش شاهد دارد** (`coverLast` در نقشه و در `youtube.playlistList`: زمان، درج/به‌روزرسانی، کد، کدِ پرسش، ابعاد،
  کیلوبایت، پیامِ یوتیوب). تا امروز «(500)» بی زمان بود و نمی‌شد گفت با کدام کاور آمد.
- و `YT_PL_COVER_MECH` سقفِ تلاشِ پرشده را برای کاورهای **ننشسته** صفر می‌کند، **جدا** از `YT_PL_COVER_VER` که در
  امضای رانر است و بالا بردنش هر سه کاور را از نو می‌کشاند.

**بازشنویِ جدا ۰۳:۲۴ کشته شد و هیچ ردی نماند.** همان شکلِ ۷٫۶۴: شاهد **پس از** کارِ اختیاری نوشته می‌شد، و دنباله سقف
نداشت — شنیدن ۲۱۰ ثانیه + یک شنیدنِ نیمه‌راه + شمارشِ بقیهٔ صف تا ۶۰ ثانیهٔ دیگر + پویشِ تب. حالا شنیدن ۱۵۰، شمارش تا
۲۰ ثانیهٔ دیگر، شاهد **پیش از** پویش، پویش فقط اگر تا `MUSIC_REHEAR_SCAN_BY_MS` از آغاز جا بود (وگرنه نخستین کارِ
اجرای بعد، با `PK.MUSIC_SCAN_DUE`)، و جای پا پیش از هر گام (`PK.MUSIC_REHEAR_STEP`). اجرایی که آغاز شد و «پایان» ننوشت،
در سطرِ روزانهٔ موسیقی با نامِ گامش می‌آید. **علتِ دقیقِ آن مرگ هنوز ثابت نیست**؛ از امشب خودش به نام می‌گوید.

**سنجش:** دوازده شکستنِ عمدی با پشتیبانِ همان اجرا، هر دوازده روی سنجهٔ خودشان: بی پرسش / همیشه POST / بی شناسه
روی ۸۲.۴-ب؛ پرسشِ ناموفق که درج را ببندد و شاهدِ گم‌شده روی ۸۲.۴-پ؛ بی صفرکردنِ سازوکار روی ۸۲.۷-ب؛ شاهد پس از پویش،
پویشِ بی‌درنگ و بی‌اعتنایی به `noScan` و جای پای گم‌شده روی ۲۳.۱۳ و ۲۳.۱۴؛ و «کشته» که هرگز گفته نشود روی ۲۳.۱۵.

## علتِ افتادنِ مرورِ بزرگ به کارتِ ساده: یک پرسشِ ۴۲‌صحنه‌ای، دو بار بریده (8.61)

۸.۶۰ افتادن را **دیدنی** کرد و نوشت «علتِ خودِ special:63 ثابت نشده». فردا صبح، در وارسیِ دوره‌ای،
علت در خودِ پوشهٔ همان قسمت بود: `_scenes.json` ⇒ `{"failed": 2, "why": "مدل برای 2 صحنه از 42 توصیف داد"}`.
یعنی نقشه سرِ **توصیفِ صحنه‌ها** مُرد، نه سرِ تصویر یا رندر.

**سه لایه، هر سه یک شکل: «بزرگ‌تر از آنچه یک پاسخ جا می‌دهد».**
- **دسته‌ای که دسته نبود.** `LV_SCENE_ASK_BATCH` پنجاه بود؛ مرور ۴۲ صحنه داشت، پس همه در **یک** پرسش رفتند،
  پاسخ بریده شد و «ترمیمِ» JSON فقط دو صحنهٔ اول را نگه داشت. حالا ۱۲.
- **دورِ دومی که همان اشتباه را تکرار می‌کرد.** همهٔ ۴۰ جاافتاده باز **یک‌جا** پرسیده شدند و به همان دلیل بریده
  شدند — یعنی دورِ دوم دقیقاً وقتی لازم بود کار نمی‌کرد. حالا دسته‌دسته (نصفِ دسته)، هر صحنه یک بار
  (`retryAsked`، در ازسرگیری هم)، و پرسشی که هیچ نیاورد بقیه را نمی‌پرسد.
- **سقفی که «دقیق» نبود.** `lvSceneAsk_` همان دامِ ۸.۳۴ را داشت: کفِ به‌خاطرسپردهٔ مدل سقف را تا ده‌ها هزار
  توکن بالا می‌برد، و جوابِ افسارگسیخته دقیقه‌ها می‌خورد. حدسِ معقول — **ثابت‌نشده** — این است که
  `ytPublishTick`ِ ۰۸:۵۷ِ امروز سرِ همین پرسش برای درسِ ۴۱ (special:64، ۴۰ صحنه) کشته شد: `_scenes.json`ش از
  ۰۹:۰۲ با `askAt: 0` مانده بود. حالا `{ exact: true }`.

**و پاسخِ بریده خودش گفته می‌شود** (`askWhy`: «پاسخ فقط N از M صحنهٔ خواسته را داشت (بریده یا ناقص)»)، تا علت از
ردیفِ عمومی خوانده شود، نه از درایو.

**مرزی که آزمون نگه داشت:** نقشه‌ای که **هیچ** صحنه‌اش توصیف نشد دورِ دوم نمی‌گیرد — مدلی که جواب نمی‌دهد با
پاسخی که بریده شد یکی نیست. نگارشِ اول این مرز را برداشته بود و ۷۱.۶ همان لحظه سرخ شد (چهار پرسش به‌جای دو).

**آنچه این نسخه نمی‌کند، صریح:** ویدئوی منتشرشدهٔ مرورِ بزرگ عوض نمی‌شود (جایگزینی تصمیمِ اوست). درسِ ۴۱ تا نصبِ
امشب زیرِ ۸.۵۹ است و ممکن است همان راه را برود؛ اگر رفت، خطِ «🖼 ❌» و یافتهٔ `lv-scene-fallback` می‌گویند.

**سنجش:** شش شکستنِ عمدی با پشتیبانِ همان اجرا، هر شش روی سنجهٔ خودشان: دستهٔ ۵۰، دورِ دومِ یک‌جا و حذفِ علتِ «بریده» روی ۷۱.۲۸-پ؛ حذفِ `exact` روی ۷۱.۲۸-ت (سقف‌ها ۶۵۵۳۶ شدند)؛ حذفِ «بی‌حاصل ⇒ بس» روی ۷۱.۲۸-ث؛ حذفِ مرزِ «هیچ توصیف نشد» روی ۷۱.۶.

## «هشت کارتِ فقط‌نوشته منطقی است؟»، یک پلِ میانه، فیدی که زود تمام می‌شد، و افتادنی که فقط هاب می‌دانست (8.60)

او چهار چیز پرسید و هر چهار جوابِ «نه» یا «بخشی» داشت، از دادهٔ واقعی:

**کارت‌ها: «فقط همین درس» نبود، ولی درسِ بعد هم خودبه‌خود درست نمی‌شد.** درسِ ۴۰ (`docs/renders.json`:
`kinds: {headline: 6, quote: 2}`) نقشه‌اش از پیش از ۸.۵۶ مانده بود، و پرسشِ کارتِ پس از داوری روی همان درس
«۰» داد — و ردیفِ عمومی فقط «۰» داشت، نه چرا. سه لایه:
- **یکنواختی سنجه نداشت.** کف فقط *شمار* را می‌پرسید؛ هجده تیترِ تنها هم کف را پر می‌کرد. حالا در درس (نه
  داستان) تیتر و نقل روی هم حداکثر `LV_OV_WEAK_MAX` (یک‌سوم) — **در کد**: پرسشِ کارت وقتی یکنواخت است
  هم می‌پرسد، تیترِ اضافه را فقط با فهرست/گام/مقایسه *ارتقا* می‌دهد، کارتِ تازهٔ تیتر را وقتی سقف پر است رد
  می‌کند، و «هرگز تیترِ تنها» دیگر فقط جملهٔ پرامپت نیست. قصه بیرون است: روایت فهرست نمی‌گیرد (۸.۴۷).
- **یک پرسشِ بزرگ.** حالا دسته‌دسته (`LV_OV_FILL_BATCH`، سقفِ `LV_OV_FILL_CALLS`)، و هر دسته از **سراسرِ**
  درس — وگرنه اگر فقط یک دسته وقت شد، همهٔ کارت‌ها اولِ درس می‌نشستند. دسته‌ای که هیچ کارتِ پذیرفتنی
  نداد، بقیه را هم نمی‌پرسد («یک بار، نه تا کافی شود»).
- **«۰» بی علت.** `vis.ovFillWhy`، `ovUp`، `ovStruct`، `ovWeak` در ردیفِ عمومی؛ و آنچه **نشست** (`lvOvNote_`،
  از نقشهٔ رانر) «یکنواخت» را جدا می‌گوید — با ماهیت از `_scenes.json`ِ همان درس، چون یکنواختی برای قصه
  عیب نیست. دو درسِ پیاپیِ نحیف **یا** یکنواخت ⇒ همان یافتهٔ `lv-ov-thin`، حالا با سنجنده.

**ویدئوی «مرورِ بزرگ» (special:63) با کارتِ اسلایدز رفت، و علتش فقط در سیاههٔ درونِ هاب بود.** همان شکلِ
۸.۲۹: شاهدی که فقط جای خصوصی است، روزی که آن جا در دسترس نیست وجود ندارد — و این بار درایوِ این سشن هم
وصل نبود. `lvSceneFbNote_` هر افتادن را یک بار، با علت، در Properties می‌نشانَد؛ `vis.sceneWhy` در ردیفِ
عمومی؛ خطِ «🖼 ❌» در گزارشِ روزانه؛ یافتهٔ «جدی»ِ `lv-scene-fallback` با سنجنده؛ و درسِ صحنه‌ایِ بعدی از همان
درِ انتشار صفرش می‌کند. **علتِ خودِ special:63 ثابت نشده** — از درسِ بعد به نام گفته می‌شود.

**موسیقیِ میانه: بله، یکی بود — و طنین، نه آهنگ.** کفِ پل (`min(MUSIC_BRIDGE_MAX, ⌈مرزها/۲⌉)`) فقط وقتی پر
می‌شد که بانک آهنگِ شنیده‌شدهٔ **تازه** داشت؛ نداشت، پس یک «طنینِ کشیده»ِ پنج‌ثانیه‌ای ماند. `musicBridgeReuse_`
کف را از همان آهنگ‌های شنیده‌شده پر می‌کند، **از جای دیگرِ خودشان** (هیچ بازه‌ای دو بار، و نه بازهٔ آغاز)، و
هر بازهٔ تازه پیش از پخش **شنیده** می‌شود (`musicSegOk_`) — نشنیده یعنی نه (۷.۶۸). جای برش (`start`) در نقشه
و قفلِ دوم می‌نشیند تا ازسرگیری همان را بخوانَد و دوباره نشنود (`musicWrap_`). خطِ روزانه شمارِ پل‌ها و
آهنگین‌ها را با کف می‌گوید؛ دو قسمتِ پیاپی زیرِ کف ⇒ `music-bridge-thin`.

**فید: S تا نیمه بلندیِ کامل را نگه می‌دارد و بعد می‌افتد — همین «زود تموم شد» شنیده می‌شد.** پایانِ قسمت
حالا `MUSIC_OUTRO_FADE_SEC` (۱۰، و نه بیش از ۴۵٪ِ قطعه) با منحنیِ «دنباله» (u²) محو می‌شود: از همان اول
آرام کم می‌شود و نرم به سکوت می‌نشیند. طول‌ها و تلفیق‌ها بلندتر: آغاز ۱۸، پایان ۳۰، پل ۱۲ (از ۷ — پلِ قبلی
با دو تلفیقِ دوثانیه‌ای فقط سه ثانیه موسیقیِ تنها داشت)، تلفیقِ لبه ۵ و پل ۳٫۵، بسترِ زیرِ آخرین جمله‌ها ۸.

**آنچه این نسخه نمی‌کند، صریح:** ویدئوی منتشرشدهٔ درسِ ۴۰ و مرورِ بزرگ عوض نمی‌شوند (جایگزینی تصمیمِ
اوست). اینکه فیدِ تازه «حرفه‌ای» شنیده می‌شود را فقط گوش می‌گوید؛ سنجه‌ها فقط شکلِ منحنی و طول را
می‌سنجند. و بانکی که کمتر از دو آهنگِ شنیده‌شده داشته باشد، پلِ آهنگینِ کافی نمی‌سازد — آن‌وقت یافته
می‌گوید و کار با `musicSeek_` است.

**سنجش:** بیست‌وچهار شکستنِ عمدی با پشتیبانِ همان اجرا. بیست‌ویک روی سنجهٔ خودشان نشستند. سه تا اول جای دیگر:
«شنیدنِ بازهٔ تازه را بردار» روی ۲۲.۳-پ نشست (همان ادعا از درِ دیگر) و با `ok`ِ نپرتابنده ۲۶.۳ و ۲۶.۵ هم سرخ‌اند؛
«دسته‌ها پشتِ‌هم» روی ۸۹.۱ و بعد ۸۹.۴؛ و «همان درس دو بار» سبز ماند چون **دو قفل** دارد (بازگشتِ زودِ
`lvSceneFbNote_` و شمارِ «درسِ دیگر») — هر دو با هم ۷۱.۹-ب را سرخ می‌کنند، و در کد همین برچسب را گرفت (۷.۴۱).
مجموعه‌ها با نخستین سرخ می‌ایستند؛ پیش از قبولِ «جای دیگر نشست»، با `ok`ِ نپرتابنده همهٔ سرخ‌ها را ببین.

## دستوری که دری نداشت: صفحهٔ تنظیماتِ بسته (8.59)

۸.۵۸ نوشت «توکن را در Script Properties بگذارید: Project Settings ⇐ Add script property». او
رفت و دید نمی‌شود: گوگل وقتی پروژه بیش از ۵۰ ویژگی دارد، فهرست را **فقط‌خواندنی** نشان می‌دهد
و می‌گوید «از راهِ Properties service». این پروژه ده‌ها ویژگی دارد (هر حافظه و شاهدی که این پرونده
ساخته، یک ویژگی است). پس دستور درست بود و انجام‌شدنی نبود — همان شکلِ `LV_GEN_ENABLED` در ۸.۱۵:
دستوری بی در. و خواندنِ کد نشانش نمی‌داد؛ فقط دستِ او روی همان صفحه.

**درِ درست از روزِ اول در منو بود:** «۱) ثبت کلید Gemini» با `ui.prompt` همین کار را برای کلیدِ
جمینای می‌کند. «۳) توکنِ گیت‌هاب» همان است، و دو چیز بیشتر:
- **ذخیره بی آزمون ادعای بی‌ورودی است** (۷.۷۹). `ghTokenSet_` همان لحظه با `force` یک بار
  `render.yml` را راه می‌اندازد و جوابِ گیت‌هاب را نشان می‌دهد؛ «✅» فقط با ۲۰۴.
- **ردکردن پیش از ذخیره، نگه‌داشتن پس از رد.** متنی که شکلِ `github_pat_`/`ghp_` ندارد یا فاصله
  دارد ذخیره نمی‌شود (نامِ توکن را اشتباهی کپی‌کردن باید همان‌جا گفته شود، نه فردا با ۴۰۱). ولی
  توکنی که گیت‌هاب رد کرد **می‌مانَد**: ۴۰۳ با عوض‌کردنِ دسترسیِ همان توکن درست می‌شود، و خطِ
  روزانه کارِ بعدی را می‌گوید. انقضای توکنِ قبلی پاک می‌شود، چون توکنِ «بی انقضا» سرآیندی
  نمی‌فرستد و تاریخِ کهنه هشدارِ دروغ می‌داد.

توکن در پنجره، جواب، سیاهه و حافظه نمی‌آید — فقط اثرِ انگشتِ چهاربایتی (۸۸.۱۶ از خروجیِ واقعیِ
همهٔ آن‌ها). تابعِ منو در بخشِ ۲۱ است نه ۰۵: ۰۵ ⇒ ۲۱ وابستگیِ رو به جلو بود.

**سنجش:** هفت شکستنِ عمدی با پشتیبانِ همان اجرا. شش روی سنجهٔ خودشان نشستند؛ «پاک‌کردنِ توکنِ
ردشده» اول سبز ماند، چون ۸۸.۱۹ پرچمِ `saved` را از جواب می‌خواند که همیشه true بود، نه آنچه در
Properties نشسته بود. حالا خودِ ویژگی را می‌پرسد و می‌نشیند.

**قاعده:** دستوری که به آدم می‌دهیم («این‌جا بگذارید»، «آن را بزنید») هم یک مسیر است و باید پیموده
شود — دست‌کم یک بار از همان صفحه‌ای که او می‌بیند. اگر نمی‌شود، درش را خودمان بسازیم.

## وعده‌ای که از زمان‌بندِ کسِ دیگر می‌آمد — و موتوری که خودش راه می‌اندازد (8.58)

۸.۵۵ نوشت «رندر هر ده دقیقه» و کران را عوض کرد. وارسیِ دوره‌ایِ همان شب نشان داد از لحظهٔ
تغییر (۶ اکتبر ۱۳:۱۳ گرینویچ) تا ۱۸:۵۴ گیت‌هاب رندر را **یک بار** خودش راه انداخت — به‌جای ~۳۴ بار —
در حالی که گردش‌کارهای دیگرِ همین مخزن را می‌انداخت. (نگارشِ اولِ همین بند «حتی یک بار» می‌گفت؛ آن
یک اجرا چهارده دقیقه پس از نخستین وارسی آمد. جمله‌ای که از یک نگاه نوشته شود، با نگاهِ بعد باید
دوباره سنجیده شود.) زمان‌بندیِ گیت‌هاب «بهترین تلاش» است، نه وعده؛ پس جملهٔ
۸.۵۵ از **تنظیم** می‌خواند، نه از رویداد — همان قاعدهٔ ۸.۵۴. جایگزینیِ درسِ ۴۰ و ویدئوی درسِ ۴۱
به همین کران بسته بودند.

**موتور می‌داند کِی کاری برای رانر نوشته؛ پس خودش راه می‌اندازد.** `ytRenderAsk_` و
`ytPlSqWant_` پس از نوشتنِ موفق `ghRenderDue_` را صدا می‌زنند (`workflow_dispatch` روی `main`)،
و نشانهٔ «کارِ منتظر» (`PK.GH_RENDER_DUE`) تا برداشتِ آخرین ردیف (`ytRenderDone_`) یا
`GH_RENDER_DUE_H` می‌مانَد. دو درِ ساعتی — `vbrCollectHourly` پیش از سدِ پل و `ytPublishTick` پیش از
`ytOn_` — فقط Properties می‌خوانند (۷.۶۳/۷.۸۴) و وقتی آخرین راه‌اندازی کهنه است دوباره می‌زنند:
راه‌اندازیِ موفق هم ممکن است پشتِ اجرای دیگری صف بکشد.

**توکن مالِ صاحبِ برنامه است و فقط در Script Properties** (`GITHUB_DISPATCH_TOKEN`). ریپو عمومی
است؛ توکن در هیچ سیاهه، `_STATUS.json`، حافظه یا پیامی نمی‌آید، و ۸۸.۱۰ این را از **خروجیِ
واقعیِ** همهٔ آن‌ها می‌سنجد، نه از خواندنِ کد. **بی توکن یعنی رفتارِ دیروز و هیچ فراخوانی** — همهٔ
مجموعه‌های قدیمی بی توکن‌اند، و یک فراخوانِ تازه پاسخ‌های بدَل را جابه‌جا می‌کرد (۷.۶۶).

**شکست باید بگوید او چه کند، نه فقط «نشد».** ۴۰۱ (منقضی/ناقص)، ۴۰۳ (Actions روی Read and write
نیست) و ۴۰۴ (مخزن در Repository access نیست) سه کارِ متفاوت از او می‌خواهند و سه جملهٔ متفاوت
دارند. توکنِ ردشده تا عوض نشده هر ساعت دوباره امتحان نمی‌شود — اثرِ انگشتِ کوتاهش (چهار بایتِ
SHA-256، نه خودِ توکن) نگه داشته می‌شود و توکنِ تازه همان بارِ بعد امتحان می‌شود. خطای دسترسی همان
بارِ اول ایرادِ روز است؛ خطای شبکه فقط وقتی تکرار شد (یک قطعیِ گذرا ایمیل را قرمز نکند). و انقضا
از سرآیندِ خودِ گیت‌هاب (`github-authentication-token-expiration`) ۱۴ روز پیش گفته می‌شود: توکنی که
بی‌صدا منقضی شود، زنگی است که فقط در حالتِ سالم کار می‌کند.

**و یک ایرادِ همسایه که همین وارسی پیدا کرد، در گردش‌کار نه موتور:** اجرای صف‌کشیدهٔ `render`
commitِ راه‌انداز را می‌گرفت نه شاخه را؛ اجرای ۲۵۲ نقشهٔ کهنه را دید، درسِ ۴۰ را نوزده دقیقه دوباره
ساخت و سرِ ثبت سرخ شد. ۷.۲۲ این را برای `voice-bridge` و `voice-intake` نوشته بود و سنجه‌اش فقط
همان دو فایل را می‌پایید؛ `run_wiring_test.js` §۱۶ حالا **هر** کاری را که push می‌کند می‌سنجد. با
راه‌اندازیِ موتور، صف‌کشیدن عادی می‌شود، پس این دو باید با هم بیایند.

**سنجش:** هفده شکستنِ عمدی با پشتیبانِ همان اجرا، هر هفده روی سنجهٔ خودشان (§۸۸ِ
`run_youtube_test.js`). درها از مسیرِ تولید سنجیده می‌شوند — `vbrCollectHourly` و `ytPublishTick`
واقعی، `ytHealth_` واقعی — نه فقط خودِ تابع (۷.۶۲).

**آنچه این نسخه نمی‌کند، صریح:** توکن را خودش نمی‌سازد و نمی‌تواند؛ تا او نگذارد، همان زمان‌بندیِ
کندِ گیت‌هاب است و خطِ روز «⟨شما⟩» می‌گوید. و گردش‌کارهای صدا (`voice-intake`، `voice-bridge`) هنوز
فقط با کرانِ خودشان می‌دوند؛ همان توکن برایشان هم کار می‌کند، ولی سیمشان کارِ نسخهٔ بعد است اگر
کرانشان هم جا بیندازد.

## سنجه‌ای که شکلِ داده را دستی می‌ساخت؛ و جایگزین‌کردن بی پاک‌کردن (8.57)

او خواست درسِ ۴۰ با طراحیِ ۸.۵۶ از نو ساخته و جایگزین شود: «فقط مراقب باش بعد از درسِ بعدیش نیفته
تو لیست». پیش از نوشتنِ جایگزینی، جای ویدئو در پلی‌لیست خوانده شد — و جوابِ راست این بود که **از ۶
سپتامبر هیچ ویدئویی سرِ جایش ننشسته**: `ytWantPos_` کلیدِ `pub` را با نامِ نمایشی («درس‌نامه») می‌سنجید
و `ytPublished_` از همان روز کلید را با `ytShowKey_` («special») یک‌دست می‌کند. جواب همیشه ۰ بود و هر
ویدئوی تازه بالای پلی‌لیست نشست. سنجه‌های ۱۴.۳ تا ۱۴.۷ سبز بودند چون `pub` را **دستی** با کلیدِ نمایشی
می‌ساختند — شکلی که تولید از ۶ سپتامبر نمی‌سازد (۷.۲۲). §۸۶ آن را از درِ `ytLog_` ⇒ `ytPublished_` می‌سازد.

**درستیِ تابع کافی نیست؛ آنچه نشسته جابه‌جا نمی‌شود** (۵.۹۵). `ytPlOrderFix_` ترتیب را از **خودِ
پلی‌لیست** می‌سنجد: هر قلم با شناسهٔ ویدئو به شمارهٔ قسمت برمی‌گردد (تبِ انتشار، **همهٔ** ردیف‌ها، تا
ویدئوی جایگزین‌شده هم شماره داشته باشد)، و `ytPlOrderPlan_` (تابعِ خالص) بلندترین زیررشتهٔ ازپیش‌مرتب را
نگه می‌دارد و فقط بقیه را جابه‌جا می‌کند — هر جابه‌جایی ۵۰ واحد است. ویدئوی ناشناخته (افزودهٔ آدم) پایین
می‌مانَد و دست نمی‌خورد. سقفِ هر دور `YT_PL_ORDER_MOVES`، و سهمیهٔ یک آپلود همیشه کنار: ترتیب منتظر
می‌مانَد، انتشار نه. «نوبت» فقط از Properties خوانده می‌شود (`ytPlOrderDue_`): آپلود یا جایگزینی یا
«مانده» یا بیست ساعت. خطش هر روز در یادداشت‌هاست، چون «۹۷ منتشرشده» چیزی دربارهٔ اینکه ۴۰ پیش از ۴۱ است
نمی‌گوید.

**جایگزینی هیچ راهِ ساختِ تازه‌ای ندارد** — همان زنجیره (صحنه ⇒ رندر ⇒ برداشت ⇒ آپلود)، با سه دستکاری:
ویدئوی قبلیِ پوشه به زیرپوشهٔ «ویدئوی پیشین — جایگزین‌شده» (نه سطل؛ بی آن `ytVideoIn_` همان را دوباره
بالا می‌برد)، کلیپ و پرکردنِ کارت از نو (نقاشی و داوری همان؛ پولشان داده شده)، و یک `replace` روی ردیفِ
رندر و ردیفِ نقشهٔ رانر. بی `replace`، نقشهٔ رانر برای همان کلید نشانیِ ویدئوی **قبلی** را داشت و موتور
همان را برمی‌داشت. `ytRenderBuilt_` و `builtFor` (رانر) **یک تعریف**اند برای «ساخته شد»: دو تعریف یعنی
سقفِ صف یکی را بشمارد و برداشت دیگری را.

**ترتیبِ کنار رفتن تمامِ ارزشِ کار است.** قبلی فقط وقتی کنار می‌رود که **یوتیوب** می‌گوید تازه
`public` است (`Videos.list`، یک واحد) — نه دفترِ ما. و پاک نمی‌شود: از پلی‌لیست بیرون می‌آید و `private`
می‌شود. ویدئوی منتشرشده‌ای که پاک شود برنمی‌گردد؛ خصوصی برمی‌گردد. آپلودی که سه بار نشد «نشد» می‌شود و
مسئلهٔ روز است، نه چرخهٔ بی‌پایان.

**موسیقی: «آخرین قسمت» دروغ می‌گفت.** `musicRecordOnce_` با «هیچ انتخابی» همان‌جا برمی‌گشت، پس قسمتِ
بی‌موسیقی هیچ ردی نمی‌گذاشت و `music.last` روی قسمتِ قبل می‌ماند. «در از همه جا هیچ‌جا موسیقی نیست» را
فقط گوشِ او گفت. داده‌اش هم گفت: «از همه جا»ِ ۶ اکتبر دو تکهٔ موسیقیِ پنج‌ثانیه‌ای داشت و درسِ ۴۰ سه تا —
همه «طنینِ کشیده». ۸.۵۶ شنیدنِ همان لحظه را فقط برای آغاز و پایان ساخت؛ حالا پل هم (`musicBridgeDiscover_`)،
و آهنگِ شنیده‌شده بر هم‌خوانیِ تک‌واژه‌ای مقدم است (+۶ نه +۲؛ با +۲ طنینی که «آرام» داشت باز جلو می‌افتاد،
و «آرام» تقریباً در هر درس‌نامه‌ای هست — §۲۵.۵ همین را گرفت). قسمتِ بی آغاز/پایان یا فقط با طنین شمرده
می‌شود (`musicEdgeMissNote_`، از رویدادِ خودِ قسمت) و دو قسمتِ پیاپی یافتهٔ `music-edge-missing` با سنجنده.

**آنچه این نسخه نمی‌کند، صریح:**
- اگر بانک واقعاً آهنگ ندارد (همهٔ ۷۱ نشنیده «زمینه» باشند)، هیچ شنیدنی آهنگ نمی‌سازد؛ آن‌وقت یافته
  می‌گوید و کار با `musicSeek_` است. بازشنویِ جدای ۸.۵۴ (روزی تا ۴۸ قطعه) امشب با نصب راه می‌افتد.
- جایگزینی بازدید و کامنتِ ویدئوی قبلی را منتقل نمی‌کند؛ یوتیوب راهی ندارد.
- ترتیبِ پلی‌لیست‌ها چند دور طول می‌کشد (سقف، و سهمیهٔ سه انتشار که همیشه کنار می‌مانَد)، و خطِ
  روزانه می‌گوید چند مانده.

**سنجش:** سی‌ویک شکستنِ عمدی با پشتیبانِ همان اجرا. بیست‌وهشت روی سنجهٔ خودشان نشستند. «ردِ ثبتِ داوری
در تب» اول روی ۲۵.۱ نشست (پلِ تازه بی داوریِ ثبت‌شده جا نمی‌افتاد) و ۲۵.۲ همان را جدا می‌سنجد. «انجام‌شده
دوباره بررسی شود» سبز ماند و درست هم بود: حالتِ تمام‌شده به هیچ شاخه‌ای نمی‌رسد — میان‌بُر است و در کد همین
برچسب را گرفت (۷.۷۱). و «کشفِ پل بی کلیدِ شنیدنِ بازه» سبز ماند چون هیچ سنجه‌ای آن کلید را خاموش نمی‌کرد؛
۲۵.۵-ب ساخته شد و نشست.

## چهار چیزی که بیننده دید و هیچ عددی نمی‌دید (8.56)

او ویدئوی درسِ ۴۰ را دید: «موسیقی که نداشت · ترکیبِ متن و تصویر افتضاح بود و شاید در کلِ بیست
دقیقه سه چهار مورد … یکیش داغون و زشت … فقط یه جملهٔ ساده و درهم · اون چند ثانیه متحرک همون چند
ثانیه‌ای بود که داشت تاریخ و روزِ پادکست می‌گفت · جلوه‌ها صرفاً در حدِ زوم این و زوم اوت». هر
چهار از **خودِ خروجی** درآمد — قاب‌های MP4، `_times.json`، `_scenes.json`، بلندیِ صدا — نه از کد.

**موسیقی: کار به گوشی بسته بود که آن شب نیامد.** `music.last.missing: ["شروع","پایان"]`،
هفت قطعهٔ قابلِ پخش هیچ‌کدام برای لبه، و ۵۴ نامزدِ برچسب‌خورده که هیچ‌کس نشنیده بود. سدِ ۷.۶۸
(نشنیده پخش نمی‌شود) درست است و می‌مانَد؛ عیب این بود که شنیدن فقط از بازشنویِ شبانه می‌آمد.
`musicEdgeDiscover_` حالا در ساختِ تازهٔ نقشه (نه در ازسرگیری) تا `MUSIC_EDGE_DISCOVER_N` نامزدِ
نشنیده برای هر لبه را با همان `musicAccept_` و بعد **سرِ همان قطعه** (۸.۳۳) می‌شنود، و داوری را
در شناسنامه **و** تب می‌نشاند (`musicHeardRecord_`)، پس کارِ شنیدن برای قسمتِ بعد هم می‌مانَد.
سهمِ هر لبه جدا است: بی آن، آغاز همهٔ بودجه را می‌خورد و پایان هیچ نامزدی نمی‌شنید — شکستنِ عمدی
این را نشان داد، چون سقفِ کل همان شمار را می‌داد و سنجهٔ اول نمی‌دید. پل‌ها: سه «طنینِ کشیده»ِ
پنج‌ثانیه‌ای بلندیِ گفتار را داشتند (~۱۶− LUFS، سنجیده) و شنونده موسیقی نشنید؛ آهنگِ شنیده‌شده
حالا جلوتر است.

**کلیپ: همیشه `scenes[0]`، و صحنهٔ ۰ آن روز فقط تاریخ بود** — نقاشی‌اش را داور خودش ۴ داده بود
«ربطی به متنِ تقویمی ندارد». `lvClipScene_` نخستین صحنه‌ای را برمی‌دارد که فقط تاریخ نیست
(`lvSceneIsCalendar_`)، جای کلیپ و میان‌محو را دارد، و داور دست‌کم `LV_CLIP_MIN_SCORE` داده؛ یک
بار و پیش از خرج، در `clip.n`. `lvClipAttach_` تنها تعریفِ «کلیپ روی کدام ردیف». نقشهٔ پیش از
۸.۵۶ (`n` ندارد) صحنهٔ نخست می‌مانَد.

**کارت‌ها: سهم سقف بود و کف نداشت.** تختهٔ «خودکار» یعنی ۴۵٪ — ~۱۸ از ۴۰ — و «حدودِ N» فقط در
پرامپت بود. مدل هشت داد، همه تیتر یا نقل. `lvSceneOvFill_` پس از داوری، وقتی کارت‌ها زیرِ
`LV_OV_FILL_MIN`ِ سهم‌اند، **یک** پرسشِ جدا فقط برای کارت می‌کند، روی صحنه‌هایی که داور در آن‌ها
جای خالی دید، با جای همان داور. و رانر دیگر جمله‌ای معلق با سایه نمی‌کشد: **کارت** — قاب، نوارِ
تأکید، برچسبِ نوع، یک قلم (وزیرمتن). نستعلیقِ اردو خطِ کرسیِ فارسی را نمی‌شناخت و «مستقیم» را
بالاتر از جمله نشانْد؛ گیومه حالا کشیده می‌شود، نه نویسهٔ «❞». کارت می‌لغزد و می‌آید، نکته‌ها
**یکی‌یکی** (`stage`: هر مرحله PNGِ جدا با همان برش، و «نمایان» صریح — فرزندِ کارتِ پنهان پنهانی
را به ارث می‌برد و نگارشِ اول سطرها را نمی‌کشید؛ دیدنِ قاب نشانش داد)، و پس از `windowOf` می‌رود.
روی کانونِ داور (`fb`) و **تودهٔ کوچکِ رنگی** نمی‌نشیند: سهمِ توده «چقدر» را می‌گوید نه «کجا»، و
سرِ نارنجی با روشنیِ ۱۵۹ روی کاغذِ ۲۳۰ از سدِ روشنی رد می‌شد؛ فاصلهٔ رنگی آن را می‌بیند. سمتِ داور
که جا نداشت ⇒ جست‌وجوی آزاد، و برای تیتر و نقل نوارِ پایین. آنچه **نشست** از نقشهٔ رانر شمرده
می‌شود (`lvOvNote_`، همیشه حتی صفر)؛ دو درسِ پیاپی زیرِ کف ⇒ `lv-ov-thin`.

**حرکت: بی کانون فقط بزرگ‌نمایی و کوچک‌نمایی بود.** حالا شش حرکت (نزدیک، گذرِ راست‌به‌چپ، دور،
پایین‌آمدن، گذرِ چپ‌به‌راست، مورب)، `travel` به‌سوی کانون وقتی متن «از این به آن» می‌رود، و گذارِ
میانِ صحنه‌ها از معنا (`xfadeOf`: بخشِ تازه ⇒ سیاهیِ کوتاه، روایت ⇒ حل‌شدن، ایده ⇒ لغزش یا محو) —
مدتش همیشه `SK.xf`، چون حسابِ زمان‌بندی به آن بسته است.

**سنجش:** سی‌وسه شکستنِ عمدی با پشتیبانِ همان اجرا. پنج تا در دورِ اول سبز ماندند و هر پنج یک
سنجهٔ توخالی بودند: سقفِ هر لبه (سقفِ کل همان شمار را می‌داد)، ازسرگیری (همهٔ نامزدها پیش‌تر
شنیده شده بودند پس چیزی برای شنیدن نبود)، سدِ تاریخ (صحنهٔ تاریخ نمرهٔ پایین هم داشت و سدِ نمره
جلویش را می‌گرفت)، «یک بار» (پرسشِ دوم پیش از سد با «کافی بود» برمی‌گشت)، و پرهیز از کانون در
ساختِ ویدئو (کارتِ آزمون از اول سمتِ دیگر بود؛ §۱۷ حالا کانون را درست سرِ جای طبیعیِ کارت می‌گذارد).
و یک شکستن مجموعه را انداخت چون شاهدِ سنجه `.side` را بی‌حفاظ می‌خواند (۷.۸۹).

**آنچه این نسخه نمی‌کند، صریح:** ویدئوی منتشرشدهٔ درسِ ۴۰ عوض نمی‌شود (یوتیوب فایلِ ویدئو را
جایگزین نمی‌کند؛ جایگزینی یعنی پاک‌کردن و بارگذاریِ دوباره — تصمیمِ او)؛ موسیقیِ آن قسمت در خودِ
صوت پخته شده و در ویدئو هم اضافه نمی‌شود. زمانِ آمدنِ هر نکته تقسیمِ برابرِ پنجره است، نه زمانِ
گفتنِ همان جمله. و زیبایی را هیچ سنجه‌ای ثابت نمی‌کند — ناظر (v97) هر روز یک قابِ کارت را می‌بیند.

## «اگر نمی‌فرستادم، می‌فهمیدی؟» — دیدن بود، الزام نبود (8.55)

او پرسید «اگر آن گزارش‌ها را نمی‌فرستادم، اتوماسیون ایرادها را می‌فهمید و اصلاح می‌کرد؟ اگر نه
کِی به این مرحله می‌رسیم؟». جوابِ راست، از دادهٔ ۶ اکتبر: **بیشترش را می‌دید و تقریباً هیچ‌کدام را
درست نمی‌کرد.** ۳۰ ردیفِ «در انتظار»، ۱۴ ایرادِ مزمن، یافتهٔ کاورِ پلی‌لیست — و ناظر همان روز نوشت
«کدی ساخته نشد: یافتهٔ تازه‌ای که نسخه بخواهد نبود». کاورِ عوض‌شدهٔ درس‌های ۳۸/۳۹ را هیچ سنجه‌ای
نمی‌دید، چون هیچ سنجه‌ای **آنچه بیننده می‌بیند** را نگاه نمی‌کرد.

**الزام، نه انتخاب** (`codeTaskPick_` / `codeTaskTrack_`): موتور هر روز **یک** ردیفِ «نیازمند تعویض
کد» را خودش برمی‌گزیند — «جدی» پیش از «متوسط»، پرتکرار پیش از کم‌تکرار، کهنه پیش از تازه — و در
`codeQueue.task` و سرِ یادداشت‌ها می‌گذارد. ناظر انتخاب نمی‌کند؛ برمی‌دارد: یا نسخه با کلید در
`answers`، یا «رد» با علتِ مشخص در `_REPORT` (`codeTask`). همان کار که از `CODE_TASK_IGNORE_DAYS`
بگذرد، یافتهٔ «جدی» `code-task-ignored` می‌شود و از درِ `alertCodeRows_` همان دم به تلگرام می‌رود —
یک بار برای هر ردیف. صفی که ناظر خودش از میانش برگزیند، هر روز «هیچ‌کدام» را برمی‌گزیند.

**کاورِ پلی‌لیست: حدسی که سه هفته «کارِ شما» بود.** «کاور: نشد (500)» و «پادکست: نشد (400):
Precondition check failed» را ۶٫۵۴ «قابلیت‌های پیشرفتهٔ کانال» خواند و صاحبِ برنامه را به
youtube.com/features فرستاد. سرآیندِ فایلِ ذخیره‌شدهٔ «… — مربع.png» ۹۶۰×۵۴۰ بود: `presentations.create`
اندازه را دور می‌ریزد (۸.۱۲). مستندِ یوتیوب: `playlistImages` ۱:۱ می‌خواهد، و `podcastStatus` فقط روی
پلی‌لیستِ تصویردار. موتور پادکست را **پیش از** کاور می‌پرسید. دو سنجه (۴۲.۱/۴۲.۲) همان باور را قفل
کرده بودند — «مربع خواسته می‌شود» — یعنی **خواستن** را می‌سنجیدند نه **رسیدن** را (۷.۶۸).
حالا رانر کاورِ ۱۴۰۰×۱۴۰۰ می‌کشد (درخواست در `_YT-RENDER.json` → `plCovers`، نشانی در
`docs/renders.json` → `plCovers`، پس‌زمینه نقاشیِ نخستین درسِ صحنه‌ایِ مجموعه)، موتور اندازه را از
بایت‌ها می‌سنجد (`ytImgSize_`)، کاور پیش از پادکست، و تلاش‌های سازوکارِ خراب صفر (`YT_PL_COVER_VER`).
و دو باگِ همسایه: دورِ مجموعه‌ها با «چیدمان عوض نشده» هرگز به پلی‌لیستِ بی‌کاور نمی‌رسید، و کلیدِ
`series:` در خواندنِ سبک پیدا نمی‌شد (سنجه با کلیدِ بی‌پیشوند سبز بود — بدَلِ آسان‌تر از تولید، ۷.۲۴).

**رندر هر ده دقیقه.** کرانِ `40 * * * *` در عمل هر ۳ تا ۹ ساعت دوید و ویدئوی درسِ ۴۰ ساعت‌ها منتظر
ماند. کران حالا ده‌دقیقه‌ای است و اجرای بی‌کار فقط **پروب** (`node tools/render.js --probe`): یک
خواندنِ صف، بی ffmpeg و قلم. «کاری هست» یک تعریف دارد (`probeWork` ⇒ `itemsTodo` + `plCoversTodo`).

**آنچه بیننده می‌بیند** (`ytThumbAudit_`): کاورِ عمومیِ i.ytimg.com (بی سهمیه) کنارِ نقاشیِ رانر به داور
نشان داده می‌شود؛ «نه» ⇒ از دفترِ `YT_THUMB_PAINT` می‌افتد تا `ytThumbRestore_` همان دور برش گرداند؛
«ندیدم» ⇒ کاری نمی‌کند و می‌گوید (۷.۶۸). دفتر می‌گوید ما چه گذاشتیم؛ این می‌گوید چه آن‌جاست.
**قاعده:** هر خروجیِ عمومی یک سنجهٔ «از چشمِ بیننده» می‌خواهد، نه فقط «از دفترِ خودمان».

**درسِ ۶۰، دو علتِ مکانیکی:** (۱) نویسنده گفت «از یک منبعِ دیگرِ آرشیو **با شناسهٔ نوزده ال یو**
اضافه می‌کنم» — قاعدهٔ ۸ِ پرامپت از اول بود. حالا نویسنده شناسهٔ واقعی را نمی‌بیند (E1، E2…،
`specialEnrichIdsBack_`) و `epIdScrub_` در **هر دو** برنامه آن را از متن برمی‌دارد و یافته می‌سازد.
(۲) سنجهٔ محتوا دو روز «ایرادِ مزمن» بود: ارجاعِ میان‌مجموعه‌ای که سرتیترش نمی‌خواند به **همهٔ** بخش‌ها
اِسناد می‌شد («کم‌سنجیدن بی‌ضررتر از پرگیری»)، و داور به بخش‌های بی‌ارجاع گفته شد «از ارجاع به مصباح
ساخته شده» و «پیوندِ ساختگی» زد. `specialBridgeSecs_` حالا بخش‌هایی را برمی‌دارد که نامِ مجموعه را
واقعاً گفته‌اند؛ وگرنه سرتیتر؛ وگرنه هیچ‌کدام.

**آنچه این نسخه نمی‌کند، صریح:** ناظر هنوز یک اجرای روزانهٔ کوتاه است و موتور خودش کد نمی‌نویسد؛
«الزام» یعنی سکوتِ ناظر دیگر بی‌صدا نمی‌ماند، نه اینکه کد خودبه‌خود درست شود. و اینکه پیامِ یوتیوب
برای کاورِ مربعِ درست چیست را فقط نخستین اجرای پس از نصب می‌گوید.

## دوقلویی که یک بار درست شد، وعده‌ای که از تنظیم می‌آمد، و قسمتی که بی‌راننده ماند (8.54)

او پرسید «چرا کاورِ دو درسِ دیروز در استودیو این‌طوری است؟ دیروز درست بود»، «موسیقی به
کجا رسید؟ هنوز خیلی‌ها موسیقی ندارند»، «تنظیماتِ هر مجموعه قابلیتِ تغییر و ارتقا و کم کردن
دارد؟»، و «فرمتِ ایمیلِ ناظر چرا این‌قدر افتضاح شده». و اضافه کرد: «حتی ممکن است خودِ
گزارش اشتباه کرده باشد؛ ریشه‌اش را درست کن. اگر گزارش درست گفته و سیستم اصلاح نکرده، آن
ریشه را ببند». هر پنج جواب از دادهٔ واقعی درآمد، نه از خواندنِ کد.

**کاور: دوقلویی که یک بار درست شد.** ۸.۳۱ نوشت «کاورِ رانر (نقاشی) بر کارتِ اسلایدز مقدم
است» و همین را فقط در راهِ آپلود گذاشت. `ytRedoOne_` — همان که ویدئوی Unlisted را پس از
تأیید عمومی می‌کند — همیشه کارتِ اسلایدز را می‌نشاند. ۶ اکتبر ۰۲:۵۹ درس‌های ۳۸ و ۳۹ عمومی
شدند و کاورِ نقاشیِ هر دو با کارتِ سرمه‌ای عوض شد. `docs/renders.json` نشانیِ نقاشی را داشت
(`special-61-cover.jpg`، ۱۲۸۰×۷۲۰، دانلود و دیده شد). `ytThumbFor_` حالا **یک تعریف** برای
هر دو راه است و کارتِ اسلایدز را تنبل می‌سازد. دفترِ `YT_THUMB_PAINT` می‌گوید کدام ویدئو
واقعاً نقاشی گرفت، و `ytThumbRestore_` در دورِ یوتیوب آنچه گم شد را برمی‌گرداند — «پاک‌کردنِ
ورودی آنچه نوشته شده را درست نمی‌کند» (۵.۹۵).

**موسیقی: وعده‌ای که از تنظیم می‌آمد.** خطِ روزانه سه روزِ پیاپی می‌گفت «قابلِ پخش ۷ ·
شنیده‌نشده ۷۱ … موتور هر شب تا ۱۲ تا را خودش می‌شنود». عدد تکان نخورد، چون بازشنوی پشتِ نُه
بلوکِ `nightHas_` بود و کارِ شبانه از ۳ اکتبر هر شب زودتر مُرد. درسِ ۴۰ بی آغاز و پایان رفت
(`music.last.missing: ["شروع","پایان"]`). یافتهٔ `music-unheard` درست گفته بود «اول ببین کارِ
شبانه به آن بلوک می‌رسد یا نه» و کسی درمانش نکرد. سه چیز بسته شد:
- `musicRehearLater` اجرای جدای خودش است. زمان‌بندِ ساعتی فقط Properties می‌خوانَد
  (`MUSIC_UNHEARD_N` را خودِ `musicStatus_` می‌نویسد)، با سقفِ روزانه و فاصله.
- قفلی زیرِ آن، که همین کار نشانش داد: صف **پیش از** سدِ تلاش بریده می‌شد. اگر سرِ صف
  رهاشده‌ها بودند، هر اجرا همان‌ها را برمی‌داشت و هیچ قطعهٔ منتظری نوبت نمی‌گرفت. حالا سقف
  روی «سنجیده‌شده» است، نه روی صف. رهاشده‌ها جدا شمرده می‌شوند (۵.۸۸) و جلوی آوردنِ قطعهٔ
  تازه را هم نمی‌گیرند.
- خطِ روزانه از شاهد (`MUSIC_REHEAR_LAST`) می‌گوید: کِی، چند تأیید، چند رهاشده. سنجهٔ ۱۴.۲
  تا امروز همان وعدهٔ دروغ را **تضمین** می‌کرد (۷.۶۸)؛ حالا عکسش را.

**قسمت: نگهبانِ ۸.۵۳ برای ساختِ قسمت.** درسِ ۴۰ از ۰۸:۳۳ تا ۱۰:۰۷ در «تحویل» ماند. ادامه
را فقط خودِ اجراها می‌ساختند، و نگهبانِ «نوبت گذشته» فقط با همگام‌سازی (هر دو ساعت) و وارسیِ
۱۰ صبح صدا زده می‌شد. ادامه‌ها حتی شاهدِ اجرا نداشتند، پس مرگشان در `runs` هم دیده نمی‌شد.
حالا:
- `epGuardBegin_` در هر اجرای ادامه، پیش از کار، نگهبانی برای ۷ دقیقه بعد می‌گذارد. ادامهٔ
  عادی (`scheduleContinue_`) آن را برمی‌دارد.
- رسیدن با نگهبانِ مسلح یعنی اجرای پیشین کشته شد، و شمرده می‌شود. همان مرحله سه بار ⇒
  نگهبان دست می‌کشد، چون حلقهٔ هفت‌دقیقه‌ای پول و سهمیه می‌خورد. این را خطِ روزانه ایراد
  می‌گوید.
- درِ ساعتیِ `epStallKick_` قسمتِ بی‌راننده را بی هاب و بی سیاهه راه می‌اندازد (۷.۸۴).
- تلگرام با کمتر از `TG_MIN_MS` وقت، یک بار به اجرای بعد می‌رود. ثبت‌های تحویل
  (`recDone`) یک بار انجام می‌شوند، چون تحویل حالا ممکن است دو اجرا باشد.

**تخته: «سراسری» جوابِ «برای هر مجموعه» نیست.** کلیپِ آغاز و حرکتِ کانون‌دار فقط کلیدِ CFG
داشتند. ستونِ «جان‌بخشیِ تصویر» (`SC.LVMOTION`، در انتها؛ جعبه‌اش در همان خانهٔ سطح، نه ستونِ
تازه) کامل / بی‌کلیپ / آرام می‌دهد. `lvMotionAt_` یک تعریف است برای تولید و رسیدِ تخته.
کلیپی که تخته نخواسته `state: 'off'` با علتِ «تخته» می‌گیرد، نه `null`. درسِ «آرام» شمارِ
«بی‌حرکت» را بالا نمی‌برد، چون انتخاب شکست نیست.

**گزارشی که خودش اشتباه می‌کرد، سه جا:** وعدهٔ موسیقی (بالا). خطِ مدلِ تصویر حافظهٔ پیش از
سنجاق را عیناً نقل می‌کرد، پس یک ایمیل دو جوابِ یک پرسش داشت. و «نحیف ⇒ پیش از انتشار درست
می‌شود» دربارهٔ درس‌هایی که منتشر شده بودند. هر سه از همان شکلِ ۷.۷۹ بودند: جمله‌ای که از
ورودیِ خودش جدا شده بود. و سه ویدئوی گیرکرده هر روز «علتشان پس از بازسنجیِ شبانه می‌آید»
داشتند — وعده‌ای روی راهی که پیموده نمی‌شد (۷.۴۶). حالا روزی یک بار در دورِ یوتیوب هم سنجیده
می‌شوند.

**قالبِ ایمیلِ ناظر.** قالب درست بود، فقط **تهِ** یک دستورِ ۳۶۰ کیلوبایتی بود. اجرایی که
دستور را کامل نخواند، ایمیل را از حافظه نوشت: متنِ ساده، یک بند، با موضوعِ «کدی ساخته نشد».
v95 قالب را اولِ کار می‌گذارد (جدول اول با «—» ساخته می‌شود و پر می‌شود؛ ردیف هرگز حذف
نمی‌شود)، و می‌گوید جمله‌ای از گزارشِ موتور که وعده‌اش با عددش نمی‌خوانَد، خودش یافته است.

**قاعده:** وقتی یک جمله می‌گوید سیستم کاری را «می‌کند»، بپرس از کدام رویداد می‌خوانَد. اگر
از تنظیم می‌خوانَد، روزی که آن کار متوقف شود، جمله همان می‌ماند.

**آنچه این نسخه نمی‌کند، صریح:**
- علتِ دقیقِ کشته‌شدنِ تحویلِ درسِ ۴۰ ثابت نشده. ممکن است اجرا کشته شده باشد، ممکن است
  گوگل تریگرِ یک‌باره را نزده باشد. هر دو حالا درمان دارند، و از امشب `runs` و `epGuard`
  کدامش را به نام می‌گویند.
- اینکه مدل چند تا از ۷۱ قطعه را واقعاً «آهنگ» می‌شنود را فقط اجرا می‌گوید. آنچه درست شد
  این است که از امروز پرسیده می‌شود.

## شبی که کشته شد، خودش ادامه پیدا می‌کند (8.53)

نخستین وارسیِ آموزشِ دوبارهٔ گلدوز (۶ اکتبر، ۰۵:۴۰ دبی) نشان داد هیچ‌چیز شروع نشده:
`_VOICE-QUEUE.json` از ۵ اکتبر دست نخورده بود. ۸.۵۲ ساعتِ ۰۲:۳۳ نصب شد و پس از آن
سیاهه تا ۰۲:۵۸ ساکت بود؛ ضربانِ شب هنوز مالِ دیشب بود. یعنی اجرای اول در **بخشِ نخست**
(داوری، نصب، خانه‌داری) سرِ شش دقیقه کشته شد، پیش از نخستین بلوکِ `nightHas_`.

**ادامه فقط یک در داشت، و آن در با خودِ مرگ می‌مُرد.** `nightEnd_` تنها جایی بود که
ادامه را زمان‌بندی می‌کرد. ۷.۴۴ مرگ را **دیدنی** کرد (`nightAtSave_` پیش از هر بلوک)؛
هیچ‌چیز آن را **جبران** نمی‌کرد. پس شبی که کشته شد، همهٔ بلوک‌های بعدش را از دست می‌داد،
و شبِ نصب — که نصب و خانه‌داری‌اش سنگین‌تر است — دقیقاً همان شبی است که بیشتر کشته می‌شود.

**نگهبانِ ادامه، پیش از هر کار:** `nightGuardArm_` در آغازِ هر اجرا مکان‌نما را با
`guard` می‌نویسد و ادامه‌ای برای `NIGHT_GUARD_MS` (۷ دقیقه، بیش از سقفِ گوگل) می‌گذارد.
اجرای سالم در `nightEnd_` آن را برمی‌دارد یا با ادامهٔ عادی عوض می‌کند. پس رسیدن به
`nightBegin_` با مکان‌نمای `guard` یعنی اجرای پیشین کشته شد — و ضربانی که **پس از**
آن مکان‌نما نوشته شده می‌گوید کجا.

**بلوکِ کُشنده یک بار رد می‌شود، و این شمرده می‌شود.** ادامه‌ای که همان بلوک را دوباره
بدود، همان‌جا دوباره می‌میرد تا سقفِ اجراها. پس `_nightKiller` آن را رد می‌کند،
`nightStarve` با `killed` و `killDay` ثبتش می‌کند، و `nightEnd_`ِ سالم فقط کشته‌های
**امشب** را نگه می‌دارد — شب‌های پیاپی شمرده می‌شوند و همان آستانهٔ `NIGHT_STARVE_NIGHTS`
یافته می‌سازد. مرگ در بخشِ نخست به نامِ `NIGHT_FIRST_AT_` ثبت می‌شود و ادامه‌اش نصب را از
نو نمی‌دود (`first` حالا یعنی «امشب مکان‌نمایی نیست»، نه «مکان‌نما بلوکی را نام نمی‌برد»).

**و صفی که فقط از یک راه نوشته می‌شد.** آموزشِ هر گوینده — و آموزشِ دوباره — فقط از
`_VOICE-QUEUE.json` به گیت‌هاب می‌رسد، و آن را فقط `vintNightly_` می‌نوشت. ۷.۴۶ و ۷.۶۲ برای
صف‌های دیگر همین را نوشته بودند: درمانی روی راهی که آن شب پیموده نشد. حالا نوشتن شاهدِ
خودش را می‌زند (`PK.VINT_QWRITE` — شاهدی که نویسنده‌اش همان رویداد است، نه شمارنده‌ای که
کسِ دیگری صفرش کند، ۷.۲۲) و تریگرِ ساعتی فقط Script Properties را می‌خوانَد (۷.۶۳/۷.۸۴)؛
صفِ کهنه‌تر از `VINT_QUEUE_STALE_H` اجرای جدای `vintQueueLater` می‌گیرد، با سقفِ روزانه.

**آنچه این نسخه نمی‌کند، صریح:** نخستین اجرای شبی که خودش نصب می‌شود هنوز کدِ قبلی است و
نگهبان ندارد؛ اگر آن هم کشته شود، آن شب بلوک‌های سنگین را از دست می‌دهد — ولی صفِ
گویندگان از ساعتِ بعد با درِ دوم نوشته می‌شود، چون نبودنِ شاهد هم «کهنه» شمرده می‌شود.
و علتِ دقیقِ کشته‌شدن در خانه‌داری (کدام کار) بی لاگِ Executions ثابت نیست؛ از امشب ضربانِ
بخشِ نخست آن را به نام می‌گوید.

## زیرِ نظر، نه فقط یک خط (8.52)

او پرسید «خب همه چیز زیرِ نظرِ ناظر می‌ره و بررسی می‌کنه و اقدام و اصلاح می‌کنه و پیگیری
می‌کنه؟». برای سه قابلیتِ ۸.۵۱ (کلیپ، حرکتِ کانون‌دار، آزمونِ مدلِ تازه) جوابِ راست «فقط یک
خط» بود. هر سه جمله‌ای در گزارشِ روزانه داشتند، و جمله‌ای که هر روز همان «نشد» را بگوید
هیچ‌کس را به کاری ملزم نمی‌کند (۷.۱۸/۷.۱۹: دیدن با ملزم‌بودن یکی نیست؛ ۸.۳۲: تکرار شبیهِ
اطلاع است، نه هشدار).

**هر قابلیتِ تازه پنج سیم دارد، نه یکی:** وضعیت در `_STATUS.json`، ردیف در کارنامهٔ
قابلیت‌ها، مسئلهٔ روز وقتی تکرار شد، یافتهٔ کد با علتِ نام‌دار، و سنجنده در `selfVerifyMap_`
تا ردیفی که با ادعای نسخه بسته شد و وضعیتِ زنده هنوز بد است دوباره باز شود (۷.۵۷). ۸.۵۱ فقط
اولی را داشت. و پرامپتِ ناظر (v94) کلیدِ `checks`ِ خودش را می‌گیرد، چون آنچه را هیچ کدی
نمی‌بیند (کلیپ واقعاً جان گرفت؟ حرکت به همان چیز رفت؟) فقط دیدنِ قاب جواب می‌دهد.

**یک بار نشدن چیزی نمی‌سازد.** دو درسِ پیاپی می‌سازد. همان درس دو بار شمرده نمی‌شود،
«خاموش» از بی‌پولی شمار را دست نمی‌زند (بی‌پولی شکستِ سازوکار نیست؛ گفته می‌شود)، و
«ساخته شد» صفر می‌کند. حرکت فقط روی نقشه‌ای شمرده می‌شود که با ۸.۵۱ ساخته شده: نقشهٔ قدیمی
کانون نپرسیده و بی‌حرکتی‌اش عیب نیست. آزمونِ بی مدلِ تازه «کاری نرسیده» است (`due`)، نه
«بی‌اثر».

**علتِ شکست جدا از آخرین خط نگه داشته می‌شود — این را آزمون نشان داد، نه خواندن.** نگارشِ
اول علت را از آخرین یادداشت می‌خواند. درسِ «خاموش»ِ بعدی (سقف) آن یادداشت را عوض می‌کرد و
یافتهٔ «کلیپ پیاپی نشد» علتش را «سقف» می‌گفت: کد را سرِ راهِ غلط می‌فرستاد. حالا `fail`
علتِ آخرین «نشد» را تا «ساخته شد» بعدی نگه می‌دارد.

**و یک تلهٔ آزمونِ خودم:** شمارِ یافته‌ها را پس از فراخوانِ **بعدیِ** `lvHealth_` می‌خواندم،
که آرایهٔ یافته‌ها را از نو پر کرده بود؛ پس «یک نشد ⇒ یافته‌ای نیست» یافتهٔ «دو نشد» را
می‌دید. هر شاهد همان لحظه گرفته می‌شود که حالتش ساخته شد.

**آنچه این نسخه نمی‌کند، صریح:** ناظر خودش هنوز ثابت نشده است. ۴ و ۵ اکتبر `_REPORT`
ننوشت و درمانش (v93، و حالا v94) امشب به درایو می‌رسد. اگر ناظر بمیرد، موتور به صاحبِ
برنامه خبر می‌دهد (`healthStale`، تلگرام)، ولی هیچ «اصلاح‌کنندهٔ خودکاری» جز سشنِ کد نیست.
و انتخابِ مدلِ تصویرِ تازه عمداً خودکار نیست؛ آن تصمیم با چشمِ اوست.

## کلیپِ آغاز، حرکتی که به چیزی اشاره دارد، و مدلِ تازه‌ای که نشان داده می‌شود (8.51)

او یک ویدئوی نمونه فرستاد (برش هر ۲ تا ۴ ثانیه، ۱۶ ثانیهٔ اولش واقعاً متحرک) و سه چیز
خواست: «کلیپ، سقف ۱۲۰ بمونه / ۲ و ۳ هم بساز و بگو ۳ دقیقاً یعنی چه کار می‌کنه / … با یک
کلیپ در ابتدای درس … در شروعِ هر پادکست … چقدر هزینه می‌شه». و پیش‌تر: افکت «فقط نمایشی
نباشه … دقیقاً در راستای کمک به یادگیری … و خطا نداشته باشه».

**یک: کلیپِ آغاز از همان نقاشی** (`lvClipStep_`، ماشینِ حالت: '' ⇒ wait ⇒ judge ⇒ ok/fail/off).
مدلِ ویدئوی گوگل (`veo-3.1-lite-generate-preview`، تصویر ⇒ ویدئو) صحنهٔ نخست را هشت ثانیه
جان می‌دهد؛ چون از خودِ نقاشی شروع می‌شود، سبک و شخصیت همان می‌مانَد. مرزها، همه از
درس‌های پیشین:
- **پول در همان دفترِ ماه**، پیش از فراخوان، و **سهمِ درس آن را از پیش کنار می‌گذارد**
  (`lvScenePace_` ⇒ `cover += clip`). سقفِ ۱۲۰ یکی است؛ کلیپ از تصویرها کم می‌کند، نه از سقف.
- **فقط از تصویرِ داوری‌شده**: داور ممکن است صحنهٔ نخست را از نو بسازد، و کلیپِ تصویرِ
  دورریخته پولِ دورریخته است. کلیپ هم فقط روی همان تصویری می‌نشیند که از آن ساخته شد (`img`).
- **بایت‌ها، نه نشانی** («ftyp»)؛ **داوری که کلیپ را می‌بیند** (ورودیِ ویدئو) و «ندیدم» را
  «نه» می‌خوانَد (۷.۶۸)؛ نوشته در کلیپ ⇒ یک بارِ دیگر **با علت در دستور**.
- **ویدئو هرگز منتظرِ ابدیِ کلیپ نیست**: هر شکست ⇒ نقاشیِ ثابت، با علت در خطِ روزانه؛ و
  `LV_CLIP_WAIT_MIN` سقفِ کلِ انتظار است. صحنهٔ نخستی که هرگز تصویر نگرفت کلیپ را «نشد» می‌کند.
- **نقشه‌ای که پیش از ۸.۵۱ ساخته شد `clip` ندارد و کلیپ نمی‌گیرد**: خرجِ تازه روی درسی که در
  راهِ انتشار است، بی آنکه کسی خواسته باشد، نه.
- رانر کلیپ را می‌آورد و پیش از پایانش با میان‌محو به همان نقاشی برمی‌گردد؛ نوشته و زیرنویس
  **پس از** کلیپ می‌آیند (روی حرکت، نوشته جایش را گم می‌کند)؛ صحنهٔ کوتاه کلیپ نمی‌گیرد و
  **گفته می‌شود**.

هزینه: ۰٫۰۸ دلار بر ثانیه در ۱۰۸۰p (صفحهٔ رسمیِ گوگل، ۵ اکتبر) × ۸ = **۰٫۶۴ دلار برای هر درس**،
~۲۰ دلار در ماه.

**دو: حرکت به چیزی اشاره دارد، نه به شمارهٔ صحنه.** تا ۸.۵۰ هر صحنه ۳٫۵٪ بزرگ‌نمایی داشت با
جهتی که از **شمارهٔ صحنه** می‌آمد. حالا توصیف‌گرِ صحنه `focus` (کدام عنصرِ دیدنی، همان که
متنِ همان لحظه درباره‌اش است) و `move` (push / reveal / drift) می‌دهد، و **داوری که خودِ تصویر
را دیده** جای آن عنصر را (`box`، ۰ تا ۱۰۰۰). فقط صحنه‌ای که **هر دو** را دارد حرکتِ کانون‌دار
می‌گیرد (`lvSceneMv_`)؛ یکی نباشد ⇒ همان حرکتِ آرامِ قبلی، چون اشارهٔ نادرست بدتر از هیچ است.
رانر **دورِ همان نقطه** بزرگ‌نمایی می‌کند: برشِ [px·W·s، W−(1−px)·W·s] کانون را روی صفحه
ثابت نگه می‌دارد و برای هر px در [۰،۱] درونِ تصویر است. صحنهٔ نوشته‌دار فقط حرکتِ آرام
می‌گیرد (نوشته جایش را از تصویرِ ساکن گرفته است).

**و سدِ انتشار باید از حرکت خبر داشته باشد** — همان درسِ ۸.۴۵ برای نوشته: قابِ وسطِ یک صحنهٔ
۱۴٪ نزدیک‌شده «کلِ تصویر» نیست، پس مرجعِ سنجش همان برشی است که **در همان لحظه** باید دیده
شود، و برای لحظه‌ای درونِ کلیپ، قابِ همان ثانیه از **خودِ کلیپ**. هیچ‌کدام از خودِ خروجی
گرفته نمی‌شود؛ آن، سنجه را توخالی می‌کرد.

**سه: مدلِ تازه نشان داده می‌شود، نه بی‌صدا جا می‌افتد.** او پرسید «سنجاق یعنی مدل هیچ‌وقت
به‌روز نمی‌شه؟». `lvAudSee_` در همان گشتنِ هفتگیِ `lvGenModel_` فهرستِ مدل‌های تصویر را با
دیده‌شده‌ها مقایسه می‌کند (بارِ اول فقط ثبت — آنچه امروز هست «تازه» نیست). برای مدلِ تازه،
`lvAuditionLater` (اجرای یک‌باره) همان سه صحنهٔ بهترِ آخرین درس را با مدلِ تازه می‌سازد، هر شش
تصویر را در **یک** فراخوانِ داوری کنارِ متنشان می‌سنجد (یک داور، یک معیار)، و هر جفت را کنارِ
هم به تلگرام می‌فرستد با نمره و قیمت. **هیچ‌چیز خودکار عوض نمی‌شود**؛ همان راهِ مدل‌های صوتیِ
۸.۳۹: داور کف است و چشمِ او سقف — درسِ ۳۸ نشان داد این دو یکی نیستند. هزینه کمتر از ۰٫۳ دلار
برای هر مدلِ تازه، از همان سقف؛ جا نبود ⇒ صبر، و گفته می‌شود.

**آنچه این نسخه نمی‌کند، صریح:**
- **هیچ فراخوانِ واقعی به Veo زده نشده.** شکلِ درخواست از مستندِ رسمی است و هر دو شکلِ تصویر
  آزموده می‌شود (`inlineData`، و `bytesBase64Encoded` فقط وقتی ردِ ۴۰۰ دربارهٔ تصویر است). اگر
  نخستین درس (۴۰) خطا گرفت، علتش به نام در خطِ «🎬» و `_scenes.json.clip.why` است و ویدئو با
  نقاشی رفته. همان روز درست می‌شود.
- قیمت‌ها از صفحهٔ گوگل‌اند و صورت‌حساب نیستند (`LV_CLIP_PRICES`). کلیپِ ردشده هم پول دارد و
  شمرده می‌شود (`clips`).
- اینکه حرکتِ کانون‌دار «به یادگیری کمک می‌کند» را هیچ سنجه‌ای ثابت نمی‌کند؛ سنجه‌ها فقط
  می‌گویند به **همان عنصری** می‌رود که توصیف‌گر نام برد و داور در تصویر پیدا کرد. دیدنِ درسِ ۴۰
  داور است.

**سنجش:** سی شکستنِ عمدی روی موتور و هفت روی رانر، با پشتیبانِ همان اجرا. در دورِ اول هشت تا
روی سنجهٔ خودشان ننشستند و هر هشت یک شکاف بودند:
- چهار تا **مجموعه را پیش از هر سنجه انداختند**: سنجهٔ تازه شاهدش را بی‌حفاظ می‌خواند
  (`items[0]` روی نتیجه‌ای که آماده نبود، `DriveApp`ی که برای آن شناسه بدَل نداشت). شکستنی که
  نشسته بود شبیهِ شکستنی می‌شد که ننشسته (۷.۸۹). یکی‌شان یک ایرادِ واقعی هم بود: `lvClipStart_`
  اگر پرتاب کند، بیرونِ هر `try` بود و کلِ `lvScenesBuild_` را می‌انداخت.
- چهار تا **سبز ماندند**: جعبهٔ وارونه که سدِ مساحت از قبل می‌گرفتش (جعبهٔ دوبار وارونه نه)؛ خطِ
  🧪 که سنجه‌اش تابعِ خطِ آزمون را مستقیم صدا می‌زد، نه خطِ روزانه را؛ ادامهٔ کلیپ وقتی سقفِ
  تصویر پر شده؛ و سقفِ انتظارِ کلیپ. هر چهار حالا سنجهٔ خودشان را دارند.
- و دو تا روی رانر سبز ماندند، هر دو چون **بدَلِ آزمون از تولید نرم‌تر بود** (۷.۲۴): مرجعِ بریدهٔ
  صحنهٔ متحرک روی تصویرهای نرمِ آزمون لازم نمی‌شد (حالا جدا سنجیده می‌شود که به قابِ واقعی
  نزدیک‌تر است: ۱٫۹ در برابرِ ۷٫۷)؛ و «قابِ همان ثانیهٔ کلیپ» با «قابِ اولش» یکی بود، چون کلیپِ
  آزمون در طولِ خودش عوض نمی‌شد. حالا ثانیهٔ اولش یک‌رنگ است.

و آزمونِ رانر با ffmpegِ واقعی: کلیپِ آشکارا متفاوت (testsrc2) در ثانیهٔ ۲ همان کلیپ است و در
ثانیهٔ ۷٫۵ همان نقاشی؛ push در پایان به برشِ کانون نزدیک‌تر است تا به کلِ تصویر (۱٫۸ در برابرِ
۱۴٫۸)؛ کلیپی که بایت‌هایش HTML است ⇒ نقاشیِ ثابت با علت.

## ممیزی با دادهٔ واقعی: سه ایرادی که هیچ سنجه‌ای نمی‌دید (8.50)

او خواست «یه بررسیِ کاملاً اساسی و دقیق روی چندین درخواستِ اخیرم و ادعاهای خودت» بکنم
«که خیالم راحت باشه». ممیزی با خواندنِ کد شروع نشد؛ با `_STATUS.json` و دو `_scenes.json`ِ
واقعی از درایو، فهرستِ اجراهای گیت‌هاب، و فهرستِ روتین‌ها. سه ایراد از همان‌ها درآمد.

**یک: داور سلیقهٔ او را کنار گذاشته بود.** درسِ ۳۸ (او: «فوق‌العاده») با
`gemini-3.1-flash-lite-image` ساخته شده بود و داور به آن میانگینِ ۵٫۴۹ داد (با نمرهٔ
اولِ هشت تصویرِ ازنوساخته، زیرِ ۵٫۵). کفِ ۵٫۵ را ۸.۳۳ **بی هیچ دادهٔ واقعی** گذاشته بود.
پس ارزان‌ترین مدل کنار رفت؛ درسِ ۳۹ با `gemini-2.5-flash-image`، دو برابر گران‌تر، ساخته
شد و داور به آن **کمتر** داد (۵٫۳۳)؛ و `_STATUS.json` امروز مدلِ سوم را نشان می‌داد. یعنی
هر درسِ یک مجموعه سبکی دیگر، هر بار گران‌تر، و هیچ‌کدام به تصمیمِ او. همان داستانِ مدلِ
صوتیِ ۸.۳۸، این بار برای چشم. و خطِ روزانه می‌گفت «داوریِ تصویرها: هنوز هیچ»، چون
کیفیتِ **مدلِ تازه** را می‌خوانْد، نه مدلی که درس را ساخت.

`LV_GEN_MODEL_PIN` حالا همان مدلِ درسِ ۳۸ است. در فهرستِ حساب باشد ⇒ همان، و میانگینِ
داور درباره‌اش تصمیم نمی‌گیرد. داور هنوز هر تصویرِ ضعیف را یک بار از نو می‌سازد، پس
کارش گم نشد؛ فقط از «تصویرِ بد را درست کن» به «مدل را عوض کن» نمی‌رسد. سنجاق را فقط
**عیبِ عینی** کنار می‌گذارد: نوشته یا چهره در بیش از `LV_GEN_PIN_DEFECT_PCT` از دست‌کم
بیست تصویر (`def`، از ۸.۵۰ جدا شمرده می‌شود). نبودنِ سنجاق یعنی انتخابِ قبلی، **با
گفتن**، و هر عوض‌شدنِ مدل خبر دارد (`lvGenModelKeep_`)، نه فقط «کنار رفتنِ بد».
**قاعده: آستانه‌ای که بی داده گذاشته شده، پیش از آنکه اجازهٔ تصمیم بگیرد، باید با
نخستین دادهٔ واقعی و با داوریِ خودِ او سنجیده شود.** ۷۶.۱ همین را از نمره‌های واقعیِ دو
درس می‌سازد.

**دو: کفِ برشِ ۸.۴۹ زیرِ کفِ رانر بود.** رانر مرزِ صحنه را تا ۲٫۵ ثانیه به نزدیک‌ترین
مکث می‌کشد و صحنهٔ کوتاه‌تر از ۴ ثانیه را به قبلی می‌چسباند. صحنهٔ ۶ ثانیه‌ای که هر دو
مرزش به‌سوی هم کشیده شود، **حذف** می‌شود: تصویری که پولش داده شده و دیده نمی‌شود، بی
هیچ خطا. کف حالا ۹ و ۱۵ است و ۷۶.۶ هر دو عدد را از متنِ دو فایل (`00_Config.gs` و
`tools/scenekit.js`) می‌خوانَد — ۷٫۳۰/۷٫۶۶، دو ثابت در دو فایل.

**سه: درِ ویدئوی تأییدشده پشتِ ساختِ صحنه‌ها بود.** در دورِ یوتیوب `ytApprovedRedo_`
پس از `ytRunDue_` بود با شرطِ «۳۰ ثانیه مانده»؛ روزی که صحنه‌های درسِ تازه ساخته
می‌شود، `ytRunDue_` تا مهلتش می‌سازد و ویدئوی تأییدشده نوبت نمی‌گرفت. حالا پیش از آن
است (۷.۵۹)، و بی کلیدِ تأییدشدهٔ باز هزینه‌اش یک خواندنِ فایلِ کوچکِ گیت‌هاب است.

**سنجش:** دوازده شکستنِ عمدی با پشتیبانِ همان اجرا، هر دوازده روی سنجه‌های §۷۶. یکی
پیش از آن سبز می‌ماند و نشانش داد: نگارشِ اولِ ۷۶.۳ حافظه را پیش از پرسش پاک می‌کرد، پس
سنجاقِ نوشته‌داری که **از حافظه** برمی‌گشت دیده نمی‌شد. و ۷۶.۱ اول سرخ شد چون میانگینِ
گردشدهٔ ۵٫۴۹ «۵٫۵» است و زیرِ کف نیست — تنها راهِ «بد» شدنش نمرهٔ اولِ هشت تصویرِ
ازنوساخته بود، که در `_scenes.json` نمی‌مانَد و در آزمون صریحاً فرض شد.

**آنچه ممیزی درست یافت، با شاهد:** ۸.۴۹ با همان اثرانگشت روی گیت‌هاب است؛ نصب در کارِ
شبانه پیش از جایی است که دیشب مُرد؛ `promptSyncFromRepo_` همان‌جا v91 تا v93 را می‌آورد و
فقط v93 در ریشه می‌مانَد؛ سنجشِ رانرِ درس‌های ۳۸ و ۳۹ «ok» است و هر دو کلید در
`docs/yt-approve.json` هستند؛ همهٔ اجراهای گیت‌هابِ دو روزِ اخیر سبزند.

**آنچه ممیزی ثابت نکرد و باید گفته شود:**
- موتورِ در حالِ اجرا از امروز صبح ۸.۴۲ است؛ **۸.۴۳ تا ۸.۵۰، هشت نسخه، امشب با هم نصب
  می‌شوند.** پس درسِ ۴۰ نخستین اجرای واقعیِ نوشته روی نقاشی، تشخیصِ درس/داستان، پخشِ
  بودجه، برشِ محتوایی، پرسشِ دسته‌ای و مدلِ سنجاق است — همه در یک روز.
- ناظر ۴ و ۵ اکتبر `_REPORT` ننوشت (آخرین ۳ اکتبر). درمانش (v93) امشب به درایو می‌رسد؛
  نخستین آزمونِ واقعی ظهرِ فردا است.
- قیمتِ هر تصویر در موتور **فرض** است (`LV_GEN_PRICES`)؛ صورت‌حسابِ واقعی فقط در
  حسابِ گوگل دیده می‌شود.
- سه ویدئوی قدیمیِ گیرکرده (`variety:20`، `special:26`، `variety:23`) هنوز Unlisted‌اند:
  بازسنجی‌شان در بلوکِ یوتیوبِ کارِ شبانه است و شبِ ۴ و ۵ اکتبر به آن نرسید.

## سقف، نه هدف؛ و شمار از محتوا، نه از ساعت (8.49)

او سقف را ۱۲۰ دلار خواست (نوشت «۱۲»، و جملهٔ بعدش «این ۱۲۰ یعنی…» نشان داد منظور
۱۲۰ است) و شرطش را هم گفت: «این ۱۲۰ یعنی مدل خودش رو ملزم می‌کنه که حتماً برسونه
به ۱۲۰؟ … صرفاً از این جهت که کم نیاد … طبیعی رفتار کنه … نه اینکه یه تعداد
هاردکدشده در نظر بگیری که هر بیست ثانیه یه عکس … شاید یه ویدیو صد تا، شاید ده تا».

**جوابِ راستِ نیمهٔ دوم «بله، هاردکد بود» بود.** `lvSceneSec_` سطحِ «زیاد» را
۲۰ ثانیه و «کم» را ۴۵ می‌کرد و `lvSceneGroups_` درس را با ساعت می‌بُرید. یعنی
شمارِ تصویر از **طولِ صوت** می‌آمد، نه از اینکه چند چیزِ دیدنی در آن هست. ۸.۴۸
هم همان عدد را «سطحِ تخته» می‌نامید و بودجه را با آن می‌سنجید.

**تدوین‌گر، نه ساعت** (`lvSceneCuts_`): یک فراخوانِ کوچکِ متن کلِ درس را
جمله‌به‌جمله با زمانش می‌بیند و فقط شمارهٔ جمله‌هایی را می‌دهد که تصویرِ تازه از
آن‌ها شروع می‌شود: هر جا ایده، مثال، شخصیت، مکان یا چرخشِ تازه‌ای هست. سطحِ تخته
**چگالی** است (زیاد = هر تغییرِ واقعی؛ کم = فقط تغییرهای بزرگ)، و **هیچ ثانیهٔ
هدفی به مدل گفته نمی‌شود**، چون همان عدد هدف می‌شد (۷۱.۲۷ این را در پرامپت می‌پرسد).
کد فقط دو مرز دارد: کوتاه‌تر از `LV_CUT_MIN_*` با همسایهٔ کوتاه‌تر یکی می‌شود
(دیده نمی‌شود) و بلندتر از `LV_CUT_MAX_*` به تکه‌های **برابر** شکسته می‌شود. پاسخ
فقط شماره است، پس سقفش کوچک و `exact` است (۸.۳۴). تدوین‌گر نشد ⇒ همان برشِ زمانیِ
قبلی، و **گفته می‌شود** (`cutWhy`، خطِ روزانه).

**بودجه دیگر شمار نمی‌دهد، فقط سقفِ هر درس** (`lvScenePace_`): سهمِ میانگین
(ماندهٔ سقف ÷ درس‌های ماندهٔ ماه) × `LV_PACE_FLEX` (۲٫۵). درسِ پرتصویر بیشتر از
میانگین می‌گیرد و درسِ آرام کمتر، و چون هر روز با ماندهٔ واقعی حساب می‌شود، آنچه
درسی نخواست برای بقیه می‌مانَد. **هیچ شاخه‌ای صحنه اضافه نمی‌کند تا به سقف برسد**
— شکستنِ عمدیِ «تا سقف پر کن» روی ۷۱.۲۷ می‌نشیند. سقف فقط وقتی دیده می‌شود که
محتوا بیش از آن بخواهد، و آن‌وقت **کوتاه‌ترین صحنه‌ها یکی می‌شوند**، نه آخرِ درس
بریده. «بودجه بُرید» (`paced`) فقط وقتی گفته می‌شود که سقف از بودجه آمده باشد، نه از
سقفِ ایمنیِ `LV_SCENE_MAX` (۱۵۰) — وگرنه خطِ روزانه برای درسی که پولش بود می‌گفت
«سقف برای محتوا کم است» (۷۱.۲۷-ب).

**صد صحنه در یک پاسخ جا نمی‌شود** — همان دامِ ۸.۳۴: پاسخِ بلند از سقفِ توکن و از
مهلتِ اجرا می‌گذرد. پس نقشه در چند اجرا ساخته می‌شود: اول برش، و **ثبت** (درسِ
`musicWrap_`: آنچه در ازسرگیری از نو پرسیده شود شمارهٔ صحنه‌ها را جابه‌جا می‌کند)؛ بعد
توصیف‌ها دسته‌دسته (`LV_SCENE_ASK_BATCH`)، و دستهٔ بعد فقط با وقتِ کافی. دستهٔ اول
ماهیت، شخصیت‌ها و کاور را می‌دهد؛ بقیه آن‌ها را **می‌شنوند**، وگرنه نیمهٔ دومِ ویدئو
شخصیت‌ها را جورِ دیگری می‌کشید. هر اجرا دست‌کم یک دسته می‌پرسد، مگر همان اجرا برش را
گرفته باشد؛ بی این، مهلتِ کوتاه یعنی ادامه‌ای که هرگز جلو نمی‌رود. **هیچ تصویری پیش
از کامل‌شدنِ نقشه ساخته نمی‌شود** (۷۱.۲۸ شمارِ ساخت را در لحظهٔ هر پرسش می‌گیرد).

**و یک باگِ همسایه که همین کار ساخت و آزمون گرفت:** `planFail` شمارِ «نقشهٔ ناشده»
را از همان `d` می‌خوانَد، و نقشهٔ تازهٔ `asking` آن را صفر می‌کرد، پس «دو بار نشد»
هرگز نمی‌رسید و هر دو ساعت یک پرسشِ بیهوده خرج می‌شد. ۷۱.۶ همان لحظه سرخ شد.

**سنجش:** بیست‌ودو شکستنِ عمدی با پشتیبانِ همان اجرا؛ هر بیست‌ودو روی سنجهٔ خودشان
یا همان ادعا زودتر. B1 («بودجه را نادیده بگیر») روی ۷۱.۶-ب نشست که همان ادعا را از درِ
بی‌پولی می‌سنجد؛ B1b (نادیده‌گرفتنِ FLEX) روی ۷۱.۲۱. دو تا در دورِ اول سبز ماندند و هر
دو سنجهٔ نبوده بودند: عددِ ۱۲۰ خودش (حالا ۷۱.۲۱ تصمیمِ او را نگه می‌دارد)، و «شکستن به
تکه‌های برابر» — سدِ کف تهِ ریزِ اضافه را پنهان می‌کرد، پس ۷۱.۲۶ حالا با کفِ یک‌ثانیه‌ای
می‌سنجد. و یک تلهٔ خودم: نگارشِ اولِ شکستن هر بار که از گام می‌گذشت می‌بُرید و از دو
تکهٔ خواسته سه تکه می‌ساخت؛ آزمونِ «آرام ≤ ۶» با عددِ ۸ گرفتش، نه خواندنِ کد.

**آنچه این نسخه نمی‌کند، صریح:** اینکه تدوین‌گر واقعاً سرِ تغییرِ معنا می‌بُرد را
فقط دیدنِ ویدئو می‌گوید؛ `_scenes.json` حالا `cutBy`، `natural` و `cutWhy` دارد تا
کنارِ متن دیده شود. درس‌هایی که نقشه‌شان پیش از نصب ساخته شده (۳۸، ۳۹) همان برشِ
زمانی را نگه می‌دارند.

## سقفی که فقط دیوار بود: کیفیت به تاریخ بسته بود (8.48)

او پرسید: «اگر سقف ۶۰ دلار باشد و قبل از اتمامِ ماه رد شود، بقیهٔ درس‌نامه‌ها ساده مثلِ
قبل انجام می‌شه؟ اگه این باشه اشتباه است و حرفه‌ای بودن رو خراب می‌کنه.» جواب «بله» بود،
و از کد، نه حدس: `lvGenRoom_` صفر ⇒ حلقهٔ ساخت می‌شکست ⇒ «فقط N از M < ۸۰٪» ⇒ `fail` ⇒
کارتِ ساده؛ و خودِ پیامِ سلامت می‌گفت «از این پس کارت‌ها ساده ساخته می‌شوند تا اولِ ماه».
با `gemini-2.5-flash-image` (۰٫۰۶۷ دلار) هر درسِ «زیاد» ~۴۵ صحنه یعنی ~۳٫۷ دلار، و ماهِ
۳۱ روزه ~۱۱۷ دلار — پس حدودِ روزِ هفدهم پول تمام می‌شد. **یک سقف که فقط ایست می‌دهد،
کیفیت را به تاریخ می‌بندد.**

**سهم، نه دیوار** (`lvScenePace_`): سهمِ هر درس = ماندهٔ سقف ÷ (روزهای ماندهٔ ماه ×
برنامه‌ها × `LV_PACE_SLACK`). هزینهٔ هر صحنه با `LV_PACE_REDO_PCT` برای ساختِ دوباره و
کاور با `LV_GEN_HQ_MAX_USD` حساب می‌شود. سطحِ تخته که جا نشد، **صحنه‌ها بلندتر می‌شوند،
نه ساده**: همان سبک و همان نقاشیِ تمام‌قاب، فقط کمتر. هر درس از نو و با ماندهٔ واقعی حساب
می‌شود، پس خودش را تصحیح می‌کند. سهم یک بار و پیش از نقشه حساب و در `_scenes.json` نوشته
می‌شود (`pace`)، تا ازسرگیری همان را بخوانَد (درسِ `musicWrap_`).

**کف فقط سه صحنه است، عمداً.** کفِ بالاتر (نگارشِ اول هشت بود) یعنی قرض از روزهای بعد،
همان پرتگاهی که این کار برای برداشتنش است. سهمِ کم **گفته می‌شود**، پنهانی از آخرِ ماه
برداشته نمی‌شود.

**سقفِ صحنه سخت شد.** `lvSceneGroups_` در ۰٫۸۵ِ طولِ هدف می‌بُرد، پس تعداد تا ~۱۸٪ از
`maxN` بالاتر می‌رفت. وقتی سقف از بودجه می‌آید، هر صحنهٔ اضافه تصویری بی‌پول است؛ حالا
کوتاه‌ترین صحنه با همسایه‌اش یکی می‌شود تا جا شود.

**سقفی که وسطِ درس پر شود** (قیمتِ مدل عوض شده، سقف پایین آمده) دیگر درس را به کارت
نمی‌اندازد: `capHit` کفِ «۸۰٪ ساخته» را به سه می‌آورد و هر صحنهٔ بی‌تصویر تا صحنهٔ تصویردارِ
بعد ادامه می‌یابد. کارتِ ساده یعنی پولِ همان تصویرها دور ریخته شود. و **بی‌پولیِ کامل پیش
از هر فراخوانِ مدل** گفته می‌شود و «نقشهٔ ناشده» شمرده نمی‌شود: ماهِ بعد پول هست و این درس
نباید تا ابد «دو بار نشد» بماند.

**دیده می‌شود، هر روز:** خطِ «💵» در `lessonVisuals` سهمِ هر درس، چند صحنه می‌خرد، و برای
سطحِ کاملِ تخته سقف باید چند باشد. از `PK.LV_PACE_LAST` خوانده می‌شود، نه از درایو، چون
`lvGenStatus_` در `writeStatus_` است (۷٫۶۳). پیامِ «سقف پر شد» حالا می‌گوید این **نباید** پیش
بیاید و علتش را بگرد.

**آنچه این نسخه نمی‌کند، صریح:** با ۶۰ دلار سطحِ «زیاد» برای هر روزِ ماه جا نمی‌شود؛ پخش
یعنی ~۲۰ صحنه (هر ~۴۵ ثانیه) به‌جای ~۴۵. انتخابِ میانِ «سقف بالاتر» و «صحنهٔ بلندتر» تصمیمِ
پولیِ اوست، نه کد. کد فقط تضمین می‌کند که آن انتخاب برای **همهٔ** روزهای ماه یکسان باشد.

**سنجش:** چهارده شکستنِ عمدی با پشتیبانِ همان اجرا، هر چهارده روی سنجهٔ خودشان. دو تا در دورِ
اول جای دیگر نشستند: «هرگز پخش نکن» اول روی ۷۱.۶-ب افتاد (مجموعه با نخستین سرخ می‌ایستد)،
پس با شکستنِ باریک‌تر زده شد. «عددِ سقفِ لازم را بینداز» سبز ماند، چون ۷۱.۲۵ فقط واژهٔ «سقف
باید» را می‌جُست، نه خودِ عدد را. حالا عدد را از `needMonth` می‌سازد و همان را در خط می‌جوید.

## «صدای ویدئو یک درس است» فرض بود، نه تشخیص (8.47)

او پرسید: تخته روی همه‌چیز اثر دارد؟ «خودکار» درست تشخیص می‌دهد؟ و اگر جای درس یک
**داستان** خوانده شود، می‌فهمد دیگر درس نیست که روی عکس «نکته» بنویسد؟

**جوابِ نیمهٔ اول «بله» بود، از دادهٔ واقعی:** `vis.board`ِ درس‌های ۳۷ تا ۳۹ در
`_YT-RENDER.json` نشان داد سطحِ «زیاد»ِ تخته هر سه روز رسید (هدفِ ۲۰ ثانیه) و سبکِ
«خودکار» به انتخابِ مدل رفت (`ساده و رسمی + خطیِ مینیمال`). سبکِ دستی زبانِ هنریِ
**هر** تصویر است (`lvSceneArt_` ⇒ `art` در دستورِ هر تصویر)؛ §۷۱.۱۹ از درِ ساخت می‌سنجد.

**جوابِ نیمهٔ دوم «نه» بود.** خطِ اولِ `lvScenePrompt_` می‌گفت «صدای ویدئو یک درس است»،
و سدِ نوشته (`lvSceneOvTrim_`) فقط **سهم** را می‌دید، نه **جنس** را. پس قصه استعارهٔ
آموزشی می‌گرفت و روی صحنهٔ ماجرا «نکته‌ها» و جدولِ مقایسه می‌نشست.

**ماهیت از خودِ متن، نه از دسته** (۸-ذ): مدل در همان فراخوانِ صحنه `nature` می‌دهد —
درس / داستان / آمیخته — و برای هر صحنه `beat`: «ایده» یا «روایت». `nature` **اولِ**
schema است، چون مدلِ ساختاریافته به ترتیبِ schema می‌نویسد و هر چیزِ بعدی به آن بسته است.
پرسشِ دوم (صحنه‌های جاافتاده) فقط چند صحنه را می‌بیند، پس ماهیتِ تشخیص‌داده‌شده را
**می‌شنود** و جوابِ متفاوتش تشخیصِ اول را عوض نمی‌کند.

**«روایت» یعنی خودِ لحظه، نه استعاره‌ای دربارهٔ آن** — با حال‌وهوای همان لحظه در نور و
رنگ، و **بی لو دادنِ پایان** (همان قصهٔ صندلیِ تاکسیِ ۶٫۲۱: پایانِ غافلگیرکننده خودِ
ماجراست). آدمِ واقعیِ زندگی‌نامه پیکرِ عام و بی‌چهره است؛ مرزِ جعل سرِ جایش است.

**سدِ جنس در کد است، نه فقط در پرامپت** (`lvSceneOvGenre_`): صحنهٔ «روایت» — یا هر صحنه‌ای
در «داستان» که صریحاً «ایده» نیست — `points`/`compare`/`steps` نمی‌گیرد، **حتی وقتی تخته
«زیاد» گفته**: این دربارهٔ درستی است، نه مقدار. شمرده می‌شود (`ovGenre`). در «آمیخته» هر
صحنه جدا سنجیده می‌شود (§۷۱.۱۷)، وگرنه درسی که با یک مثالِ داستانی پیش می‌رود فهرست‌هایش را
هم از دست می‌داد.

**«خودکار» از ماهیت، دستی دست‌نخورده:** `CFG.LV_TEXT_AUTO` (درس ۴۵٪، آمیخته ۳۵٪، داستان
۲۰٪)؛ ماهیتِ ناشناخته = درس، یعنی همان رفتارِ ۸.۴۶. سهمی که آدم روی تخته نوشته
(خاموش/کم/زیاد) **هرگز** با تشخیصِ مدل عوض نمی‌شود (§۷۱.۱۶-ب).

**و انتخابِ خودکارِ سطح دربارهٔ چیزی تصمیم می‌گرفت که ساخته نمی‌شد:** پرامپتِ `look` سه
سطح را با «کارت» توصیف می‌کرد، در حالی که از ۸.۳۱ ویدئوی درس‌نامه صحنهٔ تمام‌قاب است. در
حالتِ صحنه حالا «سطح» یعنی ضرباهنگ — با ثانیه‌هایی که از خودِ `lvSceneSec_` خوانده
می‌شوند، نه تایپِ دستی — و مدل پیش از سبک می‌پرسد «درس است یا داستان» تا برای روایت
سبکِ روایی بردارد.

**آنچه این نسخه نمی‌کند، صریح:** «از همه جا از همه رنگ» (`variety`) هنوز اصلاً ویدئوی
مصور ندارد (`LV_SHOWS = ['special']`)؛ روشن‌کردنش تصمیمِ بودجه است، نه کد. و اینکه مدل
قصه را درست «داستان» می‌خوانَد را فقط دیدنِ `_scenes.json.nature` کنارِ متن می‌گوید.

**سنجش:** نوزده شکستنِ عمدی با پشتیبانِ همان اجرا؛ هر نوزده روی سنجهٔ خودشان. دو تا در
دورِ اول اول روی سنجه‌های قدیمیِ ۷۱.۱۳ نشستند (مجموعه با نخستین سرخ می‌ایستد)، پس با
شکستنِ باریک‌تر دوباره زده شدند تا ثابت شود ۷۱.۱۶-ب و ۷۱.۱۷ خودشان هم می‌گیرند. و
خطِ «سبکِ روایی» در پرامپتِ `look` اول سنجه‌ای نداشت؛ ۶۵.۱۰ حالا آن را هم می‌پرسد.

## ایمیلی که می‌رسید و ناظری که کار نمی‌کرد — و ویدئویی که هرگز نوبت نمی‌گرفت (8.46)

او گفت «ناظر رو هم بررسی کن» و «اون ویدیو رو هم عمومی کن». هر دو یک شکل داشتند:
**چیزی که از بیرون سالم به نظر می‌رسید و از درون هیچ‌وقت به کار نمی‌رسید.**

**ناظر: ایمیل شاهدِ کار نیست.** روتینِ ۱۲:۰۰ هر روز ایمیل فرستاد، پس «ناظر کار
می‌کند». ولی ۴ و ۵ اکتبر هر اجرا **یک دقیقه** بود (`fired 08:02:51`، `finished
08:03:51`، ۵ هزار توکنِ خروجی در برابرِ ۲۵۰ هزار توکنِ زمینه) و خودش در ایمیل
نوشت: «پرامپت حدودِ ۳۲۰ کیلوبایت است. بدنهٔ اجرایی‌اش را کامل نخواندم …
`_REPORT-YYYYMMDD.json` هم ننوشتم.» آخرین گزارشش در درایو مالِ ۳ اکتبر بود و پنج
وارسیِ چشمی «نشد». علت ساختاری است: از ۳۶۰ کیلوبایتِ v92، **۲۵۸ کیلوبایت
یادداشتِ تغییرِ هشتاد نسخهٔ گذشته** بود، هر بار بالای قبلی؛ کارِ روزانه از خطِ
۲۸۰۶ شروع می‌شد. هر نسخه فقط چند خط افزود و هیچ سنجه‌ای اندازه را نپرسید.
**دستوری که خواننده‌اش تا آخر نمی‌خوانَد، دستور نیست.**

v93 همان کارِ روزانه است به‌اضافهٔ پنج یادداشتِ تازه (۱۲۷ کیلوبایت)؛ یادداشت‌های
۱۱ تا ۸۸ در `docs/prompts/monitor_history.md`اند. `run_wiring_test.js` §۱۵ سقفِ
۱۶۰ کیلوبایت و پنج یادداشت را نگه می‌دارد. **قاعده: یادداشتِ تغییرِ تازه بالای
دستور می‌نشیند، و وقتی از پنج گذشت، قدیمی‌ترین به تاریخچه می‌رود.**

و «در این محیط امکانِ تماشای ویدئو نیست» درست نبود: `ffmpeg -ss T -i <نشانیِ
release>` با بازه می‌خوانَد و قاب را بی دانلودِ کلِ فایل می‌دهد، و `Read` تصویر را
نشان می‌دهد. دستورِ عملیِ هر وارسی پیش از نوشتن روی همین محیط اجرا شد (قابِ ۵۶۸
ثانیهٔ درسِ ۳۸ = صحنهٔ ۲۵ِ `_scenes.json`). `curl -I` به گیت‌هاب ۴۰۱ می‌دهد و GET
درست است — HEAD شاهدِ «در دسترس نیست» نیست. **«ممکن نبود» بی فرمان و بی خطای
دقیق پذیرفته نیست**؛ و «نمی‌شنوم» (مدل صدا نمی‌شنود) دلیلِ «نشد» نیست، فقط
باید گفته شود.

**متنِ خودِ روتین عوض نشد، و لازم هم نیست.** آن متن فقط می‌گوید «بالاترین
`_PROMPT-monitor-v*.md` را از درایو بخوان و همان را اجرا کن»؛ پس هر قاعدهٔ تازه
(`_REPORT` پیش از ایمیل، کارِ یک‌تا‌دوساعته، دستورهای عملی) در خودِ v93 است و
`promptSyncFromRepo_` آن را شبانه به درایو می‌برد. این سشن هم نمی‌توانست عوضش کند:
روتین از راهِ `http_api` ساخته شده و ابزار فقط روتینی را ویرایش می‌کند که عامل با
`create_trigger` ساخته باشد. **وقتی راه‌انداز به یک فایل ارجاع می‌دهد، قاعدهٔ تازه
جایش در همان فایل است، نه در راه‌انداز.**

**ویدئو: سقفی که تأیید را نمی‌شناخت.** درسِ ۳۸ (`special:60`) با سنجشِ رانر سالم
بود و فقط تأییدِ نخستین ویدئوهای حالتِ صحنه را کم داشت. ولی تأیید هم کافی نبود:
تنها راهِ عمومی‌شدنِ ویدئوی منتشرشده `ytRedoStuckNightly_` است، با سقفِ سه و
«قدیمی‌ترین اول» — و سه ویدئوی قدیمی‌تر (`variety:20`، `special:26`، `variety:23`)
به علتِ دیگری گیر کرده‌اند. پس ویدئوی تأییدشدهٔ تازه **هرگز** نوبت نمی‌گرفت، بی
هیچ خطایی. کلیدِ تأییدشده حالا جلوِ صف است (۷٫۵۹: آنچه خواسته شده پشتِ آنچه کسی
نخواسته نمی‌مانَد)، و `ytApprovedRedo_` درِ دومش در دورِ دوره‌ایِ یوتیوب است، چون
شبِ ۴ و ۵ اکتبر هر دو پیش از بلوکِ یوتیوب مردند (۷٫۴۶). ارزان است چون کم‌کار است:
هاب فقط میانِ تأیید و انتشار باز می‌شود (`PK.YT_APPR_DONE`).

**تأییدِ ویدئوی بعدی کارِ ناظر است** (v93، دستورِ عملیِ هـ): قاب می‌گیرد، اگر سالم
بود کلید را در `docs/yt-approve.json` می‌نشانَد و push می‌کند — داده است، نسخه
بالا نمی‌رود. سدی که فقط سشنِ کد بتواند بازش کند، همان «دری که آدم باید باز کند»
است (۵٫۹۵).

**سنجش:** پنج شکستنِ عمدی با پشتیبانِ همان اجرا؛ یکی سبز ماند چون آزمون برای
«کلیدِ بی‌ویدئو» ردیفی نساخته بود و نبودِ ردیف جلویش را می‌گرفت، نه سدِ `videoId`.
ردیفِ آپلودِ شکست‌خورده ساخته شد و نشست.

## نوشته روی همان نقاشی، نه اسلایدی کنارش — و نشانی که از ویدئوی دوم نیامد (8.45)

او ویدئوی درسِ ۳۸ را «فوق‌العاده» دید و گفت تصویرها مفهومی بودند «ولی هیچ نوشته‌ای
روی عکس‌ها نبود … حالتِ برداری روی عکس‌ها هم بیاد بدونِ اینکه روی عکس جایی بیاد که
خرابش کنه … نه اینکه یه اسلاید برداری باشه یکی تصویری». و لوگوی خودش را ندید.

**نوشته لایه است، نه حالت.** سبک و سطحِ تخته همان می‌مانند؛ «نوشته روی تصویر» ستونِ
خودش را دارد (`SC.LVTEXT`، در انتها) و جعبه‌اش **در همان خانهٔ سطح** است، نه ستونِ
تازهٔ جدول (`colspan`، ۸.۱۳). سهمش **سقف** است و در کد بریده می‌شود (`lvSceneOvTrim_`)،
نه در پرامپت. نقاش از پیش می‌شنود همان بخشِ قاب را خلوت بگذارد (`lvSceneOvSpace_`).

**«کجای تصویر خالی است» را داور می‌گوید؛ پیکسل فقط جای دقیق را.** داورِ تصویر (که از
۸.۳۱ هر نقاشی را کنارِ متنش می‌بیند) در همان فراخوان `space` می‌دهد: right/left/top/none.
«none» یعنی آن صحنه نوشته نمی‌گیرد (`ovDropped`). رانر فقط درونِ همان سمت می‌گردد. این
ترتیب را آزمایش روی نقاشی‌های واقعیِ درسِ ۳۸ تحمیل کرد، چهار بار پشتِ‌هم:
- جعبه‌های ثابت + میانگینِ شلوغی ⇒ نوشته روی صورتِ آدمِ صحنهٔ ۴۴.
- بیشینهٔ لبه ⇒ آسمانِ خالیِ صحنهٔ ۲۰ «شلوغ» (خط‌های نازکِ باد: ۱۲۰).
- «تیره نسبت به کلِ تصویر» ⇒ آدم را گرفت، ولی پنلِ فیروزه‌ایِ صحنهٔ ۵ — خودش زمینه — را
  هم «توده» خواند.
- «فاصلهٔ رنگی» ⇒ ابرِ سفید روی آسمانِ آبی «توده» شد و زنجیرِ صحنهٔ ۵ باز دیده نشد.
**تودهٔ یکدستِ بزرگ و زمینهٔ یکدستِ تیره از روی پیکسل یکی‌اند**؛ فقط چشم جدایشان می‌کند.
پس سنجهٔ پیکسلی («دور از روشنیِ میانگینِ همان جعبه») سدِ دوم است، نه اول. نوشته اول
کشیده و اندازه‌اش از پیکسل‌های خودش خوانده می‌شود؛ جا نشد ⇒ باریک‌تر (۸۰٪، ۶۶٪) و دوباره؛
و «بهترینِ مجاز» برگزیده می‌شود، نه «بهترین و بعد پرسیدن که مجاز است» (صحنهٔ ۳۸: جای خالی
وسط بود و لبهٔ راست، که آدم آن‌جا بود، برگزیده و دور انداخته می‌شد). تصویری که جای خالی
ندارد نوشته نمی‌گیرد و **شمرده** می‌شود (`ov.busy`) — «روی جای مهم نیاید» بر «روی خیلی از
تصویرها» مقدم است. هیچ‌کدام از این‌ها با خواندنِ کد پیدا نشد؛ **با دیدنِ قاب‌ها** پیدا شد.

**و تأکید مکملِ فامِ غالب است**، همیشه: چرخاندنِ همان فام روی پنلِ فیروزه‌ای واژهٔ کلیدیِ
آبی داد، که از زمینه جدا نمی‌شود.

**سنجشِ ویدئو باید بداند نوشته هست.** مرجعِ صحنهٔ نوشته‌دار همان نقاشی **با** نوشته است
(`ref`)؛ بی آن، هر نوشته «صحنه سرِ جایش نیست» می‌خورد و سدِ انتشار ویدئو را نگه می‌داشت.

**نشان: تابعی که هرگز تعریف نشده بود.** `ytChannelMark_` از روزِ نوشتنش `daysSince_` را
صدا می‌زد. بارِ اول (بی کش) آن خط اجرا نمی‌شد؛ از بارِ دوم ReferenceError، که
`ytMarkSpec_` می‌بلعید و `null` برمی‌گرداند. پس فقط ویدئوی اول نشان داشت. سنجهٔ ۶۲.۵
سبز بود چون **فقط شمارِ فراخوان** را می‌شمرد، نه آنچه برگشت. `run_wiring_test.js` ۱۴ حالا
هر فراخوانِ نامِ خصوصیِ تعریف‌نشده را در src می‌گیرد — شکلی که «کدِ مرده» (تعریف بی
فراخوان) هرگز نمی‌دید: **فراخوان بی تعریف**.

**و مربعِ سیاه:** عکسِ پروفایل ۸۷٪ سیاه است. `logoClean` رنگِ زمینه را از چهار گوشه
می‌خوانَد، شفافش می‌کند و به جعبهٔ خودِ نشان می‌بُرد؛ گوشه‌های ناهم‌رنگ یعنی دست نزن و
بگو (`how`). جوهرِ شناسهٔ کانال با روشنیِ زیرِ همان گوشه عوض می‌شود. واترمارکِ یوتیوب از
همان نسخهٔ بریده (`docs/brand/channel-mark.png`، که رانر می‌نویسد) و نبودش یعنی همان قبلی.

**و خرجی که هیچ‌جا دیده نمی‌شد:** پس از رسیدنِ ویدئوی صحنه‌ای، اجرا به شاخهٔ کارت‌ها
می‌افتاد و برای همان درس پس‌زمینهٔ پولی و اسلایدز می‌ساخت (درسِ ۳۸: پنج تصویر) و
`_visuals.json`ِ صحنه‌ای را بازنویسی می‌کرد. صحنه‌های تمام‌شده یعنی کارِ تصویر تمام است.

## زنگی که پرسنده‌اش همیشه «همان روز» می‌پرسید (8.44)

۵ اکتبر همان ایمیلِ ۱۰ صبح دو جملهٔ ناسازگار داشت: «❌ اجرای ناتمام: selfUpdateDaily
(۴۴۸ دقیقه پیش شروع شد)» و «کارِ شبانه: هر شب فهرست تا آخر می‌رود». دومی دروغ بود،
و علتش یک خط: `nightDeath_` «همان روز ⇒ هنوز در جریان» می‌گفت. کارِ شبانه ۰۲:۳۰ است و
**تنها پرسنده‌اش وارسیِ ۱۰:۰۰ِ همان روز**؛ و تا ۱۰ِ فردا، شبِ تازه ضربان را رونویسی کرده
است. پس `died` در عمل هرگز true نمی‌شد. سنجه‌اش سبز بود چون روزِ ضربان را دستی «روزِ
گذشته» می‌گذاشت: حالتی که تولید نمی‌سازد (۷٫۲۲). حالا «در جریان» با **سنِ** ضربان است
(`NIGHT_DEATH_MIN`)، و ۹.۲۰ِ `run_calendar_test.js` حالت را با خودِ `nightAtSave_` می‌سازد. ایستادنِ عمدی (سقفِ
اجراها، ادامه‌ای که زمان‌بندی نشد) مهرِ «پایان — …» می‌گیرد تا «کشته شد» خوانده نشود.

**و جایی که شب مُرد:** «جبرانِ مشخصات» (`embStep_` گفتش). پنج شیتِ منبعِ چندده‌مگابایتی
را باز می‌کند و بخشی از خواندن‌هایش بیرونِ مهلت است؛ و مکان‌نماها فقط در **آخرِ** تابع
نوشته می‌شدند، پس اجرای کشته‌شده هیچ پیشرفتی نگه نمی‌داشت و شبِ بعد همان کار را از همان
جا تکرار می‌کرد: یک حلقهٔ مرگ با شرطِ ثابت. علتِ دقیقِ مرگ (کدام خواندن) بی لاگِ
Executions ثابت نیست؛ این نسخه حدسش را درمان نمی‌کند، **جایش** را عوض می‌کند:
- جبران اجرای جدای خودش را دارد (`embSpecsLater`)، **پس از** ساخت زمان‌بندی می‌شود تا با
  ساختِ همان ردیف‌ها هم‌پوشانی نکند، قفل می‌گیرد چون `syncCatalog` هم در همان تب‌ها
  می‌نویسد، و قفلِ گرفته یعنی چند دقیقهٔ دیگر — تا سقفِ روزانه. اگر خودش کشته شود،
  `runStuck_` فردا به نامش می‌گوید؛ و کارِ شبانه دیگر با او نمی‌میرد.
- هر تبِ منبع جدا ثبت می‌شود: اول وصله در بانک، بعد مکان‌نما. ترتیب مهم است؛ برعکسش
  ردیف‌هایی را رد می‌کند که مشخصاتشان هرگز ننشسته.
- نوشتن فقط بازهٔ دست‌خورده را می‌خواند و می‌نویسد، نه کلِ ستون.

**قاعده:** وقتی زنگی برای «X مُرد» می‌سازی، بپرس **چه کسی و کِی** آن را می‌پرسد، و آیا
در آن لحظه شرطش اصلاً می‌تواند برقرار باشد. این‌جا تنها پرسنده همیشه در همان پنجره‌ای
بود که قاعده «هنوز زود است» می‌گفت.

## پیش از هر آموزشِ صدا: فهرستِ چیزهایی که یک بار شکسته‌اند (8.43)

او گفت «راهش بنداز … فقط قبلش تمامِ چالش‌هایی که از شروعِ کلونِ رضوی و گلدوز
داشتیم را استخراج کن … که هی وسطش قطع نشه و هی بگی اشتباه کردم». این فهرست همان
است، به شکلِ **قاعده برای هر گوینده**، نه خاطرهٔ یک نفر. پیش از راه انداختنِ هر
آموزش، هر سطرش را با کد بسنج — نه با حافظه.

**آموزش (voice-train)**
1. هر اجرا یکی-دو دور است (CPU، ~۲ تا ۲٫۷ ساعت هر دور، بودجهٔ ۲۹۰ دقیقه)؛ ۳۲ دور
   یعنی ~۱۵–۲۰ اجرا و ~۴–۵ روز. عددِ کوچک‌تر حدسِ کسی است که لاگ را ندیده.
2. بالادست پس از ازسرگیری همان دور را دوباره می‌رود (`RESUME_ADD`) — اجرای ۱۷ِ رضوی
   پنج ساعت دوید و صفر دور جلو رفت.
3. کشی که برنگردد یعنی شروع از صفر و نوشتنِ کشِ خالی؛ اجرا می‌ایستد مگر `allow_fresh`.
   آموزشِ دوباره **یک بار** با آن راه می‌افتد و دیگر هرگز.
4. دادهٔ تازه با کشِ قدیم: `freshStart_` با اثرِ انگشتِ دیتاست — و کلیدِ گوینده در
   همان اثرِ انگشت است، وگرنه نفرِ دوم روی دادهٔ نفرِ اول آموزش می‌دید (۷٫۲۱).
5. **فهرستِ فایل‌ها در شروع قفل می‌شود** (`retrainIds`): فایلی که وسطِ کار به پوشه
   بیاید اثرِ انگشت را عوض می‌کرد و چند روز آموزش از صفر می‌رفت (۸.۴۳، ۲۴.۵ و ۲۴.۷-ب).
6. کشِ ۱۰ گیگی مالِ کلِ مخزن است؛ دو گوینده هم‌زمان یعنی هر دو می‌افتند
   (`VOICE_MAX_ACTIVE: 1`) — و گوینده نباید جلوی ادامهٔ **خودش** را بگیرد (۲۲ سپتامبر).
7. **لغو ≠ شکست** (اجرای ۶۷)؛ `state.json`ِ اجرای کشته‌شده کهنه است — عددِ واقعی
   `Saving checkpoint …_e<N>` در لاگ است و `stateSync_` آن را از دیسک می‌خوانَد.
8. سقفِ دیتاست ۲۴۰ دقیقه است (`VT_DS_MAX_MIN`)؛ شش برابر داده برای رضوی فقط ۰٫۰۱۸
   آورد — تنگنا اندازهٔ داده نیست.
9. artifact عمر دارد (نهایی از ۸.۴۲ نود روز)؛ جای نگه‌داری درایو است، با اثرانگشت.

**داده**
10. **نرخِ نمونه را پیش از کار بسنج، فایل به فایل** — ضبط‌های ۱۱ کیلوهرتزی چیزی
    بالای ~۵٫۵ کیلوهرتز ندارند و هیچ آموزشی آن را نمی‌سازد (۷٫۸۰). سدِ قدیم فقط
    **یک** فایل از هر گوینده را می‌سنجید؛ پوشه‌ای با ضبط‌های قدیم و تازه را با همان یک
    فایلِ قدیمی رد می‌کرد (۸.۴۳).
11. دقیقه را از نرخِ بیتِ واقعی حساب کن، نه از ۱۲۸ — گلدوز ۷ برابر کم برآورد شد.
12. ضبط‌های قدیم و تازه را قاطی نکن: نیمی از داده بی فرکانسِ بالا یعنی مدلی گرفته‌تر.

**سنجش**
13. مرجعِ سنجش صدای **خودِ همان گوینده** است، نه رضوی (۷٫۲۲).
14. **سنجش با زیروبمِ خودِ گوینده**، نه گامِ ثابتِ ‎−۱۲ِ رضوی: ۰٫۷۰۸ِ گلدوز با همان گام
    گرفته شد و با گامِ ‎−۲ روی همان مرجع ۰٫۸۲۸ است. حالا چند گام و بهترین، با گامش.
15. برای آموزشِ دوباره، **مدلِ قبلی روی همان ضبط و همان گام‌ها** — وگرنه «شبیه‌تر شد؟»
    جوابی ندارد (`prevSimilarity`).
16. عددِ شباهت داورِ نهایی نیست: یک بار جهتِ غلط را نشان داد (`index_rate`، ۷٫۷۰).
17. «آماده» با عددِ زیرِ حد اعلام نمی‌شود بی گفتنِ همان عدد (۷٫۷۹).

**تبدیل و شنیدن (پل و نمونه‌ها)**
18. گام برای صدای مبدأ معنا دارد، نه برای گوینده: ‎−۱۲ روی مبدأِ زن‌گونه درست بود و روی
    Charon خروجیِ ۶۰ هرتزی داد — «عاروق». هدف **هرتز** است (۸.۲۴/۸.۳۷).
19. «به‌خاطرِ هرتز است» یک بار غلط بود و با اصرارِ او فهمیده شد: علت گامِ ثابت بود.
    **وقتی او می‌گوید تشخیص غلط است، دوباره بسنج، از استدلال دفاع نکن** (۷٫۸۱).
20. رنگ ≠ روح: RVC فقط رنگ را عوض می‌کند؛ مکث و ریتم از خوانش می‌آید (کارتِ سبک،
    ۷٫۳۴). برچسبِ «روح» فقط از رویدادِ همان ساخت (۷٫۷۹/۷٫۸۹).
21. بلندی: گینِ ثابت، نه پویا (۸.۲۷)، و بلندیِ خروجی تعیین‌شده (۸.۳۷).
22. صدای مبدأ هم عوض می‌شود (مدلِ صوتی، WAV با C2PA): سنجاق (۸.۳۸/۸.۳۹).

**جابه‌جایی و نگه‌داری**
23. گویندهٔ «آماده» خودش به صف برنمی‌گردد؛ آموزشِ دوباره تصمیمِ صریح است
    (`VOICE_RETRAIN`) — و تا پایانش پوشه بایگانی نمی‌شود (۸.۴۳).
24. شکست‌های آموزشِ قبلی به حسابِ آموزشِ تازه نمی‌آیند (ردیفِ نشانه).
25. «آماده»ِ دوم هم اعلام می‌شود (`told` با tag).
26. مدلِ هم‌اندازه «همان» نیست؛ فقط اثرانگشت. قبلی به «پیشین»، نه سطل (۸.۴۲).
27. ضبط‌های خام تا پایانِ آموزش «هرکس با لینک»اند (رانر بی‌هویت است)؛ ده روز پس از
    «آماده» بسته و بایگانی می‌شوند.

**دیدن**
28. **هر ساعت، هر تغییر، به تلگرام** (`vintTrainWatch_`): شروع، هر دور با برآوردِ
    پایان، اجرای بی‌پیشرفت، سنجش، شکست، پایان — و **۱۲ ساعت سکوت** خودش خبر است،
    چون گردش‌کاری که دیگر نمی‌دود هیچ خبری نمی‌فرستد. روی تریگرِ ساعتی، پیش از سدِ
    `VBR_ON` (آموزش به پل ربطی ندارد)، و بی هیچ خواندنِ هاب (۷٫۶۳/۷٫۸۴).

**این نسخه را آزمون دو بار پیش از تولید نجات داد:** ۲۷.۹ نشان داد گوینده‌ای که
آموزشش همین حالا تمام شده، تا شبِ بعد با **همهٔ** فایل‌هایش (قدیمی‌ها هم) دوباره به
صف و به اشتراکِ عمومی می‌رفت؛ و ۲۴.۷-ب نشان داد tagِ تازه‌ای که وسطِ آموزش تعریف
شود فهرست را عوض می‌کرد. هیچ‌کدام را خواندنِ کد نشان نداد.

## «سریع پاک نکنه» — و یک جا واقعاً می‌رفت (8.42)

او پس از ۸.۴۱ گفت «گیت‌هاب وقتی مدل در دستِ موتور می‌ذاره و موتور برمی‌داره سریع پاک
نکنه، چون ممکنه موتور درست کار انجام نداده باشه و زحماتِ چند روزه از بین بره». برداشتش
از حرفِ من نیمه‌درست بود و نگرانی‌اش یک جا کاملاً درست: **گیت‌هاب فقط نسخهٔ موقتِ حمل
را پاک می‌کرد، ولی «موتور برداشت» را با سنجه‌ای می‌فهمید که برای آموزشِ دوباره کور بود.**

**هم‌اندازه «همان» نیست.** `vbrModelFetchOne_` فایلی را که از قبل با همان اندازه در
پوشه بود «همان مدل» می‌شمرد و بالا نمی‌برد. `.pth`ِ RVC اندازه‌اش را از **معماری**
می‌گیرد، نه از داده؛ پس آموزشِ دوبارهٔ گلدوز با ۳۰ فایلِ تازه (با همان ۳۲ دور) همان اندازهٔ
قبلی را **می‌داشت** — شکلِ تانسورها ثابت است و فقط برچسبِ «Nepoch» درونِ فایل می‌تواند
چند بایت جابه‌جایش کند. این بازآموزی هنوز نشده؛ این‌جا خواندنِ کد پیدایش کرد، نه شکست. نتیجه: مدلِ تازه نمی‌نشست، «رسید» ثبت می‌شد، `--clean` تکه‌ها را پاک
می‌کرد، و پل با مدلِ قدیم ادامه می‌داد — بی هیچ خطا. (و `.index` اندازه‌اش از داده
است، پس جفتِ ناجور هم ممکن بود: ایندکسِ تازه کنارِ مدلِ قدیم.) حالا «همان» فقط با
`sha256Checksum`ِ **خودِ درایو** است (`vbrDriveMeta_`).

**«رسید» یعنی اثرانگشت، نه اندازه.** `vintModelsForQueue_` برداشتی را که اثرانگشتش
هنوز از درایو نیامده (`sha: 0`) در صف نمی‌نویسد، پس نسخهٔ گیت‌هاب تا آمدنش (یا سقفِ
۷۲ ساعت) می‌مانَد؛ و `vbrModelTaken_` آن را «برداشته» نمی‌شمارد، پس ساعتِ بعد دوباره
سنجیده می‌شود. اگر آن‌وقت اثرانگشت فرق داشت، مدلِ تازه بالا می‌رود: **همگرایی بی دستِ
آدم.** و خبرِ «✅ آمد» برای هر تحویل یک بار است (`first`) — دو خبر برای یک مدل، یکی
را دروغ می‌کند.

**کنار رفتن، نه سطل.** مدلِ قبلی به «مدل‌های صدا/پیشین» می‌رود با «— کنار رفت
<تاریخ>» در نام (`vbrModelAside_`). سطلِ درایو سی روز بعد خالی می‌شود، و مدلی که با
آموزشِ تازه کنار رفت همان است که اگر گوشِ او تازه را نپسندید باید برگردد — همان قاعدهٔ
موسیقیِ ردشده (۵٫۵۶).

**اصل در artifact است، و از آن‌جا راهِ برگشت هست.** پاک‌شدنِ نسخهٔ موقت فقط **حمل** را
می‌بندد. پس `vbrModelMissingScan_` گویندهٔ آماده بی‌مدل را در صف (`missing`) می‌نویسد
— فقط وقتی فهرست عوض شد، نه هر شب — و کارِ plan با `voicemodel.py --redrop` همان را از
artifactِ آموزش دوباره تحویل می‌دهد. سه مرز:
- **سقف** (`VBR_MODEL_REDROP_MAX` = `REDROP_MAX`ِ پایتون، و آزمون هر دو را از متن
  می‌خوانَد): هر بار تا ۷۲ ساعت روی لینکِ عمومی است.
- **«نیست» از «نشد» جداست:** فقط وقتی خودِ گیت‌هاب گفت artifact نیست (`gone`) دیگر
  پرسیده نمی‌شود؛ خطای گذرا نوبتِ بعد دوباره. و «نیست» مالِ **همان اجرا**ست (`run`):
  آموزشِ دوباره اجرای تازه دارد.
- **همان قاعدهٔ انتخابِ فایل** که `measure` دارد (`.pth`ِ بی `_e`، وگرنه بالاترین پله
  با ترتیبِ **عددی** — ترتیبِ متنی `e2` را بالای `e10` می‌گذارد).

خطِ روزانه سه حالتِ «بی‌مدل» را با سه جملهٔ متفاوت می‌گوید: هنوز خودکار می‌آید · artifact
دیگر نیست (آموزشِ دوباره) · سه بار فرستاده شد و نرسید (علت در موتور، یافتهٔ
`vmodel-<کلید>`). جملهٔ یکسان برای هر سه یعنی او نمی‌فهمد کِی کارِ او شروع می‌شود.

**و دو چیزِ ارزان:** artifactِ نهاییِ آموزش ۹۰ روز به‌جای ۳۰ (سقفِ مخزنِ عمومی، و همان
عددِ نردبان که وزن‌های پله‌ها را از قبل نود روز نگه می‌داشت، پس دامنهٔ دیده‌شدن عوض
نمی‌شود)؛ و شکستِ تحویل در `measure` دیگر job را نمی‌اندازد — تا ۸.۴۱ یک خطای Release
یعنی مدلی که آموزش دید و سنجیده شد، «آماده» ثبت نمی‌شد.

**آنچه این نسخه نمی‌کند، صریح:** artifactهای ساخته‌شده پیش از امروز سی روزِ خودشان را
دارند؛ artifactِ رضوی (اجرای ۵۹) ۱۷ اکتبر می‌رود — مدلش از قبل در درایو است. و اگر
موتور سه بار نتوانست و artifact هم تمام شد، مدل فقط با آموزشِ دوباره برمی‌گردد؛ این را
خطِ روزانه به نام می‌گوید، نه سکوت.

**سنجش:** بیست‌وهفت شکستنِ عمدی با پشتیبانِ همان اجرا، هر بیست‌وهفت روی سنجهٔ خودشان —
از جمله برگرداندنِ همان سنجهٔ اندازه (۱۳.۱: «۰ بارگذاری»). یک تلهٔ بدَل پیش از آن: فایلِ
دستیِ §۴ در بدَل اثرانگشت نداشت، در حالی که درایو برای هر فایلی دارد — بدَلی که حالتِ
نادرِ تولید را حالتِ عادی کند، سنجه را به راهِ دیگری می‌فرستد (۷٫۲۴).

## سه پرسش، و هر سه جواب «بخشی» بود (8.41)

او پس از ۸.۴۰ پرسید: «کجا در فولدرِ هر پادکست می‌تونم اثرش رو ببینم؟»، «اون حالتِ
خواندنِ رضوی و گلدوز که استخراج شد الان اثر داره؟» و «بعد از سی روز چی رو از دست
می‌دم؟». جوابِ راستِ هر سه «بخشی» بود، و هر سه با کد بسته شد، نه با جمله.

**یک: «چرا» پرسیده می‌شد و دور ریخته می‌شد.** schemaی برنامه‌ریزِ حالت از ۸.۲۴
فیلدِ `why` داشت و پرامپت می‌گفت «در why بگو چرا»؛ `speakSpanTrim_` آن را در
`cand.push({a,b,k})` انداخت. باز «تحلیلی که به هیچ‌جا نرسید». حالا `w` و خودِ جمله
(`t`) در `ep.__moods` می‌نشینند و `speakMoodFileSave_` در پایانِ هر قسمت فایلِ
**«<نام> — حالت‌ها و نشانه‌ها.txt»** را کنارِ «متن صوتی» می‌نویسد. ثانیه از
**رویدادِ صداسازی** است: هر تکه نشانیِ حالتش را می‌بَرد (`mref`/`pref` ⇒ `ms`/`ps`
در `_times.json`)، پس حالتی که ننشست با ثانیهٔ ساختگی نمی‌آید، جدا و با نام می‌آید.
«متن صوتی» عمداً بی‌برچسب ماند: همان است که به گفتارساز می‌رود، و برچسب در آن یعنی
روزی خوانده شود (۵٫۵۹).

**دو: کارت فقط عدد است، و عدد را لازم نیست به مدل گفت.** متنِ کارت به هیچ مدلِ
صوتی نمی‌رسد (۷٫۸۹)، ولی «در دلِ جمله 0.30، میانِ دو جمله 0.60، میانِ بندها 1.1»
را می‌شود خودمان در صدا ساخت. `speakGapStretch_` سکوت‌های **درونِ** هر تکه را
می‌یابد (بلندترین `nSent − 1` تا مرزِ جمله‌اند، بقیه درونِ جمله) و هر کدام را که از
اندازهٔ او کوتاه‌تر است، با سکوتِ واقعی **وسطِ همان سکوت** کش می‌دهد؛ `speakGapEdge_`
مرزِ دو تکه را (سرِ بخش «میانِ بندها»، بقیه «میانِ دو جمله»). سه مرز: هرگز کوتاه
نمی‌کند، مکثِ تازه نمی‌سازد، و **سهمِ گفتار زیرِ عددِ خودِ او نمی‌رود**. آخری را
اجرا گفت نه استدلال: نخستین آزمون «۹۴٪ ⇒ ۷۶٪» داد در برابرِ «۷۹٪»ِ کارتِ گلدوز —
یعنی کش‌دارتر از خودش. درج روی خودِ base64 است (هر ۳ نمونه ۸ نویسه)، پس بی
رمزگشاییِ دوباره و بی جابه‌جاییِ یک نمونه. عددها **یک بار** در `ep.__moods.gaps`
(همان‌جا که گوینده تصمیم گرفته می‌شود) — درسِ `musicWrap_`. بی کارت `gaps` نیست و صدای
امروزِ برنامه‌ها **عیناً** همان است. نمونهٔ آزمون (`runVoiceSoulTest`) همان کار را
می‌کند، تا او همان را بشنود که قسمت خواهد داشت.

**آنچه نمی‌کند، صریح:** ملودی و حسِ جمله هنوز مالِ گفتارساز است؛ سرعتِ پایهٔ خواندن
عوض نمی‌شود (کارت عددِ سرعت ندارد)؛ مکثی که گفتارساز نگذاشته ساخته نمی‌شود؛ و سکوتِ
افزوده طولِ قسمت را بلندتر می‌کند — `specialReserve_` آن را نمی‌شناسد، پس قسمتی که
گوینده‌اش کارت دارد کمی از «هدف» بلندتر درمی‌آید.

**سه: سی روز مالِ گیت‌هاب بود، نه درایو.** مدلِ هر گویندهٔ تازه در artifact می‌مانَد
و artifact سی روز بعد پاک می‌شود؛ `vbrModel_` فقط می‌توانست بگوید «دستی بگذاریدش» (او
برای گلدوز ۲۷ سپتامبر گذاشت). حالا `tools/voicemodel.py --drop` در کارِ `measure`ِ
`voice-intake` مدل را تکه‌تکه (۳۲ مگابایت، مضربِ ۲۵۶ کیلوبایت، زیرِ سقفِ ۵۰ مگابایتیِ
UrlFetchApp) در Releaseِ «voice-model-drop» می‌گذارد و `modelDrop` را در
`docs/voices.json` می‌نویسد. موتور:
- `vbrModelDropDue_` هر ساعت (و شبانه) فقط **زمان‌بندی** می‌کند — یک خواندنِ gitHub
  raw، هرگز هاب (۷٫۶۳/۷٫۸۴؛ ۱۰.۱ می‌شمارد).
- `runVoiceModelFetch` (اجرای جدا) با **بارگذاریِ ازسرگیری‌پذیرِ درایو** تکه‌ها را
  یکی می‌کند — چون یک blob سقفِ ۵۰ مگابایت دارد و مدل ۵۵ است — و هر تکه همان `Blob`ِ
  پاسخ است، هرگز آرایهٔ بایتِ ۳۲ میلیونی. `followRedirects: false` روی PUT حیاتی است:
  درایو برای «ادامه» ۳۰۸ می‌دهد.
- اثرانگشتِ کل را از **خودِ درایو** (`sha256Checksum`) با تحویل مقایسه می‌کند، و اندازه
  را جدا — چون اثرانگشت گاهی دیر می‌رسد و آن‌وقت تنها شاهد اندازه است. ناهمخوان ⇒ سطل:
  مدلِ خراب از مدلِ نبوده بدتر است، چون «موجود» شمرده می‌شود.
- «رسید» با **زمانِ همان تحویل** (`drop`) در Script Properties و در صفِ گویندگان
  (`models`، `vintQueueModels_` همان لحظه و `vintQueue_` شبانه) می‌نشیند؛ `--clean` در
  کارِ `plan` فقط تکه‌های تأییدشده یا بیش از ۷۲ ساعت مانده یا بی‌صاحب را پاک می‌کند.
  تأییدِ تحویلِ قبلیِ همان گوینده تکه‌های تحویلِ تازه را پاک نمی‌کند (۱۱.۷).
- گوینده به **فهرستِ نمونهٔ خودکار** می‌رود (`vbrSoulSeeds_`: دستیِ CFG به‌علاوهٔ
  خودکار — **یک تعریف** برای زمان‌بند و انتخاب‌گر؛ دو تعریف یعنی زمان‌بندی که هر روز
  زمان‌بندی کند و انتخاب‌گری که نشناسد، ۷٫۸۶). مدلی که **دستی** آمد هم شبانه شناخته
  می‌شود (`vbrSoulAutoScan_`).
- گویندهٔ آماده‌ای که مدلش نه در درایو است نه در راه (تحویلِ منقضی، یا پیش از ۸.۴۱)
  شبانه شمرده و با نامِ دو فایل در خطِ روزانه گفته می‌شود — سکوت «سالم» خوانده می‌شد.
- سه شکستِ پیاپی ⇒ یافتهٔ کد با کلیدِ **کوتاهِ** `vmodel-<key>`: شناسهٔ ردیف بیش از
  ۲۴ نویسه را هش می‌کند و آن‌وقت بستنش با `answers` (۷٫۴۸) ممکن نیست. آزمون همین را
  گرفت، نه خواندن.

**بهای این راه، صریح:** مدلِ صدای یک آدمِ واقعی چند ساعت (حداکثر ۷۲) روی Releaseِ
عمومی است. او ۴ اکتبر دانست و پذیرفت. خاموش‌کردنش `VBR_MODEL_AUTO: false` است، و
آن‌وقت همان راهِ دستیِ قبل.

**دستوری که از حقیقتش جلو افتاده بود، دو بار، در یک فایل:** راهنمای پوشهٔ «voice
cloning» (`docs/voice_intake.md`، هر شب در درایو آینه می‌شود) می‌گفت «پلِ رنگِ صدا
هنوز ساخته نشده» — از ۷٫۳۶ دروغ — و «با ✅ لینکِ نمونه‌ها می‌آید» — از ۷٫۷۴ دروغ.
هر دو با همین کار درست شد، و خبرِ «✅ آماده شد» (`vintAnnounce_`) هم دیگر راهِ دستی را
حواله نمی‌دهد.

**سنجش:** سی‌وسه شکستنِ عمدی با پشتیبانِ همان اجرا. بیست‌وهفت روی سنجهٔ خودشان
نشستند. B8 (سقفِ «سهمِ گفتار») روی ۱۰.۱۳-ت-پ نشست که همان ادعا را روی صدای معلوم
می‌سنجد، و ۱۰.۱۳-ت-ب برچسبِ «ویژگی، نه سد» گرفت (۷٫۷۱). B23 روی ۸.۱ نشست و ادعای
شمارش به ۸.۲ رفت. سه تا در دورِ اول سبز ماندند و هر سه یک سنجهٔ نبوده بودند:
انتخاب‌گرِ نمونه که بذرِ خودکار را نمی‌شناخت (۳.۴)، سدِ اندازه وقتی اثرانگشت نیست
(۷.۵)، و درجی که سکوت را با گفتار عوض کند (B12 فقط سکوت برمی‌داشت و دیده نمی‌شد؛
B12b گفتار درج کرد و ۱۰.۹-ب گرفت). و یک تلهٔ بدَل: ساعتِ بدَلِ این مخزن روی ۱۸ اوت
است و پایتون ساعتِ دستگاه را می‌خوانَد، پس «تازه»ِ یکی «منقضی»ِ دیگری بود و
`--clean` همه را پاک کرد (۱۱.۷). **وقتی دو زبان در یک آزمون زمان را می‌خوانند، از
یک ساعت بخوانند.**

## کلیدی که نامش «حالت در قسمت» بود و به هیچ کدی وصل نبود (8.40)

او نمونه‌های رضوی و گلدوز را شنید و گفت «صداها اوکی بودن»، و پرسید متنِ پادکست‌ها
چه می‌شود: «همه متن‌ها نشانه‌گذاری بشن، حالت‌ها توجیه بشن، و ثبت بشن، و اعراب‌گذاری
هم سرِ جایش باشه … نه فقط برای این گوینده‌ها، حتی برای گوینده‌های فعلی … و اتوماسیون
زیر نظر باشه … و اگر نه هم گزارش بده و هم اقدام کنه و پیگیری کنه».

**جوابِ راست این بود که حالت‌ها فقط در نمونه‌ها بودند.** `SPEAK_SPANS_EP` از ۸.۲۴ در
CFG نشسته بود با توضیحِ «در قسمت‌ها خاموش تا گوشِ او بگوید» و **هیچ‌جای کد آن را
نمی‌خواند**. یعنی گوشِ او که می‌گفت، روشن‌کردنش هیچ اثری نداشت. همان شکلِ ۸.۰۵،
«سیم‌کشی»، در بدترین حالتش: کلیدی با نامِ درست که به هیچ تصمیمی وصل نیست.

**«کجا» مالِ متن است، «چطور» مالِ گوینده.** جای «آرام» و «مکث»، نشانه‌ها و اعراب از
معنای جمله می‌آیند و برای هر گوینده‌ای یکی‌اند. ولی وقتی گوینده‌ای با کارتِ سنجیده
(`ep.__persona`) قسمت را می‌خوانَد، کارتش به پرسشِ حالت می‌رود («تأکید را با مکث و
کشش بساز، نه با بلند کردنِ صدا» ⇒ «کشیده» بر «بلند») و طولِ «مکث» از «میانِ
بندها»ی کارتِ خودِ او گرفته می‌شود (`speakMoodPause_`). **این تنها جایی است که کارتِ
سبک امروز اثر دارد:** خودِ کارت به گفتارساز نمی‌رسد (۷٫۸۹)، پس اگر به پرسشِ حالت
نرود، به هیچ‌جا نمی‌رود.

**یک بار حساب، همیشه خوانده.** نقشه در `speak2`، پس از بازبینیِ اعراب، روی متنِ نهایی
ساخته و در `ep.__moods` با امضای متن نوشته می‌شود (`speakMoodsStep_`، ادامه‌پذیر،
بند به بند). صداسازی فقط آن را می‌خوانَد — درسِ `musicWrap_`: نقشه‌ای که در ازسرگیری
دوباره پرسیده شود شمارهٔ تکه‌ها را جابه‌جا می‌کند. جمله‌ها و بندها از خودِ متن
**دوباره ساخته می‌شوند** نه ذخیره، چون با همان امضا جوابشان همان است.

**`speak2` حالا دو کار دارد**، پس خاموش‌کردنِ بازبینی دیگر مرحله را حذف نمی‌کند — وگرنه
حالت‌ها هم بی‌صدا می‌رفتند (۹.۱). و بازبینی یک بار ثبت می‌شود (`st.revDone`): هر
ازسرگیریِ حالت‌ها یک ردیفِ «۰ بخش وارسی» در کارنامهٔ بازبینی می‌نوشت.

**منو فقط آنچه به گوش می‌رسد.** دستور به هیچ مدلِ صوتی نمی‌رسد، پس حالت از سرعت در
خودِ صدا، نشانهٔ پایانِ جمله و سکوتِ واقعی می‌رسد. «لبخند» هیچ‌کدام را ندارد و در
قسمت برنامه‌ریزی نمی‌شود (`speakSpanMenu_`) — حالتی که برنامه‌ریزی شود و اثری نداشته
باشد، ادعای بی‌ورودی در کارنامه است (۷٫۷۹). روزی که دستور برسد (`speakCueReaches_`)،
منو خودش کامل می‌شود.

**`speakSegPieces_` تنها تعریفِ تکه‌های یک بخش است**، برای صدای هر دو برنامه و برای
متنِ ویدئو (`specialTextChunks_`). دو تعریف یعنی روزی شمارِ تکه‌های ویدئو با `_times.json`
نخوانَد (۸.۳۱). «مکث» تکهٔ جدا نیست، سکوتِ پیش از تکهٔ بعدی است (`pre`)؛ پس `k` همان
«t» می‌مانَد و `lvAlignTimes_` و تلفیقِ موسیقی دست نخوردند. و اگر جدولِ تلفظ شمارِ
جمله را عوض کند، آن بخش **بی‌حالت** می‌رود، نه با حالتِ جابه‌جا.

**«برنامه‌ریزی شد» با «نشست» یکی نیست.** هر تکهٔ حالت در `_times.json` می‌گوید چطور
نشست (`mo`، `h`: دستور / صدا / نشانه / نشد؛ `p`: سکوت). کارنامه (`PK.SPEAK_MOODS`)
از همان ساخته می‌شود، نه از نقشه، و `lost` می‌شمارد چه برنامه‌ریزی شد و ننشست. چگالیِ
نشانه‌های لحنِ هر قسمت هم از امروز ثبت می‌شود (`pr` در `PK.SPEAK_SKIP`)؛ تا ۸.۳۹ ترمیم
زیرِ کف می‌رفت و عددِ نهایی با پایانِ اجرا گم می‌شد.

**دیده و پیگیری می‌شود:** سطرِ «🎭 حالت‌ها» در سرِ ایمیل و سرپیامِ تلگرامِ هر قسمت با
ثانیهٔ هر حالت؛ `speakMoods` در `_STATUS.json` و سطرِ روزانه **هر روز**؛ ⚠️ وقتی حالت‌ها
کامل ننشستند یا نشانه‌گذاری زیرِ کف ماند؛ `healthChronic_` برای تکرار؛ دو قسمتِ پیاپیِ
ناقص ⇒ یافتهٔ `speak-moods-fault` در صفِ کد؛ و ناظر v88 §۴٫۱۶ هر روز می‌شمارد **و دو
جا را می‌شنود**.

**و یک هزینهٔ پنهان که همین کار نشانش داد:** `ttsGuarded_` شش ثانیه از هر تکهٔ
دستوردار را به مدلِ شنونده می‌فرستاد **حتی وقتی دستور انداخته شده بود** — دنبالِ دستوری
که در بسته نبود. سرِ هر بخش یک فراخوانِ بیهوده، و با حالت‌ها سرِ هر حالت هم. حالا
دستوری که نرفت شنیده نمی‌شود (۱.۱۱).

**تلهٔ بدَلِ آزمون، بارِ پنجم:** پرسشِ تازهٔ حالت در `run_v4_tests.js` و
`run_reports_test.js` جای پرامپتِ نویسنده نشست و دو سنجهٔ قدیمی همان لحظه سرخ شدند.

**سنجش:** سی شکستنِ عمدی با پشتیبانِ همان اجرا.
- بیست‌وهشت روی سنجهٔ خودشان نشستند. یکی‌شان (B11، برداشتنِ `speakMoods` از
  `_STATUS.json`) را ابزارِ شکستن اول «جای دیگر» گزارش کرد، چون نخستین «❌»ِ خروجی
  سطرِ خودِ موتور بود: سدِ «سیم‌کشیِ» کارنامهٔ قابلیت همان لحظه زنگ زده بود. سنجهٔ
  خودش (۲.۴) هم سرخ بود. **پیش از قبولِ «جای دیگر نشست»، خروجی را بخوان.**
- B17 سبز ماند و درست هم بود: میان‌بُرِ «نقشهٔ تمام‌شده» سد نیست، `bi` جلوی پرسشِ
  دوباره را می‌گیرد. در کد همین برچسب را گرفت (۷٫۷۱).
- B28 اول سبز ماند: سدِ «نشانه‌گذاری زیرِ کف» همان `ok` را پایین می‌آورد و قفلِ حالت
  را می‌پوشاند (۷٫۴۱). ۷.۲ حالا نشانه‌ها را بالای کف می‌گذارد و ۷.۲-ب جدا می‌سنجد.

**آنچه این نسخه نمی‌کند، صریح:**
- اینکه گفتارساز «…» را آرام‌تر و «!» را پرشورتر می‌خوانَد را فقط گوش می‌گوید.
- شدتِ سرعتِ حالت برای همه یکی است؛ فقط **مکث** و **انتخابِ حالت** از گوینده
  می‌آیند.
- `VBR_REPLACE` خاموش است: نسخهٔ رضوی یا گلدوزِ یک قسمت **کنارِ** اصل می‌نشیند و
  منتشر نمی‌شود، تا او بگوید.
- قسمتی که پیش از نصب به صداسازی رسیده، حالت نمی‌گیرد.

## سنجاق تا وقتی هست کار می‌کند؛ جانشینش با همان گوش انتخاب می‌شود (8.39)

او نمونه‌های پاکِ ۸.۳۸ را «خیلی بهتر» شنید و درست پرسید: «اگر این مدل دوباره آپدیت
بشه به مدلی که خوشم نیومد چی؟ و اگر قفلش کنی و بعداً اکسپایر بشه هم یه افتضاحِ
دیگه‌ست.» سنجاقِ ۸.۳۸ فقط تا روزی کار می‌کند که مدل در حسابِ گوگل هست. آن روز که
برود، انتخابِ خودکار **پرامتیازترین** را برمی‌داشت، و پرامتیازترین دقیقاً
3.8-flash بود (امتیاز ۴۰۱۰۰ در برابرِ ۳۳۰۰۰ِ سنجاق). یعنی همان که او «با اضطراب»
شنید. §۴.۰ِ `run_ttsmodel_test.js` این را ثابت می‌کند، نه استدلال.

**«خوب خواند» باید عدد می‌شد، و عدد از فایل‌های واقعیِ همان شب درآمد.** همان متن و
همان صدا:

| | 3.1-flash (پسندیده) | 3.8-flash |
|---|---|---|
| گفتارِ واقعی (بی سکوت) | ۲۲۸ تا ۲۳۱ ثانیه | ۱۹۶ تا ۲۰۴ ثانیه |
| زیروبم | ۱۲۳ تا ۱۲۵ هرتز | ۱۱۱ هرتز |

پس «اضطراب» یعنی **گفتارِ ۱۳ تا ۱۶٪ تندتر**، نه مکثِ کمتر. 3.8 سهمِ مکثِ **بیشتری**
داشت (۱۹ تا ۲۰٪ در برابرِ ۱۴ تا ۱۵٪)، پس کلِ زمان گول می‌زد و فقط تندیِ گفتارِ واقعی
جدا می‌کرد. همین ابزار (`ttsPcmProfile_`) روی همان فایل‌ها اجرا شد: دو اجرای
3.1 با هم ۱٫۱٪ و ۰٫۳ نیم‌پرده فاصله داشتند (هم‌خوان)، و هر دو اجرای 3.8 ناهم‌خوان
درآمدند (۱۲٫۱٪ و ۱۶٫۵٪ تندتر، ۱٫۸ نیم‌پرده بم‌تر). مرزها زیرِ همان فاصله‌اند: ۷٪ و
۱٫۵ نیم‌پرده.

**سازوکار:** هر مدلِ صوتیِ حساب با یک متنِ ثابت (`TTS_AUDITION_TEXT`) و صدای ثابت
آزموده می‌شود. این کار در یک اجرای یک‌بارهٔ جدا (`ttsAuditionLater`) انجام می‌شود که
`healthCheck` و کارِ شبانه زمان‌بندی‌اش می‌کنند، و هیچ‌کدام خودشان گفتارساز صدا
نمی‌زنند (۷.۶۳). سه قاعده جدایش می‌کنند از یک حدسِ تازه:
- **مرجع از خودِ سنجاق گرفته می‌شود، با همین ابزار.** هیچ عددی دستی نوشته نشده؛
  «هم‌خوان» یعنی «مثلِ همان که او پسندید».
- **مرجع یک بار گرفته می‌شود و بی‌صدا تازه نمی‌شود.** اگر هر هفته از نو گرفته شود،
  دگرگونیِ آهستهٔ خودِ مدل هرگز دیده نمی‌شود. درِ آگاهانه‌اش `TTS_PROFILE_VER` است،
  یا عوض شدنِ سنجاق.
- **عددِ خام ذخیره می‌شود و داوری هنگامِ خواندن.** پس گرفتنِ مرجعِ تازه داوری‌های
  قبلی را کهنه نمی‌کند.

سنجاق که برود، `ttsFitOrder_` جانشین را می‌چیند: اول هم‌خوان (نزدیک‌تر جلوتر)، بعد
نسنجیده، و ناهم‌خوان آخر. همیشه یکی می‌مانَد، چون بی مدلِ صوتی هیچ قسمتی ساخته
نمی‌شود. آزمونی که خودش «مدل نیست» بگیرد، جانشین را **همان لحظه** می‌نشانَد و منتظرِ
خطای صداسازیِ قسمتِ فردا نمی‌مانَد. جابه‌جایی یک بار در تلگرام می‌آید، با پیوندِ نمونهٔ
جانشین، و یافتهٔ `tts-pin-missing` می‌سازد. دو آزمونِ پیاپیِ دور از مرجع برای خودِ سنجاق
یافتهٔ `tts-pin-drift` است. **هیچ‌کدام خودکار مدلِ زنده را عوض نمی‌کند:** آن تصمیمِ گوشِ
اوست. ناظر از v87 هر روز §۴٫۱۵ را انجام می‌دهد و کلیدِ دهمِ `checks` را می‌نویسد
(`tts-model`).

**ابزاری که سبز بود و چیزی نمی‌سنجید، دو بار:** بیست شکستنِ عمدی با پشتیبانِ همان اجرا.
دو تا سبز ماندند و هر دو یک شکافِ واقعی بودند:
- سدِ «اکتاوِ پایین» روی سیگنالِ تمیز هیچ‌وقت لازم نمی‌شد. سنجهٔ ۱.۷ با صدای
  **خِرخِری** (چرخه‌های یکی‌درمیان، شبیهِ صدای رضوی) ساخته شد، و همان سنجه نشان داد
  مرزِ ۹۰٪ِ نگارشِ اول هم غلط بود: دورهٔ درست حدودِ ۸۵٪ است. مرز ۸۰٪ شد و روی
  فایل‌های واقعی هم عددِ 3.1 را به عددِ پل نزدیک‌تر کرد (۱۲۱ ⇒ ۱۲۳ تا ۱۲۵، پل ۱۲۷).
- آزمونِ سنجاقِ رفته خطای «مدل نیست» را ثبت می‌کرد و کاری با آن نمی‌کرد. بدَلِ
  گفتارساز هر مدلی را می‌خواند، حتی مدلی که در فهرست نبود؛ بدَلی که از تولید آزادتر
  است همین را پنهان می‌کند (۷.۲۴). حالا ۴۰۴ می‌دهد و ۴.۷ می‌نشیند.

**آنچه این نسخه نمی‌کند، صریح:** نشانه‌ها و حالت‌ها را نمی‌سنجد، فقط تندی و زیروبم و
مکث را. تلفظ را هم نمی‌سنجد. اینکه جانشینِ هم‌خوان واقعاً «همان حس» را دارد، فقط گوش
می‌گوید، و برای همین نمونه‌اش ذخیره و فرستاده می‌شود.

## برفکِ «میانِ جمله‌ها» صدا نبود؛ برچسبِ C2PA بود — و مدلِ صوتی هر روز عوض می‌شد (8.38)

او دو نمونهٔ شبِ ۴ اکتبر را شنید و دو چیز گفت: «با اضطراب می‌خواندند … حتی از صبح
بدتر» و «میانِ اکثرِ جمله‌ها یک صدای یک‌ثانیه‌ای شبیهِ برفکِ تلویزیون … چند روز در
برخی پادکست‌ها هم بود». هر دو از **خودِ فایل** درآمد، نه از حدس.

**یک: برفک داده بود، نه صدا.** در فایلِ مبدأ (پیش از RVC) ۱۶ انفجارِ ۰٫۱۲۵ ثانیه‌ای بود
با بلندیِ ~۴− dBFS (۱۷ دسی‌بل بلندتر از گفتار) و طیفِ تخت. بایت‌هایشان خوانده شد:
`C2PA~\x17\0\0…jumb…jumdc2pa…Created by Google Generative AI… SynthID`. یعنی **برچسبِ
اعتبارِ محتوا** که گوگل در صوتِ ساختهٔ هوش مصنوعی می‌گذارد. مدلِ `gemini-3.8-flash-tts`
یک **فایلِ WAVِ کامل** می‌دهد (RIFF → fmt → data → C2PA)، و `extractAudioB64_` از روزِ
اول هر جوابی را PCMِ خام فرض می‌کرد. پس سرآیند یک «تیک» می‌شد و برچسبِ ۶۰۱۴ بایتیِ
آخرِ فایل یک برفک، در انتهای هر تکه، یعنی دقیقاً «میانِ جمله‌ها». مدلِ صبح
(`gemini-3.1-flash-tts-preview`) PCMِ خام می‌دهد و برای همین آن نمونه‌ها پاک بودند.

`ttsPcmB64_` حالا هر جواب را به PCMِ همین موتور برمی‌گرداند. چانک‌به‌چانک پیموده می‌شود،
نه «از بایتِ ۴۴»، چون برچسب می‌تواند پیش یا پس از data بنشیند. نرخ یا کانالِ دیگر
**تبدیل** می‌شود و بی‌صدا چسبانده نمی‌شود. قالبی که نمی‌شود چسباند (۸ بیتی) خطای
نام‌دار می‌دهد و **یک** فراخوان می‌خورد، نه سه. PCMِ خام **عیناً** برمی‌گردد و مسیرِ
سالم هیچ هزینه‌ای ندارد. `PK.TTS_WRAP` می‌گوید کدام مدل بسته می‌دهد. روی یکی از جواب‌های
واقعیِ همان شب، که درونِ فایل چسبیده مانده بود، اجرا شد: ۴۵۹٬۱۸۶ بایت ⇒ ۴۵۳٬۱۲۰ بایت
PCM، بی C2PA، و قله ۱٫۵− به‌جای ۰.

**وابستگیِ رو به جلو عمداً ساخته نشد:** `wavInfo_`ِ بخشِ ۲۳ همین کار را می‌کند، ولی
۰۳ ⇒ ۲۳ یعنی هر بارکنندهٔ جزئی در `tests/` با ReferenceError می‌شکند. پس پیمایشِ کوچکِ
خودش را دارد.

**دو: مدلِ صوتی هر صبح عوض می‌شد.** از ۲۷ سپتامبر هیچ مدلی دستورِ لحن را نپذیرفت، و
`ttsCueSwitch_` (۷٫۴۷) هر روز ساعتِ ۱۰ سراغِ مدلِ بعدی رفت: ۳ اکتبر 2.5-pro، صبحِ ۴
اکتبر 3.1-flash، ظهرِ ۴ اکتبر 3.8-flash. هیچ تعویضی لحن را برنگرداند (لحن از ۸٫۰۸ از
نشانه‌ها می‌آید)، و هر تعویض صدای خواندن را عوض کرد. همان متنِ آزمون با 3.1-flash
۳۰۱ ثانیه بود و با 3.8-flash ۲۶۲ تا ۲۶۸ ثانیه، یعنی ۱۲٪ تندتر: همان «اضطراب».
**صافی‌ای که برای برگرداندنِ لحن ساخته شده بود، فقط صدا را هر روز عوض کرد.**

`CFG.TTS_MODEL_PIN` مدلی است که گوشِ او پسندید. هم در ساختنِ کش مقدم است و هم در
`ttsModel_`، چون کشِ پیش از ۸.۳۸ تا هفت روز مدلِ دیروز را نگه می‌دارد. `ttsCueSwitch_`
آن را عوض نمی‌کند و «نیاز» هم گزارش نمی‌کند، وگرنه ایمیلِ سلامت هر روز برای تصمیمِ خودِ
او «ایراد» می‌گفت. سنجاقی که در فهرستِ حساب نیست رها می‌شود و **گفته** می‌شود
(`pinMissing`)، چون مدلِ بازنشسته‌ای که سنجاق بماند یعنی هیچ قسمتی ساخته نشود.
`ttsAvail` فهرستِ کامل را **پیش از** صافیِ لحن نگه می‌دارد، چون همان صافی سنجاق را از
`ttsAll` بیرون می‌اندازد. سازوکارِ ۷٫۴۷ برای روزِ بی‌سنجاق دست نخورد و §۸ِ
`run_v2_tests.js` آن را با سنجاقِ خالی می‌سنجد.

**آنچه این نسخه نمی‌کند، صریح:** قسمت‌هایی که این چند روز با 3.8-flash یا هر مدلِ
WAV‌دهنده ساخته و منتشر شده‌اند، همان برفک را دارند و عوض نمی‌شوند. و اینکه 3.1-flash
روی متنِ قسمت‌ها هم همان «طمأنینه» را دارد، فقط با گوش معلوم می‌شود.

**سنجش:** شانزده شکستنِ عمدی با پشتیبانِ همان اجرا، و هر شانزده روی سنجهٔ خودشان
نشستند. یکی از آن‌ها نشان داد که بازپرتابِ خطای قالب در `extractAudioB64_` میان‌بُر
نیست: بی آن، خطا بلعیده می‌شود، جست‌وجوی عمقی چیزی پیدا نمی‌کند و شش فراخوان خرج
می‌شود.

**قاعده:** وقتی صدایی «شبیهِ نویز» شنیده می‌شود، پیش از فیلتر و پیش از حدس **بایت‌هایش**
را بخوان. نویزِ واقعی کورتوزیسِ ~۳ دارد؛ این‌جا نیمی از بایت‌ها حروفِ ASCII بودند.

## «صدا و حجمش پایینه»: عددش از ۲۲ سپتامبر در سیاهه بود (8.37)

او گلدوز را با ضبط‌های دیگرِ خودِ گلدوز مقایسه کرد و گفت «خیلی صدا و حجمش پایینه».
دو علت پیدا شد. هیچ‌کدام از گوش یا حدس نیامد؛ هر دو از داده‌ای آمدند که از قبل بود.

**یک: زیروبم.** کارتِ سبکِ ۲۲ سپتامبر (اجرای ۳۵۶۹۰۷۹۱۱۵۵ِ `voice-intake`) دو حالتِ او
را روی ۵۲۵۰ ثانیه از ضبط‌های خودش سنجیده بود: میانهٔ **۱۵۴٫۹ و ۱۶۲٫۵ هرتز**. نمونه‌ها با
گامِ ثابتِ −۲ درآمدند **۱۰۱ هرتز (۳ اکتبر) و ۱۱۴ (۴ اکتبر)**، یعنی ۵ تا ۷ نیم‌پرده بم‌تر از
خودِ او. و هر روز عددی دیگر، چون صدای مبدأ با مدلِ صوتی عوض می‌شد. این همان درسِ ۸.۲۴ برای
رضوی است. ۸.۲۴ نوشته بود «گلدوز عمداً دست نخورد، چون زیروبمِ واقعی‌اش هنوز به عدد ثبت
نشده»، و ثبت شده بود، در سیاههٔ همان اجرا. `stylecard.py` آن را حساب می‌کرد و
`STYLE-sheet.json` نگهش نمی‌داشت. باز هم «تحلیلی که به هیچ تصمیمی وصل نشد».

حالا `VOICE_TARGET_HZ['spk-1g0r95d'] = '158'` (وزن‌دارِ دو حالت). و برای گویندهٔ بعدی:
آزمایشگاه عدد را روی برگه می‌گذارد، `voiceintake.py --style` آن را در `docs/voices.json`
(`style.medianHz`) نگه می‌دارد، و `vbrAsk_` وقتی CFG چیزی نگفته، هدف را از همان‌جا
برمی‌دارد (`vbrStyleHz_`). دستِ او در ردیف هنوز برنده است (۷.۸۱). عددِ پرت (بیرونِ ۶۰ تا
۳۵۰) هدف نمی‌سازد.

آزمایشگاهِ ۷.۸۵ با عددِ شباهت −۲ را برده بود. ۷.۷۰ نشان داده بود که آن عدد هدف را
نمی‌سنجد. این‌جا گوشِ او و ضبط‌های خودش یک چیز می‌گویند، و نمونهٔ تازه `f0Out` را کنارِ
۱۵۸ در کپشن می‌گذارد تا داوری عدد داشته باشد.

**دو: بلندی.** مبدأ پیش از تبدیل به −۱۸ LUFS می‌رسید و خروجیِ RVC هرچه بود همان نوشته
می‌شد. **هیچ مرحله‌ای بلندیِ خروجی را نمی‌سنجید یا تعیین نمی‌کرد**، پس هیچ عددی هم برای
«پایینه» نبود. `loudFix` در `voicebridge.py` حالا خروجی را **پیش از بُرش** با یک گینِ ثابت
به −۱۶ LUFS می‌رساند: ثابت، نه پویا (۸.۲۷). قله‌ای که از سقف بگذرد فقط همان قله محدود
می‌شود، و عددِ پیش و پس در نقشه (`loud`)، ردیفِ صف و کپشنِ تلگرام می‌آید. این بخش از
`main`ِ ریپو اجرا می‌شود، پس بی نصبِ موتور از اجرای بعدیِ پل اثر دارد.

**دو تلهٔ سنجش که فقط اجرا نشانشان داد:**
- سیگنالِ آزمونِ اولم پالس‌های مربعیِ پهن داشت که **خودشان** بیشترِ بلندی را می‌ساختند
  (بی آن‌ها ۳۷−، با آن‌ها ۲۷−). محدودکردنشان بلندی را ۸ دسی‌بل پایین آورد و شبیهِ خرابیِ
  ffmpeg بود. عیب در بدَل بود، نه در فیلتر.
- با سقفِ نمونهٔ برابر با سقف، قلهٔ واقعی ۰٫۸− درآمد، نه ۱٫۵−، چون قلهٔ میانِ دو نمونه
  بالاتر است. سقفِ نمونه یک دسی‌بل پایین‌تر رفت.

**آنچه این نسخه نمی‌کند، صریح:** مدلِ گلدوز هنوز روی ۲۷ فایلِ ۱۱ کیلوهرتزی است. ۳۰
فایلِ تازه (۲۲ کیلوهرتز، ~۸۸۰ دقیقه) شفافیتِ بالای ۵٫۵ کیلوهرتز را می‌آورند، نه بلندی را.
بازآموزی چند روز رانر است و مدلِ فعلی را عوض می‌کند، پس تصمیمش با صاحبِ برنامه است.
`vintQueue_` هم گویندهٔ «آماده» را با دادهٔ تازه دوباره به صف نمی‌فرستد؛ این شکاف باز است.

## «هر ۱۵ درس یک مرور»، ولومی که حالت نیست، و سقفی که بیست‌وپنج نویسه مانده بود (8.36)

**یک: مرور دوره‌ای شد، با عددِ هر مجموعه.** او خواست «هر ۱۵ درس یک مرورِ خودکار … و
این ۱۵ تا هاردکد نباشه بلکه در تنظیماتِ مجموعه به‌صورتِ پیش‌فرض انتخاب بشه … برای
درس‌هایی که ۱۵ تا هم نشن چی؟». تا ۸.۳۵ مرور «یک بار برای هر مجموعه» بود با کفِ ثابتِ
هشت. حالا ستونِ «مرورِ هر چند درس» (`SC.RECAP_EVERY`، **در انتها**) و جعبه‌اش روی
خانهٔ مرورِ همان مجموعه در تخته است. خانهٔ خالی یعنی `CFG.RECAP_EVERY` (۱۵)، پس
عوض‌شدنِ پیش‌فرض همهٔ مجموعه‌های دست‌نخورده را با هم عوض می‌کند و دستِ آدم را نه.
مجموعهٔ **تمام‌شده** با باقی‌ماندهٔ ≥ `RECAP_TAIL_MIN` (۳) یک مرورِ پایانی می‌گیرد.

**«خودکار» یک تعریف دارد:** `recapPeriodicDue_`. کارِ شبانه، دکمهٔ منو، درِ بی‌کلیدِ
`runRecapEpisode({})` و خانهٔ تخته همه از آن (یا از همان `recapBoardMap_`) می‌خوانند.
`recapCandidates_` بی‌کلید هم همان را برمی‌گرداند. دو تعریف یعنی روزی تخته یکی را
بگوید و شب دیگری را بکند.

**«حتماً تغییرات اعمال بشه»** از درِ تولید سنجیده می‌شود (§۲۷ِ `run_recap_test.js`):
تخته رندر و اسکریپتش اجرا می‌شود، جعبه عوض می‌شود، همان فراخوانِ `uiRecapEverySave`
اجرا می‌شود، و بعد `recapPeriodicDue_` و `recapNightly_` واقعی پرسیده می‌شوند. رسیدِ
ذخیره هم از **رجیستریِ تازه‌خوانده** می‌گوید بعدی کِی است. نگارشِ اولش از ردیفِ پیش از
نوشتن می‌خواند و «هر ۲۰» را «نوبتش رسیده» گزارش می‌کرد (R14 همین را نشان داد).

**و یک باگِ همسایه که همین کار پیدایش کرد:** `runRecapEpisode` با `force` پروندهٔ «تا
کجا» را **پیش از موفقیت** پاک می‌کرد (`recapReopen_`). سفارشی که بعد «جزوه ندارد»
می‌گرفت، مجموعه را «هرگز مرور نگرفته» می‌کرد و مرورِ بعدی دوباره از درسِ یک بود.
`recapReopen_` رفت. درِ بازگشت همان تیکِ تخته است: با کلید، قفل نادیده گرفته می‌شود و
`recapMarkDone_` در پایان بازنویسی می‌کند.

**شکست شمرده می‌شود و تا درسِ تازه «رهاشده» است** (`RECAP_AUTO_FAIL`، ۵.۸۸)؛ شکستِ
ارزان (بی‌جزوه) نوبت را به بعدی می‌دهد و شکستِ گران (مدل) همان‌جا می‌ایستد. سطرِ روزانه
«بعدی کِی» را از شاهدِ `RECAP_AUTO_LAST` می‌خوانَد، نه از هاب، چون `recapStatus_` در
`writeStatus_` است (۷.۶۳/۷.۷۲؛ §۲۷.۱۰ تعدادِ `getHub_` را می‌شمارد). کارنامهٔ قابلیت
حالا `due: 'due'` دارد: صفِ تیک **به‌علاوهٔ** مرورِ خودکاری که نوبت داشت و نشد.

**دو: «یهو صدا کم شد و بعد زیاد شد».** او در هر دو نمونه، حدودِ ۳:۴۰، همین را شنید:
«نجوا» −۱۱ و «بلند» +۶ دسی‌بل، از راهِ `speakMoodDsp_`ِ ۸.۲۷ وقتی دستورِ لحن نمی‌رسید.
ولومِ پایین «آهسته حرف زدن» نیست؛ کم‌شدنِ صدای ضبط است. حالا **هیچ** حالتی بلندی را عوض
نمی‌کند (محدودکنندهٔ نرم هم رفت، چون بی بلندکردن تنها کارش فشردنِ قله‌های خودِ گوینده
بود). حال سه راه دارد: دستورِ لحن، سرعت با WSOLA، و همیشه **نشانهٔ پایانِ جمله**
(`mark`): «…» برای آرام/نجوا/کشیده و «!» برای بلند/کمی‌بلند/سنگین. `speakSpanMark_`
فقط «.»ی را عوض می‌کند که پیش از فاصله یا پایان است و پس از «.» نیست: «۳.۵» و «...»ِ
متن و «؟»/«!»ِ خودِ متن دست نمی‌خورند و شمارِ جمله‌ها همان می‌مانَد. «بلند» بی دستور
حالا «فقط با نشانه» برچسب می‌گیرد، نه «اجرا نشد». بذرِ نمونه‌ها `tag` تازه گرفت تا
نمونهٔ نو ساخته شود (۷.۸۶).

**سه: engine.gs بیست‌وپنج نویسه زیرِ سقف بود.** `engineTextProblems_` فایلِ بالای
۳٬۰۰۰٬۰۰۰ نویسه را «نامعقول» می‌شمرد، و با کارِ همین نسخه engine.gs به ۲٬۹۹۹٬۹۷۵ رسید.
نسخهٔ بعد بی هیچ عیبی نصب نمی‌شد، و **شکلِ پشتیبانش** (چند نویسه سرصفحه) همین حالا رد
می‌شد. یعنی «بازگشت به نسخهٔ پشتیبان» دقیقاً روزی که لازم است کار نمی‌کرد. این را
خواندنِ کد پیدا نکرد: `run_menu_test.js` ۳.۳ سرخ شد. سقف حالا `CFG.ENGINE_MAX_CHARS`
(۶ میلیون) است و `tools/build.js` در ۹۰٪ آن **می‌ایستد**. سرصفحهٔ `build_header.txt`،
که چهار هزار نویسه پیشینهٔ ۵٫۱۰ تا ۵٫۱۲ بود، کوتاه شد. جای آن پیشینه README است.
⚠ **تا ۸.۳۶ نصب نشده، هر نسخه‌ای باید زیرِ ۳٬۰۰۰٬۰۰۰ بمانَد**؛ ۸.۳۵ِ در حالِ اجرا
سقفِ قدیم را دارد. این نسخه ۲٬۹۹۴٬۵۷۰ است.

**سنجش:** بیست‌وهشت شکستنِ عمدی، با پشتیبانِ همان اجرا.
- بیست‌وچهار روی سنجهٔ خودشان نشستند.
- R2 (پیش‌فرضِ هاردکد) روی ۱.۱ نشست، که همان ادعا را زودتر می‌سنجد.
- چهار در دورِ اول سبز ماندند و هر چهار یک سنجهٔ نبوده را لو دادند. همه حالا می‌نشینند:
  - سدِ رقمِ `speakSpanMark_` کاری نمی‌کرد، چون نگاه‌به‌جلو از قبل «۳.۵» را نگه
    می‌داشت. به «...» تبدیل شد و سنجه گرفت.
  - درِ بی‌کلیدِ `runRecapEpisode({})` هیچ آزمونی برای مجموعهٔ مرورشده نداشت (۲۷.۶-ث).
  - «بعدی» می‌توانست مجموعهٔ نوبت‌دار را «پس از −۱ درس» بگوید (۲۷.۸-پ).
  - جملهٔ مجموعهٔ هرگز-مرورنشده «پس از مرورِ قبلی» می‌گفت (۲۷.۷-ب).

**آنچه هیچ سنجه‌ای ثابت نمی‌کند:** اینکه گفتارساز «…» را آرام‌تر و «!» را پرشورتر
می‌خوانَد. این را فقط گوش جواب می‌دهد. و اینکه سقفِ ۶ میلیون برای Apps Script مشکلی
ندارد: این سدِ خودِ ماست، نه حدِ مستندِ گوگل.

## سه ویدئوی گیرکرده: نه نشتی، یک کلیدِ ناهم‌شکل — و خطی که علت را حدس می‌زد (8.35)

او گفت «اون سه ویدیو گیر کرده رو درست کن». ناظر ۲۶ سپتامبر هم همین سه را دیده بود و نتوانسته بود نامشان
را پیدا کند. خطِ روزانه هر روز می‌گفت «یعنی در کپشنشان چیزی از جنسِ خصوصی پیدا شده»، و همه به دنبالِ نشتی
رفتند.

**علت نشتی نبود.** `ytPublished_` از ۶ سپتامبر کلیدها را با `ytShowKey_` یک‌دست می‌کند («special:59»)، و
`ytRedoOne_` با **نامِ نمایشی** می‌گشت («درس‌نامه:59»). پس پیدا نمی‌کرد و جوابش همیشه «این قسمت هنوز منتشر
نشده» بود: هم برای بازسنجیِ شبانهٔ ۷.۱۴ و هم برای دکمهٔ منو. شاهدِ شبانه می‌نوشت «۳ سنجیده شد — ۰ عمومی شد،
۰ هنوز نشتی دارد». آن «۰ نشتی» هم با جست‌وجوی واژهٔ «نشتی» شمرده می‌شد، که در پیامِ خودِ تابع نیست، یعنی
همیشه صفر بود. **دو شاهد که هر دو سالم به نظر می‌رسیدند، و هیچ‌کدام چیزی نمی‌دید.**

**چرا هیچ سنجه‌ای نیفتاد:** پنج سنجهٔ این تابع (۱۸.۱ تا ۱۸.۵) متنِ کد را می‌خواندند («آیا `Videos.update`
در بدنه هست؟») و دو سنجهٔ رفتاری‌اش (۱۸.۶ و ۱۸.۷) فقط شاخهٔ «منتشر نشده» را می‌پرسیدند. **مسیرِ موفقیت یک
بار هم اجرا نشده بود.** §۷۴ ردیف را با `ytLog_`ِ خودِ موتور می‌نویسد، با نامِ نمایشی، همان‌طور که در تولید،
و از درِ بازسنجیِ شبانه وارد می‌شود.

**و مرزی که در همین تعمیر پیدا شد:** ویدئوی گیرکرده هنوز متنِ **قدیمش** را دارد. اگر به‌روزرسانیِ متن نشود
(سهمیه، خطای API) و ما عمومی‌اش کنیم، دقیقاً همان متن عمومی می‌شود که برایش نگه داشته شده بود. حالا عمومی‌شدن
فقط پس از نشستنِ متنِ تازه است. علتِ هر ویدئوی هنوز-گیرکرده هم **به نام** در `_STATUS.json`
(`youtube.stuckWhy`) و خطِ روزانه می‌آید، به‌جای جمله‌ای که علت را حدس می‌زد.

**«مرورِ بزرگ» خراب نبود؛ هشدارش خراب بود.** مرور یک بار برای هر مجموعه ساخته می‌شود و هر دو مجموعه مرورشان
را گرفته‌اند (Audi در درسِ ۳۴). کارنامهٔ قابلیت‌ها همان آستانهٔ هفت‌روزه را رویش می‌زد و ۲۵ روز «روشن ولی
بی‌اثر» می‌گفت: هشداری برای حالتِ سالم، که صاحبِ برنامه از آن درست نتیجه گرفت که «خراب است». ردیفِ
کارنامه حالا `due` دارد: صفِ خالی یعنی «کاری نرسیده» و سالم است، و فقط کارِ رسیده‌ای که انجام نشده «بی‌اثر» است.

**قاعده:** جمله‌ای که در خطِ روزانه علت را **می‌گوید**، باید آن را از جایی خوانده باشد. «یعنی …» بی ورودی همان
ادعای بی‌ورودیِ ۷٫۷۹ است، و این یکی دو هفته ناظر و صاحبِ برنامه را سرِ راهِ غلط فرستاد.

## «مدل کم داد یا جوابش بریده شد؟» — بریده شد، و همان دورِ انتشار را کشت (8.34)

۸.۲۹ این پرسش را باز گذاشت: نقشهٔ تصویرِ درس نحیف (۱ از ۱۵) درمی‌آمد و معلوم نبود چرا. جوابش در
**سیاههٔ خودِ موتور** بود، در `_STATUS.json` → `recentLog`، نه در جایی که از این‌جا دیده نمی‌شود.
۴ اکتبر، دورِ انتشارِ ۰۸:۵۷، شش فراخوانِ تصویرِ درسِ ۶۰ به‌ترتیب رفتند: متنِ یوتیوب، پرسشِ دوباره، و
پرسش‌های بخش‌به‌بخش. **هر شش ۸۸ تا ۱۴۵ هزار نویسه «جواب» دادند**، همه با `Unterminated string`، یعنی
رشته‌ای که هرگز بسته نشد و مدل تا سقف ادامه داد. هر کدام نزدیکِ یک دقیقه خورد، و `ytPublishTick` در
دقیقهٔ ششم کشته شد. همان سطرِ قرمزی که او ۱ اکتبر شانسی دید.

**سه لایه، هر سه درست شد:**
- **سقفی که به‌خاطرسپردن بالایش می‌بُرد.** `geminiText_` کفِ توکنی را که یک بار برای مدل لازم شده بود
  روی هر فراخوانِ ≥۴۰۹۶ می‌گذاشت. سقفِ ۱۶۳۸۴ِ متنِ یوتیوب عملاً بیشتر بود، و جوابِ افسارگسیخته فقط
  دقیقه‌های بیشتر می‌خورد. `opt.exact` حالا سقفی را که فراخوانَنده **عمداً** گذاشته دست‌نخورده نگه
  می‌دارد. پرسشِ تصویر ۸۱۹۲ و پرسشِ یک بخش ۶۱۴۴ گرفت؛ نقشهٔ درست چند هزار توکن است.
- **پرسشی که مهلتِ دور را نمی‌پرسید.** دورِ انتشار ۱۵۰ ثانیه بودجه دارد (`_ytRunDeadline`)، ولی
  پرسش‌های تصویر هیچ‌کدام آن را نمی‌خواندند. حالا `ytVisTimeOk_` پیش از **هر** پرسش سنجیده می‌شود.
  بخشی که وقتش نرسید «پرسیده‌شده» ثبت نمی‌شود و تلاشی هم شمرده نمی‌شود، تا دورِ بعد بپرسدش.
- **کارت‌هایی که در حالتِ صحنه ساخته نمی‌شوند.** ۸.۳۱ پرسشِ دوبارهٔ کارت‌ها را برای نقشهٔ
  **ذخیره‌شده** بست و نقشهٔ **تازه** را جا انداخت. یعنی از امشب هم هر درس همان دو تا هشت فراخوان را برای
  کارت‌هایی می‌کرد که صحنه‌ها جایشان را می‌گیرند. حالا `ytUploadOne_` حالتِ صحنه را **پیش از** نقشه
  از تخته می‌خوانَد و می‌دهد. پرکردنِ کارت از روایت (بی مدل) می‌مانَد، برای روزی که صحنه به کارت بیفتد.

و دستورِ یافتهٔ `run-died` فقط می‌گفت «Executions را باز کنید»: صفحه‌ای که نه ناظر به آن می‌رسد نه
این سشن. حالا اول سیاههٔ همان دقیقه‌ها را نام می‌برد.

**آنچه این نسخه نمی‌کند، صریح:** **چرا** مدل رشته را نمی‌بندد ثابت نشده. احتمالاً همان دامِ شناخته‌شدهٔ
خروجیِ ساختاریافته روی فیلدهای اختیاریِ خالی است، ولی متنِ خامِ آن جواب‌ها هیچ‌جا ذخیره نشده. این نسخه
هزینه‌اش را از «کشتنِ دور» به «چند ثانیه و یک نقشهٔ پرشده از روایت» پایین می‌آورد، نه بیشتر.

**قاعده:** وقتی علت «نامعلوم» ثبت شده، پیش از ساختنِ شاهدِ تازه سیاهه‌ای را بخوان که از قبل هست.
۸.۲۹ شاهدِ تازه ساخت (`vis` در ردیفِ عمومی)، و جواب همان روز در `recentLog` بود.

## پنج جا که موتور گناهِ خودش را به گردنِ دیگری انداخت — یا کاری را «انجام‌شده» نوشت که هرگز نشد (8.33)

پرسشِ او این بود: «از این به بعد بدونِ نیاز به ارسالِ ایمیل می‌تواند همه را ببیند، اصلاح کند و پیگیر باشد؟»
۸.۳۲ حافظهٔ ایرادها را ساخت. ۸.۳۳ قدیمی‌ترین ایرادهای مزمن را **از دادهٔ واقعی** برداشت — و هر پنج‌تا
یک شکل داشتند: علت در خودِ موتور بود، و گزارش یا دیگری را مقصر می‌دانست، یا «تمام شد» می‌گفت.

**یک: «کیفیتِ استخراج — خالی ۱۰۰٪» تقصیرِ تحلیلگرها نبود.** `sqSampleRows_` نقشهٔ ستون‌ها را با
`srcMap_(hdrSet_(head))` می‌ساخت. `srcMap_` **ردیفِ سرستون** را می‌خواهد و `hdrSet_` شیء می‌دهد،
پس همهٔ ستون‌ها −۱ می‌شدند. −۱ در جاوااسکریپت راست است و از `if (c)` رد می‌شد، و `vals[r][-2]` هر
خانه را خالی می‌خواند. زیرِ آن هم یک لایهٔ دیگر بود: `findAny_` شمارهٔ **صفرپایه** می‌دهد و این کد `c - 1`
می‌خواند. داور هم `JSON.parse` را روی شیءِ از پیش پارس‌شده صدا می‌زد، پس همیشه «بی‌داوری» برمی‌گشت. نتیجه
هفته‌ها یافتهٔ «جدی» بود برای تحلیلگرهایی که کارشان درست بود. **این دام را ۷٫۲۵ در همین پرونده نوشته بود**
(«passing `hdrSet_`'s boolean map silently resolves every column to −1»). این تابع پیش از آن نوشته شده
بود و کسی برنگشت تا نگاهش کند. `answers['8.33']` یافته‌های `sq-empty-*` را می‌بندد، چون علتشان این نسخه بود.

**دو: خودآزمونِ اثرِ انگشت یک بار هم اجرا نشده بود.** در دورانِ پس‌پرکردن، ساخت کلِ بودجهٔ بلوک را
می‌خورد و این دنباله هر شب جا نمی‌شد. حالا خودآزمون **اجرای جدای خودش** را می‌گیرد (`embSelfTestLater`،
یک‌باره، الگوی ۷٫۸۴)، روزی یک بار. **و زیرش یک پاک‌کن بود:** مُهرِ شبانه، که از ۷٫۶۴ «پیش از کار» زده
می‌شود، `self: null` می‌نوشت. یعنی هر شب شاهدِ خودآزمونِ دیروز را پاک می‌کرد، `_STATUS.json` باز «تهی»
می‌گفت، و سدِ «امروز تازه دارد» هرگز چیزی برای دیدن نداشت. این پاک‌کن را خواندنِ کد پیدا نکرد. شکستنِ عمدیِ
سدِ تازگی سبز ماند، چون سدِ دوم («امروز زمان‌بندی شد») رویش را پوشانده بود. سنجه دوتکه شد، و تکهٔ اولش
همان پاک‌کن را نشان داد. **شاهدی که مُهرِ بعدی پاکش کند، شاهد نیست.**

**سه: مدلِ تصویر فقط با قیمت انتخاب می‌شد.** مدل‌های متن و صدا هر هفته از نو انتخاب و هر شب داوری
می‌شوند، ولی مدلِ تصویر داوری نداشت. حالا نمرهٔ داورِ صحنه به حسابِ **همان مدلِ سازنده** نوشته می‌شود
(`lvGenScoreAdd_`). مدلی که دست‌کم در ۲۰ تصویر میانگینِ زیرِ ۵٫۵ یا بیش از ۴۰٪ تصویرِ ضعیف یا نوشته‌دار
داشته باشد، کنار می‌رود. «نسنجیده» رد نیست (۷٫۴۰). اگر همهٔ مدل‌ها بد باشند، ارزان‌ترین می‌مانَد و همین
گفته می‌شود، چون بی مدل هیچ تصویری ساخته نمی‌شود (همان شکلِ `ttsCueSwitch_`). عوض‌شدنِ مدل هم خبرش
در ایمیل می‌آید. ۷۲.۳-ب جدا می‌سنجد که مدلی با **نمرهٔ خوب ولی نوشته در تصویر** هم رد می‌شود، چون نوشتهٔ
ساختگی روی صفحه با هر نمره‌ای عیب است.

**چهار: موسیقی وسطِ فایل شنیده می‌شد و از جای دیگرش پخش می‌شد.** داوریِ بانک هشت ثانیه از **وسطِ**
فایل را می‌شنود. ولی آغاز، پایان و پلِ هر قسمت از ثانیه‌ای پخش می‌شوند که نقشه انتخاب کرده. پس قطعه‌ای
که وسطش آهنگ است و سرش صدای خیابان، از داوری رد می‌شد. حالا `musicSegOk_` هنگامِ ساختِ نقشه **همان
بازهٔ پخش** را می‌شنود: آغاز و پایان «آهنگ» می‌خواهند و پل «آهنگ» یا «زمینه». لبه‌ای که شنیده نشود اول
یک جانشینِ شنیده‌شده می‌گیرد، و اگر آن هم نشد بی‌موسیقی می‌ماند. **نشنیدن یعنی نه** (۷٫۶۸). قطعه‌ای که
آدم برایش یادداشت نوشته، شنیده نمی‌شود و پخش می‌شود.
**و نگارشِ اولش خودش یک «نشنیده» داشت، از درِ ازسرگیری.** نتیجهٔ شنیدن در نقشه ذخیره شد، ولی «قفلِ
دوم» (که نقشه را از روی انتخاب‌های نهایی **بازنویسی** می‌کند) آن را پاک می‌کرد. پس در ازسرگیری، پلِ ردشده از
راهِ پرکردنِ کف برمی‌گشت و آغازِ «حذف‌شده» یک قطعهٔ **نشنیده** می‌گرفت، و تکه‌ها هم یک خانه می‌لغزیدند.
§۲۲.۲ این را از درِ خودِ `musicWrap_` گرفت. **قاعده: وقتی فیلدی به یک کَش اضافه می‌کنی، هر نویسندهٔ آن
کَش را پیدا کن، نه فقط نویسنده‌ای که خودت نوشتی.**

**پنج: دو علتِ ۱۲٪ اعراب، از دادهٔ واقعی.**
- **قاعدهٔ همزهٔ اضافه.** تا ۸.۳۲، متنِ خامی که **جایی** «ٔ» داشت، سخت‌گیری را **همه‌جا** کامل
  می‌کرد. خودِ موتور هم با پیش‌درآمدِ غنی‌سازی («یک نکتهٔ تکمیلی…») چنین «ٔ»ای می‌گذارد. پس در هر بخشِ
  غنی‌شده، هر «هٔ»ِ درستِ اعراب‌گذار، مثلِ «ابلاغیهٔ الکترونیکی»، حرفِ اضافه شمرده می‌شد. روی دادهٔ قسمتِ ۶۲
  دو بخش با ۳۱٪ و ۱۷٪ واژهٔ بی‌علامت بودند که هر دو با همین قاعده رد می‌شدند، و پس از اصلاح هیچ‌کدام نماند.
  حالا **افزودنِ** همزهٔ اضافه آزاد است و **انداختنِ** همزه‌ای که نویسنده گذاشته بود هنوز رد می‌شود.
- **مدارشکن «رد شد» را «در دسترس نیست» می‌خواند.** قسمتِ ۶۱ تماماً بی‌اعراب رفت، چون سه بخشِ اولش ردِ
  **نزدیک** خوردند. حالا مدارشکن فقط این سه حالت را «در دسترس نیست» می‌شمارد: جواب نیامده، جواب بی‌ربط بوده
  (کمتر از ۶۰٪ همان واژه‌ها)، یا جواب هیچ اعرابی نداشته. ردِ نزدیک در `__speakRejects` جدا شمرده می‌شود.

**آنچه این نسخه نمی‌کند، صریح:** اعرابِ پیشنهادیِ تسکِ غنی‌سازی (`__ctashkil`) ساختاراً کم می‌نشیند، چون
موتور پس از آن پیش‌درآمد و بخشِ عصری‌سازی اضافه می‌کند و متن دیگر همان متن نیست. این باز است. ۱۲٪ هم
لزوماً صفر نمی‌شود: بخشی از ردها درست‌اند، مثلِ نیم‌فاصله‌ای که «توجیه‌است» را به یک واژه چسباند.

**سنجش:** شکستنِ عمدی چهل‌ودو بار، با پشتیبانِ همان اجرا. هر کدام روی سنجهٔ خودش نشست، جز سه مورد که
ثبت شده‌اند و ادعا نمی‌شوند:
- شنیدنِ دوباره در ازسرگیری، در مجموعهٔ موسیقی روی ۱۲.۳ نشست و ثابت‌شدنش از ۴.۳-بِ oneshot می‌آید.
- پاک‌کردنِ `introNone` از قفل روی ۲۲.۳ نشست، که همان ادعا را زودتر می‌سنجد.
- سهل‌گرفتنِ کاملِ همزه روی ۳ب.۲ِ قدیمی نشست.
پنج شکستن در دورِ اول سبز ماندند و یکی مجموعه را پیش از هر سنجه‌ای کرش داد. هر شش یک سنجهٔ توخالی را لو
دادند و هر شش حالا می‌نشینند:
- وسطِ فایلِ آزمونِ ۲۲.۵ خودش ثانیهٔ ۵ بود، پس رفتارِ قدیم («از وسط») هم همان عدد را می‌داد.
- ستونِ نداشته (−۱) در ۸.۱ دیده نمی‌شد.
- در ۲۰.۳-ث دو سدِ خودآزمون یکدیگر را می‌پوشاندند، و جداکردنشان همان پاک‌کنِ بالا را نشان داد.
- در ۷۲.۳ مدلِ بد نمرهٔ پایین هم داشت، پس «نوشته در تصویر» جدا سنجیده نمی‌شد.
- ذخیرهٔ نقشهٔ قسمتِ بی‌قطعه هیچ آزمونی نداشت.
- و کرش: متنِ جزئیاتِ ۸.۱ پیش از خودِ سنجه می‌شکست، پس شکستنِ درست «کرش» گزارش می‌شد نه «سرخ».

## «اگر ایمیل‌ها را نمی‌فرستادم، می‌فهمیدی؟» — جوابِ راست «نه» بود (8.32)

۴ اکتبر صاحبِ برنامه چهار ایمیلِ ۲ و ۳ اکتبر را فرستاد و پرسید: «ببین اگر برات
ایمیل‌ها را نمی‌فرستادم متوجهِ اشتباهاتِ اتوماسیون می‌شدی و اصلاحات انجام می‌شد؟
اگر نه توضیح بده چرا و درستش کن». جواب «نه» بود، و علتش **در همان ایمیل‌ها** بود:

- ایمیلِ ۱۰ صبح هر روز **همان** ایرادها را نوشت — اعراب ۱۲٪ (سقف ۸)، ۷۱ موسیقیِ
  نشنیده، سه ویدئوی Unlisted، کیفیتِ استخراج «خالی ۱۰۰٪» — و ناظر هر روز نوشت
  «کدی نساخته شد (یافتهٔ تازه‌ای نبود)». **هر دو درست می‌گفتند و همین عیب بود:**
  ایمیل فهرستِ امروز است بی حافظه، و ناظر «تازه» می‌جوید. ایرادی که دیروز هم بود از
  هر دو صافی رد می‌شد. **ایرادی که دیروز هم بود تازه نیست — بدتر است.**
- پنج وارسیِ «باز کن و ببین» سه روزِ پیاپی «نشد» خوردند و `monChecksStatus_` نوشت
  «هر ۹ وارسی گزارش شده». هیچ ویدئویی تماشا نشد — و درسِ ۵۹ بی هیچ هشداری عمومی شد.

**`healthChronic_`** حافظهٔ فهرست است: امضای هر سطر (بی رقم و تاریخ، چون «۷۱» فردا
«۷۳» است و مقایسهٔ متن یعنی هیچ ایرادی هرگز «همان» نیست) با روزهای پیاپی‌اش در
Script Properties. دو روز ⇒ بالای ایمیل و `health.chronic`؛ سه روز ⇒ یافتهٔ کد
(`chronic-<hash>`) در صفی که نسخهٔ بعد از آن ساخته می‌شود. «⟨شما⟩» بیرون است؛ یک روز
غیبت زنجیره را نمی‌بُرد (`skipped` یعنی «سنجیده نشد»)، دو روز می‌بُرد؛ دو اجرا در یک
روز یک روز است. **و `Session.getScriptTimeZone()` را سنجهٔ ۱۸.۳ گرفت:** بدَل `Session`
ندارد و بقیهٔ موتور `CFG.TIMEZONE` می‌خوانَد — تابع در `catch` خودش می‌افتاد و هر روز
«سنجیده نشد» می‌گفت.

**«نشد» زنجیره دارد** (`skipDays`، روز شمرده می‌شود نه گزارش): دو روزِ پیاپی ⇒ `ok`
پایین، علتِ خودِ ناظر در سطر، و یافتهٔ «جدی»ِ `monitor-check-skipped` با مسئولِ کد.

**و ریشهٔ یکی از مزمن‌ها، در موتور:** `musicListen_` با `maxOutputTokens: 48` می‌پرسید.
مدلِ فکرکننده همان ۴۸ را صرفِ فکر کرد و هر شب «جوابِ خام «»» آمد؛ پس از چهار «تلاش»،
قطعه برای همیشه از صفِ شبانه بیرون رفت، و خطِ روزانه نوشت «از منو بازبینیِ بانک را
بزنید» — کاری که موتور خودش هر شب می‌کند حواله شد به کسی که منو نمی‌زند. `ttsCueLeaked_`
(۲۵۶) همان دام را داشت: نگهبانی که هرگز نمی‌شنید. **`geminiShort_` تنها تعریفِ فراخوانِ
کوتاه است** (سقف ≥ ۱۰۲۴، بودجهٔ فکرِ جدا، ردِ `thinkingConfig` به خاطر سپرده، و علتِ
پاسخِ خالی در `_why`)؛ داورِ صحنهٔ ۸.۳۱ هم که همین را جدا نوشته بود رویش رفت.
`geminiText_` از این دام جان به در می‌بَرد (پاسخِ بریده را چهاربرابر دوباره می‌پرسد)؛
فراخوان‌های خامِ `geminiFetch_` این حلقه را ندارند — **هر فراخوانِ خامِ تازه از
`geminiShort_` برود.**

**تلاشی که با سازوکارِ خراب ثبت شد، تلاش نیست:** `MUSIC_HEAR_VER` در شناسنامهٔ هر قطعه
(`hv`) می‌نشیند و `musicHearTries_` فقط تلاشِ همین نسخه را می‌شمارد — همان شکلِ
`EMB_TEXT_VER`، چون «پاک‌کردنِ ورودی آنچه را نوشته شده درست نمی‌کند» (۵.۹۵).

**اعراب‌گذاری حالا می‌گوید چرا:** از ۸.۰۴ ترمیمِ واژه‌های بی‌علامت هست و پوشش ۱۲٪
ماند، با سه علتِ ممکن و سه درمانِ متفاوت (مدل جواب نداد · سدِ حروف رد کرد · جایش پیدا
نشد) و هیچ‌کدام شمرده نمی‌شد. `ep.__fill` شمارِ پرسیده/جواب/پذیرفته/رد و یک نمونهٔ ردی
را نگه می‌دارد، و خطِ روزانه واژه‌های بی‌علامتِ قسمتِ آخر را **به نام** می‌آورد.
«ي/ك» عربی و همزهٔ اضافه دیگر جوابِ درست را رد نمی‌کنند (همزه برداشته می‌شود: واژه
بی بافت پرسیده شده و اضافهٔ درست را از آن‌جا نمی‌شود دانست).

**آنچه این نسخه نمی‌کند، صریح:** علتِ ۱۲٪ را **نمی‌داند** — فقط از امشب شاهد دارد.
کیفیتِ استخراجِ «خالی ۱۰۰٪»، سه ویدئوی گیرکرده، و کم‌آوردنِ وقتِ وارسیِ سلامت هنوز
باز‌اند؛ از فردا هر سه «مزمن» گزارش می‌شوند و یافتهٔ کد دارند، یعنی دیگر نمی‌توانند
بی‌صدا بمانند. دستورِ ناظر v85 می‌گوید هر روز قدیمی‌ترینِ آن‌ها را بردارد.

**قاعده:** وقتی یک سطر هر روز در ایمیل تکرار می‌شود، سامانه‌ای که آن را می‌نویسد باید
**بشمارد** که چند روز است — وگرنه تکرار شبیهِ اطلاع است، نه هشدار.

## نقاشی طوری ساخته شده بود که دیده نشود — و موسیقی زمان را جابه‌جا کرده بود (8.31)

۴ اکتبر، دربارهٔ ویدئوی درسِ ۵۹: «افتضاح بود · متن‌ها می‌رفتن و می‌اومدن و صدا اصلاً
هماهنگ نبود · فقط متن بود · نقاشی کو · آبرومو بردی». هر چهار درست بود، و **هیچ‌کدام
با خواندنِ کد پیدا نشد** — با دانلودِ خودِ MP4 و نگاه به قاب‌ها، و با اجرای هم‌ترازی
روی `_times.json`ِ واقعیِ همان درس.

**یک: نقاشی پس‌زمینه بود، با پرده‌ای ۶۲٪ رویش.** ۷.۹۸ تصویرِ ساخته‌شده را «بی‌واژه و
انتزاعیِ زیرِ کارت» تعریف کرد — تصمیمی که او ۳۰ سپتامبر گفت نفهمیده، و من جلو رفتم.
او NotebookLM خواسته بود: تصویری که **خودِ مفهوم را نشان بدهد**. حالا حالتِ «صحنه‌های
مصور» (`lvScenesBuild_`): درس روی مرزِ جمله به صحنه‌های ~۲۰ ثانیه‌ای («زیاد») یا ~۴۵
ثانیه‌ای («کم») بریده می‌شود، مدلِ متن برای **متنِ همان چند جمله** یک صحنهٔ دیدنی
(استعارهٔ ملموس، شخصیت‌های بی‌نام) می‌نویسد، تصویر ۱۶:۹ به سبکِ تختهٔ همان مجموعه
ساخته می‌شود، و هر تصویر **کنارِ متنش** به مدل نشان داده می‌شود؛ ضعیف یا نوشته‌دار
یک بار از نو. مرزِ جعل سرِ جایش است: هیچ شخص یا سندِ واقعی.

**دو: کارت‌ها تا دو دقیقه از گفتار جلو بودند — و علتش موسیقی بود.** `lvSpecBuild_`
تکه‌ها را با `buildSpecialChunks_` از نو می‌ساخت و زمان‌ها را **شماره‌به‌شماره**
می‌گذاشت. ولی `_times.json` برای تکه‌های موسیقی هم زمان دارد: درسِ ۵۹ ۲۱ زمان و ۱۸ تکهٔ
متن داشت. پس از اولین پلِ موسیقی هر کارت یک تکه جابه‌جا شد، پس از دومی دو تکه. ۸.۳۰
«لنگر گرفت» را سنجید و **زمانِ لنگر را نسنجید**؛ همین را در CLAUDE.md «حرفه‌ای» نوشتم.
`lvAlignTimes_` حالا موسیقی را کنار می‌گذارد: با `k` (از ۸.۳۱ در `_times.json` ثبت
می‌شود) مستقیم، و برای قسمت‌های قدیم با هم‌ترازیِ پویا — موسیقی فقط سرِ مرزِ بخش‌ها
می‌نشیند و مدتِ متن متناسب با طولش است. روی درسِ ۵۹: هر ۱۸ تکه با ۰٫۰۸ تا ۰٫۱۱ ثانیه
بر نویسه، و سه موسیقی همان سه تکهٔ ۵ تا ۷ ثانیه‌ای. نامطمئن ⇒ «نه» با علت.

**و همان فراخوان یک باگِ دیگر هم داشت:** `buildSpecialChunks_(ep, meta)` شمارهٔ قسمت
را با کلِ پرونده پر می‌کرد، پس کلیدِ نقشهٔ موسیقی «special#[object Object]» می‌شد —
نقشهٔ تازه از مدل، **پاک‌کردنِ حافظهٔ نقشهٔ قسمتِ در حالِ تولید**، و «درس‌نامه [object
Object]» در ایمیلِ روزانه. `specialTextChunks_` همان متن را بی هیچ اثرِ جانبی می‌دهد و
§۷۱.۱ آن را با `buildSpecialChunks_` کنارِ هم می‌سنجد تا دوقلو از هم دور نشوند.

**سه: «متن می‌رفت و می‌آمد».** کارت خالی شروع می‌شد و جمله فقط وقتی گفته می‌شد ظاهر
می‌شد، بعد هفتاد ثانیه می‌ماند. در حالتِ صحنه هیچ قابِ خالی نیست (صحنهٔ اول از صفر،
آخری تا آخر، صحنهٔ بی‌تصویر زمانش را به قبلی می‌دهد)، مرز روی نزدیک‌ترین **مکث** صوت
می‌نشیند (`silencedetect`)، و نوشته فقط یک زیرنویسِ کوتاه در چند ثانیهٔ اول است.
**لرزش** هم ساختاری بود: zoompan و crop روی پیکسلِ درست گرد می‌کنند، پس حرکتِ آرام
پله‌پله می‌شد (اختلافِ قاب‌به‌قاب ۰ ⇒ ۰٫۸ ⇒ ۰). `perspective` با درون‌یابی زیرپیکسلی
است و یکنواخت (~۰٫۰۳) — سنجیده، نه حدس.

**سدِ انتشار در کد، و از خودِ ویدئو.** رانر پس از ساخت، وسطِ هر صحنه قابی از **خودِ
MP4** برمی‌دارد و با تصویرِ همان صحنه و دو همسایه‌اش مقایسه می‌کند (رنگی، نه خاکستری:
نگارشِ خاکستری دو صحنهٔ هم‌شکلِ رنگ‌متفاوت را یکی دید). `qa` به `docs/renders.json`
می‌رود و `ytPublicGate_` — یک تعریف برای هر دو در، آپلود و `ytRedoOne_` — بی آن یا با ردِ
آن عمومی نمی‌کند. و نخستین `YT_SCENES_APPROVE` ویدئو تا کلیدشان در `docs/yt-approve.json`
ننشیند Unlisted می‌مانند و لینکشان به تلگرامِ او می‌رود: سدِ خودکار باید اول خودش
سنجیده شود.

**کاور از نقاشیِ خودِ درس** (رانر، ۱۲۸۰×۷۲۰، عنوان روی سایهٔ نرم) و بر کارتِ اسلایدز
مقدم است. یک دامِ کوچک که فقط **دیدنِ** کاور نشانش داد: `--window-size` اندازهٔ پنجره
است نه نمای صفحه، پس ته‌اش سیاه می‌ماند؛ پنجره بلندتر گرفته و بریده می‌شود.

**هزینه:** سقفِ ماهانه ۸ ⇒ ۶۰ دلار، به تأییدِ صریحِ او. ~۴۰ تصویر برای هر درس با
ارزان‌ترین مدل؛ کاور با بهترین مدلِ زیرِ `LV_GEN_HQ_MAX_USD`. ساخت در چند اجرا
(`ytSceneMore`، یک‌باره، چند دقیقه بعد)، با اجاره تا دو اجرا یک صحنه را دو بار نسازند،
و محدود به مهلتِ دورِ انتشار (`_ytRunDeadline`) تا از سقفِ شش‌دقیقه نگذرد.

**آنچه این نسخه نمی‌کند، صریح:** ویدئوی منتشرشدهٔ درسِ ۵۹ عوض نمی‌شود (یوتیوب فایلِ
ویدئو را جایگزین نمی‌کند؛ بازسازی‌اش یک مسیرِ «جایگزینی» لازم دارد). و کیفیتِ هنریِ
نقاشی را هیچ سنجه‌ای اثبات نمی‌کند — داوریِ مدل کنارِ متن کف است، چشم سقف.

**قاعده:** وقتی شکایت دربارهٔ چیزی است که دیده یا شنیده می‌شود، **اول خودِ خروجی را
باز کن** — فایل را دانلود کن، قاب بگیر، اندازه بگیر. ۸.۲۶ تا ۸.۳۰ پنج نسخه کارت‌ها را
«درست» کردند و هیچ‌کدام یک قاب از ویدئوی واقعی را ندیدند.

## علت یک «ی» بود، و فقط دادهٔ واقعی نشانش داد (8.30)

او گفت «نگه دار که فردا منتشر بشه، ولی حرفه‌ای و دقیق و مطابقِ تنظیماتِ تخته».
۸.۲۹ نقشه را از نحیف‌ماندن نجات داد، ولی **چرا مشخصاتِ برداری نشد** هنوز حدس
بود. این بار حدس نزدم: `_special.json` و `_times.json` و `_yt.json`ِ درسِ ۵۹
از درایو خوانده شد و `lvSpecBuild_` روی **همان‌ها** اجرا شد. جواب یک خط بود:
«فقط ۱ کارت از ۳ لنگر گرفت».

**و علت در `lvNorm_` بود، نه در مدل.** متنِ گفتاری برای درست‌خواندن کسرهٔ اضافه
را «سَرچَشمه‌یِ اَوَّلیه‌یِ» می‌نویسد؛ نیم‌فاصله که فاصله شود، یک «ی»ِ تنها میانِ
دو واژه می‌ماند. عبارتِ مدل از متنِ نوشتاری است: «سرچشمه اولیه». و **گروه‌های
اسمی — دقیقاً همان چیزی که مدل برای کارت نقل می‌کند — درست همان‌جایی‌اند که
این «ی» می‌نشیند.** پنجره‌های تصادفیِ شش‌واژه‌ای ۹۲٪ لنگر می‌گرفتند و عبارت‌های
مدل ۳۳٪؛ میانگین عیب را پنهان می‌کرد. حالا ۲۴۹ از ۲۴۹ و هر سه.

**نقشه‌ای که «حرفه‌ای» باشد سه لایه دارد، به این ترتیب:** پرسشِ کامل؛ اگر کم
آمد، **هر بخشِ کم‌مانده جدا** (`ytVisSecAsk_` — متنِ کاملِ یک بخش، دو سه مورد،
پرسشی که مدل واقعاً خوب جوابش می‌دهد)؛ و فقط بعد کارتِ ازروایتِ ۸.۲۹، که حالا
جملهٔ **مرتبط با سرِ بخش** و **کامل** را برمی‌دارد — نسخهٔ اولش روی درسِ ۵۹
یادداشتِ غنی‌سازی («این توضیح در خودِ درس نیامده») و تکه‌ای از وسطِ جمله را
کارت می‌کرد، و این را هم فقط اجرای آن روی متنِ واقعی نشان داد.

**درخواستی که در صف است تا امروز بهترشدنی نبود.** `ytRenderAsk_` تکراری را
رد می‌کرد، پس هیچ نسخه‌ای نمی‌توانست درسی را که در صف نشسته درست کند — فقط
درس‌های بعدی را. `ytRenderRedoable_` یک بار و فقط برای ردیفِ «در انتظار»ِ
ساخته‌نشدهٔ نحیف اجازه می‌دهد، و فقط با درخواستِ **بهتر**. و نگه‌داشتنِ رانر
(`docs/render-hold.json`) به **همان ردیف** بسته است (`at`)، نه به کلید: موتور که
ردیف را بازنویسی کند، رانر همان اجرا می‌سازدش و کسی لازم نیست چیزی را باز کند.
سقفِ زمانی دارد، چون نگه‌داشتنی که جوابش نیاید یعنی ویدئویی که هرگز نمی‌آید.

**و تخته:** `lvStyleAt_`/`lvLevelAt_` از ۸.۱۸ تخته را مقدم می‌دانند، ولی هیچ‌جا
ثبت نمی‌شد کدام راه رفت — و مجموعه‌ای که در رجیستری پیدا نشود **بی‌صدا** به
انتخابِ مدل می‌افتاد. `vis.board` در ردیفِ عمومی حالا می‌گوید «تخته»، «خودکار ⇒
انتخابِ مدل» یا «پیدا نشد». رجیستری از کانکتورِ درایو خوانده نمی‌شود (هاب ۳۴
مگابایت است و فقط ساختارش برمی‌گردد)، پس این شاهد تنها راهِ دیدنش بیرون از
خودِ موتور است.

**قاعده:** وقتی علت را نمی‌دانی و داده در دسترس است، پیش از نوشتنِ هر خطی
**همان تابع را روی همان داده اجرا کن**. ۸.۲۶ و ۸.۲۹ هر دو درست بودند و هیچ‌کدام
این یک «ی» را ندیدند، چون هر دو روی متنِ ساختگی سنجیده شدند.

## سه کارت، همه از بخشِ یک — و هر دو راهِ درمان به مدل ختم می‌شد (8.29)

او پرسید «ویدیوی امروز به شکلِ جدید درست می‌شه؟» و جوابِ راست «نه» بود: درخواستِ
رندرِ درسِ ۵۹ — روزِ اولِ ۸.۲۶ — **سه** کارت داشت، هر سه از بخشِ یک، برای درسی
پانزده‌ونیم‌دقیقه‌ای که موتور خودش دوازده تصویر خواسته بود، و بی مشخصاتِ برداری.
رانر وزن‌ها را روی کلِ صوت پخش می‌کند، پس یعنی هر کارت پنج دقیقه.

**۸.۲۶ قرارداد را درست کرد و یک بار دوباره پرسید — و هر دو راه به مدل ختم
می‌شد.** مدلی که بار اول کم داد، بار دوم هم می‌تواند کم بدهد. ۸.۱۱ «نحیف» را
شمرد؛ هیچ‌چیز نحیفی را پُر نکرد. `ytVisFill_` راهی است که به مدل ختم نمی‌شود:
بخشی که کمتر از سهمش دارد از **جمله‌های خودِ روایت** پر می‌شود — پخش در طولِ
بخش، کارتِ «نقل»، و `quote` چند واژهٔ اولِ همان جمله **عیناً**. پس این کارت‌ها
به ساختار همیشه لنگر دارند؛ برای `quote`ِ مدل این فقط امید است.

**مرزها:** کارِ مدل کامل می‌شود، جایگزین نمی‌شود (۶۹.۴/۶۹.۴-ب)؛ جملهٔ رادیویی
از همان `HANDOUT_RADIO`ِ جزوه کنار می‌رود، به‌علاوهٔ «در درسِ بعد…» که جزوه
نگهش می‌دارد ولی کارت نباید — کارت جمله را تنها و درشت نشان می‌دهد؛ جملهٔ بلند
یا متنِ بی‌نقطه به پنجره شکسته می‌شود نه دور انداخته — وگرنه بخشی که گوینده‌اش
یک‌نفس حرف زده درست همان بخشی است که کارتی نمی‌گیرد؛ و ترتیب از جای عبارت در
متن می‌آید، چون کارتِ اسلایدز بی زمانِ واقعی پشتِ‌هم می‌آید.

**تغییرِ نقشه یک تلهٔ خاموش داشت، از ۸.۲۶:** نامِ تصویر شمارهٔ مورد را دارد. نقشه
که پس از ساختنِ چند کارت عوض شود، کارتِ دومِ نقشهٔ قبلی روی موردِ دومِ نقشهٔ
تازه می‌نشیند — متنِ یک مفهوم زیرِ گفتارِ مفهومی دیگر، بی هیچ خطا. `lvBuild_`
حالا `cardTitle`ِ ثبت‌شده را با موردِ امروز می‌سنجد. و یک اجرا که کارت ساخت و
پس‌زمینه‌اش به سقفِ هر اجرا خورد **دو** تلاش می‌شمرد: صبرِ `LV_TRY_MAX` نصف.

**و شاهد در ردیفِ عمومی.** علتِ سه‌موردیِ درسِ ۵۹ هنوز نامعلوم است — مدل کم داد،
یا جوابش بریده شد — چون تنها جایی که می‌گفت سیاههٔ درونِ هاب بود، و آن روز
اتصالِ درایوِ این سشن قطع بود. `_YT-RENDER.json` عمومی است و هر ساعت خوانده
می‌شود؛ حالا `vis` در هر ردیف می‌گوید مدل چند داد (بارِ اول و دوم)، کد چند ساخت،
چند ساخته شد، و **چرا مشخصات نشد** (`lvSpecBuild_` تا امروز شش `return null`
بی‌نام داشت). فقط شمارش و علت، هیچ متنی از درس. **شاهدی که فقط در جای خصوصی
باشد، روزی که آن جا در دسترس نیست، وجود ندارد.**

**یک شکستن هیچ‌جا ننشست و درست هم بود:** حلقهٔ `need` میان‌بُر است نه سد —
شکستنش به‌تنهایی هیچ رفتاری را عوض نمی‌کند، و در کد همین برچسب را گرفت (۷٫۷۱).
شکستنِ `gap` ولی **اول** هیچ‌جا ننشست، چون میان‌بُر پوشاندش؛ ۶۹.۴-ب برای آن
ساخته شد. دو قفل که هر کدام دیگری را می‌پوشاند، همان شکلِ ۷٫۴۱.

## حالت‌ها روی دستورِ لحن سوار بودند، و دستور نمی‌رسد (8.27)

۳ اکتبر، نمونهٔ رضوی روی متنِ آزمون: «عاروق» تمام شده بود (گامِ خودکارِ ۸٫۲۴
کار کرد: ورودی ۱۱۴ هرتز، خروجی ۱۰۶٫۷، رضوی ۱۰۶٫۹) — و «یه سری حالت‌ها رو اصلاً
رعایت نکرد … تو کپشن نوشته بودی». درست شنیده بود.

**علت یک خط از ۸٫۲۴ بود:** حالت‌ها را به انتهای **دستورِ لحن** چسباندم
(`speakSpanStyle_`) — و همان ردیفِ صف برچسبِ «لحن از نشانه‌ها» داشت، یعنی دستور
به مدل نرسید. این خانواده هیچ فیلدِ دستوری نمی‌پذیرد (۷٫۸۹) و پیشوند خوانده
می‌شود (۸٫۰۷). پس جز «مکث» — که سکوتِ واقعی در PCM است — هیچ حالتی به گفتارساز
نرسید، و کپشن جای هر نُه را با ثانیه نوشت. **ادعایی بی ورودی: ۷٫۷۹ از درِ ۸٫۲۴،
در کدی که خودم با آن درس روی صفحه نوشتم.**

**راهِ سوم نه متن است نه دستور: خودِ صدا.** وقتی دستورِ **همین تکه** دور
انداخته شد (`TTS_CUE_DROPPED_` — چهار جایی که دستور واقعاً انداخته می‌شود،
همه از `ttsCueDropMark_`)، `speakMoodDsp_` بلندی را با ضریب و سرعت را با WSOLA
می‌سازد — سرعت عوض می‌شود و زیروبم نه (۲۰۰ هرتز ۲۰۰ می‌مانَد). «لبخند» در صدا
ساختنی نیست و **ادعا نمی‌شود**؛ «نجوا» فقط آهسته‌تر است و همین گفته می‌شود.
کپشن حالا «چطور» را هم می‌گوید: «(در صدا)»، و حالتِ اجرانشده در فهرستِ جاها
نمی‌آید.

**و لایهٔ زیرش در پل بود، سنجیده نه حدسی.** `voicelab.to_wav` پیش از تبدیل
`loudnorm`ِ **پویا** می‌زند — بلندیِ هر چند ثانیه را جدا به هدف می‌رساند. روی
همین کانتینر: اختلافِ ۱۲ دسی‌بلی ۵٫۷ شد. یعنی «آرام»ی که موتور می‌ساخت، پیش از
تبدیل نیمه‌صاف می‌شد. پل حالا `--src-static` می‌دهد: یک گینِ ثابت برای کلِ
فایل (`loudStatic_`)، و همان ۱۲ دسی‌بل ۱۲ می‌مانَد.

**قاعده:** وقتی چیزی را روی کانالی سوار می‌کنی، اول بپرس آن کانال امروز **باز**
است یا نه — و برچسبی که می‌گوید «انجام شد» باید از رویدادِ همان تکه بیاید.

**آنچه هیچ سنجه‌ای ثابت نمی‌کند:** اینکه RVC اختلافِ بلندی را نگه می‌دارد
(`envelope_ratio` ۰٫۲۵ یعنی بیشترش را باید نگه دارد)، و اینکه گوشِ او «تند» و
«کشیده»ی WSOLA را طبیعی می‌شنود.

## چهارده تصویر خواسته شد و یکی آمد — و چهار سیمِ قطع پشتش (8.26)

او پرسید «این ۱۴ تا عدد ثابته؟ مگه به مواردی که جلوی هر درس‌نامه انتخاب شده
توجه نمی‌کنه؟ اون موضوعِ برداری و نقاشی چی شد؟» — و یک هفته جوابش «بعداً» بود.

**۱۴ ثابت نیست:** `ytVisWant_` از مدتِ واقعیِ صوت می‌آید (۰٫۸ در دقیقه، هر
تصویر میانِ ۸ و ۹۰ ثانیه). **علتِ «یکی آمد» یک قراردادِ دوزبانه بود:** ۸.۰۱
فیلدهای schema را `quote/form/headline/…` کرد و پرامپت هنوز
`kind/cardTitle/cardLines` می‌خواست. مدلِ ساختاریافته فقط فیلدهای schema را
می‌نویسد، پس از آنچه خواسته شده بود هیچ‌چیز نوشتنی نبود — یک شیءِ تقریباً
خالی، دقیقاً همان `_yt.json`ِ درس‌های ۵۷ و ۵۸. و `quote` («عیناً از روایت»)
بی متنِ روایت نوشتنی نبود؛ آن متن هرگز به فراخوان نمی‌رفت.

**چرا یک هفته هیچ سنجه‌ای نیفتاد:** بدَلِ مدل همان فیلدهای قدیمی را برمی‌گرداند
— چیزی که مدلِ واقعی **نمی‌تواند**. `tests/lib/mock.js` حالا پاسخ را از روی
schemaی فرستاده‌شده صافی می‌کند (`schemaStrict`). پنج مجموعه با بدَلِ یک‌شکل
خاموشش کرده‌اند و `run_wiring_test.js` ۱۲ آن فهرست را **یک‌طرفه** نگه می‌دارد.
**بدَلی که از تولید آزادتر است، قراردادی را سبز نشان می‌دهد که تولید هرگز پر
نمی‌کند** — ۷٫۲۴، این بار در مرزِ مدل.

**و پشتِ آن، چهار سیمِ قطع که هر کدام جدا «کار می‌کرد»:**
- **مشخصاتِ برداری هرگز به رانر نرسید.** `ytUploadOne_` از ۸.۰۱ `spec` را
  می‌ساخت و `render.js` از ۸.۰۱ اول `it.spec` را می‌خواند — و `ytRenderAsk_`ِ
  وسط ردیف را بی `spec` می‌نوشت. رانر بی `spec` عیناً مسیرِ قدیم را می‌رود
  («چیزی خراب نمی‌شود»)، پس **خرابی از درِ سازگاری بی‌صدا ماند.**
- **سبکِ ترکیبی به پیش‌فرض برمی‌گشت.** `lvStyleAt_` «الف + ب» برمی‌گرداند و
  کاور و کارت‌ها با `lvStyleFind_` (فقط کلیدِ تکی) می‌خواندندش. `lvStyleResolve_`.
  و کارت‌های برداری اصلاً سبکی نمی‌گرفتند (`look.js` از روی دسته) — حالا
  `lvCardPal_` پالت را از سبکِ همان مجموعه می‌سازد.
- **«کم» و «زیاد» به هیچ تصمیمی وصل نبودند.** `i < LV_GEN_PER_EP`: چهار تصویر،
  همیشه، همه در اولِ درس. `lvGenPick_` حالا: زیاد = هر کارت، کم = چند تا
  **پخش در طولِ درس**، خاموش = هیچ — و خاموش واقعاً بی‌کارت است.
- **نقاشی فقط روی کارتِ اسلایدز می‌نشست**، که ویدئو با وجودِ `spec` نمی‌خواندش.
  حالا تصویرِ هر مورد به کارتِ برداری می‌رسد (`bgId`)، رانر برش می‌دارد و زیرِ
  کارت با لایهٔ هم‌رنگِ زمینه می‌نشاند.

**«جبران‌شدنی» برچسبی بی کد بود:** ۸.۱۱ نوشت نقشهٔ نحیف پیش از ویدئو جبران
می‌شود؛ هیچ‌چیز دوباره نمی‌پرسید. `ytVisThicken_` یک بار و فقط تصویرها را
می‌پرسد، پیش از کار ثبت می‌شود، و فقط وقتی جایگزین می‌کند که بهتر باشد.

**قاعده:** وقتی یک طرفِ قرارداد را عوض می‌کنی (schema)، **هر خواننده و هر
نویسندهٔ آن قرارداد** را همان‌جا پیدا کن — پرامپت، مصرف‌کننده، صف، و بدَلِ
آزمون. ۶۸.۱ همین را می‌پرسد: هر نامی که پرامپت می‌برد و هر فیلدی که
`lvSpecBuild_` می‌خوانَد، در schema هست یا نه.

**آنچه هیچ سنجه‌ای ثابت نمی‌کند:** اینکه مدلِ واقعی عبارتِ `quote` را عیناً
نقل می‌کند (کارتِ بی‌لنگر رد می‌شود و شمرده می‌شود: `missed`)، و اینکه کارت‌های
برداری روی رانرِ واقعی کشیده می‌شوند — این مسیر از ۸.۰۱ یک بار هم در تولید
ندویده. شاهدش از امروز در `docs/renders.json` است: `mode: "cards"`.

## گامِ ثابت فرض می‌کرد صدای مبدأ یکی است (8.24)

او دو نمونهٔ ۱ اکتبر را شنید: «رضوی مثلِ قبل بود واقعاً … گلدوز یه مقدار بهتر شده
بود». همان متن (قسمت ۵۳)، همان نشانه‌گذاری، هر دو با «لحن از نشانه‌ها» — و فقط
یکی بهتر شد. **پس تنگنای رضوی در متن نبود.** این را خودِ فایل گفت، نه استدلال:

| | زیروبمِ میانهٔ خروجی | قاب‌های زیرِ ۶۵ هرتز | قاب‌های واک‌دارِ تمیز |
|---|---|---|---|
| رضوی (گام −۱۲) | **۶۰ هرتز** | ۵۷٪ | ۲۵٪ |
| گلدوز (گام −۲) | ۱۰۱ هرتز | ۲٪ | ۶۶٪ |

و خودِ رضوی؟ کارتِ سبکِ ۱۸ سپتامبر روی ۱۲۶۴ ثانیه از صدای واقعی‌اش **۱۰۶٫۹ هرتز**
سنجیده بود. فاصله ~۱۰ نیم‌پرده، یعنی محدودهٔ خِرخِرِ حنجره — همان «عاروق‌مانندی»
که او در **همهٔ** واژه‌ها شنید و از ۷٫۷۰ تا امروز به `index_rate`، به داده، و به
خوانشِ صاف نسبت داده شد.

**علت یک فرض بود که هیچ‌جا نوشته نشده بود:** −۱۲ روی صدای مبدأِ زن‌گونه سنجیده شد
(۷٫۸۱ خودش نوشته «صدای مبدأ زن‌گونه است و او مردِ بم، حدودِ یک اکتاو»). نمونه‌ها با
`CFG.TTS_VOICE` (Charon، مرد) خوانده می‌شوند و قسمت‌ها با چند صدای نقش‌گزینی‌شده،
زن و مرد. **عددی که به یک ورودی سنجیده شده، روی ورودیِ دیگر معنا ندارد** — همان
درسِ ۷٫۸۱ برای گوینده‌ها، این بار برای صدای مبدأ.

حالا هدف **هرتز** است، نه نیم‌پرده: `VOICE_TARGET_HZ` ⇒ `params.targetHz` ⇒
`voicebridge.py` زیروبمِ خودِ ورودی را می‌سنجد و گام را از نسبت حساب می‌کند. و
**خروجی هم سنجیده می‌شود** (`f0Out`، `f0Warn`) و در کپشن می‌آید — چون تا امروز تنها
شاهدِ این عیب گوشِ او بود، شش بار.

مرزها: دستِ او در ردیف هنوز برنده است (۷٫۸۱)؛ سنجشِ ناموفق به گامِ پشتیبان می‌افتد
و **گفته می‌شود**؛ `None` یعنی «نسنجیدم» نه صفر؛ و گلدوز عمداً دست نخورد، چون زیروبمِ
واقعی‌اش هنوز به عدد ثبت نشده. **آنچه این نسخه حل نمی‌کند:** یک قسمت با چند صدای
مبدأ (زن و مرد) هنوز **یک** گام می‌گیرد — میانهٔ کل. گامِ تکه‌به‌تکه کارِ بعد است.

## حالت‌هایی که گوینده هرگز نمی‌بیند (8.24)

او خواست «گاهی کشیده، گاهی بلند، گاهی یکم بلندتر، گاهی یواش … و به باگِ قبلی
نخوریم که گوینده دستورِ لحن رو می‌خوند».

دو راهِ آشکار هر دو غلط بودند. **نشانهٔ تازه در خودِ متن** یعنی گفتارساز آن را
می‌بیند — و نشانه‌ای وسطِ متن جایی است که `ttsGuarded_` (که فقط شش ثانیهٔ اول را
می‌شنود) هرگز نمی‌شنود. **جدولِ کامل در دستورِ گفتارساز** از سقفِ ۳۲۰ نویسه
می‌گذرد و در هر تکه تکرار می‌شود.

پس جدول را **مدلِ متنی** یاد می‌گیرد و فقط **شمارهٔ جمله** پس می‌دهد — بی آنکه
یک واژه را بازنویسد، پس سدِ هویتِ واژه‌ها حتی لازم نمی‌شود. کد آن جمله‌ها را تکهٔ
جدا می‌کند و دستورِ کوتاهِ همان حال را **در انتهای** دستورِ همیشگی می‌گذارد (`styleFit_`
از سر می‌اندازد، پس حال هرگز قربانیِ کارت نمی‌شود)، جایی که نگهبانِ شنیدن از قبل
ایستاده. «مکث» اصلاً به گفتارساز نمی‌رود: سکوتِ واقعی است که کد در PCM می‌گذارد.

**`speakSentSplit_` تنها تعریفِ «جملهٔ N» است**، و `splitForTts_` از همان می‌خوانَد:
اگر شمارشِ پرامپت با شکستنِ گفتارساز فرق کند، «آرام» روی جملهٔ کناری می‌نشیند و
هیچ خطایی نمی‌دهد. و بی حالت، تکه‌ها **عیناً** همان تکه‌های دیروزند (۲۴.۲-ت).

در نمونه‌ها روشن، در قسمت‌ها **خاموش** (`SPEAK_SPANS_EP`) تا گوشِ او بگوید — همان
مرزِ `VBR_REPLACE`. و جای هر حالت در فایل («آرام ۱:۲۰ · بلند ۲:۰۵») به کپشن می‌رود،
چون آنچه شنونده نداند کجاست، قضاوت نمی‌شود (۸٫۱۰).

**آنچه هیچ سنجه‌ای ثابت نمی‌کند:** اینکه گفتارساز «آرام» را واقعاً آرام می‌خوانَد،
و اینکه درزِ میانِ دو تکه شنیده نمی‌شود. هر حالت یک فراخوانِ جداست و رنگ و
بلندیِ پایه ممکن است کمی بپرد. این را فقط گوش جواب می‌دهد.

## متنِ آزمون، نه تکه‌ای از درس (8.25)

او خواست برای سنجیدنِ رضوی و گلدوز «یه متنی خارج از درس‌نامه … که تمام مواردِ
نگارشی داخلش بگنجه و دستوراتِ جدید رو هم بتونن انجام بدن … و کوتاه هم نباشه».
درسِ معرفت‌شناسی جایی برای «نجوا» یا «لبخند» ندارد، و چیزی که در نمونه نیست
سنجیده نمی‌شود (۸٫۱۰). `VOICE_TEST_TEXTS` یک داستانِ کوتاه است که هر ده نشانه و
هر نُه حالت جای معنادارِ خودشان را دارند، و بذرِ `text` به آن اشاره می‌کند.

**جای حالت‌ها ثابت است، نه انتخابِ مدل** — این آزمونِ گوینده است، نه انتخاب‌گر؛
اگر مدل هر بار جای دیگری را «آرام» کند، دو گوینده روی دو چیزِ متفاوت سنجیده
می‌شوند. و **اعراب یک بار** ساخته و در درایو ذخیره می‌شود، به همان دلیل.

دو مرز که نوشتنشان ارزان‌تر از کشفشان است: پایان‌بندی **درونِ** گیومه یا پرانتز
مرزِ جمله نیست، پس دو جمله یکی و همهٔ شماره‌های بعد جابه‌جا می‌شوند — گیومه و
پرانتز در این متن فقط وسطِ جمله‌اند و ۳۷.۲ هر حالت را روی جملهٔ خودش می‌سنجد. و
اعراب‌گذار با `SPEAK_MARKS: false` پرسیده می‌شود، چون نشانه‌ها طراحی شده‌اند؛ تکه‌ای
که باز هم نشانه‌ای را عوض کند **ساده** می‌مانَد — بی‌اعراب بهتر از نشانهٔ گمشده.

اعراب و صداسازی با هم از شش دقیقه می‌گذرند، پس اجرای اول فقط اعراب می‌گیرد و
اجرای بعد را خودش زمان‌بندی می‌کند — یک بار در عمرِ هر `ver` از متن.

## «روشن است» و «کار می‌کند» دو چیزند (8.05)

صاحبِ برنامه: «حتی ممکن خیلی گزینه‌های که اضافه کردی استفاده نکنم تا مدت‌ها، ولی
ناظر باید به عملکردش توجه کنه و فقط کدها رو نبینه و **اجرا** کنه … لازم نباشه من
هر بار ایمیل بفرستم» — و بعد، صریح‌تر: «فقط حرفم برای این ویدیو و .. نبود بلکه
**همه موارد توی پروژه**.»

این پرونده بیش از هر شکلِ دیگری یک چیز را ثبت کرده: قابلیتی که ساخته شد، سنجه‌اش
سبز بود، و هفته‌ها هیچ کاری نکرد بی آنکه جایی صدا دربیاید — بانکِ موسیقی،
`sfxAllow_`، `pruneEnrichFiles_`، `musicWish_`، بذرِ نمونهٔ روح. **هر بار علت یکی
بود، و تا ۸.۰۵ هیچ‌جا نوشته نشده بود: «روشن است» با «کار می‌کند» یکی گرفته شده
بود.**

`CFG.CAPABILITIES` کارنامه‌ای است که هر شب از `_STATUS.json` ساخته می‌شود، و
**مرزهایش تمامِ ارزشِ کارند**:

- **«خاموش (تصمیم)»** ایراد **نیست** و `ok` را پایین نمی‌آورد. هشداری که برای
  تصمیمِ خودِ صاحبِ برنامه بزند، همان هشداری است که یاد می‌گیرند نخوانند.
- **«نامعلوم»** شکافِ پوشش است، نه عیب (۷٫۵۷) — و **نام برده می‌شود**، نه فقط
  شمرده. قضاوتش کارِ ناظر است که زمینه دارد: قابلیتی که هفته‌هاست باید شاهد
  داشته باشد و ندارد، خودش یافته است.
- **«روشن ولی بی‌اثر»** تنها حالتِ ایراد است، و دستورِ یافته‌اش می‌گوید *علتش را
  پیدا کن، نه اینکه دوباره ثبتش کنی* — سه جا به ترتیب: بلوکِ شبانه پشتِ
  `nightHas_` نوبت نمی‌گیرد · گیتی که هیچ‌وقت صادق نمی‌شود (۷٫۶۲) · واقعاً کاری
  نیست، که جوابش پایین‌آوردنِ کلید است.
- **«سیم‌کشی» مهم‌ترین است، چون چیزی برای دیدن نیست.** کلیدی که در `CFG` وجود
  ندارد یعنی آن قابلیت هر روز بی‌صدا «خاموش» گزارش می‌شود: نامی درست، جایی درست،
  و هیچ سنجشی. **این عیب در نگارشِ اولِ خودِ همین جدول افتاد** — `EMB_ENABLED`
  نوشته شده بود و کلیدِ واقعی `EMB_ON` است — و تنها سنجهٔ ۱۶٫۱ گرفتش.

ورودی‌اش همان شیئی است که `writeStatus_` از قبل می‌سازد، پس **هیچ خواندنِ تازه‌ای
از درایو یا شیت ندارد** (۷٫۵۷/۷٫۶۳/۷٫۷۲). و **دو قالبِ تاریخ در این مخزن هست، نه
یکی**: `nowStr_` با فاصله و چند جا `toISOString()` با `T`؛ الگویی که فقط اولی را
بشناسد شاهدِ چند قابلیت را **نمی‌بیند**، و از بیرون شبیهِ «آن قابلیت کار نمی‌کند»
است. یکسان‌سازی با جانشینیِ `T` است نه با شاخهٔ `[ T]` در الگو، چون مقایسهٔ
«تازه‌ترین» رشته‌ای است و `'T' > ' '`.

## اندازه‌ای که خودِ موتور هر روز می‌گفت و هیچ تصمیمی نمی‌شد (8.12)

هر کاور و هر کارتِ این موتور از روزِ اول **۹۶۰×۵۴۰** بوده، نه ۱۲۸۰×۷۲۰. و
این حدس نیست؛ موتور خودش هر روز **دو بار** در سیاهه‌اش می‌نوشت:

```
presentations.create اندازهٔ درخواستی را نادیده گرفت — صفحه با
5143500×9144000 ساخته شد، نه 6858000×12192000 EMU
«کاور — درس ۳۵ …».png ۹۶۰×۵۴۰ درآمد، نه ۱۲۸۰×۷۲۰ —
یوتیوب می‌پذیردش ولی متن نرم می‌شود
```

تشخیص **کاملاً درست** بود، علت هم درست نام‌برده شده بود، و هر بار با یک جملهٔ
آرام‌کننده بسته می‌شد: «نه خطای این اجرا، محدودیتِ شناخته‌شدهٔ Slides API».
همان شکلِ همیشگی، در خالص‌ترین حالتش: **اندازه‌گیریِ درست، وصل‌نشده به هیچ
تصمیمی.** یک جملهٔ «این باگِ ما نیست» کافی بود تا ماه‌ها کسی دنبالِ راهِ دیگر
نگردد.

**و راه وجود داشت — فقط جای دیگری بود.** `export/png` همیشه به اندازهٔ
**صفحه** می‌دهد، پس تا وقتی `presentations.create` اندازه را نادیده می‌گیرد،
هیچ کاری روی ساختِ اسلاید جواب نمی‌دهد. ولی `pages/{id}/thumbnail` اندازه‌اش
را از صفحه نمی‌گیرد: `thumbnailSize=LARGE` حدودِ ۱۶۰۰ نقطه می‌دهد. **وقتی یک
محدودیت واقعی است، بپرس آیا همان چیز از درِ دیگری هم گرفته می‌شود — نه فقط
آیا این در باز می‌شود.**

**و سقوطش به سمتِ داشتن است، نه نداشتن:** thumbnail که نشد، همان `export/png`
می‌رود. کاورِ نرم از کاورِ نداشته بهتر است.

**و یک خط که شبیهِ سد بود و نبود، برچسبش عوض شد نه نگه‌داشته شد.** شکستنِ
`if (res.getResponseCode() !== 200)` هیچ سنجه‌ای را سرخ نکرد — و جوابِ درست
ساختنِ یک حالتِ ساختگی برایش **نبود**، پذیرفتنِ اینکه میان‌بُر است: بدنهٔ خطا
یا پارس نمی‌شود یا `contentUrl` ندارد، پس سدِ واقعی دو خط پایین‌تر است (۷٫۷۱).

**و عیبِ خودم در این نوبت، برای بارِ دوم در دو نسخه، در ابزارِ شکستن بود.**
اسکریپتِ سوئیپ پیش و پس از هر شکستن یک نسخهٔ پشتیبان را روی `src/`
برمی‌گرداند — و آن پشتیبان **پیش از** بالا بردنِ `CODE_VERSION` گرفته شده بود.
پس اجرای سوئیپ نسخه را بی‌صدا به ۸٫۱۰ عقب برد. چیزی که لو داد یک خط خروجی
بود: `built v8.10` در حالی که ۸٫۱۲ ساخته می‌شد. ۸٫۱۰ نوشته بود که ابزارِ
شکستن می‌تواند خودش توخالی باشد؛ این بار همان ابزار **کار را پس گرفت**.
**قاعده: ابزاری که فایل را بازمی‌گرداند باید پشتیبانش را در همان اجرا بگیرد،
نه از قبل** — و خروجیِ ساخت را هر بار بخوان، چون شمارهٔ نسخه ارزان‌ترین
شاهدِ «کارِ من هنوز سرِ جایش هست» است.

**و آنچه عمداً دست نخورد: شبیه بودنِ کاورها به هم.** صاحبِ برنامه گفت «کاور
مثل کاور روزهای دیگست» و حق داشت که می‌بیند — ولی این **باگ نیست**: پالت، قاب
و چیدمان همه از `ytPalette_(مجموعه)` می‌آیند، یعنی برای هر ۳۵ درسِ یک مجموعه
ثابت‌اند و فقط متنِ عنوان عوض می‌شود. فایل‌ها هم واقعاً هر روز از نو ساخته
می‌شوند (اندازه‌هایشان فرق دارد)، پس کَشِ خراب هم در کار نیست. عوض‌کردنش
**سلیقه** است نه تعمیر، و سلیقهٔ او پاک نمی‌شود: گزارش شد و پیشنهاد داده شد
(چرخاندنِ چیدمان با شمارهٔ قسمت، همان کاری که ۷٫۹۹ برای کارت‌ها کرد).

## دو پرسش، و جوابِ هر دو «هیچ‌جا» بود (8.13)

**یک: «کجای این قسمت تنظیماتِ ویدئوی درس‌نامه را گذاشتی؟»** ستونِ «سبکِ تصویر»
از ۷٫۹۶ در رجیستری بود و `lvStyleAt_` هر شب می‌خواندش — و **هیچ کنترلی روی تخته
نداشت**. تنها راهِ عوض‌کردنش ویرایشِ دستیِ شیت بود، و او شیت باز نمی‌کند. دقیقاً
همان چیزی که ۵٫۶۱ و ۷٫۳۵ نوشتند، و من با اطمینان گفتم «در تخته است» **بی اینکه
تخته را باز کنم**.

**و نتیجه‌اش دیدنی بود:** `lvStyleSuggest_` برای مجموعهٔ معرفت‌شناسی واژهٔ
«معرفت» را دید و «ساده و رسمی» داد — که **همان `LV_STYLES[0]` یعنی پیش‌فرض
است**. پس هشت سبکِ تازه برای مجموعهٔ او صفر تفاوت ساختند و کاور «مثل روزهای
دیگر» ماند. **قابلیتی که انتخابِ خودکارش همیشه گزینهٔ اول را بدهد، برای کسی که
فقط یک مجموعه دارد، وجود ندارد.**

**پیش‌نمایشِ رنگ عمداً هست.** نامِ «کاغذبری» نمی‌گوید چه شکلی است؛ انتخابی که
نتیجه‌اش را نشود دید انتخاب نیست. و «خودکار» یک گزینهٔ **صریح** است نه خانهٔ
خالی: «نگفته» با «بسپار به خودش» یکی نیست.

**دو: «ناظر به تمام موارد منو نظارت می‌کنه و عملکرد می‌سنجه؟»** جوابِ عددی‌اش
بود — ۳۴ گزینه از ۵۸ در هیچ سنجه‌ای — و **خودِ آن عدد هیچ‌جا دیده نمی‌شد**: در
`tests/run_dialogs_test.js` زندگی می‌کرد، یعنی جایی که فقط با گشتنِ عمدی پیدا
می‌شود. **بدهی‌ای که دیده نشود، بدهی نیست؛ معافیت است.**

`tools/build.js` حالا در هر ساخت از دو منبعِ واقعی می‌شماردش و در
`src/00_Config.gs` می‌نویسد، و `healthCheck` هر روز می‌گویدش — **در یادداشت‌ها،
نه در مسئله‌ها**: کارِ باقی‌مانده خرابی نیست، و قرمزی که هر روز برای کارِ در
جریان بزند خوانده نمی‌شود. دست‌نویس بودنش یعنی یک سال کهنه ماندن (۵٫۹۵)، و
سنجهٔ ۹٫۱ دوباره می‌شمارد تا عددِ کهنه ممکن نباشد.

**و وعده‌ای که عمداً داده نشد:** بخشی از آن ۵۸ گزینه **اصلاً خودکار اجرا‌شدنی
نیست** — انتشار در یوتیوب، ارسالِ تلگرام، بازگشت به نسخهٔ پشتیبان. برای آن‌ها
«اجرا» یعنی خرابی. گفتنِ «ناظر همه را می‌زند» راحت‌تر بود و دروغ.

**و عیبِ خودم در این نوبت، سومین بار در چهار نسخه، باز در ابزارِ شکستن بود.**
اسکریپتِ سوئیپ `tools/build.js` را نمی‌دواند، پس شکستنِ عمدیِ خودِ build هیچ
اثری روی مجموعه‌ها نداشت و «هیچ‌جا ننشست» داد. با دواندنِ build، روی ۹٫۱ نشست.
**هر سه بار فقط با اجرا پیدا شد، هیچ‌کدام با خواندن.**

**و یک تکهٔ کارِ خودم بی‌صدا اجرا نشده بود:** فرمانِ افزودنِ سطرِ گزارش با `&&`
به build زنجیر شده بود و build همان لحظه شکست، پس هرگز ندوید. با **شمردنِ**
`menuCover` در فایل پیدا شد، نه با خواندن — `grep -c` ارزان‌ترین راهِ پرسیدنِ
«آیا کاری که فکر می‌کنم کردم واقعاً نشست؟» است.

**و یک نگهبانِ قدیمی درست سرخ شد:** ستونِ تازه `colspan` ردیفِ جزئیات را کهنه
کرد و `run_board_test.js` همان لحظه گرفتش. ستونی که بدونِ آن اضافه شود جدول را
کج می‌کند و هیچ خطایی نمی‌دهد.

## «اگه نمی‌دیدم چی؟» — و جوابِ راست «هیچ» بود (8.11)

۱ اکتبر صاحبِ برنامه سطرِ قرمزِ `ytPublishTick` را **شانسی** در صفحهٔ
Executions دید و پرسید: «اگه نمی‌دیدم چی؟ ناظر پس چی کار می‌کنه؟»

**علتِ کوری ساختاری است و باید نوشته شود: Apps Script از درون هیچ راهی برای
خواندنِ تاریخچهٔ اجراهای خودش نمی‌دهد.** تریگری که وسطِ کار بترکد هیچ ردی
نمی‌گذارد — نه در سیاهه، نه در `_STATUS.json`، نه در ایمیلِ ۱۰ صبح. تنها جایی
که ثبت می‌شود یک صفحهٔ وب است که کسی به عادت بازش نمی‌کند.

**و ۷٫۴۴ دقیقاً همین شاهد را ساخته بود — برای یک تابع.** `nightDeath_` مهر را
**پیش از** کار می‌زند تا از کشته‌شدنِ اجرا جان به در ببرد. آن الگو درست بود و
نُه تریگرِ دیگر هرگز نگرفتندش؛ بدتر، شش نسخه پس از آن درِ دومشان را روی
`healthCheck` گذاشتند **چون مستقل است**، و هیچ‌کس نپرسید خودِ آن تریگرها را چه
کسی می‌بیند. **قاعده: وقتی برای یک مسیر شاهد می‌سازی، همان لحظه بپرس بقیهٔ
مسیرهای هم‌شکل چه کسی را دارند.**

**و شاهد عمداً در Script Properties است، نه در تبِ سیاهه.** چیزی که آن روز شکست
خودِ شیت بود (`Service Spreadsheets timed out`). شاهدی که در همان سرویسِ خراب
بنشیند، دقیقاً وقتی لازم است نمی‌تواند بنویسد — همان درسِ ۷٫۶۳ دربارهٔ
`mailQueue_`: صفی که مرده باید تحویلش بدهد، هرگز تحویل نمی‌دهد.

**و «نتوانستم بخوانم» با «نیست» یکی گرفته شده بود.** `getHub_` هر خطای
`openById` را «حذف شده؛ دوباره می‌سازیم» می‌خواند. یعنی یک وقفهٔ گذرای سرویس
موتور را به مسیرِ **ساختنِ هابِ تازه** می‌فرستاد؛ آن روز نجات پیدا کرد چون
`getFilesByName` فایل را یافت، ولی اگر درایو هم همان لحظه کند بود، ۲۹ مگابایت
داده رها می‌شد و `PK.HUB_ID` به یک هابِ خالی می‌رفت — **بی هیچ خطایی**. خطای
گذرا حالا سه بار تلاشِ دوباره می‌خورد و بعد **پرتاب** می‌شود؛ خطای واقعی فوراً
بالا می‌رود، چون تلاشِ دوباره رویش فقط علت را پنهان می‌کند.

**و عددی که با خودش مقایسه می‌شود، همیشه سالم است.** `_visuals.json`ِ درس ۵۷
نوشت `want: 1, ready: 1, done: true` — برای درسی که `ytVisWant_` خودش حدودِ
**دوازده** تصویر برایش خواسته بود و همان عدد در پرامپت رفته بود. `want` برابرِ
*آنچه از فیلتر زنده مانْد* گذاشته می‌شد و `done` با همان سنجیده می‌شد. سه جا
بی‌صدا می‌ریخت (بخشِ ناشناخته · موردِ چهارمِ یک بخش · سقف) و هیچ‌کدام شمرده
نمی‌شد. **نتیجه‌اش ویدئویی بود با پانزده دقیقه یک تصویرِ ثابت — بدتر از کاور.**
حالا `asked` کنارِ `want` می‌نشیند، دورریخته‌ها شمرده می‌شوند، و `LV_THIN`
حافظهٔ سومی است **جدا** از «منتظر» و «کم‌رفت»: این یکی پیش از انتشار است، یعنی
هنوز جبران‌شدنی (۵٫۸۸، با سه حالت به‌جای دو).

**دو شکستن از نُه تا هیچ‌جا ننشستند، و همان لو داد** که دو تعمیر بی سنجه مانده
بود (۸٫۰۴). هر دو سنجه ساخته شد.

**و نگارشِ اولِ خودِ شاهد یک نگهبانِ درست را خراب کرد.** بدنهٔ هر تریگر را به
یک تابعِ `__run_` منتقل کرده بودم؛ سنجهٔ ۹٫۵ که عمداً **فقط بدنهٔ خودِ
`healthCheck`** را می‌خواند (۷٫۳۹) سرخ شد و حق داشت. راهِ درست `try/finally` در
جای خود است، نه جابه‌جا کردنِ بدنه. و سنجهٔ خودِ ۱۷٫۷ هم اول یک پنجرهٔ ۲۶۰۰
نویسه‌ای می‌خواند و پنج تریگرِ بلند را «بی‌شاهد» می‌دید — سرخ‌شدن برای کدِ
**درست**، که ارزان‌ترین راهِ سبزکردنش بزرگ‌کردنِ همان عددِ دل‌بخواهی بود
(۷٫۵۹). بدنه حالا با تطبیقِ آکولاد برداشته می‌شود.

**آنچه این نسخه نمی‌کند، و صریح گفته می‌شود:** چرا مدل برای قسمت ۵۷ فقط یک
تصویر داد هنوز معلوم نیست — این نسخه فقط می‌شمارد و نام می‌برد. شمردن تعمیر
نیست؛ ولی بی شمردن، شبِ بعد هم همان اتفاق بی‌صدا می‌افتاد.

## پنجره‌ای که ممکن است چیزِ زیرِ سنجش را نداشته باشد (8.10)

صاحبِ برنامه این را **پیش از شنیدنِ نمونه** گرفت: «شاید تو اون نمونه که میشنوم
گیومه و یا این نشانه‌ها نباشه که ببینم به صورتِ واژه میخونه یا به صورتِ رعایتِ
لحن.» درست بود.

نمونه چهار هزار نویسه از یک درس است و مدل نشانه را جایی می‌گذارد که **معنا**
بخواهد. هیچ تضمینی نبود که `« »` یا `( )` در آن بیفتد — و آن دو **خطرناک‌ترین**
نشانه‌هایند، چون نامِ خودشان واژه است: اگر گفتارساز بلند بخواندشان شنیده می‌شود،
و اگر در نمونه نباشند هیچ‌وقت معلوم نمی‌شود.

**این همان شکلِ ۷٫۷۳ است، در بُعدِ دیگر.** آن‌جا پنجره در بُعدِ **زمان** کوتاه
بود — بیست ثانیه برای چیزی که صاحبِ برنامه در پانزده دقیقه می‌شنود. این‌جا در
بُعدِ **محتوا**: پنجره به‌قدرِ کافی بلند است و ممکن است آن چیز در آن نباشد.
**پیش از ساختنِ یک سنجه بپرس: آیا پنجره‌اش حتماً چیزِ زیرِ سنجش را دارد؟**

**مرزِ تازه: متنِ نمونه عمداً پرنشانه می‌شود، متنِ قسمت نه.** نمونه باید هر هفت
نشانه را داشته باشد تا بشود قضاوتش کرد؛ قسمت باید نشانه را جایی داشته باشد که
معنا می‌خواهد. یک پرچم، دو رفتار — و بی این مرز، هر قسمتی که منتشر می‌شود
پرنشانه می‌شد: عیبی که هرگز خواسته نشده، روی هر قسمت، هر روز. `run_speak_test.js`
۲۲٫۸ همین مرز را نگه می‌دارد.

**و سقفِ ترمیم در مسیرِ نمونه از چگالی به پوشش عوض شد.** متنی که `richPer1k`
بالایی دارد ولی گیومه ندارد هم ترمیم می‌خورد، چون پرسشِ آن نمونه دربارهٔ گیومه
است نه دربارهٔ چگالی. **سنجه را به سقفی ببند که پرسشِ واقعی را جواب بدهد.**

**و آنچه در نمونه نیست، به نام گفته می‌شود.** «در این نمونه نیست، پس دربارهٔ
این‌ها قضاوت نکنید: …» — سکوت این‌جا یعنی او چهار دقیقه گوش می‌دهد و خیال می‌کند
دربارهٔ گیومه قضاوت کرده، در حالی که گیومه‌ای نبوده. **«نسنجیده» با «سالم» یکی
نیست** — همان مرزِ «نامعلومِ» ۸٫۰۵.

**و عیبِ این نسخه در خودِ ابزارِ شکستن بود، نه در کد.** نگارشِ اولِ اسکریپتِ
سوئیپ فقط دنبالِ «❌» می‌گشت، پس شکستنی که فایل را **ناپارس** می‌کرد «سبز»
گزارش می‌شد — ابزاری که ساخته شده بود تا سنجهٔ توخالی را پیدا کند، خودش توخالی
بود، و یک «landed nowhere»ِ دروغ داد. حالا کرش را از نشستن جدا می‌کند. **اگر
شکستنی هیچ‌جا ننشست، اول خودِ ابزار را بررسی کن.**

**و یک سنجهٔ خودم واژه‌آراییِ پرامپت را می‌سنجید، نه محتوایش:** فهرستِ هفت نشانه
حالا از `SPEAK_MARK_NEED` خوانده می‌شود، وگرنه نشانهٔ هشتمی که فردا اضافه شود
سنجه را سبز می‌گذاشت (۷٫۵۹).

## نگهبانی که درمانِ نسخهٔ بعد را نمی‌شناسد (8.09)

۸٫۰۸ لحن را به نشانه‌های خودِ متن سپرد. سدِ ۷٫۷۹ — که با خاموش‌بودنِ دستورِ لحن
نمونهٔ روح را رد می‌کند — **جلوِ همان درمان را می‌گرفت**: ۸٫۰۷ قالبِ پیشوندی را
خاموش کرد، پس روی مدلی که فیلدِ دستور را رد می‌کند `ttsCueStatus_().ok` false
است، و نمونه‌ای که **برای سنجشِ همان نشانه‌ها** ساخته می‌شود هرگز ساخته نمی‌شد.

**این شکلِ ۷٫۴۶/۷٫۶۲ است از یک زاویهٔ تازه، و زاویه را باید نوشت:** آن‌جا درمان
روی راهی گذاشته شده بود که پیموده نمی‌شود؛ این‌جا راه باز است و **نگهبان نمی‌داند
درمان چیست**. سدی که برای دنیای قبل درست بود، در دنیای بعد عیب شد — بی آنکه یک
خط از خودش عوض شده باشد. **هر نسخه‌ای که راهِ تازه‌ای برای رسیدنِ یک چیز می‌سازد،
باید سدهای آن چیز را هم دوباره بخواند.**

**سد باریک شد، نه باز.** دو راه برای رسیدنِ لحن هست و امتناع فقط وقتی درست است که
**هیچ‌کدام** نباشد: دستورِ خاموش + متنِ نشانه‌دار ⇒ نمونه ساخته می‌شود؛ دستورِ
خاموش + متنِ بی‌نشانه ⇒ همان امتناعِ ۷٫۷۹، و پیامش می‌گوید **هر دو** نبودند، نه
نیمی از علت. علتی که نیمی‌اش گفته شود، خواننده را سرِ راهِ غلط می‌فرستد.

**و ترتیب عوض شد تا تصمیم ممکن باشد:** اول متن خوانده و نشانه‌گذاری می‌شود، بعد
سد قضاوت می‌کند. بهایش یک فراخوانِ **متنی** روی مسیرِ ردشدن است — در برابرِ چهار
دقیقه TTS که سد جلویش را می‌گیرد، ارزان؛ و بی آن، سد چیزی برای قضاوت ندارد.

**برچسب حالتِ سوم گرفت، چون هر دو حالتِ قبلی این‌جا دروغ بودند — هر کدام از یک
سمت.** «روح» دروغ است چون کارتِ شیوهٔ خواندن به مدل نرسید؛ «رنگ‌تنها» دروغ است
چون لحن از نشانه‌ها رفته — و این دقیقاً دروغِ ۷٫۷۹ از جهتِ مخالف است، که کمتر
دیده می‌شود و همان‌قدر بد است. «لحن از نشانه‌ها» نامِ خودش را دارد و در **کپشنِ
تلگرام** هم می‌آید، چون او آن‌جا می‌شنود نه در درایو (۷٫۶۸).

**و شاهد از رویداد می‌آید، نه از امید.** `prMarks` روی متنی سنجیده می‌شود که
واقعاً خوانده می‌شود — نه روی «ترمیم گرفت یا نه»: جوابِ ردشده یعنی متنِ قبلی، و
متنی که از قبل نشانه داشت هیچ ترمیمی نخورده و باز هم شاهد دارد.

**و چیزی که عمداً نشد:** شمارندهٔ تازه‌ای در `vbrStatus_` و خطِ روزانه برای این
حالت. ایراد نیست، و شمارشِ یک حالتِ سالم همان هشداری است که یاد می‌گیرند نخوانند
(۷٫۴۰/۸٫۰۵).

## لحن فقط از راهِ نشانه‌ها می‌رسد — و دو تا از سیزده نشانه می‌گذشتند (8.08)

صاحبِ برنامه پرسید «اونجایی که باید مثل با **تعجب** یا **سوالی** بگه چی؟» و جدولی
از سیزده نشانهٔ فارسی داد، و بعد: «باز اگر **ناقص** انجام بده چی؟»

**نیمهٔ اول جواب، یک اندازه‌گیری بود، و تلخ:** از آن سیزده نشانه فقط **دو تا**
(`،` و `—`) از `verifySpeak_` می‌گذشتند. `speakBone_` نشانه‌های `،؛:—–…` را
برمی‌داشت و `.!؟` را نگه می‌داشت، با این استدلال که «مرزِ جمله مالِ مدل نیست».
استدلال درست بود، پیاده‌سازی غلط: **هر نشانهٔ گویایی که او می‌خواهد، جای یک نقطه
می‌نشیند.** «بود. تو» ⇒ «بود… تو» یعنی نقطه رفت و سه‌نقطه آمد؛ پوستهٔ قبلی
سه‌نقطه را برمی‌داشت و نقطه را نگه می‌داشت، پس دو متن یکی نمی‌شدند، وارسی رد
می‌کرد و آن بخش **بی‌اعراب** خوانده می‌شد — همان باگِ ۶٫۲۰، این بار برای لحن.
یعنی خواستهٔ «بهتر بخوان» نتیجه‌اش «بدتر بخوان» بود، بی هیچ خطایی و بی هیچ
یافته‌ای. و این مهم‌تر از یک باگِ معمولی است، چون این خانوادهٔ مدل **هیچ فیلدِ
دستورِ لحنی نمی‌پذیرد** (۷٫۸۹، ۸٫۰۷) — پس نشانه‌ها تنها راهِ رساندنِ لحن‌اند.

**یک سد دو کار می‌کرد و یکی را بد انجام می‌داد.** `speakBone_` از این پس فقط
**هویتِ واژه‌ها** را می‌سنجد و `speakSentOk_` **شمارِ مرزِ جمله** را با برابریِ
سخت نگه می‌دارد: مدل حق دارد **رنگِ** پایان‌بندی را عوض کند، نه جایش را.
زیادشدن هم رد می‌شود، و سنجهٔ ۳٫۵ همان لحظه این را گفت — «بایستیم. و نگاه کنیم.»
بازنویسیِ ساختار است، نه لحن.

**و `؛` عمداً پایان‌بندی شمرده نمی‌شود، که سنجش گفتش نه استدلال:** متنِ نمونه‌ای
که خودم با لحن نوشتم رد شد، چون یک «،» را به «؛» ارتقا داده بودم و شمارِ جمله
یکی بالا رفت. نقطه‌ویرگول جای **ویرگول** می‌نشیند. و در جهتِ دیگر هم درست است:
«نقطه ⇒ ؛» واقعاً دو جمله را یکی می‌کند و باید رد شود.

**نیمهٔ دومِ پرسش («اگر ناقص انجام بده چی؟») عدد می‌خواست**، چون «ناقص» بی عدد
قابلِ تشخیص نیست — همان درسِ ۸٫۰۳ برای اعراب، که تا وقتی فقط می‌گفتیم «اعراب
بگذار»، ۱۳٪ واژه‌ها بی‌علامت می‌ماندند. `speakProsody_` چگالی را می‌شمارد و زیرِ
`SPEAK_PROSODY_MIN` یک فراخوانِ هدف‌دار **فقط** نشانه‌گذاری را می‌خواهد.

**و نگارشِ اولِ آن سقف هرگز نمی‌گرفت.** متنِ خبریِ بی‌لحنِ موتور `per1k` **۱۲٫۴**
می‌دهد، چون ویرگول خودش پرتکرار است — پس سنجه توخالی بود و این را فقط اندازه‌گیری
گفت. `richPer1k` ویرگول را نمی‌شمارد و همان متن **صفر** می‌دهد و نسخهٔ لحن‌دارش
۱۸٫۳. **ویرگول خوب است و لازم؛ فقط شاهدِ لحن نیست.**

**سه تکنیکِ جدولِ او عمداً انجام نمی‌شوند و دلیلشان نوشته شد**، وگرنه هر شب
«ناقص» گزارش می‌شوند: کشیدگیِ حروف، فاصله بین حروف و بولد **املای واژه را عوض
می‌کنند**، یعنی سدی را برمی‌دارند که جلوِ واژهٔ غلط را می‌گیرد؛ و ستارهٔ بولد به
گفتارساز می‌رسد و یا خوانده می‌شود یا نادیده.

**و نمونه‌ای که برای داوریِ لحن ساخته می‌شود باید لحن داشته باشد.** نمونهٔ روح از
متنِ **ذخیره‌شدهٔ** قسمت ساخته می‌شود و قسمت‌های پیش از ۸٫۰۸ آن نشانه‌ها را
ندارند — پس بی یک مرحلهٔ نشانه‌گذاری، نمونهٔ «لحن» همان متنِ صافِ دیروز را
می‌خوانَد: ۷٫۸۶ عیناً، «چیزی که برای سنجشِ یک پارامتر ساخته می‌شود باید آن
پارامتر را در خودش داشته باشد». و برچسبِ بذر عوض شد، وگرنه نمونهٔ دیروز «قبلاً
ساخته شده» حساب می‌شد.

**یک شکستنِ عمدی هیچ‌جا ننشست، و همان لو داد.** سدِ «گویاتر نشد ⇒ همان قبلی» را
برداشتم و مجموعه سبز ماند — یعنی یا سنجه توخالی است یا کد مرده (۸٫۰۴). این‌بار
اولی بود، و باری که آن سد برمی‌دارد همان دروغِ ۷٫۷۹ است: جوابی که **فقط ویرگول**
اضافه کند از وارسی می‌گذرد و لحن نمی‌آورد، و یادداشتش «۰ ⇒ ۰ نشانهٔ گویا» می‌شد —
برچسبی بی هیچ ورودی.

**و تلهٔ بدَلِ آزمون، بارِ چهارم در یک فایل.** `run_v4_tests.js` هر پرامپتی را که
فیلترهایش نشناسند در `writerPrompts` می‌ریزد؛ فراخوانِ تازهٔ ۸٫۰۸ فیلتر نشده بود،
پس `writerPrompts[1]` دیگر پرامپتِ نویسندهٔ دوم نبود و سنجهٔ «ارجاع‌ها به نویسنده
رسید» سرخ شد. یادداشتِ خودِ آن فایل سه بارِ قبلی را نوشته بود («همان تلهٔ
اعراب‌گذاری»). **هر فراخوانِ مدلِ تازه، یک فیلترِ تازه در آن بدَل می‌خواهد.**

**و یک شکافِ سیم‌کشی را سنجهٔ ۵۶-پ.۳ گرفت:** پرامپت را «نُه ردیف» کردم و کلیدِ
`speak-prosody` را به `CFG.MONITOR_CHECKS` اضافه نکرده بودم — دقیقاً همان
«سیم‌کشی» که ۸٫۰۵ بدترین حالت می‌داندش، چون چیزی برای دیدن نیست.

**آنچه هیچ سنجه‌ای در این مخزن ثابت نمی‌کند:** اینکه گفتارساز این نشانه‌ها را
واقعاً به **لحن** ترجمه می‌کند، و اینکه «گیومه» یا «پرانتز» را به‌صورتِ **واژه**
نمی‌خواند. هیچ کدی نمی‌شنود. پس §۴٫۱۴ پرامپتِ ناظر (v84) شمردن **و شنیدن** را هر
روز اجباری می‌کند، و خواندنِ نشانه به‌صورتِ واژه یافتهٔ «جدی» با مسئولِ «کد» است.

## شاهدی که انبارِ عقب‌افتاده را می‌سنجید و نامش «فعالیت» بود (8.06)

«❌ ۸ روز است تسکِ غنی‌سازی کاری نکرده» — و **همان ایمیل** `lastUsedAt` را با
تاریخِ همان روز داشت. آن مهر تنها وقتی می‌خورد که پاسخِ تسک رسیده و ادغام شده
باشد، پس تسک کار کرده بود.

علت یک خط است: نگهبان پوشه را پیمایش می‌کرد، و `trashEnrichFiles_` هر پاسخ را
**پس از مصرف** پاک می‌کند. یعنی آن عدد در واقع **انبارِ عقب‌افتاده** را می‌سنجید.
نتیجهٔ مستقیمش را باید نوشت چون ضدِشهود است: **خطِ لوله‌ای که سریع‌تر مصرف
می‌کند، خراب‌تر به نظر می‌رسد** — مدرکِ کار پیش از آنکه نگهبان ببیندش پاک می‌شود.
پیش از ساختنِ زنگ روی یک شمارش، بپرس *این عدد با درست کار کردنِ سامانه بالا
می‌رود یا پایین؟*

**و نگارشِ اولِ تعمیر، جداییِ ۷٫۳۲ را پس گرفت:** بزرگ‌ترِ دو شاهد را از هر دو راه
برمی‌گرداند. تقسیمِ کارِ درست این است — **جمله‌ها دو عدد را جدا نشان می‌دهند، زنگ
تازه‌ترین را می‌گیرد.** سنجهٔ قدیمی همان لحظه سرخ شد و درست هم بود؛ یک سنجهٔ کهنه
که برای کدِ تازه سرخ می‌شود، همیشه اشتباهِ سنجه نیست.

## شمارهٔ سنجه، قابلیتِ ارجاع است — نه آرایش (8.06)

دو سنجه با یک شماره یعنی روزی کسی «۱۶.۴ سرخ شد» را می‌خواند، می‌رود سراغِ آن
یکی، و «تعمیر»ش سنجهٔ دیگری را سبز نگه می‌دارد در حالی که عیب سرِ جایش است. کلِ
این مخزن با شمارهٔ سنجه حرف می‌زند — همین پرونده، پیامِ نسخه‌ها، و پرامپتِ ناظر.

`run_wiring_test.js` ۱۰.۱ جفتِ تکراری را می‌گیرد. ۷۰ جفتِ موجود **بدهی** ثبت شد
نه معافیت، چون شماره‌گذاریِ دوباره‌شان هر ارجاعِ موجود را باطل می‌کرد — و ۱۰.۲
فهرست را یک‌طرفه نگه می‌دارد: جفتی که درست شد باید از فهرست بیرون برود، وگرنه
بدهی به معافیتِ همیشگی تبدیل می‌شود.

**و آن نگهبان با اجرا پیدا شد، نه با خواندن:** نگارشِ اولش هر مجموعه را می‌دواند
تا برچسب‌ها را از خروجیِ واقعی بخواند — که روشِ درست‌تری بود و **خودش را هم صدا
می‌زد**، یعنی بازگشتِ بی‌پایان. جایش خواندنِ ایستای متن است، با محدودیتش نوشته:
برچسبی که در زمانِ اجرا ساخته شود دیده نمی‌شود.

## ریشهٔ تلفظ: عددی که فقط اندازه گرفته شد (8.03) و سپس تصمیم شد (8.04)

«هندسه» را `handese` می‌خواند و «پی‌ریزی» را `pirizi`. چهار واژه در تبِ «تلفظ»
همان چهار واژه را می‌بندد و فردا واژهٔ دیگری بی‌علامت می‌مانَد؛ صاحبِ برنامه
درست گفت: «منظورم بستنِ ریشه‌ای مشکل بود.»

ریشه عددِ ۸.۰۳ است: **۲۰۷ واژه از ۱۵۸۴ (۱۳٫۱٪) هیچ اعرابی نمی‌گرفتند**، در حالی
که موتور «۱ بخش از ۹۵ (۱٪)» گزارش می‌کرد — **بخش** شمرده می‌شد نه **واژه**. و
۸.۰۳ آن را اندازه گرفت و به هیچ تصمیمی سیم نکرد.

`speakBareWords_` واژه‌ها را **نام می‌برد** (تفاوتِ گزارش با اصلاح همین است) و
`speakFillBare_` در یک فراخوانِ هدف‌دار فقط همان‌ها را دوباره می‌پرسد — نه
بازنویسیِ کلِ متن، که هم گران است و هم هر بار یک شانسِ تازه برای خراب کردنِ چیزی
که درست بود. **سدِ هویتِ حروف** جوابی که حرفی کم/زیاد/عوض کرده را دور می‌اندازد،
پس بدترین حالت «همان واژهٔ بی‌علامتِ قبلی» است نه واژه‌ای غلط که پس از وارسی
می‌نشیند و هیچ سدی پشتش نیست. مرزِ واژه با نویسهٔ قبل و بعد سنجیده می‌شود، چون
فارسی `\b` ندارد — بی آن «هندسه» داخلِ «مهندسه» هم عوض می‌شد.

**و دو تکهٔ کدِ مردهٔ خودم در همین دو نسخه با شکستنِ عمدی پیدا شد** (سدِ «جوابِ
بی‌اعراب»، و شاخهٔ `[ T]` در الگوی تاریخ): هر دو شکستنشان هیچ سنجه‌ای را سرخ نکرد
و **همین لو داد**. شکستنی که هیچ‌جا نمی‌نشیند، یا سنجه‌ات توخالی است یا کدت مرده
— و هر دو باید فهمیده شوند، نه یکی.

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

## A new speaker is a folder, not a code change (section 33, 7.21)

The owner asked: «آیا تو درایو فولدری هست که صدای نمونهٔ جدید بذارم و اسم گوینده
رو روش بذارم و تو در بررسی‌های روزانه بری چک کنی و خودکار روش کار کنی و وقتی
تموم شد اعلام کنی و نمونه‌ها رو بفرستی؟»

**The folder already existed. He made it on 2 September.** For eighteen nights
the engine reported «voice cloning» in `outLayout.strays` as an unknown folder,
and every night it was dismissed as «کارِ شما — کم‌اهمیت». Nobody asked *why a
folder called "voice cloning" was sitting in a repo that has a voice-cloning
model*. A stray with a meaningful name is not litter; it is **an intention that
never reached the code**. That rule is now §۴٫۹٫۳ of the monitor prompt, stated
beyond voices: repeating a label is not analysis.

**The engine decides; the Action works.** Apps Script has no ffmpeg, no GPU and
six minutes. So this is the `_YT-RENDER.json` boundary again: `vintScan_` reads
the folder, `_VOICE-QUEUE.json` carries the work out (public-shared, because the
runner arrives as nobody), `voice-intake.yml` runs the chain, and the answer
comes back through `docs/voices.json` — which the engine already knows how to
read, because that is how `engine.gs` arrives every night.

**The single most dangerous line in this version is in `dsSig_`.** Until 7.20
`tools/voicetrain.py` held eight Razavi Drive ids by hand, so the production line
was single-speaker by construction. Making it read `VT_VOICE`/`VT_FILE_IDS` is the
easy half. The half that matters: **the speaker key had to enter the dataset
fingerprint** (`DS_SIG_VER` 2→3). Without it, Razavi's cached dataset counts as
"present" for a new speaker, `buildDataset_` never runs, and the second person's
model trains on the first person's voice — with no error anywhere. That is
exactly the shape `freshStart_` was written for («دادهٔ تازه، ادامه نیست»), only
this time between two people instead of two datasets.

**`VOICE` is the one definition of "which speaker".** It already named the logs
folder and the weight files. A second «speaker» variable was drafted and deleted:
two names for one thing means that one day the fingerprint belongs to one person
and the weights directory to another, and nothing shows it.

**And the twin got fixed with it.** `voice-lab.yml` had `-n voice-razavi` written
flat. The moment `voice-train` produced `voice-<key>`, that line broke for every
new speaker. Fixed in the same change — a symmetry fixed once is fixed once.

**Every lesson in this file was applied in advance, not after the loss:**
a request unanswered for `VOICE_STUCK_DAYS` is itself a `NEEDS_CODE` finding (the
music bank took seven weeks to learn that); `رهاشده` is counted separately from
`عقب‌مانده` (5.88); the queue's file id is pinned *and* watched (`vintQueueIdOk_`,
the `YT_QUEUE_ID` trap); an unusable file is reported by name, never silently
skipped («قالب ناسازگار»); sharing is revoked *before* archiving, because the
scan cannot see an archived folder and the share would leak forever; nothing is
ever deleted; and `voiceIntake.line` is present every single day, including the
days when there is nothing to say.

**`preexisting` exists for one sentence that would have been a lie.** Razavi was
trained by hand, weeks ago. Seeding him as «آماده» is necessary (otherwise the
nightly re-queues him forever), but announcing «✅ گویندهٔ تازه آماده شد» for him
would be a false headline — and one false headline is how the true ones stop
being read.

**What this section deliberately does not do:** it never puts a voice on an
episode. The bridge is not built, and the owner said «تا نگفتم سمت پل فعلاً نرو».
A ready model is half the work, and the guide in Drive says so in plain words
rather than letting the silence imply otherwise.

## Searching 112 MB you are not allowed to read (section 34, 7.23)

The owner wanted to find something he half-remembers — "that clip where the guy
talked about being afraid of losing money" — across **everything**, both with and
without AI, ranked by meaning rather than date.

**One measurement decided the whole design.** The 20 September backup gives the
real sizes: the hub is 29 MB and the five source sheets are ~112 MB together. No
design built on "read it all and scan" survives Apps Script's six minutes — it
would either lie or quietly return a partial answer. `createTextFinder` runs
*inside* Sheets and returns only the addresses of matches, so the data size stops
mattering and "all of it" is a fact rather than a claim. Only matching rows are
ever read. **Measure before you architect; the number picks the design.**

**Two layers, both on by default.** The hub is one row per file with topic,
message, summary, body and the file's own link — what the engine understood. The
sources are the raw, uncapped text: what the hub truncated at 1,500 characters is
whole there, which is the only place a single sentence from the middle of a long
video can be found.

**Persian spelling is where a literal search fails.** The user types «کتابخانه»
and the sheet holds «كتابخانه» with an Arabic kaf; or ZWNJ against a space; or
«۱۴۰۴» against «1404»; or this engine's own diacriticised spoken text against an
undiacriticised query. All four returned "not found" — the worst possible answer,
because the user concludes the thing does not exist when only the search failed.
`srchPattern_` compiles the query into a pattern that swallows every one of them.

**Ranking is by content, never by date** — the owner said so explicitly. Where a
term was found is weighted, coverage beats repetition (four of five terms outranks
one term four times), and an intact phrase earns a bonus. Date contributes nothing.

**The AI mode is two calls, and the first one is the important one.** Expansion
comes before ranking: the user says "afraid of losing money" and the text says
«زیان‌گریزی» or "loss aversion". Without that bridge, a semantic reranker has
nothing to rerank. The model proposes and the code decides — an id outside the
candidate set is dropped, because a fabricated id is a link that goes nowhere.
When the model is unavailable the lexical result still comes back **and says so**.

**It writes nothing to the sources, and the boundary is stated exactly.** No row,
no name, no format — held by a test that checks a source row is untouched after a
full search, and nothing is created in Drive either. But 7.23 shipped a wider
claim than was true: calling `getHub_()` can repair the hub's tabs, as it does
everywhere else in the engine. That is not this section writing, but it is not
"nothing is written" either. **A safety claim that is slightly false is worse
than no claim**, because it is the one nobody re-checks.

**And the honesty rule, which its own test caught.** Every answer reports how many
tabs were searched, how many rows were candidates, and how long it took — and says
plainly when a cap or the time budget stopped it. The first version only noticed
truncation when it moved on to the *next* tab, so a cap reached on the last tab
was silent. A partial search that presents itself as complete tells the user "it
isn't there" about something that is.

## The bridge (section 36, 7.36)

«بساز این پل لعنتی رو … بساز و بسنجش و ناظر باید همیشه حواسش بهش باشه.» The
standing prohibition — «تا نگفتم سمت پل فعلا نرو» — was lifted by the owner in
those words, and the three verbs are the shape of the work: build, measure, watch.

**What the bridge is, stated once so it is never confused again.** Section 32
changes the *way* a text is read (pauses, phrasing, range) and converts nothing.
Section 33 *trains a model*. Neither one changes the voice of an episode. The
bridge is the missing piece: this episode's own WAV leaves, is converted with the
speaker's model, and comes back into that episode's folder.

**It reuses the `_YT-RENDER.json` division of labour exactly.** Apps Script has no
ffmpeg, no GPU and six minutes — the same wall section 27 hit for video. The
answer was already built and proven over 180 runs: the engine shares the file
«anyone with the link» and queues it, the Action converts and uploads the output
as a **release asset**, the engine fetches it and revokes the share. Artifacts
were deliberately not used: they die after thirty days and cannot be downloaded
from outside Actions. Building a second path would mean two places to fail and
half a history in each.

**The published audio does not change, and that is a decision rather than an
omission.** The converted file sits *beside* the original under a name that
announces itself. Change the voice of a daily podcast before anyone has heard it
and there is no taking it back tomorrow: the episode is out, the email is out,
Telegram is out. `VBR_REPLACE` is that switch and it is off. The daily line says
so **every day**, because the absence of that sentence could be read as "it took
over".

**The original is never touched**, even when the conversion is good. If it later
turns out to be bad, the file is still there.

**The model is copied into OUTPUT, not shared where it lives.** «voice-models»
sits outside OUTPUT, and this file's first rule is that writes go to OUTPUT only
— changing an ACL out there is reaching into a place we do not have permission
for. Copying is a read there and a write here. The side benefit is that the model
stops depending on an artifact that expires on 17 October. The copy is named after
the speaker key, because two speakers sharing one filename is the `dsSig_` bug
again: one person's model counts as "present" for another, with no error anywhere.

**Every lesson this file already carries was applied in advance, not after the
loss:** returned bytes are judged by their RIFF/WAVE header rather than their
extension (`musicFetch_`, `ytMp4Ok_` — an error page also returns bytes); the
queue cap counts only "waiting to be built", never "waiting to be collected"
(6.37, which once locked the YouTube queue for two days while everything looked
healthy from outside); a request unanswered for `VBR_STUCK_DAYS` is itself a
`NEEDS_CODE` finding (the music bank took seven weeks to learn that); repeated
failure becomes «رهاشده», counted **separately** from «در انتظار» (5.88); the
temporary share is revoked before the row closes; and the daily line is present
every single day, including the days when nothing happened.

**With no speaker switched on, the bridge does nothing.** Which voice to use is
the owner's choice, not the code's guess — the key comes from the topmost enabled
row of «صداها», the same rule `personaFor_` follows.

**Two of my own assertions were wrong and the suite caught both**, which is worth
recording because each would have been silent in production: `vbrAudio_` read
`ytAudioParts_().files`, a key that does not exist (it is `parts`), so every
request was refused with "no audio in the folder"; and a cross-boundary assertion
matched `|| echo` inside a **comment** rather than in code — an assertion that
measures the wrong thing is worse than none, because it goes green and nobody
looks again.

## The third layer of the same door (7.50)

7.48 shipped at 11:10 with `sourceReportIds: ["tts-cue-unsupported"]` — the first
row this queue was ever going to close by its own rule. **An hour later 7.49
landed on main with its own list**, and because the engine installs only the
**highest** version, 7.48 would never install and that row would never close.

**And a skipped version is the normal case, not an accident.** Today the engine
went 7.43 → 7.46 directly; four writers push to this repo. Any list bolted to one
version leaves with it.

`answers` is a map in the manifest that is only ever **added to** —
`{version: [keys]}` — and the engine applies the **union of all of it** at every
install. A writer adds their own row and never needs to know which version
installed; closing an already-closed row is a no-op, so repeating the union costs
nothing and no state is kept anywhere.

Three layers of one door, found in three steps: 7.42 put it behind a manual step,
7.48 found its key was not obtainable, and 7.50 found it opened for only one
version. **Each fix was correct and each left the next layer standing** — which is
the argument for checking a fix against what actually happens next, rather than
against the bug it was written for.

**And one of the two new assertions measured nothing on first check.** «a string
instead of a list closes nothing» was green with or without the array guard,
because single characters matched no row id. The real boundary is that `for…in`
over a string keys every character — so the assertion now puts a row whose key is
one character in its way, and without the guard that row really does close. Fifth
time this week; the habit that catches it never changes.

## Three models refused, and the third road was never tried (7.89)

He listened to the Razavi sample and said the defect was still there, **on every
word**. It was — and the queue row had already said why, in the engine's own
words: `soul: «رنگ‌تنها»`, the style cue died **mid-build**.

**Three models, three days, the same refusal.** `gemini-3.8-flash-lite-tts`
(27 Sep 19:33), `gemini-2.5-pro-preview-tts` (29 Sep 07:01),
`gemini-3.1-flash-tts-preview` (30 Sep 03:29). The server's own sentence is
`Developer instruction is not enabled for this model` — a **model capability**,
not a bug in our payload. So `ttsCueSwitch_` was hunting for something that may
not exist in this family at all, and every hunt costs one episode its tone.

**And the third road was documented the whole time.** Gemini TTS is steered by a
prefix *inside* the content: `<instruction>: <text>`. That is not 5.59's raw
concatenation — there the model had to guess which line was an instruction; here
the colon is the boundary these models were trained on. And the guarantee is not
a hope: `ttsGuarded_` sends six seconds of the **output** back and asks what it
heard, rebuilding the chunk cue-less if the cue leaked. That guard was written
before this shape and is exactly the risk it was written for.

**The prefix is the last road, never the first**, because the two field shapes
cannot structurally be read aloud; and it is never cached as the preferred mode,
or the day a model does accept the field it would still go second.

**The map's meaning changed, and that is the fix that mattered.** «this model
rejects the instruction field» no longer means «throw the cue away». Before this,
that same map set `ttsCueStatus_().ok` false — and `ok` is the gate
`runVoiceSoulTest` asks before spending four minutes (7.79). On 30 September it
refused the second speaker's sample outright, with nothing wrong with that
speaker at all.

**But `ok` must keep an input.** With the field rejection no longer lowering it,
`ok` would have been *permanently true* — a flag with no input, and 7.79's spend
gate silently removed. So the one state where genuinely no cue is sent —
`TTS_CUE_MODE: 'off'`, the owner's own decision — now sets `ok=false`, and its
line says it is a decision rather than a fault.

**And the hole this very fix opened was closed in the same version.** The «روح»
label came only from that flag, so if the prefix *also* failed and the chunk was
built cue-less, the label would have said «روح» — the exact lie 7.79 exists to
prevent. `TTS_CUE_DROP_AT` is stamped at the one place the cue is really thrown
away, and `vbrSoulTag_` judges the **event**, not the flag.

**Five old assertions across four suites encoded the pre-7.89 belief**, and each
was re-aimed at what it was actually protecting rather than deleted — the 7.68
rule, applied to my own change.

**Three deliberate breakages landed nowhere at first**, and each reason is worth
more than the fix: one because the assertion's **evidence** argument was
unguarded, so the suite died with a TypeError before any assertion could report
— a break that *had* landed looked like a break that had not; one because the
test double labelled any body without an instruction field «prompted», so «the
cue went by prefix» and «the cue was thrown away» were the same label and the
regression could not show; and one because `CFG.TTS_CUE_MODE` leaked from the
block above, so the next assertions ran on an engine whose cue was off.

**What no suite here can prove:** whether Google actually honours the prefix.
That is answerable only by a real episode and a human ear. The engine now
reports it either way — the row is labelled from what happened during the build,
not from what we hoped.

## The same email said both things, and one of them was a real hole (7.88)

The 10:07 mail on 29 September carried two contradictory sentences about one
thing — «دستورِ لحن: **خاموش**» and «مدل عوض شد تا لحن برگردد» — and reported
«۲ نسخهٔ `_MUSIC-FEED.json`» when **one** file was on disk. The second half was
settled by opening Drive rather than by reasoning: one file, not two.

**One cause for both.** `writeStatus_` takes its snapshot at the top of
`healthCheck`, and the engine then repairs both things *inside the same run* —
`ttsCueSwitch_` moves the voice model, and the feed merge plus `putOutJson_`
collapse same-named files. So the mail printed a pre-repair snapshot as today's
state. A warning that fires for a state the same run already fixed is the warning
people learn to ignore, and this one fired twice in one email.

The cue line is now read **after** the switch, and the dup list is re-counted at
reporting time. The re-count costs nothing on a healthy day, because it only runs
when the stale snapshot saw something and a duplicated name is the exception —
the 7.63/7.72 rule, respected rather than restated.

**And underneath was the thing worth finding.** `ttsCueStatus_` was the last
reader of the pre-7.47 single key. 7.47 moved "which models should I avoid" to a
map and wrote in this very file that *a single string cannot answer that question*;
`resolveModels_`'s filter and `ttsCueSwitch_` both read the map from that day.
`ttsCueStatus_` kept reading `PK.TTS_CUE_OFF` and comparing `off === model`. So
when the live model was in the map but the single key held a **different** model
(the most recent rejecter), it answered "healthy" — and `ok` is exactly the gate
`runVoiceSoulTest` asks before spending four minutes (7.79). A soul sample could
be built with a model the engine already knew rejects the cue. The window is not
theoretical: the map fills at 07:01 and the model cache keeps pointing at that
model until the 10:00 switch.

**Two definitions of one predicate, thirteen lines apart**, and the one that
decided nothing was correct while the one that decided the daily line *and* the
spend gate was stale. That is the `srcJoinJs_` rule arriving in the smallest
possible form.

**The duplicate files, by contrast, were not a fault at all** — and checking that
before writing code is the part worth recording. `_ENRICH-*` is read through
`getOutJson_`, which takes the newest and logs that it did; `_MUSIC-FEED.json` is
merged in two places. Had I shipped the claim I started with ("duplicates are
dangerous"), the repo would now carry a new archive folder and a new prune for a
danger that does not exist.

**Two of my six new assertions built a state production cannot reach**, and only
running them showed it: one leaned on a `ttsModel_` double that this loader does
not rebind, and one hard-coded 29 September while the harness clock reads 18
August — so `ttsCueBadNow_` returned false on `age < 0` and the state was never
built at all. 7.22's rule: when a test constructs the state by hand, ask whether
the running system ever produces it.

## The sample that was to answer his complaint was itself flat (7.87)

He asked the shortest possible question: *what happened to the defect I raised
twice about Razavi?* The diagnosis had been right since 7.73 — that characteristic
in ~98% of the words **is** Gemini's flat reading seen from the other end, not a
conversion parameter, and `index_rate` went back to 1.0 at his own instruction.

**But the sample built to demonstrate that was flat too.** The queue row
«نمونهٔ روح — razavi:53» carries `at: 2026-09-27 19:37`, and `ttsCue` went off at
**19:33** the same evening — four minutes earlier. It was labelled «روح» and it was
colour-only: *exactly* the lie 7.79 found for Goldooz, in the sibling row, from the
same night. **Two rows written four minutes apart, one of them examined and the
other not.** 7.57's rule is that a contradiction is itself the finding; here the two
halves of one contradiction were the same shape in the same file, and nobody put
them side by side.

So the seed carries **two** rows now, both on **episode 53** — the same text, so two
voices are comparable on identical material rather than on whatever each happened to
get. And Goldooz's tag became «گام -2 و لحن», because two things changed for him and
a label naming one hides the other (7.79 again).

**And two seeds brought 7.75 straight back.** The scheduler only *schedules*; the
queue row is written a minute later by `runVoiceSoulTest`. So between two scheduler
calls `have[]` has not changed — and 7.86 took the **first** pending seed every time.
One seed that cannot enter the queue (a full queue, a missing model, the cue off)
therefore ate the whole daily cap and **the second speaker never got a turn**. That
is the button-that-works-once bug, one layer over, in code written three hours after
reading it.

The turn rotates off **the day counter that already existed** (`n % wait.length`), so
no new state is stored (7.82) — and the cap had to move *in front of* the queue read
to make that possible, which also means the day the cap is full costs no read at all.

**۳۳٫۱ deliberately asks nothing of the sheet**, because `vbrSoulSeedDue_` asks
nothing of the sheet: a test that builds more than production builds is taking a
different road than the one it names (7.44). All three new assertions were turned red
by breaking the code, and each landed on itself.

## Ten green assertions and the seed built nothing (7.86)

7.84 gave the soul sample a seed so the owner would not have to press anything.
It ran every hour for a day and **produced nothing**, and its message the whole
time was «برای همهٔ بذرها نمونه ساخته شده» — the healthy sentence.

**The cause is one line.** A soul sample's identity in `_VOICE-RENDER.json` was
`(speaker, episode)` and nothing else. The row «نمونهٔ روح — spk-1g0r95d:53» had
been sitting there since 27 September with status «رسید» — the **flat**, pitch-−12
file, built eleven minutes after the style cue died — so both the scheduler's
`have[]` and the picker's `already[]` answered "already built".

**And the identity ignored exactly what the sample exists to judge.** 7.81 moved
that speaker's pitch from −12 to 0 and 7.85 to −2; the sample is built to let his
ear judge that number, and the key could not tell two pitches apart. *When a thing
exists to measure a parameter, its identity has to contain that parameter.*

`tag` on the seed row is `EMB_TEXT_VER` (7.27) one section over: change it and a
new sample is built, leave it and nothing happens. **It stores no new state** —
idempotence comes from the queue gate that was already there (7.82) — and it rides
into the filename and the Telegram caption, because two files called «نمونهٔ رنگ و
روح — قسمت ۵۳» are indistinguishable where he actually listens.

**`vbrSoulShow_` is the one definition**, read by all four of the scheduler, the
picker, the queue scan and the row builder. Two definitions here would be worse
than the original bug: the scheduler would schedule every night and the picker
would refuse every night, with no error anywhere.

**And it is deliberately a label, not a setting.** The real pitch comes from
`personaPitch_` and nowhere else (7.30/7.31). The tempting version reads the pitch
in the scheduler so the tag is automatic — and `personaPitch_` without prepared
rows is `personaTab_()` → `getHub_()`, a tab-repair pass over the 29 MB hub, hourly:
7.63/7.72/7.82/7.84 for the fifth time, on the one trigger whose whole job is to be
cheap. ۳۱٫۳-ب already goes red for it.

**Why ten green assertions saw none of this.** Every 7.84 assertion emptied the
queue first. Not one built the state production was *standing in* — yesterday's
untagged row, «رسید». That is 7.75's rule arriving again: a test that constructs a
convenient state proves the convenient case. ۳۲٫۱ now builds the real one.

**And the other half of it was one layer over, in the workflow.** The engine
orders its *asks* correctly — 7.59 and 7.82 both put the explicit request ahead of
`vbrAskDue_`, with the sentence «چیزی که خواسته شده نباید پشتِ قسمت‌هایی که کسی
انتخابشان نکرده منتظر بماند». And then `pending()` consumed them in insertion
order and undid that arrangement: the nightly queues two ~25-minute episodes at
02:30 and the four-minute sample lands an hour later, so a 45-minute run budget
puts it two runs — four hours — behind. `label` has meant "this row is a sample,
not the episode" since 7.74, so it is the discriminator; the sort is stable so
order inside each group is untouched. **Nothing is lost by the reorder:**
`VBR_REPLACE` is off, so an episode's converted audio is not published and owes
nobody a deadline, while the sample exists to be judged now.

**Two of my five deliberate breakages landed somewhere else**, and both are
recorded in the test file rather than claimed: breaking the pitch cell read lands
on ۲۹٫۴ (§۲۹ runs first) and hard-coding the queue scan's prefix lands on ۲۴٫۱۳.
So ۳۲٫۴ is proved by the regression it is actually written for — the tag's number
being read as the pitch — and ۳۲٫۵ by its own unique half, the message naming the
tag.

## Eleven minutes, and the answer was in the engine's own mail (7.84)

He listened to the pitch-0 sample: *«خیلی بهتر شده بود ولی روح نداشت»* — much
better, but no soul. **The cause was measured, not reasoned**, and it is exact:

```
27 Sep 19:33  ttsCue OFF — gemini-3.8-flash-lite-tts rejected the style-cue payload
27 Sep 19:44  the source WAV was built   ← eleven minutes later
28 Sep 10:07  ttsCueSwitch_ moved to gemini-2.5-pro-preview-tts, which accepts it
```

Drive's `createdTime` for that file reads `15:44Z`, which is **19:44 Dubai** — the
timezone is the whole trick, and reading it as 15:44 local would have put the file
*before* the failure and inverted the conclusion.

So the file was read **flat**, and RVC changes timbre only: pause, stretch, rhythm
and emphasis are its **input**, not its output (7.34, restated in 7.73). 7.81's
pitch fix made the colour right; there was no soul in the file to convert. *No
conversion parameter can add a reading that was never performed.*

**And the fix he actually needs was one he could not reach.** A soul-carrying
sample has to be **re-read** with the speaker's style card — `runVoiceSoulTest` —
and that was a menu button only. 7.82 took the *conversion* request out of his
hands and left the *reading* request in them, which is the same half-delivery
7.41 is about, one function over.

`VOICE_SOUL_SEED` + `vbrSoulSeedDue_` close it, and the placement is the whole
design: ~four minutes of TTS on the hourly collector would eat the run and starve
collection (6.37 — a guest starves when its host does), so the scheduler only
*schedules* and the work lands in **its own one-shot run**, the `busyRetry_`
pattern with a per-day cap so a persistent refusal cannot loop a trigger forever.
All three of `runVoiceSoulTest`'s gates — empty style cue, missing model, and the
7.79 cue check before the spend — are untouched, which is why a refusal is cheap
and honest.

**His tick is deliberately not automated.** 7.74 defined that column as "build
this when I press the button"; acting on it by itself would change the column's
meaning without telling him. After the rewrite the scheduler cannot even see the
tick column, so that boundary is structural rather than a promise.

**And my own defect in this version was caught by an assertion already on the
page.** The first cut logged one line when it scheduled — and `logLine_` writes
the log tab, i.e. `getHub_()`, i.e. a tab-repair pass over the 29 MB hub, hourly.
`run_bridge_voice_test.js` ۲۶٫۳ went red. That is 7.63/7.72/7.82 for the **fourth
time**, and the new part worth recording is where it hid: not in the logic but in
the **reporting** — a line that looks free. The schedule is announced by the run
itself a minute later, which is the better record anyway.

**Seven of eight deliberate breakages landed on their own assertion.** The eighth
(restoring the `logLine_`) landed on ۲۶٫۳, because §۲۶ runs first — recorded in the
test file rather than claimed as proof (7.74), with ۳۱٫۳-ب keeping the same
boundary inside §۳۱ in case §۲۶ ever changes.

**One small honesty defect the suite also surfaced.** With a seed and no tick, the
"empty style cue" refusal still said «قسمت تیک خورده» — attributing to him an
action he never took. A wrong instruction is worse than none; it now says a
sample is queued for that row without naming a source.

## "You press it tomorrow" — and I could not, so the engine does (7.82)

He asked for the plainest thing: *press it yourself tomorrow morning and send me
the sample.* The answer was no, and **the answer was checked before it was
given** rather than after:

- Apps Script cannot be invoked from outside, so no menu function is reachable.
- `mcp__Google_Drive__update_file` changes a file's **title and parent only** —
  the bridge queue's content cannot be rewritten, and a second
  `_VOICE-RENDER.json` would be an `outLayout.dups` fault by design.
- The voice-lab artifact holding the pitch-0 audio returns **403 at the proxy**
  (`CONNECT tunnel failed`), which this file already recorded — and this time it
  was tested rather than believed.
- A **release asset**, though, downloads fine: HTTP 206, real RIFF/WAVE header,
  40 kHz mono. So the bridge's own transport is open; only the lab's is not.

**So the missing piece was never transport — it was that only a human could
queue the work.** `vbrAsk_` was reachable from the nightly sweep, the tick
column and the menu button. Judging a *new* speaker's pitch fits none of those:
his row is off, and an off row is his decision, not a fault. That left one hand
press per measurement, and **a measurement that depends on a manual step is the
measurement that does not happen** — the sentence this file already wrote about
`rvcSim_` and `voice-lab.yml`, now true of the thing voice-lab was measuring.

`VBR_SEED_ASKS` + `vbrSeedAsk_` is 7.64 taken literally: *the engine should
measure itself; the owner should not be the instrument.*

**It stores nothing, deliberately.** `vbrAsk_` already refuses a duplicate key
and the map already remembers a built one, so the list can be read every night
and every 10:00 forever with no flag anywhere — no one-shot a human cannot
reopen (5.95), no counter its own writer resets (7.22). Idempotence comes from
the existing gate rather than from new state.

**And the pitch is not in the seed.** `vbrAsk_` asks `personaPitch_`, so "this
speaker's pitch" keeps one definition. Writing it into the seed as well would be
two numbers nobody compares — 7.30/7.31, in a file written the same day as 7.81.

Two doors again, because the nightly block sits behind `nightHas_` and the night
that runs short is exactly the night the sample is wanted — 7.46 and 7.62, both
about a cure placed on a road never travelled. **But my first choice of second
door was wrong and the suite caught it:** reaching `vbrAsk_`'s duplicate gate goes
through `vbrMapCached_()`, a network call, so putting it on `healthCheck` was cost
on the function 7.63 recorded dying of cost — and in the harness it ate a mocked
response and shifted every later one (7.66). It lives on `vbrCollectHourly`'s own
hourly trigger instead: cheaper, off the health path, and twelve times a day
rather than one.
The seed drains **before** the automatic sweep, the order 7.59 set for ticks: a
thing that was asked for must not wait behind episodes nobody chose.

**One of six new assertions was vacuous in the same way as 7.81's, one section
over.** «the pitch comes from the speaker's row» compared it to
`personaPitch_()`'s own answer — `-12 === -12`, which a hard-coded default also
satisfies. It now puts a number in the row that is no default at all. And a
breakage aimed at it landed on ۲۹.۱ instead, because §۲۹ runs first; rather than
claim the proof, the test file records that ۳۰.۳ is proved by the regression it
actually guards — a `pitch` field appearing in the seed — which was tried and
does turn it red.

## He was right that I had attributed it to the wrong number (7.81)

7.80 said Goldooz sounded nothing like himself because his recordings are
11 025 Hz against a 40 kHz training target. He answered: **«شاید تو داری اشتباه
میکنی که اینو ربط به هرتز دادی»** — and he was right.

**Two facts and one inference, and only the inference was wrong.** The files
really are 11 025 Hz and `VT_SR` really is 40 000. But *that this caused the
complaint* was never measured. Training depth was checked next and killed the
second hypothesis too: `docs/voices.json` records **32 epochs for both** speakers.

**The cause was one global number.** `VBR_PITCH: '-12'`, whose own comment says
«همان ترکیبی که بالاترین عدد را داد» — measured for **Razavi**, because Gemini's
source voice is female-ish and he is a deep male, about one octave apart. Every
other speaker got the same twelve semitones. voice-lab run 67, same file he
called «افتضاح», `index_rate` and `protect` held fixed and **only pitch varying**:

| pitch | 0 | −3 | −6 | −9 | **−12** |
|---|---|---|---|---|---|
| out_vs_ref | **0.786** | 0.732 | 0.665 | 0.574 | **0.556** |

**Monotonic, and the range is 0.230 — ten times the 0.024 that 7.70 showed could
not distinguish anything.** So unlike `index_rate`, this parameter really does
discriminate, and its direction is unambiguous. And 0.786 is the highest number
this repo has ever recorded (Razavi's best was 0.744), which is the proof that
11 kHz was **not** blocking similarity. Band-limiting makes a voice sound
*muffled*; a wrong octave makes it *a different person*. His complaint was the
second shape.

**And `tools/voicelab.py` had written the answer on day one:** *«عددِ درست را
نمی‌شود از پیش دانست (**به صدای مبدأ بستگی دارد**) … پس به‌جای حدس زدن، چند گام
ساخته می‌شود و **شنونده** انتخاب می‌کند.»* For Goldooz that ladder was never
built and nobody ever listened. The analysis was written, was correct, and was
wired to a constant — the shape this file has now logged more times than any
other, this time inside the tool that states the rule.

**The number that measured him was not the number that made him, either.** The
lab's own default is pitch **0**; the bridge converts at **−12**. So the 0.708 in
`docs/voices.json` and the file he heard were two different things, and neither
was ever measured at his own pitch.

Now: a «گامِ تبدیل» column at the **end** of `PERSONA_HEADERS` (7.41), a box for
it on the voices board because a control away from its work is not found (5.61),
`VOICE_PITCH_SEED` filling only an **empty** cell and never overwriting his hand
(7.69, and the music scan that must not erase the curator's taste), and
`pitchSrc` on the queue row so «پیش‌فرض» can be told from «سنجیده‌شده» — a label
with no input eventually becomes a lie (7.79).

**Zero is a valid pitch and that is the dangerous line.** `Number('')` is 0, so
testing emptiness numerically would make the *best* setting for Goldooz behave
exactly like a blank cell and fall back to the −12 this version exists to escape.
Emptiness is tested as a string. And an unreadable entry is **refused by name**
rather than silently zeroed: silently zeroing a typo would leave him believing he
had set something while he gets another voice.

**Two of my twelve new assertions measured nothing, and only breaking the code
showed it.** «the row says where the number came from» was green with
`pitchSrc` hard-coded, because in that test state the true answer *was* «ردیفِ
خودش» — so the claim is now also asked in a state where the right answer is
something else. And the board-field assertion searched for the substring
`pt"+i`; renaming only the input's id left it green while the page was genuinely
broken, because `getElementById("pt"+i)` still contained that text. It now
extracts **both** ids and requires them equal — a button reading `null.value`
does nothing and raises nothing (5.61/7.43). A third breakage landed on an
unrelated older assertion (۸.۳) and had to be re-aimed before ۲۹.۸ was proved.

**And the general rule, because this is the second time in two days:** when the
owner says the diagnosis is wrong, the cheap move is to re-run the measurement
rather than defend the reasoning. Here it cost six minutes of runner time, and it
inverted the answer.

## What is not in the data cannot be made (7.80)

He asked two things about Goldooz's folder: *did you check and use all 27 files —
they look like more than 240 minutes to me?* And: *maybe you are repeating the
settings mistake we had with Razavi.* Both were right, and the second was truer
than he knew.

**All 27 were queued.** Nothing was skipped; the ids in `docs/voices.json` match
the folder exactly. So that half was fine.

**Then the files were opened.** Two of them, parsed frame by frame:

```
Binavayan (27).mp3 → 16 kbps · 11 025 Hz · mono · 13.1 min
Binavayan (20).mp3 → 16 kbps · 11 025 Hz · mono · 31.4 min
```

And `VT_SR` in `tools/voicetrain.py` is **40 000**. So the model was trained
toward 40 kHz on material that contains **nothing above ~5.5 kHz** — those
frequencies are not quiet in the recording, they are *absent*. A model cannot
synthesize what it has never seen. «اصلا مثل خودش نیست» is the arithmetic of
that, and no amount of extra data or extra epochs changes it.

**Nothing in the pipeline had ever looked at the sample rate** — not `vintScan_`,
not `voiceintake.py`, not `voicetrain.py`. The only place `16000` appeared was a
bytes-per-second constant in a *duration estimate*, which is a different thing
entirely. Meanwhile section 23 has carried this exact rule since 5.56, for music:
*«نرخِ نمونه < ۲۲ کیلوهرتز = یک ضبطِ گفتار»*. The knowledge was in the repo,
tested, commented — and wired to no decision in the one place where the entire
point of the work is sounding like a specific person.

**And the number that hid it was mine.** `vintEstMinutes_` assumed 128 kbps, so
93.9 MB reported as «۱۰۳ دقیقه». The real figure at 16 kbps is ~820 minutes —
**13.7 hours, three times Razavi's four**. That wrong number is why, the night
before, I told him the way forward was *more data*. It was never the amount. *An
estimate that is wrong by seven times is not a number*, and the cost of checking
it was opening one file.

The gate sits **before** the work, not after: ~20 hours of runner CPU stand behind
one queue row, so the refusal happens at the door (7.75) and says the measured
number rather than a label. It does not delete the speaker — his row stays, so
better recordings continue where they left off — and *unmeasured is not weak*
(7.40): only a positive measurement blocks. The probe is cached by file id,
because `vintStatus_` calls `vintScan_` and `writeStatus_` calls that, so an
unconditional multi-megabyte download would have landed on the hottest path in the
engine — 7.63 and 7.72 for the third time.

**And the thing he actually remembered is still true and still open.**
`VBR_PITCH` is a single global `-12`, whose own comment says it is «همان ترکیبی
که بالاترین عدد را داد» — measured for Razavi, on one source voice. Every other
speaker gets the same twelve semitones regardless of their own register. That is
precisely the class of mistake he described from Razavi's early days, and it is
named here rather than half-fixed: with 11 kHz source audio no pitch setting saves
Goldooz, so the order is recordings first, then per-speaker pitch.

## Both complaints were already answered in the engine's own files (7.79)

He listened to the two samples and said two things: Goldooz **«اصلا مثل خودش
نیست»**, and Razavi still has that characteristic of his voice in **all** the
words. Both were true, and the engine had written both answers down before I
said a single word about either.

**`_STATUS.json`, read today:**

```json
"ttsCue": { "on": false, "model": "gemini-3.8-flash-lite-tts",
            "since": "2026-09-27 19:33", "ok": false,
            "line": "… تکه‌ها بی‌لحن ساخته می‌شوند …" }
```

The voice model rejected the style-cue payload at 19:33 the night before. Both
samples were synthesized the next morning — so **neither carried the style card.
Both were colour-only.** The queue row said «روح», `voiceBridge.colourOnly` was
`0`, the engine told him «رنگ و روح، هر دو را دارد», and I repeated it twice.

**Two witnesses in one system, disagreeing every single day.** `ttsCue.line` went
out in the 10:00 mail saying «دستورِ لحن: **خاموش**» while the bridge row claimed
soul. That is 7.57's rule — *a contradiction is itself the finding* — and this is
its worst instance, because the disagreement was printed daily in the same email.

**Why `vbrSoul_` could not catch it.** 7.73 built it to read `ep.__persona`:
*was a reading style chosen?* — not *did the cue reach the model?* A witness that
cannot see the failure it was built for. And in the soul-sample path the label was
**hard-coded** `soul: 'روح'`, which is a claim with no input at all. *A claim with
no input eventually becomes a lie; the only question is when.*

So the gate now sits where the money is spent: `runVoiceSoulTest` asks
`ttsCueStatus_()` **before** the TTS calls and refuses, naming the model, the date,
and the fact that `ttsCueSwitch_` tries another voice model at 10:00. Refusing is
right here: the entire purpose of that button is judging the *soul*, so spending
four minutes to hand him yesterday's colour-only file again is both waste and one
more false claim. And if the cue dies *mid-build*, `vbrSoulTag_` labels the row
«رنگ‌تنها», because the Telegram caption is where he actually reads.

**And the second complaint was a number nothing was wired to.** `docs/voices.json`
recorded Goldooz at `similarity: 0.708` on ~103 minutes of data. Razavi's
**rejected** 39-minute model scored 0.712–0.726 on the same measure, and his
accepted one 0.744. So Goldooz is below the model we ourselves threw away — and
that number was in three places (`docs/voices.json`, `_STATUS.json`, the daily
line) while the headline said **«✅ گویندهٔ تازه آماده شد»**. Measured, recorded,
wired to nothing: the same shape this file has now logged more times than any
other.

`VOICE_SIM_MIN` (0.73, taken from those recorded numbers rather than invented)
changes the headline, not the row: the speaker stays usable because **the final
judge is his ear, not a cosine** — that is the whole lesson of 7.70, where the
similarity measure actively pointed the wrong way. And an *unmeasured* similarity
is not a weak one (7.40). The headline has one definition now, because it was
written in two places and fixing one would have left the other.

**He was right that I should have asked before calling Goldooz ready.** I had the
number that said otherwise.

**And my own cost assertion carried no load, twice.** First the test folder had no
`__speakSegs`, so with the gate removed the run died one step later and the TTS
count stayed 0 either way. Then, after fixing that, the cost assertion sat *after*
another one — and `ok` throws on failure, so it could never run. Both were found by
breaking the code and watching where the red landed, never by reading. The cost
claim now comes **first**, because it is the one that proves the refusal happened
*before* the work rather than after it.

## A ceiling whose reason changed, and the ceiling did not (7.78)

He did not ask for a fix. He asked **«از این به بعد … بازم همین مصیبت‌ها رو
داریم یا نه»** — will this keep happening? The honest answer was half bad news:
the crashes were closed, and the **waiting** would have repeated exactly as
before. So the answer had to be code, not a sentence.

**Two ceilings, and both were correct on the day they were written.** The
workflow converted one row per run, because a 19-minute episode is ~25 minutes of
runner time and a killed job loses the row it was mid-way through. The cron ran
every six hours, because one row every six hours was plenty when there was one
row a night. Then 7.74 introduced a **four-minute** sample and 7.75 made two of
them normal — and neither ceiling was revisited. Two ticks meant two runs, i.e.
up to twelve hours, and then up to fifteen more waiting for collection.
**A ceiling whose reason has changed while it has not is as much a bug as a
wrong ceiling** — and it is harder to see, because reading the code shows a
correct number with a correct comment.

**The original worry was right and its answer was elsewhere.** "A job killed at
the cap gives no output, not even for the one that finished" — true, and the
remedy is not a smaller batch: the map is saved after **each** row and 7.77 gave
the commit step `if: always()`. With those two, a batch loses nothing. The new
bound is time (`VBR_RUN_BUDGET_MIN`), and a new row only *starts* inside the
budget, so a row that starts always has its full window.

**The cheap probe exists so the cron can be frequent.** Installing torch and the
RVC libs is minutes; twelve times a day for nothing is waste. So the workflow
asks `voicebridge.py --probe` first — stdlib only, seconds — and gates the heavy
install on the answer. But **the program itself still always runs**, because
`dropCollected` has to delete the collected public asset even on a day the queue
is empty. And "is there work" has exactly **one** definition (`pending()`), asked
by both paths: two definitions is how one of them goes quietly stale and the
probe says "no" while work is waiting.

**The bottleneck moves; it does not vanish.** 7.77 gave collection a second door
(`healthCheck`, 10:00) and that made *collection* the slow part: tick at 11:00,
see nothing until 02:30. `vbrCollectHourly` gets **its own hourly trigger** —
deliberately not a guest of `syncCatalog`, which would be 7.63/7.72 again (cost
on the path someone is standing on, and `syncCatalog` calls `writeStatus_`, the
very place 7.66 mis-placed a network call), and deliberately not a guest of
anything else, because a guest starves when its host does (6.37). With no answer
waiting it is one queue read plus one small fetch; the 29 MB hub is read **only**
when something really landed, which is why `hub` is not passed in.

**And the row-to-row boundary is the dangerous line in this version.** `vblab` is
searched for `rvc-*.wav` and the **largest** file wins. Leave row one's output in
place and row two can upload the first speaker's audio under the second
speaker's name — no error, audible only. That is `dsSig_` again, between two
people. Both temp dirs are cleared before every row, and the assertion looks from
*inside* the row at what the previous one left behind.

**My first version of the "one definition" assertion counted call sites and
reported 3.** The line `def pending(q, mp):` matches the call pattern too. An
assertion that answers to its author's own regex is measuring the author, not the
code (7.69) — so the claim is behavioural now: on **one** queue, the probe and
the real run must agree, and a row already answered in the map must be "nothing
to do" for both.

## The work was done, and one unrelated line threw it away (7.77)

He ticked two rows last night. This morning both were «در انتظار», and his words
were «واقعا داری اذیت میکنی / نذاشتی لذت یه کار اتوماسیون رو درست بفهمم». Two
separate defects sat behind that, **both mine**, and they were found by reading
the workflow log rather than the code.

**One: my own fix left a name behind.** 7.76's asset-name repair replaced `base`
with `nm` and left one consumer of `base` seven lines below, in the closing `say`
of `main`. So run 27 did the *entire* job again — 235 s of conversion, a complete
261-second output, the asset uploaded to the release — and then died on the last
line with `NameError`. `py_compile` does not catch that class, and the four
assertions I had just written called `assetName` **on its own**: all green while
`main` was fatal. *A test that calls the function proves the function, not the
path* (7.62), fourth time in one week.

**Two, and this one cost more: the map had already been written.** `saveMap` runs
one line above the line that died. The only thing that kept the answer from
reaching him was the exit code — a non-zero exit skips the **next** workflow step,
and that step is the one that commits the map. So a complete conversion, an
uploaded asset and a written map were all thrown away because an unrelated
sentence could not be printed, and the next run would start from zero.
**Degradation goes toward completeness, not toward silence** — this file says
exactly that about `srchReadRows_`, and the same rule was missing one file over.
`if: always()` now runs the commit step; the job still reports failure, which is
honest, but finished work is not lost.

**Three: the collection had one road.** 7.39 gave the queue's *sharing* a second
path through `healthCheck`. 7.46 gave the queue's *writing* one, and wrote down
why. **Collecting the output never got one** — `vbrIngest_` is reachable only from
`vbrNightly_`, behind `nightHas_` in the nightly. So even a conversion that
succeeds at noon sits on the release until 02:30 the next night: up to 24 hours
of delay for the cheapest step in the chain. The same half-measure, three
versions in a row, in the same section, each time with the previous one's comment
on the page.

**What the automation still asks of him, stated rather than hidden.** One run
converts one row, a cap sized for a 19-minute episode (~25 minutes of runner
time) and not for a 4-minute sample. Two ticks therefore need two runs, and the
scheduled trigger is every six hours — so «a few hours» was wrong even with no
bug at all. Making one run drain the queue against a wall-clock budget is the
other half, and it is named here instead of being discovered by him again.

**And the guard that catches the first defect is a symbol-table read, not a
grep.** `run_voicepipe_test.js` ۱۷ walks every function scope in all thirteen
`tools/*.py` and reports any name that is loaded there but is neither local, nor
a module-level binding, nor a builtin. Restoring `base` turns it red while ۱۶.۴
stays green — which is itself the proof that §۱۶ could never have seen this.

## Looking only for the cost I added (7.72)

Today's 10:00 mail said it itself: *«وارسیِ سلامت وقت کم آورد و این بخش‌ها امروز
اجرا نشدند: دورِ ۱۰ صبحِ یوتیوب، کیفیتِ استخراج، صفِ داوریِ محتوا، ترتیبِ
قسمت‌ها، عصری‌سازی، مدل‌ها. (کلِ اجرا ۳۲۰ ثانیه)»* — six blocks dropped.

**The first thing I found was mine.** 7.68 called `musicStatus_()` in `healthCheck`
while `writeStatus_` had already built that very object into `st.music`, and 7.68
had *also* changed `musicStatus_` from reading one **column** to reading the whole
tab. That is 7.63's lesson — *do not put cost on the function that just died of
cost* — repeated one version after writing it down.

**And then the assertion said 4, not 2.** `musicStatus_` calls `musicSlotCounts_`,
`musicThinSlots_` and `musicCoverage_`, and **each one independently re-reads the
entire music tab** of a 29 MB hub. Those three predate yesterday by a long way.
Eight full-tab reads per health check; now one, read once and passed down.

**That gap is the lesson, not the fix.** I went looking for the cost *I* had added
and would have found exactly that, removed it, and reported "fixed" with
seven-eighths of the waste still in place. What stopped me was writing the
assertion before the fix and letting it report a number instead of a verdict. A
check that answers *how many* survives being wrong about *who*; a check that
answers *yes/no* does not.

The count is **reads**, never elapsed time — the double has no 29 MB spreadsheet
(7.60) — and all four halves of the fix were turned red by breaking them.

## The number that chose 1.0 now argues against it (7.70)

He listened to a whole fifteen-minute episode and reported something no test could
have: that characteristic in Razavi's voice — **a feature, not a defect**, the one
he describes as someone who has just woken up — was present in roughly 98% of the
words, and that does not match the long recordings he has heard of the man. Razavi
deploys it selectively. The conversion spread it evenly.

**My first word for it was «خش‌خش» and that was wrong**, and he corrected it. The
name matters because a wrong name makes the next person do the wrong work: nothing
here is being removed, the *proportion* is being restored.

`index_rate` is exactly that lever — the higher it is, the harder every frame is
pulled toward the speaker index, and the flatter the natural variation. It was set
to 1.0 on 18 September for one reason: it scored highest on `rvcSim_` (0.744
against 0.728). Lab run 66, four settings on one source:

| index_rate | 0.40 | **0.66** | 0.85 | 1.00 |
|---|---|---|---|---|
| out_vs_ref | 0.755 | **0.779** | 0.776 | 0.770 |

**The order flipped.** The whole range is 0.024, and it inverts when the source
changes — so that number was never distinguishing these four at all. And the deeper
problem is what it rewards: speaker-similarity cosine pays for *more of his texture
everywhere*, which is precisely the artefact he complained about. **A measure that
does not measure the goal must not make the decision** — the fifth instance of that
shape in this file, and the first where the measure was actively pointing the wrong
way rather than merely silent.

**And the inline default had to move with it.** `String(CFG.VBR_INDEX_RATE || '1.0')`
would silently restore the rejected value the day that config key went missing. Two
numbers in two places that nobody compared (7.30/7.31), now compared by an assertion
that reads both from source.

**One of the two new assertions went green on an empty queue.** `!seen || …` is true
when there is no row, so it proved nothing; it now enters where production enters —
tick an episode, call `vbrAskDue_`, read the row that was actually written — and an
empty queue is itself a failure. And my first deliberate breakage landed on the
*other* assertion, because it destroyed the text pattern too; a breakage that lands
on a different assertion does not prove the one you aimed at.

## Ten green assertions and nobody had pressed it twice (7.75)

He asked the plainest possible follow-up: *how do I run this test for **both**
Goldooz and Razavi?* Two defects fell out of the question, and 7.74's ten new
assertions — all green, all deliberately falsified — had seen neither.

**One: the second press did nothing.** `vbrSoulPick_` returned the **first**
eligible row, so with both speakers ticked every press asked for Razavi again and
`vbrAsk_` refused it with «قبلاً خواسته شده». The second speaker could never get a
turn. A button that works once, for a person who has two speakers, is half a
feature. A (speaker, episode) pair already in the queue is now skipped, so the
second press walks to the next one by itself — and «all the ticks already have a
sample» is reported as its own state, because saying «nothing is ticked» there
tells him his tick was lost.

**Two: the second speaker has no model, and the message did not say what to do.**
This is not a rare fault; it is **the normal state of every speaker after the
first**. The trained model lives in a GitHub artifact, which cannot be downloaded
from outside Actions, and `UrlFetchApp` caps a response at 50 MB while the model is
larger — so there is no route the engine can take. It has to be placed in Drive by
hand, once. `vbrModel_` said «مدلِ X … نیست» and stopped there; the two filenames it
actually looks for (`<key>.pth`, `<key>.index`, named after the speaker key, not the
person's name) were never stated, and a wrong filename is another silent failure.
It now names both files and the folder — 7.45's rule, one section over.

**And the check moved in front of the work.** Four minutes of TTS calls followed by
"there is no model" at the queue is both wasted spend and a late message. He is
standing in front of the dialog when he presses it; that is the one place the
sentence gets read.

**The lesson is about the test, not the code.** Every 7.74 assertion exercised one
speaker. None built the state he actually has — two rows, both ticked — so the room
was measured and the door was not (7.44). *When a feature is about "several", a
test with one proves the singular case only.*

**And my first version of the new model-gate assertion built the wrong state:** I
removed Goldooz's seed to make the model "absent", but `vbrModel_` had already
copied that seed into the folder on the previous successful run, so four chunks were
synthesized and the assertion measured a different road. It uses a speaker who never
had a model. The sibling assertion ۱٫۵ had the mirror defect — it searched the
message for the word «بذر», i.e. it tested the wording rather than the claim, and it
went red on correct code the moment the wording improved.

## «It cannot be done» was true and was half an answer (7.74)

He asked: can I do the episode-49 test with Goldooz too, **with colour and soul
together**? And: how? 7.73's answer was "not on an already-produced episode — the
reading is baked into that WAV, so the bridge can only change timbre." That is
true, and stopping there made it a refusal rather than an answer.

**There is a third road, and it is neither of the two I had named.** Not
re-producing the whole episode, and not an invented sample: take **that episode's
own vowelled text** (`__speakSegs[i].t`, which 7.73 made durable), read it with
**that speaker's own style card**, and send that file through the ordinary bridge
so it gets the colour too. `runVoiceSoulTest`. The output arrives in Telegram like
any other conversion.

**~4 minutes, and the reason is stated rather than hidden.** Fifteen minutes means
~15 TTS calls and a resumable machine, and that machine is `renderAudioStep_` — the
one part of this repo that should not be disturbed without cause. Four minutes
today beats fifteen minutes never, and the full-length road (turn the row on
*before* the next episode is produced) is named in the same message. Both roads,
not one.

**No new control was built.** It reads the «قسمت‌های تولیدشده» tick column 7.59
already gave him — a control that sits somewhere other than the work it controls
does not get found (5.61). And it reads **only** that column, never «قسمت‌های
موردی»: 7.59 separated them because one is "audio exists now" and the other is
"an episode not yet made", and an unmade episode has no text to read. Accepting
ticks there would be a promise that is always silently refused.

**A ticked row with an empty style cue is refused by name.** `personaFor_` drops
such a row without a word, and there that is right — one fewer mode is a quality
loss. Here he ticked an episode and is waiting for something; silence means he
never learns why it did not come. Same shape, opposite correct answer, reasoned
each time rather than copied (7.41).

**The style flag is re-stamped before every chunk.** `STYLE_PROBE_TTL_MIN` is five
minutes and its own comment says "longer than any sample build" — true for one
line, false for four minutes. Expiring mid-run means the **second half** of the
sample is built with no reading style at all, two files that still cannot be
judged, and no error anywhere. That is 7.10's bug with a new clock.

**And the queue row carries a label**, so the file name and the Telegram caption
do not say «قسمت ۸۸ با صدای …» about four minutes of episode 88. 7.73 was written
about exactly that half-claim; repeating it one version later would have been the
same mistake with my own fix on the page.

**The new OUTPUT subfolder went into `outRootFolderNames_` and `docs/drive_layout.md`
in the same commit.** `_VOICE-RENDER.json` spent weeks being reported as «چیزِ
ناشناخته» in the engine's own map (7.46); a new root entry ships with its
recognition and its row, or it becomes litter in its own map.

**One deliberate breakage landed on a different assertion, and that was the
stronger outcome.** Removing «کامل» from the sample's filename turned ۲۴.۳ red —
the whole request fails, because `vbrAudio_` goes through `ytAudioParts_` and that
is the single definition of "this episode's complete audio". ۲۴.۹ guards the name
explicitly anyway; the transitive failure is the better proof.

**And why Goldooz had nothing to listen to, which he asked about.**
`docs/voices.json` lists two sample files for him — `docs/voice-samples/spk-1g0r95d/…`
— and **neither is in the repo**. `.gitignore` carries `*.wav`, so the intake
workflow's `git add docs/voices.json "docs/voice-samples/$KEY" || true` stages the
JSON and nothing else, the `|| true` hides it, and the commit lands claiming two
files that do not exist. Two silences in one line. **And committing them is not the
fix**: this repo already ruled, in `voice-lab.yml`, that a real person's cloned
voice must not be published from a public repo — so the claim has to stop being
made, and the samples have to travel the way every other audio does (Drive and
Telegram), which is exactly what `runVoiceSoulTest` now does.

## Colour is not soul, and the lever was never in the conversion (7.73)

He listened to the whole of episode 49 in Razavi's voice and said two things.
The first was about that characteristic of his voice — **a feature, not a defect** —
being present in ~98% of the words over fifteen minutes, where Razavi himself
deploys it selectively. The second: **«مثل کسی می‌خواند که متوجه نیست چه می‌خواند
و فقط صدایش مثلِ رضوی است»**.

**They are one fault seen from two sides, not two faults.** RVC changes timbre
frame by frame and makes no decision about where to be creaky and where not.
7.34 already wrote the reason down: *«مکث، کشش، ضرب‌آهنگ، دامنه … خروجیِ این مدل
نیستند؛ ورودی‌اش‌اند»* — they arrive from Gemini's reading, i.e. from section 32.
Episode 49's WAV was produced months ago with the ordinary reading: a uniform
reading in gives a uniform texture out. **The 98% uniformity *is* the flat
reading, measured from the other end.**

**So 7.70 moved the wrong number**, and he said so plainly: «با همون مقدارِ ۱
برای رضوی همه چیز خوبه». `VBR_INDEX_RATE` is back to `'1.0'` — his decision, and
`rvcSim_`'s 0.024 range never distinguished those four settings anyway. The
identity and the weeks of work stay where they are.

**And the claim the engine was making had to stop.** «قسمت ۴۹ با صدای رضوی» was
half true and nothing anywhere said which half. `vbrSoul_` reads the episode's
own `_episode.json` and the queue row carries three states — «روح», «رنگ‌تنها»,
«نامعلوم» — into the Telegram caption and the daily line. «رنگ‌تنها» does **not**
lower `ok`: the conversion worked, the result is half the work, and saying so
costs one sentence against fifteen minutes of his listening. «نامعلوم» stays
silent, because an alarm for a state that may be healthy is the alarm people
learn to ignore (7.40).

**The record it reads did not exist, and the docstrings said it did.**
`ensureCast_` and `personaEnsure_` both promise the decision «در پروندهٔ قسمت
می‌مانَد و اجرای بعدی همان را می‌خوانَد». Neither was ever written:
`writeEpisodeJson_` is last called in the `speak` phase and both decisions are
made in `audio` — after it. So every resume re-cast from the model and re-read
the sheet (the lead voice can change mid-episode, with no error, audible only),
and `castSpansRecord_`'s own comment — «یوتیوب فردا فقط `_episode.json` را دارد» —
was void: section 27 and the episode mail read `castSpans: []` every single night.
That is the 7.68 shape again, the written claim and the code doing the opposite,
and the *fourth* instance in this file of analysis wired to no decision.
`epDecisionsSave_` writes once per episode (`__decAt`, so a resume writes
nothing) and `null` is stored deliberately: `undefined` is dropped by JSON and
`personaEnsure_` reads that as "not yet decided".

**And the sample that was supposed to answer the question could not.** He had
told me before, and told me again: **«در صوت‌های کوتاه‌مدت نمی‌شه تشخیص داد»**.
`STYLE_PROBE_LINE` is ~250 characters, about twenty seconds, against a phenomenon
he measured over fifteen minutes. *A measure whose window is shorter than the
thing it measures never sees it* — the fifth instance of "the measure does not
measure the goal" in this file, this time in the time dimension. The probe now
takes ~4,000 characters of a **real episode's** vowelled text (`__speakSegs[i].t`,
because `ttsCue_` deliberately sends the pronunciation cue instead of the style
cue for undiacriticised text — 7.10's lesson), chunks it with the episode's own
splitter, **re-stamps the style flag before every chunk** (`STYLE_PROBE_TTL_MIN`
is five minutes and its comment says "longer than any sample build", which was
true for one line and false for four minutes), and prints the **real** duration.
A fallback to the short line is announced, never silent.

## A search that leaves a third of its budget unspent is doing incomplete work (7.73)

He ran a simple search and asked the right question: *is this logical? is it
doing incomplete work?* The report's own numbers answered it: **277 rows read
against a cap of 2,500**, in **152 seconds of a 230-second budget**, beside dozens
of «N ردیف خوانده نشد» lines. **Neither cap was reached and the work stopped
anyway.**

**The cause is that the sweep had one pass.** 7.51 divided the time between tabs,
which was right — before it the first tab could eat the whole budget and
`getSheets` order decided what got searched. But an **unspent** share rolled
forward while a **short** share was never made up: a tab cut off at its own share
was never revisited, even with a third of the budget still on the table. A second
pass now reads exactly the rows that were left, round-robin over the tabs, so one
tab cannot eat the remainder either.

**Three separate silences were behind those forty lines**, and each is a rule this
file already paid for:

- **`missed` conflated "no time" with "the read threw"** — and the throw lived in
  a bare `catch (e) {}`. Two causes with opposite remedies arriving as one number.
  A number that accuses carries its evidence (7.32), so the reason is reported.
- **A block that throws lost every row in it.** A 75-row block of 11,000-character
  cells can exceed the read limit while the same rows come back one at a time.
  Degradation goes toward completeness, not toward silence.
- **A tab whose header could not be read vanished from the map *and from the
  denominator*.** `srchIsHubTab_` returned `false` for "not a bank tab" and for
  "could not be read" out of the same `catch`, so "39 tabs of 39" was reported
  with one tab never looked at — precisely the illusion of completeness that 7.23
  added the denominator to prevent. And **my first fix for it was dead code**: I
  put the reporting in `srchHubTabs_`, one layer above the swallow, and the new
  assertion caught it by printing an empty notes array. Nothing about reading the
  code showed that; breaking it did.

**Two of my own new assertions measured nothing on first check.** One counted
`items` where the claim was about **rows read** — `SEARCH_CAND_MAX` trims the list
to 240 at the end, so it went red on correct code. The other claimed «the row cap
is not reported as a budget problem» and was guaranteed by `out.stopped = out.stopped || …`
keeping the first reason, not by the condition I had written: removing that
condition left it green. A line that looks like a gate and is not misleads whoever
reads it next (7.71), so the claim was replaced with one that carries load — a tab
whose rows really cannot be read, with budget remaining, goes in the red frame.

**And the answer to his second question — does smart search share the problem?**
Yes, the same path: semantic retrieval is a *second candidate source* and its rows
are read through the same `srchReadRows_`. Both modes get the fix, and both are
checked by the same three lines in the monitor prompt.

## Two parts of one repo, two rulings on the same thing

`voice-lab.yml` has refused GitHub Releases since the day it was written, and
states why: *«این ریپو عمومی است و خروجیِ این آزمایش، صدای کلون‌شدهٔ یک شخصِ حقیقی
است … لینکی که عمومی شد، «فردا بهترش می‌کنیم» ندارد.»* Artifacts only, one day of
retention.

**And the bridge publishes exactly that, publicly — a whole fifteen-minute episode
in his cloned voice, on a public release, forever.** Two parts of one repo held
opposite rulings on the same question and nobody had put them side by side. This
file's own rule is that a contradiction is itself the finding (7.32); I found it
while looking for somewhere to put listening samples, and the tempting move was to
use the bridge's release because it was already there.

**The answer is not to stop publishing — it is to revoke, the way this repo revokes
everything else.** A release asset is the only route the engine has (an artifact
cannot be downloaded from outside Actions, which is why section 36 chose releases
over artifacts in the first place). So it behaves like the temporary Drive share:
opened, used, and taken back. `dropCollected` deletes every asset whose queue row
says «رسید», and it is the exact mirror of `vbrUnshare_` one boundary over.

**The criterion is the queue's own «رسید», never elapsed time.** Deleting a file
the engine has not collected loses that episode permanently *and* leaves the map
saying "done", so nothing would ever rebuild it. And it runs before the work is
picked and behind no condition, because the day the queue is empty is still a day
the public file should not be sitting there.

**One of the four new checks proved nothing and the honest fix was to relabel, not
to keep it.** `if not done: return 0` looked like a guard; breaking it changed
nothing, because with an empty set nothing matches anyway. It is a short-circuit
and now says so — a line that looks like a gate and is not will mislead whoever
reads it next.

## A rule stated generally is a rule nobody applies (7.69)

He reported it with his own examples: the narrator reads «توجیه» as `tawjih` and
«موضوع» as `maowzoo`. The correct Persian is `tojih` and `mozu` — the Arabic
diphthong /aw/ does not exist in standard Persian; it monophthongized to /o/.

**`SPEAK_TRAPS` already covered this — generally.** The «لهجه» entry says «نه
عربی‌خوانیِ واژه‌های عربی‌تبار». That sentence is correct, it is in the catalogue,
it reaches both the writer and the `speak2` reviewer, and the single most frequent
instance of it was mispronounced every single day. **A category stated at the level
of the category is not a rule; it is a heading.** The new entry names the sound,
the words, and the counter-case.

**The counter-case is the part that had to be written or the fix breaks the other
way.** Not every و is a vowel: where a tashdid follows, the و is the consonant /v/
and the first letter takes a fatha — «تَوَجُّه», «تَوَسُّط», «تَوَقُّف», «مُوَفَّق».
Marking those with a damma would turn correct words into wrong ones, which is worse
than the bug. So the trap states the test — *tashdid? consonant. No tashdid?
vowel.* — rather than a list to copy.

**And the words he named by name went into `PRON_SEED`, beside the trap and not
instead of it.** This repo's own rule: a cap stated only in a prompt is not a cap.
The «تلفظ» tab is applied **after** verification, so nothing gates what gets in —
which is exactly why it is a guarantee for the reported words and exactly why the
tashdid family was deliberately kept out of it. A wrong row there ships.

**Two of four new assertions measured nothing on first check.** One compared
against a hand-typed string and went red on correct code, because `pronStrip_` also
removes the hamza in «دربارهٔ» — *an assertion that compares against prose the
author typed is measuring the author's memory.* The other claimed «توجه» stays
untouched but searched for one specific spelling; when a deliberately wrong row was
added to the tab it stayed green, because the injected text carried a fatha the
search string did not. The claim is "the word is not changed", so that is what it
compares now.

## The claim was written down, and the code did the opposite (7.68)

He listened to a whole episode and said what no test could: the opening, the
bridges and the close of many episodes **are not music**. Breathing. A motorcycle.
Street noise. On episodes that are already published and already going into clips.
His words were «آبرو بر» and «حیثیتم رفت», and he added that the monitor had said
nothing for weeks and that I had told him three times it was fixed.

**The evidence came from Drive, not from reasoning.** One bank track's metadata
file, written 23 September:

```json
"heard":   "",
"verdict": "مدل نشنید؛ از روی اندازه‌ها: …"
```

So `musicAccept_` returns `ok: true` when the model never listened. And this file,
in the section about this very code, says in bold: **«پیش‌فرض ردّ است** … مدلِ غایب،
تأییدِ خاموش نیست» — *the default is reject; an absent model is not silent
approval.* **The sentence was written and the code did the opposite.** That is the
7.24 shape at its worst: not a safety claim that is slightly false, but one that is
exactly inverted, in the one place nobody re-checks because it is already written
down.

**And the second layer is why "unknown blocks playback" felt true.** It *was*
true — for effects. 5.65 built that gate inside the sound-effect path. For music,
`heardCanEdge_` only ever rejected «زمینه» and said nothing about an empty verdict,
so a track nobody had ever heard passed both gates and opened the show.

`heardPlayable_` now implements the written rule: no verdict, no playback, in any
slot. The one exception stays what it always was — a note a human wrote, because
the user's taste is never erased.

**Silence is better than a motorcycle, but silent silence is not.** Blocking the
unheard means episodes can come out with no music at all, so the count has to be
visible: `musicStatus_().line` says every day how many tracks are playable and how
many are unheard, in the 10:00 mail and in the episode mail. That number lived only
in a sheet tab, and he does not open sheets (5.90) — which is the whole reason this
ran for months with only his ear to report it.

**And a backlog that does not clear is itself a finding.** `music-unheard` after
`MUSIC_UNHEARD_DAYS`, with a verifier, in the `NEEDS_CODE` queue. Its stamp is
written by the event rather than by a counter that resets nightly (7.22), and it is
deleted the moment the count reaches zero — a warning for a state that no longer
exists is how a warning becomes noise.

**The worst part was a test, and it is worth stating plainly.** `run_music_test.js`
۷٫۱۴ asserted: *«ردیفِ بی‌داوری با این سد کنار گذاشته نمی‌شود — سدِ «نامعلوم» جای
دیگری است»*. There was no other gate. **The assertion guaranteed the bug**, and it
passed every night for months. An assertion can lock in a wrong reading as firmly
as it guards a right one, and nothing in a green suite tells the two apart (7.46).
It is now inverted, and it goes red on the pre-7.68 code.

**Eight test doubles were lenient where production has to be strict.** Not one
music fixture in any suite carried a `heard` value, so every double presented as
normal exactly the state that is a disaster in production (7.24). Fixing them
turned three unrelated assertions red — which is itself the proof that the gate
bites.

**And the shape, for the fourth time:** *cleaning the input does not fix what is
already written* (5.95). Each previous "fixed" closed the door for **new**
downloads; nothing ever re-listened to what was already in the bank. When the owner
says "I have told you this repeatedly", the default assumption should be that the
symptom was treated and the cause was not — and that whatever already exists was
never revisited. That is now §۴٫۹٫۴ of the monitor prompt.

## The same wall, from the other side, in the section built after it (7.66)

The bridge worked. Run 18, 09:56→10:16 Dubai: the **whole** of درس‌نامه ۴۹
converted — 17 minutes 56 seconds of runner time, 70.9 MB out, the map committed.
So 7.65 was right and the next layer was standing, which is 7.50's rule for the
second time in one day.

**And the next layer is a wall this repo already documented.** `UrlFetchApp` will
not take a response over 50 MB. Section 27 wrote that ceiling down on day one —
«آپلودِ Apps Script سقفِ ۵۰ مگابایت دارد» — for the **upload** side. Section 36,
written eleven versions later, never closed the download side. `splitWav` now cuts
the output under `VBR_PIECE_MB` and writes `urls`; the engine lands one file per
piece, «۱ از ۲» and «۲ از ۲».

**Three boundaries were needed beyond the split, and each is a lesson already in
this file:**

- **A ceiling is not a failed attempt.** Counting it as a try meant that after
  `VBR_TRY_MAX` the row became «رهاشده» — for an output that had *arrived*. And
  the nightly retries every night, so without the distinction episode 49 would
  have abandoned itself three nights later, unprompted. 5.88's «رهاشده جدا از
  عقب‌مانده», applied to our own defect rather than to the workflow's.
- **A row whose answer arrived is not unanswered.** `voice-bridge-stuck` would
  have fired in three days saying «هیچ خروجی‌ای ننشسته» — false: it had landed,
  we could not take it. That is 7.18/7.32 exactly, and the new finding
  (`voice-bridge-toobig`) carries the subject that is actually true. Its verifier
  is deliberately wider than its own condition: over-inclusive can only ever
  *refuse* a false close, and a verifier that cannot see its own condition is
  what 7.57 was written for.
- **Half a set never stays**, in the folder or in Telegram. A piece that landed
  and whose successor failed is deleted, and a multi-piece map writes **no**
  single `url` so an older engine waits rather than putting half an episode beside
  the original under a name that claims the whole. `ytAudioParts_`'s refusal,
  restated where it was missing. The Telegram notice needed it too — until now it
  sent only the first piece, captioned «قسمت ۴۹ با صدای رضوی». The owner hears
  from Telegram, not from Drive, so the boundary has to exist in both places.

**And my own mistake in this very version was 7.63's, one section over.** The
first cut of this asked `vbrMapCached_()` inside `vbrStatus_` — a function
`writeStatus_` calls, so at the top of `healthCheck` and on every `syncCatalog`.
I had put a network call on the hottest path in the engine, three days after
writing down that adding cost to the function that had just died of cost is the
shape to watch for. **Three suites went red and that is what showed it** — one
mocked model response got consumed and shifted every later one. The witness is
now stamped on the queue row itself (`hardWhy`) by the function that saw the
failure, so the count costs nothing, and assertion ۲۰٫۱۰ counts **fetch calls**,
not elapsed time, because the mock has no network (7.60).

**Three of twenty-one new assertions measured nothing on first check**, and only
breaking the code showed each one:

- ۲۰٫۵ keyed its fake responses on a **call counter** — and `vbrSpeakerNames_()`
  fetches `docs/voices.json` before any piece, so the *first* piece got the broken
  blob. Nothing was ever written and the cleanup loop under test never ran. Keyed
  on the URL now.
- «the ceiling witness is cleared once the workflow cuts smaller» existed only in
  a comment. Deleting the line left the suite green. ۲۰٫۹-ب holds it now.
- And the Python harness had a trap of its own: `"40"` and `"50"` are the **same
  byte length**, so `__pycache__` — keyed on mtime-seconds plus size — stayed
  valid and the **broken** bytecode was re-loaded on restore. A double that is
  wrong where production is right proves nothing, and this one was wrong in the
  direction that hides a fix rather than a bug.

**A number that gates work must be checked against the number it is measured in,
across languages too.** The piece cap lives in Python and the download cap in
`CFG`; `run_voicepipe_test.js` ۱۴٫۲ reads both **from source** and asserts
piece < cap < 50 MB. That is 7.30/7.31's arithmetic, with the two constants now
in two different files — which is exactly how they would have drifted.

## The ceiling that one of the two roads drove straight past (7.65)

He pressed the manual embed button an hour after 7.64 shipped. Two things came
back, and both mattered.

**The good one:** 5,000 rows built in a single run, the bank from 10% to **27%**.
So `embRunDue_` — the core — was never the problem.

**The other one:** that same run ended with `Exceeded maximum execution time`.
7.64 had just capped the block's optional tail, and the cap did not hold on this
road.

**Why, and it is one line.** The cap asks `nightLeft_()`, and that function opens
with `if (!_nightT0) nightStart_()`. On the nightly the clock has been running
since 02:30, so the answer is honest. From the **menu button** nobody ever
started it — and the first thing that asks is the tail check itself. So the clock
started *at the tail*, answered "270 seconds left" after 300 seconds had already
been spent, and the tail ran. The ceiling was real, correct, tested — and one of
its two callers drove straight past it.

`embNightly_` now asks `nightLeft_()` once at its own entry, so the clock starts
when the block starts. The nightly is unchanged (the clock is already running);
the manual path now measures real elapsed time. No new constant.

**This is 7.50's rule, and it cost one hour this time instead of three versions:**
*check a fix against what actually happens next, not against the bug it was
written for.* 7.64 was correct about the fault and left the layer under it
standing. And what found it was **pressing the button in production** — not
reading the code, and not any of the seven assertions I had just written and
deliberately broken.

The new assertion observes from inside the phase — was the clock already running
when the work began? — and goes red when the single line is removed.

## Using "measure, don't guess" as a reason to do nothing (7.64)

He asked why I had deliberately not finished the embed fault, and how long he
has to keep watching everything. Both questions were fair and the first one has
a precise answer: **I had turned a correct rule into a shield.**

The rule says *don't patch a cause you have not proven*. It does not say *don't
fix a fault you have proven*, and it certainly does not say *hand the
measurement to the owner*. I had proven two faults from the source alone and
shipped neither, then asked him to press a button to measure the third. That is
the wrong division of labour: **the engine should measure itself; the owner
should not be the instrument.**

**The three faults, all provable without an Apps Script log:**

- **No footprint.** Four nights the nightly died inside this block and nothing
  anywhere recorded *where*. `nightAtSave_` gave the block's name, not the
  phase. This exact pattern already existed twice in this repo — `healthStep_`
  (6.38) and `nightAtSave_` (7.44) — and was not applied here. `embStep_` stamps
  before each phase, `embStatus_` carries it, and the daily line prints it **only
  when stuck**, so a healthy night stays quiet.
- **The witness was written after the optional work.** `PK.EMB_LAST` was stamped
  *after* `embSelfTest_`, a live model round-trip. A night that built 1,200 rows
  and then died in the tail recorded **nothing** — the work happened and the
  ledger said it never did, so `embStuckDays_` then raised a finding whose
  subject was wrong. 7.44's own sentence, one section over.
- **The tail had no ceiling.** The block takes 230 s from `nightHas_` and
  declares 210 s of budget — then runs `embSelfTest_` and **two** full
  `embStatus_` passes over a 50,568-row bank, none of it counted. That is 7.31's
  invariant violated *inside the very function 7.31 was written about*: 7.31
  compared the two constants and the tail was in neither. `EMB_TAIL_MS` closes
  the arithmetic and `run_embed_test.js` ۲۰٫۴ now asserts
  `EMB_SPECS_MS + EMB_BUDGET_MS + EMB_TAIL_MS ≤` the block's own `nightHas_`
  number, read from the source.

**Skipping is announced, and the gate has a second door.** `embGates_` may be
skipped here because `healthCheck` also asks it (7.27) — but the skip is stated
in the notes, because a capability that switches itself off in silence is how
the music bank stayed empty for weeks.

**And what the root cause is remains unproven, deliberately.** Why zero rows are
built at all still needs the real execution log. The difference is that from
tonight the engine answers that question *itself*: the footprint names the phase
it died in, and it rides into the daily line. Nobody has to press anything.

**Two of my own assertions measured nothing on first check**, and only running
them showed it. One set `NIGHT_BUDGET_MS` to 1 to simulate "no time left" — and
`nightLeft_` has a `Math.max(30000, …)` floor, so the setting was silently
ignored and the tail still ran. That is 7.28's trap exactly (`EMB_SHARD_ROWS`
clamped to 200), and the fix was to reach the state through the real comparison
by raising the threshold instead. The other made `embSelfTest_` throw and then
checked the ledger — but a throw is caught, so the **old** code reached the write
too and the assertion could not fail. What actually kills a run is the six-minute
cap, which cannot be simulated; so the claim is now measured the way it is
stated: *at the moment the optional work begins, the witness must already be
written*. Observed from inside the phase, and red on the pre-7.64 code.

## The reporter died and nothing said so (7.63)

10:04 Dubai, `healthCheck` started and never finished. `health.lastStep` —
6.38's own footprint, built for exactly this — said **«شروع @ 2026-09-25 10:04»**
and nothing more, while `health.checkedAt` stayed on yesterday. So the day's
operational mail never went, and with it **every second door 7.27 through 7.57
deliberately put on that one function**: `embGates_`, `vbrQueueShare_`,
`vbrQueueEnsure_`, `ttsCueSwitch_`, `styleProbeUnshare_`, `selfVerifySweep_` and
the `nightDeath_` report. From outside it looked like a quiet day.

**6.38 built the witness and never built the alarm.** It wrote the budget and
the footprint, and the footprint worked perfectly — it sits in `_STATUS.json`,
where nobody looks unless they already suspect something. That is this file's
most-repeated shape, and this is its cleanest instance: *the evidence was
correct, present, and wired to no decision.*

**And the asymmetry is the part to carry forward.** 7.44 gave the nightly a
witness (`nightDeath_`) and asked it **from `healthCheck`** — the independent
path with its own schedule. The mirror was never built. Six versions then moved
their second door onto `healthCheck` precisely *because* it is independent, and
nobody asked what watches the watcher. Now the nightly asks about health and
health asks about the nightly: **neither is its own witness.**

**The channel cannot be `mailQueue_`, and that is not a detail.** The news queue
is drained by `healthCheck`, and `healthCheck` is the thing that died — a queued
"the daily report did not go out" waits forever for the corpse to deliver it. So
this one joins the short immediate list beside the install authorisation, the
failed backup and the rollback: immediate mail, Telegram, and a `health-silent`
finding in the `NEEDS_CODE` queue, because a sentence in a mail is replaced
tomorrow and a finding is not.

Three boundaries, each one a rule this file already paid for:

- **«نمی‌دانیم» is not «نرفت».** A stamp that cannot be read rings nothing — it
  can be a freshly installed engine, and a warning for the healthy state is the
  warning people learn to ignore (7.40).
- **The threshold is 2 days, not 1.** At 02:30 today's check has not happened
  yet, so yesterday's stamp is the healthy state. One is a false alarm every
  single night.
- **The call sits outside `if (night.first)` (7.29) and behind no `nightHas_`.**
  The night that runs short is exactly the night "no report went out" needs
  saying; behind a time guard it would go silent on the nights that matter most.

**And the fix is not a bigger budget.** Apps Script's six-minute kill cannot be
caught, so raising `HEALTH_BUDGET_MS` buys nothing. The real answer is 7.60's:
take optional work off the path someone is standing on. Six independent second
doors were bolted onto one daily function and **nobody compared the total to the
cap** — 7.30/7.31 again, one function over.

**Two of eleven new assertions measured something else on first check**, and
running them is what showed it: one counted the news queue's length, when the
queue growing by one is `logSelfFinding_` doing its job correctly — the real
claim is *"with a broken queue the alert still arrives"*, so that is what it now
asserts; and one asked `selfVerifyOne_(...).known`, which is true the moment the
map has an entry, instead of `.still`. A third breakage of mine landed inside
`logSelfFinding_`'s own swallow and stayed green, so the assertion it was meant
to falsify had to be attacked a different way. **Breaking the code is not enough;
confirm the break landed where you aimed it** (7.60).

**And the bug in this very version was found by re-reading my own claim.** The
manifest said the new `healthStale` key costs "no fresh read" — and the code
called `readExistingHealth_()` itself, so every `writeStatus_` did a **second**
126 KB read and parse of `_STATUS.json`. `writeStatus_` is called at the top of
`healthCheck`: I was adding cost to the exact function that had just died of
cost. *A safety or cost claim that is slightly false is worse than none* (7.24) —
and the way it surfaced was checking the sentence against the code rather than
against my intention. The object is read once and used twice now, and the
assertion counts **reads**, not elapsed time, because the mock has no 29 MB
spreadsheet (7.60).

**The weekly menu debt: 36 → 35.** `runVoiceBridge` was not a random pick — it is
the door a person opens when the nightly did not do its job, and last night the
nightly did not do its job. The new assertion enters through the function the
menu actually binds, reads that name **from the menu source** rather than
hard-coding it, and checks that a ticked episode really reaches the queue. Its
guidance text also named only two of the three ways in; the tick column 7.59
added was missing, and a half-stated instruction is worse than none because the
reader concludes the third way does not exist.

## A cure on a road that is never travelled — the same one, one version later (7.62)

He ticked «درس‌نامه ۴۹» on the 24th and the save succeeded. Next morning
`_VOICE-RENDER.json` carried `engine: 7.61` — written by that night's run — and
`items: []`. The tick never reached the queue.

`vbrAskDue_` opens with `if (!vbrSpeakerAny_(rows)) return 0;`, and that gate knew
only two ways work can exist: a row switched **on**, or a «موردی» episode number.
**The tick column 7.59 added was not among them.** So the nightly returned before
it ever reached `vbrAskPicked_`.

**This is 7.46 word for word, in code written after reading it.** The cure existed,
was correct, was tested — and sat on a road the nightly never travels. The rule has
now cost three versions in one week, so state it as a checklist item rather than a
story: **when you add a new way for work to enter a system, find the gate that
decides whether that system runs at all, and put it there too.**

**The daily line made it invisible.** With the row off, `vbrStatus_` said «هیچ
گویندهٔ روشنی نیست» — healthy, and his own decision. But work *was* waiting, so the
sentence was misleading in exactly the way 7.45 and 7.46 both record. It now names
the speaker and the tick.

**And the reason four green assertions proved nothing is the sharpest part.**
۱۸.۱–۱۸.۴ all called `vbrAskPicked_` **directly**. They tested the room and never
the door — 7.44's rule, which I wrote down and then walked past. The new assertion
enters through `vbrAskDue_`, the same function the nightly calls, and it goes red
when the gate is restored to what it was.

**The general form, for the next person:** a test that calls the function you just
wrote proves the function. Only a test that starts where production starts proves
the feature. When the two differ, the second one is the only one that matters.

## One capital letter, three versions, and a guard that threw the answer away (7.61)

He said the board was still stuck after installing 7.60. **7.60 was mine and it
fixed something that was never the cause** — I reasoned about `getHub_()` being
expensive instead of running the dialog. This file's own rule, ignored: measure,
don't reason.

The real cause is one character. `draw(d)` takes **`d`**; 7.58's new "next
episode" hint wrote **`D`**. The page raises `ReferenceError`, `draw` stops
half-way, the box keeps its «در حالِ خواندن…» text, and **nothing anywhere shows
an error**. Broken since 7.58 — three versions, all green.

**Why no guard caught it, and this is the part that generalises.**
`run_dialogs_test.js` rendered the board, ran its script, and asked *"was
`personaBoardData` called?"* — yes, and correctly. But the `google.script.run`
double **discarded `withSuccessHandler`**, so the reply could never be delivered
and **`draw` never ran in any test, ever**. That is 7.43 exactly: right question,
right answer, one layer above the breakage.

**And a second layer of the same blindness.** The mock hub has no «صداها» rows,
so `d.rows` was empty and `draw` returned at its early exit — the card loop,
where the bug actually lived, would not have run even if the reply had been
delivered. A test double that is *emptier* than production proves nothing, the
same way one that is more lenient proves nothing (7.24).

`makeCtx` now keeps the handlers and `h.reply(fn, value)` delivers the answer,
raising whatever the page raises. The assertions seed a real row first, then ask
the question that matters: **when the data arrives, does the box actually fill?**
All three were turned red by breaking the code — one of them by restoring the
very `D` that caused this.

**The habit that failed here was not the fix, it was the diagnosis.** I had a
symptom ("stuck on loading"), invented a plausible cause, shipped it, and told him
it was solved. The cheap check — render the dialog and run its script with data —
existed the whole time and took four minutes. *Before shipping a fix for something
you cannot see, reproduce it.*

## A window that will not open has no settings in it (7.60)

He installed 7.59 and the voices board sat on «در حالِ خواندن…» for more than
two minutes. The cause is one line, and it was not in the new code's logic:

> `getHub_()` runs `ensureAllTabs_()` on the **29 MB** hub, every time.

7.59's episode list called it **once per show**. So opening the board went from
one full tab-repair pass to three — placed directly on the path a person is
standing on, waiting.

**The feature was right and the placement was wrong.** Nothing about the list was
incorrect; it simply ran where someone was waiting for it. Two halves, and both
were needed: the hub is opened **once** and passed to every show, and the lists
left the first load entirely for `personaEpisodeLists()`. The board now draws
immediately and the lists arrive after.

**And the second call cannot take the first one down.** If the list fails, the
error rides in its own answer and every other control still works — he must be
able to change the style cue even when the episode list did not come. Until it
arrives the page says «در حالِ آمدن…», because an empty space reads as "there are
no episodes", and that is a lie.

**The assertion counts what was expensive, not how long it took.** A timing
assertion in the mock measures nothing: the double has no 29 MB spreadsheet. What
was costly was the *number of `getHub_` calls*, so that is what is counted — one
on the first load, one for all shows in the list call. Both go red when the code
is broken.

**My first attempt to break it landed in a different function and stayed green.**
A blind string replace hit the first `} catch (eS) {}` in the file, which belongs
to something else, so the suite proved nothing until I checked *where* the
breakage actually landed. Breaking the code on purpose only works if you confirm
it broke the thing you meant.

## A list instead of typing — and two jobs that looked like one (7.59)

His ask, in one sentence: «لیستی باشه جای تایپی و برای پادکست‌ها قسمت‌هایی که
تولید شده رو نشون بده و بتونم هر چند تا که می‌خوام تیک بزنم چه پشتِ‌هم چه جدا
… و برای درس‌هایی که ساخته نشده بتونم شماره‌ش رو تایپ کنم که موعدش رسید انجام
بشه … و لیست برای هر نوع پادکست جدا باشه».

**He had already separated the two, and the separation is real in the code.**
A **produced** episode has audio right now, so it converts right now (the bridge,
section 36). An **unmade** episode has no audio, so the setting waits for its day
(the «قسمت‌های موردی» column, with 7.58's gate). So: **two columns, not one.** One
column would mean «۱۸» is sometimes "convert it" and sometimes "when you make it",
with nothing able to say which.

**The list is complete; the folder is not, and that is said out loud.** Episode
numbers come from each show's own episode tab, but converting needs the episode's
**folder id**, which lives only in `_YT-RENDER.json` — today 45 of 50 درس‌نامه and
variety only from 20 on. So an episode whose folder is unknown is **shown, not
hidden**, unticked, with the reason printed. Hiding it would have him conclude the
episode does not exist; that is the "everything looks fine" sentence again.

**Explicit ticks drain before the automatic rows.** The nightly converts two
episodes; if the newest-first sweep goes first, what he ticked waits weeks behind
episodes he never chose — a button that works and whose result never arrives.

Three boundaries, each one a bug avoided rather than found:

- **`undefined` is not `[]`.** No picks argument means "the board didn't send
  this" and the cell must be left alone; an empty array means "none ticked" and
  must clear it. Treating them alike would let any save from anywhere silently
  erase his selection.
- **Ticks are per speaker, not global.** One list is shared by every row, so each
  row carries its own set — otherwise one speaker's ticks appear on all of them.
- **One bad tick must not take the good ones with it.** The only caller wraps this
  in a bare `catch`, so a throw here drops *every* tick on that row silently. The
  known case is guarded by name and logged; the unknown case is caught per tick.

**And the guard for "new columns go at the end" (7.41) had named a column.**
`PERSONA_HEADERS[last] === 'قسمت‌های موردی'` was true until this version added one
after it. An assertion that names today's last column breaks on the next one, and
the cheapest fix at that moment is to delete the assertion that was guarding the
rule. It now checks the rule itself: every `PC` index unique, none past the
headers, and the largest exactly equal to the header count.

**Two of fourteen new assertions measured nothing on first check.** One matched
`personaBoardSave\([^)]*picks\)` — but the arguments contain `getElementById(...)`,
so `[^)]*` stopped at the first inner paren and the pattern could never reach
`picks`. The other put the broken tick **last** in the list, where the guard's
presence or absence makes no difference; moving it first is what made the
assertion mean what its name says.

## A number that can no longer come is not a setting (7.58)

He typed «درس نامه 18» into «قسمت‌های موردی» and asked two questions:
*does this work? when does it produce?* Executed rather than answered from the
code: the line parsed correctly, the show name matched correctly (7.55 had fixed
exactly that), and the save succeeded. The answer to *when* was **never** —
fifty درس‌نامه episodes have been produced and 18 passed months ago.

**This is the same failure `personaOnceParse_` already documents, one layer
down.** 7.41 wrote the rule for an *unreadable* line — «خطی که خوانده نشود یعنی
قسمتی که او خواسته و بی‌صدا نخواهد گرفت، و او هرگز نمی‌فهمد» — and built a door
for it. A line that is **readable but past** ends in exactly the same place: it
is stored, it looks right, and it can never match. Nothing stood there.

`personaEpCursor_` reads each show's counter and `personaOncePast_` recognises a
line whose every item is behind it. Three boundaries, and each is the reason the
naive version would have been wrong:

- **A mixed line is not refused.** «۱۸ تا ۶۰» and «۱۸، ۶۰» still have a future
  half; refusing them would kill the episode he *can* still get in order to warn
  him about the one he cannot.
- **The in-flight episode is not past.** The boundary is `cur`, not `next` — the
  episode being produced right now carries a number equal to the counter, and
  refusing it would make "this very episode" unsettable.
- **An unknown show refuses nothing** (7.57, one section over: doubt does not
  shut the door). Otherwise the next podcast added to `knownShows_` would have
  every per-episode setting refused, with no code anywhere saying why.

**And refusing is only half.** The message names the next episode number, and the
board prints it beside the box — because a refusal that does not carry the right
number leaves him guessing, and the number is knowable before he types (5.61/7.35:
the control belongs where the work is).

**Three of nine new assertions took a road other than the one they named**, and
breaking the code is what surfaced all three: one asked the *function* about a
mixed line while the boundary being tested lives in the *save gate*; one claimed
to test "an unreadable counter" when a deleted property reads as **zero**, which
is a different and correct fact ("nothing produced yet"); and one read a cell
through a helper that returns a row *index*. 7.44's rule keeps arriving in new
clothes — and it is only ever caught by breaking the code, never by reading it.

## A row closed by a claim nobody checks (7.57)

He said it in one line: «این شکاف گزارش به اقدام رو درست کن حتما». The gap is
one sentence, and it is not the one 7.42 found:

> A row closes **only** when `manifest.json` names its key — and **nothing ever
> checked that claim against the condition that raised the row**.

7.42 made the door openable, 7.48 made its key obtainable, 7.50 made it open for
every version. All three were about *getting the row closed*. None asked whether
closing it was **true**.

**The instance is this week's.** 7.48 closed `tts-cue-unsupported` by name while
the cue was still off — and `ttsCueStatus_().ok` was false **in the 10:00 mail
every single day**. Two witnesses in one system, disagreeing daily, never
compared. That is 7.32's rule («تناقض را نگاه کن، توجیه نکن») applied to
someone else's report and never to the engine's own bookkeeping.

**Why `touchExisting_` could not save it, and this is the general shape.**
Reopening is keyed on **recurrence**, but these findings are raised on a
**transition**, not on a **state**. Once the cue is off, no request is ever
rejected again, so the finding can never recur, so a closed row stays closed
forever no matter what is true. **Any finding whose detector fires on the edge
is a finding that can never reopen itself.**

`selfVerifyMap_` wires eleven keys to the engine's own live status — the object
`writeStatus_` already builds, so this adds **no** Drive or Sheet read. Four
boundaries, each one a bug this file already paid for:

- **It never closes anything.** A verifier saying «gone» closes no row. 7.42:
  if the *detector* broke, silence is blindness, and auto-closing hides exactly
  that case forever. The mechanism is one-way — refuse a false close, reopen a
  wrong one.
- **Doubt does not shut the door.** No verifier, or a verifier that throws, is
  `unknown` and behaves exactly as today. Only a **positive observation** blocks.
  Otherwise one broken verifier makes the queue unclosable again — the very door
  7.42 opened.
- **Two doors** (7.39/7.46). The install gate stops a false close; a row closed
  *before* this version never passes that gate, so the sweep runs from
  `healthCheck` on its own schedule (5.95: cleaning the input does not fix what
  is already written; 7.27: never from the nightly that may itself be dying).
- **Honest coverage.** Eleven keys of ~78. The count of open rows with **no**
  verifier is in the daily line, and a verifier pointing at a status that does
  not exist is reported **by name**. A mechanism that covers a seventh of the
  surface and does not say so is the «everything looks fine» sentence.

**And the guard caught one of my own entries.** `selfVerifyMap_` matches keys
**exactly**, so a name taken from the *status* instead of the *finding* raises no
error — it simply verifies nothing, silently. `run_wiring_test.js` ۹٫۳ extracts
every `key:` literal from `src/` and fails on an entry that matches none; it went
red on `seriesOrder` (the real key is `series-order-<series>`). That one is
deliberately left **uncovered** rather than approximated: the key is per-series
and the status is global, so mapping them would reopen every series' row whenever
one series is bad. **A verifier that measures something else is worse than none.**

**The lazy read is not an optimisation.** `markCodeRowsInstalled_` is called from
`afterCodeSwap`, the path that re-arms the triggers. Dying there leaves the engine
with no schedule and no error (Apps Script kills at six minutes silently). So
`writeStatus_` is read only when a row is actually on the table **and** its key
has a verifier — which in most versions never happens.

**Two of seventeen new assertions were vacuous on first check**, and neither was
found by reading: one claimed «the condition is gone» while the state it built was
actually *unknown* (7.44 — a test that takes a different road than the one it
names), and one never reached the predicate at all, so both sides returned `null`
and breaking the predicate stayed green. Break it on purpose, every time.

## A door whose key is hard to obtain is also not a door (7.48)

7.42 found why the `NEEDS_CODE` queue only ever grew: a row closes **only** when
`manifest.json` names its id in `sourceReportIds`, and one manifest in thirty had
filled that list. It wrote the right sentence — *a gate a human has to open is not
a gate* — and left the gate where it was.

**The layer underneath is why the list stayed empty.** A self-finding's row id is
`ENG-<yyyyMMdd-HHmm>#<key>`, and that timestamp is when the finding was **first
seen**, not today. Whoever fixes it today does not have that date, and getting it
means reading the 29 MB hub. So the list was empty for a reason that was never
laziness: the key to the door was not in the room.

The finding **key** is the one identifier the person fixing it always has — it is
in the finding's own text, in the health mail, and in the code that raised it. It
now closes the row too.

**And the boundary had to be stated, because the same character means two things.**
Ordinary report rows are `RPT-2026-08-10-1235#5`, where the suffix is the finding's
*number within that report*. Accepting it as a key would mean writing `"5"` in a
manifest closes a row that has nothing to do with the version. A numeric suffix is
never a key, and the suite proves it by trying exactly that.

Its first use is in this same version: 7.47 answered `tts-cue-unsupported`, and
7.48 closes it by name — the first row this queue has closed by its own rule.

## The verdict that never reached the decision — the eighth time (7.47)

Today's health mail: **«دستورِ لحن خاموش — مدلِ `gemini-3.1-flash-tts-preview`
قالبش را نپذیرفت (از ۰۷:۰۱)؛ تکه‌ها بی‌لحن ساخته می‌شوند»**. Everything about
that verdict was right: both payload shapes were tried (7.02), the model was
recorded, the date was recorded, a «جدی» `tts-cue-unsupported` finding was
raised, and the daily line said it out loud every morning.

**And `resolveModels_` never looked at it.** So the same model was chosen again
on every resolve, and every chunk was synthesized with no style cue — which
silently disables section 32's reading style, the measured style cards, the mode
picking, and the whole «روح» line of work that 7.34–7.41 was built for.

**The bitter part is that the gate already existed one line away.** The *text*
model has it, with a comment saying exactly why: «مدلی که داوری ردش کرده دوباره
انتخاب نمی‌شود، وگرنه هر هفته همان تعویضِ بد تکرار می‌شود و داوری بی‌فایده است».
The TTS branch `continue`s **before** that check, so a voice model never passed
through the gate at all. Two kinds of verdict, one wired and one not, in the same
loop.

Three things this version does, and the second one is the general lesson:

- **A single string cannot answer "which ones should I avoid".** `PK.TTS_CUE_OFF`
  holds the *last* model that rejected the cue; the moment a second one rejects,
  the first is forgotten and becomes selectable again. It is a map now,
  `{model: date}`, expiring after `TTS_CUE_RETRY_DAYS` — a preview model changes
  behaviour without changing its name, so "excluded forever" means excluding
  something that may be fixed tomorrow.
- **It is a preference, not an exclusion.** If every voice model rejects the cue,
  the list is left untouched: with no voice model **no episode is produced at
  all**, and that is far worse than a flat one. Same shape as the `stable` policy
  filter two lines above — filter, and keep the original when the filter empties it.
- **And it acts rather than waiting.** The model cache lives `MODEL_REFRESH_DAYS`
  (7), so the preference alone would have left the engine flat for a week.
  `ttsCueSwitch_` is asked from `healthCheck` — 10:00, **between episodes**, never
  mid-synthesis, because swapping the voice model between chunks would put two
  timbres in one episode for a fix that is in no hurry. 7.27/7.39 again: the
  independent path with its own schedule.

**And when there is no alternative, say so.** «we did not look» and «we looked and
there is none» are different facts, and until today neither was reported.

The assertion that matters is proved through the **running path**, not by hand:
the suite drives a model that rejects both shapes and then asks whether the map
the selector reads contains it — 7.22's rule, that a state the engine cannot
reach proves nothing.

## A cure placed on a road that is never travelled (7.46)

The owner opened the Actions tab and found `voice-bridge` red — four scheduled
runs, four identical lines: **«فایلِ صف خوانده شد ولی موتور هرگز رویش ننوشته
(rev 0)»**.

The workflow was right. `_VOICE-RENDER.json` in Drive had not been touched since
it was seeded on 22 September and still carried the **hand-written seed note**,
which `vbrSave_` overwrites on its first write. So `vbrSave_` had never run once
in production — section 36 has never executed.

**7.40 had already fixed this bug.** `vbrQueueEnsure_` writes the queue
unconditionally so that `rev ≥ 1` means "the engine is alive and looked". Its
only caller is `vbrNightly_`, which sits behind `nightHas_` in the nightly — and
the nightly does not get there. *The cure was placed on the road that is never
travelled.* That is 7.39's own sentence, one version later, about the same file:
the share got a second, independent path from `healthCheck`; the **write** did
not. `vbrQueueEnsure_` is now called from `healthCheck` too.

**And the alarm was off in precisely the state that needed it — for the fourth
time.** `vbrStatus_` does say «صف یک بار هم نوشته نشده», but that branch sat
under `else if` after `if (!out.speaker)`. With no speaker switched on — the
starting state, and the state we were actually in — the healthy sentence «هیچ
گویندهٔ روشنی نیست» won every night while the workflow went red. The two are not
the same fact: *no speaker chosen* is the owner's decision; *the queue has never
been written* means the nightly never reached the section, and that is a fault
whoever is switched on.

**The worst part is mine and it was in a test.** `run_bridge_voice_test.js` ۱۳٫۲,
which I wrote in 7.39, asserted exactly the wrong belief — «بی گویندهٔ روشن،
صفِ نانوشته سالم است» — and passed every night. **An assertion can lock in a
wrong reading as firmly as it guards a right one**, and nothing in a green suite
distinguishes the two. Production is what distinguished them. The assertion is
now inverted, and the new one for the second path *runs* `healthCheck` rather
than grepping the source for a function name (7.43/7.44: a check that reads the
code stands one layer above the breakage).

**And the suite found a second bug while proving the first.** `_VOICE-RENDER.json`
was in neither `outRootFilePatterns_` nor `docs/drive_layout.md`, so since
22 September the engine reported its own queue file as «چیزِ ناشناخته» in the
OUTPUT root every night — the «voice cloning» shape of 7.21, in a file this repo
wrote itself. A new root file ships with its pattern entry and its layout row, or
it becomes litter in its own map.

## The permission you cannot revoke at the child (7.45)

Four nights running, four identical lines a night: **«اشتراکِ موقتِ فایل پس گرفته
نشد: Access denied: DriveApp»**. An error that names nothing — not the file, not
the reason, not the thing to do. Two files, two nightly runs, forever.

**The cause was one folder.** «آزمونِ صدای گویندگان» was itself
«anyone with the link» — set by hand, never by code; nothing in this repo shares
a *folder*. Drive does not let a child be more private than the folder holding
it, so `setSharing(PRIVATE)` threw on every file inside, `styleProbeUnshare_`
picked the same two files up again the next night, and `n` stayed 0 so even the
«اشتراکِ … پس گرفته شد» line never appeared. Meanwhile «اشتراکِ موقت» was, the
whole time, a false claim: everything in that folder was permanently public.

**The proof came from Drive, not from reasoning.** «صدا — Umbriel (مرد).wav» was
created on 21 August by `runVoiceAudition`, which never calls `driveShareOn_` —
the engine has never shared that file — and it carried `anyone: reader` anyway.
A permission that is inherited is not removable where it is visible.

Three things follow, and the third is the one that generalises:

- `driveShareOff_` now **names the open ancestor** in its own failure message.
  One extra Drive call, on the failure path only, and an unactionable line
  becomes an actionable one.
- `styleProbeUnshare_` closes **the folder first, then the files** — reverse that
  order and nothing closes. It closes it itself rather than asking (5.95: a gate
  a human must open is not a gate; the owner does not open Drive, let alone an
  ACL) and says so out loud (7.33: a repair nobody hears about is a repair that
  will be needed again). And a file already private is skipped, or the nightly
  would print «اشتراکِ ۲ فایل پس گرفته شد» every night until the end of time.
- `outLayoutCheck_` reports any OUTPUT subfolder that is world-open
  (`outLayout.openFolders`). **This is worse than a stray, for the same reason
  `dups` is:** there is nothing to see. The name is right, the place is right —
  and every file written there afterwards is public with no per-file revoke
  possible. The engine reports those rather than closing them, because the owner
  may have shared one on purpose; only the folder the engine created and declared
  temporary is closed automatically.

**And the double had to be made stricter before any of this was provable.**
`tests/lib/mock.js` accepted `setSharing(PRIVATE)` on a file inside an open
folder and read sharing non-inheritably, so the bug that sat four nights in the
real log could not appear in any suite. It now throws exactly where Drive throws
and reads the ancestor's access — 7.24's rule, one engine over: **a test double
that is lenient where production is strict proves nothing.**

## «موردی» gave the style but not the colour (7.45)

On 20 September he asked, in one sentence, to use a voice «چه به صورتِ **دائم یا
موردی**». 7.41 built «موردی» — for **section 32 only**. The bridge (section 36),
written one version later, still read nothing but `فعال = بله`. So *"make this
one episode in his voice"* had no route: to get the colour you had to switch the
row on, and switching it on means every episode. Exactly what he did not want.

That is the same half-delivery 7.41 was written about, repeating **one section
over**, in code written with that lesson on the page. The boundary is now
repeated verbatim rather than approximated: «موردی» bypasses «فعال», the speaker
is chosen **per episode** instead of once for the whole queue, and a «موردی» row
never silently switches the permanent voice off for the other episodes.

`vbrStatus_` grew a state it did not have: *no row on, but «موردی» rows exist*.
Saying «هیچ گویندهٔ روشنی نیست» there is not false, it is misleading — work is
going to happen — and this file's rule is that a healthy-looking sentence over a
live state is how a daily line stops being read.

## A door only the room's own key opens (7.39)

`voice-bridge` went red on its very first run, with the sentence this file
already carries: **Drive answers a request for an unshared file with an HTML
page, not a 403.** That is 7.33 verbatim, one day later, in a section written
with that lesson in hand.

**The repetition is not the part worth recording. The structure is.**
`vbrSave_` is the only thing that opens the queue's sharing, and it is reachable
from exactly two places — `vbrAsk_`, which needs a speaker switched **on**, and
`vbrIngest_`, which needs rows **already in the queue**. In the starting state
neither holds. So the one condition that opens the door can only be reached
through the door.

**And no guard could catch it.** `vbrStuckCheck_` requires `waiting > 0`, and an
empty queue structurally never passes that gate — so the alarm was off in
precisely the state that needed it. That is the 7.22 and 7.27 bell a third time:
*it is not enough that the guard exists and the threshold is right — ask what has
to succeed for it to ring at all.*

`vbrQueueShare_` is therefore called from `healthCheck`, on its own schedule,
independent of whether the nightly ever reaches section 36 — the same move 7.27
made for `embGates_`. **And it opens the door itself** rather than reporting it
(5.95: a gate a human has to open is not a gate). The repair is still said out
loud, because a repair nobody hears about is a repair that will be needed again.

**«Never written» is not «written and empty».** `voicebridge.py` already refuses
a `rev < 1` queue, but that only reddens a workflow the owner does not watch. The
engine's own daily line now separates the three empty states, because only one of
them is a fault: **no speaker switched on** is healthy and the line says exactly
what is needed; **a speaker on with an unwritten queue** is a fault and the line
names the speaker; **a written, empty queue** is ordinary news. A warning that
fires for the healthy state is the warning people learn to ignore.

`out.rev` is read **immediately** after `vbrRead_`, not further down: if any later
call throws, `everWritten` stays undefined and the daily line accuses the nightly
of something it did not do. An accusation must come from somewhere that cannot be
mistaken.

**7.40 is the other half, and it was missing until the fix was checked against
what actually happens next.** `voicebridge.py` refuses a `rev < 1` queue and must
— a green "0 episodes" on a file the engine has never seen is a false green. But
the engine only wrote the queue when it had *work*, i.e. when a speaker was
switched on. So until the owner switches a row on, the workflow goes red every
six hours **for a state that is not a fault at all** — and this file has written
that sentence many times: a warning that fires for the healthy state is the
warning people learn to ignore. A red that never changes stops being read, and
then the real red is not read either.

`vbrQueueEnsure_` writes unconditionally, which is what `vintQueue_` in section 33
did from day one: `rev ≥ 1` means "the engine is alive and looked" and `at` says
when. **The reason it is empty is stated somewhere else** — in the daily line,
where the owner reads, not in the Actions tab he opens by accident. The side
benefit is not an accident either: `vbrSave_` also opens the sharing, so the same
door now has two independent paths to it — which is exactly what 7.39 found
missing. And the opposite boundary is asserted: a switched-off bridge writes
nothing, because a switch that is half-off is not a switch.

**And one of the four new assertions did not fail when I broke the code.** It
searched the whole of `08_Health.gs` for `vbrStatus_(` — which the `_STATUS.json`
block also contains — so removing the `healthCheck` call left it green. An
assertion that cannot fail is worse than none, because it goes green and nobody
looks again. It now reads only `healthCheck`'s own body. Every new claim here was
proved falsifiable by deliberately breaking the code, not by reading it.

## A retry that forgets what it was retrying does something else (7.44)

23 September: two «از همه جا از همه رنگ» episodes. Episode 49 finished at
07:21; at **07:23** the engine wrote episode 50 — **with no enrichment at all**,
because there was no window left for it. 5:25 against 49's 10:27.

`produceEpisodeRetry` carries no memory. The lock was busy, a retry was
scheduled, and by the time it fired `PK.PENDING` was empty — and an empty
`PENDING` is precisely how `produceEpisode` is told *"make a new episode"*.
**A retry that does not remember what it was retrying does something else.**

The guard goes at the **decision to create**, not in the retry, because the retry
is not the only road there: a duplicate trigger reaches the same line (`trigNames_`
caught one once), and so will whatever gets added next. The stamp is written
**before** the episode, not after — otherwise a run killed mid-write leaves no
stamp and the bug simply becomes rarer. Manual always passes, the `calGate_` rule:
the owner pressing the button has already decided. And the twin in درس‌نامه was
fixed in the same change (5.95).

## A witness that dies with the accident is not a witness (7.44)

The same day's log showed the nightly's third run starting at 02:40 and leaving
**no terminal line at all** — not «فهرست تا آخر رفت», not «وقت تمام شد سرِ…»,
not a next run. Apps Script had killed it at the six-minute cap.

Everything from the embed block onward had therefore not run **for three nights**:
fingerprints frozen at 5,265 of 50,568 since 21 September, YouTube publishing,
reference judging, extraction quality, the style sample, the recap.

**And `nightStarve` said «هر شب فهرست تا آخر می‌رود» every single day.** It was
not lying; it was blind. Its only source is `nightEnd_`, and the kill that ends
the night kills `nightEnd_` with it. *The evidence existed only in the case where
nothing went wrong.*

`nightAtSave_` writes the heartbeat **before** each block, so it survives the
kill — written after, the block that ate the time and caused the kill is exactly
the one never recorded. `nightDeath_` then reports a past night that never reached
«پایان», and it is asked from `healthCheck`, not from the nightly that may itself
be the thing dying (7.27).

**Three suites created a second episode and the guard threw them out** — which is
how two false claims surfaced. One asserted «روزِ تمام‌شدنِ یک مجموعه هدر نمی‌رود»,
a behaviour no code in the engine has. The other said it pressed «دکمهٔ دستی»
while calling the automatic signature. *A test that takes a different road than
the one it names is talking about something else.*

And one new assertion did not fail when I broke the code: it hand-wrote the
«پایان» stamp instead of asking `nightEnd_` to produce it — 7.22 exactly, caught
by breaking the code rather than reading it.

## Reviewers must run it, not read it — and the debt register (7.44)

After 7.43 he asked the question that matters more than the bug: *how would you
have found out if I hadn't told you? And what about everything else you built
that I have not tried?* Then he pointed out he had said this at build time:

> «بازبین‌ها کد رو فقط نبینن و اجرا باید بکنن.»

He was right, and the guard I had built read the code. `run_wiring_test.js` ۵٫۲
string-matched `google.script.run.X` and checked `X` existed. Nothing ever
rendered a dialog, executed its script, or pressed a button.

**`tests/run_dialogs_test.js` does.** A small DOM and a `google.script.run` proxy
in `tests/lib/dialogdom.js`, a `vm` context per dialog: render, run the script,
then fire every `onclick` with the real button as `this`, and assert which server
function was reached with which arguments. Pressing «جست‌وجوی ساده» must produce
`srchRun('هزینه','ساده',true)`. Both of the day's real bugs were reintroduced
deliberately and both turn it red.

**The DOM deliberately returns `null` for an id the page does not contain**, the
way a browser does. A stub that invents a node for any name would go green on a
button wired to a typo'd id — the harness would then be blind to the very class
it exists for.

**And the honest number: 36 of 56 menu items were named in no suite at all.**
Rather than hide that behind thirty-six shallow tests, it is written down as
`MENU_DEBT` — a debt register, not an exemption. The rule is one-way: removing a
name is good, and a new menu item without a test fails the assertion. One debt
paid per week (the monitor prompt, v58) clears it without crowding any version.

**The first version of that count returned zero.** The debt list lives in a test
file, and the scan read every test file — so each name counted as "seen in a
suite" and the debt reported itself as paid. An assertion that goes green because
of its own text measures nothing. That is the fourth time this week, and the habit
that catches it is always the same: break it on purpose and watch it go red.

**What no automation can answer stays named, not waved at.** Whether the search
actually found the thing he meant, whether the voice sounds like him — those are
listed for a human by name, because a report that says "everything looks fine"
about things nothing exercised is the most expensive sentence in this file.

## The guard stood one layer above the breakage (7.43)

«هرچی رو دکمهٔ جست‌وجوی ساده می‌زنم هیچ اثری نداره.» He was right, and it was
worse than it looked: not that button — **both buttons, and the whole dialog.**

The dialog's script is assembled from single-quoted strings, so `\"` collapses
to `"` right there in the `.gs` source. The emitted JavaScript carries unbalanced
quotes, the entire `<script>` block fails to parse, and **nothing inside it is
defined** — not `go`, not `esc`, not `show`. Clicking does nothing and no error
is raised anywhere.

**And the second instance is the one that matters more: the «شیوهٔ خواندنِ
گویندگان» board had the same bug in its own `esc`, so it has never worked since
7.35 built it.** That is the board he was told to use to switch the voice on. I
wrote it, documented it, shipped it, wrote a monitor prompt section about it —
and never once rendered it.

The search line is bitter in its own way: those two lines were added in 7.24 **for
safety**, escaping `href` so a quote in a source cell could not inject script into
a dialog that holds `google.script.run`. The safety fix killed the feature, for
two days, with no symptom anywhere.

**Why the guard missed it, and this is the part to carry forward.**
`run_wiring_test.js` ۵٫۲ asks *"does the function that `google.script.run` calls
exist?"* and for both dialogs the answer was **yes**. The question was right and
the answer was right — it was simply **one layer above the breakage**. The server
function existed; the client code that would have called it never parsed.

۵٫۲-ب now renders each dialog, extracts every `<script>` block and parses it with
`new Function`. It does not execute (that needs a DOM and `google`) — only syntax,
which is exactly what was broken. Both bugs were reproduced deliberately and both
turn it red.

This repo has written since 5.61 that *a dialog button that silently does nothing
is the worst failure shape here*, and built a guard for exactly that. The guard
was real, the threshold was right, and it still stood in the wrong place. **Ask
not only "does the alarm exist" but "is it standing where the thing actually
breaks".**

## The cure for one bug left the only door behind a manual step (7.42)

He asked why 54 rows were still open, and framed it exactly right: *find the
cause of them **not closing**, don't just log them again.* The cause is one
sentence, and it was findable in a minute of looking at the code plus a minute
of looking at git history:

> A row closes **only** when `manifest.json` names its id in `sourceReportIds`.

**Of the last thirty versions, one filled that list.** So the queue could only
grow. 5.93 was right to make an empty list mean "answers nothing" — before it,
an empty list closed *everything* and one row carried install stamps from
fourteen versions. But the cure put the only closing door behind a manual step,
and the step was performed once in a month. **A gate a human has to open is not
a gate** — this repo's own rule, violated for a month by the fix for another bug.

**And nothing closes automatically now either, on purpose.** The tempting move is
"not seen for N days, so it is probably fixed". But if the *detector* broke,
silence means blindness, not health — and auto-closing hides exactly that case
forever. So the number is only made honest: **`pending` (still recurring) counted
separately from `quiet` (not seen for `CODE_QUIET_DAYS`)**, which is 5.88's
«رهاشده جدا از عقب‌مانده» again, and the daily line says in words that quiet does
not mean solved.

**Both dates come from events the running system already writes** — «آخرین تکرار»
from `logSelfFinding_`, and the answer date from the text `markCodeRowsInstalled_`
writes — never from a stamp of our own. 7.22: an alarm whose own writer resets it
can never fire.

**And obligation, not just detection.** `CODE_NOANSWER_DAYS` with a non-empty
queue raises a `NEEDS_CODE` row of its own, carrying the real closing rule in its
instruction. 7.18/7.19: detection was never the missing half — obligation was. Its
instruction says explicitly that the answer is *not* to log the rows again, because
that is precisely the loop it is meant to break.

## Half a request delivered is a request you have to be asked about twice (7.41)

On 20 September he asked, in one sentence: «بتونم … چه به صورتِ **دائم یا
موردی** از صدایی که استفاده کردیم استفاده کنم». What got built was «هر چند
قسمت» — **periodic**, not occasional. "Make *this* episode in his voice" had no
route at all, and I did not say so. He found it himself, two days later, by
re-reading his own messages.

**That is the 7.34 rule failing a second time**, and it is worth stating in its
sharper form: *when the answer to "did we do all of it?" is "most of it", name
the missing part unprompted* — because the alternative is that he re-reads his
own words to discover what you dropped, and then nothing you report is trusted
without him checking.

**«موردی» deliberately bypasses «فعال» and «هر چند قسمت».** Without that it is
merely «دائم» under another name: to give one episode the voice you would have to
switch the row on, which makes it permanent — exactly the thing he did not want.
So a row that is **off** can still produce a guest voice, and the monitor prompt
(v56) says so in the same version, or it would report a wanted feature as a
violation — the stale-prohibition trap 7.36 already paid for once.

**«موردی» beats «دائم»** because it is about this one episode and the other is
about all of them; the next episode still gets the permanent voice, which is its
own assertion — otherwise «موردی» would silently switch the permanent voice off.

**The new column goes at the END of `PERSONA_HEADERS`.** `ensureTab_` rewrites
only the header row, never the data, so a column inserted in the middle puts new
labels over old values with no error anywhere — the dashboard bug its own comment
records.

**An unreadable line is refused and named, the opposite of `personaModes_`.**
There, a malformed line is dropped silently and that is right: one fewer mode is
a quality loss. Here a dropped line is **an episode he asked for and will silently
not get**, and he never finds out. Same shape, opposite correct answer — which is
why the rule has to be reasoned each time rather than copied.

**And the public wrapper had to grow the argument too.** `personaBoardSave` is
what `google.script.run` calls; a missing parameter there raises no error, the
board sends the value and the wrapper drops it, and the button just does nothing.
That is the exact failure `run_wiring_test.js` ۵٫۲ exists for, one layer in.

**One of the six new assertions did not fail when I broke the code** — "an unknown
episode number never matches" was held by two independent locks, so breaking
either left it green. It now targets the lock that actually does the work. This is
the third version running where a new assertion turned out to be vacuous on first
check; the habit that catches it is breaking the code every time, never reading it.

## The control that was never where the work is (7.35)

On 20 September, in the same message that asked for the soul, he asked:
«**انتخاب صدای گوینده برای پادکست رو در منو کدوم گزینه میشه انتخاب کرد؟**»
The honest answer that day was **none**. The «صداها» tab existed and held the
rows, but the only way to use it was editing nine columns by hand — and he does
not open sheets.

This file already carried the fix, written for the production calendar in 5.61:
*a control that sits somewhere other than the work it controls does not get
found.* The calendar got a panel. Voices got a tab.

**The 5.61 boundary is repeated exactly, not approximated.** The board reads and
writes the *same tab and the same columns* `personaFor_` reads. The data model
was deliberately left untouched, so that function's suite is still the guard and
a broken window cannot break production. The test proves it **through the gate
itself** — save from the board, then ask `personaFor_` what it picks — rather
than by reading the board back, which would only prove the board agrees with
itself.

**«آخرین تصمیم» stays read-only.** The engine writes it, and it is the only
honest answer to "did my setting actually take effect?". A mirror you can edit
is not a mirror.

**Two doors that would otherwise leave someone believing they had switched it
on.** "On, but no show ticked" and "on, but the style cue is empty" are both
**refused with a reason**, not silently converted to off. The calendar converts
"on with no weekday" to off because "every day" was a natural reading there;
here an empty show list means *I don't know where*, and guessing is wrong in
both directions. And a row with an empty cue is dropped by `personaFor_`
without a word.

**Order is a behaviour, not a layout.** `personaFor_` takes the **first**
eligible row and marks the rest «صدای دیگری زودتر انتخاب شد». A board that does
not say so leaves someone who switched on two rows waiting for something that
will never come.

## Colour was cloned; the soul was not (7.34)

On 20 September the owner asked, in one sentence: «اگر بخوام گویندهٔ جدیدی
اضافه کنم که صداش رو و **روح و رنگش** رو کلون کنی این رو انجام بدی و اضافه
کنی؟» He was told yes. Only the **colour** was being cloned.

**The two are different things, and RVC only does one of them.** A voice
conversion model changes timbre. Pause, stretch, rhythm, range — what he calls
the soul — are not its *output*; they are its **input**, arriving from Gemini's
reading. So the soul has to be measured from the speaker's own recordings and
handed to Gemini as an instruction. That is what `tools/stylecard.py` does, and
it was run **by hand** for Razavi on 18 September.

`grep -c stylecard .github/workflows/voice-intake.yml` returned **0**. The
seventh instance in this file of analysis written, tested, and never wired to
the decision. The tool existed, the numbers were real, the guard suites were
green — and for every new speaker half the request silently did not happen.

**The style job is deliberately not tied to the model.** It is a third job, not
a step inside `measure`: the card is measured from the speaker's own audio and
needs no model at all. Tying them would mean a speaker whose training fails
never gets a soul recorded either — one failure taking two capabilities. It also
lands hours earlier, while training is still running.

**`styleSheet_` sits beside `styleCard_`, not in `voiceintake.py`.** Both turn
the same numbers into text; two copies of one derivation is how one of them goes
quietly stale. The full card is pages long and belongs in Drive; what goes in the
sheet cell must fit under `ttsCue_`'s 320 characters on its own (measured: 257).

**The vibe tags are deliberately left empty.** A mode's name and cue come out of
its numbers, but *which vibe this mode suits* is a human judgement, not a
measurement. `personaModePick_` never selects a tagless mode, so the base cue
runs — degrade toward silence, not toward a guess. The empty separator must
still be written, or `personaModes_` drops the whole line without a word.

**And the row is created switched off, and never overwrites an existing one.**
The style column is where the owner tunes it by hand; a fresh measurement writing
over his edit is the music scan erasing the curator's taste (5.95). Creating the
row sends news, because he asked for exactly that — «وقتی یه گوینده اضافه شد باید
علامت بخوره» — and the news says plainly that it is off, that the tags are his to
fill, and that **this is not the colour of the voice.**

**None of this is the bridge.** The bridge is the episode's own audio leaving,
being converted, and coming back. It does not exist and stays forbidden.

## A question already answered is a question that was never read (7.34)

Asking the owner today whether to wire the style card was the real failure of
this session. He had decided it on 20 September, in writing, in this
conversation. The transcript was on disk the whole time; I answered from memory
instead of opening it.

Two rules follow, and they cost trust to learn:

**When the answer to "did we do all of it?" is "most of it", say which part was
not done, unprompted.** Silence about the missing half is how «هر سه مورد» became
two and a half, and nobody noticed for two days.

**Before asking the owner anything, check whether he already said it.** A
question he has already answered does not read as thoroughness; it reads as
not having looked — and it is, exactly, not having looked.

## Half a question is a whole silence (7.33)

`voice-intake` went red four times running, from its very first scheduled run
on 20 September. The cause is one sentence: `_VOICE-QUEUE.json` was not shared
«anyone with the link», and Drive answers such a request with an **HTML page**
rather than a 403 — so the action received something that is not JSON and said
so. The only place that failure was visible was GitHub's Actions tab, which the
owner opens by accident, not by habit.

`vintQueueIdOk_` was written for exactly this silence — its docstring says «the
action cannot read the file and no error is raised». It asks **half** the
question. The id was right, the file was where it belonged, and the action still
got nothing. *Can the action read this file?* has two halves and only one was
guarded. `vintQueueShare_` asks the other.

**And it opens it, rather than reporting it.** The owner does not open a sheet,
let alone a Drive ACL; a gate a human has to open is not a gate (5.95). A closure
that got fixed here does not invalidate health, but it is still said out loud —
a repair nobody hears about is a repair that will be needed again.

**Why nothing caught it.** The one place the queue's sharing was opened was
inside `vintQueue_`, in a bare `catch (eQ) {}`. Detection and repair were tied to
the same path, so the night the nightly never reached that block — which is
precisely the 7.29 bug — it was neither opened nor noticed. The new check runs
from `healthCheck` too: `embGates_`, 7.27, one section over.

`voice-intake-stuck` existed and would have fired — in three days, by inferring
from "no answer came back". Its own instruction text even asks «is the Drive
queue shared with anyone who has the link?». The right question was written down
and nobody was ever made to ask it. **A condition one direct call can settle must
not be inferred from three days of silence.**

**And on the action's side, the shape that would have hidden the rest.** The file
in Drive was a hand-made placeholder — `rev: 0`, `engine: 7.21`, `speakers: []`.
The moment sharing was fixed, the action would have read it, printed «0 speakers»
and gone **green**, with a real speaker waiting in the folder and nobody the
wiser. `vintQueue_` always increments `rev`, so any genuine queue is `rev ≥ 1`.
*Never written* and *written and empty* are different facts and an empty folder is
a healthy one. An honest red beats a false green.

## The wrong party accused again — and rationalised the second time (7.32)

21 September, the 10:00 health mail: «تسکِ غنی‌سازی ۸ روز است کاری نکرده …
روتینِ Cowork را وارسی کنید». `_ENRICH-variety-046.json` had been sitting in the
OUTPUT root since 04:31 that morning — written by that task, five hours earlier.
`enrichAnsName_` is only ever *read* by the engine, never written, so there is no
other author it could have.

That alone is the 7.18/7.19 failure repeating: the wrong party accused, by a
watchdog built after the last time to stop exactly this.

**The part worth recording is what happened next.** The monitor session saw the
same two numbers disagree — and *explained the disagreement away*: «این دو عدد
چیزهای متفاوتی می‌شمارند … نه اینکه چیزی خراب باشد». It never opened the folder.
A contradiction resolved by reasoning instead of by looking is not resolved; and
this file already says, in the 7.19 section, that such a contradiction **is itself
the finding**.

The cause of the mis-read is still unknown, and guessing it would be the third
mistake in the same story. So 7.32 does the only honest thing: `whNewestEnrich_`
now returns **what it saw and how many** — the filename it judged newest, the count
of answer files it walked, and the error if the folder walk threw (it was wrapped
in a bare `catch` that returned a silently partial answer, which is one plausible
cause). The watchdog's own text carries that evidence, so tomorrow the mail either
names today's file — transient — or names a stale one beside a count that includes
the fresh one, which localises the bug to the comparison.

**A number that accuses somebody should carry its evidence.** That costs one
string and ends an argument that has now run twice.

## A guard bigger than the budget, and a spend bigger than the guard (7.30 / 7.31)

7.28 raised the embed block's `nightHas_` from 230 s to 300 s, reasoning in the
commit message that `_nightMore` would hand the block "a fresh six minutes" on the
next run. `NIGHT_BUDGET_MS` is **270 s**. `nightLeft_()` can never exceed it, so
300 s was unsatisfiable — not rarely, never. And because the first failing
`nightHas_` sets `_nightMore`, which makes every later `nightHas_` return false,
this was not only the embed block: the cross-series backfill, the model verdict,
YouTube publishing and everything after them would have stopped running every
night from that install onward, silently.

**The monitor session found it by reading the code before it installed**, shipped
7.30, and added the guard that makes it unrepeatable: `run_oneshot_test.js`
extracts every `nightHas_` number from the source and fails if any exceeds
`NIGHT_BUDGET_MS`. That is the loop working exactly as designed — and it is worth
recording that the thing it caught was mine.

**7.31 closes the layer underneath.** The guard said "I need 230 s"; the block then
spent up to `EMB_SPECS_MS` + `EMB_BUDGET_MS` = 290 s. *How much I ask for* and *how
much I spend* were two numbers nobody had compared. Overrunning matters more than it
looks: Apps Script's hard six-minute kill also kills `nightEnd_`, so the night is
never rescheduled — a failure with no error anywhere. 150 + 60 = 210 s now, with
margin under the guard, and the honest cost is that the initial backfill goes from
~10 nights to ~14.

**The rule, and it is the same one three versions running:** a number that gates
work must be checked against the number it is measured in. 7.30 checked guard ≤
budget; 7.31 checks spend ≤ guard. Both are arithmetic that no amount of testing
the *function* would ever surface, because the function is correct — it is the
relationship between two constants that is wrong.

## The night a version installs is the one night its new code does not run (7.29)

21 September, the first real use of section 33. The owner dropped a folder —
«محمد تقی پور گلدوز», 27 mp3 files, ~97 MB — at 22:23. The nightly ran at 02:30
and `_VOICE-QUEUE.json` **was not touched**. No error anywhere.

The fault was not in section 33. `vintQueue_` writes unconditionally, mp3 is in
`VOICE_AUDIO_EXT`, and the scan saw him (the 10:00 health mail said «در نوبت: ۲»).
It was one line of structure: `vintNightly_` sat inside `if (night.first)`.

That night 7.27 installed. The **first** run executed the *old* code — 7.16, which
had no section 33 at all — and `afterCodeSwap` started a second run on the new
code. In that run `night.first` was false, so the whole cheap block was skipped
and `vintNightly_` was never called. Section 35's block ran because it happens to
sit *outside* that brace.

**Generalised: anything inside that block does not run on the night its own
version installs** — the one night it is newest and most likely to matter. And the
same gate defeats the multi-run machinery: if run 1 runs out of time inside the
block, run 2 skips the block entirely, so `_nightSkipTo` can never steer back into
it.

This is the 7.22/7.27 bell one layer up again, and it is worth stating as its own
rule because it keeps arriving in new clothes: **it is not enough that the guard
exists and the threshold is right — ask what has to succeed for the code to be
reached at all.** Three times now the answer was "a path that does not exist".

The fix moves the voice round out, and the test does not carry a hand-written list
of what belongs outside — it inverts it. Everything still *inside* must be named
in an allowlist with a reason, so the next capability someone puts there fails the
suite until they justify why running it twice is safe. `srcNightly_` stays inside
deliberately: it installs analyzer code, and a double install is not harmless.
`vintNightly_` is safe outside because it is idempotent — it rewrites the queue
with a higher `rev` and builds nothing twice.

**And the owner's own first use is the measurement that found it.** Two test
suites and 49 green runs never did, because they all asked "does the function
work", never "does anything call it tonight".

## The first real night gave the number, and it was four times my estimate (7.28)

7.26 shipped on an estimate: "roughly twelve thousand bank rows, a few nights to
build." The first night measured it. **50,367 rows.** At 1,200 a night that is
forty-one nights, not a few — and "a few nights" and "six weeks" are two different
promises to have made.

Two things follow, and both were cheaper to fix that morning than later.

**The cap was the wrong one.** The run built 1,200 rows in about fifty seconds
against a 120-second budget: it stopped on the *row* cap with more than half its
time unspent. Raising it to 5,000 with a 200-second budget puts the backfill near
ten nights. The night guard went to 300 s, which almost never passes on a night's
first run — and that is the point: `_nightMore` records it and the next run of the
same night starts *there*, so the block effectively gets a fresh six minutes.

**And the index will not fit in a query.** 7.26 wrote "if the index ever outgrows
what one search can read, IVF centroids are the next step" and left it. At 50,367
rows the probe index is ~30 MB across ~34 shards; no search reads that. The
measurement turned a hypothetical into a fact. Each shard now carries a centroid —
the normalized mean of its probe vectors — and a search scores the centroids
(cheap, they live in the index file) and reads only the nearest `EMB_PROBE_SHARDS`.

**Why *that morning* and not when it bit.** A centroid has to be computed when the
shard is written. Waiting six weeks would have meant 34 centroid-less shards and a
migration. **Work that gets more expensive as the data grows is work to do early.**
`embCentroidFix_` exists only for the one shard that already existed, and a shard
without a centroid is *always* read — not knowing is not a reason to skip.

One piece of luck worth writing down: shards fill in bank-tab order, so a shard is
roughly one category. The centroids are meaningful rather than mush, which is not
true of an index filled in arbitrary order.

**And a floor that silently ignores its own setting.** `EMB_SHARD_ROWS` was clamped
to a minimum of 200, so the test that needed small shards got 200-row ones and
proved nothing. That is the same trap that misled three assertions earlier in the
same session — a configured value that has no effect and says nothing about why.
The floor is 1 now: enough to stop a zero looping forever, not enough to override a
human.

## Fifteen columns out of sixty-one (7.27)

Two questions from the owner, each of which exposed a real defect rather than
needing reassurance.

**"Does the fingerprint see only the extracted content, or the other source
columns too — vibe, duration, everything the analyzer pulled out?"** The source
sheets carry up to **61 columns**. `buildAutoRec_` mapped about fifteen. Duration,
persons identified, music analysis, technical specs, visual and audio analysis,
narrative elements — none of them ever reached the bank, so they were in neither
the bank's search nor the fingerprint. Vibe was there; nothing else was.

`srcSpecsText_` takes **everything else, by exclusion rather than by a whitelist**.
Naming the useful columns one by one is the 5.95 shape: the analyzers add columns
— several times this year — and every new one would silently stay out. So the rule
is inverted: take every column that isn't already a bank field and isn't
bookkeeping (timestamp, id, link, status, chunk counters). The header name travels
with the value, because «12:34» without «مدت زمان» says nothing, and it is the
header that makes "a clip about twelve minutes long" findable.

Caps are 120 chars per field, 700 total, and that is a retrieval judgement, not a
storage one: **breadth beats depth.** Six short clues find a thing; 700 characters
of one long column finds it once. The cap also keeps a 29 MB hub from doubling.

**"If something has been done wrong, are you sure the automation sees it, fixes
it, and follows the fix through?"** Partly — and the missing part was serious.
7.26 never touched a row that already had a fingerprint. So if the embedded text
turned out to be wrong, fixing it would repair only future rows while twelve
thousand existing ones stayed wrong forever, with nothing anywhere saying so. The
exact thing this file already records for handout chapter titles in 5.95:
*cleaning the input does not fix what is already written.* I built the same shape
again, one version later.

`EMB_TEXT_VER` is the fix: the recipe version rides in the fingerprint cell
(`<hash>·و<ver>`), a row built under an older recipe is not counted as done, and
the existing cursor rebuilds it. Bumping one integer re-embeds the whole bank over
a few nights. And `runEmbedRebuild` is the door a human can open — 5.95 again: a
gate nobody can open is not a gate, it is a dead end.

**The alarm was wired only to the path that starves.** `embGates_` was called from
`embNightly_` alone. The night the time guard skips that block is exactly the night
"nothing is progressing" needs saying, and on that night nothing was said. The gate
now also fires from `healthCheck`, which runs on its own schedule. This is the 7.22
bell one layer further out: it isn't enough that the alarm exists and the threshold
is right — check what has to succeed for it to ring at all.

**And the self-test was quietly tautological.** It queried with the row's own
title, which is inside the very text the vector was built from. That detects a
broken index and nothing else: if the embedded text were systematically wrong — a
mis-mapped column, a dropped field — the query and the document would carry the
same error and the test would stay green. It now asks the model to restate the
title in different words first, which is what the owner actually does. When the
model is unavailable it falls back to the title **and reports `mode: 'عنوان'`**,
because a test silently downgrading to its easy variant is worse than a test that
fails. Its own new assertion caught a real bug on the first run: `geminiText_`
returns a parsed object, and the extra `JSON.parse` made the paraphrase path
return null every time — the test would have sat on "model unavailable" forever.

## The fingerprint the sheet cannot hold (section 35, 7.26)

The owner asked whether smart search looks for *meaning* or only for synonyms.
It was synonyms: `srchExpand_` widened the words and `srchRank_` reranked
semantically, but **both ran on what word-matching had already found**. A row
that says the same thing in entirely different words never reached the model.
Judgement was semantic; retrieval was not. That gap is what section 35 closes —
one embedding vector per bank row, and `srchSemantic_` as a *second candidate
source* beside the lexical one rather than a change to it.

**The vector does not go in the sheet, and that contradicts the request.** He
asked for the fingerprint "in a new column". Three columns did land in
`HUB_HEADERS` — the stable id, the content hash and the status — but 1536
numbers per cell is tens of megabytes of text in a hub that is already 29 MB,
dragged along by *every* read of the bank. The vectors live in an OUTPUT
subfolder, in shards. Say this out loud rather than quietly doing something
else: a request refused silently is the one that gets asked again.

**And nothing is written to the five source sheets — ever.** New source content
reaches the bank through `syncCatalog` and is fingerprinted there. So the answer
to "does it notice new content automatically" is yes, and the chain is honest:
source row → bank row → fingerprint, on the next nightly.

**The date is deliberately absent from the embedded text.** His own words about
ranking: «نه از حیثِ زمانی بلکه از حیثِ محتوایی». A date inside the vector pulls
two same-day items together for no reason.

**One call, two representations.** MRL means the first 256 dimensions of the
returned vector, *renormalized*, are a valid short vector. So search scans a
small probe index and only the top candidates are rescored with the full vector.
Two API calls for this would be paying twice for the same thing.

**`embNorm_` runs unconditionally, and that is the point.** Google's API
normalizes only at 3072; every other dimension must be normalized by hand. A
conditional branch there means that one day someone changes `EMB_DIM` and
nothing anywhere says that ranking has stopped working — no error, no empty
result, just numbers that look like similarity scores and are not.

**The threshold that decides is relative, never absolute.** An absolute cosine
floor is right for one query and silently returns "nothing found" for the next,
because the absolute value depends on text length, language, even how many
structural labels the document text carries. `EMB_SCORE_GAP` cuts relative to
the best hit. This is the 7.24 shape — a cap that ate the feature — refused in
advance.

**A row that can never be embedded is abandoned, not pending.** After
`EMB_TRY_MAX`, `embFailMark_` writes «رهاشده», counted separately. Without it
`pending` never reaches zero and «~۳ شب تا پایان» sits in the daily report
forever — 5.88 again.

**`embSelfTest_` is the only check that actually tests anything.** It takes a row
that already has a fingerprint, sends its own title back as a query, and asks
whether the row finds itself. Everything else in this section counts. Two
consecutive failures raise a `ROWNER_CODE` finding; one does not, because a bad
night must be allowed to stay a bad night. This is the repo's sixth instance of
"analysis written and never wired to a gate" — answered at the time of writing
instead of afterwards.

**`embStuckDays_` reads the history tab, never a stamp of its own.** 7.21
shipped an alarm whose own writer reset it nightly, so it could never fire. The
test for that alarm passed because the test hand-built a state the running
engine could not reach.

**A test double that is sparse where production is dense proves nothing.** The
first `fakeVec` in `run_embed_test.js` lit a few dimensions per word. Truncating
such a vector to 256 dimensions destroys its signal — so the suite failed and
blamed the code, while the fault was in the double. Real embeddings are dense
and MRL depends on exactly that. Same lesson as the RE2/RegExp mock in 7.24,
one layer over.

## A cap that stops the scan decides by tab order, not by relevance (7.25)

7.23's search stopped collecting once it had 240 candidates. Tabs are walked in
`getSheets()` order, so 240 *weak* matches in the first tabs could prevent the
user's **exact phrase** in the fifteenth tab from ever being read. "Ranked by
meaning" was true only within an arbitrary prefix of the corpus. A cap should say
*how many you keep*, not *when you stop*; what stops you is time.

**And trimming mid-collection reintroduces the same bug sideways.** Equal scores
keep insertion order, and the source spreadsheets are walked last, so a
tied source result was always the one discarded. Trim once, at the end, after a
global sort — the working set is bounded by a row budget instead.

**Two of 7.24's own fixes made things worse, and only a second review caught it.**
Opening the read to all columns was necessary, but it turned the 400-row block
heuristic into 32,000 cells on sheets whose cells reach 11,000 characters —
`CFG.SYNC_CHUNK_WIDE` had existed since the beginning for exactly this. And
raising the `findNext` bound from 4× to 6× enlarged the one loop that had no
deadline check inside it, on a 62 MB spreadsheet, against a six-minute kill that
Apps Script does not let you catch. **A fix tested only in the direction you were
thinking about is half a fix.**

**The first non-empty cell is not a title.** Column 1 of all twenty-two source
tabs is `Timestamp`, so every source result was headed by a date — for an owner
whose stated requirement was «نه از حیثِ زمانی بلکه از حیثِ محتوایی». `srcMap_`
already resolves `Main_Subject` / `General_Executive_Summary` / `Key_Points`
across all five schemas and `buildAutoRec_` has used it for years; ignoring it was
the wrong call. (It takes the raw header row — passing `hdrSet_`'s boolean map
silently resolves every column to −1.)

**The only failure mode here is silence, so it now leaves a trace.** Each search
writes one line to the existing log: mode, hits, rows read, tabs, zero-scored
candidates, and whether it stopped early. Closing the dialog used to erase all
evidence that a search had happened at all.

## Two layers that disagree resolve it by deleting (7.24)

7.23's search had a deliberately **lenient** finder (a regex that swallows ZWNJ,
diacritics and spelling variants) and a strictly **literal** scorer (`indexOf` on
normalised text, over a 24-column, 4,000-character window). Every disagreement
between them was resolved by `if (it.score <= 0) continue;` — a silent delete.
Five separate reproducible paths returned `items: 0, stopped: '', notes: []` for
content provably in the sheet. In a search feature that is the worst possible
output: the user concludes the thing does not exist, when only the search failed.

**When two layers decide the same question, they must use the same rule.**
`srchTight_` now gives the scorer the finder's leniency.

**A mock that is lenient where production is strict proves nothing.** Sheets runs
RE2; RE2 only allows a backslash before ASCII punctuation, so `\؟` is an invalid
escape there and valid in JavaScript. A single Persian question mark in the user's
sentence made `createTextFinder` throw, which `srchFind_` swallowed into `[]`. The
test mock used JavaScript `RegExp` — and, worse, fell back to a non-`u` RegExp when
the strict compile failed, which is exactly the class RE2 rejects. **When a test
double stands in for a different engine, list the ways that engine is stricter and
assert those properties directly** rather than trusting the double.

**The cap that ate the feature.** `if (opts.sources !== false && !out.stopped)`
meant any term common enough to fill the hub's candidate cap skipped all five
source spreadsheets — and the dialog simultaneously advised the user to untick
sources, i.e. to disable a layer that had never run. For any ordinary query that
was the normal case, so "all of it" was false in practice. A guard written for one
resource must not silently gate an unrelated one.

**And a safety claim of mine that was slightly false.** 7.23's docstring said the
section writes nothing — "not to the sources, not to the hub". Calling `getHub_()`
can repair hub tabs, as it does everywhere else. Not a rule violation, but a claim
nobody would re-check. **A safety claim that is slightly false is worse than none.**

The fix for 6.20's blind guard was, in 7.23, a hand-written list of dialogs — the
5.95 shape offered as the cure for the 6.20 shape. It now derives the list from
`showModalDialog` call sites in `src/`.

## An alarm the alarm's own writer resets (7.22)

7.21 shipped `voice-intake-stuck` with the right words, the right owner and the
right threshold — and it could never fire. `vintQueue_` stamped `PK.VINT_QAT`
every nightly run, and `vintStuckDays_` measured from that stamp. The number was
always zero. Its test passed because the test hand-wrote a nine-day-old stamp,
**a state the running engine cannot reach**.

This is the fourth time in this file: `sfxAllow_`, `pruneEnrichFiles_`,
`musicWish_`, `audit-attrib-low` — and now this. The new part worth carrying
forward is the test-shaped version of it: **when a test has to construct the
state by hand, ask whether the running system ever produces that state.** If it
does not, the test is proving something about the test. The stuck count now
derives from the history tab, which nothing else writes to.

**Two people can also become one.** `vintSlug_` accepted any two-character Latin
fragment as the key, so «سارا 01» and «نیما 01» both keyed `01` — one training
folder, one model, two voices, nothing reported. 7.21's own headline was that
the *cache* must never be shared between speakers; separating the cache of two
people who share an identity saves nothing. Identity is the layer below the one
you fixed. And the mirror defect: a ZWNJ or an Arabic ي made one person into
several.

**And the outside half had no behavioural test at all.** 46 suites were green
while the measure job could never succeed — `voicelab.py` declares `--ref`
required and the workflow never passed it; the error was swallowed by `|| echo`,
a later `cp` always succeeded, so the speaker was recorded «آماده» and announced
with the **unconverted** audio. The cross-boundary checks were all `indexOf`
greps, and no blocker changed a string. `run_voicepipe_test.js` now extracts
voicelab's required arguments from its own source and asserts the workflow
passes them, and asserts every step importing `voicetrain` carries `VT_VOICE`
(without it, `VOICE` defaults to `razavi` at import and the ladder prune silently
removes nothing). That is `run_wiring_test.js` ۴٫۲ one layer out: **a guard that
cannot see the workflow files leaves those doors open.**

**A reference is not a constant.** The measure step held Razavi's recording fixed
"so the numbers stay comparable". `rvcSim_` is cos(output, reference) — the
reference *is* the identity being measured. Hold the source fixed; never the
reference.

**And a cache budget is repo-wide.** Making the concurrency group per-speaker so
two people could train at once was correct in isolation and wrong in fact: one
speaker occupies ~9.5 GB of a 10 GB repo-wide cache, so the second evicts the
first, fails its resume gate, and is abandoned after three nights. The change
made to enable parallelism was the thing that doomed the second speaker.

## Seeing is not the same as being obliged (7.18 / 7.19)

Between 12 and 20 September not one `_ENRICH-REQ-*` was written — the Drive
root still holds the last two, `variety-037` and `special-038`, both stamped
12 September, and `pruneEnrichFiles_` keeps ten days so anything later would
still be there. (This paragraph said "10 September" until the folder was
actually looked at on the 20th. The shape of the failure is unchanged; the
date was two days off, and a date nobody checks is how a story drifts.)
Every day
the enrichment task put the answer in its own report — «تا موتور درخواست
ننویسد، غنی‌سازی کاری ندارد», with the count — and every day the engine's
own watchdog printed «غنی‌سازی ❌ کارِ شما — روتینِ Cowork را وارسی کنید».
**Both were on the screen. Neither was read against the other**, and the
wrong party was blamed for ten days.

Three separate failures stacked, and each one alone was survivable:

- **A busy lock that gave up silently.** `writeEnrichRequest_` is only
  reachable from `produceEpisode`/`produceSpecialEpisode`, and the gate
  needs `ENRICH_WAIT_MIN` before publish — so only the 04:00/05:00 *prepare*
  runs can write one. Those runs took the script lock and, failing to get
  it, returned. `renderAudioStep_` reschedules in exactly that situation;
  these two did not. Nobody had noticed the asymmetry until it cost ten days.
  What tipped it over was 7.01 moving the `_MUSIC-FEED.json` merge inside
  `syncCatalog` — every two hours, same lock. `busyRetry_` now retries, with
  its **own** handler name so cleanup can never touch a daily trigger (5.95).

- **One watchdog for two questions.** "Has the task answered?" and "has the
  engine asked?" are different questions with different owners, and the
  watchdog only asked the first. Now `enrichReq` asks the second, and while
  the engine has not asked, the task's silence is not counted as a debt.
  Someone with nothing to answer is not in arrears.

- **A serious finding that nothing obliged anyone to act on.** `reportRow_`
  routes by the word «کد» in the owner. Anything else becomes
  `ROWNER_ENGINE` / «تازه» — correct for content faults, which the engine
  repairs by injecting a correction into the next episode. But a «جدی»
  finding owned by «موتور» *about the engine's own machinery* can never be
  repaired that way, and it sat outside the `NEEDS_CODE` queue that the next
  version is built from. `touchExisting_` now escalates: «جدی» + engine-owned
  + seen `ENGINE_ESCALATE_SEEN` times ⇒ `NEEDS_CODE`, with the reason written
  into the row. One sighting escalates nothing — a bad night must be allowed
  to stay a bad night — and «متوسط» never escalates, because a queue that
  holds everything is not a queue.

**The rule to carry forward:** when an external task's report names an owner
different from our own diagnosis, that contradiction is itself the finding.
And detection was never the missing half here — *obligation* was. A report
that is read, filed, and binds no one is the same as no report.

## A finding is closed by name, never by default (5.93)
`markCodeRowsInstalled_` used to stamp **every** open `NEEDS_CODE` row as
installed whenever a manifest shipped without `sourceReportIds` — reasoning that
"a complete version contains every fix announced so far". It contains every
*line of code*; that is not the same as having *solved that finding*. Since
almost every manifest ships an empty list, every install closed everything.

The real data on 24 Aug: one row carried install stamps from **fourteen**
versions (5.51 → 5.92); 26 rows carried more than three. The nightly
"30 rows marked installed" message came from the same place.

An empty `sourceReportIds` now means **this version answers nothing**. When you
ship a version that does answer findings, list their ids — that is the only way
a row closes. And `RST.INSTALLED` now reopens on recurrence like `APPLIED` and
`CLOSED` do: a finding stamped installed that is seen again means the install
did not fix it, and without reopening it would sit in "awaiting the monitor"
forever.

## A cap the next stage can add to is not a cap (5.96)
5.90 made «one file» real: `specialCondense_` trims the generated text to the
one-file ceiling in code, not in a prompt line. It worked — episode 16 logged no
`sp-over-one-file` finding at all. And the episode still shipped as two files,
14:14 against a 10.8-minute target.

The growth happened *after* the cap. `applyEnrichment_` sizes its quota as a
percentage of the base narration (up to `ENRICH_MAX_TOTAL_PCT`, 25%), and the
base was sitting exactly on the ceiling. 25% of 10.8 is 13.5; plus 44 seconds of
music, 14:14.

The fix has two halves because either alone fails: `specialWriteCap_` reserves
the *expected* enrichment (`SPECIAL_ENRICH_RESERVE_PCT`, 12) so the lesson is
written with room — reserving zero kills enrichment silently, reserving the full
25% shortens every lesson by a quarter even on nights nothing arrives — and
`specialFileCap_` is a hard stop inside `applyEnrichment_` so the sum can never
exceed one file whatever turns up. When the room reaches zero the reason is
logged; a capability that switches itself off unnoticed is how the music bank
stayed empty for weeks.

## The analysis existed; nobody wired it to the decision (5.96)
`auditSnap_` reads each section's attribution from `sourceIds`. درس‌نامه has no
`sourceIds` — it writes the same information into `chunkNos` and `enrichIds`, and
has since the section was written. Nobody connected the two, so every درس‌نامه
snapshot recorded zero sources, the semantic judge had nothing to compare against,
and it dutifully marked every section «پیوندِ ساختگی» and «فراتر از خام». A
«جدی» finding blaming the writing, every single night, for a mechanism gap. The
judge even said so in its own words: «هیچ منبع خامی برای این بخش ارائه نشده است».

Three lessons, all already in this file and all re-learned here:
- Analysis written and never turned into a gate (the fifth instance).
- A judge given an empty input returns a verdict, not evidence — so when no
  section carries attribution, the model path is skipped entirely.
- The right alarm *did* exist (`audit-attrib-low`, owner «کد», worded almost
  exactly as the fix) — and never fired once, because its bad-night counter was
  shared between the two shows. درس‌نامه raised it every night and the variety
  show's 100% reset it the same night. **An alarm two subjects share is nobody's
  alarm.**

## A report that cannot be read is worse than no report (5.96)
The enrichment task wrote a `_REPORT-enrich-*.json` every hour. Every one was
rejected — `findings` was not an array — marked `.ingested.bad`, archived, and
the only trace was one line in the internal log. Months of feedback from that
task reached nobody, and its own prompt had never stated the file's shape.

Its author believed it had reported. That is what makes an unreadable report
worse than silence. Rejection is now itself a finding, carrying the correct
shape in its instruction, keyed on the *family* of the filename (digits
normalised) so the hourly repeat is counted as a repeat instead of creating a
fresh row each time.

## A twin fixed once is a twin fixed once (5.95)
`engRollbackAuto_` picks the newest engine backup out of the «کدها» Drive folder,
and it filters: `nm.indexOf('منبع — ') === 0` → skip. Its own comment calls it
«قرینهٔ installCodeRollback» — the mirror of the menu button. The mirror had no
filter. The analyzers write their backups into the *same* folder with the *same*
«پیش از» in the name and install **nightly**, so the newest such file is usually
an analyzer's: pressing «بازگشت به نسخهٔ پشتیبانِ کد» could put a 50 KB photo
analyzer into the engine's own Apps Script project. Google's compiler accepts it
(it is valid JS), `onOpen` disappears with the menu, and nothing is left to fix it
from.

The name filter is now on both — but the boundary is `engineTextProblems_`, called
inside `installSource_`, the one place all three install paths pass through
(nightly install, auto-rollback, manual rollback). A boundary held by a filter at
each caller is a boundary that the next caller forgets, which is exactly what
happened here. When you find a bug in one of two symmetrical functions, fix the
asymmetry *and* move the check to where neither can skip it.

## A hand-written list of what the code does will go stale (5.95)
`removeTriggers` listed ten handler names by hand. `prepareEpisode` and
`prepareSpecialEpisode` arrived in 5.5, `selfUpdateDaily` in 5.12, and none was
added — so «حذف زمان‌بندی» left three triggers running while saying «زمان‌بندی
حذف شد». Worse, `installTriggers` calls `removeTriggers(true)` first and then
creates everything: every press added one more of those three. Two
`selfUpdateDaily` triggers means two nightly jobs on one project — no error, just
double work.

It is now a whitelist (everything but `onOpen` goes), `wantedTriggers_()` is the
single list of what *should* exist, and `trigNames_()` reports duplicates and
gaps into `_STATUS.json` (`triggerNames`) and the health problems.
`run_menu_test.js` ۲ asserts it without naming a single trigger: it runs
`installTriggers()`, then `removeTriggers()`, and asks what is left — so the next
feature that brings its own schedule is covered with no edit.

Note what made this invisible for a year: a trigger list lives in the Apps Script
project, not in the code and not in any sheet. `_STATUS.json` carried only
`triggers: <count>`, and a count cannot tell «all nine present» from «one missing
and one duplicated».

## Instructions that outlived their truth
Three notification texts still described workflows that had been dead for
dozens of versions — "take the file from Cowork and replace Code.gs" (pre-5.12,
the engine self-installs from GitHub) and two telling the owner to update
prompts by hand (pre-5.85, `promptSyncFromRepo_` does it). They shipped nightly.
**A wrong instruction is worse than none:** the reader either does useless work
or learns to stop reading the message. When you change a mechanism, grep the
notification texts for the old one.

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

## ⏳ مدلِ صدای رضوی آموزشش تمام شد — و artifactها تاریخِ انقضا دارند

**۱۷ سپتامبر ۲۰۲۶، اجرای ۵۹ِ `voice-train`: «دورِ ۳۲ از ۳۲ · تمام‌شده: True».**
۵۹ اجرا، همه سبز.

### چه چیزی کجاست، و تا کِی

| artifact | چه دارد | تا کِی |
|---|---|---|
| `voice-razavi` (اجرای ۵۹، ۱۹۲ مگ) | مدل و ایندکسِ نهایی | **۱۷ اکتبر ۲۰۲۶ — ۳۰ روز** |
| `voice-razavi-ladder-54…59` | عکس‌های میانیِ دورهای ۱ تا ۳۲ | ~۱۵ دسامبر ۲۰۲۶ — ۹۰ روز |

عکسِ دورِ N در artifactِ اجرایی است که آن دور را ساخت: ۵۴ → دورهای ۱–۲۳،
۵۵ → تا ۲۶، ۵۷ → تا ۲۹، ۵۸ → تا ۳۱، ۵۹ → دورِ ۳۲.

⚠ **مدلِ نهایی زودتر از همه می‌میرد: ۳۰ روز.** صاحبِ برنامه خواست هرچه لازم
داریم نگه داشته شود، پس هرچه از اینها قرار است بماند باید **در درایو** کپی
شود، نه در artifact. artifact جای نگه‌داری نیست؛ جای تحویل است. و موتور هم
باید مدل را از درایو بردارد، نه از artifactی که یک ماه دیگر نیست.

### عددِ شباهت — سنجیده شد (۱۸ سپتامبر)

مقایسهٔ A/B روی **ورودیِ یکسان**: مرجع `1YRI2p7Qv3hh2dcNPMZDmbNUel0XCYWKX`
(ضبطِ رضوی)، مبدأ `1v4HaKFw7_7sD5pe2UE199iFX69jgh2p0` (بخشی از قسمتِ ۰۴۳،
صدای جمینای). شش ترکیبِ پارامتر در هر اجرا.

| `index_rate` | مدلِ قدیمی (۳۹ دقیقه) | مدلِ تازه (۲۴۰ دقیقه، دورِ ۳۲) |
|---|---|---|
| ۰٫۶۶ | — | ۰٫۷۲۸ |
| ۰٫۸۵ | — | ۰٫۷۴۰ / ۰٫۷۴۲ |
| ۱٫۰۰ · protect ۰٫۲۰ | **۰٫۷۱۲** | **۰٫۷۴۴** |
| ۱٫۰۰ · protect ۰٫۳۳ | **۰٫۷۲۶** | **۰٫۷۴۴** |

صدای خامِ جمینای نسبت به رضوی ۰٫۱۲۵ است؛ تبدیل می‌بَردش به ۰٫۷۴۴.

**شش برابر داده و ~۶۰ ساعت آموزش، ۰٫۰۱۸ آورد.** این را همان‌طور که هست
باید گفت. عددِ ~۰٫۷۳ که در این پرونده مبنا بود، درست بوده (۰٫۷۲۶ روی همین
ورودی) — پس مقایسه معتبر است و نتیجه‌اش کوچک.

یعنی **تنگنا اندازهٔ دیتاست نبوده.** جای بعدیِ نگاه: ایندکس (تازه ۳۱٬۵۸۸٬۶۱۹
بایت در برابرِ ۱۹۵٬۱۳۹٬۶۹۹ بایتِ قدیمی، با دیتاستی شش برابر — عدد با حجمِ
artifact می‌خوانَد پس چیزی گم نشده، ولی نوعِ ایندکس عوض شده و `index_rate`
دقیقاً روی همین تکیه می‌کند)، و مهم‌تر از عدد: **گوش**. `rvcSim_` کسینوسی و
نسبی است؛ داوریِ نهایی با شنیدن است.

و یک عدد که همان‌جا مفت به دست آمد و جوابِ «پلِ رنگِ صدا شدنی است؟» را
می‌دهد: `realtime_factor` ۱٫۱ تا ۱٫۴ و `episode_hours_19min` ۰٫۳ تا ۰٫۴ —
یعنی تبدیلِ یک قسمتِ نوزده‌دقیقه‌ای روی رانرِ رایگان ~۲۰ تا ۲۵ دقیقه، راحت
زیرِ سقفِ زمانیِ job. **پل شدنی است.**

### چطور سنجیده می‌شود (دیگر کارِ دستی لازم نیست)
`rvcSim_` سه فایل می‌خواهد (مرجعِ رضوی، خامِ جمینای، خروجیِ تبدیل‌شده) و در
`voice-lab.yml` اجرا می‌شود — که مدل را از **لینکِ درایو** می‌گیرد، نه از
artifactِ گیت‌هاب. و از کانتینرِ کلاد نمی‌شود artifact را دانلود کرد: لینکش به
blob storage می‌رود و پراکسی می‌بنددش (همان چیزی که سرِ لاگ‌ها هم دیده شد).
پس یا `voice-lab.yml` سیم‌کشی شود که خودش از artifact بردارد (داخلِ Actions
کار می‌کند)، یا مدل در درایو بنشیند. هر دو راه به همان کپیِ درایو می‌رسند —
که به‌هرحال لازم است.

از ۱۸ سپتامبر `voice-lab.yml` خانهٔ `rvc_run` دارد: شمارهٔ اجرای voice-train
را می‌دهی و مدل داخلِ همان job از artifact برداشته می‌شود. پیش از آن فقط
شناسهٔ درایو می‌پذیرفت، یعنی هر سنجش یک کارِ دستی لازم داشت — و سنجشی که به
کارِ دستی بند باشد، همان سنجشی است که انجام نمی‌شود.

**آخرین دور لزوماً بهترین نیست؛** نردبان برای همین مقایسه نگه داشته شد و
دورهای ۲۶ و ۲۹ هنوز سنجیده نشده‌اند.

### و مرزی که با آماده شدنِ مدل عوض نمی‌شود
ردیفِ «بهروز رضوی» در تبِ «صداها» **خاموش می‌مانَد** تا «پلِ رنگِ صدا» ساخته و
آزموده شود. مدل بودن یعنی نصفِ کار؛ تا راهی نباشد که صوتِ قسمت برود، تبدیل شود
و برگردد، روشن کردنِ آن ردیف یعنی «شیوهٔ خواندنِ رضوی روی صدای جمینای» — که
بی‌معنی است. اولین کارِ آن پل هم سنجش است نه طراحی: تبدیلِ یک قسمتِ
پانزده‌دقیقه‌ای روی رانرِ رایگان چقدر طول می‌کشد و آیا از سقفِ زمانیِ job
می‌گذرد.

## آنچه با رضوی یاد گرفتیم و برای نفرِ دوم ننوشته بودیم (۲۳ سپتامبر)

صاحبِ برنامه امروز پرسید: «مگه ما با رضوی این‌همه چالش طی نکردیم و همه‌چیز ثبت
نکردی؟ پس چرا دوباره این‌همه اشتباه می‌کنی و نمی‌دونی از کجا داری ضربه
می‌خوری؟» او درست می‌گفت، و علتِ دقیقش این است: **تجربهٔ رضوی به‌صورتِ داستانِ
رضوی ثبت شده بود، نه به‌صورتِ قاعده‌ای برای هر گوینده.** جدولِ artifactها،
عددِ شباهت و تاریخِ انقضا اینجا هست؛ **شکلِ عملیاتیِ کار** — که هر شب با آن
روبه‌رو می‌شویم — هیچ‌جا نبود. این بند همان است.

### اعدادِ واقعی (سنجیده، نه تخمین)
- آموزش روی رانرِ **CPU** است و همیشه خواهد بود: `No supported GPU detected`.
- **هر دور ~۲ تا ۲٫۷ ساعت.** اجرای ۶۷ِ گلدوز دورِ ۶ را در ۲:۴۰:۰۵ تمام کرد.
- بودجهٔ هر اجرا `VT_BUDGET_MIN` = ۲۹۰ دقیقه، سقفِ job ۳۵۰ دقیقه ⇒ **هر اجرا
  یکی تا دو دور.**
- ۳۲ دور یعنی ~۶۰ تا ۸۵ ساعت، یعنی **~۱۵ تا ۲۰ اجرا، ~۴ تا ۵ روز.** رضوی
  **۵۹ اجرا** برد. هر عددی کوچک‌تر از این، تخمینِ کسی است که لاگ را ندیده.

### «نیمه‌کاره» حالتِ عادی است — و اینجا بود که ضربه خوردیم
اجرای ۶۷ در دقیقهٔ ۲۳۰ با `##[error]The operation was canceled.` مُرد. **نه
سقفِ ۳۵۰ دقیقه‌ایِ job بود، نه بودجهٔ ۲۹۰ دقیقه‌ایِ ما، و هیچ‌جای این مخزن
`gh run cancel` ندارد** — یعنی از سمتِ گیت‌هاب. سه چیز از آن درآمد:

1. **لغو ≠ شکست.** `voiceintake.py` می‌گفت «موفق نبود ⇒ ناموفق»، پس گلدوز
   «ناموفق» ثبت شد — برای اجرایی که یک دور واقعاً جلو رفته بود — و سه تای
   این یعنی «رهاشده». یادداشتِ خودِ گردش‌کار سرِ ذخیرهٔ کش این را می‌دانست:
   «نیمه‌کاره ماندن حالتِ **عادی** این گردش‌کار است، نه خطا». همان جمله یک
   فایل آن‌طرف‌تر خوانده نشده بود. **شکست فقط `failure`/`timed_out` است.**
2. **`state.json` را پایانِ `voicetrain.py` می‌نویسد.** فرآیندِ کشته‌شده هرگز
   به آن خط نمی‌رسد، پس فایلِ **اجرای پیشین** — که از کش برگشته — به‌عنوانِ
   نتیجهٔ این اجرا بارگذاری می‌شود. artifactِ اجرای ۶۷ «دورِ ۵» گفت در حالی
   که `_e6` روی دیسک بود. یادداشتِ `finish_` ضمانت می‌داد «در هر اجرا نوشته
   می‌شود»؛ برای ایستادنِ **تمیز** سرِ بودجه درست بود و برای لغو غلط.
   **ضمانتی که فقط در حالتِ بی‌اشکال برقرار باشد، ضمانت نیست** — همان شکلِ
   `nightStarve` در موتور: شاهدی که با خودِ حادثه می‌میرد.
   `stateSync_` حالا با `always()` پیش از ذخیرهٔ کش و بارگذاریِ artifact
   عدد را **از روی وزن‌های روی دیسک** بازمی‌نویسد.
3. **جوابِ درست از روزِ اول نوشته شده بود و به تصمیم وصل نبود.** docstringِ
   `epochsDone_`: «`state.json` را خودمان می‌نویسیم؛ این را آموزش می‌نویسد.
   وقتی پرسش «واقعاً چقدر جلو رفته‌ایم» است، **دومی** جواب است.» تحلیل بود،
   سیم نبود — چندمین بارِ همین شکل در این پرونده.

### هیچ‌چیز گم نمی‌شود، و این را باید بلند گفت
مراحلِ `always()` حتی در اجرای لغوشده هم دویدند: نردبان بایگانی شد، `_e6` سرِ
جایش ماند، کش (۱٫۲۵ گیگ) ذخیره شد. **آنچه پیشرفت را جلو می‌بَرد کش و نردبانِ
`_e<N>.pth` است، نه `state.json`.** پیش از اعلامِ «کار از دست رفت»، لاگِ مرحلهٔ
«آموزش» را باز کن و دنبالِ `Saving checkpoint <VOICE>_e<N>: Success` بگرد.

### و اشتباهِ خودِ من، که چرا این اتفاق افتاد
من گزارش دادم «صفر دور جلو رفت» — **غلط بود.** عدد را از `state.json` خواندم
و لاگِ آموزش را باز نکردم؛ شاهدِ ضعیف را جوابِ نهایی گرفتم. قاعده‌ای که
این پرونده از قبل داشت و رعایتش نکردم: **تناقض را نگاه کن، توجیه نکن** — و
حالا نیمهٔ دومش: **وقتی دو شاهد داری، از ضعیف‌تر گزارش نده.**

### دو بدَلِ آزمون که سالِ اول خراب بودند و هیچ سنجه‌ای نیفتاد
در `tests/run_voicepipe_test.js` هر دو پیش‌فرضِ ماکِ `gh` به شکلِ
`${VAR:-{...}}` نوشته شده بود. در bash آن `}`ِ داخلی بسطِ متغیر را همان‌جا
می‌بندد، پس `state.json` همیشه یک آکولادِ اضافی داشت (JSONِ باطل) و
`gh run list` هم هرگز شناسهٔ درستی نمی‌داد. یعنی **مسیرِ «artifact رسید و
خوانده شد» — قلبِ این ماشینِ حالت — یک بار هم اجرا نشده بود** و مجموعه سبز
بود. *بدَلی که در جایی خراب باشد که تولید سالم است، هیچ چیزی را ثابت نمی‌کند.*

### قاعدهٔ کلی که صاحبِ برنامه خواست
**هر چیزی که با گویندهٔ اول یاد گرفتیم، پیش از شروعِ گویندهٔ دوم باید به
قاعده تبدیل شده باشد — در همین پرونده و در پرامپتِ ناظر — وگرنه نفرِ دوم
همان راه را از اول می‌رود.** «رضوی این‌طور شد» یک خاطره است؛ «هر گوینده
این‌طور می‌شود» یک قاعده. این بخش از این به بعد جای قاعده‌هاست.

## ⏳ کارِ معلق: مدلِ گفتارسازِ فارسی به‌جای زنجیرهٔ «جمینای + تبدیل»

**این را صاحبِ برنامه خواست که در هر سشنی یادآوری شود، هر وقت شرایطش
فراهم شد.** پس اینجاست، نه در یک یادداشتِ گمشده.

### ایده
امروز صدای رضوی دو تکه دارد: جمینای فارسی را می‌خوانَد، و RVC رنگِ صدا
را عوض می‌کند. اگر روزی یک مدلِ گفتارسازِ **متن‌باز** فارسی را خوب
بخوانَد، می‌شود مستقیم روی صدای او آموزشش داد — یک مدل که خودش فارسی
را با صدای او می‌گوید، بی مرحلهٔ تبدیل. آن واقعاً «مدلِ خودمان» است.

### چرا امروز نه
دو تا را آزمودیم و هر دو ضعیف بودند: `Lumos675/F5_TTS_Persian` و
OmniVoice. مشکل تلفظ و اعراب است، نه رنگِ صدا.

### شرطِ باز کردنِ این پرونده — قابلِ سنجش، نه حسی
یک مدلِ گفتارسازِ متن‌باز که **هر چهار** را داشته باشد:

0. **پروانه‌اش اجازهٔ کارِ تجاری بدهد.** این شرط تا ۱ اکتبر در این فهرست
   **نبود**، و نبودنش هزینه داد: روتینِ فصلی
   `Thomcles/Chatterbox-TTS-Persian-Farsi` را «نامزدِ تازه» اعلام کرد، در
   حالی که `tools/voicescan.py` در اسکنِ #۱۹ پروانه‌اش را خوانده بود —
   `cc-by-nc-4.0`، یعنی **غیرتجاری** — و همان فایل `LIC_NO_` را دارد که
   دقیقاً همین را رد می‌کند. کانال قرار است درآمد داشته باشد، پس چنین
   مدلی هرقدر هم خوب بخوانَد از نظرِ **انتشار** بسته است، و هیچ آزمونی
   این را عوض نمی‌کند.
   و دو نکتهٔ باریک که باید نوشته شوند نه کشف: بسته‌بندیِ دوبارهٔ یک وزن
   زیرِ نامِ `license: mit` (مثلِ نسخهٔ gguf همین مدل) پروانهٔ پایه را
   **نمی‌شوید**؛ و «اعلام نشده» همان‌قدر مانع است که «غیرتجاری» — چون
   نبودِ پروانه یعنی حقِ استفاده‌ای داده نشده، نه اینکه آزاد است.
   **فهرستی که شرطِ بازدارنده را نداشته باشد، هر فصل یک نامزدِ مرده
   تحویل می‌دهد** — و این دقیقاً همان شکلی است که این پرونده بارها ثبت
   کرده: سنجه‌ای که چیزِ تعیین‌کننده را نمی‌سنجد.
1. فارسی را با اعراب درست بخوانَد — با همان `SPEAK_TRAPS` (بخشِ ۳)
   امتحان شود، نه با یک جملهٔ ساده.
2. کلونِ صدا یا fine-tune روی چند ساعت صدا را پشتیبانی کند.
3. شباهتِ گوینده‌اش دستِ‌کم هم‌ترازِ زنجیرهٔ فعلی باشد: `rvcSim_` روی
   RVC حدودِ **۰٫۷۳** می‌دهد و صاحبِ برنامه «۸۰٪ به بالا» شنید.

**و ترتیب عمدی است: پروانه اول.** سنجیدنِ کیفیتِ مدلی که نمی‌شود منتشرش
کرد، وقتِ رانر و وقتِ آدم را خرج می‌کند تا به جایی برسد که از اول معلوم
بود. `voicescan.py` همین ترتیب را دارد (ردِ پروانه‌ای **پیش از** هر
سنجشِ دیگر)؛ این فهرست تا امروز نداشت.

### چطور امتحان کن
آزمایشگاه از قبل آماده است: `.github/workflows/voice-lab.yml` با
موتورهای `f5` و `omnivoice` و خانهٔ `f5_ckpt`. یعنی امتحانِ یک مدلِ
تازه یک اجرای فرم است، نه یک پروژه. `rvcSim_` عدد می‌دهد و نمونه‌های
صوتی برای داوری با گوش ساخته می‌شوند.

### چه کسی یادآوری می‌کند
یک روتینِ فصلی (`trig_...`، هر سه ماه) که خودش می‌گردد و فقط وقتی
چیزی پیدا شد گزارش می‌دهد. ولی روتین می‌تواند پاک شود یا بخوابد — این
بند در همین پرونده است چون **هر سشنی اول این را می‌خوانَد**. اگر در
سشنی به مدلِ گفتارسازِ فارسیِ تازه‌ای برخوردی، همین‌جا را یادت بیاور و
به صاحبِ برنامه بگو.

## روتینِ زمان‌بندی‌شده‌ای که چیزی در OUTPUT نمی‌نویسد، ناظری ندارد (۱ اکتبر)

صاحبِ برنامه اعلانِ روتینِ فصلیِ گفتارساز را دید و پرسید: «اون که گفتی ناظر
نمی‌بینه و تو فرِستا دیدمش، پس اون‌ها چجوری نتایجِ کارشون بررسی می‌شه اگر شکست
بخورن یا چیزِ مهمی بگن؟» جوابِ راست: **بعضی‌هایشان هیچ‌جا.**

**تنها دری که موتور از آن می‌خوانَد یکی است:** `pendingReportFiles_` ریشهٔ OUTPUT
را می‌گردد و **هر** فایلی که با `CFG.REPORT_FILE_PREFIX` (`_REPORT-`) شروع شود
می‌خوانَد — کلیدش **شناسهٔ فایل** است نه نامش، پس نامِ ثابت هم کار می‌کند. یعنی
یک روتینِ تازه **بی هیچ تغییری در کد** می‌تواند حرفش را به تبِ «گزارش‌های نظارت»
و ایمیلِ ۱۰ صبح برساند، و `reportRejected_` فایلِ بدشکل را **خودش یک یافته**
می‌کند (۵٫۹۶). روتینی که فقط اعلان می‌دهد، بیرونِ این در است: اعلان به گوشیِ
صاحبِ برنامه می‌رود، و او تنها کسی است که می‌بیند.

**و دو کانال هست، نه یکی — و دومی مهم‌ترِ آن دو است.** `findings` می‌گوید چیزی
خراب است؛ `checks` (۶٫۹۵) می‌گوید **وارسی انجام شد**، با داوریِ «سالم / ایراد /
نشد». بی `checks`، «گشتم و چیزی نبود» و «نتوانستم بگردم» و «اصلاً ندویدم» یک
خروجیِ یکسان دارند: سکوت. `monChecksIngest_` **هر** کلیدی را ثبت می‌کند، حتی
کلیدی که در `CFG.MONITOR_CHECKS` نیست — آن فهرست می‌گوید چه چیزی *باید* بیاید،
نه چه چیزی مجاز است بیاید.

### قاعده، برای هر روتینِ تازه‌ای که ساخته می‌شود
۱. **شاهد بی‌قید نوشته می‌شود، خبر مشروط می‌ماند.** فایلِ `_REPORT-<kind>-<date>.json`
   هر بار نوشته می‌شود — با `findings: []` وقتی چیزی نبود — و اعلان فقط وقتی
   می‌رود که واقعاً خبری هست. برعکسش («چیزی نبود ⇒ ساکت») همان شکلی است که این
   پرونده ده‌ها بار ثبت کرده.
۲. **کانکتورِ درایو را همان لحظهٔ ساختِ روتین به آن بده.** روتینی که
   `mcp_connections` خالی دارد نمی‌تواند در OUTPUT بنویسد، و `update_trigger`
   کانکتور را عوض نمی‌کند — فقط `create_trigger`. پس «در پرامپت نوشتم که گزارش
   بنویسد» بی کانکتور همان «درمان روی راهی که پیموده نمی‌شود» است (۷٫۴۶).
   و اگر نشد، روتین باید **صریح بگوید نشد**، نه خالی بمانَد.
۳. **`checks` با کلیدِ خودش**، و اگر روتین روزانه است و دیده‌شدنش واجب،
   کلیدش در `CFG.MONITOR_CHECKS` هم ثبت شود تا سکوتش یافته بسازد.

### آنچه امروز هست و آنچه نیست
| کارگر | ریتم | چه کسی نتیجه‌اش را می‌بیند |
|---|---|---|
| ناظرِ روزانه (`trig_019Eg…`) | ۱۲:۰۰ دبی | `_REPORT-YYYYMMDD.json` ⇒ `watchdogHeartbeats_` ردیفِ `monitor` + `monChecksStatus_` روی ۹ کلیدِ اجباری |
| غنی‌سازی (`trig_01DU2…`) | ۴ بار در روز، دقیقهٔ ۲۰ | `_ENRICH-*` ⇒ دو ردیفِ جدا: `enrichReq` (موتور پرسیده؟) و `enrich` (تسک جواب داده؟) |
| اکشنِ رندر (گیت‌هاب) | هر ساعت | `docs/renders.json` ⇒ `whRenderLag_` — **کارِ انجام‌نشده** را می‌سنجد، نه سکوت را |
| «وارسیِ روزانه · گویندهٔ تازه · پلِ صدا» (`trig_017nx…`) | ۰۶:۳۵ و ۱۸:۳۵ | به یک **سشنِ ماندگار** شلیک می‌کند، پس در همان گفت‌وگو دیده می‌شود |
| فصلیِ گفتارساز (`trig_01KnP…`) | هر ۳ ماه | **تا ۱ اکتبر: هیچ‌کس.** از امروز `_REPORT-tts-<date>.json` می‌نویسد |

**و `last_run: SUCCEEDED` در فهرستِ روتین‌ها شاهدِ کار نیست.** برای روتینی که به
سشنِ ماندگار شلیک می‌کند، `fired_at` و `finished_at` چند میلی‌ثانیه فاصله دارند:
آن «موفق» یعنی **بیدارباش تحویل داده شد**، نه اینکه کار درست انجام شد. شاهدِ کار
همان فایلِ OUTPUT است و جای دیگری نیست.

**و یک نمونهٔ واقعی که همین حساب را ثابت می‌کند:** روتینِ «Daily calendar briefing»
در ۱۵ اوت با `FAILED` ایستاد و از آن روز خاموش مانده است. هیچ‌جا به کسی نگفت.

### آنچه این قاعده هنوز نمی‌دهد، و صریح گفته می‌شود
`monChecksStatus_` آستانه‌اش **روزانه** است و پنجره‌اش به سنِ گزارشِ روزانه بسته
است، پس کلیدی با ریتمِ فصلی در آن همیشه «گزارش نشده» خوانده می‌شود. یعنی
`tts-model-scan` عمداً در `CFG.MONITOR_CHECKS` **نیست**: زنگی که هر روز برای
کارِ سه‌ماهه بزند، همان زنگی است که یاد می‌گیرند نخوانندش. آستانهٔ هر کلید
(`days` روی هر ردیفِ `MONITOR_CHECKS`) کارِ نسخهٔ بعد است، و اولین نوشتنِ واقعیِ
آن کلید ۱ ژانویه است — پس امروز ساختنش یعنی سنجیدنِ حالتی که تولید تا سه ماه
نمی‌سازدش (۷٫۲۲).

## تسک‌های زمان‌بندی‌شدهٔ مرتبط با این موتور — شرحِ دو تای اصلی

۱) **«غنی‌سازی اینترنتی پادکست‌ها»** — چهار بار در روز، دقیقهٔ ۲۰ (cron: `20 0,1,2,13 * * *` به‌وقتِ UTC — پنجرهٔ پیش از صداگذاری). یک
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
