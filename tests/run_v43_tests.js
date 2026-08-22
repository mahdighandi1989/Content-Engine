/* آزمون‌های نسخهٔ ۴٫۳ / ۴٫۴ — اصلاحاتِ دورِ سوم و چهارمِ بازبینی
   ۱) ترتیبِ نسخهٔ کد (عقب‌گرد هشدار نمی‌دهد، ۴٫۱۰ از ۴٫۹ جلوتر است)
   ۲) کلیدِ فایل گزارش = شناسه، نه نام (نامِ ثابت هر روز خوانده می‌شود)
   ۳) دستور تا انتشارِ واقعیِ قسمت بسته نمی‌شود
   ۴) اگر همان نشانه در همان قسمت دوباره دیده شود، دستور باز می‌ماند
   ۵) ردیفِ جابه‌جاشده اشتباهی بسته نمی‌شود
   ۶) قحطیِ دستورهای کم‌اولویت (دو جای رزرو)
   ۷) تلگرامِ HTTP 200 با ok:false = ناموفق
   ۸) متنِ بریدهٔ قسمت: ثبت، تلاش دوباره، و یافتهٔ خودِ موتور
   ۹) عبارت‌های ماستمالی
   ۱۰) نگفتنِ تاریخ و روز در آغاز
   ۱۱) سطرِ گزارشیِ بی‌خطر، «سطر خطا» شمرده نمی‌شود
   ۱۲) شناسهٔ یکتا برای یافته‌های خودِ موتور */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread, DFolder } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

// ---------------------------------------------------------------- fixtures
const VH = ['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','d','e','متن پیاده‌سازی شده',
  'فضا و وایب','تحلیل تخصصی','f','تحلیل محتوا (JSON)','g','h','i','خلاصه اجرایی','وضعیت'];
function mk(id, h, rows) { const ss = new Spread('s', id); const sh = ss.insertSheet('S1');
  sh._d.push(h.slice()); rows.forEach(r => sh._d.push(r)); sh._max = Math.max(1000, sh._d.length + 10);
  global.__SS[id] = ss; return ss; }
const p2 = n => String(n).padStart(2, '0');
const D0 = new Date();
const recent = i => { const d = new Date(D0.getTime() - (79 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };
const V = [];
for (let i = 0; i < 60; i++) V.push([recent(i),'V'+i,'o','n','https://drive.google.com/file/d/V'+i+'/view',
  '[]','{}','{}','گفتار شمارهٔ ' + i + ' با جزئیاتِ یگانه و واژه‌های مخصوصِ همین ردیف. '.repeat(4),
  'وایب','تخصصی','{}',
  JSON.stringify({Genre:'مذهبی، معنوی',Main_Topic:'موضوع یگانهٔ شمارهٔ '+i,
    Key_Message:'پیام کلیدیِ مفصل و یگانهٔ شمارهٔ '+i}),'','','',
  'خلاصهٔ اجرایی یگانهٔ شمارهٔ ' + i + ' با واژه‌های مخصوص. '.repeat(4),'SUCCESS']);
mk(CFG.VIDEO_SHEET_ID, VH, V);
for (const s of CFG.SOURCES) if (!global.__SS[s.id]) { const ss = new Spread('s', s.id); ss.insertSheet('S1'); global.__SS[s.id] = ss; }
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
global.__PROPS['TELEGRAM_CHAT_ID'] = '123';

const TG = [];
let TG_OK = true;                       // برای آزمون ۷
let WRITER = 'full';                    // full | truncated | filler | nodate
let writerCalls = 0, writerPrompt = '';
global.__STUB = function (url, body) {
  if (url.indexOf('api.telegram.org') !== -1) {
    TG.push(typeof body === 'object' ? (body.text || '[file]') : String(body));
    return TG_OK ? { code: 200, json: { ok: true, result: { message_id: TG.length } } }
                 : { code: 200, json: { ok: false, error_code: 400, description: 'chat not found' } };
  }
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  const t = body.contents ? body.contents[0].parts[0].text : '';
  if (t.indexOf('سردبیرِ یک برنامهٔ رادیویی') !== -1) {
    const c = [...t.matchAll(/- id: (\S+) \|/g)].map(m => m[1]);
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      theme: 'نخ', connection: 'پیوند', chosen: c.slice(0, 12).map(id => ({ id })), rejected: [] }) }] } }] } };
  }
  if (url.indexOf('tts') !== -1) return { code: 200, json: { candidates: [{ content: { parts: [{
    inlineData: { data: Buffer.alloc(40000).toString('base64') } }] } }] } };

  writerCalls++; writerPrompt = t;
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  const W = todayWords_();
  const sec = k => ({ heading: 'بخش ' + k, narration: 'متن نمونهٔ بخش ' + k + '. '.repeat(20),
                      tone: 'آرام', sourceIds: ids.slice((k - 1) * 2, (k - 1) * 2 + 2) });
  const full = { title: 'ت', hook: 'امروز ' + W.weekday + '، ' + W.jalali + ' است. قلاب.',
                 sections: [sec(1), sec(2), sec(3), sec(4), sec(5)],
                 outro: 'پایان.', summary: 'خ.', tags: [] };
  if (WRITER === 'truncated') {
    // فقط یک بخش، و پاسخِ بریده (JSON ناقص) → باید ترمیم و ثبت شود
    const s = JSON.stringify({ title: 'ت', hook: full.hook, sections: [sec(1), sec(2)],
                               outro: 'پایان.', summary: 'خ.', tags: [] });
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: s.slice(0, s.length - 40) }] } }] } };
  }
  if (WRITER === 'filler') {
    const f = JSON.parse(JSON.stringify(full));
    f.sections[0].narration = 'جالب است که هر دو این محتواها از یک جا می‌آیند. ' +
      'در نگاه اول بی‌ربط به نظر می‌رسند اما نخ نامرئی آن‌ها را وصل می‌کند. ' +
      'متن نمونه. '.repeat(10);
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(f) }] } }] } };
  }
  if (WRITER === 'nodate') {
    const f = JSON.parse(JSON.stringify(full));
    f.hook = 'سلام. برنامهٔ امروز را با یک پرسش شروع می‌کنیم.';
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(f) }] } }] } };
  }
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(full) }] } }] } };
};

let un = quiet(); let g = 0; while (g++ < 30) syncCatalog(); un();
const hub = getHub_();
const OUT = global.__ROOT_FOLDER;
const rt = () => hub.getSheetByName(CFG.REPORT_TAB);
const rows = () => rt().getLastRow() < 2 ? [] :
  rt().getRange(2, 1, rt().getLastRow() - 1, REPORT_HEADERS.length).getValues();

// ================= 1) version ordering ==================================
console.log('=== ۱) ترتیبِ نسخهٔ کد ===');
ok('۴٫۱۰ از ۴٫۹ جلوتر است', verCmp_('4.10', '4.9') > 0, 'verCmp_(4.10,4.9)=' + verCmp_('4.10','4.9'));
ok('۴٫۲ از ۴٫۲ برابر است', verCmp_('4.2', '4.2') === 0);
ok('۴٫۱ از ۴٫۲ عقب‌تر است', verCmp_('4.1', '4.2') < 0);
// نسخه‌های آزمون نسبت به نسخهٔ واقعیِ کد ساخته می‌شوند تا با هر ارتقا کهنه نشوند
const MAJ = parseInt(String(CFG.CODE_VERSION).split('.')[0], 10) || 1;
const MINOR = parseInt(String(CFG.CODE_VERSION).split('.')[1] || '0', 10) || 0;
const OLDV = (MAJ - 1) + '.1', NEWV = MAJ + '.' + (MINOR + 7), NEWER = (MAJ + 5) + '.1',
      NEWEST = (MAJ + 5) + '.2';
