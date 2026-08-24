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
function handoutUpdate_(folder, meta) {
  var out = { ok: false, why: '', stats: null, url: '' };
  if (CFG.HANDOUT_ENABLED === false) { out.why = 'خاموش'; return out; }
  var ep = (meta && meta.ep) || {};
  var epNum = String((meta && meta.epNum) || '');

  var book = handoutRead_(folder, meta);
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
  if (!secs.length) { out.why = 'این قسمت متنی برای جزوه ندارد'; return out; }

  var refNos = handoutRefsMerge_(book, (ep.__extSources || []), epNum);

  var patch = handoutPatchModel_(book, secs, {
    seriesName: book.seriesName || meta.seriesName, level: meta.level,
    epNum: epNum, epTitle: ep.title || ''
  });
  if (!patch) { out.why = 'مدل جواب نداد'; return out; }

  var st = handoutApply_(book, patch, { epNum: epNum }, refNos);
  if (!st.chapters && !st.sections && !st.amended) { out.why = 'وصله خالی بود'; return out; }

  book.seriesKey = book.seriesKey || String(meta.seriesKey || '');
  book.seriesName = book.seriesName || String(meta.seriesName || '');
  book.cat = book.cat || String(meta.seriesCat || '');
  book.level = book.level || String(meta.level || '');
  book.episodes.push({ n: epNum, title: String(ep.title || ''), at: nowStr_(),
                       chapters: String(st.chapters), sections: String(st.sections),
                       amended: String(st.amended), radioDropped: String(dropped) });
  book.revision = Number(book.revision || 0) + 1;
  book.updatedAt = nowStr_();
  handoutRoadmapState_(book, meta.progress);

  handoutWrite_(folder, book);
  var file = handoutRender_(folder, book);
  out.ok = true; out.stats = st; out.url = file.getUrl();
  logLine_('جزوهٔ «' + book.seriesName + '» به‌روز شد — ' + st.chapters + ' فصلِ تازه، ' +
           st.sections + ' بخش، ' + st.amended + ' تکمیلِ درس‌های قبلی' +
           (dropped ? '، ' + dropped + ' جملهٔ رادیویی انداخته شد' : '') +
           (st.orphan ? '، ' + st.orphan + ' شناسهٔ ناشناخته (نجات داده شد)' : '') + '.');
  return out;
}

/* ───────────────────────────── بدهی و پرداختش ───────────────────────────── */

function handoutDueList_() {
  try { return JSON.parse(props_().getProperty(PK.HANDOUT_DUE) || '[]') || []; }
  catch (e) { return []; }
}

function handoutDueSave_(list) {
  try { props_().setProperty(PK.HANDOUT_DUE, JSON.stringify((list || []).slice(-40))); }
  catch (e) {}
}

/** ثبتِ بدهی در پایانِ هر قسمت. ارزان، بی‌شبکه، و هرگز شکست نمی‌خورد. */
function handoutDueAdd_(seriesKey, epNum) {
  var list = handoutDueList_();
  var k = String(seriesKey || ''), n = String(epNum || '');
  if (!k || !n) return;
  for (var i = 0; i < list.length; i++) {
    if (list[i].key === k && list[i].ep === n) return;
  }
  list.push({ key: k, ep: n, at: nowStr_() });
  handoutDueSave_(list);
}

/**
 * پرداختِ بدهی — از پوشه و فایلِ وضعیتِ خودِ همان قسمت.
 *
 * چرا از `_special.json` و نه از حافظه: بدهی می‌تواند شب‌ها بعد پرداخت شود،
 * و تا آن موقع هیچ متنی در حافظهٔ اجرا نیست. فایلِ وضعیتِ قسمت همان جایی
 * است که متنِ نهایی — با غنی‌سازی و منابعش — نشسته.
 */
function handoutRunDue_(maxItems) {
  var res = { tried: 0, done: 0, left: 0, notes: [] };
  if (CFG.HANDOUT_ENABLED === false) return res;
  var list = handoutDueList_();
  if (!list.length) return res;
  var cap = Math.max(1, Number(maxItems) || Number(CFG.HANDOUT_MAX_PER_RUN) || 2);
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  var keep = [];

  for (var i = 0; i < list.length; i++) {
    if (res.tried >= cap) { keep.push(list[i]); continue; }
    res.tried++;
    var item = list[i], ok = false;
    try {
      var rec = reg.byKey[String(item.key)] || null;
      if (!rec) { res.notes.push('مجموعهٔ «' + item.key + '» در رجیستری نیست'); continue; }
      var sf = seriesFolder_(reg, rec);
      var meta = handoutEpisodeMeta_(sf, item.ep);
      if (!meta) { res.notes.push('فایلِ وضعیتِ درسِ ' + item.ep + ' پیدا نشد'); continue; }
      meta.seriesKey = item.key;
      meta.seriesName = meta.seriesName || String(rec.vals[SC.NAME - 1] || '');
      meta.level = meta.level || String(rec.vals[SC.LEVEL - 1] || '');
      meta.progress = { done: Number(rec.vals[SC.CUR_CHUNK - 1]) || 0,
                        total: Number(rec.vals[SC.CHUNKS - 1]) || 0 };
      var u = handoutUpdate_(sf, meta);
      ok = u.ok;
      if (!ok) res.notes.push('درسِ ' + item.ep + ': ' + u.why);
      else {
        res.done++;
        try {
          if (SC.HANDOUT && reg.sheet) reg.sheet.getRange(rec.row, SC.HANDOUT).setValue(u.url);
        } catch (eW) {}
      }
      // «قبلاً هست» و «متنی ندارد» بدهی نیستند؛ نگه‌داشتنشان یعنی هر شب
      // دوباره تلاش و هر شب دوباره شکست.
      if (!ok && u.why && u.why.indexOf('قبلاً') === -1 && u.why.indexOf('متنی') === -1 &&
          u.why !== 'خاموش') keep.push(item);
    } catch (e) {
      res.notes.push('درسِ ' + item.ep + ': ' + e.message);
      keep.push(item);
    }
  }
  res.left = keep.length;
  handoutDueSave_(keep);
  return res;
}

