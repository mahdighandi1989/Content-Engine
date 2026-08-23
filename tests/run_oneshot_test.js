/* دو خرابیِ واقعیِ ۲۳ اوت ۲۰۲۶، هرکدام با ریشه‌اش.
 *
 * ۱) «درس‌نامه بازم تو دو قطعه درست شد» — هر روز، بی استثنا. علتش یک تناقض
 *    در خودِ پرامپت بود: دو خط پایین‌تر از «حدود ۲۲۵۰ واژه بنویس» نوشته بود
 *    «از ۹۱۲۵ نویسه بیشتر نشود». مدل وسطشان نشست.
 * ۲) «هیچ موسیقی تو هیچ پادکستی نیومد» — بانک خالی بود؛ ولی زیرش یک خرابیِ
 *    دیده‌نشده هم بود: نقشهٔ موسیقی هر بار از سرگیریِ صداگذاری از نو ساخته
 *    می‌شد. با بانکِ خالی فقط آرزوی تکراری می‌ساخت؛ با بانکِ پر، شماره‌های
 *    تکه‌ها می‌لغزید و قسمت تکه جا می‌انداخت.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

console.log('=== ۱) پرامپتِ درس‌نامه با سقفِ خودش نمی‌جنگد ===');
{
  const cap = specialMaxChars_();
  const askedWords = Math.round(specialTargetMin_() * 150);
  const askedChars = askedWords * 5.5;
  ok('۱.۱ هدفِ مؤثر از سقفِ یک فایل بیرون نمی‌زند',
     askedChars <= cap * 1.05, askedChars + ' نویسه در برابرِ سقفِ ' + cap);
  ok('۱.۲ و هدف با روشن‌بودنِ «یک فایل» پایین آمده',
     specialTargetMin_() < CFG.SPECIAL_TARGET_MINUTES,
     specialTargetMin_() + ' < ' + CFG.SPECIAL_TARGET_MINUTES);

  // خودِ متنِ پرامپت — چون همان‌جا بود که تناقض نوشته می‌شد
  const p14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۱.۳ هیچ‌جای درس‌نامه دیگر SPECIAL_TARGET_MINUTES خام را به مدل نمی‌گوید',
     !/CFG\.SPECIAL_TARGET_MINUTES \* 150/.test(p14));
  ok('۱.۴ وارسیِ سلامت هم با هدفِ مؤثر می‌سنجد',
     /specialTargetMin_\(\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));

  // و اگر «یک فایل» خاموش شود، هدف به همان ۱۵ برمی‌گردد
  const keep = CFG.SPECIAL_ONE_FILE;
  CFG.SPECIAL_ONE_FILE = false;
  ok('۱.۵ با خاموش‌بودنِ «یک فایل» هدف همان ۱۵ دقیقه است',
     specialTargetMin_() === CFG.SPECIAL_TARGET_MINUTES, String(specialTargetMin_()));
  CFG.SPECIAL_ONE_FILE = keep;
}

console.log('=== ۲) و اگر مدل باز هم بلند نوشت، کد کوتاهش می‌کند ===');
{
  const long = 'یک جملهٔ فارسی برای پرکردن. '.repeat(600);
  const mk = () => ({ hook: 'قلاب.', recap: '', outro: 'پایان.',
    sections: [{ heading: 'الف', narration: long }, { heading: 'ب', narration: long }] });
  const cap = 3000;
  let asked = null;

  // مدلِ ساختگی: متنی کوتاه‌تر با همان تعدادِ بخش
  const realG = global.geminiText_;
  global.geminiText_ = (p) => { asked = p;
    return { hook: 'قلاب.', outro: 'پایان.',
             sections: [{ heading: 'الف', narration: 'کوتاه شد الف.' },
                        { heading: 'ب', narration: 'کوتاه شد ب.' }] }; };
  let r = specialCondense_(mk(), cap, 1);
  ok('۲.۱ متنِ بلند فشرده می‌شود', specialNarration_(r.ep).length < cap, 
     specialNarration_(r.ep).length + ' نویسه');
  ok('۲.۲ و هیچ بخشی گم نمی‌شود', r.ep.sections.length === 2);
  ok('۲.۳ از مدل صریح خواسته شده بخشی حذف نشود', /هیچ بخشی را حذف نکن/.test(asked));

  // مرزی که رد نمی‌شود: نسخهٔ فشرده‌ای که بخش کم دارد پذیرفته نمی‌شود
  global.geminiText_ = () => ({ hook: 'ق.', outro: 'پ.',
    sections: [{ heading: 'الف', narration: 'فقط یکی ماند.' }] });
  r = specialCondense_(mk(), cap, 1);
  ok('۲.۴ نسخهٔ فشرده‌ای که یک بخش را انداخته رد می‌شود',
     r.ep.sections.length === 2 && specialNarration_(r.ep).length > cap);
  ok('۲.۵ و «هنوز بلند است» صادقانه گزارش می‌شود', r.over > 0);

  // بخشِ خالی هم یعنی درسِ افتاده
  global.geminiText_ = () => ({ hook: 'ق.', outro: 'پ.',
    sections: [{ heading: 'الف', narration: 'ماند.' }, { heading: 'ب', narration: '   ' }] });
  ok('۲.۶ بخشِ خالی هم رد می‌شود',
     specialCondense_(mk(), cap, 1).ep.sections[1].narration === long);

  // متنِ کوتاه اصلاً به مدل نمی‌رود — هزینهٔ بی‌دلیل ممنوع
  asked = null; global.geminiText_ = () => { asked = 'CALLED'; return null; };
  r = specialCondense_({ hook: '', outro: '', sections: [{ narration: 'کوتاه.' }] }, cap, 1);
  ok('۲.۷ متنی که زیرِ سقف است هیچ فراخوانی نمی‌سازد', asked === null && r.tried === false);

  // شکستِ مدل نباید قسمت را بکشد
  global.geminiText_ = () => { throw new Error('boom'); };
  ok('۲.۸ اگر مدل بترکد، متنِ اصلی سالم برمی‌گردد',
     specialCondense_(mk(), cap, 1).ep.sections.length === 2);
  global.geminiText_ = realG;
}

console.log('=== ۳) آرزوی موسیقی تکراری نمی‌شود ===');
{
  const F = () => DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  let it = F().getFiles();
  while (it.hasNext()) { const f = it.next(); if (/_MUSIC-WISH/.test(f.getName())) f.setTrashed(true); }
  const ctx = { title: 'رازهای مهندسی پیرنگ', category: 'اجتماعی و سبک زندگی' };
  musicWish_('اجتماعی و سبک زندگی', ['شروع', 'پایان', 'میانه'], ctx);
  musicWish_('اجتماعی و سبک زندگی', ['شروع', 'پایان', 'میانه'], ctx);
  musicWish_('اجتماعی و سبک زندگی', ['شروع', 'پایان', 'میانه'], ctx);
  const j = getOutJson_(MUSIC_WISH_());
  ok('۳.۱ سه بار خواستنِ یک چیز، یک رکورد می‌ماند', j.items.length === 1,
     JSON.stringify(j.items.length));
  ok('۳.۲ ولی شمارِ درخواست ثبت می‌شود', j.items[0].times === 3, String(j.items[0].times));
  musicWish_('آموزشی، شمرده', ['شروع'], { title: 'هرمنوتیک', category: 'درس‌نامه' });
  ok('۳.۳ خواستهٔ واقعاً متفاوت رکوردِ خودش را می‌گیرد',
     getOutJson_(MUSIC_WISH_()).items.length === 2);
}

console.log('=== ۴) نقشهٔ موسیقی وسطِ یک قسمت عوض نمی‌شود ===');
{
  delete global.__PROPS[PK.MUSIC_PLAN];
  let calls = 0;
  const realPlan = global.musicPlanModel_, realBank = global.musicBank_;
  // بی این، musicClip_ فایلِ واقعی می‌خواهد و هیچ تکهٔ موسیقی درج نمی‌شود —
  // آن‌وقت آزمون «شماره‌ها نمی‌لغزند» را روی آرایه‌ای می‌سنجد که اصلاً موسیقی
  // ندارد، یعنی هیچ‌چیز را نمی‌سنجد.
  const realClip = global.musicClip_;
  global.musicClip_ = (id) => 'PCM-' + id;
  global.musicBank_ = () => ([
    { id: 'A', name: 'الف', sec: 60, gain: 1, slots: ['شروع', 'پایان', 'میانه'], mood: 'م' },
    { id: 'B', name: 'ب', sec: 60, gain: 1, slots: ['شروع', 'پایان', 'میانه'], mood: 'م' }
  ]);
  // هر فراخوان نقشهٔ *دیگری* می‌دهد — دقیقاً همان چیزی که تکه‌ها را می‌لغزاند
  global.musicPlanModel_ = () => { calls++;
    return calls === 1 ? { introId: 'A', outroId: 'A', bridges: [], sfx: [], mood: 'م' }
                       : { introId: 'B', outroId: 'B', bridges: [{ at: '1' }], sfx: [], mood: 'م' }; };

  const chunks = () => [{ text: 'یک' }, { text: 'دو' }, { text: 'سه' }];
  const opt = { show: 'special', episode: 14, bounds: [{ at: 0, kind: 'body' }],
                sections: [{ heading: 'الف' }], mood: 'م', title: 'ت' };
  const a = musicWrap_(chunks(), null, opt);
  const b = musicWrap_(chunks(), null, opt);
  ok('۴.۰ موسیقی واقعاً درج شده — وگرنه سنجه‌های بعدی چیزی را نمی‌سنجند',
     a.chunks.filter(c => c.pcm).length > 0 && a.picks.length > 0,
     a.chunks.filter(c => c.pcm).length + ' تکهٔ موسیقی، ' + a.picks.length + ' قطعه');
  ok('۴.۱ مدل فقط یک بار پرسیده می‌شود', calls === 1, calls + ' بار');
  ok('۴.۲ و هر دو اجرا آرایهٔ هم‌اندازه می‌دهند — شماره‌ها نمی‌لغزند',
     a.chunks.length === b.chunks.length, a.chunks.length + ' در برابرِ ' + b.chunks.length);
  ok('۴.۳ و همان قطعه‌ها، نه قطعه‌های دیگر',
     JSON.stringify(a.picks.map(p => p.id)) === JSON.stringify(b.picks.map(p => p.id)),
     JSON.stringify(a.picks.map(p => p.id)) + ' / ' + JSON.stringify(b.picks.map(p => p.id)));

  // قسمتِ بعد نقشهٔ خودش را می‌گیرد
  musicWrap_(chunks(), null, Object.assign({}, opt, { episode: 15 }));
  ok('۴.۴ قسمتِ تازه نقشهٔ تازه می‌گیرد', calls === 2, calls + ' بار');
  const cache = JSON.parse(global.__PROPS[PK.MUSIC_PLAN] || '{}');
  ok('۴.۵ و حافظه انباشته نمی‌شود — هر برنامه یک خانه',
     Object.keys(cache).length === 1, Object.keys(cache).join(','));

  global.musicPlanModel_ = realPlan; global.musicBank_ = realBank;
  global.musicClip_ = realClip;
  delete global.__PROPS[PK.MUSIC_PLAN];
}

console.log('=== ۵) شمارِ فایل، همان چیزی که تحویل شده ===');
{
  const p14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۵.۱ شمارِ ثبت‌شده از فهرستِ فایل‌های یکجا می‌آید',
     /deliveredN = mgListSp\.length \? mgListSp\.length : st\.files\.length/.test(p14));
  ok('۵.۲ و همان عدد در سیاهه و در حافظهٔ وضعیت می‌نشیند',
     /files: deliveredN/.test(p14) && /' فایل صوتی'/.test(p14));
  ok('۵.۳ شمارِ تکه‌های پیش از ادغام هم گم نمی‌شود', /parts: st\.files\.length/.test(p14));
}

console.log('=== ۶) موسیقی از اینترنت می‌آید، نه از دستِ کاربر ===');
{
  /* خواستهٔ صریحِ صاحبِ برنامه از اول همین بود: «اگر من فایل موسیقی نذارم
   * خودش از سطح اینترنت پیدا کنه و قرار بده». دستورش هم به تسکِ غنی‌سازی
   * داده شده بود — ولی خودِ تسک گزارش داد که در محیطِ ابری نمی‌تواند فایلِ
   * صوتی تهیه و بارگذاری کند، و بانک هفته‌ها خالی ماند.
   * حالا کار تقسیم شده: تسک نشانی می‌نویسد، موتور دانلود می‌کند. */

  // یک WAVِ کوچکِ واقعی می‌سازیم تا هدرش واقعاً سنجیده شود
  const wav = (secs, rate) => {
    const n = Math.round(rate * secs), dataLen = n * 2, out = [];
    const s4 = t => { for (const c of t) out.push(c.charCodeAt(0)); };
    const i32 = v => { out.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255); };
    const i16 = v => { out.push(v & 255, (v >> 8) & 255); };
    s4('RIFF'); i32(36 + dataLen); s4('WAVE'); s4('fmt '); i32(16); i16(1); i16(1);
    i32(rate); i32(rate * 2); i16(2); i16(16); s4('data'); i32(dataLen);
    for (let i = 0; i < n; i++) i16(0);
    return out;
  };

  const OUTF = () => DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const wipe = re => { const it = OUTF().getFiles();
    while (it.hasNext()) { const f = it.next(); if (re.test(f.getName())) f.setTrashed(true); } };
  const bankNames = () => { const out = []; const it = musicFolder_().getFiles();
    while (it.hasNext()) out.push(it.next().getName()); return out; };

  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_FETCHED];
  const before = bankNames().length;

  putOutJson_(MUSIC_FEED_(), { items: [
    { url: 'https://ok.example/calm.wav', title: 'پیانوی آرام', license: 'CC0',
      kind: 'موسیقی', mood: 'آرام، امیدوار', slots: 'شروع، پایان', gain: '0.7' },
    { url: 'https://liar.example/fake.wav', title: 'ام‌پی‌تری با پسوندِ دروغ' },
    { url: 'https://gone.example/404.wav', title: 'نیست' },
    { url: 'http://insecure.example/x.wav', title: 'بی https' }
  ]});

  global.__STUB = (url) => {
    if (url.indexOf('ok.example') !== -1) return { code: 200, bytes: wav(3, 24000) };
    if (url.indexOf('liar.example') !== -1) return { code: 200, bytes: [73, 68, 51, 4, 0, 0, 0] };
    return { code: 404, json: {} };
  };

  const r = musicFetch_();
  ok('۶.۱ فایلِ سالم آورده و در بانک نشسته', r.added === 1 && bankNames().length > before,
     JSON.stringify(r.notes));
  ok('۶.۲ و هویتش هم کنارش نوشته شده',
     bankNames().some(n => /^_MUSIC-META-/.test(n)), bankNames().join(' | '));

  const meta = musicMeta_(bankNames().filter(n => /\.wav$/.test(n))[0]);
  ok('۶.۳ مجوز و حال‌وهوا از فهرست آمده، نه از حدسِ نام',
     meta && meta.license === 'CC0' && /آرام/.test(String(meta.mood)), JSON.stringify(meta));

  // مهم‌ترین سنجه: آنچه WAV نیست نباید وارد بانک شود
  ok('۶.۴ فایلی که ادعا می‌کند WAV است ولی نیست، ذخیره نمی‌شود',
     !bankNames().some(n => /دروغ/.test(n)), bankNames().join(' | '));
  const fed = getOutJson_(MUSIC_FEED_());
  ok('۶.۵ و دلیلِ ردش در همان فایل نوشته می‌شود',
     /WAV نیست/.test(String(fed.items[1].error)), String(fed.items[1].error));
  ok('۶.۶ پاسخِ ۴۰۴ هم رد می‌شود با دلیل', /404/.test(String(fed.items[2].error)));
  ok('۶.۷ سقفِ «شبی چند فایل» رعایت می‌شود — چهارمی امشب دست نخورد',
     !fed.items[3].status, JSON.stringify(fed.items[3]));
  ok('۶.۸ و آنچه آمد در فهرست «آمد» می‌خورد با شناسهٔ فایل',
     fed.items[0].status === 'آمد' && !!fed.items[0].fileId);

  // نشانیِ بی https جداگانه، چون بالا سقف جلویش را گرفت
  wipe(/_MUSIC-FEED/);
  putOutJson_(MUSIC_FEED_(), { items: [{ url: 'http://insecure.example/x.wav', title: 'بی https' }] });
  const nBefore = bankNames().length;
  musicFetch_();
  const f2 = getOutJson_(MUSIC_FEED_()).items[0];
  ok('۶.۸-ب نشانیِ بی https اصلاً دانلود نمی‌شود',
     f2.status === 'رد' && /https/.test(String(f2.error)) && bankNames().length === nBefore,
     JSON.stringify(f2));
  wipe(/_MUSIC-FEED/);
  putOutJson_(MUSIC_FEED_(), { items: [
    { url: 'https://ok.example/calm.wav', title: 'پیانوی آرام' },
    { url: 'https://liar.example/fake.wav', title: 'ام‌پی‌تری با پسوندِ دروغ' },
    { url: 'https://gone.example/404.wav', title: 'نیست' }
  ]});
  for (const it of getOutJson_(MUSIC_FEED_()).items) void it;

  // اجرای دوباره نباید چیزی را دوباره بیاورد
  musicFetch_();
  const n2 = bankNames().length;
  const r2 = musicFetch_();
  ok('۶.۹ اجرای دوباره چیزی را تکرار نمی‌کند',
     r2.added === 0 && bankNames().length === n2);

  // فایلی که کاربر پاک کرده نباید برگردد
  wipe(/_MUSIC-FEED/);
  putOutJson_(MUSIC_FEED_(), { items: [{ url: 'https://ok.example/calm.wav', title: 'دوباره' }] });
  ok('۶.۱۰ نشانیِ قبلاً آمده دوباره دانلود نمی‌شود — پاک‌کردنِ کاربر محترم است',
     musicFetch_().added === 0);

  // سقفِ حجم
  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_FETCHED];
  putOutJson_(MUSIC_FEED_(), { items: [{ url: 'https://big.example/huge.wav', title: 'غول' }] });
  global.__STUB = () => ({ code: 200, bytes: wav(2, 24000) });
  const keepCap = CFG.MUSIC_FETCH_MAX_BYTES;
  CFG.MUSIC_FETCH_MAX_BYTES = 1000;
  musicFetch_();
  ok('۶.۱۱ فایلِ بزرگ‌تر از سقف رد می‌شود',
     /حجم/.test(String(getOutJson_(MUSIC_FEED_()).items[0].error)));
  CFG.MUSIC_FETCH_MAX_BYTES = keepCap;

  // و وصل‌بودنش — وگرنه همان «کدِ نوشته‌شده که صدا زده نمی‌شود»
  ok('۶.۱۲ در کارِ شبانه پیش از پویش صدا زده می‌شود',
     /musicFetch_\(\);[\s\S]{0,200}musicScan_\(\)/.test(
       fs.readFileSync('src/21_SelfUpdate.gs', 'utf8')));
  ok('۶.۱۳ و از منو هم در دسترس است',
     /runMusicFetch/.test(fs.readFileSync('src/05_Setup.gs', 'utf8')));
  ok('۶.۱۴ فایلِ فهرست در نقشهٔ ریشه شناخته‌شده است — وگرنه «ناشناس» گزارش می‌شود',
     /MUSIC_FEED_FILE/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));

  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_FETCHED];
}