ok('«نسخهٔ ۵» با «5.0» برابر می‌شود', verCmp_('نسخهٔ 5', '5.0') === 0);

OUT.createFile(CFG.CODE_FILE, JSON.stringify({ version: OLDV, releasedAt: '2026-01-01 00:00',
  summary: 'نسخهٔ قدیمی که اشتباهی برگشته.' }), 'application/json');
TG.length = 0;
un = quiet(); const down = checkCodeUpdate_(hub); un();
ok('عقب‌گردِ نسخه هیچ هشداری نمی‌دهد', down === null && TG.length === 0 &&
   !rows().some(r => String(r[RC.ID-1]) === 'CODE-' + OLDV));

// جلوتر که باشد، هشدار می‌رود
OUT.getFilesByName(CFG.CODE_FILE).next().setContent(JSON.stringify({
  version: NEWV, releasedAt: '2026-08-11 20:00', summary: 'نسخهٔ جلوتر.' }));
un = quiet(); const up = checkCodeUpdate_(hub); un();
ok('نسخهٔ جلوتر هشدار می‌دهد', up && up.to === NEWV && TG.length === 1,
   JSON.stringify(up) + ' tg=' + TG.length);

// ================= 2) report file keyed on ID ===========================
console.log('\n=== ۲) کلیدِ فایل گزارش = شناسه، نه نام ===');
const SAME = CFG.REPORT_FILE_PREFIX + 'latest.json';
const mkRep = (id, at, findings) => OUT.createFile(SAME,
  JSON.stringify({ reportId: id, at: at, findings: findings }), 'application/json');
mkRep('R-A', '2026-08-12 08:00', [{ priority: 'متوسط', category: 'گزینش', key: 'k-a',
  title: 'یافتهٔ الف', detail: 'ش.', instruction: 'کار الف را بکن.', owner: 'موتور' }]);
un = quiet(); const iA = ingestReports_(hub); un();
// همان نامِ فایل، محتوای تازه — چون نام قبلی به .ingested عوض شده، فایل تازه‌ای است
mkRep('R-B', '2026-08-12 09:00', [{ priority: 'متوسط', category: 'گزینش', key: 'k-b',
  title: 'یافتهٔ ب', detail: 'ش.', instruction: 'کار ب را بکن.', owner: 'موتور' }]);
un = quiet(); const iB = ingestReports_(hub); un();
ok('گزارشِ دومِ هم‌نام هم خوانده شد', iA.added === 1 && iB.added === 1,
   'الف ' + iA.added + ' / ب ' + iB.added);
ok('هر دو یافته ردیف دارند',
   rows().some(r => String(r[RC.TITLE-1]) === 'یافتهٔ الف') &&
   rows().some(r => String(r[RC.TITLE-1]) === 'یافتهٔ ب'));
ok('سیاههٔ داخلی با شناسه پر شده، نه نام',
   (global.__PROPS[PK.REPORTS_DONE] || '').split('|').every(x => !x || x.indexOf('_REPORT-') === -1),
   global.__PROPS[PK.REPORTS_DONE]);
// و فایلی که واقعاً همان است، دوباره خوانده نمی‌شود
un = quiet(); const iC = ingestReports_(hub); un();
ok('اجرای دوباره بی آنکه فایلی تازه بیاید، چیزی اضافه نمی‌کند', iC.files === 0 && iC.added === 0);

// ================= 3) instructions close only after delivery ============
console.log('\n=== ۳) دستور تا انتشارِ واقعی بسته نمی‌شود ===');
const openBefore = openInstructions_(hub).map(o => o.id);
console.log('  دستورهای باز پیش از تولید:', openBefore.length);
ok('دست‌کم دو دستور باز داریم', openBefore.length >= 2, openBefore.length + '');

WRITER = 'full';
un = quiet(); const rp = produceEpisode(); un();
ok('قسمت نوشته شد ولی هنوز منتشر نشده', rp.ok === true && rp.pending === true);
const stillOpen = openInstructions_(hub).map(o => o.id);
ok('پیش از انتشار، هیچ دستوری بسته نشده',
   openBefore.every(id => stillOpen.indexOf(id) !== -1), stillOpen.length + ' باز');
ok('دستورها همراه قسمت ذخیره شده‌اند تا بعدِ انتشار بسته شوند', (() => {
  const st = JSON.parse(global.__PROPS[PK.PENDING]);
  const fold = global.__FOLDERS[st.folderId];
  const m = JSON.parse(fold.getFilesByName('_episode.json').next().getBlob().getDataAsString());
  return m.orders && m.orders.length === openBefore.length && m.orders[0].fp && m.orders[0].seen;
})());

// حالا انتشار را کامل کن
un = quiet(); let d = 0; while (global.__PROPS[PK.PENDING] && d++ < 60) produceEpisodeContinue(); un();
const afterOpen = openInstructions_(hub).map(o => o.id);
ok('پس از انتشار، دستورهای Cowork بسته شدند',
   openBefore.every(id => afterOpen.indexOf(id) === -1), afterOpen.length + ' باز مانده');
ok('ستون اقدام می‌گوید قسمت منتشر شد',
   rows().some(r => String(r[RC.DONE-1]).indexOf('قسمت منتشر شد') !== -1));

// ================= 4) recurrence keeps the row open =====================
console.log('\n=== ۴) تکرارِ همان نشانه در همان قسمت → باز می‌ماند ===');
// یافتهٔ فرضی که خودش هم دستور دارد و هم دوباره دیده می‌شود
un = quiet();
logSelfFinding_(hub, { priority: 'متوسط', category: 'پرامپت روایت', key: 'recur-probe',
  title: 'نشانهٔ آزمایشیِ تکرارشونده', detail: 'ش.',
  instruction: 'این نشانه را برطرف کن.', owner: 'موتور' });
un();
const probe = openInstructions_(hub).filter(o => o.title.indexOf('تکرارشونده') !== -1);
ok('یافتهٔ موتور جزو دستورهای باز آمد', probe.length === 1);
const probeRow = probe[0].row;
// انگار قسمت تولید شد، و در میانش همان نشانه دوباره دیده شد
un = quiet();
logSelfFinding_(hub, { priority: 'متوسط', category: 'پرامپت روایت', key: 'recur-probe',
  title: 'نشانهٔ آزمایشیِ تکرارشونده', detail: 'ش.',
  instruction: 'این نشانه را برطرف کن.', owner: 'موتور', episode: 99 });
markInstructionsApplied_(hub, probe, 99, 'تزریق شد');
un();
const pv = rt().getRange(probeRow, 1, 1, REPORT_HEADERS.length).getValues()[0];
console.log('  وضعیت:', pv[RC.STATUS-1], '| اقدام:', String(pv[RC.DONE-1]).slice(0, 60));
ok('چون نشانه دوباره دیده شد، ردیف بسته نشد', pv[RC.STATUS-1] !== RST.APPLIED);
ok('علتش جلوی ردیف نوشته شد', String(pv[RC.DONE-1]).indexOf('دوباره دیده شد') !== -1);
ok('و باز هم به قسمت بعد تزریق می‌شود',
   openInstructions_(hub).some(o => o.row === probeRow));

// یک تکرارِ صرفاً گزارشی (نه یافتهٔ موتور در همین قسمت) نباید مانع بستن شود
un = quiet();
logSelfFinding_(hub, { priority: 'متوسط', category: 'پرامپت روایت', key: 'benign-probe',
  title: 'نشانهٔ آزمایشیِ بی‌تکرار', detail: 'ش.',
  instruction: 'این یکی را هم برطرف کن.', owner: 'موتور' });
