/* اثر انگشتِ معنایی — بخشِ ۳۵.
 *
 * ══ چرا این آزمون سخت‌گیر است ══
 * خرابیِ این بخش هیچ خطایی نمی‌دهد. یک بردارِ نرمال‌نشده، یک `taskType`
 * اشتباه، یا بُعدی که با بُعدِ ذخیره‌شده نمی‌خوانَد — همه‌شان عددی
 * برمی‌گردانند که «امتیازِ شباهت» به نظر می‌رسد و در واقع تصادفی است.
 * پس این‌جا خودِ عددها سنجیده می‌شوند، نه اینکه کد خوانده شود.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

global.__PROPS[PK.API_KEY] = 'test-key';

/* ── یک مدلِ بردارِ ساختگی، ولی با خاصیت‌های واقعی ──
   هر متن به یک بردارِ تکرارپذیر نگاشت می‌شود که با واژه‌هایش عوض
   می‌شود، و عمداً **نرمال‌نشده** برمی‌گردد — چون API هم برای بُعدهای
   غیرِ ۳۰۷۲ نرمال‌نشده می‌دهد و همین‌جاست که یک باگِ بی‌صدا متولد
   می‌شود. */
function fakeVec(text, dim) {
  /* ══ چرا **چگال** و نه تُنُک ══
     نسخهٔ اول این تابع به ازای هر واژه چند خانه را روشن می‌کرد. برداری
     که فقط چند خانهٔ ناصفر دارد، با بریده‌شدن به ۲۵۶ بُعد کلِ سیگنالش را
     از دست می‌دهد — و آزمون این را به حسابِ «کد خراب است» می‌گذاشت، در
     حالی که خرابی در بدلِ آزمون بود. بردارهای واقعیِ گوگل چگال‌اند و
     MRL دقیقاً روی همین تکیه دارد. بدلی که در جهتی شُل‌تر یا سفت‌تر از
     موتورِ واقعی رفتار کند، چیزی را ثابت نمی‌کند (درسِ ۷٫۲۴). */
  const words = String(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const v = new Array(dim).fill(0);
  for (const w of words) {
    let h = 0;
    for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i) + 7) >>> 0;
    if (!h) h = 1;
    for (let d = 0; d < dim; d++) {
      h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0;
      v[d] += (h / 4294967295) * 2 - 1;          // چگال، در [-۱,۱]
    }
  }
  if (!words.length) v[0] = 1;
  for (let d = 0; d < dim; d++) v[d] *= 7;       // مقیاسِ بزرگ و عمداً نرمال‌نشده
  return v;
}
let EMB_CALLS = [];
let EMB_FAIL = 0;
global.__STUB = (url, body) => {
  if (url.indexOf('batchEmbedContents') !== -1) {
    EMB_CALLS.push(body);
    if (EMB_FAIL > 0) { EMB_FAIL--; return { code: 429, text: 'RESOURCE_EXHAUSTED' }; }
    const dim = body.requests[0].outputDimensionality;
    return { code: 200, json: { embeddings: body.requests.map(r =>
      ({ values: fakeVec(r.content.parts[0].text, dim) })) } };
  }
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: '{}' }] } }] } };
};

console.log('\n══ ۱) نرمال‌سازی — اجباری برای هر بُعدی جز ۳۰۷۲ ══');
const norm = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const raw = fakeVec('زیان‌گریزی', 64);
ok('۱.۱ ورودی عمداً نرمال نیست', Math.abs(norm(raw) - 1) > 0.1, 'طول: ' + norm(raw).toFixed(2));
ok('۱.۲ embNorm_ طولِ ۱ می‌دهد', Math.abs(norm(embNorm_(raw)) - 1) < 1e-9);
ok('۱.۳ بریدن هم دوباره نرمال می‌کند', Math.abs(norm(embTrunc_(embNorm_(raw), 16)) - 1) < 1e-9,
   'MRL می‌گوید پیشوندِ بردار معتبر است — ولی فقط پس از نرمال‌سازیِ دوباره');
ok('۱.۴ بردارِ صفر حلقه یا NaN نمی‌سازد',
   embNorm_([0, 0, 0]).every(x => x === 0));

console.log('\n══ ۲) فشرده‌سازی و ضربِ داخلی ══');
const a = embNorm_(fakeVec('ترس از دست دادنِ پول', 128));
const b = embNorm_(fakeVec('چیزی کاملاً بی‌ربط مثلِ آشپزی', 128));
const pa = embUnpack_(embPack_(a)), pb = embUnpack_(embPack_(b));
ok('۲.۱ اندازهٔ بایت با بُعد یکی است', pa.length === 128, String(pa.length));
ok('۲.۲ شباهتِ یک بردار با خودش ~۱ است', Math.abs(embDot_(pa, pa) - 1) < 0.02,
   embDot_(pa, pa).toFixed(4));
ok('۲.۳ دو بردارِ بی‌ربط امتیازِ کمتری می‌گیرند', embDot_(pa, pb) < embDot_(pa, pa) - 0.2,
   embDot_(pa, pb).toFixed(4));
ok('۲.۴ مقدارِ منفی درست بازمی‌گردد',
   embUnpack_(embPack_([-1, 1, -0.5].concat(new Array(5).fill(0))))[0] === -127,
   'بایتِ علامت‌دار — اگر ماسک اشتباه شود هیچ خطایی بلند نمی‌شود');

console.log('\n══ ۳) شناسه و اثرانگشتِ متن ══');
const id1 = embId_('FILE-A', '2026-01-01');
ok('۳.۱ قالبِ شناسه', /^CE-[0-9a-z]{10}$/.test(id1), id1);
ok('۳.۲ پایدار است', embId_('FILE-A', '2026-01-01') === id1,
   'شناسه‌ای که هر بار عوض شود، شناسه نیست');
ok('۳.۳ فایلِ دیگر شناسهٔ دیگر', embId_('FILE-B', '2026-01-01') !== id1);
ok('۳.۴ همان فایل در تاریخِ دیگر هم شناسهٔ دیگر',
   embId_('FILE-A', '2026-02-02') !== id1,
   'کلیدِ یکتاییِ syncCatalog هم همین (fileId|date) است');
ok('۳.۵ اثرانگشتِ متن با تغییرِ متن عوض می‌شود',
   embHash_('الف') !== embHash_('ب') && embHash_('الف') === embHash_('الف'));

