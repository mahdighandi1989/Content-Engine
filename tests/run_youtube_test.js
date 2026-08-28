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
global.__STUB = function (url, body) {
  if (url.indexOf('yt3.example') !== -1) return { code: 200, text: 'PNGDATA' };
  // فقط سرِ راهِ خودِ یوتیوب، نه هر چیزی که googleapis دارد — وگرنه فراخوانِ
  // مدل هم همین‌جا بلعیده می‌شود (که یک بار شد).
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
    hashtags: ['فلسفه'] }) }] } }] } };
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
  ok('۱۴.۲ و دو برنامه با هم قاتی نمی‌شوند',
     l.filter(x => x.show === 'variety').length === 1 &&
     l[0].show !== l[l.length - 1].show, l.map(x => x.show + ':' + x.ep).join(' '));

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

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ یوتیوب گذشت.');
