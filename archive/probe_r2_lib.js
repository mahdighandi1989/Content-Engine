/* R2 probe library — loads the real engine into Node, gives a controllable clock,
   builds realistic source sheets, and stubs the model. No engine file is modified. */
const fs = require('fs');
const { Spread } = require('./mock.js');

const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs',
               '14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

// ───────────────────────────── controllable clock ─────────────────────────
const RealDate = Date;
let OFFSET = 0;
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(RealDate.now() + OFFSET); else super(...a); }
  static now() { return RealDate.now() + OFFSET; }
}
global.Date = FakeDate;
const clock = {
  advanceH(h) { OFFSET += h * 3600 * 1000; return new Date(); },
  advanceMin(m) { OFFSET += m * 60 * 1000; return new Date(); },
  now() { return new Date(); },
  stamp() { return nowStr_(); }
};

// ───────────────────────────── console helpers ────────────────────────────
let PASS = 0, FAIL = 0;
const RES = [];
function ok(name, cond, detail) {
  RES.push({ name, cond: !!cond, detail: detail === undefined ? '' : String(detail) });
  console.log('  ' + (cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail !== undefined ? '  [' + detail + ']' : ''));
  if (cond) PASS++; else FAIL++;
  return !!cond;
}
function summary(tag) {
  console.log('\n=== ' + tag + ': ' + PASS + ' pass / ' + FAIL + ' fail ===');
  return { PASS, FAIL, RES };
}
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

