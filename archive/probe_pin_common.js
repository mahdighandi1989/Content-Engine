/* probe_pin_common.js — shared fixture for the adversarial pin/board probes.
   Loads the real engine into Node via the Apps Script mock, builds three
   training courses (A big, B small, C small) and stubs the model. */
const fs = require('fs');
const { Spread, Sheet } = require('mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs',
               '14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];

function loadEngine() {
  let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
  (0, eval)(src);
}

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

function mkSheet(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 20); });
  global.__SS[id] = ss; return ss;
}

/* A = 3 files x 12 chunks (big, never finishes), B = 1 x 12, C = 1 x 6 */
const COURSES = [
  { name: 'CourseAlpha_Ostad', files: 3, chunks: 12, fid: 'A' },
  { name: 'CourseBeta_Ostad',  files: 1, chunks: 12, fid: 'B' },
  { name: 'CourseGamma_Ostad', files: 1, chunks: 6,  fid: 'C' }
];

function buildFixture(courses) {
  courses = courses || COURSES;
  const rows = []; let t = 0;
  courses.forEach(c => {
    for (let f = 1; f <= c.files; f++) {
      for (let i = 1; i <= c.chunks; i++) {
        rows.push(vRow(c.fid + f, p2(f) + '_' + c.name + '.mp4', i, c.chunks, when(++t)));
      }
    }
  });
  const SRC = {}; CFG.SOURCES.forEach(s => SRC[s.key] = s);
  mkSheet(SRC.trading.id, [{ name: 'Video Analysis', hdr: TVH, rows: rows }]);
  CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
    ss.insertSheet('S1'); global.__SS[s.id] = ss; } });
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
  global.__PROPS['TELEGRAM_CHAT_ID'] = '123';
  return SRC;
}

/* PLAN is mutable by the probe: key -> {order, level, topic, category} */
const PLAN = {
  'coursealpha ostad': { order: 2, level: 'میانی',    topic: 'الف', category: 'مالی، ترید و اقتصاد' },
  'coursebeta ostad':  { order: 3, level: 'پیشرفته', topic: 'ب',  category: 'علمی و آموزشی' },
  'coursegamma ostad': { order: 1, level: 'مقدماتی', topic: 'ج',  category: 'مالی، ترید و اقتصاد' }
};

function installStub(plan) {
  plan = plan || PLAN;
  global.__STUB = function (url, body) {
    if (url.indexOf('api.telegram.org') !== -1) return { code: 200, json: { ok: true, result: {} } };
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
    if (url.indexOf('tts') !== -1) return { code: 200, json: { candidates: [{ content: { parts: [{
      inlineData: { data: Buffer.alloc(20000).toString('base64') } }] } }] } };
    const t = body.contents ? body.contents[0].parts[0].text : '';
    if (t.indexOf('ترتیبِ درستِ یادگیری') !== -1) {
      global.__PLAN_CALLS = (global.__PLAN_CALLS || 0) + 1;
      const keys = [...t.matchAll(/- key: (.+?) \| نام:/g)].map(m => m[1].trim());
      global.__PLAN_LAST_KEYS = keys;
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        plan: keys.map(k => Object.assign({ key: k, order: 9, level: 'میانی', topic: '—',
          category: 'متفرقه', related: '', why: 'x' }, plan[k] || {})) }) }] } }] } };
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
}

const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
let PASS = 0, FAIL = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + ' | ' + n + (d ? ' — ' + d : ''));
  if (c) PASS++; else FAIL++; return !!c; };
const score = () => ({ pass: PASS, fail: FAIL });

/* run one full special episode incl. the audio continuation loop */
function runAll() {
  const r = produceSpecialEpisode();
  let d = 0; while (global.__PROPS[PK.SP_PENDING] && d++ < 80) produceSpecialContinue();
  return r;
}

function regRow(hub, sub) {
  return readSeriesReg_(hub).rows.find(r => String(r.vals[SC.NAME - 1]).indexOf(sub) !== -1);
}
function cursorOf(hub, key) {
  return (readSeriesParts_(hub).byKey[key] || [])
    .map(p => (Number(p.vals[SP.SEQ-1])||0) + ':' + (Number(p.vals[SP.DONE_TO-1])||0)).join(' ');
}
function statusOf(hub, key) {
  const r = readSeriesReg_(hub).rows.find(x => x.key === key);
  return r ? String(r.vals[SC.STATUS-1]) : '(missing)';
}

/* count getRange() calls against a named tab */
function countReads(tabName, fn) {
  const orig = Sheet.prototype.getRange;
  let n = 0;
  Sheet.prototype.getRange = function (...a) { if (this._n === tabName) n++; return orig.apply(this, a); };
  try { fn(); } finally { Sheet.prototype.getRange = orig; }
  return n;
}

module.exports = { loadEngine, buildFixture, installStub, quiet, ok, score, runAll,
                   regRow, cursorOf, statusOf, countReads, vRow, mkSheet, TVH, when, PLAN,
                   COURSES, p2 };
