/* نسخهٔ ۵٫۲ — داوریِ محتوایی، دسته‌بندیِ واقعی، پوشهٔ هر قسمت، و پشتیبانِ شیت‌ها.
   عمداً آرشیوی ساخته می‌شود که نامِ فایل‌هایش گمراه‌کننده است: چیزی که اسمش
   «دوره» است ولی روضه است، و چیزی که اسمش بی‌معنی است ولی درسِ واقعی است. */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread, DFolder } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs',
               '14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
let un;

// ─────────────────────────────── fixtures ──────────────────────────────────
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
const when = i => { const d = new Date(D0.getTime() - (400 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };

// دو جور متن: درسِ واقعی، و روضه. نامِ فایل عمداً برعکسِ محتواست.
const LESSON = n => 'دقیقهٔ ' + n + '. مدرس مفهومِ شمارهٔ ' + n + ' را تعریف می‌کند، روی نمودار ' +
  'نشان می‌دهد، یک مثال حل می‌کند و اشتباهِ رایج را می‌گوید. ' +
  ('توضیحِ گام‌به‌گام با تمرین و مثالِ عملی برای همین مفهوم. ').repeat(60);
const ROWZE = n => 'بندِ ' + n + '. مداح مرثیه می‌خواند و جمعیت سینه می‌زند. ' +
  ('نوحه و مرثیه‌خوانی و ذکر مصیبت در مجلس عزاداری. ').repeat(60);

function tRow(fid, name, no, tot, ts, textFn) {
  const r = new Array(TVH.length).fill('');
  r[0]=ts; r[1]=fid; r[2]=name; r[4]='https://drive.google.com/file/d/'+fid+'/view';
  r[5]='بله'; r[6]=no; r[7]=tot; r[8]=((no-1)*60)+'-'+(no*60)+' ثانیه'; r[9]=tot*60+' ثانیه';
  r[13]=textFn(no); r[21]='خلاصهٔ '+no; r[22]='SUCCESS';
  return r;
}

const rows = [];
// «۰۱_دوره_جامع_تحلیل» — اسمش دوره است، محتوایش روضه
for (let i=1;i<=9;i++) rows.push(tRow('RZ','01_Dowreh_Jame_Rowze.mp4', i, 9, when(i), ROWZE));
// «فایل ۲۲۳۴» — اسمش بی‌معنی است، محتوایش درسِ واقعی
for (let i=1;i<=11;i++) rows.push(tRow('LS','matne khoroji jalase.mp4', i, 11, when(30+i), LESSON));
// یک دورهٔ دوقسمتیِ آموزشی
for (let i=1;i<=9;i++) rows.push(tRow('CA','01_MabaniBazar_Ostad.mp4', i, 9, when(60+i), LESSON));
for (let i=1;i<=9;i++) rows.push(tRow('CB','02_MabaniBazar_Ostad.mp4', i, 9, when(70+i), LESSON));

// چند کلیپِ کوتاهِ مستقل، تا برنامهٔ متنوع هم مادهٔ کافی داشته باشد
for (let i = 1; i <= 16; i++) {
  const r = new Array(TVH.length).fill('');
  r[0]=when(120+i); r[1]='CLIP'+i; r[2]='کلیپ کوتاه ' + i + '.mp4';
  r[4]='https://drive.google.com/file/d/CLIP'+i+'/view';
  r[5]='خیر'; r[9]='90 ثانیه';
  r[13]='گفت‌وگوی کوتاه دربارهٔ بازار و تحلیل و سرمایه‌گذاری شمارهٔ ' + i + '. ' +
        ('نکتهٔ کاربردی دربارهٔ معامله و مدیریت ریسک و نمودار قیمت. ').repeat(30);
  r[14]='فضای گرم و صمیمی'; r[15]='تحلیل تخصصیِ بازار و اندیکاتور و کندل';
  r[17]=JSON.stringify({Topic:'بازار و ترید '+i, Message:'پیامِ '+i});
  r[21]='خلاصهٔ کلیپ ' + i; r[22]='SUCCESS';
  rows.push(r);
}

function mkSheet(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 20); });
  global.__SS[id] = ss; return ss;
}
const SRC = {}; CFG.SOURCES.forEach(s => SRC[s.key] = s);
mkSheet(SRC.trading.id, [{ name: 'Video Analysis', hdr: TVH, rows: rows }]);
CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
  ss.insertSheet('S1'); global.__SS[s.id] = ss; } });

// پوشهٔ پشتیبان جداست تا با OUTPUT قاطی نشود
const BK = global.DriveApp.__register(CFG.BACKUP_FOLDER_ID, 'BACKUP');

global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
global.__PROPS['TELEGRAM_CHAT_ID'] = '123';