console.log('\n══ ۴) متنی که بردار از آن ساخته می‌شود ══');
const t4 = embText_({ cat: 'مالی', kind: 'ویدیو', topic: 'زیان‌گریزی',
                      msg: 'پیام', summary: 'خلاصه', body: 'متن', vibe: '', raw: '',
                      date: '2026-03-14' });
ok('۴.۱ موضوع داخلش هست', t4.indexOf('زیان‌گریزی') !== -1);
ok('۴.۲ تاریخ داخلش نیست', t4.indexOf('2026') === -1 && t4.indexOf('۱۴۰') === -1,
   'خواستهٔ صریح: «نه از حیثِ زمانی بلکه از حیثِ محتوایی» — تاریخ در بردار یعنی دو محتوای هم‌روز نزدیکِ هم');
ok('۴.۳ میدانِ خالی برچسبِ خالی نمی‌سازد', t4.indexOf('فضا:') === -1);
ok('۴.۴ سقفِ نویسه رعایت می‌شود',
   embText_({ topic: 'x'.repeat(50000) }).length <= (CFG.EMB_TEXT_MAX || 6000),
   'سقفِ ورودیِ خودِ مدل ۲۰۴۸ توکن است');

console.log('\n══ ۵) فراخوان: بُعد، نوعِ وظیفه، و نرمال‌سازیِ خروجی ══');
EMB_CALLS = [];
const c5 = embCall_(['یک', 'دو'], 'RETRIEVAL_DOCUMENT');
ok('۵.۱ یک فراخوان برای دو متن', EMB_CALLS.length === 1 && EMB_CALLS[0].requests.length === 2,
   'دسته‌ای بودن، تفاوتِ چند دقیقه و چند ساعت است');
ok('۵.۲ بُعد اعلام می‌شود', EMB_CALLS[0].requests[0].outputDimensionality === embDim_(),
   String(EMB_CALLS[0].requests[0].outputDimensionality));
ok('۵.۳ نوعِ وظیفهٔ سند', EMB_CALLS[0].requests[0].taskType === 'RETRIEVAL_DOCUMENT');
ok('۵.۴ خروجی نرمال‌شده تحویل داده می‌شود',
   c5.ok && Math.abs(norm(c5.vecs[0]) - 1) < 1e-9,
   'مدل نرمال‌نشده داد؛ اگر این‌جا نرمال نشود هر مقایسهٔ بعدی بی‌صدا غلط است');
EMB_CALLS = [];
embQueryVec_('پرس‌وجو');
ok('۵.۵ نوعِ وظیفهٔ پرس‌وجو فرق دارد',
   EMB_CALLS[0].requests[0].taskType === 'RETRIEVAL_QUERY',
   'سند و پرس‌وجو دو فضای متفاوت‌اند؛ یکی‌کردنشان کیفیت را بی‌صدا پایین می‌آورد');
EMB_FAIL = 1;
const c5b = embCall_(['x'], 'RETRIEVAL_DOCUMENT');
ok('۵.۶ خطای HTTP دلیل را با خود می‌آورد', !c5b.ok && /429/.test(c5b.note), c5b.note);
EMB_FAIL = 0;

console.log('\n══ ۶) بانکِ آزمایشی ══');
const hub = getHub_();
/* تبِ دسته را **دوباره نمی‌سازیم**: `getHub_()` همهٔ تب‌های TAXONOMY را
   از قبل ساخته و یک تبِ هم‌نامِ دوم در شیتِ واقعی ممکن نیست — ولی در بدلِ
   آزمون ممکن است، و آن‌وقت `getSheetByName` خالی‌اش را برمی‌گرداند و آزمون
   چیزی را می‌سنجد که در واقعیت وجود ندارد. */
const mkCat = (name, rows) => {
  const sh = hub.getSheetByName(name) || hub.insertSheet(name);
  if (sh.getLastRow() < 1) sh.appendRow(HUB_HEADERS.slice());
  rows.forEach(r => sh.appendRow(r));
  return sh;
};
const row = (o) => {
  const r = new Array(HUB_HEADERS.length).fill('');
  r[COL.ID - 1] = o.id; r[COL.KIND - 1] = o.kind || 'ویدیو';
  r[COL.DATE - 1] = o.date || '2026-01-01'; r[COL.TOPIC - 1] = o.topic || '';
  r[COL.MSG - 1] = o.msg || ''; r[COL.SUMMARY - 1] = o.summary || '';
  r[COL.LINK - 1] = 'https://drive.google.com/file/d/' + o.id + '/view';
  return r;
};
const shFin = mkCat('مالی، ترید و اقتصاد', [
  row({ id: 'V1', topic: 'زیان‌گریزی و رفتارِ معامله‌گر',
        msg: 'آدم‌ها از ضرر بیشتر می‌ترسند تا از سود خوشحال شوند' }),
  row({ id: 'V2', topic: 'تحلیلِ تکنیکال', msg: 'خط روند و مقاومت' }),
  row({ id: 'V3', topic: 'تورم و قدرتِ خرید', msg: 'پول کم‌ارزش می‌شود' })
]);
const shLife = mkCat('اجتماعی و سبک زندگی', [
  row({ id: 'P1', kind: 'عکس', topic: 'خوابِ کودک', msg: 'نوزاد شب‌ها بیدار می‌شود' }),
  row({ id: 'P2', kind: 'عکس', topic: 'آشپزیِ خانگی', msg: 'دستورِ قورمه‌سبزی' })
]);
ok('۶.۰ ستون‌های اثر انگشت در سرستون هستند',
   HUB_HEADERS[COL.EMB_ID - 1] === 'شناسه محتوا' &&
   HUB_HEADERS[COL.EMB_ST - 1] === 'وضعیت اثر انگشت');

console.log('\n══ ۷) دورِ ساخت ══');
EMB_CALLS = [];
const r7 = embRunDue_(50, 60000);
ok('۷.۱ دور انجام شد', r7.ok, JSON.stringify({ made: r7.made, failed: r7.failed, notes: r7.notes }));
ok('۷.۲ هر پنج ردیف اثر انگشت گرفتند', r7.made === 5, String(r7.made));
const v7 = shFin.getRange(2, COL.EMB_ID, 3, 3).getValues();
ok('۷.۳ شناسه در شیت نشست', /^CE-/.test(String(v7[0][0])), String(v7[0][0]));
ok('۷.۴ اثرانگشتِ متن و نسخهٔ دستور هم نشست',
   /^[0-9a-f]{16}·و\d+$/.test(String(v7[0][1])), String(v7[0][1]));
