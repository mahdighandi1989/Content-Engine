/* دیدبانیِ شیت‌های منبع: گرفتنِ خطاهای خط لوله، و تشخیص رکود بر پایهٔ الگوی
   زمانیِ خودِ هر تب — نه یک آستانهٔ ثابت. */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
const p2 = n => String(n).padStart(2, '0');
const stamp = ms => { const d = new Date(ms);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };
const NOW = Date.now(), DAY = 86400000;

const HDR = ['Timestamp','File_ID','File_Name','New_Name','File_Link','Is_Chunk','Chunk_Number',
  'Total_Chunks','Chunk_Range','Full_Transcription','Speaker_Diarization','Content_Summary',
  'Key_Points','Executive_Summary','Status','Domain_Detected','Content_Type','Main_Subject'];
const ix = n => HDR.indexOf(n);
function row(fid, tms, opts) {
  opts = opts || {};
  const r = new Array(HDR.length).fill('');
  r[ix('Timestamp')] = stamp(tms); r[ix('File_ID')] = fid; r[ix('File_Name')] = fid + '.mp3';
  r[ix('Is_Chunk')] = 'خیر';
  r[ix('File_Link')] = 'https://drive.google.com/file/d/' + fid + '/view';
  r[ix('Domain_Detected')] = 'آموزشی، علمی'; r[ix('Content_Type')] = 'سخنرانی';
  r[ix('Main_Subject')] = 'موضوع سالم دربارهٔ ساختار حافظه و یادگیری در مغز انسان';
  r[ix('Key_Points')] = JSON.stringify(['نکتهٔ کلیدی به‌قدر کافی بلند برای گرفتن امتیاز لازم.']);
  r[ix('Executive_Summary')] = opts.summary !== undefined ? opts.summary :
    'خلاصهٔ اجرایی سالم و به‌قدر کافی بلند برای اینکه آیتم امتیاز بگیرد و وارد بانک شود. ';
  r[ix('Full_Transcription')] = 'متن گفتار سالم و نسبتاً بلند برای سنجه‌ها. ';
  r[ix('Status')] = opts.status !== undefined ? opts.status : 'COMPLETED';
  if (opts.cell) r[ix(opts.cell[0])] = opts.cell[1];
  return r;
}
function mk(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 10); });
  global.__SS[id] = ss; return ss;
}

// ---- three feeds with three different rhythms ---------------------------
// A: healthy, ~4 rows/day, newest 2 hours ago
const A = []; for (let i = 59; i >= 0; i--) A.push(row('A' + i, NOW - i * 6 * 3600 * 1000));
// B: normally one row every ~2 days, but nothing for 20 days → stalled
const B = []; for (let i = 39; i >= 0; i--) B.push(row('B' + i, NOW - (20 * DAY) - i * 2 * DAY));
// C: was hourly for ~10 days, then throughput collapsed to a trickle → کم‌کار
//    (still receiving rows, so a plain "days since last row" test would miss it)
const C = [];
for (let i = 239; i >= 0; i--) C.push(row('C' + i, NOW - (8 * DAY) - i * 3600 * 1000));
for (let i = 0; i < 2; i++) C.push(row('Ct' + i, NOW - (3 - i) * DAY));

// real failure messages, taken verbatim from the user's own sheets
C.push(row('CERR1', NOW - 3600 * 1000,
  { cell: ['Content_Summary', '{"One_Line_Summary": "تحلیل ترید خالی برگردانده شد — نیاز به بازپردازش"}'] }));
C.push(row('CERR2', NOW - 3600 * 1000,
  { summary: 'Error: Unterminated string starting at: line 31 column 15 (char 19427)' }));
C.push(row('CERR3', NOW - 3600 * 1000, { status: 'ERROR: RESOURCE_EXHAUSTED' }));
C.push(row('CERR4', NOW - 3600 * 1000,
  { cell: ['Content_Summary', 'quota exceeded for model gemini-2.5-pro, please retry'] }));
// a benign row that must NOT be flagged (real text from the user's sheets)
C.push(row('COK', NOW - 3600 * 1000, { cell: ['Content_Summary', 'جدولی یافت نشد'] }));

