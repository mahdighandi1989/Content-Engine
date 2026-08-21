/* اصلاح‌های تحلیلگرهای منبع (sources/) — به‌ویژه حذفِ امنِ ردیف.
   این آزمون روی دادهٔ شیت کار می‌کند، پس سخت‌گیرانه است: هیچ ردیفِ دارای
   تحلیل نباید حذف شود، و هیچ‌جا نباید کلِ شیت پاک شود. */
require('./lib/root.js');
const fs = require('fs');

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

const SRC = {
  photo: fs.readFileSync('sources/photo/analyzer.gs', 'utf8'),
  video: fs.readFileSync('sources/video/analyzer.gs', 'utf8')
};

console.log('\n=== ۱. هیچ‌کدام کلِ شیت را بی‌نگهبان پاک نمی‌کنند ===');
for (const k of ['photo', 'video']) {
  ok(`۱.${k} — clearContents روی شیتِ اصلی نیست`, SRC[k].indexOf('clearContents()') === -1);
  // کامنت‌ها را کنار بگذار — وگرنه توضیحِ خودِ نگهبان هم شمرده می‌شود
  const code = SRC[k].split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  const clr = (code.match(/sheet\.clear\(\)/g) || []).length;
  ok(`۱.${k} — sheet.clear فقط یک بار و پشتِ نگهبان`,
     clr === 1 && SRC[k].indexOf('نگهبانِ داده') !== -1, clr + ' فراخوانِ واقعی');
  ok(`۱.${k} — هیچ تابعِ تکراری نمانده (تعریفِ دوم برنده نشود)`,
     (() => { const n = (code.match(/^function [A-Za-z_$][\w$]*/gm) || [])
                .map(x => x.replace('function ',''));
              return new Set(n).size === n.length; })());
}

console.log('\n=== ۲. رفتارِ واقعیِ deleteErrorRows_ ===');
// شیتِ ساختگی با ترکیبِ واقعی: موفق، خطای بی‌محتوا، و خطای دارای محتوا
function makeSheet(rows) {
  const d = rows.map(r => r.slice());
  return {
    _d: d, deleted: [], cleared: 0,
    getLastRow: () => d.length,
    getLastColumn: () => d[0].length,
    getRange: (r, c, nr, nc) => ({ getValues: () => d.slice(r - 1, r - 1 + nr).map(x => x.slice(c - 1, c - 1 + nc)) }),
    deleteRows: function (start, n) { this.deleted.push([start, n]); d.splice(start - 1, n); },
    clearContents: function () { this.cleared++; }
  };
}
const STATUS = 15, ANALYSIS = [5, 6, 7, 8, 9, 10, 11, 12, 13];
const row = (id, status, analysis) => {
  const r = new Array(16).fill('');
  r[1] = id; r[STATUS] = status;
  if (analysis) ANALYSIS.forEach(i => { r[i] = '{"x":1}'; });
  return r;
};
const sheet = makeSheet([
  new Array(16).fill('H'),
  row('OK-1', 'SUCCESS', true),
  row('ERR-empty-1', 'ERROR: blocked', false),
  row('ERR-empty-2', 'ERROR: 400 File', false),
  row('OK-2', 'SUCCESS', true),
  row('ERR-with-data', 'ERROR: late failure', true),   // ← تحلیل دارد
  row('ERR-empty-3', 'ERROR: parts', false)
]);
global.SpreadsheetApp = { openByUrl: () => ({ getActiveSheet: () => sheet }) };
global.Logger = { log: () => {} };
global.PROCESSED_FILE_IDS_CACHE = null; global.CACHE_TIMESTAMP = null;

// فقط تابعِ کمکی را بارگذاری کن.
// پایانِ خط را به LF یکدست می‌کنیم چون تحلیلگرِ عکس CRLF است و بریدنِ متن
// با '\n}' در آن جواب نمی‌دهد. این یکدست‌سازی فقط برای همین eval است و
// فایلِ روی دیسک دست نمی‌خورد.
const flat = SRC.photo.replace(/\r\n/g, '\n');
const helper = flat.slice(flat.indexOf('function deleteErrorRows_'));
const endIdx = helper.indexOf('\n}\n') + 2;
ok('۲.۰ تابعِ کمکی درست بریده شد', endIdx > 2 && helper.slice(0, endIdx).trim().endsWith('}'));
eval(helper.slice(0, endIdx));

const res = deleteErrorRows_('u', STATUS, ANALYSIS);
const left = sheet._d.slice(1).map(r => r[1]);
console.log('    مانده:', JSON.stringify(left));
ok('۲.۱ سه ردیفِ خطای بی‌محتوا حذف شدند', res.removed === 3, 'removed=' + res.removed);
ok('۲.۲ ردیفِ خطای دارایِ تحلیل دست نخورد',
   left.indexOf('ERR-with-data') !== -1, 'skipped=' + res.skipped);
