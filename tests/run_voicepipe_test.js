/* نیمهٔ بیرونیِ بخشِ ۳۳ — `tools/voiceintake.py` و گردش‌کارها.
 *
 * ══ چرا این پرونده هست ══
 * ۷٫۲۱ برای این نیمه **هیچ آزمونِ رفتاری نداشت**. تنها وارسی‌های
 * میان‌مرزی چند `indexOf` بودند، و هیچ‌کدام از دو مانعِ واقعی رشته‌ای را
 * عوض نمی‌کردند — پس ۴۶ مجموعه سبز بودند در حالی که مرحلهٔ سنجش
 * **هرگز** نمی‌توانست موفق شود (`--ref` که voicelab اجباری می‌داند اصلاً
 * فرستاده نمی‌شد) و `plan`→`measure` هر بار روی گیت تضاد می‌گرفت.
 *
 * درسش همان ۶٫۲۰ است: «نگهبانی که یک در را نبیند، آن در را باز می‌گذارد».
 * اینجا در، خطِ فرمانی است که ساخته می‌شود و هرگز اجرا نمی‌شود.
 */
require('./lib/root.js');
const fs = require('fs');
const cp = require('child_process');

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

const wf = fs.readFileSync('.github/workflows/voice-intake.yml', 'utf8');
const tr = fs.readFileSync('.github/workflows/voice-train.yml', 'utf8');
const lab = fs.readFileSync('.github/workflows/voice-lab.yml', 'utf8');
const py = fs.readFileSync('tools/voiceintake.py', 'utf8');
const vt = fs.readFileSync('tools/voicetrain.py', 'utf8');

console.log('\n══ ۱) خطِ فرمانی که ساخته می‌شود، باید پذیرفته شود ══');
/* voicelab.py `--ref` را اجباری تعریف کرده. نسخهٔ ۷٫۲۱ آن را نمی‌فرستاد،
   یعنی مرحلهٔ سنجش در هر اجرا قرمز می‌شد — و چون خروجی‌اش بلعیده می‌شد و
   یک فایلِ دیگر همیشه کپی می‌شد، گوینده «آماده» ثبت و ✅ اعلام می‌شد با
   نمونه‌ای که **صوتِ تبدیل‌نشده** بود. */
const vl = fs.readFileSync('tools/voicelab.py', 'utf8');
const required = [...vl.matchAll(/ap\.add_argument\("(--[a-z0-9-]+)"[^)]*required=True/g)]
  .map(m => m[1]);
ok('۱.۱ آرگومان‌های اجباریِ voicelab پیدا شد', required.length > 0, required.join(' '));
const argsLine = (wf.match(/ARGS=\(--engine rvc[^\n]*/) || [''])[0];
for (const r of required) {
  ok('۱.۲ گردش‌کار «' + r + '» را می‌فرستد',
     argsLine.indexOf(r + ' ') !== -1 || wf.indexOf('ARGS+=(' + r) !== -1,
     'بی آن، هر اجرای سنجش قرمز می‌شود');
}
ok('۱.۳ مرجع صدای خودِ گوینده است، نه یک فایلِ ثابت',
   /--refid/.test(py) && /--refid "\$KEY"/.test(wf),
   'rvcSim_ کسینوسِ (خروجی، مرجع) است؛ مرجعِ ثابت یعنی عددِ بی‌معنا');
ok('۱.۴ خروجیِ آزمایشگاه بلعیده نمی‌شود',
   !/tools\/voicelab\.py "\$\{ARGS\[@\]\}" \|\|/.test(wf),
   'وگرنه شکست به «آماده» تبدیل می‌شود');
ok('۱.۵ نمونه‌ای ساخته نشد ⇒ اجرا قرمز، نه «آماده»',
   /if \[ "\$n" -eq 0 \]/.test(wf) && /exit 1/.test(wf));

console.log('\n══ ۲) هر مرحله‌ای که voicetrain را import می‌کند، گوینده را همراه دارد ══');
/* `VOICE` سرِ import از محیط خوانده می‌شود. مرحله‌ای بی محیط یعنی
   «razavi» — و `ladderPrune_` آن‌وقت صفر عکس هرس می‌کند، سبز و بی‌صدا. */
const steps = tr.split(/\n      - name: /).slice(1);
const blind = steps.filter(b => {
  const i = b.indexOf('run:');
  if (i < 0) return false;
  const run = b.slice(i).split('\n').filter(l => !l.trim().startsWith('#')).join('\n');
  return /import voicetrain|voicetrain\.py/.test(run) && b.indexOf('VT_VOICE') === -1;
});
ok('۲.۱ هیچ مرحله‌ای بی VT_VOICE کارِ voicetrain نمی‌کند',
   blind.length === 0, blind.map(b => b.split('\n')[0]).join(' | ') || 'همه دارند');

console.log('\n══ ۳) کش و artifact هرگز بینِ دو گوینده مشترک نیستند ══');
for (const [what, re] of [['کلیدِ پایه', /key: rvc-\$\{\{[^}]*inputs\.voice/],
                          ['کلیدِ چک‌پوینت', /key: rvc-\$\{\{[^}]*inputs\.voice[^}]*\}\}-ckpt/],
                          ['restore-keys', /rvc-\$\{\{[^}]*inputs\.voice[^}]*\}\}-ckpt-/],
                          ['نامِ artifact', /name: voice-\$\{\{[^}]*inputs\.voice/],
                          ['گروهِ هم‌زمانی', /group: voice-train-\$\{\{[^}]*inputs\.voice/]])
  ok('۳ ' + what + ' به گوینده بسته است', re.test(tr));
