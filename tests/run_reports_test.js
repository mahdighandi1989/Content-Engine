/* حلقهٔ بستهٔ «گزارش ← اقدام»:
   گزارش Cowork → تب گزارش‌ها → تزریق به پرامپت → بازخورد → ضدتکرار → تلگرامِ تعویض کد */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread, DFolder } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

// ---- source sheets ------------------------------------------------------
const VH = ['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','d','e','متن پیاده‌سازی شده',
  'فضا و وایب','تحلیل تخصصی','f','تحلیل محتوا (JSON)','g','h','i','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','استخراج متن (JSON)','d','e',
  'تحلیل محتوا (JSON)','f','g','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];
function mk(id, h, rows) { const ss = new Spread('s', id); const sh = ss.insertSheet('S1');
  sh._d.push(h.slice()); rows.forEach(r => sh._d.push(r)); sh._max = Math.max(1000, sh._d.length + 10);
  global.__SS[id] = ss; return ss; }
const p2 = n => String(n).padStart(2, '0');
const D0 = new Date();
const recent = i => { const d = new Date(D0.getTime() - (79 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };
const V = [], P = [];
for (let i = 0; i < 80; i++) V.push([recent(i),'V'+i,'o','n','https://drive.google.com/file/d/V'+i+'/view',
  '[]','{}','{}','متن گفتار طولانی و پرجزئیات برای امتیاز. '.repeat(6),'وایب','تخصصی','{}',
  JSON.stringify({Genre:'مذهبی، معنوی',Main_Topic:'موضوع مذهبی شمارهٔ '+i,
    Key_Message:'پیام کلیدی مفصل شمارهٔ '+i}),'','','',
  'خلاصهٔ اجرایی طولانی و پرجزئیات. '.repeat(6),'SUCCESS']);
for (let i = 0; i < 80; i++) P.push([recent(i),'P'+i,'o','n','https://drive.google.com/file/d/P'+i+'/view','{}',
  JSON.stringify({Original_Text:'متن استخراجی نسبتاً بلند. '.repeat(4)}),'[]','[]',
  JSON.stringify({Category:'مذهبی، معنوی',Main_Subject:'موضوع عکس مذهبی '+i,
    Key_Message:'پیام عکس مفصل '+i,Notable_Elements:'ن'}),'{}','[]','وایب',
  'خلاصهٔ عکس نسبتاً بلند و پرجزئیات. '.repeat(5),'ویژه','SUCCESS']);
mk(CFG.VIDEO_SHEET_ID, VH, V); mk(CFG.PHOTO_SHEET_ID, PH, P);
for (const s of CFG.SOURCES) if (!global.__SS[s.id]) { const ss = new Spread('s', s.id); ss.insertSheet('S1'); global.__SS[s.id] = ss; }
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
global.__PROPS['TELEGRAM_CHAT_ID'] = '123';

const TG = [];
let writerPrompt = '', curatorPrompt = '';
global.__STUB = function (url, body) {
  if (url.indexOf('api.telegram.org') !== -1) {
    TG.push(typeof body === 'object' ? (body.text || '[file]') : String(body));
    return { code: 200, json: { ok: true, result: { message_id: TG.length } } };
  }
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  const t = body.contents ? body.contents[0].parts[0].text : '';
  // ۵٫۵۹: وارسیِ «گوینده دستور را نخواند» یک فراخوانِ صوتی به مدلِ متن
  // می‌زند. بی این شاخه، همان فراخوان جای پرامپتِ نویسنده را می‌گرفت.
  if (body.contents && body.contents[0].parts.some(x => x.inlineData)) {
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: 'متنِ سالمِ برنامه' }] } }] } };
  }
  if (t.indexOf('سردبیرِ یک برنامهٔ رادیویی') !== -1) {
    curatorPrompt = t;
    const c = [...t.matchAll(/- id: (\S+) \|/g)].map(m => m[1]);
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      theme: 'نخ', connection: 'پیوند', chosen: c.slice(0, 12).map(id => ({ id })), rejected: [] }) }] } }] } };
  }
  if (url.indexOf('tts') !== -1) return { code: 200, json: { candidates: [{ content: { parts: [{
    inlineData: { data: Buffer.alloc(50000).toString('base64') } }] } }] } };
  // فراخوانِ اعراب‌گذاری نباید جای پرامپتِ نویسنده را بگیرد
  if (t.indexOf('اعراب‌گذاریِ کامل') !== -1 && t.indexOf('فیلد v') !== -1) {
    const piece = t.split('\n\n').slice(1).join('\n\n').replace(/\n\nیادآوری:[\s\S]*$/, '');
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ v: piece.replace(/([\u0622-\u064A\u066E-\u06D5])/g, '$1َ') }) }] } }] } };
  }
  // ۶٫۲۰: بازبینیِ متنِ صوتی هم یک فراخوانِ متنی است — بی این شاخه جای
  // پرامپتِ نویسنده را می‌گرفت، همان تلهٔ اعراب‌گذاری برای بارِ سوم.
  if (t.indexOf('بازبینیِ نشانه‌گذاریِ متنِ صوتی') !== -1) {
    const vv = t.split('── علامت‌گذاری‌شده ──\n')[1] || '';
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ v: vv, n: '۰' }) }] } }] } };
  }
  // پرسشِ «این متن چه صدایی می‌خواهد؟» (۵٫۷۵) نباید جای پرامپتِ نویسنده را
  // بگیرد — همان تلهٔ اعراب‌گذاری، این بار برای افکت.
  if (t.indexOf('آیا جایی در آن هست که یک **صدای کوتاه**') !== -1) {
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ wants: [] }) }] } }] } };
  }
  writerPrompt = t;
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  // قلاب باید روز و تاریخ را بگوید و تعداد بخش‌ها کامل باشد، وگرنه پاس وفاداری
  // و وارسیِ کم‌بخشی خودشان یافتهٔ تازه می‌سازند و این آزمون از تمرکز می‌افتد.
  const W = todayWords_();
  const secs = [];
  for (let k = 0; k < 5; k++) secs.push({ heading: 'بخش ' + (k + 1),
    narration: 'متن نمونه شمارهٔ ' + (k + 1) + '. '.repeat(20), tone: 'آرام',
    sourceIds: ids.slice(k * 2, k * 2 + 2) });
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'ت', hook: CFG.SHOW_NAME + '. سلام. امروز ' + W.weekday + '، ' + W.jalali + ' است. قلاب.',
    sections: secs, outro: 'پایان.', summary: 'خ.', tags: [] }) }] } }] } };
};

