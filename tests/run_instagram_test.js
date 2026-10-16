/* ریلزِ اینستاگرامِ درس‌نامه (بخشِ ۳۸، ۹.۲۱).
 *
 * سنجه‌ها خودِ توابع را می‌دوانند. مرزهایی که مهم‌اند:
 *   ۱) فقط درسی که ویدئوی **عمومیِ** یوتیوب دارد، به ترتیب از اولین — ریلزی که پیوندش نیست وعدهٔ دروغ است.
 *   ۲) تاریخ، «امروز»، «پادکست» در متنِ ریلز نمی‌ماند؛ دعوت به یوتیوب از **کد** می‌آید، نه از مدل.
 *   ۳) همه‌چیزِ ریلز در زیرپوشهٔ «اینستاگرام»ِ همان قسمت — نه خودِ پوشهٔ قسمت (ytVideoIn_/ytAudioParts_).
 *   ۴) سه‌تای اول بی تأیید منتشر نمی‌شوند؛ کلید فقط در سرآیند؛ سهمِ روزانه.
 *   ۵) خطِ وضعیت همیشه هست و هایلایت را «کارِ شما» می‌گوید؛ گیرکردن مسئلهٔ روز است، «منتظرِ تأیید» نه.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 220) : ''));
};
const hub = new Spread('HUB');
global.getHub_ = () => hub;
const sent = [], queued = [];
global.tgSend_ = m => { sent.push(m); return true; };
global.mailQueue_ = (k, t, b) => { queued.push(t); return true; };

console.log('=== ۱) کدام درس بعدی است — مجموعه به مجموعه، درس به درس، بی جاافتادن (۹.۳۰) ===');
{
  /* «از ابتدا مصباح … بدون هیچ جاافتادنی کامل … بعد آئودی … تا برسی به چیزی که الان در جریانه و به موازاتش».
     مصباح = قسمت‌های ۱، ۲، ۳ و مرورِ بزرگِ ۱۰؛ آئودی = ۴، ۵، ۶ (شماره‌های سراسری یک‌درمیان، همان شکلِ واقعی). */
  const P = (id, priv) => ({ videoId: id, url: 'https://youtu.be/' + id, privacy: priv || 'public', series: '' });
  const order = [{ name: 'مصباح', eps: [{ ep: 1, lesson: 1 }, { ep: 2, lesson: 2 }, { ep: 3, lesson: 3 }, { ep: 10, recap: 1, lesson: 0 }] },
                 { name: 'آئودی', eps: [{ ep: 4, lesson: 1 }, { ep: 5, lesson: 2 }, { ep: 6, lesson: 3 }] }];
  const pub = { 'special:1': P('a1'), 'special:2': P('a2'), 'special:3': P('a3'), 'special:10': P('a10'),
                'special:4': P('b1'), 'special:5': P('b2'), 'special:6': P('b3'), 'variety:1': P('x1') };
  const nx = (st, pb) => igNextEp_(pb || pub, st, order);
  ok('۱.۱ اول مصباح از درسِ ۱ — نه کوچک‌ترین شمارهٔ سراسری از هر مجموعه', nx({}).ep === 1 && nx({}).series === 'مصباح' && nx({}).lesson === 1);
  ok('۱.۲ درس به درس، و مرورِ بزرگ سرِ جای خودش؛ بعد از تمام شدنِ مصباح، آئودی از درسِ ۱',
     nx({ done: '1' }).ep === 2 && nx({ done: '1,2,3' }).ep === 10 && nx({ done: '1,2,3' }).recap === true && nx({ done: '1,2,3,10' }).ep === 4);
  ok('۱.۳ درسی که در حالِ ساخت است، درسِ بعدیِ همان مجموعه را نمی‌بندد (ساخت هم‌زمان، انتشار به ترتیب)',
     nx({ inflight: [{ ep: 1 }] }).ep === 2);
  const gapPub = Object.assign({}, pub, { 'special:2': P('a2', 'unlisted') });
  const sg = { done: '1' };
  const g1 = nx(sg, gapPub);
  ok('۱.۴ جاافتاده (درسِ ۲ عمومی نیست ولی ۳ هست) ⇒ مصباح همان‌جا می‌ایستد، درسِ ۳ **رد نمی‌شود**، و گفته می‌شود',
     g1.ep === 4 && sg.gaps.length === 1 && /مصباح.*درسِ 2/.test(sg.gaps[0]) && nx({}, gapPub).ep === 1, JSON.stringify([g1, sg.gaps]));
  const capPub = Object.assign({}, pub); delete capPub['special:10'];
  const sc = {};
  ok('۱.۵ به آخرِ منتشرشده رسید (مرورِ ۱۰ هنوز منتشر نشده و بعدش چیزی نیست) ⇒ «همراهِ تولید»، نه جاافتاده',
     nx(Object.assign(sc, { done: '1,2,3' }), capPub).ep === 4 && !sc.gaps.length && sc.caught.indexOf('مصباح') !== -1);
  const fNow = { fails: { '2': CFG.IG_TRY_MAX }, failAt: { '2': Date.now() }, done: '1' };
  const fOld = { fails: { '2': CFG.IG_TRY_MAX }, failAt: { '2': Date.now() - 30 * 3600000 }, done: '1' };
  ok('۱.۶ سقفِ تلاش ⇒ مجموعه سرِ همان درس می‌ایستد (نه رد)، و پس از IG_RETRY_H همان درس دوباره',
     nx(fNow).ep === 4 && /سه بار نشد/.test(fNow.gaps[0]) && nx(fOld).ep === 2 && fOld.fails['2'] === 0, JSON.stringify(fNow.gaps));
  ok('۱.۷ «از همه جا» هرگز', !JSON.stringify(nx({ done: '1,2,3,10,4,5,6' })).includes('x1') && nx({ done: '1,2,3,10,4,5,6' }) === null);
  /* ترتیبِ مجموعه‌ها از نخستین قسمتشان؛ فهرست فشرده در حالت (سقفِ ۹ کیلوبایتِ Properties). */
  const st2 = {};
  const pub2 = { 'special:4': Object.assign(P('b1'), { series: 'آئودی' }), 'special:1': Object.assign(P('a1'), { series: 'مصباح' }),
                 'special:2': Object.assign(P('a2'), { series: 'مصباح' }) };
  const o2 = igOrder_(pub2, st2, true);
  ok('۱.۸ بی رجیستری، فهرست از جدولِ یوتیوب؛ مجموعهٔ زودتر اول؛ ذخیرهٔ فشرده و بازخوانیِ یکسان',
     o2[0].name === 'مصباح' && o2[1].name === 'آئودی' && /^1:1,2:2$/.test(st2.order.s[0].e) &&
     JSON.stringify(igOrderDec_(st2.order.s)) === JSON.stringify(o2.map(S => ({ name: S.name, eps: S.eps.map(x => ({ ep: x.ep, recap: x.recap ? 1 : 0, lesson: x.lesson })) }))),
     JSON.stringify(st2.order));
  const stP = { done: '', order: { s: [{ n: 'مصباح', e: '1:1,2:2,3:3' }] } };
  ok('۱.۹ انتشار به ترتیب: درسِ ۲ تا وقتی درسِ ۱ منتشر نشده منتظر می‌ماند', igEarlierPending_(stP, 2) === 'درسِ 1' &&
     igEarlierPending_(Object.assign({}, stP, { done: '1' }), 2) === '' && igEarlierPending_(stP, 1) === '');
}

console.log('=== ۲) متنِ ریلز: یک متنِ پیوسته، مرزها در کد (۹.۲۵) ===');
/* متنِ پیوسته با یک خط: قلاب ⇐ چرایی ⇐ ایده ⇐ مثال ⇐ جواب. */
const SCRIPT = 'آیا می‌دانستید پرسشِ «از کجا می‌دانم؟» ستونِ همهٔ شناخت‌های ماست؟ ' +
  'چون هر باوری که داریم، روزی باید جلوِ همین پرسش بایستد. ' +
  'فیلسوفان گفتند دانستن یعنی باوری صادق که دلیلی پشتش باشد. ' +
  'اما مثال‌هایی پیدا شد که هر سه شرط بود و باز کسی نمی‌گفت آن آدم واقعاً می‌دانست. ' +
  'مثلاً ساعتی که خوابیده و تصادفاً ساعتِ درست را نشان می‌دهد؛ باورِ شما درست است، ولی از روی شانس. ' +
  'پس دانستن چیزی بیش از باورِ درستِ دلیل‌دار است، و معرفت‌شناسی دقیقاً به دنبالِ همان چیزِ کم است.';
