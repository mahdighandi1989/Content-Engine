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

## تاریخچهٔ نسخه‌ها — در `docs/claude_history.md`، نه این‌جا (8.67)

ناظرِ روزانهٔ ۸ اکتبر **۲ دقیقه و ۲۴ ثانیه** دوید، ۳۰۳ هزار توکن از زمینه‌اش پر بود و فقط ۷٫۶ هزار توکن
نوشت، و خودش در ایمیل گفت «این اجرای خودکار فقط _STATUS و ریپو را وارسی کرد». علت همان است که ۸.۴۶ برای
پرامپتِ ناظر نوشت، این بار در خودِ این پرونده: **این فایل به ۵۳۸ کیلوبایت رسیده بود** — بیش از سه‌چهارمش
یادداشت‌های دوره‌ایِ نسخه‌ها، هر بار بالای قبلی. هر سشن (و ناظر، که اولِ کار این را می‌خوانَد) نیمی از
بودجه‌اش را پیش از نخستین کار خرج می‌کرد. **دستوری که خواننده‌اش تا آخر نمی‌خوانَد، دستور نیست.**

**قاعده:** این‌جا فقط بخش‌های ساختاری و قاعده‌های پایدار می‌مانند. یادداشتِ هر نسخهٔ تازه (چه شد، شاهد،
سنجش) به **بالای** `docs/claude_history.md` می‌رود و در این فایل فقط یک سطر در فهرستِ زیر می‌گیرد.
`run_wiring_test.js` §۱۷ سقفِ اندازهٔ این فایل را نگه می‌دارد. هیچ‌چیز پاک نشد: ۱۱۸ بخشِ پیشین عیناً در
`docs/claude_history.md` است و هر سطرِ زیر نامِ همان بخش است — پیش از کار روی همان حوزه، بخشش را بخوان.

