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
ok('۱.۵ سیرِ چتری ممنوع (قسمتِ ۷۲: «سیاست، امنیت، مناسک، مرگ و تابوها») و آزمونِ «نیمی بیرون»',
   /سیرِ چتری ممنوع/.test(lastPrompt) && /دست‌کم نیمی از نامزدها را \*\*بیرون\*\*/.test(lastPrompt));

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

console.log('=== ۶) دروازهٔ زمین‌گیری پیش از صدا (۹.۱۱، قسمتِ ۷۳) ===');
{
  const items = [item('V1', 'ویدیو', { summary: 'دعوای زن و شوهرِ خبرنگار با آدابِ پخشِ زنده', body: 'بدبخت تو هرچی داری صدقه‌سرِ من و خانواده‌مه' })];
  const mkEp = () => ({ hook: 'از همه جا از همه رنگ. سلام.', sections: [{ heading: 'دعوا', sourceIds: ['V1'], narration:
    'ماجرا از یک خانه شروع می‌شود. زن داد می‌زند: بدبخت تو هرچی داری صدقه‌سرِ من و خانواده‌مه. ' +
    'این حرکتِ بدنی و لمسِ مداومِ هندزفری دقیقاً همان تصویری است که باید دید. و در نهایت یک صندلی پرتاب می‌شود. ' +
    'قبلاً در یک کلیپ دیدیم که مدیرِ رستوران از پیکش می‌خواست کرنش کند.' }],
    outro: 'امروز دیدیم قالب‌های اداری چطور مضحک می‌شوند. شکافِ عمیق میانِ صورتِ رسمی و حقیقتِ درون آشکار است. تا فردا، خدا نگه‌دار.' });
  let seen = '';
  const judge = (p) => { seen = p; return { bad: [{ id: 's0.2', kind: 'تصویر', why: 'تصویرِ ندیده' },
                                                 { id: 'o0.1', kind: 'پند', why: 'تعمیم' },
                                                 { id: 'o0.2', kind: 'پند' }, { id: 's0.0', kind: 'نامعلوم' }] }; };
  const ep = mkEp();
  const g = groundEpisode_(ep, items, { judge });
  const nar = ep.sections[0].narration;
  ok('۶.۱ جملهٔ «تصویری که نویسنده ندیده» حذف شد و بازگوییِ گفت‌وگو ماند',
     g.judged && !/هندزفری/.test(nar) && /صدقه‌سرِ من/.test(nar) && /صندلی پرتاب/.test(nar), nar);
  ok('۶.۲ پندِ پایان حذف شد؛ خداحافظی (محافظت‌شده) ماند', !/شکافِ عمیق/.test(ep.outro) && /خدا نگه‌دار/.test(ep.outro), ep.outro);
  ok('۶.۳ «قبلاً در یک کلیپ دیدیم» بی مدل به «در یکی از قسمت‌های پیشینِ همین برنامه» تبدیل شد',
     g.pastRef === 1 && /در یکی از قسمت‌های پیشینِ همین برنامه دیدیم/.test(nar) && !/قبلاً در یک کلیپ/.test(nar), nar);
  ok('۶.۴ نوعِ ساختگیِ داور («نامعلوم») کاری نکرد و شمارش درست است', g.removed === 2 && g.kinds['تصویر'] === 1 && g.kinds['پند'] === 1,
     JSON.stringify(g.kinds));
  ok('۶.۵ داور متنِ کاملِ منبعِ همان بخش را می‌بیند، نه فقط برچسب', /صدقه‌سرِ من و خانواده‌مه/.test(seen) && /هیچ کلیپی را ندیده/.test(seen));
  const ep2 = mkEp();
  const allBad = () => ({ bad: [0, 1, 2, 3, 4].map(k => ({ id: 's0.' + k, kind: 'ادعا' })) });
  groundEpisode_(ep2, items, { judge: allBad });
  const left = groundSplit_(ep2.sections[0].narration).length;
  ok('۶.۶ هرگز بیش از ۴۰٪ِ جمله‌های یک بخش نمی‌رود و بخش خالی نمی‌شود', left >= 3, left + ' جمله ماند');
  const ep3 = mkEp(), before = JSON.stringify(ep3);
  const g3 = groundEpisode_(ep3, items, { judge: () => { throw new Error('quota'); } });
  ok('۶.۷ داور در دسترس نبود ⇒ متن دست نخورد (جز ارجاعِ قطعی) و علت گفته شد',
     !g3.judged && /quota/.test(g3.why) && /هندزفری/.test(ep3.sections[0].narration), g3.why);
  const pr = fs.readFileSync('src/03_Producer.gs', 'utf8');
  ok('۶.۸ سیم‌کشی: دروازه پیش از ساختِ پوشه و صدا، و نتیجه در _STATUS',
     pr.indexOf('var gr = groundEpisode_(ep, items.concat(refs), { mode: vMode });') > 0 &&
     pr.indexOf('var gr = groundEpisode_(ep, items.concat(refs), { mode: vMode });') < pr.indexOf("showFolder_(CFG.VARIETY_FOLDER)") &&
     /ground: \(function \(\) \{ try \{ return JSON\.parse\(props_\(\)\.getProperty\(PK\.GROUND_LAST\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
}

console.log('=== ۷) ژانر قالب را می‌سازد: متن، صدا، داور و موسیقی (۹.۱۴، «گوینده می‌زند تو ذوقِ آدم») ===');
{
  const G = (g) => ({ genre: g });
  ok('۷.۱ ژانرِ غالب از خوانشِ سردبیر: پنج طنز/هجو ⇒ comedy؛ دو طنز و دو جدی ⇒ mixed؛ دو ترسناک و یک عجیب ⇒ eerie',
     varietyMode_(['طنز', 'طنز', 'هجو', 'طنز', 'طنز'].map(G), 'اجتماعی و مردمی') === 'comedy' &&
     varietyMode_(['طنز', 'طنز', 'جدی', 'خبری'].map(G), 'طنز و سرگرمی') === 'mixed' &&
     varietyMode_(['ترسناک', 'ترسناک', 'عجیب'].map(G), 'متفرقه') === 'eerie');
  ok('۷.۲ بی ژانر، برچسبِ دستهٔ طنز ⇒ comedy؛ دستهٔ دیگر ⇒ mixed (هیچ قالبی حدس زده نمی‌شود)',
     varietyMode_([{}, {}], 'طنز و سرگرمی') === 'comedy' && varietyMode_([{}, {}], 'علمی و آموزشی') === 'mixed');
  const when = todayWords_();
  const funny = ['A', 'B', 'C', 'D', 'E'].map(id => Object.assign(item(id, 'ویدیو'), { genre: 'طنز', reading: 'شوخی' }));
  const pc = buildPrompt_('طنز و سرگرمی', funny, 'قالب‌های جدی در آیینهٔ شوخی', 'هر پنج کلیپ فرمِ رسمی را هجو می‌کنند', [], when, [], 'اول A');
  ok('۷.۳ قسمتِ طنز: قالبِ «بستهٔ طنز» بالای قاعده‌ها، با نمونه‌های واقعیِ ۷۳ که نباید تکرار شوند',
     /قالبِ این قسمت: بستهٔ طنز/.test(pc) && pc.indexOf('قالبِ این قسمت: بستهٔ طنز') < pc.indexOf('قواعد سخت‌گیرانه') &&
     /همین منطقِ عجیب در راهروهای شرکت‌ها/.test(pc) && /شکافِ عمیقِ میانِ صورتِ رسمی/.test(pc) && /خط‌به‌خط با صحنه‌آرایی/.test(pc));
  ok('۷.۴ … و ساختِ مقاله‌ای از آن برداشته شده: نه «روایت را حولِ همین نخ بساز»، نه بلوکِ پیوندِ معنایی، نه پیوندِ سردبیر، نه بخشِ جمع‌بندی',
     !/روایت را حولِ همین نخ بساز/.test(pc) && !/پیوندِ معنایی — این تفاوتِ/.test(pc) && !/پیوند از این‌جا می‌آید/.test(pc) &&
     /نخ فقط ترتیبِ چیدن است/.test(pc) && /هر آیتم یک بخش/.test(pc) && /بخشِ جمع‌بندی نه/.test(pc));
  const mixed = [Object.assign(item('A', 'ویدیو'), { genre: 'جدی' }), Object.assign(item('B', 'ویدیو'), { genre: 'خبری' })];
  const pm = buildPrompt_('سیاسی و خبری', mixed, 'نخ', 'پیوند', [], when, []);
  ok('۷.۵ قسمتِ ناهمگون همان ساختِ پیشین را دارد و هر بخش ژانرِ آیتمِ خودش را می‌گیرد',
     /پیوندِ معنایی — این تفاوتِ/.test(pm) && /روایت را حولِ همین نخ بساز/.test(pm) && /ژانرِ هر آیتم، قالبِ بخشِ همان آیتم است/.test(pm) &&
     /دقیقاً \d بخش/.test(pm));
  const wc = p => Number((p.match(/حدود (\d+) کلمه باشد/) || [])[1]);
  ok('۷.۶ هدفِ طولِ طنز کوتاه‌تر است (شوخیِ پرشده، شوخیِ کشته‌شده)', wc(pc) < wc(pm) && wc(pc) > 0, wc(pc) + ' در برابرِ ' + wc(pm));
  /* صدا: همان بخشِ واقعیِ ۷۳ — «نشستِ خبری … بحرانِ کم‌آبی … خانواده» با لحنِ «رسمی و خبری» از نویسنده. */
  const ep = { mode: 'comedy', hook: 'سلام.', outro: 'تا فردا.', sections: [{ heading: 'نشست خبری حل بحران با دست خالی', tone: 'رسمی و خبری، با کمی طعنه',
    narration: 'سؤال دربارهٔ بحران کم‌آبی است. سخنگو می‌گوید همه مردم باید به کمک ما بیان. خبرنگار از خانواده‌اش می‌پرسد.' },
    { heading: 'نقش‌ها', tone: 'سرخوش و بازیگوش', narration: 'زیرآب‌زن به مدیر می‌گوید.' }] };
  const sg = episodeSegments_(ep, 'طنز و سرگرمی');
  const b0 = sg.find(x => x.secIndex === 0), b1 = sg.find(x => x.secIndex === 1), out = sg.find(x => x.kind === 'outro');
  ok('۷.۷ صدای بخشِ طنز از ژانر می‌آید نه از واژه‌های «بحران/خبر/خانواده»: لحنِ کمدی، بی رجیسترِ هشدار و خبری',
     /سرخوش و بازیگوش/.test(b0.style) && /لبخندِ شنیدنی/.test(b0.style) && !/لحن خبریِ بی‌طرف/.test(b0.style) &&
     !/لحن قاطع و جدی/.test(b0.style) && b0.tone !== 'رسمی و خبری، با کمی طعنه', b0.style);
  ok('۷.۸ لحنِ نویسنده که با ژانر می‌خوانَد می‌ماند', b1.tone === 'سرخوش و بازیگوش');
  ok('۷.۹ پایانِ قسمتِ طنز «جمع‌بندی‌کننده و ماندگار» خوانده نمی‌شود', !/جمع‌بندی‌کننده و ماندگار/.test(out.style) && /خندان/.test(out.style), out.style);
  const ep0 = JSON.parse(JSON.stringify(ep)); delete ep0.mode;
  const sg0 = episodeSegments_(ep0, 'طنز و سرگرمی');
  ok('۷.۱۰ قسمتِ بی قالب (پیش از ۹.۱۴) همان رفتارِ پیشین را دارد', /جمع‌بندی‌کننده و ماندگار/.test(sg0.find(x => x.kind === 'outro').style) &&
     sg0.find(x => x.secIndex === 0).tone === 'رسمی و خبری، با کمی طعنه');
  /* داور: در قسمتِ طنز «تفسیر» هم خطاست. */
  const items = [item('V1', 'ویدیو', { body: 'سخنگو: کلاغ نیوز؟ اجازه بدید. بلبل نیوز بفرمایید.' })];
  const epG = () => ({ hook: 'سلام.', sections: [{ heading: 'نشست', sourceIds: ['V1'], narration:
    'سخنگو حرفِ خبرنگار را قطع می‌کند: کلاغ نیوز؟ اجازه بدید. بعد می‌گوید: بلبل نیوز بفرمایید. همین منطقِ عجیب در راهروهای شرکت‌ها هم تکرار می‌شود. و نشست تمام می‌شود.' }], outro: 'تا فردا، خدا نگه‌دار.' });
  let seenP = '';
  const judge = p => { seenP = p; return { bad: [{ id: 's0.3', kind: 'تفسیر', why: 'شوخی را مفهوم کرد' }] }; };
  const e1 = epG(); const g1 = groundEpisode_(e1, items, { judge, mode: 'comedy' });
  ok('۷.۱۱ داورِ قسمتِ طنز «تفسیر» را می‌شناسد و آن جمله می‌رود', /«تفسیر»/.test(seenP) && g1.kinds['تفسیر'] === 1 &&
     !/همین منطقِ عجیب/.test(e1.sections[0].narration) && /بلبل نیوز/.test(e1.sections[0].narration), e1.sections[0].narration);
  const e2 = epG(); const g2 = groundEpisode_(e2, items, { judge });
  ok('۷.۱۲ در قسمتِ غیرِطنز «تفسیر» نوعِ مجاز نیست و چیزی نمی‌رود', g2.removed === 0 && /همین منطقِ عجیب/.test(e2.sections[0].narration));
  const pr = fs.readFileSync('src/03_Producer.gs', 'utf8'), mu = fs.readFileSync('src/23_Music.gs', 'utf8');
  const prod = pr.slice(pr.indexOf('function produceEpisode('), pr.indexOf('function produceEpisodeContinue('));
  ok('۷.۱۳ سیم‌کشی: ژانر یک بار حساب می‌شود و به نویسنده، پروندهٔ قسمت، داور و موسیقی می‌رسد',
     /var vMode = varietyMode_\(items, picked\.title\)/.test(prod) && /buildPrompt_\([^)]*, vMode\)/.test(prod) && /ep\.mode = vMode;/.test(prod) &&
     /groundEpisode_\(ep, items\.concat\(refs\), \{ mode: vMode \}\)/.test(prod) && /genre: \(ep && ep\.mode && VARIETY_MODES/.test(pr) &&
     /ctx\.genre \? '  ژانر: '/.test(mu));
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ سیرِ «از همه جا» گذشت.');