ok('۳.۶ اثرِ انگشتِ دیتاست هم', /\("v%d\|" % DS_SIG_VER\) \+ VOICE/.test(vt),
   'بی این، دیتاستِ یکی برای دیگری «موجود» شمرده می‌شود');
ok('۳.۷ آزمایشگاه نامِ artifact را ثابت ننوشته',
   lab.indexOf('-n voice-razavi ') === -1 && /voice-\$RVC_VOICE/.test(lab));

console.log('\n══ ۴) ماشینِ حالت — با gh ساختگی، واقعاً اجرا می‌شود ══');
const T = '/tmp/vpipe-' + process.pid;
cp.execSync('rm -rf ' + T + ' && mkdir -p ' + T + '/tools ' + T + '/docs');
cp.execSync('cp tools/voiceintake.py ' + T + '/tools/');
fs.writeFileSync(T + '/gh', `#!/bin/bash
echo "$@" >> ${T}/gh.log
case "$1 $2" in
  "workflow run") [ -n "$GH_RUN_FAIL" ] && exit 1; exit 0 ;;
  "run list") echo "\${GH_LIST_OUT:-[{\\"databaseId\\":7001,\\"createdAt\\":\\"x\\"}]}" ;;
  "run view")
      case "$3" in
        7001) echo '{"status":"in_progress","conclusion":null}' ;;
        7002) echo '{"status":"completed","conclusion":"failure"}' ;;
        7003) echo '{"status":"completed","conclusion":"success"}' ;;
        *) exit 1 ;;
      esac ;;
  "run download")
      [ -n "$GH_DL_FAIL" ] && exit 1
      d=""; for a in "$@"; do [ "$prev" = "-D" ] && d="$a"; prev="$a"; done
      mkdir -p "$d"; echo "\${FAKE_STATE:-{}}" > "$d/state.json" ;;
esac`, { mode: 0o755 });
// the shim reads the queue from a local file instead of Drive
fs.writeFileSync(T + '/tools/vi.py',
  fs.readFileSync('tools/voiceintake.py', 'utf8').replace(
    'def fetchQueue(fid):',
    'def fetchQueue(fid):\n    return json.load(io.open("' + T + '/q.json", encoding="utf-8"))\ndef _unused(fid):'));

const run = (state, queue, env) => {
  if (state === null) { try { fs.unlinkSync(T + '/docs/voices.json'); } catch (e) {} }
  else fs.writeFileSync(T + '/docs/voices.json',
    typeof state === 'string' ? state : JSON.stringify(state));
  fs.writeFileSync(T + '/q.json', JSON.stringify(queue));
  fs.writeFileSync(T + '/out.txt', '');
  const r = cp.spawnSync('python3', ['tools/vi.py', '--plan'], {
    cwd: T, encoding: 'utf8',
    env: Object.assign({}, process.env, { PATH: T + ':' + process.env.PATH,
      VOICE_QUEUE_ID: 'x', GITHUB_OUTPUT: T + '/out.txt' }, env || {}) });
  let st = null;
  try { st = JSON.parse(fs.readFileSync(T + '/docs/voices.json', 'utf8')); } catch (e) {}
  return { st, out: fs.readFileSync(T + '/out.txt', 'utf8'), log: r.stdout + r.stderr, rc: r.status };
};
const Q = { rev: 1, maxActive: 2, minMinutes: 20, speakers: [
  { key: 'ali', name: 'علی', estMinutes: 40, files: [{ id: '1AAAAAAAAAAA' }] }] };

