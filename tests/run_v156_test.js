/* ══ آزمونِ ۱۵.۶ — «۸۹ هنوز فهرست‌نشده است» پس از نصبِ ۱۵.۵ ══
 * اجرای ساعتیِ ۱۵:۰۱ صفِ عمومی‌کردن را برنداشت و ردی نگذاشت: نوبتش آخرِ دور بود، پشتِ «۲۵ ثانیه مانده».
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const src = fs.readFileSync('src/27_YouTube.gs', 'utf8');
const iTick = src.indexOf('function ytTick_(budgetMs)');
const body = src.slice(iTick, src.indexOf('\nfunction ', iTick + 10));
const iFd = body.indexOf('ytFlipDueTick_()'), iPub = body.indexOf('ytRunDue_('), iCol = body.indexOf('ytRenderCollect_(');
ok('۱.۱ صفِ عمومی‌کردن پس از برداشتِ ویدئو و پیش از هر انتشار/نگه‌داری', iFd > iCol && iFd < iPub, JSON.stringify({ iCol, iFd, iPub }));
ok('۱.۲ و پشتِ هیچ شرطِ «وقت مانده»ای نیست', !/if \(left\(\) > \d+\) \{\s*try \{ var fdT = ytFlipDueTick_/.test(body));
ok('۱.۳ فقط یک بار در دور', body.split('ytFlipDueTick_()').length === 2);

const store = {};
const keepP = global.props_;
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } });
const keep = {};
['ytOn_', 'getHub_', 'ytPublished_', 'ytSvc_', 'ytPublicGate_', 'ytRenderMapCached_', 'ytHandsOff_', 'ytLog_'].forEach(k => { keep[k] = global[k]; });
global.ytOn_ = () => true; global.getHub_ = () => ({});
global.ytPublished_ = () => ({ 'variety:89': { videoId: 'V89', privacy: 'unlisted' } });
global.ytSvc_ = () => ({ Videos: { update: () => {} } });
global.ytPublicGate_ = () => ({ ok: false, why: 'سنجشِ خودکارِ رانر برای این ویدئو ثبت نشده' });
global.ytRenderMapCached_ = () => ({}); global.ytHandsOff_ = () => false; global.ytLog_ = () => {};
ytFlipDueTick_();
const fd = JSON.parse(store[PK.YT_FLIP_DUE] || '{}');
ok('۲.۱ نشدن علتش را در صف می‌نویسد (سدِ بسته)', fd['variety:89'] && /سنجش/.test(fd['variety:89'].why) && fd['variety:89'].tries === 1, JSON.stringify(fd));
ytFlipDueTick_();
ok('۲.۲ و شمارِ تلاش‌ها بالا می‌رود', JSON.parse(store[PK.YT_FLIP_DUE])['variety:89'].tries === 2);
ok('۲.۳ _STATUS.youtube.flipDue از همین صف ساخته می‌شود', /out\.flipDue = Object\.keys\(fdS\)/.test(src));
Object.keys(keep).forEach(k => { global[k] = keep[k]; });
global.props_ = keepP;
summary('۱۵.۶');
