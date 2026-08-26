/* probe_r4_lib.js — shared fixture builder for round-4 review of 16_Curate.gs.
   Same idiom as run_curate_test.js: fake source sheets, global.__STUB model,
   DriveApp.__register for the backup folder. */
const fs = require('fs');
const { Spread, DFolder } = require('./mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs',
               '14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs',
               '19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs',
               // ۲۳ تا ۲۸ تا ۶٫۲۰ اینجا نبودند. این همان شکلِ شکستی است که
               // run_wiring_test ۴٫۲ برایش ساخته شد — ولی آن فقط tests/run_*.js
               // را می‌گشت و این پرونده در tests/lib/ بود. یعنی شش سشنِ آزمون
               // که probe را می‌بارند، هر فراخوان به موسیقی/تقویم/جزوه/یوتیوب
               // را با ReferenceError می‌دیدند و try/catchِ فراخوان قورتش می‌داد.
               '23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs',
               '27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

// ── tiny assert harness ────────────────────────────────────────────────────
let PASS = 0, FAIL = 0; const FAILS = [];
function ok(n, c, d) {
  console.log('  ' + (c ? 'PASS' : 'FAIL') + ' | ' + n + (d !== undefined ? '  << ' + d : ''));
  if (c) PASS++; else { FAIL++; FAILS.push(n + (d !== undefined ? '  << ' + d : '')); }
  return !!c;
}
function summary(tag) {
  console.log('\n=== ' + tag + ' : ' + PASS + ' pass / ' + FAIL + ' fail ===');
  if (FAIL) { console.log('FAILED:'); FAILS.forEach(f => console.log('  * ' + f)); }
  return FAIL;
}
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

// ── source-sheet fixture ───────────────────────────────────────────────────
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
const when = i => { const d = new Date(D0.getTime() - (900 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };

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
function mkSheet(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 20); });
  global.__SS[id] = ss; return ss;
}

const SRC = {}; CFG.SOURCES.forEach(s => SRC[s.key] = s);

/** Build source sheets from a spec: [{fid, name, parts, textFn}] where each
 *  part gets `chunks` chunk-rows. Returns the trading sheet. */
function buildSources(specs) {
  const rows = [];
  let t = 0;
  specs.forEach(sp => {
    for (let pi = 1; pi <= (sp.parts || 1); pi++) {
      const fid = sp.fid + (sp.parts > 1 ? '_' + pi : '');
      const nm  = (sp.parts > 1 ? p2(pi) + '_' : '') + sp.name;
      for (let c = 1; c <= (sp.chunks || 6); c++) {
        rows.push(tRow(fid, nm, c, sp.chunks || 6, when(++t), sp.textFn || LESSON));
      }
    }
  });
  mkSheet(SRC.trading.id, [{ name: 'Video Analysis', hdr: TVH, rows: rows }]);
  CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
    ss.insertSheet('S1'); global.__SS[s.id] = ss; } });
  global.DriveApp.__register(CFG.BACKUP_FOLDER_ID, 'BACKUP');
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  return global.__SS[SRC.trading.id].getSheetByName('Video Analysis');
}

// ── model stub with counters + pluggable judge ─────────────────────────────
const STATS = { judgeCalls: 0, judgePrompts: [], otherCalls: 0, tts: 0 };
let JUDGE_FN = null;    // (entries[], rawPrompt) -> {verdicts:[...]} | raw string
function setJudge(fn) { JUDGE_FN = fn; }

