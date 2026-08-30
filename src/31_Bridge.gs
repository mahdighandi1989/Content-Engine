/* ═══════════════════════════════════════════════════════════════════════
 * ۳۱) ارجاعِ میان‌مجموعه‌ای — مجموعهٔ فعلی ستون‌فقرات می‌مانَد
 * ═══════════════════════════════════════════════════════════════════════
 *
 * خواستهٔ صاحبِ برنامه، عیناً:
 *
 *   «می‌خوام برای هر مجموعه انتخاب کنم که مجموعه‌های قبلی که تولیدات و جزوه
 *    براشون انجام شده رو از لیستی انتخاب کنم … بتونه یه ارتباط معنایی بده
 *    با مجموعهٔ فعلی. یعنی مجموعهٔ فعلی باید به‌عنوانِ ستون‌فقرات و بیسِ کار
 *    باقی بمونه و اصلاً نباید متنش با اون متن‌ها قاطی بشه و باید یه نفر که
 *    گوش می‌ده بفهمه داره پادکستِ اون مجموعه رو گوش می‌ده — ولی در ضمنِ این،
 *    اگر مجموعه‌هایی انتخاب شده بودن، باید حتماً در جاهایی که لازمه بهشون
 *    ارجاع داده بشه و رابطشون رو بگه.»
 *
 * ── چهار تصمیم، و دلیلِ هرکدام ─────────────────────────────────────────
 *
 * **۱) ورودیِ ارجاع، جزوهٔ آن مجموعه است — نه قسمت‌هایش، نه درسِ متناظرش.**
 * تأکیدِ صریحِ او: «این نباشه که برای درسِ یکِ مجموعهٔ انتخاب‌شده لزوماً به
 * درسِ یکِ مجموعهٔ مرجع هدایت بشه، بلکه باید به همهٔ محتوا مراجعه بشه.»
 * `_HANDOUT.json` دقیقاً همین است: همهٔ مفاهیمِ همهٔ درس‌های آن مجموعه،
 * فصل‌بندی‌شده و پاک‌شده از لحنِ رادیویی — و هر شب تازه می‌شود. پس «همهٔ
 * محتوا» یک خواندنِ پرونده است، نه هفده پوشه؛ و ترتیبِ درس‌ها هیچ نقشی در
 * انتخابِ محلِ ارجاع ندارد، چون کلِ کتاب یک‌جا جلوی مدل است.
 *
 * **۲) کشفِ رابطه، یک فراخوانِ جداست — پیش از نوشتنِ درس.**
 * اگر همین را داخلِ پرامپتِ نویسنده می‌گذاشتیم، مدل هم‌زمان باید درس را
 * می‌نوشت و رابطه را کشف می‌کرد؛ و کاری که هم‌زمان با کارِ دیگری انجام شود،
 * همان کاری است که سرسری می‌شود. همان دلیلی که `speak2` و `explain` را
 * فراخوانِ جدا کرد. اینجا مدل **فقط** یک سؤال دارد: این درس و آن کتاب چه
 * نسبتی دارند؟
 *
 * **۳) نسبت، لزوماً هم‌موضوعی نیست — و این مهم‌ترین بندِ کلِ بخش است.**
 * مثالِ خودش: «مجموعهٔ معرفت‌شناسی را برای مجموعهٔ خداشناسی انتخاب کردم…
 * در طرحِ ولایت معرفت‌شناسی مقدم بر خداشناسی است، حتماً علتی داشته… شاید
 * گزاره‌های موجود در خداشناسی نیازمندِ این باشند که به‌وسیلهٔ معرفت‌شناسی
 * ارزیابی بشن و صدق و کذبشان از طریقِ اون تأیید بشه. این مثال را زدم که
 * ارتباط را لزوماً بر اساسِ این پیدا نکنی که هر دو دربارهٔ یک چیز حرف زدن.»
 *
 * پس فهرستِ نسبت‌ها صریح است و «هم‌موضوعی» فقط یکی از هفت‌تاست — و عمداً
 * آخرین. اگر تنها چیزی که مدل پیدا می‌کند «هر دو دربارهٔ خداست» باشد، آن
 * ارجاع ارزشِ گفتن ندارد.
 *
 * **۴) مرزِ ستون‌فقرات در کد است، نه در خواهش.**
 * `BRIDGE_MAX_LINKS` سقفِ شمارِ ارجاع در یک قسمت است و `bridgeTrim_` آن را
 * اعمال می‌کند؛ پرامپتِ نویسنده ارجاع‌ها را به‌عنوان **حاشیه** می‌گیرد، نه
 * منبع؛ و هیچ ارجاعی جای بخشی از درس را نمی‌گیرد. «تعدادِ ارجاع را کم بنویس»
 * یک خواهش است و مدل روزی نادیده‌اش می‌گیرد — قاعدهٔ همیشگیِ این ریپو:
 * سقفی که فقط در پرامپت گفته شده، سقف نیست.
 *
 * ── و یک نه ───────────────────────────────────────────────────────────
 * وقتی رابطهٔ واقعی‌ای نیست، هیچ ارجاعی ساخته نمی‌شود. ارجاعِ زورکی دقیقاً
 * همان چیزی است که او از آن ترسید: «بدونِ لوث شدن و بی‌معنی شدن و جوری که
 * حرفه‌ای بودن رو زیرِ سؤال نبره.» یک قسمتِ بی‌ارجاع سالم است؛ یک قسمت با
 * ارجاعِ ساختگی نیست.
 */

/** نسبت‌هایی که مدل مجاز است اعلام کند — و «هم‌موضوعی» عمداً آخر است. */
var BRIDGE_KINDS = {
  'پیش‌نیاز': 'آن مجموعه مقدمهٔ فهمِ این است؛ بی آن، این حرف روی هوا می‌مانَد.',
  'ابزارِ سنجش': 'آن مجموعه ابزاری می‌دهد که با آن می‌شود صدق و کذبِ گزارهٔ این درس را سنجید.',
  'روش': 'آن مجموعه روشِ کار را می‌دهد و این درس آن روش را روی موضوعِ خودش اجرا می‌کند.',
  'تکمیل': 'آن مجموعه همین بحث را از جای دیگری کامل می‌کند.',
  'تنش': 'آن مجموعه چیزی می‌گوید که با این درس می‌سازد یا نمی‌سازد، و همین اختلاف خودش آموزنده است.',
  'کاربرد': 'این درس نشان می‌دهد آنچه آنجا آموخته شد به چه کار می‌آید.',
  'هم‌موضوع': 'هر دو دربارهٔ یک چیز حرف می‌زنند — ضعیف‌ترین نسبت؛ فقط وقتی چیزِ تازه‌ای اضافه کند.'
};

/* همهٔ فیلدها رشته‌اند — قاعدهٔ شمای این ریپو. */
var BRIDGE_SCHEMA = {
  type: 'object',
  properties: {
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          seriesKey: { type: 'string' },   // کدام مجموعهٔ مرجع
          kind: { type: 'string' },        // یکی از BRIDGE_KINDS
          claim: { type: 'string' },       // آن مجموعه دقیقاً چه گفته
          chapter: { type: 'string' },     // کدام فصلِ آن کتاب
          relation: { type: 'string' },    // نسبتش با این درس، در یک جمله
          atHeading: { type: 'string' },   // عنوانِ بخشی از این درس که ارجاع آنجا بنشیند
          say: { type: 'string' },         // متنِ پیشنهادیِ گفتاری، دو تا چهار جمله
          strength: { type: 'string' }     // «قوی» | «متوسط» | «ضعیف»
        },
        required: ['seriesKey', 'kind', 'claim', 'relation', 'atHeading', 'say']
      }
    },
    none: { type: 'string' }               // اگر هیچ نسبتِ واقعی‌ای نبود، علتش
  },
  required: ['links']
};

