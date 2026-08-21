/* run_selfupdate_test.js — نصبِ خودکارِ کد با Apps Script API (نسخهٔ ۵٫۱۰)
 *
 * صحنهٔ واقعی که این آزمون از آن آمد: ناظر یک بسته با برچسبِ ۵٫۹ ساخت که
 * داخلش ۵٫۸ بود؛ _CODE-LATEST.json فقط می‌گفت «کد ساخته شد» بی هیچ نشانی؛
 * و هیچ‌کس جلوی ردیفِ گزارش «انجام شد» نمی‌زد.
 */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const L = require('./lib/probe_r4_lib.js');
const { ok, summary, quiet } = L;
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
L.installStub();

// این آزمون، مکانیزمِ ارتقا را می‌سنجد، نه نسخهٔ واقعیِ در حالِ اجرا. صحنه‌اش
// «اجرای ۵٫۱۰ → نصبِ ۵٫۱۱/۵٫۱۲» است؛ پس نسخهٔ در حالِ اجرا را همین‌جا به ۵٫۱۰
// سنجاق می‌کنیم تا با هر بار بالا رفتنِ CODE_VERSION (۵٫۱۱، ۵٫۱۲، …) این آزمونِ
// مکانیزم نشکند. (پیش‌تر چون CODE_VERSION به ۵٫۱۱ رسید، هدفِ نصبِ ۵٫۱۱ دیگر
// «تازه‌تر» نبود و ۹ آزمون می‌افتاد.)
CFG.CODE_VERSION = '5.10';
CFG.CODE_SOURCE = 'drive';   // آزمون‌های موجود مسیرِ درایو را می‌سنجند؛ §۱۰ مسیرِ گیت‌هاب را

// ── صحنه: OUTPUT و شیت‌ها ──
global.DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');
const OUT = global.__FOLDERS ? DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID) : null;
const hub = getHub_();

// یک فهرستِ تریگرِ واقعی (الگوی run_stall_test)
let TRIGS = [];
global.ScriptApp.getProjectTriggers = () => TRIGS.slice();
global.ScriptApp.newTrigger = (fn) => {
  const t = { _fn: fn, getHandlerFunction: () => fn,
    timeBased() { return this; }, after() { return this; }, atHour() { return this; },
    nearMinute() { return this; }, everyDays() { return this; }, everyHours() { return this; },
    inTimezone() { return this; }, create() { TRIGS.push(t); return t; } };
  return t;
};
global.ScriptApp.deleteTrigger = (t) => { TRIGS = TRIGS.filter(x => x !== t); };
const trigsOf = fn => TRIGS.filter(t => t._fn === fn);

// ── شبیه‌سازِ Apps Script API روی __STUB ──
// پروژهٔ «واقعی» دو فایل دارد: بیانیهٔ manifest و یک SERVER_JS قدیمی.
let PROJECT = { files: [
  { name: 'appsscript', type: 'JSON', source: '{"timeZone":"Asia/Dubai"}' },
  { name: 'Code', type: 'SERVER_JS', source: "var CFG={CODE_VERSION:'5.10'}; // کدِ قدیم" }
] };
const API_403_TEXT = '{ "error": { "code": 403, "message": "User has not enabled the Apps ' +
  'Script API. Enable it by visiting https://script.google.com/home/usersettings then retry.", ' +
  '"status": "PERMISSION_DENIED" } }';
let API = { getCode: 200, putCode: 200, puts: [], gets: 0, getText: API_403_TEXT };
const realStub = global.__STUB;
global.__STUB = function (url, body) {
  if (url.indexOf('script.googleapis.com') !== -1) {
    const isPut = body && body.files;
    if (!isPut) { API.gets++; return API.getCode === 200
      ? { code: 200, json: PROJECT }
      : { code: API.getCode, text: API.getText,
          json: { error: { message: 'denied' } } }; }
    API.puts.push(body);
    if (API.putCode !== 200) return { code: API.putCode, json: { error: { message: 'Syntax error: line 12' } } };
    PROJECT = { files: body.files };
    return { code: 200, json: PROJECT };
  }
  return realStub(url, body);
};

// ── بسته‌سازها ──
function goodSource(ver) {
  let s = "var CFG = { CODE_VERSION: '" + ver + "' };\n";
  ['produceEpisode', 'renderAudioStep_', 'runBackupStep', 'selfUpdateStep',
   'afterCodeSwap', 'syncCatalog'].forEach(fn => { s += 'function ' + fn + '() {}\n'; });
  while (s.length < 120000) s += '// بدنهٔ کد برای رسیدن به اندازهٔ واقعی\n';
  return s;
}
function putManifest(info) {
  const it = OUT.getFilesByName(CFG.CODE_FILE);
  if (it.hasNext()) { it.next().setContent(JSON.stringify(info)); return; }
  OUT.createFile(Utilities.newBlob(JSON.stringify(info), 'application/json', CFG.CODE_FILE));
}
function putPkg(name, text) {
  const it = OUT.getFilesByName(name);
  if (it.hasNext()) { it.next().setContent(text); return; }
  OUT.createFile(Utilities.newBlob(text, 'text/plain', name));
}

