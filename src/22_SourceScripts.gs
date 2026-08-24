/* ═══════════════════════════════════════════════════════════════════════════
 *  ۲۲) وارسیِ اسکریپت‌های شیت‌های منبع — فقط تشخیص، بدونِ نصب
 *
 *  بعضی از شیت‌های منبع خودشان یک اسکریپتِ Apps Script دارند که آرشیو را
 *  تحلیل می‌کند و نتیجه را در همان شیت می‌نویسد. وقتی آن اسکریپت‌ها خطا
 *  می‌دهند، موتور فقط «نشانه» را می‌بیند (ستونِ وضعیتِ شیت)، نه علت را.
 *
 *  این بخش کدِ آن اسکریپت‌ها را می‌خوانَد و کنارِ خطاهای ثبت‌شده می‌گذارد تا
 *  ناظرِ روزانه بتواند علت را دقیق تشخیص دهد.
 *
 *  ══ قاعده‌های سختِ این بخش ══
 *  • فقط می‌خوانَد. هیچ‌چیز نصب نمی‌کند و در هیچ شیتِ منبعی نمی‌نویسد.
 *  • یافته‌هایش با مسئولِ جداگانه (ROWNER_SRCCODE) ثبت می‌شوند تا هرگز واردِ
 *    مسیرِ نصبِ خودکارِ خودِ موتور نشوند — آن مسیر فقط engine.gs را نصب می‌کند
 *    و اگر کدِ آنالایزر به آن برسد، فاجعه است.
 *  • شیتی که اسکریپت ندارد ایراد نیست: تحلیلش جای دیگری انجام می‌شود.
 *
 *  ══ چرا شناسهٔ اسکریپت را باید دستی داد ══
 *  از روی شناسهٔ شیت نمی‌شود به اسکریپتش رسید؛ گوگل چنین راهی نمی‌دهد. پس
 *  شناسه یک بار در CFG.SOURCE_SCRIPTS گذاشته می‌شود و همین‌جا وارسی می‌شود
 *  که واقعاً به همان شیت مربوط باشد — وگرنه بی‌سروصدا کدِ عوضی را تحلیل
 *  می‌کردیم و یافته‌هایمان دربارهٔ فایلِ اشتباه بود.
 *
 *  دو گونه اسکریپت داریم و وارسیِ هرکدام فرق دارد:
 *    • چسبیده (container-bound): پاسخِ API فیلدِ parentId دارد = شناسهٔ همان
 *      شیت. مستقیم مقایسه می‌شود.
 *    • مستقل (standalone): parentId ندارد و با openById به شیت وصل می‌شود.
 *      اینجا نشانهٔ ارتباط این است که شناسهٔ شیت در خودِ کدش آمده باشد.
 *  اگر گونهٔ دوم را با معیارِ اولی می‌سنجیدیم، هر اسکریپتِ مستقلِ سالمی
 *  «نامرتبط» گزارش می‌شد — هشدارِ دروغین، همان چیزی که کلِ این بخش قرار است
 *  از آن پرهیز کند.
 * ═════════════════════════════════════════════════════════════════════════ */

/** خواندنِ کدِ یک اسکریپتِ دیگر. فقط GET — این بخش هرگز نمی‌نویسد. */
function srcScriptGet_(scriptId) {
  var res = UrlFetchApp.fetch(scriptContentUrlFor_(scriptId), {
    method: 'get', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  });
  var out = { code: res.getResponseCode(), text: res.getContentText(), json: null };
  try { out.json = JSON.parse(out.text); } catch (e) {}
  return out;
}

/**
 * دسته‌بندیِ یک جملهٔ خطای منبع.
 * هر سه الگو از خطاهای واقعیِ همین سامانه گرفته شده. تفکیکشان مهم است چون
 * فقط یکی‌شان با تغییرِ کد حل می‌شود؛ بقیه داده/مدل‌اند و «اصلاحِ کد» برایشان
 * یعنی درست‌کردنِ چیزی که خراب نیست.
 */
function srcErrKind_(text, typeOpt) {
  var t = String(text || '');
  // ستونِ «نوع» گاهی چیزی می‌داند که متن نمی‌گوید: وقتی مدل با توضیحِ فارسی
  // تحلیل را رد می‌کند، در متن نه blockReason هست نه safety، و بی این ردیف
  // «دسته‌بندی‌نشده» می‌ماند — که یعنی هیچ‌کس نمی‌فهمد ردِ مدل بوده.
  if (/ناتوانی در تحلیل/.test(String(typeOpt || ''))) {
    return { kind: 'model', label: 'مدل تحلیل را رد کرد (با توضیح)',
             fix: 'کد باید این را «شکستِ دائمی» علامت بزند تا هر دور دوباره امتحان نشود.' };
  }
  if (/Cannot read propert\w+ of undefined|Cannot read propert\w+ of null|TypeError/.test(t)) {
    return { kind: 'code', label: 'باگِ کد — دسترسی به فیلدِ نبوده',
             fix: 'پیش از خواندنِ فیلد، بودنش وارسی شود و پاسخِ ناقص با خطای روشن رد شود.' };
  }
  if (/blockReason|promptFeedback|safety/i.test(t)) {
    return { kind: 'model', label: 'مدل محتوا را رد کرده',
             fix: 'کد باید این را «شکستِ دائمی» علامت بزند، نه اینکه هر دور دوباره امتحان کند.' };
  }
  if (/پاسخ خالی مدل|empty response/i.test(t)) {
    return { kind: 'model', label: 'پاسخِ خالیِ مدل',
             fix: 'چند بار تلاش با فاصله، و بعد علامتِ شکستِ دائمی.' };
  }
  if (/تجزیه نشد|JSON|parse/i.test(t)) {
    return { kind: 'code', label: 'پاسخِ مدل قابلِ تجزیه نبود',
             fix: 'تجزیه در try/catch و ترمیمِ JSONِ ناقص، مثل کاری که خودِ موتور می‌کند.' };
  }
  if (/\(400\)|\(403\)|\(404\)|File /.test(t)) {
    return { kind: 'data', label: 'فایلِ منبع خراب یا بی‌دسترس',
             fix: 'کد باید فایل را کنار بگذارد و دیگر سراغش نرود؛ خودِ فایل باید بازبینی شود.' };
  }
  return { kind: 'unknown', label: 'دسته‌بندی‌نشده', fix: '' };
}

/**
 * وارسیِ همهٔ اسکریپت‌های پیکربندی‌شده.
 * برمی‌گرداند فهرستی که هم برای _STATUS.json و هم برای ناظر بس است.
 */
function sourceScriptsAudit_() {
  var list = (CFG.SOURCE_SCRIPTS || []);
  var out = { configured: list.length, checked: 0, ok: 0, problems: [], scripts: [] };
  if (!list.length) return out;

  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var rec = { key: s.key, name: s.name, scriptId: s.scriptId, sheetId: s.sheetId,
                reachable: false, httpCode: 0, boundTo: '', kind: '', bindingOk: null, files: 0, chars: 0,
                functions: [], sha256: '', note: '' };
    if (!s.scriptId) {
      rec.note = 'شناسهٔ اسکریپت داده نشده — وارسی ممکن نیست.';
      out.scripts.push(rec); out.problems.push(rec.name + ': ' + rec.note);
      continue;
    }
    out.checked++;
    var got = srcScriptGet_(s.scriptId);
    if (got.code !== 200) {
      var why = (got.json && got.json.error && got.json.error.message) || ('HTTP ' + got.code);
      // این سه علت کاملاً فرق دارند و «خوانده نشد» هر سه را یک‌شکل نشان می‌داد.
      // ۴۰۰ در عمل یعنی شناسه غلط رونویسی شده — یک کاراکترِ I/l یا O/0 بس است.
      // فرستادنِ کاربر دنبالِ «دسترسی» وقتی مشکل تایپِ شناسه است، وقت تلف کردن است.
      var head = got.code === 400
        ? 'شناسهٔ اسکریپت نامعتبر است (۴۰۰) — احتمالاً اشتباه رونویسی شده. ' +
          'از صفحهٔ اسکریپت با دکمهٔ Copy برش دار، نه از روی تصویر. '
        : (got.code === 403 || got.code === 401)
          ? 'دسترسی نداریم (' + got.code + ') — '
          : got.code === 404
            ? 'چنین اسکریپتی نیست (۴۰۴) — شاید پاک یا جابه‌جا شده. '
            : 'خوانده نشد (' + got.code + ') — ';
      rec.httpCode = got.code;
      rec.note = head + String(why).replace(/\s+/g, ' ').slice(0, 160);
      out.scripts.push(rec); out.problems.push(rec.name + ': ' + rec.note);
      continue;
    }
    rec.reachable = true;
    var files = (got.json && got.json.files) || [];
    rec.files = files.length;

    var all = srcJoinJs_(files);
    rec.chars = all.length;

    // ── ارتباط با شیت، به‌تناسبِ گونهٔ اسکریپت ──
    rec.boundTo = String((got.json && got.json.parentId) || '');
    rec.kind = rec.boundTo ? 'bound' : 'standalone';
    if (s.sheetId) {
      if (rec.kind === 'bound') {
        rec.bindingOk = (rec.boundTo === s.sheetId);
        if (!rec.bindingOk) {
          rec.note = 'به شیتِ دیگری چسبیده (' + rec.boundTo + ') — شناسه‌ها را چک کنید.';
        }
      } else {
        // مستقل: اگر شناسهٔ شیت در کدش باشد، ارتباط تأیید است
        rec.bindingOk = (all.indexOf(s.sheetId) !== -1);
        if (!rec.bindingOk) {
          rec.note = 'اسکریپتِ مستقل است و شناسهٔ این شیت در کدش نیامده — ' +
                     'یا شناسه اشتباه است، یا شیت را از راهِ دیگری صدا می‌زند.';
        }
      }
      if (!rec.bindingOk) out.problems.push(rec.name + ': ' + rec.note);
    }
    var fn = all.match(/function\s+([A-Za-z_$][\w$]*)/g) || [];
    for (var k = 0; k < fn.length && rec.functions.length < 60; k++) {
      rec.functions.push(fn[k].replace(/function\s+/, ''));
    }
    try {
      rec.sha256 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, all, Utilities.Charset.UTF_8)
        .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
    } catch (e) {}

    // یک رونوشتِ فقط‌خواندنی در پوشهٔ «کدها» تا فردا بشود تغییرات را سنجید
    try { saveCodeCopy_('منبع — ' + s.key + ' — آخرین خوانده‌شده.gs', all); } catch (e2) {}

    if (rec.bindingOk !== false) out.ok++;
    out.scripts.push(rec);
  }
  return out;
}

