/* چیدمانِ پوشهٔ OUTPUT (بخش‌های ۸ و ۱۲ و ۲۱).
 *
 * چرا آزمونِ جداگانه: جابه‌جاییِ یک فایل در درایو هیچ خطایی نمی‌دهد. اگر
 * موتور فایلی را که با نام می‌جوید دیگر پیدا نکند، بی‌صدا یکی تازه می‌سازد
 * یا کارش می‌ماند. پس قاعده‌ها اینجا از دلِ خودِ کد سنجیده می‌شوند، نه از
 * روی بازگفتنِ آن‌ها.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs',
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

const OUT = () => DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
const put = (name, body) => OUT().createFile(name, body || '{}', 'application/json');
const names = it => { const a = []; while (it.hasNext()) a.push(it.next().getName()); return a; };
const rootFileNames = () => names(OUT().getFiles());
const rootFolderNames = () => names(OUT().getFolders());

console.log('=== ۱) بایگانی‌شدنِ گزارشِ خوانده‌شده ===');
{
  const f = put('_REPORT-20260101.json', '{"items":[]}');
  markReportDone_(f);
  ok('۱.۱ نام «.ingested» می‌گیرد', f.getName() === '_REPORT-20260101.json.ingested',
     f.getName());
  ok('۱.۲ از ریشه بیرون می‌رود',
     rootFileNames().indexOf('_REPORT-20260101.json.ingested') === -1);
  const arch = reportArchiveFolder_();
  ok('۱.۳ در بایگانی می‌نشیند',
     names(arch.getFiles()).indexOf('_REPORT-20260101.json.ingested') !== -1);
  ok('۱.۴ نامِ پوشهٔ بایگانی از CFG می‌آید',
     arch.getName() === CFG.REPORT_ARCHIVE_FOLDER);
}

console.log('=== ۲) بایگانی نباید جست‌وجوی گزارشِ تازه را بشکند ===');
{
  // این همان چیزی است که جابه‌جایی می‌توانست خرابش کند: گزارشِ تازه در ریشه
  // باید دیده شود و گزارشِ بایگانی‌شده نباید دوباره برداشته شود.
  put('_REPORT-20260202.json', '{"items":[]}');
  const pend = pendingReportFiles_().map(f => f.getName());
  ok('۲.۱ گزارشِ تازه دیده می‌شود', pend.indexOf('_REPORT-20260202.json') !== -1,
     pend.join(' · '));
  ok('۲.۲ گزارشِ بایگانی‌شده دوباره برداشته نمی‌شود',
     pend.join(' ').indexOf('.ingested') === -1);
}

console.log('=== ۳) هرسِ بایگانی ===');
{
  const arch = reportArchiveFolder_();
  const oldF = arch.createFile('_REPORT-20250101.json.ingested', '{}', 'application/json');
  oldF._created = new Date(Date.now() - 400 * 86400000);
  oldF._updated = oldF._created;
  const keep = arch.createFile('غیرِ گزارش.txt', 'x', 'text/plain');
  keep._created = new Date(Date.now() - 400 * 86400000);
  keep._updated = keep._created;
  const n = pruneReportArchive_(60);
  ok('۳.۱ گزارشِ کهنه پاک می‌شود', n === 1, 'پاک‌شده: ' + n);
  const left = names(arch.getFiles());
  ok('۳.۲ گزارشِ تازه می‌ماند', left.indexOf('_REPORT-20260101.json.ingested') !== -1);
  ok('۳.۳ فایلِ غیرِگزارش دست نمی‌خورد — هرس فقط پیشوندِ خودش را می‌شناسد',
     left.indexOf('غیرِ گزارش.txt') !== -1, left.join(' · '));
  ok('۳.۴ با روزِ صفر هیچ‌چیز پاک نمی‌شود', pruneReportArchive_(0) === 0);
}

console.log('=== ۴) وارسیِ چیدمان: چه چیزی در ریشه جا دارد ===');
{
  // فایل‌های زندهٔ موتور — هیچ‌کدام نباید «ناشناخته» شمرده شوند
  put(STATUS_FILE, '{}');
  put(CFG.CODE_FILE, '{}');
  put(CFG.MUSIC_WISH_FILE, '{"items":[]}');
  put('_ENRICH-REQ-variety-007.json');
  put('_ENRICH-variety-007.json');
  OUT().createFile(CFG.HUB_FILE_NAME, '', 'text/plain');
  OUT().createFile('_PROMPT-monitor-v1.md', '#', 'text/markdown');
  OUT().createFile(CFG.OUT_README, '# نقشه', 'text/markdown');
  for (const d of [CFG.VARIETY_FOLDER, CFG.SPECIAL_FOLDER, CFG.CODE_FOLDER,
                   CFG.MUSIC_FOLDER, CFG.VOICE_AUDIT_FOLDER]) OUT().createFolder(d);

  const lay = outLayoutCheck_();
  ok('۴.۱ خطایی رخ نمی‌دهد', !lay.error, lay.error);
  ok('۴.۲ هیچ فایلِ زنده‌ای ناشناخته شمرده نمی‌شود', lay.strays.length === 0,
     lay.strays.map(x => x.name).join(' · '));
  ok('۴.۳ نقشهٔ پوشه دیده می‌شود', !!lay.readme);
  ok('۴.۴ پوشه‌های شناخته‌شده شمرده شده‌اند', lay.folders >= 6, String(lay.folders));
}

console.log('=== ۵) وارسیِ چیدمان: چه چیزی جا ندارد ===');
{
  OUT().createFile('یک فایلِ سرگردان.txt', 'x', 'text/plain');
  OUT().createFolder('پوشهٔ ناشناخته');
  const lay = outLayoutCheck_();
  const sn = lay.strays.map(x => x.name);
  ok('۵.۱ فایلِ سرگردان دیده می‌شود', sn.indexOf('یک فایلِ سرگردان.txt') !== -1,
     sn.join(' · '));
  ok('۵.۲ پوشهٔ ناشناخته دیده می‌شود', sn.indexOf('پوشهٔ ناشناخته') !== -1);
  const kinds = {}; lay.strays.forEach(x => { kinds[x.name] = x.kind; });
  ok('۵.۳ فایل و پوشه از هم جدا گزارش می‌شوند',
     kinds['یک فایلِ سرگردان.txt'] === 'فایل' && kinds['پوشهٔ ناشناخته'] === 'پوشه');
}

console.log('=== ۶) گزارشِ خوانده‌شده‌ای که در ریشه جا مانده ===');
{
  // بایگانی اگر شکست بخورد، فایل با نامِ «.ingested» در ریشه می‌ماند. آن حالت
  // نباید «سرگردان» شمرده شود (الگویش شناخته است) ولی باید جداگانه دیده شود،
  // وگرنه شکستِ بایگانی برای همیشه بی‌صدا می‌ماند.
  put('_REPORT-20260303.json.ingested', '{}');
  const lay = outLayoutCheck_();
  ok('۶.۱ سرگردان شمرده نمی‌شود',
     lay.strays.map(x => x.name).indexOf('_REPORT-20260303.json.ingested') === -1);
  ok('۶.۲ در فهرستِ «جا مانده» می‌آید',
     lay.stale.indexOf('_REPORT-20260303.json.ingested') !== -1, lay.stale.join(' · '));
}

console.log('=== ۷) نامِ فارسی نباید به الگوی باز تبدیل شود ===');
{
  // rxQuote_ کارش همین است: نقطه در «_STATUS.json» نباید هر نویسه‌ای را بپذیرد.
  const re = new RegExp('^' + rxQuote_(STATUS_FILE) + '$');
  ok('۷.۱ نامِ درست می‌گیرد', re.test('_STATUS.json'));
  ok('۷.۲ نامِ شبیه نمی‌گیرد', !re.test('_STATUSXjson'));
  ok('۷.۳ نامِ فارسیِ پوشه سالم می‌ماند',
     new RegExp('^' + rxQuote_(CFG.REPORT_ARCHIVE_FOLDER) + '$').test(CFG.REPORT_ARCHIVE_FOLDER));
}

console.log('=== ۸) مرزی که نباید جابه‌جا شود ===');
{
  // این‌ها با نام و فقط در ریشه جسته می‌شوند. اگر روزی کسی وسوسه شد یکی‌شان
  // را به زیرپوشه ببرد، این آزمون باید جلویش را بگیرد.
  const mustStay = [STATUS_FILE, CFG.CODE_FILE, CFG.HUB_FILE_NAME,
                    CFG.MUSIC_WISH_FILE, CFG.OUT_README];
  const pats = outRootFilePatterns_();
  for (const nm of mustStay) {
    ok('۸ «' + nm + '» در ریشه شناخته است',
       pats.some(p => p.re.test(nm)));
  }
  const src12 = fs.readFileSync('src/12_Reports.gs', 'utf8');
  ok('۸.۶ جست‌وجوی گزارشِ تازه هنوز فقط ریشه را می‌گردد',
     /function pendingReportFiles_[\s\S]*?folder\.getFiles\(\)/.test(src12));
  const src19 = fs.readFileSync('src/19_Enrich.gs', 'utf8');
  ok('۸.۷ هرسِ پرونده‌های غنی‌سازی هنوز ریشه را می‌گردد — پس آن‌ها نباید ' +
     'به زیرپوشه بروند',
     /function pruneEnrichFiles_[\s\S]*?outFolder_\(\)\.getFiles\(\)/.test(src19));
  // ۸.۷ فقط *متنِ* تابع را می‌سنجید. تا ۵٫۵۰ همین تابع هیچ‌جا صدا زده نمی‌شد،
  // یعنی نگهبانی که از هیچ نگهبانی نمی‌کرد: نقشهٔ پوشه می‌گفت «ده روز و پاک
  // می‌شوند» و هرگز پاک نمی‌شدند.
  const src21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۸.۷-ب و واقعاً از کارِ شبانه صدا زده می‌شود',
     /pruneEnrichFiles_\(\)/.test(src21));
}

console.log('=== ۸٫۵) بایگانیِ نسخه‌های کهنهٔ پرامپت ===');
{
  const OUTF = OUT();
  for (const n of ['_PROMPT-monitor-v1.md', '_PROMPT-monitor-v2.md',
                   '_PROMPT-enrich-v1.md', '_PROMPT-enrich-v2.md',
                   '_PROMPT-enrich-v3.md']) {
    OUTF.createFile(n, '#', 'text/markdown');
  }
  const before = rootFileNames().filter(n => /^_PROMPT-/.test(n)).length;
  const moved = promptPrune_();
  ok('۸٫۵-الف نسخه‌های کهنه بایگانی می‌شوند', moved > 0, 'جابه‌جا: ' + moved);
  const rootP = rootFileNames().filter(n => /^_PROMPT-/.test(n)).sort();
  ok('۸٫۵-ب فقط بالاترینِ هر خانواده در ریشه می‌ماند',
     rootP.join() === '_PROMPT-enrich-v3.md,_PROMPT-monitor-v2.md', rootP.join(' · '));
  // مهم‌ترین سنجه: هرچه از ریشه رفت باید در بایگانی باشد. اگر روزی این تابع
  // به‌جای جابه‌جایی چیزی را پاک کند، همین‌جا معلوم می‌شود.
  ok('۸٫۵-ج هیچ‌چیز پاک نشده — هرچه رفت، در بایگانی است',
     names(promptArchiveFolder_().getFiles()).length === moved &&
     rootP.length === before - moved,
     'بایگانی: ' + names(promptArchiveFolder_().getFiles()).length + ' · جابه‌جا: ' + moved);

  // مقایسه باید عددی باشد. با مقایسهٔ حرفی «v10» < «v9» است و روزی که به
  // نسخهٔ دهم برسیم، بایگانی نسخهٔ تازه را می‌برد و کهنه را نگه می‌دارد —
  // یعنی تسک تا ابد دستورِ قدیمی را می‌خواند. این سنجه همان روز را می‌گیرد.
  OUTF.createFile('_PROMPT-monitor-v9.md', '#', 'text/markdown');
  OUTF.createFile('_PROMPT-monitor-v10.md', '#', 'text/markdown');
  promptPrune_();
  const after = rootFileNames().filter(n => /^_PROMPT-monitor-/.test(n));
  ok('۸٫۵-د «v10» بالاتر از «v9» شمرده می‌شود، نه پایین‌تر',
     after.length === 1 && after[0] === '_PROMPT-monitor-v10.md', after.join(' · '));

  ok('۸٫۵-ه پوشهٔ بایگانیِ پرامپت در چیدمان شناخته است',
     outRootFolderNames_().indexOf(CFG.PROMPT_ARCHIVE_FOLDER) !== -1);
  ok('۸٫۵-و پس سرگردان شمرده نمی‌شود',
     outLayoutCheck_().strays.map(s => s.name).indexOf(CFG.PROMPT_ARCHIVE_FOLDER) === -1);
  ok('۸٫۵-ز یک نسخهٔ تنها جابه‌جا نمی‌شود', promptPrune_() === 0);
}

console.log('=== ۸٫۶) یادآورِ تازگیِ دستور — که خودش خفه نمی‌شود ===');
{
  const OUTF = OUT();
  // پاک‌سازیِ فایل‌های پرامپتِ آزمون‌های قبلی
  let it0 = OUTF.getFiles();
  while (it0.hasNext()) { const f = it0.next(); if (/^_PROMPT-/.test(f.getName())) f.setTrashed(true); }
  delete global.__PROPS[PK.PROMPT_DUE];

  OUTF.createFile('_PROMPT-monitor-v2.md', '> نسخه: 2\nمتن', 'text/markdown');
  ok('۸٫۶-الف بی بدهی، هیچ‌چیز کهنه نیست', promptFreshStatus_().stale.length === 0);

  // نسخه‌ای نصب شد که قرارداد را عوض کرده
  promptDueSet_('5.48');
  const s1 = promptFreshStatus_();
  ok('۸٫۶-ب دستورِ بی‌اعلام کهنه شمرده می‌شود',
     s1.stale.join() === 'monitor', JSON.stringify(s1.families));
  ok('۸٫۶-ج بدهی ثبت شده', s1.due === '5.48');

  // فایلِ تازه با اعلامِ درست → خودبه‌خود ساکت
  OUTF.createFile('_PROMPT-monitor-v3.md',
                  '> نسخه: 3\n> برای نسخهٔ موتور: 5.48\nمتن', 'text/markdown');
  ok('۸٫۶-د با فایلِ تازه خودبه‌خود ساکت می‌شود',
     promptFreshStatus_().stale.length === 0, JSON.stringify(promptFreshStatus_()));

  // اعلامِ عقب‌تر باز هم کهنه است
  OUTF.createFile('_PROMPT-enrich-v2.md',
                  '> نسخه: 2\n> برای نسخهٔ موتور: 5.40\nمتن', 'text/markdown');
  ok('۸٫۶-ه اعلامِ عقب‌تر از بدهی کهنه است',
     promptFreshStatus_().stale.join() === 'enrich');
  ok('۸٫۶-و رقمِ فارسی در اعلام هم خوانده می‌شود',
     promptDeclaredVer_(OUTF.createFile('_x.md', '> برای نسخهٔ موتور: ۵٫۵۰', 'text/markdown')) === '5.50');

  // بدهی فقط جلو می‌رود
  promptDueSet_('5.10');
  ok('۸٫۶-ز بدهی عقب نمی‌آید', promptFreshStatus_().due === '5.48');

  /* بدهیِ خانواده‌دار (۵٫۵۲).
   *
   * تا اینجا بدهی همهٔ خانواده‌ها را با هم کهنه می‌کرد. یعنی تقویمِ ۵٫۵۲ که
   * فقط به کارِ ناظر ربط دارد، تسکِ غنی‌سازی را هم کهنه اعلام می‌کرد و هر شب
   * یک ردیفِ دروغ می‌ساخت. هشداری که برای هیچ می‌آید، همان است که آدم یاد
   * می‌گیرد نادیده بگیرد — و آن‌وقت هشدارِ واقعی هم گم می‌شود. */
  delete global.__PROPS[PK.PROMPT_DUE];
  delete global.__PROPS[PK.PROMPT_DUE_KINDS];
  promptDueSet_('5.52', ['monitor']);
  const sK = promptFreshStatus_();
  ok('۸٫۶-ط بدهیِ خانواده‌دار فقط همان خانواده را کهنه می‌کند',
     sK.stale.join() === 'monitor', JSON.stringify(sK.families));
  ok('۸٫۶-ی و خانواده‌های هدف در وضعیت دیده می‌شوند',
     sK.kinds.join() === 'monitor', JSON.stringify(sK.kinds));

  // خالی یعنی «نمی‌دانم، پس همه» — محافظه‌کارانه، مثلِ رفتارِ پیش از ۵٫۵۲
  delete global.__PROPS[PK.PROMPT_DUE];
  delete global.__PROPS[PK.PROMPT_DUE_KINDS];
  promptDueSet_('5.52');
  ok('۸٫۶-ک بی اعلامِ خانواده، همه کهنه‌اند',
     promptFreshStatus_().stale.length === 2, JSON.stringify(promptFreshStatus_().stale));

  /* و آن سرِ دیگرِ ماجرا: نسخه‌ای با promptImpactِ خالی اصلاً نباید بدهی
   * بسازد. پیشتر هر نصبی بدهی می‌ساخت، پس ۵٫۴۹ و ۵٫۵۰ و ۵٫۵۱ — هیچ‌کدام
   * مربوط به دستورها — هم فایلِ تازه می‌خواستند. */
  {
    const realMan = global.readCodeManifest_;
    const realTg = global.tgSend_, realMail = global.MailApp;
    global.tgSend_ = () => {}; global.MailApp = { sendEmail: () => {} };
    global.readCodeManifest_ = () => ({ info: { version: '9.9' }, file: null });
    const r0 = promptImpactNotice_('9.9');
    ok('۸٫۶-ل نسخهٔ بی‌اثر بدهی نمی‌سازد', r0.sent === false);
    global.readCodeManifest_ = () => ({ info: { version: '9.9',
      promptImpact: ['یک چیز'], promptImpactKinds: ['enrich'] }, file: null });
    const r1 = promptImpactNotice_('9.9');
    ok('۸٫۶-م و خانواده‌ها از manifest می‌آیند',
       r1.sent === true && r1.kinds.join() === 'enrich', JSON.stringify(r1.kinds));
    global.readCodeManifest_ = realMan;
    global.tgSend_ = realTg; global.MailApp = realMail;
  }

  // وضع را برای سنجه‌های بعدی به همان حالِ قبل برگردان
  delete global.__PROPS[PK.PROMPT_DUE_KINDS];
  global.__PROPS[PK.PROMPT_DUE] = '5.48';

  // و مهم‌ترین سنجه: ردیفی که این یادآور می‌سازد نباید با نصبِ کد بسته شود.
  // نسخهٔ قبلیِ این یادآور شمارهٔ نسخه در عنوانش داشت و دقیقاً همین بلا سرش آمد.
  const row = [];
  row[RC.ID - 1] = 'prompt-stale';
  row[RC.TITLE - 1] = 'دستورِ روتین/تسک از کدِ در حالِ اجرا عقب مانده است';
  ok('۸٫۶-ح یادآور با نصبِ کد خودش را نمی‌بندد',
     codeRowSatisfied_(row) === false, 'هدف: «' + codeRowTargetVer_(row) + '»');
  // و برای مقایسه: شکلِ قدیمی واقعاً بسته می‌شد
  const old = [];
  old[RC.ID - 1] = 'promptimpact-5.46';
  old[RC.TITLE - 1] = 'دستورِ روتین‌ها با نسخهٔ 5.46 هماهنگ نیست';
  ok('۸٫۶-ط (شاهد) شکلِ قدیمی بسته می‌شد — همان باگ', codeRowSatisfied_(old) === true);
}

