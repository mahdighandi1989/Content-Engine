/* جزوهٔ مجموعه (بخشِ ۲۶).
 *
 * این سنجه‌ها عمداً **خودِ توابع را اجرا می‌کنند** و به HTMLِ واقعیِ تولیدشده
 * نگاه می‌کنند، نه به متنِ کد. دلیلش تاریخِ همین ریپوست: چند بار سنجه‌ای
 * نوشته شد که الگوی *متنِ* کد را می‌سنجید و بعد معلوم شد تابع اصلاً صدا
 * زده نمی‌شود یا شرطش هرگز باز نمی‌شود.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs',
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs',
  '26_Handout.gs','27_YouTube.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };


console.log('=== ۱) متنِ پادکست، متنِ کتاب نیست ===');
{
  /* «شاید برخی قسمت‌ها مطالبِ موجود در پادکست مناسبِ درج در جزوه نباشد،
   * مثلاً آن ابتدا و انتها که حالتِ پادکستی دارد یا وسط‌هایش.» */
  const t = 'شنوندگانِ عزیز، به این قسمت از برنامه خوش آمدید. ' +
            'معرفت باور صادقِ موجه است. ' +
            'در این قسمت می‌شنویم که این تعریف سه شرط دارد. ' +
            'شرطِ اول باور است، شرطِ دوم صدق، و شرطِ سوم توجیه. ' +
            'تا پایانِ برنامه همراهِ ما باشید.';
  const r = handoutDePodcast_(t);
  ok('۱.۱ هر سه جملهٔ رادیویی انداخته می‌شوند', r.dropped === 3, r.dropped + ' جمله');
  ok('۱.۲ ولی محتوای درس دست‌نخورده می‌ماند',
     r.text.indexOf('باور صادقِ موجه') !== -1 && r.text.indexOf('شرطِ اول باور است') !== -1);
  ok('۱.۳ و قابِ رادیویی واقعاً رفته',
     r.text.indexOf('خوش آمدید') === -1 && r.text.indexOf('همراهِ ما') === -1 &&
     r.text.indexOf('در این قسمت می‌شنویم') === -1, r.text.slice(0, 70));

  /* سدی که همه‌چیز را بگیرد، سد نیست. اگر تشخیص همهٔ جمله‌ها را رادیویی
     بداند یعنی تشخیص غلط بوده، و متنِ اصلی باید برگردد — نه بخشِ خالی. */
  const only = handoutDePodcast_('همراهِ ما باشید. در این قسمت می‌شنویم.');
  ok('۱.۴ ولی هرگز بخش را خالی نمی‌کند', only.text.length > 0 && only.dropped === 0);
  /* و مهم‌تر از هرچه بالا: نثرِ کتابی نباید قربانیِ سخت‌گیری شود. بردنِ یک
     جملهٔ سالم بدتر از ماندنِ یک جملهٔ گفتاری است، چون خواننده هرگز نمی‌فهمد
     چه چیزی را از دست داده. */
  const keepers = [
    'معرفت باور صادقِ موجه است. این تعریف سه شرط دارد.',
    'باورِ صادقِ موجه تعریفِ کلاسیک است. مثالِ گتیه: ساعتِ خوابیده. پس توجیه کافی نیست.',
    'در این بخش سه استدلال بررسی می‌شود. استدلالِ اول از دکارت است.',
    'به بیانِ دیگر، شرطِ سوم را می‌توان چنین صورت‌بندی کرد.'
  ];
  const hurt = keepers.filter(x => handoutDePodcast_(x).dropped > 0);
  ok('۱.۵ نثرِ کتابی دست نمی‌خورد', hurt.length === 0, hurt.join(' | '));
}

console.log('=== ۲) وصله فقط می‌افزاید — هیچ درسی گم نمی‌شود ===');
{
  const book = handoutNew_({ seriesKey: 'k', seriesName: 'م' });
  handoutApply_(book, { newChapters: [{ title: 'فصل یک', sections: [
    { title: 'بخش الف', body: 'متنِ الف', takeaway: 'چکیدهٔ الف' }] }] }, { epNum: '1' }, []);
  const chId = book.chapters[0].id, secId = book.chapters[0].sections[0].id;
  ok('۲.۱ فصلِ تازه ساخته شد', book.chapters.length === 1 && book.chapters[0].sections.length === 1);
  ok('۲.۲ شناسه‌ها یکتا و ناتهی‌اند', !!chId && !!secId && chId !== secId, chId + ' / ' + secId);

  // درسِ دوم: یک بخش در فصلِ موجود + یک تکمیل روی بخشِ قدیمی
  handoutApply_(book, {
    newChapters: [],
    intoChapter: [{ chapterId: chId, title: 'بخش ب', body: 'متنِ ب', why: 'ادامهٔ همان بحث' }],
    amend: [{ sectionId: secId, body: 'و این نکته در درسِ دوم روشن شد.', why: 'تکمیل' }]
  }, { epNum: '2' }, ['1']);
  ok('۲.۳ بخشِ تازه در همان فصلِ قبلی نشست، نه ته جزوه',
     book.chapters.length === 1 && book.chapters[0].sections.length === 2,
     book.chapters.length + ' فصل، ' + book.chapters[0].sections.length + ' بخش');
  ok('۲.۴ تکمیلِ درسِ بعدی به بخشِ قدیمی افزوده شد',
     book.chapters[0].sections[0].adds.length === 1);
  ok('۲.۵ و متنِ قبلی دست‌نخورده ماند — افزودن است، نه جایگزینی',
     book.chapters[0].sections[0].body === 'متنِ الف');
  ok('۲.۶ تکمیل می‌گوید از کدام درس آمده',
     book.chapters[0].sections[0].adds[0].fromEpisode === '2');

  // شناسهٔ توهمی نباید متن را ببلعد
  const before = JSON.stringify(book).length;
  const st = handoutApply_(book, {
    newChapters: [],
    intoChapter: [{ chapterId: 'chNOPE', title: 'یتیم', body: 'متنی که نباید گم شود' }],
    amend: [{ sectionId: 'sNOPE', body: 'تکملهٔ یتیم' }]
  }, { epNum: '3' }, []);
  ok('۲.۷ شناسهٔ ناشناخته شمرده می‌شود', st.orphan === 2, String(st.orphan));
  ok('۲.۸ ولی متنش گم نمی‌شود',
     JSON.stringify(book).indexOf('متنی که نباید گم شود') !== -1 &&
     JSON.stringify(book).indexOf('تکملهٔ یتیم') !== -1);
  ok('۲.۹ و کتاب بزرگ‌تر شده، نه کوچک‌تر', JSON.stringify(book).length > before);

  // بندِ خالی هیچ‌جا ننشیند
  const n0 = book.chapters.length;
  handoutApply_(book, { newChapters: [{ title: 'پوچ', sections: [{ title: 'x', body: '  ' }] }] },
                { epNum: '4' }, []);
  ok('۲.۱۰ بخشِ بی‌متن فصل نمی‌سازد', book.chapters.length === n0, String(book.chapters.length));
}

console.log('=== ۳) ارجاع‌ها، مثلِ کتاب ===');
{
  const book = handoutNew_({ seriesName: 'م' });
  const s1 = [{ title: 'مقالهٔ الف', url: 'https://a.example/1', publisher: 'ناشرِ الف',
                date: '۱۴۰۴', quote: 'نقلِ الف', type: 'outside' },
              { title: 'یادداشتِ ب', url: 'https://b.example/2', type: 'inside' }];
  const n1 = handoutRefsMerge_(book, s1, '1');
  ok('۳.۱ منابعِ غنی‌سازی شماره می‌گیرند', n1.length === 2 && book.refs.length === 2,
     n1.join(','));
  // همان منبع در درسِ بعد نباید شمارهٔ تازه بگیرد
  const n2 = handoutRefsMerge_(book, [s1[0], { title: 'تازه', url: 'https://c.example/3' }], '2');
  ok('۳.۲ منبعِ تکراری شمارهٔ قبلی‌اش را نگه می‌دارد',
     n2[0] === n1[0] && book.refs.length === 3, n2.join(',') + ' / ' + book.refs.length);
  ok('۳.۳ نوعِ منبع ثبت می‌شود',
     book.refs[0].kind === 'بیرونی' && book.refs[1].kind === 'توضیحی');
  ok('۳.۴ و ثبت می‌شود از کدام درس آمده', book.refs[2].fromEpisode === '2');
}