- «یک‌شکلش کن، ولی دقیق» — و ویدئوی تکراری (8.69)
- «کاور اشتباه، کپشن اشتباه، شمارهٔ درس اشتباه» — همه از صفحهٔ عمومی، و یک علتِ مشترک برای دوتایشان (8.68)
- داوری که فقط ۹۰۰ نویسه از درس را می‌دید (8.66)
- کلیپی که باز روی تاریخ افتاد، تیتری که نیمه‌کاره و چسبیده بود، و خطی که «نه روی تاریخ» می‌گفت (8.65)
- «مرورِ درس‌های ۳۴ تا ۶۱» — همان شمارهٔ سراسری، از درِ مرور (8.64)
- «درس ۶۳» بعد از «درس ۴۰»، و درسی که اصلاً نبود — از خودِ صفحهٔ پلی‌لیست (8.63)
- وارسیِ ۸.۵۴/۸.۵۵ پس از نصب: کاوری که درست بود و باز ۵۰۰ گرفت، و بازشنوی‌ای که بی‌ردپا مُرد (8.62)
- علتِ افتادنِ مرورِ بزرگ به کارتِ ساده: یک پرسشِ ۴۲‌صحنه‌ای، دو بار بریده (8.61)
- «هشت کارتِ فقط‌نوشته منطقی است؟»، یک پلِ میانه، فیدی که زود تمام می‌شد، و افتادنی که فقط هاب می‌دانست (8.60)
- دستوری که دری نداشت: صفحهٔ تنظیماتِ بسته (8.59)
- وعده‌ای که از زمان‌بندِ کسِ دیگر می‌آمد — و موتوری که خودش راه می‌اندازد (8.58)
- سنجه‌ای که شکلِ داده را دستی می‌ساخت؛ و جایگزین‌کردن بی پاک‌کردن (8.57)
- چهار چیزی که بیننده دید و هیچ عددی نمی‌دید (8.56)
- «اگر نمی‌فرستادم، می‌فهمیدی؟» — دیدن بود، الزام نبود (8.55)
- دوقلویی که یک بار درست شد، وعده‌ای که از تنظیم می‌آمد، و قسمتی که بی‌راننده ماند (8.54)
- شبی که کشته شد، خودش ادامه پیدا می‌کند (8.53)
- زیرِ نظر، نه فقط یک خط (8.52)
- کلیپِ آغاز، حرکتی که به چیزی اشاره دارد، و مدلِ تازه‌ای که نشان داده می‌شود (8.51)
- ممیزی با دادهٔ واقعی: سه ایرادی که هیچ سنجه‌ای نمی‌دید (8.50)
- سقف، نه هدف؛ و شمار از محتوا، نه از ساعت (8.49)
- سقفی که فقط دیوار بود: کیفیت به تاریخ بسته بود (8.48)
- «صدای ویدئو یک درس است» فرض بود، نه تشخیص (8.47)
- ایمیلی که می‌رسید و ناظری که کار نمی‌کرد — و ویدئویی که هرگز نوبت نمی‌گرفت (8.46)
- نوشته روی همان نقاشی، نه اسلایدی کنارش — و نشانی که از ویدئوی دوم نیامد (8.45)
- زنگی که پرسنده‌اش همیشه «همان روز» می‌پرسید (8.44)
- «سریع پاک نکنه» — و یک جا واقعاً می‌رفت (8.42)
- سه پرسش، و هر سه جواب «بخشی» بود (8.41)
- کلیدی که نامش «حالت در قسمت» بود و به هیچ کدی وصل نبود (8.40)
- سنجاق تا وقتی هست کار می‌کند؛ جانشینش با همان گوش انتخاب می‌شود (8.39)
- برفکِ «میانِ جمله‌ها» صدا نبود؛ برچسبِ C2PA بود — و مدلِ صوتی هر روز عوض می‌شد (8.38)
- «صدا و حجمش پایینه»: عددش از ۲۲ سپتامبر در سیاهه بود (8.37)
- «هر ۱۵ درس یک مرور»، ولومی که حالت نیست، و سقفی که بیست‌وپنج نویسه مانده بود (8.36)
- سه ویدئوی گیرکرده: نه نشتی، یک کلیدِ ناهم‌شکل — و خطی که علت را حدس می‌زد (8.35)
- «مدل کم داد یا جوابش بریده شد؟» — بریده شد، و همان دورِ انتشار را کشت (8.34)
- پنج جا که موتور گناهِ خودش را به گردنِ دیگری انداخت — یا کاری را «انجام‌شده» نوشت که هرگز نشد (8.33)
- «اگر ایمیل‌ها را نمی‌فرستادم، می‌فهمیدی؟» — جوابِ راست «نه» بود (8.32)
- نقاشی طوری ساخته شده بود که دیده نشود — و موسیقی زمان را جابه‌جا کرده بود (8.31)
- علت یک «ی» بود، و فقط دادهٔ واقعی نشانش داد (8.30)
- سه کارت، همه از بخشِ یک — و هر دو راهِ درمان به مدل ختم می‌شد (8.29)
- حالت‌ها روی دستورِ لحن سوار بودند، و دستور نمی‌رسد (8.27)
- چهارده تصویر خواسته شد و یکی آمد — و چهار سیمِ قطع پشتش (8.26)
- گامِ ثابت فرض می‌کرد صدای مبدأ یکی است (8.24)
- حالت‌هایی که گوینده هرگز نمی‌بیند (8.24)
- متنِ آزمون، نه تکه‌ای از درس (8.25)
- «روشن است» و «کار می‌کند» دو چیزند (8.05)
- اندازه‌ای که خودِ موتور هر روز می‌گفت و هیچ تصمیمی نمی‌شد (8.12)
- دو پرسش، و جوابِ هر دو «هیچ‌جا» بود (8.13)
- «اگه نمی‌دیدم چی؟» — و جوابِ راست «هیچ» بود (8.11)
- پنجره‌ای که ممکن است چیزِ زیرِ سنجش را نداشته باشد (8.10)
- نگهبانی که درمانِ نسخهٔ بعد را نمی‌شناسد (8.09)
- لحن فقط از راهِ نشانه‌ها می‌رسد — و دو تا از سیزده نشانه می‌گذشتند (8.08)
- شاهدی که انبارِ عقب‌افتاده را می‌سنجید و نامش «فعالیت» بود (8.06)
- شمارهٔ سنجه، قابلیتِ ارجاع است — نه آرایش (8.06)
- ریشهٔ تلفظ: عددی که فقط اندازه گرفته شد (8.03) و سپس تصمیم شد (8.04)
- A new speaker is a folder, not a code change (section 33, 7.21)
- Searching 112 MB you are not allowed to read (section 34, 7.23)
- The bridge (section 36, 7.36)
- The third layer of the same door (7.50)
- Three models refused, and the third road was never tried (7.89)
- The same email said both things, and one of them was a real hole (7.88)
- The sample that was to answer his complaint was itself flat (7.87)
- Ten green assertions and the seed built nothing (7.86)
- Eleven minutes, and the answer was in the engine's own mail (7.84)
- "You press it tomorrow" — and I could not, so the engine does (7.82)
- He was right that I had attributed it to the wrong number (7.81)
- What is not in the data cannot be made (7.80)
- Both complaints were already answered in the engine's own files (7.79)
- A ceiling whose reason changed, and the ceiling did not (7.78)
- The work was done, and one unrelated line threw it away (7.77)
- Looking only for the cost I added (7.72)
- The number that chose 1.0 now argues against it (7.70)
- Ten green assertions and nobody had pressed it twice (7.75)
- «It cannot be done» was true and was half an answer (7.74)
- Colour is not soul, and the lever was never in the conversion (7.73)
- A search that leaves a third of its budget unspent is doing incomplete work (7.73)
- Two parts of one repo, two rulings on the same thing
- A rule stated generally is a rule nobody applies (7.69)
- The claim was written down, and the code did the opposite (7.68)
- The same wall, from the other side, in the section built after it (7.66)
- The ceiling that one of the two roads drove straight past (7.65)
- Using "measure, don't guess" as a reason to do nothing (7.64)
- The reporter died and nothing said so (7.63)
- A cure on a road that is never travelled — the same one, one version later (7.62)
- One capital letter, three versions, and a guard that threw the answer away (7.61)
- A window that will not open has no settings in it (7.60)
- A list instead of typing — and two jobs that looked like one (7.59)
- A number that can no longer come is not a setting (7.58)
- A row closed by a claim nobody checks (7.57)
- A door whose key is hard to obtain is also not a door (7.48)
- The verdict that never reached the decision — the eighth time (7.47)
- A cure placed on a road that is never travelled (7.46)
- The permission you cannot revoke at the child (7.45)
- «موردی» gave the style but not the colour (7.45)
- A door only the room's own key opens (7.39)
- A retry that forgets what it was retrying does something else (7.44)
- A witness that dies with the accident is not a witness (7.44)
- Reviewers must run it, not read it — and the debt register (7.44)
- The guard stood one layer above the breakage (7.43)
- The cure for one bug left the only door behind a manual step (7.42)
- Half a request delivered is a request you have to be asked about twice (7.41)
- The control that was never where the work is (7.35)
- Colour was cloned; the soul was not (7.34)
- A question already answered is a question that was never read (7.34)
- Half a question is a whole silence (7.33)
- The wrong party accused again — and rationalised the second time (7.32)
- A guard bigger than the budget, and a spend bigger than the guard (7.30 / 7.31)
- The night a version installs is the one night its new code does not run (7.29)
- The first real night gave the number, and it was four times my estimate (7.28)
- Fifteen columns out of sixty-one (7.27)
- The fingerprint the sheet cannot hold (section 35, 7.26)
- A cap that stops the scan decides by tab order, not by relevance (7.25)
- Two layers that disagree resolve it by deleting (7.24)
- An alarm the alarm's own writer resets (7.22)
- Seeing is not the same as being obliged (7.18 / 7.19)
- A finding is closed by name, never by default (5.93)
- A cap the next stage can add to is not a cap (5.96)
- The analysis existed; nobody wired it to the decision (5.96)
- A report that cannot be read is worse than no report (5.96)
- A twin fixed once is a twin fixed once (5.95)
- A hand-written list of what the code does will go stale (5.95)

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
