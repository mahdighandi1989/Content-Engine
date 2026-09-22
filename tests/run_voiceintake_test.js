/* پذیرشِ گویندهٔ تازه — بخشِ ۳۳.
 *
 * چرا آزمونِ سخت‌گیر: هر خرابیِ ممکنِ این بخش **بی‌صداست**.
 *   • اگر پوشه خوانده نشود، هیچ خطایی نمی‌آید — فقط هیچ‌وقت هیچ گوینده‌ای
 *     اضافه نمی‌شود. همان هفت هفتهٔ بانکِ موسیقی.
 *   • اگر کلیدِ گوینده ناپایدار باشد، یک نفر دو بار آموزش می‌بیند.
 *   • اگر گویندهٔ «آماده» دوباره به صف برود، هر شب ساعت‌ها پردازش می‌سوزد
 *     و هیچ‌کس نمی‌فهمد — همان حلقهٔ بی‌پایانِ جزوه پیش از ۵٫۸۸.
 *   • اگر اعلامِ «✅ آماده» برای کسی برود که هفتهٔ پیش آماده شده، خبرِ
 *     دروغ است و بقیهٔ خبرها هم بی‌اعتبار می‌شوند.
 * هیچ‌کدام خطا نمی‌دهند، پس همه باید اینجا اجرا شوند.
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

const OUT = DriveApp.__register(CFG.OUTPUT_FOLDER_ID, 'OUTPUT');
const hub = getHub_();
const clone = () => vintCloneFolder_();
const put = (folder, name, bytes) => {
  const f = folder.createFile(name, 'x'.repeat(Math.max(1, bytes || 10)), 'audio/mpeg');
  return f;
};

console.log('\n══ ۱) نامِ گوینده از نامِ فایل — جایی که یک خط‌تیره می‌تواند گوینده بسازد ══');
ok('۱.۱ جداکنندهٔ فاصله‌دار بریده می‌شود',
   vintSpeakerOf_('مریم احمدی — ۱.mp3') === 'مریم احمدی');
ok('۱.۲ خط‌تیرهٔ بی‌فاصله نامِ لاتین را نمی‌شکند',
   vintSpeakerOf_('ali-rezaei-1.mp3') === 'ali-rezaei',
   'وگرنه گویندهٔ ساختگیِ «ali» ساخته می‌شد');
ok('۱.۳ «(۱)»ِ درایو برداشته می‌شود',
   vintSpeakerOf_('نام (1).mp3') === 'نام');
ok('۱.۴ سه فایلِ یک نفر یک گوینده‌اند',
   vintSlug_(vintSpeakerOf_('سارا — ۱.mp3')) === vintSlug_(vintSpeakerOf_('سارا — ۲.wav')) &&
   vintSlug_(vintSpeakerOf_('سارا — ۲.wav')) === vintSlug_(vintSpeakerOf_('سارا.m4a')));
ok('۱.۵ دو نامِ متفاوت دو کلید می‌گیرند',
   vintSlug_('مریم احمدی') !== vintSlug_('علی رضایی'));
ok('۱.۶ کلید پایدار است (همان ورودی، همان خروجی)',
   vintSlug_('بهروز رضوی') === vintSlug_('بهروز رضوی') && !!vintSlug_('بهروز رضوی'));

console.log('\n══ ۲) قالب — رد شدنِ بی‌صدا ممنوع ══');
ok('۲.۱ mp3/wav/m4a/flac پذیرفته',
   ['a.mp3', 'b.wav', 'c.m4a', 'd.flac', 'e.opus'].every(vintAudioOk_));
ok('۲.۲ متن و عکس پذیرفته نمی‌شوند',
   !vintAudioOk_('note.txt') && !vintAudioOk_('cover.png') && !vintAudioOk_('x'));

console.log('\n══ ۳) پیمایشِ پوشه ══');
const cf = clone();
const fold = cf.createFolder('مریم احمدی');
put(fold, 'قصه ۱.mp3', 5000); put(fold, 'قصه ۲.mp3', 7000);
put(cf, 'علی رضایی — ۱.wav', 3000);
put(cf, 'علی رضایی — ۲.wav', 3000);
cf.createFile('یادداشت.txt', 'سلام', 'text/plain');
const empty = cf.createFolder('پوشهٔ خالی');

let scan = vintScan_();
const byName = {}; scan.speakers.forEach(s => byName[s.name] = s);
ok('۳.۱ زیرپوشه یک گوینده است، با همهٔ فایل‌هایش',
   byName['مریم احمدی'] && byName['مریم احمدی'].files.length === 2);
ok('۳.۲ فایل‌های آزادِ هم‌نام یک گوینده‌اند',
   byName['علی رضایی'] && byName['علی رضایی'].files.length === 2);
ok('۳.۳ فایلِ نامربوط گزارش می‌شود، نه اینکه بی‌صدا رد شود',
   scan.bad.some(b => b.name === 'یادداشت.txt'));
ok('۳.۴ پوشهٔ خالی هم گزارش می‌شود',
   scan.bad.some(b => b.name === 'پوشهٔ خالی'));
ok('۳.۵ راهنما گوینده شمرده نمی‌شود',
   (function () {
     cf.createFile(String(CFG.VOICE_GUIDE_FILE), '# راهنما', 'text/plain');
     return !vintScan_().speakers.some(s => s.name.indexOf('راهنما') === 0);
   })());

console.log('\n══ ۴) صف — و اینکه گویندهٔ آماده دوباره واردش نشود ══');
const q1 = vintQueue_(hub, vintScan_(), vintState_(hub));
ok('۴.۱ هر دو گوینده در صف‌اند', q1.speakers.length === 2);
ok('۴.۲ صف فایل‌های واقعی را با شناسه می‌برد',
   q1.speakers.every(s => s.files.length > 0 && s.files.every(f => !!f.id)));
ok('۴.۳ فایل‌ها «هرکس با لینک» شدند — وگرنه رانرِ بی‌هویت نمی‌بیندشان',
   q1.speakers[0].files.every(f =>
     DriveApp.getFileById(f.id).getSharingAccess() === 'ANYONE_WITH_LINK'));
ok('۴.۴ خودِ فایلِ صف هم اشتراک گرفت',
   (function () {
     const it = outFolder_().getFilesByName(String(CFG.VOICE_QUEUE_FILE));
     return it.hasNext() && it.next().getSharingAccess() === 'ANYONE_WITH_LINK';
   })());
/* در ماکت شناسهٔ فایل‌ها ساختگی است، پس وارسیِ جابه‌جاییِ شناسه برای هر
   بخشِ دیگری هم زنگ می‌زند. همان‌جا که فایل ساخته شد، پیکربندی را با آن
   جور می‌کنیم؛ بخشِ ۹ خودش عمداً خرابش می‌کند. */