ok('۲.۳ هر دو ردیفِ موفق سرِ جایشان', left.indexOf('OK-1') === 0 && left.indexOf('OK-2') === 1);
ok('۲.۴ ترتیب حفظ شد (بی جای خالی)', JSON.stringify(left) === JSON.stringify(['OK-1','OK-2','ERR-with-data']));
ok('۲.۵ هرگز clearContents صدا نشد', sheet.cleared === 0);
ok('۲.۶ حذف از پایین به بالا انجام شد',
   sheet.deleted.every((d, i, a) => i === 0 || a[i-1][0] > d[0]), JSON.stringify(sheet.deleted));
ok('۲.۷ ردیف‌های پشت‌سرهم یک‌جا حذف شدند', sheet.deleted.some(d => d[1] === 2),
   JSON.stringify(sheet.deleted));

console.log('\n=== ۳. حالتِ «چیزی برای حذف نیست» ===');
const s2 = makeSheet([new Array(16).fill('H'), row('OK', 'SUCCESS', true)]);
global.SpreadsheetApp = { openByUrl: () => ({ getActiveSheet: () => s2 }) };
const r2 = deleteErrorRows_('u', STATUS, ANALYSIS);
ok('۳.۱ هیچ حذفی نشد', r2.removed === 0 && s2.deleted.length === 0);
ok('۳.۲ و شیت دست‌نخورده ماند', s2._d.length === 2 && s2.cleared === 0);

console.log('\n=== ۴. نگهبانِ content.parts در هر دو ===');
for (const k of ['photo', 'video']) {
  ok(`۴.${k} — پیش از خواندنِ parts وارسی می‌شود`,
     SRC[k].indexOf('!cand.content || !cand.content.parts') !== -1);
  ok(`۴.${k} — علتِ رد (finishReason) گزارش می‌شود`,
     SRC[k].indexOf('finishReason') !== -1);
}

console.log('\n=== ۵. ترتیب: ثبت پیش از انتقال ===');
for (const k of ['photo', 'video']) {
  const w = SRC[k].indexOf('writeAnalysisToSheet(sheet, analysisResult, "SUCCESS")');
  const m = SRC[k].indexOf('moveFileToArchive', w - 900);
  ok(`۵.${k} — writeAnalysisToSheet پیش از moveFileToArchive`, w !== -1 && w < SRC[k].indexOf('moveFileToArchive', w));
}

console.log('\n=== ۶. هر دو یک منطقِ «پردازش‌شده» دارند ===');
for (const k of ['photo', 'video']) {
  ok(`۶.${k} — ردیفِ خطا از فهرست بیرون گذاشته نمی‌شود`,
     SRC[k].indexOf("rowStatus.indexOf('ERROR') !== 0") === -1);
}

console.log('\n=== ۷. ویدیو: توقفِ اضطراری و تعریفِ یکتا ===');
ok('۷.۱ توقفِ اضطراریِ کلید اضافه شد', SRC.video.indexOf('توقف اضطراری') !== -1);
ok('۷.۲ فقط یک writeErrorToSheet مانده',
   (SRC.video.match(/^function writeErrorToSheet/gm) || []).length === 1);
// شمارشِ سطرهای آرایه، نه ویرگول‌ها — چون '[]' و '{}' داخلِ رشته‌ها گمراه می‌کنند
const body = SRC.video.slice(SRC.video.indexOf('function writeErrorToSheet'));
const arrTxt = body.slice(body.indexOf('const errorRow = ['), body.indexOf('\n  ];'));
const entries = arrTxt.split('\n').slice(1).filter(l => l.trim() && !l.trim().startsWith('//'));
ok('۷.۳ و ۱۸ ستون می‌نویسد (نه ۱۳)', entries.length === 18, entries.length + ' ستون');
ok('۷.۴ «ERROR» در آخرین ستون (وضعیت) می‌نشیند',
   entries[entries.length - 1].indexOf('ERROR') !== -1, entries[entries.length - 1].trim());


/* ۸. بیانیهٔ هر بسته باید دقیقاً همان فایلی را توصیف کند که کنارش نشسته.

   این بخش یک باگِ واقعیِ تولید را برای همیشه می‌بندد: نسخهٔ نخستِ خطِ مبنا با
   یک «\n» اضافه در ابتدای فایل ذخیره شده بود (باقی‌ماندهٔ همان روشِ قدیمیِ
   حساب‌کردنِ اثرانگشت). فایل برای چشمِ آدم درست به نظر می‌رسید، اما اثرانگشتش
   با کدِ زندهٔ اسکریپت یک بایت فرق داشت — و srcVerify_ هر نصبی را با پیامِ
   «دستی عوض شده» متوقف می‌کرد. یعنی سدِ ایمنی کار می‌کرد ولی روی خطای خودمان.  */