mk(CFG.VIDEO_SHEET_ID, [{ name: 'S1', hdr: ['تاریخ پردازش','File ID'], rows: [] }]);
mk(CFG.PHOTO_SHEET_ID, [{ name: 'S1', hdr: ['تاریخ پردازش','File ID'], rows: [] }]);
for (const s of CFG.SOURCES) if (!global.__SS[s.id]) {
  const ss = new Spread('s', s.id); ss.insertSheet('S1'); global.__SS[s.id] = ss;
}
mk('FEED_A', [{ name: 'Audio Analysis', hdr: HDR, rows: A }]);
mk('FEED_B', [{ name: 'Audio Analysis', hdr: HDR, rows: B }]);
mk('FEED_C', [{ name: 'Audio Analysis', hdr: HDR, rows: C }]);
CFG.SOURCES.push({ key: 'fa', id: 'FEED_A', title: 'منبع سالم', schema: 'auto' });
CFG.SOURCES.push({ key: 'fb', id: 'FEED_B', title: 'منبع راکد', schema: 'auto' });
CFG.SOURCES.push({ key: 'fc', id: 'FEED_C', title: 'منبع کم‌کار', schema: 'auto' });
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__STUB = () => ({ code: 200, json: { models: [] } });

let un = quiet(); let g = 0; while (g++ < 30) syncCatalog(); un();
const hub = getHub_();

// ================= errors ==============================================
console.log('=== الف) گرفتنِ خطاهای خط لولهٔ منبع ===');
const errSh = hub.getSheetByName(CFG.SRC_ERR_TAB);
const ev = errSh.getLastRow() > 1
  ? errSh.getRange(2, 1, errSh.getLastRow() - 1, SRC_ERR_HEADERS.length).getValues() : [];
ev.forEach(r => console.log('  • ' + r[1] + ' › ' + r[2] + ' | ردیف ' + r[3] +
  ' | ' + r[5] + ' | ' + String(r[6]).slice(0, 70)));
const types = ev.map(r => String(r[5]));
ok('هر چهار خطای واقعی گرفته شد', ev.length === 4, ev.length + ' مورد');
ok('پاسخ خالی مدل شناسایی شد', types.indexOf('پاسخ خالی مدل') !== -1);
ok('پاسخ تجزیه‌نشدهٔ مدل شناسایی شد', types.indexOf('پاسخ مدل تجزیه نشد') !== -1);
ok('وضعیت ناموفق شناسایی شد', types.indexOf('وضعیت ناموفق') !== -1);
ok('سهمیه/نرخ شناسایی شد', types.indexOf('سهمیه یا نرخ') !== -1);
ok('«جدولی یافت نشد» به‌اشتباه خطا شمرده نشد',
   !ev.some(r => String(r[6]).indexOf('جدولی یافت نشد') !== -1));
ok('شمارهٔ ردیف در شیت منبع ثبت شد', ev.every(r => Number(r[3]) > 1),
   'ردیف‌ها: ' + ev.map(r => r[3]).join('، '));
ok('لینک فایل برای پیگیری ثبت شد',
   ev.every(r => String(r[7]).indexOf('drive.google.com') !== -1));

const es = srcErrorSummary_(hub, 10);
ok('خلاصهٔ خطاها ۲۴ ساعت اخیر را جدا می‌شمارد', es.total === 4 && es.last24h === 4,
   'کل ' + es.total + ' · ۲۴ ساعت ' + es.last24h);