ok('۷.۵ وضعیت «ثبت‌شده» است', String(v7[0][2]).indexOf(EMB_ST.OK) === 0, String(v7[0][2]));
ok('۷.۶ شناسه با محاسبهٔ مستقل می‌خواند',
   String(v7[0][0]) === embId_('V1', '2026-01-01'),
   'شناسه باید هر جای دیگری هم قابلِ محاسبه باشد');
const ix7 = embIndex_();
ok('۷.۷ قطعه ساخته شد', ix7.shards.length >= 1 && ix7.shards[0].rows === 5,
   JSON.stringify(ix7.shards));
const P7 = embGetJson_(embShardName_(ix7.shards[0].seq, 'p'));
const V7 = embGetJson_(embShardName_(ix7.shards[0].seq, 'v'));
ok('۷.۸ بردارِ کوتاه و بلند در دو فایلِ جدا', P7.p.length === 5 && V7.v.length === 5,
   'بردارِ کامل نباید در فایلی باشد که هر جست‌وجو کاملش را می‌خوانَد');
ok('۷.۹ بُعدِ بردارِ جست‌وجو همان تنظیم است',
   embUnpack_(P7.p[0]).length === embProbeDim_(), String(embUnpack_(P7.p[0]).length));
ok('۷.۱۰ بردارِ کامل بُعدِ کامل دارد',
   embUnpack_(V7.v[0]).length === embDim_(), String(embUnpack_(V7.v[0]).length));
ok('۷.۱۱ هیچ برداری در شیت ننشسته',
   shFin.getRange(2, 1, 3, HUB_HEADERS.length).getValues()
        .every(r => r.every(c => String(c).length < 200)),
   '۱۵۳۶ عدد در یک سلول یعنی ده‌ها مگابایت در هابی که همین حالا ۲۹ مگ است');

console.log('\n══ ۸) دورِ دوم چیزی را دوباره نمی‌سازد ══');
EMB_CALLS = [];
const r8 = embRunDue_(50, 60000);
ok('۸.۱ هیچ ردیفِ تازه‌ای', r8.made === 0, String(r8.made));
ok('۸.۲ و هیچ فراخوانی هم', EMB_CALLS.length === 0,
   'ردیفی که اثر انگشت دارد نباید هر شب دوباره هزینه بدهد');
ok('۸.۳ شمارش کامل است', r8.left === 0, String(r8.left));

console.log('\n══ ۹) محتوای تازه خودکار دیده می‌شود ══');
shLife.appendRow(row({ id: 'P3', kind: 'عکس', topic: 'دوچرخه‌سواریِ شهری',
                       msg: 'مسیرهای امن در شهر' }));
const r9 = embRunDue_(50, 60000);
ok('۹.۱ ردیفِ تازه همان دور اثر انگشت گرفت', r9.made === 1, String(r9.made));
ok('۹.۲ و به قطعه اضافه شد',
   embGetJson_(embShardName_(embIndex_().shards[0].seq, 'p')).id.length === 6);

console.log('\n══ ۱۰) جست‌وجوی معنایی ══');
const q10 = embQueryVec_('آدم‌ها از ضرر بیشتر می‌ترسند تا از سود خوشحال شوند');
const s10 = embSearch_(q10.vec, {});
ok('۱۰.۱ نتیجه برگشت', s10.ok && s10.items.length >= 1, JSON.stringify(s10.items.map(i => i.title)));
ok('۱۰.۲ نزدیک‌ترین، همان ردیف است', s10.items[0].fileId === 'V1', s10.items[0].fileId);
ok('۱۰.۳ و با فاصله از بعدی',
   s10.items.length < 2 || s10.items[0].score > s10.items[1].score + 0.1,
   s10.items.map(i => i.fileId + ':' + i.score.toFixed(3)).join(' '));
ok('۱۰.۴ بردارِ کامل هم به کار رفت', s10.rescored > 0, String(s10.rescored));
ok('۱۰.۵ شمارِ قطعه‌های خوانده‌شده گزارش می‌شود',
   s10.shards === s10.shardsAll, s10.shards + '/' + s10.shardsAll,
   'جست‌وجویی که ناتمامیِ خود را نگوید، به کاربر می‌گوید «نیست»');
const s10b = embSearch_(embQueryVec_('دستورِ قورمه‌سبزی خانگی').vec, {});
ok('۱۰.۶ پرس‌وجوی دیگر، ردیفِ دیگر', s10b.items[0].fileId === 'P2', s10b.items[0].fileId);

console.log('\n══ ۱۱) ایندکسِ کهنه — کارِ نیمه‌کاره بدتر از کارِ نکرده است ══');
const savedDim = CFG.EMB_DIM;
CFG.EMB_DIM = 768;
const r11 = embRunDue_(50, 60000);
ok('۱۱.۱ با عوض‌شدنِ بُعد، ساخت متوقف می‌شود', r11.made === 0 && !!r11.stale, r11.stale);
const s11 = embSearch_(embNorm_(fakeVec('هرچیز', 768)), {});
ok('۱۱.۲ و جست‌وجو هم نتیجهٔ بی‌معنا نمی‌دهد', !s11.ok && /کهنه/.test(s11.note), s11.note);
CFG.EMB_DIM = savedDim;
ok('۱۱.۳ با برگشتِ تنظیم، همه‌چیز عادی است', !embIndexStale_(embIndex_()));

console.log('\n══ ۱۲) شکست، تلاشِ دوباره، و رهاکردن ══');
shFin.appendRow(row({ id: 'V9', topic: 'موضوعی که فراخوانش می‌افتد' }));
const tryMax = Math.max(1, Number(CFG.EMB_TRY_MAX) || 3);
for (let i = 0; i < tryMax; i++) { EMB_FAIL = 99; embRunDue_(5, 30000); EMB_FAIL = 0; }
const last = shFin.getLastRow();
const st12 = String(shFin.getRange(last, COL.EMB_ST).getValue());
ok('۱۲.۱ پس از سقفِ تلاش «رهاشده» می‌شود', st12.indexOf(EMB_ST.GIVEUP) === 0, st12);
const c12 = embCounts_(hub);
ok('۱۲.۲ رهاشده جدا از عقب‌مانده شمرده می‌شود',
   c12.abandoned === 1 && c12.pending === 0,
   JSON.stringify({ ab: c12.abandoned, pend: c12.pending, done: c12.done }));
