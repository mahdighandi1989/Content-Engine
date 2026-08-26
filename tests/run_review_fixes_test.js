/* One test per bug found in the deep review — each fails on the old code. */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (name, cond, detail) => {
  console.log('  ' + (cond ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!cond) throw new Error('FAILED: ' + name);
  pass++;
};

// ---------------------------------------------------------------- pure units
console.log('=== ۱) واحدهای خالص ===');

ok('jparse_ روی «null» شیء خالی می‌دهد نه null',
   JSON.stringify(jparse_('null')) === '{}' && JSON.stringify(jparse_('  null ')) === '{}');
ok('jparse_ روی عدد و رشتهٔ JSON هم نمی‌شکند',
   JSON.stringify(jparse_('123')) === '{}' && JSON.stringify(jparse_('"x"')) === '{}' &&
   jparse_('{"a":1}').a === 1);

ok('looksLikeFile_ واژه‌های واقعی را نام فایل نمی‌داند',
   !looksLikeFile_('Bitcoin') && !looksLikeFile_('RSI') && !looksLikeFile_('Astrology') &&
   !looksLikeFile_('تحلیل بازار'));
ok('looksLikeFile_ نام فایل واقعی را می‌شناسد',
   looksLikeFile_('a.mp3') && looksLikeFile_('01_Astrology_Homayoon') &&
   looksLikeFile_('CBUAE_EN_5974.pdf') && looksLikeFile_(''));

let capOk = true, capDetail = '';
for (const t of [0,1,2,59,60,61,62,119,120,121,180,300,500,999,1000,5000,20000]) {
  const st = chunkStride_(t), n = chunkExpected_(t);
  let brute = 0;
  for (let i = 1; i <= Math.min(t, 20000); i++) if (st === 1 || (i % st === 1) || i === t) brute++;
  if (n !== brute || n > 60) { capOk = false; capDetail += `total=${t} stride=${st} exp=${n} brute=${brute}; `; }
}
ok('نمونه‌برداری هیچ‌وقت از سقف ۶۰ رد نمی‌شود و با شمارش واقعی می‌خواند',
   capOk, capDetail || 'همهٔ ۱۷ مقدار');

ok('chunkOf_ مقدارهای انگلیسی/بولی را هم می‌فهمد', (() => {
  const m = { isChunk: 0, chunkNo: 1, chunkTot: 2 };
  const a = chunkOf_(['TRUE', 3, 10], m), b = chunkOf_(['خیر', '', ''], m),
        c = chunkOf_(['yes', 1, 5], m), d = chunkOf_([false, 2, 5], m);
  return a.isChunk && a.no === 3 && a.total === 10 && b.isRollup && c.isChunk && d.isRollup;
})());
ok('chunkOf_ «تعداد کل» نجومی یا منفی را نامعلوم می‌گیرد', (() => {
  const m = { isChunk: 0, chunkNo: 1, chunkTot: 2 };
  return chunkOf_(['بله', 1, 15000000], m).total === 0 &&
         chunkOf_(['بله', 1, -5], m).total === 0 &&
         chunkOf_(['بله', 'CHUNK_7', 'x'], m).no === 0;
})());

ok('flatOne_ شیء تودرتو را «[object Object]» نمی‌کند', (() => {
  const s = flatText_(JSON.stringify([{ term: 'RSI', definition: { fa: 'شاخص قدرت نسبی' } }]), 0);
  return s.indexOf('[object') === -1 && s.indexOf('شاخص قدرت نسبی') !== -1;
})(), flatText_(JSON.stringify([{ term: 'RSI', definition: { fa: 'شاخص قدرت نسبی' } }]), 0));

ok('pickFa_ متن فارسی را بر انگلیسی ترجیح می‌دهد', (() => {
  const en = 'The speaker discusses the loan approval process in detail and at length here.';
  const fa = 'گوینده دربارهٔ روند تصویب تسهیلات و مراحل آن به‌تفصیل توضیح می‌دهد و نکته‌ها را می‌شمارد.';
  return pickFa_(en, fa) === fa && pickFa_(fa, en) === fa && pickFa_(en, '') === en;
})());

// --------------------------------------------------- data-loss on assembly
console.log('\n=== ۲) قطعه‌ها هرگز پیش از نوشتنِ آیتم پاک نمی‌شوند ===');
const HDR = ['Timestamp','File_ID','File_Name','New_Name','File_Link','Is_Chunk','Chunk_Number',
  'Total_Chunks','Chunk_Range','Full_Transcription','Speaker_Diarization','Content_Summary',
  'Key_Points','Executive_Summary','Status','Domain_Detected','Content_Type','Main_Subject'];
const ix = n => HDR.indexOf(n);
function crow(fid, no, tot, extra) {
  const r = new Array(HDR.length).fill('');
  r[ix('Timestamp')] = '2026-06-0' + (1 + (no % 8)) + ' 10:00:00';
  r[ix('File_ID')] = fid; r[ix('File_Name')] = fid + '.mp3';
  r[ix('Is_Chunk')] = 'بله'; r[ix('Chunk_Number')] = (extra && extra.noNumber) ? '' : no;
  r[ix('Total_Chunks')] = tot;
  r[ix('Domain_Detected')] = 'آموزشی، علمی'; r[ix('Content_Type')] = 'سخنرانی';
  r[ix('Main_Subject')] = 'بخش ' + no + ' از یک دورهٔ آموزشی دربارهٔ ساختار حافظه';
  r[ix('Key_Points')] = JSON.stringify(['نکتهٔ کلیدی شمارهٔ ' + no + ' که به‌قدر کافی بلند است.']);
  r[ix('Executive_Summary')] = 'خلاصهٔ بخش ' + no + '. توضیح مفصل برای رسیدن به طول واقعی. ';
  r[ix('Full_Transcription')] = 'گفتار بخش ' + no;
  r[ix('Status')] = 'CHUNK_' + no;
  return r;
}
function rollup(fid, tot, stub) {
  const r = new Array(HDR.length).fill('');
  r[ix('Timestamp')] = '2026-06-09 12:00:00'; r[ix('File_ID')] = fid;
  r[ix('Is_Chunk')] = 'خیر'; r[ix('New_Name')] = fid + '_joined.mp3';
  r[ix('File_Link')] = 'https://drive.google.com/file/d/' + fid + '/view';
  r[ix('Status')] = 'COMPLETED';
  if (stub) { r[ix('Full_Transcription')] = 'ترکیب قطعات';
              r[ix('Executive_Summary')] = tot + ' از ' + tot + ' قطعه صوتی'; }
  return r;
}
function mk(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 10); });
  global.__SS[id] = ss; return ss;
}
function emptySources() {
  mk(CFG.VIDEO_SHEET_ID, [{ name: 'S1', hdr: ['تاریخ پردازش','File ID'], rows: [] }]);
  mk(CFG.PHOTO_SHEET_ID, [{ name: 'S1', hdr: ['تاریخ پردازش','File ID'], rows: [] }]);
  for (const s of CFG.SOURCES) if (!global.__SS[s.id]) {
    const ss = new Spread('s', s.id); ss.insertSheet('S1'); global.__SS[s.id] = ss;
  }
}
emptySources();
const R1 = []; for (let n = 1; n <= 4; n++) R1.push(crow('LOSS', n, 4));
R1.push(rollup('LOSS', 4, true));
mk('LOSS_SHEET', [{ name: 'Audio Analysis', hdr: HDR, rows: R1 }]);
CFG.SOURCES.push({ key: 'loss', id: 'LOSS_SHEET', title: 'آزمون گم‌شدن', schema: 'auto' });
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
let un = quiet();
// stage the chunks, but make the item write fail so assembly must NOT purge
let g = 0; while (g++ < 6) syncCatalog();
un();
const hub = getHub_();
const findItem = id => {
  for (const n of TAXONOMY.map(t => t.title).concat([MISC_TITLE])) {
    const sh = hub.getSheetByName(n);
    if (!sh || sh.getLastRow() < 2) continue;
    const v = sh.getRange(2, 1, sh.getLastRow() - 1, HUB_HEADERS.length).getValues();
    for (const r of v) if (r[COL.ID - 1] === id) return r;
  }
  return null;
};
ok('حالت عادی: فایل چهار قطعه‌ای یک آیتم شد', !!findItem('LOSS'),
   findItem('LOSS') ? findItem('LOSS')[COL.PARTS - 1] : '');

