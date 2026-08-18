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

console.log('\n✅ هر ' + pass + ' آزمونِ اصلاحِ تحلیلگرها گذشت.');