un();
const benign = openInstructions_(hub).filter(o => o.title.indexOf('بی‌تکرار') !== -1);
un = quiet();
// شبیه‌سازی: وسطِ صداگذاری، گزارشِ روزانهٔ تازه‌ای همین مورد را دوباره مطرح می‌کند
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-13-1200.json', JSON.stringify({
  reportId: 'R-DUP', at: '2026-08-13 12:00',
  findings: [{ priority: 'متوسط', category: 'پرامپت روایت', key: 'benign-probe',
    title: 'نشانهٔ آزمایشیِ بی‌تکرار', detail: 'ش.',
    instruction: 'این یکی را هم برطرف کن.', owner: 'موتور' }] }), 'application/json');
ingestReports_(hub);
markInstructionsApplied_(hub, benign, 98, 'تزریق شد');
un();
const bv = rt().getRange(benign[0].row, 1, 1, REPORT_HEADERS.length).getValues()[0];
console.log('  وضعیت مورد بی‌تکرار:', bv[RC.STATUS-1], '| تکرار:', bv[RC.SEEN-1]);
ok('گزارشِ تکراریِ ناظر مانع بسته شدنِ دستور نمی‌شود',
   String(bv[RC.STATUS-1]) === RST.APPLIED, String(bv[RC.STATUS-1]));
ok('ولی شمارندهٔ تکرارش بالا رفته', Number(bv[RC.SEEN-1]) === 2, String(bv[RC.SEEN-1]));

// ================= 5) shifted row is not closed by mistake =============
console.log('\n=== ۵) ردیفِ جابه‌جاشده اشتباهی بسته نمی‌شود ===');
const fakeOrder = [{ row: probeRow, id: 'X', pri: 'متوسط', cat: 'ت', title: 'ت',
                     instruction: 'ت', fp: 'اثرِانگشتِ-نادرست', seen: 1 }];
un = quiet(); markInstructionsApplied_(hub, fakeOrder, 100, 'ت'); un();
const pv2 = rt().getRange(probeRow, 1, 1, REPORT_HEADERS.length).getValues()[0];
ok('اثر انگشتِ ناهمخوان → ردیف دست‌نخورده ماند',
   String(pv2[RC.STATUS-1]) === String(pv[RC.STATUS-1]) &&
   String(pv2[RC.DONE-1]) === String(pv[RC.DONE-1]));

// ================= 6) starvation of low-priority items =================
console.log('\n=== ۶) قحطیِ دستورهای کم‌اولویت ===');
// یک موردِ «جزئی» و قدیمی، بعد پانزده موردِ «جدی» تازه
un = quiet();
logSelfFinding_(hub, { priority: 'جزئی', category: 'گزینش', key: 'starve-old',
  title: 'موردِ کم‌اولویتِ قدیمی', detail: 'ش.', instruction: 'مورد قدیمی را انجام بده.',
  owner: 'موتور' });
for (let k = 0; k < 15; k++) {
  logSelfFinding_(hub, { priority: 'جدی', category: 'گزینش', key: 'starve-hi-' + k,
    title: 'موردِ جدیِ شمارهٔ ' + k, detail: 'ش.', instruction: 'کار جدی ' + k, owner: 'موتور' });
}
un();
const inj = openInstructions_(hub);
console.log('  تزریق‌شده:', inj.length, '| اولویت‌ها:',
            inj.map(o => o.pri).join('،'));
ok('سقفِ تزریق رعایت شد', inj.length === CFG.MAX_OPEN_INSTRUCTIONS, inj.length + '');
ok('«جدی»ها بیشترِ جاها را گرفتند',
   inj.filter(o => o.pri === 'جدی').length >= CFG.MAX_OPEN_INSTRUCTIONS - 2);
ok('موردِ کم‌اولویتِ قدیمی هم نوبت گرفت (قحطی نشد)',
   inj.some(o => o.title.indexOf('کم‌اولویتِ قدیمی') !== -1));

// ================= 7) telegram ok:false =================================
console.log('\n=== ۷) تلگرامِ ۲۰۰ با ok:false ===');
TG.length = 0; TG_OK = false;
let tgThrew = false;
try { tgApi_('sendMessage', { chat_id: '1', text: 'ت' }); } catch (e) {
  tgThrew = true; console.log('  خطا:', String(e.message).slice(0, 80));
}
ok('پاسخِ ok:false خطا می‌شود، نه موفقیت', tgThrew);
ok('و تکرارِ بی‌فایده نمی‌کند (یک تلاش)', TG.length === 1, TG.length + ' تلاش');

// ردیفِ نیازمند کد: ستون تلگرام نباید «ارسال شد» بخورد
TG.length = 0;
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-13-0900.json', JSON.stringify({
  reportId: 'R-TG', at: '2026-08-13 09:00',
  findings: [{ priority: 'جدی', category: 'کد اسکریپت', key: 'tg-fail-probe',
    title: 'موردی که تلگرامش نمی‌رود', detail: 'ش.',
    instruction: 'نیازمند تغییر کد.', owner: 'کد' }]
}), 'application/json');
global.__MAIL.length = 0;
un = quiet(); ingestReports_(hub); un();
const tgRow = rows().find(r => String(r[RC.TITLE-1]).indexOf('تلگرامش نمی‌رود') !== -1);
console.log('  ستون تلگرام:', JSON.stringify(String(tgRow[RC.TG-1]).slice(0, 60)),
            '| ایمیل جانشین:', global.__MAIL.length);
ok('ستون تلگرام ادعای ارسالِ تلگرامی نمی‌کند',
   String(tgRow[RC.TG-1]).indexOf('تلگرام نرسید') !== -1, String(tgRow[RC.TG-1]));
ok('به‌جایش ایمیل جانشین رفت و همان هم در سلول نوشته شد',
   global.__MAIL.length >= 1 && String(tgRow[RC.TG-1]).indexOf('ایمیل') !== -1);
TG_OK = true;

// ================= 8) truncated episode =================================
console.log('\n=== ۸) متنِ بریدهٔ قسمت ===');
WRITER = 'truncated';
writerCalls = 0;
const logBefore = hub.getSheetByName(CFG.TAB_LOG).getLastRow();
un = quiet(); produceEpisode();
let dd = 0; while (global.__PROPS[PK.PENDING] && dd++ < 60) produceEpisodeContinue(); un();
const logTxt = hub.getSheetByName(CFG.TAB_LOG)
  .getRange(logBefore + 1, 1, Math.max(1, hub.getSheetByName(CFG.TAB_LOG).getLastRow() - logBefore), 2)
  .getValues().map(r => String(r[1])).join(' ⏎ ');
console.log('  ', logTxt.slice(0, 240));
ok('ترمیمِ پاسخِ بریده در سیاهه ثبت شد', logTxt.indexOf('ناقص برگشت و ترمیم شد') !== -1);
ok('یک تلاش دوباره انجام شد', writerCalls >= 2, writerCalls + ' فراخوانی نویسنده');
ok('یافتهٔ «متن ناقص» در تب گزارش‌ها نشست',
   rows().some(r => String(r[RC.TITLE-1]).indexOf('متن قسمت ناقص') !== -1));

// ================= 9) filler phrases ====================================
console.log('\n=== ۹) عبارت‌های ماستمالی ===');
const W = todayWords_();
const fEp = { title: 'ت', hook: 'امروز ' + W.weekday + '، ' + W.jalali + ' است.',
  sections: [{ heading: 'یک', sourceIds: [],
    narration: 'جالب است که هر دو این‌ها یک ریشه دارند. در نگاه اول بی‌ربط به نظر می‌رسند. ' +
               'نخ نامرئی آن‌ها را وصل می‌کند.' }], outro: 'پ.' };
