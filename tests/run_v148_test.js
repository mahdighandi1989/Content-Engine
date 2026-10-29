/* ══ آزمونِ ۱۴.۸ — جایگزینیِ دستوریِ ویدئویی که خصوصی/مسدود است ══
 * گزارشِ ۳۰ اکتبر ۰۰:۵۸: «ویدئوی -l1rMaPuH1I خصوصی است — آپلودِ دوباره انجام نشد (۱۱.۰)». ۸۲ را ادعای محتوا مسدود کرده بود.
 * صاحبِ کانال: «ویدئوی تازه جدا آپلود شود و قدیمی خصوصی بماند (حذف نشود)».
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

console.log('\n=== ۱) کدام جایگزینی دستوری است ===');
{
  const keep = global.ytReplaceList_;
  global.ytReplaceList_ = () => ({ 'variety:82': { tag: 'r1-14.4', strip: 'video' }, 'special:63': { tag: 'auto', auto: true } });
  ok('۱.۱ فهرستِ گیت‌هاب با همان tag ⇒ دستوری', ytReplaceExplicit_({ show: 'variety', ep: '82', key: 'variety:82', replace: 'r1-14.4' }) === true);
  ok('۱.۲ tagِ دیگر ⇒ نه', ytReplaceExplicit_({ show: 'variety', ep: '82', key: 'variety:82', replace: 'x' }) === false);
  ok('۱.۳ خودکار ⇒ نه (محافظِ ۱۱.۲ سرِ جاست)', ytReplaceExplicit_({ show: 'special', ep: '63', key: 'special:63', replace: 'auto' }) === false);
  ok('۱.۴ بی replace ⇒ نه', ytReplaceExplicit_({ show: 'variety', ep: '82', key: 'variety:82' }) === false);
  global.ytReplaceList_ = keep;
}

console.log('\n=== ۲) سیم‌کشی ===');
{
  const s = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۲.۱ آپلود: محافظِ «خصوصی» برای جایگزینیِ دستوری کنار است', /prevRec\.videoId && !ytReplaceExplicit_\(item\) && ytHandsOff_\(prevRec\.videoId, 'آپلودِ دوباره'\)/.test(s));
  ok('۲.۲ آغازِ جایگزینی: فقط خودکار پشتِ محافظ است', /\(list\[key\]\.auto && ytHandsOff_\(rec\.videoId, 'جایگزینی'\)\)/.test(s));
  ok('۲.۳ قدیمی پاک نمی‌شود: پایان فقط خصوصی می‌کند', !/Videos\.remove\(|Videos\['delete'\]|\.Videos\.delete/.test(s) &&
     /yt\.Videos\.update\(\{ id: cur\.oldVid, status: \{ privacyStatus: 'private'/.test(s));
}

console.log('\n=== ۳) حالتِ ۸۲: تلاش‌های سوخته از نو ===');
{
  const keep = {};
  ['ytOn_', 'ytReplaceList_', 'ytPublished_', 'ytDueList_', 'ytDueSave_', 'getHub_', 'ytDueParked_'].forEach(k => { keep[k] = global[k]; });
  let due = [];
  global.ytOn_ = () => true;
  global.ytReplaceList_ = () => ({ 'variety:82': { tag: 'r1-14.4', strip: 'video', why: 'w' } });
  global.ytPublished_ = () => ({ 'variety:82': { videoId: 'OLD82', url: 'u' } });
  global.ytDueList_ = () => due.slice(); global.ytDueSave_ = l => { due = l; return l.length; };
  global.getHub_ = () => ({});
  global.ytDueParked_ = () => [{ key: 'variety:82' }, { key: 'variety:99' }];
  props_().setProperty(PK.YT_REPL, JSON.stringify({ 'variety:82': { tag: 'r1-14.4', phase: 'fail', tries: 3, oldVid: 'OLD82', folderId: 'F82',
    why: 'آپلودِ نسخهٔ تازه 3 بار نشد — علت در تبِ انتشار' } }));
  ytReplaceTick_(60000, {});
  const s1 = ytReplState_()['variety:82'] || {};
  ok('۳.۱ «نشد»ِ ۳ تلاشی دوباره «در ساخت» و دوباره در صف', s1.phase === 'build' && s1.v148 === true && due.length === 1 && due[0].replace === 'r1-14.4', JSON.stringify({ s1, due }));
  const pk = JSON.parse(props_().getProperty(PK.YT_DUE_PARKED) || '[]');
  ok('۳.۲ از فهرستِ کنارگذاشته بیرون آمد، بقیه سرِ جا', pk.length === 1 && pk[0].key === 'variety:99', JSON.stringify(pk));
  props_().setProperty(PK.YT_REPL, JSON.stringify({ 'variety:82': Object.assign({}, s1, { phase: 'fail', tries: 3 }) }));
  due = [];
  ytReplaceTick_(60000, {});
  ok('۳.۳ فقط یک بار (v148) — حلقه نمی‌سازد', (ytReplState_()['variety:82'] || {}).phase === 'fail' && due.length === 0);
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
  props_().deleteProperty(PK.YT_REPL); props_().deleteProperty(PK.YT_DUE_PARKED);
}

summary('۱۴.۸');