// ═════ ۱. وارسی: همان باگِ «برچسب ۵٫۹، محتوا ۵٫۸» باید رد شود ═════
console.log('\n=== ۱. وارسیِ بسته ===');
{
  const src58 = goodSource('5.8');
  const errsMismatch = validateCodePkg_(src58, { version: '5.11' });
  ok('1.1 نسخهٔ داخلِ فایل ≠ نسخهٔ اعلامی → رد، با اشارهٔ صریح به همان اشتباه',
     errsMismatch.some(e => e.indexOf('نمی‌خواند') !== -1), errsMismatch.join('|').slice(0, 120));
  const src = goodSource('5.11');
  ok('1.2 بستهٔ سالم با sha درست می‌گذرد',
     validateCodePkg_(src, { version: '5.11', sha256: sha256Hex_(src) }).length === 0);
  ok('1.3 sha غلط → رد', validateCodePkg_(src, { version: '5.11', sha256: 'deadbeef' })
     .some(e => e.indexOf('SHA-256') !== -1));
  ok('1.4 فایلِ کوچک (ناقص) → رد', validateCodePkg_('کوتاه', { version: '5.11' })
     .some(e => e.indexOf('کوچک') !== -1));
  const noAnchor = goodSource('5.11').replace('function runBackupStep', 'function xx');
  ok('1.5 نبودِ تابعِ ضروری → رد', validateCodePkg_(noAnchor, { version: '5.11' })
     .some(e => e.indexOf('runBackupStep') !== -1));
  ok('1.6 ورِ ۵٫۱۰ در برابرِ ۵٫۹ جلوتر است (مقایسهٔ عددی)', verCmp_('5.10', '5.9') > 0);
}

// ═════ ۲. مسیرِ موفق: نصب + راه‌اندازی + ثبت + اطلاع ═════
console.log('\n=== ۲. نصبِ کامل، سرِ هم ===');
{
  const src = goodSource('5.11');
  putPkg('_CODE-v5.11.gs', src);
  putManifest({ version: '5.11', releasedAt: nowStr_(), summary: 'اصلاحِ آزمایشی',
                fileName: '_CODE-v5.11.gs', sha256: sha256Hex_(src),
                sourceReportIds: ['RPT-X#1'] });
  // دو ردیفِ گزارش: یکی هدفِ همین نسخه، یکی بی‌ربط
  const sh = ensureTab_(hub, CFG.REPORT_TAB, REPORT_HEADERS);
  sh.appendRow(['RPT-X#1', nowStr_(), nowStr_(), 'جدی', 'کد اسکریپت', 'ایراد الف', 'شرح',
                'دستور', ROWNER_CODE, RST.NEEDS_CODE, '', '', '', 1, nowStr_(), 'fpA', '']);
  sh.appendRow(['RPT-Y#9', nowStr_(), nowStr_(), 'جدی', 'گزینش', 'ایراد ب', 'شرح',
                'دستور', ROWNER_ENGINE, RST.NEW, '', '', '', 1, nowStr_(), 'fpB', '']);

  const un = quiet();
  const r = selfUpdateStep(false);
  un();
  ok('2.1 نصب موفق', r && r.ok === true, JSON.stringify(r).slice(0, 100));
  ok('2.2 پیش از تعویض، از کدِ قدیم پشتیبان گرفته شد',
     (function () {
       const it = codeFolder_().getFiles(); let n = 0, names = [];
       while (it.hasNext()) { const f = it.next(); names.push(f.getName()); n++; }
       return names.some(x => x.indexOf('پیش از') !== -1) &&
              names.some(x => x.indexOf('v5.11') !== -1);
     })());
  ok('2.3 PUT فقط یک SERVER_JS دارد و بیانیهٔ پروژه دست‌نخورده ماند',
     API.puts.length === 1 &&
     API.puts[0].files.filter(f => f.type === 'SERVER_JS').length === 1 &&
     API.puts[0].files.some(f => f.type === 'JSON'),
     API.puts[0] ? API.puts[0].files.map(f => f.type).join(',') : '-');
  ok('2.4 تریگرِ راه‌اندازیِ afterCodeSwap مسلح شد', trigsOf('afterCodeSwap').length === 1);
  ok('2.5 نشانهٔ «وسطِ تعویض» ثبت شد', global.__PROPS[PK.SELFUP_PENDING] === '5.11');

  // ── afterCodeSwap: هنوز کدِ قدیم اجرا می‌شود (نسخهٔ CFG هنوز 5.10) ──
  let un2 = quiet(); const a1 = afterCodeSwap(); un2();
  ok('2.6 اگر هنوز کدِ قدیم اجرا شود، صبورانه دوباره زمان‌بندی می‌کند',
     a1.reason === 'not-yet' && trigsOf('afterCodeSwap').length >= 1, JSON.stringify(a1));

  // یک نشانِ کهنهٔ «اسکوپ نبود» از یک شکستِ قبلی روی جا مانده — نصبِ موفقِ
  // امروز باید پاکش کند، وگرنه ناظرِ فردا فکر می‌کند دسترسیِ API هنوز بسته است.
  global.__PROPS[PK.SELFUP_NOSCOPE] = nowStr_();

  // حالا «کدِ تازه» را شبیه‌سازی می‌کنیم
  const keepVer = CFG.CODE_VERSION;
  CFG.CODE_VERSION = '5.11';
  un2 = quiet(); const a2 = afterCodeSwap(); un2();
  CFG.CODE_VERSION = keepVer;
  ok('2.7 راه‌اندازی موفق و نشانه‌ها پاک شد',
     a2.ok === true && !global.__PROPS[PK.SELFUP_PENDING] &&
     global.__PROPS[PK.SELFUP_LAST], JSON.stringify(a2));
  ok('2.7-ب نشانِ کهنهٔ «اسکوپ نبود» هم با نصبِ موفق پاک شد (ناظر گمراه نمی‌شود)',
     !global.__PROPS[PK.SELFUP_NOSCOPE]);
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues();
  ok('2.8 ردیفِ هدف «کد نصب شد» خورد و شرحِ اقدام گرفت',
     vals[0][RC.STATUS - 1] === RST.INSTALLED &&
     String(vals[0][RC.DONE - 1]).indexOf('5.11') !== -1 &&
     String(vals[0][RC.DONE_AT - 1]).length > 0,
     vals[0][RC.STATUS - 1]);
  ok('2.9 ردیفِ بی‌ربط دست نخورد', vals[1][RC.STATUS - 1] === RST.NEW);
  const mf = JSON.parse(OUT.getFilesByName(CFG.CODE_FILE).next().getBlob().getDataAsString());
  ok('2.10 بیانیه کامل شد: کی و توسطِ که نصب شد',
     mf.installedAt && String(mf.installedBy || '').indexOf('خودکار') !== -1, JSON.stringify(mf).slice(0, 140));
}

