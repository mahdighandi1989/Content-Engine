/* ══ آزمونِ ۱۹.۲ — «کور»ِ خودآزمونِ حقِ نشر حدِ ثابتِ Data API است، نه ایرادِ روزانه (chronic-d71aef3f) ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const fs = require('fs');
const h = fs.readFileSync('src/08_Health.gs', 'utf8');
ok('۱.۱ فقط hit به «ایرادها» می‌رود؛ blind تنها به یادداشت', /\(clW\.hit\.length \? problems : notes\)\.push\(clW\.line\)/.test(h) && !/clW\.blind\.length \? problems/.test(h));
const keepK = CFG.YT_CLAIM_KNOWN;
CFG.YT_CLAIM_KNOWN = ['V85'];
PropertiesService.getScriptProperties().setProperty(PK.YT_CLAIM_WATCH, JSON.stringify({ at: '2026-11-24 04:58', checked: 100, hit: [], seenIds: ['V85', 'V90'], v: {} }));
const lb = ytClaimWatchLine_();
ok('۱.۲ خطِ کور هنوز ساخته می‌شود و حدِ Data API را می‌گوید (دیده می‌مانَد)', lb.blind.join() === 'V85' && lb.hit.length === 0 && /نشان نمی‌دهد/.test(lb.line), lb.line);
const problems = [], notes = [];
(lb.hit.length ? problems : notes).push(lb.line);
ok('۱.۳ همان شکلِ ۰۸: خطِ کورِ بی‌مسدودی در یادداشت‌ها، نه در ایرادها', problems.length === 0 && notes.length === 1);
CFG.YT_CLAIM_KNOWN = keepK;
PropertiesService.getScriptProperties().deleteProperty(PK.YT_CLAIM_WATCH);
summary('۱۹.۲');