let judgePrompts = [], tgMsgs = [];
global.__STUB = function (url, body) {
  if (url.indexOf('api.telegram.org') !== -1) {
    tgMsgs.push((body && body.text) || '');
    return { code: 200, json: { ok: true, result: { message_id: tgMsgs.length } } };
  }
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  if (url.indexOf('tts') !== -1) return { code: 200, json: { candidates: [{ content: { parts: [{
    inlineData: { data: Buffer.alloc(20000).toString('base64') } }] } }] } };
  const t = body.contents ? body.contents[0].parts[0].text : '';

  // ── داور: تصمیمش را از خودِ متنِ نمونه می‌گیرد، نه از نامِ فایل ──
  if (t.indexOf('یک داوری بده') !== -1) {
    judgePrompts.push(t);
    const blocks = t.split('─────────────────────────────────').slice(1, -1);
    const verdicts = [];
    for (const b of blocks) {
      const km = b.match(/key:\s*(.+)/);
      if (!km) continue;
      const key = km[1].trim();
      const isRowze = b.indexOf('مرثیه') !== -1 || b.indexOf('سینه می‌زند') !== -1;
      verdicts.push({
        key: key,
        isCourse: !isRowze,
        score: isRowze ? 8 : 85,
        kindOfContent: isRowze ? 'مرثیه و روضه' : 'دورهٔ آموزشی',
        about: isRowze ? 'مجلسِ عزاداری و مرثیه‌خوانی است؛ درسی در آن گفته نمی‌شود.'
                       : 'آموزشِ گام‌به‌گامِ مفهوم‌های تحلیل بازار با مثال و تمرین.',
        topic: isRowze ? 'مرثیه' : 'تحلیل بازار',
        category: isRowze ? 'مذهبی و معنوی' : 'مالی، ترید و اقتصاد',
        level: key.indexOf('mabani') !== -1 ? 'مقدماتی' : 'پیشرفته',
        related: '', orderHint: key.indexOf('mabani') !== -1 ? 1 : 4,
        why: isRowze ? 'متنِ نمونه مرثیه و نوحه است، نه درس.'
                     : 'متن مفهوم تعریف می‌کند و مثال و تمرین دارد.'
      });
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify({ verdicts: verdicts }) }] } }] } };
  }
  if (t.indexOf('قاعده‌های سختِ این برنامه') !== -1) {
    const nos = [...t.matchAll(/--- قطعهٔ (\d+)/g)].map(m => Number(m[1]));
    const W = todayWords_();
    const per = Math.max(1, Math.ceil(nos.length / 6));
    const secs = [];
    for (let k = 0; k < 6; k++) secs.push({ heading: 'بخشِ ' + (k+1),
      narration: ('متنِ آموزشیِ بخشِ ' + (k+1) + ' با توضیحِ کامل و مثال. ').repeat(120),
      tone: 'آرام', chunkNos: nos.slice(k*per, (k+1)*per), enrichIds: [] });
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'عنوانِ درس', hook: CFG.SPECIAL_SHOW_NAME + '. امروز ' + W.weekday + '، ' + W.jalali + '.',
      recap: '', goal: { problem: 'م', behavior: 'ر', message: 'پ' },
      sections: secs, outro: 'پایان.', summary: 'خلاصه.', tags: ['برچسب'],
      coverage: 'پوشش' }) }] } }] } };
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

// ═══════════════ ۱) داوری از روی محتوا، نه از روی نامِ فایل ════════════════
console.log('=== ۱) داوری از روی متنِ واقعی، نه نامِ فایل ===');
un = quiet(); const jr = judgeSeries(true, new Date().getTime() + 300000); un();
console.log('  داوری‌شده:', jr.judged, '| مانده:', jr.left);
ok('همهٔ مجموعه‌ها داوری شدند', jr.judged >= 3, JSON.stringify(jr));
ok('پرامپتِ داوری واقعاً متنِ قطعه‌ها را برد، نه فقط نام را',
   judgePrompts.length > 0 && judgePrompts[0].indexOf('— متنِ نمونه —') !== -1 &&
   (judgePrompts[0].indexOf('مرثیه') !== -1 || judgePrompts[0].indexOf('مدرس') !== -1));

const reg1 = readSeriesReg_(hub);
reg1.rows.forEach(r => console.log('   ', r.key.padEnd(22),
  String(r.vals[SC.IS_COURSE-1]).padEnd(5), String(r.vals[SC.CSCORE-1]).padStart(3),
  String(r.vals[SC.CAT-1]).padEnd(20), String(r.vals[SC.LEVEL-1]).padEnd(9),
  'ترتیب ' + String(r.vals[SC.ORDER-1] || '—')));

const rowze = reg1.rows.find(r => r.key.indexOf('rowze') !== -1);
const oddName = reg1.rows.find(r => r.key.indexOf('khoroji') !== -1);
const course = reg1.rows.find(r => r.key.indexOf('mabani') !== -1);

ok('فایلی که اسمش «دوره» است ولی محتوایش روضه است، آموزشی حساب نشد',
   rowze && String(rowze.vals[SC.IS_COURSE-1]) === SJ.NO,
   rowze ? rowze.key + '=' + rowze.vals[SC.IS_COURSE-1] : 'پیدا نشد');
ok('و دلیلش هم به زبانِ آدمیزاد ثبت شد',
   rowze && /مرثیه|روضه|نوحه/.test(String(rowze.vals[SC.WHY-1])),
   String(rowze.vals[SC.WHY-1]).slice(0, 60));
ok('فایلی که اسمش بی‌معنی است ولی محتوایش درس است، آموزشی شناخته شد',
   oddName && String(oddName.vals[SC.IS_COURSE-1]) === SJ.YES,
   oddName ? oddName.key : 'پیدا نشد');
ok('و شرحِ یک‌خطی گرفت تا بفهمم موضوعش چیست',
   oddName && String(oddName.vals[SC.ABOUT-1]).length > 20,
   String(oddName.vals[SC.ABOUT-1]).slice(0, 60));
ok('امتیازِ آموزشی هم ثبت شد', Number(course.vals[SC.CSCORE-1]) > 50,
   String(course.vals[SC.CSCORE-1]));
ok('تاریخِ داوری ثبت شد', !!String(course.vals[SC.JUDGED-1]).trim());

// ═══════════════════ ۲) دسته‌بندی و اولویت‌بندیِ واقعی ══════════════════════
console.log('\n=== ۲) دسته‌بندی و اولویت‌بندی ذیل هر دسته ===');
ok('دستهٔ روضه از دستهٔ دوره جدا شد',
   seriesCatOf_(rowze.vals) !== seriesCatOf_(course.vals),
   seriesCatOf_(rowze.vals) + ' ≠ ' + seriesCatOf_(course.vals));
