/**
 * 26_Handout.gs — جزوهٔ هر مجموعه («درس‌نامه»)
 *
 * ═══════════════════════ خواستهٔ صاحبِ برنامه ═══════════════════════
 * «نسبت به هر مجموعه‌ای که یاد می‌گیرم، در پوشهٔ آن مجموعه — نه فقط یک قسمت،
 *  بلکه آن مجموعه — یک جزوه باشد که هر سری با تولیدِ پادکست به‌روزرسانی بشه و
 *  فهرست‌بندی‌اش هم به‌روزرسانی بشه، و در قسمتی از جزوه نقشهٔ راه باشد.
 *  جزوه از همان اول باید در قالبِ قشنگ و دقیق و زیبا باشد که خودش در هر لحظه
 *  قابلِ استفادهٔ مجزا و مراجعه باشد و بشود با کلیک روی فهرست به مطلب هدایت شد.»
 *
 * ═══════════════════════ چهار تصمیمِ ساختاری ═══════════════════════
 *
 * ۱) **دو فایل، نه یکی.** `_HANDOUT.json` مدلِ ساختاریِ کتاب است و
 *    «جزوه — <نام>.html» نمایشِ آن. اگر فقط HTML را نگه می‌داشتیم، هر
 *    به‌روزرسانی یعنی مدل باید HTML را از نو بخواند و بفهمد — یعنی هر بار
 *    یک شانسِ تازه برای خراب‌کردنِ چیزی که قبلاً درست بود. JSON یعنی
 *    افزودن، افزودن است.
 *
 * ۲) **وصله، نه بازنویسی.** مدل «کتابِ تازه» نمی‌دهد؛ فهرستی از عمل‌ها
 *    می‌دهد (فصلِ تازه، بخشِ تازه در فصلِ موجود، تکمیلِ یک بخشِ قدیمی) و
 *    کد اجرا می‌کند. هیچ عملی چیزی را **حذف یا جایگزین** نمی‌کند؛
 *    `handoutApply_` فقط می‌افزاید. یک درسِ ازدست‌رفته برنمی‌گردد.
 *
 * ۳) **درسِ بعدی همیشه ته جزوه نمی‌نشیند.** خواستهٔ صریح: «ممکن است هوش
 *    مصنوعی تشخیص بدهد مطلبی که در درس‌های بعدی است، تکمیل‌کنندهٔ مطالبِ
 *    درس‌های قبلی هم هست و باید به آنجا اضافه کند و رفرنس بدهد.» پس
 *    `amend` وجود دارد: یک بندِ تازه به بخشی از فصلِ قدیم افزوده می‌شود با
 *    نشانِ «تکمیل از درسِ N» و پیوندِ دوسویه.
 *
 * ۴) **متنِ پادکست، متنِ کتاب نیست.** «آن ابتدا و انتها که حالتِ پادکستی
 *    دارد یا وسط‌هایش، شاید مناسبِ درج در جزوه نباشد.» درست است. دو سد:
 *      • کدی: `hook` و `outro` و `recap` **اصلاً** به نویسندهٔ جزوه داده
 *        نمی‌شوند — این‌ها بنا به تعریف قابِ رادیویی‌اند.
 *      • کدی: `handoutDePodcast_` جمله‌های رادیویی را از خودِ روایت هم
 *        می‌اندازد. قاعده‌ای که فقط در پرامپت گفته شود، قاعده نیست — این
 *        درسِ خودِ همین ریپوست (داستانِ specialCondense_ را ببینید).
 *      • و پرامپت، که می‌گوید نثر را از «گفتاری» به «نوشتاری» ببَر.
 *
 * ═══════════════════════ ارجاع‌ها، مثلِ کتاب ═══════════════════════
 * «برای غنی‌سازی باید رفرنس‌هایش مثلِ کتاب که زیرِ آن صفحه شماره می‌زند و
 *  رفرنسِ مطلب را می‌گوید بیاید.» در HTML «صفحه» معنا ندارد؛ معادلِ صادقش
 * **پانوشتِ هر فصل** است: نشانهٔ بالانویسِ شماره‌دار در متن، فهرستِ شماره‌دار
 * ته همان فصل، و یک «کتاب‌نامه»ی کامل در انتهای جزوه. نشانه به پانوشت پیوند
 * دارد و پانوشت به متن برمی‌گردد.
 *
 * ═══════════════════════ چرا تولید را زمین نمی‌زند ═══════════════════════
 * ساختِ جزوه یک فراخوانِ مدل است و می‌تواند کند باشد. هرگز داخلِ مسیرِ
 * بحرانیِ صداگذاری اجرا نمی‌شود: پایانِ هر قسمت فقط یک **بدهی** ثبت می‌کند
 * (`PK.HANDOUT_DUE`)، و بدهی دو جا پرداخت می‌شود — همان‌جا اگر وقت باشد، و
 * کارِ شبانه به‌عنوانِ تورِ ایمنی. پس «با هر تولیدِ پادکست به‌روز می‌شود»
 * برقرار است، بی آنکه رسیدنِ پادکست را عقب بیندازد.
 */

/* ───────────────────────────── نام‌ها و خواندن/نوشتن ───────────────────────────── */

function handoutJsonName_() { return CFG.HANDOUT_JSON || '_HANDOUT.json'; }

function handoutHtmlName_(seriesName) {
  return 'جزوه — ' + safeFolderName_(String(seriesName || 'مجموعه')) + '.html';
}

/** کتابِ خالی — ساختارِ کامل، تا هیچ‌جای کد مجبور به وارسیِ وجود نباشد. */
function handoutNew_(meta) {
  return {
    seriesKey: String((meta && meta.seriesKey) || ''),
    seriesName: String((meta && meta.seriesName) || ''),
    cat: String((meta && meta.seriesCat) || ''),
    level: String((meta && meta.level) || ''),
    createdAt: nowStr_(), updatedAt: '', revision: 0,
    roadmap: { intro: '', stages: [], note: '' },
    chapters: [], refs: [], episodes: []
  };
}

/** خواندنِ جزوهٔ یک مجموعه از پوشه‌اش. نبودنش خطا نیست — تازه است. */
function handoutRead_(folder, meta) {
  try {
    var it = folder.getFilesByName(handoutJsonName_());
    if (it.hasNext()) {
      var b = JSON.parse(it.next().getBlob().getDataAsString());
      if (b && b.chapters) {
        // فیلدهایی که در نسخه‌های بعدی اضافه شده‌اند، برای کتاب‌های قدیمی
        if (!b.roadmap) b.roadmap = { intro: '', stages: [], note: '' };
        if (!b.refs) b.refs = [];
        if (!b.episodes) b.episodes = [];
        if (!b.bridges) b.bridges = [];      // ۶٫۸۲
        return b;
      }
    }
  } catch (e) { logLine_('جزوهٔ موجود خوانده نشد: ' + e.message); }
  return handoutNew_(meta);
}

function handoutWrite_(folder, book) {
  var body = JSON.stringify(book, null, 1);
  var it = folder.getFilesByName(handoutJsonName_());
  if (it.hasNext()) { var f = it.next(); f.setContent(body); return f; }
  return folder.createFile(Utilities.newBlob(body, 'application/json', handoutJsonName_()));
}

/* ───────────────────────── پاک‌سازیِ لحنِ پادکست ───────────────────────── */

/* جمله‌هایی که فقط در رادیو معنا دارند. عمداً «قویِ کم‌تعداد» است نه
   «ضعیفِ پرتعداد»: هر الگو باید چیزی باشد که در یک کتاب هرگز نمی‌آید.
   بردنِ یک جملهٔ سالم بدتر از ماندنِ یک جملهٔ گفتاری است. */
var HANDOUT_RADIO = [
  /(^|[.!؟])\s*[^.!؟]{0,120}(همراهِ? ما باشید|با ما همراه باشید|تا پایان همراه)/,
  /(^|[.!؟])\s*[^.!؟]{0,120}(در این قسمت (می‌شنوید|خواهیم شنید|می‌شنویم))/,
  /(^|[.!؟])\s*[^.!؟]{0,120}(در قسمتِ? (بعد|آینده) (می‌شنوید|خواهیم|سراغِ))/,
  /(^|[.!؟])\s*[^.!؟]{0,120}شنوند(هٔ?|گانِ?|گان) ?(عزیز|گرامی|محترم)/,
  /(^|[.!؟])\s*[^.!؟]{0,120}(خوش آمدید|خوش آمدی|خوش آمدین)/,
  /(^|[.!؟])\s*[^.!؟]{0,120}(خدانگهدار|بدرود|تا قسمتِ? (بعد|بعدی))/,
  /(^|[.!؟])\s*[^.!؟]{0,120}(بعد از این (وقفهٔ? کوتاه|موسیقی)|پس از این موسیقی)/,
  /(^|[.!؟])\s*[^.!؟]{0,120}(بشنوید|گوش (کنید|بدهید|بسپارید))\s*[.!؟]/
];

/** شکستنِ متن به جمله — همان قاعده‌ای که splitForTts_ می‌فهمد. */
function handoutSentences_(text) {
  var t = String(text || '').replace(/\r/g, '');
  var out = [], cur = '';
  for (var i = 0; i < t.length; i++) {
    cur += t.charAt(i);
    if ('.!?؟…'.indexOf(t.charAt(i)) !== -1 &&
        (i + 1 >= t.length || ' \n'.indexOf(t.charAt(i + 1)) !== -1)) {
      out.push(cur); cur = '';
    }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

/**
 * جمله‌های رادیویی را می‌اندازد.
 * @return {{text:string, dropped:number}}
 *
 * هرگز بخش را خالی نمی‌کند: اگر همه‌چیز رادیویی تشخیص داده شد، یعنی
 * تشخیص غلط بوده و متنِ اصلی برمی‌گردد. سدی که همه‌چیز را بگیرد، سد نیست.
 */
function handoutDePodcast_(text) {
  var s = handoutSentences_(text), keep = [], drop = 0;
  for (var i = 0; i < s.length; i++) {
    var one = ' ' + s[i];
    var bad = false;
    for (var r = 0; r < HANDOUT_RADIO.length; r++) {
      if (HANDOUT_RADIO[r].test(one)) { bad = true; break; }
    }
    if (bad) { drop++; continue; }
    keep.push(s[i]);
  }
  var out = keep.join('').trim();
  if (!out) return { text: String(text || '').trim(), dropped: 0 };
  return { text: out, dropped: drop };
}

/* ───────────────────────────── ارجاع‌ها ───────────────────────────── */

/** کلیدِ یکتاییِ یک ارجاع — نشانی، وگرنه عنوان. */
function handoutRefKey_(r) {
  var u = String((r && r.url) || '').trim();
  if (u) return 'u:' + u;
  return 't:' + String((r && r.title) || '').trim().slice(0, 120);
}

/**
 * ارجاع‌های یک قسمت را در کتاب‌نامه ادغام می‌کند و شماره‌هایشان را برمی‌گرداند.
 * شمارهٔ یک ارجاع هرگز عوض نمی‌شود — پانوشت‌های فصل‌های قدیمی به همان
 * شماره اشاره می‌کنند و جابه‌جاییِ شماره یعنی همهٔ آن‌ها دروغ می‌شوند.
 */
function handoutRefsMerge_(book, sources, epNum) {
  var map = {};
  for (var i = 0; i < book.refs.length; i++) map[handoutRefKey_(book.refs[i])] = book.refs[i].n;
  var out = [];
  for (var s = 0; s < (sources || []).length; s++) {
    var x = sources[s] || {};
    if (!x.title && !x.url) continue;
    var k = handoutRefKey_(x);
    if (map[k]) { out.push(map[k]); continue; }
    var n = book.refs.length + 1;
    book.refs.push({ n: String(n), title: String(x.title || x.url || ''),
                     publisher: String(x.publisher || ''), date: String(x.date || ''),
                     url: String(x.url || ''), quote: String(x.quote || ''),
                     kind: x.type === 'inside' ? 'توضیحی' : 'بیرونی',
                     fromEpisode: String(epNum || '') });
    map[k] = String(n);
    out.push(String(n));
  }
  return out;
}

/* ───────────────────────── پرسش از مدل: وصلهٔ این قسمت ───────────────────────── */

/* همهٔ فیلدها رشته‌اند. مدلِ این ریپو هر schemaیی را که integer/number/boolean
   داشته باشد رد می‌کند — `run_real_test.js` این را در کلِ کد نگه می‌دارد. */
var HANDOUT_SCHEMA = {
  type: 'object',
  properties: {
    newChapters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          intro: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                body: { type: 'string' },
                takeaway: { type: 'string' }
              },
              required: ['title', 'body']
            }
          }
        },
        required: ['title', 'sections']
      }
    },
    intoChapter: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          chapterId: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          why: { type: 'string' }
        },
        required: ['chapterId', 'title', 'body']
      }
    },
    amend: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sectionId: { type: 'string' },
          body: { type: 'string' },
          why: { type: 'string' }
        },
        required: ['sectionId', 'body']
      }
    },
    roadmap: {
      type: 'object',
      properties: {
        intro: { type: 'string' },
        note: { type: 'string' },
        stages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              outcome: { type: 'string' },
              state: { type: 'string' }
            },
            required: ['title', 'outcome']
          }
        }
      }
    }
  },
  required: ['newChapters']
};

/** فهرستِ کوتاهِ کتابِ فعلی — عنوان و شناسه، نه متن. متن، بودجه را می‌خورَد. */
function handoutOutline_(book) {
  var L = [];
  for (var c = 0; c < book.chapters.length; c++) {
    var ch = book.chapters[c];
    L.push('فصل ' + (c + 1) + ' [' + ch.id + '] «' + ch.title + '»');
    for (var s = 0; s < (ch.sections || []).length; s++) {
      var sc = ch.sections[s];
      L.push('   • [' + sc.id + '] «' + sc.title + '»' +
             (sc.takeaway ? ' — ' + String(sc.takeaway).slice(0, 90) : '') +
             ' (از درسِ ' + (sc.addedIn || '؟') + ')');
    }
  }
  return L.length ? L.join('\n') : '(جزوه هنوز خالی است — این نخستین درس است.)';
}

function handoutPrompt_(book, secs, meta) {
  var L = [];
  /* ══ ارجاع‌های میان‌مجموعه‌ای هم جزوِ درس‌اند (۶٫۴۳) ══
     «باید در خودِ مرور و حتی جزوه همگی مورد استفاده و ثبت قرار بگیره، چون
     در واقع جزوِ خودِ محتوا شده.» جزوه‌ای که ارجاع را بیندازد، چیزی را حذف
     کرده که در همان درس گفته شده — و جزوه قرار است حافظهٔ مجموعه باشد. */
  var __bx = '';
  try { __bx = bridgeRecapBlock_(bridgeOfSeries_(getHub_(), meta.seriesName, 12,
                                                meta.seriesKey)); }
  catch (eBx) { __bx = ''; }
  L.push('تو ویراستارِ یک **جزوهٔ آموزشیِ فارسی** هستی — نه نویسندهٔ پادکست.');
  L.push('جزوه‌ای که مثلِ یک کتابِ درسی خوانده شود: بی مقدمه‌چینیِ رادیویی،');
  L.push('بی خطاب به شنونده، با تعریف و استدلال و مثال و گام‌های عملی.');
  L.push('');
  L.push('مجموعه: «' + String(meta.seriesName || '') + '»' +
         (meta.level ? ' — سطح: ' + meta.level : ''));
  L.push('درسِ تازه: قسمت ' + meta.epNum + ' — «' + String(meta.epTitle || '') + '»');
  L.push('');
  L.push('--- فهرستِ جزوه تا امروز ---');
  L.push(handoutOutline_(book));
  L.push('');
  L.push('--- متنِ درسِ تازه (پیش‌تر از قابِ رادیویی پاک شده است) ---');
  for (var i = 0; i < secs.length; i++) {
    L.push('[' + i + '] «' + secs[i].heading + '»');
    L.push(secs[i].narration);
    L.push('');
  }
  L.push('--- کاری که باید بکنی ---');
  L.push('۱) `newChapters`: مطالبِ این درس را به فصل و بخش تبدیل کن. عنوان‌ها');
  L.push('   باید عنوانِ **کتاب** باشند («تعریفِ معرفت و سه شرطِ آن»)، نه عنوانِ');
  L.push('   قسمتِ رادیویی («ادامهٔ بحثِ جلسهٔ قبل»). **در عنوان شماره نگذار**');
  L.push('   («فصل ۷: …» نه) — شماره‌گذاری کارِ خودِ جزوه است و شمارهٔ تو با');
  L.push('   جای واقعیِ فصل یکی نمی‌مانَد. هر بخش یک `takeaway` دارد:');
  L.push('   یک جملهٔ کوتاه که چکیدهٔ آن بخش است.');
  L.push('');
  L.push('۲) `intoChapter`: **اگر** بخشی از این درس در واقع جای دیگری از جزوه');
  L.push('   می‌نشیند — یعنی موضوعش ادامه یا تکمیلِ یکی از فصل‌های قبلی است —');
  L.push('   همان‌جا بگذارش، نه ته جزوه. `chapterId` را از فهرستِ بالا بردار.');
  L.push('');
  L.push('۳) `amend`: **اگر** این درس مطلبی دارد که یک بخشِ قدیمی را کامل‌تر');
  L.push('   می‌کند، یک بندِ افزودنی بنویس و `sectionId` آن بخش را بده. این');
  L.push('   بند به همان بخش افزوده می‌شود و پیوندِ رفت‌وبرگشت می‌گیرد. متنِ');
  L.push('   قبلی هرگز پاک نمی‌شود، پس بندِ تو باید **افزودنی** باشد نه بازنویسی.');
  L.push('');
  L.push('۴) `roadmap`: نقشهٔ راهِ کلِ مجموعه. `stages` مرحله‌های یادگیری است');
  L.push('   با `outcome` («بعد از این مرحله می‌توانی…»). فقط prose بنویس؛');
  L.push('   وضعیتِ «انجام‌شده/در جریان/پیشِ رو» را خودِ موتور از داده پر می‌کند.');
  L.push('');
  L.push('قاعده‌های سخت:');
  L.push('  • هیچ جمله‌ای با «در این قسمت»، «همراهِ ما»، «می‌شنوید»، «خوش آمدید».');
  L.push('  • دوم‌شخصِ خطابیِ رادیویی نه؛ نثرِ توضیحیِ کتاب بله.');
  L.push('  • چیزی از خودت اضافه نکن که در متنِ درس نیست.');
  L.push('  • اگر جای مناسبی برای intoChapter یا amend نبود، خالی بگذار —');
  L.push('    این جوابِ درستی است و بیشترِ درس‌ها همین‌اند. جاسازیِ بی‌مورد،');
  L.push('    جزوه را از هم می‌پاشد.');
  if (__bx) {
    L.push('');
    L.push(__bx);
    L.push('اگر یکی از این ارجاع‌ها به همین درس مربوط است، در متنِ همان بخش');
    L.push('بیاورش — با نامِ آن مجموعه و نسبتش، در یکی دو جمله.');
  }
  return L.join('\n');
}

function handoutPatchModel_(book, secs, meta) {
  var r = null;
  try { r = geminiText_(handoutPrompt_(book, secs, meta), HANDOUT_SCHEMA, 8192); }
  catch (e) { logLine_('نوشتنِ جزوه انجام نشد: ' + e.message); return null; }
  return r || null;
}

/* ───────────────────────────── اعمالِ وصله ───────────────────────────── */

/* عنوانِ فصل نباید خودش شماره داشته باشد.
   مدل گاهی «فصل ۷: …» می‌نویسد و نمایش هم شماره می‌گذارد، پس خواننده
   «۷. فصل ۷: …» می‌بیند. بدتر: شمارهٔ مدل با جای واقعیِ فصل یکی نمی‌مانَد —
   کافی است درسی بعداً فصلی را وسط جا بدهد تا هر دو شماره تا ابد با هم
   اختلاف داشته باشند. در جزوهٔ «معرفت شناسی» شش فصل این‌طور بودند. */
function handoutTitleClean_(t) {
  var x = String(t || '').trim();
  x = x.replace(/^فصل\s*[\u06F0-\u06F90-9]+\s*[:—\-–]\s*/, '');
  x = x.replace(/^[\u06F0-\u06F90-9]+\s*[.)]\s*/, '');
  return x.trim() || String(t || '').trim();
}

/**
 * عنوانِ فصل‌های یک کتابِ *موجود* را از پیشوندِ «فصل ۳:» پاک می‌کند.
 *
 * ══ چرا این جدا از handoutTitleClean_ لازم شد ══
 * آن یکی روی **ورودی** کار می‌کند: از ۵٫۹۳ به بعد هر فصلی که مدل پیشنهاد
 * می‌دهد پیش از نشستن در کتاب تمیز می‌شود. ولی فصل‌هایی که پیش از ۵٫۹۳
 * ساخته شده بودند دست‌نخورده ماندند و در فهرست «فصل ۳: فصل ۳ — …» دیده
 * می‌شوند. این همان درسی است که در CLAUDE.md نوشته شده: پاک‌کردنِ ورودی،
 * آنچه را قبلاً نوشته شده درست نمی‌کند؛ کهنه‌ها بازسازی می‌خواهند.
 *
 * @return {number} شمارِ عنوان‌هایی که واقعاً عوض شدند
 */
function handoutRetitleBook_(book) {
  var n = 0;
  var chs = (book && book.chapters) || [];
  for (var i = 0; i < chs.length; i++) {
    var was = String(chs[i].title || '');
    var now = handoutTitleClean_(was);
    if (now && now !== was) { chs[i].title = now; n++; }
  }
  return n;
}

/** شناسهٔ یکتا و پایدار. شماره‌ها هرگز بازاستفاده نمی‌شوند. */
function handoutNextId_(book, prefix) {
  var n = Number(book.__seq || 0);
  if (!n) {
    n = 0;
    for (var c = 0; c < book.chapters.length; c++) {
      n++;
      n += (book.chapters[c].sections || []).length;
    }
  }
  book.__seq = n + 1;
  return prefix + book.__seq;
}

function handoutFindChapter_(book, id) {
  for (var i = 0; i < book.chapters.length; i++) if (book.chapters[i].id === id) return book.chapters[i];
  return null;
}

function handoutFindSection_(book, id) {
  for (var i = 0; i < book.chapters.length; i++) {
    var ch = book.chapters[i];
    for (var j = 0; j < (ch.sections || []).length; j++) {
      if (ch.sections[j].id === id) return { ch: ch, sec: ch.sections[j] };
    }
  }
  return null;
}

/**
 * وصله را روی کتاب اجرا می‌کند — فقط افزودن.
 *
 * شناسهٔ ناشناخته هرگز باعثِ ازدست‌رفتنِ متن نمی‌شود: `intoChapter` با
 * فصلِ ناموجود به یک فصلِ تازه تبدیل می‌شود و `amend` با بخشِ ناموجود به
 * بخشِ تازهٔ آخرین فصل. توهّمِ شناسه در مدل‌ها عادی است؛ ازدست‌رفتنِ درس نه.
 *
 * @return {{chapters:number, sections:number, amended:number, orphan:number}}
 */
function handoutApply_(book, patch, meta, refNos) {
  var st = { chapters: 0, sections: 0, amended: 0, orphan: 0 };
  if (!patch) return st;
  var ep = String(meta.epNum || '');

  var mkSec = function (x) {
    return { id: handoutNextId_(book, 's'), title: handoutTitleClean_(x.title) || 'بی‌عنوان',
             body: String(x.body || ''), takeaway: String(x.takeaway || ''),
             addedIn: ep, refs: (refNos || []).slice(0), adds: [] };
  };

  for (var c = 0; c < (patch.newChapters || []).length; c++) {
    var nc = patch.newChapters[c] || {};
    var secs = [];
    for (var s = 0; s < (nc.sections || []).length; s++) {
      if (!String((nc.sections[s] || {}).body || '').trim()) continue;
      secs.push(mkSec(nc.sections[s]));
    }
    if (!secs.length) continue;
    book.chapters.push({ id: handoutNextId_(book, 'ch'),
                         title: handoutTitleClean_(nc.title) || 'فصل',
                         intro: String(nc.intro || ''), addedIn: ep, sections: secs });
    st.chapters++; st.sections += secs.length;
  }

  for (var q = 0; q < (patch.intoChapter || []).length; q++) {
    var ic = patch.intoChapter[q] || {};
    if (!String(ic.body || '').trim()) continue;
    var ch = handoutFindChapter_(book, String(ic.chapterId || ''));
    var sec = mkSec(ic);
    sec.why = String(ic.why || '');
    if (ch) {
      sec.backTo = ch.id;
      ch.sections.push(sec);
    } else {
      // شناسهٔ ناشناخته: فصلِ خودش را می‌گیرد، نه اینکه دور ریخته شود
      st.orphan++;
      book.chapters.push({ id: handoutNextId_(book, 'ch'),
                           title: handoutTitleClean_(ic.title) || ('افزودهٔ درسِ ' + ep),
                           intro: '', addedIn: ep, sections: [sec] });
      st.chapters++;
    }
    st.sections++;
  }

  for (var a = 0; a < (patch.amend || []).length; a++) {
    var am = patch.amend[a] || {};
    if (!String(am.body || '').trim()) continue;
    var hit = handoutFindSection_(book, String(am.sectionId || ''));
    if (!hit) {
      st.orphan++;
      if (!book.chapters.length) continue;
      var last = book.chapters[book.chapters.length - 1];
      last.sections.push(mkSec({ title: String(am.why || 'تکمیل'), body: am.body }));
      st.sections++;
      continue;
    }
    hit.sec.adds = hit.sec.adds || [];
    hit.sec.adds.push({ body: String(am.body), why: String(am.why || ''),
                        fromEpisode: ep, refs: (refNos || []).slice(0) });
    st.amended++;
  }

  if (patch.roadmap) {
    var rm = patch.roadmap;
    if (String(rm.intro || '').trim()) book.roadmap.intro = String(rm.intro);
    if (String(rm.note || '').trim()) book.roadmap.note = String(rm.note);
    if ((rm.stages || []).length) {
      book.roadmap.stages = rm.stages.map(function (x) {
        return { title: String((x && x.title) || ''), outcome: String((x && x.outcome) || ''),
                 state: String((x && x.state) || '') };
      }).filter(function (x) { return x.title; });
    }
  }
  return st;
}

