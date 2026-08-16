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
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];
const HEADER = fs.readFileSync(path.join(__dirname, 'build_header.txt'), 'utf8');
let out = HEADER + '\n\n';
for (const f of FILES) {
  out += '\n/* ═══════════════════════════ ' + f + ' ═══════════════════════════ */\n\n';
  out += fs.readFileSync(DIR + f, 'utf8').replace(/\s+$/, '') + '\n';
}
fs.writeFileSync(OUT, out);
console.log('built', out.length, 'chars from', FILES.length, 'files ->', path.relative(ROOT, OUT) || OUT);