ok('دستهٔ مجموعهٔ آموزشی از داوری آمد، نه از حدسِ اسم',
   seriesCatOf_(course.vals) === 'مالی، ترید و اقتصاد', seriesCatOf_(course.vals));
ok('غیرآموزشی شمارهٔ اولویت نگرفت (در صفِ درس‌نامه نیست)',
   !String(rowze.vals[SC.ORDER-1] || '').trim(), String(rowze.vals[SC.ORDER-1]));
ok('درونِ دسته، مقدماتی اولویت ۱ گرفت',
   Number(course.vals[SC.ORDER-1]) === 1, String(course.vals[SC.ORDER-1]));
ok('و پیشرفته بعد از آن', Number(oddName.vals[SC.ORDER-1]) >= 2,
   String(oddName.vals[SC.ORDER-1]));

const bd = seriesBoardData_(hub);
console.log('  دسته‌های تخته:', bd.groups.map(x => x.cat + '(' + x.series.length + ')').join(' · '),
            '| کنارگذاشته:', bd.excluded.length);
ok('تخته فقط آموزشی‌ها را زیر دسته‌ها می‌چیند',
   bd.groups.every(gp => gp.series.every(x => x.isCourse !== false)));
ok('و غیرآموزشی در بخشِ جدا فهرست شد', bd.excluded.length === 1 &&
   bd.excluded[0].key === rowze.key, bd.excluded.map(x => x.key).join(','));
ok('با دلیلش', /مرثیه|روضه/.test(String(bd.excluded[0].why)));
const html = seriesBoardHtml_(bd);
fs.writeFileSync('/tmp/board_curate.html', html);
ok('در پنجره هم بخشِ «آموزشی تشخیص داده نشد» دیده می‌شود',
   html.indexOf('آموزشی تشخیص داده نشد') !== -1);
ok('و شرحِ یک‌خطیِ هر مجموعه در پنجره آمده',
   html.indexOf(String(oddName.vals[SC.ABOUT-1]).slice(0, 30)) !== -1);
ok('دکمهٔ «آموزشی است» برای تصمیمِ دستی هست',
   /data-act="course"/.test(html) && html.indexOf('آموزشی است</button>') !== -1);

// ═══════════════════ ۳) تولید فقط از آموزشی‌ها ═════════════════════════════
console.log('\n=== ۳) تولید سراغِ محتوای غیرآموزشی نمی‌رود ===');
const runAll = () => { const r = produceSpecialEpisode();
  let d = 0; while (global.__PROPS[PK.SP_PENDING] && d++ < 60) produceSpecialContinue(); return r; };
un = quiet(); const made = []; let gg = 0;
while (gg++ < 4) { const r = runAll(); if (r && r.ok) made.push(String(r.series)); }
un();
console.log('  ساخته‌شده:', made.join(' | ') || 'هیچ');
ok('هیچ قسمتی از مجموعهٔ روضه ساخته نشد',
   made.every(x => x.indexOf('Rowze') === -1), made.join(' | '));
ok('اولین قسمت از مقدماتی‌ترین مجموعهٔ آموزشی بود',
   made.length && made[0].indexOf('MabaniBazar') !== -1, made[0] || '—');
ok('و ردیفِ روضه هنوز در رجیستری هست (دور ریخته نشد)',
   !!readSeriesReg_(hub).byKey[rowze.key]);
ok('پس در برنامهٔ متنوع هم قابل استفاده است (ردیف‌هایش در بانک هستند)', (() => {
  let found = 0;
  TAXONOMY.concat([{ title: MISC_TITLE }]).forEach(tx => {
    const sh = hub.getSheetByName(tx.title);
    if (!sh || sh.getLastRow() < 2) return;
    const v = sh.getRange(2, 1, sh.getLastRow()-1, HUB_HEADERS.length).getValues();
    v.forEach(r => { if (String(r[COL.ID-1]) === 'RZ') found++; });
  });
  return found > 0;
})());

// ═══════════════════ ۴) تصمیمِ دستیِ کاربر مقدم است ════════════════════════
console.log('\n=== ۴) نظرِ دستیِ کاربر بر داوری مقدم است ===');
un = quiet(); const sc = uiSetCourse(rowze.key, 'course'); un();
ok('«آموزشی است» ثبت شد', sc.ok === true, String(sc.message).slice(0, 60));
const reg2 = readSeriesReg_(hub);
ok('و در ستونِ تصمیم دستی نوشته شد',
   String(reg2.byKey[rowze.key].vals[SC.MANUAL-1]) === SMAN.YES);
ok('حالا اولویت هم گرفت', Number(reg2.byKey[rowze.key].vals[SC.ORDER-1]) >= 1,
   String(reg2.byKey[rowze.key].vals[SC.ORDER-1]));
const bd2 = seriesBoardData_(hub);
ok('از بخشِ کنارگذاشته‌ها بیرون آمد و زیر دستهٔ خودش نشست',
   bd2.excluded.length === 0 &&
   bd2.groups.some(x => x.series.some(y => y.key === rowze.key)));
un = quiet(); judgeSeries(true, new Date().getTime() + 120000); un();
ok('داوریِ بعدی هم نظرِ شما را بازنویسی نمی‌کند',
   String(readSeriesReg_(hub).byKey[rowze.key].vals[SC.MANUAL-1]) === SMAN.YES);
un = quiet(); uiSetCourse(rowze.key, 'notcourse'); un();
ok('و می‌شود دوباره کنارش گذاشت',
   String(readSeriesReg_(hub).byKey[rowze.key].vals[SC.MANUAL-1]) === SMAN.NO);

