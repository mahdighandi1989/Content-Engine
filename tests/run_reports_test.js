/* حلقهٔ بستهٔ «گزارش ← اقدام»:
   گزارش Cowork → تب گزارش‌ها → تزریق به پرامپت → بازخورد → ضدتکرار → تلگرامِ تعویض کد */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread, DFolder } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs', '33_VoiceIntake.gs', '34_Search.gs', '35_Embed.gs', '36_VoiceBridge.gs'];
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
  // پرسشِ حالت‌ها در هر قسمت (۸.۴۰) — همان تله: بی این شاخه جای پرامپتِ
  // نویسنده را می‌گرفت و «متنِ دستورها در پرامپتِ نویسنده» سرخ می‌شد.
  if (t.indexOf('کدام جمله‌ها حالِ خاصی می‌خواهند') !== -1) {
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ spans: [] }) }] } }] } };
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
/* فقط ردیف‌های همین گزارش شمرده می‌شوند، نه هر چیزی که در تب باشد: از ۶٫۴۷
   که همهٔ شیت‌های منبع اسکن می‌شوند، خودِ فیکسچر هم ممکن است یافتهٔ دیگری
   (مثلاً src-tab-unknown) بسازد. سنجه‌ای که کلِ تب را بشمرد، با هر یافتهٔ
   بی‌ربطِ تازه می‌شکند بی آنکه چیزی خراب شده باشد. */
const myRows = () => rows().filter(r => String(r[RC.ID-1]).indexOf('RPT-') === 0);
ok('هر پنج مورد در ردیف جدا ثبت شد، به‌علاوهٔ سطرِ سرجمع',
   myRows().length === 6, myRows().length + ' ردیف از ' + rows().length);
ok('سرجمعِ گزارش هم ردیف خودش را دارد', (() => {
  const r = myRows()[0];
  return String(r[RC.TITLE-1]).indexOf('سرجمعِ گزارش') === 0 &&
         String(r[RC.DETAIL-1]).indexOf('۵ ایراد') !== -1 &&
         String(r[RC.AT-1]) === '2026-08-10 12:35';
})());
ok('هر محتوا زیر ستون خودش نشست', (() => {
  const r = myRows()[1];
  return String(r[RC.AT-1]) === '2026-08-10 12:35' &&
         String(r[RC.PRI-1]) === 'جدی' &&
         String(r[RC.CAT-1]) === 'پرامپت روایت' &&
         String(r[RC.TITLE-1]).indexOf('تحریف روایت') === 0 &&
         String(r[RC.DETAIL-1]).indexOf('هدایت') !== -1 &&
         String(r[RC.INSTR-1]).indexOf('کلمه‌به‌کلمه') !== -1 &&
         String(r[RC.LOGGED-1]).length >= 10;
})());
ok('مورد نیازمند کد به کوورک واگذار شد و وضعیتش درست است',
   myRows().filter(r => r[RC.OWNER-1] === ROWNER_CODE &&
                        r[RC.STATUS-1] === RST.NEEDS_CODE).length === 1);
ok('فایل گزارش علامت خورد تا دوباره برداشته نشود',
   pendingReportFiles_().length === 0);

// ================= B) telegram alert ====================================
console.log('\n=== ب) هشدار تلگرامِ «کد باید عوض شود» ===');
console.log('  پیام‌های تلگرام:', TG.length);
TG.forEach(m => console.log('     ' + String(m).replace(/\n/g, ' ⏎ ').slice(0, 120)));
/* پیامِ همین گزارش سنجیده می‌شود، نه هر پیامی که در نخ باشد: از ۶٫۴۷ که
   همهٔ شیت‌های منبع اسکن می‌شوند، خودِ فیکسچر ممکن است یافتهٔ کدِ دیگری هم
   بسازد و پیامِ خودش را بفرستد. */
const tgCode = TG.filter(m => String(m).indexOf('کد موتور باید تعویض شود') !== -1);
ok('برای موردِ نیازمند کد، تلگرام رفت', tgCode.length >= 1, TG.length + ' پیام');
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
/* ۷٫۱۹ این عددها را یک واحد جابه‌جا کرد، و جابه‌جایی خودِ قابلیت است نه
   عارضه‌اش: `quote-fidelity` یک یافتهٔ «جدی» با مالکِ موتور است که در این
   سوئیت سه بار گزارش می‌شود. تا دیروز برای همیشه «تازه» می‌ماند — همان
   حفره‌ای که ۱۰ تا ۲۰ سپتامبر یافتهٔ «موتور درخواستِ غنی‌سازی نمی‌نویسد» را
   ده روز بی‌صاحب گذاشت. حالا به صفِ کد می‌رود، پس یکی از «باز»ها به
   «نیازمند تعویض کد» منتقل شده و جمعشان دست‌نخورده مانده. */
ok('خلاصهٔ گزارش‌ها در فایل وضعیت هست',
   st.reports && st.reports.open === 2 && st.reports.needsCode === 3,
   'باز ' + st.reports.open + ' · اطلاعاتی ' + st.reports.info + ' · کد ' + st.reports.needsCode);
ok('و جابه‌جایی از ارتقای یک یافتهٔ جدیِ موتور آمده، نه از جای دیگر',
   rows().some(r => String(r[RC.STATUS-1]) === RST.NEEDS_CODE &&
                    String(r[RC.DONE-1]).indexOf('ارتقا به صفِ کد') !== -1),
   rows().filter(r => String(r[RC.DONE-1]).indexOf('ارتقا') !== -1)
         .map(r => r[RC.ID-1] + ':' + r[RC.SEEN-1]).join(' · ') || '—');
ok('موردِ صرفاً اطلاعاتی جزو «در انتظار اقدام» شمرده نمی‌شود', st.reports.info === 3,
   'اطلاعاتی ' + st.reports.info);
ok('نسخهٔ کد در فایل وضعیت هست', st.codeVersion === CFG.CODE_VERSION);
/* همان جابه‌جاییِ ۷٫۱۹: یکی از «باز»ها به صفِ کد رفت، پس این فهرست هم یکی
   کمتر است. عدد به `st.reports.open` گره خورده تا اگر روزی این دو از هم
   واگرا شدند، همین‌جا دیده شود — نه اینکه دو عددِ مستقل هر کدام جدا درست
   به‌نظر برسند. */
ok('موارد باز با عنوان در فایل وضعیت آمده',
   st.reports.openItems.length === st.reports.open &&
   st.reports.openItems.length === 2 && st.reports.openItems[0].title.length > 5,
   st.reports.openItems.length + ' در برابرِ open=' + st.reports.open);
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

console.log('=== دو ساعتِ غنی‌سازی، دو نام (۶٫۸۰) ===');
{
  /* گزارشِ ناظر در ۱ سپتامبر دو عددِ ناسازگار کنارِ هم گذاشت: «آخرین اجرا
     امروز ۰۸:۴۳» و «۲ روز است کاری نکرده». هیچ‌کدام غلط نبود — دو چیزِ
     متفاوت را می‌شمردند و یک نام داشتند. ناظر هم نتوانست تصمیم بگیرد و
     فقط علامتش زد. */
  const root = global.__ROOT_FOLDER;
  const keep = global.__PROPS[PK.ENRICH_AT];
  global.__PROPS[PK.ENRICH_AT] = '2026-09-01 08:43';   // موتور امروز منتشر کرد
  // ولی تازه‌ترین پاسخِ تسک، دو روز پیش نوشته شده
  root.createFile(Utilities.newBlob('{}', 'application/json', '_ENRICH-special-26.json'));
  const st = enrichStatus_();
  ok('دو ساعت با نامِ خودشان بیرون می‌آیند',
     typeof st.lastAnswerAt === 'string' && typeof st.lastUsedAt === 'string' &&
     st.lastUsedAt === '2026-09-01 08:43', JSON.stringify({ a: st.lastAnswerAt, u: st.lastUsedAt }));
  ok('و «آخرین غنی‌سازی» از این پس یعنی کارِ تسک، نه لحظهٔ انتشارِ موتور',
     st.lastAt === st.lastAnswerAt && st.lastAt !== st.lastUsedAt,
     st.lastAt + ' ≠ ' + st.lastUsedAt);
  const s19 = fs.readFileSync('src/19_Enrich.gs', 'utf8');
  ok('و ساعتِ تسک از همان یک تعریفِ دیده‌بان می‌آید — نه کپیِ دوم',
     /answerAt = whNewestEnrich_\(\)/.test(s19));
  ok('و پنجرهٔ منو هر دو را با نامِ خودشان نشان می‌دهد',
     /آخرین پاسخِ تسک: /.test(s19) && /با منبعِ بیرونی منتشر شد: /.test(s19));
  if (keep === undefined) delete global.__PROPS[PK.ENRICH_AT];
  else global.__PROPS[PK.ENRICH_AT] = keep;
}

