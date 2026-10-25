/* ══ آزمونِ ۱۳.۰ — دورِ داوریِ مفهومی: همهٔ ردیف‌های غیردستی یک بار از نو، فقط با مدل؛ ردیف‌های دستی و سه مجموعهٔ نام‌برده دست‌نخورده ══
 * صاحبِ کانال: «همهٔ داوری‌های قبلیِ دسته و آموزشی؟ اعتبار ندارند … فقط ردیف‌هایی که خودِ او دستی تنظیم کرده بماند: مصباح، آئودی،
 * درسِ بعد از آئودی … هیچ مجموعهٔ نادیده را خودکار به در نوبت نبرید … آزمون شاملِ نمونه‌های واقعی (خداشناسی، آموزش مداحی،
 * Thinking Mathematically).»
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const W = SERIES_HEADERS.length;
const row = (key, f) => { const v = new Array(W).fill(''); v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; Object.keys(f || {}).forEach((c) => { v[Number(c) - 1] = f[c]; }); return v; };
const fakeReg = (rows) => ({ rows: rows.map((v, i) => ({ key: v[SC.KEY - 1], row: i + 2, vals: v })), sheet: { getRange: () => ({ setValues: () => {} }) } });
const old = '2026-10-20 10:00';

const khoda = row('khodashenasi', { [SC.NAME]: 'خداشناسی', [SC.CAT]: 'دینی', [SC.IS_COURSE]: SJ.YES, [SC.ABOUT]: 'موضوع‌های پرتکرارِ متن: خدا، برهان', [SC.WHY]: '[بی‌مدل] شمارش', [SC.STATUS]: SST.NEW, [SC.JUDGED]: old });
const maddahi = row('maddahi', { [SC.NAME]: 'آموزش مداحی', [SC.CAT]: 'مذهبی', [SC.IS_COURSE]: SJ.NO, [SC.ABOUT]: 'مجلس', [SC.WHY]: 'مراسم', [SC.STATUS]: SST.SKIPPED, [SC.JUDGED]: old });
const tm = row('thinking-math', { [SC.NAME]: 'Thinking Mathematically', [SC.CAT]: 'متفرقه', [SC.IS_COURSE]: SJ.UNSURE, [SC.ABOUT]: 'نامعلوم', [SC.WHY]: 'نمونه کم', [SC.STATUS]: SST.NEW, [SC.JUDGED]: old });
const mesbah = row('mesbah', { [SC.NAME]: 'معرفت شناسی مجتبی مصباح', [SC.CAT]: 'سیاسی و خبری', [SC.IS_COURSE]: SJ.YES, [SC.WHY]: 'قدیمی', [SC.JUDGED]: old, [SC.STATUS]: SST.ACTIVE });
const audi = row('audi', { [SC.NAME]: 'Audi Epistemology', [SC.MORDER]: 2, [SC.IS_COURSE]: SJ.YES, [SC.WHY]: 'قدیمی', [SC.JUDGED]: old });
const intro = row('intro-pa', { [SC.NAME]: 'Intro to Philosophical Analysis', [SC.IS_COURSE]: SJ.YES, [SC.WHY]: 'قدیمی', [SC.JUDGED]: old });
const manualNo = row('manual-no', { [SC.NAME]: 'روضه', [SC.MANUAL]: SMAN.NO, [SC.WHY]: 'قدیمی', [SC.JUDGED]: old });
const mcat = row('mcat', { [SC.NAME]: 'منطق', [SC.MCAT]: 'فلسفی و اعتقادی', [SC.WHY]: 'قدیمی', [SC.JUDGED]: old });

/* ── ۱) چه کسی در دور است ── */
{
  CFG.JUDGE_ROUND = '13.0';
  const reg = fakeReg([mesbah, khoda, maddahi, audi, tm, intro, manualNo, mcat]);
  const need = seriesNeedingJudgement_(reg);
  const keys = need.map((r) => r.key);
  ok('۱.۱ همهٔ غیردستی‌ها، نه فقط «شمارشِ واژه»: خداشناسی، Thinking Mathematically، و نادیده‌ها هم (آموزشِ مداحی)', keys.join(',') === 'khodashenasi,thinking-math,maddahi', keys.join(','));
  ok('۱.۲ دست نمی‌خورند: مصباح و Intro to Philosophical Analysis (به نام)، آئودی (شماره)، تصمیمِ دستی، دستهٔ دستی',
     ['mesbah', 'audi', 'intro-pa', 'manual-no', 'mcat'].every((k) => keys.indexOf(k) === -1));
  ok('۱.۳ نادیده‌ها آخرِ صف‌اند (اول آنچه در نوبت است)', keys[keys.length - 1] === 'maddahi');
  ok('۱.۴ همه فقط با مدل', need.every((r) => r.__modelOnly === true && r.__round === true));
  const st = judgeRoundStatus_(reg);
  ok('۱.۵ وضعِ دور: ۳ از ۳ مانده، ۱ نادیده؛ ۵ ردیفِ دستی/نام‌برده', st.total === 3 && st.left === 3 && st.leftSkipped === 1 && st.kept === 5, st.line);
}

