/* ══ آزمونِ ۱۲.۶ — داوری از محتوا (۱۰/۵۰/۹۰٪ + عنوانِ همهٔ قسمت‌ها + سرفصلِ جزوه)، داوریِ ناقص، و مرزِ ردیفِ دستی ══
 *
 * صاحبِ کانال: «ردیفِ «داوریِ ناقص» برای مجموعه‌های فعلی هم یک بار دوباره داوری شود، ولی هیچ دستهٔ دستی یا شمارهٔ دستی یا
 * «تصمیم دستی» عوض نشود، و نتیجه فقط در تب بازبینی بیاید، نه بی‌صدا در صف.»
 * نمونه‌ها: مصباح (دستی، دستهٔ خودکارِ غلطِ «سیاسی و خبری»)، خداشناسی (بی‌مدل)، آئودی (دستی و کامل)، و «ریکاوری» با نامِ گمراه‌کننده.
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const W = SERIES_HEADERS.length;
const row = (key, f) => { const v = new Array(W).fill(''); v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; Object.keys(f || {}).forEach((c) => { v[Number(c) - 1] = f[c]; }); return v; };
const fakeReg = (rows) => ({ rows: rows.map((v, i) => ({ key: v[SC.KEY - 1], row: i + 2, vals: v })), sheet: { getRange: () => ({ setValues: () => {} }) } });

const mesbah = row('mesbah', { [SC.MCAT]: 'فلسفی و اعتقادی', [SC.MORDER]: 1, [SC.CAT]: 'سیاسی و خبری', [SC.IS_COURSE]: SJ.YES, [SC.CSCORE]: 72,
  [SC.LEVEL]: 'میانی', [SC.ABOUT]: 'موضوع‌های پرتکرارِ متن: انقلاب، دولت، مجلس', [SC.WHY]: '[بی‌مدل] داوری از روی متن', [SC.STATUS]: SST.ACTIVE, [SC.JUDGED]: '2026-10-24 10:00' });
const khoda = row('khoda', { [SC.CAT]: 'دینی', [SC.IS_COURSE]: SJ.UNSURE, [SC.ABOUT]: 'موضوع‌های پرتکرارِ متن: خدا، برهان', [SC.WHY]: '[بی‌مدل] داوری از روی متن', [SC.STATUS]: SST.NEW, [SC.JUDGED]: '2026-10-24 10:00' });
const audi = row('audi', { [SC.MCAT]: 'علمی و آموزشی', [SC.MORDER]: 2, [SC.CAT]: 'علمی و آموزشی', [SC.IS_COURSE]: SJ.YES, [SC.ABOUT]: 'آموزشِ تعمیرِ خودروی آئودی', [SC.WHY]: 'درسِ فنی', [SC.STATUS]: SST.NEW, [SC.JUDGED]: '2026-10-24 10:00' });
const recov = row('recovery', { [SC.NAME]: 'ریکاوری بعد از تمرین', [SC.STATUS]: SST.NEW });
const manualNo = row('manualno', { [SC.MANUAL]: SMAN.NO, [SC.ABOUT]: 'موضوع‌های پرتکرارِ متن: روضه', [SC.WHY]: '[بی‌مدل] x', [SC.STATUS]: SST.NEW, [SC.JUDGED]: '2026-10-24 10:00' });

/* ── ۱) کدام ردیف‌ها دوباره داوری می‌شوند ── */
{
  const reg = fakeReg([mesbah, khoda, audi, manualNo]);
  const need = seriesNeedingJudgement_(reg);
  const keys = need.map((r) => r.key).sort().join(',');
  ok('۱.۱ مصباح (دستی، بی‌مدل) و خداشناسی و «تصمیمِ دستی»ِ بی‌مدل دوباره؛ آئودی (دستی و کامل) نه', keys === 'khoda,manualno,mesbah', keys);
  ok('۱.۲ ردیف‌های دستی نشانِ «فقط شرح» دارند، ردیفِ آزاد ندارد',
     need.find((r) => r.key === 'mesbah').__redoLocked === true && need.find((r) => r.key === 'manualno').__redoLocked === true && !need.find((r) => r.key === 'khoda').__redoLocked);
}