console.log('=== درِ خروجِ خودکار برای ردیفِ کهنه (۶٫۸۶) ===');
{
  /* وضعیتِ واقعیِ ۲ سپتامبر: «۶۵ دستورِ بازِ بازبینی» و «۶۸ یافته بیش از یک
     بار تکرار شده» — و ناظر در ایمیل از صاحبِ برنامه خواست سه ردیفِ ۱۰ اوت
     را دستی «نادیده گرفته شد» بزند، چون تنها درِ خروجِ دیگر همان بود.
     علتِ ساختاری: ردیفِ بی‌کد فقط با تزریق در پرامپت بسته می‌شود و تزریق
     سقفِ ۱۲ دارد؛ ردیفِ سیزدهم به بعد هرگز نوبت نمی‌گیرد. */
  const sh = ensureTab_(hub, CFG.REPORT_TAB, REPORT_HEADERS);
  const old = (d) => { const t = new Date(Date.now() - d * 86400000);
    const p = (n) => String(n).padStart(2, '0');
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()) + ' 10:00'; };
  const mkRow = (id, ageDays, owner, instr, status) => {
    const r = new Array(REPORT_HEADERS.length).fill('');
    r[RC.ID - 1] = id; r[RC.AT - 1] = old(ageDays); r[RC.LOGGED - 1] = old(ageDays);
    r[RC.PRI - 1] = 'متوسط'; r[RC.TITLE - 1] = 'عنوانِ ' + id;
    r[RC.INSTR - 1] = instr; r[RC.OWNER - 1] = owner;
    r[RC.STATUS - 1] = status; r[RC.SEEN - 1] = 1; r[RC.LAST_SEEN - 1] = old(ageDays);
    r[RC.FP - 1] = 'fp-' + id;
    sh.getRange(sh.getLastRow() + 1, 1, 1, REPORT_HEADERS.length).setValues([r]);
    return sh.getLastRow();
  };
  const rOld  = mkRow('OLD',   40, ROWNER_ENGINE, 'این را رعایت کن', RST.NEW);
  const rNew  = mkRow('FRESH',  3, ROWNER_ENGINE, 'این را رعایت کن', RST.NEW);
  const rCode = mkRow('CODE',  40, ROWNER_CODE,   'کد عوض شود',      RST.NEEDS_CODE);
  const rInfo = mkRow('INFO',  40, ROWNER_ENGINE, '',                RST.NEW);

  const res = reportStale_(hub, 21);
  ok('ردیفِ ۴۰روزهٔ دیده‌نشده خودکار بسته می‌شود', res.closed === 1, JSON.stringify(res));
  ok('و علتش روی خودِ ردیف نوشته می‌شود',
     String(sh.getRange(rOld, RC.STATUS).getValue()) === RST.CLOSED &&
     /کهنه/.test(String(sh.getRange(rOld, RC.DONE).getValue())),
     String(sh.getRange(rOld, RC.DONE).getValue()));
  ok('ردیفِ تازه دست نمی‌خورد',
     String(sh.getRange(rNew, RC.STATUS).getValue()) === RST.NEW);
  /* ۵٫۹۳: ردیفِ کد صفِ ساختِ نسخهٔ بعد است. بستنش با گذرِ زمان عیناً همان
     اشتباهی است که آنجا اصلاح شد — «نسخه هر چیزی را حل کرده». */
  ok('ردیفِ «نیازمند تعویض کد» هرگز با گذرِ زمان بسته نمی‌شود',
     String(sh.getRange(rCode, RC.STATUS).getValue()) === RST.NEEDS_CODE);
  ok('ردیفِ اطلاعاتیِ بی‌دستور هم نه',
     String(sh.getRange(rInfo, RC.STATUS).getValue()) === RST.NEW);

  /* ۸.۷۲ — شیتِ واقعی تاریخ را **شیءِ Date** پس می‌دهد. سنجهٔ بالا با رشته ساخته شده بود
     و همین شکلِ دست‌ساز بود که نگذاشت ببینیم این در هیچ ردیفی را نمی‌بست: «Mon Aug 10 …»
     با replace(' ', 'T') خراب و NaN می‌شد و `!t` ردیف را «تازه» نگه می‌داشت. */
  const rDate = mkRow('DATEOBJ', 40, ROWNER_ENGINE, 'این را رعایت کن', RST.NEW);
  const d40 = new Date(Date.now() - 40 * 86400000);
  sh.getRange(rDate, RC.AT).setValue(d40); sh.getRange(rDate, RC.LAST_SEEN).setValue(d40);
  const resD = reportStale_(hub, 21);
  ok('۸.۷۲ ردیفی که تاریخش شیءِ Date است (شکلِ واقعیِ شیت) هم بسته می‌شود',
     String(sh.getRange(rDate, RC.STATUS).getValue()) === RST.CLOSED && resD.closed === 1,
     JSON.stringify(resD) + ' ' + String(sh.getRange(rDate, RC.STATUS).getValue()));

  /* ۸.۸۷ — دو دری که بسته بود: مالکِ «کد» با وضعیتِ عادی، و «کد نصب شد — در انتظارِ تأیید». */
  const rOwnC = mkRow('OWNCODE', 60, ROWNER_CODE, 'نسخهٔ 5.1 نصب شود', RST.NEW);
  const rInst = mkRow('INST', 40, ROWNER_CODE, 'کد عوض شد', RST.INSTALLED);
  const rInstNew = mkRow('INSTNEW', 3, ROWNER_CODE, 'کد عوض شد', RST.INSTALLED);
  reportStale_(hub, 21);
  ok('۸.۸۷-۱ ردیفِ کهنهٔ مالکِ «کد» که «نیازمند تعویض کد» نیست، بسته می‌شود',
     String(sh.getRange(rOwnC, RC.STATUS).getValue()) === RST.CLOSED);
  ok('۸.۸۷-۲ «نصب شد — در انتظارِ تأیید» پس از ۲۱ روز بی‌تکرار با «تأیید» بسته می‌شود، تازه‌اش نه',
     String(sh.getRange(rInst, RC.STATUS).getValue()) === RST.CLOSED &&
     /تأیید/.test(String(sh.getRange(rInst, RC.DONE).getValue())) &&
     String(sh.getRange(rInstNew, RC.STATUS).getValue()) === RST.INSTALLED);
  ok('۸.۸۷-۳ و «نیازمند تعویض کد» همچنان دست نمی‌خورد',
     String(sh.getRange(rCode, RC.STATUS).getValue()) === RST.NEEDS_CODE);
  const sm0 = reportSummary_(hub);
  const rRepC = mkRow('REPCLOSED', 5, ROWNER_ENGINE, 'قاعده', RST.CLOSED);
  sh.getRange(rRepC, RC.SEEN).setValue(9);
  const rRepO = mkRow('REPOPEN', 2, ROWNER_ENGINE, 'قاعده', RST.NEW);
  sh.getRange(rRepO, RC.SEEN).setValue(4);
  const sm = reportSummary_(hub);
  ok('۸.۸۷-۴ «تکرارشده» فقط ردیفِ هنوز‌باز را می‌شمرد، نه تاریخچهٔ بسته‌ها',
     sm.repeated - sm0.repeated === 1 && sm.openItems.some(x => x.id === 'REPOPEN'), JSON.stringify({ rep: sm.repeated, before: sm0.repeated }));

  /* ══ مهم‌ترین بند: بستن باید بازگشت‌پذیر باشد ══
     رفت‌وبرگشتِ واقعی، نه ردیفِ دست‌ساز — چون اثرِ انگشت را خودِ کد می‌سازد و
     ردیفی که با اثرِ انگشتِ ساختگی بسته شود، هرگز همان ردیف شناخته نمی‌شود
     و سنجه روی شاخهٔ پوچ سبز می‌مانَد. */
  const fresh = { priority: 'متوسط', category: 'محتوا', key: 'stale-roundtrip',
                  title: 'نشانه‌ای که برمی‌گردد', detail: 'شرح',
                  instruction: 'این قاعده را رعایت کن', owner: ROWNER_ENGINE };
  logSelfFinding_(hub, fresh);
  const rowN = sh.getLastRow();
  ok('رفت‌وبرگشت: ردیف با مسیرِ واقعی ساخته شد',
     String(sh.getRange(rowN, RC.TITLE).getValue()) === fresh.title);
  // عقب‌بردنِ «آخرین تکرار» — تنها چیزی که reportStale_ به آن نگاه می‌کند
  sh.getRange(rowN, RC.AT).setValue(old(40));
  sh.getRange(rowN, RC.LAST_SEEN).setValue(old(40));
  reportStale_(hub, 21);
  ok('و پس از ۴۰ روز بی‌تکرار بسته شد',
     String(sh.getRange(rowN, RC.STATUS).getValue()) === RST.CLOSED);
  const before = sh.getLastRow();
  logSelfFinding_(hub, fresh);            // همان نشانه، دوباره دیده شد
  ok('و با دیدنِ دوبارهٔ همان نشانه، **همان ردیف** باز می‌شود — نه ردیفِ تازه',
     sh.getLastRow() === before &&
     String(sh.getRange(rowN, RC.STATUS).getValue()).indexOf('تکرار') !== -1,
     'rows=' + before + '→' + sh.getLastRow() +
     ' status=' + String(sh.getRange(rowN, RC.STATUS).getValue()));

  /* و جمله‌ای که کارِ نکرده را انجام‌شده نشان می‌داد. */
  const sum = reportSummary_(hub);
  ok('خلاصه می‌گوید چند تا از صف واقعاً تزریق می‌شود',
     sum.injectable === Math.min(sum.open, CFG.MAX_OPEN_INSTRUCTIONS) &&
     sum.waiting === Math.max(0, sum.open - sum.injectable),
     'open=' + sum.open + ' injectable=' + sum.injectable + ' waiting=' + sum.waiting);
}