let r = run({ rev: 0, speakers: {} }, Q);
ok('۴.۱ گویندهٔ تازه آموزش می‌گیرد', r.st.speakers.ali.stage === 'آموزش');
ok('۴.۲ و شناسهٔ فایل‌هایش ثبت می‌شود (مرجعِ سنجش)',
   (r.st.speakers.ali.fileIds || []).length === 1);

/* artifact نرسید: ۷٫۲۱ بی‌صدا آموزشِ تازه راه می‌انداخت، تا ابد، و چون
   هیچ ردیفِ ناموفقی نمی‌نوشت «رهاشده» هرگز ممکن نبود. */
let s2 = { rev: 1, speakers: { ali: { name: 'علی', stage: 'آموزش', runId: '7003' } } };
r = run(s2, Q, { GH_DL_FAIL: '1' });
ok('۴.۳ artifactِ نرسیده ⇒ ناموفق، نه آموزشِ دوباره',
   r.st.speakers.ali.stage === 'ناموفق', r.st.speakers.ali.note);
ok('۴.۴ و بلند گفته می‌شود', r.log.indexOf('::warning') !== -1);

/* شناسهٔ اجرا گم شد: ۷٫۲۱ هیچ نمی‌نوشت و دورِ بعد با allow_fresh می‌رفت. */
fs.writeFileSync(T + '/gh.log', '');
r = run({ rev: 0, speakers: {} }, Q, { GH_LIST_OUT: '[]' });
ok('۴.۵ شناسهٔ گم‌شده هم ثبت می‌شود', r.st && !!r.st.speakers.ali);
fs.writeFileSync(T + '/gh.log', '');
const r2 = run(r.st, Q, { GH_LIST_OUT: '[]' });
ok('۴.۶ و دورِ بعد allow_fresh نمی‌فرستد',
   fs.readFileSync(T + '/gh.log', 'utf8').indexOf('allow_fresh=true') === -1,
   'وگرنه کارِ پیشین دور ریخته می‌شود — همان پرچمی که برای جلوگیری‌اش هست');

/* گویندهٔ «سنجش» که نوبتِ سنجشش نرسیده نباید به آموزش برگردد. */
r = run({ rev: 1, speakers: {
  a: { name: 'الف', stage: 'سنجش', runId: '7003' },
  b: { name: 'ب', stage: 'سنجش', runId: '7003' } } },
  { rev: 2, maxActive: 4, minMinutes: 20, speakers: [
    { key: 'a', name: 'الف', files: [{ id: '1AAAAAAAAAAA' }] },
    { key: 'b', name: 'ب', files: [{ id: '1BBBBBBBBBBB' }] }] });
ok('۴.۷ گویندهٔ دومِ «سنجش» به آموزش برنمی‌گردد',
   r.st.speakers.b.stage === 'سنجش',
   'باگِ ۷٫۲۱: آموزشِ تمام‌شده دور ریخته و چند ساعت از نو شروع می‌شد');

for (const [what, body] of [['ناقص', '{"rev":1,"speak'], ['فهرست', '[]'], ['رشته', '"x"']]) {
  r = run(body, Q);
  ok('۴.۸ حالتِ ' + what + ' کار را متوقف می‌کند، نه اینکه پاکش کند',
     r.rc !== 0 && r.log.indexOf('::error') !== -1 &&
     fs.readFileSync(T + '/docs/voices.json', 'utf8') === body,
     'این کش نیست؛ تنها چیزی است که موتور می‌خوانَد');
}
r = run(null, Q);
ok('۴.۹ ولی نبودنِ فایل عادی است (بارِ اول)', r.rc === 0 && !!r.st);

console.log('\n══ ۵) صف — آنچه واقعاً رسیده، نه آنچه ادعا می‌شود ══');
const py2 = T + '/tools/voiceintake.py';
const q = (body) => {
  fs.writeFileSync(T + '/raw.bin', body);
  return cp.spawnSync('python3', ['-c',
    'import io,sys;sys.path.insert(0,"tools");import voiceintake as V;' +
    'import urllib.request;' +
    'urllib.request.urlopen=lambda *a,**k: __import__("contextlib").closing(io.BytesIO(open("raw.bin","rb").read()));' +
    'print(repr(V.fetchQueue("x")))'], { cwd: T, encoding: 'utf8' });
};
ok('۵.۱ HTML به‌جای JSON بلند گزارش می‌شود',
   q('<html>no</html>').stdout.indexOf('None') !== -1);
ok('۵.۲ فهرست هم رد می‌شود، نه اینکه بعداً بترکد',
   q('[1,2]').stdout.indexOf('None') !== -1,
   'یک فهرست از json.loads سالم درمی‌آید و main را با AttributeError می‌کشت');
