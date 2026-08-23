/**
 * 21_SelfUpdate.gs — نصبِ خودکارِ کدِ تازه با Google Apps Script API
 *
 * ══ مسئله‌ای که این بخش حل می‌کند ══
 *
 * تا امروز چرخهٔ «کد باید عوض شود» دستی و آشفته بود: ناظرِ Cowork در تبِ
 * گزارش‌ها می‌نوشت «نیازمند تعویض کد»، جایی یک _CODE-LATEST.json می‌گذاشت که
 * فقط می‌گفت «نسخهٔ تازه ساخته شد» — بی اینکه بگوید خودِ کد کجاست — و کاربر
 * باید در سشن‌های ساعت‌به‌ساعت دنبالِ فایل می‌گشت، دستی کپی می‌کرد، و هیچ‌کس
 * هم جلوی ردیفِ گزارش «انجام شد» نمی‌زد. یک بار هم بسته‌ای با برچسبِ ۵٫۹
 * ساخته شد که داخلش ۵٫۸ بود — چون برچسب و محتوا دو جای جدا نوشته می‌شدند.
 *
 * ══ چرخهٔ تازه ══
 *
 *   ۱) ناظرِ Cowork کدِ کامل را می‌سازد و دو چیز در OUTPUT می‌گذارد:
 *      خودِ فایلِ کامل («_CODE-v<نسخه>.gs») و بیانیهٔ «_CODE-LATEST.json» با
 *      نسخه، خلاصه، نامِ فایل، اثرانگشتِ SHA-256 و شناسهٔ ردیف‌های گزارشی
 *      که این کد جوابشان است.
 *   ۲) موتور هر شب (پیش از پشتیبان‌گیری) selfUpdateStep را اجرا می‌کند:
 *      بسته را برمی‌دارد، سخت‌گیرانه وارسی می‌کند — از جمله اینکه نسخهٔ
 *      نوشته‌شده «داخلِ خودِ فایل» با نسخهٔ اعلامی یکی باشد (همان دامِ
 *      ۵٫۹/۵٫۸) — از کدِ فعلی نسخهٔ پشتیبان می‌گیرد، و با Apps Script API
 *      کدِ پروژه را جایگزین می‌کند. فایلِ خراب اصلاً نصب نمی‌شود: خودِ
 *      گوگل هنگامِ ذخیره کد را کامپایل می‌کند و خطای ساختاری را رد می‌دهد.
 *   ۳) بلافاصله یک تریگرِ یک‌بارمصرف afterCodeSwap را صدا می‌زند که دیگر با
 *      «کدِ تازه» اجرا می‌شود: زمان‌بندی‌ها را وارسی می‌کند، جلوی ردیف‌های
 *      گزارش «کد نصب شد» می‌زند، بیانیه را با ساعتِ نصب کامل می‌کند و در
 *      تلگرام و ایمیل با لینکِ دقیقِ نسخهٔ ذخیره‌شده خبر می‌دهد.
 *   ۴) ناظرِ فردا می‌بیند نسخهٔ در حالِ اجرا همان است، ردیف را «تأیید» و
 *      بسته می‌کند. هیچ‌جای این چرخه دستِ کاربر لازم نیست.
 *
 * هر نسخه — قبلی و تازه — در پوشهٔ «کدها» داخلِ OUTPUT می‌ماند و هر شب
 * همراهِ شیت‌ها پشتیبان گرفته و در پیامِ پشتیبان لینک می‌شود.
 *
 * ══ اگر دسترسیِ API نبود ══
 *
 * این قابلیت سه پیش‌نیازِ یک‌بارهٔ *جدا از هم* دارد و هر سه باید برقرار باشند:
 *
 *   ۱) سوییچِ «Google Apps Script API» در تنظیماتِ کاربریِ حساب:
 *      https://script.google.com/home/usersettings
 *      این تنظیمِ «کاربر» است، نه «پروژه» — در appsscript.json دیده نمی‌شود و
 *      از داخلِ ویرایشگر هم پیدا نیست. خاموش بودنش دقیقاً HTTP 403 می‌دهد.
 *   ۲) اسکوپِ script.projects در appsscript.json — و تأییدِ دوبارهٔ اجازه‌ها،
 *      چون افزودنِ اسکوپ به‌تنهایی توکنِ قبلی را عوض نمی‌کند.
 *   ۳) فعال‌بودنِ سرویسِ script.googleapis.com در پروژهٔ ابریِ (GCP) متصل به
 *      اسکریپت. این سومی جای کاملاً دیگری است و در تجربهٔ واقعی همان بود که
 *      همه را گمراه کرد: دوتای اول درست بودند و باز ۴۰۳ می‌آمد.
 *
 * هیچ‌کدام جای دیگری را جبران نمی‌کند. پیشتر این کامنت فرض کرده بود مورد ۱
 * «روشن شده» و پیامِ خطا فقط مورد ۲ را می‌گفت — نتیجه‌اش این بود که کاربر
 * appsscript.json را درست می‌کرد، باز ۴۰۳ می‌گرفت و دلیلش را نمی‌فهمید.
 * اگر هر کدام نباشد موتور خراب نمی‌شود: پیامِ روشن می‌دهد (همراهِ متنِ خودِ
 * گوگل، که معمولاً مستقیم می‌گوید کدام‌یک است) و روالِ اعلامِ دستی برقرار می‌ماند.
 */

var SELFUP_ANCHORS = ['function produceEpisode', 'function renderAudioStep_',
                      'function runBackupStep', 'function selfUpdateStep',
                      'function afterCodeSwap', 'function syncCatalog'];

/**
 * آدرسِ محتوای هر اسکریپت. اینجا (بخشِ ۲۱) تعریف می‌شود نه در ۲۲، چون بخشِ
 * پایین‌تر نباید به بالاتر وابسته باشد: در فایلِ سرِهم‌شده hoisting نجاتش
 * می‌دهد، ولی هر بارگذارِ جزئی (آزمون‌ها) با ReferenceError می‌شکند.
 */
function scriptContentUrlFor_(scriptId) {
  return 'https://script.googleapis.com/v1/projects/' +
         encodeURIComponent(scriptId) + '/content';
}

function scriptContentUrl_() {
  return scriptContentUrlFor_(ScriptApp.getScriptId());
}

/** فراخوانِ Apps Script API با هویتِ خودِ کاربر. */
function scriptApiFetch_(method, payloadOpt) {
  var opt = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  };
  if (payloadOpt !== undefined) {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(payloadOpt);
  }
  var res = UrlFetchApp.fetch(scriptContentUrl_(), opt);
  var out = { code: res.getResponseCode(), text: res.getContentText(), json: null };
  try { out.json = JSON.parse(out.text); } catch (e) {}
  return out;
}

function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
                                      String(text), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

/** بیانیهٔ کد (جلوترین نسخه، همان قاعدهٔ checkCodeUpdate_). */
/** آدرسِ raw یک فایل در ریپوی گیت‌هاب، با ضدِ حافظهٔ پنهانِ CDN. */
function githubRawUrl_(file) {
  return 'https://raw.githubusercontent.com/' + CFG.GITHUB_OWNER + '/' + CFG.GITHUB_REPO +
         '/' + CFG.GITHUB_BRANCH + '/' + file + '?t=' + (new Date().getTime());
}

/** بیانیه مستقیم از raw گیت‌هاب. */
function readCodeManifestGithub_() {
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(CFG.GITHUB_MANIFEST),
                { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return null;
    var info = JSON.parse(res.getContentText());
    if (!info || !info.version) return null;
    return { info: info, file: null };   // روی گیت‌هاب فایلِ قابلِ‌بازنویسی نداریم
  } catch (e) { return null; }
}

function readCodeManifest_() {
  if (CFG.CODE_SOURCE === 'github') return readCodeManifestGithub_();
  var info = null, file = null;
  try {
    var it = outFolder_().getFilesByName(CFG.CODE_FILE), seen = 0;
    while (it.hasNext() && seen++ < 10) {
      var f = it.next(), cand = null;
      try { cand = JSON.parse(f.getBlob().getDataAsString()); } catch (e) { continue; }
      if (!cand || !cand.version) continue;
      if (!info || verCmp_(String(cand.version), String(info.version)) > 0) {
        info = cand; file = f;
      }
    }
  } catch (e) {}
  return info ? { info: info, file: file } : null;
}