/* ══ وارسی‌ای که انجام شد، و وارسی‌ای که انجام نشد (۶٫۹۵) ══
   تا امروز گزارش فقط `findings` داشت: خروجیِ «وارسی کردم و سالم بود» و
   خروجیِ «اصلاً وارسی نکردم» **بایتِ یکسان** بود. ۵ و ۶ سپتامبر همین شد —
   نقشهٔ راهِ جزوهٔ Audi دو فصلِ نوشته‌شده را «پیشِ رو» می‌گفت و هیچ گزارشی
   دربارهٔ جزوه نبود، بی آنکه بشود فهمید دیده نشده یا سالم دیده شده. */
console.log('\n══ وارسی‌های روزانهٔ ناظر ══');
{
  const hub = new Spread('هابِ وارسی');
  const P = global.__PROPS;
  delete P[PK.MON_CHECKS];
  const day = 86400000;
  const stamp = (ms) => new Date(Date.now() - ms).toISOString().slice(0, 19).replace('T', ' ');

  const st0 = monChecksStatus_(hub, true);
  ok('۱ پیش از اولین گزارشِ روزانه، سکوت ایراد نیست',
     st0.ok === true && /هنوز هیچ گزارشِ روزانه‌ای/.test(st0.line), st0.line);

  // یک گزارشِ روزانه بدونِ `checks` — پنجره باز می‌شود ولی هنوز تازه است
  monChecksIngest_({ findings: [] }, '_REPORT-20260906.json');
  const st1 = monChecksStatus_(hub, true);
  ok('۲ روزِ اولِ پنجره هم هشدار نمی‌دهد', st1.ok === true, st1.line);

  // پنجره را عقب می‌بریم: گزارشِ روزانه چند روز است می‌آید و هیچ وارسی‌ای نه
  const m = JSON.parse(P[PK.MON_CHECKS]);
  m.__rep.firstAt = stamp(5 * day);
  P[PK.MON_CHECKS] = JSON.stringify(m);
  const st2 = monChecksStatus_(hub, true);
  ok('۳ حالا سکوت دیده می‌شود و ایراد است',
     st2.ok === false && st2.silent.length === (CFG.MONITOR_CHECKS || []).length &&
     /سکوت یعنی نمی‌دانیم/.test(st2.line), st2.line);

  const sh = hub.getSheetByName(CFG.REPORT_TAB || 'گزارش‌های نظارت');
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  ok('۴ و یافته‌اش شکلِ درستِ فایل را در دستور می‌آورد',
     v.some((r) => r.join(' ').indexOf('verdict') !== -1),
     v.map((r) => String(r[RC.TITLE - 1])).join(' | ').slice(0, 200));

  // ناظر گزارش می‌دهد که وارسی را انجام داده — حتی وقتی نتیجه سالم است
  monChecksIngest_({ checks: (CFG.MONITOR_CHECKS || []).map((c) =>
    ({ key: c.key, verdict: 'سالم', note: 'دیده شد' })) }, '_REPORT-20260907.json');
  const st3 = monChecksStatus_(hub, false);
  ok('۵ «انجام شد و سالم بود» حالا شنیده می‌شود',
     st3.ok === true && st3.rows.every((r) => r.verdict === 'سالم'), st3.line);

  /* و «نشد» یک جواب است، نه حذفِ ردیف: وارسی‌ای که نشده باید *بگوید* نشده. */
  monChecksIngest_({ checks: [{ key: 'handout-read', verdict: 'نشد', note: 'وقت نشد' }] },
                   '_REPORT-20260908.json');
  const st4 = monChecksStatus_(hub, false);
  const hr = st4.rows.filter((r) => r.key === 'handout-read')[0];
  ok('۶ «نشد» ثبت می‌شود و گم نمی‌شود', hr && hr.verdict === 'نشد', JSON.stringify(hr || {}));

  /* ══ «نشد» دو روزِ پیاپی = شکست (۸.۳۲) ══
     ۱ تا ۳ اکتبر پنج وارسیِ «باز کن و ببین» هر روز «نشد» خوردند و این
     تابع گفت «هر ۹ وارسی گزارش شده». روزها با ساعتِ سراسری جلو می‌روند،
     نه با رکوردِ دست‌نوشتهٔ دیروز (۷.۲۲). */
  {
    const RealDate = Date;
    const onDay = (k, fn) => {
      const shift = k * 86400000;
      global.Date = class extends RealDate {
        constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + shift); }
        static now() { return RealDate.now() + shift; }
      };
      try { return fn(); } finally { global.Date = RealDate; }
    };
    delete P[PK.MON_CHECKS];
    const skipRep = { checks: [{ key: 'video-watch', verdict: 'نشد', note: 'ابزارِ پخشِ ویدئو در سشن نبود' }] };
    onDay(-1, () => monChecksIngest_(skipRep, '_REPORT-20261002.json'));
    onDay(-1, () => monChecksIngest_(skipRep, '_REPORT-20261002.json'));     // دو گزارش، یک روز
    const k1 = monChecksStatus_(hub, false);
    ok('۶-ب یک روز «نشد» (حتی با دو گزارش) هنوز شکست نیست',
       k1.skipped.length === 0 && k1.ok === true, k1.line);
    const before = sh.getLastRow();
    monChecksIngest_(skipRep, '_REPORT-20261003.json');
    const k2 = monChecksStatus_(hub, true);
    const vw = k2.skipped.filter((r) => r.key === 'video-watch')[0];
    const vs = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
                 .filter((r) => r.join(' ').indexOf('روزهای پیاپی «نشد»') !== -1);
    ok('۶-پ دو روزِ پیاپی «نشد» شکست است، علتش در سطر می‌آید، و یافتهٔ کد می‌سازد',
       k2.ok === false && vw && vw.skipDays === 2 && /ابزارِ پخشِ ویدئو/.test(k2.line) &&
       vs.length === 1 && vs[0].join(' ').indexOf(ROWNER_CODE) !== -1 && sh.getLastRow() > before,
       k2.line);
    monChecksIngest_({ checks: [{ key: 'video-watch', verdict: 'سالم', note: 'سه قاب دیده شد' }] },
                     '_REPORT-20261003.json');
    const k3 = monChecksStatus_(hub, false);
    ok('۶-ت «سالم» زنجیره را می‌بُرد', k3.skipped.length === 0 && k3.ok === true, k3.line);
    delete P[PK.MON_CHECKS];
  }

  /* گزارشِ ساعتیِ غنی‌سازی پنجره را باز نمی‌کند — وگرنه هر ساعت یک «روز»
     می‌شد و سنجه بی‌معنا. */
  delete P[PK.MON_CHECKS];
  monChecksIngest_({ findings: [] }, '_REPORT-20260906-enrich.json');
  ok('۷ گزارشِ غیرِ روزانه پنجرهٔ سنجش را باز نمی‌کند',
     !P[PK.MON_CHECKS] || !(JSON.parse(P[PK.MON_CHECKS]).__rep || {}).firstAt);
  delete P[PK.MON_CHECKS];
}