console.log('=== ۴) خودِ جزوه: فهرستِ کلیک‌شونده و پانوشت ===');
{
  const book = handoutNew_({ seriesKey: 'k', seriesName: 'معرفت‌شناسی' });
  const refs = handoutRefsMerge_(book, [
    { title: 'دانشنامهٔ استنفورد', url: 'https://plato.example/k', publisher: 'استنفورد',
      date: '۲۰۲۴', quote: 'تعریفِ کلاسیک' }], '1');
  handoutApply_(book, { newChapters: [{ title: 'تعریفِ معرفت', intro: 'درآمد',
    sections: [{ title: 'سه شرط', body: 'باور، صدق، توجیه.\nو توضیحِ بیشتر.',
                 takeaway: 'معرفت سه شرط دارد' }] }],
    roadmap: { intro: 'این مجموعه از تعریف شروع می‌کند.',
               stages: [{ title: 'مرحلهٔ یک', outcome: 'می‌توانی معرفت را تعریف کنی' },
                        { title: 'مرحلهٔ دو', outcome: 'می‌توانی گتیه را نقد کنی' }] }
  }, { epNum: '1' }, refs);
  handoutRoadmapState_(book, { done: 5, total: 10 });
  book.episodes.push({ n: '1', title: 'ت', at: 'الان' });
  book.revision = 1; book.updatedAt = 'الان';

  const html = handoutHtml_(book);
  const chId = book.chapters[0].id, secId = book.chapters[0].sections[0].id;

  ok('۴.۱ فهرست به شناسهٔ واقعیِ فصل و بخش لینک می‌دهد',
     html.indexOf('href="#' + chId + '"') !== -1 && html.indexOf('href="#' + secId + '"') !== -1);
  /* و آن شناسه‌ها واقعاً در متن لنگر دارند. لینکی که به لنگرِ ناموجود برود
     هیچ خطایی نمی‌دهد — فقط کلیک می‌شود و هیچ اتفاقی نمی‌افتد. همان بدترین
     جنسِ خرابی که run_wiring_test.js ۵.۲ برای دکمه‌ها می‌گیرد. */
  const anchors = (html.match(/id="([^"]+)"/g) || []).map(x => x.slice(4, -1));
  const links = (html.match(/href="#([^"]+)"/g) || []).map(x => x.slice(7, -1));
  const dead = links.filter(x => anchors.indexOf(x) === -1);
  ok('۴.۲ هیچ لینکی به لنگرِ ناموجود نمی‌رود', dead.length === 0, dead.join(','));

  ok('۴.۳ نقشهٔ راه در جزوه هست', html.indexOf('نقشهٔ راه') !== -1 &&
     html.indexOf('می‌توانی گتیه را نقد کنی') !== -1);
  ok('۴.۴ وضعیتِ مرحله‌ها را کد گذاشته، نه مدل',
     book.roadmap.stages[0].state === 'انجام‌شده' &&
     book.roadmap.stages[1].state === 'در جریان',
     book.roadmap.stages.map(x => x.state).join('/'));
  ok('۴.۵ پیشرفت درصد دارد', book.roadmap.progress.pct === '50', book.roadmap.progress.pct);

  ok('۴.۶ نشانهٔ پانوشت در متن هست', /<sup>\[/.test(html));
  ok('۴.۷ و پانوشتِ همان فصل زیرش آمده',
     html.indexOf('پانوشتِ این فصل') !== -1 &&
     html.indexOf('id="f' + chId + '-1"') !== -1);
  ok('۴.۸ کتاب‌نامهٔ کامل هم هست',
     html.indexOf('id="refs"') !== -1 && html.indexOf('دانشنامهٔ استنفورد') !== -1);
  ok('۴.۹ چکیدهٔ هر بخش دیده می‌شود', html.indexOf('معرفت سه شرط دارد') !== -1);
  ok('۴.۱۰ سند کامل و rtl است',
     /^<!doctype html>/.test(html) && html.indexOf('dir="rtl"') !== -1 &&
     html.indexOf('</div>') !== -1);
  ok('۴.۱۱ متنِ درس واقعاً در جزوه هست', html.indexOf('باور، صدق، توجیه') !== -1);

  // تکمیلِ درسِ بعد باید دیده و برچسب‌دار باشد
  handoutApply_(book, { newChapters: [], amend: [
    { sectionId: secId, body: 'گتیه نشان داد این سه شرط کافی نیست.', why: 'نقدِ گتیه' }] },
    { epNum: '2' }, refs);
  const html2 = handoutHtml_(book);
  ok('۴.۱۲ تکمیل با نشانِ «از درسِ N» نمایش داده می‌شود',
     html2.indexOf('تکمیل از درسِ') !== -1 && html2.indexOf('نقدِ گتیه') !== -1 &&
     html2.indexOf('گتیه نشان داد') !== -1);
}

console.log('=== ۵) بدهی: با هر تولید، و هرگز دوبار ===');
{
  global.__PROPS[PK.HANDOUT_DUE] = '';
  handoutDueAdd_('k1', '7');
  handoutDueAdd_('k1', '7');
  handoutDueAdd_('k1', '8');
  ok('۵.۱ بدهیِ تکراری دوبار ثبت نمی‌شود', handoutDueList_().length === 2,
     String(handoutDueList_().length));
  handoutDueAdd_('', '9');
  ok('۵.۲ بدهیِ ناقص ثبت نمی‌شود', handoutDueList_().length === 2);
  global.__PROPS[PK.HANDOUT_DUE] = '';
}

console.log('=== ۶) مسیرِ واقعی: از فایلِ وضعیتِ قسمت تا فایلِ جزوه ===');
{
  /* اینجا هیچ‌چیز شبیه‌سازی‌نشده نمی‌مانَد جز خودِ مدل: پوشهٔ مجموعه،
   * زیرپوشهٔ قسمت، `_special.json`، رجیستری — همه واقعی‌اند. */
  const hub = new Spread('هاب');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('۰۱ — معرفت‌شناسی');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kEp'; row[SC.NAME - 1] = 'معرفت‌شناسی';
  row[SC.EPISODES - 1] = '3'; row[SC.FOLDER - 1] = sf.getId();
  row[SC.LEVEL - 1] = 'مقدماتی'; row[SC.CHUNKS - 1] = 20; row[SC.CUR_CHUNK - 1] = 5;
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);

  const epFolder = sf.createFolder('قسمت 003');
  epFolder.createFile(Utilities.newBlob(JSON.stringify({
    epNum: 3, seriesKey: 'kEp', seriesName: 'معرفت‌شناسی', level: 'مقدماتی',
    ep: {
      title: 'تعریفِ معرفت',
      hook: 'سلامِ گرمِ رادیویی، امروز سراغِ معرفت می‌رویم.',
      outro: 'تا قسمتِ بعد خدانگهدار.',
      recap: 'در قسمتِ قبل گفتیم…',
      sections: [{ heading: 'سه شرط',
                   narration: 'شنوندگانِ عزیز، خوش آمدید. معرفت باور صادقِ موجه است. ' +
                              'شرطِ اول باور است. همراهِ ما باشید.' }],
      __extSources: [{ title: 'استنفورد', url: 'https://plato.example/k',
                       publisher: 'استنفورد', date: '۲۰۲۴', quote: 'ن', type: 'outside' }]
    }
  }), 'application/json', '_special.json'));

  // تنها چیزی که جایش پُر می‌شود: خودِ مدل.
  let sawPrompt = '';
  global.handoutPatchModel_ = (book, secs, meta) => {
    sawPrompt = handoutPrompt_(book, secs, meta);
    return { newChapters: [{ title: 'تعریفِ معرفت',
      sections: [{ title: 'سه شرط', body: 'باور، صدق، توجیه.', takeaway: 'سه شرط' }] }],
      roadmap: { intro: 'از تعریف تا نقد', stages: [{ title: 'یک', outcome: 'تعریف' }] } };
  };

  handoutDueAdd_('kEp', '3');
  const r = handoutRunDue_(2);
  ok('۶.۱ بدهی پرداخت شد', r.done === 1 && r.left === 0,
     JSON.stringify(r.notes));

  const jf = sf.getFilesByName('_HANDOUT.json');
  ok('۶.۲ مدلِ ساختاریِ کتاب در پوشهٔ مجموعه نوشته شد', jf.hasNext());
  const bookOut = JSON.parse(jf.next().getBlob().getDataAsString());
  ok('۶.۳ و یک فصل دارد', bookOut.chapters.length === 1);
  ok('۶.۴ درسِ پوشش‌داده‌شده ثبت شد', bookOut.episodes.length === 1 &&
     String(bookOut.episodes[0].n) === '3');
  ok('۶.۵ منبعِ غنی‌سازی به کتاب‌نامه رسید',
     bookOut.refs.length === 1 && bookOut.refs[0].url === 'https://plato.example/k');

  const hf = sf.getFilesByName('جزوه — معرفت‌شناسی.html');
  ok('۶.۶ خودِ جزوه هم در همان پوشه ساخته شد', hf.hasNext());
  const html = hf.next().getBlob().getDataAsString();
  ok('۶.۷ جزوه نامِ مجموعه را دارد، نه نامِ قسمت را',
     html.indexOf('معرفت‌شناسی') !== -1);

  /* مهم‌ترین سنجهٔ این بلوک: hook و outro و recap **اصلاً** نباید به
     نویسندهٔ جزوه داده شوند. اگر داده شوند، هیچ خطایی رخ نمی‌دهد — فقط
     جزوه بوی رادیو می‌گیرد و هیچ‌کس تا وقتی نخواندش نمی‌فهمد. */
  ok('۶.۸ قابِ رادیوییِ قسمت به نویسندهٔ جزوه داده نشد',
     sawPrompt.indexOf('سلامِ گرمِ رادیویی') === -1 &&
     sawPrompt.indexOf('خدانگهدار') === -1 &&
     sawPrompt.indexOf('در قسمتِ قبل گفتیم') === -1);
  /* فقط **ناحیهٔ متنِ درس** سنجیده می‌شود، نه کلِ پرامپت: خودِ دستورها
     عبارتِ «خوش آمدید» را به‌عنوانِ نمونهٔ ممنوع نقل می‌کنند، و سنجه‌ای که
     کلِ رشته را بگردد در واقع توضیحِ خودم را می‌سنجد نه رفتار را — همان
     دامی که در این ریپو چند بار افتاده. */
  const bodyPart = (sawPrompt.split('--- متنِ درسِ تازه')[1] || '')
                     .split('--- کاری که باید بکنی ---')[0];
  ok('۶.۹ و جمله‌های رادیوییِ خودِ روایت هم پاک شده بودند',
     !!bodyPart && bodyPart.indexOf('خوش آمدید') === -1 &&
     bodyPart.indexOf('همراهِ ما') === -1 &&
     bodyPart.indexOf('معرفت باور صادقِ موجه') !== -1, bodyPart.trim());
  ok('۶.۱۰ فهرستِ موجودِ جزوه به مدل داده می‌شود تا بداند کجا بگذارد',
     sawPrompt.indexOf('فهرستِ جزوه تا امروز') !== -1);
  ok('۶.۱۱ لینکِ جزوه در رجیستری ثبت شد',
     String(reg.getRange(2, SC.HANDOUT).getValue()).indexOf('http') === 0,
     String(reg.getRange(2, SC.HANDOUT).getValue()));

  // دوباره اجرا: همان درس نباید دو بار وارد جزوه شود
  handoutDueAdd_('kEp', '3');
  const r2 = handoutRunDue_(2);
  const book2 = JSON.parse(sf.getFilesByName('_HANDOUT.json').next().getBlob().getDataAsString());
  ok('۶.۱۲ یک درس دو بار وارد جزوه نمی‌شود',
     book2.chapters.length === 1 && book2.episodes.length === 1,
     book2.chapters.length + ' فصل، ' + book2.episodes.length + ' درس');
  ok('۶.۱۳ و بدهیِ بی‌فایده در صف نمی‌مانَد تا هر شب تکرار شود',
     r2.left === 0, String(r2.left));

  // وضعیت و سلامت
  const st = handoutStatus_();
  ok('۶.۱۴ وضعیت در _STATUS.json دیده می‌شود',
     st.series.length === 1 && st.series[0].chapters === 1 && st.series[0].refs === 1,
     JSON.stringify(st.series[0]));
  const probs = [], notes = [];
  handoutHealth_(probs, notes);
  ok('۶.۱۵ جزوهٔ به‌روز، ایرادی نمی‌سازد', probs.length === 0, probs.join(' | '));

  /* و جزوه‌ای که عقب مانده باشد، ناظر باید ببیندش. دو قسمتِ **واقعی** اضافه
     می‌شود، نه فقط دو عدد در ستون — چون شمارِ قسمت‌ها از خودِ پوشه خوانده
     می‌شود و ستون در دادهٔ واقعی قابلِ اتکا نیست. */
  for (const n of [4, 5]) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kEp', seriesName: 'معرفت‌شناسی',
      ep: { title: 'د' + n, sections: [{ heading: 'ب', narration: 'م. د.' }] } }),
      'application/json', '_special.json'));
  }
  const probs2 = [];
  handoutHealth_(probs2, []);
  ok('۶.۱۶ ولی جزوهٔ عقب‌مانده گزارش می‌شود',
     probs2.length === 1 && probs2[0].indexOf('عقب است') !== -1, probs2.join(' | '));
}

console.log('=== ۷) وصل‌بودن — وگرنه همهٔ بالا نمایش است ===');
{
  const sp = fs.readFileSync('src/14_Special.gs', 'utf8');
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const he = fs.readFileSync('src/08_Health.gs', 'utf8');
  const se = fs.readFileSync('src/05_Setup.gs', 'utf8');
  ok('۷.۱ پایانِ هر قسمتِ درس‌نامه بدهی ثبت می‌کند', sp.indexOf('handoutDueAdd_(') !== -1);
  ok('۷.۲ و اگر وقت باشد همان‌جا می‌سازدش', sp.indexOf('handoutRunDue_(1)') !== -1);
  /* ترتیب حیاتی است: اگر اول بسازیم و بعد بدهی ثبت کنیم، اجرایی که وسطِ
     ساخت کشته شود یک درس را بی‌صدا از جزوه می‌اندازد. */
  ok('۷.۳ اول بدهی، بعد ساخت', sp.indexOf('handoutDueAdd_(') < sp.indexOf('handoutRunDue_(1)'));
  ok('۷.۴ کارِ شبانه تورِ ایمنی است', su.indexOf('handoutRunDue_(') !== -1 &&
     /nightHas_\(\d+, 'جزوهٔ مجموعه‌ها'\)/.test(su));
  ok('۷.۵ وضعیت به _STATUS.json می‌رود', he.indexOf('handoutStatus_()') !== -1);
  ok('۷.۶ و ناظر هر روز می‌سنجدش', he.indexOf('handoutHealth_(problems, notes)') !== -1);
  ok('۷.۷ دکمهٔ دستی هم هست', se.indexOf("'runHandoutBuild'") !== -1);
  ok('۷.۸ ساختِ جزوه هرگز داخلِ مسیرِ بحرانیِ صداگذاری نیست',
     sp.indexOf('handoutRunDue_(1)') > sp.indexOf('PK.SP_PENDING'));
}

console.log('=== ۹) قسمت‌های گذشته هم وارد جزوه می‌شوند ===');
{
  /* ۵٫۸۵ بدهی را از **پایانِ هر قسمت** ثبت می‌کرد، یعنی فقط قسمت‌های بعد از
   * نصبِ آن نسخه. صاحبِ برنامه: «قسمت‌های قبلی باید حتماً وارد جزوه بشن.»
   * جزوه‌ای که از درسِ ۱۶ شروع شود، جزوهٔ آن مجموعه نیست. */
  const hub = new Spread('هاب۹');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('۰۲ — منطق');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kBack'; row[SC.NAME - 1] = 'منطق';
  row[SC.FOLDER - 1] = sf.getId(); row[SC.CHUNKS - 1] = 30; row[SC.CUR_CHUNK - 1] = 9;
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);

  // پنج قسمتِ تولیدشده که هیچ‌کدام هنوز در جزوه نیستند — و عمداً بی‌ترتیب
  const mk = (n) => {
    const f = sf.createFolder('قسمت ' + n);
    f.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kBack', seriesName: 'منطق',
      ep: { title: 'درسِ ' + n, hook: 'ه', outro: 'ا',
            sections: [{ heading: 'ب' + n, narration: 'محتوای درسِ ' + n + '. نکتهٔ دوم.' }],
            __extSources: [] } }), 'application/json', '_special.json'));
  };
  [3, 1, 5, 2, 4].forEach(mk);

  const b = handoutBackfill_(50);
  ok('۹.۱ همهٔ درس‌های تولیدشده به صف رفتند', b.queued === 5 && b.series === 1,
     JSON.stringify({ q: b.queued, s: b.series }));

  /* و مهم‌ترین چیز: **به‌ترتیبِ شمارهٔ درس** ساخته شوند. جزوه یک کتاب است؛
     فصلِ درسِ ۵ نباید پیش از فصلِ درسِ ۱ نوشته شود، و بدتر، `amend`
     نمی‌تواند به درسی ارجاع بدهد که هنوز ننوشته‌ایم. */
  const seenOrder = [];
  global.handoutPatchModel_ = (book, secs, meta) => {
    seenOrder.push(String(meta.epNum));
    return { newChapters: [{ title: 'فصلِ درسِ ' + meta.epNum,
      sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] };
  };
  handoutRunDue_(10);
  ok('۹.۲ و به‌ترتیبِ شمارهٔ درس ساخته شدند، نه به‌ترتیبِ پوشه',
     seenOrder.join(',') === '1,2,3,4,5', seenOrder.join(','));

  const book = JSON.parse(sf.getFilesByName('_HANDOUT.json').next().getBlob().getDataAsString());
  ok('۹.۳ هر پنج درس در جزوه نشستند', book.episodes.length === 5 &&
     book.chapters.length === 5, book.episodes.length + ' درس، ' + book.chapters.length + ' فصل');
  ok('۹.۴ و ترتیبِ فصل‌ها همان ترتیبِ درس‌هاست',
     book.chapters.map(c => c.title).join('|') ===
       [1, 2, 3, 4, 5].map(n => 'فصلِ درسِ ' + n).join('|'),
     book.chapters.map(c => c.title).join('|'));

  // بارِ دوم چیزی به صف نمی‌آید
  delete global.__PROPS[PK.HANDOUT_SCAN];
  const b2 = handoutBackfill_(50);
  ok('۹.۵ کاوشِ دوباره درسی را دوبار به صف نمی‌آورد', b2.queued === 0, String(b2.queued));

  /* مکان‌نما: ۲۶۴ مجموعه در یک اجرا جا نمی‌شوند، و بی مکان‌نما هر اجرا از
     اولِ فهرست شروع می‌کند و به انتها نمی‌رسد.

     از ۵٫۹۲ سقف روی **پیمایشِ پوشه** است، نه روی ردیف: ردیفی که پوشه ندارد
     کارِ گرانی نمی‌برد و نباید بودجه را بخورد. مجموعه‌های زیر پوشه‌دارند،
     پس هرکدام یک واحد از سقف می‌گیرند. */
  delete global.__PROPS[PK.HANDOUT_SCAN];
  for (let n = 3; n <= 6; n++) {
    const fx = global.__ROOT_FOLDER.createFolder('پوشهٔ ' + n);
    const r2 = new Array(SERIES_HEADERS.length).fill('');
    r2[SC.KEY - 1] = 'k' + n; r2[SC.NAME - 1] = 'م' + n; r2[SC.FOLDER - 1] = fx.getId();
    reg.getRange(n, 1, 1, SERIES_HEADERS.length).setValues([r2]);
  }
  const p1 = handoutBackfill_(2);
  ok('۹.۶ کاوش کران‌دار است — و سقف کارِ گران را می‌شمارد',
     p1.walked === 2, p1.walked + ' پوشه از ' + p1.rows + ' ردیف');
  ok('۹.۷ و مکان‌نما جلو می‌رود',
     Number(global.__PROPS[PK.HANDOUT_SCAN]) > 0, String(global.__PROPS[PK.HANDOUT_SCAN]));
  const p2 = handoutBackfill_(10);
  ok('۹.۸ اجرای بعد از همان‌جا ادامه می‌دهد و دور را تمام می‌کند',
     p2.wrapped === true && Number(global.__PROPS[PK.HANDOUT_SCAN] || 0) === 0,
     JSON.stringify({ w: p2.wrapped, cur: global.__PROPS[PK.HANDOUT_SCAN] }));
}

