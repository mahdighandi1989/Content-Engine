/* Feeds the engine the THREE REAL new sheets (all tabs, real rows) plus the two
   legacy sheets, and checks:
     A) automatic tab detection — kind per tab, auxiliary tabs skipped
     B) chunk grouping: many chunk rows of one file collapse into ONE item,
        ordered by chunk number even when the chunks are scattered
     C) the two roll-up flavours: rich roll-up used directly, stub roll-up
        assembled from the chunks
     D) orphan chunks (roll-up never arrives) wait, then assemble on timeout
     E) the source sheets are never written to
     F) dashboard + episode selection across four kinds                        */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

const NEW = JSON.parse(fs.readFileSync('tests/fixtures/newsheets.json', 'utf8'));
const rd = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const vids = rd('tests/fixtures/videos.jsonl');
const phos = rd('tests/fixtures/photos.jsonl');

const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اشخاص شناسایی شده (JSON)',
  '🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی',
  'مشخصات فنی (JSON)','تحلیل محتوا (JSON)','تحلیل صوتی','تحلیل بصری','نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اطلاعات پایه تصویر (JSON)',
  'استخراج متن (JSON)','اشخاص شناسایی شده (JSON)','مکان‌های شناسایی شده (JSON)','تحلیل محتوا (JSON)',
  'تحلیل فنی (JSON)','کاربردهای توصیه شده (JSON)','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];

// ---- build read-only source spreadsheets ---------------------------------
const WRITES = [];
function seal(sh, label) {
  for (const m of ['setValues','setValue','clearContent']) {
    const R = Object.getPrototypeOf(sh.getRange(1,1,1,1));
    if (!R['__sealed_' + m]) {
      const orig = R[m];
      R[m] = function (...a) {
        if (this.sh.__readonly) { WRITES.push(this.sh.__label + '/' + m); throw new Error('source write!'); }
        return orig.apply(this, a);
      };
      R['__sealed_' + m] = true;
    }
  }
  sh.appendRow = function () { WRITES.push(label + '/appendRow'); throw new Error('source write!'); };
  sh.__readonly = true; sh.__label = label;
}
function mkMulti(id, tabs, label) {
  const ss = new Spread('s', id);
  tabs.forEach(t => {
    const sh = ss.insertSheet(t.name);
    sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice()));
    sh._max = Math.max(1000, sh._d.length + 10);
    seal(sh, label + '/' + t.name);
  });
  global.__SS[id] = ss;
  return ss;
}
function mkLegacy(id, hdr, rows, label) {
  return mkMulti(id, [{ name: 'S1', hdr: hdr, rows: rows }], label);
}

const vrows = vids.map(v => [v.date, v.fileId, 'o', 'n', v.link, '[]','{}','{}',
  v.transcript, v.vibe, v.expert, '{}', JSON.stringify(v.content), '', '', '',
  v.summary, 'SUCCESS']);
const prows = phos.map(p => [p.date, p.fileId, 'o', 'n', p.link, '{}',
  JSON.stringify(p.text), '[]','[]', JSON.stringify(p.content), '{}','[]',
  p.vibe, p.summary, p.special || '', 'SUCCESS']);

mkLegacy(CFG.VIDEO_SHEET_ID, VH, vrows, 'RESULT');
mkLegacy(CFG.PHOTO_SHEET_ID, PH, prows, 'RESULT-PHOTO');
mkMulti('19QNuF9v4zQ5FCfd5M8iMZkDLRBruXN9yxnYFKzfU2S0', NEW.trading, 'Trading');
mkMulti('1Bg_iz9m7366jMfqrNGztQoRNM9Ej4KgQ3YTxjcISnF4', NEW.general, 'General');
mkMulti('1QVNfUtX1gmomOjD8h2PHWIdDnCVewPo5STZT_QGkDv4', NEW.resvid, 'ResVideo');
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

