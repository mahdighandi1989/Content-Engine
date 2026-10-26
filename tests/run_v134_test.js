/* ══ آزمونِ ۱۳.۴ — ورودیِ «از همه جا» فقط از مجموعه‌های علمیِ مطمئن، و قسمتِ ۸۴ کنار از صفِ یوتیوب ══
 * صاحبِ کانال (از طریقِ هماهنگ‌کننده): «طرح «از همه جا» را پیاده کنید (الف: فقط از مجموعه‌های علمیِ مطمئن و فقط بخش‌های
 * محتوایی با فیلتر دو لایه؛ ب: نویسندگی و زبان‌آموزی بیرون با فهرست استثنایی که فقط او پر می‌کند؛ ج: گزارش منبع و قطعه‌ها در
 * ایمیل ۱۰ و تلگرام) … ردیف‌های بی‌مجموعه: داور سیرِ قسمت … اگر مطمئن نبود، بیرون بماند. قسمت ۸۴ … از صف انتشار کنار
 * بگذارید، حذف نکنید … هر ویدئوی دیگری از آن مجموعهٔ نویسندگی که در صف است را هم همین‌طور.»
 * داده‌ها از خودِ قسمتِ ۸۴ است (ردیف‌های ۴۵۸۱ و ۱۷۹۹ و دورهٔ نویسندگیِ خلاق)، نه ساختگیِ دلخواه.
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const W = SERIES_HEADERS.length;
const sRow = (key, f) => { const v = new Array(W).fill(''); v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; Object.keys(f || {}).forEach((c) => { v[Number(c) - 1] = f[c]; }); return v; };
const reg = (rows) => { const o = { rows: [], byKey: Object.create(null) }; rows.forEach((v, i) => { const r = { key: v[SC.KEY - 1], row: i + 2, vals: v }; o.rows.push(r); o.byKey[r.key] = r; }); return o; };

/* ── ۱) لایهٔ اولِ فیلترِ اداری: ردیفِ ۴۵۸۱ِ قسمتِ ۸۴ بیرون، درسِ واقعی با یک «تکلیف» نه ── */
const r4581 = { id: 'a4581', kind: 'صدا', topic: 'بازخورد و راهنمایی به شرکت‌کنندگانِ دوره',
  msg: 'مدرس نتایج را تا پایانِ هفته اعلام خواهد کرد و تکلیفِ جلسهٔ بعد را می‌گوید', summary: '' };
const r1799 = { id: 'a1799', kind: 'صدا', topic: 'تمرینِ کشیدنِ دست و فهرستِ کارهای ۲۴ ساعت',
  msg: 'این تمرین مشاهده را تقویت می‌کند؛ برای تکلیف یک صفحه بنویسید', summary: '' };
ok('۱.۱ ردیفِ ۴۵۸۱ («نتایج را … اعلام خواهد کرد … جلسهٔ بعد») ⇒ «اداری/مقدماتیِ کلاس»', /اداری\/مقدماتی/.test(vgAdmin_(r4581)), vgAdmin_(r4581));
ok('۱.۲ ردیفِ محتوایی با یک «تکلیف» تنها بیرون نمی‌رود (کفِ ۲ نشانه)', vgAdmin_(r1799) === '', vgAdmin_(r1799));
ok('۱.۳ نشانه با شروعِ واژه: «ثبت‌نام» با نیم‌فاصله و «ثبت نام» با فاصله هر دو', vgSigns_('ثبت‌نام و شهریهٔ دوره', CFG.VG_ADMIN_SIGNS).length >= 2 &&
   vgSigns_('ثبت نام', ['ثبت‌نام']).length === 1);