/** خودِ بستهٔ کد: با شناسه اگر داده شده، وگرنه با نام در OUTPUT. */
function findCodePkg_(info) {
  if (CFG.CODE_SOURCE === 'github') {
    try {
      var gf = String(info.codeFile || CFG.GITHUB_CODE_FILE);
      var gres = UrlFetchApp.fetch(githubRawUrl_(gf),
                   { muteHttpExceptions: true, followRedirects: true });
      if (gres.getResponseCode() !== 200) return null;
      return { file: null, text: gres.getContentText() };
    } catch (eg) { return null; }
  }
  try {
    if (info.fileId) {
      var f0 = DriveApp.getFileById(String(info.fileId));
      return { file: f0, text: f0.getBlob().getDataAsString() };
    }
  } catch (e0) {}
  try {
    if (info.fileName) {
      var it = outFolder_().getFilesByName(String(info.fileName));
      if (it.hasNext()) {
        var f1 = it.next();
        return { file: f1, text: f1.getBlob().getDataAsString() };
      }
    }
  } catch (e1) {}
  return null;
}

/**
 * وارسیِ سخت‌گیرانهٔ بسته. فهرستِ ایرادها را برمی‌گرداند؛ خالی یعنی سالم.
 * مهم‌ترینش «نسخهٔ داخلِ فایل»: همان چیزی که یک بار ۵٫۸ ماند و برچسب ۵٫۹ خورد.
 */
function validateCodePkg_(text, info) {
  var errs = [];
  var t = String(text || '');
  if (t.length < 100000) errs.push('فایل خیلی کوچک است (' + t.length + ' نویسه) — کدِ کامل نیست');
  if (t.length > 3000000) errs.push('فایل به‌طرزِ نامعقولی بزرگ است');
  var m = t.match(/CODE_VERSION:\s*'([^']+)'/);
  if (!m) errs.push('CODE_VERSION داخلِ فایل پیدا نشد');
  else if (String(m[1]) !== String(info.version)) {
    errs.push('نسخهٔ داخلِ فایل (' + m[1] + ') با نسخهٔ اعلامی (' + info.version +
              ') نمی‌خواند — همان اشتباهی که یک بار با برچسبِ ۵٫۹ و محتوای ۵٫۸ رخ داد');
  }
  if (info.sha256) {
    var got = sha256Hex_(t);
    if (got !== String(info.sha256).toLowerCase()) {
      errs.push('اثرانگشتِ SHA-256 نمی‌خواند (فایل ناقص رسیده یا عوض شده)');
    }
  }
  for (var i = 0; i < SELFUP_ANCHORS.length; i++) {
    if (t.indexOf(SELFUP_ANCHORS[i]) === -1) {
      errs.push('تابعِ ضروری «' + SELFUP_ANCHORS[i] + '» در بسته نیست — نصبش موتور را ناقص می‌کرد');
    }
  }
  return errs;
}

/** وسطِ کارِ حساس؟ (صداگذاری، پشتیبان‌گیری) — نصب به بعد موکول می‌شود. */
function engineBusyForSwap_() {
  var p = props_();
  return !!(p.getProperty(PK.PENDING) || p.getProperty(PK.SP_PENDING) ||
            p.getProperty(PK.BACKUP_STATE));
}

/** پوشهٔ «کدها» داخل OUTPUT — بایگانیِ همهٔ نسخه‌ها. */
function codeFolder_() {
  var root = outFolder_();
  var it = root.getFoldersByName(CFG.CODE_FOLDER);
  if (it.hasNext()) return it.next();
  return root.createFolder(CFG.CODE_FOLDER);
}

function saveCodeCopy_(name, text) {
  var folder = codeFolder_();
  var it = folder.getFilesByName(name);
  if (it.hasNext()) { var f = it.next(); f.setContent(text); return f; }
  return folder.createFile(Utilities.newBlob(text, 'text/plain', name));
}

/** تازه‌ترین فایلِ پوشهٔ کدها — برای پشتیبانِ شبانه و پیام‌ها. */
function latestCodeCopy_() {
  try {
    var it = codeFolder_().getFiles(), best = null, bestT = 0;
    while (it.hasNext()) {
      var f = it.next();
      var t = f.getLastUpdated ? f.getLastUpdated().getTime() : 0;
      if (t >= bestT) { bestT = t; best = f; }
    }
    return best;
  } catch (e) { return null; }
}

/**
 * از پاسخِ خودِ گوگل می‌فهمد کدام‌یک از سه پیش‌نیاز غایب است و فقط همان را
 * می‌گوید. فهرست‌کردنِ هر سه‌تا کاربر را سرگردان می‌کند — بارِ اول دقیقاً همین
 * شد: پیام «appsscript.json» را نشان داد، کاربر همان را درست کرده بود، و علتِ
 * واقعی چیزِ سومی بود (سرویس در پروژهٔ ابری فعال نبود) که اصلاً گفته نمی‌شد.
 *
 * برمی‌گرداند { key, text }.
 */
function selfUpdateCause_(full) {
  var t = String(full || '');

  // ۱) سرویس در پروژهٔ ابریِ متصل به اسکریپت فعال نیست (SERVICE_DISABLED)
  if (t.indexOf('SERVICE_DISABLED') !== -1 || t.indexOf('has not been used in project') !== -1) {
    var url = '';
    var m = t.match(/"activationUrl"\s*:\s*"([^"]+)"/);
    if (m) url = m[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    if (!url) {
      var pm = t.match(/project[ =]([0-9]{6,})/);
      url = 'https://console.developers.google.com/apis/api/script.googleapis.com/overview' +
            (pm ? '?project=' + pm[1] : '');
    }
    return { key: 'service-disabled', text:
      'علت: خودِ «Apps Script API» در پروژهٔ ابری (Google Cloud) که این اسکریپت به آن وصل است ' +
      'فعال نیست. این با سوییچِ تنظیماتِ کاربری و با اسکوپِ appsscript.json فرق دارد و ' +
      'جای دیگری روشن می‌شود.\n\n' +
      'چاره (یک‌باره): این نشانی را باز کنید و دکمهٔ Enable را بزنید، بعد دو-سه دقیقه صبر ' +
      'کنید تا در سامانهٔ گوگل جا بیفتد:\n' + url + '\n\n' +
      'اگر کنسول گفت «You need additional access» یا resourcemanager.projects.get غایب است، ' +
      'یعنی این یک پروژهٔ «پیش‌فرضِ» Apps Script است و گوگل هیچ‌کس را داخلش راه نمی‌دهد — ' +
      'دکمهٔ Request access را نزنید، صاحبی نیست که تأیید کند. راهِ درست این است که اسکریپت ' +
      'را به یک پروژهٔ ابریِ «استاندارد» ببرید:\n' +
      '  ۱) یک پروژهٔ استاندارد بردارید — یکی از پروژه‌های موجودتان هم می‌شود، ' +
      'یا تازه بسازید: https://console.cloud.google.com/projectcreate\n' +
      '  ۲) در همان پروژه Apps Script API را روشن کنید:\n' +
      '     https://console.cloud.google.com/apis/library/script.googleapis.com\n' +
      '  ۳) در همان پروژه OAuth consent screen را پر کنید (نوعِ External، فقط نام و ایمیل) — ' +
      'بی این، Apps Script اجازهٔ جابه‌جایی نمی‌دهد.\n' +
      '  ۴) شمارهٔ پروژه (Project number) را از صفحهٔ اصلیِ کنسول بردارید.\n' +
      '  ۵) در ویرایشگرِ Apps Script: Project Settings → Google Cloud Platform (GCP) Project → ' +
      'Change project → همان شماره → Set project.\n' +
      '  ۶) یک تابع را دستی اجرا کنید و اجازه‌ها را از نو تأیید کنید (کلاینتِ OAuth عوض شده).' };
  }

  // ۲) سوییچِ حسابِ کاربری خاموش است
  if (t.indexOf('home/usersettings') !== -1 || t.indexOf('User has not enabled') !== -1) {
    return { key: 'user-setting', text:
      'علت: سوییچِ «Google Apps Script API» در تنظیماتِ حسابِ کاربری خاموش است. این تنظیمِ ' +
      '«کاربر» است نه «پروژه»، و در ویرایشگر پیدا نیست.\n\n' +
      'چاره (یک‌باره): https://script.google.com/home/usersettings را باز کنید، ' +
      '«Google Apps Script API» را روشن کنید و چند دقیقه صبر کنید.' };
  }

  // ۳) اسکوپ در توکن نیست
  return { key: 'scope', text:
    'علت (محتمل‌ترین): توکنِ اجازه اسکوپِ script.projects را ندارد.\n\n' +
    'چاره (یک‌باره): در ویرایشگر، Project Settings → «Show \"appsscript.json\"» را روشن کنید، ' +
    'اسکوپ را در فهرستِ oauthScopes بگذارید، ذخیره کنید، و بعد اجازه‌ها را *از نو* تأیید کنید — ' +
    'افزودنِ اسکوپ به‌تنهایی توکنِ قبلی را عوض نمی‌کند. اگر پنجرهٔ تأیید نیامد، دسترسیِ پروژه ' +
    'را در https://myaccount.google.com/permissions پس بگیرید و یک تابع را دستی اجرا کنید.\n\n' +
    'برای دیدنِ اسکوپ‌های واقعیِ توکن، از منو «🔎 عیب‌یابیِ نصبِ خودکار» را بزنید.' };
}

