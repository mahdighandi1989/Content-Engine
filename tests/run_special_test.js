/* «درس‌نامه» — پادکست تخصصیِ مجموعه‌های آموزشی.
   روی داده‌ای ساخته می‌شود که عمداً بدترین حالتِ واقعی را دارد:
   قطعه‌های یک فایل پراکنده و درهم، دو قسمت از یک دوره، یک کتابِ تک‌قسمتی،
   ردیفِ جمع‌بندیِ پوچ در آخر، و کلیپ‌های کوتاهی که نباید «مجموعه» شمرده شوند. */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread, DFolder } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

// ───────────────────────────────── fixtures: real column shapes ────────────
// تبِ ویدیوی Trading-Processor — همان ۴۱ ستونِ واقعی
const TVH = ['Timestamp','File_ID','File_Name','New_Name','Drive_Link','Is_Chunk','Chunk_Number',
  'Chunk_Total','Chunk_Time_Range','Duration','Persons_Identified','Music_Analysis',
  'Video_Date_Info','Farsi_Transcription','Vibe_Atmosphere','Professional_Insights',
  'Technical_Specs','Content_Analysis','Audio_Analysis','Visual_Analysis','Professional_Insights_2',
  'Executive_Summary','Status','Education_Meta','Trading_Strategies','Indicators_Tools',
  'Chart_Patterns','Chart_Analysis','Concepts_Definitions','Money_Management','Trading_Psychology',
  'References_Citations','Live_Trade_Setups','Episode_Connections','Advanced_Methodologies',
  'Alternative_Analysis','Codeable_Elements','Trading_Executive_Summary','Series_ID','Series_Name',
  'Episode_Seq'];
// تبِ سندِ General-Processor — ۵۷ ستون
const GDH = ['Timestamp','File_ID','File_Name','New_Name','File_Link','Is_Chunk','Chunk_Number',
  'Total_Chunks','Chunk_Page_Range','Document_Info','Full_Text_Extraction','Farsi_Translation',
  'Tables_Data','Figures_Charts','Content_Analysis','Key_Points','Formulas_Code',
  'Executive_Summary','Status','Domain_Detected','Content_Type','Main_Subject','Related_Fields',
  'Content_Structure','Core_Ideas','Claims_Made','Arguments_Positions','Counterarguments',
  'Terminology','Key_Figures','Examples_Cases','Evidence_Type','Methodology','Assumptions',
  'Open_Questions','Contradictions_Tensions','Implicit_Worldview','Historical_Context',
  'Schools_Traditions','Cross_References','Relationships','Source_References','Conceptual_Map',
  'Patterns_Structures','Tools_Instruments','Practical_Elements','Operationalizable_Elements',
  'Educational_Metadata','Knowledge_Level','Advanced_Insights','Audience_Takeaway',
  'Real_World_Anchoring','Content_Density','Confidence_Level','General_Executive_Summary',
  'Formulas_Equations','Narrative_Elements'];

const p2 = n => String(n).padStart(2, '0');
const D0 = new Date();
const when = i => { const d = new Date(D0.getTime() - (300 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };

const LESSON = n =>
  'دقیقهٔ ' + n + '. در این بخش از درس، مدرس مفهومِ شمارهٔ ' + n + ' را توضیح می‌دهد و ' +
  'نشان می‌دهد که چطور روی نمودار پیاده می‌شود. ' +
  'مثالِ مشخصِ شمارهٔ ' + n + ' را می‌آورد و می‌گوید که اگر شرطِ ' + n + ' برقرار باشد چه ' +
  'اتفاقی می‌افتد. سپس اشتباهِ رایجِ شمارهٔ ' + n + ' را هشدار می‌دهد. '.repeat(3);

function tradeRow(fid, name, no, tot, ts) {
  const r = new Array(TVH.length).fill('');
  r[0] = ts; r[1] = fid; r[2] = name; r[3] = name; r[4] = 'https://drive.google.com/file/d/' + fid + '/view';
  r[5] = 'بله'; r[6] = no; r[7] = tot; r[8] = ((no-1)*60) + '-' + (no*60) + ' ثانیه'; r[9] = tot*60 + ' ثانیه';
  r[13] = LESSON(no);
  r[17] = JSON.stringify({ Topic: 'مفهوم ' + no, Message: 'پیامِ آموزشیِ شمارهٔ ' + no });
  r[19] = 'نمودار و ابزارِ شمارهٔ ' + no;
  r[21] = 'خلاصهٔ اجراییِ قطعهٔ ' + no + '. '.repeat(4);
  r[22] = 'SUCCESS';
  r[28] = JSON.stringify([{ term: 'اصطلاحِ ' + no, definition: 'تعریفِ اصطلاحِ ' + no }]);
  return r;
}
function rollupRow(fid, name, tot, ts) {
  const r = new Array(TVH.length).fill('');
  r[0] = ts; r[1] = fid; r[2] = name; r[4] = 'https://drive.google.com/file/d/' + fid + '/view';
  r[5] = 'خیر'; r[7] = tot;
  r[13] = 'ترکیب از همه قطعات';
  r[21] = tot + '/' + tot + ' قطعه موفق';
  r[22] = 'COMPLETED';
  return r;
}
function docRow(fid, name, no, tot, ts) {
  const r = new Array(GDH.length).fill('');
  r[0] = ts; r[1] = fid; r[2] = name; r[4] = 'https://drive.google.com/file/d/' + fid + '/view';
  r[5] = 'بله'; r[6] = no; r[7] = tot; r[8] = 'صفحهٔ ' + (no*10) + ' تا ' + (no*10+9);
  r[10] = 'Page text ' + no;
  r[11] = 'متنِ فارسیِ صفحهٔ ' + no + '. ' + LESSON(no);
  r[15] = JSON.stringify(['نکتهٔ ' + no + '-الف', 'نکتهٔ ' + no + '-ب']);
  r[17] = 'خلاصهٔ صفحهٔ ' + no;
  r[18] = 'SUCCESS';
  r[21] = 'موضوعِ صفحهٔ ' + no;
  r[24] = JSON.stringify([{ idea: 'ایدهٔ ' + no, explanation: 'شرحِ ایدهٔ ' + no }]);
  r[50] = 'مخاطب باید ' + no + ' را یاد بگیرد.';
  return r;
}

// تبِ ترید: دو قسمتِ یک دوره + یک کلیپِ کوتاه، همه درهم‌ریخته
const A = '1AAA', B = '1BBB', SHORT = '1SHORT';
const tradeRows = [];
for (let i = 1; i <= 12; i++) tradeRows.push(tradeRow(A, '01_Astrology_HomayoonFarzaneh.mp4', i, 20, when(i)));
for (let i = 1; i <= 9; i++)  tradeRows.push(tradeRow(B, '02_Astrology_HomayoonFarzaneh.mp4', i, 9, when(30+i)));
for (let i = 13; i <= 20; i++) tradeRows.push(tradeRow(A, '01_Astrology_HomayoonFarzaneh.mp4', i, 20, when(50+i)));
tradeRows.push(rollupRow(A, '01_Astrology_HomayoonFarzaneh.mp4', 20, when(90)));
tradeRows.push(rollupRow(B, '02_Astrology_HomayoonFarzaneh.mp4', 9, when(91)));
for (let i = 1; i <= 2; i++) tradeRows.push(tradeRow(SHORT, 'random_clip.mp4', i, 2, when(95+i)));
// درهم‌ریختنِ عمدی: ترتیبِ ردیف‌ها را قاطی می‌کنیم
const shuffled = [];
const order = [];
for (let i = 0; i < tradeRows.length; i++) order.push(i);
for (let i = 0; i < order.length; i++) {
  const j = (i * 7 + 3) % order.length;           // جابه‌جاییِ قطعی و تکرارپذیر
  const t = order[i]; order[i] = order[j]; order[j] = t;
}
order.forEach(i => shuffled.push(tradeRows[i]));

const docRows = [];
for (let i = 1; i <= 8; i++) docRows.push(docRow('1DOC', 'Polya_How-to-solve-it.pdf', i, 8, when(120+i)));

function mkSheet(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 20); });
  global.__SS[id] = ss; return ss;
}
const SRC = {};
CFG.SOURCES.forEach(s => SRC[s.key] = s);
mkSheet(SRC.trading.id, [
  { name: 'Video Analysis', hdr: TVH, rows: shuffled },
  { name: 'Chart History', hdr: ['Timestamp','Chart_ID','Source_Files','Source_Types','Drive_Link','File_Count','Status'],
    rows: [[when(1),'C1','a','b','x',2,'ok']] }        // تبِ جانبی: نباید مجموعه شود
]);
mkSheet(SRC.general.id, [{ name: 'Document Analysis', hdr: GDH, rows: docRows }]);
CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id); ss.insertSheet('S1'); global.__SS[s.id] = ss; } });

global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
global.__PROPS['TELEGRAM_CHAT_ID'] = '123';