// now the real crash test: a fresh file whose category write throws once
emptySources();
const R2 = []; for (let n = 1; n <= 3; n++) R2.push(crow('CRASH', n, 3));
R2.push(rollup('CRASH', 3, true));
global.__SS['LOSS_SHEET'].getSheets()[0]._d =
  [HDR.slice()].concat(R2.map(r => r.slice()));
for (const k of Object.keys(global.__PROPS))
  if (k.indexOf(PK.CUR_PREFIX) === 0) delete global.__PROPS[k];

const catTab = hub.getSheetByName('علمی و آموزشی');
const realSet = Object.getPrototypeOf(catTab.getRange(1, 1, 1, 1)).setValues;
let boom = true;
Object.getPrototypeOf(catTab.getRange(1, 1, 1, 1)).setValues = function (v) {
  if (boom && this.sh === catTab && this.r > 1) { boom = false; throw new Error('نوشتن شکست خورد'); }
  return realSet.call(this, v);
};
un = quiet(); syncCatalog(); un();
const stagedAfterCrash = chunkBacklog_(hub);
ok('پس از شکستِ نوشتن، قطعه‌ها هنوز در انبارند (گم نشدند)',
   stagedAfterCrash.rows > 0, stagedAfterCrash.rows + ' ردیف');
un = quiet(); syncCatalog(); un();
ok('اجرای بعدی همان فایل را کامل می‌سازد', !!findItem('CRASH'),
   findItem('CRASH') ? findItem('CRASH')[COL.PARTS - 1] : 'ساخته نشد');
