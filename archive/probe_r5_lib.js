/* probe_r5_lib.js — shared fixture boot for the R5 review probes.
   Mirrors the idiom of run_curate_test.js: load mock, eval the 19 .gs files
   into global scope, register a distinct BACKUP folder via DriveApp.__register. */
const fs = require('fs');
const path = require('path');

const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
               '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs',
               '14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];

function boot() {
  const mock = require('./mock.js');
  let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
  (0, eval)(src);
  return mock;
}

// ---- assertion plumbing -----------------------------------------------------
function newRunner(label) {
  const R = { pass: 0, fail: 0, rows: [] };
  R.ok = (name, cond, detail) => {
    const c = !!cond;
    c ? R.pass++ : R.fail++;
    R.rows.push({ name, pass: c, detail: detail === undefined ? '' : String(detail) });
    console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
    return c;
  };
  R.done = () => {
    console.log('\n[' + label + '] pass=' + R.pass + ' fail=' + R.fail);
    if (R.fail) { console.log('FAILING:'); R.rows.filter(r => !r.pass)
      .forEach(r => console.log('   * ' + r.name + (r.detail ? ' :: ' + r.detail : ''))); }
  };
  return R;
}
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

// ---- drive helpers ----------------------------------------------------------
const listFolders = f => { const o = [], it = f.getFolders(); while (it.hasNext()) o.push(it.next()); return o; };
const listFiles   = f => { const o = [], it = f.getFiles();   while (it.hasNext()) o.push(it.next()); return o; };
function tree(f, d) {
  d = d || 0; const pad = '  '.repeat(d); let s = pad + '[' + f.getName() + ']\n';
  listFiles(f).forEach(x => { s += pad + '  - ' + x.getName() + '\n'; });
  listFolders(f).forEach(x => { s += tree(x, d + 1); });
  return s;
}

// ---- source-spreadsheet fixtures -------------------------------------------
/* Builds a plain spreadsheet for every CFG.SOURCES entry so that
   DriveApp.getFileById(id).makeCopy() resolves through the mock's sheet path. */
function makeSources(Spread, rowsPerSheet) {
  const n = rowsPerSheet === undefined ? 5 : rowsPerSheet;
  CFG.SOURCES.forEach(s => {
    const ss = new Spread('s', s.id);
    const sh = ss.insertSheet('Tab1');
    sh._d.push(['H1', 'H2', 'H3']);
    for (let i = 0; i < n; i++) sh._d.push(['a' + i, 'b' + i, 'c' + i]);
    sh._max = 1000;
    global.__SS[s.id] = ss;
  });
}

/* Byte-exact snapshot of every registered spreadsheet: id, name, tab names,
   row counts and full cell contents. Used to prove sources are untouched. */
function snapshotSheets() {
  const out = {};
  Object.keys(global.__SS).sort().forEach(id => {
    const ss = global.__SS[id];
    out[id] = {
      id: ss.getId(),
      name: ss._n,
      tabs: ss.getSheets().map(sh => ({
        name: sh.getName(), lastRow: sh.getLastRow(), lastCol: sh.getLastColumn(),
        data: JSON.stringify(sh._d)
      }))
    };
  });
  return JSON.stringify(out);
}

/* Hard tripwire: any mutating call on a spreadsheet whose id is in `ids`
   is recorded (and optionally thrown). */
function armWriteTripwire(mock, ids) {
  const hits = [];
  const guard = new Set(ids);
  const ssOf = sh => {
    for (const id of Object.keys(global.__SS)) {
      if (global.__SS[id]._s && global.__SS[id]._s.indexOf(sh) !== -1) return id;
    }
    return null;
  };
  // Range writes — reach the prototype through a throwaway sheet
  const RangeProto = Object.getPrototypeOf(new mock.Sheet('__probe').getRange(1, 1, 1, 1));
  ['setValues', 'setValue', 'clearContent'].forEach(m => {
    const o = RangeProto[m];
    RangeProto[m] = function (...a) {
      const id = ssOf(this.sh);
      if (id && guard.has(id)) hits.push({ op: 'Range.' + m, sheet: this.sh.getName(), ss: id });
      return o.apply(this, a);
    };
  });
  ['appendRow', 'insertRowsAfter', 'insertColumnsAfter'].forEach(m => {
    const o = mock.Sheet.prototype[m];
    mock.Sheet.prototype[m] = function (...a) {
      const id = ssOf(this);
      if (id && guard.has(id)) hits.push({ op: 'Sheet.' + m, sheet: this.getName(), ss: id });
      return o.apply(this, a);
    };
  });
  ['insertSheet', 'deleteSheet', 'setSpreadsheetTimeZone'].forEach(m => {
    const o = mock.Spread.prototype[m];
    mock.Spread.prototype[m] = function (...a) {
      if (guard.has(this._id)) hits.push({ op: 'Spread.' + m, ss: this._id });
      return o.apply(this, a);
    };
  });
  return hits;
}

/* Telegram/Gemini stub that records outbound telegram texts. */
function armStub() {
  const tg = [];
  global.__STUB = function (url, body) {
    if (url.indexOf('api.telegram.org') !== -1) {
      tg.push((body && body.text) || '');
      return { code: 200, json: { ok: true, result: { message_id: tg.length } } };
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: '{}' }] } }] } };
  };
  return tg;
}

/* Replace ScriptApp with a registry that actually stores triggers. */
function armTriggers() {
  let seq = 1;
  const reg = [];
  global.ScriptApp = {
    getProjectTriggers: () => reg.slice(),
    deleteTrigger(t) { const i = reg.indexOf(t); if (i >= 0) reg.splice(i, 1); },
    newTrigger(fn) {
      const t = { _fn: fn, _id: 'T' + (seq++), _kind: '', _after: 0,
        getHandlerFunction() { return this._fn; }, getUniqueId() { return this._id; },
        timeBased() { this._kind = 'time'; return this; },
        forSpreadsheet(id) { this._kind = 'ss:' + id; return this; },
        everyHours(h) { this._every = 'h' + h; return this; },
        atHour(h) { this._hour = h; return this; },
        nearMinute(m) { this._min = m; return this; },
        everyDays(d) { this._every = 'd' + d; return this; },
        inTimezone(z) { this._tz = z; return this; },
        onOpen() { this._kind = 'onOpen'; return this; },
        after(ms) { this._after = ms; return this; },
        create() { reg.push(this); return this; } };
      return t;
    }
  };
  return reg;
}

/* Controllable clock: engine calls `new Date()` / `new Date().getTime()`.
   advance(ms) moves the virtual now forward. */
function armClock(startMs) {
  const Real = global.Date;
  let offset = 0;
  let base = startMs === undefined ? Real.now() : startMs;
  function FakeDate(...a) {
    if (!(this instanceof FakeDate)) return new Real(base + offset).toString();
    if (a.length === 0) return new Real(base + offset);
    return new Real(...a);
  }
  FakeDate.prototype = Real.prototype;
  FakeDate.now = () => base + offset;
  FakeDate.parse = Real.parse; FakeDate.UTC = Real.UTC;
  global.Date = FakeDate;
  return {
    advance: ms => { offset += ms; },
    set: ms => { base = ms; offset = 0; },
    now: () => base + offset,
    restore: () => { global.Date = Real; }
  };
}

module.exports = { boot, newRunner, quiet, listFolders, listFiles, tree,
                   makeSources, snapshotSheets, armWriteTripwire, armStub,
                   armTriggers, armClock, FILES, DIR };