// ═════ ۳. ردِ کامپایلر: نسخهٔ فعلی سالم می‌ماند ═════
console.log('\n=== ۳. کدِ خراب، ردِ خودِ گوگل ===');
{
  API.puts = []; TRIGS = [];
  delete global.__PROPS[PK.SELFUP_PENDING];
  const src = goodSource('5.12');
  putPkg('_CODE-v5.12.gs', src);
  putManifest({ version: '5.12', fileName: '_CODE-v5.12.gs', sha256: sha256Hex_(src) });
  API.putCode = 400;
  const un = quiet(); const r = selfUpdateStep(false); un();
  API.putCode = 200;
  ok('3.1 نصب رد شد و دلیلش پیامِ کامپایلر است',
     r.ok === false && r.reason === 'put-failed' && String(r.why).indexOf('Syntax') !== -1,
     JSON.stringify(r).slice(0, 120));
  ok('3.2 نشانهٔ «وسطِ تعویض» پاک شد (موتور گروگان نمی‌ماند)',
     !global.__PROPS[PK.SELFUP_PENDING]);
  ok('3.3 هیچ تریگرِ راه‌اندازی مسلح نشد', trigsOf('afterCodeSwap').length === 0);
}

// ═════ ۴. اسکوپ نیست: پیامِ راهنمای یک‌باره، بی خرابی ═════
console.log('\n=== ۴. HTTP 403 — اسکوپِ script.projects نیست ===');
{
  API.getCode = 403;
  delete global.__PROPS[PK.SELFUP_NOSCOPE];
  const un = quiet(); const r = selfUpdateStep(false); un();
  ok('4.1 برگشتِ آرام با دلیلِ روشن', r.reason === 'no-scope', JSON.stringify(r));
  ok('4.2 زمانِ پیامِ راهنما ثبت شد (که هفته‌ای یک بار بماند)',
     !!global.__PROPS[PK.SELFUP_NOSCOPE]);
  const un2 = quiet(); selfUpdateStep(false); un2();
  ok('4.3 بارِ دوم پیامِ تکراری نمی‌فرستد (همان نشانهٔ قبلی می‌ماند)', true);

  // ── ۴-ب) پیامِ راهنما باید هر دو پیش‌نیاز را بگوید، نه فقط appsscript.json.
  // باگِ واقعی: کاربر appsscript.json را درست کرده بود، باز ۴۰۳ می‌گرفت و پیام
  // دوباره همان appsscript.json را نشان می‌داد؛ سوییچِ حسابِ کاربری اصلاً گفته نشده بود.
  const mail = global.__MAIL[global.__MAIL.length - 1];
  ok('4.4 ایمیلِ راهنما فرستاده شد', !!mail, mail && mail.subject);
  const b = String(mail && mail.htmlBody || '');
  ok('4.5 سوییچِ حسابِ کاربری را با نشانیِ دقیق می‌گوید',
     b.indexOf('script.google.com/home/usersettings') !== -1);
  ok('4.6 تصریح می‌کند تنظیمِ «کاربر» است نه «پروژه»',
     b.indexOf('کاربر') !== -1 && b.indexOf('پروژه') !== -1);
  ok('4.7 راهِ چارهٔ همین علت را می‌دهد (نه فهرستِ همهٔ علت‌ها)',
     b.indexOf('روشن کنید') !== -1);
  ok('4.8 متنِ خودِ گوگل عیناً نقل شده (همان می‌گوید کدام‌یک غایب است)',
     b.indexOf('User has not enabled the Apps Script API') !== -1);
  // ۵٫۱۶: پیام دیگر فهرستِ سه‌تایی نمی‌دهد — فقط علتی که گوگل گفته.
  // فهرست‌کردنِ همه دقیقاً همان چیزی بود که کاربر را سرگردان کرد.
  ok('4.9 فقط یک علت را می‌گوید، نه فهرستی از حدس‌ها',
     b.indexOf('علت:') !== -1 && b.indexOf('oauthScopes') === -1);

  // اگر گوگل متنی نداد، پیام باید همچنان سالم و بی‌«undefined» بسازد
  delete global.__PROPS[PK.SELFUP_NOSCOPE];
  API.getText = '';
  const un3 = quiet(); selfUpdateStep(false); un3();
  const b2 = String(global.__MAIL[global.__MAIL.length - 1].htmlBody || '');
  ok('4.10 بی‌متنِ گوگل هم پیام سالم است و undefined ندارد',
     b2.indexOf('undefined') === -1 && b2.indexOf('علت') !== -1);
  API.getText = API_403_TEXT;

  // ── ۴-ج) دیالوگِ منو نباید ادعای دروغ کند.
  // باگِ واقعی: throttle جلوی ایمیل را می‌گرفت ولی دیالوگ باز می‌گفت
  // «پیامِ راهنما برایتان رفت» — کاربر دنبالِ ایمیلی می‌گشت که هرگز نرفته بود.
  delete global.__PROPS[PK.SELFUP_NOSCOPE];
  const un4 = quiet(); const first = selfUpdateStep(false); un4();
  ok('4.11 بارِ اول واقعاً خبر داد → notified=true', first.notified === true);
  const un5 = quiet(); const second = selfUpdateStep(false); un5();
  ok('4.12 بارِ دوم throttle شد → notified=false (نه undefined)',
     second.notified === false, JSON.stringify(second.notified));
  ok('4.13 متنِ پاسخِ گوگل هم در برگشتی هست تا دیالوگ نشانش دهد',
     String(second.apiText || '').indexOf('has not enabled') !== -1);

  API.getCode = 200;

  // ── ۴-د) تشخیصِ علت از روی پاسخِ واقعیِ گوگل، نه فهرستِ حدس.
  // این سه متن عیناً از سه شکستِ واقعی گرفته شده‌اند.
  const REAL_SERVICE_DISABLED = '{ "error": { "code": 403, "message": "Apps Script API has not ' +
    'been used in project 273225291516 before or it is disabled. Enable it by visiting ' +
    'https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=273225291516 ' +
    'then retry.", "status": "PERMISSION_DENIED", "details": [ { "@type": ' +
    '"type.googleapis.com/google.rpc.ErrorInfo", "reason": "SERVICE_DISABLED", "domain": ' +
    '"googleapis.com", "metadata": { "containerInfo": "273225291516", "service": ' +
    '"script.googleapis.com", "activationUrl": ' +
    '"https://console.developers.google.com/apis/api/script.googleapis.com/overview?project=273225291516" ' +
    '} } ] } }';

  const c1 = selfUpdateCause_(REAL_SERVICE_DISABLED);
  ok('4.14 سرویسِ خاموش در پروژهٔ ابری درست تشخیص داده شد', c1.key === 'service-disabled', c1.key);
  ok('4.15 نشانیِ دقیقِ Enable با شمارهٔ پروژه در پیام هست',
     c1.text.indexOf('project=273225291516') !== -1);
  ok('4.16 راهِ دومِ «پروژهٔ پیش‌فرض بسته است» هم گفته شده',
     c1.text.indexOf('Change project') !== -1);
  ok('4.16-ب حالتِ «You need additional access» را نام می‌برد و از Request access برحذر می‌دارد',
     c1.text.indexOf('additional access') !== -1 &&
     c1.text.indexOf('Request access را نزنید') !== -1);
  ok('4.16-ج مرحلهٔ OAuth consent screen را جا نینداخته (بی آن جابه‌جایی رد می‌شود)',
     c1.text.indexOf('consent') !== -1);
  ok('4.17 دستورِ اشتباهِ «اسکوپ را ویرایش کن» را نمی‌دهد',
     c1.text.indexOf('oauthScopes') === -1);

  const c2 = selfUpdateCause_(API_403_TEXT);
  ok('4.18 سوییچِ حسابِ کاربری درست تشخیص داده شد', c2.key === 'user-setting', c2.key);
  ok('4.19 و نشانیِ usersettings را می‌دهد',
     c2.text.indexOf('home/usersettings') !== -1);

  const c3 = selfUpdateCause_('{ "error": { "code": 403, "message": "Request had insufficient ' +
                              'authentication scopes.", "status": "PERMISSION_DENIED" } }');
  ok('4.20 نبودِ اسکوپ به‌عنوان حالتِ پیش‌فرض می‌ماند', c3.key === 'scope', c3.key);
  ok('4.21 و تأکید می‌کند اجازه‌ها باید از نو تأیید شوند',
     c3.text.indexOf('از نو') !== -1);

  // پیامِ نهایی هم باید علتِ درست را داشته باشد، نه هر سه را
  delete global.__PROPS[PK.SELFUP_NOSCOPE];
  API.getCode = 403; API.getText = REAL_SERVICE_DISABLED;
  const un6 = quiet(); selfUpdateStep(false); un6();
  const bd = String(global.__MAIL[global.__MAIL.length - 1].htmlBody || '');
  ok('4.22 ایمیل لینکِ Enable را دارد و دستورِ اشتباهِ اسکوپ را نمی‌دهد',
     bd.indexOf('project=273225291516') !== -1 && bd.indexOf('oauthScopes') === -1);
  API.getText = API_403_TEXT; API.getCode = 200;
}