/** کلیدهای مجموعه‌های مرجعِ یک ردیفِ رجیستری. */
function bridgeKeys_(rec) {
  var raw = '';
  try { raw = String((rec && rec.vals && rec.vals[SC.XREF - 1]) || ''); } catch (e) { raw = ''; }
  var out = [], seen = Object.create(null);
  var parts = raw.replace(/[،؛]/g, ',').split(/[,\n]+/);
  for (var i = 0; i < parts.length; i++) {
    var k = parts[i].trim();
    if (!k || seen[k]) continue;
    seen[k] = 1; out.push(k);
  }
  return out.slice(0, Math.max(1, Number(CFG.BRIDGE_MAX_SERIES) || 4));
}

/**
 * انتخابِ آدم را می‌نویسد. **مجموعه هرگز خودش را مرجعِ خودش نمی‌گیرد** —
 * وگرنه کتابِ خودش دو بار در پرامپت می‌آمد و مدل به «قبلاً گفتیم» ارجاع
 * می‌داد که در همین قسمت گفته می‌شود.
 */
function bridgeSave_(hub, key, keys) {
  var reg = readSeriesReg_(hub || getHub_());
  var rec = reg.byKey[String(key)];
  if (!rec) return { ok: false, why: 'مجموعه پیدا نشد' };
  var clean = [], seen = Object.create(null);
  for (var i = 0; i < (keys || []).length; i++) {
    var k = String(keys[i] || '').trim();
    if (!k || k === String(key) || seen[k] || !reg.byKey[k]) continue;
    seen[k] = 1; clean.push(k);
  }
  clean = clean.slice(0, Math.max(1, Number(CFG.BRIDGE_MAX_SERIES) || 4));
  var sh = ensureTab_(hub || getHub_(), CFG.SERIES_TAB, SERIES_HEADERS);
  sh.getRange(rec.row, SC.XREF, 1, 1).setValues([[clean.join('، ')]]);
  return { ok: true, n: clean.length, keys: clean };
}

/**
 * مجموعه‌هایی که *می‌شود* به آن‌ها ارجاع داد.
 *
 * شرط: جزوه دارند. خواستهٔ او «مجموعه‌های قبلی که تولیدات و جزوه براشون
 * انجام شده» بود، و جزوه دقیقاً همان چیزی است که این بخش می‌خواند — پس
 * مجموعه‌ای بی‌جزوه در فهرست آمدن یعنی تیکی که هیچ اثری ندارد.
 * یک خواندنِ تبِ درس‌نامه برای همه، نه یکی به‌ازای هر مجموعه (قاعدهٔ ۵٫۸۷).
 */
function bridgeCandidates_(hub, reg) {
  var out = [];
  try {
    hub = hub || getHub_();
    reg = reg || readSeriesReg_(hub);
    var made = {};
    try { made = recapPartsMap_(hub); } catch (eM) { made = {}; }
    for (var i = 0; i < (reg.rows || []).length; i++) {
      var rec = reg.rows[i];
      var name = String(rec.vals[SC.NAME - 1] || rec.key);
      var n = Number(made[name]) || 0;
      if (!n) continue;                       // هنوز درسی از آن ساخته نشده
      out.push({ key: String(rec.key), name: name, made: n,
                 cat: String(rec.vals[SC.CAT - 1] || '') });
    }
    out.sort(function (a, b) { return b.made - a.made; });
  } catch (e) {}
  return out;
}

/**
 * کتابِ هر مجموعهٔ مرجع، فشرده برای پرامپت.
 *
 * عنوانِ فصل‌ها و بخش‌ها و «نکتهٔ کلیدی»ِ هر بخش — نه متنِ کاملشان. آنچه
 * برای *کشفِ نسبت* لازم است، نقشهٔ مفاهیم است نه متنِ درس؛ و متنِ کاملِ چهار
 * کتاب پرامپت را از خودِ درس بزرگ‌تر می‌کرد، که یعنی درس در حاشیه می‌رفت.
 */
function bridgeCorpus_(reg, keys) {
  var out = [];
  var cap = Math.max(2000, Number(CFG.BRIDGE_CORPUS_CHARS) || 14000);
  for (var i = 0; i < (keys || []).length; i++) {
    var rec = reg.byKey[String(keys[i])];
    if (!rec) continue;
    var name = String(rec.vals[SC.NAME - 1] || rec.key);
    var book = null;
    try { book = handoutRead_(seriesFolder_(reg, rec), { seriesKey: rec.key, seriesName: name }); }
    catch (eB) { book = null; }
    var chs = (book && book.chapters) || [];
    if (!chs.length) continue;                // جزوه ندارد: چیزی برای ارجاع نیست
    var L = [], used = 0;
    for (var c = 0; c < chs.length; c++) {
      var head = '— فصل: ' + String(chs[c].title || '');
      L.push(head); used += head.length;
      var secs = chs[c].sections || [];
      for (var t = 0; t < secs.length; t++) {
        var tk = String(secs[t].takeaway || '').replace(/\s+/g, ' ').trim();
        if (!tk) tk = String(secs[t].body || '').replace(/\s+/g, ' ').trim().slice(0, 180);
        var line = '   • ' + String(secs[t].title || '') + (tk ? ' — ' + tk : '');
        if (used + line.length > cap) { L.push('   … (ادامهٔ کتاب جا نشد)'); break; }
        L.push(line); used += line.length;
      }
      if (used > cap) break;
    }
    out.push({ key: String(rec.key), name: name, chapters: chs.length, text: L.join('\n') });
  }
  return out;
}