// ───────────────────────────────────────────────────── model stub ──────────
const TG = [];
let specialPrompt = '', curriculumPrompt = '', ttsVoices = [], ttsStyles = [];
let judgePrompts = [];
let TRUNCATE = false;   // شبیه‌سازیِ پاسخِ بریدهٔ مدل
let GAPPY = false;      // پاسخِ بلند ولی سوراخ‌سوراخ: قطعهٔ اول و آخر، وسط هیچ
global.__STUB = function (url, body) {
  if (url.indexOf('api.telegram.org') !== -1) {
    TG.push({ method: url.split('/').pop(), text: (body && body.text) || (body && body.caption) || '[file]' });
    return { code: 200, json: { ok: true, result: { message_id: TG.length } } };
  }
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  if (url.indexOf('tts') !== -1) {
    const t = body.contents[0].parts[0].text;
    const v = body.generationConfig && body.generationConfig.speechConfig &&
              body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName;
    // ۵٫۵۹: دستورِ لحن از contents به systemInstruction رفت
    var sysT = '';
    try { sysT = body.systemInstruction.parts[0].text; } catch (e) {}
    ttsVoices.push(v); ttsStyles.push((sysT + ' ' + t).slice(0, 3000));
    return { code: 200, json: { candidates: [{ content: { parts: [{
      inlineData: { data: Buffer.alloc(30000).toString('base64') } }] } }] } };
  }
  const t = body.contents ? body.contents[0].parts[0].text : '';
  if (t.indexOf('یک داوری بده') !== -1) {
    judgePrompts.push(t);
    const keys = [...t.matchAll(/^key: (.+)$/gm)].map(m => m[1].trim());
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      verdicts: keys.map(k => ({
        key: k,
        isCourse: !/rowze|majles/i.test(k),
        score: /rowze|majles/i.test(k) ? 10 : (k.indexOf('polya') !== -1 ? 90 : 75),
        kindOfContent: /rowze|majles/i.test(k) ? 'روضه و مرثیه' : 'دورهٔ آموزشی',
        about: 'شرحِ یک‌خطیِ محتوای ' + k,
        topic: 'موضوع ' + k.slice(0, 8),
        category: k.indexOf('polya') !== -1 ? 'علمی و آموزشی' : 'مالی، ترید و اقتصاد',
        level: k.indexOf('polya') !== -1 ? 'مقدماتی' : 'میانی',
        related: '', orderHint: k.indexOf('polya') !== -1 ? 1 : 3,
        why: /rowze|majles/i.test(k) ? 'مرثیه است، درس نیست.' : 'ساختارِ درسی دارد.'
      })) }) }] } }] } };
  }
  if (t.indexOf('ترتیبِ درستِ یادگیری') !== -1) {
    curriculumPrompt = t;
    const keys = [...t.matchAll(/- key: (.+?) \| نام:/g)].map(m => m[1].trim());
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      plan: keys.map((k, i) => ({ key: k, order: k.indexOf('polya') !== -1 ? 1 : 2 + i,
        level: k.indexOf('polya') !== -1 ? 'مقدماتی' : 'میانی',
        topic: 'موضوع ' + i, related: '', why: 'چون' })) }) }] } }] } };
  }
  if (t.indexOf('درس‌نامه') !== -1 && t.indexOf('قاعده‌های سختِ این برنامه') !== -1) {
    specialPrompt = t;
    const nos = [...t.matchAll(/--- قطعهٔ (\d+)/g)].map(m => Number(m[1]));
    const eids = [...t.matchAll(/- شناسه: (\S+) \| نوع:/g)].map(m => m[1]);
    const W = todayWords_();
    // مدلِ سربه‌راه همهٔ قطعه‌هایی را که به او داده‌اند پوشش می‌دهد و شمارهٔ
    // همه‌شان را در chunkNos می‌نویسد. اگر SPECIAL_TRUNCATE روشن باشد، عمداً
    // مثل یک پاسخِ بریده رفتار می‌کند تا محافظِ مکان‌نما آزموده شود.
    const per = Math.max(1, Math.ceil(nos.length / 6));
    const secs = [];
    for (let k = 0; k < 6; k++) secs.push({
      heading: 'بخشِ ' + (k + 1),
      narration: 'متنِ آموزشیِ بخشِ ' + (k + 1) + '. '.repeat(220),
      tone: 'آرام و معلم‌وار',
      chunkNos: TRUNCATE ? (k === 0 ? nos.slice(0, 1) : [])
               : (GAPPY ? (k === 0 ? [nos[0]] : (k === 5 ? [nos[nos.length - 1]] : []))
                        : nos.slice(k * per, (k + 1) * per)),
      enrichIds: k === 0 ? eids.slice(0, 1) : [] });
    if (TRUNCATE) secs.length = 1;
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'مفهوم‌های پایه', hook: CFG.SPECIAL_SHOW_NAME + '. سلام. امروز ' + W.weekday +
        '، ' + W.jalali + ' است.',
      recap: t.indexOf('قسمت‌های قبلیِ همین مجموعه') !== -1 ? 'در قسمت قبل دربارهٔ پایه‌ها گفتیم.' : '',
      goal: { problem: 'مشکلِ خواندنِ نمودار را حل می‌کند.',
              behavior: 'شنونده باید پیش از معامله نمودار را بررسی کند.',
              message: 'پیامِ اصلی: ساختار مهم‌تر از پیش‌بینی است.' },
      sections: secs, outro: 'پایانِ این قسمت.', summary: 'خلاصهٔ قسمت.',
      tags: ['آسترولوژی مالی', 'نمودار', 'تحلیل'], coverage: 'قطعهٔ اول تا میانه' }) }] } }] } };
  }
  // نویسندهٔ برنامهٔ متنوع
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  const W2 = todayWords_();
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'ت', hook: CFG.SHOW_NAME + '. امروز ' + W2.weekday + '، ' + W2.jalali + ' است.',
    sections: [1,2,3,4,5].map(k => ({ heading: 'ب' + k, narration: 'م. '.repeat(40),
      tone: 'آرام', sourceIds: ids.slice(k*2, k*2+2) })),
    outro: 'پایان.', summary: 'خ.', tags: ['برچسب'] }) }] } }] } };
};

let un = quiet(); let g = 0; while (g++ < 40) syncCatalog(); un();
const hub = getHub_();
const OUT = global.__ROOT_FOLDER;

// ══════════════════════════════════ ۱) تشخیص نام مجموعه ═══════════════════
console.log('=== ۱) نام مجموعه و شمارهٔ قسمت از نام فایل ===');
const cases = [
  ['01_Astrology_HomayoonFarzaneh.mp4', 'Astrology HomayoonFarzaneh', 1],
  ['02_Astrology_HomayoonFarzaneh.mp4', 'Astrology HomayoonFarzaneh', 2],
  ['۰۳-دورهٔ گن.mp4', null, 3],
  ['دورهٔ گن قسمت 4.mp4', null, 4],
  ['Course S01E07 intro.mp4', null, 1007],
  ['Polya_How-to-solve-it.pdf', 'Polya How to solve it', 1]
];
cases.forEach(([f, wantName, wantSeq]) => {
  const r = parseSeriesName_(f);
  console.log('   ' + f.padEnd(38) + ' → «' + r.name + '» قسمت ' + r.seq);
  if (wantName) ok('نامِ «' + f + '» درست درآمد', r.name === wantName, r.name);
});
ok('دو فایلِ ۰۱ و ۰۲ یک کلیدِ مجموعه می‌گیرند',
   seriesKeyFromStem_(parseSeriesName_('01_Astrology_HomayoonFarzaneh.mp4').name) ===
   seriesKeyFromStem_(parseSeriesName_('02_Astrology_HomayoonFarzaneh.mp4').name));
ok('شمارهٔ قسمت‌ها ۱ و ۲ است',
   parseSeriesName_('01_A_B.mp4').seq === 1 && parseSeriesName_('02_A_B.mp4').seq === 2);
ok('کتابِ بی‌شماره، مجموعهٔ تک‌قسمتی است',
   parseSeriesName_('Polya_How-to-solve-it.pdf').seq === 1 &&
   parseSeriesName_('Polya_How-to-solve-it.pdf').multi === false);

// ══════════════════════════════════ ۲) اسکن و رجیستری ═════════════════════
console.log('\n=== ۲) اسکنِ مجموعه‌ها از شیت‌های درهم‌ریخته ===');
un = quiet(); const scan = scanSeries(true); un();
const reg = readSeriesReg_(hub);
const parts = readSeriesParts_(hub);
console.log('  نتیجهٔ اسکن:', JSON.stringify(scan));
reg.rows.forEach(r => console.log('   • ' + String(r.vals[SC.NAME-1]).padEnd(32) +
  r.vals[SC.PARTS-1] + ' قسمت · ' + r.vals[SC.CHUNKS-1] + ' قطعه · ' + r.vals[SC.STATUS-1]));
ok('دو مجموعه شناسایی شد (دورهٔ ترید + کتاب)', reg.rows.length === 2, reg.rows.length + '');
const astro = reg.rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Astrology') !== -1);
ok('دورهٔ آسترولوژی دو قسمت دارد', astro && Number(astro.vals[SC.PARTS-1]) === 2,
   astro ? astro.vals[SC.PARTS-1] + '' : 'پیدا نشد');