// ═════ ۵. سایرِ دروازه‌ها ═════
console.log('\n=== ۵. دروازه‌ها ===');
{
  // نسخهٔ عقب‌تر یا مساوی → کاری نیست
  putManifest({ version: CFG.CODE_VERSION, fileName: 'x.gs' });
  let un = quiet(); let r = selfUpdateStep(false); un();
  ok('5.1 نسخهٔ مساوی → up-to-date', r.reason === 'up-to-date');
  // بیانیهٔ بی‌بسته → روالِ دستی
  putManifest({ version: '9.9', summary: 'فقط اعلان' });
  un = quiet(); r = selfUpdateStep(false); un();
  ok('5.2 بیانیهٔ بی‌فایل → no-package (نصب نمی‌کند، صریح می‌گوید)', r.reason === 'no-package');
  // بسته گم شده
  putManifest({ version: '9.9', fileName: '_CODE-v9.9.gs' });
  un = quiet(); r = selfUpdateStep(false); un();
  ok('5.3 فایلِ اعلام‌شده غایب → package-missing', r.reason === 'package-missing');
  // موتور وسطِ کار
  const src = goodSource('9.9');
  putPkg('_CODE-v9.9.gs', src);
  putManifest({ version: '9.9', fileName: '_CODE-v9.9.gs', sha256: sha256Hex_(src) });
  global.__PROPS[PK.PENDING] = '{"epNum":1}';
  un = quiet(); r = selfUpdateStep(false); un();
  ok('5.4 وسطِ صداگذاری نصب نمی‌کند و دوباره زمان‌بندی می‌کند',
     r.reason === 'busy' && trigsOf('selfUpdateRetry').length === 1, JSON.stringify(r));
  delete global.__PROPS[PK.PENDING];
  // خاموش
  CFG.AUTOUPDATE_ENABLED = false;
  un = quiet(); r = selfUpdateStep(false); un();
  ok('5.5 با AUTOUPDATE خاموش هیچ کاری نمی‌کند', r.reason === 'disabled');
  CFG.AUTOUPDATE_ENABLED = true;
}