const REAL_QID = CFG.VOICE_QUEUE_ID;
(function () {
  const it = outFolder_().getFilesByName(String(CFG.VOICE_QUEUE_FILE));
  if (it.hasNext()) CFG.VOICE_QUEUE_ID = it.next().getId();
})();
const key0 = q1.speakers[0].key;
vintLog_(hub, { key: key0, name: q1.speakers[0].name, step: VINT_ST.READY, result: 'ok' });
const q2 = vintQueue_(hub, vintScan_(), vintState_(hub));
ok('۴.۵ گویندهٔ «آماده» دیگر به صف نمی‌رود',
   q2.speakers.length === 1 && q2.speakers[0].key !== key0,
   'وگرنه هر شب ساعت‌ها آموزشِ بی‌ثمر، بی هیچ خطایی');
vintLog_(hub, { key: q2.speakers[0].key, name: q2.speakers[0].name,
                step: VINT_ST.GIVEUP, result: VINT_ST.GIVEUP });
ok('۴.۶ «رهاشده» هم به صف نمی‌رود',
   vintQueue_(hub, vintScan_(), vintState_(hub)).speakers.length === 0);
ok('۴.۷ شمارهٔ نسخهٔ صف بالا می‌رود', q2.rev > q1.rev);

console.log('\n══ ۵) تاشدنِ تاریخچه — «از کِی؟» فقط از تاریخچه درمی‌آید ══');
const K = 'spk-test';
vintLog_(hub, { key: K, name: 'آزمون', step: VINT_ST.SEEN, result: 'ok' });
vintLog_(hub, { key: K, name: 'آزمون', step: VINT_ST.TRAIN, result: VINT_ST.FAIL });
vintLog_(hub, { key: K, name: 'آزمون', step: VINT_ST.TRAIN, result: VINT_ST.FAIL });
vintLog_(hub, { key: K, name: 'آزمون', step: VINT_ST.MEASURE, result: 'ok', sim: '0.72' });
const st5 = vintState_(hub)[K];
ok('۵.۱ آخرین گام برنده است', st5.step === VINT_ST.MEASURE);
ok('۵.۲ تلاش‌های ناموفق شمرده می‌شوند', st5.tries === 2);
ok('۵.۳ آخرین عددِ سنجیده‌شده می‌مانَد', st5.sim === '0.72');
ok('۵.۴ ردیف‌های موفق و ناموفق هر دو ثبت شده‌اند',
   vintRows_(hub).filter(r => String(r[VC.KEY - 1]) === K).length === 4,
   'شکست هم تاریخچه است');

console.log('\n══ ۶) گامِ پایانی ══');
ok('۶.۱ آماده و رهاشده پایانی‌اند',
   vintIsDone_(VINT_ST.READY) && vintIsDone_(VINT_ST.GIVEUP));
ok('۶.۲ آموزش و سنجش پایانی نیستند',
   !vintIsDone_(VINT_ST.TRAIN) && !vintIsDone_(VINT_ST.MEASURE) &&
   !vintIsDone_(VINT_ST.FAIL));

console.log('\n══ ۷) خواندنِ پاسخ — و اعلامی که نباید برود ══');
const sent = [];
const realTg = global.tgSend_, realMq = global.mailQueue_;
global.tgSend_ = function (t) { sent.push(String(t)); return true; };
global.mailQueue_ = function (k, t, b) { sent.push(String(t)); return true; };
const realFetch = global.UrlFetchApp.fetch;
const feed = { rev: 3, speakers: {} };
global.UrlFetchApp.fetch = function (url) {
  if (String(url).indexOf('voices.json') !== -1) {
    return { getResponseCode: () => 200,
             getContentText: () => JSON.stringify(feed),
             getBlob: () => Utilities.newBlob('RIFF', 'audio/wav', 's.wav') };
  }
  return { getResponseCode: () => 200, getContentText: () => '# راهنما\n' + 'x'.repeat(200),
           getBlob: () => Utilities.newBlob('RIFF', 'audio/wav', 's.wav') };
};

feed.speakers['spk-pre'] = { name: 'از قبل آماده', stage: VINT_ST.READY,
                             preexisting: true, samples: [] };
let ing = vintIngest_(hub);
ok('۷.۱ گویندهٔ از‌قبل‌آماده ثبت می‌شود', vintState_(hub)['spk-pre'].step === VINT_ST.READY);
ok('۷.۲ ولی اعلامش نمی‌رود', sent.length === 0,
   'یک «✅ تازه آماده شد» برای هفتهٔ پیش، خبرِ دروغ است');

feed.speakers['spk-new'] = { name: 'گویندهٔ واقعاً تازه', stage: VINT_ST.READY,
                             similarity: '0.75', minutes: 44,
                             samples: ['docs/voice-samples/spk-new/نمونه-1.wav'] };
ing = vintIngest_(hub);
ok('۷.۳ گویندهٔ واقعاً تازه اعلام می‌شود', sent.length > 0 && ing.ready.length === 1);
ok('۷.۴ اعلام علامتِ ✅ دارد', sent.some(t => t.indexOf('✅') !== -1),
   'خواستهٔ صریحِ صاحبِ برنامه');
ok('۷.۵ اعلام می‌گوید هنوز روی پادکست نمی‌نشیند',
   sent.some(t => t.indexOf('پل') !== -1),
   'وگرنه همان «دستورِ کهنه» از روزِ اول');