/* ── ۲) داوریِ مدل روی ردیفِ دستی: فقط شرح/دلیل/دستهٔ خودکار ── */
{
  const v = mesbah.slice(), reg = fakeReg([v]); reg.rows[0].__redoLocked = true;
  const keepCols = [SC.MCAT, SC.MORDER, SC.MANUAL, SC.IS_COURSE, SC.CSCORE, SC.LEVEL, SC.ORDER, SC.STATUS, SC.TOPIC, SC.RELATED];
  const before = keepCols.map((c) => v[c - 1]);
  applyVerdict_(reg, reg.rows[0], { key: 'mesbah', isCourse: 'true', courseSure: '90', score: '88', about: 'شرحِ آموزشِ فلسفهٔ اسلامی: معرفت‌شناسی و هستی‌شناسی',
    topic: 'فلسفهٔ اسلامی', category: 'فلسفی و اعتقادی', catSure: '85', level: 'پیشرفته', orderHint: '3', why: 'درسِ نظام‌مندِ فلسفه' }, { text: 'x'.repeat(2000), partNames: [] }, true);
  const after = keepCols.map((c) => v[c - 1]);
  ok('۲.۱ دستهٔ دستی، شمارهٔ دستی، تصمیمِ دستی، آموزشی، امتیاز، سطح، ترتیب، وضعیت دست نخوردند', JSON.stringify(before) === JSON.stringify(after), JSON.stringify(after));
  ok('۲.۲ شرحِ واقعی جای «موضوع‌های پرتکرار» نشست', /معرفت‌شناسی/.test(v[SC.ABOUT - 1]), v[SC.ABOUT - 1]);
  ok('۲.۳ دستهٔ خودکارِ غلطِ «سیاسی و خبری» اصلاح شد (فقط نمایش)', v[SC.CAT - 1] === 'فلسفی و اعتقادی', v[SC.CAT - 1]);
  ok('۲.۴ پیشنهادِ داور در «دلیل» با نشانِ اعمال‌نشده، و بی نشانِ بی‌مدل', /داوریِ دوبارهٔ ۱۲٫۶/.test(v[SC.WHY - 1]) && /اعمال‌نشده/.test(v[SC.WHY - 1]) &&
     /سطح=پیشرفته/.test(v[SC.WHY - 1]) && v[SC.WHY - 1].indexOf(JUDGE_LOCAL_MARK) === -1 && !/ترتیب پیشنهادی/.test(v[SC.WHY - 1]), v[SC.WHY - 1]);
  ok('۲.۵ و فقط یک بار: دورِ بعد دیگر در فهرستِ داوری نیست', seriesNeedingJudgement_(fakeReg([v])).length === 0);
  ok('۲.۶ تبِ بازبینی آن را «پیشنهادِ داور (اعمال‌نشده)» نشان می‌دهد', /پیشنهادِ داور/.test(seriesJudgeState_(v)));
  ok('۲.۷ دستهٔ مؤثرِ مصباح همان دستی است', seriesCatOf_(v) === 'فلسفی و اعتقادی' && seriesCatTrusted_(v) === 'فلسفی و اعتقادی');
}