function bridgePrompt_(ctx, corpus) {
  var L = [
    'کارِ تو: کشفِ **نسبت** میان یک درسِ در حالِ نوشته‌شدن و یک یا چند مجموعهٔ',
    'درسیِ دیگر که پیش‌تر تدریس شده‌اند. تو درس را نمی‌نویسی؛ فقط می‌گویی کجا و',
    'چرا باید به آن مجموعه‌ها ارجاع داده شود.',
    '',
    '── درسی که دارد نوشته می‌شود ──',
    'مجموعه: «' + String(ctx.seriesName || '') + '»',
    'موضوعِ این قسمت: ' + String(ctx.partName || ''),
    '',
    'متنِ خامِ این قسمت (خلاصه):',
    String(ctx.digest || '').slice(0, 12000),
    ''
  ];
  for (var i = 0; i < corpus.length; i++) {
    L.push('── مجموعهٔ مرجع ' + (i + 1) + ' — شناسه: ' + corpus[i].key + ' ──');
    L.push('نام: «' + corpus[i].name + '»');
    L.push(corpus[i].text);
    L.push('');
  }
  L.push('── نسبت‌های مجاز ──');
  for (var k in BRIDGE_KINDS) {
    if (Object.prototype.hasOwnProperty.call(BRIDGE_KINDS, k)) {
      L.push('• ' + k + ': ' + BRIDGE_KINDS[k]);
    }
  }
  L.push('');
  L.push('── قاعده‌ها ──');
  L.push('');
  /* ══ مهم‌ترین بندِ کلِ این پرامپت ══
     خواستهٔ صریحِ او: ارتباط را «لزوماً بر اساسِ این پیدا نکن که هر دو دربارهٔ
     یک چیز حرف زدن». مثالِ خودش را عیناً می‌آوریم، چون یک مثالِ واقعی از ده
     سطر توضیح بیشتر کار می‌کند — و چون همان مثال نشان می‌دهد که نسبت می‌تواند
     **ساختاری** باشد، بی آنکه حتی یک سرفصل مشترک باشد. */
  L.push('۱) **نسبت لزوماً هم‌موضوعی نیست، و این مهم‌ترین نکته است.** دنبالِ این');
  L.push('   نگرد که هر دو دربارهٔ یک چیز حرف زده‌اند. نسبت می‌تواند کاملاً');
  L.push('   ساختاری باشد، بی آنکه حتی یک سرفصلِ مشترک وجود داشته باشد.');
  L.push('');
  L.push('   مثالِ واقعی: در یک برنامهٔ درسی، «معرفت‌شناسی» عمداً پیش از');
  L.push('   «خداشناسی» گذاشته شده. هیچ سرفصلی مشترک نیست. ولی نسبت هست و');
  L.push('   قوی است: گزاره‌های خداشناسی گزاره‌هایی‌اند که باید صدق و کذبشان');
  L.push('   سنجیده شود، و ابزارِ آن سنجش را معرفت‌شناسی داده. پس نسبتش');
  L.push('   «ابزارِ سنجش» و «پیش‌نیاز» است، نه «هم‌موضوع».');
  L.push('');
  L.push('   اگر ترتیبی میان دو مجموعه هست، بپرس **چرا آن ترتیب انتخاب شده** —');
  L.push('   جواب معمولاً همان نسبت است.');
  L.push('');
  L.push('۲) **به کلِ آن کتاب نگاه کن، نه به درسِ متناظر.** ربطی ندارد که این');
  L.push('   قسمت چندمین درسِ مجموعه است؛ ممکن است نسبتش با فصلِ آخرِ آن کتاب');
  L.push('   باشد. همهٔ فصل‌ها جلوی توست، همه را بخوان.');
  L.push('');
  L.push('۳) **مجموعهٔ فعلی ستون‌فقرات است.** ارجاع یک اشارهٔ کوتاه در حاشیه است،');
  L.push('   نه یک بخشِ تازه. شنونده باید تا آخر بداند دارد پادکستِ «' +
         String(ctx.seriesName || '') + '» را گوش می‌دهد. هرگز پیشنهاد نده که');
  L.push('   بحثِ آن مجموعه اینجا باز شود.');
  L.push('');
  L.push('۴) `atHeading` باید **عنوانِ یکی از بخش‌های همین درس** باشد؛ جایی که');
  L.push('   ارجاع در آن طبیعی می‌نشیند. اگر جای طبیعی‌ای نیست، آن ارجاع را نده.');
  L.push('');
  L.push('۵) `say` دو تا چهار جملهٔ **گفتاری** است، به همان لحنِ پادکست: نامِ آن');
  L.push('   مجموعه را بگو، بگو آنجا چه گفته شد، و نسبتش با همین لحظه را روشن');
  L.push('   کن. نه فهرست، نه ارجاعِ کتابی، نه «همان‌طور که می‌دانید».');
  L.push('   هیچ واژهٔ لاتین و هیچ رقمِ عددی ننویس.');
  L.push('');
  L.push('۶) **حداکثر ' + (Number(CFG.BRIDGE_MAX_LINKS) || 3) + ' ارجاع.** کمتر بهتر است.');
  L.push('   ارجاعی که نسبتش «ضعیف» است اصلاً نده — یک قسمتِ بی‌ارجاع سالم است،');
  L.push('   یک قسمت با ارجاعِ ساختگی نیست.');
  L.push('');
  L.push('۷) اگر هیچ نسبتِ واقعی‌ای پیدا نکردی، `links` را خالی بگذار و در `none`');
  L.push('   یک جمله بنویس که چرا. این جوابِ درستی است، نه شکست.');
  return L.join('\n');
}

/**
 * نسبت‌ها را کشف می‌کند. برمی‌گرداند `{links, none, series}` یا null.
 * هرگز پرتاب نمی‌کند: ارجاع یک **افزوده** است و نبودش نباید قسمت را بخواباند.
 */
function bridgePlan_(ctx, corpus) {
  if (!corpus || !corpus.length) return null;
  var r = null;
  try { r = geminiText_(bridgePrompt_(ctx, corpus), BRIDGE_SCHEMA, 30000); }
  catch (e) { logLine_('ارجاعِ میان‌مجموعه‌ای ساخته نشد: ' + e.message); return null; }
  if (!r) return null;
  var names = Object.create(null);
  for (var i = 0; i < corpus.length; i++) names[corpus[i].key] = corpus[i].name;
  return { links: bridgeTrim_(r.links, names, bridgeStrict_()),
           none: String(r.none || ''),
           series: corpus.map(function (c) { return c.key; }) };
}

/**
 * سقف و پاکسازی — **در کد، نه در پرامپت**.
 *
 * سه چیز اینجا حذف می‌شود و هر سه یک بار دیده شده‌اند در این ریپو:
 * شناسه‌ای که در فهرستِ مرجع‌ها نیست (توهّمِ مدل)، نسبتی خارج از فهرست
 * (اختراعِ دستهٔ تازه)، و ارجاعِ «ضعیف» که خودِ پرامپت گفته بود نده.
 * «سقفی که فقط در پرامپت گفته شده، سقف نیست.»
 */
function bridgeTrim_(links, names, strictKeys) {
  var out = [];
  var max = Math.max(1, Number(CFG.BRIDGE_MAX_LINKS) || 3);
  /* سخت‌گیریِ خودکار (۶٫۴۶): مجموعه‌ای که داوری دو بار ارجاعش را بد دانسته،
     از این پس فقط ارجاعِ «قوی» می‌گیرد. این همان «اصلاحِ خودکار»ی است که
     خودِ موتور می‌تواند انجام دهد — و در همان سدی اعمال می‌شود که بقیهٔ
     مرزها، نه در یک شاخهٔ جدا که روزی فراموش شود. */
  var strict = strictKeys || {};
  /* ══ اینجا عنوانِ بخش‌ها سنجیده **نمی‌شود** — و این عمدی است ══
   * نسخهٔ اول یک نگاشتِ عنوان می‌ساخت تا `atHeading` را با بخش‌های واقعیِ
   * درس بسنجد، و هرگز نخواندش: کدِ مرده، همان شکلی که این ریپو مدام به آن
   * می‌خورَد. ولی حذفش صرفاً تمیزکاری نیست — نبودنش یک واقعیتِ ساختاری را
   * می‌گوید: نقشهٔ ارجاع **پیش از** نوشتنِ درس ساخته می‌شود، پس هنوز هیچ
   * بخشی وجود ندارد که با آن سنجیده شود. `atHeading` یک *نشانیِ موضوعی*
   * است برای نویسنده، نه یک شناسه. سنجشِ واقعی جای دیگری است و پس از
   * نوشتن انجام می‌شود: `bridgeVerify_`. */
  var seen = Object.create(null);
  for (var i = 0; i < (links || []).length && out.length < max; i++) {
    var x = links[i] || {};
    var key = String(x.seriesKey || '').trim();
    if (!names[key]) continue;                                  // شناسهٔ ساختگی
    if (!BRIDGE_KINDS[String(x.kind || '')]) continue;          // نسبتِ اختراعی
    if (String(x.strength || '') === 'ضعیف') continue;          // خودش گفته بود نده
    var st = strict[key];
    if (st && st.on && String(x.strength || '') !== 'قوی') continue;
    var say = String(x.say || '').trim();
    if (say.length < 40) continue;                              // اشارهٔ بی‌محتوا
    /* یک مجموعه، یک ارجاع در هر قسمت. دو ارجاع به یک کتاب در یک قسمتِ
       چهارده‌دقیقه‌ای دقیقاً همان «لوث شدن»ی است که او از آن ترسید. */
    if (seen[key]) continue;
    seen[key] = 1;
    out.push({ seriesKey: key, seriesName: names[key],
               kind: String(x.kind || ''), claim: String(x.claim || '').slice(0, 400),
               chapter: String(x.chapter || '').slice(0, 160),
               relation: String(x.relation || '').slice(0, 400),
               atHeading: String(x.atHeading || '').slice(0, 160),
               say: say.slice(0, 900),
               strength: String(x.strength || 'متوسط') });
  }
  return out;
}

