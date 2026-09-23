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

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