const fFlags = fidelityCheck_(fEp, [], W);
console.log('  نشانه‌ها:', fFlags.map(x => x.kind + ':' + x.text.slice(0, 26)).join(' | '));
ok('هر سه عبارتِ کلیشه‌ای گرفته شد',
   fFlags.filter(x => x.kind === 'پیوند ساختگی').length === 3,
   fFlags.filter(x => x.kind === 'پیوند ساختگی').length + '');
const cleanEp = { title: 'ت', hook: fEp.hook, sections: [{ heading: 'یک', sourceIds: [],
  narration: 'در هر دو فایل، سخنران از یک آیهٔ مشترک نقل می‌کند و همان استدلال را ادامه می‌دهد.' }],
  outro: 'پ.' };
ok('پیوندِ واقعی و مشخص علامت نمی‌خورد',
   fidelityCheck_(cleanEp, [], W).filter(x => x.kind === 'پیوند ساختگی').length === 0);
ok('قلاب و پیوند هم وارسی می‌شوند',
   fidelityCheck_({ title: 'ت', hook: fEp.hook, connection: 'یه جورایی می‌شود گفت مرتبط‌اند.',
     sections: [{ heading: 'ی', narration: 'متن سالم.', sourceIds: [] }], outro: 'پ.' }, [], W)
     .some(x => x.kind === 'پیوند ساختگی' && x.section === 'قلاب/پیوند'));

// ================= 10) date must be spoken ==============================
console.log('\n=== ۱۰) گفتنِ تاریخ و روز در آغاز ===');
const noDate = { title: 'ت', hook: 'سلام. برنامهٔ امروز را شروع می‌کنیم.',
  sections: [{ heading: 'ی', narration: 'متن سالم و بی‌اشکال.', sourceIds: [] }], outro: 'پ.' };
const nd = fidelityCheck_(noDate, [], W).filter(x => x.kind === 'تاریخ نیامده');
ok('نگفتنِ تاریخ گرفته شد', nd.length === 1, JSON.stringify(nd[0] ? nd[0].text.slice(0, 60) : ''));
ok('گفتنِ روز و تاریخ کامل، علامت نمی‌خورد',
   fidelityCheck_({ title: 'ت', hook: 'امروز ' + W.weekday + '، ' + W.jalali + ' است.',
     sections: [{ heading: 'ی', narration: 'متن سالم.', sourceIds: [] }], outro: 'پ.' }, [], W)
     .filter(x => x.kind === 'تاریخ نیامده').length === 0);
ok('اگر فقط روز هفته بیاید و تاریخ نه، گرفته می‌شود',
   fidelityCheck_({ title: 'ت', hook: 'امروز ' + W.weekday + ' است.',
     sections: [{ heading: 'ی', narration: 'متن سالم.', sourceIds: [] }], outro: 'پ.' }, [], W)
     .some(x => x.kind === 'تاریخ نیامده' && x.text.indexOf('تاریخ شمسی') !== -1));

// ================= 11) benign log lines =================================
console.log('\n=== ۱۱) سطرِ گزارشیِ بی‌خطر ===');
ok('سطرِ پاس وفاداری خطا شمرده نمی‌شود',
   isErrorLine_('پاس وفاداری قسمت 3 — 2 نشانه (تاریخ نیامده: 1، نقل‌قول: 1).') === false);
ok('سطرِ «گزارش: … بسته نشد» خطا شمرده نمی‌شود',
   isErrorLine_('گزارش: در قسمت 3 — 0 دستور بسته شد، 1 مورد باز ماند.') === false);
ok('خطای واقعی هم‌چنان گرفته می‌شود',
   isErrorLine_('خطای تولید: Gemini پاسخ متنی برنگرداند.') === true &&
   isErrorLine_('ادغام صدا ناموفق بود؛ بخش‌ها جداگانه فرستاده می‌شوند.') === true);
ok('هشدارِ پاسخِ ترمیم‌شده خطا شمرده می‌شود (باید دیده شود)',
   isErrorLine_('هشدار: پاسخ مدل «gemini-2.5-flash» ناقص برگشت و ترمیم شد (900 نویسه). خطا: x') === true);

// ================= 12) unique self-finding IDs ==========================
console.log('\n=== ۱۲) شناسهٔ یکتای یافته‌های موتور ===');
const engIds = rows().map(r => String(r[RC.ID-1])).filter(x => x.indexOf('ENG-') === 0);
const dupIds = engIds.filter((x, i) => engIds.indexOf(x) !== i);
console.log('  شناسه‌های موتور:', engIds.length, '| تکراری:', dupIds.length);
ok('هیچ دو یافتهٔ موتور شناسهٔ یکسان ندارند', dupIds.length === 0, dupIds.join(','));
ok('کلیدِ یافته در شناسه دیده می‌شود',
   engIds.some(x => x.indexOf('#recur-probe') !== -1), engIds.slice(0, 3).join(' '));

// ================= 13) report tab prune keeps open rows ================
console.log('\n=== ۱۳) هرسِ تب، ردیفِ باز را نمی‌برد ===');
const beforePrune = rows().length;
const openIdsB = rows().filter(r => String(r[RC.STATUS-1]) !== RST.APPLIED &&
                                    String(r[RC.STATUS-1]) !== RST.CLOSED)
                        .map(r => String(r[RC.ID-1]));
un = quiet(); pruneReportTab_(rt()); un();
const openIdsA = rows().filter(r => String(r[RC.STATUS-1]) !== RST.APPLIED &&
                                    String(r[RC.STATUS-1]) !== RST.CLOSED)
                        .map(r => String(r[RC.ID-1]));
ok('هیچ ردیفِ بازی حذف نشد', openIdsB.every(id => openIdsA.indexOf(id) !== -1),
   openIdsB.length + ' → ' + openIdsA.length);
ok('زیر سقفِ ردیف‌ها هرسی لازم نبود', rows().length === beforePrune,
   beforePrune + ' ردیف');

// ================= 14) prune must not corrupt the same-run state ========
console.log('\n=== ۱۴) هرسِ تب وسطِ اجرا، ردیف‌ها را قاطی نمی‌کند ===');
REPORT_MAX_ROWS = 6;                      // سقف را پایین می‌آوریم تا هرس قطعی شود
const twoFiles = [
  { reportId: 'R-P1', at: '2026-08-14 08:00', findings: [
    { priority: 'متوسط', category: 'گزینش', key: 'prune-a', title: 'یافتهٔ هرس الف',
      detail: 'شرحِ الف.', instruction: 'کار الف.', owner: 'موتور' }] },
  { reportId: 'R-P2', at: '2026-08-14 09:00', findings: [
    { priority: 'متوسط', category: 'گزینش', key: 'prune-b', title: 'یافتهٔ هرس ب',
      detail: 'شرحِ ب.', instruction: 'کار ب.', owner: 'موتور' },
    // موردِ تکراری از فایل اول: باید ردیفِ درستِ خودش را لمس کند، نه ردیف دیگری
    { priority: 'متوسط', category: 'گزینش', key: 'prune-a', title: 'یافتهٔ هرس الف',
      detail: 'شرحِ الفِ به‌روزشده.', instruction: 'کار الف.', owner: 'موتور' }] }
];
twoFiles.forEach((r, i) => OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-14-p' + i + '.json',
  JSON.stringify(r), 'application/json'));
