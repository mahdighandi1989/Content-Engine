/* ══ آزمونِ ۱۷.۷ — «از همه جا» بلندتر از یک فایل ⇒ فشرده‌سازی در کد (۹۴–۹۶: ۱۷:۳۳، ۱۴:۰۵، ۱۴:۵۹) ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const fs = require('fs');
const keepLog = global.logLine_; global.logLine_ = () => {};
const long = (n) => 'جمله‌ای کوتاه و روشن. '.repeat(n);
const ep = { title: 'ت', hook: 'سلام، از همه جا از همه رنگ.', outro: 'خدانگهدار.', summary: 'خ',
  sections: [ { heading: 'یک', narration: long(200), tone: 'شاد', sourceIds: ['a'], media: { x: 1 } },
              { heading: 'دو', narration: long(200), tone: 'آرام', sourceIds: ['b'] } ] };
const cap = 3000;
const short = (p) => ({ hook: 'سلام کوتاه', outro: 'بدرود', sections: [ { heading: 'یک', narration: long(40) }, { heading: 'دو', narration: long(40) } ] });
let r = varietyCondense_(ep, 'پیوند', cap, 99, short);
ok('۱.۱ بلندتر از سقف ⇒ فشرده می‌شود و زیرِ سقف می‌رود', r.tried && r.to < r.from && r.to <= cap);
ok('۱.۲ شناسه، لحن و رسانهٔ هر بخش از متنِ اصلی می‌ماند', r.ep.sections[0].sourceIds[0] === 'a' && r.ep.sections[0].tone === 'شاد' && r.ep.sections[0].media.x === 1 && r.ep.sections[1].sourceIds[0] === 'b');
ok('۱.۳ متنِ اصلی دست نخورد (رونوشت)', ep.sections[0].narration.length > 1000);
r = varietyCondense_(ep, 'پیوند', cap, 99, () => ({ sections: [ { heading: 'یک', narration: 'کوتاه' } ] }));
ok('۲.۱ بخشی افتاد ⇒ متنِ اصلی می‌ماند', r.ep === ep && r.tried);
r = varietyCondense_(ep, 'پیوند', cap, 99, () => ({ sections: [ { heading: 'یک', narration: 'کوتاه' }, { heading: 'دو', narration: ' ' } ] }));
ok('۲.۲ روایتِ خالی ⇒ متنِ اصلی می‌ماند', r.ep === ep);
r = varietyCondense_(ep, 'پیوند', cap, 99, () => { throw new Error('x'); });
ok('۲.۳ مدل در دسترس نیست ⇒ متنِ اصلی، بی خطا', r.ep === ep);
let called = 0;
r = varietyCondense_({ hook: 'h', outro: 'o', sections: [ { narration: 'کوتاه' } ] }, '', cap, 99, () => { called++; return null; });
ok('۲.۴ زیرِ سقف ⇒ هیچ فراخوانی', !r.tried && called === 0);
const keepC = CFG.VG_CONDENSE; CFG.VG_CONDENSE = false;
r = varietyCondense_(ep, 'پیوند', cap, 99, short);
ok('۲.۵ کلیدِ خاموش ⇒ دست نمی‌زند', !r.tried && r.ep === ep);
CFG.VG_CONDENSE = keepC;
const src = fs.readFileSync('src/03_Producer.gs', 'utf8');
const body = src.slice(src.indexOf('function produceEpisode('), src.indexOf('function produceEpisode(') + 40000);
const iC = body.indexOf('varietyCondense_(ep, connection, oneFileMaxChars_(), epNum)'), iF = body.indexOf('fid = fidelityCheck_(');
ok('۳.۱ سیم: produceEpisode فشرده می‌کند، پیش از پاسِ وفاداری', iC > 0 && iF > iC);
ok('۳.۲ سیم: پشتِ مهلتِ زمان (سقفِ شش دقیقه)', /tStart < \(Number\(CFG\.VG_CONDENSE_MAX_SPENT_MS\)/.test(body));
global.logLine_ = keepLog;
summary('۱۷.۷');