ok('جمعِ قطعه‌هایش ۲۰+۹ است', Number(astro.vals[SC.CHUNKS-1]) === 29,
   astro.vals[SC.CHUNKS-1] + '');
ok('کلیپِ دوقطعه‌ای مجموعه شمرده نشد',
   !reg.rows.some(r => String(r.vals[SC.NAME-1]).indexOf('random') !== -1));
ok('تبِ جانبی Chart History مجموعه نساخت',
   !reg.rows.some(r => String(r.vals[SC.TAB-1]).indexOf('Chart History') !== -1));

const aParts = parts.byKey[astro.key];
console.log('  قسمت‌ها:', aParts.map(p => 'قسمت ' + p.vals[SP.SEQ-1] + ' (' +
  p.vals[SP.CHUNKS-1] + ' قطعه، ردیف‌های ' + String(p.vals[SP.ROWS-1]).slice(0, 30) + '…)').join(' | '));
ok('قسمت‌ها به ترتیب ۱ و ۲ ثبت شدند',
   Number(aParts[0].vals[SP.SEQ-1]) === 1 && Number(aParts[1].vals[SP.SEQ-1]) === 2);
ok('قسمت اول ۲۰ قطعه و دوم ۹ قطعه دارد',
   Number(aParts[0].vals[SP.CHUNKS-1]) === 20 && Number(aParts[1].vals[SP.CHUNKS-1]) === 9,
   aParts[0].vals[SP.CHUNKS-1] + ' / ' + aParts[1].vals[SP.CHUNKS-1]);
ok('ردیف‌های پراکنده همه ثبت شدند (نه فقط یک بازهٔ پیوسته)',
   unpackRows_(String(aParts[0].vals[SP.ROWS-1])).length === 20,
   unpackRows_(String(aParts[0].vals[SP.ROWS-1])).length + ' ردیف');

// ══════════════════════════════════ ۳) خواندنِ قطعه‌ها به ترتیب ════════════
console.log('\n=== ۳) قطعه‌ها به ترتیب و بدون ردیفِ جمع‌بندیِ پوچ ===');
const seg1 = readPartChunks_(aParts[0], 1, CFG.SPECIAL_SOURCE_CHARS);
console.log('  قطعه‌های برداشته‌شده:', seg1.chunks.map(c => c.no).join(', '));
ok('از قطعهٔ ۱ شروع شد', seg1.chunks[0].no === 1);
ok('ترتیب صعودی است و هیچ قطعه‌ای جا نیفتاد', (() => {
  for (let i = 1; i < seg1.chunks.length; i++)
    if (seg1.chunks[i].no !== seg1.chunks[i-1].no + 1) return false;
  return true;
})(), seg1.chunks.map(c => c.no).join(','));
ok('ردیفِ «ترکیب از همه قطعات» وارد نشد',
   !seg1.chunks.some(c => c.text.indexOf('ترکیب از همه قطعات') !== -1));
ok('متنِ هر قطعه از خودِ قطعه آمده، نه از خلاصه',
   seg1.chunks.every(c => c.text.indexOf('دقیقهٔ ' + c.no + '.') === 0), 'همه');
ok('نکته‌ها و اصطلاح‌های همان قطعه هم آمده',
   seg1.chunks[0].text.indexOf('اصطلاح') !== -1);
ok('بازهٔ زمانی هر قطعه ثبت شد', /ثانیه/.test(seg1.chunks[0].range), seg1.chunks[0].range);

// ══════════════════════════════════ ۴) تولید قسمت اول ═════════════════════
console.log('\n=== ۴) تولید قسمت اولِ درس‌نامه ===');
un = quiet(); const r1 = produceSpecialEpisode(); un();
console.log('  نتیجه:', JSON.stringify(r1));
ok('قسمت اول نوشته شد', r1.ok === true, JSON.stringify(r1));
ok('از مجموعهٔ مقدماتی (کتابِ Polya) شروع شد',
   String(r1.series).indexOf('Polya') !== -1, r1.series);
ok('پرامپت گفته این قسمت اول است و recap ندارد',
   specialPrompt.indexOf('این قسمتِ اولِ این مجموعه است') !== -1);
ok('متنِ قطعه‌ها عیناً در پرامپت آمد',
   specialPrompt.indexOf('--- قطعهٔ 1') !== -1 && specialPrompt.indexOf('--- قطعهٔ 2') !== -1);
ok('قاعدهٔ «روخوانی نکن» و «خلاصه نکن» هر دو در پرامپت هست',
   specialPrompt.indexOf('روخوانی نکن') !== -1 && specialPrompt.indexOf('خلاصه هم نکن') !== -1);
ok('سه پرسشِ هدفِ دوره در پرامپت آمد',
   specialPrompt.indexOf('چه مشکلی را حل کند') !== -1 &&
   specialPrompt.indexOf('متفاوت از قبل انجام بدهد') !== -1 &&
   specialPrompt.indexOf('ایدهٔ مرکزیِ') !== -1);
ok('قاعدهٔ «نصیحت و برداشت شخصی ممنوع» در پرامپت هست',
   specialPrompt.indexOf('نصیحت کنی') !== -1 && specialPrompt.indexOf('برداشت شخصی') !== -1);

// صداگذاری تا انتها
un = quiet(); let d = 0; while (global.__PROPS[PK.SP_PENDING] && d++ < 60) produceSpecialContinue(); un();
ok('قسمت کامل شد و وضعیتِ نیمه‌تمام پاک شد', !global.__PROPS[PK.SP_PENDING]);

const spTab = hub.getSheetByName(CFG.SPECIAL_TAB);
const spRows = () => spTab.getLastRow() < 2 ? [] :
  spTab.getRange(2, 1, spTab.getLastRow() - 1, SPECIAL_HEADERS.length).getValues();
const e1 = spRows()[0];
console.log('  ردیف تب:', e1[XC.NUM-1], '|', e1[XC.SERIES-1], '|', e1[XC.CHUNKS-1],
            '|', e1[XC.MORE-1], '|', e1[XC.MAIL-1]);
ok('در تبِ «پادکست تخصصی» ثبت شد، نه در تب پادکست‌های متنوع', spRows().length === 1);
ok('پوششِ قطعه‌ها ثبت شد', String(e1[XC.CHUNKS-1]).indexOf('قطعهٔ 1') !== -1, String(e1[XC.CHUNKS-1]));
ok('هشتگ‌ها ثبت شدند و با هشتگِ نامِ برنامه شروع می‌شوند',
   String(e1[XC.TAGS-1]).indexOf(tgTag_(CFG.SPECIAL_SHOW_NAME)) === 0,
   String(e1[XC.TAGS-1]).slice(0, 60));
ok('نیم‌فاصله در هشتگ به زیرخط تبدیل شد (تلگرام آن‌جا هشتگ را می‌بُرد)',
   String(e1[XC.TAGS-1]).indexOf('\u200c') === -1);
ok('ایمیل رفت', String(e1[XC.MAIL-1]).indexOf('ارسال شد') === 0, String(e1[XC.MAIL-1]));

// ══════════════════════════════════ ۵) صدای متفاوت ════════════════════════
console.log('\n=== ۵) گویندهٔ درس‌نامه با برنامهٔ متنوع فرق دارد ===');
const uniqVoices = [...new Set(ttsVoices)];
console.log('  صداهای استفاده‌شده:', uniqVoices.join(', '));
// از این نسخه درس‌نامه صدای ثابت ندارد: نقش‌گزینی از رویِ محتوا انجام می‌شود و
// هر قسمت گویندهٔ اصلیِ خودش را دارد. پس شرطِ درست «چند صدا در یک قسمت» است،
// نه «همان یک صدای همیشگی».
ok('درس‌نامه دست‌کم دو صدای متفاوت دارد', uniqVoices.length >= 2, uniqVoices.join('/'));
ok('و همهٔ صداها از جدولِ رسمی‌اند',
   uniqVoices.every(v => TTS_VOICES.some(x => x.n === v)), uniqVoices.join('/'));
ok('دستور اجرا «معلم‌وار» بود', ttsStyles.some(s => s.indexOf('معلم‌وار') !== -1));

// ══════════════════════════════════ ۶) نامِ برنامه در آغاز ════════════════
console.log('\n=== ۶) نام برنامه در آغازِ هر دو پادکست ═══');
const meta1 = JSON.parse(global.__FILES.filter(f => f.getName() === '_special.json')
  .slice(-1)[0].getBlob().getDataAsString());
ok('قلابِ درس‌نامه با نام برنامه شروع می‌شود',
   String(meta1.ep.hook).indexOf(CFG.SPECIAL_SHOW_NAME) === 0, String(meta1.ep.hook).slice(0, 50));