/* ─────────────────── نقشهٔ راه: واقعیت از داده، نثر از مدل ─────────────────── */

/**
 * وضعیتِ هر مرحله را کد می‌گذارد، نه مدل.
 *
 * مدل نمی‌داند کدام قسمتِ درس تولید شده و کدام نه؛ رجیستری می‌داند. اگر
 * وضعیت را هم از مدل بگیریم، نقشهٔ راه چیزی می‌شود که *به‌نظر* درست است —
 * و نقشهٔ راهی که یک مرحلهٔ تمام‌شده را «پیشِ رو» نشان بدهد، بدتر از نداشتنش
 * است، چون خواننده به آن اعتماد می‌کند.
 */
/**
 * پیشرفتِ واقعیِ یک مجموعه — جمعِ «تا کجا خوانده شده»ی همهٔ قسمت‌ها.
 *
 * ══ عددی که دو روز ۷٪ ماند در حالی که مجموعه تمام شده بود (۶٫۶۰) ══
 * meta.progress از SC.CUR_CHUNK پر می‌شد — «قطعهٔ جاری در قسمتِ جاری»، نه
 * پیشرفتِ کل. درسِ اول روی قطعهٔ ۱۵ بود، پس نقشهٔ راهِ جزوه تا ابد
 * «۱۵ از ۲۰۶ (۷٪)» گفت و مرحله‌ها «پیشِ رو» ماندند — حتی پس از پایانِ
 * مجموعه. صاحبِ برنامه خودش دید و فرستاد. مقیاسِ درست جمعِ SP.DONE_TO
 * است، سرِ جمعِ قطعه‌های هر قسمت بریده تا قسمتِ تمام‌شده بیش از خودش
 * نشمرد.
 */
function handoutProgressOf_(hub, seriesKey, partsOpt) {
  var out = { done: 0, total: 0 };
  try {
    var parts = partsOpt || readSeriesParts_(hub || getHub_());
    var list = (parts.byKey && parts.byKey[String(seriesKey)]) || [];
    for (var i = 0; i < list.length; i++) {
      var v = list[i].vals;
      var ch = Number(v[SP.CHUNKS - 1]) || 0;
      out.total += ch;
      out.done += Math.min(ch, Number(v[SP.DONE_TO - 1]) || 0);
    }
  } catch (e) {}
  return out;
}

/* ══ واژه‌های معنادارِ یک عنوان — برای سنجیدنِ دو عنوان با هم (۶٫۹۵) ══
   ZWNJ با **فاصله** جایگزین می‌شود نه با هیچ، وگرنه «معرفت‌شناسی» یک واژهٔ
   تازه می‌شود و با «معرفت» جور درنمی‌آید — همان درسِ `speakBone_`. واژه‌های
   کوتاه («های»، «این»، «که») می‌افتند چون در هر عنوانی هستند و اگر بمانند
   هر دو عنوانی به هم می‌خورَد. */
function handoutTitleWords_(t) {
  var x = String(t || '')
    .replace(/[\u200c\u200f\u200e]/g, ' ')
    .replace(/[\u064b-\u0652\u0654\u0670]/g, '')
    .replace(/[^\u0600-\u06ffA-Za-z]+/g, ' ');
  var w = x.split(/\s+/), out = {};
  for (var i = 0; i < w.length; i++) if (w[i].length >= 4) out[w[i]] = 1;
  return out;
}

/** چند واژهٔ معنادار میانِ دو عنوان مشترک است. */
function handoutTitleShare_(a, b) {
  var A = handoutTitleWords_(a), B = handoutTitleWords_(b), n = 0;
  for (var k in A) if (Object.prototype.hasOwnProperty.call(A, k) && B[k]) n++;
  return n;
}

/**
 * کدام مرحله‌ها را کتاب **همین حالا** پوشش داده است.
 *
 * ══ نقشهٔ راهی که خودِ کتابِ زیرش را تکذیب می‌کرد (۶٫۹۵) ══
 * وضعیت از نسبتِ «قطعهٔ خوانده‌شده از منبع» می‌آمد، و مرحله‌ها را مدل از
 * رویِ **کلِ کتابِ منبع** نوشته بود. این دو یک مقیاس نیستند. در جزوهٔ
 * «Audi» نتیجه‌اش این شد: «۱۳٫۰۲ از ۸۶ (۱۵٪)» ⇒ مرحلهٔ ۱ «در جریان» و
 * مرحله‌های ۲ و ۳ «پیشِ رو» — در حالی که فصلِ ۶ و فصلِ ۸ همان کتاب دقیقاً
 * عنوانِ همان دو مرحله را داشتند و هر دو کامل نوشته شده بودند. یعنی
 * خواننده در بالای صفحه می‌خواند «هنوز به نظریه‌های ادراک نرسیده‌ای» و
 * چند سطر پایین‌تر فصلِ «نظریه‌های ادراک» را می‌دید.
 *
 * قاعدهٔ تازه کمینه و صادق است: **مرحله‌ای که کتاب برایش فصل دارد، هرگز
 * «پیشِ رو» نیست.** «انجام‌شده» را همچنان فقط مکان‌نما می‌گوید، چون وجودِ
 * یک فصل به‌معنای تمام‌شدنِ آن مرحله نیست. ادعای کمتر، ولی راست.
 */
function handoutStagesCovered_(book) {
  var stages = (book.roadmap && book.roadmap.stages) || [];
  var chs = book.chapters || [];
  var need = Math.max(1, Number(CFG.HANDOUT_STAGE_WORDS) || 2);
  var hit = [];
  for (var i = 0; i < stages.length; i++) {
    hit[i] = false;
    for (var c = 0; c < chs.length; c++) {
      if (handoutTitleShare_(stages[i].title, chs[c].title) >= need) { hit[i] = true; break; }
    }
  }
  return hit;
}

/**
 * عکسِ چیزی که خواننده از نقشهٔ راه می‌بیند — عدد **و** وضعیتِ مرحله‌ها.
 *
 * تا ۶٫۹۵ فقط `progress` مقایسه می‌شد، پس وضعیتی که عوض می‌شد بی آنکه عدد
 * عوض شود (دقیقاً همان چیزی که سدِ تازه انجام می‌دهد) هرگز باعثِ بازسازیِ
 * HTML نمی‌شد: اصلاح در فایلِ JSON می‌نشست و در جزوه دیده نمی‌شد.
 */
function handoutRoadmapSig_(book) {
  try {
    var rm = (book && book.roadmap) || {};
    return JSON.stringify([rm.progress || null,
      (rm.stages || []).map(function (x) { return String((x && x.state) || ''); })]);
  } catch (e) { return ''; }
}

function handoutRoadmapState_(book, prog) {
  var stages = (book.roadmap && book.roadmap.stages) || [];
  if (!stages.length) return book;
  var total = Math.max(1, stages.length);
  var doneRatio = (Number(prog && prog.done) || 0) / Math.max(1, Number(prog && prog.total) || 1);
  var reached = Math.floor(doneRatio * total);
  var cov = handoutStagesCovered_(book);
  for (var i = 0; i < stages.length; i++) {
    stages[i].state = (i < reached) ? 'انجام‌شده'
                    : (i === reached ? 'در جریان'
                    : (cov[i] ? 'در جریان' : 'پیشِ رو'));
  }
  book.roadmap.progress = { done: String((prog && prog.done) || 0),
                            total: String((prog && prog.total) || 0),
                            pct: String(Math.round(doneRatio * 100)) };
  return book;
}

/* ───────────────────────────── نمایش: HTML ───────────────────────────── */

var HANDOUT_CSS_ = [
  'body{font-family:Tahoma,"Segoe UI",Arial,sans-serif;direction:rtl;text-align:right;',
  'background:#eef1f6;color:#17202e;margin:0;padding:22px;line-height:2.05}',
  '.bk{max-width:860px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;',
  'box-shadow:0 3px 22px rgba(18,28,55,.10)}',
  '.cv{background:linear-gradient(140deg,#123a63,#2e6fb8 60%,#3f8fd0);color:#fff;padding:38px 40px}',
  '.cv .kick{opacity:.8;font-size:13px;letter-spacing:.5px}',
  '.cv h1{margin:8px 0 10px;font-size:29px;line-height:1.45}',
  '.cv .sub{opacity:.9;font-size:14px}',
  '.bar{height:7px;background:#0d2b49}.bar i{display:block;height:7px;background:#7ec4ff}',
  '.bd{padding:26px 40px 40px}',
  '.toc{background:#f6f8fc;border:1px solid #dfe6f2;border-radius:12px;padding:20px 24px;margin:0 0 30px}',
  /* نمودارها (۶٫۵۷، بازطراحیِ ۶٫۶۶): هر نوع، شکلِ خودش */
  '.hvz{background:#f9fafd;border:1px solid #dfe6f2;border-radius:12px;padding:16px 18px;margin:18px 0}',
  '.hvz-h{margin-bottom:12px;font-size:14px}.hvz-h b{margin-right:8px}',
  '.hvz-k{display:inline-block;color:#fff;border-radius:20px;padding:2px 12px;font-size:11px}',
  '.hvk-mm{background:#123a63}.hvk-cm{background:#5b21b6}.hvk-flow{background:#166534}',
  '.hvk-cyc{background:#9a3412}.hvk-hier{background:#a16207}.hvk-cmp{background:#9f1239}',
  '.hvk-cards{background:#334155}.hvk-venn{background:#0e7490}',
  '.hvz-b{display:inline-block;background:#e8effc;color:#123a63;border-radius:20px;padding:2px 10px;font-size:11px;margin-right:6px}',
  '.hvz-n,.hvz-ctr{display:block;background:#fff;border:1.5px solid #b9c8e2;border-radius:10px;',
  'padding:8px 12px;text-decoration:none;color:#17202e;font-size:13px;line-height:1.8}',
  'a.hvz-n:hover,a.hvz-ctr:hover{border-color:#2e6fb8;box-shadow:0 1px 6px rgba(46,111,184,.25)}',
  'a.hvz-n b{color:#123a63}',
  /* گرهٔ مرکزیِ لینک‌دار: عنوانِ سفید روی سرمه‌ای — قاعدهٔ عمومیِ آبی رویش
     می‌نشست و عنوان نامرئی می‌شد؛ در رندرِ واقعی دیده شد (۶٫۶۶). */
  'a.hvz-ctr b,.hvz-ctr b{color:#fff}',
  '.hvz-n span,.hvz-ctr span{display:block;font-size:11.5px;color:#65718a;margin-top:2px}',
  '.hvz-c{text-align:center;margin-bottom:0}',
  '.hvz-ctr{display:inline-block;background:#123a63;border-color:#123a63;border-radius:22px;padding:9px 22px}',
  '.hvz-ctr b{color:#fff}.hvz-ctr span{color:#bcd3ef}',
  /* نقشهٔ ذهنی: درختِ متصل */
  '.hvz-tree{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0 12px;',
  'border-top:2px solid #9db5d8;margin-top:14px;padding-top:14px;position:relative}',
  '.hvz-twig{position:relative;padding-top:0;margin-bottom:10px}',
  '.hvz-twig:before{content:"";position:absolute;top:-14px;right:50%;width:2px;height:14px;background:#9db5d8}',
  /* نقشهٔ مفهومی: یال‌های برچسب‌دار */
  '.hvz-cm .hvz-ctr{background:#5b21b6;border-color:#5b21b6}',
  '.hvz-edge{display:flex;align-items:center;gap:10px;margin:10px 0 0}',
  '.hvz-rel{flex:0 0 auto;background:#f3e8ff;color:#5b21b6;border-radius:14px;',
  'padding:2px 12px;font-size:11.5px;border:1px dashed #c4b5fd}',
  '.hvz-edge .hvz-n{flex:1}',
  /* روندنما: گامِ شماره‌دار */
  '.hvz-fl{max-width:480px;margin:0 auto}',
  '.hvz-ar{text-align:center;color:#166534;font-size:20px;line-height:1.1}',
  '.hvz-step{display:flex;align-items:center;gap:10px}',
  '.hvz-no{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:#166534;color:#fff;',
  'display:flex;align-items:center;justify-content:center;font-size:13px}',
  '.hvz-step .hvz-n{flex:1;border-color:#a7d3b4}',
  /* چرخه: مدارِ واقعی */
  '.hvz-orbit{position:relative;border:2px dashed #f2c9ae;border-radius:50%;margin:14px 8%;',
  'min-height:240px}',
  '.hvz-hub{position:absolute;right:50%;top:50%;transform:translate(50%,-50%);font-size:30px;color:#9a3412}',
  '.hvz-sat{position:absolute;transform:translate(50%,-50%);width:34%;min-width:130px}',
  '.hvz-sat .hvz-n{border-color:#f2c9ae;box-shadow:0 1px 4px rgba(154,52,18,.12)}',
  /* سلسله‌مراتب: هرم */
  '.hvz-pyr{display:flex;flex-direction:column;align-items:center;gap:8px}',
  '.hvz-lvl{border-radius:10px;padding:8px 12px 10px}',
  '.hvl-0{background:#fdf2d0}.hvl-1{background:#fbe6b8}.hvl-2{background:#f8d99e}',
  '.hvl-3{background:#f5cc85}.hvl-4{background:#f2bf6d}',
  '.hvz-g{font-size:12px;color:#7a5a12;margin-bottom:6px;text-align:center;font-weight:bold}',
  '.hvz-gi{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}',
  /* تقابل: دو ستونِ رودررو */
  '.hvz-vs{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}',
  '.hvz-vsb{align-self:center;background:#9f1239;color:#fff;border-radius:16px;',
  'padding:3px 12px;font-size:11.5px;flex:0 0 auto}',
  '.hvz-col{flex:1;min-width:170px;border-radius:10px;padding:10px}',
  '.hvc-0{background:#eef6ff;border:1px solid #bcd6f2}.hvc-1{background:#fff1f2;border:1px solid #f3c2ca}',
  '.hvz-colh{font-weight:bold;font-size:13px;margin-bottom:8px;text-align:center}',
  '.hvz-col .hvz-n{margin-bottom:8px}',
  /* وِن: دایره‌های واقعیِ هم‌پوشان — دایره‌ها لایهٔ تزئینیِ مطلق، متنِ
     ناحیه‌ها لایهٔ جدا (نه بریده می‌شود نه پنهان)، برچسبِ نامِ هر دایره
     بیرونش. aspect-ratio دایره را دایره نگه می‌دارد، در هر عرضی. */
  '.hvz-vd{position:relative;margin:8px 0}',
  '.hvz-vd2{aspect-ratio:1.5;min-height:330px}',
  '.hvz-vd3{aspect-ratio:1.15;min-height:420px}',
  '.hvn-c{position:absolute;aspect-ratio:1;border-radius:50%;border:2.5px solid}',
  '.hvz-vd2 .hvn-c{top:40px;bottom:3%}',
  '.hvca{border-color:#2563eb;background:rgba(37,99,235,.10)}',
  '.hvcb{border-color:#be123c;background:rgba(190,18,60,.09)}',
  '.hvcc{border-color:#166534;background:rgba(22,101,52,.09)}',
  '.hvz-vd2 .hvca{right:3%}.hvz-vd2 .hvcb{left:3%}',
  '.hvz-vd3 .hvn-c{height:56%}',
  '.hvz-vd3 .hvca{top:40px;right:12%}.hvz-vd3 .hvcb{top:40px;left:12%}',
  '.hvz-vd3 .hvcc{bottom:4%;right:50%;transform:translateX(50%)}',
  '.hvn-tag{position:absolute;top:0;z-index:2;color:#fff;border-radius:9px;',
  'padding:5px 15px;font-weight:bold;font-size:13px;box-shadow:0 2px 6px rgba(18,28,55,.25)}',
  '.hvt-a{right:0;background:#1e40af}.hvt-b{left:0;background:#9f1239}',
  '.hvt-c{top:auto;bottom:0;right:50%;transform:translateX(50%);background:#166534}',
  '.hvn-z{position:absolute;display:flex;flex-direction:column;gap:5px;',
  'text-align:center;z-index:1;align-items:center;justify-content:center}',
  '.hvz-vd2 .hvz-za{right:6%;width:27%;top:44px;bottom:3%}',
  '.hvz-vd2 .hvz-zb{left:6%;width:27%;top:44px;bottom:3%}',
  '.hvz-vd2 .hvz-zm{right:39.5%;width:21%;top:44px;bottom:3%}',
  /* سه‌دایره‌ای، هر هفت ناحیه سرِ جای هندسیِ خودش: اختصاصی‌ها، سه عدسیِ
     دوبه‌دو، و مرکز — «مالِ کدام‌هاست» را جا + برچسب می‌گوید. */
  '.hvz-vd3 .hvz-za{right:13%;width:23%;top:12%;height:26%}',
  '.hvz-vd3 .hvz-zb{left:13%;width:23%;top:12%;height:26%}',
  '.hvz-vd3 .hvz-zc{right:31%;width:38%;bottom:5%;height:21%}',
  '.hvz-vd3 .hvz-zab{right:40%;width:20%;top:9%;height:24%}',
  '.hvz-vd3 .hvz-zac{right:25.5%;width:14%;top:41%;height:20%}',
  '.hvz-vd3 .hvz-zbc{left:25.5%;width:14%;top:41%;height:20%}',
  '.hvz-vd3 .hvz-zm{right:40%;width:20%;top:41%;height:21%}',
  '.hvz-vd3 .hvz-zab .hvz-n,.hvz-vd3 .hvz-zac .hvz-n,.hvz-vd3 .hvz-zbc .hvz-n,',
  '.hvz-vd3 .hvz-zm .hvz-n{font-size:11.5px;line-height:1.55}',
  /* داخلِ دایره، گره‌ها جعبهٔ سفید نمی‌گیرند — فهرستِ سادهٔ کلیک‌شو، مثلِ مرجع */
  '.hvn-z .hvz-n{background:transparent;border:0;padding:0 2px;font-size:12.5px;line-height:1.75}',
  '.hvn-z .hvz-n b:before{content:"• "}',
  '.hvn-z a.hvz-n:hover{box-shadow:none;text-decoration:underline}',
  '.hvn-z .hvz-n span{font-size:11px}',
  '.hvn-zt{font-size:10.5px;color:#5b21b6;background:rgba(255,255,255,.8);',
  'border-radius:9px;padding:1px 8px;white-space:nowrap;max-width:100%;',
  'overflow:hidden;text-overflow:ellipsis}',
  '.hvz-zm .hvz-n b,.hvz-zab .hvz-n b,.hvz-zac .hvz-n b,.hvz-zbc .hvz-n b{color:#4c1d95}',
  /* باریک: هندسهٔ مطلق جا ندارد — ناحیه‌ها پشتِ سرِ هم، هر یک با قابِ رنگیِ خودش */
  '@media (max-width:560px){',
  '.hvz-vd,.hvz-vd2,.hvz-vd3{aspect-ratio:auto;min-height:0}',
  '.hvn-c{display:none}',
  '.hvn-tag{position:static;display:inline-block;margin:4px 4px 8px;transform:none}',
  '.hvn-z{position:static;width:auto;height:auto;border-radius:14px;padding:12px;margin:8px 0}',
  '.hvz-za{border:2px solid #2563eb;background:rgba(37,99,235,.07)}',
  '.hvz-zb{border:2px solid #be123c;background:rgba(190,18,60,.06)}',
  '.hvz-zc{border:2px solid #166534;background:rgba(22,101,52,.06)}',
  '.hvz-zm,.hvz-zab,.hvz-zac,.hvz-zbc{border:2px dashed #5b21b6;background:rgba(91,33,182,.06)}',
  '}',
  /* کارت‌ها */
  '.hvz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}',
  '.hvz-card{position:relative;padding-top:12px}',
  '.hvz-card .hvz-no{position:absolute;top:0;right:12px;background:#334155;z-index:1}',
  '.hvz-note{font-size:12px;color:#65718a;margin-top:10px}',
  '.toc h2{margin:0 0 12px;border:0;padding:0}',
  '.toc ol{margin:0;padding-right:22px}',
  '.toc ol ol{padding-right:18px;margin:4px 0 10px}',
  '.toc a{color:#1d4e86;text-decoration:none}',
  '.toc a:hover{text-decoration:underline}',
  '.toc .tk{color:#65718a;font-size:12px}',
  '.rm{background:#fffaf0;border:1px solid #f0e0bd;border-radius:12px;padding:20px 24px;margin:0 0 30px}',
  '.rm h2{margin:0 0 12px;border:0;padding:0;color:#7a5a12}',
  '.rm table{margin:0}',
  '.st{display:inline-block;border-radius:20px;padding:2px 12px;font-size:12px;color:#fff}',
  '.sd{background:#1f7a5a}.sn{background:#c07a12}.sf{background:#8a94a6}',
  'h2{font-size:20px;color:#123a63;margin:34px 0 10px;padding-bottom:8px;border-bottom:2px solid #dfe6f2}',
  'h3{font-size:16px;color:#1d4e86;margin:22px 0 6px}',
  'p{margin:0 0 14px;text-align:justify}',
  '.tk{background:#f2f7ff;border-right:4px solid #2e6fb8;border-radius:8px;',
  'padding:10px 15px;margin:0 0 16px;font-size:13.5px;color:#1d4e86}',
  '.add{background:#f4fbf6;border-right:4px solid #1f7a5a;border-radius:8px;',
  'padding:12px 16px;margin:14px 0}',
  '.add .lbl{font-size:12px;color:#1f7a5a;font-weight:bold;margin-bottom:4px}',
  '.fn{margin:22px 0 0;padding:14px 18px;background:#fafbfe;border-top:1px dashed #ccd6e6;',
  'font-size:12.5px;color:#4a5568;border-radius:0 0 8px 8px}',
  '.fn ol{margin:6px 0 0;padding-right:20px}.fn li{margin:0 0 5px}',
  'sup a{color:#2e6fb8;text-decoration:none;font-weight:bold}',
  'table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}',
  'th{background:#123a63;color:#fff;padding:9px;text-align:right;font-weight:normal}',
  'td{border-bottom:1px solid #e6e9f0;padding:9px;vertical-align:top}',
  '.ft{background:#eef1f6;padding:18px 40px;font-size:12px;color:#5a6478;border-top:1px solid #e0e5ef}',
  'a{color:#2e6fb8}',
  '@media print{body{background:#fff;padding:0}.bk{box-shadow:none;border-radius:0}}'
].join('');

/** نشانهٔ پانوشت: بالانویسِ شماره‌دار که به پانوشتِ همان فصل می‌رود. */
function handoutSup_(chId, nos) {
  if (!nos || !nos.length) return '';
  var out = [];
  for (var i = 0; i < nos.length; i++) {
    out.push('<a id="b' + chId + '-' + nos[i] + '" href="#f' + chId + '-' + nos[i] + '">' +
             faDigitsOut_(String(nos[i])) + '</a>');
  }
  return '<sup>[' + out.join('، ') + ']</sup>';
}

function handoutParas_(text) {
  var ps = String(text || '').split(/\n+/), out = [];
  for (var i = 0; i < ps.length; i++) if (ps[i].trim()) out.push(ps[i].trim());
  return out;
}

