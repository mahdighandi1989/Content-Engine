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
  const sv2 = global.readSeriesReg_;
  global.readSeriesReg_ = () => mkReg(r4);
  const s1 = seriesParSave_({}, 'C', true);
  ok('۶.۸ سقفِ مجموعه‌های موازی رعایت می‌شود', !s1.ok && /سقفِ تولیدِ موازی/.test(s1.message));
  const s2 = seriesParSave_({}, 'B', false);
  ok('۶.۹ برداشتنِ تیک همان ستون را خالی می‌کند', s2.ok && r4[1].vals[SC.PAR - 1] === '' && !s2.on);
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

summary('owner115');
