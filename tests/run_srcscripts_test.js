/* وارسیِ اسکریپت‌های منبع (بخشِ ۲۲) — تشخیص، بدونِ هیچ نصبی. */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs',
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

const SHEET = 'SHEET-PHOTO', OTHER = 'SHEET-OTHER';
const SRC = 'function doAnalyze(){} function helper_(){} function onOpen(){}';
let API = { code: 200, parent: SHEET, puts: 0, source: SRC };
const realStub = global.__STUB;
global.__STUB = function (url, body) {
  if (url.indexOf('script.googleapis.com') !== -1) {
    if (body && body.files) { API.puts++; return { code: 200, json: {} }; }
    if (API.code !== 200) {
      return { code: API.code, text: '{"error":{"message":"nope"}}',
               json: { error: { message: 'nope' } } };
    }
    return { code: 200, json: { parentId: API.parent,
             files: [{ name: 'Code', type: 'SERVER_JS', source: API.source },
                     { name: 'appsscript', type: 'JSON', source: '{}' }] } };
  }
  return realStub ? realStub(url, body) : { code: 404 };
};

console.log('\n=== ۱. دسته‌بندیِ جمله‌های واقعیِ خطا ===');
{
  const a = srcErrKind_("ERROR: TypeError: Cannot read properties of undefined (reading 'parts')");
  ok('۱.۱ باگِ کد شناخته شد', a.kind === 'code', a.label);
  const b = srcErrKind_('ERROR: Error: پاسخ نامعتبر از مدل: { "promptFeedback": { "blockReason": "OTHER" }');
  ok('۱.۲ ردِ مدل «کد» حساب نمی‌شود', b.kind === 'model', b.label);
  const c = srcErrKind_('ERROR: Error: تحلیل جمینای با شکست مواجه شد (400): { "message": "File imb');
  ok('۱.۳ فایلِ خراب «داده» حساب می‌شود', c.kind === 'data', c.label);
  ok('۱.۴ برای هر دسته چارهٔ مشخص هست', !!a.fix && !!b.fix && !!c.fix);
}

console.log('\n=== ۲. وارسی و چسبندگی ===');
{
  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'تحلیلگرِ عکس', scriptId: 'S1', sheetId: SHEET }];
  const r = sourceScriptsAudit_();
  ok('۲.۱ اسکریپت خوانده شد', r.scripts[0].reachable);
  ok('۲.۲ چسبندگی به شیتِ درست تأیید شد', r.scripts[0].bindingOk === true);
  ok('۲.۳ توابع استخراج شدند', r.scripts[0].functions.indexOf('doAnalyze') !== -1,
     r.scripts[0].functions.join(','));
  ok('۲.۴ اثرانگشت گرفته شد', /^[0-9a-f]{64}$/.test(r.scripts[0].sha256));
  ok('۲.۵ هیچ نوشتنی در اسکریپت انجام نشد', API.puts === 0);
}

console.log('\n=== ۳. شناسهٔ اشتباه بی‌صدا رد نمی‌شود ===');
{
  API.parent = OTHER;
  const r = sourceScriptsAudit_();
  ok('۳.۱ چسبندگیِ نادرست گرفته شد', r.scripts[0].bindingOk === false);
  ok('۳.۲ و به‌عنوان ایراد ثبت شد', r.problems.length === 1, r.problems[0]);
  API.parent = SHEET;
}

console.log('\n=== ۳-ب. اسکریپتِ مستقل (مثل Photo-Analyzer-Gemini) ===');
{
  // اسکریپت‌های واقعیِ این سامانه مستقل‌اند: parentId ندارند و با openById
  // به شیت وصل می‌شوند. اگر با معیارِ «چسبندگی» سنجیده شوند، هر کدامِ سالمی
  // «نامرتبط» گزارش می‌شد — همان هشدارِ دروغینی که این بخش باید نسازد.
  API.parent = '';
  API.source = 'function run(){ SpreadsheetApp.openById("' + SHEET + '").getSheets(); }';
  const r = sourceScriptsAudit_();
  ok('۳-ب.۱ گونه‌اش «مستقل» تشخیص داده شد', r.scripts[0].kind === 'standalone', r.scripts[0].kind);
  ok('۳-ب.۲ ارتباط از روی شناسهٔ شیت در کد تأیید شد', r.scripts[0].bindingOk === true);
  ok('۳-ب.۳ هیچ ایرادِ دروغینی ثبت نشد', r.problems.length === 0,
     JSON.stringify(r.problems));

  // و اگر واقعاً بی‌ربط بود، باید بگیردش
  API.source = 'function run(){ SpreadsheetApp.openById("SOME-OTHER-SHEET"); }';
  const r2 = sourceScriptsAudit_();
  ok('۳-ب.۴ اسکریپتِ مستقلِ بی‌ربط گرفته می‌شود', r2.scripts[0].bindingOk === false);
  ok('۳-ب.۵ و علتش روشن گفته می‌شود', /مستقل/.test(r2.scripts[0].note), r2.scripts[0].note);

  API.parent = SHEET; API.source = SRC;
}

console.log('\n=== ۴. شیتِ بی‌اسکریپت ایراد نیست ===');
{
  CFG.SOURCE_SCRIPTS = [];
  const r = sourceScriptsAudit_();
  ok('۴.۱ فهرستِ خالی → بدونِ ایراد', r.problems.length === 0 && r.configured === 0);
  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'تحلیلگرِ عکس', scriptId: 'S1', sheetId: SHEET }];
}

console.log('\n=== ۵. نبودِ دسترسی صادقانه گزارش می‌شود ===');
{
  API.code = 403;
  const r = sourceScriptsAudit_();
  ok('۵.۱ ناخواندنی علامت خورد', r.scripts[0].reachable === false);
  ok('۵.۲ علتش در یادداشت آمد', /دسترسی نداریم \(403\)/.test(r.scripts[0].note),
     r.scripts[0].note);
  API.code = 200;
}

console.log('\n=== ۵-ب. علت‌های مختلفِ نخواندن از هم تفکیک می‌شوند ===');
{
  // واقعی: یک کاراکترِ I/l در شناسه غلط رونویسی شده بود و پیام فقط می‌گفت
  // «خوانده نشد»، که کاربر را دنبالِ مشکلِ دسترسی می‌فرستاد.
  API.code = 400;
  let r = sourceScriptsAudit_();
  ok('۵-ب.۱ ۴۰۰ را «شناسهٔ نامعتبر» می‌گوید', /نامعتبر/.test(r.scripts[0].note), r.scripts[0].note);
  ok('۵-ب.۲ و راهنماییِ عملی می‌دهد (دکمهٔ Copy)', /Copy/.test(r.scripts[0].note));

  API.code = 403;
  r = sourceScriptsAudit_();
  ok('۵-ب.۳ ۴۰۳ را «دسترسی» می‌گوید، نه شناسهٔ غلط',
     /دسترسی/.test(r.scripts[0].note) && !/نامعتبر/.test(r.scripts[0].note), r.scripts[0].note);

  API.code = 404;
  r = sourceScriptsAudit_();
  ok('۵-ب.۴ ۴۰۴ را «چنین اسکریپتی نیست» می‌گوید', /نیست/.test(r.scripts[0].note), r.scripts[0].note);
  ok('۵-ب.۵ کدِ HTTP هم نگه داشته می‌شود', r.scripts[0].httpCode === 404);
  API.code = 200;
}

