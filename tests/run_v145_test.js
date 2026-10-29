/* ══ آزمونِ ۱۴.۵ — آموزشِ دوباره‌ای که پوشه‌اش در بایگانی بود ══
 * گلدوز r2-22k را تمام کرد، پوشه‌اش ۲۵ اکتبر بایگانی شد، و r3-band (۱۴.۱) هرگز به صف نرسید: صفِ ۲۹ اکتبر خالی بود.
 * ۱) پوشهٔ گویندهٔ آموزشِ دوباره‌دار از بایگانی برمی‌گردد — فقط جابه‌جایی؛ آموزشِ تمام‌شده یا پاسخِ نخوانده ⇒ نه
 * ۲) درِ ساعتی منتظرِ شبِ بعد نمی‌ماند وقتی tagِ تازه هنوز به صف نرسیده
 * ۳) سیم‌کشی: برگرداندن پیش از اسکن، در همان درِ شبانه که درِ دوم هم از آن می‌گذرد
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const src = n => fs.readFileSync('src/' + fs.readdirSync('src').find(f => f.indexOf(String(n).slice(0, 3)) === 0), 'utf8');

const GOLDUZ = 'محمد تقی پور گلدوز';
const it = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
function world() {
  const moved = [];
  const live = [];
  const arcKids = [];
  const par = {
    getFolders: () => it(live.concat([arc])),
    getFoldersByName: n => it(n === arc.getName() ? [arc] : []),
    addFolder: f => live.push(f)
  };
  const mk = name => ({ getName: () => name, moveTo: dest => { moved.push(name); arcKids.splice(arcKids.indexOf(f0(name)), 1); live.push(f0(name)); } });
  const byName = {};
  const f0 = name => byName[name] || (byName[name] = mk(name));
  const arc = { getName: () => String(CFG.VOICE_CLONE_ARCHIVE || 'بایگانی — نمونه‌های آزمایشی'), getFolders: () => it(arcKids.slice()) };
  return { par, arc, live, arcKids, moved, f0 };
}

console.log('\n=== ۱) برگشت از بایگانی ===');
{
  ok('۱.۰ کلیدِ گلدوز همان کلیدِ پیکربندیِ آموزشِ دوباره است', vintSlug_(GOLDUZ) === 'spk-1g0r95d' &&
     (vintRetrainSpec_('spk-1g0r95d') || {}).tag === 'r3-band', vintSlug_(GOLDUZ));
  const keep = { c: global.vintCloneFolder_, r: global.vintReadResult_, l: global.vintLog_ };
  const logs = [];
  global.vintLog_ = (h, r) => { logs.push(r); return true; };
  let w = world();
  w.arcKids.push(w.f0(GOLDUZ), w.f0('نفرِ دیگری'));
  global.vintCloneFolder_ = () => w.par;
  global.vintReadResult_ = () => ({ speakers: { 'spk-1g0r95d': { retrainDone: 'r2-22k', stage: 'آماده' } } });
  const r1 = vintRetrainRestore_();
  ok('۱.۱ آموزشِ دوبارهٔ مانده ⇒ فقط پوشهٔ همان گوینده برمی‌گردد', r1.restored.join() === 'spk-1g0r95d' &&
     w.moved.join() === GOLDUZ && w.arcKids.length === 1, JSON.stringify({ r1, moved: w.moved }));
  ok('۱.۲ ردیفِ کارنامه می‌گوید چرا', logs.length === 1 && /بایگانی برگشت/.test(logs[0].result) && /r3-band/.test(logs[0].note));
  const r2 = vintRetrainRestore_();
  ok('۱.۳ بارِ دوم کاری نیست (در جای خودش است)', r2.restored.length === 0 && w.moved.length === 1);

  w = world(); w.arcKids.push(w.f0(GOLDUZ));
  global.vintCloneFolder_ = () => w.par;
  global.vintReadResult_ = () => ({ speakers: { 'spk-1g0r95d': { retrainDone: 'r3-band' } } });
  ok('۱.۴ آموزشِ تمام‌شده ⇒ در بایگانی می‌ماند', vintRetrainRestore_().restored.length === 0 && w.moved.length === 0);
  global.vintReadResult_ = () => null;
  ok('۱.۵ پاسخِ نخوانده ⇒ هیچ جابه‌جایی', vintRetrainRestore_().restored.length === 0 && w.moved.length === 0);
  global.vintCloneFolder_ = keep.c; global.vintReadResult_ = keep.r; global.vintLog_ = keep.l;
}

console.log('\n=== ۲) درِ ساعتی ===');
{
  const keepT = global.ScriptApp, keepC = global.clearRetryTriggers_;
  let made = 0;
  global.clearRetryTriggers_ = () => {};
  global.ScriptApp = Object.assign({}, keepT, { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => { made++; } }) }) }) });
  props_().setProperty(PK.VINT_QWRITE, nowStr_());           // صف همین حالا نوشته شده
  props_().deleteProperty('VINT_QLATER_DAY');
  props_().setProperty('VINT_RT_spk-1g0r95d', 'r2-22k');      // نشانهٔ tagِ پیشین
  const a = vintQueueDue_();
  ok('۲.۱ صفِ تازه ولی r3-band هنوز به صف نرسیده ⇒ همین ساعت زمان‌بندی', a.scheduled && made === 1 &&
     (a.retrain || []).indexOf('spk-1g0r95d') !== -1, JSON.stringify(a));
  props_().setProperty('VINT_RT_spk-1g0r95d', 'r3-band');
  const b = vintQueueDue_();
  ok('۲.۲ به صف رسیده ⇒ «تازه است»، زمان‌بندی نه', !b.scheduled && b.why === 'تازه است' && made === 1, JSON.stringify(b));
  props_().deleteProperty('VINT_RT_spk-1g0r95d'); props_().deleteProperty(PK.VINT_QWRITE); props_().deleteProperty('VINT_QLATER_DAY');
  global.ScriptApp = keepT; global.clearRetryTriggers_ = keepC;
}

console.log('\n=== ۳) سیم‌کشی ===');
{
  const s = src('33_');
  const body = s.slice(s.indexOf('function vintNightly_('), s.indexOf('function vintNightly_(') + 6000);
  ok('۳.۱ برگرداندن پیش از اسکنِ صف، در vintNightly_', body.indexOf('vintRetrainRestore_()') !== -1 &&
     body.indexOf('vintRetrainRestore_()') < body.indexOf('scan = vintScan_();'));
  ok('۳.۲ درِ دوم (vintQueueLater) از همان vintNightly_ می‌گذرد', /function vintQueueLater\(\)[\s\S]{0,300}vintNightly_\(/.test(s));
}

console.log('\n=== ۴) کفِ شماره و جایگزینیِ دستوری ===');
{
  const keepL = global.ytReplaceList_;
  global.ytReplaceList_ = () => ({ 'variety:82': { tag: 'r1-14.4', strip: 'video' }, 'special:63': { tag: 'auto', auto: true } });
  YT_HOLD_CACHE_ = null;
  ok('۴.۱ ۸۲ زیرِ کف بی جایگزینی هنوز بیرون از انتشار است', ytItemOff_({ show: 'variety', ep: '82' }) === true);
  ok('۴.۲ با جایگزینیِ دستوری با همان tag، کف سد نیست', ytItemOff_({ show: 'variety', ep: '82', key: 'variety:82', replace: 'r1-14.4' }) === false);
  ok('۴.۳ tagِ دیگر ⇒ هنوز سد', ytItemOff_({ show: 'variety', ep: '82', key: 'variety:82', replace: 'x' }) === true);
  ok('۴.۴ کنارِ دستوری (۸۴) حتی با جایگزینی سد می‌ماند', ytItemOff_({ show: 'variety', ep: '84', key: 'variety:84', replace: 'r1-14.4' }) === true);
  global.ytReplaceList_ = keepL;

  const keep = {};
  ['ytOn_', 'ytReplaceList_', 'ytPublished_', 'ytHandsOff_', 'ytRenderRead_', 'ytReplaceAside_', 'ytReplaceScenes_',
   'vmStripMedia_', 'readSeriesReg_', 'ytDueList_', 'ytDueSave_', 'getHub_'].forEach(k => { keep[k] = global[k]; });
  const keepDrive = global.DriveApp;
  let due = [], aside = 0;
  global.ytOn_ = () => true;
  global.ytReplaceList_ = () => ({ 'variety:82': { tag: 'r1-14.4', strip: 'video', why: 'w' } });
  global.ytPublished_ = () => ({ 'variety:82': { videoId: 'OLD82', url: 'u', series: '' } });
  global.ytHandsOff_ = () => false;
  global.ytRenderRead_ = () => ({ items: [{ key: 'variety:82', folderId: 'F82' }] });
  global.DriveApp = Object.assign({}, keepDrive, { getFolderById: () => ({}) });
  global.ytReplaceAside_ = () => { aside++; return 1; };
  global.ytReplaceScenes_ = () => '';
  global.vmStripMedia_ = () => ({ ok: true, n: 4, why: '' });
  global.readSeriesReg_ = () => ({ rows: [] });
  global.ytDueList_ = () => due.slice(); global.ytDueSave_ = l => { due = l; return l.length; };
  global.getHub_ = () => ({});
  /* همان حالتی که ۱۴.۴ در ۲۹ اکتبر نوشت */
  props_().setProperty(PK.YT_REPL, JSON.stringify({ 'variety:82': { tag: 'r1-14.4', phase: 'skip', at: '2026-10-29 04:00',
    why: 'ویدئوی این قسمت خصوصی است یا قسمت بیرون از انتشار است — جایگزین نمی‌شود' } }));
  ytReplaceTick_(60000, {});
  const s1 = ytReplState_()['variety:82'] || {};
  ok('۴.۵ «لازم نشد»ِ کدِ پیشین یک بار دوباره سنجیده می‌شود و جایگزینی آغاز می‌شود', s1.phase === 'build' && aside === 1 &&
     due.length === 1 && due[0].replace === 'r1-14.4', JSON.stringify(s1));
  props_().setProperty(PK.YT_REPL, JSON.stringify({ 'variety:82': { tag: 'r1-14.4', phase: 'skip', v145: true, at: 'x',
    why: 'ویدئوی این قسمت خصوصی است یا قسمت بیرون از انتشار است — جایگزین نمی‌شود' } }));
  due = []; aside = 0;
  ytReplaceTick_(60000, {});
  ok('۴.۶ داوریِ کدِ تازه دوباره سنجیده نمی‌شود (بی حلقه)', aside === 0 && due.length === 0);
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
  global.DriveApp = keepDrive;
  props_().deleteProperty(PK.YT_REPL);
}

summary('۱۴.۵');