function handoutHtml_(book) {
  var h = [];
  var refById = {};
  for (var r = 0; r < book.refs.length; r++) refById[String(book.refs[r].n)] = book.refs[r];

  h.push('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">');
  h.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  h.push('<title>جزوه — ' + esc_(book.seriesName) + '</title>');
  h.push('<style>' + HANDOUT_CSS_ + '</style>');
  h.push('<div class="bk"><div class="cv">');
  h.push('<div class="kick">' + esc_(CFG.SPECIAL_SHOW_NAME || 'درس‌نامه') + ' — جزوهٔ مجموعه</div>');
  h.push('<h1>' + esc_(book.seriesName) + '</h1>');
  var sub = [];
  if (book.cat) sub.push(book.cat);
  if (book.level) sub.push('سطح: ' + book.level);
  sub.push(faDigitsOut_(String(book.chapters.length)) + ' فصل');
  sub.push('بازنگریِ ' + faDigitsOut_(String(book.revision || 0)));
  if (book.updatedAt) sub.push('به‌روزرسانی: ' + book.updatedAt);
  h.push('<div class="sub">' + esc_(sub.join('  ·  ')) + '</div>');
  h.push('</div>');
  var pct = Number((book.roadmap && book.roadmap.progress && book.roadmap.progress.pct) || 0);
  h.push('<div class="bar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>');
  h.push('<div class="bd">');

  // ── فهرست، کلیک‌شونده ──
  h.push('<div class="toc"><h2>فهرست</h2><ol>');
  for (var c = 0; c < book.chapters.length; c++) {
    var ch = book.chapters[c];
    h.push('<li><a href="#' + ch.id + '">' + esc_(ch.title) + '</a>');
    if ((ch.sections || []).length) {
      h.push('<ol>');
      for (var s = 0; s < ch.sections.length; s++) {
        var sc = ch.sections[s];
        h.push('<li><a href="#' + sc.id + '">' + esc_(sc.title) + '</a>' +
               (sc.takeaway ? ' <span class="tk">— ' + esc_(String(sc.takeaway).slice(0, 90)) +
                              '</span>' : '') + '</li>');
      }
      h.push('</ol>');
    }
    h.push('</li>');
  }
  if ((book.bridges || []).length) {
    h.push('<li><a href="#xref">ارجاع به مجموعه‌های دیگر</a></li>');
  }
  if (book.refs.length) h.push('<li><a href="#refs">کتاب‌نامه</a></li>');
  h.push('</ol></div>');

  // ── نقشهٔ راه ──
  var rm = book.roadmap || {};
  if (rm.intro || (rm.stages || []).length) {
    h.push('<div class="rm"><h2>نقشهٔ راه</h2>');
    if (rm.intro) h.push('<p>' + esc_(rm.intro) + '</p>');
    if ((rm.stages || []).length) {
      h.push('<table><tr><th>مرحله</th><th>بعد از این مرحله می‌توانی…</th><th>وضعیت</th></tr>');
      for (var g = 0; g < rm.stages.length; g++) {
        var sg = rm.stages[g];
        var cls = sg.state === 'انجام‌شده' ? 'sd' : (sg.state === 'در جریان' ? 'sn' : 'sf');
        h.push('<tr><td>' + esc_(sg.title) + '</td><td>' + esc_(sg.outcome) + '</td>' +
               '<td><span class="st ' + cls + '">' + esc_(sg.state || 'پیشِ رو') + '</span></td></tr>');
      }
      h.push('</table>');
    }
    if (rm.progress) {
      h.push('<p style="font-size:13px;color:#7a5a12;margin-top:12px">پیشرفت: ' +
             esc_(faDigitsOut_(String(rm.progress.done))) + ' از ' +
             esc_(faDigitsOut_(String(rm.progress.total))) + ' قطعهٔ درس (' +
             esc_(faDigitsOut_(String(rm.progress.pct))) + '٪)</p>');
    }
    if (rm.note) h.push('<p style="font-size:13px;color:#7a5a12">' + esc_(rm.note) + '</p>');
    h.push('</div>');
  }

  // ── نقشهٔ کلِ کتاب — کلیک‌شو، بی‌مدل ──
  try { h.push(hvizBookMap_(book)); } catch (eVm) {}

  // ── فصل‌ها ──
  for (var ci = 0; ci < book.chapters.length; ci++) {
    var cc = book.chapters[ci];
    var used = {};
    h.push('<h2 id="' + cc.id + '">' + esc_(faDigitsOut_(String(ci + 1))) + '. ' +
           esc_(cc.title) + '</h2>');
    if (cc.intro) h.push('<p>' + esc_(cc.intro) + '</p>');
    var vz = cc.viz || {};
    var vzBySec = Object.create(null);
    for (var vv = 0; vv < (vz.secs || []).length; vv++) vzBySec[String(vz.secs[vv].at)] = vz.secs[vv];
    if (vz.intro) { try { h.push(hvizHtml_(vz.intro, 'پیش از خواندنِ فصل')); } catch (eVi) {} }
    for (var si = 0; si < (cc.sections || []).length; si++) {
      var sec = cc.sections[si];
      h.push('<h3 id="' + sec.id + '">' + esc_(sec.title) + '</h3>');
      if (sec.takeaway) h.push('<div class="tk"><b>چکیده:</b> ' + esc_(sec.takeaway) + '</div>');
      var ps = handoutParas_(sec.body);
      for (var p = 0; p < ps.length; p++) {
        var mark = (p === ps.length - 1) ? handoutSup_(cc.id, sec.refs) : '';
        h.push('<p>' + esc_(ps[p]) + mark + '</p>');
      }
      for (var rr = 0; rr < (sec.refs || []).length; rr++) used[sec.refs[rr]] = 1;
      for (var ad = 0; ad < (sec.adds || []).length; ad++) {
        var A = sec.adds[ad];
        h.push('<div class="add"><div class="lbl">تکمیل از درسِ ' +
               esc_(faDigitsOut_(String(A.fromEpisode))) +
               (A.why ? ' — ' + esc_(A.why) : '') + '</div>');
        var aps = handoutParas_(A.body);
        for (var ap = 0; ap < aps.length; ap++) {
          h.push('<p>' + esc_(aps[ap]) +
                 (ap === aps.length - 1 ? handoutSup_(cc.id, A.refs) : '') + '</p>');
        }
        for (var r2 = 0; r2 < (A.refs || []).length; r2++) used[A.refs[r2]] = 1;
        h.push('</div>');
      }
      if (sec.backTo && sec.backTo !== cc.id) {
        h.push('<p style="font-size:12.5px;color:#65718a">↩ پیوسته به ' +
               '<a href="#' + esc_(sec.backTo) + '">فصلِ مرتبط</a>' +
               (sec.why ? ' — ' + esc_(sec.why) : '') + '</p>');
      }
      if (vzBySec[String(sec.id)]) {
        try { h.push(hvizHtml_(vzBySec[String(sec.id)], '')); } catch (eVs) {}
      }
    }
    // ── مرورِ فصل در یک نگاه — پیش از پانوشت ──
    if (vz.recap) { try { h.push(hvizHtml_(vz.recap, 'مرورِ فصل')); } catch (eVr) {} }
    // ── پانوشتِ همین فصل، مثلِ زیرِ صفحه در کتاب ──
    var fnos = [];
    for (var k in used) if (Object.prototype.hasOwnProperty.call(used, k)) fnos.push(k);
    fnos.sort(function (a, b) { return Number(a) - Number(b); });
    if (fnos.length) {
      h.push('<div class="fn"><b>پانوشتِ این فصل</b><ol>');
      for (var f = 0; f < fnos.length; f++) {
        var R = refById[fnos[f]] || {};
        var bits = [];
        if (R.publisher) bits.push(R.publisher);
        if (R.date) bits.push(R.date);
        h.push('<li id="f' + cc.id + '-' + fnos[f] + '" value="' + esc_(String(fnos[f])) + '">' +
               (R.url ? '<a href="' + esc_(R.url) + '">' + esc_(R.title || R.url) + '</a>'
                      : esc_(R.title || '—')) +
               (bits.length ? ' — ' + esc_(bits.join('، ')) : '') +
               (R.quote ? '<br><span style="color:#65718a">«' +
                          esc_(String(R.quote).slice(0, 220)) + '»</span>' : '') +
               ' <a href="#b' + cc.id + '-' + fnos[f] + '">↑</a></li>');
      }
      h.push('</ol></div>');
    }
  }

  /* ── ارجاع به مجموعه‌های دیگر (۶٫۸۲) ──
     نه پانوشتِ منبع‌اند و نه کتاب‌نامه: این‌ها نسبت‌هایی‌اند که در درس‌های
     همین مجموعه با مجموعه‌های دیگر گفته شده، و چون گفته شده‌اند جزوِ
     محتوایند. سیاهه فقط ارجاعِ **گفته‌شده** را دارد (`bridgeVerify_` پیش از
     ثبت می‌سنجد)، پس این جدول ادعا نیست؛ گزارشِ چیزی است که شنونده شنیده. */
  if ((book.bridges || []).length) {
    h.push('<h2 id="xref">ارجاع به مجموعه‌های دیگر</h2>');
    h.push('<p class="tk">نسبت‌هایی که در درس‌های این مجموعه با مجموعه‌های ' +
           'دیگر گفته شده است.</p>');
    h.push('<table><tr><th>درس</th><th>مجموعهٔ مرجع</th><th>نسبت</th>' +
           '<th>آن مجموعه چه گفته</th><th>نسبتش با این درس</th></tr>');
    for (var x = 0; x < book.bridges.length; x++) {
      var X = book.bridges[x];
      h.push('<tr><td>' + esc_(faDigitsOut_(String(X.ep || ''))) + '</td>' +
             '<td>' + esc_(X.refSeries || '') + '</td>' +
             '<td>' + esc_(X.kind || '') + '</td>' +
             '<td>' + esc_(X.claim || '') + '</td>' +
             /* خالی یعنی «مدل نسبت را ننوشت» و باید همان‌طور دیده شود؛ تا
                ۶٫۹۵ اینجا نامِ دسته تکرار می‌شد و ستون همیشه پر به‌نظر
                می‌رسید — ستونی که همیشه پر است هرگز مشکوک نمی‌شود. */
             '<td>' + esc_(X.relation || '—') + '</td></tr>');
    }
    h.push('</table>');
  }

  // ── کتاب‌نامه ──
  if (book.refs.length) {
    h.push('<h2 id="refs">کتاب‌نامه</h2>');
    h.push('<table><tr><th>#</th><th>منبع</th><th>ناشر</th><th>تاریخ</th><th>نوع</th><th>از درسِ</th></tr>');
    for (var b = 0; b < book.refs.length; b++) {
      var B = book.refs[b];
      h.push('<tr><td>' + esc_(faDigitsOut_(String(B.n))) + '</td>' +
             '<td>' + (B.url ? '<a href="' + esc_(B.url) + '">' + esc_(B.title || B.url) + '</a>'
                             : esc_(B.title || '')) + '</td>' +
             '<td>' + esc_(B.publisher || '') + '</td><td>' + esc_(B.date || '') + '</td>' +
             '<td>' + esc_(B.kind || '') + '</td>' +
             '<td>' + esc_(faDigitsOut_(String(B.fromEpisode || ''))) + '</td></tr>');
    }
    h.push('</table>');
  }

  h.push('</div><div class="ft">');
  h.push('این جزوه با هر قسمتِ تازهٔ «' + esc_(book.seriesName) + '» خودکار به‌روز می‌شود. ');
  h.push('درس‌های پوشش‌داده‌شده: ' +
         esc_(faDigitsOut_((book.episodes || []).map(function (x) { return String(x.n); }).join('، '))));
  h.push('</div></div>');
  return h.join('\n');
}

/** نوشتنِ HTML در پوشهٔ مجموعه. نام ثابت است، پس نسخهٔ تازه جای قبلی می‌نشیند. */
function handoutRender_(folder, book) {
  var name = handoutHtmlName_(book.seriesName);
  var blob = Utilities.newBlob(handoutHtml_(book), 'text/html', name);
  var it = folder.getFilesByName(name);
  if (it.hasNext()) {
    var f = it.next();
    // نسخه‌های هم‌نامِ اضافی (اگر دستی کپی شده باشد) دست نمی‌خورند؛ فقط
    // اولی به‌روز می‌شود و بقیه در گزارشِ سلامت دیده می‌شوند.
    f.setContent(handoutHtml_(book));
    return f;
  }
  return folder.createFile(blob);
}

/* ══ واقعیت‌های رجیستری، هر بار از نو (۶٫۷۱) ══
 *
 * دسته، سطح و نامِ مجموعه مالِ رجیستری‌اند؛ کتابِ جزوه فقط کپی‌شان را
 * دارد. ۶٫۵۱ آن کپی را «در لحظهٔ تغییر» وصله می‌زد — یک‌باره و بی‌صدا. و
 * دقیقاً همان‌طور که یک‌باره‌ها می‌میرند، مُرد: دستهٔ «معرفت‌شناسی» وقتی
 * عوض شد که نسخهٔ حاملِ وصله هنوز نصب نبود، پوشه‌ها جابه‌جا شدند و جلدِ
 * جزوه تا دو روز بعد «مذهبی و معنوی» ماند — و هیچ مسیرِ جبرانی نبود،
 * چون مجموعهٔ تمام‌شده دیگر درسِ تازه نمی‌گیرد.
 *
 * پس قاعده: هر جا کتاب با ردیفِ رجیستری در یک دست است، کپی با اصل سنجیده
 * و تازه می‌شود — به‌روزرسانیِ درس، جاروی شبانهٔ نمودارها، و دکمهٔ خودِ
 * مجموعه. کپی‌ای که هر شب خودش را با اصل می‌سنجد، کهنه نمی‌ماند؛ اصلاح
 * فقط در «لحظهٔ تغییر» یعنی اصلاح فقط وقتی که بخت یار باشد.
 *
 * نام یک قدمِ بیشتر می‌خواهد: فایلِ HTML به نامِ مجموعه است، پس اول همان
 * فایلِ موجود تغییرنام می‌گیرد — شناسه‌اش می‌ماند و لینکِ ثبت‌شده در تختهٔ
 * مجموعه‌ها زنده می‌ماند؛ ساختنِ فایلِ دوم یعنی دو جزوه برای یک مجموعه،
 * همان dupای که outLayoutCheck_ برای ریشه گزارش می‌کند.
 */
function handoutFacts_(book, rec, folder) {
  if (!book || !rec || !rec.vals) return false;
  var changed = false;
  var cat = seriesCatOf_(rec.vals);
  if (cat && String(book.cat || '') !== cat) { book.cat = cat; changed = true; }
  var lvl = String(rec.vals[SC.LEVEL - 1] || '').trim();
  if (lvl && String(book.level || '') !== lvl) { book.level = lvl; changed = true; }
  var nm = String(rec.vals[SC.NAME - 1] || '').trim();
  if (nm && String(book.seriesName || '') !== nm) {
    if (book.seriesName && folder) {
      try {
        var itO = folder.getFilesByName(handoutHtmlName_(book.seriesName));
        if (itO.hasNext()) itO.next().setName(handoutHtmlName_(nm));
      } catch (eN) {}
    }
    book.seriesName = nm; changed = true;
  }
  /* ══ ارجاع‌ها هم یکی از همان واقعیت‌ها هستند (۶٫۸۲) ══
     خواستهٔ ۶٫۴۳ عیناً این بود: «باید در خودِ مرور و حتی جزوه همگی مورد
     استفاده و **ثبت** قرار بگیره، چون در واقع جزوِ خودِ محتوا شده.» تا
     امروز فقط نیمهٔ اولش شده بود: سیاهه به پرامپتِ جزوه می‌رفت و از مدل
     خواسته می‌شد نگهشان دارد. یعنی ثبتِ ارجاع به این بسته بود که مدل در
     متنِ فصل بیاوردش — و قاعدهٔ همیشگیِ همین ریپو می‌گوید چیزی که فقط در
     پرامپت خواسته شده، تضمین نیست. حالا خودِ سیاهه در کتاب می‌نشیند و در
     HTML بخشِ خودش را دارد: چه مدل در متن آورده باشدشان چه نیاورده، در
     جزوه هستند. اینجاست چون این تابع از هر چهار در گذر می‌کند (درسِ تازه،
     جاروی شبانه، دکمهٔ مجموعه) — یک‌باره‌ها در همین ریپو می‌میرند. */
  try {
    var bl = bridgeOfSeries_(getHub_(), book.seriesName || nm,
                             Number(CFG.HANDOUT_BRIDGE_MAX) || 40,
                             book.seriesKey || String(rec.key || ''));
    /* `relation` هم در امضاست (۶٫۹۵): بی آن، کتاب‌هایی که ارجاعشان عوض
       نشده ولی *شرحِ* نسبتشان تصحیح شده، هرگز بازنویسی نمی‌شدند. */
    var sig = bl.map(function (x) {
      return x.ep + '|' + x.refSeries + '|' + x.kind + '|' +
             String(x.claim).slice(0, 60) + '|' + String(x.relation || '').slice(0, 40);
    }).join('§');
    if (sig !== String(book.bridgeSig || '')) {
      book.bridges = bl; book.bridgeSig = sig; changed = true;
    }
  } catch (eBr) {}
  return changed;
}

/* ───────────────────────── به‌روزرسانیِ یک مجموعه ───────────────────────── */

/**
 * جزوهٔ یک مجموعه را با یک قسمتِ تازه به‌روز می‌کند.
 * @return {{ok:boolean, why:string, stats:object, url:string}}
 */
function handoutUpdate_(folder, meta, hub, rec) {
  var out = { ok: false, why: '', stats: null, url: '' };
  if (CFG.HANDOUT_ENABLED === false) { out.why = 'خاموش'; return out; }
  var ep = (meta && meta.ep) || {};
  var epNum = String((meta && meta.epNum) || '');

  var book = handoutRead_(folder, meta);
  /* هر تلاش یک ردیف می‌گیرد، موفق یا ناموفق. جزوه‌ای که هر شب تلاش می‌کند و
     هر شب «وصله خالی بود» می‌گیرد، از بیرون با جزوه‌ای که اصلاً تلاش نکرده
     یک‌شکل است — و آن دو کاملاً فرقِ هم‌اند. */
  var totals = function () {
    var sc = 0;
    for (var c = 0; c < book.chapters.length; c++) sc += (book.chapters[c].sections || []).length;
    return { totCh: book.chapters.length, totSec: sc, totRef: book.refs.length,
             rev: book.revision || 0 };
  };
  /* ══ تلاشِ ناموفق باید در خودِ کتاب بماند (۵٫۸۸) ══
     تا ۵٫۸۷ درسی که وارد جزوه نمی‌شد، در `episodes` ثبت نمی‌شد — پس کاوشِ
     شبانه هر شب دوباره به صف می‌آوردش و هر شب دوباره شکست می‌خورد: یک
     فراخوانِ مدل و یک ردیفِ تب، هر شب، تا ابد. و شکافِ «چند از چند درس»
     هرگز بسته نمی‌شد، پس یافتهٔ `handout-stuck` هم هرگز حل نمی‌شد.
     حالا تلاش‌ها شمرده می‌شوند و پس از `HANDOUT_TRY_MAX` بار، درس
     **رهاشده** اعلام می‌شود: دیگر تلاش نمی‌شود، ولی — و این مهم است —
     پنهان هم نمی‌شود؛ در وضعیت و سلامت و یافتهٔ کد صریح می‌آید. */
  if (!book.tried) book.tried = {};
  var noteTry = function (why) {
    var rec = book.tried[epNum] || { n: 0, why: '', at: '' };
    rec.n = Number(rec.n || 0) + 1;
    rec.why = String(why || '');
    rec.at = nowStr_();
    book.tried[epNum] = rec;
    try { handoutWrite_(folder, book); } catch (eW) {}
    return rec.n;
  };

  var say = function (why, st, radio, newRef, url) {
    var t = totals();
    try {
      handoutLog_(hub, { series: book.seriesName || (meta && meta.seriesName) || '',
                         key: book.seriesKey || (meta && meta.seriesKey) || '',
                         made: (meta && meta.producedCount) || '',
                         ep: epNum, title: String(ep.title || ''),
                         newCh: (st && st.chapters) || 0, newSec: (st && st.sections) || 0,
                         amend: (st && st.amended) || 0, radio: radio || 0,
                         newRef: newRef || 0, totCh: t.totCh, totSec: t.totSec,
                         totRef: t.totRef, rev: t.rev, result: why, url: url || '' });
    } catch (eL) {}
  };

  for (var e = 0; e < (book.episodes || []).length; e++) {
    if (String(book.episodes[e].n) === epNum) { out.why = 'این درس قبلاً در جزوه هست'; return out; }
  }

  /* قابِ رادیویی اصلاً وارد نمی‌شود: hook و outro و recap بنا به تعریف
     برای گوش نوشته شده‌اند، نه برای چشم. و از خودِ روایت هم جمله‌های
     رادیویی انداخته می‌شوند. */
  var secs = [], dropped = 0;
  for (var s = 0; s < (ep.sections || []).length; s++) {
    var raw = String((ep.sections[s] || {}).narration || '');
    if (!raw.trim()) continue;
    var cleaned = handoutDePodcast_(raw);
    dropped += cleaned.dropped;
    secs.push({ heading: String(ep.sections[s].heading || ''), narration: cleaned.text });
  }
  if (!secs.length) { out.why = 'این قسمت متنی برای جزوه ندارد';
                      out.tries = noteTry(out.why);
                      say(out.why, null, dropped, 0, ''); return out; }

  var refsBefore = book.refs.length;
  var refNos = handoutRefsMerge_(book, (ep.__extSources || []), epNum);
  var newRefs = book.refs.length - refsBefore;

  var patch = handoutPatchModel_(book, secs, {
    seriesName: book.seriesName || meta.seriesName, level: meta.level,
    epNum: epNum, epTitle: ep.title || ''
  });
  if (!patch) { out.why = 'مدل جواب نداد'; out.tries = noteTry(out.why);
                say(out.why, null, dropped, newRefs, ''); return out; }

  var st = handoutApply_(book, patch, { epNum: epNum }, refNos);
  if (!st.chapters && !st.sections && !st.amended) {
    out.why = 'وصله خالی بود'; out.tries = noteTry(out.why);
    say(out.why, st, dropped, newRefs, ''); return out;
  }

  book.seriesKey = book.seriesKey || String(meta.seriesKey || '');
  book.seriesName = book.seriesName || String(meta.seriesName || '');
  /* `||` یعنی «فقط یک بار، برای همیشه» — و دستهٔ مجموعه عوض می‌شود
     (۶٫۵۱). جلدِ جزوه دستهٔ قدیمی را تا ابد نگه می‌داشت. مقدارِ تازه اگر
     هست، می‌نشیند؛ خالی هرگز روی پرِ قبلی نمی‌نشیند. */
  book.cat = String(meta.seriesCat || '') || book.cat || '';
  book.level = book.level || String(meta.level || '');
  /* و روی همهٔ این‌ها، خودِ رجیستری — چون meta از پروندهٔ قسمت می‌آید که
     خودش یک کپی است و می‌تواند مثلِ کتاب کهنه مانده باشد (۶٫۷۱). */
  if (rec) { try { handoutFacts_(book, rec, folder); } catch (eFx) {} }
  if (book.tried && book.tried[epNum]) delete book.tried[epNum];   // موفق شد؛ سابقه پاک
  book.episodes.push({ n: epNum, title: String(ep.title || ''), at: nowStr_(),
                       chapters: String(st.chapters), sections: String(st.sections),
                       amended: String(st.amended), radioDropped: String(dropped) });
  book.revision = Number(book.revision || 0) + 1;
  book.updatedAt = nowStr_();
  handoutRoadmapState_(book, meta.progress);
  // کتابی که به‌روز می‌شود، همان‌جا عنوان‌های کهنه‌اش هم مرتب می‌شود — یک
  // مهاجرتِ یک‌باره که به دستِ کسی نیاز نداشته باشد، سه در دارد نه یکی.
  var fixedT = handoutRetitleBook_(book);
  if (fixedT) logLine_('جزوهٔ «' + book.seriesName + '»: ' + fixedT + ' عنوانِ فصلِ کهنه مرتب شد.');

  /* نمودارها همین‌جا، پیش از رندر — فصلی که این درس ساخت یا تکمیل کرد،
     امضایش عوض شده و از نو نمودار می‌گیرد. سقفِ کوچک، چون این مسیر داخلِ
     شبِ شلوغ است؛ باقی را جاروی شبانه جبران می‌کند. */
  try {
    var vzf = handoutVizFill_(book, Number(CFG.HANDOUT_VIZ_PER_RUN) || 2);
    if (vzf.made) out.viz = vzf.made;
  } catch (eVz) {}
  handoutWrite_(folder, book);
  var file = handoutRender_(folder, book);
  out.ok = true; out.stats = st; out.url = file.getUrl();
  out.dropped = dropped; out.newRefs = newRefs;
  say('به‌روز شد', st, dropped, newRefs, out.url);
  logLine_('جزوهٔ «' + book.seriesName + '» به‌روز شد — ' + st.chapters + ' فصلِ تازه، ' +
           st.sections + ' بخش، ' + st.amended + ' تکمیلِ درس‌های قبلی' +
           (dropped ? '، ' + dropped + ' جملهٔ رادیویی انداخته شد' : '') +
           (st.orphan ? '، ' + st.orphan + ' شناسهٔ ناشناخته (نجات داده شد)' : '') + '.');
  return out;
}

/* ───────────────────── ثبت در شیت: چه شد و کِی ───────────────────── */

/* ══ چرا یک تبِ جدا، وقتی _STATUS.json هم عدد دارد ══
   `handoutStatus_` **حالِ امروز** را می‌گوید: الان چند فصل، چند ارجاع. ولی
   سؤالی که وقتی چیزی خراب می‌شود می‌پرسی این نیست؛ می‌پرسی «از کِی؟» و
   «کدام درس چه چیزی اضافه کرد؟». آن را فقط تاریخچه جواب می‌دهد.

   همان درسی که تبِ «کاربردِ موسیقی» داد: شمارنده می‌گوید چند بار، تاریخچه
   می‌گوید کجا و چه شد — و بی دومی، هیچ ناظری (آدم یا کد) نمی‌تواند بگوید
   جزوه از کدام شب ایستاده است. */
