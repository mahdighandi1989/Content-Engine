/* ══ آزمونِ ۱۶.۳ — جایگزینی‌ها اولِ صفِ انتشار ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const keep = global.ytReplState_;
global.ytReplState_ = () => ({ 'variety:86': { phase: 'build' }, 'variety:88': { phase: 'swap' }, 'variety:82': { phase: 'done' } });
const out = ytReplFirst_([{ key: 'special:91' }, { key: 'variety:82' }, { key: 'variety:86' }, { key: 'variety:88' }]).map(x => x.key);
ok('۱.۱ ۸۶ و ۸۸ (در جریان) اول، بقیه به همان ترتیب', out.join() === 'variety:86,variety:88,special:91,variety:82', out.join());
global.ytReplState_ = () => { throw new Error('x'); };
ok('۱.۲ خطای خواندن ⇒ همان ترتیب', ytReplFirst_([{ key: 'a' }, { key: 'b' }]).map(x => x.key).join() === 'a,b');
ok('۲.۱ سیم: ytRunDue_ صف را با ytReplFirst_ می‌چیند', /var list = ytReplFirst_\(ytDueOrder_\(ytDueList_\(\)\)\);/.test(fs.readFileSync('src/27_YouTube.gs', 'utf8')));
global.ytReplState_ = keep;
summary('۱۶.۳');
