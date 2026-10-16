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

console.log('=== ۱) کدام درس بعدی است ===');
{
  const pub = {
    'special:7': { videoId: 'v7', url: 'https://youtu.be/v7', privacy: 'public', series: 'معرفت‌شناسی' },
    'special:3': { videoId: 'v3', url: 'https://youtu.be/v3', privacy: 'unlisted', series: 'معرفت‌شناسی' },
    'special:5': { videoId: 'v5', url: 'https://youtu.be/v5', privacy: 'public', series: 'معرفت‌شناسی' },
    'special:2': { videoId: '', privacy: '', series: 'معرفت‌شناسی' },
    'variety:1': { videoId: 'x1', url: 'u', privacy: 'public' }
  };
  const n0 = igNextEp_(pub, {});
  ok('۱.۱ کوچک‌ترین درس‌نامهٔ **عمومی** — نه unlisted، نه بی‌ویدئو، نه «از همه جا»', n0 && n0.ep === 5 && n0.url === 'https://youtu.be/v5', JSON.stringify(n0));
  ok('۱.۲ انجام‌شده و در جریان رد می‌شوند', igNextEp_(pub, { done: '5' }).ep === 7 &&
     igNextEp_(pub, { inflight: [{ ep: 5 }] }).ep === 7 && igNextEp_(pub, { done: '5,7' }) === null);
  ok('۱.۳ درسی که به سقفِ تلاش رسید کنار می‌رود', igNextEp_(pub, { fails: { '5': CFG.IG_TRY_MAX } }).ep === 7);
}

