/* ══ آزمونِ ۱۳.۶ — «کم‌تصویر» با ۲۱ از ۲۱: ایرادِ مزمنی که هیچ‌چیز کم نداشت ══
 * _STATUS.health.chronic (۲۶ اکتبر): «۱ قسمت با تصویرِ کم‌تر از برنامه منتشر شد (جبران‌ناپذیر): special:76 (21/21)» — شش روزِ پیاپی.
 */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
props_().setProperty(PK.LV_SHORT, JSON.stringify({ 'special:76': { at: '2026-10-20 10:00', ready: 21, want: 21 }, 'special:50': { at: '2026-10-01 10:00', ready: 9, want: 14 } }));
const st = lvStatus_();
ok('۱.۱ ردیفِ کامل (۲۱ از ۲۱) شمرده نمی‌شود؛ ردیفِ واقعاً کم (۹ از ۱۴) می‌شود', st.short === 1 && st.shortKeys.join() === 'special:50 (9/14)', JSON.stringify(st.shortKeys));
lvShortNote_('special:76', { ready: 21, want: 21, why: 'x' });
const m = JSON.parse(props_().getProperty(PK.LV_SHORT));
ok('۱.۲ ثبتِ کامل ثبت نمی‌کند و ردیفِ کهنه‌اش را پاک می‌کند', !m['special:76'] && !!m['special:50'], JSON.stringify(m));
lvShortNote_('special:90', { ready: 3, want: 12 });
ok('۱.۳ کمِ واقعی همچنان ثبت می‌شود', !!JSON.parse(props_().getProperty(PK.LV_SHORT))['special:90']);
summary('۱۳.۶');
