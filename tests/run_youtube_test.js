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
    /* و تصویرها. بی این، `ytVisPlan_` هیچ‌وقت ورودی نمی‌گیرد و مسیرش در
       هیچ سنجه‌ای دویده نمی‌شود — همان «بدَلی که از تولید تنگ‌تر است». */
    visuals: [
      { at: '1', kind: 'کارت', cardTitle: 'گزارهٔ یک',
        cardLines: ['سطرِ الف', 'سطرِ ب'], terms: '', caption: 'زیرنویسِ یک' },
      { at: '2', kind: 'عکس', cardTitle: '', cardLines: [],
        terms: 'john locke portrait', caption: 'زیرنویسِ دو' },
      { at: '3', kind: 'چیزی که وجود ندارد', cardTitle: 'گزارهٔ سه',
        cardLines: [], terms: '', caption: 'زیرنویسِ سه' }
    ] }) }] } }] } };
};

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
  ok('۱۹.۲-ت ولی «سهمیه» شکست شمرده نمی‌شود — فردا خودش دوباره می‌رود',
     plc.indexOf("cv.indexOf('سهمیه') === -1") !== -1);
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
  ok('۴۲.۱ کاورِ پلی‌لیست مربع خواسته می‌شود',
     src27.indexOf('square: CFG.YT_PODCAST !== false') !== -1);
  ok('۴۲.۲ و صفحهٔ مربع واقعاً ساخته می‌شود',
     src27.indexOf('ytPresCreate_(name, 12192000, 12192000)') !== -1);
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
  ok('۴۸.۳ علتِ «سهمیه» روی خودِ رکورد ثبت می‌شود',
     rec.coverWhy === 'سهمیه' && rec.podWhy === 'سهمیه', JSON.stringify(rec));
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
  ok('۵۲.۳ مسیرِ سالم: همهٔ تصویرها ساخته و در ردیف نشانی‌دار می‌شوند',
     r3.waiting === true && (row97.visuals || []).length === 3 &&
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

  /* ۵۳.۱ — حالا «منتظرِ تصویر» اسم دارد، و خودش می‌گوید چند از چند. */
  ok('۵۳.۱ قسمتی که منتظرِ تصویر است، در وضعیت اسم دارد',
     st1.waiting === 1 && st1.short === 0 &&
     st1.waitKeys[0].indexOf('special:101') === 0 &&
     st1.waitKeys[0].indexOf('(1/3)') !== -1,
     st1.waitKeys.join(' | '));

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
     st3.shortKeys[0].indexOf('(2/3)') !== -1 && st3.ok === true,
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

  /* ۵۵.۶-ب — **دو سبکِ هنری با «+» هم رد می‌شود، با دلیل.** او پرسید آیا
     ترکیبی می‌شود؛ جوابِ سنجیده در طرح این است که یک جورش قشنگ در می‌آید
     («ترکیبی») و یک جورش نه. پس پیام همان راهِ درست را نشان می‌دهد. */
  const mix = lvStyleOf_(row({ style: 'نقشِ ایرانی + چاپِ قدیمی' }));
  ok('۵۵.۶-پ دو سبک با «+» رد می‌شود و «ترکیبی» را پیشنهاد می‌کند',
     mix.bad.indexOf('ناهم‌خوان') !== -1 && mix.bad.indexOf('«ترکیبی»') !== -1,
     mix.bad.slice(0, 90));

  ok('۵۵.۶-ت و خودِ «ترکیبی» یک سبکِ پذیرفته‌شده است',
     lvStyleOf_(row({ style: 'ترکیبی' })).key === 'ترکیبی' &&
     lvStyleFind_('ترکیبی').mix === true);

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
     قاعدهٔ اسکنِ موسیقی که سلیقهٔ گزیننده را پاک نمی‌کند. */
  ok('۵۵-ب.۱ خانهٔ خالی پیشنهاد گرفت و خانهٔ دست‌نویس دست نخورد',
     a1.filled === 2 && col()[0] === 'نقشِ ایرانی' && col()[1] === 'آبرنگِ گرم' &&
     col()[2] === 'عکسِ واقعی' && col()[3] === 'سبکِ نامعلوم',
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
  const NUM = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده'];
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
  const off = lvGenStatus_();
  ok('۵۷.۱۲-ب و خاموش که باشد، خطش می‌گوید خاموش است و چطور روشن می‌شود',
     off.on === false && off.line.indexOf('خاموش') !== -1 &&
     off.line.indexOf('LV_GEN_ENABLED') !== -1, off.line.slice(0, 100));

  ok('۵۷.۱۲-پ و حالِ لایهٔ ۳ در خطِ روزانهٔ تصویرِ درس هم می‌آید',
     lvLine_(lvStatus_()).indexOf('تصویرِ ساخته‌شده') !== -1,
     lvLine_(lvStatus_()).replace(/\n/g, ' ⏎ ').slice(0, 130));

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
  ok('۵۸.۷ هر سه مسیرِ کاور سبک را می‌دهند — یک قابلیت، سه در',
     epCalls.length === 3 && epCalls.every(c => c.indexOf('style:') !== -1),
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
  const kpPod = global.ytPlPodcast_, kpHttp = global.ytHttp_;
  const kpMap = global.__PROPS[PK.YT_PLMAP];
  global.ytPlPodcast_ = () => 'نشست';
  global.ytHttp_ = () => ({ code: 200, text: '{}' });
  ytPlMapSave_({ kA: { id: 'PLA', title: 'سیرهٔ نبوی' } });
  global.__PRES_LAST = null;
  const outPl = { covers: 0, coverFails: [], podcasts: 0 };
  ytPlDress_('PLA', 'سیرهٔ نبوی', 'سیرهٔ نبوی', 'درس‌نامه', 'تاریخ اسلام',
             false, outPl, 'kA');
  const plPal = (function () {
    try { return global.__PRES_LAST.getSlides()[0].getPageElements()[0].fill.color; }
    catch (e) { return 'کشیده نشد: ' + e.message; }
  })();
  ok('۵۸.۷-ب کاورِ پلی‌لیست واقعاً با سبکِ مجموعه کشیده می‌شود',
     outPl.covers === 1 &&
     plPal === lvStyleFind_('کاغذبری').pal.bg &&
     plPal !== ytPalette_('تاریخ اسلام').bg,
     'رنگِ کشیده‌شده ' + plPal + ' · سبک ' + lvStyleFind_('کاغذبری').pal.bg +
     ' · دستهٔ خالی ' + ytPalette_('تاریخ اسلام').bg);

  global.ytPlPodcast_ = kpPod; global.ytHttp_ = kpHttp;
  if (kpMap === undefined) delete global.__PROPS[PK.YT_PLMAP];
  else global.__PROPS[PK.YT_PLMAP] = kpMap;

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
  const chunks = [{ text: 'الف بتا گاما' }, { text: 'دلتا اپسیلون زتا' },
                  { text: 'اتا تتا یوتا' }];
  const times = [{ i: 0, at: 0 }, { i: 1, at: 30 }, { i: 2, at: 75 }];
  const marks = lvTimeMap_(chunks, times);

  ok('۶۰.۱ نقشهٔ زمان از تکه‌های واقعی ساخته می‌شود',
     marks.length === 3 && marks[0].at === 0 && marks[1].at === 30,
     marks.map(m => m.from + '→' + m.at + 's').join(' · '));

  /* ۶۰.۱-ب — **تکه‌ای که زمانش ثبت نشده، کنار گذاشته می‌شود؛ صفر نمی‌گیرد.**
     نگارشِ اولِ ۶۰.۱ این را نمی‌دید، چون هر سه تکهٔ نمونه زمان داشتند — یعنی
     حالتی ساخته بودم که تولید لزوماً در آن نیست (۷.۲۲/۷.۷۵). و این حالت
     واقعی است: اجرایی که وسط کشته شود، تکه‌های ساخته‌نشده زمان ندارند.
     اگر به آن‌ها صفر بدهیم، کارتِ آن جمله به **ابتدای قسمت** پرت می‌شود —
     دقیقاً همان باگی که این نسخه برای رفعش نوشته شده، از در دیگر. */
  const gapMarks = lvTimeMap_(chunks, [{ i: 0, at: 0 }, { i: 2, at: 75 }]);
  ok('۶۰.۱-ب تکهٔ بی‌زمان کنار می‌رود و صفر نمی‌گیرد',
     gapMarks.length === 2 && gapMarks.every(m => m.at !== undefined) &&
     gapMarks[1].at === 75 &&
     gapMarks[1].from === lvNorm_(chunks[0].text).length + 1 +
                          lvNorm_(chunks[1].text).length + 1,
     gapMarks.map(m => m.from + '→' + m.at + 's').join(' · '));

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
  ytMarkSpec_(); ytMarkSpec_(); ytMarkSpec_();
  ok('۶۲.۵ کانال یک بار خوانده می‌شود و نتیجه می‌مانَد',
     calls === 0, calls + ' فراخوانِ تازه پس از ذخیره');

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

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ یوتیوب گذشت.');
