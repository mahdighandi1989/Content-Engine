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
  return { links: bridgeTrim_(r.links, names, ctx),
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
function bridgeTrim_(links, names, ctx) {
  var out = [];
  var max = Math.max(1, Number(CFG.BRIDGE_MAX_LINKS) || 3);
  var heads = Object.create(null);
  var secs = (ctx && ctx.headings) || [];
  for (var h = 0; h < secs.length; h++) heads[String(secs[h])] = 1;
  var seen = Object.create(null);
  for (var i = 0; i < (links || []).length && out.length < max; i++) {
    var x = links[i] || {};
    var key = String(x.seriesKey || '').trim();
    if (!names[key]) continue;                                  // شناسهٔ ساختگی
    if (!BRIDGE_KINDS[String(x.kind || '')]) continue;          // نسبتِ اختراعی
    if (String(x.strength || '') === 'ضعیف') continue;          // خودش گفته بود نده
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
  var L = ['══ ارجاع به مجموعه‌های پیشین ══',
           'این نسبت‌ها از پیش کشف و تأیید شده‌اند. هرکدام را **در همان بخشی که',
           'گفته شده** بیاور، با متنِ خودت و به لحنِ همین برنامه:',
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
  L.push('• مجموعهٔ «' + String(seriesName || '') + '» ستون‌فقرات است. ارجاع یک اشارهٔ');
  L.push('  کوتاه است، نه یک بخشِ تازه. شنونده باید تا آخر بداند دارد پادکستِ');
  L.push('  همین مجموعه را گوش می‌دهد.');
  L.push('• بحثِ آن مجموعه را اینجا باز نکن و درسش را از نو نده.');
  L.push('• نامِ آن مجموعه را صریح بگو — ارجاعِ بی‌نام، ارجاع نیست.');
  L.push('• ارجاع باید در دلِ حرف بنشیند، نه به‌شکلِ یک تکهٔ چسبانده‌شده.');
  return L.join('\n');
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
