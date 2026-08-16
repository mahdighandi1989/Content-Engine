/* probe_r3_lib.js — shared loader + fixtures for round-3 review probes.
   Mirrors the idiom of run_special_test.js / run_board_test.js. */
const fs = require('fs');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs',
               '14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];

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
const when = i => { const d = new Date(D0.getTime() - (600 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };

// درسی به اندازهٔ واقعی: هر قطعه ~۴ هزار نویسه تا بودجهٔ ۴۲ هزار نویسه‌ای چند
// قطعه بگیرد و «ادامه در قسمت بعد» رخ بدهد.
const LESSON = (n, mult) => 'دقیقهٔ ' + n + '. مدرس مفهومِ ' + n + ' را توضیح می‌دهد. ' +
  ('شرحِ تفصیلیِ مفهومِ ' + n + ' با مثال‌های عملی و هشدارِ اشتباهِ رایج. ').repeat(mult || 45);

// ------------------------------------------------------------------ trap
// آشکارسازِ «سایتِ جامانده»: هر Object.create(null) پشتِ یک Proxy می‌رود که اگر
// کسی روی آن X.hasOwnProperty / X.toString / … صدا بزند (یعنی متدِ Object.prototype
// را از خودِ شیء بخواهد) فریاد می‌زند. hasOwnProperty.call از تلهٔ get رد نمی‌شود.
const PROTO_MEMBERS = ['hasOwnProperty','toString','valueOf','isPrototypeOf',
                       'propertyIsEnumerable','toLocaleString'];
const TRAPS = [];
function installProtoTrap() {
  const realCreate = Object.create;
  Object.create = function (proto, props) {
    const o = realCreate.apply(Object, arguments);
    if (proto !== null) return o;
    return new Proxy(o, {
      // record-only: behaviour identical to a real null-prototype object
      // (returns undefined), so nothing is perturbed. Stacks are reviewed after.
      get(t, p, r) {
        if (typeof p === 'string' && PROTO_MEMBERS.indexOf(p) !== -1 &&
            !Object.prototype.hasOwnProperty.call(t, p)) {
          const err = new Error('PROTO-READ .' + p);
          TRAPS.push({ prop: p, stack: err.stack });
        }
        return Reflect.get(t, p, r);
      }
    });
  };
}
function traps() { return TRAPS; }

// ------------------------------------------------------------------ load
function load(opt) {
  opt = opt || {};
  if (opt.trapProto) installProtoTrap();
  require('./mock.js');
  let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
  (0, eval)(src);
}

// -------------------------------------------------------------- fixtures
function vRow(fid, name, no, tot, ts, mult) {
  const r = new Array(TVH.length).fill('');
  r[0]=ts; r[1]=fid; r[2]=name; r[4]='https://drive.google.com/file/d/'+fid+'/view';
  r[5]='بله'; r[6]=no; r[7]=tot; r[8]=((no-1)*60)+'-'+(no*60)+' ثانیه'; r[9]=tot*60+' ثانیه';
  r[13]=LESSON(no, mult); r[19]='نمودار '+no;
  r[17]=JSON.stringify({Topic:'مفهوم '+no,Message:'پیام '+no});
  r[21]='خلاصهٔ قطعهٔ '+no; r[22]='SUCCESS';
  r[28]=JSON.stringify([{term:'اصطلاحِ '+no,definition:'تعریفِ '+no}]);
  return r;
}
function dRow(fid, name, no, tot, ts, mult) {
  const r = new Array(GDH.length).fill('');
  r[0]=ts; r[1]=fid; r[2]=name; r[4]='https://drive.google.com/file/d/'+fid+'/view';
  r[5]='بله'; r[6]=no; r[7]=tot; r[8]='صفحهٔ '+(no*10);
  r[10]='Original page text '+no+'. '+LESSON(no, mult);
  r[11]='متنِ فارسیِ صفحهٔ '+no+'. '+LESSON(no, mult);
  r[15]=JSON.stringify(['نکتهٔ '+no]); r[17]='خلاصهٔ '+no; r[18]='SUCCESS';
  r[21]='موضوعِ '+no; r[24]=JSON.stringify([{idea:'ایدهٔ '+no,explanation:'شرحِ '+no}]);
  r[50]='مخاطب باید '+no+' را یاد بگیرد.';
  return r;
}

function mkSheet(id, tabs) {
  const { Spread } = require('./mock.js');
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(1000, sh._d.length + 20); });
  global.__SS[id] = ss; return ss;
}