// ================= pulse ===============================================
console.log('\n=== ب) تشخیص رکود از روی الگوی خودِ هر تب ===');
const rep = sourceFeedReport_();
const byTitle = {};
rep.feeds.forEach(f => { if (f.source.indexOf('منبع ') === 0) byTitle[f.source] = f; });
['منبع سالم','منبع راکد','منبع کم‌کار'].forEach(t => {
  const f = byTitle[t];
  console.log('  ' + t.padEnd(12) + ' → ' + String(f.rows).padStart(3) + ' ردیف | آخری ' +
    f.lastAt + ' | ' + String(f.daysSinceLast).padStart(5) + ' روز پیش | فاصلهٔ معمول ' +
    f.quietGapDays + ' روز | آستانهٔ رکود ' + f.stallAtDays + ' | نرخ اخیر/پیشین ' + f.recentPerDay + '/' + f.priorPerDay +
    ' | ' + f.verdict + (f.reason ? ' (' + f.reason + ')' : ''));
});
ok('منبعِ فعال «فعال» تشخیص داده شد', byTitle['منبع سالم'].verdict === 'فعال');
ok('منبعِ ۲۰ روز بی‌حرکت «راکد» تشخیص داده شد', byTitle['منبع راکد'].verdict === 'راکد');
const slow = byTitle['منبع کم‌کار'];
ok('منبعی که هنوز ردیف می‌گیرد ولی ظرفیتش فروریخته «کم‌کار» تشخیص داده شد',
   slow.verdict === 'کم‌کار' && slow.reason === 'افت ظرفیت',
   slow.verdict + ' / ' + slow.reason + ' — هفتهٔ اخیر ' + slow.recentPerDay +
   ' در روز، پیش‌تر ' + slow.priorPerDay + ' در روز');
ok('افتِ ظرفیت با «روزهای بی‌ردیف» اشتباه گرفته نمی‌شود',
   slow.daysSinceLast < CFG.PULSE_MIN_SLOW_DAYS,
   'فقط ' + slow.daysSinceLast + ' روز از آخرین ردیف گذشته');
ok('آستانه از الگوی خودِ تب می‌آید، نه عددی ثابت',
   byTitle['منبع راکد'].stallAtDays > byTitle['منبع سالم'].stallAtDays,
   'راکد: سکوت معمول ' + byTitle['منبع راکد'].quietGapDays + ' روز → آستانهٔ ' +
   byTitle['منبع راکد'].stallAtDays + ' | سالم: سکوت معمول ' +
   byTitle['منبع سالم'].quietGapDays + ' روز → آستانهٔ ' + byTitle['منبع سالم'].stallAtDays);

// ================= wording + tab + status file ==========================
console.log('\n=== ج) گزارش، تب نبض، و فایل وضعیت ===');
const sp = sourceProblems_(hub, rep, es);
sp.problems.forEach(x => console.log('  ⚠ ' + x));
sp.notes.forEach(x => console.log('  · ' + x));
ok('رکود به‌عنوان «ایراد» گزارش شد',
   sp.problems.some(x => x.indexOf('منبع راکد') !== -1 && x.indexOf('راکد به نظر') !== -1));
ok('کم‌کاری به‌عنوان «یادداشت» گزارش شد',
   sp.notes.some(x => x.indexOf('منبع کم‌کار') !== -1));
ok('خطاهای تازه در گزارش آمد', sp.problems.some(x => x.indexOf('ردیفِ خطادار تازه') !== -1));
ok('در متن گزارش «۰ روز» یا عدد اعشاری زشت نیست',
   !sp.problems.concat(sp.notes).some(x => /معمولش 0 روز|\d+\.\d+ روز/.test(x)));

writePulseTab_(hub, rep);
const pt = hub.getSheetByName(CFG.PULSE_TAB);
ok('تب نبض نوشته شد', pt && pt.getLastRow() > 1, (pt.getLastRow() - 1) + ' ردیف');

un = quiet(); const st = writeStatus_(hub, 'آزمون منابع'); un();
ok('فایل وضعیت خطاهای منبع را دارد',
   st.sourceErrors && st.sourceErrors.total === 4 && st.sourceErrors.recent.length > 0);
ok('فایل وضعیت نبضِ همهٔ تب‌ها را دارد',
   st.sync.feeds.length >= 3 && st.sync.feeds.every(f => f.verdict !== undefined));
const jsonSize = JSON.stringify(st).length;
ok('فایل وضعیت به‌قدر کافی کوچک است تا Cowork بخواندش', jsonSize < 200000,
   Math.round(jsonSize / 1024) + ' کیلوبایت');

// ================= alerting =============================================
console.log('\n=== د) وارسی سلامت باید هشدار بدهد ===');
global.__MAIL.length = 0;
un = quiet(); const hc = healthCheck(); un();
hc.problems.forEach(x => console.log('  ⚠ ' + x));
ok('وارسی سلامت رکود و خطاها را در ایرادها آورد',
   hc.problems.some(x => x.indexOf('راکد') !== -1) &&
   hc.problems.some(x => x.indexOf('خطادار') !== -1));