ok('۵.۳ شیءِ درست پذیرفته می‌شود', q('{"rev":1,"speakers":[]}').stdout.indexOf('rev') !== -1);

/* ══ «هرگز نوشته نشده» ≠ «نوشته شد و خالی بود» (۷٫۳۳) ══
   یک فایلِ دست‌سازِ rev=0 از `fetchQueue` سالم درمی‌آید، «۰ گوینده» چاپ
   می‌شود و اجرا **سبز** — در حالی که گویندهٔ منتظر هست و هیچ کارِ
   شبانه‌ای رویِ صف ننشسته. پس این را باید `main` رد کند، نه `fetchQueue`. */
const runMain = (body) => {
  fs.writeFileSync(T + '/raw.bin', body);
  return cp.spawnSync('python3', ['-c',
    'import io,sys;sys.path.insert(0,"tools");import voiceintake as V;' +
    'import urllib.request;' +
    'urllib.request.urlopen=lambda *a,**k: __import__("contextlib").closing(io.BytesIO(open("raw.bin","rb").read()));' +
    'sys.argv=["voiceintake.py"];sys.exit(V.main())'],
    { cwd: T, encoding: 'utf8', env: Object.assign({}, process.env,
      { VOICE_QUEUE_ID: 'x', GITHUB_OUTPUT: '' }) });
};
const seed = '{"rev":0,"at":"","engine":"7.21","speakers":[]}';   // عیناً فایلی که ۲۰ سپتامبر در درایو نشست
const r0 = runMain(seed);
ok('۵.۴ صفِ rev=0 اجرا را قرمز می‌کند، نه اینکه «۰ گوینده» بخوانَد',
   r0.status !== 0 && (r0.stdout + r0.stderr).indexOf('هنوز نوشته نشده') !== -1,
   'سبزِ دروغ بدترین خروجیِ ممکن است: گویندهٔ منتظر هست و کسی خبردار نمی‌شود');
const r1 = runMain('{"rev":3,"at":"2026-09-21 02:30","speakers":[]}');
ok('۵.۵ ولی صفی که موتور نوشته و خالی است سبز می‌مانَد',
   r1.status === 0 && (r1.stdout + r1.stderr).indexOf('rev 3') !== -1,
   'پوشهٔ خالی یک واقعیتِ سالم است، نه خرابی');

console.log('\n══ ۶) «بهترین» یعنی بیشترین ══');
fs.mkdirSync(T + '/lab', { recursive: true });
fs.writeFileSync(T + '/lab/aaa.json', JSON.stringify({ rvc: { best: { out_vs_ref: 0.91 } } }));
fs.writeFileSync(T + '/lab/zzz.json', JSON.stringify({ rvc: { best: { out_vs_ref: 0.42 } } }));
const sim = cp.spawnSync('python3', ['tools/voiceintake.py', '--sim', 'lab'],
  { cwd: T, encoding: 'utf8' }).stdout.trim();
ok('۶.۱ بیشترین برمی‌گردد نه آخرین', sim === '0.910', 'گرفت: ' + sim);

console.log('\n══ ۷) گیت — حلقه‌ای که واقعاً بتواند دوباره تلاش کند ══');
ok('۷.۱ پیش از هر تلاش rebase نیمه‌کاره لغو می‌شود',
   (wf.match(/git rebase --abort/g) || []).length >= 2,
   'بی آن، سه تلاشِ بعدی با «unmerged files» می‌افتند — نه با تضادِ اصلی');
ok('۷.۲ مرحلهٔ سنجش روی شاخه checkout می‌کند نه commitِ راه‌انداز',
   /ref: \$\{\{ github\.ref_name \}\}/.test(wf),
   'وگرنه تضاد با pushِ plan قطعی است، و تلاشِ دوباره بی‌فایده');
ok('۷.۳ measure وقتی plan شکست خورده اجرا نمی‌شود',
   /if: success\(\) && needs\.plan\.outputs\.measure/.test(wf));
ok('۷.۴ عددِ شباهت از راهِ محیط می‌آید نه درجِ در فرمان',
   /SIM: \$\{\{ steps\.sim\.outputs\.sim \}\}/.test(wf) && /"\$SIM"/.test(wf));

console.log('\n══ ۸) سقفِ کش برای کلِ مخزن است، نه برای هر گوینده ══');
const cfg = fs.readFileSync('src/00_Config.gs', 'utf8');
ok('۸.۱ پیش‌فرضِ هم‌زمانی با سقفِ ۱۰ گیگ می‌خوانَد',
   /VOICE_MAX_ACTIVE: 1,/.test(cfg),
   'یک گوینده سرِ ذخیره ~۹٫۵ گیگ می‌گیرد؛ دوتا یعنی بیرون انداختنِ کشِ هم');