// ================= A) tab detection =====================================
console.log('=== الف) تشخیص خودکار نوع هر تب ===');
let detected = 0, skipped = 0;
for (const [key, tabs] of Object.entries(NEW)) {
  for (const t of tabs) {
    const d = srcDetect_(t.hdr);
    const tag = d ? (d.kind + (d.chunked ? ' [قطعه‌دار]' : '')) : '— رد شد —';
    if (d) detected++; else skipped++;
    console.log('  ' + key.padEnd(8) + ' / ' + t.name.padEnd(22) + ' → ' + tag);
  }
}
console.log('  خلاصه:', detected, 'تب محتوایی،', skipped, 'تب جانبی رد شد');
if (detected !== 10) throw new Error('❌ تعداد تب‌های محتوایی باید ۱۰ باشد، شد ' + detected);

// what the raw data says the answer should be
const expect = {
  'general/Video Analysis':'ویدیو','general/Audio Analysis':'صدا',
  'general/Image Analysis':'عکس','general/Document Analysis':'سند',
  'trading/Video Analysis':'ویدیو','trading/Audio Analysis':'صدا',
  'trading/Image Analysis':'عکس','trading/Document Analysis':'سند',
  'resvid/تحلیل ویدیو':'ویدیو','resvid/تحلیل صدا':'صدا'
};
for (const [k, want] of Object.entries(expect)) {
  const [srcK, tabN] = k.split('/');
  const t = NEW[srcK].find(x => x.name === tabN);
  const got = srcDetect_(t.hdr);
  if (!got || got.kind !== want) throw new Error('❌ ' + k + ' → ' + (got && got.kind) + ' (باید ' + want + ')');
}
console.log('  ✅ هر ده تب درست شناسایی شد و شش تبِ تاریخچه رد شد');

// ================= run the sync to completion ============================
console.log('\n=== همگام‌سازی کامل هر پنج منبع ===');
function syncDone() {
  const lg = getHub_().getSheetByName(CFG.TAB_LOG);
  const n = Math.min(4, lg.getLastRow() - 1);
  if (n < 1) return false;
  const v = lg.getRange(lg.getLastRow() - n + 1, 2, n, 1).getValues();
  return v.some(r => String(r[0]).indexOf('(کامل)') !== -1);
}
let guard = 0;
while (guard++ < 200) { syncCatalog(); if (syncDone()) break; }
console.log('  اجراهای لازم:', guard);
const hub = getHub_();

if (WRITES.length) throw new Error('❌ در شیت منبع نوشته شد: ' + WRITES.join(', '));
console.log('  ✅ هیچ نوشتنی در پنج شیت منبع انجام نشد');

// ================= B/C) chunk collapse ==================================
console.log('\n=== ب) جمع‌شدن قطعه‌ها در یک آیتم ===');
const names = TAXONOMY.map(t => t.title).concat([MISC_TITLE]);
const all = [];
for (const n of names) {
  const sh = hub.getSheetByName(n);
  if (!sh || sh.getLastRow() < 2) continue;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, HUB_HEADERS.length).getValues();
  v.forEach(r => { if (r[COL.ID - 1]) all.push({ cat: n, r: r }); });
}
console.log('  آیتم‌های بانک:', all.length);
const byKind = {};
all.forEach(x => byKind[x.r[COL.KIND - 1]] = (byKind[x.r[COL.KIND - 1]] || 0) + 1);
console.log('  به تفکیک نوع:', JSON.stringify(byKind));

// the trading video file had 34 chunk rows + 1 stub roll-up → must be ONE item
const TR = '1mlR_aNHt9_yEV9YFtdd1X6yXhuPPp7bU';
const trItems = all.filter(x => x.r[COL.ID - 1] === TR);
console.log('  فایل ۳۴-قطعه‌ای ترید → آیتم‌های ساخته‌شده:', trItems.length);
if (trItems.length !== 1) throw new Error('❌ باید دقیقاً یک آیتم می‌شد');
const tr = trItems[0].r;
console.log('     دسته      :', trItems[0].cat);
console.log('     قطعات     :', tr[COL.PARTS - 1]);
console.log('     موضوع     :', String(tr[COL.TOPIC - 1]).slice(0, 90));
console.log('     خلاصه     :', String(tr[COL.SUMMARY - 1]).length, 'نویسه');
console.log('     پیام کلیدی:', String(tr[COL.MSG - 1]).length, 'نویسه');
console.log('     متن       :', String(tr[COL.BODY - 1]).length, 'نویسه');
console.log('     لینک      :', String(tr[COL.LINK - 1]).slice(0, 60));
console.log('     امتیاز    :', tr[COL.SCORE - 1]);
if (String(tr[COL.SUMMARY - 1]).indexOf('قطعه موفق') !== -1)
  throw new Error('❌ خلاصهٔ نشانگر به‌جای محتوای واقعی نوشته شد');