/**
 * خلاصه برای _STATUS.json — از حافظه، نه از شبکه.
 *
 * این تابع در مسیرِ ساختِ وضعیت صدا زده می‌شود، و آن مسیر داخلِ تولیدِ پادکست
 * هم اجرا می‌شود. اگر اینجا شبکه بزنیم، هر بار ساختِ وضعیت به‌ازای هر اسکریپت
 * یک فراخوانِ Apps Script API می‌شود — کندی و مصرفِ سهمیه در داغ‌ترین مسیرِ
 * سامانه. پس وارسیِ واقعی جای دیگری (شبانه/منو) انجام می‌شود و اینجا فقط
 * آخرین نتیجه گزارش می‌شود، با زمانش تا کهنگی‌اش پیدا باشد.
 */
function sourceScriptsStatus_() {
  try {
    var raw = props_().getProperty(PK.SRCSCRIPT_LAST) || '';
    if (!raw) {
      return { configured: (CFG.SOURCE_SCRIPTS || []).length, checkedAt: '',
               note: 'هنوز وارسی نشده — از منو «وارسیِ اسکریپت‌های منبع» یا در دورِ شبانه.',
               scripts: [] };
    }
    var st = JSON.parse(raw);
    // چرخهٔ نصب هم در وضعیت بیاید — از حافظه خوانده می‌شود، پس شبکه نمی‌زند.
    try {
      var inst = srcInstalls_(), cyc = [];
      for (var k in inst) {
        if (!inst.hasOwnProperty(k)) continue;
        var r = inst[k];
        cyc.push({ key: k, version: r.version, installedAt: r.at, auto: !!r.auto,
                   rolledBackAt: r.rolledBackAt || '',
                   verdict: r.verdict || (r.pending === false ? null : 'در انتظارِ داوری') });
      }
      st.installs = cyc;
      st.autoInstall = CFG.SRC_AUTO_INSTALL !== false;
    } catch (e2) {}
    return st;
  } catch (e) { return null; }
}

/** نتیجهٔ وارسی را برای گزارش‌های بعدی نگه می‌دارد (سبک، بی متنِ کد). */
function sourceScriptsRemember_(a) {
  var slim = [];
  for (var i = 0; i < a.scripts.length; i++) {
    var s = a.scripts[i];
    slim.push({ key: s.key, name: s.name, reachable: s.reachable, kind: s.kind,
                bindingOk: s.bindingOk, files: s.files, chars: s.chars,
                sha256: s.sha256, functions: s.functions.length, note: s.note });
  }
  var out = { configured: a.configured, checked: a.checked, ok: a.ok,
              checkedAt: nowStr_(), problems: a.problems, scripts: slim };
  try { props_().setProperty(PK.SRCSCRIPT_LAST, JSON.stringify(out)); } catch (e) {}
  return out;
}

/**
 * خطاهای منبع را دسته‌بندی می‌کند و «طوفانِ تلاشِ دوباره» را پیدا می‌کند:
 * یک شناسهٔ فایل که بارها در گزارش تکرار شده یعنی کد آن را برای همیشه کنار
 * نمی‌گذارد و هر دور دوباره امتحانش می‌کند — همان چیزی که ۲۳۲ خطا از ۲۳۶ را ساخت.
 */
/* دو نصبِ نخست پیش از آنکه این مُهر وجود داشته باشد انجام شدند (۱۹ آگوست، از
   منو). بی این جدول، وارسیِ فردا پنجره‌ای نمی‌شناخت و باز کلِ انبارِ خطاهای
   کدِ قبلی را به پای کدِ تازه می‌نوشت. کلید، اثرانگشتِ همان کدی است که نصب شد —
   پس اگر کد عوض شود این ردیف خودبه‌خود بی‌اثر می‌شود و جای درستش را مُهرِ واقعیِ
   نصب می‌گیرد. */
var SRC_INSTALL_BACKFILL = {
  '846afc460ca73daa93b3247404c677977d0849725ebc88579866bc64cd8d29b5':
    { key: 'photo', version: '1.1', at: '2026-08-19 08:43' },
  'fc763e3ce4cf883ae0ed95d8f8eacc586ad4fd937f74e137a3d883be61e939da':
    { key: 'video', version: '1.1', at: '2026-08-19 08:43' }
};

/**
 * اگر کدِ زندهٔ یک تحلیلگر همانی باشد که در جدولِ بالا ثبت شده و هنوز مُهرِ نصب
 * نداشته باشد، مُهرش را می‌زند. یک‌بار اجرا می‌شود و بعدش بی‌کار است.
 */
function srcBackfillStamps_(audit) {
  var have = srcInstalls_(), added = 0;
  var list = (audit && audit.scripts) || [];
  for (var i = 0; i < list.length; i++) {
    var sc = list[i];
    var b = SRC_INSTALL_BACKFILL[String(sc.sha256 || '')];
    if (!b || have[b.key]) continue;
    var ms = parseWhen_(b.at);
    if (isNaN(ms)) continue;
    have[b.key] = { version: b.version, sha: sc.sha256, at: b.at, ms: ms, backfilled: true };
    added++;
  }
  if (added) {
    PropertiesService.getScriptProperties().setProperty(PK.SRCSCRIPT_INST, JSON.stringify(have));
    logLine_('مُهرِ زمانِ نصبِ ' + added + ' تحلیلگرِ منبع از روی اثرانگشت بازسازی شد.');
  }
  return added;
}

/** مُهرِ زمانِ نصبِ کدِ یک تحلیلگر را نگه می‌دارد. */
function srcStampInstall_(key, version, sha, extra) {
  extra = extra || {};
  var p = PropertiesService.getScriptProperties();
  var all = {};
  try { all = JSON.parse(p.getProperty(PK.SRCSCRIPT_INST) || '{}') || {}; } catch (e) {}
  all[key] = { version: String(version || ''), sha: String(sha || ''),
               at: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm'),
               ms: new Date().getTime(),
               backup: String(extra.backup || ''),
               baseline: extra.baseline || null,
               auto: !!extra.auto,
               // pending یعنی «هنوز داوری نشده». داوریِ فردا این را می‌بندد.
               pending: true, judged: false };
  p.setProperty(PK.SRCSCRIPT_INST, JSON.stringify(all));
  return all[key];
}

/** آنچه تا حالا نصب شده. */
function srcInstalls_() {
  try { return JSON.parse(PropertiesService.getScriptProperties()
           .getProperty(PK.SRCSCRIPT_INST) || '{}') || {}; } catch (e) { return {}; }
}

/**
 * مبدأِ سنجش: تازه‌ترین زمانِ نصب میانِ تحلیلگرها.
 *
 * چرا تازه‌ترین و نه قدیمی‌ترین: می‌خواهیم بدانیم «کدی که *الان* کار می‌کند چند
 * خطا ساخته». اگر عکس دیروز نصب شده و ویدیو امروز، خطاهای بینِ این دو هنوز
 * نیمی مالِ کدِ قدیمِ ویدیوست. پس محتاطانه از تازه‌ترین نصب می‌شماریم.
 *
 * اگر هیچ نصبی ثبت نشده باشد پنجره‌ای در کار نیست و همه‌چیز شمرده می‌شود —
 * همان رفتارِ قبلی، ولی این بار خودش می‌گوید که پنجره‌ای ندارد.
 */
function srcSince_() {
  var all = srcInstalls_(), best = null;
  for (var k in all) {
    if (!all.hasOwnProperty(k)) continue;
    var ms = Number(all[k].ms || 0);
    if (isFinite(ms) && ms > 0 && (best === null || ms > best.ms)) best = { ms: ms, at: all[k].at, key: k };
  }
  return best;   // null یعنی هنوز چیزی نصب نشده
}

function sourceErrDigest_(hub) {
  var out = { total: 0, byKind: {}, storms: [], samples: [], since: null, before: 0, inWindow: 0 };
  var errs;
  // نمونهٔ بزرگ‌تر برمی‌داریم چون بعدش با زمان صافش می‌کنیم؛ خواندنِ شیت هم
  // به‌هرحال کامل انجام می‌شود، پس این نمونه هزینهٔ تازه‌ای ندارد.
  try { errs = srcErrorSummary_(hub || getHub_(), 400); } catch (e) { return out; }
  var rec = (errs && errs.recent) || [];
  out.total = (errs && errs.total) || 0;
  var since = srcSince_();
  out.since = since;
  var seenFile = {}, seenKind = {};
  for (var i = 0; i < rec.length; i++) {
    var r = rec[i];
    // خطایی که پیش از نصبِ کدِ فعلی ثبت شده مالِ کدِ قبلی است. اگر این را حساب
    // نکنیم، انبارهٔ خطاهای قدیمی هر شب دوباره گزارش می‌شود و همان اشکالِ
    // درست‌شده را بارها به‌عنوانِ «هنوز خراب» جار می‌زند.
    if (since) {
      var w = parseWhen_(r.at);
      if (!isNaN(w) && w < since.ms) { out.before++; continue; }
    }
    out.inWindow++;
    var k = srcErrKind_(r.text, r.type);
    out.byKind[k.kind] = (out.byKind[k.kind] || 0) + 1;
    if (r.fileId) seenFile[r.fileId] = (seenFile[r.fileId] || 0) + 1;
    if (!seenKind[k.label]) {
      seenKind[k.label] = true;
      out.samples.push({ kind: k.kind, label: k.label, fix: k.fix, tab: r.tab,
                         text: String(r.text || '').replace(/\s+/g, ' ').slice(0, 220) });
    }
  }
  for (var id in seenFile) {
    if (seenFile.hasOwnProperty(id) && seenFile[id] >= 3) {
      out.storms.push({ fileId: id, times: seenFile[id] });
    }
  }
  out.storms.sort(function (a, b) { return b.times - a.times; });
  return out;
}

/**
 * وارسیِ کامل + ثبتِ یافته‌ها در تبِ گزارش‌ها.
 * مسئولِ ردیف‌ها ROWNER_SRCCODE است، نه ROWNER_CODE — تا مسیرِ نصبِ خودکارِ
 * خودِ موتور هرگز این‌ها را برندارد.
 */