console.log('=== ۷) موتور خودش می‌گردد — بی وابستگی به تسک ===');
{
  /* ۵٫۵۵ کار را درست تقسیم کرد ولی یک وابستگی گذاشت: اگر تسک اجرا نشود یا
   * نتواند نشانیِ WAV پیدا کند، بانک باز هم خالی می‌ماند. و بیشترِ سایت‌های
   * موسیقیِ آزاد فقط MP3 می‌دهند. */
  const OUTF = () => DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const wipe = re => { const it = OUTF().getFiles();
    while (it.hasNext()) { const f = it.next(); if (re.test(f.getName())) f.setTrashed(true); } };
  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_SEEN];
  delete global.__PROPS[PK.MUSIC_FETCHED];

  const SEARCH = { response: { docs: [
    { identifier: 'good-one', title: 'Calm Piano Loop', licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    { identifier: 'mp3-only', title: 'Only MP3 Here', licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    { identifier: 'no-license', title: 'Nice But Unlicensed' },
    { identifier: 'too-big', title: 'Huge Symphony', licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/' }
  ] } };
  const META = {
    'good-one': { metadata: { title: 'Calm Piano Loop', licenseurl: 'CC0-1.0' },
      files: [{ name: 'big.wav', format: 'WAVE', size: 9000000, length: '40' },
              { name: 'small.wav', format: 'WAVE', size: 400000, length: '30' },
              { name: 'cover.jpg', format: 'JPEG', size: 1000 }] },
    'mp3-only': { metadata: { licenseurl: 'CC0-1.0' },
      files: [{ name: 'track.mp3', format: 'VBR MP3', size: 300000, length: '30' }] },
    'no-license': { metadata: {}, files: [{ name: 'x.wav', format: 'WAVE', size: 200000, length: '20' }] },
    'too-big': { metadata: { licenseurl: 'CC0-1.0' },
      files: [{ name: 'huge.wav', format: 'WAVE', size: 90000000, length: '600' }] }
  };
  let searches = 0;
  global.__STUB = (url) => {
    if (url.indexOf('advancedsearch') !== -1) { searches++; return { code: 200, json: SEARCH }; }
    const m = url.match(/\/metadata\/([^?]+)/);
    if (m) return { code: 200, json: META[decodeURIComponent(m[1])] || {} };
    return { code: 404, json: {} };
  };

  const r = musicSeek_(['شروع']);
  const feed = getOutJson_(MUSIC_FEED_());
  ok('۷.۱ نامزد پیدا شد و در فهرست نشست', r.added === 1 && feed.items.length === 1,
     JSON.stringify(r.notes));
  ok('۷.۲ کوچک‌ترین WAVِ زیرِ سقف انتخاب می‌شود، نه اولی',
     /small\.wav/.test(feed.items[0].url), feed.items[0].url);
  ok('۷.۳ مجوز از metadata برداشته می‌شود', feed.items[0].license === 'CC0-1.0');
  ok('۷.۴ و جایگاهش همان چیزی است که کم داشتیم', feed.items[0].slots === 'شروع');
  ok('۷.۵ منشأش علامت می‌خورد تا با پیشنهادِ تسک اشتباه نشود',
     /موتور/.test(String(feed.items[0].by)), String(feed.items[0].by));

  ok('۷.۶ مجموعه‌ای که فقط MP3 دارد رد می‌شود',
     !feed.items.some(x => /mp3-only/.test(x.url)));
  ok('۷.۷ مجموعهٔ بی‌مجوز رد می‌شود — «مجوزی که نتوانی نامش را بگویی»',
     !feed.items.some(x => /no-license/.test(x.url)));
  ok('۷.۸ فایلِ بزرگ‌تر از سقف اصلاً پیشنهاد نمی‌شود',
     !feed.items.some(x => /too-big/.test(x.url)));

  // مرزی که نباید شکسته شود: گشتن دانلود نمی‌کند
  ok('۷.۹ گشتن هیچ فایلی به بانک اضافه نمی‌کند — دانلود فقط از یک مسیر',
     feed.items[0].status === undefined && !feed.items[0].fileId);

  // اجرای دوباره همان مجموعه‌ها را دوباره پیشنهاد نمی‌دهد
  const r2 = musicSeek_(['شروع']);
  ok('۷.۱۰ اجرای دوباره همان‌ها را تکرار نمی‌کند', r2.added === 0);

  // فقط برای جایگاهِ کم می‌گردد
  ok('۷.۱۱ با بانکِ خالی هر سه جایگاه کم‌اند', musicMissingSlots_().length === 3);

  // و بعد musicFetch_ همان سدها را می‌زند — گشتن راهِ میان‌بر نساخته
  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_SEEN];
  musicSeek_(['شروع']);
  global.__STUB = (url) => (url.indexOf('archive') !== -1 && /small\.wav/.test(url))
    ? { code: 200, bytes: [73, 68, 51, 4, 0, 0] }      // ادعای WAV، ولی MP3
    : { code: 404, json: {} };
  musicFetch_();
  ok('۷.۱۲ نامزدی که سرِ دانلود WAV از آب درنیامد، باز هم رد می‌شود',
     /WAV نیست/.test(String(getOutJson_(MUSIC_FEED_()).items[0].error)));

  // وصل‌بودن
  const p21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۷.۱۳ در کارِ شبانه، گشتن پیش از آوردن می‌آید',
     p21.indexOf('musicSeek_') !== -1 &&
     p21.indexOf('musicSeek_') < p21.indexOf('musicFetch_()'));
  ok('۷.۱۴ و فقط برای جایگاهِ کم گشته می‌شود', /musicMissingSlots_\(\)/.test(p21));
  ok('۷.۱۵ منو هر سه مرحله را در یک زدن انجام می‌دهد',
     /musicSeek_[\s\S]{0,400}musicFetch_[\s\S]{0,200}musicScan_/.test(
       fs.readFileSync('src/23_Music.gs', 'utf8').split('function runMusicFetch')[1]));

  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_SEEN];
  delete global.__PROPS[PK.MUSIC_FETCHED];
}


console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
