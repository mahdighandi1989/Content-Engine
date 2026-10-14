/* «از همه جا»: سیرِ معنایی پیش از چیدن (۸.۹۹).
 *
 * شکایتِ صاحبِ برنامه پس از یک ماه گوش‌دادن: چند کلیپِ طنز و وسطشان اسکرین‌شاتِ زنی که در جنگ کشته شد؛
 * طنز با «تفسیرِ آبکیِ معنوی و اجتماعی». دو در در کد آیتمِ بیرون از نخ می‌آورد و این سنجه‌ها همان دو را
 * می‌بندند — با اجرای خودِ توابع، نه با خواندنِ متن:
 *   ۱) سردبیر: خوانش و ژانر برای هر عضو، بازاستفادهٔ کامل تا سقف، اعضای سیر.
 *   ۲) حداقلِ هر نوع فقط از اعضای سیر پر می‌شود — نه از کلِ دسته.
 *   ۳) داورِ جدا «خیر»ها را بیرون می‌گذارد، و هرگز قسمت را زیرِ سه عضو نمی‌بَرد.
 *   ۴) نویسنده خوانش را می‌بیند و قاعدهٔ طنز را دارد؛ پند و پر کردن خواسته نمی‌شود.
 *   ۵) سیم‌کشی: گزینشِ «فقط امتیاز» دیگر پس از کم آمدنِ سردبیر نمی‌آید.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 220) : ''));
};
const item = (id, kind, extra) => Object.assign({ id: id, kind: kind, cat: 'طنز و سرگرمی', topic: 'موضوعِ ' + id,
  msg: 'پیامِ ' + id, summary: '', body: '', vibe: 'طنز', score: 80 }, extra || {});
const realGem = global.geminiText_;

console.log('=== ۱) سردبیر: خوانش، ژانر، بازاستفاده، اعضای سیر ===');
const cands = [item('A', 'ویدیو'), item('B', 'ویدیو'), item('C', 'ویدیو'), item('D', 'عکس'),
               item('X', 'عکس', { topic: 'خبرِ کشته‌شدنِ یک زن در جنگ', vibe: 'تراژیک' })];
const refPool = [item('R1', 'ویدیو', { used: 40 }), item('R2', 'عکس', { used: 41 }), item('R3', 'ویدیو', { used: 42 })];
let lastPrompt = '';
global.geminiText_ = (p) => {
  lastPrompt = p;
  return { theme: 'طنزِ سانسورِ اینترنت', connection: 'هر چهار درباره‌ی فیلترینگ‌اند', route: 'اول A چون …',
    threads: [{ thread: 'سانسور', memberIds: ['A', 'B', 'C', 'D'] }, { thread: 'جنگ', memberIds: ['X'] }],
    chosen: [{ id: 'A', genre: 'طنز', reading: 'شوخی: موتورِ جست‌وجو «کسینوس» را پیدا نمی‌کند' },
             { id: 'B', genre: 'هجو' }, { id: 'C', genre: 'ژانرِساختگی' },
             { id: 'R1', role: 'اوج' }, { id: 'R2' }, { id: 'R3' }, { id: 'ZZZ' }],
    referenceIds: [], rejected: ['X'] };
};
const cur = curateItems_('طنز و سرگرمی', cands, refPool, []);
ok('۱.۱ خوانش و ژانرِ مجاز می‌رسد؛ ژانرِ ساختگی خالی می‌شود',
   cur.chosen[0].reading.indexOf('کسینوس') !== -1 && cur.chosen[0].genre === 'طنز' && cur.chosen[2].genre === '',
   JSON.stringify(cur.chosen.map(x => [x.id, x.genre])));
ok('۱.۲ بازاستفادهٔ کامل تا REUSE_FULL_MAX (۲ از ۳)، با نشان؛ شناسهٔ ساختگی دور',
   cur.reused.length === CFG.REUSE_FULL_MAX && cur.chosen.filter(x => x.reused).length === 2 &&
   !cur.chosen.some(x => x.id === 'ZZZ' || x.id === 'R3'), JSON.stringify(cur.chosen.map(x => x.id)));
ok('۱.۳ اعضای سیر = سیری که بیشترین هم‌پوشانی با chosen دارد (نه سیرِ «جنگ»)',
   JSON.stringify(cur.members.map(x => x.id)) === '["A","B","C","D"]');
ok('۱.۴ سردبیر حال‌وهوا و دستهٔ هر نامزد را می‌بیند، و «اول بفهم» و حداقلِ تازه در دستورش است',
   /حال‌وهوا: تراژیک/.test(lastPrompt) && /شوخی‌اش کجاست/.test(lastPrompt) &&
   lastPrompt.indexOf('دست‌کم ' + CFG.CURATE_MIN + ' و') !== -1 && /پیش‌تر در قسمتِ 40 آمده/.test(lastPrompt));

console.log('=== ۲) حداقلِ هر نوع فقط از اعضای سیر ===');
{
  /* قسمتِ ۷۲: سه کلیپِ طنز، و حداقلِ «سه عکس» از کلِ دسته پر شد — عکسِ خبرِ جنگ هم با آن آمد. */
  const chosen = [cands[0], cands[1], cands[2]];
  const memberPool = chosen.concat([cands[3]]);
  const fromThread = enforceMix_(chosen, memberPool, 12);
  const fromAll = enforceMix_(chosen, cands, 12);
  ok('۲.۱ از اعضای سیر: عکسِ همان سیر (D) می‌آید و عکسِ بی‌ربط (X) نه',
     fromThread.some(x => x.id === 'D') && !fromThread.some(x => x.id === 'X'), fromThread.map(x => x.id).join(','));
  ok('۲.۲ (شاهدِ خودِ سنجه) از کلِ دسته: همان X می‌آمد', fromAll.some(x => x.id === 'X'));
  const y = fs.readFileSync('src/03_Producer.gs', 'utf8');
  ok('۲.۳ تولید enforceMix_ را با اعضای سیر صدا می‌زند، نه با کلِ استخر',
     /enforceMix_\(cur\.chosen, memberPool, CFG\.ITEMS_PER_EPISODE\)/.test(y) && !/enforceMix_\(cur\.chosen, pool,/.test(y));
}

