/* ══ آزمونِ ۱۱.۰ — هشت خواستهٔ صاحبِ کانال (۲۵ اکتبر) ══
 *
 * ۱) قفلِ دسته‌های علمی بی چرخش · ۲) «از همه جا» در یوتیوب متوقف، هیچ‌چیز پاک نه · ۳) ویدئوی خصوصی دست نمی‌خورد
 * ۴) دو شورتزِ هم‌روز از یک درس نه · ۵) کپشن: قلابِ پرسشی، «لینک در بیو»، بی بلوکِ گوینده · ۶) کپشن در تلگرام
 * ۷) الگوی ساعت و قالبِ ریلزها · ۸) بایگانیِ توضیحاتِ ویدئوهای بلند در تلگرام.
 * همه از درِ توابعِ تولید، نه بازگوییِ قاعده.
 */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const tg = [];
global.tgEnabled_ = () => true;
global.tgSend_ = (t) => { tg.push(String(t)); return { ok: true }; };
const docs = [];
global.tgApi_ = (m, p) => { if (m === 'sendDocument') docs.push(p); else tg.push(String(p.text || '')); return { ok: true }; };
const resetProps = (keys) => keys.forEach((k) => { delete global.__PROPS[k]; });

/* ── ۱) قفلِ دسته ── */
{
  const idx = [
    { name: 'طنز و سرگرمی', elig: 3721, fresh: 58 },
    { name: 'اجتماعی و سبک زندگی', elig: 11426, fresh: 47 },
    { name: 'علمی و آموزشی', elig: 5106, fresh: 37 },
    { name: 'روانشناسی و رشد فردی', elig: 2048, fresh: 21 },
    { name: 'مستند و مصاحبه', elig: 3, fresh: 0 }
  ];
  const ord = catLockOrder_(idx).map((x) => x.name);
  ok('۱.۱ ترتیبِ قفل همان ترتیبِ CAT_LOCK است، نه رتبهٔ داشبورد', ord[0] === 'علمی و آموزشی' && ord[1] === 'روانشناسی و رشد فردی');
  ok('۱.۲ دستهٔ قفلی با کمتر از ۵ واجد کنار می‌ماند', ord.indexOf('مستند و مصاحبه') === -1);
  ok('۱.۳ دسته‌های غیرعلمی در قفل نیستند', ord.indexOf('طنز و سرگرمی') === -1 && ord.indexOf('اجتماعی و سبک زندگی') === -1);

  // pickCategory_ از درِ واقعی: هاب ساختگی با داشبورد، و هر تب که خوانده شد ثبت می‌شود
  const read = [];
  const saved = { readIndex_: global.readIndex_, tabStats_: global.tabStats_, fetchRows_: global.fetchRows_, buildCandidates_: global.buildCandidates_ };
  global.readIndex_ = () => idx;
  let emptyFirst = false;
  global.tabStats_ = (hub, name) => {
    read.push(name);
    const n = (emptyFirst && name === 'علمی و آموزشی') ? 0 : 20;
    const rows = [];
    for (let i = 0; i < n; i++) rows.push({ row: i + 2, kind: i % 2 ? 'ویدیو' : 'عکس', fresh: false, score: 70, refs: 0 });
    return { sheet: { name }, rows };
  };
  global.buildCandidates_ = (rows) => rows;
  global.fetchRows_ = (sh, name, rws) => rws.map((r) => ({ id: name + r, kind: 'ویدیو', score: 70 }));
  global.__PROPS[PK.LAST_CATS] = 'علمی و آموزشی|علمی و آموزشی|علمی و آموزشی';
  const p1 = pickCategory_({});
  ok('۱.۴ با جریمهٔ «اخیراً» هم همان دستهٔ علمیِ اول (بی چرخش)', p1 && p1.title === 'علمی و آموزشی', p1 && p1.title);
  ok('۱.۵ نامزدهای دسته‌های دیگر فقط از دسته‌های قفل', p1 && p1.others.every((x) => CFG.CAT_LOCK.indexOf(x) !== -1), p1 && p1.others.join(','));
  read.length = 0; emptyFirst = true;
  const p2 = pickCategory_({});
  ok('۱.۶ اولی تمام ⇒ دستهٔ علمیِ بعدی، نه طنز', p2 && p2.title === 'روانشناسی و رشد فردی', p2 && p2.title);
  ok('۱.۷ تصمیم در خطِ روزانه دیده می‌شود', /روانشناسی و رشد فردی/.test(catLockLine_()) && /دیگر محتوای کافی نداشت/.test(catLockLine_()));
  CFG.CAT_LOCK_ON = false; emptyFirst = false;
  const p3 = pickCategory_({});
  ok('۱.۸ قفل خاموش ⇒ رتبه‌بندیِ پیشین (همان رفتار)', p3 && CFG.CAT_LOCK.indexOf(p3.title) === -1, p3 && p3.title);
  CFG.CAT_LOCK_ON = true;
  Object.assign(global, saved);
  delete global.__PROPS[PK.LAST_CATS];
}

/* ── ۲) سازوکارِ خاموش‌کردنِ یک برنامه در یوتیوب ──
   ۱۱.۱: پیش‌فرض خالی است («از همه جا» متوقف نشود، فقط علمی)؛ سازوکار با فهرستِ پُر سنجیده می‌شود. */
