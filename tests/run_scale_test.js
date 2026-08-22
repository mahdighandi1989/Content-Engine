/* Reproduces the reported production symptoms at real scale:
   A) episode came out 11 video + 1 photo
   B) pickCategory_ scanned every tab before choosing (execution timeout)
   C) curator returned truncated JSON  */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اشخاص شناسایی شده (JSON)',
  '🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی',
  'مشخصات فنی (JSON)','تحلیل محتوا (JSON)','تحلیل صوتی','تحلیل بصری','نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اطلاعات پایه تصویر (JSON)',
  'استخراج متن (JSON)','اشخاص شناسایی شده (JSON)','مکان‌های شناسایی شده (JSON)','تحلیل محتوا (JSON)',
  'تحلیل فنی (JSON)','کاربردهای توصیه شده (JSON)','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];
function mk(id,h,rows){const ss=new Spread('s',id);const sh=ss.insertSheet('S1');
  sh._d.push(h.slice());rows.forEach(r=>sh._d.push(r));sh._max=Math.max(1000,sh._d.length+10);
  global.__SS[id]=ss;return ss;}

// Videos carry long transcripts (high score); photos carry short OCR (lower score).
// This is exactly the real asymmetry that produced 11 video + 1 photo.
function vrow(i){return [`10/18/2025 ${String(i%24).padStart(2,'0')}:${String(i%60).padStart(2,'0')}:00`,
  'V'+i,'o','n','https://drive.google.com/file/d/V'+i+'/view','[]','{}','{}',
  'متن گفتار طولانی ویدیو که امتیاز بالایی می‌گیرد. '.repeat(8),
  'حال و هوا','تحلیل تخصصی مفصل','{}',
  JSON.stringify({Genre:'مذهبی، مداحی', Main_Topic:'موضوع مذهبی شمارهٔ '+i,
    Key_Message:'پیام کلیدی مفصل و طولانی برای گرفتن امتیاز بالا شمارهٔ '+i}),
  '','','','خلاصهٔ اجرایی مفصل و طولانی ویدیو. '.repeat(8),'SUCCESS'];}
function prow(i){return [`10/21/2025 ${String(i%24).padStart(2,'0')}:${String(i%60).padStart(2,'0')}:00`,
  'P'+i,'o','n','https://drive.google.com/file/d/P'+i+'/view','{}',
  JSON.stringify({Original_Text:'متن کوتاه عکس. '.repeat(3)}),'[]','[]',
  JSON.stringify({Category:'مذهبی، معنوی', Main_Subject:'موضوع عکس مذهبی '+i,
    Key_Message:'پیام کوتاه‌تر عکس شمارهٔ '+i, Notable_Elements:'نکات'}),
  '{}','[]','حال و هوا','خلاصهٔ کوتاه‌تر عکس مذهبی. '.repeat(4),'ویژه','SUCCESS'];}

const V = [], P = [];
for (let i = 0; i < 400; i++) V.push(vrow(i));
for (let i = 0; i < 900; i++) P.push(prow(i));
mk(CFG.VIDEO_SHEET_ID, VH, V);
mk(CFG.PHOTO_SHEET_ID, PH, P);
// __AUTO_SOURCES__ : شیت‌های تازه در این آزمون خالی‌اند
for (const __s of CFG.SOURCES) if (!global.__SS[__s.id]) { const __ss = new Spread('s', __s.id); __ss.insertSheet('S1'); global.__SS[__s.id] = __ss; }
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let curatorPrompt = '', truncateCurator = true;
global.__STUB = function (url, body) {
  if (url.indexOf('/v1beta/models?') !== -1)
    return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  const t = body.contents ? body.contents[0].parts[0].text : '';
  if (t.indexOf('سردبیرِ یک برنامهٔ رادیویی') !== -1) {
    curatorPrompt = t;
    const cand = [...t.matchAll(/- id: (\S+) \|/g)].map(m => m[1]);
    const full = JSON.stringify({ theme: 'یک موضوع مذهبی منسجم',
      chosen: cand.slice(0, 12).map(id => ({ id, why: 'حرف دارد' })),
      rejected: cand.slice(12, 30) });
    // first call mimics the real failure: cut off mid-array by the token cap
    const payload = truncateCurator ? full.slice(0, Math.floor(full.length * 0.62)) : full;
    truncateCurator = false;
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: payload }] } }] } };
  }
  if (url.indexOf('tts') !== -1) {
    const b = Buffer.alloc(80000);
    return { code: 200, json: { candidates: [{ content: { parts: [{ inlineData: { data: b.toString('base64') } }] } }] } };
  }
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'ت', hook: 'ق.', sections: [{ heading:'ب', narration:'متن.', tone:'آرام', sourceIds: ids.slice(0,2) }],
    outro: 'پ.', summary: 'خ.', tags: [] }) }] } }] } };
};

console.log('=== ساخت آرشیو: ۴۰۰ ویدیوی پرامتیاز + ۹۰۰ عکس کم‌امتیازتر ===');
let g = 0; while (g++ < 40) { syncCatalog();
  if (parseInt(global.__PROPS['CURSOR_VIDEO']||'0',10) >= 400 &&
      parseInt(global.__PROPS['CURSOR_PHOTO']||'0',10) >= 900) break; }
