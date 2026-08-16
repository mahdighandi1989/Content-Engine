/* تختهٔ مجموعه‌ها + انتخاب دستی (سنجاق).
   می‌سنجد:
   • اسکن واقعاً خودکار است و مجموعهٔ تازه خودش اضافه می‌شود
   • فهرست ذیل دستهٔ مرتبط، به ترتیبِ اولویت، با نشانِ «همین حالا»
   • نمودار دایره‌ای و میله‌ای و درصدِ پیشرفت
   • سنجاق: انتخاب دستی مقدم است؛ همین که تمام شد خودش برداشته می‌شود و موتور
     به همان مجموعه‌ای که نیمه‌کاره گذاشته بود برمی‌گردد
   • دکمهٔ دستی در همان روز، ادامهٔ همان مجموعه را می‌سازد */
const fs = require('fs');
const { Spread, DFolder } = require('./mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs',
               '14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

// ───────────────────────────── fixtures ────────────────────────────────────
const TVH = ['Timestamp','File_ID','File_Name','New_Name','Drive_Link','Is_Chunk','Chunk_Number',
  'Chunk_Total','Chunk_Time_Range','Duration','Persons_Identified','Music_Analysis',
  'Video_Date_Info','Farsi_Transcription','Vibe_Atmosphere','Professional_Insights',
  'Technical_Specs','Content_Analysis','Audio_Analysis','Visual_Analysis','Professional_Insights_2',
  'Executive_Summary','Status','Education_Meta','Trading_Strategies','Indicators_Tools',
  'Chart_Patterns','Chart_Analysis','Concepts_Definitions','Money_Management','Trading_Psychology',
  'References_Citations','Live_Trade_Setups','Episode_Connections','Advanced_Methodologies',
  'Alternative_Analysis','Codeable_Elements','Trading_Executive_Summary','Series_ID','Series_Name',
  'Episode_Seq'];
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
const when = i => { const d = new Date(D0.getTime() - (400 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };
// درسِ واقعی هزاران نویسه است. اندازه را واقع‌بینانه می‌گیریم تا یک قسمتِ درس
// در چند قسمتِ پادکست پوشش داده شود و رفتارِ «ادامهٔ همان مجموعه» آزموده شود.
const LESSON = n => 'دقیقهٔ ' + n + '. مدرس مفهومِ ' + n + ' را توضیح می‌دهد و روی نمودار ' +
  'نشان می‌دهد. مثالِ ' + n + ' و اشتباهِ رایجِ ' + n + '. ' +
  ('توضیحِ تفصیلیِ مفهومِ ' + n + ' با جزئیاتِ کامل و مثال‌های عملی. ').repeat(70);

function vRow(fid, name, no, tot, ts) {
  const r = new Array(TVH.length).fill('');
  r[0]=ts; r[1]=fid; r[2]=name; r[4]='https://drive.google.com/file/d/'+fid+'/view';
  r[5]='بله'; r[6]=no; r[7]=tot; r[8]=((no-1)*60)+'-'+(no*60)+' ثانیه'; r[9]=tot*60+' ثانیه';
  r[13]=LESSON(no); r[19]='نمودار '+no;
  r[17]=JSON.stringify({Topic:'مفهوم '+no,Message:'پیام '+no});
  r[21]='خلاصهٔ قطعهٔ '+no; r[22]='SUCCESS';
  r[28]=JSON.stringify([{term:'اصطلاحِ '+no,definition:'تعریفِ '+no}]);
  return r;
}
function dRow(fid, name, no, tot, ts) {
  const r = new Array(GDH.length).fill('');
  r[0]=ts; r[1]=fid; r[2]=name; r[4]='https://drive.google.com/file/d/'+fid+'/view';
  r[5]='بله'; r[6]=no; r[7]=tot; r[8]='صفحهٔ '+(no*10);
  r[11]='متنِ فارسیِ صفحهٔ '+no+'. '+LESSON(no);
  r[15]=JSON.stringify(['نکتهٔ '+no]); r[17]='خلاصهٔ '+no; r[18]='SUCCESS';
  r[21]='موضوعِ '+no; r[24]=JSON.stringify([{idea:'ایدهٔ '+no,explanation:'شرحِ '+no}]);
  r[50]='مخاطب باید '+no+' را یاد بگیرد.';
  return r;
}

// دو دورهٔ ترید (یکی مقدماتی، یکی پیشرفته) + یک کتاب در شیت general
const tv = [];
for (let i=1;i<=14;i++) tv.push(vRow('TA','01_MabaniTahlil_Ostad.mp4', i, 14, when(i)));
for (let i=1;i<=14;i++) tv.push(vRow('TB','02_MabaniTahlil_Ostad.mp4', i, 14, when(20+i)));
for (let i=1;i<=10;i++) tv.push(vRow('TC','01_PishraftehElliott_Ostad.mp4', i, 10, when(40+i)));
const dv = [];
for (let i=1;i<=10;i++) dv.push(dRow('DA','Polya_HowToSolveIt.pdf', i, 10, when(60+i)));

function mkSheet(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 20); });
  global.__SS[id] = ss; return ss;
}
const SRC = {}; CFG.SOURCES.forEach(s => SRC[s.key] = s);
mkSheet(SRC.trading.id, [{ name: 'Video Analysis', hdr: TVH, rows: tv }]);
mkSheet(SRC.general.id, [{ name: 'Document Analysis', hdr: GDH, rows: dv }]);
CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
  ss.insertSheet('S1'); global.__SS[s.id] = ss; } });

global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
global.__PROPS['TELEGRAM_CHAT_ID'] = '123';