/* ── ۲) داوریِ مدل: اعمال، نشانِ دور، دفترِ «قبلی ← جدید»؛ وضعیت عوض نمی‌شود ── */
{
  const v = maddahi.slice(), reg = fakeReg([v]);
  Object.assign(reg.rows[0], { __modelOnly: true, __round: true });
  applyVerdict_(reg, reg.rows[0], { key: 'maddahi', isCourse: 'true', courseSure: '85', score: '75', about: 'آموزشِ فنِ مداحی: تنفس، دستگاه، اشتباه‌های رایج',
    topic: 'آموزشِ مداحی', category: 'موسیقی و هنر', catSure: '80', level: 'مقدماتی', form: 'درسِ کلاسی', audience: 'مداحِ تازه‌کار',
    evidence: 'در این جلسه تمرینِ تحریر روی دستگاهِ شور را انجام می‌دهیم', why: 'فن را مرحله‌به‌مرحله یاد می‌دهد، مجلس نیست' }, { text: 'x'.repeat(2000), partNames: [] }, true);
  ok('۲.۱ «آموزشِ مداحی» با فهمِ مفهومی آموزشی شد (نه مراسم)', v[SC.IS_COURSE - 1] === SJ.YES && v[SC.CAT - 1] === 'موسیقی و هنر');
  ok('۲.۲ وضعیتِ «نادیده» خودکار عوض نشد', v[SC.STATUS - 1] === SST.SKIPPED);
  ok('۲.۳ دلیل: قالب، مخاطب، شاهد و نشانِ دور', /قالب: درسِ کلاسی/.test(v[SC.WHY - 1]) && /مخاطب: مداحِ تازه‌کار/.test(v[SC.WHY - 1]) &&
     /شاهد: «در این جلسه تمرینِ تحریر/.test(v[SC.WHY - 1]) && judgeRoundDone_(v), v[SC.WHY - 1]);
  const lg = reg.rows[0].__roundLog;
  ok('۲.۴ دفتر: قبلی ← جدید با اطمینان', lg && lg[4] === 'مذهبی' && lg[5] === 'موسیقی و هنر' && lg[6] === SJ.NO && lg[7] === SJ.YES && lg[8] === '85' && lg[10] === 'درسِ کلاسی', JSON.stringify(lg));
  ok('۲.۵ و یک بار: دورِ بعد دیگر در فهرست نیست', seriesNeedingJudgement_(fakeReg([v])).length === 0);
  ok('۲.۶ تبِ بازبینی آن را «نادیده ولی آموزشی — پیشنهادِ بازگشت» می‌گوید', /نادیده ولی آموزشی/.test(seriesJudgeState_(v)));
}

