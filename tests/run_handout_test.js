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
  '26_Handout.gs'];
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
     اولِ فهرست شروع می‌کند و به انتها نمی‌رسد. */
  delete global.__PROPS[PK.HANDOUT_SCAN];
  for (let n = 3; n <= 6; n++) {
    const r2 = new Array(SERIES_HEADERS.length).fill('');
    r2[SC.KEY - 1] = 'k' + n; r2[SC.NAME - 1] = 'م' + n;
    reg.getRange(n, 1, 1, SERIES_HEADERS.length).setValues([r2]);
  }
  const p1 = handoutBackfill_(2);
  ok('۹.۶ کاوش کران‌دار است', p1.scanned === 2, String(p1.scanned));
  ok('۹.۷ و مکان‌نما جلو می‌رود',
     Number(global.__PROPS[PK.HANDOUT_SCAN]) === 2, String(global.__PROPS[PK.HANDOUT_SCAN]));
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
     handoutLine_('اخلاق').indexOf('به‌روز نشد') !== -1, handoutLine_('اخلاق'));
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
  back['عقب‌مانده'] = Utilities.formatDate(old, CFG.TIMEZONE, 'yyyy-MM-dd');
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
     !JSON.parse(global.__PROPS[PK.HANDOUT_SEEN] || '{}')['عقب‌مانده']);
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

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ جزوه گذشت.');
