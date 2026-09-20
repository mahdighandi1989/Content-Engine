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
props_().setProperty(PK.VINT_QAT, new Date(Date.now() - 9 * 86400000).toISOString());
props_().deleteProperty(PK.VINT_RAT);
ok('۸.۱ روزهای بی‌پاسخ شمرده می‌شود', vintStuckDays_() >= 8);
props_().setProperty(PK.VINT_RAT, new Date().toISOString());
ok('۸.۲ پاسخِ تازه‌تر یعنی گیر نکرده', vintStuckDays_() === 0);

console.log('\n══ ۹) شناسهٔ صف — سکوتی که یک بار در این مخزن گران تمام شد ══');
const realQ = CFG.VOICE_QUEUE_ID;
CFG.VOICE_QUEUE_ID = 'ID-THAT-IS-NOT-THERE';
ok('۹.۱ شناسهٔ جابه‌جاشده گرفته می‌شود', vintQueueIdOk_().ok === false);
const stq = vintStatus_(hub);
ok('۹.۲ و در سطرِ روزانه صریح گفته می‌شود',
   stq.ok === false && stq.line.indexOf('شناسهٔ') !== -1);
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

console.log('\n══ ۱۴) واژه‌ها در دو طرفِ مرز یکی‌اند ══');
const py = fs.readFileSync('tools/voiceintake.py', 'utf8');
for (const [k, v] of Object.entries(VINT_ST)) {
  ok('۱۴ «' + v + '» در هر دو طرف هست', py.indexOf('"' + v + '"') !== -1,
     'موتور و اکشن با یک واژه حرف می‌زنند، وگرنه حالت هرگز جلو نمی‌رود');
}

console.log('\n══ ۱۵) پیکربندیِ صف با گردش‌کار جور است ══');
const wf = fs.readFileSync('.github/workflows/voice-intake.yml', 'utf8');
ok('۱۵.۱ شناسهٔ صف در هر دو جا یکی است',
   wf.indexOf(String(CFG.VOICE_QUEUE_ID)) !== -1,
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

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
