/* run_stall_test.js — دو خرابیِ صبحِ ۱۲ مرداد ۱۴۰۵، مو به مو بازسازی می‌شود.
 *
 * ۱) «از همه جا از همه رنگ» قسمت ۴: هفت بخشِ صوتی ساخته شد (۴۱٫۷ مگابایت)،
 *    مرحلهٔ ادغام شروع شد، و بعد هیچ. نه فایلِ یکجایی، نه پیامی، نه حتی یک
 *    سطر در سیاهه. آخرین سطر: «قسمت 4: صدا کامل شد (7 بخش)؛ ادغام در اجرای بعد.»
 *    ساعت ۰۷:۲۹. تا ساعت ۰۸:۲۲ هم هیچ. علت: کلِ ۴۱٫۷ مگابایت در یک اجرا و یک
 *    رشتهٔ base64 چسبانده می‌شد، اجرا کشته شد، و نگهبان هم چون تریگرِ
 *    زده‌شده هنوز در فهرست بود گفت «زمان‌بندی شده» و کاری نکرد.
 *
 * ۲) پشتیبان‌گیریِ همان شب اصلاً انجام نشد و هیچ پیامی نیامد. تریگرِ ساعت سه
 *    به قفلِ همگام‌سازیِ ۰۲:۵۸ خورد و بی هیچ سطری در سیاهه برگشت.
 *
 * هر آزمونِ این فایل باید *اجرا* شود، نه خوانده.
 */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const L = require('./lib/probe_r4_lib.js');
const { ok, summary, quiet } = L;

// ═══ یک فهرستِ تریگرِ واقعی، به‌جای stubِ همیشه‌خالیِ mock ═══
// بی این، بازسازیِ ایرادِ «تریگرِ زده‌شدهٔ جامانده» اصلاً ممکن نیست.
let TRIGS = [];
function trigStub() {
  global.ScriptApp.getProjectTriggers = () => TRIGS.slice();
  global.ScriptApp.newTrigger = (fn) => {
    const t = { _fn: fn, _after: 0, getHandlerFunction: () => fn,
      timeBased() { return this; }, after(ms) { this._after = ms; return this; },
      everyHours() { return this; }, atHour() { return this; }, nearMinute() { return this; },
      everyDays() { return this; }, inTimezone() { return this; },
      create() { TRIGS.push(t); return t; } };
    return t;
  };
  global.ScriptApp.deleteTrigger = (t) => { TRIGS = TRIGS.filter(x => x !== t); };
}
trigStub();
const trigsOf = fn => TRIGS.filter(t => t._fn === fn);

// هر چه موتور در سیاهه می‌نویسد، این‌جا هم ضبط می‌شود
const LOGS = [];
const realLogLine = global.logLine_;
global.logLine_ = function (m) { LOGS.push(String(m)); try { realLogLine(m); } catch (e) {} };

// ═════════════════════════════════════════════════════════════════════════
console.log('\n=== ۱. نگهبان و تریگرِ زده‌شدهٔ جامانده (خودِ ایرادِ ۱۲ مرداد) ===');
{
  TRIGS = [];
  global.__PROPS = {};
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify(
    { epNum: 4, folderId: 'F', podRow: 5, phase: 'merge', chunkIdx: 12, partNo: 8, files: [] });
  // تریگرِ یک‌بارمصرفی که ساعت ۰۷:۲۹ زده و اجرایش کشته شده — ولی هنوز در فهرست است
  global.ScriptApp.newTrigger('produceEpisodeContinue').timeBased().after(45000).create();
  // و نوبتش خیلی وقت است گذشته
  global.__PROPS[PK.CONT_DUE] = String(new Date().getTime() - 50 * 60 * 1000);

  const un = quiet();
  const revived = resumeStalledEpisode_();
  un();
  ok('1.1 نگهبان قسمتِ مرده را دید (نسخهٔ قبل این‌جا false می‌داد)', revived === true, String(revived));
  ok('1.2 تریگرِ ادامهٔ تازه ساخته شد', trigsOf('produceEpisodeContinue').length === 1,
     trigsOf('produceEpisodeContinue').length + ' تریگر');
  ok('1.3 نوبتِ تازه ثبت شد', Number(global.__PROPS[PK.CONT_DUE]) > new Date().getTime(),
     String(global.__PROPS[PK.CONT_DUE]));
}