ok('۷.۶ نمونه در پوشهٔ آزمونِ صدا نشست',
   (function () {
     const it = OUT.getFoldersByName(String(CFG.VOICE_AUDIT_FOLDER));
     if (!it.hasNext()) return false;
     const f = it.next().getFiles(); let n = 0;
     while (f.hasNext()) { if (String(f.next().getName()).indexOf('گویندهٔ تازه') === 0) n++; }
     return n > 0;
   })());
const before = sent.length;
vintIngest_(hub);
ok('۷.۷ همان پاسخ دوباره اعلام نمی‌شود', sent.length === before,
   'هر شب یک اعلامِ تکراری = اعلامی که خوانده نمی‌شود');

console.log('\n══ ۸) درخواستی که بی‌پاسخ بماند، خودش یافته است ══');
/* ۷٫۲۱ این را از `PK.VINT_QAT` می‌خواند و `vintQueue_` همان را هر شب
   دوباره مهر می‌زد، پس جواب همیشه صفر بود. آزمونِ قبلی سبز بود چون خودش
   دستی مقدارِ نُه‌روزه می‌نوشت — حالتی که موتورِ در حالِ اجرا هرگز به آن
   نمی‌رسد. حالا از تاریخچه خوانده می‌شود و آزمون هم از همان‌جا. */
const stuckHub = getHub_();
const ageRow = (days) => {
  const sh = vintTab_(stuckHub), last = sh.getLastRow();
  sh.getRange(last, VC.AT).setValue(
    new Date(Date.now() - days * 86400000).toISOString().replace('T', ' ').slice(0, 19));
};
const KS = 'spk-stuck';
vintLog_(stuckHub, { key: KS, name: 'منتظر', step: VINT_ST.SEEN, result: 'ok' });
ageRow(9);
ok('۸.۱ گویندهٔ ۹ روز بی‌حرکت شمرده می‌شود', vintStuckDays_(stuckHub) >= 8);
ok('۸.۲ و یک دورِ صف آن را صفر نمی‌کند',
   (function () { vintQueue_(stuckHub, vintScan_(), vintState_(stuckHub));
                  return vintStuckDays_(stuckHub) >= 8; })(),
   'باگِ ۷٫۲۱: زنگی که هر شب خودش را از نو کوک می‌کرد');
ok('۸.۳ و یافته ثبت می‌شود',
   (function () {
     const st = vintStatus_(stuckHub);
     return st.ok === false && vintStuckCheck_(stuckHub, st) === true;
   })());
vintLog_(stuckHub, { key: KS, name: 'منتظر', step: VINT_ST.READY, result: 'ok' });
ok('۸.۴ گامِ پایانی دیگر «گیرکرده» نیست', vintStuckDays_(stuckHub) === 0);

console.log('\n══ ۹) شناسهٔ صف — سکوتی که یک بار در این مخزن گران تمام شد ══');
const realQ = CFG.VOICE_QUEUE_ID;
CFG.VOICE_QUEUE_ID = 'ID-THAT-IS-NOT-THERE';
ok('۹.۱ شناسهٔ جابه‌جاشده گرفته می‌شود', vintQueueIdOk_().ok === false);
const stq = vintStatus_(hub);
ok('۹.۲ و در سطرِ روزانه صریح گفته می‌شود',
   stq.ok === false && stq.line.indexOf('شناسهٔ') !== -1);
ok('۹.۳ ولی سطر را نمی‌بلعد و شمارشِ گیرکردن را کور نمی‌کند',
   stq.line.indexOf('گویندهٔ تازه —') === 0 && typeof stq.stuckDays === 'number',
   'باگِ ۷٫۲۱: return زودهنگام، هم سطر را می‌خورد هم دروازهٔ گیرکردن را');
CFG.VOICE_QUEUE_ID = realQ;

console.log('\n══ ۱۰) سطرِ روزانه — هر روز، حتی وقتی هیچ خبری نیست ══');
const stAll = vintStatus_(hub);
ok('۱۰.۱ سطر همیشه هست', !!stAll.line && stAll.line.length > 10);
ok('۱۰.۲ گویندهٔ آماده شمرده می‌شود', stAll.ready >= 1);
ok('۱۰.۳ گوینده‌ای که فایل‌هایش رفته گم نمی‌شود',
   stAll.speakers.some(s => s.gone === true && s.step === VINT_ST.READY));
ok('۱۰.۴ فایلِ نامربوط در وضعیت می‌آید', stAll.bad >= 1);

console.log('\n══ ۱۱) بایگانی — پاک کردن ممنوع، و ترتیب مهم است ══');
const K2 = vintSlug_('رهاشده تست');
const fold2 = cf.createFolder('رهاشده تست');
const af = put(fold2, 'a.mp3', 1000);
vintQueue_(hub, vintScan_(), vintState_(hub));
ok('۱۱.۱ اول اشتراک باز شد',
   DriveApp.getFileById(af.getId()).getSharingAccess() === 'ANYONE_WITH_LINK');
vintLog_(hub, { key: K2, name: 'رهاشده تست', step: VINT_ST.READY, result: 'ok' });
// تاریخِ ردیف را عقب می‌بریم تا مهلت گذشته باشد
(function () {
  const sh = vintTab_(hub), last = sh.getLastRow();
  sh.getRange(last, VC.AT).setValue(
    new Date(Date.now() - 40 * 86400000).toISOString().replace('T', ' ').slice(0, 19));
})();
const ret = vintRetire_();
ok('۱۱.۲ اشتراک پس گرفته شد',
   DriveApp.getFileById(af.getId()).getSharingAccess() !== 'ANYONE_WITH_LINK');
ok('۱۱.۳ پوشه به بایگانی رفت، نه به سطلِ زباله',
   (function () {
     const arc = vintArchiveFolder_().getFoldersByName('رهاشده تست');
     return arc.hasNext() && ret.archived >= 1;
   })());
ok('۱۱.۴ و دیگر در پوشهٔ اصلی نیست',
   !vintScan_().speakers.some(s => s.name === 'رهاشده تست'));
ok('۱۱.۵ فایلش هنوز هست — چیزی پاک نشد',
   !!DriveApp.getFileById(af.getId()));
