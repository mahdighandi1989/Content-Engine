/* ══ آزمونِ ۱۹.۱ — ویدئوی خصوصی‌شده به دستِ صاحبِ کانال «در انتظارِ وارسی» شمرده نمی‌شود ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const keep = {}; const stub = (n, f) => { if (!(n in keep)) keep[n] = global[n]; global[n] = f; };
stub('getHub_', () => ({ getSheetByName: () => null }));
stub('ytPublished_', () => ({
  'variety:74': { videoId: 'V74', privacy: 'private' },
  'variety:98': { videoId: 'V98', privacy: 'unlisted' },
  'special:110': { videoId: 'S110', privacy: 'public' } }));
PropertiesService.getScriptProperties().setProperty(PK.YT_OWNER_PRIVATE, JSON.stringify(['V74']));
const st = ytStatus_();
ok('۱.۱ ویدئوی خصوصیِ صاحبِ کانال جدا شمرده می‌شود، نه «در انتظار»', st.unlisted === 1 && (st.unlistedKeys || []).join() === 'variety:98' && st.ownerPrivate === 1, JSON.stringify({ u: st.unlisted, k: st.unlistedKeys, o: st.ownerPrivate }));
ok('۱.۲ منتشرشده همهٔ سه تا را می‌شمارد', st.published === 3);
PropertiesService.getScriptProperties().setProperty(PK.YT_OWNER_PRIVATE, '[]');
const st2 = ytStatus_();
ok('۱.۳ بی فهرستِ خصوصی، رفتار مثلِ قبل: هر دو «در انتظار»', st2.unlisted === 2 && !st2.ownerPrivate);
for (const k of Object.keys(keep)) global[k] = keep[k];
PropertiesService.getScriptProperties().deleteProperty(PK.YT_OWNER_PRIVATE);
summary('۱۹.۱');