ok('۱۲.۳ پس «~N شب تا پایان» برای همیشه نمی‌مانَد',
   embStatus_(hub).nightsLeft === 0,
   'گزارشِ چیزی که هرگز نمی‌افتد به‌عنوانِ عقب‌ماندگی، همان‌جایی است که هشدار نویز می‌شود');
EMB_CALLS = [];
embRunDue_(5, 30000);
ok('۱۲.۴ ردیفِ رهاشده دوباره فراخوان نمی‌خورد', EMB_CALLS.length === 0);

console.log('\n══ ۱۳) خودآزمون — تنها سنجه‌ای که واقعاً امتحان می‌کند ══');
const t13 = embSelfTest_(3);
ok('۱۳.۱ اجرا شد', t13.ok && t13.tried > 0, JSON.stringify(t13));
ok('۱۳.۲ ردیف‌ها خودشان را پیدا کردند', t13.ratio >= 0.9, t13.hit + '/' + t13.tried);

console.log('\n══ ۱۴) کارنامه و وضعیت ══');
const n14 = embNightly_({ cap: 5, budgetMs: 30000 });
const rows14 = embRows_(hub);
ok('۱۴.۱ هر دور یک ردیف در کارنامه می‌گذارد', rows14.length >= 1, String(rows14.length));
ok('۱۴.۲ کارنامه پوشش را ثبت می‌کند', /٪/.test(String(rows14[rows14.length - 1][7])),
   String(rows14[rows14.length - 1][7]));
const st14 = embStatus_(hub);
ok('۱۴.۳ سطرِ روزانه هست، حتی وقتی خبرِ تازه‌ای نیست', !!st14.line, st14.line);
ok('۱۴.۴ و عددِ واقعی دارد', /\d|[۰-۹]/.test(st14.line));
ok('۱۴.۵ در _STATUS.json کلیدِ embed هست',
   Object.keys(writeStatus_(hub, '')).indexOf('embed') !== -1);

console.log('\n══ ۱۵) دروازه‌ها — و زنگی که نویسنده‌اش صفرش نکند (درسِ ۷٫۲۲) ══');
ok('۱۵.۱ روزهای گیرکردن از کارنامه می‌آید، نه از مُهرِ خودِ هشدار',
   /embRows_/.test(String(embStuckDays_)),
   'در ۷٫۲۱ هشدار از مُهری می‌خواند که خودش هر شب می‌زد، پس هرگز به صدا درنیامد');
ok('۱۵.۲ دورِ تازه یعنی صفر روز گیرکردن', embStuckDays_(hub) === 0, String(embStuckDays_(hub)));

// ۱۵.۲ب (۷٫۵۳) — گوگل‌شیت رشتهٔ تاریخِ nowStr_ را خودش به سلولِ Date تبدیل
// می‌کند؛ ماکِ appendRow این کار را نمی‌کند، پس اینجا دستی شبیه‌سازی می‌شود
// (همان چیزی که real getValues() برمی‌گرداند): یک شیءِ Date واقعی، نه رشته.
const embRow3daysAgo = new Date(Date.now() - 3 * 86400000);
embTab_(hub).appendRow([embRow3daysAgo, 'شبانه', 1, 1, 0, 1, 1, '۱۰۰٪', '', '']);
const stuck3 = embStuckDays_(hub);
ok('۱۵.۲ج سلولِ Dateِ واقعیِ گوگل‌شیت (نه رشته) درست خوانده می‌شود',
   stuck3 >= 2 && stuck3 <= 4, String(stuck3) +
   ' — اگر رگ‌اکس روی String(dateObj) بیفتد، ساعت:دقیقه به‌جای ماه:روز خوانده ' +
   'می‌شود و عددی مثلِ ۱۹۰+ می‌دهد (درسِ ۷٫۵۳)');
const rep = hub.getSheetByName(CFG.REPORT_TAB || 'گزارش‌های نظارت');
const before15 = rep ? rep.getLastRow() : 0;
embGates_(hub, { pending: 40, stuckDays: 9 }, null);
const rep2 = hub.getSheetByName(CFG.REPORT_TAB || 'گزارش‌های نظارت');
ok('۱۵.۳ گیرکردنِ واقعی یافته می‌سازد', rep2.getLastRow() > before15);
const rowsR = rep2.getRange(2, 1, rep2.getLastRow() - 1, REPORT_HEADERS.length).getValues();
const f15 = rowsR.filter(r => String(r[RC.TITLE - 1]).indexOf('اثرانگشت‌زنی') !== -1);
ok('۱۵.۴ و مالکش «کد» است، پس در صفِ NEEDS_CODE می‌نشیند',
   f15.length === 1 && String(f15[0][RC.STATUS - 1]) === RST.NEEDS_CODE,
   f15.length ? String(f15[0][RC.STATUS - 1]) : 'یافته‌ای نبود');
const b15b = rep2.getLastRow();
embGates_(hub, { pending: 0, stuckDays: 9 }, null);
ok('۱۵.۵ ولی وقتی کاری نمانده، هیچ هشداری نیست', rep2.getLastRow() === b15b,
   'هشداری که برای هیچ بلند شود، همان هشداری است که آدم یاد می‌گیرد نادیده بگیرد');

console.log('\n══ ۱۶) خودآزمونِ ضعیف: یک شبِ بد، شبِ بد است ══');
try { delete global.__PROPS[PK.EMB_BAD]; } catch (e) {}
const b16 = rep2.getLastRow();
embGates_(hub, { pending: 0, stuckDays: 0 }, { ok: true, tried: 4, hit: 0, ratio: 0 });
ok('۱۶.۱ شبِ اول هشداری نمی‌دهد', rep2.getLastRow() === b16);
embGates_(hub, { pending: 0, stuckDays: 0 }, { ok: true, tried: 4, hit: 0, ratio: 0 });
ok('۱۶.۲ شبِ دوم می‌دهد', rep2.getLastRow() > b16);
embGates_(hub, { pending: 0, stuckDays: 0 }, { ok: true, tried: 4, hit: 4, ratio: 1 });
ok('۱۶.۳ و یک شبِ خوب شمارنده را پاک می‌کند', !global.__PROPS[PK.EMB_BAD],
   String(global.__PROPS[PK.EMB_BAD]));