var HANDOUT_HEADERS = ['تاریخ', 'مجموعه', 'درسِ تازه', 'عنوانِ درس',
                       'فصلِ تازه', 'بخشِ تازه', 'تکمیلِ درس‌های قبلی',
                       'جمله‌های رادیوییِ حذف‌شده', 'ارجاعِ تازه',
                       'کلِ فصل‌ها', 'کلِ بخش‌ها', 'کلِ ارجاع‌ها',
                       'بازنگری', 'نتیجه', 'لینکِ جزوه',
                       // کلید، نه فقط نام: تختهٔ مجموعه‌ها با کلید می‌گردد و
                       // دو مجموعه می‌توانند نامِ یکسان داشته باشند.
                       'کلیدِ مجموعه',
                       /* شمارِ قسمت‌هایی که واقعاً در پوشهٔ مجموعه هستند.
                          تنها جای مطمئنِ این عدد، خودِ پوشه است: ستونِ
                          «قسمت‌های پادکست» هم تاریخ قاطی‌اش می‌شود و هم
                          قسمت‌های قدیمی‌تر از شروعِ ثبت را ندارد — در
                          «معرفت شناسی» ستون ۳ تا ۱۵ را داشت ولی پوشه ۱ تا
                          ۱۵ را. تخته باید همین عدد را نشان بدهد، نه حدسِ
                          ستون را. */
                       'قسمتِ تولیدشده'];
var HU = { AT: 1, SERIES: 2, EP: 3, TITLE: 4, NEWCH: 5, NEWSEC: 6, AMEND: 7,
           RADIO: 8, NEWREF: 9, TOTCH: 10, TOTSEC: 11, TOTREF: 12,
           REV: 13, RESULT: 14, LINK: 15, KEY: 16, MADE: 17 };

/**
 * یک ردیف برای هر تلاش — موفق یا ناموفق.
 *
 * ناموفق‌ها هم ثبت می‌شوند و این عمدی است: جزوه‌ای که هر شب تلاش می‌کند و
 * هر شب «وصله خالی بود» می‌گیرد، از بیرون با جزوه‌ای که اصلاً تلاش نکرده
 * یک‌شکل است — و آن دو کاملاً فرقِ هم‌اند.
 */
function handoutLog_(hub, row) {
  try {
    var sh = ensureTab_(hub || getHub_(), CFG.HANDOUT_TAB || 'کاربردِ جزوه',
                        HANDOUT_HEADERS);
    appendBlock_(sh, [[nowStr_(), String(row.series || ''), String(row.ep || ''),
                       String(row.title || ''), String(row.newCh || 0),
                       String(row.newSec || 0), String(row.amend || 0),
                       String(row.radio || 0), String(row.newRef || 0),
                       String(row.totCh || 0), String(row.totSec || 0),
                       String(row.totRef || 0), String(row.rev || 0),
                       String(row.result || ''), String(row.url || ''),
                       String(row.key || ''), String(row.made || '')]],
                HANDOUT_HEADERS.length);
    return true;
  } catch (e) { logLine_('ثبتِ کاربردِ جزوه نوشته نشد: ' + e.message); return false; }
}

/**
 * حالِ جزوهٔ هر مجموعه برای تختهٔ «مجموعه‌های آموزشی و پیشرفت».
 *
 * ══ چرا از تب، نه از درایو ══
 * تخته همهٔ ۲۶۴ مجموعه را می‌کشد. خواندنِ `_HANDOUT.json` برای هرکدام یعنی
 * ۲۶۴ رفت‌وبرگشتِ درایو در یک بازکردنِ پنجره — پنجره‌ای که باید سریع باز
 * شود. تبِ «کاربردِ جزوه» همین حالا آخرین حالِ هر مجموعه را دارد و **یک**
 * خواندن است. تاریخچه‌ای که برای نظارت ساخته شد، همین‌جا دومین کارش را
 * می‌کند.
 *
 * @return {Object} نگاشتِ کلیدِ مجموعه → آخرین حالِ جزوه‌اش
 */
function handoutBoardMap_(hub) {
  var map = Object.create(null);
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.HANDOUT_TAB || 'کاربردِ جزوه');
    if (!sh || sh.getLastRow() < 2) return map;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, HANDOUT_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var k = String(v[i][HU.KEY - 1] || '').trim();
      if (!k) continue;
      var cur = map[k];
      // آخرین ردیفِ هر مجموعه برنده است؛ ولی لینک و مجموع‌ها فقط از ردیفی
      // برداشته می‌شوند که واقعاً موفق بوده — وگرنه یک شکستِ دیشب، آمارِ
      // درستِ پریشب را با صفر می‌پوشاند.
      var okRow = String(v[i][HU.RESULT - 1]) === 'به‌روز شد';
      if (!cur) cur = map[k] = { at: '', ep: '', result: '', tries: 0, lessons: 0,
                                 produced: 0,
                                 totCh: 0, totSec: 0, totRef: 0, amend: 0,
                                 url: '', lastOkAt: '', lastOkEp: '', abandoned: 0,
                                 __fail: Object.create(null) };
      cur.tries++;
      // شمارِ شکستِ هر درس، تا تخته «رهاشده» را هم نشان بدهد. موفقیت
      // شمارنده را صفر می‌کند، چون همان کاری است که خودِ کتاب می‌کند.
      var epK = String(v[i][HU.EP - 1] || '');
      if (epK) {
        if (okRow) cur.__fail[epK] = 0;
        else cur.__fail[epK] = (cur.__fail[epK] || 0) + 1;
      }
      cur.at = String(v[i][HU.AT - 1] || '');
      cur.ep = String(v[i][HU.EP - 1] || '');
      cur.result = String(v[i][HU.RESULT - 1] || '');
      var madeCell = Number(v[i][HU.MADE - 1]) || 0;
      if (madeCell) cur.produced = madeCell;    // تازه‌ترین شمارِ واقعیِ پوشه
      if (okRow) {
        cur.lessons++;                          // هر ردیفِ موفق = یک درسِ واردشده
        cur.totCh = Number(v[i][HU.TOTCH - 1]) || 0;
        cur.totSec = Number(v[i][HU.TOTSEC - 1]) || 0;
        cur.totRef = Number(v[i][HU.TOTREF - 1]) || 0;
        cur.amend += Number(v[i][HU.AMEND - 1]) || 0;
        cur.url = String(v[i][HU.LINK - 1] || '') || cur.url;
        cur.lastOkAt = cur.at; cur.lastOkEp = cur.ep;
      }
    }
    var lim = Math.max(1, Number(CFG.HANDOUT_TRY_MAX) || 4);
    for (var kk in map) {
      if (!Object.prototype.hasOwnProperty.call(map, kk)) continue;
      var f = map[kk].__fail || {};
      for (var ee in f) {
        if (Object.prototype.hasOwnProperty.call(f, ee) && f[ee] >= lim) map[kk].abandoned++;
      }
      delete map[kk].__fail;
    }
  } catch (e) {}
  return map;
}

/** شمارِ درس‌های در صفِ هر مجموعه — برای همان تخته. */
function handoutDueByKey_() {
  var out = Object.create(null);
  try {
    var l = handoutDueList_();
    for (var i = 0; i < l.length; i++) {
      out[l[i].key] = (out[l[i].key] || 0) + 1;
    }
  } catch (e) {}
  return out;
}

/**
 * یک مجموعهٔ مشخص: گذشته‌اش را به صف بیاور و همین حالا بساز.
 * دکمهٔ ذیلِ همان مجموعه در تخته این را صدا می‌زند.
 */
function handoutOneSeries_(key, maxItems) {
  var out = { queued: 0, done: 0, left: 0, notes: [] };
  var k = String(key || '');
  if (!k) { out.notes.push('کلیدِ مجموعه خالی است'); return out; }
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  var rec = reg.byKey[k];
  if (!rec) { out.notes.push('مجموعه در رجیستری نیست'); return out; }
  try {
    var sf = seriesFolder_(reg, rec);
    var eps = handoutSeriesEpisodes_(sf);
    var book = handoutRead_(sf, null);
    /* دکمهٔ آدم همیشه واقعیت‌های رجیستری را هم تازه می‌کند — همان دری که
       برای سابقهٔ تلاش و عنوان‌ها باز است، برای دسته/سطح/نام هم باز باشد. */
    var fx = false;
    try {
      fx = handoutFacts_(book, rec, sf);
      if (fx) out.notes.push('مشخصاتِ جلد (دسته/سطح/نام) از رجیستری تازه شد');
    } catch (eFx) { out.notes.push('تازه‌سازیِ مشخصاتِ جلد نشد: ' + eFx.message); }
    /* دستِ آدم، سابقهٔ تلاش را پاک می‌کند.
       رهاکردن برای این است که موتور هر شب بی‌فایده تلاش نکند — نه اینکه
       درس برای همیشه دفن شود. کسی که پس از یک اصلاح دکمه را می‌زند،
       دارد می‌گوید «حالا دوباره امتحان کن»، و سدی که با دستِ آدم هم باز
       نشود، سد نیست. */
    var reset = 0;
    if (book.tried) {
      for (var t in book.tried) {
        if (Object.prototype.hasOwnProperty.call(book.tried, t)) reset++;
      }
      if (reset) book.tried = {};
    }
    out.reset = reset;
    /* دکمهٔ آدم، سدِ نمودار را هم باز می‌کند — همان قاعده. و همین‌جا تا
       سقفِ دستی پر می‌شود، تا «جبرانِ گذشته» منتظرِ نوبتِ جاروی شبانه نماند. */
    var vizReset = 0;
    for (var vc = 0; vc < (book.chapters || []).length; vc++) {
      if (book.chapters[vc].vizTried) { delete book.chapters[vc].vizTried; vizReset++; }
    }
    var vzr = { made: 0, calls: 0, pending: 0 };
    try { vzr = handoutVizFill_(book, Number(CFG.HANDOUT_VIZ_MANUAL) || 6); }
    catch (eVb) { out.notes.push('نمودارها: ' + eVb.message); }
    out.viz = vzr.made;
    /* بازتنوع، همین‌جا و با دستِ آدم — و رسیدش می‌گوید ترازِ گونه‌ها بعدش
       چه شد، تا لازم نباشد کسی جزوه را باز کند و بشمارد. */
    var dvb = { calls: 0, redone: 0, dominant: '', share: 0 };
    if (!vzr.pending) {
      try { dvb = hvizDiversify_(book, 4); } catch (eDvb) {}
      if (dvb.redone) {
        out.notes.push('بازتنوع: ' + faDigitsOut_(String(dvb.redone)) +
                       ' نمودارِ تکراری («' + dvb.dominant + '») با گونهٔ تازه از نو ساخته شد');
      } else if (dvb.calls) {
        out.notes.push('بازتنوع: مدل برای «' + dvb.dominant + '» جایگزینی نداد؛ نمودارهای قبلی ماندند');
      }
    }
    try {
      var csb = hvizCensus_(book);
      if (csb.total) {
        var csbL = [];
        for (var ckb in csb.by) {
          if (Object.prototype.hasOwnProperty.call(csb.by, ckb)) {
            csbL.push(ckb + ' ' + faDigitsOut_(String(csb.by[ckb])));
          }
        }
        out.notes.push('گونه‌های این جزوه اکنون: ' + csbL.join('، '));
      }
    } catch (eCsb) {}
    /* شکستِ بی‌صدا همان چیزی است که «دکمه زدم و هیچ نشد» می‌سازد (۶٫۶۰):
       فراخوان رفته و جواب نیامده باید در پیامِ همان دکمه گفته شود. */
    if (vzr.calls && !vzr.made) {
      out.notes.push('نمودار: مدل به ' + vzr.calls + ' درخواست جواب نداد' +
                     (vzr.why ? ' — علت: ' + vzr.why : ' — بعداً دوباره بزنید') +
                     (vzr.pending ? ' (' + vzr.pending + ' فصل در نوبت ماند)' : ''));
    }
    /* و نقشهٔ راه از پیشرفتِ واقعی — مجموعهٔ تمام‌شده باید ۱۰۰٪ و همهٔ
       مرحله‌هایش «انجام‌شده» دیده شود، نه عددِ روزِ اول. */
    var rmWas = '';
    try { rmWas = handoutRoadmapSig_(book); } catch (eR0) {}
    var rmChanged = false;
    try {
      handoutRoadmapState_(book, handoutProgressOf_(hub, k));
      rmChanged = handoutRoadmapSig_(book) !== rmWas;
      if (rmChanged) out.notes.push('نقشهٔ راه به‌روز شد (' +
        String((book.roadmap.progress || {}).pct || '؟') + '٪)');
    } catch (eRm) {}
    if (vzr.made || vizReset || rmChanged || fx || dvb.redone || dvb.calls) {
      try {
        /* مُهرِ جلد هم بالا برود — «به‌روزرسانی: دو روز پیش» روی جزوه‌ای که
           همین حالا نمودار گرفت، دروغِ کوچکی است که اعتماد را می‌خورد (۶٫۶۷). */
        if (vzr.made || rmChanged || dvb.redone) book.updatedAt = nowStr_();
        handoutWrite_(sf, book);
        if (vzr.made || rmChanged || fx || dvb.redone) handoutRender_(sf, book);
      } catch (eVw) { out.notes.push('نوشتنِ جزوه: ' + eVw.message); }
    }
    /* و همین‌جا عنوان‌های کهنه هم مرتب می‌شوند — بی‌قیدِ نشانهٔ «مهاجرت تمام
       شد». دکمه‌ای که آدم می‌زند باید همیشه کارش را بکند؛ اگر یک بار جارو
       رد شده و چیزی جا مانده، این دومین در است. */
    out.retitled = handoutRetitleBook_(book);
    if (reset || out.retitled) {
      try {
        if (out.retitled) {
          book.revision = Number(book.revision || 0) + 1;
          book.updatedAt = nowStr_();
        }
        handoutWrite_(sf, book);
        if (out.retitled) handoutRender_(sf, book);
      } catch (eR) {}
    }
    var have = Object.create(null);
    for (var e = 0; e < (book.episodes || []).length; e++) have[String(book.episodes[e].n)] = 1;
    var nums = [];
    for (var n in eps) if (Object.prototype.hasOwnProperty.call(eps, n) && !have[n]) nums.push(n);
    nums.sort(function (a, b) { return (Number(a) || 0) - (Number(b) || 0); });
    out.queued = handoutDueAddMany_(nums.map(function (x) { return { key: k, ep: x }; }));
  } catch (e2) { out.notes.push(e2.message); return out; }
  var r = handoutRunDue_(Math.max(1, Number(maxItems) || Number(CFG.HANDOUT_MANUAL_MAX) || 12),
                         Number(CFG.HANDOUT_MANUAL_MS) || 210000);
  out.done = r.done; out.notes = out.notes.concat(r.notes); out.ranOut = r.ranOut;
  out.left = (handoutDueByKey_()[k] || 0);
  return out;
}


/* ═══════════════════ نمودارهای جزوه (۶٫۵۷) ═══════════════════
 *
 * خواستهٔ صریح: «داخل جزوهٔ هر درسنامه … در ابتدای و انتهای هر فصل و هر
 * قسمتی که لازم شد، از نمودارها مثل نقشهٔ ذهنی و فلوچارت و حالتِ مدارمانند
 * و اینفوگرافیک استفاده بشه و مدل تشخیص بده هرکدوم کجا کاربرد داره … و با
 * کلیک روی هر قسمت از نمودار هدایت بشه به سمتِ اون مطلب. برای درس‌های قبلی
 * هم حتماً جبران بشه.»
 *
 * تقسیمِ کار همان قاعدهٔ همیشگی است — مدل پیشنهاد می‌دهد، کد تصمیم می‌گیرد:
 *   • مدل: کدام فصل چه نموداری می‌خواهد، از چه نوعی، با چه گره‌هایی، و هر
 *     گره به کدام بخش اشاره دارد. این کارِ فهمِ محتواست و فقط از او برمی‌آید.
 *   • کد: رندر، اعتبارِ شناسه‌ها (گرهِ با شناسهٔ ساختگی لینکِ مرده نمی‌سازد؛
 *     متنش می‌ماند و لینکش می‌افتد)، سقفِ تعداد، و نقشهٔ کلِ کتاب که اصلاً
 *     مدل نمی‌خواهد — فصل‌ها معلوم‌اند.
 *
 * چرا HTML/CSS و نه SVG: متنِ فارسیِ راست‌به‌چپِ چندخطی در SVG باید دستی
 * شکسته و اندازه‌گیری شود و همان‌جا می‌شکند که مهم است (عنوانِ بلند). در
 * HTML شکستنِ خط، کلیک، چاپ و بزرگ‌نمایی همه بومی‌اند. «نمودار» بودن از
 * چیدمان می‌آید، نه از تگِ svg.
 *
 * و درسِ همیشگیِ این ریپو: نمودارِ ساخته‌شده باید *وصل* باشد — هر گره
 * href به لنگرِ همان بخش در همین فایل، همان لنگرهایی که فهرستِ کلیک‌شو
 * از روزِ اول داشت.
 */

var HVIZ_KINDS = {
  'نقشهٔ ذهنی': 1, 'نقشهٔ مفهومی': 1, 'روندنما': 1, 'چرخه': 1,
  'سلسله‌مراتب': 1, 'تقابل': 1, 'کارت‌ها': 1, 'وِن': 1
};

/* مترادف‌ها — مدل و آدم هر دو با این نام‌ها هم حرف می‌زنند (تصویرِ نمونهٔ
   صاحبِ برنامه: «لایه‌ای/هرمی»، «دیاگرام فرآیند»، «ماتریس مقایسه»…). */
function hvizKindOf_(k) {
  var n = String(k || '').replace(/[\u0650\u0654\u200c\s]/g, '').toLowerCase();
  var map = {
    'نقشهذهنی': 'نقشهٔ ذهنی', 'مایندمپ': 'نقشهٔ ذهنی',
    'نقشهمفهومی': 'نقشهٔ مفهومی',
    'روندنما': 'روندنما', 'فلوچارت': 'روندنما', 'دیاگرامفرایند': 'روندنما',
    'دیاگرامفرآیند': 'روندنما', 'فرایند': 'روندنما',
    'چرخه': 'چرخه', 'مدار': 'چرخه',
    'سلسلهمراتب': 'سلسله‌مراتب', 'هرمی': 'سلسله‌مراتب', 'لایهای': 'سلسله‌مراتب',
    'هرم': 'سلسله‌مراتب',
    'تقابل': 'تقابل', 'ماتریسمقایسه': 'تقابل', 'مقایسه': 'تقابل',
    'ون': 'وِن', 'وندیاگرام': 'وِن', 'دیاگرامون': 'وِن',
    'venn': 'وِن', 'venndiagram': 'وِن', 'همپوشانی': 'وِن',
    'کارتها': 'کارت‌ها', 'اینفوگرافیک': 'کارت‌ها'
  };
  return map[n] || (HVIZ_KINDS[String(k || '').trim()] ? String(k).trim() : '');
}

/* اسکیما عمداً تمام‌لفظی است، به همان سبکِ HANDOUT_SCHEMA که هر شب کار
   می‌کند — بدونِ شیءِ مشترک بینِ شاخه‌ها. و هیچ فیلدی جز رشته (قاعدهٔ ریپو). */
/* یک فراخوان، یک نمودار (۶٫۶۵). قالبِ سه‌تکه (intro+recap+secs) در عمل
   شکست خورد: چهار رسیدِ پیاپیِ صاحبِ برنامه نشان داد مدل تکهٔ اول را کامل
   می‌سازد ({"kind":"نقشهٔ ذهنی","title":…}) و بقیه هیچ‌وقت سالم نمی‌رسد.
   قراردادِ کوچک، کلاسِ خطا را حذف می‌کند — نه فقط احتمالش را. */
var HVIZ_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string' }, title: { type: 'string' }, note: { type: 'string' },
    at: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' }, detail: { type: 'string' },
          to: { type: 'string' }, group: { type: 'string' }
        },
        required: ['label']
      }
    }
  },
  required: ['kind', 'items']
};

/* آخرین علتِ شکستِ مدل در نمودارسازی — برای پیامِ دکمه و وضعیت. */
var HVIZ_WHY_ = '';

/** امضای ساختاریِ فصل — تکمیل/بخشِ تازه یعنی نمودارِ کهنه، و باید از نو. */
function hvizSig_(cc) {
  /* پیشوندِ نسخه: عوض‌کردنش یعنی «همه از نو». ۶٫۶۶ عمداً بالا برد — ۳۱
     نمودارِ ساخته‌شده ۲۱تایش نقشهٔ ذهنی بود و همه هم‌شکل؛ نگه‌داشتنشان
     یعنی تثبیتِ همان یکنواختی‌ای که صاحبِ برنامه گزارش کرد. */
  var bits = ['v2', String(cc.id), String(cc.title)];
  for (var i = 0; i < (cc.sections || []).length; i++) {
    var sc = cc.sections[i];
    bits.push(String(sc.id), String(sc.title),
              String((sc.body || '').length), String((sc.adds || []).length));
  }
  try { return speakHash_(bits.join('|')); } catch (e) { return bits.join('|').slice(0, 120); }
}

/** شناسه‌های قابلِ اشاره در کتاب — لنگرهای واقعیِ HTML. */
function hvizIds_(book) {
  var ok = Object.create(null);
  for (var c = 0; c < (book.chapters || []).length; c++) {
    var cc = book.chapters[c];
    ok[String(cc.id)] = 1;
    for (var s = 0; s < (cc.sections || []).length; s++) ok[String(cc.sections[s].id)] = 1;
  }
  return ok;
}

/**
 * ناحیه‌بندیِ وِن — یک تعریف برای پاک‌سازی و رندر (دو نسخه از یک منطق یعنی
 * یکی بی‌صدا کهنه می‌شود). از groupها سه چیز درمی‌آورد:
 *   دایره‌ها (نامِ ساده)، مشترک‌های دوبه‌دو («تجربه و عقل» یا «مشترکِ
 *   تجربه و عقل» — هر groupی که نامِ دقیقاً دو دایره در آن باشد)، و
 *   مشترکِ همه («مشترک»، «هر سه»، «همه»).
 * «مالِ کدام‌هاست» را همین ناحیه‌بندی جواب می‌دهد — خواستهٔ صریح پس از
 * دیدنِ رندرِ اول: «معلوم نیست اون اشتراک برای کدومهاست».
 */
function hvizVennZones_(items) {
  var order = [], by = Object.create(null);
  for (var i = 0; i < items.length; i++) {
    var g = String(items[i].group || 'مشترک');
    if (!by[g]) { by[g] = []; order.push(g); }
    by[g].push(items[i]);
  }
  var isMid = function (g) { return /مشترک|هر ?دو|هر ?سه|همه|هم[‌ ]?پوشان/.test(g); };
  var sides = [], rest = [];
  for (var o = 0; o < order.length; o++) {
    // دایره: نه واژهٔ «مشترک»‌گونه دارد، نه «و»ِ جداکننده — نامِ یک مفهوم است.
    if (!isMid(order[o]) && order[o].indexOf(' و ') === -1) sides.push(order[o]);
    else rest.push(order[o]);
  }
  var pairs = [], centers = [];
  for (var r = 0; r < rest.length; r++) {
    var g2 = rest[r], names = [];
    for (var s = 0; s < sides.length; s++) {
      if (g2.indexOf(sides[s]) !== -1) names.push(s);
    }
    if (names.length === 2) pairs.push({ g: g2, a: names[0], b: names[1] });
    else if (!isMid(g2) && sides.length < 3) sides.push(g2);
    else centers.push(g2);
  }
  return { by: by, sides: sides, pairs: pairs, centers: centers };
}