/* ── ۳) کم‌اطمینان ⇒ مشکوک و بازبینی، نه بی‌صدا ── */
{
  const v = tm.slice(), reg = fakeReg([v]);
  Object.assign(reg.rows[0], { __modelOnly: true, __round: true });
  applyVerdict_(reg, reg.rows[0], { key: 'thinking-math', isCourse: 'true', courseSure: '45', score: '70', about: 'کتابِ درسیِ ریاضیِ عمومی به انگلیسی',
    topic: 'ریاضی', category: 'علمی و آموزشی', catSure: '55', level: 'مقدماتی', form: 'کتابِ صوتی', why: 'نمونه‌ها فصل‌های کتاب‌اند' }, { text: 'x'.repeat(2000), partNames: [] }, true);
  ok('۳.۱ Thinking Mathematically: اطمینانِ ۴۵ ⇒ مشکوک، و دستهٔ ۵۵ ⇒ «نیازمند بازبینی»', v[SC.IS_COURSE - 1] === SJ.UNSURE && v[SC.CAT - 1] === CFG.SERIES_CAT_UNSURE &&
     seriesJudgeState_(v) === 'نیازمند بازبینی', v[SC.IS_COURSE - 1] + ' | ' + v[SC.CAT - 1]);
  ok('۳.۲ و هنوز «سنجیده» است (دور برایش تمام شد؛ بازبینی با شما)', judgeRoundDone_(v));
}

/* ── ۴) داوریِ بی‌مدل: موقت، غیرقابل‌اتکا، هرگز غالب ── */
{
  const v = khoda.slice(), reg = fakeReg([v]);
  Object.assign(reg.rows[0], { __modelOnly: true, __round: true });
  const snap = JSON.stringify(v);
  applyVerdict_(reg, reg.rows[0], localVerdict_({ key: 'khodashenasi', text: 'برهان خدا تعریف '.repeat(80), partNames: [], name: 'خداشناسی', parts: 3, chunks: 30 }), { text: 'x'.repeat(1000) }, true);
  ok('۴.۱ شکستِ مدل در دور ⇒ هیچ نوشتنی؛ دورِ بعد دوباره', JSON.stringify(v) === snap && seriesNeedingJudgement_(fakeReg([v])).length === 1);
  const m = row('m', { [SC.NAME]: 'x', [SC.IS_COURSE]: SJ.NO, [SC.ABOUT]: 'درسِ واقعیِ فیزیک', [SC.WHY]: 'مدل گفت', [SC.JUDGED]: old, [SC.CAT]: 'علمی و آموزشی' });
  const rm = fakeReg([m]); const sm = JSON.stringify(m);
  CFG.JUDGE_ROUND = '';
  applyVerdict_(rm, rm.rows[0], localVerdict_({ key: 'm', text: 'یا حسین روضه سینه‌زنی '.repeat(40), partNames: [], name: 'x', parts: 1, chunks: 5 }), { text: 'x'.repeat(1000) }, true);
  ok('۴.۲ داوریِ بی‌مدل روی داوریِ مدل نمی‌نشیند (حتی بیرون از دور)', JSON.stringify(m) === sm);
  const n = row('n', { [SC.NAME]: 'تازه' }); const rn = fakeReg([n]);
  applyVerdict_(rn, rn.rows[0], localVerdict_({ key: 'n', text: 'یا حسین روضه سینه‌زنی مداحی نوحه '.repeat(40), partNames: [], name: 'تازه', parts: 1, chunks: 5 }), { text: 'x'.repeat(1000) }, true);
  ok('۴.۳ روی ردیفِ داوری‌نشده: «آموزشی؟» فقط «مشکوک»، و «داوریِ ناقص» نشان می‌خورد', n[SC.IS_COURSE - 1] === SJ.UNSURE && /داوریِ ناقص/.test(n[SC.WHY - 1]), n[SC.IS_COURSE - 1]);
  CFG.JUDGE_ROUND = '13.0';
  ok('۴.۴ منو: «موقت و غیرقابل‌اتکا» در نامِ گزینه', /موقتِ بی‌مدل \(غیرقابل‌اتکا\)/.test(fs.readFileSync('src/05_Setup.gs', 'utf8')));
}