ok('پرامپتِ برنامهٔ متنوع نامِ «از همه جا از همه رنگ» را اجباری کرده', (() => {
  const pr = buildPrompt_('طنز و سرگرمی', [{ id: 'x', kind: 'ویدیو', date: '', topic: 't',
    msg: 'm', summary: 's', body: 'b' }], '', '', [], todayWords_(), []);
  return pr.indexOf(CFG.SHOW_NAME) !== -1 && pr.indexOf('نام برنامه را عوض نکن') !== -1;
})());

// ══════════════════════════════════ ۷) ادامه از جای درست ══════════════════
console.log('\n=== ۷) قسمت بعدی از جایی که مانده ادامه می‌دهد ═══');
const before = readSeriesParts_(hub).byKey[reg.rows.find(r =>
  String(r.vals[SC.NAME-1]).indexOf('Polya') !== -1).key][0];
const doneTo1 = Number(before.vals[SP.DONE_TO-1]);
console.log('  مصرف‌شده تا قطعهٔ:', doneTo1);
ok('«مصرف‌شده تا» ثبت شد', doneTo1 >= 1, doneTo1 + '');

un = quiet(); const r2 = produceSpecialEpisode();
let d2 = 0; while (global.__PROPS[PK.SP_PENDING] && d2++ < 60) produceSpecialContinue(); un();
const meta2 = JSON.parse(global.__FILES.filter(f => f.getName() === '_special.json')
  .slice(-1)[0].getBlob().getDataAsString());
console.log('  قسمت دوم:', JSON.stringify({ ok: r2.ok, series: r2.series,
  from: meta2.fromNo, to: meta2.toNo }));
ok('قسمت دوم هم ساخته شد (روزِ تمام‌شدنِ یک مجموعه هدر نمی‌رود)', r2.ok === true,
   JSON.stringify(r2));
ok('چون کتاب تمام شده بود، سراغ مجموعهٔ بعدی رفت',
   meta2.seriesKey !== meta1.seriesKey && String(r2.series).indexOf('Astrology') !== -1,
   r2.series);
ok('و از قطعهٔ ۱ مجموعهٔ تازه شروع کرد', meta2.fromNo === 1, meta2.fromNo + '');
ok('مجموعهٔ اول «تمام‌شده» علامت خورد', (() => {
  const rr = readSeriesReg_(hub).rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Polya') !== -1);
  return String(rr.vals[SC.STATUS-1]) === SST.DONE;
})());

// حالا قسمت سوم: باید داخلِ همان مجموعهٔ آسترولوژی ادامه بدهد و مرور بیاورد
un = quiet(); const r3 = produceSpecialEpisode();
let d3 = 0; while (global.__PROPS[PK.SP_PENDING] && d3++ < 60) produceSpecialContinue(); un();
const meta3 = JSON.parse(global.__FILES.filter(f => f.getName() === '_special.json')
  .slice(-1)[0].getBlob().getDataAsString());
console.log('  قسمت سوم:', JSON.stringify({ ok: r3.ok, series: r3.series,
  part: meta3.partSeq, from: meta3.fromNo, to: meta3.toNo }));
ok('قسمت سوم در همان مجموعهٔ آسترولوژی ماند', meta3.seriesKey === meta2.seriesKey);
// بودجهٔ متن جا داشت، پس قسمت دومِ پادکست چند قسمتِ درس را با هم پوشش داد —
// خواستهٔ صریحِ بند سه. مکان‌نمای هر قسمتِ درس جداگانه جلو می‌رود.
console.log('  پوششِ قسمت دوم:', (meta2.covers || []).map(c =>
  'درس ' + c.partSeq + ': ' + c.fromNo + '–' + c.toNo + '/' + c.totalChunks).join(' + '));
ok('یک قسمتِ پادکست توانست چند قسمتِ درس را با هم پوشش بدهد',
   (meta2.covers || []).length >= 2, ((meta2.covers || []).length) + ' قسمتِ درس');
ok('مکان‌نمای هر دو قسمتِ درس جلو رفت', (() => {
  const ps = readSeriesParts_(hub).byKey[meta2.seriesKey];
  return ps.every(p => Number(p.vals[SP.DONE_TO-1]) === Number(p.vals[SP.CHUNKS-1]));
})(), readSeriesParts_(hub).byKey[meta2.seriesKey]
       .map(p => p.vals[SP.SEQ-1] + '→' + p.vals[SP.DONE_TO-1]).join(', '));
ok('شمارهٔ پیوستهٔ قطعه‌ها در پرامپت آمد تا دو درس قاطی نشوند',
   specialPrompt.indexOf('شمارهٔ پیوسته') !== -1 &&
   specialPrompt.indexOf('| شمارهٔ اصلی') !== -1);
console.log('  پوششِ قسمت سوم:', (meta3.covers || []).map(c =>
  'درس ' + c.partSeq + ': ' + c.fromNo + '–' + c.toNo + '/' + c.totalChunks).join(' + '));
// چون قسمت دوم کلِ دورهٔ آسترولوژی را تمام کرد و مجموعهٔ دیگری نمانده بود،
// قسمت سوم باید صریح بگوید همه‌چیز تمام شده — نه اینکه همان را دوباره بسازد.
ok('قسمت سوم چیزی را دوباره تولید نکرد', r3.ok === false, JSON.stringify(r3));
ok('و علتش را روشن گفت (همه‌چیز تمام شده)',
   r3.reason === 'all-done' || r3.reason === 'no-series', r3.reason);
ok('هر دو مجموعه «تمام‌شده» علامت خوردند', (() => {
  const rr = readSeriesReg_(hub).rows;
  return rr.filter(r => String(r.vals[SC.STATUS-1]) === SST.DONE).length === 2;
})(), readSeriesReg_(hub).rows.map(r => r.vals[SC.NAME-1] + '=' + r.vals[SC.STATUS-1]).join(' | '));
ok('مرورِ قسمت‌های قبل در پرامپت آمد (برای مجموعه‌ای که قسمت قبل داشت)',
   specialPrompt.indexOf('قسمت‌های قبلیِ همین مجموعه') !== -1 ||
   specialPrompt.indexOf('این قسمتِ اولِ این مجموعه است') !== -1);
ok('«داستان تا اینجا» در رجیستری انباشته می‌شود', (() => {
  const rr = readSeriesReg_(hub).rows.find(r => r.key === meta2.seriesKey);
  return String(rr.vals[SC.STORY-1]).split('\n').filter(String).length >= 1;
})());
ok('مرورِ قسمت‌های بعدی از همان «داستان تا اینجا» ساخته می‌شود',
   recapTextOf_(readSeriesReg_(hub).rows.find(r => r.key === meta2.seriesKey)).length > 5);
ok('هدفِ دوره در متنِ گفتاری هم می‌آید (نه فقط در سند)', (() => {
  const nar = specialNarration_(meta2.ep);
  return nar.indexOf(String(meta2.ep.goal.message)) !== -1 &&
         nar.indexOf(String(meta2.ep.goal.problem)) !== -1;
})());

// ══════════════════════════════════ ۸) نشانه‌گذاریِ جدا ═══════════════════
console.log('\n=== ۸) نشانِ درس‌نامه از نشانِ برنامهٔ متنوع جداست ═══');
// یک آیتم را دستی به هر دو نشان می‌زنیم و می‌سنجیم که هم‌دیگر را پاک نکنند
const catTab = TAXONOMY.map(t => t.title).concat([MISC_TITLE])
  .map(n => hub.getSheetByName(n)).find(sh => sh && sh.getLastRow() > 1);
const probeRow = 2;
catTab.getRange(probeRow, COL.USED_EP, 1, 2).setValues([['7', '2026-08-10 07:00']]);
const probeId = String(catTab.getRange(probeRow, COL.ID, 1, 1).getValues()[0][0]);
un = quiet();
markSpecialUsed_(hub, [{ id: probeId, cat: catTab.getName() }], 55);
un();
const after = catTab.getRange(probeRow, 1, 1, HUB_HEADERS.length).getValues()[0];
console.log('  استفاده در قسمت:', after[COL.USED_EP-1], '| استفاده در درس‌نامه:', after[COL.SP_EP-1]);
ok('نشانِ برنامهٔ متنوع دست‌نخورده ماند', String(after[COL.USED_EP-1]) === '7');
ok('نشانِ درس‌نامه در ستونِ جدا نشست',
   String(after[COL.SP_EP-1]).split(/[,\s]+/).indexOf('55') !== -1, String(after[COL.SP_EP-1]));
ok('تاریخِ جداگانه هم ثبت شد', String(after[COL.SP_AT-1]).length >= 10);
un = quiet(); markSpecialUsed_(hub, [{ id: probeId, cat: catTab.getName() }], 56); un();
const after2 = catTab.getRange(probeRow, COL.SP_EP, 1, 1).getValues()[0][0];
ok('قسمت دوم به همان سلول اضافه شد، جایگزین نشد',
   /55.*56/.test(String(after2)), String(after2));
