/* Runs the DELIVERED single-file build (not the split modules) against the real
   five sources, to be sure the paste-ready file behaves identically. */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const MODE = process.argv[2] || 'file';
if (MODE === 'file') {
  (0, eval)(fs.readFileSync('engine.gs', 'utf8'));
} else {
  const DIR = 'src/';
  const FF = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
              '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs'];
  let S = ''; for (const f of FF) S += '\n' + fs.readFileSync(DIR + f, 'utf8');
  (0, eval)(S);
}

const NEW = JSON.parse(fs.readFileSync('tests/fixtures/newsheets.json', 'utf8'));
const rd = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const vids = rd('tests/fixtures/videos.jsonl'), phos = rd('tests/fixtures/photos.jsonl');
const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اشخاص شناسایی شده (JSON)',
  '🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی',
  'مشخصات فنی (JSON)','تحلیل محتوا (JSON)','تحلیل صوتی','تحلیل بصری','نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اطلاعات پایه تصویر (JSON)',
  'استخراج متن (JSON)','اشخاص شناسایی شده (JSON)','مکان‌های شناسایی شده (JSON)','تحلیل محتوا (JSON)',
  'تحلیل فنی (JSON)','کاربردهای توصیه شده (JSON)','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];
function mk(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 10); });
  global.__SS[id] = ss;
}
mk(CFG.VIDEO_SHEET_ID, [{name:'S1', hdr:VH, rows: vids.map(v=>[v.date,v.fileId,'o','n',v.link,'[]','{}','{}',
  v.transcript,v.vibe,v.expert,'{}',JSON.stringify(v.content),'','','',v.summary,'SUCCESS'])}]);
mk(CFG.PHOTO_SHEET_ID, [{name:'S1', hdr:PH, rows: phos.map(p=>[p.date,p.fileId,'o','n',p.link,'{}',
  JSON.stringify(p.text),'[]','[]',JSON.stringify(p.content),'{}','[]',p.vibe,p.summary,p.special||'','SUCCESS'])}]);
mk('19QNuF9v4zQ5FCfd5M8iMZkDLRBruXN9yxnYFKzfU2S0', NEW.trading);
mk('1Bg_iz9m7366jMfqrNGztQoRNM9Ej4KgQ3YTxjcISnF4', NEW.general);
mk('1QVNfUtX1gmomOjD8h2PHWIdDnCVewPo5STZT_QGkDv4', NEW.resvid);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

const nolog = console.log; console.log = () => {};
let g = 0; while (g++ < 60) syncCatalog();
console.log = nolog;
const hub = getHub_();
const idx = hub.getSheetByName(CFG.TAB_INDEX);
const tot = idx.getRange(2, 1, idx.getLastRow() - 1, INDEX_HEADERS.length).getValues()
              .find(r => String(r[0]).indexOf('جمع کل') !== -1);
const bl = chunkBacklog_(hub);
console.log(JSON.stringify({ mode: MODE, v: Number(tot[IX.V]), p: Number(tot[IX.P]),
  a: Number(tot[IX.A]), d: Number(tot[IX.D]), total: Number(tot[IX.TOTAL]),
  elig: Number(tot[IX.ELIG]), staged: bl.rows, pendingFiles: bl.files }));

// ── سرآیندِ engine.gs باید همان CODE_VERSION را بگوید ──────────────────────
// باگِ واقعی: نسخه در build_header.txt دستی نوشته شده بود و از ۵٫۱۲ به بعد جا
// ماند؛ فایلِ نصب‌شده ۵٫۱۶ بود ولی بالایش «۵٫۱۲» می‌نوشت و کاربر فکر کرد نصب
// نشده. حالا build.js نسخه را تزریق می‌کند و این آزمون نگهبانش است.
{
  const eng = fs.readFileSync('engine.gs', 'utf8');
  const cfg = fs.readFileSync('src/00_Config.gs', 'utf8');
  const want = (cfg.match(/CODE_VERSION:\s*'([^']+)'/) || [])[1];
  const head = eng.slice(0, 400);
  const inHead = (head.match(/نسخهٔ\s*([0-9.]+)/) || [])[1];
  const inFile = (eng.match(/CODE_VERSION:\s*'([^']+)'/) || [])[1];
  const okHead = inHead === want, okFile = inFile === want;
  console.log('  نسخه — src:', want, '| سرآیندِ engine.gs:', inHead, '| CODE_VERSION:', inFile);
  console.log('  ' + (okHead ? '✅' : '❌') + ' سرآیند با CODE_VERSION یکی است');
  console.log('  ' + (okFile ? '✅' : '❌') + ' نسخهٔ داخلِ فایل با src یکی است');
  if (!okHead || !okFile) { console.error('FAILED: نسخهٔ سرآیند/فایل جا مانده'); process.exit(1); }
  if (fs.readFileSync('tools/build_header.txt', 'utf8').indexOf('{{VERSION}}') === -1) {
    console.error('FAILED: جای‌نشانِ {{VERSION}} از build_header.txt حذف شده'); process.exit(1);
  }
  console.log('  ✅ جای‌نشانِ {{VERSION}} سرِ جایش است');
}
