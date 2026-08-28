/* نگهبانِ ساختاری: کدی که نوشته شده ولی هیچ‌جا صدا زده نمی‌شود.
 *
 * چرا این آزمون هست: دو باگِ واقعیِ این پروژه هر دو از همین جنس بودند —
 * sfxAllow_ که خویشتن‌داریِ افکت را می‌سنجید ولی هیچ افکتی پخش نمی‌شد، و
 * pruneEnrichFiles_ که «ده روز و پاک می‌شوند» را وعده می‌داد در حالی که
 * هرگز اجرا نمی‌شد. هیچ‌کدام خطا نمی‌دادند؛ فقط ساکت هیچ‌کاری نمی‌کردند.
 *
 * قاعده: هر تابعِ خصوصی (پایان‌یافته به `_`) باید دستِ‌کم یک فراخوان داشته
 * باشد. نقطه‌های ورودِ GAS (منو و تریگر) زیرخط ندارند، پس خودبه‌خود بیرون‌اند.
 */
require('./lib/root.js');
const fs = require('fs');

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

// مرده‌های قدیمی که پیش از این آزمون وجود داشتند. فهرست عمداً کوتاه است و
// هر افزوده‌ای به آن باید دلیل داشته باشد — وگرنه همان بلا دوباره سرمان می‌آید.
const LEGACY = new Set([
  'mergeParts_',        // پوششِ نازک روی mergeGroups_ که زنده است
  'allTextForPron_',    // باقی‌ماندهٔ هشدارِ «جدول تلفظ چیزی نگرفت» که حذف شد
  'pronHits_',          //  همان
  'ensureSeriesTabs_', 'planCurriculum_', 'specialNarrationOf_',
  'findOrMakeEpFolder_', 'findOrMakeSub_', 'countFolders_'
]);