/** فایلِ وضعیتِ یک قسمت را در پوشهٔ مجموعه پیدا می‌کند. */
function handoutEpisodeMeta_(seriesFolder, epNum) {
  var want = String(epNum);
  var subs = seriesFolder.getFolders();
  while (subs.hasNext()) {
    var f = subs.next();
    var it = f.getFilesByName('_special.json');
    if (!it.hasNext()) continue;
    try {
      var m = JSON.parse(it.next().getBlob().getDataAsString());
      if (m && String(m.epNum) === want) return m;
    } catch (e) {}
  }
  return null;
}

/* ───────────────────────────── دیده‌شدن ───────────────────────────── */

/** وضعیتِ جزوه‌ها برای `_STATUS.json` — بی‌شبکه، ارزان. */
function handoutStatus_() {
  var out = { enabled: CFG.HANDOUT_ENABLED !== false, series: [], due: 0, stale: [] };
  try { out.due = handoutDueList_().length; } catch (e) {}
  try {
    var hub = getHub_();
    var reg = readSeriesReg_(hub);
    for (var i = 0; i < reg.rows.length; i++) {
      var rec = reg.rows[i];
      var eps = String(rec.vals[SC.EPISODES - 1] || '').trim();
      if (!eps) continue;                       // هنوز قسمتی نساخته — جزوه هم لازم ندارد
      var fid = String(rec.vals[SC.FOLDER - 1] || '');
      if (!fid) continue;
      var row = { name: String(rec.vals[SC.NAME - 1] || rec.key),
                  episodes: eps.split(/\s+/).filter(String).length,
                  chapters: 0, sections: 0, refs: 0, covered: 0, updatedAt: '', missing: true };
      try {
        var b = handoutRead_(DriveApp.getFolderById(fid), null);
        if (b.revision) {
          row.missing = false;
          row.chapters = b.chapters.length;
          row.refs = b.refs.length;
          row.covered = (b.episodes || []).length;
          row.updatedAt = b.updatedAt;
          for (var c = 0; c < b.chapters.length; c++) row.sections += (b.chapters[c].sections || []).length;
        }
      } catch (e2) {}
      if (row.missing || row.covered < row.episodes) out.stale.push(row.name);
      out.series.push(row);
    }
  } catch (e3) { out.error = String(e3.message || e3); }
  return out;
}

/**
 * ایرادهای جزوه، برای وارسیِ سلامت و ناظر.
 *
 * خواستهٔ صریحِ صاحبِ برنامه: «باید این قابلیت و به‌روزرسانی‌شدنش حتماً موردِ
 * توجهِ ناظر به‌طور مکرر قرار بگیرد و گزارش بشود.» پس این‌ها هر روز سنجیده
 * می‌شوند، نه یک بار.
 */
function handoutHealth_(problems, notes) {
  if (CFG.HANDOUT_ENABLED === false) return;
  var st = null;
  try { st = handoutStatus_(); } catch (e) { return; }
  if (!st || !st.series.length) return;
  for (var i = 0; i < st.series.length; i++) {
    var r = st.series[i];
    if (r.missing) {
      problems.push('جزوهٔ مجموعهٔ «' + r.name + '» ساخته نشده، با اینکه ' +
                    r.episodes + ' قسمت از آن تولید شده است.');
      continue;
    }
    if (r.covered < r.episodes) {
      problems.push('جزوهٔ «' + r.name + '» عقب است: ' + r.covered + ' درس در جزوه، ' +
                    r.episodes + ' قسمت تولیدشده.');
    }
    if (!r.refs && notes) {
      notes.push('جزوهٔ «' + r.name + '» هیچ ارجاعی ندارد — یا غنی‌سازی منبعی نداده، ' +
                 'یا منبع‌ها به جزوه نمی‌رسند.');
    }
  }
  if (st.due > 3) {
    problems.push('صفِ به‌روزرسانیِ جزوه ' + st.due + ' درس عقب افتاده است.');
  }
}

/* ───────────────────────────── دکمهٔ دستی ───────────────────────────── */

/** «ساختِ جزوهٔ مجموعه‌ها» — بدهیِ معوق را همین حالا پرداخت می‌کند. */
function runHandoutBuild() {
  var r = handoutRunDue_(Math.max(1, Number(CFG.HANDOUT_MAX_PER_RUN) || 2));
  var msg = 'جزوه: ' + r.done + ' به‌روز شد، ' + r.left + ' در صف باقی ماند.' +
            (r.notes.length ? '\n' + r.notes.join('\n') : '');
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { logLine_(msg); }
  return r;
}