ok('ایمیل هشدار فرستاده شد', global.__MAIL.length === 1);
const body = global.__MAIL[0].htmlBody;
ok('متن ایمیل نمونهٔ خطا را دارد', body.indexOf('نیاز به بازپردازش') !== -1 ||
   body.indexOf('Unterminated') !== -1 || body.indexOf('نمونهٔ تازه‌ترین خطا') !== -1);

// ================= no double-recording ==================================
console.log('\n=== ه) خطاها با هر همگام‌سازی دوباره ثبت نمی‌شوند ===');
un = quiet(); syncCatalog(); syncCatalog(); un();
const after = srcErrorSummary_(hub, 5);
ok('شمار خطاها ثابت ماند', after.total === 4, after.total + ' مورد');

// source sheets untouched
ok('هیچ‌چیزی در شیت‌های منبع نوشته نشد', (() => {
  const c = global.__SS['FEED_C'].getSheets()[0];
  return c._d.length === C.length + 1 && c._d[1][ix('Status')] === 'COMPLETED';
})());




// ============ و) یک خرابی = یک هشدار، نه یک هشدار به ازای هر ردیف ==========
console.log('\n=== و) خرابیِ یک فایل، سی‌وچهار بار گزارش نمی‌شود ===');
const NEWD = JSON.parse(fs.readFileSync('tests/fixtures/newsheets.json', 'utf8'));
const tv = NEWD.trading.find(x => x.name === 'Video Analysis');
mk('REAL_TRADING', [{ name: 'Video Analysis', hdr: tv.hdr, rows: tv.rows }]);
CFG.SOURCES.push({ key: 'rt', id: 'REAL_TRADING', title: 'Trading واقعی', schema: 'auto',
                   hint: 'مالی، ترید و فارکس' });
const before = srcErrorSummary_(hub, 1).total;
un = quiet(); let gg = 0; while (gg++ < 20) syncCatalog(); un();
const afterReal = srcErrorSummary_(hub, 50);
const tradingErrs = afterReal.recent.filter(r => r.source === 'Trading واقعی');
console.log('  ردیف‌های خطادار در دادهٔ واقعی: ۳۴ (همه از یک فایل)');
console.log('  خرابیِ یکتای ثبت‌شده:', afterReal.total - before);
tradingErrs.forEach(r => console.log('     • ردیف ' + r.row + ' | ' + r.type + ' | ' +
  r.fileId.slice(0, 14) + '… | ' + r.text.slice(0, 55)));
ok('سی‌وچهار ردیفِ خرابِ یک فایل به یک هشدار جمع شد', afterReal.total - before === 1,
   (afterReal.total - before) + ' مورد ثبت شد');
ok('همان یک هشدار، شناسهٔ فایل و لینکش را دارد',
   tradingErrs.length === 1 && tradingErrs[0].fileId.length > 20 &&
   tradingErrs[0].link.indexOf('drive.google.com') !== -1);
un = quiet(); syncCatalog(); syncCatalog(); un();
ok('اسکن دوباره همان خرابی را دوباره ثبت نمی‌کند',
   srcErrorSummary_(hub, 1).total === afterReal.total);