let un = quiet(); let g = 0; while (g++ < 30) syncCatalog(); un();
const hub = getHub_();
const OUT = global.__ROOT_FOLDER;

// ================= A) ingest ============================================
console.log('=== الف) برداشتن گزارش و ثبت در تب ===');
const report1 = {
  reportId: 'RPT-2026-08-10-1235', at: '2026-08-10 12:35', episode: 1,
  summary: 'موتور سالم است اما ۵ ایراد پیدا شد',
  findings: [
    { priority: 'جدی', category: 'پرامپت روایت', key: 'quote-fidelity',
      title: 'تحریف روایت امیرالمؤمنین در بخش ۴',
      detail: 'کلمهٔ «هدایت» در حدیث آمده در حالی که منبع «هدیه» دارد.',
      instruction: 'هر روایت، حدیث یا آیه را کلمه‌به‌کلمه از فیلد متنِ منبع بردار؛ حق اضافه یا ادغام نداری.',
      owner: 'موتور' },
    { priority: 'جدی', category: 'گزینش', key: 'photo-share',
      title: 'تلفیق ویدیو و عکس کار نکرد — فقط ۱ عکس',
      detail: 'از ۱۲ آیتم، ۱۱ ویدیو و ۱ عکس.',
      instruction: 'در انتخاب آیتم‌ها دست‌کم سه عکس بیاور.', owner: 'موتور' },
    { priority: 'متوسط', category: 'گزینش', key: 'dup-transcript',
      title: 'دو آیتم، یک سخنرانی واحد',
      detail: 'دو شناسهٔ متفاوت، هر دو «ما با یهود دو جنگ داریم».',
      instruction: 'آیتم‌هایی که رونوشتشان تقریباً یکی است را یکی حساب کن.', owner: 'موتور' },
    { priority: 'جدی', category: 'کد اسکریپت', key: 'curate-json',
      title: 'گزینش تحریریه‌ای با خطای JSON افتاد',
      detail: "Expected ',' or ']' after array element at position 4034",
      instruction: 'ترمیم JSON بریده باید از محل خطا عقب برود — نیازمند تغییر کد.',
      owner: 'کد' },
    { priority: 'جزئی', category: 'اطلاعاتی', key: 'ep-time',
      title: 'قسمت ساعت ۱۰ ساخته شد نه ۷',
      detail: 'زمان‌بندی امروز نصب شده، طبیعی است.', instruction: '', owner: 'موتور' }
  ]
};
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-10-1235.json',
               JSON.stringify(report1), 'application/json');