console.log('\n=== ۶. طوفانِ تلاشِ دوباره ===');
{
  const rec = [];
  for (let i = 0; i < 4; i++) rec.push({ fileId: 'F-STUCK', tab: 'Sheet1', text: 'ERROR: (400) File x' });
  rec.push({ fileId: 'F-OK', tab: 'Sheet1', text: 'ERROR: TypeError: Cannot read properties of undefined' });
  const realSummary = global.srcErrorSummary_;
  global.srcErrorSummary_ = () => ({ total: 5, recent: rec });
  const d = sourceErrDigest_(null);
  ok('۶.۱ فایلِ گیرکرده پیدا شد', d.storms.length === 1 && d.storms[0].fileId === 'F-STUCK',
     JSON.stringify(d.storms));
  ok('۶.۲ شمارشِ تکرار درست است', d.storms[0].times === 4);
  ok('۶.۳ دسته‌ها تفکیک شدند', d.byKind.data === 4 && d.byKind.code === 1,
     JSON.stringify(d.byKind));
  // بازگرداندنِ تابعِ واقعی — وگرنه هر بخشِ بعدی همین دادهٔ ساختگی را می‌بیند
  // و بی‌آنکه بفهمد روی پنجرهٔ خطای اشتباهی قضاوت می‌کند.
  global.srcErrorSummary_ = realSummary;
}

console.log('\n=== ۷. مرزِ ایمنی: هرگز واردِ نصبِ خودکارِ موتور نشود ===');
{
  ok('۷.۱ مسئولِ ردیف‌ها از مسئولِ کدِ موتور جداست', ROWNER_SRCCODE !== ROWNER_CODE);
  // reportRow_ مسئول را این‌طور تعیین می‌کند: هر نامی که «کد» در آن باشد
  // ROWNER_CODE می‌شود و وضعیتش NEEDS_CODE — یعنی می‌رود به صفِ نصبِ موتور.
  // پس نامِ این مسئول نباید «کد» داشته باشد. همان قاعده را عیناً اجرا می‌کنیم:
  const asCode = String(ROWNER_SRCCODE || '').indexOf('کد') !== -1;
  ok('۷.۲ قاعدهٔ خودِ reportRow_ آن را ROWNER_CODE حساب نمی‌کند', !asCode,
     asCode ? '⚠️ این ردیف‌ها به مسیرِ نصبِ موتور می‌روند' : 'جدا می‌ماند');
  // و از راهِ خودِ تابع، نه بازسازیِ دستیِ قاعده
  const row = reportRow_({ at: '2026-08-16 23:00' },
    { title: 't', instruction: 'i', owner: ROWNER_SRCCODE }, 0, 'fp-x');
  ok('۷.۳ ردیفِ ساخته‌شده وضعیتِ «نیازمند تعویض کد» نمی‌گیرد',
     String(row[RC.STATUS - 1]) !== RST.NEEDS_CODE, String(row[RC.STATUS - 1]));
  ok('۷.۴ و مسئولش ROWNER_CODE نیست',
     String(row[RC.OWNER - 1]) !== ROWNER_CODE, String(row[RC.OWNER - 1]));
}

console.log('\n=== ۸. ساختِ وضعیت نباید شبکه بزند ===');
{
  // باگِ واقعی: sourceScriptsStatus_ اول وارسیِ زنده می‌کرد. تا وقتی شناسه‌ها
  // خالی بودند بی‌اثر بود، ولی همین که پر شدند هر ساختِ _STATUS.json به‌ازای
  // هر اسکریپت یک فراخوانِ Apps Script API می‌شد — و آن مسیر داخلِ تولیدِ
  // پادکست هم می‌دود. سه آزمونِ دیگر با همین شکستند.
  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'ت', scriptId: 'S1', sheetId: SHEET }];
  let calls = 0;
  const prev = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('script.googleapis.com') !== -1) calls++;
    return prev(url, body);
  };

  delete global.__PROPS[PK.SRCSCRIPT_LAST];
  const s0 = sourceScriptsStatus_();
  ok('۸.۱ پیش از هر وارسی، وضعیت بی‌شبکه جواب می‌دهد', calls === 0, 'calls=' + calls);
  ok('۸.۲ و صادقانه می‌گوید هنوز وارسی نشده', /وارسی نشده/.test(s0.note || ''), s0.note);

  const a = sourceScriptsAudit_();
  sourceScriptsRemember_(a);
  const after = calls;
  ok('۸.۳ خودِ وارسی البته شبکه می‌زند', after > 0, 'calls=' + after);

  const s1 = sourceScriptsStatus_();
  ok('۸.۴ وضعیت پس از وارسی هم شبکه نمی‌زند', calls === after, 'calls=' + calls);
  ok('۸.۵ و نتیجهٔ ذخیره‌شده را می‌دهد', s1.scripts.length === 1 && !!s1.checkedAt,
     JSON.stringify(s1.checkedAt));
  ok('۸.۶ متنِ کد در وضعیت نمی‌آید (سبک می‌ماند)',
     JSON.stringify(s1).indexOf('function ') === -1);

  global.__STUB = prev;
}