cp.execSync('rm -rf ' + T);
console.log('\n══ ۹) روحِ خواندن — مسیری که تا ۷٫۳۴ وجود نداشت ══');
/* `stylecard.py` ساخته و آزموده شده بود و در گردش‌کار **صفر بار** صدا
   زده می‌شد. همان شکلِ «تحلیلی که به تصمیم وصل نشد». */
ok('۹.۱ گردش‌کار موتورِ style را صدا می‌زند',
   /--engine style/.test(wf), 'بی این، روح هرگز اندازه گرفته نمی‌شود');
ok('۹.۲ کارت به حالتِ گوینده می‌نشیند',
   /voiceintake\.py --style/.test(wf));
ok('۹.۳ از چند ضبط اندازه می‌گیرد، نه یکی',
   /--refids/.test(wf) && /--refids/.test(py),
   'پنجرهٔ حالت‌ها ربعِ ساعت است و یک فایل چند دقیقه');
/* کارتِ سبک به مدل کاری ندارد؛ اگر به measure گره بخورد، گوینده‌ای که
   آموزشش شکست بخورد روحش هم هرگز ثبت نمی‌شود. */
const styleJob = wf.slice(wf.indexOf('\n  style:'));
ok('۹.۴ کارِ سبک به مدل گره نخورده است',
   styleJob.indexOf('needs: plan') !== -1 &&
   styleJob.slice(0, styleJob.indexOf('\n  measure:')).indexOf('--runid') === -1,
   'یک شکست نباید دو قابلیت را ببرد');
ok('۹.۵ بی هیچ ضبطی، قرمز — نه کارتِ خالی',
   /ضبطی برداشته نشد/.test(wf) && /exit 1/.test(styleJob),
   'کارتی که از هیچ ساخته شود شبیهِ اندازه‌گیری است');
ok('۹.۶ plan خروجیِ style را می‌دهد و جاب می‌خواندش',
   /style: \$\{\{ steps\.plan\.outputs\.style \}\}/.test(wf) &&
   /needs\.plan\.outputs\.style != ''/.test(wf) &&
   /style=%s/.test(py),
   'سه حلقه: plan می\u200cنویسد، job خروجی می\u200cدهد، job بعدی شرطش می\u200cکند');

/* عددها به متن — همان تبدیل، در یک نسخه. */
const sc = cp.spawnSync('python3', ['-c',
  'import sys,json;sys.path.insert(0,"tools");import stylecard as S;' +
  'm={"seconds":900,"speech_pct":59,"phrase_seconds_median":1.4,' +
  '"pauses_per_minute":18.7,"pause_short_median":0.2,"pause_sentence_median":0.7,' +
  '"pause_para_median":1.2,"range_semitones":9.0,"phrases_measured":314,"gaps_measured":271};' +
  'md=[{"n":1,"name":"روان","share_pct":60,"numbers":{"pauses_per_minute":15.0,"phrase_seconds_median":2.2}}];' +
  'sh=S.styleSheet_(m,md,"x");print(json.dumps({"cue":sh["cue"],"thin":sh["thin"],' +
  '"cells":S.styleSheetCell_(sh)},ensure_ascii=False))'],
  { cwd: process.cwd(), encoding: 'utf8' });
const card = JSON.parse(sc.stdout.trim() || '{}');
ok('۹.۷ دستورِ فشرده زیرِ سقفِ ttsCue می‌مانَد',
   card.cue && card.cue.length <= 320,
   'هرچه آخر باشد اول قربانی می‌شود — گرفت: ' + (card.cue || '').length);
ok('۹.۸ برچسبِ وایب خالی است، ولی جداکننده‌اش هست',
   /^[^|]+\|\s*\|/.test(card.cells.modes),
   'بی جداکننده، personaModes_ کلِ حالت را بی‌صدا دور می‌ریزد');
ok('۹.۹ نمونهٔ کم خودش را اعلام می‌کند',
   card.thin === false &&
   JSON.parse(cp.spawnSync('python3', ['-c',
     'import sys,json;sys.path.insert(0,"tools");import stylecard as S;' +
     'print(json.dumps(S.styleSheet_({"seconds":60,"speech_pct":60,' +
     '"phrases_measured":3,"gaps_measured":2},[],"x"),ensure_ascii=False))'],
     { cwd: process.cwd(), encoding: 'utf8' }).stdout).thin === true,
   'عددِ لرزان باید از عددِ محکم جدا باشد');

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