/** بلوکی که به پرامپتِ نویسندهٔ درس اضافه می‌شود. */
function bridgeBlock_(plan, seriesName) {
  var links = (plan && plan.links) || [];
  if (!links.length) return '';
  /* ══ «ارجاع‌ها بسیار ضعیف و گذرا و خلاصه» (۶٫۵۵) ══
     گزارشِ صاحبِ برنامه، پس از شنیدنِ خروجیِ واقعی. مقصر خودِ همین بلوک
     بود: به نویسنده می‌گفت «ارجاع یک اشارهٔ کوتاه است» — و مدل دقیقاً همان
     را ساخت: نیم‌جمله‌ای در گذر. مرزِ درست «کوتاه» نیست؛ «باز نکردنِ درسِ
     آن مجموعه» است. یک بندِ کاملِ سه‌چهار جمله‌ای که نسبت را می‌گوید، هم
     مفصل است هم ستون‌فقرات را نمی‌شکند. */
  var L = ['══ ارجاع به مجموعه‌های پیشین ══',
           'این نسبت‌ها از پیش کشف و تأیید شده‌اند. هرکدام را **در همان بخشی که',
           'گفته شده** بیاور، با متنِ خودت و به لحنِ همین برنامه.',
           '',
           '**هر ارجاع یک بندِ کاملِ سه تا پنج جمله‌ای است، نه نیم‌جمله.** این',
           'چهار جزء باید در آن بند باشد:',
           '  ۱) نامِ صریحِ آن مجموعه؛',
           '  ۲) خودِ حرفِ مشخصی که آن‌جا زده شده — محتوایش، نه فقط «آن‌جا',
           '     دربارهٔ این موضوع گفتیم»؛',
           '  ۳) نسبتِ صریح با بحثِ همین درس، **با اسم بردن از جنسِ نسبت**:',
           '     تأیید می‌کند، نقض می‌کند، پیش‌نیازِ فهمِ این است، ابزارِ سنجشِ',
           '     این را می‌دهد، همان الگو در سطحِ دیگری است…؛',
           '  ۴) یک جمله که شنونده با آن می‌فهمد چرا این پیوند الان به کارش',
           '     می‌آید (مثلاً: بی آن معیار، ادعای این درس را نمی‌شود سنجید).',
           'ارجاعی که فقط بگوید «در فلان مجموعه هم به این پرداختیم» ارجاع نیست؛',
           'ننوشتنش بهتر از نوشتنش است.',
           ''];
  for (var i = 0; i < links.length; i++) {
    var b = links[i];
    L.push('• در بخشِ «' + b.atHeading + '» — نسبت: ' + b.kind);
    L.push('  مجموعهٔ «' + b.seriesName + '»' + (b.chapter ? ' (فصلِ ' + b.chapter + ')' : '') +
           ' گفته: ' + b.claim);
    L.push('  نسبتش با اینجا: ' + b.relation);
    L.push('  پیشنهادِ گفتاری: ' + b.say);
    L.push('');
  }
  /* ══ مرزِ ستون‌فقرات، دوباره و اینجا ══
     همان جمله در پرامپتِ کشف هم هست. تکرارش عمدی است: آنجا به مدلی گفته شد
     که *پیشنهاد* می‌دهد، اینجا به مدلی که *می‌نویسد*. کسی که می‌نویسد
     پرامپتِ قبلی را ندیده. */
  L.push('و این مرز را نشکن:');
  L.push('• مجموعهٔ «' + String(seriesName || '') + '» ستون‌فقرات است. ارجاع یک بندِ');
  L.push('  کامل است ولی یک بخشِ تازه نیست. شنونده باید تا آخر بداند دارد پادکستِ');
  L.push('  همین مجموعه را گوش می‌دهد.');
  L.push('• بحثِ آن مجموعه را اینجا باز نکن و درسش را از نو نده.');
  L.push('• نامِ آن مجموعه را صریح بگو — ارجاعِ بی‌نام، ارجاع نیست.');
  L.push('• ارجاع باید در دلِ حرف بنشیند، نه به‌شکلِ یک تکهٔ چسبانده‌شده.');
  return L.join('\n');
}

/**
 * آیا ارجاع واقعاً در متنِ نوشته‌شده آمد؟
 *
 * ══ باگی که این را لازم کرد ══
 * تا پیش از این، `bridgeLog_` **نقشه** را ثبت می‌کرد، نه آنچه واقعاً گفته
 * شد. یعنی اگر نویسنده بلوکِ ارجاع را نادیده می‌گرفت — که مدل‌ها گاهی
 * می‌گیرند — سیاهه، پروندهٔ قسمت، جزوه و مرورِ بزرگ هر چهار می‌گفتند به
 * «معرفت‌شناسی» ارجاع داده شد، در حالی که در صوت یک کلمه‌اش هم نبود. و
 * چون جزوه و مرور از همین سیاهه می‌خوانند، آن ادعای غلط **وارد محتوای
 * بعدی** هم می‌شد.
 *
 * این دقیقاً همان شکلی است که این ریپو بارها خورده: «تحلیل نوشته شد و به
 * هیچ تصمیمی وصل نشد»، و «هیچ‌کس به خروجی گوش نداد؛ فقط ورودی عوض شد».
 *
 * سنجه عمداً **محافظه‌کار** است — همان قاعدهٔ `recapCoverage_`: ارجاع
 * «نیامده» شمرده می‌شود فقط وقتی *هیچ‌کدام* از واژه‌های شاخصِ نامِ آن مجموعه
 * هیچ‌جای متن نباشد. کفِ حضور را می‌سنجد، نه کیفیتش را؛ و هشداری که فقط با
 * شهادتِ قاطع بلند شود، هشداری است که خوانده می‌شود.
 */
