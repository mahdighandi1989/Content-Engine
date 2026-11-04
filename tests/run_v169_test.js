/* ══ آزمونِ ۱۶.۹ — وارسیِ ۱۰ دیگر _STATUS را درونِ شش دقیقهٔ خودش نمی‌سازد ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const w = wantedTriggers_();
const iB = w.findIndex(x => x.fn === 'statusBeforeHealth'), iH = w.findIndex(x => x.fn === 'healthCheck');
ok('۱.۱ تریگرِ روزانهٔ ۰۹:۳۰ پیش از وارسیِ ۱۰', iB >= 0 && w[iB].hour === 9 && w[iB].minute === 30 && w[iH].hour === 10);
const setup = fs.readFileSync('src/05_Setup.gs', 'utf8');
ok('۱.۲ ساختِ دوبارهٔ تریگرِ گم‌شده دقیقه را هم می‌گذارد', /nearMinute\(Number\(want\[w\]\.minute\) \|\| 0\)/.test(setup));

const store = {};
const keep = { props_: global.props_, DriveApp: global.DriveApp, lastEpisode_: global.lastEpisode_, recentLog_: global.recentLog_ };
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } });
const file = { getBlob: () => ({ getDataAsString: () => JSON.stringify({ bank: { eligibleTotal: 9 }, sync: { feeds: [] }, recentLog: [] }) }) };
global.DriveApp = { getFolderById: () => ({ getFilesByName: () => { let n = 0; return { hasNext: () => n === 0, next: () => { n++; return file; } }; } }) };
global.lastEpisode_ = () => ({ ep: 93 }); global.recentLog_ = () => [{ msg: 'تازه' }];
const dubaiNow = new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16).replace('T', ' ');   // ساعتِ واقعیِ دبی، همان قالبِ nowStr_
store[PK.STATUS_COST] = JSON.stringify({ at: dubaiNow });
const st = healthStatusFresh_({});
ok('۲.۱ فایلِ تازه خوانده می‌شود و آخرین قسمت و سیاهه تازه می‌شوند', st && st.bank.eligibleTotal === 9 && st.lastEpisode.ep === 93 && st.recentLog[0].msg === 'تازه' && !!st.fromFile);
store[PK.STATUS_COST] = JSON.stringify({ at: '2026-01-01 09:30' });
ok('۲.۲ فایلِ کهنه ⇒ null (همان ساختِ قبلی)', healthStatusFresh_({}) === null);
delete store[PK.STATUS_COST];
ok('۲.۳ بی شاهدِ نوشتن ⇒ null', healthStatusFresh_({}) === null);
Object.keys(keep).forEach(k => { global[k] = keep[k]; });

const hs = fs.readFileSync('src/08_Health.gs', 'utf8');
const body = hs.slice(hs.indexOf('function healthCheck() {'));
ok('۳.۱ وارسی اول از فایل می‌خوانَد، و فقط اگر نشد می‌سازد', body.indexOf('healthStatusFresh_(hub)') !== -1 && body.indexOf('healthStatusFresh_(hub)') < body.indexOf("writeStatus_(hub, 'وارسی سلامت')"));
summary('۱۶.۹');