function parseEntries(t) {
  const blocks = t.split('─────────────────────────────────').slice(1, -1);
  const out = [];
  for (const b of blocks) {
    const km = b.match(/key:\s*(.+)/);
    if (!km) continue;
    out.push({ key: km[1].trim(), block: b,
               isRowze: b.indexOf('مرثیه') !== -1 || b.indexOf('سینه می‌زند') !== -1,
               hasText: b.indexOf('(هیچ متنی خوانده نشد)') === -1 });
  }
  return out;
}
function defaultVerdict(e, i) {
  return { key: e.key, isCourse: !e.isRowze, score: e.isRowze ? 8 : 85,
    kindOfContent: e.isRowze ? 'مرثیه و روضه' : 'دورهٔ آموزشی',
    about: e.isRowze ? 'مجلسِ عزاداری و مرثیه‌خوانی است؛ درسی در آن گفته نمی‌شود.'
                     : 'آموزشِ گام‌به‌گامِ مفهوم‌های تحلیل بازار با مثال و تمرین.',
    topic: e.isRowze ? 'مرثیه' : 'تحلیل بازار',
    category: e.isRowze ? 'مذهبی و معنوی' : 'مالی، ترید و اقتصاد',
    level: 'میانی', related: '', orderHint: i + 1,
    why: e.isRowze ? 'متنِ نمونه مرثیه و نوحه است، نه درس.' : 'متن مفهوم تعریف می‌کند.' };
}

function installStub() {
  global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
  global.__PROPS['TELEGRAM_CHAT_ID'] = '123';
  global.__STUB = function (url, body) {
    if (url.indexOf('api.telegram.org') !== -1)
      return { code: 200, json: { ok: true, result: { message_id: 1 } } };
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
    if (url.indexOf('tts') !== -1) { STATS.tts++; return { code: 200, json: { candidates: [{ content: { parts: [{
      inlineData: { data: Buffer.alloc(20000).toString('base64') } }] } }] } }; }
    const t = body.contents ? body.contents[0].parts[0].text : '';

    if (t.indexOf('یک داوری بده') !== -1) {
      STATS.judgeCalls++; STATS.judgePrompts.push(t);
      const es = parseEntries(t);
      let payload;
      if (JUDGE_FN) payload = JUDGE_FN(es, t);
      else payload = { verdicts: es.map(defaultVerdict) };
      const text = (typeof payload === 'string') ? payload : JSON.stringify(payload);
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: text }] } }] } };
    }
    STATS.otherCalls++;
    // ── اعراب‌گذاری (نسخهٔ ۵٫۹): پژواکِ وفادارِ همان متن + اعراب ──
    // strip-compare موتور باید قبولش کند، پس فقط نشانه اضافه می‌کنیم.
    if (t.indexOf('اعراب‌گذاریِ کامل') !== -1 && t.indexOf('فیلد v') !== -1) {
      STATS.speakCalls = (STATS.speakCalls || 0) + 1;
      const piece = t.split('\n\n').slice(1).join('\n\n')
                     .replace(/\n\nیادآوری:[\s\S]*$/, '');
      const v = piece.replace(/([\u0622-\u064A\u066E-\u06D5])/g, '$1َ');
      return { code: 200, json: { candidates: [{ content: { parts: [{
        text: JSON.stringify({ v: v }) }] } }] } };
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
}

function syncAll(n) { const un = quiet(); let g = 0; while (g++ < (n || 30)) syncCatalog(); un(); }

// direct registry manipulation helpers
function regSheet() { return ensureTab_(getHub_(), CFG.SERIES_TAB, SERIES_HEADERS); }
function dumpReg(reg) {
  reg = reg || readSeriesReg_(getHub_());
  return reg.rows.map(r => ({ key: r.key, row: r.row,
    cat: String(r.vals[SC.CAT-1]), lvl: String(r.vals[SC.LEVEL-1]),
    order: r.vals[SC.ORDER-1], isCourse: String(r.vals[SC.IS_COURSE-1]),
    score: r.vals[SC.CSCORE-1], man: String(r.vals[SC.MANUAL-1]),
    st: String(r.vals[SC.STATUS-1]), judged: String(r.vals[SC.JUDGED-1]) }));
}

module.exports = { ok, summary, quiet, buildSources, installStub, setJudge, STATS,
                   syncAll, TVH, tRow, mkSheet, LESSON, ROWZE, when, p2, SRC,
                   regSheet, dumpReg, defaultVerdict, parseEntries,
                   get PASS() { return PASS; }, get FAIL() { return FAIL; } };
