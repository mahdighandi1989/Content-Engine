/* probe_r6_lib.js — shared boot + model-mode harness for the R6 review probes.
   Reuses the run_real_test.js idiom: load mock.js, eval the 19 .gs files. */
const fs = require('fs');

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
    return R.fail;
  };
  return R;
}
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };

/* ---------------------------------------------------------------------------
   MODEL MODES — the four the brief asks for.
     'all'      : rejects every responseSchema (400 invalid argument)
     'thinking' : rejects only thinkingConfig
     'both'     : rejects thinkingConfig AND responseSchema
     'none'     : accepts everything
   The stub records every outbound generateContent payload so a probe can
   assert exactly which config keys survived.
--------------------------------------------------------------------------- */
function armModel(mode, replyFn) {
  const calls = [];
  global.__STUB = function (url, body) {
    if (url.indexOf('api.telegram.org') !== -1) return { code: 200, json: { ok: true, result: {} } };
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.1-flash-tts-preview', supportedGenerationMethods: ['generateContent'] }] } };
    if (url.indexOf('tts') !== -1) return { code: 200, json: { candidates: [{ content: { parts: [{
      inlineData: { data: Buffer.alloc(20000).toString('base64') } }] } }] } };

    const gc = (body && body.generationConfig) || {};
    const hasSchema = !!gc.responseSchema;
    const hasThink = !!gc.thinkingConfig;
    const text = (body.contents && body.contents[0].parts[0].text) || '';
    calls.push({ hasSchema, hasThink, keys: Object.keys(gc).sort().join(','), text });

    if ((mode === 'all' || mode === 'both') && hasSchema) {
      return { code: 400, text: JSON.stringify({ error: {
        message: 'Invalid JSON payload received. Unknown name "responseSchema": invalid argument',
        code: 'invalid_request' } }) };
    }
    if ((mode === 'thinking' || mode === 'both') && hasThink) {
      return { code: 400, text: JSON.stringify({ error: {
        message: 'Unknown name "thinkingConfig": Cannot find field.', code: 'invalid_request' } }) };
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: replyFn(text, body) }] } }] } };
  };
  return calls;
}

/* Replace ScriptApp with a registry that actually stores triggers. */
function armTriggers(preset) {
  let seq = 1;
  const reg = [];
  const made = [];
  const mk = fn => {
    const t = { _fn: fn, _id: 'T' + (seq++), _kind: '', _hour: null, _every: null, _tz: '',
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
      create() { reg.push(this); made.push(fn); return this; } };
    return t;
  };
  (preset || []).forEach(fn => { const t = mk(fn); reg.push(t); });
  made.length = 0;
  global.ScriptApp = {
    getProjectTriggers: () => reg.slice(),
    deleteTrigger(t) { const i = reg.indexOf(t); if (i >= 0) reg.splice(i, 1); },
    newTrigger: mk,
    __made: made, __reg: reg, __quota: false
  };
  return { reg, made, list: () => reg.map(t => t.getHandlerFunction()) };
}

module.exports = { boot, newRunner, quiet, armModel, armTriggers, FILES, DIR };