/* ── ۲) ب: نویسندگی و زبان‌آموزی بیرون؛ استثنای صاحبِ کانال باز می‌کند ── */
const writing = sRow('w-course', { [SC.NAME]: 'کارگاهِ نویسندگیِ خلاق', [SC.IS_COURSE]: SJ.YES, [SC.CAT]: 'فرهنگی، تاریخی و ادبی', [SC.TOPIC]: 'داستان‌نویسی' });
const lang = sRow('l-course', { [SC.NAME]: 'English Grammar in Use', [SC.IS_COURSE]: SJ.YES, [SC.CAT]: 'علمی و آموزشی' });
const epist = sRow('e-course', { [SC.NAME]: 'معرفت‌شناسی', [SC.IS_COURSE]: SJ.YES, [SC.CAT]: 'علمی و آموزشی', [SC.ABOUT]: 'نظریه‌های توجیه و منابعِ شناخت' });
const unsure = sRow('u-course', { [SC.NAME]: 'روانشناسیِ رشد', [SC.IS_COURSE]: SJ.UNSURE, [SC.CAT]: 'روانشناسی و رشد فردی' });
const manual = sRow('m-course', { [SC.NAME]: 'فیزیکِ پایه', [SC.IS_COURSE]: SJ.UNSURE, [SC.MANUAL]: SMAN.YES, [SC.CAT]: 'علمی و آموزشی' });
const humor = sRow('h-series', { [SC.NAME]: 'سریالِ طنز', [SC.IS_COURSE]: SJ.YES, [SC.CAT]: 'طنز و سرگرمی' });
const R = reg([writing, lang, epist, unsure, manual, humor]);
const noAllow = { keys: Object.create(null), names: Object.create(null), n: 0 };
const g = (k, al) => vgSeriesOk_(R.byKey[k], al || noAllow);
ok('۲.۱ دورهٔ نویسندگیِ خلاق (آموزشی=بله، دستهٔ فرهنگی که در قفل هست) ⇒ بیرون به‌خاطرِ «نویسندگی»', !g('w-course').ok && /نویسندگی/.test(g('w-course').why), g('w-course').why);
ok('۲.۲ گرامرِ انگلیسی ⇒ بیرون (زبان‌آموزی)', !g('l-course').ok && /نویسندگی\/زبان‌آموزی/.test(g('l-course').why), g('l-course').why);
ok('۲.۳ معرفت‌شناسی (آموزشی=بله، علمی) ⇒ می‌ماند', g('e-course').ok, g('e-course').why);
ok('۲.۴ «مشکوک» ⇒ بیرون («مطمئن نیست»)', !g('u-course').ok && /مطمئن نیست/.test(g('u-course').why));
ok('۲.۵ تصمیمِ دستیِ «آموزشی است» بر «مشکوک»ِ داور مقدم است', g('m-course').ok);
ok('۲.۶ دستهٔ بیرون از قفلِ علمی («طنز و سرگرمی») ⇒ بیرون', !g('h-series').ok && /در دسته‌های علمی نیست/.test(g('h-series').why), g('h-series').why);
const allow = { keys: Object.assign(Object.create(null), { 'w-course': 1 }), names: Object.create(null), n: 1 };
ok('۲.۷ استثنای صاحبِ کانال (کلید در تبِ استثنا) ⇒ همان دورهٔ نویسندگی می‌ماند', g('w-course', allow).ok && g('w-course', allow).why === 'استثنای شما');
ok('۲.۸ تبِ استثنا: موتور فقط سرستون می‌سازد، هرگز ردیف نمی‌نویسد', !/getSheetByName\(CFG\.VG_ALLOW_TAB[^\n]*appendRow|VG_ALLOW_TAB[\s\S]{0,400}appendRow/.test(fs.readFileSync('src/37_VarietyMedia.gs', 'utf8').split('function vgAllowList_')[1].split('\nfunction ')[0]) &&
   VG_ALLOW_HEADERS[0] === 'کلید مجموعه');

/* ── ۳) دروازه روی نامزدها ── */
VG_CTX_ = { err: '', reg: R, allow: noAllow, parts: { byFile: Object.assign(Object.create(null), {
  a1799: { key: 'w-course' }, e1: { key: 'e-course' }, e2: { key: 'e-course' }, u1: { key: 'u-course' } }) } };
VG_OUT_ = [];
const items = [r4581, Object.assign({}, r1799), { id: 'e1', kind: 'صدا', topic: 'توجیهِ ادراکی', msg: 'باورِ ادراکی' },
  { id: 'e2', kind: 'صدا', topic: 'حافظه', msg: 'حافظه منبعِ توجیه است' }, { id: 'u1', kind: 'صدا', topic: 'رشد', msg: 'مراحل' },
  { id: 'clip1', kind: 'ویدیو', topic: 'سیاه‌چاله چیست', msg: 'افقِ رویداد' }];
const out = vgGate_({}, items);
const ids = out.keep.map((x) => x.id);
ok('۳.۱ می‌مانند: دو قطعهٔ معرفت‌شناسی و کلیپِ بی‌مجموعه؛ بیرون: اداری، نویسندگی، مشکوک',
   ids.join(',') === 'e1,e2,clip1' && out.out.length === 3, ids.join(',') + ' | ' + out.out.map((x) => x.why).join(' · '));
ok('۳.۲ کلیپِ بی‌مجموعه `vgLoose` می‌گیرد؛ قطعهٔ مجموعه نامِ مجموعه را با خود دارد',
   out.keep[2].vgLoose === true && out.keep[0].vgLoose === false && out.keep[0].vgSeries.name === 'معرفت‌شناسی');
VG_CTX_ = { err: 'نشد', reg: null, parts: null, allow: noAllow };
const out2 = vgGate_({}, [{ id: 'e1', topic: 'x', msg: 'y' }]);
ok('۳.۳ رجیستری خوانده نشد ⇒ «بی‌مجموعه» (فقط با «بله»ی داور)، نه «همه مجاز»', out2.keep.length === 1 && out2.keep[0].vgLoose === true);

/* ── ۴) داورِ سیر: بی‌مجموعه فقط با «بله»؛ نامطمئن و داوریِ نشده ⇒ بیرون ── */
const realGT = global.geminiText_;
const ch = () => [{ id: 's1', kind: 'صدا', topic: 'a', vgLoose: false }, { id: 's2', kind: 'صدا', topic: 'b', vgLoose: false },
  { id: 's3', kind: 'صدا', topic: 'c', vgLoose: false }, { id: 'c1', kind: 'ویدیو', topic: 'd', vgLoose: true },
  { id: 'c2', kind: 'عکس', topic: 'e', vgLoose: true }];
let seenPrompt = '';
global.geminiText_ = (pr) => { seenPrompt = pr; return { verdicts: [
  { id: 's1', belongs: 'بله' }, { id: 's2', belongs: 'بله' }, { id: 's3', belongs: 'بله' },
  { id: 'c1', belongs: 'بله', science: 'بله' }, { id: 'c2', belongs: 'بله', science: 'نامطمئن' }] }; };
let jd = curateJudge_('توجیهِ ادراکی', 'x', '', ch());
ok('۴.۱ «بله»ی علمی ⇒ می‌ماند؛ «نامطمئن» ⇒ بیرون با دلیل', jd.keep.map((x) => x.id).join(',') === 's1,s2,s3,c1' &&
   jd.dropped.length === 1 && /تأیید نکرد/.test(jd.dropped[0].why), jd.keep.map((x) => x.id).join(','));
ok('۴.۲ پرامپتِ داور: «بی‌مجموعه» علامت دارد، قاعدهٔ science و قاعدهٔ «اداریِ کلاس ⇒ خیر»',
   /c1 \| نوع: ویدیو \| بی‌مجموعه/.test(seenPrompt) && /نامطمئن یعنی بیرون/.test(seenPrompt) && /اعلامِ نتایج/.test(seenPrompt));
global.geminiText_ = () => { throw new Error('مدل در دسترس نیست'); };
jd = curateJudge_('توجیهِ ادراکی', 'x', '', ch());
ok('۴.۳ داوری نشد ⇒ هر دو بی‌مجموعه بیرون («داوری انجام نشد»)، مجموعه‌ای‌ها می‌مانند',
   jd.keep.map((x) => x.id).join(',') === 's1,s2,s3' && jd.dropped.every((x) => /داوری انجام نشد/.test(x.why)));
global.geminiText_ = () => ({ verdicts: [{ id: 's1', belongs: 'خیر' }, { id: 's2', belongs: 'خیر' }, { id: 's3', belongs: 'خیر' },
  { id: 'c1', belongs: 'بله', science: 'خیر' }, { id: 'c2', belongs: 'خیر' }] });
jd = curateJudge_('x', 'x', '', ch());
ok('۴.۴ قاعدهٔ «کمتر از سه نماند ⇒ همه بمانند» بی‌مجموعهٔ ردشده را برنمی‌گرداند', jd.keep.every((x) => !x.vgLoose), jd.keep.map((x) => x.id).join(','));
{
  const refsL = [{ id: 'r1', kind: 'ویدیو', topic: 'فتوسنتز', vgLoose: true }, { id: 'r2', kind: 'عکس', topic: 'میم', vgLoose: true }];
  global.geminiText_ = (pr) => { seenPrompt = pr; return { verdicts: ch().map((x) => ({ id: x.id, belongs: 'بله', science: 'بله' }))
    .concat([{ id: 'r1', belongs: 'بله', science: 'بله' }, { id: 'r2', belongs: 'بله', science: 'نامطمئن' }]) }; };
  curateJudge_('x', 'x', '', ch(), refsL);
  ok('۴.۵ ارجاعِ بی‌مجموعه هم به داور می‌رود و فقط «بله»ی علمی نگهش می‌دارد', /ارجاع‌های کوتاه به قسمت‌های پیشین/.test(seenPrompt) &&
     /- id: r2 \| نوع: عکس \| بی‌مجموعه/.test(seenPrompt) && refsL[0].vgSci === true && refsL[1].vgSci === false);
}
global.geminiText_ = realGT;

/* ── ۵) قسمتِ ۸۴ و صفِ یوتیوب: کنار، نه پاک؛ با برداشتنِ دستور برمی‌گردد ── */
YT_HOLD_CACHE_ = null;
ok('۵.۱ variety:84 در دستورِ صاحبِ کانال است، با جملهٔ خودش', /کنار گذاشته شد به دستور صاحب کانال/.test(ytOwnerHoldWhy_({ key: 'variety:84' })));
props_().setProperty(PK.YT_DUE, JSON.stringify([{ key: 'variety:84', show: 'variety', ep: '84' }, { key: 'special:85', show: 'special', ep: '85' }]));
props_().deleteProperty(PK.YT_DUE_PARKED);
let due = ytDueList_();
const parked = ytDueParked_();
ok('۵.۲ صف: variety:84 کنار رفت (در YT_DUE_PARKED، پاک نشد)، special:85 ماند',
   due.map((x) => x.key).join(',') === 'special:85' && parked.some((x) => x.key === 'variety:84'), JSON.stringify(due) + ' | ' + JSON.stringify(parked));
ok('۵.۳ خطِ ایمیلِ ۱۰: «کنار گذاشته شد به دستور صاحب کانال»', /کنار گذاشته از صفِ یوتیوب \(پاک نشده\): variety:84 — کنار گذاشته شد به دستور صاحب کانال/.test(ytShowsOffLine_()), ytShowsOffLine_());
const saveHold = CFG.YT_OWNER_HOLD; CFG.YT_OWNER_HOLD = {}; YT_HOLD_CACHE_ = null;
due = ytDueList_();
ok('۵.۴ برداشتنِ دستور ⇒ variety:84 خودش به صف برمی‌گردد', due.some((x) => x.key === 'variety:84'), JSON.stringify(due));
CFG.YT_OWNER_HOLD = saveHold; YT_HOLD_CACHE_ = null;
ok('۵.۵ آپلود هم همان در را می‌پرسد و کنارِ دستوری را با `hold` نشان می‌زند (پس برمی‌گردد)',
   /var hw0 = ytOwnerHoldWhy_\(item\)/.test(fs.readFileSync('src/27_YouTube.gs', 'utf8')) && /park\[j\]\.hold/.test(fs.readFileSync('src/27_YouTube.gs', 'utf8')));

/* ── ۶) بقیهٔ ویدئوهای صف از مجموعهٔ نویسندگی: پیدا، کنار، فهرست ── */
VG_CTX_ = { err: '', reg: R, allow: noAllow, parts: { byFile: Object.assign(Object.create(null), { a1799: { key: 'w-course' }, a1795: { key: 'w-course' }, e1: { key: 'e-course' } }) } };
props_().setProperty(PK.YT_DUE, JSON.stringify([{ key: 'variety:85', show: 'variety', ep: '85' }, { key: 'variety:86', show: 'variety', ep: '86' }]));
props_().deleteProperty(PK.YT_OWNER_HOLD); props_().deleteProperty(PK.VG_HOLD_AT); YT_HOLD_CACHE_ = null;
const podRows = [[85, '', '', '', '', '', '', '', '', '', '', 'a1795, x9'], [86, '', '', '', '', '', '', '', '', '', '', 'e1, clip2']];
const fakeHub = { getSheetByName: (n) => n === CFG.TAB_PODCASTS ? { getLastRow: () => podRows.length + 1, getRange: () => ({ getValues: () => podRows }) } : null };
const sw = vgHoldSweep_(fakeHub);
ok('۶.۱ variety:85 (منبعش از دورهٔ نویسندگی) کنار رفت؛ variety:86 (معرفت‌شناسی) نه', sw.held.join(',') === 'variety:85' && sw.checked === 2, JSON.stringify(sw));
YT_HOLD_CACHE_ = null;
ok('۶.۲ همان دلیل در خطِ روزانه، با نامِ مجموعه', /variety:85 — منبعش از مجموعهٔ نویسندگی\/زبان‌آموزی است \(«کارگاهِ نویسندگیِ خلاق»\)/.test(ytShowsOffLine_()), ytShowsOffLine_());
ok('۶.۳ روزی یک بار (بارِ دوم بی خواندنِ هاب)', vgHoldSweep_({ getSheetByName: () => { throw new Error('نباید خوانده شود'); } }).checked === 0);
ok('۶.۴ سیم: `ytRunDue_` پیش از خواندنِ صف پیمایش را صدا می‌زند', /var hub = getHub_\(\);\s*\/\*[^*]*\*\/\s*try \{ if \(typeof vgHoldSweep_ === 'function'\) vgHoldSweep_\(hub\);/.test(fs.readFileSync('src/27_YouTube.gs', 'utf8')));

/* ── ۷) ج: گزارشِ منبع در ایمیلِ ۱۰ و تلگرام ── */
props_().deleteProperty(PK.MAIL_QUEUE);
VG_OUT_ = [{ id: 'a4581', why: 'اداری/مقدماتیِ کلاس (نتایج را)' }];
const body = vgReport_(85, 'توجیهِ ادراکی', [{ id: 'e1', kind: 'صدا', topic: 'توجیهِ ادراکی', vgSeries: { name: 'معرفت‌شناسی', cat: 'علمی و آموزشی' } },
  { id: 'clip1', kind: 'ویدیو', topic: 'سیاه‌چاله', vgLoose: true }], [{ id: 'c2', why: 'بی‌مجموعه؛ داور «علمی و محتوایی» را تأیید نکرد' }]);
const mq = mailQueueRead_();
ok('۷.۱ متن: هر عضو با مجموعه‌اش یا «بی‌مجموعه — داور»، و کنارگذاشته‌ها با دلیل',
   /مجموعهٔ «معرفت‌شناسی» \(علمی و آموزشی\)/.test(body) && /بی‌مجموعه — داور: علمی و محتوایی/.test(body) && /کنار گذاشته \(۲\)/.test(body) && /اداری\/مقدماتی/.test(body), body);
ok('۷.۲ در صفِ ایمیلِ ۱۰ نشست', mq.some((x) => x.kind === 'variety-source' && /منبعِ قسمتِ ۸۵/.test(x.title)), JSON.stringify(mq).slice(0, 200));
const st = vgStatus_();
ok('۷.۳ `_STATUS.varietyGate`: آخرین گزارش با شمار و خطِ روزانه', st.last && st.last.n === 2 && st.last.series === 1 && st.last.loose === 1 && st.last.out === 2 &&
   /فقط مجموعه‌های علمیِ مطمئن/.test(st.line), JSON.stringify(st).slice(0, 300));
const s03 = fs.readFileSync('src/03_Producer.gs', 'utf8'), s08 = fs.readFileSync('src/08_Health.gs', 'utf8');
ok('۷.۴ سیم: گزارش پس از ثبتِ ردیفِ پادکست، و تلگرام در خودِ `vgReport_`',
   /pod\.appendRow\(\[epNum[\s\S]{0,600}vgReport_\(epNum, ep\.title, items, vgJudged\)/.test(s03) && /tgSend_\('🧭/.test(fs.readFileSync('src/37_VarietyMedia.gs', 'utf8')));
ok('۷.۵ سیم: `_STATUS.varietyGate` و خطِ روزانه', /varietyGate: \(function/.test(s08) && /vgStatus_\(\)\.line/.test(s08));

/* ── ۸) سیم‌های دروازه در انتخاب و «پادکست متوقف نشود» ── */
ok('۸.۱ دروازه روی نامزدهای دسته، ارجاع‌ها و دسته‌های دیگر', /items = vgApply_\(hub, items, '«' \+ ranked\[t\]\.name \+ '»'\)/.test(s03) &&
   /refs = vgApply_\(hub, refs, 'ارجاع'\);/.test(s03) && /refs = \(cur\.references \|\| \[\]\)\.filter\(function \(x\) \{ return CFG\.VG_ON === false \|\| !x\.vgLoose \|\| x\.vgSci; \}\)/.test(s03) && /curateJudge_\(cur\.theme, cur\.connection, cur\.route, mixed, cur\.references \|\| \[\]\)/.test(s03) && /concat\(vgApply_\(hub, fetchRows_\(st\.sheet, names\[i\]/.test(s03));
ok('۸.۲ گزینشِ بی‌نخ هم از داورِ «علمی و محتوایی» می‌گذرد (بی‌مجموعهٔ تأییدنشده بیرون)', /var jf = curateJudge_\('بی‌نخ/.test(s03) && /return !x\.vgLoose \|\| x\.vgSci;/.test(s03));
ok('۸.۳ دستهٔ کم‌آمده امروز کنار و جبران با دستهٔ بعدی', /vgSkipAdd_\(picked\.title\)/.test(s03) && /if \(vgSkipNow_\(\)\.indexOf\(ranked\[t\]\.name\) !== -1\) continue;/.test(s03));
vgSkipAdd_('علمی و آموزشی');
ok('۸.۴ فهرستِ کنارِ امروز خوانده می‌شود', vgSkipToday_().indexOf('علمی و آموزشی') !== -1 && vgSkipNow_().indexOf('علمی و آموزشی') !== -1);
ok('۸.۵ تولید دست نخورد: VBR_EP_HOLD روشن، VBR_SEG_PITCH خاموش', CFG.VBR_EP_HOLD === true && CFG.VBR_SEG_PITCH === false);

/* ── ۹) دفترِ درخواست‌ها در ایمیل: درخواستِ همین نسخه پشتِ ردیف‌های قدیمی گم نمی‌شود ── */
const s12 = fs.readFileSync('src/12_Reports.gs', 'utf8');
ok('۹.۱ ترتیبِ فهرستِ ایمیل: نادرست ⇒ همین نسخه ⇒ بقیه', /x\.ver && x\.ver === running \? 1 : 2/.test(s12));
const reqs = JSON.parse(fs.readFileSync('docs/requests.json', 'utf8'));
const rl = (reqs.requests || reqs).filter((x) => x.ver === '13.4');
ok('۹.۲ ردیف‌های ۱۳.۴ در دفتر (الف، ب، ج، بی‌مجموعه، قسمتِ ۸۴، فهرستِ صف، جدولِ پوشش)', rl.length >= 6, rl.map((x) => x.id).join(','));

summary('۱۳.۴');
