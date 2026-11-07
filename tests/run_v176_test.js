/* ══ آزمونِ ۱۷.۶ — ردِ مرحله‌ها با ثانیه، و مرحله پس از پاسِ وفاداری ══
   شاهد: `_STATUS.runs` ۷ نوامبر ۰۵:۰۲ — «❌ اجرای ناتمام: prepareSpecialEpisode (…؛ آخرین مرحله: «متن: پاسِ وفاداری»،
   ۳۵۰ ثانیه پس از شروع)». دو کمبود: (۱) فقط آخرین مرحله ثبت می‌شد، پس معلوم نبود کدام گام ۳۵۰ ثانیه را خورد؛ (۲) از
   «پاسِ وفاداری» تا ذخیرهٔ `SP_PENDING` حدودِ ۴۸۰ خط (ارجاع، پوشه، گروهِ گویندگان، شیت‌ها، غنی‌سازی) بی مرحله بود، پس
   «آخرین مرحله» ممکن بود جای مرگ نباشد. روی کدِ پیشین ۱.۲، ۱.۳ و ۲.۱ سرخ‌اند. */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

delete global.__PROPS[PK.RUN_AT];
const realNow = Date.now;
let fake = realNow();
Date.now = () => fake;
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(fake); }
  static now() { return fake; }
};

runEnter_('prepareSpecialEpisode');
runEnter_('produceSpecialEpisode');
runStage_('متن: برداشتِ گزارش‌ها');
fake += 12000; runStage_('متن: نوشتنِ درس‌نامهٔ 97');
fake += 210000; runStage_('متن: فشرده‌سازی');
fake += 90000; runStage_('متن: پاسِ وفاداری');
fake += 38000; runStage_('متن: پوشهٔ قسمت و گروهِ گویندگان');
const m = JSON.parse(global.__PROPS[PK.RUN_AT] || '{}');
ok('۱.۱ مرحلهٔ آخر همان است', m.prepareSpecialEpisode && m.prepareSpecialEpisode.st === 'متن: پوشهٔ قسمت و گروهِ گویندگان');
ok('۱.۲ ردِ مرحله‌ها روی مهرِ بیرونی هم هست', Array.isArray(m.prepareSpecialEpisode.tr) && m.prepareSpecialEpisode.tr.length === 5 &&
   m.prepareSpecialEpisode.tr[2][1] === 222, JSON.stringify(m.prepareSpecialEpisode));
global.Date = RealDate; Date.now = realNow;

global.__PROPS[PK.RUN_AT] = JSON.stringify({ prepareSpecialEpisode: m.prepareSpecialEpisode });
const rs = runStuck_(realNow() + 3 * 3600000 + (fake - realNow()));
ok('۱.۳ «اجرای ناتمام» مدتِ هر گام را می‌گوید', /مسیر: .*نوشتنِ درس‌نامهٔ 97 ۲۱۰ث › فشرده‌سازی ۹۰ث › پاسِ وفاداری ۳۸ث › پوشهٔ قسمت و گروهِ گویندگان \(از ۳۵۰ث\)/.test(rs.line), rs.line);
/* ده تا سقف، تا مهر در Properties بزرگ نشود */
for (let i = 0; i < 15; i++) runStage_('گام ' + i);
const m2 = JSON.parse(global.__PROPS[PK.RUN_AT] || '{}');
ok('۱.۴ رد از ده گام بیشتر نمی‌شود', ((m2.prepareSpecialEpisode || {}).tr || []).length === 10);
runExit_('produceSpecialEpisode'); runExit_('prepareSpecialEpisode');
delete global.__PROPS[PK.RUN_AT];

/* ۲. سیم‌کشی: از وفاداری تا ذخیرهٔ وضعیت مرحله دارد — هر دو برنامه */
const sp = String(produceSpecialEpisode), pe = String(produceEpisode);
const order = (src, names, endMark) => {
  let at = -1;
  for (const n of names) { const i = src.indexOf("runStage_('" + n); if (i <= at) return n; at = i; }
  return src.indexOf(endMark) > at ? '' : 'پس از ' + endMark;
};
const after = ['متن: پوشهٔ قسمت و گروهِ گویندگان', 'متن: ثبتِ قسمت در شیت‌ها', 'متن: درخواستِ غنی‌سازی و ذخیرهٔ وضعیت'];
const r1 = order(sp, ['متن: پاسِ وفاداری', 'متن: وارسیِ ارجاع‌ها'].concat(after), 'PK.SP_PENDING, JSON.stringify(pendSp)');
ok('۲.۱ درس‌نامه: مرحله‌ها پس از وفاداری، به ترتیب و پیش از ذخیرهٔ وضعیت', r1 === '', r1);
const r2 = order(pe, ['متن: پاسِ وفاداری و زمین‌گیری'].concat(after), 'PK.PENDING, JSON.stringify(pend)');
ok('۲.۲ از همه جا: همان قرینه', r2 === '', r2);
ok('۲.۳ مرحلهٔ پوشه پیش از createFolder است', sp.indexOf("runStage_('متن: پوشهٔ قسمت") < sp.indexOf('.createFolder(') &&
   pe.indexOf("runStage_('متن: پوشهٔ قسمت") < pe.indexOf('.createFolder('));

summary('۱۷.۶');
