/* پلِ رنگِ صدا — بخشِ ۳۶.
 *
 * چرا آزمونِ سخت‌گیر: هر خرابیِ این بخش یا **بی‌صداست** یا **برگشت‌ناپذیر**.
 *   • اگر فایلِ برگشته WAV نباشد و بنشیند، یک روز سکوت پخش می‌شود.
 *   • اگر اصل جایش را به تبدیل بدهد، فایلِ اصلی رفته و برنمی‌گردد.
 *   • اگر اشتراکِ موقت پس گرفته نشود، صوتِ قسمت برای همیشه عمومی می‌مانَد.
 *   • اگر سقفِ صف «منتظرِ برداشت» را هم بشمرد، یک شکست صف را تا ابد قفل
 *     می‌کند و از بیرون همه‌چیز سالم به نظر می‌رسد (۶٫۳۷).
 * هیچ‌کدام خطا نمی‌دهند.
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
/* ══ بذرهای واقعی کنار گذاشته می‌شوند (۸٫۲۵) ══
   تا ۸٫۲۴ بذرها به قسمتِ ۵۳ اشاره می‌کردند که در این آزمون پوشه ندارد، پس
   `vbrSoulPick_` بی‌صدا ردشان می‌کرد و هر بخشی که تیکِ او را می‌سنجید، تصادفاً
   از دستشان در امان بود. از ۸٫۲۵ به متنِ آزمون اشاره می‌کنند و **همیشه** پیدا
   می‌شوند — پس هر سنجه‌ای که دربارهٔ تیک است، بی‌آنکه بخواهد بذر را می‌سنجید.
   فهرستِ واقعی این‌جا نگه داشته می‌شود و فقط جایی به کار می‌رود که خودِ آن
   فهرست موضوعِ سنجه است (۳۳.۲) یا متنِ آزمون (§۳۷). */
const REAL_SOUL_SEED = CFG.VOICE_SOUL_SEED;
CFG.VOICE_SOUL_SEED = [];
const hub = getHub_();

// صوتِ قسمت، در یک پوشهٔ ساختگی
const epFold = OUT.createFolder('قسمت آزمایشی');
const wav = (name, n) => epFold.createFile(name, 'x'.repeat(n || 5000), 'audio/wav');
wav('قسمت ۱ — کامل.wav', 9000);

// بذرِ مدل، بیرونِ OUTPUT
const outsideFolder = DriveApp.__register('FOLD-OUTSIDE', 'voice-models-test');
const seedPth = outsideFolder.createFile('razavi-e32.pth', 'PTH', 'application/octet-stream');
const seedIdx = outsideFolder.createFile('razavi-e32.index', 'IDX', 'application/octet-stream');
CFG.VBR_SEED_MODELS = { razavi: { pth: seedPth.getId(), index: seedIdx.getId() } };

console.log('\n══ ۱) مدل — کپی در OUTPUT، نه دست‌بردن بیرونش ══');
/* پوشهٔ مدل‌ها بیرونِ OUTPUT است و قاعدهٔ اولِ این مخزن می‌گوید نوشتن فقط
   در OUTPUT. عوض کردنِ اشتراکِ فایلی آنجا هم دست‌بردن در جای ممنوع است. */
const m1 = vbrModel_('razavi');
ok('۱.۱ مدل آماده می‌شود', m1.ok === true, m1.why || '');
ok('۱.۲ کپی زیرِ OUTPUT نشست',
   vbrFolder_().getFilesByName('razavi.pth').hasNext());
ok('۱.۳ و اشتراکِ فایلِ **بیرونِ** OUTPUT دست نخورد',
   String(seedPth.getSharingAccess()) !== String(DriveApp.Access.ANYONE_WITH_LINK),
   'کپی‌گرفتن خواندنِ آنجا و نوشتنِ اینجاست؛ اشتراک‌دادن نه');
ok('۱.۴ ولی کپی گشوده شد', String(
   vbrFolder_().getFilesByName('razavi.pth').next().getSharingAccess()) ===
   String(DriveApp.Access.ANYONE_WITH_LINK));
/* ══ «دلیلش را می‌گوید» کافی نیست؛ باید بگوید چه باید کرد (۷٫۷۵) ══
   این حالت **حالتِ عادیِ گویندهٔ دوم** است: مدل در artifactِ گیت‌هاب مانده و
   موتور نمی‌تواند برش دارد (artifact از بیرونِ Actions دانلود نمی‌شود و
   `UrlFetchApp` سقفِ ۵۰ مگابایت دارد). پس یک بار دستی لازم است، و پیام باید
   نامِ **دقیقِ** دو فایل را بدهد — نامِ اشتباه یعنی یک شکستِ بی‌صدای دیگر.
   نگارشِ پیشینِ این سنجه واژهٔ «بذر» را می‌جست، یعنی نگارشِ پیام را می‌سنجید
   نه ادعایش را. */
{
  const wN = vbrModel_('nobody');
  ok('۱.۵ گویندهٔ بی‌مدل، نامِ دقیقِ فایل‌های لازم را می‌دهد',
     wN.ok === false &&
     wN.why.indexOf('nobody.pth') !== -1 && wN.why.indexOf('nobody.index') !== -1 &&
     wN.why.indexOf(String(CFG.VBR_FOLDER || 'مدل‌های صدا')) !== -1,
     wN.why);
}
/* نامِ کپی کلیدِ گوینده را دارد — دو گوینده با یک نامِ فایل همان باگی است
   که ۷٫۲۱ در dsSig_ گرفت: مدلِ یکی برای دیگری «موجود» شمرده می‌شود. */
ok('۱.۶ نامِ کپی کلیدِ گوینده را دارد',
   !vbrFolder_().getFilesByName('razavi-e32.pth').hasNext(),
   'وگرنه مدلِ یکی برای دیگری «موجود» شمرده می‌شود، بی هیچ خطایی');

console.log('\n══ ۲) درخواست — و سقفی که فقط «منتظرِ ساخت» را می‌شمرد ══');
const a1 = vbrAsk_('variety', 47, epFold.getId(), 'razavi', 'قسمت ۴۷');
ok('۲.۱ ردیف نوشته می‌شود', a1.ok === true, a1.why || '');
ok('۲.۲ دوباره نوشته نمی‌شود',
   vbrAsk_('variety', 47, epFold.getId(), 'razavi', '').ok === false);
const q1 = vbrRead_();
ok('۲.۳ صوتِ قسمت گشوده شد و نشانی گرفت',
   q1.items[0].audio.length === 1 && /drive/.test(q1.items[0].audio[0].url));
ok('۲.۴ پارامترها همراهِ ردیف می‌روند',
   q1.items[0].params.protect === String(CFG.VBR_PROTECT));
ok('۲.۵ صف خودش «هرکس با لینک» است', (function () {
   const it = outFolder_().getFilesByName(vbrFileName_());
   return it.hasNext() && String(it.next().getSharingAccess()) ===
          String(DriveApp.Access.ANYONE_WITH_LINK);
 })(), 'وگرنه درایو به‌جای JSON یک صفحهٔ HTML می‌دهد — درسِ ۷٫۳۳');

const realMax = CFG.VBR_MAX;
CFG.VBR_MAX = 1;
ok('۲.۶ سقف جلوی درخواستِ تازه را می‌گیرد',
   vbrAsk_('variety', 48, epFold.getId(), 'razavi', '').ok === false);
/* و حالا نکتهٔ اصلی: ردیفی که خروجی‌اش **ساخته شده** و فقط منتظرِ برداشت
   است، «درخواستِ بی‌جواب» نیست و نباید سقف را پر کند. */
_vbrMapMemo = { 'variety:47': { url: 'https://example.invalid/x.wav' } };
ok('۲.۷ ولی ردیفِ ساخته‌شده سقف را پر نمی‌کند',
   vbrAsk_('variety', 48, epFold.getId(), 'razavi', '').ok === true,
   'باگِ ۶٫۳۷: یک شکستِ برداشت، صف را تا ابد قفل می‌کرد');
CFG.VBR_MAX = realMax;
_vbrMapMemo = null;

console.log('\n══ ۳) بایت‌هایی که رسیدند — نه پسوند، نه Content-Type ══');
const blobOf = (s) => Utilities.newBlob(s, 'audio/wav', 'x.wav');
const wavBytes = 'RIFF' + '....' + 'WAVE' + 'y'.repeat(300000);
ok('۳.۱ WAVِ درست پذیرفته می‌شود', vbrWavOk_(blobOf(wavBytes)).ok === true);
ok('۳.۲ صفحهٔ HTML رد می‌شود',
   vbrWavOk_(blobOf('<html>' + 'y'.repeat(300000) + '</html>')).ok === false,
   'یک صفحهٔ خطا هم بایت برمی‌گرداند');
ok('۳.۳ فایلِ کوچک رد می‌شود', vbrWavOk_(blobOf('RIFF....WAVE')).ok === false);
ok('۳.۴ MP4 هم رد می‌شود (سرآیند، نه پسوند)',
   vbrWavOk_(blobOf('....ftyp' + 'y'.repeat(300000))).ok === false);

console.log('\n══ ۴) برداشت — و اصلی که هرگز دست نمی‌خورد ══');
const before = (function () { const it = epFold.getFiles(), a = []; while (it.hasNext()) a.push(it.next().getName()); return a; })();
UrlFetchApp.__setResponse && UrlFetchApp.__setResponse(200, wavBytes);
const realFetch = UrlFetchApp.fetch;
UrlFetchApp.fetch = function (u) {
  return { getResponseCode: () => 200, getBlob: () => blobOf(wavBytes),
           getContentText: () => JSON.stringify({ items: {} }) };
};
const got = vbrFetch_(vbrRead_().items[0],
                     { url: 'https://example.invalid/x.wav', bytes: 300012 }, 'بهروز رضوی');
ok('۴.۱ فایل در پوشهٔ قسمت نشست', got.ok === true, got.why || '');
ok('۴.۲ نامش خودش را معرفی می‌کند',
   /با صدای بهروز رضوی/.test(got.name), got.name);
const after = (function () { const it = epFold.getFiles(), a = []; while (it.hasNext()) a.push(it.next().getName()); return a; })();
ok('۴.۳ **اصل دست نخورد**',
   before.every(n => after.indexOf(n) !== -1) && after.length === before.length + 1,
   'اگر تبدیل بد باشد، فایلِ اصلی همان‌جاست');
UrlFetchApp.fetch = realFetch;

console.log('\n══ ۵) بستنِ ردیف، پس‌گرفتنِ اشتراک، و رهاشدن ══');
UrlFetchApp.fetch = function (u) {
  if (/voice-renders/.test(String(u))) {
    return { getResponseCode: () => 200,
             getContentText: () => JSON.stringify({ items: {
               'variety:47': { url: 'https://example.invalid/x.wav', minutes: 21.4 } } }) };
  }
  return { getResponseCode: () => 200, getBlob: () => blobOf(wavBytes) };
};
_vbrMapMemo = null;
const ing = vbrIngest_(hub);
ok('۵.۱ خروجی برداشته شد', ing.got.length === 1 && ing.got[0].key === 'variety:47');
ok('۵.۲ ردیف بسته شد',
   vbrRead_().items.filter(x => x.key === 'variety:47')[0].status === 'رسید');
ok('۵.۳ اشتراکِ موقتِ صوت پس گرفته شد', ing.unshared >= 1,
   'اشتراکی که پس گرفته نشود، صوتِ قسمت را برای همیشه عمومی می‌گذارد');
ok('۵.۴ کارنامه ردیف گرفت', (function () {
   const sh = hub.getSheetByName(VBR_TAB);
   return sh && sh.getLastRow() >= 2;
 })(), '«از کِی» فقط از تاریخچه درمی‌آید');

/* شکستِ پیاپی ⇒ «رهاشده»، و جدا از «در انتظار» شمرده می‌شود. */
CFG.VBR_TRY_MAX = 2;
UrlFetchApp.fetch = function (u) {
  if (/voice-renders/.test(String(u))) {
    return { getResponseCode: () => 200,
             getContentText: () => JSON.stringify({ items: {
               'variety:48': { url: 'https://example.invalid/bad.wav' } } }) };
  }
  return { getResponseCode: () => 200, getBlob: () => blobOf('<html>no</html>') };
};
_vbrMapMemo = null; vbrIngest_(hub);
_vbrMapMemo = null; const ing2 = vbrIngest_(hub);
ok('۵.۵ پس از سقفِ تلاش، «رهاشده»', ing2.abandoned === 1);
const st = vbrStatus_();
ok('۵.۶ و جدا از «در انتظار» شمرده می‌شود',
   st.abandoned === 1 && st.waiting === 0,
   'گزارشِ کاری که هرگز نمی‌افتد به‌عنوانِ «در انتظار»، هشدار را نویز می‌کند');
UrlFetchApp.fetch = realFetch;

console.log('\n══ ۶) سطرِ روزانه — و جمله‌ای که هر روز باید باشد ══');
ok('۶.۱ سطر همیشه هست', !!st.line && st.line.length > 10);
ok('۶.۲ و می‌گوید صوتِ منتشرشده عوض نشده',
   /عوض نشده/.test(st.line),
   'نبودِ این جمله می‌تواند «پس گرفت» خوانده شود');
CFG.VBR_REPLACE = true;
ok('۶.۳ و اگر روزی جایش را گرفت، صریح می‌گوید',
   /با همین/.test(vbrStatus_().line));
CFG.VBR_REPLACE = false;

console.log('\n══ ۷) گیرکردن — درخواستی که بی‌پاسخ بماند، خودش یافته است ══');
const d7 = vbrRead_();
d7.items.push({ key: 'variety:99', status: 'در انتظار',
                at: '1300/01/01 00:00', audio: [], speaker: 'razavi' });
vbrSave_(d7);
const st7 = vbrStatus_();
ok('۷.۱ روزهای گیرکردن شمرده می‌شود', st7.stuckDays >= 3, String(st7.stuckDays));
ok('۷.۲ و سطر می‌گوید', /پاسخی/.test(st7.line));
ok('۷.۳ یافته ثبت می‌شود', vbrStuckCheck_(hub, st7) === true);
ok('۷.۴ ولی یک شبِ بد یافته نمی‌سازد',
   vbrStuckCheck_(hub, { stuckDays: 0, waiting: 2 }) === false);

console.log('\n══ ۸) بی گویندهٔ روشن، پل کاری ندارد ══');
/* انتخابِ گوینده کارِ صاحبِ برنامه است، نه حدسِ کد. */
ok('۸.۱ هیچ ردیفِ روشنی ⇒ هیچ درخواستی', vbrSpeakerOn_() === '' &&
   vbrAskDue_(hub) === 0);
personaAddFromCard_('razavi', 'بهروز رضوی', { cue: 'آرام بخوان', modes: '' });
ok('۸.۲ ردیفِ تازه خاموش است، پس هنوز هیچ', vbrSpeakerOn_() === '');
personaBoardSave_('razavi', true, [knownShows_()[0].name], 1, 'آرام بخوان', '');
ok('۸.۳ و وقتی روشن شد، کلیدش برداشته می‌شود', vbrSpeakerOn_() === 'razavi');

console.log('\n══ ۹) خاموشیِ پل ══');
CFG.VBR_ON = false;
ok('۹.۱ خاموش ⇒ درخواستی نوشته نمی‌شود',
   vbrAsk_('variety', 50, epFold.getId(), 'razavi', '').ok === false);
ok('۹.۲ ولی سطر باز هم هست و می‌گوید خاموش است',
   /خاموش/.test(vbrStatus_().line));
CFG.VBR_ON = true;

console.log('\n══ ۱۰) شناسهٔ صف — سکوتی که دو بار گران تمام شد ══');
/* فایل پاک و دوباره ساخته می‌شود، شناسه عوض می‌شود، گردش‌کار همچنان کهنه
   را می‌خوانَد، و هیچ خطایی بلند نمی‌شود: صف پر است و هیچ قسمتی تبدیل
   نمی‌شود. `ytQueueIdOk_` و `vintQueueIdOk_` هر دو برای همین نوشته شدند. */
const realQ = CFG.VBR_QUEUE_ID;
CFG.VBR_QUEUE_ID = 'ID-THAT-IS-NOT-THERE';
ok('۱۰.۱ شناسهٔ جابه‌جاشده گرفته می‌شود', vbrQueueIdOk_().ok === false);
const stq = vbrStatus_();
ok('۱۰.۲ و در سطرِ روزانه صریح گفته می‌شود',
   stq.ok === false && stq.line.indexOf('شناسهٔ') !== -1);
ok('۱۰.۳ ولی سطر را نمی‌بلعد و شمارشِ گیرکردن را کور نمی‌کند',
   stq.line.indexOf('پلِ رنگِ صدا') === 0 && typeof stq.stuckDays === 'number',
   'باگِ ۷٫۲۱: return زودهنگام، هم سطر را می‌خورد هم دروازهٔ گیرکردن را');
CFG.VBR_QUEUE_ID = realQ;
ok('۱۰.۴ «نشد» ≠ «عوض شد»', (function () {
   const old = CFG.VBR_QUEUE_ID; CFG.VBR_QUEUE_ID = '';
   const r = vbrQueueIdOk_().ok; CFG.VBR_QUEUE_ID = old; return r === true;
 })(), 'شناسهٔ تنظیم‌نشده یک اتهام نیست');
/* و مرزِ واقعی: شناسه‌ای که در کد نشسته باید همانی باشد که گردش‌کار
   می‌خوانَد. دو عددِ متفاوت یعنی صفی که هیچ‌کس نمی‌بیند، بی هیچ خطایی. */
const bwf = fs.readFileSync('.github/workflows/voice-bridge.yml', 'utf8');
ok('۱۰.۵ شناسه در کد و گردش‌کار یکی است',
   !!CFG.VBR_QUEUE_ID && bwf.indexOf(CFG.VBR_QUEUE_ID) !== -1,
   'دو شناسهٔ متفاوت = صفی که هیچ‌وقت خوانده نمی‌شود');

