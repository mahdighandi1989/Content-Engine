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
یک مدلِ گفتارسازِ متن‌باز که **هر سه** را داشته باشد:

1. فارسی را با اعراب درست بخوانَد — با همان `SPEAK_TRAPS` (بخشِ ۳)
   امتحان شود، نه با یک جملهٔ ساده.
2. کلونِ صدا یا fine-tune روی چند ساعت صدا را پشتیبانی کند.
3. شباهتِ گوینده‌اش دستِ‌کم هم‌ترازِ زنجیرهٔ فعلی باشد: `rvcSim_` روی
   RVC حدودِ **۰٫۷۳** می‌دهد و صاحبِ برنامه «۸۰٪ به بالا» شنید.

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