console.log('\n=== ی) صفِ تعویضِ کد — چرا خالی نمی‌شد، و چه چیزی حالا می‌گوید ===');
/* ══ علتِ واقعی، پیدا شده ۲۲ سپتامبر ══
   تنها مسیرِ بسته‌شدنِ یک ردیف این است که `manifest.json` شناسه‌اش را
   **به‌نام** در `sourceReportIds` بیاورد (۵٫۹۳، که خودش درست بود).
   ولی از سی نسخهٔ اخیر **یکی** آن فهرست را پر کرده — پس صف فقط
   می‌توانست رشد کند. «دری که آدم باید دستی بازش کند، در نیست.»
   اینجا نه بستنِ خودکار اضافه می‌شود و نه ردیفی دوباره ثبت؛ فقط عدد
   صادق می‌شود و بی‌جواب‌ماندن خودش یک یافته. */
{
  const daysAgo = (n) => {
    const d = new Date(Date.now() - n * 86400000);
    const p2 = (x) => (x < 10 ? '0' : '') + x;
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) +
           ' 12:00';
  };
  const mkQ = (id, lastSeen, done, doneAt) => {
    const r = new Array(REPORT_HEADERS.length).fill('');
    r[RC.ID-1] = id; r[RC.AT-1] = daysAgo(40); r[RC.LOGGED-1] = daysAgo(40);
    r[RC.PRI-1] = 'جدی'; r[RC.CAT-1] = 'کد'; r[RC.TITLE-1] = 'ت ' + id;
    r[RC.OWNER-1] = ROWNER_CODE; r[RC.STATUS-1] = RST.NEEDS_CODE;
    r[RC.SEEN-1] = 1; r[RC.LAST_SEEN-1] = lastSeen || '';
    r[RC.DONE-1] = done || ''; r[RC.DONE_AT-1] = doneAt || '';
    return r;
  };
  const at0 = rt.getLastRow() + 1;
  const fresh = [
    mkQ('QQ-1', daysAgo(1)),        // هنوز تکرار می‌شود
    mkQ('QQ-2', daysAgo(2)),
    mkQ('QQ-3', daysAgo(30)),       // ۳۰ روز است دیده نشده
    mkQ('QQ-4', daysAgo(45)),
  ];
  rt.getRange(at0, 1, fresh.length, REPORT_HEADERS.length).setValues(fresh);

  const q = codeQueue_(hub);
  /* ۸.۹۳ — فهرستِ خودِ صف با نام: فقط «در انتظار»ها، نه ساکت‌ها، با آخرین دیده‌شدن. */
  const qi = (q.items || []).filter(x => /^QQ-/.test(x.id));
  ok('ی.۰ فهرستِ صف با نام می‌آید: QQ-1/QQ-2 (در انتظار) با آخرین دیده‌شدن، و ساکت‌ها نه',
     qi.length === 2 && qi.some(x => x.id === 'QQ-1' && x.lastDays === 1) && !qi.some(x => /QQ-[34]/.test(x.id)) &&
     qi.every(x => typeof x.title === 'string' && x.seen >= 1), JSON.stringify(qi));
  ok('ی.۱ «در انتظار» و «ساکت» جدا شمرده می‌شوند',
     q.pending >= 2 && q.quiet >= 2,
     'گرفت: pending=' + q.pending + ' quiet=' + q.quiet +
     ' — گزارشِ چیزی که تکان نمی‌خورد به‌عنوانِ «در انتظار» همان است که هشدار را نویز می‌کند');
  ok('ی.۲ و هیچ‌کدام بسته نمی‌شوند',
     rows().filter(r => String(r[RC.ID-1]).indexOf('QQ-') === 0 &&
                   String(r[RC.STATUS-1]) === RST.NEEDS_CODE).length === 4,
     'سکوت می‌تواند یعنی خرابیِ خودِ تشخیص‌دهنده؛ بستنِ خودکار آن را برای همیشه پنهان می‌کند');

  const line = codeQueueLine_(q);
  ok('ی.۳ سطرِ روزانه هر دو عدد را می‌گوید',
     /در انتظار/.test(line) && /ساکت/.test(line));
  ok('ی.۴ و صریح می‌گوید «ساکت» یعنی حل‌شده نیست',
     /حل‌شده/.test(line), line);
  ok('ی.۵ و می‌گوید هیچ نسخه‌ای به‌نام چیزی نبسته',
     q.noAnswerDays === -1 && /به‌نام نبسته/.test(line), line);

  /* و الزام: ۷٫۱۸/۷٫۱۹ — تشخیص نیمهٔ گم‌شده نبود، الزام بود. */
  const before = rows().filter(r => String(r[RC.CAT-1]) === 'کد').length;
  ok('ی.۶ صفی که جواب نمی‌گیرد خودش یک یافته می‌شود',
     codeQueueStuck_(hub, q) === true &&
     rows().some(r => /خالی نمی‌شود/.test(String(r[RC.TITLE-1]))),
     'گزارشی که هیچ‌کس را مکلف نکند، با نبودنش یکی است');
  ok('ی.۷ و دستورش راهِ واقعیِ بستن را می‌گوید',
     rows().some(r => /sourceReportIds/.test(String(r[RC.INSTR-1]))),
     'وگرنه همان ردیف فردا دوباره ثبت می‌شود و باز بسته نمی‌شود');

  /* مرزِ مقابل: نسخه‌ای که تازگی چیزی را به‌نام بسته، یافته نمی‌سازد. */
  const at1 = rt.getLastRow() + 1;
  rt.getRange(at1, 1, 1, REPORT_HEADERS.length).setValues([
    mkQ('QQ-5', daysAgo(1), 'کدِ نسخهٔ 7.41 خودکار نصب شد', daysAgo(1))]);
  const q2 = codeQueue_(hub);
  ok('ی.۸ ولی اگر تازه چیزی بسته شده باشد، یافته‌ای نیست',
     q2.noAnswerDays === 1 && q2.answeredVersion === '7.41' &&
     codeQueueStuck_(hub, q2) === false,
     'گرفت: noAnswerDays=' + q2.noAnswerDays + ' v=' + q2.answeredVersion);
  ok('ی.۹ و آن‌وقت سطر شکایتی ندارد',
     !/به‌نام نبسته/.test(codeQueueLine_(q2)), codeQueueLine_(q2));
}