/* ── ۵) «توجیهِ» داور در پرامپت ── */
{
  const pr = judgePrompt_([{ key: 'k', partNames: ['جلسه ۱'], kind: 'صوت', parts: 3, chunks: 30, src: 's', tab: 't', text: 'متن', allTitles: 'جلسه ۱ ، جلسه ۲' }], seriesCatList_(null));
  ok('۵.۱ پرامپت می‌گوید داوری‌های پیشین از کجا اشتباه می‌فهمیدند (نام، چند جملهٔ اول، شمارش، دستهٔ خودکار)', /از نامِ فایل/.test(pr) && /چند جملهٔ اول/.test(pr) && /شمارشِ واژه/.test(pr) && /دسته‌ای که پیش‌تر خودکار/.test(pr));
  ok('۵.۲ و فهمِ درست: سرتاسر، موضوعِ واقعی، قالب، مخاطب، شاهد', /سرتاسرِ مجموعه/.test(pr) && /موضوعِ واقعی/.test(pr) && /قالب/.test(pr) && /مخاطب/.test(pr) && /شاهد/.test(pr));
  ok('۵.۳ نمونه‌های واقعی در پرامپت: «آموزشِ مداحی» و «Thinking Mathematically»', /آموزشِ مداحی/.test(pr) && /Thinking Mathematically/.test(pr));
  const P = JUDGE_SCHEMA.properties.verdicts.items.properties;
  ok('۵.۴ قالبِ خروجی: form، audience، evidence (همه رشته)', ['form', 'audience', 'evidence'].every((k) => P[k] && P[k].type === 'string'));
}

/* ── ۶) دفتر، خلاصه، تبِ بازبینی ── */
{
  const hub = getHub_();
  judgeRoundLogAppend_(hub, [
    ['t', 'maddahi', 'آموزش مداحی', SST.SKIPPED, 'مذهبی', 'موسیقی و هنر', SJ.NO, SJ.YES, '85', '80', 'درسِ کلاسی', 'آموزشِ فنِ مداحی', 'فن', 'شاهد'],
    ['t', 'thinking-math', 'Thinking Mathematically', SST.NEW, 'متفرقه', CFG.SERIES_CAT_UNSURE, SJ.UNSURE, SJ.UNSURE, '45', '55', 'کتابِ صوتی', 'ریاضی', 'کم', ''],
    ['t', 'khodashenasi', 'خداشناسی', SST.NEW, 'دینی', 'فلسفی و اعتقادی', SJ.YES, SJ.YES, '90', '85', 'سخنرانی', 'براهینِ اثباتِ خدا', 'درسی', '']]);
  const sm = judgeRoundSummary_(hub);
  ok('۶.۱ خلاصه: ۳ سنجیده، دستهٔ ۳ عوض، «آموزشی؟» ۱ عوض، ۱ مشکوک، ۱ نادیدهٔ بالقوه آموزشی', sm.n === 3 && sm.changedCat === 3 && sm.changedIc === 1 && sm.unsure === 1 && sm.skippedEdu === 1, sm.line);
  ok('۶.۲ و صریح: وضعیت عوض نشد و بی شمارهٔ دستی وارد صف نمی‌شوند', /وضعیتِ هیچ‌کدام خودکار عوض نشد/.test(sm.line));
  const v = khoda.slice(); v[SC.CAT - 1] = 'فلسفی و اعتقادی';
  const rr = seriesCatReviewRows_(fakeReg([v]), judgeRoundLogMap_(hub));
  ok('۶.۳ تبِ بازبینی: دستهٔ قبلی، آموزشیِ قبلی و اطمینان', rr[0][13] === 'دینی' && rr[0][14] === SJ.YES && rr[0][15] === '90 / 85' && SERIES_CAT_REVIEW_HEADERS.length === 16, JSON.stringify(rr[0].slice(12)));
}

/* ── ۷) ادامه‌دار زیرِ سقفِ شش‌دقیقه ── */
{
  const s16 = fs.readFileSync('src/16_Curate.gs', 'utf8'), s21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8'), s08 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۷.۱ judgeTick: بودجه زیرِ شش دقیقه، قفلِ آزاد، ساعت‌های تولید خالی، و خودش دوباره زمان‌بندی می‌شود', Number(CFG.JUDGE_TICK_MS) <= 240000 &&
     /if \(judgeTickQuiet_\(\)\)/.test(s16) && /lock\.tryLock\(5000\)/.test(s16) && /if \(need\) judgeTickArm_/.test(s16));
  ok('۷.۲ شروعِ خودکار پس از نصب و روزانه در ۱۰ صبح', /judgeTickArm_\(15\)/.test(s21) && /judgeTickArm_\(20\)/.test(s08));
  ok('۷.۳ دفتر فقط پس از نوشتنِ واقعیِ رجیستری', /if \(wrote && roundLog\.length\)/.test(s16));
}

summary('۱۳.۰');