/** پاک‌سازیِ پیشنهادِ مدل: نوعِ ناشناخته، گرهٔ بی‌متن، شناسهٔ ساختگی. */
function hvizClean_(d, idsOk) {
  /* ══ مدارا با دو بدشکلیِ رایجِ مدل (۶٫۶۴) ══
     رسیدِ ۶٫۶۳: پاسخ سالم می‌رسد، فقط intro دارد، و همان هم از پاک‌سازی
     رد نمی‌شود. دو شکلِ شناخته که مدل‌ها به آن می‌لغزند: کلِ نمودار به‌صورت
     «رشتهٔ JSON» به‌جای شیء؛ و items به‌صورت آرایهٔ رشته به‌جای آرایهٔ شیء.
     محتوای درست به جرمِ پوسته‌اش دور نمی‌رود. */
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (eS) { return null; } }
  if (d && d.items && typeof d.items === 'string') {
    try { d.items = JSON.parse(d.items); } catch (eI) {}
  }
  if (d && Object.prototype.toString.call(d.items) === '[object Array]') {
    for (var z = 0; z < d.items.length; z++) {
      if (typeof d.items[z] === 'string') d.items[z] = { label: d.items[z] };
    }
  }
  if (!d || !((d.items || []).length)) return null;
  var kind = hvizKindOf_(d.kind) || 'کارت‌ها';
  var items = [];
  for (var i = 0; i < d.items.length && items.length < 10; i++) {
    var it = d.items[i] || {};
    var label = String(it.label || '').trim().slice(0, 60);
    if (!label) continue;
    var to = String(it.to || '').trim();
    if (to && !idsOk[to]) to = '';        // شناسهٔ ساختگی → گره می‌ماند، لینک می‌افتد
    items.push({ label: label, detail: String(it.detail || '').trim().slice(0, 140),
                 to: to, group: String(it.group || '').trim().slice(0, 40) });
  }
  if (items.length < 2) return null;      // نمودارِ تک‌گره، نمودار نیست
  if (kind === 'وِن') {
    // وِن یعنی دستِ‌کم دو ناحیه (دو دایره، یا دایره + مشترک). وِنِ
    // تک‌ناحیه فقط یک فهرست است — همان کارت‌ها، با ادعای بیشتر. و بیش از
    // سه دایره را نمی‌شود صادقانه کشید — ستون‌های تقابل همان را بهتر می‌گویند.
    // (مشترک‌های دوبه‌دو دایره نیستند و نباید دایره شمرده شوند.)
    var zzC = hvizVennZones_(items);
    if (zzC.sides.length + zzC.pairs.length + zzC.centers.length < 2) kind = 'کارت‌ها';
    else if (zzC.sides.length > 3) kind = 'تقابل';
  }
  return { kind: kind, title: String(d.title || '').trim().slice(0, 90),
           note: String(d.note || '').trim().slice(0, 200), items: items };
}

/** یک گره — با لینک اگر مقصدِ واقعی دارد. */
function hvizNode_(it, cls) {
  var inner = '<b>' + esc_(it.label) + '</b>' +
              (it.detail ? '<span>' + esc_(it.detail) + '</span>' : '');
  if (it.to) return '<a class="' + cls + '" href="#' + esc_(it.to) + '">' + inner + '</a>';
  return '<div class="' + cls + '">' + inner + '</div>';
}

/**
 * رندرِ یک نمودار — هر نوع، «شکلِ» خودش، نه فقط برچسبِ خودش (۶٫۶۶).
 * گزارشِ صاحبِ برنامه: «چند نمونه‌ای هم که رسم شده بود شبیه هم بودن». راست
 * می‌گفت — همه جعبه در شبکه بودند. حالا: نقشهٔ ذهنی درختِ متصل است، چرخه
 * چیدمانِ دایره‌ایِ واقعی (مختصات را کد حساب می‌کند، N معلوم است)، سلسله‌مراتب
 * هرمِ پهن‌شونده، روندنما گام‌های شماره‌دارِ فلش‌دار، تقابل دو ستونِ رودررو،
 * نقشهٔ مفهومی یال‌های برچسب‌دار، و کارت‌ها کارتِ شماره‌دار.
 */
function hvizHtml_(d, badge) {
  if (!d || !(d.items || []).length) return '';
  var cls = {
    'نقشهٔ ذهنی': 'mm', 'نقشهٔ مفهومی': 'cm', 'روندنما': 'flow', 'چرخه': 'cyc',
    'سلسله‌مراتب': 'hier', 'تقابل': 'cmp', 'کارت‌ها': 'cards', 'وِن': 'venn'
  }[d.kind] || 'cards';
  var h = ['<div class="hvz hvz-' + cls + '">'];
  h.push('<div class="hvz-h"><span class="hvz-k hvk-' + cls + '">' + esc_(d.kind) + '</span>' +
         (badge ? '<span class="hvz-b">' + esc_(badge) + '</span>' : '') +
         (d.title ? '<b>' + esc_(d.title) + '</b>' : '') + '</div>');
  var items = d.items;
  if (cls === 'mm') {
    // درخت: مرکز بالا، شاخه‌ها با خطِ اتصالِ واقعی
    h.push('<div class="hvz-c">' + hvizNode_(items[0], 'hvz-ctr') + '</div>');
    h.push('<div class="hvz-tree">');
    for (var i = 1; i < items.length; i++) {
      h.push('<div class="hvz-twig">' + hvizNode_(items[i], 'hvz-n') + '</div>');
    }
    h.push('</div>');
  } else if (cls === 'cm') {
    // نقشهٔ مفهومی: مرکز + یال‌های برچسب‌دار — detail برچسبِ رابطه است
    h.push('<div class="hvz-c">' + hvizNode_({ label: items[0].label, to: items[0].to },
                                             'hvz-ctr') + '</div>');
    for (var m = 1; m < items.length; m++) {
      h.push('<div class="hvz-edge"><span class="hvz-rel">' +
             esc_(items[m].detail || 'مرتبط است با') + ' ⟵</span>' +
             hvizNode_({ label: items[m].label, to: items[m].to, group: items[m].group },
                       'hvz-n') + '</div>');
    }
  } else if (cls === 'flow') {
    h.push('<div class="hvz-fl">');
    for (var f = 0; f < items.length; f++) {
      if (f) h.push('<div class="hvz-ar">↓</div>');
      h.push('<div class="hvz-step"><span class="hvz-no">' + faDigitsOut_(String(f + 1)) +
             '</span>' + hvizNode_(items[f], 'hvz-n hvz-st') + '</div>');
    }
    h.push('</div>');
  } else if (cls === 'cyc') {
    // دایرهٔ واقعی: مختصات سمتِ سرور — N معلوم است، حساب مجانی است
    var n = items.length;
    var H = Math.max(260, 90 * Math.ceil(n / 2));
    h.push('<div class="hvz-orbit" style="height:' + H + 'px">');
    h.push('<span class="hvz-hub">⟳</span>');
    for (var c2 = 0; c2 < n; c2++) {
      var ang = (2 * Math.PI * c2) / n - Math.PI / 2;
      var x = 50 + 38 * Math.sin(ang + Math.PI / 2) * 0;  // جای‌گذاری با cos/sin واقعی
      x = 50 + 38 * Math.cos(ang);
      var y = 50 + 38 * Math.sin(ang);
      h.push('<div class="hvz-sat" style="right:' + x.toFixed(1) + '%;top:' +
             y.toFixed(1) + '%">' + hvizNode_(items[c2], 'hvz-n') + '</div>');
    }
    h.push('</div>');
  } else if (cls === 'hier') {
    // هرم: سطرها از بالا باریک به پایین پهن، هر سطح رنگِ خودش
    var groups = [], byG = Object.create(null);
    for (var g = 0; g < items.length; g++) {
      var gk = items[g].group || '—';
      if (!byG[gk]) { byG[gk] = []; groups.push(gk); }
      byG[gk].push(items[g]);
    }
    h.push('<div class="hvz-pyr">');
    for (var gg = 0; gg < groups.length; gg++) {
      var w = Math.min(100, 46 + gg * Math.floor(54 / Math.max(1, groups.length - 1) || 1));
      h.push('<div class="hvz-lvl hvl-' + (gg % 5) + '" style="width:' + w + '%">' +
             '<div class="hvz-g">' + esc_(groups[gg]) + '</div><div class="hvz-gi">');
      for (var q = 0; q < byG[groups[gg]].length; q++) {
        h.push(hvizNode_(byG[groups[gg]][q], 'hvz-n'));
      }
      h.push('</div></div>');
    }
    h.push('</div>');
  } else if (cls === 'cmp') {
    var gsC = [], byC = Object.create(null);
    for (var t = 0; t < items.length; t++) {
      var ck = items[t].group || '—';
      if (!byC[ck]) { byC[ck] = []; gsC.push(ck); }
      byC[ck].push(items[t]);
    }
    h.push('<div class="hvz-vs">');
    for (var v = 0; v < gsC.length; v++) {
      if (v) h.push('<div class="hvz-vsb">در برابرِ</div>');
      h.push('<div class="hvz-col hvc-' + (v % 2) + '"><div class="hvz-colh">' +
             esc_(gsC[v]) + '</div>');
      for (var q2 = 0; q2 < byC[gsC[v]].length; q2++) {
        h.push(hvizNode_(byC[gsC[v]][q2], 'hvz-n'));
      }
      h.push('</div>');
    }
    h.push('</div>');
  } else if (cls === 'venn') {
    /* وِن: دایره‌های واقعیِ هم‌پوشان — «یه چیز مثل اینه» با دو اسکرین‌شاتِ
       مرجعِ صاحبِ برنامه. دایره‌ها <i>های تزئینیِ مطلق‌اند و متنِ ناحیه‌ها
       لایهٔ جدا، تا نه بریده شوند نه زیرِ هم پنهان. group نامِ هر دایره
       است و «مشترک»/«هر دو» ناحیهٔ هم‌پوشانی؛ دو یا سه دایره.
       («hvz-vd» نه «hvz-venn» — بیرونی‌ترین div خودش hvz-venn است و
       هم‌نامی، چیدمان را به کلِ جعبه می‌زد؛ در رندرِ واقعی دیده شد.) */
    var zz = hvizVennZones_(items);
    var sidesV = zz.sides;
    var three = sidesV.length >= 3;
    h.push('<div class="hvz-vd ' + (three ? 'hvz-vd3' : 'hvz-vd2') + '">');
    // برچسبِ نامِ هر دایره، بیرونِ دایره — مثلِ مرجع
    var tagC = ['hvt-a', 'hvt-b', 'hvt-c'];
    for (var w3 = 0; w3 < sidesV.length && w3 < 3; w3++) {
      h.push('<span class="hvn-tag ' + tagC[w3] + '">' + esc_(sidesV[w3]) + '</span>');
    }
    h.push('<i class="hvn-c hvca"></i><i class="hvn-c hvcb"></i>' +
           (three ? '<i class="hvn-c hvcc"></i>' : ''));
    var zoneV = function (kls, title, items2) {
      if (!items2 || !items2.length) return;
      h.push('<div class="hvn-z ' + kls + '">' +
             (title ? '<b class="hvn-zt">' + esc_(title) + '</b>' : ''));
      for (var w6 = 0; w6 < items2.length; w6++) h.push(hvizNode_(items2[w6], 'hvz-n'));
      h.push('</div>');
    };
    var sideCls = ['hvz-za', 'hvz-zb', 'hvz-zc'];
    for (var w4 = 0; w4 < sidesV.length && w4 < 3; w4++) {
      zoneV(sideCls[w4], '', zz.by[sidesV[w4]]);
    }
    /* مشترک‌های دوبه‌دو، هر یک در عدسیِ هندسیِ همان دو دایره — «مالِ
       کدام‌هاست» را هم جای ناحیه می‌گوید و هم برچسبِ کوچکش به اسم. */
    var pairPos = { '01': 'hvz-zab', '02': 'hvz-zac', '12': 'hvz-zbc' };
    var pairItems = {}, pairTitle = {};
    for (var w5 = 0; w5 < zz.pairs.length; w5++) {
      var pA = Math.min(zz.pairs[w5].a, zz.pairs[w5].b);
      var pB = Math.max(zz.pairs[w5].a, zz.pairs[w5].b);
      var pk = three ? (pA + '' + pB) : '01';   // دو دایره: هر جفتی همان عدسی است
      pairItems[pk] = (pairItems[pk] || []).concat(zz.by[zz.pairs[w5].g]);
      pairTitle[pk] = pairTitle[pk] ||
        ('مشترکِ ' + sidesV[pA] + ' و ' + sidesV[pB]);
    }
    var midItems = [];
    for (var w7 = 0; w7 < zz.centers.length; w7++) {
      midItems = midItems.concat(zz.by[zz.centers[w7]]);
    }
    if (!three) {
      // دو دایره: دوبه‌دو و «همه» یک ناحیه‌اند — عدسیِ میانی، به نامِ هر دو.
      midItems = (pairItems['01'] || []).concat(midItems);
      zoneV('hvz-zm', sidesV.length >= 2
            ? 'مشترکِ ' + sidesV[0] + ' و ' + sidesV[1] : 'مشترک', midItems);
    } else {
      for (var pk2 in pairPos) {
        if (Object.prototype.hasOwnProperty.call(pairPos, pk2) && pairItems[pk2]) {
          zoneV(pairPos[pk2], pairTitle[pk2], pairItems[pk2]);
        }
      }
      zoneV('hvz-zm', 'مشترکِ هر سه', midItems);
    }
    h.push('</div>');
  } else {
    h.push('<div class="hvz-grid">');
    for (var k = 0; k < items.length; k++) {
      h.push('<div class="hvz-card"><span class="hvz-no">' + faDigitsOut_(String(k + 1)) +
             '</span>' + hvizNode_(items[k], 'hvz-n') + '</div>');
    }
    h.push('</div>');
  }
  if (d.note) h.push('<div class="hvz-note">' + esc_(d.note) + '</div>');
  h.push('</div>');
  return h.join('');
}

/**
 * نقشهٔ کلِ کتاب — بی‌مدل، همیشه، مجانی. فصل‌ها معلوم‌اند؛ برای «روی چه
 * کلیک کنم تا کجا بروم» هیچ فهمی لازم نیست، فقط صداقتِ ساختار.
 */
function hvizBookMap_(book) {
  var chs = book.chapters || [];
  if (chs.length < 2) return '';
  var items = [{ label: String(book.seriesName || 'این کتاب'), detail: '', to: '', group: '' }];
  for (var i = 0; i < chs.length && items.length < 10; i++) {
    items.push({ label: handoutTitleClean_(String(chs[i].title || '')).slice(0, 60),
                 detail: faDigitsOut_(String((chs[i].sections || []).length)) + ' بخش',
                 to: String(chs[i].id), group: '' });
  }
  return hvizHtml_({ kind: 'نقشهٔ ذهنی', title: 'نقشهٔ کتاب در یک نگاه',
                     note: 'روی هر شاخه کلیک کنید تا به همان فصل بروید.',
                     items: items }, '');
}

/**
 * یک نمودار برای یک فصل — which: 'intro' یا 'recap' یا 'sec'. null یعنی نشد.
 * avoidKind: گونه(هایی) که در این جایگاه از پیش هست و تکرارش زائد است.
 */
function hvizModelOne_(book, cc, which, avoidKind) {
  var ids = ['«' + cc.id + '» (خودِ فصل)'];
  var role = which === 'intro'
    ? 'نمودارِ «آماده‌سازی» برای آغازِ این فصل: خواننده پیش از خواندن، نقشهٔ ' +
      'راه را بگیرد.'
    : which === 'sec'
    ? 'یکی از بخش‌های این فصل واقعاً سنگین است — تمایزِ چندشاخه، فرایند، ' +
      'تقابل، چرخهٔ بازخوردی. **همان یک بخش** را انتخاب کن، شناسه‌اش را در ' +
      'فیلدِ at بگذار، و نموداری بساز که فهمِ همان بخش را باز کند. اگر ' +
      'هیچ بخشی واقعاً نمودارِ میانی نمی‌خواهد، {"kind":"هیچ","items":[]} برگردان — ' +
      'نمودارِ زوری بدتر از نبودنش است.'
    : 'نمودارِ «مرور» برای پایانِ این فصل: آنچه خواند در یک نگاه جمع شود.';
  if (avoidKind) {
    role += ' از نوعِ «' + avoidKind + '» استفاده نکن مگر محتوا واقعاً جز آن ' +
            'اجازه ندهد — این نوع در این‌جا از پیش هست و تکرارش زائد است.';
  }
  /* ── ترازِ گونه‌ها در کلِ کتاب (۶٫۷۲) ──
     avoidKind فقط داخلِ یک فصل را می‌دید؛ نتیجه در دادهٔ واقعی: از ۵۳
     نمودارِ یک جزوه ۳۸ تا فقط دو گونه بود (سلسله‌مراتب/تقابل) و روندنما ۴.
     فصل‌به‌فصل همان جفتِ راحت تکرار می‌شد چون هیچ‌کس تصویرِ کل را به مدل
     نمی‌داد. مدل همچنان پیشنهاد می‌دهد و کد تصمیم می‌گیرد — این فقط
     دیدِ کتاب‌سطحی است، نه دستور. */
  var csL = '';
  try {
    var cs = hvizCensus_(book);
    if (cs.total >= 4) {
      var seenK = [], underK = [], domK = '', domN = 0;
      for (var ck in HVIZ_KINDS) {
        if (!Object.prototype.hasOwnProperty.call(HVIZ_KINDS, ck)) continue;
        var cn = cs.by[ck] || 0;
        if (cn) seenK.push(ck + ' ' + faDigitsOut_(String(cn)));
        else if (ck !== 'کارت‌ها' && ck !== 'نقشهٔ ذهنی') underK.push(ck);
        if (cn > domN) { domN = cn; domK = ck; }
      }
      csL = 'ترازِ گونه‌ها در کلِ این جزوه تاکنون: ' + seenK.join('، ') + '.';
      if (underK.length) {
        csL += ' گونه‌های «' + underK.join('»، «') + '» هنوز هیچ‌جا نیامده‌اند — ' +
               'اگر محتوای این فصل با یکی از آن‌ها هم به‌خوبی بیان می‌شود، همان را ' +
               'انتخاب کن؛ کتابی که همهٔ نمودارهایش یک شکل است، عملاً نمودار ندارد.';
      }
      if (domK && domN / cs.total >= 0.4) {
        csL += ' «' + domK + '» همین حالا سهمِ بزرگی از کتاب دارد؛ جز در ناگزیری سراغش نرو.';
      }
    }
  } catch (eCs) {}
  var L = [
    'تو طراحِ نمودارهای یک جزوهٔ آموزشیِ فارسی هستی. برای فصلِ زیر **یک** نمودار',
    'بساز. محتوایش را از خودِ متنِ فصل دربیاور، نه از عنوان‌ها — نمودارِ تزئینی',
    'که فقط عنوان‌ها را کپی کند، بدتر از نبودن است.',
    '',
    role,
    '',
    'انواعِ مجاز برای kind — **نوع را از ساختارِ واقعیِ محتوا بگیر، نه از عادت**:',
    '«روندنما» — هرجا ترتیب و مرحله هست: استدلالِ قدم‌به‌قدم، فرایند.',
    '«چرخه» — رابطهٔ بازخوردی یا مدار که آخرش به اول برمی‌گردد.',
    '«وِن» — دو یا سه مفهوم که هم وجهِ مشترک دارند هم وجهِ اختصاصی: group نامِ',
    '  هر دایره؛ «مشترک» یعنی مشترکِ همه؛ و در سه‌دایره‌ای، دو نام با «و»',
    '  («تجربه و عقل») یعنی فقط مشترکِ همان دو — هر ناحیه دقیقاً همان‌جایی',
    '  کشیده می‌شود که گفتی. برای تعریفِ چندجزئی (باورِ صادقِ موجه)، شرطِ',
    '  لازم/کافی، و مقایسه‌ای که اشتراکش مهم است.',
    '«سلسله‌مراتب» — تقسیم‌بندی و رده‌ها؛ group نامِ هر سطح، از بالا به پایین.',
    '«تقابل» — دو (یا سه) مفهومِ روبه‌رو؛ group نامِ هر ستون. اگر وجهِ',
    '  مشترکشان هم مهم است، «وِن» را به‌جایش بردار.',
    '«نقشهٔ مفهومی» — گرهٔ اول مرکز؛ detailِ هر گرهٔ دیگر «برچسبِ رابطه» با آن',
    '  است («ابزارِ سنجشِ», «پیش‌نیازِ», «نقض می‌کندِ»…).',
    '«نقشهٔ ذهنی» — مرکز و شاخه‌ها؛ **فقط وقتی هیچ‌کدام از بالا نمی‌نشیند.**',
    '«کارت‌ها» — نکته‌های هم‌وزنِ بی‌ساختار؛ آخرین چاره.',
    csL,
    '',
    'قاعده‌های سخت:',
    '• بین ۳ تا ۸ گره. label حداکثر پنج‌شش واژه؛ detail یک جملهٔ کوتاه یا خالی.',
    '• هر گره فیلدِ to دارد: شناسهٔ بخش یا فصلی از فهرستِ پایین که آن حرف',
    '  آن‌جاست — کلیک روی گره خواننده را همان‌جا می‌برد. شناسهٔ ساختگی ممنوع.',
    '',
    '── فصل ──',
    'عنوان: ' + handoutTitleClean_(String(cc.title || '')),
    (cc.intro ? 'درآمد: ' + String(cc.intro).slice(0, 300) : '')
  ];
  for (var i = 0; i < (cc.sections || []).length; i++) {
    var sc = cc.sections[i];
    ids.push('«' + sc.id + '» (' + String(sc.title || '').slice(0, 50) + ')');
    L.push('');
    L.push('بخش ' + sc.id + ' — ' + String(sc.title || ''));
    if (sc.takeaway) L.push('چکیده: ' + String(sc.takeaway).slice(0, 200));
    L.push(String(sc.body || '').slice(0, 600));
  }
  L.push('');
  L.push('شناسه‌های مجاز برای to: ' + ids.join('، '));
  L.push('');
  L.push('خروجی فقط یک شیءِ JSON با دقیقاً همین کلیدها، بی هیچ متنِ دیگری:');
  L.push('{"kind":"نقشهٔ ذهنی","title":"…","note":"…",' +
         '"items":[{"label":"…","detail":"…","to":"' + cc.id + '","group":""}]}');
  var r = null;
  try { r = geminiText_(L.join('\n'), HVIZ_SCHEMA, 16384); }
  catch (e) {
    HVIZ_WHY_ = String(e.message || e).slice(0, 200);
    try { logLine_('نمودارِ فصلِ «' + handoutTitleClean_(String(cc.title || '')).slice(0, 50) +
                   '» از مدل نیامد: ' + HVIZ_WHY_); } catch (eL) {}
    return null;
  }
  if (!r) return null;
  // پاسخِ پوشش‌دار (عادتِ قالبِ قبلی) هم پذیرفته می‌شود
  if (!r.items && (r.intro || r.recap)) r = r.intro || r.recap;
  if (which === 'sec' && String(hvizKindOf_(r.kind) || r.kind || '').indexOf('هیچ') !== -1) {
    return 'هیچ';                       // تصمیمِ معتبر: این فصل نمودارِ میانی نمی‌خواهد
  }
  var idsOk = hvizIds_(book);
  idsOk[String(cc.id)] = 1;
  var d = hvizClean_(r, idsOk);
  if (d && which === 'sec') {
    var at = String(r.at || '').trim();
    var okSec = false;
    for (var sx = 0; sx < (cc.sections || []).length; sx++) {
      if (String(cc.sections[sx].id) === at) okSec = true;
    }
    if (!okSec) return 'هیچ';           // بخشِ ساختگی — نمودار جایی برای نشستن ندارد
    d.at = at;
  }
  if (!d) {
    var snip = '';
    try { snip = JSON.stringify(r).slice(0, 160); } catch (eSn) {}
    HVIZ_WHY_ = r && r.__repaired
      ? 'پاسخِ مدل از سقفِ توکن بریده شد و چیزِ سالمی نماند'
      : 'پاسخ آمد ولی نمودارِ معتبری نداشت — نمونهٔ پاسخ: ' + snip;
    try { logLine_('نمودارِ فصلِ «' + handoutTitleClean_(String(cc.title || '')).slice(0, 50) +
                   '»: ' + HVIZ_WHY_); } catch (eL2) {}
    return null;
  }
  return d;
}

/** سرشماریِ گونه‌ها در کلِ کتاب — ورودیِ تنوع، هم برای پرامپت هم برای بازتنوع. */
function hvizCensus_(book) {
  var by = Object.create(null), total = 0;
  var add = function (d) {
    if (d && d.kind) { by[d.kind] = (by[d.kind] || 0) + 1; total++; }
  };
  for (var c = 0; c < (book.chapters || []).length; c++) {
    var v = book.chapters[c].viz || {};
    add(v.intro); add(v.recap);
    for (var s = 0; s < (v.secs || []).length; s++) add(v.secs[s]);
  }
  return { by: by, total: total };
}

/**
 * بازتنوع (۶٫۷۲) — فقط جایی که یکنواختی واقعاً هست، و خودمحدودشونده.
 *
 * چرا نه «همه از نو» (پیشوندِ امضا): بیشترِ نمودارها محتواشان درست است؛
 * مشکل فقط یک‌شکلی است. بازساختنِ همه یعنی صدها فراخوانِ مدل برای چیزی که
 * خراب نیست. پس فقط وقتی گونهٔ چیره از HANDOUT_VIZ_DIV_SHARE بیشتر شد،
 * چندتا از همان نمودارهای گونهٔ چیره از نو پرسیده می‌شوند — با ترازِ کتاب
 * در پرامپت و همان گونه در avoid. جوابِ هم‌گونه پذیرفته نمی‌شود و نمودارِ
 * قبلی سرِ جایش می‌مانَد: تنوع هرگز نمودارِ سالم را با هیچ عوض نمی‌کند.
 * سهم که زیرِ آستانه رفت، دروازه خودش بسته می‌شود؛ هر فصل هم بیش از
 * HANDOUT_VIZ_DIV_TRY بار برای تنوع پرسیده نمی‌شود — مدلی که اصرار دارد،
 * شاید حق دارد.
 */