const RAW = { idea: 'دانستن بیش از باورِ صادقِ موجه است', script: SCRIPT, scenes: ['s1', 's2', 's3', 's4', 's5'],
              coverTitle: 'از کجا می‌دانم؟', caption: 'کپشن', story: 'استوری', tags: ['#معرفت شناسی', 'فلسفه', ''] };
{
  const p = igPlanTrim_(RAW);
  ok('۲.۱ متنِ پیوسته به جمله‌ها شکسته می‌شود؛ قلاب = جملهٔ اول؛ تصویر به ترتیبِ خط', p.lines && p.lines.length === 6 &&
     p.hook === p.lines[0].text && /ستونِ همهٔ شناخت/.test(p.hook) && p.lines[0].scene === 's1' && p.lines[5].scene === 's5' && p.idea,
     JSON.stringify(p.lines && p.lines.map(x => [x.text.slice(0, 14), x.scene])));
  ok('۲.۲ برچسب بی # و بی فاصله', p.tags.join('|') === 'معرفت_شناسی|فلسفه', p.tags.join('|'));
  ok('۲.۳ کمتر از چهار جمله پذیرفته نمی‌شود', !igPlanTrim_(Object.assign({}, RAW, { script: 'آیا می‌دانستید؟ این یک جملهٔ کوتاه است. و این دومی.' })).lines);
  const bad1 = igPlanTrim_(Object.assign({}, RAW, { script: SCRIPT + ' در این قسمت از پادکست دیدیم.' }));
  const bad2 = igPlanTrim_(Object.assign({}, RAW, { script: SCRIPT.replace('روزی', 'در سالِ ۱۴۰۵') }));
  ok('۲.۴ «پادکست/این قسمت» یا تاریخ ⇒ کلِ متن رد (متنِ پیوسته را نمی‌شود سوراخ کرد)', !bad1.lines && !bad2.lines, bad1.why + ' | ' + bad2.why);
  ok('۲.۴-ب «تا امروز» محتواست، نه تاریخ', !!igPlanTrim_(Object.assign({}, RAW, { script: SCRIPT + ' این پرسش تا امروز هم باز مانده است.' })).lines);
  const cap = igCaption_(p, 'https://youtu.be/v5', 'معرفت‌شناسی', 4);
  ok('۲.۵ کپشن: پیوندِ همان ویدئو، نامِ مجموعه و درس، برچسبِ پایه و درس بی تکرار', cap.indexOf('https://youtu.be/v5') !== -1 &&
     cap.indexOf('«معرفت‌شناسی» — درسِ ۴') !== -1 && /#درسنامه/.test(cap) && /#فلسفه/.test(cap) &&
     cap.split('#فلسفه').length === 2 && cap.length <= 2200 && (cap.match(/#/g) || []).length <= 12 && /کانالِ «/.test(cap), cap.replace(/\n/g, ' ¶ '));
}

/* یک قسمتِ درس‌نامه با _special.json و دو نقاشی در «تصویرها». */
const series = global.__ROOT_FOLDER.createFolder('مجموعه');
const epFo = series.createFolder('قسمت 005');
epFo.createFile(Utilities.newBlob(JSON.stringify({ seriesName: 'معرفت‌شناسی', lesson: 4,
  ep: { title: 'دانستن چیست', __cast: { lead: 'Charon' },
        sections: [{ heading: 'باور', narration: 'متنِ بخشِ یک.' }, { heading: 'صدق', narration: 'متنِ بخشِ دو.' }] } }),
  'application/json', '_special.json'));
const pics = epFo.createFolder(CFG.LV_FOLDER || 'تصویرها');
pics.createFile(Utilities.newBlob('a', 'image/png', 'صحنه 02.png'));
pics.createFile(Utilities.newBlob('b', 'image/png', 'صحنه 01.png'));
pics.createFile(Utilities.newBlob('c', 'image/png', 'کاور.png'));
const it = { key: 'ig:special:5', ep: 5, series: 'معرفت‌شناسی', folderId: epFo.getId(), yt: 'https://youtu.be/v5', phase: 'plan' };

console.log('=== ۳) از مدل تا صف ===');
let fo, plan;
{
  /* نویسنده متنِ پیوسته (با دعوتِ خودش به یوتیوب — باید رد شود و دوباره نوشته شود) می‌دهد؛ داور جدا داوری می‌کند. */
  const J_OK = { oneIdea: 'بله', flows: 'بله', answersHook: 'بله', faithful: 'بله', popular: 'بله', thirst: 'بله', weak: '', fix: '' };
  global.__judge = [J_OK]; global.__writer = [Object.assign({}, RAW, { caption: 'دانستن یعنی چه؟' })]; global.__asks = [];
  global.__STUB = (url, body) => {
    if (/generateContent/.test(url) && !/tts/.test(url)) {
      const txt = JSON.stringify(body);
      const isJ = txt.indexOf('داورِ سخت‌گیر') !== -1;
      global.__asks.push(isJ ? 'J' : 'W');
      const out = isJ ? global.__judge.shift() : global.__writer.shift();
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(out || {}) }] } }] } };
    }
    return { code: 404, json: {} };
  };
  fo = igFolder_(epFo);
  const r = igStepPlan_(it, fo);
  plan = r.plan;
  ok('۳.۱ برنامه ساخته شد، داور دید، و جملهٔ پایانیِ یوتیوب را **کد** افزود', r.ok && global.__asks.join('') === 'WJ' && plan.v === CFG.IG_PLAN_V &&
     plan.plan.judge === 'پیوسته' && plan.plan.lines[plan.plan.lines.length - 1].text === IG_CTA_LINE &&
     plan.plan.lines[plan.plan.lines.length - 1].cta === true &&
     plan.plan.lines.filter(x => /یوتیوب/.test(x.text)).length === 1, JSON.stringify(plan && plan.plan.lines.map(x => x.text.slice(0, 10))));
  ok('۳.۲ صدای گویندهٔ همان درس، و کپشن با پیوند', plan.voice === 'Charon' && plan.caption.indexOf('https://youtu.be/v5') !== -1);
  ok('۳.۳ `_ig.json` و متن در زیرپوشهٔ «اینستاگرام» — نه خودِ پوشهٔ قسمت',
     fo.getName() === 'اینستاگرام' && fo.getFilesByName('_ig.json').hasNext() && fo.getFilesByName('ریلز — متن و کپشن.txt').hasNext() &&
     !epFo.getFilesByName('_ig.json').hasNext() && igFolder_(epFo) === fo);

  /* صدا (۹.۲۶): بدنه یک‌جا، با اعراب و دستورِ لحن؛ جملهٔ دعوت جدا. */
  const sr = CFG.SAMPLE_RATE || 24000;
  const calls = [];
  const keepTts = global.ttsChunk_, keepVow = global.vowelizeText_;
  global.vowelizeText_ = (t) => 'اعراب‌دار:' + t;
  global.ttsChunk_ = (t, st, v, cue) => { calls.push({ t, st, cue }); return Utilities.base64Encode(new Array(sr * 2 * (calls.length === 1 ? 6 : 1)).fill(0)); };
  try { ok('۳.۴ صدا ساخته شد', igStepVoice_(it, fo, plan, Date.now() + 60000).ok); } finally { global.ttsChunk_ = keepTts; global.vowelizeText_ = keepVow; }
  const nb = plan.plan.lines.length - 1;
  ok('۳.۵ دو فراخوان: کلِ بدنه یک‌جا (با اعراب و لحنِ قصه‌گو) و جملهٔ دعوت جدا — نه هر جمله جدا', calls.length === 2 &&
     /^اعراب‌دار:/.test(calls[0].t) && calls[0].st === CFG.IG_VOICE_STYLE && calls[0].cue === true && calls[1].t.indexOf('یوتیوب') !== -1 &&
     plan.vowelized === true, JSON.stringify(calls.map(c => c.t.slice(0, 20))));
  ok('۳.۵-ب زمانِ جمله‌ها پشتِ‌هم درونِ ۶ ثانیهٔ بدنه؛ دعوت پس از مکث', plan.times.length === nb + 1 &&
     Math.abs(plan.times[0].t0 - 0.15) < 0.02 && Math.abs(plan.times[nb - 1].t1 - 6.15) < 0.03 && plan.times[nb].t0 > 6.5 &&
     plan.times.every((x, i) => !i || x.t0 >= plan.times[i - 1].t1 - 0.01), JSON.stringify(plan.times));
  ok('۳.۶ «ریلز — صدا.wav» در پوشهٔ اینستاگرام', fo.getFilesByName('ریلز — صدا.wav').hasNext() && plan.phase === 'img');

  ok('۳.۷ تصویرها: نقاشی‌های خودِ درس، به ترتیبِ نام، بی کاور، رونوشت در پوشهٔ اینستاگرام',
     igStepImages_(it, fo, plan, Date.now() + 60000).ok && plan.imgs.length === 2 && plan.imgHow === 'نقاشی‌های درس' &&
     global.__FILES_BY_ID[plan.imgs[0].src].getName() === 'صحنه 01.png' && fo.getFilesByName('ریلز — تصویر 1').hasNext(),
     JSON.stringify(plan.imgs));

  /* صف: ردیفی در `reels`، نه `items`؛ اشتراکِ موقت. */
  let saved = null; const shared = [];
  const kR = global.ytRenderRead_, kS = global.ytRenderSave_, kOn = global.ytShareOn_, kG = global.ghRenderDue_;
  global.ytRenderRead_ = () => ({ items: [{ key: 'special:9', status: 'در انتظار' }], reels: [{ key: 'ig:special:5', sig: 'old' }] });
  global.ytRenderSave_ = d => { saved = d; return true; };
  global.ytShareOn_ = id => { shared.push(id); return true; };
  global.ghRenderDue_ = () => true;
  try { ok('۳.۸ درخواست نوشته شد', igStepAsk_(it, fo, plan).ok && plan.phase === 'got'); }
  finally { global.ytRenderRead_ = kR; global.ytRenderSave_ = kS; global.ytShareOn_ = kOn; global.ghRenderDue_ = kG; }
  const row = saved.reels.find(x => x.key === 'ig:special:5');
  ok('۳.۹ یک ردیف در `reels` (قدیمیِ همان کلید جایگزین)، `items` دست‌نخورده', saved.reels.length === 1 && row.sig === plan.sig &&
     saved.items.length === 1 && saved.items[0].key === 'special:9', JSON.stringify(saved.reels.map(x => x.sig)));
  ok('۳.۱۰ جمله‌ها با زمان و تصویر؛ جملهٔ پایانی روی تصویرِ آخر', row.lines.length === plan.plan.lines.length &&
     row.lines[0].img === 0 && row.lines[row.lines.length - 1].img === 1 && row.lines[0].t0 === plan.times[0].t0 &&
     row.audio.url && row.imgs.length === 2, JSON.stringify(row.lines.map(x => x.img)));
  ok('۳.۱۰-ب ردیف: واژه‌های کلیدی، درخواستِ شورتز، نشانِ جملهٔ دعوت؛ کارتِ پایانی بی «لینک در کپشن»', Array.isArray(row.emph) &&
     row.short === true && row.lines[row.lines.length - 1].cta === true && !row.lines[0].cta && !row.end.l3 && !/لینک در کپشن/.test(JSON.stringify(row)));
  ok('۳.۱۱ صدا و تصویرها موقت به اشتراک رفتند', shared.indexOf(plan.audioId) !== -1 && plan.imgs.every(x => shared.indexOf(x.id) !== -1));
}

