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
 *  اسکریپتِ چسبیده به یک شیت (container-bound) از روی شناسهٔ شیت قابلِ کشف
 *  نیست؛ گوگل فهرستش نمی‌کند. پس شناسه یک بار در CFG.SOURCE_SCRIPTS گذاشته
 *  می‌شود — و همین‌جا وارسی می‌شود که واقعاً به همان شیت چسبیده باشد
 *  (فیلدِ parentId در پاسخِ API). این جلوی «شناسهٔ اشتباه برای شیتِ اشتباه»
 *  را می‌گیرد، که وگرنه بی‌سروصدا کدِ عوضی را تحلیل می‌کردیم.
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
function srcErrKind_(text) {
  var t = String(text || '');
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
                reachable: false, boundTo: '', bindingOk: null, files: 0, chars: 0,
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
      rec.note = 'خوانده نشد — ' + String(why).replace(/\s+/g, ' ').slice(0, 200);
      out.scripts.push(rec); out.problems.push(rec.name + ': ' + rec.note);
      continue;
    }
    rec.reachable = true;
    var files = (got.json && got.json.files) || [];
    rec.files = files.length;

    // چسبندگی: اسکریپتِ container-bound فیلدِ parentId دارد = شناسهٔ همان شیت
    rec.boundTo = String((got.json && got.json.parentId) || '');
    if (s.sheetId) {
      rec.bindingOk = (rec.boundTo === s.sheetId);
      if (!rec.bindingOk) {
        rec.note = rec.boundTo
          ? 'این اسکریپت به شیتِ دیگری چسبیده (' + rec.boundTo + ') — شناسه‌ها را چک کنید.'
          : 'اسکریپتِ مستقل است و به شیتی نچسبیده — شاید شناسهٔ اشتباهی داده شده.';
        out.problems.push(rec.name + ': ' + rec.note);
      }
    }

    var all = '';
    for (var f = 0; f < files.length; f++) {
      if (files[f].type === 'SERVER_JS') all += '\n' + String(files[f].source || '');
    }
    rec.chars = all.length;
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

/** خلاصه برای _STATUS.json — سبک، بی متنِ کد. */
function sourceScriptsStatus_() {
  try {
    var a = sourceScriptsAudit_();
    var slim = [];
    for (var i = 0; i < a.scripts.length; i++) {
      var s = a.scripts[i];
      slim.push({ key: s.key, name: s.name, reachable: s.reachable, bindingOk: s.bindingOk,
                  files: s.files, chars: s.chars, sha256: s.sha256,
                  functions: s.functions.length, note: s.note });
    }
    return { configured: a.configured, checked: a.checked, ok: a.ok,
             problems: a.problems, scripts: slim };
  } catch (e) { return null; }
}

/**
 * خطاهای منبع را دسته‌بندی می‌کند و «طوفانِ تلاشِ دوباره» را پیدا می‌کند:
 * یک شناسهٔ فایل که بارها در گزارش تکرار شده یعنی کد آن را برای همیشه کنار
 * نمی‌گذارد و هر دور دوباره امتحانش می‌کند — همان چیزی که ۲۳۲ خطا از ۲۳۶ را ساخت.
 */
function sourceErrDigest_(hub) {
  var out = { total: 0, byKind: {}, storms: [], samples: [] };
  var errs;
  try { errs = srcErrorSummary_(hub || getHub_(), 60); } catch (e) { return out; }
  var rec = (errs && errs.recent) || [];
  out.total = (errs && errs.total) || 0;
  var seenFile = {}, seenKind = {};
  for (var i = 0; i < rec.length; i++) {
    var r = rec[i], k = srcErrKind_(r.text);
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
  L.push('خطاهای اخیر بر پایهٔ دسته: ' + JSON.stringify(r.errors.byKind));
  if (r.errors.storms.length) L.push('طوفانِ تلاشِ دوباره: ' + r.errors.storms.length + ' فایل');
  L.push('');
  L.push(r.logged + ' یافته در تبِ گزارش‌ها ثبت شد (بدونِ هیچ نصبی).');
  ui.alert('🔍 وارسیِ اسکریپت‌های منبع', L.join('\n'), ui.ButtonSet.OK);
  return r;
}
