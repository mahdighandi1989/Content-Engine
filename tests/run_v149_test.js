/* ══ آزمونِ ۱۴.۹ — روزِ سهمیهٔ یوتیوب، روزِ یوتیوب است ══
 * ۳۰ اکتبر: ۸۲ از ۰۰:۲۷ ساخته و در صف بود؛ `_STATUS.youtube.quota` تا ۲۰:۱۴ «day 2026-10-30, blocked: واحد» — سهمیهٔ Data API
 * سرِ نیمه‌شبِ اقیانوس آرام (۱۱:۰۰ دبی) تازه شده بود و شمارندهٔ ما تا نیمه‌شبِ دبی آن را نمی‌دید.
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

console.log('\n=== ۱) منطقهٔ زمانیِ روزِ سهمیه ===');
{
  const keep = Utilities.formatDate;
  let tz = '';
  Utilities.formatDate = (d, z, f) => { if (f === 'yyyy-MM-dd' && !tz) tz = z; return keep.call(Utilities, d, z, f); };
  props_().deleteProperty(PK.YT_QUOTA);
  ytQuota_();
  Utilities.formatDate = keep;
  ok('۱.۱ روزِ سهمیه با منطقهٔ اقیانوس آرام', tz === 'America/Los_Angeles', tz);
  ok('۱.۲ پیکربندی همان را می‌گوید، و روزِ دبی دیگر نیست', CFG.YT_QUOTA_TZ === 'America/Los_Angeles' && CFG.YT_QUOTA_TZ !== CFG.TIMEZONE);
}

console.log('\n=== ۲) روزِ تازه ⇒ شمارنده از صفر، «بسته» پاک ===');
{
  props_().setProperty(PK.YT_QUOTA, JSON.stringify({ day: '2000-01-01', units: 9000, uploads: 5, blocked: 'واحد' }));
  const q = ytQuota_();
  ok('۲.۱ روزِ دیگر ⇒ ۰ واحد، ۰ آپلود، بی «بسته»', q.units === 0 && q.uploads === 0 && q.blocked === '', JSON.stringify(q));
  ok('۲.۲ و برداشتنِ آپلود دوباره ممکن است', ytQuotaTake_(1600, true) === true && ytQuota_().uploads === 1);
  props_().deleteProperty(PK.YT_QUOTA);
}

console.log('\n=== ۳) فقط یک تعریف ===');
{
  const s = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const m = s.slice(s.indexOf('function ytQuota_()'), s.indexOf('function ytQuotaSave_('));
  ok('۳.۱ ytQuota_ دیگر CFG.TIMEZONE نمی‌خواند', !/CFG\.TIMEZONE/.test(m) && /CFG\.YT_QUOTA_TZ/.test(m));
}

summary('۱۴.۹');