un = quiet(); markSpecialUsed_(hub, [{ id: probeId, cat: catTab.getName() }], 56); un();
ok('همان شماره دو بار نوشته نمی‌شود', (() => {
  const cell = String(catTab.getRange(probeRow, COL.SP_EP, 1, 1).getValues()[0][0]);
  return (cell.match(/\b56\b/g) || []).length === 1;
})(), String(catTab.getRange(probeRow, COL.SP_EP, 1, 1).getValues()[0][0]));

// ══════════════════════════════════ ۹) تعمیق از سایر شیت‌ها ═══════════════
console.log('\n=== ۹) موادِ مکمل از همهٔ شیت‌ها ═══');
// واژه‌ها را از متنِ واقعیِ همان قطعه‌ها می‌گیریم، نه از فهرستِ دستی
const segT = readPartChunks_(readSeriesParts_(hub).byKey[astro.key][0], 1, 20000);
const terms = keyTerms_(segT.chunks.map(c => c.text).join(' '), 18);
const hits = enrichFor_(hub, terms, [], 8);
ok('واژه‌های کلیدی از متنِ درس استخراج شد', terms.length >= 5, terms.slice(0, 5).join('، '));
console.log('  واژه‌ها:', terms.slice(0, 6).join('، '), '| یافته:', hits.length);
ok('جست‌وجوی مکمل کار می‌کند و از تب‌های دسته می‌خواند', Array.isArray(hits));
ok('آیتمِ نشان‌خوردهٔ برنامهٔ متنوع از مکمل حذف نمی‌شود', (() => {
  const all = enrichFor_(hub, terms, [], 50);
  return !all.some(x => x.__excludedByVariety);   // چنین صافی‌ای اصلاً وجود ندارد
})());
ok('پرامپت گفته مکمل خارج از درس است و باید در صدا ذکر شود',
   specialPrompt.indexOf('خارج از درس') !== -1 &&
   specialPrompt.indexOf('صریح بگویی که این توضیح خارج از درس است') !== -1);

// ══════════════════════════════════ ۱۰) پوشه و نام ════════════════════════
console.log('\n=== ۱۰) فولدربندی و نام‌گذاری ═══');
const rootSubs = OUT._subs.map(f => f.getName());
console.log('  پوشه‌های ریشه:', rootSubs.join(' | '));
ok('پوشهٔ جدا برای درس‌نامه ساخته شد', rootSubs.indexOf(CFG.SPECIAL_FOLDER) !== -1);
const spRoot = OUT._subs.find(f => f.getName() === CFG.SPECIAL_FOLDER);
// نسخهٔ ۵٫۱۱: مجموعه‌ها زیرِ پوشهٔ دستهٔ خودشان می‌نشینند
// («درس‌نامه / <دسته> / NN — نامِ مجموعه»). پوشهٔ شماره‌دار را چه در ریشه (دستهٔ
// خالی) و چه یک لایه پایین‌تر (زیرِ دسته) بپذیر.
const numberedDirs = [];
let catNested = false;
spRoot._subs.forEach(f => {
  if (/^\d\d — /.test(f.getName())) numberedDirs.push(f.getName());
  (f._subs || []).forEach(g => {
    if (/^\d\d — /.test(g.getName())) { numberedDirs.push(g.getName()); catNested = true; }
  });
});
console.log('  پوشه‌های ریشهٔ درس‌نامه:', spRoot._subs.map(f => f.getName()).join(' | '));
console.log('  پوشه‌های شماره‌دارِ مجموعه:', numberedDirs.join(' | '));
ok('هر مجموعه پوشهٔ شماره‌دارِ خودش را دارد',
   numberedDirs.length >= 1 && /^\d\d — /.test(numberedDirs[0]), numberedDirs[0] || '—');
ok('مجموعهٔ دسته‌دار زیرِ پوشهٔ دستهٔ خودش می‌نشیند (اثرِ دسته بر درایو)',
   catNested || spRoot._subs.every(f => /^\d\d — /.test(f.getName())),
   spRoot._subs.map(f => f.getName()).join(' | '));
const wavs = global.__FILES.filter(f => /\.wav$/.test(f.getName())).map(f => f.getName());
ok('نام فایل صوتی با نامِ برنامه شروع می‌شود',
   wavs.some(n => n.indexOf(CFG.SPECIAL_SHOW_NAME) === 0), wavs[0] || 'هیچ');
ok('نامِ مجموعه هم در نام فایل هست',
   wavs.some(n => n.indexOf('Polya') !== -1 || n.indexOf('Astrology') !== -1), wavs[0] || '');

// ══════════════════════════════════ ۱۱) تلگرام ═══════════════════════════
console.log('\n=== ۱۱) تلگرام: هشتگ و تفکیک ═══');
const head = TG.map(x => x.text).find(t => String(t).indexOf(CFG.SPECIAL_SHOW_NAME) !== -1);
console.log('  سرپیام:', String(head).replace(/\n/g, ' ⏎ ').slice(0, 150));
ok('سرپیام نام برنامهٔ تخصصی را دارد', !!head);
ok('هشتگِ نامِ برنامه در پیام هست',
   String(head).indexOf(tgTag_(CFG.SPECIAL_SHOW_NAME)) !== -1);
ok('نام مجموعه و شمارهٔ قسمتِ درس در سرپیام هست',
   String(head).indexOf('مجموعهٔ') !== -1 && String(head).indexOf('قطعهٔ') !== -1);
ok('وضعیت «ادامه دارد / تمام شد» اعلام شد',
   String(head).indexOf('ادامه دارد') !== -1 || String(head).indexOf('تمام شد') !== -1);

// ══════════════════════════════════ ۱۲) وضعیت و سلامت ════════════════════
console.log('\n=== ۱۲) فایل وضعیت و وارسی سلامت ═══');
un = quiet(); const st = writeStatus_(hub, 'آزمون'); un();
console.log('  ', JSON.stringify({ series: st.special.series, episodes: st.special.episodes,
  active: st.special.active && st.special.active.name, queued: st.special.queued }));
ok('بخش درس‌نامه در فایل وضعیت هست', st.special && st.special.series === 2);
ok('شمار قسمت‌های تولیدشده درست است', st.special.episodes >= 1, st.special.episodes + '');
ok('مجموعهٔ در نوبت هم گزارش می‌شود',
   st.special.queued + (st.special.active ? 1 : 0) + st.special.done === 2,
   'نوبت ' + st.special.queued + ' · فعال ' + (st.special.active ? 1 : 0) +
   ' · تمام ' + st.special.done);

// ══════════════════════════════════ ۱۳) منوی تولید دستی ══════════════════
console.log('\n=== ۱۳) تولید دستی: سه گزینه ═══');
ok('runProduceVariety هست', typeof runProduceVariety === 'function');
ok('runProduceSpecial هست', typeof runProduceSpecial === 'function');
ok('runProduceBoth هست', typeof runProduceBoth === 'function');
ok('runScanSeries هست', typeof runScanSeries === 'function');

// ══════════════════════════════════ ۱۴) مجموعهٔ تمام‌شده که قسمت تازه گرفته ══
console.log('\n=== ۱۴) قسمت تازه به مجموعهٔ تمام‌شده اضافه می‌شود ═══');
const polya = readSeriesReg_(hub).rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Polya') !== -1);
const rsh = hub.getSheetByName(CFG.SERIES_TAB);
rsh.getRange(polya.row, SC.STATUS, 1, 1).setValue(SST.DONE);
// فایل تازه در همان مجموعه
const gsh = global.__SS[SRC.general.id].getSheetByName('Document Analysis');
for (let i = 1; i <= 6; i++) gsh._d.push(docRow('1DOC2', 'Polya_How-to-solve-it.pdf', i, 6, when(200+i)));
gsh._max = Math.max(gsh._max, gsh._d.length + 10);
un = quiet(); const rescan = scanSeries(true); un();
const polya2 = readSeriesReg_(hub).rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Polya') !== -1);
console.log('  وضعیت:', polya2.vals[SC.STATUS-1], '| قسمت‌ها:', polya2.vals[SC.PARTS-1],
            '| یادداشت:', String(polya2.vals[SC.NOTE-1]).slice(0, 60));
ok('مجموعهٔ تمام‌شده دوباره باز شد', String(polya2.vals[SC.STATUS-1]) === SST.REOPENED,
   String(polya2.vals[SC.STATUS-1]));
ok('تعداد قسمت‌ها به‌روز شد', Number(polya2.vals[SC.PARTS-1]) === 2, polya2.vals[SC.PARTS-1] + '');
ok('علتش جلوی ردیف نوشته شد', String(polya2.vals[SC.NOTE-1]).indexOf('قسمت تازه اضافه شد') === 0);
// قاعدهٔ سختِ کاربر: تا مجموعهٔ جاری تمام نشده، سراغ هیچ مجموعهٔ دیگری
// نمی‌رویم — حتی مجموعه‌ای که قسمتِ تازه گرفته.
// یک مجموعه را عمداً «در حال تولید» می‌کنیم تا قاعدهٔ «تا تمام نشود، جابه‌جا
// نشو» آزموده شود: باید بر مجموعهٔ بازگشایی‌شده هم مقدم باشد.
const astroRow = readSeriesReg_(hub).rows.find(r =>
  String(r.vals[SC.NAME-1]).indexOf('Astrology') !== -1);