ok('۱۱.۶ بایگانی خودش گوینده شمرده نمی‌شود',
   !vintScan_().speakers.some(s => s.name === String(CFG.VOICE_CLONE_ARCHIVE)));

console.log('\n══ ۱۲) گویندهٔ در جریان بایگانی نمی‌شود ══');
const fold3 = cf.createFolder('در جریان');
put(fold3, 'b.mp3', 1000);
vintLog_(hub, { key: vintSlug_('در جریان'), name: 'در جریان', step: VINT_ST.TRAIN, result: 'ok' });
(function () {
  const sh = vintTab_(hub), last = sh.getLastRow();
  sh.getRange(last, VC.AT).setValue(
    new Date(Date.now() - 99 * 86400000).toISOString().replace('T', ' ').slice(0, 19));
})();
vintRetire_();
ok('۱۲.۱ هرچقدر هم کهنه، کارِ ناتمام بایگانی نمی‌شود',
   vintScan_().speakers.some(s => s.name === 'در جریان'),
   'وگرنه گوینده وسطِ آموزش ناپدید می‌شود');

console.log('\n══ ۱۳) راهنما در درایو — یک نسخه، از گیت ══');
ok('۱۳.۱ راهنما نوشته شد', vintGuideSync_().ok === true);
ok('۱۳.۲ و دو نسخهٔ هم‌نام نمی‌مانَد',
   (function () {
     vintGuideSync_(); vintGuideSync_();
     const it = clone().getFilesByName(String(CFG.VOICE_GUIDE_FILE));
     let n = 0; while (it.hasNext()) { it.next(); n++; }
     return n === 1;
   })(), 'همان دامِ dups');

global.UrlFetchApp.fetch = realFetch;
global.tgSend_ = realTg; global.mailQueue_ = realMq;

console.log('\n══ ۱۶) هویتِ گوینده — دو نفر هرگز یکی نشوند، یک نفر هرگز دو تا ══');
ok('۱۶.۱ تکهٔ لاتینِ مشترک دو نفر را یکی نمی‌کند',
   vintSlug_('سارا 01') !== vintSlug_('نیما 01') &&
   vintSlug_('مریم احمدی (mp3)') !== vintSlug_('علی رضایی (mp3)'),
   'باگِ ۷٫۲۱: هر دو کلیدِ «01» می‌گرفتند — یک مدل روی دو صدا');
ok('۱۶.۲ نیم‌فاصله/ي عربی/ك عربی/فاصلهٔ دوتایی یک نفرند',
   [['بهروز', 'رضوی'].join('\u200c'), 'بهروز رضوي', 'بهروز  رضوی', ' بهروز رضوی ']
     .every(v => vintSlug_(v) === vintSlug_('بهروز رضوی')),
   'وگرنه یک نفر چند بار آموزش می‌دید و چند بار ✅ می‌گرفت');
ok('۱۶.۳ کلیدِ بذرِ رضوی همان می‌مانَد', vintSlug_('بهروز رضوی') === 'spk-19iuegd',
   'docs/voices.json به همین کلید بسته است');
ok('۱۶.۴ دو نامِ لاتینِ بلند که تا ۴۰ نویسه یکی‌اند، دو کلیدند',
   vintSlug_('a'.repeat(45) + 'x') !== vintSlug_('a'.repeat(45) + 'y'));
ok('۱۶.۵ نامِ لاتین هنوز خوانا می‌مانَد', vintSlug_('Ali Rezaei') === 'ali-rezaei');

console.log('\n══ ۱۷) پاسخِ بدشکل — خبرِ دروغ ممنوع ══');
const said = [];
// هر اعلام دو پیام می‌سازد (ایمیل + تلگرام)، پس شمردنِ پیام‌ها شمردنِ
// اعلام‌ها نیست. عنوانِ ایمیل دقیقاً یکی به ازای هر اعلام است.
const announces = () => said.filter(t => t.indexOf('✅ گویندهٔ تازه آماده شد:') === 0 &&
                                         t.indexOf('\n') === -1).length;
const tgB = global.tgSend_, mqB = global.mailQueue_, ufB = global.UrlFetchApp.fetch;
global.tgSend_ = t => { said.push(String(t)); return true; };
global.mailQueue_ = (k, t) => { said.push(String(t)); return true; };
let doc17 = null;
global.UrlFetchApp.fetch = url => String(url).indexOf('voices.json') !== -1
  ? { getResponseCode: () => 200, getContentText: () => JSON.stringify(doc17) }
  : { getResponseCode: () => 200, getContentText: () => '# g\n' + 'x'.repeat(300),
      getBlob: () => Utilities.newBlob('RIFF', 'audio/wav', 's.wav') };
const h17 = getHub_();
doc17 = { rev: 1, speakers: [{ name: 'phantom', stage: VINT_ST.READY }] };
const r17 = vintIngest_(h17);
ok('۱۷.۱ speakers آرایه‌ای رد می‌شود', r17.seen === 0 && !!r17.error,
   'باگِ ۷٫۲۱: گویندهٔ خیالیِ «۰» ساخته می‌شد و ✅ اعلام می‌شد');
// یافتهٔ «شکلِ پاسخ غلط است» خودش هشدار دارد و باید داشته باشد؛ آنچه
// نباید برود، خبرِ دروغِ «گویندهٔ تازه آماده شد» است.
ok('۱۷.۲ و هیچ «✅ آماده»ی دروغی نمی‌رود',
   !said.some(t => t.indexOf('گویندهٔ تازه آماده شد') !== -1),
   'باگِ ۷٫۲۱: اندیسِ آرایه گویندهٔ خیالی می‌ساخت و ✅ اعلام می‌شد');
doc17 = { rev: 2, speakers: { k1: { name: 'ع', stage: 7 } } };
vintIngest_(h17);
ok('۱۷.۳ گامِ ناشناس «ناموفق» می‌شود، نه یک گامِ تازه',
   vintState_(h17)['k1'].step === VINT_ST.FAIL,
   'وگرنه «۷» پایانی نبود و تا ابد هر شب دوباره به صف می‌رفت');