/**
 * پیامِ یک‌بارهٔ «دسترسی نیست» — با راهِ دقیقِ درست‌کردن، بی تکرارِ روزانه.
 * `apiTextOpt` متنِ خامِ پاسخِ گوگل است؛ همان معمولاً می‌گوید کدام پیش‌نیاز
 * غایب است (مثلاً «User has not enabled the Apps Script API»)، پس عیناً نقل
 * می‌شود تا کاربر دنبالِ پیش‌نیازِ اشتباه نگردد.
 */
function selfUpdateNoScope_(code, apiTextOpt) {
  var last = props_().getProperty(PK.SELFUP_NOSCOPE) || '';
  var ageH = last ? (new Date().getTime() - parseWhen_(last)) / 3600000 : 1e9;
  // هفته‌ای یک بار بس است — ولی خبرش را برگردان، وگرنه منو ادعای دروغ می‌کند
  if (ageH < 24 * 6) return false;
  props_().setProperty(PK.SELFUP_NOSCOPE, nowStr_());
  var full = String(apiTextOpt || '');
  var cause = selfUpdateCause_(full);
  var api = full.replace(/\s+/g, ' ').slice(0, 300);
  var msg = 'نصبِ خودکارِ کد فعال نشد (HTTP ' + code + ').\n\n' + cause.text +
            (api ? '\n\nپاسخِ خودِ گوگل:\n' + api : '') +
            '\n\nتا آن موقع، کدِ تازه فقط «اعلام» می‌شود و نصبش دستی می‌ماند — مثل قبل.';
  logLine_('نصب خودکار: دسترسیِ Apps Script API نیست (HTTP ' + code + ')' +
           (api ? ' — ' + api.slice(0, 120) : '') + '.');
  try { tgSend_('🛠 ' + tgEsc_(msg)); } catch (e) {}
  try {
    MailApp.sendEmail({ to: CFG.EMAIL_TO, subject: 'موتور محتوا — نصبِ خودکارِ کد یک اجازهٔ یک‌باره می‌خواهد',
                        htmlBody: '<div dir="rtl">' + esc_(msg).replace(/\n/g, '<br>') + '</div>' });
  } catch (e2) {}
  return true;
}

/**
 * نصبِ یک متنِ کد در خودِ پروژه. مشترکِ نصبِ خودکار و بازگشت به نسخهٔ قبل.
 * برمی‌گرداند: { ok, code, reason }
 */
function installSource_(text, wantVersion, label) {
  // ── کدِ فعلیِ پروژه (هم آزمونِ اسکوپ است، هم مادهٔ پشتیبان) ──
  var cur = scriptApiFetch_('get');
  if (cur.code === 401 || cur.code === 403) {
    var notified = selfUpdateNoScope_(cur.code, cur.text);
    return { ok: false, reason: 'no-scope', code: cur.code, notified: notified,
             apiText: String(cur.text || '').replace(/\s+/g, ' ').slice(0, 300) };
  }
  if (cur.code !== 200 || !cur.json || !cur.json.files) {
    logLine_('نصب خودکار: خواندنِ کدِ فعلی ناموفق (HTTP ' + cur.code + ').');
    return { ok: false, reason: 'get-failed', code: cur.code };
  }

  // ── پشتیبان از کدِ در حالِ اجرا، پیش از هر تغییری ──
  var curSrc = '';
  for (var i = 0; i < cur.json.files.length; i++) {
    var f = cur.json.files[i];
    if (f.type === 'SERVER_JS') {
      curSrc += '\n/* ═══ ' + f.name + ' ═══ */\n' + String(f.source || '');
    }
  }
  var stamp = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd HH-mm');
  var bak = null;
  try {
    bak = saveCodeCopy_('موتور — v' + CFG.CODE_VERSION + ' — پیش از ' + label + ' — ' + stamp + '.gs', curSrc);
  } catch (eB) { logLine_('نصب خودکار: ذخیرهٔ نسخهٔ پشتیبانِ کد ناموفق: ' + eB.message); }

  // ── ساختنِ فهرستِ فایل‌های تازه: هرچه SERVER_JS بود، یک فایلِ واحد می‌شود ──
  var keep = [], firstJsName = null;
  for (var k = 0; k < cur.json.files.length; k++) {
    var fk = cur.json.files[k];
    if (fk.type === 'SERVER_JS') { if (!firstJsName) firstJsName = fk.name; continue; }
    keep.push({ name: fk.name, type: fk.type, source: fk.source });
  }
  keep.push({ name: firstJsName || 'موتور-محتوا', type: 'SERVER_JS', source: String(text) });

  // نشانهٔ «وسطِ تعویض» پیش از PUT می‌نشیند تا اگر اجرا همین‌جا کشته شد،
  // afterCodeSwap یا دورِ فردا بتواند وضع را جمع کند.
  props_().setProperty(PK.SELFUP_PENDING, String(wantVersion));

  var put = scriptApiFetch_('put', { files: keep });
  if (put.code !== 200) {
    props_().deleteProperty(PK.SELFUP_PENDING);
    var why = put.json && put.json.error && put.json.error.message
                ? String(put.json.error.message).slice(0, 300) : ('HTTP ' + put.code);
    logLine_('نصب خودکار: ذخیرهٔ کد رد شد — ' + why);
    try {
      tgSend_('🛠 نصبِ خودکارِ کدِ نسخهٔ ' + tgEsc_(String(wantVersion)) + ' انجام نشد: ' +
              tgEsc_(why) + '\nنسخهٔ فعلی دست‌نخورده و سالم است.' +
              (put.code === 400 ? '\n(ردِ کامپایلرِ گوگل یعنی فایل خطای ساختاری داشت — ' +
               'به سازنده‌اش برگردانده می‌شود.)' : ''));
    } catch (eT) {}
    return { ok: false, reason: 'put-failed', code: put.code, why: why };
  }

  // موفق. اجرای فعلی هنوز با کدِ قدیم است؛ راه‌اندازیِ نو با تریگرِ تازه.
  try {
    var ts = ScriptApp.getProjectTriggers();
    for (var d = 0; d < ts.length; d++) {
      if (ts[d].getHandlerFunction() === 'afterCodeSwap') ScriptApp.deleteTrigger(ts[d]);
    }
    ScriptApp.newTrigger('afterCodeSwap').timeBased().after(90 * 1000).create();
  } catch (eTr) {}
  logLine_('کدِ نسخهٔ ' + wantVersion + ' در پروژه ذخیره شد (' + label +
           ')؛ راه‌اندازیِ دوباره تا دو دقیقهٔ دیگر.');
  return { ok: true, backup: bak ? bak.getUrl() : '' };
}

/**
 * گامِ روزانهٔ نصبِ خودکار — پیش از پشتیبانِ شبانه.
 * force=true از منو می‌آید و «مشغول بودن» را هم نادیده نمی‌گیرد، فقط سقفِ
 * روزانه ندارد (این گام اصلاً سقفِ روزانه ندارد؛ ارزان است).
 */