// ═══════════════ ۵) انتخاب دستی از داوری هم بالاتر است ═════════════════════
console.log('\n=== ۵) انتخابِ دستی (سنجاق) حتی بر داوری هم مقدم است ===');
un = quiet(); uiSetCourse(rowze.key, 'auto'); judgeSeries(true, new Date().getTime()+120000);
setSeriesPin_('series', rowze.key); un();
const pinnedRec = pickSeries_(hub);
console.log('  انتخابِ موتور با سنجاقِ روی مجموعهٔ غیرآموزشی:', pinnedRec ? pinnedRec.key : 'هیچ');
ok('مجموعهٔ سنجاق‌شده انتخاب می‌شود حتی اگر داوری آموزشی‌اش نداند',
   pinnedRec && pinnedRec.key === rowze.key, pinnedRec ? pinnedRec.key : 'هیچ');
const bd3 = seriesBoardData_(hub);
ok('و در بخشِ کنارگذاشته‌ها نشان داده نمی‌شود (چون الان روی آن کار می‌شود)',
   bd3.excluded.every(x => x.key !== rowze.key));
un = quiet(); clearSeriesPin_(); un();
ok('با برداشتنِ سنجاق دوباره کنار می‌رود',
   seriesBoardData_(hub).excluded.some(x => x.key === rowze.key));

// ═══════════════ ۶) مجموعهٔ تازه خودش جای خودش را پیدا می‌کند ══════════════
console.log('\n=== ۶) مجموعهٔ تازه: خودکار اضافه، داوری، و در جایگاهِ درست ===');
const tsh = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
for (let i=1;i<=9;i++) tsh._d.push(tRow('NEW','01_MabaniMoghadamati_Ostad.mp4', i, 9, when(200+i), LESSON));
tsh._max = tsh._d.length + 20;
global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';
un = quiet(); let h = 0; while (h++ < 20) syncCatalog(); un();
const reg3 = readSeriesReg_(hub);
ok('مجموعهٔ تازه بی هیچ دکمه‌ای در فهرست آمد', !!reg3.byKey['mabanimoghadamati ostad'],
   reg3.rows.length + ' مجموعه');
un = quiet(); judgeSeries(false, new Date().getTime() + 120000); un();
const fresh = readSeriesReg_(hub).byKey['mabanimoghadamati ostad'];
ok('و خودکار داوری شد', String(fresh.vals[SC.IS_COURSE-1]) === SJ.YES,
   String(fresh.vals[SC.IS_COURSE-1]));
ok('و ذیل دستهٔ درستش نشست', seriesCatOf_(fresh.vals) === 'مالی، ترید و اقتصاد',
   seriesCatOf_(fresh.vals));
ok('و شمارهٔ اولویت گرفت', Number(fresh.vals[SC.ORDER-1]) >= 1, String(fresh.vals[SC.ORDER-1]));
const finGroup = seriesBoardData_(hub).groups.find(x => x.cat === 'مالی، ترید و اقتصاد');
console.log('  ترتیبِ دستهٔ مالی:', finGroup.series.map(x =>
  x.order + '.' + x.name + '(' + x.level + ')').join(' → '));
ok('و درونِ دسته، مقدماتی‌ها پیش از پیشرفته‌اند', (() => {
  let lastLv = -1;
  for (const x of finGroup.series) {
    if (x.status === SST.ACTIVE) continue;         // جاری همیشه بالای دسته است
    if (x.levelRank < lastLv) return false;
    lastLv = x.levelRank;
  }
  return true;
})(), finGroup.series.map(x => x.level).join(' → '));

// ═══════════════════════ ۷) پوشهٔ هر قسمت با پیوست‌هایش ════════════════════
console.log('\n=== ۷) هر قسمت، پوشهٔ خودش با همهٔ پیوست‌ها ===');
un = quiet(); const rv = produceEpisode();
let d2 = 0; while (global.__PROPS[PK.PENDING] && d2++ < 80) produceEpisodeContinue(); un();
console.log('  تولیدِ متنوع:', JSON.stringify(rv).slice(0, 120));
const vFolder = showFolder_(CFG.VARIETY_FOLDER);
const sFolder = showFolder_(CFG.SPECIAL_FOLDER);
const listFolders = f => { const o = []; const it = f.getFolders();
  while (it.hasNext()) o.push(it.next()); return o; };
const listFiles = f => { const o = []; const it = f.getFiles();
  while (it.hasNext()) o.push(it.next()); return o; };
const vEps = listFolders(vFolder);
// ساختارِ درس‌نامه از نسخهٔ ۵٫۱۱: «درس‌نامه / <دسته> / نامِ دوره / قسمت NNN».
// دوره‌ها زیرِ پوشهٔ دستهٔ خودشان می‌نشینند؛ پوشهٔ قسمت را در هر عمقی با «داشتنِ
// فایل» می‌شناسیم (پوشه‌های دسته و دوره فقط زیرپوشه دارند، نه فایلِ قسمت).
const deepEps = (root) => {
  const out = [];
  (function walk(f, depth) {
    listFolders(f).forEach(s => {
      if (listFiles(s).length > 0) out.push(s);
      if (listFolders(s).length > 0 && depth < 4) walk(s, depth + 1);
    });
  })(root, 0);
  return out;
};
const sCourses = listFolders(sFolder);
const sEps = deepEps(sFolder);
console.log('  پوشه‌های ریشهٔ درس‌نامه:', sCourses.map(f => f.getName()).join(' | '));
console.log('  پوشهٔ قسمت‌ها — متنوع:', vEps.length, '· درس‌نامه:', sEps.length);
ok('برنامهٔ متنوع پوشهٔ قسمت ساخت', vEps.length >= 1);
ok('درس‌نامه هم پوشهٔ قسمت دارد', sEps.length >= 1);
const chk = f => { const fs2 = listFiles(f).map(x => x.getName());
  return { wav: fs2.filter(n => /\.wav$/i.test(n)).length,
           html: fs2.filter(n => /\.html$/i.test(n)).length,
           json: fs2.filter(n => /\.json$/i.test(n)).length, all: fs2 }; };
