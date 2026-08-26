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
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs'];
// نسخه از تنها منبعِ حقیقتش خوانده می‌شود و در سرآیند می‌نشیند. پیشتر نسخه در
// build_header.txt دستی نوشته شده بود و از ۵٫۱۲ به بعد جا ماند: فایلِ نصب‌شده
// «۵٫۱۶» بود ولی بالایش «۵٫۱۲» می‌نوشت. حالا drift ساختاراً ممکن نیست.
const CFG_SRC = fs.readFileSync(DIR + '00_Config.gs', 'utf8');
const VER_M = CFG_SRC.match(/CODE_VERSION:\s*'([^']+)'/);
if (!VER_M) { console.error('✗ CODE_VERSION در src/00_Config.gs پیدا نشد.'); process.exit(1); }
const VERSION = VER_M[1];
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
fs.writeFileSync(OUT, out);
console.log('built v' + VERSION + ' —', out.length, 'chars from', FILES.length,
            'files ->', path.relative(ROOT, OUT) || OUT);