Object.getPrototypeOf(catTab.getRange(1, 1, 1, 1)).setValues = realSet;

// ------------------------------------------- chunk number missing / marker only
console.log('\n=== ۳) شمارهٔ قطعهٔ خالی و نشانگرِ تنها ===');
emptySources();
const R3 = [];
for (let n = 1; n <= 5; n++) R3.push(crow('NONUM', n, 5, { noNumber: true }));
global.__SS['LOSS_SHEET'].getSheets()[0]._d = [HDR.slice()].concat(R3.map(r => r.slice()));
for (const k of Object.keys(global.__PROPS))
  if (k.indexOf(PK.CUR_PREFIX) === 0) delete global.__PROPS[k];
un = quiet(); syncCatalog(); syncCatalog(); un();
const nn = findItem('NONUM');
const chTab = hub.getSheetByName(CFG.CHUNK_TAB);
const stillStaged = chTab.getLastRow() > 1
  ? chTab.getRange(2, 1, chTab.getLastRow() - 1, CHUNK_HEADERS.length).getValues()
      .filter(r => r[CH.ID] === 'NONUM').length
  : 0;
const partsSeen = nn ? String(nn[COL.PARTS - 1]) : '';
ok('قطعه‌های بدون شماره همه شمرده شدند (نه فقط یکی)',
   !!nn && /ترکیب 5 قطعه/.test(partsSeen),
   partsSeen || ('آیتم نساخت؛ در انبار: ' + stillStaged));

emptySources();
global.__SS['LOSS_SHEET'].getSheets()[0]._d = [HDR.slice(), rollup('MARKONLY', 9, true)];
for (const k of Object.keys(global.__PROPS))
  if (k.indexOf(PK.CUR_PREFIX) === 0) delete global.__PROPS[k];
un = quiet(); syncCatalog(); un();
const mo = findItem('MARKONLY');
ok('نشانگرِ تنها آیتمِ توخالی نمی‌سازد', !mo, mo ? String(mo[COL.SUMMARY - 1]).slice(0, 40) : 'منتظر ماند');
// chunks arrive later → now it must build
global.__SS['LOSS_SHEET'].getSheets()[0]._d =
  [HDR.slice(), rollup('MARKONLY', 3, true)].concat([1,2,3].map(n => crow('MARKONLY', n, 3)));
un = quiet(); syncCatalog(); syncCatalog(); un();
const mo2 = findItem('MARKONLY');
ok('وقتی قطعه‌ها رسیدند، همان فایل ساخته می‌شود', !!mo2 &&
   String(mo2[COL.SUMMARY - 1]).indexOf('قطعه صوتی') === -1,
   mo2 ? String(mo2[COL.PARTS - 1]) : 'ساخته نشد');