console.log('\n══ ۱۱) تازه‌ترین قسمت اول — چون قضاوتِ گوش مقایسه می‌خواهد ══');
/* صفِ رندر به ترتیبِ ورود پر می‌شود و ردیف‌های رسیده هم در آن می‌مانند،
   پس ابتدایش قدیمی‌ترین است. اگر پل از ابتدا بردارد، اولین چیزی که
   صاحبِ برنامه می‌شنود قسمتی از هفته‌ها پیش است — که نمی‌تواند با چیزی
   مقایسه‌اش کند، و کلِ این نسخه برای همان یک قضاوت ساخته شده. */
{
  const q = vbrRead_(); q.items = []; vbrSave_(q);          // صفِ پل را خالی کن
  const f1 = OUT.createFolder('قسمتِ کهنه');
  f1.createFile('قسمت ۱ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const f2 = OUT.createFolder('قسمتِ تازه');
  f2.createFile('قسمت ۹ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const rd = ytRenderRead_();
  rd.items = [{ key: 'variety:1', show: 'variety', ep: '1', folderId: f1.getId(), title: 'کهنه' },
              { key: 'variety:9', show: 'variety', ep: '9', folderId: f2.getId(), title: 'تازه' }];
  ytRenderSave_(rd);
  personaBoardSave_('razavi', true, [knownShows_()[0].name], 1, 'آرام بخوان', '');
  const realCap = CFG.VBR_MAX; CFG.VBR_MAX = 1;
  const made = vbrAskDue_(hub);
  CFG.VBR_MAX = realCap;
  const keys = vbrRead_().items.map(x => x.key);
  ok('۱۱.۱ درخواست نوشته شد', made === 1, 'گرفت: ' + made);
  ok('۱۱.۲ و **تازه‌ترین** برداشته شد، نه قدیمی‌ترین',
     keys.indexOf('variety:9') !== -1 && keys.indexOf('variety:1') === -1,
     'گرفت: ' + JSON.stringify(keys));
}

console.log('\n══ ۱۲) اشتراکِ صف — و مسیری که به خودِ صف بند نیست ══');
/* ══ چرا این بخش هست ══
   ۲۲ سپتامبر، اجرای ۱ِ voice-bridge قرمز شد: «درایو به‌جای JSON یک صفحهٔ
   HTML داد». همان جملهٔ ۷٫۳۳ برای صفِ گویندگان، یک روز بعد، در بخشی که
   خودم نوشته بودم. و بدتر از تکرار، ساختارش:

     `vbrSave_` تنها جایی است که اشتراک را باز می‌کند، و فقط از دو راه
     صدا زده می‌شود — `vbrAsk_` که گویندهٔ روشن لازم دارد و `vbrIngest_`
     که ردیفِ موجود لازم دارد. یعنی در حالتِ شروع، هیچ‌کدام.

   پس وارسی باید از آن مسیر **مستقل** باشد، وگرنه دقیقاً وقتی لازم است
   خاموش است. */
{
  // صفی که هست ولی بسته است — همان فایلی که دستی ساخته شد.
  putOutJson_(vbrFileName_(), { rev: 3, items: [] });
  const qf = outFolder_().getFilesByName(vbrFileName_()).next();
  qf.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);

  const r = vbrQueueShare_();
  ok('۱۲.۱ بسته بودنِ صف گرفته می‌شود', r.ok === false,
     'درایو برای فایلِ بی‌اشتراک ۴۰۳ نمی‌دهد؛ HTML می‌دهد — پس خطایی نیست که دیده شود');
  ok('۱۲.۲ و **خودش** بازش می‌کند', r.fixed === true &&
     String(outFolder_().getFilesByName(vbrFileName_()).next().getSharingAccess()) ===
     String(DriveApp.Access.ANYONE_WITH_LINK),
     'دری که آدم باید دستی بازش کند در نیست — ۵٫۹۵');

  // دوباره بسته‌اش کن تا سطرِ روزانه را همان حالت بسازد.
  outFolder_().getFilesByName(vbrFileName_()).next()
    .setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  const st = vbrStatus_();
  ok('۱۲.۳ و سطرِ روزانه می‌گویدش', /اشتراکِ/.test(st.line),
     'تعمیری که کسی خبرش را نشنود، تعمیری است که دوباره لازم می‌شود');
  ok('۱۲.۴ ولی سطر را نمی‌بلعد و شمارش‌ها را کور نمی‌کند',
     st.line.indexOf('پلِ رنگِ صدا') === 0 && typeof st.stuckDays === 'number' &&
     typeof st.waiting === 'number',
     'باگِ ۷٫۲۱: return زودهنگام، هم سطر را می‌خورد هم دروازهٔ بعدی را');

  // و مرزِ اتهام: فایلی که نیست، تقصیر نیست.
  outFolder_().getFilesByName(vbrFileName_()).next().setTrashed(true);
  const r2 = vbrQueueShare_();
  ok('۱۲.۵ صفِ ساخته‌نشده اتهام نیست', r2.ok === true && r2.missing === true,
     'هنوز نوشته نشدن با بسته بودن یکی نیست');
}
/* و دلیلِ وجودِ این مسیرِ مستقل، به‌جای تکیه به نگهبانِ موجود:
   `vbrStuckCheck_` شرطش `waiting > 0` است، پس صفِ خالی ساختاراً از آن
   دروازه رد نمی‌شود. یعنی همان حالتی که هشدار لازم است، خاموش بود. */
ok('۱۲.۶ نگهبانِ گیرکردن این حالت را ساختاراً نمی‌گیرد',
   vbrStuckCheck_(hub, { stuckDays: 99, waiting: 0 }) === false,
   'صفِ خالی هرگز از دروازه‌اش رد نمی‌شود — پس نمی‌توانست جایش را بگیرد');
/* مسیرِ مستقل یعنی جایی که به رسیدنِ کارِ شبانه به بخشِ ۳۶ بند نیست.
   همان کاری که ۷٫۲۷ برای `embGates_` کرد: زنگ را به مسیری که ممکن است
   اصلاً اجرا نشود گره نزن. */
ok('۱۲.۷ و `healthCheck` خودش صدایش می‌زند، نه فقط کارِ شبانه', (function () {
   /* ══ دامنه، وگرنه سنجه چیزِ دیگری را می‌سنجد ══
      همین فایل جایِ دیگری هم `vbrStatus_` را صدا می‌زند: بلوکی که
      `_STATUS.json` را می‌سازد. جست‌وجو در کلِ فایل یعنی برداشتنِ
      فراخوانیِ `healthCheck` سنجه را قرمز **نمی‌کند** — سنجه‌ای که
      نمی‌تواند بیفتد از نبودنش بدتر است، چون سبز می‌شود و کسی دوباره
      نگاه نمی‌کند. پس فقط بدنهٔ خودِ `healthCheck` خوانده می‌شود. */
   const h = fs.readFileSync('src/08_Health.gs', 'utf8');
   const at = h.indexOf('function healthCheck(');
   if (at < 0) return false;
   const nxt = h.indexOf('\nfunction ', at + 1);
   const body = nxt < 0 ? h.slice(at) : h.slice(at, nxt);
   return /vbrStatus_\s*\(/.test(body);
 })(), 'شبی که دروازهٔ زمان از بخشِ ۳۶ رد شود، دقیقاً شبی است که باید گفته شود');

console.log('\n══ ۱۳) «هرگز نوشته نشد» ≠ «نوشته شد و خالی بود» ══');
/* صفِ دست‌ساز `rev: 0` دارد. `voicebridge.py` همین را قرمز می‌کند، ولی
   گردش‌کار را صاحبِ برنامه نمی‌بیند؛ سمتِ موتور هم باید بگوید. و سه
   حالتِ خالی از هم جدا می‌شوند، چون فقط یکی‌شان ایراد است. */
{
  putOutJson_(vbrFileName_(), { rev: 0, items: [] });
  /* شناسه را به فایلِ زنده سنجاق کن. ۱۲٫۵ فایل را به زباله‌دان برد، پس
     این یکی تازه ساخته شده و شناسه‌اش عوض است — و آن ایرادِ **دیگری**
     است که `ok` را پایین می‌آورد. سنجه‌ای که بتواند به دلیلِ اشتباه سبز
     یا قرمز شود، چیزی را که ادعا می‌کند نمی‌سنجد. */
  const realQ13 = CFG.VBR_QUEUE_ID;
  CFG.VBR_QUEUE_ID = outFolder_().getFilesByName(vbrFileName_()).next().getId();

  personaBoardSave_('razavi', true, [knownShows_()[0].name], 1, 'آرام بخوان', '');
  const stOn = vbrStatus_();
  ok('۱۳.۱ گویندهٔ روشن + صفِ نانوشته ⇒ ایراد، با نام',
     stOn.ok === false && stOn.everWritten === false &&
     /نوشته نشده/.test(stOn.line) && stOn.line.indexOf('razavi') !== -1,
     stOn.line);

  /* ══ ۱۳٫۲ در ۷٫۳۹ برعکس نوشته شده بود، و واقعیت ردش کرد (۷٫۴۶) ══
     آن سنجه می‌گفت «بی گویندهٔ روشن، صفِ نانوشته سالم است» — و همان باور
     بود که گذاشت گردش‌کارِ voice-bridge چهار بار پشتِ هم قرمز شود
     («موتور هرگز رویش ننوشته، rev 0») در حالی که سطرِ روزانه می‌گفت
     همه‌چیز خوب است.
     این دو یک چیز نیستند: «گوینده‌ای انتخاب نشده» تصمیمِ صاحبِ برنامه
     است؛ «صف یک بار هم نوشته نشده» یعنی کارِ شبانه هرگز به بخشِ ۳۶
     نرسیده — و آن مستقل از هر انتخابی، ایراد است. */
  personaBoardSave_('razavi', false, [], 1, 'آرام بخوان', '');
  const stOff = vbrStatus_();
  ok('۱۳.۲ بی گویندهٔ روشن هم، «هرگز نوشته نشده» ایراد است',
     stOff.ok === false && /نوشته نشده/.test(stOff.line),
     'سنجهٔ پیشین اینجا «سالم» می‌خواست، و همان باور چهار اجرای قرمز را ' +
     'پنهان کرد. گرفت: ' + stOff.line);

  putOutJson_(vbrFileName_(), { rev: 4, items: [] });
  const stOffW = vbrStatus_();
  ok('۱۳.۳ ولی صفِ **نوشته‌شده** بی گویندهٔ روشن سالم است، و می‌گوید چه لازم است',
     stOffW.ok === true && /هیچ گویندهٔ روشنی/.test(stOffW.line) &&
     /صداها/.test(stOffW.line),
     'هشداری که برای حالتِ سالم بزند، همان هشداری است که نادیده‌اش می‌گیرند. ' +
     stOffW.line);

  personaBoardSave_('razavi', true, [knownShows_()[0].name], 1, 'آرام بخوان', '');
  const stW = vbrStatus_();
  ok('۱۳.۴ صفِ نوشته‌شده و خالی، خبرِ دیگری است',
     stW.everWritten === true && /هیچ قسمتی تبدیل نشده/.test(stW.line) &&
     !/نوشته نشده/.test(stW.line), stW.line);
  CFG.VBR_QUEUE_ID = realQ13;
}

console.log('\n══ ۱۴) کارِ شبانه صف را می‌نویسد، حتی وقتی کاری ندارد ══');
/* ══ چرا این سنجه ══
   `voicebridge.py` هر صفِ `rev < 1` را رد می‌کند و باید بکند — سبزِ
   «۰ قسمت» روی فایلی که موتور هرگز ندیده یک سبزِ دروغ است. ولی تا پیش
   از ۷٫۴۰ موتور صف را فقط وقتی می‌نوشت که گوینده‌ای روشن بود، پس تا
   وقتی صاحبِ برنامه ردیفی را روشن نکرده گردش‌کار هر شش ساعت قرمز
   می‌شد — **برای حالتی که اصلاً ایراد نیست.**
   قرمزی که هیچ‌وقت عوض نشود، همان قرمزی است که دیگر خوانده نمی‌شود. */
{
  personaBoardSave_('razavi', false, [], 1, 'آرام بخوان', '');
  putOutJson_(vbrFileName_(), { rev: 0, items: [] });
  outFolder_().getFilesByName(vbrFileName_()).next()
    .setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  ok('۱۴.۱ پیش از شب: هیچ گویندهٔ روشنی، و صفِ نانوشته',
     vbrSpeakerOn_() === '' && vbrRead_().rev === 0);

  vbrNightly_(hub);

  const q = vbrRead_();
  ok('۱۴.۲ شب صف را نوشت، با اینکه چیزی برای صف نبود', (Number(q.rev) || 0) >= 1,
     'rev: ' + q.rev + ' — «هرگز ننوشته» نباید حالتِ پایدار باشد');
  ok('۱۴.۳ و خالی ماند — نوشتن یعنی «نگاه کردم»، نه «کاری کردم»',
     q.items.length === 0);
  ok('۱۴.۴ و همان نوشتن اشتراک را هم باز کرد', String(
     outFolder_().getFilesByName(vbrFileName_()).next().getSharingAccess()) ===
     String(DriveApp.Access.ANYONE_WITH_LINK));
  ok('۱۴.۵ پس سطرِ روزانه دیگر کارِ شبانه را متهم نمی‌کند، و می‌گوید چه لازم است',
     (function () { const st = vbrStatus_();
       return st.everWritten === true && !/نوشته نشده/.test(st.line) &&
              /هیچ گویندهٔ روشنی/.test(st.line); })(),
     'اتهام باید فقط به کسی بخورد که واقعاً کاری نکرده');
}
/* و مرزِ مقابل: پلِ خاموش هیچ‌چیز نمی‌نویسد. کلیدِ خاموش یعنی خاموش. */
{
  const before = vbrRead_().rev;
  CFG.VBR_ON = false;
  vbrNightly_(hub);
  CFG.VBR_ON = true;
  ok('۱۴.۶ ولی پلِ خاموش چیزی نمی‌نویسد', vbrRead_().rev === before,
     'وگرنه کلیدِ خاموش نصفه است');
}

console.log('\n══ ۱۵) «موردی» — نیمهٔ گم‌شدهٔ ۷٫۴۱، یک بخش آن‌طرف‌تر ══');
/* ══ چرا این بخش هست (۷٫۴۵) ══
   صاحبِ برنامه ۲۰ سپتامبر در یک جمله خواست «چه به صورتِ **دائم یا موردی**
   از صدایی که استفاده کردیم استفاده کنم». ۷٫۴۱ «موردی» را ساخت — ولی فقط
   برای **شیوهٔ خواندن** (بخشِ ۳۲). پل که یک نسخه جلوتر ساخته شد، هنوز فقط
   `فعال = بله` را می‌دید. یعنی «این یک قسمت را با رنگِ صدای او بساز» هیچ
   راهی نداشت: برای گرفتنِ رنگ باید ردیف را روشن می‌کردی، و روشن کردن یعنی
   دائم — دقیقاً همان چیزی که او نمی‌خواست.

   و این همان درسِ ۷٫۴۱/۷٫۳۴ است: وقتی جوابِ «همه‌اش را کردیم؟» می‌شود
   «بیشترش را»، نامِ نکرده را خودت بیاور. */
{
  const q = vbrRead_(); q.items = []; vbrSave_(q);

  const f47 = OUT.createFolder('قسمتِ ۴۷');
  f47.createFile('قسمت ۴۷ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const f48 = OUT.createFolder('قسمتِ ۴۸');
  f48.createFile('قسمت ۴۸ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const rd = ytRenderRead_();
  rd.items = [{ key: 'variety:47', show: 'variety', ep: '47', folderId: f47.getId(), title: '۴۷' },
              { key: 'variety:48', show: 'variety', ep: '48', folderId: f48.getId(), title: '۴۸' }];
  ytRenderSave_(rd);

  /* حالتِ این بخش صریح ساخته می‌شود، نه از ته‌ماندهٔ بخش‌های پیشین:
     آزمونی که به حالتِ آزمونِ قبلی بند باشد، روزی که آن یکی عوض شود
     بی آنکه کسی بفهمد چیزِ دیگری را می‌سنجد. */
  personaBoardSave_('razavi', true, [knownShows_()[0].name], 1, 'آرام بخوان', '');
  // razavi دائم و روشن. مهمان خاموش، فقط قسمتِ ۴۷ را نام برده.
  // مهمان هم مدلِ خودش را دارد — بی مدل، درخواست اصلاً نوشته نمی‌شود.
  CFG.VBR_SEED_MODELS = Object.assign({}, CFG.VBR_SEED_MODELS, { mehman: {
    pth: outsideFolder.createFile('mehman-e32.pth', 'PTH', 'application/octet-stream').getId(),
    index: outsideFolder.createFile('mehman-e32.index', 'IDX', 'application/octet-stream').getId() } });
  personaAddFromCard_('mehman', 'مهمان', { cue: 'کوتاه بخوان', modes: '' });
  const sv = personaBoardSave_('mehman', false, [], 1, 'کوتاه بخوان', '', '۴۷');
  ok('۱۵.۰ ردیفِ خاموشِ «موردی» ذخیره می‌شود', sv.ok === true && sv.onceCount === 1,
     JSON.stringify(sv));

  const rows = vbrSpeakerRows_();
  ok('۱۵.۱ برای قسمتِ نام‌برده، ردیفِ **خاموش** انتخاب می‌شود',
     vbrSpeakerPick_(rows, 'variety', '47').key === 'mehman',
     'وگرنه «موردی» فقط نامِ دیگری برای «دائم» است: برای گرفتنِ رنگ باید ' +
     'ردیف را روشن کنی، و روشن کردن یعنی همیشه');
  ok('۱۵.۲ و دلیلش ثبت می‌شود', vbrSpeakerPick_(rows, 'variety', '47').why === 'موردی');
  ok('۱۵.۳ ولی قسمتِ بعدی باز همان گویندهٔ دائم را می‌گیرد',
     vbrSpeakerPick_(rows, 'variety', '48').key === 'razavi',
     'وگرنه «موردی» بی‌صدا «دائم» را خاموش می‌کند');

  /* و حالتی که تا حالا وجود نداشت: هیچ ردیفی روشن نیست ولی «موردی» هست. */
  personaBoardSave_('razavi', false, [], 1, 'آرام بخوان', '');
  const rows2 = vbrSpeakerRows_();
  ok('۱۵.۴ با خاموش بودنِ همه، «موردی» هنوز کار می‌کند',
     vbrSpeakerOn_(rows2) === '' &&
     vbrSpeakerPick_(rows2, 'variety', '47').key === 'mehman');
  ok('۱۵.۵ ولی قسمتِ نام‌نبرده هیچ‌کس را نمی‌گیرد',
     vbrSpeakerPick_(rows2, 'variety', '48').key === '',
     'شمارهٔ نامعلوم هرگز نباید صدای مهمان بگیرد — برعکسِ «موردی»');
  ok('۱۵.۶ و دروازهٔ ارزان هم بازش می‌گذارد', vbrSpeakerAny_(rows2) === true,
     'اگر اینجا false بدهد، صفِ یوتیوب اصلاً خوانده نمی‌شود و «موردی» هرگز اجرا نمی‌شود');

  const stO = vbrStatus_();
  ok('۱۵.۷ سطرِ روزانه نمی‌گوید «هیچ‌کس»، نامِ ردیف را می‌برد',
     stO.line.indexOf('mehman') !== -1 &&
     stO.line.indexOf('قسمتی برای تبدیل انتخاب نمی‌شود') === -1,
     'گفتنِ «هیچ گویندهٔ روشنی نیست» اینجا دروغ نیست ولی گمراه‌کننده است — ' +
     'کاری هست که قرار است بشود. گرفت: ' + stO.line.slice(0, 140));

  // و مهم‌تر از هر ادعا: مسیرِ واقعی.
  const made = vbrAskDue_(hub);
  const items = vbrRead_().items;
  ok('۱۵.۸ و مسیرِ واقعی برای قسمتِ ۴۷ درخواست نوشت', made === 1, 'گرفت: ' + made);
  ok('۱۵.۹ با کلیدِ مهمان، و فقط همان قسمت',
     items.length === 1 && items[0].key === 'variety:47' &&
     items[0].speaker === 'mehman',
     'گرفت: ' + JSON.stringify(items.map(x => x.key + '/' + x.speaker)));

  // و مرزِ مقابل: نه روشن، نه موردی ⇒ هیچ.
  personaBoardSave_('mehman', false, [], 1, 'کوتاه بخوان', '', '');
  const q2 = vbrRead_(); q2.items = []; vbrSave_(q2);
  ok('۱۵.۱۰ بی روشن و بی موردی، هیچ درخواستی نوشته نمی‌شود',
     vbrSpeakerAny_() === false && vbrAskDue_(hub) === 0,
     'انتخابِ گوینده کارِ صاحبِ برنامه است، نه حدسِ کد');
}

console.log('\n══ ۱۶) صف از مسیرِ دوم هم نوشته می‌شود — نه فقط از کارِ شبانه ══');
/* ══ چرا این بخش هست (۷٫۴۶) ══
   ۷٫۴۰ `vbrQueueEnsure_` را ساخت تا صف بی‌قیدوشرط نوشته شود، و
   ۱۴ همان را از `vbrNightly_` می‌سنجد. ولی `vbrNightly_` پشتِ
   `nightHas_` در کارِ شبانه است، و کارِ شبانه در عمل هرگز به آنجا
   نرسید: فایلِ واقعی از ۲۲ سپتامبر روی `rev 0` ماند و گردش‌کار چهار بار
   قرمز شد. **درمانی که روی مسیری گذاشته شود که اجرا نمی‌شود، درمان نیست.**

   پس همان حرکتِ ۷٫۳۹: یک مسیرِ دوم با زمان‌بندیِ خودش. و سنجه‌اش
   `healthCheck` را **اجرا** می‌کند، نه اینکه دنبالِ نامِ تابع در متنِ
   کد بگردد — بارها در همین مخزن سنجه‌ای که کد را می‌خوانْد یک لایه
   بالاتر از خرابی ایستاد (۷٫۴۳/۷٫۴۴). */
{
  const o = console.log; console.log = () => {};
  try {
    // صفِ نانوشته، دقیقاً حالتِ واقعیِ ۲۳ سپتامبر
    putOutJson_(vbrFileName_(), { rev: 0, items: [] });
    CFG.VBR_QUEUE_ID = outFolder_().getFilesByName(vbrFileName_()).next().getId();
    try { healthCheck(); } catch (e) {}
  } finally { console.log = o; }
  const after = vbrRead_();
  ok('۱۶.۱ `healthCheck` خودش صف را نوشت، بی آنکه کارِ شبانه صدا زده شود',
     Number(after.rev) >= 1,
     'تا وقتی تنها نویسنده پشتِ نگهبانِ کارِ شبانه باشد، همان شبی که ' +
     'نگهبان رد نشود هیچ‌کس ننوشته. گرفت: rev=' + after.rev);
  ok('۱۶.۲ و همان نوشتن اشتراک را هم باز کرد',
     String(outFolder_().getFilesByName(vbrFileName_()).next().getSharingAccess()) ===
     String(DriveApp.Access.ANYONE_WITH_LINK),
     'بی اشتراک، گردش‌کار به‌جای JSON یک صفحهٔ HTML می‌گیرد (۷٫۳۳)');
}

console.log('\n══ ۱۷) فایلی که فقط در درایو بنشیند، شنیده نمی‌شود (۷٫۵۳) ══');
/* ══ خواستهٔ صریحِ صاحبِ برنامه ══
   «همین صوتِ قدیمی که با صدای رضوی یا هرکسِ دیگه‌ست تو تلگرامم ارسال کنه
   که یادم بمونه گوشش بدم». و دلیلِ عمیق‌ترش همان قاعدهٔ همیشگیِ این
   مخزن است: او درایو را باز نمی‌کند. کلِ بخشِ ۳۶ برای یک قضاوت ساخته
   شده که فقط او می‌تواند بکند — «شبیهِ اوست؟» — و قضاوتی که به یادآوری
   بند باشد، همان قضاوتی است که انجام نمی‌شود.

   این سنجه‌ها مسیرِ **واقعیِ** برداشت را می‌دوانند، نه `vbrTgTell_` را
   تنها؛ چون سؤال این نیست که «تابع کار می‌کند؟» بلکه «وقتی فایل رسید،
   چیزی به تلگرام می‌رود؟». */
{
  const props = global.__PROPS;
  props[PK.TG_TOKEN] = 'T'; props[PK.TG_CHAT] = 'C';
  const realApi = global.tgApi_;
  /* نامِ فارسی از `docs/voices.json` می‌آید و اینجا نیست. جای‌گزینش
     می‌کنیم تا سنجه بپرسد «نامی که برداشت *تشخیص داد* به پیام می‌رسد؟» —
     وگرنه کدی که کلیدِ لاتین را بفرستد هم سبز می‌شد. */
  const realNames = global.vbrSpeakerNames_;
  global.vbrSpeakerNames_ = () => ({ razavi: 'بهروز رضوی' });
  let calls = [];
  const arm = (behave) => {
    calls = [];
    global.tgApi_ = function (method, payload) {
      calls.push({ method: method, payload: payload });
      if (behave) behave(method);
      return { ok: true };
    };
  };
  // یک ردیفِ تازه برای هر آزمون، چون ردیفِ بسته دوباره برداشته نمی‌شود.
  const queue = (ep) => {
    vbrAsk_('variety', ep, epFold.getId(), 'razavi', 'قسمت ' + ep);
    UrlFetchApp.fetch = function (u) {
      if (/voice-renders/.test(String(u))) {
        const items = {}; items['variety:' + ep] =
          { url: 'https://example.invalid/x.wav', minutes: 21.4 };
        return { getResponseCode: () => 200,
                 getContentText: () => JSON.stringify({ items: items }) };
      }
      return { getResponseCode: () => 200, getBlob: () => blobOf(wavBytes) };
    };
    _vbrMapMemo = null;
  };
  const row = (ep) => vbrRead_().items.filter(x => x.key === 'variety:' + ep)[0];
  // سیاههٔ موتور پرحرف است؛ خروجیِ سنجه‌ها باید خوانا بمانَد.
  const quiet = (fn) => { const o = console.log; console.log = () => {};
    try { return fn(); } finally { console.log = o; } };

  arm(null); queue(61);
  const i1 = quiet(() => vbrIngest_(hub));
  const audio = calls.filter(c => c.method === 'sendAudio')[0];
  ok('۱۷.۱ رسیدنِ فایل، خودش یک پیامِ تلگرام می‌فرستد',
     !!audio, 'گرفت: ' + JSON.stringify(calls.map(c => c.method)));
  ok('۱۷.۲ و پیام می‌گوید کدام قسمت و کدام گوینده',
     /قسمت\s*61/.test(String(audio.payload.caption)) &&
     /رضوی/.test(String(audio.payload.caption)),
     'گرفت: ' + String(audio.payload.caption).slice(0, 90));
  ok('۱۷.۳ و صریح می‌گوید صوتِ منتشرشده عوض نشده',
     /عوض نشده/.test(String(audio.payload.caption)),
     'وگرنه همان پیام می‌تواند ترساننده باشد — «یعنی پادکستم رفت؟»');
  ok('۱۷.۴ ردیف هم بسته شد', row(61).status === 'رسید' && i1.told === 1,
     'گرفت: ' + row(61).status + ' · told=' + i1.told);

  /* حجمِ WAV می‌تواند از سقفِ تلگرام رد شود. سقوط به «کمتر راحت» است،
     نه به سکوت — سکوت یعنی او هرگز نمی‌فهمد فایلی آمده. */
  arm((m) => { if (m === 'sendAudio') throw new Error('too big'); }); queue(62);
  const i2 = quiet(() => vbrIngest_(hub));
  ok('۱۷.۵ اگر صوت نرفت، به‌صورتِ فایل می‌رود',
     calls.some(c => c.method === 'sendDocument') && i2.told === 1,
     'گرفت: ' + JSON.stringify(calls.map(c => c.method)));

  arm((m) => { if (m !== 'sendMessage') throw new Error('too big'); }); queue(63);
  const i3 = quiet(() => vbrIngest_(hub));
  const msg = calls.filter(c => c.method === 'sendMessage')[0];
  ok('۱۷.۶ و اگر هیچ‌کدام نشد، دستِ‌کم پیام با **لینک** می‌رود',
     !!msg && /drive\.google\.com/.test(String(msg.payload.text)) && i3.told === 1,
     'گرفت: ' + JSON.stringify(calls.map(c => c.method)));

  /* ══ مرزی که نباید جابه‌جا شود: خبر نباید کار را بشکند ══
     نخستین نسخهٔ این سنجه `tgApi_` را می‌ترکاند و **سبز می‌مانْد حتی
     وقتی عمداً try را برمی‌داشتم** — چون `vbrTgTell_` خودش هر فراخوان را
     در try دارد و چیزی از آن بیرون نمی‌پرد. یعنی ادعا را نمی‌سنجید.
     حالتی که واقعاً می‌رسد این است: **خودِ `vbrTgTell_` بترکد** — که
     دقیقاً همان شکلِ «بارکنندهٔ آزمون یک بخش را نمی‌شناسد» است و در این
     مخزن بارها افتاده. پس همان را می‌ترکانیم. */
  const realTell = global.vbrTgTell_;
  global.vbrTgTell_ = () => { throw new Error('تلگرام قطع است'); };
  arm(null); queue(64);
  const i4 = quiet(() => vbrIngest_(hub));
  global.vbrTgTell_ = realTell;
  /* برداشتنِ آن try، کلِ مجموعه را با استثنا می‌خواباند — یعنی یک
     تک‌سرفهٔ تلگرام همهٔ برداشتِ آن شب را می‌بَرد. سرخیِ این یکی به‌شکلِ
     فروپاشی است، نه یک سطرِ ❌. */
  ok('۱۷.۷ ترکیدنِ خبررسان ردیفِ رسیده را ناموفق نمی‌کند',
     row(64).status === 'رسید' && i4.got.length === 1 && i4.told === 0,
     'خبر دربارهٔ کار است، نه خودِ کار. گرفت: ' + row(64).status);

  props[PK.TG_TOKEN] = ''; props[PK.TG_CHAT] = '';
  arm(null); queue(65);
  const i5 = quiet(() => vbrIngest_(hub));
  ok('۱۷.۸ و بی تنظیمِ تلگرام هم برداشت سالم است',
     row(65).status === 'رسید' && calls.length === 0 && i5.told === 0,
     'گرفت: ' + row(65).status + ' · ' + calls.length + ' فراخوان');

  global.tgApi_ = realApi;
  global.vbrSpeakerNames_ = realNames;
  props[PK.TG_TOKEN] = 'T'; props[PK.TG_CHAT] = 'C';
}

/* ══ ۱۸) تیکِ قسمت‌های تولیدشده، واقعاً وارد صف می‌شود (۷٫۵۹) ══
 *
 * خواستهٔ صاحبِ برنامه: «لیستی باشه جای تایپی … هر چند تا که می‌خوام تیک
 * بزنم». تیک‌زدن اگر به صف نرسد، دکمه‌ای است که کار می‌کند و نتیجه‌اش
 * نمی‌آید — بدترین شکلِ خرابی در این مخزن.
 *
 * و اینجا از **خودِ صف** پرسیده می‌شود، نه از تابعِ میانی. */
{
  console.log('\n══ ۱۸) تیکِ قسمت‌های تولیدشده ══');
  const q = vbrRead_(); q.items = []; vbrSave_(q);

  const g1 = OUT.createFolder('قسمتِ تیکی ۱');
  g1.createFile('قسمت ۶۰ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const rd = ytRenderRead_();
  rd.items = [{ key: 'variety:60', show: 'variety', ep: '60', folderId: g1.getId(), title: 'شصت' },
              // ۶۱ عمداً بی‌پوشه: تیکش هرگز نباید به صف برسد.
              { key: 'variety:61', show: 'variety', ep: '61', folderId: '', title: 'شصت‌ویک' }];
  ytRenderSave_(rd);

  // همه خاموش، و رضوی فقط این دو قسمت را تیک خورده.
  personaBoardSave_('mehman', false, [], 1, 'کوتاه بخوان', '', '');
  /* بی‌پوشه **اول** تیک می‌خورد، عمداً: کلِ ارزشِ نگهبان همین است که یک
     تیکِ خراب، تیک‌های سالمِ بعد از خودش را با خود نبَرد. اگر آخر بود،
     سنجه سبز می‌ماند چه نگهبان باشد چه نباشد. */
  personaBoardSave_('razavi', false, [knownShows_()[0].name], 1, 'آرام بخوان', '', '',
                    ['variety:61', 'variety:60']);

  const n = vbrAskPicked_(vbrSpeakerRows_());
  const keys = vbrRead_().items.map(x => String(x.key));
  ok('۱۸.۱ قسمتِ تیک‌خورده وارد صفِ پل می‌شود — با ردیفِ **خاموش**',
     keys.indexOf('variety:60') !== -1 && n >= 1,
     'صف: ' + keys.join('، ') + ' · افزوده: ' + n);
  ok('۱۸.۲ و قسمتِ بی‌پوشه هرگز وارد نمی‌شود',
     keys.indexOf('variety:61') === -1,
     'پوشه‌اش شناخته نیست، پس تبدیل‌شدنی نیست');
  /* و نیمهٔ دومش، که همان سنجهٔ واقعیِ نگهبان است: تیکِ خراب **پیش از**
     تیکِ سالم است، پس اگر ردیفِ بی‌پوشه خطا بیندازد، ۶۰ هرگز نوشته
     نمی‌شود و او هیچ‌وقت نمی‌فهمد چرا. */
  ok('۱۸.۲-ب یک تیکِ خراب، تیک‌های سالمِ بعدش را نمی‌بَرد',
     keys.indexOf('variety:60') !== -1,
     'صف: ' + keys.join('، '));
  /* تیک می‌مانَد و هر شب دوباره دیده می‌شود، پس دومین‌بار نباید ردیفِ
     تکراری بسازد — وگرنه صف هر شب از یک قسمت پر می‌شود. */
  vbrAskPicked_(vbrSpeakerRows_());
  const dup = vbrRead_().items.filter(x => String(x.key) === 'variety:60').length;
  ok('۱۸.۳ اجرای دوباره ردیفِ تکراری نمی‌سازد',
     dup === 1, 'تعداد: ' + dup);

  /* ══ ۱۸.۵ از **راهی که شبانه می‌رود**، نه از تابعِ میانی (۷٫۶۲) ══
     ۲۴ سپتامبر او درس‌نامه ۴۹ را تیک زد و صبح صف **خالی** بود. علت:
     `vbrAskDue_` با `vbrSpeakerAny_` شروع می‌شود، و آن دروازه فقط
     «روشن» و «موردی» را می‌شناخت — نه ستونِ تیک. پس پیش از رسیدن به
     `vbrAskPicked_` برمی‌گشت.
     سنجه‌های ۱۸.۱ تا ۱۸.۴ سبز بودند چون **مستقیم** `vbrAskPicked_` را
     صدا می‌زدند: راهی که نامش را نمی‌بردند. این یکی از در وارد می‌شود. */
  {
    const q4 = vbrRead_(); q4.items = []; vbrSave_(q4);
    const g4 = OUT.createFolder('قسمتِ تیکی ۴');
    g4.createFile('قسمت ۷۰ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
    const rd4 = ytRenderRead_();
    rd4.items = [{ key: 'variety:70', show: 'variety', ep: '70', folderId: g4.getId(), title: 'هفتاد' }];
    ytRenderSave_(rd4);
    // همه خاموش، هیچ «موردی» — فقط یک تیک. همان حالتِ واقعیِ او.
    personaBoardSave_('mehman', false, [], 1, 'کوتاه بخوان', '', '', []);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1, 'آرام بخوان', '', '',
                      ['variety:70']);
    ok('۱۸.۵ دروازهٔ شبانه تیک را هم «کار» می‌شمارد',
       vbrSpeakerAny_(vbrSpeakerRows_()) === true,
       'وگرنه vbrAskDue_ پیش از رسیدنِ به تیک‌ها برمی‌گردد');
    /* سطرِ روزانه **پیش از** صف‌شدن سنجیده می‌شود — همان لحظه‌ای که او
       صبح می‌بیند: تیک زده و هنوز چیزی در صف نیست. پس از صف‌شدن جملهٔ
       درست «در انتظار: ۱» است، که خبرِ دیگری است. */
    ok('۱۸.۵-پ سطرِ روزانه، تیکِ صف‌نشده را سالم جا نمی‌زند',
       /تیک خورده/.test(String(vbrStatus_().line)),
       String(vbrStatus_().line).slice(0, 130));
    const nDue = vbrAskDue_(hub);
    const kDue = vbrRead_().items.map((x) => String(x.key));
    ok('۱۸.۵-ب و قسمتِ تیک‌خورده از **vbrAskDue_** وارد صف می‌شود',
       kDue.indexOf('variety:70') !== -1 && nDue >= 1,
       'صف: ' + kDue.join('، ') + ' · افزوده: ' + nDue);
  }

  /* و ردیفی که هیچ تیکی ندارد هیچ‌چیز نمی‌سازد — سوئیچی که نیمه‌خاموش
     باشد سوئیچ نیست (۷٫۴۰). */
  const q2 = vbrRead_(); q2.items = []; vbrSave_(q2);
  personaBoardSave_('razavi', false, [knownShows_()[0].name], 1, 'آرام بخوان', '', '', []);
  ok('۱۸.۴ بی‌تیک، هیچ درخواستی نوشته نمی‌شود',
     vbrAskPicked_(vbrSpeakerRows_()) === 0 && vbrRead_().items.length === 0);

  /* و همان مرز در برابرِ چیزی که هنوز نمی‌دانیم: اگر ساختنِ درخواست
     **پرتاب** کند، باز هم تیک‌های بعدی باید بروند. تنها فراخوانندهٔ این
     تابع `catch` خالی دارد، پس یک پرتاب یعنی همهٔ تیک‌ها بی‌صدا می‌روند. */
  {
    const q3 = vbrRead_(); q3.items = []; vbrSave_(q3);
    const realAsk = global.vbrAsk_;
    let first = true;
    global.vbrAsk_ = function (show, ep, fid, spk, ttl) {
      if (first) { first = false; throw new Error('پرتابِ ساختگی'); }
      return realAsk(show, ep, fid, spk, ttl);
    };
    const g2 = OUT.createFolder('قسمتِ تیکی ۲');
    g2.createFile('قسمت ۶۲ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
    const rd2 = ytRenderRead_();
    rd2.items = [{ key: 'variety:62', show: 'variety', ep: '62', folderId: g1.getId(), title: 'شصت‌ودو' },
                 { key: 'variety:63', show: 'variety', ep: '63', folderId: g2.getId(), title: 'شصت‌وسه' }];
    ytRenderSave_(rd2);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1, 'آرام بخوان', '', '',
                      ['variety:62', 'variety:63']);
    let threw = false;
    try { vbrAskPicked_(vbrSpeakerRows_()); } catch (e) { threw = true; }
    const k2 = vbrRead_().items.map(x => String(x.key));
    global.vbrAsk_ = realAsk;
    ok('۱۸.۲-پ و پرتابِ یک تیک، بقیه را زمین نمی‌زند',
       threw === false && k2.indexOf('variety:63') !== -1,
       'پرتاب: ' + threw + ' · صف: ' + k2.join('، '));
  }
}

/* ══ ۱۹) دکمهٔ منو — درِ دستی، از خودِ همان تابعی که منو صدا می‌زند (۷٫۶۳) ══
 *
 * بدهیِ این هفته از دفترِ `MENU_DEBT`. انتخابش تصادفی نیست: `runVoiceBridge`
 * همان دری است که آدم وقتی شبانه کارش را نکرده بازش می‌کند — و دیشب شبانه
 * کارش را نکرد. اگر این دکمه هم آزموده نشده باشد، تنها راهِ **همین حالا**
 * جبران کردن، خودش نیازموده است.
 *
 * و از **خودِ تابعِ منو** وارد می‌شود، نه از `vbrNightly_` و نه از
 * `vbrAskDue_`: قاعدهٔ ۷٫۶۲ — سنجه‌ای که تابعِ میانی را صدا بزند تابع را
 * ثابت می‌کند، نه قابلیت را. نامِ تابع هم از خودِ منو خوانده می‌شود، وگرنه
 * فردا کسی گزینه را به تابعِ دیگری ببندد و این سنجه چیزی را بسنجد که دیگر
 * دکمه نیست. */
{
  console.log('\n══ ۱۹) دکمهٔ منو «🌉 پلِ رنگِ صدا» ══');
  const menuSrc = fs.readFileSync('src/05_Setup.gs', 'utf8');
  const bound = /addItem\('[^']*پلِ رنگِ صدا[^']*',\s*'([A-Za-z_][A-Za-z0-9_]*)'\)/.exec(menuSrc);
  ok('۱۹.۱ گزینهٔ منو به یک تابعِ موجود بسته است',
     !!bound && typeof global[bound[1]] === 'function',
     bound ? bound[1] : 'گزینه در منو پیدا نشد');
  const press = global[bound[1]];

  {
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    const g = OUT.createFolder('قسمتِ دکمه‌ای');
    g.createFile('قسمت ۸۰ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
    const rd = ytRenderRead_();
    rd.items = [{ key: 'variety:80', show: 'variety', ep: '80',
                  folderId: g.getId(), title: 'هشتاد' }];
    ytRenderSave_(rd);
    // همان حالتِ واقعیِ ۲۴ سپتامبر: همه خاموش، هیچ «موردی»، فقط یک تیک.
    personaBoardSave_('mehman', false, [], 1, 'کوتاه بخوان', '', '', []);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1, 'آرام بخوان', '', '',
                      ['variety:80']);

    let msg = '', threw = '';
    try { msg = String(press() || ''); } catch (e) { threw = e.message; }
    ok('۱۹.۲ فشارِ دکمه خطا نمی‌دهد', threw === '', threw);
    const keys = vbrRead_().items.map((x) => String(x.key));
    ok('۱۹.۳ و قسمتِ تیک‌خورده را همان‌جا وارد صف می‌کند',
       keys.indexOf('variety:80') !== -1, 'صف: ' + keys.join('، '));
    /* دکمه‌ای که کار کند و نگوید چه کرد، از دکمهٔ خراب سخت‌تر تشخیص داده
       می‌شود: او دوباره فشارش می‌دهد و صف را دو برابر می‌کند. */
    ok('۱۹.۴ و در پیامش می‌گوید چند قسمت درخواست شد',
       /درخواستِ تازه:\s*\S/.test(msg),
       msg.split('\n').filter((l) => l.indexOf('درخواست') !== -1).join(' | ') ||
         msg.slice(0, 120));
  }

  /* و وقتی هیچ‌کدام از سه راه انتخاب نشده، راهنمایی باید **هر سه** را
     نام ببرد. تا ۷٫۶۲ دو تا را می‌گفت و راهِ سومی که ۷٫۵۹ ساخته بود —
     همان که او استفاده می‌کند — در متن نبود. */
  {
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    personaBoardSave_('mehman', false, [], 1, 'کوتاه بخوان', '', '', []);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1, 'آرام بخوان', '', '', []);
    const msg = String(press() || '');
    ok('۱۹.۵ بی هیچ انتخابی، راهنمایی هر سه راه را نام می‌بَرد',
       msg.indexOf('روشن') !== -1 && msg.indexOf('موردی') !== -1 && /تیک/.test(msg),
       msg.slice(msg.indexOf('⚠️')).slice(0, 220));
  }
}

/* ══════════════════════════════════════════════════════════════════════
 * ۲۰) سقفِ دانلود — و اینکه «سقف» تلاشِ ناموفق نیست (۷٫۶۶)
 *
 * اولین خروجیِ واقعیِ پل (۲۶ سپتامبر، قسمتِ ۴۹) ۷۰٫۹ مگابایت درآمد.
 * `UrlFetchApp` سقفِ ۵۰ مگابایتی دارد، پس گردش‌کار سبز بود و موتور هرگز
 * نمی‌توانست برش دارد — و بدتر: هر تلاش شمرده می‌شد، یعنی سه شب بعد
 * ردیف خودبه‌خود «رهاشده» می‌شد برای خرابیِ خودِ ما.
 *
 * هر سنجهٔ اینجا از **`vbrIngest_`** وارد می‌شود، نه از `vbrFetch_` —
 * قاعدهٔ ۷٫۴۴/۷٫۶۲: سنجه‌ای که تابعِ تازه را صدا بزند تابع را اثبات
 * می‌کند؛ فقط سنجه‌ای که از جایی شروع کند که تولید شروع می‌کند، خودِ
 * قابلیت را اثبات می‌کند.
 * ══════════════════════════════════════════════════════════════════════ */
console.log('\n══ ۲۰) سقفِ دانلود، تکه‌تکه، و «رهاشده» که نباید بشود ══');
{
  const rf = UrlFetchApp.fetch;
  const bigWav = 'RIFF' + '....' + 'WAVE' + 'y'.repeat(300000);
  const bl = (t) => Utilities.newBlob(t, 'audio/wav', 'x.wav');
  const fold = OUT.createFolder('قسمت ۹۰');
  fold.createFile('قسمت ۹۰ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const seed = (key, hit) => {
    const d = vbrRead_();
    d.items = [{ key: key, show: 'variety', ep: '90', folderId: fold.getId(),
                 speaker: 'razavi', status: 'در انتظار', at: nowStr_(),
                 audio: [], tries: 0 }];
    vbrSave_(d);
    UrlFetchApp.fetch = function (u) {
      if (/voice-renders/.test(String(u))) {
        const it = {}; it[key] = hit;
        return { getResponseCode: () => 200,
                 getContentText: () => JSON.stringify({ items: it }) };
      }
      return { getResponseCode: () => 200, getBlob: () => bl(bigWav) };
    };
    _vbrMapMemo = null;
  };
  const names = () => { const it = fold.getFiles(), a = []; while (it.hasNext()) a.push(it.next().getName()); return a; };

  /* ۲۰.۱ — تکِ بزرگ‌تر از سقف: برداشته نمی‌شود، **و تلاش شمرده نمی‌شود**. */
  CFG.VBR_TRY_MAX = 2;
  seed('variety:90', { url: 'https://example.invalid/big.wav', bytes: 70942444 });
  const b1 = vbrIngest_(hub);
  ok('۲۰.۱ تکهٔ بزرگ‌تر از سقف برداشته نمی‌شود',
     b1.got.length === 0 && b1.tooBig === 1,
     'tooBig=' + b1.tooBig + ' · ' + ((b1.failed[0] || {}).why || ''));
  ok('۲۰.۱-ب و دلیلش هر دو عدد را نام می‌بَرد',
     /\b71\b/.test(String((b1.failed[0] || {}).why)) &&
     /\b45\b/.test(String((b1.failed[0] || {}).why)),
     String((b1.failed[0] || {}).why));
  /* و این همان سنجه‌ای است که کلِ نسخه برایش نوشته شد: با شمردنِ تلاش،
     شبانه سه شب بعد قسمت را «رهاشده» می‌کرد — برای خروجی‌ای که آمده بود. */
  _vbrMapMemo = null; const b2 = vbrIngest_(hub);
  _vbrMapMemo = null; const b3 = vbrIngest_(hub);
  const row1 = vbrRead_().items.filter((x) => x.key === 'variety:90')[0];
  ok('۲۰.۲ سه دورِ پیاپی و ردیف هنوز «در انتظار» است، نه «رهاشده»',
     row1.status === 'در انتظار' && b2.abandoned === 0 && b3.abandoned === 0 &&
     (Number(row1.tries) || 0) === 0,
     'status=' + row1.status + ' · tries=' + (row1.tries || 0));
  /* و کارنامه یک ردیف می‌گیرد، نه سه — دلیل عوض نشده. */
  const shB = hub.getSheetByName(VBR_TAB);
  const rowsBig = (function () {
    const last = shB.getLastRow(); let n = 0;
    for (let i = 2; i <= last; i++) {
      if (String(shB.getRange(i, 4, 1, 1).getValues()[0][0]) === 'برداشته نشد') n++;
    }
    return n;
  })();
  ok('۲۰.۳ و کارنامه یک ردیف می‌گیرد نه سه (دلیل عوض نشده)',
     rowsBig === 1, 'ردیف: ' + rowsBig);

  /* ۲۰.۴ — چندتکه: هر تکه یک فایل، نام‌ها شمارهٔ خودشان را دارند. */
  seed('variety:91', { urls: ['https://example.invalid/a.wav',
                              'https://example.invalid/b.wav'],
                       pieceBytes: [30000000, 30000000], seconds: 900 });
  vbrRead_(); // صف را با کلیدِ تازه بنویس
  {
    const d = vbrRead_();
    d.items = [{ key: 'variety:91', show: 'variety', ep: '91', folderId: fold.getId(),
                 speaker: 'razavi', status: 'در انتظار', at: nowStr_(), audio: [], tries: 0 }];
    vbrSave_(d); _vbrMapMemo = null;
  }
  const p1 = vbrIngest_(hub);
  const nm = names();
  ok('۲۰.۴ خروجیِ دوتکه، دو فایل می‌سازد',
     p1.got.length === 1 && nm.filter((n) => /۱ از ۲/.test(n)).length === 1 &&
     nm.filter((n) => /۲ از ۲/.test(n)).length === 1, nm.join(' | '));

  /* ۲۰.۵ — نیمهٔ یک مجموعه هرگز نمی‌مانَد. تکهٔ دوم خراب ⇒ اولی هم پاک. */
  {
    const d = vbrRead_();
    d.items = [{ key: 'variety:92', show: 'variety', ep: '92', folderId: fold.getId(),
                 speaker: 'razavi', status: 'در انتظار', at: nowStr_(), audio: [], tries: 0 }];
    vbrSave_(d);
    /* ══ پاسخ بر اساسِ **نشانی**، نه شمارندهٔ فراخوان ══
       نسخهٔ اولِ همین سنجه شمارنده داشت — و `vbrSpeakerNames_()` پیش از
       هر تکه `docs/voices.json` را می‌گیرد، پس تکهٔ **اول** بلابِ خراب
       را می‌گرفت: هیچ فایلی نوشته نمی‌شد و حلقهٔ پاک‌سازی هرگز اجرا
       نمی‌شد. سنجه سبز بود و چیزی را نمی‌سنجید — و فقط شکستنِ عمدیِ کد
       نشانش داد (۷٫۴۴). */
    UrlFetchApp.fetch = function (u) {
      const s = String(u);
      if (/voice-renders/.test(s)) {
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ items: {
          'variety:92': { urls: ['https://example.invalid/g.wav',
                                 'https://example.invalid/h.wav'],
                          pieceBytes: [30000000, 30000000] } } }) };
      }
      if (/g\.wav$/.test(s)) return { getResponseCode: () => 200, getBlob: () => bl(bigWav) };
      if (/h\.wav$/.test(s)) return { getResponseCode: () => 200, getBlob: () => bl('<html>no</html>') };
      return { getResponseCode: () => 200, getContentText: () => '{}', getBlob: () => bl(bigWav) };
    };
    _vbrMapMemo = null;
    const before92 = names().length;
    const h1 = vbrIngest_(hub);
    const after92 = names();
    ok('۲۰.۵ تکهٔ دومِ خراب ⇒ تکهٔ اول هم نمی‌مانَد',
       h1.got.length === 0 &&
       /تکهٔ 2 از 2/.test(String((h1.failed[0] || {}).why)) &&   // اولی **نوشته شد**
       after92.filter((n) => /قسمت 92/.test(n)).length === 0 &&
       after92.length === before92,
       'why=' + ((h1.failed[0] || {}).why || '—') + ' · فایل‌ها: ' + after92.join(' | '));
  }

  /* ۲۰.۶ — موتورِ قدیمی نیمهٔ قسمت را برنمی‌دارد: چندتکه ⇒ بی `url`. */
  ok('۲۰.۶ نقشهٔ چندتکه بی `url` است، پس موتورِ قدیمی منتظر می‌مانَد',
     vbrHitPieces_({ urls: ['a', 'b'] }).length === 2 &&
     vbrHitPieces_({ urls: ['a', ''] }).length === 0 &&
     vbrHitPieces_({ url: 'a' }).length === 1 &&
     vbrHitPieces_({}).length === 0,
     'نشانیِ غایب ⇒ مجموعهٔ ناقص ⇒ هیچ');

  /* ۲۰.۷ — اتهام به طرفِ درست: ردیفی که نقشه جوابش را دارد «بی‌پاسخ»
     نیست، پس `voice-bridge-stuck` نباید بلند شود. این همان شکلِ
     ۷٫۱۸/۷٫۳۲ است: عددی که کسی را متهم می‌کند باید شاهدش را داشته باشد. */
  {
    const d = vbrRead_();
    d.items = [{ key: 'variety:93', show: 'variety', ep: '93', folderId: fold.getId(),
                 speaker: 'razavi', status: 'در انتظار', audio: [], tries: 0,
                 at: '2026-01-01 00:00' }];              // بسیار قدیمی
    vbrSave_(d);
    UrlFetchApp.fetch = function (u) {
      if (/voice-renders/.test(String(u))) {
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ items: {
          'variety:93': { urls: ['https://example.invalid/z.wav'],
                          pieceBytes: [70942444] } } }) };
      }
      return { getResponseCode: () => 200, getBlob: () => bl(bigWav) };
    };
    _vbrMapMemo = null;
    /* از همان جایی وارد می‌شویم که تولید وارد می‌شود: شاهد را `vbrIngest_`
       روی ردیف می‌زند، پس دست‌نویس کردنِ آن یعنی سنجیدنِ چیزی که موتور
       هرگز نمی‌سازد (۷٫۲۲). */
    vbrIngest_(hub);
    const stB = vbrStatus_();
    ok('۲۰.۷ ردیفِ پاسخ‌دار «بی‌پاسخ» شمرده نمی‌شود',
       stB.waiting === 1 && stB.answered === 1 && stB.tooBig === 1,
       'waiting=' + stB.waiting + ' answered=' + stB.answered + ' tooBig=' + stB.tooBig);
    ok('۲۰.۷-ب پس گردش‌کار به بی‌پاسخی متهم نمی‌شود',
       vbrStuckCheck_(hub, stB) === false && !/پاسخی از گردش‌کارِ پل نرسیده/.test(stB.line),
       stB.line.slice(0, 160));
    ok('۲۰.۸ ولی سطرِ روزانه خودِ وضع را با نام می‌گوید',
       /برداشته نشد \(حجم\)/.test(stB.line) && stB.ok === false,
       stB.line.slice(stB.line.indexOf('برداشته')).slice(0, 120));
    ok('۲۰.۸-ب و یافته‌اش موضوعِ درست را دارد',
       vbrBigCheck_(hub, stB) === true, 'voice-bridge-toobig');
    ok('۲۰.۹ و سنجندهٔ خودوارسی تا این وضع برقرار است در را می‌بندد',
       (function () {
         const mp = selfVerifyMap_()['voice-bridge-toobig'];
         return !!mp && mp.still({ voiceBridge: { ok: false } }) === true &&
                mp.still({ voiceBridge: { ok: true } }) === false &&
                mp.still({}) === null;
       })(), 'بستنِ نادرست رد می‌شود، «نمی‌دانم» رفتارِ امروز است');
  }

  /* ══ ۲۰.۹-ب حالتی که رفع شده باید از گزارش برود ══
     گردش‌کار که ریزتر تکه کند، سقف دیگر مانع نیست. اگر شاهدِ روی ردیف
     پاک نشود، «برداشته نشد (حجم)» تا ابد در سطرِ روزانه می‌مانَد —
     هشداری برای وضعی که وجود ندارد، همان چیزی که یاد می‌گیرند نادیده
     بگیرند. این ادعا در نسخهٔ اول فقط در یک توضیح نوشته شده بود و هیچ
     سنجه‌ای نداشت؛ شکستنِ عمدیِ کد نشانش داد. */
  {
    const d = vbrRead_();
    d.items = [{ key: 'variety:94', show: 'variety', ep: '94', folderId: fold.getId(),
                 speaker: 'razavi', status: 'در انتظار', at: nowStr_(), audio: [], tries: 0 }];
    vbrSave_(d);
    const answer = (bytes, good) => {
      UrlFetchApp.fetch = function (u) {
        const t = String(u);
        if (/voice-renders/.test(t)) {
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ items: {
            'variety:94': { urls: ['https://example.invalid/w.wav'], pieceBytes: [bytes] } } }) };
        }
        if (/w\.wav$/.test(t)) {
          return { getResponseCode: () => 200, getBlob: () => bl(good ? bigWav : '<html>no</html>') };
        }
        return { getResponseCode: () => 200, getContentText: () => '{}', getBlob: () => bl(bigWav) };
      };
      _vbrMapMemo = null;
      return vbrIngest_(hub);
    };
    answer(70942444, true);                       // اول: بزرگ‌تر از سقف
    const s1 = vbrStatus_();
    answer(30000000, false);                      // بعد: ریزتر، ولی بایت‌ها خراب
    const s2 = vbrStatus_();
    ok('۲۰.۹-ب سقف که برداشته شد، «حجم» از گزارش می‌رود',
       s1.tooBig === 1 && s2.tooBig === 0 && s2.answered === 1,
       'اول tooBig=' + s1.tooBig + ' · بعد tooBig=' + s2.tooBig +
       ' answered=' + s2.answered);
  }

  /* ══ ۲۰.۱۰ و ادعای خودِ این نسخه، سنجیده ══
     نسخهٔ اولِ ۷٫۶۶ نقشه را در `vbrStatus_` می‌گرفت. `writeStatus_` این
     تابع را صدا می‌زند، پس یک فراخوانِ شبکه روی داغ‌ترین مسیرِ موتور
     می‌نشست — اشتباهِ ۷٫۶۳، عیناً. و سه مجموعهٔ دیگر همان‌جا شکستند چون
     یک پاسخِ ماک‌شدهٔ مدل مصرف شد.
     شمارش روی **تعدادِ فراخوان** است، نه زمان: ماک نه هابِ ۲۹ مگابایتی
     دارد نه شبکه، پس زمان چیزی را نمی‌سنجد (۷٫۶۰). */
  {
    let n = 0;
    UrlFetchApp.fetch = function (u) { n++; return { getResponseCode: () => 404,
      getContentText: () => '{}', getBlob: () => bl(bigWav) }; };
    _vbrMapMemo = null;
    vbrStatus_();
    ok('۲۰.۱۰ `vbrStatus_` هیچ فراخوانِ شبکه‌ای ندارد',
       n === 0, 'فراخوان: ' + n + ' — `writeStatus_` این را صدا می‌زند');
  }
  UrlFetchApp.fetch = rf; _vbrMapMemo = null;
}