const hub = getHub_();
const tab = hub.getSheetByName('مذهبی و معنوی');
const n = tab.getLastRow() - 1;
const kinds = tab.getRange(2, COL.KIND, n, 1).getValues();
const nv = kinds.filter(k => k[0] === 'ویدیو').length;
console.log('  تب مذهبی:', n, 'آیتم |', nv, 'ویدیو،', n - nv, 'عکس');

const scores = tab.getRange(2, COL.SCORE, n, 1).getValues().map(x => Number(x[0]));
const vScores = scores.filter((_, i) => kinds[i][0] === 'ویدیو');
const pScores = scores.filter((_, i) => kinds[i][0] !== 'ویدیو');
const avg = a => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
console.log('  میانگین امتیاز ویدیو:', avg(vScores), '| عکس:', avg(pScores),
            avg(vScores) > avg(pScores) ? '← همان نامتقارنی واقعی' : '');

console.log('\n=== B) انتخاب دسته چند تب را می‌خواند؟ ===');
const before = global.__READS || 0;
let tabReads = 0;
const origGet = Object.getPrototypeOf(tab).getRange;
for (const name of TAXONOMY.map(t => t.title).concat([MISC_TITLE])) {
  const sh = hub.getSheetByName(name);
  if (sh) { sh._reads = 0; const g0 = sh.getRange.bind(sh); sh.getRange = function(...a){ sh._reads++; return g0(...a); }; }
}
const picked = pickCategory_(hub);
let scanned = 0;
for (const name of TAXONOMY.map(t => t.title).concat([MISC_TITLE])) {
  const sh = hub.getSheetByName(name);
  if (sh && sh._reads > 0) scanned++;
}
console.log('  تب‌های خوانده‌شده هنگام انتخاب:', scanned, 'از', TAXONOMY.length + 1,
            scanned <= 2 ? '✅ فقط برنده (بقیه از داشبورد)' : '❌ هنوز همه را می‌خواند');
if (scanned > 2) throw new Error('pickCategory_ still scans every tab');
console.log('  دستهٔ انتخابی:', picked.title, '| نامزدها:', picked.items.length);

const cv = picked.items.filter(x => x.kind === 'ویدیو').length;
console.log('  ترکیب نامزدها —  ویدیو:', cv, '| عکس:', picked.items.length - cv,
            (picked.items.length - cv) >= 10 ? '✅ عکس سهم واقعی دارد' : '❌ باز هم ویدیویی');
if ((picked.items.length - cv) < 10) throw new Error('candidate pool still video-dominated');

console.log('\n=== A) + C) تولید قسمت با پاسخِ بریدهٔ سردبیر ===');
let r = produceEpisode();
let d = 0; while (global.__PROPS['PENDING_EPISODE'] && d++ < 80) { const x = produceEpisodeContinue(); if (x) r = x; }

const pod = hub.getSheetByName(CFG.TAB_PODCASTS);
const row = pod.getRange(pod.getLastRow(), 1, 1, PODCAST_HEADERS.length).getValues()[0];
console.log('  قسمت:', row[2], '| ویدیو:', row[4], '| عکس:', row[5]);
if (Number(row[5]) < CFG.MIN_PHOTO_ITEMS) throw new Error('❌ سهم عکس رعایت نشد: ' + row[5]);
console.log('  ✅ حداقل', CFG.MIN_PHOTO_ITEMS, 'عکس در قسمت آمد (قبلاً ۱ بود)');

const log = hub.getSheetByName(CFG.TAB_LOG).getRange(2, 2, hub.getSheetByName(CFG.TAB_LOG).getLastRow()-1, 1)
              .getValues().map(x => String(x[0]));
const curatorFailed = log.some(l => l.indexOf('گزینش تحریریه‌ای ناموفق') !== -1);
const curatorWorked = log.some(l => l.indexOf('نخ:') !== -1);
console.log('  پاسخ بریدهٔ سردبیر ترمیم شد:', curatorWorked && !curatorFailed ? '✅' : '❌ هنوز شکست می‌خورد');
if (curatorFailed || !curatorWorked) throw new Error('curator truncation not recovered');

console.log('\n=== نگهبان: اجرای کشته‌شده وسط صدا ===');
global.__PROPS['PENDING_EPISODE'] = JSON.stringify({epNum:99, folderId:'X', podRow:2, chunkIdx:0, partNo:1, files:[]});
let made = 0;
const realNT = global.ScriptApp.newTrigger;
global.ScriptApp.newTrigger = (fn) => ({ timeBased(){return this;}, forSpreadsheet(){return this;},
  everyHours(){return this;}, atHour(){return this;}, nearMinute(){return this;}, everyDays(){return this;},
  inTimezone(){return this;}, onOpen(){return this;}, after(){return this;},
  create(){ if (fn === 'produceEpisodeContinue') made++; return this; } });
const resumed = resumeStalledEpisode_();
console.log('  نگهبان قسمت معلق را دید:', resumed ? '✅' : '❌', '| تریگر ادامه ساخت:', made);
if (!resumed || !made) throw new Error('watchdog failed');
global.ScriptApp.newTrigger = realNT;
global.__PROPS['PENDING_EPISODE'] = '';

console.log('\n✅ همهٔ آزمون‌های مقیاس گذشت.');
