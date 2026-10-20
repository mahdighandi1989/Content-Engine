/* build.js — ۲۲ بخشِ src/ را به یک engine.gs در «ریشهٔ ریپو» سرِ هم می‌کند.
 *
 * خروجی همیشه ریشه است، هر جا که این اسکریپت را صدا بزنی:
 *     node tools/build.js
 * چون موتور engine.gs را مستقیم از همان آدرسِ rawِ ریشه می‌خواند.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');          // tools/ یک پله زیرِ ریشه است
const DIR = path.join(ROOT, 'src') + path.sep;
const OUT = path.join(ROOT, 'engine.gs');
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs','33_VoiceIntake.gs','34_Search.gs', '35_Embed.gs', '36_VoiceBridge.gs', '37_VarietyMedia.gs', '38_Instagram.gs', '39_MusicReview.gs'];
// نسخه از تنها منبعِ حقیقتش خوانده می‌شود و در سرآیند می‌نشیند. پیشتر نسخه در
// build_header.txt دستی نوشته شده بود و از ۵٫۱۲ به بعد جا ماند: فایلِ نصب‌شده
// «۵٫۱۶» بود ولی بالایش «۵٫۱۲» می‌نوشت. حالا drift ساختاراً ممکن نیست.
const CFG_SRC = fs.readFileSync(DIR + '00_Config.gs', 'utf8');
const VER_M = CFG_SRC.match(/CODE_VERSION:\s*'([^']+)'/);
if (!VER_M) { console.error('✗ CODE_VERSION در src/00_Config.gs پیدا نشد.'); process.exit(1); }
const VERSION = VER_M[1];

/* ══ بدهیِ منو — شمرده می‌شود، نه دست‌نویس (۸٫۱۳) ══
 * «ناظر به تمام موارد منو نظارت می‌کنه؟» — عددش در یک فایلِ آزمون بود، یعنی
 * جایی که فقط با گشتنِ عمدی پیدا می‌شود. حالا در هر build از دو منبعِ واقعی
 * شمرده و در `src/00_Config.gs` نوشته می‌شود، تا موتور بتواند هر روز بگویدش.
 * دست‌نویس بودنش یعنی یک سال کهنه ماندن (۵٫۹۵). */