// ====== ز) خط لولهٔ دسته‌ای: هفته‌ای یک انفجار، نه هشدارِ هفتگی ==========
console.log('\n=== ز) تبِ دسته‌ای (الگوی واقعیِ General-Processor) ===');
// الگوی واقعی: ۴۵ ردیف در یک روز، ۷ روز سکوت، ۵۴ ردیف، ۵ روز سکوت، ۲۶ ردیف
const BURST = [];
[[26, 26], [31, 54], [38, 45]].forEach(([daysAgo, n]) => {
  for (let i = n - 1; i >= 0; i--) BURST.push(row('BR' + daysAgo + '_' + i, NOW - daysAgo * DAY + i * 60000));
});
BURST.sort((a, b) => String(a[ix('Timestamp')]).localeCompare(String(b[ix('Timestamp')])));
function pulseOf(rows, extraDaysAgo) {
  const all = rows.slice();
  if (extraDaysAgo !== undefined) {
    for (let i = 29; i >= 0; i--) all.push(row('BX' + i, NOW - extraDaysAgo * DAY + i * 60000));
  }
  all.sort((a, b) => String(a[ix('Timestamp')]).localeCompare(String(b[ix('Timestamp')])));
  const id = 'BURST_' + (extraDaysAgo === undefined ? 'none' : extraDaysAgo);
  mk(id, [{ name: 'Audio Analysis', hdr: HDR, rows: all }]);
  const sh = global.__SS[id].getSheets()[0];
  return sourcePulse_(sh, ix('Timestamp'), sh.getLastRow());
}
const b8 = pulseOf(BURST, 8);    // آخرین دسته ۸ روز پیش — هنوز در ریتم خودش
const b25 = pulseOf(BURST, 25);  // هیچ دسته‌ای در ۲۵ روز — واقعاً راکد
console.log('  آخرین دسته ۸ روز پیش  → سکوت معمول ' + b8.quietGapDays + ' روز، آستانه ' +
  b8.stallAtDays + ' → ' + b8.verdict);
console.log('  آخرین دسته ۲۵ روز پیش → سکوت معمول ' + b25.quietGapDays + ' روز، آستانه ' +
  b25.stallAtDays + ' → ' + b25.verdict);
ok('تبِ دسته‌ای با ۸ روز سکوتِ عادی، هشدار الکی نمی‌دهد', b8.verdict !== 'راکد', b8.verdict);
ok('همان تب با ۲۵ روز سکوت، «راکد» اعلام می‌شود', b25.verdict === 'راکد', b25.verdict);
ok('آستانه واقعاً از ریتم دسته‌ای ساخته شد (نه کفِ ثابت)', b8.stallAtDays > CFG.PULSE_MIN_STALL_DAYS,
   b8.stallAtDays + ' روز > کفِ ' + CFG.PULSE_MIN_STALL_DAYS);

// ====== ح) یک ردیفِ تاریخ‌آینده نباید یک تبِ مرده را «فعال» نشان بدهد ======
console.log('\n=== ح) ردیفِ تاریخ‌آینده ===');
const DEAD = [];
for (let i = 39; i >= 0; i--) DEAD.push(row('D' + i, NOW - 60 * DAY - i * 2 * DAY));
mk('DEAD_OK', [{ name: 'Audio Analysis', hdr: HDR, rows: DEAD }]);
const shDead = global.__SS['DEAD_OK'].getSheets()[0];
const pDead = sourcePulse_(shDead, ix('Timestamp'), shDead.getLastRow());
const DEADF = DEAD.concat([row('DFUT', NOW + 300 * DAY)]);
mk('DEAD_FUT', [{ name: 'Audio Analysis', hdr: HDR, rows: DEADF }]);
const shF = global.__SS['DEAD_FUT'].getSheets()[0];
const pFut = sourcePulse_(shF, ix('Timestamp'), shF.getLastRow());
console.log('  بدون ردیفِ آینده  → ' + pDead.daysSinceLast + ' روز | ' + pDead.verdict);
console.log('  با ردیفِ +۳۰۰ روز → ' + pFut.daysSinceLast + ' روز | ' + pFut.verdict +
  ' | ردیف‌های آینده: ' + pFut.futureRows);
ok('تبِ مرده حتی با یک ردیفِ تاریخ‌آینده هم «راکد» می‌ماند', pFut.verdict === 'راکد', pFut.verdict);
ok('روزهای گذشته منفی نمی‌شود', pFut.daysSinceLast > 0, String(pFut.daysSinceLast));
ok('ردیفِ آینده شمرده و گزارش می‌شود', pFut.futureRows === 1);