console.log('=== ۳-ب) داورِ پیوستگی: بازنویسی یا رد (۹.۲۵) ===');
{
  /* «ارتباطِ معنایی محتوا اصلاً خوب نبود»: هفت شعارِ جدا. داور «خیر» ⇒ یک بازنویسی و داوریِ دوباره؛ باز «خیر» ⇒ رد. */
  const J_BAD = { oneIdea: 'خیر', flows: 'خیر', answersHook: 'خیر', faithful: 'بله', weak: 'جملهٔ دوم موضوعِ دیگری است',
                  fix: SCRIPT.replace('آیا می‌دانستید', 'می‌دانستید') };
  const J_OK = { oneIdea: 'بله', flows: 'بله', answersHook: 'بله', faithful: 'بله', popular: 'بله', thirst: 'بله', weak: '', fix: '' };
  const fo2 = igFolder_(epFo);
  global.__asks = []; global.__writer = [RAW]; global.__judge = [J_BAD, J_OK];
  const r1 = igStepPlan_(it, fo2);
  ok('۳-ب.۱ داور «خیر» ⇒ متنِ بازنویسی‌شده جایگزین و دوباره داوری شد', r1.ok && global.__asks.join('') === 'WJJ' &&
     /^می‌دانستید/.test(r1.plan.plan.lines[0].text) && /بازنویسی شد/.test(r1.plan.plan.judge), r1.plan && r1.plan.plan.judge);
  global.__asks = []; global.__writer = [RAW]; global.__judge = [J_BAD, J_BAD];
  const r2 = igStepPlan_(it, fo2);
  ok('۳-ب.۲ باز «خیر» ⇒ رد، با علتِ داور — ضعیف منتشر نمی‌شود', r2.fail && /داورِ پیوستگی نپذیرفت/.test(r2.fail) && /یک ایده نیست/.test(r2.fail), r2.fail);
  global.__asks = []; global.__writer = [RAW];
  global.__judge = [Object.assign({}, J_OK, { flows: 'خیر', weak: 'جملهٔ سوم از دوم نمی‌آید' }), Object.assign({}, J_OK, { flows: 'خیر' })];
  const rF = igStepPlan_(it, fo2);
  ok('۳-ب.۲-ب فقط «پیوسته نیست» هم بس است برای رد', rF.fail && /پیوسته نیستند/.test(rF.fail), rF.fail);
  global.__asks = []; global.__writer = [RAW];
  global.__judge = [Object.assign({}, J_OK, { popular: 'خیر', weak: 'اصطلاحِ «موجه» برای مخاطبِ عام سنگین است' }), Object.assign({}, J_OK, { popular: 'خیر' })];
  const rP = igStepPlan_(it, fo2);
  ok('۳-ب.۲-ج «برای مخاطبِ عام سنگین» به‌تنهایی رد می‌کند (۹.۲۶)', rP.fail && /مخاطبِ عام/.test(rP.fail), rP.fail);
  global.__asks = []; global.__writer = [RAW]; global.__judge = [null];
  const r3 = igStepPlan_(it, fo2);
  ok('۳-ب.۳ داور جواب نداد ⇒ رد، نه تأییدِ خاموش', !!r3.fail, r3.fail);
  /* برنامهٔ کهنه (v1) منتظرِ تأیید ⇒ از نو؛ منتشرشده ⇒ دست نمی‌خورد. */
  const keepStep = { pl: global.igStepPlan_ };
  let replanned = 0;
  global.igStepPlan_ = () => { replanned++; return { wait: 'آزمون' }; };
  igPlanWrite_(fo2, { v: 1, key: it.key, phase: 'ok', plan: { lines: [] } });
  const itA = Object.assign({}, it, { phase: 'ok' });
  igStep_(itA, {}, Date.now() + 60000);
  igPlanWrite_(fo2, { v: 1, key: it.key, phase: 'done', reelId: 'M9', plan: { lines: [] } });
  const itB = Object.assign({}, it, { phase: 'done' });
  const rB = igStep_(itB, {}, Date.now() + 60000);
  global.igStepPlan_ = keepStep.pl;
  ok('۳-ب.۴ برنامهٔ کهنهٔ منتشرنشده از نو ساخته می‌شود؛ منتشرشده دست نمی‌خورد', replanned === 1 && rB.done === true, 'replanned=' + replanned);
  igPlanWrite_(fo2, plan);
}