/* ── ۳) مدل در دسترس نیست: داوریِ بی‌مدل روی ردیفِ دستی هیچ نمی‌نویسد ── */
{
  const v = mesbah.slice(), reg = fakeReg([v]); reg.rows[0].__redoLocked = true;
  const snap = JSON.stringify(v);
  applyVerdict_(reg, reg.rows[0], localVerdict_({ key: 'mesbah', text: 'دولت مجلس انتخابات خبر '.repeat(60), partNames: [], name: 'mesbah', parts: 3, chunks: 30 }), {}, true);
  ok('۳.۱ ردیفِ دستی با شکستِ مدل عیناً همان ماند (و دورِ بعد دوباره امتحان می‌شود)', JSON.stringify(v) === snap && seriesNeedingJudgement_(fakeReg([v])).length === 1);
  const k = khoda.slice(); k[SC.CAT - 1] = ''; const rk = fakeReg([k]);
  applyVerdict_(rk, rk.rows[0], localVerdict_({ key: 'khoda', text: 'برهان وجود خدا تعریف مفهوم قاعده درس '.repeat(40), partNames: [], name: 'khoda', parts: 3, chunks: 30 }), { text: 'x'.repeat(1000) }, true);
  ok('۳.۲ ردیفِ آزاد: داوریِ بی‌مدل «داوریِ ناقص» نشان می‌خورد و دسته‌اش «نیازمند بازبینی»، نه حدسِ واژه‌شمار',
     /داوریِ ناقص/.test(k[SC.WHY - 1]) && k[SC.CAT - 1] === CFG.SERIES_CAT_UNSURE && seriesJudgeState_(k) === 'داوریِ ناقص', k[SC.CAT - 1] + ' | ' + k[SC.WHY - 1]);
}

/* ── ۴) نامِ گمراه‌کننده و اطمینانِ کم ⇒ «نیازمند بازبینی» ── */
{
  const v = recov.slice(), reg = fakeReg([v]);
  applyVerdict_(reg, reg.rows[0], { key: 'recovery', isCourse: 'true', courseSure: '40', score: '65', about: 'گفت‌وگو دربارهٔ ترکِ اعتیاد، نه ورزش',
    topic: 'ترکِ اعتیاد', category: 'سلامت و پزشکی', catSure: '45', level: 'مقدماتی', why: 'نام دربارهٔ ورزش است ولی متن دربارهٔ اعتیاد' }, { text: 'x'.repeat(2000), partNames: [] }, true);
  ok('۴.۱ اطمینانِ کم به «آموزشی» ⇒ مشکوک با علت', v[SC.IS_COURSE - 1] === SJ.UNSURE && /نیازمند بازبینی: اطمینانِ داور 40/.test(v[SC.WHY - 1]), v[SC.IS_COURSE - 1] + ' | ' + v[SC.WHY - 1]);
  ok('۴.۲ و در تبِ بازبینی «نیازمند بازبینی»', seriesJudgeState_(v) === 'نیازمند بازبینی');
  ok('۴.۳ مجموعهٔ تازهٔ بی شمارهٔ دستی وارد صف نمی‌شود (دستهٔ خودکار اعتبار ندارد)', CFG.SERIES_AUTO_CAT_TRUST === false && !isFinite(seriesMOrder_(v)));
}