const files = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let all = ''; const def = {};
for (const f of files) {
  const t = fs.readFileSync('src/' + f, 'utf8');
  all += '\n' + t;
  for (const m of t.matchAll(/^function ([A-Za-z0-9_]+)\s*\(/gm)) def[m[1]] = f;
}
const body = all.replace(/^function [A-Za-z0-9_]+\s*\(/gm, 'function __DEF__(');

console.log('=== ۱) هر تابعِ خصوصی باید صدا زده شود ===');
const dead = [];
for (const n of Object.keys(def)) {
  if (!n.endsWith('_')) continue;                 // نقطهٔ ورود، نه تابعِ خصوصی
  if (LEGACY.has(n)) continue;
  const calls = (body.match(new RegExp('\\b' + n + '\\s*\\(', 'g')) || []).length;
  if (calls === 0) dead.push(def[n] + ' :: ' + n);
}
ok('۱.۱ هیچ تابعِ خصوصیِ بی‌فراخوانی نیست', dead.length === 0, dead.join(' · '));

console.log('=== ۲) قابلیت‌های تازه واقعاً به مسیرِ زنده وصل‌اند ===');
// هر کدام از این‌ها یک وعده به صاحبِ برنامه است. اگر فراخوانش برود، وعده
// بی‌صدا می‌شکند — همان چیزی که دو بار اتفاق افتاد.
const WIRED = [
  ['auditSnap_',        'src/03_Producer.gs',  'عکسِ محتوا در «از همه جا»'],
  ['auditSnap_',        'src/14_Special.gs',   'عکسِ محتوا در درس‌نامه'],
  ['auditRun_',         'src/21_SelfUpdate.gs','داوریِ شبانهٔ محتوا'],
  ['auditPrune_',       'src/21_SelfUpdate.gs','هرسِ عکس‌های محتوا'],
  ['promptPrune_',      'src/21_SelfUpdate.gs','بایگانیِ پرامپت‌های کهنه'],
  ['promptFreshNag_',   'src/21_SelfUpdate.gs','یادآورِ تازگیِ دستور'],
  ['promptDueSet_',     'src/21_SelfUpdate.gs','ثبتِ بدهیِ دستور'],
  ['outReadmeSync_',    'src/21_SelfUpdate.gs','بازتابِ نقشهٔ پوشه'],
  ['pruneReportArchive_','src/21_SelfUpdate.gs','هرسِ بایگانیِ گزارش'],
  ['pruneEnrichFiles_', 'src/21_SelfUpdate.gs','هرسِ پرونده‌های غنی‌سازی'],
  ['archiveReportFile_','src/12_Reports.gs',   'بایگانیِ گزارشِ خوانده‌شده'],
  ['sfxAllow_',         'src/23_Music.gs',     'خویشتن‌داریِ افکت'],
  ['musicWish_',        'src/23_Music.gs',     'خواستهٔ موسیقی'],
  ['outLayoutCheck_',   'src/08_Health.gs',    'وارسیِ چیدمانِ ریشه'],
  ['musicScan_',        'src/21_SelfUpdate.gs','پویشِ شبانهٔ بانک']
];
for (const [fn, file, what] of WIRED) {
  const t = fs.readFileSync(file, 'utf8');
  const called = new RegExp('(?<!function )\\b' + fn + '\\s*\\(').test(t);
  ok('۲ ' + what + ' (' + fn + ' در ' + file.replace('src/', '') + ')', called);
}

console.log('=== ۳) هر دو برنامه یکسان رفتار می‌کنند ===');
// خواستهٔ صریحِ صاحبِ برنامه، دو بار پرسیده: «برای هر دو پادکست بررسی کردی؟»
const v = fs.readFileSync('src/03_Producer.gs', 'utf8');
const sp = fs.readFileSync('src/14_Special.gs', 'utf8');
for (const [key, what] of [['auditSnap_', 'عکسِ محتوا'],
                           ['musicWrap_', 'موسیقی'],
                           ['bounds:', 'مرزِ بخش‌ها برای موسیقیِ میانه'],
                           ['fidelityCheck_', 'پاسِ وفاداری']]) {
  ok('۳ ' + what + ' در هر دو برنامه هست',
     v.indexOf(key) !== -1 && sp.indexOf(key) !== -1,
     'از‌همه‌جا=' + (v.indexOf(key) !== -1) + ' درس‌نامه=' + (sp.indexOf(key) !== -1));
}

console.log('=== ۴) هیچ بارگذاری از بخشی جا نمانده باشد ===');
// چرا: بیشترِ آزمون‌ها فهرستِ دستیِ بخش‌ها دارند. وقتی بخشِ تازه‌ای اضافه
// می‌شود و به آن فهرست‌ها نمی‌رود، فراخوان‌هایش ReferenceError می‌دهند و در try/catch
// بلعیده می‌شوند — یعنی آزمون سبز می‌ماند و مسیرِ واقعی هرگز سنجیده نمی‌شود.
// ۵٫۵۲ دقیقاً همین را دید: ۲۱ فایلِ آزمون بخشِ ۲۵ را نمی‌شناختند.
{
  const SECTIONS = fs.readdirSync('src').filter(f => /^\d\d_.*\.gs$/.test(f)).sort();
  const build = fs.readFileSync('tools/build.js', 'utf8');
  const missingBuild = SECTIONS.filter(f => build.indexOf("'" + f + "'") === -1);
  ok('۴.۱ tools/build.js همهٔ بخش‌ها را می‌سازد',
     missingBuild.length === 0, missingBuild.join(', '));

  /* پوشهٔ lib هم شمرده می‌شود.
     تا ۶٫۲۰ فقط tests/run_*.js گشته می‌شد، و tests/lib/probe_r4_lib.js —
     که شش سشنِ آزمون از آن متن را می‌گیرند — از ۲۳ تا ۲۸ خبر نداشت. یعنی
     همان نگهبانی که برای «بارکنندهٔ بی‌خبر از یک بخش» ساخته شده بود، جایی
     را نمی‌دید که آن اتفاق افتاده بود. نگهبانی که یک در را نمی‌بیند، همان
     در را باز می‌گذارد. */
  const TESTS = fs.readdirSync('tests').filter(f => /^run_.*\.js$/.test(f)).sort()
    .map(f => 'tests/' + f)
    .concat(fs.readdirSync('tests/lib').filter(f => /\.js$/.test(f)).sort()
              .map(f => 'tests/lib/' + f));
  const bad = [];
  for (const t of TESTS) {
    const txt = fs.readFileSync(t, 'utf8');
    if (/run_wiring_test\.js$/.test(t)) continue;                   // خودِ همین فایل
    // فقط آزمونی که بخش‌ها را با فهرستِ دستی از src/ می‌خواند. آن‌هایی که
    // engine.gs را eval می‌کنند یا readdirSync می‌زنند، خودبه‌خود کامل‌اند.
    if (!/readFileSync\((DIR|'src\/')\s*\+/.test(txt)) continue;
    if (/readdirSync\('src'\)/.test(txt)) continue;                // خودش پوشه را می‌خواند
    const miss = SECTIONS.filter(f => txt.indexOf("'" + f + "'") === -1);
    if (miss.length) bad.push(t + ' ← ' + miss.join(', '));
  }
  ok('۴.۲ هر آزمونِ فهرست‌دار، همهٔ بخش‌ها را می‌بارد',
     bad.length === 0, bad.join(' | '));
}


console.log('=== \u06f5) \u062f\u06a9\u0645\u0647\u200c\u0627\u06cc \u06a9\u0647 \u0628\u06cc\u200c\u0635\u062f\u0627 \u0647\u06cc\u0686 \u06a9\u0627\u0631\u06cc \u0646\u0645\u06cc\u200c\u06a9\u0646\u062f ===');
/* پنجره‌های HtmlService با google.script.run.X() به سرور وصل می‌شوند. اگر X
 * وجود نداشته باشد، هیچ خطایی در کد نیست و هیچ آزمونی نمی‌شکند — فقط دکمه
 * زده می‌شود و هیچ اتفاقی نمی‌افتد. این بدترین جنسِ خرابی است: ظاهر درست،
 * رفتار هیچ. و دقیقاً همان چیزی که صاحبِ برنامه نگرانش بود.
 */
{
  require('./lib/mock.js');
  const SRC = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort()
    .map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
  (0, eval)(SRC);

  const html = String(uiBoardHtml());
  // زنجیره را با شمارشِ پرانتز می‌پیماییم، نه با رجکس: آرگومانِ
  // withSuccessHandler خودش یک تابعِ کامل با پرانتزهای تودرتوست و هر رجکسِ
  // ساده‌ای همان را به‌جای تابعِ سرور می‌گیرد.
  const HANDLERS = ['withSuccessHandler', 'withFailureHandler', 'withUserObject'];
  const called = [];
  const KEY = 'google.script.run';
  for (let at = html.indexOf(KEY); at !== -1; at = html.indexOf(KEY, at + 1)) {
    let i = at + KEY.length;
    while (html[i] === '.') {
      let j = i + 1;
      while (j < html.length && /[\w$]/.test(html[j])) j++;
      const name = html.slice(i + 1, j);
      if (html[j] !== '(') break;
      let depth = 0, k = j;
      for (; k < html.length; k++) {
        if (html[k] === '(') depth++;
        else if (html[k] === ')') { depth--; if (!depth) { k++; break; } }
      }
      if (HANDLERS.indexOf(name) === -1) {
        if (called.indexOf(name) === -1) called.push(name);
        break;                                   // تابعِ سرور، آخرِ زنجیره
      }
      i = k;
    }
  }

  ok('۵.۱ تخته واقعاً دکمهٔ سروری دارد', called.length >= 5, called.join(', '));
  const missing = called.filter(n => typeof global[n] !== 'function');
  ok('۵.۲ هر google.script.run.X یک تابعِ واقعی دارد', missing.length === 0,
     missing.length ? 'گم‌شده: ' + missing.join(', ') : called.join(', '));

  // و برعکسش: پنلِ تقویم واقعاً در تخته هست، نه فقط تابعش نوشته شده
  ok('۵.۳ پنلِ تقویم در خودِ تخته رندر می‌شود',
     html.indexOf('تقویمِ تولید') !== -1 && /class="calDay"/.test(html));
  ok('۵.۴ و برای هر هفت روز تیک دارد',
     (html.match(/class="calDay"/g) || []).length % 7 === 0 &&
     (html.match(/class="calDay"/g) || []).length >= 7,
     String((html.match(/class="calDay"/g) || []).length));
  ok('۵.۵ گزینهٔ جداگانهٔ تقویم از منو برداشته شد',
     fs.readFileSync('src/05_Setup.gs', 'utf8').indexOf('runProductionCalendar') === -1);
}


console.log('\n══ ۷) کلیدِ تکراری در CFG — خطایی که هیچ خطایی نمی‌دهد ══');
{
  /* ══ باگی که این را لازم کرد (۶٫۴۴) ══
   * ۶٫۴۳ خواست `EXPLAIN_MIN_CHARS` را از ۲۶۰ به بالا ببرد و کلیدِ تازه‌ای
   * کنارِ `EXPLAIN_PCT` گذاشت — بی آنکه بداند همان کلید صد سطر پایین‌تر هم
   * هست. در جاوااسکریپت **آخری برنده است**، پس مقدارِ تازه بی‌صدا مرده بود:
   * نه خطایی، نه هشداری، و آزمون‌ها هم سبز. فقط وقتی عددِ واقعی را با اجرا
   * حساب کردیم معلوم شد کف هنوز ۲۶۰ است.
   *
   * `CFG` بیش از هزار سطر است؛ چنین چیزی با چشم پیدا نمی‌شود. و همین شکل
   * برای هر نگاشتِ دیگری هم صادق است، پس همه‌شان سنجیده می‌شوند. */
  const cfgSrc = fs.readFileSync('src/00_Config.gs', 'utf8');
  const dups = [];
  const blocks = cfgSrc.match(/^var [A-Z_0-9]+ = \{[\s\S]*?^\};/gm) || [];
  for (const b of blocks) {
    const name = (b.match(/^var ([A-Z_0-9]+)/) || [])[1];
    // فقط کلیدهای سطحِ اول: خطِ کم‌تورفتگیِ دو فاصله‌ای
    const keys = (b.match(/^  ([A-Za-z_][A-Za-z_0-9]*)\s*:/gm) || [])
      .map(k => k.trim().replace(/:$/, ''));
    const seen = Object.create(null);
    for (const k of keys) {
      if (seen[k]) dups.push(name + '.' + k);
      seen[k] = 1;
    }
  }
  ok('۷.۱ هیچ کلیدی در نگاشت‌های پیکربندی دوبار تعریف نشده',
     dups.length === 0, dups.join(', '));

  /* و همان تله در فهرستِ سرستون‌ها: سرستونِ تکراری یعنی دو ستون با یک نام،
     و `findAny_` همیشه اولی را برمی‌دارد — نوشتن در دومی بی‌اثر می‌شود. */
  const hdrDups = [];
  for (const nm of ['SERIES_HEADERS', 'SPECIAL_HEADERS', 'SPART_HEADERS',
                    'YTC_HEADERS', 'BRIDGE_HEADERS']) {
    let list = null;
    try { list = eval(nm); } catch (e) { continue; }
    if (!Array.isArray(list)) continue;
    const seen = Object.create(null);
    for (const h of list) {
      const k = String(h).trim();
      if (seen[k]) hdrDups.push(nm + ' :: ' + k);
      seen[k] = 1;
    }
  }
  ok('۷.۲ و هیچ سرستونی دوبار نیامده', hdrDups.length === 0, hdrDups.join(', '));
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