console.log('\n=== ۹. سدهای ایمنیِ نصب ===');
{
  const CODE = 'function a(){} function b(){}';
  const shaOf = t => require('crypto').createHash('sha256').update(t, 'utf8').digest('hex');
  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'ت', scriptId: 'S1', sheetId: SHEET }];

  let MAN = { target: 'ت', version: '1.1', codeFile: 'analyzer.gs',
              sha256: shaOf(CODE), baseSha256: shaOf(SRC),
              requiredFunctions: ['function a', 'function b'] };
  let PKG = CODE, puts = 0;
  const prev = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('manifest.json') !== -1) return { code: 200, text: JSON.stringify(MAN) };
    if (url.indexOf('analyzer.gs') !== -1)   return { code: 200, text: PKG };
    if (url.indexOf('script.googleapis.com') !== -1) {
      if (body && body.files) { puts++; return { code: 200, json: {} }; }
      return { code: 200, json: { parentId: SHEET,
               files: [{ name: 'Code', type: 'SERVER_JS', source: SRC },
                       { name: 'appsscript', type: 'JSON', source: '{"oauthScopes":["x"]}' }] } };
    }
    return prev(url, body);
  };

  const v0 = srcVerify_('photo');
  ok('۹.۱ بستهٔ سالم آمادهٔ نصب است', v0.ok, (v0.errors || []).join('|'));
  // این دقیقاً همان باگی بود که آزمون گرفت: اگر اثرانگشتِ کدِ زنده جور دیگری
  // حساب شود (مثلاً با یک \n اضافه در ابتدا)، baseSha256 هرگز نمی‌خواند و هر
  // نصبی در تولید متوقف می‌شد.
  ok('۹.۱-ب اثرانگشتِ کدِ زنده همان تعریفِ فایلِ ریپوست', v0.live.sha === shaOf(SRC),
     v0.live.sha.slice(0,12) + ' vs ' + shaOf(SRC).slice(0,12));

  // اثرانگشتِ بسته نخواند → نصب نشود
  PKG = CODE + ' // دستکاری‌شده';
  let v = srcVerify_('photo');
  ok('۹.۲ بستهٔ دستکاری‌شده رد می‌شود',
     !v.ok && v.errors.some(e => /اثرانگشتِ بسته/.test(e)), v.errors.join('|'));
  PKG = CODE;

  // تابعِ ضروری غایب → نصب نشود (تریگرها به همین نام‌ها بسته‌اند)
  MAN = Object.assign({}, MAN, { requiredFunctions: ['function a', 'function GONE'] });
  v = srcVerify_('photo');
  ok('۹.۳ نبودِ تابعِ ضروری جلوی نصب را می‌گیرد',
     !v.ok && v.errors.some(e => /تابعِ ضروری/.test(e)));
  MAN = Object.assign({}, MAN, { requiredFunctions: ['function a', 'function b'] });

  // کدِ زنده دستی عوض شده → نصب نشود
  MAN = Object.assign({}, MAN, { baseSha256: shaOf('یک کدِ دیگر') });
  v = srcVerify_('photo');
  ok('۹.۴ کدِ زندهٔ دستکاری‌شده نصب را متوقف می‌کند',
     !v.ok && v.errors.some(e => /دستی عوض شده/.test(e)), v.errors.join('|'));
  MAN = Object.assign({}, MAN, { baseSha256: shaOf(SRC) });

  // همین نسخه از قبل نصب است → دوباره ننویس
  MAN = Object.assign({}, MAN, { sha256: shaOf(SRC) });
  v = srcVerify_('photo');
  ok('۹.۵ نسخهٔ از قبل نصب‌شده دوباره نوشته نمی‌شود',
     !v.ok && v.errors.some(e => /از قبل نصب/.test(e)));
  MAN = Object.assign({}, MAN, { sha256: shaOf(CODE) });

  ok('۹.۶ تا اینجا هیچ نوشتنی در اسکریپت انجام نشد', puts === 0, 'puts=' + puts);

  // نصبِ واقعی: appsscript.json باید دست‌نخورده بماند
  let sent = null;
  global.__STUB = function (url, body) {
    if (url.indexOf('manifest.json') !== -1) return { code: 200, text: JSON.stringify(MAN) };
    if (url.indexOf('analyzer.gs') !== -1)   return { code: 200, text: PKG };
    if (url.indexOf('script.googleapis.com') !== -1) {
      if (body && body.files) { sent = body.files; puts++; return { code: 200, json: {} }; }
      return { code: 200, json: { parentId: SHEET,
               files: [{ name: 'Code', type: 'SERVER_JS', source: SRC },
                       { name: 'appsscript', type: 'JSON', source: '{"oauthScopes":["x"]}' }] } };
    }
    return prev(url, body);
  };
  const un9 = quiet(); const r = srcInstall_('photo'); un9();
  ok('۹.۷ نصب انجام شد', r.ok === true, JSON.stringify(r.errors || ''));
  ok('۹.۸ appsscript.json عیناً حفظ شد',
     sent.some(f => f.type === 'JSON' && f.source === '{"oauthScopes":["x"]}'));
  ok('۹.۹ فقط یک فایلِ SERVER_JS نوشته شد و محتوایش بستهٔ تأییدشده است',
     sent.filter(f => f.type === 'SERVER_JS').length === 1 &&
     sent.find(f => f.type === 'SERVER_JS').source === CODE);
  ok('۹.۱۰ پیش از نصب پشتیبان گرفته شد', /پیش از نصب/.test(r.backup || ''), r.backup);

  global.__STUB = prev;
}


/* ۱۰. پس از نصب، وضعیت باید «به‌روز» خوانده شود — نه «دستکاری‌شده».

   یک نصبِ موفق کدِ زنده را از baseSha256 به sha256 می‌بَرَد. اگر وارسی اول
   baseSha256 را بسنجد، همان نصبِ موفق از لحظهٔ بعدش خودش را «دستی عوض شده»
   گزارش می‌کند و کاربر فکر می‌کند چیزی خراب شده. این دقیقاً همان چیزی بود که
   بعد از اولین نصبِ واقعی روی صفحه آمد.                                        */
console.log('\n=== ۱۰. حالتِ «از قبل نصب است» با «دستکاری» قاطی نمی‌شود ===');
{
  const shaOf = t => require('crypto').createHash('sha256').update(t, 'utf8').digest('hex');
  const SHEET = 'SH-10';
  const BASE = 'function a(){}\nfunction b(){}';   // آنچه پیش از نصب زنده بود
  const NEW  = 'function a(){}\nfunction b(){/*نو*/}'; // آنچه نصب شد
  const MAN = { target: 'ت', version: '1.1', codeFile: 'analyzer.gs',
                sha256: shaOf(NEW), baseSha256: shaOf(BASE),
                requiredFunctions: ['function a', 'function b'] };
  let LIVE = NEW;                                   // یعنی نصب انجام شده
  const prev = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('manifest.json') !== -1) return { code: 200, text: JSON.stringify(MAN) };
    if (url.indexOf('analyzer.gs') !== -1)   return { code: 200, text: NEW };
    if (url.indexOf('script.googleapis.com') !== -1) {
      return { code: 200, json: { parentId: SHEET,
               files: [{ name: 'Code', type: 'SERVER_JS', source: LIVE }] } };
    }
    return prev(url, body);
  };

  let v = srcVerify_('photo');
  ok('۱۰.۱ می‌گوید از قبل نصب است', v.installed === true);
  ok('۱۰.۲ و حرفی از «دستی عوض شده» نمی‌زند',
     !v.errors.some(e => /دستی عوض شده/.test(e)), v.errors.join('|'));
  ok('۱۰.۳ و دوباره نصب نمی‌کند', v.ok === false);

  // کدِ زنده نه مبناست و نه نسخهٔ تازه → این یکی واقعاً دستکاری است
  LIVE = 'function a(){}\nfunction b(){}\n// دستِ آدمیزاد';
  v = srcVerify_('photo');
  ok('۱۰.۴ دستکاریِ واقعی هنوز گرفته می‌شود',
     v.installed === false && v.errors.some(e => /دستی عوض شده/.test(e)), v.errors.join('|'));

  // و متنی که به کاربر نشان داده می‌شود
  LIVE = NEW;
  const un10 = quiet(); const st = runShowSourceUpdates(); un10();
  ok('۱۰.۵ در فهرستِ منو هم «نصب‌شده» علامت می‌خورد',
     st.length > 0 && st.every(x => x.installed === true && x.ready === false));
  global.__STUB = prev;
}


/* ۱۱. خطاهای پیش از نصب به پای کدِ تازه نوشته نمی‌شوند.

   این را وارسیِ واقعیِ روزِ بعدِ نصب بیرون کشید: گزارش گفت «code: ۸ خطا» و
   «طوفانِ تلاشِ دوباره: ۸ فایل» — در حالی که هر ۸ تا پیش از نصب ثبت شده بودند و
   بعد از نصب فقط یک خطا آمده بود، آن هم نه باگ. digest آخرین N ردیف را برمی‌داشت
   بی‌آنکه به تاریخشان نگاه کند، پس انبارهٔ خطاهای قدیمی هر شب دوباره گزارش
   می‌شد و همان اشکالِ درست‌شده را «هنوز خراب» نشان می‌داد.                       */
