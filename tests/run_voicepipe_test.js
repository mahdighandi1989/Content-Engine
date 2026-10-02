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
const mkGh = () => fs.writeFileSync(T + '/gh', `#!/bin/bash
echo "$@" >> ${T}/gh.log
case "$1 $2" in
  "workflow run") [ -n "$GH_RUN_FAIL" ] && exit 1; exit 0 ;;
  "run list")
      # همان باگِ \`\${VAR:-{...}}\` که پایین‌تر توضیح داده شد: \`}\`ِ داخلِ
      # مقدارِ پیش‌فرض، بسطِ متغیر را همان‌جا می‌بندد. پس پیش‌فرض همیشه
      # خراب بود و \`dispatch\` هرگز شناسه‌ای نمی‌گرفت — و چون مسیرِ
      # «گویندهٔ تازه» بی شناسه هم ردیف می‌نویسد، هیچ سنجه‌ای نیفتاد.
      L="$GH_LIST_OUT"; [ -z "$L" ] && L='[{"databaseId":7001,"createdAt":"x"}]'
      printf '%s\\n' "$L" ;;
  "run view")
      case "$3" in
        7001) echo '{"status":"in_progress","conclusion":null}' ;;
        7002) echo '{"status":"completed","conclusion":"failure"}' ;;
        7003) echo '{"status":"completed","conclusion":"success"}' ;;
        7004) echo '{"status":"completed","conclusion":"cancelled"}' ;;
        *) exit 1 ;;
      esac ;;
  "run download")
      [ -n "$GH_DL_FAIL" ] && exit 1
      d=""; for a in "$@"; do [ "$prev" = "-D" ] && d="$a"; prev="$a"; done
      # ══ بدَلی که JSONِ باطل می‌ساخت، و هیچ‌کس نفهمید ══
      # \`\${FAKE_STATE:-{}}\` در bash یعنی \`\${FAKE_STATE:-{}\` و بعد یک
      # \`}\`ِ اضافه، پس state.json همیشه یک آکولادِ زیادی داشت و
      # \`json.load\` می‌افتاد. یعنی مسیرِ «artifact رسید و خوانده شد» —
      # قلبِ این ماشینِ حالت — **هرگز یک بار هم اجرا نشده بود** و
      # مجموعه سبز بود. بدَلی که در جایی خراب باشد که تولید سالم است،
      # هیچ چیزی را ثابت نمی‌کند (۷٫۲۴).
      S="$FAKE_STATE"; [ -z "$S" ] && S='{}'
      mkdir -p "$d"; printf '%s\\n' "$S" > "$d/state.json" ;;
esac`, { mode: 0o755 });
mkGh();
// the shim reads the queue from a local file instead of Drive
const mkVi = () => fs.writeFileSync(T + '/tools/vi.py',
  fs.readFileSync('tools/voiceintake.py', 'utf8').replace(
    'def fetchQueue(fid):',
    'def fetchQueue(fid):\n    return json.load(io.open("' + T + '/q.json", encoding="utf-8"))\ndef _unused(fid):'));
mkVi();

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

console.log('\n══ ۱۰) پلِ رنگِ صدا — نیمهٔ بیرونی ══');
const bw = fs.readFileSync('.github/workflows/voice-bridge.yml', 'utf8');
const bp = fs.readFileSync('tools/voicebridge.py', 'utf8');

/* voicelab «--ref» را اجباری تعریف کرده. ۷٫۲۲ ثابت کرد نفرستادنش یعنی
   هر اجرا قرمز — و آن بار هیچ‌کس نفهمید چون خطا بلعیده می‌شد. */
for (const r of required) {
  ok('۱۰.۱ پل «' + r + '» را می‌فرستد', bp.indexOf('"' + r + '"') !== -1,
     'بی آن، هر تبدیل قرمز می‌شود');
}
/* ══ این سنجه اول کامنت را می‌خواند، نه کد ══
   نسخهٔ اولش `bp.indexOf('|| echo')` بود و روی جمله‌ای افتاد که **دربارهٔ**
   همان تله نوشته شده بود. سنجه‌ای که چیزِ اشتباه را بسنجد از سنجهٔ نبوده
   بدتر است: سبز می‌شود و کسی دیگر نگاهش نمی‌کند. پس کامنت‌ها کنار
   گذاشته می‌شوند و مرزِ واقعی سنجیده می‌شود. */
const bpCode = bp.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
ok('۱۰.۲ شکستِ تبدیل بالا می‌آید، بلعیده نمی‌شود',
   /subprocess\.check_call\(args\)/.test(bpCode) &&
   !/check_call\(args\)[\s\S]{0,80}?except/.test(bpCode),
   'check_call روی کدِ غیرصفر خطا می‌اندازد؛ try/except دورش یعنی همان ۷٫۲۲');
ok('۱۰.۲-ب و گردش‌کار هم شکست را رد نمی‌کند',
   bw.indexOf('continue-on-error') === -1 && !/voicebridge\.py[^\n]*\|\|/.test(bw),
   'یک `|| echo` در گردش‌کار، قرمز را سبز می‌کند');
ok('۱۰.۳ خروجی نساخت ⇒ قرمز، نه ردیفِ بسته',
   /خروجی ساخته نشد/.test(bp) && /return 1/.test(bp));

/* release asset، نه artifact: artifact سی روز بعد می‌میرد و از بیرونِ
   Actions دانلود نمی‌شود. همان انتخابی که render.js کرد. */
ok('۱۰.۴ خروجی release asset می‌شود نه artifact',
   /uploads\.github\.com/.test(bp) && bp.indexOf('actions/upload-artifact') === -1 &&
   bw.indexOf('actions/upload-artifact') === -1,
   'artifact سی روز بعد می‌میرد');
ok('۱۰.۵ و نشانی در نقشه‌ای می‌نشیند که موتور می‌خوانَد',
   /docs\/voice-renders\.json/.test(bp) &&
   fs.readFileSync('src/00_Config.gs', 'utf8').indexOf('docs/voice-renders.json') !== -1,
   'دو نامِ متفاوت یعنی نقشه‌ای که هیچ‌کس نمی‌خوانَد، بی هیچ خطایی');

/* HTML به‌جای JSON: تلهٔ ۷٫۳۳، که چهار اجرا در آن افتاد. */
ok('۱۰.۶ صفحهٔ HTML به‌جای صف بلند گزارش می‌شود',
   /صفحهٔ HTML/.test(bp));
ok('۱۰.۷ و صفِ ننوشته «۰ ردیف» خوانده نمی‌شود',
   /rev.*< 1/.test(bp) && /هنوز نوشته نشده/.test(bp),
   'قرمزِ صادق بهتر از سبزِ دروغ');

/* ══ تا ۷٫۷۷ اینجا «یکی در هر اجرا» بود و `todo[0]` را می‌سنجید ══
   نگرانی درست بود — jobـِ کشته‌شده سرِ سقف ردیفِ نیمه‌کاره را می‌بَرد — ولی
   جوابش این سقف نبود: نقشه پس از هر ردیف ذخیره می‌شود و مرحلهٔ ثبتش
   `if: always()` دارد. مرزِ تازه **زمان** است، نه تعداد، و ردیفِ تازه فقط
   پیش از پر شدنِ بودجه شروع می‌شود؛ حسابش در بندِ ۱۸ از روی خودِ منبع
   سنجیده می‌شود. سنجهٔ کهنه حذف نشد — به مرزِ تازه منتقل شد. */
ok('۱۰.۸ حلقه پیش از شروعِ ردیفِ تازه بودجه را می‌سنجد',
   /for i, it in enumerate\(todo\)/.test(bp) && /spent >= budgetMin/.test(bp),
   'بی سنجشِ بودجه، ردیفِ تازه می‌تواند وسطِ کار به سقفِ job بخورد. ' +
   'شرطِ `i > 0` عمداً اینجا سنجیده نمی‌شود — بندِ ۱۸.۵ آن را **رفتاری** ' +
   'می‌سنجد، و سنجهٔ متنی که جلوی سنجهٔ رفتاری بایستد فقط شکستن را ' +
   'می‌قاپد بی آنکه چیزِ بیشتری ثابت کند');
ok('۱۰.۹ و سقفِ job با حاشیه بالاتر از عددِ سنجیده‌شده است',
   (Number((bw.match(/timeout-minutes:\s*(\d+)/) || [])[1]) || 0) >= 60,
   'قسمتِ نوزده‌دقیقه‌ای ~۲۰ تا ۲۵ دقیقه — اندازه‌گیریِ ۱۸ سپتامبر');
ok('۱۰.۱۰ روی شاخه checkout می‌کند نه commitِ راه‌انداز',
   /ref: \$\{\{ github\.ref_name \}\}/.test(bw),
   'درسِ \u06f7\u066b\u06f2\u06f2: نوشتن روی درختِ کهنه همیشه تضاد می‌گیرد');
ok('۱۰.۱۱ و حلقهٔ گیت واقعاً می‌تواند دوباره تلاش کند',
   /git rebase --abort/.test(bw));

console.log('\n══ ۱۱) سقفِ هم‌زمانی — و بن‌بستی که هر شش ساعت سبز بود ══');
/* ══ چرا این بخش رفتاری است و نه grep ══
   ۲۲ سپتامبر، اجرای ۶۳ِ voice-train ساعتِ ۰۹:۱۴ سبز تمام شد. ساعتِ ۱۲:۰۴
   `plan` گفت «نوبتش هست ولی سقفِ هم‌زمانی پر است» — و هر شش ساعت همین را
   می‌گفت، **سبز**.
   `active` گویندگانِ «در حالِ آموزش/سنجش» را می‌شمرد، از جمله خودِ همان
   گوینده. با `VOICE_MAX_ACTIVE: 1` — که عمدی است، چون کشِ ۱۰ گیگی مالِ کلِ
   مخزن است (۷٫۲۲) — گوینده‌ای که وسطِ آموزش است جلوی ادامهٔ خودش را
   می‌گیرد. آموزش عمداً تکه‌تکه است، پس این یعنی هیچ‌وقت تمام نمی‌شود.
   هیچ grepی این را نمی‌گرفت: کد درست به نظر می‌رسد. فقط اجرا کردنش. */
const planRun = (state, cap) => cp.spawnSync('python3', ['-c', [
  'import sys, json; sys.path.insert(0, "tools"); import voiceintake as V',
  'V.runInfo = lambda r: {"status": "completed", "conclusion": "success"}',
  'V.artifactState = lambda r, k, d: {"done": False, "epochs_reached": 11}',
  'sent = []',
  'V.dispatch = lambda k, i, e, f: (sent.append(k), "RUN-" + k)[1]',
  'st = json.loads(sys.argv[1]); q = json.loads(sys.argv[2])',
  'ch, m, sty = V.plan(q, st)',
  'print(json.dumps({"sent": sent, "stages": {k: v.get("stage") for k, v in st["speakers"].items()}}, ensure_ascii=False))',
].join('\n'), JSON.stringify(state), JSON.stringify(cap)],
  { cwd: process.cwd(), encoding: 'utf8' });

{
  // دقیقاً حالتِ امروز: یک گوینده، وسطِ آموزش، سقف ۱.
  const st = { speakers: { g1: { name: 'گ', stage: 'آموزش', runId: '63',
                                 everDispatched: true, style: { cue: 'x' } } } };
  const q = { maxActive: 1, speakers: [{ key: 'g1', name: 'گ',
              files: [{ id: 'F1' }] }] };
  const r = planRun(st, q);
  ok('۱۱.۰ اجرا شد', r.status === 0, (r.stderr || '').slice(0, 300));
  const got = JSON.parse(r.stdout.trim().split('\n').pop());
  ok('۱۱.۱ ادامهٔ آموزشِ خودش فرستاده می‌شود',
     got.sent.length === 1 && got.sent[0] === 'g1',
     'گرفت: ' + JSON.stringify(got.sent) +
     ' — کسی با خودش بر سرِ جایی که مالِ اوست رقابت نمی‌کند');
}
{
  // و مرزِ مقابل، که همین اصلاح نباید بشکندش: گویندهٔ **دیگری** در جریان
  // است، پس گویندهٔ تازه باید منتظر بماند. سقف برای همین هست.
  const st = { speakers: { g1: { name: 'الف', stage: 'آموزش', runId: '63',
                                 everDispatched: true, style: { cue: 'x' } },
                           g2: { name: 'ب', stage: '', style: { cue: 'x' } } } };
  const q = { maxActive: 1, speakers: [{ key: 'g2', name: 'ب',
              files: [{ id: 'F2' }] }] };
  const r = planRun(st, q);
  ok('۱۱.۲ اجرا شد', r.status === 0, (r.stderr || '').slice(0, 300));
  const got = JSON.parse(r.stdout.trim().split('\n').pop());
  ok('۱۱.۳ ولی گویندهٔ تازه پشتِ گویندهٔ دیگر می‌مانَد',
     got.sent.length === 0,
     'گرفت: ' + JSON.stringify(got.sent) +
     ' — کشِ ۱۰ گیگی مالِ کلِ مخزن است؛ دو نفر هم‌زمان یعنی هر دو می‌افتند (۷٫۲۲)');
}