ok('۱۷.۴ و تلاش شمرده می‌شود، پس بالاخره رها می‌شود',
   (function () {
     for (let i = 0; i < 4; i++) {
       doc17 = { rev: 3 + i, speakers: { k1: { name: 'ع', stage: 7, runId: 'r' + i } } };
       vintIngest_(h17);
     }
     return vintState_(h17)['k1'].step === VINT_ST.GIVEUP;
   })());

console.log('\n══ ۱۸) اعلام — نه دو بار، نه هرگز ══');
doc17 = { rev: 40, speakers: { k2: { name: 'تازه', stage: VINT_ST.READY, samples: [] } } };
vintIngest_(h17);
const n18 = announces();
ok('۱۸.۱ گویندهٔ تازه اعلام می‌شود', n18 === 1);
vintIngest_(h17); vintIngest_(h17);
ok('۱۸.۲ و دوباره نمی‌شود', announces() === n18);
// ردیف هست ولی told پاک شده — همان چیزی که یک اجرای کشته‌شده می‌سازد
props_().deleteProperty(PK.VINT_TOLD);
vintIngest_(h17);
ok('۱۸.۳ ردیفِ آمادهٔ بی‌اعلام، اعلام می‌شود', announces() === n18 + 1,
   'باگِ ۷٫۲۱: told پس از حلقه ذخیره می‌شد، پس یک اجرای کشته‌شده ' +
   'گویندهٔ آماده را برای همیشه بی‌اعلام می‌گذاشت');
props_().setProperty(PK.VINT_TOLD, '[1,2,3]');
const n18b = announces();
vintIngest_(h17); vintIngest_(h17);
ok('۱۸.۴ told خراب نگهبان را از کار نمی‌اندازد', announces() === n18b + 1,
   'یک آرایه از `|| {}` رد می‌شد و هر شب همان خبر می‌رفت');
global.mailQueue_ = () => false; global.tgSend_ = () => { throw new Error('down'); };
props_().deleteProperty(PK.VINT_TOLD);
doc17 = { rev: 50, speakers: { k3: { name: 'سوم', stage: VINT_ST.READY, samples: [] } } };
vintIngest_(h17);
let told3 = {}; try { told3 = JSON.parse(props_().getProperty(PK.VINT_TOLD) || '{}'); } catch (e) {}
ok('۱۸.۵ خبری که نرفت، «رفته» علامت نمی‌خورد', !told3['k3'],
   'CLAUDE.md: صفِ ایمیل را رسیده فرض نکن — run_v43_tests ۱۹');
global.tgSend_ = tgB; global.mailQueue_ = mqB;

console.log('\n══ ۱۹) قطعیِ درایو ≠ پوشهٔ خالی ══');
const realScan = global.vintScan_;
global.vintScan_ = () => ({ speakers: [], bad: [], error: 'Drive rate limit' });
const st19 = vintStatus_(h17);
ok('۱۹.۱ خطا در سطرِ روزانه دیده می‌شود',
   st19.ok === false && st19.line.indexOf('خوانده نشد') !== -1);
const before19 = (vintReadQueue_() || {}).rev || 0;
vintNightly_(true);
ok('۱۹.۲ و صف با «هیچ‌کس نیست» بازنویسی نمی‌شود',
   ((vintReadQueue_() || {}).rev || 0) === before19,
   'وگرنه اکشن می‌شنود کسی در نوبت نیست');
global.vintScan_ = realScan;
global.UrlFetchApp.fetch = ufB;

console.log('\n══ ۲۰) رضویِ از‌قبل‌آماده بایگانی و بی‌اشتراک نمی‌شود ══');
/* نمونه‌هایش همان هشت ضبطی‌اند که voicetrain.py و voice-lab.yml ناشناس
   برمی‌دارند؛ پس گرفتنِ اشتراکشان یعنی هر آموزش و هر سنجش از کار بیفتد. */
const cfK = vintCloneFolder_();
const rzFold = cfK.createFolder('بهروز رضوی');
const rzFile = rzFold.createFile('ضبط ۱.mp3', 'x'.repeat(999), 'audio/mpeg');
const docsJson = JSON.parse(fs.readFileSync('docs/voices.json', 'utf8'));
global.UrlFetchApp.fetch = url => String(url).indexOf('voices.json') !== -1
  ? { getResponseCode: () => 200, getContentText: () => JSON.stringify(docsJson) }
  : { getResponseCode: () => 404, getContentText: () => '' };
ok('۲۰.۱ بذر با کلیدی است که پوشه تولید می‌کند',
   !!docsJson.speakers[vintSlug_('بهروز رضوی')],
   'کلیدِ ناجور یعنی رضوی گویندهٔ تازه دیده می‌شود و ۲۴۰ دقیقه دوباره آموزش می‌بیند');
vintQueue_(h17, vintScan_(), vintState_(h17));
vintIngest_(h17);
(function () {
  const sh = vintTab_(h17), last = sh.getLastRow();
  sh.getRange(last, VC.AT).setValue(
    new Date(Date.now() - 60 * 86400000).toISOString().replace('T', ' ').slice(0, 19));
})();
vintRetire_();
ok('۲۰.۲ اشتراکش پس گرفته نمی‌شود',
   DriveApp.getFileById(rzFile.getId()).getSharingAccess() === 'ANYONE_WITH_LINK',
   'باگِ ۷٫۲۱: شبِ یازدهم پس از نصب، هر آموزش و سنجش خاموش می‌شد');
ok('۲۰.۳ و پوشه‌اش بایگانی نمی‌شود',
   vintScan_().speakers.some(x => x.name === 'بهروز رضوی'));
global.UrlFetchApp.fetch = ufB;

console.log('\n══ ۲۱) ترتیبِ تاریخچه از ستونِ زمان می‌آید، نه از جای ردیف ══');
const h21 = getHub_(), K21 = 'spk-order';
const sh21 = vintTab_(h21);
sh21.appendRow(['2026-09-19 10:00:00', K21, 'ترتیب', VINT_ST.READY, 'ok', 1, '', '', '', '']);
sh21.appendRow(['2026-09-01 10:00:00', K21, 'ترتیب', VINT_ST.TRAIN, 'ok', 1, '', '', '', '']);
ok('۲۱.۱ تازه‌ترین زمان برنده است، نه آخرین ردیف',
   vintState_(h21)[K21].step === VINT_ST.READY,
   'مرتب‌کردنِ یک تبِ انسانی نباید گامِ همه را عوض کند — و نباید ' +
   'گوینده‌ای را وسطِ آموزش بایگانی کند');

