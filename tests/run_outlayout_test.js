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
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs'];
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
