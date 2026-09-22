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

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