if (String(tr[COL.SUMMARY - 1]).length < 600)
  throw new Error('❌ خلاصه از سراسر قطعه‌ها جمع نشده: ' + String(tr[COL.SUMMARY-1]).length);
if (String(tr[COL.LINK - 1]).indexOf('drive.google.com') === -1)
  throw new Error('❌ لینک مرجع نیامد');
console.log('  ✅ محتوا از قطعه‌ها ساخته شد، نه از ردیف نشانگر');

// the rich roll-up path: General document files
console.log('\n=== ج) ردیف جمع‌بندیِ غنی (General) مستقیم استفاده شود ===');
const DOCID = '180msRuSmBaE_EVq9Ex1sQdc4gu5o1lQP';
const docItems = all.filter(x => String(x.r[COL.KIND - 1]) === 'سند');
console.log('  آیتم‌های سند:', docItems.length);
docItems.slice(0, 6).forEach(x => console.log('     -', x.cat, '|',
  String(x.r[COL.TOPIC - 1]).slice(0, 60), '| خلاصه', String(x.r[COL.SUMMARY-1]).length,
  '| قطعات:', x.r[COL.PARTS - 1] || '—'));
if (docItems.length < 5) throw new Error('❌ پنج سندِ General باید آیتم شده باشند');
console.log('  ✅ سندها آمدند و خلاصهٔ کاملشان حفظ شد');