function auditSourceScripts(hub) {
  hub = hub || getHub_();
  var a = sourceScriptsAudit_();
  try { sourceScriptsRemember_(a); } catch (e) {}
  try { srcBackfillStamps_(a); } catch (eB) {}
  var d = sourceErrDigest_(hub);
  var n = 0;

  for (var i = 0; i < a.problems.length; i++) {
    logSelfFinding_(hub, { priority: 'متوسط', category: 'اسکریپتِ منبع',
      key: 'srcscript-reach-' + i, title: 'اسکریپتِ منبع وارسی نشد: ' + a.problems[i],
      detail: 'وارسیِ فقط‌خواندنیِ اسکریپت‌های شیت‌های منبع به این مورد نرسید.',
      instruction: 'شناسهٔ اسکریپت را در CFG.SOURCE_SCRIPTS درست کن یا دسترسی بده.',
      owner: ROWNER_SRCCODE }); n++;
  }
  for (var j = 0; j < d.samples.length; j++) {
    var s = d.samples[j];
    if (s.kind !== 'code') continue;                 // فقط آنچه واقعاً کد است
    logSelfFinding_(hub, { priority: 'متوسط', category: 'اسکریپتِ منبع',
      key: 'srcscript-err-' + s.label,
      title: 'خطای کدی در اسکریپتِ منبع: ' + s.label,
      detail: 'تبِ «' + s.tab + '» — جملهٔ خطا: ' + s.text,
      instruction: s.fix, owner: ROWNER_SRCCODE }); n++;
  }
  if (d.storms.length) {
    logSelfFinding_(hub, { priority: 'جدی', category: 'اسکریپتِ منبع',
      key: 'srcscript-retry-storm',
      title: d.storms.length + ' فایل بارها و بارها دوباره امتحان می‌شوند و هر بار می‌شکنند',
      detail: 'پرتکرارترین: ' + d.storms.slice(0, 5).map(function (x) {
                return x.fileId + ' (' + x.times + ' بار)'; }).join(' ، '),
      instruction: 'در اسکریپتِ منبع، فایلی که چند بار پیاپی شکست خورد «شکستِ دائمی» ' +
                   'علامت بخورد تا از صف بیرون برود.',
      owner: ROWNER_SRCCODE }); n++;
  }
  logLine_('وارسیِ اسکریپت‌های منبع: ' + a.checked + ' اسکریپت خوانده شد، ' +
           n + ' یافته ثبت شد.');
  return { audit: a, errors: d, logged: n };
}

/** اجرای دستی از منو. */
function runAuditSourceScripts() {
  var r = auditSourceScripts();
  var ui = ui_();
  if (!ui) return r;
  var L = ['اسکریپت‌های پیکربندی‌شده: ' + r.audit.configured +
           ' · خوانده‌شده: ' + r.audit.checked, ''];
  for (var i = 0; i < r.audit.scripts.length; i++) {
    var s = r.audit.scripts[i];
    L.push((s.reachable ? '✅ ' : '❌ ') + s.name +
           (s.reachable ? ' — ' + s.files + ' فایل، ' + s.functions.length + ' تابع' +
                          (s.bindingOk === false ? ' ⚠️ چسبندگی نادرست' : '') : '') +
           (s.note ? '\n     ' + s.note : ''));
  }
  L.push('');
  var d = r.errors;
  if (d.since) {
    L.push('پنجرهٔ سنجش: از نصبِ کدِ تازه (' + d.since.at + ') تا حالا.');
    L.push('خطا در این پنجره: ' + d.inWindow + '  ·  پیش از آن (کدِ قبلی): ' + d.before);
  } else {
    L.push('هنوز نصبی ثبت نشده، پس همهٔ خطاها شمرده می‌شوند: ' + d.inWindow);
  }
  L.push('دسته‌بندی: ' + (d.inWindow ? JSON.stringify(d.byKind) : 'هیچ'));
  if (d.storms.length) L.push('طوفانِ تلاشِ دوباره: ' + d.storms.length + ' فایل');
  L.push('');
  L.push(r.logged + ' یافته در تبِ گزارش‌ها ثبت شد (بدونِ هیچ نصبی).');
  ui.alert('🔍 وارسیِ اسکریپت‌های منبع', L.join('\n'), ui.ButtonSet.OK);
  return r;
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  نصبِ کدِ تحلیلگرهای منبع — از گیت‌هاب، با تأییدِ کاربر
 *
 *  همان دستِ‌دادنِ engine.gs، با سه سختگیریِ بیشتر چون اینجا خطِ تغذیهٔ آرشیو
 *  است و این اسکریپت‌ها آزمونِ خودکار ندارند:
 *
 *  ۱) اثرانگشتِ کدِ زنده باید با baseSha256 بخوانَد. اگر کسی اسکریپت را دستی
 *     عوض کرده باشد، نصب متوقف می‌شود — وگرنه بی‌خبر رویش می‌نوشتیم.
 *  ۲) appsscript.json هرگز جایگزین نمی‌شود؛ فقط فایل‌های SERVER_JS. پس اسکوپ‌ها
 *     دست‌نخورده می‌مانند و هیچ اجازهٔ تازه‌ای لازم نمی‌شود.
 *  ۳) نامِ توابع باید همان بماند (requiredFunctions وارسی می‌شود). Apps Script
 *     API راهی برای ساختِ تریگر از راهِ دور ندارد؛ تریگرهای موجود فقط تا وقتی
 *     زنده‌اند که تابعِ هدفشان سرِ جایش باشد.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * کدِ SERVER_JS یک اسکریپت به‌صورتِ یک متن.
 *
 * تعریفش باید *دقیقاً* همانی باشد که فایلِ داخلِ ریپو دارد، وگرنه اثرانگشت‌ها
 * هرگز نمی‌خوانند و baseSha256 هر نصبی را متوقف می‌کند. پس فایل‌ها با \n به هم
 * می‌چسبند و هیچ \n اضافه‌ای در ابتدا نمی‌آید.
 */
function srcJoinJs_(files) {
  var parts = [];
  for (var i = 0; i < (files || []).length; i++) {
    if (files[i].type === 'SERVER_JS') parts.push(String(files[i].source || ''));
  }
  return parts.join('\n');
}