console.log('\n══ ۲۱) پارامترِ تبدیل — یک عدد، یک جا (۷٫۷۰) ══');
{
  const src = require('fs').readFileSync('src/36_VoiceBridge.gs', 'utf8');
  const fb = /CFG\.VBR_INDEX_RATE \|\| '([^']+)'/.exec(src);
  ok('۲۱.۱ پیش‌فرضِ درون‌خطی با `CFG` یکی است',
     !!fb && fb[1] === String(CFG.VBR_INDEX_RATE),
     'درون‌خطی ' + (fb && fb[1]) + ' · CFG ' + CFG.VBR_INDEX_RATE +
     ' — دو عدد در دو جا که کسی با هم نسنجیده باشد');
  /* و همان عددی که به گردش‌کار می‌رود، نه چیزِ دیگری — از راهی که تولید
     می‌رود: یک قسمت تیک بخورد، `vbrAskDue_` صدا زده شود، و `params`ِ
     ردیفی که واقعاً نوشته شد خوانده شود.
     نسخهٔ اولِ این سنجه روی صفِ خالی سبز می‌شد («!seen ||») — یعنی هیچ
     چیزی را نمی‌سنجید. صفِ خالی حالا خودش شکست است. */
  {
    const g2 = OUT.createFolder('قسمت ۹۹');
    g2.createFile('قسمت ۹۹ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
    const rd2 = ytRenderRead_();
    rd2.items = [{ key: 'variety:99', show: 'variety', ep: '99',
                   folderId: g2.getId(), title: 'نود و نه' }];
    ytRenderSave_(rd2);
    const q0 = vbrRead_(); q0.items = []; vbrSave_(q0);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1,
                      'آرام بخوان', '', '', ['variety:99']);
    vbrAskDue_(hub);
    const row = vbrRead_().items.filter((x) => String(x.key) === 'variety:99')[0];
    ok('۲۱.۲ و همان عدد به صف می‌رود',
       !!row && !!row.params && String(row.params.indexRate) === String(CFG.VBR_INDEX_RATE),
       row ? ('params.indexRate=' + String((row.params || {}).indexRate)) : 'ردیفی نوشته نشد');
  }
}