console.log('\n=== ۱۱. پنجرهٔ سنجشِ خطا از زمانِ نصب شروع می‌شود ===');
{
  // یک هابِ ساختگی که فقط تبِ خطاهای منبع دارد
  const makeHub_ = rows => ({
    getSheetByName: name => name !== CFG.SRC_ERR_TAB ? null : {
      getLastRow: () => rows.length + 1,
      getRange: (r, c, n, w) => ({
        getValues: () => rows.slice(r - 2, r - 2 + n).map(x => x.slice(c - 1, c - 1 + w))
      })
    }
  });
  const INSTALLED_AT = Date.parse('2026-08-19T04:43:00Z');   // ۰۸:۴۳ دبی
  PropertiesService.getScriptProperties().setProperty(
    PK.SRCSCRIPT_INST,
    JSON.stringify({ photo: { version: '1.1', at: '2026-08-19 08:43', ms: INSTALLED_AT } }));

  const stamp = (iso) => Utilities.formatDate(new Date(iso), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  const rows = [
    // پیش از نصب — کدِ قبلی. سه بارِ یک فایل، یعنی طوفانِ همان زمان.
    [stamp('2026-08-19T00:58:00Z'), 'RESULT-PHOTO', 'Sheet1', 10, 'F-OLD', 'وضعیت ناموفق', "TypeError: Cannot read properties of undefined (reading 'parts')", ''],
    [stamp('2026-08-19T01:58:00Z'), 'RESULT-PHOTO', 'Sheet1', 11, 'F-OLD', 'وضعیت ناموفق', "TypeError: Cannot read properties of undefined (reading 'parts')", ''],
    [stamp('2026-08-19T02:58:00Z'), 'RESULT-PHOTO', 'Sheet1', 12, 'F-OLD', 'وضعیت ناموفق', "TypeError: Cannot read properties of undefined (reading 'parts')", ''],
    // پس از نصب — کدِ فعلی. مدل تحلیل نکرد؛ این باگ نیست.
    [stamp('2026-08-20T08:58:00Z'), 'RESULT-PHOTO', 'Sheet1', 13, 'F-NEW', 'ناتوانی در تحلیل', 'تصویر حاوی موضوع حساس است', '']
  ];
  const hub = makeHub_(rows);

  const d = sourceErrDigest_(hub);
  ok('۱۱.۱ پنجره از زمانِ نصب شناخته شد', !!d.since && d.since.at === '2026-08-19 08:43',
     d.since ? d.since.at : 'ندارد');
  ok('۱۱.۲ سه خطای پیش از نصب کنار گذاشته شد', d.before === 3, 'before=' + d.before);
  ok('۱۱.۳ فقط یک خطا در پنجره ماند', d.inWindow === 1, 'inWindow=' + d.inWindow);
  ok('۱۱.۴ و آن یکی «کد» شمرده نمی‌شود', !d.byKind.code, JSON.stringify(d.byKind));
  ok('۱۱.۵ طوفانِ گذشته دیگر گزارش نمی‌شود', d.storms.length === 0, d.storms.length + ' فایل');
  ok('۱۱.۶ ولی جمعِ کلِ تبِ خطاها همچنان دیده می‌شود', d.total === 4, 'total=' + d.total);

  // بی‌مُهرِ نصب، رفتار همان قبلی است: همه‌چیز شمرده می‌شود
  PropertiesService.getScriptProperties().deleteProperty(PK.SRCSCRIPT_INST);
  const d2 = sourceErrDigest_(makeHub_(rows));
  ok('۱۱.۷ بی‌مُهرِ نصب، پنجره‌ای در کار نیست', d2.since === null && d2.inWindow === 4,
     'inWindow=' + d2.inWindow);
  ok('۱۱.۸ و آن‌وقت طوفانِ قدیمی باز دیده می‌شود', d2.storms.length === 1);

  ok('۱۱.۹ پیش از نصب، مُهری نیست', Object.keys(srcInstalls_()).length === 0);

  // بازسازیِ مُهر از روی اثرانگشت (برای دو نصبی که پیش از این ساز و کار انجام شدند)
  const SHA_PHOTO = Object.keys(SRC_INSTALL_BACKFILL)[0];
  const n = srcBackfillStamps_({ scripts: [{ key: 'photo', sha256: SHA_PHOTO }] });
  ok('۱۱.۱۰ مُهر از روی اثرانگشتِ کدِ زنده بازسازی شد', n === 1);
  ok('۱۱.۱۱ و زمانش همان زمانِ نصبِ واقعی است',
     srcInstalls_().photo.at === SRC_INSTALL_BACKFILL[SHA_PHOTO].at, srcInstalls_().photo.at);
  ok('۱۱.۱۲ دوباره‌زدن مُهرِ تکراری نمی‌سازد',
     srcBackfillStamps_({ scripts: [{ key: 'photo', sha256: SHA_PHOTO }] }) === 0);
  ok('۱۱.۱۳ اثرانگشتِ ناشناس مُهر نمی‌گیرد',
     srcBackfillStamps_({ scripts: [{ key: 'video', sha256: 'یک اثرانگشتِ دیگر' }] }) === 0);
  PropertiesService.getScriptProperties().deleteProperty(PK.SRCSCRIPT_INST);
}


/* ۱۲. چرخهٔ خودکار: نصب → داوریِ روزِ بعد → برگشت اگر بدتر شد.

   این بخش کلِ چرخه را روی یک شیتِ خطای ساختگی می‌دوانَد. سه چیزی که باید
   ثابت شود، همان سه چیزی است که کاربر پرسید: نصب خبر می‌دهد، روزِ بعد سنجیده
   می‌شود که اشکالِ قبلی رفع شده یا نه، و همه‌چیز در شیت ثبت می‌شود.          */
console.log('\n=== ۱۲. چرخهٔ خودکارِ کدِ تحلیلگرها ===');
{
  const shaOf = t => require('crypto').createHash('sha256').update(t, 'utf8').digest('hex');
  const OLD = 'function a(){}\nfunction b(){}';
  const NEW = 'function a(){}\nfunction b(){/*اصلاح‌شده*/}';
  const RESOLVES = [{ id: 'parts', match: "reading '?parts'?", title: 'کرشِ parts' },
                    { id: 'storm', storm: true, title: 'طوفانِ تلاشِ دوباره' }];
  const MAN = { target: 'تحلیلگرِ عکس', version: '1.2', codeFile: 'analyzer.gs',
                sha256: shaOf(NEW), baseSha256: shaOf(OLD),
                requiredFunctions: ['function a', 'function b'], resolves: RESOLVES };

  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'تحلیلگرِ عکس', errSource: 'RESULT-PHOTO',
                          scriptId: 'S1', sheetId: SHEET }];
  CFG.SRC_VERDICT_HOURS = 24; CFG.SRC_ROLLBACK_MIN = 5; CFG.SRC_ROLLBACK_FACTOR = 1.5;
  props_().deleteProperty(PK.SRCSCRIPT_INST);
  props_().deleteProperty(PK.SRCSCRIPT_BLOCK);

  const HOUR = 3600000, NOW = new Date().getTime();
  let LIVE = OLD, sheetRows = [];
  const stampOf = ms => Utilities.formatDate(new Date(ms), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  const addErr = (msAgo, text, fileId) => sheetRows.push(
    [stampOf(NOW - msAgo), 'RESULT-PHOTO (عکس)', 'Sheet1', 1, fileId || 'F' + sheetRows.length,
     'وضعیت ناموفق', text, '']);
  const hub = {
    getSheetByName: name => name !== CFG.SRC_ERR_TAB ? null : {
      getLastRow: () => sheetRows.length + 1,
      getRange: (r, c, n, w) => ({
        getValues: () => sheetRows.slice(r - 2, r - 2 + n).map(x => x.slice(c - 1, c - 1 + w)) })
    }
  };

  const prev = global.__STUB;
  let puts = 0, lastPut = null;
  global.__STUB = function (url, body) {
    if (url.indexOf('manifest.json') !== -1) return { code: 200, text: JSON.stringify(MAN) };
    if (url.indexOf('analyzer.gs') !== -1)   return { code: 200, text: NEW };
    if (url.indexOf('script.googleapis.com') !== -1) {
      if (body && body.files) {
        puts++;
        lastPut = body.files.filter(f => f.type === 'SERVER_JS')[0].source;
        LIVE = lastPut;
        return { code: 200, json: {} };
      }
      return { code: 200, json: { parentId: SHEET,
               files: [{ name: 'Code', type: 'SERVER_JS', source: LIVE },
                       { name: 'appsscript', type: 'JSON', source: '{"x":1}' }] } };
    }
    return prev(url, body);
  };

  // ── ۱۲-الف: پیش از نصب، ۶ کرشِ parts در ۲۴ ساعتِ گذشته
  for (let i = 0; i < 6; i++) addErr((20 - i) * HOUR, "TypeError: Cannot read properties of undefined (reading 'parts')", 'F-OLD');
  let un = quiet(); let ins = srcAutoInstall_(hub); un();
  ok('۱۲.۱ نصبِ خودکار انجام شد', ins.length === 1 && ins[0].ok === true, JSON.stringify(ins));
  ok('۱۲.۲ کدِ تازه واقعاً نوشته شد', lastPut === NEW && puts === 1);
  const rec = srcInstalls_().photo;
  ok('۱۲.۳ عکسِ پیش از نصب گرفته شد', rec.baseline && rec.baseline.sig.parts === 6,
     JSON.stringify(rec.baseline && rec.baseline.sig));
  ok('۱۲.۴ نامِ پشتیبان ثبت شد', /پیش از نصب/.test(rec.backup || ''), rec.backup);
  ok('۱۲.۵ هنوز داوری نشده', rec.pending === true && rec.judged === false);

  // ── ۱۲-ب: هنوز ۲۴ ساعت نگذشته → داوری نکن
  un = quiet(); let v = srcVerdict_(hub); un();
  ok('۱۲.۶ پیش از موعد داوری نمی‌شود', v[0].state === 'زود است', JSON.stringify(v[0]));

  // ── ۱۲-ج: ۲۶ ساعت بعد، کرشِ parts دیگر نیامده → «خوب»
  srcInstalls_();  // فقط برای خواندن
  let all = srcInstalls_(); all.photo.ms = NOW - 26 * HOUR; all.photo.at = stampOf(all.photo.ms);
  props_().setProperty(PK.SRCSCRIPT_INST, JSON.stringify(all));
  sheetRows = [];
  for (let i = 0; i < 6; i++) addErr((50 - i) * HOUR, "TypeError: Cannot read properties of undefined (reading 'parts')", 'F-OLD');
  addErr(3 * HOUR, 'blockReason: OTHER — مدل تحلیل نکرد', 'F-NEW');   // مدل، نه کد
  un = quiet(); v = srcVerdict_(hub); un();
  ok('۱۲.۷ داوری انجام شد و نتیجه «خوب» است', v[0].state === 'خوب', JSON.stringify(v[0].sig));
  ok('۱۲.۸ نشانهٔ کرشِ parts برطرف اعلام شد',
     v[0].sig.find(x => x.id === 'parts').fixed === true &&
     v[0].sig.find(x => x.id === 'parts').before === 6);
  ok('۱۲.۹ خطای مدل به پای کد نوشته نشد', v[0].code === 0, 'code=' + v[0].code);
  ok('۱۲.۱۰ برگشتی در کار نبود', puts === 1 && LIVE === NEW);
  ok('۱۲.۱۱ دوباره داوری نمی‌شود', srcVerdict_(hub).length === 0);

  // ── ۱۲-د: حالا نصبی که اوضاع را بدتر می‌کند → باید برگردد
  props_().deleteProperty(PK.SRCSCRIPT_INST);
  LIVE = OLD; sheetRows = []; puts = 0;
  for (let i = 0; i < 2; i++) addErr((20 - i) * HOUR, "TypeError: Cannot read properties of undefined (reading 'parts')", 'F-OLD');
  un = quiet(); srcAutoInstall_(hub); un();
  ok('۱۲.۱۲ نصبِ دوم انجام شد', puts === 1 && LIVE === NEW);
  all = srcInstalls_(); all.photo.ms = NOW - 26 * HOUR;
  props_().setProperty(PK.SRCSCRIPT_INST, JSON.stringify(all));
  sheetRows = [];
  for (let i = 0; i < 2; i++) addErr((50 - i) * HOUR, "TypeError: Cannot read properties of undefined", 'F-OLD');
  for (let i = 0; i < 12; i++) addErr((20 - i) * HOUR, 'TypeError: خطای تازه پس از نصب', 'F' + i);
  un = quiet(); v = srcVerdict_(hub); un();
  ok('۱۲.۱۳ بدترشدن تشخیص داده شد و کد برگشت خورد', v[0].state === 'برگشت خورد',
     v[0].state + ' — ' + (v[0].why || ''));
  ok('۱۲.۱۴ کدِ قبلی دوباره نوشته شد', LIVE === OLD && puts === 2);
  ok('۱۲.۱۵ بستهٔ برگشت‌خورده مسدود شد', !!srcBlocked_()[MAN.sha256]);
  un = quiet(); const again = srcAutoInstall_(hub); un();
  ok('۱۲.۱۶ و شبِ بعد دوباره نصب نمی‌شود',
     puts === 2 && again[0].ok === false && /برگشت خورده/.test(again[0].why), JSON.stringify(again));

  global.__STUB = prev;
  props_().deleteProperty(PK.SRCSCRIPT_INST);
  props_().deleteProperty(PK.SRCSCRIPT_BLOCK);
}


