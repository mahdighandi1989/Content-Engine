/* ═══════════════ ۲۸) کیفیتِ استخراج — پرامپت‌ها و مدلِ تحلیلگرها ═══════════════
 *
 * خواستهٔ صریحِ صاحبِ برنامه: «روی پرامپت‌های استخراج‌کنندهٔ محتوا نظارتِ کیفیِ
 * عمیق و دقیق داشته باشد، در گزارش‌ها بنویسد، بازخورد بگیرد، در صورتِ لزوم
 * اصلاح کند، گزارش دهد، و نتیجه را پیگیری کند.» و پیش از آن، پرسشِ درستی که
 * اشتباهِ من را گرفت: «مگر خودِ موتور کدِ اسکریپت‌های منبع را نمی‌بیند؟»
 *
 * می‌بیند. `auditSourceScripts` هر شب کلِ کدِ زندهٔ هر تحلیلگر را می‌گیرد
 * (`srcJoinJs_`) — برای همین است که `baseSha256` را با کدِ زنده می‌سنجد. پس
 * **نامِ مدل و خودِ متنِ پرامپت، همان‌جا در دسترس‌اند** و این بخش چیزِ تازه‌ای
 * لازم ندارد جز خواندنشان.
 *
 * ══ چهار قاعده که شکلِ این بخش را تعیین کرده‌اند ══
 *
 * ۱) **اول عددِ قطعی، بعد داوریِ مدل.** «چند درصدِ خانه‌های تحلیل خالی‌اند» و
 *    «چند درصدِ ردیف‌ها عیناً تکراری‌اند» بی هیچ مدلی حساب می‌شوند، دروغ
 *    نمی‌گویند، و مهم‌ترین نشانهٔ فروپاشیِ یک استخراج‌گرند: مدلی که از کار
 *    افتاده، یا خالی برمی‌گرداند یا همان یک جواب را برای همه. داوریِ مدل فقط
 *    چیزی را می‌سنجد که عدد نمی‌تواند.
 *
 * ۲) **داور بی نمونه، رأی می‌دهد نه شهادت.** اگر ردیفِ کافی نباشد، هیچ حکمی
 *    صادر نمی‌شود و همین صریح گفته می‌شود. این ریپو بارها این درس را گرفته
 *    (۵٫۹۶ و ۶٫۱۶).
 *
 * ۳) **پایه پیش از تغییر، حکم بعد از آن.** هر بار اثرانگشتِ کدِ زندهٔ تحلیلگر
 *    عوض شود، سنجه‌های امروز به‌عنوان پایه می‌مانند و دورِ بعد با آن‌ها سنجیده
 *    می‌شوند. بی پایه، «بد است» یعنی هیچ.
 *
 * ۴) **هفتگی، نه هر شب.** نظارتِ کیفی که هر شب بدود، هم سهمیه می‌خورد و هم
 *    نویز می‌سازد؛ و کیفیتِ یک استخراج‌گر در بیست‌وچهار ساعت عوض نمی‌شود.
 */

function sqOn_() { return CFG.SQ_ENABLED !== false; }

/* ─────────────── ۱) چه چیزی در کدِ زندهٔ تحلیلگر هست ─────────────── */

/**
 * شناسهٔ مدل‌هایی که در کدِ تحلیلگر نوشته شده‌اند.
 * تکراری‌ها حذف می‌شوند و ترتیب حفظ می‌شود — اولی معمولاً مدلِ اصلی است.
 */
function sqModelsIn_(js) {
  var out = [], seen = Object.create(null);
  var re = /(gemini-[a-z0-9.\-]+)/gi, m;
  while ((m = re.exec(String(js || ''))) !== null) {
    var id = String(m[1]).toLowerCase().replace(/[.\-]+$/, '');
    if (seen[id]) continue;
    seen[id] = 1; out.push(id);
  }
  return out;
}

/**
 * متنِ پرامپت‌ها، از دلِ رشته‌های بلندِ خودِ کد.
 *
 * چرا با همین سادگی: پرامپت در این تحلیلگرها یک رشتهٔ بلندِ فارسی/انگلیسی
 * است که واژه‌های دستوری دارد. تلاش برای تجزیهٔ کاملِ JS در Apps Script هم
 * شکننده است هم بی‌فایده — چیزی که لازم داریم متن است، نه درختِ نحوی.
 */