/* ══ ی-ب) کارِ کدِ امروزِ ناظر — از «دیده شد» تا «درست شد» (۸.۵۵) ══
 * ۶ اکتبر: ۳۰ ردیفِ «در انتظار»، ۱۴ ایرادِ مزمن — و ناظر نوشت «کدی ساخته نشد:
 * یافتهٔ تازه‌ای نبود». صفی که ناظر خودش از میانش برگزیند، هر روز «هیچ‌کدام» را
 * برمی‌گزیند. پس موتور یکی را برمی‌گزیند، روزها را می‌شمارد، و ماندنش زنگ است. */
{
  console.log('\n══ ی-ب) کارِ کدِ امروزِ ناظر ══');
  const P = global.__PROPS;
  delete P[PK.CODE_TASK]; delete P[PK.CODE_TASK_SKIP];
  const C = (key, pri, seen, since) => ({ id: 'ENG-20260901-1000#' + key, pri: pri, title: 'کار ' + key,
                                          instr: 'دستور ' + key, seen: seen, since: since });
  const cand = [C('alpha', 'متوسط', 9, '2026-08-01 10:00'), C('beta', 'جدی', 2, '2026-08-20 10:00'),
                C('gamma', 'جدی', 7, '2026-09-01 10:00'), C('delta', 'جدی', 7, '2026-08-25 10:00'),
                C('code-task-ignored', 'جدی', 99, '2026-07-01 10:00')];
  const t1 = codeTaskPick_(cand);
  ok('ی-ب.۱ یکی برگزیده می‌شود: جدی پیش از متوسط، پرتکرار پیش از کم‌تکرار، کهنه پیش از تازه — و زنگِ خودِ این سازوکار کار نیست',
     t1 && t1.key === 'delta' && t1.id === 'ENG-20260901-1000#delta', JSON.stringify(t1));
  ok('ی-ب.۲ و ردیفِ «RPT-…#5» کلیدِ عددی ندارد — کلیدِ بستنش خودِ شناسه است (۷.۴۸)',
     codeTaskPick_([{ id: 'RPT-2026-08-10-1235#5', pri: 'جدی', title: 't', instr: '', seen: 1, since: '' }]).key ===
     'RPT-2026-08-10-1235#5');

  ok('ی-ب.۳ «رد» بی علتِ مشخص پذیرفته نمی‌شود — «نشد» بی علت همان سکوت است',
     codeTaskIngest_({ codeTask: { id: t1.id, verdict: 'رد', why: 'نه' } }) === false &&
     codeTaskPick_(cand).key === 'delta');
  ok('ی-ب.۴ «رد» با علت، آن کار را تا هفت روز کنار می‌گذارد و نوبت به بعدی می‌رسد',
     codeTaskIngest_({ codeTask: { id: t1.id, verdict: 'رد', why: 'تصمیمِ پولیِ صاحبِ برنامه است، نه کد' } }) === true &&
     codeTaskPick_(cand).key === 'gamma', JSON.stringify(codeTaskPick_(cand)));
  delete P[PK.CODE_TASK_SKIP];

  /* شمارشِ روزها و زنگ — از درِ خودِ `codeTaskTrack_`، با تلگرامِ شمرده‌شده. */
  const kTg = global.tgSend_, kEn = global.tgEnabled_;
  let tg = [];
  global.tgEnabled_ = () => true; global.tgSend_ = (t) => { tg.push(t); return true; };
  const q = { task: codeTaskPick_(cand) };
  const a1 = codeTaskTrack_(hub, q);
  const a1b = codeTaskTrack_(hub, q);                      // اجرای دوم در همان روز
  ok('ی-ب.۵ روزِ اول: سطر کار و کلیدِ بستن را می‌گوید، زنگی نیست؛ دو اجرا در یک روز یک روز است',
     a1.days === 1 && a1b.days === 1 && !a1.escalated && tg.length === 0 &&
     a1.line.indexOf('`delta`') !== -1, a1.line);
  const stt = JSON.parse(P[PK.CODE_TASK]); stt.day = '2000-01-01'; stt.days = 2; P[PK.CODE_TASK] = JSON.stringify(stt);
  const findingsBefore = rows().filter(r => /code-task-ignored/.test(String(r[RC.ID-1]))).length;
  const a3 = codeTaskTrack_(hub, q);
  const findingsAfter = rows().filter(r => /code-task-ignored/.test(String(r[RC.ID-1]))).length;
  ok('ی-ب.۶ روزِ سوم روی همان کار ⇒ یافتهٔ «جدی» و تلگرامِ فوری',
     a3.days === 3 && a3.escalated && tg.length === 1 && findingsAfter === findingsBefore + 1 &&
     /برنداشته/.test(tg[0]), a3.line + ' · ' + tg.length + ' پیام: ' + (tg[0] || '').slice(0, 120));
  const st2 = JSON.parse(P[PK.CODE_TASK]); st2.day = '2000-01-02'; P[PK.CODE_TASK] = JSON.stringify(st2);
  const a4 = codeTaskTrack_(hub, q);
  ok('ی-ب.۷ و برای همان کار یک بار — زنگی که هر روز بخورد خوانده نمی‌شود',
     a4.days === 4 && !a4.escalated && tg.length === 1);
  const a5 = codeTaskTrack_(hub, { task: codeTaskPick_([C('epsilon', 'جدی', 1, '2026-09-01 10:00')]) });
  ok('ی-ب.۸ کارِ تازه (ردیفِ قبلی بسته شد) شمارش را از نو می‌کند',
     a5.days === 1 && !a5.escalated && /epsilon/.test(a5.line));
  const a6 = codeTaskTrack_(hub, { task: null });
  ok('ی-ب.۹ صفِ خالی هم گفته می‌شود — سکوت شبیهِ سلامت است، نه خودِ آن',
     /کاری ندارد/.test(a6.line) && !P[PK.CODE_TASK], a6.line);
  global.tgSend_ = kTg; global.tgEnabled_ = kEn;

  /* و از درِ `codeQueue_`: کار از همان ردیف‌های «در انتظارِ» واقعیِ تب می‌آید. */
  const qq = codeQueue_(hub);
  const pendIds = rows().filter(r => String(r[RC.STATUS-1]) === RST.NEEDS_CODE).map(r => String(r[RC.ID-1]));
  ok('ی-ب.۱۰ `_STATUS.json` (codeQueue.task) یکی از ردیف‌های واقعیِ «نیازمند تعویض کد» را دارد',
     qq.task && pendIds.indexOf(qq.task.id) !== -1 && !!qq.task.key, JSON.stringify(qq.task));
  delete P[PK.CODE_TASK];
}