/* ── ۵) نمونه از ۱۰/۵۰/۹۰٪، عنوانِ همهٔ قسمت‌ها، سرفصلِ جزوه — همه در پرامپت ── */
{
  const mkPart = (seq, name, chunks) => { const v = new Array(40).fill(''); v[SP.SEQ - 1] = seq; v[SP.NAME - 1] = name; v[SP.CHUNKS - 1] = chunks; return { vals: v }; };
  const parts = [mkPart(1, 'جلسه ۱ مقدمه', 10), mkPart(2, 'جلسه ۲ معرفت‌شناسی', 10), mkPart(3, 'جلسه ۳ برهان صدیقین', 10)];
  const sv = global.readPartChunks_, asked = [];
  global.readPartChunks_ = (pr, from) => { asked.push(pr.vals[SP.SEQ - 1] + ':' + from); return { chunks: [{ no: from, text: 'متنِ درسِ قسمتِ ' + pr.vals[SP.SEQ - 1] + ' قطعهٔ ' + from + ' '.padEnd(80, 'م') }] }; };
  const smp = sampleSeriesText_({ vals: mesbah }, parts);
  global.readPartChunks_ = sv;
  ok('۵.۱ سه نمونه از ۱۰٪ (قسمت ۱ قطعهٔ ۴)، ۵۰٪ (قسمت ۲ قطعهٔ ۶)، ۹۰٪ (قسمت ۳ قطعهٔ ۸) — نه قطعهٔ اولِ هر قسمت', asked.join(',') === '1:4,2:6,3:8' && smp.samples === 3, asked.join(','));
  ok('۵.۲ عنوانِ همهٔ قسمت‌ها', /مقدمه ، جلسه ۲ معرفت‌شناسی ، جلسه ۳ برهان صدیقین/.test(smp.allTitles), smp.allTitles);
  const pr = judgePrompt_([{ key: 'mesbah', partNames: smp.partNames, kind: 'صوت', parts: 3, chunks: 30, src: 's', tab: 't', text: smp.text, allTitles: smp.allTitles,
                             heads: '«معرفت‌شناسی»: یقین، شک' }], seriesCatList_(null));
  ok('۵.۳ پرامپت: عنوان‌ها، سرفصلِ جزوه، برچسبِ ۱۰/۵۰/۹۰ و courseSure', /عنوانِ همهٔ قسمت‌ها/.test(pr) && /سرفصل‌های جزوه/.test(pr) && /۱۰٪ و ۵۰٪ و ۹۰٪/.test(pr) &&
     /courseSure/.test(pr) && JUDGE_SCHEMA.properties.verdicts.items.properties.courseSure.type === 'string');
  const one = [mkPart(1, 'تک', 20)], a2 = [];
  global.readPartChunks_ = (pr2, from) => { a2.push(from); return { chunks: [{ no: from, text: 'م'.repeat(100) }] }; };
  sampleSeriesText_({ vals: audi }, one); global.readPartChunks_ = sv;
  ok('۵.۴ مجموعهٔ تک‌قسمتی: سه جای متفاوت در همان قسمت', a2.join(',') === '3,11,19', a2.join(','));
  ok('۵.۵ سرفصلِ جزوه بی پوشهٔ ثبت‌شده: هیچ (پوشه ساخته نمی‌شود)', judgeHandoutHeads_({ vals: recov }) === '');
}

/* ── ۶) ۱۲.۶ بخشِ الف: دستهٔ خودکار در قسمتِ تازه بی‌اثر، قسمتِ قدیمی همان ── */
{
  ok('۶.۱ قسمتِ تازه بی دستهٔ دستی ⇒ دستهٔ خالی (لحن فقط از متن و حالتِ بخش)', specialCatOf_({ seriesCatT: '', cat: 'سیاسی و خبری', seriesCat: 'سیاسی و خبری' }, 'sc') === '');
  ok('۶.۲ قسمتِ قدیمی (بی seriesCatT) همان عبارتِ پیشین ⇒ بازسازی نمی‌شود و زمان‌ها همان می‌مانند',
     specialCatOf_({ cat: 'A', seriesCat: 'B' }, 'cs') === 'A' && specialCatOf_({ cat: 'A', seriesCat: 'B' }, 'sc') === 'B');
  const reg = voiceRegister_('', 'آرام و توضیحی', 'تعریفِ مفهومِ یقین');
  ok('۶.۳ دستهٔ خالی ⇒ لحنِ «سیاسی/خبری» از دسته نمی‌آید', reg.indexOf('سیاسی') === -1 && reg.indexOf('خبری') === -1, reg.join(','));
}