console.log('\n══ ۱۴) واژه‌ها در دو طرفِ مرز یکی‌اند ══');
const py = fs.readFileSync('tools/voiceintake.py', 'utf8');
for (const [k, v] of Object.entries(VINT_ST)) {
  ok('۱۴ «' + v + '» در هر دو طرف هست', py.indexOf('"' + v + '"') !== -1,
     'موتور و اکشن با یک واژه حرف می‌زنند، وگرنه حالت هرگز جلو نمی‌رود');
}

console.log('\n══ ۱۵) پیکربندیِ صف با گردش‌کار جور است ══');
const wf = fs.readFileSync('.github/workflows/voice-intake.yml', 'utf8');
ok('۱۵.۱ شناسهٔ صف در هر دو جا یکی است',
   wf.indexOf(String(REAL_QID)) !== -1,
   'دو شناسهٔ متفاوت = صفی که هیچ‌وقت خوانده نمی‌شود، بی هیچ خطایی');
const trainWf = fs.readFileSync('.github/workflows/voice-train.yml', 'utf8');
ok('۱۵.۲ نامِ artifact به گوینده بسته است',
   trainWf.indexOf("name: voice-${{ github.event.inputs.voice") !== -1);
ok('۱۵.۳ کلیدِ کش هم به گوینده بسته است',
   trainWf.indexOf("key: rvc-${{ github.event.inputs.voice") !== -1,
   'وگرنه دیتاستِ یک نفر برای نفرِ دیگر «موجود» شمرده می‌شود');
ok('۱۵.۴ آزمایشگاه هم نامِ artifact را ثابت ننوشته',
   fs.readFileSync('.github/workflows/voice-lab.yml', 'utf8')
     .indexOf('-n voice-razavi ') === -1,
   'قرینه‌ای که یک بار درست شود، یک بار درست شده');
const vt = fs.readFileSync('tools/voicetrain.py', 'utf8');
ok('۱۵.۵ اثرِ انگشتِ دیتاست کلیدِ گوینده را در خود دارد',
   /raw = \("v%d\|" % DS_SIG_VER\) \+ VOICE/.test(vt),
   'خطرناک‌ترین باگِ ممکنِ این خط');

console.log('\n══ ۲۲) اشتراکِ صف — نیمهٔ دومِ همان سؤالی که ۹ می‌پرسد ══');
/* شناسه درست بود، فایل سرِ جایش بود، و اکشن باز هم چیزی نگرفت: درایو
   برای فایلِ بی‌اشتراک HTML می‌دهد نه خطا. چهار اجرا پشتِ‌هم قرمز شد و
   موتور هیچ‌جا نگفت چرا. */
const qname = CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json';
const qfile = () => { const it = outFolder_().getFilesByName(qname); return it.hasNext() ? it.next() : null; };
vintQueue_(hub, vintScan_(), vintState_(hub));
ok('۲۲.۱ کارِ شبانه خودش اشتراکِ صف را باز می‌گذارد',
   String(qfile().getSharingAccess()) === String(DriveApp.Access.ANYONE_WITH_LINK));
ok('۲۲.۲ و وقتی باز است، خبری نیست', vintQueueShare_().ok === true);

qfile().setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
const qs = vintQueueShare_();
ok('۲۲.۳ بسته‌بودن گرفته می‌شود', qs.ok === false);
ok('۲۲.۴ و همان‌جا باز می‌شود، نه اینکه فقط گزارش شود',
   qs.fixed === true &&
   String(qfile().getSharingAccess()) === String(DriveApp.Access.ANYONE_WITH_LINK),
   'دری که آدم باید دستی بازش کند، در نیست');

qfile().setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
const stSh = vintStatus_(hub);
ok('۲۲.۵ و در سطرِ روزانه گفته می‌شود', stSh.line.indexOf('اشتراکِ') !== -1);
ok('۲۲.۶ سطر را نمی‌بلعد و شمارشِ گیرکردن را کور نمی‌کند',
   stSh.line.indexOf('گویندهٔ تازه') === 0 && typeof stSh.stuckDays === 'number',
   'باگِ ۷٫۲۱، این بار روی نیمهٔ دوم');
ok('۲۲.۷ بسته‌بودنی که اصلاح شد سلامت را باطل نمی‌کند',
   stSh.queueShare && stSh.queueShare.fixed === true,
   'هشداری که برای کارِ درست‌شده بیاید، هشداری است که خوانده نمی‌شود');

/* و وقتی **نشود** بازش کرد، سلامت باید باطل شود — وگرنه این وارسی
   فقط یک جملهٔ تزئینی است. */
const realShare = DriveApp.getFileById;
qfile().setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
DriveApp.getFileById = function (id) { throw new Error('درایو نه'); };
const qsFail = vintQueueShare_();
DriveApp.getFileById = realShare;
ok('۲۲.۸ باز نشدن ⇒ ok=false و دلیلش همراهش',
   qsFail.ok === false && qsFail.fixed === false && !!qsFail.error);

console.log('\n══ ۲۳) روحِ خواندن — کارتِ سبک به ردیفِ خاموش تبدیل می‌شود ══');
/* صاحبِ برنامه «روح و رنگش» را خواست و تا ۷٫۳۴ فقط رنگ کلون می‌شد. */
const cardCue = 'آرام و روایی بخوان: حدودِ 59 درصدِ زمان حرف بزن.';
const cardModes = 'روان و کشیده |  | بلندتر یک‌نفس برو.';
const mk = personaAddFromCard_('spk-test1', 'گویندهٔ آزمایشی',
                               { cue: cardCue, modes: cardModes });
ok('۲۳.۱ ردیف ساخته می‌شود', mk === true);
const prow = personaRows_(personaTab_()).filter(r => String(r[PC.KEY - 1]) === 'spk-test1')[0];
ok('۲۳.۲ و **خاموش** است', prow && String(prow[PC.ON - 1]) === 'خیر',
   'ردیفِ روشن یعنی خوانشِ هر قسمت همان شب عوض می‌شود بی آنکه کسی خواسته باشد');