console.log('=== ۳) داورِ جدا ===');
{
  const four = [cands[0], cands[1], cands[2], cands[4]];
  global.geminiText_ = () => ({ verdicts: [{ id: 'A', belongs: 'بله' }, { id: 'B', belongs: 'بله' },
    { id: 'C', belongs: 'بله' }, { id: 'X', belongs: 'خیر', why: 'خبرِ مرگ وسطِ طنز' }] });
  const j = curateJudge_('طنزِ سانسور', 'فیلترینگ', '', four);
  ok('۳.۱ «خیر» بیرون می‌رود، با علت', j.ran && j.keep.length === 3 && j.dropped[0].item.id === 'X' &&
     /مرگ/.test(j.dropped[0].why), JSON.stringify(j.keep.map(x => x.id)));
  global.geminiText_ = () => ({ verdicts: four.map(x => ({ id: x.id, belongs: x.id === 'A' ? 'بله' : 'خیر' })) });
  const j2 = curateJudge_('t', 'c', '', four);
  ok('۳.۲ اگر کمتر از سه بماند، همه می‌مانند و علت گفته می‌شود', j2.keep.length === 4 && /کمتر از سه/.test(j2.why));
  global.geminiText_ = () => { throw new Error('quota'); };
  const j3 = curateJudge_('t', 'c', '', four);
  ok('۳.۳ نشدنِ داوری ⇒ بی‌داوری ادامه، نه افتادنِ قسمت', j3.keep.length === 4 && !j3.ran);
}