// ================= scattered-order test =================================
console.log('\n=== ترتیب قطعه‌های پراکنده ===');
// build a synthetic tab where chunks of two files alternate, out of order
const HDR = NEW.general.find(t => t.name === 'Audio Analysis').hdr;
const ix = n => HDR.indexOf(n);
function chunkRowFor(fid, no, tot, text) {
  const r = new Array(HDR.length).fill('');
  r[ix('Timestamp')] = '2026-05-0' + (1 + (no % 8)) + ' 10:00:00';
  r[ix('File_ID')] = fid; r[ix('File_Name')] = fid + '.mp3';
  r[ix('Is_Chunk')] = 'بله'; r[ix('Chunk_Number')] = no; r[ix('Total_Chunks')] = tot;
  r[ix('Domain_Detected')] = 'آموزشی، علمی'; r[ix('Content_Type')] = 'سخنرانی';
  r[ix('Main_Subject')] = 'ساختار حافظه در مغز';
  r[ix('Key_Points')] = JSON.stringify(['نکتهٔ شمارهٔ ' + no + ' دربارهٔ ' + text]);
  r[ix('Executive_Summary')] = 'بخش ' + no + ': ' + text + ' '.repeat(1) +
    'توضیح مفصل این بخش برای رسیدن به طول واقعی یک خلاصهٔ اجرایی واقعی. ';
  r[ix('Full_Transcription')] = 'گفتار بخش ' + no + ' — ' + text;
  r[ix('Status')] = 'CHUNK_' + no;
  return r;
}
const SC = [], A = 'SCATTER_A', B = 'SCATTER_B';
const seq = [[A,3],[B,1],[A,1],[B,3],[A,4],[B,2],[A,2],[A,5],[B,4]];
const words = { 1:'مقدمه', 2:'تعریف', 3:'آزمایش', 4:'نتیجه', 5:'جمع‌بندی' };
seq.forEach(([f,n]) => SC.push(chunkRowFor(f, n, f === A ? 5 : 4, words[n])));
// roll-up markers, stub style
[[A,5],[B,4]].forEach(([f,t]) => {
  const r = new Array(HDR.length).fill('');
  r[ix('Timestamp')] = '2026-05-09 12:00:00';
  r[ix('File_ID')] = f; r[ix('Is_Chunk')] = 'خیر';
  r[ix('File_Link')] = 'https://drive.google.com/file/d/' + f + '/view';
  r[ix('New_Name')] = f + '_joined.mp3';
  r[ix('Full_Transcription')] = 'ترکیب قطعات';
  r[ix('Executive_Summary')] = t + ' از ' + t + ' قطعه صوتی';
  r[ix('Status')] = 'COMPLETED';
  SC.push(r);
});
const scSS = mkMulti('SCATTER_SHEET', [{ name: 'Audio Analysis', hdr: HDR, rows: SC }], 'Scatter');
CFG.SOURCES.push({ key: 'scatter', id: 'SCATTER_SHEET', title: 'آزمون پراکندگی', schema: 'auto' });
guard = 0;
while (guard++ < 40) { syncCatalog(); if (syncDone()) break; }
function findItem(id) {
  for (const n of names) {
    const sh = hub.getSheetByName(n);
    if (!sh || sh.getLastRow() < 2) continue;
    const v = sh.getRange(2, 1, sh.getLastRow() - 1, HUB_HEADERS.length).getValues();
    for (const r of v) if (r[COL.ID - 1] === id) return { cat: n, r: r };
  }
  return null;
}
for (const [f, n] of [[A,5],[B,4]]) {
  const it = findItem(f);
  if (!it) throw new Error('❌ آیتم ' + f + ' ساخته نشد');
  const s = String(it.r[COL.SUMMARY - 1]);
  const order = [];
  ['مقدمه','تعریف','آزمایش','نتیجه','جمع‌بندی'].slice(0, n).forEach(w => {
    const p = s.indexOf(w); if (p !== -1) order.push([w, p]);
  });
  const sorted = order.slice().sort((a, b) => a[1] - b[1]).map(x => x[0]).join(' → ');
  console.log('  %s: قطعات=%s | ترتیب بازسازی‌شده: %s', f, it.r[COL.PARTS - 1], sorted);
  const wantOrder = ['مقدمه','تعریف','آزمایش','نتیجه','جمع‌بندی'].slice(0, n).join(' → ');
  if (sorted !== wantOrder) throw new Error('❌ ترتیب قطعه‌ها بازسازی نشد: ' + sorted);
}
console.log('  ✅ قطعه‌های درهم‌ریخته و پراکندهٔ دو فایل، هر کدام به ترتیب درست بازسازی شدند');

// ================= D) orphan chunks =====================================
console.log('\n=== د) قطعه‌های بی‌جمع‌بندی (فایل نیمه‌کاره در منبع) ===');
const ORPH = 'ORPHAN_X';
const OR = [1,2,3].map(n => chunkRowFor(ORPH, n, 7, 'بخش سرگردان'));
mkMulti('ORPHAN_SHEET', [{ name: 'Audio Analysis', hdr: HDR, rows: OR }], 'Orphan');
CFG.SOURCES.push({ key: 'orphan', id: 'ORPHAN_SHEET', title: 'آزمون سرگردان', schema: 'auto' });
syncCatalog();
function stagedIds() {
  const sh = hub.getSheetByName(CFG.CHUNK_TAB);
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, CH.ID + 1).getValues();
  const s = new Set(); v.forEach(r => { if (r[CH.ID]) s.add(String(r[CH.ID])); });
  return [...s];
}
let bl = chunkBacklog_(hub);
console.log('  پس از اسکن: در انبار', bl.rows, 'قطعه از', bl.files, 'فایل | آیتم ساخته شد:',
            !!findItem(ORPH));
console.log('  فایل‌های در انتظار (شاملِ ناقص‌های واقعیِ سه شیت):');
stagedIds().forEach(id => console.log('     -', id));
if (findItem(ORPH)) throw new Error('❌ فایل ناقص نباید هنوز آیتم شود');
if (stagedIds().indexOf(ORPH) === -1) throw new Error('❌ قطعه‌های سرگردان در انبار نماندند');