const MENU_SRC = fs.readFileSync(DIR + '05_Setup.gs', 'utf8');
const MENU_TOTAL = (MENU_SRC.match(/\.addItem\s*\(/g) || []).length;
const DEBT_SRC = fs.readFileSync(path.join(ROOT, 'tests', 'run_dialogs_test.js'), 'utf8');
const DEBT_M = DEBT_SRC.match(/const MENU_DEBT = \[([\s\S]*?)\n\];/);
if (!DEBT_M) { console.error('✗ MENU_DEBT در tests/run_dialogs_test.js پیدا نشد.'); process.exit(1); }
const MENU_DEBT_N = (DEBT_M[1].match(/'[^']+'/g) || []).length;
const MENU_LINE = "var BUILD_MENU_ = { total: " + MENU_TOTAL + ", debt: " + MENU_DEBT_N +
                  " };   /* ⚙ BUILD-MENU */";
{
  /* ══ «چیزی عوض نشد» با «چیزی پیدا نشد» یکی نیست ══
   * نگارشِ اول همین دو را یکی گرفت: وقتی عدد همان بود که بود، `after` با
   * `before` برابر می‌شد و اسکریپت می‌گفت «نشانه پیدا نشد» و می‌مُرد — یعنی
   * دقیقاً در حالتِ **سالم**. همان مرزی که این مخزن بارها نوشته، این بار در
   * ابزارِ ساخت: وجودِ نشانه را باید جدا پرسید، نه از روی تفاوت حدس زد. */
  const RE_MENU = /var BUILD_MENU_ = \{[^}]*\};\s*\/\* ⚙ BUILD-MENU \*\//;
  if (!RE_MENU.test(CFG_SRC)) {
    console.error('✗ خطِ ⚙ BUILD-MENU در src/00_Config.gs نیست — بی آن عدد کهنه می‌مانَد.');
    process.exit(1);
  }
  let after = CFG_SRC.replace(RE_MENU, MENU_LINE);
  /* ══ فهرستِ گزینه‌ها، از خودِ منو (۸.۷۳) ══
   * «ناظر باید همهٔ گزینه‌های منو — الان و بعداً — را همیشه زیرِ نظر داشته باشد.»
   * تا ۸.۷۲ فقط **شمارِ** بی‌آزمون‌ها اینجا ساخته می‌شد؛ هیچ‌جا ثبت نمی‌شد کدام
   * گزینه کِی زده شد و چه شد — جست‌وجو «Out of memory» داد و موتور خبر نداشت.
   * حالا فهرستِ کامل (نام، برچسب، آزموده؟) از خودِ `addItem`ها و درهای پنجره‌ها
   * ساخته می‌شود و `menuWrapAll_` هر کدام را در `menuRun_` می‌پیچد. گزینهٔ تازه
   * بی هیچ کارِ دستی واردِ همین فهرست می‌شود. */
  const debtNames = (DEBT_M[1].match(/'[^']+'/g) || []).map((x) => x.slice(1, -1));
  const items = [], seen = {};
  const reItem = /addItem\('([^']*)',\s*'([A-Za-z_][A-Za-z0-9_]*)'\)/g;
  let mi;
  while ((mi = reItem.exec(MENU_SRC))) {
    if (seen[mi[2]]) continue; seen[mi[2]] = 1;
    items.push([mi[2], mi[1], debtNames.indexOf(mi[2]) === -1 ? 1 : 0, 'منو']);
  }
  const OPENER = { '15_Board.gs': 'showSeriesBoard', '32_Persona.gs': 'showPersonaBoard', '34_Search.gs': 'runContentSearch' };
  for (const df of ['15_Board.gs', '32_Persona.gs', '34_Search.gs']) {
    const op = items.find((x) => x[0] === OPENER[df]);
    const t = fs.readFileSync(DIR + df, 'utf8');
    const reFn = /\nfunction ([A-Za-z][A-Za-z0-9]*[A-Za-z0-9])\(/g;
    let mf;
    while ((mf = reFn.exec(t))) {
      const nm = mf[1];
      if (seen[nm] || /_$/.test(nm)) continue;
      if (t.indexOf('.' + nm + '(') === -1) continue;   // فقط آنچه پنجره صدا می‌زند
      seen[nm] = 1; items.push([nm, (op ? op[1] + ' › ' : '') + nm, 1, 'پنجره']);
    }
  }
  /* ══ فلسفهٔ هر گزینه — از توضیحِ بالای خودِ تابع، نه یک فایلِ جدا (۸.۷۳) ══
   * دو نسخه از یک متن یعنی روزی یکی کهنه می‌شود. پس `docs/menu.md` در هر build از
   * همان توضیحِ کد ساخته می‌شود و `run_dialogs_test` ۲۰.۸ گزینهٔ بی‌توضیح را سرخ می‌کند. */
  const ALL = FILES.map((f) => [f, fs.readFileSync(DIR + f, 'utf8')]);
  const purposeOf = (fn) => {
    for (const [f, t] of ALL) {
      const i = t.indexOf('\nfunction ' + fn + '(');
      if (i < 0) continue;
      const before = t.slice(Math.max(0, i - 3000), i).replace(/\s+$/, '');
      let txt = '';
      if (/\*\/$/.test(before)) {
        const st = before.lastIndexOf('/*');
        if (st >= 0 && before.indexOf('*/', st) === before.length - 2) txt = before.slice(st + 2, -2).replace(/^\*/, '');
      } else {
        const ml = /((?:^|\n)[ \t]*\/\/[^\n]*)+$/.exec(before);
        if (ml) txt = ml[0];
      }
      txt = txt.split('\n').map((l) => l.replace(/^\s*(\*|\/\/)\s?/, '').trim())
        .filter((l) => l && !/^@/.test(l) && !/^[═─]+$/.test(l)).join(' ')
        .replace(/══/g, '').replace(/\s+/g, ' ').trim();
      return { file: f, purpose: txt.slice(0, 400) };
    }
    return { file: '', purpose: '' };
  };
  const md = ['# گزینه‌های منو و درهای پنجره‌ها', '',
    '> ساخته‌شده خودکار با `node tools/build.js` از خودِ کد (۸.۷۳) — دستی ویرایش نکنید؛ ' +
    'توضیحِ بالای تابع را عوض کنید. هر زدن و نتیجه‌اش در `_STATUS.json` → `menu` ثبت می‌شود.', '',
    '| # | برچسب | تابع | پرونده | آزمون | فلسفه و کار |', '|---|---|---|---|---|---|'];
  items.forEach((it, k) => {
    const pu = purposeOf(it[0]);
    it.push(pu.purpose ? 1 : 0);
    md.push('| ' + (k + 1) + ' | ' + String(it[1]).replace(/\|/g, '/') + ' | `' + it[0] + '` | ' + pu.file + ' | ' +
            (it[2] ? '✅' : '❌ بی‌آزمون') + ' | ' + (pu.purpose || '❌ **بی‌توضیح**').replace(/\|/g, '/') + ' |');
  });
  fs.writeFileSync(path.join(ROOT, 'docs', 'menu.md'), md.join('\n') + '\n');
  const ITEMS_LINE = 'var BUILD_MENU_ITEMS_ = ' + JSON.stringify(items) + ';   /* ⚙ BUILD-MENU-ITEMS */';
  const RE_ITEMS = /var BUILD_MENU_ITEMS_ = \[[\s\S]*?\];\s*\/\* ⚙ BUILD-MENU-ITEMS \*\//;
  if (RE_ITEMS.test(after)) after = after.replace(RE_ITEMS, ITEMS_LINE);
  else after = after.replace(MENU_LINE, MENU_LINE + '\n' + ITEMS_LINE);
  if (after !== CFG_SRC) fs.writeFileSync(DIR + '00_Config.gs', after);
}
let HEADER = fs.readFileSync(path.join(__dirname, 'build_header.txt'), 'utf8');
if (HEADER.indexOf('{{VERSION}}') === -1) {
  console.error('✗ build_header.txt جای‌نشانِ {{VERSION}} را ندارد — سرآیند دوباره از CODE_VERSION جدا می‌افتد.');
  process.exit(1);
}
HEADER = HEADER.split('{{VERSION}}').join(VERSION);
let out = HEADER + '\n\n';
for (const f of FILES) {
  out += '\n/* ═══════════════════════════ ' + f + ' ═══════════════════════════ */\n\n';
  out += fs.readFileSync(DIR + f, 'utf8').replace(/\s+$/, '') + '\n';
}
/* ══ سقفِ اندازه، پیش از رسیدن (۸.۳۶) ══
 * `engineTextProblems_` فایلِ بزرگ‌تر از `ENGINE_MAX_CHARS` را نصب نمی‌کند. ۸.۳۵
 * با ۲٬۹۹۹٬۹۷۵ نویسه بیست‌وپنج نویسه زیرِ سقفِ آن روز بود و هیچ‌چیز نگفت؛
 * نسخهٔ بعد بی‌صدا نصب نمی‌شد. حالا ساخت در ۹۰٪ می‌ایستد. */
{
  const capM = CFG_SRC.match(/ENGINE_MAX_CHARS:\s*(\d+)/);
  const cap = capM ? Number(capM[1]) : 0;
  if (!cap) { console.error('✗ ENGINE_MAX_CHARS در src/00_Config.gs نیست.'); process.exit(1); }
  if (out.length > cap * 0.9) {
    console.error('✗ engine.gs ' + out.length + ' نویسه است — بیش از ۹۰٪ سقفِ نصب (' + cap +
                  '). سقف را در src/00_Config.gs بالا ببر یا متن را کوتاه کن؛ نسخهٔ در حالِ ' +
                  'اجرا فایلِ بزرگ‌تر از سقفِ **خودش** را نصب نمی‌کند.');
    process.exit(1);
  }
}
fs.writeFileSync(OUT, out);
console.log('built v' + VERSION + ' —', out.length, 'chars from', FILES.length,
            'files ->', path.relative(ROOT, OUT) || OUT);