function hvizDiversify_(book, maxCalls) {
  var out = { calls: 0, redone: 0, dominant: '', share: 0 };
  if (CFG.HANDOUT_VIZ_ENABLED === false) return out;
  var cap = Math.max(0, Number(maxCalls) || 0);
  if (!cap) return out;
  var cs = hvizCensus_(book);
  if (cs.total < (Number(CFG.HANDOUT_VIZ_DIV_MIN) || 6)) return out;
  var domK = '', domN = 0;
  for (var k in cs.by) if (cs.by[k] > domN) { domN = cs.by[k]; domK = k; }
  out.dominant = domK; out.share = cs.total ? domN / cs.total : 0;
  if (out.share < (Number(CFG.HANDOUT_VIZ_DIV_SHARE) || 0.5)) return out;
  var tryMax = Number(CFG.HANDOUT_VIZ_DIV_TRY) || 2;

  /* نامزدها: فصل‌هایی که جایگاهِ آغاز یا مرورشان گونهٔ چیره است؛ اول
     فصل‌هایی که هر دو جایگاهشان چیره است — زائدترین‌ها. */
  var cands = [];
  for (var c2 = 0; c2 < (book.chapters || []).length; c2++) {
    var cc = book.chapters[c2], v2 = cc.viz || {};
    if (Number((v2.divTried || {}).n || 0) >= tryMax) continue;
    var nDom = 0;
    if (v2.intro && v2.intro.kind === domK) nDom++;
    if (v2.recap && v2.recap.kind === domK) nDom++;
    if (nDom) cands.push({ cc: cc, v: v2, nDom: nDom });
  }
  cands.sort(function (a, b) { return b.nDom - a.nDom; });

  for (var i = 0; i < cands.length && out.calls < cap; i++) {
    var cd = cands[i];
    var slot = (cd.v.recap && cd.v.recap.kind === domK) ? 'recap' : 'intro';
    out.calls++;
    var d = hvizModelOne_(book, cd.cc, slot, domK);
    var kindNew = (d && d !== 'هیچ') ? String(d.kind || '') : '';
    if (kindNew && kindNew !== domK) {
      cd.v[slot] = d;
      delete cd.v.divTried;
      cd.cc.viz = cd.v;
      out.redone++;
    } else {
      // جوابِ هم‌گونه یا هیچ: نمودارِ قبلی می‌مانَد؛ فقط شمارِ تلاش بالا می‌رود.
      cd.v.divTried = { n: Number((cd.v.divTried || {}).n || 0) + 1, at: nowStr_() };
      cd.cc.viz = cd.v;
    }
  }
  return out;
}

/**
 * پرکردنِ نمودارهای کتاب — تا سقفِ maxCalls فراخوان در این نوبت.
 * فصلِ دارای نمودارِ هم‌امضا رد می‌شود (مجانی)؛ فصلِ تغییرکرده از نو ساخته
 * می‌شود؛ و شکست با همان قاعدهٔ HANDOUT_TRY_MAX رها می‌شود تا مدلِ خواب،
 * هر شب بودجه نسوزاند — امضای تازه، سابقهٔ تلاش را صفر می‌کند.
 */
function handoutVizFill_(book, maxCalls) {
  var out = { calls: 0, made: 0, pending: 0, gaveUp: 0, triedChanged: 0, why: '' };
  HVIZ_WHY_ = '';
  if (CFG.HANDOUT_VIZ_ENABLED === false) return out;
  var cap = Math.max(0, Number(maxCalls) || 0);
  /* ══ مکان‌نمای فصل — وگرنه فصلِ اول همهٔ سهم را می‌خورَد (۶٫۹۰) ══
   *
   * این حلقه همیشه از فصلِ صفر شروع می‌کرد و سقفش دو فراخوان است. یعنی تا
   * وقتی فصلِ اول کامل نشده، هیچ فراخوانی به فصلِ دوم نمی‌رسد — و کامل‌شدن
   * یعنی intro و recap و میان‌بخشی، که با دو فراخوان در هر درس بارها طول
   * می‌کشد. جزوهٔ «Audi (2011)» امروز دقیقاً همین را نشان داد:
   *
   *     فصل ۱ → ۳ نمودار · فصل ۲ → ۱ · فصل ۳ و ۴ و ۵ → **صفر**
   *
   * سه فصلِ آخر ساختارا دست‌نیافتنی بودند، نه «هنوز نوبتشان نشده». همان
   * شکلی که امروز دو بار دیگر هم دیدیم (داوریِ ارجاع‌ها، و کارِ شبانه):
   * کاری که سرِ فهرست است بودجه را می‌خورَد و دُم هرگز اجرا نمی‌شود.
   *
   * مکان‌نما در خودِ کتاب می‌نشیند، پس با `_HANDOUT.json` ذخیره می‌شود و
   * هر اجرا از جایی ادامه می‌دهد که اجرای پیش رسید. */
  var chs = book.chapters || [];
  var nCh = chs.length;
  var start = Number(book.vizCur) || 0;
  if (!(start >= 0 && start < nCh)) start = 0;
  var lastTouched = -1;
  for (var k = 0; k < nCh; k++) {
    var c = (start + k) % nCh;
    var cc = chs[c];
    var sig = hvizSig_(cc);
    var v = (cc.viz && cc.viz.sig === sig) ? cc.viz : null;
    if (v && v.intro && v.recap && v.secDone) continue;
    var tried = cc.vizTried || {};
    if (String(tried.sig) === sig && Number(tried.n || 0) >= (Number(CFG.HANDOUT_TRY_MAX) || 4)) {
      out.gaveUp++; continue;
    }
    if (out.calls >= cap) { out.pending++; continue; }
    if (!v) v = { sig: sig, at: nowStr_(), intro: null, recap: null, secs: [] };
    var madeHere = false, failedHere = false;
    if (!v.intro && out.calls < cap) {
      out.calls++;
      var d1 = hvizModelOne_(book, cc, 'intro');
      if (d1) { v.intro = d1; madeHere = true; } else failedHere = true;
    }
    /* وقتی همین حالا intro شکست خورد، بقیه را در همین دور نمی‌سوزانیم —
       مدلِ خواب چند برابر بودجه نخورد. دورِ بعد از همان‌جا ادامه می‌دهد. */
    if (!v.recap && !failedHere && out.calls < cap) {
      out.calls++;
      var d2 = hvizModelOne_(book, cc, 'recap',
                             v.intro ? String(v.intro.kind || '') : '');
      if (d2) { v.recap = d2; madeHere = true; } else failedHere = true;
    }
    /* میان‌بخشی: یک فراخوان، و «هیچ» هم جوابِ معتبر است — فصلِ ساده
       نمودارِ زوری نمی‌گیرد و دیگر هم پرسیده نمی‌شود. فقط فصلِ چندبخشی. */
    if (!v.secDone && !failedHere && out.calls < cap &&
        (cc.sections || []).length >= 2) {
      out.calls++;
      // گونه‌های همین فصل تا اینجا — نمودارِ میانی نباید سومینِ همان شکل باشد.
      var avSec = [];
      if (v.intro && v.intro.kind) avSec.push(v.intro.kind);
      if (v.recap && v.recap.kind && avSec.indexOf(v.recap.kind) === -1) avSec.push(v.recap.kind);
      var d3 = hvizModelOne_(book, cc, 'sec', avSec.join('» و «'));
      if (d3 === 'هیچ') { v.secDone = true; madeHere = true; }
      else if (d3) { v.secs = [d3]; v.secDone = true; madeHere = true; }
      else failedHere = true;
    } else if ((cc.sections || []).length < 2 && !v.secDone) {
      v.secDone = true;
    }
    if (madeHere || failedHere) lastTouched = c;
    if (madeHere) {
      cc.viz = v;
      delete cc.vizTried;
      out.made++;
    }
    if (failedHere) {
      cc.vizTried = { sig: sig, n: Number(tried.sig === sig ? tried.n || 0 : 0) + 1, at: nowStr_() };
      out.triedChanged++;
      out.pending++;
      if (!out.why && HVIZ_WHY_) out.why = HVIZ_WHY_;
    } else if (!v.intro || !v.recap || !v.secDone) {
      out.pending++;                       // بودجه ته کشید، نه شکست
    }
  }
  /* نوبتِ بعدی از فصلِ بعد از آخرین فصلی که سهمی گرفت. اگر هیچ فراخوانی
     انجام نشد، مکان‌نما دست نمی‌خورَد — چرخاندنِ بی‌کار یعنی از دست‌دادنِ
     جایی که واقعاً کار مانده. */
  if (nCh && lastTouched >= 0) book.vizCur = (lastTouched + 1) % nCh;
  try { hvizCoverNote_(book); } catch (eCv) {}
  return out;
}

/**
 * پوشش را ثبت کن: این کتاب چند فصل از چند، نمودار دارد.
 *
 * ══ چرا این عدد نبود و باید می‌بود (۶٫۹۰) ══
 * سطرِ روزانه فقط کارِ **جارو** را گزارش می‌کرد — چند فصل پر شد، چند در
 * نوبت، مکان‌نما کجاست. هیچ‌کدام به سؤالی که صاحبِ برنامه واقعاً می‌پرسد
 * جواب نمی‌دهند: «جزوه‌ام نمودار دارد یا نه؟» او خودش باز کرد و دید سه
 * فصلِ آخر خالی‌اند، در حالی که همان روز گزارش دربارهٔ نمودارها چیزی جز
 * یک جملهٔ خنثی نگفته بود.
 *
 * جای ثبتش همین‌جاست چون این تابع تنها جایی است که کتاب را در دست دارد،
 * و هر دو مسیر — درسِ تازه و جاروی شبانه — از آن می‌گذرند.
 */
function hvizCoverNote_(book) {
  var chs = book.chapters || [], done = 0;
  for (var i = 0; i < chs.length; i++) {
    var v = chs[i].viz;
    if (v && v.intro && v.recap && v.secDone) done++;
  }
  var m = {};
  try { m = JSON.parse(props_().getProperty(PK.HVIZ_COVER) || '{}') || {}; } catch (e) {}
  m[String(book.seriesKey || book.seriesName || '?')] =
    { n: chs.length, d: done, at: nowStr_() };
  // فهرست را کران‌دار نگه دار: قدیمی‌ترین‌ها می‌روند.
  var keys = [];
  for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) keys.push(k);
  if (keys.length > 60) {
    keys.sort(function (a, b) { return String(m[a].at).localeCompare(String(m[b].at)); });
    for (var d0 = 0; d0 < keys.length - 60; d0++) delete m[keys[d0]];
  }
  try { props_().setProperty(PK.HVIZ_COVER, JSON.stringify(m)); } catch (e2) {}
}

/** پوششِ نمودار روی همهٔ کتاب‌هایی که دیده شده‌اند. */
function hvizCover_() {
  var out = { series: 0, chapters: 0, done: 0, worst: '', worstPct: 101 };
  var m = {};
  try { m = JSON.parse(props_().getProperty(PK.HVIZ_COVER) || '{}') || {}; } catch (e) { return out; }
  for (var k in m) if (Object.prototype.hasOwnProperty.call(m, k)) {
    var r = m[k] || {}, nn = Number(r.n) || 0, dd = Number(r.d) || 0;
    if (!nn) continue;
    out.series++; out.chapters += nn; out.done += dd;
    var pc = Math.round(dd * 100 / nn);
    if (pc < out.worstPct) { out.worstPct = pc; out.worst = k; }
  }
  if (out.worstPct > 100) out.worstPct = 0;
  return out;
}


/**
 * جبرانِ گذشته — «برای درس‌های قبلی هم حتماً باید انجام بشه». جاروی شبانه
 * با مکان‌نما روی رجیستری (همان الگوی handoutBackfill_)، سقف روی فراخوانِ
 * مدل — تنها کارِ گران — و نوشتن فقط وقتی چیزی ساخته شد.
 */
function handoutVizSweep_(maxCalls, budgetMs) {
  var out = { walked: 0, calls: 0, made: 0, series: 0, pending: 0, wrapped: false };
  if (CFG.HANDOUT_ENABLED === false || CFG.HANDOUT_VIZ_ENABLED === false) return out;
  var cap = Math.max(1, Number(maxCalls) || Number(CFG.HANDOUT_VIZ_SWEEP) || 6);
  var t0 = new Date().getTime();
  var budget = Math.max(30000, Number(budgetMs) || 120000);
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  if (!reg.rows.length) return out;
  var cur = 0;
  try { cur = Number(props_().getProperty(PK.HVIZ_CUR) || 0) || 0; } catch (e) {}
  if (cur >= reg.rows.length) { cur = 0; out.wrapped = true; }
  var partsAll = null;
  try { partsAll = readSeriesParts_(hub); } catch (ePt) {}
  var i = cur;
  while (out.calls < cap && i < reg.rows.length) {
    if (new Date().getTime() - t0 > budget) break;
    var rec = reg.rows[i]; i++;
    var fid = String(rec.vals[SC.FOLDER - 1] || '');
    if (!fid) continue;
    var sf = null;
    try { sf = DriveApp.getFolderById(fid); } catch (eF) { continue; }
    var it = sf.getFilesByName(handoutJsonName_());
    if (!it.hasNext()) continue;              // هنوز جزوه‌ای ندارد؛ کارِ backfillِ خودِ جزوه است
    out.walked++;
    var book = handoutRead_(sf, null);
    /* واقعیت‌های رجیستری همین‌جا تازه می‌شوند — جارو تنها مسیری است که هر
       مجموعه، تمام‌شده یا نه، هر چند شب یک بار از زیرِ دستش رد می‌شود. */
    var fx = false;
    try { fx = handoutFacts_(book, rec, sf); } catch (eFx) {}
    var r = handoutVizFill_(book, cap - out.calls);
    out.calls += r.calls; out.pending += r.pending;
    out.gaveUp = (out.gaveUp || 0) + (r.gaveUp || 0);
    /* بازتنوع، با ته‌ماندهٔ بودجه — کتابِ کامل ولی یک‌شکل، از همین‌جا کم‌کم
       رنگارنگ می‌شود؛ دو فراخوان در هر مجموعه، و فقط تا وقتی چیرگی هست. */
    var dv = { calls: 0, redone: 0 };
    if (out.calls < cap && !r.pending) {
      try { dv = hvizDiversify_(book, Math.min(2, cap - out.calls)); } catch (eDv) {}
      out.calls += dv.calls;
      out.redone = (out.redone || 0) + dv.redone;
    }
    /* ══ شمارشِ تلاش باید بنویسد، حتی وقتی چیزی ساخته نشد (۶٫۵۸) ══
       نسخهٔ اول فقط هنگامِ ساخت می‌نوشت — پس شبِ بعد کتاب با سابقهٔ صفر
       خوانده می‌شد و «رهاکردن پس از N تلاش» عملاً هرگز رخ نمی‌داد: همان
       بودجه‌سوزیِ بی‌پایانی که قرار بود جلویش گرفته شود، فقط پنهان‌تر.
       آزمونِ ۶٫۶ همین را گرفت. رندر همچنان فقط هنگامِ ساخت — فایلِ جزوه
       نباید برای یک شمارندهٔ درونی از نو مُهرِ تاریخ بخورد. */
    /* همان‌جا نقشهٔ راه هم با پیشرفتِ واقعی تازه می‌شود — جزوهٔ مجموعهٔ
       تمام‌شده هیچ مسیرِ دیگری به به‌روزرسانی ندارد (درسِ تازه‌ای نمی‌آید). */
    var rmWas2 = '';
    try { rmWas2 = handoutRoadmapSig_(book); } catch (eR1) {}
    var rmCh2 = false;
    try {
      handoutRoadmapState_(book, handoutProgressOf_(hub, String(rec.key), partsAll));
      rmCh2 = handoutRoadmapSig_(book) !== rmWas2;
    } catch (eR2) {}
    if (r.made || r.triedChanged || rmCh2 || fx || dv.redone || dv.calls) {
      if (r.made || dv.redone) {
        out.made += r.made; out.series++; book.updatedAt = nowStr_();
      }
      try {
        handoutWrite_(sf, book);
        if (r.made || rmCh2 || fx || dv.redone) handoutRender_(sf, book);
      } catch (eW) {
        logLine_('نوشتنِ نمودارهای «' + (book.seriesName || rec.key) + '» ناموفق: ' + eW.message);
      }
    }
  }
  try { props_().setProperty(PK.HVIZ_CUR, String(i >= reg.rows.length ? 0 : i)); } catch (e2) {}
  if (i >= reg.rows.length) out.wrapped = true;
  /* تاریخچه، نه فقط عکسِ آخرین دور: سؤالی که وقتی چیزی می‌ایستد می‌پرسی
     «از کِی؟» است، و عکسِ تکی جوابش را ندارد — همان درسِ تبِ «کاربردِ
     جزوه»، این‌جا ارزان‌تر: ده دورِ آخر در همان Property. */
  try {
    var hist = [];
    try { hist = JSON.parse(props_().getProperty(PK.HVIZ_LAST) || '[]'); } catch (eH) { hist = []; }
    if (!(hist instanceof Array)) hist = [];
    hist.push({ at: nowStr_(), made: out.made, series: out.series,
                pending: out.pending, gaveUp: out.gaveUp || 0,
                redone: out.redone || 0,
                wrapped: out.wrapped, cur: i, total: reg.rows.length });
    while (hist.length > 10) hist.shift();
    props_().setProperty(PK.HVIZ_LAST, JSON.stringify(hist));
  } catch (e3) {}
  /* ══ گیرکردن، یافته می‌شود نه فقط سطرِ ایمیل (۶٫۵۸) ══
     سه دورِ پیاپی «در نوبت هست ولی هیچ‌چیز ساخته نشد» یعنی جارو یا مدل
     واقعاً ایستاده — یک شب می‌تواند قطعیِ مدل باشد و چیزی نمی‌گوییم
     (هشداری که برای یک شبِ بد بیاید، همان هشداری است که خوانده نمی‌شود).
     سطرِ سلامت فردا جایگزین می‌شود؛ یافته در صفِ NEEDS_CODE می‌مانَد تا
     نسخه‌ای ببنددش — همان مسیرِ handout-stuck. */
  try {
    if (out.pending > 0 && out.made === 0) {
      var bad = (Number(props_().getProperty(PK.HVIZ_BAD)) || 0) + 1;
      props_().setProperty(PK.HVIZ_BAD, String(bad));
      if (bad >= 3) {
        logSelfFinding_(hub, {
          priority: 'جدی', category: 'جزوه', key: 'handout-viz-stuck',
          title: 'نمودارهای جزوه ' + bad + ' دورِ پیاپی هیچ فصلی نساخته',
          detail: out.pending + ' فصل در نوبت است و دورِ آخر هیچ‌کدام پر نشد. ' +
                  'یا مدل چند شب در دسترس نیست، یا بودجهٔ جارو همیشه ته می‌کشد.',
          instruction: 'PK.HVIZ_LAST (ده دورِ آخر) را ببین: اگر calls صفر است بودجه/ترتیبِ ' +
                       'شبانه را بررسی کن؛ اگر calls هست و made صفر، hvizModel_ و پاسخ‌های مدل را.',
          owner: 'کد'
        });
      }
    } else {
      props_().deleteProperty(PK.HVIZ_BAD);
    }
  } catch (eSt) {}
  if (out.made) {
    logLine_('نمودارهای جزوه: ' + out.made + ' فصل در ' + out.series + ' مجموعه پر شد' +
             (out.pending ? '، ' + out.pending + ' در نوبت' : '') +
             (out.gaveUp ? '، ' + out.gaveUp + ' رهاشده' : '') + '.');
  }
  return out;
}

/** سطرِ روزانه — قاعدهٔ ۵٫۹۰: حتی وقتی همه‌چیز آرام است. */
function hvizStatus_() {
  var out = { line: '', at: '', made: 0, pending: 0, gaveUp: 0, ok: true, bad: 0,
              cover: null };
  try {
    var cov = hvizCover_();
    var faC = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
    var covTxt = cov.series
      ? (' · پوشش: ' + faC(cov.done) + ' از ' + faC(cov.chapters) + ' فصل در ' +
         faC(cov.series) + ' مجموعه نمودار دارد' +
         (cov.worst && cov.worstPct < 100
           ? ' (کم‌ترین: «' + auditCut_(String(cov.worst), 28) + '» ' + faC(cov.worstPct) + '٪)' : ''))
      : '';
    out.cover = cov;
    var hist = JSON.parse(props_().getProperty(PK.HVIZ_LAST) || '[]');
    if (!(hist instanceof Array) || !hist.length) {
      /* ══ «هرگز اجرا نشده» یادداشت نیست، ایراد است (۶٫۹۰) ══
         این جمله روزها در گزارش نشست و ناظر هم کنارش نوشت «اطلاعاتی، ایراد
         نیست». قابلیتی که از روزِ نصبش یک بار هم اجرا نشده، تعریفِ ایراد
         است — و سکوتِ آن گران‌تر از هر هشدارِ اضافه‌ای است. */
      /* ولی نه روی نصبِ تازه: وقتی هنوز هیچ کتابی دیده نشده، «اجرا نشده»
         خبر نیست. هشدار وقتی معنا دارد که جزوه دارد کار می‌کند — یعنی
         فصل‌هایی هست — و با این حال دورِ نمودار یک بار هم نرسیده. */
      if (cov.chapters >= (Number(CFG.HANDOUT_VIZ_COVER_MIN_CH) || 8)) {
        out.ok = false;
        out.line = 'نمودارهای جزوه: **هیچ دوری تا امروز اجرا نشده** — کارِ شبانه‌اش ' +
                   'هرگز نوبت نگرفته است.' + covTxt;
      } else {
        out.line = 'نمودارهای جزوه: هنوز دوری اجرا نشده.' + covTxt;
      }
      return out;
    }
    var j = hist[hist.length - 1];
    var fa = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
    out.at = String(j.at || ''); out.made = Number(j.made) || 0;
    out.pending = Number(j.pending) || 0; out.gaveUp = Number(j.gaveUp) || 0;
    out.bad = Number(props_().getProperty(PK.HVIZ_BAD)) || 0;
    var madeAll = 0;
    for (var h = 0; h < hist.length; h++) madeAll += Number(hist[h].made) || 0;
    out.line = 'نمودارهای جزوه: دورِ آخر ' + fa(out.made) + ' فصل پر شد' +
               (out.pending ? '، ' + fa(out.pending) + ' در نوبت' : '، چیزی در نوبت نیست') +
               (out.gaveUp ? '، ' + fa(out.gaveUp) + ' رهاشده (دکمهٔ جزوهٔ همان مجموعه بازش می‌کند)' : '') +
               ' · ' + fa(hist.length) + ' دورِ اخیر روی هم ' + fa(madeAll) + ' فصل' +
               ' · مکان‌نما ' + fa(j.cur || 0) + ' از ' + fa(j.total || 0) + '.' + covTxt;
    /* و پوششِ پایین خودش ایراد است، حتی وقتی جارو مرتب کار می‌کند: عددِ
       «دورِ آخر ۲ فصل پر شد» می‌تواند سال‌ها درست باشد و جزوه همچنان
       نیمه‌خالی بمانَد. سؤالِ صاحبِ برنامه این است، نه آن. */
    /* کفِ نمونه، وگرنه همان هشدارِ بی‌جاست که آدم یاد می‌گیرد نادیده بگیرد:
       روی دو فصلِ تازه‌دیده، «۰٪» چیزی نمی‌گوید. */
    if (cov.chapters >= (Number(CFG.HANDOUT_VIZ_COVER_MIN_CH) || 8) &&
        cov.done * 100 / cov.chapters < (Number(CFG.HANDOUT_VIZ_COVER_MIN) || 60)) {
      out.ok = false;
      out.line += ' ⚠ پوششِ نمودار کمتر از حدِ انتظار است.';
    }
    /* سه دورِ پیاپیِ بی‌ساخت با نوبتِ پر → سطر به «ایرادها» می‌رود، و یافته
       جداگانه در صف است. یک دورِ بد چیزی نمی‌گوید. */
    if (out.bad >= 3) {
      out.ok = false;
      out.line += ' ⚠ ' + fa(out.bad) + ' دورِ پیاپی هیچ فصلی ساخته نشده — یافتهٔ handout-viz-stuck در صف است.';
    }
  } catch (e) {}
  return out;
}

/** تاریخچهٔ جزوه برای وضعیت و ناظر — آخرین ردیف‌ها. */
function handoutHistory_(hub, n) {
  var out = [];
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.HANDOUT_TAB || 'کاربردِ جزوه');
    if (!sh || sh.getLastRow() < 2) return out;
    var take = Math.min(Number(n) || 8, sh.getLastRow() - 1);
    var v = sh.getRange(sh.getLastRow() - take + 1, 1, take, HANDOUT_HEADERS.length).getValues();
    for (var i = v.length - 1; i >= 0; i--) {
      out.push({ at: String(v[i][HU.AT - 1]), series: String(v[i][HU.SERIES - 1]),
                 ep: String(v[i][HU.EP - 1]), newCh: String(v[i][HU.NEWCH - 1]),
                 newSec: String(v[i][HU.NEWSEC - 1]), amend: String(v[i][HU.AMEND - 1]),
                 totCh: String(v[i][HU.TOTCH - 1]), url: String(v[i][HU.LINK - 1] || ''),
                 result: String(v[i][HU.RESULT - 1]) });
    }
  } catch (e) {}
  return out;
}