console.log('\n══ ۲۲) رنگ و روح — و ادعایی که نیمی‌اش درست بود (۷٫۷۳) ══');
/* صاحبِ برنامه قسمتِ ۴۹ را کامل شنید: «مثل کسی می‌خواند که متوجه نیست چه
   می‌خواند و فقط صدایش مثلِ رضوی است». درست بود و علتش ساختاری است: RVC
   رنگ را عوض می‌کند و مکث و کشش و دامنه **ورودی**‌اش‌اند نه خروجی‌اش
   (۷٫۳۴). صوتِ آن قسمت ماه‌ها پیش با خوانشِ عادی ساخته شده بود — پس روحی
   نبود که پل بگذارد، و تلگرام همان را «قسمت ۴۹ با صدای رضوی» نامید. */
{
  const mkFold = (nm, per) => {
    const f = OUT.createFolder(nm);
    f.createFile('قسمت ۱ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
    const ep = { title: 'ت' };
    if (per !== undefined) ep.__persona = per;
    f.createFile('_episode.json', JSON.stringify({ ep: ep }), 'application/json');
    return f;
  };
  const fSoul = mkFold('روح‌دار', { key: 'razavi', name: 'بهروز رضوی' });
  const fPlain = mkFold('خوانشِ عادی', null);
  const fOther = mkFold('صدای دیگری', { key: 'goldooz', name: 'گلدوز' });
  const fOld = mkFold('پیش از ثبت', undefined);

  ok('۲۲.۱ قسمتی که با شیوهٔ خواندنِ خودش خوانده شده: «روح»',
     vbrSoul_(fSoul.getId(), 'razavi').state === 'روح',
     JSON.stringify(vbrSoul_(fSoul.getId(), 'razavi')));
  ok('۲۲.۲ خوانشِ عادی: «رنگ‌تنها» — و علتش نوشته می‌شود',
     vbrSoul_(fPlain.getId(), 'razavi').state === 'رنگ‌تنها' &&
     /خوانشِ عادی/.test(vbrSoul_(fPlain.getId(), 'razavi').why),
     JSON.stringify(vbrSoul_(fPlain.getId(), 'razavi')));
  ok('۲۲.۳ شیوهٔ خواندنِ گویندهٔ دیگر هم «رنگ‌تنها» است و نامش می‌آید',
     vbrSoul_(fOther.getId(), 'razavi').state === 'رنگ‌تنها' &&
     vbrSoul_(fOther.getId(), 'razavi').why.indexOf('گلدوز') !== -1,
     JSON.stringify(vbrSoul_(fOther.getId(), 'razavi')));
  /* ══ «نامعلوم» ≠ «نه» ══
     قسمت‌های پیش از این نسخه `__persona` را در پرونده ندارند، چون هیچ‌جا
     نوشته نمی‌شد. هشداری که برای حالتی که ممکن است سالم باشد بلند شود،
     همان هشداری است که خوانده نمی‌شود (۷٫۴۰). */
  ok('۲۲.۴ قسمتِ بی‌نشانه «نامعلوم» است، نه «رنگ‌تنها»',
     vbrSoul_(fOld.getId(), 'razavi').state === 'نامعلوم',
     JSON.stringify(vbrSoul_(fOld.getId(), 'razavi')));

  /* و از راهی که تولید می‌رود: ردیفِ صف باید خودش این را با خود ببرد،
     چون پروندهٔ قسمت همین حالا در دسترس است و ماه‌ها بعد شاید نباشد. */
  {
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    vbrAsk_('variety', 61, fPlain.getId(), 'razavi', 'قسمت ۶۱');
    const rowP = vbrRead_().items.filter((x) => String(x.key) === 'variety:61')[0];
    ok('۲۲.۵ و ردیفِ صف خودش آن را حمل می‌کند',
       !!rowP && rowP.soul === 'رنگ‌تنها' && !!rowP.soulWhy,
       rowP ? JSON.stringify({ soul: rowP.soul, why: rowP.soulWhy }) : 'ردیفی نوشته نشد');
    const stP = vbrStatus_();
    ok('۲۲.۶ و سطرِ روزانه پیش از شنیدنِ پانزده دقیقه می‌گویدش',
       stP.colourOnly === 1 && stP.line.indexOf('فقط رنگ') !== -1,
       'colourOnly=' + stP.colourOnly + ' · ' + stP.line);
    ok('۲۲.۷ ولی این ایراد شمرده نمی‌شود — تبدیل درست کار کرده',
       stP.ok === true,
       'نتیجه نیمهٔ کار است، ولی خرابی نیست؛ قابِ سرخ برای خرابی است');
  }

  /* ══ و تصمیمی که در پرونده نمی‌نشست ══
     `ensureCast_` و `personaEnsure_` هر دو می‌گویند تصمیم «در پروندهٔ قسمت
     می‌مانَد و اجرای بعدی همان را می‌خوانَد». هیچ‌کدام نوشته نمی‌شد:
     `writeEpisodeJson_` آخرین بار در فازِ `speak` صدا زده می‌شود و این دو
     در فازِ `audio` — بعدش — ساخته می‌شوند. */
  {
    const fRes = OUT.createFolder('از سرگیری');
    const SHOW = knownShows_()[0].name;
    personaBoardSave_('razavi', true, [SHOW], 1, 'آرام بخوان', '', '', []);
    writeEpisodeJson_(fRes, { ep: { title: 'ت' } });          // فازِ speak
    const meta1 = ytEpisodeMeta_(fRes);
    const p1 = personaEnsure_(meta1.ep, SHOW, 1);
    ok('۲۲.۸ در فازِ صدا تصمیم گرفته می‌شود', !!p1 && p1.key === 'razavi',
       JSON.stringify(p1));
    epDecisionsSave_(fRes, meta1, meta1.ep, writeEpisodeJson_);
    // و حالا ردیف خاموش می‌شود — یعنی همان چیزی که وسطِ ساختِ یک قسمت
    // می‌تواند بشود (یا فردا شب، وقتی قسمت از سر گرفته می‌شود).
    personaBoardSave_('razavi', false, [SHOW], 1, 'آرام بخوان', '', '', []);
    const meta2 = ytEpisodeMeta_(fRes);
    const p2 = personaEnsure_(meta2.ep, SHOW, 1);
    ok('۲۲.۹ از سرگیری تصمیم را از نو نمی‌گیرد',
       !!p2 && p2.key === 'razavi',
       'گرفت: ' + JSON.stringify(p2) + ' — بی ذخیره، `personaEnsure_` شیت را ' +
       'از نو می‌خوانَد و نیمهٔ دومِ قسمت با خوانشِ دیگری ساخته می‌شود');
    ok('۲۲.۱۰ و بارِ دوم چیزی دوباره نوشته نمی‌شود',
       epDecisionsSave_(fRes, meta2, meta2.ep, writeEpisodeJson_) === false,
       'هر از سرگیری یک نوشتنِ درایوی برای داده‌ای که عوض نشده');
    /* و `null` هم یک تصمیم است: «امروز صدای مهمانی نبود». `undefined` را
       JSON دور می‌ریزد و `personaEnsure_` همان را «تصمیم گرفته نشده»
       می‌خوانَد، یعنی از نو خواندنِ شیت. */
    const fNull = OUT.createFolder('بی مهمان');
    writeEpisodeJson_(fNull, { ep: { title: 'ت' } });
    const mN = ytEpisodeMeta_(fNull);
    personaEnsure_(mN.ep, 'برنامه‌ای که نیست', 1);
    epDecisionsSave_(fNull, mN, mN.ep, writeEpisodeJson_);
    ok('۲۲.۱۱ «مهمانی نبود» هم ذخیره می‌شود، نه اینکه جا بیفتد',
       ytEpisodeMeta_(fNull).ep.__persona === null,
       'گرفت: ' + JSON.stringify(ytEpisodeMeta_(fNull).ep.__persona));
  }
}

console.log('\n══ ۲۳) نمونهٔ سبک باید بلند باشد، وگرنه پرسش را نمی‌سنجد (۷٫۷۳) ══');
/* «صحبتِ من قبلاً هم همین بود که در صوت‌های کوتاه‌مدت نمی‌شه تشخیص داد.»
   او درست می‌گفت: آنچه دیده بود حاضر بودنِ یک ویژگی در ~۹۸٪ واژه‌های
   **پانزده دقیقه** بود، و `STYLE_PROBE_LINE` ~۲۰ ثانیه است. سنجه‌ای که
   بازه‌اش از خودِ پدیده کوتاه‌تر باشد هیچ‌وقت آن را نمی‌بیند. */
{
  const rd0 = ytRenderRead_();
  const keep0 = rd0.items.slice();
  const fLong = OUT.createFolder('قسمتِ متن‌دار');
  const segs = [];
  /* بیست بخش، نه نُه: مجموعِ متن باید از سقف **بیشتر** باشد وگرنه بُرشی
     رخ نمی‌دهد و سنجهٔ «وسطِ جمله بریده نمی‌شود» چیزی را نمی‌سنجد — نگارشِ
     اول همین‌جا با ۲٬۸۷۰ نویسه در برابرِ سقفِ ۴٬۰۰۰ سبز مانْد حتی وقتی
     `styleProbeCut_` را برداشتم. */
  for (let i = 0; i < 20; i++) {
    segs.push({ h: 'h' + i, t: 'شَبی از شَب‌هایِ پاییز بود و بادِ سَرد پُشتِ ' +
      'پَنجِره ایستاده بود و نِمی‌رَفت شمارهٔ ' + i + '. ' +
      'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد و ایستاد. '.repeat(4) });
  }
  fLong.createFile('_episode.json',
    JSON.stringify({ ep: { title: 'ت', __speakSegs: segs } }), 'application/json');
  const rd1 = ytRenderRead_();
  rd1.items = [{ key: 'variety:77', show: 'variety', ep: '77',
                 folderId: fLong.getId(), title: 'هفتادوهفت' }];
  ytRenderSave_(rd1);
  const pk = styleProbeText_();
  ok('۲۳.۱ متن از یک قسمتِ واقعی می‌آید، و گفته می‌شود از کدام',
     pk.short === false && pk.text !== STYLE_PROBE_LINE &&
     pk.from.indexOf('77') !== -1,
     'از: «' + pk.from + '» · ' + pk.chars + ' نویسه');
  ok('۲۳.۲ و به‌قدری بلند که «همه‌جا» از «جابه‌جا» جدا شود',
     pk.chars >= 900 && pk.chars <= Number(CFG.STYLE_PROBE_CHARS),
     pk.chars + ' نویسه در برابرِ سقفِ ' + CFG.STYLE_PROBE_CHARS +
     ' — یک سطرِ ۲۵۰ نویسه‌ای ~۲۰ ثانیه است و همان چیزی است که او گفت کافی نیست');
  ok('۲۳.۳ وسطِ جمله بریده نمی‌شود',
     '.!؟…'.indexOf(pk.text.charAt(pk.text.length - 1)) !== -1,
     'آخرین نویسه: «' + pk.text.slice(-1) + '» — متنی که وسطِ جمله قطع شود ' +
     'خودش یک عیبِ شنیدنی است');
  ok('۲۳.۴ و چند تکه می‌شود، با همان شکنندهٔ خودِ قسمت',
     splitForTts_(pk.text).length > 1,
     'تکه‌ها: ' + splitForTts_(pk.text).length +
     ' — یک تکه یعنی متن هنوز کوتاه است');
  /* ══ سقوطِ خاموش به نسخهٔ آسانِ یک آزمون، از شکستِ آزمون بدتر است ══
     همان قاعدهٔ `embSelfTest_`: وقتی مدل نیست، حالتش **گفته** می‌شود. */
  {
    const rd2 = ytRenderRead_(); rd2.items = []; ytRenderSave_(rd2);
    const pk2 = styleProbeText_();
    ok('۲۳.۵ متنِ بلندی نبود ⇒ سقوط به سطرِ کوتاه، ولی با اعلام',
       pk2.short === true && pk2.text === STYLE_PROBE_LINE && !!pk2.why,
       JSON.stringify({ short: pk2.short, why: pk2.why }));
  }
  const rd3 = ytRenderRead_(); rd3.items = keep0; ytRenderSave_(rd3);
}

console.log('\n══ ۲۴) رنگ و روح روی یک قسمتِ ساخته‌شده — بی تولیدِ دوبارهٔ کلِ قسمت (۷٫۷۴) ══');
/* پرسشِ خودش: «برای گلدوز هم می‌تونم همین کار رو بکنم ولی رنگ و روح با هم
   باشه؟ چجوری؟» جوابِ ۷٫۷۳ «نه، مگر قسمتِ تازه‌ای تولید شود» بود، چون خوانش
   در صوتِ موجود پخته است. این تابع راهِ سوم است: متنِ **خودِ** آن قسمت با
   شیوهٔ خواندنِ همان گوینده خوانده می‌شود و از راهِ عادیِ پل رنگ می‌گیرد. */
{
  const SHOW = knownShows_()[0].name;
  const realTry = global.ttsChunkTry_;
  const realSet = global.styleProbeSet_;
  let cues = [], flags = [];
  const withCueSeen = [];
  const saidTexts = [];
  global.ttsChunkTry_ = function (text, style, voice, withCue) {
    cues.push(String(style || ''));
    saidTexts.push(String(text || ''));
    withCueSeen.push(withCue);
    return Buffer.alloc(24000 * 2 * 8).toString('base64');   // ~۸ ثانیه در هر تکه
  };
  global.styleProbeSet_ = function (v) { flags.push(v); return realSet(v); };

  // قسمتی که متنِ اعراب‌دارش در پروندهٔ خودش هست
  const fEp = OUT.createFolder('قسمتِ روح‌آزما');
  const segs = [];
  for (let i = 0; i < 20; i++) {
    segs.push({ h: 'h' + i, t: 'شَبی از شَب‌هایِ پاییز بود و بادِ سَرد پُشتِ ' +
      'پَنجِره ایستاده بود شمارهٔ ' + i + '. ' +
      'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد و ایستاد. '.repeat(4) });
  }
  fEp.createFile('_episode.json',
    JSON.stringify({ ep: { title: 'روح‌آزما', __speakSegs: segs } }), 'application/json');
  const rdS = ytRenderRead_();
  const keepS = rdS.items.slice();
  rdS.items = [{ key: 'variety:88', show: 'variety', ep: '88',
                 folderId: fEp.getId(), title: 'هشتادوهشت' }];
  ytRenderSave_(rdS);

  // ── هیچ تیکی نیست: رد می‌شود و می‌گوید چه باید کرد ──
  personaBoardSave_('razavi', false, [SHOW], 1, 'آرام و شمرده بخوان', '', '', []);
  const r0 = runVoiceSoulTest();
  ok('۲۴.۱ بی تیک، رد می‌شود و ستون را نام می‌برد',
     r0.ok === false && r0.why.indexOf('تولیدشده') !== -1,
     JSON.stringify(r0));

  // ── تیک هست ولی شیوهٔ خواندن خالی است: **نام‌برده** می‌شود، نه بی‌صدا ──
  /* همان قاعدهٔ personaOnceParse_ (۷٫۴۱): او تیک زده و منتظرِ چیزی است؛
     سکوت یعنی هرگز نمی‌فهمد چرا نیامد. */
  {
    /* تیک از راهِ خودِ تخته نوشته می‌شود، نه با setValueِ خام: قالبِ آن سلول
       «نامِ برنامه + شمارهٔ فارسی» است و نوشتنِ «variety:88» در آن هرگز
       parse نمی‌شود. نگارشِ اولِ همین سنجه همین کار را کرد و «هیچ تیکی
       نیست» گرفت — یعنی راهی جز آن که نامش را می‌برد رفته بود (۷٫۴۴). */
    personaBoardSave_('razavi', false, [SHOW], 1, 'آرام و شمرده بخوان', '', '',
                      ['variety:88']);
    const sh = personaTab_();
    const rw = personaRows_(sh);
    let at = 0;
    for (let i = 0; i < rw.length; i++) {
      if (String(rw[i][PC.KEY - 1]).trim() === 'razavi') { at = i + 2; break; }
    }
    sh.getRange(at, PC.STYLE).setValue('');
    const rNo = runVoiceSoulTest();
    ok('۲۴.۲ تیکِ بی شیوهٔ خواندن، با نام رد می‌شود',
       rNo.ok === false && rNo.why.indexOf('razavi') + rNo.why.indexOf('رضوی') > -2 &&
       rNo.why.indexOf('شیوهٔ خواندن') !== -1,
       JSON.stringify(rNo));
    sh.getRange(at, PC.STYLE).setValue('آرام و شمرده بخوان');
  }

  // ── و حالا کارِ واقعی ──
  const q0 = vbrRead_(); q0.items = []; vbrSave_(q0);
  cues = []; flags = [];
  const r1 = runVoiceSoulTest();
  ok('۲۴.۳ نمونه ساخته شد و به صفِ پل رفت',
     r1.ok === true && r1.seconds > 20 && r1.cut === 0,
     JSON.stringify({ ok: r1.ok, sec: r1.seconds, cut: r1.cut, why: r1.why }));
  ok('۲۴.۴ و با شیوهٔ خواندنِ **خودِ او** خوانده شد، نه با لحنِ عمومی',
     cues.length > 1 && cues.every((c) => c.indexOf('آرام و شمرده بخوان') !== -1),
     'تکه‌ها: ' + cues.length + ' · ' + JSON.stringify(cues.slice(0, 2)) +
     ' — همین «روح» است؛ بی آن این تابع همان کارِ پل را دوباره می‌کرد');
  ok('۲۴.۵ پرچمِ سبک پیش از **هر** تکه دوباره مهر خورد',
     flags.filter((f) => f === true).length === cues.length,
     'مهر: ' + flags.filter((f) => f === true).length + ' برای ' + cues.length +
     ' تکه — TTL پنج دقیقه است و انقضای وسطِ کار یعنی نیمهٔ دومِ نمونه بی روح');
  ok('۲۴.۶ و در پایان پرچم برداشته شد',
     flags[flags.length - 1] === null || flags[flags.length - 1] === undefined,
     'آخرین مهر: ' + String(flags[flags.length - 1]) +
     ' — اجرایی که پرچم را جا بگذارد، موتور را در حالتی می‌گذارد که کسی انتخابش نکرده');

  const rowS = vbrRead_().items[0];
  ok('۲۴.۷ ردیفِ صف «روح» دارد، نه «نامعلوم»',
     !!rowS && rowS.soul === 'روح',
     rowS ? JSON.stringify({ soul: rowS.soul, why: rowS.soulWhy }) : 'ردیفی نوشته نشد');
  /* پوشهٔ نمونه `_episode.json` ندارد، پس `vbrSoul_` درست می‌گفت «نامعلوم» —
     ولی ما می‌دانیم، چون همین حالا خودمان خواندیمش. */
  ok('۲۴.۸ و برچسب دارد، پس کپشن ادعا نمی‌کند خودِ قسمت است',
     !!rowS && String(rowS.label || '').indexOf('نمونه') !== -1 &&
     vbrOutName_(rowS, 'بهروز رضوی').indexOf('نمونه') !== -1,
     rowS ? ('label=' + rowS.label + ' · file=' + vbrOutName_(rowS, 'بهروز رضوی')) : '—');
  ok('۲۴.۹ فایلِ صوتی «کامل» در نامش دارد، وگرنه پل پیدایش نمی‌کند',
     !!(rowS && rowS.audio && rowS.audio.length === 1 &&
        String(rowS.audio[0].name).indexOf('کامل') !== -1),
     rowS ? JSON.stringify((rowS.audio || []).map((a) => a.name)) : '—');
  /* ══ ۲۴.۱۱ — نمونه از همان نگهبانی می‌گذرد که قسمتِ منتشرشده (۸.۰۷) ══
   * ۱ اکتبر صاحبِ برنامه در نمونهٔ ۶دقیقه‌ایِ قسمتِ ۵۳ شنید که گوینده دستورِ
   * لحن را **در چند جا** می‌خوانَد — و هیچ‌جا صدا درنیامد. علت یک نام بود:
   * این مسیر `ttsChunkTry_` را صدا می‌زد و مسیرِ قسمتِ واقعی `ttsChunk_` را،
   * و نگهبانِ شنیداری (`ttsGuarded_`) فقط روی دومی است. پس عیبی که در تولید
   * گرفته می‌شد، در همان فایلی که قرار بود **قضاوت** شود می‌مانْد.
   *
   * رفتاری سنجیده می‌شود، نه با grep: وارسیِ شنیداری وادار می‌شود بگوید
   * «دستور خوانده شد»، و ادعا این است که همان تکه **بی‌دستور** از نو ساخته
   * شد — یعنی نگهبان روی این راه هست. */
  {
    const q1 = vbrRead_(); q1.items = []; vbrSave_(q1);
    const realLeak = global.ttsCueLeaked_;
    const keepVer = CFG.TTS_CUE_VERIFY;
    CFG.TTS_CUE_VERIFY = true;
    let asked = 0;
    global.ttsCueLeaked_ = function () {
      asked++;
      return asked === 1 ? { leaked: true, heard: 'با صدای گویندهٔ حرفه‌ای…' }
                         : { leaked: false, heard: '' };
    };
    withCueSeen.length = 0;
    const rL = runVoiceSoulTest();
    ok('۲۴.۱۶ نمونه از همان نگهبانِ لو‌رفتنِ دستور می‌گذرد که قسمتِ منتشرشده',
       asked > 0 && withCueSeen.indexOf(false) !== -1,
       'وارسیِ شنیداری ' + asked + ' بار پرسید · withCue: ' +
       JSON.stringify(withCueSeen.slice(0, 6)) + ' — بی این، همان چیزی که ' +
       'قرار است قضاوت شود، خودش عیب را دارد');
    ok('۲۴.۱۶-ب و نمونه با وجودِ لو‌رفتن ساخته می‌شود، نه اینکه زمین بخورد',
       rL && rL.ok === true, JSON.stringify({ ok: rL && rL.ok, why: rL && rL.why }));
    global.ttsCueLeaked_ = realLeak;
    CFG.TTS_CUE_VERIFY = keepVer;
    /* ══ حالتی که این بند ساخت، نباید به بندهای بعدی سرریز کند ══
       نگارشِ اول مهرِ `TTS_CUE_DROP_AT` را جا گذاشت و §۲۷ سرخ شد: آن‌جا
       `vbrSoulTag_` شاخهٔ «رویدادِ انداختن» را می‌گرفت نه شاخهٔ «پرچمِ وسطِ
       ساخت»، و متنِ `soulWhy` عوض می‌شد. همان تلهٔ ۷٫۸۹ — نشتِ تنظیم از یک
       بلوک به بلوکِ بعد — این بار با یک Script Property. */
    props_().deleteProperty(PK.TTS_CUE_DROP_AT);
  }

  /* ══ ۲۴.۱۷ — نمونه‌ای که برای داوریِ **لحن** است، باید لحن داشته باشد ══
   * ۸.۰۸ نشانه‌گذاریِ لحن را آورد، و این نمونه از متنِ **ذخیره‌شدهٔ** قسمت
   * ساخته می‌شود — متنی که پیش از ۸.۰۸ نوشته شده و آن نشانه‌ها را ندارد،
   * چون تا دیروز از `verifySpeak_` نمی‌گذشتند. بی این مرحله، نمونهٔ «لحن»
   * همان متنِ صافِ دیروز را می‌خواند: ۷.۸۶ عیناً — شناسه‌ای که پارامترِ
   * زیرِ سنجش را در خودش ندارد.
   *
   * ادعا رفتاری است: **متنی که به گفتارساز رسید** نشانهٔ گویا دارد. */
  {
    const qM = vbrRead_(); qM.items = []; vbrSave_(qM);
    const realGem = global.geminiText_;
    let askedMk = 0;
    global.geminiText_ = function (pr) {
      if (String(pr).indexOf('فقط نشانه‌گذاریِ لحن') === -1) {
        return realGem ? realGem.apply(null, arguments) : null;
      }
      askedMk++;
      /* همان واژه‌ها، فقط نشانه‌گذاری‌شده — پس از `verifySpeak_` می‌گذرد.
         آخرین نقطهٔ هر جمله به «؟» و «!» و «…» و «—» عوض می‌شود. */
      const src = String(pr).split('\n\n').pop();
      let n = 0;
      const out = src.replace(/\./g, () => ['!', '؟', '…', '.'][(n++) % 4]);
      return { t: out };
    };
    saidTexts.length = 0;
    const rP = runVoiceSoulTest();
    const prMk = speakProsody_(saidTexts.join(' '));
    /* ══ از ۸.۲۲ نشانه‌گذاری **بند به بند** است، پس یک فراخوان نیست ══
       ادعا همان است (متنی که به گفتارساز رسید نشانه دارد)؛ شرطِ «دقیقاً یک
       فراخوان» باورِ پیش از ۸.۲۲ را رمز کرده بود و با درمانِ تازه سرخ شد
       روی کدِ **درست** (۷.۶۸). حالا شمارِ فراخوان با شمارِ بندها سنجیده
       می‌شود — که خودش ضمانتِ تازه است: یک بندِ خراب بقیه را نمی‌بَرد. */
    ok('۲۴.۱۷ متنی که به گفتارساز رسید نشانهٔ لحن دارد، نه فقط نقطه',
       askedMk >= 1 && prMk.rich > 0 && prMk.kinds >= 2,
       'پرسش: ' + askedMk + ' · گویا=' + prMk.rich + ' · انواع=' + prMk.kinds +
       ' · ' + JSON.stringify(prMk.has) + ' — بی این، نمونهٔ «لحن» متنِ صافِ ' +
       'دیروز را می‌خواند و چیزی را که نامش را دارد نمی‌سنجد');
    /* ۲۴.۱۷-ب با شکستنِ عمدی روی ۲۴.۳ نشست، نه روی خودش (§۲۴ زودتر می‌دود و
       «نمونه ساخته شد» را از قبل می‌پرسد). ثبت می‌شود، نه ادعا (۷٫۷۴). */
    ok('۲۴.۱۷-ب و نمونه ساخته شد — نشانه‌گذاری جلوِ ساخت را نمی‌گیرد',
       !!(rP && rP.ok === true && rP.seconds > 20),
       JSON.stringify({ ok: rP && rP.ok, sec: rP && rP.seconds, why: rP && rP.why }));

    /* و وقتی ترمیم نگیرد، نمونه همان‌طور ساخته می‌شود و پیام می‌گویدش —
       سکوت این‌جا یعنی او فایلی می‌گیرد و نمی‌داند لحنش نیامده (۷.۷۹). */
    const qN = vbrRead_(); qN.items = []; vbrSave_(qN);
    global.geminiText_ = function (pq) {
      if (String(pq).indexOf('فقط نشانه‌گذاریِ لحن') === -1) {
        return realGem ? realGem.apply(null, arguments) : null;
      }
      /* نشانه‌دار **و** واژه‌عوض‌شده: اگر سدِ `verifySpeak_` برداشته شود این
         متن می‌نشیند و `گویا` بالا می‌رود، پس این سنجه همان سد را می‌سنجد و
         نه فقط «زمین نخوردن». و کوتاه نیست، وگرنه ۲۴.۳ زودتر سرخ می‌شود. */
      return { t: ('واژه‌هایِ کاملاً دیگری که از سدِ وارسی نمی‌گذرند! ' +
                   'و این جملهٔ دوم هم همان‌قدر بیگانه است؟ ' +
                   'سومی — که هیچ ربطی ندارد — تمام… ').repeat(40) };
    };
    saidTexts.length = 0;
    const rQ = runVoiceSoulTest();
    const prNo = speakProsody_(saidTexts.join(' '));
    ok('۲۴.۱۷-پ جوابِ ردشده نمونه را زمین نمی‌زند — متنِ قسمت همان‌طور خوانده می‌شود',
       !!(rQ && rQ.ok === true) && prNo.rich === 0,
       JSON.stringify({ ok: rQ && rQ.ok, gooya: prNo.rich }));
    /* ══ ۲۴.۱۸ — حالت‌ها از همان درِ تولیدِ نمونه (۸.۲۴) ══
       ادعا سه‌تاست و هر سه رفتاری: تکهٔ حالت‌دار با **دستورِ همان حال**
       ساخته می‌شود؛ متنی که به گفتارساز می‌رسد هیچ نامی از حالت‌ها ندارد؛ و
       جای هر حالت در فایل به ردیفِ صف می‌رسد تا در کپشن گفته شود. */
    {
      const qS = vbrRead_(); qS.items = []; vbrSave_(qS);
      global.geminiText_ = function (pq) {
        const P = String(pq);
        if (P.indexOf('کدام جمله‌ها حالِ خاصی می‌خواهند') !== -1) {
          return { spans: [{ from: '3', to: '3', k: 'آرام' },
                           { from: '6', k: 'مکث' },
                           { from: '8', to: '9', k: 'کمی‌بلند' }] };
        }
        return realGem ? realGem.apply(null, arguments) : null;
      };
      cues.length = 0; saidTexts.length = 0;
      const rS = runVoiceSoulTest();
      const soft = cues.filter(c => c.indexOf('آرام و با صدای پایین‌تر بخوان') !== -1).length;
      const louder = cues.filter(c => c.indexOf('کمی بلندتر و محکم‌تر') !== -1).length;
      const names = saidTexts.filter(t => /«(آرام|مکث|کمی‌بلند)»|⟦/.test(t)).length;
      const rowS = (vbrRead_().items || [])[0] || {};
      ok('۲۴.۱۸ تکهٔ حالت‌دار با دستورِ همان حال ساخته شد',
         !!(rS && rS.ok) && soft === 1 && louder >= 1,
         JSON.stringify({ ok: rS && rS.ok, soft, louder, n: cues.length }));
      ok('۲۴.۱۸-ب و هیچ نامِ حالتی به گفتارساز نرسید', names === 0, String(names));
      /* ۲۴.۱۸-ب۲ — شکستنِ عمدیِ «مکث را به گفتارساز بفرست» روی ۲۴.۱۸-ب **ننشست**،
         چون آن سنجه نام را درونِ گیومه می‌گشت و این شکستن واژهٔ برهنه می‌فرستد.
         ثبت می‌شود و سنجهٔ درست جایش می‌آید: هیچ تکه‌ای که به گفتارساز رسید
         **خودش** نامِ یک حالت نیست — مکث سکوت است، نه یک واژه. */
      const bare = saidTexts.filter(t => SPEAK_SPANS.some(d => String(t).trim() === d.k));
      ok('۲۴.۱۸-ب۲ مکث سکوت است — هیچ تکه‌ای نامِ برهنهٔ حالت نیست',
         bare.length === 0, JSON.stringify(bare));
      ok('۲۴.۱۸-پ جای حالت‌ها در ردیفِ صف نشست، با مکث',
         /آرام/.test(String(rowS.spanLine)) && /مکث/.test(String(rowS.spanLine)) &&
         /کمی‌بلند/.test(String(rowS.spanLine)),
         String(rowS.spanLine));
      /* و مدلی که جواب ندهد، نمونه را نمی‌اندازد — فقط بی حالت، و می‌گوید چرا. */
      const qS2 = vbrRead_(); qS2.items = []; vbrSave_(qS2);
      global.geminiText_ = function (pq) {
        if (String(pq).indexOf('کدام جمله‌ها حالِ خاصی می‌خواهند') !== -1) throw new Error('quota');
        return realGem ? realGem.apply(null, arguments) : null;
      };
      const rS2 = runVoiceSoulTest();
      const rowS2 = (vbrRead_().items || [])[0] || {};
      ok('۲۴.۱۸-ت مدلِ غایب ⇒ نمونه ساخته می‌شود، بی حالت، با علت',
         !!(rS2 && rS2.ok) && /هیچ/.test(String(rowS2.spanLine)) && /quota/.test(String(rowS2.spanLine)),
         String(rowS2.spanLine));

      /* ══ ۲۴.۲۱ — دستور نرسید ⇒ حالت در خودِ صدا، و کپشن راستش را می‌گوید (۸.۲۷) ══
         ۳ اکتبر: نمونهٔ رضوی برچسبِ «لحن از نشانه‌ها» داشت و کپشن جای نُه حالت
         را با ثانیه نوشته بود؛ او همان ثانیه‌ها را گوش داد و هیچ نشنید. این‌جا
         گفتارساز همان کاری را می‌کند که مدلِ واقعی با فیلدِ دستور می‌کند —
         مهرِ «دستور انداخته شد» با همان تابعِ تولید (`ttsCueDropMark_`) و ساختِ
         بی‌دستور — و صدا سینوسیِ یکنواخت است تا پردازش در **خودِ فایل** دیده شود. */
      const qS3 = vbrRead_(); qS3.items = []; vbrSave_(qS3);
      global.geminiText_ = function (pq) {
        if (String(pq).indexOf('کدام جمله‌ها حالِ خاصی می‌خواهند') !== -1) {
          return { spans: [{ from: '3', to: '3', k: 'آرام' },
                           { from: '4', to: '4', k: 'بلند' },
                           { from: '5', to: '5', k: 'لبخند' },
                           { from: '6', k: 'مکث' }] };
        }
        return realGem ? realGem.apply(null, arguments) : null;
      };
      const tryKeep19 = global.ttsChunkTry_;
      const sentD = [];
      global.ttsChunkTry_ = function (text, style, voice, withCue) {
        sentD.push(String(text));
        if (withCue !== false) ttsCueDropMark_();
        const n = 24000 * 4, b = Buffer.alloc(n * 2);
        for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(3000 * Math.sin(2 * Math.PI * 180 * i / 24000)), i * 2);
        return b.toString('base64');
      };
      const rD = runVoiceSoulTest();
      global.ttsChunkTry_ = tryKeep19;
      const rowD = (vbrRead_().items || [])[0] || {};
      const lineD = String(rowD.spanLine || '');
      ok('۲۴.۲۱ دستور نرسید ⇒ «آرام» در صدا ساخته و نام برده شد؛ «لبخند» جایش ادعا نشد',
         !!(rD && rD.ok) && /آرام [۰-۹:]+ \(در صدا\)/.test(lineD.split('\n')[0]) &&
         lineD.split('\n')[0].indexOf('لبخند') === -1 && /اجرا نشد[^\n]*لبخند/.test(lineD),
         lineD.replace(/\n/g, ' ⏎ '));
      /* ۲۴.۲۱-پ — «بلند» در صدا هیچ نمی‌سازد (۸.۳۶)، ولی «اجرا نشد» هم نیست: متنی
         که واقعاً به گفتارساز رفت با «!» تمام شد، و کپشن همین را می‌گوید. */
      ok('۲۴.۲۱-پ «بلند» بی دستور: متنِ رفته با «!» و کپشن «فقط با نشانه»',
         /بلند [۰-۹:]+ \(فقط با نشانه\)/.test(lineD.split('\n')[0]) &&
         sentD.some(t => /!\s*$/.test(t)) && !/اجرا نشد[^\n]*بلند/.test(lineD),
         JSON.stringify(sentD.map(t => t.slice(-12))));
      /* ۲۴.۲۱-ب — و پردازش در **فایلِ ساخته‌شده** هست، نه فقط در جمله — و از
         ۸.۳۶ **بلندی نیست**: ۴ اکتبر او در هر دو نمونه حدودِ ۳:۴۰ شنید که «صدا یهو
         کم شد و بعد زیاد شد». پس دو ادعا روی خودِ فایل: هیچ پنجره‌ای بلندی‌اش با
         بقیه فرق ندارد، و تکهٔ «آرام» واقعاً کشیده‌تر است (هر تکهٔ بدَل چهار ثانیه
         است؛ با سرعتِ ۰٫۹۵ یکی‌شان حدودِ ۵٪ بلندتر می‌شود). */
      let dbGap = null, stretch = null;
      try {
        const fD = DriveApp.getFolderById(String(rowD.folderId));
        const itD = fD.getFiles();
        let wav = null;
        while (itD.hasNext()) { const f = itD.next(); if (/کامل\.wav$/.test(f.getName())) wav = f; }
        const by = Buffer.from(wav.getBlob().getBytes().map(v => (v < 0 ? v + 256 : v)));
        const pcmD = [];
        for (let i = 54; i + 1 < by.length; i += 2) pcmD.push(by.readInt16LE(i));
        /* پنجره‌ای که سکوتِ «مکث» در آن افتاده حساب نمی‌شود — آن آهسته‌تر است
           چون خاموش است، نه چون پردازش شده. */
        const W = 24000, r = [];
        for (let a = 0; a + W <= pcmD.length; a += W) {
          let e = 0, run = 0, hole = false;
          for (let j = a; j < a + W; j++) {
            e += pcmD[j] * pcmD[j];
            run = pcmD[j] === 0 ? run + 1 : 0;
            if (run >= 240) hole = true;
          }
          if (!hole && e > 0) r.push(Math.sqrt(e / W));
        }
        dbGap = 20 * Math.log10(Math.max.apply(null, r) / Math.min.apply(null, r));
        let silent = 0, run2 = 0;
        for (let j = 0; j <= pcmD.length; j++) {
          if (j < pcmD.length && pcmD[j] === 0) { run2++; continue; }
          if (run2 >= 240) silent += run2;
          run2 = 0;
        }
        const voiced = (pcmD.length - silent) / 96000;
        stretch = voiced - Math.floor(voiced);
      } catch (eW) { dbGap = 'خطا: ' + eW.message; }
      ok('۲۴.۲۱-ب بلندیِ فایل صاف است و «آرام» در خودِ فایل کشیده‌تر است — نه آهسته‌تر',
         typeof dbGap === 'number' && dbGap < 0.5 && stretch > 0.03 && stretch < 0.07,
         String(typeof dbGap === 'number' ? 'فاصلهٔ بلندی ' + dbGap.toFixed(2) + 'dB · کشش ' + stretch.toFixed(3) : dbGap));
    }
    /* ۲۴.۲۲ — و پرچمِ تکه‌ای را **خودِ** `ttsChunkTry_` می‌زند، نه بدَلِ بالا:
       مدلی که فیلد را رد کرده و پیشوند خاموش ⇒ ساختِ بی‌دستور و پرچم. و مدلی
       که می‌پذیرد ⇒ پرچم پایین. بی این، ۲۴.۲۱ فقط بدَلِ خودش را می‌سنجید. */
    {
      const keepBad = global.ttsCueBadNow_, keepOff = global.ttsCueOffNow_,
            keepFetch = global.geminiFetch_, keepVer = CFG.TTS_CUE_VERIFY;
      CFG.TTS_CUE_VERIFY = false;
      const keyWas = global.__PROPS['GEMINI_API_KEY'];
      global.__PROPS['GEMINI_API_KEY'] = 'TEST';
      global.geminiFetch_ = function () {
        return { candidates: [{ content: { parts: [{ inlineData: {
          data: Buffer.alloc(4800).toString('base64') } }] } }] };
      };
      global.ttsChunkTry_ = realTry;
      global.ttsCueBadNow_ = () => true; global.ttsCueOffNow_ = () => false;
      ttsGuarded_('متنِ آزمون', 'آرام بخوان', CFG.TTS_VOICE);
      const dropped = TTS_CUE_DROPPED_;
      global.ttsCueBadNow_ = () => false;
      ttsGuarded_('متنِ آزمون', 'آرام بخوان', CFG.TTS_VOICE);
      const kept = TTS_CUE_DROPPED_;
      global.ttsCueBadNow_ = keepBad; global.ttsCueOffNow_ = keepOff;
      global.geminiFetch_ = keepFetch; CFG.TTS_CUE_VERIFY = keepVer;
      if (keyWas === undefined) delete global.__PROPS['GEMINI_API_KEY'];
      else global.__PROPS['GEMINI_API_KEY'] = keyWas;
      global.ttsChunkTry_ = function (text, style, voice, withCue) {
        cues.push(String(style || '')); saidTexts.push(String(text || '')); withCueSeen.push(withCue);
        return Buffer.alloc(24000 * 2 * 8).toString('base64');
      };
      ok('۲۴.۲۲ پرچمِ «دستورِ همین تکه نرسید» را خودِ `ttsChunkTry_` می‌زند',
         dropped === true && kept === false, JSON.stringify({ dropped, kept }));
    }
    global.geminiText_ = realGem;
    const qZ = vbrRead_(); qZ.items = []; vbrSave_(qZ);
    runVoiceSoulTest();          // ردیفِ صف را برای سنجه‌های بعدی بازمی‌سازد
    props_().deleteProperty(PK.TTS_CUE_DROP_AT);
  }

  /* ۲۴.۱۹ — گام و زیروبمِ خروجی در کپشن (۸٫۲۴): عددی که پیش از گوشِ او
     سنجیده شد. و کپشن هرگز از سقفِ تلگرام نمی‌گذرد. */
  {
    const L = vbrPitchLine_({ pitchAuto: { srcHz: 112, targetHz: 106.9, pitch: -1 },
                              f0Out: { medianHz: 61, lowPct: 65 },
                              f0Warn: 'زیروبمِ خروجی 61 هرتز' });
    ok('۲۴.۱۹ سطرِ گام: خودکار، ورودی، هدف، خروجی و هشدار',
       /گامِ خودکار/.test(L) && /112|۱۱۲/.test(L) && /107|۱۰۷/.test(L) && /⚠️/.test(L), L);
    ok('۲۴.۱۹-ب بی هیچ داده، هیچ سطری', vbrPitchLine_({}) === '');
  }

  ok('۲۴.۱۰ و پوشه‌اش در فهرستِ نام‌های شناختهٔ ریشه است',
     outRootFolderNames_().indexOf(String(CFG.VBR_SOUL_FOLDER)) !== -1,
     'بی این، همان شبِ اول یک هشدارِ «ناشناخته» برای پوشه‌ای که خودِ موتور ' +
     'ساخته (درسِ ۷٫۴۶)');
  /* ۷٫۶۷ همین را برای CFG.VBR_FOLDER («مدل‌های صدا») هم اضافه کرد، و ۷٫۶۸ —
     در ادغامی دربارهٔ موسیقی که به این فایل کاری نداشت — بی‌آنکه کسی بخواهد
     همان خط را از outRootFolderNames_ حذف کرد. هیچ سنجه‌ای مستقیماً این را
     نمی‌پرسید، پس رگرسیون دو شب بی‌صدا ماند. */
  ok('۲۴.۱۰-ب پوشهٔ کپیِ مدل‌های پل هم در همان فهرست است',
     outRootFolderNames_().indexOf(String(CFG.VBR_FOLDER)) !== -1,
     'بی این، «مدل‌های صدا» هر شب در outLayout.strays «چیزِ ناشناخته» گزارش ' +
     'می‌شود (درسِ ۷٫۶۷، رگرسیونِ ۷٫۶۸)');

  /* ══ فشارِ دوم باید سراغِ گویندهٔ بعدی برود (۷٫۷۵) ══
     او دو گوینده دارد و پرسید «برای هر دو چطور؟». با تیکِ هر دو، ۷٫۷۴ هر بار
     ردیفِ **اول** را برمی‌داشت و `vbrAsk_` با «قبلاً خواسته شده» ردش می‌کرد،
     پس نفرِ دوم هرگز نوبت نمی‌گرفت. */
  {
    /* گویندهٔ دوم. ردیف باید **وجود داشته باشد** — `personaBoardSave_` کلیدِ
       ناشناخته را رد می‌کند، و نگارشِ اولِ این سنجه همان‌جا سبز به نظر رسید
       و در واقع هنوز رضوی را می‌سنجید. */
    {
      const shP = personaTab_();
      const rowG = new Array(PERSONA_HEADERS.length).fill('');
      rowG[PC.KEY - 1] = 'goldooz';
      rowG[PC.NAME - 1] = 'محمد تقی پور گلدوز';
      shP.appendRow(rowG);
    }
    personaBoardSave_('goldooz', false, [SHOW], 1, 'گرم و نزدیک بخوان', '', '',
                      ['variety:88']);
    /* و مدلش. بی این، سنجه روی «مدل نیست» می‌ایستد — که خودش سنجهٔ ۲۴.۱۴
       است، نه این یکی. */
    const gP = outsideFolder.createFile('goldooz-e32.pth', 'PTH', 'application/octet-stream');
    const gI = outsideFolder.createFile('goldooz-e32.index', 'IDX', 'application/octet-stream');
    CFG.VBR_SEED_MODELS.goldooz = { pth: gP.getId(), index: gI.getId() };
    cues = [];
    const r2 = runVoiceSoulTest();
    ok('۲۴.۱۱ فشارِ دوم سراغِ گویندهٔ دوم می‌رود، نه همان اولی',
       r2.ok === true && r2.speaker === 'goldooz',
       JSON.stringify({ ok: r2.ok, speaker: r2.speaker, why: r2.why }) +
       ' — دکمه‌ای که بارِ دوم کار نکند، برای کسی که دو گوینده دارد نصفِ قابلیت است');
    ok('۲۴.۱۲ و با شیوهٔ خواندنِ **او**، نه اولی',
       cues.length > 0 && cues.every((c) => c.indexOf('گرم و نزدیک بخوان') !== -1),
       JSON.stringify(cues.slice(0, 1)));
    /* ══ مدلِ نبوده باید **پیش از** ساختنِ صدا جلو را بگیرد (۷٫۷۵) ══
       چهار دقیقه فراخوانِ TTS خرج کردن و بعد سرِ صف فهمیدن که مدلی نیست،
       هم هزینه است هم پیامِ دیرهنگام.

       با گویندهٔ **تازه‌ای** سنجیده می‌شود، نه با پاک‌کردنِ مدلِ گلدوز:
       `vbrModel_` بذر را در همان پوشه کپی می‌کند، پس پس از یک اجرای موفق
       فایل آنجاست و «برداشتنِ بذر» چیزی را عوض نمی‌کند. نگارشِ اول همین کار
       را کرد و چهار تکه ساخت — یعنی راهی جز آن که نامش را می‌برد رفته بود. */
    {
      const shN = personaTab_();
      const rowN = new Array(PERSONA_HEADERS.length).fill('');
      rowN[PC.KEY - 1] = 'bimodel';
      rowN[PC.NAME - 1] = 'گویندهٔ بی‌مدل';
      shN.appendRow(rowN);
      personaBoardSave_('bimodel', false, [SHOW], 1, 'خنثی بخوان', '', '',
                        ['variety:88']);
      // تیکِ آن دو برداشته می‌شود تا نوبت واقعاً به این یکی برسد
      personaBoardSave_('razavi', false, [SHOW], 1, 'آرام و شمرده بخوان', '', '', []);
      personaBoardSave_('goldooz', false, [SHOW], 1, 'گرم و نزدیک بخوان', '', '', []);
      cues = [];
      const rNo = runVoiceSoulTest();
      ok('۲۴.۱۴ مدلِ نبوده پیش از خرجِ TTS جلو را می‌گیرد، با نامِ فایل‌ها',
         rNo.ok === false && cues.length === 0 &&
         rNo.speaker === 'bimodel' && rNo.why.indexOf('bimodel.pth') !== -1,
         'تکه‌های ساخته‌شده: ' + cues.length + ' · ' + JSON.stringify(rNo));
      // و تیک‌ها برمی‌گردند برای سنجهٔ بعدی
      personaBoardSave_('bimodel', false, [SHOW], 1, 'خنثی بخوان', '', '', []);
      personaBoardSave_('razavi', false, [SHOW], 1, 'آرام و شمرده بخوان', '', '',
                        ['variety:88']);
      personaBoardSave_('goldooz', false, [SHOW], 1, 'گرم و نزدیک بخوان', '', '',
                        ['variety:88']);
    }
    // و فشارِ سوم: چیزی نمانده — و این با «تیکی نخورده» یکی نیست
    const r3 = runVoiceSoulTest();
    ok('۲۴.۱۳ فشارِ سوم می‌گوید «همه ساخته شد»، نه «تیکی نخورده»',
       r3.ok === false && r3.why.indexOf('نمونه ساخته شده') !== -1 &&
       r3.why.indexOf('تیک نخورده') === -1,
       JSON.stringify(r3) + ' — گفتنِ «تیکی نخورده» یعنی او فکر می‌کند تیکش گم شده');
  }

  /* ══ پیامِ موفقیت نباید شبیهِ خبرِ بد خوانده شود (۷٫۷۶) ══
     نگارشِ ۷٫۷۴ می‌گفت «این فایل … هنوز رنگش را نه» و صاحبِ برنامه پرسید
     «یعنی صدایی که می‌آید ناقص است؟». جمله دربارهٔ فایلِ **میانی** درست
     بود و او منطقی‌ترین چیز را خواند. پس پیام باید **اول** بگوید نتیجه
     کامل است، بعد توضیح بدهد فایلِ درایو مرحلهٔ اول است — ترتیب خودش
     بخشی از ادعاست. */
  {
    const realUi = global.ui_;
    let said = '';
    global.ui_ = () => ({ alert: function (t, m) { said = String(m); },
                          ButtonSet: { OK: 1 } });
    const q8 = vbrRead_(); q8.items = []; vbrSave_(q8);
    personaBoardSave_('bimodel', false, [SHOW], 1, 'خنثی بخوان', '', '', []);
    personaBoardSave_('goldooz', false, [SHOW], 1, 'گرم و نزدیک بخوان', '', '', []);
    personaBoardSave_('razavi', false, [SHOW], 1, 'آرام و شمرده بخوان', '', '',
                      ['variety:88']);
    runVoiceSoulTest();
    global.ui_ = realUi;
    const okAt = said.indexOf('رنگ و روح، هر دو را دارد');
    const midAt = said.indexOf('هنوز بی رنگِ صدا');
    ok('۲۴.۱۵ پیام اول می‌گوید نتیجه رنگ و روح هر دو را دارد، بعد توضیح می‌دهد',
       okAt !== -1 && midAt !== -1 && okAt < midAt,
       'جای «کامل است»: ' + okAt + ' · جای «هنوز بی رنگ»: ' + midAt +
       ' — «ناقص است» پیش از «کامل می‌شود» یعنی او همان اولی را می‌خوانَد');
  }

  global.ttsChunkTry_ = realTry;
  global.styleProbeSet_ = realSet;
  const rdZ = ytRenderRead_(); rdZ.items = keepS; ytRenderSave_(rdZ);
}

