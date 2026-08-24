/* Edge cases the first harness could not reach:
   A) a category tab growing past the 1000-row grid limit
   B) audio synthesis hitting the execution deadline and resuming
   C) cross-run dedup after the date round-trips through Sheets  */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs','05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

const rd = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const vids = rd('tests/fixtures/videos.jsonl');
const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اشخاص شناسایی شده (JSON)',
  '🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی',
  'مشخصات فنی (JSON)','تحلیل محتوا (JSON)','تحلیل صوتی','تحلیل بصری','نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اطلاعات پایه تصویر (JSON)',
  'استخراج متن (JSON)','اشخاص شناسایی شده (JSON)','مکان‌های شناسایی شده (JSON)','تحلیل محتوا (JSON)',
  'تحلیل فنی (JSON)','کاربردهای توصیه شده (JSON)','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];

function mk(id, h, rows) {
  const ss = new Spread('s', id); const sh = ss.insertSheet('S1');
  sh._d.push(h.slice()); rows.forEach(r => sh._d.push(r));
  sh._max = Math.max(1000, sh._d.length + 10);
  global.__SS[id] = ss; return ss;
}

// ---- A) blow past 1000 rows in a single category -------------------------
// 1600 humour videos => the "طنز و سرگرمی" tab must grow beyond the default grid
const humour = [];
for (let i = 0; i < 1600; i++) {
  const v = vids[i % vids.length];
  humour.push([`10/18/2025 ${String(i % 24).padStart(2,'0')}:${String(i % 60).padStart(2,'0')}:00`,
    'BIGID' + i, 'o', 'n', 'https://drive.google.com/file/d/BIGID' + i + '/view',
    '[]','{}','{}', v.transcript, v.vibe, v.expert, '{}',
    JSON.stringify({Genre:'کمدی، طنز', Main_Topic:'موضوع آزمایشی ' + i,
                    Key_Message:'پیام آزمایشی نسبتاً بلند برای گرفتن امتیاز کافی در سنجه‌ها ' + i}),
    '','','', 'خلاصهٔ آزمایشی به قدر کافی بلند تا امتیاز بگیرد. '.repeat(3), 'SUCCESS']);
}
mk(CFG.VIDEO_SHEET_ID, VH, humour);
mk(CFG.PHOTO_SHEET_ID, PH, []);
// __AUTO_SOURCES__ : شیت‌های تازه در این آزمون خالی‌اند
for (const __s of CFG.SOURCES) if (!global.__SS[__s.id]) { const __ss = new Spread('s', __s.id); __ss.insertSheet('S1'); global.__SS[__s.id] = __ss; }
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

console.log('=== A) رشد یک تب فراتر از هزار ردیف ===');
let guard = 0;
while (guard++ < 40) {
  syncCatalog();
  const cur = parseInt(global.__PROPS['CURSOR_VIDEO'] || '0', 10);
  if (cur >= 1600) break;
}
const hub = getHub_();
const tab = hub.getSheetByName('طنز و سرگرمی');
console.log('  ردیف‌های تب طنز:', tab.getLastRow() - 1, '| ظرفیت شبکه:', tab.getMaxRows());
if (tab.getLastRow() - 1 !== 1600) throw new Error('❌ ردیف گم شد: ' + (tab.getLastRow() - 1));
console.log('  ✅ هر ۱۶۰۰ ردیف نوشته شد بدون خطای محدودهٔ نامعتبر');

// ---- C) dedup survives the Sheets date round-trip ------------------------
console.log('\n=== C) یکتاسازی بین دو اجرا با تاریخِ برگشتی از شیت ===');
// emulate Sheets coercing the text date back into a Date object on read
const n = tab.getLastRow() - 1;
for (let r = 2; r <= 6; r++) {
  const s = tab._d[r - 1][COL.DATE - 1];
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (m) tab._d[r - 1][COL.DATE - 1] = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}
global.__PROPS['CURSOR_VIDEO'] = '0';           // force a full re-scan
syncCatalog();
const after = tab.getLastRow() - 1;
console.log('  ردیف‌ها پس از اسکن دوبارهٔ کامل:', after, after === 1600 ? '✅ بدون تکرار' : '❌ تکراری ساخت');
if (after !== 1600) throw new Error('dedup failed across the date round-trip');