// ------------------------------------------------------- date round-trip
console.log('\n=== ۴) تاریخِ آیتمِ ترکیبی ===');
const d = mo2 ? String(mo2[COL.DATE - 1]) : '';
ok('تاریخ به قالب متنیِ بانک است، نه Date.toString()',
   /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(d.trim()), JSON.stringify(d));
// simulate Sheets coercing the staged dates into Date objects, then assemble
emptySources();
const R5 = [ crow('DTEST', 1, 4), crow('DTEST', 2, 4), crow('DTEST', 3, 4) ];
R5[0][ix('Timestamp')] = '2026-06-10 08:00:00';
R5[1][ix('Timestamp')] = '2026-06-15 08:00:00';   // newest
R5[2][ix('Timestamp')] = '2026-06-02 08:00:00';
global.__SS['LOSS_SHEET'].getSheets()[0]._d = [HDR.slice()].concat(R5.map(r => r.slice()));
for (const k of Object.keys(global.__PROPS))
  if (k.indexOf(PK.CUR_PREFIX) === 0) delete global.__PROPS[k];
un = quiet(); syncCatalog(); un();
// coerce the staged date cells to real Date objects, the way Sheets would.
// (the group must still be staged: 3 of 3 arrive at once, so force a partial feed)
const ct = hub.getSheetByName(CFG.CHUNK_TAB);
if (ct.getLastRow() < 2) throw new Error('انتظار می‌رفت قطعه‌ها در انبار باشند');
const cvals = ct.getRange(2, 1, ct.getLastRow() - 1, CHUNK_HEADERS.length).getValues();
cvals.forEach(r => {
  if (r[CH.ID] !== 'DTEST') return;
  const m = String(r[CH.DATE]).match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (m) r[CH.DATE] = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
});
ct.getRange(2, 1, cvals.length, CHUNK_HEADERS.length).setValues(cvals);
// force assembly by ageing the rows
const cv2 = ct.getRange(2, 1, ct.getLastRow() - 1, CHUNK_HEADERS.length).getValues();
cv2.forEach(r => { if (r[CH.ID] === 'DTEST') r[CH.ADDED] = '2020-01-01 00:00'; });
ct.getRange(2, 1, cv2.length, CHUNK_HEADERS.length).setValues(cv2);
un = quiet(); syncCatalog(); un();
const dt = findItem('DTEST');
ok('حتی وقتی شیت تاریخ را به Date تبدیل کند، تازه‌ترین تاریخ انتخاب می‌شود',
   !!dt && String(dt[COL.DATE - 1]).indexOf('2026-06-15') === 0,
   dt ? String(dt[COL.DATE - 1]) : 'آیتم نساخت');

// ---------------------------------------------- fabricated source ids
console.log('\n=== ۵) شناسهٔ منبعِ دراوردی ===');
const fakeEp = { sections: [
  { heading: 'الف', narration: 'م', sourceIds: ['REAL1', 'GHOST', 'REAL2'] },
  { heading: 'ب', narration: 'م', sourceIds: ['GHOST2'] },
  { heading: 'ج', narration: 'م', sourceIds: ['REF1'] } ] };
const res = scrubSourceIds_(fakeEp, [{ id: 'REAL1' }, { id: 'REAL2' }], [{ id: 'REF1' }]);
ok('شناسه‌های ناموجود حذف شدند', res.invalid === 2 &&
   fakeEp.sections[0].sourceIds.join(',') === 'REAL1,REAL2' &&
   fakeEp.sections[1].sourceIds.length === 0 &&
   fakeEp.sections[2].sourceIds.join(',') === 'REF1');
ok('بخشِ بی‌منبع گزارش شد', res.sectionsWithoutSource === 1);

// -------------------------------------------------- dashboard stamp row
console.log('\n=== ۶) داشبورد ===');
const idxRows = readIndex_(hub) || [];
ok('سطرِ مُهرِ زمانی به‌عنوان دسته خوانده نمی‌شود',
   !idxRows.some(r => String(r.name).indexOf('آخرین به‌روزرسانی') !== -1),
   idxRows.length + ' دسته');
const validNames = TAXONOMY.map(t => t.title).concat([MISC_TITLE]);
ok('همهٔ نام‌های داشبورد نامِ دستهٔ واقعی‌اند',
   idxRows.every(r => validNames.indexOf(r.name) !== -1));