console.log('=== ۱۰) ثبت در شیت: چه شد، کِی، و چرا نشد ===');
{
  const hub = new Spread('هاب۱۰');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('۰۳ — اخلاق');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kLog'; row[SC.NAME - 1] = 'اخلاق'; row[SC.FOLDER - 1] = sf.getId();
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  const ef = sf.createFolder('قسمت 1');
  ef.createFile(Utilities.newBlob(JSON.stringify({
    epNum: 1, seriesKey: 'kLog', seriesName: 'اخلاق',
    ep: { title: 'فضیلت', sections: [{ heading: 'ف', narration: 'متنِ درس. جملهٔ دوم.' }],
          __extSources: [{ title: 'ارسطو', url: 'https://x.example/a', publisher: 'ن',
                           date: '۱۴۰۴', quote: 'ق', type: 'outside' }] } }),
    'application/json', '_special.json'));

  global.handoutPatchModel_ = () => ({ newChapters: [{ title: 'فضیلت',
    sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });
  handoutDueAdd_('kLog', '1');
  handoutRunDue_(1);

  const sh = hub.getSheetByName(CFG.HANDOUT_TAB);
  ok('۱۰.۱ تبِ «کاربردِ جزوه» ساخته شد', !!sh);
  ok('۱۰.۲ و یک ردیف برای این به‌روزرسانی دارد', sh.getLastRow() === 2,
     String(sh.getLastRow()));
  const v = sh.getRange(2, 1, 1, HANDOUT_HEADERS.length).getValues()[0];
  ok('۱۰.۳ ردیف مجموعه و درس را می‌گوید',
     String(v[HU.SERIES - 1]) === 'اخلاق' && String(v[HU.EP - 1]) === '1',
     v.slice(0, 4).join(' | '));
  ok('۱۰.۴ و چه چیزی اضافه شد',
     String(v[HU.NEWCH - 1]) === '1' && String(v[HU.NEWSEC - 1]) === '1',
     v[HU.NEWCH - 1] + '/' + v[HU.NEWSEC - 1]);
  ok('۱۰.۵ و مجموعِ فعلی و ارجاع‌ها',
     String(v[HU.TOTCH - 1]) === '1' && String(v[HU.TOTREF - 1]) === '1' &&
     String(v[HU.NEWREF - 1]) === '1', v.slice(8, 12).join('/'));
  ok('۱۰.۶ و نتیجه و لینک', String(v[HU.RESULT - 1]) === 'به‌روز شد' &&
     String(v[HU.LINK - 1]).indexOf('http') === 0, String(v[HU.RESULT - 1]));

  /* تلاشِ ناموفق هم ردیف می‌گیرد. جزوه‌ای که هر شب تلاش می‌کند و هر شب
     «وصله خالی بود» می‌گیرد، از بیرون با جزوه‌ای که اصلاً تلاش نکرده
     یک‌شکل است — و آن دو کاملاً فرقِ هم‌اند. */
  const ef2 = sf.createFolder('قسمت 2');
  ef2.createFile(Utilities.newBlob(JSON.stringify({
    epNum: 2, seriesKey: 'kLog', seriesName: 'اخلاق',
    ep: { title: 'عدالت', sections: [{ heading: 'ع', narration: 'متن. دوم.' }] } }),
    'application/json', '_special.json'));
  global.handoutPatchModel_ = () => ({ newChapters: [] });
  handoutDueAdd_('kLog', '2');
  handoutRunDue_(1);
  ok('۱۰.۷ تلاشِ ناموفق هم ثبت می‌شود', sh.getLastRow() === 3, String(sh.getLastRow()));
  ok('۱۰.۸ با علتِ صریح در ستونِ نتیجه',
     String(sh.getRange(3, HU.RESULT).getValue()) === 'وصله خالی بود',
     String(sh.getRange(3, HU.RESULT).getValue()));

  ok('۱۰.۹ تاریخچه خوانده می‌شود', handoutHistory_(hub, 5).length === 2);
  ok('۱۰.۱۰ و در _STATUS.json می‌آید', (handoutStatus_().recent || []).length === 2);
  /* و خطِ اطلاع‌رسانی که در ایمیل و تلگرامِ همان قسمت دیده می‌شود */
  ok('۱۰.۱۱ خطِ اطلاع‌رسانیِ قسمت ساخته می‌شود',
     handoutLineFull_('اخلاق').text.indexOf('به‌روز نشد') !== -1,
     handoutLineFull_('اخلاق').text);
}

console.log('=== ۱۱) نظارت: آنچه به تغییرِ کد می‌رسد ===');
{
  const hub = new Spread('هاب۱۱');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SEEN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('۰۴ — عقب‌مانده');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kLag'; row[SC.NAME - 1] = 'عقب‌مانده';
  row[SC.FOLDER - 1] = sf.getId(); row[SC.EPISODES - 1] = '1 2 3 4';
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  for (const n of [1, 2, 3, 4]) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kLag', seriesName: 'عقب‌مانده',
      ep: { title: 'د', sections: [{ heading: 'ب', narration: 'م. د.' }] } }),
      'application/json', '_special.json'));
  }

  const p1 = [], n1 = [];
  handoutHealth_(p1, n1);
  ok('۱۱.۱ جزوهٔ نساخته در سلامت دیده می‌شود',
     p1.length === 1 && p1[0].indexOf('ساخته نشده') !== -1, p1.join(' | '));

  const rep = hub.getSheetByName(CFG.REPORT_TAB);
  ok('۱۱.۲ ولی روزِ اول یافتهٔ کد نمی‌سازد — یک شبِ شلوغ، زنجیرهٔ شکسته نیست',
     !rep || rep.getLastRow() < 2, rep ? String(rep.getLastRow()) : 'بی‌تب');

  /* روزِ سوم دیگر شلوغی نیست. عقب‌ماندگیِ پایدار باید به همان صفی برسد که
     نسخهٔ بعدیِ موتور از رویش ساخته می‌شود. */
  const back = JSON.parse(global.__PROPS[PK.HANDOUT_SEEN]);
  const old = new Date(Date.now() - 5 * 86400000);
  // با کلید، نه نام: دو مجموعه می‌توانند نامِ یکسان داشته باشند و فهرستِ
  // «زیرِ نظر» در handoutStatus_ با کلید گشته می‌شود.
  back['kLag'] = Utilities.formatDate(old, CFG.TIMEZONE, 'yyyy-MM-dd');
  global.__PROPS[PK.HANDOUT_SEEN] = JSON.stringify(back);

  handoutHealth_([], []);
  const rep2 = hub.getSheetByName(CFG.REPORT_TAB);
  ok('۱۱.۳ عقب‌ماندگیِ چندروزه یافته می‌سازد', !!rep2 && rep2.getLastRow() >= 2,
     rep2 ? String(rep2.getLastRow()) : 'بی‌تب');
  const rv = rep2.getRange(2, 1, 1, REPORT_HEADERS.length).getValues()[0];
  /* و «کد» یعنی صفِ NEEDS_CODE — همان جایی که سشنِ ناظر نسخهٔ بعدی را از
     رویش می‌بندد. یافته‌ای که owner دیگری بگیرد، هرگز به کد نمی‌رسد. */
  ok('۱۱.۴ و به صفِ «کد» می‌رود، نه به یادداشتِ روز',
     String(rv[RC.OWNER - 1]).indexOf('کد') !== -1 &&
     String(rv[RC.STATUS - 1]) === RST.NEEDS_CODE,
     rv[RC.OWNER - 1] + ' / ' + rv[RC.STATUS - 1]);
  ok('۱۱.۵ و دستورش می‌گوید کجا را نگاه کند',
     String(rv[RC.INSTR - 1]).indexOf(CFG.HANDOUT_TAB) !== -1,
     String(rv[RC.INSTR - 1]).slice(0, 60));
  ok('۱۱.۶ عنوانش نامِ مجموعه‌های عقب‌مانده را دارد',
     String(rv[RC.DETAIL - 1]).indexOf('عقب‌مانده') !== -1);

  // و وقتی مجموعه دیگر در فهرست نباشد، حافظه‌اش پاک می‌شود
  row[SC.EPISODES - 1] = '';
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  handoutHealth_([], []);
  ok('۱۱.۷ و با رفعِ عقب‌ماندگی، حافظه‌اش پاک می‌شود',
     !JSON.parse(global.__PROPS[PK.HANDOUT_SEEN] || '{}')['kLag'],
     global.__PROPS[PK.HANDOUT_SEEN]);
}

console.log('=== ۱۲-پیش) ستونی که تاریخ به شماره‌ها چسبیده ===');
{
  /* دادهٔ واقعیِ رجیستری در ۲۴ اوت، ستونِ «قسمت‌های پادکست»:
   *   «Fri Jan 02 2026 00:00:00 GMT+0400 (Gulf Standard Time) 3 4 5 … 15»
   * یک تاریخ به شماره‌ها چسبیده است. شمردنِ **واژه‌ها** ۲۲ می‌دهد جایی که
   * ۱۳ قسمت هست — و آن‌وقت جزوه‌ای که کاملاً به‌روز است هر روز «عقب»
   * گزارش می‌شد و هر روز یک یافتهٔ دروغ می‌ساخت. */
  const hub = new Spread('هاب۱۲');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SEEN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('۰۵ — تاریخ‌دار');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kMess'; row[SC.NAME - 1] = 'تاریخ‌دار';
  row[SC.FOLDER - 1] = sf.getId();
  row[SC.EPISODES - 1] = 'Fri Jan 02 2026 00:00:00 GMT+0400 (Gulf Standard Time) 1 2';
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  for (const n of [1, 2]) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kMess', seriesName: 'تاریخ‌دار',
      ep: { title: 'د', sections: [{ heading: 'ب', narration: 'م. د.' }] } }),
      'application/json', '_special.json'));
  }

  // جزوه‌ای که هر دو درس را دارد
  const book = handoutNew_({ seriesKey: 'kMess', seriesName: 'تاریخ‌دار' });
  book.revision = 2;
  book.episodes = [{ n: '1' }, { n: '2' }];
  book.chapters = [{ id: 'ch1', title: 'ف', sections: [{ id: 's1', title: 'ب', body: 'م' }] }];
  book.refs = [{ n: '1', title: 'x' }];
  handoutWrite_(sf, book);

  const st = handoutStatus_();
  ok('۱۲-پیش.۱ شمار از پوشه می‌آید، نه از ستونی که تاریخ در آن است',
     st.series.length === 1 && st.series[0].episodes === 2,
     st.series.length ? String(st.series[0].episodes) : 'بی‌ردیف');
  const probs = [];
  handoutHealth_(probs, []);
  ok('۱۲-پیش.۲ پس جزوهٔ به‌روز، «عقب» گزارش نمی‌شود', probs.length === 0,
     probs.join(' | '));
}