/* ── ۷) آمادگیِ موازی ── */
{
  const base = { status: SST.NEW, hasWork: true, mcat: 'فلسفی و اعتقادی', eligible: true, par: false };
  ok('۷.۱ همه چیز هست ⇒ آماده', seriesParMissing_(base).length === 0 && /آماده/.test(parReadyCell_(base)));
  const m = seriesParMissing_(Object.assign({}, base, { mcat: '', hasWork: false }));
  ok('۷.۲ دستهٔ دستی و کارِ مانده، دقیقاً گفته می‌شود', m.join('|') === 'قطعهٔ ساخته‌نشده‌ای نمانده|دستهٔ دستی ندارد', m.join('|'));
  const g = parGuideHtml_();
  ok('۷.۳ راهنمای پنج‌خطی: شرط‌ها، تیک، اثر، خاموش کردن', (g.match(/<li>/g) || []).length === 5 && /دستهٔ دستی/.test(g) && /بردارید/.test(g));
  const src = fs.readFileSync('src/15_Board.gs', 'utf8');
  ok('۷.۴ ستون و پنل در تخته', /<th>آمادگیِ موازی<\/th>/.test(src) && /H\.push\(parReadyCell_\(x\)\)/.test(src) && /H\.push\(parGuideHtml_\(\)\)/.test(src));
}

/* ── ۸) «امروز N از ۶ ریلز و N از ۲ شورتز» ── */
{
  const sv = { igOn_: global.igOn_, destGate_: global.destGate_, destCap_: global.destCap_, ytQuota_: global.ytQuota_, tgSend_: global.tgSend_ };
  const sent = [];
  global.igOn_ = () => true; global.destGate_ = () => ({ ok: true }); global.destCap_ = (k, c) => c; global.ytQuota_ = () => ({ shorts: 1 });
  global.tgSend_ = (t) => { sent.push(t); return { ok: true }; };
  const day = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd');
  const st = { stats: { day: day, dayN: 4 }, inflight: [{ key: 'ig:special:88', phase: 'pub', why: 'سهمِ امروز (6) پر شد' }], shortQ: [{ ep: 80 }], shortWhy: 'سهمیهٔ یوتیوب برای قسمت‌های کاملِ امروز کنار گذاشته شده',
               dayRec: { '2020-01-01': { r: 6, rc: 6, s: 2, sc: 2, why: '' } } };
  const d = igDayLine_(st);
  ok('۸.۱ خطِ امروز با سقف‌های واقعی', d.line.indexOf('امروز ۴ از ۶ ریلز و ۱ از ۲ شورتز') === 0 && CFG.IG_PER_DAY === 6 && CFG.IG_SHORTS_PER_DAY === 2, d.line);
  ok('۸.۲ کمتر از سقف ⇒ علت از وضعِ واقعی (گام و شورتزِ در صف)', /88 در گامِ «pub»/.test(d.line) && /شورتز: ۱ در صف|شورتز: 1 در صف/.test(d.line), d.line);
  ok('۸.۳ دیروز با عددِ پایانی', /دیروز \(2020-01-01\): ۶ از ۶ ریلز و ۲ از ۲ شورتز$/.test(d.prev), d.prev);
  const full = igDayLine_({ stats: { day: day, dayN: 6 }, inflight: [] }); global.ytQuota_ = () => ({ shorts: 2 });
  const full2 = igDayLine_({ stats: { day: day, dayN: 6 }, inflight: [] });
  ok('۸.۴ سقف پر ⇒ بی «علت»', !/علت/.test(full2.line) && /علت/.test(full.line), full2.line);
  const hr = parseInt(Utilities.formatDate(new Date(), CFG.TIMEZONE, 'HH'), 10);
  const st2 = { stats: { day: day, dayN: 1 }, inflight: [] };
  const t1 = igDayTell_(st2), t2 = igDayTell_(st2);
  ok('۸.۵ تلگرامِ شبانه فقط از ۲۳ِ دبی و یک بار در روز', hr >= 23 ? (t1 === true && t2 === false && sent.length === 1) : (t1 === false && sent.length === 0), hr + ' ' + t1 + ' ' + t2);
  const ig = fs.readFileSync('src/38_Instagram.gs', 'utf8');
  ok('۸.۶ سیم‌کشی: igTick ⇒ igDayTell_، سلامتِ ۱۰ صبح ⇒ igDayLine_', /try \{ igDayTell_\(st\); \}/.test(ig) && /var dl = igDayLine_\(igState_\(\)\)/.test(ig));
  Object.assign(global, sv);
}

summary();