/* ۱۳. هر رویداد باید هم خبر بدهد و هم در شیت بنشیند.

   بی این، چرخه بی‌صدا کار می‌کند: کد عوض می‌شود، شاید برگردد، و صاحبِ پروژه
   هیچ‌وقت نمی‌فهمد. پس اینجا خودِ کانال‌ها را می‌شماریم، نه نیتِ کد را.        */
console.log('\n=== ۱۳. اطلاع‌رسانی و ثبت در شیت ===');
{
  const shaOf = t => require('crypto').createHash('sha256').update(t, 'utf8').digest('hex');
  const OLD = 'function a(){}\nfunction b(){}';
  const NEW = 'function a(){}\nfunction b(){/*نو*/}';
  const MAN = { target: 'تحلیلگرِ عکس', version: '1.3', codeFile: 'analyzer.gs',
                sha256: shaOf(NEW), baseSha256: shaOf(OLD),
                requiredFunctions: ['function a'],
                resolves: [{ id: 'parts', match: "reading '?parts'?", title: 'کرشِ parts' }] };
  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'تحلیلگرِ عکس', errSource: 'RESULT-PHOTO',
                          scriptId: 'S1', sheetId: SHEET }];
  props_().deleteProperty(PK.SRCSCRIPT_INST);
  props_().deleteProperty(PK.SRCSCRIPT_BLOCK);

  const HOUR = 3600000, NOW = new Date().getTime();
  let LIVE = OLD, rows = [];
  const stampOf = ms => Utilities.formatDate(new Date(ms), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  const hub = {
    getSheetByName: name => name !== CFG.SRC_ERR_TAB ? null : {
      getLastRow: () => rows.length + 1,
      getRange: (r, c, n, w) => ({
        getValues: () => rows.slice(r - 2, r - 2 + n).map(x => x.slice(c - 1, c - 1 + w)) })
    }
  };

  // شنودِ کانال‌ها
  const tg = [], mail = [], sheet = [];
  const realTg = global.tgSend_, realFind = global.logSelfFinding_, realMail = global.MailApp;
  global.tgSend_ = m => { tg.push(String(m)); return true; };
  global.logSelfFinding_ = (h, f) => { sheet.push(f); return true; };
  global.MailApp = { sendEmail: o => { mail.push(o); } };

  const prev = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('manifest.json') !== -1) return { code: 200, text: JSON.stringify(MAN) };
    if (url.indexOf('analyzer.gs') !== -1)   return { code: 200, text: NEW };
    if (url.indexOf('script.googleapis.com') !== -1) {
      if (body && body.files) { LIVE = body.files.filter(f => f.type === 'SERVER_JS')[0].source;
                                return { code: 200, json: {} }; }
      return { code: 200, json: { parentId: SHEET,
               files: [{ name: 'Code', type: 'SERVER_JS', source: LIVE },
                       { name: 'appsscript', type: 'JSON', source: '{}' }] } };
    }
    return prev(url, body);
  };

  let un = quiet(); srcAutoInstall_(hub); un();
  ok('۱۳.۱ نصب پیامِ تلگرام فرستاد', tg.length === 1 && /نصب شد/.test(tg[0]));
  ok('۱۳.۲ نصب ایمیل فرستاد', mail.length === 1 && /نصب شد/.test(mail[0].subject), mail[0] && mail[0].subject);
  ok('۱۳.۳ پیام می‌گوید داوری در راه است', /داوری/.test(tg[0]));
  ok('۱۳.۴ نصب در شیت ثبت شد',
     sheet.some(f => /رسید/.test(f.title) && f.owner === ROWNER_SRCCODE),
     sheet.map(f => f.title).join(' | '));

  // داوریِ خوب
  const all = srcInstalls_(); all.photo.ms = NOW - 26 * HOUR;
  props_().setProperty(PK.SRCSCRIPT_INST, JSON.stringify(all));
  rows = [[stampOf(NOW - 2 * HOUR), 'RESULT-PHOTO (عکس)', 'Sheet1', 1, 'F1',
           'ناتوانی در تحلیل', 'موضوع حساس', '']];
  un = quiet(); const v = srcVerdict_(hub); un();
  ok('۱۳.۵ داوری هم خبر داد', tg.length === 2 && /نتیجهٔ نصب/.test(tg[1]), tg[1]);
  ok('۱۳.۶ داوری هم ایمیل شد', mail.length === 2 && /نتیجهٔ نصب/.test(mail[1].subject));
  ok('۱۳.۷ متنِ خبر می‌گوید کدام اشکال برطرف شد', /✅ کرشِ parts/.test(tg[1]), tg[1]);
  ok('۱۳.۸ داوری در شیت ثبت شد',
     sheet.some(f => /داوریِ نصب/.test(f.title) && f.owner === ROWNER_SRCCODE),
     sheet.map(f => f.title).join(' | '));
  ok('۱۳.۹ هیچ ردیفی مسئولش «کد» نیست (وگرنه به نصبِ خودِ موتور می‌رفت)',
     sheet.every(f => String(f.owner).indexOf('کد') === -1));
  ok('۱۳.۱۰ داوری نتیجه را هم برگرداند', v.length === 1 && v[0].state === 'خوب');

  global.__STUB = prev; global.tgSend_ = realTg;
  global.logSelfFinding_ = realFind; global.MailApp = realMail;
  props_().deleteProperty(PK.SRCSCRIPT_INST);
}


