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
ok('۱.۵ گویندهٔ بی‌بذر، دلیلش را می‌گوید',
   vbrModel_('nobody').ok === false && /بذر/.test(vbrModel_('nobody').why));
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
const got = vbrFetch_(vbrRead_().items[0], 'https://example.invalid/x.wav', 'بهروز رضوی');
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

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');