console.log('\n=== ۲. ولی نوبتی که هنوز نرسیده، دست نمی‌خورد ===');
{
  TRIGS = [];
  global.__PROPS = {};
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify({ epNum: 4, phase: 'audio', files: [] });
  global.__PROPS[PK.CONT_DUE] = String(new Date().getTime() + 4 * 60 * 1000);
  global.ScriptApp.newTrigger('produceEpisodeContinue').timeBased().after(4 * 60 * 1000).create();
  const un = quiet();
  const r = resumeStalledEpisode_();
  un();
  ok('2.1 نگهبان دخالت نکرد', r === false, String(r));
  ok('2.2 تریگرِ اضافه ساخته نشد', trigsOf('produceEpisodeContinue').length === 1,
     trigsOf('produceEpisodeContinue').length + ' تریگر');
}

console.log('\n=== ۳. حالتِ نیمه‌تمامِ نسخهٔ قبل (بی «نوبتِ ادامه») هم احیا می‌شود ===');
{
  // این دقیقاً وضعیتِ همین حالای شماست: قسمت ۴ در PropertiesService مانده و
  // چون با نسخهٔ ۵٫۷ نوشته شده، هیچ CONT_DUEای ندارد.
  TRIGS = [];
  global.__PROPS = {};
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify({ epNum: 4, phase: 'merge', files: [] });
  const un = quiet();
  const r = resumeStalledEpisode_();
  un();
  ok('3.1 بی‌نوبت یعنی «رها شده» — احیا شد', r === true, String(r));
  ok('3.2 و درس‌نامه هم همین‌طور', (function () {
    global.__PROPS['SPECIAL_PENDING'] = JSON.stringify({ epNum: 3, phase: 'merge', files: [] });
    const u2 = quiet(); const x = resumeStalledSpecial_(); u2();
    return x === true;
  })());
}

// ═════════════════════════════════════════════════════════════════════════
console.log('\n=== ۴. ادغام: همان هفت بخشِ ۴۱٫۷ مگابایتیِ قسمت ۴ ===');

const MB = 1048576;
let MSEQ = 0;
function folderStub() {
  const made = [];
  return { made, trashed: [],
    createFile(blob) {
      const self = this;
      const id = 'M' + (MSEQ++);
      const f = { _n: blob.getName(), _b: blob, _tr: false,
        getId() { return id; },
        getName() { return this._n; },
        getUrl() { return 'https://drive.google.com/file/d/x/view'; },
        setTrashed(v) { this._tr = !!v; self.trashed.push(this._n); },
        getBlob() { return this._b; } };
      made.push(f);
      // در Apps Script واقعی، فایلِ تازه‌ساخته با شناسه‌اش پیدا می‌شود؛
      // پس در آزمون هم باید پیدا شود، وگرنه پاک‌سازی الکی «سبز» می‌شود.
      global.__FILESBYID[id] = f;
      return f;
    } };
}
global.__FILESBYID = global.__FILESBYID || {};
const realGet = global.DriveApp.getFileById;
global.DriveApp.getFileById = function (id) {
  if (global.__FILESBYID[id]) return global.__FILESBYID[id];
  return realGet.call(global.DriveApp, id);
};
function parts(sizes) {
  return sizes.map((b, i) => {
    const data = Buffer.concat([Buffer.from(wavHeader54_(b)), Buffer.alloc(b, 1)]);
    const id = 'Q' + i + '_' + b;
    global.__FILESBYID[id] = { _tr: false, setTrashed(v) { this._tr = !!v; },
      getBlob: () => ({ getBytes: () => Array.prototype.slice.call(data) }) };
    return { id, name: 'بخش ' + (i + 1) + '.wav', url: 'u' + i, bytes: b };
  });
}
// حجم‌های واقعیِ همان صبح: ۶٫۷ + ۳٫۴ + ۶٫۸ + ۴٫۹ + ۵٫۱ + ۷٫۳ + ۷٫۵
const REAL7 = [6.7, 3.4, 6.8, 4.9, 5.1, 7.3, 7.5].map(x => Math.round(x * MB));
const REAL7_TOTAL = REAL7.reduce((a, b) => a + b, 0);

