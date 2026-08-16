/* Does content added today actually reach an episode quickly,
   instead of queuing behind a 13,000-item backlog? */
const fs = require('fs');
const { Spread } = require('./mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];
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

// متن‌ها باید مثل دادهٔ واقعی «هر آیتم حرفِ خودش» باشند؛ اگر همه یک متنِ
// تکراری داشته باشند، حذف تکراریِ محتوایی درست عمل می‌کند و همه را یکی می‌شمارد.
const WORDS = ['شوخی','لطیفه','خنده','مجری','برنامه','تماشاگر','صحنه','بازیگر','ماجرا','تقلید',
  'نمایش','سکانس','دیالوگ','طعنه','کنایه','بازی','حرکت','لحظه','واکنش','جمله','گفتگو','روایت',
  'صدا','تصویر','رنگ','نور','حرکت','ریتم','ضرباهنگ','پایان'];
function varyText(i, n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = WORDS[(i * 7 + k * 3) % WORDS.length];
    const b = WORDS[(i * 11 + k * 5 + 4) % WORDS.length];
    const c = WORDS[(i * 13 + k * 2 + 9) % WORDS.length];
    out.push('در این بخش ' + a + ' با ' + b + ' همراه می‌شود و ' + c + ' شمارهٔ ' +
             (i * 100 + k) + ' را می‌سازد.');
  }
  return out.join(' ');
}
function vrow(i, tag, genre) {
  return [`10/18/2025 ${String(i%24).padStart(2,'0')}:${String(i%60).padStart(2,'0')}:00`,
    tag+i,'o','n','https://drive.google.com/file/d/'+tag+i+'/view','[]','{}','{}',
    varyText(i + (tag === 'OLDV' ? 0 : 5000), 4),
    'حال و هوای نمونه','تحلیل تخصصی نمونه','{}',
    JSON.stringify({Genre:genre, Main_Topic:'موضوع '+tag+i,
      Key_Message:'پیام کلیدی نسبتاً بلند برای گرفتن امتیاز کافی در سنجه‌ها شمارهٔ '+i}),
    '','','', varyText(i + (tag === 'OLDV' ? 900 : 6000), 5),'SUCCESS'];
}
function prow(i, tag, cat) {
  return [`10/21/2025 ${String(i%24).padStart(2,'0')}:${String(i%60).padStart(2,'0')}:00`,
    tag+i,'o','n','https://drive.google.com/file/d/'+tag+i+'/view','{}',
    JSON.stringify({Original_Text: varyText(i + (tag === 'OLDP' ? 2000 : 7000), 4)}),'[]','[]',
    JSON.stringify({Category:cat, Main_Subject:'موضوع عکس '+tag+i,
      Key_Message:'پیام کلیدی عکس با طول کافی برای گرفتن امتیاز، شمارهٔ '+i, Notable_Elements:'نکات'}),
    '{}','[]','حال و هوا', varyText(i + (tag === 'OLDP' ? 3000 : 8000), 5),'ویژه','SUCCESS'];
}

// 900-item backlog in one category
const backlogV = [], backlogP = [];
for (let i = 0; i < 700; i++) backlogV.push(vrow(i, 'OLDV', 'کمدی، طنز'));
for (let i = 0; i < 200; i++) backlogP.push(prow(i, 'OLDP', 'طنز، میم'));
mk(CFG.VIDEO_SHEET_ID, VH, backlogV);
mk(CFG.PHOTO_SHEET_ID, PH, backlogP);
// __AUTO_SOURCES__ : شیت‌های تازه در این آزمون خالی‌اند
for (const __s of CFG.SOURCES) if (!global.__SS[__s.id]) { const __ss = new Spread('s', __s.id); __ss.insertSheet('S1'); global.__SS[__s.id] = __ss; }
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let lastPromptIds = [];
global.__STUB = function (url, body) {
  if (url.indexOf('/v1beta/models?') !== -1)
    return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  const t = body.contents ? body.contents[0].parts[0].text : '';
  if (t.indexOf('سردبیرِ یک برنامهٔ رادیویی') !== -1) {
    const cand = [...t.matchAll(/- id: (\S+) \|/g)].map(m => m[1]);
    lastPromptIds = cand;
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      theme: 'آزمون تازگی', chosen: cand.slice(0, 12).map(id => ({ id })), rejected: [] }) }] } }] } };
  }
  if (url.indexOf('tts') !== -1) {
    const b = Buffer.alloc(120000); return { code: 200,
      json: { candidates: [{ content: { parts: [{ inlineData: { data: b.toString('base64') } }] } }] } };
  }
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'ت', hook: 'ق.', sections: [{ heading:'ب', narration:'متن.', tone:'آرام', sourceIds: ids.slice(0,2) }],
    outro: 'پ.', summary: 'خ.', tags: [] }) }] } }] } };
};