/** بیانیهٔ یک تحلیلگر از گیت‌هاب. */
function srcManifest_(key) {
  try {
    var r = UrlFetchApp.fetch(githubRawUrl_('sources/' + key + '/manifest.json'),
                              { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return null;
    return JSON.parse(r.getContentText());
  } catch (e) { return null; }
}

/** کدِ یک تحلیلگر از گیت‌هاب. */
function srcPackage_(key, codeFile) {
  try {
    var r = UrlFetchApp.fetch(githubRawUrl_('sources/' + key + '/' + (codeFile || 'analyzer.gs')),
                              { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return null;
    return r.getContentText();
  } catch (e) { return null; }
}

/**
 * وارسیِ کاملِ یک بسته پیش از نصب. هیچ‌چیز را عوض نمی‌کند.
 * برمی‌گرداند { ok, errors[], info, text, live }.
 */
function srcVerify_(key) {
  var out = { ok: false, installed: false, errors: [], info: null, text: '', live: null };
  var cfg = null;
  var list = CFG.SOURCE_SCRIPTS || [];
  for (var i = 0; i < list.length; i++) if (list[i].key === key) cfg = list[i];
  if (!cfg) { out.errors.push('این کلید در CFG.SOURCE_SCRIPTS نیست: ' + key); return out; }
  if (!cfg.scriptId) { out.errors.push('شناسهٔ اسکریپت خالی است.'); return out; }

  var info = srcManifest_(key);
  if (!info) { out.errors.push('بیانیه از گیت‌هاب خوانده نشد.'); return out; }
  out.info = info;

  var text = srcPackage_(key, info.codeFile);
  if (!text) { out.errors.push('فایلِ کد از گیت‌هاب خوانده نشد.'); return out; }
  out.text = text;

  // اثرانگشتِ بسته
  var sha = srcSha256_(text);
  if (sha !== String(info.sha256)) {
    out.errors.push('اثرانگشتِ بسته نمی‌خواند — دانلود ناقص یا دستکاری‌شده.');
  }

  // توابعِ ضروری
  var need = info.requiredFunctions || [];
  for (var f = 0; f < need.length; f++) {
    if (text.indexOf(need[f]) === -1) out.errors.push('تابعِ ضروری در بسته نیست: ' + need[f]);
  }

  // کدِ زنده: هم آزمونِ دسترسی، هم وارسیِ baseSha256
  var got = srcScriptGet_(cfg.scriptId);
  if (got.code !== 200) {
    out.errors.push('کدِ زنده خوانده نشد (HTTP ' + got.code + ').');
    return out;
  }
  var files = (got.json && got.json.files) || [];
  var liveJs = srcJoinJs_(files);
  out.live = { files: files, js: liveJs, sha: srcSha256_(liveJs) };

  // ترتیب مهم است. پس از یک نصبِ موفق، کدِ زنده دیگر برابرِ baseSha256 نیست —
  // برابرِ sha256 است. اگر «دستی عوض شده» را اول بسنجیم، هر نصبِ موفق از فردایش
  // خودش را به‌صورتِ دستکاری گزارش می‌کند و کاربر را بی‌خود می‌ترساند. پس اول
  // «از قبل نصب است» را جواب می‌دهیم، که یک وضعیت است نه یک خطا.
  if (out.live.sha === String(info.sha256)) {
    out.installed = true;
    out.errors.push('نسخهٔ ' + (info.version || '') + ' از قبل نصب است — کاری لازم نیست.');
  } else if (info.baseSha256 && out.live.sha !== String(info.baseSha256)) {
    out.errors.push('کدِ زندهٔ اسکریپت با نسخه‌ای که این اصلاح رویش ساخته شده فرق دارد ' +
                    '— یعنی دستی عوض شده. نصب متوقف شد تا تغییرِ شما پاک نشود.');
  }

  out.ok = (out.errors.length === 0);
  return out;
}

/** اثرانگشتِ SHA-256 به‌صورتِ hex. */
function srcSha256_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/**
 * نصبِ بستهٔ وارسی‌شده در اسکریپتِ تحلیلگر.
 * فقط بعد از srcVerify_ صدا زده می‌شود و خودش هم دوباره وارسی می‌کند.
 */
function srcInstall_(key, opt) {
  opt = opt || {};
  var v = srcVerify_(key);
  if (!v.ok) return { ok: false, errors: v.errors };

  var cfg = null, list = CFG.SOURCE_SCRIPTS || [];
  for (var i = 0; i < list.length; i++) if (list[i].key === key) cfg = list[i];

  // پشتیبانِ کدِ زنده پیش از هر تعویض
  var stamp = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd HH-mm');
  var bakName = 'منبع — ' + key + ' — پیش از نصبِ ' + v.info.version + ' — ' + stamp + '.gs';
  try { saveCodeCopy_(bakName, v.live.js); }
  catch (e) { return { ok: false, errors: ['پشتیبانِ کدِ زنده گرفته نشد؛ نصب انجام نشد: ' + e.message] }; }

  // فهرستِ فایل‌ها: هرچه SERVER_JS بود یک فایل می‌شود، بقیه (appsscript.json) دست‌نخورده
  var keep = [], firstJs = null;
  for (var k = 0; k < v.live.files.length; k++) {
    var fk = v.live.files[k];
    if (fk.type === 'SERVER_JS') { if (!firstJs) firstJs = fk.name; continue; }
    keep.push({ name: fk.name, type: fk.type, source: fk.source });
  }
  keep.push({ name: firstJs || 'Code', type: 'SERVER_JS', source: v.text });

  var res = UrlFetchApp.fetch(scriptContentUrlFor_(cfg.scriptId), {
    method: 'put', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ files: keep })
  });
  if (res.getResponseCode() !== 200) {
    var why = String(res.getContentText() || '').replace(/\s+/g, ' ').slice(0, 250);
    logLine_('نصبِ ' + key + ' ناموفق: ' + why);
    return { ok: false, errors: ['نصب رد شد (HTTP ' + res.getResponseCode() + '): ' + why],
             backup: bakName };
  }

  // مُهرِ زمانِ نصب. پنجرهٔ سنجشِ خطاها از همین‌جا شروع می‌شود: خطایی که پیش از
  // این ثبت شده مالِ کدِ قبلی است و دیگر نباید به پای کدِ تازه نوشته شود.
  try {
    srcStampInstall_(key, v.info.version, srcSha256_(v.text),
                     { backup: bakName, baseline: opt.baseline || null, auto: !!opt.auto });
  } catch (eS) {}

  // رونوشتِ نسخهٔ نصب‌شده
  try { saveCodeCopy_('منبع — ' + key + ' — v' + v.info.version + ' — نصب‌شده ' + stamp + '.gs', v.text); } catch (e2) {}

  var msg = '✅ کدِ «' + v.info.target + '» نسخهٔ ' + v.info.version + ' نصب شد.\n' +
            'نسخهٔ قبلی در پوشهٔ «' + CFG.CODE_FOLDER + '» با نامِ «' + bakName + '» ماند.\n' +
            'تریگرها دست نخوردند (نامِ هیچ تابعی عوض نشده) و اسکوپ‌ها هم همان‌اند.\n' +
            (opt.auto ? 'این نصب خودکار بود. ' : '') +
            (CFG.SRC_VERDICT_HOURS || 24) + ' ساعتِ دیگر دربارهٔ نتیجه‌اش داوری می‌شود؛ ' +
            'اگر خطاها بیشتر شده باشد خودکار به همین نسخهٔ پشتیبان برمی‌گردد.';
  logLine_('نصبِ تحلیلگرِ منبع: ' + key + ' → ' + v.info.version);
  try { tgSend_('🛠 ' + tgEsc_(msg)); } catch (e3) {}
  try {
    mailQueue_('src-install',
               'کدِ ' + v.info.target + ' نسخهٔ ' + v.info.version + ' نصب شد', msg);
  } catch (e4) {}
  try {
    logSelfFinding_(getHub_(), { priority: 'کم', category: 'اسکریپتِ منبع',
      key: 'srcinstall-' + key + '-' + v.info.version,
      title: 'کدِ ' + v.info.target + ' به نسخهٔ ' + v.info.version + ' رسید',
      detail: v.info.summary || '', instruction: '', owner: ROWNER_SRCCODE });
  } catch (e5) {}

  return { ok: true, version: v.info.version, backup: bakName };
}

/** وضعیتِ «چه چیزی آمادهٔ نصب است» — بی هیچ نصبی. */
function srcPendingStatus_() {
  var out = [];
  var list = CFG.SOURCE_SCRIPTS || [];
  for (var i = 0; i < list.length; i++) {
    var v = srcVerify_(list[i].key);
    out.push({ key: list[i].key, name: list[i].name,
               version: v.info ? v.info.version : '',
               ready: v.ok, installed: !!v.installed, errors: v.errors });
  }
  return out;
}

/** منو: نشان بده چه آماده است (بی نصب). */
function runShowSourceUpdates() {
  var st = srcPendingStatus_();
  var ui = ui_();
  var L = [];
  for (var i = 0; i < st.length; i++) {
    var s = st[i];
    var mark = s.ready ? '🆕 ' : (s.installed ? '✅ ' : '⚠️ ');
    L.push(mark + s.name + (s.version ? ' → نسخهٔ ' + s.version : ''));
    if (s.ready) L.push('     آمادهٔ نصب است.');
    else for (var e = 0; e < s.errors.length; e++) L.push('     ' + s.errors[e]);
  }
  var ready = st.filter(function (x) { return x.ready; }).length;
  var done  = st.filter(function (x) { return x.installed; }).length;
  L.push('');
  if (ready) L.push(ready + ' مورد آمادهٔ نصب است — از منو «نصبِ کدِ تحلیلگرهای منبع» را بزنید.');
  else if (done === st.length && st.length) L.push('همه‌چیز به‌روز است — کاری لازم نیست. ✅');
  else L.push('چیزی برای نصب نیست.');
  if (ui) ui.alert('🔄 کدِ تازهٔ تحلیلگرهای منبع', L.join('\n'), ui.ButtonSet.OK);
  return st;
}

/** منو: نصب، با تأییدِ صریحِ کاربر. */
function runInstallSourceUpdates() {
  var ui = ui_();
  var st = srcPendingStatus_();
  var ready = st.filter(function (x) { return x.ready; });
  if (!ready.length) {
    if (ui) ui.alert('نصبِ کدِ تحلیلگرهای منبع', 'چیزی برای نصب نیست.', ui.ButtonSet.OK);
    return { installed: 0 };
  }
  if (ui) {
    var names = ready.map(function (x) { return '• ' + x.name + ' → ' + x.version; }).join('\n');
    var ans = ui.alert('نصبِ کدِ تحلیلگرهای منبع',
      'این‌ها نصب می‌شوند:\n\n' + names + '\n\n' +
      'پیش از هر نصب، از کدِ فعلی پشتیبان گرفته می‌شود و appsscript.json دست نمی‌خورد.\n' +
      'ادامه بدهم؟', ui.ButtonSet.YES_NO);
    if (ans !== ui.Button.YES) return { installed: 0, cancelled: true };
  }
  var done = [], failed = [];
  for (var i = 0; i < ready.length; i++) {
    var r = srcInstall_(ready[i].key);
    if (r.ok) done.push(ready[i].name + ' → ' + r.version);
    else failed.push(ready[i].name + ': ' + (r.errors || []).join(' · '));
  }
  if (ui) {
    ui.alert('نصبِ کدِ تحلیلگرهای منبع',
      (done.length ? '✅ نصب شد:\n' + done.join('\n') + '\n\n' : '') +
      (failed.length ? '❌ نشد:\n' + failed.join('\n') : '') +
      '\n\nنسخه‌های قبلی در پوشهٔ «' + CFG.CODE_FOLDER + '» ماندند.',
      ui.ButtonSet.OK);
  }
  return { installed: done.length, failed: failed.length };
}

/* ─────────────────────────────────────────────────────────────────────────
   چرخهٔ خودکارِ کدِ تحلیلگرهای منبع.

   هر شب سه کار پشتِ سرِ هم:
     ۱) داوریِ نصب‌های قبلی که ۲۴ ساعتشان تمام شده — آیا اشکالی که قرار بود
        برطرف شود واقعاً برطرف شد؟ اگر اوضاع بدتر شده، برگشت به کدِ قبلی.
     ۲) نصبِ هر بستهٔ تازه‌ای که سه سدِ ایمنی را رد کند.
     ۳) ثبتِ همه‌چیز در تبِ گزارش‌ها و خبر دادن از تلگرام و ایمیل.

   ترتیب مهم است: اول داوری، بعد نصب. اگر برعکس بود، نصبِ امشب با نصبِ دیشب
   قاطی می‌شد و معلوم نبود خطای فردا مالِ کدام است.
   ───────────────────────────────────────────────────────────────────────── */

/** ردیف‌های خطای یک تحلیلگر در یک بازهٔ زمانی. */
function srcErrRows_(hub, key, fromMs, toMs) {
  var cfg = srcCfg_(key);
  var pre = cfg && cfg.errSource ? String(cfg.errSource) : '';
  var errs;
  try { errs = srcErrorSummary_(hub || getHub_(), SRC_ERR_MAX); } catch (e) { return []; }
  var rec = (errs && errs.recent) || [], out = [];
  for (var i = 0; i < rec.length; i++) {
    var r = rec[i];
    // خطاهای شیت‌های دیگر به پای این تحلیلگر نوشته نشوند. اگر منبعی تعریف
    // نشده باشد چیزی برنمی‌گردانیم — شمردنِ خطای بی‌صاحب بدتر از نشمردن است.
    if (!pre || String(r.source || '').indexOf(pre) !== 0) continue;
    var w = parseWhen_(r.at);
    if (isNaN(w)) continue;
    if (fromMs && w < fromMs) continue;
    if (toMs && w >= toMs) continue;
    out.push(r);
  }
  return out;
}

function srcCfg_(key) {
  var list = CFG.SOURCE_SCRIPTS || [];
  for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
  return null;
}

/**
 * شمارشِ یک نشانه در مجموعه‌ای از ردیف‌ها.
 * نشانهٔ «طوفان» فرق دارد: متن نیست، تکرارِ یک شناسهٔ فایل است.
 */
function srcSigHits_(rows, sig) {
  if (sig && sig.storm) {
    var seen = {}, worst = 0;
    for (var i = 0; i < rows.length; i++) {
      var id = rows[i].fileId;
      if (!id) continue;
      seen[id] = (seen[id] || 0) + 1;
      if (seen[id] > worst) worst = seen[id];
    }
    return worst >= 3 ? worst : 0;
  }
  var re;
  try { re = new RegExp(sig.match, 'i'); } catch (e) { return 0; }
  var n = 0;
  for (var j = 0; j < rows.length; j++) if (re.test(String(rows[j].text || ''))) n++;
  return n;
}

/** شمارشِ خطاهای «کدی» — تنها دسته‌ای که تعویضِ کد می‌تواند مقصرش باشد. */
function srcCodeCount_(rows) {
  var n = 0;
  for (var i = 0; i < rows.length; i++) if (srcErrKind_(rows[i].text, rows[i].type).kind === 'code') n++;
  return n;
}

/**
 * عکسِ وضعیتِ پیش از نصب: هر نشانه چند بار در بازه‌ای هم‌اندازهٔ پنجرهٔ داوری
 * دیده شده. همین می‌شود ترازوی فردا.
 */
function srcBaseline_(hub, key, sigs, atMs, hours) {
  var span = (Number(hours) || 24) * 3600000;
  var rows = srcErrRows_(hub, key, atMs - span, atMs);
  var b = { hours: Number(hours) || 24, rows: rows.length, code: srcCodeCount_(rows), sig: {} };
  for (var i = 0; i < (sigs || []).length; i++) b.sig[sigs[i].id] = srcSigHits_(rows, sigs[i]);
  return b;
}

/** فهرستِ اثرانگشت‌هایی که برگشت خورده‌اند و نباید دوباره خودکار نصب شوند. */
function srcBlocked_() {
  try { return JSON.parse(props_().getProperty(PK.SRCSCRIPT_BLOCK) || '{}') || {}; }
  catch (e) { return {}; }
}
function srcBlock_(sha, why) {
  var all = srcBlocked_();
  all[String(sha)] = { at: nowStr_(), why: String(why || '') };
  props_().setProperty(PK.SRCSCRIPT_BLOCK, JSON.stringify(all));
}

/** پشتیبانِ پیش از نصب را در پوشهٔ کدها پیدا می‌کند. */
function srcFindBackup_(key, exactName) {
  var folder = codeFolder_();
  if (exactName) {
    var it = folder.getFilesByName(exactName);
    if (it.hasNext()) return it.next();
  }
  // نامِ دقیق را نداریم (مثلاً نصبِ دستیِ پیش از این سازوکار) — تازه‌ترین
  // پشتیبانِ همین تحلیلگر را برمی‌داریم.
  var pre = 'منبع — ' + key + ' — پیش از نصبِ ';
  var all = folder.getFiles(), best = null;
  while (all.hasNext()) {
    var f = all.next();
    if (String(f.getName()).indexOf(pre) !== 0) continue;
    if (!best || f.getDateCreated().getTime() > best.getDateCreated().getTime()) best = f;
  }
  return best;
}

/** نوشتنِ یک متنِ کد در اسکریپت، با حفظِ هر فایلِ غیرِ SERVER_JS. */
function srcPutJs_(key, js) {
  var cfg = srcCfg_(key);
  if (!cfg) return { ok: false, why: 'کلیدِ ناشناس: ' + key };
  var got = srcScriptGet_(cfg.scriptId);
  if (got.code !== 200) return { ok: false, why: 'کدِ زنده خوانده نشد (HTTP ' + got.code + ')' };
  var files = (got.json && got.json.files) || [];
  var keep = [], firstJs = null;
  for (var i = 0; i < files.length; i++) {
    if (files[i].type === 'SERVER_JS') { if (!firstJs) firstJs = files[i].name; continue; }
    keep.push({ name: files[i].name, type: files[i].type, source: files[i].source });
  }
  keep.push({ name: firstJs || 'Code', type: 'SERVER_JS', source: js });
  var res = UrlFetchApp.fetch(scriptContentUrlFor_(cfg.scriptId), {
    method: 'put', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ files: keep })
  });
  if (res.getResponseCode() !== 200) {
    return { ok: false, why: 'HTTP ' + res.getResponseCode() + ' — ' +
             String(res.getContentText() || '').replace(/\s+/g, ' ').slice(0, 200) };
  }
  return { ok: true };
}