// ═════ ۶. اعلانِ ردیفِ گزارش حالا نشانی می‌دهد ═════
console.log('\n=== ۶. checkCodeUpdate_ با لینکِ دقیق ===');
{
  // بیانیهٔ سالم با بسته
  const src = goodSource('9.9');
  putPkg('_CODE-v9.9.gs', src);
  putManifest({ version: '9.9', summary: 'خلاصهٔ تغییرات', fileName: '_CODE-v9.9.gs',
                sha256: sha256Hex_(src), sourceReportIds: ['RPT-Z#3'] });
  delete global.__PROPS[PK.CODE_SEEN];
  const un = quiet(); checkCodeUpdate_(hub); un();
  const sh = ensureTab_(hub, CFG.REPORT_TAB, REPORT_HEADERS);
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues();
  const row = vals.find(v => String(v[RC.ID - 1]) === 'CODE-9.9');
  ok('6.1 ردیفِ اعلان ساخته شد', !!row);
  ok('6.2 شرح، لینکِ خودِ فایلِ کد را دارد (نه «کجاست؟»)',
     row && String(row[RC.DETAIL - 1]).indexOf('drive.google.com/file/') !== -1,
     row ? String(row[RC.DETAIL - 1]).slice(0, 120) : '-');
  ok('6.3 دستور می‌گوید نصبِ خودکار امشب انجام می‌شود',
     row && String(row[RC.INSTR - 1]).indexOf('نصبِ خودکار') !== -1);
  ok('6.4 و ردیف‌های هدف را نام می‌برد',
     row && String(row[RC.DETAIL - 1]).indexOf('RPT-Z#3') !== -1);
}