ok('۲.۰ (۱۱.۱) پیش‌فرض: هیچ برنامه‌ای در یوتیوب خاموش نیست', Array.isArray(CFG.YT_SHOWS_OFF) && CFG.YT_SHOWS_OFF.length === 0 && !/متوقف/.test(ytShowsOffLine_()));
/* ── ۲-ب) ۱۱.۲: ۶۴ قسمتِ قدیمیِ «از همه جا» خصوصی شدند؛ تازه‌ها عادی ── */
{
  resetProps([PK.YT_DUE, PK.YT_DUE_PARKED]);
  ok('۲-ب.۱ کفِ شماره: variety زیرِ ۸۴ بیرون، ۸۴ و بعد درون؛ درس‌نامه بی کف',
     ytItemOff_({ show: 'variety', ep: '83' }) && ytItemOff_({ show: 'variety', ep: '12' }) && !ytItemOff_({ show: 'variety', ep: '84' }) &&
     !ytItemOff_({ show: 'variety', ep: '90' }) && !ytItemOff_({ show: 'special', ep: '3' }));
  ok('۲-ب.۲ قسمتِ قدیمی به صف نمی‌رود، تازه می‌رود', ytDueAdd_('variety', '71', 'F71') === 0 && ytDueAdd_('variety', '84', 'F84') === 1);
  global.__PROPS[PK.YT_DUE] = JSON.stringify([{ key: 'variety:83', show: 'variety', ep: '83', folderId: 'F83', replace: 'qa-11.1' },
                                              { key: 'variety:84', show: 'variety', ep: '84', folderId: 'F84' }]);
  const l = ytDueList_();
  ok('۲-ب.۳ ردیفِ قدیمیِ صف (حتی ساختِ دوبارهٔ qa) کنار می‌رود و برنمی‌گردد', l.length === 1 && l[0].key === 'variety:84' &&
     ytDueParked_().some((x) => x.key === 'variety:83') && ytDueList_().length === 1);
  ok('۲-ب.۴ خطِ روزانه کف را می‌گوید', /زیرِ ۸۴/.test(ytShowsOffLine_()) && /عادی منتشر می‌شوند/.test(ytShowsOffLine_()));
  /* آپلودِ دوباره: قسمتی که ویدئوی منتشرشده‌اش خصوصی است، دوباره بالا نمی‌رود — حتی درس‌نامه، حتی با «جایگزینی». */
  const sv = { ytSvc_: global.ytSvc_, ytQuotaTake_: global.ytQuotaTake_, DriveApp: global.DriveApp, ytEpInProd_: global.ytEpInProd_ };
  for (const k in YT_PRIV_SEEN_) delete YT_PRIV_SEEN_[k];
  const ins = [];
  global.ytSvc_ = () => ({ Videos: { list: (p, o) => ({ items: [{ status: { privacyStatus: o.id === 'OLDP' ? 'private' : 'public' } }] }),
                                     insert: () => { ins.push(1); return { id: 'NEW' }; } } });
  global.ytQuotaTake_ = () => true;
  global.ytEpInProd_ = () => false;
  global.DriveApp = Object.assign({}, global.DriveApp || {}, { getFolderById: (id) => ({ getId: () => id, getFiles: () => ({ hasNext: () => false }), getFilesByName: () => ({ hasNext: () => false }) }) });
  global.__PROPS[PK.YT_DUE] = JSON.stringify([{ key: 'special:50', show: 'special', ep: '50', folderId: 'S50', replace: 'r1' }]);
  const r = ytUploadOne_({ key: 'special:50', show: 'special', ep: '50', folderId: 'S50', replace: 'r1' }, {}, { 'special:50': { videoId: 'OLDP' } });
  ok('۲-ب.۵ ویدئوی قبلیِ خصوصی ⇒ هیچ آپلود، از صف بیرون و کنار (نه پاک)', !ins.length && /خصوصی/.test(r.why) &&
     !ytDueList_().some((x) => x.key === 'special:50') && ytDueParked_().some((x) => x.key === 'special:50'), r.why);
  const r2 = ytUploadOne_({ key: 'special:51', show: 'special', ep: '51', folderId: 'S51' }, {}, { 'special:51': { videoId: 'OKPUB' } });
  ok('۲-ب.۶ ویدئوی قبلیِ عمومی ⇒ محافظ کنار می‌ایستد (درس‌نامه و جایگزینی‌اش مثلِ قبل)', !/خصوصی/.test(String(r2.why)), r2.why);
  Object.assign(global, sv);
  resetProps([PK.YT_DUE, PK.YT_DUE_PARKED]);
  const src = require('fs').readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۲-ب.۷ جایگزینی پیش از آغاز می‌پرسد', /ytItemOff_\(\{ show: showK, ep: ep \}\) \|\| ytHandsOff_\(rec\.videoId, 'جایگزینی'\)/.test(src));
}
{
  CFG.YT_SHOWS_OFF = ['variety'];
  resetProps([PK.YT_DUE, PK.YT_DUE_PARKED]);
  global.__PROPS[PK.YT_DUE] = JSON.stringify([
    { key: 'variety:90', show: 'variety', ep: '90', folderId: 'F90' },
    { key: 'special:84', show: 'special', ep: '84', folderId: 'S84' }]);
  const l = ytDueList_();
  ok('۲.۱ صف فقط درس‌نامه را نشان می‌دهد', l.length === 1 && l[0].key === 'special:84');
  ok('۲.۲ ردیفِ از همه جا پاک نشد، کنار رفت', ytDueParked_().some((x) => x.key === 'variety:90'));
  ok('۲.۳ ردیفِ تازهٔ از همه جا به صف نمی‌رود', ytDueAdd_('variety', '95', 'F95') === 0 && !ytDueList_().some((x) => x.show === 'variety'));
  ok('۲.۴ درس‌نامه همچنان به صف می‌رود', ytDueAdd_('special', '85', 'S85', 'k', 'n') === 1);
  ok('۲.۵ خطِ روزانه می‌گوید متوقف و چه کنار رفت', /متوقف/.test(ytShowsOffLine_()) && /کنار گذاشته شده/.test(ytShowsOffLine_()));
  const vs = vmStatus_();
  ok('۲.۶ سنجهٔ ویدئوی از همه جا «افتادن» نمی‌گوید', vs.ok === true && vs.off === true && /ایراد نیست/.test(vs.line), JSON.stringify(vs).slice(0, 120));
  const keepOff = CFG.YT_SHOWS_OFF;
  CFG.YT_SHOWS_OFF = [];
  const back = ytDueList_();
  ok('۲.۷ روشن‌کردنِ دوباره ⇒ کنارگذاشته‌ها خودشان برمی‌گردند', back.some((x) => x.key === 'variety:90') && !ytDueParked_().length);
  CFG.YT_SHOWS_OFF = keepOff;
  ok('۲.۸ تنظیماتِ پادکست دست نخورده (VM و دستهٔ یوتیوب سرِ جایشان)', CFG.YT_CATEGORY_VARIETY === '22' && typeof CFG.VM_MAX_MB !== 'undefined');
  resetProps([PK.YT_DUE, PK.YT_DUE_PARKED]);
  CFG.YT_SHOWS_OFF = [];
  /* ۱۱.۱: نصبِ ۱۱.۰ ردیف‌ها را کنار گذاشته باشد ⇒ با پیش‌فرضِ تازه خودشان برمی‌گردند. */
  global.__PROPS[PK.YT_DUE_PARKED] = JSON.stringify([{ key: 'variety:91', show: 'variety', ep: '91', folderId: 'F91' }]);
  ok('۲.۹ (۱۱.۱) کنارگذاشته‌های ۱۱.۰ با پیش‌فرضِ تازه به صف برمی‌گردند', ytDueList_().some((x) => x.key === 'variety:91') && !ytDueParked_().length);
  resetProps([PK.YT_DUE, PK.YT_DUE_PARKED]);
}