console.log('=== ۴) تأیید و انتشار ===');
{
  const st = { stats: { published: 0 } };
  const kA = global.igApproved_;
  global.igApproved_ = () => ({});
  plan.video = 'https://example/r.mp4'; plan.cover = 'https://example/c.jpg';
  try {
    const w1 = igStepOk_(it, plan, st), w2 = igStepOk_(it, plan, st);
    ok('۴.۱ ریلزِ اول بی تأیید منتظر می‌ماند و صاحبِ برنامه **یک بار** خبردار می‌شود', w1.wait && w2.wait && plan.phase !== 'pub' &&
       sent.length === 1 && queued.length === 1 && /تأیید/.test(sent[0]), w1.wait);
    global.igApproved_ = () => ({ 'ig:special:5': 1 });
    ok('۴.۲ با کلید در `docs/ig-approve.json` جلو می‌رود', igStepOk_(it, plan, st).ok && plan.phase === 'pub');
    plan.phase = 'ok'; global.igApproved_ = () => ({});
    ok('۴.۳ پس از IG_APPROVE انتشار، دیگر تأیید لازم نیست', igStepOk_(it, plan, { stats: { published: CFG.IG_APPROVE } }).ok);
  } finally { global.igApproved_ = kA; }

  global.__PROPS[PK.IG_TOKEN] = 'EAAtesttoken123';
  global.__PROPS[PK.IG_ACCT] = JSON.stringify({ ig: '1784', user: 'truth_trace1' });
  const calls = [];
  let n = 0;
  global.__STUB = (url, body, opt) => {
    calls.push({ url, body, auth: (opt.headers || {}).Authorization || '' });
    if (/\/1784\/media$/.test(url)) return { code: 200, json: { id: body.media_type === 'REELS' ? 'C1' : 'C2' } };
    if (/\/C[12]\?/.test(url)) return { code: 200, json: { status_code: 'FINISHED' } };
    if (/media_publish/.test(url)) return { code: 200, json: { id: body.creation_id === 'C1' ? 'M1' : 'M2' } };
    if (/\/M1\?/.test(url)) return { code: 200, json: { permalink: 'https://instagram.com/reel/xyz' } };
    return { code: 404, json: { error: { message: 'نه' } } };
  };
  const kLog = global.igLog_; let logged = 0; global.igLog_ = () => { logged++; };
  plan.phase = 'pub';
  const st2 = { stats: { published: 3 } };
  let r;
  try { r = igStepPub_(it, plan, st2, Date.now() + 60000); } finally { global.igLog_ = kLog; }
  const reel = calls.find(c => /\/media$/.test(c.url) && c.body.media_type === 'REELS');
  ok('۴.۴ ریلز با ویدئو، کاور، کپشن و اشتراک در فید ساخته و منتشر شد', r.ok && plan.reelId === 'M1' && plan.phase === 'yts' &&
     reel.body.video_url === plan.video && reel.body.cover_url === plan.cover && reel.body.caption === plan.caption &&
     reel.body.share_to_feed === 'true' && plan.permalink === 'https://instagram.com/reel/xyz', JSON.stringify(calls.map(c => c.url.split('/').slice(-2).join('/'))));
  ok('۴.۵ استوریِ همان کاور', plan.storyId === 'M2' &&
     calls.some(c => c.body.media_type === 'STORIES' && c.body.image_url === plan.cover));
  ok('۴.۶-ب کپشنِ فرستاده بی ایموجی، حتی اگر برنامهٔ قدیمی داشت (۹.۲۴)', !/[\uD800-\uDFFF]/.test(reel.body.caption) &&
     igCapClean_('🎧 نسخهٔ کامل\n📚 مجموعه') === 'نسخهٔ کامل\nمجموعه' && !/[\uD800-\uDFFF]/.test(igCaption_({ caption: 'x', tags: [] }, 'u', 's', 1)),
     JSON.stringify(igCapClean_('🎧 نسخهٔ کامل\n📚 مجموعه')));
  ok('۴.۶ کلید فقط در سرآیند — هرگز در نشانی', calls.every(c => c.auth === 'Bearer EAAtesttoken123' && c.url.indexOf('EAAtest') === -1));
  ok('۴.۷ شمارِ امروز و کل؛ ردیفِ تب پس از شورتز نوشته می‌شود', st2.stats.published === 4 && st2.stats.dayN === 1 && logged === 0);
  calls.length = 0;
  const full = { stats: { published: 9, day: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'), dayN: CFG.IG_PER_DAY } };
  const p2 = JSON.parse(JSON.stringify(plan)); p2.reelCid = ''; p2.reelId = ''; p2.phase = 'pub';
  const r2 = igStepPub_(it, p2, full, Date.now() + 60000);
  ok('۴.۸ سهمِ روز پر ⇒ صبر، بی هیچ فراخوانِ Graph', r2.wait && calls.length === 0, r2.wait);
  /* استوری شکست بخورد: ریلز «نشد» نمی‌شود. */
  global.__STUB = (url, body) => {
    if (/\/1784\/media$/.test(url)) return body.media_type === 'REELS' ? { code: 200, json: { id: 'C1' } } : { code: 400, json: { error: { message: 'story bad' } } };
    if (/\/C1\?/.test(url)) return { code: 200, json: { status_code: 'FINISHED' } };
    if (/media_publish/.test(url)) return { code: 200, json: { id: 'M1' } };
    return { code: 200, json: {} };
  };
  const p3 = JSON.parse(JSON.stringify(plan)); p3.reelCid = ''; p3.reelId = ''; p3.storyId = ''; p3.phase = 'pub';
  global.igLog_ = () => {};
  try { r = igStepPub_(it, p3, { stats: { published: 5 } }, Date.now() + 60000); } finally { global.igLog_ = kLog; }
  ok('۴.۹ شکستِ استوری ریلزِ منتشرشده را «نشد» نمی‌کند — علتش ثبت می‌شود', r.ok && p3.phase === 'yts' && p3.storyWhy === 'story bad', p3.storyWhy);
  global.__STUB = (url, body) => (/\/1784\/media$/.test(url) ? { code: 400, json: { error: { message: 'bad video' } } } : { code: 200, json: {} });
  const p4 = JSON.parse(JSON.stringify(plan)); p4.reelCid = ''; p4.reelId = ''; p4.phase = 'pub';
  const r4 = igStepPub_(it, p4, { stats: { published: 5 } }, Date.now() + 60000);
  ok('۴.۱۰ ظرفِ ریلز ساخته نشد ⇒ «نشد» با پیامِ خودِ Graph', r4.fail && /bad video/.test(r4.fail), r4.fail);
}

console.log('=== ۴-ب) شورتزِ یوتیوب: بی پلی‌لیست، دو پیوند، اول unlisted (۹.۲۶) ===');
{
  const keep = { yt: global.YouTube, q: global.ytQuotaTake_, pl: global.ytPlFor_, stub: global.__STUB, leaks: global.ytLeaks_ };
  const ins = [], upd = [], plAdds = [];
  global.YouTube = { Videos: { insert: (res, part, blob) => { ins.push({ res, blob }); return { id: 'SH1' }; },
                               update: (res, part) => { upd.push(res); return res; } },
                     PlaylistItems: { insert: (x) => { plAdds.push(x); return {}; } } };
  global.ytQuotaTake_ = () => true;
  global.ytPlFor_ = (item, name) => ({ id: 'PLX', title: name });
  global.__STUB = (url) => (/short\.mp4/.test(url) ? { code: 200, bytes: [0, 0, 0, 24, 102, 116, 121, 112], mime: 'video/mp4' } : { code: 404, json: {} });
  const sp = JSON.parse(JSON.stringify(plan));
  Object.assign(sp, { short: 'https://example/reel-short.mp4', yt: 'https://youtu.be/v5', series: 'معرفت‌شناسی', seriesKey: 'K1', phase: 'yts' });
  sp.plan.caption = '🎧 دانستن یعنی چه؟'; sp.plan.coverTitle = 'از کجا می‌دانم؟'; sp.plan.tags = ['فلسفه', 'معرفت_شناسی'];
  const r = igShortPub_(it, sp);
  const d = ins[0] && ins[0].res.snippet.description;
  ok('۴-ب.۱ آپلود با عنوانِ #Shorts و توضیحِ دو پیوند (درسِ کامل + پلی‌لیستِ مجموعه)، بی ایموجی', r.ok && ins.length === 1 &&
     /#Shorts$/.test(ins[0].res.snippet.title) && d.indexOf('https://youtu.be/v5') !== -1 && d.indexOf('list=PLX') !== -1 &&
     /«معرفت‌شناسی»/.test(d) && !/[\uD800-\uDFFF]/.test(d), d && d.replace(/\n/g, ' ¶ '));
  ok('۴-ب.۲ اول unlisted، و پس از وارسیِ نشتی عمومی', ins[0].res.status.privacyStatus === 'unlisted' && upd.length === 1 &&
     upd[0].status.privacyStatus === 'public' && sp.shortPublic === true && sp.shortUrl === 'https://www.youtube.com/shorts/SH1');
  ok('۴-ب.۳ به هیچ پلی‌لیستی افزوده نمی‌شود', plAdds.length === 0 && !/PlaylistItems|ytPlPlace_/.test(String(igShortPub_)));
  /* نشتی ⇒ unlisted می‌مانَد */
  ins.length = 0; upd.length = 0;
  global.ytLeaks_ = () => ['drive.google.com/x'];
  const sp2 = Object.assign(JSON.parse(JSON.stringify(sp)), { shortId: '', shortUrl: '', shortPublic: false });
  igShortPub_(it, sp2);
  ok('۴-ب.۴ نشتیِ خصوصی ⇒ unlisted می‌ماند و علت ثبت می‌شود', ins.length === 1 && upd.length === 0 && /نشتی/.test(sp2.shortWhy), sp2.shortWhy);
  global.ytLeaks_ = keep.leaks;
  /* سهمیه ⇒ صبر؛ بی نسخهٔ شورتز ⇒ رد نمی‌شود، علت ثبت */
  global.ytQuotaTake_ = () => false;
  const sp3 = Object.assign(JSON.parse(JSON.stringify(sp)), { shortId: '' });
  ok('۴-ب.۵ سهمیهٔ امروز تمام ⇒ صبر، نه شکست', !!igShortPub_(it, sp3).wait);
  const sp4 = Object.assign(JSON.parse(JSON.stringify(sp)), { short: '', shortId: '' });
  ok('۴-ب.۶ رانر نسخهٔ شورتز نداد ⇒ ریلز تمام می‌شود و علت می‌ماند', igShortPub_(it, sp4).ok && /نداد/.test(sp4.shortWhy));
  /* کاورِ شورتز (۹.۳۱): همان کاورِ رانر با thumbnails.set، روی همان شناسه. */
  global.ytQuotaTake_ = () => true;
  const th = [];
  global.YouTube.Thumbnails = { set: (id, blob) => { th.push({ id, n: blob.getBytes().length }); return {}; } };
  global.__STUB = (url) => (/short\.mp4/.test(url) ? { code: 200, bytes: [0, 0, 0, 24, 102, 116, 121, 112], mime: 'video/mp4' }
                           : /cover\.jpg/.test(url) ? { code: 200, bytes: [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3], mime: 'image/jpeg' } : { code: 404, json: {} });
  const sp5 = Object.assign(JSON.parse(JSON.stringify(sp)), { shortId: '', shortUrl: '', shortPublic: false, shortThumb: false, shortThumbWhy: '',
                                                             cover: 'https://example/reel-cover.jpg' });
  igShortPub_(it, sp5);
  ok('۴-ب.۷ شورتزِ تازه کاورِ خودِ ریلز را می‌گیرد (thumbnails.set روی همان شناسه)', th.length === 1 && th[0].id === 'SH1' && sp5.shortThumb === true,
     JSON.stringify(th) + ' ' + sp5.shortThumbWhy);
  th.length = 0;
  igShortPub_(it, sp5);
  ok('۴-ب.۸ دورِ بعد دوباره نمی‌فرستد', th.length === 0);
  const sp6 = { shortId: 'SH9', cover: 'https://example/big-cover.jpg' };
  global.__STUB = () => ({ code: 200, bytes: new Array(2 * 1024 * 1024 + 10).fill(1), mime: 'image/jpeg' });
  ok('۴-ب.۹ کاورِ بیش از ۲ مگ فرستاده نمی‌شود و علت با عدد می‌ماند', !igShortThumb_(sp6) && th.length === 0 && /سقفِ یوتیوب/.test(sp6.shortThumbWhy), sp6.shortThumbWhy);
  /* جبران: شورتزِ پیش از ۹.۳۱ (بی shortThumb) از روی _ig.json، یک‌بار؛ سپس خاموش. */
  global.__STUB = (url) => (/cover\.jpg/.test(url) ? { code: 200, bytes: [0xFF, 0xD8, 1], mime: 'image/jpeg' } : { code: 404, json: {} });
  const files = [{ shortId: 'OLD1', cover: 'https://example/old-cover.jpg', phase: 'done' }, { shortId: '' }, { shortId: 'OK2', shortThumb: true }]
    .map(p => { const f = { body: JSON.stringify(p), getBlob: () => ({ getDataAsString: () => f.body }), setContent: (b) => { f.body = b; } }; return f; });
  const kSearch = DriveApp.searchFiles;
  let q = '';
  DriveApp.searchFiles = (qq) => { q = qq; let i = 0; return { hasNext: () => i < files.length, next: () => files[i++] }; };
  const st9 = {};
  let did;
  try { did = igShortThumbRetro_(st9, Date.now() + 60000); } finally { DriveApp.searchFiles = kSearch; }
  const f0 = JSON.parse(files[0].body);
  ok('۴-ب.۱۰ جبران: شورتزِ قدیمیِ بی کاور کاور می‌گیرد و در _ig.json ثبت می‌شود؛ بقیه دست نمی‌خورند',
     did === 1 && f0.shortThumb === true && th.some(x => x.id === 'OLD1') && !th.some(x => x.id === 'OK2') && /_ig\.json/.test(q), JSON.stringify(th));
  ok('۴-ب.۱۱ پس از یک دورِ کامل خودش خاموش می‌شود', !!st9.thumbRetro && igShortThumbRetro_(st9, Date.now() + 60000) === 0);
  ok('۴-ب.۱۲ igTick جبران را صدا می‌زند', /igShortThumbRetro_\(st, deadline\)/.test(String(igTick)));
  delete global.YouTube.Thumbnails;
  Object.assign(global, { YouTube: keep.yt, ytQuotaTake_: keep.q, ytPlFor_: keep.pl, __STUB: keep.stub });
}

{
  /* igStep_: «yts» ⇒ شورتز ⇒ «done» و ردیفِ تب. */
  const keep = { sp: global.igShortPub_, lg: global.igLog_ };
  let called = 0, logged = 0;
  global.igShortPub_ = (x, pl) => { called++; pl.shortUrl = 'https://www.youtube.com/shorts/Z'; return { ok: true }; };
  global.igLog_ = () => { logged++; };
  const fo3 = igFolder_(epFo);
  igPlanWrite_(fo3, Object.assign(JSON.parse(JSON.stringify(plan)), { v: 3, phase: 'yts', reelId: 'M1' }));
  const rr = igStep_(Object.assign({}, it, { phase: 'yts' }), {}, Date.now() + 60000);
  Object.assign(global, { igShortPub_: keep.sp, igLog_: keep.lg });
  ok('۴-ب.۷ گامِ «yts» شورتز را می‌سازد، بعد «انجام» و ردیفِ تب', rr.done === true && called === 1 && logged === 1 &&
     igPlanRead_(fo3).phase === 'done' && /shorts\/Z/.test(igPlanRead_(fo3).shortUrl));
  igPlanWrite_(fo3, plan);
}

console.log('=== ۵) دورِ جدا: از صف تا انجام ===');
{
  /* igTick: یک درسِ تازه برمی‌دارد و گامی جلو می‌برد؛ وضعیت می‌ماند. */
  const kP = global.ytPublished_, kF = global.ytFolderOf_, kStep = global.igStep_;
  global.ytPublished_ = () => ({ 'special:5': { videoId: 'v5', url: 'https://youtu.be/v5', privacy: 'public', series: 'معرفت‌شناسی' } });
  global.ytFolderOf_ = () => epFo;
  let steps = 0;
  global.igStep_ = (x) => { steps++; return steps === 1 ? { wait: 'رانر هنوز نساخته' } : { done: true }; };
  global.__PROPS[PK.IG_STATE] = '{}';
  try {
    igTick();
    let s = igState_();
    ok('۵.۱ درسِ ۵ در جریان، با علتِ صبر و زمانِ آغازِ گام', s.inflight.length === 1 && s.inflight[0].key === 'ig:special:5' &&
       s.inflight[0].why === 'رانر هنوز نساخته' && s.inflight[0].since > 0 && s.ranMs > 0, JSON.stringify(s.inflight));
    igTick();
    s = igState_();
    ok('۵.۲ انجام شد ⇒ از «در جریان» به «انجام‌شده»؛ دوباره برداشته نمی‌شود', s.inflight.length === 0 && s.done === '5' && steps === 2);
    igTick();
    ok('۵.۳ چیزی نمانده ⇒ هیچ گامی', steps === 2 && igState_().inflight.length === 0);
    global.__PROPS[PK.IG_STATE] = '{}';
    global.igStep_ = () => ({ fail: 'متنِ ریلز پذیرفته نشد' });
    for (let k = 0; k < CFG.IG_TRY_MAX + 1; k++) igTick();
    s = igState_();
    ok('۵.۴ پس از IG_TRY_MAX شکست کنار می‌رود و علت می‌ماند', s.inflight.length === 0 && Number(s.fails['5']) === CFG.IG_TRY_MAX &&
       /پذیرفته نشد/.test(s.lastWhy), JSON.stringify(s));
  } finally { global.ytPublished_ = kP; global.ytFolderOf_ = kF; global.igStep_ = kStep; }
  ok('۵.۵ کلید نباشد ⇒ igArm_ هیچ تریگری نمی‌سازد', (() => {
    const t = global.__PROPS[PK.IG_TOKEN]; delete global.__PROPS[PK.IG_TOKEN];
    const n0 = global.__TRIGGERS.length; const r = igArm_(); const n1 = global.__TRIGGERS.length;
    global.__PROPS[PK.IG_TOKEN] = t; return r === false && n0 === n1;
  })());
}

console.log('=== ۶) خطِ وضعیت و سلامت ===');
{
  global.__PROPS[PK.IG_STATE] = JSON.stringify({ ranMs: Date.now(), stats: { published: 2 },
    inflight: [{ key: 'ig:special:8', phase: 'ok', why: 'منتظرِ تأیید', sincePhase: 'ok', since: Date.now() - 90 * 3600000 }] });
  const pr = [], nt = [];
  igHealth_(pr, nt);
  ok('۶.۱ خطِ روزانه همیشه هست و هایلایت را «کارِ شما» می‌گوید', nt.length === 1 && /@truth_trace1/.test(nt[0]) && /هایلایت/.test(nt[0]) && /⟨شما⟩/.test(nt[0]), nt[0]);
  ok('۶.۲ «منتظرِ تأیید» حتی ۹۰ ساعت مسئلهٔ روز نیست — تصمیمِ اوست', pr.length === 0, pr.join(' | '));
  global.__PROPS[PK.IG_STATE] = JSON.stringify({ ranMs: Date.now() - 9 * 3600000,
    inflight: [{ key: 'ig:special:8', phase: 'got', why: 'رانر هنوز نساخته', sincePhase: 'got', since: Date.now() - 40 * 3600000 }] });
  const pr2 = [], nt2 = [];
  igHealth_(pr2, nt2);
  ok('۶.۳ گامِ گیرکرده و اجرای نَدویده ⇒ مسئلهٔ روز با گام و علت', pr2.length === 1 && /got/.test(pr2[0]) && /ندویده/.test(pr2[0]) && /40 ساعت/.test(pr2[0]), pr2[0]);
  delete global.__PROPS[PK.IG_ACCT];
  const nt3 = [], pr3 = [];
  igHealth_(pr3, nt3);
  ok('۶.۴ بی کلید: خط می‌گوید کجا ثبت شود، و مسئله‌ای نمی‌سازد', /کلید ثبت نشده/.test(nt3[0]) && pr3.length === 0, nt3[0]);
}

console.log('=== ۸) آمار، نظرها و پیام‌ها در شیت (۹.۲۲) ===');
{
  global.__PROPS[PK.IG_TOKEN] = 'EAAtesttoken123';
  global.__PROPS[PK.IG_ACCT] = JSON.stringify({ ig: '1784', user: 'truth.traces', page: 'PG1' });
  const calls = [];
  let comments = [{ id: 'c1', text: 'عالی بود', username: 'ali', timestamp: '2026-10-16T10:00:00+0000', like_count: 2,
                    replies: { data: [{ id: 'c2', text: 'ممنون', username: 'truth.traces', timestamp: '2026-10-16T10:05:00+0000' }] } }];
  let msgOk = true;
  global.__STUB = (url, body, opt) => {
    calls.push({ url, auth: (opt.headers || {}).Authorization || '' });
    if (/\/1784\?fields=followers_count/.test(url)) return { code: 200, json: { followers_count: 120, media_count: 2 } };
    if (/\/1784\/media\?/.test(url)) return { code: 200, json: { data: [
      { id: 'M1', caption: 'ایده\n🎧 https://youtu.be/v5', media_product_type: 'REELS', permalink: 'https://instagram.com/reel/a', timestamp: '2026-10-16T09:00:00+0000', comments_count: 2 },
      { id: 'M2', caption: 'دستی', media_product_type: 'FEED', permalink: 'https://instagram.com/p/b', timestamp: '2026-10-15T09:00:00+0000', comments_count: 0, like_count: 3 }] } };
    if (/\/M1\/insights\?/.test(url)) return { code: 200, json: { data: [{ name: 'views', values: [{ value: 900 }] }, { name: 'reach', values: [{ value: 700 }] },
      { name: 'likes', values: [{ value: 40 }] }, { name: 'comments', values: [{ value: 2 }] }, { name: 'ig_reels_avg_watch_time', values: [{ value: 12400 }] }] } };
    if (/\/M2\/insights\?metric=views/.test(url)) return { code: 400, json: { error: { message: 'metric views not supported' } } };
    if (/\/M2\/insights\?/.test(url)) return { code: 200, json: { data: [{ name: 'reach', values: [{ value: 50 }] }] } };
    if (/\/M1\/comments\?/.test(url)) return { code: 200, json: { data: comments } };
    if (/\/PG1\?fields=access_token/.test(url)) return { code: 200, json: { access_token: 'PAGETOKEN' } };
    if (/\/PG1\/conversations\?platform=instagram/.test(url)) return msgOk
      ? { code: 200, json: { data: [{ id: 'cv1', messages: { data: [{ id: 'm1', message: 'سلام، درسِ بعدی کِی؟', from: { username: 'sara' }, created_time: '2026-10-16T11:00:00+0000' }] } }] } }
      : { code: 403, json: { error: { message: '(#200) Requires instagram_manage_messages permission' } } };
    return { code: 404, json: {} };
  };
  sent.length = 0;
  const st = { media: { M1: 'ig:special:5' } };
  const ins = igInsights_(st, Date.now() + 60000);
  const book = igBook_();
  const tab = n => book.getSheetByName(n);
  const S = tab(CFG.IG_STATS_TAB), C = tab(CFG.IG_COMMENTS_TAB), P = tab(CFG.IG_MSGS_TAB);
  /* ۹.۳۰: هابِ ۲۹ مگابایتی هر بار «Service Spreadsheets timed out» می‌داد و هیچ عددی ثبت نشد. */
  ok('۸.۰ آمار در دفترِ جدای اینستاگرام (زیرِ OUTPUT/«اینستاگرام»)، نه در هاب؛ همان دفتر دوباره باز می‌شود، دوباره ساخته نمی‌شود',
     !!S && !hub.getSheetByName(CFG.IG_STATS_TAB) && igBook_().getId() === book.getId() &&
     outFolder_().getFoldersByName(CFG.IG_BOOK_FOLDER).hasNext() && /docs\.google\.com\/spreadsheets/.test(igBookUrl_()),
     String(S) + ' ' + igBookUrl_());
  const sv = S.getRange(1, 1, S.getLastRow(), 16).getValues();
  const r1 = sv.find(r => r[0] === 'M1'), r2 = sv.find(r => r[0] === 'M2');
  ok('۸.۱ تبِ آمار: یک ردیف برای هر پست — بازدید، دسترسی، لایک، نظر، میانگینِ تماشا، و قسمت از نقشهٔ انتشار',
     sv.length === 3 && r1[3] === 'ig:special:5' && r1[6] === 900 && r1[7] === 700 && r1[8] === 40 && r1[9] === 2 && r1[13] === 12.4,
     JSON.stringify(r1));
  ok('۸.۲ پستِ دستی هم هست؛ سنجهٔ ناشناخته ⇒ فهرستِ کوتاه‌تر، نه هیچ', r2 && r2[7] === 50 && r2[8] === 3 && r2[15] === '', JSON.stringify(r2));
  const cv = C.getRange(1, 1, C.getLastRow(), 9).getValues();
  ok('۸.۳ تبِ نظرها: نظر و پاسخش، با کاربر و متن و پستِ خودش', cv.length === 3 && cv[1][4] === 'ali' && cv[1][5] === 'عالی بود' &&
     cv[2][7] === 'c1' && cv[1][2] === 'https://instagram.com/reel/a', JSON.stringify(cv.slice(1)));
  const pv = P.getRange(1, 1, P.getLastRow(), 6).getValues();
  ok('۸.۴ تبِ پیام‌ها: پیامِ دایرکت با فرستنده', pv.length === 2 && pv[1][3] === 'sara' && /درسِ بعدی/.test(pv[1][4]), JSON.stringify(pv));
  ok('۸.۵ کلیدِ صفحه فقط برای پیام‌ها، در سرآیند؛ هیچ کلیدی در نشانی', calls.filter(c => /conversations/.test(c.url)).every(c => c.auth === 'Bearer PAGETOKEN') &&
     calls.every(c => !/EAAtest|PAGETOKEN/.test(c.url)));
  ok('۸.۶ تازه‌ها به تلگرام، و خطِ روزانه عددها را می‌گوید', sent.length === 1 && /2 نظرِ تازه/.test(sent[0]) && /@sara/.test(sent[0]) &&
     ins.followers === 120 && /120 دنبال‌کننده/.test(igInsLine_(ins)) && /1 پیامِ تازه/.test(igInsLine_(ins)), sent[0]);
  ok('۸.۶-ب هر نظر در تلگرام با پیوندِ همان پست، نامِ قسمت و صفحهٔ نویسنده؛ پیام با صفحهٔ فرستنده (۹.۳۳)',
     /@ali \(instagram\.com\/ali\): «عالی بود»\n   ↳ زیرِ درس‌نامه، قسمتِ ۵: https:\/\/instagram\.com\/reel\/a/.test(sent[0]) &&
     /✉️ @sara \(instagram\.com\/sara\)/.test(sent[0]) && CFG.IG_INS_HOURS === 3, sent[0]);
  /* دورِ دوم: چیزی دوباره افزوده نمی‌شود؛ آمار جایش به‌روز می‌شود. */
  st.ins.ms = 0; sent.length = 0; msgOk = false;
  const ins2 = igInsights_(st, Date.now() + 60000);
  ok('۸.۷ دورِ دوم: ردیفِ آمار به‌روز نه افزوده، نظر و پیام دوباره ثبت نمی‌شوند، تلگرامِ خالی نمی‌رود',
     S.getLastRow() === 3 && C.getLastRow() === 3 && P.getLastRow() === 2 && sent.length === 0 && ins2.newComments === 0);
  ok('۸.۸ دسترسیِ پیام نیست ⇒ آمار و نظرها سرِ جا، و خط می‌گوید چرا', ins2.posts === 2 && /پیام‌ها: نشد — .*instagram_manage_messages/.test(igInsLine_(ins2)),
     igInsLine_(ins2));
  ok('۸.۹ پیش از IG_INS_HOURS دوباره خوانده نمی‌شود', igInsights_(st, Date.now() + 60000) === null);
  /* ۹.۲۴: خواندنی که افتاد (هاب «timed out») ساعتِ بعد دوباره، نه شش ساعتِ دیگر. */
  const keepPosts = global.igInsightsPosts_;
  global.igInsightsPosts_ = () => ({ posts: 0, comments: 0, newComments: [], why: 'Service Spreadsheets timed out' });
  st.ins.ms = 0;
  const insF = igInsights_(st, Date.now() + 60000);
  global.igInsightsPosts_ = keepPosts;
  const waitH = (Number(CFG.IG_INS_HOURS) * 3600000 - (Date.now() - insF.ms)) / 3600000;
  ok('۸.۹-ب شکستِ خواندنِ آمار ⇒ تلاشِ دوباره پس از یک ساعت، نه IG_INS_HOURS', waitH > 0.9 && waitH < 1.1, waitH.toFixed(2));

  comments = comments.concat([{ id: 'c3', text: 'سؤال دارم', username: 'reza', timestamp: '2026-10-16T12:00:00+0000' }]);
  st.ins.ms = 0;
  igInsights_(st, Date.now() + 60000);
  ok('۸.۱۰ فقط نظرِ تازه افزوده می‌شود', C.getLastRow() === 4 && C.getRange(4, 5, 1, 1).getValues()[0][0] === 'reza');
  const src = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  ok('۸.۱۱ igTick پس از گام‌های انتشار، با وقتِ مانده، آمار را می‌خوانَد؛ انتشار نقشهٔ پست ⇒ قسمت را می‌نویسد',
     /if \(deadline - Date\.now\(\) > 60000\) \{ try \{ igInsights_\(st, deadline\); \}/.test(src) && /st\.media\[plan\.reelId\] = it\.key;/.test(src));
}

console.log('=== ۷) سیم‌کشی ===');
{
  const vb = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
  const hb = vb.slice(vb.indexOf('function vbrCollectHourly'), vb.indexOf('if (CFG.VBR_ON === false) return null;', vb.indexOf('function vbrCollectHourly')));
  ok('۷.۱ igArm_ در درِ ساعتی، پیش از سدِ پل', /try \{ igArm_\(\); \} catch/.test(hb));
  const h = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۷.۲ `_STATUS.json` → instagram و سلامتِ روزانه', /instagram: \(function \(\) \{ try \{ return igStatus_\(\);/.test(h) && /try \{ igHealth_\(problems, notes\); \}/.test(h));
  ok('۷.۳ کلیدِ `instagram` در وارسی‌های اجباریِ ناظر', CFG.MONITOR_CHECKS.some(x => x.key === 'instagram'));
  const dir = 'docs/prompts';
  const last = fs.readdirSync(dir).filter(f => /^_PROMPT-monitor-v\d+\.md$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0])).pop();
  const mon = fs.readFileSync(dir + '/' + last, 'utf8');
  ok('۷.۴ دستورِ ناظر کلید و کارِ هر روزش را دارد', /\| `instagram` \|/.test(mon) && /کلیدِ `instagram` در `checks`/.test(mon) && /docs\/ig-approve\.json/.test(mon), last);
  ok('۷.۵ فایلِ تأیید هست و فهرستی خالی دارد', Array.isArray(JSON.parse(fs.readFileSync('docs/ig-approve.json', 'utf8')).approved));
  ok('۷.۶ نقشهٔ OUTPUT زیرپوشهٔ «اینستاگرام» را می‌شناسد', /زیرپوشهٔ «اینستاگرام»/.test(fs.readFileSync('docs/drive_layout.md', 'utf8')));
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۷.۷ رانر همان کلید و همان امضا را می‌نویسد که موتور می‌خوانَد', /map\.reels\[/.test(rj) && /sig: /.test(rj));
}

console.log('=== ۹) مرورِ بزرگ، سقفِ سه دقیقه، کپشنِ دو سکو، ترتیبِ انتشار، توضیحِ پلی‌لیست (۹.۳۰) ===');
{
  const ser = global.__ROOT_FOLDER.createFolder('مجموعهٔ مرور');
  for (let e = 1; e <= 3; e++) ser.createFolder('قسمت ' + String(e).padStart(4, '0') + ' — درس');
  const rf = ser.createFolder('قسمت 0004 — مرورِ بزرگ');
  rf.createFile(Utilities.newBlob(JSON.stringify({ seriesName: 'مصباح', recap: true, recapLessonFrom: 1, recapLessonTo: 3,
    ep: { title: 'مرورِ بزرگ', sections: [{ heading: 'درسِ ۱', narration: 'الف.' }, { heading: 'درسِ ۲', narration: 'ب.' }, { heading: 'درسِ ۳', narration: 'ج.' }] } }),
    'application/json', '_special.json'));
  const itR = { key: 'ig:special:4', ep: 4, series: 'مصباح', folderId: rf.getId(), yt: 'https://youtu.be/r4', phase: 'plan', recap: 1 };
  const long = Array.from({ length: 18 }, (_, i) => 'گامِ ' + (i + 1) + ' از همین مسیر ما را به گامِ بعدی می‌رساند و یک نکتهٔ تازه می‌دهد.').join(' ');
  const RAWR = { idea: 'مسیرِ سه درس', script: 'چطور از پرسشِ ساده به یک نظریه رسیدیم؟ ' + long, scenes: Array.from({ length: 9 }, (_, i) => 'r' + i),
                 coverTitle: 'سه درس در یک مسیر', caption: 'سطرِ اول', story: 's', tags: ['مرور'], emph: [], ytDesc: 'این مرور سه درس را به ترتیب می‌پیماید.' };
  const asks = [];
  const keepStub = global.__STUB;
  global.__STUB = (url, body) => {
    if (/generateContent/.test(url) && !/tts/.test(url)) {
      const txt = JSON.stringify(body), isJ = txt.indexOf('داورِ سخت‌گیر') !== -1;
      asks.push(isJ ? 'J:' + (/مسیرِ پیوسته/.test(txt) ? 'R' : 'L') : 'W:' + (/مرورِ بزرگ/.test(txt) && /خلاصهٔ خلاصه نیست/.test(txt) ? 'R' : 'L'));
      const out = isJ ? { oneIdea: 'بله', flows: 'بله', answersHook: 'بله', faithful: 'بله', popular: 'بله', thirst: 'بله', weak: '', fix: '' } : RAWR;
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] } };
    }
    return keepStub ? keepStub(url, body) : { code: 404, json: {} };
  };
  const foR = igFolder_(rf);
  const rr = igStepPlan_(itR, foR);
  global.__STUB = keepStub;
  ok('۹.۱ مرورِ بزرگ: پرامپت و داورِ «مسیر»، متنِ بلند (تا ۴۰۰ واژه) پذیرفته، بازهٔ درس‌ها از پرونده، ۹ تصویر',
     rr.ok && asks.join(',') === 'W:R,J:R' && rr.plan.recap === true && /درس‌های ۱ تا ۳/.test(rr.plan.range) && rr.plan.plan.words > 210 &&
     Math.min(CFG.IG_RECAP_IMG_N, rr.plan.plan.lines.length - 1) === 9, JSON.stringify([asks, rr.fail || rr.plan.range, rr.plan && rr.plan.plan.words]));
  ok('۹.۲ برچسبِ درس از پوشه: «مرورِ بزرگِ درس‌های ۱ تا ۳» در کپشن', /مرورِ بزرگِ درس‌های ۱ تا ۳/.test(rr.plan.caption), rr.plan.caption.slice(0, 200));
  /* سقفِ سه دقیقه: صدای ۲۰۰ ثانیه ⇒ از نو با واژهٔ کمتر. */
  const sr = CFG.SAMPLE_RATE || 24000, keepT = global.ttsChunk_, keepV = global.vowelizeText_;
  global.vowelizeText_ = (x) => x;
  let nCall = 0;
  global.ttsChunk_ = () => Utilities.base64Encode(new Array(sr * 2 * (++nCall === 1 ? 200 : 2)).fill(0));
  const rv = igStepVoice_(itR, foR, rr.plan, Date.now() + 60000);
  global.ttsChunk_ = keepT; global.vowelizeText_ = keepV;
  ok('۹.۳ صدا بیش از ' + CFG.IG_MAX_SEC + ' ثانیه ⇒ شکست با «از نو»، و سقفِ واژهٔ تازه به همان نسبت', !!rv.fail && itR.maxWords > 0 &&
     itR.maxWords < rr.plan.plan.words && igWords_({ recap: true, maxWords: itR.maxWords }).max === itR.maxWords, rv.fail + ' / ' + itR.maxWords);
  /* کپشنِ شورتز: عنوان ≤۱۰۰ با مجموعه و درس، توضیحِ ویژهٔ یوتیوب و سه پیوند. */
  const sm = igShortMeta_({ plan: { coverTitle: 'عقلِ ما درست می‌فهمد؟', ytDesc: 'متنِ ویژهٔ یوتیوب.', caption: 'کپشنِ اینستا', tags: ['معرفت_شناسی', 'فلسفه'] },
                           series: 'معرفت شناسی مجتبی مصباح', lesson: 1, yt: 'https://youtu.be/v1' }, 'https://www.youtube.com/playlist?list=PL1');
  ok('۹.۴ شورتز: عنوانِ ≤۱۰۰ با مجموعه و «درسِ ۱» و #Shorts؛ توضیحِ ویژهٔ یوتیوب (نه کپشنِ اینستا) + درسِ کامل + پلی‌لیست؛ ≤۱۵ برچسب',
     sm.title.length <= 100 && /معرفت شناسی مجتبی مصباح، درسِ ۱ #Shorts$/.test(sm.title) && /^متنِ ویژهٔ یوتیوب/.test(sm.desc) &&
     sm.desc.indexOf('https://youtu.be/v1') !== -1 && sm.desc.indexOf('list=PL1') !== -1 && sm.desc.indexOf('کپشنِ اینستا') === -1 &&
     (sm.desc.match(/#/g) || []).length <= 15, sm.title + ' ¶ ' + sm.desc.replace(/\n/g, ' ¶ '));
  /* انتشار به ترتیب: گامِ «pub» درسِ ۲ تا درسِ ۱ منتشر نشده صبر می‌کند. */
  const fP = igFolder_(ser.createFolder('قسمت 0002 — موقت'));
  igPlanWrite_(fP, { v: CFG.IG_PLAN_V, key: 'ig:special:2', phase: 'pub', plan: { lines: [] } });
  const itP = { key: 'ig:special:2', ep: 2, folderId: fP.getParents().next().getId(), phase: 'pub' };
  const keepPub = global.igStepPub_; let pubCalls = 0;
  global.igStepPub_ = () => { pubCalls++; return { wait: 'آزمون' }; };
  const stP = { done: '', order: { s: [{ n: 'مصباح', e: '1:1,2:2,3:3' }] } };
  const rp = igStep_(itP, stP, Date.now() + 60000);
  stP.done = '1';
  igStep_(itP, stP, Date.now() + 60000);
  global.igStepPub_ = keepPub;
  ok('۹.۵ گامِ انتشارِ درسِ ۲ پیش از درسِ ۱ ⇒ صبر با نامِ درسِ قبلی؛ پس از آن ⇒ انتشار', /منتظرِ انتشارِ درسِ 1/.test(rp.wait || '') && pubCalls === 1, JSON.stringify(rp));
  /* برنامهٔ نسخهٔ ۳ (تأییدشده) با IG_PLAN_V=۴ از نو ساخته نمی‌شود. */
  const keepPl = global.igStepPlan_; let rep = 0;
  global.igStepPlan_ = () => { rep++; return { wait: 'x' }; };
  igPlanWrite_(fP, { v: 3, key: 'ig:special:2', phase: 'ok', plan: { lines: [] } });
  igStep_(Object.assign({}, itP, { phase: 'ok' }), { stats: { published: 5 } }, Date.now() + 60000);
  global.igStepPlan_ = keepPl;
  ok('۹.۶ ریلزِ تأییدشده با نسخهٔ ۳ دوباره ساخته نمی‌شود (IG_PLAN_MIN)', rep === 0 && CFG.IG_PLAN_V > CFG.IG_PLAN_MIN);
  /* توضیحِ زندهٔ پلی‌لیست. */
  const lessons = [{ ep: 1, lesson: 1 }, { ep: 3, lesson: 2 }, { ep: 5, recap: true, lesson: 0 }, { ep: 7, lesson: 3 }];
  const pubL = { 'special:1': { videoId: 'a', privacy: 'public', title: 'قسمت ۱ — معرفت چیست؟ | مصباح - درس ۱' },
                 'special:3': { videoId: 'b', privacy: 'public', title: 'قسمت ۳ — ابزارِ شناخت | مصباح - درس ۲' },
                 'special:5': { videoId: 'c', privacy: 'public', title: 'قسمت ۵ — مرورِ بزرگِ درس‌های ۱ تا ۲' },
                 'special:7': { videoId: '', privacy: '', title: '' } };
  const dt = ytPlDescText_('مصباح', lessons, pubL, '۱۴۰۵/۰۷/۲۵');
  ok('۹.۷ توضیحِ پلی‌لیست: شمار، تازه‌ترین، و فهرستِ به‌ترتیب با عنوانِ تمیز؛ منتشرنشده بیرون', dt.n === 2 && dt.recaps === 1 &&
     /تا امروز: ۲ درس و ۱ مرورِ بزرگ · به‌روزشده: ۱۴۰۵\/۰۷\/۲۵/.test(dt.text) && /درسِ ۱ — معرفت چیست؟\nدرسِ ۲ — ابزارِ شناخت\nمرورِ بزرگ — مرورِ بزرگِ درس‌های ۱ تا ۲/.test(dt.text) &&
     !/درسِ ۳/.test(dt.text) && !/\|/.test(dt.text), dt.text.replace(/\n/g, ' ¶ '));
  const many = Array.from({ length: 200 }, (_, i) => ({ ep: i + 1, lesson: i + 1 })), pubM = {};
  many.forEach(x => { pubM['special:' + x.ep] = { videoId: 'v' + x.ep, privacy: 'public', title: 'عنوانی نسبتاً بلند برای درسِ شمارهٔ ' + x.ep + ' که فهرست را پر می‌کند' }; });
  const dm = ytPlDescText_('بلند', many, pubM, '');
  ok('۹.۸ فهرستِ بلند ≤ ۴۵۰۰ نویسه: سرش و تهش می‌ماند، وسطش «…»', dm.text.length <= 4500 && /درسِ ۱ —/.test(dm.text) && /درسِ ۲۰۰ —/.test(dm.text) && /\n…\n/.test(dm.text),
     String(dm.text.length));
  props_().setProperty(PK.YT_SUMMARY, JSON.stringify({ series: [{ name: 'مصباح', n: 12, recaps: 0 }, { name: 'آئودی', n: 48, recaps: 3 }], variety: { n: 74 } }));
  const cd = ytChannelDesc_();
  ok('۹.۹ توضیحِ کانال آنچه هست را می‌گوید (≤۹۹۰)', cd.length <= 990 && /مصباح: ۱۲ درس/.test(cd) && /آئودی: ۴۸ درس و ۳ مرور/.test(cd) && /۷۴ قسمت/.test(cd), cd.replace(/\n/g, ' ¶ '));
}

console.log('=== ۱۰) «۶ تا بذار و جداش کن» — صفِ جدای شورتز و سهمیهٔ قسمت‌های کامل (۹.۳۲) ===');
{
  ok('۱۰.۰ روزی ۶ ریلز', CFG.IG_PER_DAY === 6);
  const kq = props_().getProperty(PK.YT_QUOTA);
  const setQ = (u, up, sh) => props_().setProperty(PK.YT_QUOTA, JSON.stringify({ day: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'), units: u, uploads: up, shorts: sh, blocked: '' }));
  setQ(3564, 1, 0); const a1 = igShortQuotaOk_();
  setQ(6000, 1, 0); const a2 = igShortQuotaOk_();
  setQ(7200, 2, 0); const a3 = igShortQuotaOk_();
  setQ(7200, 2, 1); const a4 = igShortQuotaOk_();
  ok('۱۰.۱ شورتز جای قسمتِ کاملِ امروز را نمی‌گیرد: ۱ کامل رفته و ۶۰۰۰ مصرف ⇒ نه؛ هر دو کامل رفته ⇒ بله؛ شورتز کامل شمرده نمی‌شود',
     a1 && !a2 && a3 && !a4, JSON.stringify([a1, a2, a3, a4]));
  /* yts منتظرِ سهمیه ⇒ ریلز «انجام»، شورتز به صف؛ درسِ بعد پشتِ صف و بی تلاشِ آپلود. */
  const ser = global.__ROOT_FOLDER.createFolder('مجموعهٔ صف');
  const mk = (n) => { const ef = ser.createFolder('قسمت ' + n); const f = igFolder_(ef);
    igPlanWrite_(f, Object.assign(JSON.parse(JSON.stringify(plan)), { v: 4, phase: 'yts', reelId: 'R' + n, shortId: '', short: 'https://x/s' + n + '.mp4' }));
    return { f, it: { key: 'ig:special:' + n, ep: n, folderId: ef.getId(), phase: 'yts' } }; };
  const A = mk(11), B = mk(12);
  const keep = { sp: global.igShortPub_, lg: global.igLog_ };
  let tries = [], quotaOk = false;
  global.igShortPub_ = (x, pl) => { tries.push(x.ep); if (!quotaOk) return { wait: 'سهمیه' }; pl.shortId = 'S' + x.ep; return { ok: true }; };
  global.igLog_ = () => {};
  const st = { shortQ: [] };
  const rA = igStep_(A.it, st, Date.now() + 60000);
  const rB = igStep_(B.it, st, Date.now() + 60000);
  ok('۱۰.۲ شورتزِ منتظرِ سهمیه ریلز را نگه نمی‌دارد: هر دو «انجام»، صف ۱۱ سپس ۱۲، و درسِ ۱۲ بی تلاشِ آپلود پشتِ صف',
     rA.done && rB.done && st.shortQ.map(x => x.ep).join(',') === '11,12' && tries.join(',') === '11' &&
     igPlanRead_(A.f).phase === 'done' && !!igPlanRead_(B.f).shortQueued, JSON.stringify({ q: st.shortQ, tries }));
  tries = [];
  igShortQueueRun_(st, Date.now() + 60000);
  ok('۱۰.۳ صف با سهمیهٔ بسته فقط سرش را می‌پرسد و می‌ایستد', tries.join(',') === '11' && st.shortQ.length === 2 && /سهمیه/.test(st.shortWhy));
  quotaOk = true; tries = [];
  const n = igShortQueueRun_(st, Date.now() + 60000);
  ok('۱۰.۴ سهمیه که باز شد، به ترتیب: ۱۱ بعد ۱۲؛ شناسه در _ig.json هر درس، صف خالی', n === 2 && tries.join(',') === '11,12' &&
     st.shortQ.length === 0 && igPlanRead_(A.f).shortId === 'S11' && igPlanRead_(B.f).shortId === 'S12' && !st.shortWhy);
  Object.assign(global, { igShortPub_: keep.sp, igLog_: keep.lg });
  /* صف در کلیدِ جدا: IG_STATE سقفِ ۹ کیلوبایت دارد. */
  const big = { done: '1', shortQ: Array.from({ length: 60 }, (_, i) => ({ key: 'ig:special:' + i, ep: i, folderId: 'F'.repeat(33) })) };
  igStateSave_(big);
  const raw = JSON.parse(global.__PROPS[PK.IG_STATE]);
  ok('۱۰.۵ صفِ شورتز در کلیدِ جدای خودش، نه در IG_STATE؛ و برمی‌گردد', !('shortQ' in raw) && igState_().shortQ.length === 60 && igState_().done === '1');
  igStateSave_({});
  setQ(100, 0, 0);
  ok('۱۰.۶ igTick صف را می‌دواند و خطِ روزانه آن را می‌گوید', /igShortQueueRun_\(st, deadline\)/.test(String(igTick)) && /شورتزِ در صف/.test(String(igStatus_)));
  if (kq == null) props_().deleteProperty(PK.YT_QUOTA); else props_().setProperty(PK.YT_QUOTA, kq);
}

console.log('=== ۱۱) نشانیِ دفتر در تب‌های کهنهٔ هاب (۹.۳۴) ===');
{
  const hubX = getHub_();
  const old1 = hubX.getSheetByName(CFG.IG_STATS_TAB) || hubX.insertSheet(CFG.IG_STATS_TAB);
  const st = {};
  const did = igHubPointer_(st);
  const v = String(old1.getRange(2, 1).getValue());
  ok('۱۱.۱ تبِ کهنهٔ هاب نشانیِ دفترِ جدا را می‌گیرد، یک بار', did && v.indexOf(igBookUrl_()) !== -1 && !!igBookUrl_() && !!st.hubPtr &&
     igHubPointer_(st) === false, v);
  const st2 = {}; const kG = global.getHub_;
  global.getHub_ = () => { throw new Error('Service Spreadsheets timed out'); };
  let thrown = false; try { igHubPointer_(st2); } catch (e) { thrown = true; } finally { global.getHub_ = kG; }
  ok('۱۱.۲ هاب خطا داد ⇒ پرچم نمی‌خورد تا دورِ بعد دوباره', thrown && !st2.hubPtr);
  ok('۱۱.۳ igTick صدایش می‌زند', /igHubPointer_\(st\)/.test(String(igTick)));
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ اینستاگرام گذشت.');