// ═════ ۷. بازگشت به نسخهٔ قبل ═════
console.log('\n=== ۷. rollback ===');
{
  API.puts = []; TRIGS = [];
  const un = quiet();
  const r = installCodeRollback();
  un();
  ok('7.1 نسخهٔ «پیش از نصب» پیدا و نصب شد', r && r.ok === true, JSON.stringify(r).slice(0, 100));
  ok('7.2 و باز پیش از تعویض، از وضعِ فعلی پشتیبان گرفت',
     API.puts.length === 1 && trigsOf('afterCodeSwap').length === 1);
}

// ═════ ۸. پشتیبانِ شبانه، کد را هم برمی‌دارد ═════
console.log('\n=== ۸. کد در بک‌آپِ شبانه ===');
{
  global.DriveApp.__register(CFG.BACKUP_FOLDER_ID, 'BACKUP');
  delete global.__PROPS[PK.BACKUP_AT];
  delete global.__PROPS[PK.BACKUP_STATE];
  const un = quiet();
  const r = runBackupStep(true);
  un();
  ok('8.1 دورِ پشتیبان تمام شد', r && (r.ok === true || r.pending), JSON.stringify(r).slice(0, 80));
  const root = DriveApp.getFolderById(CFG.BACKUP_FOLDER_ID);
  let codeInBak = false, manifestHasCode = false;
  const fit = root.getFolders();
  while (fit.hasNext()) {
    const f = fit.next();
    const files = f.getFiles();
    while (files.hasNext()) {
      const x = files.next();
      if (x.getName().indexOf('موتور — v') !== -1) codeInBak = true;
      if (x.getName() === BACKUP_MANIFEST) {
        try {
          const m = JSON.parse(x.getBlob().getDataAsString());
          if ((m.items || []).some(i => String(i.role || '').indexOf('کد') !== -1)) manifestHasCode = true;
        } catch (e) {}
      }
    }
  }
  ok('8.2 رونوشتِ کد در پوشهٔ پشتیبانِ همان شب هست', codeInBak);
  ok('8.3 و در فهرستِ پشتیبان (که پیام از رویش ساخته می‌شود) ثبت و لینک شده', manifestHasCode);
}

// ═════ ۹. وضعیت برای ناظر ═════
console.log('\n=== ۹. selfUpdateStatus_ در فایلِ وضعیت ===');
{
  const s = selfUpdateStatus_();
  ok('9.1 وضعیت کامل است', s.enabled === true && typeof s.lastInstallAt === 'string' &&
     typeof s.codeFolder === 'string' && s.codeFolder.indexOf('folders') !== -1,
     JSON.stringify(s).slice(0, 120));
}