/* ── ۳) ویدئوی خصوصی ── */
{
  resetProps([PK.YT_OWNER_PRIVATE]);
  const upd = [], th = [];
  let priv = { V1: 'private', V2: 'public' };
  const svc = { Videos: { list: (p, o) => ({ items: priv[o.id] ? [{ status: { privacyStatus: priv[o.id] } }] : [] }),
                          update: (b) => upd.push(b) },
                Thumbnails: { set: (id) => th.push(id) } };
  const sv = { ytSvc_: global.ytSvc_, ytQuotaTake_: global.ytQuotaTake_ };
  global.ytSvc_ = () => svc; global.ytQuotaTake_ = () => true;
  for (const k in YT_PRIV_SEEN_) delete YT_PRIV_SEEN_[k];
  ok('۳.۱ خصوصی ⇒ دست نزن', ytHandsOff_('V1', 'آزمون') === true);
  ok('۳.۲ عمومی ⇒ ادامه', ytHandsOff_('V2', 'آزمون') === false);
  ok('۳.۳ خصوصی در دفتر ماند', ytOwnerPrivList_().indexOf('V1') !== -1);
  // خواندن نشد ⇒ دفتر جواب می‌دهد
  for (const k in YT_PRIV_SEEN_) delete YT_PRIV_SEEN_[k];
  svc.Videos.list = () => { throw new Error('شبکه'); };
  ok('۳.۴ خواندن نشد ولی در دفتر است ⇒ باز دست نزن', ytHandsOff_('V1', 'آزمون') === true);
  ok('۳.۵ خواندن نشد و در دفتر نیست ⇒ ادامه', ytHandsOff_('V9', 'آزمون') === false);

  // درِ واقعیِ بازگرداندنِ کاور: ویدئوی خصوصی کاور نمی‌گیرد
  for (const k in YT_PRIV_SEEN_) delete YT_PRIV_SEEN_[k];
  svc.Videos.list = (p, o) => ({ items: [{ status: { privacyStatus: priv[o.id] || 'public' } }] });
  const s2 = { ytRenderMapCached_: global.ytRenderMapCached_, ytThumbPaint_: global.ytThumbPaint_, ytPublished_: global.ytPublished_,
               ytThumbFor_: global.ytThumbFor_, ytOn_: global.ytOn_, ytThumbPaintSet_: global.ytThumbPaintSet_ };
  global.ytOn_ = () => true;
  global.ytRenderMapCached_ = () => ({ 'special:1': { thumb: 'P1' }, 'special:2': { thumb: 'P2' } });
  global.ytThumbPaint_ = () => ({});
  global.ytThumbPaintSet_ = () => {};
  global.ytPublished_ = () => ({ 'special:1': { videoId: 'V1' }, 'special:2': { videoId: 'V2' } });
  global.ytThumbFor_ = () => ({ painted: true, blob: {}, src: 'x' });
  const r = ytThumbRestore_(30000);
  ok('۳.۶ کاورِ نقاشی فقط روی ویدئوی عمومی نشست', th.length === 1 && th[0] === 'V2' && r.why.some((w) => /خصوصی/.test(w)), JSON.stringify({ th, why: r.why }));
  Object.assign(global, s2);

  // بازسازیِ عنوان و توضیح: خصوصی ⇒ هیچ update
  upd.length = 0;
  const src = String(global.ytRedoOne_ || '');
  ok('۳.۷ درِ بازسازی پیش از هر به‌روزرسانی می‌پرسد', /ytHandsOff_\(rec\.videoId, 'بازسازیِ عنوان، توضیح و کاور'\)/.test(require('fs').readFileSync('src/27_YouTube.gs', 'utf8')));
  void src;
  // هر Videos.update که privacyStatus: public می‌گذارد، از درِ ytHandsOff_ می‌گذرد (جز آپلودِ تازهٔ شورتز)
  const all = require('fs').readFileSync('src/27_YouTube.gs', 'utf8') + require('fs').readFileSync('src/38_Instagram.gs', 'utf8');
  const pubSites = all.split('\n').map((ln, i) => ({ ln, i })).filter((x) => /Videos\.update\(\{ id: (vid|keepVid|rec\.videoId),/.test(x.ln) || /privacyStatus: CFG\.YT_PRIVACY_FINAL/.test(x.ln) && /Videos\.update/.test(x.ln));
  ok('۳.۸ درهای عمومی‌کردنِ ویدئوی موجود شناخته‌شده‌اند', pubSites.length >= 2, String(pubSites.length));
  Object.assign(global, sv);
  resetProps([PK.YT_OWNER_PRIVATE]);
}

/* ── ۴) یک شورتز از هر درس در روز ── */
{
  resetProps([PK.YT_QUOTA]);
  const q = ytQuota_(); q.shortEps = ['40']; ytQuotaSave_(q);
  ok('۴.۱ درسی که امروز شورتز داشت شناخته می‌شود', igShortLessonToday_('40') === true && igShortLessonToday_('41') === false);
  const plan = { ep: '40', short: 'https://x/short.mp4', plan: {}, series: 'م', yt: '' };
  const sv = { ytSvc_: global.ytSvc_ };
  global.ytSvc_ = () => ({ Videos: {} });
  const r = igShortPub_({ ep: '40' }, plan);
  ok('۴.۲ دومین شورتزِ همان درس «صبر» می‌گیرد، با علت', r.wait && r.sameLesson && /امروز یک شورتز/.test(r.wait), JSON.stringify(r));
  // صف: بخش ۲ِ درس ۴۰ می‌ماند، درس ۴۱ جلو می‌رود؛ بخشِ ۲ِ ۴۱ پشتِ بخشِ ۱ِ همان درس
  const pubbed = [];
  const s2 = { igShortPub_: global.igShortPub_, igFolder_: global.igFolder_, igPlanRead_: global.igPlanRead_, igPlanWrite_: global.igPlanWrite_, DriveApp: global.DriveApp };
  global.DriveApp = Object.assign({}, global.DriveApp || {}, { getFolderById: (id) => ({ id }) });
  global.igFolder_ = (f, part) => ({ id: f.id + '/' + part });
  global.igPlanRead_ = (fo) => ({ ep: fo.id.split('/')[0], part: fo.id.split('/')[1] });
  global.igPlanWrite_ = () => {};
  global.igShortPub_ = (h, p) => {
    if (igShortLessonToday_(p.ep)) return { wait: 'هم‌درس', sameLesson: true };
    pubbed.push(p.ep + '.' + p.part);
    const qq = ytQuota_(); qq.shortEps = (qq.shortEps || []).concat([String(p.ep)]); ytQuotaSave_(qq);
    return { ok: true };
  };
  const st = { shortQ: [{ key: 'a', ep: '40', part: 2, folderId: '40' }, { key: 'b', ep: '41', part: 1, folderId: '41' },
                        { key: 'c', ep: '41', part: 2, folderId: '41' }, { key: 'd', ep: '42', part: 1, folderId: '42' }] };
  const n = igShortQueueRun_(st, Date.now() + 600000);
  ok('۴.۳ صف: ۴۱.۱ و ۴۲.۱ رفتند؛ ۴۰.۲ و ۴۱.۲ ماندند (فردا)', n === 2 && pubbed.join(',') === '41.1,42.1' &&
     st.shortQ.map((x) => x.ep + '.' + x.part).join(',') === '40.2,41.2', pubbed.join(',') + ' | ' + st.shortQ.map((x) => x.ep + '.' + x.part).join(','));
  ok('۴.۴ علتِ ماندن در وضعیت', /امروز یک شورتز/.test(String(st.shortWhy)) || /هم‌درس/.test(String(st.shortWhy)), st.shortWhy);
  Object.assign(global, s2, sv);
  resetProps([PK.YT_QUOTA]);
}

/* ── ۵) کپشن ── */
{
  const cap = igCaption_({ caption: 'دانستنِ واقعی با شانس فرق دارد. چون راه را می‌شناسی. https://youtu.be/xyz',
                           coverTitle: 'از کجا می‌دانی داروسازت راست می‌گوید؟', tags: ['معرفت'], part: 1, parts: 2 },
                         'https://www.youtube.com/watch?v=ABC', 'معرفت‌شناسی', 5);
  const lines = cap.split('\n');
  ok('۵.۱ سطرِ اول پرسشِ ملموس است', /؟$/.test(lines[0]) && /داروساز/.test(lines[0]), lines[0]);
  ok('۵.۲ هر جملهٔ ارزش یک سطرِ کوتاه', lines[1] === 'دانستنِ واقعی با شانس فرق دارد.' && lines[2] === 'چون راه را می‌شناسی.', lines.slice(1, 3).join(' | '));
  ok('۵.۳ اینستاگرام: «لینک در بیو» و هیچ نشانیِ خامی نیست', /لینک در بیو/.test(cap) && !/https?:\/\//.test(cap), cap);
  ok('۵.۴ نامِ مجموعه و درس می‌ماند', /مجموعهٔ «معرفت‌شناسی» — درسِ ۵، بخشِ ۱ از ۲|مجموعهٔ «معرفت‌شناسی» — درسِ ۵/.test(cap));
  ok('۵.۵ قانونِ کپشن به مدل: نه پیوند، نه صدای ساختگی', /صدای ساختگی/.test(IG_CAPTION_RULE) && /پیوند/.test(IG_CAPTION_RULE));
  ok('۵.۶ قلابِ ملموس با نمونه‌های کانال در پرامپت', /حلوا/.test(IG_HOOK_RULE) && /داروساز/.test(IG_HOOK_RULE));
  // شورتز: لینکِ مرده نمی‌آید
  global.__PROPS[PK.YT_OWNER_PRIVATE] = JSON.stringify(['DEAD1']);
  const sm = igShortMeta_({ plan: { ytDesc: 'یک. دو.', coverTitle: 'چرا حلوا شیرین نمی‌شود؟', tags: [] }, series: 'م', yt: 'https://www.youtube.com/watch?v=DEAD1', lesson: 3 }, '');
  ok('۵.۷ شورتز: پیوندِ ویدئوی خصوصی‌شده نمی‌آید', !/DEAD1/.test(sm.desc) && /^چرا حلوا/.test(sm.desc), sm.desc.slice(0, 120));
  const sm2 = igShortMeta_({ plan: { ytDesc: 'یک.', tags: [] }, series: 'م', yt: '', lesson: 3 }, '');
  ok('۵.۸ شورتز: نشانیِ خالی ⇒ سطرِ «نسخهٔ کامل» نمی‌آید', !/نسخهٔ کامل/.test(sm2.desc), sm2.desc);
  delete global.__PROPS[PK.YT_OWNER_PRIVATE];
  // توضیحِ ویدئوی کامل — ۱۱.۱: پیش‌فرض «مثلِ قبل» (بلوک می‌ماند)؛ برداشتن فقط با کلید
  const dKeep = ytDescFinal_('special:9', 'خلاصه\n\nگویندگانِ این قسمت:\nگویندهٔ Charon — ۰۰:۰۰–۱۰:۰۰\n\nدربارهٔ «درس‌نامه»');
  ok('۵.۹-الف (۱۱.۱) پیش‌فرض: توضیحِ ویدئوی بلند دست نمی‌خورد', CFG.YT_DESC_CAST === true && /گویندگانِ این قسمت/.test(dKeep));
  CFG.YT_DESC_CAST = false;
  const d = ytDescFinal_('special:9', 'خلاصه\n\nگویندگانِ این قسمت:\nگویندهٔ Charon — ۰۰:۰۰–۱۰:۰۰\nگویندهٔ Kore — ۱۰:۰۰–۱۲:۰۰\n\nدربارهٔ «درس‌نامه»');
  CFG.YT_DESC_CAST = true;
  ok('۵.۹ با کلیدِ خاموش «گویندگانِ این قسمت» بیرون می‌رود، بقیه می‌ماند', !/گوینده/.test(d) && /خلاصه/.test(d) && /دربارهٔ «درس‌نامه»/.test(d), d);
}

/* ── ۶) کپشن در تلگرام ── */
{
  tg.length = 0;
  const long = 'سطر\n\n'.repeat(1500);
  tgCaptionLog_('یوتیوب — ویدئوی کامل', 'عنوان <b>', 'https://youtu.be/x', long);
  ok('۶.۱ متنِ بلند در چند پیام، هیچ‌کدام بالای سقفِ تلگرام', tg.length >= 2 && tg.every((t) => t.length <= 4096), String(tg.length));
  ok('۶.۲ عنوان escape شد (HTML تلگرام نمی‌شکند)', /عنوان &lt;b&gt;/.test(tg[0]));
  CFG.TG_CAPTIONS = false; tg.length = 0;
  ok('۶.۳ خاموش ⇒ هیچ پیامی', tgCaptionLog_('x', 'y', '', 'z') === false && !tg.length);
  CFG.TG_CAPTIONS = true;
  const srcI = require('fs').readFileSync('src/38_Instagram.gs', 'utf8'), srcY = require('fs').readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۶.۴ سه درِ انتشار کپشن را می‌فرستند (ریلز، شورتز، ویدئوی کامل) و بازنویسی هم', /tgCaptionLog_\('اینستاگرام — ریلز'/.test(srcI) &&
     /tgCaptionLog_\('یوتیوب — شورتز'/.test(srcI) && /tgCaptionLog_\('یوتیوب — ویدئوی کامل'/.test(srcY) && /tgCaptionLog_\('یوتیوب — بازنویسیِ ویدئوی کامل'/.test(srcY));
}

/* ── ۷) الگوی ساعت و قالب ── */
{
  const now = Date.UTC(2026, 9, 25, 10, 0);
  const row = (utc, cap, v, w) => ['id', utc, 'REELS', 'k', cap, 'u', v, v, 0, 0, 0, 0, 0, w];
  const rows = [
    row('2026-10-16 18:30', 'آیا می‌دانستید که …', 134, 13.9),   // دبی ۲۲:۳۰ ⇒ شب
    row('2026-10-17 08:26', 'آیا تا به حال فکر کرده‌اید کلماتی مثل «علت» کجا زندگی می‌کنند؟', 207, 17.1), // ۱۲:۲۶ ⇒ بعدازظهر
    row('2026-10-17 05:27', 'چرا مفهومی مثل خورشید کُلی است؟ خیلی', 174, 14.1),  // ۰۹:۲۷ ⇒ صبح
    row('2026-10-16 22:29', 'آیا می‌دانستید احساس دروغ نمی‌گوید', 181, 21.2),     // ۰۲:۲۹ ⇒ بامداد
    row('2026-10-18 10:27', 'هزار بار دیدن کافی نیست. تجربه', 161, 9.8),         // جملهٔ خبری
    row('2026-10-25 08:00', 'آیا می‌دانستید تازه', 12, 3)                         // زیرِ ۴۸ ساعت ⇒ بیرون
  ];
  const p = igPattern_(rows, now);
  ok('۷.۱ پستِ زیرِ ۴۸ ساعت در مقایسه نمی‌آید', p.n === 5 && p.all === 6, JSON.stringify({ n: p.n, all: p.all }));
  const h = {}; p.byHour.forEach((x) => { h[x.k] = x; });
  ok('۷.۲ زمان از UTC به دبی (+۴) می‌رود', h['شب (۱۸ تا ۲۴)'] && h['شب (۱۸ تا ۲۴)'].med === 134 && h['بامداد (۰ تا ۶)'].med === 181 &&
     h['بعدازظهر (۱۲ تا ۱۸)'].n === 2, JSON.stringify(p.byHour));
  const k = {}; p.byHook.forEach((x) => { k[x.k] = x; });
  ok('۷.۳ قالبِ سطرِ اول سه دسته', k['آیا می‌دانستید'].n === 2 && k['پرسشِ دیگر'].n === 2 && k['جملهٔ خبری'].n === 1, JSON.stringify(p.byHook));
  ok('۷.۴ متنِ آماده برای تلگرام، با روز به روز', /الگوی ریلزهای اینستاگرام/.test(p.text) && /روز به روز/.test(p.text));
  ok('۷.۵ پربازدیدترین و کم‌بازدیدترین با درس، ساعت و سطرِ اول', /پربازدیدترین/.test(p.text) && /^207 · k · 10-17 12:/.test(p.top[0]) &&
     /^134 /.test(p.low[p.low.length - 1]), JSON.stringify({ top: p.top, low: p.low }));
}

/* ── ۸) بایگانیِ توضیحات ── */
{
  resetProps([PK.YT_DESC_ARCH]);
  const revWas = CFG.YT_DESC_ARCHIVE; CFG.YT_DESC_ARCHIVE = 1;
  docs.length = 0; tg.length = 0;
  const pub = {};
  for (let i = 1; i <= 30; i++) pub['special:' + i] = { videoId: 'V' + i, url: 'https://www.youtube.com/watch?v=V' + i, title: 'درس ' + i };
  pub['variety:3'] = { videoId: 'X3', url: '', title: 'از همه جا ۳' };
  let calls = 0;
  const sv = { ytSvc_: global.ytSvc_, ytQuotaTake_: global.ytQuotaTake_, ytPublished_: global.ytPublished_, getHub_: global.getHub_ };
  global.ytQuotaTake_ = () => true; global.getHub_ = () => ({});
  global.ytPublished_ = () => pub;
  global.ytSvc_ = () => ({ Videos: { list: (part, o) => { calls++; return { items: o.id.split(',').map((id) => ({ id, snippet: { title: 'T' + id, description: 'متنِ اصلِ ' + id }, status: { privacyStatus: 'public' } })) }; } } });
  const r1 = ytDescArchive_(60000);
  ok('۸.۱ ۳۱ ویدئو در دو فایل (۲۵ + ۶)', r1.sent === 31 && docs.length === 2 && calls === 2, JSON.stringify(r1) + ' docs=' + docs.length);
  const txt = docs[0].document.getDataAsString ? docs[0].document.getDataAsString() : String(docs[0].document);
  ok('۸.۲ فایل متنِ زندهٔ یوتیوب را دارد، با نشانی', /متنِ اصلِ V1/.test(txt) && /watch\?v=V1/.test(txt), txt.slice(0, 160));
  ok('۸.۳ پایان در تلگرام گفته شد', tg.some((t) => /کامل شد: 31 ویدئو/.test(t)));
  docs.length = 0;
  const r2 = ytDescArchive_(60000);
  ok('۸.۴ یک بار — دورِ بعد هیچ', r2.sent === 0 && !docs.length);
  CFG.YT_DESC_ARCHIVE = 2;
  pub['special:31'] = { videoId: 'V31', url: '', title: 'درس ۳۱' };
  const r3 = ytDescArchive_(60000);
  ok('۸.۵ (۱۱.۶) شمارهٔ تازه ⇒ فقط آنچه جا مانده، نه تکرارِ ۳۱ تای قبلی', r3.sent === 1, JSON.stringify(r3));
  CFG.YT_DESC_ARCHIVE = revWas;
  CFG.YT_DESC_ARCHIVE = 1;
  Object.assign(global, sv);
  resetProps([PK.YT_DESC_ARCH]);
}


/* ── ۹) ۱۱.۳: ردِ نرمِ سنجه، تیک‌های دسته، و حذف‌شده‌ها در تلگرام ── */
{
  const qa81 = { n: 41, matched: 36, miss: [14, 18, 29, 37, 41], blank: [], ok: false, why: 'فقط 36 از 41 صحنه سرِ جای خودش دیده شد', durDiff: 0, sync: { ok: true } };
  ok('۹.۱ special:81 (۳۶/۴۱، صفر قابِ خالی، همگامی سالم) ⇒ ردِ نرم', ytQaSoft_(qa81) === true);
  ok('۹.۲ قابِ خالی، یخ‌زدگی، اختلافِ مدت، ناهمگامی یا نسبتِ پایین ⇒ همچنان سد',
     !ytQaSoft_(Object.assign({}, qa81, { blank: [3], why: qa81.why + ' · 1 قابِ خالی (صحنهٔ 3)' })) &&
     !ytQaSoft_(Object.assign({}, qa81, { why: 'تصویر 1 جا یخ زد (483.7–511.2ث)' })) &&
     !ytQaSoft_(Object.assign({}, qa81, { durDiff: 5 })) &&
     !ytQaSoft_(Object.assign({}, qa81, { sync: { ok: false } })) &&
     !ytQaSoft_(Object.assign({}, qa81, { matched: 20 })));
  const sv = { ytApproved_: global.ytApproved_ };
  global.ytApproved_ = () => ({});
  global.__PROPS[PK.YT_SCENES_OK] = '99';
  const g = ytPublicGate_('special:81', { mode: 'scenes', qa: qa81 });
  ok('۹.۳ سدِ عمومی‌کردن همان را می‌پذیرد (درِ واقعیِ ytPublicGate_)', g.ok === true, JSON.stringify(g));
  const g2 = ytPublicGate_('special:82', { mode: 'scenes', qa: Object.assign({}, qa81, { blank: [2], why: '1 قابِ خالی (صحنهٔ 2)' }) });
  ok('۹.۴ قابِ خالی همچنان Unlisted نگه می‌دارد', g2.ok === false && /قابِ خالی/.test(g2.why));
  Object.assign(global, sv);

  // تیک‌ها روی روند اثر دارند
  const idx = [
    { name: 'طنز و سرگرمی', elig: 3721, fresh: 58, used: 74, left: 3921 },
    { name: 'علمی و آموزشی', elig: 5106, fresh: 37, used: 27, left: 5295 },
    { name: 'روانشناسی و رشد فردی', elig: 2048, fresh: 21, used: 0, left: 2050 },
    { name: 'فرهنگی، تاریخی و ادبی', elig: 2561, fresh: 19, used: 0, left: 2577 }
  ];
  const saved = { readIndex_: global.readIndex_, tabStats_: global.tabStats_, fetchRows_: global.fetchRows_, buildCandidates_: global.buildCandidates_, getHub_: global.getHub_ };
  global.readIndex_ = () => idx; global.getHub_ = () => ({});
  global.tabStats_ = (hub, name) => { const rows = []; for (let i = 0; i < 20; i++) rows.push({ row: i + 2, kind: i % 2 ? 'ویدیو' : 'عکس', fresh: false, score: 70, refs: 0 }); return { sheet: { name }, rows }; };
  global.buildCandidates_ = (rows) => rows;
  global.fetchRows_ = (sh, name, rws) => rws.map((r) => ({ id: name + r, kind: 'ویدیو', score: 70 }));
  delete global.__PROPS[PK.CAT_LOCK_UI];
  ok('۹.۵ بی تیک ⇒ همان پیکربندی', pickCategory_({}).title === 'علمی و آموزشی');
  const r1 = uiCatLockSave(true, ['روانشناسی و رشد فردی', 'علمی و آموزشی', 'دستهٔ ساختگی']);
  ok('۹.۶ تیکِ «روانشناسی» در نوبتِ اول ⇒ قسمتِ بعد از روانشناسی', r1.ok && pickCategory_({}).title === 'روانشناسی و رشد فردی' && /ناشناخته کنار رفت/.test(r1.message), r1.message);
  uiCatLockSave(true, ['فرهنگی، تاریخی و ادبی']);
  const p3 = pickCategory_({});
  ok('۹.۷ برداشتنِ تیکِ علمی ⇒ علمی دیگر انتخاب نمی‌شود، و نامزدهای دیگر هم فقط از تیک‌خورده‌ها', p3.title === 'فرهنگی، تاریخی و ادبی' && p3.others.length === 0, JSON.stringify(p3.others));
  uiCatLockSave(false, ['علمی و آموزشی']);
  ok('۹.۸ قفل خاموش از تخته ⇒ رتبه‌بندیِ عادی (طنز هم ممکن)', !catLockOn_() && /خاموش \(از تختهٔ مجموعه‌ها\)/.test(catLockLine_()));
  uiCatLockSave(true, []);
  ok('۹.۹ روشن ولی بی تیک ⇒ خاموش با یادداشت (نه «همه»)', !catLockOn_());
  uiCatLockSave(true, ['علمی و آموزشی']);
  const html = catPanelHtml_();
  ok('۹.۱۰ پنل: تیک، ترتیب، واجد و استفاده‌شده و دکمه‌ای که به uiCatLockSave وصل است',
     /catTick" checked/.test(html) && /class="catOrd"/.test(html) && /۵۱۰۶|5106/.test(html) && /catSave\(this\)/.test(html) &&
     /uiCatLockSave/.test(uiBoardHtml.toString() + String(global.uiBoardHtml)) || /uiCatLockSave/.test(require('fs').readFileSync('src/15_Board.gs', 'utf8')));
  Object.assign(global, saved);
  delete global.__PROPS[PK.CAT_LOCK_UI];

  // حذف‌شده‌ها زیرِ همان کپشن در تلگرام
  tg.length = 0;
  tgCaptionLog_('اینستاگرام — ریلز', 'درسِ ۵', 'https://instagram.com/reel/x', 'متن', ['پیوندِ مستقیم: https://youtu.be/v5']);
  ok('۹.۱۱ «حذف‌شده از نسخهٔ عمومی» در همان پیام، زیرِ متن', tg.length === 1 && /حذف‌شده از نسخهٔ عمومی/.test(tg[0]) && tg[0].indexOf('متن') < tg[0].indexOf('حذف‌شده'));
  const rmD = ytDescRemoved_('خلاصه\nگویندگانِ این قسمت:\nگویندهٔ Charon — ۰۰:۰۰\n\nپایان', 'خلاصه\n\nپایان');
  ok('۹.۱۲ سطرهای برداشته از توضیحِ ویدئوی بلند شناخته می‌شوند', rmD.length === 2 && /گویندگان/.test(rmD[0]), JSON.stringify(rmD));
  const srcI = require('fs').readFileSync('src/38_Instagram.gs', 'utf8'), srcY = require('fs').readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۹.۱۳ هر سه درِ انتشار حذف‌شده‌ها را می‌فرستند', /tgCaptionLog_\('اینستاگرام — ریلز'[^;]*rmI\)/.test(srcI) && /tgCaptionLog_\('یوتیوب — شورتز'[^;]*rmS\)/.test(srcI) && /ytDescRemoved_\(plan\.description, desc\)/.test(srcY));
}


/* ── ۱۰) ۱۱.۴: زیروبمِ هر تکه (آزمایشی) و کاورِ پرسشی ── */
{
  const py = require('child_process').execFileSync('python3', ['-c', 'import sys,json;sys.path.insert(0,"tools");import voicebridge as v\n' +
    'vg={"groups":[{"hz":150.0,"pitch":-3,"secs":100}],"speech":[[0,1]]*6,"assign":[0]*6,"meds":[150,160,190,120,None,240]}\n' +
    'print(json.dumps(v.segPitchPlan(vg)))']).toString();
  const sp = JSON.parse(py);
  ok('۱۰.۱ تکهٔ نزدیک به صدای گوینده دست نمی‌خورد (حالت سرِ جایش)؛ فقط بیرون‌زدگی بیش از ۲ نیم‌پرده', sp.pitch[0] === -3 && sp.pitch[1] === -3 && sp.pitch[4] === -3, py);
  ok('۱۰.۲ بیرون‌زدگی برمی‌گردد، با سقفِ ۴', sp.pitch[2] === -5 && sp.pitch[3] === -1 && sp.pitch[5] === -7 && sp.moved === 3, py);
  ok('۱۰.۳ بذرهای تازهٔ درسِ ۷۴ هر دو گوینده با پرچمِ segPitch و برچسبِ تازه', CFG.VOICE_SOUL_SEED.filter((x) => x.segPitch && x.ep === '74').length === 2 &&
     CFG.VOICE_SOUL_SEED.filter((x) => x.segPitch).every((x) => /زیروبمِ هر تکه/.test(x.tag)));
  ok('۱۰.۴ روی قسمت‌ها خاموش تا تأییدِ او', CFG.VBR_SEG_PITCH === false);
  const src36 = require('fs').readFileSync('src/36_VoiceBridge.gs', 'utf8'), pyS = require('fs').readFileSync('tools/voicebridge.py', 'utf8');
  ok('۱۰.۵ پرچم از بذر تا ردیفِ صف و تا رانر می‌رسد، و نتیجه به تلگرام', /if \(se\.segPitch\) seedSegP\[sk\] = true/.test(src36) && /segPitch: !!seedSegP\[k\]/.test(src36) &&
     /if \(pick\.segPitch\) tagO\.segPitch = true/.test(src36) && /if \(o\.segPitch \|\| CFG\.VBR_SEG_PITCH === true\) row\.segPitch = true/.test(src36) &&
     /if it\.get\("segPitch"\):/.test(pyS) && /rec\["segPitch"\] = segP/.test(pyS) && /زیروبمِ هر تکه \(آزمایشی\)/.test(src36));
  ok('۱۰.۶ کاور: پرسشِ تا ۶ واژه می‌ماند؛ خبری ⇒ پرسشِ قلاب؛ هیچ‌کدام ⇒ متنِ مدل',
     ytCoverQ_('از کجا می‌دانی راست می‌گوید؟', 'x') === 'از کجا می‌دانی راست می‌گوید؟' &&
     ytCoverQ_('سه شرطِ معرفت', 'چرا شانس دانستن نیست؟') === 'چرا شانس دانستن نیست؟' &&
     ytCoverQ_('سه شرطِ معرفت', 'این قسمت دربارهٔ معرفت است.') === 'سه شرطِ معرفت');
  ok('۱۰.۷ پرامپتِ کاور قاعدهٔ پرسشی را دارد', /پرسشِ ملموس و روزمره، حداکثر ۶ واژه/.test(ytMetaPrompt_.toString()));
}

summary('owner110');