/* ۱۴. همان وضعیتی که واقعاً پیش آمد.

   کدِ تازه در همان دورِ شبانه نصب می‌شود که خودش تمام شده، پس چرخه‌ای که امشب
   رسیده تا فردا شب اجرا نمی‌شود. صاحبِ پروژه منتظرِ پیامی می‌ماند که قرار نبوده
   بیاید. دکمهٔ «همین حالا بدوان» همان فاصله را پر می‌کند — و این آزمون روی یک
   مُهرِ بازسازی‌شده (بی‌عکسِ پیش از نصب) می‌دواندش، چون دقیقاً همان چیزی است که
   در تولید هست.                                                              */
console.log('\n=== ۱۴. دواندنِ چرخه با دست، روی مُهرِ بازسازی‌شده ===');
{
  const shaOf = t => require('crypto').createHash('sha256').update(t, 'utf8').digest('hex');
  const LIVEJS = 'function a(){}\nfunction b(){}';
  const MAN = { target: 'تحلیلگرِ عکس', version: '1.1', codeFile: 'analyzer.gs',
                sha256: shaOf(LIVEJS), baseSha256: shaOf('کدِ قدیمی'),
                requiredFunctions: ['function a'],
                resolves: [{ id: 'parts', match: "reading '?parts'?", title: 'کرشِ parts' },
                           { id: 'storm', storm: true, title: 'طوفانِ تلاشِ دوباره' }] };
  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'تحلیلگرِ عکس', errSource: 'RESULT-PHOTO',
                          scriptId: 'S1', sheetId: SHEET }];
  const HOUR = 3600000, NOW = new Date().getTime();
  const stampOf = ms => Utilities.formatDate(new Date(ms), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');

  // مُهرِ بازسازی‌شده: زمان دارد، ولی نه عکسِ پیش از نصب و نه نامِ پشتیبان
  props_().setProperty(PK.SRCSCRIPT_INST, JSON.stringify({
    photo: { version: '1.1', sha: MAN.sha256, at: stampOf(NOW - 48 * HOUR),
             ms: NOW - 48 * HOUR, backfilled: true } }));
  props_().deleteProperty(PK.SRCSCRIPT_BLOCK);

  let rows = [
    [stampOf(NOW - 60 * HOUR), 'RESULT-PHOTO (عکس)', 'Sheet1', 1, 'F1', 'وضعیت ناموفق',
     "TypeError: Cannot read properties of undefined (reading 'parts')", ''],
    [stampOf(NOW - 22 * HOUR), 'RESULT-PHOTO (عکس)', 'Sheet1', 2, 'F2', 'ناتوانی در تحلیل',
     'تصویر حاوی موضوع حساس سیاسی است', ''],
    [stampOf(NOW - 5 * HOUR), 'RESULT-VIDEO', 'Audio Analysis', 3, 'F3', 'خطای اجرا',
     'TypeError: مالِ اسکریپتِ دیگری', '']
  ];
  const hub = { getSheetByName: n => n !== CFG.SRC_ERR_TAB ? null : {
      getLastRow: () => rows.length + 1,
      getRange: (r, c, k, w) => ({ getValues: () =>
        rows.slice(r - 2, r - 2 + k).map(x => x.slice(c - 1, c - 1 + w)) }) } };

  const prev = global.__STUB;
  let puts = 0;
  global.__STUB = function (url, body) {
    if (url.indexOf('manifest.json') !== -1) return { code: 200, text: JSON.stringify(MAN) };
    if (url.indexOf('analyzer.gs') !== -1)   return { code: 200, text: LIVEJS };
    if (url.indexOf('script.googleapis.com') !== -1) {
      if (body && body.files) { puts++; return { code: 200, json: {} }; }
      return { code: 200, json: { parentId: SHEET,
               files: [{ name: 'Code', type: 'SERVER_JS', source: LIVEJS }] } };
    }
    return prev(url, body);
  };
  const realHub = global.getHub_;
  global.getHub_ = () => hub;

  let un = quiet(); const r = runSourceCycleNow(); un();
  const v = r.verdicts[0];
  ok('۱۴.۱ داوری همین حالا انجام شد', !!v && v.state !== 'زود است', JSON.stringify(v && v.state));
  ok('۱۴.۲ کرشِ parts برطرف اعلام شد (پیش از نصب بوده، پس از آن نه)',
     v.sig.find(x => x.id === 'parts').fixed === true);
  ok('۱۴.۳ بی‌عکسِ پیش از نصب، «بدتر شد» ادعا نمی‌شود',
     v.rateWas === null && v.state !== 'برگشت خورد', 'rateWas=' + v.rateWas);
  ok('۱۴.۴ خطای شیتِ دیگر به پای این تحلیلگر نوشته نشد', v.rows === 1, 'rows=' + v.rows);
  ok('۱۴.۵ ردِ مدل «کدی» حساب نشد', v.code === 0, 'code=' + v.code);
  ok('۱۴.۶ نصبِ تازه‌ای لازم نبود و چیزی نوشته نشد',
     puts === 0 && r.installs.every(x => !x.ok));
  ok('۱۴.۸ داوریِ بی‌ترازو خودش را بی‌ترازو اعلام می‌کند',
     v.scaled === false, 'scaled=' + v.scaled);

  // ردِ مدل با توضیحِ فارسی دیگر «دسته‌بندی‌نشده» نیست
  const k = srcErrKind_('تصویر حاوی موضوع حساس سیاسی است', 'ناتوانی در تحلیل');
  ok('۱۴.۷ ردِ مدل با توضیحِ فارسی هم شناخته می‌شود', k.kind === 'model', k.label);

  global.__STUB = prev; global.getHub_ = realHub;
  props_().deleteProperty(PK.SRCSCRIPT_INST);
}


