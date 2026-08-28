/* آزمونِ سه ایرادی که در آرشیوِ واقعیِ کاربر دیده شد:
   ۱) ۹۸۲ فایل → ۲۶۳ «مجموعه» با نام‌هایی مثل «1»، «892»، هگز، و ابزارِ تبدیل صدا
   ۲) داوری/برنامه‌ریزی صفر برمی‌گشت چون مدل قالبِ خروجی (integer/boolean) را رد می‌کرد
   ۳) پادکست تخصصی هرگز اجرا نشد چون تریگرش نصب نشده بود (۴ تریگر به‌جای ۶) */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
let un;

const TVH = ['Timestamp','File_ID','File_Name','New_Name','Drive_Link','Is_Chunk','Chunk_Number',
  'Chunk_Total','Chunk_Time_Range','Duration','Persons_Identified','Music_Analysis',
  'Video_Date_Info','Farsi_Transcription','Vibe_Atmosphere','Professional_Insights',
  'Technical_Specs','Content_Analysis','Audio_Analysis','Visual_Analysis','Professional_Insights_2',
  'Executive_Summary','Status','Education_Meta','Trading_Strategies','Indicators_Tools',
  'Chart_Patterns','Chart_Analysis','Concepts_Definitions','Money_Management','Trading_Psychology',
  'References_Citations','Live_Trade_Setups','Episode_Connections','Advanced_Methodologies',
  'Alternative_Analysis','Codeable_Elements','Trading_Executive_Summary','Series_ID','Series_Name',
  'Episode_Seq'];
const p2 = n => String(n).padStart(2, '0');
const D0 = new Date();
const when = i => { const d = new Date(D0.getTime() - (500 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };
const LESSON = n => 'دقیقهٔ ' + n + '. مدرس مفهومِ ' + n + ' را تعریف می‌کند و مثال می‌زند. ' +
  ('توضیحِ گام‌به‌گام با تمرین و اشتباهِ رایج برای همین مفهوم. ').repeat(50);

let seq = 0;
function row(fid, name, no, tot, ts) {
  const r = new Array(TVH.length).fill('');
  r[0]=ts||when(seq++); r[1]=fid; r[2]=name; r[4]='https://drive.google.com/file/d/'+fid+'/view';
  r[5]='بله'; r[6]=no; r[7]=tot; r[8]=((no-1)*60)+'-'+(no*60)+' ثانیه'; r[9]=tot*60+' ثانیه';
  r[13]=LESSON(no); r[21]='خلاصهٔ '+no; r[22]='SUCCESS';
  return r;
}
const rows = [];
const add = (fid, name, n) => { for (let i=1;i<=n;i++) rows.push(row(fid, name, i, n)); };

// ── همان جنسِ آشغالی که در آرشیوِ واقعی دیده شد ──
add('J1', '1.mp4', 9);
add('J2', '4.m4a', 12);
add('J3', '892.mp4', 10);
add('J4', 'online-audio-converter_0.mp4)_5913516603282032877_4.mp4', 9);
add('J5', '0efef642ff0f41a77938c9c7b1dc282712648307-360p.mp4', 11);
add('J6', 'WhatsApp Video 2026-01-02 at 10.11.12.mp4', 9);
add('J7', 'video_2026-01-03_11-22-33.mp4', 10);
add('J8', 'kelip kutah.mp4', 5);            // نامش خوب است ولی تکِ کوتاه
// ── دوره‌های واقعی ──
add('R1', '01_MabaniTahlilBazar_Ostad.mp4', 14);
add('R2', '02_MabaniTahlilBazar_Ostad.mp4', 14);
add('R3', 'Marefat Shenasi Mojtaba Mesbah.m4a', 26);   // تکِ بلند = دورهٔ واقعی
add('R4', '01_RavanshenasiPul_Doktor.mp4', 9);
/* ══ کتابی که شش بار «پیدا نشد» (۶٫۵۰) ══
   نامِ واقعیِ فایلی که صاحبِ برنامه گذاشته بود. صافیِ «نامِ ماشینی» دنبالِ
   `temp` می‌گشت بی مرزِ واژه، و آن را وسطِ «Con·temp·orary» پیدا می‌کرد —
   پس کتاب نه فقط رد می‌شد، بلکه **هیچ ردیفی در هیچ جدولی** نمی‌ساخت. */
add('B1', 'Audi (2011) Epistemology A Contemporary Introduction to the Theory of Knowledge.pdf', 81);

function mkSheet(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(2000, sh._d.length + 20); });
  global.__SS[id] = ss; return ss;
}
const SRC = {}; CFG.SOURCES.forEach(s => SRC[s.key] = s);
mkSheet(SRC.trading.id, [{ name: 'Video Analysis', hdr: TVH, rows: rows }]);
CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
  ss.insertSheet('S1'); global.__SS[s.id] = ss; } });