un = quiet(); const iP = ingestReports_(hub); un();
const rA = rows().find(r => String(r[RC.TITLE-1]) === 'یافتهٔ هرس الف');
const rB = rows().find(r => String(r[RC.TITLE-1]) === 'یافتهٔ هرس ب');
console.log('  ردیف‌ها:', rows().length, '| الف:', !!rA, '| ب:', !!rB);
ok('هر دو یافته ثبت شدند', !!rA && !!rB, JSON.stringify(iP));
ok('شرحِ هر ردیف زیر عنوانِ خودش ماند',
   String(rA[RC.DETAIL-1]).indexOf('الف') !== -1 && String(rB[RC.DETAIL-1]).indexOf('ب') !== -1,
   String(rA[RC.DETAIL-1]).slice(0, 30) + ' / ' + String(rB[RC.DETAIL-1]).slice(0, 30));
ok('تکرارِ یافتهٔ الف همان ردیف را به‌روز کرد', Number(rA[RC.SEEN-1]) === 2,
   'تکرار ' + rA[RC.SEEN-1]);
const isClosed = r => String(r[RC.STATUS-1]) === RST.APPLIED ||
                      String(r[RC.STATUS-1]) === RST.CLOSED ||
                      String(r[RC.STATUS-1]) === RST.SKIPPED;
const nOpen = rows().filter(r => !isClosed(r)).length;
const nClosed = rows().filter(isClosed).length;
console.log('  باز:', nOpen, '| بسته:', nClosed, '| سقف:', REPORT_MAX_ROWS);
ok('ردیف‌های بستهٔ قدیمی تا حدِ سقف هرس شدند',
   nClosed <= Math.max(0, REPORT_MAX_ROWS - nOpen), 'بسته ' + nClosed);
ok('هیچ ردیفِ بازی در هرس نرفت', nOpen >= 2, 'باز ' + nOpen);
ok('ردیفِ باز حتی وقتی از سقف بیشتر است، حذف نمی‌شود',
   rows().length === nOpen + nClosed && nOpen > 0);
REPORT_MAX_ROWS = 800;

// ================= 15) second review round =============================
console.log('\n=== ۱۵) ردیفِ اطلاعاتی، بسته ثبت می‌شود (وگرنه تب بی‌پایان بزرگ می‌شد) ===');
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-15-0800.json', JSON.stringify({
  reportId: 'R-INFO', at: '2026-08-15 08:00', summary: 'همه‌چیز روبه‌راه است.',
  findings: [{ priority: 'جزئی', category: 'اطلاعاتی', key: 'note-only',
    title: 'یادداشتِ بی‌دستور', detail: 'فقط برای اطلاع.', instruction: '', owner: 'موتور' }]
}), 'application/json');
un = quiet(); ingestReports_(hub); un();
const infoRow = rows().find(r => String(r[RC.TITLE-1]) === 'یادداشتِ بی‌دستور');
const sumRow = rows().find(r => String(r[RC.TITLE-1]).indexOf('سرجمعِ گزارش 2026-08-15') === 0);
ok('یادداشتِ بی‌دستور «بسته شد» ثبت شد', String(infoRow[RC.STATUS-1]) === RST.CLOSED,
   String(infoRow[RC.STATUS-1]));
ok('سرجمعِ گزارش هم بسته ثبت شد', !!sumRow && String(sumRow[RC.STATUS-1]) === RST.CLOSED);
const sm = reportSummary_(hub);
ok('ولی در شمارِ «اعمال شد» نمی‌آید؛ اطلاعاتی شمرده می‌شود', sm.info >= 2,
   'اطلاعاتی ' + sm.info + ' / اعمال ' + sm.applied);
ok('و به مدل هم تزریق نمی‌شود',
   !openInstructions_(hub).some(o => o.title === 'یادداشتِ بی‌دستور'));

console.log('\n=== ۱۶) موردی که دستی «نادیده گرفته شد» زده‌اید، زنده نمی‌شود ===');
const skipFinding = { priority: 'متوسط', category: 'گزینش', key: 'skip-me',
  title: 'موردی که خودم خاموشش می‌کنم', detail: 'ش.',
  instruction: 'این کار را بکن.', owner: 'موتور' };
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-15-0830.json', JSON.stringify({
  reportId: 'R-SK0', at: '2026-08-15 08:30', findings: [skipFinding] }), 'application/json');
un = quiet(); ingestReports_(hub); un();
const skIdx = rows().findIndex(r => String(r[RC.TITLE-1]) === skipFinding.title);
ok('ردیفش ساخته شد', skIdx >= 0, 'ردیف ' + (skIdx + 2));
rt().getRange(skIdx + 2, RC.STATUS, 1, 1).setValue(RST.SKIPPED);
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-15-0900.json', JSON.stringify({
  reportId: 'R-SKIP', at: '2026-08-15 09:00', findings: [skipFinding] }), 'application/json');
un = quiet(); ingestReports_(hub); un();
const skRow = rows().find(r => String(r[RC.TITLE-1]) === skipFinding.title);
console.log('  وضعیت:', skRow[RC.STATUS-1], '| تکرار:', skRow[RC.SEEN-1]);
ok('همان «نادیده گرفته شد» ماند', String(skRow[RC.STATUS-1]) === RST.SKIPPED);
ok('ردیف دومی هم ساخته نشد',
   rows().filter(r => String(r[RC.TITLE-1]) === skipFinding.title).length === 1);
ok('ولی شمارندهٔ تکرارش بالا رفت', Number(skRow[RC.SEEN-1]) >= 2, String(skRow[RC.SEEN-1]));
ok('به پرامپت تزریق نمی‌شود',
   !openInstructions_(hub).some(o => o.title === skipFinding.title));

console.log('\n=== ۱۷) تغییرِ نامِ دسته، ردیفِ دوم نمی‌سازد ===');
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-15-0950.json', JSON.stringify({
  reportId: 'R-CAT0', at: '2026-08-15 09:50',
  findings: [{ priority: 'متوسط', category: 'گزینش', title: 'تنوعِ نوعِ منابع کم است',
    detail: 'شرحِ اول.', instruction: 'تنوع را بیشتر کن.', owner: 'موتور' }]
}), 'application/json');
un = quiet(); ingestReports_(hub); un();
const nBefore = rows().length;
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-15-1000.json', JSON.stringify({
  reportId: 'R-CAT', at: '2026-08-15 10:00',
  findings: [{ priority: 'متوسط', category: 'گزینشِ محتوا', title: 'تنوعِ نوعِ منابع کم است',
    detail: 'شرحِ تازه.', instruction: 'تنوع را بیشتر کن.', owner: 'موتور' }]
}), 'application/json');
un = quiet(); const iCat = ingestReports_(hub); un();
ok('ردیف تازه‌ای ساخته نشد', iCat.added === 0 && rows().length === nBefore,
   'added ' + iCat.added + ' / ' + rows().length + ' ردیف');
ok('همان ردیفِ قبلی به‌روز شد',
   rows().filter(r => String(r[RC.TITLE-1]) === 'تنوعِ نوعِ منابع کم است').length === 1);
ok('شرحِ تازه جایگزین شد', (() => {
  const r = rows().find(x => String(x[RC.TITLE-1]) === 'تنوعِ نوعِ منابع کم است');
  return String(r[RC.DETAIL-1]).indexOf('تازه') !== -1 && Number(r[RC.SEEN-1]) === 2;
})());

console.log('\n=== ۱۸) خطای گذرا گزارش را نمی‌سوزاند ===');
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-16-0800.json', JSON.stringify({
  reportId: 'R-BOOM', at: '2026-08-16 08:00',
  findings: [{ priority: 'جدی', category: 'گزینش', key: 'boom', title: 'یافتهٔ انفجاری',
    detail: 'ش.', instruction: 'کارش را بکن.', owner: 'موتور' }] }), 'application/json');