const vc = chk(vEps[0]);
const sc2 = chk(sEps.find(f => listFiles(f).some(x => /\.wav$/i.test(x.getName()))) || sEps[0]);
console.log('  متنوع:', JSON.stringify({ wav: vc.wav, html: vc.html, json: vc.json }),
            '· درس‌نامه:', JSON.stringify({ wav: sc2.wav, html: sc2.html, json: sc2.json }));
ok('پوشهٔ قسمتِ متنوع صدا و متن و بایگانی دارد',
   vc.wav >= 1 && vc.html >= 1 && vc.json >= 1, vc.all.join(' , ').slice(0, 90));
ok('پوشهٔ قسمتِ درس‌نامه هم همین‌طور',
   sc2.wav >= 1 && sc2.html >= 1 && sc2.json >= 1, sc2.all.join(' , ').slice(0, 90));
ok('نامِ پوشه شمارهٔ قسمت و تاریخ دارد',
   /قسمت\s*\d+\s*—\s*\d{8}/.test(faDigits_(vEps[0].getName())), vEps[0].getName());
ok('قسمت‌های درس‌نامه ذیل پوشهٔ دورهٔ خودشان‌اند',
   sCourses.length >= 1 && sEps.length >= 1,
   sCourses.length + ' دوره · ' + sEps.length + ' قسمت');

// فایلِ سرگردانِ قدیمی: باید به پوشهٔ قسمتِ خودش برود
console.log('\n=== ۷ب) فایلِ سرگردانِ نسخه‌های قبلی سامان می‌گیرد ===');
const stray = vFolder.createFile(Utilities.newBlob('x', 'audio/wav',
  CFG.SHOW_NAME + ' — قسمت 0001 — عنوانِ قدیمی — بخش 1.wav'));
const strayRoot = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).createFile(
  Utilities.newBlob('y', 'text/html', CFG.SPECIAL_SHOW_NAME + ' — دورهٔ کهنه — قسمت 001 — عنوان.html'));
un = quiet(); const org = organizeEpisodeFolders(false); un();
console.log('  جابه‌جا:', org.moved, '· پوشهٔ تازه:', org.made, '· رد:', org.skipped);
ok('فایل‌های سرگردان جابه‌جا شدند', org.moved >= 2, JSON.stringify({moved: org.moved}));
ok('و دیگر در ریشهٔ پوشهٔ برنامه نیستند',
   listFiles(vFolder).every(f => f.getName().indexOf('قسمت 0001') === -1));
ok('در پوشهٔ قسمتِ درست نشستند', (() => {
  const all = deepEps(vFolder).concat(deepEps(sFolder));
  return all.some(f => listFiles(f).some(x => x.getName().indexOf('عنوانِ قدیمی') !== -1)) &&
         all.some(f => listFiles(f).some(x => x.getName().indexOf('دورهٔ کهنه') !== -1));
})());
ok('اجرای دوباره چیزی را خراب نمی‌کند', (() => {
  un = quiet(); const again = organizeEpisodeFolders(false); un();
  return again.moved === 0;
})());

// ══════════════════════════ ۸) پشتیبانِ شیت‌ها ═════════════════════════════
console.log('\n=== ۸) پشتیبان‌گیریِ شبانه از شش شیت ===');
tgMsgs = [];
un = quiet(); const bk = runBackupStep(true); un();
console.log('  نتیجه:', JSON.stringify({ ok: bk.ok, done: bk.done, failed: bk.failed }));
ok('پشتیبان گرفته شد', bk.ok === true && bk.done >= 5, JSON.stringify(bk).slice(0, 90));
const bkFolders = listFolders(BK);
ok('یک پوشهٔ تاریخ‌دار در پوشهٔ پشتیبان ساخته شد',
   bkFolders.length === 1 && /^پشتیبان — \d{4}-\d{2}-\d{2}/.test(bkFolders[0].getName()),
   bkFolders.map(f => f.getName()).join(','));
const bkFiles = listFiles(bkFolders[0]).map(f => f.getName());
console.log('  فایل‌های داخل پشتیبان:', bkFiles.length);
ok('همهٔ پنج شیتِ منبع رونوشت شدند',
   CFG.SOURCES.every(s => bkFiles.some(n => n.indexOf(s.title) === 0)),
   bkFiles.slice(0, 3).join(' | '));
ok('CONTENT-HUB هم رونوشت شد',
   bkFiles.some(n => n.indexOf(CFG.HUB_FILE_NAME) === 0));
ok('فهرستِ JSON نوشته شد', bkFiles.indexOf('_فهرست-پشتیبان.json') !== -1);
ok('فهرستِ خوانا (HTML) هم نوشته شد', bkFiles.indexOf('فهرست پشتیبان.html') !== -1);
const mani = JSON.parse(listFiles(bkFolders[0]).find(f => f.getName() === '_فهرست-پشتیبان.json')
  .getBlob().getDataAsString());
ok('در فهرست، هر شیت با نقش و نوع محتوا و هر دو نشانی ثبت شده',
   mani.items.length >= 6 && mani.items.every(x => x.title && x.role && x.about &&
     x.sourceUrl && x.backupUrl), JSON.stringify(mani.items[0]).slice(0, 120));
