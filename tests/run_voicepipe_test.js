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

/* یکی در هر اجرا — jobی که سرِ سقف کشته شود هیچ خروجی‌ای نمی‌دهد. */
ok('۱۰.۸ یک قسمت در هر اجرا',
   /todo\[0\]/.test(bp), 'دو تا یعنی نزدیک شدن به سقفِ زمانی');
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
  const iDrop = vb.indexOf('dropCollected(ensureRelease()');
  const iTodo = vb.indexOf('todo = [it for it');
  ok('۱۴.۸-پ و پیش از انتخابِ کارِ تازه، بی‌قید',
     iDrop > 0 && iTodo > iDrop,
     'بعدِ `if not todo: return` یعنی روزِ خلوت پاک‌سازی نمی‌شود');

  ok('۱۴.۵ و `seconds` هم در نقشه می‌آید',
     /"seconds": round\(outSec/.test(vb),
     'تا ۷٫۶۵ نوشته نمی‌شد، پس ستونِ «ثانیه»ی کارنامه همیشه خالی بود');
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