global.DriveApp.__register(CFG.BACKUP_FOLDER_ID, 'BACKUP');
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
global.__PROPS['TELEGRAM_CHAT_ID'] = '123';

// ── مدلی که عیناً مثل مدلِ واقعی رفتار می‌کند: قالبِ integer/boolean را رد می‌کند ──
let rejectedSchemas = [], judgeCalls = 0, schemaSeen = [];
global.__STUB = function (url, body) {
  if (url.indexOf('api.telegram.org') !== -1) return { code: 200, json: { ok: true, result: {} } };
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.1-flash-tts-preview', supportedGenerationMethods: ['generateContent'] }] } };
  if (url.indexOf('tts') !== -1) return { code: 200, json: { candidates: [{ content: { parts: [{
    inlineData: { data: Buffer.alloc(20000).toString('base64') } }] } }] } };

  const sch = body.generationConfig && body.generationConfig.responseSchema;
  const flat = sch ? JSON.stringify(sch) : '';
  schemaSeen.push(flat ? 'با قالب' : 'بی قالب');
  // مدلِ سلیقه‌ای: هر درخواستی که «قالبِ خروجی» داشته باشد را با ۴۰۰ رد می‌کند —
  // همان چیزی که در عمل کلِ داوری و برنامه‌ریزی را خاموش کرده بود.
  if (flat) {
    rejectedSchemas.push(flat.slice(0, 40));
    return { code: 400, text: JSON.stringify({ error: {
      message: 'Invalid JSON payload received. Unknown name "responseSchema": invalid argument',
      code: 'invalid_request' } }) };
  }

  const t = body.contents ? body.contents[0].parts[0].text : '';
  if (t.indexOf('یک داوری بده') !== -1) {
    judgeCalls++;
    const blocks = t.split('─────────────────────────────────').slice(1, -1);
    const verdicts = [];
    for (const b of blocks) {
      const km = b.match(/key:\s*(.+)/);
      if (!km) continue;
      const key = km[1].trim();
      verdicts.push({ key: key, isCourse: 'true', score: '80',
        kindOfContent: 'دورهٔ آموزشی', about: 'آموزشِ گام‌به‌گامِ ' + key + ' با مثال.',
        topic: 'موضوع', category: 'مالی، ترید و اقتصاد',
        level: key.indexOf('mabani') !== -1 ? 'مقدماتی' : 'میانی',
        related: '', orderHint: '2', why: 'ساختارِ درسی دارد.' });
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ verdicts: verdicts }) }] } }] } };
  }
  if (t.indexOf('قاعده‌های سختِ این برنامه') !== -1) {
    const nos = [...t.matchAll(/--- قطعهٔ (\d+)/g)].map(m => m[1]);   // رشته، مثل قالبِ تازه
    const W = todayWords_();
    const per = Math.max(1, Math.ceil(nos.length / 6));
    const secs = [];
    for (let k = 0; k < 6; k++) secs.push({ heading: 'بخشِ ' + (k+1),
      narration: ('متنِ آموزشیِ بخشِ ' + (k+1) + ' با توضیحِ کامل و مثال. ').repeat(120),
      tone: 'آرام', chunkNos: nos.slice(k*per, (k+1)*per), enrichIds: [] });
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'عنوانِ درس', hook: CFG.SPECIAL_SHOW_NAME + '. امروز ' + W.weekday + '، ' + W.jalali + '.',
      recap: '', goal: { problem: 'م', behavior: 'ر', message: 'پ' },
      sections: secs, outro: 'پایان.', summary: 'خلاصه.', tags: ['ب'], coverage: 'پ' }) }] } }] } };
  }
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  const W2 = todayWords_();
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'ت', hook: CFG.SHOW_NAME + '. امروز ' + W2.weekday + '، ' + W2.jalali + '.',
    sections: [1,2,3,4,5].map(k => ({ heading:'ب'+k, narration:'م. '.repeat(40),
      tone:'آرام', sourceIds: ids.slice(k*2,k*2+2) })),
    outro: 'پایان.', summary: 'خ.', tags: ['ب'] }) }] } }] } };
};

un = quiet(); let g = 0; while (g++ < 30) syncCatalog(); un();
const hub = getHub_();