// ردیف‌هایی که خودِ آزمون در طولِ کار به شیتِ منبع اضافه کرده، شمرده می‌شوند؛
// مهم این است که پشتیبان‌گیری چیزی به آن اضافه یا از آن کم نکرده باشد.
const srcRowsBeforeBk = (() => {
  const sh = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
  return sh.getLastRow();
})();
un = quiet(); runBackupStep(true); un();
ok('شیت‌های مبدأ هیچ تغییری نکردند (نه نام، نه ردیف)', (() => {
  const sh = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
  return sh.getLastRow() === srcRowsBeforeBk &&
         sh.getName() === 'Video Analysis' &&
         global.__SS[SRC.trading.id]._id === SRC.trading.id;
})());

console.log('  پیام‌های تلگرام:', tgMsgs.length);
const tgAll = tgMsgs.join('\n');
ok('پیام تلگرامِ پشتیبان رفت', tgMsgs.length >= 1);
ok('و نامِ هر شیت در پیام هست',
   CFG.SOURCES.every(s => tgAll.indexOf(s.title) !== -1));
ok('و نوعِ محتوای هر شیت توضیح داده شده', tgAll.indexOf('محتوا:') !== -1);
ok('و نشانیِ شیتِ اصلی در پیام هست',
   CFG.SOURCES.every(s => tgAll.indexOf(s.id) !== -1));
ok('و نشانیِ فایلِ پشتیبان هم در پیام هست',
   (tgAll.match(/drive\.google\.com\/file/g) || []).length >= 5);
ok('و پیام می‌گوید شیت‌های اصلی دست نخورده‌اند', tgAll.indexOf('دست نخوردند') !== -1);
/* از ۵٫۹۱ پشتیبانِ *موفق* ایمیلِ جدا نمی‌گیرد — خبرِ روزمره است و در
   گزارشِ روزانهٔ ساعت ۱۰ با بقیه می‌آید. شکستِ پشتیبان همچنان فوری است.
   سنجه همان چیز را می‌سنجد (خبر به صاحبِ برنامه می‌رسد)، از راهِ تازه. */
ok('خبرش به صاحبِ برنامه می‌رسد — در گزارشِ روزانه، نه ایمیلِ جدا',
   mailQueueRead_().some(x => String(x.title).indexOf('پشتیبانِ شیت‌ها') === 0),
   JSON.stringify(mailQueueRead_().map(x => x.title)));
ok('و ایمیلِ جداگانه‌ای نمی‌فرستد',
   !global.__MAIL.some(m => String(m.subject).indexOf('پشتیبانِ شیت‌ها') === 0));

console.log('\n=== ۸ب) سقفِ روزانه و هرسِ نسخه‌های قدیمی ===');
un = quiet(); const again2 = runBackupStep(false); un();
ok('دو بار در روز پشتیبان نمی‌گیرد', again2.ok === false && again2.reason === 'fresh',
   JSON.stringify(again2));
// چهارده نسخهٔ ساختگی + یکی واقعی → باید به چهارده برسد
un = quiet();
for (let i = 0; i < 16; i++) {
  const f = BK.createFolder('پشتیبان — 2026-0' + (i < 9 ? '1' : '2') + '-' + p2((i % 28) + 1) + ' — 03-00');
  f._created = new Date(Date.now() - (100 - i) * 86400000);
}
const pruned = pruneBackups_(); un();
const left = listFolders(BK).filter(f => f.getName().indexOf('پشتیبان — ') === 0);
console.log('  پاک‌شده:', pruned, '· مانده:', left.length);
ok('فقط ' + CFG.BACKUP_KEEP + ' نسخهٔ آخر ماند', left.length === CFG.BACKUP_KEEP,
   left.length + '');
ok('و تازه‌ترین نسخه پاک نشد', left.some(f => /^پشتیبان — \d{4}-\d{2}-\d{2}/.test(f.getName())));
ok('پوشهٔ غیرپشتیبان دست نخورد', (() => {
  BK.createFolder('یک پوشهٔ دیگر');
  const before = listFolders(BK).length;
  pruneBackups_();
  return listFolders(BK).some(f => f.getName() === 'یک پوشهٔ دیگر');
})());

console.log('\n=== ۸ج) وضعیت و ناظر ===');
un = quiet(); const st = writeStatus_(hub, 'آزمون'); un();
console.log('  ', JSON.stringify({ backup: st.backup && { lastAt: st.backup.lastAt,
  copies: st.backup.copies }, curation: st.curation && { course: st.curation.course,
  notCourse: st.curation.notCourse } }));
ok('وضعیتِ پشتیبان در فایل وضعیت هست', !!(st.backup && st.backup.lastAt));
ok('شمارِ نسخه‌ها هم گزارش می‌شود', st.backup.copies >= 1, String(st.backup.copies));
ok('خلاصهٔ داوری هم در فایل وضعیت هست',
   !!st.curation && typeof st.curation.notCourse === 'number',
   JSON.stringify(st.curation && { c: st.curation.course, n: st.curation.notCourse }));
ok('و فهرستِ کنارگذاشته‌ها با دلیل، برای ناظر می‌رود',
   (st.curation.notCourseList || []).length >= 1 &&
   !!st.curation.notCourseList[0].why);


// ═════════════ ۹) اصلاحاتِ دورِ بازبینی (بلاکرها) ══════════════════════════
console.log('\n=== ۹) سنجاقِ دسته، داوری را کنار نمی‌زند ===');
un = quiet(); clearSeriesPin_(); uiSetCourse(rowze.key, 'auto');
judgeSeries(true, new Date().getTime() + 120000);
const catOfRowze = seriesCatOf_(readSeriesReg_(hub).byKey[rowze.key].vals);
const pc = uiPinCategory(catOfRowze, 'pin'); un();
console.log('  دستهٔ روضه:', catOfRowze, '| پاسخِ سنجاقِ دسته:', pc.ok,
            '|', String(pc.message).slice(0, 60));