// ---- B) deadline hit mid-synthesis, then resume --------------------------
console.log('\n=== B) قطع‌شدن صداگذاری وسط کار و ادامهٔ خودکار ===');
let ttsCalls = 0;
global.__STUB = function (url, body) {
  if (url.indexOf('/v1beta/models?') !== -1) {
    return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }
    ] } };
  }
  if (url.indexOf(':generateContent') !== -1 && url.indexOf('-tts') === -1) {
    const ids = (body.contents[0].parts[0].text.match(/شناسه: (\S+)/g) || []).map(s => s.replace('شناسه: ',''));
    const secs = [];
    for (let i = 0; i < 6; i++) secs.push({ heading: 'بخش ' + (i+1),
      narration: 'یک جملهٔ نسبتاً بلند برای رسیدن به طول واقعی روایت. '.repeat(30).trim(),
      sourceIds: ids.slice(i, i + 2) });
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'آزمون ادامه‌پذیری', hook: 'قلاب.', sections: secs, outro: 'پایان.',
      summary: 'خلاصه.', tags: ['الف'] }) }] } }] } };
  }
  ttsCalls++;
  const buf = Buffer.alloc(400000);
  for (let i = 0; i < buf.length; i += 2) buf.writeInt16LE(1000, i);
  return { code: 200, json: { candidates: [{ content: { parts: [{ inlineData: { data: buf.toString('base64') } }] } }] } };
};

let scheduled = 0;
global.ScriptApp.newTrigger = (fn) => ({
  timeBased(){return this;}, forSpreadsheet(){return this;}, everyHours(){return this;},
  atHour(){return this;}, nearMinute(){return this;}, everyDays(){return this;},
  inTimezone(){return this;}, onOpen(){return this;}, after(){return this;},
  create(){ if (fn === 'produceEpisodeContinue') scheduled++; return this; }
});

CFG.MAX_RUNTIME_MS = 1;          // force the deadline to trip immediately every run
const r1 = produceEpisode();
console.log('  اجرای ۱:', JSON.stringify(r1), '| تریگر ادامه ثبت شد:', scheduled);
produceEpisodeContinue();   // اولین گام صدا حالا اجرای جداگانه دارد
if (!global.__PROPS['PENDING_EPISODE']) throw new Error('❌ وضعیت نیمه‌تمام ذخیره نشد');

let runs = 1;
while (global.__PROPS['PENDING_EPISODE'] && runs < 60) { produceEpisodeContinue(); runs++; }
console.log('  تعداد اجراها تا اتمام:', runs, '| فراخوانی TTS:', ttsCalls);
console.log('  وضعیت نیمه‌تمام پاک شد:', !global.__PROPS['PENDING_EPISODE'] ? '✅' : '❌');

const pod = hub.getSheetByName(CFG.TAB_PODCASTS);
const row = pod.getRange(pod.getLastRow(), 1, 1, PODCAST_HEADERS.length).getValues()[0];
console.log('  مدت:', row[6], '| وضعیت ایمیل:', row[10]);
console.log('  فایل‌های صوتی:', String(row[7]).split('\n').filter(Boolean).length);
const wavs = global.__FILES.filter(f => f.getName().endsWith('.wav'));
console.log('  فایل WAV در درایو:', wavs.length);
wavs.slice(0,4).forEach(f => console.log('     ', f.getName(), f._b._data.length, 'bytes'));
if (!row[10] || String(row[10]).indexOf('ارسال شد') === -1) throw new Error('❌ ایمیل ثبت نشد');

// every produced wav must be a valid RIFF file
for (const f of wavs) {
  const d = f._b._data;
  if (d.slice(0,4).toString() !== 'RIFF' || d.slice(8,12).toString() !== 'WAVE')
    throw new Error('❌ فایل WAV نامعتبر: ' + f.getName());
  const declared = d.readUInt32LE(4);
  if (declared !== d.length - 8) throw new Error('❌ اندازهٔ RIFF غلط در ' + f.getName());
}
console.log('  ✅ همهٔ فایل‌های WAV معتبرند و اندازهٔ RIFF درست است');
console.log('\n✅ همهٔ آزمون‌های مرزی گذشت.');