// ════════════ ۱) فهرست باید تمیز باشد، نه ۲۶۳ ردیفِ ماشینی ════════════════
console.log('=== ۱) صافیِ ساختاری: نامِ ماشینی و فایلِ تکِ کوتاه وارد فهرست نمی‌شوند ===');
const reg = readSeriesReg_(hub);
console.log('  فایل‌های آموزشیِ خوانده‌شده:', rows.length, 'ردیف از 12 فایل');
console.log('  مجموعه‌های ثبت‌شده:', reg.rows.map(r => r.key).join(' | ') || 'هیچ');
ok('نام‌های عددیِ محض («1»، «4»، «892») مجموعه نشدند',
   !reg.byKey['1'] && !reg.byKey['4'] && !reg.byKey['892'],
   reg.rows.map(r => r.key).join(','));
ok('نامِ ابزارِ تبدیل صدا مجموعه نشد',
   reg.rows.every(r => r.key.indexOf('converter') === -1));
/* هگز را **پیوسته** می‌سنجیم، نه پس از پاک‌کردنِ بقیهٔ نویسه‌ها — دقیقاً
   همان قاعده‌ای که خودِ seriesNameLooksReal_ دارد. با پاک‌کردن، هر عنوانِ
   انگلیسیِ بلند («Epistemology A Contemporary Introduction …») هم یک
   «شناسهٔ ماشینی» می‌شد و این آزمون سرِ چیزِ درست می‌افتاد. */
ok('شناسهٔ هگزادسیمالِ بلند مجموعه نشد',
   reg.rows.every(r => !/[0-9a-f]{16,}/i.test(r.key)) && !reg.byKey['0efef642ff0f41a77938c9c7b1dc282712648307 360p']);
ok('نامِ خودکارِ واتس‌اپ/تلگرام مجموعه نشد',
   reg.rows.every(r => !/whatsapp|video 2026/i.test(r.key)));
ok('فایلِ تکِ کوتاه (۵ قطعه) مجموعه نشد', !reg.byKey['kelip kutah']);
ok('ولی دورهٔ دوقسمتیِ واقعی ثبت شد', !!reg.byKey['mabanitahlilbazar ostad']);
ok('و فایلِ تکِ بلند (۲۶ قطعه) هم ثبت شد', !!reg.byKey['marefat shenasi mojtaba mesbah']);
ok('و دورهٔ نه‌قطعه‌ای هم ثبت شد', !!reg.byKey['ravanshenasipul doktor']);
/* ══ ۱-ح) کتابِ چهارصدصفحه‌ای با عنوانِ آکادمیک (۶٫۵۰) ══
   این یک آزمونِ نامْ نیست؛ کلِ مسیرِ اسکن است: ردیف‌های شیت → گروه‌بندی →
   صافیِ ساختاری → ردیفِ رجیستری. اگر صافی دوباره تنگ شود، همین‌جا می‌افتد. */
ok('۱-ح کتابِ «Epistemology A Contemporary …» وارد فهرست شد',
   !!reg.byKey['audi 2011 epistemology a contemporary introduction to the theory of knowledge'],
   reg.rows.map(r => r.key).join(' | '));
ok('۱-ح واژهٔ عام فقط با مرزِ واژه و در نامِ کوتاه، «ماشینی» است', (() => {
  const yes = ['Epistemology A Contemporary Introduction', 'The Surrender Experiment',
               'Export Management in Emerging Markets', 'Input Output Analysis in Economics',
               'Template Design Patterns for Backend'];
  const no  = ['temp', 'export final', 'tmp 2', 'render 01', 'output'];
  return yes.every(n => seriesNameLooksReal_(n)) && no.every(n => !seriesNameLooksReal_(n));
})());
ok('فهرست کوچک و قابلِ خواندن ماند', reg.rows.length === 4,
   reg.rows.length + ' مجموعه به‌جای 13');
/* ══ و آنچه رد شد باید دیده شود (۶٫۵۰) ══
   اصلاحِ صافی کافی نیست: صافیِ بعدی هم روزی اشتباه می‌کند. تا امروز گروهِ
   ردشده هیچ‌جا ثبت نمی‌شد، پس سؤالِ «فایلم کجاست؟» جوابی نداشت. */
{
  const rj = seriesRejected_();
  ok('۱-خ گروه‌های ردشده با نام و دلیل ثبت شدند', rj.total >= 5 && rj.rows.length >= 5,
     rj.total + ' گروه');
  ok('۱-خ هر ردیف دلیلِ خودش را دارد',
     rj.rows.every(r => r.name && r.why), JSON.stringify(rj.rows[0] || {}));
  ok('۱-خ فایلِ تکِ کوتاه هم با نامِ فایلش قابلِ پیدا کردن است',
     rj.rows.some(r => /kelip kutah/i.test(String(r.name) + ' ' + String(r.file))));
  ok('۱-خ یک سطرِ فارسیِ آماده برای گزارشِ روزانه دارد',
     rj.line.indexOf('وارد فهرستِ مجموعه‌ها نشد') === 0, rj.line);
}