ok('سنجاقِ دسته‌ای که فقط محتوای غیرآموزشی دارد رد می‌شود',
   pc.ok === false && seriesPin_() === null, JSON.stringify(pc).slice(0, 80));
un = quiet(); setSeriesPin_('cat', catOfRowze); const pk9 = pickSeries_(hub); un();
ok('و حتی اگر سنجاقِ دسته به‌زور ثبت شود، مجموعهٔ غیرآموزشی انتخاب نمی‌شود',
   !pk9 || pk9.key !== rowze.key, pk9 ? pk9.key : 'هیچ');
const bd9 = seriesBoardData_(hub);
ok('و تخته و موتور یک چیز می‌گویند (تناقضِ قبلی نیست)',
   bd9.excluded.some(x => x.key === rowze.key) &&
   (!bd9.current || bd9.current.key !== rowze.key));
un = quiet(); clearSeriesPin_(); un();

console.log('\n=== ۹ب) نمونه‌برداری از قسمتِ اول و وسط و آخر ===');
(() => {
  const parts = readSeriesParts_(hub);
  const multi = readSeriesReg_(hub).rows.filter(r => (parts.byKey[r.key] || []).length >= 2)[0];
  const smp = sampleSeriesText_(multi, parts.byKey[multi.key]);
  const seen = {};
  String(smp.text).replace(/\[قسمت (\d+)/g, (m, n) => { seen[n] = true; return m; });
  console.log('  مجموعه:', multi.key, '| قسمت‌های نمونه‌برداری‌شده:', Object.keys(seen).join(','));
  ok('نمونه از بیش از یک قسمت برداشته شد (سهمیهٔ هر قسمت جداست)',
     Object.keys(seen).length >= 2, Object.keys(seen).join(','));
})();

console.log('\n=== ۹ج) پاسخِ خرابِ مدل، داوری را نمی‌کشد ===');
(() => {
  const tsh2 = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
  for (let i=1;i<=9;i++) tsh2._d.push(tRow('BADJ','01_DowrehBadJudge_Ostad.mp4', i, 9, when(250+i), LESSON));
  tsh2._max = tsh2._d.length + 20;
  global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';
  un = quiet(); scanSeries(true); un();
  const old = global.__STUB;
  global.__STUB = function (url, body) {
    const t = body && body.contents ? body.contents[0].parts[0].text : '';
    if (t.indexOf('یک داوری بده') !== -1) {
      // یک عضوِ null وسطِ پاسخ — پیش‌تر کلِ داوری را می‌کشت
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        verdicts: [null, { key: 'dowrehbadjudge ostad', isCourse: true, score: 70,
          about: 'درسِ واقعی است.', topic: 'تحلیل', category: 'مالی، ترید و اقتصاد',
          level: 'میانی', why: 'ساختار درسی دارد.' }] }) }] } }] } };
    }
    return old(url, body);
  };
  let threw = null;
  un = quiet();
  try { judgeSeries(false, new Date().getTime() + 120000); } catch (e) { threw = e; }
  un();
  global.__STUB = old;
  ok('عضوِ null در پاسخ، داوری را با خطا نمی‌خواباند', threw === null,
     threw ? threw.message : 'بی‌خطا');
  ok('و داوریِ سالمِ همان پاسخ اعمال شد',
     String(readSeriesReg_(hub).byKey['dowrehbadjudge ostad'].vals[SC.IS_COURSE-1]) === SJ.YES);
})();

console.log('\n=== ۹د) پشتیبان: حالتِ نیمه‌تمامِ مرده کار را قفل نمی‌کند ===');
(() => {
  // یک حالتِ نیمه‌تمام با پوشه‌ای که وجود ندارد
  props_().setProperty(PK.BACKUP_STATE, JSON.stringify({
    folderId: 'FOLDER-KE-NIST', folderName: 'پشتیبان — قدیمی', startedAt: '2026-01-01 03:00',
    idx: 2, done: [], failed: [] }));
  props_().deleteProperty(PK.BACKUP_AT);
  un = quiet(); const r = runBackupStep(false); un();
  console.log('  نتیجه:', JSON.stringify({ ok: r.ok, done: r.done, reason: r.reason }));
  ok('حالتِ مرده دور ریخته شد و پشتیبان گرفته شد', r.ok === true && r.done >= 5,
     JSON.stringify(r).slice(0, 70));
  ok('و حالتِ نیمه‌تمام پاک شد', !global.__PROPS[PK.BACKUP_STATE]);
})();

console.log('\n=== ۹ه) دورِ بی‌رونوشت، نسخه‌های واقعی را نمی‌خورد ===');
(() => {
  const tally = () => { let n = 0, empty = 0; const it = BK.getFolders();
    while (it.hasNext()) { const f = it.next();
      if (String(f.getName()).indexOf('پشتیبان — ') !== 0) continue;
      let real = 0; const fi = f.getFiles();
      while (fi.hasNext()) { const nm = fi.next().getName();
        if (nm !== '_فهرست-پشتیبان.json' && nm !== 'فهرست پشتیبان.html') real++; }
      if (real) n++; else empty++; }
    return { real: n, empty: empty }; };
  const t0 = tally();
  const before = t0.real;
  // همهٔ رونوشت‌ها را خطا بده
  const realGet = global.DriveApp.getFileById;
  global.DriveApp.getFileById = function (id) {
    return { getName: () => 'x', getUrl: () => '', getDateCreated: () => new Date(),
             makeCopy() { throw new Error('محدودیتِ نرخِ درایو'); } };
  };
  un = quiet(); const r2 = runBackupStep(true); un();
  global.DriveApp.getFileById = realGet;
  console.log('  نتیجه:', JSON.stringify({ ok: r2.ok, reason: r2.reason, failed: r2.failed }));
  ok('دورِ بی‌رونوشت «موفق» اعلام نمی‌شود',
     r2.ok === false && r2.reason === 'no-copies', JSON.stringify(r2));
  const after = tally();
  console.log('  نسخه‌های واقعی پیش:', before, '· پس:', after.real, '· پوشهٔ خالی:', after.empty);
  ok('نسخه‌های واقعی دست‌نخورده ماندند', after.real === before, before + ' → ' + after.real);
  ok('و پوشهٔ خالیِ تازه‌ای جا نگرفت (خودش برداشته شد)',
     after.empty === t0.empty, t0.empty + ' → ' + after.empty);
  ok('و هشدارِ «پشتیبان گرفته نشد» فرستاده شد',
     global.__MAIL.some(m => String(m.subject).indexOf('گرفته نشد') !== -1));
})();

