# Content-Engine — agent brief (CLAUDE.md)

> این فایل، بریفِ عاملِ کلاد برای این ریپوست. هر سشن اولْ این را بخواند.
> Read this first. It encodes the rules that keep the auto-update cycle intact.

## What this is
A single-file Google Apps Script engine ("موتور محتوا") that produces two daily
Persian podcasts — «از همه جا از همه رنگ» (variety, published 07:00 Dubai) and
«درس‌نامه» (specialist, 08:00) — by reading five **read-only** Google Sheets and
writing audio/text/status to a Drive OUTPUT folder.

The deployed engine is ONE file, `engine.gs` **at the repo root**, assembled from
the 27 section files in `src/` by `tools/build.js`. `CODE_VERSION` lives near the
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
src/                 27 numbered sections — the source of truth for the code
tools/               build.js + build_header.txt
tests/               the 36 run_*.js suites
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