/* ══ ک) شکافِ «گزارش ← اقدام»: ادعا در برابرِ مشاهده ══
 *
 * تا ۷٫۵۶ یک ردیف **فقط** با نامِ کلیدش در `sourceReportIds` بسته می‌شد، و
 * هیچ‌چیز آن ادعا را با شرطی که ردیف را ساخته نمی‌سنجید. ۲۳ سپتامبر همین
 * شد: ۷٫۴۸ ردیفِ `tts-cue-unsupported` را به‌نام بست در حالی که لحن
 * همچنان خاموش بود و `ttsCueStatus_()` هر روز در ایمیل همین را می‌گفت.
 *
 * این بخش **اجرا** می‌کند، نه می‌خوانَد: ردیف می‌سازد، وضعیتِ زنده را
 * می‌چیند، و از خودِ `markCodeRowsInstalled_` و `selfVerifySweep_` می‌پرسد
 * ردیف چه شد. */
{
  console.log('\n══ ک) ادعا در برابرِ مشاهده ══');
  const mkR = (id, status, done) => {
    const r = new Array(REPORT_HEADERS.length).fill('');
    r[RC.ID-1] = id; r[RC.AT-1] = '2026-09-01 10:00'; r[RC.LOGGED-1] = '2026-09-01 10:00';
    r[RC.PRI-1] = 'جدی'; r[RC.CAT-1] = 'کد'; r[RC.TITLE-1] = 'ت ' + id;
    r[RC.OWNER-1] = ROWNER_CODE; r[RC.STATUS-1] = status;
    r[RC.SEEN-1] = 1; r[RC.LAST_SEEN-1] = '2026-09-01 10:00';
    r[RC.DONE-1] = done || ''; r[RC.DONE_AT-1] = done ? '2026-09-01 11:00' : '';
    return r;
  };
  const rowOf = (id) => {
    const n = rt.getLastRow() - 1;
    const v = rt.getRange(2, 1, n, REPORT_HEADERS.length).getValues();
    for (let i = 0; i < n; i++) if (String(v[i][RC.ID-1]) === id) return v[i];
    return null;
  };
  // وضعیتِ زنده را دستی می‌چینیم — همان شکلی که `writeStatus_` می‌سازد.
  const stOff = { ttsCue: { ok: false, on: false }, nightStarve: { ok: true },
                  codeQueue: { pending: 0, quiet: 0, noAnswerDays: 1 } };
  const stOn  = { ttsCue: { ok: true,  on: true  }, nightStarve: { ok: true },
                  codeQueue: { pending: 0, quiet: 0, noAnswerDays: 1 } };

  // ── ک.۱ سنجنده، شرطِ زنده را می‌بیند ─────────────────────────────
  const vOff = selfVerifyOne_('tts-cue-unsupported', stOff);
  const vOn  = selfVerifyOne_('tts-cue-unsupported', stOn);
  ok('ک.۱ سنجنده «هنوز برقرار است» را از وضعیتِ زنده می‌خوانَد',
     vOff.known && vOff.still === true && vOn.still === false,
     'خاموش→' + vOff.still + ' · روشن→' + vOn.still);

  // ── ک.۲ «نمی‌دانم» با «نیست» یکی نیست ────────────────────────────
  const vDun  = selfVerifyOne_('tts-cue-unsupported', {});
  const vJunk = selfVerifyOne_('tts-cue-unsupported', { ttsCue: {} });
  ok('ک.۲ وضعیتِ نبوده «نمی‌دانم» است، نه «سالم»',
     vDun.known === true && vDun.still === null && /در گزارشِ زنده نیست/.test(vDun.why),
     'نبودِ خبر خبرِ خوب نیست');
  /* و حالتی که واقعاً به **گزاره** می‌رسد: وضعیت هست، ولی `ok` بولی نیست.
     بدونِ این، هر دو راه `null` می‌دادند و شکستنِ گزاره سبز می‌ماند —
     سنجه‌ای که راهی غیر از آنچه نامش را می‌برد می‌رود. */
  ok('ک.۲-ب وضعیتِ ناخوانا هم «نمی‌دانم» است',
     vJunk.known === true && vJunk.still === null,
     'گزاره صدا زده شد و `null` داد، نه `false`');

  // ── ک.۳ ردیفِ بسته، با شرطِ زنده، **باز می‌شود** ──────────────────
  const a0 = rt.getLastRow() + 1;
  rt.getRange(a0, 1, 2, REPORT_HEADERS.length).setValues([
    mkR('ENG-20260901-1000#tts-cue-unsupported', RST.INSTALLED, 'کدِ نسخهٔ 7.48 خودکار نصب شد'),
    mkR('ENG-20260901-1001#night-starve',        RST.INSTALLED, 'کدِ نسخهٔ 7.48 خودکار نصب شد')]);
  const un = quiet();
  const sw = selfVerifySweep_(hub, stOff);
  un();
  const rTts = rowOf('ENG-20260901-1000#tts-cue-unsupported');
  ok('ک.۳ ردیفی که بسته شد ولی شرطش برقرار است، بازگشایی می‌شود',
     String(rTts[RC.STATUS-1]) === RST.NEEDS_CODE && sw.reopened >= 1,
     'وضعیت: ' + rTts[RC.STATUS-1]);
  ok('ک.۳-ب و دلیلش در خودِ ردیف نوشته می‌شود',
     /شرطش هنوز برقرار/.test(String(rTts[RC.DONE-1])),
     String(rTts[RC.DONE-1]).slice(-60));

  // ── ک.۴ و ردیفی که شرطش رفته، **بسته نمی‌شود** ───────────────────
  const rNs = rowOf('ENG-20260901-1001#night-starve');
  ok('ک.۴ ردیفی که شرطش **سنجیده و برقرار نیست**، دست‌نخورده می‌ماند',
     String(rNs[RC.STATUS-1]) === RST.INSTALLED &&
     selfVerifyOne_('night-starve', stOff).still === false,
     'سنجنده هرگز نمی‌بندد — سکوت می‌تواند کوریِ تشخیص‌دهنده باشد (۷٫۴۲)');

  // ── ک.۵ «نادیده گرفته شد» تصمیمِ آدم است ─────────────────────────
  const a1 = rt.getLastRow() + 1;
  rt.getRange(a1, 1, 1, REPORT_HEADERS.length).setValues([
    mkR('ENG-20260902-1000#tts-cue-unsupported', RST.SKIPPED, 'دستی نادیده گرفته شد')]);
  const un2 = quiet(); selfVerifySweep_(hub, stOff); un2();
  ok('ک.۵ ردیفِ «نادیده گرفته شد» بازگشایی نمی‌شود',
     String(rowOf('ENG-20260902-1000#tts-cue-unsupported')[RC.STATUS-1]) === RST.SKIPPED,
     'تصمیمِ آدم بر مشاهدهٔ کد مقدم است');

  // ── ک.۶ دروازهٔ نصب: ادعا در برابرِ شرطِ زنده می‌بازد ─────────────
  const a2 = rt.getLastRow() + 1;
  rt.getRange(a2, 1, 2, REPORT_HEADERS.length).setValues([
    mkR('ENG-20260903-1000#tts-cue-unsupported', RST.NEEDS_CODE, ''),
    mkR('ENG-20260903-1001#handout-empty-patch', RST.NEEDS_CODE, '')]);
  const realManifest = global.readCodeManifest_;
  const realStatus   = global.writeStatus_;
  global.readCodeManifest_ = () => ({ ok: true, info: {
    version: '9.99', sourceReportIds: ['tts-cue-unsupported', 'handout-empty-patch'] } });
  global.writeStatus_ = () => stOff;          // لحن همین حالا خاموش است
  const un3 = quiet();
  const n1 = markCodeRowsInstalled_('9.99');
  un3();
  const gTts = rowOf('ENG-20260903-1000#tts-cue-unsupported');
  const gHo  = rowOf('ENG-20260903-1001#handout-empty-patch');
  ok('ک.۶ بیانیه ادعا کرد، ولی شرط زنده بود: ردیف باز ماند',
     String(gTts[RC.STATUS-1]) === RST.NEEDS_CODE,
     'وضعیت: ' + gTts[RC.STATUS-1]);
  ok('ک.۶-ب و علتِ باز ماندنش نوشته شد',
     /ادعای جواب کرد ولی شرط هنوز برقرار/.test(String(gTts[RC.DONE-1])),
     String(gTts[RC.DONE-1]).slice(0, 70));
  /* مرزِ افزایشی‌بودن: کلیدی که سنجنده ندارد، دقیقاً مثلِ دیروز بسته
     می‌شود. وگرنه این سازوکار صف را دوباره غیرقابلِ بستن می‌کرد — همان
     دری که ۷٫۴۲ باز کرد. */
  ok('ک.۶-پ ولی کلیدِ بی‌سنجنده مثلِ دیروز بسته می‌شود',
     String(gHo[RC.STATUS-1]) === RST.INSTALLED && n1 >= 1,
     'وضعیت: ' + gHo[RC.STATUS-1] + ' · مُهرخورده: ' + n1);

  // ── ک.۷ و وقتی شرط رفت، همان ردیف بسته می‌شود ────────────────────
  global.writeStatus_ = () => stOn;           // لحن روشن شد
  const un4 = quiet();
  markCodeRowsInstalled_('9.99');
  un4();
  /* ک.۶-ت مسیرِ بحرانی: کلیدِ بی‌سنجنده نباید `writeStatus_` را صدا بزند.
     این تابع از `afterCodeSwap` می‌آید — همان جایی که زمان‌بندی‌ها دوباره
     چیده می‌شوند. مردنش آنجا یعنی موتورِ بی‌زمان‌بندی، بی هیچ خطایی. */
  {
    const a3 = rt.getLastRow() + 1;
    rt.getRange(a3, 1, 1, REPORT_HEADERS.length).setValues([
      mkR('ENG-20260904-1000#handout-empty-patch', RST.NEEDS_CODE, '')]);
    global.readCodeManifest_ = () => ({ ok: true, info: {
      version: '9.98', sourceReportIds: ['handout-empty-patch'] } });
    let calls = 0;
    global.writeStatus_ = () => { calls++; return stOn; };
    const un5 = quiet(); markCodeRowsInstalled_('9.98'); un5();
    ok('ک.۶-ت کلیدِ بی‌سنجنده وضعیتِ زنده را نمی‌خوانَد',
       calls === 0 &&
       String(rowOf('ENG-20260904-1000#handout-empty-patch')[RC.STATUS-1]) === RST.INSTALLED,
       'writeStatus_ صدا زده شد: ' + calls + ' بار');
    global.readCodeManifest_ = () => ({ ok: true, info: {
      version: '9.99', sourceReportIds: ['tts-cue-unsupported', 'handout-empty-patch'] } });
    global.writeStatus_ = () => stOff;
  }

  ok('ک.۷ شرط که رفت، همان ردیف بسته می‌شود',
     String(rowOf('ENG-20260903-1000#tts-cue-unsupported')[RC.STATUS-1]) === RST.INSTALLED,
     'دروازه در را قفل نمی‌کند، فقط ادعای بی‌شاهد را رد می‌کند');
  global.readCodeManifest_ = realManifest;
  global.writeStatus_ = realStatus;

  // ── ک.۸ «#۵» کلید نیست (مرزِ ۷٫۴۸، اینجا هم) ─────────────────────
  ok('ک.۸ پسوندِ عددیِ شناسه کلید نیست',
     selfRowKey_('RPT-2026-08-10-1235#5') === '' &&
     selfRowKey_('ENG-20260901-1000#tts-cue-unsupported') === 'tts-cue-unsupported');

  // ── ک.۹ سطرِ روزانه، **هر روز** ──────────────────────────────────
  ok('ک.۹ سطرِ روزانه حتی بی‌بازگشایی هم متن دارد',
     /سنجشِ ردیف‌های بسته/.test(selfVerifyLine_({ checked: 3, reopened: 0, live: 0, uncovered: 2, broken: [], keys: [] })),
     selfVerifyLine_({ checked: 3, reopened: 0, live: 0, uncovered: 2, broken: [], keys: [] }));
  ok('ک.۹-ب و سنجندهٔ خراب به‌نام گفته می‌شود',
     /سنجندهٔ خراب/.test(selfVerifyLine_({ checked: 1, reopened: 0, live: 0, uncovered: 0, broken: ['k (نیست)'], keys: [] })),
     'بی‌صدا رد شدن یعنی نقشه کهنه می‌شود و هیچ‌کس نمی‌فهمد');
}