console.log('\n=== ۹و) پوشهٔ دورهٔ درس‌نامه دو شاخه نمی‌شود ===');
(() => {
  const sF = showFolder_(CFG.SPECIAL_FOLDER);
  // دوره‌ها یا صاف زیرِ ریشه‌اند یا (نسخهٔ ۵٫۱۱) زیرِ پوشهٔ دستهٔ خودشان
  const isEp = n => /قسمت\s*\d/.test(faDigits_(n));
  const allCourses = () => {
    const out = [];
    listFolders(sF).forEach(a => {
      if (isEp(a.getName())) return;
      const subs = listFolders(a);
      if (subs.length === 0 || subs.some(s => isEp(s.getName()))) out.push(a);   // خودش دوره است
      else subs.forEach(b => { if (!isEp(b.getName())) out.push(b); });          // a یک دسته است
    });
    return out;
  };
  const courses = allCourses().map(f => f.getName());
  const target = courses.find(n => /^\d+\s*—\s*/.test(n));
  ok('پوشهٔ دوره با پیشوندِ شماره ساخته شده', !!target, courses.join(' | '));
  const bare = target.replace(/^\d+\s*—\s*/, '');
  sF.createFile(Utilities.newBlob('z', 'audio/wav',
    CFG.SPECIAL_SHOW_NAME + ' — ' + bare + ' — قسمت 001 — درسِ سرگردان.wav'));
  un = quiet(); const org2 = organizeEpisodeFolders(false); un();
  const coursesAfter = allCourses().map(f => f.getName());
  console.log('  پوشه‌های دوره پس از سامان‌دهی:', coursesAfter.join(' | '));
  ok('شاخهٔ موازی ساخته نشد (حتی وقتی دوره زیرِ دسته است)', coursesAfter.filter(n =>
     n === bare || n.replace(/^\d+\s*—\s*/, '') === bare).length === 1,
     coursesAfter.join(' | '));
  ok('و فایل در همان پوشهٔ دورهٔ موجود نشست', (() => {
    const c = allCourses().find(f => f.getName().replace(/^\d+\s*—\s*/, '') === bare);
    return listFolders(c).some(ep => listFiles(ep).some(x =>
      x.getName().indexOf('درسِ سرگردان') !== -1));
  })());
})();

console.log('\n=== ۹ز) عنوانِ پوشه از «بخش ۲» و «کامل» ساخته نمی‌شود ===');
ok('«بخش ۲» عنوان نیست', titleFromName_(
   CFG.SHOW_NAME + ' — قسمت 0007 — عنوانِ هفت — بخش ۲.wav') === 'عنوانِ هفت',
   titleFromName_(CFG.SHOW_NAME + ' — قسمت 0007 — عنوانِ هفت — بخش ۲.wav'));
ok('«کامل» هم عنوان نیست', titleFromName_(
   CFG.SHOW_NAME + ' — قسمت 0007 — عنوانِ هفت — کامل.wav') === 'عنوانِ هفت');
ok('و عنوانِ درست دست نمی‌خورد', titleFromName_(
   CFG.SHOW_NAME + ' — قسمت 0007 — عنوانِ هفت.html') === 'عنوانِ هفت');

console.log('\n=== ۹ح) سامان‌دهی، صدای کاربر را پاک نمی‌کند ===');
(() => {
  // یک قسمتِ نیمه‌رندر با یک فایلِ صوتیِ بیگانه در پوشه‌اش
  const vF = showFolder_(CFG.VARIETY_FOLDER);
  const eps = listFolders(vF);
  const live = eps[0];
  const alien = live.createFile(Utilities.newBlob('a', 'audio/wav',
    'یک فایلِ صوتیِ کاملاً بی‌ربط.wav'));
  const st = { epNum: 1, phase: 'audio', chunkIdx: 0, files: [], folderId: live.getId(),
               podRow: 2, chunks: [{ text: 'م', voice: CFG.TTS_VOICE }] };
  global.__PROPS[PK.PENDING] = JSON.stringify(st);
  un = quiet(); try { produceEpisodeContinue(); } catch (e) {} un();
  const survived = listFiles(live).some(f => f.getName().indexOf('بی‌ربط') !== -1);
  ok('فایلِ صوتیِ بیگانه در پاک‌سازیِ تکه‌های بی‌صاحب حذف نشد', survived,
     survived ? 'ماند' : 'پاک شد');
  un = quiet(); let g3 = 0;
  while (global.__PROPS[PK.PENDING] && g3++ < 60) produceEpisodeContinue(); un();
})();

console.log('\n✅ هر ' + pass + ' آزمونِ داوری و دسته‌بندی و پشتیبان گذشت.');
