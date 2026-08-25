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
  ok('۱۰.۲ ردیفِ موفق در حافظه می‌نشیند', pub['درس‌نامه:16'].videoId === 'VID1');
  ok('۱۰.۳ و سابقهٔ تلاشش صفر می‌شود', pub['درس‌نامه:16'].tries === 0);

  ytLog_(hub, { show: 'درس‌نامه', ep: '17', result: 'نشد', note: 'خطا' });
  ytLog_(hub, { show: 'درس‌نامه', ep: '17', result: 'نشد', note: 'خطا' });
  ytLog_(hub, { show: 'درس‌نامه', ep: '17', result: 'نشد', note: 'خطا' });
  const pub2 = ytPublished_(hub);
  ok('۱۰.۴ شکستِ پیاپی شمرده می‌شود', pub2['درس‌نامه:17'].tries === 3);
  ok('۱۰.۵ و پس از سقف، آن قسمت رها می‌شود',
     ytGaveUp_(pub2, 'درس‌نامه', '17') === true);
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
  ok('۱۹.۲ و فقط برای پلی‌لیستِ تازه یا تغییرِ نام، نه هر شب',
     src27.indexOf('if (!had || (titleWas && titleWas !== pl.title))') !== -1);
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
  ok('۲۷.۶ خاموش‌بودنِ API در پروژهٔ ابری هم',
     body.indexOf('SERVICE_DISABLED') !== -1 && body.indexOf('Enable') !== -1);
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
     YT_SCOPES.length === 3 && YT_SCOPES.join(' ').indexOf('youtubepartner') === -1,
     YT_SCOPES.join(' '));
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ یوتیوب گذشت.');