function sqPromptsIn_(js) {
  var s = String(js || ''), out = [];
  var re = /(['"`])((?:\\.|(?!\1)[\s\S]){120,4000})\1/g, m;
  while ((m = re.exec(s)) !== null) {
    var t = String(m[2]).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
    if (!/[؀-ۿ]/.test(t) && !/\b(you are|analyze|extract|return|json)\b/i.test(t)) continue;
    if (/^\s*(https?:|data:|[A-Za-z0-9+/=]{100,})/.test(t)) continue;   // نشانی و base64
    out.push(t.trim());
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * مدلِ تحلیلگر در برابرِ آنچه روی حساب موجود است.
 *
 * سه حکم، و تفاوتشان مهم است:
 *   • «مرده»  — این شناسه اصلاً در فهرستِ حساب نیست؛ یعنی هر فراخوان ۴۰۴
 *     می‌گیرد و تحلیلگر عملاً خاموش است. جدی.
 *   • «کهنه»  — هست، ولی نسخه یا ردهٔ پایین‌تری از بهترینِ موجود. متوسط.
 *   • «تازه»  — کاری لازم نیست، و هیچ ایرادی هم ساخته نمی‌شود.
 */
function sqModelCheck_(js) {
  var out = { models: [], main: '', verdict: '', best: '', why: '' };
  out.models = sqModelsIn_(js);
  if (!out.models.length) { out.verdict = 'نامعلوم'; out.why = 'در کد نامی از مدل نبود'; return out; }
  out.main = out.models[0];

  var avail = [], guessed = false;
  try {
    var rm = resolveModels_(false);
    avail = rm.textAll || [];
    guessed = !!rm.fallback;
  } catch (e) {}
  /* فهرستی که از پیش‌فرض آمده «آنچه هست» نیست، «آنچه حدس زده‌ایم» است.
     سنجیدنِ مدلِ تحلیلگر در برابرِ یک حدس، همان داوریِ بی‌شاهد است که این
     ریپو بارها از آن ضربه خورده — پس حکمی صادر نمی‌شود. */
  if (!avail.length || guessed) {
    out.verdict = 'نامعلوم';
    out.why = guessed ? 'فهرستِ مدل‌ها از پیش‌فرض آمده، نه از حساب'
                      : 'فهرستِ مدل‌ها در دسترس نبود';
    return out;
  }
  out.best = avail[0] || '';

  var alive = false;
  for (var i = 0; i < avail.length; i++) {
    if (String(avail[i]).toLowerCase().indexOf(out.main) === 0 ||
        out.main.indexOf(String(avail[i]).toLowerCase()) === 0) { alive = true; break; }
  }
  if (!alive) {
    out.verdict = 'مرده';
    out.why = 'مدلِ «' + out.main + '» در فهرستِ حساب نیست — هر فراخوانِ این تحلیلگر رد می‌شود.';
    return out;
  }
  var a = modelMeta_(out.main), b = modelMeta_(out.best);
  if (b.version > a.version || (b.version === a.version && b.tier > a.tier)) {
    out.verdict = 'کهنه';
    out.why = 'مدلِ «' + out.main + '» کار می‌کند ولی «' + out.best + '» موجود و بالاتر است.';
    return out;
  }
  out.verdict = 'تازه';
  return out;
}

/* ─────────────── ۲) عددهایی که مدل لازم ندارند ─────────────── */

/** چند ردیفِ تازهٔ موفق از یک شیتِ منبع، با ستون‌های تحلیلش. */
function sqSampleRows_(sheetId, want) {
  var out = { rows: [], cols: [], tab: '', why: '' };
  var n = Math.max(3, Math.min(40, Number(want) || 12));
  var sh = null;
  try {
    var ss = SpreadsheetApp.openById(String(sheetId));
    var tabs = ss.getSheets();
    for (var t = 0; t < tabs.length; t++) {
      if (tabs[t].getLastRow() > 1) { sh = tabs[t]; break; }
    }
  } catch (e) { out.why = 'شیت باز نشد: ' + String(e.message).slice(0, 80); return out; }
  if (!sh) { out.why = 'هیچ تبِ پرداده‌ای نبود'; return out; }
  out.tab = sh.getName();

  try {
    var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    var head = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    var map = srcMap_(hdrSet_(head));
    /* ستون‌های «تحلیل» — نه تاریخ و نام و لینک. خالی‌بودنِ نامِ فایل ایراد
       نیست؛ خالی‌بودنِ تحلیل هست. */
    var keys = ['content', 'points', 'ideas', 'points2', 'summary', 'summary2',
                'subject', 'takeaway', 'expert', 'body'];
    var cols = [];
    for (var k = 0; k < keys.length; k++) {
      var c = map[keys[k]];
      if (c && cols.indexOf(c) === -1) cols.push(c);
    }
    if (!cols.length) { out.why = 'ستونِ تحلیلی شناخته نشد'; return out; }
    out.cols = cols;

    var from = Math.max(2, lastRow - n + 1);
    var vals = sh.getRange(from, 1, lastRow - from + 1, lastCol).getValues();
    var stCol = map.status || 0;
    for (var r = 0; r < vals.length; r++) {
      if (stCol && String(vals[r][stCol - 1] || '').toUpperCase().indexOf('ERROR') === 0) continue;
      var cells = [];
      for (var c2 = 0; c2 < cols.length; c2++) cells.push(String(vals[r][cols[c2] - 1] || ''));
      out.rows.push(cells);
    }
  } catch (e2) { out.why = 'خواندنِ ردیف‌ها نشد: ' + String(e2.message).slice(0, 80); }
  return out;
}

/**
 * سنجه‌های قطعی — بی هیچ مدلی.
 *
 * `empty` و `dup` مهم‌ترین نشانه‌های فروپاشیِ یک استخراج‌گرند: مدلی که از کار
 * افتاده یا خالی برمی‌گرداند، یا همان یک جواب را برای همهٔ ورودی‌ها. هیچ
 * داوریِ مدلی به این دوتا نمی‌رسد، چون این‌ها را نمی‌شود «خوب توضیح داد».
 */
function sqStats_(rows) {
  var out = { n: 0, cells: 0, empty: 0, emptyPct: 0, dup: 0, dupPct: 0, avgLen: 0 };
  var rs = rows || [];
  out.n = rs.length;
  if (!out.n) return out;
  var seen = Object.create(null), total = 0;
  for (var i = 0; i < rs.length; i++) {
    var joined = [];
    for (var j = 0; j < rs[i].length; j++) {
      var v = String(rs[i][j] || '').trim();
      out.cells++;
      if (v.length < 3) out.empty++;
      total += v.length;
      joined.push(v);
    }
    var sig = joined.join('|').slice(0, 400);
    if (sig.replace(/\|/g, '').length < 10) continue;      // ردیفِ عملاً خالی، تکراری شمرده نشود
    if (seen[sig]) out.dup++; else seen[sig] = 1;
  }
  out.emptyPct = out.cells ? Math.round((out.empty / out.cells) * 100) : 0;
  out.dupPct = out.n ? Math.round((out.dup / out.n) * 100) : 0;
  out.avgLen = out.cells ? Math.round(total / out.cells) : 0;
  return out;
}

/* ─────────────── ۳) داوریِ کیفیِ پرامپت ─────────────── */

var SQ_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    clarity: { type: 'string' },
    coverage: { type: 'string' },
    risk: { type: 'string' },
    fix: { type: 'string' },
    why: { type: 'string' }
  },
  required: ['verdict', 'clarity', 'coverage', 'risk', 'fix', 'why']
};

/**
 * داوریِ پرامپت در برابرِ خروجیِ **واقعیِ** خودش.
 *
 * پرامپت را به‌تنهایی قضاوت‌کردن، نقدِ ادبی است. آنچه معنا دارد این است که
 * خروجیِ واقعی جوابِ همان پرامپت هست یا نه — پس هر دو با هم به داور داده
 * می‌شوند. و اگر نمونه نباشد، داوری اصلاً انجام نمی‌شود.
 */
function sqJudge_(name, prompt, rows) {
  if (!prompt || !(rows || []).length) return null;
  var sample = [];
  for (var i = 0; i < rows.length && i < 5; i++) {
    sample.push('— ردیفِ ' + faDigitsOut_(String(i + 1)) + ': ' +
                rows[i].join(' ⟂ ').replace(/\s+/g, ' ').slice(0, 700));
  }
  var p = [
    'تو داورِ کیفیتِ یک پرامپتِ استخراجِ محتوا هستی. پرامپت و چند خروجیِ',
    '**واقعیِ** همان پرامپت را می‌بینی. کارِ تو بازنویسی نیست — قضاوت است.',
    '',
    'تحلیلگر: ' + String(name || ''),
    '',
    '── پرامپت ──',
    String(prompt).slice(0, 6000),
    '',
    '── خروجی‌های واقعی ──',
    sample.join('\n'),
    '',
    'چهار چیز را جدا قضاوت کن:',
    '• clarity — پرامپت روشن است یا جای چند برداشت دارد؟ «روشن» یا «مبهم».',
    '• coverage — خروجی‌ها همهٔ چیزی که پرامپت خواسته را دارند؟ «کامل» یا «ناقص».',
    '• risk — خطری در خودِ پرامپت هست؟ (خواستنِ حدس به‌جای استخراج، تشویق به',
    '  پرگویی، نبودِ قالبِ خروجی، دستورِ متناقض) «کم» یا «زیاد».',
    '• verdict — «خوب» یا «قابل قبول» یا «ضعیف».',
    '',
    'fix را در یک جملهٔ کوتاهِ فارسی بنویس: **دقیقاً** چه چیزی در پرامپت عوض شود.',
    'اگر چیزی لازم نیست، fix را خالی بگذار. why یک جملهٔ کوتاه با شاهدی از',
    'خروجی‌ها باشد، نه یک حکمِ کلی.',
    'سخت‌گیر باش ولی منصف: علامت‌زدنِ بی‌مورد همان‌قدر بد است که ندیدنِ ایراد.'
  ].join('\n');
  try {
    var t = geminiText_(p, SQ_SCHEMA, 900);
    return t ? JSON.parse(t) : null;
  } catch (e) { logLine_('داوریِ پرامپتِ «' + name + '» نشد: ' + e.message); return null; }
}

/* ─────────────── ۴) ثبت، یافته، و پیگیری ─────────────── */

var SQ_HEADERS = ['تاریخ', 'تحلیلگر', 'تب', 'مدل', 'وضعِ مدل', 'نمونه',
                  'خالی٪', 'تکراری٪', 'میانگینِ طول', 'حکمِ پرامپت',
                  'روشنی', 'پوشش', 'خطر', 'پیشنهادِ اصلاح', 'شرح'];

function sqLog_(hub, row) {
  try {
    appendBlock_(ensureTab_(hub || getHub_(), CFG.SQ_TAB || 'کیفیتِ استخراج', SQ_HEADERS),
      [[nowStr_(), String(row.name || ''), String(row.tab || ''), String(row.model || ''),
        String(row.modelVerdict || ''), faDigitsOut_(String(row.n || 0)),
        faDigitsOut_(String(row.emptyPct || 0)), faDigitsOut_(String(row.dupPct || 0)),
        faDigitsOut_(String(row.avgLen || 0)), String(row.verdict || ''),
        String(row.clarity || ''), String(row.coverage || ''), String(row.risk || ''),
        String(row.fix || ''), String(row.why || '')]], SQ_HEADERS.length);
    return true;
  } catch (e) { logLine_('ثبتِ کیفیتِ استخراج نشد: ' + e.message); return false; }
}

/** پایهٔ هر تحلیلگر: سنجه‌ها + اثرانگشتِ کدی که آن سنجه‌ها با آن گرفته شده‌اند. */
function sqBaseRead_() {
  try {
    var j = JSON.parse(props_().getProperty(PK.SQ_BASE) || '{}');
    return (j && typeof j === 'object') ? j : {};
  } catch (e) { return {}; }
}
function sqBaseSave_(m) {
  try { props_().setProperty(PK.SQ_BASE, JSON.stringify(m)); } catch (e) {}
}

/** نوبتِ دورِ بعد رسیده؟ */
function sqDue_() {
  var days = Math.max(1, Number(CFG.SQ_EVERY_DAYS) || 7);
  var at = '';
  try { at = String(props_().getProperty(PK.SQ_AT) || ''); } catch (e) {}
  if (!at) return true;
  var t = parseWhen_(at);
  if (isNaN(t)) return true;
  return (new Date().getTime() - t) / 86400000 >= days;
}

/**
 * یک دورِ کاملِ نظارتِ کیفی.
 *
 * ترتیبش عمدی است: اول مدل (ارزان و قطعی)، بعد سنجه‌های عددی (بی مدل)، و
 * آخر داوریِ کیفی (که سهمیه می‌خورد). اگر بودجه وسط تمام شود، آنچه از دست
 * می‌رود گران‌ترین و کم‌فوری‌ترین است، نه برعکس.
 */
function sqRun_(budgetMs, force) {
  var out = { ran: 0, findings: 0, why: '', rows: [] };
  if (!sqOn_()) { out.why = 'خاموش'; return out; }
  if (!force && !sqDue_()) { out.why = 'نوبتش نرسیده'; return out; }
  var t0 = new Date().getTime();
  var budget = Math.max(20000, Number(budgetMs) || 120000);
  var hub = getHub_();
  var list = CFG.SOURCE_SCRIPTS || [];
  var base = sqBaseRead_();

  for (var i = 0; i < list.length; i++) {
    if (new Date().getTime() - t0 > budget) break;
    var s = list[i], rec = { key: s.key, name: s.name };

    var js = '';
    try {
      var got = srcScriptGet_(s.scriptId);
      if (got && got.json && got.json.files) js = srcJoinJs_(got.json.files);
    } catch (e) {}
    if (!js) { rec.why = 'کدِ زنده خوانده نشد'; out.rows.push(rec); continue; }

    var mc = sqModelCheck_(js);
    rec.model = mc.main; rec.modelVerdict = mc.verdict; rec.modelWhy = mc.why;

    var sm = sqSampleRows_(s.sheetId, Number(CFG.SQ_SAMPLE) || 12);
    var stat = sqStats_(sm.rows);
    rec.tab = sm.tab; rec.n = stat.n;
    rec.emptyPct = stat.emptyPct; rec.dupPct = stat.dupPct; rec.avgLen = stat.avgLen;

    /* داورِ بی نمونه، رأی می‌دهد نه شهادت. */
    var minN = Math.max(3, Number(CFG.SQ_MIN_ROWS) || 5);
    if (stat.n >= minN && (new Date().getTime() - t0) < budget - 20000) {
      var prompts = sqPromptsIn_(js);
      var j = prompts.length ? sqJudge_(s.name, prompts[0], sm.rows) : null;
      if (j) {
        rec.verdict = String(j.verdict || ''); rec.clarity = String(j.clarity || '');
        rec.coverage = String(j.coverage || ''); rec.risk = String(j.risk || '');
        rec.fix = String(j.fix || ''); rec.why = String(j.why || '');
      }
    } else if (stat.n < minN) {
      rec.why = 'نمونهٔ کافی نبود (' + stat.n + ' ردیف) — داوری انجام نشد.';
    }

    sqLog_(hub, rec);
    out.rows.push(rec);
    out.ran++;

    try { out.findings += sqFindings_(hub, s, rec, base[s.key] || null, js); } catch (eF) {}

    // پایهٔ تازه، همراهِ اثرانگشتِ کدی که با آن گرفته شده
    base[s.key] = { at: nowStr_(), sha: sqShaOf_(js),
                    emptyPct: rec.emptyPct, dupPct: rec.dupPct, avgLen: rec.avgLen,
                    verdict: rec.verdict || '' };
  }

  sqBaseSave_(base);
  try { props_().setProperty(PK.SQ_AT, nowStr_()); } catch (e) {}
  return out;
}

/** اثرانگشتِ کدِ زنده — همان تعریفی که بخشِ ۲۲ دارد، نه یک تعریفِ دوم. */
function sqShaOf_(js) {
  try { return sha256Hex_(String(js || '')); } catch (e) { return ''; }
}

/**
 * یافته‌ها — و پیگیری.
 *
 * کلیدها ثابت‌اند تا تکرارِ همان مشکل «تکرار» شمرده شود نه یک ردیفِ تازه؛
 * همان درسی که ۵٫۹۶ دربارهٔ گزارش‌های خوانده‌نشده داد.
 */
function sqFindings_(hub, s, rec, prev, js) {
  var n = 0;
  var head = 'تحلیلگرِ «' + String(s.name || s.key) + '»';

  if (rec.modelVerdict === 'مرده') {
    logSelfFinding_(hub, {
      priority: 'جدی', category: 'کیفیتِ استخراج', key: 'sq-model-dead-' + s.key,
      title: head + ': مدلش دیگر وجود ندارد',
      detail: rec.modelWhy,
      instruction: 'در کدِ همین تحلیلگر مدل به نسخهٔ موجود عوض شود و بسته از ' +
                   'مسیرِ sources/' + s.key + '/ منتشر شود.',
      owner: ROWNER_CODE
    });
    n++;
  } else if (rec.modelVerdict === 'کهنه') {
    logSelfFinding_(hub, {
      priority: 'متوسط', category: 'کیفیتِ استخراج', key: 'sq-model-old-' + s.key,
      title: head + ': مدلِ بالاتری موجود است',
      detail: rec.modelWhy,
      instruction: 'اگر تغییرِ مدل توجیه دارد، در بستهٔ همین تحلیلگر عوض شود؛ ' +
                   'دورِ بعدِ کیفیت خودش می‌سنجد بهتر شد یا بدتر.',
      owner: ROWNER_CODE
    });
    n++;
  }

  /* عددهای قطعی — و آستانه‌ها عمداً بلندند: هشداری که برای نوسانِ عادی فیره
     کند، همان هشداری است که آدم یاد می‌گیرد نبیند. */
  var eCap = Math.max(10, Number(CFG.SQ_EMPTY_MAX) || 40);
  var dCap = Math.max(5, Number(CFG.SQ_DUP_MAX) || 25);
  if (rec.n && rec.emptyPct >= eCap) {
    logSelfFinding_(hub, {
      priority: 'جدی', category: 'کیفیتِ استخراج', key: 'sq-empty-' + s.key,
      title: head + ': ' + faDigitsOut_(String(rec.emptyPct)) + '٪ خانه‌های تحلیل خالی‌اند',
      detail: 'از ' + faDigitsOut_(String(rec.n)) + ' ردیفِ تازه. خالی‌بودنِ انبوه یعنی ' +
              'مدل جواب نمی‌دهد یا قالبِ خروجی با ستون‌ها نمی‌خواند.',
      instruction: 'پرامپت و قالبِ خروجیِ این تحلیلگر با ستون‌های شیت تطبیق داده شود.',
      owner: ROWNER_CODE
    });
    n++;
  }
  if (rec.n && rec.dupPct >= dCap) {
    logSelfFinding_(hub, {
      priority: 'جدی', category: 'کیفیتِ استخراج', key: 'sq-dup-' + s.key,
      title: head + ': ' + faDigitsOut_(String(rec.dupPct)) + '٪ ردیف‌ها عیناً تکراری‌اند',
      detail: 'یعنی استخراج‌گر برای ورودی‌های متفاوت یک جواب می‌دهد — نشانهٔ ' +
              'فروپاشیِ مدل یا پرامپتی که ورودی را واقعاً نمی‌بیند.',
      instruction: 'بررسی شود که ورودیِ هر ردیف واقعاً به مدل داده می‌شود.',
      owner: ROWNER_CODE
    });
    n++;
  }
  if (String(rec.verdict || '') === 'ضعیف' && rec.fix) {
    logSelfFinding_(hub, {
      priority: 'متوسط', category: 'کیفیتِ استخراج', key: 'sq-prompt-' + s.key,
      title: head + ': پرامپتش ضعیف داوری شد',
      detail: rec.why,
      instruction: rec.fix,
      owner: ROWNER_CODE
    });
    n++;
  }

  /* ── پیگیری: کد عوض شده؟ پس بسنج بهتر شد یا بدتر ──
   * این همان قاعده‌ای است که `srcVerdict_` برای نصبِ کد و `modelVerdict_`
   * برای تعویضِ مدل دارند. بی آن، «اصلاح کردیم» یک ادعاست نه یک نتیجه. */
  if (prev && prev.sha && sqShaOf_(js) !== prev.sha && rec.n) {
    var worse = (rec.emptyPct - (Number(prev.emptyPct) || 0) >= 15) ||
                (rec.dupPct - (Number(prev.dupPct) || 0) >= 15);
    var better = ((Number(prev.emptyPct) || 0) - rec.emptyPct >= 10) ||
                 ((Number(prev.dupPct) || 0) - rec.dupPct >= 10);
    logSelfFinding_(hub, {
      priority: worse ? 'جدی' : 'کم', category: 'کیفیتِ استخراج',
      key: 'sq-change-' + s.key,
      title: head + ': کدش از دورِ قبل عوض شده — ' +
             (worse ? 'و بدتر شد' : better ? 'و بهتر شد' : 'بی تفاوتِ محسوس'),
      detail: 'خالی: ' + faDigitsOut_(String(prev.emptyPct)) + '٪ → ' +
              faDigitsOut_(String(rec.emptyPct)) + '٪ · تکراری: ' +
              faDigitsOut_(String(prev.dupPct)) + '٪ → ' + faDigitsOut_(String(rec.dupPct)) + '٪',
      instruction: worse ? 'تغییرِ اخیرِ این تحلیلگر بازبینی یا برگردانده شود.' : '',
      owner: worse ? ROWNER_CODE : ROWNER_ENGINE
    });
    n++;
  }
  return n;
}

/* ─────────────── ۵) دیده‌شدن ─────────────── */

/** جملهٔ فارسیِ آماده برای `_STATUS.json` و ایمیلِ روزانه. */
function sqStatus_() {
  var out = { at: '', rows: [], line: '' };
  try {
    var sh = getHub_().getSheetByName(CFG.SQ_TAB || 'کیفیتِ استخراج');
    if (!sh || sh.getLastRow() < 2) {
      out.line = 'کیفیتِ استخراج: هنوز دوری اجرا نشده.';
      return out;
    }
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, SQ_HEADERS.length).getValues();
    var last = Object.create(null);
    for (var i = 0; i < v.length; i++) {
      var nm = String(v[i][1] || '');
      if (nm) last[nm] = v[i];
    }
    var parts = [];
    for (var k in last) {
      if (!Object.prototype.hasOwnProperty.call(last, k)) continue;
      out.at = String(last[k][0] || '') || out.at;
      parts.push(k.split(' ')[0] + ': ' + (String(last[k][9] || '') || 'بی‌داوری') +
                 ' (خالی ' + String(last[k][6] || '۰') + '٪، تکراری ' +
                 String(last[k][7] || '۰') + '٪)');
      out.rows.push({ name: k, verdict: String(last[k][9] || ''),
                      emptyPct: String(last[k][6] || ''), dupPct: String(last[k][7] || ''),
                      model: String(last[k][3] || ''), modelVerdict: String(last[k][4] || '') });
    }
    out.line = 'کیفیتِ استخراج (' + out.at + '): ' + parts.join(' · ');
  } catch (e) { out.line = 'کیفیتِ استخراج خوانده نشد: ' + e.message; }
  return out;
}

/** منو: همین حالا یک دور بزن. */
function runSourceQuality() {
  var ui = ui_();
  var r = sqRun_(240000, true);
  var L = ['نظارتِ کیفیِ استخراج:'];
  if (r.why) L.push('• ' + r.why);
  L.push('• تحلیلگرِ بررسی‌شده: ' + faDigitsOut_(String(r.ran)));
  L.push('• یافتهٔ ثبت‌شده: ' + faDigitsOut_(String(r.findings)));
  for (var i = 0; i < r.rows.length; i++) {
    var x = r.rows[i];
    L.push('— ' + String(x.name || x.key) + ': مدل ' + (x.model || '—') +
           ' (' + (x.modelVerdict || '—') + ')' +
           (x.n ? ' · خالی ' + faDigitsOut_(String(x.emptyPct)) + '٪ · تکراری ' +
                  faDigitsOut_(String(x.dupPct)) + '٪' : '') +
           (x.verdict ? ' · پرامپت: ' + x.verdict : ''));
    if (x.fix) L.push('   پیشنهاد: ' + x.fix);
  }
  L.push('');
  L.push(sqStatus_().line);
  var m = L.join('\n');
  if (ui) ui.alert('کیفیتِ استخراج', m, ui.ButtonSet.OK); else console.log(m);
  return r;
}