console.log('=== ۱۲) وصلِ سه خواستهٔ تازه ===');
{
  const se = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const tg = fs.readFileSync('src/07_Telegram.gs', 'utf8');
  const ml = fs.readFileSync('src/04_Mailer.gs', 'utf8');
  ok('۱۲.۱ دکمهٔ دستی گذشته را هم وارد می‌کند',
     /handoutBackfill_\(/.test(fs.readFileSync('src/26_Handout.gs', 'utf8')
       .split('function runHandoutBuild')[1] || ''));
  ok('۱۲.۲ و کارِ شبانه هم', su.indexOf('handoutBackfill_(') !== -1);
  ok('۱۲.۳ کاوش پیش از ساخت است — وگرنه بارِ اول صف خالی است',
     su.indexOf('handoutBackfill_(') < su.indexOf('handoutRunDue_('));
  ok('۱۲.۴ اطلاع‌رسانی در تلگرامِ درس‌نامه', tg.indexOf('tgHandoutLine_(meta.seriesName)') !== -1);
  ok('۱۲.۵ و در ایمیلِ درس‌نامه', ml.indexOf('handoutHtmlLine_(meta.seriesName)') !== -1);
  ok('۱۲.۶ نامِ منو گذشته را هم اعلام می‌کند', se.indexOf('واردکردنِ گذشته') !== -1);
}

console.log('=== ۸) دستورها خودشان از ریپو می‌آیند ===');
{
  /* تا ۵٫۸۴ نیمهٔ دومِ قاعدهٔ ۷ج کارِ دست بود: متنِ پرامپت از ریپو برداشته و
   * در درایو ساخته می‌شد. دو ایراد داشت — همان کارِ دستی‌ای که صاحبِ برنامه
   * نمی‌خواهد، و بدتر: **دو نسخه از یک متن، دستی هم‌گام‌شده**، که می‌توانستند
   * بی‌صدا از هم فاصله بگیرند و هیچ سنجه‌ای نگیردش. */
  const out = DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUT');
  out.createFile(Utilities.newBlob('x'.repeat(400), 'text/markdown', '_PROMPT-monitor-v6.md'));

  const served = {};
  served['docs/prompts/_PROMPT-monitor-v7.md'] = 'y'.repeat(500);
  const realFetch = global.UrlFetchApp.fetch;
  let asked = [];
  global.UrlFetchApp.fetch = (url) => {
    asked.push(url);
    const hit = Object.keys(served).find(k => url.indexOf(k) !== -1);
    return { getResponseCode: () => (hit ? 200 : 404),
             getContentText: () => (hit ? served[hit] : 'Not Found') };
  };

  const r = promptSyncFromRepo_();
  ok('۸.۱ نسخهٔ تازه از ریپو آمد و در ریشه نشست',
     r.added.indexOf('_PROMPT-monitor-v7.md') !== -1, r.added.join(','));
  ok('۸.۲ و واقعاً فایلی در ریشه ساخته شد',
     out.getFilesByName('_PROMPT-monitor-v7.md').hasNext());
  ok('۸.۳ محتوایش همانِ ریپوست، نه رونویسیِ دستی',
     out.getFilesByName('_PROMPT-monitor-v7.md').next().getBlob().getDataAsString()
       === served['docs/prompts/_PROMPT-monitor-v7.md']);
  /* و کهنه همان لحظه بایگانی شد، نه فردا شب — بینِ آن دو، ریشه دو نسخه از
     یک دستور دارد و خواننده می‌تواند اشتباهی را بردارد. */
  ok('۸.۴ و نسخهٔ کهنه همان‌جا بایگانی شد',
     !out.getFilesByName('_PROMPT-monitor-v6.md').hasNext());

  // بارِ دوم نباید چیزی اضافه کند
  const r2 = promptSyncFromRepo_();
  ok('۸.۵ اجرای دوباره چیزی تکرار نمی‌کند', r2.added.length === 0, r2.added.join(','));

  /* هرگز روی فایلِ موجود نمی‌نویسد: پرامپت‌ها append-only هستند و یک ویرایشِ
     اشتباه در ریپو نباید نسخه‌ای را که تسک همین حالا می‌خواند عوض کند. */
  served['docs/prompts/_PROMPT-monitor-v7.md'] = 'z'.repeat(500);
  promptSyncFromRepo_();
  ok('۸.۶ نسخهٔ موجود بازنویسی نمی‌شود',
     out.getFilesByName('_PROMPT-monitor-v7.md').next().getBlob().getDataAsString()
       .charAt(0) === 'y');

  // یک شمارهٔ جاافتاده نباید زنجیره را برای همیشه بخواباند
  served['docs/prompts/_PROMPT-monitor-v9.md'] = 'w'.repeat(500);
  const r3 = promptSyncFromRepo_();
  ok('۸.۷ شمارهٔ جاافتاده زنجیره را متوقف نمی‌کند',
     r3.added.indexOf('_PROMPT-monitor-v9.md') !== -1, r3.added.join(','));

  // متنِ خیلی کوتاه (صفحهٔ خطا) پرامپت نیست
  served['docs/prompts/_PROMPT-monitor-v10.md'] = 'کوتاه';
  const r4 = promptSyncFromRepo_();
  ok('۸.۸ پاسخِ کوتاه به‌جای پرامپت پذیرفته نمی‌شود',
     r4.added.length === 0, r4.added.join(','));

  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۸.۹ در کارِ شبانه صدا زده می‌شود', su.indexOf('promptSyncFromRepo_()') !== -1);
  /* ترتیب: آوردن باید پیش از بایگانی و پیش از یادآور باشد، وگرنه موتور همان
     شب بابتِ دستوری که خودش تازه آورده هشدار می‌دهد. */
  ok('۸.۱۰ و پیش از هرس و یادآورِ تازگی',
     su.indexOf('promptSyncFromRepo_()') < su.indexOf('promptPrune_();') &&
     su.indexOf('promptSyncFromRepo_()') < su.indexOf('promptFreshNag_()'));

  global.UrlFetchApp.fetch = realFetch;
}

console.log('=== ۱۳) صف: کدام سر بریده می‌شود ===');
{
  /* ══ باگِ ۵٫۸۶ ══
   * `handoutDueSave_` با `slice(-40)` **آخرین** چهل تا را نگه می‌داشت. صف
   * به‌ترتیبِ صعودیِ درس پر می‌شود، پس واردکردنِ گذشتهٔ یک مجموعهٔ شصت‌درسی
   * درس‌های ۱ تا ۲۰ را بی‌صدا می‌انداخت و جزوه از درسِ ۲۱ شروع می‌شد —
   * دقیقاً همان «به‌هم‌ریختگی» که نباید پیش بیاید، و بی هیچ خطایی. */
  global.__PROPS[PK.HANDOUT_DUE] = '';
  const many = [];
  for (let n = 1; n <= 60; n++) many.push({ key: 'kBig', ep: String(n) });
  handoutDueAddMany_(many);
  const l = handoutDueList_();
  ok('۱۳.۱ درسِ اول در صف می‌مانَد، نه اینکه از ته بریده شود',
     l.length && String(l[0].ep) === '1', l.length + ' مورد، اولی: ' +
     (l[0] ? l[0].ep : '—'));
  ok('۱۳.۲ و ترتیب صعودی است',
     l.every((x, i2) => i2 === 0 || Number(x.ep) > Number(l[i2 - 1].ep)),
     l.slice(0, 5).map(x => x.ep).join(','));

  // افزودنِ دسته‌ای: یک خواندن و یک نوشتن، و تکراری‌ها را نمی‌گیرد
  const again = handoutDueAddMany_([{ key: 'kBig', ep: '5' }, { key: 'kBig', ep: '61' }]);
  ok('۱۳.۳ تکراری دوباره اضافه نمی‌شود', again === 1, String(again));

  // و سقف با اندازهٔ واقعیِ رشته سنجیده می‌شود، نه با یک عددِ حدسی
  const huge = [];
  for (let n = 1; n <= 400; n++) huge.push({ key: 'kHuge'.repeat(3), ep: String(n) });
  global.__PROPS[PK.HANDOUT_DUE] = '';
  handoutDueAddMany_(huge);
  const stored = String(global.__PROPS[PK.HANDOUT_DUE] || '');
  ok('۱۳.۴ صف زیرِ سقفِ خاصیتِ Apps Script می‌مانَد',
     stored.length > 0 && stored.length <= 8000, String(stored.length) + ' نویسه');
  const kept = handoutDueList_();
  ok('۱۳.۵ و آنچه ماند، ابتدای کتاب است نه وسطش',
     String(kept[0].ep) === '1', String(kept[0].ep));
  global.__PROPS[PK.HANDOUT_DUE] = '';
}

console.log('=== ۱۴) جزوه، ذیلِ همان مجموعه در تخته ===');
{
  /* «بهتره که این پیشرفتِ جزوات و برخی کنترل‌هاش خودش رو تو این قسمت هم
   * ذیلِ اون مجموعه نشون بده؟» — همان درسِ ۵٫۶۱ برای تقویم: کنترلی که جای
   * دیگری از کاری که کنترل می‌کند بنشیند، پیدا نمی‌شود. */
  const hub = new Spread('هاب۱۴');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('۰۶ — تخته');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kBoard'; row[SC.NAME - 1] = 'مجموعهٔ تخته';
  row[SC.FOLDER - 1] = sf.getId(); row[SC.EPISODES - 1] = '1 2';
  row[SC.STATUS - 1] = SST.ACTIVE; row[SC.CHUNKS - 1] = 10; row[SC.CUR_CHUNK - 1] = 4;
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  for (const n of [1, 2]) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kBoard', seriesName: 'مجموعهٔ تخته',
      ep: { title: 'د' + n, sections: [{ heading: 'ب', narration: 'م. د.' }] } }),
      'application/json', '_special.json'));
  }
  global.handoutPatchModel_ = (b, secs, meta) => ({ newChapters: [
    { title: 'فصلِ ' + meta.epNum, sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });

  // یک درس ساخته می‌شود، یکی در صف می‌مانَد
  handoutDueAdd_('kBoard', '1');
  handoutRunDue_(1);
  handoutDueAdd_('kBoard', '2');

  const map = handoutBoardMap_(hub);
  ok('۱۴.۱ تخته حالِ جزوه را از تب می‌خواند، نه از درایو',
     !!map['kBoard'] && map['kBoard'].totCh === 1 && map['kBoard'].lessons === 1,
     JSON.stringify(map['kBoard'] || null));
  ok('۱۴.۲ و شمارِ صفِ همان مجموعه را می‌داند',
     handoutDueByKey_()['kBoard'] === 1, String(handoutDueByKey_()['kBoard']));

  const d = seriesBoardData_(hub);
  const allRows = (d.groups || []).reduce((a, g) => a.concat(g.series || []), []);
  const r = allRows.filter(x => x.key === 'kBoard')[0];
  ok('۱۴.۳ ردیفِ مجموعه در تخته دادهٔ جزوه دارد',
     !!r && !!r.handout && r.handoutDue === 1,
     r ? JSON.stringify({ h: !!r.handout, due: r.handoutDue }) : 'بی‌ردیف');

  const html = seriesBoardHtml_(d);
  ok('۱۴.۴ ستونِ «جزوه» در جدول هست', html.indexOf('<th>جزوه</th>') !== -1);
  ok('۱۴.۵ و ذیلِ همان مجموعه، فصل و بخش و ارجاع را نشان می‌دهد',
     html.indexOf('باز کردنِ جزوه') !== -1 && /فصل\s*·/.test(html));
  ok('۱۴.۶ و می‌گوید چند درس هنوز وارد نشده',
     html.indexOf('درس هنوز وارد نشده') !== -1 || html.indexOf('در صف') !== -1);
  ok('۱۴.۷ جعبهٔ بالای تخته هم حالِ کلی را می‌گوید',
     html.indexOf('جزوهٔ مجموعه‌ها') !== -1 &&
     html.indexOf('واردکردنِ قسمت‌های گذشته') !== -1);

  /* ══ بدترین جنسِ خرابی در این پنجره‌ها ══
     `google.script.run.X()` روی تابعِ ناموجود هیچ خطایی نمی‌دهد و هیچ
     آزمونی نمی‌شکند — فقط دکمه زده می‌شود و هیچ اتفاقی نمی‌افتد.
     run_wiring_test.js ۵.۲ این را برای کلِ تخته می‌گیرد؛ اینجا هم صریح. */
  ok('۱۴.۸ دکمهٔ هر مجموعه به تابعِ واقعی وصل است',
     /onclick="handoutSeries\(this\)"/.test(html) &&
     html.indexOf('.uiHandoutSeries(k)') !== -1 &&
     typeof global.uiHandoutSeries === 'function');
  ok('۱۴.۹ و دکمهٔ همه هم',
     html.indexOf('.uiHandoutAll()') !== -1 && typeof global.uiHandoutAll === 'function');

  // و خودِ دکمه واقعاً کار می‌کند
  const res = uiHandoutSeries('kBoard');
  ok('۱۴.۱۰ دکمه درسِ در صف را می‌سازد و پیامِ قابل‌فهم می‌دهد',
     res && res.ok === true && /\d/.test(String(res.message)), String(res.message));
  const book = JSON.parse(sf.getFilesByName('_HANDOUT.json').next().getBlob().getDataAsString());
  ok('۱۴.۱۱ و هر دو درس حالا در جزوه‌اند', book.episodes.length === 2,
     String(book.episodes.length));
  ok('۱۴.۱۲ پاسخِ دکمه قالبِ {message} دارد — وگرنه پنجره «انجام شد.» می‌گوید و بس',
     typeof res.message === 'string' && res.message.length > 5);

  // مجموعه‌ای که هنوز قسمتی نساخته، دکمهٔ بی‌اثر نمی‌گیرد
  const row2 = new Array(SERIES_HEADERS.length).fill('');
  row2[SC.KEY - 1] = 'kEmpty'; row2[SC.NAME - 1] = 'خالی';
  reg.getRange(3, 1, 1, SERIES_HEADERS.length).setValues([row2]);
  const d2 = seriesBoardData_(hub);
  const e2 = (d2.groups || []).reduce((a, g) => a.concat(g.series || []), [])
               .filter(x => x.key === 'kEmpty')[0];
  ok('۱۴.۱۳ مجموعهٔ بی‌قسمت خانهٔ خالی می‌گیرد، نه دکمهٔ بی‌اثر',
     handoutCell_(e2).indexOf('button') === -1, handoutCell_(e2));
}

console.log('=== ۱۵) بی هیچ دکمه‌ای — سه پرسشِ صاحبِ برنامه ===');
{
  const hub = new Spread('هاب۱۵');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];
  delete global.__PROPS[PK.HANDOUT_STAT];
  delete global.__PROPS[PK.HANDOUT_SEEN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const mk = (r, key, name, eps) => {
    const sf = global.__ROOT_FOLDER.createFolder('م-' + key);
    const row = new Array(SERIES_HEADERS.length).fill('');
    row[SC.KEY - 1] = key; row[SC.NAME - 1] = name;
    row[SC.FOLDER - 1] = sf.getId(); row[SC.EPISODES - 1] = eps.join(' ');
    reg.getRange(r, 1, 1, SERIES_HEADERS.length).setValues([row]);
    for (const n of eps) {
      const g = sf.createFolder('قسمت ' + n);
      g.createFile(Utilities.newBlob(JSON.stringify({
        epNum: n, seriesKey: key, seriesName: name,
        ep: { title: 'د' + n, sections: [{ heading: 'ب', narration: 'متنِ درس. دوم.' }] } }),
        'application/json', '_special.json'));
    }
    return sf;
  };
  const sfA = mk(2, 'kAuto', 'خودکار', [1, 2, 3]);
  global.handoutPatchModel_ = (b, secs, meta) => ({ newChapters: [
    { title: 'فصلِ ' + meta.epNum, sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });

  /* ── پرسشِ ۱: «آیا باید همیشه دکمهٔ به‌روزرسانی را بزنم؟» ──
     نه. هیچ دکمه‌ای زده نمی‌شود؛ فقط همان کاری که کارِ شبانه می‌کند. */
  for (let night = 1; night <= 3; night++) {
    delete global.__PROPS[PK.HANDOUT_SCAN];
    handoutBackfill_(50);
    handoutRunDue_(2);
  }
  const bookA = JSON.parse(sfA.getFilesByName('_HANDOUT.json').next()
                    .getBlob().getDataAsString());
  ok('۱۵.۱ بی هیچ دکمه‌ای، هر سه درس وارد جزوه شدند',
     bookA.episodes.length === 3, String(bookA.episodes.length));
  ok('۱۵.۲ و به‌ترتیب', bookA.chapters.map(c => c.title).join('|') ===
     'فصلِ 1|فصلِ 2|فصلِ 3', bookA.chapters.map(c => c.title).join('|'));

  /* ── پرسشِ ۲: «ممکن است قسمتی وارد نشود و کسی هم متوجه نشود؟» ──
     مدل را برای همیشه خراب می‌کنیم. باید سه چیز بشود: تلاش متوقف شود
     (هدر نرود)، درس **رهاشده** اعلام شود، و یافتهٔ کد ساخته شود. */
  const sfB = mk(3, 'kFail', 'شکست‌خورده', [1]);
  global.handoutPatchModel_ = () => ({ newChapters: [] });
  let rowsBefore = 0;
  for (let night = 1; night <= 8; night++) {
    delete global.__PROPS[PK.HANDOUT_SCAN];
    handoutBackfill_(50);
    handoutRunDue_(3);
    if (night === 5) rowsBefore = hub.getSheetByName(CFG.HANDOUT_TAB).getLastRow();
  }
  const rowsAfter = hub.getSheetByName(CFG.HANDOUT_TAB).getLastRow();
  ok('۱۵.۳ تلاشِ بی‌فایده متوقف می‌شود — هر شب یک فراخوانِ مدل هدر نمی‌رود',
     rowsAfter === rowsBefore, rowsBefore + ' → ' + rowsAfter);
  const bookB = JSON.parse(sfB.getFilesByName('_HANDOUT.json').next()
                    .getBlob().getDataAsString());
  ok('۱۵.۴ ولی درس پنهان نمی‌شود — در خودِ کتاب «رهاشده» ثبت است',
     handoutAbandoned_(bookB).length === 1 &&
     handoutAbandoned_(bookB)[0].why === 'وصله خالی بود',
     JSON.stringify(handoutAbandoned_(bookB)));
  const st = handoutStatus_();
  const rB = st.series.filter(x => x.key === 'kFail')[0];
  ok('۱۵.۵ وضعیت آن را «رهاشده» می‌شمارد، نه «عقب»',
     rB && rB.abandoned === 1 && rB.behind === 0,
     rB ? JSON.stringify({ ab: rB.abandoned, be: rB.behind }) : 'بی‌ردیف');

  const probs = [], notes = [];
  handoutHealth_(probs, notes);
  ok('۱۵.۶ سلامت صریح اعلامش می‌کند',
     probs.some(x => x.indexOf('رهاشده') !== -1 || x.indexOf('تلاش') !== -1),
     probs.join(' | '));
  const rep = hub.getSheetByName(CFG.REPORT_TAB);
  const found = [];
  if (rep && rep.getLastRow() > 1) {
    const vv = rep.getRange(2, 1, rep.getLastRow() - 1, REPORT_HEADERS.length).getValues();
    for (const v of vv) found.push(String(v[RC.ID - 1]) + '|' + String(v[RC.OWNER - 1]) +
                                  '|' + String(v[RC.STATUS - 1]));
  }
  ok('۱۵.۷ و یافتهٔ «کد» در صفِ NEEDS_CODE می‌سازد',
     found.some(x => x.indexOf('handout-abandoned') !== -1 &&
                     x.indexOf('کد') !== -1 && x.indexOf(RST.NEEDS_CODE) !== -1),
     found.join(' ; '));

  /* و راهِ برگشت: سدی که با دستِ آدم هم باز نشود، سد نیست. */
  global.handoutPatchModel_ = (b, secs, meta) => ({ newChapters: [
    { title: 'حالا شد', sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });
  const back = handoutOneSeries_('kFail', 3);
  ok('۱۵.۸ دکمهٔ همان مجموعه سابقهٔ تلاش را پاک می‌کند و از نو می‌سازد',
     back.reset === 1 && back.done === 1,
     JSON.stringify({ reset: back.reset, done: back.done }));

  /* ── پرسشِ ۳: «بعد از به سقف خوردنِ وارسیِ روزانه چه؟» ──
     سقف دیگر همیشه از ابتدای فهرست شمرده نمی‌شود. */
  const savedCap = CFG.HANDOUT_SCAN_MAX;
  CFG.HANDOUT_SCAN_MAX = 5;                       // کف ۵ است
  for (let n = 4; n <= 15; n++) mk(n, 'kR' + n, 'چرخان ' + n, [1]);
  delete global.__PROPS[PK.HANDOUT_STAT];
  const seenKeys = Object.create(null);
  let nights = 0, rotating = 0, cyc = 0;
  while (nights < 12) {
    nights++;
    const s2 = handoutStatus_();
    rotating = s2.rotating; cyc = s2.cycleNights;
    s2.series.forEach(x => { seenKeys[x.key] = 1; });
  }
  const allKeys = [];
  for (let n = 4; n <= 15; n++) allKeys.push('kR' + n);
  allKeys.push('kAuto', 'kFail');
  const missed = allKeys.filter(k => !seenKeys[k]);
  ok('۱۵.۹ با پنجرهٔ چرخان، هیچ مجموعه‌ای برای همیشه نادیده نمی‌مانَد',
     missed.length === 0, 'ندیده: ' + (missed.join(',') || '—'));
  ok('۱۵.۱۰ و وضعیت می‌گوید دورِ کامل چند شب است',
     cyc > 0 && rotating > 0, 'چرخان ' + rotating + '، دور ' + cyc + ' شب');

  /* و مشکلی که پیدا شده، با چرخش گم نمی‌شود: مجموعهٔ عقب‌مانده هر شب
     دوباره سنجیده می‌شود، حتی وقتی نوبتِ پنجره نیست. */
  const watchNow = JSON.parse(global.__PROPS[PK.HANDOUT_SEEN] || '{}');
  ok('۱۵.۱۱ مجموعهٔ ایراددار زیرِ نظرِ همیشگی می‌مانَد',
     Object.keys(watchNow).length > 0, Object.keys(watchNow).join(','));
  const s3 = handoutStatus_();
  const watchedKeys = s3.series.map(x => x.key);
  ok('۱۵.۱۲ و در همان شب هم سنجیده می‌شود، هرچند نوبتِ پنجره‌اش نباشد',
     Object.keys(watchNow).every(k => watchedKeys.indexOf(k) !== -1),
     'زیرِ نظر: ' + Object.keys(watchNow).join(',') + ' | سنجیده: ' + watchedKeys.join(','));
  ok('۱۵.۱۳ و سقف‌خوردن به‌جای «دیده نشد»، «نوبتش نشد» گزارش می‌شود',
     (function () { const nn = []; handoutHealth_([], nn);
       return nn.some(x => x.indexOf('نوبتشان نشد') !== -1 && x.indexOf('دورِ کامل') !== -1); })());
  CFG.HANDOUT_SCAN_MAX = savedCap;
}

console.log('=== ۱۶) دکمهٔ دستی: سقفِ زمان، نه سقفِ شمارش ===');
{
  /* کارِ شبانه و پایانِ قسمت مهمان‌اند و باید محافظه‌کار باشند. ولی وقتی
   * آدم دکمه را می‌زند، کارِ اصلیِ آن اجرا همین است و شش دقیقه در اختیار
   * دارد. سقفِ ثابتِ دو تا یعنی برای پانزده درسِ عقب‌مانده هشت بار فشردن —
   * همان کارِ دستی‌ای که قرار بود نباشد. */
  const hub = new Spread('هاب۱۶');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('م۱۶');
  const eps = [1, 2, 3, 4, 5, 6, 7, 8];
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kMany'; row[SC.NAME - 1] = 'پرقسمت';
  row[SC.FOLDER - 1] = sf.getId(); row[SC.EPISODES - 1] = eps.join(' ');
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  for (const n of eps) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kMany', seriesName: 'پرقسمت',
      ep: { title: 'د' + n, sections: [{ heading: 'ب', narration: 'متن. دوم.' }] } }),
      'application/json', '_special.json'));
  }
  global.handoutPatchModel_ = (b, secs, meta) => ({ newChapters: [
    { title: 'فصلِ ' + meta.epNum, sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });

  const r = uiHandoutAll();
  const book = JSON.parse(sf.getFilesByName('_HANDOUT.json').next().getBlob().getDataAsString());
  ok('۱۶.۱ یک فشردن، همهٔ هشت درس را ساخت — نه دو تا',
     book.episodes.length === 8, String(book.episodes.length) + ' — ' + r.message);
  ok('۱۶.۲ و ترتیبِ کتاب درست ماند',
     book.chapters.map(c => c.title).join('|') === eps.map(n => 'فصلِ ' + n).join('|'),
     book.chapters.map(c => c.title).join('|'));
  ok('۱۶.۳ صف خالی شد', handoutDueList_().length === 0);

  /* ولی سقفِ زمان واقعاً کار می‌کند: با بودجهٔ صفرِ عملی، هیچ‌کدام ساخته
     نمی‌شوند و صف دست‌نخورده می‌مانَد — نه اینکه بی‌صدا دور ریخته شود. */
  global.__PROPS[PK.HANDOUT_DUE] = '';
  const sf2 = global.__ROOT_FOLDER.createFolder('م۱۶ب');
  const row2 = new Array(SERIES_HEADERS.length).fill('');
  row2[SC.KEY - 1] = 'kTime'; row2[SC.NAME - 1] = 'زمان';
  row2[SC.FOLDER - 1] = sf2.getId(); row2[SC.EPISODES - 1] = '1 2 3';
  reg.getRange(3, 1, 1, SERIES_HEADERS.length).setValues([row2]);
  for (const n of [1, 2, 3]) {
    const g = sf2.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kTime', seriesName: 'زمان',
      ep: { title: 'د', sections: [{ heading: 'ب', narration: 'م. د.' }] } }),
      'application/json', '_special.json'));
  }
  handoutDueAddMany_([1, 2, 3].map(n => ({ key: 'kTime', ep: String(n) })));
  /* بودجهٔ منفی یعنی «وقت از همان اول تمام است» — سخت‌ترین حالت، و
     ساعتِ ساختگیِ آزمون هم آن را می‌فهمد (برخلافِ «یک میلی‌ثانیه» که در
     یک اجرای فوریِ ماک هرگز نمی‌گذرد). */
  const rt = handoutRunDue_(99, -1);
  ok('۱۶.۴ با تمام‌شدنِ وقت، بقیه در صف می‌مانند نه اینکه گم شوند',
     rt.ranOut === true && handoutDueList_().length === 2,
     JSON.stringify({ ranOut: rt.ranOut, left: handoutDueList_().length }));
  ok('۱۶.۵ و دستِ‌کم یکی ساخته می‌شود — اجرا بی‌پیشرفت برنمی‌گردد',
     rt.done === 1, String(rt.done));

  // کارِ شبانه محافظه‌کار می‌مانَد
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۱۶.۶ ولی کارِ شبانه همان سقفِ محافظه‌کار را دارد',
     su.indexOf('HANDOUT_MAX_PER_RUN') !== -1 &&
     su.indexOf('HANDOUT_MANUAL_MS') === -1);
  const sp = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۱۶.۷ و پایانِ قسمت فقط یکی می‌سازد — نباید رسیدنِ پادکست را عقب بیندازد',
     sp.indexOf('handoutRunDue_(1)') !== -1);
  global.__PROPS[PK.HANDOUT_DUE] = '';
}

