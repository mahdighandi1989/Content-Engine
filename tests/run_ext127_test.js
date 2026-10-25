/* ══ آزمونِ ۱۲.۷ — محتوای بیرونی (NotebookLM): «مالِ موتور» یعنی در دفترِ موتور؛ بیرونی از الگوها و فرضیهٔ ۷ کنار و فقط شمرده ══
 *
 * صاحبِ کانال: «هر چیزی که در رجیستریِ موتور نیست بیرونی حساب شود و از فرضیه‌ها و شمارش و بازنویسی کنار بماند، و فقط در یک
 * بخشِ جدا در ایمیلِ ساعتِ ۱۰ شمرده و نام برده شود. برای یوتیوب تگِ ext-notebooklm؛ برای اینستاگرام نبودن در رجیستری.»
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const sv = {};
['igBook_', 'ytSvc_', 'ytChannelInfo_', 'ytPublished_', 'ytQuotaTake_', 'igState_'].forEach((k) => { sv[k] = global[k]; });
const ledger = (rows) => ({ getSheetByName: () => ({ getLastRow: () => rows.length + 1, getRange: () => ({ getValues: () => rows }) }) });
const lrow = (reel, short) => { const r = new Array(11).fill(''); r[5] = reel; r[10] = short || ''; return r; };

/* ── ۱) دفترِ موتور ── */
global.igBook_ = () => ledger([lrow('https://www.instagram.com/reel/ENG1/'), lrow('1789', 'https://www.youtube.com/shorts/SHORT_A1')]);
const own = igOwnSet_({ media: { '555': 'ig:special:9' } });
ok('۱.۱ مالِ موتور: پیوندِ دفتر، شناسهٔ دفتر، و حافظهٔ st.media', igIsOwn_(own, 'x', 'https://www.instagram.com/reel/ENG1/?igsh=1') &&
   igIsOwn_(own, '1789', '') && igIsOwn_(own, '555', '') && !igIsOwn_(own, '999', 'https://www.instagram.com/reel/MANUAL9/'));
ok('۱.۲ شورتزِ موتور از ستونِ «شورتزِ یوتیوب»', own.shorts.SHORT_A1 === 1);
global.igBook_ = () => ledger([]);
ok('۱.۳ دفترِ خالی ⇒ «نمی‌دانیم» (null) و هیچ پستی بیرونی خوانده نمی‌شود', igOwnSet_({}) === null && igIsOwn_(null, '999', ''));
global.igBook_ = () => { throw new Error('دفتر باز نشد'); };
let threw = false; try { igOwnSet_({}); } catch (e) { threw = true; }
ok('۱.۴ خطای دفتر بالا می‌رود تا فراخوان «null» بگیرد (try در igInsights_)', threw && /try \{ own = igOwnSet_\(st\); \} catch \(eOw\) \{ own = null; \}/.test(fs.readFileSync('src/38_Instagram.gs', 'utf8')));

/* ── ۲) الگو و فرضیهٔ ۷ ── */
{
  const old = '2026-10-20 10:00';
  const row = (id, link, v, cap) => { const r = new Array(14).fill(''); r[0] = id; r[1] = old; r[4] = cap; r[5] = link; r[6] = v; return r; };
  const rows = [row('1789', '', 100, 'آیا می‌دانستید'), row('2000', 'https://www.instagram.com/reel/ENG1/', 120, 'جمله'),
                row('9001', 'https://www.instagram.com/reel/MANUAL9/', 5000, 'دستی NotebookLM')];
  global.igBook_ = () => ledger([lrow('https://www.instagram.com/reel/ENG1/'), lrow('1789')]);
  const ow = igOwnSet_({});
  const p1 = igPattern_(rows, Date.parse('2026-10-25T10:00:00Z'), { '1789': 'جملهٔ کوتاه' }, ow);
  const edu = (p1.byFormat || []).find((x) => x.k === 'آموزشی');
  ok('۲.۱ ریلزِ دستی در «آموزشی» شمرده نمی‌شود (فرضیهٔ ۷ پاک)', edu && edu.n === 1 && edu.med === 120, JSON.stringify(p1.byFormat));
  ok('۲.۲ و جدا برگشت', p1.ext.length === 1 && p1.ext[0].id === '9001' && p1.all === 2, JSON.stringify(p1.ext));
  const p0 = igPattern_(rows, Date.parse('2026-10-25T10:00:00Z'), { '1789': 'جملهٔ کوتاه' });
  ok('۲.۳ بی دفتر همان رفتارِ پیشین (همه شمرده)', p0.all === 3 && p0.ext.length === 0);
  const h = ytHypo_([], {}, p1.byFormat);
  const f7 = h.tests.find((t) => /ف۷/.test(t.name));
  ok('۲.۴ فرضیهٔ ۷ همان الگوی پاک‌شده را می‌خوانَد', f7 && f7.nb === 1 && f7.na === 1, JSON.stringify(f7));
}