un = quiet(); const ing = ingestReports_(hub); un();
const rt = hub.getSheetByName(CFG.REPORT_TAB);
const rows = () => rt.getLastRow() < 2 ? [] :
  rt.getRange(2, 1, rt.getLastRow() - 1, REPORT_HEADERS.length).getValues();
console.log('  برداشت:', JSON.stringify(ing));
rows().forEach(r => console.log('     ' + String(r[RC.ID-1]).padEnd(24) +
  String(r[RC.PRI-1]).padEnd(7) + String(r[RC.CAT-1]).padEnd(14) +
  String(r[RC.OWNER-1]).padEnd(20) + r[RC.STATUS-1]));
ok('هر پنج مورد در ردیف جدا ثبت شد، به‌علاوهٔ سطرِ سرجمع',
   rows().length === 6, rows().length + ' ردیف');
ok('سرجمعِ گزارش هم ردیف خودش را دارد', (() => {
  const r = rows()[0];
  return String(r[RC.TITLE-1]).indexOf('سرجمعِ گزارش') === 0 &&
         String(r[RC.DETAIL-1]).indexOf('۵ ایراد') !== -1 &&
         String(r[RC.AT-1]) === '2026-08-10 12:35';
})());
ok('هر محتوا زیر ستون خودش نشست', (() => {
  const r = rows()[1];
  return String(r[RC.AT-1]) === '2026-08-10 12:35' &&
         String(r[RC.PRI-1]) === 'جدی' &&
         String(r[RC.CAT-1]) === 'پرامپت روایت' &&
         String(r[RC.TITLE-1]).indexOf('تحریف روایت') === 0 &&
         String(r[RC.DETAIL-1]).indexOf('هدایت') !== -1 &&
         String(r[RC.INSTR-1]).indexOf('کلمه‌به‌کلمه') !== -1 &&
         String(r[RC.LOGGED-1]).length >= 10;
})());
ok('مورد نیازمند کد به کوورک واگذار شد و وضعیتش درست است',
   rows().filter(r => r[RC.OWNER-1] === ROWNER_CODE &&
                      r[RC.STATUS-1] === RST.NEEDS_CODE).length === 1);
ok('فایل گزارش علامت خورد تا دوباره برداشته نشود',
   pendingReportFiles_().length === 0);

// ================= B) telegram alert ====================================
console.log('\n=== ب) هشدار تلگرامِ «کد باید عوض شود» ===');
console.log('  پیام‌های تلگرام:', TG.length);
TG.forEach(m => console.log('     ' + String(m).replace(/\n/g, ' ⏎ ').slice(0, 120)));
ok('برای موردِ نیازمند کد، تلگرام رفت', TG.length === 1 &&
   TG[0].indexOf('کد موتور باید تعویض شود') !== -1);
/* این سنجه تا ۵٫۹۲ متنی را تثبیت می‌کرد که از دورانِ پیش از ۵٫۱۲ مانده بود:
   «فایل را از Cowork بردارید و Code.gs را پاک کنید». هشتاد نسخه است که کد
   خودش از گیت‌هاب نصب می‌شود. دستوری که غلط باشد از دستورِ نبوده بدتر است —
   خواننده یا کارِ بیهوده می‌کند یا یاد می‌گیرد کلِ پیام را نخواند. */
ok('پیام می‌گوید چه کار کنم — و حقیقت را می‌گوید',
   TG[0].indexOf('خودش هر شب') !== -1 && TG[0].indexOf('گیت‌هاب') !== -1,
   TG[0].slice(0, 160));
ok('و دیگر کارِ دستیِ منسوخ را نمی‌خواهد',
   TG[0].indexOf('موتور-محتوا.gs') === -1 && TG[0].indexOf('Code.gs') === -1);