console.log('=== ۱۷) بی بازکردنِ هیچ تبی ===');
{
  /* «من هیچ‌وقت نمی‌روم توی شیت و تب‌ها را نگاه کنم و این را باید خودِ
   * ناظر همه‌چیز را ببیند. چون دیدم بارها می‌گویی برو فلان تب را ببین.»
   * درست است. پس هرچه لازم است باید در چیزی باشد که او می‌خواند: ایمیلِ
   * قسمت، و گزارشِ روزانه. */
  const hub = new Spread('هاب۱۷');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];
  delete global.__PROPS[PK.HANDOUT_STAT];
  delete global.__PROPS[PK.HANDOUT_SEEN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('م۱۷');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kSee'; row[SC.NAME - 1] = 'دیدنی';
  row[SC.FOLDER - 1] = sf.getId(); row[SC.EPISODES - 1] = '1 2';
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  for (const n of [1, 2]) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kSee', seriesName: 'دیدنی',
      ep: { title: 'د' + n, sections: [{ heading: 'ب', narration: 'متن. دوم.' }] } }),
      'application/json', '_special.json'));
  }
  global.handoutPatchModel_ = (b, secs, meta) => ({ newChapters: [
    { title: 'فصلِ ' + meta.epNum, sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });
  handoutDueAddMany_([{ key: 'kSee', ep: '1' }, { key: 'kSee', ep: '2' }]);
  handoutRunDue_(9);

  /* ۱) گزارشِ روزانه: خطِ حال **همیشه** هست، حتی وقتی هیچ ایرادی نیست.
        سکوت را نمی‌شود از «این قابلیت مرده» تشخیص داد. */
  const probs = [], notes = [];
  handoutHealth_(probs, notes);
  ok('۱۷.۱ وقتی همه‌چیز خوب است، هیچ ایرادی گزارش نمی‌شود',
     probs.length === 0, probs.join(' | '));
  ok('۱۷.۲ ولی خطِ حال باز هم می‌آید — سکوت پاسخ نیست',
     notes.some(x => x.indexOf('جزوه:') === 0), notes.join(' | '));
  ok('۱۷.۳ و خط عددهای واقعی را می‌گوید، نه جملهٔ کلی',
     notes.some(x => /جزوه: .*۱|جزوه: .*1 جزوه/.test(x) || /2 از 2 درس/.test(x)),
     notes.join(' | '));

  const st = handoutStatus_();
  ok('۱۷.۴ همان جمله در _STATUS.json هم هست تا ناظر فقط نقلش کند',
     typeof st.line === 'string' && st.line.indexOf('جزوه:') === 0, st.line);
  ok('۱۷.۵ و وقتی همه به‌روزند، صریح می‌گوید «همه به‌روز»',
     st.line.indexOf('همه به‌روز') !== -1, st.line);

  /* ۲) ایمیل و تلگرامِ خودِ قسمت: خبر **و لینک**، تا لازم نباشد جایی باز
        شود. این پرخوانده‌ترین چیزی است که صاحبِ برنامه می‌بیند. */
  const line = handoutLineFull_('دیدنی');
  ok('۱۷.۶ خطِ قسمت لینکِ جزوه را هم دارد',
     !!line.text && String(line.url).indexOf('http') === 0,
     line.text + ' | ' + line.url);
  const mailBox = handoutHtmlLine_('دیدنی');
  ok('۱۷.۷ و در ایمیلِ قسمت یک لینکِ واقعی رندر می‌شود',
     mailBox.indexOf('<a href="') !== -1 && mailBox.indexOf('باز کردنِ جزوه') !== -1,
     mailBox.slice(0, 120));
  const tgBox = tgHandoutLine_('دیدنی');
  ok('۱۷.۸ در تلگرام هم', tgBox.indexOf('<a href="') !== -1, tgBox.slice(0, 100));

  /* ۳) و وقتی چیزی خراب است، خطِ حال خودش هشدار را می‌بَرد — نه اینکه
        بگوید «برو تب را ببین». */
  const sf2 = global.__ROOT_FOLDER.createFolder('م۱۷ب');
  const row2 = new Array(SERIES_HEADERS.length).fill('');
  row2[SC.KEY - 1] = 'kBad'; row2[SC.NAME - 1] = 'خراب';
  row2[SC.FOLDER - 1] = sf2.getId(); row2[SC.EPISODES - 1] = '1';
  reg.getRange(3, 1, 1, SERIES_HEADERS.length).setValues([row2]);
  const g2 = sf2.createFolder('قسمت 1');
  g2.createFile(Utilities.newBlob(JSON.stringify({
    epNum: 1, seriesKey: 'kBad', seriesName: 'خراب',
    ep: { title: 'د', sections: [{ heading: 'ب', narration: 'م. د.' }] } }),
    'application/json', '_special.json'));
  global.handoutPatchModel_ = () => ({ newChapters: [] });
  for (let k = 0; k < 5; k++) {
    handoutDueAddMany_([{ key: 'kBad', ep: '1' }]);
    handoutRunDue_(3);
  }
  const st2 = handoutStatus_();
  ok('۱۷.۹ خطِ حال، خودش «رهاشده» را با نشانِ هشدار می‌آورد',
     st2.line.indexOf('رهاشده') !== -1 && st2.line.indexOf('⚠') !== -1, st2.line);

  /* ۴) و دستورِ ناظر صریح ممنوع کرده که به‌جای جواب، آدرسِ تب بدهد. */
  const pr = fs.readFileSync('docs/prompts/_PROMPT-monitor-v10.md', 'utf8');
  ok('۱۷.۱۰ دستورِ ناظر «برو فلان تب را ببین» را ممنوع کرده',
     pr.indexOf('هرگز ننویس «برو فلان تب را ببین»') !== -1 ||
     pr.indexOf('هرگز در ایمیل ننویس «برو فلان تب/شیت/فایل را ببین»') !== -1);
  ok('۱۷.۱۱ و کارتابلِ روزانه هر روز می‌آید، حتی وقتی همه‌چیز خوب است',
     pr.indexOf('کارتابلِ روزانه') !== -1 &&
     pr.indexOf('حتی وقتی همه‌چیز خوب است') !== -1);
  ok('۱۷.۱۲ و جزوه یکی از ردیف‌های ثابتِ آن است',
     pr.indexOf('`handout.line`') !== -1);
  global.__PROPS[PK.HANDOUT_DUE] = '';
}

console.log('=== ۱۸) یک ایمیل در روز، نه شش تا ===');
{
  /* «تعددِ ایمیل‌ها زیاد شده و نمی‌خواهم هی برای هر چیز یک ایمیلِ جدا
   * بیاید.» — و ایرادِ طراحی بود نه سلیقه: وقتی هر چیزی ایمیلِ خودش را
   * دارد، هیچ‌کدام خوانده نمی‌شوند و هشدارِ واقعی لای خبرهای روزمره گم
   * می‌شود. */
  const hub = new Spread('هاب۱۸');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  mailQueueClear_();
  global.__MAIL.length = 0;

  ok('۱۸.۱ صف در آغاز خالی است', mailQueueRead_().length === 0);
  mailQueue_('code', 'کدِ نسخهٔ ۹.۹ نصب شد', 'متنِ خبر');
  mailQueue_('backup', 'پشتیبانِ شیت‌ها گرفته شد', '۵ شیت');
  ok('۱۸.۲ خبرها در صف می‌نشینند، نه در صندوقِ ورودی',
     mailQueueRead_().length === 2 && global.__MAIL.length === 0,
     mailQueueRead_().length + ' در صف، ' + global.__MAIL.length + ' ایمیل');

  const html = mailQueueHtml_(mailQueueRead_());
  ok('۱۸.۳ و همه در یک بخشِ ایمیل رندر می‌شوند',
     html.indexOf('کدِ نسخهٔ ۹.۹ نصب شد') !== -1 &&
     html.indexOf('پشتیبانِ شیت‌ها گرفته شد') !== -1 &&
     html.indexOf('خبرهای امروز') !== -1);

  /* سقف با اندازهٔ رشته سنجیده می‌شود (خاصیتِ Apps Script ۹ کیلوبایت است)
     و از **سر** بریده می‌شود، چون تازه‌ترین خبر مهم‌تر است. */
  for (let k = 0; k < 200; k++) mailQueue_('x', 'خبرِ ' + k, 'م'.repeat(80));
  const big = String(global.__PROPS[PK.MAIL_QUEUE] || '');
  ok('۱۸.۴ صف زیرِ سقفِ خاصیت می‌مانَد', big.length > 0 && big.length <= 8000,
     String(big.length) + ' نویسه');
  const kept = mailQueueRead_();
  ok('۱۸.۵ و تازه‌ترین خبر همیشه می‌مانَد',
     kept[kept.length - 1].title === 'خبرِ 199', kept[kept.length - 1].title);

  /* شکستِ صف باید **دیده** شود، نه اینکه «رسید» شمرده شود: هشداری که به
     هیچ‌کس نرسیده نباید تحویل‌شده ثبت شود. */
  const realProps = global.PropertiesService.getScriptProperties;
  global.PropertiesService.getScriptProperties = function () {
    const real = realProps.call(global.PropertiesService);
    return { getProperty: (k) => real.getProperty(k),
             deleteProperty: (k) => real.deleteProperty(k),
             setProperty: (k) => { throw new Error('down'); } };
  };
  ok('۱۸.۶ صفِ خراب false برمی‌گرداند، نه اینکه بی‌صدا موفق شود',
     mailQueue_('x', 'ی', 'م') === false);
  global.PropertiesService.getScriptProperties = realProps;

  // و مسیرهای واقعی: هیچ‌کدام دیگر ایمیلِ جدا نمی‌فرستند
  const src = ['src/17_Backup.gs', 'src/21_SelfUpdate.gs', 'src/22_SourceScripts.gs',
               'src/12_Reports.gs'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
  ok('۱۸.۷ نصبِ کد، پشتیبان، یادآورِ دستور و یافته همه در صف می‌روند',
     /mailQueue_\('code'/.test(src) && /mailQueue_\('backup'/.test(src) &&
     /mailQueue_\('prompt'/.test(src) && /mailQueue_\('code-needed'/.test(src));
  const he = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۱۸.۸ و وارسیِ سلامت همه را در یک ایمیل می‌فرستد',
     he.indexOf('mailQueueHtml_(queued)') !== -1 &&
     /if \(problems\.length \|\| queued\.length\)/.test(he));
  ok('۱۸.۹ و صف فقط پس از ارسالِ موفق پاک می‌شود',
     he.indexOf('mailQueueClear_();') > he.indexOf('MailApp.sendEmail({ to: CFG.EMAIL_TO,'),
     'ترتیب درست است');
  /* شرط سنجیده می‌شود، نه واژه‌های تیتر: از ۶٫۱۱ تیترِ حالتِ سالم عوض شد
     («کاری از شما لازم نیست») و همین سنجه به‌خاطرِ متن شکست، در حالی که
     رفتار درست بود. سنجه‌ای که به واژه بند باشد، هر بازنویسی را ایراد
     می‌خواند. */
  ok('۱۸.۱۰ ایمیلِ روزانه حتی بی‌ایراد هم می‌رود، اگر خبری باشد',
     /if \(problems\.length \|\| queued\.length\)/.test(he) &&
     /\?[\s\S]{0,80}⚠️ موتور محتوا[\s\S]{0,200}:[\s\S]{0,80}✅ موتور محتوا/.test(he));
  /* و آنچه تا ساعت ۱۰ صبر نمی‌کند، فوری می‌مانَد */
  ok('۱۸.۱۱ ولی بازگردانیِ کدِ خراب همچنان فوری ایمیل می‌شود',
     /برگشت خورد به نسخهٔ قبل'[\s\S]{0,200}, true\)/.test(src));
  mailQueueClear_();
}

console.log('=== ۱۹) رجیستریِ ۲۶۴ ردیفی و دکمه‌ای که «۰ و ۰» گفت ===');
{
  /* ══ آنچه صاحبِ برنامه دید ══
   * نصب کرد، دکمه را زد، و پیام گفت «جزوه همین حالا به‌روز شد ۰ · درس در
   * صف مانده ۰» — در حالی که مجموعهٔ فعالش سیزده قسمتِ واردنشده داشت.
   * علت: سقفِ کاوش برای **هر ردیفِ رجیستری** بالا می‌رفت، و رجیستری ۲۶۴
   * ردیف دارد که بیشترشان اصلاً پوشه‌ای ندارند. یعنی ردِ ارزانِ ۲۵ ردیفِ
   * بی‌پوشه کلِ بودجه را می‌خورد و به مجموعهٔ واقعی هرگز نمی‌رسید. */
  const hub = new Spread('هاب۱۹');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  // ۶۰ مجموعهٔ بی‌پوشه (هنوز قسمتی نساخته‌اند) — همان چیزی که رجیستریِ
  // واقعی پر از آن است
  const rows = [];
  for (let n = 0; n < 60; n++) {
    const r = new Array(SERIES_HEADERS.length).fill('');
    r[SC.KEY - 1] = 'empty' + n; r[SC.NAME - 1] = 'بی‌قسمت ' + n;
    rows.push(r);
  }
  // و در ردیفِ ۶۱ ام، مجموعهٔ واقعی با سیزده قسمت
  const sf = global.__ROOT_FOLDER.createFolder('مجموعهٔ واقعی');
  const real = new Array(SERIES_HEADERS.length).fill('');
  real[SC.KEY - 1] = 'kReal'; real[SC.NAME - 1] = 'معرفت‌شناسی';
  real[SC.FOLDER - 1] = sf.getId();
  real[SC.EPISODES - 1] = '3 4 5 6 7 8 9 10 11 12 13 14 15';
  rows.push(real);
  reg.getRange(2, 1, rows.length, SERIES_HEADERS.length).setValues(rows);
  for (let n = 3; n <= 15; n++) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kReal', seriesName: 'معرفت‌شناسی',
      ep: { title: 'د' + n, sections: [{ heading: 'ب', narration: 'متن. دوم.' }] } }),
      'application/json', '_special.json'));
  }

  const b = handoutBackfill_(25);
  ok('۱۹.۱ ردیف‌های بی‌پوشه بودجه را نمی‌خورند',
     b.rows >= 61 && b.walked === 1, b.rows + ' ردیف دیده شد، ' + b.walked + ' پوشه پیمایش شد');
  ok('۱۹.۲ و مجموعهٔ واقعی — هرچقدر هم پایینِ فهرست — پیدا می‌شود',
     b.queued === 13 && b.series === 1, String(b.queued));
  ok('۱۹.۳ و یک دور کامل شد', b.wrapped === true);

  global.handoutPatchModel_ = (bk, secs, meta) => ({ newChapters: [
    { title: 'فصلِ ' + meta.epNum, sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });
  const res = runHandoutBuild();
  ok('۱۹.۴ و همان یک فشردن هر سیزده درس را می‌سازد',
     res.run.done === 13 && res.left === 0,
     res.run.done + ' ساخته، ' + res.left + ' مانده');
  const book = JSON.parse(sf.getFilesByName('_HANDOUT.json').next().getBlob().getDataAsString());
  ok('۱۹.۵ و به‌ترتیبِ درس', book.chapters[0].title === 'فصلِ 3' &&
     book.chapters[book.chapters.length - 1].title === 'فصلِ 15',
     book.chapters[0].title + ' … ' + book.chapters[book.chapters.length - 1].title);

  /* ── و پیام: «۰ و ۰» بی توضیح، سه حالتِ کاملاً متفاوت را یک‌شکل می‌کرد ── */
  const again = runHandoutBuild();
  ok('۱۹.۶ وقتی کاری نمانده، پیام صریح می‌گوید «همه به‌روزند»',
     /همه به‌روز|کاری نمانده/.test(again.message), again.message.replace(/\n/g, ' | '));
  /* و عدد **پس از** واژهٔ فارسی می‌آید: در متنِ راست‌به‌چپ عددی که سرِ سطر
     بیاید به انتهای دیدنیِ سطر پرت می‌شود — «۰ جزوه ساخته شد» روی صفحه
     «جزوه ساخته شد ۰» دیده می‌شد، که همان چیزی است که در تصویر بود. */
  ok('۱۹.۷ و هیچ سطری با عدد شروع نمی‌شود',
     again.message.split('\n').every(x => !/^[•\s]*\d/.test(x)),
     again.message.split('\n').filter(x => /^[•\s]*\d/.test(x)).join(' / ') || 'هیچ');

  // مجموعه‌ای که هیچ پوشه‌ای ندارد: پیام باید بگوید چیزی پیدا نشد، نه سکوت
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];
  const hub2 = new Spread('هاب۱۹ب');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub2 };
  global.getHub_ = () => hub2;
  ensureTab_(hub2, CFG.SERIES_TAB, SERIES_HEADERS);
  const none = runHandoutBuild();
  ok('۱۹.۸ رجیستریِ بی‌پوشه هم پیامِ روشن می‌گیرد، نه صفرِ خاموش',
     /پیدا نشد|همه به‌روز|کاری نمانده/.test(none.message),
     none.message.replace(/\n/g, ' | '));
}

console.log('=== ۲۰) یافته‌ای که هیچ‌کس حلش نکرده، «نصب شد» نمی‌خورد ===');
{
  /* ══ آنچه در دادهٔ واقعیِ ۲۴ اوت بود ══
   * یک ردیفِ یافته (`RPT-2026-08-10-1235#5`) مُهرِ **چهارده** نسخهٔ مختلف
   * را داشت: ۵٫۵۱، ۵٫۵۲، ۵٫۵۳، ۵٫۵۶ … ۵٫۹۲ — و هیچ‌کدام سراغش نرفته
   * بودند. ۲۶ ردیف بیش از سه مُهر داشتند، و هر شب پیامِ «۳۰ ردیفِ نیازمند
   * تعویض کد نصب شد» می‌رفت.
   *
   * علت: `markCodeRowsInstalled_` وقتی بیانیه `sourceReportIds` نداده بود
   * **همهٔ** ردیف‌های باز را مُهر می‌زد، با این استدلال که «هر نسخهٔ کامل،
   * همهٔ اصلاح‌های اعلام‌شده تا آن لحظه را در خود دارد». نسخه همهٔ *کد* را
   * دارد، ولی این دلیل نمی‌شود که آن یافته را **حل کرده باشد**. */
  const hub = new Spread('هاب۲۰');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;

  const sh = ensureTab_(hub, CFG.REPORT_TAB, REPORT_HEADERS);
  const mk = (id, title) => {
    const r = new Array(REPORT_HEADERS.length).fill('');
    r[RC.ID - 1] = id; r[RC.TITLE - 1] = title;
    r[RC.OWNER - 1] = ROWNER_CODE; r[RC.STATUS - 1] = RST.NEEDS_CODE;
    return r;
  };
  sh.getRange(2, 1, 3, REPORT_HEADERS.length).setValues([
    mk('RPT-A#1', 'یافتهٔ حل‌نشده'), mk('RPT-B#2', 'یافتهٔ دیگر'),
    mk('RPT-C#3', 'یافتهٔ سوم')]);

  // بیانیه‌ای که هیچ ردیفی را به‌نام اعلام نکرده — همان چیزی که تقریباً
  // همهٔ نسخه‌ها می‌فرستند
  global.readCodeManifest_ = () => ({ info: { version: '9.9', sourceReportIds: [] } });
  const n0 = markCodeRowsInstalled_('9.9');
  ok('۲۰.۱ بیانیهٔ بی‌فهرست هیچ یافته‌ای را «نصب شد» نمی‌زند', n0 === 0, String(n0));
  const after = sh.getRange(2, 1, 3, REPORT_HEADERS.length).getValues();
  ok('۲۰.۲ و هر سه یافته در صف می‌مانند',
     after.every(r => String(r[RC.STATUS - 1]) === RST.NEEDS_CODE),
     after.map(r => r[RC.STATUS - 1]).join(' | '));

  // ولی بیانیه‌ای که ردیف را **به‌نام** اعلام کند، همان یکی را می‌بندد
  global.readCodeManifest_ = () => ({ info: { version: '9.9', sourceReportIds: ['RPT-B#2'] } });
  const n1 = markCodeRowsInstalled_('9.9');
  ok('۲۰.۳ ولی ردیفِ اعلام‌شده به‌نام مُهر می‌خورد', n1 === 1, String(n1));
  const after2 = sh.getRange(2, 1, 3, REPORT_HEADERS.length).getValues();
  ok('۲۰.۴ و فقط همان یکی',
     String(after2[1][RC.STATUS - 1]) === RST.INSTALLED &&
     String(after2[0][RC.STATUS - 1]) === RST.NEEDS_CODE &&
     String(after2[2][RC.STATUS - 1]) === RST.NEEDS_CODE,
     after2.map(r => r[RC.STATUS - 1]).join(' | '));

  // و مُهرِ دوباره روی ردیفِ مُهرخورده نمی‌نشیند — علتِ «۳۰ ردیف» هر شب
  const n2 = markCodeRowsInstalled_('9.10');
  ok('۲۰.۵ ردیفِ مُهرخورده هر شب دوباره مُهر نمی‌خورد', n2 === 0, String(n2));
  ok('۲۰.۶ و ستونِ «انجام‌شده» چهارده‌بار تکرار نمی‌شود',
     String(after2[1][RC.DONE - 1]).split('خودکار نصب شد').length - 1 === 1,
     String(after2[1][RC.DONE - 1]));

  /* و راهِ برگشت: یافته‌ای که «نصب شد» خورده ولی دوباره دیده می‌شود، یعنی
     آن نصب حلش نکرده. اگر باز نشود، برای همیشه در «انتظارِ تأییدِ ناظر»
     می‌مانَد و هیچ‌وقت به صف برنمی‌گردد. */
  /* حالا مسیرِ واقعی: یافته‌ای که خودِ موتور ثبت کرده، «نصب شد» بخورد، و
     بعد دوباره دیده شود. اگر باز نشود، برای همیشه در «انتظارِ تأییدِ ناظر»
     می‌مانَد و هیچ‌وقت به صف برنمی‌گردد — و با باگِ مُهرِ خودکار، ۳۰ یافته
     می‌توانستند این‌طور دفن شوند. */
  const realLog = global.logLine_;
  global.logLine_ = () => {};
  const F = { priority: 'جدی', category: 'تست', key: 'again-1',
              title: 'یافتهٔ تکرارشونده', detail: 'د', instruction: 'ی',
              owner: ROWNER_CODE };
  logSelfFinding_(hub, F);
  const findRow = () => {
    const n = sh.getLastRow() - 1;
    const v = sh.getRange(2, 1, n, REPORT_HEADERS.length).getValues();
    return v.filter(r => String(r[RC.TITLE - 1]) === 'یافتهٔ تکرارشونده')[0];
  };
  const rowNo = (() => {
    const n = sh.getLastRow() - 1;
    const v = sh.getRange(2, 1, n, REPORT_HEADERS.length).getValues();
    for (let k = 0; k < v.length; k++) {
      if (String(v[k][RC.TITLE - 1]) === 'یافتهٔ تکرارشونده') return 2 + k;
    }
    return 0;
  })();
  sh.getRange(rowNo, RC.STATUS).setValue(RST.INSTALLED);
  logSelfFinding_(hub, F);
  global.logLine_ = realLog;
  ok('۲۰.۷ یافتهٔ «نصب‌شده» که تکرار شود، دوباره باز می‌شود',
     String(findRow()[RC.STATUS - 1]).indexOf('تکرار') !== -1,
     String(findRow()[RC.STATUS - 1]));
}

console.log('=== ۲۱) دستورهایی که غلط شده بودند ===');
{
  /* دستوری که غلط باشد از دستورِ نبوده بدتر است: خواننده یا کارِ بیهوده
   * می‌کند یا یاد می‌گیرد کلِ پیام را نخواند. سه متن از دورانِ پیش از
   * ۵٫۱۲ و ۵٫۸۵ مانده بودند و هر شب در تلگرام می‌رفتند. */
  const rep = fs.readFileSync('src/12_Reports.gs', 'utf8');
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۲۱.۱ دیگر نمی‌گوید فایل را از Cowork بردار و Code.gs را پاک کن',
     rep.indexOf('کل ') === -1 || rep.indexOf('<code>Code.gs</code> را پاک کنید') === -1);
  ok('۲۱.۲ و می‌گوید کد خودش شبانه نصب می‌شود',
     rep.indexOf('خودش هر شب ساعت ۲:۳۰ از گیت‌هاب نصب می‌شود') !== -1);
  ok('۲۱.۳ یادآورِ دستورها دیگر «دستی» نمی‌گوید',
     su.indexOf('تا وقتی دستی به‌روز نشوند') === -1);
  ok('۲۱.۴ و مسیرِ درست را می‌گوید: docs/prompts در ریپو',
     su.indexOf('docs/prompts/ ساخته و push شود') !== -1 &&
     su.indexOf('docs/prompts/ ریپو**') !== -1);
}