// age the staged rows past the wait window
const chTab = hub.getSheetByName(CFG.CHUNK_TAB);
const cv = chTab.getRange(2, 1, chTab.getLastRow() - 1, CHUNK_HEADERS.length).getValues();
cv.forEach(r => { if (r[CH.ID] === ORPH) r[CH.ADDED] = '2020-01-01 00:00'; });
chTab.getRange(2, 1, cv.length, CHUNK_HEADERS.length).setValues(cv);
syncCatalog();
const orph = findItem(ORPH);
console.log('  پس از سرآمدنِ مهلت', CFG.CHUNK_WAIT_HOURS, 'ساعته → آیتم ساخته شد:', !!orph);
if (!orph) throw new Error('❌ پس از مهلت هم ساخته نشد');
console.log('     قطعات:', orph.r[COL.PARTS - 1], '| خلاصه:',
            String(orph.r[COL.SUMMARY - 1]).length, 'نویسه | لینک:',
            String(orph.r[COL.LINK - 1]).indexOf('drive.google.com') !== -1 ? 'ساخته شد از شناسه ✅' : '❌');
bl = chunkBacklog_(hub);
console.log('  انبار پس از ترکیب:', bl.rows, 'قطعه');

// ================= idempotence =========================================
console.log('\n=== تکرارنشدن در اسکن دوباره ===');
const countAll = () => {
  let c = 0;
  for (const n of names) {
    const sh = hub.getSheetByName(n);
    if (sh && sh.getLastRow() > 1) c += sh.getLastRow() - 1;
  }
  return c;
};
const c1 = countAll();
syncCatalog(); syncCatalog();
const c2 = countAll();
console.log('  آیتم‌ها پیش:', c1, '| پس از دو سینک دیگر:', c2, c1 === c2 ? '✅' : '❌');
if (c1 !== c2) throw new Error('❌ سینک دوباره آیتم تکراری ساخت');

// re-scan everything from scratch (cursors reset, hub kept) → still no dupes
for (const k of Object.keys(global.__PROPS)) {
  if (k === PK.CUR_VIDEO || k === PK.CUR_PHOTO || k.indexOf(PK.CUR_PREFIX) === 0)
    delete global.__PROPS[k];
}
guard = 0;
while (guard++ < 200) { syncCatalog(); if (syncDone()) break; }
const c3 = countAll();
console.log('  پس از اسکنِ کاملِ دوباره از صفر:', c3, c3 === c2 ? '✅ بدون تکرار' : '❌ تکراری ساخت');
if (c3 !== c2) throw new Error('❌ اسکن دوباره از صفر تکرار ساخت: ' + c2 + ' → ' + c3);

// ================= F) dashboard =========================================
console.log('\n=== ه) داشبورد چهار نوع ===');
const idx = hub.getSheetByName(CFG.TAB_INDEX);
const iv = idx.getRange(2, 1, idx.getLastRow() - 1, INDEX_HEADERS.length).getValues();
console.log('  ' + INDEX_HEADERS.slice(0, 10).join(' | '));
const pad = (x, n) => String(x).padStart(n);
iv.filter(r => r[0] && Number(r[IX.TOTAL]) > 0).forEach(r =>
  console.log('  ' + String(r[IX.CAT]).padEnd(26) + pad(r[IX.V],5) + pad(r[IX.P],5) +
    pad(r[IX.A],5) + pad(r[IX.D],5) + pad(r[IX.TOTAL],7) + pad(r[IX.USED],7) +
    pad(r[IX.LEFT],7) + pad(r[IX.ELIG],7) + pad(r[IX.FRESH],6)));
const tot = iv.find(r => String(r[0]).indexOf('جمع کل') !== -1);
console.log('  جمع کل → ویدیو', tot[IX.V], '| عکس', tot[IX.P], '| صدا', tot[IX.A],
            '| سند', tot[IX.D], '| واجد شرایط', tot[IX.ELIG]);