console.log('\n=== ل) یافته‌ای که در جای اشتباه فرستاده شود، گم نمی‌شود (۸.۲۱) ===');
{
  /* سیاههٔ واقعیِ ۱ اکتبر، دو بار در دو ساعت:
       «ثبت یافتهٔ خودِ موتور ناموفق: Cannot read properties of undefined
        (reading 'key')»
     علتش یک فراخوانِ **یک‌آرگومانی** بود — `logSelfFinding_({...})` — که شیءِ
     یافته را در جای `hub` می‌گذارد و `f` را `undefined` می‌کند. `reportFp_`
     روی `f.key` می‌ترکد و **دو** `catch` خاموشش می‌کنند. پس یافته‌ای که هر
     روز می‌زد — «یک‌هفتمِ واژه‌ها اعراب نمی‌گیرند»، همان ریشه‌ای که
     ۸.۰۳/۸.۰۴ دنبالش بودند — هیچ‌وقت در صف ننشست.
     مرز در خودِ تابع است نه سرِ هر فراخوان: مرزی که هر صدازننده خودش باید
     رعایتش کند، همان است که صدازنندهٔ بعدی فراموشش می‌کند (۵.۹۵). */
  const hubL = new Spread('HUB-L');
  global.__SS[CFG.HUB_ID || 'HUB-L'] = hubL;
  global.__SS['HUB-L'] = hubL;
  const realGet = global.getHub_;
  global.getHub_ = () => hubL;
  try {
    ensureReportTab_(hubL);
    const before = loadReportRows_(hubL).rows.length;
    logSelfFinding_({ key: 'oneArg-guard', priority: 'متوسط', category: 'آزمون',
                      title: 'یافتهٔ یک‌آرگومانی', detail: 'د',
                      instruction: 'د', owner: 'کد' });
    const rows = loadReportRows_(hubL).rows;
    ok('ل.۱ فراخوانِ یک‌آرگومانی هم ثبت می‌شود، نه اینکه بی‌صدا دور ریخته شود',
       rows.length === before + 1 &&
       rows.some((r) => String(r.vals[RC.ID - 1]).indexOf('oneArg-guard') !== -1),
       'پیش: ' + before + ' · پس: ' + rows.length);
    /* و شکلِ درست هنوز کار می‌کند — سدِ تازه نباید راهِ اصلی را خراب کند. */
    const b2 = loadReportRows_(hubL).rows.length;
    logSelfFinding_(hubL, { key: 'twoArg-ok', priority: 'کم', category: 'آزمون',
                            title: 'یافتهٔ دوآرگومانی', detail: 'د',
                            instruction: 'د', owner: 'کد' });
    /* ثبت می‌شود نه ادعا (۷.۷۴): خراب‌کردنِ مرز طوری که شکلِ **درست** را هم
       بخورد، روی سنجهٔ قدیمی‌ترِ «رفت‌وبرگشت: ردیف با مسیرِ واقعی ساخته شد»
       می‌نشیند، چون آن زودتر می‌دود و همین مرز را از سمتِ دیگر نگه داشته. */
    ok('ل.۲ و شکلِ درست (hub, f) دست‌نخورده کار می‌کند',
       loadReportRows_(hubL).rows.length === b2 + 1,
       'پیش: ' + b2 + ' · پس: ' + loadReportRows_(hubL).rows.length);
  } finally { global.getHub_ = realGet; }
}