function selfUpdateStep(force) {
  if (CFG.AUTOUPDATE_ENABLED === false) return { ok: false, reason: 'disabled' };
  var got = readCodeManifest_();
  if (!got) return { ok: false, reason: 'no-manifest' };
  var info = got.info;
  if (verCmp_(String(info.version), String(CFG.CODE_VERSION)) <= 0) {
    return { ok: false, reason: 'up-to-date', current: CFG.CODE_VERSION };
  }
  // نسخه‌ای که دیشب برگشت خورد، امشب دوباره نصب نشود — وگرنه چرخهٔ
  // نصب/برگشت راه می‌افتد و هر شب یک بار تولید را می‌خواباند.
  var eBlocked = {};
  try { eBlocked = engBlocked_(); } catch (eB) {}
  if (eBlocked[String(info.version)]) {
    logLine_('نسخهٔ ' + info.version + ' پیشتر برگشت خورده؛ نصبِ خودکارش رد شد.');
    return { ok: false, reason: 'blocked', version: info.version };
  }
  // بیانیهٔ بی‌بسته: همان روالِ قدیمِ «فقط اعلام» — ولی این را هم صریح بگو.
  // در حالتِ گیت‌هاب، کد همیشه از codeFile/GITHUB_CODE_FILE گرفته می‌شود، پس این
  // بند فقط برای حالتِ درایو است.
  if (CFG.CODE_SOURCE !== 'github' && !info.fileName && !info.fileId) {
    logLine_('کدِ ' + info.version + ' اعلام شده ولی خودِ فایل ضمیمه نیست (fileName/fileId خالی)؛ ' +
             'نصبِ خودکار ممکن نیست — روالِ دستی برقرار است.');
    return { ok: false, reason: 'no-package' };
  }
  var pkg = findCodePkg_(info);
  if (!pkg) {
    logLine_('کدِ ' + info.version + ': فایلِ اعلام‌شده («' + (info.fileName || info.fileId) +
             '») در OUTPUT پیدا نشد؛ نصب نشد.');
    return { ok: false, reason: 'package-missing' };
  }
  var errs = validateCodePkg_(pkg.text, info);
  if (errs.length) {
    logLine_('کدِ ' + info.version + ' ردِ وارسی شد: ' + errs.join(' | '));
    try {
      tgSend_('🛠 کدِ اعلامیِ نسخهٔ ' + tgEsc_(String(info.version)) + ' نصب نشد — ردِ وارسی:\n• ' +
              tgEsc_(errs.join('\n• ')) + '\nنسخهٔ فعلی (' + tgEsc_(CFG.CODE_VERSION) +
              ') سالم و برقرار است.');
    } catch (eT) {}
    try { noteCodeRows_(info, 'نصب خودکار رد شد: ' + errs.join(' | ')); } catch (eN) {}
    return { ok: false, reason: 'invalid', errors: errs };
  }
  if (engineBusyForSwap_()) {
    // وسطِ صداگذاری یا پشتیبان، کد عوض نمی‌شود؛ دو ساعت دیگر دوباره.
    try {
      var ts = ScriptApp.getProjectTriggers();
      for (var i = 0; i < ts.length; i++) {
        if (ts[i].getHandlerFunction() === 'selfUpdateDaily') continue;
      }
      ScriptApp.newTrigger('selfUpdateRetry').timeBased().after(2 * 60 * 60 * 1000).create();
    } catch (eS) {}
    logLine_('نصبِ کدِ ' + info.version + ' به دو ساعت بعد موکول شد (موتور وسطِ کار است).');
    return { ok: false, reason: 'busy', retry: true };
  }
  // نسخهٔ تازه هم در بایگانیِ «کدها» ذخیره می‌شود — همین نسخه لینکِ پیام‌هاست.
  var stored = null;
  try {
    stored = saveCodeCopy_('موتور — v' + info.version + ' — ' +
                           Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd') + '.gs',
                           pkg.text);
  } catch (eC) {}
  var r = installSource_(pkg.text, info.version, 'نصبِ نسخهٔ ' + info.version);
  if (r.ok) {
    r.storedUrl = stored ? stored.getUrl() : '';
    // بیانیه همین حالا مُهرِ «در حالِ نصب» می‌گیرد؛ afterCodeSwap کاملش می‌کند.
    try {
      info.installStartedAt = nowStr_();
      info.storedUrl = r.storedUrl;
      if (got.file) got.file.setContent(JSON.stringify(info, null, 1));
    } catch (eM) {}
  }
  return r;
}

/* ═════════════════════════════════════════════════════════════════════════
   نقشهٔ پوشهٔ OUTPUT

   خواسته این بود: «هر تغییری و جابه‌جایی، علاوه بر گیت‌هاب، آنجا هم ثبت شود».
   دو نسخهٔ دستیِ یک متن همیشه از هم دور می‌افتند — پس فقط یکی نوشته می‌شود:
   docs/drive_layout.md در ریپو. موتور شبانه آن را می‌خواند و اگر با فایلِ
   داخلِ OUTPUT فرق داشت، بازنویسی‌اش می‌کند. یعنی تاریخچهٔ گیت خودش دفترِ
   ثبتِ تغییرهاست و در درایو هم همان متن می‌نشیند، بی آنکه کسی یادش بماند.

   اگر شبکه نبود یا فایل در ریپو نبود، هیچ اتفاقی نمی‌افتد: نسخهٔ قبلی سرِ
   جایش می‌ماند. یک نقشهٔ کمی کهنه از هیچ نقشه بهتر است.
   ═════════════════════════════════════════════════════════════════════════ */