console.log('\n══ ۱۲) لغو ≠ شکست، و عددی که در یک جمله زندگی نکند (۲۳ سپتامبر) ══');
/* ══ اجرای ۶۷ِ voice-train ══
   دورِ ۶ را تمام و ذخیره کرد («Saving checkpoint spk-1g0r95d_e6: Success»
   در ۱۵:۰۱) و بعد گیت‌هاب در دقیقهٔ ۲۳۰ کلِ job را لغو کرد — نه سقفِ ۳۵۰
   دقیقه‌ایِ job، نه بودجهٔ ۲۹۰ دقیقه‌ایِ خودمان، و هیچ‌جای این مخزن
   `gh run cancel` ندارد. مراحلِ `always()` همه دویدند و کش با وزنِ `_e6`
   ذخیره شد: **هیچ‌چیز گم نشد.** ولی حالت‌ماشین «موفق نبود ⇒ ناموفق»
   می‌گفت، پس گلدوز «ناموفق» ثبت شد — و سه تا از این یعنی «رهاشده».
   آموزشِ CPUی هر دور ~۲ تا ۲٫۷ ساعت است و بودجهٔ هر اجرا ۲۹۰ دقیقه، پس
   اجرای نیمه‌کاره **قاعده** است؛ همان راهی که رضوی با ۵۹ اجرا رفت. */
{
  // بخشِ ۵ پوشهٔ موقت را برمی‌دارد؛ همان ماشینِ حالتِ بخشِ ۴ دوباره لازم است.
  cp.execSync('mkdir -p ' + T + '/tools ' + T + '/docs');
  cp.execSync('cp tools/voiceintake.py ' + T + '/tools/');
  mkVi(); mkGh();
  const S5 = JSON.stringify({ schema: 2, epochs_reached: 5, done: false });
  const S6 = JSON.stringify({ schema: 2, epochs_reached: 6, done: false });
  const base = { rev: 1, speakers: {
    ali: { name: 'علی', stage: 'آموزش', runId: '7004' } } };

  fs.writeFileSync(T + '/gh.log', '');
  let c = run(base, Q, { FAKE_STATE: S6 });
  ok('۱۲.۱ اجرای لغوشده «ناموفق» نیست — ادامه می‌دهد',
     c.st.speakers.ali.stage === 'آموزش',
     'گرفت: ' + c.st.speakers.ali.stage + ' · ' + c.st.speakers.ali.note);
  ok('۱۲.۲ و عددِ دور یک فیلد می‌شود، نه یک جملهٔ فارسی',
     c.st.speakers.ali.epochs === 6,
     'گرفت: ' + JSON.stringify(c.st.speakers.ali.epochs) +
     ' — عددی که در `note` بماند، چیزی نمی‌تواند با دیروز مقایسه‌اش کند');

  const fail = { rev: 1, speakers: {
    ali: { name: 'علی', stage: 'آموزش', runId: '7002' } } };
  ok('۱۲.۳ ولی شکستِ واقعی همچنان ناموفق است',
     run(fail, Q, { FAKE_STATE: S6 }).st.speakers.ali.stage === 'ناموفق',
     'وگرنه درِ «رهاشده» بسته می‌شود و اجرای خراب تا ابد تکرار می‌شود');

  /* `stall: 2` عمدی است: بی آن، «شمارنده صفر شد» با «شمارنده از اول صفر
     بود» یکی می‌شود و سنجهٔ ۱۲.۵ هرچه بکنی سبز می‌مانَد — اولین بار که
     کد را عمداً شکستم، دقیقاً همین شد. */
  const at6 = { rev: 1, speakers: {
    ali: { name: 'علی', stage: 'آموزش', runId: '7004', epochs: 6, stall: 2 } } };
  const same = run(at6, Q, { FAKE_STATE: S6 });
  ok('۱۲.۴ اجرایی که هیچ دوری جلو نرود، شمرده می‌شود',
     same.st.speakers.ali.stall === 3 &&
     same.st.speakers.ali.note.indexOf('جلو نرفت') !== -1,
     'گرفت: stall=' + same.st.speakers.ali.stall + ' · ' + same.st.speakers.ali.note);
  const moved = run(at6, Q, { FAKE_STATE: JSON.stringify(
    { schema: 2, epochs_reached: 7, done: false }) });
  ok('۱۲.۵ و پیشرفت شمارنده را صفر می‌کند',
     moved.st.speakers.ali.stall === 0 && moved.st.speakers.ali.epochs === 7,
     'شمارنده‌ای که صفر نشود، یک بار که بزند تا ابد می‌زند');
  void S5;
}

console.log('\n══ ۱۲-ب) عدد از روی دیسک، نه از فایلی که فرآیندِ کشته‌شده قرار بود بنویسد ══');
{
  /* `state.json` را پایانِ `voicetrain.py` می‌نویسد. فرآیندی که لغو شود
     هرگز به آن خط نمی‌رسد، پس فایلِ **اجرای پیشین** به‌عنوانِ نتیجهٔ این
     اجرا بارگذاری می‌شود. جوابِ درست از روزِ اول در docstringِ
     `epochsDone_` بود: عکس‌های روی دیسک. تحلیل بود، سیم نبود. */
  const W = T + '/rvcwork';
  cp.execSync('rm -rf ' + W + ' && mkdir -p ' + W + '/assets/weights ' +
              W + '/out ' + W + '/logs/vt');
  fs.writeFileSync(W + '/assets/weights/vt_e6_s2526.pth', 'x');
  fs.writeFileSync(W + '/logs/vt/G_2526.pth', 'x');
  fs.writeFileSync(W + '/out/state.json', JSON.stringify(
    { schema: 2, voice: 'vt', epochs_target: 32, epochs_reached: 5,
      done: false, steps: 2333333 }));
  const sy = cp.spawnSync('python3', ['-c',
    'import sys, json; sys.path.insert(0, "tools"); import voicetrain as V; ' +
    'print(json.dumps(V.stateSync_(sys.argv[1])))', W],
    { cwd: process.cwd(), encoding: 'utf8',
      env: Object.assign({}, process.env, { VT_VOICE: 'vt', VT_EPOCHS: '32' }) });
  let got = null;
  try { got = JSON.parse(sy.stdout.trim().split('\n').pop()); } catch (e) {}
  ok('۱۲.۶ وضعیت از روی وزنِ روی دیسک بازنویسی می‌شود',
     !!got && got.epochs_reached === 6 && got.steps === 2526,
     'گرفت: ' + JSON.stringify(got) + ' — artifactِ اجرای ۶۷ دورِ ۵ گفت در ' +
     'حالی که `_e6` روی دیسک بود');
  let onDisk = null;
  try { onDisk = JSON.parse(fs.readFileSync(W + '/out/state.json', 'utf8')); } catch (e) {}
  ok('۱۲.۶-ب و روی خودِ فایل نوشته می‌شود (artifact همان را می‌بَرد)',
     !!onDisk && onDisk.epochs_reached === 6 && onDisk.done === false,
     'گرفت: ' + JSON.stringify(onDisk));
  const sy2 = cp.spawnSync('python3', ['-c',
    'import sys, json; sys.path.insert(0, "tools"); import voicetrain as V; ' +
    'print(json.dumps(V.stateSync_(sys.argv[1])))', W],
    { cwd: process.cwd(), encoding: 'utf8',
      env: Object.assign({}, process.env, { VT_VOICE: 'vt', VT_EPOCHS: '6' }) });
  let got2 = null;
  try { got2 = JSON.parse(sy2.stdout.trim().split('\n').pop()); } catch (e) {}
  ok('۱۲.۷ و «تمام‌شده» هم از همان عدد درمی‌آید، نه از مقدارِ کهنه',
     !!got2 && got2.done === true,
     'گرفت: ' + JSON.stringify(got2 && got2.done));
}
{
  const wf = fs.readFileSync('.github/workflows/voice-train.yml', 'utf8');
  const at = wf.indexOf('stateSync_');
  // کشِ **چک‌پوینت**، نه کشِ پایه: هر دو `actions/cache/save`اند و پایه
  // جلوتر است؛ و کلیدِ ckpt در مرحلهٔ `restore` هم هست، آن هم جلوتر.
  // لنگری که چیزِ دیگری را بگیرد، ادعای دیگری را می‌سنجد — پس آخرین
  // `cache/save` که همان ذخیرهٔ پایانِ کار است.
  const save = wf.lastIndexOf('actions/cache/save');
  // لنگر روی خودِ artifactِ **نتیجه** (`path: ~/rvcwork/out`) و نه روی
  // «name: voice-…»، چون artifactِ نردبان هم با همان پیشوند شروع می‌شود
  // و پیش از این مرحله است — لنگری که چیزِ دیگری را بگیرد، ادعای دیگری
  // را می‌سنجد.
  const art = wf.indexOf('path: ~/rvcwork/out');
  ok('۱۲.۸ گردش‌کار آن را پیش از کش و پیش از artifact صدا می‌زند',
     at !== -1 && at < save && at < art,
     'بعد از آن‌ها یعنی همان عددِ کهنه ذخیره و بارگذاری می‌شود');
  const blk = wf.slice(wf.lastIndexOf('- name:', at), at);
  ok('۱۲.۹ و با always()، چون لغو دقیقاً حالتی است که این برایش هست',
     /if:\s*always\(\)/.test(blk),
     'مرحله‌ای که فقط در حالتِ موفق بدود، در حالتی که مشکل دارد نمی‌دود');
}

/* ══ ۱۳) پل باید **کلِ قسمت** را تحویل بدهد، و بگوید اگر نداد (۲۶ سپتامبر) ══
 *
 * اجرای ۱۷ سبز بود و چیزی تحویل نداد. لاگ: ورودی ۹۰۲٫۷ ثانیه، خروجی
 * **۱۱٫۸۴ ثانیه**. علت: `voicelab.py` ابزارِ سنجش است — `refAudition_` یک
 * **پنجره** برمی‌دارد و `--src-seconds` طولش است، با پیش‌فرضِ ۱۲. پل
 * هیچ‌وقت پاسش نمی‌داد، پس پیش‌فرضِ آزمایشگاه می‌رفت روی تولید.
 */
{
  console.log('\n══ ۱۳) پل: کلِ قسمت، نه نمونه ══');
  const vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
  const lab = fs.readFileSync('tools/voicelab.py', 'utf8');

  // پیش‌فرض را از خودِ voicelab می‌خوانیم — عددِ دست‌نویس فردا کهنه می‌شود.
  const d = /--src-seconds"[^)]*default=(\d+)/.exec(lab);
  ok('۱۳.۱ پیش‌فرضِ `--src-seconds` در آزمایشگاه کوتاه است',
     !!d && Number(d[1]) <= 60,
     d ? (d[1] + ' ثانیه — یعنی هر کس پاسش ندهد، نمونه می‌گیرد نه قسمت') : 'پیدا نشد');

  ok('۱۳.۲ و پل حتماً پاسش می‌دهد',
     /"--src-seconds"/.test(vb),
     'بی آن، یک قسمتِ پانزده‌دقیقه‌ای ۱۲ ثانیه تحویل می‌شود و اجرا سبز است');

  ok('۱۳.۳ و عدد از طولِ واقعیِ همان فایل می‌آید، نه از یک ثابت',
     /wavSeconds\("vb\/src\.wav"\)/.test(vb) &&
     /--src-seconds", str\(int\(srcSec\)/.test(vb),
     'ثابتِ حدسی یعنی قسمتِ بلندتر باز هم بریده می‌شود');

  /* نگهبانِ اندازه یک لایه پایین‌ترِ خرابی ایستاده بود: نمونهٔ ۱۲ ثانیه‌ای
     ۰٫۹ مگابایت است و از سقفِ ثابتِ ۲۰۰ کیلوبایت رد می‌شد. آنچه باید
     سنجیده شود نسبتِ خروجی به **ورودی** است. */
  ok('۱۳.۴ نگهبانِ اندازه با ورودی سنجیده می‌شود، نه با عددِ ثابت',
     /outSec < srcSec \* 0\./.test(vb) && !/size < 200000/.test(vb),
     'سقفِ ثابت، نمونهٔ ۱۲ ثانیه‌ای را «سالم» می‌دید');

  /* ══ ۱۳.۵ و نقشه واقعاً ثبت شود ══
     `git diff` فایلِ **untracked** را نمی‌بیند. نقشه هرگز وجود نداشته، پس
     بارِ اول که ساخته می‌شود آن چک تمیز برمی‌گردد، مرحله با صفر خارج
     می‌شود و اجرا سبز است — با خروجی‌ای که هیچ‌جا ثبت نشده. */
  const wf = fs.readFileSync('.github/workflows/voice-bridge.yml', 'utf8');
  const iAdd = wf.indexOf('git add docs/voice-renders.json');
  const iChk = wf.search(/git diff (--cached )?--quiet -- docs\/voice-renders\.json/);
  ok('۱۳.۵ پیش از پرسیدنِ «چیزی عوض شد؟» فایل add می‌شود',
     iAdd > 0 && iChk > iAdd,
     'وگرنه بارِ اول — که فایل untracked است — همیشه «چیزی عوض نشد» می‌گوید');
  ok('۱۳.۵-ب و پرسش از ناحیهٔ stage می‌پرسد',
     /git diff --cached --quiet -- docs\/voice-renders\.json/.test(wf),
     '`git diff` بی `--cached` باز هم untracked را نمی‌بیند');
}