console.log('=== ۹) نقشهٔ پوشه: ریپو منبع است، درایو بازتاب ===');
{
  const doc = fs.readFileSync('docs/drive_layout.md', 'utf8');
  ok('۹.۱ فایلِ نقشه در ریپو هست', doc.length > 500);
  ok('۹.۲ مسیرش همان است که تنظیمات می‌گوید',
     CFG.OUT_README_PATH === 'docs/drive_layout.md');
  for (const nm of [CFG.REPORT_ARCHIVE_FOLDER, CFG.VOICE_AUDIT_FOLDER, CFG.MUSIC_FOLDER,
                    CFG.VARIETY_FOLDER, CFG.SPECIAL_FOLDER, CFG.CODE_FOLDER]) {
    ok('۹ نقشه پوشهٔ «' + nm + '» را نام می‌برد', doc.indexOf(nm) !== -1);
  }
  ok('۹.۹ جدولِ تاریخچهٔ چیدمان دارد', doc.indexOf('تاریخچهٔ تغییرهای چیدمان') !== -1);

  // بازتاب: بار اول می‌نویسد، بار دوم که متن عوض نشده دوباره نمی‌نویسد.
  global.__STUB = (url) => (String(url).indexOf('drive_layout.md') !== -1)
    ? { code: 200, text: doc } : { code: 404, text: '' };
  const it0 = OUT().getFilesByName(CFG.OUT_README);
  while (it0.hasNext()) it0.next().setTrashed(true);
  const r1 = outReadmeSync_();
  ok('۹.۱۰ بار اول نوشته می‌شود', r1.ok && r1.changed, JSON.stringify(r1));
  const r2 = outReadmeSync_();
  ok('۹.۱۱ بار دوم بی‌تغییر رد می‌شود', r2.ok && !r2.changed, JSON.stringify(r2));

  global.__STUB = () => ({ code: 404, text: '' });
  const r3 = outReadmeSync_();
  ok('۹.۱۲ نبودنِ فایل در ریپو نقشهٔ موجود را پاک نمی‌کند',
     !r3.ok && OUT().getFilesByName(CFG.OUT_README).hasNext());
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