ok('ستون هشدار تلگرام پر شد',
   rows().some(r => String(r[RC.TG-1]).indexOf('ارسال شد') === 0));

// ================= C) injected into the prompt ==========================
console.log('\n=== ج) تزریق دستورها به پرامپت قسمت ===');
const open1 = openInstructions_(hub);
console.log('  دستورهای باز:', open1.length, '→', open1.map(o => o.cat).join('، '));
ok('موردِ نیازمند کد به مدل داده نمی‌شود',
   !open1.some(o => o.cat === 'کد اسکریپت'));
ok('موردِ بی‌دستور (اطلاعاتی) هم نمی‌آید', open1.length === 3, open1.length);
ok('«جدی» اول فهرست است', open1[0].pri === 'جدی');

const r1 = produceEpisode();
let d = 0; while (global.__PROPS['PENDING_EPISODE'] && d++ < 60) produceEpisodeContinue();
ok('متن دستورها عیناً در پرامپت نویسنده آمد',
   writerPrompt.indexOf('کلمه‌به‌کلمه از فیلد متنِ منبع') !== -1 &&
   writerPrompt.indexOf('اصلاح‌هایی که بازبینِ قسمتِ قبل خواسته') !== -1);
ok('دستورهای گزینش در پرامپت سردبیر آمد',
   curatorPrompt.indexOf('دست‌کم سه عکس') !== -1 &&
   curatorPrompt.indexOf('رونوشتشان تقریباً یکی است') !== -1);
ok('دستور پرامپتِ روایت به سردبیر داده نشد (جای خودش نیست)',
   curatorPrompt.indexOf('کلمه‌به‌کلمه از فیلد متنِ منبع') === -1);

// ================= D) write-back ========================================
console.log('\n=== د) نوشتنِ اقدامِ انجام‌شده جلوی هر ردیف ===');
rows().forEach(r => {
  if (r[RC.OWNER-1] === ROWNER_CODE) return;
  if (!String(r[RC.INSTR-1]).trim()) return;
  console.log('     ' + String(r[RC.ID-1]).padEnd(24) + String(r[RC.STATUS-1]).padEnd(12) +
              '| ' + String(r[RC.DONE-1]).slice(0, 60) + ' | قسمت ' + r[RC.EP-1]);
});
ok('هر سه دستور «اعمال شد» خوردند',
   rows().filter(r => r[RC.STATUS-1] === RST.APPLIED).length === 3);
ok('جلوی هر ردیف نوشته شد چه شد و در کدام قسمت',
   rows().filter(r => r[RC.STATUS-1] === RST.APPLIED)
         .every(r => String(r[RC.DONE-1]).indexOf('قسمت 1') !== -1 &&
                     String(r[RC.DONE_AT-1]).length >= 10 && Number(r[RC.EP-1]) === 1));
ok('موردِ کد هنوز باز مانده (کار مدل نیست)',
   rows().filter(r => r[RC.STATUS-1] === RST.NEEDS_CODE).length === 1);

// ================= E) no repeat work ====================================
console.log('\n=== ه) کار تکراری انجام نمی‌شود ===');
ok('پس از اعمال، هیچ دستور بازی برای مدل نمانده', openInstructions_(hub).length === 0);

// same findings arrive again in a NEW report, dated after the action
// ── زمان‌های آزمون باید نسبت به «الان» باشند، نه ثابت ──
// این بلوک با تاریخِ ثابتِ «۲۰۲۶-۰۸-۱۱ ۱۲:۳۵» نوشته شده بود و شرطش این بود که
// گزارش «تازه‌تر از زمانِ اقدام» باشد. زمانِ اقدام همان nowStr_ است، پس آزمون
// هر روز بعد از ساعت ۱۲:۳۵ الکی سرخ می‌شد — درست همان روزی که به سبزیِ آزمون‌ها
// برای تشخیصِ یک ایرادِ واقعی نیاز داشتیم.
function tPlus_(mins) {
  var m = String(nowStr_()).match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/);
  var base = m ? (Number(m[2]) * 60 + Number(m[3])) : 12 * 60;
  var tot = base + mins;
  var day = m ? m[1] : '2026-08-11';
  var hh = Math.floor((tot % 1440) / 60), mm = (tot % 1440) % 60;
  return day + ' ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
}
const T2 = tPlus_(5), T3 = tPlus_(10);

