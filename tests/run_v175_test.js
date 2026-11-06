/* ══ آزمونِ ۱۷.۵ — مسیرِ نوشتنِ درس‌نامه هم مرحله می‌زند (قرینهٔ ۱۶.۶) ══
   شاهد: `_STATUS.runs` ۶ نوامبر ۱۰:۱۶ — «❌ اجرای ناتمام: prepareSpecialEpisode (۳۱۴ دقیقه پیش …)؛ مرحله‌اش ثبت نشده».
   موتور ۱۷.۴ بود. ۱۶.۶ مرحله‌های «متن: …» را فقط به `produceEpisode` داده بود. این آزمون خودِ `prepareSpecialEpisode`
   ⇒ `produceSpecialEpisode` را اجرا می‌کند و در میانهٔ راه (خواندنِ رجیستری) مهرِ اجرا را عکس می‌گیرد — روی کدِ پیشین
   `st` نداشت و ۱.۱ سرخ است. */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const keep = {};
['calGate_', 'epMadeToday_', 'getHub_', 'ingestReports_', 'openInstructions_', 'scanSeries', 'readSeriesReg_', 'logLine_']
  .forEach(k => { keep[k] = global[k]; });
const keepLock = global.LockService, keepEn = CFG.SPECIAL_ENABLED;
CFG.SPECIAL_ENABLED = true;
global.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
global.calGate_ = () => ({ ok: true });
global.epMadeToday_ = () => false;
global.getHub_ = () => ({});
global.ingestReports_ = () => 0;
global.openInstructions_ = () => [];
global.scanSeries = () => {};
global.logLine_ = () => {};
let snap = null;
global.readSeriesReg_ = () => { snap = JSON.parse(global.__PROPS[PK.RUN_AT] || '{}'); throw new Error('ایستِ آزمون'); };
delete global.__PROPS[PK.SP_PENDING];
delete global.__PROPS[PK.RUN_AT];

let threw = '';
try { prepareSpecialEpisode(); } catch (e) { threw = e.message; }
ok('۱.۰ مسیرِ واقعی تا خواندنِ رجیستری رفت', threw === 'ایستِ آزمون' && !!snap, threw);
ok('۱.۱ مهرِ بیرونی (prepareSpecialEpisode) مرحله دارد', !!(snap && snap.prepareSpecialEpisode && snap.prepareSpecialEpisode.st === 'متن: اسکن و داوریِ مجموعه‌ها'), JSON.stringify(snap));
ok('۱.۲ مهرِ درونی هم', !!(snap && snap.produceSpecialEpisode && snap.produceSpecialEpisode.st === 'متن: اسکن و داوریِ مجموعه‌ها'));
const st0 = JSON.parse(global.__PROPS[PK.RUN_AT] || '{}');
ok('۱.۳ پایانِ (با خطا) هر دو مهر را برمی‌دارد', !st0.prepareSpecialEpisode && !st0.produceSpecialEpisode && RUN_CUR_ === '');

/* اگر اجرا همان‌جا کشته می‌شد: شاهدِ مانده می‌گوید کجا */
global.__PROPS[PK.RUN_AT] = JSON.stringify({ prepareSpecialEpisode: snap.prepareSpecialEpisode });
const rs = runStuck_(Date.now() + 20 * 60000);
ok('۱.۴ «اجرای ناتمام» حالا مرحله را می‌گوید', /آخرین مرحله: «متن: اسکن و داوریِ مجموعه‌ها»/.test(rs.line) && !/مرحله‌اش ثبت نشده/.test(rs.line), rs.line);
delete global.__PROPS[PK.RUN_AT];

const sp = String(produceSpecialEpisode);
const want = ['متن: برداشتِ گزارش‌ها', 'متن: گزینشِ مجموعه', 'متن: جست‌وجوی مکمل', 'متن: ارجاعِ میان‌مجموعه‌ای',
              'متن: نوشتنِ درس‌نامهٔ ', 'متن: فشرده‌سازی', 'متن: پاسِ وفاداری'];
ok('۲.۱ سیم‌کشی: هر گامِ سنگینِ نوشتنِ درس‌نامه مرحله می‌زند', want.every(w => sp.indexOf("runStage_('" + w) !== -1),
   want.filter(w => sp.indexOf("runStage_('" + w) === -1).join(' | '));
ok('۲.۲ مرحلهٔ نوشتن پیش از فراخوانِ مدل است', sp.indexOf("runStage_('متن: نوشتنِ درس‌نامهٔ ") < sp.indexOf('geminiText_(prompt, SPECIAL_SCHEMA'));


/* ۳. menu.died همان پنجرهٔ هفت‌روزهٔ fails را دارد */
{
  const keepMenu = global.__PROPS[PK.MENU_LOG];
  const now = Date.now();
  const r0 = menuStatus_();
  const first = (r0.untested[0]) || 'runSyncNow';
  global.__PROPS[PK.MENU_LOG] = JSON.stringify({ [first]: { open: now - 16 * 86400000 } });
  const old = menuStatus_();
  ok('۳.۱ مرگِ ۱۶روزه دیگر «❌ نیمه‌کاره» نیست', old.died.length === 0 && !/نیمه‌کاره ماند/.test(old.line), old.line);
  global.__PROPS[PK.MENU_LOG] = JSON.stringify({ [first]: { open: now - 2 * 3600000 } });
  const fresh = menuStatus_();
  ok('۳.۲ مرگِ دو ساعتِ پیش هنوز دیده می‌شود', fresh.died.length === 1 && fresh.ok === false && /نیمه‌کاره ماند/.test(fresh.line), fresh.line);
  if (keepMenu === undefined) delete global.__PROPS[PK.MENU_LOG]; else global.__PROPS[PK.MENU_LOG] = keepMenu;
}

Object.keys(keep).forEach(k => { global[k] = keep[k]; });
global.LockService = keepLock; CFG.SPECIAL_ENABLED = keepEn;
summary('۱۷.۵');