console.log('\n══ ۲۵) برداشتن هم مسیرِ دوم گرفت — نه فقط کارِ شبانه (۷٫۷۷) ══');
/* ══ چرا این بخش هست ══
   ۷٫۳۹ اشتراکِ صف را به `healthCheck` آورد. ۷٫۴۶ نوشتنِ صف را. هر دو
   با همین دلیل: `vbrNightly_` پشتِ `nightHas_` در کارِ شبانه است و
   شبی که نگهبان رد نشود، آن کار انجام نمی‌شود.

   و `vbrIngest_` جا ماند — یعنی **برداشتنِ خروجی** تنها یک مسیر داشت.
   صاحبِ برنامه دیشب دو ردیف تیک زد؛ صبح هر دو «در انتظار» بودند و
   تنها راهِ رسیدنشان ۰۲:۳۰ِ فردا بود. تبدیل که تمام شود خروجی روی
   release می‌نشیند و موتور تا شبِ بعد سراغش نمی‌رود: تا ۲۴ ساعت تأخیر
   برای کاری که ارزان است.

   سنجه `healthCheck` را **اجرا** می‌کند و ردیفِ واقعی را می‌خوانَد —
   نه اینکه دنبالِ نامِ تابع در متنِ کد بگردد (۷٫۴۳/۷٫۴۴/۷٫۴۶). */
{
  const ep25 = 77;
  /* پوشهٔ همان قسمتِ آزمایشیِ بالا — `vbrAudio_` از `ytAudioParts_` عبور
     می‌کند و پوشهٔ بی «کامل» را (درست) رد می‌کند؛ پوشهٔ تازه‌ساخته یعنی
     سنجه‌ای که مسیرِ دیگری می‌رود. */
  const fold25 = epFold;
  const nFiles = () => { const it = fold25.getFiles(); let n = 0;
                         while (it.hasNext()) { it.next(); n++; } return n; };
  const was25 = nFiles();
  {
    const wav25 = wavBytes;
    const ask25 = vbrAsk_('variety', ep25, fold25.getId(), 'razavi',
                          'قسمت ' + ep25);
    ok('۲۵.۰-الف درخواست در صف نشست', ask25.ok === true, ask25.why || '');
    const rf25 = UrlFetchApp.fetch;
    UrlFetchApp.fetch = function (u) {
      if (/voice-renders/.test(String(u))) {
        const items = {};
        items['variety:' + ep25] = { url: 'https://example.invalid/y.wav',
                                     minutes: 4.1, seconds: 250 };
        return { getResponseCode: () => 200,
                 getContentText: () => JSON.stringify({ items: items }) };
      }
      return { getResponseCode: () => 200, getBlob: () => blobOf(wav25) };
    };
    _vbrMapMemo = null;

    const before = vbrRead_().items.filter(x => x.key === 'variety:' + ep25)[0];
    ok('۲۵.۰ ردیف پیش از وارسیِ سلامت «در انتظار» است',
       !!before && String(before.status) === 'در انتظار',
       'گرفت: ' + (before ? before.status : 'ردیفی نیست') +
       ' — سنجه‌ای که روی صفِ خالی بدوَد هیچ‌چیز را ثابت نمی‌کند');

    const o25 = console.log; console.log = () => {};
    try { healthCheck(); } catch (e25) {} finally { console.log = o25; }
    UrlFetchApp.fetch = rf25;

    const after = vbrRead_().items.filter(x => x.key === 'variety:' + ep25)[0];
    ok('۲۵.۱ `healthCheck` خودش خروجی را برداشت، بی آنکه کارِ شبانه صدا زده شود',
       !!after && String(after.status) === 'رسید' && !!after.outId,
       'گرفت: ' + (after ? after.status : 'ردیفی نیست') +
       ' — تا وقتی تنها برداشت‌کننده پشتِ نگهبانِ شبانه باشد، خروجی تا ' +
       'فردا شب روی release می‌مانَد');

    ok('۲۵.۲ و فایل واقعاً در پوشهٔ همان قسمت نشست',
       nFiles() > was25,
       'گرفت: ' + was25 + ' → ' + nFiles() +
       ' — ردیفی که «رسید» بگوید و فایلی نگذاشته باشد، بدتر از نرسیدن است');
  }
  _vbrMapMemo = null;
}

console.log('\n══ ۲۶) برداشتِ ساعتی — تریگرِ خودش، و ارزان در نبودِ کار (۷٫۷۸) ══');
/* ══ چرا این بخش هست ══
   ۷٫۷۷ تبدیل را تند کرد: چند ردیف در یک اجرا و cronِ دوساعته. تنگنا
   جابه‌جا شد به **برداشتن** — روزی دو بار، ۰۲:۳۰ و ۱۰:۰۰. یعنی تیکِ
   ساعتِ ۱۱ تا ۰۲:۳۰ِ فردا نتیجه نمی‌دهد: پانزده ساعت برای کاری که ده
   دقیقه پیش تمام شده بود.

   وسوسه این بود که به `syncCatalog` (هر دو ساعت) اضافه شود — همان
   اشتباهِ ۷٫۶۳/۷٫۷۲: هزینه روی مسیری که کسی رویش ایستاده. و مهمان بودنِ
   اجرای کسِ دیگری همان تلهٔ ۶٫۳۷ است. پس تریگرِ خودش. */
{
  const epF26 = OUT.createFolder('قسمتِ آزمونِ برداشتِ ساعتی');
  epF26.createFile('قسمت ۱ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const quiet26 = (fn) => { const o = console.log; console.log = () => {};
    try { return fn(); } finally { console.log = o; } };

  /* در (۱): تریگر واقعاً ساخته می‌شود. نامِ تابع از `wantedTriggers_`
     خوانده می‌شود چون همان جایی است که نصب از آن می‌خوانَد. */
  quiet26(() => installTriggers());
  const handlers = ScriptApp.getProjectTriggers()
                            .map(t => String(t.getHandlerFunction()));
  ok('۲۶.۱ `installTriggers` تریگرِ برداشتِ ساعتی را می‌سازد',
     handlers.indexOf('vbrCollectHourly') !== -1,
     'گرفت: ' + JSON.stringify(handlers) +
     ' — تابعی که تریگر ندارد، دری است که هیچ‌وقت باز نمی‌شود');

  ok('۲۶.۲ و ساعتی است، نه روزانه',
     (wantedTriggers_() || []).some(w => w.fn === 'vbrCollectHourly' &&
                                        w.kind === 'hours' &&
                                        Number(w.every) === 1),
     'گرفت: ' + JSON.stringify((wantedTriggers_() || [])
       .filter(w => /vbr/i.test(String(w.fn)))));

  /* در (۲): ارزان بودنش. **خواندن** شمرده می‌شود نه زمان — ماکِ آزمون
     هابِ ۲۹ مگابایتی ندارد، پس سنجهٔ زمانی هیچ‌چیز نمی‌سنجد (۷٫۶۰/۷٫۷۲). */
  const realHub26 = global.getHub_;
  let hubN = 0;
  global.getHub_ = function () { hubN++; return realHub26.apply(null, arguments); };
  try {
    const rf26 = UrlFetchApp.fetch;
    UrlFetchApp.fetch = function (u) {
      if (/voice-renders/.test(String(u))) {
        return { getResponseCode: () => 200,
                 getContentText: () => JSON.stringify({ items: {} }) };
      }
      return { getResponseCode: () => 200, getBlob: () => blobOf(wavBytes) };
    };
    _vbrMapMemo = null;
    hubN = 0;
    quiet26(() => vbrCollectHourly());
    ok('۲۶.۳ در نبودِ جواب، هابِ ۲۹ مگابایتی خوانده نمی‌شود',
       hubN === 0,
       'گرفت: ' + hubN + ' خواندنِ هاب — ساعتی یک بار روی ۲۹ مگابایت یعنی ' +
       'همان هزینه‌ای که ۷٫۶۳ از آن مُرد');

    /* در (۳): و وقتی جوابی هست، واقعاً برمی‌داردش — از همان مسیری که
       تریگر صدا می‌زند، نه با صدا زدنِ `vbrIngest_` به‌طور مستقیم (۷٫۶۲). */
    const ep26 = 79;
    const ask26 = vbrAsk_('variety', ep26, epF26.getId(), 'razavi',
                          'قسمت ' + ep26);
    ok('۲۶.۴ درخواست در صف نشست', ask26.ok === true, ask26.why || '');
    UrlFetchApp.fetch = function (u) {
      if (/voice-renders/.test(String(u))) {
        const items = {};
        items['variety:' + ep26] = { url: 'https://example.invalid/z.wav',
                                     minutes: 3.9, seconds: 240 };
        return { getResponseCode: () => 200,
                 getContentText: () => JSON.stringify({ items: items }) };
      }
      return { getResponseCode: () => 200, getBlob: () => blobOf(wavBytes) };
    };
    _vbrMapMemo = null;
    quiet26(() => vbrCollectHourly());
    const r26 = vbrRead_().items.filter(x => x.key === 'variety:' + ep26)[0];
    ok('۲۶.۵ تریگرِ ساعتی خودش خروجی را برمی‌دارد',
       !!r26 && String(r26.status) === 'رسید' && !!r26.outId,
       'گرفت: ' + (r26 ? r26.status : 'ردیفی نیست'));
    UrlFetchApp.fetch = rf26;
  } finally {
    global.getHub_ = realHub26;
    _vbrMapMemo = null;
    try { epF26.setTrashed(true); } catch (eT26) {}
  }
}

console.log('\n══ ۲۷) دستورِ لحنِ خاموش یعنی «روح» نداریم — و گفتنش (۷٫۷۹) ══');
/* ══ چرا این بخش هست ══
   صاحبِ برنامه هر دو نمونه را شنید و گفت آن ویژگیِ صدای رضوی هنوز در همهٔ
   کلمات هست. علتش در `_STATUS.json`ِ خودِ موتور نوشته بود:

       "ttsCue": { "on": false, "model": "gemini-3.8-flash-lite-tts",
                   "since": "2026-09-27 19:33", "ok": false,
                   "line": "… تکه‌ها بی‌لحن ساخته می‌شوند …" }

   هر دو نمونه صبحِ بعد ساخته شدند، یعنی **بی شیوهٔ خواندن**. برچسبِ «روح»
   روی آن ردیف‌ها دروغ بود، و `voiceBridge.colourOnly` صفر ماند.

   `vbrSoul_` نمی‌توانست بگیردش: ۷٫۷۳ آن را ساخت که `ep.__persona` را
   بخوانَد — «آیا شیوهٔ خواندن انتخاب شد»، نه «آیا به مدل رسید». و در این
   مسیر `soul: 'روح'` **ثابت** نوشته می‌شد: ادعایی بی هیچ ورودی. */
{
  const quiet27 = (fn) => { const o = console.log; console.log = () => {};
    try { return fn(); } finally { console.log = o; } };
  const epF27 = OUT.createFolder('قسمتِ آزمونِ لحنِ خاموش');
  epF27.createFile('قسمت ۱ — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  /* ══ متنِ اعراب‌دارِ واقعی، وگرنه ۲۷.۲ هیچ‌چیز نمی‌سنجد ══
     نسخهٔ اولِ این بند پوشه‌ای بی `__speakSegs` ساخت. با برداشتنِ سدِ لحن
     اجرا یک قدم بعد می‌مُرد («متنِ اعراب‌دار نیست») و فراخوانِ TTS باز هم
     صفر می‌مانْد — یعنی «هیچ فراخوانی خرج نشد» با سد و بی سد سبز بود.
     سنجه‌ای که با شکستنِ کد قرمز نشود، هیچ ادعایی ندارد. */
  const segs27 = [];
  for (let i = 0; i < 20; i++) {
    segs27.push({ h: 'h' + i, t: 'شَبی از شَب‌هایِ پاییز بود و بادِ سَرد پُشتِ ' +
      'پَنجِره ایستاده بود شمارهٔ ' + i + '. ' +
      'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد و ایستاد. '.repeat(4) });
  }
  epF27.createFile('_episode.json',
    JSON.stringify({ ep: { title: 'لحن‌آزما', __speakSegs: segs27 } }),
    'application/json');

  /* حالت را همان‌طور می‌سازیم که تولید می‌سازدش — با همان خاصیتی که
     `03_Producer.gs` وقتی مدل قالب را رد می‌کند می‌نویسد. حالتی که با دست
     ساخته شود و تولید هرگز به آن نرسد، چیزی ثابت نمی‌کند (۷٫۲۲). */
  const liveModel = ttsModel_();
  const realTry27 = global.ttsChunkTry_;
  let ttsCalls = 0;
  /* همان بدَلِ بندِ ۲۴: چند ثانیه صوتِ واقعی. نسخهٔ اول `'QUJD'` برمی‌گرداند
     و `alignB64_` آن را به رشتهٔ خالی می‌بُرید، پس با برداشتنِ سد اجرا سرِ
     «پاسخِ صوتیِ خالی» می‌مُرد و ۲۷.۲ باز هم صفر می‌دید. بدَلی که در جایی
     خراب باشد که تولید سالم است، هیچ‌چیز را ثابت نمی‌کند (۷٫۲۲). */
  global.ttsChunkTry_ = function () {
    ttsCalls++;
    return Buffer.alloc(24000 * 2 * 8).toString('base64');
  };
  let said27 = '';
  const realUi27 = global.ui_;
  global.ui_ = () => ({ alert: function (t, m) { said27 = String(m); },
                        ButtonSet: { OK: 1 } });
  try {
    const q27 = vbrRead_(); q27.items = []; vbrSave_(q27);
    /* تیکِ واقعی روی ردیفِ گوینده — همان درِ ۷٫۵۹ که تولید از آن وارد می‌شود. */
    const rd27 = ytRenderRead_();
    rd27.items = [{ key: 'variety:91', show: 'variety', ep: '91',
                    folderId: epF27.getId(), status: 'رسید' }];
    ytRenderSave_(rd27);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1,
                      'آرام و شمرده بخوان', '', '', ['variety:91']);

    /* ══ حالتِ «لحن نمی‌رود» از ۷٫۸۹ جای دیگری است ══
       پیشتر کافی بود مدل در نقشهٔ بدها بنشیند؛ حالا ردشدنِ فیلد فقط مسیر
       را عوض می‌کند و دستور از راهِ پیشوندِ متن می‌رود. تنها حالتی که
       واقعاً هیچ دستوری نمی‌رود، خاموشیِ خواسته‌شده است — و سدِ ۷٫۷۹
       دقیقاً باید همان‌جا چهار دقیقه خرج را نگه دارد. */
    const realMode27 = CFG.TTS_CUE_MODE;
    CFG.TTS_CUE_MODE = 'off';
    ok('۲۷.۰ حالتِ «لحن خاموش» واقعاً ساخته شد',
       ttsCueStatus_().ok === false,
       'گرفت: ' + JSON.stringify(ttsCueStatus_()).slice(0, 160) +
       ' — سنجه‌ای که روی حالتِ سالم بدوَد چیزی را ثابت نمی‌کند');

    ttsCalls = 0; said27 = '';
    const r27 = quiet27(() => runVoiceSoulTest());

    /* ══ ترتیب عمدی است ══
       `ok` سرِ شکست پرتاب می‌کند، پس هر سنجهٔ بعدی هرگز اجرا نمی‌شود. اگر
       «نمونه ساخته نمی‌شود» اول بیاید، سنجهٔ هزینه هیچ‌وقت دیده نمی‌شود و
       با برداشتنِ سد هم قرمز نمی‌شود — یعنی ادعایی که هیچ باری ندارد.
       ادعای **هزینه** اول می‌آید، چون همان است که ثابت می‌کند امتناع
       *پیش از* کار بوده، نه بعدش. */
    ok('۲۷.۱ هیچ فراخوانِ TTS خرج نمی‌شود — امتناع پیش از کار است، نه بعدش',
       ttsCalls === 0,
       'گرفت: ' + ttsCalls + ' فراخوان — چهار دقیقه خرج کردن برای فایلی که ' +
       'همان «رنگ‌تنها»ی دیروز است، هم هزینه است هم یک ادعای نادرستِ دیگر');

    ok('۲۷.۲ و جوابش صریح می‌گوید علت، لحنِ خاموش است',
       r27 && r27.ok === false && r27.cueOff === true,
       'گرفت: ' + JSON.stringify(r27));

    ok('۲۷.۳ و پیام می‌گوید چه شده و کِی خودش درست می‌شود',
       /شیوهٔ خواندن/.test(said27) && /۱۰:۰۰/.test(said27) &&
       /تیکِ شما سرِ جایش/.test(said27),
       'گرفت: ' + said27.slice(0, 200) +
       ' — امتناعی که راه را نگوید، او را همان‌جا رها می‌کند');

    ok('۲۷.۴ و ردیفی در صف نمی‌نشیند که «روح» ادعا کند',
       vbrRead_().items.filter(x => /نمونهٔ روح/.test(String(x.key))).length === 0,
       'گرفت: ' + JSON.stringify(vbrRead_().items.map(x => x.key)));

    /* و حالتِ دوم: لحن **وسطِ ساخت** خاموش شود. آن‌وقت ردیف باید
       «رنگ‌تنها» برود، وگرنه کپشنِ تلگرام چیزی می‌گوید که نشد. */
    const tagMid = vbrSoulTag_({ ok: true }, 'برچسب');
    /* ══ حالتِ «خاموشِ خواسته‌شده» همین‌جا برگردانده می‌شود ══
       بی این، هر سنجهٔ بعدی در همین فایل روی موتوری می‌دوَد که لحنش
       خاموش است — و آن‌وقت چیزی را می‌سنجد که نامش را نبرده. نشتِ حالت
       از یک بند به بندِ بعدی، همان شکلی است که امروز دو بار دیدمش. */
    CFG.TTS_CUE_MODE = realMode27;

    /* ══ و سوراخی که خودِ ۷٫۸۹ باز می‌کرد ══
     پرچمِ وضعیت با قالبِ پیشوندی درست می‌مانَد، پس اگر پیشوند هم رد شود و
     تکه واقعاً بی‌دستور ساخته شود، برچسب «روح» می‌شد — همان دروغی که ۷٫۷۹
     برای برداشتنش نوشته شد. پس مهرِ خودِ **رویداد** داور است، نه پرچم. */
  {
    const okState = { ok: true };
    const before27 = ttsCueDropAt_();
    const same = vbrSoulTag_(okState, 'برچسب', before27);
    props_().setProperty(PK.TTS_CUE_DROP_AT, '2099-01-01 00:00');
    const after27 = vbrSoulTag_(okState, 'برچسب', before27);
    props_().deleteProperty(PK.TTS_CUE_DROP_AT);
    ok('۲۷.۵-ب با پرچمِ سالم و بی رویداد، برچسب «روح» است',
       same.soul === 'روح', JSON.stringify(same));
    ok('۲۷.۵-پ ولی اگر تکه‌ای واقعاً بی‌دستور ساخته شود، «رنگ‌تنها» می‌شود ' +
       'حتی وقتی پرچم سالم است',
       after27.soul === 'رنگ‌تنها' &&
       String(after27.soulWhy).indexOf('دور انداخته شد') !== -1,
       JSON.stringify(after27));
  }

  ok('۲۷.۵ لحنی که وسطِ ساخت خاموش شود، ردیف را «رنگ‌تنها» می‌کند',
       tagMid.soul === 'رنگ‌تنها' && /وسطِ ساخت/.test(String(tagMid.soulWhy)),
       'گرفت: ' + JSON.stringify(tagMid));

    props_().deleteProperty(PK.TTS_CUE_OFF);
    props_().deleteProperty(PK.TTS_CUE_OFF_AT);
    const tagOk = vbrSoulTag_({ ok: true }, 'برچسب');
    ok('۲۷.۶ و با لحنِ روشن همان «روح» است — سد چیزی را همیشه نمی‌بندد',
       tagOk.soul === 'روح',
       'گرفت: ' + JSON.stringify(tagOk) +
       ' — سدی که همیشه بسته باشد، قابلیت را خاموش کرده نه محافظت');
  } finally {
    global.ttsChunkTry_ = realTry27;
    global.ui_ = realUi27;
    try { props_().deleteProperty(PK.TTS_CUE_OFF); } catch (e) {}
    try { props_().deleteProperty(PK.TTS_CUE_OFF_AT); } catch (e) {}
    try { epF27.setTrashed(true); } catch (e) {}
  }
}

