/* ══ آزمونِ ۱۱.۵ — مقصدها، فیسبوک، نمای چهارحالته، «هر کنترلِ شیت را بک‌اند می‌خوانَد»، و زیرساختِ تولیدِ موازی ══
 *
 * صاحبِ کانال: «تمامِ نقشهٔ راه را از اول تا آخر درست اجرا و کامل تست کنید؛ برگشتن سخت است.»
 * پس هر تیک از **درِ تولید** سنجیده می‌شود: تیک عوض می‌شود، و همان تابعی که یوتیوب/اینستاگرام/فیسبوک/انتخابِ مجموعه صدا
 * می‌زنند جوابِ دیگری می‌دهد. و پیش‌فرض‌ها با رفتارِ پیشین مقایسه می‌شوند، نه با یک عددِ دلخواه.
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const tg = [];
global.tgEnabled_ = () => true;
global.tgSend_ = (t) => { tg.push(String(t)); return { ok: true }; };
global.tgApi_ = (m, p) => { tg.push(String((p && p.text) || '')); return { ok: true }; };
const resetProps = (keys) => keys.forEach((k) => { delete global.__PROPS[k]; });
const destRow = (kind) => { const r = destRead_().rows[kind]; return r; };
const tabRows = () => { const sh = destTab_(getHub_()); return sh.getRange(2, 1, sh.getLastRow() - 1, DEST_HEADERS.length).getValues(); };

/* ── ۱) تبِ مقصدها: بذر = رفتارِ پیشین ── */
{
  destMemoClear_();
  const g = destRead_();
  ok('۱.۱ تب از خودِ تب خوانده شد و سه ردیف بذر خورد', g.src === 'tab' && tabRows().length === 3, g.src + ' ' + g.why);
  ok('۱.۲ یوتیوب: روشن برای هر دو برنامه (همان امروز)', destGate_('yt', 'special').ok && destGate_('yt', 'variety').ok);
  ok('۱.۳ اینستاگرام: روشن برای درس‌نامه؛ «از همه جا» در اینستاگرام نیست (همان امروز)', destGate_('ig', 'special').ok && !destGate_('ig', 'variety').ok);
  ok('۱.۴ فیسبوک: پیش‌فرض خاموش', !destGate_('fb', 'special').ok && /خاموش/.test(destGate_('fb', 'special').why));
  ok('۱.۵ سقفِ خالی ⇒ سقفِ کد', destCap_('yt', 90) === 90 && destCap_('ig', 6) === 6);
  ok('۱.۶ بذر دوباره ردیف نمی‌سازد', destSeed_(getHub_()).length === 0 && tabRows().length === 3);
  ok('۱.۷ ytShowOff_ با بذر همان پیشین است (هیچ برنامه‌ای خاموش نیست)', !ytShowOff_('special') && !ytShowOff_('variety'));
}

/* ── ۲) تیک از تخته ⇒ همان تب ⇒ همان دروازه ── */
{
  destBoardSave_([{ kind: 'yt', on: true, shows: ['special'], cap: 3 }]);
  ok('۲.۱ «از همه جا» از برنامه‌های یوتیوب برداشته شد ⇒ ytShowOff_ و ytItemOff_ می‌بینند', ytShowOff_('variety') && ytItemOff_({ show: 'variety', ep: '95' }) && !ytShowOff_('special'));
  ok('۲.۲ سلولِ تب همان است که نوشته شد', tabRows()[0][DC.SHOWS - 1] === 'درس‌نامه' || /درس/.test(String(tabRows()[0][DC.SHOWS - 1])), String(tabRows()[0][DC.SHOWS - 1]));
  ok('۲.۳ سقفِ تب کوچک‌تر از کد ⇒ سقفِ تب', destCap_('yt', 90) === 3);
  resetProps([PK.YT_QUOTA]);
  const t = [1, 2, 3, 4].map(() => ytQuotaTake_(1, true));
  ok('۲.۴ ytQuotaTake_ پس از ۳ آپلود می‌ایستد', t.join(',') === 'true,true,true,false', t.join(','));
  resetProps([PK.YT_QUOTA]);
  /* صفِ یوتیوب: ردیفِ برنامهٔ برداشته‌شده کنار می‌رود و با برگشتنِ تیک برمی‌گردد — هیچ‌چیز پاک نمی‌شود */
  resetProps([PK.YT_DUE, PK.YT_DUE_PARKED]);
  global.__PROPS[PK.YT_DUE] = JSON.stringify([{ key: 'variety:95', show: 'variety', ep: '95', folderId: 'F95' },
                                              { key: 'special:81', show: 'special', ep: '81', folderId: 'F81' }]);
  const l1 = ytDueList_();
  ok('۲.۵ صف: variety کنار، درس‌نامه می‌ماند', l1.length === 1 && l1[0].key === 'special:81' && ytDueParked_().some((x) => x.key === 'variety:95'));
  destBoardSave_([{ kind: 'yt', on: true, shows: ['special', 'variety'], cap: '' }]);
  const l2 = ytDueList_();
  ok('۲.۶ تیک برگشت ⇒ ردیف به صف برگشت', l2.some((x) => x.key === 'variety:95') && !ytShowOff_('variety') && destCap_('yt', 90) === 90);
  const r0 = destBoardSave_([{ kind: 'ig', on: true, shows: [], cap: '' }]);
  ok('۲.۷ «روشن ولی هیچ برنامه‌ای» ⇒ خاموش، با گفتن', !destRow('ig').on && /خاموش شد/.test(r0.note), r0.note);
  destBoardSave_([{ kind: 'ig', on: true, shows: ['special'], cap: 2 }]);
  ok('۲.۸ برگشتِ اینستاگرام با سقفِ ۲', destGate_('ig', 'special').ok && destCap_('ig', 6) === 2);
  resetProps([PK.YT_DUE, PK.YT_DUE_PARKED]);
}

/* ── ۳) ویرایشِ دستیِ خودِ تب هم همان اثر را دارد ── */
{
  const sh = destTab_(getHub_());
  sh.getRange(2, DC.ON).setValue('خیر');
  destMemoClear_();
  ok('۳.۱ «خیر» در خودِ تب ⇒ یوتیوب برای هر دو خاموش', ytShowOff_('special') && ytShowOff_('variety') && /خاموش است/.test(destGate_('yt', 'special').why));
  sh.getRange(2, DC.ON).setValue('بله');
  sh.getRange(2, DC.SHOWS).setValue('درس‌نامه، چیزِ ناشناخته');
  destMemoClear_();
  ok('۳.۲ نامِ ناشناخته خوانده نمی‌شود و گفته می‌شود', destRow('yt').bad.indexOf('چیزِ ناشناخته') !== -1 && /چیزِ ناشناخته/.test(destStatus_().line));
  sh.getRange(2, DC.SHOWS).setValue('همه');
  destMemoClear_();
  ok('۳.۳ «همه» ⇒ همهٔ برنامه‌ها', !ytShowOff_('variety') && !ytShowOff_('special'));
  /* تب خوانده نشد ⇒ آخرین خواندنِ سالم، نه روشن‌کردنِ چیزِ خاموش */
  sh.getRange(4, DC.ON).setValue('خیر'); destMemoClear_(); destRead_();
  const sv = global.getHub_;
  global.getHub_ = () => { throw new Error('هاب در دسترس نیست'); };
  destMemoClear_();
  const c = destRead_();
  ok('۳.۴ تب خوانده نشد ⇒ آخرین خواندنِ سالم (PK.DEST_CACHE)', c.src === 'cache' && !c.rows.fb.on && c.rows.yt.on, c.src);
  resetProps([PK.DEST_CACHE]); destMemoClear_();
  const d = destRead_();
  ok('۳.۵ بی هیچ حافظه‌ای ⇒ بذر (فیسبوک خاموش، بقیه روشن)', d.src === 'default' && !d.rows.fb.on && d.rows.yt.on && d.rows.ig.on);
  global.getHub_ = sv; destMemoClear_();
  ok('۳.۶ خطِ روزانه وضعِ هر سه را می‌گوید', /یوتیوب روشن/.test(destStatus_().line) && /فیسبوک خاموش/.test(destStatus_().line), destStatus_().line);
  ok('۳.۷ «آخرین وضعیت» را موتور می‌نویسد', destNote_('yt', 'آزمون') && /آزمون/.test(String(tabRows()[0][DC.LAST - 1])) && !destNote_('yt', 'آزمون'));
}