function bridgeVerify_(ep, links) {
  var out = { used: [], missed: [] };
  if (!links || !links.length) return out;
  var rawText = '';
  try { rawText = specialNarration_(ep); } catch (e) { rawText = ''; }
  var norm = function (t) {
    try { t = txNorm(stripTashkil_(String(t || ''))); }
    catch (e2) { t = String(t || '').toLowerCase(); }
    return t.replace(/[^\u0621-\u06FFa-z0-9]+/g, ' ');
  };
  /* ══ عمق را جمله می‌سنجد، نه پنجرهٔ متن (۶٫۵۶) ══
   * نسخهٔ ۶٫۵۵ یک پنجرهٔ ±۲۰۰ نویسه‌ای دورِ نام می‌گرفت — و روایت متنِ
   * پیوسته است، پس آن پنجره تقریباً همیشه پُر بود و thin تقریباً هرگز true
   * نمی‌شد: سنجه‌ای که همیشه «قبول» بدهد، همان «تحلیلِ وصل‌نشده به تصمیم»
   * است، فقط این بار از روزِ اول. آنچه معنا دارد این است: جمله‌هایی که
   * نامِ مرجع در آن‌هاست + جملهٔ پیروِ هرکدام (ارجاعِ واقعی از جملهٔ
   * نام‌بردن سرریز می‌کند) روی هم چقدرند. هم‌پوشانیِ جمله‌های پیاپی عمداً
   * دوباره شمرده می‌شود — سنجه محافظه‌کار می‌مانَد و «گذرا»ی دروغین
   * نمی‌سازد. */
  var sents = [], nsents = [];
  try { sents = speakSentences_(rawText); } catch (e3) { sents = [String(rawText)]; }
  if (!sents.length) sents = [String(rawText)];
  for (var q = 0; q < sents.length; q++) nsents.push(norm(sents[q]));
  for (var i = 0; i < links.length; i++) {
    var terms = bridgeTerms_(links[i].seriesName);
    // نامی که هیچ واژهٔ شاخصی ندارد، قابلِ داوری نیست: «نمی‌دانم» را نباید
    // «نیامده» گزارش کرد.
    if (!terms.length) { out.used.push(links[i]); continue; }
    var hit = false, said = 0;
    for (var sx = 0; sx < nsents.length; sx++) {
      var has = false;
      for (var k = 0; k < terms.length && !has; k++) {
        if (nsents[sx].indexOf(terms[k]) !== -1) has = true;
      }
      if (!has) continue;
      hit = true;
      /* جمله + دو پیرو: ارجاعِ خوش‌ساخت نام را یک بار، اولِ بند می‌گوید و
         بقیهٔ بند بی‌نام ادامه می‌یابد — با یک پیرو، دقیقاً همان جریمه
         می‌شد. سوگیری عمداً به سمتِ «نگفتنِ thin» است: thinِ دروغین
         اعتمادِ به نشانه را می‌بَرد، thinِ ازقلم‌افتاده را داوریِ شبانهٔ
         مدل می‌گیرد. */
      said += sents[sx].length;
      if (sx + 1 < sents.length) said += sents[sx + 1].length;
      if (sx + 2 < sents.length) said += sents[sx + 2].length;
    }
    if (hit) {
      links[i].thin = said < (Number(CFG.BRIDGE_MIN_SAY) || 240);
      out.used.push(links[i]);
    } else out.missed.push(links[i]);
  }
  return out;
}

/** واژه‌های شاخصِ نامِ یک مجموعه — همان شکلی که `recapTerms_` دارد. */
function bridgeTerms_(name) {
  var out = [], seen = Object.create(null);
  var stop = { 'است': 1, 'های': 1, 'برای': 1, 'مجموعه': 1, 'دوره': 1, 'استاد': 1 };
  var raw = String(name || '');
  try { raw = txNorm(stripTashkil_(raw)); } catch (e) { raw = raw.toLowerCase(); }
  var parts = raw.replace(/[^\u0621-\u06FFa-z0-9]+/g, ' ').split(/\s+/);
  for (var i = 0; i < parts.length; i++) {
    var w = parts[i];
    if (w.length < 4 || stop[w] || seen[w]) continue;
    seen[w] = 1; out.push(w);
  }
  return out;
}

/**
 * ثبتِ ارجاع‌ها — «حتماً باید این ارجاعات در جایی ثبتِ دقیق و کامل بشه».
 * یک ردیف برای هر ارجاع، هر بار — چون سؤالی که فردا می‌پرسی «کِی و کجا» است،
 * و فقط تاریخچه جوابش را دارد.
 */
function bridgeLog_(hub, epNum, seriesName, links) {
  if (!links || !links.length) return false;
  try {
    var sh = ensureTab_(hub || getHub_(), CFG.BRIDGE_TAB || 'ارجاع‌های میان‌مجموعه‌ای',
                        BRIDGE_HEADERS);
    var block = [];
    for (var i = 0; i < links.length; i++) {
      var b = links[i];
      block.push([nowStr_(), String(epNum || ''), String(seriesName || ''),
                  b.seriesName, b.kind, b.atHeading, b.claim, b.relation, b.say]);
    }
    appendBlock_(sh, block, BRIDGE_HEADERS.length);
    return true;
  } catch (e) { logLine_('سیاههٔ ارجاع‌ها نوشته نشد: ' + e.message); return false; }
}

var BRIDGE_HEADERS = ['زمان', 'قسمت', 'مجموعهٔ درس', 'مجموعهٔ مرجع', 'نسبت',
                      'در بخشِ', 'آن مجموعه چه گفته', 'نسبتش با این درس', 'متنِ گفته‌شده'];

/**
 * همهٔ کار در یک فراخوان، برای مسیرِ تولید.
 * برمی‌گرداند `{block, links, none}` — و در بدترین حالت `{block:''}`، یعنی
 * قسمت مثلِ همیشه ساخته می‌شود.
 */
function bridgeFor_(hub, reg, rec, ctx) {
  var out = { block: '', links: [], none: '' };
  if (CFG.BRIDGE_ENABLED === false) return out;
  try {
    var keys = bridgeKeys_(rec);
    if (!keys.length) return out;
    var corpus = bridgeCorpus_(reg, keys);
    if (!corpus.length) {
      logLine_('ارجاع: مجموعه‌های انتخاب‌شده جزوه ندارند، پس ارجاعی ساخته نشد.');
      out.none = 'مجموعه‌های انتخاب‌شده هنوز جزوه ندارند';
      return out;
    }
    var plan = bridgePlan_(ctx, corpus);
    if (!plan) return out;
    out.links = plan.links; out.none = plan.none;
    out.block = bridgeBlock_(plan, ctx.seriesName);
    if (plan.links.length) {
      logLine_('ارجاع: ' + plan.links.length + ' ارجاع به ' +
               plan.links.map(function (b) { return '«' + b.seriesName + '» (' + b.kind + ')'; })
                 .join('، ') + '.');
    } else if (plan.none) {
      logLine_('ارجاع: نسبتِ قابلِ‌گفتنی پیدا نشد — ' + plan.none);
    }
  } catch (e) { logLine_('ارجاعِ میان‌مجموعه‌ای رد شد: ' + e.message); }
  return out;
}

/**
 * ارجاع‌های یک مجموعه، برای جزوه و مرورِ بزرگ.
 *
 * خواستهٔ صریحِ او: «اگر آن مجموعه ارجاعاتی داشته برای تولیدِ پادکست‌هاش،
 * قاعدتاً باید این در خودِ مرور و حتی جزوه همگی مورد استفاده و ثبت قرار
 * بگیره و بحث بشه، چون در واقع جزوِ خودِ محتوا شده.»
 *
 * پس منبع همان سیاهه است، نه یک کپیِ دوم: چیزی که در دو جا نگه داشته شود،
 * روزی یکی‌اش کهنه می‌شود.
 */