console.log('\n══ ۱۷) شیت‌های منبع دست‌نخورده‌اند ══');
const fake = SpreadsheetApp.create('RESULT-EMB-TEST');
global.__SS[fake.getId()] = fake;
const fsh = fake.insertSheet('Sheet1');
fsh.appendRow(['Timestamp', 'File_ID', 'Main_Subject', 'General_Executive_Summary', 'Status']);
fsh.appendRow(['2026-01-01', 'SRC1', 'زیان‌گریزی', 'دربارهٔ ترسِ از ضرر', 'SUCCESS']);
const snap = JSON.stringify(fsh.getRange(1, 1, 2, 5).getValues());
const savedSrc = CFG.SOURCES;
CFG.SOURCES = [{ key: 'emb', id: fake.getId(), title: 'منبعِ آزمایشی', schema: 'auto' }];
embRunDue_(50, 30000);
embSearch_(embQueryVec_('ترسِ از ضرر').vec, {});
ok('۱۷.۱ نه ردیفی عوض شد نه ستونی اضافه',
   JSON.stringify(fsh.getRange(1, 1, 2, 5).getValues()) === snap &&
   fsh.getLastColumn() === 5,
   'پنج شیتِ منبع فقط‌خواندنی‌اند — این مرز جای مذاکره ندارد');
CFG.SOURCES = savedSrc;

console.log('\n══ ۱۸) پیوند با جست‌وجو (بخشِ ۳۴) ══');
/* ردیفی که **هیچ واژهٔ مشترکی** با پرس‌وجو ندارد. تا ۷٫۲۵ این ردیف
   هرگز به دستِ مدل نمی‌رسید، چون بازیابی واژه‌ای بود. */
const qText = 'آدم‌ها از ضرر بیشتر می‌ترسند تا از سود خوشحال شوند';
const lex = srchRun_(qText, { mode: 'ساده', sources: false });
const semOnly = srchSemantic_(qText, [], new Date().getTime() + 60000);
ok('۱۸.۱ بازیابیِ معنایی کار می‌کند', semOnly.ok, semOnly.note);
ok('۱۸.۲ ردیفِ درست را آورد', semOnly.items.some(i => i.id === 'V1'),
   JSON.stringify(semOnly.items.map(i => i.id)));
ok('۱۸.۳ و با نشانِ خودش می‌آید',
   semOnly.items.every(i => i.fit === 'یافتهٔ معنایی'),
   'کاربر باید بفهمد این را واژه پیدا نکرده');
const amb = srchRun_('چیزی دربارهٔ ترسِ مالی', { mode: 'هوشمند', sources: false });
ok('۱۸.۴ حالتِ هوشمند بخشِ معنایی را گزارش می‌کند',
   amb.semantic && amb.semantic.on === true, JSON.stringify(amb.semantic));
ok('۱۸.۵ حالتِ ساده اصلاً سراغش نمی‌رود',
   srchRun_('ترس', { mode: 'ساده', sources: false }).semantic === null,
   '«بدونِ هوش مصنوعی» باید واقعاً بدونِ آن باشد');

/* ══ آمیختن، جدا از بازیابی ══
   اینکه «بردار درست است» و اینکه «نتیجهٔ بردار به فهرستِ نهایی می‌رسد»
   دو چیزند، و دومی همان جایی است که بی‌صدا می‌شکند: یک فیلترِ امتیاز،
   یک برشِ زودهنگام، و یافتهٔ معنایی ناپدید می‌شود بی آنکه چیزی بگوید.
   پس این‌جا بازیابی با یک بدلِ قطعی جایگزین می‌شود تا فقط مسیرِ آمیختن
   سنجیده شود. */
const realSem = srchSemantic_;
globalThis.srchSemantic_ = function () {
  const sh = hub.getSheetByName('اجتماعی و سبک زندگی');
  const r = sh.getRange(3, 1, 1, HUB_HEADERS.length).getValues()[0];
  const it = srchHubItem_(sh, 3, r);
  it.score = 0; it.sem = 0.9; it.fit = 'یافتهٔ معنایی';
  return { ok: true, items: [it], added: 1, scanned: 9, shards: 1, shardsAll: 1,
           stopped: '', note: '', dropped: 0 };
};
const m18 = srchRun_('یک پرس‌وجوی کاملاً بی‌ربط به هر واژه‌ای', { mode: 'هوشمند', sources: false });
ok('۱۸.۶ یافتهٔ معنایی به فهرستِ نهایی می‌رسد',
   m18.items.some(i => i.fit === 'یافتهٔ معنایی'),
   JSON.stringify(m18.items.map(i => i.id + '/' + i.fit)));
ok('۱۸.۷ و کاربر می‌فهمد از کجا آمده',
   m18.notes.some(n => n.indexOf('جست‌وجوی معنایی آورد') !== -1), m18.notes.join(' | '));
ok('۱۸.۸ بی هیچ نتیجهٔ لغوی هم فهرست خالی نمی‌مانَد', m18.items.length >= 1);
globalThis.srchSemantic_ = realSem;

/* ══ و سهمِ تضمین‌شده ══
   لایهٔ لغوی می‌تواند کلِ بودجه را بخورد. اگر معنا بعد از آن می‌آمد، در
   هر پرس‌وجوی سنگین بی‌صدا اجرا نمی‌شد — یعنی همان قابلیتی که خواسته
   شده بود، درست در سخت‌ترین پرس‌وجوها غایب. */
