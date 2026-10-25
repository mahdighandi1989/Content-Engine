/* ══ آزمونِ ۱۲.۸ — سبکِ تصویر فقط از محتوا، قفلِ پلی‌لیست در خطِ ۱۰، دو وارسیِ اجباریِ تازه، ردِ گشتنِ شبانهٔ موسیقی،
 * و «جبرانِ مشخصات» که دیگر از سقفِ شش‌دقیقه نمی‌گذرد ══
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const row = (o) => { const v = new Array(SERIES_HEADERS.length).fill(''); Object.keys(o).forEach((c) => { v[Number(c) - 1] = o[c]; }); return v; };

/* ── ۱) سبکِ تصویر: دستهٔ خودکار و نامِ فایل بیرون ── */
{
  const mesbah = row({ [SC.NAME]: 'معرفت شناسی مصباح', [SC.CAT]: 'سیاسی و خبری', [SC.TOPIC]: 'معرفت‌شناسی', [SC.ABOUT]: 'فلسفهٔ شناخت و یقین' });
  ok('۱.۱ مصباح بی دستهٔ دستی: «سیاسی»ِ خودکار دیگر «چاپِ قدیمی» نمی‌دهد؛ از موضوعِ داوری «ساده و رسمی»', lvStyleOf_(mesbah).key === 'ساده و رسمی', lvStyleOf_(mesbah).key);
  const war = row({ [SC.NAME]: 'تاریخ جنگ', [SC.CAT]: 'تاریخ', [SC.TOPIC]: '', [SC.ABOUT]: '' });
  ok('۱.۲ نامِ فایل هم دیگر ورودی نیست (فقط دستی + موضوع + شرح)', lvStyleOf_(war).key === lvStyleDefault_().key, lvStyleOf_(war).key);
  const man = row({ [SC.MCAT]: 'تاریخی', [SC.CAT]: 'علمی', [SC.TOPIC]: '' });
  ok('۱.۳ دستهٔ دستی هنوز می‌رسد', lvStyleOf_(man).key === 'چاپِ قدیمی', lvStyleOf_(man).key);
  /* خانه‌ای که سوئیپِ پیش از ۸.۱۸ نوشت (خروجیِ regex روی ورودیِ قدیم) هنوز «نوشتهٔ ما» شناخته می‌شود — وگرنه قفل می‌شد. */
  const legacy = row({ [SC.NAME]: 'x', [SC.CAT]: 'سیاسی و خبری', [SC.LVSTYLE]: 'چاپِ قدیمی' });
  ok('۱.۴ تشخیصِ «این خانه را ما نوشتیم» با همان ورودیِ قدیم (بی آن، خانهٔ ما «انتخابِ او» و قفل می‌شد)',
     lvStyleOurs_(legacy, 'چاپِ قدیمی') === true && lvStyleOf_(legacy).src === 'ردیفِ خودش');
  const auto = row({ [SC.CAT]: 'سیاسی و خبری', [SC.TOPIC]: 'معرفت‌شناسی', [SC.LVSTYLE]: 'خودکار' });
  ok('۱.۵ «خودکار»: پشتوانهٔ بی‌مدل هم از محتوا', lvStyleOf_(auto).key === 'ساده و رسمی' && lvStyleOf_(auto).src === 'خودکار');
}