console.log('=== ۲۲) عنوانِ فصل دو بار شماره نمی‌گیرد ===');
{
  /* در جزوهٔ واقعیِ «معرفت شناسی» شش فصل عنوانشان با «فصل N:» شروع می‌شد و
   * نمایش هم شماره می‌گذاشت: «۷. فصل 7: …». و شمارهٔ مدل با جای واقعیِ فصل
   * یکی نمی‌مانَد — کافی است درسی بعداً فصلی را وسط جا بدهد. */
  ok('۲۲.۱ «فصل ۷:» از سرِ عنوان برداشته می‌شود',
     handoutTitleClean_('فصل ۷: تقسیمات اولیهٔ علم حصولی') === 'تقسیمات اولیهٔ علم حصولی');
  ok('۲۲.۲ با رقمِ لاتین هم', handoutTitleClean_('فصل 7 — تصور و تصدیق') === 'تصور و تصدیق');
  ok('۲۲.۳ و شمارهٔ تنها هم', handoutTitleClean_('۳. مراتبِ ادراک') === 'مراتبِ ادراک');
  ok('۲۲.۴ ولی عنوانِ سالم دست نمی‌خورد',
     handoutTitleClean_('تعریفِ معرفت و سه شرطِ آن') === 'تعریفِ معرفت و سه شرطِ آن' &&
     handoutTitleClean_('فصل‌بندیِ دانش') === 'فصل‌بندیِ دانش');
  ok('۲۲.۵ و عنوانِ کاملاً شماره‌ای خالی نمی‌شود',
     handoutTitleClean_('فصل ۹:') === 'فصل ۹:');

  const book = handoutNew_({ seriesName: 'م' });
  handoutApply_(book, { newChapters: [{ title: 'فصل ۵: چیستیِ علم',
    sections: [{ title: '۱. باور', body: 'م', takeaway: 'چ' }] }] }, { epNum: '1' }, []);
  ok('۲۲.۶ و هنگامِ اعمال هم پاک می‌شود — نه فقط در تابع',
     book.chapters[0].title === 'چیستیِ علم' &&
     book.chapters[0].sections[0].title === 'باور',
     book.chapters[0].title + ' / ' + book.chapters[0].sections[0].title);
  const p26 = fs.readFileSync('src/26_Handout.gs', 'utf8');
  ok('۲۲.۷ و پرامپت هم صریح می‌گوید شماره نگذار',
     p26.indexOf('در عنوان شماره نگذار') !== -1);
}