/* ── ۴) اینستاگرام از درِ انتشار ── */
{
  global.__PROPS[PK.IG_ACCT] = JSON.stringify({ ig: 'IG1', user: 'truth.traces', page: 'PG1', pageName: 'Truth Trace' });
  destBoardSave_([{ kind: 'ig', on: false, shows: ['special'] }]);
  const st = { stats: {} };
  const r = igStepPub_({ key: 'ig:special:30', ep: 30 }, { plan: {}, video: 'https://v', cover: 'https://c' }, st, Date.now() + 1000);
  ok('۴.۱ اینستاگرامِ خاموش ⇒ ریلز سرِ انتشار می‌ایستد (wait)، چیزی ساخته نمی‌شود', r && r.wait && /خاموش/.test(r.wait), JSON.stringify(r));
  ok('۴.۲ و همین در «آخرین وضعیت» نشست', /خاموش/.test(String(tabRows()[1][DC.LAST - 1])), String(tabRows()[1][DC.LAST - 1]));
  destBoardSave_([{ kind: 'ig', on: true, shows: ['special'], cap: 1 }]);
  const st2 = { stats: { day: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'), dayN: 1 } };
  const r2 = igStepPub_({ key: 'ig:special:31', ep: 31 }, { plan: {}, video: 'https://v', cover: 'https://c' }, st2, Date.now() + 1000);
  ok('۴.۳ سقفِ تب (۱) بر سقفِ کد (۶) مقدم است', r2 && /سهمِ امروز/.test(r2.wait || ''), JSON.stringify(r2));
  destBoardSave_([{ kind: 'ig', on: true, shows: ['special'], cap: '' }]);
  const srcI = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  ok('۴.۴ شورتز (یوتیوب) از دروازهٔ یوتیوب رد می‌شود', /destGate_\('yt', ENRICH_SHOW_SPECIAL\)/.test(srcI.slice(srcI.indexOf('function igShortPub_'), srcI.indexOf('function igShortPub_') + 3000)));
}

/* ── ۵) فیسبوک ── */
{
  const calls = [];
  let fail = '';
  const saveU = global.UrlFetchApp;
  const resp = (code, j) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(j) });
  global.UrlFetchApp = { fetch: (url, opt) => {
    calls.push({ url, opt });
    if (/fields=access_token/.test(url)) return fail === 'tok' ? resp(400, { error: { message: '(#200) pages_manage_posts' } }) : resp(200, { access_token: 'PAGETOK', name: 'Truth Trace' });
    if (/rupload/.test(url)) return resp(200, { success: true });
    if (/video_reels/.test(url)) {
      const p = opt.payload || {};
      if (p.upload_phase === 'start') return resp(200, { video_id: 'V9', upload_url: 'https://rupload.facebook.com/x' });
      if (p.upload_phase === 'finish') return resp(200, { success: true });
    }
    if (/\/V9\?/.test(url)) return resp(200, { permalink_url: '/reel/V9' });
    return resp(404, {});
  } };
  resetProps([PK.FB_DAY, PK.FB_Q]);
  const plan = { video: 'https://cdn/v.mp4', caption: 'پرسش؟\nمتن\nنسخهٔ کامل در یوتیوب: لینک در بیو', yt: 'https://youtu.be/X', ep: 30, series: 'معرفت' };
  ok('۵.۱ فیسبوکِ خاموش ⇒ هیچ فراخوانی', fbCross_(plan).off && calls.length === 0);
  destBoardSave_([{ kind: 'fb', on: true, shows: ['special'], cap: 2 }]);
  fail = 'tok';
  const w = fbAfterReel_({ key: 'ig:special:30', folderId: 'FO', part: 1 }, plan);
  ok('۵.۲ کلیدِ بی‌اجازهٔ صفحه ⇒ علتِ دقیق، به صف، و در «آخرین وضعیت»', w.wait && /pages_manage_posts/.test(plan.fbWhy) &&
     fbQueue_().length === 1 && /pages_manage_posts/.test(String(tabRows()[2][DC.LAST - 1])), plan.fbWhy);
  fail = ''; calls.length = 0;
  const r = fbCross_(plan);
  const start = calls.find((c) => c.opt.payload && c.opt.payload.upload_phase === 'start');
  const up = calls.find((c) => /rupload/.test(c.url));
  const fin = calls.find((c) => c.opt.payload && c.opt.payload.upload_phase === 'finish');
  ok('۵.۳ سه گامِ Reels API با کلیدِ صفحه', r.ok && start && /\/PG1\/video_reels$/.test(start.url) && up && up.opt.headers.file_url === plan.video &&
     /OAuth PAGETOK/.test(up.opt.headers.Authorization) && fin && fin.opt.payload.video_state === 'PUBLISHED');
  ok('۵.۴ متنِ فیسبوک پیوندِ خودِ درس را دارد، نه «لینک در بیو»', /youtu\.be\/X/.test(fin.opt.payload.description) && !/لینک در بیو/.test(fin.opt.payload.description));
  ok('۵.۵ شناسه، نشانی و شمارِ روز ثبت شد؛ کپشن به تلگرام', plan.fbId === 'V9' && plan.fbUrl === 'https://www.facebook.com/reel/V9' &&
     JSON.parse(global.__PROPS[PK.FB_DAY]).n === 1 && tg.some((t) => /فیسبوک — ریلز/.test(t)));
  ok('۵.۶ بارِ دوم هیچ فراخوانی نمی‌کند', (calls.length = 0, fbCross_(plan).ok) && calls.length === 0);
  global.__PROPS[PK.FB_DAY] = JSON.stringify({ day: Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd'), n: 2 });
  const p2 = { video: 'https://cdn/w.mp4', caption: 'x' };
  ok('۵.۷ سقفِ روزِ تب (۲) ⇒ wait', /سهمِ امروزِ فیسبوک/.test(fbCross_(p2).why || ''));
  const srcI = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  ok('۵.۸ پس از انتشارِ ریلز صدا زده می‌شود، و صف در igTick می‌دود', /fbAfterReel_\(it, plan\)/.test(srcI) && /fbQueueRun_\(deadline\)/.test(srcI));
  ok('۵.۹ وضعِ فیسبوک در خطِ روزانه', /فیسبوک: روشن/.test(fbStatus_().line) && fbStatus_().queued === 1);
  global.UrlFetchApp = saveU;
  destBoardSave_([{ kind: 'fb', on: false, shows: ['special'], cap: '' }]);
  resetProps([PK.FB_DAY, PK.FB_Q]);
}

/* ── ۶) تولیدِ موازی: پیش‌فرض = همان رفتار؛ تیک ⇒ گردش ── */
{
  const mk = (key, row, st, last, order, par) => {
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = key; v[SC.NAME - 1] = 'نامِ ' + key; v[SC.STATUS - 1] = st; v[SC.LAST_EP_AT - 1] = last;
    v[SC.ORDER - 1] = order; v[SC.PAR - 1] = par || '';
    return { row, key, vals: v };
  };
  const mkReg = (rows) => { const r = { rows, byKey: {}, sheet: { getRange: () => ({ setValue: () => {} }) } }; rows.forEach((x) => { r.byKey[x.key] = x; }); return r; };
  const sv = { seriesHasWork_: global.seriesHasWork_, seriesEligible_: global.seriesEligible_ };
  global.seriesHasWork_ = () => true;
  global.seriesEligible_ = () => true;
  resetProps([PK.SP_PIN]);
  const base = () => [mk('A', 2, SST.ACTIVE, '2026/10/24 08:00', 1), mk('B', 3, SST.NEW, '', 2), mk('C', 4, SST.NEW, '', 3)];
  const pickOld = (reg) => pickSeriesPlan_({}, reg, { byKey: {} }, null, { noPar: true }).rec.key;
  const pick = (reg) => pickSeriesPlan_({}, reg, { byKey: {} }).rec.key;
  ok('۶.۱ هیچ تیکی ⇒ همان انتخابِ پیشین (A — نیمه‌کاره)', pick(mkReg(base())) === 'A' && pick(mkReg(base())) === pickOld(mkReg(base())));
  ok('۶.۲ ستون موجود است و پیش‌فرضش خالی (خاموش)', SERIES_HEADERS[SC.PAR - 1] && !seriesParOn_(base()[1].vals));
  const r1 = base(); r1[2].vals[SC.PAR - 1] = 'بله';
  const p1 = pickSeriesPlan_({}, mkReg(r1), { byKey: {} });
  ok('۶.۳ تیکِ C ⇒ امروز C (هرگز قسمت نگرفته)، با دلیل', p1.rec.key === 'C' && p1.par && p1.par.why === 'تیکِ موازی' && p1.par.pool.slice().sort().join(',') === 'A,C', JSON.stringify(p1.par));
  const r2 = base(); r2[2].vals[SC.PAR - 1] = 'بله'; r2[2].vals[SC.STATUS - 1] = SST.ACTIVE; r2[2].vals[SC.LAST_EP_AT - 1] = '2026/10/25 08:00';
  ok('۶.۴ فردا ⇒ A (دیرتر قسمت گرفته) — مجموعهٔ اصلی از گردش بیرون نمی‌افتد', pick(mkReg(r2)) === 'A');
  const r3 = base(); r3[2].vals[SC.PAR - 1] = 'بله'; r3[2].vals[SC.STATUS - 1] = SST.ACTIVE; r3[2].vals[SC.LAST_EP_AT - 1] = '2026/10/23 08:00';
  ok('۶.۵ پس‌فردا ⇒ C دوباره (یک‌درمیان)', pick(mkReg(r3)) === 'C');
  ok('۶.۶ B (تیک‌نخورده، در نوبت) هرگز وارد نمی‌شود', [mkReg(r1), mkReg(r2), mkReg(r3)].every((g) => pick(g) !== 'B'));
  global.__PROPS[PK.SP_PIN] = 'series:B';
  ok('۶.۷ سنجاقِ دستی بالاتر از گردش است', pick(mkReg(r1)) === 'B');
  resetProps([PK.SP_PIN]);
  const old = CFG.SERIES_PAR_MAX; CFG.SERIES_PAR_MAX = 1;
  const r4 = base(); r4[1].vals[SC.PAR - 1] = 'بله';
  r4.forEach((x) => { x.vals[SC.MCAT - 1] = 'فلسفی و اعتقادی'; });   // ۱۱.۷: تیکِ موازی فقط برای دسته‌دستی
  const sv2 = global.readSeriesReg_;
  global.readSeriesReg_ = () => mkReg(r4);
  const s1 = seriesParSave_({}, 'C', true);
  ok('۶.۸ سقفِ مجموعه‌های موازی رعایت می‌شود', !s1.ok && /سقفِ تولیدِ موازی/.test(s1.message));
  const s2 = seriesParSave_({}, 'B', false);
  ok('۶.۹ برداشتنِ تیک همان ستون را خالی می‌کند', s2.ok && r4[1].vals[SC.PAR - 1] === '' && !s2.on);
  r4[2].vals[SC.MCAT - 1] = '';
  CFG.SERIES_PAR_MAX = 3;
  const s3 = seriesParSave_({}, 'C', true);
  ok('۶.۹-ب (۱۱.۷) مجموعهٔ بی دستهٔ دستی تیکِ موازی نمی‌گیرد، با علت', !s3.ok && /دستهٔ دستی/.test(s3.message) && r4[2].vals[SC.PAR - 1] === '', s3.message);
  const hv = CFG.HANDOUT_VIZ_ENABLED; CFG.HANDOUT_VIZ_ENABLED = false; r4[2].vals[SC.MCAT - 1] = 'x';
  const s4 = seriesParSave_({}, 'C', true);
  CFG.HANDOUT_VIZ_ENABLED = hv;
  ok('۶.۹-پ (۱۱.۷) نمودارِ جزوه خاموش ⇒ تیکِ موازی باز نمی‌شود', !s4.ok && /جزوه/.test(s4.message));
  global.readSeriesReg_ = sv2; CFG.SERIES_PAR_MAX = old;
  const st6 = seriesParStatus_({}, mkReg(r1));
  ok('۶.۱۰ خطِ روزانه وقتی روشن است می‌گوید، خاموش ساکت', st6.on && /تولیدِ موازی/.test(st6.line) && seriesParStatus_({}, mkReg(base())).line === '');
  Object.assign(global, sv);
}

/* ── ۷) نمای چهارحالته ── */
{
  const S = seriesStates_({ groups: [{ series: [
    { name: 'a', status: SST.DONE, hasWork: false }, { name: 'b', status: SST.ACTIVE, hasWork: false },
    { name: 'c', status: SST.ACTIVE, hasWork: true }, { name: 'd', status: SST.REOPENED, hasWork: true },
    { name: 'e', status: SST.NEW, hasWork: true, order: 5, morder: null }, { name: 'f', status: SST.NEW, hasWork: true, order: 2, morder: null },
    { name: 'g', status: SST.SKIPPED, hasWork: false } ] }], excluded: [{ name: 'h', status: SST.NEW }] });
  ok('۷.۱ انجام‌شده = تمام‌شده + «در حال تولیدِ» بی‌کار', S.done.map((x) => x.x.name).join(',') === 'a,b');
  ok('۷.۲ در جریان = در حال تولید با کار + قسمتِ تازه', S.doing.map((x) => x.x.name).join(',') === 'c,d');
  ok('۷.۳ در انتظار به ترتیبِ نوبت', S.wait.map((x) => x.x.name).join(',') === 'f,e');
  ok('۷.۴ نرفته = نادیده + آموزشی‌نبود، با دلیل', S.out.map((x) => x.x.name).join(',') === 'g,h' && S.out.every((x) => x.why));
}

/* ── ۸) «هر کنترلِ شیت را بک‌اند واقعاً می‌خوانَد» ── */
{
  const src = {};
  fs.readdirSync('src').filter((f) => /\.gs$/.test(f)).forEach((f) => { src[f] = fs.readFileSync('src/' + f, 'utf8'); });
  const fnBody = (name) => {
    for (const f of Object.keys(src)) {
      const s = src[f], i = s.indexOf('function ' + name + '(');
      if (i === -1) continue;
      const j = s.indexOf('\nfunction ', i + 10);
      return { file: f, body: s.slice(i, j === -1 ? s.length : j) };
    }
    return null;
  };
  const calls = (body) => (body.match(/\b([A-Za-z_$][\w$]*)\(/g) || []).map((x) => x.slice(0, -1));
  /* «لمس» یعنی خودِ تابع یا یکی از تابع‌هایی که مستقیم صدا می‌زند همان store را دارد */
  const touches = (name, store) => {
    const b = fnBody(name);
    if (!b) return false;
    if (b.body.indexOf(store) !== -1) return true;
    return calls(b.body).some((c) => { const cb = c !== name && fnBody(c); return cb && cb.body.indexOf(store) !== -1; });
  };
  const html = (() => { try { return uiBoardHtml(); } catch (e) { return ''; } })();
  const used = Array.from(new Set((html.match(/\.(ui[A-Z]\w*)\(/g) || []).map((x) => x.slice(1, -1))));
  const reg = {}; BOARD_CONTROLS_.forEach((c) => { reg[c.ui] = c; });
  const allUi = Object.keys(src).reduce((a, f) => a.concat((src[f].match(/^function (ui[A-Z]\w*)\(/mg) || []).map((x) => x.slice(9, -1))), []);
  const missing = allUi.filter((u) => !reg[u]);
  ok('۸.۱ هر تابعِ ui* (' + allUi.length + ') در فهرستِ کنترل‌ها ردیف دارد', allUi.length >= 20 && !missing.length, missing.join(','));
  ok('۸.۲ تخته دست‌کم ۱۵ کنترل را واقعاً صدا می‌زند و همه در فهرست‌اند', used.length >= 15 && used.every((u) => reg[u]), used.filter((u) => !reg[u]).join(','));
  const bad = [];
  BOARD_CONTROLS_.filter((c) => c.kind === 'setting').forEach((c) => {
    if (!fnBody(c.ui)) bad.push(c.ui + ': نیست');
    else if (c.writer !== c.ui && calls(fnBody(c.ui).body).indexOf(c.writer) === -1) bad.push(c.ui + ' ⇏ ' + c.writer);
    if (!touches(c.writer, c.store)) bad.push(c.writer + ' به ' + c.store + ' نمی‌نویسد');
    if (!touches(c.reader, c.store)) bad.push(c.reader + ' از ' + c.store + ' نمی‌خوانَد');
    const rb = fnBody(c.reader);
    const prod = rb && Object.keys(src).some((f) => f !== '15_Board.gs' &&
      src[f].split('function ' + c.reader + '(').join('').match(new RegExp('\\b' + c.reader.replace(/\$/g, '\\$') + '\\(')));
    if (!prod) bad.push(c.reader + ' بیرون از تخته صدا زده نمی‌شود');
  });
  ok('۸.۳ هر تنظیم: نویسنده و خوانندهٔ تولید هر دو همان جا را لمس می‌کنند، و خواننده بیرون از تخته صدا زده می‌شود', !bad.length, bad.join(' | '));
  const badA = BOARD_CONTROLS_.filter((c) => c.kind === 'action').filter((c) => !fnBody(c.runs) || calls(fnBody(c.ui).body).indexOf(c.runs) === -1).map((c) => c.ui);
  ok('۸.۴ هر دکمهٔ کنش کارِ اعلام‌شده‌اش را واقعاً صدا می‌زند', !badA.length, badA.join(','));
  /* تب‌های کنترلیِ هاب: هر تبی که آدم ویرایش می‌کند، خواننده‌ای در تولید دارد */
  const tabs = ['CAL_TAB', 'DEST_TAB', 'SERIES_TAB'];
  const noReader = tabs.filter((t) => !Object.keys(src).some((f) => f !== '00_Config.gs' && f !== '15_Board.gs' && src[f].indexOf('CFG.' + t) !== -1));
  ok('۸.۵ تب‌های کنترلی (تقویم، مقصدها، مجموعه‌ها) خواننده‌ای بیرون از تخته دارند', !noReader.length, noReader.join(','));
  ok('۸.۶ پنل‌های تازه در تخته: مقصدها، چهارحالته، و تابعِ تیکِ موازی', /id="destBox"/.test(html) && /id="stateBox"/.test(html) &&
     /\.uiDestSave\(/.test(html) && /\.uiParSave\(/.test(html));
  const pc = parCell_({ key: 'K"x', par: true, hasWork: true, status: SST.ACTIVE });
  ok('۸.۷ خانهٔ موازی در هر ردیف: تیک‌خورده از همان seriesParOn_، کلید فرار داده‌شده، و در حلقهٔ ردیف‌ها', /class="parTick"[^>]*checked/.test(pc) &&
     /data-key="K&quot;x"/.test(pc) && /H\.push\(parCell_\(x\)\)/.test(src['15_Board.gs']) && /par: seriesParOn_\(v\)/.test(src['15_Board.gs']), pc);
  ok('۸.۸ مجموعهٔ کار‌تمام و تیک‌نخورده تیکِ غیرفعال دارد', /disabled/.test(parCell_({ key: 'k', par: false, hasWork: false, status: SST.DONE })));
}

/* ── ۹) ۱۱.۶: بایگانیِ کامل — شورتز و ویدئوهای پیشینِ کانال هم، از پلی‌لیستِ آپلودها ── */
{
  const docs = [];
  const svA = global.tgApi_;
  global.tgApi_ = (m, p) => { if (m === 'sendDocument') docs.push(p); return { ok: true }; };
  resetProps([PK.YT_DESC_ARCH]);
  const sv = { ytSvc_: global.ytSvc_, ytQuotaTake_: global.ytQuotaTake_, ytPublished_: global.ytPublished_, ytChannelInfo_: global.ytChannelInfo_ };
  global.ytQuotaTake_ = () => true;
  global.ytPublished_ = () => ({ 'special:1': { videoId: 'L1', url: 'u1', title: 'درس ۱' }, 'special:2': { videoId: 'L2', url: 'u2', title: 'درس ۲' } });
  global.ytChannelInfo_ = () => ({ info: { contentDetails: { relatedPlaylists: { uploads: 'UU1' } } } });
  const vids = { L1: ['PT14M', 'درس'], L2: ['PT15M', 'درس'], S1: ['PT58S', 'شورت'], S2: ['PT2M10S', 'پرسش #Shorts'], O1: ['PT9M', 'ویدئوی قدیمیِ کانال'] };
  global.ytSvc_ = () => ({
    PlaylistItems: { list: (part, o) => o.pageToken ? { items: [{ contentDetails: { videoId: 'O1' } }] }
                                                    : { items: ['L1', 'S1', 'S2'].map((v) => ({ contentDetails: { videoId: v } })), nextPageToken: 'p2' } },
    Videos: { list: (part, o) => ({ items: o.id.split(',').map((id) => ({ id, snippet: { title: vids[id][1], description: 'اصلِ ' + id },
                                                                             status: { privacyStatus: id === 'O1' ? 'private' : 'public' },
                                                                             contentDetails: { duration: vids[id][0] } })) }) } });
  const r = ytDescArchive_(60000);
  const txt = docs.map((d) => (d.document.getDataAsString ? d.document.getDataAsString() : String(d.document))).join('\n');
  ok('۹.۱ همهٔ آپلودها (دو صفحه) + آنچه فقط در دفتر است: ۵ ویدئو', r.sent === 5, JSON.stringify(r));
  ok('۹.۲ نوع هر کدام: ۲ بلند، ۲ شورتز (≤ ۳ دقیقه یا #Shorts)، ۱ دیگر', /\[بلند\] special:1/.test(txt) && (txt.match(/\[شورتز\]/g) || []).length === 2 &&
     /\[دیگر\]/.test(txt) && /اصلِ S2/.test(txt) && /وضعیت: private/.test(txt), txt.slice(0, 200));
  ok('۹.۳ خطِ روزانه شمار و نوع را می‌گوید', /5 ویدئو/.test(ytDescArchLine_()) && /2 شورتز/.test(ytDescArchLine_()) && /کامل/.test(ytDescArchLine_()), ytDescArchLine_());
  docs.length = 0;
  ok('۹.۴ تمام‌شده دوباره نمی‌رود', ytDescArchive_(60000).sent === 0 && !docs.length);
  /* دورِ ۱ِ واقعی (۱۱.۰) فقط بلندها را برد؛ دورِ ۲ همان‌ها را تکرار نمی‌کند */
  global.__PROPS[PK.YT_DESC_ARCH] = JSON.stringify({ rev: 1, done: ['L1', 'L2'], part: 1, finished: 'x', n: { 'بلند': 2 } });
  const r2 = ytDescArchive_(60000);
  ok('۹.۵ پس از دورِ ۱ (۱۱.۰، فقط بلندها) دورِ ۲ فقط شورتزها و دیگری را می‌برد', r2.sent === 3 && JSON.parse(global.__PROPS[PK.YT_DESC_ARCH]).done.length === 5, JSON.stringify(r2));
  Object.assign(global, sv); global.tgApi_ = svA;
  ok('۹.۶ ytDescHuman_: اثرِ برابر ⇒ آزاد؛ ویرایش‌شده یا بی اثر ⇒ نگه‌دار؛ خوانده‌نشده ⇒ هیچ', (function () {
    resetProps([PK.YT_DESC_MINE]);
    const y = (d) => ({ Videos: { list: () => (d === null ? { items: [] } : { items: [{ snippet: { description: d } }] }) } });
    global.ytQuotaTake_ = () => true;
    ytDescMineSet_('A', 'متنِ موتور');
    const a = ytDescHuman_(y('متنِ موتور'), 'A'), b = ytDescHuman_(y('ویرایش‌شده'), 'A'), c = ytDescHuman_(y('هر چه'), 'B'), d = ytDescHuman_(y(null), 'A');
    Object.assign(global, sv);
    return !a.keep && b.keep && b.live === 'ویرایش‌شده' && c.keep && /پیش از ۱۱.۶/.test(c.why) && d.keep && d.live === null;
  })());
}

/* ── ۱۰) ۱۱.۷: «هیچ تصمیمی روی دستهٔ خودکار» ── */
{
  const mk = (key, row, st, order, mcat, cat, extra) => {
    const v = new Array(SERIES_HEADERS.length).fill('');
    v[SC.KEY - 1] = key; v[SC.NAME - 1] = 'نامِ ' + key; v[SC.STATUS - 1] = st; v[SC.ORDER - 1] = order;
    v[SC.MCAT - 1] = mcat || ''; v[SC.CAT - 1] = cat || 'علمی و آموزشی'; v[SC.JUDGED - 1] = '2026-10-01';
    Object.assign(v, extra || {});
    return { row, key, vals: v };
  };
  const mkReg = (rows) => { const r = { rows, byKey: {} }; rows.forEach((x) => { r.byKey[x.key] = x; }); return r; };
  const sv = { seriesHasWork_: global.seriesHasWork_, seriesEligible_: global.seriesEligible_ };
  global.seriesHasWork_ = () => true; global.seriesEligible_ = () => true;
  resetProps([PK.SP_PIN]);
  ok('۱۰.۰ پیش‌فرض: دستهٔ خودکار تصمیم نمی‌سازد', CFG.SERIES_AUTO_CAT_TRUST === false);
  /* A خودکار با اولویت ۱، B دسته‌دستی با اولویت ۵ ⇒ B؛ پیش از ۱۱.۷ A می‌آمد */
  const rows = () => [mk('A', 2, SST.NEW, 1, '', 'علمی و آموزشی'), mk('B', 3, SST.NEW, 5, 'فلسفی و اعتقادی', '', { [SC.MORDER - 1]: '2' })];
  const p1 = pickSeriesPlan_({}, mkReg(rows()), { byKey: {} });
  ok('۱۰.۱ مجموعهٔ تازه فقط با شمارهٔ دستی شروع می‌شود (B، نه A با اولویتِ خودکارِ بهتر)', p1.rec && p1.rec.key === 'B' && p1.heldAuto === 1, JSON.stringify({ k: p1.rec && p1.rec.key, h: p1.heldAuto }));
  CFG.SERIES_AUTO_CAT_TRUST = true;
  ok('۱۰.۲ و با کلیدِ قدیم همان رفتارِ پیشین (A — دستهٔ دستیِ بی شماره هیچ امتیازی ندارد)', pickSeriesPlan_({}, mkReg([mk('A', 2, SST.NEW, 1, '', 'علمی و آموزشی'), mk('B', 3, SST.NEW, 5, 'فلسفی و اعتقادی')]), { byKey: {} }).rec.key === 'A');
  CFG.SERIES_AUTO_CAT_TRUST = false;
  const onlyAuto = mkReg([mk('A', 2, SST.NEW, 1)]);
  ok('۱۰.۳ هیچ دسته‌دستیِ در نوبت ⇒ مجموعهٔ تازه شروع نمی‌شود، و مسئلهٔ روز گفته می‌شود',
     !pickSeriesPlan_({}, onlyAuto, { byKey: {} }).rec && /هیچ مجموعه‌ای با «شمارهٔ دستی» در نوبت نیست/.test(seriesCatLine_(onlyAuto).problem));
  const lab = mkReg([mk('L', 2, SST.NEW, 1, 'فلسفی و اعتقادی')]);
  ok('۱۰.۳-ب (۱۱.۹) فقط دستهٔ دستی (بی شماره) = برچسب: وارد نوبت نمی‌شود، ولی داوری قفل است',
     !pickSeriesPlan_({}, lab, { byKey: {} }).rec && seriesManualLock_(lab.rows[0].vals) && /بی شماره/.test(seriesCatLine_(lab).line));
  const act = mkReg([mk('A', 2, SST.ACTIVE, 1), mk('B', 3, SST.NEW, 5, 'فلسفی و اعتقادی', '', { [SC.MORDER - 1]: '1' })]);
  ok('۱۰.۴ مجموعهٔ «در حال تولید» (هر دسته‌ای) تا پایان ادامه دارد — کارِ نیمه‌کاره رها نمی‌شود', pickSeriesPlan_({}, act, { byKey: {} }).rec.key === 'A');
  const mo = mkReg([mk('A', 2, SST.NEW, 1), mk('M', 4, SST.NEW, 9, '', '', { [SC.MORDER - 1]: '1' })]);
  ok('۱۰.۵ شمارهٔ دستی (بی دسته) هم «دستی» است و شروع می‌شود', pickSeriesPlan_({}, mo, { byKey: {} }).rec.key === 'M');
  global.__PROPS[PK.SP_PIN] = 'cat:علمی و آموزشی';
  const pc = pickSeriesPlan_({}, mkReg(rows()), { byKey: {} });
  ok('۱۰.۶ سنجاقِ دسته فقط دستهٔ دستی را می‌گیرد (دستهٔ خودکارِ «علمی و آموزشی» ⇒ هیچ)', !pc.rec || pc.rec.key !== 'A', JSON.stringify(pc.rec && pc.rec.key));
  resetProps([PK.SP_PIN]);
  const v0 = rows()[0].vals, v1 = rows()[1].vals;
  ok('۱۰.۷ seriesCatTrusted_ / منشأ', seriesCatTrusted_(v0) === '' && seriesCatTrusted_(v1) === 'فلسفی و اعتقادی' &&
     seriesCatOrigin_(v1) === 'دستی' && seriesCatOrigin_(v0) === 'خودکار (مدل)' && seriesCatOf_(v0) === 'علمی و آموزشی');
  const src14 = fs.readFileSync('src/14_Special.gs', 'utf8'), src30 = fs.readFileSync('src/30_Recap.gs', 'utf8');
  ok('۱۰.۸ گوینده فقط از دستهٔ دستی انتخاب می‌شود (درس‌نامه و مرور)', /ensureCast_\(ep, ENRICH_SHOW_SPECIAL, epNum, seriesCatTrusted_\(rec\.vals\)\)/.test(src14) &&
     /ensureCast_\(ep, ENRICH_SHOW_SPECIAL, epNum, seriesCatTrusted_\(pick\.rec\.vals\)\)/.test(src30));
  /* فهرستِ بازبینی */
  const reg = mkReg([mk('A', 2, SST.NEW, 1, '', 'علمی و آموزشی', { [SC.ABOUT - 1]: 'آموزشِ ترید' }), mk('B', 3, SST.ACTIVE, 5, 'فلسفی و اعتقادی', 'دینی', { [SC.ABOUT - 1]: 'معرفت‌شناسی' })]);
  const rr = seriesCatReviewRows_(reg);
  ok('۱۰.۹ فهرستِ بازبینی: دستی‌ها اول؛ دستهٔ فعلی، منشأ، دستهٔ خودکار و موضوعِ واقعی', rr[0][0] === 'B' && rr[0][2] === 'فلسفی و اعتقادی' && rr[0][3] === 'دستی' &&
     rr[0][4] === 'دینی' && rr[0][6] === 'معرفت‌شناسی' && rr[1][3] === 'خودکار (مدل)' && rr[1][6] === 'آموزشِ ترید', JSON.stringify(rr));
  Object.assign(global, sv);
  const d0 = []; const svA = global.tgApi_; global.tgApi_ = (m, p) => { if (m === 'sendDocument') d0.push(p); return { ok: true }; };
  const rv = seriesCatReview_(getHub_(), true);
  global.tgApi_ = svA;
  const tab = getHub_().getSheetByName(CFG.SERIES_CAT_REVIEW_TAB);
  ok('۱۰.۱۰ تبِ بازبینی ساخته می‌شود و همان فهرست به تلگرام می‌رود', tab && rv.sent && d0.length === 1 && tab.getRange(1, 1, 1, 4).getValues()[0][3] === 'منشأ', JSON.stringify(rv));
  const html = (() => { try { return uiBoardHtml(); } catch (e) { return ''; } })();
  ok('۱۰.۱۱ تخته: دکمهٔ فهرست وصل است و گروهِ بی‌دسته‌دستی دکمهٔ «کار روی این دسته» ندارد', /\.uiCatReview\(/.test(html) &&
     /grp\.cat === SERIES_NOMAN_TITLE \? 'disabled/.test(fs.readFileSync('src/15_Board.gs', 'utf8')));
}

/* ── ۱۱) ۱۱.۸: پلی‌لیست و «دربارهٔ کانال» — دست‌نوشتهٔ Studio برنمی‌گردد ── */
{
  ok('۱۱.۱ متنِ خودِ موتور (پیش از ۱۱.۸، بی اثر) شناخته می‌شود ⇒ به‌روز می‌شود؛ متنِ دیگر ⇒ دست‌نوشته',
     !ytPlHuman_({}, 'معرفت — درس‌نامه\n…\nفهرستِ درس‌ها:\nدرسِ ۱ — …') && ytPlHuman_({}, 'توضیحی که صاحبِ کانال نوشت') && !ytPlHuman_({}, ''));
  ok('۱۱.۲ با اثرِ ثبت‌شده: برابر ⇒ موتور؛ متفاوت (حتی با نشانِ موتور) ⇒ دست‌نوشته',
     !ytPlHuman_({ descFp: ytDescFp_('الف') }, 'الف') && ytPlHuman_({ descFp: ytDescFp_('الف') }, 'الف\nفهرستِ درس‌ها: + یک سطرِ دستی'));
  resetProps([PK.YT_CHAN_MINE]);
  ok('۱۱.۳ دربارهٔ کانال: متنِ موتور ⇒ آزاد؛ متنِ دیگر یا ویرایش‌شده ⇒ دست نمی‌خورد',
     !ytChanHuman_('… هر روز دو پادکستِ فارسی: …') && ytChanHuman_('دربارهٔ ما — نوشتهٔ صاحبِ کانال') && !ytChanHuman_('') &&
     (global.__PROPS[PK.YT_CHAN_MINE] = ytDescFp_('متنِ موتور'), !ytChanHuman_('متنِ موتور') && ytChanHuman_('متنِ موتور + ویرایش')));
  resetProps([PK.YT_CHAN_MINE]);
  /* تغییرِ نام از تخته: نام می‌رود، توضیحِ زنده می‌ماند */
  const upd = [];
  const sv = { ytSvc_: global.ytSvc_, ytQuotaTake_: global.ytQuotaTake_ };
  global.ytQuotaTake_ = () => true;
  global.ytSvc_ = () => ({ Playlists: { list: () => ({ items: [{ snippet: { title: 'نامی که در Studio گذاشتم', description: 'توضیحِ دست‌نوشته' } }] }),
                                       update: (b) => { upd.push(b); } } });
  const m = ytPlMap_(); m.kX = { id: 'PLX', title: 'نامِ قدیم' }; ytPlMapSave_(m);
  ytPlEnsure_('kX', 'نامِ تازه از تخته', 'توضیحِ پیش‌فرض');
  ok('۱۱.۴ تغییرِ نام از تخته اعمال می‌شود و توضیحِ زنده دست نمی‌خورد', upd.length === 1 && upd[0].snippet.title === 'نامِ تازه از تخته' && upd[0].snippet.description === 'توضیحِ دست‌نوشته', JSON.stringify(upd));
  global.ytSvc_ = () => ({ Playlists: { list: () => { throw new Error('x'); }, update: (b) => { upd.push(b); } } });
  m.kX.title = 'نامِ تازه از تخته'; ytPlMapSave_(m);
  ytPlEnsure_('kX', 'نامی دیگر', '');
  ok('۱۱.۵ متنِ زنده خوانده نشد ⇒ هیچ چیز فرستاده نمی‌شود', upd.length === 1);
  Object.assign(global, sv);
  const y = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const sync = y.slice(y.indexOf('function ytPlDescSync_'), y.indexOf('function ytChannelDesc_'));
  ok('۱۱.۶ همگامِ شبانه: پیش از نوشتن متنِ زنده، نامِ زنده می‌ماند، دست‌نوشته رد می‌شود، اثر ثبت می‌شود',
     /ytPlLive_\(yt, rec\.id\)/.test(sync) && /ytPlHuman_\(rec, live\.desc\)/.test(sync) && /title: String\(live\.title/.test(sync) && /rec\.descFp = ytDescFp_\(dOut\)/.test(sync));
  ok('۱۱.۷ دربارهٔ کانال پیش از نوشتن سنجیده می‌شود و اثرش ثبت می‌شود', /var chHuman = ytChanHuman_\(curDesc(, desc)?\)/.test(y) && /setProperty\(PK\.YT_CHAN_MINE, ytDescFp_\(desc\)\)/.test(y));
}

/* ── ۱۲) ۱۱.۹: «فلسفی و اعتقادی» در فهرستِ داور، اطمینانِ کم ⇒ بی‌دسته، و داوریِ دوباره ── */
{
  const reg = { rows: [{ key: 'X', row: 2, vals: (() => { const v = new Array(SERIES_HEADERS.length).fill(''); v[SC.MCAT - 1] = 'دستهٔ تازهٔ دستی'; return v; })() }] };
  const L = seriesCatList_(reg);
  ok('۱۲.۱ فهرستِ داور: ۱۴ دستهٔ TAXONOMY + «فلسفی و اعتقادی» + دستهٔ دستیِ تازه + متفرقه', L.indexOf('فلسفی و اعتقادی') !== -1 && L.indexOf('دستهٔ تازهٔ دستی') !== -1 &&
     L.indexOf(MISC_TITLE) === L.length - 1 && TAXONOMY.every((t) => L.indexOf(t.title) !== -1), L.join(' · '));
  ok('۱۲.۲ TAXONOMY («از همه جا» و تب‌های هاب) دست نخورد', !TAXONOMY.some((t) => t.title === 'فلسفی و اعتقادی'));
  const pr = judgePrompt_([{ key: 'k1', partNames: ['جلسه دوم'], kind: 'صوت', parts: 1, chunks: 3, src: 's', tab: 'مکالمه عربی', text: 'متن' }], L);
  ok('۱۲.۳ پرامپت: فهرستِ تازه، مرزِ فلسفی/مذهبی، هنر جدا از علمی، catSure، و نامِ بی‌محتوا ⇒ متن و تب', /فلسفی و اعتقادی/.test(pr) && /مراسم، هیئت، مداحی/.test(pr) &&
     /فیلم‌نامه/.test(pr) && /catSure/.test(pr) && /جلسه دوم/.test(pr) && /تب\/پوشهٔ منبع: مکالمه عربی/.test(pr) && JUDGE_SCHEMA.properties.verdicts.items.properties.catSure);
  const mkv = () => { const v = new Array(SERIES_HEADERS.length).fill(''); v[SC.KEY - 1] = 'k1'; v[SC.NAME - 1] = 'جلسه دوم'; return v; };
  const fakeReg = (v) => ({ rows: [{ key: 'k1', row: 2, vals: v }], sheet: { getRange: () => ({ setValues: () => {} }) } });
  const v1 = mkv(), r1 = fakeReg(v1);
  applyVerdict_(r1, r1.rows[0], { key: 'k1', isCourse: 'true', score: '70', about: 'فلسفهٔ حقوق', topic: 'فلسفه حقوق', category: 'فلسفی و اعتقادی', catSure: '85', level: 'میانی', why: 'نظریهٔ حقوق' }, { name: 'x', partNames: [] }, true);
  ok('۱۲.۴ «فلسفی و اعتقادی» با اطمینانِ کافی پذیرفته می‌شود', v1[SC.CAT - 1] === 'فلسفی و اعتقادی', v1[SC.CAT - 1]);
  const v2 = mkv(), r2 = fakeReg(v2);
  applyVerdict_(r2, r2.rows[0], { key: 'k1', isCourse: 'true', score: '60', about: 'مکالمه', topic: 'عربی', category: 'علمی و آموزشی', catSure: '35', level: 'مقدماتی', why: 'نمونه کم' }, { name: 'x', partNames: [] }, true);
  ok('۱۲.۵ اطمینانِ کمتر از آستانه ⇒ «بدون دسته (نیازمند بازبینی)» با علت', v2[SC.CAT - 1] === CFG.SERIES_CAT_UNSURE && /نامطمئن/.test(v2[SC.WHY - 1]), v2[SC.CAT - 1] + ' | ' + v2[SC.WHY - 1]);
  const v3 = mkv(); v3[SC.JUDGED - 1] = '2026-10-20 10:00'; v3[SC.IS_COURSE - 1] = SJ.YES;
  const v4 = mkv(); v4[SC.JUDGED - 1] = '2026-10-20 10:00'; v4[SC.MCAT - 1] = 'فلسفی و اعتقادی';
  const need = seriesNeedingJudgement_({ rows: [{ key: 'a', vals: v3 }, { key: 'b', vals: v4 }] }).map((r) => r.key);
  ok('۱۲.۶ داوری‌های پیش از فهرستِ تازه یک بار از نو — ولی ردیفِ دستی هرگز', need.join(',') === 'a', need.join(','));
}

/* ── ۱۳) ۱۲.۰: سنجشِ فرضیه‌های رقبا — فقط اندازه، با دادهٔ ساختگیِ شناخته‌شده ── */
{
  const R = [];
  const row = (id, title, perDay, age) => R.push(['2026-10-25 10:00', 'درس‌نامه', '', '', id, title, 0, 0, 0, 0, age, perDay, '']);
  for (let i = 1; i <= 6; i++) row('Q' + i, 'معرفت چیست؟ | مجموعه - درس ' + i, 20, 10 + i);          // پرسشی، کوتاه، درسِ ۱–۶
  for (let i = 7; i <= 12; i++) row('L' + i, 'سه شرطِ معرفت و جایگاهِ توجیه در معرفت‌شناسیِ معاصر | معرفت‌شناسی رابرت آئودی - درس ' + i, 2, 10 + i);
  for (let i = 1; i <= 5; i++) row('S' + i, 'از کجا می‌دانی؟ | مجموعه #Shorts', 50, 5);
  row('Q1', 'معرفت چیست؟ | مجموعه - درس 1', 30, 12);   // عکسِ تازه‌ترِ همان ویدئو جای قبلی را می‌گیرد
  const h = ytHypo_(R);
  const t = (n) => h.tests.find((x) => x.name === n);
  ok('۱۳.۱ یک ویدئو یک بار (آخرین عکس) — ۱۷ ویدئو', h.n === 17, String(h.n));
  ok('۱۳.۲ عنوانِ پرسشی بیشتر دیده شده، با میانه‌ها', /پرسشی/.test(t('ف۱ آغاز با پرسش').say) && t('ف۱ آغاز با پرسش').ma === 20 && t('ف۱ آغاز با پرسش').mb === 2, JSON.stringify(t('ف۱ آغاز با پرسش')));
  ok('۱۳.۳ شورتز جدا از ویدئوی بلند سنجیده می‌شود', t('ف۳ شورتز').ma === 50 && t('ف۳ شورتز').na === 5);
  ok('۱۳.۴ گروهِ کوچک ⇒ «کم‌داده»، نه نتیجه', /کم‌داده/.test(t('ف۲ مرورِ بزرگ').say));
  ok('۱۳.۵ خطِ روزانه می‌گوید «فقط سنجش است»', /فقط سنجش است؛ چیزی عوض نشد/.test(h.line) && /ف۴ رقیق‌شدن/.test(h.line), h.line.slice(0, 200));
  const src8 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۱۳.۶ به ایمیلِ روزانه وصل است', /ytHypoRun_\(\)/.test(src8));
}

/* ── ۱۴) ۱۲.۱: تصمیم‌های صاحبِ کانال — صفِ درس‌نامه، Analytics، CAST خاموش، قالبِ ریل ── */
{
  ok('۱۴.۱ YT_DESC_CAST پیش‌فرض خاموش (تصمیمِ صاحبِ کانال؛ متنِ اصلی در تلگرام می‌ماند)', CFG.YT_DESC_CAST === false);
  /* صف: فعال اول، بعد تازه‌های شماره‌دار به ترتیبِ شماره؛ بی‌شماره منتظر. برآورد از تکه‌به‌ازای‌درسِ خودِ مجموعه. */
  const mk = (key, name, st, mo, eps, last) => {
    const v = new Array(SERIES_HEADERS.length).fill(''); v[SC.KEY - 1] = key; v[SC.NAME - 1] = name; v[SC.STATUS - 1] = st;
    if (mo !== null) v[SC.MORDER - 1] = mo; v[SC.EPISODES - 1] = eps; v[SC.LAST_EP_AT - 1] = last || ''; v[SC.MANUAL - 1] = SMAN.YES;
    return { key, row: 0, vals: v };
  };
  const reg = { rows: [mk('A', 'آئودی', SST.ACTIVE, 1, '1 2 3 4', '2026-10-24 08:00'), mk('C', 'دین فطری', SST.NEW, 4, ''),
                       mk('B', 'خداشناسی', SST.NEW, 2, ''), mk('D', 'بی‌شماره', SST.NEW, null, '')] };
  reg.rows.forEach((r, i) => { r.row = i + 2; });
  const prt = (key, chunks, done) => { const v = new Array(20).fill(''); v[SP.CHUNKS - 1] = chunks; v[SP.DONE_TO - 1] = done; return { vals: v }; };
  const parts = { byKey: { A: [prt('A', 20, 8)], B: [prt('B', 9, 0)], C: [prt('C', 3, 0)], D: [prt('D', 6, 0)] } };
  const keepT = CFG.SERIES_AUTO_CAT_TRUST; CFG.SERIES_AUTO_CAT_TRUST = false;
  let q;
  try { q = seriesQueuePlan_({}, reg, parts); } finally { CFG.SERIES_AUTO_CAT_TRUST = keepT; }
  ok('۱۴.۲ ترتیب: فعال ← #۲ ← #۴؛ بی‌شماره بیرون و شمرده', q.rows.map((x) => x.key).join(',') === 'A,B,C' && q.held === 1, JSON.stringify(q.rows.map((x) => x.key)) + ' held=' + q.held);
  const A = q.rows[0];
  ok('۱۴.۳ برآوردِ آئودی از نرخِ خودش: ۸ تکه / ۴ قسمت = ۲ ⇒ ۱۲ تکه = ۶ درس', A.per === 2 && A.lessons === 6, JSON.stringify(A));
  ok('۱۴.۴ روزها پیوسته و ماه حساب شده', q.rows[1].fromDay === A.toDay + 1 && q.days === q.rows[2].toDay && q.months === Math.round(q.days / 30.4 * 10) / 10);
  ok('۱۴.۵ خطِ روزانه نام، شماره و جمع را می‌گوید', /«خداشناسی» \[#2\]/.test(q.line) && /ماه/.test(q.line) && /بی شمارهٔ دستی منتظر/.test(q.line), q.line);
  ok('۱۴.۶ به ایمیلِ روزانه وصل است', /seriesQueuePlan_\(/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));

  /* Analytics: دورِ «API خاموش» زود دوباره امتحان می‌شود */
  const t0 = new Date(Date.now() - 2 * 3600000);
  const at = Utilities.formatDate(t0, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  global.__PROPS[PK.YTA_AT] = at; global.__PROPS[PK.YTA_SNAP] = JSON.stringify({ need: 'api' });
  const due1 = ytaDue_();
  global.__PROPS[PK.YTA_SNAP] = JSON.stringify({ at: at, totals: {} });
  const due2 = ytaDue_();
  delete global.__PROPS[PK.YTA_AT]; delete global.__PROPS[PK.YTA_SNAP];
  ok('۱۴.۷ «need» ⇒ پس از یک ساعت دوباره؛ عکسِ سالم ⇒ بیست ساعت صبر', due1 === true && due2 === false, due1 + ' ' + due2);

  /* فرضیه‌ها: ماندگاری کنارِ نمایش، و ف۷ قالبِ ریل */
  const R = [];
  const row = (id, title, perDay) => R.push(['2026-10-25 10:00', 'درس‌نامه', '', '', id, title, 0, 0, 0, 0, 20, perDay, '']);
  for (let i = 1; i <= 5; i++) row('Q' + i, 'معرفت چیست؟ - درس ' + i, 20);
  for (let i = 6; i <= 10; i++) row('L' + i, 'معرفت و توجیه - درس ' + i, 5);
  const avp = { Q1: 30, Q2: 32, Q3: 34, Q4: 36, Q5: 38, L6: 60, L7: 61, L8: 62, L9: 63, L10: 64 };
  const h0 = ytHypo_(R, avp, []);
  const tq = h0.tests.find((x) => x.name === 'ف۱ آغاز با پرسش');
  ok('۱۴.۸ ماندگاری از Analytics کنارِ نمایش: پرسشی بیشتر دیده شده ولی کمتر تماشا شده', tq.ra === 34 && tq.rb === 62 && /دیده‌شدن 34٪ \/ 62٪/.test(h0.line), JSON.stringify(tq));
  const f7 = h0.tests.find((x) => /ف۷/.test(x.name));
  ok('۱۴.۹ ف۷ بی ریلِ «جملهٔ کوتاه» ⇒ «هنوز منتشر نشده»، نه «تفاوتی نیست»', f7 && f7.thin && /هنوز هیچ ریلِ «جملهٔ کوتاه»/.test(f7.say), f7 && f7.say);
  const h1 = ytHypo_(R, {}, [{ k: 'آموزشی', n: 30, med: 400 }, { k: 'جملهٔ کوتاه', n: 6, med: 900 }]);
  const f71 = h1.tests.find((x) => /ف۷/.test(x.name));
  ok('۱۴.۱۰ ف۷ با دادهٔ کافی: «جملهٔ کوتاه» بیشتر دیده شده', !f71.thin && /«جملهٔ کوتاه» بیشتر دیده شده/.test(f71.say) && f71.ma === 900 && f71.mb === 400, f71.say);

  /* اینستاگرام: قالب از نقشه، پیش‌فرض «آموزشی»؛ فقط غیرپیش‌فرض نوشته می‌شود */
  delete global.__PROPS[PK.IG_FMT];
  ok('۱۴.۱۱ igFmtMark_: پیش‌فرض نوشته نمی‌شود، «جملهٔ کوتاه» نوشته می‌شود', igFmtMark_('R1', 'آموزشی') === false && igFmtMark_('R2', 'جملهٔ کوتاه') === true &&
     JSON.stringify(igFmtMap_()) === JSON.stringify({ R2: 'جملهٔ کوتاه' }));
  const now = Date.parse('2026-10-25T12:00:00Z'), rows = [];
  for (let i = 0; i < 4; i++) rows.push(['R' + (i + 10), '2026-10-20 0' + i + ':00', 'REELS', 'ig:special:' + i, 'آیا می‌دانستید ' + i, '', 100 + i, '', '', '', '', '', '', 5]);
  rows.push(['R2', '2026-10-20 05:00', 'REELS', 'ig:special:q', '«انسان مقیاسِ همه‌چیز است»', '', 900, '', '', '', '', '', '', 9]);
  const pat = igPattern_(rows, now, igFmtMap_());
  const byF = Object.fromEntries(pat.byFormat.map((x) => [x.k, x]));
  ok('۱۴.۱۲ igPattern_ قالبِ ریل را جدا می‌شمارد', byF['آموزشی'].n === 4 && byF['جملهٔ کوتاه'].n === 1 && byF['جملهٔ کوتاه'].med === 900 && /🧩 قالبِ ریل/.test(pat.text), JSON.stringify(pat.byFormat));
  const pat0 = igPattern_(rows.slice(0, 4), now);
  ok('۱۴.۱۳ بی نقشه همه «آموزشی» و متن می‌گوید قالبِ دوم هنوز منتشر نشده', pat0.byFormat.length === 1 && /قالبِ دومی هنوز منتشر نشده/.test(pat0.text));
  const s38 = fs.readFileSync('src/38_Instagram.gs', 'utf8'), s27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۱۴.۱۴ سیم‌ها: انتشار قالب را ثبت می‌کند، الگو نقشه را می‌خوانَد، ytHypoRun_ byFormat را می‌دهد',
     /st\.media\[plan\.reelId\] = it\.key;\s*\n\s*igFmtMark_\(plan\.reelId, plan\.format\)/.test(s38) && /igPattern_\([^;]*igFmtMap_\(\)\)/.test(s38) && /byFormat \|\| \[\][\s\S]{0,300}, avp, igF\)/.test(s27));
  delete global.__PROPS[PK.IG_FMT];
}

/* ── ۱۵) ۱۲.۲: دربارهٔ کانال با قالبِ صاحبِ کانال، بیوها هفتگی در تلگرام، و قالبِ «جملهٔ کوتاه» (پیش‌فرض خاموش) ── */
{
  global.__PROPS[PK.YT_SUMMARY] = JSON.stringify({ series: [{ name: 'معرفت‌شناسی آئودی', n: 48, recaps: 3 }], variety: { n: 74 } });
  const cd = ytChannelDesc_();
  ok('۱۵.۱ دربارهٔ کانال: سر، بدنه، پلی‌لیست‌ها، فهرستِ زنده و شورتز — به همان ترتیبِ قالب', cd.indexOf('رد پای حقیقت — اندیشه، دانش، روایت.') === 0 &&
     cd.indexOf('سراغ پرسش‌های بنیادین شناخت') < cd.indexOf('از درس یک شروع می‌شوند') && cd.indexOf('معرفت‌شناسی آئودی: ۴۸ درس و ۳ مرور') > cd.indexOf('از درس یک') &&
     /شورتز: پرسش‌های کوتاه از دل همان درس‌ها\.$/.test(cd) && !/۷۴ قسمت/.test(cd) && cd.length <= 990, cd);
  delete global.__PROPS[PK.YT_CHAN_MINE];
  ok('۱۵.۲ قفل: عینِ متنِ موتور «مالِ موتور» است، دست‌نوشته نه، خالی پر می‌شود', !ytChanHuman_(cd, cd) && ytChanHuman_('متنی که صاحبِ کانال در Studio نوشت', cd) && !ytChanHuman_('', cd));
  /* ۱۲.۳: همان قالب که صاحبِ کانال پیش از نخستین نوشتنِ موتور در Studio گذاشت (بی فهرستِ مجموعه‌ها) — مالِ اوست. ۱۲.۲ بازنویسی‌اش می‌کرد. */
  const pasted = [CFG.YT_CHAN_ABOUT.head, '', CFG.YT_CHAN_ABOUT.body, '', CFG.YT_CHAN_ABOUT.lists, '', CFG.YT_CHAN_ABOUT.shorts].join('\n');
  ok('۱۵.۲-ب متنِ قالب که دستی در Studio گذاشته شد، پیش از نوشتنِ موتور ⇒ دست‌نوشته، بازنویسی نمی‌شود', ytChanHuman_(pasted, cd) && !ytChanHuman_('… هر روز دو پادکستِ فارسی: …', cd));
  ok('۱۵.۲-پ سیم: ytChannelSync_ متنِ خودش را برای مقایسه می‌دهد', /var chHuman = ytChanHuman_\(curDesc, desc\)/.test(fs.readFileSync('src/27_YouTube.gs', 'utf8')));
  global.__PROPS[PK.YT_CHAN_MINE] = ytDescFp_(cd);
  ok('۱۵.۳ پس از نوشتن، ویرایشِ Studio دیده می‌شود (اثرِ انگشت)', !ytChanHuman_(cd, cd) && ytChanHuman_(cd + '\nسطرِ دستی', cd));
  delete global.__PROPS[PK.YT_CHAN_MINE];

  const sent0 = tg.length;
  delete global.__PROPS[PK.BIO_TG_AT];
  const b1 = bioSuggest_(false), b2 = bioSuggest_(false);
  ok('۱۵.۴ بیوها: یک بار در هفته به تلگرام، نه هر روز', b1.sent && !b2.sent && tg.length === sent0 + 1, tg.length - sent0);
  ok('۱۵.۵-ب فیسبوک در پیامِ هفتگی نیست (صاحبِ کانال روی فیسبوک کار نمی‌کند)', CFG.BIO_FB === false && !/فیسبوک/.test(b1.text), b1.text);
  ok('۱۵.۵ بیوی اینستاگرام همان متنِ پیشنهادی و زیرِ ۱۵۰ نویسه؛ متنِ فیسبوک فقط آماده (اگر روزی خواست)', /^رد پای حقیقت \| معرفت‌شناسی و فلسفه، ساده و کوتاه\.\nهر روز یک ریل؛ درس کامل در یوتیوب\.$/.test(b1.ig) && !b1.igOver &&
     /^رد پای حقیقت — اندیشه، دانش، روایت\. اینجا درس‌به‌درس/.test(b1.fb) && /۴۸ درس/.test(b1.fb) && /نمی‌نویسد/.test(b1.text), b1.fb);
  ok('۱۵.۶ به ایمیلِ روزانه وصل است', /bioSuggest_\(false\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
  delete global.__PROPS[PK.BIO_TG_AT];

  /* قالبِ جملهٔ کوتاه */
  ok('۱۵.۷ ۱۲.۳: روشن به تصمیمِ صاحبِ کانال — هر سومین درس، نه مرور', CFG.IG_QUOTE_ON === true && igQuoteFor_({ lesson: 3 }) && igQuoteFor_({ lesson: 6 }) && !igQuoteFor_({ lesson: 4 }) && !igQuoteFor_({ lesson: 3, recap: 1 }));
  { const k = CFG.IG_QUOTE_ON; CFG.IG_QUOTE_ON = false; ok('۱۵.۷-ب خاموش ⇒ هیچ درسی', !igQuoteFor_({ lesson: 3 })); CFG.IG_QUOTE_ON = k; }
  const sec = [{ heading: 'الف', narration: 'آئودی می‌گوید: «معرفت باوری صادق است که توجیهِ درستی دارد.» این تعریف ساده به نظر می‌رسد.' },
               { heading: 'ب', narration: 'اما اگر حواس ما را فریب دهند، آیا هنوز چیزی را می‌دانیم؟ این پرسش آغازِ شک است.' }];
  const c1 = igQuoteCheck_('معرفت باوریِ صادق است که توجیهِ درستی دارد', 'آئودی', 'بله', sec);
  ok('۱۵.۸ جملهٔ عینِ درس (با اعرابِ متفاوت) پیدا می‌شود؛ در «» و با نام ⇒ سخنِ مستقیم', c1.ok && c1.kind === 'direct' && c1.sec === 0 && c1.who === 'آئودی', JSON.stringify(c1));
  const c2 = igQuoteCheck_('اگر حواس ما را فریب دهند، آیا هنوز چیزی را می‌دانیم', 'آئودی', 'بله', sec);
  ok('۱۵.۹ نامی که در همان بخش نیست ⇒ رد (نسبتِ نادرست جبران‌پذیر نیست)', !c2.ok && /در همان بخشِ درس نیست/.test(c2.why), c2.why);
  const c3 = igQuoteCheck_('اگر حواس ما را فریب دهند، آیا هنوز چیزی را می‌دانیم', '', 'خیر', sec);
  ok('۱۵.۱۰ بی نام ⇒ «از درس»، نه سخنِ کسی', c3.ok && c3.kind === 'lesson' && /^— درسِ ۶ از «آئودی»$/.test(igQuoteAttr_(c3, 6, 'آئودی')), igQuoteAttr_(c3, 6, 'آئودی'));
  const c4 = igQuoteCheck_('معرفت همیشه باوری است که هرگز خطا نمی‌کند و یقینی است', 'آئودی', 'بله', sec);
  ok('۱۵.۱۱ جملهٔ ساختگی (نه عینِ درس) ⇒ رد', !c4.ok && /عیناً در متنِ درس نیست/.test(c4.why));
  const c5 = igQuoteCheck_('این تعریف ساده به نظر می‌رسد و', 'آئودی', 'بله', sec);
  ok('۱۵.۱۲ «بله»ی مدل بی «» در درس ⇒ برداشت، نه سخنِ مستقیم', !c5.ok || c5.kind === 'lesson');

  /* صف: افزوده پس از بخش‌های آموزشی، و هرگز مانع */
  const keepQ = CFG.IG_QUOTE_ON; CFG.IG_QUOTE_ON = true;
  try {
    const order = [{ name: 'آئودی', eps: [{ ep: 40, lesson: 2 }, { ep: 41, lesson: 3 }, { ep: 42, lesson: 4 }] }];
    const pub = {}; [40, 41, 42].forEach((e) => { pub['special:' + e] = { videoId: 'v' + e, privacy: 'public', title: 't' + e }; });
    const np = igPartsFor_(0, false);
    const doneOf = (eps) => eps.join(',');
    const parts41 = Array.from({ length: np }, (_, i) => igUid_({ ep: 41, part: i + 1 }));
    const parts40 = Array.from({ length: np }, (_, i) => igUid_({ ep: 40, part: i + 1 }));
    const n1 = igNextEp_(pub, { done: doneOf(parts40.concat(parts41)), inflight: [] }, order);
    ok('۱۵.۱۳ درسِ ۳ (مضربِ ۳) پس از بخش‌های آموزشی‌اش یک ریلزِ جملهٔ کوتاه می‌گیرد', n1 && n1.ep === 41 && n1.quote === 1 && n1.part === igQuotePart_() && n1.parts === 1, JSON.stringify(n1));
    const stF = { done: doneOf(parts40.concat(parts41)), inflight: [], fails: {} };
    stF.fails[igUid_({ ep: 41, part: igQuotePart_() })] = 9;
    const n2 = igNextEp_(pub, stF, order);
    ok('۱۵.۱۴ جملهٔ کوتاهِ گیرکرده صف را نگه نمی‌دارد: درسِ بعد می‌آید', n2 && n2.ep === 42 && !n2.quote, JSON.stringify(n2));
    const n3 = igNextEp_(pub, { done: doneOf(parts40), inflight: [] }, order);
    ok('۱۵.۱۵ پیش از بخش‌های آموزشیِ همان درس نمی‌آید', n3 && n3.ep === 41 && !n3.quote && n3.part === 1, JSON.stringify(n3));
    const enc = { s: [{ n: 'آئودی', e: '40:2,41:3,42:4' }] };
    const pOk = igEarlierPending_({ done: doneOf(parts40.concat(parts41)), order: enc }, 41, igQuotePart_());
    const pWait = igEarlierPending_({ done: doneOf(parts40.concat(parts41.slice(0, 1))), order: enc }, 41, igQuotePart_());
    ok('۱۵.۱۶ انتشارش فقط منتظرِ بخش‌های آموزشیِ همان درس است (نه بخش‌های ناموجودِ ۳ تا ۸)', pOk === '' && (np < 2 || /درسِ 3/.test(pWait)), pOk + ' | ' + pWait);
  } finally { CFG.IG_QUOTE_ON = keepQ; }

  /* برنامه: جمله از درس، نسبت در کپشن، قالب ثبت‌شده؛ و جملهٔ نایافته ⇒ شکست */
  const kG = global.geminiText_, kJ = global.igJudge_;
  const ep = { title: 'معرفت', sections: sec };
  const fo = { getFilesByName: () => ({ hasNext: () => false }), createFile: () => ({}) };
  const ans = (q) => ({ quote: q, who: 'آئودی', direct: 'بله', context: 'یعنی دانستن فقط باور نیست. باید درست هم باشد. و دلیلِ خوبی هم بخواهد. همین سه شرط بحثِ بزرگی ساخته است.',
                        scenes: ['an old lamp on a desk', 'a path in fog', 'a balance scale'], coverTitle: 'معرفت یعنی چه', caption: 'دانستن یعنی چه؟', tags: ['فلسفه'], kicker: 'معرفت‌شناسی' });
  global.igJudge_ = () => ({ ok: true, why: '' });
  try {
    global.geminiText_ = () => ans('معرفت باوری صادق است که توجیهِ درستی دارد');
    const r1 = igQuotePlan_({ key: 'ig:special:41.9', ep: 41, part: igQuotePart_(), yt: 'https://youtu.be/v41', quote: 1 }, fo, ep, { seriesKey: 'k' }, 'معرفت‌شناسی آئودی', 3);
    const pl = r1.plan || {};
    ok('۱۵.۱۷ برنامهٔ جملهٔ کوتاه: قالب، بخشِ ۹، نسبتِ «— آئودی» در کپشن، دعوت به درسِ کامل', r1.ok && pl.format === 'جملهٔ کوتاه' && pl.part === igQuotePart_() && pl.parts === 1 &&
       /^«معرفت باوری صادق است که توجیهِ درستی دارد»\n— آئودی\n/.test(pl.caption) && pl.plan.lines[pl.plan.lines.length - 1].cta && pl.quote.kind === 'direct', JSON.stringify(r1).slice(0, 300));
    global.geminiText_ = () => ans('معرفت همیشه باوری است که هرگز خطا نمی‌کند و یقینی است');
    const r2 = igQuotePlan_({ key: 'k', ep: 41, part: igQuotePart_() }, fo, ep, {}, 'آئودی', 3);
    ok('۱۵.۱۸ جملهٔ ساختهٔ مدل (نه عینِ درس) ⇒ شکست، نه انتشار', !r2.ok && /عیناً در متنِ درس نیست/.test(String(r2.fail)), JSON.stringify(r2));
    global.igJudge_ = () => ({ ok: false, why: 'ادعای بیرون از درس — جملهٔ سوم' });
    global.geminiText_ = () => ans('معرفت باوری صادق است که توجیهِ درستی دارد');
    const r3 = igQuotePlan_({ key: 'k', ep: 41, part: igQuotePart_() }, fo, ep, {}, 'آئودی', 3);
    ok('۱۵.۱۹ داور «ادعای بیرون از درس» گفت ⇒ شکست', !r3.ok && /ادعای بیرون از درس/.test(String(r3.fail)));
    const kJd = CFG.IG_JUDGE; CFG.IG_JUDGE = false;
    let called = 0; global.igJudge_ = () => { called++; return { ok: false, why: 'داور جواب نداد: timeout' }; };
    const r4 = igQuotePlan_({ key: 'k', ep: 41, part: igQuotePart_() }, fo, ep, {}, 'آئودی', 3);
    CFG.IG_JUDGE = kJd;
    ok('۱۵.۱۹-ب ۱۲.۳: داوری حتی با IG_JUDGE خاموش هست، و «داور جواب نداد» تأیید نیست ⇒ منتشر نمی‌شود', called === 1 && !r4.ok && /داور جواب نداد/.test(String(r4.fail)), JSON.stringify(r4));
  } finally { global.geminiText_ = kG; global.igJudge_ = kJ; }
  const pl0 = { format: 'جملهٔ کوتاه', short: 'x' };
  ok('۱۵.۲۰ ریلزِ جملهٔ کوتاه به شورتز نمی‌رود', igShortPub_({}, pl0).ok && /فقط اینستاگرام/.test(pl0.shortWhy));
  const s38 = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  ok('۱۵.۲۱ سیم‌ها: گامِ برنامه شاخهٔ جملهٔ کوتاه دارد و صف پرچمش را با خود می‌برد',
     /if \(it\.quote \|\| Number\(it\.part\) === igQuotePart_\(\)\) return igQuotePlan_\(/.test(s38) && /quote: nx\.quote \? 1 : 0/.test(s38));
  delete global.__PROPS[PK.YT_SUMMARY];
}

/* ── ۱۶) ۱۲.۳: فیسبوک خاموش ⇒ اینستاگرام هیچ وابستگی و هیچ هشداری ندارد ── */
{
  destMemoClear_();
  ok('۱۶.۱ مقصدِ فیسبوک پیش‌فرض خاموش', !destGate_('fb', 'special').ok);
  const kF = global.fbPageToken_; let asked = 0; global.fbPageToken_ = () => { asked++; return { why: 'x' }; };
  delete global.__PROPS[PK.FB_Q];
  const plan = { video: 'https://x/v.mp4', caption: 'c' };
  const r = fbAfterReel_({ key: 'ig:special:41', folderId: 'F', part: 1 }, plan);
  global.fbPageToken_ = kF;
  ok('۱۶.۲ پس از انتشارِ ریلز: فیسبوک خاموش ⇒ هیچ تماسی با صفحه، هیچ صف، هیچ علتی در برنامه', r.off === true && asked === 0 && fbQueue_().length === 0 && !plan.fbWhy && !plan.fbId, JSON.stringify(r));
  const fs0 = fbStatus_();
  ok('۱۶.۳ خطِ ایمیل: فیسبوکِ خاموش و صفِ خالی چیزی نمی‌گوید (نه هشدار، نه یادداشت)', !fs0.on && !fs0.queued &&
     /if \(fbS\.on \|\| fbS\.queued\) notes\.push/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
  const s38 = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  const pub = s38.slice(s38.indexOf('function igStepPub_'), s38.indexOf('function igShortPub_'));
  ok('۱۶.۴ انتشارِ ریلز هیچ‌جا pages_manage_posts یا کلیدِ صفحه نمی‌خواهد', !/pages_manage_posts|fbPageToken_/.test(pub) && /fbAfterReel_/.test(pub));
}

summary('owner115');