console.log('\n=== ۸. بیانیهٔ بسته با فایل می‌خوانَد ===');
const crypto = require('crypto');
for (const k of ['photo', 'video']) {
  const bytes = fs.readFileSync(`sources/${k}/analyzer.gs`);
  const man = JSON.parse(fs.readFileSync(`sources/${k}/manifest.json`, 'utf8'));

  ok(`۸.${k}.۱ فایل با خطِ خالی شروع نمی‌شود`, bytes[0] !== 0x0a && bytes[0] !== 0x0d,
     'بایتِ نخست = ' + bytes[0]);
  ok(`۸.${k}.۲ sha256 بیانیه همان اثرانگشتِ فایل است`,
     crypto.createHash('sha256').update(bytes).digest('hex') === man.sha256,
     man.sha256.slice(0, 12));
  ok(`۸.${k}.۳ baseSha256 با sha256 یکی نیست`, man.baseSha256 !== man.sha256);
  ok(`۸.${k}.۴ هر تابعِ ضروری واقعاً در فایل هست`,
     (man.requiredFunctions || []).length > 0 &&
     (man.requiredFunctions || []).every(fn => bytes.toString('utf8').indexOf(fn) !== -1),
     (man.requiredFunctions || []).length + ' تابع');
  ok(`۸.${k}.۵ شناسهٔ اسکریپت و شیت ثبت شده`, !!man.scriptId && !!man.sheetId);
}


/* ۹. پاک‌سازیِ خودکار — و ترمزی که جلوی طوفانِ تلاشِ دوباره را می‌گیرد.

   حذفِ خودکارِ ردیفِ خطا فایل را دوباره به صف برمی‌گرداند. بی ترمز، فایلی که
   همیشه می‌شکند هر روز حذف/تحلیل/شکست می‌شود و همان ۲۳۲-خطا-از-۲۳۶ برمی‌گردد.
   اینجا خودِ حلقه را می‌دوانیم تا ببینیم واقعاً می‌ایستد یا نه.               */