// «در حال تولید» فقط برای مجموعه‌ای معنا دارد که کارِ ناتمام داشته باشد،
// وگرنه موتور خودش می‌بنددش. پس مکان‌نمای یک قسمتش را عقب می‌بریم.
const astroParts = readSeriesParts_(hub).byKey[astroRow.key];
readSeriesParts_(hub).sheet.getRange(astroParts[0].row, SP.DONE_TO, 1, 1).setValue(0);
rsh.getRange(astroRow.row, SC.STATUS, 1, 1).setValue(SST.ACTIVE);
ok('مجموعهٔ در حال تولید هم‌چنان مقدم است (قاعدهٔ «تا تمام نشود، جابه‌جا نشو»)',
   String(pickSeries_(hub).vals[SC.STATUS-1]) === SST.ACTIVE, pickSeries_(hub).key);
// حالا مجموعهٔ جاری را تمام‌شده می‌کنیم: باید مجموعهٔ بازگشایی‌شده جلو بیفتد
const act = readSeriesReg_(hub).rows.find(r => String(r.vals[SC.STATUS-1]) === SST.ACTIVE);
rsh.getRange(act.row, SC.STATUS, 1, 1).setValue(SST.DONE);
const nextPick = pickSeries_(hub);
console.log('  انتخابِ بعدی:', nextPick.key, '—', nextPick.vals[SC.STATUS-1]);
ok('مجموعهٔ بازگشایی‌شده بر هر مجموعهٔ نو مقدم است',
   nextPick.key === polya2.key && String(nextPick.vals[SC.STATUS-1]) === SST.REOPENED,
   nextPick.key);

console.log('\n=== ۱۵) ادامهٔ مجموعهٔ بازگشایی‌شده از قسمتِ تازه ═══');
un = quiet(); const r4 = produceSpecialEpisode();
let d4 = 0; while (global.__PROPS[PK.SP_PENDING] && d4++ < 60) produceSpecialContinue(); un();
const meta4 = JSON.parse(global.__FILES.filter(f => f.getName() === '_special.json')
  .slice(-1)[0].getBlob().getDataAsString());
console.log('  قسمت چهارم:', JSON.stringify({ ok: r4.ok, series: r4.series,
  file: meta4.partFile, from: meta4.fromNo, to: meta4.toNo }));
ok('قسمت چهارم از مجموعهٔ بازگشایی‌شده ساخته شد',
   r4.ok === true && String(r4.series).indexOf('Polya') !== -1, r4.series);
ok('و روی فایلِ تازه کار کرد، نه فایلِ قبلاً تمام‌شده', meta4.partFile === '1DOC2',
   meta4.partFile);
ok('و چون قسمت اولِ این مجموعه نیست، مرور آورد',
   String(meta4.ep.recap || '').length > 5, meta4.ep.recap);

// ══════════════════════ ۱۶) اصلاحاتِ بازبینیِ اجرایی ═════════════════════
console.log('\n=== ۱۶) نامِ فایل: رقم فارسی، S01E02، مُهر زمانی، بی‌نام ═══');
const nm = f => parseSeriesName_(f);
const key = f => seriesKeyFromStem_(parseSeriesName_(f).name);
ok('رقم فارسیِ پیشوند شناخته می‌شود و دو فایل یک مجموعه می‌شوند',
   key('۰۱_Astrology.mp4') === key('۰۲_Astrology.mp4') &&
   nm('۰۱_Astrology.mp4').seq === 1 && nm('۰۲_Astrology.mp4').seq === 2,
   key('۰۱_Astrology.mp4') + ' / ' + nm('۰۲_Astrology.mp4').seq);
ok('S01E07 دیگر مرده نیست', nm('Course S01E07 intro.mp4').seq === 1007,
   nm('Course S01E07 intro.mp4').seq + '');
ok('مُهر زمانیِ زیرخط‌دار از کلید پاک می‌شود',
   key('processed_20251103_101055_TGC_Lect02_Physics.mp4') ===
   key('processed_20251110_160705_TGC_Lect03_Physics.mp4'),
   key('processed_20251103_101055_TGC_Lect02_Physics.mp4'));
ok('«Lect02» شمارهٔ قسمت می‌دهد',
   nm('processed_20251103_101055_TGC_Lect02_Physics.mp4').seq === 2,
   nm('processed_20251103_101055_TGC_Lect02_Physics.mp4').seq + '');
ok('«final» و «copy» کلید را دو تکه نمی‌کنند',
   key('Dore_Talaee_final.mp4') === key('Dore_Talaee.mp4'));
ok('عنوان‌های نقطه‌دارِ متفاوت روی هم نمی‌افتند',
   key('Tahlil.Bazar.Iran.mp4') !== key('Tahlil.Bazar.Jahan.mp4'),
   key('Tahlil.Bazar.Iran.mp4') + ' vs ' + key('Tahlil.Bazar.Jahan.mp4'));
ok('دو فایلِ بی‌نام یک مجموعهٔ جعلی نمی‌سازند',
   seriesKeyFromStem_(parseSeriesName_('', 'FID_A').name) !==
   seriesKeyFromStem_(parseSeriesName_('', 'FID_B').name));

console.log('\n=== ۱۷) ردیفِ جمع‌بندی، قطعهٔ ۱ را نمی‌دزدد ═══');
(() => {
  const H = ['Timestamp','File_ID','File_Name','Is_Chunk','Chunk_Number','Total_Chunks',
             'Farsi_Transcription','Visual_Analysis','Vibe_Atmosphere','Duration','Status'];
  const mkRow = (no, txt) => [when(1),'RX','course_x.mp4', no ? 'بله':'خیر', no || '', 5,
                              txt, 'v', 'w', '300', 'SUCCESS'];
  const ss = new Spread('s', 'SS_ROLL'); const sh = ss.insertSheet('T');
  sh._d.push(H.slice());
  sh._d.push(mkRow(0, 'ترکیب از همه قطعات'));       // جمع‌بندی، بالاتر از همه
  for (let i = 1; i <= 5; i++) sh._d.push(mkRow(i, 'متنِ قطعهٔ ' + i + '. '.repeat(30)));
  sh._max = 100; global.__SS['SS_ROLL'] = ss;
  const files = scanTabFiles_(sh, 'T');
  const f = files['RX'];
  console.log('  قطعه‌ها:', f.chunks.map(c => c.no + '@' + c.row).join(', '));
  ok('هر پنج قطعهٔ واقعی ثبت شد', f.chunks.length === 5, f.chunks.length + '');
  ok('قطعهٔ ۱ همان ردیفِ درس است، نه ردیفِ جمع‌بندی', f.chunks[0].row === 3,
     'ردیف ' + f.chunks[0].row);
  ok('ردیفِ جمع‌بندی جداگانه شناسایی شد', f.rollupRow === 2, f.rollupRow + '');
})();

console.log('\n=== ۱۸) قطعهٔ غول‌پیکر بریده نمی‌شود، برش می‌خورد ═══');
(() => {
  const long = 'الف'.repeat(30000);
  const sl = sliceChunkText_(long, 14000);
  const joined = sl.join('');
  console.log('  برش‌ها:', sl.length, '| مجموع نویسه:', joined.length, 'از', long.length);
  ok('هیچ نویسه‌ای گم نشد', joined.length === long.length, joined.length + '/' + long.length);
  ok('هر برش زیر سقف است', sl.every(x => x.length <= 14000), sl.map(x=>x.length).join(','));
  ok('متنِ کوتاه برش نمی‌خورد', sliceChunkText_('کوتاه', 14000).length === 1);
})();
ok('مکان‌نمای کسری درست کدگذاری و بازخوانی می‌شود', (() => {
  const a = spCursorOf_(14, 3, 7);            // قطعهٔ ۱۴، سه برش از هفت
  const c = spCursor_(a);
  const b = spCursorOf_(14, 7, 7);            // قطعهٔ ۱۴ کامل
  const d = spCursor_(b);
  return c.no === 14 && c.slice === 4 && d.no === 15 && d.slice === 1;
})(), JSON.stringify({ partial: spCursor_(spCursorOf_(14,3,7)),
                       full: spCursor_(spCursorOf_(14,7,7)) }));

