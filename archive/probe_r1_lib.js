/* probe_r1_lib.js — R1 adversarial probe fixture (pin / board scope).
   Builds the CONTENT-HUB registry DIRECTLY (no scan, no model) so that any
   character a user could type into a sheet cell can be planted verbatim. */
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

/* Hub + empty source sheets. No LLM traffic is needed for the pin/board path;
   the stub only exists so an accidental fetch is loud rather than silent. */
function bootHub() {
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  global.__PROPS['TELEGRAM_BOT_TOKEN'] = 'TOK';
  global.__PROPS['TELEGRAM_CHAT_ID'] = '123';
  CFG.SOURCES.forEach(s => { if (!global.__SS[s.id]) { const ss = new Spread('s', s.id);
    ss.insertSheet('S1'); global.__SS[s.id] = ss; } });
  global.__STUB = global.__STUB || function (url) { throw new Error('unexpected fetch ' + url); };
  const hub = getHub_();
  ensureSeriesTabs_(hub);
  // اسکن را تازه نشان بده تا scanSeries(false) کاری نکند و فیکسچر دست‌نخورده بماند
  global.__PROPS[PK.SERIES_SCAN_AT] = nowStr_();
  return hub;
}

/** یک ردیفِ رجیستری، مستقیم و بی‌واسطه — همان‌طور که کاربر در شیت می‌نویسد. */
function addSeries(hub, o) {
  const sh = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const r = new Array(SERIES_HEADERS.length).fill('');
  r[SC.KEY - 1]     = o.key;
  r[SC.NAME - 1]    = o.name === undefined ? o.key : o.name;
  r[SC.SRC - 1]     = o.src || 'trading';
  r[SC.TAB - 1]     = o.tab || 'Video Analysis';
  r[SC.KIND - 1]    = o.kind || 'video';
  r[SC.PARTS - 1]   = o.parts === undefined ? 1 : o.parts;
  r[SC.CHUNKS - 1]  = o.chunks === undefined ? 10 : o.chunks;
  r[SC.LEVEL - 1]   = o.level || 'مقدماتی';
  r[SC.TOPIC - 1]   = o.topic || '';
  r[SC.ORDER - 1]   = o.order === undefined ? 1 : o.order;
  r[SC.STATUS - 1]  = o.status === undefined ? SST.NEW : o.status;
  r[SC.EPISODES - 1] = o.episodes || '';
  r[SC.LAST_EP_AT - 1] = o.lastEpAt || '';
  r[SC.CAT - 1]     = o.cat === undefined ? 'مالی، ترید و اقتصاد' : o.cat;
  sh.appendRow(r);
  return sh.getLastRow();
}

/** یک ردیفِ «قسمت». chunks/doneTo هر مقداری می‌توانند باشند (خالی، کسری، منفی…). */
function addPart(hub, o) {
  const sh = ensureTab_(hub, CFG.SERIES_PART_TAB, SPART_HEADERS);
  const r = new Array(SPART_HEADERS.length).fill('');
  r[SP.KEY - 1]    = o.key;
  r[SP.FILE - 1]   = o.file === undefined ? ('F' + Math.random().toString(36).slice(2, 8)) : o.file;
  r[SP.NAME - 1]   = o.name === undefined ? 'part' : o.name;
  r[SP.SEQ - 1]    = o.seq === undefined ? 1 : o.seq;
  r[SP.SRC - 1]    = o.src || 'trading';
  r[SP.TAB - 1]    = o.tab || 'Video Analysis';
  r[SP.CHUNKS - 1] = o.chunks === undefined ? 10 : o.chunks;
  r[SP.ROWS - 1]   = o.rows === undefined ? '2-11' : o.rows;
  r[SP.LINK - 1]   = o.link || '';
  r[SP.DONE_TO - 1] = o.doneTo === undefined ? 0 : o.doneTo;
  r[SP.EPISODES - 1] = o.episodes || '';
  sh.appendRow(r);
  return sh.getLastRow();
}

function setCell(hub, tab, row, col, v) {
  hub.getSheetByName(tab).getRange(row, col, 1, 1).setValues([[v]]);
}

/* ---- state integrity: full snapshot of props + every hub sheet ---- */
function snapshot(hub) {
  const sheets = {};
  hub.getSheets().forEach(s => { sheets[s.getName()] = JSON.stringify(s._d); });
  return { props: JSON.stringify(global.__PROPS), sheets: sheets,
           fetches: global.__FETCHES.length };
}
function diff(a, b, ignoreTabs) {
  ignoreTabs = ignoreTabs || [];
  const out = [];
  if (a.props !== b.props) {
    const pa = JSON.parse(a.props), pb = JSON.parse(b.props);
    Object.keys(Object.assign({}, pa, pb)).forEach(k => {
      if (pa[k] !== pb[k]) out.push('prop ' + k + ': ' + JSON.stringify(pa[k]) + ' -> ' +
                                    JSON.stringify(pb[k]));
    });
  }
  Object.keys(Object.assign({}, a.sheets, b.sheets)).forEach(t => {
    if (ignoreTabs.indexOf(t) !== -1) return;
    if (a.sheets[t] !== b.sheets[t]) out.push('sheet ' + t + ' changed');
  });
  if (a.fetches !== b.fetches) out.push('fetches ' + a.fetches + ' -> ' + b.fetches);
  return out;
}

const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
let PASS = 0, FAIL = 0; const FAILS = [];
const ok = (n, c, d) => {
  console.log('  ' + (c ? 'PASS' : 'FAIL') + ' | ' + n + (d ? '  [' + d + ']' : ''));
  if (c) PASS++; else { FAIL++; FAILS.push(n + (d ? '  [' + d + ']' : '')); }
  return !!c;
};
const report = (title) => {
  console.log('\n===== ' + title + ': ' + PASS + ' pass / ' + FAIL + ' fail =====');
  if (FAILS.length) FAILS.forEach(f => console.log('  FAIL> ' + f));
  return { pass: PASS, fail: FAIL };
};

/** خطِ گزارش (تبِ سیاهه) — برای سنجشِ اینکه چه چیزی به کاربر نشان داده می‌شود. */
function logText(hub) {
  const sh = hub.getSheetByName(CFG.TAB_LOG);
  if (!sh) return '';
  return sh._d.map(r => (r || []).join(' ')).join('\n');
}
function cp(s) { return Array.from(String(s)).map(c => c.codePointAt(0).toString(16)).join(' '); }

module.exports = { loadEngine, bootHub, addSeries, addPart, setCell, snapshot, diff,
                   quiet, ok, report, logText, cp, Sheet, Spread };