{
  const plan = planGroups_(parts(REAL7));
  ok('4.1 نقشه کشیده شد', !!plan && plan.length >= 1, plan ? plan.length + ' گروه' : 'null');
  ok('4.2 دیگر یک ادغامِ ۴۱٫۷ مگابایتی نیست', plan && plan.length === 2,
     plan ? plan.map(g => g.length).join('+') + ' بخش' : '-');
  const sizes = plan.map(g => g.reduce((a, i) => a + REAL7[i], 0));
  ok('4.3 هیچ گروهی از سقف نگذشت', sizes.every(s => s <= CFG.MERGE_MAX_BYTES),
     sizes.map(s => (s / MB).toFixed(1) + 'MB').join(' | ') + '  سقف ' +
     (CFG.MERGE_MAX_BYTES / MB).toFixed(0) + 'MB');
  ok('4.4 و هیچ بخشی جا نماند',
     plan && plan.reduce((a, g) => a + g.length, 0) === 7 &&
     sizes.reduce((a, b) => a + b, 0) === REAL7_TOTAL);
  ok('4.5 دو فایل هم زیر سقفِ پنجاه‌مگابایتیِ تلگرام‌اند', sizes.every(s => s < 50 * MB));
}

console.log('\n=== ۵. هر اجرا فقط یک گروه؛ و تریگر پیش از کارِ سنگین مسلح می‌شود ===');
{
  TRIGS = [];
  global.__PROPS = {};
  const f = folderStub();
  const st = { epNum: 4, phase: 'merge', files: parts(REAL7) };
  // ثبت می‌کنیم که لحظهٔ شروعِ چسباندن، تریگرِ ادامه در فهرست بود یا نه
  let armedAtHeavyWork = null;
  const realMergeOne = global.mergeOne_;
  global.mergeOne_ = function (files, name, folder) {
    if (armedAtHeavyWork === null) armedAtHeavyWork = trigsOf('produceEpisodeContinue').length;
    return realMergeOne(files, name, folder);
  };
  const far = () => new Date().getTime() + 10 * 60 * 1000;

  const un = quiet();
  const r1 = mergeStep_(st, 'قسمت 0004', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت');
  un();
  ok('5.1 اجرای اول تمام نکرد (یک گروه بس است)', r1.done === false, JSON.stringify(r1));
  ok('5.2 پیش از چسباندن، تریگرِ ادامه مسلح بود', armedAtHeavyWork === 1,
     'تریگرها هنگام شروعِ کارِ سنگین: ' + armedAtHeavyWork);
  ok('5.3 پیشرفت در PropertiesService ذخیره شد', (function () {
    const s = JSON.parse(global.__PROPS['PENDING_EPISODE']);
    return s.mergeIdx === 1 && s.mergeOut.length === 1 && s.mergePlan.length === 2;
  })(), global.__PROPS['PENDING_EPISODE'].slice(0, 120));

  const un2 = quiet();
  const r2 = mergeStep_(st, 'قسمت 0004', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت');
  un2();
  ok('5.4 اجرای دوم کار را تمام کرد', r2.done === true && !r2.skipped, JSON.stringify(r2));
  const lst = mergedList_(st.merged);
  ok('5.5 دو فایلِ یکجا حاصل شد', lst.length === 2,
     lst.map(x => x.name).join(' | '));
  // «هیچ ثانیه‌ای» با دقتِ بایت نه: چسباندن روی مرزِ چهارتاییِ base64 انجام
  // می‌شود و هر بخش تا دو بایت (یک نمونهٔ صوتی، حدود ۴۰ میکروثانیه) گرد
  // می‌شود. هفت بخش یعنی حداکثر چهارده بایت. مرزِ آزمون همان است.
  ok('5.6 هیچ ثانیه‌ای گم نشد',
     REAL7_TOTAL - lst.reduce((a, x) => a + x.bytes, 0) <= 2 * REAL7.length &&
     lst.reduce((a, x) => a + x.bytes, 0) <= REAL7_TOTAL,
     'اختلاف ' + (REAL7_TOTAL - lst.reduce((a, x) => a + x.bytes, 0)) + ' بایت');
  ok('5.7 هر دو «whole» علامت خوردند تا به تلگرام بروند', lst.every(x => x.whole === true));
  global.mergeOne_ = realMergeOne;
}

console.log('\n=== ۶. اجرا وسطِ ادغام کشته شود: رشته پاره نمی‌شود ===');
{
  TRIGS = [];
  global.__PROPS = {};
  const f = folderStub();
  const st = { epNum: 4, phase: 'merge', files: parts(REAL7) };
  // کشته‌شدنِ اجرا در Apps Script استثنا نمی‌دهد؛ اجرا فقط تمام می‌شود. پس
  // این‌جا لحظهٔ ورود به کارِ سنگین را عکس می‌گیریم — هرچه *پیش از* آن ثبت
  // شده باشد، همان چیزی است که بعد از مرگ باقی می‌ماند. اگر آن عکس ناقص
  // باشد، قسمت مرده می‌ماند؛ ۱۲ مرداد دقیقاً همین شد.
  let snap = null, armed = -1;
  const realMergeOne = global.mergeOne_;
  global.mergeOne_ = function () {
    snap = global.__PROPS['PENDING_EPISODE'];
    armed = trigsOf('produceEpisodeContinue').length;
    throw new Error('مرگِ ساختگیِ اجرا');
  };
  const far = () => new Date().getTime() + 10 * 60 * 1000;

  const un = quiet();
  try { mergeStep_(st, 'ق', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت'); } catch (e) {}
  un();
  const saved = JSON.parse(snap || '{}');
  ok('6.1 در لحظهٔ ورود به کارِ سنگین، تریگرِ ادامه مسلح بود', armed === 1, String(armed));
  ok('6.2 و تریگر بعد از مرگ هم سرِ جایش ماند — همان چیزی که ۱۲ مرداد نبود',
     trigsOf('produceEpisodeContinue').length === 1,
     trigsOf('produceEpisodeContinue').length + ' تریگر');
  ok('6.3 و شمارندهٔ تلاش پیش از مرگ ثبت شده بود',
     saved.mergeAt === 0 && saved.mergeTry === 1, JSON.stringify({ at: saved.mergeAt, try: saved.mergeTry }));

  // اجرای دوم، دقیقاً از روی همان عکسِ لحظهٔ مرگ: باز هم می‌میرد
  const st2 = JSON.parse(snap);
  st2.files = st.files;
  const un2 = quiet();
  try { mergeStep_(st2, 'ق', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت'); } catch (e) {}
  un2();
  ok('6.4 تلاشِ دوم هم شمرده شد', JSON.parse(snap).mergeTry === 2, JSON.parse(snap).mergeTry);

  // اجرای سوم: بس است — انتشار گروگانِ ادغام نمی‌ماند
  const st3 = JSON.parse(snap);
  st3.files = st.files;
  const un3 = quiet();
  const r3 = mergeStep_(st3, 'ق', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت');
  un3();
  ok('6.5 بعد از دو تلاشِ مرده، ادغام کنار رفت و قسمت آزاد شد',
     r3.done === true && r3.skipped === true, JSON.stringify(r3));
  ok('6.6 و بخش‌ها دست‌نخورده ماندند تا جداگانه بروند',
     st3.merged === null && st3.files.length === 7);
  global.mergeOne_ = realMergeOne;
}

console.log('\n=== ۷. رهاکردنِ ادغام، فایلِ نیم‌ساخته جا نمی‌گذارد ===');
{
  TRIGS = [];
  global.__PROPS = {};
  const f = folderStub();
  // دو گروهِ دوتایی: اولی سالم چسبانده می‌شود، دومی می‌میرد
  const big = parts([15 * MB, 15 * MB, 15 * MB, 15 * MB]);
  const st = { epNum: 4, phase: 'merge', files: big };
  const far = () => new Date().getTime() + 10 * 60 * 1000;
  const un = quiet();
  mergeStep_(st, 'ق', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت');   // گروه ۱ سالم
  const madeAfterFirst = f.made.length;
  const realMergeOne = global.mergeOne_;
  global.mergeOne_ = function () { throw new Error('مرگِ ساختگی'); };
  // خطای گذرا یک بار بخشوده می‌شود؛ بارِ دوم ادغام رها می‌شود
  const t1 = mergeStep_(st, 'ق', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت');
  const t2 = mergeStep_(st, 'ق', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت');
  global.mergeOne_ = realMergeOne;
  un();
  ok('7.0 خطای گذرا بارِ اول بخشیده شد، بارِ دوم نه',
     t1.done === false && t2.done === true && t2.skipped === true,
     JSON.stringify(t1) + ' → ' + JSON.stringify(t2));
  ok('7.1 گروهِ اول ساخته شده بود', madeAfterFirst === 1, String(madeAfterFirst));
  ok('7.2 ادغام رها شد', st.merged === null && !st.mergePlan);
  ok('7.3 فایلِ یکجای نیم‌کاره در پوشه جا نماند', f.trashed.length === 1,
     f.trashed.join(',') || 'هیچ');
  ok('7.4 و هیچ‌کدام از بخش‌های اصلی پاک نشد',
     big.every(p => global.__FILESBYID[p.id]._tr === false));
}

console.log('\n=== ۸. گروهِ تک‌عضوی هرگز پاک نمی‌شود (خودش بخشِ اصلی است) ===');
{
  TRIGS = [];
  global.__PROPS = {};
  const f = folderStub();
  const two = parts([40 * MB, 40 * MB]);      // هر کدام از سقف بزرگ‌تر
  const st = { epNum: 9, phase: 'merge', files: two };
  const far = () => new Date().getTime() + 10 * 60 * 1000;
  const un = quiet();
  let guard = 0, r;
  do { r = mergeStep_(st, 'ق', f, far(), 'PENDING_EPISODE', scheduleContinue_, 'قسمت'); }
  while (!r.done && guard++ < 8);
  un();
  const lst = mergedList_(st.merged);
  ok('8.1 هر بخش خودش یک «یکجا» شد، بی رونوشتِ بی‌فایده', lst.length === 2 && f.made.length === 0,
     lst.length + ' فایل، ' + f.made.length + ' رونوشت');
  ok('8.2 و همان شناسهٔ اصلی را دارند', lst[0] && lst[0].id === two[0].id);
  ok('8.3 و reused علامت خورده‌اند تا هرگز پاک نشوند', lst.every(x => x.reused === true));
}

// ═════════════════════════════════════════════════════════════════════════
console.log('\n=== ۹. پشتیبان: برخوردِ قفل دیگر بی‌صدا نیست ===');
{
  TRIGS = [];
  global.__PROPS = {};
  const realLock = global.LockService;
  global.LockService = { getScriptLock: () => ({ tryLock: () => false, releaseLock() {} }) };
  const un = quiet();
  const r = runBackupStep(false);
  un();
  ok('9.1 برگشت «قفل مشغول»', r && r.reason === 'busy', JSON.stringify(r));
  ok('9.2 در سیاهه ثبت شد (۱۲ مرداد هیچ سطری نبود)', lastLog_().indexOf('قفل در اختیارِ') !== -1,
     lastLog_() || '(هیچ سطری)');
  ok('9.3 تلاشِ دوباره زمان‌بندی شد', trigsOf('backupContinue').length === 1,
     trigsOf('backupContinue').length + ' تریگر');
  ok('9.4 شمارندهٔ نوبت ثبت شد', global.__PROPS[PK.BACKUP_BUSY] === '1',
     String(global.__PROPS[PK.BACKUP_BUSY]));

  // شش نوبت و بعد بس
  const un2 = quiet();
  for (let i = 0; i < 6; i++) runBackupStep(false);
  un2();
  ok('9.5 بعد از شش نوبت رها می‌شود (حلقهٔ بی‌پایان نمی‌سازد)',
     lastLog_().indexOf('شش نوبت') !== -1, lastLog_());
  ok('9.6 و شمارنده پاک شد تا فردا از نو بشمارد',
     global.__PROPS[PK.BACKUP_BUSY] === undefined);
  global.LockService = realLock;
}

console.log('\n=== ۱۰. و نوبتِ دوباره واقعاً کار را انجام می‌دهد ===');
{
  TRIGS = [];
  global.__PROPS = {};
  global.__PROPS[PK.BACKUP_BUSY] = '1';        // یعنی نوبتِ قبلی به قفل خورده بود
  const un = quiet();
  const r = backupContinue();
  un();
  ok('10.1 backupContinue با «قفل‌خورده» هم شروع می‌کند (قبلاً nothing-pending می‌داد)',
     !(r && r.reason === 'nothing-pending'), JSON.stringify(r).slice(0, 120));
  ok('10.2 ولی بی هیچ نشانه‌ای هنوز کاری نمی‌کند', (function () {
    global.__PROPS = {};
    const u = quiet(); const x = backupContinue(); u();
    return x && x.reason === 'nothing-pending';
  })());
}

console.log('\n=== ۱۱. پشتیبانِ کهنه، خودش دورِ جبرانی می‌گیرد ===');
{
  TRIGS = [];
  global.__PROPS = {};
  const un = quiet();
  const k1 = nudgeBackup_();
  const k2 = nudgeBackup_();          // بار دوم نباید تریگرِ تکراری بسازد
  un();
  ok('11.1 دورِ جبرانی زمان‌بندی شد', k1 === true);
  ok('11.2 تریگرِ تکراری ساخته نشد', k2 === false && trigsOf('backupContinue').length === 1,
     trigsOf('backupContinue').length + ' تریگر');
  ok('11.3 و نشانه‌اش گذاشته شد تا backupContinue حق شروع داشته باشد',
     global.__PROPS[PK.BACKUP_BUSY] === '1');
}

console.log('\n=== ۱۲. شبی که قفل تا آخر آزاد نشد: فردا جبران می‌شود ===');
{
  // این همان چیزی است که بازبینِ مهاجم پیدا کرد: نسخهٔ اولِ همین اصلاح، تلنگرِ
  // جبرانی را از روی «آیا تریگری در فهرست هست» تصمیم می‌گرفت — یعنی دقیقاً
  // همان دامی که برای صداگذاری خنثی شده بود. نتیجه در شبیه‌سازی: هفت شبِ
  // پیاپی، صفر پشتیبان. این آزمون همان شبیه‌سازی است، با ساعتی که واقعاً
  // جلو می‌رود.
  TRIGS = []; global.__PROPS = {};
  global.DriveApp.__register(CFG.BACKUP_FOLDER_ID, 'BACKUP');
  const realLock = global.LockService;
  let locked = true;
  global.LockService = { getScriptLock: () => ({ tryLock: () => !locked, releaseLock() {} }) };
  const un = quiet();
  // ۰۳:۰۰ — تریگرِ شبانه به قفلِ همگام‌سازی می‌خورد و شش نوبت تلاش می‌کند
  runBackupStep(false);
  for (let i = 0; i < 8 && trigsOf('backupContinue').length; i++) {
    global.__SKEW_MS += 5 * 60 * 1000;
    backupContinue();
  }
  const gaveUp = trigsOf('backupContinue').length === 0;
  // ساعت‌ها بعد، قفل آزاد است و وارسیِ سلامت می‌بیند پشتیبان کهنه شده
  locked = false;
  global.__SKEW_MS += 6 * 60 * 60 * 1000;
  const kicked = nudgeBackup_();
  global.__SKEW_MS += 4 * 60 * 1000;
  const ran = backupContinue();
  un();
  ok('12.1 شبانه رها شد و تریگرِ زده‌شده هم جا نماند', gaveUp,
     trigsOf('backupContinue').length + ' تریگر');
  ok('12.2 تلنگرِ جبرانی گرفت (نسخهٔ اولِ اصلاح این‌جا برای همیشه false می‌داد)',
     kicked === true, String(kicked));
  ok('12.3 و پشتیبان واقعاً گرفته شد', ran && ran.ok === true,
     JSON.stringify(ran).slice(0, 100));
  global.LockService = realLock;
  global.__SKEW_MS = 0;
}

console.log('\n=== ۱۳. «نوبت»ِ بی‌معنی نباید قسمت را تا ابد بخواباند ===');
{
  const cases = [['ساعتِ سرور یک روز جلو پرید', 24 * 60 * 60 * 1000],
                 ['سالِ ۲۰۹۹', 70 * 365 * 24 * 60 * 60 * 1000],
                 ['عددِ نجومی', 1e15]];
  let blocked = [];
  for (const [name, ahead] of cases) {
    TRIGS = []; global.__PROPS = {};
    global.__PROPS['PENDING_EPISODE'] = JSON.stringify({ epNum: 4, phase: 'merge', files: [] });
    global.__PROPS[PK.CONT_DUE] = String(new Date().getTime() + ahead);
    global.ScriptApp.newTrigger('produceEpisodeContinue').timeBased().after(1000).create();
    const u = quiet(); const r = resumeStalledEpisode_(); u();
    if (!r) blocked.push(name);
  }
  ok('13.1 هیچ «نوبت»ِ آینده‌ای قسمت را قفل نکرد', blocked.length === 0, blocked.join('، ') || '—');

  // و برعکس: انتظارِ مشروعِ چندساعته دست نمی‌خورد
  TRIGS = []; global.__PROPS = {};
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify({ epNum: 4, phase: 'audio', files: [] });
  global.__PROPS[PK.CONT_DUE] = String(new Date().getTime() + 3 * 60 * 60 * 1000);
  global.ScriptApp.newTrigger('produceEpisodeContinue').timeBased().after(1000).create();
  const u2 = quiet(); const r2 = resumeStalledEpisode_(); u2();
  ok('13.2 ولی دروازهٔ سه‌ساعتهٔ ساعتِ انتشار محترم است', r2 === false, String(r2));
}

console.log('\n=== ۱۴. تریگرِ پاک‌شده (نصبِ دوبارهٔ زمان‌بندی) قسمت را یتیم نمی‌کند ===');
{
  TRIGS = []; global.__PROPS = {};
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify({ epNum: 4, phase: 'audio', files: [] });
  // نوبت پنج ساعت دیگر است، ولی کسی همهٔ تریگرها را پاک کرده
  global.__PROPS[PK.CONT_DUE] = String(new Date().getTime() + 5 * 60 * 60 * 1000);
  const u = quiet(); const r = resumeStalledEpisode_(); u();
  ok('14.1 بی‌راننده یعنی رها‌شده، هرچه «نوبت» بگوید', r === true, String(r));
  ok('14.2 و راننده‌اش دوباره سرِ جایش نشست', trigsOf('produceEpisodeContinue').length === 1);
}

console.log('\n=== ۱۵. بخشِ تک‌عضوی دو بار در فهرست نمی‌نشیند ===');
{
  // اگر گروهی یک عضو داشته باشد، آن «فایلِ یکجا» خودِ بخش است. تا پیش از این
  // اصلاح، هم به‌عنوان «بخش ۱» در فهرست بود هم به‌عنوان «کل قسمت در یک فایل» —
  // یعنی یک لینکِ تکراری در شیت، در سند و در ایمیل.
  const files = [{ id: 'A', name: 'بخش 1.wav', url: 'ua', bytes: 40 * MB },
                 { id: 'B', name: 'بخش 2.wav', url: 'ub', bytes: 5 * MB },
                 { id: 'C', name: 'بخش 3.wav', url: 'uc', bytes: 5 * MB }];
  const merged = [{ id: 'A', name: 'بخش 1.wav', url: 'ua', bytes: 40 * MB, whole: true, reused: true },
                  { id: 'Z', name: 'یکجا 2 از 2.wav', url: 'uz', bytes: 10 * MB, whole: true }];
  const wholeIds = {}; merged.forEach(m => { wholeIds[m.id] = 1; });
  const links = [];
  let total = 0;
  files.forEach(f => { total += f.bytes; if (!wholeIds[f.id]) links.push(f); });
  merged.slice().reverse().forEach(m => links.unshift(m));
  ok('15.1 لینکِ تکراری نماند',
     links.length === new Set(links.map(x => x.url)).size, links.map(x => x.url).join(','));
  ok('15.2 و مدتِ قسمت همچنان از رویِ همهٔ بخش‌ها حساب می‌شود', total === 50 * MB);
}

// ── کمکی‌ها ────────────────────────────────────────────────────────────────
// سیاهه را از خودِ logLine_ می‌گیریم، نه از تبِ شیت: در این آزمون‌ها
// PropertiesService بارها از صفر ساخته می‌شود و هر بار یک CONTENT-HUBِ تازه
// می‌آید، پس تبِ سیاهه چیزی از دورِ قبل به یاد ندارد.
function lastLog_() { return LOGS.length ? LOGS[LOGS.length - 1] : ''; }

process.exit(summary('قسمتِ گیرکرده و پشتیبانِ نگرفته') ? 1 : 0);