/* ───────────────────────────── بدهی و پرداختش ───────────────────────────── */

function handoutDueList_() {
  try { return JSON.parse(props_().getProperty(PK.HANDOUT_DUE) || '[]') || []; }
  catch (e) { return []; }
}

/* ══ بریدنِ صف، از کدام سر؟ (باگِ ۵٫۸۶) ══
   `slice(-40)` **آخرین** چهل تا را نگه می‌داشت. صف به‌ترتیبِ صعودیِ درس پر
   می‌شود، پس واردکردنِ گذشتهٔ یک مجموعهٔ شصت‌درسی، درس‌های ۱ تا ۲۰ را بی‌صدا
   می‌انداخت و جزوه از درسِ ۲۱ شروع می‌شد — دقیقاً همان «به‌هم‌ریختگی» که
   نباید پیش بیاید، و بی هیچ خطایی.

   حالا از **ته** بریده می‌شود (قدیمی‌ترها می‌مانند، چون کتاب از فصلِ اول
   نوشته می‌شود) و اندازه با خودِ رشته سنجیده می‌شود، نه با یک عددِ حدسی:
   هر خاصیتِ Apps Script سقفِ ۹ کیلوبایتی دارد و شمردنِ رکورد این را تضمین
   نمی‌کند. و آنچه بریده شد نوشته می‌شود؛ کاوشِ شبانه دوباره پیدایشان می‌کند. */
function handoutDueSave_(list) {
  var arr = (list || []).slice(0);
  var cut = 0;
  var body = JSON.stringify(arr);
  while (body.length > 8000 && arr.length > 1) { arr.pop(); cut++; body = JSON.stringify(arr); }
  try { props_().setProperty(PK.HANDOUT_DUE, body); } catch (e) { return 0; }
  if (cut) {
    logLine_('صفِ جزوه پر بود؛ ' + cut + ' درسِ تازه‌تر فعلاً نگه داشته نشد — ' +
             'کاوشِ شبانه دوباره به صف می‌آوردشان.');
  }
  return arr.length;
}

/**
 * افزودنِ چند بدهی با **یک** خواندن و **یک** نوشتن.
 *
 * `handoutDueAdd_` برای پایانِ یک قسمت درست است (یک مورد)، ولی واردکردنِ
 * گذشته ده‌ها مورد دارد و فراخوانِ تک‌تکش یعنی ده‌ها خواندن/نوشتنِ خاصیت —
 * همان‌جایی که اجرا بی‌صدا کند می‌شود.
 *
 * @return {number} چند تا واقعاً تازه بودند
 */
function handoutDueAddMany_(pairs) {
  var list = handoutDueList_();
  var have = Object.create(null);
  for (var i = 0; i < list.length; i++) have[list[i].key + '#' + list[i].ep] = 1;
  var added = 0, now = nowStr_();
  for (var p = 0; p < (pairs || []).length; p++) {
    var k = String(pairs[p].key || ''), n = String(pairs[p].ep || '');
    if (!k || !n || have[k + '#' + n]) continue;
    have[k + '#' + n] = 1;
    list.push({ key: k, ep: n, at: now });
    added++;
  }
  // ترتیبِ صعودی درونِ هر مجموعه، پیش از هر بریدنی — تا اگر بریده شد،
  // چیزی که می‌مانَد ابتدای کتاب باشد نه وسطش.
  list.sort(function (a, b) {
    if (a.key !== b.key) return a.key < b.key ? -1 : 1;
    return (Number(a.ep) || 0) - (Number(b.ep) || 0);
  });
  if (added) handoutDueSave_(list);
  return added;
}

/** ثبتِ بدهی در پایانِ هر قسمت. ارزان، بی‌شبکه، و هرگز شکست نمی‌خورد. */
function handoutDueAdd_(seriesKey, epNum) {
  return handoutDueAddMany_([{ key: seriesKey, ep: epNum }]);
}

/**
 * پرداختِ بدهی — از پوشه و فایلِ وضعیتِ خودِ همان قسمت.
 *
 * چرا از `_special.json` و نه از حافظه: بدهی می‌تواند شب‌ها بعد پرداخت شود،
 * و تا آن موقع هیچ متنی در حافظهٔ اجرا نیست. فایلِ وضعیتِ قسمت همان جایی
 * است که متنِ نهایی — با غنی‌سازی و منابعش — نشسته.
 *
 * ══ دو ترتیب که هر دو لازم‌اند ══
 * ۱) **به‌ترتیبِ شمارهٔ درس.** جزوه یک کتاب است: فصلِ درسِ ۵ باید پیش از
 *    فصلِ درسِ ۶ نوشته شود، وگرنه ترتیبِ فصل‌ها به‌هم می‌ریزد و بدتر،
 *    `amend` نمی‌تواند به درسی که هنوز ننوشته‌ایم ارجاع بدهد. برای
 *    به‌روزرسانیِ روزانه بی‌اثر است و برای واردکردنِ گذشته حیاتی.
 * ۲) **گروه‌بندی بر اساسِ مجموعه.** هر مجموعه یک بار پیمایش می‌شود، نه یک
 *    بار به‌ازای هر درس.
 */
function handoutRunDue_(maxItems, budgetMs) {
  var res = { tried: 0, done: 0, left: 0, notes: [], ranOut: false };
  if (CFG.HANDOUT_ENABLED === false) return res;
  var list = handoutDueList_();
  if (!list.length) return res;
  var cap = Math.max(1, Number(maxItems) || Number(CFG.HANDOUT_MAX_PER_RUN) || 2);
  /* ── سقفِ زمان، نه فقط سقفِ شمارش (۵٫۸۹) ──
   * کارِ شبانه و پایانِ قسمت باید محافظه‌کار باشند: آن‌ها مهمان‌اند و
   * کارِ اصلی جای دیگری است. ولی وقتی آدم دکمه را می‌زند، کارِ اصلی
   * همین است و شش دقیقهٔ کامل در اختیار است. سقفِ ثابتِ دو تا یعنی
   * صاحبِ برنامه برای پانزده درسِ عقب‌مانده هشت بار دکمه بزند — همان
   * کارِ دستی‌ای که قرار بود نباشد. */
  var t0 = new Date().getTime();
  /* صفر یا نامعتبر = بی‌کران (سقفِ شمارش تصمیم می‌گیرد). عددِ منفی یعنی
     «وقت از همان اول تمام است» — حالتِ واقعیِ `deadline - now` وقتی اجرا
     دیر رسیده باشد، و همان چیزی که ضمانتِ «دستِ‌کم یکی» را آزمودنی می‌کند. */
  var budget = Number(budgetMs);
  if (!isFinite(budget)) budget = 0;
  /* دستِ‌کم یکی همیشه ساخته می‌شود، هر قدر هم وقت کم باشد — همان قاعده‌ای
     که `synthesizeStep_` دارد. بی آن، اجرایی که با وقتِ تمام‌شده شروع شود
     بی هیچ پیشرفتی برمی‌گردد و صف تا ابد سرِ جایش می‌مانَد. */
  var timeLeft = function () {
    if (!budget) return true;
    if (res.tried === 0) return true;
    return (new Date().getTime() - t0) < budget;
  };
  var hub = getHub_();
  var reg = readSeriesReg_(hub);

  // گروه‌بندی، و درونِ هر گروه به‌ترتیبِ عددیِ درس
  var groups = Object.create(null), order = [];
  for (var g = 0; g < list.length; g++) {
    var k = String(list[g].key);
    if (!groups[k]) { groups[k] = []; order.push(k); }
    groups[k].push(list[g]);
  }
  for (var o = 0; o < order.length; o++) {
    groups[order[o]].sort(function (a, b) { return (Number(a.ep) || 0) - (Number(b.ep) || 0); });
  }

  var keep = [];
  for (var q = 0; q < order.length; q++) {
    var key = order[q], items = groups[key];
    var rec = reg.byKey[key] || null;
    if (!rec) {
      res.notes.push('مجموعهٔ «' + key + '» در رجیستری نیست');
      continue;                                  // بدهیِ بی‌صاحب نگه داشته نمی‌شود
    }
    var sf = null, eps = null;
    try { sf = seriesFolder_(reg, rec); eps = handoutSeriesEpisodes_(sf); }
    catch (eF) { res.notes.push('پوشهٔ «' + key + '» باز نشد: ' + eF.message);
                 keep = keep.concat(items); continue; }

    for (var i = 0; i < items.length; i++) {
      if (res.tried >= cap || !timeLeft()) {
        if (!timeLeft()) res.ranOut = true;
        keep.push(items[i]); continue;
      }
      res.tried++;
      var item = items[i];
      try {
        var meta = eps[String(item.ep)];
        if (!meta) { res.notes.push('فایلِ وضعیتِ درسِ ' + item.ep + ' پیدا نشد'); continue; }
        // ردیفی که پیش از رسیدن به سقفِ تلاش در صف مانده بود
        if (handoutGaveUp_(handoutRead_(sf, null), item.ep)) {
          res.notes.push('درسِ ' + item.ep + ': رهاشده (سقفِ تلاش)'); continue;
        }
        meta.seriesKey = key;
        meta.seriesName = meta.seriesName || String(rec.vals[SC.NAME - 1] || '');
        meta.level = meta.level || String(rec.vals[SC.LEVEL - 1] || '');
        meta.progress = handoutProgressOf_(hub, key);
        if (!meta.progress.total) {
          meta.progress.total = Number(rec.vals[SC.CHUNKS - 1]) || 0;
        }
        // شمارِ واقعیِ قسمت‌ها — همین‌جا از پیمایشِ پوشه در دست است
        var madeN = 0;
        for (var mk2 in eps) if (Object.prototype.hasOwnProperty.call(eps, mk2)) madeN++;
        meta.producedCount = madeN;
        var u = handoutUpdate_(sf, meta, hub, rec);
        if (u.ok) {
          res.done++;
          try {
            if (SC.HANDOUT && reg.sheet) reg.sheet.getRange(rec.row, SC.HANDOUT).setValue(u.url);
          } catch (eW) {}
        } else {
          res.notes.push('درسِ ' + item.ep + ': ' + u.why);
          // «قبلاً هست» و «متنی ندارد» بدهی نیستند؛ نگه‌داشتنشان یعنی هر شب
          // دوباره تلاش و هر شب دوباره شکست.
          if (u.why && u.why.indexOf('قبلاً') === -1 && u.why.indexOf('متنی') === -1 &&
              u.why !== 'خاموش') keep.push(item);
        }
      } catch (e) {
        res.notes.push('درسِ ' + item.ep + ': ' + e.message);
        keep.push(item);
      }
    }
  }
  res.left = keep.length;
  handoutDueSave_(keep);
  return res;
}

/** آیا این درس آن‌قدر تلاش شده که دیگر تلاش بی‌فایده است؟ */
function handoutGaveUp_(book, epNum) {
  var t = book && book.tried && book.tried[String(epNum)];
  if (!t) return false;
  return Number(t.n || 0) >= Math.max(1, Number(CFG.HANDOUT_TRY_MAX) || 4);
}

/** درس‌های رهاشدهٔ یک کتاب، با علتشان. */
function handoutAbandoned_(book) {
  var out = [];
  var t = (book && book.tried) || {};
  for (var k in t) {
    if (!Object.prototype.hasOwnProperty.call(t, k)) continue;
    if (Number(t[k].n || 0) < Math.max(1, Number(CFG.HANDOUT_TRY_MAX) || 4)) continue;
    out.push({ ep: k, tries: Number(t[k].n || 0), why: String(t[k].why || ''),
               at: String(t[k].at || '') });
  }
  out.sort(function (a, b) { return (Number(a.ep) || 0) - (Number(b.ep) || 0); });
  return out;
}

/* ─────────────────── واردکردنِ قسمت‌های گذشته ─────────────────── */

/**
 * هر درسی که تولید شده ولی در جزوه نیست، به صف می‌رود.
 *
 * ══ چرا لازم بود ══
 * ۵٫۸۵ بدهی را از **پایانِ هر قسمت** ثبت می‌کند، یعنی فقط قسمت‌های بعد از
 * نصبِ آن نسخه. صاحبِ برنامه: «قسمت‌های قبلی باید حتماً وارد جزوه بشن.»
 * درست هم هست — جزوه‌ای که از درسِ ۱۶ شروع شود، جزوهٔ آن مجموعه نیست.
 *
 * ══ چرا مکان‌نما دارد ══
 * ۲۶۴ مجموعه در رجیستری هست و هر کدام یک پیمایشِ پوشه لازم دارد. یک اجرا
 * نمی‌تواند همه را ببیند، و اجرایی که وسطِ کار کشته شود بی مکان‌نما هر بار
 * از همان اولِ فهرست شروع می‌کند و هرگز به انتها نمی‌رسد.
 *
 * @return {{scanned:number, queued:number, series:number, wrapped:boolean}}
 */
function handoutBackfill_(maxSeries) {
  var out = { scanned: 0, rows: 0, walked: 0, queued: 0, series: 0,
              wrapped: false, ranOut: false, names: [], abandoned: 0 };
  if (CFG.HANDOUT_ENABLED === false) return out;
  /* ══ سقف باید کارِ گران را بشمارد، نه ردیف‌ها (باگِ ۵٫۹۱) ══
   * تا امروز `scanned` برای **هر ردیفِ رجیستری** بالا می‌رفت و سقف ۲۵ بود.
   * رجیستری ۲۶۴ ردیف دارد و بیشترشان اصلاً پوشه‌ای ندارند (هنوز قسمتی
   * نساخته‌اند) — یعنی یک فشردنِ دکمه فقط ردیف‌های ۰ تا ۲۴ را می‌دید و
   * ردِ ارزانِ ۲۰ ردیفِ بی‌پوشه، کلِ بودجه را می‌خورد.
   *
   * نتیجه‌اش را صاحبِ برنامه دید: دکمه را زد و پیام گفت «۰ ساخته شد، ۰ در
   * صف» — در حالی که مجموعهٔ فعالش سیزده قسمتِ واردنشده داشت. فقط نوبتش
   * نرسیده بود، و پیام هم این را نمی‌گفت.
   *
   * حالا سقف روی **پیمایشِ پوشه** است (تنها کارِ گران) و ردِ ارزان مجانی
   * است؛ به‌علاوهٔ یک نگهبانِ زمان، چون رجیستری می‌تواند بلند شود. */
  var cap = Math.max(1, Number(maxSeries) || Number(CFG.HANDOUT_SCAN_MAX) || 25);
  var t0 = new Date().getTime();
  var budget = Math.max(20000, Number(CFG.HANDOUT_SCAN_MS) || 90000);
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  if (!reg.rows.length) return out;

  var cur = 0;
  try { cur = Number(props_().getProperty(PK.HANDOUT_SCAN) || 0) || 0; } catch (e) {}
  if (cur >= reg.rows.length) { cur = 0; out.wrapped = true; }

  var i = cur;
  while (out.walked < cap && i < reg.rows.length) {
    if (out.walked && new Date().getTime() - t0 > budget) { out.ranOut = true; break; }
    var rec = reg.rows[i]; i++;
    out.rows++;
    var fid = String(rec.vals[SC.FOLDER - 1] || '');
    if (!fid) continue;                       // هنوز پوشه‌ای ندارد یعنی قسمتی نساخته
    var sf = null;
    try { sf = DriveApp.getFolderById(fid); } catch (eF) { continue; }
    out.walked++;                             // از اینجا به بعد گران است
    out.scanned = out.walked;
    var eps = handoutSeriesEpisodes_(sf);
    var nums = [];
    for (var k in eps) if (Object.prototype.hasOwnProperty.call(eps, k)) nums.push(k);
    if (!nums.length) continue;

    var book = handoutRead_(sf, null);
    var have = Object.create(null);
    for (var e = 0; e < (book.episodes || []).length; e++) have[String(book.episodes[e].n)] = 1;

    nums.sort(function (a, b) { return (Number(a) || 0) - (Number(b) || 0); });
    var batch = [];
    for (var n = 0; n < nums.length; n++) {
      if (have[nums[n]]) continue;
      // درسِ رهاشده دوباره به صف نمی‌رود — وگرنه هر شب یک فراخوانِ مدل و
      // یک ردیفِ تب هدر می‌رود و شکاف هرگز بسته نمی‌شود. پنهانش هم نمی‌کنیم:
      // handoutStatus_ جداگانه می‌شمردش و سلامت اعلامش می‌کند.
      if (handoutGaveUp_(book, nums[n])) { out.abandoned++; continue; }
      batch.push({ key: String(rec.key), ep: nums[n] });
    }
    var added = batch.length ? handoutDueAddMany_(batch) : 0;
    if (added) {
      out.queued += added; out.series++;
      out.names.push(String(rec.vals[SC.NAME - 1] || rec.key) + ' (' + added + ')');
    }
  }
  try { props_().setProperty(PK.HANDOUT_SCAN, String(i >= reg.rows.length ? 0 : i)); }
  catch (e2) {}
  if (i >= reg.rows.length) out.wrapped = true;
  return out;
}

/**
 * مهاجرتِ یک‌بارهٔ عنوان‌های فصل — روی کتاب‌هایی که دیگر به‌روز نمی‌شوند.
 *
 * ══ چرا یک جاروی جدا لازم است ══
 * `handoutUpdate_` هر کتابی را که درسِ تازه‌ای می‌گیرد خودش مرتب می‌کند. ولی
 * مجموعه‌ای که تمام شده دیگر درسِ تازه‌ای نمی‌گیرد؛ فهرستش تا ابد «فصل ۳:
 * فصل ۳ — …» می‌ماند و هیچ مسیرِ خودکاری به آن نمی‌رسد. جاروی زیر همان
 * مسیر است.
 *
 * سه چیزِ عمدی در طراحی‌اش:
 *  ۱) **مکان‌نما دارد** — ۲۶۴ مجموعه در یک اجرای شش‌دقیقه‌ای جا نمی‌شوند،
 *     پس هر شب چند تا جلو می‌رود و دورش که تمام شد خودش را خاموش می‌کند.
 *  ۲) **فقط وقتی می‌نویسد که چیزی عوض شده باشد** — کتابی که عنوان‌هایش
 *     تمیزند نه نوشته می‌شود نه از نو رندر؛ وگرنه یک مهاجرتِ آرایشی، تاریخِ
 *     تغییرِ ۲۶۴ فایل را جابه‌جا می‌کرد.
 *  ۳) **دستِ آدم هم می‌رسد** — دکمهٔ «به‌روزرسانیِ جزوه» ذیلِ هر مجموعه
 *     بی‌قیدِ این نشانه همان کار را برای همان مجموعه می‌کند. نشانه‌ای که
 *     فقط کد بتواند بازش کند، همان سدی است که این ریپو بارها از آن ضربه
 *     خورده.
 *
 * @return {{walked:number, series:number, titles:number, done:boolean}}
 */
function handoutRetitle_(maxSeries, budgetMs) {
  var out = { walked: 0, series: 0, titles: 0, done: false, ranOut: false, names: [] };
  if (CFG.HANDOUT_ENABLED === false) return out;

  var st = null;
  try { st = JSON.parse(props_().getProperty(PK.HANDOUT_RETITLE) || 'null'); } catch (e) {}
  if (st && st.done) { out.done = true; return out; }
  if (!st) st = { cur: 0, done: false, fixed: 0, series: 0 };

  var cap = Math.max(1, Number(maxSeries) || 12);
  var budget = Math.max(15000, Number(budgetMs) || 60000);
  var t0 = new Date().getTime();

  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  if (!reg.rows.length) return out;

  var i = Math.max(0, Number(st.cur) || 0);
  if (i >= reg.rows.length) i = 0;

  while (out.walked < cap && i < reg.rows.length) {
    if (out.walked && new Date().getTime() - t0 > budget) { out.ranOut = true; break; }
    var rec = reg.rows[i]; i++;
    var fid = String(rec.vals[SC.FOLDER - 1] || '');
    if (!fid) continue;                       // بی‌پوشه یعنی هنوز جزوه‌ای ندارد
    var sf = null;
    try { sf = DriveApp.getFolderById(fid); } catch (eF) { continue; }
    // خواندنِ کتاب گران است؛ فقط از این‌جا به بعد شمرده می‌شود
    var has = false;
    try { has = sf.getFilesByName(handoutJsonName_()).hasNext(); } catch (eH) { continue; }
    if (!has) continue;
    out.walked++;

    var book = null;
    try { book = handoutRead_(sf, null); } catch (eR) { continue; }
    var n = handoutRetitleBook_(book);
    if (!n) continue;                         // تمیز بود؛ دست نمی‌خورد

    try {
      book.revision = Number(book.revision || 0) + 1;
      book.updatedAt = nowStr_();
      handoutWrite_(sf, book);
      handoutRender_(sf, book);
    } catch (eW) { continue; }
    out.series++; out.titles += n;
    out.names.push(String(rec.vals[SC.NAME - 1] || rec.key) + ' (' + n + ')');
  }

  st.cur = i;
  st.fixed = (Number(st.fixed) || 0) + out.titles;
  st.series = (Number(st.series) || 0) + out.series;
  if (i >= reg.rows.length) { st.done = true; st.at = nowStr_(); out.done = true; }
  try { props_().setProperty(PK.HANDOUT_RETITLE, JSON.stringify(st)); } catch (eP) {}

  if (out.titles) {
    logLine_('جزوه — مرتب‌سازیِ عنوانِ فصل‌ها: ' + out.titles + ' عنوان در ' +
             out.series + ' مجموعه (' + out.names.slice(0, 4).join('، ') + ').');
  }
  out.total = Number(st.fixed) || 0;
  out.totalSeries = Number(st.series) || 0;
  return out;
}

/**
 * همهٔ قسمت‌های یک مجموعه، با **یک** پیمایشِ پوشه.
 *
 * تا ۵٫۸۵ برای هر درس یک بار کلِ زیرپوشه‌ها پیمایش می‌شد — یعنی واردکردنِ
 * پانزده درسِ گذشته، پانزده بار خواندنِ همان پانزده پوشه. برای مجموعه‌ای که
 * چند ده قسمت دارد، این به‌تنهایی مهلتِ شش‌دقیقه‌ای را می‌خورَد.
 *
 * @return {Object} نگاشتِ شمارهٔ قسمت → متادیتای آن
 */
function handoutSeriesEpisodes_(seriesFolder) {
  var map = Object.create(null);
  try {
    var subs = seriesFolder.getFolders();
    while (subs.hasNext()) {
      var f = subs.next();
      var it = f.getFilesByName('_special.json');
      if (!it.hasNext()) continue;
      try {
        var m = JSON.parse(it.next().getBlob().getDataAsString());
        /* قسمتِ مرورِ بزرگ (۶٫۲۲) درسِ تازه نیست و فصلی به کتاب نمی‌دهد. اگر
           اینجا شمرده شود، تا ابد «واردنشده» می‌مانَد: پرکنندهٔ عقب‌ماندگی
           هر شب صفش می‌کند، مدل هر شب چیزی برای افزودن پیدا نمی‌کند، و پس
           از HANDOUT_TRY_MAX «رهاشده» ثبت می‌شود — یعنی یک هشدارِ دائمی
           برای کاری که اصلاً قرار نبود انجام شود.
           این تنها جایی است که جزوه قسمت‌ها را می‌شمارد، پس فیلتر همین‌جا
           می‌نشیند نه در هر شمارنده — مرزی که هر فراخوان باید یادش باشد،
           همان مرزی است که فردا یکی یادش می‌رود. */
        if (m && m.recap) continue;
        if (m && m.epNum !== undefined && m.epNum !== null) map[String(m.epNum)] = m;
      } catch (e) {}
    }
  } catch (e2) {}
  return map;
}


/* ───────────────────────────── دیده‌شدن ───────────────────────────── */