// ------------------------------------------------------- cursor keys
console.log('\n=== ۷) کلید مکان‌نما ===');
ok('تب‌های Video_Analysis و Video-Analysis کلید یکسان نمی‌گیرند',
   srcCursorKey_('x', 'Video_Analysis') !== srcCursorKey_('x', 'Video-Analysis'),
   srcCursorKey_('x', 'Video_Analysis') + ' vs ' + srcCursorKey_('x', 'Video-Analysis'));
ok('دو منبع اول کلید قدیمی خود را نگه داشتند',
   srcCursorKey_('video', 'S1') === PK.CUR_VIDEO && srcCursorKey_('photo', 'S1') === PK.CUR_PHOTO);



// ============ ۸) پاسِ وفاداری و ترمیم JSON — از گزارش روز اول ============
console.log('\n=== ۸) پاسِ وفاداری پیش از صداگذاری ===');
const srcItems = [
  { id: 'S1', topic: 'روایت امیرالمؤمنین دربارهٔ آخرالزمان', msg: 'نشانه‌های آخرالزمان',
    summary: 'سخنرانی دربارهٔ نشانه‌های آخرالزمان و تحریف مفاهیم دینی',
    body: 'خمر را به نام نبیذ حلال میشمرند و رشوه را به نام هدیه و خیانت را به نام امانت.' },
  { id: 'S2', topic: 'زن مسن در مراسم', msg: 'حضور عزاداران',
    summary: 'زنِ مسنی با چادرِ مشکی کنارِ چادرِ مسافرتی، با شور و حرارت فراوان همگام با نوحه احساسات خود را ابراز می‌کند',
    body: '' }
];
const badEp = { sections: [
  { heading: 'بخش چهار',
    narration: 'او می‌گوید «خمر را به نام نبیذ و رشوه را به نام هدایت و هدیه حلال می‌دانند» و ' +
               'این نشانهٔ روزگار ماست.',
    sourceIds: ['S1'] },
  { heading: 'بخش پنج',
    narration: 'در تصویر، زنِ مسنی با چادرِ مشکی دیده می‌شود. ' +
               'این یک جملهٔ بسیار بسیار طولانی است که عمداً از سی کلمه بیشتر شده تا بررسی شود ' +
               'که آیا سنجهٔ طول جمله کار می‌کند یا نه و آیا گوینده می‌تواند آن را با یک نفس ' +
               'بخواند یا اصلاً نمی‌تواند و نفس کم می‌آورد وسط کار.',
    sourceIds: ['S2'] },
  { heading: 'بخش شش', narration: 'اين متن حاوی نویسهٔ عربی است و كلمه‌اى با ي عربی دارد.',
    sourceIds: ['S1'] }
] };
const flags = fidelityCheck_(badEp, srcItems);
flags.forEach(f => console.log('  • [' + f.kind + '] «' + f.section + '»: ' + f.text.slice(0, 80)));
const kinds = flags.map(f => f.kind);
ok('نقل‌قولِ تحریف‌شده گرفته شد', kinds.indexOf('نقل‌قول') !== -1);
ok('جملهٔ بالای سی کلمه گرفته شد', kinds.indexOf('جملهٔ بلند') !== -1);
ok('نویسهٔ عربی گرفته شد', kinds.indexOf('نویسهٔ عربی') !== -1);

const goodEp = { sections: [
  { heading: 'یک',
    narration: 'در روایت آمده است «خمر را به نام نبیذ حلال میشمرند و رشوه را به نام هدیه» و ' +
               'همین نشانهٔ انحراف است.',
    sourceIds: ['S1'] }
] };
const gf = fidelityCheck_(goodEp, srcItems);
ok('نقل‌قولِ درست علامت نمی‌خورد', gf.filter(f => f.kind === 'نقل‌قول').length === 0,
   gf.length + ' نشانهٔ دیگر');