const realCollect = srchCollect_;
let collectOpts = null, semFirst = false;
globalThis.srchSemantic_ = function () {
  semFirst = (collectOpts === null);
  return { ok: true, items: [], added: 0, scanned: 0, shards: 0, shardsAll: 0,
           stopped: '', note: '', dropped: 0 };
};
globalThis.srchCollect_ = function (t, q, o) { collectOpts = o; return realCollect(t, q, o); };
srchRun_('ترسِ مالی', { mode: 'هوشمند', sources: false });
ok('۱۸.۹ معنا پیش از لغوی می‌دود', semFirst === true);
ok('۱۸.۱۰ و بودجهٔ لغوی کران‌دار می‌شود، نه همهٔ وقت',
   collectOpts && collectOpts.budgetMs > 0 &&
   collectOpts.budgetMs <= (Number(CFG.SEARCH_BUDGET_MS) || 230000),
   String(collectOpts && collectOpts.budgetMs));
globalThis.srchCollect_ = realCollect;
globalThis.srchSemantic_ = realSem;

console.log('\n══ ۲۰) مشخصاتِ استخراج‌شده — ستون‌هایی که تا ۷٫۲۶ دور ریخته می‌شدند ══');
/* شیتِ منبعی با همان شکلِ واقعی: چند ستونِ شناخته‌شده و چند ستونِ تحلیلی
   که `buildAutoRec_` هرگز برنمی‌داشت. */
const sp = SpreadsheetApp.create('RESULT-SPECS');
global.__SS[sp.getId()] = sp;
const ssh = sp.insertSheet('Video Analysis');
const SPEC_HDR = ['Timestamp', 'File_ID', 'File_Link', 'Duration', 'Persons_Identified',
                  'Music_Analysis', 'Technical_Specs', 'Farsi_Transcription',
                  'Vibe_Atmosphere', 'Main_Subject', 'Key_Points',
                  'General_Executive_Summary', 'Status', 'Narrative_Elements'];
ssh.appendRow(SPEC_HDR);
ssh.appendRow(['2026-05-05 10:00:00', 'SPEC1', 'https://drive/x', '12:34',
               'بهروز رضوی', 'موسیقیِ بی‌کلامِ آرام', '1080p · 48kHz',
               'متنِ پیاده‌شده', 'آرام و شبانه', 'شبِ بارانی در تهران',
               'نکتهٔ کلیدی', 'خلاصه', 'SUCCESS', 'روایتِ اول‌شخص']);
const mSpec = srcMap_(SPEC_HDR);
const skip = srcSpecsSkip_(SPEC_HDR, mSpec);
const specTxt = srcSpecsText_(SPEC_HDR, ssh.getRange(2, 1, 1, SPEC_HDR.length).getValues()[0], skip);
ok('۲۰.۱ مدت زمان وارد مشخصات می‌شود', specTxt.indexOf('12:34') !== -1, specTxt);
ok('۲۰.۲ اشخاص هم', specTxt.indexOf('بهروز رضوی') !== -1);
ok('۲۰.۳ تحلیل موسیقی هم', specTxt.indexOf('بی‌کلام') !== -1);
ok('۲۰.۴ مشخصات فنی هم', specTxt.indexOf('1080p') !== -1);
ok('۲۰.۵ و ستونِ تازه‌ای که هیچ‌کس نامش را در کد ننوشته',
   specTxt.indexOf('روایتِ اول‌شخص') !== -1,
   'فهرستِ سفیدِ دست‌نویس کهنه می‌شود؛ تحلیلگرها ستون اضافه می‌کنند');
ok('۲۰.۶ سرستون هم می‌آید، نه فقط مقدار', specTxt.indexOf('Duration') !== -1,
   'عددِ «12:34» بی واژهٔ «مدت» چیزی نمی‌گوید');
ok('۲۰.۷ ستون‌هایی که از قبل در بانک‌اند تکرار نمی‌شوند',
   specTxt.indexOf('شبِ بارانی') === -1 && specTxt.indexOf('متنِ پیاده‌شده') === -1);
ok('۲۰.۸ و دفترداری هم نمی‌آید',
   specTxt.indexOf('SUCCESS') === -1 && specTxt.indexOf('SPEC1') === -1 &&
   specTxt.indexOf('https://drive') === -1);
ok('۲۰.۹ سقفِ کل رعایت می‌شود',
   specTxt.length <= (Number(CFG.EMB_SPECS_MAX) || 700));

console.log('\n══ ۲۱) جبرانِ گذشته: ردیف‌هایی که پیش از ۷٫۲۷ ساخته شدند ══');
const savedSrc2 = CFG.SOURCES;
CFG.SOURCES = [{ key: 'spec', id: sp.getId(), title: 'منبعِ مشخصات', schema: 'auto' }];
/* ردیفِ بانک همان کلید را دارد ولی ستونِ مشخصاتش خالی است — دقیقاً وضعِ
   ۱۲ هزار ردیفی که امروز در بانک هستند. */
const shSpec = mkCat('علمی و آموزشی', [
  row({ id: 'SPEC1', date: '2026-05-05 10:00:00', topic: 'شبِ بارانی در تهران' })
]);
const specRow = shSpec.getLastRow();
embRunDue_(20, 30000);
ok('۲۱.۱ اول اثر انگشت می‌گیرد (بی مشخصات)',
   String(shSpec.getRange(specRow, COL.EMB_ST).getValue()).indexOf(EMB_ST.OK) === 0);
const bf = embSpecsBackfill_(500, 30000);
ok('۲۱.۲ جبران ردیف را پیدا کرد', bf.ok && bf.filled === 1, JSON.stringify(bf));
ok('۲۱.۳ مشخصات در بانک نشست',
   String(shSpec.getRange(specRow, COL.SPECS).getValue()).indexOf('12:34') !== -1,
   String(shSpec.getRange(specRow, COL.SPECS).getValue()).slice(0, 80));
ok('۲۱.۴ و وضعیتِ اثر انگشت پاک شد تا از نو ساخته شود',
   String(shSpec.getRange(specRow, COL.EMB_ST).getValue()) === '',
   'مشخصاتی که بردار نبیندش، یک ستونِ پر و یک وعدهٔ نیم‌کاره است');
embRunDue_(20, 30000);
ok('۲۱.۵ دوباره ساخته شد',
   String(shSpec.getRange(specRow, COL.EMB_ST).getValue()).indexOf(EMB_ST.OK) === 0);
const bf2 = embSpecsBackfill_(500, 30000);
ok('۲۱.۶ بارِ دوم چیزی نمی‌نویسد', bf2.filled === 0, String(bf2.filled));
ok('۲۱.۷ و دورِ جبران خودش را تمام‌شده اعلام می‌کند', !!embSpecsDone_(), embSpecsDone_());
ok('۲۱.۸ در شیتِ منبع چیزی نوشته نشد',
   ssh.getLastColumn() === SPEC_HDR.length && ssh.getLastRow() === 2);