const report2 = JSON.parse(JSON.stringify(report1));
report2.reportId = 'RPT-2026-08-11-1235';
report2.at = T2;
report2.findings = [report1.findings[0], report1.findings[2]];  // دو مورد تکراری
report2.findings.push({ priority: 'متوسط', category: 'پرامپت روایت', key: 'long-sentences',
  title: 'شش جملهٔ بالای ۴۵ کلمه', detail: 'بلندترین ۷۵ کلمه.',
  instruction: 'هیچ جمله‌ای بیش از سی کلمه نباشد.', owner: 'موتور' });
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-11-1235.json',
               JSON.stringify(report2), 'application/json');
un = quiet(); const ing2 = ingestReports_(hub); un();
console.log('  برداشت دوم:', JSON.stringify(ing2));
ok('موردِ تازه ردیف تازه گرفت (به‌علاوهٔ سرجمعِ گزارشِ دوم)', ing2.added === 2,
   'added ' + ing2.added);
ok('موردهای تکراری ردیف تازه نساختند', rows().length === 8, rows().length + ' ردیف');
const reopened = rows().filter(r => String(r[RC.STATUS-1]).indexOf('تکرار') !== -1);
console.log('  بازگشایی‌شده‌ها:', reopened.map(r => String(r[RC.TITLE-1]).slice(0, 40)).join(' | '));
ok('چون گزارش تازه‌تر از زمان اقدام بود، دوباره باز شدند', reopened.length === 2);
ok('شمارندهٔ تکرار بالا رفت',
   reopened.every(r => Number(r[RC.SEEN-1]) === 2 && String(r[RC.LAST_SEEN-1]) === T2));
const open2 = openInstructions_(hub);
console.log('  دستورهای باز برای قسمت بعد:', open2.length,
            '→', open2.map(o => String(o.title).slice(0, 28)).join(' | '));
ok('حالا سه دستور باز است (دو تکرار + یک تازه)', open2.length === 3);

// a report that repeats an item while it is still open must not duplicate
const report3 = { reportId: 'RPT-2026-08-11-1800', at: T3,
                  findings: [report1.findings[0]] };
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-11-1800.json',
               JSON.stringify(report3), 'application/json');
un = quiet(); const ing3 = ingestReports_(hub); un();
ok('تکرارِ یک موردِ همچنان باز، ردیف تازه نمی‌سازد',
   ing3.added === 0 && ing3.repeated === 1 && rows().length === 8);

// ================= F) code version watch ================================
console.log('\n=== و) اعلام نسخهٔ تازهٔ کد ===');
TG.length = 0;
OUT.createFile(CFG.CODE_FILE, JSON.stringify({
  version: '9.9', releasedAt: '2026-08-11 20:00',
  summary: 'ترمیم JSON بریده از محل خطا، حذف تکراری محتوایی، و پاس وفاداری.'
}), 'application/json');
un = quiet(); const cu = checkCodeUpdate_(hub); un();
console.log('  نتیجه:', JSON.stringify(cu), '| تلگرام:', TG.length);
ok('نسخهٔ تازه تشخیص داده شد', cu && cu.to === '9.9');
ok('ردیف «نیازمند تعویض کد» ثبت شد',
   rows().some(r => String(r[RC.ID-1]) === 'CODE-9.9' && r[RC.STATUS-1] === RST.NEEDS_CODE));
ok('پیام تلگرام رفت', TG.length === 1 && TG[0].indexOf('تعویض') !== -1);
un = quiet(); const cu2 = checkCodeUpdate_(hub); un();
ok('برای همان نسخه دوباره هشدار نمی‌دهد', cu2 === null && TG.length === 1);

// ================= G) status file =======================================
console.log('\n=== ز) گزارش در فایل وضعیت ===');
un = quiet(); const st = writeStatus_(hub, 'آزمون'); un();
console.log('  ', JSON.stringify({ open: st.reports.open, info: st.reports.info,
  needsCode: st.reports.needsCode, applied: st.reports.applied,
  repeated: st.reports.repeated, codeVersion: st.codeVersion }));