console.log('\n=== ۹) ترمیم JSONِ خرابِ وسطِ متن ===');
// شکل واقعیِ خطای روز اول: خرابی در وسط آرایه، نه در انتها
const good = { theme: 'نخ', chosen: [] };
for (let i = 0; i < 30; i++) good.chosen.push({ id: 'ID' + i, why: 'دلیل شمارهٔ ' + i + ' که کمی طولانی است' });
let raw = JSON.stringify(good, null, 1);
const at = raw.indexOf('"ID20"');
const broken = raw.slice(0, at + 40) + '\n  ###\n' + raw.slice(at + 40);   // زبالهٔ وسط آرایه
let nativeErr = '';
try { JSON.parse(broken); } catch (e) { nativeErr = e.message; }
console.log('  خطای اصلی:', nativeErr.slice(0, 70));
const noHint = repairJson_(broken);
const withHint = repairJson_(broken, nativeErr);
console.log('  بدون راهنمای موقعیت:', noHint ? (noHint.chosen || []).length + ' عنصر' : 'ناموفق');
console.log('  با راهنمای موقعیت  :', withHint ? (withHint.chosen || []).length + ' عنصر' : 'ناموفق');
ok('با راهنمای موقعیت، بخشِ سالم نجات پیدا می‌کند',
   withHint && withHint.chosen && withHint.chosen.length >= 15,
   withHint ? withHint.chosen.length + ' از ۳۰ عنصر' : 'ناموفق');
ok('هم‌چنان JSONِ بریده از انتها را می‌بندد', (() => {
  const t = raw.slice(0, raw.length - 120);
  const f = repairJson_(t, 'Unexpected end of JSON input');
  return f && f.chosen && f.chosen.length >= 20;
})());

console.log('\n=== ۱۰) حذف تکراری محتوایی ===');
const spA = { id: 'A', score: 60, topic: 'جنگ با یهود', msg: 'دو جنگ',
  summary: 'سخنرانی دربارهٔ دو جنگ با یهود در آخرالزمان و نشانه‌های آن',
  body: 'ما با یهود دو جنگ داریم یکی در زمان پیامبر بود و دیگری در آخرالزمان رخ خواهد داد و این وعدهٔ قطعی است' };
const spB = { id: 'B', score: 55, topic: 'جنگ با یهود', msg: 'دو جنگ',
  summary: 'سخنرانی دربارهٔ دو جنگ با یهود در آخرالزمان و نشانه های آن',
  body: 'ما با یهود دو جنگ داریم، یکی در زمان پیامبر بود و دیگری در آخرالزمان رخ خواهد داد و این وعده قطعی است' };
const spC = { id: 'C', score: 58, topic: 'نماز شب', msg: 'فضیلت',
  summary: 'سخنرانی دربارهٔ فضیلت نماز شب و آثار آن در زندگی مؤمن و آرامش دل',
  body: 'نماز شب از بهترین عبادات است و در روایات فضیلت فراوانی برایش ذکر شده و مؤمن را به آرامش می‌رساند' };
const dd = dedupeSimilar_([spA, spB, spC]);
console.log('  سه آیتم (دو تای اول یک سخنرانی) →', dd.length, 'ماند:', dd.map(x => x.id).join('، '));
ok('دو رونوشت از یک سخنرانی یکی شدند', dd.length === 2);
ok('نسخهٔ پرامتیازتر ماند', dd.some(x => x.id === 'A') && dd.some(x => x.id === 'C'));



console.log('\n=== ۱۱) پوستهٔ ناقصِ پاسخ API ===');
(function () {
  const good = { candidates: [{ content: { parts: [{ text: JSON.stringify({
    theme: 'نخ', chosen: [{ id: 'A' }, { id: 'B' }] }) }] } }] };
  const full = JSON.stringify(good);
  const cut = full.slice(0, full.length - 25);          // اتصال وسط کار برید
  let stub = null;
  global.__STUB = () => ({ code: 200, json: null, raw: cut });
  const realFetch = global.UrlFetchApp.fetch;
  global.UrlFetchApp.fetch = () => ({ getResponseCode: () => 200, getContentText: () => cut });
  let threwRaw = false, got = null;
  try { got = geminiFetch_('https://x', {}); }
  catch (e) { threwRaw = /Expected|Unexpected|Unterminated/.test(e.message) &&
                          e.message.indexOf('پاسخ API ناقص') === -1; }
  global.UrlFetchApp.fetch = realFetch;
  console.log('  خروجی:', got ? 'ترمیم شد' : 'ترمیم نشد', '| خطای خام تا بالا رفت:', threwRaw);
  ok('پوستهٔ ناقص یا ترمیم می‌شود یا با پیام روشن برمی‌گردد', !threwRaw);
})();

console.log('\n✅ هر ' + pass + ' آزمونِ اصلاحاتِ بازبینی گذشت.');