console.log('=== ۴) نویسنده ===');
{
  const when = todayWords_();
  const it = [Object.assign(item('A', 'ویدیو'), { genre: 'طنز', reading: 'شوخی: «کسینوس» فیلتر است' }),
              Object.assign(item('R1', 'ویدیو'), { reused: true, used: 40 })];
  const p = buildPrompt_('طنز و سرگرمی', it, 'طنزِ سانسور', 'فیلترینگ', [], when, [], 'اول A، بعد R1');
  ok('۴.۱ ژانر و خوانشِ سردبیر و ترتیبِ رفتن به نویسنده می‌رسد',
     /ژانر: طنز/.test(p) && /خوانشِ سردبیر: شوخی/.test(p) && /ترتیبِ رفتن به پیشنهادِ سردبیر: اول A/.test(p));
  ok('۴.۲ بازاستفاده گفته می‌شود', /پیش‌تر در قسمتِ 40 آمده؛ این‌جا عضوِ کاملِ سیر است/.test(p));
  ok('۴.۳ قاعدهٔ طنز: تفسیرِ معنوی/اجتماعی روی شوخی ممنوع', /۸-ر\) \*\*طنز را طنز بخوان/.test(p) && /معنوی، اخلاقی/.test(p));
  ok('۴.۴ نه «نکتهٔ ماندگار» و نه «دست‌کم N کلمه» — پر کردن با تفسیر خواسته نمی‌شود',
     !/نکتهٔ ماندگار/.test(p) && !/دست‌کم \d+ و حدود/.test(p) && !/هر بخش دست‌کم/.test(p) && /هرگز\*\* با تفسیر/.test(p));
}

console.log('=== ۵) سیم‌کشی و نامزدِ دسته‌های دیگر ===');
{
  const y = fs.readFileSync('src/03_Producer.gs', 'utf8');
  const prod = y.slice(y.indexOf('function produceEpisode('), y.indexOf('function produceEpisodeContinue('));
  ok('۵.۱ کم آمدنِ سردبیر دیگر به «انتخاب بر پایهٔ امتیاز» نمی‌افتد؛ تلاشِ دوم با نامزدهای دیگر',
     !/cur\.chosen\.length >= 6/.test(prod) && /attempt < 2/.test(prod) && /crossCandidates_\(hub, picked\)/.test(prod));
  ok('۵.۲ داور در مسیرِ تولید است و گزینشِ بی‌نخ بلند گفته می‌شود',
     /curateJudge_\(cur\.theme, cur\.connection, cur\.route, mixed\)/.test(prod) && /⚠ گزینش بی‌نخ/.test(prod));
  ok('۵.۳ بازاستفاده در ستونِ ارجاع ثبت می‌شود', /bumpRefs_\(hub, refs\.concat\(reusedIn\)\)/.test(prod));
  const keep = { ts: global.tabStats_, fr: global.fetchRows_ };
  const read = [];
  global.tabStats_ = (h, name) => { read.push(name); return { sheet: { name }, rows: [1, 2, 3, 4, 5].map(i => ({ row: i + 1, score: 90 - i })) }; };
  global.fetchRows_ = (sh, title, rows) => rows.map(r => ({ id: title + r, cat: title, kind: 'عکس', row: r }));
  const got = crossCandidates_({}, { others: ['اجتماعی', 'خبری', 'علمی', 'ورزشی'] });
  Object.assign(global, { tabStats_: keep.ts, fetchRows_: keep.fr });
  ok('۵.۴ فقط CROSS_TABS دستهٔ بعدی خوانده می‌شود، و هر آیتم دستهٔ خودش را دارد (برای markUsed_)',
     read.length === CFG.CROSS_TABS && got.every(x => x.cat === 'اجتماعی' || x.cat === 'خبری') && got.length === 10,
     read.join(','));
}
global.geminiText_ = realGem;

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ سیرِ «از همه جا» گذشت.');