console.log('=== انباشتهٔ ۹۰۰ آیتمی ساخته می‌شود ===');
let g = 0; while (g++ < 40) { syncCatalog(); if (parseInt(global.__PROPS['CURSOR_VIDEO']||'0',10) >= 700 &&
  parseInt(global.__PROPS['CURSOR_PHOTO']||'0',10) >= 200) break; }
const hub = getHub_();
const tab = hub.getSheetByName('طنز و سرگرمی');
console.log('  آیتم در تب طنز:', tab.getLastRow() - 1);

// age the whole backlog by 200 days
const n0 = tab.getLastRow() - 1;
const oldStamp = Utilities.formatDate(new Date(Date.now() - 200*86400000), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
const addedCol = tab.getRange(2, COL.ADDED, n0, 1).getValues().map(() => [oldStamp]);
tab.getRange(2, COL.ADDED, n0, 1).setValues(addedCol);
console.log('  کل انباشته به ۲۰۰ روز پیش برده شد');

// now today's ingest arrives: 20 new videos + 10 new photos
console.log('\n=== محتوای تازهٔ امروز اضافه می‌شود ===');
const vs = global.__SS[CFG.VIDEO_SHEET_ID].getSheets()[0];
const ps = global.__SS[CFG.PHOTO_SHEET_ID].getSheets()[0];
for (let i = 0; i < 20; i++) vs._d.push(vrow(i, 'NEWV', 'کمدی، طنز'));
for (let i = 0; i < 10; i++) ps._d.push(prow(i, 'NEWP', 'طنز، میم'));
vs._max += 40; ps._max += 20;
syncCatalog();
console.log('  آیتم در تب طنز پس از ورود تازه‌ها:', tab.getLastRow() - 1);

const st = tabStats_(hub, 'طنز و سرگرمی', CFG.MIN_PRIORITY);
const freshN = st.rows.filter(r => r.fresh).length;
console.log('  آیتم‌های شناسایی‌شده به‌عنوان «تازه»:', freshN, freshN === 30 ? '✅' : '❌ انتظار ۳۰');
if (freshN !== 30) throw new Error('freshness detection failed');

console.log('\n=== قسمت ساخته می‌شود؛ چند درصدش از تازه‌هاست؟ ===');
const r = produceEpisode();
let guard = 0; while (global.__PROPS['PENDING_EPISODE'] && guard++ < 60) produceEpisodeContinue();

const newInCandidates = lastPromptIds.filter(x => x.indexOf('NEW') === 0).length;
console.log('  نامزدهای داده‌شده به سردبیر:', lastPromptIds.length,
            '| از تازه‌ها:', newInCandidates,
            `(${Math.round(newInCandidates / lastPromptIds.length * 100)}٪)`);

const pod = hub.getSheetByName(CFG.TAB_PODCASTS);
const srcIds = String(pod.getRange(pod.getLastRow(), 12).getValues()[0][0]).split(', ');
const newUsed = srcIds.filter(x => x.indexOf('NEW') === 0).length;
console.log('  آیتم‌های به‌کاررفته در قسمت:', srcIds.length, '| از تازه‌ها:', newUsed);
if (newUsed === 0) throw new Error('❌ هیچ محتوای تازه‌ای به قسمت نرسید');
console.log('  ✅ محتوای امروز همان روز به آنتن رسید، نه پشت صفِ ۹۰۰ آیتمی');

// backlog must still be represented — not only fresh
const oldUsed = srcIds.filter(x => x.indexOf('OLD') === 0).length;
console.log('  از انباشته:', oldUsed, oldUsed > 0 ? '✅ ترکیب تازه و انباشته حفظ شد' : '⚠️ فقط تازه‌ها');

console.log('\n✅ آزمون تازگی گذشت.');