/* ══════════════════════════════════════════════════════════════════════
 * ۱۴) و سقفی که موتور دارد، نه گردش‌کار (۷٫۶۶)
 *
 * ۲۶ سپتامبر، اجرای ۱۸: تبدیل درست شد — ۱۷٫۷ دقیقه کار، ۷۰٫۹ مگابایت
 * خروجی، نقشه هم ثبت شد. و موتور نمی‌توانست برش دارد: `UrlFetchApp`
 * پاسخِ بزرگ‌تر از ۵۰ مگابایت را نمی‌گیرد. بخشِ ۲۷ همین سقف را از روزِ
 * اول برای **آپلودِ** یوتیوب نوشته بود؛ طرفِ دانلودش بسته نبود.
 *
 * دو سرِ این مرز در دو زبان نوشته شده‌اند، پس یک سنجه باید هر دو را با
 * هم ببیند — وگرنه روزی یکی از دو عدد عوض می‌شود و هیچ‌چیز نمی‌گوید.
 * ══════════════════════════════════════════════════════════════════════ */
{
  console.log('\n══ ۱۴) سقفِ برداشت — دو سر، یک مرز ══');
  const vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
  const cfg = fs.readFileSync('src/00_Config.gs', 'utf8');
  /* نامِ صریح، چون `lab` در بالای همین پرونده به **گردش‌کارِ** voice-lab
     بسته شده و اینجا خاموش به آن می‌رسید: سنجه‌ای که فایلِ دیگری را
     می‌خواند سبز می‌مانَد و چیزی را نمی‌سنجد. */
  const labPy = fs.readFileSync('tools/voicelab.py', 'utf8');

  ok('۱۴.۱ گردش‌کار خروجی را تکه‌تکه می‌کند',
     /def splitWav\(/.test(vb) && /pieces = splitWav\(best, cap\)/.test(vb),
     'بی بُرش، هر قسمتِ بلندتر از ~۹ دقیقه برداشته نمی‌شود');

  /* هر دو عدد از **منبع** خوانده می‌شوند، نه دست‌نویس — همان قاعدهٔ ۱۳.۱. */
  const mPiece = /VBR_PIECE_MB", "(\d+)"/.exec(vb);
  const mCap = /VBR_MAX_BYTES:\s*(\d+)/.exec(cfg);
  const pieceB = mPiece ? Number(mPiece[1]) * 1048576 : NaN;
  const capB = mCap ? Number(mCap[1]) : NaN;
  ok('۱۴.۲ و تکه‌اش از سقفِ برداشتِ موتور کوچک‌تر است',
     pieceB > 0 && capB > 0 && pieceB < capB,
     'تکه ' + pieceB + ' · سقف ' + capB +
     ' — دو عدد در دو زبان که هیچ‌کس با هم نسنجیده بود، همان شکلِ ۷٫۳۰/۷٫۳۱');
  ok('۱۴.۲-ب و سقفِ موتور زیرِ ۵۰ مگابایتِ Apps Script است',
     capB < 50000000, capB + ' بایت');

  ok('۱۴.۳ بُرش با طولِ تکه‌ها بازبینی می‌شود، نه با اعتماد',
     /abs\(tot - sec\)/.test(vb),
     'بُرشی که صدا گم کند و سبز بماند، نیمهٔ قسمت را به‌نامِ کلِ قسمت تحویل می‌دهد');
  ok('۱۴.۳-ب و تکهٔ بزرگ‌مانده رد می‌شود',
     /if os\.path\.getsize\(p\) > cap:/.test(vb),
     'ffmpeg مرزِ فریم را گرد می‌کند؛ «خواستم ریز باشد» یعنی ریز نیست');

  /* ══ و مرزی که موتورِ قدیمی را نگه می‌دارد ══
     موتورِ ۷٫۶۵ فقط `url` را می‌خوانَد. اگر نقشهٔ چندتکه `url` داشته باشد،
     آن موتور **تکهٔ اول** را به‌عنوانِ کلِ قسمت کنارِ اصل می‌گذارد — همان
     نیمه‌قسمتی که بخشِ ۲۷ از انتشارش امتناع می‌کند. */
  const iOne = vb.indexOf('if len(urls) == 1:');
  const iUrl = vb.indexOf('rec["url"] = urls[0]');
  ok('۱۴.۴ `url` فقط در حالتِ تک‌تکه نوشته می‌شود',
     iOne > 0 && iUrl > iOne && !/"url": url,/.test(vb),
     'وگرنه موتورِ قدیمی نیمهٔ قسمت را برمی‌دارد و هیچ‌جا نمی‌گوید');

  /* ══ و دفترِ «انجام‌شده» نباید پاسخِ غیرقابلِ‌استفاده را قفل کند ══
     نقشه هم پاسخ است و هم دفترِ انجام‌شده. ورودیِ پیش از ۷٫۶۶ یک `url`
     تکیِ ۷۰٫۹ مگابایتی دارد — پاسخی که موتور هرگز نمی‌تواند بردارد — و
     چون کلید «در نقشه هست»، هیچ اجرای بعدی دوباره نمی‌سازدش. معیار باید
     «دستورِ پخت» باشد نه «وجود داشتن»: همان `EMB_TEXT_VER` در ۷٫۲۷. و
     خودکار، چون پاک کردنِ دستیِ یک ردیف در نقشه دری است که آدم باید
     بازش کند (۵٫۹۵). */
  /* ══ ۱۴.۷ کارِ آزمایشگاه که در تولید پول می‌گیرد ══
     ۲۶ سپتامبر، اجرای ۱۹: تبدیل ۰۷:۴۸:۲۳ **تمام شد**، و ۰۷:۴۹:۱۴ با
     `The runner has received a shutdown signal` کشته شد — وسطِ
     `rvcSim_`، یعنی محاسبهٔ عددِ شباهت روی کلِ فایلِ ۹۰۳ ثانیه‌ای.
     نقشه هیچ عددی از آن ثبت نمی‌کند و موتور نمی‌خوانَدش: کارِ انتخابِ
     «بهترین ترکیب» است و پل یک ترکیب بیشتر ندارد.
     لغو از سمتِ گیت‌هاب را نمی‌شود بست؛ پنجرهٔ بینِ «ساخته شد» و «ثبت
     شد» را می‌شود کوچک کرد. همان خانوادهٔ `--src-seconds`: پل ابزارِ
     سنجش را قرض می‌گیرد و ابزارِ سنجش، می‌سنجد. */
  const iArgs = vb.indexOf('args = ["python3", "tools/voicelab.py"');
  const argBlk = iArgs > 0 ? vb.slice(iArgs, vb.indexOf(']\n', iArgs)) : '';
  ok('۱۴.۷ پل عددِ شباهت را نمی‌خواهد',
     /"--no-sim"/.test(argBlk),
     'وگرنه هر اجرا چند دقیقه کارِ بی‌مصرف بینِ تبدیل و ثبت می‌گذارد');
  /* و مرزش: بی عددِ شباهت «بهترین» تعریف نشده، پس چند ترکیب یعنی
     انتخابِ خاموشِ اولی. این مرز **پیش از** بارگذاریِ مدل می‌ایستد — هم
     برای اینکه دو دقیقه هدر ندهد، هم چون مرزی که بی مدل اجرا شود مرزی
     است که می‌شود واقعاً آزمودش. */
  const iParse = labPy.indexOf('a = ap.parse_args()');
  const iGuard = labPy.indexOf('if a.no_sim:');
  const iDirs = labPy.indexOf('os.makedirs(a.out');
  ok('۱۴.۷-ب و مرزش بلافاصله پس از خواندنِ آرگومان‌هاست، پیش از هر کارِ سنگین',
     iParse > 0 && iGuard > iParse && iDirs > iGuard,
     'مرزی که فقط پس از نصبِ بسته و دانلودِ مدل بلند شود، هم دو دقیقه ' +
     'هدر می‌دهد و هم آزمودنش گران است');

  ok('۱۴.۶ ورودیِ بی `urls` انجام‌شده حساب نمی‌شود',
     /def done\(key\):/.test(vb) &&
     /return bool\(us\) and isinstance\(us, list\)/.test(vb) &&
     /not done\(str\(it\.get\("key"\) or ""\)\)/.test(vb) &&
     !/not in mp\["items"\]/.test(vb),
     'وگرنه خروجیِ بزرگ‌ترازِ سقف تا ابد در نقشه می‌مانَد و هیچ‌کس دوباره نمی‌سازدش');

  /* ══ ۱۴.۸ صدای کلون‌شده عمومی نمی‌مانَد ══
     `voice-lab.yml` از روزِ اول Release را رد کرده و دلیلش را نوشته:
     «این ریپو عمومی است و خروجیِ این آزمایش، صدای کلون‌شدهٔ یک شخصِ
     حقیقی است … لینکی که عمومی شد، فردا بهترش می‌کنیم ندارد». و پل
     دقیقاً همان کار را می‌کرد، با **کلِ قسمت**. دو بخشِ یک مخزن دربارهٔ
     یک چیز دو حکم داشتند و کسی با هم ندیده بودشان.
     Release تنها راهِ برداشتنِ فایل است (artifact از بیرونِ Actions
     دانلود نمی‌شود)، پس مثل اشتراکِ موقتِ درایو: باز می‌شود، استفاده
     می‌شود، و پس گرفته می‌شود. */
  ok('۱۴.۸ فایلِ برداشته‌شده از Release پاک می‌شود',
     /def dropCollected\(/.test(vb) && /"-X", "DELETE"/.test(vb) &&
     /dropCollected\(ensureRelease\(\), q, mp\)/.test(vb),
     'وگرنه صدای کلون‌شدهٔ یک شخصِ حقیقی برای همیشه عمومی می‌مانَد');
  /* و ملاکش وضعیتِ «رسید» است، نه گذشتِ زمان: فایلی که هنوز برداشته
     نشده اگر پاک شود، قسمت برای همیشه می‌رود — و نقشه هم می‌گوید
     «انجام شد»، پس دوباره ساخته نمی‌شود. */
  ok('۱۴.۸-ب و ملاکش «رسید» است، نه زمان',
     /== "رسید"/.test(vb) && !/days|timedelta/.test(vb.split('def dropCollected')[1].split('def ')[0]),
     'زمان‌محور بودنش یعنی حذفِ چیزی که هنوز لازم است');
  /* و پیش از کارِ تازه اجرا می‌شود و بی‌قید — وگرنه روزی که صف خالی
     است، فایلِ عمومی هم پاک نمی‌شود. */
  /* ══ داخلِ بدنهٔ `main` سنجیده می‌شود، نه در کلِ فایل ══
     تا ۷٫۷۷ اینجا `todo = [it for it` را در کلِ فایل می‌گشت. وقتی آن
     شرط به `pending()` منتقل شد — که **بالای** `main` تعریف می‌شود —
     سنجه روی کدِ درست قرمز شد. ادعا دربارهٔ **ترتیبِ اجرا** است، پس
     باید در همان بدنه‌ای خوانده شود که اجرا می‌کند. */
  const mainBody = vb.slice(vb.indexOf('\ndef main():'));
  const iDrop = mainBody.indexOf('dropCollected(ensureRelease()');
  const iTodo = mainBody.indexOf('todo = pending(q, mp)');
  ok('۱۴.۸-پ و پیش از انتخابِ کارِ تازه، بی‌قید',
     iDrop > 0 && iTodo > iDrop,
     'بعدِ `if not todo: return` یعنی روزِ خلوت پاک‌سازی نمی‌شود · ' +
     'drop@' + iDrop + ' todo@' + iTodo);

  ok('۱۴.۵ و `seconds` هم در نقشه می‌آید',
     /"seconds": round\(outSec/.test(vb),
     'تا ۷٫۶۵ نوشته نمی‌شد، پس ستونِ «ثانیه»ی کارنامه همیشه خالی بود');
}

console.log('\n══ ۱۵) ادعایی که `.gitignore` هرگز نگذاشت درست باشد (۷٫۷۴) ══');
/* صاحبِ برنامه پرسید «چرا نمونهٔ گلدوز را مثلِ رضوی نفرستادی تست بزنم؟».
   جواب: `docs/voices.json` دو فایل را ادعا می‌کرد
   (`docs/voice-samples/spk-1g0r95d/…`) و **هیچ‌کدام در ریپو نبودند** —
   `.gitignore` خطِ `*.wav` دارد، پس `git add docs/voice-samples/$KEY` هیچ‌چیز
   stage نمی‌کرد و `|| true` همان سکوت را می‌خرید. موتور هر بار ۴۰۴ می‌گرفت و
   در یک `catch` خالی رد می‌شد.

   و کامیت کردنشان راهِ حل **نیست**: `voice-lab.yml` از روزِ اول همین را رد
   کرده، چون این ریپو عمومی است و خروجی صدای کلون‌شدهٔ یک شخصِ حقیقی است.
   دو بخش از یک ریپو دو حکمِ مخالف داشتند و کسی کنارِ هم نگذاشته بودشان
   (۷٫۳۲). پس ادعا برداشته شد، نه حکم. */
{
  const gi = fs.readFileSync('.gitignore', 'utf8');
  ok('۱۵.۱ `.gitignore` هنوز `*.wav` را می‌بندد — این مبنای بقیهٔ این بند است',
     /^\*\.wav\s*$/m.test(gi),
     'اگر روزی برداشته شود، نمونه‌ها **عمومی** می‌شوند و حکمِ voice-lab نقض است');
  ok('۱۵.۲ گردش‌کار پوشهٔ نمونه‌ها را کامیت نمی‌کند',
     !/git add[^\n]*voice-samples/.test(wf),
     'وگرنه یا هیچ‌چیز stage نمی‌شود (و ادعا دروغ می‌مانَد) یا صدای کلون‌شدهٔ ' +
     'یک شخص در ریپوی عمومی منتشر می‌شود');
  ok('۱۵.۳ و به‌جایش artifactِ کوتاه‌مدت می‌گذارد',
     /name: voice-samples-/.test(wf) && /retention-days: 1/.test(wf),
     'artifact از بیرونِ Actions دانلود نمی‌شود، پس همان‌جا می‌مانَد');
  ok('۱۵.۴ و `--record` مسیرِ ریپو را در voices.json نمی‌نویسد',
     !/docs\/voice-samples\/%s\/%s/.test(py) && /record\(key, sim, \[\], note/.test(py),
     'مسیری که هرگز در ریپو نمی‌نشیند، ادعا است نه داده');
  /* و خودِ فایلِ حال: هر مسیری که ادعا شده باید واقعاً در ریپو باشد. این
     سنجه از خودِ داده می‌پرسد، نه از کد — چون کدِ درست با دادهٔ کهنه هم
     سبز می‌مانَد. */
  const vj = JSON.parse(fs.readFileSync('docs/voices.json', 'utf8'));
  const missing = [];
  Object.keys(vj.speakers || {}).forEach((k) => {
    ((vj.speakers[k] || {}).samples || []).forEach((rel) => {
      if (!fs.existsSync(rel)) missing.push(k + ' → ' + rel);
    });
  });
  ok('۱۵.۵ و هیچ نمونه‌ای ادعا نشده که در ریپو نباشد',
     missing.length === 0,
     'گم‌شده: ' + JSON.stringify(missing) +
     ' — موتور این‌ها را از GitHub raw می‌خواهد و ۴۰۴ می‌گیرد، بی‌صدا');
}

const vbSrc = fs.readFileSync('tools/voicebridge.py', 'utf8');
console.log('\n══ ۱۶) نامِ دارایی باید ASCII باشد — یک اجرای واقعی ثابتش کرد (۲۸ سپتامبر) ══');
/* اجرای ۲۶ِ voice-bridge، ۲۷ سپتامبر ۱۶:۵۳ UTC: تبدیل **کامل شد** (۲۶۱
   ثانیه خروجی، ۲۸۰ ثانیه کارِ رانر) و بعد آپلود با

       curl: (3) URL rejected: Malformed input to a URL function

   مُرد، چون نامِ دارایی «نمونهٔ روح — razavi-53.wav» بود و خام در نشانی
   نشسته بود. تا ۷٫۷۳ هر کلیدی `special:49` بود — لاتین — و این در هیچ
   اجرایی دیده نشده بود. کلِ هزینهٔ رانر خرج شد و چیزی ننشست. */
{
  const call = (k, i, n) => cp.spawnSync('python3', ['-c',
    'import sys;sys.dont_write_bytecode=True;sys.path.insert(0,"tools");' +
    'import voicebridge as V;print(V.assetName(sys.argv[1],int(sys.argv[2]),int(sys.argv[3])))',
    k, String(i), String(n)], { encoding: 'utf8' }).stdout.trim();

  const a = call('نمونهٔ روح — razavi:53', 0, 1);
  ok('۱۶.۱ کلیدِ فارسی، نامِ ASCII می‌دهد',
     /^[\x20-\x7e]+$/.test(a) && a.indexOf(' ') === -1 && /\.wav$/.test(a),
     'گرفت: ' + a + ' — نامِ غیرِASCII خام در نشانی یعنی curl ردش می‌کند');

  /* و هش تزئین نیست: دو کلیدِ فارسیِ متفاوت می‌توانند به یک اسلاگ برسند،
     و `uploadAsset` هم‌نام را **پاک می‌کند** تا تازه را بگذارد — یعنی
     نمونهٔ یک گوینده بی‌صدا جای دیگری را می‌گیرد. */
  const b = call('نمونهٔ دیگر — razavi:53', 0, 1);
  ok('۱۶.۲ دو کلیدِ متفاوت که اسلاگشان یکی است، نامِ یکی نمی‌گیرند',
     a !== b,
     'اولی: ' + a + ' · دومی: ' + b +
     ' — یکی بودن یعنی آپلودِ دومی اولی را پاک می‌کند');

  const p1 = call('special:49', 0, 2), p2 = call('special:49', 1, 2);
  ok('۱۶.۳ و شمارهٔ تکه‌ها سرِ جایش می‌مانَد',
     /-1of2\.wav$/.test(p1) && /-2of2\.wav$/.test(p2) && p1 !== p2,
     p1 + ' · ' + p2);

  /* و کسی دوباره نامِ خام را در نشانی نگذارد. */
  ok('۱۶.۴ نامِ دارایی از `assetName` می‌آید، نه از خودِ کلید',
     /nm = assetName\(key, i, len\(pieces\)\)/.test(vbSrc) &&
     !/base = key\.replace/.test(vbSrc),
     'ساختنِ نام از `key` در جای دیگر یعنی همان باگ از درِ دیگر');
}

console.log('\n══ ۱۷) نامی که تعریف نشده، تا لحظهٔ آخرِ کار سکوت می‌کند (۲۸ سپتامبر) ══');
/* ══ چرا این بند هست ══
   اجرای ۲۷ِ voice-bridge دقیقاً همان کاری را کرد که ۲۶ کرده بود: ۲۳۵
   ثانیه تبدیل، خروجیِ کامل، آپلودِ موفق روی release — و بعد، در
   **آخرین خطِ** `main`، `NameError: name 'base' is not defined` و
   خروج با ۱. نقشه ذخیره شده بود ولی کدِ خروج ۱ بود، پس مرحلهٔ ثبت
   هرگز اجرا نشد و از بیرون «شکست» دیده شد.

   علتش تعمیرِ خودِ من در ۷٫۷۷ بود: `base` را با `nm` جایگزین کردم و
   یک مصرف‌کنندهٔ `base` هفت خط پایین‌تر جا ماند. بند ۱۶ `assetName` را
   **جداگانه** صدا می‌زند، پس هر چهار سنجه‌اش سبز بودند در حالی که
   `main` روی خطِ آخر می‌مُرد. سنجه‌ای که تابع را تنها امتحان کند،
   تابع را ثابت می‌کند نه مسیر را.

   و `py_compile` این را نمی‌گیرد — NameError خطای زمانِ اجراست. تنها
   چیزی که می‌گیردش خواندنِ جدولِ نمادهاست: نامی که در تابع بار می‌شود،
   در آن تابع تعریف نشده، در سطحِ ماژول هم نیست و builtin هم نیست. */
{
  const scan = [
    'import sys, io, symtable, builtins',
    'D=set("__file__ __name__ __doc__ __spec__ __loader__ __package__ __builtins__ __debug__".split())',
    'def g(t):',
    '    o=set(D)',
    '    for s in t.get_symbols():',
    '        if s.is_assigned() or s.is_imported() or s.is_parameter(): o.add(s.get_name())',
    '    for c in t.get_children(): o.add(c.get_name())',
    '    return o',
    'def w(t,gg,path,bad):',
    '    for s in t.get_symbols():',
    '        n=s.get_name()',
    '        if s.is_global() and s.is_referenced() and n not in gg and not hasattr(builtins,n):',
    '            bad.append("%s :: %s -> %s"%(t2,path,n))',
    '    for c in t.get_children(): w(c,gg,path+"."+c.get_name(),bad)',
    'bad=[]',
    'for t2 in sys.argv[1:]:',
    '    src=io.open(t2,encoding="utf-8").read()',
    '    top=symtable.symtable(src,t2,"exec")',
    '    gg=g(top)',
    '    for c in top.get_children(): w(c,gg,c.get_name(),bad)',
    'print("\\n".join(bad))'
  ].join('\n');

  const pys = fs.readdirSync('tools').filter(f => /\.py$/.test(f))
                .map(f => 'tools/' + f).sort();
  const run = () => cp.spawnSync('python3', ['-c', scan].concat(pys),
                                 { encoding: 'utf8' });
  const r = run();

  ok('۱۷.۱ جدولِ نمادها خوانده شد',
     r.status === 0, 'stderr: ' + String(r.stderr).slice(0, 300));

  const found = String(r.stdout).trim();
  ok('۱۷.۲ هیچ نامِ تعریف‌نشده‌ای در `tools/*.py` نمانده — ' +
     pys.length + ' فایل',
     found === '',
     'پیدا شد:\n' + found +
     '\n(اجرای ۲۷ همین بود: کلِ کار انجام شد و خطِ آخر افتاد)');

  /* ══ و نیمهٔ دومِ همان اجرا ══
     نقشه **نوشته شده بود** — `saveMap` یک خط پیش از خطِ افتاده صدا
     خورده. ولی کدِ خروج ۱ شد و مرحلهٔ ثبت در ریپو به‌کل اجرا نشد، پس
     ۲۳۵ ثانیه تبدیل و یک دارایی روی release دور ریخته شد و موتور چیزی
     برای برداشتن نداشت. تنزل به سمتِ کامل بودن، نه به سمتِ سکوت. */
  const wf = fs.readFileSync('.github/workflows/voice-bridge.yml', 'utf8');
  const idx = wf.indexOf('ثبتِ نقشه در ریپو');
  ok('۱۷.۳ مرحلهٔ ثبتِ نقشه با `always()` می‌دوَد',
     idx > 0 && /^\s*if:\s*always\(\)\s*$/m
       .test(wf.slice(idx, wf.indexOf('run: |', idx))),
     'بی این، هر افتادنِ پایتون کلِ کارِ تمام‌شده را دور می‌ریزد');
}

console.log('\n══ ۱۸) یک اجرا کلِ صف را می‌بَرد، با بودجهٔ ساعتی (۲۸ سپتامبر) ══');
/* ══ چرا این بند هست ══
   سقفِ «یکی در هر اجرا» برای قسمتِ نوزده‌دقیقه‌ایِ کامل بسته شده بود
   (~۲۵ دقیقه رانر) و هیچ‌وقت برای نمونهٔ چهاردقیقه‌ایِ «رنگ و روح»
   بازنگری نشد. صاحبِ برنامه دو گوینده را تیک زد و هزینه‌اش را داد: دو
   اجرا لازم بود، و با cronِ شش‌ساعته تا ۱۲ ساعت انتظار برای دو فایلِ
   چهاردقیقه‌ای. «چند ساعت» حتی بی هیچ باگی غلط بود.

   نگرانیِ اصلیِ آن سقف — «jobـِ کشته‌شده سرِ سقف هیچ خروجی‌ای نمی‌دهد،
   حتی برای آن یکی که تمام شده بود» — درست بود و جوابش جای دیگری است:
   نقشه پس از هر ردیف ذخیره می‌شود و مرحلهٔ ثبتش `if: always()` دارد. */
{
  const vb = fs.readFileSync('tools/voicebridge.py', 'utf8');
  const wf = fs.readFileSync('.github/workflows/voice-bridge.yml', 'utf8');

  /* ══ حسابِ دو عددی که در دو فایلِ مختلف زندگی می‌کنند (۷٫۳۰/۷٫۳۱) ══
     بودجه در پایتون است و سقفِ job در YAML. هیچ آزمونی روی *تابع* این را
     پیدا نمی‌کند، چون هر دو تابع درست‌اند — رابطهٔ دو ثابت غلط می‌شود. */
  const INSTALL_MIN = 10;   // نصبِ torch/RVC، اندازه‌گیری‌شده ~۵ تا ۸ دقیقه
  const LONGEST_MIN = 30;   // قسمتِ نوزده‌دقیقه‌ای × ضریبِ ۱٫۴ + سرِ کار
  const bud = Number((vb.match(/VBR_RUN_BUDGET_MIN"\) or "(\d+(?:\.\d+)?)"/) ||
                      [])[1]);
  const tmo = Number((wf.match(/timeout-minutes:\s*(\d+)/) || [])[1]);
  ok('۱۸.۱ نصب + بودجه + بلندترین ردیف ≤ سقفِ زمانیِ job',
     bud > 0 && tmo > 0 && INSTALL_MIN + bud + LONGEST_MIN <= tmo,
     'بودجه=' + bud + ' · سقف=' + tmo + ' · ' + INSTALL_MIN + '+' + bud +
     '+' + LONGEST_MIN + '=' + (INSTALL_MIN + bud + LONGEST_MIN) +
     ' — jobی که سرِ سقف کشته شود ردیفِ نیمه‌کاره را هم می‌بَرد');

  /* ══ و حالا خودِ حلقه، اجرا شده نه خوانده ══
     `main` با بدَل‌های ماژول صدا زده می‌شود و `runOne` شمرده می‌شود.
     خواندنِ متنِ کد یک لایه بالاتر از خرابی می‌ایستد (۷٫۴۳/۷٫۴۴). */
  const drive = (rows, extra) => {
    const py = [
      'import sys, os, io, json',
      'sys.dont_write_bytecode = True',
      'sys.path.insert(0, "tools")',
      'import voicebridge as V',
      'ROWS = json.loads(sys.argv[1])',
      'Q = {"rev": 3, "items": ROWS}',
      'V.fetchQueue = lambda fid: Q',
      'V.loadMap = lambda: {"items": {}}',
      'V.saveMap = lambda d: None',
      'V.ensureRelease = lambda: "rel"',
      'CALLS = []',
      'DROPS = []',
      'V.dropCollected = lambda rel, q, mp: DROPS.append(1)',
      'SEEN = []',
      'def fake(it, mp):',
      '    CALLS.append(str(it.get("key")))',
      '    SEEN.append(sorted(os.listdir("vblab")) if os.path.isdir("vblab") else None)',
      '    os.makedirs("vblab", exist_ok=True)',
      '    io.open("vblab/rvc-leak-" + str(it.get("key")) + ".wav", "w").write("x")',
      '    return 1 if it.get("boom") else 0',
      'V.runOne = fake',
      (extra || ''),
      'os.environ["VBR_QUEUE_ID"] = "x"',
      'rc = V.main()',
      'print(json.dumps({"rc": rc, "calls": CALLS, "seen": SEEN,',
      '                  "drops": len(DROPS)}, ensure_ascii=False))'
    ].join('\n');
    const r = cp.spawnSync('python3', ['-c', py, JSON.stringify(rows)],
                           { encoding: 'utf8' });
    const lines = String(r.stdout).trim().split('\n');
    try { return JSON.parse(lines[lines.length - 1]); }
    catch (e) { return { err: String(r.stderr).slice(0, 400) + '|' + r.stdout }; }
  };

  const row = (k, boom) => ({
    key: k, status: 'در انتظار', speaker: 'sp',
    audio: [{ url: 'u', name: 'n' }], model: { pth: 'p' },
    boom: !!boom
  });

  const two = drive([row('a'), row('b')]);
  ok('۱۸.۲ دو ردیف در یک اجرا تبدیل می‌شوند',
     JSON.stringify(two.calls) === JSON.stringify(['a', 'b']) && two.rc === 0,
     'گرفت: ' + JSON.stringify(two) +
     ' — «یکی در هر اجرا» یعنی دو تیک، دو اجرا، و با cron یعنی ساعت‌ها');

  /* ردیفِ دوم نباید خروجیِ ردیفِ اول را ببیند: `vblab` را با `rvc-*.wav`
     می‌گردیم و **بزرگ‌ترین** را برمی‌داریم، پس مانده‌ای از ردیفِ پیش یعنی
     صوتِ گویندهٔ اول به نامِ گویندهٔ دوم آپلود می‌شود — بی خطا، فقط با گوش
     شنیدنی. همان شکلِ `dsSig_`. */
  ok('۱۸.۳ ردیفِ دوم هیچ فایلی از ردیفِ اول نمی‌بیند',
     JSON.stringify(two.seen) === JSON.stringify([null, null]) ||
     (two.seen && two.seen.length === 2 &&
      (two.seen[1] === null || two.seen[1].length === 0)),
     'گرفت: ' + JSON.stringify(two.seen) +
     ' — مانده‌ای در vblab یعنی صوتِ یک گوینده به نامِ دیگری منتشر می‌شود');

  const bad = drive([row('a', true), row('b')]);
  ok('۱۸.۴ یک ردیفِ خراب، ردیفِ سالمِ بعدی را با خودش نمی‌بَرد',
     JSON.stringify(bad.calls) === JSON.stringify(['a', 'b']) && bad.rc === 1,
     'گرفت: ' + JSON.stringify(bad) +
     ' — و کدِ خروج باید ۱ بمانَد، وگرنه شکست بی‌صدا می‌شود');

  /* بودجهٔ صفر نباید یعنی «هیچ کاری نکن» — آن‌وقت یک تنظیمِ بد کلِ پل را
     خاموش می‌کند بی اینکه جایی بگوید. شرط `i > 0` همین است. */
  const zero = drive([row('a'), row('b')],
                     'os.environ["VBR_RUN_BUDGET_MIN"] = "0"');
  ok('۱۸.۵ بودجهٔ صفر هم دستِ‌کم یک ردیف را تبدیل می‌کند',
     JSON.stringify(zero.calls) === JSON.stringify(['a']),
     'گرفت: ' + JSON.stringify(zero) +
     ' — «هیچ» یعنی پل بی‌صدا خاموش، که بدتر از کند بودن است');

  /* ══ probe: پرسش، نه کار ══ */
  const probe = (rows, extra) => {
    const py = [
      'import sys, os, io, json',
      'sys.dont_write_bytecode = True',
      'sys.path.insert(0, "tools")',
      'import voicebridge as V',
      'Q = {"rev": 3, "items": json.loads(sys.argv[1])}',
      'V.fetchQueue = lambda fid: Q',
      'V.loadMap = lambda: {"items": {}}',
      'DROPS = []',
      'V.dropCollected = lambda rel, q, mp: DROPS.append(1)',
      'V.runOne = lambda it, mp: 0',
      (extra || ''),
      'os.environ["VBR_QUEUE_ID"] = "x"',
      'os.environ.pop("GITHUB_OUTPUT", None)',
      'sys.argv = ["voicebridge.py", "--probe"]',
      'import contextlib',
      'buf = io.StringIO()',
      'with contextlib.redirect_stdout(buf): rc = V.main()',
      'sys.stderr.write(json.dumps({"rc": rc, "out": buf.getvalue(),',
      '                             "drops": len(DROPS)}, ensure_ascii=False))'
    ].join('\n');
    const r = cp.spawnSync('python3', ['-c', py, JSON.stringify(rows)],
                           { encoding: 'utf8' });
    try { return JSON.parse(String(r.stderr).trim().split('\n').pop()); }
    catch (e) { return { err: String(r.stderr).slice(0, 400) }; }
  };

  const pYes = probe([row('a')]), pNo = probe([]);
  ok('۱۸.۶ `--probe` کارِ موجود را «yes» و صفِ خالی را «no» می‌گوید',
     /work=yes/.test(String(pYes.out)) && /work=no/.test(String(pNo.out)) &&
     pYes.rc === 0 && pNo.rc === 0,
     'با کار: ' + JSON.stringify(pYes) + ' · بی کار: ' + JSON.stringify(pNo));

  ok('۱۸.۷ و probe هیچ‌چیز پاک نمی‌کند',
     pYes.drops === 0 && pNo.drops === 0,
     'گرفت: ' + pYes.drops + '/' + pNo.drops +
     ' — پرسشی که چیزی پاک کند پرسش نیست');

  /* ══ یک تعریفِ «کاری هست»، نه دو ══
     و این را **رفتاری** می‌سنجیم نه با شمردنِ فراخوانی در متنِ کد: نسخهٔ
     اولِ همین سنجه `pending(q, mp)` را می‌شمرد و عددش ۳ شد، چون خطِ
     `def pending(q, mp):` هم با همان الگو می‌خوانَد. سنجه‌ای که به الگوی
     نویسنده‌اش جواب بدهد، حافظهٔ نویسنده را می‌سنجد نه کد را (۷٫۶۹).

     ادعای واقعی این است: روی **یک** صف، probe و اجرای واقعی هم‌نظرند.
     ردیفی که جوابش در نقشه هست باید برای هر دو «کاری نیست» باشد. */
  const answered = 'V.loadMap = lambda: {"items": {"a": {"urls": ["u"]}}}';
  const pDone = probe([row('a')], answered);
  const rDone = drive([row('a')], answered);
  ok('۱۸.۸ probe و اجرای واقعی روی یک صف هم‌نظرند',
     /work=no/.test(String(pDone.out)) &&
     JSON.stringify(rDone.calls) === JSON.stringify([]) && rDone.rc === 0,
     'probe: ' + JSON.stringify(pDone) + ' · اجرا: ' + JSON.stringify(rDone) +
     ' — دو تعریف یعنی روزی probe «نه» بگوید و کار باشد، یا نصبِ ' +
     'چنددقیقه‌ای برای هیچ انجام شود');


  /* ══ ۱۸.۱۰ نمونه جلوتر از قسمتِ جاروبِ خودکار (۷٫۸۶) ══
     موتور ردیف‌ها را به ترتیبِ درست می‌خواهد (۷٫۵۹/۷٫۸۲: «چیزی که خواسته
     شده نباید پشتِ قسمت‌هایی که کسی انتخابشان نکرده منتظر بماند») و این
     فایل، یک لایه آن‌طرف‌تر، به ترتیبِ ورود مصرف می‌کرد و آن چیدمان را
     باطل می‌کرد. دو قسمتِ کامل ~۵۰ دقیقه می‌بَرند، یعنی با بودجهٔ ۴۵
     دقیقه‌ای نمونه دو اجرا (چهار ساعت) عقب می‌افتد. */
  {
    const smp = { key: 'نمونهٔ روح — sp · گام -2:53', status: 'در انتظار',
                  speaker: 'sp', label: 'نمونهٔ رنگ و روح — قسمت ۵۳ · گام -2',
                  audio: [{ url: 'u', name: 'n' }], model: { pth: 'p' } };
    const ord = drive([row('special:61'), row('special:62'), smp]);
    ok('۱۸.۱۰ نمونه پیش از قسمت‌های جاروبِ خودکار تبدیل می‌شود',
       JSON.stringify(ord.calls) ===
         JSON.stringify(['نمونهٔ روح — sp · گام -2:53', 'special:61', 'special:62']),
       'گرفت: ' + JSON.stringify(ord.calls) +
       ' — نمونه برای داوریِ همین حالا ساخته شده و `VBR_REPLACE` خاموش است، ' +
       'پس دیرتر آمدنِ یک قسمت هیچ هزینه‌ای ندارد');
    /* و ترتیبِ درونِ گروه دست نمی‌خورد — وگرنه قسمت‌ها با هر مرتب‌سازی جابه‌جا
       می‌شوند و ۱۸.۲ دیگر چیزی را تضمین نمی‌کند. */
    ok('۱۸.۱۰-ب ترتیبِ درونِ هر گروه پایدار می‌مانَد',
       JSON.stringify(drive([row('b'), row('a')]).calls) ===
         JSON.stringify(['b', 'a']),
       'گرفت: ' + JSON.stringify(drive([row('b'), row('a')]).calls));
  }

  /* و نصبِ سنگین پشتِ probe، ولی خودِ برنامه **نه** — `dropCollected`
     باید هر روز بدوَد، حتی روزی که صف خالی است. */
  const gated = (wf.match(/if: steps\.probe\.outputs\.work == 'yes'/g) || []).length;
  const runIdx = wf.indexOf('تبدیل و ثبتِ نشانی');
  const runBlock = wf.slice(runIdx, wf.indexOf('- name:', runIdx + 10));
  ok('۱۸.۹ نصبِ سنگین شرطی است ولی خودِ برنامه همیشه می‌دوَد',
     gated === 2 && runIdx > 0 && runBlock.indexOf('steps.probe') === -1,
     'شرطی‌ها: ' + gated + ' — اگر خودِ برنامه هم شرطی شود، روزی که صف ' +
     'خالی است فایلِ عمومیِ برداشته‌شده پاک نمی‌شود');
}

/* ══ چرا این بند هست ══
   ۷٫۸۰ سدِ نرخِ نمونه را ساخت و آن سد **یک** فایل از هر گوینده را
   می‌سنجد (`spk.files[0]`)، در حالی که `getFiles()` هیچ ترتیبی وعده
   نمی‌دهد. تا امروز مهم نبود چون هر پوشه یک‌دست بود؛ امروز پوشهٔ گلدوز
   ۲۷ فایلِ ۱۱ کیلوهرتزی و ۳۰ فایلِ تازه را **قاتیِ هم** دارد، و آن یک
   فایل جوابِ کلِ پوشه می‌شود. هر دو جهتش غلط است: یا دیتاستی که نیمش
   باندمحدود است تأیید می‌شود، یا دیتاستی که حالا خوب است رد می‌شود.

   `tools/mp3probe.py` همان اندازه‌گیری است، روی‌درخواست و روی **همهٔ**
   فایل‌ها. و اینجا بی شبکه سنجیده می‌شود: بایت‌ها با دست ساخته می‌شوند،
   چون سنجه‌ای که به شبکه بند باشد همان سنجه‌ای است که اجرا نمی‌شود. */
console.log('\n══ ۱۹) سنجشِ کیفیتِ ضبط، بی دانلودِ کامل ══');
{
  const probe = fs.readFileSync('tools/mp3probe.py', 'utf8');
  const call = (pyBody) => cp.spawnSync('python3', ['-c', [
    'import sys, json',
    'sys.path.insert(0, "tools")',
    'import mp3probe as M',
    pyBody
  ].join('\n')], { encoding: 'utf8' });

  /* هدرِ واقعیِ فایل‌های گلدوز: MPEG2.5 · لایهٔ ۳ · ۱۶ کیلوبیت ·
     ۱۱۰۲۵ هرتز · مونو. اگر این را غلط بخوانَد، همان عددی را می‌دهد که
     ۷٫۸۰ دنبالش بود و جوابش عوضی است. */
  const mk = [
    'def hdr(ver, bri, sri, mono):',
    '    b1 = 0xE0 | (ver << 3) | (1 << 1) | 1',
    '    b2 = (bri << 4) | (sri << 2)',
    '    b3 = (3 << 6) if mono else 0',
    '    return bytes([0xFF, b1, b2, b3])',
    'id3 = b"ID3\\x03\\x00\\x00" + bytes([0,0,0,20]) + b"\\x00"*20'
  ].join('\n');

  const r1 = call(mk + '\n' + [
    'body = id3 + hdr(0, 2, 0, True) + b"\\x00"*400',
    'print(json.dumps({"id3": M.id3len_(body), "fr": M.frame_(body, M.id3len_(body))}))'
  ].join('\n'));
  const g1 = JSON.parse(String(r1.stdout).trim() || '{}');
  ok('۱۹.۱ ۱۱۰۲۵ هرتزِ واقعیِ این ضبط‌ها درست خوانده می‌شود',
     g1.fr && g1.fr.sr === 11025 && g1.fr.kbps === 16 && g1.fr.ch === 1 &&
     g1.id3 === 30,
     'گرفت: ' + JSON.stringify(g1) + ' — عددی که سد رویش تصمیم می‌گیرد');

  /* و برچسبِ ID3 باید رد شود، وگرنه بایت‌های متنِ برچسب به‌عنوان فریم
     خوانده می‌شوند. اینجا برچسب عمداً بایتی دارد که **فریمِ معتبرِ**
     ۱۱۰۲۵ هرتز است — یعنی اگر از سرِ فایل خوانده شود، جوابِ کلِ فایل
     همان می‌شود و هیچ خطایی هم نمی‌دهد.

     ══ و این سنجه با همان شکستنی قرمز می‌شود که ۱۹.۱ را قرمز می‌کند ══
     خراب کردنِ `id3len_` اول روی ۱۹.۱ می‌افتد (که خودش طولِ برچسب را
     می‌پرسد و §۱۹.۱ زودتر می‌دوَد). پس این یکی **گذرا** ثابت می‌شود، و
     همین‌جا نوشته می‌شود نه اینکه ادعا شود — قاعدهٔ ۷٫۷۴. ارزشش این است
     که حالتِ بدتر را می‌سازد: برچسبی که فریمِ معتبر در دلش دارد. */
  const r1b = call(mk + '\n' + [
    'tag = b"ID3\\x03\\x00\\x00" + bytes([0,0,0,20]) + b"\\xff\\xe3\\x20\\xc0" + b"\\x00"*16',
    'body = tag + hdr(3, 9, 0, False) + b"\\x00"*400',
    'print(json.dumps(M.frame_(body, M.id3len_(body))))'
  ].join('\n'));
  const g1b = JSON.parse(String(r1b.stdout).trim() || 'null');
  ok('۱۹.۱-ب برچسبِ ID3 رد می‌شود، حتی وقتی شبیهِ فریم است',
     g1b && g1b.sr === 44100 && g1b.kbps === 128 && g1b.ch === 2,
     'گرفت: ' + JSON.stringify(g1b) +
     ' — بی این، بایتِ اولِ برچسب جوابِ کلِ فایل می‌شود');

  /* مدت از اندازهٔ کل حساب می‌شود، نه از آنچه دانلود شد — چون فقط سرِ
     فایل خوانده می‌شود. یک فایلِ هفت‌مگابایتیِ ۱۶ کیلوبیتی ~۶۰ دقیقه
     است؛ اگر اشتباهاً ۱۲۸ فرض شود ~۷ دقیقه درمی‌آید، همان خطای هفت
     برابری که ۷٫۸۰ ثبت کرد. */
  const r2 = call(mk + '\n' + [
    'body = id3 + hdr(0, 2, 0, True) + b"\\x00"*400',
    'M.head_ = lambda url, nbytes=0: (body, 7209819, "")',
    'print(json.dumps(M.probe("X")))'
  ].join('\n'));
  const g2 = JSON.parse(String(r2.stdout).trim() || '{}');
  ok('۱۹.۲ مدت از اندازهٔ کل می‌آید، نه از بایت‌های خوانده‌شده',
     g2.ok === true && g2.minutes > 55 && g2.minutes < 65,
     'گرفت: ' + JSON.stringify(g2) +
     ' — ۱۲۸ فرض کردن همان تخمینِ هفت‌برابر غلط است');

  /* ══ و صفحهٔ HTML صفر هرتز نیست ══
     درایو به درخواستِ یک فایلِ بسته صفحهٔ HTML می‌دهد نه ۴۰۳ (۷٫۳۳).
     اگر این حالت «ok با صفر هرتز» شود، سدِ نرخِ نمونه روی عددی تصمیم
     می‌گیرد که اندازهٔ هیچ‌چیز نیست. */
  const r3 = call([
    'M.head_ = lambda url, nbytes=0: (b"<!DOCTYPE html><html><head>", 9999, "")',
    'print(json.dumps(M.probe("X")))'
  ].join('\n'));
  const g3 = JSON.parse(String(r3.stdout).trim() || '{}');
  /* ══ و آنچه این سنجه واقعاً تضمین می‌کند، **دلیل** است ══
     بی این سد هم جواب `ok:false` می‌مانَد (فریمی پیدا نمی‌شود)، پس
     «سنجیده نشد» هر دو طرف برقرار است. آنچه عوض می‌شود دلیل است:
     «فریمِ MPEG پیدا نشد» کاری دستِ کسی نمی‌دهد، «عمومی نیست» می‌دهد.
     عنوان همین را می‌گوید، نه بیشتر — ۷٫۷۱: سنجه‌ای که بارش را ندارد
     باید برچسبش عوض شود، نه نگه داشته شود. */
  ok('۱۹.۳ فایلِ غیرعمومی با دلیلِ درست رد می‌شود، نه با «فریم پیدا نشد»',
     g3.ok === false && !g3.sr && /عمومی نیست/.test(String(g3.why || '')),
     'گرفت: ' + JSON.stringify(g3));

  /* و یک فایلِ رسیده که فریم ندارد هم همان‌طور — بی این، هر بایتی که
     برسد «سنجیده شد» حساب می‌شود. */
  const r3b = call([
    'M.head_ = lambda url, nbytes=0: (b"\\x00"*2000, 2000, "")',
    'print(json.dumps(M.probe("X")))'
  ].join('\n'));
  const g3b = JSON.parse(String(r3b.stdout).trim() || '{}');
  ok('۱۹.۳-ب بایتی که فریمِ MPEG ندارد هم سنجیده‌نشده است',
     g3b.ok === false && /فریم/.test(String(g3b.why || '')),
     'گرفت: ' + JSON.stringify(g3b));

  /* شناسه از نشانیِ کاملِ درایو هم درمی‌آید و تکراری دو بار سنجیده
     نمی‌شود — ۳۰ فایل با دست کپی می‌شوند و تکرار حالتِ عادی است. */
  const r4 = call([
    'ids = M.ids_(["1vK8dhhNgNATGAKQSTbVkIannxi3McKtx, ' +
      'https://drive.google.com/file/d/1aq3s1qSj-cmCGENtJVSW-5QawkHMdHT7/view",',
    '               "1vK8dhhNgNATGAKQSTbVkIannxi3McKtx", "short"])',
    'print(json.dumps(ids))'
  ].join('\n'));
  const g4 = JSON.parse(String(r4.stdout).trim() || '[]');
  ok('۱۹.۴ شناسه از نشانی درمی‌آید و تکراری یک بار سنجیده می‌شود',
     g4.length === 2 && g4[0] === '1vK8dhhNgNATGAKQSTbVkIannxi3McKtx' &&
     g4[1] === '1aq3s1qSj-cmCGENtJVSW-5QawkHMdHT7',
     'گرفت: ' + JSON.stringify(g4));

  /* ══ و مرزِ میان‌فایلی ══
     گردش‌کار ورودی‌اش را باید به همان متغیری بدهد که ابزار می‌خوانَد.
     یک نامِ ناهم‌خوان یعنی اجرا سبز می‌شود و «هیچ شناسه‌ای داده نشد»
     می‌گوید — همان شکلِ دکمه‌ای که کاری نمی‌کند. */
  const apw = fs.readFileSync('.github/workflows/audio-probe.yml', 'utf8');
  const envName = (probe.match(/environ\.get\("([A-Z0-9_]+)"\)/) || [])[1];
  ok('۱۹.۵ گردش‌کار ورودی را به همان متغیرِ ابزار می‌دهد',
     !!envName && new RegExp('^\\s*' + envName + ':\\s*\\$\\{\\{\\s*inputs\\.ids',
                            'm').test(apw),
     'متغیرِ ابزار: ' + String(envName) +
     ' — نامِ ناهم‌خوان یعنی اجرای سبز با صفر فایلِ سنجیده');

  /* و این گردش‌کار نباید هیچ آموزشی راه بیندازد: سدی که پیش از کار
     می‌نشیند خودش نباید ~۲۰ ساعت پردازنده باشد (۷٫۷۵). */
  /* و **بی توضیح‌ها** سنجیده می‌شود: توضیحِ همین فایل نامِ
     `voice-intake` را دارد، و سنجه‌ای که متنِ توضیح را بخوانَد چیزِ
     دیگری را می‌سنجد — همان `|| echo`ی که یک بار داخلِ کامنت پیدا شد. */
  const apwCode = apw.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  ok('۱۹.۶ سنجش هیچ آموزشی راه نمی‌اندازد و چیزی نصب نمی‌کند',
     apwCode.indexOf('voicetrain') === -1 &&
     apwCode.indexOf('voiceintake') === -1 &&
     apwCode.indexOf('pip install') === -1 &&
     apwCode.indexOf('schedule:') === -1,
     'اگر سنجش گران شود، همان کاری نمی‌شود که برایش ساخته شد');
}


/* ══ چرا این بند هست ══
   طرحِ `docs/lesson_visuals_plan.md` دو لایهٔ مجانی دارد و لایهٔ دومش
   (عکس و ویدئوی با مجوزِ آزاد) به منابعی تکیه می‌کند که **از کانتینرِ
   کلاد سنجیدنی نیستند** — پروکسی commons/openverse/archive را با ۴۰۳ روی
   CONNECT می‌بندد. پس سنجش روی رانر انجام می‌شود، و این‌جا خودِ *ابزارِ
   سنجش* بی شبکه سنجیده می‌شود: بایت‌ها با دست ساخته می‌شوند، چون سنجه‌ای
   که به شبکه بند باشد همان سنجه‌ای است که اجرا نمی‌شود (۱۹ یک بند بالاتر).

   و چیزی که این بند واقعاً نگه می‌دارد، یک قاعدهٔ بخشِ ۲۳ است: **نامزد
   باید پیش از دانلود رد شود.** آرشیو برای موسیقی فقط به همین دلیل انتخاب
   شد. اگر روزی جست‌وجو مجوز یا قالب یا اندازه را نپرسد، لایهٔ دوم
   بی‌آنکه خطایی بدهد به «دانلود کن تا ببینی» برمی‌گردد — و آن، همان
   MP3ی است که بانکِ موسیقی را پر کرد. */
console.log('\n══ ۲۰) سنجشِ منابعِ تصویرِ آزاد، بی شبکه ══');
{
  const vp = fs.readFileSync('tools/visprobe.py', 'utf8');
  const vcall = (pyBody) => cp.spawnSync('python3', ['-c', [
    'import sys, json',
    'sys.path.insert(0, "tools")',
    'import visprobe as V',
    pyBody
  ].join('\n')], { encoding: 'utf8' });

  /* ۲۰.۱ — بایت‌ها، نه پسوند و نه Content-Type. درایو و هر سرورِ دیگری
     برای فایلی که نمی‌دهد **صفحهٔ HTML با کدِ ۲۰۰** می‌فرستد؛ اگر آن
     «ناشناخته» شمرده شود، دلیلِ ردّ غلط گزارش می‌شود (۷٫۳۳/۱۹.۳). */
  const r1 = vcall([
    'cases = {',
    '  "png":  b"\\x89PNG\\r\\n\\x1a\\n" + b"\\x00"*20,',
    '  "jpeg": b"\\xff\\xd8\\xff\\xe0" + b"\\x00"*20,',
    '  "gif":  b"GIF89a" + b"\\x00"*20,',
    '  "html": b"<!DOCTYPE html><html><body>Sign in" + b" "*20,',
    '  "junk": b"\\x01\\x02\\x03\\x04junk-not-media-at-all",',
    '}',
    'print(json.dumps({k: V.sniff(v) for k, v in cases.items()}))'
  ].join('\n'));
  const g1 = JSON.parse(String(r1.stdout).trim() || '{}');
  ok('۲۰.۱ قالب از سرآیندِ بایت‌ها درمی‌آید، و صفحهٔ HTML به نامِ خودش رد می‌شود',
     g1.png === 'PNG' && g1.jpeg === 'JPEG' && g1.gif === 'GIF' &&
     /HTML/.test(String(g1.html)) && g1.junk === 'ناشناخته',
     'گرفت: ' + JSON.stringify(g1) + ' — «ناشناخته» برای یک صفحهٔ ورود، ' +
     'دلیلِ ردِّ غلط است و همان اشتباهی که ۷٫۳۳ سه شب پنهان ماند');

  /* ۲۰.۱-ب — WEBP و MP4 چهار بایتِ اولشان **طول/RIFF** است، نه امضا. یک
     تطبیقِ سادهٔ پیشوندی هر دو را از دست می‌دهد و آن‌ها را «ناشناخته»
     می‌خوانَد، یعنی دو قالبِ کاملاً سالم رد می‌شوند. */
  const r2 = vcall([
    'webp = b"RIFF" + b"\\x24\\x00\\x00\\x00" + b"WEBP" + b"VP8 " + b"\\x00"*8',
    'mp4  = b"\\x00\\x00\\x00\\x20" + b"ftyp" + b"isom" + b"\\x00"*12',
    'mkv  = b"\\x1a\\x45\\xdf\\xa3" + b"\\x00"*20',
    'print(json.dumps({"webp": V.sniff(webp), "mp4": V.sniff(mp4), "mkv": V.sniff(mkv)}))'
  ].join('\n'));
  const g2 = JSON.parse(String(r2.stdout).trim() || '{}');
  ok('۲۰.۱-ب امضای WEBP و MP4 در جای خودشان خوانده می‌شود، نه سرِ فایل',
     g2.webp === 'WEBP' && /ISO-BMFF/.test(String(g2.mp4)) &&
     /Matroska/.test(String(g2.mkv)),
     'گرفت: ' + JSON.stringify(g2) + ' — این دو قالب، اگر پیشوندی سنجیده ' +
     'شوند، سالم‌اند و رد می‌شوند');

  /* ۲۰.۲ — **قلبِ این ابزار.** جست‌وجو باید مجوز و قالب و اندازه را در
     همان درخواست بپرسد. اگر یکی‌شان نباشد، «ردّ پیش از دانلود» ممکن
     نیست و لایهٔ دوم بی هیچ خطایی به «بردار تا ببینی» سقوط می‌کند. */
  const iip = (vp.match(/'iiprop':\s*'([^']+)'/) || [])[1] || '';
  ok('۲۰.۲ جست‌وجوی کامنز مجوز و قالب و اندازه را پیش از دانلود می‌خواهد',
     /extmetadata/.test(iip) && /\bmime\b/.test(iip) && /\bsize\b/.test(iip) &&
     /iiextmetadatafilter/.test(vp) && /LicenseShortName/.test(vp),
     'iiprop = ' + JSON.stringify(iip) + ' — بی این سه، ردِّ پیش از دانلود ' +
     'ناممکن است و همان راهی می‌شود که بخشِ ۲۳ عمداً نرفت');

  /* ۲۰.۳ — تصویرِ اندازه‌شده خواسته می‌شود، نه فایلِ اصلی. یک عکسِ کامنز
     می‌تواند ۴۰ مگابایت باشد؛ ما ۱۹۲۰ پیکسل می‌خواهیم. */
  ok('۲۰.۳ نسخهٔ اندازه‌شده خواسته می‌شود، نه فایلِ اصلیِ چندمگابایتی',
     /'iiurlwidth':\s*'1920'/.test(vp) && /thumburl/.test(vp),
     'بی iiurlwidth، هر نامزد فایلِ اصلی است و سقفِ دانلود را می‌خورد');

  /* ۲۰.۴ — همان شکلِ ۱۹.۵: نامِ متغیر اگر نخوانَد، اجرا سبز می‌شود و
     پرسشِ پیش‌فرض سنجیده می‌شود، یعنی نتیجه به پرسشِ ما ربطی ندارد. */
  const vpw = fs.readFileSync('.github/workflows/vis-probe.yml', 'utf8');
  const vEnv = (vp.match(/environ\.get\(['"]([A-Z0-9_]+)['"]/) || [])[1];
  ok('۲۰.۴ گردش‌کار ورودی را به همان متغیرِ ابزار می‌دهد',
     !!vEnv && new RegExp('^\\s*' + vEnv + ':\\s*\\$\\{\\{\\s*inputs\\.q',
                          'm').test(vpw),
     'متغیرِ ابزار: ' + String(vEnv) +
     ' — نامِ ناهم‌خوان یعنی اجرای سبز روی پرسشِ پیش‌فرض');

  /* ۲۰.۵ — سدی که پیش از کار می‌نشیند خودش نباید کار باشد (۷٫۷۵/۱۹.۶).
     و **بی توضیح‌ها** سنجیده می‌شود: توضیحِ همین فایل نامِ فایل‌های دیگر
     را دارد و سنجه‌ای که متنِ توضیح را بخوانَد چیزِ دیگری را می‌سنجد. */
  const vpwCode = vpw.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  ok('۲۰.۵ سنجش چیزی نصب نمی‌کند، زمان‌بندی ندارد، و آموزشی راه نمی‌اندازد',
     vpwCode.indexOf('pip install') === -1 &&
     vpwCode.indexOf('schedule:') === -1 &&
     vpwCode.indexOf('voicetrain') === -1 &&
     vpwCode.indexOf('imageio-ffmpeg') === -1,
     'یک سنجشِ چندثانیه‌ای که نصب و زمان‌بندی داشته باشد، همان هزینه‌ای ' +
     'است که ۷٫۷۸ از گردشِ پل برداشت');

  /* ۲۰.۶ — «هیچ منبعی جواب نداد» باید قرمز شود. یک اجرای سبزِ بی‌جواب
     بدترین حالت است — قاعدهٔ خودِ `render.js`، این‌بار پیش از آن‌که
     چیزی رویش ساخته شود. */
  const rz = vcall([
    'V.src_commons = lambda *a, **k: {"ok": False, "why": "بسته"}',
    'V.src_openverse = lambda *a, **k: {"ok": False, "why": "بسته"}',
    'V.src_archive = lambda *a, **k: {"ok": False, "why": "بسته"}',
    'print(json.dumps({"rc": V.main()}))'
  ].join('\n'));
  const gz = JSON.parse(String(rz.stdout).match(/\{"rc":[^}]*\}/) ?
                        String(rz.stdout).match(/\{"rc":[^}]*\}/)[0] : '{}');
  ok('۲۰.۶ صفر منبعِ جواب‌دهنده، خروجیِ ناصفر می‌دهد',
     gz.rc === 1,
     'گرفت: ' + JSON.stringify(gz) + ' — اجرای سبز با صفر منبع یعنی لایهٔ ' +
     'دوم را روی چیزی می‌سازیم که جواب نمی‌دهد');

  /* ══ چرا این پنج سنجه هست ══
     اجرای واقعیِ ۳۰ سپتامبر (۰۶:۱۷) گفت «منبعِ قابلِ استفاده: ۱» و آن یک
     منبع، `youtube-rHrhBzqJenw` بود: یک بازنشرِ یوتیوب، ۵۱۰ مگابایت، با
     مجوزِ **خالی**. ابزار مجوز را می‌خواند و رویش تصمیم نمی‌گرفت.

     یعنی یک سنجشِ سبز که معنایش صفر بود — و بدتر: اگر رویش کار ساخته
     می‌شد، کانالی که قرار است درآمد داشته باشد ویدئوی بی‌مجوز منتشر
     می‌کرد. «هشتمین بارِ» همان شکلِ این پرونده: تحلیل نوشته شد و به
     تصمیمی وصل نبود. این پنج سنجه آن وصل را نگه می‌دارند. */

  ok('۲۰.۷ مجوزِ خالی ردّ است — «نمی‌دانیم» با «آزاد» یکی نیست',
     (() => {
       const r = vcall('print(json.dumps({k: V.licOk_(v)[0] for k, v in {' +
         '"empty": "", "space": "   ", "none": None}.items()}))');
       const g = JSON.parse(String(r.stdout).trim() || '{}');
       return g.empty === false && g.space === false && g.none === false;
     })(),
     'اجرای واقعی با همین سد قرمز می‌شد؛ بی آن، یک فایلِ بی‌مجوز ✅ شمرده شد');

  ok('۲۰.۷-ب آزادها قبول، تجاری‌ممنوع و اشتقاق‌ممنوع و حق‌نشردار ردّ',
     (() => {
       const r = vcall('print(json.dumps({k: V.licOk_(k)[0] for k in [' +
         '"CC0", "CC BY 4.0", "CC BY-SA 3.0", "Public domain",' +
         '"CC BY-NC 2.0", "CC BY-ND 4.0", "All rights reserved", "zzz"]}))');
       const g = JSON.parse(String(r.stdout).trim() || '{}');
       return g['CC0'] === true && g['CC BY 4.0'] === true &&
              g['CC BY-SA 3.0'] === true && g['Public domain'] === true &&
              g['CC BY-NC 2.0'] === false && g['CC BY-ND 4.0'] === false &&
              g['All rights reserved'] === false && g['zzz'] === false;
     })(),
     'NC و ND عمداً ردّند: کانال درآمد دارد و ویدئو خودش اثرِ اشتقاقی است');

  ok('۲۰.۸ بازنشرِ یوتیوب ردّ است، حتی با مجوزِ تمیز',
     (() => {
       const r = vcall('print(json.dumps({' +
         '"yt": V.judge({"name": "youtube-rHrhBzqJenw", "license": "CC0", ' +
         '"bytes": 1000}, "video")[0], ' +
         '"ok": V.judge({"name": "lecture-1952", "license": "CC0", ' +
         '"bytes": 1000}, "video")[0]}))');
       const g = JSON.parse(String(r.stdout).trim() || '{}');
       return g.yt === false && g.ok === true;
     })(),
     'همان شناسه‌ای که اجرای واقعی برگرداند — بازنشرِ یوتیوب به‌حکمِ ساختار ' +
     'یک پرسشِ حق‌نشر است، هرچه فرادَیش بگوید');

  ok('۲۰.۹ سقفِ اندازه پیش از دانلود می‌بُرد، و اندازهٔ نامعلوم خودش ردّ نیست',
     (() => {
       const r = vcall('print(json.dumps({' +
         '"big": V.judge({"name": "x", "license": "CC0", ' +
         '"bytes": 600*1024*1024}, "video")[0], ' +
         '"small": V.judge({"name": "x", "license": "CC0", ' +
         '"bytes": 900000}, "image")[0], ' +
         '"unknown": V.judge({"name": "x", "license": "CC0", ' +
         '"bytes": 0}, "image")[0]}))');
       const g = JSON.parse(String(r.stdout).trim() || '{}');
       return g.big === false && g.small === true && g.unknown === true;
     })(),
     '۵۱۰ مگابایت برای یک کلیپِ چندثانیه‌ای یعنی نامزد چیزِ دیگری است — ولی ' +
     '«نمی‌دانم چند بایت است» دلیلِ ردّ نیست (۷.۴۰)');

  /* ۲۰.۱۰ — **سنجهٔ اصلی.** منبعی که نامزد *می‌دهد* ولی هیچ‌کدام مجوز
     ندارند، باید «غیرقابلِ استفاده» شمرده شود و اجرا قرمز شود. این
     دقیقاً حالتی است که اجرای واقعی در آن سبز شد. */
  ok('۲۰.۱۰ منبعی که فقط نامزدِ بی‌مجوز می‌دهد، «قابلِ استفاده» شمرده نمی‌شود',
     (() => {
       const stub = '{"ok": True, "n": 4, "note": "", "cands": [' +
         '{"license": "", "mime": "JPEG", "w": 9, "h": 9, "bytes": 10, ' +
         '"url": "", "name": "no-licence"}]}';
       const r = vcall([
         'V.src_commons = lambda *a, **k: ' + stub,
         'V.src_openverse = lambda *a, **k: ' + stub,
         'V.src_archive = lambda *a, **k: ' + stub,
         'print("RC=" + str(V.main()))'
       ].join('\n'));
       return /RC=1\b/.test(String(r.stdout));
     })(),
     'گرفت: ' + (() => {
       const stub = '{"ok": True, "n": 4, "note": "", "cands": [' +
         '{"license": "", "mime": "JPEG", "w": 9, "h": 9, "bytes": 10, ' +
         '"url": "", "name": "no-licence"}]}';
       const r = vcall([
         'V.src_commons = lambda *a, **k: ' + stub,
         'V.src_openverse = lambda *a, **k: ' + stub,
         'V.src_archive = lambda *a, **k: ' + stub,
         'print("RC=" + str(V.main()))'
       ].join('\n'));
       return (String(r.stdout).match(/RC=\d/) || ['RC=?'])[0];
     })() + ' — اجرای واقعی در همین حالت «۱ منبع» گفت و سبز شد');

  /* ۲۰.۱۱ — «n=0» باید قابلِ تشخیص باشد از «پرسشم تنگ بود». بی خطای خودِ
     API و بی پرسشِ سادهٔ دوم، نتیجه‌گیری «منابعِ مجانی جواب نمی‌دهند»
     می‌شد — که ممکن است اصلاً غلط باشد. */
  ok('۲۰.۱۱ خطا/هشدارِ API چاپ می‌شود و پرسشِ سادهٔ دوم هم امتحان می‌شود',
     (() => {
       const r = vcall('print(json.dumps({"note": V.apiNote_(' +
         '{"warnings": {"search": {"*": "too narrow"}}}), ' +
         '"clean": V.apiNote_({"query": {}})}))');
       const g = JSON.parse(String(r.stdout).trim() || '{}');
       const twoQ = /for qq in \(\[q, q2\] if q2 else \[q\]\)/.test(vp);
       return /too narrow/.test(String(g.note)) && g.clean === '' && twoQ;
     })(),
     'اجرای اول با چهار واژه همه‌جا n=0 داد؛ بی این دو، «منبع خالی است» و ' +
     '«پرسشم تنگ بود» یک چیز به نظر می‌رسیدند');

  /* ══ و سه ایرادِ دیگر که اجرای دومِ واقعی (۰۶:۵۰) لو داد ══
     اولی از همه مهم‌تر است و **آینهٔ** ایرادِ قبلی است: آن‌بار چیزی را
     پذیرفتم که نباید، این‌بار یک منبعِ کامل را بی‌دلیل رد کردم.

     اوپن‌ورس کدِ مجوز را **خالی** می‌دهد — `by-sa 2.0`، `by 2.0`،
     `pdm 1.0` — و رگکسِ من پیشوندِ `cc` را لازم می‌دانست. نتیجه: هشت
     نامزدِ کاملاً سالم «مجوزِ ناشناخته» خوانده شدند و کلِ اوپن‌ورس ❌ شد.
     اگر همان‌جا نتیجه می‌گرفتم، لایهٔ دومِ مجانی بی‌دلیل کنار می‌رفت و
     صاحبِ برنامه بی‌دلیل به سمتِ لایهٔ پولی هدایت می‌شد. */

  ok('۲۰.۱۲ کدِ خالیِ اوپن‌ورس هم شناخته می‌شود، و محدودها همچنان ردّ',
     (() => {
       const r = vcall('print(json.dumps({k: V.licOk_(k)[0] for k in [' +
         '"by-sa 2.0", "by 2.0", "pdm 1.0", "by-sa 4.0", "cc0 1.0",' +
         '"by-nc 4.0", "by-nd 4.0", "by-nc-sa 3.0"]}))');
       const g = JSON.parse(String(r.stdout).trim() || '{}');
       return g['by-sa 2.0'] === true && g['by 2.0'] === true &&
              g['pdm 1.0'] === true && g['by-sa 4.0'] === true &&
              g['cc0 1.0'] === true &&
              g['by-nc 4.0'] === false && g['by-nd 4.0'] === false &&
              g['by-nc-sa 3.0'] === false;
     })(),
     'اجرای ۰۶:۵۰ هشت نامزدِ سالمِ اوپن‌ورس را «ناشناخته» خواند — یک منبعِ ' +
     'کامل، به خاطرِ نبودِ پیشوندِ cc در رگکسِ من');

  ok('۲۰.۱۳ نامزدِ ویدئو نشانیِ خودِ فایل است، نه بندانگشتی',
     (() => {
       const m = vp.match(/'url':\s*\(ii\.get\('url'\)\s*if\s*kind\s*==\s*'video'/);
       return !!m && /thumburl/.test(vp);
     })(),
     '`iiurlwidth` یک ویدئو را به فریمِ JPEG تبدیل می‌کند؛ اجرای ۰۶:۵۰ برای ' +
     'یک `.webm` گزارش داد «✅ JPEG» — یعنی ادعای «ویدئو کار می‌کند» روی یک ' +
     'عکسِ ساکن سنجیده شده بود');

  ok('۲۰.۱۴ ابعادِ کوچکِ معلوم ردّ است، ابعادِ نامعلوم نه',
     (() => {
       const r = vcall('print(json.dumps({' +
         '"small": V.judge({"name": "x", "license": "by 3.0", "bytes": 9, ' +
         '"w": 320}, "video")[0], ' +
         '"big": V.judge({"name": "x", "license": "by-sa 4.0", "bytes": 9, ' +
         '"w": 1920}, "image")[0], ' +
         '"unknown": V.judge({"name": "x", "license": "pdm 1.0", "bytes": 9, ' +
         '"w": 0}, "image")[0]}))');
       const g = JSON.parse(String(r.stdout).trim() || '{}');
       return g.small === false && g.big === true && g.unknown === true;
     })(),
     'تنها نامزدِ مجوزدارِ ویدئو در اجرای ۰۶:۵۰ سه‌صد‌و‌بیست در دویست‌و‌چهل ' +
     'بود — برای ۱۰۸۰p چیزی نیست. و «نمی‌دانم چند پیکسل است» ردّ نیست (۷.۴۰)');

  /* ۲۰.۱۵ — گزارشی که خودش گمراه‌کننده باشد، از گزارش‌نداشتن بدتر است. در
     اجرای ۰۶:۵۰ هشت ردِّ اوپن‌ورس **زیرِ ✅ی کامنز** چاپ شد، چون ردّها پیش
     از سرتیترِ منبعِ خودشان می‌آمدند. */
  ok('۲۰.۱۵ ردّها زیرِ سرتیترِ منبعِ خودشان چاپ می‌شوند، نه منبعِ قبلی',
     (() => {
       const r = vcall([
         'good = {"license": "cc0", "mime": "image/png", "w": 1920, "h": 9,',
         '        "bytes": 99, "url": "", "name": "fine"}',
         'bad  = {"license": "", "mime": "image/png", "w": 1920, "h": 9,',
         '        "bytes": 99, "url": "", "name": "no-licence"}',
         'V.report("SRC-A", {"ok": True, "n": 2, "note": "",',
         '                   "cands": [good, bad]}, "image", test_bytes=False)'
       ].join('\n'));
       const lines = String(r.stdout).split('\n').filter(x => x.trim());
       const hdr = lines.findIndex(x => x.indexOf('SRC-A') !== -1);
       const rej = lines.findIndex(x => x.indexOf('no-licence') !== -1);
       return hdr >= 0 && rej > hdr;
     })(),
     'گرفت: ' + JSON.stringify(String(vcall([
         'good = {"license": "cc0", "mime": "image/png", "w": 1920, "h": 9,',
         '        "bytes": 99, "url": "", "name": "fine"}',
         'bad  = {"license": "", "mime": "image/png", "w": 1920, "h": 9,',
         '        "bytes": 99, "url": "", "name": "no-licence"}',
         'V.report("SRC-A", {"ok": True, "n": 2, "note": "",',
         '                   "cands": [good, bad]}, "image", test_bytes=False)'
       ].join('\n')).stdout).split('\n').filter(x => x.trim()).slice(0, 3)) +
     ' — ردّی که بالای سرتیتر بنشیند، به منبعِ قبلی نسبت داده می‌شود');
}

/* ══ ۲۱) گام از زیروبمِ خودِ ورودی، نه عددِ ثابت (۸.۲۴) ══
   −۱۲ روی صدای مبدأِ زن‌گونه سنجیده شد؛ نمونه‌ها با صدای مرد (Charon) خوانده
   می‌شوند و رضوی یک اکتاو زیرِ خودش نشست — ۶۰ هرتز در برابرِ ۱۰۶٫۹. این
   سنجه‌ها روی صوتِ **ساختگی با زیروبمِ معلوم** می‌دوند، نه روی ادعا. */
console.log('\n=== ۲۱) گامِ خودکار و زیروبمِ خروجی (۸.۲۴) ===');
{
  const run = (code) => cp.spawnSync('python3', ['-c', [
    'import sys, json, math, wave, struct, os, tempfile',
    'sys.path.insert(0, "tools")',
    'import voicebridge as V',
    'def tone(hz, sec=3.0, sr=40000, amp=0.3):',
    '    p = tempfile.mktemp(suffix=".wav")',
    '    w = wave.open(p, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)',
    '    fr = bytearray()',
    '    for i in range(int(sec*sr)):',
    '        t = i/sr',
    '        v = amp*(math.sin(2*math.pi*hz*t)+0.5*math.sin(4*math.pi*hz*t)+0.25*math.sin(6*math.pi*hz*t))/1.75',
    '        fr += struct.pack("<h", int(v*32767))',
    '    w.writeframes(bytes(fr)); w.close(); return p',
    code].join('\n')], { encoding: 'utf8' });
  const r1 = run('print(json.dumps([V.f0Stats(tone(120)), V.f0Stats(tone(60)), V.f0Stats(tone(120, amp=0.0))]))');
  let a = null; try { a = JSON.parse(r1.stdout); } catch (e) {}
  ok('۲۱.۱ زیروبمِ میانهٔ صوتِ ۱۲۰ و ۶۰ هرتزی درست سنجیده می‌شود',
     a && Math.abs(a[0].medianHz - 120) < 4 && a[0].lowPct === 0 &&
     Math.abs(a[1].medianHz - 60) < 3 && a[1].lowPct === 100,
     'گرفت: ' + (r1.stdout || r1.stderr).slice(0, 200));
  ok('۲۱.۱-ب سکوت ⇒ «نسنجیدم» (None)، نه صفر', a && a[2] === null, JSON.stringify(a && a[2]));
  const r2 = run('print(json.dumps([V.autoPitch(120, 106.9), V.autoPitch(200, 106.9), V.autoPitch(30, 500), V.autoPitch(500, 30)]))');
  ok('۲۱.۲ گام از نسبتِ دو زیروبم، و محدود',
     String(r2.stdout).trim() === '[-2, -11, 6, -14]', String(r2.stdout || r2.stderr).trim());
  const src = fs.readFileSync('tools/voicebridge.py', 'utf8');
  ok('۲۱.۳ گامِ حساب‌شده همان است که به تبدیل می‌رسد، نه پارامترِ خام',
     /"--rvc-pitch", pitch,/.test(src) && !/"--rvc-pitch", str\(pr\.get/.test(src));
  /* `--probe` بی numpy می‌دود (۷٫۷۸) — import در سطحِ پرونده آن را می‌شکند. */
  ok('۲۱.۴ numpy در سطحِ پرونده import نمی‌شود', !/^import numpy|^from numpy/m.test(src));
  ok('۲۱.۵ خروجی هم سنجیده و در نقشه ثبت می‌شود',
     /stOut = f0Stats\(best\)/.test(src) && /rec\["f0Warn"\]/.test(src) && /rec\["f0Out"\]/.test(src));
}
console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