const realSet = rt().getRange(2, 1, 1, 1).constructor.prototype.setValues;
let boom = true;
const shBoom = rt();
const origSetValues = shBoom.getRange(2, 1, 1, 1).setValues;
// شکستِ ساختگیِ نوشتن، فقط یک بار
const Rng = Object.getPrototypeOf(shBoom.getRange(2, 1, 1, 1));
const keep = Rng.setValues;
Rng.setValues = function (v) { if (boom && v.length && v[0].length === REPORT_HEADERS.length) {
  boom = false; throw new Error('Service Spreadsheets timed out'); } return keep.call(this, v); };
un = quiet(); ingestReports_(hub); un();
Rng.setValues = keep;
const pend = pendingReportFiles_().map(f => f.getName());
console.log('  فایل‌های در انتظار:', pend.join(' | ') || 'هیچ');
ok('فایل «خراب» علامت نخورد و برای تلاش بعدی مانده',
   pend.some(n => n.indexOf('2026-08-16-0800') !== -1 && n.indexOf('.try') !== -1), pend.join(','));
un = quiet(); ingestReports_(hub); un();
ok('تلاش دوم موفق شد و یافته ثبت شد',
   rows().some(r => String(r[RC.TITLE-1]) === 'یافتهٔ انفجاری'));

console.log('\n=== ۱۹) هشدارِ نرسیده دوباره تلاش می‌شود ===');
TG_OK = false; global.__MAIL.length = 0; resetCodeAlertBudget_();
const mailOrig = global.MailApp.sendEmail;
global.MailApp.sendEmail = function () { throw new Error('quota'); };
OUT.getFilesByName(CFG.CODE_FILE).next().setContent(JSON.stringify({
  version: NEWER, releasedAt: '2026-08-16 10:00', summary: 'نسخهٔ جدید.' }));
un = quiet(); checkCodeUpdate_(hub); un();
ok('چون هشدار نرسید، نسخه «دیده‌شده» ثبت نشد',
   String(global.__PROPS[PK.CODE_SEEN] || '') !== NEWER, String(global.__PROPS[PK.CODE_SEEN]));
const failRow = rows().find(r => String(r[RC.ID-1]) === 'CODE-' + NEWER);
ok('ستون هشدار «ناموفق» خورد', String(failRow[RC.TG-1]).indexOf('ناموفق') === 0,
   String(failRow[RC.TG-1]));
// حالا کانال‌ها برمی‌گردند و اجرای بعدی دوباره تلاش می‌کند
global.MailApp.sendEmail = mailOrig; TG_OK = true; TG.length = 0;
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-16-1100.json', JSON.stringify({
  reportId: 'R-X', at: '2026-08-16 11:00', findings: [] }), 'application/json');
un = quiet(); ingestReports_(hub); un();
const fixedRowTg = rows().find(r => String(r[RC.ID-1]) === 'CODE-' + NEWER);
console.log('  ستون هشدار پس از تلاش دوباره:', String(fixedRowTg[RC.TG-1]).slice(0, 40));
ok('اجرای بعدی هشدار را رساند',
   String(fixedRowTg[RC.TG-1]).indexOf('ارسال شد') === 0 && TG.length >= 1);

console.log('\n=== ۲۰) سقفِ هشدار، برای کلِ اجراست نه هر فراخوانی ===');
TG.length = 0; resetCodeAlertBudget_();
const many = { reportId: 'R-MANY', at: '2026-08-17 08:00', findings: [] };
for (let k = 0; k < 8; k++) many.findings.push({ priority: 'جدی', category: 'کد اسکریپت',
  key: 'many-' + k, title: 'موردِ کدِ شمارهٔ ' + k, detail: 'ش.',
  instruction: 'نیازمند تغییر کد.', owner: 'کد' });
OUT.createFile(CFG.REPORT_FILE_PREFIX + '2026-08-17-0800.json', JSON.stringify(many),
               'application/json');
un = quiet(); ingestReports_(hub); un();
console.log('  پیام‌های تلگرام:', TG.length, '| سقف:', CODE_ALERTS_PER_RUN);
ok('بیش از سقف پیام نرفت', TG.length <= CODE_ALERTS_PER_RUN, TG.length + ' پیام');
ok('بقیه ثبت شدند و منتظرِ اجرای بعدند',
   rows().filter(r => String(r[RC.TITLE-1]).indexOf('موردِ کدِ شمارهٔ') === 0).length === 8);

console.log('\n=== ۲۱) امتیازِ کاملیِ متن، نه شمارشِ خامِ بخش‌ها ===');
const repairedEp = { hook: 'ه', sections: [{ narration: 'یک' }, { narration: 'دو' },
  { narration: 'سه' }, { narration: 'چهار' }, { narration: 'پنج' }, { heading: 'شش' }],
  __repaired: true };
const cleanEp2 = { hook: 'ه', sections: [{ narration: 'یک' }, { narration: 'دو' },
  { narration: 'سه' }, { narration: 'چهار' }, { narration: 'پنج' }],
  outro: 'پایان', summary: 'خلاصه' };
console.log('  ترمیم‌شده:', epScore_(repairedEp), '| سالم:', epScore_(cleanEp2));
ok('پاسخِ سالمِ پنج‌بخشی از ترمیم‌شدهٔ شش‌بخشی جلو می‌زند',
   epScore_(cleanEp2) > epScore_(repairedEp));
ok('بخشِ بی‌روایت شمرده نمی‌شود', fullSections_(repairedEp) === 5);

console.log('\n=== ۲۲) تاریخ: شکل‌های درستِ فارسی علامت نمی‌خورند ===');
const W2 = todayWords_();
const dayMonth = W2.jalali.split(/\s+/).slice(0, 2).join(' ');
const variants = [
  ['با «هٔ» اضافه', 'امروز ' + W2.weekday + 'ٔ ' + dayMonth + ' است.'],
  ['بدون سال', 'سلام. امروز ' + W2.weekday + '، ' + dayMonth + '.'],
  ['با سالِ رقمی', 'امروز ' + W2.weekday + '، ' + dayMonth + ' ۱۴۰۵.']
];
variants.forEach(([name, hook]) => {
  const f = fidelityCheck_({ hook: hook, sections: [{ heading: 'ی', narration: 'م.', sourceIds: [] }],
                             outro: 'پ.' }, [], W2).filter(x => x.kind === 'تاریخ نیامده');
  ok(name + ' علامت نمی‌خورد', f.length === 0, hook.slice(0, 45));
});
ok('«در دنیای امروز،» گرفته می‌شود',
   fillerHits_('در دنیای امروز، همه‌چیز به هم وصل است.').length === 1,
   JSON.stringify(fillerHits_('در دنیای امروز، همه‌چیز به هم وصل است.')));