// ════════════ ۲) قالبِ خروجی: مدل رد می‌کند، موتور تسلیم نمی‌شود ════════════
console.log('\n=== ۲) مدل قالبِ integer/boolean را رد می‌کند؛ داوری باید باز هم انجام شود ===');
un = quiet(); const jr = judgeSeries(true, new Date().getTime() + 300000); un();
console.log('  داوری:', JSON.stringify(jr), '| قالب‌های ردشده:', rejectedSchemas.join(','),
            '| فراخوان‌های داوری:', judgeCalls);
ok('مدل واقعاً هر قالبِ خروجی را رد کرد (شبیه‌سازیِ درست)', rejectedSchemas.length > 0,
   rejectedSchemas.length + ' رد');
ok('هیچ قالبی در کل کد نوعِ integer/boolean/number ندارد', (() => {
  let bad = [];
  for (const f of FILES) {
    const t = fs.readFileSync(DIR + f, 'utf8');
    const m = t.match(/type: '(integer|boolean|number)'/g);
    if (m) bad.push(f + ':' + m.join(','));
  }
  return bad.length === 0;
})(), 'قالب‌ها همه رشته‌ای‌اند');
ok('ولی موتور بی‌قالب دوباره تلاش کرد و جواب گرفت', jr.judged >= 3,
   JSON.stringify(jr));
ok('و همهٔ مجموعه‌ها داوری شدند', judgeSummary_(hub).unjudged === 0,
   JSON.stringify(judgeSummary_(hub)));
const regJ = readSeriesReg_(hub);
ok('امتیازِ رشته‌ای درست به عدد تبدیل شد',
   Number(regJ.byKey['mabanitahlilbazar ostad'].vals[SC.CSCORE-1]) === 80,
   String(regJ.byKey['mabanitahlilbazar ostad'].vals[SC.CSCORE-1]));
ok('«true»ِ رشته‌ای درست فهمیده شد',
   String(regJ.byKey['mabanitahlilbazar ostad'].vals[SC.IS_COURSE-1]) === SJ.YES);
ok('و دسته و سطح و اولویت واقعاً نوشته شدند', (() => {
  const v = regJ.byKey['mabanitahlilbazar ostad'].vals;
  return String(v[SC.CAT-1]) === 'مالی، ترید و اقتصاد' &&
         String(v[SC.LEVEL-1]) === 'مقدماتی' && Number(v[SC.ORDER-1]) >= 1;
})(), String(regJ.byKey['mabanitahlilbazar ostad'].vals[SC.ORDER-1]));
ok('و در سیاهه نوشته شد که قالب پذیرفته نشد', (() => {
  const sh = hub.getSheetByName(CFG.TAB_LOG);
  const v = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  return v.some(r => String(r[1]).indexOf('responseSchema') !== -1);
})());
ok('و ردیفِ اولویت‌ها یکتا و پیوسته است', (() => {
  const bd = seriesBoardData_(hub);
  return bd.groups.every(gp => {
    const o = gp.series.map(x => x.order).sort((a,b)=>a-b);
    return o.every((x, i) => x === i + 1);
  });
})(), seriesBoardData_(hub).groups.map(gp =>
  gp.cat + ':' + gp.series.map(x => x.order).join(',')).join(' | '));