/**
 * خبر دادن از یک رویداد: تلگرام همین حالا + خطِ لاگ + ایمیلِ روزانه.
 *
 * `urgent` فقط برای چیزی که تا ساعت ۱۰ صبر نمی‌کند — مثلِ بازگردانیِ یک
 * کدِ خراب. بقیه در گزارشِ روزانه با هم می‌آیند، وگرنه هر رویدادِ کوچک
 * یک ایمیلِ جدا می‌شود و صندوقِ ورودی از دست می‌رود.
 */
function srcNotify_(subject, body, urgent) {
  logLine_(subject);
  try { tgSend_('🛠 ' + tgEsc_(subject + '\n' + body)); } catch (e) {}
  if (urgent) {
    try {
      MailApp.sendEmail({ to: CFG.EMAIL_TO, subject: 'موتور محتوا — ' + subject,
        htmlBody: '<div dir="rtl" style="font-family:Tahoma">' +
                  esc_(body).replace(/\n/g, '<br>') + '</div>' });
    } catch (e2) {}
    return;
  }
  try { mailQueue_('src', subject, body); } catch (e3) {}
}

/**
 * برگشت به کدِ پیش از نصب.
 * اثرانگشتِ بستهٔ برگشت‌خورده مسدود می‌شود تا شبِ بعد دوباره نصب نشود و
 * چرخهٔ نصب/برگشت راه نیفتد.
 */
function srcRollback_(key, rec, why) {
  var f = srcFindBackup_(key, rec && rec.backup);
  if (!f) {
    return { ok: false, why: 'پشتیبانِ پیش از نصب پیدا نشد؛ برگشت انجام نشد.' };
  }
  var js = f.getBlob().getDataAsString();
  var put = srcPutJs_(key, js);
  if (!put.ok) return { ok: false, why: put.why };
  srcBlock_(rec && rec.sha, why);
  var all = srcInstalls_();
  if (all[key]) { all[key].rolledBackAt = nowStr_(); all[key].pending = false; }
  props_().setProperty(PK.SRCSCRIPT_INST, JSON.stringify(all));
  return { ok: true, from: f.getName() };
}

/**
 * داوریِ نصب‌هایی که ۲۴ ساعتشان گذشته.
 *
 * دو سؤال جدا می‌پرسد:
 *   «آنچه قرار بود درست شود، شد؟»  → هر نشانه در پنجرهٔ پس از نصب چند بار آمد
 *   «چیزِ تازه‌ای خراب شد؟»        → نرخِ خطای کدی نسبت به پیش از نصب
 * فقط سؤالِ دوم می‌تواند برگشت را راه بیندازد. نشانه‌ای که برطرف نشده یعنی
 * اصلاح کافی نبوده — بدتر نشده، پس کد را برنمی‌گردانیم و فقط گزارش می‌دهیم.
 */
function srcVerdict_(hub) {
  hub = hub || getHub_();
  var all = srcInstalls_(), out = [], changed = false;
  var waitMs = (Number(CFG.SRC_VERDICT_HOURS) || 24) * 3600000;
  var now = new Date().getTime();

  for (var key in all) {
    if (!all.hasOwnProperty(key)) continue;
    var rec = all[key];
    if (!rec || rec.pending === false || rec.judged) continue;
    var age = now - Number(rec.ms || 0);
    if (!isFinite(age) || age < waitMs) {
      out.push({ key: key, state: 'زود است', hoursLeft: Math.ceil((waitMs - age) / 3600000) });
      continue;
    }

    var info = null;
    try { info = srcManifest_(key); } catch (e) {}
    var cfgK = srcCfg_(key);
    var nice = (cfgK && cfgK.name) || key;
    var sigs = (info && info.resolves) || [];
    var rows = srcErrRows_(hub, key, Number(rec.ms), 0);
    var r = { key: key, state: 'خوب', version: rec.version, at: rec.at,
              rows: rows.length, code: srcCodeCount_(rows), sig: [], rolledBack: false };

    for (var i = 0; i < sigs.length; i++) {
      var hits = srcSigHits_(rows, sigs[i]);
      var was = rec.baseline && rec.baseline.sig ? Number(rec.baseline.sig[sigs[i].id] || 0) : null;
      r.sig.push({ id: sigs[i].id, title: sigs[i].title, before: was, after: hits,
                   fixed: hits === 0 });
    }

    // بدتر شد؟ نرخِ خطای کدی را با پیش از نصب می‌سنجیم، نه عددِ خام را —
    // پنجره‌ها هم‌اندازه نیستند.
    var hours = Math.max(1, age / 3600000);
    var rateNow = r.code / hours;
    var base = rec.baseline;
    var rateWas = base && base.hours ? (Number(base.code || 0) / base.hours) : null;
    var worse = (rateWas !== null) &&
                (r.code >= (Number(CFG.SRC_ROLLBACK_MIN) || 5)) &&
                (rateNow > rateWas * (Number(CFG.SRC_ROLLBACK_FACTOR) || 1.5));
    r.rateNow = Math.round(rateNow * 100) / 100;
    r.rateWas = rateWas === null ? null : Math.round(rateWas * 100) / 100;
    r.scaled = (rateWas !== null);

    if (worse) {
      var why = 'نرخِ خطای کدی از ' + r.rateWas + ' به ' + r.rateNow + ' در ساعت رسید.';
      var rb = srcRollback_(key, rec, why);
      r.state = rb.ok ? 'برگشت خورد' : 'بدتر شد ولی برگشت نخورد';
      r.rolledBack = rb.ok;
      r.why = rb.ok ? why : (why + ' ' + rb.why);
      srcNotify_('کدِ ' + nice + ' برگشت خورد به نسخهٔ قبل',
        why + '\n' + (rb.ok ? 'از روی پشتیبانِ «' + rb.from + '».' : rb.why) +
        '\nاین بسته تا بررسیِ دستی دیگر خودکار نصب نمی‌شود.', true);
      logSelfFinding_(hub, { priority: 'جدی', category: 'اسکریپتِ منبع',
        key: 'srcrollback-' + key + '-' + rec.version,
        title: 'کدِ ' + nice + ' نسخهٔ ' + rec.version + ' برگشت خورد',
        detail: r.why, instruction: 'علتِ افزایشِ خطا بررسی و بستهٔ تازه ساخته شود.',
        owner: ROWNER_SRCCODE });
    } else {
      var unfixed = r.sig.filter(function (x) { return !x.fixed; });
      r.state = unfixed.length ? 'برخی اشکال‌ها باقی است' : 'خوب';
      var lines = r.sig.map(function (x) {
        return (x.fixed ? '✅ ' : '⚠️ ') + x.title +
               (x.before === null ? '' : ' — پیش: ' + x.before) + ' · پس: ' + x.after;
      });
      // اگر ترازوی پیش از نصب نداریم، باید بگوییم — وگرنه «خوب» جوری خوانده
      // می‌شود که انگار بدترنشدن هم سنجیده شده، و نشده.
      var noScale = (r.rateWas === null)
        ? '\n⚠️ این نصب ترازوی پیش از خودش را ندارد (دستی و پیش از این سازوکار انجام شده)، ' +
          'پس فقط سنجیده شد که نشانه‌ها برگشته‌اند یا نه — «بدتر نشد» سنجیده نشد. ' +
          'از نصبِ بعدی هر دو سنجیده می‌شود.'
        : '';
      srcNotify_('نتیجهٔ نصبِ کدِ ' + nice + ' نسخهٔ ' + rec.version + ' — ' + r.state,
        'پنجره: ' + Math.round(hours) + ' ساعت پس از نصب.\n' +
        'خطای کدی در این مدت: ' + r.code + ' (نرخ ' + r.rateNow + ' در ساعت' +
        (r.rateWas === null ? '' : '، پیش از نصب ' + r.rateWas) + ')\n' +
        lines.join('\n') + noScale);
      logSelfFinding_(hub, { priority: unfixed.length ? 'متوسط' : 'کم',
        category: 'اسکریپتِ منبع',
        key: 'srcverdict-' + key + '-' + rec.version,
        title: 'داوریِ نصبِ ' + nice + ' نسخهٔ ' + rec.version + ': ' + r.state,
        detail: lines.join(' ؛ ') + ' — خطای کدی: ' + r.code,
        instruction: unfixed.length ? 'برای نشانه‌های باقی‌مانده اصلاحِ تازه ساخته شود.' : '',
        owner: ROWNER_SRCCODE });
    }

    all[key].judged = true;
    all[key].verdict = { state: r.state, at: nowStr_(), code: r.code };
    changed = true;
    out.push(r);
  }

  if (changed) props_().setProperty(PK.SRCSCRIPT_INST, JSON.stringify(all));
  return out;
}