console.log('\n══ ۲۸) شباهتِ کم «آماده» نیست (۷٫۷۹) ══');
/* گلدوز با شباهتِ ۰٫۷۰۸ «✅ گویندهٔ تازه آماده شد» اعلام شد. عدد سنجیده و
   در سه جا ثبت شده بود — `docs/voices.json`، `_STATUS.json` و سطرِ روزانه —
   و هیچ تصمیمی به آن وصل نبود. مدلِ **ردشدهٔ** رضوی روی همین سنجه ۰٫۷۱۲ تا
   ۰٫۷۲۶ گرفته بود، یعنی گلدوز پایین‌تر از چیزی است که خودمان کنار گذاشتیم. */
{
  const low = vintHeadline_('محمد تقی پور گلدوز', { similarity: '0.708' });
  const good = vintHeadline_('بهروز رضوی', { similarity: '0.744' });
  ok('۲۸.۱ شباهتِ زیرِ سد، «✅ آماده» اعلام نمی‌شود',
     low.indexOf('✅') === -1 && /شباهتش کم/.test(low),
     'گرفت: ' + low);
  ok('۲۸.۲ ولی شباهتِ خوب همچنان «آماده» است',
     good.indexOf('✅') === 0,
     'گرفت: ' + good + ' — سدی که همه را رد کند، سد نیست');
  /* «نسنجیده» ≠ «ضعیف» — ۷٫۴۰: هشداری که برای حالتِ نامعلوم بزند، هشداری
     است که خوانده نمی‌شود. */
  const unknown = vintHeadline_('کسی', { similarity: '' });
  ok('۲۸.۳ و شباهتِ نسنجیده ضعیف حساب نمی‌شود',
     unknown.indexOf('✅') === 0, 'گرفت: ' + unknown);
  /* و عنوان **یک** تعریف دارد: موضوعِ ایمیل هم از همین تابع می‌خوانَد،
     وگرنه عنوانی که در یک جا درست شود و در جای دیگر نه — شکلِ
     `engRollbackAuto_`. */
  const vi = fs.readFileSync('src/33_VoiceIntake.gs', 'utf8');
  ok('۲۸.۴ موضوعِ ایمیل هم از همان تابع می‌آید',
     /mailQueue_\('گویندهٔ تازه', vintHeadline_\(name, r\)/.test(vi) &&
     !/'✅ گویندهٔ تازه آماده شد: ' \+ name, body/.test(vi),
     'دو جای نوشتنِ عنوان یعنی روزی یکی‌شان کهنه می‌مانَد');
}

/* ══════════════════════════════════════════════════════════════════════
   §۲۹ — گامِ تبدیل، به ازای هر گوینده (۷٫۸۱)

   چرا این بخش هست: تا ۷٫۸۰ `CFG.VBR_PITCH` یک عددِ **سراسری** بود که
   برای رضوی سنجیده شده بود، و هر گویندهٔ دیگری همان دوازده نیم‌پرده را
   می‌گرفت. اجرای ۶۷ِ voice-lab روی خودِ فایلِ گلدوز، با index_rate و
   protect ثابت: گام ۰ → ۰٫۷۸۶ · −۳ → ۰٫۷۳۲ · −۶ → ۰٫۶۶۵ · −۹ → ۰٫۵۷۴ ·
   −۱۲ → ۰٫۵۵۶. یعنی «اصلا مثل خودش نیست» از همین یک عدد می‌آمد، و
   دامنهٔ ۰٫۲۳۰ ده برابرِ آن ۰٫۰۲۴ی است که ۷٫۷۰ بی‌معنا نشانش داد.

   هیچ‌کدام از این خرابی‌ها خطا نمی‌دهند: صدا می‌آید، ردیف «رسید» می‌شود،
   و فقط **صدای آدمِ دیگری** است.
   ══════════════════════════════════════════════════════════════════════ */
{
  const shP = personaTab_();
  const rowAt = (k) => {
    const rw = personaRows_(shP);
    for (let i = 0; i < rw.length; i++) {
      if (String(rw[i][PC.KEY - 1]).trim() === k) return i + 2;
    }
    return 0;
  };
  const atR = rowAt('razavi');
  /* نامِ برنامه از `knownShows_` می‌آید، نه از یک ثابتِ بلوکِ دیگر: `SHOW`
     در بلوکِ §۲۴ محدود است و بیرونش وجود ندارد. */
  const SH1 = ((knownShows_() || [{}])[0] || {}).name || 'از همه جا از همه رنگ';
  ok('۲۹.۰ ردیفِ رضوی برای این بخش هست', atR > 0, 'بی ردیف، بقیهٔ سنجه‌ها پوچ‌اند');

  /* ── ۲۹.۱ از همان دری که تولید می‌رود: `vbrAsk_` ──
     ۷٫۶۲: سنجه‌ای که تابعِ تازه را صدا بزند تابع را ثابت می‌کند؛ فقط
     سنجه‌ای که از جای شروعِ تولید شروع کند ویژگی را ثابت می‌کند. */
  shP.getRange(atR, PC.PITCH).setValue('7');
  {
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    const r = vbrAsk_('آزمونِ گام', '901', epFold.getId(), 'razavi', 'یک');
    const row = (vbrRead_().items || [])[0];
    ok('۲۹.۱ گامِ ردیفِ گوینده در صف می‌نشیند، نه عددِ سراسری',
       r.ok !== false && row && row.params && row.params.pitch === '7' &&
       String(CFG.VBR_PITCH) === '-12',
       'گرفت: ' + JSON.stringify(row && row.params) + ' · CFG=' + CFG.VBR_PITCH);
    ok('۲۹.۲ و ردیف می‌گوید این عدد از کجا آمد',
       row && row.pitchSrc === 'ردیفِ خودش',
       'گرفت: ' + (row && row.pitchSrc));
    /* ۸٫۲۴: هدفِ هرتزی هرگز بر دستِ او مقدم نیست — اگر در ردیف چیزی نوشته،
       گردش‌کار گام را حساب نمی‌کند. */
    ok('۲۹.۲-الف دستِ او بر هدفِ خودکار مقدم است',
       row && row.params && row.params.targetHz == null &&
       !!(CFG.VOICE_TARGET_HZ || {}).razavi,
       'گرفت: ' + JSON.stringify(row && row.params));
  }
  /* ── ۲۹.۲-ب و اینجاست که آن ادعا بار برمی‌دارد ──
     نگارشِ اولِ ۲۹.۲ با `pitchSrc: 'ردیفِ خودش'`ِ **ثابت** هم سبز می‌مانْد،
     چون در آن حالت جوابِ درست هم همان بود. یعنی سنجه‌ای که برچسبِ بی‌ورودی
     را از برچسبِ واقعی تشخیص نمی‌داد — همان شکلی که ۷٫۷۹ درباره‌اش نوشته
     شد، این بار در سنجهٔ خودم. پس همان پرسش در حالتی پرسیده می‌شود که
     جوابِ درست **چیزِ دیگری** است. */
  {
    shP.getRange(atR, PC.PITCH).setValue('');
    /* از ۸٫۲۴ رضوی هدفِ هرتزی دارد؛ این سنجه دربارهٔ «پیش‌فرض» است، پس
       همان حالت ساخته می‌شود و هدف در §۲۹.۲-پ جدا سنجیده می‌شود. */
    const keepT = CFG.VOICE_TARGET_HZ; CFG.VOICE_TARGET_HZ = {};
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    try { vbrAsk_('آزمونِ گام', '902', epFold.getId(), 'razavi', 'دو'); }
    finally { CFG.VOICE_TARGET_HZ = keepT; }
    const row2 = (vbrRead_().items || [])[0];
    ok('۲۹.۲-ب و با خانهٔ خالی «پیش‌فرض» می‌گوید، نه «ردیفِ خودش»',
       row2 && row2.pitchSrc === 'پیش‌فرض' && row2.params.pitch === '-12',
       'گرفت: ' + JSON.stringify(row2 && { s: row2.pitchSrc, p: row2.params.pitch }) +
       ' — برچسبی که ورودی ندارد، دیر یا زود دروغ می‌شود');
  }

  /* ── ۲۹.۲-پ گامِ ثابت فرض می‌کرد صدای مبدأ یکی است (۸٫۲۴) ──
     خانهٔ خالی + هدفِ هرتزی ⇒ هدف به گردش‌کار می‌رود و گامِ پشتیبان هم، تا
     اگر سنجشِ ورودی نشد، صف بی گام نماند. از همان درِ تولید: `vbrAsk_`. */
  {
    shP.getRange(atR, PC.PITCH).setValue('');
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    vbrAsk_('آزمونِ گام', '903', epFold.getId(), 'razavi', 'سه');
    const row3 = (vbrRead_().items || [])[0];
    ok('۲۹.۲-پ هدفِ هرتزی در صف می‌نشیند، با گامِ پشتیبان و برچسبِ راست',
       row3 && row3.params && row3.params.targetHz === '106.9' &&
       row3.params.pitch === '-12' && /خودکار/.test(String(row3.pitchSrc)),
       'گرفت: ' + JSON.stringify(row3 && { p: row3.params, s: row3.pitchSrc }));
  }

  /* ── ۲۹.۳ صفر یک گامِ معتبر است، نه «خالی» ──
     تلهٔ واقعی: `Number('')` صفر است. اگر خالی‌بودن با عدد سنجیده شود،
     گامِ **۰** — که بهترین گامِ گلدوز است — مثلِ خانهٔ خالی رفتار می‌کند و
     بی‌صدا به پیش‌فرض می‌افتد، یعنی دقیقاً همان −۱۲ای که این نسخه برای
     رهاکردنش نوشته شده. */
  shP.getRange(atR, PC.PITCH).setValue('0');
  {
    const pp = personaPitch_('razavi');
    ok('۲۹.۳ گامِ صفر خوانده می‌شود، مثلِ خانهٔ خالی رفتار نمی‌کند',
       pp.pitch === '0' && pp.src === 'ردیفِ خودش',
       'گرفت: ' + JSON.stringify(pp) + ' — Number("") هم صفر است');
  }

  /* ── ۲۹.۴ رقمِ فارسی هم قبول است، چون او فارسی تایپ می‌کند ── */
  shP.getRange(atR, PC.PITCH).setValue('-۱۲');
  ok('۲۹.۴ رقمِ فارسی خوانده می‌شود',
     personaPitch_('razavi').pitch === '-12',
     'گرفت: ' + JSON.stringify(personaPitch_('razavi')));

  /* ── ۲۹.۵ خانهٔ خالی + بی بذر = پیش‌فرض، و **گفته می‌شود** که پیش‌فرض است ──
     ۷٫۴۰: نسنجیده ضعیف نیست. ولی حدس هم تصمیم نیست، پس ردیف باید بتواند
     بگوید این عدد برای این آدم هرگز سنجیده نشده. */
  shP.getRange(atR, PC.PITCH).setValue('');
  {
    /* «بی بذر» از ۸٫۲۴ «بی هدف» هم هست — رضوی هدف دارد، پس همان حالت ساخته
       می‌شود (هدف در ۲۹.۲-پ سنجیده می‌شود). */
    const keepT = CFG.VOICE_TARGET_HZ; CFG.VOICE_TARGET_HZ = {};
    let pp; try { pp = personaPitch_('razavi'); } finally { CFG.VOICE_TARGET_HZ = keepT; }
    ok('۲۹.۵ خانهٔ خالی پیش‌فرض می‌گیرد و خودش را «پیش‌فرض» می‌نامد',
       pp.pitch === '-12' && pp.src === 'پیش‌فرض',
       'گرفت: ' + JSON.stringify(pp));
  }

  /* ── ۲۹.۶ بذرِ سنجیده‌شده به گویندهٔ خالی می‌رسد ──
     او شیت باز نمی‌کند (۵٫۹۰). عددی که امروز سنجیده شد باید خودش سرِ جایش
     برود، نه با یک درخواست از او — همان قاعدهٔ `PRON_SEED` در ۷٫۶۹. */
  {
    /* از ۸.۳۷ گلدوز هدفِ هرتزی هم دارد (§۳۸)، که بر بذر مقدم است و بذر گامِ
       پشتیبانش می‌شود. این سنجه دربارهٔ خودِ مسیرِ بذر است، پس همان حالت —
       «بی هدف» — ساخته می‌شود، همان‌طور که ۲۹.۵ برای رضوی می‌کند. */
    const seedKey = Object.keys(CFG.VOICE_PITCH_SEED || {})[0];
    const keepT6 = CFG.VOICE_TARGET_HZ; CFG.VOICE_TARGET_HZ = {};
    let p6; try { p6 = personaPitch_(seedKey); } finally { CFG.VOICE_TARGET_HZ = keepT6; }
    ok('۲۹.۶ گویندهٔ سنجیده‌شده عددِ خودش را می‌گیرد، نه عددِ رضوی را',
       !!seedKey && p6.pitch === String(CFG.VOICE_PITCH_SEED[seedKey]) &&
       p6.src === 'سنجیده‌شده' && p6.pitch !== String(CFG.VBR_PITCH),
       'کلید: ' + seedKey + ' · گرفت: ' + JSON.stringify(p6));
    /* و با هدف، بذر گامِ پشتیبان می‌مانَد — اگر سنجشِ ورودی نشد، همان می‌رود. */
    const p6b = personaPitch_(seedKey);
    ok('۲۹.۶-ب با هدفِ هرتزی، بذر گامِ پشتیبان است',
       !!p6b.targetHz && p6b.pitch === String(CFG.VOICE_PITCH_SEED[seedKey]),
       JSON.stringify(p6b));
  }

  /* ── ۲۹.۷ عددِ ناخوانا **رد** می‌شود و خانه دست نمی‌خورد ──
     بی‌صدا صفر کردنِ یک غلطِ تایپی بدترین حالت است: صفر یک گامِ معتبر است،
     پس او باور می‌کند چیزی تنظیم کرده و صدای دیگری می‌گیرد. */
  {
    const before = String(personaRows_(shP)[atR - 2][PC.PITCH - 1] || '');
    const bad = personaBoardSave_('razavi', false, [SH1], 1, 'آرام و شمرده بخوان',
                                  '', '', undefined, 'آبی');
    const after = String(personaRows_(shP)[atR - 2][PC.PITCH - 1] || '');
    ok('۲۹.۷ گامِ ناخوانا با نام رد می‌شود و خانه را عوض نمی‌کند',
       bad.ok === false && bad.why.indexOf('آبی') !== -1 && after === before,
       JSON.stringify(bad) + ' · خانه: «' + before + '» → «' + after + '»');
  }

  /* ── ۲۹.۸ `undefined` دست نمی‌زند، رشتهٔ خالی پاک می‌کند (۷٫۵۹) ── */
  {
    shP.getRange(atR, PC.PITCH).setValue('-5');
    personaBoardSave_('razavi', false, [SH1], 1, 'آرام و شمرده بخوان', '', '', undefined);
    const kept = String(personaRows_(shP)[atR - 2][PC.PITCH - 1] || '');
    personaBoardSave_('razavi', false, [SH1], 1, 'آرام و شمرده بخوان', '', '',
                      undefined, '');
    const cleared = String(personaRows_(shP)[atR - 2][PC.PITCH - 1] || '');
    ok('۲۹.۸ نفرستادنِ گام سلول را نگه می‌دارد، خالی فرستادن پاکش می‌کند',
       kept === '-5' && cleared === '',
       'نگه: «' + kept + '» · پاک: «' + cleared + '»');
  }

  /* ── ۲۹.۹ و پوششِ عمومی — همان جایی که ۷٫۴۱ آرگومان را جا گذاشت ──
     `google.script.run` این را صدا می‌زند. پارامترِ جاافتاده هیچ خطایی
     نمی‌دهد: تخته مقدار را می‌فرستد، پوشش دورش می‌ریزد، دکمه بی‌صدا هیچ
     نمی‌کند. پس از **همان** تابع صدا زده می‌شود، نه از نگارشِ زیرخط‌دار. */
  {
    personaBoardSave('razavi', false, [SH1], 1, 'آرام و شمرده بخوان', '', '',
                     undefined, '-9');
    ok('۲۹.۹ پوششِ عمومی گام را به ذخیره می‌رسانَد',
       String(personaRows_(shP)[atR - 2][PC.PITCH - 1] || '') === '-9',
       'گرفت: «' + String(personaRows_(shP)[atR - 2][PC.PITCH - 1] || '') + '»');
    /* و تخته هم واقعاً می‌فرستدش: دکمه‌ای که مقدار را نفرستد، همان
       خرابیِ بی‌صداست (۵٫۲). */
    /* ══ شناسه‌ای که نوشته می‌شود و شناسه‌ای که خوانده می‌شود، **یکی** ══
       نگارشِ اول فقط وجودِ رشتهٔ `pt"+i` را می‌خواست. عوض کردنِ شناسهٔ خودِ
       ورودی (به `ptX`) آن را سبز گذاشت، چون `getElementById("pt"+i)` هنوز
       همان رشته را داشت — یعنی تخته‌ای که دکمه‌اش `null.value` می‌خوانَد و
       بی‌صدا هیچ نمی‌کند، از این سد رد می‌شد. دقیقاً همان خرابی‌ای که
       ۵٫۶۱/۷٫۴۳ برایش هستند. پس دو شناسه از خودِ متن بیرون کشیده و با هم
       سنجیده می‌شوند. */
    const bh = personaBoardHtml_();
    const mkId = (bh.match(/<input type=\\?'text\\?' id=\\?'([A-Za-z]+)"\+i/) || [])[1];
    const rdId = (bh.match(/personaBoardSave\([\s\S]{0,500}?getElementById\("([A-Za-z]+)"\+i\)\.value\);/) || [])[1];
    ok('۲۹.۱۰ شناسهٔ خانهٔ گام در تخته و در فرستادن یکی است',
       !!mkId && !!rdId && mkId === rdId,
       'ساخته: ' + mkId + ' · خوانده: ' + rdId +
       ' — ناهمنامی یعنی دکمه بی‌صدا هیچ نمی‌کند');
  }

  shP.getRange(atR, PC.PITCH).setValue('');
}

/* ══════════════════════════════════════════════════════════════════════
   §۳۰ — درخواستی که خودِ موتور می‌زند (۷٫۸۲)

   صاحبِ برنامه گفت «فردا صبح خودت بزن و نمونه رو بفرست». من نمی‌توانم
   (Apps Script از بیرون صدا زده نمی‌شود، صفِ درایو با ابزارهای من
   بازنویسی نمی‌شود، artifact از پشتِ پراکسی ۴۰۳ می‌دهد — امتحان شد). پس
   موتور خودش می‌زند. ۷٫۶۴: موتور باید خودش را بسنجد.
   ══════════════════════════════════════════════════════════════════════ */
{
  const seedFold = OUT.createFolder('پوشهٔ بذرِ نمونه');
  seedFold.createFile('نمونه — کامل.wav', 'x'.repeat(9000), 'audio/wav');
  const SEED = [{ show: 'نمونهٔ گام — تستی', ep: '77', speaker: 'razavi',
                  folderId: seedFold.getId(), title: 'ت', label: 'برچسبِ بذر' }];
  const keepSeed = CFG.VBR_SEED_ASKS;
  const q0 = vbrRead_(); q0.items = []; vbrSave_(q0);

  CFG.VBR_SEED_ASKS = SEED;
  const r1 = vbrSeedAsk_();
  const row = (vbrRead_().items || []).filter(x => String(x.key).indexOf('تستی') !== -1)[0];
  ok('۳۰.۱ بذر بی هیچ دکمه‌ای در صف می‌نشیند',
     r1.asked.length === 1 && !!row && row.status === 'در انتظار',
     JSON.stringify(r1) + ' · ردیف: ' + JSON.stringify(row && row.key));
  /* برچسب لازم است وگرنه نامِ فایل و کپشنِ تلگرام «قسمت ۷۷ با صدای …»
     می‌شوند برای چیزی که یک نمونه است — ۷٫۷۳/۷٫۷۴. */
  ok('۳۰.۲ و برچسبش را با خود می‌بَرد',
     row && row.label === 'برچسبِ بذر', 'گرفت: ' + (row && row.label));
  /* ══ گام **در بذر نوشته نشده**؛ از `personaPitch_` می‌آید ══
     نگارشِ اول این را با `=== personaPitch_('razavi').pitch` می‌سنجید، یعنی
     `-12 === -12` — که پیش‌فرضِ ثابت هم می‌دهدش. همان بی‌باریِ ۲۹.۲ یک بخش
     آن‌طرف‌تر. پس عددی در ردیفِ گوینده گذاشته می‌شود که **هیچ پیش‌فرضی**
     نیست، و از بذر هم نمی‌تواند آمده باشد چون بذر گام ندارد. */
  {
    const shPt = personaTab_();
    const rw = personaRows_(shPt);
    let atz = 0;
    for (let i = 0; i < rw.length; i++) {
      if (String(rw[i][PC.KEY - 1]).trim() === 'razavi') { atz = i + 2; break; }
    }
    shPt.getRange(atz, PC.PITCH).setValue('4');
    const qz = vbrRead_(); qz.items = []; vbrSave_(qz);
    vbrSeedAsk_();
    const rz = (vbrRead_().items || []).filter(x => String(x.key).indexOf('تستی') !== -1)[0];
    ok('۳۰.۳ گامش از ردیفِ گوینده می‌آید، نه از بذر و نه از پیش‌فرض',
       !!rz && rz.params.pitch === '4' && String(CFG.VBR_PITCH) !== '4' &&
       !('pitch' in SEED[0]),
       'ردیف: ' + (rz && rz.params && rz.params.pitch) +
       ' · پیش‌فرض: ' + CFG.VBR_PITCH);
    /* ثبت، نه وانمود (۷٫۷۴): شکستنِ `personaPitch_` در `vbrAsk_` روی ۲۹.۱
       می‌نشیند نه اینجا، چون ۲۹ جلوتر اجرا می‌شود. آنچه **این** سنجه را
       قرمز می‌کند همان رگرسیونی است که برایش هست: اضافه شدنِ `pitch` به
       خودِ بذر، یعنی دو تعریف برای یک چیز. با آن امتحان شد و قرمز شد. */
    shPt.getRange(atz, PC.PITCH).setValue('');
  }

  /* ── ۳۰.۴ هر شب اجرا می‌شود و دو تا نمی‌سازد ──
     هیچ پرچمی ذخیره نمی‌شود، پس تنها چیزی که از تکرار جلو می‌گیرد ردِ
     کلیدِ تکراریِ خودِ `vbrAsk_` است. اگر آن نباشد، هر شب یک ردیفِ تازه
     و صف پر می‌شود. */
  const r2 = vbrSeedAsk_();
  const n2 = (vbrRead_().items || []).filter(x => String(x.key).indexOf('تستی') !== -1).length;
  /* ادعا «ردیفِ دوم ساخته نمی‌شود» است، نه اینکه دلیلش با چه واژه‌ای
     گفته شود — سنجه‌ای که متنِ پیام را بسنجد، با بهتر شدنِ پیام قرمز
     می‌شود (۷٫۷۵). */
  ok('۳۰.۴ اجرای دوباره ردیفِ دوم نمی‌سازد',
     n2 === 1 && r2.asked.length === 0 && r2.skipped.length === 1,
     'تعداد: ' + n2 + ' · ' + JSON.stringify(r2));

  /* ── ۳۰.۵ ردیفِ ناقص نام برده می‌شود، بی‌صدا رد نمی‌شود ──
     این فهرست با دست نوشته می‌شود؛ غلطِ تایپی در آن یعنی نمونه‌ای که هرگز
     نمی‌آید و هیچ‌کس نمی‌فهمد چرا (۷٫۴۱). */
  CFG.VBR_SEED_ASKS = [{ show: 'ناقص', speaker: 'razavi' }];
  const r3 = vbrSeedAsk_();
  ok('۳۰.۵ ردیفِ ناقص گزارش می‌شود',
     r3.notes.length === 1 && r3.asked.length === 0 &&
     r3.notes[0].indexOf('VBR_SEED_ASKS') !== -1,
     JSON.stringify(r3));

  /* ── ۳۰.۶ و درِ دوم: `healthCheck` خودش می‌پرسدش ──
     تنها بودن در کارِ شبانه یعنی شبی که وقت کم بیاید — دقیقاً شبی که این
     نمونه لازم است — هیچ نمی‌شود. ۷٫۴۶/۷٫۶۲. از **متنِ خودِ `healthCheck`**
     پرسیده می‌شود، نه از کلِ فایل: بلوکِ `_STATUS.json` هم نامش را دارد و
     سنجه‌ای که کلِ فایل را بگردد با برداشتنِ فراخوان سبز می‌مانَد (۷٫۴۰). */
  /* ══ از همان دری که تولید می‌رود، نه با خواندنِ متنِ کد ══
     نگارشِ اول بدنهٔ `vbrCollectHourly` را برای رشتهٔ `vbrSeedAsk_(`
     می‌گشت. با `if (false) vbrSeedAsk_()` سبز مانْد — یعنی سنجه‌ای که یک
     لایه بالاتر از خرابی ایستاده بود (۷٫۴۳/۷٫۶۲). پس خودِ تریگر اجرا
     می‌شود و از صف پرسیده می‌شود. */
  {
    const qh = vbrRead_(); qh.items = []; vbrSave_(qh);
    CFG.VBR_SEED_ASKS = SEED;
    vbrCollectHourly();
    const landed = (vbrRead_().items || [])
      .filter(x => String(x.key).indexOf('تستی') !== -1).length;
    ok('۳۰.۶ تریگرِ ساعتی خودش بذر را در صف می‌گذارد',
       landed === 1,
       'تعداد: ' + landed + ' — تنها راهش کارِ شبانه بود، که پشتِ nightHas_ است');
  }
  /* و **نه** روی `healthCheck`: رسیدن به سدِ تکرار از `vbrMapCached_()`
     می‌گذرد که فراخوانِ شبکه است، و آن تابع همان است که ۷٫۶۳ نوشت از
     هزینه مُرده. نگارشِ اولِ همین نسخه این اشتباه را کرد و
     `run_health_test.js` گرفتش. */
  ok('۳۰.۷ و روی `healthCheck` نمی‌نشیند',
     fs.readFileSync('src/08_Health.gs', 'utf8').indexOf('vbrSeedAsk_') === -1,
     'هزینهٔ شبکه روی تابعی که از هزینه می‌میرد (۷٫۶۳/۷٫۶۶)');

  CFG.VBR_SEED_ASKS = keepSeed;
}

/* ══════════════════════════════════════════════════════════════════════
   §۳۱ — نمونهٔ «روح» را خودِ موتور می‌خواهد (۷٫۸۴)

   صاحبِ برنامه نمونهٔ گامِ ۰ را شنید: «خیلی بهتر شده بود ولی روح نداشت».
   علتش سنجیده شد نه حدس: فایلِ منبع ۲۷ سپتامبر ۱۹:۴۴ ساخته شد، یازده
   دقیقه **پس از** ۱۹:۳۳ که مدلِ صوتی دستورِ لحن را رد کرد. پس صاف خوانده
   شده بود، و RVC فقط رنگ عوض می‌کند — مکث و ضرب‌آهنگ ورودی‌اش‌اند.

   پس نمونه باید **از نو خوانده** شود، و آن تنها از دکمهٔ منو می‌آمد.
   ══════════════════════════════════════════════════════════════════════ */
{
  const shS = personaTab_();
  const rwS = personaRows_(shS);
  let atS = 0;
  for (let i = 0; i < rwS.length; i++) {
    if (String(rwS[i][PC.KEY - 1]).trim() === 'razavi') { atS = i + 2; break; }
  }
  /* نامِ برنامه محلی است: `SH1` در بلوکِ §۳۰ محدود است. */
  const SHOW31 = ((knownShows_() || [{}])[0] || {}).name || 'از همه جا از همه رنگ';
  const keepSoul = CFG.VOICE_SOUL_SEED;
  const keepPick = String(rwS[atS - 2][PC.PICK - 1] || '');
  /* قسمتی که پوشه‌اش در `_YT-RENDER.json` شناخته است — وگرنه انتخاب‌کننده
     ردش می‌کند و سنجه راهِ دیگری می‌رود (۷٫۴۴). */
  let known = null;
  try {
    const d = ytRenderRead_();
    for (const it of (d.items || [])) { if (it.folderId) { known = it; break; } }
  } catch (e) {}
  ok('۳۱.۰ قسمتی با پوشهٔ شناخته برای این بخش هست', !!known,
     'بی آن، بقیهٔ سنجه‌ها چیزِ دیگری می‌سنجند');

  shS.getRange(atS, PC.PITCH).setValue('');
  shS.getRange(atS, PC.PICK).setValue('');          // هیچ تیکی
  CFG.VOICE_SOUL_SEED = [{ speaker: 'razavi', show: known.show, ep: String(known.ep) }];

  /* ── ۳۱.۱ بی هیچ تیکی، بذر خودش انتخاب می‌شود ── */
  {
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    const pk = vbrSoulPick_();
    ok('۳۱.۱ بذر بی تیک انتخاب می‌شود و خودش را «بذر» می‌نامد',
       pk.ok === true && pk.seeded === true && String(pk.item.ep) === String(known.ep),
       JSON.stringify({ ok: pk.ok, seeded: pk.seeded, why: pk.why }));
  }

  /* ── ۳۱.۲ تیکِ او خودکار ساخته نمی‌شود ──
     ۷٫۷۴ معنای آن ستون را «دکمه را که زدم» گذاشت. اگر موتور خودش روی تیک
     عمل کند، معنای ستون بی‌خبر عوض شده — و او نمونه‌ای می‌گیرد که نخواسته.
     زمان‌بند از بازنویسی به بعد **هیچ** چیزی از ستونِ تیک نمی‌دانَد، پس این
     ساختاراً برقرار است نه تصادفاً — ولی همان را باید سنجید. */
  {
    CFG.VOICE_SOUL_SEED = [];
    personaBoardSave_('razavi', false, [SHOW31], 1, 'آرام و شمرده بخوان', '', '',
                      [String(known.show) + ':' + String(known.ep)]);
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
    try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
    const pk = vbrSoulPick_();
    const due = vbrSoulSeedDue_();
    const trg = ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === 'runVoiceSoulSeed').length;
    ok('۳۱.۲ تیک انتخاب می‌شود ولی موتور خودش نمی‌سازدش',
       pk.ok === true && !pk.seeded && due.scheduled === false && trg === 0,
       JSON.stringify({ ok: pk.ok, seeded: pk.seeded, sched: due.scheduled,
                        trig: trg, why: due.why }));
  }

  /* ── ۳۱.۳ کارِ سنگین **اینجا** نمی‌افتد، فقط زمان‌بندی می‌شود ──
     ~چهار دقیقه TTS روی تریگرِ ساعتی یعنی خوردنِ کلِ اجرا و گرسنه گذاشتنِ
     برداشت (۶٫۳۷). پس هیچ فراخوانِ TTS نباید از این مسیر برود. */
  {
    shS.getRange(atS, PC.PICK).setValue('');
    CFG.VOICE_SOUL_SEED = [{ speaker: 'razavi', show: known.show, ep: String(known.ep) }];
    try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    const due = vbrSoulSeedDue_();
    const trig = ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === 'runVoiceSoulSeed').length;
    ok('۳۱.۳ زمان‌بندی می‌شود و تریگرِ خودش را می‌سازد',
       due.scheduled === true && trig === 1,
       JSON.stringify(due) + ' · تریگرها: ' + trig);
    /* ── و زمان‌بند هابِ ۲۹ مگابایتی را **نمی‌خوانَد**، در هر دو حالت ──
       نگارشِ اولم یک `logLine_` داشت و همان، هاب را می‌خوانْد؛ ۲۶٫۳ گرفتش.
       شمارش **خواندن** است نه زمان: ماک هابِ ۲۹ مگابایتی ندارد (۷٫۶۰). */
    {
      const realH = global.getHub_;
      let hn = 0;
      global.getHub_ = function () { hn++; return realH.apply(null, arguments); };
      try {
        try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
        try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
        const q2 = vbrRead_(); q2.items = []; vbrSave_(q2);
        hn = 0;
        const d2 = vbrSoulSeedDue_();            // حالتِ «زمان‌بندی شد»
        const hSched = hn;
        hn = 0;
        const d3 = vbrSoulSeedDue_();            // حالتِ «کاری نیست» (سقف)
        /* ثبت، نه وانمود (۷٫۷۴): برگرداندنِ `logLine_` روی **۲۶٫۳** می‌نشیند
           نه اینجا، چون §۲۶ جلوتر اجرا می‌شود — و ۲۶٫۳ همان سنجه‌ای است که
           خطای واقعیِ این نسخه را گرفت. این یکی همان مرز را از داخلِ §۳۱ هم
           می‌بندد تا اگر روزی §۲۶ عوض شد، بی‌شاهد نماند. */
        ok('۳۱.۳-ب زمان‌بند در هیچ حالتی هاب را نمی‌خوانَد',
           d2.scheduled === true && hSched === 0 && hn === 0,
           'زمان‌بندی: ' + hSched + ' خواندن · بی‌کار: ' + hn +
           ' — ساعتی یک بار روی ۲۹ مگابایت همان هزینه‌ای است که ۷٫۶۳ از آن مُرد');
      } finally { global.getHub_ = realH; }
    }
    /* ── ۳۱.۴ و دو بار صدا زدن، دو تریگر نمی‌سازد ── */
    const due2 = vbrSoulSeedDue_();
    const trig2 = ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === 'runVoiceSoulSeed').length;
    ok('۳۱.۴ بارِ دوم تریگرِ دوم نمی‌سازد',
       trig2 === 1, 'تریگرها: ' + trig2 + ' · ' + JSON.stringify(due2));
  }

  /* ── ۳۱.۵ سقفِ روزانه: خرابیِ پایدار حلقه نمی‌شود ── */
  {
    try { props_().setProperty('VSOUL_SEED_DAY', String(nowStr_()).slice(0, 10) + '|99'); } catch (e) {}
    const due = vbrSoulSeedDue_();
    ok('۳۱.۵ سقفِ روزانه جلوِ تریگرِ بی‌پایان را می‌گیرد',
       due.scheduled === false && /سقف/.test(String(due.why)),
       JSON.stringify(due));
    try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
  }

  /* ── ۳۱.۶ و تریگرِ ساعتی خودش می‌پرسدش — از همان دری که تولید می‌رود ──
     خواندنِ متنِ کد یک لایه بالاتر از خرابی می‌ایستد (۷٫۴۳)، پس خودِ
     `vbrCollectHourly` اجرا می‌شود. */
  {
    try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
    try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    vbrCollectHourly();
    const trig = ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === 'runVoiceSoulSeed').length;
    ok('۳۱.۶ تریگرِ ساعتی خودش بذرِ روح را زمان‌بندی می‌کند',
       trig === 1, 'تریگرها: ' + trig);
  }

  /* ── ۳۱.۷ و سه سدِ `runVoiceSoulTest` دور زده نمی‌شوند ──
     شیوهٔ خواندنِ خالی یعنی روحی برای گذاشتن نیست؛ بذر این را نباید رد کند. */
  {
    shS.getRange(atS, PC.STYLE).setValue('');
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    const pk = vbrSoulPick_();
    /* و پیام نباید بگوید «تیک خورده»: این یکی از بذر آمده، نه از دستِ او. */
    ok('۳۱.۷ بذر با «شیوهٔ خواندنِ» خالی انتخاب نمی‌شود و تیک را به او نسبت نمی‌دهد',
       pk.ok === false && /شیوهٔ خواندن/.test(String(pk.why)) &&
       String(pk.why).indexOf('تیک خورده') === -1,
       JSON.stringify({ ok: pk.ok, why: pk.why }));
    shS.getRange(atS, PC.STYLE).setValue('آرام و شمرده بخوان');
  }

  try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
  try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
  CFG.VOICE_SOUL_SEED = keepSoul;
  shS.getRange(atS, PC.PICK).setValue(keepPick);
}