function bridgeOfSeries_(hub, seriesName, cap) {
  var out = [];
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.BRIDGE_TAB || 'ارجاع‌های میان‌مجموعه‌ای');
    if (!sh || sh.getLastRow() < 2) return out;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, BRIDGE_HEADERS.length).getValues();
    var seen = Object.create(null);
    for (var i = 0; i < v.length; i++) {
      if (String(v[i][2] || '') !== String(seriesName || '')) continue;
      var sig = String(v[i][3]) + '|' + String(v[i][4]) + '|' + String(v[i][6]).slice(0, 60);
      if (seen[sig]) continue;                 // همان نسبت در چند قسمت: یک بار بس است
      seen[sig] = 1;
      out.push({ ep: String(v[i][1] || ''), refSeries: String(v[i][3] || ''),
                 kind: String(v[i][4] || ''), at: String(v[i][5] || ''),
                 claim: String(v[i][6] || ''), relation: String(v[i][7] || '') });
    }
  } catch (e) {}
  return out.slice(0, Math.max(1, Number(cap) || 24));
}

/** متنِ همان ارجاع‌ها برای پرامپتِ جزوه و مرور. */
function bridgeRecapBlock_(list) {
  if (!list || !list.length) return '';
  var L = ['── ارجاع‌هایی که در درس‌های این مجموعه به مجموعه‌های دیگر داده شده ──',
           'این‌ها جزوِ محتوای همین مجموعه‌اند و باید در متن بیایند، نه اینکه',
           'حذف شوند:'];
  for (var i = 0; i < list.length; i++) {
    L.push('• «' + list[i].refSeries + '» (' + list[i].kind + '): ' +
           list[i].claim + (list[i].relation ? ' — ' + list[i].relation : ''));
  }
  return L.join('\n');
}

/** یک سطرِ فارسیِ آماده برای ایمیلِ روزانه — قاعدهٔ ۵٫۹۰. */
function bridgeStatus_(hub) {
  var out = { n: 0, series: 0, line: '' };
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.BRIDGE_TAB || 'ارجاع‌های میان‌مجموعه‌ای');
    if (!sh || sh.getLastRow() < 2) {
      out.line = 'ارجاعِ میان‌مجموعه‌ای: هنوز ارجاعی ساخته نشده' +
                 (CFG.BRIDGE_ENABLED === false ? ' (خاموش است)' :
                  '؛ در تختهٔ مجموعه‌ها برای هر مجموعه می‌توانید مرجع انتخاب کنید') + '.';
      return out;
    }
    var v = sh.getRange(2, 3, sh.getLastRow() - 1, 2).getValues();
    var s = Object.create(null);
    for (var i = 0; i < v.length; i++) { out.n++; s[String(v[i][0])] = 1; }
    for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) out.series++;
    var fa = function (n) { try { return faDigitsOut_(String(n)); } catch (e) { return String(n); } };
    out.line = 'ارجاعِ میان‌مجموعه‌ای: ' + fa(out.n) + ' ارجاع در ' + fa(out.series) +
               ' مجموعه ثبت شده.';
  } catch (e) {}
  return out;
}

/* ═══════════════════════════════════════════════════════════════════
 * داوریِ کیفیتِ ارجاع — حلقه‌ای که خودش می‌بندد (۶٫۴۶)
 * ═══════════════════════════════════════════════════════════════════
 *
 * خواستهٔ صاحبِ برنامه: «بدونِ اینکه من بخوام چیزی بفرستم، همین ارجاع‌دادن‌ها
 * در گزارش‌ها ثبت بشه و اون مطالبی که ارجاع شده همگی دیده و بررسی بشه توسط
 * مدل‌ها یا ناظر، و تعیینِ کیفیت بشه، و اگر لازم شد خودکار برای اصلاحاتش
 * کاری انجام بشه … و این بعدش هم پیگیری بشه و همه‌جا ثبت بشه.»
 *
 * ۶٫۴۴ فقط یک سؤال را می‌پرسید: «آیا ارجاع در متن آمد؟» — یک سنجهٔ حضور،
 * نه کیفیت. یعنی ارجاعی که نامِ مجموعه را می‌گفت ولی حرفی به آن نسبت می‌داد
 * که در آن کتاب **نیست**، بی هیچ اعتراضی رد می‌شد. و آن، دقیقاً همان چیزی
 * است که «حرفه‌ای بودن رو زیرِ سؤال» می‌برد.
 *
 * ── سه سؤالی که پرسیده می‌شود، و چرا این سه ─────────────────────────
 * **۱) وفاداری:** حرفی که به آن مجموعه نسبت داده شده، واقعاً در کتابش هست؟
 *    منبعِ حقیقت جزوهٔ همان مجموعه است — همان ورودی‌ای که ارجاع از آن ساخته
 *    شد. نسبتِ دروغ به یک درسِ خودمان، بدترین شکلِ بی‌اعتباری است.
 * **۲) عمق:** نسبت واقعی است یا سطحی («هر دو دربارهٔ خدا حرف زده‌اند»)؟
 * **۳) ستون‌فقرات:** متن قاطی شده؟ شنونده هنوز می‌فهمد پادکستِ کدام مجموعه
 *    را گوش می‌دهد؟
 *
 * ── و اصلاحِ خودکار ──────────────────────────────────────────────────
 * دو تا داوریِ بد برای یک مجموعه، `bridgeStrictOn_` را روشن می‌کند: از آن
 * پس فقط ارجاعِ «قوی» از `bridgeTrim_` رد می‌شود. این کاری است که موتور
 * **خودش** می‌تواند بکند و همان‌جا هم می‌کند. آنچه از دستش خارج است —
 * عوض‌کردنِ پرامپت یا کد — به‌شکلِ یافتهٔ «کد» در صفِ `NEEDS_CODE` می‌نشیند
 * تا سشنِ ناظر نسخهٔ بعد را از رویش بسازد. دو نوع اصلاح، دو مسیر، و هیچ‌کدام
 * منتظرِ آدم نمی‌مانَد.
 */

var BRIDGE_AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          series: { type: 'string' },
          faithful: { type: 'string' },   // «بله» | «خیر» | «نامعلوم»
          depth: { type: 'string' },      // «عمیق» | «متوسط» | «سطحی»
          backbone: { type: 'string' },   // «حفظ شد» | «قاطی شد»
          natural: { type: 'string' },    // «طبیعی» | «چسبانده»
          why: { type: 'string' }
        },
        required: ['series', 'faithful', 'depth', 'backbone', 'why']
      }
    }
  },
  required: ['verdicts']
};

/** نامِ عکسِ داوری — همان الگوی `auditSnapName_`. */
function bridgeSnapName_(epNum) {
  return '_BRIDGE-' + ('000' + epNum).slice(-3) + '.json';
}

/**
 * عکسِ ارجاع‌های یک قسمت، برای داوریِ شبانه.
 * چرا شبانه و نه همان‌جا: تولید بودجهٔ شش‌دقیقه‌ای دارد و یک فراخوانِ مدلِ
 * دیگر در مسیرِ بحرانی، همان چیزی است که ۵٫۶۸ از نصبِ کد یاد گرفت.
 */
function bridgeSnap_(epNum, seriesName, links, ep) {
  if (CFG.BRIDGE_AUDIT === false || !links || !links.length) return false;
  try {
    var txt = '';
    try { txt = specialNarration_(ep); } catch (e) { txt = ''; }
    auditPutJson_(bridgeSnapName_(epNum), {
      at: nowStr_(), epNum: Number(epNum) || 0, seriesName: String(seriesName || ''),
      links: links.map(function (b) {
        return { seriesKey: b.seriesKey, seriesName: b.seriesName, kind: b.kind,
                 claim: b.claim, relation: b.relation, atHeading: b.atHeading };
      }),
      text: String(txt).slice(0, 24000)
    });
    return true;
  } catch (e) { logLine_('عکسِ داوریِ ارجاع نوشته نشد: ' + e.message); return false; }
}