console.log('=== ۲۳) تخته می‌گفت «۷ درس هنوز وارد نشده» و هر ۱۵ درس در جزوه بودند ===');
{
  /* ══ آنچه صاحبِ برنامه دید ══
   * ستونِ جزوه در تخته: «۱۵ از ۲۲ درس» و «۷ درس هنوز وارد نشده» — در حالی
   * که فایلِ واقعیِ جزوه هر ۱۵ درس را داشت. دو علتِ جدا:
   *
   * ۱) ستونِ «قسمت‌های پادکست» یک تاریخِ چسبیده دارد و تخته واژه‌هایش را
   *    می‌شمرد: ۹ توکنِ تاریخ + ۱۳ شماره = ۲۲.
   * ۲) و حتی شماره‌های همان ستون هم حقیقت نیستند: ستون ۳ تا ۱۵ را داشت،
   *    ولی پوشه ۱ تا ۱۵ را. مخرج باید از پوشه بیاید، نه از ستون. */
  ok('۲۳.۱ تاریخِ چسبیده دیگر قسمت شمرده نمی‌شود',
     epNumsOf_('Fri Jan 02 2026 00:00:00 GMT+0400 (Gulf Standard Time) 3 4 5 6 7 8 9 10 11 12 13 14 15')
       .length === 13);
  ok('۲۳.۲ و «۰۲» و «۲۰۲۶» شمارهٔ قسمت نیستند',
     epNumsOf_('02 2026 3 4').join(',') === '3,4');
  ok('۲۳.۳ ولی سلولِ سالم دست نمی‌خورد', epNumsOf_('1 2 3').join(',') === '1,2,3');
  ok('۲۳.۴ و تکراری‌ها یک بار شمرده می‌شوند', epNumsOf_('3 3 4').join(',') === '3,4');
  ok('۲۳.۵ سلولِ خالی صفر می‌دهد، نه خطا', epNumsOf_('').length === 0 && epNumsOf_(null).length === 0);

  const hub = new Spread('هاب۲۳');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  global.__PROPS[PK.HANDOUT_DUE] = '';
  delete global.__PROPS[PK.HANDOUT_SCAN];

  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);
  const sf = global.__ROOT_FOLDER.createFolder('م۲۳');
  const row = new Array(SERIES_HEADERS.length).fill('');
  row[SC.KEY - 1] = 'kBoard23'; row[SC.NAME - 1] = 'معرفت‌شناسی';
  row[SC.FOLDER - 1] = sf.getId(); row[SC.STATUS - 1] = SST.ACTIVE;
  // همان سلولِ خرابِ واقعی: تاریخ + شماره‌های ۳ تا ۱۵ (نه ۱ و ۲)
  row[SC.EPISODES - 1] =
    'Fri Jan 02 2026 00:00:00 GMT+0400 (Gulf Standard Time) 3 4 5 6 7 8 9 10 11 12 13 14 15';
  reg.getRange(2, 1, 1, SERIES_HEADERS.length).setValues([row]);
  // ولی پوشه هر ۱۵ قسمت را دارد
  for (let n = 1; n <= 15; n++) {
    const g = sf.createFolder('قسمت ' + n);
    g.createFile(Utilities.newBlob(JSON.stringify({
      epNum: n, seriesKey: 'kBoard23', seriesName: 'معرفت‌شناسی',
      ep: { title: 'د' + n, sections: [{ heading: 'ب', narration: 'متن. دوم.' }] } }),
      'application/json', '_special.json'));
  }
  global.handoutPatchModel_ = (b, secs, meta) => ({ newChapters: [
    { title: 'فصلِ ' + meta.epNum, sections: [{ title: 'ب', body: 'م', takeaway: 'چ' }] }] });

  handoutBackfill_(50);
  handoutRunDue_(99, 0);

  const map = handoutBoardMap_(hub);
  ok('۲۳.۶ شمارِ واقعیِ پوشه در تب ثبت می‌شود',
     map['kBoard23'] && map['kBoard23'].produced === 15,
     JSON.stringify(map['kBoard23'] && { made: map['kBoard23'].produced,
                                          lessons: map['kBoard23'].lessons }));
  ok('۲۳.۷ و هر ۱۵ درس وارد جزوه شده', map['kBoard23'].lessons === 15,
     String(map['kBoard23'].lessons));

  const d = seriesBoardData_(hub);
  const r = (d.groups || []).reduce((a, g) => a.concat(g.series || []), [])
              .filter(x => x.key === 'kBoard23')[0];
  ok('۲۳.۸ ستونِ «قسمت‌های ساخته‌شده» دیگر ۲۲ نمی‌گوید',
     r && r.episodes === 13, r ? String(r.episodes) : 'بی‌ردیف');

  const cell = handoutCell_(r);
  ok('۲۳.۹ و ستونِ جزوه «۱۵ از ۱۵» می‌گوید، نه «۱۵ از ۲۲»',
     cell.indexOf(faNum_(15) + ' از ' + faNum_(15)) !== -1,
     cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120));
  ok('۲۳.۱۰ و دیگر نمی‌گوید درسی وارد نشده',
     cell.indexOf('درس هنوز وارد نشده') === -1);

  const panel = handoutPanelHtml_(d);
  ok('۲۳.۱۱ جعبهٔ بالای تخته هم «عقب» نمی‌گوید',
     panel.indexOf('مجموعه عقب است') === -1,
     panel.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140));

  /* و سلولِ خراب هنگامِ افزودنِ قسمتِ بعدی خودش تمیز می‌شود — هیچ شماره‌ای
     از دست نمی‌رود. */
  const cleaned = epNumsOf_(row[SC.EPISODES - 1]);
  cleaned.push(16); cleaned.sort((a, b) => a - b);
  ok('۲۳.۱۲ سلول با قسمتِ تازه، تمیز بازنویسی می‌شود',
     epNumsJoin_(cleaned) === '3 4 5 6 7 8 9 10 11 12 13 14 15 16',
     epNumsJoin_(cleaned));
  const sp = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۲۳.۱۳ و مسیرِ واقعیِ افزودن همین کار را می‌کند',
     sp.indexOf('epNumsOf_(rec.vals[SC.EPISODES - 1])') !== -1 &&
     sp.indexOf('epNumsJoin_(epsNow)') !== -1);
}