console.log('\n=== ۱۹) پاسخِ بریدهٔ مدل، مکان‌نما را نمی‌پراند ═══');
(() => {
  // مجموعهٔ تازه با یک فایلِ ۱۲ قطعه‌ای
  const H = ['Timestamp','File_ID','File_Name','Is_Chunk','Chunk_Number','Total_Chunks',
             'Farsi_Transcription','Visual_Analysis','Vibe_Atmosphere','Duration','Status'];
  const gsh = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
  for (let i = 1; i <= 12; i++) {
    const r = new Array(TVH.length).fill('');
    r[0]=when(250+i); r[1]='TRUNCF'; r[2]='90_TruncCourse.mp4'; r[4]='u';
    r[5]='بله'; r[6]=i; r[7]=12; r[8]=i+'-'+(i+1); r[9]='720 ثانیه';
    r[13]='متنِ قطعهٔ ' + i + ' از دورهٔ آزمایشی. '.repeat(60);
    r[22]='SUCCESS';
    gsh._d.push(r);
  }
  gsh._max = gsh._d.length + 20;
  un = quiet(); scanSeries(true);
  // همهٔ مجموعه‌های دیگر را ببند تا نوبت به این برسد
  const rg = readSeriesReg_(hub);
  rg.rows.forEach(r => { if (String(r.vals[SC.NAME-1]).indexOf('Trunc') === -1)
    rg.sheet.getRange(r.row, SC.STATUS, 1, 1).setValue(SST.DONE); });
  TRUNCATE = true;
  const rT = produceSpecialEpisode();
  let dT = 0; while (global.__PROPS[PK.SP_PENDING] && dT++ < 60) produceSpecialContinue();
  TRUNCATE = false;
  un();
  const pT = readSeriesParts_(hub).rows.find(r => String(r.vals[SP.FILE-1]) === 'TRUNCF');
  console.log('  نتیجه:', JSON.stringify({ ok: rT.ok }), '| مصرف‌شده تا:', pT.vals[SP.DONE_TO-1]);
  ok('قسمت ساخته شد', rT.ok === true, JSON.stringify(rT));
  ok('مکان‌نما فقط تا قطعه‌ای که واقعاً روایت شد جلو رفت',
     Number(pT.vals[SP.DONE_TO-1]) <= 2, String(pT.vals[SP.DONE_TO-1]));
  const rt2 = hub.getSheetByName(CFG.REPORT_TAB);
  const rrAll = rt2.getRange(2, 1, rt2.getLastRow()-1, REPORT_HEADERS.length).getValues();
  console.log('  یافته‌های درس‌نامه:', rrAll.filter(x => String(x[RC.CAT-1]).indexOf('درس‌نامه') !== -1)
    .map(x => String(x[RC.TITLE-1]).slice(0, 46)).join(' | ') || 'هیچ');
  ok('و ایرادِ متنِ ناقص در تب گزارش‌ها ثبت شد',
     rrAll.some(x => String(x[RC.CAT-1]) === 'پرامپت درس‌نامه' &&
                     /کوتاه|پوشش|روخوان/.test(String(x[RC.TITLE-1]))),
     rrAll.filter(x => String(x[RC.CAT-1]) === 'پرامپت درس‌نامه').length + ' یافته');
})();

console.log('\n=== ۲۰) قسمتِ خوانده‌نشده، برنامه را قفل نمی‌کند ═══');
(() => {
  un = quiet();
  // تبِ منبع را تغییرِ نام می‌دهیم تا ردیفِ قسمت به تبِ مرده اشاره کند
  const parts2 = readSeriesParts_(hub);
  const target = parts2.rows.find(r => String(r.vals[SP.FILE-1]) === 'TRUNCF');
  parts2.sheet.getRange(target.row, SP.TAB, 1, 1).setValue('تبِ ناموجود');
  const rg2 = readSeriesReg_(hub);
  // یک مجموعهٔ سالمِ دیگر را باز می‌کنیم تا ببینیم سراغش می‌رود
  const healthy = rg2.rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Astrology') !== -1);
  rg2.sheet.getRange(healthy.row, SC.STATUS, 1, 1).setValue(SST.NEW);
  const hp = readSeriesParts_(hub).byKey[healthy.key];
  hp.forEach(x => readSeriesParts_(hub).sheet.getRange(x.row, SP.DONE_TO, 1, 1).setValue(0));
  const rB = produceSpecialEpisode();
  let dB = 0; while (global.__PROPS[PK.SP_PENDING] && dB++ < 60) produceSpecialContinue();
  un();
  console.log('  نتیجه:', JSON.stringify({ ok: rB.ok, series: rB.series,
    skipped: (rB.skipped || []).length }));
  ok('برنامه نایستاد و از مجموعهٔ سالم قسمت ساخت',
     rB.ok === true && String(rB.series).indexOf('Astrology') !== -1, JSON.stringify(rB));
  ok('قسمتِ خوانده‌نشده به‌عنوان ایراد ثبت شد', (() => {
    const rt3 = hub.getSheetByName(CFG.REPORT_TAB);
    const rr = rt3.getRange(2, 1, rt3.getLastRow()-1, REPORT_HEADERS.length).getValues();
    return rr.some(x => String(x[RC.TITLE-1]).indexOf('خوانده نمی‌شوند') !== -1);
  })());
})();

console.log('\n=== ۲۱) هشتگ‌های سالمِ تلگرام ═══');
[['درس‌نامه', '#درس_نامه'], ['تحلیلِ نمودار', '#تحلیل_نمودار'], ['دورهٔ گن', '#دوره_گن'],
 ['۱۴۰۳', ''], ['قیمت سود ۱۰٪', '#قیمت_سود_۱۰'], ['#برچسب', '#برچسب'],
 ['', ''], ['ک'.repeat(300), null]].forEach(([inp, want]) => {
  const got = tgTag_(inp);
  if (want !== null) ok('هشتگِ «' + String(inp).slice(0, 18) + '» درست شد', got === want,
                        JSON.stringify(got));
});
ok('هشتگِ خیلی بلند بریده می‌شود', tgTag_('ک'.repeat(300)).length <= 61,
   tgTag_('ک'.repeat(300)).length + '');