// ───────────────────────────── fixtures ───────────────────────────────────
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
const D0 = new RealDate();
const when = i => { const d = new RealDate(D0.getTime() - (600 - i) * 3600 * 1000);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth()+1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00`; };

// ~4.6k chars per chunk → about 9 chunks fit the 42k budget → 2 episodes per 14-chunk part
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

function mkSheet(id, tabs) {
  const ss = new Spread('s', id);
  tabs.forEach(t => { const sh = ss.insertSheet(t.name); sh._d.push(t.hdr.slice());
    t.rows.forEach(r => sh._d.push(r.slice())); sh._max = Math.max(4000, sh._d.length + 200); });
  global.__SS[id] = ss; return ss;
}
const SRC = {};
function initSources(tradingRows, generalRows) {
  CFG.SOURCES.forEach(s => SRC[s.key] = s);
  mkSheet(SRC.trading.id, [{ name: 'Video Analysis', hdr: TVH, rows: tradingRows || [] }]);
  mkSheet(SRC.general.id, [{ name: 'Document Analysis', hdr: GDH, rows: generalRows || [] }]);
  CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
    ss.insertSheet('S1'); global.__SS[s.id] = ss; } });
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
  global.__PROPS['TELEGRAM_CHAT_ID'] = '123';
}
/** append chunk rows for a new (or existing) part into a source tab */
function addPart(srcKey, tab, fid, name, nChunks, tsBase, kind) {
  const sh = global.__SS[SRC[srcKey].id].getSheetByName(tab);
  for (let i = 1; i <= nChunks; i++) {
    sh._d.push((kind === 'doc' ? dRow : vRow)(fid, name, i, nChunks, when(tsBase + i)));
  }
  sh._max = sh._d.length + 200;
  return sh;
}
/** add extra chunks inside an EXISTING part (pipeline finished slicing later) */
function addChunksToPart(srcKey, tab, fid, name, fromNo, toNo, newTotal, tsBase, kind) {
  const sh = global.__SS[SRC[srcKey].id].getSheetByName(tab);
  for (let i = fromNo; i <= toNo; i++) {
    sh._d.push((kind === 'doc' ? dRow : vRow)(fid, name, i, newTotal, when(tsBase + i)));
  }
  sh._max = sh._d.length + 200;
  return sh;
}

// ───────────────────────────── model stub ─────────────────────────────────
const LAST = { specialPrompt: '', curriculumPrompt: '', tts: 0 };
const MODE = { plan: {}, chunkNos: 'all', thin: false, ttsFail: false };
function installStub() {
  global.__STUB = function (url, body) {
    if (url.indexOf('api.telegram.org') !== -1) return { code: 200, json: { ok: true, result: {} } };
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
    if (url.indexOf('tts') !== -1) {
      LAST.tts++;
      if (MODE.ttsFail) return { code: 500, json: { error: { message: 'tts down' } } };
      return { code: 200, json: { candidates: [{ content: { parts: [{
        inlineData: { data: Buffer.alloc(20000).toString('base64') } }] } }] } };
    }
    const t = body.contents ? body.contents[0].parts[0].text : '';
    if (t.indexOf('ترتیبِ درستِ یادگیری') !== -1) {
      LAST.curriculumPrompt = t;
      const keys = [...t.matchAll(/- key: (.+?) \| نام:/g)].map(m => m[1].trim());
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        plan: keys.map(k => Object.assign({ key: k, order: 900, level: 'میانی', topic: '—',
          category: 'متفرقه', related: '', why: 'x' }, MODE.plan[k] || {})) }) }] } }] } };
    }
    if (t.indexOf('قاعده‌های سختِ این برنامه') !== -1) {
      LAST.specialPrompt = t;
      const nos = [...t.matchAll(/--- قطعهٔ (\d+)/g)].map(m => Number(m[1]));
      const W = todayWords_();
      const per = Math.max(1, Math.ceil(nos.length / 6));
      const rep = MODE.thin ? 8 : 220;
      const secs = [];
      for (let k = 0; k < 6; k++) {
        let cn;
        if (MODE.chunkNos === 'all') cn = nos.slice(k * per, (k + 1) * per);
        else if (MODE.chunkNos === 'ends') cn = (k === 0 ? nos.slice(0, 1) : (k === 5 ? nos.slice(-1) : []));
        else if (MODE.chunkNos === 'none') cn = [];
        else cn = nos.slice(k * per, (k + 1) * per);
        secs.push({ heading: 'بخشِ ' + (k+1),
          narration: 'متنِ آموزشیِ بخشِ ' + (k+1) + '. '.repeat(rep),
          tone: 'آرام', chunkNos: cn, enrichIds: [] });
      }
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

// ───────────────────────────── run helpers ────────────────────────────────
function runAll() {
  const r = produceSpecialEpisode();
  let d = 0; while (global.__PROPS[PK.SP_PENDING] && d++ < 80) produceSpecialContinue();
  return r || {};
}
function runQuiet(fn) { const un = quiet(); try { return fn(); } finally { un(); } }
function keyOf(name) { try { return seriesKeyFromStem_(seriesStem_(String(name))); } catch (e) { return ''; } }
function regSnapshot(hub) {
  const reg = readSeriesReg_(hub), parts = readSeriesParts_(hub);
  return reg.rows.map(r => ({
    key: r.key, name: String(r.vals[SC.NAME-1]), cat: seriesCatOf_(r.vals),
    order: r.vals[SC.ORDER-1], level: String(r.vals[SC.LEVEL-1]),
    status: String(r.vals[SC.STATUS-1]), lastEp: String(r.vals[SC.LAST_EP_AT-1]),
    eps: String(r.vals[SC.EPISODES-1]).trim(),
    parts: (parts.byKey[r.key] || []).map(p =>
      Number(p.vals[SP.SEQ-1]) + ':' + (Number(p.vals[SP.DONE_TO-1])||0) + '/' + Number(p.vals[SP.CHUNKS-1])).join(' ')
  }));
}
function showReg(hub, tag) {
  console.log('  --- registry ' + (tag || '') + ' ---');
  regSnapshot(hub).forEach(r => console.log('   ' + String(r.order).padStart(3) + ' ' +
    r.name.padEnd(26) + ' ' + String(r.cat).padEnd(22) + ' ' + r.status.padEnd(18) +
    ' eps[' + r.eps + '] last=' + r.lastEp + ' parts{' + r.parts + '}'));
}

module.exports = { clock, ok, summary, quiet, runQuiet, runAll, keyOf, regSnapshot, showReg,
                   initSources, addPart, addChunksToPart, installStub, LAST, MODE, SRC,
                   TVH, GDH, vRow, dRow, when, mkSheet, RealDate };