/* ── ۳) یوتیوب: فقط خواندن، تگ و تاریخ ── */
{
  delete global.__PROPS[PK.YT_EXT];
  const calls = [];
  global.ytPublished_ = () => ({ 'special:83': { videoId: 'REG83' } });
  global.igState_ = () => ({});
  global.igBook_ = () => ledger([lrow('https://www.instagram.com/reel/ENG1/', 'https://www.youtube.com/shorts/SHORT_A1')]);
  global.ytQuotaTake_ = () => true;
  global.ytChannelInfo_ = () => ({ info: { contentDetails: { relatedPlaylists: { uploads: 'UU1' } } } });
  const vid = (id, at, tags, dur) => ({ id, snippet: { publishedAt: at, title: 't ' + id, tags }, contentDetails: { duration: dur } });
  global.ytSvc_ = () => ({
    PlaylistItems: { list: (p, o) => { calls.push('items'); return { items: ['REG83', 'SHORT_A1', 'MAN1', 'OLD1', 'TAGOLD'].map((v) => ({ contentDetails: { videoId: v } })) }; } },
    Videos: { list: (p, o) => { calls.push('list:' + o.id); return { items: [vid('MAN1', '2026-10-26T09:00:00Z', [], 'PT50S'), vid('OLD1', '2025-01-01T00:00:00Z', [], 'PT20M'),
                                                                         vid('TAGOLD', '2026-01-01T00:00:00Z', ['ext-notebooklm'], 'PT40S')] }; },
              update: () => { calls.push('UPDATE'); } },
    Thumbnails: { set: () => { calls.push('THUMB'); } } });
  const r = ytExtScan_();
  const ids = r.items.map((x) => x.id).sort().join(',');
  ok('۳.۱ بیرونی = نه در دفتر و نه شورتزِ موتور؛ ویدئوی پیش از موتور نه، مگر با تگ', ids === 'MAN1,TAGOLD', ids);
  ok('۳.۲ فقط دو فراخوانِ خواندن (۲ واحد)، هیچ نوشتنی', calls.length === 2 && !calls.some((c) => /UPDATE|THUMB/.test(c)) && calls[1] === 'list:MAN1,OLD1,TAGOLD', calls.join(' | '));
  ok('۳.۳ نوع از طولِ ویدئو', r.items.find((x) => x.id === 'MAN1').kind === 'شورتز' && r.items.find((x) => x.id === 'TAGOLD').tag === true);
  calls.length = 0; ytExtScan_();
  ok('۳.۴ روزی یک بار', calls.length === 0);
  const src = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  const body = src.slice(src.indexOf('function ytExtScan_'), src.indexOf('function extLine_'));
  ok('۳.۵ متنِ ytExtScan_ هیچ فراخوانِ نوشتن ندارد', !/\.(update|insert|remove|delete|set)\(/.test(body.replace(/props_\(\)\.setProperty/g, '')));
}

/* ── ۴) خطِ ایمیلِ ۱۰ ── */
{
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  global.__PROPS[PK.YT_EXT] = JSON.stringify({ day: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'), items: [{ id: 'M', at: now, title: 'شورتِ دستی', tag: false, kind: 'شورتز' }] });
  global.__PROPS[PK.IG_EXT] = JSON.stringify({ own: true, items: [{ id: '9', at: now, cap: 'ریلزِ NotebookLM' }, { id: '8', at: '2026-01-01 10:00', cap: 'قدیمی' }] });
  const e = extLine_();
  ok('۴.۱ بخشِ جدا: شمار و نام، «بی تگ» گفته می‌شود، قدیمی نه', e.yt === 1 && e.ig === 1 && /بیرون از موتور/.test(e.line) && /بی تگ/.test(e.line) && /NotebookLM/.test(e.line) && !/قدیمی/.test(e.line), e.line);
  ok('۴.۲ سیم‌کشیِ ایمیلِ ۱۰', /notes\.push\(extLine_\(\)\.line\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
}

/* ── ۵) سقف‌ها و نوشتن‌ها مالِ موتورند ── */
{
  const day = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  const d = igDayLine_({ stats: { day: day, dayN: 3 }, inflight: [] });
  ok('۵.۱ «امروز N از ۶» از شمارندهٔ خودِ موتور (پستِ دستی جای آن را نمی‌گیرد)', /^امروز ۳ از/.test(d.line), d.line);
  const plan = ytPlOrderPlan_([{ id: 'a', videoId: 'EXT' }, { id: 'b', videoId: 'E2' }, { id: 'c', videoId: 'E1' }], (v) => ({ E1: 1, E2: 2 })[v] || 0);
  ok('۵.۲ ویدئوی بیرونی در پلی‌لیستِ موتور پاک نمی‌شود — فقط به آخر می‌رود (پس: پلی‌لیستِ جدا)', plan.moves.every((m) => m.id) && plan.moves.length >= 1);
  const y = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۵.۳ Analytics: شورتزِ موتور «shorts» و بیرونی «ext»؛ درصدِ دیده‌شدن و منحنی‌ها بی شورتز (مثلِ قبل)',
     /show: 'shorts'/.test(y) && /extY\[vids\[v\]\.id\] \? 'ext' : 'other'/.test(y) && /x\.mine && x\.show !== 'shorts' && x\.views > 0\) avpMap/.test(y));
}

Object.keys(sv).forEach((k) => { global[k] = sv[k]; });
summary();