console.log('=== ۲۴) جاروی یک‌بارهٔ عنوانِ فصل‌ها روی کتاب‌های واقعی ===');
{
  /* کتابی که دیگر درسِ تازه‌ای نمی‌گیرد (مجموعهٔ تمام‌شده) از هیچ مسیرِ
     دیگری مرتب نمی‌شود. این‌جا جارو با درایو و رجیستریِ واقعیِ ماک اجرا
     می‌شود، نه با گرپ روی متنِ کد. */
  const hub = new Spread('هاب۲۴');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  delete global.__PROPS[PK.HANDOUT_RETITLE];
  global.__PROPS[PK.HANDOUT_DUE] = '';
  const reg = ensureTab_(hub, CFG.SERIES_TAB, SERIES_HEADERS);

  const dirty = global.__ROOT_FOLDER.createFolder('۲۴ — کهنه');
  const clean = global.__ROOT_FOLDER.createFolder('۲۴ — تمیز');
  const mk = (folder, titles) => {
    const book = { seriesKey: 'k', seriesName: folder.getName(), cat: '', level: '',
                   createdAt: nowStr_(), updatedAt: '', revision: 2,
                   roadmap: { intro: '', stages: [], note: '' },
                   chapters: titles.map((t, i) => ({ id: 'c' + (i + 1), title: t, sections: [
                     { id: 's' + (i + 1), title: 'بخش', text: 'متنِ درس.', ep: '1', refs: [] }
                   ] })), refs: [], episodes: [{ n: '1', title: 'د۱', at: nowStr_() }] };
    handoutWrite_(folder, book);
    return book;
  };
  mk(dirty, ['فصل ۱: آغاز', 'فصل ۲: میانه']);
  mk(clean, ['آغاز', 'میانه']);
  const rows = [[ 'kD', 'کهنه' ], [ 'kC', 'تمیز' ]];
  const folders = [dirty, clean];
  for (let i = 0; i < rows.length; i++) {
    const r = new Array(SERIES_HEADERS.length).fill('');
    r[SC.KEY - 1] = rows[i][0]; r[SC.NAME - 1] = rows[i][1];
    r[SC.FOLDER - 1] = folders[i].getId();
    reg.getRange(2 + i, 1, 1, SERIES_HEADERS.length).setValues([r]);
  }

  const before = JSON.parse(dirty.getFilesByName(handoutJsonName_()).next()
                                 .getBlob().getDataAsString());
  const r1 = handoutRetitle_(10, 60000);
  ok('۲۴.۱ جارو کتابِ کهنه را پیدا و مرتب کرد',
     r1.series === 1 && r1.titles === 2, JSON.stringify({ s: r1.series, t: r1.titles }));
  const after = JSON.parse(dirty.getFilesByName(handoutJsonName_()).next()
                                .getBlob().getDataAsString());
  ok('۲۴.۲ و روی دیسک نوشته شد',
     after.chapters[0].title === 'آغاز' && after.chapters[1].title === 'میانه',
     after.chapters.map(c => c.title).join(' | '));
  ok('۲۴.۳ بازنگری یک پله بالا رفت',
     Number(after.revision) === Number(before.revision) + 1,
     before.revision + ' → ' + after.revision);
  ok('۲۴.۴ و HTML از نو ساخته شد',
     dirty.getFilesByName(handoutHtmlName_(after.seriesName)).hasNext());

  /* کتابِ تمیز نباید اصلاً نوشته شود — یک مهاجرتِ آرایشی که تاریخِ تغییرِ
     ۲۶۴ فایل را جابه‌جا کند، خودش یک خرابی است. */
  const cleanAfter = JSON.parse(clean.getFilesByName(handoutJsonName_()).next()
                                     .getBlob().getDataAsString());
  ok('۲۴.۵ کتابِ تمیز دست نمی‌خورد', Number(cleanAfter.revision) === 2 &&
     cleanAfter.updatedAt === '', JSON.stringify({ rev: cleanAfter.revision }));
  ok('۲۴.۶ و برای آن HTMLای هم ساخته نشد',
     !clean.getFilesByName(handoutHtmlName_(cleanAfter.seriesName)).hasNext());

  /* دورش که تمام شد خودش را خاموش می‌کند — وگرنه هر شب همهٔ پوشه‌ها را
     دوباره می‌خواند برای کاری که تمام شده. */
  ok('۲۴.۷ دور تمام شد و نشانه ثبت شد', r1.done === true);
  const r2 = handoutRetitle_(10, 60000);
  ok('۲۴.۸ اجرای بعدی هیچ پوشه‌ای را باز نمی‌کند',
     r2.walked === 0 && r2.done === true, JSON.stringify({ w: r2.walked }));

  /* ولی دستِ آدم همیشه باز است: دکمهٔ ذیلِ مجموعه بی‌قیدِ آن نشانه کار
     می‌کند. سدی که آدم هم نتواند بازش کند، سد نیست. */
  const book2 = JSON.parse(dirty.getFilesByName(handoutJsonName_()).next()
                                .getBlob().getDataAsString());
  book2.chapters.push({ id: 'c9', title: 'فصل ۹: افزوده', sections: [] });
  handoutWrite_(dirty, book2);
  const one = handoutOneSeries_('kD', 1);
  ok('۲۴.۹ دکمهٔ مجموعه با وجودِ «تمام‌شده» باز هم مرتب می‌کند',
     one.retitled === 1, JSON.stringify({ r: one.retitled }));
  const fin = JSON.parse(dirty.getFilesByName(handoutJsonName_()).next()
                              .getBlob().getDataAsString());
  ok('۲۴.۱۰ و روی دیسک نشست',
     fin.chapters[fin.chapters.length - 1].title === 'افزوده',
     fin.chapters[fin.chapters.length - 1].title);
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ جزوه گذشت.');
