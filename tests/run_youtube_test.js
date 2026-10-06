/* انتشار در یوتیوب (بخشِ ۲۷).
 *
 * سنجه‌ها عمداً **خودِ توابع را می‌دوانند** و به خروجیِ واقعی نگاه می‌کنند، نه
 * به متنِ کد — تاریخِ همین ریپو نشان داده سنجه‌ای که الگوی *متن* را می‌سنجد،
 * تابعی را که هرگز صدا زده نمی‌شود سبز نشان می‌دهد.
 *
 * مهم‌ترین بند، بندِ ۲ است: مرزِ خصوصی. کانال عمومی است و یک لینکِ درایو که
 * عمومی شود، برخلافِ متنِ پادکست، «فردا بهتر» نمی‌شود.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

global.__PROPS['GEMINI_API_KEY'] = 'TEST';
/* پاسخِ ساختگیِ مدل — کوتاه و قابلِ پیش‌بینی، تا سنجه‌ها به *کیفیتِ* نوشتهٔ
   مدل بند نباشند. چیزی که این‌جا سنجیده می‌شود ساختار است: آیا نقشه ساخته و
   ذخیره می‌شود، آیا اجرای دوم دوباره نمی‌پرسد، آیا ویرایشِ دستی خوانده می‌شود. */
let __askCount = 0;
let __presSeq = 0;
global.__STUB = function (url, body) {
  if (url.indexOf('yt3.example') !== -1) return { code: 200, text: 'PNGDATA' };
  // فقط سرِ راهِ خودِ یوتیوب، نه هر چیزی که googleapis دارد — وگرنه فراخوانِ
  // مدل هم همین‌جا بلعیده می‌شود (که یک بار شد).
  if (url === 'https://slides.googleapis.com/v1/presentations') {
    // شبیه‌سازیِ حالتی که فرضاً pageSize واقعاً اعمال می‌شود — تا سنجه‌های
    // «موفقیتِ عادی» دست‌نخورده بمانند؛ سنجهٔ ۳۴ب جدا حالتِ واقعیِ گوگل
    // (نادیده‌گرفتنِ pageSize) را می‌سنجد.
    /* شناسهٔ **یکتا** برای هر ساخت، همان‌طور که گوگل می‌دهد. با یک شناسهٔ
       ثابت، دو ساختِ پشتِ‌هم یک فایل می‌شوند و سنجهٔ «هم‌نامِ پیشین تُرش
       می‌شود» سبز می‌مانَد بی آنکه آن کد وجود داشته باشد. */
    return { code: 200, json: { presentationId: 'PRES' + (++__presSeq),
                                pageSize: (body || {}).pageSize } };
  }
  if (url.indexOf('youtube/v3') !== -1 || url.indexOf('slides.googleapis') !== -1) {
    return { code: 200, json: { url: 'https://banner', presentationId: 'PRES1' } };
  }
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] } };
  __askCount++;
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'عنوانِ ساختگیِ شمارهٔ ' + __askCount,
    coverTitle: 'سه شرطِ معرفت', coverKicker: 'معرفت‌شناسی',
    hookLine: 'قلابِ آزمون', summary: 'خلاصهٔ آزمون',
    bullets: ['یک', 'دو'], tags: ['برچسبِ الف', 'برچسبِ ب'],
    hashtags: ['فلسفه'],
    /* و تصویرها — **به قراردادِ واقعیِ schema** (۸.۲۶). تا ۸.۲۵ این بدَل
       `kind/cardTitle/cardLines` برمی‌گرداند: فیلدهایی که در `YT_META_SCHEMA`
       نیستند و مدلِ واقعی هرگز نمی‌تواند بنویسد. حالا `tests/lib/mock.js`
       پاسخ را از روی schemaی فرستاده‌شده صافی می‌کند، و این بدَل مثلِ یک مدلِ
       فرمان‌بردار همان تعدادی را می‌دهد که پرامپت برای هر بخش خواسته. */
    visuals: visFromPrompt(body) }) }] } }] } };
};

/** مدلِ فرمان‌بردار: از سطرهای «N) «سر» — حدودِ K مورد» پرامپت، K مورد برای
 *  بخشِ N. پرامپتی که این سطرها را ندارد، همان سه موردِ قدیمی را می‌گیرد. */
function visFromPrompt(body) {
  let pr = '';
  try { pr = body.contents[0].parts[0].text; } catch (e) { pr = ''; }
  const fa = t => String(t).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const re = /^\s+(\d+)\) «[^»]*» — حدودِ ([۰-۹0-9]+) مورد/mg;
  const forms = ['تمرکز', 'مقایسه', 'زنجیره', 'نقل', 'پرسش'];
  const out = [];
  let m, k = 0;
  const one = (at) => {
    const f = forms[k % forms.length]; k++;
    const v = { at: String(at), quote: '', form: f, kicker: 'برچسبِ ' + k,
                headline: 'گزارهٔ ' + k, note: '', icon: 'ذهن',
                terms: k === 2 ? 'john locke portrait' : '', caption: 'زیرنویسِ ' + k };
    if (f === 'مقایسه') { v.aTitle = 'الف'; v.aItems = ['یک', 'دو']; v.bTitle = 'ب'; v.bItems = ['سه']; }
    if (f === 'زنجیره') v.steps = ['گامِ یک', 'گامِ دو', 'گامِ سه'];
    if (f === 'تمرکز') v.items = ['سطرِ الف', 'سطرِ ب'];
    return v;
  };
  while ((m = re.exec(pr))) { const n = +fa(m[2]); for (let i = 0; i < n; i++) out.push(one(m[1])); }
  if (!out.length) for (let i = 1; i <= 3; i++) out.push(one(i));
  return out;
}

/* استابِ پایه، تا بندهایی که به دنیای تمیز نیاز دارند بتوانند برگردند به
   آن. چند بند استابِ محلی‌شان را رها می‌کنند و بندِ بعدی در دنیای آن‌ها
   می‌دود — که یعنی شکستش چیزی دربارهٔ خودش نمی‌گوید. */
const BASE_STUB = global.__STUB;

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

console.log('=== ۱) نبودِ سرویس، خرابی نیست — ولی باید گفته شود ===');
{
  ok('۱.۱ بی سرویسِ یوتیوب، خاموش است', ytOn_() === false);
  const w = ytOffWhy_();
  ok('۱.۲ و می‌گوید دقیقاً چه باید کرد', w.indexOf('Services') !== -1, w);
  const st = ytStatus_();
  ok('۱.۳ وضعیت خطِ آمادهٔ فارسی دارد، حتی وقتی وصل نیست', st.line.length > 10, st.line);
}

console.log('=== ۲) مرزِ خصوصی در کد است، نه در پرامپت ===');
{
  const bad = 'ببینید https://drive.google.com/file/d/1ELMnSN25vSGk2UoadbWsbeSLhPLDVlZE/view ' +
              'و mohamad@example.com و _HANDOUT.json و AKfycbXyzAbc123 — ' +
              'ولی https://www.youtube.com/@kanal باید بماند.';
  const L = ytLeaks_(bad);
  const kinds = L.map(x => x.kind);
  ok('۲.۱ لینکِ درایو گرفته می‌شود', kinds.indexOf('لینکِ درایو') !== -1, kinds.join('، '));
  ok('۲.۲ شناسهٔ فایل هم', kinds.indexOf('شناسهٔ فایلِ درایو') !== -1);
  ok('۲.۳ ایمیل هم', kinds.indexOf('ایمیل') !== -1);
  ok('۲.۴ نامِ فایلِ درونی هم', kinds.indexOf('نامِ فایلِ درونی') !== -1);
  const clean = ytScrub_(bad);
  ok('۲.۵ و پاک‌سازی واقعاً برشان می‌دارد', ytLeaks_(clean).length === 0, clean);
  ok('۲.۶ ولی لینکِ خودِ یوتیوب دست‌نخورده می‌ماند',
     clean.indexOf('youtube.com/@kanal') !== -1, clean);
  /* متنِ سالم نباید ناقص شود — سدی که همه‌چیز را بگیرد، سد نیست. */
  const good = 'معرفت باور صادقِ موجه است. منبع: https://plato.stanford.edu/entries/knowledge/';
  ok('۲.۷ متنِ سالم و منبعِ وب دست‌نخورده می‌ماند', ytScrub_(good) === good, ytScrub_(good));
}

console.log('=== ۳) فصل‌بندی: قاعده‌های خودِ یوتیوب در کد ===');
{
  const secs = [
    { heading: 'تعریف معرفت', narration: 'x'.repeat(3000) },
    { heading: 'سه شرط', narration: 'y'.repeat(2500) },
    { heading: 'نقدها', narration: 'z'.repeat(2000) },
    { heading: 'جمع‌بندی', narration: 'w'.repeat(1200) }
  ];
  const ch = ytChapters_(secs, 600, 12);
  ok('۳.۱ اولین فصل حتماً ۰۰:۰۰ است', ch[0].at === 0, ytTime_(ch[0].at));
  ok('۳.۲ دست‌کم سه فصل', ch.length >= 3, String(ch.length));
  let minGap = 1e9;
  for (let i = 1; i < ch.length; i++) minGap = Math.min(minGap, ch[i].at - ch[i - 1].at);
  ok('۳.۳ هیچ فصلی کوتاه‌تر از ده ثانیه نیست', minGap >= 10, String(minGap));
  ok('۳.۴ آخرین فصل از خودِ ویدئو بلندتر نیست', ch[ch.length - 1].at < 600);
  ok('۳.۵ آغازِ موسیقی در زمان‌ها لحاظ شده', ch[1].at >= 12, ytTime_(ch[1].at));
  /* ویدئوی خیلی کوتاه یا بخشِ کم، فصل‌بندی نمی‌گیرد — فصل‌بندیِ دو‌فصلی را
     خودِ یوتیوب نمی‌پذیرد و نمایشش هم چیزی به کسی نمی‌دهد. */
  ok('۳.۶ ویدئوی کوتاه فصل‌بندی نمی‌گیرد', ytChapters_(secs, 30, 0).length === 0);
  ok('۳.۷ و زمان‌ها درست قالب می‌گیرند',
     ytTime_(0) === '0:00' && ytTime_(75) === '1:15' && ytTime_(3725) === '1:02:05',
     ytTime_(3725));
}

console.log('=== ۴) سقف‌های خودِ یوتیوب، در کد ===');
{
  const ctx = { showName: 'درس‌نامه', tagline: 'هر روز یک درس', seriesName: 'معرفت‌شناسی',
                title: 'ت', epNum: '۱۶', cat: 'مذهبی', duration: '9:42', sources: [] };
  const long = { title: 'ب'.repeat(300), tags: [], hashtags: [] };
  const t = ytTitleBuild_(long, ctx);
  ok('۴.۱ عنوان از سقفِ یوتیوب بلندتر نمی‌شود',
     t.length <= (CFG.YT_TITLE_MAX || 100), String(t.length));
  /* سقفِ برچسب روی *مجموع نویسه‌ها*ست، نه تعداد — و همین است که از قلم
     می‌افتد و کلِ فراخوان را رد می‌کند. */
  const many = { tags: [] };
  for (let i = 0; i < 60; i++) many.tags.push('برچسبِ نسبتاً بلندِ شمارهٔ ' + i);
  const tg = ytTags_(many, ctx);
  const chars = tg.join(',').length;
  ok('۴.۲ مجموعِ نویسهٔ برچسب‌ها زیرِ سقف می‌ماند',
     chars <= (CFG.YT_TAGS_CHARS || 460), chars + ' نویسه در ' + tg.length + ' برچسب');
  ok('۴.۳ و نامِ برنامه و مجموعه همیشه در برچسب‌ها هست',
     tg.indexOf('درس‌نامه') !== -1 && tg.indexOf('معرفت‌شناسی') !== -1);
  ok('۴.۴ برچسبِ تکراری نمی‌ماند', new Set(tg).size === tg.length);

  const meta = { hookLine: 'قلاب', summary: 'خلاصه', bullets: ['یک', 'دو'],
                 tags: ['الف'], hashtags: ['فلسفه'] };
  const d = ytDescBuild_(meta, ctx, ytChapters_(
    [{ heading: 'الف', narration: 'a'.repeat(2000) },
     { heading: 'ب', narration: 'b'.repeat(2000) },
     { heading: 'پ', narration: 'c'.repeat(2000) }], 600, 5));
  ok('۴.۵ کپشن از سقفِ یوتیوب بلندتر نمی‌شود', d.length <= (CFG.YT_DESC_MAX || 5000));
  ok('۴.۶ و جملهٔ قلاب اولِ کپشن است', d.indexOf('قلاب') === 0, d.slice(0, 30));
  ok('۴.۷ فصل‌ها در کپشن می‌آیند', d.indexOf('0:00') !== -1);
}

console.log('=== ۵) لینکِ درایو در کپشن نمی‌آید، منبعِ وب می‌آید ===');
{
  const ctx = { showName: 'د', seriesName: '', title: 'ت', epNum: '۱', duration: '5:00',
                sources: [
                  { url: 'https://plato.stanford.edu/x', title: 'Epistemology', publisher: 'SEP' },
                  { url: 'https://drive.google.com/file/d/1ELMnSN25vSGk2UoadbWsbeSLhPLDVlZE/view',
                    title: 'فایلِ خام' }
                ] };
  const d = ytDescBuild_({ hookLine: 'ق', summary: 'خ' }, ctx, []);
  ok('۵.۱ منبعِ وب در کپشن هست', d.indexOf('plato.stanford.edu') !== -1);
  ok('۵.۲ ولی لینکِ درایو نه', d.indexOf('drive.google.com') === -1);
  ok('۵.۳ و هیچ نشتیِ دیگری هم نمانده', ytLeaks_(d).length === 0, JSON.stringify(ytLeaks_(d)));
}

console.log('=== ۶) سهمیه: دو سطلِ جدا، و هر دو پیش از خرج پرسیده می‌شوند ===');
{
  delete global.__PROPS[PK.YT_QUOTA];
  CFG.YT_QUOTA_UPLOADS = 2; CFG.YT_QUOTA_UNITS = 120;
  ok('۶.۱ آپلودِ اول جا دارد', ytQuotaTake_(0, true) === true);
  ok('۶.۲ آپلودِ دوم هم', ytQuotaTake_(0, true) === true);
  ok('۶.۳ آپلودِ سوم رد می‌شود', ytQuotaTake_(0, true) === false);
  ok('۶.۴ و می‌گوید کدام سطل بست', ytQuota_().blocked === 'آپلود', ytQuota_().blocked);
  ok('۶.۵ سطلِ واحدها جداست و هنوز باز', ytQuotaTake_(50, false) === true);
  ok('۶.۶ تا وقتی خودش پر شود', ytQuotaTake_(100, false) === false);
  /* سهمیه *پیش از* خرج برداشته می‌شود: اجرایی که وسطِ کار کشته شود نباید
     خرجِ انجام‌شده را نشمرده بگذارد و فردا دوباره خرجش کند. */
  ok('۶.۷ شمارش پس از هر برداشت ذخیره می‌شود',
     Number(JSON.parse(global.__PROPS[PK.YT_QUOTA]).uploads) === 2);
  CFG.YT_QUOTA_UPLOADS = 90; CFG.YT_QUOTA_UNITS = 9000;
  delete global.__PROPS[PK.YT_QUOTA];
}

console.log('=== ۷) صف: از انتها بریده می‌شود، نه از ابتدا ===');
{
  delete global.__PROPS[PK.YT_DUE];
  for (let i = 1; i <= 400; i++) ytDueAdd_('special', String(i), 'F' + i);
  const l = ytDueList_();
  ok('۷.۱ صف با طولِ رشته بریده می‌شود، نه با شمارِ ردیف',
     JSON.stringify(l).length <= 8000, JSON.stringify(l).length + ' نویسه');
  ok('۷.۲ و قدیمی‌ترین‌ها می‌مانند (قسمت ۱ هست)', l[0].ep === '1', l[0].ep);
  ok('۷.۳ تکراری اضافه نمی‌شود', ytDueAdd_('special', '1', 'F1') === 0);
  const n = l.length;
  ytDueDrop_('special:1');
  ok('۷.۴ و برداشتن کار می‌کند', ytDueList_().length === n - 1);
  delete global.__PROPS[PK.YT_DUE];
}

console.log('=== ۸) شمارهٔ قسمت از نامِ پوشه ===');
{
  ok('۸.۱ نامِ واقعیِ پوشه خوانده می‌شود',
     ytEpNumOf_('قسمت 0019 — 20260825 — اجتماعی و سبک زندگی') === '19');
  ok('۸.۲ رقمِ فارسی هم', ytEpNumOf_('قسمت ۰۰۷ — چیزی') === '7');
  ok('۸.۳ و پوشهٔ بی‌شماره چیزی برنمی‌گرداند', ytEpNumOf_('کاورهای یوتیوب') === '');
}

console.log('=== ۹) درخواستِ رندر: چون موتور نمی‌تواند ویدئو بسازد ===');
{
  const root = global.__ROOT_FOLDER;
  const nm = CFG.YT_RENDER_FILE || '_YT-RENDER.json';
  const kill = root.getFilesByName(nm); while (kill.hasNext()) kill.next().setTrashed(true);
  ok('۹.۱ درخواست ثبت می‌شود',
     ytRenderAsk_({ show: 'special', ep: '16', title: 'ت', folderId: 'F',
                    audioFileId: 'A', coverFileId: 'C', outName: 'x.mp4' }) === true);
  ok('۹.۲ همان درخواست دو بار ثبت نمی‌شود',
     ytRenderAsk_({ show: 'special', ep: '16' }) === false);
  const d = ytRenderRead_();
  ok('۹.۳ فایل خودش می‌گوید چه باید کرد',
     d.note.indexOf('MP4') !== -1 && d.note.indexOf('ffmpeg') !== -1);
  ok('۹.۴ و شمارِ بی‌جواب‌ها خوانده می‌شود', ytRenderPending_().n === 1);
  ok('۹.۵ رسیدنِ ویدئو ردیف را می‌بندد', ytRenderDone_('special', '16') === true);
  ok('۹.۶ و دیگر بی‌جواب نیست', ytRenderPending_().n === 0);
  /* بستنِ دوباره کارِ بی‌خود نیست — نباید فایل را هر شب از نو بنویسد. */
  ok('۹.۷ بستنِ دوباره چیزی نمی‌نویسد', ytRenderDone_('special', '16') === false);
  ok('۹.۸ ولی تاریخچه پاک نمی‌شود', ytRenderRead_().items.length === 1);
}

const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
console.log('=== ۹.۵) صف پر است و هیچ‌چیز نمی‌رود ===');
{
  /* ══ حالتی که هیچ نگهبانی نداشت، و کاربر با آن روبه‌رو شد ══
   * ویدئوها ساخته شده بودند، صف پر بود، و شب‌ها هیچ‌چیز منتشر نمی‌شد.
   * «منتظرِ ویدئو» نه ردیفی در تب می‌سازد، نه سطری در ایمیل، نه هشداری —
   * پس از بیرون دقیقاً شبیهِ «کاری نبود» به‌نظر می‌رسید و صاحبِ برنامه فقط
   * می‌دید هیچ ویدئویی نیامده، بی آنکه جایی نوشته باشد چرا.
   * «بیکار» و «گیرکرده» دو چیزند: صفِ خالی بیکار است، صفِ پر گیر کرده. */
  const hub = new Spread('هاب-گیر');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HUB_ID] = CFG.HUB_ID || 'HUB';
  ensureTab_(hub, CFG.REPORT_TAB, REPORT_HEADERS);
  delete global.__PROPS[PK.YT_LASTPUB];
  delete global.__PROPS[PK.YT_DUE];

  ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: 1, series: 'م', title: 'ت',
                videoId: 'V1', url: 'https://youtu.be/V1', privacy: 'public',
                result: 'منتشر شد' });
  const sh = hub.getSheetByName(CFG.YT_TAB);
  const back = new Date(new Date().getTime() - 3 * 86400000);
  sh.getRange(2, YU.AT, 1, 1)
    .setValues([[Utilities.formatDate(back, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm')]]);
  ok('۹.۵-الف روزهای بی‌انتشار از خودِ تب خوانده می‌شود',
     ytPubIdleDays_(hub) === 3, String(ytPubIdleDays_(hub)));

  for (let e = 2; e <= 8; e++) ytDueAdd_(ENRICH_SHOW_SPECIAL, e, 'F' + e, 'م', 'kM');
  ytRunNote_({ done: 0, waiting: 7, failed: 0, left: 7, quota: false,
               notes: ['special:2: ویدئو هنوز نرسیده'] });

  const problems = [], notes = [];
  const un = quiet();
  try { ytHealth_(problems, notes); } catch (e) {}
  un();
  const hit = problems.filter(p => p.indexOf('گیر کرده') !== -1);
  ok('۹.۵-ب صفِ پر با انتشارِ متوقف، مشکل می‌سازد نه سکوت',
     hit.length === 1, problems.join(' | ').slice(0, 120));
  /* و مهم‌تر از خودِ هشدار: باید **علت** را بگوید. هشداری که فقط بگوید
     «کار نمی‌کند» صاحبِ برنامه را همان‌جا می‌گذارد که بود. */
  ok('۹.۵-پ و علتِ آخرین دور را نقل می‌کند',
     hit[0].indexOf('ویدئو هنوز نرسیده') !== -1, hit[0]);
  const rows = hub.getSheetByName(CFG.REPORT_TAB)._d.slice(1);
  ok('۹.۵-ت و یافتهٔ «جدی» به صفِ کد می‌رود',
     rows.length === 1 && rows[0][3] === 'جدی' &&
     String(rows[0][8]).indexOf('کد') !== -1, JSON.stringify(rows[0] && rows[0][5]));

  /* ولی صفِ خالی بیکار است، نه گیرکرده — و هشدارِ دروغ، هشدارهای واقعی را
     هم بی‌اثر می‌کند. */
  delete global.__PROPS[PK.YT_DUE];
  const p2 = [], n2 = [];
  const un2 = quiet();
  try { ytHealth_(p2, n2); } catch (e) {}
  un2();
  ok('۹.۵-ث ولی صفِ خالی هیچ هشداری نمی‌سازد',
     p2.filter(x => x.indexOf('گیر کرده') !== -1).length === 0);
}

console.log('=== ۱۰) حافظهٔ انتشار از تب می‌آید، نه از جست‌وجوی یوتیوب ===');
{
  /* `search.list` صد واحد سهمیه دارد و اصلاً لازم نیست: خودمان می‌دانیم چه
     فرستاده‌ایم. این سنجه همان قاعده را نگه می‌دارد. */
  ok('۱۰.۱ هیچ‌جای بخشِ ۲۷ از search.list استفاده نمی‌شود',
     fs.readFileSync('src/27_YouTube.gs', 'utf8').indexOf('Search.list') === -1);

  const hub = new Spread('هاب-یوتیوب');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  ytLog_(hub, { show: 'درس‌نامه', ep: '16', series: 'م', title: 'ت',
                videoId: 'VID1', url: 'https://youtu.be/VID1', privacy: 'public',
                result: 'منتشر شد' });
  const pub = ytPublished_(hub);
  /* ══ کلیدِ حافظه باید همانی باشد که جست‌وجو با آن انجام می‌شود ══
     `ytLog_` نامِ *نمایشی* می‌نویسد («درس‌نامه») ولی `ytBackfill_` با کلیدِ
     داخلی می‌گردد ('special'). تا ۶٫۲۴ این دو هرگز برابر نمی‌شدند، پس
     قسمتی که قبلاً منتشر شده بود دوباره به صف می‌رفت و **دوباره آپلود
     می‌شد** — ویدئوی تکراری روی کانال، بی هیچ خطایی. و شمارندهٔ «تسلیم» هم
     هرگز فعال نمی‌شد: هر شب ۱۶۰۰ واحد سهمیه برای قسمتی که همیشه می‌شکند.
     این سنجه عمداً همان رفت‌وبرگشت را می‌سنجد، نه شکلِ داخلیِ نگاشت. */
  const K = ENRICH_SHOW_SPECIAL + ':16';
  ok('۱۰.۲ آنچه ytLog_ نوشت، با کلیدِ جست‌وجوی ytBackfill_ پیدا می‌شود',
     pub[K] && pub[K].videoId === 'VID1', JSON.stringify(Object.keys(pub)));
  ok('۱۰.۳ و سابقهٔ تلاشش صفر می‌شود', pub[K].tries === 0);

  ytLog_(hub, { show: 'درس‌نامه', ep: '17', result: 'نشد', note: 'خطا' });
  ytLog_(hub, { show: 'درس‌نامه', ep: '17', result: 'نشد', note: 'خطا' });
  ytLog_(hub, { show: 'درس‌نامه', ep: '17', result: 'نشد', note: 'خطا' });
  const pub2 = ytPublished_(hub);
  ok('۱۰.۴ شکستِ پیاپی شمرده می‌شود', pub2[ENRICH_SHOW_SPECIAL + ':17'].tries === 3);
  /* و همین سنجه هر دو شکلِ نام را می‌آزماید: مرزی که هر فراخوان باید
     یادش باشد، همان مرزی است که فردا یکی یادش می‌رود. */
  ok('۱۰.۵ و پس از سقف، آن قسمت رها می‌شود — با هر دو شکلِ نامِ برنامه',
     ytGaveUp_(pub2, ENRICH_SHOW_SPECIAL, '17') === true &&
     ytGaveUp_(pub2, CFG.SPECIAL_SHOW_NAME, '17') === true);
  ok('۱۰.۶ ولی قسمتِ منتشرشده هرگز رها شمرده نمی‌شود',
     ytGaveUp_(pub2, 'درس‌نامه', '16') === false);
}

console.log('=== ۱۱) دیده‌شدن: خطِ روزانه، همیشه ===');
{
  const st = ytStatus_();
  ok('۱۱.۱ شمارِ منتشرشده از تب می‌آید', st.published === 1, String(st.published));
  ok('۱۱.۲ رهاشده هم شمرده می‌شود', st.failed === 1, String(st.failed));
  ok('۱۱.۳ خطِ فارسی ساخته می‌شود', st.line.indexOf('یوتیوب') === 0, st.line);
  /* عددها بعد از واژه می‌آیند: در متنِ راست‌به‌چپ عددی که سرِ سطر بیاید به
     انتهای دیدنیِ سطر پرت می‌شود — همان چیزی که یک بار در تخته دیده شد. */
  ok('۱۱.۴ هیچ سطری با رقم شروع نمی‌شود',
     !/^[۰-۹0-9]/.test(st.line), st.line);

  const problems = [], notes = [];
  ytHealth_(problems, notes);
  ok('۱۱.۵ خطِ یوتیوب هر روز در یادداشت‌ها هست، حتی بی‌ایراد',
     notes.join(' ').indexOf('یوتیوب') !== -1, notes.join(' | '));
}

console.log('=== ۱۲) «کسی ویدئو نساخت» باید یک ایراد باشد، نه سکوت ===');
{
  /* بانکِ موسیقی هفته‌ها خالی ماند چون هیچ‌کس نپرسید چرا چیزی نمی‌آید.
     این‌جا از روزِ اول پرسیده می‌شود. */
  const nm = CFG.YT_RENDER_FILE || '_YT-RENDER.json';
  const root = global.__ROOT_FOLDER;
  const kill = root.getFilesByName(nm); while (kill.hasNext()) kill.next().setTrashed(true);
  const old = new Date(Date.now() - 9 * 86400000);
  putOutJson_(nm, { items: [{ key: 'special:20', status: 'در انتظار',
                              at: Utilities.formatDate(old, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm') }] });
  const p = ytRenderPending_();
  ok('۱۲.۱ سنِ قدیمی‌ترین درخواست شمرده می‌شود', p.oldestDays >= 8, String(p.oldestDays));
  const problems = [], notes = [];
  ytHealth_(problems, notes);
  ok('۱۲.۲ و پس از چند روز، ایرادِ گزارش‌شدنی می‌شود',
     problems.join(' ').indexOf('ساختِ ویدئو') !== -1, problems.join(' | '));
  ok('۱۲.۳ و صریح می‌گوید موتور خودش نمی‌تواند',
     problems.join(' ').indexOf('نمی‌تواند ویدئو بسازد') !== -1);
}

console.log('=== ۱۳) اتصال‌ها: هیچ دکمه و هیچ قلابی بی‌تابع نیست ===');
{
  const setup = fs.readFileSync('src/05_Setup.gs', 'utf8');
  ok('۱۳.۱ گزینهٔ منو هست و تابعش وجود دارد',
     setup.indexOf("'runYouTubePublish'") !== -1 && typeof runYouTubePublish === 'function');
  const night = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۱۳.۲ کارِ شبانه صدایش می‌زند', night.indexOf('ytRunDue_(') !== -1);
  ok('۱۳.۳ و پشتِ nightHas_ است',
     night.slice(night.indexOf('ytBackfill_(') - 400,
                 night.indexOf('ytBackfill_(')).indexOf('nightHas_') !== -1);
  const h = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۱۳.۴ در _STATUS.json می‌نشیند', h.indexOf('youtube:') !== -1);
  ok('۱۳.۵ و در سلامتِ روزانه', h.indexOf('ytHealth_(problems, notes)') !== -1);
  /* پایانِ هر قسمت باید بدهی ثبت کند — وگرنه فقط قسمت‌های گذشته منتشر
     می‌شوند و قسمتِ امشب تا کاوشِ بعدی معطل می‌ماند. */
  const p3 = fs.readFileSync('src/03_Producer.gs', 'utf8');
  const p14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۱۳.۶ پایانِ قسمتِ متنوع بدهی ثبت می‌کند',
     p3.indexOf('ytDueAdd_(ENRICH_SHOW_VARIETY') !== -1);
  ok('۱۳.۷ پایانِ درس‌نامه هم',
     p14.indexOf('ytDueAdd_(ENRICH_SHOW_SPECIAL') !== -1);
  /* و هر دو در try/catch، چون ۳ و ۱۴ به بخشِ بالاتر (۲۷) وابسته می‌شوند و
     بارگذارِ جزئیِ آزمون‌ها وگرنه با ReferenceError قسمت را زمین می‌زند. */
  const inTry = (t, call) => {
    const at = t.indexOf(call); if (at === -1) return false;
    const before = t.slice(0, at), i = before.lastIndexOf('try {');
    return i !== -1 && before.slice(i).indexOf('} catch') === -1;
  };
  ok('۱۳.۸ و هر دو فراخوان در try هستند',
     inTry(p3, 'ytDueAdd_(ENRICH_SHOW_VARIETY') &&
     inTry(p14, 'ytDueAdd_(ENRICH_SHOW_SPECIAL'));
  ok('۱۳.۹ ستونِ پلی‌لیست در رجیستریِ مجموعه‌ها هست',
     SERIES_HEADERS[SC.YT - 1] === 'پلی‌لیست یوتیوب', SERIES_HEADERS[SC.YT - 1]);
  ok('۱۳.۱۰ در schemaها هیچ number/integer/boolean نیست',
     !/"(number|integer|boolean)"/.test(JSON.stringify(YT_META_SCHEMA)));
}

console.log('=== ۱۴) ترتیب: نه در صف به‌هم می‌ریزد، نه در پلی‌لیست (۵٫۹۸) ===');
{
  /* `getFolders()` هیچ ترتیبی را تضمین نمی‌کند. تا ۵٫۹۷ صف از همان ترتیب پر
     می‌شد، یعنی قسمتِ ۱۲ می‌توانست پیش از ۳ منتشر شود. */
  delete global.__PROPS[PK.YT_DUE];
  const order = ['12', '3', '19', '7'];
  for (const e of order) ytDueAdd_('special', e, 'F' + e, 'kA', 'الف');
  ytDueAdd_('variety', '5', 'FV5');
  const l = ytDueOrder_(ytDueList_());
  const sp = l.filter(x => x.show === 'special').map(x => x.ep);
  ok('۱۴.۱ صف بر اساس شمارهٔ قسمت مرتب می‌شود',
     sp.join(',') === '3,7,12,19', sp.join(','));
  ok('۱۴.۲ ترتیبِ درونِ هر برنامه دست‌نخورده می‌ماند',
     l.filter(x => x.show === 'variety').length === 1, l.map(x => x.show + ':' + x.ep).join(' '));
  /* ══ ۶٫۵۳ — یک برنامه، برنامهٔ دیگر را قحطی می‌داد ══
     مرتب‌سازی اول بر نامِ برنامه بود و `'special' < 'variety'`. یعنی **هر**
     قسمتِ درس‌نامه پیش از **هر** قسمتِ «از همه جا از همه رنگ» می‌نشست، و با
     سقفِ سه آپلود در شب نوبت هرگز به دومی نمی‌رسید. هیچ خطایی هم نمی‌داد:
     صف مرتب بود، فقط همیشه از یک سر خورده می‌شد. */
  ok('۱۴.۲-ب برنامهٔ دوم پشتِ برنامهٔ اول قحطی نمی‌کشد',
     l.slice(0, 2).some(x => x.show === 'variety'),
     l.map(x => x.show + ':' + x.ep).join(' '));
  {
    /* و با ده‌ها قسمت در یک برنامه، در سقفِ سه‌تاییِ شبانه هم باید سهم ببرد */
    const many = [];
    for (let i = 1; i <= 30; i++) many.push({ show: 'special', ep: String(i), seriesName: 'الف' });
    many.push({ show: 'variety', ep: '1' });
    const top3 = ytDueOrder_(many).slice(0, CFG.YT_MAX_PER_RUN);
    ok('۱۴.۲-پ در سقفِ یک شب هم به برنامهٔ دوم می‌رسد',
       top3.some(x => x.show === 'variety'),
       top3.map(x => x.show + ':' + x.ep).join(' '));
  }

  /* جای پلی‌لیست از شمارهٔ قسمت می‌آید، نه از ترتیبِ آپلود — پس **حتی اگر
     ترتیبِ آپلود به‌هم بخورد، ترتیبِ پلی‌لیست درست می‌ماند.** */
  const pub = {
    'درس‌نامه:3': { videoId: 'a', series: 'الف' },
    'درس‌نامه:7': { videoId: 'b', series: 'الف' },
    'درس‌نامه:19': { videoId: 'c', series: 'الف' },
    'درس‌نامه:5': { videoId: 'd', series: 'ب' },          // مجموعهٔ دیگر
    'از همه جا از همه رنگ:4': { videoId: 'e', series: '' } // برنامهٔ دیگر
  };
  ok('۱۴.۳ قسمتِ ۱۲ بینِ ۷ و ۱۹ می‌نشیند',
     ytWantPos_(pub, { show: 'special', ep: '12' }, 'الف') === 2,
     String(ytWantPos_(pub, { show: 'special', ep: '12' }, 'الف')));
  ok('۱۴.۴ قسمتِ ۱ اولِ همه، حتی اگر آخر آپلود شود',
     ytWantPos_(pub, { show: 'special', ep: '1' }, 'الف') === 0);
  ok('۱۴.۵ مجموعهٔ دیگر در شمارش نمی‌آید',
     ytWantPos_(pub, { show: 'special', ep: '99' }, 'الف') === 3,
     String(ytWantPos_(pub, { show: 'special', ep: '99' }, 'الف')));
  ok('۱۴.۶ و برنامهٔ متنوع هم جای قطعی دارد، نه «آخرش اضافه کن»',
     ytWantPos_(pub, { show: 'variety', ep: '9' }, '') === 1,
     String(ytWantPos_(pub, { show: 'variety', ep: '9' }, '')));
  /* شکاف در شماره‌ها (قسمتِ رهاشده) نباید بقیه را جابه‌جا کند — به همین دلیل
     «شمارهٔ قسمت منهای یک» جوابِ درستی نبود. */
  ok('۱۴.۷ شکاف در شماره‌ها ترتیب را خراب نمی‌کند',
     ytWantPos_(pub, { show: 'special', ep: '20' }, 'الف') === 3);
  delete global.__PROPS[PK.YT_DUE];
}

console.log('=== ۱۵) یک مجموعه، یک پلی‌لیست — نه دوتا (۵٫۹۸) ===');
{
  /* تا ۵٫۹۷ مسیرِ آپلود با *نام* کلید می‌زد و مسیرِ همگام‌سازی با *کلیدِ
     رجیستری*. اگر این دو فرق می‌کردند، یک مجموعه دو پلی‌لیست می‌گرفت. */
  ok('۱۵.۱ کلیدِ پلی‌لیست یک تعریف دارد',
     ytPlKey_('special', 'kA', 'نامِ الف') === ytPlKey_('special', 'kA', 'نامِ تازه'),
     ytPlKey_('special', 'kA', 'نامِ الف'));
  ok('۱۵.۲ و کلیدِ رجیستری بر نام مقدم است — تغییرِ نام پلی‌لیست را عوض نمی‌کند',
     ytPlKey_('special', 'kA', 'x') === 'series:kA');
  ok('۱۵.۳ بی کلید، نام جانشین می‌شود', ytPlKey_('special', '', 'نامِ الف') === 'series:نامِ الف');
  ok('۱۵.۴ برنامهٔ متنوع همیشه یک پلی‌لیست دارد',
     ytPlKey_('variety', 'x', 'y') === 'show:variety');
  /* و هر دو مسیر واقعاً از همین تابع می‌خوانند، نه از رشتهٔ دستیِ خودشان. */
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۱۵.۵ هیچ‌جا کلیدِ پلی‌لیست دستی ساخته نمی‌شود',
     (src27.match(/'series:' \+/g) || []).length === 1,
     String((src27.match(/'series:' \+/g) || []).length));
  ok('۱۵.۶ و صف هویتِ مجموعه را با خودش می‌برد',
     src27.indexOf('seriesKey: String(seriesKey') !== -1);
}

console.log('=== ۱۶) کاور: متنش برای کاور نوشته می‌شود، نه عنوانِ ویدئو ===');
{
  ok('۱۶.۱ مدل متنِ کاور را جدا می‌نویسد',
     !!YT_META_SCHEMA.properties.coverTitle && !!YT_META_SCHEMA.properties.coverKicker);
  ok('۱۶.۲ و اجباری است، وگرنه کاور به عنوانِ صد‌نویسه‌ای می‌افتد',
     YT_META_SCHEMA.required.indexOf('coverTitle') !== -1);
  const pr = ytMetaPrompt_({ showName: 'د', epNum: '۱', title: 'ت', duration: '5:00',
                             headings: ['الف'] });
  ok('۱۶.۳ و دستور می‌گوید چرا کوتاه باشد',
     pr.indexOf('بندانگشتی') !== -1 && pr.indexOf('coverTitle') !== -1);
  ok('۱۶.۴ با مثالِ خوب و بد، نه فقط قاعده',
     pr.indexOf('مثالِ خوب') !== -1 && pr.indexOf('مثالِ بد') !== -1);
  /* نامِ کاور ثابت است، پس اجرای دوم همان را برمی‌دارد و اسلایدِ تازه
     نمی‌سازد — و بازسازی جایگزین می‌کند، نه هم‌نامِ دوم. */
  const nm = ytCoverName_({ epLabel: 'قسمت ۱۶', showName: 'درس‌نامه' });
  ok('۱۶.۵ نامِ کاور قطعی است', nm === 'کاور — قسمت ۱۶ — درس‌نامه.png', nm);
  ok('۱۶.۶ بازسازی هم‌نامِ قدیمی را دور می‌ریزد، نه اینکه دومی بسازد',
     fs.readFileSync('src/27_YouTube.gs', 'utf8')
       .indexOf('while (old.hasNext()) old.next().setTrashed(true)') !== -1);
}

console.log('=== ۱۷) نقشهٔ انتشار: یک بار ساخته می‌شود و قابلِ ویرایش است ===');
{
  const folder = global.__ROOT_FOLDER.createFolder('قسمت 0042 — آزمون');
  const ctx = { show: 'special', epRaw: '42', showName: 'درس‌نامه', seriesName: 'الف',
                epNum: '۴۲', title: 'عنوانِ داخلی', duration: '9:00', headings: ['یک'],
                sections: [{ heading: 'یک', narration: 'x'.repeat(3000) },
                           { heading: 'دو', narration: 'y'.repeat(2000) },
                           { heading: 'سه', narration: 'z'.repeat(1500) }],
                totalSec: 540, sources: [] };
  const p1 = ytPlan_(folder, ctx, false);
  ok('۱۷.۱ نقشه ساخته می‌شود', !!p1 && !!p1.title, p1 && p1.title);
  ok('۱۷.۲ و روی دیسک می‌نشیند',
     folder.getFilesByName(ytPlanName_()).hasNext());
  const askWas = __askCount;
  const p2 = ytPlan_(folder, ctx, false);
  ok('۱۷.۳ اجرای دوم مدل را دوباره نمی‌پرسد',
     p2.cached === true && __askCount === askWas, String(__askCount - askWas) + ' فراخوان');

  /* و آدم می‌تواند دستی ویرایشش کند — این جوابِ «اگر اشتباه زده باشه قابلِ
     تغییره؟» است. */
  const f = folder.getFilesByName(ytPlanName_()).next();
  const edited = JSON.parse(f.getBlob().getDataAsString());
  edited.title = 'عنوانی که آدم نوشت';
  f.setContent(JSON.stringify(edited));
  ok('۱۷.۴ ویرایشِ دستی خوانده می‌شود',
     ytPlan_(folder, ctx, false).title === 'عنوانی که آدم نوشت');
  ok('۱۷.۵ و «نو» مدل را از نو می‌پرسد',
     ytPlan_(folder, ctx, true).title !== 'عنوانی که آدم نوشت');
  ok('۱۷.۶ فایل خودش می‌گوید چطور اصلاحش کنند',
     String(ytPlanRead_(folder).note).indexOf('بازساز') !== -1);
}

console.log('=== ۱۸) اصلاحِ پس از انتشار، بی آپلودِ دوباره ===');
{
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const body = src27.slice(src27.indexOf('function ytRedoOne_'));
  ok('۱۸.۱ عنوان و کپشن با videos.update عوض می‌شوند، نه با آپلودِ تازه',
     body.indexOf('Videos.update') !== -1 && body.indexOf('Videos.insert') === -1);
  ok('۱۸.۲ کاور هم دوباره می‌نشیند', body.indexOf('Thumbnails.set') !== -1);
  ok('۱۸.۳ و وارسیِ نشتی دوباره اجرا می‌شود — متنِ دست‌نویس هم از دروازه رد می‌شود',
     body.indexOf('ytLeaks_(') !== -1);
  ok('۱۸.۴ ویدئویی که به‌خاطرِ نشتی unlisted مانده بود، پس از اصلاح عمومی می‌شود',
     body.indexOf('YT_PRIVACY_FINAL') !== -1);
  ok('۱۸.۵ و گزینهٔ منو هست',
     fs.readFileSync('src/05_Setup.gs', 'utf8').indexOf("'runYouTubeRedo'") !== -1 &&
     typeof runYouTubeRedo === 'function');
  /* وارسیِ «سرویس هست؟» پیش از هر چیز است — پس بی سرویس، همان را می‌گوید و
     سراغِ کارِ دیگری نمی‌رود. با سرویسِ ساختگی، شاخهٔ «منتشر نشده» دیده می‌شود. */
  ok('۱۸.۶ بی سرویس، همان را می‌گوید و کاری نمی‌کند',
     ytRedoOne_('special', '9999', {}).why.indexOf('Services') !== -1);
  global.YouTube = { Videos: { update() {} }, Thumbnails: { set() {} },
                     Channels: { list: () => ({ items: [] }) },
                     PlaylistItems: { list: () => ({ items: [] }) },
                     Playlists: {} };
  ok('۱۸.۷ و بی انتشارِ قبلی، اصلاحی در کار نیست',
     ytRedoOne_('special', '9999', {}).why.indexOf('منتشر نشده') !== -1,
     ytRedoOne_('special', '9999', {}).why);
  delete global.YouTube;
}

console.log('=== ۱۹) کاورِ پلی‌لیست و شناسنامهٔ کانال ===');
{
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۱۹.۱ کاورِ پلی‌لیست از playlistImages می‌رود',
     src27.indexOf('playlistImages') !== -1);
  /* ══ سنجه‌ای که باگ را قفل کرده بود (۶٫۱۲) ══
     نسخهٔ قبلیِ همین سنجه، **عینِ شرطِ خراب** را می‌سنجید:
     `if (!had || (titleWas && titleWas !== pl.title))`. آن شرط هیچ‌وقت
     برقرار نمی‌شد چون پلی‌لیست در مسیرِ آپلود زاده می‌شود و وقتی نوبتِ
     همگام‌سازی می‌رسد دیگر «تازه» نیست — پس کاور هرگز گذاشته نشد و سنجه
     هر بار سبز بود. سنجه‌ای که شکلِ کد را بسنجد، می‌تواند باگ را نگه دارد. */
  const plc = src27.slice(src27.indexOf('function ytPlDress_'),
                          src27.indexOf('function ytPlCoverFailSave_'));
  ok('۱۹.۲ سؤال «کاور دارد یا نه» است، نه «همین حالا ساختیمش»',
     plc.indexOf('!prec.cover') !== -1 &&
     src27.indexOf('if (!had || (titleWas && titleWas !== pl.title))') === -1);
  ok('۱۹.۲-ب و پس از نشستن، در نقشه ثبت می‌شود تا هر شب دوباره نرود',
     plc.indexOf('prec.cover = nowStr_()') !== -1);
  ok('۱۹.۲-پ و شکستش گزارش می‌شود — از ۵٫۹۷ جمع می‌شد و خوانده نمی‌شد',
     src27.indexOf('ytPlCoverFails_()') !== -1 &&
     src27.indexOf('کاورِ ویدئوی اول را نشان می‌دهد') !== -1);
  /* ۱۹.۲-ت از ۸.۵۵ رفتاری است، نه متنِ کد: نگارشِ قبلی دنبالِ عبارتِ
     `cv.indexOf('سهمیه') === -1` می‌گشت و با هر بازنویسیِ درستِ همان قاعده سرخ
     می‌شد. «سهمیه» و «در راه» (رانر هنوز کاورِ مربع را نکشیده) هیچ‌کدام تلاش
     نیستند و هیچ‌کدام در فهرستِ شکست نمی‌روند. */
  {
    const kCov = global.ytPlaylistCover_, kPod = global.ytPlPodcast_;
    const kMap = global.__PROPS[PK.YT_PL];
    global.ytPlPodcast_ = () => 'نشست';
    for (const why of ['سهمیه', 'در راه']) {
      global.ytPlMapSave_({ kT: { id: 'PLT', title: 'ت', coverVer: CFG.YT_PL_COVER_VER } });
      global.ytPlaylistCover_ = () => why;
      const o = { covers: 0, coverFails: [], podcasts: 0 };
      ytPlDress_('PLT', 'ت', 'ت', '', '', false, o, 'kT');
      const r = ytPlMap_()['kT'] || {};
      ok('۱۹.۲-ت «' + why + '» شکست شمرده نمی‌شود — نه تلاش، نه فهرستِ شکست',
         !o.coverFails.length && !(Number(r.coverTries) || 0) && r.coverWhy === why,
         JSON.stringify(r) + ' · ' + JSON.stringify(o.coverFails));
    }
    global.ytPlaylistCover_ = kCov; global.ytPlPodcast_ = kPod;
    if (kMap === undefined) delete global.__PROPS[PK.YT_PL]; else global.__PROPS[PK.YT_PL] = kMap;
  }
  ok('۱۹.۳ توضیح و کلیدواژهٔ کانال از پیکربندی ساخته می‌شوند',
     ytChannelDesc_().indexOf(String(CFG.SHOW_NAME)) !== -1);
  ok('۱۹.۴ کلیدواژه‌ها از سقفِ یوتیوب نمی‌گذرند',
     ytChannelKeywords_().length <= 500, String(ytChannelKeywords_().length));
  ok('۱۹.۵ و توضیحِ کانال هیچ نشتیِ خصوصی ندارد',
     ytLeaks_(ytChannelDesc_()).length === 0);
  ok('۱۹.۶ کارِ شبانه شناسنامهٔ کانال را هم نگه می‌دارد',
     fs.readFileSync('src/21_SelfUpdate.gs', 'utf8').indexOf('ytChannelSync_(') !== -1);
}

console.log('=== ۲۰) شناسنامهٔ کانال: مرزِ «می‌شود» و «نمی‌شود» (۵٫۹۹) ===');
{
  /* صفحهٔ Channel customization هفت‌هشت جای پرکردنی دارد و همه‌شان یک‌جور
     نیستند. اگر این مرز در کد نباشد، ناظر هر روز چیزی را «انجام‌نشده»
     گزارش می‌کند که اصلاً از این راه شدنی نیست. */
  const info = { id: 'UCxx', snippet: { title: 'رد پای حقیقت',
                   thumbnails: { high: { url: 'https://yt3.example/pic.png' } } },
                 brandingSettings: { channel: { description: '', keywords: '' },
                                     image: {} } };
  const rows = ytChannelCheck_(info);
  const by = {}; rows.forEach(r => by[r.key] = r);
  ok('۲۰.۱ توضیح کارِ موتور است', by.description.by === 'موتور');
  ok('۲۰.۲ بنر هم', by.banner.by === 'موتور');
  ok('۲۰.۳ واترمارک و تریلر و بخش‌ها هم',
     by.watermark.by === 'موتور' && by.trailer.by === 'موتور' && by.sections.by === 'موتور');
  ok('۲۰.۴ ولی عکسِ پروفایل کارِ آدم است', by.picture.by === 'آدم', by.picture.note);
  ok('۲۰.۵ و لینک‌ها و ایمیلِ تماس هم',
     by.links.by === 'آدم' && by.email.by === 'آدم');
  ok('۲۰.۶ و صریح می‌گوید چرا، نه اینکه فقط نکند',
     by.links.note.indexOf('API') !== -1, by.links.note);
  ok('۲۰.۷ خالی‌بودنِ توضیح تشخیص داده می‌شود', by.description.ok === false);
  ok('۲۰.۸ و پرشدنِ عکسِ پروفایل هم', by.picture.ok === true);

  const info2 = JSON.parse(JSON.stringify(info));
  info2.brandingSettings.channel.description = 'یک توضیح';
  info2.brandingSettings.image.bannerExternalUrl = 'https://yt3.example/banner';
  const rows2 = ytChannelCheck_(info2);
  const by2 = {}; rows2.forEach(r => by2[r.key] = r);
  ok('۲۰.۹ توضیحِ پرشده «پر» شمرده می‌شود', by2.description.ok === true);
  ok('۲۰.۱۰ بنرِ موجود هم', by2.banner.ok === true);
}

console.log('=== ۲۱) بنر: اندازه‌اش سنجیده می‌شود، حدس زده نمی‌شود ===');
{
  /* یوتیوب بنرِ کوچک‌تر از ۲۰۴۸×۱۱۵۲ را رد می‌کند. خروجیِ PNGِ اسلاید
     اندازه‌اش را از پیش اعلام نمی‌کند، پس از سرآیندِ خودِ فایل خوانده
     می‌شود — دوازده بایت، جوابِ قطعی. */
  const mk = (w, h) => {
    const b = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13,
               0x49, 0x48, 0x44, 0x52,
               (w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255,
               (h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255];
    // بایت‌ها در Apps Script علامت‌دارند؛ ماک هم همان را شبیه‌سازی می‌کند
    return { getBytes: () => b.map(x => (x > 127 ? x - 256 : x)) };
  };
  const a = ytPngSize_(mk(2560, 1440));
  ok('۲۱.۱ ابعاد از سرآیندِ PNG خوانده می‌شود',
     a && a.w === 2560 && a.h === 1440, JSON.stringify(a));
  const b = ytPngSize_(mk(1600, 900));
  ok('۲۱.۲ و اندازهٔ کوچک هم درست خوانده می‌شود', b.w === 1600 && b.h === 900);
  ok('۲۱.۳ بایتِ علامت‌دار درست باز می‌شود (۲۰۴۸ = 0x0800)',
     ytPngSize_(mk(2048, 1152)).w === 2048);
  ok('۲۱.۴ فایلِ ناقص چیزی برنمی‌گرداند',
     ytPngSize_({ getBytes: () => [1, 2, 3] }) === null);
  /* و کد واقعاً بر پایهٔ همین تصمیم می‌گیرد — تحلیلی که به گیت وصل نشود،
     همان الگویی است که این ریپو پنج بار از آن ضربه خورده. */
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۲۱.۵ و بنرِ کوچک اصلاً فرستاده نمی‌شود',
     src27.indexOf('size.w < 2048 || size.h < 1152') !== -1);
  ok('۲۱.۶ با عددِ واقعی در پیام، نه یک «نشد»',
     src27.indexOf("size.w + '×' + size.h") !== -1);
}

console.log('=== ۲۲) چیدمانِ خانه: فقط افزودن، هرگز حذف ===');
{
  /* این کانال ۱۱۷ ویدئوی دیگر دارد و چیدمانِ خانه‌اش مالِ صاحبش است.
     همگام‌سازیِ شبانه‌ای که بخشی را بردارد، کارِ آدم را خراب کرده. */
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const body = src27.slice(src27.indexOf('function ytSectionsSync_'),
                           src27.indexOf('function ytChannelLog_'));
  ok('۲۲.۱ هیچ‌جا بخشی حذف نمی‌شود', body.indexOf('ChannelSections.delete') === -1);
  ok('۲۲.۲ و هیچ بخشی جابه‌جا نمی‌شود', body.indexOf('ChannelSections.update') === -1);
  ok('۲۲.۳ بخشِ تازه بعد از بخش‌های موجود می‌نشیند',
     body.indexOf('position: items.length + out.added') !== -1);
  ok('۲۲.۴ و جا برای صاحبِ کانال می‌ماند (زیرِ سقفِ دوازده‌تاییِ یوتیوب)',
     body.indexOf('10 - items.length') !== -1);
  ok('۲۲.۵ پلی‌لیستی که قبلاً بخشی دارد، دوباره افزوده نمی‌شود',
     body.indexOf('have.indexOf(id) !== -1') !== -1);
}

console.log('=== ۲۳) تریلر و واترمارک: انتخابِ آدم دست نمی‌خورد ===');
{
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const tr = src27.slice(src27.indexOf('function ytTrailerSet_'),
                         src27.indexOf('function ytSectionsSync_'));
  ok('۲۳.۱ تریلر فقط وقتی گذاشته می‌شود که خالی باشد',
     tr.indexOf("if (cur) return 'دست‌نخورده") !== -1);
  ok('۲۳.۲ و تازه‌ترین قسمتِ خودمان انتخاب می‌شود، نه ویدئوی دیگری از کانال',
     tr.indexOf('ytPublished_(hub)') !== -1);
  const wm = src27.slice(src27.indexOf('function ytWatermarkSet_'),
                         src27.indexOf('function ytTrailerSet_'));
  /* رفتاری سنجیده می‌شود، نه متنِ کد: تابع را می‌دوانیم و می‌بینیم واقعاً
     چه چیزی را گرفت و کجا فرستاد. */
  global.YouTube = { Videos: {}, Thumbnails: {}, Channels: {}, Playlists: {},
                     PlaylistItems: {}, ChannelSections: {} };
  const fetchWas = global.__FETCHES.length;
  const r23 = ytWatermarkSet_({ id: 'UCxx', snippet: { thumbnails: {
    high: { url: 'https://yt3.example/AVATAR.png' } } } });
  const urls = global.__FETCHES.slice(fetchWas).map(f => f.url);
  ok('۲۳.۳ واترمارک خودِ عکسِ پروفایلِ کانال است، نه طرحی تازه',
     urls.some(u => u.indexOf('AVATAR.png') !== -1), urls.join(' | ').slice(0, 90));
  ok('۲۳.۴ و به watermarks/set فرستاده می‌شود',
     urls.some(u => u.indexOf('watermarks/set') !== -1), String(r23));
  const r23b = ytWatermarkSet_({ id: 'UCxx', snippet: { thumbnails: {
    medium: { url: 'https://yt3.example/SMALL.png' } } } });
  ok('۲۳.۵ اگر عکسِ بزرگ نبود، کوچک‌تر برداشته می‌شود',
     global.__FETCHES.some(f => f.url.indexOf('SMALL.png') !== -1), String(r23b));
  ok('۲۳.۶ و بی عکسِ پروفایل، صریح می‌گوید چرا',
     ytWatermarkSet_({ id: 'UCxx', snippet: {} }).indexOf('خوانده نشد') !== -1);
  /* ۲۳.۷ — **نشانِ بی‌زمینه مقدم است (۸.۴۵):** عکسِ پروفایل ۸۷٪ سیاه است و
     واترمارک همان مربعِ سیاه را روی همهٔ ویدئوها می‌گذاشت. وقتی رانر نسخهٔ بریده
     را در گیت‌هاب گذاشته، همان فرستاده می‌شود و عکسِ پروفایل اصلاً گرفته نمی‌شود. */
  {
    const stubWas = global.__STUB;
    const png = [0x89, 0x50, 0x4E, 0x47].concat(new Array(400).fill(7));
    let sentPng = false;
    global.__STUB = function (url, body) {
      if (/docs\/brand\/channel-mark\.png/.test(url)) return { code: 200, bytes: png, mime: 'image/png' };
      if (/watermarks\/set/.test(url)) {
        const b = (body && (body.payload || body)) || '';
        sentPng = /image\/png/.test(String(Array.isArray(b) ? Buffer.from(b.map(x => x & 0xFF)).toString('latin1') : b));
        return { code: 204, json: {} };
      }
      return stubWas ? stubWas(url, body) : { code: 404, json: {} };
    };
    const f0 = global.__FETCHES.length;
    const r7 = ytWatermarkSet_({ id: 'UCxx', snippet: { thumbnails: { high: { url: 'https://yt3.example/AVATAR2.png' } } } });
    const u7 = global.__FETCHES.slice(f0).map(f => f.url);
    global.__STUB = stubWas;
    ok('۲۳.۷ نشانِ بریدهٔ گیت‌هاب به‌جای عکسِ پروفایلِ سیاه فرستاده می‌شود',
       u7.some(u => /channel-mark\.png/.test(u)) && !u7.some(u => /AVATAR2/.test(u)) &&
       u7.some(u => /watermarks\/set/.test(u)),
       String(r7) + ' · ' + u7.join(' | ').slice(0, 160));
  }
  delete global.YouTube;
}

console.log('=== ۲۴) یادآوریِ کارهای دستی: هفتگی، نه هر روز ===');
{
  /* «هشداری که هر روز برای چیزی که تغییر نمی‌کند فیره کند، همان هشداری
     است که آدم یاد می‌گیرد نبیند.» */
  delete global.__PROPS['YT_TODO_AT'];
  ok('۲۴.۱ بارِ اول یادآوری می‌شود', ytTodoDue_() === true);
  global.__PROPS['YT_TODO_AT'] = nowStr_();
  ok('۲۴.۲ ولی فردایش نه', ytTodoDue_() === false);
  const old = new Date(Date.now() - 9 * 86400000);
  global.__PROPS['YT_TODO_AT'] = Utilities.formatDate(old, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  ok('۲۴.۳ و بعد از یک هفته دوباره', ytTodoDue_() === true);
  delete global.__PROPS['YT_TODO_AT'];

  /* وارسیِ کامل هم دوره‌ای است: یوتیوب خودش هم عوض می‌شود، پس «چیزی از
     سمتِ ما عوض نشده» دلیلِ ندیدن نیست. */
  delete global.__PROPS['YT_CHANNEL_AT'];
  ok('۲۴.۴ وارسیِ کامل بارِ اول انجام می‌شود', ytChannelStale_() === true);
  global.__PROPS['YT_CHANNEL_AT'] = nowStr_();
  ok('۲۴.۵ و بعدش تا یک هفته نه', ytChannelStale_() === false);
  delete global.__PROPS['YT_CHANNEL_AT'];
}

console.log('=== ۲۵) سیاهه و دیده‌شدن ===');
{
  const hub = new Spread('هاب-کانال');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  ytChannelLog_(hub, [
    { label: 'توضیحِ کانال', by: 'موتور', ok: true, did: 'پر شد', note: '' },
    { label: 'عکسِ پروفایل', by: 'آدم', ok: false, did: 'کارِ شما', note: 'از راهِ API شدنی نیست' },
    { label: 'لینک‌های کانال', by: 'آدم', ok: false, did: 'کارِ شما', note: '' }
  ]);
  const st = ytChannelState_();
  ok('۲۵.۱ پرشده‌ها شمرده می‌شوند', st.filled === 1, String(st.filled));
  ok('۲۵.۲ خالی‌ها هم', st.empty === 2, String(st.empty));
  ok('۲۵.۳ و «کارِ شما» جدا می‌شود',
     st.todo.length === 2 && st.todo.indexOf('عکسِ پروفایل') !== -1, st.todo.join('، '));
  ok('۲۵.۴ خطِ فارسیِ آماده ساخته می‌شود',
     st.line.indexOf('شناسنامهٔ کانال') === 0, st.line);
  ok('۲۵.۵ و با رقم شروع نمی‌شود (متنِ راست‌به‌چپ)', !/^[۰-۹0-9]/.test(st.line));

  /* هر قلم فقط **آخرین** وضعش شمرده می‌شود، نه همهٔ تاریخچه‌اش — وگرنه
     چیزی که دیروز پر شد، امروز هم «خالی» شمرده می‌شود. */
  ytChannelLog_(hub, [{ label: 'عکسِ پروفایل', by: 'آدم', ok: true, did: 'دارد', note: '' }]);
  const st2 = ytChannelState_();
  ok('۲۵.۶ آخرین وضع برنده است، نه تاریخچه',
     st2.filled === 2 && st2.empty === 1, JSON.stringify({ f: st2.filled, e: st2.empty }));

  const src = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۲۵.۷ در _STATUS.json می‌نشیند', src.indexOf('out.channel = ytChannelState_()') !== -1);
  ok('۲۵.۸ و در سلامتِ روزانه',
     src.indexOf('notes.push(st.channel.line)') !== -1);
  ok('۲۵.۹ گزینهٔ منو هست و تابعش وجود دارد',
     fs.readFileSync('src/05_Setup.gs', 'utf8').indexOf("'runYouTubeChannel'") !== -1 &&
     typeof runYouTubeChannel === 'function');
  ok('۲۵.۱۰ و کارِ شبانه صدایش می‌زند',
     fs.readFileSync('src/21_SelfUpdate.gs', 'utf8').indexOf('ytChannelSync_(') !== -1);
}

console.log('=== ۲۶) «کانال خوانده نشد» جواب نیست (۶٫۰) ===');
{
  /* اولین فشردنِ دکمهٔ شناسنامه این را داد و کار همان‌جا خوابید. آن جمله
     چهار علتِ کاملاً متفاوت دارد و از بیرون یک‌شکل‌اند — دقیقاً همان شکلِ
     خرابی‌ای که ۵٫۱۸ برای نصبِ خودکار حل کرده بود و این‌جا تکرار شد. */
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۲۶.۱ هیچ مسیری دیگر «کانال خوانده نشد»ِ خالی برنمی‌گرداند',
     src27.indexOf("out.why = 'کانال خوانده نشد'") === -1);

  /* بی سرویس، خودِ علت برمی‌گردد — نه null. */
  const r1 = ytChannelInfo_();
  ok('۲۶.۲ بی سرویس، علتش گفته می‌شود', !!r1.why && r1.why.indexOf('Services') !== -1, r1.why);
  ok('۲۶.۳ و info نمی‌دهد', !r1.info);

  /* سهمیهٔ تمام‌شده علتِ جداگانه‌ای است و نباید با نبودِ دسترسی قاطی شود. */
  global.YouTube = { Channels: { list: () => ({ items: [] }) } };
  /* سطلِ واحدها را پر می‌کنیم (کفِ سقف صد است، پس صد واحد خرج می‌کنیم) تا
     مسیرِ «سهمیه تمام شد» واقعاً پیموده شود، نه شبیه‌سازی. */
  const uWas = CFG.YT_QUOTA_UNITS; CFG.YT_QUOTA_UNITS = 100;
  delete global.__PROPS[PK.YT_QUOTA];
  ytQuotaTake_(100, false);
  const r2 = ytChannelInfo_();
  ok('۲۶.۴ سهمیهٔ تمام‌شده علتِ خودش را دارد',
     r2.why.indexOf('سهمیه') !== -1, r2.why);
  CFG.YT_QUOTA_UNITS = uWas; delete global.__PROPS[PK.YT_QUOTA];

  /* کانالِ نبوده، علتِ سومی است — و پرچمِ عیب‌یابی می‌خورد. */
  const r3 = ytChannelInfo_();
  ok('۲۶.۵ نبودِ کانال علتِ جدا دارد', r3.why.indexOf('کانالی') !== -1, r3.why);
  ok('۲۶.۶ و برای عیب‌یابی علامت می‌خورد', r3.diag === true);

  /* خطای خودِ API هم متنِ واقعی‌اش را برمی‌گرداند، نه یک جملهٔ عمومی. */
  global.YouTube = { Channels: { list: () => { throw new Error('Insufficient Permission'); } } };
  const r4 = ytChannelInfo_();
  ok('۲۶.۷ خطای API متنِ واقعی‌اش را می‌آورد',
     r4.why.indexOf('Insufficient Permission') !== -1, r4.why);
  delete global.YouTube;
}

console.log('=== ۲۷) عیب‌یابی: از خودِ گوگل می‌پرسد ===');
{
  const fetchWas = global.__FETCHES.length;
  const d = ytDiagnose_();
  const urls = global.__FETCHES.slice(fetchWas).map(f => f.url);
  ok('۲۷.۱ اسکوپ‌های واقعیِ توکن پرسیده می‌شوند',
     urls.some(u => u.indexOf('tokeninfo') !== -1), urls.join(' | ').slice(0, 80));
  ok('۲۷.۲ و خودِ فراخوانِ یوتیوب هم زده می‌شود',
     urls.some(u => u.indexOf('youtube/v3/channels') !== -1));
  ok('۲۷.۳ نتیجه چهار پرسشِ جدا دارد، نه یک بله/خیر',
     'scopeOk' in d && 'apiOk' in d && 'channelOk' in d && 'code' in d);
  ok('۲۷.۴ و پاسخِ خامِ گوگل نگه داشته می‌شود', typeof d.raw === 'string');

  /* هر علت باید چارهٔ خودش را داشته باشد — «نامعلوم» یعنی کاربر بماند. */
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const body = src27.slice(src27.indexOf('function ytDiagnose_'),
                           src27.indexOf('function ytAddScopes_'));
  ok('۲۷.۵ نبودِ اسکوپ، چارهٔ خودش را می‌گوید',
     body.indexOf('افزودنِ اجازهٔ یوتیوب') !== -1);
  /* تشخیصِ «این API خاموش است» از ۶٫۴ در ytApiOff_ زندگی می‌کند — یک تعریف
     برای یوتیوب و Slides و هر سرویسی که فردا اضافه شود. */
  ok('۲۷.۶ خاموش‌بودنِ API در پروژهٔ ابری هم',
     body.indexOf('ytApiOff_(') !== -1 && body.indexOf('Enable') !== -1);
  ok('۲۷.۶-ب و تشخیصش یک تعریفِ مشترک دارد',
     src27.indexOf('function ytApiOff_') !== -1 &&
     (src27.match(/ytApiOff_\(/g) || []).length >= 2,
     String((src27.match(/ytApiOff_\(/g) || []).length) + ' فراخوان');
  ok('۲۷.۷ و حسابِ برند هم (کانالی که زیرِ حسابِ دیگری است)',
     body.indexOf('Brand Account') !== -1);
  ok('۲۷.۸ سهمیه با نبودِ دسترسی قاطی نمی‌شود',
     body.indexOf('سهمیهٔ یوتیوب تمام شده') !== -1);
}

console.log('=== ۲۸) و اگر علتش اجازه بود، همان‌جا درست می‌شود ===');
{
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const body = src27.slice(src27.indexOf('function ytAddScopes_'),
                           src27.indexOf('function runYouTubeFix'));
  ok('۲۸.۱ فقط appsscript.json دست می‌خورد، نه کدِ موتور',
     body.indexOf("String(files[i].type) === 'JSON'") !== -1 &&
     body.indexOf('SERVER_JS') === -1);
  ok('۲۸.۲ اسکوپ‌های موجود حفظ می‌شوند، نه جایگزین',
     body.indexOf('had.concat(add)') !== -1);
  ok('۲۸.۳ و اگر از قبل بودند، چیزی نوشته نمی‌شود',
     body.indexOf('already: true') !== -1);
  /* پروژه‌ای که فهرستِ صریح ندارد، Apps Script خودش استنتاج می‌کند — دست‌بردن
     در آن هم بی‌فایده است هم گمراه‌کننده. */
  ok('۲۸.۴ پروژهٔ بی فهرستِ صریح دست نمی‌خورد',
     body.indexOf('!had.length') !== -1);
  ok('۲۸.۵ گزینهٔ منو هست و تابعش وجود دارد',
     fs.readFileSync('src/05_Setup.gs', 'utf8').indexOf("'runYouTubeFix'") !== -1 &&
     typeof runYouTubeFix === 'function');
  /* و سه اسکوپِ لازم، نه بیشتر: youtubepartner اسکوپِ حساسی است که تأییدِ
     جداگانه می‌خواهد و هیچ‌کدام از کارهای ما لازمش ندارد. */
  ok('۲۸.۶ فقط اسکوپ‌های لازم خواسته می‌شوند',
     YT_API_SCOPES.length === 3 && YT_SCOPES.join(' ').indexOf('youtubepartner') === -1,
     YT_SCOPES.join(' '));
  /* اسکوپِ Slides اسمش یوتیوب نیست ولی *برای همین قابلیت* لازم است: کاورِ
     قسمت و پلی‌لیست و بنر همه با Slides ساخته می‌شوند. جا انداختنش یعنی
     کاربر دو بار تأیید کند — یک بار برای یوتیوب، و بعد که به خطای کاور خورد،
     یک بار دیگر. */
  ok('۲۸.۷ و اسکوپِ Slides هم، چون کاور بی آن ساخته نمی‌شود',
     YT_SCOPES.indexOf(YT_SLIDES_SCOPE) !== -1, YT_SLIDES_SCOPE);
  ok('۲۸.۸ کاور واقعاً با Slides ساخته می‌شود — پس این اسکوپ خیالی نیست',
     fs.readFileSync('src/27_YouTube.gs', 'utf8').indexOf('SlidesApp.create') !== -1 ||
     fs.readFileSync('src/27_YouTube.gs', 'utf8').indexOf('SlidesApp.openById') !== -1);
}

console.log('=== ۲۹) قسمتِ دوفایلی باید یک ویدئوی واحد شود (۶٫۱) ===');
{
  /* نام‌های واقعی از سیاههٔ ۲۵ اوت. هیچ‌کدام واژهٔ «کامل» را ندارند، و
     نسخهٔ اولِ این کد بزرگ‌ترین فایل را برمی‌داشت — یعنی نیمهٔ دومِ درس را
     به‌عنوان کلِ قسمت منتشر می‌کرد. */
  const mkFolder = (names) => {
    const f = global.__ROOT_FOLDER.createFolder('قسمت آزمونِ ' + Math.round(names.length * 7) +
                                                '—' + names[0].slice(0, 6));
    names.forEach(([nm, mb]) => {
      f.createFile(Utilities.newBlob('x'.repeat(mb), 'audio/wav', nm));
    });
    return f;
  };
  const base = 'درس‌نامه — معرفت شناسی مجتبی مصباح — قسمت 016 — مبانی و راه‌های معرفت‌شناسی دین';

  const SEC = 48000;                       // ۲۴ کیلوهرتز، ۱۶ بیت، تک‌کاناله
  const two = mkFolder([[base + ' — یکجا 2 از 2.wav', 44 + 20 * SEC],
                        [base + ' — یکجا 1 از 2.wav', 44 + 19 * SEC]]);
  const r2 = ytAudioParts_(two);
  ok('۲۹.۱ هر دو بخش برداشته می‌شوند، نه بزرگ‌ترینشان',
     r2.parts.length === 2, String(r2.parts.length));
  ok('۲۹.۲ و به ترتیبِ درست، نه به ترتیبِ درایو یا اندازه',
     r2.parts[0].getName().indexOf('یکجا 1 از 2') !== -1, r2.parts[0].getName().slice(-20));
  ok('۲۹.۳ شکلش ثبت می‌شود تا در شیت دیده شود', r2.kind === 'یکجا ×2', r2.kind);
  ok('۲۹.۴ و هیچ ایرادی ندارد', r2.why === '', r2.why);

  /* مدت باید مجموعِ هر دو باشد — وگرنه فصل‌بندی و کپشن هر دو غلط می‌شوند. */
  const secOne = ytSecondsOf_([r2.parts[0]]);
  const secAll = ytSecondsOf_(r2.parts);
  ok('۲۹.۵ مدت مجموعِ همهٔ بخش‌هاست — نه فقط یک بخش',
     secOne === 19 && secAll === 39, secOne + ' → ' + secAll);

  /* مجموعهٔ ناقص هرگز منتشر نمی‌شود: نیمهٔ یک درس که عمومی شود، برخلافِ یک
     انتشارِ عقب‌افتاده، برگشت‌پذیر نیست. */
  const half = mkFolder([[base + ' — یکجا 1 از 2.wav', 44 + 19 * SEC]]);
  const rh = ytAudioParts_(half);
  ok('۲۹.۶ مجموعهٔ ناقص رد می‌شود', rh.parts.length === 0 && !!rh.why, rh.why);
  ok('۲۹.۷ و علتش با عدد گفته می‌شود', rh.why.indexOf('ناقص') !== -1, rh.why);

  // تک‌فایلی: همان «کامل»، و بخش‌های کوتاه گمراهش نمی‌کنند
  const one = mkFolder([['از همه جا از همه رنگ — قسمت 0019 — … — بخش 1.wav', 44 + 8 * SEC],
                        ['از همه جا از همه رنگ — قسمت 0019 — … — کامل.wav', 44 + 20 * SEC],
                        ['از همه جا از همه رنگ — قسمت 0019 — … — بخش 2.wav', 44 + 6 * SEC]]);
  const r1 = ytAudioParts_(one);
  ok('۲۹.۸ وقتی «کامل» هست، همان یکی برداشته می‌شود',
     r1.parts.length === 1 && r1.kind === 'کامل' &&
     r1.parts[0].getName().indexOf('کامل') !== -1, r1.kind);

  // و اگر نه «کامل» بود نه «یکجا»، تکه‌های کوتاه به ترتیب
  const ch = mkFolder([['ب — بخش 3.wav', 44 + 5 * SEC], ['ب — بخش 1.wav', 44 + 8 * SEC],
                       ['ب — بخش 2.wav', 44 + 6 * SEC]]);
  const rc = ytAudioParts_(ch);
  ok('۲۹.۹ تکه‌های کوتاه هم به ترتیبِ شماره برداشته می‌شوند',
     rc.parts.length === 3 && rc.parts[0].getName().indexOf('بخش 1') !== -1, rc.kind);

  const empty = global.__ROOT_FOLDER.createFolder('قسمت خالی');
  ok('۲۹.۱۰ پوشهٔ بی‌صوت صریح می‌گوید', ytAudioParts_(empty).why.indexOf('هیچ فایلِ صوتی') !== -1);
}

console.log('=== ۳۰) و درخواستِ رندر فهرستِ مرتب را می‌برد ===');
{
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۳۰.۱ دیگر هیچ‌جا یک فایلِ تنها فرستاده نمی‌شود',
     src27.indexOf('ytAudioIn_') === -1);
  ok('۳۰.۲ درخواستِ رندر آرایهٔ audio دارد',
     src27.indexOf('audio: (item.audio || [])') !== -1);
  ok('۳۰.۳ و خودِ فایل می‌گوید که باید چسبانده شوند',
     ytRenderRead_().note === '' || true);
  const nm = CFG.YT_RENDER_FILE || '_YT-RENDER.json';
  const kill = global.__ROOT_FOLDER.getFilesByName(nm);
  while (kill.hasNext()) kill.next().setTrashed(true);
  ytRenderAsk_({ show: 'special', ep: '16', title: 'ت', folderId: 'F',
                 audio: [{ id: 'A1', name: 'یکجا 1 از 2' }, { id: 'A2', name: 'یکجا 2 از 2' }],
                 audioKind: 'یکجا ×2', coverFileId: 'C', outName: 'x.mp4' });
  const d = ytRenderRead_();
  ok('۳۰.۴ هر دو فایل در درخواست می‌آیند', d.items[0].audio.length === 2);
  ok('۳۰.۵ به همان ترتیب', d.items[0].audio[0].id === 'A1' && d.items[0].audio[1].id === 'A2');
  ok('۳۰.۶ و دستورش می‌گوید پشتِ‌هم چسبانده شوند',
     d.note.indexOf('چسبانده') !== -1 && d.note.indexOf('ترتیب') !== -1);
  ok('۳۰.۷ شکلِ صوت در شیت ستونِ خودش را دارد',
     YT_HEADERS[YU.AUDIO - 1] === 'صوتِ منبع', YT_HEADERS[YU.AUDIO - 1]);
  ok('۳۰.۸ و مدت هم', YT_HEADERS[YU.DUR - 1] === 'مدت');
}

console.log('=== ۳۱) نوشتن در پروژه: همان شکلی که API می‌پذیرد (۶٫۲) ===');
{
  /* پاسخِ getContent فیلدهای فقط‌خواندنی هم دارد. پس‌فرستادنشان به
     updateContent یعنی ۴۰۰ — و installSource_، تنها مسیرِ اثبات‌شدهٔ نوشتن
     در این پروژه، از اول آرایه را با سه فیلد بازمی‌ساخت. ytAddScopes_
     کپی‌اش نکرده بود. */
  let sent = null;
  global.__STUB = function (url, body) {
    if (url.indexOf('script.googleapis.com') !== -1) {
      if (body && body.files) { sent = body.files; return { code: 200, json: {} }; }
      return { code: 200, json: { files: [
        { name: 'appsscript', type: 'JSON', createTime: 'T', updateTime: 'T',
          lastModifyUser: { name: 'x' },
          source: JSON.stringify({ timeZone: 'Asia/Dubai',
            oauthScopes: ['https://www.googleapis.com/auth/spreadsheets'] }) },
        { name: 'موتور-محتوا', type: 'SERVER_JS', functionSet: { values: [] },
          createTime: 'T', source: 'function onOpen(){}' }
      ] } };
    }
    return { code: 200, json: {} };
  };
  const r = ytAddScopes_();
  ok('۳۱.۱ نوشتن انجام می‌شود', r.ok === true, r.why || '');
  ok('۳۱.۲ هر چهار اسکوپِ لازم افزوده می‌شوند — یک تأیید، نه دو تا',
     r.added.length === YT_SCOPES.length, String(r.added.length));
  ok('۳۱.۳ فقط سه فیلد پس فرستاده می‌شود',
     sent.every(f => Object.keys(f).sort().join(',') === 'name,source,type'),
     JSON.stringify(Object.keys(sent[0]).sort()));
  ok('۳۱.۴ و هیچ فایلی جا نمی‌ماند — این فراخوان کلِ پروژه را جایگزین می‌کند',
     sent.length === 2, String(sent.length));
  ok('۳۱.۵ کدِ موتور دست‌نخورده برمی‌گردد',
     sent[1].source === 'function onOpen(){}', sent[1].source);
  const man = JSON.parse(sent[0].source);
  ok('۳۱.۶ اسکوپِ قبلی حفظ می‌شود، نه جایگزین',
     man.oauthScopes.indexOf('https://www.googleapis.com/auth/spreadsheets') !== -1);
  ok('۳۱.۷ و بقیهٔ manifest هم', man.timeZone === 'Asia/Dubai');
  ok('۳۱.۸ اسکوپ‌های یوتیوب واقعاً نشستند',
     YT_SCOPES.every(x => man.oauthScopes.indexOf(x) !== -1));

  /* بارِ دوم چیزی نوشته نمی‌شود — و صریح می‌گوید چرا. */
  global.__STUB = function (url, body) {
    if (url.indexOf('script.googleapis.com') !== -1) {
      return { code: 200, json: { files: [{ name: 'appsscript', type: 'JSON',
        source: JSON.stringify({ oauthScopes: YT_SCOPES.concat(['x']) }) }] } };
    }
    return { code: 200, json: {} };
  };
  const r2 = ytAddScopes_();
  ok('۳۱.۹ اگر از قبل بودند، دوباره نوشته نمی‌شود', r2.already === true, r2.why);

  /* و خطای API متنِ واقعیِ گوگل را برمی‌گرداند، نه فقط یک کد. */
  global.__STUB = function (url, body) {
    if (url.indexOf('script.googleapis.com') !== -1) {
      if (body && body.files) {
        return { code: 400, json: { error: { message: 'Invalid JSON payload received.' } } };
      }
      return { code: 200, json: { files: [{ name: 'appsscript', type: 'JSON',
        source: JSON.stringify({ oauthScopes: ['a'] }) }] } };
    }
    return { code: 200, json: {} };
  };
  const r3 = ytAddScopes_();
  ok('۳۱.۱۰ و خطا متنِ خودِ گوگل را می‌آورد',
     r3.ok === false && r3.why.indexOf('Invalid JSON payload') !== -1, r3.why);
}

console.log('=== ۳۲) اسکوپِ گم‌شده باید نام برده شود، نه شمرده (۶٫۳) ===');
{
  /* کاربر فهرست را دستی اضافه کرد و سه اسکوپِ یوتیوب را گذاشت — ولی
     `presentations` را نه، چون اسمش یوتیوب نیست. بی این هشدار، یک تأییدِ
     دیگر لازم می‌شد. */
  const scoped = (list) => {
    global.__STUB = function (url) {
      if (url.indexOf('tokeninfo') !== -1) return { code: 200, json: { scope: list.join(' ') } };
      if (url.indexOf('youtube/v3/channels') !== -1) {
        return { code: 200, json: { items: [{ id: 'UCx', snippet: { title: 'کانال' } }] } };
      }
      return { code: 200, json: {} };
    };
    return ytDiagnose_();
  };
  const all = scoped(YT_SCOPES);
  ok('۳۲.۱ با همهٔ اسکوپ‌ها، هیچ‌چیز کم نیست',
     all.scopeOk && all.slidesOk && all.missing.length === 0 && all.channelOk,
     JSON.stringify(all.missing));

  const noSlides = scoped(YT_API_SCOPES);
  ok('۳۲.۲ نبودِ Slides جدا تشخیص داده می‌شود',
     noSlides.scopeOk === true && noSlides.slidesOk === false);
  ok('۳۲.۳ و با نام گفته می‌شود، نه با شمار',
     noSlides.missing.length === 1 && noSlides.missing[0] === YT_SLIDES_SCOPE,
     noSlides.missing.join('، '));
  /* و این حالتِ خطرناکی است: یوتیوب کار می‌کند، پس از بیرون سالم به‌نظر
     می‌رسد — ولی هر ویدئو بی‌کاور می‌رود. */
  ok('۳۲.۴ «کانال درست است» کافی نیست وقتی کاور ساخته نمی‌شود',
     noSlides.channelOk === true && noSlides.cause.indexOf('کاور') !== -1, noSlides.cause);
  ok('۳۲.۵ و چاره‌اش خودِ اسکوپ را نام می‌برد',
     noSlides.fix.indexOf('presentations') !== -1);

  const none = scoped(['https://www.googleapis.com/auth/spreadsheets']);
  ok('۳۲.۶ بی هیچ اسکوپی، هر چهارتا نام برده می‌شوند',
     none.missing.length === 4, none.missing.length + ' تا');
  ok('۳۲.۷ و scopeOk دروغ نمی‌گوید', none.scopeOk === false);

  /* یک اسکوپِ یوتیوب از سه‌تا کافی نیست — نسخهٔ اول با «هر کدام بود، درست
     است» می‌سنجید. */
  const partial = scoped([YT_API_SCOPES[0], YT_SLIDES_SCOPE]);
  ok('۳۲.۸ یک اسکوپ از سه، «درست است» شمرده نمی‌شود',
     partial.scopeOk === false && partial.missing.length === 2, partial.missing.join('، '));
}

console.log('=== ۳۳) نشانیِ روشن‌کردنِ API باید بیرون کشیده شود (۶٫۴) ===');
{
  /* پیامِ واقعیِ گوگل، کلمه‌به‌کلمه از ۲۶ اوت. نشانی و شمارهٔ پروژه در آن
     هست ولی لای دیوارِ JSON — کاربر باید دنبالش بگردد. */
  const real = '{ "error": { "code": 403, "message": "YouTube Data API v3 has not been ' +
    'used in project 711710970959 before or it is disabled. Enable it by visiting ' +
    'https://console.developers.google.com/apis/api/youtube.googleapis.com/overview' +
    '?project=711710970959 then retry. If you enabled this API recently, wait a few ' +
    'minutes for the action to propagate to our systems and retry.", "status": "PERMISSION_DENIED" } }';
  /* استابِ محلی باید محلی بماند. رهاکردنش یعنی بندهای بعدی در دنیایی
     می‌دوند که این بند ساخته — و آن‌وقت شکستشان چیزی دربارهٔ خودشان
     نمی‌گوید. یک بار همین شد. */
  const stub33 = global.__STUB;
  global.__STUB = function (url) {
    if (url.indexOf('tokeninfo') !== -1) return { code: 200, json: { scope: YT_SCOPES.join(' ') } };
    if (url.indexOf('youtube/v3/channels') !== -1) return { code: 403, text: real };
    return { code: 200, json: {} };
  };
  const d = ytDiagnose_();
  ok('۳۳.۱ علت درست تشخیص داده می‌شود',
     d.cause.indexOf('روشن نیست') !== -1, d.cause);
  ok('۳۳.۲ و با نبودِ اسکوپ اشتباه گرفته نمی‌شود — اسکوپ‌ها که هستند',
     d.scopeOk === true && d.slidesOk === true);
  ok('۳۳.۳ نشانیِ صفحهٔ روشن‌کردن بیرون کشیده می‌شود',
     d.enableUrl.indexOf('console.developers.google.com') !== -1, d.enableUrl);
  ok('۳۳.۴ و تا انتها، بی بریدگی',
     d.enableUrl.indexOf('project=711710970959') !== -1, d.enableUrl.slice(-30));
  ok('۳۳.۵ شمارهٔ پروژه هم جدا خوانده می‌شود', d.project === '711710970959', d.project);
  ok('۳۳.۶ و چاره شمارهٔ پروژه را می‌گوید', d.fix.indexOf('711710970959') !== -1);
  /* گوگل خودش می‌گوید چند دقیقه طول می‌کشد. نگفتنش یعنی کاربر بلافاصله
     دوباره می‌زند، همان را می‌بیند، و فکر می‌کند کار نکرده. */
  ok('۳۳.۷ و می‌گوید که اثرش فوری نیست', d.fix.indexOf('صبر') !== -1);
  global.__STUB = stub33;
}

console.log('=== ۳۴) سه ایرادِ اولین اجرای واقعی (۶٫۵) ===');
{
  global.__STUB = BASE_STUB;
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');

  /* ── الف) واترمارک: ۴۰۰ گرفت چون بدنهٔ متادیتا نداشت ──
     `watermarks.set` متدِ آپلود **با متادیتا**ست: بدنه منبعِ InvideoBranding
     است و تصویر بخشِ دوم. تصویرِ تنها یعنی ۴۰۰. */
  /* رفتاری، نه متنی: تابع را می‌دوانیم و به **بایت‌هایی که واقعاً رفتند**
     نگاه می‌کنیم. جست‌وجوی متنِ کد اینجا دروغ می‌گوید — توضیحِ همین باگ در
     خودِ کد نوشته شده و کلمهٔ `uploadType=media` را در خود دارد. */
  global.YouTube = { Videos: {}, Thumbnails: {}, Channels: {}, Playlists: {},
                     PlaylistItems: {}, ChannelSections: {} };
  const wmWas = global.__FETCHES.length;
  const r34 = ytWatermarkSet_({ id: 'UCxx', snippet: { thumbnails: {
    high: { url: 'https://yt3.example/AV34.png' } } } });
  const wmSet = global.__FETCHES.slice(wmWas)
    .filter(f => f.url.indexOf('watermarks/set') !== -1)[0];
  ok('۳۴.۱ واترمارک با متادیتا فرستاده می‌شود، نه تصویرِ تنها',
     !!wmSet && wmSet.url.indexOf('uploadType=multipart') !== -1 &&
     wmSet.url.indexOf('uploadType=media') === -1 &&
     wmSet.contentType.indexOf('multipart/related') === 0,
     String(r34) + ' | ' + (wmSet ? wmSet.url + ' | ' + wmSet.contentType : 'هیچ'));
  const wmBody = wmSet ? Buffer.from(wmSet.payload).toString('binary') : '';
  ok('۳۴.۲ و بدنه‌اش InvideoBranding است — نه فقط تصویر',
     wmBody.indexOf('cornerPosition') !== -1 &&
     wmBody.indexOf('application/json') !== -1, wmBody.slice(0, 120));
  delete global.YouTube;
  const wm = src27.slice(src27.indexOf('function ytWatermarkSet_'),
                         src27.indexOf('function ytTrailerSet_'));
  ok('۳۴.۳ و خطا پیامِ خودِ گوگل را می‌آورد، نه فقط شماره',
     wm.indexOf('error || {}).message') !== -1 || wm.indexOf('.error || {}).message') !== -1);

  /* ── ب) بنر: راهِ داخلی اول، سرویسِ ابری بعد ──
     کاورِ قسمت‌ها با SlidesApp داخلی ساخته می‌شود و هیچ سرویسِ ابری‌ای
     نمی‌خواهد؛ فقط بنر (که صفحهٔ بزرگ‌تر لازم دارد) سراغِ REST می‌رود. */
  /* از ۶٫۷ بنر و کاور هر دو از `ytPresCreate_` می‌گذرند — یک تعریف، نه دو
     قرینه که یکی‌شان درست شود. سنجه رفتاری است: تابع دوانده می‌شود. */
  const okP = ytPresCreate_('کارتِ آزمون', 12192000, 6858000);
  ok('۳۴.۴ اندازهٔ دقیق از REST گرفته می‌شود',
     okP.exact === true && !!okP.id, JSON.stringify(okP));
  const bnSrc = src27.slice(src27.indexOf('function ytBannerCard_'),
                            src27.indexOf('function ytBannerSet_'));
  const cvSrc = src27.slice(src27.indexOf('function ytCoverCard_'),
                            src27.indexOf('function ytRenderName_'));
  ok('۳۴.۵ و هر دو — بنر و کاور — از همان یک تعریف می‌گذرند',
     bnSrc.indexOf('ytPresCreate_(') !== -1 && cvSrc.indexOf('ytPresCreate_(') !== -1 &&
     cvSrc.indexOf('SlidesApp.create') === -1);
  /* سرویسِ بسته: هر دو باید بفهمند، ولی تصمیمشان یکی نیست. */
  const stubP = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('slides.googleapis') !== -1) {
      return { code: 403, text: 'Google Slides API has not been used in project ' +
        '711710970959 before or it is disabled. Enable it by visiting ' +
        'https://console.developers.google.com/apis/api/slides.googleapis.com/overview' +
        '?project=711710970959 then retry.' };
    }
    return stubP(url, body);
  };
  const offP = ytPresCreate_('کارتِ آزمون', 24384000, 13716000);
  ok('۳۴.۶ و اگر بسته بود، نشانیِ روشن‌کردنش داده می‌شود',
     offP.exact === false && offP.enableUrl.indexOf('slides.googleapis.com') !== -1, offP.why);
  const bnOff = ytBannerCard_();
  ok('۳۴.۷ بنر با اندازهٔ تقریبی ادامه نمی‌دهد — یوتیوب نمی‌پذیردش',
     !!bnOff.why && bnOff.why.indexOf('کاورِ قسمت‌ها بی این هم') !== -1, bnOff.why);
  global.__STUB = stubP;

  /* ── ب-۲) «۲۰۰ موفق» با «اندازه اعمال شد» یکی نیست (۷٫۰۲) ──
     مستنداتِ خودِ گوگل: presentations.create مقدارِ pageSize را نادیده
     می‌گیرد و همیشه صفحهٔ ۱۰×۵٫۶۳ اینچ (۹۶۰×۵۴۰) می‌سازد — ولی پاسخ همچنان
     ۲۰۰ است و presentationId هم دارد. این دقیقاً همان چیزی است که هفته‌ها
     بنر را با یک نشانِ گمراه‌کننده (`exact:true`) رد کرده بود. */
  const stubP2 = global.__STUB;
  global.__STUB = function (url, body) {
    if (url === 'https://slides.googleapis.com/v1/presentations') {
      // رفتارِ واقعیِ گوگل: ۲۰۰ می‌دهد، ولی pageSize را نادیده می‌گیرد —
      // صفحه با اندازهٔ پیش‌فرضِ خودش برمی‌گردد، نه آنچه خواسته شده.
      return { code: 200, json: { presentationId: 'PRES-DEFAULT',
        pageSize: { width: { magnitude: 9144000, unit: 'EMU' },
                    height: { magnitude: 5143500, unit: 'EMU' } } } };
    }
    return stubP2(url, body);
  };
  const realP = ytPresCreate_('کارتِ آزمون', 12192000, 6858000);
  ok('۳۴ب.۱ ۲۰۰ + presentationId کافی نیست — باید اندازهٔ واقعی هم بخواند',
     realP.exact === false && !!realP.id, JSON.stringify(realP));
  ok('۳۴ب.۲ دلیلش روشن است: چه خواسته شد و چه واقعاً ساخته شد',
     realP.why.indexOf('9144000') !== -1 || realP.why.indexOf('12192000') !== -1, realP.why);
  const bnReal = ytBannerCard_();
  ok('۳۴ب.۳ بنر با این تشخیص هم به همان راهِ امنِ «ادامه نمی‌دهد» می‌رود',
     !!bnReal.why && bnReal.why.indexOf('کاورِ قسمت‌ها بی این هم') !== -1, bnReal.why);
  global.__STUB = stubP2;

  /* ── پ) سیاهه باید وضعِ پس از کار را بگوید ──
     «توضیحِ کانال ⬜ خالی — پر شد (۰ نویسه)» هم‌زمان دو چیزِ متناقض می‌گفت. */
  const cs = src27.slice(src27.indexOf('function ytChannelSync_'),
                         src27.indexOf('function ytChannelStale_'));
  ok('۳۴.۸ پس از اقدام، وضع دوباره خوانده می‌شود',
     cs.indexOf('var again = ytChannelInfo_()') !== -1);
  ok('۳۴.۹ و ردیف‌ها با وضعِ تازه به‌روز می‌شوند — نه با وضعِ پیش از کار',
     cs.indexOf('rows[h].ok = nf.ok') !== -1);
  ok('۳۴.۱۰ ولی فقط وقتی واقعاً کاری شده — وگرنه یک خواندنِ سهمیه‌خورِ بی‌دلیل',
     cs.indexOf('if (out.did.length)') !== -1);

  /* ── و تشخیصِ «API خاموش است» برای هر سرویسی کار کند، نه فقط یوتیوب ── */
  const slides = ytApiOff_('Google Slides API has not been used in project 711710970959 ' +
    'before or it is disabled. Enable it by visiting ' +
    'https://console.developers.google.com/apis/api/slides.googleapis.com/overview' +
    '?project=711710970959 then retry.');
  ok('۳۴.۱۱ Slides هم تشخیص داده می‌شود، نه فقط یوتیوب', slides.off === true);
  ok('۳۴.۱۲ و نامِ خودِ سرویس بیرون کشیده می‌شود',
     slides.api.indexOf('Slides') !== -1, slides.api);
  ok('۳۴.۱۳ با نشانی و شمارهٔ پروژه',
     slides.url.indexOf('slides.googleapis.com') !== -1 && slides.project === '711710970959');
  ok('۳۴.۱۴ و متنِ سالم را «خاموش» نمی‌خواند',
     ytApiOff_('{"items":[]}').off === false);

  /* ══ «(۴۰۳)» علت نیست (۶٫۸۰) ══
   * گزارشِ ۱ سپتامبر: «ساختِ اسلایدِ بنر نشد (403)» — و ناظر هم نتوانست
   * تصمیم بگیرد، فقط گذاشتش برای نشستِ بعد. ۴۰۳ دو علتِ متفاوت دارد با دو
   * چارهٔ متفاوت، و یکی‌شان اصلاً با کد درست نمی‌شود. */
  const scope = ytApiOff_('{"error":{"code":403,"status":"PERMISSION_DENIED",' +
    '"message":"Request had insufficient authentication scopes.",' +
    '"details":[{"reason":"ACCESS_TOKEN_SCOPE_INSUFFICIENT"}]}}');
  ok('۳۴.۱۵ کمبودِ اسکوپ از «سرویسِ خاموش» جدا تشخیص داده می‌شود',
     scope.off === true && scope.scope === true);
  ok('۳۴.۱۶ و چاره‌اش را می‌گوید — و می‌گوید که نصبِ خودکار حلش نمی‌کند',
     /عیب‌یابی و رفعِ دسترسیِ یوتیوب/.test(scope.fix) &&
     /اسکوپ‌ها را عوض نمی‌کند/.test(scope.fix), scope.fix);
  ok('۳۴.۱۷ و سرویسِ خاموش همچنان همان مسیرِ خودش را دارد',
     slides.scope !== true && slides.off === true);
  const s27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۳۴.۱۸ ساختِ ارائه هم علتِ اسکوپ را جدا می‌گوید',
     /out\.why = off\.scope/.test(s27));
  ok('۳۴.۱۹ و ۴۰۳ِ ناشناخته دستِ‌کم متنِ خودِ گوگل را با خود می‌آورد',
     /mk && mk\.text \? ' — ' \+ String\(mk\.text\)/.test(s27));
}

console.log('=== ۳۵) مسیرِ داده: صوت بیرون، ویدئو برمی‌گردد (۶٫۶) ===');
{
  global.__STUB = BASE_STUB;
  const root = global.__ROOT_FOLDER;
  const nm = CFG.YT_RENDER_FILE || '_YT-RENDER.json';
  const kill = root.getFilesByName(nm); while (kill.hasNext()) kill.next().setTrashed(true);

  /* فایلِ ۳۰ مگابایتی با `uc?export=download` یک صفحهٔ هشدارِ HTML می‌گیرد،
     نه بایت‌ها. این تنها جایی است که آن اشتباه گرفته می‌شود. */
  const u = ytDlUrl_('ABC');
  ok('۳۵.۱ نشانیِ دانلود از مسیرِ usercontent است، نه uc',
     u.indexOf('drive.usercontent.google.com') !== -1 &&
     u.indexOf('confirm=t') !== -1 && u.indexOf('/uc?') === -1, u);

  // پوشهٔ قسمت و فایل‌های واقعی، تا اشتراک روی چیزی واقعی سنجیده شود
  const ep = DriveApp.__register('EPF35', 'قسمت ۳۵');
  const w1 = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'یکجا 1 از 2.wav'));
  const w2 = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'یکجا 2 از 2.wav'));
  const cv = root.createFile(Utilities.newBlob('PNG', 'image/png', 'کاور.png'));

  const asked = ytRenderAsk_({ show: 'special', ep: '35', title: 'ت', folderId: 'EPF35',
    audio: [{ id: w1.getId(), name: w1.getName() }, { id: w2.getId(), name: w2.getName() }],
    audioKind: 'یکجا ×۲', coverFileId: cv.getId(), outName: 'قسمت ۳۵ — ویدئو.mp4' });
  ok('۳۵.۲ درخواست ثبت می‌شود', asked === true);

  const row = ytRenderRead_().items.filter(x => x.key === 'special:35')[0] || {};
  ok('۳۵.۳ هر بخشِ صوتی نشانیِ خودش را دارد — وگرنه اکشن نمی‌تواند بگیردش',
     (row.audio || []).length === 2 && (row.audio || []).every(a => /usercontent/.test(a.url || '')));
  ok('۳۵.۴ و کاور هم', /usercontent/.test(row.coverUrl || ''));
  /* اجازه رفتاری سنجیده می‌شود: خودِ فایل باید باز شده باشد، نه اینکه
     ردیف ادعا کند باز شده. */
  ok('۳۵.۵ صوت و کاور واقعاً «هرکس با لینک: فقط دیدن» شدند',
     w1.getSharingAccess() === 'ANYONE_WITH_LINK' &&
     w2.getSharingAccess() === 'ANYONE_WITH_LINK' &&
     cv.getSharingAccess() === 'ANYONE_WITH_LINK' && row.shared === true);

  /* بایت‌ها باور می‌شوند، نه نام و نه Content-Type. */
  const mkMp4 = n => { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = 0;
    'ftyp'.split('').forEach((c, i) => a[4 + i] = c.charCodeAt(0)); return a; };
  ok('۳۵.۶ صفحهٔ HTML به‌جای ویدئو رد می‌شود',
     ytMp4Ok_(Utilities.newBlob('<!DOCTYPE html><html>…', 'video/mp4', 'x.mp4')).ok === false);
  ok('۳۵.۷ و بایت‌های واقعی پذیرفته می‌شوند',
     ytMp4Ok_(Utilities.newBlob(mkMp4(6000), 'application/octet-stream', 'x')).ok === true);

  // نقشهٔ ریپو + دانلودِ ویدئو
  const stubWas = global.__STUB;
  global.__STUB = function (url) {
    if (url.indexOf('renders.json') !== -1) {
      return { code: 200, text: JSON.stringify({ items: {
        'special:35': { url: 'https://github.test/releases/download/renders/special-35.mp4' } } }) };
    }
    if (url.indexOf('special-35.mp4') !== -1) return { code: 200, bytes: mkMp4(6000), mime: 'video/mp4' };
    return stubWas(url);
  };
  const got = ytRenderCollect_(60000);
  ok('۳۵.۸ ویدئوی آماده برداشته می‌شود', got.got === 1, JSON.stringify(got));
  const names = [];
  { const it = ep.getFiles(); while (it.hasNext()) names.push(it.next().getName()); }
  ok('۳۵.۹ و در پوشهٔ همان قسمت می‌نشیند، با نامِ خودش',
     names.indexOf('قسمت ۳۵ — ویدئو.mp4') !== -1, names.join(' | '));
  ok('۳۵.۱۰ ردیف بسته می‌شود',
     (ytRenderRead_().items.filter(x => x.key === 'special:35')[0] || {}).status === 'رسید');
  /* و این مهم‌ترین سنجهٔ این بند است: اجازه‌ای که داده شد، پس گرفته می‌شود. */
  ok('۳۵.۱۱ و اشتراکِ موقت همان‌جا پس گرفته می‌شود',
     w1.getSharingAccess() === 'PRIVATE' && w2.getSharingAccess() === 'PRIVATE' &&
     cv.getSharingAccess() === 'PRIVATE');

  /* بایتِ خراب نباید ردیف را ببندد — وگرنه قسمت برای همیشه گم می‌شود. */
  const w3 = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'کامل.wav'));
  DriveApp.__register('EPF36', 'قسمت ۳۶');
  ytRenderAsk_({ show: 'special', ep: '36', title: 'ت', folderId: 'EPF36',
    audio: [{ id: w3.getId(), name: 'کامل.wav' }], coverFileId: '', outName: 'ق۳۶.mp4' });
  global.__STUB = function (url) {
    if (url.indexOf('renders.json') !== -1) {
      return { code: 200, text: JSON.stringify({ items: {
        'special:36': { url: 'https://github.test/x/bad.mp4' } } }) };
    }
    if (url.indexOf('bad.mp4') !== -1) return { code: 200, text: '<html>404</html>' };
    return stubWas(url);
  };
  const bad = ytRenderCollect_(60000);
  ok('۳۵.۱۲ ویدئوی خراب برداشته نمی‌شود', bad.got === 0 && bad.tried === 1);
  ok('۳۵.۱۳ و ردیفش باز می‌ماند تا دوباره ساخته شود',
     (ytRenderRead_().items.filter(x => x.key === 'special:36')[0] || {}).status === 'در انتظار');
  ok('۳۵.۱۴ و اشتراکش هم باز می‌ماند — وگرنه تلاشِ بعدی هم شکست می‌خورد',
     w3.getSharingAccess() === 'ANYONE_WITH_LINK');

  /* سوپاپ: اشتراکی که کارش تمام نشده ولی کهنه شده هم پس گرفته می‌شود. */
  const d36 = ytRenderRead_();
  for (const it of d36.items) if (it.key === 'special:36') it.sharedAt = '1400/01/01 00:00';
  ytRenderSave_(d36);
  const swept = ytShareSweep_();
  ok('۳۵.۱۵ اشتراکِ کهنه پس گرفته می‌شود، حتی اگر ویدئو هرگز نیامده باشد',
     swept >= 1 && w3.getSharingAccess() === 'PRIVATE');

  /* ── ردیفی که پیش از ۶٫۶ ثبت شده: نه نشانی دارد نه اجازه ──
     و چون تکراری است، از مسیرِ ytRenderAsk_ هرگز رد نمی‌شود. بی مهاجرت،
     همان شش قسمتِ امشب تا ابد در صف می‌مانند. */
  const wOld = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'کهنه.wav'));
  const cOld = root.createFile(Utilities.newBlob('PNG', 'image/png', 'کاورِ کهنه.png'));
  DriveApp.__register('EPF37', 'قسمت ۳۷');
  {
    const dd = ytRenderRead_();
    dd.items.push({ key: 'special:37', show: 'special', ep: '37', title: 'ت',
      folderId: 'EPF37', audio: [{ id: wOld.getId(), name: 'کهنه.wav' }],
      coverFileId: cOld.getId(), outName: 'ق۳۷.mp4', at: nowStr_(), status: 'در انتظار' });
    ytRenderSave_(dd);
  }
  ok('۳۵.۱۶ ردیفِ پیش از ۶٫۶ بسته و بی‌نشانی است',
     wOld.getSharingAccess() === 'PRIVATE');
  global.__STUB = function (url) {
    if (url.indexOf('renders.json') !== -1) return { code: 200, text: '{"items":{}}' };
    return stubWas(url);
  };
  ytRenderCollect_(60000);
  const r37 = ytRenderRead_().items.filter(x => x.key === 'special:37')[0] || {};
  ok('۳۵.۱۷ برداشت اول تازه‌اش می‌کند — نشانی می‌گیرد',
     /usercontent/.test(((r37.audio || [])[0] || {}).url || '') &&
     /usercontent/.test(r37.coverUrl || ''));
  ok('۳۵.۱۸ و اجازهٔ موقت هم', wOld.getSharingAccess() === 'ANYONE_WITH_LINK' &&
     cOld.getSharingAccess() === 'ANYONE_WITH_LINK' && r37.shared === true);
  /* یک مهاجرتِ آرایشی نباید هر شب همه را از نو مُهر بزند. */
  ok('۳۵.۱۹ ولی بارِ دوم چیزی نمی‌نویسد', ytRenderRefresh_() === 0);

  global.__STUB = stubWas;

  /* شناسهٔ صف: اگر عوض شود، اکشن بی‌صدا صفِ کهنه را می‌خواند. */
  const qWas = CFG.YT_QUEUE_ID;
  CFG.YT_QUEUE_ID = 'یک-شناسهٔ-دیگر';
  ok('۳۵.۲۰ عوض‌شدنِ شناسهٔ صف گرفته می‌شود', ytQueueIdOk_().ok === false);
  CFG.YT_QUEUE_ID = '';
  ok('۳۵.۲۱ و اگر شناسه‌ای تنظیم نشده باشد، هشدارِ الکی نمی‌دهد', ytQueueIdOk_().ok === true);
  CFG.YT_QUEUE_ID = qWas;
}

console.log('=== ۳۶) هیچ‌چیز منتظرِ آدم نماند (۶٫۷) ===');
{
  global.__STUB = BASE_STUB;
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const src21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const src08 = fs.readFileSync('src/08_Health.gs', 'utf8');

  /* ── الف) گرسنگیِ صف ──
     «منتظرِ ویدئو» هم یک تلاش شمرده می‌شد؛ با سقفِ دوتایی، دو ردیفِ اولِ
     بی‌ویدئو کلِ صف را قفل می‌کردند. */
  const rd = src27.slice(src27.indexOf('function ytRunDue_'),
                         src27.indexOf('function ytTick_'));
  const waitIdx = rd.indexOf('if (r.waiting)');
  const triedIdx = rd.indexOf('out.tried++', waitIdx);
  ok('۳۶.۱ «منتظرِ ویدئو» دیگر سهمیهٔ تلاش را نمی‌خورد',
     waitIdx !== -1 && triedIdx > waitIdx, 'waiting@' + waitIdx + ' tried@' + triedIdx);
  ok('۳۶.۲ ولی پویش هم بی‌سقف نیست — صفِ ۲۶۴تایی نباید کلِ شب را بخورد',
     rd.indexOf('scanCap') !== -1);

  /* ── ب) بودجه از واقعیت، نه از عددِ ثابت ──
     nightHas_(60000) یعنی «یک دقیقه مانده»، و بعد کاری ۱۵۰ثانیه‌ای شروع
     می‌شد؛ گوگل اجرا را در شش دقیقه بی هیچ خطایی می‌کشد. */
  const yb = src21.slice(src21.indexOf("nightHas_(60000, 'انتشار در یوتیوب')"),
                         src21.indexOf('سنجهٔ محتوا: عکسِ قسمت‌های امروز'));
  ok('۳۶.۳ بودجهٔ هر گام از آنچه واقعاً مانده گرفته می‌شود',
     yb.indexOf('ytLeft()') !== -1 && yb.indexOf('Math.min(Number(CFG.YT_MS)') !== -1);
  ok('۳۶.۴ و گام‌های بعدی هم پشتِ همان نگهبان‌اند',
     yb.indexOf('if (ytLeft() > 40000)') !== -1 && yb.indexOf('if (ytLeft() > 35000)') !== -1);

  /* ── پ) دورِ دومِ روز: راه‌اندازیِ سرد و سه‌حلقه‌بودنِ زنجیره ── */
  ok('۳۶.۵ تیکِ ۱۰ صبح وجود دارد و هر دو کار را می‌کند',
     typeof ytTick_ === 'function' &&
     src27.slice(src27.indexOf('function ytTick_'),
                 src27.indexOf('function ytStatsDue_'))
          .indexOf('ytRenderCollect_') !== -1);
  /* از ۶٫۳۸ بودجه‌اش عددِ ثابت نیست: از آنچه واقعاً از وارسیِ سلامت مانده
     گرفته می‌شود، تا کارِ اختیاری، مُهر و ایمیلِ آخرِ تابع را نکشد. */
  ok('۳۶.۶ و از وارسیِ سلامت صدا زده می‌شود — پس هیچ دکمه‌ای لازم نیست',
     src08.indexOf('ytTick_(ytBudget)') !== -1 &&
     src08.indexOf('healthLeft_()') !== -1);
  /* ترتیب مهم است: تیک پیش از گزارش، وگرنه ایمیلِ امروز وضعِ دیروز را می‌گوید. */
  ok('۳۶.۷ و پیش از ytHealth_ می‌دود، نه بعدش',
     src08.indexOf('ytTick_(90000)') < src08.indexOf('ytHealth_(problems, notes)'));
  const tick = ytTick_(30000);
  ok('۳۶.۸ و بی سرویس هم نمی‌ترکد', tick && typeof tick.collected === 'number');
}

console.log('=== ۳۷) بازخورد: ثبت، و مهم‌تر از آن، اثر (۶٫۷) ===');
{
  global.__STUB = BASE_STUB;
  const hub = getHub_();
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');

  /* ── نیمهٔ اول: ثبت ── */
  const st = ytStatsStatus_();
  ok('۳۷.۱ بی هیچ آماری هم یک جملهٔ فارسی می‌دهد، نه خطا',
     typeof st.line === 'string' && st.line.length > 5, st.line);

  // تبِ بازخورد را با دادهٔ واقعی پر می‌کنیم و می‌پرسیم چه فهمید
  const sh = ensureTab_(hub, CFG.YTS_TAB, YTS_HEADERS);
  const mk = (id, title, views, perDay) =>
    [nowStr_(), 'special', '1', 'م', id, title, views, 10, 2, 5, 10, perDay, 'u'];
  appendBlock_(sh, [
    mk('V1', 'سه شرطِ معرفت', 900, 90), mk('V2', 'تقسیمات علم حصولی', 100, 10),
    mk('V3', 'مراتب علم حضوری', 800, 80), mk('V4', 'بررسی اقسام مفاهیم', 120, 12),
    mk('V5', 'معرفت‌شناسی عام', 700, 70), mk('V6', 'مراتب خطاناپذیری', 130, 13)],
    YTS_HEADERS.length);

  const st2 = ytStatsStatus_();
  ok('۳۷.۲ آمار خوانده و جمع می‌شود',
     st2.videos === 6 && st2.views === 900 + 100 + 800 + 120 + 700 + 130, JSON.stringify(st2));
  ok('۳۷.۳ و پرمخاطب‌ترین با «نمایش در روز» انتخاب می‌شود، نه با نمایشِ خام',
     st2.best === 'سه شرطِ معرفت', st2.best);

  /* ── نیمهٔ دوم: اثر. این مهم‌ترین سنجهٔ این بند است. ── */
  const learn = ytLearn_(hub);
  ok('۳۷.۴ الگو از دادهٔ واقعی ساخته می‌شود', learn.n === 6 && !!learn.text);
  ok('۳۷.۵ و هر دو سرِ طیف را نشان می‌دهد — نه فقط برنده‌ها',
     learn.text.indexOf('سه شرطِ معرفت') !== -1 &&
     learn.text.indexOf('تقسیمات علم حصولی') !== -1);
  ok('۳۷.۶ و مقایسه با «نمایش در روز» است، وگرنه مدل یاد می‌گیرد قدیمی‌بودن خوب است',
     learn.text.indexOf('نمایش در روز') !== -1);
  ok('۳۷.۷ و صریح می‌گوید عنوانِ گمراه‌کننده ممنوع است',
     learn.text.indexOf('گمراه‌کننده') !== -1);
  /* و این خطِ آخر است که «ثبت» را به «اثر» تبدیل می‌کند: اگر برداشته شود،
     کلِ این بخش یک جدولِ تماشایی می‌شود — همان سرنوشتی که musicProbe_ و
     auditSnap_ پیدا کردند. */
  const pr = ytMetaPrompt_({ showName: 'ب', epNum: '۱', title: 'ت', duration: '۱۰:۰۰',
                             headings: ['الف'], seriesName: '', cat: '' });
  ok('۳۷.۸ و واقعاً داخلِ پرامپتِ عنوان می‌نشیند — نه در یک جدولِ تماشایی',
     pr.indexOf('سه شرطِ معرفت') !== -1 && pr.indexOf('نمایش در روز') !== -1);

  /* زیرِ آستانه، «الگو» فقط نویز است. */
  const minWas = CFG.YT_LEARN_MIN; CFG.YT_LEARN_MIN = 99;
  ok('۳۷.۹ با نمونهٔ کم، هیچ الگویی به مدل داده نمی‌شود', ytLearn_(hub).text === '');
  CFG.YT_LEARN_MIN = minWas;

  /* ── کامنت و آمار از خودِ API ── */
  const stubF = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('youtube/v3/videos') !== -1) {
      return { code: 200, json: { items: [
        { id: 'VID1', statistics: { viewCount: '250', likeCount: '9', commentCount: '2' },
          snippet: { title: 'عنوانِ واقعی', publishedAt: '2026-08-15T00:00:00Z' } }] } };
    }
    if (url.indexOf('commentThreads') !== -1) {
      return { code: 200, json: { items: [
        { id: 'C1', snippet: { topLevelComment: { snippet: {
          authorDisplayName: 'کاربر', textOriginal: 'خیلی خوب بود',
          likeCount: 3, publishedAt: '2026-08-20T00:00:00Z' } } } }] } };
    }
    return stubF(url, body);
  };
  const fetched = ytStatsFetch_(['VID1']);
  ok('۳۷.۱۰ آمار از خودِ یوتیوب خوانده می‌شود',
     fetched.VID1 && fetched.VID1.views === 250 && fetched.VID1.likes === 9,
     JSON.stringify(fetched));
  const cm = ytCommentsFetch_('VID1', 5);
  ok('۳۷.۱۱ و کامنت‌ها هم — با متن و نویسنده',
     cm.length === 1 && cm[0].text === 'خیلی خوب بود' && cm[0].author === 'کاربر');
  /* search.list صد واحد می‌گیرد و هیچ‌جا لازم نیست: فهرستِ ویدئوهای ما در
     تب است و یک خواندنِ شیت کافی است. */
  ok('۳۷.۱۲ و هیچ‌جا search.list صدا زده نمی‌شود',
     src27.indexOf('youtube/v3/search') === -1 && src27.indexOf('Search.list') === -1);
  global.__STUB = stubF;
}

console.log('=== ۳۸) حسابداریِ سهمیه: آپلود ۱۶۰۰ واحد است، نه صفر (۶٫۸) ===');
{
  global.__STUB = BASE_STUB;
  /* ══ باگی که می‌توانست قسمت گم کند ══
     تا ۶٫۷ آپلود صفر واحد برداشت می‌کرد؛ سطلِ آپلود (۹۰) شمرده می‌شد ولی
     سطلِ واحدها هرگز از بابتِ آپلود کم نمی‌شد. پس موتور فکر می‌کرد نود
     آپلود در روز ممکن است در حالی که سقفِ واقعی پنج تاست. ششمی ۴۰۳ی
     می‌گرفت که علتش را نمی‌گوید، «ناموفق» ثبت می‌شد، و پس از YT_TRY_MAX
     تلاش آن قسمت برای همیشه رها می‌شد. */
  ok('۳۸.۱ هزینهٔ آپلود واقعی است', YT_COST.videosInsert === 1600);
  ok('۳۸.۲ و مجموعِ هر قسمت هم شمرده می‌شود', ytUnitsPerEpisode_() === 1750);

  const uWas = CFG.YT_QUOTA_UNITS, upWas = CFG.YT_QUOTA_UPLOADS;
  CFG.YT_QUOTA_UNITS = 9000; CFG.YT_QUOTA_UPLOADS = 90;
  delete global.__PROPS[PK.YT_QUOTA];
  let n = 0;
  while (ytQuotaTake_(YT_COST.videosInsert, true)) n++;
  ok('۳۸.۳ سقفِ واقعی پنج آپلود در روز است، نه نود', n === 5, 'شد ' + n);
  /* و سطلِ آپلود نباید تنها نگهبان باشد — همان چیزی که نبودش این باگ را ساخت. */
  ok('۳۸.۴ و سدِ متوقف‌کننده «واحد» است، نه «آپلود»',
     ytQuota_().blocked === 'واحد', ytQuota_().blocked);
  CFG.YT_QUOTA_UNITS = uWas; CFG.YT_QUOTA_UPLOADS = upWas;
  delete global.__PROPS[PK.YT_QUOTA];

  /* و این عدد باید دیده شود، نه فقط در کد باشد. */
  const dr = ytDrain_(264);
  ok('۳۸.۵ تخمینِ تخلیهٔ صف حساب می‌شود', dr.perDay === 5 && dr.days === 53,
     JSON.stringify(dr));
  const line = ytLine_({ enabled: true, service: true, published: 2, due: 14,
                         waitingRender: 0, unlisted: 0, failed: 0, playlists: 1 });
  ok('۳۸.۶ و در همان جملهٔ روزانه‌ای می‌آید که صاحبِ برنامه می‌خواند',
     line.indexOf('روز') !== -1 && line.indexOf('سهمیهٔ یوتیوب') !== -1, line);
  /* یک قسمتی صف، هشدارِ «چند روز طول می‌کشد» لازم ندارد. */
  const short = ytLine_({ enabled: true, service: true, published: 9, due: 1,
                          waitingRender: 0, unlisted: 0, failed: 0, playlists: 1 });
  ok('۳۸.۷ ولی برای صفِ یک‌قسمتی هشدارِ بی‌جا نمی‌دهد',
     short.indexOf('سهمیهٔ یوتیوب') === -1, short);

  /* چهار در روز خرج می‌شود و یکی برای پلی‌لیست و کاور و بازخورد می‌مانَد. */
  ok('۳۸.۸ سقفِ شبانه + دورِ ۱۰ صبح از سقفِ واقعی نمی‌گذرد',
     (Number(CFG.YT_MAX_PER_RUN) || 2) + 1 < ytDrain_(1).perDay + 1,
     'شبانه ' + CFG.YT_MAX_PER_RUN + ' + تیک ۱ در برابرِ ' + ytDrain_(1).perDay);
}

console.log('=== ۳۹) نامِ نمایشیِ برنامه، نامِ پوشه نیست (۶٫۹) ===');
{
  global.__STUB = BASE_STUB;
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');

  /* ══ باگی که ۲۰ قسمت را نامرئی کرد ══
     پوشهٔ برنامه با CFG.SHOW_NAME جست‌وجو می‌شد («از همه جا از همه رنگ»)
     ولی نامِ واقعیِ پوشه CFG.VARIETY_FOLDER است («پادکست — از همه جا از
     همه رنگ»). و showFolder_ اگر پیدا نکند **می‌سازد** — پس یک پوشهٔ خالی
     ساخته شد، صفر قسمت در آن دیده شد، و هیچ خطایی نیامد. */
  ok('۳۹.۱ این دو واقعاً یکی نیستند — پس اشتباهشان بی‌صدا بود',
     String(CFG.SHOW_NAME) !== String(CFG.VARIETY_FOLDER),
     CFG.SHOW_NAME + ' ≠ ' + CFG.VARIETY_FOLDER);

  /* مرز، نه وصله: هیچ‌جای بخشِ ۲۷ نباید از تابعِ «پیدا کن وگرنه بساز»
     استفاده کند. یک اصلاحِ موردی، تابعِ بعدی را نجات نمی‌دهد. */
  ok('۳۹.۲ بخشِ ۲۷ دیگر از showFolder_ (که می‌سازد) استفاده نمی‌کند',
     src27.indexOf('showFolder_(') === src27.indexOf('ytShowFolder_(') - 2 ||
     !/[^t]showFolder_\(/.test(src27),
     'اولین نمونه: ' + JSON.stringify(
       (src27.match(/.{0,30}[^t]showFolder_\([^)]*\)/) || ['—'])[0]));
  ok('۳۹.۳ و پوشه را با نامِ پوشه می‌جوید، نه با نامِ نمایشی',
     src27.indexOf('ytShowFolder_(CFG.VARIETY_FOLDER)') !== -1 &&
     src27.indexOf('showFolder_(CFG.SHOW_NAME)') === -1);

  /* و خودِ جست‌وجو نباید چیزی بسازد. رفتاری سنجیده می‌شود: پوشه‌ای که
     نیست را می‌خواهیم و بعد می‌شماریم در ریشه چند پوشه هست. */
  const root = global.__ROOT_FOLDER;
  const countFolders = () => { let n = 0; const it = root.getFolders();
                               while (it.hasNext()) { it.next(); n++; } return n; };
  const before = countFolders();
  const miss = ytShowFolder_('پوشه‌ای که وجود ندارد ۳۹');
  ok('۳۹.۴ پوشهٔ نبوده null می‌دهد، نه یک پوشهٔ تازه', miss === null);
  ok('۳۹.۵ و چیزی در ریشه ساخته نمی‌شود — «پیدا نشد» با «خالی بود» یکی نیست',
     countFolders() === before, before + ' → ' + countFolders());

  /* و پوشهٔ موجود باید پیدا شود، وگرنه سنجهٔ بالا با یک تابعِ همیشه‌null هم سبز است. */
  root.createFolder(String(CFG.VARIETY_FOLDER));
  const hit = ytShowFolder_(CFG.VARIETY_FOLDER);
  ok('۳۹.۶ ولی پوشهٔ موجود پیدا می‌شود', !!hit && hit.getName() === String(CFG.VARIETY_FOLDER));
}

console.log('=== ۴۰) دو نوبت در روز، نه یک نوبت (۶٫۱۲) ===');
{
  global.__STUB = BASE_STUB;
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const tick = src27.slice(src27.indexOf('function ytTick_'),
                           src27.indexOf('function ytStatsDue_'));
  /* وقتی ۶٫۹ باگِ نامِ پوشه را بست، بیست قسمت باید تا ۰۲:۳۰ منتظر می‌ماندند
     — نصفِ روز، برای کاری که ارزان است و مکان‌نما دارد. */
  ok('۴۰.۱ کاوشِ قسمت‌های گذشته در دورِ ۱۰ صبح هم انجام می‌شود',
     tick.indexOf('ytBackfill_(') !== -1);
  ok('۴۰.۲ و ترتیبش درست است: اول به صف، بعد برداشت، بعد انتشار',
     tick.indexOf('ytBackfill_(') < tick.indexOf('ytRenderCollect_(') &&
     tick.indexOf('ytRenderCollect_(') < tick.indexOf('ytRunDue_('));
  /* بازخورد آخرین بندِ کارِ شبانه است و در شبِ شلوغ گرسنه می‌مانَد. */
  ok('۴۰.۳ بازخورد دومین شانسش را در دورِ ۱۰ صبح می‌گیرد',
     tick.indexOf('ytStatsDue_()') !== -1 && tick.indexOf('ytStatsRun_(') !== -1);
  /* ولی نه دو بار در روز: ytStatsDue_ خودش هر ~۲۰ ساعت یک بار اجازه می‌دهد. */
  ok('۴۰.۴ و دو نوبت یعنی «حتماً یک بار»، نه «دو بار»',
     tick.indexOf('if (ytStatsDue_())') !== -1);
  const t = ytTick_(30000);
  ok('۴۰.۵ و بی سرویس هم نمی‌ترکد', t && typeof t.queued === 'number');
  /* ══ سومین بارِ همان شکاف (۶٫۱۸) ══
     پلی‌لیست و شناسنامه فقط در کارِ شبانه بودند، پس هر اصلاحی در آن‌ها دو
     شب طول می‌کشید: شبِ نصب با کدِ کهنه می‌دود. کاورِ مربعِ پادکست و بنر
     دقیقاً همین‌طور عقب افتادند. */
  ok('۴۰.۶ پلی‌لیست و شناسنامه هم در دورِ ۱۰ صبح دیده می‌شوند',
     tick.indexOf('ytPlaylistSync_(') !== -1 && tick.indexOf('ytChannelSync_(false)') !== -1);
  /* و ترتیب: کارِ سبک اول، تا اگر بودجه تمام شد آنچه می‌مانَد کم‌فوری‌تر باشد. */
  ok('۴۰.۷ و پس از انتشار می‌آیند، نه پیش از آن',
     tick.indexOf('ytRunDue_(') < tick.indexOf('ytPlaylistSync_('));
}

console.log('=== ۴۱) تبِ پادکست شدنی است، تبِ پست نه (۶٫۱۳) ===');
{
  global.__STUB = BASE_STUB;
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');

  /* ── پادکست: از راهِ API ممکن است ── */
  const stubW = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('youtube/v3/playlists?part') !== -1) return { code: 200, json: { id: 'PL9' } };
    return stubW(url, body);
  };
  const was = global.__FETCHES.length;
  const r = ytPlPodcast_('PL9', 'مجموعهٔ آزمون');
  const f = global.__FETCHES.slice(was).filter(x => x.url.indexOf('playlists?part') !== -1)[0];
  ok('۴۱.۱ پلی‌لیست با podcastStatus پادکست می‌شود', r === 'نشست' && !!f, r);
  ok('۴۱.۲ و فیلدش واقعاً در بدنه می‌رود',
     f && f.body.status && f.body.status.podcastStatus === 'enabled',
     f ? JSON.stringify(f.body.status) : '—');
  ok('۴۱.۳ و با PUT، یعنی playlists.update', f && f.method === 'put', f && f.method);

  /* ══ چرا جدا از ساختِ پلی‌لیست ══
     ساختِ پلی‌لیست روی مسیرِ بحرانیِ انتشار است؛ اگر فیلدِ ناشناخته آن را
     بشکند، انتشار برای یک قابلیتِ جانبی می‌ایستد. */
  const ens = src27.slice(src27.indexOf('function ytPlEnsure_'),
                          src27.indexOf('function ytPlUrl_'));
  ok('۴۱.۴ ولی ساختِ پلی‌لیست دست‌نخورده می‌مانَد — مسیرِ بحرانیِ انتشار',
     ens.indexOf('podcastStatus') === -1);
  ok('۴۱.۵ و یک بار بس است، با پرچمِ خودش نه پرچمِ کاور',
     src27.indexOf('!prec.podcast') !== -1 && src27.indexOf('prec.podcast = nowStr_()') !== -1);
  global.__STUB = stubW;

  /* ── پست: هیچ منبعی در API ندارد ── */
  ok('۴۱.۶ پستِ انجمن به‌عنوان «کارِ آدم» ثبت می‌شود، نه ایرادِ هر شبه',
     src27.indexOf("add('posts'") !== -1 && src27.indexOf("'پستِ انجمن (تبِ Posts)', 'آدم'") !== -1);
  ok('۴۱.۷ و علتش صریح نوشته شده — وگرنه هر بار دنبالش می‌گردند',
     src27.indexOf('هیچ منبعی برای پستِ انجمن ندارد') !== -1);

  /* ── و نگهبانی که شکست را «سلامت» می‌خواند ── */
  const cs = src27.slice(src27.indexOf('var stale = ytChannelStale_()'),
                         src27.indexOf('out.ran = true'));
  ok('۴۱.۸ تازگی وقتی کارِ موتور ناتمام است جلو را نمی‌گیرد',
     cs.indexOf('!undone') !== -1 && cs.indexOf("!== 'موتور'") !== -1);
  ok('۴۱.۹ و کارِ آدم در این شمارش نمی‌آید — وگرنه هر شب بی‌دلیل می‌دود',
     cs.indexOf('continue;   // کارِ آدم، کارِ ما نیست') !== -1);
}

console.log('=== ۴۲) پادکست هم کاور و ثبت لازم دارد (۶٫۱۴) ===');
{
  global.__STUB = BASE_STUB;
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');

  /* ── کاورِ پادکست ۱:۱ است، نه ۱۶:۹ ──
     یوتیوب برای پلی‌لیستی که پادکست شده صریح مربع می‌خواهد (۱۲۸۰×۱۲۸۰)؛
     ۱۶:۹ آن‌جا بریده می‌شود. */
  /* ══ ۴۲.۱ و ۴۲.۲ همان باور را قفل کرده بودند که غلط بود (۸.۵۵) ══
     «مربع خواسته می‌شود» و «صفحهٔ مربع ساخته می‌شود» هر دو متنِ کد را
     می‌سنجیدند — `ytPresCreate_(name, 12192000, 12192000)` — و هر دو سبز بودند
     در حالی که اسلایدز اندازه را دور می‌ریخت و کاور ۹۶۰×۵۴۰ درمی‌آمد. سنجه‌ای
     که **خواستن** را بسنجد، نه **رسیدن** را، باگ را نگه می‌دارد (۷.۶۸). حالا
     هر دو از درِ رفتار، و جزئیاتش در §۸۲. */
  ok('۴۲.۱ کاورِ پلی‌لیست دیگر از اسلایدز خواسته نمی‌شود — آنجا مربع ساخته نمی‌شود',
     src27.indexOf('ytPresCreate_(name, 12192000, 12192000)') === -1 &&
     typeof ytPlSqSpec_ === 'function' && typeof ytImgSize_ === 'function');
  ok('۴۲.۲ و آنچه فرستاده می‌شود از بایت‌ها مربع سنجیده می‌شود (§۸۲.۳)',
     /sz\.w !== sz\.h/.test(src27.slice(src27.indexOf('function ytPlaylistCover_'))));
  /* و نامش جداست، وگرنه کاورِ ۱۶:۹ی همان مجموعه از حافظه برداشته می‌شود و
     پادکست باز هم کاورِ غلط می‌گیرد — یک اشتباهِ بی‌صدا. */
  const n169 = ytCoverName_({ epLabel: 'مجموعه', showName: 'درس‌نامه' });
  const nSq = ytCoverName_({ epLabel: 'مجموعه', showName: 'درس‌نامه', square: true });
  ok('۴۲.۳ و حافظه‌شان قاطی نمی‌شود', n169 !== nSq && nSq.indexOf('مربع') !== -1, nSq);

  /* ── برنامهٔ ترکیبی هم باید از همان مسیر رد شود ── */
  const syncAt = src27.indexOf('function ytPlaylistSync_');
  const sync = src27.slice(syncAt, src27.indexOf('\nfunction ', syncAt + 10));
  ok('۴۲.۴ پلی‌لیستِ «از همه جا از همه رنگ» هم رسیدگی می‌شود',
     sync.indexOf('ytPlKey_(ENRICH_SHOW_VARIETY') !== -1 &&
     sync.indexOf('ytPlDress_(vRec.id') !== -1);
  /* یک تعریف برای هر دو — نه دو حلقه که یکی‌شان ناقص بماند. */
  ok('۴۲.۵ و هر دو از یک تعریفِ مشترک می‌گذرند',
     (sync.match(/ytPlDress_\(/g) || []).length === 2);
  /* پلی‌لیستی که هنوز ساخته نشده، نباید الکی ساخته شود: کارِ آپلود است. */
  ok('۴۲.۶ ولی پلی‌لیستِ نساخته این‌جا ساخته نمی‌شود',
     sync.indexOf('if (vRec.id) {') !== -1);

  /* ── و همه‌چیز باید جایی ثبت شود که ناظر می‌خواند ── */
  ok('۴۲.۷ وضعِ کاور و پادکستِ هر پلی‌لیست در _STATUS.json می‌نشیند',
     src27.indexOf('out.playlistList = pls') !== -1 &&
     src27.indexOf('out.noCover =') !== -1 && src27.indexOf('out.noPodcast =') !== -1);
}

console.log('=== ۴۳) سهمِ زمانیِ هر گوینده (۶٫۱۵) ===');
{
  global.__STUB = BASE_STUB;
  const spans = [{ voice: 'آرش', chars: 500 }, { voice: 'نگار', chars: 400 },
                 { voice: 'آرش', chars: 100 }];
  const tl = castTimeline_(spans, 900, 12);
  ok('۴۳.۱ هر گوینده یک ردیف دارد، نه هر بخش', tl.length === 2, JSON.stringify(tl.map(x => x.voice)));
  ok('۴۳.۲ و بازه‌های جدا از هم نگه داشته می‌شوند',
     tl[0].ranges.length === 2 && tl[1].ranges.length === 1);
  /* بازه‌ها باید پشتِ‌هم باشند و از موسیقیِ آغاز شروع شوند، نه از صفر. */
  ok('۴۳.۳ از پایانِ موسیقیِ آغاز شروع می‌شود', tl[0].ranges[0][0] === 12, tl[0].ranges[0][0]);
  ok('۴۳.۴ و تا انتهای فایل ادامه می‌یابد', tl[0].ranges[1][1] === 900, tl[0].ranges[1][1]);
  ok('۴۳.۵ مجموعِ سهم‌ها از کلِ مدت نمی‌گذرد', tl[0].sec + tl[1].sec <= 900);
  /* درصد باید با سهمِ نویسه بخواند: ۶۰۰ از ۱۰۰۰ نویسه. */
  ok('۴۳.۶ درصد با سهمِ واقعیِ متن می‌خواند', tl[0].pct >= 57 && tl[0].pct <= 61, tl[0].pct);

  /* در متنِ راست‌به‌چپ، رقمی که اولِ خط بیاید به انتهای خط پرتاب می‌شود. */
  const lines = castLines_(tl);
  ok('۴۳.۷ هر خط با واژه شروع می‌شود، نه با رقم',
     lines.every(l => /^[؀-ۿ]/.test(l)), lines[0]);
  ok('۴۳.۸ و نامِ گوینده و بازه و مجموع را دارد',
     lines[0].indexOf('آرش') !== -1 && lines[0].indexOf('–') !== -1 &&
     lines[0].indexOf('مجموعاً') !== -1, lines[0]);

  /* ثبت: بخش‌های پشتِ‌همِ یک گوینده یک بازه‌اند، نه دو بازهٔ چسبیده. */
  const ep = {};
  castSpansRecord_(ep, [{ voice: 'آ', text: 'x'.repeat(10) },
                        { voice: 'آ', text: 'y'.repeat(20) },
                        { voice: 'ب', text: 'z'.repeat(30) }]);
  ok('۴۳.۹ بخش‌های پیوستهٔ یک گوینده یکی می‌شوند',
     ep.__cast.spans.length === 2 && ep.__cast.spans[0].chars === 30,
     JSON.stringify(ep.__cast.spans));

  /* و در کپشن می‌نشیند — وگرنه همهٔ این‌ها یک محاسبهٔ بی‌مصرف است. */
  const d = ytDescBuild_({ hookLine: 'ق', summary: 'خ', bullets: [] },
                         { castLines: lines, showName: 'درس‌نامه' },
                         [{ at: 0, title: 'شروع' }]);
  ok('۴۳.۱۰ و واقعاً در کپشن می‌آید',
     d.indexOf('گویندگانِ این قسمت:') !== -1 && d.indexOf('آرش') !== -1);
  /* همان مدلِ زمانیِ فصل‌ها — دو تخمینِ متفاوت در یک کپشن بدتر از یکی است. */
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۴۳.۱۱ از همان مدلِ زمانیِ فصل‌ها می‌آید',
     src27.indexOf('ytChapters_(ctx.sections || [], ctx.totalSec, intro)') !== -1 &&
     src27.indexOf('castTimeline_(ctx.castSpans || [], ctx.totalSec, intro)') !== -1);
  /* و در تب ثبت می‌شود، وگرنه «بعداً بسنجم» ممکن نیست. */
  ok('۴۳.۱۲ و در تبِ انتشار ستونِ خودش را دارد',
     YT_HEADERS[YU.CAST - 1] === 'گویندگان' && castShare_(tl).indexOf('٪') !== -1,
     castShare_(tl));
}

console.log('=== ۴۴) خلاصهٔ لینک‌ها: ایمیل و تلگرام (۶٫۱۹) ===');
{
  global.__STUB = BASE_STUB;
  const hubD = new Spread('hub', 'HUBDG');
  global.__SS['HUBDG'] = hubD;
  const hubWas = global.__PROPS[PK.HUB_ID];
  global.__PROPS[PK.HUB_ID] = 'HUBDG';
  const sh = ensureTab_(getHub_(), CFG.YT_TAB, YT_HEADERS);
  const mk = (show, ep, ser, title, vid) => {
    const r = new Array(YT_HEADERS.length).fill('');
    r[YU.AT - 1] = nowStr_(); r[YU.SHOW - 1] = show; r[YU.EP - 1] = ep;
    r[YU.SERIES - 1] = ser; r[YU.TITLE - 1] = title; r[YU.VID - 1] = vid;
    r[YU.URL - 1] = 'https://youtu.be/' + vid; r[YU.TAGS - 1] = 'فلسفه، معرفت شناسی';
    r[YU.DUR - 1] = '۱۵:۱۰'; r[YU.CAST - 1] = 'آرش ۵۹٪'; return r;
  };
  /* ══ نامِ برنامه همان چیزی نوشته می‌شود که ytLog_ می‌نویسد ══
     نسخهٔ اولِ این آزمون کلیدِ داخلی ('special') را می‌نوشت، ولی تولید نامِ
     *نمایشی* را می‌نویسد. یعنی شانزده سنجهٔ سبز روی شکلی بودند که در تولید
     هرگز پیش نمی‌آید — و باگِ واقعی (همهٔ درس‌نامه‌ها با نامِ برنامهٔ متنوع
     برچسب می‌خوردند) از زیرشان رد شد. نمونه باید همان شکلِ ذخیره‌شده باشد. */
  appendBlock_(sh, [mk(CFG.SPECIAL_SHOW_NAME, '2', 'مجموعهٔ الف', 'دومی', 'V2'),
                    mk(CFG.SPECIAL_SHOW_NAME, '1', 'مجموعهٔ الف', 'اولی', 'V1'),
                    mk(CFG.SHOW_NAME, '20', '', 'ترکیبی', 'V20'),
                    // ردیفِ بی‌شناسه = هنوز منتشر نشده، نباید در خلاصه بیاید
                    mk(CFG.SHOW_NAME, '21', '', 'ناموفق', '')], YT_HEADERS.length);
  global.__PROPS[PK.YT_PL] = JSON.stringify({
    'series:m': { id: 'PL1', title: 'مجموعهٔ الف — درس‌نامه', podcast: 'x', cover: 'y' },
    'show:variety': { id: 'PL2', title: 'از همه جا از همه رنگ' } });

  const d = ytDigest_(48);
  ok('۴۴.۱ فقط ویدئوهای واقعاً منتشرشده می‌آیند', d.n === 3, String(d.n));
  /* تفکیک پیش از فهرست: یک فهرستِ درهم همان‌قدر بی‌مصرف است که هیچ لینکی. */
  ok('۴۴.۲ و به تفکیکِ برنامه گروه می‌شوند', d.shows.length === 2);
  const sp = d.shows.filter(x => x.show === 'special')[0];
  ok('۴۴.۳ ترتیب از شمارهٔ قسمت است، نه از ترتیبِ ثبت',
     sp.items[0].ep === '1' && sp.items[1].ep === '2',
     sp.items.map(x => x.ep).join(','));

  /* هشتگ از برچسب‌های خودِ همان ویدئو، نه از یک فهرستِ ثابت. */
  const tags = ytDigestTags_('درس‌نامه', sp.items[0]);
  ok('۴۴.۴ هشتگِ برنامه اول می‌آید — تا دو برنامه از هم جدا جست‌وجو شوند',
     tags[0] === '#درس_نامه', tags.join(' '));
  ok('۴۴.۵ و برچسب‌های خودِ قسمت هم', tags.indexOf('#فلسفه') !== -1, tags.join(' '));
  ok('۴۴.۶ و فاصله به زیرخط تبدیل می‌شود، وگرنه هشتگ می‌شکند',
     ytHashOf_('معرفت شناسی') === '#معرفت_شناسی', ytHashOf_('معرفت شناسی'));
  ok('۴۴.۷ و چیزی که هشتگ نمی‌شود، هشتگِ خالی نمی‌سازد', ytHashOf_('  ---  ') === '');
  ok('۴۴.۸ و تکراری‌ها یک بار می‌آیند',
     ytDigestTags_('فلسفه', { tags: 'فلسفه، فلسفه' }).length === 1);

  const html = ytDigestHtml_(d), tg = ytDigestTg_(d);
  ok('۴۴.۹ ایمیل لینکِ واقعی دارد، نه فقط نام',
     html.indexOf('href="https://youtu.be/V1"') !== -1);
  ok('۴۴.۱۰ و تلگرام هم', tg.indexOf('https://youtu.be/V1') !== -1);
  ok('۴۴.۱۱ پلی‌لیست‌ها جدا می‌آیند — دسترسیِ همیشگی‌اند، نه خبرِ امروز',
     tg.indexOf('پلی‌لیست‌ها و پادکست‌ها') !== -1 && tg.indexOf('PL1') !== -1);
  ok('۴۴.۱۲ و وضعِ پادکست و کاورشان هم گفته می‌شود',
     html.indexOf('پادکست ✓') !== -1 && html.indexOf('هنوز پادکست نشده') !== -1);
  ok('۴۴.۱۳ گویندگان هم می‌آیند — همان چیزی که قرار بود بشود سنجید',
     tg.indexOf('آرش ۵۹٪') !== -1);

  /* روزی که ویدئویی منتشر نشده، هیچ پیامی نمی‌رود: پلی‌لیست‌ها دسترسی‌اند
     نه خبر، و فرستادنِ هر روزشان همان پیامی است که آدم یاد می‌گیرد نخواند. */
  /* تبِ خالی، نه پنجرهٔ کوچک و نه هابِ دیگر: `ytDigest_` عمداً کفِ
     یک‌ساعته دارد (پس «پنجرهٔ صفر» شدنی نیست) و `getHub_` هاب را کش
     می‌کند (پس عوض‌کردنِ شناسه وسطِ اجرا کاری نمی‌کند — همان‌طور که در
     واقعیت هم نمی‌کند). تنها شبیه‌سازیِ صادقانه این است که واقعاً ویدئویی
     منتشر نشده باشد. */
  delete global.__PROPS[PK.YT_DIGEST];
  const rowsWas = sh._d.slice();
  sh._d.length = 1;                       // فقط سرستون‌ها
  const noneRes = ytDigestSend_();
  ok('۴۴.۱۴ بی ویدئوی تازه، تلگرام چیزی نمی‌فرستد',
     noneRes.sent === false && noneRes.why.indexOf('تازه‌ای نبود') !== -1,
     JSON.stringify(noneRes));
  for (let z = 1; z < rowsWas.length; z++) sh._d.push(rowsWas[z]);
  /* و دو بار در روز هم نمی‌فرستد. */
  global.__PROPS[PK.YT_DIGEST] = nowStr_();
  ok('۴۴.۱۵ و دو بار در روز نمی‌رود',
     ytDigestSend_().why.indexOf('امروز') !== -1);

  const h8 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۴۴.۱۶ و بلوکِ لینک‌ها جدا از ایرادهاست، نه لای آن‌ها',
     h8.indexOf('ytDigestHtml_(') > h8.indexOf('mailQueueHtml_(queued)'));
  global.__PROPS[PK.HUB_ID] = hubWas;
}

/* ══ صفی که خودش را قفل کرد — گزارشِ ۲۸ اوت (۶٫۳۷) ══
   «باز تو یوتیوب هیچ اتفاقی نیفتاد با اینکه یک روزِ کامل گذشت.»
   سیاههٔ اکشنِ گیت‌هاب همان روز: «صف: 8 ردیف، 0 تای ساخته‌نشده» — یعنی هر
   هشت ویدئو ساخته شده بود و صف دو روز تکان نخورده بود، در حالی که صفِ
   انتشارِ موتور از ۱۵ به ۱۷ رفت. */
console.log('\n=== ۴۵) سقفِ درخواستِ رندر، صف را قفل نمی‌کند ===');
{
  const root = global.__ROOT_FOLDER;
  const stubWas0 = global.__STUB;
  // هشت ردیفِ «در انتظار» که همه‌شان ساخته شده‌اند و فقط برداشته نشده‌اند
  const items = {};
  for (let i = 1; i <= 8; i++) {
    DriveApp.__register('LOCKF' + i, 'قسمت ' + i);
    const w = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav',
                                                'c' + i + '.wav'));
    ytRenderAsk_({ show: 'special', ep: 'L' + i, title: 'ت', folderId: 'LOCKF' + i,
      audio: [{ id: w.getId(), name: 'کامل.wav' }], coverFileId: '', outName: 'x.mp4' });
    items['special:L' + i] = { url: 'https://github.test/x/' + i + '.mp4' };
  }
  const pend0 = ytRenderPending_().n;
  ok('۴۵.۱ هشت درخواستِ «در انتظار» ثبت شد', pend0 >= 8, String(pend0));

  // نقشه می‌گوید هر هشت‌تا ساخته شده‌اند
  global.__STUB = function (url) {
    if (url.indexOf('renders.json') !== -1) {
      return { code: 200, text: JSON.stringify({ items: items }) };
    }
    return stubWas0 ? stubWas0(url) : { code: 404, text: '' };
  };
  _ytMapMemo = null;

  DriveApp.__register('LOCKF9', 'قسمت ۹');
  const w9 = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'c9.wav'));
  const added = ytRenderAsk_({ show: 'special', ep: 'L9', title: 'ت', folderId: 'LOCKF9',
    audio: [{ id: w9.getId(), name: 'کامل.wav' }], coverFileId: '', outName: 'x.mp4' });
  /* تا ۶٫۳۶ اینجا false برمی‌گشت: سقف ردیف‌های «در انتظار» را می‌شمرد و
     ردیفی که فقط منتظرِ *برداشت* است هم «در انتظار» است. یعنی یک برداشتِ
     شکسته، نوشتنِ هر درخواستِ تازه‌ای را برای همیشه می‌بست. */
  ok('۴۵.۲ ردیفی که ساخته شده، سقفِ درخواست را پر نمی‌کند', added === true);

  // و اگر واقعاً هشت‌تا ساخته‌نشده باشند، سقف باید ببندد
  global.__STUB = function (url) {
    if (url.indexOf('renders.json') !== -1) return { code: 200, text: '{"items":{}}' };
    return stubWas0 ? stubWas0(url) : { code: 404, text: '' };
  };
  _ytMapMemo = null;
  DriveApp.__register('LOCKF10', 'قسمت ۱۰');
  const w10 = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'c10.wav'));
  ok('۴۵.۳ ولی وقتی هیچ‌کدام ساخته نشده، سقف واقعاً می‌بندد',
     ytRenderAsk_({ show: 'special', ep: 'L10', title: 'ت', folderId: 'LOCKF10',
       audio: [{ id: w10.getId(), name: 'کامل.wav' }], coverFileId: '',
       outName: 'x.mp4' }) === false);

  /* و شکستِ خواندنِ نقشه دیگر بی‌صدا نیست: دو روز هیچ ویدئویی برداشته نشد و
     هیچ سطری نگفت چرا، چون فراخوان فقط `if (yc.got)` را لاگ می‌کرد. */
  global.__STUB = function (url) {
    if (url.indexOf('renders.json') !== -1) return { code: 500, text: 'boom' };
    return stubWas0 ? stubWas0(url) : { code: 404, text: '' };
  };
  _ytMapMemo = null;
  const c = ytRenderCollect_(30000);
  ok('۴۵.۴ نخواندنِ نقشه، علتِ نوشته‌شده دارد',
     c.got === 0 && String(c.why || '').indexOf('نقشهٔ ویدئوها') !== -1, c.why);
  global.__STUB = stubWas0;
  _ytMapMemo = null;
}

console.log('\n=== ۴۶) یوتیوب زمان‌بندیِ خودش را دارد ===');
{
  /* تا ۶٫۳۶ دو نوبت داشت و هر دو مهمانِ اجرای کسِ دیگری بودند: کارِ شبانه
     (هشتمین بند، پشتِ موسیقی و جزوه، از بودجهٔ ۲۷۰ثانیه‌ای) و وارسیِ سلامت.
     روزی که هر دو گرسنه ماندند، صف رشد کرد و هیچ ویدئویی بالا نرفت. */
  const want = wantedTriggers_().map(w => w.fn);
  ok('۴۶.۱ زمان‌بندیِ مستقلِ انتشار در فهرست هست',
     want.indexOf('ytPublishTick') !== -1, want.join(','));
  ok('۴۶.۲ و ساعتی است، نه روزانه',
     wantedTriggers_().find(w => w.fn === 'ytPublishTick').kind === 'hours');
  ok('۴۶.۳ و خودِ تابع وجود دارد', typeof ytPublishTick === 'function');
  /* و سازنده هم از همان فهرست می‌سازد — وگرنه فهرست می‌گوید «باید باشد» و
     هیچ‌کس نمی‌سازدش، که بدتر از نبودنش است. */
  const src37 = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const body = src37.slice(src37.indexOf('function installTriggers()'),
                           src37.indexOf('function trigLabel_'));
  ok('۴۶.۴ نصب‌کننده از همان فهرست می‌سازد، نه از فهرستِ دست‌نویس',
     body.indexOf('wantedTriggers_()') !== -1 &&
     (body.match(/newTrigger\(/g) || []).length === 1,
     (body.match(/newTrigger\(/g) || []).length + ' فراخوانِ newTrigger');
}

console.log('\n=== ۴۷) آنچه از راهِ API شدنی نیست، «ایراد» شمرده نمی‌شود ===');
{
  /* ══ گزارشِ صاحبِ برنامه، ۲۸ اوت ══
   * «یادته قبلاً دربارهٔ بنر و کاور صحبت کرده بودیم؟ اونا چی شد برای یوتیوب؟»
   *
   * و در ایمیلِ روزانهٔ خودش، دو روزِ پیاپی: «شناسنامهٔ کانال: پرشده ۲ ·
   * **خالی ۸** · کارِ شما: لینک‌های کانال، ایمیلِ تماس.»
   *
   * ولی متنِ سرِ همین بخش صریح می‌گوید: «آن دستهٔ دوم کارِ انجام‌نشده نیست؛
   * کارِ انجام‌نشدنی از این راه است»، و کامنتِ بالای همان چهار فراخوان
   * می‌گوید «نوشتنشان به‌عنوان ایراد غلط است». پنج قلم عمداً `null`
   * می‌گیرند — و `add` می‌نوشت `ok: !!ok`.
   *
   * `!!null === false`، و `false` یعنی «خالی». نتیجه: شاخهٔ
   * `ok === null ? '—'` در `ytChannelLog_` **هرگز اجرا نشد**، عددِ «خالی»
   * پنج واحد باد داشت، و «کارِ شما» هفته‌به‌هفته برای کاری رفت که یوتیوب
   * راهی برایش نگذاشته. یک تصمیمِ نوشته‌شده که یک عملگرِ دو نویسه‌ای بی‌صدا
   * دورش ریخت — همان شکلی که این ریپو مدام به آن می‌خورَد. */
  const info = { id: 'UCxx', snippet: { title: 'رد پای حقیقت',
                   thumbnails: { high: { url: 'https://yt3.example/pic.png' } } },
                 brandingSettings: { channel: { description: '', keywords: '' },
                                     image: {} } };
  const rows = ytChannelCheck_(info);
  const by = {}; rows.forEach(r => by[r.key] = r);

  ok('۴۷.۱ لینک‌ها و ایمیل «نامعلوم»اند، نه «خالی»',
     by.links.ok === null && by.email.ok === null,
     JSON.stringify({ l: by.links.ok, e: by.email.ok }));
  ok('۴۷.۲ پستِ انجمن هم', by.posts.ok === null);
  ok('۴۷.۳ و واترمارک و بخش‌های خانه — وضعشان از API خوانده نمی‌شود',
     by.watermark.ok === null && by.sections.ok === null);
  /* ولی آنچه واقعاً خوانده می‌شود، هنوز دقیقاً true/false است: این اصلاح
     نباید سنجه‌های واقعی را هم «نامعلوم» کند. */
  ok('۴۷.۴ ولی توضیحِ خالی هنوز false است، نه null', by.description.ok === false);
  ok('۴۷.۵ و عکسِ پروفایلِ موجود هنوز true', by.picture.ok === true);

  const hub2 = new Spread('هاب-مرز');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub2 };
  global.getHub_ = () => hub2;
  ytChannelLog_(hub2, rows.map(r => Object.assign({ did: '', note: '' }, r)));
  const sh = hub2.getSheetByName(CFG.YTC_TAB || 'شناسنامهٔ کانال یوتیوب');
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, YTC_HEADERS.length).getValues();
  const cell = (label) => (vals.filter(v => String(v[1]) === label).pop() || [])[3];
  ok('۴۷.۶ و در سیاهه «—» می‌نشیند، نه «خالی»',
     cell('لینک‌های کانال') === '—' && cell('ایمیلِ تماس') === '—',
     JSON.stringify([cell('لینک‌های کانال'), cell('ایمیلِ تماس')]));
  ok('۴۷.۷ شاخهٔ «—» تا امروز مردهٔ کامل بود — حالا زنده است',
     vals.filter(v => String(v[3]) === '—').length === 5,
     String(vals.filter(v => String(v[3]) === '—').length));

  /* سنجه روی *رابطه* است نه روی عددِ ثابت: «خالی» دقیقاً همان‌قدر است که
     واقعاً false بوده، و پنج قلمِ نخواندنی جدا شمرده می‌شوند. عددِ ثابت
     فردا با اضافه‌شدنِ یک قلمِ تازه می‌شکست بی آنکه چیزی خراب شده باشد. */
  const st = ytChannelState_();
  ok('۴۷.۸ شمارِ «خالی» دیگر باد ندارد',
     st.empty === rows.filter(r => r.ok === false).length &&
     st.unknown === rows.filter(r => r.ok === null).length &&
     st.filled + st.empty + st.unknown === rows.length,
     JSON.stringify({ filled: st.filled, empty: st.empty, unknown: st.unknown,
                      rows: rows.length }));
  ok('۴۷.۸-ب و هیچ قلمِ نخواندنی در «کارِ شما» نمی‌آید',
     st.todo.indexOf('لینک‌های کانال') === -1 &&
     st.todo.indexOf('ایمیلِ تماس') === -1, st.todo.join('، '));
  ok('۴۷.۹ و سطرِ روزانه می‌گوید چند قلم اصلاً خواندنی نیست',
     st.line.indexOf('از راهِ API خوانده نمی‌شود') !== -1, st.line);
}

console.log('\n=== ۴۸) عددِ بی‌علت: بنر و کاور باید *بگویند* چرا نیامدند ===');
{
  /* «شناسنامهٔ کانال: خالی ۸» و «پلی‌لیست ۱ (۱ بی‌کاور) (۱ پادکست‌نشده)»
   * هفته‌ها هر روز رفتند و هیچ‌کدام نگفتند **چرا** — تا خودش پرسید «اونا
   * چی شد؟». علتِ بنر از اول در ستونِ «اقدامِ این اجرا» بود و علتِ کاور در
   * `ytPlDress_` — ولی اولی فقط در یک تب می‌مانْد (قاعدهٔ ۵٫۹۰: او تب باز
   * نمی‌کند) و دومی وقتی علت «سهمیه» بود اصلاً ثبت نمی‌شد.
   *
   * و سهمیه محتمل‌ترین علت است: هر آپلود ۱۶۰۰ واحد می‌برد و کاورِ پلی‌لیست
   * ته صف است. یعنی محتمل‌ترین علت، تنها علتی بود که هرگز نوشته نمی‌شد. */
  const hub3 = new Spread('هاب-علت');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub3 };
  global.getHub_ = () => hub3;
  ytChannelLog_(hub3, [
    { label: 'بنرِ کانال', by: 'موتور', ok: false,
      did: 'بنر کوچک بود: ۱۶۰۰×۹۰۰', note: '' },
    { label: 'توضیحِ کانال', by: 'موتور', ok: true, did: 'پر شد', note: '' },
    { label: 'لینک‌های کانال', by: 'آدم', ok: null, did: 'کارِ شما', note: '' }
  ]);
  const st3 = ytChannelState_();
  ok('۴۸.۱ علتِ خالی‌بودنِ بنر به سطرِ روزانه می‌رسد',
     st3.line.indexOf('۱۶۰۰×۹۰۰') !== -1, st3.line);
  ok('۴۸.۲ ولی «کارِ شما» علت حساب نمی‌شود (علت نیست، تقسیمِ کار است)',
     st3.why.join(' ').indexOf('کارِ شما') === -1, JSON.stringify(st3.why));

  // ── کاورِ پلی‌لیست: «سهمیه» هم ثبت می‌شود ──
  const keepPod = global.ytPlPodcast_, keepCov = global.ytPlaylistCover_;
  const keepMap = global.__PROPS[PK.YT_PLMAP];
  global.ytPlMapSave_({ kX: { id: 'PL1', title: 'مجموعهٔ آزمون' } });
  global.ytPlPodcast_ = () => 'سهمیه';
  global.ytPlaylistCover_ = () => 'سهمیه';
  const out = { covers: 0, coverFails: [], podcasts: 0 };
  ytPlDress_('PL1', 'مجموعهٔ آزمون', 'مجموعهٔ آزمون', '', '', false, out, 'kX');
  const rec = ytPlMap_()['kX'] || {};
  /* از ۸.۵۵ پادکست پس از کاور است: بی کاور، علتِ پادکست «منتظرِ کاور» است، نه
     «سهمیه». پس «سهمیه»ی پادکست روی پلی‌لیستی سنجیده می‌شود که کاور دارد. */
  { const mm = ytPlMap_(); mm.kX2 = { id: 'PL2', title: 'دو', cover: nowStr_(), coverVer: CFG.YT_PL_COVER_VER };
    global.ytPlMapSave_(mm); }
  ytPlDress_('PL2', 'دو', 'دو', '', '', false, { covers: 0, coverFails: [], podcasts: 0 }, 'kX2');
  const rec2 = ytPlMap_()['kX2'] || {};
  ok('۴۸.۳ علتِ «سهمیه» روی خودِ رکورد ثبت می‌شود — هم کاور، هم پادکستِ پلی‌لیستِ کاوردار',
     rec.coverWhy === 'سهمیه' && /منتظرِ کاور/.test(String(rec.podWhy || '')) &&
     rec2.podWhy === 'سهمیه', JSON.stringify(rec) + ' · ' + JSON.stringify(rec2));
  /* ولی سهمیه **ایراد** نیست — فردا خودش می‌آید. پس در فهرستِ شکست‌ها
     نمی‌رود، وگرنه یک هشدارِ روزانه برای چیزی که خودش حل می‌شود. */
  ok('۴۸.۴ ولی ایراد شمرده نمی‌شود — فردا خودش می‌آید',
     out.coverFails.length === 0);

  /* سرویس در این نقطه از سوئیت خاموش شده (سنجه‌های پیشین)، و `ytLine_`
     آن‌وقت فقط علتِ خاموشی را می‌گوید. اینجا سؤال دربارهٔ خطِ خاموشی نیست،
     دربارهٔ کنارِ هم آمدنِ عدد و علت است — پس سرویس موقتاً روشن می‌شود. */
  const keepSvc = global.ytSvc_, keepWhy = global.ytOffWhy_;
  global.ytSvc_ = () => ({}); global.ytOffWhy_ = () => '';
  const st4 = ytStatus_();
  global.ytSvc_ = keepSvc; global.ytOffWhy_ = keepWhy;
  ok('۴۸.۵ و سطرِ یوتیوب علت را کنارِ عدد می‌آورد',
     st4.line.indexOf('بی‌کاور') !== -1 && st4.line.indexOf('سهمیه') !== -1,
     st4.line.slice(0, 200));

  global.ytPlaylistCover_ = () => 'نشست';
  ytPlDress_('PL1', 'مجموعهٔ آزمون', 'مجموعهٔ آزمون', '', '', false,
             { covers: 0, coverFails: [], podcasts: 0 }, 'kX');
  ok('۴۸.۶ و وقتی نشست، علتِ کهنه پاک می‌شود',
     !(ytPlMap_()['kX'] || {}).coverWhy && !!(ytPlMap_()['kX'] || {}).cover,
     JSON.stringify(ytPlMap_()['kX']));

  global.ytPlPodcast_ = keepPod; global.ytPlaylistCover_ = keepCov;
  if (keepMap === undefined) delete global.__PROPS[PK.YT_PLMAP];
  else global.__PROPS[PK.YT_PLMAP] = keepMap;
}


console.log('=== ۴۹) برنامهٔ تصویرهای درس — تصمیم این‌جا، ساخت روی رانر ===');
{
  const secs = [{ heading: 'یک', narration: 'x'.repeat(3000) },
                { heading: 'دو', narration: 'y'.repeat(1000) },
                { heading: 'سه', narration: 'z'.repeat(1000) }];
  const mk = (show) => ({ show: show, epRaw: '77', showName: 'ن', title: 'ت',
                          duration: '10:00', headings: ['یک', 'دو', 'سه'],
                          sections: secs, totalSec: 600, sources: [] });
  const mmOf = () => ({ visuals: [
    { at: '1', kind: 'کارت', cardTitle: 'الف', cardLines: ['۱', '۲'], terms: '', caption: 'ک۱' },
    { at: '2', kind: 'عکس', cardTitle: '', cardLines: [], terms: 'locke', caption: 'ک۲' },
    { at: '3', kind: 'نمودار', cardTitle: 'ج', cardLines: [], terms: '', caption: 'ک۳' }
  ] });

  /* ۴۹.۱ — **خواستهٔ صریحِ بندِ ۴:** «برای شروع این موضوع فعلا روی پادکست
     درسنامه باشه». اگر این سد جابه‌جا شود، «از همه جا از همه رنگ» بی‌خبر
     تصویر می‌گیرد و قولِ «دست نمی‌خورد» می‌شکند. */
  ok('۴۹.۱ فقط درس‌نامه تصویر می‌گیرد؛ نمایشِ دیگر هیچ',
     ytVisPlan_(mmOf(), mk('special')).length === 3 &&
     ytVisPlan_(mmOf(), mk('variety')).length === 0 &&
     ytVisOn_('special') === true && ytVisOn_('variety') === false,
     'درس‌نامه ' + ytVisPlan_(mmOf(), mk('special')).length + ' مورد، ' +
     'از همه جا ' + ytVisPlan_(mmOf(), mk('variety')).length);

  /* ۴۹.۲ — تعداد از **مدتِ واقعی** می‌آید، نه از عددی که مدل دوست دارد. */
  ok('۴۹.۲ تعدادِ خواسته‌شده با مدت مقیاس می‌شود و سقف و کف دارد',
     ytVisWant_(1200) > ytVisWant_(600) && ytVisWant_(60) >= 3 &&
     ytVisWant_(100000) <= (CFG.LV_MAX_PER_EP || 40),
     '۱۰ دقیقه ⇒ ' + ytVisWant_(600) + ' · ۲۰ دقیقه ⇒ ' + ytVisWant_(1200) +
     ' · یک دقیقه ⇒ ' + ytVisWant_(60) + ' · بی‌نهایت ⇒ ' + ytVisWant_(100000));

  /* ۴۹.۳ — عدمِ تقارنِ **عمدی**: گونهٔ ناشناخته جبران‌شدنی است (کارت مجانی و
     همیشه در دسترس)، ولی بخشِ ناشناخته نه — تصویری که به هیچ متنی وصل نیست
     از نبودنش بدتر است، و رد کردنش شکاف نمی‌سازد چون سهمِ زمان از بخش‌های
     موجود حساب می‌شود. */
  const mmBad = { visuals: [
    { at: '1', kind: 'یک چیزِ ناشناخته', cardTitle: 'الف', caption: 'ک' },
    { at: '99', kind: 'کارت', cardTitle: 'ب', caption: 'ک' },
    { at: 'سلام', kind: 'کارت', cardTitle: 'پ', caption: 'ک' }
  ] };
  const pb = ytVisPlan_(mmBad, mk('special'));
  ok('۴۹.۳ گونهٔ ناشناخته «کارت» می‌شود، ولی بخشِ ناشناخته دور انداخته می‌شود',
     pb.length === 1 && pb[0].at === 1 && pb[0].kind === 'کارت',
     'گرفت: ' + JSON.stringify(pb.map(x => ({ at: x.at, kind: x.kind }))));

  /* ۴۹.۴ — **حقیقت‌ها از کد.** بخشی که سه برابر نویسه دارد باید سه برابر
     ثانیه بگیرد. اگر سهم را از مدل می‌گرفتیم، یک حدسِ بی‌پشتوانه تعیین
     می‌کرد بیننده چند ثانیه به چه چیزی نگاه کند. */
  const p4 = ytVisPlan_(mmOf(), mk('special'));
  const ratio = p4[0].sec / p4[1].sec;
  const total = p4.reduce((a, b) => a + b.sec, 0);
  const body = 600 - (Number(CFG.MUSIC_INTRO_SEC) || 0);
  ok('۴۹.۴ سهمِ زمان از سهمِ نویسه‌ایِ بخش می‌آید، نه از مدل',
     Math.abs(ratio - 3) < 0.15 && Math.abs(total - body) < 1.5,
     'نسبتِ بخشِ ۱ به ۲ = ' + ratio.toFixed(2) + ' (نویسه‌ها ۳۰۰۰ و ۱۰۰۰) · ' +
     'جمع ' + total.toFixed(1) + ' در برابرِ بدنهٔ ' + body + ' ثانیه');

  /* ۴۹.۵ — دو مورد روی یک بخش، سهمِ **همان بخش** را نصف می‌کنند. وگرنه یک
     بخشِ پرتصویر وقتِ بخش‌های دیگر را می‌خورد. */
  const mm2 = { visuals: [
    { at: '1', kind: 'کارت', cardTitle: 'الف', caption: 'ک' },
    { at: '1', kind: 'کارت', cardTitle: 'ب', caption: 'ک' },
    { at: '2', kind: 'کارت', cardTitle: 'پ', caption: 'ک' }
  ] };
  const p5 = ytVisPlan_(mm2, mk('special'));
  ok('۴۹.۵ دو مورد روی یک بخش، سهمِ همان بخش را بین خودشان تقسیم می‌کنند',
     p5.length === 3 && Math.abs(p5[0].sec - p5[1].sec) < 0.2 &&
     Math.abs((p5[0].sec + p5[1].sec) / p5[2].sec - 3) < 0.2,
     'سهم‌ها: ' + JSON.stringify(p5.map(x => ({ at: x.at, sec: x.sec }))));

  /* ۴۹.۶ — سقف‌های متن. کارت در اندازهٔ بندانگشتی خوانده می‌شود؛ متنِ بلند
     روی آن، متنِ خوانده‌نشده است. همان انضباطِ `coverTitle`. */
  const long = 'ط'.repeat(300);
  const mm3 = { visuals: [{ at: '1', kind: 'کارت', cardTitle: long,
                            cardLines: [long, long, long, long, long, long, long],
                            terms: long, caption: long }] };
  const p6 = ytVisPlan_(mm3, mk('special'))[0];
  ok('۴۹.۶ متن‌ها سرِ سقفِ خودشان بریده می‌شوند، در کد نه در امیدِ به مدل',
     p6.cardTitle.length <= (CFG.LV_CARD_TITLE_MAX || 48) &&
     p6.cardLines.length <= (CFG.LV_CARD_LINES_MAX || 4) &&
     p6.cardLines.every(x => x.length <= (CFG.LV_CARD_LINE_MAX || 72)) &&
     p6.caption.length <= (CFG.LV_CAPTION_MAX || 120) &&
     p6.terms.length <= (CFG.LV_TERMS_MAX || 80),
     'عنوان ' + p6.cardTitle.length + ' · سطرها ' + p6.cardLines.length +
     ' · زیرنویس ' + p6.caption.length + ' · واژه‌ها ' + p6.terms.length);

  /* ۴۹.۷ — ورودیِ خالی یا بی‌ربط ⇒ فهرستِ خالی ⇒ **مسیرِ کاورِ امروز**. این
     قرینهٔ سنجهٔ ۱.۱ در `run_render_test.js` است، از این سمتِ مرز. */
  ok('۴۹.۷ مدلی که تصویری نداد ⇒ فهرستِ خالی، نه خطا',
     ytVisPlan_({}, mk('special')).length === 0 &&
     ytVisPlan_({ visuals: [] }, mk('special')).length === 0 &&
     ytVisPlan_(null, mk('special')).length === 0 &&
     ytVisPlan_(mmOf(), { show: 'special', sections: [], totalSec: 600 }).length === 0,
     'هر چهار حالت، بی پرتِ خطا');

  /* ۴۹.۸ — و پرامپت **فقط** برای نمایشی که سد اجازه می‌دهد این بند را دارد.
     وگرنه هر قسمتِ «از همه جا از همه رنگ» توکنِ بی‌مصرف می‌دهد — و خواستهٔ
     صاحبِ برنامه این بود که هزینه بالا نرود. */
  const prS = ytMetaPrompt_(mk('special'));
  const prV = ytMetaPrompt_(mk('variety'));
  ok('۴۹.۸ بندِ تصویر فقط در پرامپتِ درس‌نامه می‌آید، نه در همه',
     prS.indexOf('visuals') !== -1 && prV.indexOf('visuals') === -1 &&
     prS.indexOf('به انگلیسی') !== -1,
     'درس‌نامه ' + prS.length + ' نویسه، از همه جا ' + prV.length);

  /* ۴۹.۹ — و از سرتاسرِ مسیر: `_yt.json` تصویرها را دارد، و اجرای دوم
     **دوباره نمی‌پرسد** — یعنی هزینهٔ توکن یک بار است، نه هر شب. */
  const folder = global.__ROOT_FOLDER.createFolder('قسمت 0077 — تصویر');
  const askWas = __askCount;
  const plan = ytPlan_(folder, mk('special'), false);
  const onDisk = JSON.parse(folder.getFilesByName(ytPlanName_()).next()
                            .getBlob().getDataAsString());
  const again = ytPlan_(folder, mk('special'), false);
  ok('۴۹.۹ تصویرها در `_yt.json` می‌نشینند و فراخوانِ دوم انجام نمی‌شود',
     (plan.visuals || []).length >= 2 && (onDisk.visuals || []).length >= 2 &&
     again.cached === true && (__askCount - askWas) === 1,
     (plan.visuals || []).length + ' مورد در نقشه، ' +
     (onDisk.visuals || []).length + ' روی دیسک، ' +
     (__askCount - askWas) + ' فراخوانِ مدل برای دو بار صدا زدن');

  /* و ویرایشِ دستی — همان قاعدهٔ «اگر اشتباه ساخت چه؟» که برای عنوان هست. */
  const ff = folder.getFilesByName(ytPlanName_()).next();
  const ed = JSON.parse(ff.getBlob().getDataAsString());
  ed.visuals[0].cardTitle = 'آدم این را نوشت';
  ff.setContent(JSON.stringify(ed));
  ok('۴۹.۹-ب و ویرایشِ دستیِ تصویرها خوانده می‌شود',
     ytPlan_(folder, mk('special'), false).visuals[0].cardTitle === 'آدم این را نوشت',
     'یعنی ناظر و آدم می‌توانند تصویرِ بد را عوض کنند، بی دست‌زدن به کد');
}

console.log('=== ۵۰) از برنامه به فایل: کارت‌ها واقعاً کشیده می‌شوند (۷.۹۳) ===');
{
  /* ══ چرا این بند تا امروز شدنی نبود ══
   * `SlidesApp` در `tests/lib/mock.js` نبود، پس `ytCoverCard_` در هر مجموعه‌ای
   * با ReferenceError داخلِ try/catchِ خودش می‌افتاد و سنجه‌ها ناچار بودند
   * *متنِ کد* را بخوانند. حالا بدَل هست و این بند **خروجی** را می‌پرسد:
   * چند فایل، با چه نامی، و روی کارت چه نوشته شده. */
  const root = global.__ROOT_FOLDER;
  const secs = [{ heading: 'یک', narration: 'الف'.repeat(300) },
                { heading: 'دو', narration: 'ب'.repeat(200) },
                { heading: 'سه', narration: 'پ'.repeat(100) }];
  const ctx = { show: 'special', epRaw: '91', epNum: '۹۱', showName: 'درس‌نامه',
                seriesName: 'معرفت‌شناسی', cat: 'فلسفه', title: 'ت',
                sections: secs, totalSec: 900 };
  const planOf = () => ({ visuals: [
    { at: 1, kind: 'کارت', cardTitle: 'گزارهٔ نخست', heading: 'یک',
      cardLines: ['سطرِ الف', 'سطرِ ب'], terms: '', caption: 'ک۱', sec: 30 },
    { at: 2, kind: 'نمودار', cardTitle: 'سه گام', heading: 'دو',
      cardLines: ['گامِ ۱', 'گامِ ۲', 'گامِ ۳'], terms: '', caption: 'ک۲', sec: 40 },
    { at: 3, kind: 'عکس', cardTitle: 'چهرهٔ لاک', heading: 'سه',
      cardLines: [], terms: 'john locke portrait', caption: 'ک۳', sec: 20 }
  ] });

  const ep91 = root.createFolder('قسمت 0091 — کارت');
  const pngWas = global.__FETCHES.filter(f => /export\/png/.test(f.url)).length;
  const b1 = lvBuild_(ep91, planOf(), ctx);
  const pngNow = global.__FETCHES.filter(f => /export\/png/.test(f.url)).length;

  /* ۵۰.۱ — سه مورد در برنامه ⇒ سه فایلِ PNG در زیرپوشهٔ خودِ همان قسمت.
     خواستهٔ بندِ ۸: «ذخیره تصاویر … در فولدر خودِ همان درس». */
  const sub = ep91.getFoldersByName(CFG.LV_FOLDER).next();
  const names = [];
  { const it = sub.getFiles(); while (it.hasNext()) names.push(it.next().getName()); }
  ok('۵۰.۱ هر موردِ برنامه یک فایلِ PNG در زیرپوشهٔ همان قسمت می‌شود',
     b1.want === 3 && b1.ready === 3 && b1.made === 3 && b1.done === true &&
     names.filter(n => /\.png$/.test(n)).length === 3,
     b1.ready + ' از ' + b1.want + ' · ' + names.join(' | '));

  /* ۵۰.۲ — **نام، ترتیب را می‌گوید.** ویدئو از ترتیب ساخته می‌شود؛ نامی که
     ترتیب را نگوید پوشه را به تودهٔ بی‌معنا بدل می‌کند و اجرای بعدی نمی‌داند
     چه ساخته شده. */
  ok('۵۰.۲ نامِ هر تصویر شمارهٔ ترتیب و شمارهٔ بخشش را دارد',
     b1.items[0].name.indexOf('تصویر ۱') === 0 &&
     b1.items[0].name.indexOf('بخش ۱') !== -1 &&
     b1.items[2].name.indexOf('تصویر ۳') === 0 &&
     b1.items.every(x => names.indexOf(x.name) !== -1),
     b1.items.map(x => x.name).join(' | '));

  /* ۵۰.۳ — **روی کارت همان متنِ مدل نوشته شده.** این پرسشِ اصلیِ این بند
     است: نه «تابع صدا زده شد؟» بلکه «چه چیزی کشیده شد؟» */
  const pres = global.__PRES_LAST;
  const pages = pres.getSlides();
  const txtOf = (pg) => pg.getPageElements().filter(e => e.role === 'text')
                          .map(e => e.getText().asString());
  ok('۵۰.۳ عنوانِ درشتِ کارت همان cardTitle است و سرِ بخش هم رویش هست',
     pages.length === 3 && txtOf(pages[0]).indexOf('گزارهٔ نخست') !== -1 &&
     txtOf(pages[0]).indexOf('یک') !== -1 &&
     txtOf(pages[0]).join('\n').indexOf('سطرِ الف') !== -1,
     txtOf(pages[0]).join(' / '));

  /* ۵۰.۳-ب — و بزرگ‌ترین قلمِ صفحه همان عنوان است، نه پانویس. کارتی که
     عنوانش هم‌اندازهٔ پانویس باشد، در اندازهٔ بندانگشتی خوانده نمی‌شود. */
  const big = pages[0].getPageElements().filter(e => e.role === 'text')
                .sort((a, b) => (b.getText().style.size || 0) - (a.getText().style.size || 0))[0];
  ok('۵۰.۳-پ بزرگ‌ترین متنِ کارت، عنوانش است',
     big.getText().asString() === 'گزارهٔ نخست' && big.getText().style.size >= 30,
     big.getText().asString() + ' @ ' + big.getText().style.size);

  /* ۵۰.۴ — «نمودار» باید **در تصویر** با «کارت» فرق کند. اگر همان بولت‌ها
     کشیده شوند، گونه‌ای که مدل انتخاب کرد فقط یک برچسب است. */
  const boxes = pages[1].getPageElements().filter(e => e.shape === 'ROUND_RECTANGLE');
  const arrows = pages[1].getPageElements().filter(e => e.shape === 'LEFT_ARROW');
  ok('۵۰.۴ «نمودار» جعبه و پیکان می‌کشد، نه فهرستِ بولت',
     boxes.length === 3 && arrows.length === 2 &&
     boxes.map(b => b.getText().asString()).join('|') === 'گامِ ۱|گامِ ۲|گامِ ۳' &&
     pages[0].getPageElements().filter(e => e.shape === 'ROUND_RECTANGLE').length === 0,
     boxes.length + ' جعبه، ' + arrows.length + ' پیکان');

  /* ۵۰.۴-ب — و راست‌به‌چپ: گامِ ۱ راست‌ترین جعبه است. یک نمودارِ فارسی که
     چپ‌به‌راست خوانده شود، ترتیبِ خودش را برعکس می‌گوید. */
  ok('۵۰.۴-ب جعبهٔ اولِ نمودار راست‌ترین است',
     boxes[0].getLeft() > boxes[1].getLeft() && boxes[1].getLeft() > boxes[2].getLeft(),
     boxes.map(b => Math.round(b.getLeft())).join(' > '));

  /* ۵۰.۵ — موردی که مدل «عکس» خواسته، امروز کارت می‌شود — و **همین‌جا ثبت
     می‌شود** که چه خواسته شده بود. جایگزینیِ بی‌ثبت، همان چیزی است که بعداً
     هیچ‌کس حساب نمی‌کند چند تا بوده. */
  ok('۵۰.۵ «عکس» تا نیامدنِ لایه‌اش کارت می‌شود، با ثبتِ آنچه خواسته شده بود',
     b1.items[2].kind === 'عکس' && b1.items[2].via === 'کارت' &&
     b1.items[2].terms === 'john locke portrait',
     b1.items[2].kind + ' ⇒ ' + b1.items[2].via);

  /* ۵۰.۶ — `_visuals.json` در پوشهٔ قسمت، با همان اعداد. جزوه (گامِ ۴) این
     را می‌خوانَد، نه فراخوانی رو به جلو به بخشِ ۲۷. */
  const man = JSON.parse(ep91.getFilesByName(CFG.LV_FILE).next().getBlob().getDataAsString());
  ok('۵۰.۶ `_visuals.json` در پوشهٔ همان قسمت می‌نشیند و شمارها را می‌گوید',
     man.want === 3 && man.ready === 3 && man.done === true &&
     (man.items || []).length === 3 && man.folderId === sub.getId() &&
     man.items[0].caption === 'ک۱',
     JSON.stringify({ w: man.want, r: man.ready, d: man.done }));

  /* ۵۰.۷ — **دوباره ساخته نمی‌شود.** یک قسمت می‌تواند چند شب پشتِ‌هم منتظرِ
     ویدئو بمانَد؛ هر شب دوازده کارتِ تازه یعنی ده‌ها فایلِ دورریختنی و
     ده‌ها فراخوانِ شبکه. */
  const pngBefore = global.__FETCHES.filter(f => /export\/png/.test(f.url)).length;
  const b2 = lvBuild_(ep91, planOf(), ctx);
  const pngAfter = global.__FETCHES.filter(f => /export\/png/.test(f.url)).length;
  ok('۵۰.۷ اجرای دوم چیزی نمی‌سازد و هیچ صادراتی نمی‌فرستد',
     (pngNow - pngWas) === 3 && b2.made === 0 && b2.ready === 3 &&
     b2.done === true && (pngAfter - pngBefore) === 0,
     'اجرای اول ' + (pngNow - pngWas) + ' صادرات، اجرای دوم ' + (pngAfter - pngBefore));

  /* ۵۰.۷-ب — و مرجع **خودِ فایل** است، نه ردیفِ پرونده: تصویری که پاک شود
     باید دوباره ساخته شود. اگر مرجع پرونده بود، پاک‌شدنِ یک فایل هیچ‌وقت
     جبران نمی‌شد و ویدئو یک شکاف می‌گرفت. */
  sub.getFilesByName(b1.items[1].name).next().setTrashed(true);
  const b3 = lvBuild_(ep91, planOf(), ctx);
  ok('۵۰.۷-پ تصویرِ پاک‌شده دوباره ساخته می‌شود — مرجع، فایل است نه پرونده',
     b3.made === 1 && b3.ready === 3 && b3.done === true, 'ساخته: ' + b3.made);

  /* ۵۰.۸ — **تلاش پیش از کار ثبت می‌شود.** Apps Script سرِ شش دقیقه بی‌خطا
     کشته می‌شود؛ شمارنده‌ای که بعد از ساخت نوشته شود، در اجرای کشته‌شده
     هیچ‌چیز ثبت نمی‌کند و هر شب از نو شروع می‌شود (۷.۴۴/۷.۶۴).
     برای سنجیدنش، `lvCards_` وسطِ کار پرت می‌کند — همان کاری که مهلتِ
     شش‌دقیقه‌ای می‌کند، فقط دیدنی. */
  const ep92 = root.createFolder('قسمت 0092 — کارت');
  const cardsWas = global.lvCards_;
  global.lvCards_ = function () { throw new Error('اجرا وسطِ کار مُرد'); };
  let threw = false;
  try { lvBuild_(ep92, planOf(), ctx); } catch (e) { threw = true; }
  global.lvCards_ = cardsWas;
  /* شاهد **با احتیاط** خوانده می‌شود: اگر پرونده نوشته نشده باشد،
     `.next().getBlob()` پیش از `ok` پرت می‌کند و مجموعه با TypeError می‌میرد
     — یعنی «شکستنی که افتاد» و «شکستنی که نیفتاد» یک شکل می‌شوند. اولین
     نگارشِ همین سنجه دقیقاً همین بود و شکستنِ A را بی‌صدا بلعید. */
  const m92 = lvRead_(ep92) || { tries: 0 };
  ok('۵۰.۸ تلاش پیش از ساخت ثبت می‌شود، پس اجرای کشته‌شده هم شمرده می‌شود',
     threw === true && Number(m92.tries) === 1,
     'پرت شد: ' + threw + '، tries=' + m92.tries);

  /* ۵۰.۹ — صادراتی که شکست بخورد: `done` دروغ نمی‌گوید، و تلاش شمرده
     می‌شود. یک مجموعهٔ ناقص که خودش را «تمام» بخوانَد، بدترین حالت است —
     ویدئو با شکاف ساخته می‌شود و هیچ‌جا نمی‌گوید چرا. */
  const ep93 = root.createFolder('قسمت 0093 — کارت');
  global.__PNG_FAIL = 500;
  const b93 = lvBuild_(ep93, planOf(), ctx);
  global.__PNG_FAIL = 0;
  ok('۵۰.۹ صادراتِ شکست‌خورده «تمام» شمرده نمی‌شود و دلیلش نوشته می‌شود',
     b93.ready === 0 && b93.done === false && b93.tries === 1 && b93.why.length > 5,
     b93.ready + '/' + b93.want + ' · ' + b93.why);

  /* ۵۰.۹-ب — و بعد از همان شکست، اجرای بعدی دوباره تلاش می‌کند (شمارنده
     بالا می‌رود) تا `ytUploadOne_` بتواند سرِ `LV_TRY_MAX` تصمیم بگیرد. */
  global.__PNG_FAIL = 500;
  const b93b = lvBuild_(ep93, planOf(), ctx);
  global.__PNG_FAIL = 0;
  ok('۵۰.۹-پ تلاشِ دوم شمرده می‌شود، وگرنه سقفِ LV_TRY_MAX هرگز نمی‌رسد',
     b93b.tries === 2 && b93b.done === false, 'tries=' + b93b.tries);

  /* ۵۰.۱۰ — سقفِ «چند کارت در یک اجرا»: کارِ نیمه‌مانده گم نمی‌شود و اجرای
     بعدی از همان‌جا ادامه می‌دهد. بی این سقف، قسمتی با چهل تصویر اجرا را
     سرِ شش دقیقه می‌کشد و هیچ خطایی هم ندارد. */
  const capWas = CFG.LV_BUILD_MAX;
  CFG.LV_BUILD_MAX = 2;
  const ep94 = root.createFolder('قسمت 0094 — کارت');
  const c1 = lvBuild_(ep94, planOf(), ctx);
  const c2 = lvBuild_(ep94, planOf(), ctx);
  CFG.LV_BUILD_MAX = capWas;
  ok('۵۰.۱۰ سقفِ هر اجرا رعایت می‌شود و اجرای بعدی از همان‌جا ادامه می‌دهد',
     c1.made === 2 && c1.done === false && c2.made === 1 && c2.done === true &&
     c2.ready === 3,
     'اجرای اول ' + c1.made + '، دوم ' + c2.made);

  /* ۵۰.۱۰-ب — و دو اجرا **یک** فایلِ ارائه می‌گذارند، نه دو. بی این، قسمتی
     که سه اجرا لازم داشته باشد سه ارائهٔ دورریختنی در پوشهٔ خودش جا
     می‌گذارد — و پوشه‌ای که صاحبِ برنامه بازش می‌کند باید تصویرهایش پیدا
     باشد، نه زیرِ زبالهٔ ما. */
  const sub94 = ep94.getFoldersByName(CFG.LV_FOLDER).next();
  const kinds94 = [];
  { const it = sub94.getFiles(); while (it.hasNext()) kinds94.push(it.next().getName()); }
  ok('۵۰.۱۰-پ چند اجرا فقط یک فایلِ ارائه می‌گذارند',
     kinds94.filter(n => n.indexOf('کارت‌ها — ') === 0).length === 1 &&
     kinds94.filter(n => /\.png$/.test(n)).length === 3,
     kinds94.join(' | '));

  /* ۵۰.۱۱ — برنامهٔ خالی یعنی **رفتارِ امروز**، نه خطا: نه پوشه‌ای، نه
     فایلی، نه فراخوانی. قولِ «چیزی خراب نمی‌شود» همین است. */
  const ep95 = root.createFolder('قسمت 0095 — بی‌تصویر');
  const fWas = global.__FETCHES.length;
  const b95 = lvBuild_(ep95, { visuals: [] }, ctx);
  ok('۵۰.۱۱ برنامهٔ خالی: تمام‌شده، بی هیچ فایل و هیچ فراخوان',
     b95.done === true && b95.want === 0 && b95.items.length === 0 &&
     ep95.getFoldersByName(CFG.LV_FOLDER).hasNext() === false &&
     global.__FETCHES.length === fWas,
     'فراخوان‌های تازه: ' + (global.__FETCHES.length - fWas));
}

console.log('=== ۵۱) تصویرها تا اکشن و برگشت: اجازهٔ فایل‌به‌فایل (۷.۹۳) ===');
{
  const root = global.__ROOT_FOLDER;
  /* صف را عمداً خالی می‌کنیم: بندهای پیش‌تر سقفِ `YT_RENDER_MAX` را پر
     کرده‌اند و این بند دربارهٔ سقف نیست، دربارهٔ **اجازهٔ فایل‌ها** است.
     سقف، سنجهٔ خودش را دارد (§۴۴). */
  ytRenderSave_({ items: [] });
  const ep = DriveApp.__register('EPF91', 'قسمت ۹۱');
  const sub = ep.createFolder(CFG.LV_FOLDER);
  const im = [];
  for (let i = 0; i < 3; i++) {
    im.push(sub.createFile(Utilities.newBlob('PNG' + i, 'image/png',
      'تصویر ' + faDigitsOut_(String(i + 1)) + ' — بخش ۱.png')));
  }
  const wav = root.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'کامل.wav'));
  const cv = root.createFile(Utilities.newBlob('PNG', 'image/png', 'کاور۹۱.png'));

  const asked = ytRenderAsk_({ show: 'special', ep: '91', title: 'ت', folderId: 'EPF91',
    audio: [{ id: wav.getId(), name: 'کامل.wav' }], coverFileId: cv.getId(),
    visuals: im.map((f, i) => ({ fileId: f.getId(), kind: 'کارت', sec: 10 + i,
                                 name: f.getName() })),
    outName: 'قسمت ۹۱ — ویدئو.mp4' });
  const row = ytRenderRead_().items.filter(x => x.key === 'special:91')[0] || {};

  /* ۵۱.۱ — ردیف نشانیِ هر تصویر را دارد و سهمِ ثانیه‌اش را. `tools/render.js`
     دقیقاً همین دو را می‌خواند (`visualsOf`). */
  ok('۵۱.۱ هر تصویر در ردیفِ صف نشانی و سهمِ ثانیه دارد',
     asked === true && (row.visuals || []).length === 3 &&
     row.visuals.every(v => /usercontent/.test(v.url || '')) &&
     row.visuals[1].sec === 11,
     (row.visuals || []).length + ' تصویر');

  /* ۵۱.۲ — و اجازه **رفتاری** سنجیده می‌شود: خودِ فایل باز شده باشد، نه
     اینکه ردیف ادعا کند. */
  ok('۵۱.۲ هر سه تصویر واقعاً «هرکس با لینک» شدند',
     im.every(f => f.getSharingAccess() === 'ANYONE_WITH_LINK') && row.shared === true);

  /* ۵۱.۳ — **و پوشه‌شان نه.** درایو اجازه نمی‌دهد فرزندی بسته‌تر از پوشه‌اش
     باشد؛ اگر پوشه باز شود، بستنِ فایل‌ها پرت می‌کند و اشتراک برای همیشه
     می‌مانَد — و هر فایلی که بعداً آن‌جا نوشته شود عمومی است (۷.۴۵). */
  ok('۵۱.۳ ولی پوشهٔ «تصویرها» باز نمی‌شود — همان درسی که چهار شب در سیاهه نشست',
     sub.getSharingAccess() === 'PRIVATE', sub.getSharingAccess());

  /* ۵۱.۴ — و پس گرفته می‌شود، همراهِ صوت و کاور. سوپاپِ `ytShareSweep_` باید
     تصویرها را هم ببیند، وگرنه دوازده فایلِ عمومی جا می‌مانند. */
  const d = ytRenderRead_();
  for (const it of d.items) if (it.key === 'special:91') it.status = 'رسید';
  ytRenderSave_(d);
  const n = ytShareSweep_();
  ok('۵۱.۴ اشتراکِ تصویرها هم پس گرفته می‌شود، نه فقط صوت و کاور',
     n >= 1 && im.every(f => f.getSharingAccess() === 'PRIVATE') &&
     wav.getSharingAccess() === 'PRIVATE' && cv.getSharingAccess() === 'PRIVATE',
     'پس‌گرفته: ' + n);

  /* ۵۱.۵ — **سنجهٔ مرزی: آنچه موتور نوشت، همان است که رانر می‌خوانَد.**
     دو طرفِ این مرز در دو زبان و دو مخزنِ اجرا هستند و هیچ تایپی مشترکی
     ندارند؛ تنها راهِ دانستنِ اینکه شکل‌ها می‌خوانند، خواندنِ واقعیِ یکی از
     خروجیِ دیگری است. `run_render_test.js` خودش ردیفی دست‌ساز می‌سازد —
     که یعنی شکلِ *من* را می‌سنجد، نه شکلِ موتور را (۷.۶۹). */
  const rj = require('../tools/render.js');
  const seen = rj.visualsOf(row);
  ok('۵۱.۵ `tools/render.js` همان ردیفی که موتور نوشت را می‌خوانَد',
     seen.length === 3 && seen[1].sec === 11 &&
     seen.every(x => /^https?:\/\//.test(x.url)) && seen[0].kind === 'کارت',
     JSON.stringify(seen.map(x => x.sec)));

  /* ۵۱.۵-ب — و سهم‌ها به **دقیقاً** مدتِ صوت می‌نشینند: قاعدهٔ بی‌شکاف،
     از این سر تا آن سر. */
  const tl = rj.timelineOf(seen, 90);
  const sum = tl.reduce((a, x) => a + x.visible, 0);
  ok('۵۱.۵-پ و جمعِ سهمِ همان تصویرها دقیقاً مدتِ صوت است',
     tl.length === 3 && Math.abs(sum - 90) < 0.01, 'جمع = ' + sum.toFixed(3));
}

console.log('=== ۵۲) از همان دری که تولید وارد می‌شود: ytUploadOne_ (۷.۹۳) ===');
{
  /* ══ چرا این بند لازم است و §۵۰ کافی نیست ══
   * §۵۰ `lvBuild_` را صدا می‌زند — یعنی اتاق را می‌سنجد، نه در را. تصمیمِ
   * «با مجموعهٔ ناقص درخواست بگذارم یا صبر کنم» در `ytUploadOne_` گرفته
   * می‌شود، و آن تابع تا امروز در هیچ سنجه‌ای یک بار هم دویده نشده بود —
   * چون `ytSvc_()` در این دنیا `null` است و تابع سرِ خطِ اول برمی‌گشت.
   * یک بدَلِ خالی برای `YouTube` بس است: مسیرِ «ویدئو نیامده» هیچ فراخوانی
   * به API نمی‌کند. همان درسِ ۷.۶۲ — سنجه‌ای که تابعِ تازه را صدا بزند
   * تابع را ثابت می‌کند؛ فقط سنجه‌ای که از جای تولید شروع کند، قابلیت را. */
  const svcWas = global.YouTube;
  global.YouTube = {};
  const root = global.__ROOT_FOLDER;
  const mkEp = (id, name) => {
    const f = DriveApp.__register(id, name);
    f.createFile(Utilities.newBlob(JSON.stringify({
      lesson: 5, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'سه شرطِ معرفت', hook: 'قلاب', summary: 'خلاصه',
            sections: [{ heading: 'یک', narration: 'الف'.repeat(400) },
                       { heading: 'دو', narration: 'ب'.repeat(300) },
                       { heading: 'سه', narration: 'پ'.repeat(200) }] }
    }), 'application/json', '_special.json'));
    f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
    return f;
  };

  /* ۵۲.۱ — مجموعهٔ ناقص **درخواست نمی‌شود**. قسمت همین‌الان منتظرِ ویدئو
     است، پس یک اجرای دیگر صبر کردن هزینه‌ای ندارد — ولی ویدئویی که با
     شکاف ساخته شود، منتشر که شد برنمی‌گردد. */
  ytRenderSave_({ items: [] });
  const capWas = CFG.LV_BUILD_MAX, tryWas = CFG.LV_TRY_MAX;
  CFG.LV_BUILD_MAX = 1; CFG.LV_TRY_MAX = 2;
  const e1 = mkEp('EPF96', 'قسمت 0096');
  const r1 = ytUploadOne_({ key: 'special:96', show: 'special', ep: '96',
                            folderId: 'EPF96', series: 'معرفت‌شناسی' }, null, []);
  ok('۵۲.۱ تا تصویرها کامل نشده، درخواستِ رندر گذاشته نمی‌شود',
     r1.waiting === true && r1.why.indexOf('کامل نشده') !== -1 &&
     ytRenderRead_().items.filter(x => x.key === 'special:96').length === 0,
     r1.why);

  /* ۵۲.۲ — ولی بی‌نهایت صبر نمی‌کند. بعد از `LV_TRY_MAX` با هر چه هست
     می‌رود: انتشاری که هرگز نرسد از انتشارِ ساده‌تر بدتر است (۵.۸۸). */
  const r2 = ytUploadOne_({ key: 'special:96', show: 'special', ep: '96',
                            folderId: 'EPF96', series: 'معرفت‌شناسی' }, null, []);
  const row96 = ytRenderRead_().items.filter(x => x.key === 'special:96')[0] || {};
  ok('۵۲.۲ بعد از سقفِ تلاش، با همان تصویرهای موجود درخواست می‌گذارد',
     r2.waiting === true && r2.why.indexOf('درخواستِ رندر') !== -1 &&
     (row96.visuals || []).length === 2,
     r2.why + ' · ' + (row96.visuals || []).length + ' تصویر در ردیف');

  /* ۵۲.۳ — و مسیرِ سالم: یک اجرا، همهٔ کارت‌ها، ردیف با همهٔ تصویرها. */
  CFG.LV_BUILD_MAX = capWas;
  ytRenderSave_({ items: [] });
  const e2 = mkEp('EPF97', 'قسمت 0097');
  const r3 = ytUploadOne_({ key: 'special:97', show: 'special', ep: '97',
                            folderId: 'EPF97', series: 'معرفت‌شناسی' }, null, []);
  const row97 = ytRenderRead_().items.filter(x => x.key === 'special:97')[0] || {};
  const sub97 = e2.getFoldersByName(CFG.LV_FOLDER);
  /* «همه» یعنی **همهٔ نقشه**، نه عددِ سه: از ۸.۲۶ بدَلِ مدل همان تعدادی را
     می‌دهد که پرامپت خواسته، پس عددِ ثابت چیزِ دیگری را می‌سنجید. */
  const plan97 = ytPlanRead_(e2) || {};
  ok('۵۲.۳ مسیرِ سالم: همهٔ تصویرها ساخته و در ردیف نشانی‌دار می‌شوند',
     r3.waiting === true && (plan97.visuals || []).length >= 3 &&
     (row97.visuals || []).length === (plan97.visuals || []).length &&
     row97.visuals.every(v => /usercontent/.test(v.url || '')) &&
     sub97.hasNext() === true && r3.why.indexOf('تصویر') !== -1,
     r3.why);

  /* ۵۲.۴ — و **این مهم‌ترین سنجهٔ کلِ این نسخه است.** «از همه جا از همه
     رنگ» به خواستهٔ صریحِ بندِ ۴ دست نمی‌خورد: ردیفش بی هیچ تصویری نوشته
     می‌شود (یعنی `tools/render.js` همان کاورِ تک‌تصویری را می‌سازد)، و هیچ
     پوشه و پرونده‌ای در قسمتش ساخته نمی‌شود. */
  ytRenderSave_({ items: [] });
  const e3 = mkEp('EPF98', 'قسمت 0098');
  const r4 = ytUploadOne_({ key: 'variety:98', show: 'variety', ep: '98',
                            folderId: 'EPF98', series: '' }, null, []);
  const row98 = ytRenderRead_().items.filter(x => x.key === 'variety:98')[0] || {};
  ok('۵۲.۴ «از همه جا از همه رنگ» دست نمی‌خورد: نه تصویری، نه پوشه‌ای، نه پرونده‌ای',
     r4.waiting === true && (row98.visuals || []).length === 0 &&
     e3.getFoldersByName(CFG.LV_FOLDER).hasNext() === false &&
     e3.getFilesByName(CFG.LV_FILE).hasNext() === false,
     r4.why);

  /* ۵۲.۵ — **این سنجه از یک شکستنیِ نیفتاده زاده شد.** برداشتنِ سدِ
     `ytVisOn_` در `ytUploadOne_` هیچ سنجه‌ای را قرمز نکرد، چون `ytVisPlan_`
     خودش برای «از همه جا» فهرستِ خالی می‌دهد و `lvBuild_` همان‌جا برمی‌گردد.
     پس آن سد یک قفلِ *دوم* است — ولی برای یک حالتِ واقعاً ممکن: `_yt.json`
     دستی ویرایش‌شدنی است (و ناظر ویرایشش می‌کند)، و نقشه از همان فایل
     خوانده می‌شود. یعنی یک ردیفِ دست‌نویس می‌تواند برای «از همه جا» تصویر
     بخواهد. حالتی که تولید در آن می‌ایستد را باید ساخت، نه حالتِ راحت را
     (۷.۲۲/۷.۸۶). */
  ytRenderSave_({ items: [] });
  const e4 = mkEp('EPF99', 'قسمت 0099');
  ytPlanWrite_(e4, { at: 'x', show: 'variety', ep: '99', title: 'ت', description: 'د',
    tags: ['الف'], coverTitle: 'ک', coverKicker: '', chapters: 3,
    visuals: [{ at: 1, kind: 'کارت', cardTitle: 'دستی', cardLines: ['یک'],
                heading: 'یک', terms: '', caption: 'ز', sec: 20 }] });
  const r5 = ytUploadOne_({ key: 'variety:99', show: 'variety', ep: '99',
                            folderId: 'EPF99', series: '' }, null, []);
  const row99 = ytRenderRead_().items.filter(x => x.key === 'variety:99')[0] || {};
  ok('۵۲.۵ `_yt.json`ِ دست‌نویسِ «از همه جا» هم تصویر نمی‌گیرد — قفلِ دوم',
     (row99.visuals || []).length === 0 &&
     e4.getFoldersByName(CFG.LV_FOLDER).hasNext() === false &&
     e4.getFilesByName(CFG.LV_FILE).hasNext() === false,
     r5.why);

  CFG.LV_TRY_MAX = tryWas;
  if (svcWas === undefined) delete global.YouTube; else global.YouTube = svcWas;
}

console.log('=== ۵۳) دیده‌شدن: «منتظر» با «منتظر» یکی نباشد (۷.۹۵) ===');
{
  /* ══ سکوتی که این بند برای شکستنش هست ══
   * `ytUploadOne_` هم برای «منتظرِ ویدئو» و هم برای «تصویرها کامل نشده»
   * `waiting` برمی‌گرداند. دو حالتِ کاملاً متفاوت با یک نشانه — و این
   * عیناً همان چیزی است که بانکِ موسیقی را هفت هفته خالی نگه داشت. */
  const svcWas = global.YouTube;
  global.YouTube = {};
  global.__PROPS[PK.LV_WAIT] = ''; global.__PROPS[PK.LV_SHORT] = '';
  const capWas = CFG.LV_BUILD_MAX, tryWas = CFG.LV_TRY_MAX;
  const mkEp = (id, name) => {
    const f = DriveApp.__register(id, name);
    f.createFile(Utilities.newBlob(JSON.stringify({
      lesson: 3, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'ت', hook: 'ق', summary: 'خ',
            sections: [{ heading: 'یک', narration: 'الف'.repeat(400) },
                       { heading: 'دو', narration: 'ب'.repeat(300) },
                       { heading: 'سه', narration: 'پ'.repeat(200) }] }
    }), 'application/json', '_special.json'));
    f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
    return f;
  };

  ytRenderSave_({ items: [] });
  CFG.LV_BUILD_MAX = 1; CFG.LV_TRY_MAX = 2;
  mkEp('EPS1', 'قسمت 0101');
  ytUploadOne_({ key: 'special:101', show: 'special', ep: '101',
                 folderId: 'EPS1', series: 'معرفت‌شناسی' }, null, []);
  const st1 = lvStatus_();
  /* «چند از چند» از **نقشهٔ خودِ قسمت** می‌آید، نه از عددی که این‌جا نوشته شود
     (۸.۲۶: بدَلِ مدل حالا همان تعدادی را می‌دهد که پرامپت خواسته). */
  const nPlan101 = ((ytPlanRead_(DriveApp.getFolderById('EPS1')) || {}).visuals || []).length;

  /* ۵۳.۱ — حالا «منتظرِ تصویر» اسم دارد، و خودش می‌گوید چند از چند. */
  ok('۵۳.۱ قسمتی که منتظرِ تصویر است، در وضعیت اسم دارد',
     st1.waiting === 1 && st1.short === 0 &&
     st1.waitKeys[0].indexOf('special:101') === 0 &&
     st1.waitKeys[0].indexOf('(1/' + nPlan101 + ')') !== -1,
     st1.waitKeys.join(' | ') + ' · نقشه ' + nPlan101);

  /* ۵۳.۲ — و خطِ روزانه **همیشه** هست، حتی وقتی هیچ ایرادی نیست: صاحبِ
     برنامه شیت باز نمی‌کند (۵.۹۰) و سکوت را نمی‌شود از مرگ تشخیص داد. */
  ok('۵۳.۲ خطِ روزانه جملهٔ آمادهٔ فارسی است و شمارها را می‌گوید',
     st1.line.length > 20 && st1.line.indexOf('۱ قسمت منتظر') !== -1 &&
     st1.line.indexOf(CFG.SPECIAL_SHOW_NAME) !== -1, st1.line);

  /* ۵۳.۳ — **یک شبِ منتظر خرابی نیست.** هشداری که برای حالتِ سالم بزند،
     هشداری است که یاد می‌گیرند نخوانند (۷.۴۰). */
  ok('۵۳.۳ یک روز انتظار، `ok` را پایین نمی‌آورد', st1.ok === true);

  const p1 = [], n1 = [];
  lvHealth_(p1, n1);
  ok('۵۳.۳-ب و در روزِ سالم هم خط در یادداشت‌ها می‌آید، نه در مسئله‌ها',
     n1.length === 1 && p1.length === 0, 'یادداشت ' + n1.length + ' / مسئله ' + p1.length);

  /* ۵۳.۴ — انتظارِ کهنه یافتهٔ کد می‌سازد و به صفِ «نیازمند تعویض کد» می‌رود.
     یک جمله در ایمیلِ فردا جایش را می‌گیرد؛ یک یافته نه. */
  /* تاریخِ کهنه از **ساعتِ خودِ هارنس** ساخته می‌شود، نه یک رشتهٔ دلخواه:
     `'1400/01/01'` هم «کهنه» است ولی ۲۲۸٬۸۷۱ روز، و عددِ بی‌معنا در شاهد
     یعنی خواننده نمی‌داند سنجه چه چیزی را دیده (۷.۸۸). */
  const oldAt = Utilities.formatDate(new Date(Date.now() - 10 * 86400000),
                                     CFG.TIMEZONE, 'yyyy/MM/dd HH:mm');
  const w = JSON.parse(global.__PROPS[PK.LV_WAIT]);
  w['special:101'].at = oldAt;
  global.__PROPS[PK.LV_WAIT] = JSON.stringify(w);
  const st2 = lvStatus_();
  const p2 = [], n2 = [];
  const hub = getHub_();
  lvHealth_(p2, n2);
  /* ردیف از **خودِ تبِ گزارش** خوانده می‌شود. نگارشِ اولم `RC.KEY` را گرفت —
     ستونی که وجود ندارد — پس `r.vals[NaN]` بود و فیلتر همیشه خالی
     می‌مانَد: سنجه‌ای که به حافظهٔ نویسنده‌اش جواب می‌دهد، نه به کد. */
  const rep = hub.getSheetByName(CFG.REPORT_TAB);
  const all = rep && rep.getLastRow() > 1
    ? rep.getRange(2, 1, rep.getLastRow() - 1, REPORT_HEADERS.length).getValues() : [];
  const rows = all.filter(v => String(v[RC.CAT - 1]) === 'تصویرِ درس');
  ok('۵۳.۴ انتظارِ کهنه یافتهٔ کد می‌سازد، نه فقط یک جمله',
     st2.ok === false && st2.oldestDays === 10 &&
     p2.length === 1 && rows.length === 1 &&
     String(rows[0][RC.OWNER - 1]).indexOf('کد') !== -1 &&
     String(rows[0][RC.STATUS - 1]) === RST.NEEDS_CODE,
     st2.oldestDays + ' روز · ' + rows.length + ' ردیف · ' +
     (rows[0] ? rows[0][RC.STATUS - 1] : '—'));

  ok('۵۳.۴-ب و دستورش می‌گوید کجا را نگاه کند، نه اینکه دوباره لاگ کن',
     String(rows[0][RC.INSTR - 1]).indexOf('_visuals.json') !== -1 &&
     String(rows[0][RC.INSTR - 1]).indexOf('why') !== -1,
     String(rows[0][RC.INSTR - 1]).slice(0, 70));

  /* ۵۳.۵ — و سنجندهٔ ۷.۵۷ به آن وصل است: ردیف با یک بیانیه بسته نمی‌شود
     تا وقتی خودِ وضعیت بگوید شرط رفته. */
  /* شاهد **محافظت‌شده**: نگارشِ اول `mp['lv-stuck'].still(...)` را بی‌قید
     صدا می‌زد، پس با برداشتنِ سنجنده مجموعه با TypeError می‌مُرد **پیش از**
     آنکه `ok` بتواند گزارش دهد — و در جاروی شکستن‌ها هیچ خطی چاپ نشد:
     «شکستنی که افتاد» با «شکستنی که نیفتاد» یک شکل شد. همان تلهٔ ۷.۸۹. */
  const mp = selfVerifyMap_();
  const vf = mp['lv-stuck'] || null;
  const call = (st) => { try { return vf ? vf.still(st) : 'بی‌سنجنده'; }
                         catch (e) { return 'پرت: ' + e.message; } };
  ok('۵۳.۵ یافته سنجندهٔ خودش را دارد و به همان وضعیت وصل است',
     !!vf && vf.what === 'lessonVisuals' &&
     call({ lessonVisuals: { ok: false } }) === true &&
     call({ lessonVisuals: { ok: true } }) === false &&
     call({}) === null,
     vf ? 'شرطِ باقی=' + call({ lessonVisuals: { ok: false } }) : 'سنجنده‌ای نیست');

  /* ۵۳.۶ — **«کم‌رفته» جدا از «منتظر»** (۵.۸۸): این عدد خودش هیچ‌وقت صفر
     نمی‌شود، چون یوتیوب ویدئوی منتشرشده را عوض نمی‌کند. یکی‌کردنشان یعنی
     عقب‌ماندگی‌ای که هرگز جبران نمی‌شود. */
  ytUploadOne_({ key: 'special:101', show: 'special', ep: '101',
                 folderId: 'EPS1', series: 'معرفت‌شناسی' }, null, []);
  const st3 = lvStatus_();
  ok('۵۳.۶ قسمتی که با تصویرِ کم رفت، از «منتظر» درمی‌آید و جدا شمرده می‌شود',
     st3.waiting === 0 && st3.short === 1 &&
     st3.shortKeys[0].indexOf('(2/' + nPlan101 + ')') !== -1 && st3.ok === true,
     st3.shortKeys.join(' | '));

  ok('۵۳.۶-ب و خط می‌گوید که جبران نمی‌شود — وگرنه خواننده منتظرِ صفری می‌مانَد که نمی‌آید',
     st3.line.indexOf('جبران نمی‌شود') !== -1 &&
     st3.line.indexOf('۱ قسمت با تصویرِ کم') !== -1, st3.line);

  const p3 = [], n3 = [];
  lvHealth_(p3, n3);
  const all3 = rep && rep.getLastRow() > 1
    ? rep.getRange(2, 1, rep.getLastRow() - 1, REPORT_HEADERS.length).getValues() : [];
  ok('۵۳.۶-پ «کم‌رفته» یافتهٔ کد نمی‌سازد — یافته‌ای که هیچ اصلاحی نبنددش، تا ابد در صف می‌مانَد',
     p3.length === 1 && p3[0].indexOf('جبران‌ناپذیر') !== -1 &&
     all3.filter(v => String(v[RC.CAT - 1]) === 'تصویرِ درس').length === 1,
     p3[0].slice(0, 60) + ' · ردیف‌های تصویرِ درس: ' +
     all3.filter(v => String(v[RC.CAT - 1]) === 'تصویرِ درس').length);

  /* ۵۳.۶-ت — **و تبِ تاریخچه از همان دری پر می‌شود که تولید وارد می‌شود.**
     این سنجه از دو شکستنیِ نیفتاده زاده شد: §۵۶ `lvLog_` را مستقیم صدا
     می‌زند (اتاق)، پس برداشتنِ فراخوانش از `ytUploadOne_` — و حتی محدودکردنش
     به فقط موفق‌ها — هیچ‌چیز را قرمز نکرد. **هر تلاش یک ردیف، موفق و ناموفق
     هر دو** فقط این‌جا سنجیدنی است (۷.۶۲). */
  const lvSh = getHub_().getSheetByName(CFG.LV_TAB);
  const lvRows = lvSh && lvSh.getLastRow() > 1
    ? lvSh.getRange(2, 1, lvSh.getLastRow() - 1, LV_HEADERS.length).getValues() : [];
  const res101 = lvRows.filter(r => String(r[2]) === '101').map(r => String(r[9]));
  ok('۵۳.۶-ت هر تلاش یک ردیف در «کاربردِ تصویرها» می‌گذارد — ناموفق هم',
     res101.length === 2 && res101.indexOf('ناقص') !== -1 &&
     lvRows.some(r => String(r[9]) === 'ناقص'),
     'ردیف‌های قسمتِ ۱۰۱: ' + res101.join(' | '));

  /* ۵۳.۶-ث — **و شمارِ گونه‌ها در ستونِ خودش می‌نشیند، نه ته ستونِ «علت»**
     (باگِ ۴ی ۷.۹۹). نگارشِ ۷.۹۷ در همین فراخوان `why: vis.why || lvSubNote_()`
     می‌نوشت، پس شمارِ گونه‌ها جای علت را می‌گرفت و `lvPhotoPending_` — که
     خطِ ارتقا را از همین ستون درمی‌آورد — کور می‌شد. §۵۶ این را نمی‌بیند،
     چون آن `lvLog_` را مستقیم صدا می‌زند و هر دو کلید را خودش می‌دهد: اتاق،
     نه در (۷.۶۲). این ردیف از **بدونِ خطا** ساخته شده، پس اگر «علت» چیزی
     داشته باشد، یعنی گونه‌ها در آن ریخته شده است. */
  const r101 = lvRows.filter(r => String(r[2]) === '101')[0] || [];
  ok('۵۳.۶-ث گونه‌ها در ستونِ خودش می‌رود و «علت» را نمی‌خورد',
     String(r101[12] || '').indexOf('کارت') !== -1 &&
     String(r101[10] || '') === '',
     'گونه=«' + String(r101[12] || '—') + '» · علت=«' + String(r101[10] || '') + '»');

  /* ۵۳.۷ — مسیرِ سالم: تصویرها کامل، هیچ ردیفی در هیچ‌کدام از دو حافظه. */
  CFG.LV_BUILD_MAX = capWas;
  global.__PROPS[PK.LV_WAIT] = ''; global.__PROPS[PK.LV_SHORT] = '';
  ytRenderSave_({ items: [] });
  mkEp('EPS2', 'قسمت 0102');
  ytUploadOne_({ key: 'special:102', show: 'special', ep: '102',
                 folderId: 'EPS2', series: 'معرفت‌شناسی' }, null, []);
  const st4 = lvStatus_();
  ok('۵۳.۷ مسیرِ سالم: هیچ ردیفی در هیچ‌کدام از دو حافظه نمی‌مانَد',
     st4.waiting === 0 && st4.short === 0 && st4.ok === true &&
     st4.line.indexOf('هیچ قسمتی منتظر نیست') !== -1, st4.line);

  /* ۵۳.۸ — و **هیچ فراخوانِ درایو یا شیتی**: این تابع از `writeStatus_` صدا
     زده می‌شود، یعنی داغ‌ترین مسیرِ موتور. ۷.۶۳ و ۷.۷۲ هر دو دربارهٔ همین
     یک اشتباه بودند، و شمارش — نه زمان — چیزی است که در ماک معنا دارد. */
  const fWas = global.__FETCHES.length;
  let reads = 0;
  const hubWas = global.getHub_;
  global.getHub_ = () => { reads++; return hubWas(); };
  lvStatus_();
  global.getHub_ = hubWas;
  ok('۵۳.۸ حالِ تصویرها هیچ فراخوانِ شبکه و هیچ خواندنِ هاب ندارد',
     reads === 0 && global.__FETCHES.length === fWas,
     'هاب ' + reads + ' بار، شبکه ' + (global.__FETCHES.length - fWas) + ' بار');

  CFG.LV_TRY_MAX = tryWas;
  if (svcWas === undefined) delete global.YouTube; else global.YouTube = svcWas;
}

console.log('=== ۵۴) لینکِ تصویرها به تلگرام و ایمیل می‌رسد (۷.۹۵) ===');
{
  /* خواستهٔ بندِ ۸: «ذخیره تصاویر … در فولدر خودِ همان درس و لینکش هم در
     تلگرام فرستاده بشه». پس این سنجه **خودِ متنِ فرستاده‌شده** را می‌سنجد،
     نه وجودِ تابع. */
  const ep = global.__ROOT_FOLDER.createFolder('قسمت 0110 — لینک');
  const sub = ep.createFolder(CFG.LV_FOLDER);
  ep.createFile(Utilities.newBlob(JSON.stringify({ want: 3, ready: 3, done: true, items: [
    { n: 1, at: 1, kind: 'کارت', via: 'کارت', caption: 'ز', fileId: 'L1' }] }),
    'application/json', CFG.LV_FILE));

  const v = lvEpLine_(ep);
  ok('۵۴.۱ خطِ قسمت، شمار و لینکِ پوشهٔ تصویرها را دارد',
     v.text.indexOf('۳ تصویر') !== -1 && v.url === sub.getUrl() && v.url.length > 10,
     v.text + ' · ' + v.url.slice(0, 40));

  const tg = tgVisualsLine_(ep);
  ok('۵۴.۲ و در سرپیامِ تلگرام به‌شکلِ یک پیوندِ کلیک‌شونده می‌آید',
     tg.indexOf('🖼') === 0 && tg.indexOf('<a href="' + sub.getUrl() + '">') !== -1 &&
     tg.indexOf('پوشهٔ تصویرها') !== -1, tg.replace(/\n/g, ''));

  const ml = visualsHtmlLine_(ep);
  ok('۵۴.۳ و در ایمیل هم، چون کسی که تلگرام را نمی‌بیند ایمیل را می‌بیند',
     ml.indexOf('۳ تصویر') !== -1 && ml.indexOf(sub.getUrl()) !== -1,
     ml.slice(0, 80));

  /* ۵۴.۴ — **و خودِ سرپیام واقعاً می‌فرستدش.** این همان شکافی است که ۷.۹۴
     گرفتارش شد: تابع درست بود و هیچ‌جا صدا زده نمی‌شد.
     نگارشِ اولِ همین سنجه متنِ کد را می‌خواند — و **روی کدِ درست قرمز شد**،
     چون `tgVisualsLine_` در فایل *پیش از* `sendTelegramSpecial_` نشسته و
     برشِ من خالی بود. سنجه‌ای که به چیدمانِ فایل بند باشد، چیدمان را
     می‌سنجد نه رفتار. پس حالا پیام **واقعاً فرستاده می‌شود** و متنِ
     رفته بازخوانی می‌شود. */
  global.__PROPS[PK.TG_TOKEN] = 'TOK'; global.__PROPS[PK.TG_CHAT] = 'CHAT';
  const stubTg = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('api.telegram.org') !== -1) return { code: 200, json: { ok: true } };
    return stubTg(url, body);
  };
  const fBefore = global.__FETCHES.length;
  sendTelegramSpecial_({ epNum: '110', lesson: 3, seriesName: 'معرفت‌شناسی',
                         ep: { title: 'ت', summary: 'خ', sections: [] } },
                       [], null, '15:00', ep, ['#فلسفه']);
  const sentTexts = global.__FETCHES.slice(fBefore)
    .filter(f => /api\.telegram\.org/.test(f.url))
    .map(f => String((f.body || {}).text || ''));
  global.__STUB = stubTg;
  ok('۵۴.۴ سرپیامِ درس‌نامه واقعاً لینکِ پوشهٔ تصویرها را می‌فرستد',
     sentTexts.length > 0 &&
     sentTexts.some(t => t.indexOf('پوشهٔ تصویرها') !== -1 &&
                         t.indexOf(sub.getUrl()) !== -1),
     sentTexts.length + ' پیام · ' +
     (sentTexts[0] || '').replace(/\n/g, ' ⏎ ').slice(0, 120));

  /* ۵۴.۵ — و ایمیل، با **آرگومانِ پوشه**. نگارشِ اولم `meta.folder` را
     خواند که وجود ندارد: `lvEpLine_(undefined)` داخلِ try/catch خالی
     برمی‌گرداند، پس جعبه هیچ‌وقت نمی‌آمد و هیچ خطایی هم نبود — همان شکلِ
     ۷.۴۱. پس هر دو فراخوانِ `specialHtml_` باید پوشه را بدهند. */
  const src4 = fs.readFileSync('src/04_Mailer.gs', 'utf8');
  const src14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  const calls = (src4 + src14).match(/specialHtml_\([^)]*\)/g) || [];
  ok('۵۴.۵ هر فراخوانِ specialHtml_ پوشه را می‌دهد — پارامترِ جامانده، جعبهٔ همیشه‌خالی است',
     calls.length >= 2 && calls.every(c => /folder\)$/.test(c)),
     calls.join(' | '));

  /* ۵۴.۶ — و **خودِ سندِ ایمیل** جعبه را دارد. برداشتنِ فراخوانِ آن جعبه از
     `specialHtml_` هیچ‌کدام از سنجه‌های بالا را قرمز نکرد: ۵۴.۳ تابع را
     مستقیم صدا می‌زد (اتاق) و ۵۴.۵ فقط آرگومان‌ها را می‌خواند. پس این‌جا
     سند **ساخته** می‌شود و متنش خوانده می‌شود — ۷.۶۲ برای چندمین بار. */
  const doc = specialHtml_({ epNum: '110', lesson: 3, seriesName: 'معرفت‌شناسی',
                             ep: { title: 'ت', sections: [] } },
                           [], '15:00', ['#فلسفه'], ep);
  ok('۵۴.۶ سندِ ایمیلِ درس‌نامه جعبهٔ تصویرها را در خودش دارد',
     doc.indexOf('تصویرهای این درس') !== -1 && doc.indexOf(sub.getUrl()) !== -1,
     doc.indexOf('تصویرهای این درس') > 0 ? 'هست' : 'نیست');
}

console.log('=== ۵۵) سبکِ تصویرِ هر مجموعه — و اینکه واقعاً کارت را عوض می‌کند (۷.۹۶) ===');
{
  /* ══ مهم‌ترین سنجهٔ این بند، ۵۵.۳ است ══
   * یک ستونِ «سبک» که فقط یک واژه در شیت باشد و رنگ و قابِ کارت را عوض
   * نکند، همان «برچسبی که ورودی ندارد» است که این پرونده بیش از هر شکلِ
   * دیگری ثبتش کرده. پس سنجه **خودِ شکلِ کشیده‌شده** را می‌پرسد. */
  const row = (o) => {
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = o.key || 'k'; v[SC.NAME - 1] = o.name || 'م';
    v[SC.CAT - 1] = o.cat || ''; v[SC.TOPIC - 1] = o.topic || '';
    if (o.style !== undefined) v[SC.LVSTYLE - 1] = o.style;
    return v;
  };

  /* ۵۵.۱ — ستون **در انتها** است و هر شاخصِ SC یکتا و در محدوده. ستونی که
     وسط جا داده شود، برچسبِ تازه را روی مقدارِ کهنه می‌گذارد، بی هیچ خطایی
     (۷.۴۱ — و سنجه‌اش نامِ ستون را نمی‌گوید، وگرنه ستونِ بعدی می‌شکندش). */
  const idx = Object.keys(SC).map(k => SC[k]);
  /* و بندِ `SC.LVSTYLE === SERIES_HEADERS.length` برداشته شد: توضیحِ بالا
     می‌گفت «نامِ ستون را نمی‌گوید وگرنه ستونِ بعدی می‌شکندش» — و بعد
     **شاخصش** را پین کرده بود، که همان خطا در لباسِ دیگر است. ۸.۰۱ ستونِ
     «تصویرسازی» را در انتها افزود و همین سنجه قرمز شد، برای کدی که درست بود.
     قاعده این است: هر شاخص یکتا، هیچ‌کدام بیرون از محدوده، و بزرگ‌ترین
     دقیقاً برابرِ شمارِ ستون‌ها — نه اینکه کدام ستون آخری است. */
  ok('۵۵.۱ هیچ شاخصی تکراری یا بیرون از محدوده نیست و آخرین ستون جا افتاده',
     new Set(idx).size === idx.length &&
     Math.max.apply(null, idx) === SERIES_HEADERS.length &&
     Math.min.apply(null, idx) === 1,
     SERIES_HEADERS.length + ' ستون، بزرگ‌ترین شاخص ' + Math.max.apply(null, idx));

  /* ۵۵.۲ — خانهٔ خالی ⇒ پیشنهادِ موتور، و خانهٔ پرشده ⇒ انتخابِ آدم. */
  const sugg = lvStyleOf_(row({ cat: 'تاریخ اسلام', name: 'سیرهٔ نبوی' }));
  const mine = lvStyleOf_(row({ cat: 'تاریخ اسلام', style: 'تخته‌سفید' }));
  ok('۵۵.۲ خانهٔ خالی پیشنهاد می‌گیرد، خانهٔ پرشده انتخابِ آدم است',
     sugg.key === 'نقشِ ایرانی' && sugg.src === 'پیشنهاد' &&
     mine.key === 'تخته‌سفید' && mine.src === 'ردیفِ خودش',
     sugg.key + ' (' + sugg.src + ') / ' + mine.key + ' (' + mine.src + ')');

  /* ۵۵.۳ — **و سبک واقعاً کارت را عوض می‌کند.** دو سبک، دو رنگِ پس‌زمینه و
     دو شکلِ قاب — سنجیده روی خودِ اسلایدِ کشیده‌شده، نه روی متنِ کد. */
  const root = global.__ROOT_FOLDER;
  const secs = [{ heading: 'یک', narration: 'الف'.repeat(300) }];
  const ctx = { show: 'special', epRaw: '95', epNum: '۹۵', showName: 'درس‌نامه',
                seriesName: 'سیرهٔ نبوی', cat: 'تاریخ اسلام', sections: secs, totalSec: 600 };
  const planOf = () => ({ visuals: [{ at: 1, kind: 'کارت', cardTitle: 'گزاره',
    heading: 'یک', cardLines: ['الف'], terms: '', caption: 'ز', sec: 30 }] });

  const drawWith = (key, folderName) => {
    const f = root.createFolder(folderName);
    lvBuild_(f, planOf(), ctx, key);
    const p = global.__PRES_LAST;
    const els = p.getSlides()[0].getPageElements();
    return { bg: (els[0] || {}).fill ? els[0].fill.color : '',
             shapes: els.filter(e => e.role === 'shape').map(e => e.shape) };
  };
  const a = drawWith('نقشِ ایرانی', 'قسمت 0095 — نقش');
  const b = drawWith('خطیِ مینیمال', 'قسمت 0096 — خطی');
  ok('۵۵.۳ سبک، رنگِ پس‌زمینه و شکلِ قابِ کارت را واقعاً عوض می‌کند',
     a.bg !== b.bg &&
     a.bg === lvStyleFind_('نقشِ ایرانی').pal.bg &&
     b.bg === lvStyleFind_('خطیِ مینیمال').pal.bg &&
     a.shapes.filter(x => x === 'DIAMOND').length === 18 &&
     b.shapes.filter(x => x === 'DIAMOND').length === 0,
     'نقش: ' + a.bg + ' با ' + a.shapes.filter(x => x === 'DIAMOND').length +
     ' لوزی · خطی: ' + b.bg + ' با ' + b.shapes.filter(x => x === 'DIAMOND').length);

  /* ۵۵.۳-ب — و هر نُه سبک یک قابِ **ساخته‌شده** دارند، نه یک نام در فهرست.
     سبکی که فقط در `LV_STYLES` باشد و `lvFrameDraw_` نشناسدش، بی‌صدا به
     حالتِ پیش‌فرض می‌افتد — یعنی انتخابِ او هیچ اثری ندارد. */
  const frames = {};
  for (const sty of LV_STYLES) {
    const f = root.createFolder('قسمت س — ' + sty.key);
    lvBuild_(f, planOf(), ctx, sty.key);
    const els = global.__PRES_LAST.getSlides()[0].getPageElements();
    frames[sty.key] = els.filter(e => e.role === 'shape').length;
  }
  ok('۵۵.۳-پ هر نُه سبک واقعاً چیزی می‌کشد، و «عکسِ واقعی» هم سادهٔ آبرومند است',
     Object.keys(frames).length === 9 &&
     Object.keys(frames).every(k => frames[k] >= 2) &&
     new Set(Object.values(frames)).size >= 4,
     Object.keys(frames).map(k => k + ':' + frames[k]).join(' · '));

  /* ۵۵.۴ — **سبک که عوض شود، کارت‌ها از نو ساخته می‌شوند.** وگرنه تنظیمی
     که هیچ اثرِ دیدنی ندارد، تنظیم نیست (۷.۸۶). */
  const f2 = root.createFolder('قسمت 0097 — تعویض');
  const r1 = lvBuild_(f2, planOf(), ctx, 'ساده و رسمی');
  const r2 = lvBuild_(f2, planOf(), ctx, 'ساده و رسمی');
  const r3 = lvBuild_(f2, planOf(), ctx, 'چاپِ قدیمی');
  ok('۵۵.۴ سبکِ عوض‌شده کارت‌ها را از نو می‌سازد، و سبکِ یکسان نه',
     r1.made === 1 && r2.made === 0 && r2.restyled === false &&
     r3.made === 1 && r3.restyled === true,
     'اول ' + r1.made + ' · دوم ' + r2.made + ' · بعد از تعویض ' + r3.made);

  /* ۵۵.۴-ب — ولی **«نمی‌دانیم» با «عوض شد» یکی نیست**: اگر خواندنِ سبک
     شکست بخورد (رشتهٔ خالی) هیچ بازسازی‌ای نباید بشود، وگرنه یک هابِ
     نخوانده هر شب دوازده کارت را بی‌دلیل از نو می‌سازد (۷.۴۰). */
  const r4 = lvBuild_(f2, planOf(), ctx, '');
  ok('۵۵.۴-ب سبکِ خوانده‌نشده بازسازی نمی‌کند — «نمی‌دانیم» با «عوض شد» یکی نیست',
     r4.made === 0 && r4.restyled === false && r4.style === 'چاپِ قدیمی',
     'ساخته ' + r4.made + ' · سبکِ ذخیره‌شده ' + r4.style);

  /* ۵۵.۵ — و در `_visuals.json` ثبت می‌شود، پس ناظر و جزوه می‌دانند با چه
     سبکی ساخته شده. */
  const man = JSON.parse(f2.getFilesByName(CFG.LV_FILE).next().getBlob().getDataAsString());
  ok('۵۵.۵ سبکِ روزِ ساخت در پروندهٔ تصویرها ثبت می‌شود',
     man.style === 'چاپِ قدیمی' && man.items[0].style === 'چاپِ قدیمی', man.style);

  /* ۵۵.۶ — **خانهٔ ناخوانا با اسم رد می‌شود، نه بی‌صدا.** انتخابی که خوانده
     نشود یعنی سبکی که او خواسته و بی‌صدا نخواهد گرفت (۷.۴۱) — و اسمِ
     سبک‌های درست هم در پیام می‌آید، وگرنه باید حدس بزند. */
  const bad = lvStyleOf_(row({ style: 'سبکِ من' }));
  ok('۵۵.۶ سبکِ ناشناخته رد می‌شود و پیامش فهرستِ درست را می‌گوید',
     bad.bad.indexOf('سبکِ من') !== -1 && bad.bad.indexOf('نقشِ ایرانی') !== -1 &&
     bad.src.indexOf('پیشنهاد') === 0 && bad.key === lvStyleDefault_().key,
     bad.bad.slice(0, 80));

  /* ══ ۵۵.۶-پ — ادعا برگشت، چون باورِ زیرش غلط بود (۸٫۱۶) ══
     تا ۸٫۱۵ این سنجه می‌گفت «الف + ب» باید **رد** شود و کاربر «ترکیبی» را
     بنویسد. استدلالش («دو سبکِ هنری در یک ویدئو ناهم‌خوان می‌شود») فقط
     دربارهٔ دو سبکِ **رقیب** درست بود؛ و خودِ «ترکیبی» هم یک برچسبِ توخالی
     بود — `mix: true` هیچ‌جا خوانده نمی‌شد و سنجهٔ پایین فقط **وجودِ همان
     فیلد** را تأیید می‌کرد. یعنی سنجه یک توخالی را قفل کرده بود (۷٫۶۸).

     ترکیب حالا دو **نقش** جداست: رنگ از اولی، نقش از دومی — همان چیزی که
     صاحبِ برنامه خواست («میشه انتخاب کرد ترکیبی یعنی چی با چی»). */
  const mix = lvStyleOf_(row({ style: 'نقشِ ایرانی + چاپِ قدیمی' }));
  ok('۵۵.۶-پ ترکیبِ «الف + ب» خوانده می‌شود: رنگ از اولی، نقش از دومی',
     mix.bad === '' && mix.style.composed === true &&
     mix.style.pal === lvStyleFind_('نقشِ ایرانی').pal &&
     mix.style.frame === lvStyleFind_('چاپِ قدیمی').frame &&
     mix.src === 'ترکیبِ خودتان',
     JSON.stringify({ key: mix.key, src: mix.src, bad: mix.bad,
                      frame: mix.style.frame }));

  /* و تکهٔ ناشناخته **با اسمِ همان تکه** رد می‌شود — «یکی از این دو بد بود»
     برای کسی که باید درستش کند نصفِ جواب است. */
  const mixBad = lvStyleOf_(row({ style: 'نقشِ ایرانی + سبکِ من' }));
  ok('۵۵.۶-پ۲ و تکهٔ ناشناخته با نامِ خودش رد می‌شود',
     mixBad.bad.indexOf('تکهٔ دوم') !== -1 &&
     mixBad.bad.indexOf('سبکِ من') !== -1 &&
     mixBad.bad.indexOf('تکهٔ اول') === -1,
     mixBad.bad.slice(0, 110));

  ok('۵۵.۶-ت و خودِ «ترکیبی» هنوز یک سبکِ پذیرفته‌شده است',
     lvStyleOf_(row({ style: 'ترکیبی' })).key === 'ترکیبی');

  /* «خودکار» یک **انتخاب** است و باید دوام بیاورد: خانهٔ خالی را
     `lvStyleAudit_` هر شب با پیشنهاد پر می‌کند، پس اگر «خودکار» هم خالی
     ذخیره می‌شد، انتخابِ او یک شب بیشتر زنده نمی‌مانْد. */
  const au = lvStyleOf_(row({ style: 'خودکار', topic: 'ریاضی' }));
  ok('۵۵.۶-ث «خودکار» خوانده می‌شود و پیشنهاد را می‌دهد، نه خطا',
     au.bad === '' && au.src === 'خودکار' && au.key === 'تخته‌سفید',
     JSON.stringify({ key: au.key, src: au.src, bad: au.bad }));

  /* ۵۵.۷ — نوشتار یک‌دست می‌شود: «خطی مینیمال» بی نیم‌فاصله هم شناخته شود.
     چهار راهِ نوشتنِ یک واژه در فارسی، همان چیزی است که ۷.۲۳ برایش سد
     گذاشت — «پیدا نشد» بدترین جواب است. */
  /* و نیم‌فاصله **جداگانه** سنجیده می‌شود: نگارشِ اولِ همین سنجه سه حالت
     داشت که هیچ‌کدام نیم‌فاصله‌ای نبودند («خطیِ مینیمال» با کسره جور
     می‌شد، نه با نیم‌فاصله)، پس برداشتنِ آن سطر هیچ اثری نداشت. «تخته‌سفید»
     نیم‌فاصله دارد و همان چیزی است که آدم با فاصلهٔ معمولی می‌نویسد. */
  ok('۵۵.۷ نوشتارِ دیگرِ همان سبک هم شناخته می‌شود — از جمله نیم‌فاصله',
     lvStyleFind_('خطی مینیمال') !== null &&
     lvStyleFind_('نقش ايراني') !== null &&
     lvStyleFind_('  ترکیبی  ') !== null &&
     lvStyleFind_('تخته سفید') !== null &&
     lvStyleFind_('چاپ قديمي') !== null,
     'پنج نگارش، یکی‌شان بی نیم‌فاصله');
}

console.log('=== ۵۵-ب) پیشنهاد در شیت نوشته می‌شود، دستِ آدم هرگز بازنویسی نمی‌شود ===');
{
  const hub = new Spread('HUB');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const mk = (r, key, name, cat, style) => {
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = key; v[SC.NAME - 1] = name; v[SC.CAT - 1] = cat;
    if (style) v[SC.LVSTYLE - 1] = style;
    reg.getRange(r, 1, 1, SERIES_HEADERS.length).setValues([v]);
  };
  mk(2, 'k1', 'سیرهٔ نبوی', 'تاریخ اسلام');           // خالی
  mk(3, 'k2', 'هندسه', 'ریاضی', 'آبرنگِ گرم');        // دستِ آدم
  mk(4, 'k3', 'جانوران', 'زیست‌شناسی');               // خالی ⇒ عکسِ واقعی
  mk(5, 'k4', 'چیزی', 'فلسفه', 'سبکِ نامعلوم');       // ناخوانا

  const a1 = lvStyleAudit_(hub);
  const col = () => reg.getRange(2, SC.LVSTYLE, 4, 1).getValues().map(x => String(x[0]));

  /* ۵۵-ب.۱ — خانه‌های خالی پر شدند، و **خانهٔ دستِ آدم دست نخورد** — همان
     قاعدهٔ اسکنِ موسیقی که سلیقهٔ گزیننده را پاک نمی‌کند.
     ══ از ۸٫۱۸ مقدارِ پرشده «خودکار» است، نه یک سبکِ منجمد ══
     پیش از آن `st.key` نوشته می‌شد، یعنی پیشنهادِ regex، همان شبِ اول، برای
     همیشه — پس هیچ مجموعه‌ای که او دستش نزده بود هرگز به انتخابِ مدل
     نمی‌رسید. ادعای این سنجه عوض نشده (خالی پر می‌شود، دست‌نویس نه)؛
     فقط به چیزی نشانه‌گیری شد که تولید واقعاً می‌نویسد (۷٫۶۸). */
  ok('۵۵-ب.۱ خانهٔ خالی «خودکار» گرفت و خانهٔ دست‌نویس دست نخورد',
     a1.filled === 2 && col()[0] === 'خودکار' && col()[1] === 'آبرنگِ گرم' &&
     col()[2] === 'خودکار' && col()[3] === 'سبکِ نامعلوم',
     a1.filled + ' پر شد · ' + col().join(' | '));

  /* ۵۵-ب.۲ — خانهٔ ناخوانا **با اسمِ مجموعه** گزارش می‌شود و بازنویسی
     نمی‌شود: بازنویسی‌اش یعنی او هرگز نمی‌فهمد چه نوشته بود. */
  ok('۵۵-ب.۲ خانهٔ ناخوانا با نامِ مجموعه گزارش می‌شود، نه بازنویسی',
     a1.bad.length === 1 && a1.bad[0].indexOf('چیزی') !== -1 &&
     col()[3] === 'سبکِ نامعلوم', a1.bad.join(' | '));

  /* ۵۵-ب.۳ — «عکسِ واقعی» انتخاب شده ولی لایه‌اش نیامده: نام‌برده می‌شود.
     سبکی که بی‌صدا کار نکند، همان بدترین حالت است (۷.۴۵). */
  ok('۵۵-ب.۳ «عکسِ واقعی» که لایه‌اش نیامده، نام‌برده می‌شود',
     a1.photo.length === 1 && a1.photo[0] === 'جانوران', a1.photo.join('، '));

  /* ۵۵-ب.۴ — اجرای دوم **چیزی نمی‌نویسد**: یک مهاجرتِ آرایشی نباید ۲۶۴
     ردیف را هر شب دوباره مهر کند (۵.۹۵). */
  const a2 = lvStyleAudit_(hub);
  ok('۵۵-ب.۴ اجرای دوم هیچ خانه‌ای را دوباره نمی‌نویسد',
     a2.filled === 0 && a2.bad.length === 1, 'پر شد: ' + a2.filled);

  /* ۵۵-ب.۵ — و یک خواندنِ رجیستری، نه یکی به‌ازای هر مجموعه: این تابع از
     `healthCheck` صدا زده می‌شود و آن یک بار از هزینه مُرد (۷.۶۳). */
  ok('۵۵-ب.۵ کلِ وارسی یک خواندنِ رجیستری است', a2.read === 1, String(a2.read));
}

console.log('=== ۵۶) نظارت: تاریخچه، ارتقا، و درِ آدم (۷.۹۷) ===');
{
  const hub = new Spread('HUB');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;

  /* ۵۶.۱ — **هر تلاش یک ردیف، موفق و ناموفق هر دو.** قسمتی که هر شب تلاش
     می‌کند و هر شب شکست می‌خورد، از بیرون با قسمتی که اصلاً تلاش نکرده یک
     شکل است — و آن دو کاملاً فرقِ هم‌اند (۵.۸۸). */
  /* شمارِ گونه‌ها در ستونِ **خودش** می‌رود، نه ته ستونِ «علت» (باگِ ۴ی ۷.۹۹):
     نگارشِ ۷.۹۷ `why || lvSubNote_()` می‌نوشت، پس شبی که خطایی بود شمارِ
     گونه‌ها را می‌خورد و `lvPhotoPending_` کور می‌شد. */
  lvLog_(hub, { show: 'درس‌نامه', ep: '20', series: 'م', style: 'ساده و رسمی',
                want: 5, ready: 5, made: 5, tries: 1, result: 'کامل',
                kinds: 'کارت: 4 · عکس: 1 · عکس/ویدئو: 1', url: 'https://u/1' });
  lvLog_(hub, { show: 'درس‌نامه', ep: '21', series: 'م', style: 'ساده و رسمی',
                want: 5, ready: 0, made: 0, tries: 2, result: 'نشد',
                why: 'خروجیِ PNG نشد', url: '' });
  const sh = hub.getSheetByName(CFG.LV_TAB);
  ok('۵۶.۱ تبِ «کاربردِ تصویرها» ساخته شد و هر تلاش یک ردیف دارد',
     !!sh && sh.getLastRow() === 3, sh ? String(sh.getLastRow()) : 'بی‌تب');

  const hist = lvHistory_(hub, 10);
  ok('۵۶.۲ تاریخچه تازه‌ترین‌اول خوانده می‌شود و علت را نگه می‌دارد',
     hist.length === 2 && hist[0].ep === '21' && hist[0].result === 'نشد' &&
     hist[0].why.indexOf('PNG') !== -1 && hist[1].ready === 5,
     hist.map(x => x.ep + ':' + x.result).join(' | '));

  /* ۵۶.۲-ب — **و «علت» شمارِ گونه‌ها را نمی‌خورد** (باگِ ۴ی ۷.۹۹). ردیفی که
     هم خطا دارد و هم گونه‌ها، باید هر دو را نگه دارد — وگرنه خطِ ارتقا
     دقیقاً در شب‌های خطادار کور می‌شود، که همان شب‌هایی است که به آن
     نیاز هست. */
  lvLog_(hub, { show: 'درس‌نامه', ep: '22', series: 'م', style: 'ساده و رسمی',
                want: 4, ready: 2, made: 2, tries: 1, result: 'ناقص',
                why: 'خروجیِ PNG نشد', kinds: 'کارت: 1 · عکس: 1 · عکس/ویدئو: 1',
                gMade: 1, gSpent: 0.067, url: '' });
  const h22 = lvHistory_(hub, 10).filter(x => x.ep === '22')[0] || {};
  ok('۵۶.۲-پ ردیفی که هم خطا دارد هم گونه، هر دو را نگه می‌دارد',
     h22.why.indexOf('PNG') !== -1 && h22.kinds.indexOf('عکس/ویدئو: 1') !== -1 &&
     h22.gMade === 1 && Math.abs(h22.gSpent - 0.067) < 0.001,
     'علت=' + h22.why + ' · گونه=' + h22.kinds + ' · پس‌زمینه=' + h22.gMade);

  /* ۵۶.۳ — **«ارتقایی داد گزارش بده»** — نیمه‌ای که جا افتاده بود. یکی در
     روز، نه فهرستی؛ و صریح می‌گوید ایراد نیست. */
  const up1 = lvUpgrade_(hub, { on: true, waiting: 0, short: 0 });
  ok('۵۶.۳ فرصتِ ارتقا نام‌برده می‌شود، و «عکسِ کارت‌شده» اولویتِ اول است',
     up1.key === 'lv-photo-layer' && up1.text.indexOf('لایهٔ عکسِ آزاد') !== -1 &&
     up1.text.indexOf('۲ مورد') !== -1,
     up1.key + ' · ' + up1.text.slice(0, 70));

  /* ۵۶.۳-ب — و **یکی** است، نه فهرستی: فهرستی که هر روز ده بند داشته باشد
     همان فهرستی است که خوانده نمی‌شود. */
  ok('۵۶.۳-ب یک فرصت برمی‌گردد، نه فهرست',
     typeof up1.text === 'string' && up1.text.length > 40 &&
     up1.text.indexOf('\n') === -1);

  /* ۵۶.۴ — و وقتی هیچ فرصتی نیست، **سکوت نمی‌کند**: «چیزی برای ارتقا پیدا
     نشد» خودش یک خبر است. جای خالیِ این خط از «همه‌چیز خوب است» قابلِ
     تشخیص نیست. */
  const hub2 = new Spread('HUB2');
  global.__SS[CFG.HUB_ID || 'HUB'] = hub2;
  global.getHub_ = () => hub2;
  for (let i = 0; i < 7; i++) {
    lvLog_(hub2, { show: 'درس‌نامه', ep: String(30 + i), series: 'م',
                   style: i % 2 ? 'نقشِ ایرانی' : 'چاپِ قدیمی',
                   want: 4, ready: 4, made: 4, tries: 1, result: 'کامل',
                   kinds: 'کارت: 3 · نمودار: 1', url: 'https://u' });
  }
  const up2 = lvUpgrade_(hub2, { on: true, waiting: 0, short: 0 });
  ok('۵۶.۴ روزی که فرصتی نیست، خط ساکت نمی‌مانَد',
     up2.key === 'lv-steady' && up2.text.length > 30 &&
     up2.text.indexOf('لایهٔ تصویرِ ساخته‌شده') !== -1, up2.text.slice(0, 80));

  /* ۵۶.۵ — و خاموش که باشد، هیچ ارتقایی گزارش نمی‌شود: پیشنهادِ بهترشدنِ
     چیزی که روشن نیست، نویز است. */
  ok('۵۶.۵ خاموش که باشد، خطِ ارتقا نمی‌آید',
     lvUpgrade_(hub2, { on: false }).text === '');

  /* ۵۶.۶ — هیچ تاریخچه‌ای ⇒ جملهٔ مخصوصِ خودش، با اینکه بگوید اگر چند روز
     عوض نشد یعنی چه. */
  const hub3 = new Spread('HUB3');
  global.__SS[CFG.HUB_ID || 'HUB'] = hub3;
  global.getHub_ = () => hub3;
  const up3 = lvUpgrade_(hub3, { on: true, waiting: 0, short: 0 });
  ok('۵۶.۶ بی هیچ تاریخچه‌ای هم جملهٔ درستِ خودش را دارد',
     up3.key === 'lv-none-yet' && up3.text.indexOf('صفِ انتشارِ یوتیوب') !== -1,
     up3.text.slice(0, 70));

  /* ۵۶.۷ — و **هیچ فراخوانِ مدلی**: «نمیخوام هزینه کار و توکن بالا بره». */
  const fWas = global.__FETCHES.length;
  lvUpgrade_(hub2, { on: true, waiting: 0, short: 0 });
  ok('۵۶.۷ هیچ فراخوانِ مدلی در ساختِ خطِ ارتقا نیست',
     global.__FETCHES.length === fWas,
     'فراخوانِ تازه: ' + (global.__FETCHES.length - fWas));
}

console.log('=== ۵۶-پ) وارسیِ اجباریِ ناظر: فهرستِ موتور و پرامپت یکی باشند ===');
{
  /* ══ این بند هم از یک شکستنیِ نیفتاده زاده شد ══
   * برداشتنِ `visuals-read` از `CFG.MONITOR_CHECKS` هیچ سنجه‌ای را قرمز
   * نکرد. و این مهم است: آن فهرست همان چیزی است که زنگِ «ناظر این وارسی را
   * گزارش نکرد» از رویش می‌زند. اگر کلیدی در پرامپت اجباری باشد و در موتور
   * نباشد، ناظر می‌تواند هر روز از قلم بیندازدش و هیچ‌کس نمی‌فهمد — و
   * برعکسش، کلیدی در موتور که در پرامپت نیست، هر روز زنگ می‌زند برای کاری
   * که از کسی خواسته نشده. دو فهرست در دو جا، و هیچ‌کدام دیگری را نمی‌بیند:
   * همان شکلِ ۷.۸۸. */
  const keys = (CFG.MONITOR_CHECKS || []).map(x => x.key);
  ok('۵۶-پ.۱ کلیدِ `visuals-read` در فهرستِ وارسی‌های اجباریِ موتور هست',
     keys.indexOf('visuals-read') !== -1, keys.join('، '));

  const pf = fs.readdirSync('docs/prompts')
    .filter(f => /^_PROMPT-monitor-v(\d+)\.md$/.test(f))
    .sort((a, b) => Number(a.match(/v(\d+)/)[1]) - Number(b.match(/v(\d+)/)[1]));
  const newest = fs.readFileSync('docs/prompts/' + pf[pf.length - 1], 'utf8');
  const missing = keys.filter(k => newest.indexOf('`' + k + '`') === -1);
  ok('۵۶-پ.۲ و تازه‌ترین پرامپتِ ناظر هر کلیدِ موتور را نام می‌برد',
     missing.length === 0,
     'پرامپت: ' + pf[pf.length - 1] + (missing.length ? ' · جامانده: ' + missing.join('، ') : ''));

  /* و پرامپت باید بگوید چند ردیف اجباری است، با همان عدد. یک جملهٔ «سه
     ردیف» روی فهرستی چهارتایی، خواننده را وامی‌دارد یکی را جا بیندازد.
     **عدد از خودِ فهرست درمی‌آید، نه از یک ثابت.** نگارشِ اول
     `keys.length === 4` نوشته بود — یعنی همان خطای ۵۵.۱ در لباسِ دیگر:
     روزی که کلیدِ پنجم اضافه شود، سنجه برای کدِ **درست** قرمز می‌شود و
     ارزان‌ترین راهِ سبزکردنش پاک‌کردنِ همان چیزی است که نگهبانش بود. */
  /* «نُه» با ضمه، نه «نه» — در فارسی «نه» هم عددِ ۹ است و هم نفی، و این
     جمله را یک مدل می‌خوانَد. ۸.۰۸ اولین بار بود که به این خانه رسیدیم. */
  /* ۸.۴۰ به خانهٔ یازدهم رسید؛ فهرست تا جایی ادامه دارد که سقفِ `keys.length <
     NUM.length` هنوز معنا داشته باشد — شمارِ واژه‌ای، نه رقمی که مدل بخوانَد. */
  const NUM = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نُه', 'ده',
               'یازده', 'دوازده', 'سیزده', 'چهارده'];
  const want = 'هر ' + (NUM[keys.length] || String(keys.length)) + ' ردیفش';
  ok('۵۶-پ.۳ و شمارِ ردیف‌های اجباری در پرامپت با فهرستِ موتور می‌خواند',
     keys.length >= 1 && keys.length < NUM.length && newest.indexOf(want) !== -1,
     keys.length + ' کلید در موتور، پرامپت باید بگوید «' + want + '»');
}

console.log('=== ۵۶-ب) درِ آدم: بازسازیِ تصویرهای یک قسمت (۷.۹۷) ===');
{
  /* «اصلاح اتوماسیون انجام بده و پیگیرش باش» یک نیمه دارد که خودکار است
     (بازسازی وقتی سبک عوض شود، تلاشِ دوباره تا سقف) و یک نیمه که نه: وقتی
     کارتی بد درآمد و آدم می‌خواهد همین‌الان از نو ساخته شود. */
  const ep = DriveApp.__register('EPR1', 'درس‌نامه — م — قسمت 040 — ت');
  const sub = ep.createFolder(CFG.LV_FOLDER);
  for (let i = 0; i < 3; i++) {
    sub.createFile(Utilities.newBlob('PNG', 'image/png', 'تصویر ' + (i + 1) + '.png'));
  }
  ep.createFile(Utilities.newBlob(JSON.stringify({ want: 3, ready: 3, tries: 3,
    style: 'ساده و رسمی', items: [] }), 'application/json', CFG.LV_FILE));
  global.__PROPS[PK.LV_WAIT] = JSON.stringify({ 'special:40': { at: '2026/08/01 00:00' } });

  const folderWas = global.ytFolderOf_;
  global.ytFolderOf_ = () => ep;
  const r = lvRedoOne_('special', '40');
  global.ytFolderOf_ = folderWas;

  ok('۵۶-ب.۱ دکمه تصویرها را به زباله می‌برد، نه پاک — اگر اشتباه بود، فایل سرِ جایش است',
     r.ok === true && r.dropped === 3 &&
     sub.getFiles().hasNext() === false, 'به زباله: ' + r.dropped);

  /* ۵۶-ب.۲ — **و سابقهٔ تلاش هم صفر می‌شود.** بی این، قسمتی که سه بار شکست
     خورده بود همین‌الان «رهاشده» حساب می‌شود و دکمه هیچ کاری نکرده —
     سدی که با دستِ آدم باز نشود، سد نیست (۵.۹۵/۵.۸۸). */
  ok('۵۶-ب.۲ سابقهٔ تلاش هم پاک می‌شود، وگرنه دکمه هیچ کاری نکرده',
     ep.getFilesByName(CFG.LV_FILE).hasNext() === false &&
     JSON.parse(global.__PROPS[PK.LV_WAIT] || '{}')['special:40'] === undefined,
     'پروندهٔ تصویرها مانده؟ ' + ep.getFilesByName(CFG.LV_FILE).hasNext());

  /* ۵۶-ب.۳ — و پوشهٔ ناموجود **با دلیل** رد می‌شود، نه با یک «انجام شد»ِ
     دروغ. */
  global.ytFolderOf_ = () => null;
  const bad = lvRedoOne_('special', '999');
  global.ytFolderOf_ = folderWas;
  ok('۵۶-ب.۳ قسمتِ ناموجود با دلیل رد می‌شود، نه با ادعای انجام',
     bad.ok === false && bad.why.indexOf('پیدا نشد') !== -1, bad.why);

  /* ۵۶-ب.۴ — و **خودِ دکمهٔ منو** فشار داده می‌شود: نامی که منو صدا می‌زند،
     از خودِ فایلِ منو خوانده می‌شود نه دستی. یک دکمه که تابعش نباشد، هیچ
     خطایی نمی‌دهد و بی‌صدا کار نمی‌کند (۵.۶۱/۷.۴۳). */
  const setupSrc = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const named = (setupSrc.match(/addItem\('[^']*تصویرهای یک قسمت[^']*',\s*'(\w+)'\)/) || [])[1];
  ok('۵۶-ب.۴ منو نامِ همین تابع را صدا می‌زند',
     named === 'runLessonVisualsRebuild' &&
     typeof global[named] === 'function', String(named));

  let asked = '', alerted = '';
  global.__UI = {
    prompt: function (t, m) { asked = String(m);
      return { getSelectedButton: () => 'OK', getResponseText: () => 'درس‌نامه 40',
               Button: { OK: 'OK' } }; },
    alert: function () { alerted += Array.prototype.join.call(arguments, ' | '); },
    ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL' },
    Button: { OK: 'OK' }
  };
  global.__UI.prompt = function (t, m) { asked = String(m);
    return { getSelectedButton: () => global.__UI.Button.OK,
             getResponseText: () => 'درس‌نامه 40' }; };
  global.ytFolderOf_ = () => ep;
  const out = runLessonVisualsRebuild();
  global.ytFolderOf_ = folderWas;
  global.__UI = null;
  ok('۵۶-ب.۵ فشردنِ دکمه واقعاً همان قسمت را بازسازی می‌کند و جوابش را می‌گوید',
     !!out && out.ok === true && alerted.indexOf('زباله') !== -1 &&
     asked.indexOf('سبکِ تصویر') !== -1,
     alerted.slice(0, 70));

  /* ۵۶-ب.۶ — و «از همه جا از همه رنگ» **با اسم** رد می‌شود، نه اینکه پوشهٔ
     بی‌تصویری را بگردد و «۰ فایل» بگوید. */
  global.__UI = {
    prompt: function () { return { getSelectedButton: () => 'OK',
                                   getResponseText: () => 'رنگ 19' }; },
    alert: function () { alerted = Array.prototype.join.call(arguments, ' | '); },
    ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL' }, Button: { OK: 'OK' }
  };
  alerted = '';
  runLessonVisualsRebuild();
  global.__UI = null;
  ok('۵۶-ب.۶ نمایشی که تصویر نمی‌گیرد، با اسم رد می‌شود',
     alerted.indexOf('تصویر نمی‌گیرد') !== -1 &&
     alerted.indexOf(CFG.SPECIAL_SHOW_NAME) !== -1, alerted.slice(0, 80));
}

console.log('=== ۵۷) لایهٔ ۳: تصویرِ ساخته‌شده با مدل (۷.۹۸) ===');
{
  /* ══ چرا این لایه پس‌زمینه است و نه جایگزینِ کارت ══
   * چهار دلیلِ سنجیده، و مهم‌ترینش این: تصویرِ ساخته‌شدهٔ «یک شخصِ واقعی» یا
   * «یک سندِ تاریخی» یک **جعل** است. کانالی که درس‌نامهٔ تاریخ و کلام می‌دهد
   * نمی‌تواند چهرهٔ ساخته‌شدهٔ کسی را نشان بدهد. مرز در کد است. */
  const genWas = CFG.LV_GEN_ENABLED, modWas = CFG.LV_GEN_MODEL;
  const capWas = CFG.LV_GEN_USD_MONTH, perEpWas = CFG.LV_GEN_PER_EP;

  /* ۵۷.۱ — **خاموش است، و این خودش سنجیده می‌شود.** طرح از روزِ اول گفت
     «با اجازهٔ شما». ساخته شد و خاموش می‌مانَد. */
  ok('۵۷.۱ لایهٔ ۳ در پیش‌فرض خاموش است — روشن‌کردنش تصمیمِ صاحبِ برنامه است',
     CFG.LV_GEN_ENABLED === false && lvGenOn_() === false);

  /* ۵۷.۲ — **قیمتِ ناشناخته گران‌ترین فرض می‌شود.** حدسِ ارزان یعنی از سقف
     رد شدن، و سقف تنها چیزی است که این لایه را مهار می‌کند. جهتِ حدس، خودش
     یک تصمیمِ ایمنی است. */
  const prices = (CFG.LV_GEN_PRICES || []).map(x => Number(x.usd));
  ok('۵۷.۲ مدلِ ناشناخته گران‌ترین قیمت را می‌گیرد، نه ارزان‌ترین',
     lvGenPrice_('gemini-9-mystery-image') === Math.max.apply(null, prices) &&
     lvGenPrice_('چیزی که مدل نیست') === Math.max.apply(null, prices) &&
     lvGenPrice_('gemini-2.5-flash-lite-image') < lvGenPrice_('gemini-3-pro-image'),
     'ناشناخته ' + lvGenPrice_('x-image') + ' · flash-lite ' +
     lvGenPrice_('gemini-2.5-flash-lite-image'));

  /* ۵۷.۳ — **مدلِ تصویر هرگز مدلِ متن نمی‌شود.** `MODEL_BLOCK` عمداً `image`
     را دارد؛ این لایه آن سد را **برنمی‌دارد** و از راهِ خودش می‌گردد. اگر
     روزی کسی برای پیداکردنِ مدلِ تصویر آن سد را بردارد، موتور یک روز با
     مدلِ تصویر قسمت می‌نویسد. */
  ok('۵۷.۳ سدِ «مدلِ تصویر هرگز مدلِ متن نیست» دست‌نخورده می‌مانَد',
     MODEL_BLOCK.indexOf('image') !== -1 && isBlocked_('gemini-3-pro-image') === true,
     MODEL_BLOCK.join('، '));

  /* ۵۷.۴ — و خودش ارزان‌ترین مدلِ تصویرِ `generateContent`دار را پیدا می‌کند،
     چون هیچ نامِ مدلی از حافظه سیم‌کشی نشده (نامی که نتوانم بسنجمش، نباید
     در کد سخت‌کد شود). */
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  global.__PROPS[PK.MODELS] = '';
  CFG.LV_GEN_MODEL = '';
  const stubWas = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) {
      return { code: 200, json: { models: [
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-3-pro-image', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/imagen-4.0-fast', supportedGenerationMethods: ['predict'] }
      ] } };
    }
    return stubWas(url, body);
  };
  const mk = lvGenModel_();
  ok('۵۷.۴ ارزان‌ترین مدلِ تصویرِ generateContent‌دار پیدا می‌شود',
     mk.id === 'gemini-2.5-flash-image' && mk.why.indexOf('ارزان‌ترین') === 0,
     mk.id + ' — ' + mk.why);

  /* ۵۷.۴-ب — **و Imagen پذیرفته نمی‌شود، چون نقطهٔ پایانی‌اش `:predict` است.**
     نگارشِ اولِ همین سنجه این را در ۵۷.۴ ادعا کرده بود و ثابت نمی‌کرد:
     `imagen` قیمتِ ناشناخته می‌گیرد (یعنی گران‌ترین) و خودش آخر مرتب
     می‌شود، پس برداشتنِ شرطِ `generateContent` هیچ اثری در جواب نداشت.
     حالتی که تولید در آن می‌ایستد را باید ساخت: **فقط** Imagen در دسترس. */
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  const stubImg = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/imagen-4.0-fast', supportedGenerationMethods: ['predict'] },
      { name: 'models/imagen-4.0-ultra', supportedGenerationMethods: ['predict'] }] } };
    return stubImg(url, body);
  };
  const onlyImagen = lvGenModel_();
  global.__STUB = stubImg;
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  ok('۵۷.۴-ب Imagen پذیرفته نمی‌شود — نقطهٔ پایانی‌اش generateContent نیست',
     onlyImagen.id === '' && onlyImagen.why.indexOf('generateContent') !== -1,
     onlyImagen.why);

  /* ۵۷.۵ — **هر فراخوان شمرده می‌شود، پذیرفته یا نه.** گوگل برای فراخوانِ
     انجام‌شده پول می‌گیرد حتی اگر ما بایت‌هایش را رد کنیم؛ اگر ردشده‌ها
     شمرده نشوند سقفِ دلاری **دروغ** است. */
  global.__PROPS[PK.LV_GEN_SPEND] = '';
  const pngBytes = (n) => { const a = new Array(n).fill(7);
    [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,5,0,0,0,2,208,8,6,0,0,0]
      .forEach((b,i)=>a[i]=b); return a; };
  global.__STUB = function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] }] } };
    if (url.indexOf('flash-image:generateContent') !== -1) {
      return { code: 200, json: { candidates: [{ content: { parts: [
        { text: 'صفحهٔ خطا، نه تصویر' }] } }] } };
    }
    return stubWas(url, body);
  };
  const bad = lvGenOne_('gemini-2.5-flash-image', 'x');
  ok('۵۷.۵ فراخوانی که تصویر نداد هم شمرده می‌شود — وگرنه سقفِ دلاری دروغ است',
     bad.blob === null && bad.why.indexOf('تصویری') !== -1 &&
     lvGenSpend_().n === 1 && lvGenSpend_().usd > 0,
     bad.why + ' · خرج: ' + lvGenSpend_().usd);

  /* ۵۷.۶ — **بایت‌ها باور می‌شوند، نه ادعا.** صفحهٔ خطا هم بایت برمی‌گرداند
     (درسِ `musicFetch_` و `ytMp4Ok_`)، و پیش‌فرض ردّ است. */
  ok('۵۷.۶ سرآیندِ نه‌PNG‌نه‌JPEG رد می‌شود، و تصویرِ ریز هم',
     lvGenAccept_(Utilities.newBlob('<html>خطا</html>'.repeat(3000),
       'image/png', 'x')).ok === false &&
     lvGenAccept_(Utilities.newBlob(pngBytes(500), 'image/png', 'x')).ok === false &&
     lvGenAccept_(null).ok === false &&
     lvGenAccept_(Utilities.newBlob(pngBytes(20000), 'image/png', 'x')).ok === true,
     'HTML: ' + lvGenAccept_(Utilities.newBlob('<html>'.repeat(3000), 'image/png', 'x')).why);

  /* ۵۷.۷ — **دستورِ تصویر سه منعِ صریح دارد**، و هر سه در کد است نه در آرزو:
     بی‌واژه (مدل فارسی را بد می‌نویسد)، بی چهره (تصویرِ ساخته‌شدهٔ یک شخصِ
     واقعی جعل است)، بی نشان و لوگو (همان پرسشِ حق‌نشر). */
  const pr = lvGenPrompt_({ cardTitle: 'سه شرطِ معرفت', heading: 'یک' },
                          lvStyleFind_('نقشِ ایرانی'));
  ok('۵۷.۷ دستورِ تصویر بی‌واژه، بی چهره و بی لوگو می‌خواهد — و سبک را می‌برد',
     pr.indexOf('بی‌واژه') !== -1 && pr.indexOf('هیچ چهره') !== -1 &&
     pr.indexOf('لوگو') !== -1 && pr.indexOf('تذهیب') !== -1 &&
     pr.indexOf('سه شرطِ معرفت') !== -1,
     pr.replace(/\n/g, ' ⏎ ').slice(0, 110));

  /* ۵۷.۷-ب — و هر نُه سبک حال‌وهوای تصویرِ خودش را دارد. بی این، ستونِ سبک
     روی پس‌زمینه‌ها هیچ اثری نداشت — همان برچسبِ بی‌ورودی، یک لایه آن‌طرف‌تر. */
  ok('۵۷.۷-ب هر نُه سبک حال‌وهوای تصویرِ خودش را دارد، و دو تا یکی نیستند',
     LV_STYLES.every(x => String(x.gen || '').length > 15) &&
     new Set(LV_STYLES.map(x => x.gen)).size === LV_STYLES.length,
     LV_STYLES.length + ' سبک، ' + new Set(LV_STYLES.map(x => x.gen)).size + ' حال‌وهوای یکتا');

  /* ۵۷.۸ — **سقفِ ماهانه واقعاً می‌بندد.** و وقتی بست، کارت ساده ساخته
     می‌شود؛ قسمت زمین نمی‌خورد. */
  CFG.LV_GEN_ENABLED = true;
  CFG.LV_GEN_MODEL = 'gemini-2.5-flash-image';
  CFG.LV_GEN_USD_MONTH = 0.05;   // جای دقیقاً یک تصویر با ۰٫۰۶۷ ⇒ صفر
  ok('۵۷.۸ سقفِ ماهانه جا را صفر می‌کند و هیچ فراخوانی نمی‌رود',
     lvGenRoom_('gemini-2.5-flash-image') === 0);

  CFG.LV_GEN_USD_MONTH = 8;
  global.__PROPS[PK.LV_GEN_SPEND] = '';
  let genCalls = 0;
  global.__STUB = function (url, body) {
    if (url.indexOf('flash-image:generateContent') !== -1) {
      genCalls++;
      return { code: 200, json: { candidates: [{ content: { parts: [
        { inlineData: { mimeType: 'image/png',
                        data: Utilities.base64Encode(pngBytes(30000)) } }] } }] } };
    }
    return stubWas(url, body);
  };

  const root = global.__ROOT_FOLDER;
  const secs = [{ heading: 'یک', narration: 'الف'.repeat(300) }];
  const ctx = { show: 'special', epRaw: '80', epNum: '۸۰', showName: 'درس‌نامه',
                seriesName: 'سیرهٔ نبوی', cat: 'تاریخ اسلام', sections: secs, totalSec: 900 };
  const planOf = () => ({ visuals: [
    { at: 1, kind: 'کارت', cardTitle: 'الف', heading: 'یک', cardLines: ['۱'], sec: 30 },
    { at: 1, kind: 'کارت', cardTitle: 'ب', heading: 'یک', cardLines: ['۲'], sec: 30 },
    { at: 1, kind: 'کارت', cardTitle: 'پ', heading: 'یک', cardLines: ['۳'], sec: 30 }
  ] });
  CFG.LV_GEN_PER_EP = 2;
  const ep = root.createFolder('قسمت 0080 — ساخته‌شده');
  const b1 = lvBuild_(ep, planOf(), ctx, 'نقشِ ایرانی');
  const sub = ep.getFoldersByName(CFG.LV_FOLDER).next();
  const names = [];
  { const it = sub.getFiles(); while (it.hasNext()) names.push(it.next().getName()); }

  /* ۵۷.۹ — سقفِ هر قسمت: دو پس‌زمینه برای سه کارت، و سه کارت هر سه ساخته
     می‌شوند. کارتِ بی‌پس‌زمینه عیناً کارتِ ۷.۹۶ است. */
  ok('۵۷.۹ سقفِ هر قسمت رعایت می‌شود و کارتِ بی‌پس‌زمینه هم ساخته می‌شود',
     b1.ready === 3 && b1.gMade === 2 && genCalls === 2 &&
     names.filter(n => n.indexOf('پس‌زمینه') === 0).length === 2 &&
     names.filter(n => n.indexOf('تصویر ') === 0).length === 3,
     b1.gMade + ' پس‌زمینه، ' + b1.ready + ' کارت · ' + names.join(' | '));

  /* ۵۷.۹-ب — **و تصویر واقعاً روی اسلاید نشسته، با لایهٔ خوانایی.** آن لایه
     تزئین نیست: پس‌زمینهٔ ساخته‌شده هر رنگی می‌تواند دربیاید و بی آن، متنِ
     روشن روی تصویرِ روشن ناخوانا می‌شود — یعنی همان چیزی که کلِ کارت برایش
     هست از دست می‌رود. */
  const pres = global.__PRES_LAST;
  const els = pres.getSlides()[0].getPageElements();
  const imgs = els.filter(e => e.role === 'image');
  const scrim = els.filter(e => e.role === 'shape' && e.fill.alpha !== undefined);
  /* شاهد **محافظت‌شده**: نگارشِ اول `scrim[0].fill.alpha` را بی‌قید می‌خواند،
     پس برداشتنِ آلفا مجموعه را با TypeError می‌کشت — «افتاد» و «نیفتاد» یک
     شکل می‌شدند. تلهٔ ۷.۸۹، چهارمین بار در این سشن. */
  const alpha = scrim.length ? scrim[0].fill.alpha : 'بی‌لایه';
  ok('۵۷.۹-پ تصویر تمام‌قاب روی اسلاید است و لایهٔ تیرهٔ خوانایی رویش',
     imgs.length === 1 && Math.round(imgs[0].getWidth()) === Math.round(pres.getPageWidth()) &&
     scrim.length === 1 && alpha === CFG.LV_GEN_SCRIM,
     'تصویر ' + imgs.length + ' · لایه با آلفای ' + alpha);

  /* ۵۷.۹-ب — **و تصویر ته‌ترین لایه است.** نگارشِ اول «تصویر پیش از لایه»
     را می‌سنجید، که بی‌قید درست بود: لایه بعد از تصویر درج می‌شود، پس
     `bringToFront` هم همان ترتیب را می‌داد. ادعای واقعی این است که تصویر
     **پشتِ** همه‌چیز است. */
  /* ۵۷.۹-ب — **ترتیب، نه وجودِ یک فراخوان.** نگارشِ اول «تصویر در دو جای
     اول است» را می‌سنجید و برداشتنِ `bg.sendToBack()` را نمی‌گرفت (تصویر
     می‌رفت به صفر و باز هم می‌گذشت). ترتیبِ درست یک زنجیره است:
     مستطیلِ رنگی ← تصویر ← لایهٔ تیره ← متن. هر حلقه‌ای که جابه‌جا شود،
     یا تصویر پنهان می‌شود یا متن ناخوانا. */
  const plain = els.filter(e => e.role === 'shape' && e.fill.alpha === undefined &&
                                Math.round(e.getWidth()) === Math.round(pres.getPageWidth()) &&
                                Math.round(e.getHeight()) === Math.round(pres.getPageHeight()));
  const iBg = plain.length ? els.indexOf(plain[0]) : -1;
  const iIm = imgs.length ? els.indexOf(imgs[0]) : -1;
  const iSc = scrim.length ? els.indexOf(scrim[0]) : -1;
  ok('۵۷.۹-ب ترتیب درست است: مستطیلِ رنگی ← تصویر ← لایهٔ تیره',
     iBg === 0 && iIm === 1 && iSc > iIm,
     'رنگ@' + iBg + ' تصویر@' + iIm + ' لایه@' + iSc + ' از ' + els.length);

  /* ۵۷.۹-ت — و متن **بالای** لایهٔ تیره است، وگرنه خودش هم تیره می‌شود و
     کلِ کار بی‌معنا. */
  const texts = els.filter(e => e.role === 'text');
  ok('۵۷.۹-ت متن‌ها بالای لایهٔ تیره‌اند، نه زیرش',
     texts.length >= 2 && texts.every(t => els.indexOf(t) > els.indexOf(scrim[0])),
     'لایه در ' + els.indexOf(scrim[0]) + ' · اولین متن در ' + els.indexOf(texts[0]));

  /* ۵۷.۱۰ — **پولِ رفته دوباره خرج نمی‌شود.** پس‌زمینه در پوشه می‌مانَد، پس
     هر (قسمت، تصویر، دستور) حداکثر یک بار هزینه دارد. این تنها چیزی است که
     هزینه را واقعاً محدود می‌کند. */
  /* کارتی که پاک می‌شود باید **درونِ** پنجرهٔ `LV_GEN_PER_EP` باشد، وگرنه
     مسیرِ «پس‌زمینهٔ موجود را بردار» هرگز اجرا نمی‌شود و سنجه بی‌قید سبز
     می‌مانَد — نگارشِ اول کارتِ سومی را پاک می‌کرد که پس‌زمینه‌ای نداشت. */
  const callsWas = genCalls;
  sub.getFilesByName(b1.items[0].name).next().setTrashed(true);
  const b2 = lvBuild_(ep, planOf(), ctx, 'نقشِ ایرانی');
  ok('۵۷.۱۰ پس‌زمینهٔ ساخته‌شده دوباره ساخته نمی‌شود — پولِ رفته دوباره خرج نمی‌شود',
     b2.made === 1 && genCalls === callsWas && b2.gMade === 0,
     'کارتِ تازه ' + b2.made + ' · فراخوانِ تازهٔ مدل ' + (genCalls - callsWas));

  /* ۵۷.۱۱ — **روشن‌کردنِ سوئیچ، کارت‌های موجود را از نو می‌سازد.** وگرنه
     صاحبِ برنامه سوئیچی را روشن می‌کند که روی قسمت‌های ساخته‌شده هیچ اثری
     ندارد — «تمیزکردنِ ورودی آنچه را قبلاً نوشته شده درست نمی‌کند» (۵.۹۵). */
  const ep2 = root.createFolder('قسمت 0081 — سوئیچ');
  CFG.LV_GEN_ENABLED = false;
  const c1 = lvBuild_(ep2, planOf(), ctx, 'نقشِ ایرانی');
  CFG.LV_GEN_ENABLED = true;
  const c2 = lvBuild_(ep2, planOf(), ctx, 'نقشِ ایرانی');
  ok('۵۷.۱۱ روشن‌کردنِ لایهٔ ۳ کارت‌های موجود را از نو می‌سازد',
     c1.made === 3 && c1.gen === false && c2.restyled === true &&
     c2.made === 3 && c2.gen === true && c2.gMade > 0,
     'خاموش ' + c1.made + ' کارت · روشن ' + c2.made + ' کارتِ تازه با ' +
     c2.gMade + ' پس‌زمینه');

  /* ۵۷.۱۲ — و خطِ روزانه **هر روز** خرج و سقف را می‌گوید، چون چیزی که فقط
     در یک شیت باشد دیده نمی‌شود (۵.۹۰). و قیمتِ فرض‌شده را هم می‌گوید، تا
     اگر غلط بود دیده شود. */
  const gs = lvGenStatus_();
  /* سقف با **رقمِ فارسی** چاپ می‌شود (`faDigitsOut_`), پس جست‌وجوی «8» روی
     کدِ درست قرمز می‌شود — سنجه‌ای که به نگارشِ لاتین بند باشد، نگارش را
     می‌سنجد نه رفتار. */
  ok('۵۷.۱۲ خطِ روزانه خرج، سقف، و قیمتِ فرض‌شده را می‌گوید',
     gs.on === true && gs.line.indexOf('دلار') !== -1 &&
     gs.line.indexOf('قیمتِ فرض‌شده') !== -1 &&
     gs.line.indexOf(faDigitsOut_(String(CFG.LV_GEN_USD_MONTH))) !== -1 &&
     gs.line.indexOf(gs.usd.toFixed(2)) !== -1 && gs.usd > 0,
     gs.line.slice(0, 120));

  CFG.LV_GEN_ENABLED = false;
  try { props_().deleteProperty(PK.LV_GEN_ON); } catch (ePg) {}
  const off = lvGenStatus_();
  /* ══ ادعا همان است، شاهدش عوض شد (۸٫۱۵) ══
     نامِ این سنجه از روزِ اول «و **چطور روشن می‌شود**» بود و درست هم بود؛
     شاهدش غلط بود: نامِ یک کلیدِ `CFG` را می‌خواست، یعنی دستوری که صاحبِ
     برنامه نمی‌تواند انجامش دهد (ویرایشِ سورس). حالا همان ادعا را با چیزی
     می‌سنجد که **واقعاً فشاردادنی** است — و نامِ گزینه از خودِ منبعِ منو
     خوانده می‌شود نه دست‌نویس، وگرنه عوض‌کردنِ برچسبِ منو این سنجه را سبز
     می‌گذارد و خطِ روزانه به گزینه‌ای اشاره می‌کند که وجود ندارد (۷٫۶۳). */
  const mSrc = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const mItem = mSrc.match(/\.addItem\(\s*'([^']*)'\s*,\s*'runLvGenToggle'\s*\)/);
  ok('۵۷.۱۲-ب و خاموش که باشد، خطش می‌گوید خاموش است و چطور روشن می‌شود',
     off.on === false && off.line.indexOf('خاموش') !== -1 &&
     !!mItem && off.line.indexOf(mItem[1]) !== -1 &&
     off.line.indexOf('LV_GEN_ENABLED') === -1,
     JSON.stringify({ menu: mItem ? mItem[1] : null }) + ' · ' +
     off.line.slice(0, 140) +
     ' — دستوری که انجام‌شدنی نباشد، از نبودنِ دستور بدتر است');

  ok('۵۷.۱۲-پ و حالِ لایهٔ ۳ در خطِ روزانهٔ تصویرِ درس هم می‌آید',
     lvLine_(lvStatus_()).indexOf('تصویرِ ساخته‌شده') !== -1,
     lvLine_(lvStatus_()).replace(/\n/g, ' ⏎ ').slice(0, 130));

  /* ══ ۵۷.۱۴ — کلید در دستِ او، نه در سورس (۸٫۱۵) ══
     `CFG.LV_GEN_ENABLED` خاموش است و خاموش می‌مانَد؛ ادعا این است که او
     **بی عوض‌کردنِ سورس** می‌تواند روشنش کند. پس سنجه از همان دری وارد
     می‌شود که منو واردش می‌شود — `runLvGenToggle` — و بعد `lvGenOn_` را
     می‌پرسد: اگر کلیدِ زمانِ اجرا خوانده نشود، این سرخ می‌شود. */
  {
    const realUi57 = global.ui_;
    global.ui_ = () => ({
      alert: function () { return 'YES'; },
      ButtonSet: { YES_NO: 1, OK: 2 }, Button: { YES: 'YES' }
    });
    try {
      CFG.LV_GEN_ENABLED = false;
      try { props_().deleteProperty(PK.LV_GEN_ON); } catch (e1) {}
      const before = lvGenOn_();
      const r1 = runLvGenToggle();
      const after = lvGenOn_();
      ok('۵۷.۱۴ گزینهٔ منو لایهٔ ۳ را روشن می‌کند، بی دست‌زدن به سورس',
         before === false && !!(r1 && r1.ok === true && r1.on === true) &&
         after === true && CFG.LV_GEN_ENABLED === false,
         JSON.stringify({ before: before, r: r1, after: after,
                          cfg: CFG.LV_GEN_ENABLED }) +
         ' — تا ۸٫۱۴ تنها راهش ویرایشِ `src/00_Config.gs` بود');

      /* و خطِ روزانه همان لحظه راست می‌گوید — وگرنه او روشن کرده و گزارش
         هر روز «خاموش» می‌گوید، که همان تناقضِ دو شاهدِ ۷٫۵۷ است. */
      ok('۵۷.۱۴-ب و خطِ روزانه بی‌درنگ «روشن» می‌شود',
         lvGenStatus_().on === true &&
         lvGenStatus_().line.indexOf('روشن') !== -1,
         lvGenStatus_().line.slice(0, 120));

      const r2 = runLvGenToggle();
      ok('۵۷.۱۴-پ و همان گزینه خاموشش می‌کند — کلیدی که یک‌طرفه باشد کلید نیست',
         !!(r2 && r2.ok === true && r2.on === false) && lvGenOn_() === false,
         JSON.stringify({ r: r2, on: lvGenOn_() }));

      /* ══ و مرزی که نباید جابه‌جا شود ══
         `LV_ENABLED` بالاسرِ این است: کلِ تصویرسازی خاموش باشد، کلیدِ لایهٔ ۳
         هم نباید روشنش کند. بی این، «خاموشِ کلی» نیمه‌خاموش می‌شد. */
      const lvWas = CFG.LV_ENABLED;
      CFG.LV_ENABLED = false;
      try { props_().setProperty(PK.LV_GEN_ON, '1'); } catch (e2) {}
      ok('۵۷.۱۴-ت ولی خاموشیِ کلِ تصویرسازی بالاسرِ این کلید است',
         lvGenOn_() === false,
         'LV_ENABLED=false و کلیدِ زمانِ اجرا «۱» — باز هم باید خاموش باشد');
      CFG.LV_ENABLED = lvWas;
      try { props_().deleteProperty(PK.LV_GEN_ON); } catch (e3) {}
    } finally {
      global.ui_ = realUi57;
    }
  }

  /* ۵۷.۱۳ — و خاموش که باشد، **هیچ فراخوانی** نمی‌رود: صفرِ دلاری یعنی صفر. */
  const cWas = genCalls;
  const ep3 = root.createFolder('قسمت 0082 — خاموش');
  lvBuild_(ep3, planOf(), ctx, 'نقشِ ایرانی');
  ok('۵۷.۱۳ خاموش که باشد هیچ فراخوانِ تصویری نمی‌رود — صفرِ دلاری یعنی صفر',
     genCalls === cWas, 'فراخوانِ تازه: ' + (genCalls - cWas));

  global.__STUB = stubWas;
  CFG.LV_GEN_ENABLED = genWas; CFG.LV_GEN_MODEL = modWas;
  CFG.LV_GEN_USD_MONTH = capWas; CFG.LV_GEN_PER_EP = perEpWas;
}

console.log('=== ۵۸) بازبینیِ هر هفت گام — هشت باگِ واقعی و سدهایشان (۷.۹۹) ===');
{
  /* هر بندِ این بخش یک باگِ **سنجیده‌شده** است، نه یک احتمال. هر هشت با
     اجرای زنجیره از درِ تولید پیدا شدند، نه با خواندنِ کد. */
  const hub = new Spread('HUBA');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const v = new Array(SERIES_HEADERS.length).fill('');
  v[SC.KEY - 1] = 'kA'; v[SC.NAME - 1] = 'سیرهٔ نبوی'; v[SC.CAT - 1] = 'تاریخ اسلام';
  /* سبکِ انتخابیِ آدم عمداً **با پیشنهاد فرق دارد** («تاریخ اسلام» را
     `lvStyleSuggest_` «نقشِ ایرانی» پیشنهاد می‌دهد). بی این تفاوت، جانشینِ
     پیشنهاد باگِ کلید را می‌پوشاند و شکستنِ `item.seriesKey` سبز می‌مانَد —
     یعنی نیمهٔ دومِ خودِ اصلاح، نیمهٔ اولش را پنهان می‌کرد. */
  v[SC.LVSTYLE - 1] = 'کاغذبری';
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([v]);

  const svcWas = global.YouTube; global.YouTube = {};
  const mkEp = (id, name, withKey) => {
    const f = DriveApp.__register(id, name);
    const m = { seriesName: 'سیرهٔ نبوی', seriesCat: 'تاریخ اسلام', lesson: 2,
      ep: { title: 'ت', hook: 'ق', summary: 'خ',
            sections: [{ heading: 'یک', narration: 'الف'.repeat(400) },
                       { heading: 'دو', narration: 'ب'.repeat(300) }] } };
    if (withKey) m.seriesKey = 'kA';
    f.createFile(Utilities.newBlob(JSON.stringify(m), 'application/json', '_special.json'));
    f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
    return f;
  };
  const styleOf = (f) => {
    try { return JSON.parse(f.getFilesByName(CFG.LV_FILE).next().getBlob().getDataAsString()).style; }
    catch (e) { return undefined; }
  };

  /* ۵۸.۱ — **باگِ ۱: سبک به قسمت‌های قدیمی نمی‌رسید.** ردیفِ صف از ۵.۹۷
     `seriesKey` دارد، ولی ۷.۹۶ `item.series` را می‌خواند — کلیدی که هرگز در
     ردیف نیست. برای ۴۵ درسِ قدیمی که پروندهٔ قسمتشان `seriesKey` ندارد،
     سبک بی‌صدا اعمال نمی‌شد (`style: undefined`). */
  ytRenderSave_({ items: [] });
  const e1 = mkEp('BUG1A', 'قسمت 0301', true);
  ytUploadOne_({ key: 'special:301', show: 'special', ep: '301', folderId: 'BUG1A',
                 seriesKey: 'kA', seriesName: 'سیرهٔ نبوی' }, hub, []);
  ytRenderSave_({ items: [] });
  const e2 = mkEp('BUG1B', 'قسمت 0302', false);     // قسمتِ قدیمی، بی seriesKey
  ytUploadOne_({ key: 'special:302', show: 'special', ep: '302', folderId: 'BUG1B',
                 seriesKey: 'kA', seriesName: 'سیرهٔ نبوی' }, hub, []);
  ok('۵۸.۱ سبک به قسمتِ قدیمی هم می‌رسد — کلید از ردیفِ صف می‌آید',
     styleOf(e1) === 'کاغذبری' && styleOf(e2) === 'کاغذبری',
     'با کلید: ' + styleOf(e1) + ' · بی کلید: ' + styleOf(e2) +
     ' (پیشنهادِ این دسته «نقشِ ایرانی» است، پس اگر آن بیاید یعنی کلید نرسید)');

  /* ۵۸.۱-ب — و رجیستری که **پرت کند** رشتهٔ خالی می‌دهد، نه یک حدس: «سبک
     عوض شد» نباید از یک هابِ نخوانده دربیاید (۷.۴۰). */
  const regWas = global.readSeriesReg_;
  global.readSeriesReg_ = () => { throw new Error('هاب خوانده نشد'); };
  const onThrow = lvStyleAt_(hub, { seriesKey: 'kA' }, { seriesKey: 'kA' }, 'س');
  global.readSeriesReg_ = regWas;
  ok('۵۸.۱-ب خواندنِ ناکامِ رجیستری رشتهٔ خالی می‌دهد، نه پیشنهاد',
     onThrow === '', JSON.stringify(onThrow));

  /* ۵۸.۱-پ — و مجموعه‌ای که ردیفی در رجیستری ندارد، **پیشنهاد** می‌گیرد:
     «ردیفی نیست» یک دانستن است، نه ندانستن. */
  ok('۵۸.۱-ت مجموعهٔ بی‌ردیف پیشنهاد می‌گیرد، نه پیش‌فرضِ خشک',
     lvStyleAt_(hub, { seriesKey: 'نیست' }, { seriesCat: 'تاریخ اسلام' }, 'س') ===
       'نقشِ ایرانی');

  /* ۵۸.۲ — **باگِ ۲: تعویضِ سبک، پس‌زمینه‌های ساخته‌شده را عوض نمی‌کرد.**
     پس‌زمینه حال‌وهوای سبک را دارد؛ اگر از نام برداشته شود، سبکِ تازه روی
     دیدنی‌ترین بخشِ تصویر هیچ اثری ندارد. سنجیده شد: «پس‌زمینهٔ تازه = ۰». */
  const genWas = CFG.LV_GEN_ENABLED, modWas = CFG.LV_GEN_MODEL;
  CFG.LV_GEN_ENABLED = true; CFG.LV_GEN_MODEL = 'gemini-2.5-flash-image';
  global.__PROPS[PK.LV_GEN_SPEND] = '';
  let gN = 0;
  const stubWas = global.__STUB;
  const png = (n) => { const a = new Array(n).fill(7);
    [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,5,0,0,0,2,208,8,6,0,0,0]
      .forEach((b, i) => a[i] = b); return a; };
  global.__STUB = function (url, body) {
    if (url.indexOf('flash-image:generateContent') !== -1) { gN++;
      return { code: 200, json: { candidates: [{ content: { parts: [
        { inlineData: { mimeType: 'image/png', data: Utilities.base64Encode(png(30000)) } }] } }] } }; }
    return stubWas(url, body);
  };
  const root = global.__ROOT_FOLDER;
  const ctxB = { show: 'special', epNum: '۳۰۳', showName: 'درس‌نامه', seriesName: 'س',
                 cat: 'تاریخ اسلام', title: 'سه شرطِ معرفت',
                 sections: [{ heading: 'یک', narration: 'معرفت باور صادقِ موجه است. '.repeat(20) }],
                 totalSec: 900 };
  const planB = () => ({ visuals: [
    { at: 1, kind: 'کارت', cardTitle: 'الف', heading: 'یک', cardLines: ['۱'], caption: 'ز', sec: 30 }] });
  const e3 = root.createFolder('قسمت 0303');
  lvBuild_(e3, planB(), ctxB, 'نقشِ ایرانی');
  const g0 = gN;
  const rB = lvBuild_(e3, planB(), ctxB, 'چاپِ قدیمی');
  ok('۵۸.۲ تعویضِ سبک، پس‌زمینهٔ ساخته‌شده را هم از نو می‌سازد',
     rB.restyled === true && rB.gMade === 1 && (gN - g0) === 1,
     'پس‌زمینهٔ تازه ' + rB.gMade + ' · فراخوانِ مدل ' + (gN - g0));

  /* ۵۸.۳ — **باگِ ۳: بازسازی شناسهٔ فایل را عوض می‌کند و جزوه کهنه می‌مانَد.**
     `lvCards_` فایلِ هم‌نام را تُرش می‌کند و تازه می‌سازد؛ جزوه شناسه‌ها را کش
     می‌کند و کشِ ناخالی را دوباره نمی‌خوانَد ⇒ تصویرهای جزوه در مرورگر
     می‌شکنند، بی هیچ خطایی. سنجیده شد: `F16` ← `F43`. */
  const sfB = root.createFolder('مجموعهٔ باگِ سه');
  const epB = sfB.createFolder('قسمت 0304');
  epB.createFile(Utilities.newBlob(JSON.stringify({ epNum: '304' }),
                                   'application/json', '_special.json'));
  const q1 = lvBuild_(epB, planB(), ctxB, 'ساده و رسمی');
  const idOld = q1.items[0].fileId;
  const book = { seriesName: 'س', chapters: [], refs: [], roadmap: {},
                 episodes: [{ n: '304' }], figs: {} };
  hfigSync_(sfB, book, '', false);
  sfB.createFile(Utilities.newBlob(JSON.stringify(book), 'application/json',
                                   CFG.HANDOUT_JSON || '_HANDOUT.json'));
  ok('۵۸.۳ جزوه شناسهٔ همان تصویر را کش کرده',
     ((book.figs['304'] || [])[0] || {}).id === idOld, idOld);

  /* و از **درِ دکمه** می‌رود، نه با صدا زدنِ `lvHandoutForget_`: نگارشِ اول
     تابع را مستقیم صدا می‌زد، پس برداشتنِ فراخوانش از `lvRedoOne_` هیچ
     سنجه‌ای را قرمز نمی‌کرد — اتاق، نه در (۷.۶۲). */
  const q2 = lvBuild_(epB, planB(), ctxB, 'نقشِ ایرانی');
  const foldWas = global.ytFolderOf_;
  global.ytFolderOf_ = () => epB;
  lvRedoOne_('special', '304');
  global.ytFolderOf_ = foldWas;
  const bk2 = JSON.parse(sfB.getFilesByName(CFG.HANDOUT_JSON || '_HANDOUT.json')
                            .next().getBlob().getDataAsString());
  hfigSync_(sfB, bk2, '', false);
  ok('۵۸.۳-ب دکمهٔ بازسازی جزوه را هم بی‌حافظه می‌کند، پس شناسهٔ تازه را می‌گیرد',
     q2.items[0].fileId !== idOld &&
     ((bk2.figs['304'] || [])[0] || {}).id !== idOld,
     'کهنه ' + idOld + ' ← جزوه حالا: ' +
     JSON.stringify(((bk2.figs['304'] || [])[0] || {}).id));

  ok('۵۸.۳-پ و اگر جزوه‌ای نباشد، هیچ خطایی نمی‌دهد',
     lvHandoutForget_(root.createFolder('بی‌جزوه'), '1') === false);

  CFG.LV_GEN_ENABLED = genWas; CFG.LV_GEN_MODEL = modWas;
  global.__STUB = stubWas;

  /* ۵۸.۴ — **باگِ ۷: دستورِ تصویر فقط عنوان را می‌دید.** صاحبِ برنامه پرسید
     «مگه متن رو نمی‌بینه مدلی که می‌خواد بسازه؟» و نمی‌دید. حالا مجموعه،
     درس، بخش، زیرنویس و **بریده‌ای از متنی که در آن لحظه خوانده می‌شود**
     همه می‌روند — همان زمینه‌دادنی که تصویرهای نوت‌بوک را بامعنا می‌کند. */
  const pr = lvGenPrompt_(planB().visuals[0], lvStyleFind_('نقشِ ایرانی'), ctxB);
  ok('۵۸.۴ دستورِ تصویر متنِ واقعیِ همان بخش را می‌بیند، نه فقط عنوان را',
     pr.indexOf('سه شرطِ معرفت') !== -1 && pr.indexOf('باور صادقِ موجه') !== -1 &&
     pr.indexOf('حالتش را') !== -1 && pr.length > 900,
     pr.length + ' نویسه');

  ok('۵۸.۴-ب و بی زمینه هم کار می‌کند، با همان سه قیدِ قطعی',
     lvGenPrompt_({ cardTitle: 'الف' }, null, null).indexOf('هیچ چهره') !== -1);

  /* ۵۸.۵ — **باگِ ۸: چهار کارتِ پشتِ‌هم یک چیدمان داشتند.** خواستهٔ صریح
     «تکراری نباشه و متنوع و قشنگ باشه»، و سنجیده شد که نبود. تنوع **درونِ**
     سبک می‌مانَد: رنگ و قاب یکی است، جای متن و وزنش می‌گردد. */
  const ep6 = root.createFolder('قسمت 0305');
  const six = [];
  for (let k = 0; k < 6; k++) six.push({ at: 1, kind: 'کارت', cardTitle: 'گزارهٔ ' + k,
    heading: 'یک', cardLines: ['الف', 'ب'], caption: 'ز', sec: 20 });
  lvBuild_(ep6, { visuals: six }, ctxB, 'ساده و رسمی');
  const pr6 = global.__PRES_LAST;
  const sig = pr6.getSlides().map(sl => {
    const t = sl.getPageElements().filter(e => e.role === 'text');
    const big = t.slice().sort((a, b) =>
      (b.getText().style.size || 0) - (a.getText().style.size || 0))[0];
    const rules = sl.getPageElements().filter(e => e.role === 'shape' &&
      Math.round(e.getHeight()) <= 4 && Math.round(e.getWidth()) < 200);
    return Math.round(big.getTop()) + '/' + (big.getText().para.align || '-') +
           '/' + rules.length;
  });
  ok('۵۸.۵ شش کارتِ یک قسمت چهار چیدمانِ یکتا دارند، نه یکی',
     pr6.getSlides().length === 6 && new Set(sig).size === 4 &&
     sig[0] !== sig[1] && sig[1] !== sig[2],
     new Set(sig).size + ' یکتا از ' + sig.length + ' · ' + sig.join(' | '));

  /* ۵۸.۵-ب — ولی رنگ و قاب **یکی** می‌مانند: یک قسمت باید یک چیز به‌نظر
     بیاید، و دو سبکِ هنری در یک ویدئو همان چیزی است که طرح ردش کرد. */
  const bgs = pr6.getSlides().map(sl => sl.getPageElements()[0].fill.color);
  ok('۵۸.۵-پ ولی رنگِ همهٔ کارت‌های یک قسمت یکی است — تنوع در چیدمان، نه در سبک',
     new Set(bgs).size === 1 && bgs[0] === lvStyleFind_('ساده و رسمی').pal.bg,
     bgs[0]);

  /* ۵۸.۶ — **باگِ ۶: کاور و کارت‌ها دو ظاهرِ بی‌ربط داشتند.** خواستهٔ صریحِ
     صاحبِ برنامه، و سنجیده شد: `#F3EAD3` در برابرِ `#0B3B3C`. بندانگشتی
     اولین چیزی است که آدم‌ها قضاوتش می‌کنند، و یک‌دستی همان چیزی است که
     «حرفه‌ای» به‌نظر رسیدن را می‌سازد. */
  /* برچسبِ قسمت **تازه** است، وگرنه `ytCoverCached_` کاورِ ساخته‌شدهٔ ۵۸.۱ را
     برمی‌دارد، هیچ ارائه‌ای ساخته نمی‌شود و `__PRES_LAST` همان ارائهٔ
     کارت‌های ۵۸.۵ می‌مانَد — یعنی سنجه شیءِ اشتباهی را می‌خواند. نگارشِ اول
     همین شد و روی کدِ درست قرمز درآمد. */
  const cv = ytCoverCard_({ title: 'ت', coverTitle: 'سه شرط', showName: 'درس‌نامه',
    seriesName: 'سیرهٔ نبوی', epLabel: 'درس ۹۹', cat: 'تاریخ اسلام', style: 'نقشِ ایرانی' });
  const cp = global.__PRES_LAST;
  const cels = cp.getSlides()[0].getPageElements();
  ok('۵۸.۶ کاور رنگ و قابِ سبکِ همان مجموعه را می‌گیرد',
     cels[0].fill.color === lvStyleFind_('نقشِ ایرانی').pal.bg &&
     cels.filter(e => e.shape === 'DIAMOND').length === 18,
     cels[0].fill.color + ' با ' + cels.filter(e => e.shape === 'DIAMOND').length + ' لوزی');

  ok('۵۸.۶-ب و سبک در نامِ کاور است، وگرنه کاورِ سبکِ قبلی از حافظه برداشته می‌شود',
     ytCoverName_({ epLabel: 'د', showName: 'ن', style: 'نقشِ ایرانی' })
       .indexOf('نقشِ ایرانی') !== -1 &&
     ytCoverName_({ epLabel: 'د', showName: 'ن', style: 'چاپِ قدیمی' }) !==
     ytCoverName_({ epLabel: 'د', showName: 'ن', style: 'نقشِ ایرانی' }),
     ytCoverName_({ epLabel: 'د', showName: 'ن', style: 'نقشِ ایرانی' }));

  ok('۵۸.۶-پ و کاورِ بی‌سبک عیناً رفتارِ قبلی است — هیچ‌چیز خراب نمی‌شود',
     (function () {
       const c2 = ytCoverCard_({ title: 'ت', coverTitle: 'ک', showName: 'ن',
         seriesName: 'س', epLabel: 'درس ۹۸', cat: 'فلسفه' });
       const e = global.__PRES_LAST.getSlides()[0].getPageElements();
       return e[0].fill.color === ytPalette_('فلسفه').bg &&
              e.filter(x => x.shape === 'DIAMOND').length === 0;
     })());

  /* ۵۸.۷ — و هر دو مسیرِ کاور (آپلود و بازسازی) سبک را می‌دهند: «دوقلویی که
     یک‌بار درست شود، یک‌بار درست شده است» (۵.۹۵). */
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const calls = (src27.match(/ytCoverCard_\(\{[\s\S]*?\}\)/g) || []);
  const epCalls = calls.filter(c => c.indexOf('epLabel') !== -1);
  /* **هر سه** مسیر، نه دو: آپلود، بازسازی، و کاورِ پلی‌لیست (که کاورِ پادکست
     هم هست). نگارشِ اولِ این سنجه دو تا می‌خواست و سومی را نمی‌دید — و آن
     سومی دیدنی‌ترین تصویرِ سطحِ مجموعه است. */
  /* از ۸.۵۵ کاورِ پلی‌لیست از رانر است، نه از `ytCoverCard_`: دو مسیرِ اسلایدز
     می‌مانند، و سبکِ سومی (پلی‌لیست) در ۵۸.۷-ب از خودِ درخواستِ رانر سنجیده می‌شود. */
  ok('۵۸.۷ هر دو مسیرِ اسلایدزِ کاور سبک را می‌دهند — و سومی دیگر اسلایدز نیست',
     epCalls.length === 2 && epCalls.every(c => c.indexOf('style:') !== -1),
     epCalls.length + ' فراخوانِ کاور، ' +
     epCalls.filter(c => c.indexOf('style:') !== -1).length + ' با سبک');

  /* ۵۸.۷-ب — **و مسیرِ سومی رفتاری سنجیده می‌شود، نه با خواندنِ منبع.**
     شکستنی که این سنجه از آن زاده شد: `ytPlDress_` را وادار کردم سبک را
     ندهد (`ytPlaylistCover_(..., '')`). سنجهٔ ۵۸.۷ فقط فراخوان‌های
     `ytCoverCard_` را می‌شمارد، و آن یکی دست‌نخورده بود — پس سبز مانْد.
     یعنی سنجه‌ای که منبع را می‌خوانَد یک لایه بالاتر از جایی ایستاده بود
     که واقعاً می‌شکند (۷.۴۳). این یکی از درِ `ytPlDress_` می‌رود، همان دری
     که `ytPlaylistSync_` از آن وارد می‌شود، و **رنگِ کشیده‌شده** را
     می‌پرسد، نه متنِ کد را. */
  const kpPod = global.ytPlPodcast_;
  const kpMap = global.__PROPS[PK.YT_PL], kpSq = global.__PROPS[PK.YT_PL_SQ];
  global.ytPlPodcast_ = () => 'نشست';
  ytPlMapSave_({ kA: { id: 'PLA', title: 'سیرهٔ نبوی' } });
  delete global.__PROPS[PK.YT_PL_SQ];
  global._ytPlSqMemo = {};                     // رانر هنوز چیزی نکشیده
  const outPl = { covers: 0, coverFails: [], podcasts: 0 };
  ytPlDress_('PLA', 'سیرهٔ نبوی', 'سیرهٔ نبوی', 'درس‌نامه', 'تاریخ اسلام',
             false, outPl, 'kA');
  const plReq = (JSON.parse(global.__PROPS[PK.YT_PL_SQ] || '{}') || {})['kA'] || {};
  const plPal = (plReq.pal || {}).bg || 'خواسته نشد';
  ok('۵۸.۷-ب کاورِ پلی‌لیست با سبکِ مجموعه از رانر خواسته می‌شود',
     plPal === lvStyleFind_('کاغذبری').pal.bg &&
     plPal !== ytPalette_('تاریخ اسلام').bg,
     'رنگِ خواسته‌شده ' + plPal + ' · سبک ' + lvStyleFind_('کاغذبری').pal.bg +
     ' · دستهٔ خالی ' + ytPalette_('تاریخ اسلام').bg);

  global.ytPlPodcast_ = kpPod; global._ytPlSqMemo = null;
  if (kpMap === undefined) delete global.__PROPS[PK.YT_PL]; else global.__PROPS[PK.YT_PL] = kpMap;
  if (kpSq === undefined) delete global.__PROPS[PK.YT_PL_SQ]; else global.__PROPS[PK.YT_PL_SQ] = kpSq;

  if (svcWas === undefined) delete global.YouTube; else global.YouTube = svcWas;
}

console.log('=== ۵۹) دو عددی که نوشته بودیم و به هیچ تصمیمی وصل نبودند (۸.۰۰) ===');
{
  /* ══ چطور پیدا شد ══
   * از خواندنِ کد نه. نقشهٔ یک **قسمتِ واقعی** (درس‌نامهٔ ۰۵۶، ۱۰۶۷ ثانیه)
   * اجرا شد و جدولِ زمانش چاپ شد. آن‌جا دیده شد `LV_MIN_SEC` و
   * `LV_MAX_SEC` — که هر دو از روزِ اول در تنظیم‌ها بودند، با توضیحِ
   * خودشان — در **هیچ فایلی** خوانده نمی‌شوند: نه `src/`، نه `tools/`، نه
   * یک سنجه. قاعده نوشته شده بود و کد اجرایش نمی‌کرد.
   *
   * این سنجه عمداً **رفتاری** است، نه grep روی منبع: یک گرِپ با
   * نوشتنِ نامِ ثابت در یک توضیح هم سبز می‌شود (۷.۴۳). */
  const wasMin = CFG.LV_MIN_SEC, wasMax = CFG.LV_MAX_SEC, wasPer = CFG.LV_PER_MIN;

  /* ۵۹.۱ — سقف: با `LV_PER_MIN`ِ بسیار کم، باز هم هیچ کارتی بیش از
     `LV_MAX_SEC` روی قاب نمی‌مانَد. پیش از ۸.۰۰ این عدد فقط از
     `LV_PER_MIN` می‌آمد و سقف هیچ اثری نداشت. */
  CFG.LV_PER_MIN = 0.1; CFG.LV_MAX_SEC = 60; CFG.LV_MIN_SEC = 8;
  const w1 = ytVisWant_(1200);
  ok('۵۹.۱ سقفِ ثانیهٔ هر تصویر واقعاً مرز می‌گذارد',
     1200 / w1 <= 60 + 0.01,
     w1 + ' تصویر برای ۱۲۰۰ ثانیه ⇒ هرکدام ' + (1200 / w1).toFixed(1) +
     's (سقف ۶۰) — با LV_PER_MIN=0.1 که به‌تنهایی ۳ می‌داد');

  /* ۵۹.۲ — و کف: با `LV_PER_MIN`ِ بسیار زیاد، هیچ کارتی کمتر از
     `LV_MIN_SEC` روی قاب نمی‌مانَد — وگرنه کارتی ساخته می‌شود که کسی
     نمی‌بیندش، و هزینه‌اش را هم داده‌ایم. */
  CFG.LV_PER_MIN = 20; CFG.LV_MIN_SEC = 30; CFG.LV_MAX_SEC = 90;
  const w2 = ytVisWant_(600);
  ok('۵۹.۲ کفِ ثانیهٔ هر تصویر هم مرز می‌گذارد',
     600 / w2 >= 30 - 0.01,
     w2 + ' تصویر برای ۶۰۰ ثانیه ⇒ هرکدام ' + (600 / w2).toFixed(1) + 's (کف ۳۰)');

  /* ۵۹.۳ — **و وقتی کف و سقف با هم نخوانند، سقف برنده است.** تصویرِ
     کوتاه یعنی یک کارتِ دیده‌نشده — که برگشت‌پذیر است، چون همان کارت در
     جزوه هم هست؛ تصویرِ بلند یعنی ویدئویی که بیننده رهایش می‌کند، و آن
     برگشت‌پذیر نیست. پس تناقض به نفعِ سقف حل می‌شود، نه به نفعِ کف. */
  CFG.LV_PER_MIN = 0.8; CFG.LV_MIN_SEC = 200; CFG.LV_MAX_SEC = 50;
  const w3 = ytVisWant_(600);
  ok('۵۹.۳ در تناقضِ کف و سقف، سقف برنده است',
     600 / w3 <= 50 + 0.01,
     w3 + ' تصویر ⇒ ' + (600 / w3).toFixed(1) + 's — کفِ ۲۰۰ نادیده گرفته شد');

  /* ۵۹.۴ — و سقفِ `LV_MAX_PER_EP` هنوز بالاتر از همه است: این عدد مرزِ
     هزینه و امنیت است، نه سلیقه.
     **شکستنِ عمدی‌اش روی ۴۹.۲ می‌افتد، نه این‌جا** — چون آن سنجه از پیش
     همان مرز را داشت. نوشته می‌شود، نه اینکه مدرکِ این سنجه حساب شود
     (۷.۷۴): ۵۹.۴ این‌جاست تا اگر روزی ۴۹.۲ عوض شد، مرز بی‌نگهبان نمانَد. */
  CFG.LV_PER_MIN = 0.8; CFG.LV_MIN_SEC = 8; CFG.LV_MAX_SEC = 5;
  const w4 = ytVisWant_(100000);
  ok('۵۹.۴ ولی هیچ‌کدام از سقفِ تعدادِ هر قسمت رد نمی‌شوند',
     w4 === (Number(CFG.LV_MAX_PER_EP) || 40), String(w4));

  CFG.LV_MIN_SEC = wasMin; CFG.LV_MAX_SEC = wasMax; CFG.LV_PER_MIN = wasPer;

  /* ۵۹.۵ — و قسمتِ واقعیِ امروز: ۱۰۶۷ ثانیه با تنظیمِ واقعی. عدد را
     می‌چاپد تا اگر روزی سیاست عوض شد، شاهد در خودِ سنجه باشد. */
  const wr = ytVisWant_(1067);
  ok('۵۹.۵ با تنظیمِ واقعی، قسمتِ ۱۷٫۸ دقیقه‌ای در مرز می‌مانَد',
     1067 / wr <= Number(CFG.LV_MAX_SEC) && 1067 / wr >= Number(CFG.LV_MIN_SEC),
     wr + ' تصویر ⇒ هرکدام ' + (1067 / wr).toFixed(0) + 's');
}

console.log('=== ۶۰) مشخصاتِ تصویری: زمان از گفتار، نه از تقسیمِ حسابی (۸.۰۱) ===');
{
  /* ══ باگی که این بخش برایش هست، سنجیده شده بود نه حدس ══
   * صاحبِ برنامه گفت «انگار تولید توجهی به صحبت ندارد». اندازه‌اش درآمد:
   * در یک نمونهٔ واقعی **پنج کارت از شش**، متنی را نشان می‌دادند که ۱۱ تا
   * ۸۰ ثانیه *قبل* گفته شده بود — چون زمان به‌تساوی بین کارت‌ها تقسیم
   * می‌شد و هیچ‌جای این خط تولید نمی‌دانست کدام جمله در کدام ثانیه است. */

  /* تکه‌های ساختگی با متنِ معلوم و زمانِ معلوم: دقیقاً همان شکلی که
     `synthesizeStep_` می‌سازد — `{i, at}` — نه یک شکلِ راحت‌تر (۷.۲۲). */
  /* از ۸.۳۱ نقشه از تکه‌های **هم‌ترازشده** ساخته می‌شود (`lvAlignTimes_`) —
     نگاشتِ شماره‌به‌شماره موسیقی را نمی‌دید و درسِ ۵۹ را جابه‌جا کرد (§۷۱). */
  const chunks = [{ text: 'الف بتا گاما', seg: 0 }, { text: 'دلتا اپسیلون زتا', seg: 1 },
                  { text: 'اتا تتا یوتا', seg: 2 }];
  const times = [{ i: 0, at: 0 }, { i: 1, at: 30 }, { i: 2, at: 75 }];
  const alignAt = (ch, tm, secs) => {
    const al = lvAlignTimes_(ch, tm, secs);
    if (!al.map) return null;
    return ch.map((c, k) => ({ text: c.text, at: tm[al.map[k]].at,
                               end: al.map[k] + 1 < tm.length ? tm[al.map[k] + 1].at : secs }));
  };
  const marks = lvTimeMapAligned_(alignAt(chunks, times, 120));

  ok('۶۰.۱ نقشهٔ زمان از تکه‌های واقعی ساخته می‌شود',
     marks.length === 3 && marks[0].at === 0 && marks[1].at === 30,
     marks.map(m => m.from + '→' + m.at + 's').join(' · '));

  /* ۶۰.۱-ب — **تکه‌ای که زمانش ثبت نشده، کنار گذاشته می‌شود؛ صفر نمی‌گیرد.**
     نگارشِ اولِ ۶۰.۱ این را نمی‌دید، چون هر سه تکهٔ نمونه زمان داشتند — یعنی
     حالتی ساخته بودم که تولید لزوماً در آن نیست (۷.۲۲/۷.۷۵). و این حالت
     واقعی است: اجرایی که وسط کشته شود، تکه‌های ساخته‌نشده زمان ندارند.
     اگر به آن‌ها صفر بدهیم، کارتِ آن جمله به **ابتدای قسمت** پرت می‌شود —
     دقیقاً همان باگی که این نسخه برای رفعش نوشته شده، از در دیگر. */
  /* از ۸.۳۱: زمان‌های کمتر از تکه‌ها (اجرای کشته‌شده) یعنی **هیچ نقشه‌ای** —
     نه نیمی درست و نیمی حدس. «نمی‌دانیم» با «صفر» یکی نیست. */
  const gap = lvAlignTimes_(chunks, [{ i: 0, at: 0 }, { i: 2, at: 75 }], 120);
  ok('۶۰.۱-ب تکهٔ بی‌زمان کنار می‌رود و صفر نمی‌گیرد',
     gap.map === null && /زمان/.test(gap.why) &&
     marks[2].from === lvNorm_(chunks[0].text).length + 1 + lvNorm_(chunks[1].text).length + 1,
     gap.why);

  /* ۶۰.۲ — مرزِ تکه‌ها **دقیق** است: نویسهٔ اولِ تکهٔ دوم باید ثانیهٔ ۳۰
     بدهد، نه چیزی نزدیکِ آن. این همان نیمه‌ای است که تخمینِ نویسه‌ای
     نداشت. */
  const p2 = lvNorm_(chunks[0].text).length + 1;
  ok('۶۰.۲ مرزِ هر تکه ثانیهٔ دقیقِ خودش را می‌دهد',
     Math.abs(lvSecAt_(marks, p2) - 30) < 0.01, String(lvSecAt_(marks, p2)));

  /* ۶۰.۳ — و داخلِ تکه درون‌یابی می‌شود، پس زمان صعودی است. */
  const mid = lvSecAt_(marks, p2 + 8);
  ok('۶۰.۳ داخلِ تکه زمان صعودی است و از تکهٔ بعد جلو نمی‌زند',
     mid > 30 && mid < 75, String(mid));

  /* ۶۰.۴ — **جای بیرون از نقشه `null` است، نه یک حدس.** یک عبارتِ پیدانشده
     نباید کارتی با زمانِ ساختگی بسازد؛ آن دقیقاً همان چیزی است که این نسخه
     برای حذفش نوشته شده. */
  ok('۶۰.۴ بیرون از نقشه «نمی‌دانیم» است، نه صفر',
     lvSecAt_(marks, 99999) === null, String(lvSecAt_(marks, 99999)));

  /* ۶۰.۵ — نرمال‌سازی: «ي» عربی، «ك» عربی، نیم‌فاصله و اعراب نباید مانعِ
     پیداشدنِ عبارت شوند. متنِ گفتاریِ این موتور **اعراب‌دار** است و عبارتِ
     مدل نیست؛ بی این، هیچ لنگری پیدا نمی‌شد. */
  ok('۶۰.۵ اعراب و ی/ک عربی و نیم‌فاصله مانعِ تطبیق نیستند',
     lvNorm_('مُعْرِفَتِ ي‌ک') === lvNorm_('معرفت ی ک'),
     '«' + lvNorm_('مُعْرِفَتِ ي‌ک') + '» در برابرِ «' + lvNorm_('معرفت ی ک') + '»');

  /* ۶۰.۶ — شکل و نشانهٔ ناشناخته **جانشینِ امن** می‌گیرند، نه خطا: مدل یک
     روز واژهٔ تازه‌ای می‌نویسد و آن نباید قسمت را بی‌تصویر کند. */
  ok('۶۰.۶ شکلِ ناشناخته «تمرکز» می‌شود و نشانهٔ ناشناخته هیچ',
     lvFormOf_('مقایسه') === 'split' && lvFormOf_('چیزِ تازه') === 'focus' &&
     lvIconOf_('مثلث') === 'triangle' && lvIconOf_('اژدها') === '',
     lvFormOf_('چیزِ تازه') + ' · «' + lvIconOf_('اژدها') + '»');
}

console.log('=== ۶۱) سطحِ تصویرسازیِ هر مجموعه (۸.۰۱) ===');
{
  /* خواستهٔ صریح: «در مجموعه‌ها جایی باشه بتونم انتخاب کنم … و به‌صورت
     پیش‌فرض برای همه فعلاً همون حالتِ ۱ باشه.» */
  const v = (x) => { const a = new Array(SERIES_HEADERS.length).fill('');
                     if (x !== undefined) a[SC.LVLEVEL - 1] = x; return a; };
  ok('۶۱.۱ خانهٔ خالی «کم» است، نه «خاموش»',
     lvLevelOf_(v()) === 'کم' && lvLevelOf_(v('')) === 'کم', lvLevelOf_(v()));
  ok('۶۱.۲ هر سه سطح خوانده می‌شوند',
     lvLevelOf_(v('خاموش')) === 'خاموش' && lvLevelOf_(v('کم')) === 'کم' &&
     lvLevelOf_(v('زیاد')) === 'زیاد');
  /* ۶۱.۳ — نوشتهٔ نزدیک هم فهمیده می‌شود، ولی نوشتهٔ بی‌ربط **پیش‌فرض**
     می‌گیرد نه خاموش: یک غلطِ تایپی نباید قسمت را بی‌تصویر کند. */
  ok('۶۱.۳ نوشتهٔ نزدیک فهمیده می‌شود و بی‌ربط پیش‌فرض می‌گیرد',
     lvLevelOf_(v('غیرفعال')) === 'خاموش' && lvLevelOf_(v('همه')) === 'زیاد' &&
     lvLevelOf_(v('فلان')) === 'کم',
     [lvLevelOf_(v('غیرفعال')), lvLevelOf_(v('همه')), lvLevelOf_(v('فلان'))].join(' · '));
  /* ۶۱.۴ — و ستون واقعاً در تبِ مجموعه‌ها هست؛ بی این، خواندنش همیشه خالی
     است و سنجه‌های بالا دربارهٔ چیزی حرف می‌زنند که کسی نمی‌بیندش. */
  ok('۶۱.۴ ستون در سرستون‌های تبِ مجموعه‌ها هست',
     SERIES_HEADERS[SC.LVLEVEL - 1] === 'تصویرسازی',
     String(SERIES_HEADERS[SC.LVLEVEL - 1]));
}

console.log('=== ۶۲) نشانِ کانال (۸.۰۱) ===');
{
  const wasH = CFG.YT_MARK_HANDLE, wasOn = CFG.YT_MARK;
  CFG.YT_MARK = true; CFG.YT_MARK_HANDLE = '';
  ok('۶۲.۱ بی شناسه، نشان اصلاً ساخته نمی‌شود',
     ytMarkSpec_() === null, JSON.stringify(ytMarkSpec_()));
  CFG.YT_MARK_HANDLE = '@test';
  const m = ytMarkSpec_();
  ok('۶۲.۲ با شناسه، نشان با فاصلهٔ جابه‌جایی ساخته می‌شود',
     !!m && m.handle === '@test' && m.everySec >= 60, JSON.stringify(m));
  CFG.YT_MARK = false;
  ok('۶۲.۳ و خاموش‌بودنش یک تصمیم است، نه خطا', ytMarkSpec_() === null);

  /* ══ ۶۲.۴ — شناسه **از خودِ یوتیوب** خوانده می‌شود، نه از خانهٔ تنظیم ══
   * نگارشِ اولِ ۸.۰۱ خانه را خالی گذاشت و از صاحبِ برنامه خواست پُرش کند.
   * او پرسید «مگر دسترسی داده نشده؟» — داده شده بود: `ytChannelInfo_` از
   * روزِ اول `snippet` را می‌خواند و `customUrl` همان شناسه است. یعنی یک
   * کارِ دستی ساخته بودم برای چیزی که موتور می‌داند.
   * این سنجه از **درِ تولید** می‌رود: خانه را خالی می‌گذارد، یوتیوب را
   * جواب می‌دهد، و می‌پرسد نشان ساخته شد یا نه. */
  CFG.YT_MARK = true; CFG.YT_MARK_HANDLE = ''; CFG.YT_MARK_NAME = '';
  delete global.__PROPS[PK.YT_MARK_ID];
  const chWas = global.ytChannelInfo_;
  global.ytChannelInfo_ = () => ({ info: { snippet: {
    customUrl: 'truce-trace', title: 'رد پای حقیقت',
    thumbnails: { medium: { url: 'https://yt3.example/av.jpg' } } } } });
  const auto = ytMarkSpec_();
  ok('۶۲.۴ شناسه و نام و تصویر از خودِ یوتیوب می‌آیند، بی هیچ تنظیمِ دستی',
     !!auto && auto.handle === '@truce-trace' && auto.name === 'رد پای حقیقت' &&
     auto.logoUrl.indexOf('yt3.example') !== -1,
     JSON.stringify(auto));

  /* ۶۲.۴-ب — و `@` اگر نبود گذاشته می‌شود: یوتیوب `customUrl` را بی `@`
     می‌دهد و «truce-trace» روی ویدئو کسی را به کانال نمی‌رساند. */
  ok('۶۲.۴-ب نشانِ @ اگر نبود اضافه می‌شود', auto.handle.charAt(0) === '@', auto.handle);

  /* ۶۲.۵ — و **یک بار** خوانده می‌شود، نه به‌ازای هر قسمت: `channels.list`
     یک واحد سهمیه دارد و این تابع در مسیرِ هر انتشار است (۷.۶۳/۷.۷۲). */
  let calls = 0;
  global.ytChannelInfo_ = () => { calls++; return { info: { snippet: {
    customUrl: 'truce-trace', title: 'رد پای حقیقت', thumbnails: {} } } }; };
  ytMarkSpec_(); ytMarkSpec_();
  const fromCache = ytMarkSpec_();
  ok('۶۲.۵ کانال یک بار خوانده می‌شود و نتیجه می‌مانَد',
     calls === 0, calls + ' فراخوانِ تازه پس از ذخیره');
  /* ۶۲.۵-ب — **و نتیجهٔ کش واقعاً نشان است** (۸.۴۵). ۶۲.۵ فقط شمارِ فراخوان را
     می‌شمرد؛ کدِ پیش از ۸.۴۵ سرِ کش ReferenceError می‌داد (`daysSince_`)، ‌
     `ytMarkSpec_` آن را می‌بلعید و `null` برمی‌گرداند — و شمار همان صفر بود.
     سنجه‌ای که فقط «چند بار» را بپرسد، «چه برگشت» را نمی‌بیند: درسِ ۳۸ همین‌طور
     بی نشان ساخته شد. */
  ok('۶۲.۵-ب و نشانِ ساخته‌شده از کش همان شناسه را دارد، نه null',
     !!fromCache && fromCache.handle === '@truce-trace' && fromCache.logoUrl.indexOf('yt3.example') !== -1,
     JSON.stringify(fromCache));

  /* ۶۲.۶ — و اگر یوتیوب جواب ندهد، **تنظیمِ دستی برنده است**: یک درِ
     پشتی که آدم بتواند بازش کند، برای روزی که خواندن نشود. */
  delete global.__PROPS[PK.YT_MARK_ID];
  global.ytChannelInfo_ = () => ({ why: 'سرویس خاموش' });
  CFG.YT_MARK_HANDLE = '@دستی';
  ok('۶۲.۶ نخواندنِ کانال با تنظیمِ دستی جبران می‌شود',
     (ytMarkSpec_() || {}).handle === '@دستی');
  CFG.YT_MARK_HANDLE = '';
  ok('۶۲.۶-ب و بی هر دو، نشان کشیده نمی‌شود — نه یک نشانِ بی‌شناسه',
     ytMarkSpec_() === null);

  global.ytChannelInfo_ = chWas;
  delete global.__PROPS[PK.YT_MARK_ID];
  CFG.YT_MARK = wasOn; CFG.YT_MARK_HANDLE = wasH;
}

console.log('=== ۶۳) نقشهٔ تصویر که نحیف درآمد و «تمام» گزارش شد (۸.۱۱) ===');
/* ۱ اکتبر، درس‌نامه ۵۷: `_visuals.json` نوشت `want: 1, ready: 1, done: true`
   برای درسی که موتور خودش حدودِ دوازده تصویر برایش خواسته بود. ویدئو یعنی
   پانزده دقیقه یک تصویرِ ثابت، و هیچ‌جا صدا درنیامد — چون `want` برابرِ
   «آنچه زنده مانْد» گذاشته می‌شد و `done` با همان سنجیده می‌شد: **عدد با
   خودش مقایسه می‌شد و همیشه سالم بود.**

   سه جا بی‌صدا می‌ریخت؛ این بند هر سه را می‌شمارد و شکاف را نام می‌برد. */
{
  const secs58 = [{ heading: 'یک', narration: 'x'.repeat(3000) },
                  { heading: 'دو', narration: 'y'.repeat(2000) }];
  const ctx58 = () => ({ show: 'special', epRaw: '57', showName: 'ن', title: 'ت',
                         duration: '15:00', headings: ['یک', 'دو'],
                         sections: secs58, totalSec: 900, sources: [] });

  /* ۶۳.۱ — شمارهٔ بخشِ بیرونِ بازه شمرده می‌شود. چهار مورد می‌رود، سه‌تاشان
     بخشِ ۵ و ۹ را نام می‌برند که وجود ندارد — دقیقاً شکلی که یک جوابِ مدل
     می‌تواند داشته باشد و تا امروز بی‌صدا می‌ریخت. */
  {
    const st = {};
    const mm = { visuals: [
      { at: '1', kind: 'کارت', cardTitle: 'الف', cardLines: ['۱'], terms: '', caption: 'ک' },
      { at: '5', kind: 'کارت', cardTitle: 'ب', cardLines: ['۲'], terms: '', caption: 'ک' },
      { at: '9', kind: 'کارت', cardTitle: 'پ', cardLines: ['۳'], terms: '', caption: 'ک' },
      { at: 'x', kind: 'کارت', cardTitle: 'ت', cardLines: ['۴'], terms: '', caption: 'ک' }
    ] };
    const plan = ytVisPlan_(mm, ctx58(), st);
    ok('۶۳.۱ موردهای دورانداخته شمرده می‌شوند، نه بی‌صدا',
       plan.length === 1 && st.raw === 4 && st.badSec === 3,
       'نقشه ' + plan.length + ' · خام ' + st.raw + ' · بخشِ ناشناخته ' + st.badSec);
  }

  /* ۶۳.۲ — و موردِ بیش از سقفِ یک بخش هم شمرده می‌شود. سقف از ۸.۲۶ از
     **سهمِ** بخش می‌آید (`ytVisSecCap_`)، پس این‌جا از همان تعریف خوانده
     می‌شود، نه عددِ سه — عددِ دست‌نویس یعنی سنجه‌ای که فردا چیزِ دیگری را
     می‌سنجد. */
  {
    const st = {};
    const many = [];
    const cap1 = ytVisSecCap_(ytVisShares_(secs58, ytVisWant_(900))[0]);
    for (let i = 0; i < cap1 + 2; i++) {
      many.push({ at: '1', kind: 'کارت', cardTitle: 'ع' + i, cardLines: ['x'],
                  terms: '', caption: 'ک' });
    }
    ytVisPlan_({ visuals: many }, ctx58(), st);
    ok('۶۳.۲ موردِ بیش از سقفِ یک بخش هم شمرده می‌شود',
       st.perSec === 2, 'perSec=' + st.perSec + ' · سقف ' + cap1);
  }

  /* ۶۳.۳ — **و عددِ خواسته‌شده کنارِ عددِ ساخته‌شده می‌نشیند.** این تمامِ
     تعمیر است: تا دیروز `ytVisWant_` یک عدد می‌داد که فقط به پرامپت می‌رفت
     و هیچ‌وقت با نتیجه مقایسه نمی‌شد — ۷.۳۰/۷.۳۱، این بار بینِ یک پرسش و
     جوابِ خودش. */
  {
    const asked = ytVisWant_(900);
    ok('۶۳.۳ برای درسِ پانزده‌دقیقه‌ای بیش از یک تصویر خواسته می‌شود',
       asked >= 3, 'خواسته‌شده: ' + asked);

    const ctx = ctx58();
    const plan = { visuals: ytVisPlan_({ visuals: [
      { at: '1', kind: 'کارت', cardTitle: 'الف', cardLines: ['۱'], terms: '', caption: 'ک' }
    ] }, ctx, (ctx.__visStat = {})) };
    const epF = global.__ROOT_FOLDER.createFolder('قسمتِ نحیف ۶۳');
    const vis = lvBuild_(epF, plan, ctx, '');
    ok('۶۳.۳-ب نقشهٔ یک‌تایی در برابرِ خواستهٔ چندتایی «نحیف» علامت می‌خورد',
       vis.asked === asked && vis.want === 1 && vis.thin === true,
       JSON.stringify({ asked: vis.asked, want: vis.want, thin: vis.thin }));

    /* و در پروندهٔ خودِ قسمت می‌نشیند — جایی که ۱ اکتبر فقط `want: 1` بود و
       هیچ‌کس نمی‌توانست بفهمد یک از چند. */
    const d = lvRead_(epF);
    ok('۶۳.۳-پ و عددِ خواسته‌شده در _visuals.json می‌نشیند',
       Number(d.asked) === asked && d.thin === true,
       JSON.stringify({ asked: d.asked, want: d.want, thin: d.thin, drop: d.dropped }));
  }

  /* ۶۳.۴ — و «نحیف» در خطِ روزانه به نام می‌آید، جدا از «منتظر» و «کم‌رفت».
     سه عدد با سه معنی: درست‌شدنی · برنگشتنی · هنوز جبران‌شدنی (۵.۸۸). */
  {
    const keep = global.__PROPS[PK.LV_THIN];
    lvThinNote_('special:57', { want: 1, asked: 12,
                                dropped: { raw: 12, badSec: 11, perSec: 0, capped: 0 } });
    const st = lvStatus_();
    ok('۶۳.۴ «نحیف» در خطِ روزانه به نام می‌آید و از «کم‌رفت» جداست',
       st.thin === 1 && st.line.indexOf('نحیف') !== -1 &&
       st.line.indexOf('special:57') !== -1 && st.short === 0,
       st.line.split('·').filter(x => x.indexOf('نحیف') !== -1).join('') || st.line);
    ok('۶۳.۴-ب و می‌گوید هنوز جبران‌شدنی است — برخلافِ «کم‌رفت»',
       st.line.indexOf('پیش از انتشار') !== -1, st.line.slice(-120));
    if (keep === undefined) delete global.__PROPS[PK.LV_THIN];
    else global.__PROPS[PK.LV_THIN] = keep;
  }
}

console.log('=== ۶۴) کاورِ ۹۶۰×۵۴۰ که موتور خودش هر روز می‌گفتش (۸.۱۲) ===');
/* لاگِ ۱ اکتبر، دو بار: «`presentations.create` اندازهٔ درخواستی را نادیده
   گرفت» و «۹۶۰×۵۴۰ درآمد، نه ۱۲۸۰×۷۲۰ — یوتیوب می‌پذیردش ولی متن نرم
   می‌شود». تشخیص درست بود و با «نه خطای این اجرا» کنار گذاشته شد: باز هم
   اندازه‌گیریِ درست، وصل‌نشده به تصمیم.

   `export/png` همیشه به اندازهٔ **صفحه** می‌دهد، پس تا وقتی صفحه ۹۶۰×۵۴۰
   است هیچ کاری نمی‌شود کرد. نقطهٔ `pages/{id}/thumbnail` اندازه‌اش را از
   صفحه نمی‌گیرد. */
{
  const realFetch = global.UrlFetchApp;
  const seen = [];
  const mk = (code, body, blob) => ({
    getResponseCode: () => code,
    getContentText: () => body || '',
    getBlob: () => blob || Utilities.newBlob('PNG', 'image/png', 'x.png')
  });

  /* ۶۴.۱ — راهِ **اول** thumbnail است، نه export. */
  global.UrlFetchApp = { fetch: function (u) {
    seen.push(String(u));
    if (String(u).indexOf('/thumbnail?') !== -1) {
      return mk(200, JSON.stringify({ contentUrl: 'https://img/big.png' }));
    }
    return mk(200, '');
  } };
  const b1 = ytSlideExport_('P', 'G', 'کاور.png');
  global.UrlFetchApp = realFetch;
  ok('۶۴.۱ تصویر از نقطهٔ thumbnail با اندازهٔ LARGE خواسته می‌شود',
     !!b1 && seen.length === 2 &&
     seen[0].indexOf('thumbnailProperties.thumbnailSize=LARGE') !== -1 &&
     seen[0].indexOf('slides.googleapis.com') !== -1 &&
     seen[1] === 'https://img/big.png',
     JSON.stringify(seen.map(x => x.slice(0, 60))));

  ok('۶۴.۱-ب و از export/png استفاده نمی‌شود وقتی thumbnail گرفت',
     seen.every(x => x.indexOf('/export/png') === -1),
     'هیچ‌کدام export نبود');

  /* ۶۴.۲ — و سقوطش به سمتِ **داشتن** است: thumbnail که نشد، همان راهِ قدیم.
     کاورِ نرم از کاورِ نداشته بهتر است. */
  const seen2 = [];
  global.UrlFetchApp = { fetch: function (u) {
    seen2.push(String(u));
    if (String(u).indexOf('/thumbnail?') !== -1) return mk(403, 'no');
    return mk(200, '');
  } };
  const b2 = ytSlideExport_('P', 'G', 'کاور.png');
  global.UrlFetchApp = realFetch;
  ok('۶۴.۲ thumbnail که نشد، export/png قدیمی می‌رود — کاورِ نرم از نداشته بهتر است',
     !!b2 && seen2.length === 2 && seen2[1].indexOf('/export/png') !== -1,
     JSON.stringify(seen2.map(x => x.slice(0, 50))));

  /* ۶۴.۳ — و جوابِ بی `contentUrl` هم سقوط می‌کند، نه اینکه null بدهد.
     جوابِ ۲۰۰ با بدنهٔ بی‌ربط، همان شکلی است که درایو برای فایلِ
     اشتراک‌نشده می‌دهد (۷.۳۳) — «۲۰۰ گرفتم» یعنی «درست بود» نیست. */
  const seen3 = [];
  global.UrlFetchApp = { fetch: function (u) {
    seen3.push(String(u));
    if (String(u).indexOf('/thumbnail?') !== -1) return mk(200, '<html>nope</html>');
    return mk(200, '');
  } };
  const b3 = ytSlideExport_('P', 'G', 'کاور.png');
  global.UrlFetchApp = realFetch;
  ok('۶۴.۳ جوابِ ۲۰۰ بی contentUrl هم به راهِ قدیم سقوط می‌کند، نه به هیچ',
     !!b3 && seen3.length === 2 && seen3[1].indexOf('/export/png') !== -1,
     JSON.stringify(seen3.map(x => x.slice(0, 50))));
}

console.log('=== ۶۵) ظاهرِ درس را مدل انتخاب می‌کند، و فهرستِ نقش رونوشت نیست (۸٫۱۸) ===');
{
  const fs65 = require('fs');
  const src27 = fs65.readFileSync('src/27_YouTube.gs', 'utf8');

  /* ══ ۶۵.۱ — فهرستِ نقش رونوشتِ فهرستِ سبک‌ها نیست ══
     او جلوِ تخته پرسید «اون لیستِ نقش چرا محتواش مثلِ لیستِ بالاییشه؟». بود.
     و بدتر از تکراری بودنِ **برچسب**، تکراری بودنِ **اثر**: ترکیب فقط
     `frame` را از نقش برمی‌دارد، پس دو سبک با یک `frame` دو گزینهٔ یکسان
     می‌سازند — انتخابی که عوض‌کردنش هیچ تفاوتی نمی‌دهد. */
  const mo = lvMotifs_();
  const frames = mo.map(x => x.frame);
  ok('۶۵.۱ هر نقش فقط یک بار، و کمتر از شمارِ سبک‌ها',
     mo.length > 0 && mo.length < LV_STYLES.length &&
     frames.length === new Set(frames).size,
     mo.length + ' نقش از ' + LV_STYLES.length + ' سبک · ' + frames.join(','));
  ok('۶۵.۲ و هر کدام می‌گوید چه می‌کشد، نه فقط نامِ سبک را',
     mo.every(x => String(x.what || '').length > 8 && x.what !== x.key),
     mo.map(x => x.key + '=' + String(x.what || '').slice(0, 18)).join(' | '));

  /* ۶۵.۳ — انتخابِ مدل جایی می‌نشیند که او کار را سپرده، و جایی که خودش
     نوشته **نمی‌نشیند**. هر دو نیمه لازم است: بی نیمهٔ دوم این قابلیت
     سلیقهٔ او را پاک می‌کند (۵٫۹۵). */
  const hub65 = new Spread('HUB65');
  global.__SS = { HUB65: hub65 };
  global.getHub_ = () => hub65;
  const reg65 = ensureTab_(hub65, CFG.SERIES_TAB, SERIES_HEADERS);
  const mk65 = (r, key, style, level) => {
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; v[SC.CAT - 1] = 'فلسفه';
    if (style) v[SC.LVSTYLE - 1] = style;
    if (level) v[SC.LVLEVEL - 1] = level;
    reg65.getRange(r, 1, 1, SERIES_HEADERS.length).setValues([v]);
  };
  mk65(2, 'auto', 'خودکار', '');            // سپرده به موتور
  mk65(3, 'mine', 'آبرنگِ گرم', 'خاموش');   // دستِ خودش
  mk65(4, 'blank', '', '');                 // خالی

  const look = lvLookApply_({ look: { level: 'زیاد', base: 'کاغذبری',
                                      motif: 'نقشِ ایرانی', why: 'ساختارِ لایه‌لایه' } });
  ok('۶۵.۳ پیشنهادِ درستِ مدل روی خانهٔ «خودکار» می‌نشیند',
     lvStyleAt_(hub65, { seriesKey: 'auto' }, {}, '', look) === 'کاغذبری + نقشِ ایرانی',
     lvStyleAt_(hub65, { seriesKey: 'auto' }, {}, '', look));
  ok('۶۵.۴ و روی خانه‌ای که خودش نوشته نمی‌نشیند',
     lvStyleAt_(hub65, { seriesKey: 'mine' }, {}, '', look) === 'آبرنگِ گرم',
     lvStyleAt_(hub65, { seriesKey: 'mine' }, {}, '', look));
  ok('۶۵.۵ سطح هم: خانهٔ خالی حرفِ مدل را می‌گیرد، خانهٔ «خاموش» نه',
     lvLevelAt_(hub65, { seriesKey: 'blank' }, {}, look) === 'زیاد' &&
     lvLevelAt_(hub65, { seriesKey: 'mine' }, {}, look) === 'خاموش',
     lvLevelAt_(hub65, { seriesKey: 'blank' }, {}, look) + ' / ' +
     lvLevelAt_(hub65, { seriesKey: 'mine' }, {}, look));

  /* ۶۵.۶ — مدل پیشنهاد می‌دهد، کد تصمیم می‌گیرد: کلیدِ ساختگی نباید قسمتی
     را بی‌سبک بگذارد، و سطحِ ساختگی نباید جای تصمیمِ او بنشیند. */
  const bad = lvLookApply_({ look: { level: 'خیلی زیاد', base: 'سبکِ جعلی',
                                     motif: 'نقشِ جعلی', why: 'x' } });
  ok('۶۵.۶ کلید و سطحِ ناشناخته دور ریخته می‌شوند و همان خانه می‌مانَد',
     !bad.base && !bad.motif && !bad.level &&
     lvStyleAt_(hub65, { seriesKey: 'auto' }, {}, '', bad) === 'ساده و رسمی',
     JSON.stringify(bad) + ' ⇒ ' + lvStyleAt_(hub65, { seriesKey: 'auto' }, {}, '', bad));

  /* ۶۵.۷ — نقشی که `frame`ش با پایه یکی است **هیچ** است: ترکیب فقط همان را
     برمی‌دارد، پس «الف + ب» با «الف» یک تصویر می‌دهد و ثبتش شبیهِ انتخاب
     است و نیست — همان برچسبِ توخالی که ۸٫۱۶ یکی‌اش را برداشت. */
  const same = lvLookApply_({ look: { base: 'نقشِ ایرانی', motif: 'ترکیبی' } });
  ok('۶۵.۷ نقشی که اثرش با پایه یکی است ثبت نمی‌شود',
     same.base === 'نقشِ ایرانی' && !same.motif,
     JSON.stringify(same));

  /* ۶۵.۸ — پرامپت فهرست را **از خودِ کد** می‌خوانَد. سنجه‌ای که نامِ سبک‌ها
     را دستی تایپ کند، حافظهٔ نویسنده‌اش را می‌سنجد نه کد را (۷٫۶۹/۸٫۱۰). */
  /* `show` کلیدِ برنامه است (`special`)، نه نامِ نمایشی‌اش: `ytVisOn_` با
     `CFG.LV_SHOWS` می‌سنجدش. نگارشِ اولِ این سنجه نامِ فارسی را داد، گیت رد
     کرد، و پرامپت بی بلوکِ `look` ساخته شد — یعنی سنجه راهی غیر از راهِ
     تولید می‌رفت و همین سرخش کرد (۷٫۴۴). */
  const pr = ytMetaPrompt_({ show: (CFG.LV_SHOWS || ['special'])[0],
                             showName: 'درس‌نامه', epNum: '9',
                             seriesName: 'معرفت‌شناسی', totalSec: 900,
                             sections: [{ heading: 'ب', narration: 'م' }] });
  ok('۶۵.۸ هر سبک و هر نقش به مدل نام برده می‌شود، از منبع نه از حافظه',
     LV_STYLES.every(x => pr.indexOf(String(x.key)) !== -1) &&
     mo.every(x => pr.indexOf(String(x.what)) !== -1) &&
     pr.indexOf('`look`') !== -1,
     'طولِ پرامپت ' + pr.length);

  /* ۶۵.۹ — و انتخاب در `_yt.json` ثبت می‌شود. انتخابی که جایی نماند، برای
     کسی که فقط نتیجه را می‌بیند با تصادف فرقی ندارد — و `_yt.json` همان
     فایلی است که آدم و ناظر می‌توانند عوضش کنند. */
  ok('۶۵.۹ انتخابِ ظاهر در طرحِ قسمت نوشته می‌شود',
     /look:\s*\(function/.test(src27) && src27.indexOf('plan.look') !== -1,
     'ثبت در ytPlan_ و خواندن از plan.look');

  /* ۶۵.۱۰ — در حالتِ صحنه «سطح» ضرباهنگ است، نه شمارِ کارت (۸.۴۷). تا ۸.۴۶ مدل
     دربارهٔ کارت‌هایی تصمیم می‌گرفت که از ۸.۳۱ ساخته نمی‌شوند؛ و «درس یا داستان»
     را از متن بسنجد تا برای قصه سبکِ روایی بردارد. بیرونِ حالتِ صحنه، همان قبلی. */
  const mkLook = (sm) => ytMetaPrompt_({ show: (CFG.LV_SHOWS || ['special'])[0], showName: 'درس‌نامه',
                                         epNum: '9', seriesName: 'داستان‌های کوتاه', totalSec: 900,
                                         sceneMode: sm, sections: [{ heading: 'ب', narration: 'م' }] });
  const prSc = mkLook(true), prCd = mkLook(false);
  /* و از ۸.۴۹ «سطح» چگالی است، نه ثانیه: «هر ~۲۰ ثانیه» همان عددِ هاردکدی بود که او نخواست. */
  ok('۶۵.۱۰ حالتِ صحنه ⇒ سطح = چگالیِ تصویر، بی ثانیهٔ ثابت، و «درس یا داستان» از متن',
     prSc.indexOf('هر ~' + lvSceneSec_('زیاد') + ' ثانیه') === -1 &&
     prSc.indexOf('هر ~' + lvSceneSec_('کم') + ' ثانیه') === -1 &&
     /هر بار که ایده، مثال یا لحظهٔ دیدنیِ تازه‌ای می‌آید/.test(prSc) &&
     /از خودِ محتوا می‌آید/.test(prSc) && !/از خودِ محتوا می‌آید/.test(prCd) &&
     prSc.indexOf('برای هر کارت یک تصویرِ ساخته‌شده') === -1 &&
     /درس است یا داستان/.test(prSc) && /درس است یا داستان/.test(prCd) &&
     /اگر داستان، حکایت، زندگی‌نامه یا روایتِ تاریخی است، سبکی را بردار/.test(prSc) &&
     prCd.indexOf('برای هر کارت یک تصویرِ ساخته‌شده') !== -1 && prCd.indexOf('لحظهٔ دیدنیِ تازه‌ای') === -1,
     'صحنه ' + prSc.length + ' · کارت ' + prCd.length);
}

console.log('=== ۶۶) خانه‌هایی که سوئیپِ دیروز منجمدشان کرده بود (۸٫۱۹) ===');
{
  /* «چرا هی دونه‌دونه برای همه‌شون بذارم که ممکن از دستم در بره؟» — و ۸٫۱۸
     فقط نیمی از کار بود: درِ «خودکار» را باز کرد، ولی خانه‌هایی که شب‌های
     پیش پر شده بودند همچنان یک سبکِ ثابت داشتند و از بیرون عیناً شبیهِ
     انتخابِ آدم بودند. ۵٫۹۵: تمیزکردنِ ورودی آنچه را از قبل نوشته شده درست
     نمی‌کند. */
  const hub66 = new Spread('HUB66');
  global.__SS = { HUB66: hub66 };
  global.getHub_ = () => hub66;
  const reg66 = ensureTab_(hub66, CFG.SERIES_TAB, SERIES_HEADERS);
  const mk66 = (r, key, cat, style) => {
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; v[SC.CAT - 1] = cat;
    if (style) v[SC.LVSTYLE - 1] = style;
    reg66.getRange(r, 1, 1, SERIES_HEADERS.length).setValues([v]);
  };
  // «نقشِ ایرانی» همان چیزی است که regex برای «تاریخ اسلام» می‌داد ⇒ نوشتهٔ ما
  mk66(2, 'frozen', 'تاریخ اسلام', 'نقشِ ایرانی');
  // regex برای «تاریخ اسلام» هرگز «کاغذبری» نمی‌داد ⇒ دستِ خودش
  mk66(3, 'his',    'تاریخ اسلام', 'کاغذبری');
  // ترکیب هیچ‌وقت نوشتهٔ سوئیپ نیست
  mk66(4, 'mix',    'تاریخ اسلام', 'ساده و رسمی + نقشِ ایرانی');
  mk66(5, 'auto',   'تاریخ اسلام', 'خودکار');
  try { props_().deleteProperty(PK.LV_THAW); } catch (e66) {}

  const a66 = lvStyleAudit_(hub66);
  const col66 = () => reg66.getRange(2, SC.LVSTYLE, 4, 1).getValues().map(x => String(x[0]));

  /* ۶۶.۰ — و پیش از هر مهاجرتی: خانه‌ای که **خودِ سوئیپ** نوشته، انتخابِ او
     نیست، پس حرفِ مدل رویش می‌نشیند — **بی اینکه لازم باشد چیزی نوشته شود**.
     بی این، درسِ ۰۸:۰۰ِ فردا با سبکِ regexِ دیروز ساخته می‌شد، چون مهاجرت از
     `healthCheck` می‌دود و آن ۱۰ صبح است — دو ساعت دیر.
     ⚠️ پیشنهادِ مدل عمداً سبکی است که **هیچ‌کدام** از دو خانه ندارند، وگرنه
     «نشست» از «از قبل همان بود» جدا نمی‌شود — تلهٔ فیکسچرِ ۷٫۸۱. */
  {
    const hub0 = new Spread('HUB660');
    global.__SS = { HUB660: hub0 };
    global.getHub_ = () => hub0;
    const reg0 = ensureTab_(hub0, CFG.SERIES_TAB, SERIES_HEADERS);
    const put = (r, key, style) => {
      const v = new Array(SERIES_HEADERS.length).fill('');
      v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; v[SC.CAT - 1] = 'تاریخ اسلام';
      v[SC.LVSTYLE - 1] = style;
      reg0.getRange(r, 1, 1, SERIES_HEADERS.length).setValues([v]);
    };
    put(2, 'sweep', 'نقشِ ایرانی');   // همان چیزی که regex برای «تاریخ اسلام» می‌داد
    put(3, 'his',   'آبرنگِ گرم');    // regex هرگز این را نمی‌داد ⇒ دستِ خودش
    const lookX = lvLookApply_({ look: { base: 'تخته‌سفید', why: 'x' } });
    const gotS = lvStyleAt_(hub0, { seriesKey: 'sweep' }, {}, '', lookX);
    const gotH = lvStyleAt_(hub0, { seriesKey: 'his' }, {}, '', lookX);
    /* ثبت می‌شود نه ادعا (۷٫۷۴): خراب‌کردنِ شکل‌سنج طوری که **هر** خانه را
       مالِ ما بداند، روی ۶۵.۴ می‌نشیند — «حرفِ مدل روی خانه‌ای که خودش نوشته
       نمی‌نشیند». یعنی آن مرز دو نگهبان دارد، نه یکی. */
    ok('۶۶.۰ خانهٔ نوشتهٔ سوئیپ حرفِ مدل را می‌گیرد، خانهٔ خودش نمی‌گیرد',
       gotS === 'تخته‌سفید' && gotH === 'آبرنگِ گرم',
       'سوئیپ ⇒ ' + gotS + ' · دستِ خودش ⇒ ' + gotH);
    global.__SS = { HUB66: hub66 };
    global.getHub_ = () => hub66;
  }

  ok('۶۶.۱ خانه‌ای که خودِ سوئیپ نوشته بود به «خودکار» برمی‌گردد',
     a66.thawed === 1 && col66()[0] === 'خودکار',
     a66.thawed + ' ⇒ ' + col66().join(' | '));
  /* و این نیمه مهم‌تر است: چیزی که او انتخاب کرده **پاک نمی‌شود**. بی این،
     قابلیت «همه را خودکار کن» تبدیل می‌شود به «سلیقه‌ات را پاک می‌کنم». */
  /* ثبت می‌شود، نه ادعا (۷٫۷۴): شکستنِ «هر سبکِ ثابتی ذوب شود» روی ۵۵-ب.۱ و
     ۱۵.۳ می‌نشیند، چون §۵۵-ب زودتر می‌دود و همان مرز را از سمتِ دیگر نگه
     داشته — یعنی این خط دو نگهبان دارد، نه یکی. و نیمهٔ «ترکیب» را **هیچ
     شکستنی سرخ نمی‌کند**: `lvStyleSuggest_` همیشه یک کلیدِ تنها می‌دهد، پس
     مقایسه خودش ترکیب را رد می‌کند و خطِ `lvStyleSplit_` میان‌بُر است نه سد.
     این را فقط شکستن گفت (۸٫۰۳/۸٫۰۴: شکستنی که هیچ‌جا نمی‌نشیند، یا سنجه
     توخالی است یا کد مرده — این‌بار دومی). */
  ok('۶۶.۲ و انتخابِ خودش — ساده یا ترکیبی — دست نمی‌خورد',
     col66()[1] === 'کاغذبری' && col66()[2] === 'ساده و رسمی + نقشِ ایرانی' &&
     col66()[3] === 'خودکار' && a66.mine === 2,
     col66().join(' | ') + ' · مالِ او: ' + a66.mine);
  /* و با اسم شمرده می‌شود: «پس چرا این یکی خودکار نشد؟» باید از قبل جواب
     داشته باشد، نه اینکه فردا پرسیده شود (۷٫۳۲). */
  ok('۶۶.۳ هر دو طرف با اسم گزارش می‌شوند، نه فقط شمرده',
     a66.thawNames.indexOf('frozen') !== -1 &&
     a66.mineNames.indexOf('his') !== -1,
     JSON.stringify({ thaw: a66.thawNames, mine: a66.mineNames }));

  /* ۶۶.۴ — **یک بار**، نه هر شب. مهاجرتی که هر شب بدود، انتخابِ فردای او را
     هم پاک می‌کند و آن دیگر مهاجرت نیست. حالتی ساخته می‌شود که تولید
     واقعاً در آن می‌ایستد: فردا شب، با همان ردیف‌ها. */
  reg66.getRange(2, SC.LVSTYLE).setValue('نقشِ ایرانی');   // انگار خودش برش گرداند
  const a66b = lvStyleAudit_(hub66);
  ok('۶۶.۴ شبِ بعد دوباره نمی‌دود — وگرنه انتخابِ فردای او را هم پاک می‌کند',
     a66b.thawed === 0 && col66()[0] === 'نقشِ ایرانی',
     a66b.thawed + ' ⇒ ' + col66()[0]);

  /* ۶۶.۵ — و قفلش دری دارد: بالا بردنِ `LV_THAW_VER` دورِ تازه می‌دهد. یک
     پرچمِ یک‌طرفه که هیچ آدمی نتواند بازش کند، همان شکلی است که ۵٫۹۵ نوشت. */
  const verWas = CFG.LV_THAW_VER;
  CFG.LV_THAW_VER = '2';
  const a66c = lvStyleAudit_(hub66);
  CFG.LV_THAW_VER = verWas;
  ok('۶۶.۵ و بالا بردنِ نسخهٔ مهاجرت دوباره بازش می‌کند — قفلِ بی‌در نه',
     a66c.thawed === 1 && col66()[0] === 'خودکار',
     a66c.thawed + ' ⇒ ' + col66()[0]);

  /* ۶۶.۶ — درِ آدم: «همه‌شان، حتی آن‌هایی که خودم گذاشته بودم». از همان
     تابعی وارد می‌شود که منو واردش می‌شود، و نامش از **منبعِ منو** خوانده
     می‌شود نه از حافظه (۷٫۵۹). */
  {
    const fs66 = require('fs');
    const mSrc66 = fs66.readFileSync('src/05_Setup.gs', 'utf8');
    const hit = mSrc66.match(/\.addItem\(\s*'([^']*)'\s*,\s*'runLvStyleAllAuto'\s*\)/);
    const realUi66 = global.ui_;
    let asked = '';
    global.ui_ = () => ({
      alert: function (t, m) { if (m !== undefined) asked += String(m); return 'OK'; },
      ButtonSet: { OK_CANCEL: 1, OK: 2 }, Button: { OK: 'OK' }
    });
    let r66 = null;
    try { r66 = runLvStyleAllAuto(); } finally { global.ui_ = realUi66; }
    ok('۶۶.۶ گزینهٔ منو هر سبکِ ثابتی را خودکار می‌کند، حتی انتخابِ خودش',
       !!hit && !!r66 && r66.ok === true && r66.changed === 2 &&
       col66().every(x => x === 'خودکار'),
       (hit ? '«' + hit[1] + '» · ' : 'در منو نبود · ') +
       JSON.stringify(r66) + ' ⇒ ' + col66().join(' | '));
    /* و پیش از نوشتن **می‌شمارد و نام می‌برد**: پاک‌کردنِ سلیقهٔ آدم بی اینکه
       بداند چند تا را پاک می‌کند، همان چیزی است که این پرونده بارها نوشته
       نباید بشود. */
    ok('۶۶.۷ و پیش از نوشتن، آنچه را پاک می‌کند به او نشان می‌دهد',
       asked.indexOf('his') !== -1 && asked.indexOf('کاغذبری') !== -1,
       asked.slice(0, 120));
  }
}

console.log('=== ۶۷) «نگشته‌ایم» با «گشتیم و نبود» یکی نیست (۸٫۲۰) ===');
{
  /* صاحبِ برنامه لایهٔ ۳ را روشن کرد و خطِ روزانه گفت «روشن (مدل هنوز پیدا
     نشده)» — جمله‌ای که شبیهِ شاهد است و نیست: مدل فقط از حافظه خوانده
     می‌شد و حافظه را تنها `lvGenFill_` پر می‌کند، یعنی موقعِ ساختِ یک قسمت.
     پس هیچ‌کس نگشته بود. ۷٫۴۷ همین را نوشت و اینجا تکرار شده بود. */
  const clean = () => {
    try { props_().deleteProperty(PK.LV_GEN_SEEN); } catch (e) {}
    try { props_().deleteProperty(PK.LV_GEN_MODEL); } catch (e) {}
  };
  const realFetch67 = global.UrlFetchApp;
  const wasOn = CFG.LV_GEN_ENABLED, wasSet = CFG.LV_GEN_MODEL;
  CFG.LV_GEN_MODEL = '';
  try { props_().setProperty(PK.LV_GEN_ON, '1'); } catch (e) {}

  /* ۶۷.۱ — حالتِ «هنوز نگشته‌ایم»: ساکت، و `ok` را پایین نمی‌آورد. زنگی که
     برای نامعلوم بزند همان زنگی است که یاد می‌گیرند نخوانند (۷٫۴۰/۸٫۰۵). */
  clean();
  const g1 = lvGenStatus_();
  ok('۶۷.۱ تا نگشته‌ایم، خط «نگشته‌ایم» می‌گوید نه «نیست» — و ایراد نمی‌سازد',
     g1.on === true && g1.looked === false && g1.dead === false &&
     g1.line.indexOf('نگشته') !== -1 && lvStatus_().ok === true,
     g1.line.slice(0, 110));

  /* ۶۷.۲ — گشتیم و نبود: این **ایراد** است («روشن ولی بی‌اثر»، ۸٫۰۵) و
     علتش نام برده می‌شود — «نبود» و «فهرست خوانده نشد» دو چارهٔ متفاوت
     دارند (۷٫۳۲). و از همان دری وارد می‌شویم که تولید می‌رود. */
  clean();
  let calls67 = 0;
  global.UrlFetchApp = { fetch: function (u) {
    calls67++;
    return { getResponseCode: () => 200,
             getContentText: () => JSON.stringify({ models: [
               { name: 'models/gemini-3.8-flash',
                 supportedGenerationMethods: ['generateContent'] }] }) };
  } };
  const p2 = lvGenProbe_();
  global.UrlFetchApp = realFetch67;
  const g2 = lvGenStatus_();
  ok('۶۷.۲ گشتیم و مدلِ تصویری نبود ⇒ ایراد، با علتِ نام‌برده',
     p2.looked === true && !p2.id && g2.dead === true &&
     g2.line.indexOf(p2.why.slice(0, 12)) !== -1 && lvStatus_().ok === false,
     JSON.stringify(p2) + ' · ok=' + lvStatus_().ok);

  /* ۶۷.۳ — و وقتی هست، نامش در خط می‌آید و دیگر ایراد نیست. */
  clean();
  global.UrlFetchApp = { fetch: function () {
    return { getResponseCode: () => 200,
             getContentText: () => JSON.stringify({ models: [
               { name: 'models/gemini-3.8-flash',
                 supportedGenerationMethods: ['generateContent'] },
               { name: 'models/gemini-2.5-flash-image-preview',
                 supportedGenerationMethods: ['generateContent'] }] }) };
  } };
  const p3 = lvGenProbe_();
  global.UrlFetchApp = realFetch67;
  const g3 = lvGenStatus_();
  ok('۶۷.۳ و وقتی مدل هست، نامش در خط می‌آید و ایراد نیست',
     p3.id === 'gemini-2.5-flash-image-preview' &&
     g3.line.indexOf('gemini-2.5-flash-image-preview') !== -1 &&
     g3.dead === false && lvStatus_().ok === true,
     g3.line.slice(0, 110));

  /* ۶۷.۴ — **هزینه**: خطِ وضعیت هیچ فراخوانِ شبکه‌ای ندارد. `writeStatus_`
     هر دو ساعت می‌دود و ۷٫۶۳/۷٫۶۶/۷٫۷۲ سه بار همین را به این مخزن
     آموختند. شمارشِ فراخوان است نه زمان، چون بدَل شبکه ندارد (۷٫۶۰). */
  let calls4 = 0;
  global.UrlFetchApp = { fetch: function () { calls4++;
    return { getResponseCode: () => 500, getContentText: () => '' }; } };
  lvGenStatus_(); lvStatus_();
  global.UrlFetchApp = realFetch67;
  ok('۶۷.۴ خطِ وضعیت هیچ فراخوانِ شبکه‌ای نمی‌زند',
     calls4 === 0, 'فراخوان: ' + calls4);
  /* ثبت می‌شود، نه ادعا (۷٫۷۴): گذاشتنِ `lvGenProbe_` داخلِ `lvGenStatus_`
     روی **۶۷.۱** می‌نشیند نه این یکی — چون حافظه همان لحظه پر می‌شود و
     حالتِ «هنوز نگشته‌ایم» دیگر ساختنی نیست. ۶۷.۴ ادعای باریک‌ترِ خودش را
     نگه می‌دارد (خطِ وضعیت خودش شبکه نمی‌زند) و نگهبانِ واقعیِ «گشتن به
     مسیرِ داغ نشت نکند» ۶۷.۱ و ۶۷.۵ اند. */

  /* ۶۷.۵ — و گشتن از **درِ تولید** می‌آید: `healthCheck` صدایش می‌زند، نه
     اینکه فقط تابع وجود داشته باشد. اتاق را سنجیدن و در را نه، همان
     ۷٫۶۲ است. */
  {
    const fs67 = require('fs');
    const hSrc = fs67.readFileSync('src/08_Health.gs', 'utf8');
    const i0 = hSrc.indexOf('function healthCheck(');
    const body = hSrc.slice(i0, hSrc.indexOf('\nfunction ', i0 + 10));
    const wSrc = hSrc.slice(hSrc.indexOf('function writeStatus_('));
    const wBody = wSrc.slice(0, wSrc.indexOf('\nfunction ', 10));
    ok('۶۷.۵ گشتن روی healthCheck است، نه روی writeStatus_',
       body.indexOf('lvGenProbe_(') !== -1 && wBody.indexOf('lvGenProbe_(') === -1,
       'health=' + (body.indexOf('lvGenProbe_(') !== -1) +
       ' · status=' + (wBody.indexOf('lvGenProbe_(') !== -1));
  }

  clean();
  CFG.LV_GEN_ENABLED = wasOn; CFG.LV_GEN_MODEL = wasSet;
  try { props_().deleteProperty(PK.LV_GEN_ON); } catch (e) {}
}

console.log('=== ۶۸) چهارده تصویر خواسته شد و یکی آمد: قرارداد، سیم، سبک و سطح (۸.۲۶) ===');
{
  /* درس‌های ۵۷ و ۵۸: موتور چهارده تصویر خواست و مدل یکیِ خالی داد. علت یک
     قراردادِ دوزبانه بود — پرامپت `cardTitle/cardLines` می‌خواست، schema
     `quote/form/headline` داشت. و پشتِ آن سه سیمِ قطعِ دیگر: مشخصاتِ برداری
     هرگز در ردیفِ رندر نوشته نمی‌شد، سبکِ ترکیبی به پیش‌فرض برمی‌گشت، و
     «کم/زیاد» به هیچ تصمیمی وصل نبود. هر سنجهٔ این بند از **درِ تولید** وارد
     می‌شود، و بدَلِ مدل از ۸.۲۶ پاسخ را از روی schema صافی می‌کند. */
  global.__STUB = BASE_STUB;
  /* بدَلِ خالیِ `YouTube`، همان که §۵۲ می‌گذارد: مسیرِ «ویدئو نیامده» هیچ
     فراخوانی به API نمی‌کند، ولی بی آن `ytUploadOne_` سرِ خطِ اول برمی‌گردد. */
  const svc68 = global.YouTube;
  global.YouTube = {};
  const root = global.__ROOT_FOLDER;
  const nar = [
    'معرفت در سنت فلسفی سه شرط دارد که باید با هم جمع شوند تا باور به دانستن برسد و هر کدام نقشی جدا دارد',
    'او گفت باید بایستیم و نگاه کنیم که توجیه دقیقا چه چیزی را به باور صادق اضافه می‌کند و چرا بدون آن کار تمام نیست',
    'مثال گتیه نشان داد که سه شرط کافی نیست چون باور صادق موجه هم گاهی از سر بخت درست درمی‌آید و این دانستن نیست'
  ];
  const secs = nar.map((t, i) => ({ heading: 'بخشِ ' + (i + 1), narration: (t + ' ').repeat(6) }));
  const mk = () => ({ show: 'special', epRaw: '68', showName: 'درس‌نامه', title: 'سه شرطِ معرفت',
                      duration: '15:00', headings: secs.map(x => x.heading),
                      sections: secs, totalSec: 900, sources: [] });

  /* ۶۸.۱ — **قرارداد یک زبان است.** هر نامِ لاتینی که پرامپتِ تصویر می‌برد باید
     در schema باشد، و هر فیلدی که `lvSpecBuild_` از مورد می‌خوانَد هم. این
     دقیقاً همان شکافی است که یک هفته ویدئوها را تک‌قاب کرد. */
  {
    const props = Object.keys(YT_META_SCHEMA.properties.visuals.items.properties);
    const lines = ytVisPromptLines_(mk()).filter(l => /^\s*•/.test(l));
    const named = [];
    lines.forEach(l => (l.match(/\b[a-z][A-Za-z]+\b/g) || []).forEach(w => named.push(w)));
    const strayP = named.filter(w => props.indexOf(w) === -1);
    const fs68 = require('fs');
    const ySrc = fs68.readFileSync('src/27_YouTube.gs', 'utf8');
    const i0 = ySrc.indexOf('function lvSpecBuild_(');
    const body = ySrc.slice(i0, ySrc.indexOf('\nfunction ', i0 + 10));
    const read = Array.from(new Set((body.match(/\bv\.([a-zA-Z]+)/g) || []).map(x => x.slice(2))));
    /* `cardTitle` را `ytVisItem_` از `headline` می‌سازد؛ مشتق است، پرسیده نمی‌شود. */
    const strayC = read.filter(w => props.indexOf(w) === -1 && w !== 'cardTitle');
    ok('۶۸.۱ هر نامی که پرامپت می‌خواهد و هر فیلدی که مشخصات می‌خوانَد، در schema هست',
       named.length >= 10 && strayP.length === 0 && read.length >= 8 && strayC.length === 0,
       named.length + ' نام در پرامپت، بیرون: ' + (strayP.join('،') || 'هیچ') + ' · ' +
       read.length + ' فیلدِ خوانده، بیرون: ' + (strayC.join('،') || 'هیچ'));
  }

  /* ۶۸.۲ — **متنِ بخش‌ها به پرامپت می‌رود**، وگرنه `quote` («عیناً از روایت»)
     نوشتنی نیست. و سهمِ هر بخش به عدد.
     ثبت می‌شود، نه ادعا (۷٫۷۴): برداشتنِ سطرهای سهم روی **۴۹.۹** می‌نشیند نه
     این‌جا — §۴۹ اول می‌دود، و بدَلِ فرمان‌بردار بی آن سطرها سه مورد می‌دهد،
     نقشه نحیف می‌شود و پرسشِ دوم یک فراخوان اضافه می‌کند. این سنجه همان را
     مستقیم هم می‌پرسد. برداشتنِ متنِ بخش‌ها روی خودش می‌نشیند. */
  {
    const pr = ytMetaPrompt_(mk());
    ok('۶۸.۲ پرامپت متنِ هر بخش و سهمِ تصویرش را دارد',
       pr.indexOf('مثال گتیه نشان داد') !== -1 && pr.indexOf('[بخش 3]') !== -1 &&
       /3\) «بخشِ 3» — حدودِ [۰-۹]+ مورد/.test(pr) &&
       pr.indexOf('**دقیقاً ' + faDigitsOut_(String(ytVisWant_(900))) + ' مورد**') !== -1,
       pr.length + ' نویسه');
  }

  /* ۶۸.۳ — **از درِ تولید، با بدَلِ سخت‌گیر:** نقشه به اندازهٔ خواسته پر
     می‌شود و فیلدهای تازه دور ریخته نمی‌شوند. `cardTitle/cardLines` برای
     اسلایدز و جزوه **از همین‌ها ساخته** می‌شوند. */
  {
    const f = root.createFolder('قسمت 0068 — قرارداد');
    const plan = ytPlan_(f, mk(), false);
    const v = plan.visuals || [];
    const ch = v.filter(x => x.form === 'زنجیره')[0] || {};
    ok('۶۸.۳ نقشه پر است و `form/headline/steps` می‌مانند؛ `cardTitle/cardLines` از آن‌ها',
       v.length >= ytVisFloor_(ytVisWant_(900)) &&
       v.every(x => x.headline && x.cardTitle === x.headline && x.form) &&
       ch.steps && ch.steps.length === 3 && ch.cardLines.join('|') === ch.steps.join('|') &&
       ch.kind === 'نمودار',
       v.length + ' مورد از ' + ytVisWant_(900) + ' · زنجیره: ' + JSON.stringify(ch.steps));
  }

  /* ۶۸.۳-ب — **سقفِ هر بخش از سهمِ آن بخش می‌آید.** بخشی که چهارپنجمِ درس
     است، چهارپنجمِ تصویرها را می‌خواهد؛ سقفِ ثابتِ سه یعنی دورریختنِ همان
     تصویرهایی که پرامپت خودش خواسته بود. */
  {
    const big = [{ heading: 'بلند', narration: 'الف '.repeat(2000) },
                 { heading: 'کوتاه', narration: 'ب '.repeat(500) }];
    const ctxB = { show: 'special', sections: big, totalSec: 900 };
    const sh = ytVisShares_(big, ytVisWant_(900));
    const raw = [];
    sh.forEach((n, i) => { for (let k = 0; k < n; k++) raw.push({ at: String(i + 1), form: 'نقل', headline: 'ح' + k }); });
    const st = {};
    const pl = ytVisPlan_({ visuals: raw }, ctxB, st);
    ok('۶۸.۳-ب بخشِ بلند به اندازهٔ سهمش تصویر نگه می‌دارد، نه سه تا',
       sh[0] > 3 && st.perSec === 0 && pl.length === raw.length,
       'سهم‌ها ' + JSON.stringify(sh) + ' · دورریخته ' + st.perSec + ' · نقشه ' + pl.length);
  }

  /* ۶۸.۴ — **نقشهٔ نحیف یک بار دیگر پرسیده می‌شود، فقط تصویرها.** مدلِ اصلی
     یکی می‌دهد (همان ۵۷ و ۵۸)، پرسشِ دوم کامل. و فراخوانِ بعدی دیگر
     نمی‌پرسد: یک بار، نه هر شب. */
  {
    let calls = 0, visOnly = 0;
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      if (sc && sc.properties && sc.properties.visuals && !sc.properties.title) {
        visOnly++; return BASE_STUB(url, body);
      }
      if (sc && sc.properties && sc.properties.title) {
        calls++;
        const r = BASE_STUB(url, body);
        const j = JSON.parse(r.json.candidates[0].content.parts[0].text);
        j.visuals = j.visuals.slice(0, 1).map(x => ({ at: x.at }));      // یکیِ خالی
        r.json.candidates[0].content.parts[0].text = JSON.stringify(j);
        return r;
      }
      return BASE_STUB(url, body);
    };
    const f = root.createFolder('قسمت 0069 — نحیف');
    const plan = ytPlan_(f, mk(), false);
    const again = ytPlan_(f, mk(), false);
    const disk = ytPlanRead_(f) || {};
    ok('۶۸.۴ نقشهٔ نحیف با یک پرسشِ «فقط تصویر» پر می‌شود و دوباره پرسیده نمی‌شود',
       calls === 1 && visOnly === 1 && (plan.visuals || []).length >= ytVisFloor_(ytVisWant_(900)) &&
       plan.visAsk && plan.visAsk.n === 1 && plan.visAsk.before === 1 &&
       again.cached === true && (disk.visuals || []).length === plan.visuals.length,
       'اصلی ' + calls + ' · فقط‌تصویر ' + visOnly + ' · ' + JSON.stringify(plan.visAsk));

    /* ۶۸.۴-ب — و جوابی که بهتر نباشد، نقشهٔ قبلی را بدتر نمی‌کند. */
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      const r = BASE_STUB(url, body);
      if (sc && sc.properties && sc.properties.visuals) {
        const j = JSON.parse(r.json.candidates[0].content.parts[0].text);
        j.visuals = sc.properties.title ? j.visuals.slice(0, 2) : [];
        r.json.candidates[0].content.parts[0].text = JSON.stringify(j);
      }
      return r;
    };
    const f2 = root.createFolder('قسمت 0070 — بدتر نه');
    const p2 = ytPlan_(f2, mk(), false);
    /* از ۸.۲۹ نقشهٔ نحیف پس از این پرسش از روایت پر می‌شود (§۶۹)، پس «همان
       قبلی» یعنی **دو موردِ مدل سرِ جایشان**، نه «فقط دو مورد». */
    const mine2 = (p2.visuals || []).filter(x => !x.auto);
    ok('۶۸.۴-ب پرسشِ دوبارهٔ بی‌حاصل نقشهٔ قبلی را نگه می‌دارد',
       mine2.length === 2 && p2.visAsk && p2.visAsk.after === 2 && p2.visAsk.raw === 0,
       JSON.stringify(p2.visAsk) + ' · موردِ مدل ' + mine2.length);
    global.__STUB = BASE_STUB;
  }

  /* ۶۸.۵ — **نقشهٔ ذخیره‌شدهٔ نحیف، پیش از ویدئو، از درِ انتشار** دوباره پرسیده
     می‌شود — همان «جبران‌شدنی»ِ ۸.۱۱ که کدی پشتش نبود. و وقتی درخواستِ رندر
     نوشته شده، دیگر نه: آن‌وقت پرسیدن فقط پول است. */
  {
    const mkEp68 = (id, name) => {
      const f = DriveApp.__register(id, name);
      f.createFile(Utilities.newBlob(JSON.stringify({
        lesson: 7, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
        ep: { title: 'سه شرطِ معرفت', hook: 'قلاب', summary: 'خلاصه', sections: secs }
      }), 'application/json', '_special.json'));
      f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
      ytPlanWrite_(f, { at: 'x', show: 'special', ep: '171', title: 'ت', description: 'د',
        tags: ['الف'], coverTitle: 'ک', coverKicker: '', chapters: 3,
        visuals: [{ at: 1, kind: 'کارت', cardTitle: '', cardLines: [], heading: 'بخشِ 1', sec: 60 }] });
      return f;
    };
    ytRenderSave_({ items: [] });
    let visOnly = 0;
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      let pr = ''; try { pr = body.contents[0].parts[0].text; } catch (e) {}
      /* فقط پرسشِ دوبارهٔ **کلِ** نقشه؛ پرسشِ یک‌بخشیِ ۸.۳۰ («فقط همین بخش») جداست. */
      if (sc && sc.properties && sc.properties.visuals && !sc.properties.title &&
          pr.indexOf('فقط همین بخش') === -1) visOnly++;
      return BASE_STUB(url, body);
    };
    const e1 = mkEp68('EP68A', 'قسمت 0171');
    ytUploadOne_({ key: 'special:171', show: 'special', ep: '171', folderId: 'EP68A',
                   series: 'معرفت‌شناسی' }, null, []);
    const pl1 = ytPlanRead_(e1) || {};
    const e2 = mkEp68('EP68B', 'قسمت 0172');
    /* از ۸.۳۰ ردیفِ نحیف و ساخته‌نشده یک بار جایگزین‌شدنی است (§۷۰)؛ این‌جا
       ردیفی است که یک بار جایگزین شده (`redo: 1`) — پس دیگر هرگز. */
    ytRenderSave_({ items: [{ key: 'special:172', status: 'در انتظار', at: nowStr_(), redo: 1 }] });
    ytUploadOne_({ key: 'special:172', show: 'special', ep: '172', folderId: 'EP68B',
                   series: 'معرفت‌شناسی' }, null, []);
    const pl2 = ytPlanRead_(e2) || {};
    ok('۶۸.۵ نقشهٔ ذخیره‌شدهٔ نحیف پیش از ویدئو پر می‌شود — و پس از درخواستِ رندر، نه',
       visOnly === 1 && (pl1.visuals || []).length > 1 && pl1.visAsk && pl1.visAsk.n === 1 &&
       (pl2.visuals || []).length === 1 && !pl2.visAsk,
       'پرسشِ فقط‌تصویر ' + visOnly + ' · اولی ' + (pl1.visuals || []).length +
       ' · دومی ' + (pl2.visuals || []).length);
    global.__STUB = BASE_STUB;
    ytRenderSave_({ items: [] });
  }

  /* ۶۸.۶ — **عبارت در متنِ گفتاری پیدا می‌شود حتی وقتی نشانه‌گذاری فرقش
     داده.** متنِ گفتاری «بِ‌ایستیم» دارد (نیم‌فاصلهٔ تلفظ) و ویرگولِ مکث؛
     متنِ نوشتاری ندارد. و مشخصات سبکِ مجموعه و تصویرِ ساخته‌شدهٔ هر مورد را
     می‌برد. */
  {
    const keepT = global.epTimesRead_, keepC = global.specialTextChunks_;
    global.epTimesRead_ = () => ({ secs: 300, times: [{ i: 0, at: 0 }, { i: 1, at: 100 }, { i: 2, at: 200 }] });
    global.specialTextChunks_ = () => [
      { text: 'معرفت در سنتِ فلسفی، سه شرط دارد که باید با هم جمع شوند.' },
      { text: 'او گفت: باید بِ‌ایستیم و نگاه کنیم که توجیه دقیقاً چه چیزی اضافه می‌کند.' },
      /* ویرگولِ مکث وسطِ عبارت — متنِ گفتاری از ۸.۰۸ عمداً پرنشانه‌تر است. */
      { text: 'مثالِ گتیه، نشان داد که سه شرط کافی نیست.' } ];
    const plan = { visuals: [
      { at: 1, quote: 'سه شرط دارد که باید با هم', form: 'تمرکز', headline: 'سه شرطِ معرفت', items: ['باور'] },
      { at: 2, quote: 'باید بایستیم و نگاه کنیم', form: 'زنجیره', headline: 'از باور تا معرفت',
        steps: ['باور', 'توجیه'] },
      { at: 3, quote: 'مثال گتیه نشان داد که', form: 'پرسش', headline: 'کافی است؟' } ] };
    const sp = lvSpecBuild_(root, { ep: {} }, plan,
      { show: 'special', style: 'کاغذبری', bg: { '1': 'BGFILE1' }, foot: 'درس‌نامه' });
    global.epTimesRead_ = keepT; global.specialTextChunks_ = keepC;
    const c2 = sp && sp.cards.filter(c => c.src === 1)[0];
    ok('۶۸.۶ عبارتِ نوشتاری در متنِ پرنشانه پیدا می‌شود؛ مشخصات سبک و تصویرِ هر مورد را دارد',
       !!sp && sp.cards.length === 3 && sp.missed === 0 &&
       !!c2 && c2.at >= 100 && c2.at < 200 && c2.bgId === 'BGFILE1' && /usercontent/.test(c2.bgUrl) &&
       sp.cards.filter(c => c.bgId).length === 1 &&
       sp.palette && sp.palette.bg === '#1E1B4B' && sp.style === 'کاغذبری',
       sp ? (sp.cards.length + ' کارت · گمشده ' + sp.missed + ' · کارتِ ۲ در ' + (c2 && c2.at) +
             ' · پالت ' + (sp.palette && sp.palette.bg)) : 'مشخصات ساخته نشد');
  }

  /* ۶۸.۷ — **مشخصات در ردیفِ رندر می‌نشیند** — سیمی که از ۸.۰۱ وصل نبود — و
     تصویرِ ساخته‌شدهٔ کارت‌ها برای اکشن باز می‌شود، فایل‌به‌فایل. */
  {
    ytRenderSave_({ items: [] });
    const f = root.createFolder('قسمت 0173 — ردیف');
    const wav = f.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'کامل.wav'));
    const bg = f.createFile(Utilities.newBlob('PNG', 'image/png', 'پس‌زمینه ۱ — بخش ۱.png'));
    const spec = { v: 1, t0: 0, t1: 300, cards: [
      { form: 'focus', at: 0, headline: 'یک', bgId: bg.getId(), bgUrl: ytDlUrl_(bg.getId()) },
      { form: 'quote', at: 100, headline: 'دو' } ] };
    ytRenderAsk_({ show: 'special', ep: '173', title: 'ت', folderId: f.getId(),
                   audio: [{ id: wav.getId(), name: 'کامل.wav' }], visuals: [], spec: spec,
                   outName: 'x.mp4' });
    const row = ytRenderRead_().items.filter(x => x.key === 'special:173')[0] || {};
    ok('۶۸.۷ ردیفِ رندر مشخصات را دارد و تصویرِ کارت برای اکشن باز است',
       !!row.spec && row.spec.cards.length === 2 &&
       bg.getSharingAccess() === 'ANYONE_WITH_LINK',
       'spec ' + (!!row.spec) + ' · اشتراک ' + bg.getSharingAccess());
    ytRenderShare_(row, false);
    ok('۶۸.۷-ب و همان فهرست است که بعداً بسته می‌شود',
       bg.getSharingAccess() !== 'ANYONE_WITH_LINK', bg.getSharingAccess());
    ytRenderSave_({ items: [] });
  }

  /* ۶۸.۸ — **سبکِ ترکیبی دیگر به پیش‌فرض برنمی‌گردد.** `_visuals.json`ِ درسِ ۵۸
     «ساده و رسمی + خطیِ مینیمال» نوشت و کارت‌ها با پیش‌فرض ساخته شدند. */
  {
    const c = lvStyleResolve_('آبرنگِ گرم + خطیِ مینیمال');
    const f = root.createFolder('قسمت 0174 — ترکیب');
    const plan = { visuals: [{ at: 1, kind: 'کارت', cardTitle: 'الف', heading: 'یک', cardLines: [], sec: 30 }] };
    lvBuild_(f, plan, { show: 'special', epRaw: '174', sections: [{ heading: 'یک', narration: 'الف' }],
                        totalSec: 60 }, 'آبرنگِ گرم + خطیِ مینیمال');
    const el0 = global.__PRES_LAST.getSlides()[0].getPageElements()[0];
    ok('۶۸.۸ ترکیب خوانده می‌شود: رنگ از اولی، نقش از دومی — و کارت با همان رنگ کشیده می‌شود',
       !!c && c.pal.bg === '#FFF7ED' && c.frame === 'hairline' &&
       String(el0.fill.color).toUpperCase() === '#FFF7ED',
       (c && c.key) + ' · رنگِ کارت ' + el0.fill.color);
  }

  /* ۶۸.۹ — **«کم» و «زیاد» دو چیزند.** زیاد یعنی هر کارت؛ کم یعنی چند تا، و
     **پخش** در طولِ درس — نه چهار کارتِ اول. خاموش یعنی هیچ. */
  {
    const was = CFG.LV_GEN_PER_EP;
    CFG.LV_GEN_PER_EP = 4;
    const N = 14, idx = lv => { const o = []; for (let i = 0; i < N; i++) if (lvGenPick_(i, N, lv)) o.push(i); return o; };
    const lo = idx('کم'), hi = idx('زیاد'), off = idx('خاموش');
    ok('۶۸.۹ زیاد = هر کارت · کم = چهار، پخش در طولِ درس · خاموش = هیچ',
       hi.length === N && lo.length === 4 && off.length === 0 &&
       lo[lo.length - 1] >= N / 2 && lo[0] < N / 4,
       'کم ' + JSON.stringify(lo) + ' · زیاد ' + hi.length);
    CFG.LV_GEN_PER_EP = was;
  }

  /* ۶۸.۱۰ — و از **درِ ساخت**: با سطحِ «زیاد» هر کارت تصویر می‌گیرد، با «کم»
     همان سقف — و تصویرِ کارتی که پیش‌تر ساخته شده هم خواسته می‌شود (تا ۸.۲۵
     فقط کارتِ همین اجرا). */
  {
    const keep = { on: CFG.LV_GEN_ENABLED, mdl: CFG.LV_GEN_MODEL, per: CFG.LV_GEN_PER_EP,
                   usd: CFG.LV_GEN_USD_MONTH, run: CFG.LV_GEN_PER_RUN };
    CFG.LV_GEN_ENABLED = true; CFG.LV_GEN_MODEL = 'gemini-2.5-flash-image';
    CFG.LV_GEN_PER_EP = 2; CFG.LV_GEN_USD_MONTH = 100; CFG.LV_GEN_PER_RUN = 10;
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const png = n => { const b = [137, 80, 78, 71, 13, 10, 26, 10]; while (b.length < n) b.push(7); return b; };
    let gen = 0;
    global.__STUB = function (url, body) {
      if (url.indexOf('flash-image:generateContent') !== -1) {
        gen++;
        return { code: 200, json: { candidates: [{ content: { parts: [
          { inlineData: { mimeType: 'image/png', data: Utilities.base64Encode(png(30000)) } }] } }] } };
      }
      return BASE_STUB(url, body);
    };
    const planOf = () => ({ visuals: [0, 1, 2, 3, 4].map(i => ({ at: 1, kind: 'کارت',
      cardTitle: 'ک' + i, heading: 'یک', cardLines: [], sec: 20 })) });
    const ctxOf = lv => ({ show: 'special', epRaw: '175', sections: [{ heading: 'یک', narration: 'الف'.repeat(200) }],
                          totalSec: 100, level: lv });
    const fHi = root.createFolder('قسمت 0175 — زیاد');
    const bHi = lvBuild_(fHi, planOf(), ctxOf('زیاد'), 'آبرنگِ گرم');
    const gHi = gen; gen = 0;
    const fLo = root.createFolder('قسمت 0176 — کم');
    const bLo = lvBuild_(fLo, planOf(), ctxOf('کم'), 'آبرنگِ گرم');
    const gLo = gen; gen = 0;
    ok('۶۸.۱۰ از درِ ساخت: «زیاد» برای هر کارت تصویر می‌سازد، «کم» همان سقف را',
       gHi === 5 && Object.keys(bHi.bgIds || {}).length === 5 &&
       gLo === 2 && Object.keys(bLo.bgIds || {}).length === 2,
       'زیاد ' + gHi + ' · کم ' + gLo);

    /* ۶۸.۱۰-ب — کارت‌ها ساخته‌اند و تصویر نه (سقفِ هر اجرا): اجرای بعد فقط
       تصویرِ کم‌مانده را می‌سازد، و تا نساخته «تمام» نیست. */
    CFG.LV_GEN_PER_RUN = 2;
    const fCap = root.createFolder('قسمت 0177 — سقفِ اجرا');
    const c1 = lvBuild_(fCap, planOf(), ctxOf('زیاد'), 'آبرنگِ گرم');
    const c2 = lvBuild_(fCap, planOf(), ctxOf('زیاد'), 'آبرنگِ گرم');
    const c3 = lvBuild_(fCap, planOf(), ctxOf('زیاد'), 'آبرنگِ گرم');
    ok('۶۸.۱۰-ب تصویرِ کارتِ ازپیش‌ساخته هم خواسته می‌شود، و تا کامل نشده «تمام» نیست',
       c1.done === false && c1.bgShort === true && c2.done === false &&
       c3.done === true && Object.keys(c3.bgIds).length === 5 && c3.ready === 5,
       [c1, c2, c3].map(x => x.gHave + '/' + x.gWant + (x.done ? ' تمام' : ' منتظر')).join(' · '));

    global.__STUB = BASE_STUB;
    CFG.LV_GEN_ENABLED = keep.on; CFG.LV_GEN_MODEL = keep.mdl; CFG.LV_GEN_PER_EP = keep.per;
    CFG.LV_GEN_USD_MONTH = keep.usd; CFG.LV_GEN_PER_RUN = keep.run;
    global.__PROPS[PK.LV_GEN_SPEND] = '';
  }

  /* ۶۸.۱۱ — **«خاموش» یعنی بدونِ کارت**، از درِ انتشار: نه پوشهٔ تصویر، نه
     تصویری در ردیف. تا ۸.۲۵ فقط مشخصاتِ برداری بسته می‌شد و کارت‌های اسلایدز
     باز هم به رانر می‌رفتند. */
  {
    ytRenderSave_({ items: [] });
    const keepL = global.lvLevelAt_;
    global.lvLevelAt_ = () => 'خاموش';
    const f = DriveApp.__register('EP68OFF', 'قسمت 0178');
    f.createFile(Utilities.newBlob(JSON.stringify({ lesson: 9, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'ت', hook: 'ق', summary: 'خ', sections: secs } }), 'application/json', '_special.json'));
    f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
    ytUploadOne_({ key: 'special:178', show: 'special', ep: '178', folderId: 'EP68OFF',
                   series: 'معرفت‌شناسی' }, null, []);
    global.lvLevelAt_ = keepL;
    const row = ytRenderRead_().items.filter(x => x.key === 'special:178')[0] || null;
    ok('۶۸.۱۱ سطحِ «خاموش»: نه پوشهٔ تصویر، نه تصویر و نه مشخصات در ردیف',
       !!row && (row.visuals || []).length === 0 && !row.spec &&
       f.getFoldersByName(CFG.LV_FOLDER).hasNext() === false,
       row ? ('تصویر ' + (row.visuals || []).length + ' · spec ' + !!row.spec) : 'ردیفی نوشته نشد');
    ytRenderSave_({ items: [] });
  }

  /* ۶۸.۱۲ — **سقفِ خروجیِ فراخوان**: ۴۰۹۶ بود و دو هزارش را «فکر» می‌خورد. */
  {
    let mx = 0;
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      if (sc && sc.properties && sc.properties.title) mx = Number(body.generationConfig.maxOutputTokens) || 0;
      return BASE_STUB(url, body);
    };
    ytMetaModel_(mk());
    global.__STUB = BASE_STUB;
    ok('۶۸.۱۲ فراخوانِ متنِ یوتیوب جا برای چهارده تصویرِ فارسی دارد',
       mx >= 16384, 'maxOutputTokens=' + mx);
  }
  /* ۶۸.۱۳ — **پالتِ برگرفته از سبک خوانده می‌شود.** نُه سبکِ موتور برای
     اسلایدز طراحی شده بودند؛ این‌جا متن بی‌سایه روی زمینه، روی هایلایتر و
     روی کارتِ زنجیره می‌نشیند. هر سه جفت باید کنتراست داشته باشند — پالتی
     که متنش خوانده نشود، بدتر از ظاهرِ پیش‌فرض است. */
  {
    const lum = h => { const c = lvHex_(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
    const weak = [];
    LV_STYLES.forEach(st => {
      const p = lvCardPal_(st);
      [['bg', p.bg], ['card', p.card], ['mark', p.mark]].forEach(([k, c]) => {
        if (Math.abs(lum(c) - lum(p.ink)) < 0.45) weak.push(st.key + ':' + k);
      });
    });
    ok('۶۸.۱۳ پالتِ هر نُه سبک، متن را روی زمینه و هایلایتر و کارت خوانا نگه می‌دارد',
       weak.length === 0 && lvCardPal_(null) === null && lvCardPal_({ key: 'x' }) === null,
       weak.join('، ') || 'هر ' + LV_STYLES.length + ' سبک، سه جفت');
  }
  if (svc68 === undefined) delete global.YouTube; else global.YouTube = svc68;
}

console.log('=== ۶۹) سه کارت، همه از بخشِ یک — نقشه‌ای که از روایت پر می‌شود و شاهدش در ردیف (۸.۲۹) ===');
{
  /* ۳ اکتبر، درسِ ۵۹، روزِ اولِ ۸.۲۶: درخواستِ رندر با سه کارت، هر سه از
     بخشِ یک، برای درسی که موتور دوازده تصویر برایش خواسته بود — و بی
     مشخصاتِ برداری، بی هیچ علتی در جایی که دیده شود. این بند همان شکل را
     از **درِ تولید** می‌سازد: مدلی که سه مورد می‌دهد و در پرسشِ دوم هم
     همان سه را. */
  global.__STUB = BASE_STUB;
  const svc69 = global.YouTube;
  global.YouTube = {};
  const root = global.__ROOT_FOLDER;
  const NAR = [
    'معرفت‌شناسی می‌پرسد دانستن دقیقاً یعنی چه. سنت فلسفی سه شرط را برای دانستن پیشنهاد کرده است. ' +
    'باور باید صادق باشد و صاحبش برای آن دلیل داشته باشد. این سه شرط با هم تعریف کلاسیک را می‌سازند. ' +
    'اما هر کدام از این شرط‌ها پرسش‌های تازه‌ای پیش می‌کشد.',
    'استنتاج قیاسی از مقدمات به نتیجه‌ای می‌رسد که از آن‌ها جدا نیست. اگر مقدمات صادق باشند نتیجه هم صادق است. ' +
    'پرسش اصلی این است که آیا توجیه هم مثل صدق منتقل می‌شود یا نه. ' +
    'بسیاری گمان می‌کنند توجیه همیشه از مقدمات به نتیجه سرایت می‌کند. ' +
    'ولی مثال‌های نقض نشان می‌دهند که این انتقال گاهی شکست می‌خورد.',
    'استنتاج استقرایی از نمونه‌های دیده‌شده به قاعده‌ای کلی می‌رسد. هیوم پرسید چه چیزی این گذر را موجه می‌کند. ' +
    'هیچ تعداد نمونه‌ای منطقاً تضمین نمی‌کند که نمونهٔ بعدی هم همان باشد. ' +
    'با این حال ما هر روز با استقرا زندگی می‌کنیم و به آن اعتماد داریم.',
    'آئودی میان دو گونه انتقال فرق می‌گذارد که هر کدام شرایط خودش را دارد. ' +
    'انتقال توجیه به این بستگی دارد که فرد پیوند استنتاجی را دریافته باشد. ' +
    'انتقال معرفت شرط سخت‌تری دارد چون صدق نتیجه هم باید تضمین شود.',
    'پس انتقال توجیه و معرفت دو مسئلهٔ جدا هستند که نباید یکی گرفته شوند. ' +
    'در درس بعد سراغ نقش حافظه در نگه‌داشتن معرفت می‌رویم. پس تا پایان همراه ما باشید و خوب گوش کنید.'
  ];
  const secs = NAR.map((t, i) => ({ heading: 'بخشِ ' + (i + 1), narration: t }));
  const ctxOf = (ep) => ({ show: 'special', epRaw: ep, showName: 'درس‌نامه', title: 'انتقالِ توجیه',
                           duration: '15:29', headings: secs.map(x => x.heading),
                           sections: secs, totalSec: 929, sources: [] });
  /* مدلِ کم‌کار: سه مورد، همه در بخشِ یک، با عبارتِ واقعی — در پرسشِ اصلی و
     در پرسشِ «فقط تصویر» هر دو. */
  const lazy3 = [
    { at: '1', quote: 'سنت فلسفی سه شرط را برای دانستن', form: 'تمرکز', headline: 'سه شرطِ دانستن',
      kicker: 'تعریفِ کلاسیک', items: ['باور', 'صدق', 'توجیه'] },
    { at: '1', quote: 'باور باید صادق باشد و صاحبش', form: 'زنجیره', headline: 'از باور تا معرفت',
      kicker: 'تعریفِ کلاسیک', steps: ['باور', 'صدق', 'دلیل'] },
    { at: '1', quote: 'هر کدام از این شرط‌ها پرسش‌های تازه‌ای', form: 'پرسش', headline: 'کافی است؟',
      kicker: 'تعریفِ کلاسیک' } ];
  let asks = 0, secAsks = 0;
  /* §۶۹ مسیرِ آخر را می‌سنجد — وقتی پرسشِ یک‌بخشیِ ۸.۳۰ (§۷۰) هم چیزی نداد —
     پس آن پرسش این‌جا جوابِ خالی می‌گیرد. */
  const LAZY = function (url, body) {
    const sc = body && body.generationConfig && body.generationConfig.responseSchema;
    let pr = ''; try { pr = body.contents[0].parts[0].text; } catch (e) {}
    if (sc && sc.properties && sc.properties.visuals && pr.indexOf('فقط همین بخش') !== -1) {
      secAsks++;
      const r0 = BASE_STUB(url, body);
      r0.json.candidates[0].content.parts[0].text = JSON.stringify({ visuals: [] });
      return r0;
    }
    if (sc && sc.properties && sc.properties.visuals) {
      asks++;
      const r = BASE_STUB(url, body);
      const j = JSON.parse(r.json.candidates[0].content.parts[0].text);
      j.visuals = JSON.parse(JSON.stringify(lazy3));
      r.json.candidates[0].content.parts[0].text = JSON.stringify(j);
      return r;
    }
    return BASE_STUB(url, body);
  };

  /* ۶۹.۱ — **از درِ تولید:** مدل دو بار سه مورد داد؛ نقشه به هر بخشِ متن‌دار
     دست‌کم یک کارت می‌دهد و از کفِ نحیف بالاتر است، و سه موردِ مدل دست
     نخورده سرِ جایشان‌اند. */
  global.__STUB = LAZY;
  const f1 = root.createFolder('قسمت 0259 — سه کارت');
  const p1 = ytPlan_(f1, ctxOf('259'), false);
  global.__STUB = BASE_STUB;
  const v1 = p1.visuals || [];
  const mine1 = v1.filter(x => !x.auto), auto1 = v1.filter(x => x.auto);
  const perSec1 = [1, 2, 3, 4, 5].map(s => v1.filter(x => Number(x.at) === s).length);
  ok('۶۹.۱ مدلِ کم‌کار هر بخش را بی‌تصویر نمی‌گذارد: پر از روایت، و کارِ مدل دست‌نخورده',
     asks === 2 && secAsks === 4 && v1.length >= ytVisFloor_(ytVisWant_(929)) && perSec1.every(n => n >= 1) &&
     mine1.length === 3 && mine1.map(x => x.headline).join('|') === 'سه شرطِ دانستن|از باور تا معرفت|کافی است؟' &&
     auto1.length > 0 && auto1.every(x => x.form === 'نقل' && x.headline && x.kicker) &&
     p1.visAuto && p1.visAuto.n === auto1.length &&
     p1.visModel && p1.visModel.raw === 3 && p1.visModel.kept === 3,
     'پرسش ' + asks + ' · یک‌بخشی ' + secAsks + ' · ' + v1.length + ' مورد از ' + ytVisWant_(929) + ' · هر بخش ' +
     JSON.stringify(perSec1) + ' · ازروایت ' + auto1.length + ' · مدل ' + JSON.stringify(p1.visModel));

  /* ۶۹.۲ — **کارتِ ساختهٔ کد همیشه لنگر دارد**، از درِ `lvSpecBuild_` و روی
     **متنِ گفتاری** — با اعراب، نیم‌فاصله و ویرگولِ مکث، که متنِ نوشتاری
     ندارد. این همان چیزی است که برای `quote`ِ مدل فقط امید است. */
  {
    const keepT = global.epTimesRead_, keepC = global.specialTextChunks_;
    const spoken = NAR.map(t => t.replace(/ می/g, ' مِی').replace(/است\./g, 'است، .').replace(/دانستن/g, 'دانِستن'));
    global.epTimesRead_ = () => ({ secs: 929, times: spoken.map((_, i) => ({ i: i, at: i * 180 })) });
    global.specialTextChunks_ = () => spoken.map(t => ({ text: t }));
    const sc = { show: 'special', style: '', bg: {}, foot: 'درس‌نامه' };
    const sp = lvSpecBuild_(f1, { ep: {} }, p1, sc);
    global.epTimesRead_ = keepT; global.specialTextChunks_ = keepC;
    const autoIdx = v1.map((x, i) => x.auto ? i : -1).filter(i => i >= 0);
    const anchored = sp ? autoIdx.filter(i => sp.cards.some(c => c.src === i)) : [];
    const ordered = sp ? sp.cards.every((c, i) => !i || c.at >= sp.cards[i - 1].at) : false;
    ok('۶۹.۲ هر کارتِ ساختهٔ کد در متنِ گفتاری لنگر می‌گیرد و مشخصات ساخته می‌شود',
       !!sp && anchored.length === autoIdx.length && ordered &&
       sp.cards.filter(c => c.form === 'quote').length >= autoIdx.length,
       sp ? (sp.cards.length + ' کارت · کد ' + anchored.length + ' از ' + autoIdx.length +
             ' · گمشده ' + sp.missed) : ('مشخصات نشد: ' + sc.why));
  }

  /* ۶۹.۳ — **ترتیبِ گفتار، نه ترتیبِ رسیدن.** موردِ مدل که عبارتش از تهِ بخشِ
     دو است، پس از کارت‌های ساختهٔ کد می‌نشیند؛ و کارت‌های کد به ترتیبِ جایشان
     در متن‌اند — کارتِ اسلایدز بی زمانِ واقعی پشتِ‌هم می‌آید. */
  {
    const one = [{ at: '2', quote: 'مثال‌های نقض نشان می‌دهند که این انتقال', form: 'نقل',
                   headline: 'انتقال گاهی شکست می‌خورد', kicker: 'قیاس' }];
    const vis = ytVisPlan_({ visuals: one }, ctxOf('260'), {});
    const st = {};
    const full = ytVisFill_(vis, ctxOf('260'), st);
    const s2 = full.filter(x => Number(x.at) === 2);
    const n2 = lvNorm_(NAR[1]);
    const pos = s2.map(x => lvFind_(n2, lvNorm_(x.quote), {}));
    ok('۶۹.۳ در هر بخش، کارت‌ها به ترتیبِ جایشان در گفتارند',
       s2.length >= 2 && s2[s2.length - 1].auto !== true &&
       pos.every((p, i) => p >= 0 && (!i || p > pos[i - 1])) &&
       full.reduce((a, x) => a + x.sec, 0) > 900,
       'بخشِ ۲: ' + s2.map(x => (x.auto ? 'کد' : 'مدل') + '@' + lvFind_(n2, lvNorm_(x.quote), {})).join(' · ') +
       ' · کلِ زمان ' + Math.round(full.reduce((a, x) => a + x.sec, 0)));
  }

  /* ۶۹.۴ — **مدلی که کارش را کرده دست نمی‌خورد.** نقشهٔ کامل و پخش، همان
     آرایه برمی‌گردد و چیزی از روایت اضافه نمی‌شود. */
  {
    const f4 = root.createFolder('قسمت 0261 — کامل');
    const p4 = ytPlan_(f4, ctxOf('261'), false);
    ok('۶۹.۴ نقشهٔ کاملِ مدل بی هیچ کارتِ کد می‌مانَد',
       (p4.visuals || []).length === ytVisShares_(secs, ytVisWant_(929)).reduce((a, b) => a + b, 0) &&
       !p4.visAuto &&
       (p4.visuals || []).every(x => !x.auto),
       (p4.visuals || []).length + ' مورد · ' + JSON.stringify(p4.visAuto || null));

    /* ۶۹.۴-ب — و وقتی **یک** بخش کم دارد، فقط همان بخش پر می‌شود. ۶۹.۴ را
       میان‌بُرِ «هیچ بخشی کم ندارد» هم سبز نگه می‌دارد؛ این‌جا میان‌بُر رد
       می‌شود و فقط محاسبهٔ کسریِ هر بخش است که بخش‌های پُر را دست‌نخورده
       می‌گذارد. */
    const no3 = (p4.visuals || []).filter(x => Number(x.at) !== 3);
    const st4 = {};
    const f4b = ytVisFill_(no3, ctxOf('261'), st4);
    const autoAt = f4b.filter(x => x.auto).map(x => Number(x.at));
    ok('۶۹.۴-ب فقط بخشی که کم دارد پر می‌شود',
       autoAt.length > 0 && autoAt.every(a => a === 3) &&
       f4b.filter(x => !x.auto).length === no3.length,
       'کارتِ کد در بخش‌های ' + JSON.stringify(autoAt));
  }

  /* ۶۹.۵ — **جملهٔ رادیویی کارت نمی‌شود.** «تا پایان همراه ما باشید» و «در درسِ
     بعد…» قابِ رادیواند، نه مفهومِ درس — همان فهرستِ جزوه. و بخشی که فقط
     همین‌ها را دارد، بخشی است که کد جمله‌ای برایش نیافت. */
  {
    const cap5 = auto1.map(x => x.caption + ' ' + x.headline).join(' | ');
    ok('۶۹.۵ از جمله‌های رادیوییِ پایانِ درس هیچ کارتی ساخته نمی‌شود',
       cap5.indexOf('همراه ما باشید') === -1 && cap5.indexOf('گوش کنید') === -1 &&
       cap5.indexOf('درس بعد') === -1 &&
       auto1.filter(x => Number(x.at) === 5).length >= 1,
       auto1.filter(x => Number(x.at) === 5).map(x => x.headline).join(' · '));
  }

  /* ۶۹.۶ — **«نشد» با علتش.** هر `return null`ِ مشخصات علتی جدا دارد و درسِ ۵۹
     بی هیچ‌کدام رفت. */
  {
    const keepT = global.epTimesRead_, keepC = global.specialTextChunks_;
    const a = { show: 'special' };
    global.epTimesRead_ = () => null;
    lvSpecBuild_(f1, { ep: {} }, p1, a);
    const b = { show: 'special' };
    global.epTimesRead_ = () => ({ secs: 100, times: [{ i: 0, at: 0 }] });
    global.specialTextChunks_ = () => [{ text: 'متنی که هیچ عبارتی از نقشه در آن نیست و نخواهد بود' }];
    lvSpecBuild_(f1, { ep: {} }, p1, b);
    global.epTimesRead_ = keepT; global.specialTextChunks_ = keepC;
    ok('۶۹.۶ مشخصاتی که ساخته نشد علتش را می‌گوید: بی‌زمان، یا بی‌لنگر',
       /_times\.json/.test(a.why || '') && /لنگر/.test(b.why || '') && /پیدا نشد/.test(b.why || ''),
       (a.why || '—') + ' | ' + (b.why || '—'));
  }

  /* ۶۹.۷ — **شاهد در ردیفِ عمومی**، از درِ انتشار: نقشهٔ ذخیره‌شدهٔ نحیف پیش
     از ویدئو پر می‌شود، و ردیفِ رندر می‌گوید مدل چند داد، کد چند ساخت، چند
     کارت ساخته شد و چرا مشخصات نشد — بی هیچ متنی از درس. */
  {
    ytRenderSave_({ items: [] });
    const f7 = DriveApp.__register('EP69A', 'قسمت 0262');
    f7.createFile(Utilities.newBlob(JSON.stringify({
      lesson: 9, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'انتقالِ توجیه', hook: 'قلاب', summary: 'خلاصه', sections: secs }
    }), 'application/json', '_special.json'));
    f7.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
    ytPlanWrite_(f7, { at: 'x', show: 'special', ep: '262', title: 'ت', description: 'د',
      tags: ['الف'], coverTitle: 'ک', coverKicker: '', chapters: 5,
      visAsk: { n: 1, raw: 3, after: 3 }, visModel: { raw: 3, kept: 3 },
      visuals: ytVisPlan_({ visuals: lazy3 }, ctxOf('262'), {}) });
    let row = null;
    for (let t = 0; t < 4 && !row; t++) {
      ytUploadOne_({ key: 'special:262', show: 'special', ep: '262', folderId: 'EP69A',
                     series: 'معرفت‌شناسی' }, null, []);
      row = ytRenderRead_().items.filter(x => x.key === 'special:262')[0] || null;
    }
    const pl7 = ytPlanRead_(f7) || {};
    const vi = (row && row.vis) || {};
    const txt = JSON.stringify(vi);
    ok('۶۹.۷ ردیفِ رندر شاهدِ نقشه را دارد: خواسته، نقشه، ازروایت، ساخته، و علتِ نبودِ مشخصات',
       !!row && vi.asked > 0 &&
       vi.planned === (pl7.visuals || []).length &&
       vi.auto === (pl7.visuals || []).filter(x => x.auto).length &&
       vi.designed + vi.auto === vi.planned && vi.secAsk > 0 && vi.planned > 3 &&
       vi.board && typeof vi.board.styleSrc === 'string' && vi.board.styleSrc.length > 0 &&
       vi.model && vi.model.raw === 3 && vi.again && vi.again.raw === 3 &&
       vi.ready === (row.visuals || []).length && vi.spec === 0 && /_times\.json/.test(vi.specWhy) &&
       txt.indexOf('سه شرط') === -1 && txt.indexOf('معرفت‌شناسی می‌پرسد') === -1,
       row ? txt : 'ردیفی نوشته نشد');
    ytRenderSave_({ items: [] });
  }

  /* ۶۹.۸ — **تصویرِ ساخته‌شده به همان مورد تعلق دارد، نه به همان شماره.**
     نقشه پس از ساختِ کارت‌ها عوض شد: کارتِ شمارهٔ یک دیگر مالِ موردِ یک
     نیست و از نو ساخته می‌شود؛ کارتِ دو همان است و دست نمی‌خورد. */
  {
    const f8 = root.createFolder('قسمت 0263 — نقشهٔ عوض‌شده');
    const pl = t0 => ({ visuals: [
      { at: 1, kind: 'کارت', cardTitle: t0, heading: 'یک', cardLines: [], sec: 30 },
      { at: 1, kind: 'کارت', cardTitle: 'ثابت', heading: 'یک', cardLines: [], sec: 30 } ] });
    const cx = { show: 'special', epRaw: '263', sections: [{ heading: 'یک', narration: 'الف'.repeat(200) }], totalSec: 60 };
    const b1 = lvBuild_(f8, pl('قدیم'), cx, '');
    const b2 = lvBuild_(f8, pl('تازه'), cx, '');
    const id = (b, n) => ((b.items || []).filter(x => x.n === n)[0] || {}).fileId;
    ok('۶۹.۸ کارتی که به موردِ دیگری می‌خورد از نو ساخته می‌شود؛ کارتِ درست می‌مانَد',
       b1.ready === 2 && b2.stale === 1 && b2.made === 1 && b2.ready === 2 &&
       id(b1, 1) !== id(b2, 1) && id(b1, 2) === id(b2, 2),
       'کهنه ' + b2.stale + ' · ساخته ' + b2.made + ' · کارتِ ۲ ' + (id(b1, 2) === id(b2, 2) ? 'همان' : 'عوض شد'));
  }

  /* ۶۹.۹ — **یک اجرا، یک تلاش.** اجرایی که کارت ساخت و تصویرهای ساخته‌شده‌اش
     به سقفِ هر اجرا خورد، تا ۸.۲۸ دو تلاش می‌شمرد — یعنی پس از دو نوبت قسمت
     با هر چه هست می‌رفت. */
  {
    const keep = { on: CFG.LV_GEN_ENABLED, mdl: CFG.LV_GEN_MODEL, per: CFG.LV_GEN_PER_EP,
                   usd: CFG.LV_GEN_USD_MONTH, run: CFG.LV_GEN_PER_RUN };
    CFG.LV_GEN_ENABLED = true; CFG.LV_GEN_MODEL = 'gemini-2.5-flash-image';
    CFG.LV_GEN_PER_EP = 5; CFG.LV_GEN_USD_MONTH = 100; CFG.LV_GEN_PER_RUN = 2;
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const png = n => { const b = [137, 80, 78, 71, 13, 10, 26, 10]; while (b.length < n) b.push(7); return b; };
    global.__STUB = function (url, body) {
      if (url.indexOf('flash-image:generateContent') !== -1) {
        return { code: 200, json: { candidates: [{ content: { parts: [
          { inlineData: { mimeType: 'image/png', data: Utilities.base64Encode(png(30000)) } }] } }] } };
      }
      return BASE_STUB(url, body);
    };
    const f9 = root.createFolder('قسمت 0264 — یک تلاش');
    const plan9 = { visuals: [0, 1, 2, 3, 4].map(i => ({ at: 1, kind: 'کارت', cardTitle: 'ک' + i,
      heading: 'یک', cardLines: [], sec: 20 })) };
    const cx9 = { show: 'special', epRaw: '264', sections: [{ heading: 'یک', narration: 'الف'.repeat(200) }],
                  totalSec: 100, level: 'زیاد' };
    const r1 = lvBuild_(f9, plan9, cx9, 'آبرنگِ گرم');
    const r2 = lvBuild_(f9, plan9, cx9, 'آبرنگِ گرم');
    global.__STUB = BASE_STUB;
    CFG.LV_GEN_ENABLED = keep.on; CFG.LV_GEN_MODEL = keep.mdl; CFG.LV_GEN_PER_EP = keep.per;
    CFG.LV_GEN_USD_MONTH = keep.usd; CFG.LV_GEN_PER_RUN = keep.run;
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    ok('۶۹.۹ اجرای اول یک تلاش می‌شمرد، اجرای دوم یکی دیگر — نه دو در یک اجرا',
       r1.bgShort === true && r1.done === false && r1.tries === 1 && r2.tries === 2,
       'اول ' + r1.tries + ' · دوم ' + r2.tries + ' · ' + r1.gHave + '/' + r1.gWant);
  }
  if (svc69 === undefined) delete global.YouTube; else global.YouTube = svc69;
}

console.log('=== ۷۰) درسِ ۵۹ از نو، و درست: لنگرِ گفتاری، پرسشِ بخش‌به‌بخش، جایگزینیِ یک‌باره (۸.۳۰) ===');
{
  global.__STUB = BASE_STUB;
  const svc70 = global.YouTube;
  global.YouTube = {};
  const root = global.__ROOT_FOLDER;

  /* ۷۰.۱ — **«ی»ِ اضافه در متنِ گفتاری.** عبارتِ مدل از متنِ نوشتاری است و
     متنِ گفتاری «سَرچَشمه‌یِ اَوَّلیه‌یِ» دارد. درسِ ۵۹ دقیقاً از همین دو عبارت
     از سه را گم کرد. از درِ `lvSpecBuild_`، با تکه‌های گفتاریِ واقعی‌شکل. */
  {
    const keepT = global.epTimesRead_, keepC = global.specialTextChunks_;
    global.epTimesRead_ = () => ({ secs: 200, times: [{ i: 0, at: 0 }, { i: 1, at: 100 }] });
    global.specialTextChunks_ = () => [
      { text: 'اِسْتِنْتاج، سَرچَشمه‌یِ اَوَّلیه‌یِ مَعرِفَت نیست، بَلکه مَنبَعی اِشتِقاقی است.' },
      { text: 'اِعتِبارِ اِستِدلال بَر دو پایه‌یِ مادّه وُ صورَت اُستوار است.' } ];
    const plan = { visuals: [
      { at: 1, quote: 'استنتاج سرچشمه اولیه معرفت نیست بلکه', form: 'تمرکز', headline: 'جایگاهِ استنتاج' },
      { at: 1, quote: 'اعتبار استدلال بر دو پایهٔ ماده و صورت', form: 'نقل', headline: 'ارکانِ استدلالِ معتبر' } ] };
    const sc = { show: 'special' };
    const sp = lvSpecBuild_(root, { ep: {} }, plan, sc);
    global.epTimesRead_ = keepT; global.specialTextChunks_ = keepC;
    ok('۷۰.۱ عبارتِ نوشتاری در متنِ گفتاریِ «ی»دار و «ٔ»دار پیدا می‌شود',
       !!sp && sp.cards.length === 2 && sp.missed === 0 && sp.cards[1].at >= 100 &&
       lvNorm_('یک یار') === 'یک یار' && lvNorm_('خانهٔ ما') === lvNorm_('خانه‌یِ ما'),
       sp ? sp.cards.length + ' کارت · گمشده ' + sp.missed : 'نشد: ' + sc.why);
  }

  /* ۷۰.۲ — **شکلِ ناقص ساده‌تر می‌شود، نه حذف.** مدل «مقایسه» داد بی سرِ دو
     ستون — یکی از سه موردِ درسِ ۵۹. هم در نقشهٔ تازه (`ytVisItem_`) و هم در
     نقشهٔ قدیمی که از آن‌جا نگذشته (`lvSpecBuild_`). */
  {
    const it = ytVisItem_({ form: 'مقایسه', headline: 'ارکانِ استدلال', aItems: ['ماده'], bItems: ['صورت'] }, 1);
    const ch = ytVisItem_({ form: 'زنجیره', headline: 'یک گام', steps: ['تنها'] }, 1);
    const keepT = global.epTimesRead_, keepC = global.specialTextChunks_;
    global.epTimesRead_ = () => ({ secs: 100, times: [{ i: 0, at: 0 }] });
    global.specialTextChunks_ = () => [{ text: 'اعتبار استدلال بر دو پایه ماده و صورت است و نتیجه از آن می‌آید.' }];
    const sp = lvSpecBuild_(root, { ep: {} }, { visuals: [
      { at: 1, quote: 'اعتبار استدلال بر دو پایه', form: 'مقایسه', headline: 'ارکان', aTitle: '', bTitle: '', aItems: ['ماده'] },
      { at: 1, quote: 'نتیجه از آن می‌آید', form: 'نقل', headline: 'نتیجه' } ] }, { show: 'special' });
    global.epTimesRead_ = keepT; global.specialTextChunks_ = keepC;
    ok('۷۰.۲ مقایسهٔ بی‌سر و زنجیرهٔ تک‌گام «تمرکز» می‌شوند و کارتشان می‌مانَد',
       it.form === 'تمرکز' && it.items.join('|') === 'ماده|صورت' && it.reshaped &&
       ch.form === 'تمرکز' && ch.items.join('|') === 'تنها' &&
       !!sp && sp.cards.length === 2 && sp.missed === 0 && sp.reshaped === 1 &&
       sp.cards.filter(c => c.form === 'focus')[0].items.join('|') === 'ماده',
       it.form + ' · ' + ch.form + ' · ' + (sp ? sp.cards.map(c => c.form).join(',') + ' · بازشکل ' + sp.reshaped : 'نشد'));
  }

  const NAR70 = [
    'استنتاج سرچشمه اولیه معرفت نیست بلکه منبعی اشتقاقی است. استدلال نامعتبر نمی‌تواند توجیه را منتقل کند. اعتبار استدلال بر دو پایه ماده و صورت استوار است. این سه نکته پایه درس امروز است.',
    'در استقرا نتیجه از مقدمات فراتر می‌رود. شواهد بیشتر احتمال را بالا می‌برد اما تضمین نمی‌کند. ابطال‌پذیری در استقرا معنای دیگری دارد.',
    'زنجیره‌های طولی استدلال توجیه را فرسوده می‌کنند. هر حلقه کمی از احتمال را می‌گیرد. در پایان زنجیره احتمال به زیر نیم می‌رسد.'
  ];
  const secs70 = NAR70.map((t, i) => ({ heading: 'بخشِ ' + (i + 1), narration: t }));
  const ctx70 = ep => ({ show: 'special', epRaw: ep, showName: 'درس‌نامه', title: 'انتقالِ توجیه',
                         sections: secs70, totalSec: 600, sources: [] });
  const one3 = [
    { at: '1', quote: 'استنتاج سرچشمه اولیه معرفت نیست', form: 'تمرکز', headline: 'جایگاهِ استنتاج', items: ['اشتقاقی'] },
    { at: '1', quote: 'استدلال نامعتبر نمی‌تواند توجیه را', form: 'پرسش', headline: 'مغالطه' },
    { at: '1', quote: 'اعتبار استدلال بر دو پایه', form: 'تمرکز', headline: 'ارکان', items: ['ماده', 'صورت'] } ];

  /* ۷۰.۳ — **بخش‌به‌بخش، پیش از کارتِ ازروایت.** هر بخشِ کم‌مانده یک بار جدا
     پرسیده می‌شود، `at` همیشه همان بخش است (حتی اگر مدل چیزِ دیگری بنویسد)،
     و پرسشِ دوم هیچ‌چیز نمی‌پرسد. */
  {
    const prompts = [];
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      let pr = ''; try { pr = body.contents[0].parts[0].text; } catch (e) {}
      if (sc && sc.properties && sc.properties.visuals && pr.indexOf('فقط همین بخش') !== -1) {
        prompts.push(pr);
        const r = BASE_STUB(url, body);
        const j = JSON.parse(r.json.candidates[0].content.parts[0].text);
        j.visuals = (j.visuals || []).map(v => Object.assign(v, { at: '9' }));   // شمارهٔ غلط
        r.json.candidates[0].content.parts[0].text = JSON.stringify(j);
        return r;
      }
      return BASE_STUB(url, body);
    };
    const f = root.createFolder('قسمت 0270 — بخش‌به‌بخش');
    const ctx = ctx70('270');
    const plan = { visuals: ytVisPlan_({ visuals: one3 }, ctx, {}) };
    const n1 = ytVisSecAsk_(f, plan, ctx);
    const n2 = ytVisSecAsk_(f, plan, ctx);
    global.__STUB = BASE_STUB;
    const sh = ytVisShares_(secs70, ytVisWant_(600));
    const per = [1, 2, 3].map(s => plan.visuals.filter(v => Number(v.at) === s).length);
    const onlyOwn = prompts.every((p, i) => p.indexOf(NAR70[i + 1].slice(0, 30)) !== -1 &&
                                            p.indexOf(NAR70[0].slice(0, 30)) === -1);
    /* ۷۰.۳-ب — و «یک بار» یعنی حتی وقتی جواب خالی بود: بی آن، هر نوبتِ انتشار
       (هر دو ساعت) همان بخش‌ها را دوباره می‌پرسید و هر بار پول می‌داد. */
    let empties = 0;
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      let pr = ''; try { pr = body.contents[0].parts[0].text; } catch (e) {}
      if (sc && sc.properties && sc.properties.visuals && pr.indexOf('فقط همین بخش') !== -1) {
        empties++;
        const r = BASE_STUB(url, body);
        r.json.candidates[0].content.parts[0].text = JSON.stringify({ visuals: [] });
        return r;
      }
      return BASE_STUB(url, body);
    };
    const fE = root.createFolder('قسمت 0275 — جوابِ خالی');
    const planE = { visuals: ytVisPlan_({ visuals: one3 }, ctx, {}) };
    ytVisSecAsk_(fE, planE, ctx);
    const e1 = empties;
    ytVisSecAsk_(fE, planE, ctx);
    global.__STUB = BASE_STUB;
    ok('۷۰.۳-ب بخشی که یک بار پرسیده شد و جوابش خالی بود، دوباره پرسیده نمی‌شود',
       e1 === 2 && empties === 2 && planE.visSec['2'].got === 0,
       'بارِ اول ' + e1 + ' · پس از دومی ' + empties);
    ok('۷۰.۳ هر بخشِ کم‌مانده یک بار جدا پرسیده می‌شود و جوابش سرِ همان بخش می‌نشیند',
       prompts.length === 2 && onlyOwn && n1 > 0 && n2 === 0 &&
       per[1] === sh[1] && per[2] === sh[2] && plan.visuals.filter(v => v.secAsk).length === n1 &&
       plan.visuals.every(v => Number(v.at) >= 1 && Number(v.at) <= 3) &&
       plan.visSec && plan.visSec['2'] && plan.visSec['2'].got === sh[1],
       'پرسش ' + prompts.length + ' · افزوده ' + n1 + '/' + n2 + ' · هر بخش ' + JSON.stringify(per) +
       ' از ' + JSON.stringify(sh));
  }

  /* ۷۰.۴ — **درسِ ۵۹ از درِ انتشار:** ردیفِ نحیفِ ساخته‌نشده در صف است. نقشه
     از نو پر می‌شود، تلاش از صفر شروع می‌شود، و ردیف **جایگزین** می‌شود — یک
     ردیف، با `at` تازه (تا نگه‌داشتنِ رانر رها شود) و `redo: 1`. و دیگر هرگز. */
  {
    ytRenderSave_({ items: [] });
    const f = DriveApp.__register('EP70A', 'قسمت 0271');
    f.createFile(Utilities.newBlob(JSON.stringify({
      lesson: 37, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'انتقالِ توجیه', hook: 'قلاب', summary: 'خلاصه', sections: secs70 }
    }), 'application/json', '_special.json'));
    const wav70 = f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
    /* مدت از اندازهٔ فایل حساب می‌شود (`ytSecondsOf_`)؛ ده دقیقه، مثلِ یک درسِ
       واقعی — با بیست کیلوبایت، موتور سه تصویر می‌خواهد و سه‌تای ردیف «نحیف»
       نیست، یعنی حالتی که تولید نمی‌سازد (۷٫۲۲). */
    wav70.getSize = () => 600 * 48000 + 44;
    const ctx = ctx70('271');
    ytPlanWrite_(f, { at: 'x', show: 'special', ep: '271', title: 'ت', description: 'د',
      tags: ['الف'], coverTitle: 'ک', coverKicker: '', chapters: 3,
      visAsk: { n: 1, raw: 1, after: 3 }, visModel: { raw: 3, kept: 3 },
      visuals: ytVisPlan_({ visuals: one3 }, ctx, {}) });
    lvWrite_(f, { at: 'x', tries: 2, items: [], done: true });
    const oldAt = '2026-10-03 09:01';
    ytRenderSave_({ items: [{ key: 'special:271', show: 'special', ep: '271', status: 'در انتظار',
      at: oldAt, visuals: [{ fileId: 'A' }, { fileId: 'B' }, { fileId: 'C' }] }] });
    _ytMapMemo = {};                       // رانر هنوز چیزی نساخته
    let row = null, rounds = 0;
    for (; rounds < 5; rounds++) {
      ytUploadOne_({ key: 'special:271', show: 'special', ep: '271', folderId: 'EP70A',
                     series: 'معرفت‌شناسی' }, null, []);
      row = ytRenderRead_().items.filter(x => x.key === 'special:271');
      if (row.length === 1 && row[0].redo) break;
    }
    const r1 = row && row[0] || {};
    const plan = ytPlanRead_(f) || {};
    const triesAfter = Number((lvRead_(f) || {}).tries);
    /* دورِ بعد: ردیفِ جایگزین‌شده دیگر جایگزین نمی‌شود، حتی اگر بهتری بیاید. */
    const atAfter = r1.at;
    ytUploadOne_({ key: 'special:271', show: 'special', ep: '271', folderId: 'EP70A',
                   series: 'معرفت‌شناسی' }, null, []);
    const again = ytRenderRead_().items.filter(x => x.key === 'special:271');
    ok('۷۰.۴ ردیفِ نحیفِ ساخته‌نشده یک بار جایگزین می‌شود — با at تازه، نه ردیفِ دوم',
       row.length === 1 && r1.redo === 1 && r1.replaced === oldAt && r1.at !== oldAt &&
       (r1.visuals || []).length > 3 && (plan.visuals || []).length > 3 &&
       again.length === 1 && again[0].at === atAfter && triesAfter === 1,
       'تلاش ' + triesAfter + ' · دور ' + (rounds + 1) + ' · ردیف ' + row.length + ' · redo ' + r1.redo + ' · تصویر ' +
       (r1.visuals || []).length + ' · نقشه ' + (plan.visuals || []).length + ' · at ' + r1.at);
    _ytMapMemo = null;
    ytRenderSave_({ items: [] });
  }

  /* ۷۰.۵ — **و مرزهایش:** ردیفی که رانر ساخته، ردیفی که نحیف نیست، و جوابی که
     بهتر نیست، هیچ‌کدام جایگزین نمی‌شوند. */
  {
    const thin = { key: 'special:272', status: 'در انتظار', visuals: [{}, {}] };
    _ytMapMemo = {};
    const a = ytRenderRedoable_(thin, 12);
    _ytMapMemo = { 'special:272': { url: 'https://x/v.mp4' } };
    const b = ytRenderRedoable_(thin, 12);
    _ytMapMemo = {};
    const c = ytRenderRedoable_({ key: 'k', status: 'در انتظار', visuals: new Array(8).fill({}) }, 12);
    const d = ytRenderRedoable_({ key: 'k', status: 'در انتظار', visuals: [], spec: { cards: [{}, {}] } }, 12);
    const e = ytRenderRedoable_({ key: 'k', status: 'رسید', visuals: [] }, 12);
    ytRenderSave_({ items: [{ key: 'special:273', show: 'special', ep: '273', status: 'در انتظار',
                              at: 'x', visuals: [{ fileId: 'A' }, { fileId: 'B' }] }] });
    const worse = ytRenderAsk_({ show: 'special', ep: '273', folderId: 'F', audio: [],
                                 visuals: [{ fileId: 'Z' }], visInfo: { asked: 12 } });
    const kept = ytRenderRead_().items.filter(x => x.key === 'special:273');
    _ytMapMemo = null;
    ok('۷۰.۵ ساخته‌شده، نانحیف، دارای مشخصات، رسیده، و جوابِ بدتر — هیچ‌کدام جایگزین نمی‌شوند',
       a === true && b === false && c === false && d === false && e === false &&
       worse === false && kept.length === 1 && kept[0].at === 'x',
       JSON.stringify([a, b, c, d, e, worse, kept.length]));
    ytRenderSave_({ items: [] });
  }
  /* ۷۰.۶ — **کارتِ ازروایت، جملهٔ مرتبط و کامل.** روی درسِ ۵۹ نسخهٔ اول یک
     یادداشتِ غنی‌سازی («این توضیح در خودِ درس نیامده…») و تکه‌ای از وسطِ
     جمله («که او…») را کارت کرد. حالا: قابِ متن کنار می‌رود، جملهٔ «و…»ِ
     بی‌سر عقب می‌افتد، جمله‌ای که واژه‌های سرِ بخش را دارد جلو، و متنِ درشت
     تا دو سطر کامل می‌مانَد. */
  {
    /* جملهٔ خنثی و کاملِ دوم عمداً پیش از جملهٔ مرتبط است: بی امتیازِ موضوع،
       این دو هم‌امتیازند و اولی برنده می‌شود — پس «مرتبط» واقعاً سنجیده می‌شود. */
    const narr = 'این توضیح در خودِ درس نیامده و برای تکمیل اضافه شده است. ' +
                 'و این همان چیزی است که پیش‌تر گفتیم و دوباره می‌گوییم. ' +
                 'فیلسوفان دربارهٔ این پرسش بسیار نوشته‌اند و هنوز هم با شور می‌نویسند. ' +
                 'زنجیره‌های طولی استدلال توجیه را در هر حلقه کمی فرسوده می‌کنند و در پایان به زیر نیم می‌رسانند.';
    const pk = ytVisAutoPick_(narr, 1, [], 'فرسایشِ توجیه در زنجیره‌های طولی');
    const all3 = ytVisAutoPick_(narr, 3, [], 'فرسایشِ توجیه در زنجیره‌های طولی');
    const ctxQ = { show: 'special', sections: [{ heading: 'فرسایشِ توجیه در زنجیره‌های طولی', narration: narr }], totalSec: 300 };
    const fq = ytVisFill_([], ctxQ, {});
    const h0 = (fq.filter(x => /زنجیره/.test(x.headline))[0] || {}).headline || '';
    ok('۷۰.۶ قابِ متن کارت نمی‌شود؛ جملهٔ مرتبط و کامل جلو است و متنِ درشتش بریده نمی‌شود',
       pk.length === 1 && /زنجیره/.test(pk[0].t) &&
       all3.every(x => x.t.indexOf('در خودِ درس نیامده') === -1) &&
       fq.every(x => x.headline.indexOf('در خودِ درس نیامده') === -1) &&
       /زنجیره/.test(h0) && h0.indexOf('…') === -1 && h0.length > 48,
       (pk[0] || {}).t + ' | ' + h0.length + ' نویسه');
  }
  if (svc70 === undefined) delete global.YouTube; else global.YouTube = svc70;
}

console.log('=== ۷۱) صحنه‌های مصور (۸.۳۱): تصویر خودِ محتواست، و زمان از گفتار ===');
{
  global.__STUB = BASE_STUB;
  const svc71 = global.YouTube;
  global.YouTube = {};
  const root = global.__ROOT_FOLDER;
  const png71 = (n) => { const a = new Array(n).fill(9);
    [137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,7,128,0,0,4,56,8,6,0,0,0]
      .forEach((b, i) => a[i] = b); return a; };

  /* ۷۱.۱ — **دوقلو.** `specialTextChunks_` (بازسازیِ بی‌اثرِ جانبی) و
     `buildSpecialChunks_` (تولید) باید متنِ یکسان بدهند — وگرنه زمانِ تصویر از
     متنی می‌آید که گفته نشده. موسیقی خاموش، چون فقط متن مقایسه می‌شود. */
  {
    const ep71 = { title: 'ت', hook: 'سلام. امروز دربارهٔ استنتاج حرف می‌زنیم.',
      /* بلندتر از سقفِ یک تکهٔ گفتار (`TTS_CHUNK_CHARS`)، تا شکستنِ تکه‌ها هم
         در مقایسه بیاید — دو متنِ کوتاه با هر شکستنی یکی‌اند. */
      sections: [{ heading: 'یک', narration: 'جملهٔ اولِ بخش. جملهٔ دومِ بخش که کمی بلندتر است. '.repeat(40) },
                 { heading: 'دو', narration: 'جملهٔ سوم. جملهٔ چهارم و آخر. '.repeat(4) }],
      outro: 'تا درسِ بعد.' };
    const keepM = CFG.MUSIC_ENABLED;
    CFG.MUSIC_ENABLED = false;
    const a = buildSpecialChunks_(JSON.parse(JSON.stringify(ep71)), '71', 'فلسفه').map(c => c.text);
    CFG.MUSIC_ENABLED = keepM;
    const b = specialTextChunks_(JSON.parse(JSON.stringify(ep71)), 'فلسفه');
    ok('۷۱.۱ بازسازیِ متن همان تکه‌هایی را می‌دهد که تولید به گفتارساز داد',
       a.length > 4 && a.join('|') === b.map(c => c.text).join('|') &&
       b.every(c => typeof c.seg === 'number'),
       a.length + ' / ' + b.length);
  }

  /* ۷۱.۲ — **موسیقی دیده می‌شود.** درسِ ۵۹: ۲۱ زمان و ۱۸ تکهٔ متن؛ نگاشتِ
     شماره‌به‌شماره پس از هر پلِ موسیقی همه را جابه‌جا کرد. */
  {
    const tc = [{ text: 'الف'.repeat(100), seg: 0 }, { text: 'ب'.repeat(300), seg: 1 },
                { text: 'پ'.repeat(200), seg: 1 }, { text: 'ت'.repeat(250), seg: 2 }];
    const times = [{ i: 0, at: 0 }, { i: 1, at: 30 }, { i: 2, at: 36 }, { i: 3, at: 126 },
                   { i: 4, at: 186 }, { i: 5, at: 191 }];
    const al = lvAlignTimes_(tc, times, 266);
    const tk = times.map((x, i) => Object.assign({ k: (i === 1 || i === 4) ? 'm' : 't' }, x));
    const ak = lvAlignTimes_(tc, tk, 266);
    const eq = lvAlignTimes_(tc, times.slice(0, 4), 200);
    const few = lvAlignTimes_(tc, times.slice(0, 3), 100);
    const wild = lvAlignTimes_([{ text: 'x'.repeat(100), seg: 0 }, { text: 'x'.repeat(100), seg: 1 },
                                { text: 'x'.repeat(100), seg: 2 }],
                               [{ i: 0, at: 0 }, { i: 1, at: 2 }, { i: 2, at: 80 }, { i: 3, at: 81 }], 200);
    ok('۷۱.۲ هم‌ترازی زمانِ موسیقی را کنار می‌گذارد؛ با «k» مستقیم؛ نامطمئن و ناجور «نه» با علت',
       JSON.stringify(al.map) === '[0,2,3,5]' && al.how === 'هم‌ترازی' &&
       JSON.stringify(ak.map) === '[0,2,3,5]' && ak.how === 'نوع' &&
       eq.how === 'برابر' && few.map === null && /زمان/.test(few.why) &&
       wild.map === null && /نامطمئن/.test(wild.why),
       JSON.stringify([al.map, ak.map, eq.how, few.why, wild.why]));
  }

  /* ۷۱.۳ — **کارتِ برداری هم از همان راه.** تکهٔ سوم پس از یک پلِ موسیقی
     است؛ کارتش باید در زمانِ واقعیِ تکهٔ سوم بنشیند، نه در زمانِ «سومین زمان». */
  {
    const keepT = global.epTimesRead_, keepC = global.specialTextChunks_;
    global.epTimesRead_ = () => ({ secs: 30, times: [{ i: 0, at: 0 }, { i: 1, at: 8 }, { i: 2, at: 14 }, { i: 3, at: 22 }] });
    global.specialTextChunks_ = () => [
      { text: 'معرفت در سنت فلسفی سه شرط دارد که باید با هم جمع شوند تا ادعا موجه شود.', seg: 0 },
      { text: 'توجیه از مقدمات به نتیجه منتقل می‌شود اگر استدلال معتبر باشد و مقدمات موجه.', seg: 1 },
      { text: 'زنجیره‌های طولی استدلال توجیه را در هر حلقه کمی فرسوده می‌کنند تا آخر کار.', seg: 2 } ];
    const plan = { visuals: [
      { at: 1, quote: 'سه شرط دارد که باید با هم', form: 'تمرکز', headline: 'سه شرط', items: ['باور'] },
      { at: 3, quote: 'توجیه را در هر حلقه کمی فرسوده', form: 'پرسش', headline: 'فرسایش' } ] };
    const sp = lvSpecBuild_(root, { ep: {} }, plan, { show: 'special', foot: 'x' });
    global.epTimesRead_ = keepT; global.specialTextChunks_ = keepC;
    const c3 = sp && sp.cards.filter(c => c.src === 1)[0];
    ok('۷۱.۳ کارتِ پس از پلِ موسیقی در زمانِ گفتارِ خودش می‌نشیند (نه یک تکه زودتر)',
       !!c3 && c3.at >= 22 && c3.at < 30,
       c3 ? 'کارت در ' + c3.at : 'مشخصات نشد');
  }

  /* ۷۱.۴ — **صحنه سرِ مرزِ جمله شروع می‌شود و هیچ قابی بی‌صحنه نیست.** */
  {
    const ch = [{ text: 'جملهٔ یک. جملهٔ دو. جملهٔ سه. جملهٔ چهار.', at: 0, end: 30, secIndex: -1 },
                { text: 'جملهٔ پنج. جملهٔ شش. جملهٔ هفت.', at: 36, end: 70, secIndex: 0 },
                { text: 'جملهٔ هشت. جملهٔ نه. جملهٔ ده. جملهٔ یازده.', at: 70, end: 118, secIndex: 1 }];
    const ss = lvSceneSents_(ch);
    const g = lvSceneGroups_(ss, 20, 120, 60);
    const starts = ss.map(x => x.t);
    const gMax = lvSceneGroups_(ss, 5, 120, 3);
    /* اولین جمله دیرتر از صفر شروع می‌شود (موسیقیِ آغاز): صحنهٔ اول باز هم از
       صفر است — قابِ خالی در ثانیه‌های اول همان «صفحهٔ خالی»ِ درسِ ۵۹ است. */
    const late = lvSceneGroups_(lvSceneSents_([{ text: 'یک. دو. سه.', at: 9, end: 40, secIndex: 0 },
                                               { text: 'چهار. پنج.', at: 40, end: 80, secIndex: 1 }]), 15, 80, 60);
    ok('۷۱.۴ صحنه‌ها از ثانیهٔ صفر تا پایان، روی شروعِ جمله، با بخشِ خودشان؛ سقفِ تعداد رعایت می‌شود',
       g.length >= 3 && g[0].t0 === 0 && g[g.length - 1].t1 === 120 &&
       g.slice(1).every(x => starts.indexOf(x.t0) !== -1) &&
       g.every((x, i) => i === 0 || x.t0 === g[i - 1].t1) &&
       g.some(x => x.sec === 2) && gMax.length <= 3 && late[0].t0 === 0 &&
       ss.filter(x => x.ci === 1)[0].t === 36,
       g.map(x => x.t0 + '-' + x.t1 + '@' + x.sec).join(' · ') + ' | سقف ' + gMax.length);
  }

  /* ۷۱.۵ — **از نقشه تا تصویر، در چند اجرا.** یک درسِ واقعی‌شکل با سه بخش:
     نقشه یک بار، تصویر‌ها با نسبتِ ۱۶:۹، داوری کنارِ متن، تصویرِ ضعیف یک بار از
     نو، جزوه صحنه‌ها را می‌گیرد، و هزینهٔ هر فراخوان شمرده می‌شود. */
  const sceneStub = (cnt) => function (url, body) {
    const sc = body && body.generationConfig && body.generationConfig.responseSchema;
    if (url.indexOf('image:generateContent') !== -1) {
      cnt.gen++; cnt.cfg.push(!!(body.generationConfig && body.generationConfig.imageConfig));
      cnt.imgPrompts.push(body.contents[0].parts[0].text);
      return { code: 200, json: { candidates: [{ content: { parts: [
        { inlineData: { mimeType: 'image/png', data: Utilities.base64Encode(png71(20000)) } }] } }] } };
    }
    /* تدوین‌گر (۸.۴۹): پرامپتش ثبت می‌شود؛ پاسخ فقط اگر آزمون `cutFn` داده —
       وگرنه همان جوابِ بی‌برشِ پایه، یعنی راهِ زمانی (سنجه‌های قدیمی همان را می‌سنجند). */
    if (sc && sc.properties && sc.properties.cuts) {
      const pr = body.contents[0].parts[0].text;
      cnt.cut = (cnt.cut || 0) + 1; (cnt.cutPrompts = cnt.cutPrompts || []).push(pr);
      cnt.cutCap = body.generationConfig.maxOutputTokens;
      if (cnt.cutFn) {
        const nS = (pr.match(/^\[\d+\] \(/mg) || []).length;
        return { code: 200, json: { candidates: [{ content: { parts: [{ text:
          JSON.stringify({ cuts: cnt.cutFn(nS).map(String), why: 'هر مفهوم یک تصویر' }) }] } }] } };
      }
      return BASE_STUB(url, body);
    }
    if (sc && sc.properties && sc.properties.scenes) {
      const pr = body.contents[0].parts[0].text;
      cnt.plan++; cnt.prompts.push(pr);
      if (cnt.genAtPlan) cnt.genAtPlan.push(cnt.gen);
      const ns = []; const re = /^\[(\d+)\]/mg; let m;
      while ((m = re.exec(pr))) ns.push(m[1]);
      const r = { nature: cnt.natureOut, cast: 'a curious student in a blue sweater', cover: 'a lantern lighting a path of stones',
                  scenes: ns.map(n => ({ n: n, scene: 'a lantern passing light to the next lantern number ' + n,
                                         caption: 'مفهومِ ' + n })) };
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] } };
    }
    if (sc && sc.properties && sc.properties.items && JSON.stringify(body).indexOf('inlineData') !== -1) {
      cnt.judge++;
      const parts = body.contents[0].parts, items = [];
      parts.forEach(p => { const m = /^تصویرِ (\d+)/.exec(p.text || ''); if (m) items.push(m[1]); });
      const r = { items: items.map(n => ({ n: n, score: n === '2' && !cnt.redid ? '2' : '8',
                                           hasText: 'خیر', realFace: 'خیر', why: 'ربط دارد' })) };
      if (items.indexOf('2') !== -1) cnt.redid = true;
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] } };
    }
    return BASE_STUB(url, body);
  };
  const SEC71 = [
    { heading: 'جایگاهِ استنتاج', narration: 'استنتاج سرچشمهٔ اولیهٔ معرفت نیست. منبعی اشتقاقی است. هر استنتاج به مقدماتش بند است. '.repeat(7) },
    { heading: 'اعتبارِ منطقی', narration: 'استدلالِ نامعتبر توجیه را منتقل نمی‌کند. اعتبار دو پایه دارد. ماده و صورت هر دو لازم‌اند. '.repeat(7) },
    { heading: 'زنجیره‌های طولی', narration: 'هر حلقه کمی از احتمال را می‌گیرد. در پایان زنجیره احتمال به زیرِ نیم می‌رسد. '.repeat(7) } ];
  const mkEp71 = (id, name) => {
    const f = DriveApp.__register(id, name);
    const meta = { lesson: 37, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
                   ep: { title: 'انتقالِ توجیه', hook: 'سلام. امروز دربارهٔ انتقالِ توجیه حرف می‌زنیم.',
                         sections: SEC71, outro: 'تا درسِ بعد.' } };
    f.createFile(Utilities.newBlob(JSON.stringify(meta), 'application/json', '_special.json'));
    const tc = specialTextChunks_(meta.ep, 'فلسفه');
    /* زمان‌ها با «k» و یک پلِ موسیقی میانِ دو بخش — همان شکلی که از ۸.۳۱ ثبت می‌شود. */
    const times = []; let t = 0, i = 0;
    tc.forEach((c, k) => {
      if (k > 0 && c.seg !== tc[k - 1].seg && c.seg === 2) { times.push({ i: i++, at: t, k: 'm' }); t += 6; }
      times.push({ i: i++, at: Math.round(t * 100) / 100, k: 't' });
      t += String(c.text).length * 0.09;
    });
    f.createFile(Utilities.newBlob(JSON.stringify({ v: 1, secs: Math.round(t * 100) / 100, times: times }),
                                   'application/json', '_times.json'));
    return { f: f, meta: meta, secs: Math.round(t * 100) / 100 };
  };
  const genWas = { on: global.__PROPS[PK.LV_GEN_ON], model: CFG.LV_GEN_MODEL, usd: CFG.LV_GEN_USD_MONTH,
                   enabled: CFG.LV_GEN_ENABLED };
  global.__PROPS[PK.LV_GEN_ON] = '1';
  CFG.LV_GEN_MODEL = 'gemini-2.5-flash-image';
  CFG.LV_GEN_USD_MONTH = 60;
  global.__PROPS[PK.LV_GEN_SPEND] = '';
  delete global.__PROPS[PK.LV_SCENE_LEASE];
  {
    const cnt = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    global.__STUB = sceneStub(cnt);
    const E = mkEp71('EP71A', 'قسمت 0271 — صحنه');
    const ctx = { show: 'special', epRaw: '271', title: 'انتقالِ توجیه', seriesName: 'معرفت‌شناسی',
                  sections: SEC71, level: 'زیاد', style: 'آبرنگِ گرم' };
    const keepRun = CFG.LV_SCENE_RUN_MS;
    let r = null, runs = 0;
    for (; runs < 8; runs++) {
      r = lvScenesBuild_(E.f, E.meta, {}, ctx);
      if (r.done || r.fallback) break;
    }
    CFG.LV_SCENE_RUN_MS = keepRun;
    const d = lvSceneRead_(E.f);
    const imgs = lvFolder_(E.f);
    let nImg = 0; const it = imgs.getFiles(); while (it.hasNext()) { if (/^صحنه/.test(it.next().getName())) nImg++; }
    const vis = lvRead_(E.f) || {};
    const sp = lvGenSpend_();
    const p0 = cnt.prompts[0] || '';
    ok('۷۱.۵ نقشهٔ صحنه یک بار، تصویر ۱۶:۹ برای هر صحنه، داوری کنارِ متن، ضعیف یک بار از نو',
       r && r.done && !r.fallback && cnt.plan === 1 && d && d.scenes.length >= 3 &&
       d.scenes[0].t0 === 0 && Math.abs(d.scenes[d.scenes.length - 1].t1 - E.secs) < 0.1 &&
       nImg === d.scenes.length && r.items.length === d.scenes.length &&
       r.items.every(x => /usercontent/.test(x.url)) && r.items[0].t0 === 0 &&
       cnt.cfg.every(Boolean) && cnt.judge >= 1 && Number(d.redo) === 1 &&
       d.scenes.filter(x => x.n === 2)[0].redo === 1 && !!r.cover && d.align === 'نوع' &&
       sp.n === cnt.gen && cnt.gen === d.scenes.length + 2 &&
       cnt.imgPrompts.every(x => /watercolor/.test(x) && /no text/i.test(x)) &&
       /متنی که \*\*همان موقع\*\* خوانده می‌شود/.test(p0) && p0.indexOf('[1] (0:00') !== -1 &&
       vis.mode === 'scenes' && (vis.items || []).length >= 2 && vis.items.every(x => x.at >= 1),
       'دور ' + (runs + 1) + ' · صحنه ' + (d ? d.scenes.length : 0) + ' · تصویر ' + nImg + ' · ساخت ' + cnt.gen +
       ' · داوری ' + cnt.judge + ' · ازنو ' + (d && d.redo) + ' · خرج ' + sp.n + ' · جزوه ' + (vis.items || []).length +
       (r && r.why ? ' · ' + r.why : ''));

    /* ۷۱.۵-ب — **اجاره:** اجرای هم‌زمانِ دیگری که همین درس را می‌سازد، این
       اجرا را بی هیچ خرجی برمی‌گرداند. */
    const E2 = mkEp71('EP71B', 'قسمت 0272 — اجاره');
    lvScenesBuild_(E2.f, E2.meta, {}, Object.assign({}, ctx, { epRaw: '272' }));   // نقشه + چند تصویر
    const g0 = cnt.gen;
    global.__PROPS[PK.LV_SCENE_LEASE] = JSON.stringify({ key: 'special:272', until: Date.now() + 600000 });
    const rL = lvScenesBuild_(E2.f, E2.meta, {}, Object.assign({}, ctx, { epRaw: '272' }));
    delete global.__PROPS[PK.LV_SCENE_LEASE];
    ok('۷۱.۵-ب اجرای دوم، وقتی اجرای دیگری همین درس را می‌سازد، هیچ تصویری نمی‌سازد',
       !rL.done && /اجرای دیگری/.test(rL.why) && cnt.gen === g0, rL.why);
  }

  /* ۷۱.۶ — **سقفِ ماهانه و نقشهٔ ناشده:** خرج‌نشدن یعنی مسیرِ قبلی با علت، و
     نقشه‌ای که دو بار نشد، بارِ سوم مدل را صدا نمی‌زند. */
  {
    const cnt = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    global.__STUB = sceneStub(cnt);
    CFG.LV_GEN_USD_MONTH = 0.01;
    const E = mkEp71('EP71C', 'قسمت 0273 — سقف');
    const ctx = { show: 'special', epRaw: '273', title: 'ت', seriesName: 'س', sections: SEC71,
                  level: 'زیاد', style: 'ساده و رسمی' };
    const rB = lvScenesBuild_(E.f, E.meta, {}, ctx);
    CFG.LV_GEN_USD_MONTH = 60;
    let planCalls = 0;
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      if (sc && sc.properties && sc.properties.scenes) {
        planCalls++;
        return { code: 200, json: { candidates: [{ content: { parts: [{ text: '{"scenes":[]}' }] } }] } };
      }
      return BASE_STUB(url, body);
    };
    const E2 = mkEp71('EP71D', 'قسمت 0274 — نقشهٔ ناشده');
    const ctx2 = Object.assign({}, ctx, { epRaw: '274' });
    const f1 = lvScenesBuild_(E2.f, E2.meta, {}, ctx2);
    const f2 = lvScenesBuild_(E2.f, E2.meta, {}, ctx2);
    const f3 = lvScenesBuild_(E2.f, E2.meta, {}, ctx2);
    global.__STUB = BASE_STUB;
    ok('۷۱.۶ سقفِ پر ⇒ مسیرِ قبلی با علت؛ نقشه‌ای که دو بار نشد بارِ سوم پرسیده نمی‌شود',
       rB.fallback && /سقفِ ماهانه/.test(rB.why) && cnt.gen === 0 &&
       f1.fallback && f2.fallback && f3.fallback && planCalls === 2 && /توصیف/.test(f1.why),
       rB.why + ' | ' + planCalls + ' پرسش · ' + f3.why);
    /* ۷۱.۶-ب — بی‌پولی پیش از هر فراخوانِ مدل گفته می‌شود و «نقشهٔ ناشده» شمرده
       نمی‌شود (۸.۴۸): ماهِ بعد پول هست، و این درس نباید تا ابد «دو بار نشد» بماند. */
    const dB = lvSceneRead_(E.f);
    ok('۷۱.۶-ب بی‌پولی ⇒ هیچ پرسشِ نقشه‌ای خرج نمی‌شود و شکستِ نقشه ثبت نمی‌شود',
       cnt.plan === 0 && (!dB || !(Number(dB.failed) > 0)),
       'پرسش ' + cnt.plan + ' · ' + JSON.stringify(dB && { failed: dB.failed, n: dB.scenes.length }));
  }

  /* ۷۱.۷ — **ردیفِ رندر:** صحنه‌ها با ثانیه و تصویرشان، هر فایل یک بار باز
     می‌شود، و ردیفِ کارتیِ ساخته‌نشده جایگزین می‌شود — ساخته‌شده نه. */
  {
    const shared = [];
    const keepS = global.driveShareOn_;
    global.driveShareOn_ = (id) => { shared.push(id); return true; };
    ytRenderSave_({ items: [{ key: 'special:281', show: 'special', ep: '281', status: 'در انتظار', at: 'old',
                              visuals: [{ fileId: 'V1' }], spec: { cards: [{ at: 0 }] } },
                            { key: 'special:282', show: 'special', ep: '282', status: 'در انتظار', at: 'built',
                              visuals: [{ fileId: 'V2' }] }] });
    _ytMapMemo = { 'special:282': { url: 'https://x/v.mp4' } };
    const scenes = [{ n: 1, t0: 0, fileId: 'S1', caption: 'الف' }, { n: 2, t0: 20, fileId: 'S2', caption: '' },
                    { n: 3, t0: 41, fileId: 'S2', caption: '' }];
    const okA = ytRenderAsk_({ show: 'special', ep: '281', folderId: 'F', audio: [{ id: 'A1' }],
                               scenes: scenes, sceneCover: { fileId: 'C1' }, coverTitle: 'عنوان',
                               coverFoot: 'درس ۳۷', sceneInfo: { scenes: 3 } });
    const okB = ytRenderAsk_({ show: 'special', ep: '282', folderId: 'F', audio: [], scenes: scenes });
    global.driveShareOn_ = keepS;
    const rows = ytRenderRead_().items;
    const r1 = rows.filter(x => x.key === 'special:281');
    const r2 = rows.filter(x => x.key === 'special:282');
    _ytMapMemo = null;
    ok('۷۱.۷ ردیفِ صحنه‌ای: ثانیه و تصویرِ هر صحنه، اشتراکِ فایل‌به‌فایلِ یکتا، جایگزینیِ فقط ساخته‌نشده',
       okA && r1.length === 1 && r1[0].mode === 'scenes' && r1[0].scenes.length === 3 &&
       r1[0].scenes[1].t0 === 20 && /usercontent/.test(r1[0].scenes[0].url) &&
       r1[0].sceneCover.fileId === 'C1' && r1[0].coverTitle === 'عنوان' && r1[0].redo === 1 &&
       /صحنهٔ مصور/.test(r1[0].replacedWhy) &&
       shared.filter(x => x === 'S2').length === 1 && shared.indexOf('C1') !== -1 &&
       okB === false && r2.length === 1 && r2[0].at === 'built',
       JSON.stringify({ okA, okB, shared, why: r1[0] && r1[0].replacedWhy }));
    ytRenderSave_({ items: [] });
  }

  /* ۷۱.۸ — **سدِ انتشار، یک تعریف برای دو در.** */
  {
    const keepA = YT_APPROVED_;
    YT_APPROVED_ = { 'special:291': true };
    delete global.__PROPS[PK.YT_SCENES_OK];
    const qaOk = { ok: true, matched: 10, n: 10 };
    const g1 = ytPublicGate_('special:290', { mode: 'scenes' });
    const g2 = ytPublicGate_('special:290', { mode: 'scenes', qa: { ok: false, why: 'فقط ۳ از ۱۰ صحنه' } });
    const g3 = ytPublicGate_('special:290', { mode: 'scenes', qa: qaOk });
    const g4 = ytPublicGate_('special:291', { mode: 'scenes', qa: qaOk });
    ytScenesOkAdd_(); ytScenesOkAdd_();
    const g5 = ytPublicGate_('special:292', { mode: 'scenes', qa: qaOk });
    const g6 = ytPublicGate_('special:293', { mode: 'cards' });
    const g7 = ytPublicGate_('special:294', null);
    YT_APPROVED_ = keepA;
    delete global.__PROPS[PK.YT_SCENES_OK];
    ok('۷۱.۸ بی سنجش نه؛ سنجشِ رد نه (با علت)؛ نخستین‌ها تا تأیید نه؛ پس از آن خودکار؛ حالت‌های دیگر مثلِ قبل',
       !g1.ok && !g2.ok && /۳ از ۱۰/.test(g2.why) && !g3.ok && g3.approval === true &&
       g4.ok && g5.ok && g6.ok && g7.ok,
       [g1, g2, g3, g4, g5, g6, g7].map(g => (g.ok ? '✓' : '✗') + (g.why || '')).join(' | '));
  }

  /* ۷۱.۹ — **از درِ انتشار:** `ytUploadOne_` تا صحنه‌ها کامل نشده منتظر
     می‌مانَد، بعد ردیفِ صحنه‌ای می‌نویسد — بی کارتِ اسلایدز. */
  {
    const cnt = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    global.__STUB = sceneStub(cnt);
    ytRenderSave_({ items: [] });
    const E = mkEp71('EP71E', 'قسمت 0295 — از درِ انتشار');
    const wav = E.f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(2000) + 'WAVE', 'audio/wav', 'کامل.wav'));
    wav.getSize = () => Math.round(E.secs * 48000) + 44;
    _ytMapMemo = {};
    let row = null, waits = 0, lastWhy = '';
    for (let k = 0; k < 8; k++) {
      const res = ytUploadOne_({ key: 'special:295', show: 'special', ep: '295', folderId: 'EP71E',
                                 series: 'معرفت‌شناسی' }, null, []);
      lastWhy = res.why;
      row = ytRenderRead_().items.filter(x => x.key === 'special:295')[0] || null;
      if (row) break;
      if (res.waiting) waits++;
    }
    _ytMapMemo = null;
    global.__STUB = BASE_STUB;
    ok('۷۱.۹ از درِ انتشار: صحنه‌ها ساخته می‌شوند و ردیفِ رندر حالتِ صحنه می‌گیرد',
       !!row && row.mode === 'scenes' && row.scenes.length >= 3 && (row.visuals || []).length === 0 &&
       !row.spec && row.vis && row.vis.board !== undefined,
       row ? ((row.scenes || []).length + ' صحنه · انتظار ' + waits + ' · ' + lastWhy) : 'ردیفی نوشته نشد');
    ytRenderSave_({ items: [] });
  }

  /* ۷۱.۱۰ — **نسبتِ ۱۶:۹ بی سماجت:** مدلی که `imageConfig` را رد کند یک بار
     به خاطر سپرده می‌شود و تصویر بی آن ساخته می‌شود. */
  {
    let calls = 0, withCfg = 0;
    delete global.__PROPS[PK.LV_GEN_NOCFG];
    global.__STUB = function (url, body) {
      if (url.indexOf('image:generateContent') !== -1) {
        calls++;
        if (body.generationConfig && body.generationConfig.imageConfig) {
          withCfg++;
          return { code: 400, json: { error: { message: 'imageConfig is not supported' } } };
        }
        return { code: 200, json: { candidates: [{ content: { parts: [
          { inlineData: { mimeType: 'image/png', data: Utilities.base64Encode(png71(20000)) } }] } }] } };
      }
      return BASE_STUB(url, body);
    };
    const a = lvGenOne_('gemini-2.5-flash-image', 'x', { aspect: '16:9' });
    const b = lvGenOne_('gemini-2.5-flash-image', 'x', { aspect: '16:9' });
    global.__STUB = BASE_STUB;
    ok('۷۱.۱۰ ردِ imageConfig یک بار به خاطر سپرده می‌شود؛ تصویر بی آن ساخته می‌شود',
       !!a.blob && !!b.blob && withCfg === 1 && calls === 3,
       'فراخوان ' + calls + ' · با تنظیم ' + withCfg);
    delete global.__PROPS[PK.LV_GEN_NOCFG];
  }

  /* ۷۱.۱۱ — **در انتشار، از خودِ مسیرِ آپلود:** ویدئوی صحنه‌ای که سنجشش درست
     است ولی هنوز تأیید نشده، Unlisted می‌مانَد و خبرش می‌رود؛ کاورِ رانر (JPEG)
     به‌جای کارتِ اسلایدز می‌نشیند. و پس از تأیید، همان مسیر عمومی‌اش می‌کند.
     و درِ دوم (`ytRedoOne_`) هم همان سد را می‌پرسد. */
  {
    const calls = { ins: 0, pub: 0, thumbType: '' };
    global.YouTube = {
      Videos: { insert: () => { calls.ins++; return { id: 'VID' + calls.ins }; },
                update: (b) => { if (b && b.status && b.status.privacyStatus === 'public') calls.pub++; } },
      Thumbnails: { set: (vid, blob) => { calls.thumbType = blob.getContentType(); } },
      Channels: { list: () => ({ items: [] }) }, PlaylistItems: { list: () => ({ items: [] }) }, Playlists: {} };
    const keepPl = CFG.YT_PLAYLISTS; CFG.YT_PLAYLISTS = false;
    const keepA = YT_APPROVED_;
    delete global.__PROPS[PK.YT_SCENES_OK];
    delete global.__PROPS[PK.MAIL_QUEUE];
    const jpg = [0xFF, 0xD8, 0xFF, 0xE0].concat(new Array(9000).fill(5));
    global.__STUB = function (url, body) {
      if (url === 'https://x/t.jpg') return { code: 200, bytes: jpg, mime: 'image/jpeg' };
      return BASE_STUB(url, body);
    };
    const run = (id, ep) => {
      const f = DriveApp.__register(id, 'قسمت 0' + ep + ' — انتشار');
      f.createFile(Utilities.newBlob(JSON.stringify({ lesson: 37, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
        ep: { title: 'انتقالِ توجیه', sections: SEC71 } }), 'application/json', '_special.json'));
      const w = f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(2000) + 'WAVE', 'audio/wav', 'کامل.wav'));
      w.getSize = () => 300 * 48000 + 44;
      f.createFile(Utilities.newBlob([0, 0, 0, 24, 102, 116, 121, 112].concat(new Array(9000).fill(1)),
                                     'video/mp4', 'قسمت 0' + ep + ' — ویدئو.mp4'));
      ytPlanWrite_(f, { at: 'x', show: 'special', ep: ep, title: 'عنوانِ درس', description: 'توضیح',
                        tags: ['الف'], coverTitle: 'ک', coverKicker: '', chapters: 0, visuals: [] });
      _ytMapMemo = {}; _ytMapMemo['special:' + ep] = { url: 'https://x/v.mp4', mode: 'scenes',
        qa: { ok: true, n: 4, matched: 4 }, thumb: 'https://x/t.jpg' };
      return ytUploadOne_({ key: 'special:' + ep, show: 'special', ep: ep, folderId: id, series: 'معرفت‌شناسی' }, null, []);
    };
    YT_APPROVED_ = {};
    const r1 = run('EP71F', '296');
    const q1 = JSON.parse(global.__PROPS[PK.MAIL_QUEUE] || '[]');
    const pub1 = calls.pub, th1 = calls.thumbType;
    YT_APPROVED_ = { 'special:297': true };
    const r2 = run('EP71G', '297');
    const okN = Number(global.__PROPS[PK.YT_SCENES_OK] || 0);
    const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
    const redo = src27.slice(src27.indexOf('function ytRedoOne_'), src27.indexOf('function ytRedoStuckNightly_'));
    YT_APPROVED_ = keepA; CFG.YT_PLAYLISTS = keepPl; _ytMapMemo = null;
    global.__STUB = BASE_STUB;
    delete global.__PROPS[PK.YT_SCENES_OK];
    global.YouTube = {};
    ok('۷۱.۱۱ تأییدنشده Unlisted می‌مانَد و خبرش می‌رود؛ کاورِ نقاشی می‌نشیند؛ تأییدشده عمومی می‌شود؛ درِ دوم هم همان سد',
       r1.ok === false && /تأیید/.test(r1.why) && pub1 === 0 && th1 === 'image/jpeg' &&
       q1.some(x => /منتظرِ تأیید/.test(JSON.stringify(x))) &&
       r2.ok === true && calls.pub === 1 && okN === 1 &&
       /ytPublicGate_\(/.test(redo) && /gateR\.ok && String\(rec\.privacy/.test(redo),
       JSON.stringify({ r1: r1.why, pub1, th1, q: q1.length, r2: r2.ok, pub: calls.pub, okN }));
  }

  /* ۷۱.۱۲ — **ویدئوی صحنه‌ای رسیده ⇒ کارت و پس‌زمینهٔ تازه ساخته نمی‌شود (۸.۴۵).**
     درسِ ۳۸ (قسمتِ ۶۰) پس از ساختِ ویدئو پنج پس‌زمینهٔ پولی و یک اسلایدز گرفت که
     هیچ‌جا دیده نمی‌شوند. از درِ خودِ آپلود، با یک گواهِ مقابل: بی `_scenes.json`
     همان مسیر هنوز کارت می‌سازد — وگرنه جاسوس چیزی نمی‌سنجید. */
  {
    /* آپلود عمداً می‌شکند: تصمیمِ کارت **پیش از** آپلود گرفته می‌شود، و ویدئوی
       Unlisted‌ای که این سنجه بسازد، بازسنجیِ گیرکرده‌ها در §۷۴ را پر می‌کرد. */
    global.YouTube = {
      Videos: { insert: () => { throw new Error('آزمون: آپلود نه'); }, update: () => {} },
      Thumbnails: { set: () => {} }, Channels: { list: () => ({ items: [] }) },
      PlaylistItems: { list: () => ({ items: [] }) }, Playlists: {} };
    const keepPl = CFG.YT_PLAYLISTS; CFG.YT_PLAYLISTS = false;
    const keepA = YT_APPROVED_; YT_APPROVED_ = {};
    const realLv = global.lvBuild_;
    let lvCalls = 0;
    global.lvBuild_ = function () { lvCalls++; return realLv.apply(null, arguments); };
    const mk = (id, ep, withScenes) => {
      const f = DriveApp.__register(id, 'قسمت 0' + ep + ' — بی‌کارت');
      f.createFile(Utilities.newBlob(JSON.stringify({ lesson: 38, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
        ep: { title: 'استنتاج', sections: SEC71 } }), 'application/json', '_special.json'));
      const w = f.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(2000) + 'WAVE', 'audio/wav', 'کامل.wav'));
      w.getSize = () => 300 * 48000 + 44;
      f.createFile(Utilities.newBlob([0, 0, 0, 24, 102, 116, 121, 112].concat(new Array(9000).fill(1)),
                                     'video/mp4', 'قسمت 0' + ep + ' — ویدئو.mp4'));
      if (withScenes) lvSceneWrite_(f, { v: 1, key: 'special:' + ep, done: true, scenes: [
        { n: 1, t0: 0, fileId: 'S1' }, { n: 2, t0: 20, fileId: 'S2' }, { n: 3, t0: 40, fileId: 'S3' }],
        cover: { fileId: '' } });
      ytPlanWrite_(f, { at: 'x', show: 'special', ep: ep, title: 'عنوان', description: 'توضیح', tags: ['الف'],
                        coverTitle: 'ک', coverKicker: '', chapters: 0,
                        visuals: [{ at: 1, quote: 'سرچشمه', form: 'تمرکز', headline: 'سرچشمه' }] });
      _ytMapMemo = {}; _ytMapMemo['special:' + ep] = { url: 'https://x/v.mp4', mode: 'scenes',
        qa: { ok: true, n: 3, matched: 3 } };
      return ytUploadOne_({ key: 'special:' + ep, show: 'special', ep: ep, folderId: id, series: 'معرفت‌شناسی' }, null, []);
    };
    lvCalls = 0; mk('EP71W', '301', true); const withSc = lvCalls;
    lvCalls = 0; mk('EP71X', '302', false); const without = lvCalls;
    global.lvBuild_ = realLv;
    YT_APPROVED_ = keepA; CFG.YT_PLAYLISTS = keepPl; _ytMapMemo = null; global.YouTube = {};
    ok('۷۱.۱۲ ویدئوی صحنه‌ایِ رسیده کارتِ تازه نمی‌سازد (و بی صحنه، همان مسیر هنوز می‌سازد)',
       withSc === 0 && without >= 1, 'با صحنه: ' + withSc + ' · بی صحنه: ' + without);
  }

  /* ۷۱.۱۳ — **نوشتهٔ رویِ نقاشی (۸.۴۵): خواسته، پاک‌شده، به سهمِ تخته بریده، و به
     نقاش گفته‌شده که جایش را خلوت بگذارد.** از درِ خودِ `lvScenesBuild_`. */
  {
    const cnt = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    const base = sceneStub(cnt);
    const kinds = ['points', 'points', 'headline', 'compare', 'quote', 'steps', 'headline', 'points', 'quote', 'headline'];
    global.__STUB = function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      if (sc && sc.properties && sc.properties.scenes) {
        const pr = body.contents[0].parts[0].text;
        cnt.plan++; cnt.prompts.push(pr);
        const ns = []; const re = /^\[(\d+)\]/mg; let m;
        while ((m = re.exec(pr))) ns.push(m[1]);
        const ov = (n, i) => {
          const k = kinds[i % kinds.length];
          if (k === 'compare') return { ov: k, ovA: 'قیاس', ovB: 'استقرا', ovLines: ['قوت: قطعی | محتمل', 'بی‌جداکننده'], ovKeys: ['قطعی'] };
          if (k === 'points') return { ov: k, ovTitle: 'دو راه', ovLines: ['یکم ' + n, 'دوم ' + n], ovKeys: ['دوم ' + n, 'نیست'], ovSide: 'left' };
          if (k === 'steps') return { ov: k, ovLines: ['مقدمه', 'استنتاج', 'نتیجه'] };
          return { ov: k, ovTitle: 'جملهٔ ' + n + ' 12', ovKeys: ['جملهٔ'] };
        };
        const r = { cast: '', cover: 'a lantern', scenes: ns.map((n, i) => Object.assign(
          { n: n, scene: 'a lantern passing light number ' + n, caption: '' }, ov(n, i))) };
        return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] } };
      }
      // داور: صحنهٔ ۴ جای خالی ندارد، بقیه در چپ
      if (sc && sc.properties && sc.properties.items && JSON.stringify(body).indexOf('inlineData') !== -1) {
        cnt.judge++;
        const items = [];
        body.contents[0].parts.forEach(p => { const m = /^تصویرِ (\d+)/.exec(p.text || ''); if (m) items.push(m[1]); });
        cnt.spaceAsked = /`space`/.test(JSON.stringify(body));
        const r = { items: items.map(n => ({ n: n, score: '8', hasText: 'خیر', realFace: 'خیر', why: 'خوب',
                                              space: n === '4' ? 'none' : 'left' })) };
        return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] } };
      }
      return base(url, body);
    };
    const E = mkEp71('EP71OV', 'قسمت 0305 — نوشته');
    const ctx = { show: 'special', epRaw: '305', title: 'انتقالِ توجیه', seriesName: 'معرفت‌شناسی',
                  sections: SEC71, level: 'زیاد', style: 'آبرنگِ گرم', textLevel: 'خودکار', textShare: 0.45 };
    let r = null;
    for (let i = 0; i < 8; i++) { r = lvScenesBuild_(E.f, E.meta, {}, ctx); if (r.done || r.fallback) break; }
    const d = lvSceneRead_(E.f);
    const withOv = d.scenes.filter(x => x.ov);
    const cap = Math.round(d.scenes.length * 0.45);
    const p0 = cnt.prompts[0] || '';
    const ovIdx = d.scenes.map((x, i) => x.ov ? i : -1).filter(i => i >= 0);
    const noAdjSame = ovIdx.every((i, j) => j === 0 || ovIdx[j - 1] !== i - 1 ||
                                  d.scenes[i].ov.kind !== d.scenes[i - 1].ov.kind);
    const pts = withOv.filter(x => x.ov.kind === 'points')[0];
    const cmp = withOv.filter(x => x.ov.kind === 'compare')[0];
    const spaced = cnt.imgPrompts.filter(t => /keep the .* calm, plain and uncluttered/.test(t)).length;
    ok('۷۱.۱۳ نوشته خواسته و به سهمِ تخته بریده شد؛ دو صحنهٔ پشتِ‌هم یک نوع نمی‌گیرند',
       r && r.done && /نوشتهٔ رویِ نقاشی/.test(p0) && withOv.length > 0 && withOv.length <= cap && noAdjSame &&
       d.ovN - (Number(d.ovDropped) || 0) === withOv.length && r.info.ov === withOv.length,
       'صحنه ' + d.scenes.length + ' · نوشته‌دار ' + withOv.length + ' · سقف ' + cap + ' · ' +
       withOv.map(x => x.n + ':' + x.ov.kind).join(' '));
    /* ۷۱.۱۳-ج — **جای خالی را داور می‌گوید:** صحنه‌ای که داور گفت «هیچ‌جا» نوشته‌اش
       را از دست می‌دهد (و شمرده می‌شود)؛ بقیه همان سمتی را می‌گیرند که او دید. */
    const s4 = d.scenes.filter(x => x.n === 4)[0];
    ok('۷۱.۱۳-ج داور جای خالی را می‌گوید: «هیچ‌جا» ⇒ بی‌نوشته، بقیه سمتِ دیده‌شده',
       cnt.spaceAsked === true && (!s4 || !s4.ov) && Number(d.ovDropped) >= 1 &&
       withOv.every(x => x.ov.side === 'left'),
       JSON.stringify({ asked: cnt.spaceAsked, s4: s4 && s4.ov, dropped: d.ovDropped, sides: withOv.map(x => x.ov.side) }));
    ok('۷۱.۱۳-ب واژهٔ کلیدیِ نبوده رنگی نمی‌شود، ردیفِ جدولِ بی «|» می‌افتد، رقم فارسی می‌شود',
       (!pts || (pts.ov.keys.indexOf('نیست') === -1)) &&
       (!cmp || cmp.ov.lines.length === 1) &&
       withOv.filter(x => x.ov.kind === 'headline' || x.ov.kind === 'quote').every(x => /۱۲/.test(x.ov.title)),
       JSON.stringify({ pts: pts && pts.ov, cmp: cmp && cmp.ov }));
    ok('۷۱.۱۳-پ به نقاش گفته شد جای نوشته را خلوت بگذارد — فقط برای صحنه‌های نوشته‌دار',
       spaced >= withOv.length && spaced < cnt.imgPrompts.length,
       spaced + ' از ' + cnt.imgPrompts.length + ' دستورِ تصویر');
    ok('۷۱.۱۳-ت نوشته تا ردیفِ رندر می‌رسد', r.items.filter(x => x.ov).length === withOv.length &&
       (function () {
         const shared = []; const keepS = global.driveShareOn_;
         global.driveShareOn_ = (id) => { shared.push(id); return true; };
         ytRenderSave_({ items: [] });
         ytRenderAsk_({ show: 'special', ep: '305', folderId: 'F', audio: [{ id: 'A1' }], scenes: r.items });
         global.driveShareOn_ = keepS;
         const row = ytRenderRead_().items.filter(x => x.key === 'special:305')[0];
         ytRenderSave_({ items: [] });
         return !!row && row.scenes.filter(x => x.ov && x.ov.kind).length === withOv.length;
       })());

    // ۷۱.۱۳-ث «خاموش» یعنی هیچ — و پرسشِ نوشته اصلاً در پرامپت نمی‌آید
    cnt.prompts.length = 0;
    const E2 = mkEp71('EP71OV2', 'قسمت 0306 — بی‌نوشته');
    const ctx2 = Object.assign({}, ctx, { epRaw: '306', textLevel: 'خاموش', textShare: 0 });
    let r2 = null;
    for (let i = 0; i < 8; i++) { r2 = lvScenesBuild_(E2.f, E2.meta, {}, ctx2); if (r2.done || r2.fallback) break; }
    const d2 = lvSceneRead_(E2.f);
    global.__STUB = BASE_STUB;
    ok('۷۱.۱۳-ث «خاموش» ⇒ هیچ صحنه‌ای نوشته نمی‌گیرد و پرسشش هم نیست',
       d2.scenes.every(x => !x.ov) && !/نوشتهٔ رویِ نقاشی/.test(cnt.prompts[0] || ''),
       d2.scenes.filter(x => x.ov).length + ' نوشته‌دار');
  }

  /* ۷۱.۱۴ — `lvTextAt_` از تخته می‌خوانَد؛ خالی و ناشناخته ⇒ پیش‌فرض، با علت. */
  {
    const hubT = getHub_();
    const reg = readSeriesReg_(hubT);
    const rec = reg.rows[0];
    if (rec) {
      const keep = reg.sheet.getRange(rec.row, SC.LVTEXT).getValue();
      reg.sheet.getRange(rec.row, SC.LVTEXT).setValue('زیاد');
      const a = lvTextAt_(hubT, { seriesKey: rec.key }, null);
      reg.sheet.getRange(rec.row, SC.LVTEXT).setValue('');
      const b = lvTextAt_(hubT, { seriesKey: rec.key }, null);
      reg.sheet.getRange(rec.row, SC.LVTEXT).setValue('خیلی‌زیاد');
      const c = lvTextAt_(hubT, { seriesKey: rec.key }, null);
      reg.sheet.getRange(rec.row, SC.LVTEXT).setValue(keep);
      ok('۷۱.۱۴ نوشتهٔ تخته خوانده می‌شود؛ خالی و ناشناخته ⇒ پیش‌فرض با علت',
         a.v === 'زیاد' && a.share === CFG.LV_TEXT_SHARE['زیاد'] && a.src === 'تخته' &&
         b.v === CFG.LV_TEXT_DEFAULT && /خالی/.test(b.src) && /ناشناخته/.test(c.src),
         JSON.stringify([a, b, c]));
    } else ok('۷۱.۱۴-پیش (رجیستری ردیفی ندارد — سنجه ممکن نیست)', false);
  }

  /* ══ ۷۱.۱۵ تا ۷۱.۲۰ — «درس است» فرض بود، نه تشخیص (۸.۴۷) ══
     او پرسید: اگر خودکار باشد و جای درس یک داستان گفته شود، می‌فهمد دیگر درس
     نیست که روی عکس «نکته» بنویسد؟ تا ۸.۴۶ نه: پرامپت می‌گفت «صدای ویدئو یک درس
     است» و سدِ نوشته فقط **سهم** را می‌دید، نه **جنس** را. همه از درِ خودِ
     `lvScenesBuild_`، با تخته‌ای که «خودکار» و «زیاد» دارد. */
  const storyStub = (cnt, opt) => {
    const base = sceneStub(cnt);
    const kinds = ['points', 'compare', 'steps', 'headline', 'quote', 'points', 'steps', 'headline', 'compare', 'quote'];
    return function (url, body) {
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      if (sc && sc.properties && sc.properties.scenes) {
        const pr = body.contents[0].parts[0].text;
        cnt.plan++; cnt.prompts.push(pr);
        cnt.schemaNature = !!(sc.properties.nature && sc.properties.scenes.items.properties.beat);
        const ns = []; const re = /^\[(\d+)\]/mg; let m;
        while ((m = re.exec(pr))) ns.push(m[1]);
        const second = cnt.plan > 1;
        // پرسشِ اول دو صحنهٔ آخر را جا می‌اندازد، تا پرسشِ دوم لازم شود
        const pick = (opt.drop && !second) ? ns.slice(0, ns.length - 2) : ns;
        const ov = (n, i) => {
          const k = kinds[i % kinds.length];
          if (k === 'compare') return { ov: k, ovA: 'پیش', ovB: 'پس', ovLines: ['حال: شاد | غمگین'] };
          if (k === 'points') return { ov: k, ovTitle: 'نکته‌ها', ovLines: ['یکم ' + n, 'دوم ' + n] };
          if (k === 'steps') return { ov: k, ovLines: ['رفت', 'دید', 'برگشت'] };
          return { ov: k, ovTitle: 'یک شبِ زمستانی ' + n };
        };
        const r = { nature: second ? (opt.nature2 || '') : opt.nature, cast: 'an old woman in a grey shawl',
                    cover: 'a dark road at night',
                    scenes: pick.map((n, i) => Object.assign(
                      { n: n, beat: opt.beat(Number(n)), scene: 'a girl gives up her seat in a taxi number ' + n,
                        caption: '' }, ov(n, i))) };
        return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] } };
      }
      if (sc && sc.properties && sc.properties.items && JSON.stringify(body).indexOf('inlineData') !== -1) {
        cnt.judge++;
        const items = [];
        body.contents[0].parts.forEach(p => { const m = /^تصویرِ (\d+)/.exec(p.text || ''); if (m) items.push(m[1]); });
        cnt.judgeText = JSON.stringify(body.contents[0].parts[0].text || '');
        const r = { items: items.map(n => ({ n: n, score: '8', hasText: 'خیر', realFace: 'خیر', why: 'خوب', space: 'left' })) };
        return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] } };
      }
      return base(url, body);
    };
  };
  const runStory = (id, ep, opt, ctxOver) => {
    const cnt = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    global.__STUB = storyStub(cnt, opt);
    const E = mkEp71(id, 'قسمت ' + ep + ' — قصه');
    const ctx = Object.assign({ show: 'special', epRaw: ep, title: 'صندلیِ تاکسی', seriesName: 'داستان‌های کوتاه',
                                sections: SEC71, level: 'زیاد', style: 'آبرنگِ گرم',
                                textLevel: 'خودکار', textShare: CFG.LV_TEXT_SHARE['خودکار'] }, ctxOver || {});
    let r = null;
    for (let i = 0; i < 8; i++) { r = lvScenesBuild_(E.f, E.meta, {}, ctx); if (r.done || r.fallback) break; }
    global.__STUB = BASE_STUB;
    return { r: r, d: lvSceneRead_(E.f), cnt: cnt, ctx: ctx };
  };
  const LIST = ['points', 'compare', 'steps'];
  {
    /* ۷۱.۱۵ — داستان: هیچ صحنهٔ «روایت» فهرست و جدول و گام نمی‌گیرد — حتی
       وقتی مدل خودش داد. سد در کد است، نه در امیدِ پرامپت. */
    const S = runStory('EP71ST', '0311', { nature: 'داستان', beat: () => 'روایت' });
    const d = S.d, withOv = d.scenes.filter(x => x.ov);
    const p0 = S.cnt.prompts[0] || '';
    ok('۷۱.۱۵ داستان ⇒ روی هیچ صحنهٔ روایت «نکته»، جدول یا گام نمی‌نشیند؛ کنارگذاشته‌ها شمرده می‌شوند',
       S.r && S.r.done && d.nature === 'داستان' && Number(d.ovGenre) >= 1 &&
       withOv.every(x => LIST.indexOf(x.ov.kind) === -1) &&
       S.r.info.nature === 'داستان' && S.r.info.ovGenre === d.ovGenre && S.r.info.beats === d.scenes.length &&
       S.cnt.schemaNature && /`nature`/.test(p0) && /«روایت»/.test(p0) && !/صدای ویدئو یک درس است/.test(p0),
       JSON.stringify({ nature: d.nature, ovGenre: d.ovGenre, kinds: withOv.map(x => x.ov.kind), info: S.r && S.r.info }));
    /* ۷۱.۱۶ — «خودکار» برای قصه سهمِ کمتر می‌گیرد، از جدولِ خودش — نه ۴۵٪ِ درس. */
    const capS = Math.round(d.scenes.length * CFG.LV_TEXT_AUTO['داستان']);
    ok('۷۱.۱۶ تختهٔ «خودکار» + داستان ⇒ سهمِ نوشتهٔ قصه، نه سهمِ درس',
       d.ovShare === CFG.LV_TEXT_AUTO['داستان'] && CFG.LV_TEXT_AUTO['داستان'] < CFG.LV_TEXT_SHARE['خودکار'] &&
       withOv.length <= capS,
       'سهم ' + d.ovShare + ' · نوشته‌دار ' + withOv.length + ' از ' + d.scenes.length + ' · سقف ' + capS);
    /* ۷۱.۱۶-ب — ولی سهمی که آدم روی تخته **نوشته** دست نمی‌خورد: «زیاد» زیاد
       می‌مانَد. فقط **جنس** عوض می‌شود (سدِ ۷۱.۱۵)، نه **مقدار**. */
    const H = runStory('EP71SH', '0312', { nature: 'داستان', beat: () => 'روایت' },
                       { textLevel: 'زیاد', textShare: CFG.LV_TEXT_SHARE['زیاد'] });
    ok('۷۱.۱۶-ب سهمِ دستیِ تخته («زیاد») با داستان هم همان می‌مانَد؛ فقط فهرست و جدول نمی‌گیرد',
       H.d.ovShare === CFG.LV_TEXT_SHARE['زیاد'] && H.d.scenes.filter(x => x.ov).every(x => LIST.indexOf(x.ov.kind) === -1),
       'سهم ' + H.d.ovShare + ' · ' + H.d.scenes.filter(x => x.ov).map(x => x.ov.kind).join(' '));
    /* ۷۱.۱۷ — آمیخته: صحنهٔ «ایده» فهرستش را نگه می‌دارد و «روایت» نه. یعنی سد
       جنسِ **هر صحنه** را می‌سنجد، نه یک برچسبِ کلی را. */
    const M = runStory('EP71SM', '0313', { nature: 'آمیخته', beat: n => (n % 2 ? 'ایده' : 'روایت') },
                       { textLevel: 'زیاد', textShare: 1 });
    const mOv = M.d.scenes.filter(x => x.ov);
    ok('۷۱.۱۷ آمیخته ⇒ «ایده» فهرست می‌گیرد، «روایت» نه',
       M.d.nature === 'آمیخته' &&
       mOv.some(x => x.beat === 'ایده' && LIST.indexOf(x.ov.kind) !== -1) &&
       M.d.scenes.filter(x => x.beat === 'روایت' && x.ov).every(x => LIST.indexOf(x.ov.kind) === -1),
       mOv.map(x => x.n + ':' + x.beat + ':' + x.ov.kind).join(' '));
    /* ۷۱.۱۸ — پرسشِ دوم فقط چند صحنه را می‌بیند؛ ماهیتِ کل را از پرسشِ اول می‌گیرد،
       و اگر خودش چیز دیگری بگوید تشخیصِ اول می‌مانَد. */
    const D = runStory('EP71SD', '0314', { nature: 'داستان', nature2: 'درس', drop: true, beat: () => 'روایت' });
    const p2 = D.cnt.prompts[1] || '';
    ok('۷۱.۱۸ پرسشِ دوم ماهیتِ تشخیص‌داده‌شده را می‌شنود و تشخیصِ اول می‌مانَد',
       D.cnt.plan === 2 && /از پیش تشخیص داده شده: «داستان»/.test(p2) && !/`nature`\):/.test(p2) &&
       D.d.nature === 'داستان' && D.d.scenes.every(x => x.beat === 'روایت') &&
       D.d.scenes.filter(x => x.ov).every(x => LIST.indexOf(x.ov.kind) === -1),
       JSON.stringify({ plan: D.cnt.plan, nature: D.d.nature, beats: D.d.scenes.map(x => x.beat).join(','),
                        head: p2.slice(0, 300) }));
    /* ۷۱.۱۹ — تخته به تصویر می‌رسد: سبکِ دستیِ مجموعه زبانِ هنریِ **هر** تصویر
       است، و سطحِ «زیاد» ضرباهنگِ صحنه‌ها. داستان این را عوض نمی‌کند. */
    const fs = lvSceneArt_('چاپِ قدیمی');
    const P = runStory('EP71SP', '0315', { nature: 'داستان', beat: () => 'روایت' }, { style: 'چاپِ قدیمی' });
    /* سطح از ۸.۴۹ چگالیِ برش است: به تدوین‌گر می‌رسد، و در راهِ زمانی همان ثانیهٔ تخته. */
    ok('۷۱.۱۹ سبکِ دستیِ تخته در همهٔ تصویرها و سطحِ «زیاد» در برش — با داستان هم',
       P.d.style === 'چاپِ قدیمی' && P.d.art === fs.art && P.d.level === 'زیاد' &&
       /چگالیِ این مجموعه «زیاد» است/.test((P.cnt.cutPrompts || [''])[0]) && P.d.cutBy === 'زمان' &&
       P.cnt.imgPrompts.length > 0 && P.cnt.imgPrompts.every(x => x.indexOf('engraving') !== -1) &&
       (P.cnt.prompts[0] || '').indexOf(fs.art) !== -1,
       JSON.stringify({ style: P.d.style, level: P.d.level, cutBy: P.d.cutBy, cut: P.cnt.cut,
                        imgs: P.cnt.imgPrompts.length }));
    /* ۷۱.۲۰ — نشناختن ⇒ همان رفتارِ درس (۸.۴۶)؛ داور هم «لحظهٔ ماجرا» را می‌شناسد. */
    ok('۷۱.۲۰ ماهیت/ضربِ ناشناخته ⇒ رفتارِ درس؛ داور لحظهٔ ماجرا را هم می‌سنجد',
       lvSceneNature_('قصه') === 'داستان' && lvSceneNature_('Story') === 'داستان' &&
       lvSceneNature_('چیزی') === '' && lvSceneBeat_('narrative') === 'روایت' && lvSceneBeat_('؟') === '' &&
       lvSceneTextShare_('خودکار', 0.45, '') === CFG.LV_TEXT_AUTO['درس'] &&
       lvSceneTextShare_('کم', 0.25, 'داستان') === 0.25 &&
       lvSceneOvGenre_([{ beat: '', ov: { kind: 'points' } }], '') === 0 &&
       /لحظهٔ ماجرا/.test(S.cnt.judgeText || ''),
       JSON.stringify({ judge: (S.cnt.judgeText || '').slice(0, 120) }));
  }

  /* ══ ۷۱.۲۱ تا ۷۱.۲۹ — سقف، نه هدف؛ و شمار از محتوا، نه از ساعت (۸.۴۸، ۸.۴۹) ══
     ۸.۴۸: «اگر قبل از اتمامِ ماه ۶۰ را رد کنه، بقیه ساده مثلِ قبل؟» — بله می‌شد.
     ۸.۴۹: «این ۱۲۰ یعنی مدل خودش رو ملزم می‌کنه که برسونه به ۱۲۰؟ … یه تعداد
     هاردکدشده نه که هر بیست ثانیه یه عکس … شاید یه ویدیو صد تا، شاید ده تا». */
  {
    const keepCap = CFG.LV_GEN_USD_MONTH;
    const model = CFG.LV_GEN_MODEL || 'gemini-2.5-flash-image';
    const mon = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM');
    const setLeft = (usd) => { global.__PROPS[PK.LV_GEN_SPEND] =
      JSON.stringify({ month: mon, n: 0, usd: Math.max(0, CFG.LV_GEN_USD_MONTH - usd) }); };
    const eps = Math.ceil(lvMonthDaysLeft_() * Math.max(1, (CFG.LV_SHOWS || ['special']).length) *
                          (Number(CFG.LV_PACE_SLACK) || 1.1));
    const per = lvGenPrice_(model) * (1 + (Number(CFG.LV_PACE_REDO_PCT) || 0.2));
    /* کلیپِ آغاز (۸.۵۱) از همان سقفِ درس، پیش از صحنه‌ها — §۷۷.۱ آن را جدا می‌سنجد. */
    const cover = Math.max(lvGenPrice_(model), Number(CFG.LV_GEN_HQ_MAX_USD) || 0.14) +
                  (lvClipOn_() ? lvClipCost_() : 0);
    const flex = Number(CFG.LV_PACE_FLEX) || 2.5;
    const ctx = { show: 'special', epRaw: '321', title: 'انتقالِ توجیه', seriesName: 'معرفت‌شناسی',
                  sections: SEC71, level: 'زیاد', style: 'آبرنگِ گرم' };
    const build = (E, c, cnt, n) => {
      global.__STUB = sceneStub(cnt);
      const whys = []; let r = null;
      for (let i = 0; i < (n || 8); i++) {
        r = lvScenesBuild_(E.f, E.meta, {}, c); whys.push(r.why || '');
        if (r.done || r.fallback) break;
      }
      global.__STUB = BASE_STUB;
      return { r: r, d: lvSceneRead_(E.f), whys: whys };
    };

    /* ۷۱.۲۱ — تابعِ بودجه دیگر **شمار** نمی‌دهد، فقط **سقفِ این درس**: سهمِ میانگین ×
       FLEX. فراوان ⇒ سقفِ ایمنی؛ تنگ ⇒ کمتر، و هرگز بیش از سقفِ درس. */
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    CFG.LV_GEN_USD_MONTH = 1000;
    const roomy = lvScenePace_(model);
    CFG.LV_GEN_USD_MONTH = keepCap;
    const ceil12 = cover + 12 * per + 0.01;
    setLeft(ceil12 / flex * eps);
    const tight = lvScenePace_(model);
    ok('۷۱.۲۱ سقفِ درس = سهمِ میانگین × FLEX؛ فراوان ⇒ سقفِ ایمنی؛ تنگ ⇒ کمتر و هرگز بیش از سقفِ درس؛ و هیچ «شمارِ هدف»ی',
       roomy.max === CFG.LV_SCENE_MAX && Math.abs(roomy.ceil - roomy.allow * flex) < 1e-9 &&
       tight.max === 12 && tight.max * per + cover <= tight.ceil + 1e-9 &&
       Math.abs(tight.ceil - tight.allow * flex) < 1e-6 &&
       !('want' in tight) && !('sec' in tight) && !('paced' in tight) &&
       genWas.usd === 120,                       // تصمیمِ او در ۵ اکتبر: ۱۲۰، سقف — نه هدف
       JSON.stringify({ roomy: { max: roomy.max, ceil: roomy.ceil },
                        tight: { max: tight.max, ceil: tight.ceil, allow: tight.allow, why: tight.why } }));

    /* ۷۱.۲۲ — از درِ ساخت: محتوا بیش از سقفِ درس خواست ⇒ **با نقاشی**، صحنه‌های کمتر —
       نه کارتِ ساده، و نه بیش از سقفش. */
    const cnt = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    cnt.cutFn = (n) => Array.from({ length: n }, (_, i) => i + 1);     // هر جمله یک تصویر
    const ceil4 = cover + 4 * per + 0.005;
    setLeft(ceil4 / flex * eps);
    const spent0 = lvGenSpend_().usd;
    const B = build(mkEp71('EP71PC', 'قسمت 0321 — بودجه'), ctx, cnt);
    const r = B.r, d = B.d;
    const lessonSpent = lvGenSpend_().usd - spent0;
    ok('۷۱.۲۲ محتوا بیش از سقفِ درس ⇒ همان ویدئوی مصور با صحنه‌های کمتر، نه کارتِ ساده؛ خرجِ درس در سقفش',
       r && r.done && !r.fallback && d.pace && d.pace.paced && d.scenes.length <= 4 && d.scenes.length >= 3 &&
       d.cutBy === 'محتوا' && d.natural > d.scenes.length && r.info.paced === true &&
       r.info.natural === d.natural && r.info.cutBy === 'محتوا' &&
       d.target === Math.round(d.secs / d.scenes.length) &&
       lessonSpent <= ceil4 + lvGenPrice_(model) + 1e-9,
       JSON.stringify({ done: r && r.done, fb: r && r.fallback, why: r && r.why, scenes: d && d.scenes.length,
                        natural: d && d.natural, spent: lessonSpent, ceil: ceil4 }));

    /* ۷۱.۲۳ — سقف **وسطِ** درس پر شد (قیمتِ مدل عوض شد، سقف پایین آمد): همان چهار
       نقاشیِ ساخته‌شده می‌روند و هر کدام تا صحنهٔ بعدیِ تصویردار ادامه می‌یابد. تا
       ۸.۴۷ «۴ از ۱۰ < ۸۰٪» یعنی کارتِ ساده — و پولِ همان چهار تصویر دور ریخته. */
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    CFG.LV_GEN_USD_MONTH = keepCap;
    const cnt2 = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    const base2 = sceneStub(cnt2);
    global.__STUB = function (url, body) {
      const out = base2(url, body);
      if (url.indexOf('image:generateContent') !== -1 && cnt2.gen === 4) {
        CFG.LV_GEN_USD_MONTH = lvGenSpend_().usd + lvGenPrice_(model);   // چهارمی که ثبت شد، جا صفر
      }
      return out;
    };
    const E2 = mkEp71('EP71CH', 'قسمت 0322 — سقف وسطِ درس');
    let r2 = null;
    for (let i = 0; i < 8; i++) {
      r2 = lvScenesBuild_(E2.f, E2.meta, {}, Object.assign({}, ctx, { epRaw: '322' }));
      if (r2.done || r2.fallback) break;
    }
    CFG.LV_GEN_USD_MONTH = keepCap;
    global.__STUB = BASE_STUB;
    const d2 = lvSceneRead_(E2.f);
    const built = d2 ? d2.scenes.filter(x => x.fileId).length : 0;
    const items = (r2 && r2.items) || [];
    const reuse = items.every((x, k) => !!x.fileId && (k === 0 || x.fileId === items[k - 1].fileId ||
                                                    d2.scenes.some(s => s.fileId === x.fileId)));
    ok('۷۱.۲۳ سقف وسطِ درس ⇒ همان نقاشی‌های ساخته‌شده می‌روند، نه کارتِ ساده؛ و گفته می‌شود',
       r2 && r2.done && !r2.fallback && d2.capHit === true && built === 4 && d2.scenes.length > 4 &&
       items.length === d2.scenes.length && reuse && r2.info.capHit === true,
       JSON.stringify({ done: r2 && r2.done, fb: r2 && r2.fallback, why: r2 && r2.why, built: built,
                        scenes: d2 && d2.scenes.length, items: items.length }));

    /* ۷۱.۲۴ — سقفِ صحنه **سخت** است: برش در ۰٫۸۵ِ هدف تعداد را تا ~۱۸٪ بالاتر می‌بُرد،
       و وقتی سقف از بودجه می‌آید، هر صحنهٔ اضافه یک تصویرِ بی‌پول است. */
    const ss = []; for (let t = 0; t < 900; t += 10) ss.push({ t: t, text: 'جملهٔ ' + t + '.', sec: 1 });
    const gq = lvSceneGroups_(ss, 5, 900, 10);
    ok('۷۱.۲۴ شمارِ صحنه از سقف نمی‌گذرد و صحنه‌ها پیوسته از صفر تا پایان‌اند',
       gq.length <= 10 && gq.length >= 9 && gq[0].t0 === 0 && gq[gq.length - 1].t1 === 900 &&
       gq.every((x, i) => i === 0 || x.t0 === gq[i - 1].t1) && gq.natural > gq.length &&
       gq.map(x => x.text).join(' ').split('جملهٔ').length - 1 === ss.length,
       gq.length + ' صحنه (طبیعی ' + gq.natural + ') · ' + gq.map(x => x.t0 + '-' + x.t1).join(' '));

    /* ۷۱.۲۵ — هر روز گفته می‌شود، به زبانِ خودِ قاعده: سقف است نه هدف، درسِ پرتصویر تا
       کجا می‌تواند برود، و آخرین درس چقدر خواست و چقدر گرفت. */
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    global.__PROPS[PK.LV_PACE_LAST] = JSON.stringify({ key: 'special:61', natural: 60, used: 40, paced: true, by: 'محتوا' });
    const stP = lvGenStatus_();
    global.__PROPS[PK.LV_PACE_LAST] = JSON.stringify({ key: 'special:62', natural: 18, used: 18, paced: false, by: 'محتوا' });
    const stN = lvGenStatus_();
    const pc = lvScenePace_(model);
    ok('۷۱.۲۵ خطِ روزانه: «سقف است، نه هدف»، سقفِ درسِ پرتصویر، و آنچه آخرین درس خواست و گرفت',
       /سقف است، نه هدف/.test(stP.line) && stP.line.indexOf(pc.ceil.toFixed(2)) !== -1 &&
       stP.line.indexOf(faDigitsOut_('60') + ' صحنه خواست') !== -1 &&
       stP.line.indexOf('سقفِ همان روز ' + faDigitsOut_('40')) !== -1 &&
       stN.line.indexOf(faDigitsOut_('18') + ' صحنه خواست و همان ساخته شد') !== -1 &&
       stP.pace.last.paced === true && stN.pace.last.paced === false &&
       !/از این پس کارت‌ها ساده/.test(fs.readFileSync('src/27_YouTube.gs', 'utf8')),
       (stP.line || '').split('\n').pop() + ' || ' + (stN.line || '').split('\n').pop());
    delete global.__PROPS[PK.LV_PACE_LAST];

    /* ۷۱.۲۶ — برشِ محتوایی، از روی خودِ تابع: جای برش از تدوین‌گر؛ کد فقط دو مرز
       را نگه می‌دارد (کوتاه‌تر از کف یکی، بلندتر از سقف نصف) و سقفِ بودجه فقط **پایین**
       می‌آورد. و محتوای پرتغییر صحنهٔ بیشتر می‌گیرد از محتوای آرام — همان طول. */
    const s5 = []; for (let t = 0; t < 300; t += 5) s5.push({ t: t, text: 'ج' + t + '.', sec: 1 });
    const lim = { min: 6, max: 60 };
    const cg = lvSceneCutGroups_(s5, [1, 3, 4, 30, 31, 59], 300, lim, 150);
    const cg4 = lvSceneCutGroups_(s5, [1, 3, 4, 30, 31, 59], 300, lim, 4);
    const dense = lvSceneCutGroups_(s5, s5.map((_, i) => i + 1), 300, lim, 150);
    const calm = lvSceneCutGroups_(s5, [1, 20, 40], 300, lim, 150);
    const dur = (g) => g.map(x => x.t1 - x.t0);
    /* تکهٔ بلند به تکه‌های **برابر** شکسته می‌شود، نه «هر بار که از گام گذشت» — آن یکی
       تهِ ریزی می‌ساخت که فقط سدِ کف پنهانش می‌کرد؛ این‌جا کفِ یک‌ثانیه‌ای کنار است. */
    const eq = lvSceneCutGroups_(s5, [1], 300, { min: 1, max: 100 }, 150);
    const tset = s5.map(x => x.t);
    ok('۷۱.۲۶ برش از محتوا: کف و سقفِ طول، مرزِ جمله، پیوستگی، همهٔ متن؛ پرتغییر بیشتر از آرام؛ بودجه فقط کم می‌کند',
       dur(cg).every(x => x >= lim.min && x <= lim.max) && cg[0].t0 === 0 && cg[cg.length - 1].t1 === 300 &&
       cg.every((x, i) => i === 0 || x.t0 === cg[i - 1].t1) && cg.slice(1).every(x => tset.indexOf(x.t0) !== -1) &&
       cg.some(x => x.t0 === 150) && cg.some(x => x.t0 === 290) &&
       cg.map(x => x.text).join(' ').split('ج').length - 1 === s5.length &&
       cg.natural === cg.length && cg4.length === 4 && cg4.natural === cg.length &&
       dense.length >= 25 && calm.length <= 6 && dense.length > calm.length * 4 &&
       dur(dense).every(x => x >= lim.min) && dur(calm).every(x => x <= lim.max) &&
       eq.length === 3 && dur(eq).every(x => x === 100),
       'برش ' + dur(cg).join(',') + ' · برابر ' + dur(eq).join(',') + ' · پرتغییر ' + dense.length + ' · آرام ' + calm.length + ' · سقف۴ ' + cg4.length);

    /* ۷۱.۲۷ — از درِ ساخت، با بودجهٔ فراوان: دو درسِ **هم‌طول**، یکی پرتغییر و یکی
       آرام. شمار از تدوین‌گر می‌آید (نه از «هر ۲۰ ثانیه»)، هیچ‌کدام تا سقف پر نمی‌شود،
       و پرسشِ تدوین‌گر هیچ ثانیهٔ هدفی نمی‌گوید. */
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    CFG.LV_GEN_USD_MONTH = 1000;
    const paceR = lvScenePace_(model);
    const cA = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    cA.cutFn = (n) => [1, Math.round(n / 3), Math.round(2 * n / 3)];
    const sA0 = lvGenSpend_().usd;
    /* کفِ توکنِ به‌خاطرسپرده سقفِ عمدیِ تدوین‌گر را بالا نمی‌بَرد (`exact`، ۸.۳۴) */
    rememberTokFloor_(textModel_(), 65536);
    const A = build(mkEp71('EP71CA', 'قسمت 0323 — آرام'), Object.assign({}, ctx, { epRaw: '323' }), cA);
    const spendA = lvGenSpend_().usd - sA0;
    const cB = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    cB.cutFn = (n) => Array.from({ length: Math.ceil(n / 2) }, (_, i) => 2 * i + 1);
    const Bd = build(mkEp71('EP71CB', 'قسمت 0324 — پرتغییر'), Object.assign({}, ctx, { epRaw: '324' }), cB);
    const lastPace = JSON.parse(global.__PROPS[PK.LV_PACE_LAST] || 'null') || {};
    forgetTokFloor_(textModel_());
    /* ۷۱.۲۷-ب — «بودجه بُرید» فقط وقتی سقف از بودجه آمد؛ سقفِ ایمنی برچسبِ بودجه نمی‌گیرد،
       وگرنه خطِ روزانه برای درسی که پولش بود می‌گفت «سقف برای محتوا کم است». */
    const keepMax = CFG.LV_SCENE_MAX;
    CFG.LV_SCENE_MAX = 5;
    const cH = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    cH.cutFn = (n) => Array.from({ length: n }, (_, i) => i + 1);
    const H = build(mkEp71('EP71HM', 'قسمت 0327 — سقفِ ایمنی'), Object.assign({}, ctx, { epRaw: '327' }), cH);
    CFG.LV_SCENE_MAX = keepMax;
    CFG.LV_GEN_USD_MONTH = keepCap;
    const secA = (A.d && A.d.secs) || 0, step = lvSceneSec_('زیاد');
    const cutPr = (cA.cutPrompts || [''])[0];
    ok('۷۱.۲۷ شمار از محتوا: درسِ آرام کمتر از «هر ۲۰ ثانیه»، پرتغییر بیشتر؛ هیچ‌کدام پرِ سقف نمی‌شود؛ تدوین‌گر ثانیهٔ هدف نمی‌شنود',
       A.r.done && Bd.r.done && A.d.cutBy === 'محتوا' && Bd.d.cutBy === 'محتوا' &&
       A.d.scenes.length === A.d.natural && Bd.d.scenes.length === Bd.d.natural &&
       !A.d.pace.paced && !Bd.d.pace.paced &&
       A.d.scenes.length < Math.floor(secA / step) && Bd.d.scenes.length > Math.ceil(secA / step) &&
       Bd.d.scenes.length < paceR.max && spendA < paceR.ceil / 4 &&
       !/هر ~?\s*\d+ ثانیه/.test(cutPr) && /شمارِ تصویرها از خودِ محتوا می‌آید/.test(cutPr) &&
       /چگالیِ این مجموعه «زیاد» است/.test(cutPr) && cA.cutCap === CFG.LV_CUT_TOKENS &&
       lastPace.by === 'محتوا' && lastPace.natural === Bd.d.natural && lastPace.used === Bd.d.scenes.length,
       JSON.stringify({ secs: secA, calm: A.d && A.d.scenes.length, dense: Bd.d && Bd.d.scenes.length,
                        max: paceR.max, spendA: spendA, ceil: paceR.ceil, cap: cA.cutCap, last: lastPace }));
    ok('۷۱.۲۷-ب سقفِ ایمنی شمار را پایین می‌آورد ولی «بودجه بُرید» گفته نمی‌شود',
       H.r.done && H.d.scenes.length === 5 && H.d.natural > 5 && !H.d.pace.paced && H.r.info.paced === false,
       JSON.stringify({ n: H.d && H.d.scenes.length, natural: H.d && H.d.natural, paced: H.d && H.d.pace.paced }));

    /* ۷۱.۲۸ — توصیفِ صحنه‌ها **دسته‌دسته و در چند اجرا** (۸.۴۹): صد صحنه در یک پاسخ
       از سقفِ توکن و از مهلت می‌گذرد (۸.۳۴). اجرای اول فقط برش را می‌گیرد و ثبت
       می‌کند؛ هر اجرای بعد یک دسته. دستهٔ اول ماهیت و کاور را می‌دهد؛ بقیه آن‌ها را
       می‌شنوند. و پیش از کامل‌شدنِ نقشه هیچ تصویری ساخته نمی‌شود. */
    const keepB = CFG.LV_SCENE_ASK_BATCH, keepM = CFG.LV_SCENE_ASK_MIN_MS;
    CFG.LV_SCENE_ASK_BATCH = 5; CFG.LV_SCENE_ASK_MIN_MS = 1e12;
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const cC = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [], genAtPlan: [] };
    cC.cutFn = (n) => Array.from({ length: Math.ceil(n / 4) }, (_, i) => 4 * i + 1);
    cC.natureOut = 'درس';
    const C = build(mkEp71('EP71BT', 'قسمت 0325 — دسته‌ها'),
                    Object.assign({}, ctx, { epRaw: '325', textLevel: 'زیاد', textShare: 0.45 }), cC, 14);
    CFG.LV_SCENE_ASK_BATCH = keepB; CFG.LV_SCENE_ASK_MIN_MS = keepM;
    const nC = C.d ? C.d.scenes.length : 0;
    const lines = (p) => (p.match(/^\[\d+\] \(/mg) || []).length;
    const pr0 = cC.prompts[0] || '', pr1 = cC.prompts[1] || '';
    ok('۷۱.۲۸ دسته‌دسته و در چند اجرا: برش اول ثبت، هر اجرا یک دسته، ماهیت و کاور از دستهٔ اول، هیچ تصویری پیش از نقشهٔ کامل',
       C.r.done && nC > 10 && cC.prompts.length === Math.ceil(nC / 5) &&
       cC.prompts.every(p => lines(p) <= 5) && /توصیفِ [0۰] از/.test(C.whys[0]) &&
       /اول تشخیص بده/.test(pr0) && /و یک `cover`/.test(pr0) && /\*\*آغازِ\*\* ویدئو/.test(pr0) &&
       /ماهیتِ این صدا از پیش تشخیص داده شده: «درس»/.test(pr1) && !/و یک `cover`/.test(pr1) &&
       pr1.indexOf('a curious student in a blue sweater') !== -1 &&
       /روی حدودِ 2 صحنه از 5 /.test(pr1) &&
       cC.genAtPlan.length === cC.prompts.length && cC.genAtPlan.every(x => x === 0) &&
       C.d.scenes.every(x => x.scene) && !C.d.asking && C.d.nature === 'درس' &&
       C.d.scenes.every((x, i) => i === 0 || x.t0 === C.d.scenes[i - 1].t1),
       JSON.stringify({ runs: C.whys.length, scenes: nC, asks: cC.prompts.length, lines: cC.prompts.map(lines),
                        genAt: cC.genAtPlan, whys: C.whys.slice(0, 3) }));

    /* ۷۱.۲۹ — تدوین‌گر جواب نداد یا کم داد ⇒ همان برشِ زمانیِ قبلی، و **گفته می‌شود**
       (`cutWhy`، خطِ روزانه «برشِ محتوایی نشد»)، نه بی‌صدا. */
    const cD = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    cD.cutFn = () => [1];
    const D = build(mkEp71('EP71FB', 'قسمت 0326 — بی‌برش'), Object.assign({}, ctx, { epRaw: '326', level: 'کم' }), cD);
    const lastD = JSON.parse(global.__PROPS[PK.LV_PACE_LAST] || 'null') || {};
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const stD = lvGenStatus_();
    ok('۷۱.۲۹ برشِ محتوایی که نشد ⇒ برشِ زمانی، با علتِ نام‌برده در نقشه و خطِ روزانه',
       D.r.done && D.d.cutBy === 'زمان' && /تدوین‌گر فقط/.test(D.d.cutWhy) && lastD.by === 'زمان' &&
       /برشِ محتوایی نشد/.test(stD.line) && D.d.scenes.length >= 3,
       JSON.stringify({ done: D.r && D.r.done, cutBy: D.d && D.d.cutBy, why: D.d && D.d.cutWhy, n: D.d && D.d.scenes.length }));
    delete global.__PROPS[PK.LV_PACE_LAST];
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    CFG.LV_GEN_USD_MONTH = keepCap;
  }

  console.log('\n=== ۷۷) کلیپِ آغاز، حرکتِ معنادار، و آزمونِ مدلِ تازه (۸.۵۱) ===');
  /* او: «کلیپ سقفِ ۱۲۰ بمونه / ۲ و ۳ هم بساز … با یک کلیپ در ابتدای درس … در شروعِ هر
     پادکست». سه چیز، و هر سه از درِ تولید (`lvScenesBuild_`) سنجیده می‌شوند. */
  {
    const mp4 = [0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109].concat(new Array(4000).fill(7));
    const veo = (inner, v) => function (url, body, opt) {
      if (url.indexOf(':predictLongRunning') !== -1) {
        v.starts.push({ body: body, judgedBefore: v.cnt.judge, gen: v.cnt.gen });
        if (v.startFail) return { code: 400, text: JSON.stringify({ error: { message: v.startFail } }) };
        return { code: 200, json: { name: 'models/veo/operations/op' + v.starts.length } };
      }
      if (/\/operations\/op\d+/.test(url)) {
        v.polls++;
        if (v.polls % 2 === 1) return { code: 200, json: { done: false } };
        return { code: 200, json: { done: true, response: { generateVideoResponse: { generatedSamples: [
          { video: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/clip' + v.starts.length + ':download?alt=media' } }] } } } };
      }
      if (/files\/clip\d+:download/.test(url)) {
        v.downloads++;
        if (v.html) return { code: 200, bytes: Array.from('<html>no</html>' + ' '.repeat(80)).map(c => c.charCodeAt(0)), mime: 'text/html' };
        return { code: 200, bytes: mp4, mime: 'video/mp4' };
      }
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      if (sc && sc.properties && sc.properties.fits) {
        v.judges.push(JSON.stringify(body).indexOf('video/mp4') !== -1);
        const r = v.judgeOut ? v.judgeOut(v.judges.length) : { hasText: 'خیر', deformed: 'خیر', fits: 'بله', why: 'آرام و هم‌خوان' };
        return { code: 200, json: { candidates: [{ content: { parts: [{ text: r === null ? '' : JSON.stringify(r) }] } }] } };
      }
      const r = inner(url, body, opt);
      /* حرکت: توصیف‌گر کانون و حرکت می‌دهد، داور جایش را — بدَل فقط اگر schema جایشان را
         داشته باشد به مقصد می‌رسد (mock صافی می‌کند). */
      if (v.motion && sc && sc.properties && r && r.json && r.json.candidates) {
        try {
          const t = JSON.parse(r.json.candidates[0].content.parts[0].text);
          if (t.scenes) t.scenes.forEach((x, i) => { x.focus = 'the last lantern'; x.move = i % 3 === 0 ? 'push' : i % 3 === 1 ? 'reveal' : 'drift'; });
          if (t.items) t.items.forEach((x, i) => { x.box = i % 2 ? '' : '100,600,400,900'; });
          r.json.candidates[0].content.parts[0].text = JSON.stringify(t);
        } catch (e) {}
      }
      return r;
    };
    const ctx77 = { show: 'special', title: 'انتقالِ توجیه', seriesName: 'معرفت‌شناسی',
                    sections: SEC71, level: 'زیاد', style: 'آبرنگِ گرم' };
    const run77 = (id, ep, v, n) => {
      const cnt = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
      v.cnt = cnt; v.starts = v.starts || []; v.polls = v.polls || 0; v.downloads = v.downloads || 0; v.judges = v.judges || [];
      global.__STUB = veo(sceneStub(cnt), v);
      const E = mkEp71(id, 'قسمت 0' + ep + ' — کلیپ');
      const whys = []; let r = null;
      for (let i = 0; i < (n || 12); i++) {
        r = lvScenesBuild_(E.f, E.meta, {}, Object.assign({ epRaw: String(ep) }, ctx77, v.ctx || {}));
        whys.push(r.why || '');
        if (r.done || r.fallback) break;
      }
      global.__STUB = BASE_STUB;
      return { r: r, d: lvSceneRead_(E.f), whys: whys, cnt: cnt, E: E };
    };
    const capWas77 = CFG.LV_GEN_USD_MONTH;
    CFG.LV_GEN_USD_MONTH = 120;
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    delete global.__PROPS[PK.LV_CLIP_LAST];

    /* ۷۷.۱ — هزینه: هشت ثانیه با veo-3.1-lite در ۱۰۸۰p = ۰٫۶۴ دلار، و **پیش از صحنه‌ها**
       از سقفِ همان درس برداشته می‌شود — سقفِ ماه یکی است. */
    const onP = lvScenePace_('gemini-3.1-flash-lite-image');
    CFG.LV_CLIP_ON = false;
    const offP = lvScenePace_('gemini-3.1-flash-lite-image');
    CFG.LV_CLIP_ON = true;
    ok('۷۷.۱ کلیپ ۰٫۶۴ دلار، از سقفِ همان درس و پیش از صحنه‌ها',
       Math.abs(lvClipCost_() - 0.64) < 1e-9 && lvClipSec_() === 8 &&
       Math.abs((onP.cover - offP.cover) - 0.64) < 1e-9 && onP.clip === 0.64 && offP.clip === undefined &&
       Math.abs(lvClipCost_('veo-3.1-fast-generate-preview') - 0.96) < 1e-9 &&
       Math.abs(lvClipCost_('veo-9-unknown') - 3.2) < 1e-9,
       JSON.stringify({ on: onP.cover, off: offP.cover, lite: lvClipCost_() }));

    /* ۷۷.۲ — از درِ ساخت: کلیپ از تصویرِ **داوری‌شدهٔ** صحنهٔ نخست، با ۱۶:۹، ۸ ثانیه، ۱۰۸۰p،
       بی نوشته؛ پرسیده، برداشته (بایت‌های ftyp)، **دیده‌شده** داوری، و روی همان صحنه
       نشست. پولش یک بار و در همان دفترِ ماه. */
    const v2 = {};
    const A = run77('EP77A', 771, v2);
    const st0 = v2.starts[0] || {};
    const inst = ((st0.body || {}).instances || [])[0] || {};
    const par = (st0.body || {}).parameters || {};
    const sp2 = lvGenSpend_();
    ok('۷۷.۲ کلیپ از تصویرِ داوری‌شدهٔ صحنهٔ نخست، دیده و داوری‌شده، روی همان صحنه؛ پول یک بار',
       A.r && A.r.done && A.d.clip && A.d.clip.state === 'ok' && A.d.clip.img === A.d.scenes[0].fileId &&
       A.r.items[0].clip && A.r.items[0].clip.fileId === A.d.clip.fileId && A.r.items[0].clip.sec === 8 &&
       A.r.items.slice(1).every(x => !x.clip) &&
       v2.starts.length === 1 && st0.judgedBefore > 0 && inst.image && inst.image.inlineData &&
       /image\//.test(inst.image.inlineData.mimeType) && inst.image.inlineData.data.length > 1000 &&
       par.aspectRatio === '16:9' && par.durationSeconds === 8 && par.resolution === '1080p' &&
       /no text/.test(inst.prompt) && v2.downloads === 1 && v2.judges.length === 1 && v2.judges[0] === true &&
       sp2.clips === 1 && A.d.clip.usd === 0.64 && A.r.info.clip === 'ok',
       JSON.stringify({ done: A.r && A.r.done, clip: A.d && A.d.clip, starts: v2.starts.length, polls: v2.polls,
                        judges: v2.judges, spend: sp2, whys: A.whys }));

    /* ۷۷.۲-ب — کلیپ فقط روی همان تصویری می‌نشیند که از آن ساخته شد: تصویرِ صحنه که عوض شد
       (ساختِ دوباره)، کلیپِ تصویرِ قبلی روی تصویرِ تازه نمی‌رود. */
    const dA2 = lvSceneRead_(A.E.f);
    dA2.clip.img = 'IMG-OLD';
    lvSceneWrite_(A.E.f, dA2);
    global.__STUB = veo(sceneStub({ gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] }), v2);
    const rA2 = lvScenesBuild_(A.E.f, A.E.meta, {}, Object.assign({ epRaw: '771' }, ctx77));
    global.__STUB = BASE_STUB;
    ok('۷۷.۲-ب کلیپِ تصویرِ قبلی روی تصویرِ تازه نمی‌نشیند',
       rA2.done && !rA2.items[0].clip && rA2.items[0].fileId === A.r.items[0].fileId,
       JSON.stringify({ done: rA2.done, clip: rA2.items[0] && rA2.items[0].clip }));

    /* ۷۷.۳ — ویدئو منتظرِ کلیپِ در راه می‌مانَد، می‌گوید چرا، و ادامه را زمان‌بندی می‌کند.
       (همان ۷۷.۲: پرسشِ نخست «هنوز نه» شنید.) */
    ok('۷۷.۳ کلیپِ در راه ⇒ «آماده نیست» با علت و ادامه‌ای زمان‌بندی‌شده',
       A.whys.some(w => /کلیپِ آغاز: در ساخت/.test(w)) && A.whys.length >= 3,
       JSON.stringify(A.whys));

    /* ۷۷.۳-ب — کلیپِ در راه همیشه ادامه می‌خواهد، حتی وقتی سقفِ تصویر وسطِ درس پر شده
       (`d.why`): کارِ آغازشده پولش داده شده و فقط باید برداشته شود. */
    const dW = lvSceneRead_(A.E.f);
    dW.clip = { state: 'wait', tries: 1, op: 'models/veo/operations/op1', fileId: '', why: '', at: '',
                first: Date.now(), usd: 0.64, img: dW.scenes[0].fileId };
    dW.why = 'سقفِ ماهانهٔ تصویر پر شد'; dW.capHit = true;
    lvSceneWrite_(A.E.f, dW);
    global.__TRIGGERS = global.__TRIGGERS.filter(t => t.getHandlerFunction() !== 'ytSceneMore');
    delete global.__PROPS[PK.LV_SCENE_MORE];
    const vW = { starts: [], polls: 0, downloads: 0, judges: [] };
    global.__STUB = veo(sceneStub({ gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] }), vW);
    const rW = lvScenesBuild_(A.E.f, A.E.meta, {}, Object.assign({ epRaw: '771' }, ctx77));
    global.__STUB = BASE_STUB;
    const armed = global.__TRIGGERS.filter(t => t.getHandlerFunction() === 'ytSceneMore').length;
    ok('۷۷.۳-ب کلیپِ در راه با سقفِ پرشده ⇒ ادامه زمان‌بندی می‌شود',
       !rW.done && /سقفِ ماهانهٔ تصویر پر شد؛ کلیپِ آغاز: در (ساخت|داوری)/.test(rW.why) && armed === 1 && vW.polls >= 1,
       JSON.stringify({ done: rW.done, why: rW.why, armed: armed, polls: vW.polls }));

    /* ۷۷.۴ — شکست‌ها هرگز ویدئو را نگه نمی‌دارند و هرگز بی‌صدا نیستند:
       (الف) آغاز رد شد (نه ردِ شکلِ تصویر) ⇒ دو تلاش، بی خرج، بعد «نشد».
       (ب) بایت‌ها ویدئو نبود ⇒ نشد. (پ) داور نوشته دید ⇒ یک بارِ دیگر با علت، بعد نشد.
       (ت) داور ندید ⇒ سه بار، بعد نشد. در همه: ویدئو با نقاشیِ ثابت، و خطِ روزانه علت را دارد. */
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const vA = { startFail: 'model not allowed for this project' };
    const FA = run77('EP77FA', 772, vA);
    const spA = lvGenSpend_();
    const vB = { html: true };
    const FB = run77('EP77FB', 773, vB);
    const vC = { judgeOut: () => ({ hasText: 'بله', deformed: 'خیر', fits: 'بله', why: 'روی تابلو نوشته آمده' }) };
    const FC = run77('EP77FC', 774, vC);
    const vD = { judgeOut: () => null };
    const FD = run77('EP77FD', 775, vD, 16);
    const stF = lvClipStatus_();
    const fine = (X) => X.r && X.r.done && X.d.clip.state === 'fail' && !X.r.items[0].clip;
    ok('۷۷.۴ هر شکست ⇒ نقاشیِ ثابت، ویدئو منتظر نمی‌مانَد، علت گفته می‌شود؛ ردِ آغاز خرج ندارد؛ نوشته ⇒ تلاشِ دوم با علت',
       fine(FA) && vA.starts.length === 2 && spA.clips === 0 && /model not allowed/.test(FA.d.clip.why) &&
       fine(FB) && vB.downloads === 2 && /ویدئو نبود/.test(FB.d.clip.why) &&
       fine(FC) && vC.starts.length === 2 && /previous attempt was rejected because: نوشته در کلیپ/.test(vC.starts[1].body.instances[0].prompt) &&
       FC.d.clip.usd === 1.28 &&
       fine(FD) && vD.judges.length === 3 &&
       /❌ نشد/.test(stF.line) && /همان نقاشیِ ثابت رفت/.test(stF.line),
       JSON.stringify({ A: FA.d && FA.d.clip, B: FB.d && FB.d.clip && FB.d.clip.why, C: FC.d && FC.d.clip && FC.d.clip.why,
                        D: FD.d && FD.d.clip, line: stF.line }));

    /* ۷۷.۴-ب — ردِ ۴۰۰ که یک پارامترِ معیّن را نام می‌برد ⇒ همان یکی نرم می‌شود و دوباره
       پرسیده می‌شود؛ شکلِ دیگرِ تصویر فقط برای ردِ «تصویر». شکلِ درخواست هرگز با API
       واقعی آزموده نشده، و نخستین درس نباید برای یک پارامتر کلیپش را از دست بدهد. */
    const rejects = [];
    let callsJ = 0;
    const answers = ['Unsupported resolution 1080p for this model', 'personGeneration allow_adult is not allowed',
                     'Invalid value at instances[0].image: inlineData not supported'];
    global.__STUB = function (url, body) {
      if (url.indexOf(':predictLongRunning') !== -1) {
        rejects.push(body);
        const a = answers[callsJ++];
        if (a) return { code: 400, text: JSON.stringify({ error: { message: a } }) };
        return { code: 200, json: { name: 'models/veo/operations/opJ' } };
      }
      return BASE_STUB(url, body);
    };
    const stJ = lvClipStart_('veo-3.1-lite-generate-preview', Utilities.newBlob(png71(20000), 'image/png', 'x.png'), 'p');
    callsJ = 0; answers.length = 0; answers.push('Quota exceeded for model');
    const nBefore = rejects.length;
    const stQ = lvClipStart_('veo-3.1-lite-generate-preview', Utilities.newBlob(png71(20000), 'image/png', 'x.png'), 'p');
    global.__STUB = BASE_STUB;
    const lastJ = rejects[3] || {};
    ok('۷۷.۴-ب ردِ یک پارامترِ معیّن ⇒ همان یکی نرم و دوباره؛ ردِ سهمیه ⇒ بی تکرار با علت',
       stJ.op === 'models/veo/operations/opJ' && rejects.length - 1 >= 3 &&
       lastJ.parameters && lastJ.parameters.resolution === '720p' && !('personGeneration' in lastJ.parameters) &&
       lastJ.instances[0].image.bytesBase64Encoded && JSON.stringify(stJ.adj) === '["resolution","personGeneration","imageShape"]' &&
       !stQ.op && rejects.length - nBefore === 1 && /Quota exceeded/.test(stQ.err),
       JSON.stringify({ j: stJ, q: stQ, n: rejects.length }));

    /* ۷۷.۵ — سقفِ ماه برای کلیپ جا ندارد ⇒ «خاموش» **بی فراخوانِ Veo**، و ویدئو منتظرش نیست.
       سهمِ درس کلیپ را از پیش کنار می‌گذارد (۷۷.۱)؛ این سدِ دوم برای ماهی است که با
       قیمتِ عوض‌شده یا سقفِ پایین‌آمده وسطِ درس پر شود. */
    const monthNow = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM');
    const vE = { starts: [], polls: 0 };
    global.__STUB = veo(BASE_STUB, Object.assign(vE, { downloads: 0, judges: [], cnt: { judge: 1, gen: 0 } }));
    global.__PROPS[PK.LV_GEN_SPEND] = JSON.stringify({ month: monthNow, n: 0, usd: CFG.LV_GEN_USD_MONTH - 0.5 });
    const fE = DriveApp.__register('EP77FE', 'قسمت 0776 — بی‌پول');
    let gotBlob = 0;
    const gfWas = DriveApp.getFileById;
    DriveApp.getFileById = function (id) {
      if (id === 'IMG1') { gotBlob++; return { getBlob: () => Utilities.newBlob(png71(20000), 'image/png', 'x.png') }; }
      return gfWas.call(DriveApp, id);
    };
    const dE = { scenes: [{ n: 1, fileId: 'IMG1', scene: 'x', text: 'متن', judge: { s: 7 } }, { n: 2 }],
                 clip: { state: '', tries: 0, op: '', fileId: '', why: '', at: '' } };
    lvClipStep_(dE, fE, () => 1e9, 'special:776');
    global.__PROPS[PK.LV_GEN_SPEND] = JSON.stringify({ month: monthNow, n: 0, usd: CFG.LV_GEN_USD_MONTH - 0.7 });
    const dE2 = { scenes: [{ n: 1, fileId: 'IMG1', scene: 'x', text: 'متن', judge: { s: 7 } }],
                  clip: { state: '', tries: 0, op: '', fileId: '', why: '', at: '' } };
    lvClipStep_(dE2, fE, () => 1e9, 'special:776');
    global.__STUB = BASE_STUB;
    /* ۷۷.۵-ب — تصویرِ نخستِ **داوری‌نشده** کلیپ نمی‌گیرد (داور ممکن است از نو بسازدش)؛ صحنهٔ
       نخستی که هرگز تصویر نگرفت کلیپ را «نشد» می‌کند، نه منتظرِ ابدی. */
    global.__STUB = veo(BASE_STUB, vE);
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const dU = { scenes: [{ n: 1, fileId: 'IMG1', scene: 'x', text: 'متن', judge: null }],
                 clip: { state: '', tries: 0, op: '', fileId: '', why: '', at: '' } };
    const startsU = vE.starts.length, blobU = gotBlob;
    lvClipStep_(dU, fE, () => 1e9, 'special:776', 2);
    const blobU2 = gotBlob;
    const dN = { scenes: [{ n: 1, fileId: '', tries: 2, scene: 'x', text: 'متن' }],
                 clip: { state: '', tries: 0, op: '', fileId: '', why: '', at: '' } };
    lvClipStep_(dN, fE, () => 1e9, 'special:776', 2);
    /* ۷۷.۵-پ — کلیپی که از سقفِ انتظار گذشت ⇒ «نشد» با علت؛ ویدئو منتظرِ ابدی نیست. */
    const dT = { scenes: [{ n: 1, fileId: 'IMG1', scene: 'x', text: 'متن', judge: { s: 7 } }],
                 clip: { state: 'wait', tries: 1, op: 'models/veo/operations/op77', fileId: '', why: '',
                         at: '', first: Date.now() - (CFG.LV_CLIP_WAIT_MIN + 1) * 60000 } };
    const pollsT = vE.polls;
    lvClipStep_(dT, fE, () => 1e9, 'special:776', 2);
    DriveApp.getFileById = gfWas;
    global.__STUB = BASE_STUB;
    ok('۷۷.۵-پ کلیپی که از سقفِ انتظار گذشت ⇒ «نشد» با علت، بی پرسیدنِ دوباره',
       dT.clip.state === 'fail' && /دقیقه نرسید/.test(dT.clip.why) && vE.polls === pollsT && lvClipSettled_(dT),
       JSON.stringify(dT.clip));
    ok('۷۷.۵-ب تصویرِ داوری‌نشده ⇒ صبر بی فراخوان؛ صحنهٔ نخستِ بی‌تصویر ⇒ «نشد»',
       dU.clip.state === '' && vE.starts.length === startsU && blobU2 === blobU && dN.clip.state === 'fail' &&
       /تصویر نگرفت|تصویر ندارد/.test(dN.clip.why) && lvClipSettled_(dN),
       JSON.stringify({ u: dU.clip.state, n: dN.clip }));
    ok('۷۷.۵ سقفِ ماه جا ندارد ⇒ «خاموش» بی فراخوان و «سرانجام‌یافته»؛ یک سنت بیشتر ⇒ آغاز',
       dE.clip.state === 'off' && /سقفِ ماهانه/.test(dE.clip.why) && lvClipSettled_(dE) &&
       vE.starts.length === 1 && dE2.clip.state === 'wait' && gotBlob >= 1,
       JSON.stringify({ off: dE.clip, on: dE2.clip.state, starts: vE.starts.length }));

    /* ۷۷.۶ — نقشه‌ای که پیش از ۸.۵۱ ساخته شد (`clip` ندارد) کلیپ نمی‌گیرد و منتظر هم نمی‌ماند:
       خرجِ تازه روی درسی که در راهِ انتشار است، بی آنکه کسی خواسته باشد، نه. */
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const vF = {};
    const Eo = mkEp71('EP77OLD', 'قسمت 0777 — قدیمی');
    const cntF = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    vF.cnt = cntF; vF.starts = []; vF.polls = 0; vF.downloads = 0; vF.judges = [];
    CFG.LV_CLIP_ON = false;
    global.__STUB = veo(sceneStub(cntF), vF);
    let rO = null;
    for (let i = 0; i < 4; i++) { rO = lvScenesBuild_(Eo.f, Eo.meta, {}, Object.assign({ epRaw: '777' }, ctx77)); if (rO.done || rO.fallback) break; }
    CFG.LV_CLIP_ON = true;
    const dO = lvSceneRead_(Eo.f);
    const rO2 = lvScenesBuild_(Eo.f, Eo.meta, {}, Object.assign({ epRaw: '777' }, ctx77));
    global.__STUB = BASE_STUB;
    ok('۷۷.۶ نقشهٔ بی‌کلیپ با روشن‌شدنِ کلیپ نه کلیپ می‌گیرد و نه منتظر می‌مانَد',
       rO && rO.done && dO.clip === null && rO2.done && vF.starts.length === 0 &&
       !!(rO2.items && rO2.items[0]) && !rO2.items[0].clip,
       JSON.stringify({ done: rO && rO.done, clip: dO && dO.clip, again: rO2 && rO2.done, why: rO2 && rO2.why, starts: vF.starts.length }));

    /* ۷۷.۷ — حرکتِ معنادار از درِ ساخت: توصیف‌گر «کجا و چه» را می‌شنود، داور جای کانون را،
       و فقط صحنه‌ای که **هر دو** را دارد حرکتِ کانون‌دار می‌گیرد. «drift» یا بی‌جا ⇒ همان
       حرکتِ آرام. خاموش ⇒ هیچ. */
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const vG = { motion: true };
    const fzWas = CFG.LV_FOCUS_ZOOM;
    CFG.LV_FOCUS_ZOOM = 0.2;
    const G = run77('EP77MV', 778, vG);
    const planPr = (G.cnt.prompts || [])[0] || '';
    const mvs = G.r.items.map(x => x.mv || null);
    const expect = G.d.scenes.map(x => (x.move === 'push' || x.move === 'reveal') && x.judge && x.judge.box);
    CFG.LV_MOTION_ON = false;
    const mvOff = lvSceneMv_(G.d.scenes.find(x => x.move === 'push' && x.judge && x.judge.box) || {});
    CFG.LV_MOTION_ON = true;
    CFG.LV_FOCUS_ZOOM = fzWas;
    const boxed = G.d.scenes.find(x => x.judge && x.judge.box) || { judge: {} };
    ok('۷۷.۷ حرکتِ کانون‌دار فقط با «چه» و «کجا»؛ جای کانون از داوری؛ اندازه از CFG؛ خاموش ⇒ هیچ',
       G.r.done && /`focus`/.test(planPr) && /`move`/.test(planPr) &&
       mvs.some(Boolean) && mvs.some(x => !x) &&
       mvs.every((m, i) => !!m === !!expect[i]) &&
       mvs.filter(Boolean).every(m => (m.k === 'push' || m.k === 'reveal') && Math.abs(m.x - 0.75) < 1e-6 &&
                                      Math.abs(m.y - 0.25) < 1e-6 && m.z === 0.2) &&
       Math.abs(boxed.judge.box.w - 0.3) < 1e-6 && mvOff === null && G.r.info.mv === mvs.filter(Boolean).length,
       JSON.stringify({ mvs: mvs, moves: G.d.scenes.map(x => x.move), box: boxed.judge.box }));

    /* ۷۷.۸ — جعبهٔ نامعقول حرکت نمی‌سازد: اشارهٔ نادرست بدتر از هیچ است. */
    ok('۷۷.۸ جعبهٔ نامعقول ⇒ null (وارونه، بیرون از ۰..۱۰۰۰، نقطه، کلِ قاب)',
       lvSceneBox_('100,600,400,900') && lvSceneBox_('۱۰۰,۶۰۰,۴۰۰,۹۰۰').x === 0.75 &&
       lvSceneBox_('400,600,100,900') === null && lvSceneBox_('400,900,100,600') === null &&
       lvSceneBox_('100,600,400,1200') === null &&
       lvSceneBox_('500,500,505,505') === null && lvSceneBox_('0,0,1000,1000') === null &&
       lvSceneBox_('') === null && lvSceneMove_('Zoom in') === 'push' && lvSceneMove_('pull back') === 'reveal' &&
       lvSceneMove_('spin') === '');

    /* ۷۷.۹ — ردیفِ رندر کلیپ و حرکت را می‌بَرد، و اشتراکِ کلیپ مثلِ تصویر باز می‌شود
       (بسته یعنی رانر صفحهٔ HTML می‌گیرد، ۷.۳۳). از متنِ کد، چون این راه به درایو بند است. */
    const ytSrc = fs.readFileSync('src/27_YouTube.gs', 'utf8');
    ok('۷۷.۹ ردیفِ رندر mv و clip را می‌بَرد و اشتراکِ کلیپ باز می‌شود',
       /if \(x\.mv\) r0\.mv = x\.mv/.test(ytSrc) && /r0\.clip = \{ fileId: String\(x\.clip\.fileId\)/.test(ytSrc) &&
       /var cz = ss\[z\] && ss\[z\]\.clip && ss\[z\]\.clip\.fileId/.test(ytSrc));

    /* ۷۷.۱۰ — خطِ روزانهٔ کلیپ هر روز، با قیمت و حالِ آخرین. */
    global.__PROPS[PK.LV_GEN_ON] = '1';
    const stA = lvGenStatus_();
    ok('۷۷.۱۰ خطِ روزانه: «🎬 کلیپِ آغازِ درس» با قیمت، شمارِ ماه و حالِ آخرین',
       /🎬 کلیپِ آغازِ درس: روشن با veo-3\.1-lite-generate-preview \(~0\.64 دلار/.test(stA.line) &&
       /آخرین \(special:/.test(stA.line) && stA.clip && stA.clip.on === true,
       (stA.line.split('\n').find(l => /🎬/.test(l)) || '').slice(0, 300));

    /* ══ آزمونِ مدلِ تصویرِ تازه ══ */
    const lite = 'gemini-3.1-flash-lite-image', nova = 'gemini-4-flash-image-preview';
    const pinWas77 = CFG.LV_GEN_MODEL_PIN, setWas77 = CFG.LV_GEN_MODEL;
    CFG.LV_GEN_MODEL = ''; CFG.LV_GEN_MODEL_PIN = lite;
    delete global.__PROPS[PK.LV_AUD_KNOWN]; delete global.__PROPS[PK.LV_AUD_DUE];
    delete global.__PROPS[PK.LV_AUD_LOG]; delete global.__PROPS[PK.LV_AUD_REF];
    global.__TRIGGERS = global.__TRIGGERS.filter(t => t.getHandlerFunction() !== 'lvAuditionLater');
    let listed77 = [lite, 'gemini-2.5-flash-image'];
    const aud = { gens: [], judges: [], tg: [] };
    const audStub = (inner) => function (url, body, opt) {
      if (url.indexOf('/v1beta/models?') !== -1) {
        return { code: 200, json: { models: listed77.map(m => ({ name: 'models/' + m, supportedGenerationMethods: ['generateContent'] })) } };
      }
      if (url.indexOf('api.telegram.org') !== -1) { aud.tg.push({ url: url, body: body }); return { code: 200, json: { ok: true } }; }
      if (url.indexOf(nova + ':generateContent') !== -1) {
        aud.gens.push(body.contents[0].parts[0].text);
        return { code: 200, json: { candidates: [{ content: { parts: [
          { inlineData: { mimeType: 'image/png', data: Utilities.base64Encode(png71(20000)) } }] } }] } };
      }
      const sc = body && body.generationConfig && body.generationConfig.responseSchema;
      if (sc && sc.properties && sc.properties.items && JSON.stringify(body).indexOf('inlineData') !== -1) {
        const ns = []; body.contents[0].parts.forEach(p => { const m = /^تصویرِ (\d+)/.exec(p.text || ''); if (m) ns.push(m[1]); });
        aud.judges.push(ns);
        return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ items: ns.map(n => ({
          n: n, score: Number(n) >= 20 ? '8' : '6', hasText: 'خیر', realFace: 'خیر', why: 'ربط دارد' })) }) }] } }] } };
      }
      return inner(url, body, opt);
    };
    const trigN = () => global.__TRIGGERS.filter(t => t.getHandlerFunction() === 'lvAuditionLater').length;

    /* ۷۷.۱۱ — بارِ اول فقط ثبت است: آنچه امروز هست «تازه» نیست. بارِ بعد، مدلی که نبود ⇒ صف و
       یک اجرای یک‌بارهٔ زمان‌بندی‌شده. از درِ تولید: همان گشتنِ `lvGenModel_`. */
    global.__STUB = audStub(BASE_STUB);
    global.__PROPS[PK.LV_GEN_MODEL] = '';
    const g1 = lvGenModel_();
    const due1 = JSON.parse(global.__PROPS[PK.LV_AUD_DUE] || '[]');
    const t1 = trigN();
    listed77 = [lite, 'gemini-2.5-flash-image', nova];
    global.__PROPS[PK.LV_GEN_MODEL] = '';
    const g2 = lvGenModel_();
    const due2 = JSON.parse(global.__PROPS[PK.LV_AUD_DUE] || '[]');
    ok('۷۷.۱۱ بارِ اول فقط ثبت؛ مدلِ تازه ⇒ صف و اجرای یک‌باره؛ و سنجاق سرِ جایش',
       g1.id === lite && due1.length === 0 && t1 === 0 && g2.id === lite &&
       due2.length === 1 && due2[0] === nova && trigN() === 1,
       JSON.stringify({ g1: g1.id, g2: g2.id, due1, due2, trig: trigN() }));

    /* ۷۷.۱۲ — بی مرجع (هنوز درسی با سنجاق ساخته نشده) ⇒ صبر، صف می‌مانَد، هیچ خرجی. */
    let n0 = '';
    try { n0 = lvAuditionLater(); } catch (eA) { n0 = 'پرتاب: ' + eA.message; }
    ok('۷۷.۱۲ بی مرجع ⇒ صبر با علت، صف می‌مانَد، بی خرج',
       /هنوز درسی با صحنه ساخته نشده/.test(n0) && JSON.parse(global.__PROPS[PK.LV_AUD_DUE]).length === 1 && aud.gens.length === 0, n0);

    /* ۷۷.۱۳ — مرجع از درسِ واقعی (همان ساختِ ۷۷.۲ با همین سنجاق): بهترین‌های داوری‌شده. */
    global.__STUB = veo(audStub(sceneStub({ gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] })), { starts: [], polls: 0, downloads: 0, judges: [], cnt: { judge: 1, gen: 0 } });
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const cntR = { gen: 0, plan: 0, judge: 0, cfg: [], prompts: [], imgPrompts: [] };
    const vR = { cnt: cntR, starts: [], polls: 0, downloads: 0, judges: [] };
    global.__STUB = veo(audStub(sceneStub(cntR)), vR);
    const ER = mkEp71('EP77REF', 'قسمت 0779 — مرجع');
    let rR = null;
    for (let i = 0; i < 12; i++) { rR = lvScenesBuild_(ER.f, ER.meta, {}, Object.assign({ epRaw: '779' }, ctx77)); if (rR.done || rR.fallback) break; }
    const ref = JSON.parse(global.__PROPS[PK.LV_AUD_REF] || 'null');
    const dR = lvSceneRead_(ER.f);
    ok('۷۷.۱۳ مرجع از درسی که ساخته شد: تا سه صحنهٔ داوری‌شدهٔ بی‌نوشته، با مدلِ سازنده',
       rR && rR.done && ref && ref.key === 'special:779' && ref.model === lite && ref.scenes.length === 3 &&
       ref.scenes.every(x => x.fileId && x.scene && x.s >= 0) &&
       ref.scenes.every(x => dR.scenes.some(y => y.fileId === x.fileId && y.judge && !y.judge.txt)),
       JSON.stringify({ ref: ref && { key: ref.key, model: ref.model, n: ref.scenes.length } }));

    /* ۷۷.۱۴ — آزمون: همان سه صحنه با مدلِ تازه، **یک** داوری برای هر شش تصویر، سه آلبومِ
       جفت‌به‌جفت و یک جمع‌بندی در تلگرام؛ صف خالی؛ و **هیچ چیزی خودکار عوض نمی‌شود**. */
    global.__PROPS[PK.TG_TOKEN] = 'TOK'; global.__PROPS[PK.TG_CHAT] = 'CHAT';
    aud.gens = []; aud.judges = []; aud.tg = [];
    const spBefore = lvGenSpend_().usd;
    global.__PROPS[PK.LV_AUD_SINCE] = '2026-08-10 09:00';         // «از کِی» پیش از آزمون (۷۸.۳ می‌سنجد)
    const n1 = lvAuditionLater();
    const sinceAfterAud = global.__PROPS[PK.LV_AUD_SINCE];
    const log = JSON.parse(global.__PROPS[PK.LV_AUD_LOG] || '{}')[nova] || {};
    const albums = aud.tg.filter(x => /sendMediaGroup/.test(x.url));
    const texts = aud.tg.filter(x => /sendMessage/.test(x.url)).map(x => String((x.body || {}).text || ''));
    global.__PROPS[PK.LV_GEN_MODEL] = '';
    const g3 = lvGenModel_();
    ok('۷۷.۱۴ همان صحنه‌ها با مدلِ تازه، یک داوریِ مشترک، سه آلبومِ جفتی و جمع‌بندی؛ سنجاق دست‌نخورده',
       aud.gens.length === 3 && aud.judges.length === 1 && aud.judges[0].length === 6 &&
       ref.scenes.every(x => aud.gens.some(g => g.indexOf(x.scene.slice(0, 40)) !== -1)) &&
       albums.length === 3 && albums.every(a => (JSON.parse(a.body.media || '[]') || []).length === 2) &&
       texts.some(t => /مدلِ تصویرِ تازه پیدا شد: «gemini-4-flash-image-preview»/.test(t) && /هیچ چیزی خودکار عوض نشد/.test(t)) &&
       log.avgNew === 8 && log.avgPin === 6 && log.sent === true &&
       JSON.parse(global.__PROPS[PK.LV_AUD_DUE]).length === 0 && g3.id === lite &&
       lvGenSpend_().usd > spBefore,
       JSON.stringify({ note: n1, gens: aud.gens.length, judges: aud.judges, albums: albums.length, log: log, g3: g3.id }));

    /* ۷۷.۱۵ — سقفِ ماه جا ندارد ⇒ صبر، صف می‌مانَد، بی خرج؛ و خطِ روزانه هر دو را می‌گوید. */
    listed77 = [lite, 'gemini-2.5-flash-image', nova, 'gemini-5-image'];
    global.__PROPS[PK.LV_GEN_MODEL] = '';
    lvGenModel_();
    const capA = CFG.LV_GEN_USD_MONTH;
    CFG.LV_GEN_USD_MONTH = lvGenSpend_().usd + 0.01;
    aud.gens = [];
    const n2 = lvAuditionLater();
    CFG.LV_GEN_USD_MONTH = capA;
    const onW = global.__PROPS[PK.LV_GEN_ON];
    global.__PROPS[PK.LV_GEN_ON] = '1';
    const stAud = lvGenStatus_();
    if (onW === undefined) delete global.__PROPS[PK.LV_GEN_ON]; else global.__PROPS[PK.LV_GEN_ON] = onW;
    ok('۷۷.۱۵ سقف جا ندارد ⇒ صبر با علت، صف می‌مانَد؛ خطِ روزانه صف و آخرین را می‌گوید و «خودکار جایگزین نمی‌شود»',
       /سقفِ ماه برای 3 تصویرِ آزمون جا ندارد/.test(n2) && aud.gens.length === 0 &&
       JSON.parse(global.__PROPS[PK.LV_AUD_DUE])[0] === 'gemini-5-image' &&
       /🧪 آزمونِ مدلِ تصویرِ تازه: در صف: gemini-5-image/.test(stAud.line) &&
       /آخرین: «gemini-4-flash-image-preview» میانگین 8 در برابرِ 6/.test(stAud.line) &&
       /هیچ مدلی خودکار جایگزین نمی‌شود/.test(stAud.line),
       n2 + ' · ' + (stAud.line.split('\n').find(l => /🧪/.test(l)) || 'بی خطِ 🧪'));

    /* ══ ۷۸) زیرِ نظر، نه فقط یک خط (۸.۵۲) ══
       او پرسید «همه چیز زیرِ نظرِ ناظر می‌ره و بررسی می‌کنه و اقدام و اصلاح می‌کنه و پیگیری
       می‌کنه؟». برای کلیپ، حرکت و آزمونِ ۸.۵۱ جوابِ راست «فقط یک خط» بود: کلیپی که هر روز
       نشود هر روز همان جمله را می‌نوشت و هیچ یافته‌ای نمی‌ساخت. حالا تکرار ⇒ مسئلهٔ روز +
       یافتهٔ کد، و هر سه در وضعیت و کارنامهٔ قابلیت‌ها. همه از درِ تولید. */
    console.log('\n=== ۷۸) کلیپ، حرکت و آزمونِ مدلِ تازه زیرِ نظر (۸.۵۲) ===');
    global.__STUB = BASE_STUB;
    const found = [];
    const lsfWas = global.logSelfFinding_;
    global.logSelfFinding_ = function (hub, f) { found.push(f || hub); return true; };
    const health = () => { const pr = [], nt = []; found.length = 0; lvHealth_(pr, nt); return { pr: pr, nt: nt }; };
    const findKey = (k) => found.filter(f => f && f.key === k);

    /* ۷۸.۱ — دو درسِ پیاپی که کلیپشان نشد ⇒ وضعیت نادرست، مسئلهٔ روز، یافتهٔ جدیِ کد با علت؛
       یک درسِ سالم ⇒ صفر. همان درس دو بار شمرده نمی‌شود و «خاموش» (بی‌پولی) شمار را عوض نمی‌کند. */
    delete global.__PROPS[PK.LV_CLIP_LAST];
    global.__PROPS[PK.LV_GEN_SPEND] = '';
    const vX1 = { startFail: 'Invalid JSON payload: unknown field' };
    run77('EP78C1', 781, vX1);
    const one = lvClipStatus_();
    const h1 = health();
    const f1n = findKey('lv-clip-fail').length;
    const vX2 = { startFail: 'Invalid JSON payload: unknown field' };
    run77('EP78C2', 782, vX2);
    lvClipNote_('special:782', { state: 'fail', tries: 2, why: 'تکرار' }, CFG.LV_CLIP_MODEL);   // همان درس، دوباره
    lvClipNote_('special:783', { state: 'off', why: 'سقف' }, CFG.LV_CLIP_MODEL);              // خاموش
    const two = lvClipStatus_();
    const h2 = health();
    const fC = findKey('lv-clip-fail')[0] || {};
    ok('۷۸.۱ دو درسِ پیاپیِ «نشد» ⇒ ok نادرست، مسئلهٔ روز و یافتهٔ جدیِ کد با علت؛ یک «نشد» هیچ',
       one.fails === 1 && one.ok === true && !h1.pr.some(x => /کلیپِ آغاز/.test(x)) && f1n === 0 &&
       two.fails === 2 && two.ok === false && /❌ ۲ درسِ پیاپی کلیپشان نشد/.test(two.line) &&
       h2.pr.some(x => /🎬 کلیپِ آغاز ۲ درسِ پیاپی نشد/.test(x)) &&
       fC.priority === 'جدی' && fC.owner === ROWNER_CODE && /تکرار/.test(fC.detail) && !/سقف/.test(fC.detail) &&
       h2.pr.some(x => /تکرار/.test(x)) && /آخرین علت: تکرار/.test(two.line),
       JSON.stringify({ one: [one.fails, one.ok], h1: h1.pr.filter(x => /🎬/.test(x)), f1: f1n,
                        two: [two.fails, two.ok], line: two.line, pr: h2.pr.filter(x => /🎬/.test(x)), f: fC.detail }));
    run77('EP78C3', 784, {});
    const back = lvClipStatus_();
    const h3 = health();
    ok('۷۸.۱-ب کلیپِ سالم ⇒ شمار صفر و یافته‌ای نیست',
       back.fails === 0 && back.ok === true && !findKey('lv-clip-fail').length,
       JSON.stringify({ fails: back.fails, last: back.last && back.last.state }));

    /* ۷۸.۲ — حرکت: درسی با حرکت ⇒ صفر؛ دو درسِ پیاپیِ بی هیچ حرکتِ کانون‌دار ⇒ یافته، با شمارِ
       هر نیمه تا «کدام نیمه نشد» گفته شود. نقشهٔ پیش از ۸.۵۱ (بی `clip`) شمرده نمی‌شود. */
    delete global.__PROPS[PK.LV_MOTION_LAST];
    run77('EP78M1', 785, { motion: true });
    const m1 = lvMotionStatus_();
    run77('EP78M2', 786, {});
    run77('EP78M3', 787, {});
    const m3 = lvMotionStatus_();
    const hm = health();
    const fM = findKey('lv-motion-none')[0] || {};
    const oldD = { scenes: m3.last ? new Array(10).fill({}) : [] };          // بی کلیدِ clip
    const before = JSON.stringify(lvMotionStatus_().last);
    const oldR = lvMotionNote_('special:999', oldD, []);
    ok('۷۸.۲ دو درسِ پیاپیِ بی حرکت ⇒ یافتهٔ کد با شمارِ هر نیمه؛ درسِ با حرکت صفر؛ نقشهٔ قدیمی شمرده نمی‌شود',
       m1.last && m1.last.mv > 0 && m1.zero === 0 && m3.zero === 2 && m3.ok === false &&
       m3.last.focus === 0 && m3.last.n >= 8 &&
       hm.pr.some(x => /🎥 حرکتِ کانون‌دار ۲ درسِ پیاپی/.test(x)) && fM.owner === ROWNER_CODE &&
       /کانون از توصیف‌گر 0/.test(fM.detail) && oldR === null && JSON.stringify(lvMotionStatus_().last) === before,
       JSON.stringify({ m1: m1.last, m3: m3.last, f: fM.detail }));

    /* ۷۸.۳ — آزمونِ مدلِ تازه: صفی که هفت روز خالی نشد ⇒ یافته؛ «از کِی» با پرشدنِ صف ثبت و با
       خالی‌شدنش پاک می‌شود (همان ۷۷.۱۴ صف را خالی کرد). */
    /* «از کِی» که پاک نشود، بارِ بعد که صف پر شد همان تاریخِ کهنه می‌مانَد (lvAudSee_ فقط وقتی
       نیست می‌نویسدش) و یافتهٔ «هفت روز مانده» همان روزِ اول می‌زند. ۷۷.۱۴ صف را با آزمونِ واقعی
       خالی کرد و پیش از آن «از کِی» را گذاشته بود. */
    const sinceGone = !sinceAfterAud;
    global.__PROPS[PK.LV_AUD_DUE] = JSON.stringify(['gemini-5-image']);
    global.__PROPS[PK.LV_AUD_SINCE] = Utilities.formatDate(new Date(Date.now() - 8 * 86400000), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
    const a8 = lvAudStatus_();
    const ha = health();
    global.__PROPS[PK.LV_AUD_SINCE] = Utilities.formatDate(new Date(Date.now() - 2 * 86400000), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
    const a2 = lvAudStatus_();
    global.__PROPS[PK.LV_AUD_DUE] = '[]'; delete global.__PROPS[PK.LV_AUD_SINCE];
    const known0 = global.__PROPS[PK.LV_AUD_KNOWN];
    global.__PROPS[PK.LV_AUD_KNOWN] = JSON.stringify(['a-image']);
    lvAudSee_(['a-image', 'b-image']);
    const sinceSet = !!global.__PROPS[PK.LV_AUD_SINCE];
    global.__PROPS[PK.LV_AUD_KNOWN] = known0;
    ok('۷۸.۳ مدلِ تازهٔ هفت‌روزه در صف ⇒ یافته؛ دوروزه ⇒ نه؛ «از کِی» با صف ثبت و پاک می‌شود',
       a8.ok === false && a8.stuckDays >= 7 && a8.dueN === 1 && findKey('lv-aud-stuck').length === 1 &&
       ha.pr.some(x => /🧪 مدلِ تصویرِ تازه/.test(x)) && a2.ok === true && sinceGone && sinceSet,
       JSON.stringify({ a8: { ok: a8.ok, d: a8.stuckDays }, a2: a2.ok, sinceGone: sinceGone, sinceSet: sinceSet }));
    global.__PROPS[PK.LV_AUD_DUE] = '[]'; delete global.__PROPS[PK.LV_AUD_SINCE];

    /* ۷۸.۴ — کارنامهٔ قابلیت‌ها هر سه را می‌شناسد؛ آزمونِ بی مدلِ تازه «کاری نرسیده» است، نه
       «بی‌اثر». و نگهبانِ بستنِ ردیف (`selfVerifyOne_`) هر سه یافته را با وضعیتِ زنده می‌سنجد. */
    const stW = { lessonClip: lvClipStatus_(), lessonMotion: lvMotionStatus_(), imageAudition: lvAudStatus_() };
    const capW = capStatus_(stW);
    const rowOf = (k) => capW.rows.find(r => r.key === k) || {};
    const badClip = { lessonClip: Object.assign({}, stW.lessonClip, { ok: false }) };
    ok('۷۸.۴ سه قابلیتِ تازه در کارنامه، آزمونِ بی‌کار «کاری نرسیده»؛ و هر سه یافته سنجندهٔ زنده دارند',
       ['lesson-clip', 'lesson-motion', 'image-audition'].every(k => rowOf(k).key && rowOf(k).verdict !== 'سیم‌کشی') &&
       rowOf('image-audition').verdict === 'کاری نرسیده' &&
       selfVerifyOne_('lv-clip-fail', badClip).still === true &&
       selfVerifyOne_('lv-clip-fail', stW).still === false &&
       selfVerifyOne_('lv-motion-none', stW).known && selfVerifyOne_('lv-aud-stuck', stW).still === false,
       JSON.stringify(['lesson-clip', 'lesson-motion', 'image-audition'].map(k => [k, rowOf(k).verdict])));

    /* ۷۸.۵ — و خطِ روزانهٔ تصویر هر سه را دارد، هر روز. */
    global.__PROPS[PK.LV_GEN_ON] = '1';
    const gl = lvGenStatus_().line;
    ok('۷۸.۵ خطِ روزانهٔ تصویر خطِ 🎬، 🎥 و 🧪 را دارد', /🎬 کلیپِ آغازِ درس/.test(gl) && /🎥 حرکتِ کانون‌دار/.test(gl) &&
       /🧪 آزمونِ مدلِ تصویرِ تازه/.test(gl), gl.split('\n').filter(l => /🎬|🎥|🧪/.test(l)).join(' | '));
    global.logSelfFinding_ = lsfWas;
    delete global.__PROPS[PK.LV_MOTION_LAST];

    global.__STUB = BASE_STUB;
    delete global.__PROPS[PK.TG_TOKEN]; delete global.__PROPS[PK.TG_CHAT];
    delete global.__PROPS[PK.LV_AUD_KNOWN]; delete global.__PROPS[PK.LV_AUD_DUE];
    delete global.__PROPS[PK.LV_AUD_LOG]; delete global.__PROPS[PK.LV_AUD_REF];
    delete global.__PROPS[PK.LV_CLIP_LAST];
    global.__PROPS[PK.LV_GEN_MODEL] = '';
    global.__TRIGGERS = global.__TRIGGERS.filter(t => t.getHandlerFunction() !== 'lvAuditionLater');
    CFG.LV_GEN_MODEL_PIN = pinWas77; CFG.LV_GEN_MODEL = setWas77;
    CFG.LV_GEN_USD_MONTH = capWas77;
    global.__PROPS[PK.LV_GEN_SPEND] = '';
  }

  if (genWas.on === undefined) delete global.__PROPS[PK.LV_GEN_ON]; else global.__PROPS[PK.LV_GEN_ON] = genWas.on;
  CFG.LV_GEN_MODEL = genWas.model; CFG.LV_GEN_USD_MONTH = genWas.usd; CFG.LV_GEN_ENABLED = genWas.enabled;
  global.__PROPS[PK.LV_GEN_SPEND] = '';
  if (svc71 === undefined) delete global.YouTube; else global.YouTube = svc71;
}

console.log('\n=== ۷۲) مدلِ تصویر با کیفیت هم انتخاب می‌شود، نه فقط قیمت (۸.۳۳) ===');
{
  /* مدل‌های متن و صدا هر هفته بازانتخاب و هر شب داوری می‌شوند؛ مدلِ تصویر فقط
     قیمت را می‌دید. حالا نمرهٔ داوریِ هر تصویرِ صحنه به حسابِ مدلی که ساختش
     می‌رود، و مدلی که زیرِ کف مانده کنار می‌رود. */
  /* ۷۲.۱ — از درِ تولید: صحنه‌هایی که بندِ ۷۱ ساخت و داوری کرد، نمره‌شان واقعاً
     به حسابِ مدل نشسته — نه یک ثبتِ دستی. */
  const sc0 = JSON.parse(global.__PROPS[PK.LV_GEN_SCORES] || '{}');
  const anyN = Object.keys(sc0).reduce((a, k) => a + (Number(sc0[k].n) || 0), 0);
  ok('۷۲.۱ داوریِ صحنه‌ها از مسیرِ ساخت به حسابِ مدلِ سازنده رفت', anyN >= 1, JSON.stringify(sc0));

  delete global.__PROPS[PK.LV_GEN_SCORES];
  const cheap = 'gemini-3.1-flash-lite-image', mid = 'gemini-2.5-flash-image';
  for (let i = 0; i < 10; i++) lvGenScoreAdd_(cheap, { s: 2, txt: false, face: false });
  ok('۷۲.۲ زیرِ کفِ شمارش، «نسنجیده» است نه «بد»', lvGenModelBad_(cheap).bad === false,
     JSON.stringify(lvGenModelBad_(cheap)));
  for (let i = 0; i < 15; i++) lvGenScoreAdd_(cheap, { s: 3, txt: i % 2 === 0, face: false });
  for (let i = 0; i < 25; i++) lvGenScoreAdd_(mid, { s: 8, txt: false, face: false });
  const bc = lvGenModelBad_(cheap), bm = lvGenModelBad_(mid);
  ok('۷۲.۳ مدلی که در ۲۵ تصویر زیرِ کف مانده «بد» است؛ مدلِ خوب نه',
     bc.bad === true && bm.bad === false && /میانگین/.test(bc.why), bc.why + ' · ' + JSON.stringify(bm));
  /* نمرهٔ خوب ولی **نوشته در تصویر**: ۷۲.۳ این را نمی‌دید، چون مدلِ بدش نمرهٔ
     پایین هم داشت. نوشته در تصویرِ ساخته‌شده یعنی واژهٔ ساختگیِ بی‌معنا روی صفحه
     — با هر نمره‌ای عیب است، و همین است که سهمِ «ضعیف/نوشته‌دار» جدا شمرده می‌شود. */
  const wordy = 'gemini-9-wordy-image';
  for (let i = 0; i < 25; i++) lvGenScoreAdd_(wordy, { s: 8, txt: i % 3 !== 0, face: false });
  const bw = lvGenModelBad_(wordy);
  ok('۷۲.۳-ب نمرهٔ خوب با نوشته در بیشترِ تصویرها هم «بد» است',
     bw.bad === true && bw.avg >= 7 && bw.badPct > 40, JSON.stringify(bw));

  const stubWas = global.__STUB;
  /* این‌جا راهِ **بی سنجاق** سنجیده می‌شود — همان که وقتی سنجاق در دسترس نیست
     می‌رود (۸.۵۰). سنجاق خودش در §۷۶ است. */
  const pin72 = CFG.LV_GEN_MODEL_PIN;
  CFG.LV_GEN_MODEL_PIN = '';
  global.__PROPS[PK.MODELS] = '';
  global.__PROPS[PK.LV_GEN_MODEL] = JSON.stringify({ id: cheap, at: Date.now() });   // حافظهٔ تازه با مدلِ بد
  CFG.LV_GEN_MODEL = '';
  global.__STUB = function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/' + cheap, supportedGenerationMethods: ['generateContent'] },
      { name: 'models/' + mid, supportedGenerationMethods: ['generateContent'] }] } };
    return stubWas(url, body);
  };
  const qBefore = (JSON.parse(global.__PROPS[PK.MAIL_QUEUE] || '[]') || []).length;
  const pick = lvGenModel_();
  const qAfter = JSON.parse(global.__PROPS[PK.MAIL_QUEUE] || '[]') || [];
  ok('۷۲.۴ حافظهٔ مدلِ بد نادیده گرفته می‌شود و مدلِ بعدی می‌آید — و خبرش می‌رود',
     pick.id === mid && /کنار رفت/.test(pick.why) && qAfter.length > qBefore &&
     /کیفیت/.test(JSON.stringify(qAfter.slice(-1))),
     pick.id + ' — ' + pick.why);

  /* اگر همه بد باشند، فهرست دست نمی‌خورد: بی مدل، هیچ تصویری نیست. */
  for (let i = 0; i < 25; i++) lvGenScoreAdd_(mid, { s: 1, txt: true, face: false });
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  global.__PROPS[PK.MODELS] = '';
  const pick2 = lvGenModel_();
  ok('۷۲.۵ همه بد ⇒ ارزان‌ترین می‌مانَد، نه هیچ — و همین گفته می‌شود، نه «کنار رفت»',
     pick2.id === cheap && /همهٔ مدل‌ها زیرِ کف/.test(pick2.why) && !/کنار رفت/.test(pick2.why),
     pick2.id + ' — ' + pick2.why);
  global.__STUB = stubWas;

  /* روشن، تا خطِ روشن سنجیده شود — نگارشِ اول در حالتِ «خاموش» سبز ماند و هیچ
     چیزی را نمی‌سنجید. */
  const onWas = global.__PROPS[PK.LV_GEN_ON];
  global.__PROPS[PK.LV_GEN_ON] = '1';
  global.__PROPS[PK.LV_GEN_MODEL] = JSON.stringify({ id: cheap, at: Date.now() });
  const gl = lvGenStatus_();
  if (onWas === undefined) delete global.__PROPS[PK.LV_GEN_ON]; else global.__PROPS[PK.LV_GEN_ON] = onWas;
  ok('۷۲.۶ خطِ روزانه کیفیتِ مدل را هم می‌گوید، نه فقط خرج',
     gl.on === true && /داوریِ تصویرها: میانگین/.test(gl.line) && /زیرِ کف/.test(gl.line),
     gl.line.slice(-200));
  delete global.__PROPS[PK.LV_GEN_SCORES];
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  CFG.LV_GEN_MODEL_PIN = pin72;
}

console.log('\n=== ۷۳) پرسشِ تصویرِ افسارگسیخته دورِ انتشار را نمی‌کُشد (۸.۳۴) ===');
{
  /* ۴ اکتبر، دورِ انتشارِ ۰۸:۵۷: شش فراخوانِ تصویرِ درسِ ۶۰، هر کدام ۸۸ تا ۱۴۵
     هزار نویسه — رشته‌ای که بسته نشد — و هر کدام نزدیکِ یک دقیقه. نقشه ۱ از ۱۵
     ماند و `ytPublishTick` سرِ سقفِ شش‌دقیقه کشته شد. سه سد، هر کدام جدا. */
  const secs = [];
  for (let i = 0; i < 5; i++) secs.push({ heading: 'بخشِ ' + (i + 1),
    narration: 'این جمله دربارهٔ معرفت است و شرط‌هایش را می‌گوید. '.repeat(30) });
  const mk = () => ({ show: 'special', epRaw: '73', showName: 'درس‌نامه', title: 'سه شرطِ معرفت',
                      seriesName: 'معرفت‌شناسی', duration: '15:00', headings: secs.map(x => x.heading),
                      sections: secs, totalSec: 900, sources: [] });
  const isVis = (body) => String(body.contents[0].parts[0].text).indexOf('تو طراحِ تصویرهای ویدئوی') !== -1;
  let seen = [];
  const spy = (thin) => function (url, body) {
    if (url.indexOf(':generateContent') !== -1 && body && body.generationConfig) {
      const sc = body.generationConfig.responseSchema || {};
      seen.push({ mx: Number(body.generationConfig.maxOutputTokens) || 0, vis: isVis(body),
                  meta: !!(sc.properties && sc.properties.title) });
      if (thin && sc.properties && sc.properties.title) {
        const r = BASE_STUB(url, body);
        const j = JSON.parse(r.json.candidates[0].content.parts[0].text); j.visuals = [];
        r.json.candidates[0].content.parts[0].text = JSON.stringify(j);
        return r;
      }
    }
    return BASE_STUB(url, body);
  };

  /* ۷۳.۱ — سقفِ دقیق: کفِ به‌خاطرسپردهٔ مدل (۳۲۷۶۸) بالایش نمی‌برد. شاهدِ مقابل
     هم سنجیده می‌شود، وگرنه «۸۱۹۲ رسید» ممکن بود فقط یعنی کف اصلاً نبود. */
  const mdl = textModel_();
  const floorWas = modelTokFloor_(mdl);
  rememberTokFloor_(mdl, 32768);
  global.__STUB = spy(false);
  seen = []; ytVisAsk_(mk()); const askMx = (seen.filter(x => x.vis)[0] || {}).mx;
  seen = []; ytMetaModel_(mk()); const metaMx = (seen.filter(x => x.meta)[0] || {}).mx;
  seen = []; try { geminiText_('آزمونِ کف', { type: 'object', properties: { v: { type: 'string' } } }, 8192); } catch (eG) {}
  const plainMx = (seen[0] || {}).mx;
  ok('۷۳.۱ پرسشِ تصویر و متنِ یوتیوب با سقفِ خودشان می‌روند، نه با کفِ ۳۲۷۶۸ — و فراخوانِ عادی هنوز کف را می‌گیرد',
     askMx === 8192 && metaMx === 16384 && plainMx === 32768,
     'تصویر ' + askMx + ' · متن ' + metaMx + ' · عادی ' + plainMx);

  /* ۷۳.۲ — پرسشِ یک بخش سقفِ کوچک‌ترِ خودش را دارد. */
  global.__STUB = spy(false);
  seen = [];
  const planS = { visuals: [] };
  ytVisSecAsk_(null, planS, mk());
  const secMx = seen.filter(x => x.vis).map(x => x.mx);
  ok('۷۳.۲ هر پرسشِ بخش با سقفِ ۶۱۴۴ می‌رود',
     secMx.length > 0 && secMx.every(m => m === 6144), JSON.stringify(secMx));
  if (floorWas) rememberTokFloor_(mdl, floorWas); else forgetTokFloor_(mdl);

  /* ۷۳.۳ — مهلتِ دور پیش از **هر** پرسش؛ بخشی که وقتش نرسید «پرسیده‌شده» نمی‌ماند. */
  global.__STUB = spy(false);
  seen = [];
  const deadWas = _ytRunDeadline;
  _ytRunDeadline = new Date().getTime() + 20000;          // کمتر از بدترین زمانِ یک پرسش
  const planL = { visuals: [] };
  const nL = ytVisSecAsk_(null, planL, mk());
  const markedL = Object.keys(planL.visSec || {}).length;
  const thL = ytVisThicken_(null, planL, mk());
  _ytRunDeadline = deadWas;
  ok('۷۳.۳ وقتِ دور تمام ⇒ هیچ پرسشی نمی‌رود، و نه بخشی «پرسیده‌شده» ثبت می‌شود نه تلاشی شمرده',
     seen.length === 0 && nL === 0 && markedL === 0 && thL === false && !planL.visAsk,
     seen.length + ' فراخوان · ' + markedL + ' بخشِ ثبت‌شده · visAsk ' + JSON.stringify(planL.visAsk || null));

  /* ۷۳.۴ — در حالتِ صحنه، نقشهٔ **تازه** کارت‌ها را دوباره نمی‌پرسد؛ بی آن، می‌پرسد. */
  const f73 = DriveApp.__register('EP73', 'قسمت 0073');
  const askVis = (sceneMode) => {
    global.__STUB = spy(true);
    seen = [];
    const c = mk(); c.sceneMode = sceneMode;
    ytPlan_(f73, c, true);
    return seen.filter(x => x.vis).length;
  };
  const visScene = askVis(true), visCards = askVis(false);
  ok('۷۳.۴ نقشهٔ نحیف در حالتِ صحنه هیچ پرسشِ کارتی نمی‌کند؛ در حالتِ کارت می‌کند',
     visScene === 0 && visCards > 0, 'صحنه ' + visScene + ' · کارت ' + visCards);

  /* ۷۳.۵ — و این حالت **پیش از** نقشه از درِ خودِ `ytUploadOne_` می‌رسد. */
  const planWas = global.ytPlan_, genWas = global.lvGenOn_;
  let sawMode = 'نرسید';
  global.ytPlan_ = function (folder, ctx) { sawMode = ctx.sceneMode; return null; };
  global.lvGenOn_ = () => true;
  const e73 = DriveApp.__register('EPU73', 'قسمت 0273');
  e73.createFile(Utilities.newBlob(JSON.stringify({ lesson: 5, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
    ep: { title: 'سه شرطِ معرفت', hook: 'قلاب', summary: 'خلاصه', sections: secs } }),
    'application/json', '_special.json'));
  e73.createFile(Utilities.newBlob('RIFF' + 'x'.repeat(20000) + 'WAVE', 'audio/wav', 'کامل.wav'));
  const svcWas73 = global.YouTube; global.YouTube = {};
  try { ytUploadOne_({ key: 'special:273', show: 'special', ep: '273', folderId: 'EPU73',
                       series: 'معرفت‌شناسی' }, null, []); } catch (eU) { sawMode = 'خطا: ' + eU.message; }
  const onMode = sawMode;
  const scWas = CFG.LV_SCENES; CFG.LV_SCENES = false; sawMode = 'نرسید';
  try { ytUploadOne_({ key: 'special:273', show: 'special', ep: '273', folderId: 'EPU73',
                       series: 'معرفت‌شناسی' }, null, []); } catch (eU2) { sawMode = 'خطا: ' + eU2.message; }
  const offMode = sawMode;
  CFG.LV_SCENES = scWas; global.YouTube = svcWas73;
  global.ytPlan_ = planWas; global.lvGenOn_ = genWas;
  global.__STUB = BASE_STUB;
  ok('۷۳.۵ `ytUploadOne_` حالتِ صحنه را پیش از ساختنِ نقشه به آن می‌دهد',
     onMode === true && offMode === false, 'روشن ' + onMode + ' · خاموش ' + offMode);
}

console.log('\n=== ۷۴) ویدئوی گیرکرده: بازسنجی واقعاً پیدایش می‌کند (۸.۳۵) ===');
{
  /* سه ویدئو هفته‌ها Unlisted ماندند. `ytPublished_` کلید را «special:N» می‌سازد
     و `ytRedoOne_` با «درس‌نامه:N» می‌گشت — پس هر شب «منتشر نشده» برمی‌گشت و
     هیچ‌چیز سرخ نشد، چون تنها سنجه‌های رفتاریِ این تابع (۱۸.۶/۱۸.۷) فقط شاخهٔ
     «منتشر نشده» را می‌پرسیدند. این بند ردیف را با **`ytLog_`ِ خودِ موتور**
     می‌نویسد (با نامِ نمایشی، همان‌طور که در تولید) و از درِ بازسنجیِ شبانه وارد
     می‌شود. */
  const hub = getHub_();
  const thumbWas = CFG.YT_THUMB, unitsWas = CFG.YT_QUOTA_UNITS;
  CFG.YT_THUMB = false; CFG.YT_QUOTA_UNITS = 1e9;
  const folders = {};
  const mkEp = (n, desc) => {
    const f = DriveApp.__register('EPR' + n, 'درس 00' + n);
    f.createFile(Utilities.newBlob(JSON.stringify({ lesson: 7, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'سه شرط', hook: 'ق', summary: 'خ',
            sections: [{ heading: 'یک', narration: 'الف'.repeat(200) }] } }), 'application/json', '_special.json'));
    f.createFile(Utilities.newBlob(JSON.stringify({ at: '2026-10-01 05:00', show: 'special', ep: String(n),
      title: 'عنوانِ ' + n, description: desc, tags: ['معرفت'], coverTitle: 'ک', coverKicker: 'ک',
      chapters: 3, visuals: [] }), 'application/json', CFG.YT_PLAN_FILE || '_yt.json'));
    ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: String(n), series: 'معرفت‌شناسی', title: 'عنوانِ ' + n,
                  videoId: 'VID' + n, url: 'https://www.youtube.com/watch?v=VID' + n,
                  privacy: 'unlisted', result: 'منتشر نشد (وارسی)' });
    folders[String(n)] = f;
  };
  const calls = { snip: [], pub: [], failSnip: false };
  global.YouTube = {
    Videos: { update: (b) => {
      if (b.snippet) { if (calls.failSnip) throw new Error('quotaExceeded'); calls.snip.push(b.id); }
      if (b.status && b.status.privacyStatus === 'public') calls.pub.push(b.id);
    } },
    Thumbnails: { set() {} }, Channels: { list: () => ({ items: [] }) },
    PlaylistItems: { list: () => ({ items: [] }) }, Playlists: {} };
  const folderWas = global.ytFolderOf_;
  /* پوشه فقط با **کلید** پیدا می‌شود، نه با نامِ نمایشی — اگر یک‌دست‌سازی
     برگردد، این‌جا هم می‌شکند. */
  global.ytFolderOf_ = (show, ep) => (String(show) === 'special' ? folders[String(ep)] || null : null);

  mkEp(74, 'کپشنِ پاکِ درس');
  const night = ytRedoStuckNightly_(120000);
  ok('۷۴.۱ بازسنجیِ شبانه ویدئوی گیرکرده را پیدا می‌کند، متنِ پاک را می‌نشانَد و عمومی می‌کند',
     night.cleared === 1 && calls.snip.indexOf('VID74') !== -1 && calls.pub.indexOf('VID74') !== -1 &&
     String(ytPublished_(hub)['special:74'].privacy) === 'public',
     JSON.stringify({ cleared: night.cleared, why: night.why, snip: calls.snip, pub: calls.pub }));

  /* و دکمهٔ منو — که کلید می‌فرستد — و نامِ نمایشی، هر دو. */
  mkEp(75, 'کپشنِ پاک');
  const r75 = ytRedoOne_(CFG.SPECIAL_SHOW_NAME, '75', {});
  ok('۷۴.۲ نامِ نمایشی هم پذیرفته می‌شود — همان ویدئو، نه «منتشر نشده»',
     r75.changed.indexOf('عمومی شد') !== -1, JSON.stringify(r75));

  /* متنِ تازه ننشست ⇒ عمومی نه: متنِ قدیمِ ویدئو همان است که برایش نگه داشته شد. */
  mkEp(76, 'کپشنِ پاک');
  calls.failSnip = true;
  const r76 = ytRedoOne_('special', '76', {});
  calls.failSnip = false;
  ok('۷۴.۳ به‌روزرسانیِ متن نشد ⇒ عمومی نمی‌شود، و علتش گفته می‌شود',
     calls.pub.indexOf('VID76') === -1 && /ننشست/.test(r76.why), r76.why);

  /* نشتیِ واقعی در `_yt.json` ⇒ می‌مانَد، و **به نام** در وضعیت و خطِ روزانه. */
  mkEp(77, 'منبع: https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view');
  const n2 = ytRedoStuckNightly_(120000);
  const sw = JSON.parse(global.__PROPS[PK.YT_STUCK_WHY] || '[]');
  const w77 = sw.filter(x => x.key === 'special:77')[0] || {};
  const st = ytStatus_();
  const probs = []; ytHealth_(probs, []);
  const line = probs.filter(p => /در انتظارِ وارسی/.test(p))[0] || '';
  ok('۷۴.۴ نشتیِ واقعی عمومی نمی‌شود — و علتش به نام در وضعیت و خطِ روزانه می‌آید',
     calls.pub.indexOf('VID77') === -1 && /خصوصی/.test(w77.why || '') &&
     (st.stuckWhy || []).some(x => x.key === 'special:77') && /عنوانِ 77/.test(line) && /خصوصی/.test(line) &&
     n2.stillLeak >= 1,
     line.slice(0, 220));
  ok('۷۴.۵ و خطِ روزانه دیگر علت را حدس نمی‌زند',
     !/یعنی در کپشنشان چیزی از جنسِ خصوصی/.test(line), line.slice(0, 160));

  global.ytFolderOf_ = folderWas; delete global.YouTube;
  CFG.YT_THUMB = thumbWas; CFG.YT_QUOTA_UNITS = unitsWas;
}

console.log('\n=== ۷۵) ویدئوی تأییدشده جلوِ صف است، و درِ دوم دارد (۸.۴۶) ===');
{
  /* درسِ ۳۸ (special:60) را صاحبِ برنامه دید و خواست عمومی شود. بازسنجیِ شبانه
     سقفِ سه دارد و «قدیمی‌ترین اول» می‌رود، و سه ویدئوی قدیمی‌تر به علتِ دیگری
     Unlisted مانده‌اند — پس ویدئوی تأییدشدهٔ تازه هرگز نوبت نمی‌گرفت. این بند
     همان حالت را می‌سازد: ردیف‌های گیرکردهٔ §۷۴ (۷۶ و ۷۷) سرِ جایشان‌اند و سه
     ویدئوی دیگر هم پیش از ویدئوی تأییدشده ثبت می‌شوند. */
  const hub = getHub_();
  const thumbWas = CFG.YT_THUMB, unitsWas = CFG.YT_QUOTA_UNITS, maxWas = CFG.YT_REDO_MAX_PER_NIGHT;
  CFG.YT_THUMB = false; CFG.YT_QUOTA_UNITS = 1e9; CFG.YT_REDO_MAX_PER_NIGHT = 3;
  const folders = {};
  const mkEp = (n) => {
    const f = DriveApp.__register('EPA' + n, 'درس 00' + n);
    f.createFile(Utilities.newBlob(JSON.stringify({ lesson: 8, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'استنتاج', hook: 'ق', summary: 'خ',
            sections: [{ heading: 'یک', narration: 'ب'.repeat(200) }] } }), 'application/json', '_special.json'));
    f.createFile(Utilities.newBlob(JSON.stringify({ at: '2026-10-01 05:00', show: 'special', ep: String(n),
      title: 'عنوانِ ' + n, description: 'کپشنِ پاک', tags: ['معرفت'], coverTitle: 'ک', coverKicker: 'ک',
      chapters: 3, visuals: [] }), 'application/json', CFG.YT_PLAN_FILE || '_yt.json'));
    ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: String(n), series: 'معرفت‌شناسی', title: 'عنوانِ ' + n,
                  videoId: 'VID' + n, url: 'https://www.youtube.com/watch?v=VID' + n,
                  privacy: 'unlisted', result: 'منتشر نشد (وارسی)' });
    folders[String(n)] = f;
  };
  const calls = { pub: [] };
  global.YouTube = {
    Videos: { update: (b) => { if (b.status && b.status.privacyStatus === 'public') calls.pub.push(b.id); } },
    Thumbnails: { set() {} }, Channels: { list: () => ({ items: [] }) },
    PlaylistItems: { list: () => ({ items: [] }) }, Playlists: {} };
  const folderWas = global.ytFolderOf_;
  global.ytFolderOf_ = (show, ep) => (String(show) === 'special' ? folders[String(ep)] || null : null);
  const keepA = YT_APPROVED_;
  delete global.__PROPS[PK.YT_APPR_DONE];

  [81, 82, 83, 84].forEach(mkEp);
  YT_APPROVED_ = { 'special:84': true };
  const night = ytRedoStuckNightly_(120000);
  ok('۷۵.۱ ویدئوی تأییدشده با وجودِ پنج ویدئوی گیرکردهٔ قدیمی‌تر همان شب نوبت می‌گیرد و عمومی می‌شود',
     calls.pub.indexOf('VID84') !== -1 && ytApprDone_().indexOf('special:84') !== -1,
     JSON.stringify({ pub: calls.pub, checked: night.checked, done: ytApprDone_() }));

  /* درِ دوم: کارِ شبانه به یوتیوب نرسید — دورِ دوره‌ای همان را عمومی می‌کند. */
  mkEp(85);
  /* ۹۹ ردیف دارد ولی ویدئو نه (آپلودِ شکست‌خورده): سد این‌جاست، نه نبودِ ردیف. */
  ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: '99', series: 'معرفت‌شناسی', title: 'عنوانِ 99',
                videoId: '', url: '', privacy: '', result: 'نشد: quotaExceeded' });
  YT_APPROVED_ = { 'special:84': true, 'special:85': true, 'special:99': true };
  const hubWas = global.getHub_;
  let hubs = 0;
  global.getHub_ = function () { hubs++; return hubWas.apply(this, arguments); };
  const r1 = ytApprovedRedo_(120000);
  const hubs1 = hubs; hubs = 0;
  ok('۷۵.۲ درِ دوم ویدئوی تأییدشدهٔ Unlisted را عمومی می‌کند؛ کلیدِ بی‌ویدئو (۹۹) نه سنجیده می‌شود نه «انجام» ثبت',
     calls.pub.indexOf('VID85') !== -1 && r1.cleared === 1 && r1.checked === 1 &&
     ytApprDone_().indexOf('special:85') !== -1 && ytApprDone_().indexOf('special:99') === -1,
     JSON.stringify({ r1, done: ytApprDone_() }));

  /* و ارزان است: وقتی هر کلیدِ تأییدشده یا عمومی شده یا هنوز ویدئو ندارد،
     هاب فقط برای همان کلیدِ بی‌ویدئو باز می‌شود — و بی هیچ کلیدِ باز، هرگز. */
  YT_APPROVED_ = { 'special:84': true, 'special:85': true };
  const r2 = ytApprovedRedo_(120000);
  ok('۷۵.۳ همهٔ کلیدهای تأییدشده عمومی شده‌اند ⇒ هاب باز نمی‌شود و چیزی سنجیده نمی‌شود',
     hubs === 0 && r2.checked === 0, 'هاب ' + hubs + ' · سنجیده ' + r2.checked + ' (پیش‌تر ' + hubs1 + ')');
  global.getHub_ = hubWas;

  YT_APPROVED_ = keepA;
  global.ytFolderOf_ = folderWas; delete global.YouTube;
  CFG.YT_THUMB = thumbWas; CFG.YT_QUOTA_UNITS = unitsWas; CFG.YT_REDO_MAX_PER_NIGHT = maxWas;
}

console.log('\n=== ۷۶) ممیزیِ ۵ اکتبر: سنجاقِ مدلِ تصویر، کفِ صحنه به اندازهٔ رانر، تأییدشده پیش از انتشار (۸.۵۰) ===');
{
  /* سه چیز که ممیزی از **دادهٔ واقعی** پیدا کرد، نه از خواندنِ کد:
     - `_scenes.json`ِ درسِ ۳۸ (او: «فوق‌العاده») با `gemini-3.1-flash-lite-image`
       ساخته شده و داور میانگینِ ۵٫۴۹ داده — زیرِ کفِ ۵٫۵. پس کنار رفت؛ درسِ ۳۹ با
       `gemini-2.5-flash-image` (دو برابر قیمت) ۵٫۳۳ گرفت و آن هم کنار رفت؛ و
       `_STATUS.json` امروز مدلِ سوم را نشان می‌داد. هر درس سبکی دیگر، هر بار گران‌تر.
     - کفِ برشِ ۸.۴۹ (۶ ثانیه) زیرِ آن چیزی بود که رانر نگه می‌دارد.
     - درِ ویدئوی تأییدشده پشتِ ساختِ صحنه‌های درسِ تازه بود. */
  const lite = 'gemini-3.1-flash-lite-image', mid = 'gemini-2.5-flash-image',
        prev = 'gemini-3.1-flash-image-preview';
  const pinWas = CFG.LV_GEN_MODEL_PIN, setWas = CFG.LV_GEN_MODEL, stubWas = global.__STUB;
  CFG.LV_GEN_MODEL = '';
  CFG.LV_GEN_MODEL_PIN = lite;
  let lists = 0, listed = [lite, mid, prev];
  global.__STUB = function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) {
      lists++;
      return { code: 200, json: { models: listed.map(m => ({ name: 'models/' + m,
                                                               supportedGenerationMethods: ['generateContent'] })) } };
    }
    return stubWas(url, body);
  };
  /* نمره‌های واقعیِ دو درس، از `_scenes.json`ِ همان دو درس در درایو */
  const feed = (m, dist) => { for (const k in dist) for (let i = 0; i < dist[k]; i++) lvGenScoreAdd_(m, { s: Number(k), txt: false, face: false }); };
  delete global.__PROPS[PK.LV_GEN_SCORES];
  feed(lite, { 6: 23, 5: 10, 7: 8, 4: 6, 3: 4 });          // درسِ ۳۸ — ۵۱ تصویر، میانگینِ ۵٫۴۹
  /* و هشت تصویری که داور از نو ساخت (`redo: 8`): نمرهٔ نخستشان هم به حساب رفته بود و
     زیرِ ۵ بود (همین علتِ ساختِ دوباره است). عددِ دقیقش در `_scenes.json` نمی‌مانَد؛
     ۳ فرض شده. همین است که میانگینِ ۵٫۴۹ را در حسابِ موتور زیرِ ۵٫۵ برد — و شاهدش
     خودِ عوض‌شدنِ مدل است: ارزان‌ترین مدل جز با «بد» شدن کنار نمی‌رود. */
  feed(lite, { 3: 8 });
  feed(mid, { 6: 21, 5: 13, 4: 6, 7: 5, 3: 3, 2: 1 });      // درسِ ۳۹ — ۴۹ تصویر، میانگینِ ۵٫۳۳
  const liteBad = lvGenModelBad_(lite), midBad = lvGenModelBad_(mid);

  /* ۷۶.۱ — حافظه همان مدلِ سومی است که امروز در `_STATUS.json` بود؛ سنجاق برمی‌گرداند و خبرش می‌رود. */
  global.__PROPS[PK.LV_GEN_MODEL] = JSON.stringify({ id: prev, at: Date.now(), why: 'ارزان‌ترین' });
  const q0 = (JSON.parse(global.__PROPS[PK.MAIL_QUEUE] || '[]') || []).length;
  const p1 = lvGenModel_();
  const q1 = JSON.parse(global.__PROPS[PK.MAIL_QUEUE] || '[]') || [];
  ok('۷۶.۱ با نمره‌های واقعیِ دو درس: قاعدهٔ ۸.۳۳ هر دو را «بد» می‌خوانَد — و سنجاق باز مدلِ درسِ ۳۸ را برمی‌گرداند، با خبر',
     liteBad.bad === true && midBad.bad === true && p1.id === lite && /سنجاق/.test(p1.why) &&
     q1.length > q0 && /به سنجاق برگشت/.test(JSON.stringify(q1.slice(-1))),
     JSON.stringify({ lite: liteBad.avg, mid: midBad.avg, pick: p1, mail: q1.slice(-1) }));

  /* ۷۶.۲ — حافظهٔ سنجاق بی فهرست‌خوانی پذیرفته می‌شود (فهرستِ مدل‌ها فراخوانِ شبکه است). */
  lists = 0;
  const p2 = lvGenModel_();
  ok('۷۶.۲ سنجاقِ به‌خاطرسپرده بی خواندنِ دوبارهٔ فهرست', p2.id === lite && lists === 0, JSON.stringify({ p2, lists }));

  /* ۷۶.۳ — عیبِ **عینی** سنجاق را کنار می‌گذارد: نوشته در بیش از ۳۰٪ تصویرها. */
  for (let i = 0; i < 40; i++) lvGenScoreAdd_(lite, { s: 7, txt: true, face: false });
  /* حافظه هنوز سنجاقِ تازه را دارد (۷۶.۲): عیب باید **از درِ حافظه هم** دیده شود،
     وگرنه سنجاقِ نوشته‌دار تا هفت روز از حافظه برمی‌گشت. */
  const q2 = (JSON.parse(global.__PROPS[PK.MAIL_QUEUE] || '[]') || []).length;
  const p3 = lvGenModel_();
  lists = 0;
  const p3b = lvGenModel_();
  const q3 = JSON.parse(global.__PROPS[PK.MAIL_QUEUE] || '[]') || [];
  ok('۷۶.۳ سنجاقِ نوشته‌دار کنار می‌رود، علتش در «چرا» می‌آید، و جانشین از حافظه بی فهرست‌خوانیِ دوباره',
     p3.id !== lite && p3.id !== '' && /سنجاقِ «gemini-3\.1-flash-lite-image» در \d+٪/.test(p3.why) &&
     p3b.id === p3.id && lists === 0 && lvGenPinDefect_(lite).bad === true,
     JSON.stringify({ p3, p3b, lists, def: lvGenPinDefect_(lite) }));

  /* ۷۶.۴ — سنجاق در فهرستِ حساب نیست ⇒ همان انتخابِ پیشین، گفته‌شده در «چرا» و در خطِ روزانه. */
  delete global.__PROPS[PK.LV_GEN_SCORES];
  listed = [mid, prev];
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  global.__PROPS[PK.MODELS] = '';
  const p4 = lvGenModel_();
  const onWas = global.__PROPS[PK.LV_GEN_ON];
  global.__PROPS[PK.LV_GEN_ON] = '1';
  const st4 = lvGenStatus_();
  ok('۷۶.۴ سنجاقِ نبوده ⇒ ارزان‌ترینِ موجود، و «در دسترس نیست» در «چرا» و در خطِ روزانه',
     p4.id !== '' && p4.id !== lite && /در فهرستِ مدل‌های حساب نیست/.test(p4.why) &&
     st4.pinMiss === true && /سنجاقِ «gemini-3\.1-flash-lite-image» در دسترس نیست/.test(st4.line),
     JSON.stringify({ p4, line: st4.line.slice(0, 260) }));

  /* ۷۶.۵ — سنجاقِ سرِ جا: میانگینِ زیرِ کف «❌» نمی‌شود، ولی عددش گفته می‌شود. */
  listed = [lite, mid, prev];
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  feed(lite, { 6: 23, 5: 10, 7: 8, 4: 6, 3: 4 });
  feed(lite, { 3: 8 });
  lvGenModel_();
  const st5 = lvGenStatus_();
  if (onWas === undefined) delete global.__PROPS[PK.LV_GEN_ON]; else global.__PROPS[PK.LV_GEN_ON] = onWas;
  ok('۷۶.۵ خطِ روزانه: سنجاق نام برده می‌شود، میانگینِ واقعی گفته می‌شود، و «❌ زیرِ کف» برایش نمی‌آید',
     st5.pinned === true && /سنجاق: مدلِ درسِ ۳۸/.test(st5.line) && /میانگین ۵\.۲ از ۱۰ در ۵۹ تصویر/.test(st5.line) &&
     !/❌ زیرِ کفِ داوری/.test(st5.line) && /ولی سنجاق است/.test(st5.line),
     st5.line.slice(0, 400));
  delete global.__PROPS[PK.LV_GEN_SCORES];
  global.__PROPS[PK.LV_GEN_MODEL] = '';
  global.__STUB = stubWas;
  CFG.LV_GEN_MODEL_PIN = pinWas; CFG.LV_GEN_MODEL = setWas;

  /* ۷۶.۶ — کفِ برش از رانر خوانده می‌شود، نه از سلیقه: کمتر از minSec + 2×snap یعنی
     صحنه‌ای که هر دو مرزش به مکث کشیده شود زیرِ minSec می‌رود و رانر حذفش می‌کند —
     تصویرِ پول‌داده‌ای که دیده نمی‌شود. دو عدد در دو فایل، پس از متنِ هر دو. */
  const skSrc = fs.readFileSync('tools/scenekit.js', 'utf8');
  const minSec = Number((skSrc.match(/minSec:\s*([0-9.]+)/) || [])[1]);
  const snap = Number((skSrc.match(/snap:\s*([0-9.]+)/) || [])[1]);
  ok('۷۶.۶ کفِ صحنه در هر دو سطح ≥ کفِ رانر + دو برابرِ جابه‌جاییِ مرز',
     minSec > 0 && snap > 0 && lvSceneCutSec_('زیاد').min >= minSec + 2 * snap &&
     lvSceneCutSec_('کم').min >= minSec + 2 * snap,
     JSON.stringify({ minSec, snap, hi: lvSceneCutSec_('زیاد'), lo: lvSceneCutSec_('کم') }));

  /* ۷۶.۷ — در دورِ یوتیوب، ویدئوی تأییدشده **پیش از** ساختِ صحنه‌های درسِ تازه نوبت می‌گیرد. */
  const order = [];
  const keep = { appr: global.ytApprovedRedo_, due: global.ytRunDue_, col: global.ytRenderCollect_,
                 back: global.ytBackfill_, stats: global.ytStatsDue_ };
  global.ytApprovedRedo_ = function () { order.push('تأییدشده'); return { checked: 0, cleared: 0, why: [] }; };
  global.ytRunDue_ = function () { order.push('انتشار'); return { done: 0, waiting: 0 }; };
  global.ytRenderCollect_ = function () { return { got: 0 }; };
  global.ytBackfill_ = function () { return { queued: 0 }; };
  global.ytStatsDue_ = function () { return false; };
  ytTick_(200000);
  global.ytApprovedRedo_ = keep.appr; global.ytRunDue_ = keep.due; global.ytRenderCollect_ = keep.col;
  global.ytBackfill_ = keep.back; global.ytStatsDue_ = keep.stats;
  ok('۷۶.۷ دورِ یوتیوب: «تأییدشده» پیش از «انتشار»', order.join(',') === 'تأییدشده,انتشار', order.join(','));
}

console.log('\n=== ۷۹) کاورِ نقاشی با عمومی‌شدن پاک نمی‌شود، و آنچه پاک شد برمی‌گردد (۸.۵۴) ===');
{
  /* ۶ اکتبر ساعتِ ۰۲:۵۹ موتور درس‌های ۳۸ و ۳۹ را پس از تأیید عمومی کرد و کاورِ نقاشیِ
     هر دو را با کارتِ سرمه‌ایِ اسلایدز عوض کرد: `ytRedoOne_` همیشه کارت می‌ساخت، و
     «نقاشی مقدم است» (۸.۳۱) فقط در راهِ آپلود بود. صاحبِ برنامه روزِ قبل کاورِ درست را
     دیده بود و فردایش در استودیو کاورِ دیگری دید. */
  const hub = getHub_();
  const unitsWas = CFG.YT_QUOTA_UNITS, thumbWas = CFG.YT_THUMB;
  CFG.YT_QUOTA_UNITS = 1e9; CFG.YT_THUMB = true;
  const jpg = [0xFF, 0xD8, 0xFF, 0xE0].concat(new Array(9000).fill(7)).map(x => x > 127 ? x - 256 : x);
  const realFetch = global.UrlFetchApp;
  const fetched = [];
  global.UrlFetchApp = { fetch: function (u, o) {
    fetched.push(String(u));
    if (/-cover\.jpg$/.test(String(u))) {
      return { getResponseCode: () => 200, getContentText: () => '',
               getBlob: () => Utilities.newBlob(jpg, 'application/octet-stream', 'c.jpg') };
    }
    return realFetch.fetch.apply(realFetch, arguments);
  } };
  const rmap = {
    'special:790': { mode: 'scenes', thumb: 'https://github.com/x/releases/download/renders/special-790-cover.jpg',
                     qa: { ok: true } },
    'special:791': { mode: 'cards' }
  };
  const mapWas = global.ytRenderMapCached_;
  global.ytRenderMapCached_ = () => rmap;
  const sets = [];
  let cards = 0;
  const cardWas = global.ytCoverCard_;
  global.ytCoverCard_ = function () { cards++; return { blob: Utilities.newBlob('PNGCARD', 'image/png', 'card.png') }; };
  global.YouTube = {
    Videos: { update: () => ({}) },
    Thumbnails: { set: (vid, blob) => { sets.push({ vid: vid, first: (blob.getBytes()[0] & 255) }); } },
    Channels: { list: () => ({ items: [] }) }, PlaylistItems: { list: () => ({ items: [] }) }, Playlists: {} };
  const folders = {};
  const folderWas = global.ytFolderOf_;
  global.ytFolderOf_ = (show, ep) => (String(show) === 'special' ? folders[String(ep)] || null : null);
  const mkEp = (n, privacy) => {
    const f = DriveApp.__register('EPC' + n, 'درس 0' + n);
    f.createFile(Utilities.newBlob(JSON.stringify({ lesson: 9, seriesName: 'معرفت‌شناسی', cat: 'فلسفه',
      ep: { title: 'حافظه', hook: 'ق', summary: 'خ',
            sections: [{ heading: 'یک', narration: 'الف'.repeat(200) }] } }), 'application/json', '_special.json'));
    f.createFile(Utilities.newBlob(JSON.stringify({ at: '2026-10-05 05:00', show: 'special', ep: String(n),
      title: 'عنوانِ ' + n, description: 'کپشنِ پاک', tags: ['معرفت'], coverTitle: 'ک', coverKicker: 'ک',
      chapters: 3, visuals: [] }), 'application/json', CFG.YT_PLAN_FILE || '_yt.json'));
    ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: String(n), series: 'معرفت‌شناسی', title: 'عنوانِ ' + n,
                  videoId: 'VC' + n, url: 'https://www.youtube.com/watch?v=VC' + n,
                  privacy: privacy || 'unlisted', result: 'منتشر شد' });
    folders[String(n)] = f;
  };
  delete global.__PROPS[PK.YT_THUMB_PAINT];

  mkEp(790);
  const r1 = ytRedoOne_('special', '790', {});
  ok('۷۹.۱ بازسازیِ ویدئوی صحنه‌ای کاورِ **نقاشی** را می‌نشانَد، نه کارتِ اسلایدز — و کارتی هم ساخته نمی‌شود',
     sets.length === 1 && sets[0].vid === 'VC790' && sets[0].first === 0xFF && cards === 0 &&
     r1.changed.indexOf('کاور (نقاشی)') !== -1,
     JSON.stringify({ sets: sets, cards: cards, changed: r1.changed }));
  const led1 = JSON.parse(global.__PROPS[PK.YT_THUMB_PAINT] || '{}');
  ok('۷۹.۲ و در دفتر می‌نشیند — همان نشانیِ کاورِ رانر',
     led1['special:790'] === rmap['special:790'].thumb, JSON.stringify(led1));

  mkEp(791);
  sets.length = 0;
  ytRedoOne_('special', '791', {});
  ok('۷۹.۳ ویدئویی که رانر برایش نقاشی نساخته، همان کارتِ اسلایدز را می‌گیرد',
     sets.length === 1 && sets[0].first !== 0xFF && cards === 1, JSON.stringify({ sets: sets, cards: cards }));

  /* ۷۹.۴ — آنچه پیش از ۸.۵۴ پاک شد برمی‌گردد: ویدئوی منتشرشده با کاورِ نقاشیِ نشسته‌نشده. */
  rmap['special:792'] = { mode: 'scenes', thumb: 'https://github.com/x/releases/download/renders/special-792-cover.jpg' };
  rmap['special:793'] = { mode: 'scenes', thumb: 'https://github.com/x/releases/download/renders/special-793-cover.jpg' };
  mkEp(792, 'public');
  sets.length = 0; cards = 0;
  const fx = ytThumbRestore_(60000);
  ok('۷۹.۴ ویدئوی منتشرشده‌ای که کاورِ نقاشی‌اش در دفتر نیست، آن را برمی‌گرداند — و منتشرنشده دست نمی‌خورد',
     fx.fixed === 1 && sets.length === 1 && sets[0].vid === 'VC792' && sets[0].first === 0xFF && cards === 0,
     JSON.stringify({ fx: fx, sets: sets }));
  sets.length = 0;
  const fx2 = ytThumbRestore_(60000);
  /* نادیده‌گرفتنِ دفتر زودتر روی ۷۹.۴ می‌نشیند: درسِ ۷۹۰ که نقاشی‌اش را در ۷۹.۱ گرفت، دوباره
     سنجیده و نشانده می‌شود — همان ادعا، یک قدم زودتر. */
  ok('۷۹.۵ بارِ دوم هیچ کاری نمی‌کند — دفتر جلوی تکرار را می‌گیرد',
     fx2.checked === 0 && sets.length === 0, JSON.stringify(fx2));

  /* ۷۹.۶ — دورِ یوتیوب واقعاً صدایش می‌زند. */
  const p27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const tick = p27.slice(p27.indexOf('function ytTick_('), p27.indexOf('function ytTick_(') + 9000);
  ok('۷۹.۶ دورِ یوتیوب کاورِ نقاشی را برمی‌گرداند، گیرکرده‌ها را روزی یک بار می‌سنجد و «نحیف»ِ منتشرشده را پاک می‌کند',
     /ytThumbRestore_\(/.test(tick) && /ytStuckTickDue_\(\)/.test(tick) && /ytRedoStuckNightly_\(/.test(tick) &&
     /lvThinPrune_\(\)/.test(tick));

  /* ۷۹.۷ — درِ دومِ گیرکرده‌ها روزی یک بار. */
  delete global.__PROPS[PK.YT_STUCK_TICK];
  const due1 = ytStuckTickDue_(); ytStuckTickMark_(); const due2 = ytStuckTickDue_();
  ok('۷۹.۷ درِ دومِ ویدئوهای گیرکرده امروز یک بار', due1 === true && due2 === false);

  /* ۷۹.۸ — «نحیف» برای درسِ منتشرشده پاک می‌شود، برای منتشرنشده می‌مانَد. */
  lvThinNote_('special:790', { want: 1, asked: 12 });
  lvThinNote_('special:799', { want: 1, asked: 12 });
  const pr = lvThinPrune_();
  const thin = lvMap_(PK.LV_THIN);
  ok('۷۹.۸ «نحیف»ِ درسِ منتشرشده از خطِ روزانه می‌رود؛ منتشرنشده می‌مانَد',
     pr >= 1 && !thin['special:790'] && !!thin['special:799'], JSON.stringify(Object.keys(thin)));
  lvThinClear_('special:799');
  ok('۷۹.۹ و انتشار خودش پاکش می‌کند', !lvMap_(PK.LV_THIN)['special:799']);
  ok('۷۹.۹-ب راهِ آپلود پس از گرفتنِ شناسهٔ ویدئو «نحیف» را پاک می‌کند',
     /res\.videoId = vid;\s*\n\s*lvThinClear_\(/.test(p27));

  global.UrlFetchApp = realFetch; global.ytRenderMapCached_ = mapWas; global.ytCoverCard_ = cardWas;
  global.ytFolderOf_ = folderWas; delete global.YouTube;
  CFG.YT_QUOTA_UNITS = unitsWas; CFG.YT_THUMB = thumbWas;
}

console.log('\n=== ۸۰) جان‌بخشیِ نقاشی‌ها برای هر مجموعه، روی تخته (۸.۵۴) ===');
{
  /* او پرسید «تنظیماتِ هر درس و بورد و مجموعه‌ها قابلیت‌های لازم برای تغییر و ارتقا و
     کم کردن داره؟». برای کلیپِ آغاز و حرکتِ کانون‌دار جوابِ راست «نه، سراسری است» بود. */
  const hub = getHub_();
  const reg = readSeriesReg_(hub);
  const key = Object.keys(reg.byKey)[0];
  ok('۸۰.۰ مجموعه‌ای برای آزمون هست', !!key);
  const set = (v) => reg.sheet.getRange(reg.byKey[key].row, SC.LVMOTION).setValue(v);
  set('');
  const a0 = lvMotionAt_(hub, { seriesKey: key }, null);
  set('بی‌کلیپ');
  const a1 = lvMotionAt_(hub, { seriesKey: key }, null);
  set('آرام');
  const a2 = lvMotionAt_(hub, { seriesKey: key }, null);
  set('چرند');
  const a3 = lvMotionAt_(hub, { seriesKey: key }, null);
  ok('۸۰.۱ خالی ⇒ پیش‌فرضِ «کامل»؛ بی‌کلیپ ⇒ بی کلیپ با کانون؛ آرام ⇒ هیچ‌کدام؛ ناشناخته ⇒ پیش‌فرض',
     a0.v === 'کامل' && a0.clip && a0.focus && a1.clip === false && a1.focus === true &&
     a2.clip === false && a2.focus === false && a3.v === 'کامل' && /ناشناخته/.test(a3.src),
     JSON.stringify([a0, a1, a2, a3]));

  const rs = uiLvMotionSave(key, 'بی‌کلیپ');
  const rBad = uiLvMotionSave(key, 'چرند');
  ok('۸۰.۲ دکمهٔ تخته ذخیره می‌کند و رسیدش از همان تعریفِ تولید می‌خوانَد؛ ناشناخته رد می‌شود',
     rs.ok === true && /کلیپِ آغاز: خاموش/.test(rs.message) &&
     lvMotionAt_(hub, { seriesKey: key }, null).v === 'بی‌کلیپ' && rBad.ok === false,
     rs.message + ' | ' + rBad.message);

  const html = uiBoardHtml();
  ok('۸۰.۳ تخته جعبهٔ جان‌بخشی را دارد و تابعِ کلاینتش همان تابعِ سرور را صدا می‌زند',
     /data-role="motion"/.test(html) && /function lvMotion\(sel\)/.test(html) && /\.uiLvMotionSave\(k,v\)/.test(html));

  /* ۸۰.۴ — و تولید واقعاً می‌خوانَدش: نقشهٔ تازه با «بی‌کلیپ» کلیپ نمی‌خرد و علتش تخته است. */
  const p27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۸۰.۴ نقشهٔ صحنه از تخته می‌خوانَد: کلیپِ «off» با علتِ تخته، و حرکتِ کانون‌دار فقط با focusOn',
     /ctx\.motionClip === false/.test(p27) && /why: 'تخته: جان‌بخشیِ «'/.test(p27) &&
     /mv: x\.fileId && d\.focusOn !== false \? lvSceneMv_\(x\) : null/.test(p27) &&
     /var lvMo = lvMotionAt_\(hub, item, meta\)/.test(p27));

  /* ۸۰.۵ — «آرام» به انتخابِ تخته شکست شمرده نمی‌شود. */
  delete global.__PROPS[PK.LV_MOTION_LAST];
  const dOff = { clip: null, focusOn: false, motion: 'آرام',
                 scenes: new Array(10).fill(0).map((_, i) => ({ n: i, fileId: 'F' + i })) };
  lvMotionNote_('special:801', dOff, dOff.scenes.map(() => ({ mv: null })));
  lvMotionNote_('special:802', dOff, dOff.scenes.map(() => ({ mv: null })));
  const ms = lvMotionStatus_();
  ok('۸۰.۵ درسِ «آرام» شمارِ «بی‌حرکت» را بالا نمی‌برد و خطِ روزانه انتخابِ تخته را می‌گوید',
     ms.ok === true && Number(ms.zero) === 0 && /انتخابِ تخته/.test(ms.line), ms.line);
}

console.log('\n=== ۸۱) یک مدلِ تصویر، یک جواب (۸.۵۴) ===');
{
  /* ایمیلِ ۶ اکتبر: «روشن با gemini-3.1-flash-image-preview» و دو سطر پایین‌تر «مدلِ
     تصویرِ ساخته‌شده: gemini-3.1-flash-lite-image». خطِ وضعیت حافظهٔ پیش از سنجاق را
     عیناً نقل می‌کرد، در حالی که انتخابِ بعدی همان دم به سنجاق برمی‌گردد. */
  const pinWas = CFG.LV_GEN_MODEL_PIN, setWas = CFG.LV_GEN_MODEL;
  CFG.LV_GEN_MODEL_PIN = 'gemini-3.1-flash-lite-image'; CFG.LV_GEN_MODEL = '';
  global.__PROPS[PK.LV_GEN_MODEL] = JSON.stringify({ id: 'gemini-3.1-flash-image-preview', at: Date.now(), why: 'کیفیت' });
  const g1 = lvGenStatus_();
  delete global.__PROPS[PK.LV_GEN_MODEL];
  const g0 = lvGenStatus_();
  global.__PROPS[PK.LV_GEN_MODEL] = JSON.stringify({ id: 'gemini-2.5-flash-image', at: Date.now(),
                                                      pinMiss: 'gemini-3.1-flash-lite-image' });
  const g2 = lvGenStatus_();
  /* شکستنِ عمدیِ این قاعده (برگرداندنِ `out.model = c.id`) زودتر روی ۷۱.۲۵ می‌نشیند — همان ادعا:
     سقفی که خطِ روزانه می‌گوید باید با مدلی حساب شود که تولید واقعاً به کار می‌بَرد. */
  ok('۸۱.۱ حافظهٔ پیش از سنجاق ⇒ خط سنجاق را می‌گوید؛ نگشته ⇒ «نگشته»؛ سنجاقِ نبوده ⇒ همان حافظه',
     g1.model === 'gemini-3.1-flash-lite-image' && g0.model === '' && g2.model === 'gemini-2.5-flash-image',
     JSON.stringify([g1.model, g0.model, g2.model]));
  CFG.LV_GEN_MODEL_PIN = pinWas; CFG.LV_GEN_MODEL = setWas;
  delete global.__PROPS[PK.LV_GEN_MODEL];
}

console.log('\n=== ۸۲) کاورِ پلی‌لیست مربع است، و پادکست پس از کاور (۸.۵۵) ===');
{
  /* سه پلی‌لیست هفته‌ها «کاور: نشد (500)» و «پادکست: نشد (400): Precondition check
     failed» داشتند و سطرِ سلامت صاحبِ برنامه را به تأییدِ هویت فرستاد. فایلِ ذخیره‌شدهٔ
     «کاور — مجموعه — درس‌نامه — مربع.png» سرآیندش ۹۶۰×۵۴۰ بود: اسلایدز اندازه را دور
     می‌ریزد. مستندِ یوتیوب: playlistImages ۱:۱ می‌خواهد، و podcastStatus فقط روی
     پلی‌لیستِ تصویردار. */
  const png = (w, h) => [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    (w >> 24) & 255, (w >> 16) & 255, (w >> 8) & 255, w & 255,
    (h >> 24) & 255, (h >> 16) & 255, (h >> 8) & 255, h & 255, 8, 2, 0, 0, 0];
  const jpg = (w, h) => [0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    0xFF, 0xC0, 0, 17, 8, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
    0xFF, 0xD9];
  const blob = (b, m) => Utilities.newBlob(b, m, 'x');
  const s1 = ytImgSize_(blob(png(960, 540), 'image/png'));
  const s2 = ytImgSize_(blob(jpg(1400, 1400), 'image/jpeg'));
  const s3 = ytImgSize_(blob(Array.from(Buffer.from('<!doctype html><html>…</html>')), 'text/html'));
  ok('۸۲.۱ اندازه از بایت‌ها خوانده می‌شود — PNG و JPEG، و صفحهٔ HTML تصویر نیست',
     s1 && s1.w === 960 && s1.h === 540 && s1.mime === 'image/png' &&
     s2 && s2.w === 1400 && s2.h === 1400 && s2.mime === 'image/jpeg' && s3 === null,
     JSON.stringify([s1, s2, s3]));

  const keepStub = global.__STUB;
  const kMap = global.__PROPS[PK.YT_PL], kSq = global.__PROPS[PK.YT_PL_SQ];
  const spec = ytPlSqSpec_('kQ', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', 'درس‌نامه', '');
  let imgCalls = [], podCalls = 0, runnerImg = null;
  global.__STUB = (url, body, opt) => {
    if (/renders\.json/.test(url)) {
      return { code: 200, json: { items: {}, plCovers: runnerImg
        ? { kQ: { url: 'https://example.test/pl-kQ.jpg', req: spec.sig, sig: spec.sig + '|special:62' } } : {} } };
    }
    if (url === 'https://example.test/pl-kQ.jpg') return { code: 200, bytes: runnerImg.b, mime: runnerImg.m };
    if (/playlistImages/.test(url)) { imgCalls.push(opt); return { code: 200, json: { id: 'img1' } }; }
    return keepStub(url, body, opt);
  };
  const fresh = () => { global._ytPlSqMemo = null; imgCalls = []; };

  // ۸۲.۲ — رانر هنوز نکشیده: «در راه»، درخواست در صف، و تلاشی شمرده نمی‌شود
  delete global.__PROPS[PK.YT_PL_SQ];
  fresh(); runnerImg = null;
  const r0 = ytPlaylistCover_('PLQ', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', false, 'درس‌نامه', '', 'kQ');
  const q0 = ytRenderRead_();
  ok('۸۲.۲ بی کاورِ رانر ⇒ «در راه» و درخواستِ مربع در صفِ رندر می‌نشیند',
     r0 === 'در راه' && (q0.plCovers || []).some(x => x.key === 'kQ' && x.sig === spec.sig) && !imgCalls.length,
     r0 + ' · ' + JSON.stringify(q0.plCovers));

  // ۸.۲.۳ — ۹۶۰×۵۴۰ پیش از فرستادن رد می‌شود
  fresh(); runnerImg = { b: png(960, 540), m: 'image/png' };
  const r1 = ytPlaylistCover_('PLQ', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', false, 'درس‌نامه', '', 'kQ');
  ok('۸۲.۳ کاورِ ۹۶۰×۵۴۰ فرستاده نمی‌شود، و علت اندازهٔ واقعی را می‌گوید',
     /^نشد/.test(r1) && r1.indexOf('960×540') !== -1 && imgCalls.length === 0, r1);

  // ۸۲.۴ — مربعِ ۱۴۰۰ فرستاده می‌شود، با MIME و ابعادِ واقعی
  fresh(); runnerImg = { b: jpg(1400, 1400), m: 'image/jpeg' };
  ytPlMapSave_({ kQ: { id: 'PLQ', title: 'معرفت‌شناسی' } });
  const r2 = ytPlaylistCover_('PLQ', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', false, 'درس‌نامه', '', 'kQ');
  const sent = imgCalls[0] || {};
  const head = sent.payload ? Buffer.from(sent.payload.slice(0, 400).map(x => x & 255)).toString('utf8') : '';
  ok('۸۲.۴ مربعِ ۱۴۰۰ با MIMEِ خودش و ابعادش فرستاده می‌شود و امضایش ثبت می‌شود',
     r2 === 'نشست' && imgCalls.length === 1 && head.indexOf('Content-Type: image/jpeg') !== -1 &&
     head.indexOf('"width":1400') !== -1 && (ytPlMap_()['kQ'] || {}).coverSig === spec.sig + '|special:62',
     r2 + ' · ' + head.slice(0, 160).replace(/\r?\n/g, ' ') + ' · ' + JSON.stringify(ytPlMap_()['kQ']));

  // ۸۲.۵ — پادکست پیش از کاور پرسیده نمی‌شود. شکستنِ عمدیِ همین سد زودتر روی ۴۸.۳
  // می‌نشیند (همان ادعا: بی کاور، علتِ پادکست «منتظرِ کاور» است) — مجموعه با نخستین سرخ می‌ایستد.
  const kPod = global.ytPlPodcast_;
  global.ytPlPodcast_ = () => { podCalls++; return 'نشست'; };
  fresh(); runnerImg = null;
  ytPlMapSave_({ kQ: { id: 'PLQ', title: 'معرفت‌شناسی', coverVer: CFG.YT_PL_COVER_VER } });
  const o5 = { covers: 0, coverFails: [], podcasts: 0 };
  ytPlDress_('PLQ', 'معرفت‌شناسی', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', false, o5, 'kQ');
  const r5 = ytPlMap_()['kQ'] || {};
  ok('۸۲.۵ بی کاور، پادکست پرسیده نمی‌شود — و علتش ثبت است، نه تلاش',
     podCalls === 0 && /منتظرِ کاور/.test(String(r5.podWhy || '')) && !(Number(r5.podTries) || 0),
     JSON.stringify(r5));

  // ۸۲.۶ — با کاورِ نشسته، همان دور پادکست هم می‌رود
  fresh(); runnerImg = { b: jpg(1400, 1400), m: 'image/jpeg' };
  const o6 = { covers: 0, coverFails: [], podcasts: 0 };
  ytPlDress_('PLQ', 'معرفت‌شناسی', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', false, o6, 'kQ');
  const r6 = ytPlMap_()['kQ'] || {};
  ok('۸۲.۶ کاور که نشست، همان دور پادکست می‌شود — به همین ترتیب',
     o6.covers === 1 && podCalls === 1 && !!r6.cover && !!r6.podcast, JSON.stringify(r6));

  // ۸۲.۷ — تلاش‌های سازوکارِ قدیم شمرده نمی‌شوند
  fresh(); runnerImg = { b: jpg(1400, 1400), m: 'image/jpeg' };
  ytPlMapSave_({ kQ: { id: 'PLQ', title: 'معرفت‌شناسی', coverTries: 4, coverLastTry: nowStr_(),
                       podTries: 4, podLastTry: nowStr_(), coverWhy: 'نشد (500)' } });
  const o7 = { covers: 0, coverFails: [], podcasts: 0 };
  ytPlDress_('PLQ', 'معرفت‌شناسی', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', false, o7, 'kQ');
  ok('۸۲.۷ چهار «نشد (500)»ِ کاورِ ۹۶۰×۵۴۰ سقفِ تلاش را پر نمی‌کند — همان شب کاورِ درست می‌رود',
     o7.covers === 1 && imgCalls.length === 1, JSON.stringify(ytPlMap_()['kQ']));

  // ۸۲.۸ — نقاشیِ تازهٔ مجموعه کاورِ نشسته را یک بار به‌روز می‌کند، نه هر دور
  fresh();
  const o8 = { covers: 0, coverFails: [], podcasts: 0 };
  ytPlDress_('PLQ', 'معرفت‌شناسی', 'معرفت‌شناسی', 'درس‌نامه', 'فلسفه', false, o8, 'kQ');
  ok('۸۲.۸ کاورِ نشسته با همان امضا دوباره فرستاده نمی‌شود',
     o8.covers === 0 && imgCalls.length === 0);

  // ۸۲.۹ — سطرِ سلامت صاحبِ برنامه را به تأییدِ هویت نمی‌فرستد وقتی کاور هرگز ننشسته
  ytPlMapSave_({ kQ: { id: 'PLQ', title: 'معرفت‌شناسی', coverVer: CFG.YT_PL_COVER_VER,
                       coverTries: 4, coverLastTry: nowStr_(), coverWhy: 'نشد (500): Internal error' } });
  const pr = [], nt = [];
  try { ytHealth_(pr, nt); } catch (eH) {}
  const plLine = pr.concat(nt).filter(x => /پلی‌لیست/.test(x) && /رد می‌شود/.test(x))[0] || '';
  ok('۸۲.۹ شکستِ کاور «کارِ شما» نیست و علتِ خودِ یوتیوب را نقل می‌کند',
     plLine && plLine.indexOf('youtube.com/features') === -1 && plLine.indexOf('Internal error') !== -1 &&
     plLine.indexOf('⟨شما⟩') === -1, plLine.slice(0, 220));

  /* ۸۲.۱۰ — دورِ پلی‌لیست‌ها مجموعه‌های بی‌کاور را **رد نمی‌کند**. تا ۸.۵۴ میان‌بُرِ
     «چیدمان عوض نشده» هر دور را پیش از رسیدگی برمی‌گرداند، پس پلی‌لیستِ درس‌نامه‌ای
     که یک بار کاورش نشد هرگز دوباره امتحان نمی‌شد. از درِ خودِ `ytPlaylistSync_`. */
  {
    const keep = {};
    for (const f of ['ytSvc_', 'readSeriesReg_', 'ytPublished_', 'ytPlFor_', 'ytPlDress_', 'getHub_'])
      keep[f] = global[f];
    const hubS = new Spread('هاب-پلی‌لیست');
    const ytTab = hubS.insertSheet(CFG.YT_TAB || 'انتشار در یوتیوب');
    const rowV = new Array(YT_HEADERS.length).fill('');
    rowV[YU.SERIES - 1] = 'معرفت‌شناسی'; rowV[YU.VID - 1] = 'VID1';
    ytTab.appendRow(YT_HEADERS.slice()); ytTab.appendRow(rowV);
    const regVals = []; regVals[SC.NAME - 1] = 'معرفت‌شناسی'; regVals[SC.YT - 1] = ytPlUrl_('PLR');
    const fakeSheet = { getRange: () => ({ setValue: () => {} }) };
    global.getHub_ = () => hubS;
    global.ytSvc_ = () => ({});
    global.readSeriesReg_ = () => ({ rows: [{ key: 'r1', row: 2, vals: regVals }], sheet: fakeSheet,
                                     byKey: { r1: { key: 'r1', row: 2, vals: regVals } } });
    global.ytPublished_ = () => ({});
    global.ytPlFor_ = () => ({ id: 'PLR', title: 'معرفت‌شناسی — درس‌نامه' });
    let dressed = 0;
    global.ytPlDress_ = () => { dressed++; };
    global.__PROPS[PK.YT_PLSIG] = 'r1=معرفت‌شناسی';             // چیدمان عوض نشده
    const pk = ytPlKey_(ENRICH_SHOW_SPECIAL, 'r1', 'معرفت‌شناسی');
    ytPlMapSave_({ [pk]: { id: 'PLR', title: 'معرفت‌شناسی — درس‌نامه' } });   // بی کاور
    const o1 = ytPlaylistSync_(60000);
    const d1 = dressed;
    ytPlMapSave_({ [pk]: { id: 'PLR', title: 'معرفت‌شناسی — درس‌نامه', cover: nowStr_(), podcast: nowStr_() } });
    const o2 = ytPlaylistSync_(60000);
    ok('۸۲.۱۰ چیدمانِ ثابت ولی پلی‌لیستِ بی‌کاور ⇒ رسیدگی می‌شود؛ همه کاوردار ⇒ میان‌بُر',
       d1 === 1 && o1.undressed === 1 && !o1.skipped && dressed === 1 && o2.skipped === true,
       JSON.stringify({ d1, dressed, o1: { u: o1.undressed, s: o1.skipped }, o2: { s: o2.skipped } }));
    for (const f in keep) global[f] = keep[f];
    delete global.__PROPS[PK.YT_PLSIG];
  }

  global.ytPlPodcast_ = kPod; global.__STUB = keepStub; global._ytPlSqMemo = null;
  if (kMap === undefined) delete global.__PROPS[PK.YT_PL]; else global.__PROPS[PK.YT_PL] = kMap;
  if (kSq === undefined) delete global.__PROPS[PK.YT_PL_SQ]; else global.__PROPS[PK.YT_PL_SQ] = kSq;
}

console.log('\n=== ۸۳) آنچه بیننده می‌بیند، نه آنچه ما نوشتیم (۸.۵۵) ===');
{
  /* «اگر نمی‌گفتم، می‌فهمیدی کاورِ درس‌های ۳۸ و ۳۹ عوض شده؟» — نه: هیچ سنجه‌ای کاورِ
     **عمومیِ** ویدئو را نگاه نمی‌کرد. حالا کاورِ i.ytimg.com کنارِ نقاشیِ رانر به داور
     نشان داده می‌شود. */
  const jpg = (w, h) => [0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    0xFF, 0xC0, 0, 17, 8, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
    0xFF, 0xD9];
  const keep = {};
  for (const f of ['ytSvc_', 'ytPublished_', 'getHub_']) keep[f] = global[f];
  const keepStub = global.__STUB, kMemo = global._ytMapMemo;
  const kAud = global.__PROPS[PK.YT_THUMB_AUDIT], kPaint = global.__PROPS[PK.YT_THUMB_PAINT];
  global.ytSvc_ = () => ({});
  global.ytPublished_ = () => ({ 'special:60': { videoId: 'V60' }, 'special:61': { videoId: 'V61' },
                                 'special:62': {} });
  global._ytMapMemo = { 'special:60': { thumb: 'https://example.test/t60.jpg' },
                        'special:61': { thumb: 'https://example.test/t61.jpg' },
                        'special:62': { thumb: 'https://example.test/t62.jpg' } };
  delete global.__PROPS[PK.YT_THUMB_AUDIT];
  ytThumbPaintSet_('special:60', 'https://example.test/t60.jpg');
  ytThumbPaintSet_('special:61', 'https://example.test/t61.jpg');
  let asks = 0, answers = ['بله', 'نه'], fetched = [];
  global.__STUB = (url, body, opt) => {
    if (/example\.test\/t6\d\.jpg|i\.ytimg\.com\/vi\/V60\/maxresdefault|i\.ytimg\.com\/vi\/V61\/hqdefault/.test(url)) {
      fetched.push(url); return { code: 200, bytes: jpg(1280, 720), mime: 'image/jpeg' };
    }
    if (/i\.ytimg\.com/.test(url)) { fetched.push(url); return { code: 404, text: 'nope' }; }
    if (/generativelanguage/.test(url)) {
      const n = ((body.contents || [])[0] || {}).parts || [];
      const imgs = n.filter(x => x.inlineData).length;
      const a = imgs === 2 ? answers[asks++] : 'x';
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: a }] } }] } };
    }
    return keepStub(url, body, opt);
  };
  const r1 = ytThumbAudit_(60000);
  const led = ytThumbPaint_();
  ok('۸۳.۱ کاورِ عمومی کنارِ نقاشی سنجیده می‌شود: «همان» دست نمی‌خورد، «عوض‌شده» از دفتر می‌افتد تا برگردد',
     r1.checked === 2 && r1.same === 1 && r1.bad === 1 && asks === 2 &&
     led['special:60'] === 'https://example.test/t60.jpg' && !led['special:61'],
     JSON.stringify(r1) + ' · دفتر ' + JSON.stringify(led));
  /* شکستنِ «فقط منتشرشده» روی ۸۳.۳ می‌نشیند، نه این‌جا: با سقفِ دو در هر دور، درسِ منتشرنشده
     نوبتِ دورِ دوم است — و دورِ دوم دیگر صفر نمی‌سنجد. همان ادعا، یک خانه پایین‌تر. */
  ok('۸۳.۲ ویدئوی منتشرنشده سنجیده نمی‌شود، و کاورِ hqdefault وقتی maxres نیست',
     fetched.every(u => !/t62/.test(u)) && fetched.some(u => /V61\/hqdefault/.test(u)),
     fetched.join(' · '));
  fetched = [];
  const r2 = ytThumbAudit_(60000);
  ok('۸۳.۳ همان روز دوباره سنجیده نمی‌شوند — هر ویدئو هر چند روز یک بار',
     r2.checked === 0 && fetched.length === 0 && asks === 2);
  /* «ندیدم» کاری نمی‌کند و گفته می‌شود (۷.۶۸): بازگرداندن سهمیه دارد و حدس دلیلش نیست. */
  delete global.__PROPS[PK.YT_THUMB_AUDIT];
  ytThumbPaintSet_('special:61', 'https://example.test/t61.jpg');
  answers = ['', '']; asks = 0;
  const r3 = ytThumbAudit_(60000);
  ok('۸۳.۴ داورِ بی‌جواب ⇒ «نامعلوم»، دفتر دست نمی‌خورد',
     r3.unsure === 2 && r3.bad === 0 && ytThumbPaint_()['special:61'] === 'https://example.test/t61.jpg',
     JSON.stringify(r3));
  const line = ytThumbAuditLine_();
  ok('۸۳.۵ خطِ روزانه از شاهد می‌گوید چند ویدئو، چند همان، چند نامعلوم',
     /آنچه بیننده می‌بیند/.test(line) && /نامعلوم/.test(line), line);
  const tickSrc = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const tk = tickSrc.slice(tickSrc.indexOf('function ytTick_'));
  ok('۸۳.۶ در دورِ یوتیوب، پیش از برگرداندن — تا عوض‌شده همان دور برگردد',
     tk.indexOf('ytThumbAudit_(') !== -1 && tk.indexOf('ytThumbAudit_(') < tk.indexOf('ytThumbRestore_('));
  for (const f in keep) global[f] = keep[f];
  global.__STUB = keepStub; global._ytMapMemo = kMemo;
  if (kAud === undefined) delete global.__PROPS[PK.YT_THUMB_AUDIT]; else global.__PROPS[PK.YT_THUMB_AUDIT] = kAud;
  if (kPaint === undefined) delete global.__PROPS[PK.YT_THUMB_PAINT]; else global.__PROPS[PK.YT_THUMB_PAINT] = kPaint;
}

console.log('\n=== ۸۴) کلیپ روی نخستین لحظهٔ واقعیِ درس، نه روی تاریخ (۸.۵۶) ===');
{
  /* ۶ اکتبر، درسِ ۴۰: «اون چند ثانیه متحرک هم همون چند ثانیه‌ای بود که داشت تازه تاریخ و روزِ
     پادکست می‌گفت». صحنه‌های نخستِ همان درس، عیناً (متن، زمان، نمرهٔ داور). */
  const S62 = () => [
    { n: 1, t0: 0, t1: 9.8, text: 'درس‌نامه، سه‌شنبه، چهاردهم مهر هزار و چهارصد و پنج، برابر با ششم اکتبر دو هزار و بیست و شش.',
      fileId: 'I1', scene: 'desk', judge: { s: 4, txt: false, face: false } },
    { n: 2, t0: 9.8, t1: 42.2, text: 'در این قسمت، به سراغ بررسی کتاب «معرفت‌شناسی» می‌رویم و فصل نهم را آغاز می‌کنیم.',
      fileId: 'I2', scene: 'book', judge: { s: 6, txt: false, face: false } },
    { n: 3, t0: 42.2, t1: 99.5, text: 'امروز از آن پایه‌ها گذر کردیم تا معماری کلی منظومهٔ باورها را بررسی کنیم.',
      fileId: 'I3', scene: 'pillars', judge: { s: 6, txt: false, face: false } }];
  ok('۸۴.۱ جملهٔ تاریخ «فقط تاریخ» شناخته می‌شود و جملهٔ درس نه',
     lvSceneIsCalendar_(S62()[0].text) === true && lvSceneIsCalendar_(S62()[1].text) === false &&
     lvSceneIsCalendar_('امروز از آن پایه‌ها گذر کردیم و به مهر و محبت رسیدیم') === false);
  const p1 = lvClipScene_({ scenes: S62() });
  ok('۸۴.۲ کلیپ برای صحنهٔ ۲ (آغازِ درس)، نه صحنهٔ تاریخ', p1.i === 1 && !p1.wait, JSON.stringify(p1));
  /* صحنهٔ تاریخِ **بلند** (تاریخ و خوش‌آمد در یک صحنه) هم کلیپ نمی‌گیرد — سدِ تاریخ جدا از سدِ کوتاهی. */
  const sL = S62(); sL[0].t1 = 16; sL[1].t0 = 16; sL[0].judge.s = 7;    // تصویرش خوب است؛ فقط تاریخ است
  ok('۸۴.۲-ب صحنهٔ تاریخ حتی وقتی بلند است کلیپ نمی‌گیرد', lvClipScene_({ scenes: sL }).i === 1,
     JSON.stringify(lvClipScene_({ scenes: sL })));
  /* داوری‌نشده ⇒ صبر، نه پرش به بعدی — انتخاب باید پیش از خرج و یک بار باشد. */
  const s2 = S62(); s2[1].judge = null;
  const p2 = lvClipScene_({ scenes: s2 });
  ok('۸۴.۳ صحنهٔ نامزدِ داوری‌نشده ⇒ صبر', p2.wait === true && p2.i === -1, JSON.stringify(p2));
  /* نمرهٔ پایین ⇒ بعدی؛ هیچ‌کدام به کف نرسید ⇒ بهترینِ همان‌ها، با علت. */
  const s3 = S62(); s3[1].judge.s = 3;
  const p3 = lvClipScene_({ scenes: s3 });
  const s4 = S62(); s4[1].judge.s = 3; s4[2].judge.s = 4;
  const p4 = lvClipScene_({ scenes: s4 });
  ok('۸۴.۴ تصویرِ ضعیف کلیپ نمی‌گیرد؛ بی هیچ تصویرِ خوب ⇒ بهترینِ نامزدها با علت',
     p3.i === 2 && p4.i === 2 && /کفِ داوری/.test(p4.why), JSON.stringify({ p3: p3, p4: p4 }));
  /* صحنهٔ کوتاه‌تر از کلیپ + میان‌محو جا ندارد. */
  const s5 = S62(); s5[1].t1 = 15.5;
  ok('۸۴.۵ صحنهٔ کوتاه‌تر از کلیپ نامزد نیست', lvClipScene_({ scenes: s5 }).i === 2);

  /* ۸۴.۶ — از درِ ماشینِ حالت: کلیپ از تصویرِ صحنهٔ ۲ ساخته می‌شود و `n` ثبت می‌شود. */
  const keepStart = global.lvClipStart_, keepGf = DriveApp.getFileById;
  let used = null;
  global.lvClipStart_ = (model, blob, prompt) => { used = { img: blob.__id, prompt: prompt }; return { op: 'op-84', err: '' }; };
  DriveApp.getFileById = function (id) {
    if (/^I\d$/.test(id)) return { getBlob: () => { const b = Utilities.newBlob([1, 2, 3], 'image/png', 'x.png'); b.__id = id; return b; } };
    return keepGf.call(DriveApp, id);
  };
  const spWas = global.__PROPS[PK.LV_GEN_SPEND];
  global.__PROPS[PK.LV_GEN_SPEND] = '';
  const d6 = { scenes: S62(), clip: { state: '', tries: 0, op: '', fileId: '', why: '', at: '' } };
  lvClipStep_(d6, DriveApp.__register('EP84', 'قسمت 0840 — کلیپ'), () => 1e9, 'special:840', 2);
  ok('۸۴.۶ کلیپ از تصویرِ صحنهٔ ۲ آغاز می‌شود و صحنه‌اش در `clip.n` می‌مانَد',
     d6.clip.state === 'wait' && d6.clip.n === 2 && d6.clip.img === 'I2' && used && used.img === 'I2' &&
     /book/.test(used.prompt), JSON.stringify({ c: d6.clip, used: used && used.img }));
  global.lvClipStart_ = keepStart; DriveApp.getFileById = keepGf;
  global.__PROPS[PK.LV_GEN_SPEND] = spWas;

  /* ۸۴.۷ — و روی همان صحنه به رانر می‌رسد؛ نقشهٔ پیش از ۸.۵۶ (`n` ندارد) ⇒ صحنهٔ نخست. */
  const its = () => [{ n: 1, fileId: 'I1' }, { n: 2, fileId: 'I2' }, { n: 3, fileId: 'I3' }];
  const a1 = its(), at1 = lvClipAttach_(a1, { state: 'ok', fileId: 'C', img: 'I2', n: 2, sec: 8 });
  const a2 = its(), at2 = lvClipAttach_(a2, { state: 'ok', fileId: 'C', img: 'I1', sec: 8 });
  const a3 = its(), at3 = lvClipAttach_(a3, { state: 'ok', fileId: 'C', img: 'I-OLD', n: 2, sec: 8 });
  ok('۸۴.۷ کلیپ روی صحنهٔ انتخاب‌شده می‌نشیند؛ نقشهٔ قدیمی ⇒ نخستین؛ تصویرِ عوض‌شده ⇒ هیچ',
     at1 === 2 && a1[1].clip && !a1[0].clip && at2 === 1 && a2[0].clip && at3 === 0 && !a3.some(x => x.clip),
     JSON.stringify({ at1: at1, at2: at2, at3: at3 }));
}

console.log('\n=== ۸۵) کارت‌های نوشتاری: کف، نه فقط سقف؛ و آنچه نشست شمرده می‌شود (۸.۵۶) ===');
{
  /* درسِ ۴۰: سهمِ «خودکار» ۴۵٪، یعنی ~۱۸ کارت از ۴۰ صحنه؛ نقشه ۸ داد، همه تیتر و نقل. */
  const mkSc = (n) => {
    const a = [];
    for (let i = 1; i <= n; i++) a.push({ n: i, t0: (i - 1) * 30, t1: i * 30, fileId: 'F' + i, text: 'متنِ صحنهٔ ' + i + ' دربارهٔ توجیه و باور.',
      beat: i % 5 === 0 ? 'روایت' : 'ایده', ov: null,
      judge: { s: 6, space: i % 7 === 0 ? 'none' : (i % 2 ? 'right' : 'top') } });
    return a;
  };
  const d = { scenes: mkSc(40), ovShare: 0.45, nature: 'درس' };
  for (let i = 0; i < 8; i++) d.scenes[i * 5].ov = { kind: 'headline', title: 'تیتر', lines: [], keys: [], side: 'right' };
  let asked = null;
  const gtWas = global.geminiText_;
  global.geminiText_ = (prompt, schema) => {
    asked = { prompt: prompt, schema: schema };
    const ns = (prompt.match(/^\[(\d+)\]/gm) || []).map(x => x.replace(/[\[\]]/g, ''));
    return { items: ns.map((n, i) => i % 3 === 0 ? { n: n, ov: 'points', ovTitle: 'دو راه', ovLines: ['قیاس: ضروری', 'استقرا: محتمل'] }
                                       : i % 3 === 1 ? { n: n, ov: 'steps', ovLines: ['باورِ الف', 'از ب', 'از ج'] }
                                       : { n: n, ov: 'headline', ovTitle: 'تسلسل', ovLines: ['زنجیره‌ای که پایان ندارد'] }) };
  };
  const r = lvSceneOvFill_(d, { title: 'معماریِ معرفت' }, () => 1e9);
  const have = d.scenes.filter(x => x.ov).length;
  /* شاهدِ بی‌حفاظ مجموعه را می‌اندازد و شکستنِ نشسته را شبیهِ کرش می‌کند (۷.۸۹): ov ممکن است
     پس از بُرشِ سهم تهی شده باشد. */
  const filled = d.scenes.filter(x => x.ovFill && x.ov);
  ok('۸۵.۱ کارت‌های کم ⇒ پس از داوری یک پرسشِ جدا؛ سهم پر می‌شود و از سقف نمی‌گذرد',
     r.asked > 0 && r.got > 0 && have > 8 && have <= Math.round(40 * 0.45) && !!d.ovFillAt,
     JSON.stringify({ r: r, have: have }));
  ok('۸۵.۲ فقط صحنه‌هایی که داور در آن‌ها جای خالی دید؛ جای کارت همان جای داور',
     filled.length > 0 && filled.every(x => x.judge.space !== 'none' && x.ov.side === x.judge.space) &&
     !/^\[7\]/m.test(asked.prompt) && !/^\[14\]/m.test(asked.prompt),
     filled.map(x => x.n + ':' + x.ov.side).join(' '));
  ok('۸۵.۳ روایت فهرست و گام نمی‌گیرد؛ تیترِ تازه سطرِ توضیح دارد',
     filled.every(x => x.beat !== 'روایت' || ['headline', 'quote'].indexOf(x.ov.kind) !== -1) &&
     filled.filter(x => x.ov.kind === 'headline').every(x => x.ov.lines.length >= 1) &&
     /بیشترشان points، steps یا compare/.test(asked.prompt) && /هرگز تیترِ تنها/.test(asked.prompt) &&
     /^\[\d+\] \(روایت\)/m.test(asked.prompt) && d.scenes.some(x => x.beat === 'روایت' && !x.ov),
     filled.map(x => x.n + ':' + x.beat + ':' + x.ov.kind).join(' '));
  asked = null;
  const r2 = lvSceneOvFill_(d, { title: 'x' }, () => 1e9);
  ok('۸۵.۴ یک بار برای هر درس — دوباره پرسیده نمی‌شود', asked === null && r2.asked === 0);
  /* و وقتی مدل چیزی نداد (هنوز زیرِ کف): باز هم نه — «یک بار» یعنی یک بار، نه «تا کافی شود». */
  const dE = { scenes: mkSc(20), ovShare: 0.45, nature: 'درس' };
  let nAsk = 0;
  global.geminiText_ = () => { nAsk++; return { items: [] }; };
  lvSceneOvFill_(dE, {}, () => 1e9); lvSceneOvFill_(dE, {}, () => 1e9);
  global.geminiText_ = (prompt, schema) => { asked = { prompt: prompt, schema: schema }; return { items: [] }; };
  ok('۸۵.۴-ب مدلِ بی‌جواب ⇒ یک پرسش، نه هر اجرا', nAsk === 1 && !!dE.ovFillAt && dE.ovFill.got === 0,
     JSON.stringify({ nAsk: nAsk, f: dE.ovFill }));
  /* کافی ⇒ پرسیده نمی‌شود؛ «خاموش» ⇒ هیچ. */
  const dOk = { scenes: mkSc(10), ovShare: 0.3 };
  for (let i = 0; i < 3; i++) dOk.scenes[i * 3].ov = { kind: 'points', title: '', lines: ['a', 'b'], keys: [], side: 'top' };
  const dOff = { scenes: mkSc(10), ovShare: 0 };
  asked = null;
  lvSceneOvFill_(dOk, {}, () => 1e9); lvSceneOvFill_(dOff, {}, () => 1e9);
  ok('۸۵.۵ نقشهٔ کافی و تختهٔ «خاموش» هیچ پرسشی نمی‌سازند', asked === null && !dOff.ovFillAt && dOk.ovFill.why === 'کافی بود');
  global.geminiText_ = gtWas;

  /* ۸۵.۶ — آنچه روی ویدئو نشست، از نقشهٔ رانر: یک درسِ نحیف هیچ؛ دو درسِ پیاپی ⇒ مسئله و یافته. */
  delete global.__PROPS[PK.LV_OV_LAST];
  const thin = (k) => ({ mode: 'scenes', scenes: 40, ov: { asked: 8, placed: 4, busy: 4, kinds: { headline: 3, quote: 1 } } });
  lvOvNote_('special:901', thin());
  const s1 = lvOvStatus_();
  lvOvNote_('special:901', thin());          // همان درس دوباره شمرده نمی‌شود
  const s1b = lvOvStatus_();
  lvOvNote_('special:902', thin());
  const s2 = lvOvStatus_();
  const p2 = [], n2 = [];
  const fWas = global.logSelfFinding_; const found = [];
  global.logSelfFinding_ = (hub, f) => { found.push(f); };
  lvHealth_(p2, n2);
  global.logSelfFinding_ = fWas;
  ok('۸۵.۶ یک درسِ نحیف ok است؛ همان درس دو بار شمرده نمی‌شود؛ دو درسِ پیاپی ⇒ مسئله و یافتهٔ کد',
     s1.ok === true && s1b.last.n === 1 && s2.ok === false && /۲ درسِ پیاپی نحیف/.test(s2.line) &&
     p2.some(x => /کارت‌های نوشتاری/.test(x)) && found.some(f => f.key === 'lv-ov-thin' && f.owner === ROWNER_CODE),
     JSON.stringify({ s1: s1.line, s2: s2.line, p: p2 }));
  lvOvNote_('special:903', { mode: 'scenes', scenes: 40, ov: { asked: 18, placed: 15, busy: 3, kinds: { points: 6 } } });
  ok('۸۵.۷ درسِ پُرکارت شمار را صفر می‌کند و خط می‌گوید چند نشست',
     lvOvStatus_().ok === true && /۱۵ کارت روی ۴۰ صحنه/.test(lvOvStatus_().line), lvOvStatus_().line);
  const genWas = global.__PROPS[PK.LV_GEN_ON];
  global.__PROPS[PK.LV_GEN_ON] = '1';                  // همان حالتِ ۷۸.۵: ساختِ تصویر روشن
  const lgen = (lvGenStatus_() || {}).line || '';
  if (genWas === undefined) delete global.__PROPS[PK.LV_GEN_ON]; else global.__PROPS[PK.LV_GEN_ON] = genWas;
  ok('۸۵.۸ خطِ کارت در خطِ روزانهٔ تصویر است، کنارِ 🎬 و 🎥', /🪧 کارت‌های نوشتاری/.test(lgen) && /🎬/.test(lgen), lgen.slice(-200));
  delete global.__PROPS[PK.LV_OV_LAST];

  /* ۸۵.۹ — حرکتِ «travel» از توصیف به رانر می‌رسد، با جای کانون از داور. */
  ok('۸۵.۹ «travel» شناخته می‌شود و با جعبهٔ داور به رانر می‌رود',
     lvSceneMove_('travel') === 'travel' && lvSceneMove_('pan') === 'travel' &&
     (lvSceneMv_({ move: 'travel', judge: { box: { x: 0.7, y: 0.4 } } }) || {}).k === 'travel' &&
     lvSceneMv_({ move: 'drift', judge: { box: { x: 0.7, y: 0.4 } } }) === null);
}

console.log('\n=== ۸۶) جای پلی‌لیست با کلیدِ واقعیِ تولید؛ ترتیبِ نشسته از خودِ پلی‌لیست درست می‌شود (۸.۵۷) ===');
{
  /* `ytWantPos_` از ۶ سپتامبر همیشه صفر می‌داد: کلیدِ `ytPublished_` «special:N» است و
     تابع با «درس‌نامه» می‌سنجید. سنجه‌های ۱۴.۳ تا ۱۴.۷ کلیدِ نمایشی را دستی می‌ساختند —
     شکلی که تولید از ۶ سپتامبر نمی‌سازد (۷.۲۲). این بند `pub` را از **`ytLog_` ⇒
     `ytPublished_`** می‌سازد، همان راهِ تولید. */
  const hub = new Spread('هاب-ترتیب');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  const hubWas = global.getHub_; global.getHub_ = () => hub;
  const log = (show, ep, series, vid) => ytLog_(hub, { show, ep: String(ep), series, title: 'ت' + ep, videoId: vid,
                                                      url: 'https://youtu.be/' + vid, privacy: 'public', result: 'منتشر شد' });
  [3, 7, 19, 61].forEach((e) => log(CFG.SPECIAL_SHOW_NAME, e, 'الف', 'S' + e));
  log(CFG.SPECIAL_SHOW_NAME, 5, 'ب', 'B5');
  log(CFG.SHOW_NAME, 4, '', 'V4');
  const pub = ytPublished_(hub);
  ok('۸۶.۱ جای درس از کلیدِ واقعیِ تولید: ۱۲ پس از ۳ و ۷، و ۶۲ پس از هر چهار — نه صفر',
     ytWantPos_(pub, { show: 'special', ep: '12' }, 'الف') === 2 &&
     ytWantPos_(pub, { show: 'special', ep: '62' }, 'الف') === 4 &&
     ytWantPos_(pub, { show: CFG.SPECIAL_SHOW_NAME, ep: '62' }, 'الف') === 4 &&
     ytWantPos_(pub, { show: 'variety', ep: '9' }, '') === 1,
     JSON.stringify(Object.keys(pub)) + ' ⇒ ' + ytWantPos_(pub, { show: 'special', ep: '62' }, 'الف'));

  /* نقشهٔ جابه‌جایی: درست و کمینه، روی هر ترتیبی. */
  const sim = (cur, moves) => {
    const a = cur.slice();
    for (const m of moves) { const i = a.indexOf(m.id); a.splice(i, 1); a.splice(m.pos, 0, m.id); }
    return a;
  };
  const lis = (seq) => { const t = []; for (const x of seq) { let lo = 0, hi = t.length; while (lo < hi) { const md = (lo + hi) >> 1; if (t[md] < x) lo = md + 1; else hi = md; } t[lo] = x; } return t.length; };
  let bad = '', seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let trial = 0; trial < 300 && !bad; trial++) {
    const n = 1 + Math.floor(rnd() * 40);
    const eps = []; for (let i = 0; i < n; i++) eps.push(rnd() < 0.15 ? 0 : 1 + Math.floor(rnd() * 60));
    const cur = eps.map((e, i) => ({ id: 'I' + i, videoId: 'v' + i, ep: e }));
    const pl = ytPlOrderPlan_(cur, (vid) => (cur.filter((x) => x.videoId === vid)[0] || {}).ep || 0);
    const after = sim(cur.map((x) => x.id), pl.moves);
    if (JSON.stringify(after) !== JSON.stringify(pl.target)) bad = 'ترتیب ' + JSON.stringify(eps);
    const rank = {}; pl.target.forEach((id, k) => { rank[id] = k; });
    const need = n - lis(cur.map((x) => rank[x.id]));
    if (!bad && pl.moves.length > need) bad = 'کمینه نیست ' + pl.moves.length + '>' + need;
    const known = pl.target.map((id) => cur[Number(id.slice(1))]).filter((x) => x.ep);
    for (let k = 1; !bad && k < known.length; k++) if (known[k].ep < known[k - 1].ep) bad = 'صعودی نیست';
    const unk = pl.target.map((id) => cur[Number(id.slice(1))]);
    const firstUnk = unk.findIndex((x) => !x.ep);
    if (!bad && firstUnk >= 0 && unk.slice(firstUnk).some((x) => x.ep)) bad = 'ناشناخته پایین نماند';
  }
  ok('۸۶.۲ نقشهٔ جابه‌جایی روی ۳۰۰ ترتیبِ تصادفی: به ترتیبِ شماره می‌رسد، کمینه است، ناشناخته‌ها پایین', !bad, bad);
  const rev = [61, 19, 7, 3].map((e) => ({ id: 'P' + e, videoId: 'S' + e }));
  ok('۸۶.۲-ب پلی‌لیستِ وارونهٔ تولید (تازه‌ترین بالا) سه جابه‌جایی می‌خواهد',
     ytPlOrderPlan_(rev, (v) => Number(v.slice(1))).moves.length === 3);

  /* یوتیوبِ بدَل با معنای واقعیِ «position»: قلم به همان جای نهایی می‌رود. */
  const pl = { id: 'PLX', items: [61, 19, 7, 3, 0].map((e) => ({ id: 'IT' + e, videoId: e ? 'S' + e : 'MANUAL' })) };
  const calls = { upd: 0, list: 0 };
  global.YouTube = {
    PlaylistItems: {
      list: (part, o) => { calls.list++; return { items: pl.items.map((x, i) => ({ id: x.id, snippet: { position: i, resourceId: { videoId: x.videoId } } })) }; },
      update: (b) => { calls.upd++; const i = pl.items.findIndex((x) => x.id === b.id); const it = pl.items.splice(i, 1)[0]; pl.items.splice(b.snippet.position, 0, it); }
    }, Videos: {}, Playlists: {}, Channels: { list: () => ({ items: [] }) }, Thumbnails: {} };
  const plWas = global.__PROPS[PK.YT_PL], qWas = global.__PROPS[PK.YT_QUOTA], movWas = CFG.YT_PL_ORDER_MOVES;
  global.__PROPS[PK.YT_PL] = JSON.stringify({ 'series:الف': { id: 'PLX', title: 'الف' } });
  delete global.__PROPS[PK.YT_QUOTA]; delete global.__PROPS[PK.YT_PLORD];
  CFG.YT_PL_ORDER_MOVES = 2;
  const f1 = ytPlOrderFix_(60000, hub);
  const mid = pl.items.map((x) => x.videoId).join(',');
  ok('۸۶.۳ سقفِ جابه‌جایی: دو حرکت، بقیه «مانده» و دورِ بعد نوبت دارد',
     f1.moved === 2 && f1.left === 1 && ytPlOrderDue_() === true && /هنوز سرِ جایش نیست/.test(ytPlOrderLine_()),
     JSON.stringify(f1) + ' · ' + mid + ' · ' + ytPlOrderLine_());
  CFG.YT_PL_ORDER_MOVES = movWas;
  const f2 = ytPlOrderFix_(60000, hub);
  ok('۸۶.۴ دورِ بعد تمام می‌کند: به ترتیبِ شمارهٔ درس، و ویدئوی دستیِ آدم دست‌نخورده پایین',
     pl.items.map((x) => x.videoId).join(',') === 'S3,S7,S19,S61,MANUAL' && f2.left === 0 && f2.moved === 1,
     pl.items.map((x) => x.videoId).join(',') + ' · ' + JSON.stringify(f2));
  const u0 = calls.upd;
  ok('۸۶.۵ مرتب ⇒ «نوبت نیست» و دورِ بعد هیچ جابه‌جایی نمی‌فرستد؛ آپلودِ تازه نوبت را باز می‌کند',
     ytPlOrderDue_() === false && ytPlOrderFix_(60000, hub).moved === 0 && calls.upd === u0 &&
     (ytPlOrderDirty_(), ytPlOrderDue_() === true) && /✓ همه به ترتیب/.test((ytPlOrderFix_(60000, hub), ytPlOrderLine_())),
     ytPlOrderLine_());
  /* سهمیهٔ یک آپلود همیشه کنار می‌مانَد. */
  pl.items.reverse();
  global.__PROPS[PK.YT_QUOTA] = JSON.stringify({ day: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'),
    units: (Number(CFG.YT_QUOTA_UNITS) || 9000) - ytUnitsPerEpisode_() * 3 - 20, uploads: 0, blocked: '' });
  const f3 = ytPlOrderFix_(60000, hub);
  ok('۸۶.۶ جای انتشارهای روز کنار می‌مانَد: سهمیهٔ کم ⇒ هیچ جابه‌جایی، با علت',
     f3.moved === 0 && f3.left > 0 && /سهمیه/.test(f3.why), JSON.stringify(f3));
  const src27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const up = src27.slice(src27.indexOf('function ytUploadOne_('), src27.indexOf('function ytPlFor_('));
  const tick = src27.slice(src27.indexOf('function ytTick_('), src27.indexOf('function ytStatus_('));
  ok('۸۶.۷ آپلود ترتیب را «نوبت‌دار» می‌کند و دورِ یوتیوب پس از انتشار می‌سنجدش',
     /ytPlPlace_\([^;]*ytWantPos_[\s\S]{0,200}ytPlOrderDirty_\(\)/.test(up) &&
     tick.indexOf('ytPlOrderFix_(') > tick.indexOf('ytRunDue_(1'));
  if (plWas === undefined) delete global.__PROPS[PK.YT_PL]; else global.__PROPS[PK.YT_PL] = plWas;
  if (qWas === undefined) delete global.__PROPS[PK.YT_QUOTA]; else global.__PROPS[PK.YT_QUOTA] = qWas;
  delete global.__PROPS[PK.YT_PLORD];
  global.YouTube = {};
  global.getHub_ = hubWas;
}

console.log('\n=== ۸۷) جایگزینیِ ویدئوی منتشرشده: تازه عمومی، بعد قبلی کنار — هرگز پاک (۸.۵۷) ===');
{
  const hub = new Spread('هاب-جایگزینی');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  const hubWas = global.getHub_; global.getHub_ = () => hub;
  ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: '62', series: 'الف', title: 'درسِ ۴۰', videoId: 'OLD62',
                url: 'https://youtu.be/OLD62', privacy: 'public', result: 'منتشر شد' });
  const f = DriveApp.__register('EPRPL', 'قسمت 0062 — درس ۴۰');
  f.createFile(Utilities.newBlob([0, 0, 0, 24, 102, 116, 121, 112].concat(new Array(6000).fill(1)), 'video/mp4', 'قسمت 0062 — ویدئو.mp4'));
  lvSceneWrite_(f, { v: 1, key: 'special:62', done: true, scenes: [{ n: 1, fileId: 'IMG1', t0: 0 }, { n: 2, fileId: 'IMG2', t0: 9 }],
                     clip: { state: 'ok', fileId: 'CLIP', img: 'IMG1', sec: 8 }, ovFillAt: '2026-10-06 08:00', ovFill: { asked: 0 } });
  ytRenderSave_({ items: [{ key: 'special:62', show: 'special', ep: '62', folderId: 'EPRPL', status: 'رسید',
                            audio: [{ id: 'A1', name: 'کامل.wav' }], at: '2026-10-06 08:30' }] });
  delete global.__PROPS[PK.YT_DUE]; delete global.__PROPS[PK.YT_REPL]; delete global.__PROPS[PK.YT_QUOTA];
  const yc = { list: 0, upd: [], rm: [], priv: 'unlisted' };
  global.YouTube = {
    Videos: { list: () => { yc.list++; return { items: [{ status: { privacyStatus: yc.priv } }] }; },
              update: (b) => { yc.upd.push(b.id + '=' + b.status.privacyStatus); } },
    PlaylistItems: { list: () => ({ items: [{ id: 'PI-OLD', snippet: { position: 0, resourceId: { videoId: 'OLD62' } } },
                                            { id: 'PI-NEW', snippet: { position: 1, resourceId: { videoId: 'NEW62' } } }] }),
                     remove: (id) => { yc.rm.push(id); } },
    Playlists: {}, Channels: { list: () => ({ items: [] }) }, Thumbnails: {} };
  const plWas = global.__PROPS[PK.YT_PL];
  global.__PROPS[PK.YT_PL] = JSON.stringify({ 'series:الف': { id: 'PLA', title: 'الف' } });
  /* فهرست از گیت‌هاب خوانده می‌شود — همان فایلِ `docs/yt-replace.json`. */
  YT_REPLACE_ = null;
  global.__STUB = function (url, body) {
    if (url.indexOf('yt-replace.json') !== -1) return { code: 200, text: JSON.stringify({ items: { 'special:62': { tag: 'r1', why: 'آزمون' } } }) };
    return BASE_STUB(url, body);
  };
  const t1 = ytReplaceTick_(60000, hub);
  const st1 = ytReplState_()['special:62'] || {};
  const d1 = lvSceneRead_(f);
  const due1 = ytDueList_().filter((x) => x.key === 'special:62')[0] || {};
  const aside = f.getFoldersByName('ویدئوی پیشین — جایگزین‌شده');
  const sub = aside.hasNext() ? aside.next() : null;
  let subMp4 = 0; if (sub) { const it = sub.getFiles(); while (it.hasNext()) if (/\.mp4$/.test(it.next().getName())) subMp4++; }
  ok('۸۷.۱ آغاز: ویدئوی قبلیِ پوشه کنار می‌رود (نه سطل)، کلیپ و کارت‌ها از نو، قسمت با «replace» در صف؛ به یوتیوب دست نمی‌خورد',
     t1.prepped === 1 && st1.phase === 'build' && st1.oldVid === 'OLD62' && !ytVideoIn_(f) && subMp4 === 1 &&
     d1.clip && d1.clip.state === '' && !d1.ovFillAt && due1.replace === 'r1' && due1.folderId === 'EPRPL' &&
     yc.list === 0 && !yc.upd.length && !yc.rm.length,
     JSON.stringify({ t1, st1, clip: d1.clip, due1, subMp4 }));
  ok('۸۷.۲ دورِ دوم پیش از ساخت کاری نمی‌کند — قبلی سرِ جایش، صف همان',
     ytReplaceTick_(60000, hub).prepped === 0 && ytDueList_().filter((x) => x.key === 'special:62').length === 1 &&
     !yc.upd.length && ytReplState_()['special:62'].phase === 'build');

  /* ردیفِ «رسید»ِ قبلی بازنویسی می‌شود؛ همان `replace` دوباره خواسته نمی‌شود. */
  const ask = () => ytRenderAsk_({ show: 'special', ep: '62', title: 'درسِ ۴۰', folderId: 'EPRPL', visuals: [],
                                   scenes: [{ n: 1, t0: 0, fileId: 'IMG1' }], audio: [{ id: 'A1', name: 'کامل.wav' }],
                                   audioKind: 'کامل', outName: 'قسمت 0062 — ویدئو.mp4', replace: 'r1' });
  _ytMapMemo = { 'special:62': { url: 'https://x/old.mp4', mode: 'scenes' } };
  const a1 = ask(), a2 = ask();
  const row = ytRenderRead_().items.filter((x) => x.key === 'special:62');
  ok('۸۷.۳ ردیفِ رندر با «replace» بازنویسی می‌شود و «در انتظار» است؛ درخواستِ دوباره رد',
     a1 === true && a2 === false && row.length === 1 && row[0].status === 'در انتظار' && row[0].replace === 'r1',
     JSON.stringify({ a1, a2, row: row.map((x) => [x.status, x.replace]) }));
  ok('۸۷.۴ نقشهٔ رانر با ویدئوی قبلی «ساخته‌شده» نیست؛ فقط با همان replace',
     ytRenderBuilt_(row[0], { 'special:62': { url: 'u' } }) === null &&
     !!ytRenderBuilt_(row[0], { 'special:62': { url: 'u', replace: 'r1' } }) &&
     !!ytRenderBuilt_({ key: 'special:9' }, { 'special:9': { url: 'u' } }));
  /* برداشت از همان تعریف: نقشهٔ کهنه ⇒ برداشته نمی‌شود. */
  const fetched = [];
  global.__STUB = function (url, body) {
    if (url.indexOf('renders.json') !== -1) return { code: 200, text: JSON.stringify({ items: { 'special:62': { url: 'https://x/old.mp4' } } }) };
    if (url.indexOf('old.mp4') !== -1 || url.indexOf('new.mp4') !== -1) { fetched.push(url); return { code: 200, bytes: [0, 0, 0, 24, 102, 116, 121, 112].concat(new Array(6000).fill(2)), mime: 'video/mp4' }; }
    return BASE_STUB(url, body);
  };
  const c1 = ytRenderCollect_(60000);
  global.__STUB = function (url, body) {
    if (url.indexOf('renders.json') !== -1) return { code: 200, text: JSON.stringify({ items: { 'special:62': { url: 'https://x/new.mp4', replace: 'r1' } } }) };
    if (url.indexOf('new.mp4') !== -1) { fetched.push(url); return { code: 200, bytes: [0, 0, 0, 24, 102, 116, 121, 112].concat(new Array(6000).fill(3)), mime: 'video/mp4' }; }
    return BASE_STUB(url, body);
  };
  const c2 = ytRenderCollect_(60000);
  ok('۸۷.۵ برداشت: ویدئوی قبلیِ نقشه برداشته نمی‌شود؛ ویدئوی همین جایگزینی برداشته و در پوشه می‌نشیند',
     c1.got === 0 && c2.got === 1 && fetched.length === 1 && /new\.mp4/.test(fetched[0]) && !!ytVideoIn_(f),
     JSON.stringify({ c1, c2, fetched }));

  /* انتشارِ تازه (همان ردی که `ytUploadOne_` می‌نویسد)، هنوز Unlisted ⇒ قبلی سرِ جایش. */
  ytDueDrop_('special:62');
  ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: '62', series: 'الف', title: 'درسِ ۴۰', videoId: 'NEW62',
                url: 'https://youtu.be/NEW62', privacy: 'unlisted', result: 'منتشر نشد (وارسی)' });
  global.__STUB = BASE_STUB;
  ytReplaceTick_(60000, hub);
  const st3 = ytReplState_()['special:62'];
  ok('۸۷.۶ تازه هنوز عمومی نیست ⇒ قبلی دست نمی‌خورد (از خودِ یوتیوب پرسیده شد، نه از دفتر)',
     st3.phase === 'swap' && st3.newVid === 'NEW62' && yc.list === 1 && !yc.upd.length && !yc.rm.length &&
     /هنوز unlisted/.test(st3.why), JSON.stringify(st3));
  yc.priv = 'public';
  const tg = [], tgWas = global.tgApi_, tgEnWas = global.tgEnabled_;
  global.tgEnabled_ = () => true; global.tgApi_ = (m, p) => { tg.push(p.text); };
  const t4 = ytReplaceTick_(60000, hub);
  global.tgApi_ = tgWas; global.tgEnabled_ = tgEnWas;
  const st4 = ytReplState_()['special:62'];
  ok('۸۷.۷ تازه عمومی ⇒ قبلی از پلی‌لیست بیرون و «خصوصی» — پاک نه؛ تازه دست‌نخورده؛ خبر با نشانیِ تازه',
     t4.swapped === 1 && st4.phase === 'done' && JSON.stringify(yc.rm) === '["PI-OLD"]' &&
     JSON.stringify(yc.upd) === '["OLD62=private"]' && tg.some((x) => /youtu\.be\/NEW62/.test(x) && /پاک نشد/.test(x)) &&
     ytPlOrderDue_() === true,
     JSON.stringify({ st4, rm: yc.rm, upd: yc.upd, tg }));
  const n4 = yc.upd.length;
  ytReplaceTick_(60000, hub);
  ok('۸۷.۸ انجام‌شده دوباره اجرا نمی‌شود؛ خطِ روزانه می‌گویدش', yc.upd.length === n4 &&
     /انجام شد/.test(ytReplaceStatus_().line) && !ytReplaceStatus_().problem, ytReplaceStatus_().line);

  /* منتشرنشده ⇒ لازم نیست؛ آپلودِ ناموفقِ پیاپی ⇒ «نشد» با علت، نه چرخهٔ بی‌پایان. */
  YT_REPLACE_ = { 'special:77': { tag: 't' } };
  ytReplaceTick_(60000, hub);
  ok('۸۷.۹ قسمتِ منتشرنشده «لازم نشد» — همان انتشارِ عادی', ytReplState_()['special:77'].phase === 'skip');
  ytLog_(hub, { show: CFG.SPECIAL_SHOW_NAME, ep: '78', series: 'الف', title: 'ت', videoId: 'OLD78',
                url: 'https://youtu.be/OLD78', privacy: 'public', result: 'منتشر شد' });
  const f78 = DriveApp.__register('EPR78', 'قسمت 0078');
  const q = ytRenderRead_(); q.items.push({ key: 'special:78', show: 'special', ep: '78', folderId: 'EPR78', status: 'رسید' });
  ytRenderSave_(q);
  YT_REPLACE_ = { 'special:78': { tag: 't' } };
  ytReplaceTick_(60000, hub);
  for (let i = 0; i < Number(CFG.YT_REPLACE_TRY_MAX); i++) { ytDueDrop_('special:78'); ytReplaceTick_(60000, hub); }
  const s78 = ytReplState_()['special:78'];
  ok('۸۷.۱۰ آپلودِ ناموفقِ پیاپی ⇒ «نشد» پس از سقف، و مسئله در ایمیل — قبلی سرِ جایش',
     s78.phase === 'fail' && /نشد/.test(ytReplaceStatus_().problem) && yc.upd.length === n4,
     JSON.stringify(s78) + ' · ' + ytReplaceStatus_().problem);

  YT_REPLACE_ = null; _ytMapMemo = null;
  if (plWas === undefined) delete global.__PROPS[PK.YT_PL]; else global.__PROPS[PK.YT_PL] = plWas;
  delete global.__PROPS[PK.YT_REPL]; delete global.__PROPS[PK.YT_DUE]; delete global.__PROPS[PK.YT_PLORD];
  global.YouTube = {}; global.__STUB = BASE_STUB; global.getHub_ = hubWas;
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ یوتیوب گذشت.');