function outReadmeSync_() {
  var name = String(CFG.OUT_README || '');
  var path = String(CFG.OUT_README_PATH || '');
  if (!name || !path) return { ok: false, reason: 'تنظیم نشده' };
  var body = '';
  try {
    var res = UrlFetchApp.fetch(githubRawUrl_(path),
                { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() !== 200) return { ok: false, reason: 'کد ' + res.getResponseCode() };
    body = res.getContentText();
  } catch (e) { return { ok: false, reason: e.message }; }
  if (!body || body.length < 40) return { ok: false, reason: 'متنِ خالی' };

  try {
    var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
    var it = folder.getFilesByName(name);
    if (it.hasNext()) {
      var f = it.next();
      var cur = '';
      try { cur = f.getBlob().getDataAsString('UTF-8'); } catch (eR) { cur = ''; }
      // نسخه‌های تکراریِ هم‌نام کنار گذاشته می‌شوند تا خواننده سرگردان نشود
      while (it.hasNext()) { try { it.next().setTrashed(true); } catch (eT) {} }
      if (cur === body) return { ok: true, changed: false };
      f.setContent(body);
      logLine_('نقشهٔ پوشهٔ OUTPUT تازه شد.');
      return { ok: true, changed: true };
    }
    folder.createFile(Utilities.newBlob(body, 'text/markdown', name));
    logLine_('نقشهٔ پوشهٔ OUTPUT نوشته شد.');
    return { ok: true, changed: true, created: true };
  } catch (e2) { return { ok: false, reason: e2.message }; }
}

/* ══════════════════ مهلتِ کارِ شبانه ══════════════════

   Apps Script هر اجرا را پس از شش دقیقه می‌کشد — بی خطا، بی پیام، وسطِ کار.
   کارِ شبانه سال‌ها زیرِ این سقف بود، تا اینکه ۵٫۵۵–۵٫۶۷ کارِ موسیقی را به
   آن افزود: گشتن در اینترنت، دانلود با سقفِ ۱۵۰ ثانیه، و پویشی که بایتِ هر
   فایلِ بانک را می‌خواند. آن‌وقت هرچه پس از موسیقی بود گرسنه ماند.

   و آنچه پس از آن بود، بی‌اهمیت نبود: بایگانیِ نسخه‌های کهنهٔ پرامپت، هرسِ
   گزارش‌ها، یادآورِ تازگیِ دستور — و در انتهای همه، **خودِ نصبِ کد**.
   یعنی مهم‌ترین کارِ شب پشتِ صفِ سنگین‌ترین کارها ایستاده بود.

   نشانهٔ بیرونی‌اش را صاحبِ برنامه دید: ۲۳ اوت هشت نسخهٔ کهنهٔ پرامپت هنوز
   در ریشه بودند، با اینکه promptPrune_ از ۵٫۴۷ نوشته و وصل و آزموده شده
   بود. تابع سالم بود؛ نوبتش نمی‌رسید.

   دو درمان: ترتیب (ارزان و حیاتی اول، سنگین آخر) و نگهبانِ زمان که به‌جای
   کشته‌شدنِ خاموش، صریح می‌گوید چه چیزی این شب اجرا نشد. */

var _nightT0 = 0;

function nightStart_() { _nightT0 = new Date().getTime(); }

/** میلی‌ثانیهٔ باقی‌مانده از سهمِ این اجرا. */
function nightLeft_() {
  if (!_nightT0) nightStart_();
  var budget = Math.max(30000, Number(CFG.NIGHT_BUDGET_MS) || 270000);
  return budget - (new Date().getTime() - _nightT0);
}

/** آیا برای کاری که دستِ‌کم needMs می‌خواهد وقت هست؟ نبودش لاگ می‌شود. */
function nightHas_(needMs, what) {
  var left = nightLeft_();
  if (left >= needMs) return true;
  logLine_('کارِ شبانه: «' + what + '» امشب اجرا نشد — وقت نمانده (' +
           Math.round(left / 1000) + ' ثانیه). فردا شب دوباره.');
  return false;
}

/**
 * کارِ شبانه — به ترتیبِ اهمیت، نه به ترتیبِ تاریخِ افزوده‌شدن.
 *
 * ۱) داوریِ نصبِ دیشب (باید پیش از نصبِ امشب باشد، وگرنه دو نصب قاطی می‌شوند)
 * ۲) نصبِ کد — مهم‌ترین کارِ شب
 * ۳) خانه‌داریِ ارزان و کران‌دار
 * ۴) کارِ سنگین، هرکدام با نگهبانِ زمان
 */
function selfUpdateDaily() {
  nightStart_();

  // ۱) داوریِ تعویضِ دیشبِ خودِ موتور — پیش از هر نصبِ تازه، وگرنه نصبِ امشب
  // با تعویضِ دیشب قاطی می‌شود و معلوم نیست کدام تولید را خوابانده.
  try { engVerdict_(); } catch (eEV) { logLine_('داوریِ کدِ موتور ناموفق: ' + eEV.message); }

  // ۲) نصبِ کد. تا ۵٫۶۷ این آخرین خطِ تابع بود و هر شب پشتِ سرِ گشتنِ
  // موسیقی و دانلود و پویش و داوریِ محتوا می‌ایستاد — یعنی شبی که آن‌ها
  // طول می‌کشیدند، کدِ تازه اصلاً نصب نمی‌شد و هیچ خطایی هم بلند نمی‌شد.
  var installed = { ok: false };
  try { installed = selfUpdateStep(false); }
  catch (e) { logLine_('نصبِ خودکارِ کد ناموفق: ' + e.message); }

  // ۳) خانه‌داری: ارزان، کران‌دار، و هرکدام یک وعده به صاحبِ برنامه.
  try { outReadmeSync_(); } catch (eRM) { logLine_('نقشهٔ پوشه تازه نشد: ' + eRM.message); }
  try { pruneReportArchive_(); } catch (ePA) {}
  try { promptPrune_(); } catch (ePP) {}
  // هرسِ پرونده‌های غنی‌سازی. تا ۵٫۵۰ این تابع نوشته شده بود ولی هیچ‌جا صدا
  // زده نمی‌شد — یعنی «ده روز و پاک می‌شوند» که در نقشهٔ پوشه نوشته بودیم
  // هرگز اتفاق نمی‌افتاد و ریشه آرام‌آرام پر می‌شد، درست مثل گزارش‌ها.
  try { pruneEnrichFiles_(); } catch (ePE) {}
  // و وارسیِ تازگیِ دستورها — هر شب، تا انجام شود.
  try { promptFreshNag_(); } catch (ePF) {}
  // نمونهٔ روزانهٔ شمارنده‌ها، پس از داوری تا ترازوی امروز نمونهٔ دیروز باشد.
  try { engHeartbeat_(); } catch (eHB) {}

  // ۴) کارِ سنگین. هرکدام فقط اگر وقتش باشد؛ وگرنه صریح گزارش می‌شود و
  // فردا شب نوبتش می‌رسد. نبودنِ یک شبِ این‌ها هزینه‌ای ندارد؛ نبودنِ نصب
  // و خانه‌داری دارد.
  if (nightHas_(60000, 'وارسی و چرخهٔ اسکریپت‌های منبع')) {
    var srcAudit = null;
    try { srcAudit = auditSourceScripts(); } catch (eSS) {}
    try { srcNightly_(srcAudit); }
    catch (eSN) { logLine_('چرخهٔ تحلیلگرهای منبع ناموفق: ' + eSN.message); }
  }

  // بانکِ موسیقی: فایلِ تازه‌ای که کاربر در پوشه گذاشته، شبانه دیده و
  // برچسب‌گذاری می‌شود. ترتیبِ درونی مهم است: اول آوردن، بعد پویش —
  // برعکسش یعنی هر فایل یک شب دیر وارد بانک می‌شود.
  if (nightHas_(90000, 'گشتن و آوردنِ موسیقی')) {
    try {
      var miss = musicThinSlots_();
      // کمبودی نبود یعنی «پوشش کامل است»، نه «کار تمام است». بانکی که همهٔ
      // قطعه‌هایش ده بار پخش شده‌اند، برای شنونده همان بانکِ خالی است. پس
      // شبی که کمبودی نیست، سراغِ فرسوده‌ترین خانواده می‌رویم.
      var why = 'کمبود';
      if (!miss.length) { miss = musicRotateSlots_(); why = 'چرخش'; }
      if (miss.length) {
        logLine_('گشتنِ موسیقی (' + why + '): ' + miss.join('، '));
        musicSeek_(miss);
      }
    } catch (eMS) { logLine_('گشتنِ موسیقی انجام نشد: ' + eMS.message); }
    try { musicFetch_(); } catch (eMF) { logLine_('آوردنِ موسیقی انجام نشد: ' + eMF.message); }
  }
  // پویش جداست: ارزان‌تر از آوردن است و فایلی که کاربر دستی گذاشته را هم
  // می‌بیند، پس حتی در شبِ شلوغ هم ارزشِ تلاش دارد.
  if (nightHas_(30000, 'پویش و برچسبِ بانکِ موسیقی')) {
    try { musicScan_(); musicAutoTag_(); }
    catch (eMU) { logLine_('پویشِ شبانهٔ موسیقی ناموفق: ' + eMU.message); }
  }

  /* بازبینیِ شنیداریِ قطعه‌های نامعلوم. مدل همیشه در دسترس نیست و قطعه‌ای
     که بارِ اول قضاوت نشد، از ۵٫۶۵ هرگز پخش نمی‌شود. ۵٫۷۱ راهِ تجدیدنظر را
     باز کرد ولی فقط با دکمه — یعنی کاری روی دستِ صاحبِ برنامه. حالا خودکار،
     چندتا در هر شب، افکت‌ها اول. */
  if (CFG.MUSIC_REHEAR !== false && nightHas_(45000, 'بازبینیِ شنیداریِ نامعلوم‌ها')) {
    try {
      var rh = musicRecheck_(null, { onlyUnknown: true,
                 cap: Math.max(1, Number(CFG.MUSIC_REHEAR_MAX) || 3),
                 budgetMs: 60000 });
      if (rh && (rh.heard || rh.moved)) {
        logLine_('بازبینیِ شنیداری: ' + rh.heard + ' تأیید شد، ' +
                 rh.moved + ' کنار گذاشته شد.');
      }
    } catch (eRH) { logLine_('بازبینیِ شنیداری انجام نشد: ' + eRH.message); }
  }

  // سنجهٔ محتوا: عکسِ قسمت‌های امروز فردا داوری می‌شود.
  if (nightHas_(45000, 'سنجهٔ محتوا')) {
    try { auditRun_(); } catch (eCA) { logLine_('سنجهٔ محتوا اجرا نشد: ' + eCA.message); }
    try { auditPrune_(); } catch (eCP) {}
  }

  return installed;
}

function selfUpdateRetry() { return selfUpdateDaily(); }

/**
 * اولین اجرای پس از تعویض — این تابع دیگر با «کدِ تازه» اجرا می‌شود.
 * راه‌اندازی، ثبت، و اطلاع‌رسانی؛ و اگر تعویض واقعاً ننشسته بود، اعلامِ صریح.
 */
function afterCodeSwap() {
  var want = props_().getProperty(PK.SELFUP_PENDING) || '';
  if (!want) return { ok: false, reason: 'nothing-pending' };
  if (String(CFG.CODE_VERSION) !== String(want)) {
    // هنوز کدِ قدیم اجرا شده؟ (انتشارِ نسخه چند ثانیه طول می‌کشد.) یک تلاشِ
    // دیگر؛ اگر باز نشد، یعنی تعویض ننشسته و باید صادقانه گفته شود.
    var tries = Number(props_().getProperty(PK.SELFUP_TRIES) || 0) + 1;
    if (tries <= 2) {
      props_().setProperty(PK.SELFUP_TRIES, String(tries));
      try { ScriptApp.newTrigger('afterCodeSwap').timeBased().after(3 * 60 * 1000).create(); } catch (e) {}
      return { ok: false, reason: 'not-yet', running: CFG.CODE_VERSION };
    }
    props_().deleteProperty(PK.SELFUP_PENDING);
    props_().deleteProperty(PK.SELFUP_TRIES);
    logLine_('تعویضِ کد به ' + want + ' ننشست؛ نسخهٔ در حالِ اجرا ' + CFG.CODE_VERSION + ' است.');
    try { tgSend_('🛠 تعویضِ خودکارِ کد به ' + tgEsc_(want) + ' کامل نشد؛ نسخهٔ در حالِ اجرا ' +
                  tgEsc_(CFG.CODE_VERSION) + ' است. راهنمای نصب را ببینید یا دستی جایگزین کنید.'); } catch (e) {}
    return { ok: false, reason: 'mismatch' };
  }
  props_().deleteProperty(PK.SELFUP_PENDING);
  props_().deleteProperty(PK.SELFUP_TRIES);
  props_().deleteProperty(PK.SELFUP_NOSCOPE);
  props_().setProperty(PK.SELFUP_LAST, nowStr_());

  // زمان‌بندی‌ها با پیکربندیِ نسخهٔ تازه وارسی/تکمیل می‌شوند
  try { ensureScheduledTriggers_(); } catch (e1) {}

  // مُهرِ تعویض: شمارنده‌های همین لحظه، تا فردا بشود پرسید «این نسخه تولید را
  // خواباند یا نه». پیش از این، تعویضِ کدِ موتور هیچ داوری‌ای نداشت.
  try { engStampSwap_(want); } catch (eStamp) {}

  // بیانیه کامل می‌شود: کی، توسطِ که، کجا ذخیره شده
  var storedUrl = '', bakUrl = '';
  try {
    var got = readCodeManifest_();
    if (got && String(got.info.version) === String(want)) {
      got.info.installedAt = nowStr_();
      got.info.installedBy = 'خودِ موتور (نصبِ خودکار با Apps Script API)';
      got.info.installedVersion = String(CFG.CODE_VERSION);
      storedUrl = String(got.info.storedUrl || '');
      if (got.file) got.file.setContent(JSON.stringify(got.info, null, 1));
    }
  } catch (e2) {}

  // اگر این نسخه چیزی را عوض کرده که روتین‌ها و تسک‌ها به آن تکیه دارند —
  // نامِ تابع، گزینهٔ منو، کلیدِ فایلِ وضعیت، ساعتِ زمان‌بندی — بیانیه‌اش را در
  // promptImpact نوشته است. آن‌جا چیزی هست یعنی «دستورِ روتین هم باید عوض شود»،
  // و این چیزی است که هیچ‌کس خودبه‌خود نمی‌فهمد: کد عوض می‌شود، روتین سرِ جایش
  // می‌ماند و یک روز بی‌صدا کارِ اشتباه می‌کند.
  // و مهم‌تر از خبردادن: ثبتِ «بدهی». خبر یک‌بار می‌آید و رد می‌شود؛ این عدد
  // می‌ماند تا وقتی فایلِ دستور در درایو خودش را با آن هماهنگ کند.
  //
  // بدهی فقط وقتی ثبت می‌شود که خودِ نسخه اعلام کرده باشد چیزی را لمس کرده
  // (promptImpact خالی نباشد). پیشتر هر نصبی بدهی می‌ساخت، پس ۵٫۴۹ و ۵٫۵۰ و
  // ۵٫۵۱ — که هیچ‌کدام به دستورها ربطی نداشتند — هم می‌خواستند فایلِ تازه.
  // هشداری که برای هیچ می‌آید، هشداری است که کسی جدی‌اش نمی‌گیرد.
  try {
    var pi = promptImpactNotice_(want);
    if (pi && pi.sent) promptDueSet_(want, pi.kinds);
  } catch (ePI) {}

  // ردیف‌های گزارش: «کد نصب شد — در انتظارِ تأییدِ ناظر»
  var marked = 0;
  try { marked = markCodeRowsInstalled_(want); } catch (e3) {}

  var msg = '✅ کدِ نسخهٔ ' + want + ' خودکار نصب و راه‌اندازی شد.\n' +
            (marked ? '📋 ' + marked + ' ردیفِ «نیازمند تعویض کد» در تبِ گزارش‌ها «نصب شد» خورد ' +
                      'و تأییدِ نهایی با ناظرِ فرداست.\n' : '') +
            (storedUrl ? '📄 نسخهٔ ذخیره‌شده در پوشهٔ «' + CFG.CODE_FOLDER + '»: ' + storedUrl + '\n' : '') +
            'نسخهٔ قبلی هم در همان پوشه با برچسبِ «پیش از نصب» مانده و از منو قابلِ بازگشت است.';
  try { tgSend_(tgEsc_(msg)); } catch (e4) {}
  try {
    MailApp.sendEmail({ to: CFG.EMAIL_TO,
      subject: 'موتور محتوا — کدِ نسخهٔ ' + want + ' خودکار نصب شد',
      htmlBody: '<div dir="rtl" style="font-family:Tahoma">' +
                esc_(msg).replace(/\n/g, '<br>') + '</div>' });
  } catch (e5) {}
  logLine_('afterCodeSwap: نسخهٔ ' + want + ' برقرار شد؛ ' + marked + ' ردیفِ گزارش به‌روز شد.');
  return { ok: true, version: want, marked: marked };
}

/** ردیف‌های «نیازمند تعویض کد» که این نسخه جوابشان است، مُهرِ نصب می‌گیرند. */
function markCodeRowsInstalled_(version) {
  var hub = getHub_();
  var st = loadReportRows_(hub);
  if (!st || !st.sheet || st.sheet.getLastRow() < 2) return 0;
  var sh = st.sheet;
  var n = sh.getLastRow() - 1;
  var vals = sh.getRange(2, 1, n, REPORT_HEADERS.length).getValues();
  var ids = {};
  try {
    var got = readCodeManifest_();
    var src = (got && got.info && got.info.sourceReportIds) || [];
    for (var s = 0; s < src.length; s++) ids[String(src[s])] = true;
  } catch (e) {}
  var marked = 0;
  for (var i = 0; i < n; i++) {
    var r = vals[i];
    var isCode = String(r[RC.OWNER - 1]) === ROWNER_CODE ||
                 String(r[RC.STATUS - 1]) === RST.NEEDS_CODE;
    if (!isCode) continue;
    if (String(r[RC.STATUS - 1]) === RST.CLOSED) continue;
    var hit = ids[String(r[RC.ID - 1])] ||
              String(r[RC.ID - 1]) === 'CODE-' + version ||
              // اگر بیانیه فهرستِ ردیف نداده، همهٔ بازهای «نیازمند کد» را
              // این نسخه پوشش می‌دهد — چون هر نسخهٔ کامل، همهٔ اصلاح‌های
              // اعلام‌شده تا آن لحظه را در خود دارد.
              !Object.keys(ids).length;
    if (!hit) continue;
    r[RC.STATUS - 1] = RST.INSTALLED;
    r[RC.DONE - 1] = String(r[RC.DONE - 1] || '');
    r[RC.DONE - 1] = (r[RC.DONE - 1] ? r[RC.DONE - 1] + ' | ' : '') +
                     'کدِ نسخهٔ ' + version + ' خودکار نصب شد';
    r[RC.DONE_AT - 1] = nowStr_();
    sh.getRange(2 + i, RC.STATUS, 1, 3).setValues([[r[RC.STATUS - 1], r[RC.DONE - 1], r[RC.DONE_AT - 1]]]);
    marked++;
  }
  return marked;
}

/** یادداشتِ ردِ نصب جلوی ردیفِ CODE-<نسخه>. */
function noteCodeRows_(info, note) {
  var hub = getHub_();
  var st = loadReportRows_(hub);
  if (!st || !st.sheet || st.sheet.getLastRow() < 2) return;
  var sh = st.sheet;
  var n = sh.getLastRow() - 1;
  var vals = sh.getRange(2, 1, n, REPORT_HEADERS.length).getValues();
  for (var i = 0; i < n; i++) {
    if (String(vals[i][RC.ID - 1]) !== 'CODE-' + info.version) continue;
    sh.getRange(2 + i, RC.DONE, 1, 2).setValues([[note, nowStr_()]]);
    return;
  }
}

/** منو: بازگشت به تازه‌ترین نسخهٔ «پیش از نصب». */
function installCodeRollback() {
  var ui = ui_();
  var it = null, best = null, bestT = 0;
  try {
    it = codeFolder_().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (f.getName().indexOf('پیش از') === -1) continue;
      var t = f.getLastUpdated ? f.getLastUpdated().getTime() : 0;
      if (t >= bestT) { bestT = t; best = f; }
    }
  } catch (e) {}
  if (!best) {
    if (ui) ui.alert('هیچ نسخهٔ پشتیبانی از کد در پوشهٔ «' + CFG.CODE_FOLDER + '» پیدا نشد.');
    return { ok: false, reason: 'no-backup' };
  }
  if (ui) {
    var ans = ui.alert('بازگشت به نسخهٔ پشتیبانِ کد',
      'کدِ فعلی با «' + best.getName() + '» جایگزین شود؟\n' +
      'از کدِ فعلی هم پیش از تعویض، پشتیبان گرفته می‌شود.', ui.ButtonSet.YES_NO);
    if (ans !== ui.Button.YES) return { cancelled: true };
  }
  var text = best.getBlob().getDataAsString();
  var m = text.match(/CODE_VERSION:\s*'([^']+)'/);
  var ver = m ? m[1] : 'قبلی';
  var r = installSource_(text, ver, 'بازگشت به نسخهٔ ' + ver);
  if (ui) {
    ui.alert(r.ok ? 'انجام شد؛ راه‌اندازیِ دوباره تا دو دقیقهٔ دیگر.'
                  : 'انجام نشد: ' + (r.why || r.reason));
  }
  return r;
}