if (!Number(tot[IX.A]) || !Number(tot[IX.D])) throw new Error('❌ صدا/سند در داشبورد نیامد');

// finance category must have picked up the trading material
const fin = iv.find(r => r[0] === 'مالی، ترید و اقتصاد');
console.log('  دستهٔ مالی:', fin[IX.TOTAL], 'آیتم');
if (!Number(fin[IX.TOTAL])) throw new Error('❌ دستهٔ مالی خالی ماند');
console.log('  ✅ داشبورد چهار نوع را جدا می‌شمارد و دستهٔ مالی پر شد');

console.log('\n✅ همهٔ آزمون‌های منابع تازه گذشت.');

// ================= F) a full episode across four kinds ==================
console.log('\n=== و) تولید یک قسمت با هر چهار نوع ===');
let curatorPrompt = '', writerPrompt = '';
global.__STUB = function (url, body) {
  if (url.indexOf('/v1beta/models?') !== -1)
    return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  const t = body.contents ? body.contents[0].parts[0].text : '';
  if (t.indexOf('سردبیرِ یک برنامهٔ رادیویی') !== -1) {
    curatorPrompt = t;
    const cand = [...t.matchAll(/- id: (\S+) \|/g)].map(m => m[1]);
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      theme: 'یک نخِ آزمایشی', connection: 'از واژهٔ مشترک',
      chosen: cand.slice(0, 12).map(id => ({ id, role: 'نمونه' })), rejected: [] }) }] } }] } };
  }
  if (url.indexOf('tts') !== -1)
    return { code: 200, json: { candidates: [{ content: { parts: [{
      inlineData: { data: Buffer.alloc(60000).toString('base64') } }] } }] } };
  writerPrompt = t;
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'قسمت آزمایشی چهار‌نوعی', hook: 'قلاب.',
    sections: [{ heading: 'بخش یک', narration: 'متن نمونه. '.repeat(40), tone: 'آرام',
                 sourceIds: ids.slice(0, 6) },
               { heading: 'بخش دو', narration: 'متن نمونه دوم. '.repeat(40), tone: 'گرم',
                 sourceIds: ids.slice(6, 12) }],
    outro: 'پایان.', summary: 'خلاصه.', tags: ['الف'] }) }] } }] } };
};
global.ScriptApp.getProjectTriggers = () => [];

// pick the category that actually holds all four kinds
const idxRows = readIndex_(hub);
const kindsPresent = r => [r.nV, r.nP, r.nA, r.nD].filter(x => x > 0).length;
const rich = idxRows.filter(r => r.nA > 0 || r.nD > 0)
  .sort((a, b) => (kindsPresent(b) - kindsPresent(a)) ||
                  ((b.nV + b.nP + b.nA + b.nD) - (a.nV + a.nP + a.nA + a.nD)))[0];
console.log('  دستهٔ آزمون:', rich.name, '→ ویدیو', rich.nV, '| عکس', rich.nP,
            '| صدا', rich.nA, '| سند', rich.nD);
const stats = tabStats_(hub, rich.name, CFG.MIN_PRIORITY);
const cands = buildCandidates_(stats.rows);
const cKinds = {};
cands.forEach(c => cKinds[c.kind] = (cKinds[c.kind] || 0) + 1);
console.log('  ترکیب فهرست نامزدها:', JSON.stringify(cKinds));
if (!cKinds['صدا'] && !cKinds['سند'])
  throw new Error('❌ صدا/سند به فهرست نامزدها راه پیدا نکرد');

const items = fetchRows_(stats.sheet, rich.name, cands.map(x => x.row));
const mixed = enforceMix_(items.slice(0, CFG.ITEMS_PER_EPISODE), items, CFG.ITEMS_PER_EPISODE);
const mKinds = {};
mixed.forEach(c => mKinds[kindOf_(c)] = (mKinds[kindOf_(c)] || 0) + 1);
console.log('  ترکیب نهایی قسمت:', JSON.stringify(mKinds), '| جمع', mixed.length);
if (mixed.length > CFG.ITEMS_PER_EPISODE) throw new Error('❌ از سقف آیتم گذشت');
if ((mKinds['ویدیو'] || 0) < CFG.MIN_KIND_ITEMS['ویدیو'] && rich.nV >= 3)
  throw new Error('❌ حداقل ویدیو رعایت نشد');