// ════════════ ۳) تریگرِ جاافتاده خودش نصب می‌شود ═══════════════════════════
console.log('\n=== ۳) پادکست تخصصی بی‌تریگر مانده بود؛ خودش باید نصب شود ===');
(() => {
  // همان وضعیتِ واقعی: فقط چهار تریگر، بی «درس‌نامه» و بی «پشتیبان»
  const made = [];
  global.ScriptApp = Object.assign({}, global.ScriptApp, {
    getProjectTriggers: () => ['onOpen','syncCatalog','produceEpisode','healthCheck']
      .map(f => ({ getHandlerFunction: () => f })),
    newTrigger: (f) => { const o = {
      timeBased: () => o, everyHours: () => o, atHour: () => o, nearMinute: () => o,
      everyDays: () => o, inTimezone: () => o, onOpen: () => o, after: () => o,
      forSpreadsheet: () => o, create: () => { made.push(f); return o; } }; return o; },
    deleteTrigger: () => {}
  });
  un = quiet(); const r = ensureScheduledTriggers_(); un();
  console.log('  تریگرهای نصب‌شده:', made.join(' , ') || 'هیچ');
  ok('تریگرِ «درس‌نامه» خودکار نصب شد', made.indexOf('produceSpecialEpisode') !== -1,
     made.join(','));
  ok('تریگرِ «پشتیبان» هم خودکار نصب شد', made.indexOf('backupDaily') !== -1);
  ok('تریگرهای موجود دوباره ساخته نشدند',
     made.indexOf('syncCatalog') === -1 && made.indexOf('produceEpisode') === -1 &&
     made.indexOf('healthCheck') === -1, made.join(','));
  ok('و ایرادش در تبِ گزارش‌ها ثبت شد تا بی‌صدا نماند', (() => {
    const rt = hub.getSheetByName(CFG.REPORT_TAB);
    const v = rt.getRange(2, 1, rt.getLastRow()-1, REPORT_HEADERS.length).getValues();
    return v.some(x => String(x[RC.TITLE-1]).indexOf('زمان‌بندیِ جاافتاده') !== -1);
  })());
  // بارِ دوم چیزی نصب نمی‌شود
  const before = made.length;
  /* فهرست از خودِ `wantedTriggers_()` ساخته می‌شود، نه دست‌نویس: نمونه‌ای که
     نامِ زمان‌بندی‌ها را کپی کند، روزی که یکی اضافه شود بی‌صدا کهنه می‌شود —
     همان بیماری‌ای که ۵٫۹۵ و ۶٫۳۷ در خودِ کد بستند. */
  global.ScriptApp.getProjectTriggers = () =>
    ['onOpen'].concat(wantedTriggers_().map(w => w.fn))
      .map(f => ({ getHandlerFunction: () => f }));
  un = quiet(); ensureScheduledTriggers_(); un();
  ok('اجرای دوباره تریگرِ تکراری نمی‌سازد', made.length === before, made.length + '');
})();

// ════════════ ۴) و حالا پادکست تخصصی واقعاً ساخته می‌شود ══════════════════
console.log('\n=== ۴) تولید درس‌نامه از مجموعهٔ درست ===');
un = quiet();
const r1 = produceSpecialEpisode();
let d = 0; while (global.__PROPS[PK.SP_PENDING] && d++ < 80) produceSpecialContinue();
un();
console.log('  نتیجه:', JSON.stringify({ ok: r1.ok, series: r1.series, ep: r1.episode }));
ok('قسمتِ درس‌نامه ساخته شد', r1.ok === true, JSON.stringify(r1).slice(0, 90));
ok('از یک دورهٔ واقعی، نه از فایلِ ماشینی',
   /MabaniTahlilBazar|Marefat|RavanshenasiPul/.test(String(r1.series)), String(r1.series));
ok('و شمارهٔ قطعه‌های رشته‌ای درست خوانده شد (مکان‌نما جلو رفت)', (() => {
  const ps = readSeriesParts_(hub).rows;
  return ps.some(p => Number(p.vals[SP.DONE_TO-1]) > 0);
})());
const st = (() => { un = quiet(); const x = writeStatus_(hub, 'آزمون'); un(); return x; })();
console.log('  وضعیت:', JSON.stringify({ series: st.special.series,
  cats: (st.special.byCategory||[]).map(c => c.cat + ':' + c.pct + '٪'),
  curation: st.curation && { c: st.curation.course, n: st.curation.notCourse,
                             u: st.curation.unjudged } }));
ok('فایل وضعیت هم فهرستِ تمیز را گزارش می‌کند', st.special.series === 4,
   String(st.special.series));
ok('و ردشده‌ها هم در فایلِ وضعیت هستند، نه فقط در سیاههٔ داخلی',
   !!(st.seriesRejected && st.seriesRejected.total >= 5),
   JSON.stringify(st.seriesRejected && st.seriesRejected.total));
ok('و همهٔ مجموعه‌ها دسته دارند (نه همه در «متفرقه»)',
   (st.special.byCategory || []).every(c => c.series > 0) &&
   !((st.special.byCategory || []).length === 1 &&
     st.special.byCategory[0].cat === MISC_TITLE),
   (st.special.byCategory||[]).map(c => c.cat).join(' | '));

console.log('\n✅ هر ' + pass + ' آزمونِ آرشیوِ واقعی گذشت.');