/** وضعیتِ جزوه‌ها برای `_STATUS.json` — بی‌شبکه، ارزان. */
/* ═══════ وارسیِ روزانه وقتی مجموعه‌ها از سقف بگذرند (۵٫۸۸) ═══════

   ۵٫۸۷ سقفِ پیمایش گذاشت و صادقانه اعلامش می‌کرد — ولی سقف **همیشه از
   ابتدای فهرست** شمرده می‌شد. یعنی مجموعهٔ بیست‌وششم به بعد هرگز، در هیچ
   شبی، وارسی نمی‌شد. یک نقطهٔ کورِ دائمی که فقط یک یادداشت داشت، و
   یادداشت جای وارسی را نمی‌گیرد.

   حالا دو فهرست، نه یکی:
     • **زیرِ نظرِ همیشگی** — هر مجموعه‌ای که یک بار عقب یا رهاشده دیده شده،
       هر شب دوباره سنجیده می‌شود تا وقتی درست شود. مشکلی که پیدا شده،
       نباید با چرخشِ پنجره از دید برود.
     • **پنجرهٔ چرخان** — بقیه، با مکان‌نما. هیچ مجموعه‌ای بیش از یک دورِ
       کامل نادیده نمی‌مانَد، و طولِ دور در خودِ وضعیت نوشته می‌شود تا
       معلوم باشد «هر چند شب یک بار».
*/
function handoutStatus_() {
  var out = { enabled: CFG.HANDOUT_ENABLED !== false, series: [], due: 0, stale: [],
              truncated: false, watched: 0, rotating: 0, pending: 0, cycleNights: 0 };
  try { out.due = handoutDueList_().length; } catch (e) {}
  var scanCap = Math.max(5, Number(CFG.HANDOUT_SCAN_MAX) || 25);
  var watchCap = Math.max(scanCap, Number(CFG.HANDOUT_WATCH_MAX) || 60);
  try {
    var hub = getHub_();
    var reg = readSeriesReg_(hub);

    // نامزدها: هر مجموعه‌ای که ردی از قسمت دارد و پوشه‌اش معلوم است.
    // این وارسیِ ارزان است (فقط سلول)، پس روی همه انجام می‌شود.
    var cand = [];
    for (var i = 0; i < reg.rows.length; i++) {
      var rc = reg.rows[i];
      if (!/\d/.test(String(rc.vals[SC.EPISODES - 1] || ''))) continue;
      if (!String(rc.vals[SC.FOLDER - 1] || '')) continue;
      cand.push(rc);
    }

    var watchMap = {};
    try { watchMap = JSON.parse(props_().getProperty(PK.HANDOUT_SEEN) || '{}') || {}; } catch (e0) {}

    var pickKeys = Object.create(null), order = [];
    for (var w = 0; w < cand.length && order.length < watchCap; w++) {
      if (!watchMap[String(cand[w].key)]) continue;
      pickKeys[String(cand[w].key)] = 1; order.push(cand[w]); out.watched++;
    }

    var cur = 0;
    try { cur = Number(props_().getProperty(PK.HANDOUT_STAT) || 0) || 0; } catch (e1) {}
    if (cur >= cand.length) cur = 0;
    var seen = 0, idx = cur;
    while (out.rotating < scanCap && seen < cand.length) {
      var rc2 = cand[idx];
      idx = (idx + 1) % Math.max(1, cand.length);
      seen++;
      if (!rc2 || pickKeys[String(rc2.key)]) continue;
      pickKeys[String(rc2.key)] = 1; order.push(rc2); out.rotating++;
    }
    try { props_().setProperty(PK.HANDOUT_STAT, String(cand.length ? idx : 0)); } catch (e2) {}
    out.pending = Math.max(0, cand.length - order.length);
    out.truncated = out.pending > 0;
    out.cycleNights = out.rotating ? Math.ceil(cand.length / out.rotating) : 0;

    for (var q = 0; q < order.length; q++) {
      var rec = order[q];
      var fid = String(rec.vals[SC.FOLDER - 1] || '');
      var sfx = null;
      try { sfx = DriveApp.getFolderById(fid); } catch (eFx) { continue; }
      var made = handoutSeriesEpisodes_(sfx);
      var nMade = 0;
      for (var mk in made) if (Object.prototype.hasOwnProperty.call(made, mk)) nMade++;
      if (!nMade) continue;                     // هنوز قسمتی نساخته — جزوه هم لازم ندارد
      var row = { key: String(rec.key),
                  name: String(rec.vals[SC.NAME - 1] || rec.key),
                  episodes: nMade,
                  chapters: 0, sections: 0, refs: 0, covered: 0, updatedAt: '',
                  missing: true, abandoned: 0, abandonedWhy: '' };
      try {
        var b = handoutRead_(sfx, null);
        var gone = handoutAbandoned_(b);
        row.abandoned = gone.length;
        if (gone.length) {
          row.abandonedWhy = gone.slice(0, 3).map(function (x) {
            return 'درسِ ' + x.ep + ' (' + x.why + ')'; }).join('، ');
        }
        if (b.revision) {
          row.missing = false;
          row.chapters = b.chapters.length;
          row.refs = b.refs.length;
          row.covered = (b.episodes || []).length;
          row.updatedAt = b.updatedAt;
          for (var c = 0; c < b.chapters.length; c++) row.sections += (b.chapters[c].sections || []).length;
        }
      } catch (e3) {}
      /* «عقب» یعنی هنوز قرار است اتفاقی بیفتد. درسِ رهاشده عقب نیست —
         یک مشکلِ *دیگر* است و باید جدا شمرده شود، وگرنه یک ایرادِ حل‌نشدنی
         تا ابد به‌عنوانِ «عقب‌ماندگی» گزارش می‌شود و هشدار بی‌اثر می‌گردد. */
      row.behind = Math.max(0, row.episodes - row.covered - row.abandoned);
      if (row.missing || row.behind) out.stale.push(row.name);
      if (row.abandoned) out.abandonedSeries = (out.abandonedSeries || 0) + 1;
      out.series.push(row);
    }
  } catch (e4) { out.error = String(e4.message || e4); }
  // تاریخچه: «از کِی» را فقط این جواب می‌دهد، و همان چیزی است که ناظر
  // برای تشخیصِ «شبِ شلوغ» از «زنجیرهٔ شکسته» لازم دارد.
  try { out.recent = handoutHistory_(null, 8); } catch (e5) { out.recent = []; }
  out.line = handoutLineOf_(out);
  return out;
}

/**
 * یک جملهٔ آمادهٔ فارسی از حالِ همهٔ جزوه‌ها.
 *
 * ══ چرا خودِ موتور جمله می‌سازد و نه ناظر ══
 * صاحبِ برنامه: «من هیچ‌وقت نمی‌روم توی شیت و تب‌ها را نگاه کنم؛ این را
 * باید خودِ ناظر ببیند.» درست است — ولی اگر ناظر مجبور باشد از روی
 * عددهای خام جمله بسازد، هر روز ممکن است شکلِ دیگری بسازد یا اصلاً
 * ننویسدش. یک فیلدِ آمادهٔ `line` یعنی جمله همیشه هست، همیشه یک‌شکل است،
 * و ناظر فقط نقلش می‌کند. **و مهم‌تر: وقتی همه‌چیز خوب است هم هست** —
 * سکوت را نمی‌شود از «این قابلیت مرده» تشخیص داد.
 */
function handoutLineOf_(st) {
  if (!st || st.enabled === false) return 'جزوه: خاموش است.';
  var n = (st.series || []).length;
  if (!n) return 'جزوه: هنوز مجموعه‌ای با قسمتِ تولیدشده نیست.';
  var made = 0, cov = 0, prod = 0, beh = 0, ab = 0;
  for (var i = 0; i < st.series.length; i++) {
    var r = st.series[i];
    if (!r.missing) made++;
    cov += Number(r.covered) || 0;
    prod += Number(r.episodes) || 0;
    beh += Number(r.behind) || 0;
    ab += Number(r.abandoned) || 0;
  }
  var bits = [made + ' جزوه از ' + n + ' مجموعه',
              cov + ' از ' + prod + ' درس وارد شده'];
  if (beh) bits.push(beh + ' درس در راه');
  if (ab) bits.push('⚠ ' + ab + ' درس رهاشده — نیاز به رسیدگی');
  if (Number(st.due)) bits.push(st.due + ' در صف');
  if (!beh && !ab && cov === prod) bits.push('همه به‌روز');
  return 'جزوه: ' + bits.join(' · ') + '.';
}

/**
 * ایرادهای جزوه، برای وارسیِ سلامت و ناظر.
 *
 * خواستهٔ صریحِ صاحبِ برنامه: «باید این قابلیت و به‌روزرسانی‌شدنش حتماً موردِ
 * توجهِ ناظر به‌طور مکرر قرار بگیرد و گزارش بشود، و اگر لازم بود برای اصلاحش
 * کدی عوض بشه این مدِّ نظرِ گزارش قرار بگیره.»
 *
 * ══ چرا «متن در سلامت» کافی نیست ══
 * جمله‌ای در `problems` فقط در ایمیلِ روز دیده می‌شود و فردا جایش را به
 * جملهٔ دیگری می‌دهد. چیزی که واقعاً به تغییرِ کد می‌رسد، **یافته** است:
 * `logSelfFinding_` با `owner: ROWNER_CODE` ردیفی با وضعیتِ `NEEDS_CODE` در
 * تبِ «گزارش‌های نظارت» می‌سازد — همان صفی که سشنِ ناظر نسخهٔ بعدیِ موتور را
 * از رویش می‌بندد، و شمارندهٔ «تکرار»ش می‌گوید چند روز است حل نشده.
 *
 * ══ و چرا اولین شب یافته نمی‌سازد ══
 * یک شبِ عقب‌ماندگی می‌تواند فقط شلوغیِ آن اجرا باشد. یافته‌ای که برای یک
 * شبِ شلوغ ساخته شود، همان هشداری است که آدم یاد می‌گیرد نادیده بگیرد —
 * درسی که `srcCycleHealth_` قبلاً داده. پس `HANDOUT_STUCK_DAYS` روزِ پیاپی.
 */
function handoutHealth_(problems, notes) {
  if (CFG.HANDOUT_ENABLED === false) return;
  var st = null;
  try { st = handoutStatus_(); } catch (e) { return; }
  if (!st) return;
  /* خطِ حال، **همیشه** — حتی وقتی هیچ ایرادی نیست.
     سکوت را نمی‌شود از «این قابلیت مرده» تشخیص داد، و صاحبِ برنامه شیت
     باز نمی‌کند. پس گزارشِ روزانه باید خودش بگوید جزوه‌ها در چه حال‌اند،
     نه اینکه فقط وقتی خراب شد حرف بزند. */
  if (notes && st.line) notes.push(st.line);

  // از کِی هر مجموعه عقب است — تا «یک شبِ شلوغ» با «زنجیرهٔ شکسته» یکی نشود
  var lag = {};
  try { lag = JSON.parse(props_().getProperty(PK.HANDOUT_SEEN) || '{}') || {}; } catch (e0) {}
  /* پاک‌سازی **پیش از** هر خروجِ زودهنگام: فهرستِ خالی هم یک واقعیت است
     («هیچ مجموعه‌ای عقب نیست») و باید حافظه را خالی کند، نه اینکه از کنارش
     رد شود و تاریخِ کهنه را برای همیشه نگه دارد. */
  /* کلید، نه نام: فهرستِ «زیرِ نظر» در handoutStatus_ با کلید گشته می‌شود،
     و دو مجموعه می‌توانند نامِ یکسان داشته باشند. */
  var live = {};
  for (var lv = 0; lv < st.series.length; lv++) live[st.series[lv].key] = 1;
  for (var lk in lag) {
    // مجموعه‌ای که این شب اصلاً وارسی نشده (پنجرهٔ چرخان) نباید از فهرستِ
    // زیرِ نظر بیفتد — وگرنه همان چرخش، مشکلی را که پیدا شده گم می‌کند.
    if (Object.prototype.hasOwnProperty.call(lag, lk) && !live[lk] &&
        !st.truncated) delete lag[lk];
  }
  if (!st.series.length) {
    try { props_().setProperty(PK.HANDOUT_SEEN, JSON.stringify(lag)); } catch (eE) {}
    return;
  }
  var today = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  var stuckDays = Math.max(1, Number(CFG.HANDOUT_STUCK_DAYS) || 3);
  var dayNo = function (d) { return Math.floor(new Date(d + 'T00:00:00Z').getTime() / 86400000); };
  var behind = [];

  for (var i = 0; i < st.series.length; i++) {
    var r = st.series[i];
    var lagging = r.missing || r.behind > 0 || r.abandoned > 0;
    if (!lagging) { delete lag[r.key]; continue; }
    if (!lag[r.key]) lag[r.key] = today;
    var days = dayNo(today) - dayNo(String(lag[r.key]));
    behind.push({ r: r, days: days });

    if (r.missing) {
      problems.push('جزوهٔ مجموعهٔ «' + r.name + '» ساخته نشده، با اینکه ' +
                    r.episodes + ' قسمت از آن تولید شده است' +
                    (days ? ' (' + days + ' روز)' : '') + '.');
    } else {
      problems.push('جزوهٔ «' + r.name + '» عقب است: ' + r.covered + ' درس در جزوه، ' +
                    r.episodes + ' قسمت تولیدشده' + (days ? ' (' + days + ' روز)' : '') + '.');
    }
    if (!r.refs && !r.missing && notes) {
      notes.push('جزوهٔ «' + r.name + '» هیچ ارجاعی ندارد — یا غنی‌سازی منبعی نداده، ' +
                 'یا منبع‌ها به جزوه نمی‌رسند.');
    }
  }
  try { props_().setProperty(PK.HANDOUT_SEEN, JSON.stringify(lag)); } catch (e1) {}

  /* ── درس‌های رهاشده ──
     این‌ها دیگر خودبه‌خود درست نمی‌شوند: سقفِ تلاش خورده و موتور دیگر
     سراغشان نمی‌رود. پس نه «عقب‌ماندگی»اند و نه چیزی که فردا حل شود —
     یا کد باید عوض شود یا آدم باید دکمهٔ همان مجموعه را بزند. اعلامِ
     صریح، هم در سلامت و هم در صفِ ساختِ نسخهٔ بعد. */
  var gaveUp = [];
  for (var gu = 0; gu < st.series.length; gu++) {
    if (st.series[gu].abandoned) gaveUp.push(st.series[gu]);
  }
  if (gaveUp.length) {
    var gTxt = gaveUp.map(function (x) {
      return '«' + x.name + '»: ' + x.abandoned + ' درس' +
             (x.abandonedWhy ? ' — ' + x.abandonedWhy : '');
    }).join(' | ');
    problems.push('درس‌هایی هستند که پس از ' +
                  (Number(CFG.HANDOUT_TRY_MAX) || 4) +
                  ' تلاش وارد جزوه نشدند و دیگر تلاش نمی‌شود: ' + gTxt);
    try {
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'جزوه', key: 'handout-abandoned',
        title: 'درس‌هایی پس از سقفِ تلاش وارد جزوه نشدند',
        detail: gTxt + '. این‌ها دیگر خودبه‌خود درست نمی‌شوند — موتور از ' +
                'تلاشِ دوباره دست کشیده تا هر شب یک فراخوانِ مدل هدر ندهد. ' +
                'علتِ هر کدام در ستونِ «نتیجه»ی تبِ «' +
                (CFG.HANDOUT_TAB || 'کاربردِ جزوه') + '» هست.',
        instruction: 'اگر علت «وصله خالی بود» است، پرامپتِ نویسندهٔ جزوه ' +
                     '(handoutPrompt_) یا اعتبارسنجیِ handoutApply_ را اصلاح کن. ' +
                     'اگر «این قسمت متنی برای جزوه ندارد» است، ببین متنِ آن قسمت ' +
                     'در _special.json واقعاً خالی است یا خواننده اشتباه می‌کند. ' +
                     'پس از اصلاح، دکمهٔ «به‌روزرسانیِ جزوه»ی همان مجموعه سابقهٔ ' +
                     'تلاش را پاک می‌کند و از نو امتحان می‌شود.',
        owner: ROWNER_CODE
      });
    } catch (eG) {}
  }

  if (st.due > 3) {
    problems.push('صفِ به‌روزرسانیِ جزوه ' + st.due + ' درس عقب افتاده است.');
  }
  /* سقفِ پیمایش خورده؟ یعنی مجموعه‌هایی هستند که این وارسی اصلاً ندیدشان.
     نقطهٔ کورِ نادیده، از نقطهٔ کورِ اعلام‌شده بدتر است. */
  if (st.truncated && notes) {
    /* این دیگر نقطهٔ کور نیست، فقط کندی است: هر مجموعه‌ای که یک بار
       ایراد داشته زیرِ نظرِ همیشگی می‌مانَد، و بقیه با پنجرهٔ چرخان دیده
       می‌شوند. جمله باید همین را بگوید، وگرنه خواننده فکر می‌کند چیزی
       دیده نمی‌شود. */
    notes.push('وارسیِ جزوه امشب ' + st.watched + ' مجموعهٔ زیرِ نظر و ' +
               st.rotating + ' مجموعه از پنجرهٔ چرخان را سنجید؛ ' + st.pending +
               ' مورد نوبتشان نشد. دورِ کامل حدودِ ' + st.cycleNights +
               ' شب طول می‌کشد و هیچ مجموعه‌ای بیش از یک دور نادیده نمی‌مانَد. ' +
               'برای تندترشدن، HANDOUT_SCAN_MAX را بالا ببرید.');
  }

  /* ── و آنچه واقعاً به تغییرِ کد می‌رسد ──
     فقط عقب‌ماندگیِ پایدار. یک مجموعه که چند روز پیاپی عقب مانده یعنی
     زنجیره شکسته، نه اینکه شبی شلوغ بوده. */
  var stuck = behind.filter(function (x) { return x.days >= stuckDays; });
  if (stuck.length) {
    var names = stuck.map(function (x) {
      return '«' + x.r.name + '» (' + x.r.covered + ' از ' + x.r.episodes +
             '، ' + x.days + ' روز)';
    }).join('، ');
    try {
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'جزوه', key: 'handout-stuck',
        title: 'جزوهٔ مجموعه‌ها ' + stuckDays + ' روز است به‌روز نمی‌شود',
        detail: 'این مجموعه‌ها عقب مانده‌اند: ' + names + '. صفِ بدهی: ' + st.due +
                '. یعنی یا `handoutRunDue_` هر شب وقت کم می‌آورَد، یا وصلهٔ مدل ' +
                'همیشه خالی برمی‌گردد، یا فایلِ وضعیتِ قسمت پیدا نمی‌شود. ' +
                'تبِ «' + (CFG.HANDOUT_TAB || 'کاربردِ جزوه') + '» ستونِ «نتیجه» را ' +
                'دارد و همان می‌گوید کدام سه.',
        instruction: 'در تبِ «' + (CFG.HANDOUT_TAB || 'کاربردِ جزوه') + '» ستونِ ' +
                     '«نتیجه» را برای این مجموعه‌ها بخوان و از همان‌جا علت را ' +
                     'بردار؛ سپس بخشِ ۲۶ را اصلاح کن و نسخهٔ تازه بده. ' +
                     'پس از اصلاح، همین ردیف را ببند و در ایمیلِ روز اعلام کن.',
        owner: ROWNER_CODE
      });
    } catch (eF) {}
  }

  /* وصله‌ای که همیشه خالی برمی‌گردد، ایرادِ کد است نه دادهٔ کم: یعنی پرامپت
     یا اعمالِ وصله کار نمی‌کند. این را فقط تاریخچه می‌تواند بگوید. */
  try {
    var hist = handoutHistory_(null, 8);
    var tries = hist.filter(function (h) { return h.result && h.result !== 'خاموش'; });
    if (tries.length >= 4 && !tries.some(function (h) { return h.result === 'به‌روز شد'; })) {
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'جزوه', key: 'handout-empty-patch',
        title: 'هیچ‌کدام از ' + tries.length + ' تلاشِ اخیرِ جزوه چیزی اضافه نکرد',
        detail: 'نتیجهٔ تلاش‌ها: ' + tries.map(function (h) {
                  return h.ep + '→' + h.result; }).join('، ') + '. زنجیره اجرا ' +
                'می‌شود ولی خروجی ندارد — یعنی ایرادِ پرامپتِ نویسندهٔ جزوه یا ' +
                'handoutApply_ است، نه نبودِ داده.',
        instruction: 'پرامپتِ بخشِ ۲۶ (handoutPrompt_) و اعتبارسنجیِ handoutApply_ ' +
                     'را بازبینی کن. پس از اصلاح، ردیف را ببند و اطلاع بده.',
        owner: ROWNER_CODE
      });
    }
  } catch (eH) {}
}

/** یک خطِ کوتاه برای ایمیل و تلگرامِ درس‌نامه — تا اطلاع‌رسانی بشود. */
/**
 * خطِ جزوهٔ یک مجموعه، با لینک — تا از داخلِ ایمیلِ قسمت مستقیم به جزوه بروی.
 *
 * صاحبِ برنامه شیت باز نمی‌کند و حق هم دارد. پس هرچه لازم است باید در
 * همان چیزی باشد که می‌خواند: ایمیل و تلگرامِ خودِ قسمت.
 */
function handoutLineFull_(seriesName) {
  var out = { text: '', url: '' };
  try {
    var hist = handoutHistory_(null, 12);
    for (var i = 0; i < hist.length; i++) {
      if (String(hist[i].series) !== String(seriesName)) continue;
      out.url = String(hist[i].url || '');
      if (hist[i].result === 'به‌روز شد') {
        out.text = 'جزوهٔ مجموعه به‌روز شد: ' + hist[i].newCh + ' فصلِ تازه، ' +
                   hist[i].newSec + ' بخش' +
                   (Number(hist[i].amend) ? '، ' + hist[i].amend + ' تکمیلِ درس‌های قبلی' : '') +
                   (hist[i].totCh ? ' — جزوه حالا ' + hist[i].totCh + ' فصل دارد' : '') + '.';
      } else {
        out.text = 'جزوهٔ مجموعه این بار به‌روز نشد — ' + hist[i].result + '.';
      }
      return out;
    }
  } catch (e) {}
  return out;
}

/* ───────────────────────────── دکمهٔ دستی ───────────────────────────── */

/**
 * «ساختِ جزوهٔ مجموعه‌ها» — گذشته را به صف می‌آورد و بعد تا جا دارد می‌سازد.
 *
 * ترتیبش عمدی است: اول کاوش (ارزان، بی‌مدل) و بعد ساخت. برعکسش یعنی
 * کسی که دکمه را می‌زند، بارِ اول هیچ اتفاقی نمی‌بیند چون صف خالی است.
 */
function runHandoutBuild() {
  var b = { queued: 0, series: 0, names: [], wrapped: false, rows: 0, walked: 0, ranOut: false };
  try { b = handoutBackfill_(Number(CFG.HANDOUT_SCAN_MAX) || 25); }
  catch (e) { logLine_('کاوشِ قسمت‌های گذشته انجام نشد: ' + e.message); }
  var r = handoutRunDue_(Math.max(1, Number(CFG.HANDOUT_MANUAL_MAX) || 12),
                         Number(CFG.HANDOUT_MANUAL_MS) || 210000);
  var left = 0;
  try { left = handoutDueList_().length; } catch (e2) {}

  /* ── پیام باید بگوید چه شد، مخصوصاً وقتی هیچ نشد ──
   * صاحبِ برنامه دکمه را زد و دید «۰ ساخته شد، ۰ در صف» — و هیچ راهی
   * نداشت بفهمد یعنی «همه‌چیز به‌روز است» یا «نوبتِ مجموعه‌ات نرسید» یا
   * «چیزی خراب است». سه حالتِ کاملاً متفاوت با یک پیام.
   *
   * و عددها **پس از** واژهٔ فارسی می‌آیند، نه پیش از آن: در متنِ راست‌به‌چپ
   * عددی که سرِ سطر بیاید به انتهای دیدنیِ سطر پرت می‌شود و «۰ جزوه ساخته
   * شد» به «جزوه ساخته شد ۰» تبدیل می‌شود — همان چیزی که در تصویر دیده شد. */
  var L = ['جزوه:'];
  if (b.queued) {
    L.push('• درسِ گذشته که به صف رفت: ' + b.queued +
           ' (از ' + b.series + ' مجموعه)' +
           (b.names.length ? ' — ' + b.names.slice(0, 6).join('، ') : ''));
  }
  L.push('• جزوه‌ای که همین حالا ساخته شد: ' + r.done);
  L.push('• درسِ باقی‌مانده در صف: ' + left);

  if (!b.queued && !r.done && !left) {
    // هیچ اتفاقی نیفتاد — بگو چرا، وگرنه دکمه «خراب» به‌نظر می‌رسد
    if (b.walked) {
      L.push('');
      L.push(b.wrapped
        ? '✅ همهٔ مجموعه‌ها کاوش شدند و همه به‌روزند؛ کاری نمانده.'
        : 'ℹ️ ' + b.walked + ' مجموعه کاوش شد و همه به‌روز بودند. کاوش از جایی که ' +
          'ماند ادامه می‌یابد — دوباره همین دکمه را بزنید تا بقیه هم دیده شوند.');
    } else {
      L.push('');
      L.push('ℹ️ هیچ مجموعه‌ای با پوشه و قسمتِ ساخته‌شده در این بازه پیدا نشد.');
    }
  } else if (left) {
    L.push('');
    L.push(r.ranOut
      ? 'وقتِ این اجرا تمام شد — دوباره همین دکمه را بزنید، یا بگذارید کارِ شبانه ادامه دهد.'
      : 'کارِ شبانه بقیه را ادامه می‌دهد.');
  }
  if (b.walked && !b.wrapped) {
    L.push('(کاوش: ' + b.walked + ' مجموعه از ردیفِ ' + b.rows + ' — دورِ کامل نشده)');
  }
  if (b.abandoned) {
    L.push('⚠️ درسِ رهاشده (سقفِ تلاش خورده): ' + b.abandoned +
           ' — دکمهٔ همان مجموعه در تختهٔ پیشرفت از نو امتحانش می‌کند.');
  }

  var msg = L.join('\n') +
            (r.notes.length ? '\n\n' + r.notes.slice(0, 8).join('\n') : '');
  try { SpreadsheetApp.getUi().alert(msg); } catch (e3) { logLine_(msg); }
  return { backfill: b, run: r, left: left, message: msg };
}