/* و مهم‌ترین: مشخصات واقعاً در متنی که به مدل می‌رود هست. */
EMB_CALLS = [];
shSpec.getRange(specRow, COL.EMB_ST).setValue('');
embRunDue_(20, 30000);
ok('۲۱.۹ مشخصات در متنِ بردار هست',
   EMB_CALLS.length > 0 &&
   EMB_CALLS[0].requests.some(r => r.content.parts[0].text.indexOf('12:34') !== -1),
   'وگرنه ستون پر است و جست‌وجو همان‌قدر کور');
CFG.SOURCES = savedSrc2;

console.log('\n══ ۲۲) دستورِ تازه یعنی ساختِ دوباره — درسِ ۵٫۹۵ ══');
/* اگر فردا بفهمیم متنی که به مدل می‌رود ناقص است و درستش کنیم، ردیف‌های
   قبلی باید از نو ساخته شوند. بی این، تمیزکردنِ ورودی آنچه را از قبل
   نوشته شده درست نمی‌کند. */
const doneBefore = embCounts_(hub).done;
ok('۲۲.۱ نسخهٔ دستور در سلولِ اثر انگشت ثبت شده',
   embFpVer_(String(shSpec.getRange(specRow, COL.EMB_FP).getValue())) === EMB_TEXT_VER);
shSpec.getRange(specRow, COL.EMB_FP).setValue('aaaaaaaaaaaaaaaa·و1');
const c22 = embCounts_(hub);
ok('۲۲.۲ ردیفِ با دستورِ قدیمی «آماده» شمرده نمی‌شود',
   c22.done === doneBefore - 1 && c22.oldVer === 1,
   JSON.stringify({ done: c22.done, old: c22.oldVer }));
ok('۲۲.۳ و در «مانده» می‌آید، وگرنه «چند شب تا پایان» دروغ می‌گوید',
   c22.pending >= 1, String(c22.pending));
EMB_CALLS = [];
embRunDue_(20, 30000);
ok('۲۲.۴ خودبه‌خود از نو ساخته شد',
   embFpVer_(String(shSpec.getRange(specRow, COL.EMB_FP).getValue())) === EMB_TEXT_VER &&
   EMB_CALLS.length > 0);
ok('۲۲.۵ و سطرِ روزانه این را می‌گوید، نه اینکه بی‌صدا انجامش بدهد',
   /دستورِ قدیمی/.test(embStatus_(hub).line) || embCounts_(hub).oldVer === 0,
   embStatus_(hub).line);

console.log('\n══ ۲۳) دروازه‌ها به کارِ شبانه گره نخورده‌اند ══');
/* اگر نگهبانِ زمان اجازهٔ اجرای بندِ شبانه را ندهد، دقیقاً همان شبی است
   که هشدارِ «گیرکرده» لازم است — و تا ۷٫۲۶ همان شب خاموش بود. */
ok('۲۳.۱ وارسیِ سلامت هم دروازه را می‌زند',
   /embGates_\(/.test(fs.readFileSync('src/08_Health.gs', 'utf8')),
   'هشداری که فقط از مسیرِ گرسنه صدا زده شود، در قحطی ساکت است');

console.log('\n══ ۲۴) خودآزمون با بازنویسی — آزمونی که توخالی نباشد ══');
/* عنوانِ خودِ ردیف داخلِ متنی است که بردارش ساخته شده. پرس‌وجو با آن فقط
   می‌گوید «ایندکس خراب نیست»، نه «جست‌وجو کار می‌کند»: اگر متنی که به
   مدل می‌رود سیستماتیک غلط باشد، پرس‌وجو و سند هر دو همان غلط را دارند. */
let PARA = null;
const baseStub = global.__STUB;
global.__STUB = (url, body) => {
  if (url.indexOf('generateContent') !== -1 && PARA) {
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: JSON.stringify(PARA(body)) }] } }] } };
  }
  return baseStub(url, body);
};
PARA = (body) => {
  const n = (String(body.contents[0].parts[0].text).match(/^\d+\) /gm) || []).length;
  return { q: Array.from({ length: n }, (_, i) => 'بازنویسیِ شمارهٔ ' + (i + 1)) };
};
const t24 = embSelfTest_(2);
ok('۲۴.۱ وقتی مدل هست، با بازنویسی آزموده می‌شود', t24.mode === 'بازنویسی', t24.mode);
PARA = () => ({ q: ['فقط یکی'] });
const t24b = embSelfTest_(3);
ok('۲۴.۲ پاسخِ ناجورِ مدل پذیرفته نمی‌شود', t24b.mode === 'عنوان', t24b.mode);
ok('۲۴.۳ و همین در گزارش گفته می‌شود، نه اینکه بی‌صدا آسان‌تر شود',
   /بازنویسی نشد/.test(t24b.note), t24b.note,
   'نبودِ مدل تأییدِ خاموش نیست');
PARA = null;
const t24c = embSelfTest_(2);
ok('۲۴.۴ بی مدل هم آزمون می‌دود، ولی با نشانِ خودش', t24c.mode === 'عنوان');
ok('۲۴.۵ و حالت در سطرِ روزانه دیده می‌شود',
   /بازنویسی|عنوان/.test(embStatus_(hub).line) ||
   !embStatus_(hub).selftest, embStatus_(hub).line);

console.log('\n══ ۲۵) مرکزِ قطعه‌ها — ۵۰ هزار ردیف در یک جست‌وجو جا نمی‌شود ══');
/* عددِ شبِ اولِ واقعی: بانک ۵۰٬۳۶۷ ردیف دارد، پس ایندکسِ کوتاه ~۳۰ مگابایت
   در ~۳۴ قطعه می‌شود. خواندنِ همه‌اش در هر جست‌وجو شدنی نیست. */