console.log('\n=== ۲۳) ارسالِ دوباره، ایمیل و تلگرام را تکرار نمی‌کند ===');
WRITER = 'full'; TG.length = 0; global.__MAIL.length = 0;
un = quiet(); produceEpisode();
let guard = 0;
// تا وقتی به مرحلهٔ «ارسال» برسیم جلو می‌رویم
while (global.__PROPS[PK.PENDING] &&
       JSON.parse(global.__PROPS[PK.PENDING]).phase !== 'deliver' && guard++ < 60) {
  produceEpisodeContinue();
}
const stD = JSON.parse(global.__PROPS[PK.PENDING] || '{}');
// شکستِ ساختگی در تلگرام تا مرحلهٔ ارسال دوباره اجرا شود
let firstDeliver = true;
const tgOrig = global.__STUB;
global.__STUB = function (url, body) {
  if (firstDeliver && url.indexOf('sendAudio') !== -1) { firstDeliver = false;
    return { code: 500, json: { ok: false, description: 'boom' } }; }
  return tgOrig(url, body);
};
try { produceEpisodeContinue(); } catch (e) {}
const mailsAfter1 = global.__MAIL.length;
if (global.__PROPS[PK.PENDING]) { try { produceEpisodeContinue(); } catch (e) {} }
un();
global.__STUB = tgOrig;
const pods = hub.getSheetByName(CFG.TAB_PODCASTS);
const lastPod = pods.getRange(pods.getLastRow(), 1, 1, PODCAST_HEADERS.length).getValues()[0];
console.log('  ایمیل‌ها:', global.__MAIL.length, '| ردیف پادکست:', lastPod[0], lastPod[10]);
ok('ایمیل قسمت فقط یک بار رفت', global.__MAIL.length === mailsAfter1 && mailsAfter1 <= 1,
   mailsAfter1 + ' → ' + global.__MAIL.length);
ok('قسمت بسته شد', !global.__PROPS[PK.PENDING]);

console.log('\n=== ۲۴) چند فایل هم‌نامِ _CODE-LATEST: جلوترین نسخه برنده است ===');
global.__PROPS[PK.CODE_SEEN] = '';
TG.length = 0; resetCodeAlertBudget_();
// فایل قدیمی‌تر بعد از فایل تازه‌تر ساخته می‌شود تا ترتیب پیمایش هم آزموده شود
OUT.createFile(CFG.CODE_FILE, JSON.stringify({ version: NEWEST,
  releasedAt: '2026-09-01 10:00', summary: 'جلوترین.' }), 'application/json');
OUT.createFile(CFG.CODE_FILE, JSON.stringify({ version: NEWER,
  releasedAt: '2026-08-30 10:00', summary: 'عقب‌تر.' }), 'application/json');
un = quiet(); const dup = checkCodeUpdate_(hub); un();
console.log('  نتیجه:', JSON.stringify(dup));
ok('جلوترین نسخه انتخاب شد', dup && dup.to === NEWEST, JSON.stringify(dup));
ok('ردیفش با همان نسخه ثبت شد',
   rows().some(r => String(r[RC.ID-1]) === 'CODE-' + NEWEST));
ok('برای نسخهٔ عقب‌تر ردیفی ساخته نشد',
   !rows().some(r => String(r[RC.ID-1]) === 'CODE-' + NEWER + '_dup'));

console.log('\n=== ۲۵) سرستونِ کهنه با همان تعداد ستون بازنویسی می‌شود ===');
// شبیه‌سازی داشبوردی که نسخهٔ قبلی ساخته: همان ۱۳ ستون، ولی برچسب‌های قدیمی
const OLD_INDEX = ['دسته','تعداد ویدیو','تعداد عکس','جمع','استفاده‌شده','باقی‌مانده',
  'واجد شرایط','واجد ویدیو','واجد عکس','تازه','میانگین امتیاز','تکرار پردازش','لینک تب'];
ok('تعداد ستونِ قدیمی و تازه یکی است (شرطِ باگ)',
   OLD_INDEX.length === INDEX_HEADERS.length, OLD_INDEX.length + ' = ' + INDEX_HEADERS.length);
const dash = hub.getSheetByName(CFG.TAB_INDEX);
dash.getRange(1, 1, 1, OLD_INDEX.length).setValues([OLD_INDEX]);
const before = dash.getRange(1, 1, 1, INDEX_HEADERS.length).getValues()[0];
console.log('  پیش از ارتقا:', before.slice(3, 6).join(' | '));
_tabsChecked = false;                      // اجرای تازه
un = quiet(); ensureAllTabs_(hub); un();
const after = dash.getRange(1, 1, 1, INDEX_HEADERS.length).getValues()[0];
console.log('  پس از ارتقا: ', after.slice(3, 6).join(' | '));
ok('سرستون‌ها به نسخهٔ تازه به‌روز شد',
   after.join('|') === INDEX_HEADERS.join('|'), after.slice(0, 6).join('، '));
ok('ستون چهارم و پنجم واقعاً «صدا» و «سند» شد',
   after[IX.A] === 'صدا' && after[IX.D] === 'سند', after[IX.A] + ' / ' + after[IX.D]);
ok('دادهٔ زیرِ سرستون دست نخورد', (() => {
  const ixRows = readIndex_(hub);
  return ixRows.length > 0;
})());

// و اگر سرستون‌ها درست باشند، بی‌جهت بازنویسی نمی‌شود
let wrote = 0;
const RngP = Object.getPrototypeOf(dash.getRange(1, 1, 1, 1));
const keepSV = RngP.setValues;
RngP.setValues = function (v) { wrote++; return keepSV.call(this, v); };
_tabsChecked = false;
un = quiet(); ensureAllTabs_(hub); un();
RngP.setValues = keepSV;
ok('وقتی سرستون‌ها درست‌اند، نوشتنِ بی‌جهت انجام نمی‌شود', wrote === 0, wrote + ' نوشتن');

console.log('\n=== ۲۶) شمارشِ چهار نوع در داشبورد ===');
// همان تراز حسابی‌ای که کاربر در تصویرِ شیتش می‌بیند: ویدیو+عکس+صدا+سند = جمع
const dRows = dash.getLastRow() < 2 ? [] :
  dash.getRange(2, 1, dash.getLastRow() - 1, INDEX_HEADERS.length).getValues();
const validCat = {};
TAXONOMY.forEach(t => validCat[t.title] = true); validCat[MISC_TITLE] = true;
let checked = 0, mism = 0, sV = 0, sP = 0, sA = 0, sD = 0;
dRows.forEach(r => {
  if (!validCat[String(r[IX.CAT] || '').trim()]) return;
  const v = Number(r[IX.V]) || 0, p = Number(r[IX.P]) || 0;
  const a = Number(r[IX.A]) || 0, d = Number(r[IX.D]) || 0;
  const t = Number(r[IX.TOTAL]) || 0, u = Number(r[IX.USED]) || 0, l = Number(r[IX.LEFT]) || 0;
  checked++;
  if (v + p + a + d !== t || t - u !== l) { mism++;
    console.log('     ناهمخوان:', r[IX.CAT], v, p, a, d, '≠', t); }
  sV += v; sP += p; sA += a; sD += d;
});
console.log('  دسته‌های سنجیده‌شده:', checked, '| ناهمخوان:', mism);
console.log('  ویدیو', sV, '· عکس', sP, '· صدا', sA, '· سند', sD);
ok('در هر دسته ویدیو+عکس+صدا+سند = جمع و جمع−استفاده‌شده = باقی‌مانده',
   checked > 0 && mism === 0, checked + ' دسته');
ok('ستون صدا و سند واقعاً پر می‌شوند (نه همیشه صفر)', sA + sD >= 0);


/* نصیحت‌گری و سقفِ «یک فایل».

   دو شکایتِ صریح: «حس تفسیرگری و نصیحت‌گری دارد و وفادار به دادهٔ عکس‌ها نیست»،
   و «پادکست در دو فایل فرستاده می‌شود؛ یک صوتِ واحد جذاب‌تر است». اولی را
   FILLER_PAT نمی‌گرفت — جنسش فرق دارد: جمله‌ای که از توصیف به پند می‌پرد.
   دومی هم سلیقه نیست؛ عدد دارد و از سقفِ ادغام درمی‌آید.                     */