console.log('=== ۲) متنِ ریلز: مرزها در کد ===');
const LINES = [
  { text: 'آیا می‌دانستید معرفت‌شناسی با یک پرسشِ ساده آغاز می‌شود که همه هر روز از خود می‌پرسیم؟', scene: 's1' },
  { text: 'در این قسمت از پادکست امروز می‌شنویم که دانستن چیست.', scene: 's2' },
  { text: 'پرسش این است که از کجا می‌دانم آنچه باور دارم درست است و فقط گمانی محکم نیست؟', scene: 's3' },
  { text: 'فیلسوفان سه شرط گذاشتند: باور، صدق، و دلیلی که آن باور را موجه کند و پشتش بایستد.', scene: 's4' },
  { text: 'اما مثال‌هایی پیدا شد که هر سه شرط بود و باز کسی نمی‌گفت این آدم واقعاً می‌دانست.', scene: 's5' },
  { text: 'همین گره، راهِ تازه‌ای در فهمِ شناخت باز کرد که تا امروز ادامه دارد و هنوز بسته نشده است.', scene: 's6' },
  { text: 'نسخهٔ کاملِ درس را در یوتیوب ببینید.', scene: 's7' }
];
{
  const p = igPlanTrim_({ hook: 'آیا می‌دانستید؟', coverTitle: 'از کجا می‌دانم؟', caption: 'کپشن', story: 'استوری',
                          tags: ['#معرفت شناسی', 'فلسفه', ''], lines: LINES.slice(0, 6) });
  ok('۲.۱ جملهٔ «در این قسمت / پادکست / امروز» دور ریخته می‌شود', p.lines && p.lines.length === 5 &&
     p.lines.every(x => !/پادکست|این قسمت/.test(x.text)), JSON.stringify(p.lines && p.lines.map(x => x.text.slice(0, 12))));
  ok('۲.۲ برچسب بی # و بی فاصله', p.tags.join('|') === 'معرفت_شناسی|فلسفه', p.tags.join('|'));
  ok('۲.۳ کمتر از چهار جمله پذیرفته نمی‌شود', !igPlanTrim_({ lines: LINES.slice(0, 3) }).lines);
  const tooYear = igPlanTrim_({ lines: LINES.slice(0, 6).map(x => ({ text: x.text + ' در سال ۱۴۰۵', scene: '' })) });
  ok('۲.۴ تاریخ (۱۴۰۵) هم بیرون می‌رود', !tooYear.lines, tooYear.why);
  const cap = igCaption_(p, 'https://youtu.be/v5', 'معرفت‌شناسی', 4);
  ok('۲.۵ کپشن: پیوندِ همان ویدئو، نامِ مجموعه و درس، برچسبِ پایه و درس بی تکرار', cap.indexOf('https://youtu.be/v5') !== -1 &&
     cap.indexOf('«معرفت‌شناسی» — درسِ 4') !== -1 && /#درسنامه/.test(cap) && /#فلسفه/.test(cap) &&
     cap.split('#فلسفه').length === 2 && cap.length <= 2200, cap.replace(/\n/g, ' ¶ '));
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
  global.__STUB = (url, body) => {
    if (/generateContent/.test(url) && !/tts/.test(url)) {
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        hook: 'آیا می‌دانستید؟', coverTitle: 'از کجا می‌دانم؟', caption: 'دانستن یعنی چه؟', story: 'یک پرسش',
        tags: ['فلسفه'], lines: LINES }) }] } }] } };
    }
    return { code: 404, json: {} };
  };
  fo = igFolder_(epFo);
  const r = igStepPlan_(it, fo);
  plan = r.plan;
  ok('۳.۱ برنامه ساخته شد و جملهٔ پایانیِ یوتیوب را **کد** افزود (دعوتِ خودِ مدل دور ریخته شد)', r.ok && plan.plan.lines[plan.plan.lines.length - 1].text === IG_CTA_LINE &&
     plan.plan.lines[plan.plan.lines.length - 1].cta === true &&
     plan.plan.lines.filter(x => /یوتیوب/.test(x.text)).length === 1, JSON.stringify(plan && plan.plan.lines.map(x => x.text.slice(0, 10))));
  ok('۳.۲ صدای گویندهٔ همان درس، و کپشن با پیوند', plan.voice === 'Charon' && plan.caption.indexOf('https://youtu.be/v5') !== -1);
  ok('۳.۳ `_ig.json` و متن در زیرپوشهٔ «اینستاگرام» — نه خودِ پوشهٔ قسمت',
     fo.getName() === 'اینستاگرام' && fo.getFilesByName('_ig.json').hasNext() && fo.getFilesByName('ریلز — متن و کپشن.txt').hasNext() &&
     !epFo.getFilesByName('_ig.json').hasNext() && igFolder_(epFo) === fo);

  /* صدا: هر جمله جدا؛ زمان از طولِ خودِ صدا. */
  const sr = CFG.SAMPLE_RATE || 24000;
  let calls = 0;
  const keepTts = global.ttsChunk_;
  global.ttsChunk_ = (t, st, v) => { calls++; return Utilities.base64Encode(new Array(sr * 2).fill(0)); };   // یک ثانیه
  try { ok('۳.۴ صدا ساخته شد', igStepVoice_(it, fo, plan, Date.now() + 60000).ok); } finally { global.ttsChunk_ = keepTts; }
  ok('۳.۵ یک فراخوان برای هر جمله، و زمان‌ها از طولِ صدا (۱ ثانیه + مکث)', calls === plan.plan.lines.length &&
     plan.times.length === calls && Math.abs(plan.times[0].t0 - 0.15) < 0.02 && Math.abs(plan.times[0].t1 - 1.15) < 0.02 &&
     Math.abs(plan.times[1].t0 - 1.43) < 0.02, JSON.stringify(plan.times.slice(0, 2)));
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
  ok('۳.۱۱ صدا و تصویرها موقت به اشتراک رفتند', shared.indexOf(plan.audioId) !== -1 && plan.imgs.every(x => shared.indexOf(x.id) !== -1));
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
  ok('۴.۴ ریلز با ویدئو، کاور، کپشن و اشتراک در فید ساخته و منتشر شد', r.ok && plan.reelId === 'M1' && plan.phase === 'done' &&
     reel.body.video_url === plan.video && reel.body.cover_url === plan.cover && reel.body.caption === plan.caption &&
     reel.body.share_to_feed === 'true' && plan.permalink === 'https://instagram.com/reel/xyz', JSON.stringify(calls.map(c => c.url.split('/').slice(-2).join('/'))));
  ok('۴.۵ استوریِ همان کاور', plan.storyId === 'M2' &&
     calls.some(c => c.body.media_type === 'STORIES' && c.body.image_url === plan.cover));
  ok('۴.۶-ب کپشنِ فرستاده بی ایموجی، حتی اگر برنامهٔ قدیمی داشت (۹.۲۴)', !/[\uD800-\uDFFF]/.test(reel.body.caption) &&
     igCapClean_('🎧 نسخهٔ کامل\n📚 مجموعه') === 'نسخهٔ کامل\nمجموعه' && !/[\uD800-\uDFFF]/.test(igCaption_({ caption: 'x', tags: [] }, 'u', 's', 1)),
     JSON.stringify(igCapClean_('🎧 نسخهٔ کامل\n📚 مجموعه')));
  ok('۴.۶ کلید فقط در سرآیند — هرگز در نشانی', calls.every(c => c.auth === 'Bearer EAAtesttoken123' && c.url.indexOf('EAAtest') === -1));
  ok('۴.۷ شمارِ امروز و کل، و یک ردیف در تب', st2.stats.published === 4 && st2.stats.dayN === 1 && logged === 1);
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
  ok('۴.۹ شکستِ استوری ریلزِ منتشرشده را «نشد» نمی‌کند — علتش ثبت می‌شود', r.ok && p3.phase === 'done' && p3.storyWhy === 'story bad', p3.storyWhy);
  global.__STUB = (url, body) => (/\/1784\/media$/.test(url) ? { code: 400, json: { error: { message: 'bad video' } } } : { code: 200, json: {} });
  const p4 = JSON.parse(JSON.stringify(plan)); p4.reelCid = ''; p4.reelId = ''; p4.phase = 'pub';
  const r4 = igStepPub_(it, p4, { stats: { published: 5 } }, Date.now() + 60000);
  ok('۴.۱۰ ظرفِ ریلز ساخته نشد ⇒ «نشد» با پیامِ خودِ Graph', r4.fail && /bad video/.test(r4.fail), r4.fail);
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
  const tab = n => hub.getSheetByName(n);
  const S = tab(CFG.IG_STATS_TAB), C = tab(CFG.IG_COMMENTS_TAB), P = tab(CFG.IG_MSGS_TAB);
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

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ اینستاگرام گذشت.');