if ((mKinds['عکس'] || 0) < CFG.MIN_KIND_ITEMS['عکس'] && rich.nP >= 3)
  throw new Error('❌ حداقل عکس رعایت نشد');
console.log('  ✅ سهمیهٔ نوع‌ها در فهرست و در قسمت رعایت شد');

// prompt content
const wp = buildPrompt_(rich.name, mixed, 'نخ', 'پیوند', [], todayWords_());
console.log('  در پرامتر نویسنده:');
console.log('     ترکیب اعلام‌شده  :', (wp.match(/تعداد منابع اصلی: .*/) || [''])[0].slice(0, 90));
console.log('     قاعدهٔ مالی      :', wp.indexOf('توصیهٔ سرمایه‌گذاری نده') !== -1 ? 'هست ✅' : 'نیست ❌');
console.log('     یادآوری چهار نوع :', wp.indexOf('فایل صوتی و سند') !== -1 ? 'هست ✅' : 'نیست ❌');
const partsMentions = (wp.match(/حجم منبع: ترکیب/g) || []).length;
console.log('     «حجم منبع» برای فایل‌های تکه‌تکه‌شده:', partsMentions, 'مورد');
if (wp.indexOf('توصیهٔ سرمایه‌گذاری نده') === -1) throw new Error('❌ قاعدهٔ مالی در پرامتر نیست');

// full production
const r = produceEpisode();
let d = 0; while (global.__PROPS['PENDING_EPISODE'] && d++ < 120) produceEpisodeContinue();
const pod = hub.getSheetByName(CFG.TAB_PODCASTS);
const prow = pod.getRange(pod.getLastRow(), 1, 1, PODCAST_HEADERS.length).getValues()[0];
console.log('  ردیف پادکست → قسمت', prow[0], '| دسته', prow[3],
            '| ویدیو', prow[4], '| عکس', prow[5], '| صدا', prow[PCOL.AUDIO_N - 1],
            '| سند', prow[PCOL.DOC_N - 1], '| مدت', prow[6], '| ایمیل:', prow[10]);
if (String(prow[10]).indexOf('ارسال شد') === -1) throw new Error('❌ ایمیل ثبت نشد');
const sumKinds = Number(prow[4]) + Number(prow[5]) + Number(prow[PCOL.AUDIO_N - 1]) +
                 Number(prow[PCOL.DOC_N - 1]);
console.log('  جمع چهار شمارنده:', sumKinds, '| آیتم‌های قسمت:',
            String(prow[11]).split(', ').filter(Boolean).length);
if (sumKinds !== String(prow[11]).split(', ').filter(Boolean).length)
  throw new Error('❌ شمارندهٔ نوع‌ها با تعداد آیتم‌ها نمی‌خواند');

// the email must carry a reference link for every source, incl. assembled files
const mail = global.__MAIL[global.__MAIL.length - 1];
const html = mail.htmlBody;
const linkCount = (html.match(/باز کردن فایل/g) || []).length;
console.log('  ایمیل: موضوع =', mail.subject);
console.log('     لینک مرجع در جدول منابع:', linkCount);
console.log('     یادداشت «خلاصه از سراسر فایل»:',
            (html.match(/خلاصه از سراسر فایل/g) || []).length, 'مورد');
if (!linkCount) throw new Error('❌ لینک مرجع در ایمیل نیامد');
const st = writeStatus_(hub, 'آزمون');
console.log('  فایل وضعیت: منابع پایش‌شده =', st.sync.feeds.length,
            '| قطعه‌های در انتظار =', st.chunks.rows);
if (st.sync.feeds.length < 10) throw new Error('❌ همهٔ تب‌ها در فایل وضعیت نیامدند');

console.log('\n✅ آزمون تولید قسمت چهار‌نوعی گذشت.');