ok('خلاصهٔ گزارش‌ها در فایل وضعیت هست',
   st.reports && st.reports.open === 3 && st.reports.needsCode === 2,
   'باز ' + st.reports.open + ' · اطلاعاتی ' + st.reports.info + ' · کد ' + st.reports.needsCode);
ok('موردِ صرفاً اطلاعاتی جزو «در انتظار اقدام» شمرده نمی‌شود', st.reports.info === 3,
   'اطلاعاتی ' + st.reports.info);
ok('نسخهٔ کد در فایل وضعیت هست', st.codeVersion === CFG.CODE_VERSION);
ok('موارد باز با عنوان در فایل وضعیت آمده',
   st.reports.openItems.length === 3 && st.reports.openItems[0].title.length > 5);
un = quiet(); const hc = healthCheck(); un();
console.log('  ایرادهای سلامت:');
hc.problems.forEach(x => console.log('     ⚠ ' + x.slice(0, 110)));
ok('وارسی سلامت موارد نیازمند کد را ایراد می‌شمارد',
   hc.problems.some(x => x.indexOf('در انتظار تعویض کد') !== -1));



console.log('\n=== ح) موردی که ناظر می‌داند قبلاً برطرف شده ===');
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-12-0900.json', JSON.stringify({
  reportId: 'RPT-2026-08-12-0900', at: '2026-08-12 09:00',
  findings: [{ priority: 'جدی', category: 'کد اسکریپت', key: 'already-fixed',
    title: 'ایرادی که در نسخهٔ تازه بسته شده', detail: 'شرح.',
    instruction: '', owner: 'کد', resolvedIn: 'نسخهٔ ۴٫۲',
    doneNote: 'ترمیم JSON از محل خطا' }]
}), 'application/json');
const tgBefore = TG.length;
un = quiet(); ingestReports_(hub); un();
const fixedRow = rows().find(r => String(r[RC.TITLE-1]).indexOf('نسخهٔ تازه بسته شده') !== -1);
console.log('  وضعیت:', fixedRow[RC.STATUS-1], '| اقدام:', String(fixedRow[RC.DONE-1]).slice(0, 50));
ok('به‌عنوان تاریخچه ثبت شد، نه کارِ باز', fixedRow[RC.STATUS-1] === RST.APPLIED);
ok('برایش هشدار تلگرام نرفت', TG.length === tgBefore);
ok('در «در انتظار اقدام» شمرده نمی‌شود',
   !openInstructions_(hub).some(o => o.title.indexOf('نسخهٔ تازه بسته شده') !== -1));

console.log('\n=== ط) ردیفِ «نیازمند تعویض کد» که نسخه‌اش رسیده، ایرادِ دروغین نسازد ===');
// همان چیزی که در تولید دیده شد: ردیف‌هایی از نسخه‌های ۵٫۱ تا ۵٫۱۰ که با
// چسباندنِ دستیِ کد جا ماندند و afterCodeSwap هرگز اجرا نشد، پس تا ابد
// «در انتظار» می‌ماندند و هر روز یک ایراد می‌ساختند.
const mkCodeRow = (id, title) => {
  const r = new Array(REPORT_HEADERS.length).fill('');
  r[RC.ID-1] = id; r[RC.AT-1] = '2026-08-13 12:20'; r[RC.PRI-1] = 'جدی';
  r[RC.CAT-1] = 'نسخهٔ کد'; r[RC.TITLE-1] = title; r[RC.INSTR-1] = 'کد را عوض کن';
  r[RC.OWNER-1] = ROWNER_CODE; r[RC.STATUS-1] = RST.NEEDS_CODE;
  r[RC.SEEN-1] = 1; r[RC.TG-1] = 'ارسال شد 2026-08-13 12:59';
  return r;
};
const staleRows = [
  mkCodeRow('CODE-5.1',  'نسخهٔ تازهٔ کد آماده است — کد باید تعویض شود (5.0 ← 5.1)'),
  mkCodeRow('CODE-5.10', 'نسخهٔ تازهٔ کد آماده است — کد باید تعویض شود (5.8 ← 5.10)'),
];
const baseline = reportSummary_(hub);          // ردیف‌های کدِ بی‌نسخه از بخش‌های قبلی
const atRow = rt.getLastRow() + 1;
rt.getRange(atRow, 1, staleRows.length, REPORT_HEADERS.length).setValues(staleRows);