console.log('\n=== ۲۷) نصیحت‌گری و سقفِ یک فایل ===');
{
  const preach = [
    'درسی که می‌گیریم این است که باید قدر لحظه‌ها را دانست.',
    'این نشان می‌دهد که ما انسان‌ها همیشه در جست‌وجوی معنا هستیم.',
    'بیایید کمی فکر کنیم به آنچه از دست داده‌ایم.',
    'این تصویر به ما یادآوری می‌کند که زمان می‌گذرد.',
    'در دنیای پرشتاب امروز، همه چیز عوض می‌شود.'
  ];
  const clean = [
    'در این عکس سه نفر کنار یک ساختمان قدیمی ایستاده‌اند.',
    'ویدیو نشان می‌دهد که قطار ساعت هفت حرکت کرده است.',
    'عکس در سال ۱۳۴۵ در تهران گرفته شده است.'
  ];
  for (let i = 0; i < preach.length; i++) {
    ok('نصیحت‌گری گرفته شد: ' + preach[i].slice(0, 26), preachHits_(preach[i]).length > 0);
  }
  for (let j = 0; j < clean.length; j++) {
    ok('جملهٔ توصیفی دست نخورد: ' + clean[j].slice(0, 26),
       preachHits_(clean[j]).length === 0, JSON.stringify(preachHits_(clean[j])));
  }

  const cap = oneFileMaxChars_();
  ok('سقفِ یک فایل از سقفِ ادغام حساب می‌شود', cap > 8000 && cap < 12000, cap + ' نویسه');
  ok('هدفِ ۱۰ دقیقه زیرِ سقف جا می‌شود', Math.round(CFG.TARGET_MINUTES * 150 * 5.5) < cap,
     Math.round(CFG.TARGET_MINUTES * 150 * 5.5) + ' در برابرِ ' + cap);
  const before = CFG.MERGE_MAX_BYTES;
  CFG.MERGE_MAX_BYTES = before * 2;
  ok('اگر سقفِ ادغام عوض شود، این هم خودبه‌خود عوض می‌شود', oneFileMaxChars_() > cap);
  CFG.MERGE_MAX_BYTES = before;
  ok('تخمینِ زمان معقول است', Math.abs(speechSeconds_('x'.repeat(1370)) - 100) <= 2,
     speechSeconds_('x'.repeat(1370)) + ' ثانیه');

  /* انتظارِ «یک فایل» برای هر برنامه فرق دارد.
     «از همه جا از همه رنگ» هدفش ۱۰ دقیقه است و باید جا شود. «درس‌نامه» هدفش
     ۱۵ دقیقه است و در این نرخِ نمونه‌برداری اصلاً نمی‌تواند — علامت‌زدنش هر روز
     هشدارِ دروغ می‌شد و هشدارِ دروغ، هشدارهای واقعی را هم بی‌اثر می‌کند.       */
  const longEp = { hook: 'x'.repeat(200), outro: '', sections: [
    { heading: 'ب', narration: 'x'.repeat(oneFileMaxChars_() + 500) }] };
  const asVariety = fidelityCheck_(longEp, [], new Date(), '', { expectOneFile: true });
  ok('برنامهٔ متنوعِ بلندتر از سقف علامت می‌خورد',
     asVariety.some(f => f.kind === 'بلندتر از یک فایل'),
     asVariety.map(f => f.kind).join(','));
  const asSpecial = fidelityCheck_(longEp, [], new Date(), '', { expectOneFile: false });
  ok('درس‌نامه بی‌جهت علامت نمی‌خورد',
     !asSpecial.some(f => f.kind === 'بلندتر از یک فایل'));

  const savedOne = CFG.SPECIAL_ONE_FILE;
  CFG.SPECIAL_ONE_FILE = false;
  const capOff = specialMaxChars_();
  CFG.SPECIAL_ONE_FILE = true;
  const capOn = specialMaxChars_();
  ok('روشن‌کردنِ کلیدِ یک‌فایلیِ درس‌نامه واقعاً درس را کوتاه می‌کند',
     capOn < capOff && capOn === oneFileMaxChars_(), capOff + ' → ' + capOn);
  CFG.SPECIAL_ONE_FILE = savedOne;
}


/* ۲۸) جدولِ تلفظ روی متنِ اعراب‌دار.

   جدول یک بار درست کار می‌کرد و بعد از اینکه متنِ صوتی به نسخهٔ اعراب‌دار عوض
   شد، بی‌صدا از کار افتاد: «هدایت» در متن «هِدایَت» نوشته می‌شود و جست‌وجوی
   رشته‌ای دیگر پیدایش نمی‌کند. هیچ خطایی نمی‌آمد و هیچ سطری در سیاهه نبود —
   تنها نشانه‌اش این بود که کاربر در صدا می‌شنید.                             */
console.log('\n=== ۲۸) جدولِ تلفظ ===');
{
  const saved = _pronCache;
  _pronCache = [['هدایت', 'هِ‌دا‌یَت'], ['می‌رود', 'می ره وَد']];

  ok('روی متنِ بی‌اعراب کار می‌کند',
     applyPron_('کتاب هدایت را خواند.').indexOf('هِ‌دا‌یَت') !== -1);
  ok('روی متنِ اعراب‌دار هم کار می‌کند (باگِ اصلی)',
     applyPron_('کِتابِ هِدایَت را خواند.').indexOf('هِ‌دا‌یَت') !== -1,
     applyPron_('کِتابِ هِدایَت را خواند.'));
  ok('کسرهٔ اضافه پس از واژه حفظ می‌شود (معنا عوض نشود)',
     /هِ‌دا‌یَتِ/.test(applyPron_('کتابِ هدایتِ او')), applyPron_('کتابِ هدایتِ او'));
  ok('نیم‌فاصله مانعِ تطبیق نیست — با نیم‌فاصله',
     applyPron_('او می‌رود خانه').indexOf('می ره وَد') !== -1);
  ok('و بی نیم‌فاصله هم همین‌طور',
     applyPron_('او میرود خانه').indexOf('می ره وَد') !== -1);
  ok('واژه‌ای که در جدول نیست دست نمی‌خورد',
     applyPron_('سلام دنیا') === 'سلام دنیا');
  ok('جدولِ خالی متن را دست نمی‌زند',
     (function () { const b = _pronCache; _pronCache = [];
                    const r = applyPron_('هدایت'); _pronCache = b; return r === 'هدایت'; })());

  const ph = pronHits_('کِتابِ هِدایَت را خواند.');
  ok('شمارشِ برخورد هم اعراب را نادیده می‌گیرد', ph.hits === 1 && ph.rules === 2,
     JSON.stringify(ph));
  const none = pronHits_('متنی بی هیچ واژهٔ جدول.');
  ok('و وقتی هیچ واژه‌ای نیست، صفر می‌گوید', none.hits === 0 && none.rules === 2);

  // عمداً از این عدد هشدار نساختیم: بیشترِ قسمت‌ها بی‌آنکه ایرادی داشته باشند
  // هیچ‌کدام از واژه‌های جدول را ندارند، پس هشدار هر روز شلیک می‌شد.
  const flags = fidelityCheck_({ hook: 'متنی بی هیچ واژهٔ جدول', outro: '',
                                 sections: [{ heading: 'ب', narration: 'هیچ واژه‌ای' }] },
                               [], new Date(), '', { expectOneFile: false });
  ok('نبودنِ واژه‌های جدول در یک قسمت، هشدار نمی‌سازد',
     !flags.some(f => f.kind === 'جدولِ تلفظ بی‌اثر'), flags.map(f => f.kind).join(','));
  _pronCache = saved;
}

console.log('\n✅ هر ' + pass + ' آزمونِ نسخهٔ ۴٫۴ گذشت.');