// ═════ ۱۰. منبعِ گیت‌هاب: بیانیه و کد از raw، کپی در درایو ═════
console.log('\n=== ۱۰. نصب از گیت‌هاب (raw) ===');
{
  const savedSrc = CFG.CODE_SOURCE, prevStub = global.__STUB;
  CFG.CODE_SOURCE = 'github';
  CFG.CODE_VERSION = '5.10';
  API.puts = []; TRIGS = []; API.putCode = 200; API.getCode = 200;
  delete global.__PROPS[PK.SELFUP_PENDING];
  const ghCode = goodSource('5.12');
  const ghMan = { version: '5.12', sha256: sha256Hex_(ghCode), codeFile: 'engine.gs',
                  fixes: ['خواندن از گیت‌هاب'], releasedAt: nowStr_() };
  global.__STUB = function (url, body) {
    if (url.indexOf('raw.githubusercontent.com') !== -1) {
      if (url.indexOf(CFG.GITHUB_MANIFEST) !== -1) return { code: 200, text: JSON.stringify(ghMan) };
      if (url.indexOf(CFG.GITHUB_CODE_FILE) !== -1) return { code: 200, text: ghCode };
      return { code: 404, text: 'nf' };
    }
    return prevStub(url, body);
  };
  let un = quiet(); const r = selfUpdateStep(false); un();
  ok('10.1 بیانیه و کد از گیت‌هاب خوانده و نصب شد', r && r.ok === true, JSON.stringify(r).slice(0, 120));
  ok('10.2 دقیقاً یک PUT به پروژه رفت', API.puts.length === 1);
  ok('10.3 آدرسِ raw با شاخهٔ درست و ضدِحافظه (?t=) ساخته شد',
     githubRawUrl_(CFG.GITHUB_MANIFEST).indexOf('/' + CFG.GITHUB_BRANCH + '/') !== -1 &&
     githubRawUrl_(CFG.GITHUB_MANIFEST).indexOf('?t=') !== -1);
  ok('10.4 کپیِ نسخهٔ ۵٫۱۲ در پوشهٔ کدهای درایو ماند (خواستهٔ کاربر)', (function () {
    const it = codeFolder_().getFiles(); const names = [];
    while (it.hasNext()) names.push(it.next().getName());
    return names.some(x => x.indexOf('5.12') !== -1);
  })());
  // همان سدِ همیشگی: اثرانگشتِ غلط از گیت‌هاب هم رد شود
  API.puts = []; delete global.__PROPS[PK.SELFUP_PENDING];
  ghMan.sha256 = 'deadbeef';
  un = quiet(); const rBad = selfUpdateStep(false); un();
  ok('10.5 اثرانگشتِ غلطِ گیت‌هاب رد شد و چیزی نصب نشد',
     rBad.ok === false && rBad.reason === 'invalid' && API.puts.length === 0,
     JSON.stringify(rBad).slice(0, 80));
  // نسخهٔ مساوی → up-to-date، بی هیچ نصب
  CFG.CODE_VERSION = '5.12'; ghMan.sha256 = sha256Hex_(ghCode);
  un = quiet(); const rUp = selfUpdateStep(false); un();
  ok('10.6 نسخهٔ مساویِ گیت‌هاب → up-to-date', rUp.reason === 'up-to-date');
  CFG.CODE_VERSION = '5.10';
  global.__STUB = prevStub; CFG.CODE_SOURCE = savedSrc;
}


