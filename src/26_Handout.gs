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
  L.push('   قسمتِ رادیویی («ادامهٔ بحثِ جلسهٔ قبل»). هر بخش یک `takeaway` دارد:');
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
  return L.join('\n');
}

function handoutPatchModel_(book, secs, meta) {
  var r = null;
  try { r = geminiText_(handoutPrompt_(book, secs, meta), HANDOUT_SCHEMA, 8192); }
  catch (e) { logLine_('نوشتنِ جزوه انجام نشد: ' + e.message); return null; }
  return r || null;
}

/* ───────────────────────────── اعمالِ وصله ───────────────────────────── */

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
    return { id: handoutNextId_(book, 's'), title: String(x.title || 'بی‌عنوان'),
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
    book.chapters.push({ id: handoutNextId_(book, 'ch'), title: String(nc.title || 'فصل'),
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
                           title: String(ic.title || 'افزودهٔ درسِ ' + ep),
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
function handoutRoadmapState_(book, prog) {
  var stages = (book.roadmap && book.roadmap.stages) || [];
  if (!stages.length) return book;
  var total = Math.max(1, stages.length);
  var doneRatio = (Number(prog && prog.done) || 0) / Math.max(1, Number(prog && prog.total) || 1);
  var reached = Math.floor(doneRatio * total);
  for (var i = 0; i < stages.length; i++) {
    stages[i].state = (i < reached) ? 'انجام‌شده' : (i === reached ? 'در جریان' : 'پیشِ رو');
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

  // ── فصل‌ها ──
  for (var ci = 0; ci < book.chapters.length; ci++) {
    var cc = book.chapters[ci];
    var used = {};
    h.push('<h2 id="' + cc.id + '">' + esc_(faDigitsOut_(String(ci + 1))) + '. ' +
           esc_(cc.title) + '</h2>');
    if (cc.intro) h.push('<p>' + esc_(cc.intro) + '</p>');
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
    }
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

/* ───────────────────────── به‌روزرسانیِ یک مجموعه ───────────────────────── */

/**
 * جزوهٔ یک مجموعه را با یک قسمتِ تازه به‌روز می‌کند.
 * @return {{ok:boolean, why:string, stats:object, url:string}}
 */
function handoutUpdate_(folder, meta, hub) {
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
  book.cat = book.cat || String(meta.seriesCat || '');
  book.level = book.level || String(meta.level || '');
  if (book.tried && book.tried[epNum]) delete book.tried[epNum];   // موفق شد؛ سابقه پاک
  book.episodes.push({ n: epNum, title: String(ep.title || ''), at: nowStr_(),
                       chapters: String(st.chapters), sections: String(st.sections),
                       amended: String(st.amended), radioDropped: String(dropped) });
  book.revision = Number(book.revision || 0) + 1;
  book.updatedAt = nowStr_();
  handoutRoadmapState_(book, meta.progress);

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
                       'کلیدِ مجموعه'];
var HU = { AT: 1, SERIES: 2, EP: 3, TITLE: 4, NEWCH: 5, NEWSEC: 6, AMEND: 7,
           RADIO: 8, NEWREF: 9, TOTCH: 10, TOTSEC: 11, TOTREF: 12,
           REV: 13, RESULT: 14, LINK: 15, KEY: 16 };

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
                       String(row.key || '')]],
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
      if (reset) { book.tried = {}; try { handoutWrite_(sf, book); } catch (eR) {} }
    }
    out.reset = reset;
    var have = Object.create(null);
    for (var e = 0; e < (book.episodes || []).length; e++) have[String(book.episodes[e].n)] = 1;
    var nums = [];
    for (var n in eps) if (Object.prototype.hasOwnProperty.call(eps, n) && !have[n]) nums.push(n);
    nums.sort(function (a, b) { return (Number(a) || 0) - (Number(b) || 0); });
    out.queued = handoutDueAddMany_(nums.map(function (x) { return { key: k, ep: x }; }));
  } catch (e2) { out.notes.push(e2.message); return out; }
  var r = handoutRunDue_(Math.max(1, Number(maxItems) || Number(CFG.HANDOUT_MAX_PER_RUN) || 2));
  out.done = r.done; out.notes = out.notes.concat(r.notes);
  out.left = (handoutDueByKey_()[k] || 0);
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
function handoutRunDue_(maxItems) {
  var res = { tried: 0, done: 0, left: 0, notes: [] };
  if (CFG.HANDOUT_ENABLED === false) return res;
  var list = handoutDueList_();
  if (!list.length) return res;
  var cap = Math.max(1, Number(maxItems) || Number(CFG.HANDOUT_MAX_PER_RUN) || 2);
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
      if (res.tried >= cap) { keep.push(items[i]); continue; }
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
        meta.progress = { done: Number(rec.vals[SC.CUR_CHUNK - 1]) || 0,
                          total: Number(rec.vals[SC.CHUNKS - 1]) || 0 };
        var u = handoutUpdate_(sf, meta, hub);
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
  var out = { scanned: 0, queued: 0, series: 0, wrapped: false, names: [], abandoned: 0 };
  if (CFG.HANDOUT_ENABLED === false) return out;
  var cap = Math.max(1, Number(maxSeries) || Number(CFG.HANDOUT_SCAN_MAX) || 25);
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  if (!reg.rows.length) return out;

  var cur = 0;
  try { cur = Number(props_().getProperty(PK.HANDOUT_SCAN) || 0) || 0; } catch (e) {}
  if (cur >= reg.rows.length) { cur = 0; out.wrapped = true; }

  var i = cur;
  while (out.scanned < cap && i < reg.rows.length) {
    var rec = reg.rows[i]; i++;
    out.scanned++;
    var fid = String(rec.vals[SC.FOLDER - 1] || '');
    if (!fid) continue;                       // هنوز پوشه‌ای ندارد یعنی قسمتی نساخته
    var sf = null;
    try { sf = DriveApp.getFolderById(fid); } catch (eF) { continue; }
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
  return out;
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
function handoutLine_(seriesName) {
  try {
    var hist = handoutHistory_(null, 12);
    for (var i = 0; i < hist.length; i++) {
      if (String(hist[i].series) !== String(seriesName)) continue;
      if (hist[i].result === 'به‌روز شد') {
        return 'جزوهٔ مجموعه به‌روز شد: ' + hist[i].newCh + ' فصلِ تازه، ' +
               hist[i].newSec + ' بخش' +
               (Number(hist[i].amend) ? '، ' + hist[i].amend + ' تکمیلِ درس‌های قبلی' : '') + '.';
      }
      return 'جزوهٔ مجموعه این بار به‌روز نشد — ' + hist[i].result + '.';
    }
  } catch (e) {}
  return '';
}

/* ───────────────────────────── دکمهٔ دستی ───────────────────────────── */

/**
 * «ساختِ جزوهٔ مجموعه‌ها» — گذشته را به صف می‌آورد و بعد تا جا دارد می‌سازد.
 *
 * ترتیبش عمدی است: اول کاوش (ارزان، بی‌مدل) و بعد ساخت. برعکسش یعنی
 * کسی که دکمه را می‌زند، بارِ اول هیچ اتفاقی نمی‌بیند چون صف خالی است.
 */
function runHandoutBuild() {
  var b = { queued: 0, series: 0, names: [], wrapped: false };
  try { b = handoutBackfill_(Number(CFG.HANDOUT_SCAN_MAX) || 25); }
  catch (e) { logLine_('کاوشِ قسمت‌های گذشته انجام نشد: ' + e.message); }
  var r = handoutRunDue_(Math.max(1, Number(CFG.HANDOUT_MAX_PER_RUN) || 2));
  var left = 0;
  try { left = handoutDueList_().length; } catch (e2) {}
  var msg = 'جزوه:\n' +
    (b.queued ? '• ' + b.queued + ' درسِ گذشته از ' + b.series + ' مجموعه به صف رفت' +
                (b.names.length ? ' — ' + b.names.slice(0, 6).join('، ') : '') + '\n' : '') +
    '• ' + r.done + ' جزوه همین حالا به‌روز شد\n' +
    '• ' + left + ' درس در صف مانده' +
    (left ? ' — کارِ شبانه ادامه‌شان می‌دهد، یا دوباره همین دکمه را بزنید.' : '.') +
    (b.wrapped ? '\n• کاوشِ همهٔ مجموعه‌ها یک دور کامل شد.' : '') +
    (r.notes.length ? '\n\n' + r.notes.slice(0, 8).join('\n') : '');
  try { SpreadsheetApp.getUi().alert(msg); } catch (e3) { logLine_(msg); }
  return { backfill: b, run: r, left: left };
}