/* ۱۵. آنچه در شیت می‌ماند باید به تلگرام و ایمیل هم برسد.

   پاک‌سازیِ ردیف‌های خطا داخلِ خودِ تحلیلگرها انجام می‌شود و آن اسکریپت‌ها هیچ
   راهی برای خبردادن ندارند. صاحبِ پروژه هم به شیت نگاه نمی‌کند. پس اگر موتور
   خودش تفاوتِ شمارش را نگوید، بزرگ‌ترین اثرِ این چرخه نامرئی می‌ماند.        */
console.log('\n=== ۱۵. گزارشِ شبانه به تلگرام و ایمیل ===');
{
  CFG.SOURCE_SCRIPTS = [{ key: 'photo', name: 'تحلیلگرِ عکس', errSource: 'RESULT-PHOTO',
                          scriptId: 'S1', sheetId: SHEET }];
  props_().deleteProperty(PK.SRCSCRIPT_SNAP);
  const HOUR = 3600000, NOW = new Date().getTime();
  const stampOf = ms => Utilities.formatDate(new Date(ms), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  let rows = [];
  const add = (n, text) => { for (let i = 0; i < n; i++)
    rows.push([stampOf(NOW - (i + 1) * HOUR), 'RESULT-PHOTO (عکس)', 'Sheet1', i, 'F' + i,
               'وضعیت ناموفق', text || 'ERROR: چیزی', '']); };
  const hub = { getSheetByName: n => n !== CFG.SRC_ERR_TAB ? null : {
      getLastRow: () => rows.length + 1,
      getRange: (r, c, k, w) => ({ getValues: () =>
        rows.slice(r - 2, r - 2 + k).map(x => x.slice(c - 1, c - 1 + w)) }) } };

  const tg = [], mail = [];
  const realTg = global.tgSend_, realMail = global.MailApp;
  global.tgSend_ = m => { tg.push(String(m)); return true; };
  global.MailApp = { sendEmail: o => { mail.push(o); } };

  add(300);
  let un = quiet(); let d = srcNightlyDigest_(hub, null); un();
  ok('۱۵.۱ نخستین شمارش پیام نمی‌فرستد (چیزی برای مقایسه نیست)',
     d.sent === false && tg.length === 0, JSON.stringify(d.snapshot));

  // شبِ بعد: پاک‌سازی ۲۴۰ ردیف را برداشته
  rows = []; add(60);
  un = quiet(); d = srcNightlyDigest_(hub, null); un();
  ok('۱۵.۲ کاهشِ ردیف‌ها خبر داده شد', d.sent === true && tg.length === 1);
  ok('۱۵.۳ و عددِ درست را می‌گوید', /300 → 60/.test(tg[0]) && /240 ردیف حذف شد/.test(tg[0]), tg[0]);
  ok('۱۵.۴ ایمیل هم رفت', mail.length === 1 && /گزارشِ شبانه/.test(mail[0].subject));
  ok('۱۵.۵ می‌گوید فایل‌ها دوباره در صف‌اند', /دوباره در صفِ تحلیل/.test(tg[0]));

  // شبِ سوم: هیچ تغییری — نباید پیام برود
  un = quiet(); d = srcNightlyDigest_(hub, null); un();
  ok('۱۵.۶ شبِ بی‌تغییر پیام نمی‌فرستد', d.sent === false && tg.length === 1);

  // ردیف‌های «نهایی» شمرده و گزارش می‌شوند
  rows = []; add(50); add(4, 'ERROR: TypeError ⟪نهایی⟫');
  un = quiet(); d = srcNightlyDigest_(hub, null); un();
  ok('۱۵.۷ ردیف‌های «نهایی» جدا شمرده می‌شوند',
     d.snapshot.photo.final === 4, JSON.stringify(d.snapshot.photo));
  ok('۱۵.۸ و در پیام توضیح داده می‌شوند', /برچسبِ «نهایی»/.test(tg[tg.length - 1]));

  // یافته‌های ثبت‌شده در شیت هم بیرون می‌آیند
  rows = []; add(54);
  un = quiet(); d = srcNightlyDigest_(hub, { logged: 2, errors: { samples: [
    { kind: 'code', label: 'باگِ کد — دسترسی به فیلدِ نبوده' } ] } }); un();
  ok('۱۵.۹ یافته‌های تبِ گزارش‌ها هم به تلگرام می‌رسند',
     /۲ یافتهٔ تازه|2 یافتهٔ تازه/.test(tg[tg.length - 1]) &&
     /باگِ کد/.test(tg[tg.length - 1]), tg[tg.length - 1]);

  global.tgSend_ = realTg; global.MailApp = realMail;
  props_().deleteProperty(PK.SRCSCRIPT_SNAP);
}


/* ۱۶. دستهٔ سوم: وقتی خودِ سازوکار ایراد دارد، اصلاحِ *موتور* خواسته شود.

   تا اینجا هر یافته یا «کدِ تحلیلگر» بود یا «موتور در کارِ پادکست». حالتی که
   چند بار واقعاً پیش آمد هیچ‌کدام نبود: اثرانگشت را موتور اشتباه حساب می‌کرد و
   هر نصبی متوقف می‌شد. آن ردیف باید به صفِ «نیازمند تعویض کد» برود، وگرنه
   کسی سراغش نمی‌رود.                                                          */
console.log('\n=== ۱۶. یافته‌ای که اصلاحِ خودِ موتور را می‌خواهد ===');
{
  const shaOf = t => require('crypto').createHash('sha256').update(t, 'utf8').digest('hex');
  const LIVE = 'function a(){}';
  const MAN = { target: 'ت', version: '2.0', codeFile: 'analyzer.gs',
                sha256: shaOf('بستهٔ تازه'), baseSha256: shaOf('چیزِ دیگری'),
                requiredFunctions: ['function a'], resolves: [] };
  CFG.SOURCE_SCRIPTS = [
    { key: 'photo', name: 'تحلیلگرِ عکس', errSource: 'RESULT-PHOTO', scriptId: 'S1', sheetId: SHEET },
    { key: 'video', name: 'تحلیلگرِ ویدیو', errSource: 'RESULT (ویدیو)', scriptId: 'S2', sheetId: SHEET }];
  props_().deleteProperty(PK.SRCSCRIPT_HEALTH);
  props_().deleteProperty(PK.SRCSCRIPT_BLOCK);

  const sheet = [], tg = [];
  const realFind = global.logSelfFinding_, realTg = global.tgSend_, realMail = global.MailApp;
  global.logSelfFinding_ = (h, f) => { sheet.push(f); };
  global.tgSend_ = m => { tg.push(String(m)); };
  global.MailApp = { sendEmail: () => {} };

  const prev = global.__STUB;
  global.__STUB = function (url, body) {
    if (url.indexOf('manifest.json') !== -1) return { code: 200, text: JSON.stringify(MAN) };
    if (url.indexOf('analyzer.gs') !== -1)   return { code: 200, text: 'بستهٔ تازه' };
    if (url.indexOf('script.googleapis.com') !== -1)
      return { code: 200, json: { parentId: SHEET,
               files: [{ name: 'Code', type: 'SERVER_JS', source: LIVE }] } };
    return prev(url, body);
  };
  const hub = { getSheetByName: () => null };

  // شبِ اول: هر دو «دستی عوض شده» — ولی یک شب دلیلِ کافی نیست
  let un = quiet(); let h = srcCycleHealth_(hub, { verdicts: [], installs: [] }); un();
  ok('۱۶.۱ یک شبِ بد چیزی را راه نمی‌اندازد', h.raised.length === 0, JSON.stringify(h.state));

  // شبِ دوم: همان وضع → حالا باید اصلاحِ موتور خواسته شود
  un = quiet(); h = srcCycleHealth_(hub, { verdicts: [], installs: [] }); un();
  ok('۱۶.۲ دو شبِ پیاپی، یافتهٔ سازوکار ساخته شد',
     h.raised.indexOf('basesha-all') !== -1, JSON.stringify(h.raised));

  const f = sheet.find(x => x.key === 'engsrc-basesha-all');
  ok('۱۶.۳ در شیت ثبت شد', !!f);
  ok('۱۶.۴ مسئولش «کدِ موتور» است، نه تحلیلگر', f.owner === ROWNER_ENGSRC, f.owner);
  ok('۱۶.۵ و چون کلمهٔ «کد» دارد، به صفِ «نیازمند تعویض کد» می‌رود',
     reportRow_({}, f, 0, 'fp')[RC.STATUS - 1] === RST.NEEDS_CODE,
     reportRow_({}, f, 0, 'fp')[RC.STATUS - 1]);
  ok('۱۶.۶ دستورش می‌گوید در کدِ موتور چه چیزی را نگاه کند',
     /srcJoinJs_/.test(f.instruction) && /بخشِ ۲۲/.test(f.instruction), f.instruction);
  ok('۱۶.۷ هیچ متنی از کدِ تحلیلگر در ردیف نیامده',
     f.detail.indexOf(LIVE) === -1 && f.detail.indexOf('بستهٔ تازه') === -1);
  ok('۱۶.۸ به تلگرام هم رفت', tg.some(m => /سازوکارِ کدِ منبع/.test(m)));
  ok('۱۶.۹ شمارنده پس از اعلام صفر شد (هر شب تکرار نمی‌شود)',
     Number(h.state.tampered || 0) === 0, JSON.stringify(h.state));

  // اصلاحِ ناکافی: دو داوریِ پیاپی با نشانهٔ برطرف‌نشده
  const withUnfixed = { verdicts: [{ key: 'photo', sig: [{ id: 'parts', fixed: false }] }], installs: [] };
  un = quiet(); srcCycleHealth_(hub, withUnfixed);
  h = srcCycleHealth_(hub, withUnfixed); un();
  ok('۱۶.۱۰ نشانهٔ برطرف‌نشده در دو نسخهٔ پیاپی هم اصلاحِ موتور را می‌خواهد',
     h.raised.indexOf('fix-insufficient') !== -1, JSON.stringify(h.raised));
  const f2 = sheet.find(x => x.key === 'engsrc-fix-insufficient');
  ok('۱۶.۱۱ و آن هم به همان صف می‌رود', f2 && f2.owner === ROWNER_ENGSRC);

  // وضعِ سالم: شمارنده‌ها صفر می‌مانند
  MAN.baseSha256 = shaOf(LIVE);
  un = quiet(); h = srcCycleHealth_(hub, { verdicts: [], installs: [] }); un();
  ok('۱۶.۱۲ در وضعِ سالم چیزی ساخته نمی‌شود',
     h.raised.length === 0 && Number(h.state.tampered || 0) === 0);

  global.__STUB = prev; global.logSelfFinding_ = realFind;
  global.tgSend_ = realTg; global.MailApp = realMail;
  props_().deleteProperty(PK.SRCSCRIPT_HEALTH);
}

console.log('\n✅ هر ' + pass + ' آزمونِ وارسیِ اسکریپت‌های منبع گذشت.');