ok('۲۳.۳ دستورِ سبک در سلول نشست', String(prow[PC.STYLE - 1]) === cardCue);

/* حالتِ بی‌برچسب باید **پارس شود** ولی **هرگز انتخاب نشود**. اگر پارس
   نشود کلِ حالت بی‌صدا دور ریخته می‌شود؛ اگر انتخاب شود، حدس است. */
const pm = personaModes_(String(prow[PC.MODES - 1]));
ok('۲۳.۴ حالتِ بی‌برچسب پارس می‌شود', pm.length === 1 && pm[0].keys.length === 0);
ok('۲۳.۵ و هیچ وایبی انتخابش نمی‌کند',
   personaModePick_(pm, 'سوگ و معنوی و تعلیق') === null,
   'تنزل به سمتِ دستورِ پایه، نه به سمتِ حدس');

ok('۲۳.۶ ردیفِ موجود دوباره ساخته/بازنویسی نمی‌شود',
   personaAddFromCard_('spk-test1', 'نامِ دیگر', { cue: 'دستورِ دیگر', modes: '' }) === false &&
   String(personaRows_(personaTab_()).filter(r => String(r[PC.KEY-1])==='spk-test1')[0][PC.STYLE-1]) === cardCue,
   'ستونِ دستور جایی است که او با دست تنظیمش می‌کند');
ok('۲۳.۷ کارتِ بی‌دستور ردیف نمی‌سازد',
   personaAddFromCard_('spk-empty', 'خالی', { cue: '   ', modes: 'x |  | y' }) === false,
   'کارتی که از هیچ ساخته شده شبیهِ اندازه‌گیری است و بدتر از نبودنش');

const made = personaSyncCards_({
  'spk-a': { name: 'الف', style: { cue: 'دستورِ الف', modes: '' } },
  'spk-b': { name: 'ب' },                                  // بی کارت
  'spk-test1': { name: 'تکراری', style: { cue: 'x', modes: '' } }
});
ok('۲۳.۸ همگام‌سازی فقط کارت‌دارهای تازه را می‌سازد',
   made.length === 1 && made[0] === 'الف', 'گرفت: ' + JSON.stringify(made));

console.log('\n══ ۲۴) تختهٔ شیوهٔ خواندن — جایی که بشود گوینده را انتخاب کرد ══');
/* «انتخاب صدای گوینده برای پادکست رو در منو کدوم گزینه میشه انتخاب کرد؟»
   ــ ۲۰ سپتامبر. جوابِ آن روز «هیچ گزینه‌ای» بود. */
const bd = personaBoardData_();
ok('۲۴.۱ تخته ردیف‌ها را از همان تب می‌خوانَد',
   bd.rows.length >= 1 && bd.rows.some(r => r.key === 'spk-test1'));
ok('۲۴.۲ و نامِ برنامه‌ها را از knownShows_ می‌گیرد، نه از فهرستی دستی',
   bd.shows.length === knownShows_().length);

const bSave = personaBoardSave_('spk-test1', true, [knownShows_()[0].name], 2,
                                'دستورِ تازه', 'حالت | سوگ | آرام بخوان');
ok('۲۴.۳ ذخیره می‌شود', bSave.ok === true);
const after = personaBoardData_().rows.filter(r => r.key === 'spk-test1')[0];
ok('۲۴.۴ و همان سلول‌هایی را می‌نویسد که personaFor_ می‌خوانَد',
   after.on === true && after.every === 2 && after.cue === 'دستورِ تازه',
   'مدلِ داده دست نخورد، پس آزمونِ personaFor_ همچنان نگهبانش است');
/* و اثباتش با خودِ دروازه، نه با بازخوانیِ تخته. */
const chosen = personaFor_(knownShows_()[0].name, 2);
ok('۲۴.۵ دروازه همان را برمی‌دارد',
   chosen && chosen.key === 'spk-test1' && chosen.cue === 'دستورِ تازه');
ok('۲۴.۶ و نوبت را رعایت می‌کند', personaFor_(knownShows_()[0].name, 3) === null,
   'هر ۲ قسمت یک بار یعنی قسمتِ ۳ نه');

/* دو در که اگر باز بمانند، آدم فکر می‌کند روشنش کرده و نیست. */
ok('۲۴.۷ روشن بی هیچ برنامه‌ای رد می‌شود',
   personaBoardSave_('spk-test1', true, [], 1, 'x', '').ok === false,
   'فهرستِ خالی یعنی «نمی‌دانم کجا»، و حدسش هر دو جهت غلط است');
ok('۲۴.۸ روشن با دستورِ خالی هم رد می‌شود',
   personaBoardSave_('spk-test1', true, [knownShows_()[0].name], 1, '   ', '').ok === false,
   'موتور چنین ردیفی را بی‌صدا کنار می‌گذارد');
ok('۲۴.۹ کلیدِ ناشناس ذخیره نمی‌شود',
   personaBoardSave_('nope', true, [knownShows_()[0].name], 1, 'x', '').ok === false);

/* هر قسمت یک صدا؛ اگر تخته نگوید، کسی که دو ردیف را روشن می‌کند
   منتظرِ چیزی می‌مانَد که هرگز نمی‌آید. */
personaAddFromCard_('spk-two', 'دومی', { cue: 'دستورِ دوم', modes: '' });
personaBoardSave_('spk-two', true, [knownShows_()[0].name], 1, 'دستورِ دوم', '');
personaBoardSave_('spk-test1', true, [knownShows_()[0].name], 1, 'دستورِ تازه', '');
ok('۲۴.۱۰ دو ردیفِ روشن هشدار می‌گیرد',
   /یک/.test(personaBoardData_().note || ''), 'گرفت: ' + personaBoardData_().note);