console.log('\n=== 8.92) دفترِ درخواست‌های صاحبِ برنامه ===');
{
  /* «آیا سیستم به اتوماسیونی رسیده که درخواست‌های جدیدم را بگویم و پیگیریِ اجرایشان را به ناظر بسپاری؟»
     تعریف در ریپو، داوری از ناظر، وضع از کد — و هر روز در ایمیل. */
  const RealDate = Date;
  const onDay = (k, fn) => {
    const shift = k * 86400000;
    global.Date = class extends RealDate {
      constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + shift); }
      static now() { return RealDate.now() + shift; }
    };
    try { return fn(); } finally { global.Date = RealDate; }
  };
  const PR = global.__PROPS;
  delete PR[PK.REQ_CHECKS];
  const ev = 'نشانِ ویدئوی special:72 «@truth_trace1» است';
  // ۱) دو «درست» در یک روز یک روز است؛ روزِ دوم «انجام و سنجیده»
  onDay(-1, () => reqIngest_({ requests: [{ id: 'R-20261014-01', verdict: 'درست', evidence: ev }] }));
  onDay(-1, () => reqIngest_({ requests: [{ id: 'R-20261014-01', verdict: 'درست', evidence: ev }] }));
  let m = JSON.parse(PR[PK.REQ_CHECKS]);
  ok('8.92-1 دو داوریِ «درست» در یک روز یک روز شمرده می‌شود', m['R-20261014-01'].okDays === 1 && !m['R-20261014-01'].doneAt,
     JSON.stringify(m['R-20261014-01']));
  reqIngest_({ requests: [{ id: 'R-20261014-01', verdict: 'سالم', evidence: ev }] });
  m = JSON.parse(PR[PK.REQ_CHECKS]);
  ok('8.92-2 روزِ جدای دوم ⇒ «انجام و سنجیده» (doneAt)', m['R-20261014-01'].okDays === 2 && !!m['R-20261014-01'].doneAt);
  // ۲) «درست» بی شاهد «نشد» است؛ «نادرست» شمار را صفر می‌کند؛ شناسهٔ بدشکل کنار می‌رود
  const n3 = reqIngest_({ requests: [{ id: 'R-20261014-02', verdict: 'درست', evidence: '' },
                                     { id: 'R-20261014-03', verdict: 'درست', evidence: 'سطرِ صف در health.problems نیست' },
                                     { id: 'bad-id', verdict: 'درست', evidence: 'xxxxxxxxxxxx' }] });
  onDay(1, () => reqIngest_({ requests: [{ id: 'R-20261014-03', verdict: 'ایراد', evidence: 'باز ۴۲ تاست' }] }));
  m = JSON.parse(PR[PK.REQ_CHECKS]);
  ok('8.92-3 «درست» بی شاهد «نشد» است، «نادرست» صفر می‌کند، شناسهٔ بدشکل ثبت نمی‌شود',
     n3 === 2 && m['R-20261014-02'].v === 'نشد' && m['R-20261014-03'].v === 'نادرست' &&
     m['R-20261014-03'].okDays === 0 && !m['bad-id'], JSON.stringify([m['R-20261014-02'], m['R-20261014-03']]));

  // ۳) وضع از کد: انجام، نادرست، در راهِ نصب، کارِ شما، سنجیده‌نشده
  const keepStub = global.__STUB, keepVer = CFG.CODE_VERSION;
  CFG.CODE_VERSION = '8.92';
  const defs = { requests: [
    { id: 'R-20261014-01', at: '2026-10-14', ask: 'شناسهٔ درست', done: 'x', how: 'y', ver: '8.90' },
    { id: 'R-20261014-03', at: '2026-10-14', ask: 'صفِ بازبینی', done: 'x', how: 'y', ver: '8.87' },
    { id: 'R-20261014-07', at: '2026-10-14', ask: 'چیزی که هنوز نصب نشده', done: 'x', how: 'y', ver: '8.99' },
    { id: 'R-20261014-04', at: '2026-10-14', ask: 'کاورِ پلی‌لیست', done: 'x', how: 'y', owner: true, ownerHow: 'در Studio بگذارید' },
    { id: 'R-20261001-01', at: '2026-08-01', ask: 'کهنه و سنجیده‌نشده', done: 'x', how: 'y', ver: '8.50' },
    { id: 'R-20261002-01', at: '2026-10-02', ask: 'بسته به تصمیمِ او', done: 'x', how: 'y', closed: true }] };
  let fetched = 0;
  global.__STUB = (url) => {
    if (/requests\.json/.test(url)) { fetched++; return { code: 200, json: defs }; }
    return keepStub ? keepStub(url) : { code: 404, text: '' };
  };
  _reqDefsMemo = null;
  const st = reqStatus_();
  const by = {}; st.items.forEach(x => { by[x.id] = x; });
  ok('8.92-4 وضعِ هر درخواست از کد: انجام · نادرست · در راهِ نصب · کارِ شما · سنجیده‌نشده — و «بسته» شمرده نمی‌شود',
     st.n === 5 && /انجام و سنجیده/.test(by['R-20261014-01'].state) && /^نادرست/.test(by['R-20261014-03'].state) &&
     /در راهِ نصب/.test(by['R-20261014-07'].state) && /کارِ شما/.test(by['R-20261014-04'].state) &&
     /سنجیده نشده/.test(by['R-20261001-01'].state) && !by['R-20261002-01'],
     JSON.stringify(st.items.map(x => x.id + ':' + x.state)));
  ok('8.92-5 نادرست و سنجیده‌نشده ایرادند؛ کارِ شما با «⟨شما⟩»؛ انجام‌شده و در راهِ نصب ایراد نیستند',
     st.ok === false && st.bad === 1 && st.stale === 1 &&
     st.problems.some(x => /R-20261014-03/.test(x) && /نادرست/.test(x)) &&
     st.problems.some(x => /R-20261001-01/.test(x) && /سنجیده نشده/.test(x)) &&
     st.problems.some(x => /^⟨شما⟩/.test(x) && /R-20261014-04/.test(x)) &&
     !st.problems.some(x => /R-20261014-01|R-20261014-07/.test(x)), JSON.stringify(st.problems));
  ok('8.92-6 سطرِ روزانه شمارش و فهرستِ بازها را دارد و انجام‌شده را در فهرست نمی‌آورد',
     /📒 دفترِ درخواست‌های شما/.test(st.line) && /R-20261014-03/.test(st.line) &&
     st.line.indexOf('• R-20261014-01') === -1, st.line);
  reqStatus_();
  ok('8.92-7 دفتر در هر اجرا یک بار از ریپو خوانده می‌شود', fetched === 1);
  // ۴) ریپو جواب نداد ⇒ خودش ایراد است، نه سکوت
  global.__STUB = (url) => /requests\.json/.test(url) ? { code: 404, text: 'nf' } : (keepStub ? keepStub(url) : { code: 404, text: '' });
  _reqDefsMemo = null;
  const sf = reqStatus_();
  ok('8.92-8 دفترِ ناخوانده ایراد است، نه سطرِ خالی', sf.ok === false && sf.problems.length === 1 && /خوانده نشد/.test(sf.line));
  global.__STUB = keepStub; CFG.CODE_VERSION = keepVer; _reqDefsMemo = null;

  // ۵) سیم‌ها: درِ گزارش، ایمیلِ سلامت، _STATUS
  const r12 = fs.readFileSync('src/12_Reports.gs', 'utf8'), h08 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('8.92-9 گزارشِ ناظر از همان درِ همیشگی داوری‌ها را می‌دهد؛ سلامت دفتر را می‌سازد و ذخیره می‌کند',
     /monChecksIngest_\(rep, file\.getName\(\)\);[\s\S]{0,200}reqIngest_\(rep\)/.test(r12) &&
     /var rqS = reqStatus_\(\);[\s\S]{0,120}reqStatusSave_\(rqS\)[\s\S]{0,120}notes\.push\(rqS\.line\)/.test(h08));
  /* و _STATUS ریپو را نمی‌خوانَد: آن مسیر پس از هر تریگر می‌دود (نسخهٔ اول همین را کرد و v4 سرخ شد). */
  ok('8.92-9-ب _STATUS نسخهٔ ذخیره‌شده را نشان می‌دهد، نه خواندنِ تازهٔ ریپو',
     /requests: \(function \(\) \{ try \{ return reqStatusCached_\(\);/.test(h08) &&
     !/requests: \(function \(\) \{ try \{ return reqStatus_\(\);/.test(h08));
  const sv = reqStatusSave_({ ok: false, n: 2, done: 1, bad: 1, stale: 0, line: '📒 خط', items: [{ id: 'R-20261014-01', state: 'نادرست: ' + 'x'.repeat(200) }] });
  const cached = reqStatusCached_();
  ok('8.92-9-پ ذخیره و خواندنِ وضعِ دفتر: شمار، خط و وضعِ هر ردیف (کوتاه‌شده)',
     sv === true && cached && cached.n === 2 && cached.items[0].id === 'R-20261014-01' && cached.items[0].state.length <= 90 &&
     cached.line === '📒 خط', JSON.stringify(cached).slice(0, 200));
  delete PR[PK.REQ_STATUS];

  // ۶) دفترِ واقعیِ ریپو خوش‌شکل است
  const real = JSON.parse(fs.readFileSync('docs/requests.json', 'utf8')).requests;
  const ids = real.map(x => x.id);
  ok('8.92-10 docs/requests.json: شناسه‌های یکتا و خوش‌شکل، هر ردیف ask/done/how، و هر غیرِ «کارِ شما» نسخه دارد',
     real.length >= 1 && new Set(ids).size === ids.length && ids.every(x => /^R-\d{8}-\d{2}$/.test(x)) &&
     real.every(x => x.ask && x.done && x.how && (x.owner || x.ver)),
     ids.join(','));

  // ۷) سقفِ ۹ کیلوبایتیِ Property: یادداشت کوتاه می‌شود، کلید و داوری نه
  const big = {};
  for (let i = 0; i < 40; i++) big['k' + i] = { at: '2026-10-14 10:00', verdict: 'سالم', note: 'یادداشتِ بلند '.repeat(25) };
  const js = propFit_(big, 'note');
  const back = JSON.parse(js);
  ok('8.92-11 بیش از سقف ⇒ یادداشت‌ها کوتاه می‌شوند تا زیرِ ۸٫۶ کیلوبایت، همهٔ کلیدها و داوری‌ها می‌مانند',
     Buffer.byteLength(js, 'utf8') <= 8600 && Object.keys(back).length === 40 && back.k39.verdict === 'سالم',
     Buffer.byteLength(js, 'utf8') + ' بایت');
  // ۸) قراردادِ دو طرف: دستورِ ناظر همان شکلی را می‌خواهد که موتور می‌خوانَد
  const pdir = 'docs/prompts';
  const mons = fs.readdirSync(pdir).map(f => /^_PROMPT-monitor-v(\d+)\.md$/.exec(f)).filter(Boolean)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const mon = fs.readFileSync(pdir + '/' + mons[0][0], 'utf8');
  ok('8.92-12 تازه‌ترین دستورِ ناظر «requests» با id/verdict/evidence و `docs/requests.json` را دارد',
     /"requests":\[\{"id":"R-\d{8}-\d{2}","verdict":"درست\|نادرست\|نشد","evidence"/.test(mon) &&
     mon.indexOf('docs/requests.json') !== -1, mons[0][0]);
  delete PR[PK.REQ_CHECKS];
}

console.log('\n=== 8.93) صفِ «نیازمندِ کد» با نام، نه فقط شمار ===');
{
  const src12 = fs.readFileSync('src/12_Reports.gs', 'utf8');
  const fn = src12.slice(src12.indexOf('function codeQueue_'), src12.indexOf('function codeTaskSkipMap_'));
  ok('8.93-1 codeQueue_ فهرستِ ردیف‌های در انتظار را با شناسه، عنوان، تکرار و آخرین دیده‌شدن برمی‌گرداند',
     /out\.items = cand\.slice\(0, 60\)\.map/.test(fn) && /lastDays: c\.seenD/.test(fn) && /seenD: seenD/.test(fn));
}

console.log('\n✅ هر ' + pass + ' آزمونِ حلقهٔ گزارش گذشت.');