/**
 * نصبِ خودکارِ هر بستهٔ آماده. همان سه سدِ srcVerify_ سرِ جایشان‌اند؛ این تابع
 * فقط دکمهٔ تأییدِ آدم را برمی‌دارد و به‌جایش داوریِ فردا را می‌گذارد.
 */
function srcAutoInstall_(hub) {
  if (CFG.SRC_AUTO_INSTALL === false) return [];
  hub = hub || getHub_();
  var list = CFG.SOURCE_SCRIPTS || [], done = [], blocked = srcBlocked_();

  for (var i = 0; i < list.length; i++) {
    var key = list[i].key;
    var v = srcVerify_(key);
    if (!v.ok) continue;
    var sha = v.info ? String(v.info.sha256) : '';
    if (blocked[sha]) {
      done.push({ key: key, ok: false, why: 'این بسته پیش‌تر برگشت خورده؛ دستی بررسی شود.' });
      continue;
    }
    // عکسِ پیش از نصب را همین‌جا می‌گیریم — بعد از نوشتنِ کد دیگر نمی‌شود.
    var base = null;
    try {
      base = srcBaseline_(hub, key, (v.info && v.info.resolves) || [],
                          new Date().getTime(), CFG.SRC_VERDICT_HOURS || 24);
    } catch (eB) {}
    var r = srcInstall_(key, { auto: true, baseline: base });
    done.push({ key: key, ok: !!r.ok, version: r.version, why: (r.errors || []).join(' ') });
  }
  return done;
}

/** دورِ شبانهٔ کاملِ تحلیلگرهای منبع: اول داوری، بعد نصب. */
function srcNightly_(audit) {
  var hub = getHub_();
  var verdicts = [];
  try { verdicts = srcVerdict_(hub); } catch (e) { logLine_('داوریِ تحلیلگرهای منبع ناموفق: ' + e.message); }
  var installs = [];
  try { installs = srcAutoInstall_(hub); } catch (e2) { logLine_('نصبِ خودکارِ تحلیلگرها ناموفق: ' + e2.message); }
  // آنچه در شیت می‌ماند باید به تلگرام و ایمیل هم برسد
  // آیا خودِ چرخه گیر کرده؟ اگر آری، اصلاحِ موتور خواسته می‌شود، نه اصلاحِ تحلیلگر.
  var health = null;
  try { health = srcCycleHealth_(hub, { verdicts: verdicts, installs: installs }); }
  catch (e4) { logLine_('سنجشِ سلامتِ چرخه ناموفق: ' + e4.message); }
  var digest = null;
  try { digest = srcNightlyDigest_(hub, audit); } catch (e3) { logLine_('گزارشِ شبانه ناموفق: ' + e3.message); }
  return { verdicts: verdicts, installs: installs, digest: digest, health: health };
}

/**
 * دواندنِ چرخه همین حالا، بی‌آنکه تا دورِ شبانه صبر کنیم.
 *
 * لازم است چون کدِ تازه در همان دورِ شبانه نصب می‌شود که خودش تمام شده — پس
 * قابلیتی که امشب رسیده، تا فردا شب اجرا نمی‌شود. این دکمه همان فاصله را پر
 * می‌کند. همان srcNightly_ را صدا می‌زند، نه نسخهٔ نرم‌ترش: اگر داوری به برگشت
 * برسد، همین‌جا هم برمی‌گردد.
 */
function runSourceCycleNow() {
  var ui = ui_();
  var r = srcNightly_();
  var L = [];

  if (!r.verdicts.length) L.push('داوری: چیزی برای داوری نبود.');
  for (var i = 0; i < r.verdicts.length; i++) {
    var v = r.verdicts[i];
    if (v.state === 'زود است') {
      L.push('⏳ ' + v.key + ' — هنوز زود است (' + v.hoursLeft + ' ساعت مانده).');
      continue;
    }
    L.push((v.rolledBack ? '↩️ ' : (v.state === 'خوب' ? '✅ ' : '⚠️ ')) +
           v.key + ' نسخهٔ ' + v.version + ' — ' + v.state);
    L.push('     خطای کدی پس از نصب: ' + v.code +
           (v.rateWas === null ? ' · ترازوی پیش از نصب ندارد، پس «بدتر نشد» سنجیده نشد'
                               : ' · نرخ ' + v.rateNow + ' در ساعت، پیش از نصب ' + v.rateWas));
    for (var j = 0; j < (v.sig || []).length; j++) {
      var g = v.sig[j];
      L.push('     ' + (g.fixed ? '✅' : '⚠️') + ' ' + g.title +
             (g.before === null ? '' : ' — پیش: ' + g.before) + ' · پس: ' + g.after);
    }
  }

  L.push('');
  if (!r.installs.length) L.push('نصب: بستهٔ تازه‌ای آماده نبود.');
  for (var k = 0; k < r.installs.length; k++) {
    var it = r.installs[k];
    L.push((it.ok ? '⬆️ ' : '• ') + it.key + (it.ok ? ' → نسخهٔ ' + it.version + ' نصب شد' : ' — ' + it.why));
  }
  L.push('');
  L.push('هرچه اینجا آمد، در تبِ گزارش‌ها هم ثبت شد و تلگرام/ایمیل هم رفت.');
  if (ui) ui.alert('▶️ چرخهٔ کدِ تحلیلگرهای منبع', L.join('\n'), ui.ButtonSet.OK);
  return r;
}

/** نمایشِ وضعیتِ چرخه از منو. */
function runShowSourceVerdict() {
  var all = srcInstalls_(), ui = ui_();
  var L = [];
  var keys = [];
  for (var k in all) if (all.hasOwnProperty(k)) keys.push(k);
  if (!keys.length) L.push('هنوز هیچ نصبی ثبت نشده.');
  for (var i = 0; i < keys.length; i++) {
    var r = all[keys[i]];
    L.push('• ' + keys[i] + ' — نسخهٔ ' + r.version + ' · نصب: ' + r.at +
           (r.backfilled ? ' (بازسازی‌شده)' : ''));
    if (r.rolledBackAt) L.push('     ↩️ برگشت خورد در ' + r.rolledBackAt);
    else if (r.verdict) L.push('     داوری: ' + r.verdict.state + ' (' + r.verdict.at +
                               ') · خطای کدی: ' + r.verdict.code);
    else L.push('     هنوز داوری نشده — در دورِ شبانهٔ بعد، یا همین حالا با ' +
                '«چرخهٔ تحلیلگرها را همین حالا بدوان».');
  }
  var bl = srcBlocked_(), nb = 0;
  for (var b in bl) if (bl.hasOwnProperty(b)) nb++;
  if (nb) L.push('', nb + ' بسته به‌خاطرِ برگشت مسدود است و خودکار نصب نمی‌شود.');
  L.push('', 'نصبِ خودکار: ' + (CFG.SRC_AUTO_INSTALL === false ? 'خاموش' : 'روشن'));
  if (ui) ui.alert('📊 چرخهٔ کدِ تحلیلگرهای منبع', L.join('\n'), ui.ButtonSet.OK);
  return all;
}

/* ─────────────────────────────────────────────────────────────────────────
   داوریِ نصبِ خودِ موتور — قرینهٔ همان چیزی که تحلیلگرها دارند.

   تا اینجا موتور هر شب خودش را عوض می‌کرد و هیچ‌کس فردا نمی‌پرسید «بهتر شد یا
   بدتر؟». تحلیلگرها این را داشتند و موتور نه؛ همان بخشی که بیشترین قدرت را دارد
   کمترین نظارت را داشت.

   ترازو دو شمارندهٔ ساده است: شمارهٔ قسمتِ «از همه جا از همه رنگ» و شمارهٔ قسمتِ
   «درس‌نامه». هر دو فقط وقتی جلو می‌روند که قسمتی واقعاً ساخته شده باشد — پس
   دروغ نمی‌گویند. اگر در پنجره‌ای که یک دورِ کاملِ تولید (۰۷:۰۰ و ۰۸:۰۰) داخلش
   است هیچ‌کدام جلو نرفته باشند، موتور کارش را نمی‌کند.

   فقط همین یک نشانه برگشت را راه می‌اندازد. شمارشِ ایرادهای وارسیِ سلامت هم
   سنجیده می‌شود ولی فقط گزارش می‌شود: بالا رفتنش ده‌ها علتِ بیرونی دارد و
   برگرداندنِ کدِ سالم به‌خاطرش، خودش خرابی است.
   ───────────────────────────────────────────────────────────────────────── */

/** شمارنده‌های همین لحظه: چند قسمت از هر پادکست تا حالا ساخته شده. */
function engCounters_() {
  var p = props_();
  return { ep: Number(p.getProperty(PK.EP_NUM) || 0) || 0,
           sp: Number(p.getProperty(PK.SP_EP_NUM) || 0) || 0 };
}

/** شمارشِ ایرادهای آخرین وارسیِ سلامت (از _STATUS.json، بی‌شبکه‌ای اضافه). */
function engHealthCount_() {
  try {
    var it = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).getFilesByName(STATUS_FILE);
    if (!it.hasNext()) return null;
    var st = JSON.parse(it.next().getBlob().getDataAsString());
    return st && st.health ? Number(st.health.problemCount || 0) : null;
  } catch (e) { return null; }
}

/**
 * نمونهٔ روزانهٔ شمارنده‌ها. حلقهٔ ۷تایی، پس هرگز بزرگ نمی‌شود.
 * بی این، در لحظهٔ تعویض نمی‌شد فهمید «نسخهٔ قبلی داشت تولید می‌کرد یا نه» —
 * و بی آن، برگرداندنِ کد به نسخه‌ای که خودش هم کار نمی‌کرد بی‌معنا بود.
 */
function engHeartbeat_() {
  var p = props_(), list = [];
  try { list = JSON.parse(p.getProperty(PK.ENG_BEAT) || '[]') || []; } catch (e) {}
  var c = engCounters_();
  list.push({ at: nowStr_(), ms: new Date().getTime(), ep: c.ep, sp: c.sp });
  while (list.length > 7) list.shift();
  p.setProperty(PK.ENG_BEAT, JSON.stringify(list));
  return list;
}

/** نزدیک‌ترین نمونه به «h ساعت پیش». اگر نداشتیم null. */
function engBeatBefore_(ms, hours) {
  var list = [];
  try { list = JSON.parse(props_().getProperty(PK.ENG_BEAT) || '[]') || []; } catch (e) {}
  var want = ms - (Number(hours) || 24) * 3600000, best = null, bestGap = Infinity;
  for (var i = 0; i < list.length; i++) {
    var gap = Math.abs(Number(list[i].ms || 0) - want);
    if (Number(list[i].ms || 0) <= ms && gap < bestGap) { bestGap = gap; best = list[i]; }
  }
  // نمونه‌ای که بیش از ۱۲ ساعت با هدف فاصله دارد ترازوی قابلِ اتکایی نیست.
  return (best && bestGap <= 12 * 3600000) ? best : null;
}