/** منو: بررسی و نصبِ همین حالا. */
function runSelfUpdateNow() {
  var r = selfUpdateStep(true);
  var ui = ui_();
  if (!ui) return r;
  var msg = r.ok ? 'کدِ تازه ذخیره شد؛ راه‌اندازی تا دو دقیقهٔ دیگر و بعدش پیامِ تأیید می‌آید.'
    : r.reason === 'up-to-date' ? 'کدِ در حالِ اجرا (' + CFG.CODE_VERSION + ') تازه‌ترین است.'
    : r.reason === 'no-manifest' ? 'هیچ اعلانِ کدی (_CODE-LATEST.json) در OUTPUT نیست.'
    : r.reason === 'no-package' ? 'کد اعلام شده ولی خودِ فایل ضمیمه نیست؛ نصبِ خودکار ممکن نیست.'
    : r.reason === 'invalid' ? 'بسته ردِ وارسی شد:\n• ' + (r.errors || []).join('\n• ')
    : r.reason === 'busy' ? 'موتور وسطِ کار است؛ دو ساعت دیگر خودش دوباره تلاش می‌کند.'
    : r.reason === 'no-scope'
        ? 'دسترسیِ API باز نیست (HTTP ' + r.code + ').\n\n' +
          (r.notified
             ? 'پیامِ راهنما برایتان ایمیل/تلگرام شد.'
             : 'پیامِ راهنما همین چند روزِ پیش فرستاده شده، پس دوباره فرستاده نشد.') +
          (r.apiText ? '\n\nپاسخِ خودِ گوگل:\n' + r.apiText : '') +
          '\n\nبرای اینکه دقیقاً بدانید کدام اجازه کم است، از همین منو ' +
          '«🔎 عیب‌یابیِ نصبِ خودکار» را بزنید.'
    : 'انجام نشد: ' + (r.why || r.reason);
  ui.alert('نصبِ خودکارِ کد', msg, ui.ButtonSet.OK);
  return r;
}

