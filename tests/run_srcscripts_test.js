/* وارسیِ اسکریپت‌های منبع (بخشِ ۲۲) — تشخیص، بدونِ هیچ نصبی. */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs',
  '21_SelfUpdate.gs','22_SourceScripts.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
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
  global.srcErrorSummary_ = () => ({ total: 5, recent: rec });
  const d = sourceErrDigest_(null);
  ok('۶.۱ فایلِ گیرکرده پیدا شد', d.storms.length === 1 && d.storms[0].fileId === 'F-STUCK',
     JSON.stringify(d.storms));
  ok('۶.۲ شمارشِ تکرار درست است', d.storms[0].times === 4);
  ok('۶.۳ دسته‌ها تفکیک شدند', d.byKind.data === 4 && d.byKind.code === 1,
     JSON.stringify(d.byKind));
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

console.log('\n✅ هر ' + pass + ' آزمونِ وارسیِ اسکریپت‌های منبع گذشت.');