/** مُهرِ تعویضِ کد: شمارنده‌ها در لحظهٔ سوییچ + نرخِ تولیدِ نسخهٔ قبلی. */
function engStampSwap_(version) {
  var c = engCounters_(), now = new Date().getTime();
  var was = engBeatBefore_(now, Number(CFG.ENG_VERDICT_HOURS) || 20);
  var stamp = {
    version: String(version || ''), at: nowStr_(), ms: now,
    ep: c.ep, sp: c.sp,
    health: engHealthCount_(),
    // تولیدِ نسخهٔ قبلی در پنجره‌ای هم‌اندازه؛ null یعنی ترازو نداریم
    wasProducing: was ? ((c.ep - Number(was.ep || 0)) + (c.sp - Number(was.sp || 0))) : null,
    pending: true, judged: false
  };
  props_().setProperty(PK.ENG_STAMP, JSON.stringify(stamp));
  return stamp;
}

function engStamp_() {
  try { return JSON.parse(props_().getProperty(PK.ENG_STAMP) || 'null'); } catch (e) { return null; }
}

/** نسخه‌هایی که برگشت خورده‌اند و نباید دوباره خودکار نصب شوند. */
function engBlocked_() {
  try { return JSON.parse(props_().getProperty(PK.ENG_BLOCK) || '{}') || {}; } catch (e) { return {}; }
}
function engBlock_(version, why) {
  var all = engBlocked_();
  all[String(version)] = { at: nowStr_(), why: String(why || '') };
  props_().setProperty(PK.ENG_BLOCK, JSON.stringify(all));
}

/**
 * برگشتِ غیرتعاملیِ کدِ موتور به تازه‌ترین پشتیبان.
 * قرینهٔ installCodeRollback است بی‌پرسشِ YES/NO — چون در دورِ شبانه کسی نیست
 * که جواب بدهد.
 */
function engRollbackAuto_(why) {
  var best = null, bestT = 0;
  try {
    var it = codeFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      var nm = String(f.getName());
      // فقط پشتیبانِ کدِ خودِ موتور؛ فایل‌های «منبع — …» مالِ تحلیلگرهاست.
      if (nm.indexOf('پیش از') === -1 || nm.indexOf('منبع — ') === 0) continue;
      var t = f.getLastUpdated ? f.getLastUpdated().getTime() : 0;
      if (t >= bestT) { bestT = t; best = f; }
    }
  } catch (e) { return { ok: false, why: 'پوشهٔ کدها خوانده نشد: ' + e.message }; }
  if (!best) return { ok: false, why: 'هیچ پشتیبانی از کدِ موتور پیدا نشد.' };

  var text = best.getBlob().getDataAsString();
  var m = text.match(/CODE_VERSION:\s*'([^']+)'/);
  var ver = m ? m[1] : '';
  if (ver && verCmp_(String(ver), String(CFG.CODE_VERSION)) >= 0) {
    return { ok: false, why: 'پشتیبانِ پیداشده (' + ver + ') قدیمی‌تر از نسخهٔ فعلی نیست.' };
  }
  var r = installSource_(text, ver || 'قبلی', 'برگشتِ خودکار: ' + String(why || ''));
  if (!r.ok) return { ok: false, why: r.why || r.reason };
  return { ok: true, from: best.getName(), version: ver };
}

/**
 * داوریِ آخرین تعویضِ کدِ موتور، اگر وقتش رسیده باشد.
 * در دورِ شبانه پیش از هر نصبِ تازه صدا زده می‌شود.
 */
function engVerdict_() {
  if (CFG.ENG_VERDICT === false) return { state: 'خاموش' };
  var rec = engStamp_();
  if (!rec || rec.judged || rec.pending === false) return { state: 'چیزی برای داوری نیست' };
  var waitMs = (Number(CFG.ENG_VERDICT_HOURS) || 20) * 3600000;
  var now = new Date().getTime();
  var age = now - Number(rec.ms || 0);
  if (!isFinite(age) || age < waitMs) {
    return { state: 'زود است', hoursLeft: Math.ceil((waitMs - age) / 3600000) };
  }

  var c = engCounters_();
  var made = (c.ep - Number(rec.ep || 0)) + (c.sp - Number(rec.sp || 0));
  var healthNow = engHealthCount_();
  var out = { state: 'خوب', version: rec.version, at: rec.at,
              hours: Math.round(age / 3600000), made: made,
              wasProducing: rec.wasProducing,
              healthWas: rec.health, healthNow: healthNow, rolledBack: false };

  // نشانهٔ سخت: در یک دورِ کاملِ تولید هیچ قسمتی ساخته نشد، درحالی‌که نسخهٔ
  // قبلی داشت می‌ساخت. اگر نسخهٔ قبلی هم نمی‌ساخت، برگرداندن دردی دوا نمی‌کند.
  var stopped = (made === 0) && (rec.wasProducing === null || rec.wasProducing > 0);

  if (stopped && CFG.ENG_ROLLBACK !== false) {
    var why = 'در ' + out.hours + ' ساعت پس از نصبِ ' + rec.version +
              ' هیچ قسمتی ساخته نشد' +
              (rec.wasProducing ? ' (نسخهٔ قبلی در همین مدت ' + rec.wasProducing + ' قسمت ساخته بود)' : '') + '.';
    var rb = engRollbackAuto_(why);
    out.state = rb.ok ? 'برگشت خورد' : 'ایستاده ولی برگشت نخورد';
    out.rolledBack = !!rb.ok;
    out.why = why + (rb.ok ? ' برگشت به ' + rb.version + '.' : ' ' + rb.why);
    if (rb.ok) engBlock_(rec.version, why);
    srcNotify_('⛔ موتور پس از نسخهٔ ' + rec.version + ' قسمتی نساخت — ' +
               (rb.ok ? 'برگشت به نسخهٔ قبل' : 'برگشت انجام نشد'), out.why, true);
    try {
      logSelfFinding_(getHub_(), { priority: 'جدی', category: 'کدِ موتور',
        key: 'engverdict-' + rec.version, title: 'نصبِ ' + rec.version + ': ' + out.state,
        detail: out.why, instruction: 'علتِ ایستادنِ تولید بررسی شود.',
        owner: ROWNER_SRCCODE });
    } catch (eL) {}
  } else {
    var healthUp = (healthNow !== null && rec.health !== null &&
                    healthNow - rec.health >= 3 && healthNow > rec.health * 2);
    out.state = stopped ? 'قسمتی ساخته نشد (برگشت خاموش است)'
                        : (healthUp ? 'تولید سالم، ولی ایرادهای سلامت بالا رفت' : 'خوب');
    srcNotify_('نتیجهٔ نصبِ کدِ موتور نسخهٔ ' + rec.version + ' — ' + out.state,
      'پنجره: ' + out.hours + ' ساعت پس از نصب.\n' +
      'قسمت‌های ساخته‌شده در این مدت: ' + made +
      (rec.wasProducing === null ? ' (نسخهٔ قبلی ترازو نداشت)'
                                 : ' · نسخهٔ قبلی در مدتی هم‌اندازه: ' + rec.wasProducing) + '\n' +
      'ایرادهای وارسیِ سلامت: ' + (rec.health === null ? '؟' : rec.health) +
      ' → ' + (healthNow === null ? '؟' : healthNow) +
      (healthUp ? '\n⚠️ این بالا رفتن گزارش می‌شود ولی برگشت را راه نمی‌اندازد؛ ' +
                  'علت‌های بیرونی زیاد دارد.' : ''));
    try {
      logSelfFinding_(getHub_(), { priority: healthUp ? 'متوسط' : 'کم', category: 'کدِ موتور',
        key: 'engverdict-' + rec.version,
        title: 'داوریِ نصبِ کدِ موتور ' + rec.version + ': ' + out.state,
        detail: 'قسمت‌ها: ' + made + ' · سلامت: ' + rec.health + ' → ' + healthNow,
        instruction: '', owner: ROWNER_SRCCODE });
    } catch (eL2) {}
  }

  rec.judged = true; rec.pending = false; rec.verdict = { state: out.state, at: nowStr_() };
  props_().setProperty(PK.ENG_STAMP, JSON.stringify(rec));
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
   گزارشِ شبانه به تلگرام و ایمیل.

   صاحبِ پروژه به شیت نگاه نمی‌کند — و نباید مجبور باشد. تا اینجا هر چیزی که
   دربارهٔ *کد* بود خبر می‌داد (نصب، داوری، برگشت)، ولی دو چیز فقط در شیت
   می‌ماند و بیرون نمی‌آمد:

     ۱) نتیجهٔ پاک‌سازیِ ردیف‌های خطا. آن کار داخلِ خودِ تحلیلگرها انجام می‌شود و
        آن اسکریپت‌ها اصلاً راهی برای خبردادن ندارند — نه ایمیل، نه تلگرام.
        پس موتور خودش شمارش را پیش و پس می‌کند و تفاوت را می‌گوید.
     ۲) یافته‌هایی که وارسیِ شبانه در تبِ گزارش‌ها ثبت می‌کند.

   فقط وقتی چیزی عوض شده باشد پیام می‌رود؛ گزارشِ «هیچ اتفاقی نیفتاد» هر شب،
   خودش می‌شود نویز و بعد از یک هفته کسی نمی‌خواندش.
   ───────────────────────────────────────────────────────────────────────── */

var SRC_FINAL_MARK = '⟪نهایی⟫';

/** شمارشِ ردیف‌های خطای هر تحلیلگر، همین حالا. */
function srcErrSnap_(hub) {
  var out = {}, list = CFG.SOURCE_SCRIPTS || [];
  for (var i = 0; i < list.length; i++) {
    var rows = srcErrRows_(hub, list[i].key, 0, 0);
    var fin = 0;
    for (var r = 0; r < rows.length; r++) {
      if (String(rows[r].text || '').indexOf(SRC_FINAL_MARK) !== -1 ||
          String(rows[r].type || '').indexOf(SRC_FINAL_MARK) !== -1) fin++;
    }
    out[list[i].key] = { rows: rows.length, final: fin };
  }
  return out;
}

/**
 * تفاوتِ امشب با دیشب را می‌گوید و در صورتِ لزوم خبر می‌دهد.
 * `audit` همان چیزی است که auditSourceScripts برگردانده (برای شمردنِ یافته‌ها).
 */