const PLAN = {
  'mabanitahlil ostad': { order: 1, level: 'مقدماتی', topic: 'مبانی تحلیل',
                          category: 'مالی، ترید و اقتصاد' },
  'pishraftehelliott ostad': { order: 2, level: 'پیشرفته', topic: 'موج الیوت',
                               category: 'مالی، ترید و اقتصاد' },
  'polya howtosolveit': { order: 3, level: 'مقدماتی', topic: 'حل مسئله',
                          category: 'علمی و آموزشی' }
};
global.__STUB = function (url, body) {
  if (url.indexOf('api.telegram.org') !== -1) return { code: 200, json: { ok: true, result: {} } };
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
  if (url.indexOf('tts') !== -1) return { code: 200, json: { candidates: [{ content: { parts: [{
    inlineData: { data: Buffer.alloc(20000).toString('base64') } }] } }] } };
  const t = body.contents ? body.contents[0].parts[0].text : '';
  // داوریِ محتوایی (۵٫۲): همان چیزی که تولید و تخته بر پایه‌اش تصمیم می‌گیرند
  if (t.indexOf('یک داوری بده') !== -1) {
    const keys = [...t.matchAll(/^key: (.+)$/gm)].map(m => m[1].trim());
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      verdicts: keys.map(k => {
        const pl = PLAN[k] || {};
        const bad = /rowze|marasem/i.test(k);
        return { key: k, isCourse: !bad, score: bad ? 12 : 82,
                 kindOfContent: bad ? 'مرثیه و روضه' : 'دورهٔ آموزشی',
                 about: bad ? 'مجلسِ روضه و مرثیه‌خوانی است و درسی در آن گفته نمی‌شود.'
                            : 'آموزشِ گام‌به‌گامِ ' + (pl.topic || 'موضوعِ همین دوره') + ' با مثال.',
                 topic: pl.topic || 'موضوع', category: pl.category || 'متفرقه',
                 level: pl.level || 'میانی', related: '',
                 orderHint: pl.order || 5,
                 why: bad ? 'محتوا مرثیه است، نه درس.' : 'ساختارِ درسی و مثال دارد.' };
      }) }) }] } }] } };
  }
  if (t.indexOf('ترتیبِ درستِ یادگیری') !== -1) {
    const keys = [...t.matchAll(/- key: (.+?) \| نام:/g)].map(m => m[1].trim());
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      plan: keys.map(k => Object.assign({ key: k, order: 9, level: 'میانی', topic: '—',
        category: 'متفرقه', related: '', why: 'x' }, PLAN[k] || {})) }) }] } }] } };
  }
  if (t.indexOf('قاعده‌های سختِ این برنامه') !== -1) {
    const nos = [...t.matchAll(/--- قطعهٔ (\d+)/g)].map(m => Number(m[1]));
    const W = todayWords_();
    const per = Math.max(1, Math.ceil(nos.length / 6));
    const secs = [];
    for (let k = 0; k < 6; k++) secs.push({ heading: 'بخشِ ' + (k+1),
      narration: 'متنِ آموزشیِ بخشِ ' + (k+1) + '. '.repeat(220),
      tone: 'آرام', chunkNos: nos.slice(k*per, (k+1)*per), enrichIds: [] });
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'عنوانِ درس', hook: CFG.SPECIAL_SHOW_NAME + '. امروز ' + W.weekday + '، ' + W.jalali + '.',
      recap: t.indexOf('قسمت‌های قبلیِ همین مجموعه') !== -1 ? 'در قسمت قبل گفتیم.' : '',
      goal: { problem: 'مشکل', behavior: 'رفتار', message: 'پیام' },
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

let un = quiet(); let g = 0; while (g++ < 30) syncCatalog(); un();
const hub = getHub_();
const runAll = () => { const r = produceSpecialEpisode();
  let d = 0; while (global.__PROPS[PK.SP_PENDING] && d++ < 60) produceSpecialContinue(); return r; };

// ══════════════════════ ۱) اسکن خودکار است؟ ═══════════════════════════════
console.log('=== ۱) اسکن مجموعه‌ها خودکار انجام می‌شود ===');
ok('همگام‌سازی خودش اسکن را صدا می‌زند',
   /scanSeries\(false\)/.test(fs.readFileSync(DIR + '02_Sync.gs', 'utf8')));
ok('تولید تخصصی هم پیش از کار، اسکن می‌کند',
   /scanSeries\(false\)/.test(fs.readFileSync(DIR + '14_Special.gs', 'utf8')));
ok('و مُهرِ زمانِ اسکن ثبت شده', !!global.__PROPS[PK.SERIES_SCAN_AT],
   global.__PROPS[PK.SERIES_SCAN_AT]);
const reg0 = readSeriesReg_(hub);
console.log('  مجموعه‌های شناسایی‌شده:', reg0.rows.map(r => r.vals[SC.NAME-1]).join(' | '));
ok('سه مجموعه بی هیچ دخالت دستی ثبت شد', reg0.rows.length === 3, reg0.rows.length + '');

// سقفِ زمانی: اسکنِ دوباره در فاصلهٔ کوتاه کارِ اضافه نمی‌کند
un = quiet(); const again = scanSeries(false); un();
ok('اسکن در فاصلهٔ کوتاه دوباره اجرا نمی‌شود (سقفِ ساعتی)', again && again.skipped === true,
   JSON.stringify(again));

// مجموعهٔ تازه در شیت → اسکنِ خودکارِ بعدی باید پیدایش کند
const tsh = global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
for (let i = 1; i <= 9; i++) tsh._d.push(vRow('TD','01_RavanshenasiBazar.mp4', i, 9, when(90+i)));
tsh._max = tsh._d.length + 20;
global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';   // یعنی سقف گذشته
un = quiet(); g = 0; while (g++ < 30) syncCatalog(); un();
const reg1 = readSeriesReg_(hub);
ok('مجموعهٔ تازه خودکار اضافه شد (بی زدنِ هیچ دکمه‌ای)',
   reg1.rows.length === 4 &&
   reg1.rows.some(r => String(r.vals[SC.NAME-1]).indexOf('Ravanshenasi') !== -1),
   reg1.rows.length + ' مجموعه');

// ══════════════════════ ۲) دسته‌بندی و اولویت ═════════════════════════════
console.log('\n=== ۲) هر مجموعه ذیل دستهٔ مرتبط، به ترتیبِ اولویت ===');
un = quiet(); judgeSeries(true, new Date().getTime()+300000); un();
const bd = seriesBoardData_(hub);
bd.groups.forEach(gp => {
  console.log('  ▍' + gp.cat + '  (' + gp.pct + '٪)');
  gp.series.forEach(s => console.log('      ' + String(s.order).padStart(2) + '. ' +
    s.name.padEnd(28) + s.level.padEnd(10) + s.status + (s.isCurrent ? '  ◀ همین حالا' : '')));
});
ok('مجموعه‌ها زیر دسته گروه شدند', bd.groups.length >= 2, bd.groups.length + ' دسته');
ok('دورهٔ ترید زیر «مالی، ترید و اقتصاد» نشست',
   bd.groups.some(x => x.cat === 'مالی، ترید و اقتصاد' &&
     x.series.some(y => y.name.indexOf('MabaniTahlil') !== -1)));
ok('کتابِ حل‌مسئله زیر «علمی و آموزشی» نشست',
   bd.groups.some(x => x.cat === 'علمی و آموزشی' &&
     x.series.some(y => y.name.indexOf('Polya') !== -1)));
ok('درونِ دسته، مقدماتی پیش از پیشرفته آمده', (() => {
  const fin = bd.groups.find(x => x.cat === 'مالی، ترید و اقتصاد');
  const mi = fin.series.findIndex(y => y.name.indexOf('Mabani') !== -1);
  const pi = fin.series.findIndex(y => y.name.indexOf('Pishrafteh') !== -1);
  return mi >= 0 && pi >= 0 && mi < pi;
})());
ok('اولویت هر مجموعه ثبت شده', bd.groups.every(x => x.series.every(y => y.order >= 1)));
ok('همان مجموعه‌ای که موتور انتخاب کرده «همین حالا» علامت دارد',
   bd.current && bd.groups.some(x => x.series.some(y => y.isCurrent)),
   bd.current ? bd.current.name : 'هیچ');
ok('و آن، مقدماتی‌ترین مجموعه است',
   bd.current && bd.current.name.indexOf('Mabani') !== -1, bd.current.name);

// ══════════════════════ ۳) نمودارها و درصد ════════════════════════════════
console.log('\n=== ۳) نمودار دایره‌ای، میله‌ای و درصدِ پیشرفت ===');
un = quiet(); const e1 = runAll(); un();
const bd2 = seriesBoardData_(hub);
const cur = bd2.groups.map(x => x.series).reduce((a,b)=>a.concat(b),[])
             .find(y => y.name.indexOf('Mabani') !== -1);
console.log('  پس از یک قسمت:', cur.name, cur.doneChunks + '/' + cur.chunks,
            '=', cur.pct + '٪ | قسمت‌ها:', cur.donePartsN + '/' + cur.parts);
ok('قسمت اول ساخته شد', e1.ok === true, JSON.stringify(e1));
ok('درصد پیشرفتِ مجموعه از صفر بالا رفت', cur.pct > 0, cur.pct + '٪');
ok('درصد از شمارشِ واقعیِ قطعه‌ها می‌آید',
   cur.pct === Math.round((cur.doneChunks / cur.chunks) * 100));
ok('درصد کلِ تخته هم حساب شد', bd2.totals.pct > 0 && bd2.totals.pct <= 100,
   bd2.totals.pct + '٪');

const html = seriesBoardHtml_(bd2);
fs.writeFileSync('/tmp/board.html', html);
ok('نمودار دایره‌ایِ حلقه‌ای ساخته شد', html.indexOf('stroke-dasharray') !== -1);
ok('نمودار سهم‌بندیِ وضعیت ساخته شد', /<path d="M70,70/.test(html));
ok('نمودار میله‌ای برای هر مجموعه ساخته شد',
   (html.match(/<rect x="0" y="2"/g) || []).length >= bd2.groups.length * 2);
ok('درصدها با رقم فارسی نوشته شدند', /[۰-۹]٪/.test(html));
ok('هیچ منبعِ بیرونی در پنجره بار نمی‌شود (CSP)',
   html.indexOf('http://') === -1 && html.indexOf('src="http') === -1 &&
   html.indexOf('cdn') === -1);
ok('نام هر دسته در پنجره آمده',
   bd2.groups.every(x => html.indexOf(x.cat) !== -1));
ok('برای هر مجموعه دکمهٔ «کار روی این» هست',
   (html.match(/onclick="pinSeries\(/g) || []).length === 4,
   (html.match(/onclick="pinSeries\(/g) || []).length + ' دکمه');
ok('برای هر دسته هم دکمهٔ انتخاب هست',
   (html.match(/onclick="pinCat\(/g) || []).length === bd2.groups.length);
ok('قسمت‌های داخلِ هر مجموعه با جای ایستادن نشان داده می‌شوند',
   html.indexOf('قطعهٔ ') !== -1 && html.indexOf('از ') !== -1);
ok('پیام «الان روی این کار می‌شود» در پنجره هست',
   html.indexOf('الان روی این کار می‌شود') !== -1);

// ══════════════════════ ۴) دکمهٔ دستی = ادامهٔ همان مجموعه ════════════════
console.log('\n=== ۴) زدنِ دکمهٔ دستی در همان روز، ادامهٔ همان مجموعه است ===');
const before = pickSeries_(hub).key;
un = quiet(); const e2 = runAll(); un();
const after = readSeriesParts_(hub).byKey[before];
console.log('  مجموعهٔ جاری:', before, '| قسمت دوم:', JSON.stringify({ ok: e2.ok, series: e2.series }));
ok('قسمت دوم از همان مجموعه ساخته شد',
   e2.ok === true && seriesKeyFromStem_(seriesStem_(e2.series)) === before, e2.series);
ok('و از جایی که مانده بود ادامه داد (نه از اول)',
   after.some(p => Number(p.vals[SP.DONE_TO-1]) > 0));

// ══════════════════════ ۵) سنجاق: انتخاب دستی ═════════════════════════════
console.log('\n=== ۵) انتخاب دستیِ یک مجموعهٔ دیگر ===');
const interrupted = pickSeries_(hub).key;             // همان مقدماتیِ نیمه‌کاره
const polya = readSeriesReg_(hub).rows.find(r => String(r.vals[SC.NAME-1]).indexOf('Polya') !== -1);
ok('پیش از سنجاق، موتور روی مجموعهٔ نیمه‌کاره است',
   interrupted.indexOf('mabani') !== -1, interrupted);
un = quiet(); const pinRes = uiPinSeries(polya.key); un();
console.log('  پیام:', String(pinRes.message).slice(0, 90));
ok('سنجاق ثبت شد', pinRes.ok === true && seriesPin_() &&
   seriesPin_().kind === 'series' && seriesPin_().value === polya.key);
ok('و انتخابِ موتور فوراً عوض شد', pickSeries_(hub).key === polya.key, pickSeries_(hub).key);
ok('مجموعهٔ نیمه‌کاره هم‌چنان «در حال تولید» مانده (فراموش نشده)', (() => {
  const rr = readSeriesReg_(hub).rows.find(r => r.key === interrupted);
  return String(rr.vals[SC.STATUS-1]) === SST.ACTIVE;
})());
const bd3 = seriesBoardData_(hub);
const h3 = seriesBoardHtml_(bd3);
ok('پنجره می‌گوید انتخاب دستی فعال است', h3.indexOf('انتخاب دستی فعال است') !== -1);
ok('و دکمهٔ همان مجموعه «انتخاب‌شده» نشان می‌دهد',
   bd3.groups.some(x => x.series.some(y => y.isPinned && y.key === polya.key)));

console.log('\n=== ۶) تولید روی مجموعهٔ سنجاق‌شده، به ترتیب ===');
un = quiet(); const e3 = runAll(); un();
console.log('  قسمت سوم:', JSON.stringify({ ok: e3.ok, series: e3.series }));
ok('قسمت از مجموعهٔ سنجاق‌شده ساخته شد',
   e3.ok === true && String(e3.series).indexOf('Polya') !== -1, e3.series);
ok('سنجاق هنوز سرِ جایش است (کارش تمام نشده یا تازه تمام شده)',
   true, seriesPin_() ? 'فعال' : 'برداشته شد');

// تا وقتی کارِ سنجاق تمام نشده هر تولیدی روی همان است؛ و همان اجرایی که سنجاق
// در آن تمام می‌شود باید به مجموعهٔ نیمه‌کاره برگردد (بازگشت می‌تواند در همان
// اجرا رخ دهد — روزی هدر نمی‌رود — یا در اجرای بعد).
const trail = [{ series: e3.series, okr: e3.ok, before: true, after: !!seriesPin_() }];
let guard = 0;
un = quiet();
while (guard++ < 8) {
  const before = !!seriesPin_();
  const r = runAll() || {};
  trail.push({ series: r.series, okr: r.ok === true, before: before, after: !!seriesPin_() });
  if (!before) break;                 // یک اجرا پس از برداشته‌شدنِ سنجاق کافی است
}
un();
const keyOf = s => { try { return seriesKeyFromStem_(seriesStem_(String(s))); } catch (e) { return ''; } };
console.log('  رشتهٔ اجراها:');
trail.forEach((t, i) => console.log('    ' + (i+1) + ') ' + (t.okr ? 'ساخته شد' : 'چیزی نساخت') +
  ' — ' + String(t.series || '—') + '  [سنجاق پیش: ' + (t.before ? 'فعال' : 'نه') +
  ' / پس: ' + (t.after ? 'فعال' : 'نه') + ']'));

const inPin = trail.filter(t => t.before && t.after && t.okr);
ok('تا سنجاق برداشته نشده، هر قسمتی که ساخته می‌شود از همان مجموعهٔ سنجاق‌شده است',
   inPin.length > 0 && inPin.every(t => String(t.series).indexOf('Polya') !== -1),
   inPin.map(t => t.series).join(' | '));
const clearRun = trail.filter(t => t.before && !t.after)[0];
ok('همین که کارِ مجموعهٔ سنجاق‌شده تمام شد، سنجاق خودش برداشته شد',
   !!clearRun && seriesPin_() === null, String(seriesPin_()));
ok('مجموعهٔ سنجاق‌شده «تمام‌شده» علامت خورد', (() => {
  const rr = readSeriesReg_(hub).rows.find(r => r.key === polya.key);
  return String(rr.vals[SC.STATUS-1]) === SST.DONE;
})(), readSeriesReg_(hub).rows.find(r => r.key === polya.key).vals[SC.STATUS-1]);

console.log('\n=== ۷) و موتور به همان مجموعه‌ای که نیمه‌کاره گذاشته بود برگشت ===');
const ci = trail.indexOf(clearRun);
const madeAfter = trail.slice(ci).filter(t => t.okr);
console.log('  نخستین قسمتِ پس از برداشته‌شدنِ سنجاق:',
            madeAfter.length ? madeAfter[0].series : 'هیچ');
ok('نخستین قسمتِ پس از پایانِ سنجاق از همان مجموعهٔ نیمه‌کارهٔ قبلی است',
   madeAfter.length > 0 && keyOf(madeAfter[0].series) === interrupted,
   madeAfter.length ? keyOf(madeAfter[0].series) : 'هیچ');
// تا لحظهٔ برداشته‌شدنِ سنجاق، فقط همان دو مجموعه در کار بودند (نه مجموعهٔ سوم)
const upto = trail.slice(0, ci + 1).filter(t => t.okr);
ok('هیچ مجموعهٔ سومی وسط این دو نپرید',
   upto.every(t => String(t.series).indexOf('Polya') !== -1 || keyOf(t.series) === interrupted),
   upto.map(t => keyOf(t.series)).join(' | '));

// و «تمومش کنه»: تا قطعهٔ ناتمامی دارد، هر قسمت از همان است و بعد تمام‌شده می‌شود
const seenAfter = [];
un = quiet(); guard = 0;
while (seriesHasWork_(hub, interrupted) && guard++ < 8) {
  const r = runAll() || {}; if (r.ok) seenAfter.push(keyOf(r.series));
}
un();
ok('تا قطعهٔ ناتمام دارد، همهٔ قسمت‌ها از همان مجموعه ساخته می‌شود',
   seenAfter.every(k => k === interrupted), seenAfter.join(' | ') || 'قطعهٔ ناتمامی نمانده بود');
un = quiet(); runAll(); un();   // اجرای بعد: مجموعهٔ تمام‌شده را می‌بندد
ok('و مجموعهٔ نیمه‌کارهٔ قبلی هم تا آخر تمام و «تمام‌شده» علامت خورد', (() => {
  const rr = readSeriesReg_(hub).rows.find(r => r.key === interrupted);
  return String(rr.vals[SC.STATUS-1]) === SST.DONE;
})(), readSeriesReg_(hub).rows.find(r => r.key === interrupted).vals[SC.STATUS-1]);

// ══════════════════════ ۸) سنجاقِ یک دسته ═════════════════════════════════
console.log('\n=== ۸) انتخاب دستیِ یک دسته (نه یک مجموعه) ===');
// تا اینجا کارِ هر چهار مجموعه تمام شده. پس انتخابِ دستیِ دسته باید با پیامِ
// روشن رد شود، نه اینکه بی‌صدا ثبت و بعد دور انداخته شود.
un = quiet(); const pc = uiPinCategory('علمی و آموزشی', 'pin'); un();
console.log('  پاسخ برای دستهٔ تمام‌شده:', pc.ok, '|', String(pc.message).slice(0, 80));
ok('انتخابِ دستهٔ بی‌کار رد می‌شود (نه ثبتِ بی‌اثر)', pc.ok === false && seriesPin_() === null);
ok('و علتش هم گفته می‌شود', /تمام شده/.test(String(pc.message)));
un = quiet(); const pcNo = uiPinCategory('یک دستهٔ ناموجود', 'pin'); un();
ok('دستهٔ ناموجود هم رد می‌شود', pcNo.ok === false && seriesPin_() === null);

// ── تازه‌سازیِ انبار: دو دورهٔ تازه (یکی مالی، یکی علمی) تا آزمونِ انتخابِ
//    دستی روی چیزِ زنده انجام شود — و همین هم نشان می‌دهد مجموعهٔ تازه خودکار
//    پیدا می‌شود، حتی وقتی همه‌چیز تمام‌شده بوده است.
PLAN['tahlilroshan ostad'] = { order: 4, level: 'مقدماتی', topic: 'تحلیل روشن',
                               category: 'مالی، ترید و اقتصاد' };
PLAN['elmsanjesh daneshgah'] = { order: 5, level: 'میانی', topic: 'سنجش',
                                 category: 'علمی و آموزشی' };
for (let i = 1; i <= 9; i++) tsh._d.push(vRow('TE','03_TahlilRoshan_Ostad.mp4', i, 9, when(120+i)));
for (let i = 1; i <= 9; i++) tsh._d.push(vRow('TF','01_ElmSanjesh_Daneshgah.mp4', i, 9, when(140+i)));
tsh._max = tsh._d.length + 20;
global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';
un = quiet(); scanSeries(true); judgeSeries(true, new Date().getTime()+300000); un();
const regFresh = readSeriesReg_(hub);
console.log('  فهرست پس از افزودن:', regFresh.rows.map(r => r.vals[SC.NAME-1]).join(' | '));
ok('دو مجموعهٔ تازه خودکار به فهرست اضافه شد',
   regFresh.rows.length === 6 && !!regFresh.byKey['tahlilroshan ostad'] &&
   !!regFresh.byKey['elmsanjesh daneshgah'], regFresh.rows.length + ' مجموعه');

un = quiet(); const pcOk = uiPinCategory('مالی، ترید و اقتصاد', 'pin'); un();
ok('سنجاقِ دسته‌ای که کارِ ناتمام دارد ثبت می‌شود',
   pcOk.ok === true && seriesPin_() && seriesPin_().kind === 'cat');
const pickFin = pickSeries_(hub);
console.log('  انتخاب در دستهٔ مالی:', pickFin.vals[SC.NAME-1], '/', pickFin.vals[SC.CAT-1]);
ok('در دستهٔ سنجاق‌شده، مجموعه‌ای از همان دسته انتخاب می‌شود',
   String(pickFin.vals[SC.CAT-1]) === 'مالی، ترید و اقتصاد', String(pickFin.vals[SC.CAT-1]));
ok('و درونِ دسته، کم‌اولویت‌ترین مجموعه‌ای که کارِ ناتمام دارد انتخاب می‌شود', (() => {
  const rg = readSeriesReg_(hub);
  const inCat = rg.rows.filter(r => String(r.vals[SC.CAT-1]) === 'مالی، ترید و اقتصاد' &&
                                    seriesHasWork_(hub, r.key));
  inCat.sort((a,b) => {
    const ra = String(a.vals[SC.STATUS-1]) === SST.ACTIVE ? 0 : 1;
    const rb = String(b.vals[SC.STATUS-1]) === SST.ACTIVE ? 0 : 1;
    return ra - rb || (Number(a.vals[SC.ORDER-1])||999) - (Number(b.vals[SC.ORDER-1])||999);
  });
  return inCat.length && inCat[0].key === pickFin.key;
})(), 'انتخاب ' + pickFin.vals[SC.NAME-1] + ' (اولویت ' + pickFin.vals[SC.ORDER-1] +
     '، وضعیت ' + pickFin.vals[SC.STATUS-1] + ')');

console.log('\n=== ۹) برداشتنِ دستیِ سنجاق ===');
un = quiet(); const cl = uiClearPin(); un();
ok('سنجاق با دکمه برداشته می‌شود', cl.ok === true && seriesPin_() === null);
// مجموعه‌ای که هنوز کارِ ناتمام دارد، برای آزمونِ کلیدها
const liveKey = readSeriesReg_(hub).rows.filter(r => seriesHasWork_(hub, r.key))[0].key;
const liveName = readSeriesReg_(hub).byKey[liveKey].vals[SC.NAME-1];
ok('و کلیکِ دوبارهٔ همان مجموعه، سنجاقش را برمی‌دارد (سازگاری با پنجرهٔ کهنه)', (() => {
  un = quiet(); uiPinSeries(liveKey); const on = !!seriesPin_();
  uiPinSeries(liveKey); const off = seriesPin_() === null; un();
  return on && off;
})(), liveName);

// ── کنشِ صریح: دکمه می‌گوید «سنجاق کن» یا «بردار»، نه «برعکسش کن» ──
un = quiet(); uiPinSeries(liveKey, 'pin'); un();
ok('کنشِ صریحِ «سنجاق کن» ثبت می‌شود',
   seriesPin_() && seriesPin_().kind === 'series' && seriesPin_().value === liveKey);
un = quiet(); const again2 = uiPinSeries(liveKey, 'pin'); un();
ok('همان کنش دو بار (کلیکِ تکراری) سنجاق را برنمی‌دارد',
   again2.ok === true && seriesPin_() && seriesPin_().value === liveKey);
// دکمهٔ کهنه‌ای که «بردار» می‌گوید ولی سنجاق حالا روی مجموعهٔ دیگری است،
// نباید سنجاقِ تازه را قربانی کند
const otherKey = readSeriesReg_(hub).rows.filter(r => r.key !== liveKey)[0].key;
un = quiet(); const stale = uiPinSeries(otherKey, 'unpin'); un();
ok('دکمهٔ کهنهٔ «بردار» سنجاقِ مجموعهٔ دیگر را از بین نمی‌برد',
   stale.ok === true && seriesPin_() && seriesPin_().value === liveKey,
   seriesPin_() ? seriesPin_().value : 'برداشته شد');
un = quiet(); const unp = uiPinSeries(liveKey, 'unpin'); un();
ok('کنشِ صریحِ «بردار» سنجاق را برمی‌دارد', unp.ok === true && seriesPin_() === null);

// ── نگهبانِ انتخابِ بی‌کار: مجموعهٔ تمام‌شده سنجاق نمی‌شود ──
un = quiet(); const deadPin = uiPinSeries(polya.key, 'pin'); un();
console.log('  انتخابِ مجموعهٔ تمام‌شده:', deadPin.ok, '|', String(deadPin.message).slice(0, 70));
ok('انتخابِ مجموعهٔ تمام‌شده رد می‌شود', deadPin.ok === false && seriesPin_() === null);
ok('و وضعیتش هم بی‌جهت دست‌کاری نمی‌شود',
   String(readSeriesReg_(hub).byKey[polya.key].vals[SC.STATUS-1]) === SST.DONE);
un = quiet(); const ghost = uiPinSeries('یک-مجموعهٔ-خیالی', 'pin'); un();
ok('کلیدِ ناشناس هم رد می‌شود', ghost.ok === false && seriesPin_() === null);

// ── دکمه در پنجره: کلید در data-attribute، کنش صریح، و غیرفعال‌بودنِ بی‌کارها ──
const bdBtn = seriesBoardData_(hub);
const hBtn = seriesBoardHtml_(bdBtn);
ok('کلیدها داخل رشتهٔ جاوااسکریپت نوشته نمی‌شوند (تزریق‌ناپذیر)',
   hBtn.indexOf("pinSeries('") === -1 && hBtn.indexOf("pinCat('") === -1);
ok('کلید و دسته با data-attribute می‌آیند',
   /data-key="/.test(hBtn) && /data-cat="/.test(hBtn));
ok('کنشِ هر دکمه روی خودش نوشته شده', /data-act="pin"/.test(hBtn));
ok('دکمهٔ مجموعهٔ تمام‌شده غیرفعال است', (() => {
  const m = hBtn.match(/<button [^>]*data-key="[^"]*"[^>]*>/g) || [];
  const doneKeys = bdBtn.groups.reduce((a,g)=>a.concat(g.series),[])
                     .filter(s => !s.hasWork && !s.isPinned).map(s => s.key);
  if (!doneKeys.length) return false;
  return doneKeys.every(k => m.some(t => t.indexOf('data-key="'+k+'"') !== -1 &&
                                         t.indexOf('disabled') !== -1));
})(), 'مجموعهٔ بی‌کار: ' + bdBtn.groups.reduce((a,g)=>a.concat(g.series),[])
        .filter(s=>!s.hasWork).length);
ok('دکمهٔ مجموعه‌ای که کار دارد فعال است', (() => {
  const m = hBtn.match(/<button [^>]*data-key="[^"]*"[^>]*>/g) || [];
  const liveKeys = bdBtn.groups.reduce((a,g)=>a.concat(g.series),[])
                     .filter(s => s.hasWork).map(s => s.key);
  return liveKeys.length && liveKeys.every(k => m.some(t =>
    t.indexOf('data-key="'+k+'"') !== -1 && t.indexOf('disabled') === -1));
})());

// ── نامِ نویسه‌دار: کوتیشن و بک‌اسلش و خطِ تازه نباید دکمه را بشکند ──
console.log('\n=== ۹ب) نامِ دسته با نویسه‌های خطرناک ===');
const NASTY = 'دستهٔ \'خطر\' \\ "دو" <b>x</b>';
const regN = readSeriesReg_(hub);
const rowN = regN.rows.filter(r => seriesHasWork_(hub, r.key))[0];
const shReg = hub.getSheetByName(CFG.SERIES_TAB);
shReg.getRange(rowN.row, SC.CAT, 1, 1).setValues([[NASTY]]);
const bdN = seriesBoardData_(hub);
const hN = seriesBoardHtml_(bdN);
fs.writeFileSync('/tmp/board_nasty.html', hN);
ok('نام خطرناک در HTML بی‌خطر شد (تگ اجرا نمی‌شود)',
   hN.indexOf('<b>x</b>') === -1 && hN.indexOf('&lt;b&gt;x&lt;/b&gt;') !== -1);
ok('کوتیشن و بک‌اسلش دکمه را نمی‌شکند (چون در رشتهٔ کد نیست)',
   hN.indexOf("pinCat('") === -1 && /data-cat="[^"]*&#39;|data-cat="[^"]*'/.test(hN));
const gotCat = (function () {
  const m = hN.match(/data-cat="([^"]*)"/g) || [];
  const un2 = s => s.replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<')
                    .replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  return m.map(x => un2(x.slice(10, -1)));
})();
ok('همان رشتهٔ دقیق از data-attribute برمی‌گردد', gotCat.indexOf(NASTY) !== -1,
   JSON.stringify(gotCat.filter(c => c.indexOf('خطر') !== -1)));
un = quiet(); const pn2 = uiPinCategory(NASTY, 'pin'); un();
ok('و انتخابِ همان دسته با همان رشته کار می‌کند',
   pn2.ok === true && seriesPin_() && seriesPin_().kind === 'cat', String(pn2.message).slice(0,50));
const pickN = pickSeries_(hub);
ok('و انتخاب‌کننده هم همان دسته را می‌فهمد',
   pickN && seriesCatOf_(pickN.vals) === NASTY, pickN ? seriesCatOf_(pickN.vals) : 'هیچ');

// ── نامِ خواندنی در پیام‌ها، نه کلیدِ درونی ──
un = quiet(); uiClearPin(); uiPinSeries(liveKey, 'pin'); un();
const hName = seriesBoardHtml_(seriesBoardData_(hub));
ok('بنرِ انتخاب دستی نامِ مجموعه را نشان می‌دهد، نه کلیدِ درونی',
   hName.indexOf('مجموعهٔ «' + liveName + '»') !== -1 &&
   hName.indexOf('مجموعهٔ «' + liveKey + '»') === -1, String(liveName));
ok('هشدارِ منو هم نامِ مجموعه را می‌گوید', (() => {
  let alerted = '';
  global.__UI = { alert: function () { alerted += Array.prototype.join.call(arguments, ' | '); },
                  showModalDialog: () => {},
                  createMenu: () => ({ addItem(){return this;}, addSeparator(){return this;},
                  addSubMenu(){return this;}, addToUi(){} }), ButtonSet: { OK: 1 } };
  un = quiet(); try { runProduceSpecial(); } catch (e) {} un();
  global.__UI = null;
  return alerted.indexOf(liveName) !== -1 && alerted.indexOf('«' + liveKey + '»') === -1;
})(), 'نام: ' + liveName);
un = quiet(); uiClearPin(); shReg.getRange(rowN.row, SC.CAT, 1, 1)
  .setValues([[String(rowN.vals[SC.CAT-1] || '')]]); un();

// ══════════════════════ ۱۰) وضعیت و ناظر ══════════════════════════════════
console.log('\n=== ۱۰) همین اطلاعات در فایل وضعیت هم می‌آید ===');
const stKey = readSeriesReg_(hub).rows.filter(r => seriesHasWork_(hub, r.key))[0].key;
const stName = readSeriesReg_(hub).byKey[stKey].vals[SC.NAME-1];
un = quiet(); const stPin = uiPinSeries(stKey, 'pin');
const st = writeStatus_(hub, 'آزمون'); uiClearPin(); un();
console.log('  ', JSON.stringify({ pin: st.special.pin, overall: st.special.overallPct,
  cats: (st.special.byCategory || []).map(c => c.cat + ':' + c.pct + '٪') }));
ok('سنجاق در فایل وضعیت گزارش می‌شود',
   stPin.ok === true && st.special.pin && st.special.pin.kind === 'series');
ok('و نامِ خواندنیِ مجموعه هم در فایل وضعیت هست (نه فقط کلید)',
   st.special.pin.name === String(stName), String(st.special.pin.name));
ok('درصدِ کل در فایل وضعیت هست', typeof st.special.overallPct === 'number');
ok('پیشرفتِ هر دسته در فایل وضعیت هست',
   (st.special.byCategory || []).length >= 2,
   (st.special.byCategory || []).length + ' دسته');
ok('زمانِ آخرین اسکن هم گزارش می‌شود', !!st.special.scannedAt, st.special.scannedAt);

console.log('\n=== ۱۱) پنجره از منو باز می‌شود ===');
ok('showSeriesBoard وجود دارد', typeof showSeriesBoard === 'function');
ok('و در فایل منو ثبت شده',
   /showSeriesBoard/.test(fs.readFileSync(DIR + '05_Setup.gs', 'utf8')));
let shown = null;
global.__UI = { showModalDialog: (o, t) => { shown = { html: o.getContent(), title: t }; },
                alert: () => {}, createMenu: () => ({ addItem(){return this;},
                addSeparator(){return this;}, addSubMenu(){return this;}, addToUi(){} }),
                ButtonSet: { OK: 1 } };
un = quiet(); showSeriesBoard(); un();
global.__UI = null;
ok('پنجره با محتوای واقعی نشان داده شد',
   shown && shown.html.length > 3000 && shown.title.indexOf('مجموعه') !== -1,
   shown ? shown.html.length + ' نویسه' : 'باز نشد');


// ══════════════════ ۱۲) اصلاحاتِ دورِ دوم بازبینی ══════════════════════════
console.log('\n=== ۱۲) نامِ فایلی که کلیدش با نام‌های درونیِ جاوااسکریپت یکی است ===');
// یک فایل به نامِ constructor.mp4 کلِ اسکن و تخته و تولید را می‌کشت
for (let i = 1; i <= 9; i++) tsh._d.push(vRow('TG','constructor.mp4', i, 9, when(160+i)));
for (let i = 1; i <= 9; i++) tsh._d.push(vRow('TH','toString.mp4', i, 9, when(170+i)));
tsh._max = tsh._d.length + 20;
global.__PROPS[PK.SERIES_SCAN_AT] = '2020-01-01 00:00';
let scanErr = null;
un = quiet(); try { scanSeries(true); } catch (e) { scanErr = e; } un();
ok('اسکن با نامِ «constructor» رد نمی‌شود', scanErr === null, scanErr ? scanErr.message : '');
const regProto = readSeriesReg_(hub);
ok('و همین مجموعه‌ها هم ثبت می‌شوند',
   !!regProto.byKey['constructor'] && !!regProto.byKey['tostring'],
   regProto.rows.length + ' مجموعه');
ok('مجموعه‌های سالمِ همان اسکن هم نگه داشته شدند',
   !!regProto.byKey['mabanitahlil ostad'] && !!regProto.byKey['elmsanjesh daneshgah']);
let boardErr = null, hProto = '';
un = quiet(); try { hProto = seriesBoardHtml_(seriesBoardData_(hub)); }
catch (e) { boardErr = e; } un();
ok('تخته هم ساخته می‌شود', boardErr === null && hProto.length > 3000,
   boardErr ? boardErr.message : hProto.length + ' نویسه');
un = quiet(); const pProto = uiPinSeries('valueOf', 'pin'); un();
ok('کلیدِ درونیِ جاوااسکریپت به‌جای مجموعه پذیرفته نمی‌شود',
   pProto.ok === false && /پیدا نشد/.test(String(pProto.message)));
un = quiet(); const pCtor = uiPinSeries('constructor', 'pin'); un();
ok('ولی مجموعهٔ واقعیِ هم‌نام، درست سنجاق می‌شود',
   pCtor.ok === true && seriesPin_() && seriesPin_().value === 'constructor');
un = quiet(); uiClearPin(); un();

console.log('\n=== ۱۳) ردیفِ «نادیده گرفته شد» سنجاق نمی‌شود ===');
const shReg2 = hub.getSheetByName(CFG.SERIES_TAB);
const rowSk = readSeriesReg_(hub).byKey['tostring'];
shReg2.getRange(rowSk.row, SC.STATUS, 1, 1).setValues([[SST.SKIPPED]]);
const bdSk = seriesBoardData_(hub);
const sSk = bdSk.groups.reduce((a,g)=>a.concat(g.series),[]).find(x => x.key === 'tostring');
ok('در تخته «کارِ ناتمام» حساب نمی‌شود', sSk && sSk.hasWork === false, String(sSk && sSk.status));
const hSk = seriesBoardHtml_(bdSk);
ok('و دکمه‌اش خاموش است', (hSk.match(/<button [^>]*data-key="tostring"[^>]*>/) || [''])[0]
   .indexOf('disabled') !== -1);
un = quiet(); const pSk = uiPinSeries('tostring', 'pin'); un();
ok('سرور هم انتخابش را رد می‌کند', pSk.ok === false && seriesPin_() === null,
   String(pSk.message).slice(0, 60));

console.log('\n=== ۱۴) نشانِ «تمام شد — بسته می‌شود» و بنرِ سنجاقِ تمام‌شده ===');
// مجموعه‌ای که «در حال تولید» است ولی قطعهٔ نساخته ندارد
const doneish = readSeriesReg_(hub).rows.filter(r =>
  String(r.vals[SC.STATUS-1]) === SST.DONE && seriesHasWork_(hub, r.key) === false)[0];
shReg2.getRange(doneish.row, SC.STATUS, 1, 1).setValues([[SST.ACTIVE]]);
const hBadge = seriesBoardHtml_(seriesBoardData_(hub));
ok('مجموعهٔ بی‌کارِ «در حال تولید» با نشانِ درست دیده می‌شود',
   hBadge.indexOf('تمام شد — بسته می‌شود') !== -1);
un = quiet(); setSeriesPin_('series', doneish.key); un();
const bdEx = seriesBoardData_(hub);
ok('تخته می‌فهمد کارِ سنجاق تمام شده', bdEx.pin && bdEx.pin.exhausted === true);
const hEx = seriesBoardHtml_(bdEx);
ok('و بنر جملهٔ متناقض نمی‌گوید',
   hEx.indexOf('انتخاب دستی تمام شد') !== -1 &&
   hEx.indexOf('تا این کار تمام نشود، موتور سراغ چیز دیگری نمی‌رود') === -1);
un = quiet(); const stEx = writeStatus_(hub, 'آزمون'); uiClearPin();
shReg2.getRange(doneish.row, SC.STATUS, 1, 1).setValues([[SST.DONE]]); un();
ok('فایل وضعیت هم همین را به ناظر می‌گوید', stEx.special.pin &&
   stEx.special.pin.exhausted === true);

console.log('\n=== ۱۵) زمانِ سنجاق با کلیکِ تکراری جابه‌جا نمی‌شود ===');
const liveK2 = readSeriesReg_(hub).rows.filter(r => seriesHasWork_(hub, r.key))[0].key;
un = quiet(); uiPinSeries(liveK2, 'pin'); un();
// مهرِ زمان را با یک نشانهٔ ساختگی عوض می‌کنیم؛ اگر کلیکِ دوباره آن را بازنویسد،
// یعنی هر تحویلِ تکراری بنر را جلو می‌برد.
global.__PROPS[PK.SP_PIN_AT] = 'SENTINEL-1400';
un = quiet(); uiPinSeries(liveK2, 'pin'); un();
ok('زمانِ «از ...» با کلیکِ دوبارهٔ همان مجموعه بازنویسی نمی‌شود',
   seriesPin_().at === 'SENTINEL-1400', String(seriesPin_().at));
un = quiet(); const otherLive = readSeriesReg_(hub).rows
  .filter(r => r.key !== liveK2 && seriesHasWork_(hub, r.key))[0];
uiPinSeries(otherLive.key, 'pin'); un();
ok('ولی انتخابِ مجموعهٔ دیگر زمانِ تازه می‌گیرد',
   seriesPin_().at !== 'SENTINEL-1400' && seriesPin_().value === otherLive.key,
   String(seriesPin_().at));
un = quiet(); uiClearPin(); un();

console.log('\n=== ۱۶) نویسهٔ سطرِ تازه در نامِ دسته، دکمه را نمی‌کشد ===');
const rowCR = readSeriesReg_(hub).rows.filter(r => seriesHasWork_(hub, r.key))[0];
const CRCAT = 'دستهٔ\rبا سطر';
shReg2.getRange(rowCR.row, SC.CAT, 1, 1).setValues([[CRCAT]]);
const hCR = seriesBoardHtml_(seriesBoardData_(hub));
ok('CR در data-attribute کدگذاری شد', /data-cat="[^"]*&#13;/.test(hCR));
ok('و رشتهٔ برگشتی مو‌به‌مو همان است', (() => {
  const m = hCR.match(/data-cat="([^"]*)"/g) || [];
  const dec = s2 => s2.replace(/&#13;/g,'\r').replace(/&#10;/g,'\n').replace(/&#9;/g,'\t')
                      .replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<')
                      .replace(/&amp;/g,'&');
  return m.map(x => dec(x.slice(10, -1))).indexOf(seriesCatOf_(rowCR.vals) === CRCAT ? CRCAT : CRCAT) !== -1;
})());
un = quiet(); shReg2.getRange(rowCR.row, SC.CAT, 1, 1)
  .setValues([[String(rowCR.vals[SC.CAT-1] || '')]]); un();

console.log('\n=== ۱۷) کلیدِ قسمت با فاصلهٔ اضافه هم به مجموعه وصل می‌شود ===');
const shPart = hub.getSheetByName(CFG.SERIES_PART_TAB);
const pr0 = readSeriesParts_(hub).rows[0];
shPart.getRange(pr0.row, SP.KEY, 1, 1).setValues([[' ' + pr0.key + ' ']]);
const pAfter = readSeriesParts_(hub);
ok('فاصلهٔ اضافه در کلیدِ قسمت نادیده گرفته می‌شود',
   (pAfter.byKey[pr0.key] || []).some(x => x.row === pr0.row));
un = quiet(); shPart.getRange(pr0.row, SP.KEY, 1, 1).setValues([[pr0.key]]); un();

console.log('\n✅ هر ' + pass + ' آزمونِ تخته و انتخاب دستی گذشت.');