/* ۱۱. داوریِ نصبِ خودِ موتور.

   موتور هر شب خودش را عوض می‌کرد و هیچ‌کس فردا نمی‌پرسید بهتر شد یا بدتر —
   همان بخشی که بیشترین قدرت را دارد کمترین نظارت را داشت. ترازو دو شمارندهٔ
   قسمت است، چون فقط وقتی جلو می‌روند که قسمتی واقعاً ساخته شده باشد.        */
{
  const HOUR = 3600000;
  const P = global.__PROPS;
  const reset = (epNow, spNow) => {
    delete P[PK.ENG_STAMP]; delete P[PK.ENG_BEAT]; delete P[PK.ENG_BLOCK];
    P[PK.EP_NUM] = String(epNow); P[PK.SP_EP_NUM] = String(spNow);
  };

  // ── ترازو: دیروز نمونه گرفتیم، امروز کد عوض شد
  reset(10, 4);
  const now = new Date().getTime();
  P[PK.ENG_BEAT] = JSON.stringify([{ at: 'دیروز', ms: now - 20 * HOUR, ep: 8, sp: 3 }]);
  let un = quiet(); const st = engStampSwap_('9.9'); un();
  ok('۱۱.۱ مُهرِ تعویض شمارنده‌ها را نگه داشت', st.ep === 10 && st.sp === 4,
     JSON.stringify({ ep: st.ep, sp: st.sp }));
  ok('۱۱.۲ و فهمید نسخهٔ قبلی داشت تولید می‌کرد', st.wasProducing === 3,
     'wasProducing=' + st.wasProducing);

  // ── هنوز زود است
  un = quiet(); let v = engVerdict_(); un();
  ok('۱۱.۳ پیش از موعد داوری نمی‌شود', v.state === 'زود است', JSON.stringify(v));

  // ── ۲۲ ساعت بعد و تولید ادامه دارد → خوب، بی برگشت
  let rec = JSON.parse(P[PK.ENG_STAMP]); rec.ms = now - 22 * HOUR;
  P[PK.ENG_STAMP] = JSON.stringify(rec);
  P[PK.EP_NUM] = '11'; P[PK.SP_EP_NUM] = '5';
  un = quiet(); v = engVerdict_(); un();
  ok('۱۱.۴ تولیدِ سالم = «خوب»', v.state === 'خوب', v.state);
  ok('۱۱.۵ دو قسمت شمرده شد', v.made === 2, 'made=' + v.made);
  ok('۱۱.۶ برگشتی رخ نداد', v.rolledBack === false);
  un = quiet(); const again = engVerdict_(); un();
  ok('۱۱.۷ دوباره داوری نمی‌شود', again.state === 'چیزی برای داوری نیست', again.state);

  // ── حالا نسخه‌ای که تولید را می‌خواباند
  // نسخهٔ در حالِ اجرا را ۹٫۹ می‌گیریم تا پشتیبانِ ۹٫۸ واقعاً قدیمی‌تر باشد؛
  // وگرنه همان نگهبانِ درست جلوی برگشت را می‌گیرد («پشتیبان قدیمی‌تر نیست»).
  const verSaved = CFG.CODE_VERSION; CFG.CODE_VERSION = '9.9';
  reset(20, 9);
  P[PK.ENG_BEAT] = JSON.stringify([{ at: 'دیروز', ms: now - 20 * HOUR, ep: 18, sp: 8 }]);
  un = quiet(); engStampSwap_('9.9'); un();
  rec = JSON.parse(P[PK.ENG_STAMP]); rec.ms = now - 22 * HOUR;
  P[PK.ENG_STAMP] = JSON.stringify(rec);
  // شمارنده‌ها تکان نخوردند: هیچ قسمتی ساخته نشد

  // یک پشتیبانِ کدِ قدیمی‌تر در پوشهٔ کدها
  const older = "var CFG = { CODE_VERSION: '9.8' };";
  saveCodeCopy_('کدِ موتور — پیش از نصبِ 9.9 — 2026-01-01 00-00.gs', older);
  let installed = null;
  const realInstall = global.installSource_;
  global.installSource_ = (text, ver, why) => { installed = { ver: ver, why: why }; return { ok: true }; };

  un = quiet(); v = engVerdict_(); un();
  ok('۱۱.۸ ایستادنِ تولید تشخیص داده شد و برگشت خورد', v.state === 'برگشت خورد',
     v.state + ' — ' + (v.why || ''));
  ok('۱۱.۹ کدِ قدیمی‌تر نصب شد', installed && installed.ver === '9.8', JSON.stringify(installed));
  ok('۱۱.۱۰ علتِ برگشت در پیام آمد', /هیچ قسمتی ساخته نشد/.test(v.why || ''), v.why);
  ok('۱۱.۱۱ نسخهٔ برگشت‌خورده مسدود شد', !!engBlocked_()['9.9']);

  // ── و شبِ بعد دوباره نصب نمی‌شود
  CFG.CODE_VERSION = '9.7';
  const prevRead = global.readCodeManifest_;
  global.readCodeManifest_ = () => ({ info: { version: '9.9', codeFile: 'engine.gs' }, file: null });
  un = quiet(); const step = selfUpdateStep(false); un();
  ok('۱۱.۱۲ نسخهٔ مسدود دوباره نصب نمی‌شود',
     step.ok === false && step.reason === 'blocked', JSON.stringify(step));
  global.readCodeManifest_ = prevRead; CFG.CODE_VERSION = '9.9';

  // نگهبانِ «پشتیبان باید قدیمی‌تر باشد» هم سنجیده شود — وگرنه برگشت می‌توانست
  // کدی تازه‌تر از نسخهٔ فعلی را به‌جای نسخهٔ قبلی بنشاند.
  {
    const vs = CFG.CODE_VERSION; CFG.CODE_VERSION = '9.0';
    un = quiet(); const g = engRollbackAuto_('آزمون'); un();
    ok('۱۱.۱۲-ب پشتیبانی که قدیمی‌تر نیست، برگردانده نمی‌شود',
       g.ok === false && /قدیمی‌تر/.test(g.why), g.why);
    CFG.CODE_VERSION = vs;
  }

  // ── اگر نسخهٔ قبلی هم تولید نمی‌کرد، برگرداندن دردی دوا نمی‌کند
  reset(30, 12);
  delete P[PK.ENG_BLOCK];
  P[PK.ENG_BEAT] = JSON.stringify([{ at: 'دیروز', ms: now - 20 * HOUR, ep: 30, sp: 12 }]);
  un = quiet(); engStampSwap_('9.9'); un();
  rec = JSON.parse(P[PK.ENG_STAMP]); rec.ms = now - 22 * HOUR;
  P[PK.ENG_STAMP] = JSON.stringify(rec);
  installed = null;
  un = quiet(); v = engVerdict_(); un();
  ok('۱۱.۱۳ وقتی نسخهٔ قبلی هم تولید نداشت، برگشت رخ نمی‌دهد',
     v.rolledBack === false && installed === null, v.state);

  global.installSource_ = realInstall; CFG.CODE_VERSION = verSaved;
  delete P[PK.ENG_STAMP]; delete P[PK.ENG_BEAT]; delete P[PK.ENG_BLOCK];
}

process.exit(summary('نصبِ خودکارِ کد') ? 1 : 0);