/** courses: [{file, name, chunks, mult, doc:bool}] */
function buildSheets(courses) {
  const { Spread } = require('./mock.js');
  const SRC = {}; global.CFG.SOURCES.forEach(s => SRC[s.key] = s);
  const tv = [], dv = [];
  let t = 0;
  courses.forEach(c => {
    for (let i = 1; i <= c.chunks; i++) {
      t++;
      if (c.doc) dv.push(dRow(c.file, c.name, i, c.chunks, when(t), c.mult));
      else tv.push(vRow(c.file, c.name, i, c.chunks, when(t), c.mult));
    }
  });
  mkSheet(SRC.trading.id, [{ name: 'Video Analysis', hdr: TVH, rows: tv }]);
  mkSheet(SRC.general.id, [{ name: 'Document Analysis', hdr: GDH, rows: dv }]);
  global.CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
    ss.insertSheet('S1'); global.__SS[s.id] = ss; } });
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
  global.__PROPS['TELEGRAM_CHAT_ID'] = '123';
}

// ------------------------------------------------------------- model stub
/** cite(nos) -> array of chunk numbers the fake model claims to have narrated */
function installStub(cfg) {
  cfg = cfg || {};
  const state = { specialPrompts: [], curriculumCalls: 0, specialCalls: 0, ttsCalls: 0,
                  varietyCalls: 0, lastNos: null };
  global.__STUB = function (url, body) {
    if (url.indexOf('api.telegram.org') !== -1)
      return { code: 200, json: { ok: true, result: { message_id: 1 } } };
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
    if (url.indexOf('tts') !== -1) { state.ttsCalls++;
      return { code: 200, json: { candidates: [{ content: { parts: [{
        inlineData: { data: Buffer.alloc(8000).toString('base64') } }] } }] } }; }
    const t = body.contents ? body.contents[0].parts[0].text : '';
    if (t.indexOf('ترتیبِ درستِ یادگیری') !== -1) {
      state.curriculumCalls++;
      const keys = [...t.matchAll(/- key: (.+?) \| نام:/g)].map(m => m[1].trim());
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        plan: keys.map((k, i) => Object.assign({ key: k, order: i + 1, level: 'مقدماتی',
          topic: 'موضوع', category: 'مالی، ترید و اقتصاد', related: '', why: 'x' },
          (cfg.plan && cfg.plan[k]) || {})) }) }] } }] } };
    }
    if (t.indexOf('قاعده‌های سختِ این برنامه') !== -1) {
      state.specialCalls++;
      state.specialPrompts.push(t);
      const nos = [...t.matchAll(/--- قطعهٔ (\d+)(?:\/(\d+))?/g)].map(m => Number(m[1]));
      state.lastNos = nos.slice();
      const cited = cfg.cite ? cfg.cite(nos, state.specialCalls) : nos.slice();
      const nsec = Math.max(1, Math.min(6, cited.length || 1));
      const per = Math.ceil(cited.length / nsec) || 1;
      const secs = [];
      const reps = (global.__THIN || cfg.thin) ? 3 : 220;
      for (let k = 0; k < nsec; k++) secs.push({
        heading: 'بخشِ ' + (k + 1),
        narration: ('متنِ آموزشیِ بخشِ ' + (k + 1) + ' دربارهٔ همین قطعه‌ها. ').repeat(reps),
        tone: 'آرام', chunkNos: cited.slice(k * per, (k + 1) * per), enrichIds: [] });
      const W = global.todayWords_();
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        title: 'عنوانِ درس', hook: global.CFG.SPECIAL_SHOW_NAME + '. امروز ' + W.weekday +
          '، ' + W.jalali + '.',
        recap: '', goal: { problem: 'م', behavior: 'ر', message: 'پ' },
        sections: secs, outro: 'پایان.', summary: 'خلاصه.', tags: ['برچسب'],
        coverage: 'پوشش' }) }] } }] } };
    }
    state.varietyCalls++;
    const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
    const W2 = global.todayWords_();
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      title: 'ت', hook: global.CFG.SHOW_NAME + '. امروز ' + W2.weekday + '، ' + W2.jalali + '.',
      sections: [1,2,3,4,5].map(k => ({ heading:'ب'+k, narration:'م. '.repeat(40),
        tone:'آرام', sourceIds: ids.slice(k*2,k*2+2) })),
      outro: 'پایان.', summary: 'خ.', tags: ['ب'] }) }] } }] } };
  };
  return state;
}

const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

module.exports = { load, buildSheets, installStub, quiet, traps, installProtoTrap,
                   TVH, GDH, vRow, dRow, mkSheet, when, LESSON };