/** عکس‌هایی که هنوز داوری نشده‌اند — قدیمی‌ها اول. */
function bridgePending_() {
  var out = [], done = Object.create(null);
  try {
    var raw = props_().getProperty(PK.BRIDGE_DONE) || '';
    var arr = raw ? raw.split('|') : [];
    for (var d = 0; d < arr.length; d++) if (arr[d]) done[arr[d]] = 1;
  } catch (e0) {}
  try {
    var it = auditFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (String(f.getName()).indexOf('_BRIDGE-') !== 0) continue;
      if (done[String(f.getId())]) continue;
      out.push(f);
    }
  } catch (e) {}
  out.sort(function (a, b) { return a.getName() < b.getName() ? -1 : 1; });
  return out;
}

function bridgeMarkDone_(file) {
  try {
    var raw = props_().getProperty(PK.BRIDGE_DONE) || '';
    var arr = raw ? raw.split('|') : [];
    arr.push(String(file.getId()));
    if (arr.length > 60) arr = arr.slice(arr.length - 60);
    props_().setProperty(PK.BRIDGE_DONE, arr.join('|'));
  } catch (e) {}
}

/** مجموعه‌هایی که سخت‌گیریِ خودکار گرفته‌اند. */
function bridgeStrict_() {
  try {
    var o = JSON.parse(props_().getProperty(PK.BRIDGE_STRICT) || '{}');
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

/**
 * اصلاحِ خودکار: شمارندهٔ بدِ یک مجموعه را بالا می‌برد و در سقف، سخت‌گیری
 * را روشن می‌کند. **درِ بازگشت دارد** — یک داوریِ خوب شمارنده را صفر می‌کند
 * و قفل را برمی‌دارد؛ گیتی که آدم و ماشین هیچ‌کدام نتوانند بازش کنند، همان
 * شکلی است که این ریپو مدام به آن می‌خورَد.
 */
function bridgeStrictBump_(seriesKey, bad) {
  try {
    var o = bridgeStrict_();
    var k = String(seriesKey || '');
    if (!k) return false;
    var rec = o[k] || { bad: 0, on: false, at: '' };
    if (bad) {
      rec.bad = (Number(rec.bad) || 0) + 1;
      if (rec.bad >= Math.max(1, Number(CFG.BRIDGE_BAD_STRICT) || 2) && !rec.on) {
        rec.on = true; rec.at = nowStr_();
        logLine_('ارجاع: سخت‌گیریِ خودکار برای «' + k + '» روشن شد — از این پس فقط ارجاعِ «قوی».');
      }
    } else {
      if (rec.on) logLine_('ارجاع: سخت‌گیریِ خودکار برای «' + k + '» برداشته شد.');
      rec.bad = 0; rec.on = false;
    }
    o[k] = rec;
    props_().setProperty(PK.BRIDGE_STRICT, JSON.stringify(o));
    return !!rec.on;
  } catch (e) { return false; }
}

function bridgeAuditPrompt_(snap, books) {
  var L = ['کارِ تو: **داوریِ کیفیتِ ارجاع‌های میان‌مجموعه‌ای** در یک قسمتِ پادکست.',
           '',
           'یک درسِ پادکست از مجموعهٔ «' + String(snap.seriesName || '') + '» ساخته شده و',
           'در آن به یک یا چند مجموعهٔ درسیِ دیگر ارجاع داده شده. تو باید بگویی آن',
           'ارجاع‌ها **درست و ارزشمند** بوده‌اند یا نه.',
           '',
           '── متنِ گفته‌شدهٔ قسمت ──',
           String(snap.text || '').slice(0, 16000),
           ''];
  for (var i = 0; i < books.length; i++) {
    L.push('── کتابِ مرجع: «' + books[i].name + '» (منبعِ حقیقت) ──');
    L.push(books[i].text);
    L.push('');
  }
  L.push('── ارجاع‌هایی که ادعا شده داده شده ──');
  for (var j = 0; j < (snap.links || []).length; j++) {
    var b = snap.links[j];
    L.push('• به «' + b.seriesName + '» — نسبت: ' + b.kind);
    L.push('  ادعا شده آنجا گفته: ' + b.claim);
    L.push('  و نسبتش با این درس: ' + b.relation);
  }
  L.push('');
  L.push('برای **هر** ارجاع سه چیز را جدا داوری کن:');
  L.push('');
  /* وفاداری اول می‌آید چون تنها موردی است که می‌تواند اعتبارِ برنامه را از
     بین ببرد: نسبتِ دروغ به درسِ خودمان. */
  L.push('۱) `faithful` — آنچه به آن مجموعه نسبت داده شده، **واقعاً در کتابش**');
  L.push('   هست؟ کتابِ مرجع بالا آمده؛ همان منبعِ حقیقت است. «بله» فقط وقتی');
  L.push('   که بتوانی جایش را در کتاب نشان بدهی. اگر حرفی به آن نسبت داده');
  L.push('   شده که در کتاب نیست — حتی اگر حرفِ درستی باشد — «خیر».');
  L.push('');
  L.push('۲) `depth` — نسبت واقعی است یا سطحی؟ «سطحی» یعنی چیزی جز');
  L.push('   «هر دو دربارهٔ یک موضوع حرف زده‌اند» نمی‌گوید. «عمیق» یعنی نبودنش،');
  L.push('   فهمِ شنونده را کم می‌کرد.');
  L.push('');
  L.push('۳) `backbone` — آیا مجموعهٔ «' + String(snap.seriesName || '') + '» ستون‌فقرات');
  L.push('   مانده؟ «قاطی شد» یعنی متن جوری رفته که شنونده دیگر نمی‌داند');
  L.push('   پادکستِ کدام مجموعه را گوش می‌دهد، یا بحثِ آن مجموعه اینجا باز شده.');
  L.push('');
  L.push('و `natural`: «طبیعی» اگر در دلِ حرف نشسته، «چسبانده» اگر تکه‌ای');
  L.push('وصله‌شده به نظر می‌رسد.');
  L.push('');
  L.push('در `why` در یک جمله بگو چرا. سخت‌گیر باش: این داوری برای بهترشدن است،');
  L.push('نه برای تأیید. اگر ارجاعی اصلاً در متن پیدا نکردی، `faithful` را');
  L.push('«نامعلوم» بگذار و در `why` بنویس که پیدایش نکردی.');
  return L.join('\n');
}

var BRIDGE_AUDIT_HEADERS = ['زمان', 'قسمت', 'مجموعهٔ درس', 'مجموعهٔ مرجع',
                            'وفاداری', 'عمق', 'ستون‌فقرات', 'طبیعی؟', 'داوری', 'اقدام'];

/**
 * داوریِ یک عکس. برمی‌گرداند {ok, n, bad, rows}.
 * اگر کتابِ مرجع خوانده نشود، **مدل اصلاً صدا زده نمی‌شود**: «داوری با ورودیِ
 * خالی، حکم می‌دهد نه شهادت» — درسِ ۵٫۹۶، که یک بار هر بخش را «پیوندِ ساختگی»
 * اعلام کرد چون منبعی جلویش نبود.
 */
function bridgeAuditOne_(hub, file, reg) {
  var out = { ok: false, n: 0, bad: 0, why: '' };
  var snap = null;
  try { snap = auditReadJson_(file); } catch (e) { snap = null; }
  if (!snap || !(snap.links || []).length) { out.why = 'عکسِ خالی'; return out; }
  var keys = snap.links.map(function (b) { return b.seriesKey; });
  var books = bridgeCorpus_(reg, keys);
  if (!books.length) { out.why = 'کتابِ مرجع خوانده نشد؛ داوری انجام نشد'; return out; }

  var r = null;
  try { r = geminiText_(bridgeAuditPrompt_(snap, books), BRIDGE_AUDIT_SCHEMA, 20000); }
  catch (e) { out.why = 'مدل جواب نداد: ' + e.message; return out; }
  if (!r || !(r.verdicts instanceof Array) || !r.verdicts.length) {
    out.why = 'داوری برنگشت'; return out;
  }

  var sh = ensureTab_(hub, CFG.BRIDGE_AUDIT_TAB || 'داوریِ ارجاع‌ها', BRIDGE_AUDIT_HEADERS);
  var block = [];
  for (var i = 0; i < r.verdicts.length; i++) {
    var v = r.verdicts[i] || {};
    var name = String(v.series || '');
    var link = null;
    for (var k = 0; k < snap.links.length; k++) {
      if (snap.links[k].seriesName === name || snap.links[k].seriesKey === name) {
        link = snap.links[k]; break;
      }
    }
    if (!link) continue;                       // داوریِ مجموعه‌ای که ارجاعش نبود
    var faithful = String(v.faithful || '');
    var depth = String(v.depth || '');
    var backbone = String(v.backbone || '');
    var bad = (faithful === 'خیر') || (backbone === 'قاطی شد') || (depth === 'سطحی');
    var act = bad ? (bridgeStrictBump_(link.seriesKey, true)
                       ? 'سخت‌گیریِ خودکار روشن شد' : 'شمارندهٔ بد بالا رفت')
                  : (bridgeStrictBump_(link.seriesKey, false) ? '' : 'بی‌اشکال');
    if (bad) out.bad++;
    out.n++;
    block.push([nowStr_(), String(snap.epNum || ''), String(snap.seriesName || ''),
                link.seriesName, faithful, depth, backbone,
                String(v.natural || ''), String(v.why || '').slice(0, 300), act]);

    /* یافته‌ها به‌تفکیکِ نوعِ ایراد، و کلید شاملِ جفتِ مجموعه‌ها — تا تکرارِ
       همان ایراد بین همان دو مجموعه، تکرار شمرده شود نه ردیفِ تازهٔ هر شب. */
    if (faithful === 'خیر') {
      try {
        logSelfFinding_(hub, {
          priority: 'جدی', category: 'محتوا',
          key: 'bridge-unfaithful-' + String(link.seriesKey || ''),
          title: 'ارجاع حرفی را به یک مجموعه نسبت داد که در کتابش نیست',
          detail: 'قسمت ' + snap.epNum + ' («' + snap.seriesName + '») به «' +
                  link.seriesName + '»: ' + String(v.why || '').slice(0, 200),
          instruction: 'پرامپتِ کشفِ نسبت (bridgePrompt_، بخشِ ۳۱) باید صریح‌تر ' +
                       'بگوید ادعا فقط از متنِ همان کتاب بیاید. سخت‌گیریِ خودکار ' +
                       'برای این مجموعه روشن شد.',
          owner: 'کد'
        });
      } catch (e1) {}
    } else if (backbone === 'قاطی شد') {
      try {
        logSelfFinding_(hub, {
          priority: 'جدی', category: 'محتوا',
          key: 'bridge-blended-' + String(link.seriesKey || ''),
          title: 'ارجاع، ستون‌فقراتِ مجموعهٔ اصلی را به هم زد',
          detail: 'قسمت ' + snap.epNum + ': ' + String(v.why || '').slice(0, 200),
          instruction: 'بلوکِ bridgeBlock_ مرز را می‌گوید؛ اگر تکرار شد، ' +
                       'سقفِ BRIDGE_MAX_LINKS یا جای بلوک در پرامپت باید عوض شود.',
          owner: 'کد'
        });
      } catch (e2) {}
    }
  }
  if (block.length) appendBlock_(sh, block, BRIDGE_AUDIT_HEADERS.length);
  out.ok = true;
  return out;
}

/** یک دورِ داوری — از کارِ شبانه، پشتِ نگهبانِ بودجه. */
function bridgeAuditRun_(maxN) {
  var res = { done: 0, n: 0, bad: 0 };
  if (CFG.BRIDGE_AUDIT === false) return res;
  var cap = Number(maxN) > 0 ? Number(maxN) : (Number(CFG.BRIDGE_AUDIT_MAX) || 2);
  var files = bridgePending_();
  if (!files.length) return res;
  var hub = getHub_(), reg = readSeriesReg_(hub);
  for (var i = 0; i < files.length && res.done < cap; i++) {
    var one = { ok: false };
    try { one = bridgeAuditOne_(hub, files[i], reg); }
    catch (e) { logLine_('داوریِ ارجاع نشد: ' + e.message); }
    /* عکسی که داوری‌اش نشد، «انجام‌شده» علامت نمی‌خورد — وگرنه یک خطای
       گذرا برای همیشه از داوری بیرونش می‌گذاشت. */
    if (one.ok) {
      bridgeMarkDone_(files[i]);
      res.done++; res.n += one.n; res.bad += one.bad;
    } else if (one.why === 'عکسِ خالی') {
      bridgeMarkDone_(files[i]);        // این یکی هرگز داوری‌شدنی نیست
    }
  }
  if (res.done) {
    logLine_('داوریِ ارجاع: ' + res.done + ' قسمت، ' + res.n + ' ارجاع، ' +
             res.bad + ' ایراد.');
  }
  return res;
}

/** سطرِ روزانه — قاعدهٔ ۵٫۹۰. */
function bridgeAuditStatus_(hub) {
  var out = { n: 0, bad: 0, pending: 0, strict: 0, line: '' };
  try {
    var fa = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
    try { out.pending = bridgePending_().length; } catch (eP) {}
    var st = bridgeStrict_();
    for (var k in st) if (Object.prototype.hasOwnProperty.call(st, k) && st[k] && st[k].on) out.strict++;
    var sh = (hub || getHub_()).getSheetByName(CFG.BRIDGE_AUDIT_TAB || 'داوریِ ارجاع‌ها');
    if (sh && sh.getLastRow() > 1) {
      var v = sh.getRange(2, 5, sh.getLastRow() - 1, 3).getValues();
      for (var i = 0; i < v.length; i++) {
        out.n++;
        if (String(v[i][0]) === 'خیر' || String(v[i][2]) === 'قاطی شد' ||
            String(v[i][1]) === 'سطحی') out.bad++;
      }
    }
    out.line = 'داوریِ ارجاع‌ها: ' + fa(out.n) + ' ارجاع داوری شده' +
               (out.bad ? ' · ' + fa(out.bad) + ' ایراددار' : ' · بی‌ایراد') +
               (out.pending ? ' · ' + fa(out.pending) + ' در صف' : '') +
               (out.strict ? ' · ' + fa(out.strict) + ' مجموعه سخت‌گیریِ خودکار گرفته' : '') + '.';
  } catch (e) {}
  return out;
}
