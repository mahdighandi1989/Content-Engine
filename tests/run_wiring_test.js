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

  const TESTS = fs.readdirSync('tests').filter(f => /^run_.*\.js$/.test(f)).sort();
  const bad = [];
  for (const t of TESTS) {
    const txt = fs.readFileSync('tests/' + t, 'utf8');
    if (t === 'run_wiring_test.js') continue;                       // خودِ همین فایل
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


console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