/**
 * عیب‌یابیِ نصبِ خودکار — فقط می‌خواند، هیچ‌چیز را عوض نمی‌کند.
 *
 * ۴۰۳ دو علتِ کاملاً جدا دارد و از بیرون شبیه هم‌اند. این تابع قطعی جوابش را
 * می‌دهد: اسکوپ‌هایی که توکنِ در حالِ اجرا *واقعاً* دارد را از tokeninfo گوگل
 * می‌گیرد و بعد همان فراخوانِ واقعیِ Apps Script API را می‌زند و پاسخِ خام را
 * نشان می‌دهد. نکتهٔ کلیدی: افزودنِ اسکوپ به appsscript.json به‌تنهایی کافی
 * نیست — تا وقتی اجازه‌ها دوباره تأیید نشوند، توکن همان اسکوپ‌های قبلی را دارد.
 */
function selfUpdateDiagnose_() {
  var L = [];
  var sid = '';
  try { sid = ScriptApp.getScriptId(); } catch (e) {}
  L.push('scriptId: ' + sid);
  L.push('نسخهٔ در حالِ اجرا: ' + CFG.CODE_VERSION);

  var tok = '';
  try { tok = ScriptApp.getOAuthToken(); } catch (e) { L.push('گرفتنِ توکن ناموفق: ' + e.message); }

  var scopes = '';
  if (tok) {
    try {
      var ti = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' +
                                 encodeURIComponent(tok), { muteHttpExceptions: true });
      if (ti.getResponseCode() === 200) {
        scopes = String((JSON.parse(ti.getContentText()) || {}).scope || '');
      } else {
        L.push('tokeninfo HTTP ' + ti.getResponseCode());
      }
    } catch (e) { L.push('tokeninfo ناموفق: ' + e.message); }
  }
  var want = 'https://www.googleapis.com/auth/script.projects';
  var has = scopes.indexOf(want) !== -1;
  L.push('');
  L.push('اسکوپِ script.projects در توکن: ' + (has ? 'هست ✅' : 'نیست ❌  ← همین علتِ ۴۰۳ است'));
  if (!has) {
    L.push('  چاره: اسکوپ را در appsscript.json بگذارید و بعد اجازه‌ها را *از نو* تأیید کنید');
    L.push('  (اگر پنجرهٔ تأیید نیامد، دسترسیِ پروژه را در');
    L.push('   https://myaccount.google.com/permissions پس بگیرید و یک تابع را دستی اجرا کنید).');
  }
  L.push('');
  L.push('همهٔ اسکوپ‌های توکن:');
  var list = scopes.split(/\s+/);
  for (var i = 0; i < list.length; i++) if (list[i]) L.push('  • ' + list[i]);

  if (sid && tok) {
    try {
      var res = UrlFetchApp.fetch(scriptContentUrl_(), { method: 'get', muteHttpExceptions: true,
                                  headers: { Authorization: 'Bearer ' + tok } });
      var body = String(res.getContentText() || '');
      L.push('');
      L.push('فراخوانِ واقعیِ Apps Script API → HTTP ' + res.getResponseCode());
      if (res.getResponseCode() !== 200) {
        L.push('');
        L.push(selfUpdateCause_(body).text);
        L.push('');
      }
      L.push(body.replace(/\s+/g, ' ').slice(0, 600));
    } catch (e) { L.push('فراخوانِ API ناموفق: ' + e.message); }
  }
  return L.join('\n');
}

/** اجرای عیب‌یاب از منو. */
function runSelfUpdateDiagnose() {
  var txt = selfUpdateDiagnose_();
  logLine_('عیب‌یابیِ نصبِ خودکار اجرا شد.');
  var ui = ui_();
  if (ui) ui.alert('🔎 عیب‌یابیِ نصبِ خودکار', txt, ui.ButtonSet.OK);
  try {
    MailApp.sendEmail({ to: CFG.EMAIL_TO, subject: 'موتور محتوا — عیب‌یابیِ نصبِ خودکار',
      htmlBody: '<div dir="rtl" style="font-family:Tahoma"><pre style="white-space:pre-wrap">' +
                esc_(txt) + '</pre></div>' });
  } catch (e) {}
  return txt;
}

/** خلاصهٔ وضعیت برای _STATUS.json و ناظر. */
function selfUpdateStatus_() {
  return {
    enabled: CFG.AUTOUPDATE_ENABLED !== false,
    lastInstallAt: props_().getProperty(PK.SELFUP_LAST) || '',
    midSwapTo: props_().getProperty(PK.SELFUP_PENDING) || '',
    noScopeSince: props_().getProperty(PK.SELFUP_NOSCOPE) || '',
    codeFolder: (function () { try { return codeFolder_().getUrl(); } catch (e) { return ''; } })()
  };
}

/**
 * «این نسخه چه چیزی را در روتین‌ها و تسک‌ها می‌شکند؟»
 *
 * روتینِ «نظارت روزانه» و تسکِ «غنی‌سازی» بیرون از این ریپو زندگی می‌کنند و
 * دستورشان متن است، نه کد. پس وقتی نامِ تابعی عوض شود، گزینهٔ منویی جابه‌جا شود
 * یا کلیدی در _STATUS.json تغییر کند، هیچ آزمونی نمی‌شکند و هیچ‌کس خبردار
 * نمی‌شود — روتین سرِ جایش می‌ماند و یک روز بی‌صدا کارِ اشتباه می‌کند.
 *
 * درمانش این است که سازندهٔ نسخه همان‌جا که manifest را می‌نویسد، اثرش را هم
 * اعلام کند. `promptImpact` فهرستی از جمله‌هاست: هرکدام می‌گوید کدام دستور باید
 * چه شود. اگر خالی باشد، هیچ خبری نمی‌رود.
 */
/* ═════════════════════════════════════════════════════════════════════════
   تازگیِ دستورِ روتین‌ها — یادآوری که خودش خفه نمی‌شود

   ══ چرا لازم شد ══
   promptImpactNotice_ از قبل خبر می‌داد: تلگرام، ایمیل، و یک ردیف در تب
   گزارش‌ها. ولی عنوانِ آن ردیف شمارهٔ نسخه را در خود داشت، و
   codeRowSatisfied_ هر ردیفی را که نسخهٔ هدفش از نسخهٔ در حالِ اجرا جلوتر
   نباشد «انجام‌شده» می‌شمارد. نتیجه: یادآور همان شبی که کد نصب می‌شد خودش
   را می‌بست. یک بار می‌گفت و برای همیشه ساکت می‌شد — و دستور دست‌نخورده
   می‌ماند بی‌آنکه چیزی خطا بدهد. دقیقاً همین اتفاق برای ۵٫۴۶ افتاد.

   ══ چه چیزی عوض شد ══
   خبر جای خودش، ولی حالا یک «بدهی» هم ثبت می‌شود: نسخه‌ای که از آن به بعد
   دستور باید به‌روز شود. و هر فایلِ دستور در سرش اعلام می‌کند برای کدام
   نسخهٔ موتور نوشته شده:

       > برای نسخهٔ موتور: 5.48

   هر شب این دو با هم سنجیده می‌شوند. تا وقتی اعلامِ فایل از بدهی عقب‌تر
   باشد — یا اصلاً نباشد — هشدار تکرار می‌شود. و لحظه‌ای که فایلِ تازه با
   عددِ درست گذاشته شود، خودبه‌خود ساکت می‌شود. کسی چیزی را دستی نمی‌بندد.

   ══ چرا این یکی خودش را نمی‌بندد ══
   ردیفی که این وارسی می‌سازد هیچ شمارهٔ نسخه‌ای در شناسه و عنوانش ندارد، پس
   codeRowTargetVer_ چیزی پیدا نمی‌کند و codeRowSatisfied_ محافظه‌کارانه
   false برمی‌گرداند. همان رفتاری که برای «ردیفِ بی‌نسخه» مستند شده است.
   ═════════════════════════════════════════════════════════════════════════ */