console.log('  نسخهٔ در حالِ اجرا:', CFG.CODE_VERSION,
            '| needsCodeِ پایه:', baseline.needsCode);
ok('نسخهٔ هدفِ ردیف از شناسه/عنوان درست درمی‌آید',
   codeRowTargetVer_(staleRows[1]) === '5.10', codeRowTargetVer_(staleRows[1]));
ok('ردیفِ کهنه «انجام‌شده» حساب می‌شود', codeRowSatisfied_(staleRows[1]));

const sum1 = reportSummary_(hub);
console.log('  needsCode:', sum1.needsCode, '| codeItems:', sum1.codeItems.length);
ok('دو ردیفِ کهنه چیزی به «نیازمند تعویض کد» اضافه نکردند',
   sum1.needsCode === baseline.needsCode, sum1.needsCode + ' == ' + baseline.needsCode);
ok('در codeItems هم نیامدند',
   !sum1.codeItems.some(c => String(c.id).indexOf('CODE-5.') === 0));
ok('در عوض «اعمال شد» شمرده شدند', sum1.applied === baseline.applied + 2);

// اما ردیفی که واقعاً جلوتر از نسخهٔ در حالِ اجراست باید باز بماند
const future = mkCodeRow('CODE-9.9', 'نسخهٔ تازهٔ کد آماده است — کد باید تعویض شود (5.13 ← 9.9)');
rt.getRange(rt.getLastRow() + 1, 1, 1, REPORT_HEADERS.length).setValues([future]);
const sum2 = reportSummary_(hub);
console.log('  پس از افزودنِ ردیفِ واقعاً تازه → needsCode:', sum2.needsCode);
ok('ردیفِ نسخهٔ بالاتر همچنان باز می‌ماند', sum2.needsCode === baseline.needsCode + 1);
ok('و در codeItems می‌آید',
   sum2.codeItems.some(c => String(c.id) === 'CODE-9.9'));
ok('ردیفِ بی‌نسخه محافظه‌کارانه باز می‌ماند',
   codeRowSatisfied_(mkCodeRow('RPT#42', 'کد باید عوض شود')) === false);

// ── شمارهٔ نسخه با رقمِ فارسی ────────────────────────────────────────────
// عنوانِ این ردیف‌ها را آدم فارسی می‌نویسد. تا ۵٫۴۴ الگو فقط 0-9 را می‌دید،
// پس «نسخهٔ ۴٫۳» هیچ نسخه‌ای نداشت، ردیف هرگز بسته نمی‌شد و هر روز یک ایرادِ
// دروغین می‌ساخت. در وضعیتِ واقعی چهار ردیف این‌طور گیر کرده بودند.
console.log('=== شمارهٔ نسخه با رقمِ فارسی ===');
ok('رقمِ فارسی با ممیزِ فارسی خوانده می‌شود',
   codeRowTargetVer_(mkCodeRow('RPT#9', 'نسخهٔ ۴٫۳ آماده است — کد باید تعویض شود')) === '4.3');
ok('رقمِ فارسی با نقطهٔ لاتین هم',
   codeRowTargetVer_(mkCodeRow('RPT#9', 'نسخهٔ ۴.۳ آماده است')) === '4.3');
ok('رقمِ عربی هم',
   codeRowTargetVer_(mkCodeRow('RPT#9', 'نسخهٔ ٤٫٣ آماده است')) === '4.3');
ok('و چنین ردیفی بسته می‌شود چون نسخهٔ در حالِ اجرا جلوتر است',
   codeRowSatisfied_(mkCodeRow('RPT#9', 'نسخهٔ ۴٫۳ آماده است')) === true);
ok('ولی نسخهٔ فارسیِ بالاتر همچنان باز می‌ماند',
   codeRowSatisfied_(mkCodeRow('RPT#9', 'نسخهٔ ۹٫۹ آماده است')) === false);
ok('رقمِ لاتین مثل قبل کار می‌کند',
   codeRowTargetVer_(mkCodeRow('CODE-5.10', 'x (5.8 ← 5.10)')) === '5.10');

console.log('\n✅ هر ' + pass + ' آزمونِ حلقهٔ گزارش گذشت.');
