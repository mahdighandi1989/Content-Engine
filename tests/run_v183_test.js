/* ══ آزمونِ ۱۸.۳ — «از همه جا» با رسانهٔ کم: شکستِ نهاییِ نقشه ⇒ نقاشی، نه حلقهٔ ویدئوی ساده (variety:103) ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const fs = require('fs');
const keepLog = global.logLine_; global.logLine_ = () => {};
const keep = {}; const stub = (n, f) => { keep[n] = global[n]; global[n] = f; };
stub('vmOn_', () => true); stub('vmNote_', () => {}); stub('vmWrite_', () => {});
const ctx = { show: 'variety', epRaw: '103' };

stub('vmRead_', () => ({ phase: 'plan', failed: 3, why: 'فقط 2 صحنه از 2 رسانه درآمد (3 بار)', at: '2026-11-15 18:58' }));
let r = vmBuild_({}, {}, {}, ctx);
ok('۱.۱ نقشهٔ رسانه سه بار نشد ⇒ fallback و final', r.fallback === true && r.final === true && !r.none);
stub('vmRead_', () => ({ phase: 'plan', failed: 1, why: 'x', at: nowStr_() }));
r = vmBuild_({}, {}, {}, ctx);
ok('۱.۲ شکستِ نخست، هنوز در انتظارِ تلاشِ بعد ⇒ نه fallback نه final', !r.fallback && !r.final);

/* ۲ — سیم در ytRunOne_: شکستِ نهاییِ رسانه همان راهِ «بی‌رسانه» را می‌رود (نقاشی) */
const src = fs.readFileSync('src/27_YouTube.gs', 'utf8');
const at = src.indexOf('vmr = vmBuild_(folder, meta, plan, ctx)');
const body = src.slice(at, at + 3000);
ok('۲.۱ «none» ⇒ نقاشی، مثلِ قبل', /vmr\.fallback && vmr\.none\) \{ ctx\.forceScene = true; sceneFb = ''; \}/.test(body));
ok('۲.۲ «final» ⇒ نقاشی (ctx.forceScene)', /vmr\.fallback && vmr\.final\) ctx\.forceScene = true;/.test(body));
ok('۲.۳ خطای گذرا (catch) final نمی‌گیرد — یک خطای شبکه نقاشیِ پولی راه نمی‌اندازد', !/catch \(eVm\) \{[^}]*final/.test(body));
const iF = body.indexOf('vmr.final) ctx.forceScene'), iS = body.indexOf('ctx.forceScene) && lvLvl');
ok('۲.۴ تصمیم پیش از شاخهٔ صحنه گرفته می‌شود', iF > 0 && iS > iF);

/* ۳ — شاخهٔ صحنه با forceScene برای «از همه جا» باز است، حتی وقتی LV_SHOWS فقط درس‌نامه را دارد */
const sh = CFG.LV_SHOWS; CFG.LV_SHOWS = ['special'];
ok('۳.۱ «از همه جا» در LV_SHOWS نیست (پس بی forceScene به ویدئوی ساده می‌افتاد)', ytVisOn_('variety') === false);
CFG.LV_SHOWS = sh;

for (const k of Object.keys(keep)) global[k] = keep[k];
global.logLine_ = keepLog;
summary('۱۸.۳');