console.log('\n══ ۳۲) برچسبِ بذر بخشی از شناسه است — وگرنه بذر هیچ نمی‌سازد (۷٫۸۶) ══');
/* شناسهٔ یک نمونهٔ روح (گوینده، قسمت) بود و بس. ردیفِ «نمونهٔ روح —
   spk-1g0r95d:53» از ۲۷ سپتامبر با وضعیتِ «رسید» در صفِ واقعی نشسته بود —
   همان فایلِ صافِ گامِ −۱۲ — پس بذرِ ۷٫۸۴ هر شب می‌گفت «برای همهٔ بذرها
   نمونه ساخته شده» و **هیچ نمی‌ساخت**. سالم به نظر می‌رسید و هیچ نبود:
   همان شکلِ ۷٫۴۶/۷٫۶۲، این بار در خودِ شناسه.

   سنجه‌ها از همان دری می‌روند که تولید می‌رود (۷٫۴۴/۷٫۶۲): `vbrSoulSeedDue_`
   و `runVoiceSoulTest`، نه `vbrSoulShow_` به‌تنهایی. */
{
  const realTry32 = global.ttsChunkTry_;
  global.ttsChunkTry_ = function () {
    return Buffer.alloc(24000 * 2 * 6).toString('base64');       // ~۶ ثانیه
  };
  const sh32 = personaTab_();
  let at32 = 0;
  {
    const rw = personaRows_(sh32);
    for (let i = 0; i < rw.length; i++) {
      if (String(rw[i][PC.KEY - 1]).trim() === 'razavi') { at32 = i + 2; break; }
    }
  }
  /* قسمتی با متنِ اعراب‌دار و پوشهٔ شناخته — همان چیدمانِ §۲۴، چون بی آن
     `runVoiceSoulTest` سرِ «متنِ اعراب‌دار نیست» می‌ایستد و سنجه راهِ
     دیگری می‌رود. */
  const fEp32 = OUT.createFolder('قسمتِ برچسب‌آزما');
  {
    const segs = [];
    for (let i = 0; i < 8; i++) {
      segs.push({ h: 'h' + i,
        t: 'شَبی از شَب‌هایِ پاییز بود و بادِ سَرد ایستاده بود شمارهٔ ' + i + '. ' +
           'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد و ایستاد. '.repeat(4) });
    }
    fEp32.createFile('_episode.json',
      JSON.stringify({ ep: { title: 'برچسب‌آزما', __speakSegs: segs } }),
      'application/json');
  }
  const rd32 = ytRenderRead_();
  const keepIt32 = rd32.items.slice();
  rd32.items = [{ key: 'variety:91', show: 'variety', ep: '91',
                  folderId: fEp32.getId(), title: 'نودویک' }];
  ytRenderSave_(rd32);

  const keepSeed32 = CFG.VOICE_SOUL_SEED;
  const keepPick32 = String(personaRows_(sh32)[at32 - 2][PC.PICK - 1] || '');
  const SHOW32 = knownShows_()[0].name;
  personaBoardSave_('razavi', false, [SHOW32], 1, 'آرام و شمرده بخوان', '', '', []);
  sh32.getRange(at32, PC.PITCH).setValue('');
  CFG.VOICE_SOUL_SEED = [{ speaker: 'razavi', show: 'variety', ep: '91',
                           tag: 'گام -2' }];

  /* ── ۳۲.۱ نمونهٔ بی‌برچسبِ دیروز جلوِ سنجشِ تازه را نمی‌گیرد ──
     عیناً حالتِ تولید در ۲۹ سپتامبر: ردیفِ بی‌برچسب، «رسید». */
  {
    const q = vbrRead_();
    q.items = [{ key: 'نمونهٔ روح — razavi:91', show: 'نمونهٔ روح — razavi',
                 ep: '91', speaker: 'razavi', status: 'رسید' }];
    vbrSave_(q);
    try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
    try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
    const due = vbrSoulSeedDue_();
    const pk = vbrSoulPick_();
    ok('۳۲.۱ نمونهٔ بی‌برچسبِ دیروز جلوِ سنجشِ تازه را نمی‌گیرد',
       due.scheduled === true && pk.ok === true && pk.tag === 'گام -2',
       JSON.stringify({ sched: due.scheduled, dueWhy: due.why,
                        ok: pk.ok, tag: pk.tag, why: pk.why }));
  }

  /* ── ۳۲.۲ و برچسب در شناسهٔ صف **و** در برچسبِ فایل می‌آید ──
     دو فایل به نامِ «نمونهٔ رنگ و روح — قسمت ۹۱» در تلگرام از هم تشخیص
     داده نمی‌شوند، و او همان‌جا می‌شنود نه در درایو. */
  {
    try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    const r = runVoiceSoulTest();
    const row = (vbrRead_().items || [])[0] || {};
    ok('۳۲.۲ برچسب هم در شناسهٔ صف و هم در برچسبِ فایل می‌آید',
       r.ok === true && String(row.key) === 'نمونهٔ روح — razavi · گام -2:91' &&
       String(row.label || '').indexOf('گام -2') !== -1,
       JSON.stringify({ ok: r.ok, why: r.why, key: row.key, label: row.label }));
  }

  /* ── ۳۲.۳ همان برچسب دو بار ساخته نمی‌شود، و هیچ حالتِ تازه‌ای لازم ندارد ──
     بی‌تکراری از همان سدِ صف می‌آید که از قبل بود (۷٫۸۲) — نه پرچمی که
     انسان نتواند بازش کند (۵٫۹۵)، نه شمارنده‌ای که خودش را صفر کند (۷٫۲۲). */
  {
    try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
    try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
    const due = vbrSoulSeedDue_();
    const trg = ScriptApp.getProjectTriggers()
      .filter((t) => t.getHandlerFunction() === 'runVoiceSoulSeed').length;
    ok('۳۲.۳ همان برچسب دو بار ساخته نمی‌شود و حالتی ذخیره نمی‌کند',
       due.scheduled === false && trg === 0 && /ساخته شده/.test(String(due.why)),
       JSON.stringify(due) + ' · تریگرها: ' + trg);
  }

  /* ── ۳۲.۴ برچسب یک **نام** است نه یک تنظیم ──
     گامِ واقعی از `personaPitch_` می‌آید و از هیچ‌جای دیگر. عددِ ردیف اینجا
     −۷ است، که هیچ پیش‌فرضی نیست (۷٫۸۱ همین بی‌باری را یک بخش آن‌طرف‌تر
     گرفت)، و برچسب عمداً عددِ **دیگری** می‌گوید. شکستنِ خواندنِ خانه در
     `personaPitch_` این را قرمز می‌کند —— ولی **نه اینجا**: آن شکستن روی ۲۹.۴
     و ۳۰.۳ می‌نشیند، چون §۲۹ جلوتر اجرا می‌شود. ثبت، نه وانمود (۷٫۷۴/۷٫۸۱):
     چیزی که این سنجه را واقعاً قرمز می‌کند، همان رگرسیونی است که برایش
     نوشته شده — اگر روزی `vbrAsk_` عددِ برچسب را به‌عنوانِ گام بخوانَد.
     امتحان شد و قرمز می‌شود. */
  {
    sh32.getRange(at32, PC.PITCH).setValue('-7');
    CFG.VOICE_SOUL_SEED = [{ speaker: 'razavi', show: 'variety', ep: '91',
                             tag: 'گام -9' }];
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    const r = runVoiceSoulTest();
    const row = (vbrRead_().items || [])[0] || {};
    ok('۳۲.۴ برچسب یک نام است نه یک تنظیم: گام از ردیفِ گوینده می‌آید',
       r.ok === true && String((row.params || {}).pitch) === '-7' &&
       String(row.key).indexOf('گام -9') !== -1,
       JSON.stringify({ pitch: (row.params || {}).pitch, key: row.key, why: r.why }));
    sh32.getRange(at32, PC.PITCH).setValue('');
  }

  /* ── ۳۲.۵ پویشِ صف و سازندهٔ شناسه یک تعریف‌اند ──
     دو تعریف یعنی زمان‌بند هر شب زمان‌بندی می‌کند و انتخاب‌کننده هر شب رد
     می‌کند — بی هیچ خطایی. ردیفِ **برچسب‌دار** در صف است و انتخاب‌کننده
     باید بشناسدش. و پویشِ صف اگر لفظِ خودش را داشته باشد، **۲۴.۱۳** قرمز
     می‌شود نه این — آن سنجه همین مرز را برای حالتِ بی‌برچسب نگه می‌دارد.
     نیمهٔ منحصرِ این سنجه آن است که پیام هم برچسب را نام می‌بَرد، وگرنه او
     نمی‌فهمد کدام سنجش ساخته شده؛ برداشتنِ برچسب از پیام قرمزش می‌کند. */
  {
    CFG.VOICE_SOUL_SEED = [{ speaker: 'razavi', show: 'variety', ep: '91',
                             tag: 'گام -2' }];
    const q = vbrRead_();
    q.items = [{ key: 'نمونهٔ روح — razavi · گام -2:91',
                 show: 'نمونهٔ روح — razavi · گام -2', ep: '91',
                 speaker: 'razavi', status: 'رسید' }];
    vbrSave_(q);
    const pk = vbrSoulPick_();
    ok('۳۲.۵ پویشِ صف و سازندهٔ شناسه یک تعریف‌اند',
       pk.ok === false && (pk.done || []).length === 1 &&
       /گام -2/.test(String(pk.why)),
       JSON.stringify({ ok: pk.ok, done: pk.done, why: pk.why }));
  }

  global.ttsChunkTry_ = realTry32;
  const rdB = ytRenderRead_(); rdB.items = keepIt32; ytRenderSave_(rdB);
  CFG.VOICE_SOUL_SEED = keepSeed32;
  sh32.getRange(at32, PC.PICK).setValue(keepPick32);
  try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
  try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
}


console.log('\n══ ۳۳) دو بذر، و نفرِ دوم که نوبت نمی‌گرفت (۷٫۸۷) ══');
/* صاحبِ برنامه همان ایراد را دو بار دربارهٔ رضوی گرفت، و نمونه‌ای که قرار بود
   جوابش باشد خودش صاف بود: «نمونهٔ روح — razavi:53» ساعتِ ۱۹:۳۷ِ ۲۷ سپتامبر
   ساخته شد و دستورِ لحن ۱۹:۳۳ رد شده بود. پس هر دو گوینده بذر می‌خواهند.

   و دو بذر شکلِ ۷٫۷۵ را برمی‌گردانَد: زمان‌بند فقط **زمان‌بندی** می‌کند، ردیفِ
   صف را یک دقیقه بعد `runVoiceSoulTest` می‌نویسد. پس میانِ دو فراخوانِ
   زمان‌بند، `have` عوض نشده — و نگارشِ ۷٫۸۶ هر بار همان بذرِ اول را
   برمی‌داشت. سقفِ روز با یک بذر پر می‌شد و نفرِ دوم هرگز نوبت نمی‌گرفت. */
{
  const keepSeed33 = CFG.VOICE_SOUL_SEED;
  const keepMax33 = CFG.VOICE_SOUL_SEED_MAX_DAY;

  /* ── ۳۳.۱ اجرای اولِ روز بذرِ اول، اجرای دوم بذرِ دوم ──
     این تابع اصلاً به شیت کار ندارد (CFG + صف + Script Properties)، پس
     بذرها لازم نیست گویندهٔ واقعی باشند: چیزی که سنجیده می‌شود نوبت است. */
  {
    CFG.VOICE_SOUL_SEED = [
      { speaker: 'aa', show: 'variety', ep: '1', tag: 't1' },
      { speaker: 'bb', show: 'variety', ep: '2', tag: 't2' }
    ];
    CFG.VOICE_SOUL_SEED_MAX_DAY = 2;
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
    try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
    const d1 = vbrSoulSeedDue_();
    const d2 = vbrSoulSeedDue_();
    ok('۳۳.۱ نوبت می‌چرخد، پس بذرِ دوم هم همان روز نوبت می‌گیرد',
       d1.scheduled === true && d2.scheduled === true &&
       d1.speaker === 'aa' && d2.speaker === 'bb',
       JSON.stringify([d1, d2]) +
       ' — بی چرخش، سقفِ روز با بذرِ اول پر می‌شود و نفرِ دوم هرگز نمی‌آید (۷٫۷۵)');
  }

  /* ── ۳۳.۲ هر بذرِ واقعی برچسب دارد، و برچسبش شناسه را از شکلِ بی‌برچسب
     جدا می‌کند ──
     بذرِ بی‌برچسب همان شناسه‌ای را می‌سازد که ردیفِ «رسید»ِ ۲۷ سپتامبر دارد،
     پس بی‌صدا هیچ نمی‌سازد — همان باگی که ۷٫۸۶ بست. و دو بذر با شناسهٔ یکسان
     یعنی یکی‌شان هرگز ساخته نمی‌شود. */
  {
    CFG.VOICE_SOUL_SEED = keepSeed33;
    const real = REAL_SOUL_SEED || [];
    const keys = real.map((se) => vbrSoulShow_(se.speaker, se.tag) + ':' + String(se.ep));
    const bare = real.map((se) => vbrSoulShow_(se.speaker, '') + ':' + String(se.ep));
    const uniq = keys.filter((k, i) => keys.indexOf(k) === i).length;
    const speakers = real.map((se) => String(se.speaker));
    ok('۳۳.۲ هر دو گوینده بذر دارند، هر بذر برچسب، و هیچ شناسه‌ای تکراری نیست',
       real.length >= 2 && speakers.indexOf('razavi') !== -1 &&
       uniq === keys.length &&
       keys.every((k, i) => k !== bare[i]),
       JSON.stringify({ keys: keys, bare: bare }) +
       ' — برچسبِ خالی یعنی همان شناسهٔ ردیفِ «رسید»ِ ۲۷ سپتامبر، یعنی بی‌صدا هیچ');
  }

  /* ── ۳۳.۳ سقفِ روز پیش از خواندنِ صف پرسیده می‌شود ──
     چرخش به شمارندهٔ روز نیاز دارد، پس آن خواندن باید **جلوتر** بیاید؛ و
     صرفه‌جویی‌اش واقعی است: روزی که سقف پر است، صف هم خوانده نمی‌شود. */
  {
    CFG.VOICE_SOUL_SEED = [{ speaker: 'aa', show: 'variety', ep: '1', tag: 't1' }];
    const realRead = global.vbrRead_;
    let reads = 0;
    global.vbrRead_ = function () { reads++; return realRead.apply(null, arguments); };
    try {
      try {
        props_().setProperty('VSOUL_SEED_DAY',
                             String(nowStr_()).slice(0, 10) + '|99');
      } catch (e) {}
      reads = 0;
      const dFull = vbrSoulSeedDue_();
      const rFull = reads;
      try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
      try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
      reads = 0;
      const dFree = vbrSoulSeedDue_();
      ok('۳۳.۳ با سقفِ پر، صف خوانده نمی‌شود',
         dFull.scheduled === false && /سقف/.test(String(dFull.why)) &&
         rFull === 0 && dFree.scheduled === true && reads === 1,
         'پر: ' + rFull + ' خواندن · آزاد: ' + reads + ' · ' +
         JSON.stringify([dFull, dFree]));
    } finally { global.vbrRead_ = realRead; }
  }

  CFG.VOICE_SOUL_SEED = keepSeed33;
  CFG.VOICE_SOUL_SEED_MAX_DAY = keepMax33;
  try { clearRetryTriggers_('runVoiceSoulSeed'); } catch (e) {}
  try { props_().deleteProperty('VSOUL_SEED_DAY'); } catch (e) {}
}



console.log('\n══ ۳۴) سدی که جلوِ درمانِ ۸.۰۸ را می‌گرفت (۸٫۰۹) ══');
/* ۷٫۷۹ سدی ساخت که با خاموش‌بودنِ دستورِ لحن، نمونهٔ روح را رد می‌کند — و آن
   روز درست بود، چون لحن **فقط** از فیلدِ دستور می‌آمد و فایلی که می‌ساخت
   همان «رنگ‌تنها»ی دیروز بود.

   ۸٫۰۸ راهِ دوم را ساخت: نشانه‌های خودِ متن. و ۸٫۰۷ قالبِ پیشوندی را خاموش
   کرد، پس `ttsCueStatus_().ok` روی مدلی که فیلد را رد کند **false** است.
   یعنی نمونه‌ای که برای سنجشِ نشانه‌ها ساخته می‌شود، هرگز ساخته نمی‌شد:
   سدی که برای دنیای قبل درست بود و جلوِ درمانِ دنیای بعد را می‌گرفت — همان
   شکلِ ۷٫۴۶/۷٫۶۲، این بار نه «درمان روی راهی که پیموده نمی‌شود» بلکه
   «نگهبانی که درمان را نمی‌شناسد».

   ادعا رفتاری است و از درِ تولید وارد می‌شود: با دستورِ خاموش، متنی که
   نشانه دارد باید نمونه بسازد، و برچسبش نه «روح» باشد نه «رنگ‌تنها». */
{
  const realTry34 = global.ttsChunkTry_;
  const realUi34 = global.ui_;
  const realGem34 = global.geminiText_;
  const keepMode34 = CFG.TTS_CUE_MODE;
  let ttsCalls34 = 0, said34 = '';
  global.ttsChunkTry_ = function () {
    ttsCalls34++;
    return Buffer.alloc(24000 * 2 * 8).toString('base64');
  };
  global.ui_ = () => ({ alert: function (t, m) { said34 = String(m); },
                        ButtonSet: { OK: 1 } });

  /* قسمتی که متنِ ذخیره‌شده‌اش **از قبل** نشانهٔ لحن دارد — یعنی همان چیزی که
     از فردا تولید می‌سازد. ترمیم لازم نیست، پس این بند به مدل کاری ندارد و
     شاهد از خودِ متن می‌آید نه از پرچمی که خودمان بالا برده باشیم. */
  const fEp34 = OUT.createFolder('قسمتِ نشانه‌دار');
  const segs34 = [];
  for (let i = 0; i < 20; i++) {
    segs34.push({ h: 'h' + i, t:
      'شَبی از شَب‌هایِ پاییز بود — و بادِ سَرد پُشتِ پَنجِره ایستاده بود! ' +
      'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد… آیا کَسی خانه بود؟ ' +
      'او گفت «دیر آمدی» و دَر را بَست. شُمارهٔ ' + i + '. ' });
  }
  fEp34.createFile('_episode.json',
    JSON.stringify({ ep: { title: 'نشانه‌دار', __speakSegs: segs34 } }),
    'application/json');

  try {
    const q34 = vbrRead_(); q34.items = []; vbrSave_(q34);
    const rd34 = ytRenderRead_();
    const keepRd34 = rd34.items.slice();
    rd34.items = [{ key: 'variety:94', show: 'variety', ep: '94',
                    folderId: fEp34.getId(), status: 'رسید' }];
    ytRenderSave_(rd34);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1,
                      'آرام و شمرده بخوان', '', '', ['variety:94']);

    CFG.TTS_CUE_MODE = 'off';
    ok('۳۴.۰ حالتِ «دستورِ لحن خاموش» واقعاً ساخته شد',
       ttsCueStatus_().ok === false,
       'گرفت: ' + String(ttsCueStatus_().ok) +
       ' — سنجه‌ای که روی حالتِ سالم بدوَد چیزی را ثابت نمی‌کند');
    ok('۳۴.۰-ب و متنِ این قسمت واقعاً نشانهٔ لحن دارد',
       speakProsody_(epSpeakText_(fEp34.getId())).richPer1k >=
         Number(CFG.SPEAK_PROSODY_MIN),
       'گویا در هزار: ' +
       speakProsody_(epSpeakText_(fEp34.getId())).richPer1k +
       ' · سقف: ' + CFG.SPEAK_PROSODY_MIN);

    ttsCalls34 = 0; said34 = '';
    const r34 = runVoiceSoulTest();

    ok('۳۴.۱ با دستورِ خاموش ولی متنِ نشانه‌دار، نمونه ساخته می‌شود',
       !!(r34 && r34.ok === true && ttsCalls34 > 1),
       JSON.stringify({ ok: r34 && r34.ok, why: r34 && r34.why,
                        tts: ttsCalls34 }) +
       ' — سدِ ۷٫۷۹ این را رد می‌کرد، یعنی نمونه‌ای که برای سنجشِ نشانه‌ها ' +
       'ساخته می‌شود هرگز ساخته نمی‌شد');

    const row34 = vbrRead_().items.filter(
      (x) => /نمونهٔ روح/.test(String(x.key)))[0];
    ok('۳۴.۲ و برچسبش نه «روح» است نه «رنگ‌تنها» — راستش را می‌گوید',
       !!row34 && row34.soul === 'لحن از نشانه‌ها' &&
       /نشانه‌های متن/.test(String(row34.soulWhy)),
       row34 ? JSON.stringify({ soul: row34.soul, why: row34.soulWhy })
             : 'ردیفی نوشته نشد');

    /* کپشن تابعِ خودش نیست؛ داخلِ `vbrTgTell_` ساخته می‌شود. پس همان را
       می‌دوانیم و متنی که **واقعاً به تلگرام می‌رود** سنجیده می‌شود — نه
       بازخوانیِ یک رشته در آزمون (۷٫۶۲: درِ تولید، نه خودِ تابع). */
    let capSeen = '';
    const realApi34 = global.tgApi_;
    const realSend34 = global.tgSend_;
    const realEn34 = global.tgEnabled_;
    global.tgEnabled_ = () => true;
    global.tgApi_ = function (m, p) {
      if (p && p.caption) capSeen = String(p.caption);
      return { ok: true };
    };
    global.tgSend_ = function (t) { capSeen = String(t); return true; };
    try { vbrTgTell_(row34, 'بهروز رضوی', []); } catch (eTg) {}
    global.tgApi_ = realApi34;
    global.tgSend_ = realSend34;
    global.tgEnabled_ = realEn34;
    ok('۳۴.۳ و کپشنِ تلگرام همان را می‌گوید — او آن‌جا می‌شنود، نه در درایو',
       /لحن از نشانه‌های متن/.test(capSeen),
       capSeen.slice(0, 200) ||
       '(کپشنی نرفت) — برچسبی که فقط در صف بنشیند، جایی است که او نگاه نمی‌کند');

    /* و مرزِ مقابل: متنِ **بی‌نشانه** با دستورِ خاموش هنوز رد می‌شود، وگرنه
       ۸٫۰۹ سدِ ۷٫۷۹ را باز کرده بود نه باریک‌تر. ترمیم هم نباید نجاتش بدهد،
       پس مدل جوابی می‌دهد که از وارسی نمی‌گذرد. */
    const q34b = vbrRead_(); q34b.items = []; vbrSave_(q34b);
    const fEp34b = OUT.createFolder('قسمتِ بی‌نشانه');
    const segs34b = [];
    for (let i = 0; i < 20; i++) {
      segs34b.push({ h: 'h' + i, t:
        'شَبی از شَب‌هایِ پاییز بود و بادِ سَرد پُشتِ پَنجِره ایستاده بود. ' +
        'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد و ایستاد. شُمارهٔ ' +
        i + '. ' });
    }
    fEp34b.createFile('_episode.json',
      JSON.stringify({ ep: { title: 'بی‌نشانه', __speakSegs: segs34b } }),
      'application/json');
    const rd34b = ytRenderRead_();
    rd34b.items = [{ key: 'variety:95', show: 'variety', ep: '95',
                     folderId: fEp34b.getId(), status: 'رسید' }];
    ytRenderSave_(rd34b);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1,
                      'آرام و شمرده بخوان', '', '', ['variety:95']);
    global.geminiText_ = function (pr) {
      if (String(pr).indexOf('فقط نشانه‌گذاریِ لحن') === -1) {
        return realGem34 ? realGem34.apply(null, arguments) : null;
      }
      return { t: 'واژه‌هایِ کاملاً دیگری! که از سدِ وارسی نمی‌گذرند؟' };
    };
    ttsCalls34 = 0; said34 = '';
    const r34b = runVoiceSoulTest();
    /* شکستنِ «شاهد بی ورودی» (`prMarks = true` ثابت) روی ۲۷.۱ نشست، نه
       این‌جا — §۲۷ زودتر می‌دود و همین مرز را از قبل نگه می‌دارد. ثبت
       می‌شود، نه ادعا (۷٫۷۴)؛ ۳۴.۴ همان مرز را درونِ §۳۴ هم می‌گیرد. */
    ok('۳۴.۴ ولی متنِ بی‌نشانه با دستورِ خاموش هنوز رد می‌شود — سد باریک شد، باز نشد',
       !!(r34b && r34b.ok === false && r34b.cueOff === true) && ttsCalls34 === 0,
       JSON.stringify({ ok: r34b && r34b.ok, cueOff: r34b && r34b.cueOff,
                        tts: ttsCalls34 }));
    ok('۳۴.۴-ب و پیامش می‌گوید نشانه هم نبود، نه فقط دستور',
       /نشانهٔ لحن ندارد/.test(said34),
       said34.slice(0, 200) +
       ' — علتی که نیمی‌اش گفته شود، او را سرِ راهِ غلط می‌فرستد');

    ytRenderSave_(Object.assign(ytRenderRead_(), { items: keepRd34 }));
  } finally {
    global.ttsChunkTry_ = realTry34;
    global.ui_ = realUi34;
    global.geminiText_ = realGem34;
    CFG.TTS_CUE_MODE = keepMode34;
    try { props_().deleteProperty(PK.TTS_CUE_DROP_AT); } catch (e) {}
  }
}
console.log('\n══ ۳۵) نمونه‌ای که نشانهٔ زیرِ سنجش را ندارد (۸٫۱۰) ══');
/* صاحبِ برنامه خودش گرفتش: «شاید تو اون نمونه که میشنوم گیومه و یا این
   نشانه‌ها نباشه که ببینم به صورتِ واژه میخونه یا به صورتِ رعایتِ لحن.»

   درست است، و همان شکلِ ۷٫۷۳ است — سنجه‌ای که پنجره‌اش ممکن است چیزِ زیرِ
   سنجش را نداشته باشد، آن را هرگز نمی‌بیند. و «گیومه» و «پرانتز» بدترین دوتا
   هستند، چون نامشان واژه است: اگر گفتارساز بلند بخواندشان، شنیده می‌شود — و
   اگر در نمونه نباشند، هیچ‌وقت معلوم نمی‌شود.

   دو ادعا: متنِ نمونه خواستِ **پوشش** می‌برد (نه فقط چگالی)، و آنچه در نمونه
   نیست **به نام** گفته می‌شود. */
{
  const realTry35 = global.ttsChunkTry_;
  const realUi35 = global.ui_;
  const realGem35 = global.geminiText_;
  let said35 = '', askedCover = '';
  global.ttsChunkTry_ = function () {
    return Buffer.alloc(24000 * 2 * 8).toString('base64');
  };
  global.ui_ = () => ({ alert: function (t, m) { said35 = String(m); },
                        ButtonSet: { OK: 1 } });

  /* متنی که چگالی‌اش بالاست ولی **گیومه و پرانتز ندارد** — یعنی دقیقاً حالتی
     که او توصیفش کرد: به‌نظر لحن‌دار، و بی آن دو نشانه‌ای که باید سنجیده شوند.
     نگارشِ قبل این متن را «از قبل نشانه دارد» می‌دید و هیچ ترمیمی نمی‌رفت. */
  const fEp35 = OUT.createFolder('قسمتِ بی‌گیومه');
  const segs35 = [];
  for (let i = 0; i < 20; i++) {
    segs35.push({ h: 'h' + i, t:
      'شَبی از شَب‌هایِ پاییز بود — و بادِ سَرد پُشتِ پَنجِره ایستاده بود! ' +
      'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد… آیا کَسی خانه بود؟ ' +
      'شُمارهٔ ' + i + '. ' });
  }
  fEp35.createFile('_episode.json',
    JSON.stringify({ ep: { title: 'بی‌گیومه', __speakSegs: segs35 } }),
    'application/json');

  try {
    const base35 = epSpeakText_(fEp35.getId());
    const cv35 = speakMarkCover_(base35);
    ok('۳۵.۰ متنِ آزمون واقعاً پرچگالی است ولی گیومه و پرانتز ندارد',
       speakProsody_(base35).richPer1k >= Number(CFG.SPEAK_PROSODY_MIN) &&
       cv35.miss.indexOf('گیومه « »') !== -1 &&
       cv35.miss.indexOf('پرانتز ( )') !== -1,
       'گویا در هزار: ' + speakProsody_(base35).richPer1k +
       ' · جامانده: ' + JSON.stringify(cv35.miss) +
       ' — سنجه‌ای که این حالت را نسازد، چیزی را ثابت نمی‌کند');

    const q35 = vbrRead_(); q35.items = []; vbrSave_(q35);
    const rd35 = ytRenderRead_();
    const keepRd35 = rd35.items.slice();
    rd35.items = [{ key: 'variety:96', show: 'variety', ep: '96',
                    folderId: fEp35.getId(), status: 'رسید' }];
    ytRenderSave_(rd35);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1,
                      'آرام و شمرده بخوان', '', '', ['variety:96']);

    global.geminiText_ = function (pr) {
      if (String(pr).indexOf('فقط نشانه‌گذاریِ لحن') === -1) {
        return realGem35 ? realGem35.apply(null, arguments) : null;
      }
      askedCover = String(pr);
      /* همان واژه‌ها، با گیومه و پرانتز افزوده — از `verifySpeak_` می‌گذرد،
         چون `speakBone_` هر دو را برمی‌دارد و مرزِ جمله دست نخورده. */
      const src = String(pr).split('\n\n').pop();
      return { t: src.replace(/مَردی که سال‌ها دور مانده بود/g,
                              'مَردی (که سال‌ها دور مانده بود)')
                     .replace(/آیا کَسی خانه بود؟/g, 'آیا «کَسی» خانه بود؟')
                     /* `!` ⇒ `؟!` — شمارِ مرزِ جمله عوض نمی‌شود، چون الگوی
                        پایان‌بندی `+` دارد و دو نویسهٔ چسبیده یک مرز است. */
                     .replace(/ایستاده بود!/g, 'ایستاده بود؟!') };
    };

    said35 = ''; askedCover = '';
    const r35 = runVoiceSoulTest();

    ok('۳۵.۱ متنِ پرچگالیِ بی‌گیومه هم ترمیم می‌خورد — سقف، پوشش است نه چگالی',
       askedCover !== '', 'پرسشی نرفت — یعنی همان حالتی که او توصیفش کرد، ' +
       'بی‌جواب می‌مانْد');
    /* ادعا دربارهٔ **محتوا**ست نه دربارهٔ واژه‌آراییِ پرامپت: هر هفت نشانه
       باید در خواسته باشند، و فهرست از `SPEAK_MARK_NEED` خوانده می‌شود نه
       دست‌نویس — وگرنه نشانهٔ هشتمی که فردا اضافه شود این سنجه را سبز
       می‌گذارد (۷٫۵۹: سنجه‌ای که امروز را نام ببرد، فردا عوضی می‌شود). */
    const needLine = askedCover.slice(askedCover.indexOf('نمونهٔ آزمون'));
    const missInAsk = SPEAK_MARK_NEED.filter((e) => needLine.indexOf(e.k) === -1);
    ok('۳۵.۱-ب و خودِ پرسش هر هفت نشانه را به نام می‌خواهد',
       needLine !== '' && missInAsk.length === 0,
       'جامانده از خواسته: ' + JSON.stringify(missInAsk.map((e) => e.nm)) +
       ' · ' + needLine.slice(0, 180));

    ok('۳۵.۲ و نمونه ساخته شد', !!(r35 && r35.ok === true),
       JSON.stringify({ ok: r35 && r35.ok, why: r35 && r35.why }));
    ok('۳۵.۳ پیام می‌گوید کدام نشانه‌ها در نمونه هست',
       /نشانه‌های موجود در این نمونه/.test(said35) &&
       /گیومه « »/.test(said35),
       said35.slice(said35.indexOf('نشانه‌های موجود'), said35.indexOf('نشانه‌های موجود') + 220));
    ok('۳۵.۴ و چون هر هفت تا آمد، می‌گوید هر هفت را می‌توانی بسنجی',
       /هر هفت نشانه در متن هست/.test(said35),
       said35.slice(-260));

    /* ══ و مرزِ مقابل: جوابی که پوشش را کامل نکند، سکوت نمی‌شود ══
       همین است کلِ ایرادِ او: اگر نگوییم «گیومه نبود»، او چهار دقیقه گوش
       می‌دهد و خیال می‌کند قضاوت کرده. */
    const q35b = vbrRead_(); q35b.items = []; vbrSave_(q35b);
    global.geminiText_ = function (pr) {
      if (String(pr).indexOf('فقط نشانه‌گذاریِ لحن') === -1) {
        return realGem35 ? realGem35.apply(null, arguments) : null;
      }
      const src = String(pr).split('\n\n').pop();
      return { t: src.replace(/ایستاده بود!/g, 'ایستاده بود؟!') };   // گیومه و پرانتز نه
    };
    said35 = '';
    const r35b = runVoiceSoulTest();
    ok('۳۵.۵ جوابی که گیومه و پرانتز نیاورد، نمونه را نگه می‌دارد ولی نامشان را می‌گوید',
       !!(r35b && r35b.ok === true) &&
       /دربارهٔ این‌ها قضاوت نکنید/.test(said35) &&
       /گیومه « »/.test(said35) && /پرانتز \( \)/.test(said35),
       said35.slice(said35.indexOf('نشانه‌های موجود'), said35.indexOf('نشانه‌های موجود') + 240) ||
       said35.slice(0, 200));

    ytRenderSave_(Object.assign(ytRenderRead_(), { items: keepRd35 }));
  } finally {
    global.ttsChunkTry_ = realTry35;
    global.ui_ = realUi35;
    global.geminiText_ = realGem35;
    try { props_().deleteProperty(PK.TTS_CUE_DROP_AT); } catch (e) {}
  }
}