function srcNightlyDigest_(hub, audit) {
  hub = hub || getHub_();
  var now = srcErrSnap_(hub), prev = null;
  try { prev = JSON.parse(props_().getProperty(PK.SRCSCRIPT_SNAP) || 'null'); } catch (e) {}
  props_().setProperty(PK.SRCSCRIPT_SNAP, JSON.stringify(now));

  var lines = [], changed = false;
  var list = CFG.SOURCE_SCRIPTS || [];
  for (var i = 0; i < list.length; i++) {
    var k = list[i].key, nm = list[i].name || k;
    var a = prev && prev[k] ? Number(prev[k].rows || 0) : null;
    var b = Number(now[k].rows || 0);
    if (a === null) { lines.push('• ' + nm + ': ' + b + ' ردیفِ خطا (نخستین شمارش)'); continue; }
    if (a === b) { lines.push('• ' + nm + ': ' + b + ' ردیف — بی‌تغییر'); continue; }
    changed = true;
    lines.push('• ' + nm + ': ' + a + ' → ' + b + ' ردیف' +
               (b < a ? '  (' + (a - b) + ' ردیف حذف شد؛ فایل‌هایشان دوباره در صفِ تحلیل‌اند)'
                      : '  (' + (b - a) + ' خطای تازه)'));
    if (now[k].final) {
      lines.push('     ' + now[k].final + ' ردیف با برچسبِ «نهایی» کنار گذاشته شده — ' +
                 'بیش از سه بار شکستند و دیگر تلاش نمی‌شوند.');
    }
  }

  var logged = audit && audit.logged ? Number(audit.logged) : 0;
  if (logged) {
    changed = true;
    lines.push('', '📋 ' + logged + ' یافتهٔ تازه در تبِ گزارش‌ها ثبت شد.');
    var samples = (audit.errors && audit.errors.samples) || [];
    for (var s = 0; s < Math.min(samples.length, 3); s++) {
      if (samples[s].kind !== 'code') continue;
      lines.push('   • ' + samples[s].label);
    }
  }

  if (!changed) return { sent: false, snapshot: now };
  srcNotify_('🧹 گزارشِ شبانهٔ تحلیلگرهای منبع', lines.join('\n'));
  return { sent: true, snapshot: now, lines: lines };
}

/* ─────────────────────────────────────────────────────────────────────────
   وقتی خودِ چرخه گیر می‌کند — نه کدِ تحلیلگر، نه کدِ پادکست.

   تا اینجا هر یافته یکی از دو جا می‌رفت: «کدِ تحلیلگر ایراد دارد» یا «موتور در
   کارِ پادکست ایراد دارد». ولی چند بار چیزی پیش آمد که هیچ‌کدام نبود:

     • اثرانگشتِ کدِ زنده در موتور جور دیگری حساب می‌شد و baseSha256 هرگز
       نمی‌خواند — یعنی هر نصبی برای همیشه متوقف می‌شد
     • داوری ترازوی پیش از نصب نداشت
     • تحلیلگرها هیچ راهی برای خبردادن نداشتند

   هیچ‌کدام باگِ تحلیلگر نبود. برای هرکدام باید *کدِ موتور* عوض می‌شد تا دفعهٔ
   بعد کدِ منبع را بهتر اداره کند. و هیچ‌کدام هم خودبه‌خود در گزارش‌ها به این
   شکل ثبت نمی‌شد؛ آدم باید می‌دید و می‌فهمید.

   اینجا همان را خودکار می‌کنیم. شرطِ «چند شبِ پیاپی» عمدی است: یک شبِ بد
   می‌تواند قطعیِ شبکه باشد؛ سه شبِ پشتِ سرِ هم یعنی سازوکار ایراد دارد.
   ───────────────────────────────────────────────────────────────────────── */

function srcHealthState_() {
  try { return JSON.parse(props_().getProperty(PK.SRCSCRIPT_HEALTH) || '{}') || {}; }
  catch (e) { return {}; }
}
function srcHealthSave_(st) {
  props_().setProperty(PK.SRCSCRIPT_HEALTH, JSON.stringify(st || {}));
}

/**
 * یافته‌ای که می‌گوید «کدِ خودِ موتور باید عوض شود تا کدِ منبع را بهتر اداره کند».
 * جدا نوشته شده تا هر جای دیگری هم که چنین چیزی فهمید، از همین در وارد شود.
 */
function srcEngineFinding_(hub, key, title, detail, instruction) {
  try {
    logSelfFinding_(hub || getHub_(), {
      priority: 'جدی', category: 'سازوکارِ کدِ منبع',
      key: 'engsrc-' + key,
      title: title,
      // هرگز متنِ کدِ تحلیلگر در این ردیف نمی‌آید؛ این ردیف نشانه است نه بسته.
      detail: String(detail || '').slice(0, 1200),
      instruction: instruction,
      owner: ROWNER_ENGSRC
    });
  } catch (e) { logLine_('ثبتِ یافتهٔ سازوکار ناموفق: ' + e.message); }
  try {
    srcNotify_('🧩 سازوکارِ کدِ منبع نیاز به اصلاحِ موتور دارد — ' + title,
      String(detail || '') + '\n\nچه باید بشود: ' + instruction +
      '\n\nاین در تبِ گزارش‌ها با وضعیتِ «نیازمند تعویض کد» ثبت شد، ' +
      'پس در دورِ بعدیِ ساختِ کد برداشته می‌شود.');
  } catch (e2) {}
}

/**
 * سلامتِ خودِ چرخه را می‌سنجد و اگر گیر کرده باشد، اصلاحِ موتور را می‌خواهد.
 * `res` همان چیزی است که srcNightly_ تا اینجا جمع کرده.
 */
function srcCycleHealth_(hub, res) {
  hub = hub || getHub_();
  var st = srcHealthState_();
  var list = CFG.SOURCE_SCRIPTS || [];
  var raised = [];
  var bump = function (k) { st[k] = (Number(st[k]) || 0) + 1; return st[k]; };
  var clear = function (k) { st[k] = 0; };

  // ── ۱) همهٔ تحلیلگرها می‌گویند «کدِ زنده دستی عوض شده»
  // یکی‌شان ممکن است واقعاً دستی عوض شده باشد. هر دو، چند شبِ پیاپی، یعنی
  // اثرانگشت را ما اشتباه حساب می‌کنیم. این دقیقاً همان باگِ «\n» اضافه بود.
  var tampered = 0, checked = 0;
  for (var i = 0; i < list.length; i++) {
    var v = null;
    try { v = srcVerify_(list[i].key); } catch (e) { continue; }
    checked++;
    if ((v.errors || []).some(function (x) { return /دستی عوض شده/.test(x); })) tampered++;
  }
  if (checked && tampered === checked) {
    if (bump('tampered') >= 2) {
      srcEngineFinding_(hub, 'basesha-all',
        'همهٔ تحلیلگرها «دستی عوض شده» گزارش می‌شوند — احتمالاً اثرانگشت را موتور اشتباه حساب می‌کند',
        'در ' + st.tampered + ' شبِ پیاپی، هر ' + checked + ' تحلیلگر با پیامِ «کدِ زنده دستی عوض ' +
        'شده» رد شدند. اینکه همه با هم دستی عوض شده باشند بعید است؛ محتمل‌تر این است که ' +
        'محاسبهٔ اثرانگشتِ کدِ زنده در موتور با تعریفِ فایلِ ریپو یکی نباشد.',
        'در بخشِ ۲۲، srcJoinJs_ را با کدِ زندهٔ واقعی بسنج و مطمئن شو تنها همان‌جا ' +
        'اثرانگشتِ کدِ زنده حساب می‌شود. یک بار یک «\\n» اضافه در ابتدای فایل همین ' +
        'را به وجود آورد و هر نصبی را برای همیشه متوقف کرد.');
      clear('tampered');
      raised.push('basesha-all');
    }
  } else { clear('tampered'); }

  // ── ۲) نصب پیاپی شکست می‌خورد (نه «چیزی برای نصب نبود»)
  var failed = ((res && res.installs) || []).filter(function (x) {
    return x && x.ok === false && x.why && !/از قبل نصب|آماده نبود|برگشت خورده/.test(x.why); });
  if (failed.length) {
    if (bump('installFail') >= 2) {
      srcEngineFinding_(hub, 'install-fail',
        'نصبِ کدِ تحلیلگرها چند شبِ پیاپی شکست می‌خورد',
        st.installFail + ' شبِ پیاپی. آخرین علت‌ها: ' +
        failed.map(function (x) { return x.key + ': ' + x.why; }).join(' | '),
        'مسیرِ نصب در بخشِ ۲۲ (srcInstall_/srcPutJs_) بررسی شود — دسترسی، آدرسِ ' +
        'محتوا، یا شکلِ بسته‌ای که PUT می‌شود.');
      clear('installFail');
      raised.push('install-fail');
    }
  } else { clear('installFail'); }

  // ── ۳) اصلاح جواب نداده: نشانه‌ای که پس از نصب هنوز می‌آید
  // یعنی خودِ اصلاح ناکافی بوده. اگر دو نسخهٔ پیاپی هم درستش نکردند، مشکل در
  // شیوهٔ ساختِ اصلاح است، نه در آن یک نسخه.
  var unfixed = [];
  var vs = (res && res.verdicts) || [];
  for (var q = 0; q < vs.length; q++) {
    var sig = vs[q].sig || [];
    for (var g = 0; g < sig.length; g++) {
      if (sig[g].fixed === false) unfixed.push(vs[q].key + '/' + sig[g].id);
    }
  }
  if (unfixed.length) {
    if (bump('unfixed') >= 2) {
      srcEngineFinding_(hub, 'fix-insufficient',
        'اصلاحِ ساخته‌شده نشانه را از بین نبرده — دو نسخهٔ پیاپی کافی نبوده',
        'نشانه‌های هنوز فعال: ' + unfixed.join(' ، ') + '. یعنی بسته‌ای که ساختیم ' +
        'ریشهٔ خطا را نگرفته است.',
        'پیش از ساختِ بستهٔ بعدی، جمله‌های واقعیِ خطا از تبِ «خطاهای منبع» خوانده و ' +
        'ریشه‌یابی شود؛ و اگر نشانهٔ resolves درست تعریف نشده، خودِ تعریفش اصلاح شود.');
      clear('unfixed');
      raised.push('fix-insufficient');
    }
  } else { clear('unfixed'); }

  // ── ۴) بسته‌ای که برگشت خورده و چند شب مسدود مانده
  var blocked = srcBlocked_(), nb = 0;
  for (var b in blocked) if (blocked.hasOwnProperty(b)) nb++;
  if (nb) {
    if (bump('blocked') >= 3) {
      srcEngineFinding_(hub, 'stuck-blocked',
        nb + ' بستهٔ تحلیلگر برگشت خورده و چرخه ' + st.blocked + ' شب است گیر کرده',
        'تا وقتی بستهٔ تازه‌ای ساخته نشود، این تحلیلگر روی کدِ قدیمی می‌ماند.',
        'علتِ برگشت از پیام‌های داوری خوانده شود و بستهٔ تازه با نسخهٔ بالاتر ساخته ' +
        'شود؛ اثرانگشتِ تازه خودبه‌خود از فهرستِ مسدود بیرون است.');
      clear('blocked');
      raised.push('stuck-blocked');
    }
  } else { clear('blocked'); }

  srcHealthSave_(st);
  return { raised: raised, state: st };
}