console.log('\n══ ۲۵) «موردی» — همین یک قسمت، نه هر nاُمین ══');
/* ══ خواستهٔ صاحبِ برنامه، ۲۰ سپتامبر، عیناً ══
   «بتونم … چه به صورتِ **دائم یا موردی** از صدایی که استفاده کردیم
   استفاده کنم». آنچه ساخته شده بود فقط «هر چند قسمت» بود — دوره‌ای، نه
   موردی. «این قسمتِ خاص را با صدای او بساز» هیچ راهی نداشت.
   هر سنجهٔ اینجا از **خودِ دروازه** می‌پرسد، نه از بازخوانیِ تخته: تخته‌ای
   که با خودش موافق باشد چیزی را ثابت نمی‌کند (درسِ ۷٫۳۵). */
const SHOW0 = knownShows_()[0].name;
{
  // ردیف را **خاموش** کن — نکتهٔ اصلی همین است.
  personaBoardSave_('spk-two', false, [], 1, 'دستورِ دوم', '');
  personaBoardSave_('spk-test1', false, [], 1, 'دستورِ تازه', '');
  ok('۲۵.۱ با هر دو ردیفِ خاموش، هیچ صدایی انتخاب نمی‌شود',
     personaFor_(SHOW0, 47) === null);

  const r = personaBoardSave_('spk-test1', false, [], 1, 'دستورِ تازه', '', '۴۷');
  ok('۲۵.۲ «موردی» روی ردیفِ خاموش ذخیره می‌شود',
     r.ok === true && r.onceCount === 1, r.why || '');
  const g = personaFor_(SHOW0, 47);
  ok('۲۵.۳ و قسمتِ ۴۷ صدا می‌گیرد، با اینکه ردیف خاموش است',
     !!g && g.key === 'spk-test1' && g.once === true,
     'وگرنه «موردی» چیزی جز «دائم» نبود: برای یک قسمت باید روشنش می‌کرد');
  ok('۲۵.۴ ولی قسمتِ ۴۸ نمی‌گیرد', personaFor_(SHOW0, 48) === null);
  /* ══ این قفل دو لایه دارد، پس سنجه به لایه‌ای می‌خورَد که واقعاً کار
     می‌کند ══
     اولش نوشته بودم «شمارهٔ نامعلوم نمی‌گیرد» و با شکستنِ نگهبانِ
     `e > 0` سبز ماند — چون مقایسهٔ بازه هم صفر را رد می‌کند. سنجه‌ای که
     نتواند بیفتد از سنجهٔ نبوده بدتر است (۷٫۳۹)، پس به خودِ خواننده
     می‌خورَد: هیچ ورودی‌ای نباید بازه‌ای بسازد که از صفر شروع شود. */
  ok('۲۵.۵ ورودیِ صفر اصلاً وارد نمی‌شود',
     personaOnceParse_('۰').items.length === 0 &&
     personaOnceParse_('۰').bad.length === 1,
     'وگرنه بازهٔ ۰..۰ ساخته می‌شد و قسمتِ بی‌شماره صدای مهمان می‌گرفت');
  ok('۲۵.۵-ب و رفتارِ بیرونی هم همان است', personaFor_(SHOW0, 0) === null,
     'دو قفل روی یک در، عمدی');
}
{
  // بازه، رقمِ لاتین، و نامِ برنامه
  personaBoardSave_('spk-test1', false, [], 1, 'دستورِ تازه', '', '50 تا 52');
  ok('۲۵.۶ بازه کار می‌کند و رقمِ لاتین هم',
     !!personaFor_(SHOW0, 51) && personaFor_(SHOW0, 53) === null);
  personaBoardSave_('spk-test1', false, [], 1, 'دستورِ تازه', '',
                    SHOW0 + ' ۶۰');
  ok('۲۵.۷ ورودیِ نام‌دار فقط به همان برنامه می‌خورَد',
     !!personaFor_(SHOW0, 60) && personaFor_('برنامهٔ دیگری', 60) === null);
}
{
  // اولویت: موردی بر دائم
  personaBoardSave_('spk-two', true, [SHOW0], 1, 'دستورِ دوم', '');
  personaBoardSave_('spk-test1', false, [], 1, 'دستورِ تازه', '', '۷۰');
  const g70 = personaFor_(SHOW0, 70), g71 = personaFor_(SHOW0, 71);
  ok('۲۵.۸ «موردی» بر «دائم» مقدم است',
     !!g70 && g70.key === 'spk-test1' && g70.once === true,
     'مشخص‌تر برنده است: این دربارهٔ همین یک قسمت است، آن دربارهٔ همه');
  ok('۲۵.۹ ولی قسمتِ دیگر همان صدای دائمی را می‌گیرد',
     !!g71 && g71.key === 'spk-two' && !g71.once,
     'وگرنه «موردی» صدای دائمی را هم خاموش کرده بود');
  personaBoardSave_('spk-two', false, [], 1, 'دستورِ دوم', '');
}
{
  // درهایی که اگر باز بمانند، او فکر می‌کند تنظیم کرده و نکرده
  ok('۲۵.۱۰ خطِ ناخوانا ذخیره **نمی‌شود** و خودش نام برده می‌شود',
     (function () {
       const r = personaBoardSave_('spk-test1', false, [], 1, 'x', '', 'قسمتِ آخر');
       return r.ok === false && String(r.why || '').indexOf('قسمتِ آخر') !== -1;
     })(),
     'اینجا برعکسِ «حالت‌ها»: خطِ گم‌شده یعنی قسمتی که او خواسته و نمی‌گیرد');
  ok('۲۵.۱۱ و «موردی با دستورِ سبکِ خالی» هم رد می‌شود',
     personaBoardSave_('spk-test1', false, [], 1, '  ', '', '۹۰').ok === false,
     'موتور چنین ردیفی را کنار می‌گذارد، پس پذیرفتنش یعنی یک باورِ غلط');
  /* و ستون در **انتها** نشست: وگرنه `ensureTab_` فقط سرصفحه را بازنویسی
     می‌کند و برچسبِ تازه روی دادهٔ قدیمی می‌نشیند، بی هیچ خطایی. */
  ok('۲۵.۱۲ ستونِ تازه انتهای فهرست است',
     PERSONA_HEADERS[PERSONA_HEADERS.length - 1] === 'قسمت‌های موردی' &&
     PC.ONCE === PERSONA_HEADERS.length);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