var PROMPT_FOR_RE = /برای\s+نسخهٔ?\s*موتور\s*:\s*v?([0-9.]+)/;

/**
 * بدهی را ثبت می‌کند؛ فقط جلو می‌رود، هرگز عقب نمی‌آید.
 *
 * `kinds` می‌گوید کدام خانواده‌های دستور را این نسخه لمس کرده — مثلاً
 * ['monitor']. خالی یعنی «نمی‌دانم، پس همه» که محافظه‌کارانه است.
 * بی این، تقویمِ ۵٫۵۲ که فقط به کارِ ناظر ربط دارد، تسکِ غنی‌سازی را هم کهنه
 * اعلام می‌کرد و هر شب یک هشدارِ دروغ می‌ساخت — و مکانیزمی که گرگ‌گرگ می‌کند،
 * همان مکانیزمی است که آدم یاد می‌گیرد نادیده‌اش بگیرد.
 */
function promptDueSet_(version, kinds) {
  var v = String(version || '').trim();
  if (!v) return '';
  var ks = (kinds || []).map(function (k) { return String(k).trim(); })
                        .filter(function (k) { return !!k; });
  try {
    var cur = String(props_().getProperty(PK.PROMPT_DUE) || '');
    if (cur && verCmp_(v, cur) <= 0) return cur;
    props_().setProperty(PK.PROMPT_DUE, v);
    props_().setProperty(PK.PROMPT_DUE_KINDS, ks.join(','));
    return v;
  } catch (e) { return ''; }
}

/** خانواده‌هایی که بدهیِ جاری به آن‌ها مربوط است. خالی یعنی همه. */
function promptDueKinds_() {
  try {
    return String(props_().getProperty(PK.PROMPT_DUE_KINDS) || '')
      .split(',').map(function (k) { return k.trim(); })
      .filter(function (k) { return !!k; });
  } catch (e) { return []; }
}

/** «برای نسخهٔ موتور: x.y» را از سرِ فایل می‌خواند. نبودش یعنی نامعلوم. */
function promptDeclaredVer_(file) {
  try {
    var head = String(file.getBlob().getDataAsString('UTF-8')).slice(0, 1500);
    var m = faDigits_(head).match(PROMPT_FOR_RE);
    return m ? String(m[1]).replace(/\.$/, '') : '';
  } catch (e) { return ''; }
}

/**
 * وضعِ تازگیِ دستورها.
 * {due, families:[{kind, n, forVer, stale}], stale:[…]}
 */
function promptFreshStatus_() {
  var out = { due: '', kinds: [], families: [], stale: [] };
  try { out.due = String(props_().getProperty(PK.PROMPT_DUE) || ''); } catch (e0) {}
  out.kinds = promptDueKinds_();
  var top = Object.create(null);
  try {
    var it = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID).getFiles();
    while (it.hasNext()) {
      var f = it.next();
      var m = String(f.getName()).match(PROMPT_RE);
      if (!m) continue;
      var n = parseInt(m[2], 10);
      if (!isFinite(n)) continue;
      if (!top[m[1]] || n > top[m[1]].n) top[m[1]] = { file: f, n: n };
    }
  } catch (e) { return out; }

  for (var k in top) {
    if (!Object.prototype.hasOwnProperty.call(top, k)) continue;
    var forVer = promptDeclaredVer_(top[k].file);
    // بی بدهی، هیچ‌چیز کهنه نیست — نبودِ اعلام به‌تنهایی ایراد نیست.
    // و اگر بدهی خانوادهٔ هدف دارد، خانوادهٔ بیرونِ آن فهرست دست‌نخورده است.
    var mine = !out.kinds.length || out.kinds.indexOf(k) !== -1;
    var stale = !!out.due && mine && (!forVer || verCmp_(forVer, out.due) < 0);
    out.families.push({ kind: k, n: top[k].n, forVer: forVer || '—', stale: stale });
    if (stale) out.stale.push(k);
  }
  out.families.sort(function (a, b) { return a.kind < b.kind ? -1 : 1; });
  return out;
}

/**
 * یادآورِ شبانه. تا انجام نشود هر شب تکرار می‌شود؛ همین که فایلِ تازه با
 * عددِ درست بیاید، دیگر ردیفی ساخته نمی‌شود و ردیفِ باز را ناظر می‌بندد.
 */
function promptFreshNag_() {
  var st = promptFreshStatus_();
  if (!st.stale.length) return st;
  var bits = [];
  for (var i = 0; i < st.families.length; i++) {
    var f = st.families[i];
    bits.push(f.kind + ' (v' + f.n + ' برای ' + f.forVer + ')' + (f.stale ? ' ← کهنه' : ''));
  }
  try {
    logSelfFinding_(getHub_(), {
      // عمداً بی شمارهٔ نسخه در شناسه و عنوان — وگرنه همین یادآور هم مثل
      // نسخهٔ قبلی‌اش خودش را «انجام‌شده» علامت می‌زد.
      priority: 'جدی', category: 'دستورِ روتین‌ها', key: 'prompt-stale',
      title: 'دستورِ روتین/تسک از کدِ در حالِ اجرا عقب مانده است',
      detail: 'بدهی از نسخهٔ ' + st.due + ' — وضعِ فایل‌ها: ' + bits.join(' · '),
      instruction: 'برای هر خانوادهٔ کهنه یک فایلِ _PROMPT-<نوع>-v<N+1>.md در ' +
                   'ریشهٔ OUTPUT بساز و در سرش بنویس «برای نسخهٔ موتور: ' +
                   st.due + '». فایلِ قدیمی را پاک نکن؛ موتور خودش بایگانی‌اش ' +
                   'می‌کند. تا این کار نشود این هشدار هر شب تکرار می‌شود.',
      owner: ROWNER_ENGINE
    });
  } catch (e) {}
  logLine_('دستورِ روتین‌ها عقب مانده: ' + st.stale.join('، ') + ' (بدهی ' + st.due + ').');
  return st;
}

function promptImpactNotice_(version) {
  var got = readCodeManifest_();
  var list = (got && got.info && got.info.promptImpact) || [];
  var kinds = (got && got.info && got.info.promptImpactKinds) || [];
  if (!list.length) return { sent: false, kinds: kinds };

  var body = 'نسخهٔ ' + version + ' چیزهایی را عوض کرده که دستورِ روتین‌ها و تسک‌ها ' +
             'به آن‌ها تکیه دارند:\n\n• ' + list.join('\n• ') +
             '\n\nاین‌ها کد نیستند؛ متنِ دستورند و بیرونِ ریپو زندگی می‌کنند، پس ' +
             'خودشان عوض نمی‌شوند. تا وقتی دستی به‌روز نشوند، روتین همان کارِ قدیم ' +
             'را می‌کند بی‌آنکه خطایی بدهد.';
  try { tgSend_('🧭 ' + tgEsc_('دستورِ روتین‌ها باید به‌روز شود — نسخهٔ ' + version + '\n' + body)); } catch (e) {}
  try {
    MailApp.sendEmail({ to: CFG.EMAIL_TO,
      subject: 'موتور محتوا — دستورِ روتین‌ها باید به‌روز شود (نسخهٔ ' + version + ')',
      htmlBody: '<div dir="rtl" style="font-family:Tahoma">' +
                esc_(body).replace(/\n/g, '<br>') + '</div>' });
  } catch (e2) {}
  try {
    logSelfFinding_(getHub_(), { priority: 'جدی', category: 'دستورِ روتین‌ها',
      key: 'promptimpact-' + version,
      title: 'دستورِ روتین‌ها/تسک‌ها با نسخهٔ ' + version + ' هماهنگ نیست',
      detail: list.join(' ؛ '),
      instruction: 'متنِ دستورِ روتینِ «نظارت روزانه» و تسکِ «غنی‌سازی» با این ' +
                   'فهرست تطبیق داده شود. این کار بیرونِ ریپوست و دستی انجام می‌شود.',
      owner: ROWNER_ENGSRC });
  } catch (e3) {}
  logLine_('اثرِ نسخهٔ ' + version + ' بر دستورِ روتین‌ها اعلام شد: ' + list.length + ' مورد.');
  return { sent: true, items: list, kinds: kinds };
}