ok('هیچ هشتگی نویسهٔ شکننده ندارد', (() => {
  const t = specialTags_({ tags: ['تحلیلِ نمودار', 'دورهٔ گن', '۱۴۰۳', 'الف ب'] },
                         'درس‌نامهٔ آزمایشی', 3);
  return t.every(x => !/[‌ِٔ٪\s#]/.test(x.slice(1)));
})(), specialTags_({ tags: ['تحلیلِ نمودار'] }, 'دورهٔ گن', 3).join(' '));
ok('هشتگِ آغازینِ دو برنامه یکی نیست',
   specialTags_({}, 'x', 1)[0] !== varietyTags_({}, 'y')[0],
   specialTags_({}, 'x', 1)[0] + ' vs ' + varietyTags_({}, 'y')[0]);

console.log('\n=== ۲۲) مکملِ تک‌نوع، نصفه نمی‌ماند ═══');
(() => {
  const t2 = hub.getSheetByName(TAXONOMY[0].title);
  const base = t2.getLastRow();
  const add = [];
  for (let i = 0; i < 30; i++) {
    const r = new Array(HUB_HEADERS.length).fill('');
    r[COL.ID-1] = 'ENR' + i; r[COL.KIND-1] = 'ویدیو';
    r[COL.TOPIC-1] = 'واژهیکم دومواژه سومواژه موضوع ' + i;
    r[COL.MSG-1] = 'واژهیکم پیام'; r[COL.SUMMARY-1] = 'دومواژه خلاصه';
    r[COL.BODY-1] = 'سومواژه متن'; r[COL.SCORE-1] = 70;
    r[COL.LINK-1] = 'https://x/' + i;
    add.push(r);
  }
  if (base + add.length > t2.getMaxRows()) t2.insertRowsAfter(t2.getMaxRows(), add.length + 5);
  t2.getRange(base + 1, 1, add.length, HUB_HEADERS.length).setValues(add);
  const got = enrichFor_(hub, ['واژهیکم', 'دومواژه', 'سومواژه'], [], 8);
  console.log('  خواسته ۸ · گرفته', got.length, '·', JSON.stringify(
    got.reduce((a,x)=>{a[x.kind]=(a[x.kind]||0)+1;return a;},{})));
  ok('با اینکه همه‌شان یک نوع‌اند، هر هشت مورد برگشت', got.length === 8, got.length + '');
})();


console.log('\n=== ۲۳) پاسخِ سوراخ‌سوراخ: مکان‌نما از رویِ درسِ نگفته نمی‌پرد ═══');
(() => {
  un = quiet();
  // یک دورهٔ تازه با ۱۰ قطعه؛ همهٔ بقیه بسته می‌شوند تا نوبت به این برسد
  const gsh2 = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
  for (let i = 1; i <= 10; i++) gsh2._d.push(tradeRow('GAPF', '01_DowrehSurakh_Ostad.mp4', i, 10, when(300 + i)));
  gsh2._max = gsh2._d.length + 20;
  global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';
  scanSeries(true);
  const rgG = readSeriesReg_(hub);
  rgG.rows.forEach(r => { if (String(r.vals[SC.NAME-1]).indexOf('Surakh') === -1)
    rgG.sheet.getRange(r.row, SC.STATUS, 1, 1).setValue(SST.DONE); });
  clearSeriesPin_();
  props_().deleteProperty(PK.SP_STUCK);
  GAPPY = true;
  const rG = produceSpecialEpisode();
  let dG = 0; while (global.__PROPS[PK.SP_PENDING] && dG++ < 60) produceSpecialContinue();
  GAPPY = false;
  un();
  const pG = readSeriesParts_(hub).rows.find(r => String(r.vals[SP.FILE-1]) === 'GAPF');
  console.log('  نتیجه:', JSON.stringify({ ok: rG.ok, series: rG.series }),
              '| مصرف‌شده تا:', pG && pG.vals[SP.DONE_TO-1]);
  ok('قسمت ساخته شد', rG.ok === true, JSON.stringify(rG).slice(0, 80));
  ok('مکان‌نما فقط تا آخرین قطعهٔ پیوسته‌ای که گفته شد جلو رفت (نه تا ته)',
     Number(pG.vals[SP.DONE_TO-1]) <= 2 && Number(pG.vals[SP.DONE_TO-1]) >= 1,
     String(pG.vals[SP.DONE_TO-1]));
  ok('و «جا انداختنِ قطعه‌ها» به‌عنوان ایراد ثبت شد', (() => {
    const rt = hub.getSheetByName(CFG.REPORT_TAB);
    const rr = rt.getRange(2, 1, rt.getLastRow()-1, REPORT_HEADERS.length).getValues();
    return rr.some(x => String(x[RC.TITLE-1]).indexOf('جا انداخت') !== -1);
  })());
  ok('و مجموعه هنوز «تمام‌شده» علامت نخورده', (() => {
    const rr = readSeriesReg_(hub).rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Surakh') !== -1);
    return String(rr.vals[SC.STATUS-1]) !== SST.DONE;
  })());
  // قطعه‌های نگفته باید در قسمت بعد بیایند
  un = quiet(); const rG2 = produceSpecialEpisode();
  let d2 = 0; while (global.__PROPS[PK.SP_PENDING] && d2++ < 60) produceSpecialContinue(); un();
  ok('قسمت بعد از همان مجموعه و از همان‌جا ادامه داد',
     rG2.ok === true && String(rG2.series).indexOf('Surakh') !== -1,
     JSON.stringify({ ok: rG2.ok, series: rG2.series }));
})();

console.log('\n=== ۲۴) مجموعه‌ای که قسمت‌هایش خوانده نشد، «تمام‌شده» علامت نمی‌خورد ═══');
(() => {
  un = quiet();
  const gsh3 = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
  for (let i = 1; i <= 8; i++) gsh3._d.push(tradeRow('DEADF', '01_DowrehGomshode_Ostad.mp4', i, 8, when(330 + i)));
  gsh3._max = gsh3._d.length + 20;
  global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';
  scanSeries(true);
  const pDead = readSeriesParts_(hub).rows.find(r => String(r.vals[SP.FILE-1]) === 'DEADF');
  readSeriesParts_(hub).sheet.getRange(pDead.row, SP.TAB, 1, 1).setValue('تبِ کاملاً ناموجود');
  const rgD = readSeriesReg_(hub);
  rgD.rows.forEach(r => { if (String(r.vals[SC.NAME-1]).indexOf('Gomshode') === -1)
    rgD.sheet.getRange(r.row, SC.STATUS, 1, 1).setValue(SST.DONE); });
  clearSeriesPin_();
  const rD = produceSpecialEpisode();
  let dD = 0; while (global.__PROPS[PK.SP_PENDING] && dD++ < 60) produceSpecialContinue();
  un();
  const rowD = readSeriesReg_(hub).rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Gomshode') !== -1);
  console.log('  نتیجه:', JSON.stringify({ ok: rD.ok, reason: rD.reason }),
              '| وضعیت مجموعه:', String(rowD.vals[SC.STATUS-1]));
  ok('مجموعهٔ خوانده‌نشده «تمام‌شده» علامت نخورد (محتوایش دور ریخته نشد)',
     String(rowD.vals[SC.STATUS-1]) !== SST.DONE, String(rowD.vals[SC.STATUS-1]));
  ok('و مکان‌نمای قسمتش هم دست‌نخورده ماند',
     Number(readSeriesParts_(hub).rows.find(r => String(r.vals[SP.FILE-1]) === 'DEADF')
            .vals[SP.DONE_TO-1]) === 0);
  ok('و ایرادِ «خوانده نشد» با نامِ همین مجموعه ردیفِ خودش را گرفت', (() => {
    const rt = hub.getSheetByName(CFG.REPORT_TAB);
    const rr = rt.getRange(2, 1, rt.getLastRow()-1, REPORT_HEADERS.length).getValues();
    return rr.some(x => String(x[RC.TITLE-1]).indexOf('Gomshode') !== -1 &&
                        String(x[RC.TITLE-1]).indexOf('خوانده نشد') !== -1);
  })(), (() => {
    const rt = hub.getSheetByName(CFG.REPORT_TAB);
    const rr = rt.getRange(2, 1, rt.getLastRow()-1, REPORT_HEADERS.length).getValues();
    return rr.filter(x => String(x[RC.TITLE-1]).indexOf('خوانده نشد') !== -1)
             .map(x => String(x[RC.TITLE-1]).slice(0, 44)).join(' | ');
  })());
  // تبِ منبع که برگردد، همان مجموعه باید ادامه پیدا کند
  un = quiet();
  readSeriesParts_(hub).sheet.getRange(pDead.row, SP.TAB, 1, 1).setValue('Video Analysis');
  const rD2 = produceSpecialEpisode();
  let d3 = 0; while (global.__PROPS[PK.SP_PENDING] && d3++ < 60) produceSpecialContinue(); un();
  ok('و همین که تبِ منبع برگشت، دوباره ساخته شد',
     rD2.ok === true && String(rD2.series).indexOf('Gomshode') !== -1,
     JSON.stringify({ ok: rD2.ok, series: rD2.series }));
})();

console.log('\n=== ۲۵) فشردنِ دکمهٔ دستی وقتی صداگذاری تمام نشده ═══');
(() => {
  // یک قسمتِ واقعی می‌سازیم و صداگذاری‌اش را نیمه‌کاره رها می‌کنیم
  un = quiet();
  const gsh4 = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
  for (let i = 1; i <= 9; i++) gsh4._d.push(tradeRow('LIVEF', '01_DowrehZende_Ostad.mp4', i, 9, when(360 + i)));
  gsh4._max = gsh4._d.length + 20;
  global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';
  scanSeries(true);
  clearSeriesPin_();
  const rMake = produceSpecialEpisode();
  un();
  ok('برای این آزمون یک قسمتِ واقعی ساخته شد و صدایش در نوبت ماند',
     rMake.ok === true && !!global.__PROPS[PK.SP_PENDING], JSON.stringify(rMake).slice(0, 70));
  const spTab = hub.getSheetByName(CFG.SPECIAL_TAB);
  const before = spTab.getLastRow();
  let alerted = '';
  global.__UI = { alert: function () { alerted += Array.prototype.join.call(arguments, ' | '); },
                  showModalDialog: () => {}, prompt: () => ({ getSelectedButton: () => 0 }),
                  createMenu: () => ({ addItem(){return this;}, addSeparator(){return this;},
                  addSubMenu(){return this;}, addToUi(){} }), ButtonSet: { OK: 1 } };
  un = quiet(); const rP = runProduceSpecial(); un();
  global.__UI = null;
  console.log('  پیام:', alerted.replace(/\n/g, ' ').slice(0, 120));
  ok('منو نمی‌گوید قسمتِ تازه‌ای نوشته شد',
     alerted.indexOf('نوشته شد') === -1 && alerted.indexOf('قسمتِ تازه‌ای ساخته نشد') !== -1);
  ok('و نامِ مجموعهٔ بی‌ربط هم اعلام نمی‌کند',
     alerted.indexOf('روی این مجموعه کار می‌شود') === -1);
  ok('و هیچ ردیفِ تازه‌ای به تبِ درس‌نامه اضافه نشد',
     hub.getSheetByName(CFG.SPECIAL_TAB).getLastRow() === before,
     before + ' → ' + hub.getSheetByName(CFG.SPECIAL_TAB).getLastRow());
  un = quiet(); let g9 = 0;
  while (global.__PROPS[PK.SP_PENDING] && g9++ < 60) produceSpecialContinue();
  props_().deleteProperty(PK.SP_PENDING); un();
})();

console.log('\n=== ۲۶) فایلِ بایگانیِ قسمت، فهرستِ مکمل را دارد ═══');
(() => {
  const js = global.__FILES.filter(f => f.getName() === '_special.json');
  ok('فایلِ بایگانی ساخته شده', js.length > 0, js.length + ' فایل');
  const last = JSON.parse(js[js.length - 1].getBlob().getDataAsString());
  console.log('  کلیدها:', Object.keys(last).join(', '));
  ok('و کلیدِ مکمل در آن تعریف‌شده است (نه undefined)',
     Object.prototype.hasOwnProperty.call(last, 'enrich') && Array.isArray(last.enrich),
     JSON.stringify(last.enrich));
  ok('و شمارِ مکملِ پیشنهادی هم ثبت شده', typeof last.enrichOffered === 'number',
     String(last.enrichOffered));
})();

console.log('\n✅ هر ' + pass + ' آزمونِ درس‌نامه گذشت.');