const savedShardRows = CFG.EMB_SHARD_ROWS;
const savedMinSh = CFG.EMB_CENTROID_MIN;
const savedKeepSh = CFG.EMB_PROBE_SHARDS;
CFG.EMB_SHARD_ROWS = 2;                 // قطعه‌های ریز، تا چند تا ساخته شوند
CFG.EMB_CENTROID_MIN = 2;
CFG.EMB_PROBE_SHARDS = 2;
const shM = mkCat('مستند و مصاحبه', [
  row({ id: 'M1', topic: 'ساختِ سد و مهندسیِ آب' }),
  row({ id: 'M2', topic: 'پرورشِ زنبورِ عسل' }),
  row({ id: 'M3', topic: 'نجومِ رصدی و تلسکوپ' }),
  row({ id: 'M4', topic: 'خطاطیِ نستعلیق' }),
  row({ id: 'M5', topic: 'کوهنوردی در زمستان' }),
  row({ id: 'M6', topic: 'آشپزیِ محلیِ گیلان' })
]);
embRunDue_(50, 60000);
const ix25 = embIndex_();
ok('۲۵.۱ چند قطعه ساخته شد', ix25.shards.length >= 3, String(ix25.shards.length));
ok('۲۵.۲ هر قطعهٔ تازه مرکز دارد',
   ix25.shards.filter(x => x.rows > 0 && !x.c).length === 0,
   ix25.shards.map(x => x.seq + ':' + (x.c ? 'ok' : 'بی‌مرکز')).join(' '));
ok('۲۵.۳ مرکز هم‌بُعدِ بردارِ جست‌وجوست',
   embUnpack_(ix25.shards[ix25.shards.length - 1].c).length === embProbeDim_());
const s25 = embSearch_(embQueryVec_('ساختِ سد و مهندسیِ آب').vec, {});
ok('۲۵.۴ همهٔ قطعه‌ها خوانده نمی‌شوند', s25.shards < s25.shardsAll,
   s25.shards + ' از ' + s25.shardsAll);
ok('۲۵.۵ و ناتمامی پنهان نمی‌مانَد — شمارش گزارش می‌شود',
   typeof s25.shards === 'number' && typeof s25.shardsAll === 'number');
ok('۲۵.۶ با وجودِ نخواندنِ همه، نتیجهٔ درست پیدا می‌شود',
   s25.items.length >= 1 && s25.items[0].fileId === 'M1',
   s25.items.map(i => i.fileId).join(','));

/* قطعه‌ای که مرکز ندارد — دقیقاً وضعِ قطعهٔ ۱ که دیشب نوشته شد. */
const ixNo = embIndex_();
const lost = ixNo.shards[0].c;
delete ixNo.shards[0].c;
embIndexSave_(ixNo);
const s25b = embSearch_(embQueryVec_('چیزی کاملاً بی‌ربط').vec, {});
ok('۲۵.۷ قطعهٔ بی‌مرکز همیشه خوانده می‌شود',
   s25b.shards >= 1, String(s25b.shards),
   'ندانستن دلیلِ رد کردن نیست');
const fx = embCentroidFix_(5);
ok('۲۵.۸ و شبانه مرکزش حساب می‌شود', fx.fixed >= 1, JSON.stringify(fx));
ok('۲۵.۹ که همان مرکزِ قبلی است', embIndex_().shards[0].c === lost,
   'مرکز تابعی از محتوای قطعه است، نه از زمانِ حسابش');
CFG.EMB_SHARD_ROWS = savedShardRows;
CFG.EMB_CENTROID_MIN = savedMinSh;
CFG.EMB_PROBE_SHARDS = savedKeepSh;

console.log('\n══ ۲۶) «چقدر می‌خواهم» و «چقدر خرج می‌کنم» باید با هم بخوانند ══');
/* ۷٫۲۸ نگهبان را به ۳۰۰ ثانیه برد در حالی که کلِ بودجهٔ شب ۲۷۰ است — پس
   نگهبان هرگز رد نمی‌شد و چون اولین ردشدن همهٔ بلوک‌های بعدی را هم رد
   می‌کند، شب عملاً از آنجا به بعد تعطیل می‌شد. ۷٫۳۰ آن لایه را بست
   (`run_oneshot_test.js`: هیچ `nightHas_` بزرگ‌تر از `NIGHT_BUDGET_MS`).

   این آزمون لایهٔ بعدی است و همان اشتباه از درِ دیگر: بلوکی که با
   نگهبانِ N وارد می‌شود نباید بیش از N خرج کند. رد شدن از سقفِ سختِ
   شش‌دقیقه‌ایِ Apps Script `nightEnd_` را هم می‌کُشد، یعنی شب دوباره
   زمان‌بندی نمی‌شود — خرابی‌ای که هیچ خطایی نمی‌دهد. */
{
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const m = su.match(/nightHas_\((\d+),\s*'اثر انگشتِ معنایی'\)/);
  ok('۲۶.۱ نگهبانِ بلوکِ اثر انگشت پیدا شد', !!m, m ? m[1] : 'پیدا نشد');
  const guard = Number(m[1]);
  const budget = Math.max(30000, Number(CFG.NIGHT_BUDGET_MS) || 270000);
  ok('۲۶.۲ نگهبان از کلِ بودجهٔ شب بزرگ‌تر نیست',
     guard <= budget, guard + ' ≤ ' + budget);
  const spend = (Number(CFG.EMB_SPECS_MS) || 0) + (Number(CFG.EMB_BUDGET_MS) || 0);
  ok('۲۶.۳ و آنچه بلوک خرج می‌کند از آنچه خواسته بیشتر نیست',
     spend <= guard,
     'خرج ' + spend + ' در برابرِ نگهبانِ ' + guard +
     ' — بیشتر یعنی رد شدن از سقفِ سختِ Apps Script و کشته‌شدنِ nightEnd_');
}

console.log('\n══ ۱۹) خاموشی ══');
CFG.EMB_ON = false;
ok('۱۹.۱ دور اجرا نمی‌شود', embRunDue_(5, 5000).made === 0);
ok('۱۹.۲ سطرِ روزانه باز هم هست', !!embStatus_(hub).line, embStatus_(hub).line);
const off19 = srchRun_('ترس', { mode: 'هوشمند', sources: false });
ok('۱۹.۳ جست‌وجو همان کارِ دیروز را می‌کند', off19.ok && off19.semantic.on === false,
   'خاموش‌بودنِ یک قابلیتِ تازه نباید قابلیتِ قدیمی را بشکند');
CFG.EMB_ON = true;

console.log('\nPASS=' + pass);