/* ── ۲) قفلِ پلی‌لیست در خطِ ۱۰ ── */
{
  global.__PROPS[PK.YT_PL] = JSON.stringify({ 'series:a': { id: 'PL1', title: 'معرفت‌شناسی، با مجتبی مصباح', descHuman: '2026-10-24 02:40' },
                                              'series:b': { id: 'PL2', title: 'آئودی' }, variety: { id: 'PL3', title: 'از همه جا' } });
  const l = ytPlLockLine_();
  ok('۲.۱ خط: چند از چند، با نام و تاریخ؛ بی هیچ فراخوانِ یوتیوب', /قفلِ پلی‌لیست: ۱ از ۳/.test(l) && /مصباح/.test(l) && /2026-10-24/.test(l) && !/آئودی/.test(l), l);
  ok('۲.۲ سیم‌کشیِ ایمیلِ ۱۰', /ytPlLockLine_\(\); if \(plL\) notes\.push\(plL\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
  delete global.__PROPS[PK.YT_PL];
}

/* ── ۳) دو وارسیِ اجباری و پرامپتِ ۱۱۳ ── */
{
  const keys = CFG.MONITOR_CHECKS.map((x) => x.key);
  const pr = fs.readFileSync('docs/prompts/_PROMPT-monitor-v113.md', 'utf8');
  ok('۳.۱ کلیدها ثبت‌اند', keys.indexOf('yt-growth') !== -1 && keys.indexOf('series-queue') !== -1);
  ok('۳.۲ پرامپتِ ۱۱۳ برای موتورِ ۱۲.۸، با ردیفِ هر دو در جدول و یادداشتِ تغییر', /برای نسخهٔ موتور: 12\.8/.test(pr) && /\| `yt-growth` \|/.test(pr) &&
     /\| `series-queue` \|/.test(pr) && /تغییرِ نسخهٔ ۱۱۳/.test(pr) && /هر هفده ردیفش/.test(pr));
  ok('۳.۳ یادداشتِ ۱۰۸ به تاریخچه رفت، نه گم', !/تغییرِ نسخهٔ ۱۰۸/.test(pr.split('── ترتیبِ ریلز')[0]) &&
     /تغییرِ نسخهٔ ۱۰۸/.test(fs.readFileSync('docs/prompts/monitor_history.md', 'utf8')));
  /* ۱۳.۰: manifest مالِ نسخهٔ روز است، نه ۱۲.۸ — شاهدِ ثابتِ ۱۲.۸ سطرِ Changelog است. */
  ok('۳.۴ Changelogِ ۱۲.۸ پرامپتِ ناظرِ ۱۱۳ را نام می‌برد', /\| \*\*12\.8\*\* \|[^\n]*پرامپتِ ناظر ۱۱۳/.test(fs.readFileSync('README.md', 'utf8')));
}

/* ── ۴) گشتنِ شبانهٔ موسیقی در _STATUS ── */
{
  ok('۴.۱ بی ثبت ⇒ گفته می‌شود', /هنوز ثبتی نیست/.test(musicSeekLine_(null)));
  ok('۴.۲ اجرا نشد ⇒ علت', /اجرا نشد — وقتِ کارِ شبانه نماند/.test(musicSeekLine_({ at: '2026-10-26 02:40', ran: false, skip: 'وقتِ کارِ شبانه نماند (nightHas_)' })));
  const z = musicSeekLine_({ at: '2026-10-26 02:40', ran: true, why: 'چرخش', slots: ['پایان'], looked: 0, added: 0, notes: ['archive.org: صفحهٔ ۳ خالی'], fetch: { added: 0, failed: 0 } });
  ok('۴.۳ صفر ⇒ همان یادداشتِ گشتن در خط', /۰ نامزدِ وارسی‌شده/.test(z) && /صفحهٔ ۳ خالی/.test(z), z);
  global.__PROPS[PK.MUSIC_SEEK_LAST] = JSON.stringify({ at: 'x', ran: true, looked: 5, added: 2, fetch: { added: 1, failed: 1 } });
  const st = musicStatus_();
  ok('۴.۴ در musicStatus_ (همان که _STATUS.music می‌شود)', st.seekLast && st.seekLast.looked === 5 && /۵ نامزد/.test(st.line), st.line);
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۴.۵ شبانه: نتیجهٔ musicSeek_ و musicFetch_ و ردشدن‌ها ثبت می‌شود', /var sk = musicSeek_\(miss\)/.test(su) && /setProperty\(PK\.MUSIC_SEEK_LAST/.test(su) && /mLog\.skip = 'وقتِ کارِ شبانه نماند/.test(su));
}

/* ── ۵) جبرانِ مشخصات زیرِ سقفِ شش‌دقیقه ── */
{
  const e = fs.readFileSync('src/35_Embed.gs', 'utf8');
  ok('۵.۱ embStep_ مرحله را روی مهرِ اجرا هم می‌نشاند (خطِ «اجرای ناتمام» می‌گوید کجا)', /function embStep_[\s\S]{0,400}runStage_\(name\)/.test(e));
  /* اجرایی که چهار دقیقه پیش شروع شده (قفل و نقشه وقت خوردند) نباید نوشتنِ تازه شروع کند. */
  const sv = { RUN_T0_: global.RUN_T0_, embHubKeyMap_: global.embHubKeyMap_, getHub_: global.getHub_, embSpecsApply_: global.embSpecsApply_ };
  let applied = 0;
  global.embSpecsApply_ = () => { applied++; return 0; };
  global.embHubKeyMap_ = () => ({});
  let opened = 0;
  const svOpen = SpreadsheetApp.openById;
  SpreadsheetApp.openById = (id) => { opened++; return { getSheets: () => [{ getLastRow: () => 0, getLastColumn: () => 0, getName: () => 't' }] }; };
  global.RUN_T0_ = Date.now();
  embSpecsBackfill_(4000, 180000, { getSheetByName: () => null });
  const fresh = opened;
  opened = 0;
  global.RUN_T0_ = Date.now() - 250000;
  const r = embSpecsBackfill_(4000, 180000, { getSheetByName: () => null });
  SpreadsheetApp.openById = svOpen;
  ok('۵.۲ مهلت از آغازِ اجرا: تازه ⇒ منابع باز می‌شوند؛ ۲۵۰ ثانیه گذشته ⇒ هیچ منبعی و هیچ نوشتنی',
     fresh === (CFG.SOURCES || []).length && fresh > 0 && opened === 0 && applied === 0 && r.done === false, 'fresh=' + fresh + ' late=' + opened);
  Object.assign(global, sv);
  /* خوشه‌ها: دو ردیفِ دور از هم دو خواندنِ کوچک‌اند، نه یک بازهٔ هزارردیفی. */
  const reads = [];
  const sh = { getLastRow: () => 5000, getRange: (r0, c, n) => { reads.push([r0, n]); return { getValues: () => Array.from({ length: n }, () => ['']), setValues: () => {} }; } };
  const w = embSpecsApply_({ getSheetByName: () => sh }, { T: { 10: 'الف', 4000: 'ب' } });
  ok('۵.۳ نوشتن خوشه‌به‌خوشه (بیشترین بازه ۱ ردیف به جای ۳۹۹۱)', w === 2 && Math.max.apply(null, reads.map((x) => x[1])) === 1, JSON.stringify(reads));
}

summary();