console.log('\n══ ۳۶) شاهدِ نشانه‌ها باید از اجرا بیرون برود (۸٫۱۴) ══');
/* ۸٫۱۰ جملهٔ درست را ساخت — «در این نمونه نیست، پس دربارهٔ این‌ها قضاوت
   نکنید» — و در `say()` گذاشتش، یعنی در پنجرهٔ دکمهٔ منو. ولی از ۷٫۸۲/۷٫۸۴
   نمونه را `VOICE_SOUL_SEED` خودش زمان‌بندی می‌کند و هیچ انسانی آن پنجره را
   باز نمی‌کند: درمانی روی راهی که پیموده نمی‌شود (۷٫۶۲)، و شاهدی که با
   پایانِ اجرا می‌مُرد (۷٫۴۴).

   مدرکِ واقعیِ ۱ اکتبر ۲۰۲۶ در `_VOICE-RENDER.json`: ردیفِ «نمونهٔ روح —
   razavi · نشانه‌گذاریِ لحن:53» با `soul: رنگ‌تنها` بسته شد — یعنی `prMarks`
   خالی بود: متنِ نمونه‌ای که **نامش** «نشانه‌گذاریِ لحن» است به سقف نرسید، و
   نه ردیف و نه کپشن این را نگفتند. فایل با همان نام رفت.

   سه ادعا: عدد و پوشش روی **ردیف** می‌نشینند · کپشنِ تلگرام نامشان را
   می‌برد · و ردیفی که سنجشی نداشته، **هیچ** چیزی دربارهٔ نشانه‌ها نمی‌گوید
   («نسنجیده» با «نبودن» یکی نیست — ۸٫۰۵). */
{
  const realTry36 = global.ttsChunkTry_;
  const realUi36 = global.ui_;
  const realGem36 = global.geminiText_;
  const keepMarks36 = CFG.SPEAK_MARKS;
  let said36 = '';
  global.ttsChunkTry_ = function () {
    return Buffer.alloc(24000 * 2 * 8).toString('base64');
  };
  global.ui_ = () => ({ alert: function (t, m) { said36 = String(m); },
                        ButtonSet: { OK: 1 } });

  /* کپشن تابعِ خودش نیست؛ داخلِ `vbrTgTell_` ساخته می‌شود — پس متنی که
     **واقعاً به تلگرام می‌رود** سنجیده می‌شود، نه بازخوانیِ یک رشته. */
  const capOf = function (row) {
    let seen = '';
    const rA = global.tgApi_, rS = global.tgSend_, rE = global.tgEnabled_;
    global.tgEnabled_ = () => true;
    global.tgApi_ = function (m, p) {
      if (p && p.caption) seen = String(p.caption);
      return { ok: true };
    };
    global.tgSend_ = function (t) { seen = String(t); return true; };
    try { vbrTgTell_(row, 'بهروز رضوی', []); } catch (eT) {}
    global.tgApi_ = rA; global.tgSend_ = rS; global.tgEnabled_ = rE;
    return seen;
  };
  const soulRow = function () {
    return vbrRead_().items.filter((x) => /نمونهٔ روح/.test(String(x.key)))[0];
  };

  const fEp36 = OUT.createFolder('قسمتِ شاهدِ نشانه');
  const segs36 = [];
  for (let i = 0; i < 20; i++) {
    segs36.push({ h: 'h' + i, t:
      'شَبی از شَب‌هایِ پاییز بود و بادِ سَرد پُشتِ پَنجِره ایستاد. ' +
      'مَردی که سال‌ها دور مانده بود کِلید را چَرخانْد و ایستاد. شُمارهٔ ' +
      i + '. ' });
  }
  fEp36.createFile('_episode.json',
    JSON.stringify({ ep: { title: 'شاهدِ نشانه', __speakSegs: segs36 } }),
    'application/json');

  const keepRd36 = ytRenderRead_().items.slice();
  try {
    const rd36 = ytRenderRead_();
    rd36.items = [{ key: 'variety:94', show: 'variety', ep: '94',
                    folderId: fEp36.getId(), status: 'رسید' }];
    ytRenderSave_(rd36);
    personaBoardSave_('razavi', false, [knownShows_()[0].name], 1,
                      'آرام و شمرده بخوان', '', '', ['variety:94']);

    /* ── الف) ترمیم می‌گیرد ولی پوشش کامل نمی‌شود: همان حالتی که او ترسش را
       گفت. جواب فقط `؟!` می‌آورد — گیومه و پرانتز نه. */
    let q36 = vbrRead_(); q36.items = []; vbrSave_(q36);
    global.geminiText_ = function (pr) {
      if (String(pr).indexOf('فقط نشانه‌گذاریِ لحن') === -1) {
        return realGem36 ? realGem36.apply(null, arguments) : null;
      }
      const src = String(pr).split('\n\n').pop();
      return { t: src.replace(/پُشتِ پَنجِره ایستاد\./g, 'پُشتِ پَنجِره ایستاد؟!') };
    };
    said36 = '';
    const rA = runVoiceSoulTest();
    const rowA = soulRow();
    ok('۳۶.۱ نمونه ساخته شد و ردیفش پوششِ نشانه‌ها را با خودش دارد',
       /* هر سه میدان جدا خواسته می‌شوند: نگارشِ اول فقط `markMiss` و
          `markRich` را می‌پرسید، و شکستنِ عمدیِ **`markHave`** روی ۳۶.۲
          نشست نه این‌جا — یعنی ادعای «ردیف پوشش را دارد» نیمی‌اش بی‌سنجه
          بود. ادعایی که بخشی از خودش را نسنجد، همان سنجهٔ توخالی است. */
       !!(rA && rA.ok === true) && !!rowA &&
       typeof rowA.markHave === 'string' &&
       rowA.markHave.indexOf('پرسش ؟') !== -1 &&
       typeof rowA.markMiss === 'string' &&
       rowA.markMiss.indexOf('گیومه « »') !== -1 &&
       rowA.markMiss.indexOf('پرانتز ( )') !== -1 &&
       typeof rowA.markRich === 'number',
       JSON.stringify({ ok: rA && rA.ok, why: rA && rA.why,
                        have: rowA && rowA.markHave,
                        miss: rowA && rowA.markMiss,
                        rich: rowA && rowA.markRich }) +
       ' — بی این، شاهد با پایانِ اجرا می‌مُرد و فردا کسی نمی‌دانست نمونه ' +
       'گیومه داشت یا نه (ردیفِ ۱ اکتبر عیناً همین بود)');

    const capA = capOf(rowA);
    ok('۳۶.۲ و کپشنِ تلگرام نامشان را می‌برد — او همان‌جا می‌شنود، نه در درایو',
       /دربارهٔ این‌ها قضاوت نکنید/.test(capA) &&
       /گیومه « »/.test(capA) && /پرانتز \( \)/.test(capA),
       capA.slice(capA.indexOf('نشانه‌های لحن'), capA.indexOf('نشانه‌های لحن') + 260) ||
       capA.slice(0, 220) ||
       '(کپشنی نرفت) — جمله‌ای که فقط در `say()` بماند، به کسی نمی‌رسد');

    /* ── ب) ترمیم **خواسته شد و نگرفت**: دلیلش باید روی ردیف بنشیند، وگرنه
       فردا علت در حافظهٔ یک اجرای مُرده است. */
    q36 = vbrRead_(); q36.items = []; vbrSave_(q36);
    global.geminiText_ = function (pr) {
      if (String(pr).indexOf('فقط نشانه‌گذاریِ لحن') === -1) {
        return realGem36 ? realGem36.apply(null, arguments) : null;
      }
      return { t: 'واژه‌هایِ کاملاً دیگری! که از سدِ وارسی نمی‌گذرند؟' };
    };
    said36 = '';
    const rB = runVoiceSoulTest();
    const rowB = soulRow();
    const capB = rowB ? capOf(rowB) : '';
    ok('۳۶.۳ ترمیمی که نگرفت، دلیلش روی ردیف و در کپشن است',
       !!(rB && rB.ok === true) && !!rowB &&
       /ترمیمِ نشانه‌گذاری نگرفت/.test(String(rowB.markWhy || '')) &&
       /ترمیمِ نشانه‌گذاری نگرفت/.test(capB),
       JSON.stringify({ ok: rB && rB.ok, why: rB && rB.why,
                        markWhy: rowB && rowB.markWhy }) +
       ' · کپشن: ' + capB.slice(capB.indexOf('نشانه‌های لحن'), capB.indexOf('نشانه‌های لحن') + 240));
    /* ⚠️ آنچه §۳۶ نمی‌سازد، و ادعا نمی‌شود: شاخهٔ «متن از قبل هر هفت نشانه را
       دارد». شکستنِ عمدیِ آن شاخه (گذاشتنِ `prWhy` در آن) **هیچ‌جا ننشست**،
       چون هر سه حالتِ این بخش از شاخهٔ **ترمیم** می‌گذرند. پس ۳۶.۳-ب فقط
       دربارهٔ «ترمیم رفت و گرفت» است؛ آن شاخه را ۳۵.۴ در سطحِ پیام می‌گیرد و
       در سطحِ **ردیف** بی‌سنجه است. ثبت می‌شود، نه پوشانده (۸٫۱۰). */
    ok('۳۶.۳-ب ولی ترمیمی که گرفت دلیلی ندارد — شمردنِ حالتِ سالم همان هشداری ' +
       'است که یاد می‌گیرند نخوانند',
       !!rowA && rowA.markWhy === undefined,
       JSON.stringify({ markWhy: rowA && rowA.markWhy }));

    /* ── ج) مرزِ مقابل، و مهم‌ترینشان: ردیفی که **سنجشِ نشانه نداشته** هیچ
       چیزی دربارهٔ نشانه‌ها نمی‌گوید. بی این گارد، کپشنِ هر قسمتِ عادی هر شب
       «✅ هر هفت نشانه هست» می‌گفت — دروغی که هیچ‌کس نخواسته، روی هر قسمت.
       حالت دست‌ساز نیست: `CFG.SPEAK_MARKS === false` یک تنظیمِ واقعیِ تولید
       است و همان مسیر را می‌سازد (۷٫۲۲/۷٫۷۵). */
    q36 = vbrRead_(); q36.items = []; vbrSave_(q36);
    CFG.SPEAK_MARKS = false;
    said36 = '';
    const rC = runVoiceSoulTest();
    const rowC = soulRow();
    const capC = rowC ? capOf(rowC) : '';
    ok('۳۶.۴ ردیفِ بی‌سنجش هیچ چیزی دربارهٔ نشانه‌ها نمی‌گوید — «نسنجیده» با «نبودن» یکی نیست',
       !!(rC && rC.ok === true) && !!rowC &&
       rowC.markHave === undefined && rowC.markMiss === undefined &&
       rowC.markRich === undefined &&
       capC.indexOf('نشانه‌های لحن در این نمونه') === -1 &&
       capC.indexOf('هر هفت نشانه هست') === -1,
       JSON.stringify({ ok: rC && rC.ok,
                        have: rowC && rowC.markHave,
                        miss: rowC && rowC.markMiss,
                        rich: rowC && rowC.markRich }) +
       ' · کپشن: ' + capC.slice(0, 220));
  } finally {
    CFG.SPEAK_MARKS = keepMarks36;
    global.ttsChunkTry_ = realTry36;
    global.ui_ = realUi36;
    global.geminiText_ = realGem36;
    ytRenderSave_(Object.assign(ytRenderRead_(), { items: keepRd36 }));
    try { props_().deleteProperty(PK.TTS_CUE_DROP_AT); } catch (e) {}
  }
}

console.log('\n══ ۳۷) متنِ آزمونِ گویندگان — همان متن برای هر دو (۸٫۲۵) ══');
{
  /* او خواست متنی «خارج از درس‌نامه» که «تمام مواردِ نگارشی» و همهٔ حالت‌های
     تازه را داشته باشد و «کوتاه هم نباشه». هر کدام از این سه، یک سنجه. */
  const def = vtestDef_('ساعت‌ساز');
  const p = vtestPlain_(def);
  const tr = speakSpanTrim_({ spans: p.spans }, p.n);
  const kinds = Object.keys(speakProsody_(p.text).has || {});
  const ALL = ['!', '؟', '؟!', '…', '؛', '،', '—', '« »', '( )', '(؟)'];
  ok('۳۷.۱ هر ده نشانه در متن هست',
     ALL.every(k => kinds.indexOf(k) !== -1), JSON.stringify(kinds));
  const moods = tr.spans.map(x => x.k);
  ok('۳۷.۱-ب هر نُه حالت هست، و هیچ‌کدام ردِ سدِ حالت‌ها نشد',
     SPEAK_SPANS.every(d => moods.indexOf(d.k) !== -1) && !Object.keys(tr.drop).length,
     JSON.stringify({ moods, drop: tr.drop }));
  ok('۳۷.۱-پ کوتاه نیست — دستِ‌کم ۲۵۰۰ نویسه', p.text.length >= 2500, String(p.text.length));

  /* ۳۴.۲ — **هر حالت روی همان جمله‌ای می‌نشیند که برایش نوشته شد.** تلهٔ واقعی:
     پایان‌بندی درونِ گیومه یا پرانتز مرزِ جمله نیست، پس دو جمله یکی می‌شوند و
     همهٔ شماره‌های بعد یکی جابه‌جا — «نجوا» روی جملهٔ کناری، بی هیچ خطایی. */
  const ss = speakSentSplit_(p.text);
  const miss = [];
  def.blocks.forEach(b => {
    if (!b.k || b.k === 'مکث' || !b.t) return;
    const sp = tr.spans.filter(x => x.k === b.k)[0];
    const first = speakSentSplit_(b.t)[0];
    if (!sp || ss[sp.a - 1] !== first) miss.push(b.k);
  });
  ok('۳۷.۲ هر حالت روی جملهٔ خودش', !miss.length && ss.length === p.n, JSON.stringify(miss));

  /* ۳۴.۳ — اعراب یک بار، با نشانه‌های دست‌نخورده، و برای هر دو گوینده همان. */
  const realV = global.vowelizePiece_;
  let calls = 0, marksOff = true;
  const fatha = (x) => String(x).replace(/([بتپثجچحخدذرزژسشصضطظعغفقکگلمن])/g, '$1َ');
  global.vowelizePiece_ = function (pc) {
    calls++; if (CFG.SPEAK_MARKS !== false) marksOff = false;
    return fatha(pc);
  };
  const par = vbrSoulFolder_();
  const trash = () => { const it = par.getFilesByName('متنِ آزمونِ گویندگان — ساعت‌ساز — نسخهٔ ' + def.ver + '.json');
                        while (it.hasNext()) it.next().setTrashed(true); };
  trash();
  let a1, a2;
  try { a1 = vtestText_('ساعت‌ساز'); const c1 = calls; a2 = vtestText_('ساعت‌ساز');
        ok('۳۷.۳ بارِ اول اعراب می‌گیرد و ذخیره می‌شود، بارِ دوم از پرونده — یک متن برای هر دو',
           a1.ok && a1.fresh && a1.vowelled === a1.pieces && a1.pieces >= 2 &&
           a2.ok && !a2.fresh && a2.t === a1.t && calls === c1,
           JSON.stringify({ f1: a1.fresh, f2: a2.fresh, v: a1.vowelled, p: a1.pieces, same: a2.t === a1.t, calls }));
        ok('۳۷.۳-ب اعراب‌گذار با نشانه‌گذاریِ خاموش پرسیده شد، و تنظیم برگشت',
           marksOff && CFG.SPEAK_MARKS !== false);
  } finally { global.vowelizePiece_ = realV; }

  /* ۳۴.۴ — تکه‌ای که نشانه‌ای را عوض کند، **ساده** می‌مانَد: آزمون دربارهٔ همان
     نشانه‌هاست، و نشانهٔ گمشده بدتر از اعرابِ نبوده است. */
  trash();
  global.vowelizePiece_ = (pc) => fatha(pc).replace('؟!', '!');
  let a3;
  try { a3 = vtestText_('ساعت‌ساز'); } finally { global.vowelizePiece_ = realV; }
  ok('۳۷.۴ تکه‌ای که نشانه را عوض کرد ساده ماند، و علتش گفته شد',
     a3.ok && a3.vowelled === a3.pieces - 1 && /نشانه عوض شد/.test(a3.why) &&
     a3.t.indexOf('؟!') !== -1 && speakSentSplit_(a3.t).length === p.n,
     JSON.stringify({ v: a3.vowelled, p: a3.pieces, why: a3.why }));

  /* ۳۴.۵ — از همان درِ تولید: بذرِ واقعی ⇒ `runVoiceSoulTest`. اجرای اول فقط
     اعراب می‌گیرد و اجرای بعد را زمان‌بندی می‌کند (شش دقیقه برای هر دو کم است)؛
     اجرای دوم می‌سازد. */
  trash();
  const realT = global.ttsChunkTry_;
  const cues34 = [], said34 = [];
  global.ttsChunkTry_ = function (text, style) {
    cues34.push(String(style || '')); said34.push(String(text || ''));
    return Buffer.alloc(24000 * 2 * 4).toString('base64');
  };
  global.vowelizePiece_ = (pc) => fatha(pc);
  CFG.VOICE_SOUL_SEED = REAL_SOUL_SEED.filter(x => x.speaker === 'razavi');
  const q34 = vbrRead_(); q34.items = []; vbrSave_(q34);
  global.__TRIGGERS.length = 0;
  let r1, r2;
  try {
    r1 = runVoiceSoulTest();
    const sched = global.__TRIGGERS.filter(x => String(x.handler || x.getHandlerFunction && x.getHandlerFunction()) === 'runVoiceSoulSeed').length;
    ok('۳۷.۵ اجرای اول: متن اعراب گرفت، صدایی ساخته نشد، اجرای بعد زمان‌بندی شد',
       r1 && r1.pending === true && said34.length === 0 && sched === 1,
       JSON.stringify({ r1, said: said34.length, sched }));
    r2 = runVoiceSoulTest();
  } finally {
    global.vowelizePiece_ = realV;
    global.ttsChunkTry_ = realT;
    CFG.VOICE_SOUL_SEED = [];
  }
  const row34 = (vbrRead_().items || [])[0] || {};
  const want = [['آرام', 'آرام و با صدای پایین‌تر'], ['نجوا', 'نجواگونه'], ['بلند', 'با صدای بلند و پرشور'],
                ['کمی‌بلند', 'کمی بلندتر'], ['تند', 'تندتر'], ['سنگین', 'سنگین و جدی'],
                ['لبخند', 'با لبخند'], ['کشیده', 'آهسته و کشیده']];
  const lost = want.filter(w => !cues34.some(c => c.indexOf(w[1]) !== -1)).map(w => w[0]);
  ok('۳۷.۶ اجرای دوم ساخت، و هر هشت حالتِ گفتنی با دستورِ خودش رفت',
     r2 && r2.ok === true && !lost.length, JSON.stringify({ ok: r2 && r2.ok, why: r2 && r2.why, lost }));
  const bare = said34.filter(t => SPEAK_SPANS.some(d => String(t).trim() === d.k || String(t).indexOf('«' + d.k + '»') !== -1));
  ok('۳۷.۶-ب هیچ نامِ حالتی به گفتارساز نرسید', !bare.length, JSON.stringify(bare));
  ok('۳۷.۶-پ ردیفِ صف می‌گوید «متنِ آزمون» و جای هر نُه حالت را دارد',
     /متنِ آزمون/.test(String(row34.label)) &&
     SPEAK_SPANS.every(d => String(row34.spanLine).indexOf(d.k) !== -1),
     JSON.stringify({ label: row34.label, spans: row34.spanLine }));
  /* ۳۷.۷ — آنچه در تلگرام می‌رسد: عنوانِ فایل «قسمت ساعت‌ساز» نمی‌گوید، و
     گام و زیروبمِ خروجی در کپشن هست. از همان `vbrTgTell_` که تولید می‌دواند. */
  {
    const fW = OUT.createFile(Utilities.newBlob('RIFF....WAVE', 'audio/wav', 'نمونه.wav'));
    let ttlSeen = '', capSeen7 = '';
    const rA = global.tgApi_, rE = global.tgEnabled_;
    global.tgEnabled_ = () => true;
    global.tgApi_ = function (m, prm) {
      if (prm && prm.title) ttlSeen = String(prm.title);
      if (prm && prm.caption) capSeen7 = String(prm.caption);
      return { ok: true };
    };
    const it7 = Object.assign({}, row34, { pitchAuto: { srcHz: 113, targetHz: 106.9, pitch: -1 },
                                           f0Out: { medianHz: 104, lowPct: 3 } });
    try { vbrTgTell_(it7, 'بهروز رضوی', { id: fW.getId() }); } catch (eT7) {}
    global.tgApi_ = rA; global.tgEnabled_ = rE;
    ok('۳۷.۷ عنوانِ فایل در تلگرام «متنِ آزمون» می‌گوید، نه «قسمت ساعت‌ساز»',
       /متنِ آزمون/.test(ttlSeen) && ttlSeen.indexOf('قسمت ساعت') === -1, ttlSeen);
    ok('۳۷.۷-ب و کپشن گامِ خودکار و زیروبمِ خروجی را دارد، و حالت‌ها را',
       /گامِ خودکار/.test(capSeen7) && /خروجی/.test(capSeen7) && /حالت‌ها/.test(capSeen7),
       capSeen7.replace(/<[^>]+>/g, '').length + ' · ' + capSeen7.slice(-260));
  }
  const qZ = vbrRead_(); qZ.items = []; vbrSave_(qZ);
}

/* ══════════════════════════════════════════════════════════════════════
   §۳۸ — زیروبمِ خودِ گوینده و بلندیِ خروجی (۸.۳۷)

   ۴ اکتبر: «گلدوز رو با صوت‌های دیگه‌اش مقایسه می‌کنم، صدا و حجمش پایینه».
   دو عدد پشتش بود و هیچ‌کدام به تصمیمی وصل نبود: کارتِ سبکِ ۲۲ سپتامبر
   زیروبمِ او را ۱۵۵ تا ۱۶۳ هرتز سنجیده بود (فقط در سیاههٔ اجرا)، و نمونه‌ها با
   گامِ ثابتِ −۲ درآمدند ۱۰۱ و ۱۱۴ هرتز. و بلندیِ خروجی را هیچ مرحله‌ای
   نمی‌سنجید. هر ادعا از درِ تولید: `vbrAsk_` و `vbrIngest_`.
   ══════════════════════════════════════════════════════════════════════ */
console.log('\n=== ۳۸) زیروبمِ خودِ گوینده و بلندیِ خروجی (۸.۳۷) ===');
{
  const ppG = personaPitch_('spk-1g0r95d');
  ok('۳۸.۱ گلدوز هدفِ ۱۵۸ هرتز دارد، از ضبط‌های خودش — نه گامِ ثابت',
     ppG.targetHz === '158' && /هدف 158/.test(ppG.src), JSON.stringify(ppG));

  const shP = personaTab_();
  const rw = personaRows_(shP);
  let atR = 0;
  for (let i = 0; i < rw.length; i++) if (String(rw[i][PC.KEY - 1]).trim() === 'razavi') atR = i + 2;
  const keepT = CFG.VOICE_TARGET_HZ, keepV = global.vintReadResult_;
  const askOne = (ep, styleHz, cell) => {
    shP.getRange(atR, PC.PITCH).setValue(cell == null ? '' : cell);
    CFG.VOICE_TARGET_HZ = {};
    global.vintReadResult_ = () => ({ speakers: { razavi: { name: 'بهروز رضوی',
                                                            style: { cue: 'x', medianHz: styleHz } } } });
    const q = vbrRead_(); q.items = []; vbrSave_(q);
    try { vbrAsk_('آزمونِ زیروبم', String(ep), epFold.getId(), 'razavi', 'یک'); }
    finally { CFG.VOICE_TARGET_HZ = keepT; global.vintReadResult_ = keepV; }
    return (vbrRead_().items || [])[0] || {};
  };
  /* ۳۸.۲ — گوینده‌ای که CFG چیزی برایش نگفته، هدف را از کارتِ سبکِ خودش
     می‌گیرد. این همان سیمی است که برای گلدوز هفته‌ها نبود. */
  const r2 = askOne(9381, 112.4, '');
  ok('۳۸.۲ بی CFG، هدف از زیروبمِ ضبط‌های خودش (کارتِ سبک) می‌آید',
     r2.params && r2.params.targetHz === '112.4' && /ضبط‌های خودش/.test(String(r2.pitchSrc)),
     JSON.stringify({ p: r2.params, s: r2.pitchSrc }));
  /* ۳۸.۳ — دستِ او در ردیف هنوز برنده است (۷.۸۱). */
  const r3 = askOne(9382, 112.4, '3');
  ok('۳۸.۳ گامی که او در ردیف نوشته، بر کارتِ سبک مقدم است',
     r3.params && r3.params.targetHz == null && r3.params.pitch === '3',
     JSON.stringify(r3.params));
  /* ۳۸.۴ — عددِ پرت یا نبوده هدف نمی‌سازد؛ «نسنجیدم» با «صفر» یکی نیست. */
  const r4 = askOne(9383, 20, '');
  const r4b = askOne(9384, undefined, '');
  ok('۳۸.۴ زیروبمِ پرت یا نبوده هدف نمی‌سازد',
     r4.params && r4.params.targetHz == null && r4b.params && r4b.params.targetHz == null,
     JSON.stringify([r4.params, r4b.params]));
  shP.getRange(atR, PC.PITCH).setValue('');

  /* ۳۸.۵ — بلندیِ پیش و پس، از نقشهٔ گردش‌کار تا کپشنِ تلگرام، از درِ
     `vbrIngest_` — همان که تولید می‌دود. */
  const q5 = vbrRead_(); q5.items = []; vbrSave_(q5);
  vbrAsk_('variety', 9385, epFold.getId(), 'razavi', 'بلندی');
  const realF5 = UrlFetchApp.fetch;
  UrlFetchApp.fetch = function (u) {
    if (/voice-renders/.test(String(u))) {
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ items: {
        'variety:9385': { url: 'https://example.invalid/l.wav', minutes: 3,
                          loud: { rawLufs: -21.3, rawTp: -4.2, gainDb: 5.3, limited: false,
                                  lufs: -16.0, tp: -1.9 } } } }) };
    }
    if (/voices\.json/.test(String(u))) {
      return { getResponseCode: () => 200,
               getContentText: () => JSON.stringify({ speakers: { razavi: { name: 'بهروز رضوی' } } }) };
    }
    return { getResponseCode: () => 200, getBlob: () => blobOf(wavBytes) };
  };
  _vbrMapMemo = null;
  const o5 = console.log; console.log = () => {};
  try { vbrIngest_(hub); } finally { console.log = o5; UrlFetchApp.fetch = realF5; _vbrMapMemo = null; }
  const it5 = (vbrRead_().items || []).filter(x => x.key === 'variety:9385')[0] || {};
  const line5 = vbrPitchLine_(it5, (x) => faDigitsOut_(String(x)));
  ok('۳۸.۵ بلندیِ پیش و پس به ردیف و کپشن می‌رسد',
     it5.status === 'رسید' && it5.loud && it5.loud.lufs === -16 &&
     /بلندی [^ ]+ ⇒ [^ ]+ LUFS/.test(line5) && /۲۱٫?۳|۲۱\.۳/.test(line5),
     JSON.stringify({ st: it5.status, loud: it5.loud }) + ' · ' + line5);
  ok('۳۸.۵-ب بی عدد، از بلندی هیچ نمی‌گوید', vbrPitchLine_({ f0Out: { medianHz: 104 } }).indexOf('بلندی') === -1);
  const qZ = vbrRead_(); qZ.items = []; vbrSave_(qZ);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