// ====== ط) واردات دسته‌ایِ گذشته نباید تبِ سالم را «کم‌کار» کند ==========
console.log('\n=== ط) واردات دسته‌ای در گذشته ===');
function steady(withBulk) {
  const rows = [];
  for (let d = 30; d >= 0; d--) for (let k = 0; k < 2; k++) rows.push(row('S' + d + '_' + k, NOW - d * DAY + k * 3600000));
  if (withBulk) for (let i = 0; i < 250; i++) rows.push(row('BULK' + i, NOW - 20 * DAY + i * 60000));
  rows.sort((a, b) => String(a[ix('Timestamp')]).localeCompare(String(b[ix('Timestamp')])));
  const id = 'STEADY_' + withBulk;
  mk(id, [{ name: 'Audio Analysis', hdr: HDR, rows: rows }]);
  const sh = global.__SS[id].getSheets()[0];
  return sourcePulse_(sh, ix('Timestamp'), sh.getLastRow());
}
const s1 = steady(false), s2 = steady(true);
console.log('  بدون واردات دسته‌ای → نرخ اخیر/پیشین ' + s1.recentPerDay + '/' + s1.priorPerDay + ' → ' + s1.verdict);
console.log('  با ۲۵۰ ردیف واردات  → نرخ اخیر/پیشین ' + s2.recentPerDay + '/' + s2.priorPerDay + ' → ' + s2.verdict);
ok('واردات دسته‌ایِ گذشته، تبِ سالم را «کم‌کار» نمی‌کند', s2.verdict === 'فعال', s2.verdict);

// ====== ی) خطایی که برطرف شد و دوباره برگشت، دوباره گزارش می‌شود ========
console.log('\n=== ی) بازگشتِ یک خطای برطرف‌شده ===');
const k1 = srcErrKey_('S', 'T', 'FILE1', 'سهمیه یا نرخ', 5, '2026-01-01 10:00');
const k2 = srcErrKey_('S', 'T', 'FILE1', 'سهمیه یا نرخ', 9, '2026-03-15 10:00');
const kSame = srcErrKey_('S', 'T', 'FILE1', 'سهمیه یا نرخ', 7, '2026-01-01 22:00');
ok('همان خرابی در همان روز، یک بار ثبت می‌شود', k1 === kSame);
ok('همان خرابی در روزی دیگر، دوباره ثبت می‌شود', k1 !== k2, k1.slice(0, 10) + ' ≠ ' + k2.slice(0, 10));

// ====== ک) متنِ آموزشیِ خودِ آرشیو نباید خطا شمرده شود ==================
console.log('\n=== ک) مثبتِ کاذب روی متنِ آموزشیِ ترید ===');
const teach = [
  ['امروز دربارهٔ rate limit در APIهای صرافی صحبت می‌کنیم و اینکه چطور مدیریتش کنیم. ' + 'ادامهٔ توضیح مفصل. '.repeat(30), 'body'],
  ['Take a time out before you enter the trade, and never risk more than you can lose. ' + 'More lecture text follows here. '.repeat(30), 'body'],
  ['The RSI indicator timed out of the overbought zone in this example chart. ' + 'Further explanation continues. '.repeat(30), 'body'],
  ['او نتوانست در این تحلیل به نتیجهٔ روشنی برسد و بحث را باز گذاشت. ' + 'ادامهٔ درس در این باره. '.repeat(30), 'body'],
  ['HTTP 503 is discussed at minute 12 of this DevOps lecture as an example. ' + 'Lecture continues at length. '.repeat(30), 'body']
];
const mm = srcMap_(HDR);
let fp = 0;
teach.forEach(([text]) => {
  const r = row('T', NOW, {});
  r[ix('Full_Transcription')] = text;
  r[ix('Executive_Summary')] = text;
  const e = srcErrorOf_(r, mm, 'COMPLETED');
  if (e) { fp++; console.log('  ❗ مثبت کاذب: ' + e.type + ' ← ' + text.slice(0, 55)); }
});
ok('هیچ‌کدام از پنج جملهٔ آموزشی خطا شمرده نشد', fp === 0, fp + ' مثبت کاذب');
// ولی همان الگوها در یک سلولِ کوتاهِ وضعیت باید گرفته شوند
const rq = row('Q', NOW, { status: 'rate limit reached' });
ok('ولی همان عبارت در ستون وضعیت گرفته می‌شود',
   !!srcErrorOf_(rq, mm, 'rate limit reached'));

console.log('\n✅ هر ' + pass + ' آزمونِ دیدبانی منابع گذشت.');