console.log('\n=== ۹. پاک‌سازیِ خودکار و سقفِ تلاش ===');
for (const k of ['photo', 'video']) {
  const STATUS = k === 'photo' ? 15 : 17;
  const ANALYSIS = k === 'photo' ? [5,6,7,8,9,10,11,12,13] : [5,6,7,8,9,10,11,12,13,14,15,16];
  const WIDTH = STATUS + 1;

  // شیتِ ساختگی
  let rows = [];
  const mkRow = (id, status, analysis) => {
    const r = new Array(WIDTH).fill('');
    r[0] = new Date(); r[1] = id; r[STATUS] = status;
    if (analysis) r[ANALYSIS[0]] = analysis;
    return r;
  };
  const sheet = {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => WIDTH,
    getRange: (r, c, n, w) => ({
      getValues: () => {
        const all = [new Array(WIDTH).fill('H')].concat(rows);
        return all.slice(r - 1, r - 1 + (n || 1)).map(x => x.slice(c - 1, c - 1 + (w || 1)));
      },
      setValue: (v) => { rows[r - 2][c - 1] = v; }
    }),
    deleteRows: (start, count) => { rows.splice(start - 2, count); }
  };

  const PROPS = {};
  const scope = {
    SHEET_URL: 'u', STATUS_COLUMN_INDEX: STATUS, ANALYSIS_COLUMNS_TO_VERIFY: ANALYSIS,
    PROCESSED_FILE_IDS_CACHE: null, CACHE_TIMESTAMP: null,
    SpreadsheetApp: { openByUrl: () => ({ getActiveSheet: () => sheet }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: n => (n in PROPS ? PROPS[n] : null),
      setProperty: (n, v) => { PROPS[n] = String(v); },
      deleteProperty: n => { delete PROPS[n]; } }) },
    Utilities: { formatDate: (d, tz, f) => '2026-08-21' },
    Logger: { log: () => {} }
  };

  // فقط بلوکِ پاک‌سازی را از فایلِ واقعی برمی‌داریم و در همین صحنه می‌دوانیم
  const SRCK = SRC[k];
  const from = SRCK.indexOf('const RETRY_FILE_ID_INDEX');
  const to = SRCK.indexOf('\n}', SRCK.indexOf('function autoCleanErrorRows_')) + 2;
  ok(`۹.${k}.۰ بلوکِ پاک‌سازی در فایل هست`, from !== -1 && to > from);
  const code = SRCK.slice(from, to);
  const run = new Function(...Object.keys(scope),
    code + '\n; return { autoCleanErrorRows_, errorIsPermanent_, retryLoad_ };');
  const api = run(...Object.values(scope));

  ok(`۹.${k}.۱ ردِ مدل «دائمی» شناخته می‌شود`,
     api.errorIsPermanent_('ERROR: blockReason OTHER') === true);
  ok(`۹.${k}.۲ کرشِ کد «دائمی» نیست`,
     api.errorIsPermanent_("ERROR: TypeError: reading 'parts'") === false);

  // صحنه: ۱ ردیفِ سالم، ۱ خطای دارای تحلیل، ۱ ردِ مدل، ۱ خطای قابلِ تلاش
  rows = [
    mkRow('OK1', 'SUCCESS', 'تحلیلِ کامل'),
    mkRow('E-CONTENT', 'ERROR: چیزی', 'تحلیلِ نیمه'),
    mkRow('E-MODEL', 'ERROR: blockReason OTHER', ''),
    mkRow('E-RETRY', "ERROR: TypeError: reading 'parts'", '')
  ];
  let r = api.autoCleanErrorRows_(true);
  ok(`۹.${k}.۳ فقط ردیفِ قابلِ تلاش حذف شد`, r.removed === 1, JSON.stringify(r));
  ok(`۹.${k}.۴ ردیفِ دارای تحلیل دست نخورد`, rows.some(x => x[1] === 'E-CONTENT'));
  ok(`۹.${k}.۵ ردیفِ سالم دست نخورد`, rows.some(x => x[1] === 'OK1'));
  ok(`۹.${k}.۶ ردِ مدل نه حذف شد نه دوباره تلاش می‌شود`,
     rows.some(x => x[1] === 'E-MODEL') && r.permanent === 1);

  // حالا همان فایل باز هم می‌شکند. هر بار که ردیفش حذف شود، تحلیلگر دوباره
  // امتحانش می‌کند و ردیفِ خطای تازه می‌نویسد — همین را شبیه‌سازی می‌کنیم.
  // بارِ چهارم باید به‌جای حذف، برچسب بخورد و برای همیشه بایستد.
  let deletions = r.removed;      // تلاشِ ۱
  for (let round = 2; round <= 4; round++) {
    rows.push(mkRow('E-RETRY', "ERROR: TypeError: reading 'parts'", ''));
    const rr = api.autoCleanErrorRows_(true);
    deletions += rr.removed;
  }
  ok(`۹.${k}.۷ تلاشِ دوباره روی سقفِ ۳ ایستاد`, deletions === 3, 'حذف‌ها=' + deletions);
  const stuck = rows.find(x => x[1] === 'E-RETRY');
  ok(`۹.${k}.۸ ردیفِ به‌سقف‌رسیده مانده و برچسبِ «نهایی» خورده`,
     !!stuck && /نهایی/.test(String(stuck[STATUS])), stuck && String(stuck[STATUS]));

  // و از این به بعد دیگر نامزدِ حذف نیست — هر چند بار هم که اجرا شود.
  // این همان چیزی است که جلوی طوفانِ تلاشِ دوباره را می‌گیرد.
  const before = rows.length;
  api.autoCleanErrorRows_(true);
  api.autoCleanErrorRows_(true);
  ok(`۹.${k}.۹ ردیفِ «نهایی» هرگز دوباره حذف نمی‌شود`, rows.length === before,
     'ردیف‌ها=' + rows.length + ' از ' + before);
  ok(`۹.${k}.۹-ب و شمارشش از جدول پاک شده (جدول کوچک می‌ماند)`,
     !(('E-RETRY') in api.retryLoad_()), JSON.stringify(api.retryLoad_()));

  // سقفِ «روزی یک بار» برای اجرای خودکار
  const auto = api.autoCleanErrorRows_(false);
  ok(`۹.${k}.۱۰ اجرای خودکار روزی یک بار است`, !!auto.skipped, JSON.stringify(auto));
}

console.log('\n=== ۱۰. پاک‌سازی به شروعِ پردازش وصل است ===');
for (const k of ['photo', 'video']) {
  const chain = SRC[k].slice(SRC[k].indexOf('function startChainedProcessing'),
                             SRC[k].indexOf('function startChainedProcessing') + 500);
  ok(`۱۰.${k} پیش از شروعِ پردازش صدا زده می‌شود`,
     /autoCleanErrorRows_\(false\)/.test(chain));
  ok(`۱۰.${k}-ب و اگر شکست بخورد جلوی پردازش را نمی‌گیرد`, /catch \(eClean\)/.test(chain));
}

console.log('\n✅ هر ' + pass + ' آزمونِ اصلاحِ تحلیلگرها گذشت.');
