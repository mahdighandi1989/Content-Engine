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

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ یوتیوب گذشت.');
