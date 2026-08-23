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
    // موجِ واقعی، نه سکوت: سدِ سلامت فایلِ بی‌صدا را رد می‌کند و باید بکند
    for (let i = 0; i < n; i++) i16(Math.round(9000 * Math.sin(i / 12)));
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

  // در این بلوک مدل موضوع نیست؛ حکمِ اندازه‌ها باید کافی باشد
  const keepGF = global.geminiFetch_;
  global.geminiFetch_ = () => { throw new Error('در این آزمون مدل موضوع نیست'); };
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
  // سقف را خودِ آزمون تعیین می‌کند، نه تنظیماتِ روز: وگرنه هر بار که
  // MUSIC_FETCH_MAX_PER_RUN عوض شود این سنجه بی‌دلیل قرمز می‌شود و
  // چیزی را می‌سنجد که قصدش نبوده.
  {
    wipe(/_MUSIC-FEED/);
    delete global.__PROPS[PK.MUSIC_FETCHED];
    const keepCap = CFG.MUSIC_FETCH_MAX_PER_RUN;
    CFG.MUSIC_FETCH_MAX_PER_RUN = 1;
    putOutJson_(MUSIC_FEED_(), { items: [
      { url: 'https://ok.example/a.wav', title: 'یک' },
      { url: 'https://ok.example/b.wav', title: 'دو' }
    ]});
    global.__STUB = () => ({ code: 200, bytes: wav(3, 24000) });
    musicFetch_();
    const two = getOutJson_(MUSIC_FEED_()).items;
    ok('۶.۷ سقفِ «هر اجرا چند فایل» رعایت می‌شود — دومی دست نخورد',
       !!two[0].status && !two[1].status, JSON.stringify(two.map(x => x.status)));
    CFG.MUSIC_FETCH_MAX_PER_RUN = keepCap;
  }
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
  global.geminiFetch_ = keepGF;
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
  ok('۷.۱۱ با بانکِ خالی هر سه جایگاه کم‌اند', musicThinSlots_().length === 3);

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
  ok('۷.۱۴ و فقط برای جایگاهِ کم گشته می‌شود', /musicThinSlots_\(\)/.test(p21));
  ok('۷.۱۵ منو هر سه مرحله را در یک زدن انجام می‌دهد',
     /musicSeek_[\s\S]{0,400}musicFetch_[\s\S]{0,200}musicScan_/.test(
       fs.readFileSync('src/23_Music.gs', 'utf8').split('function runMusicFetch')[1]));

  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_SEEN];
  delete global.__PROPS[PK.MUSIC_FETCHED];
}


console.log('=== ۸) «این اصلاً موسیقی است؟» — سدی که ۵٫۵۶ نداشت ===');
{
  /* ۵٫۵۶ سه فایل آورد و دو تایش گفتار بود. یکی «Opening Remarks of Sean F.
   * Byrnes at LVG Debate»، ۱۲۹ ثانیه، ۱۶ کیلوهرتز — یک نفر پشتِ تریبون.
   * هیچ سدی نمی‌پرسید این موسیقی است یا نه، در حالی که musicProbe_ از قبل
   * درصدِ سکوت و یکنواختی را می‌سنجید و در توضیحاتش نوشته بود «گفتار پر از
   * مکث». تحلیلی که تصمیمی از آن ساخته نشود، کدِ مرده است. */

  // ۱) نام — ارزان‌ترین سد، و همان که فایلِ واقعیِ امروز را می‌گرفت
  const byName = musicIsSpeech_(null, null, 'Opening Remarks of Sean F. Byrnes at LVG Debate');
  ok('۸.۱ فایلِ واقعیِ امروز از روی نامش رد می‌شود',
     byName.speech === true && byName.sure === true, byName.why);
  ok('۸.۲ و نامِ بی‌گناه رد نمی‌شود',
     musicIsSpeech_(null, null, 'Calm Piano Loop').speech === false);

  // ۲) نرخِ نمونه‌برداری — همان ۱۶۰۰۰ هرتزِ فایلِ مناظره
  const byRate = musicIsSpeech_(null, { rate: 16000 }, 'x.wav');
  ok('۸.۳ ۱۶ کیلوهرتز یعنی ضبطِ گفتار، نه انتشارِ موسیقی',
     byRate.speech === true && byRate.sure === true, byRate.why);
  ok('۸.۴ و ۴۴٫۱ کیلوهرتز به‌تنهایی دلیلِ رد نیست',
     musicIsSpeech_(null, { rate: 44100 }, 'x.wav').speech === false);

  // ۳) خودِ موج — برای نامی مثل «Jump Master Intro» که هیچ واژهٔ گفتاری ندارد
  ok('۸.۵ مکثِ زیاد + بلندیِ پرنوسان = الگوی گفتار',
     musicIsSpeech_({ silentPct: 32, steadiness: 41 }, { rate: 44100 }, 'Jump Master Intro').speech === true);
  ok('۸.۶ ولی موجِ پیوسته می‌ماند',
     musicIsSpeech_({ silentPct: 4, steadiness: 88 }, { rate: 44100 }, 'Loop').speech === false);

  // ۴) و حرفِ آخر با مدلی که واقعاً می‌شنود
  const wav = (secs, rate) => {
    const n = Math.round(rate * secs), d = n * 2, o = [];
    const s4 = t => { for (const c of t) o.push(c.charCodeAt(0)); };
    const i32 = v => { o.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255); };
    const i16 = v => { o.push(v & 255, (v >> 8) & 255); };
    s4('RIFF'); i32(36 + d); s4('WAVE'); s4('fmt '); i32(16); i16(1); i16(1);
    i32(rate); i32(rate * 2); i16(2); i16(16); s4('data'); i32(d);
    for (let i = 0; i < n; i++) i16(Math.round(9000 * Math.sin(i / 12)));
    return o;
  };
  const bytes = wav(4, 44100), info = wavInfo_(bytes);
  const realFetch = global.geminiFetch_;
  let heardPayload = null;
  global.geminiFetch_ = (u, p) => { heardPayload = p;
    return { candidates: [{ content: { parts: [{ text: 'گفتار' }] } }] }; };
  ok('۸.۷ مدل که بگوید گفتار، فایل رد می‌شود',
     musicAccept_(bytes, info, 'Ambient Loop').ok === false);
  ok('۸.۸ و واقعاً صدا برایش فرستاده شده، نه فقط نام',
     !!(heardPayload && heardPayload.contents[0].parts.some(x => x.inlineData &&
        x.inlineData.mimeType === 'audio/wav' && x.inlineData.data.length > 100)));

  global.geminiFetch_ = () => ({ candidates: [{ content: { parts: [{ text: 'موسیقی' }] } }] });
  ok('۸.۹ و که بگوید موسیقی، می‌ماند', musicAccept_(bytes, info, 'Ambient Loop').ok === true);

  // مهم‌ترین مرز: نبودِ مدل، تأیید نیست
  global.geminiFetch_ = () => { throw new Error('بی‌پاسخ'); };
  ok('۸.۱۰ مدل که نبود، حکمِ اندازه‌ها می‌ماند — نبودش سکوتِ تأیید نیست',
     musicAccept_(wav(4, 16000), wavInfo_(wav(4, 16000)), 'x').ok === false);
  ok('۸.۱۱ و فایلِ آشکارا گفتاری اصلاً به مدل نمی‌رسد — هزینهٔ بی‌دلیل ممنوع',
     musicAccept_(bytes, info, 'Sean Byrnes Debate').ok === false);
  global.geminiFetch_ = realFetch;

  // ۵) و دانلود واقعاً از این سد رد می‌شود
  const OUTF = () => DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const wipe = re => { const it = OUTF().getFiles();
    while (it.hasNext()) { const f = it.next(); if (re.test(f.getName())) f.setTrashed(true); } };
  const bankWavs = () => { const out = []; const it = musicFolder_().getFiles();
    while (it.hasNext()) { const n = it.next().getName(); if (/\.wav$/i.test(n)) out.push(n); } return out; };
  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_FETCHED];
  const n0 = bankWavs().length;
  putOutJson_(MUSIC_FEED_(), { items: [
    { url: 'https://a.example/talk.wav', title: 'Opening Remarks at Debate' }] });
  global.__STUB = () => ({ code: 200, bytes: wav(4, 44100) });
  musicFetch_();
  ok('۸.۱۲ فایلِ گفتاری دانلود می‌شود ولی وارد بانک نمی‌شود',
     bankWavs().length === n0, bankWavs().join(' | '));
  ok('۸.۱۳ و دلیلش در فهرست نوشته می‌شود',
     /گفتار/.test(String(getOutJson_(MUSIC_FEED_()).items[0].error)),
     String(getOutJson_(MUSIC_FEED_()).items[0].error));

  // ۶) پرسشِ جست‌وجو دیگر «intro» ندارد و در مجموعه‌های موسیقی می‌گردد
  const q = musicSeekQuery_('شروع');
  ok('۸.۱۴ پرسش در مجموعه‌های موسیقی می‌گردد، نه در همهٔ صداها',
     /collection:\(netlabels/.test(q) && !/mediatype:\(audio\)/.test(q), q);
  ok('۸.۱۵ و واژهٔ «intro» — که Opening Remarks را می‌گرفت — حذف شده',
     q.indexOf('intro') === -1, q);

  wipe(/_MUSIC-FEED/);
  delete global.__PROPS[PK.MUSIC_FETCHED];
}


console.log('=== ۹) موسیقی با وایبِ همین قسمت کار دارد، نه با برچسبِ دسته ===');
{
  /* پرسشِ صاحبِ برنامه: «موسیقی‌ای که پیدا می‌کند اصلاً به متن و وایبِ پادکست
   * و بخش‌های داخلش و صدای گوینده توجه می‌کند؟»
   *
   * دو مرحله است و تا ۵٫۵۷ فقط یکی‌شان تا نیمه درست بود:
   *   • انتخابِ هر قسمت — عنوان و سرِ بخش‌ها را می‌دید، ولی «وایب» را نه؛
   *     در حالی که وایب از اول در segs[i].tone بود و همان‌جا زمین می‌ماند.
   *   • پرکردنِ بانک — کاملاً کور بود. یعنی «انتخابِ متناسب با وایب» از میانِ
   *     قطعه‌های تصادفی انجام می‌شد: نمایش، نه انتخاب.
   */

  // الف) وایب و گوینده واقعاً به مرزها می‌رسند
  for (const [f, what] of [['src/03_Producer.gs', 'از همه جا'],
                           ['src/14_Special.gs', 'درس‌نامه']]) {
    const t = fs.readFileSync(f, 'utf8');
    ok('۹.۱ وایب و گویندهٔ هر بخش با مرز می‌رود — ' + what,
       /tone: String\(segs\[i\]\.tone/.test(t) && /voice: String\(segs\[i\]\.voice/.test(t));
  }

  // ب) و انتخاب‌کننده واقعاً می‌بیندشان
  let seen = '';
  const realGT = global.geminiText_;
  global.geminiText_ = (p) => { seen = p; return null; };
  musicPlanModel_(
    [{ id: 'A', name: 'الف', mood: 'آرام', slots: 'شروع', sec: 30, used: 0 }],
    { title: 'ت', category: 'علمی و آموزشی', cast: 'Leda',
      bounds: [{ at: 0, kind: 'hook', heading: 'قلاب', tone: '', voice: 'Leda' },
               { at: 5, kind: 'section', heading: 'کودکی', tone: 'نوستالژیک', voice: 'Leda' },
               { at: 9, kind: 'section', heading: 'فروپاشی', tone: 'تلخ و کوبنده', voice: 'Gacrux' }] });
  ok('۹.۲ وایبِ بخش‌ها در پرسشِ انتخاب هست', /نوستالژیک/.test(seen) && /تلخ و کوبنده/.test(seen), '');
  ok('۹.۳ و گویندهٔ هر بخش هم', /Gacrux/.test(seen));
  ok('۹.۴ و مرزها تغییرِ وایب را نشان می‌دهند، نه فقط مقصد را',
     /از بخشِ «کودکی»[\s\S]{0,80}به بخشِ «فروپاشی»/.test(seen), '');
  ok('۹.۵ و صریح گفته شده حال‌وهوا را از وایب بردارد نه از دسته',
     /از همین وایب‌ها بردار، نه از برچسبِ دسته/.test(seen));
  ok('۹.۶ و میانه فقط جایی که وایب عوض می‌شود',
     /وایب واقعاً عوض می‌شود/.test(seen));

  // ج) و گشتن هم دیگر کور نیست
  const OUTF = () => DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const wipe = re => { const it = OUTF().getFiles();
    while (it.hasNext()) { const f = it.next(); if (re.test(f.getName())) f.setTrashed(true); } };
  wipe(/_MUSIC-WISH/);
  global.geminiText_ = () => { throw new Error('مدل نیست'); };
  ok('۹.۷ بی هیچ آرزویی، پیش‌فرضِ بی‌طرف',
     musicSeekTerms_('شروع') === MUSIC_TERMS_FALLBACK['شروع'], musicSeekTerms_('شروع'));

  musicWish_('طنز و سرگرمی', ['شروع'], { title: 'ت', category: 'طنز و سرگرمی' });
  ok('۹.۸ با آرزوی «طنز»، واژه‌های شاد — نه همان پیش‌فرض',
     /upbeat/.test(musicSeekTerms_('شروع')), musicSeekTerms_('شروع'));
  wipe(/_MUSIC-WISH/);
  musicWish_('آموزشی، شمرده', ['شروع'], { title: 'ت', category: 'درس‌نامه' });
  ok('۹.۹ و با «آموزشی، شمرده»، واژه‌های آرام — یعنی واقعاً فرق می‌کند',
     /calm|minimal|contemplative/.test(musicSeekTerms_('شروع')), musicSeekTerms_('شروع'));

  // د) مدل که باشد، حرفِ او مقدم است — ولی واژهٔ گفتاری‌اش پذیرفته نمی‌شود
  global.geminiText_ = () => ({ terms: 'intro OR warm piano OR mellow guitar' });
  const t2 = musicSeekTerms_('شروع');
  ok('۹.۱۰ واژه‌های مدل استفاده می‌شود', /warm piano/.test(t2), t2);
  ok('۹.۱۱ ولی «intro» — همان که به مناظره رسید — از آن هم پاک می‌شود',
     t2.indexOf('intro') === -1, t2);

  global.geminiText_ = () => ({ terms: 'شاد و پرانرژی' });
  ok('۹.۱۲ پاسخِ غیرلاتین پذیرفته نمی‌شود؛ جدول جایش را می‌گیرد',
     /^[\x20-\x7E]+$/.test(musicSeekTerms_('شروع')), musicSeekTerms_('شروع'));

  ok('۹.۱۳ و پرسشِ نهایی همان واژه‌ها را دارد',
     musicSeekQuery_('شروع', 'warm piano').indexOf('warm piano') !== -1);

  global.geminiText_ = realGT;
  wipe(/_MUSIC-WISH/);
}


console.log('=== ۱۰) گوینده هرگز نباید دستورِ لحن را بخوانَد ===');
{
  /* خواستهٔ صاحبِ برنامه، چند بار در چند سشن، و هر بار «حل‌شده» اعلام شد و
   * برگشت: «گاهی گوینده به‌جای متن، پرامپتِ نوعِ بیان را می‌خواند».
   *
   * علتِ برنگشتن‌ناپذیر نبودنش این بود که هر بار *عبارتِ* دستور عوض می‌شد،
   * در حالی که ریشه ساختاری بود: دستور و متن یک رشته بودند و مدل باید حدس
   * می‌زد کدام کدام است. عبارت هرچه باشد، حدس حدس می‌ماند.
   *
   * و هیچ‌وقت کسی به خروجی گوش نداده بود — فقط ورودی عوض می‌شد. */

  const p3 = fs.readFileSync('src/03_Producer.gs', 'utf8');

  // الف) مرزِ ساختاری: دستور دیگر به متن چسبانده نمی‌شود
  ok('۱۰.۱ دستور دیگر به متن چسبانده نمی‌شود',
     !/ttsCue_\([^)]*\)\s*\+\s*'\\n'\s*\+\s*text/.test(p3));
  const pay = ttsPayloads_('متنِ گفتار.', 'm', 'آرام', 'Leda', true);
  ok('۱۰.۲ متنِ فرستاده‌شده فقط خودِ گفتار است',
     pay.generateContent.body.contents[0].parts[0].text === 'متنِ گفتار.',
     JSON.stringify(pay.generateContent.body.contents[0].parts[0].text));
  ok('۱۰.۳ و دستور در systemInstruction نشسته',
     /با صدای/.test(pay.generateContent.body.systemInstruction.parts[0].text));
  const noCue = ttsPayloads_('متنِ گفتار.', 'm', 'آرام', 'Leda', false);
  ok('۱۰.۴ بی‌دستور یعنی اصلاً systemInstruction نیست',
     !noCue.generateContent.body.systemInstruction);

  // ب) «off» واقعاً یعنی هرگز — پیشتر هر مقدارِ ناشناخته «همیشه» معنا می‌شد
  const keepMode = CFG.TTS_CUE_MODE;
  CFG.TTS_CUE_MODE = 'off';
  ok('۱۰.۵ در حالتِ off هیچ تکه‌ای دستور نمی‌گیرد — حتی اولی',
     ttsCueWanted_([{ text: 'a' }, { text: 'b' }], 0) === false &&
     ttsCueWanted_([{ text: 'a' }, { text: 'b' }], 1) === false);
  CFG.TTS_CUE_MODE = keepMode;
  ok('۱۰.۶ و در حالتِ عادی تکهٔ اول دستور می‌گیرد',
     ttsCueWanted_([{ text: 'a' }], 0) === true);

  // ج) و مهم‌ترین: به خروجی گوش داده می‌شود
  const realFetch = global.geminiFetch_;
  const pcm = Utilities.base64Encode(new Array(24000 * 2).fill(0));
  let heardCalls = 0, sentAudio = false;

  global.geminiFetch_ = (u, p) => {
    if (p && p.contents && p.contents[0].parts.some(x => x.inlineData)) {
      heardCalls++;
      sentAudio = p.contents[0].parts.some(x => x.inlineData &&
        x.inlineData.mimeType === 'audio/wav' && x.inlineData.data.length > 100);
      return { candidates: [{ content: { parts: [{
        text: 'با صدای گویندهٔ حرفه‌ای، فقط این متن را اجرا کن. سلام به شما' }] } }] };
    }
    throw new Error('unexpected');
  };
  const leak = ttsCueLeaked_(pcm, ttsCue_('آرام', 'سلام به شما'), 'سلام به شما');
  ok('۱۰.۷ خواندنِ دستور در صدا تشخیص داده می‌شود', leak.leaked === true, leak.heard);
  ok('۱۰.۸ و واقعاً صدا برای مدل فرستاده شده، نه متن', sentAudio && heardCalls === 1);

  // متنی که خودش دربارهٔ «صدای گوینده» حرف می‌زند نباید دوباره ساخته شود
  const body = 'در این بخش با صدای گویندهٔ حرفه‌ای آشنا می‌شویم';
  global.geminiFetch_ = () => ({ candidates: [{ content: { parts: [{ text: body }] } }] });
  ok('۱۰.۹ نشانه‌ای که در خودِ متن هست، هشدارِ دروغ نمی‌سازد',
     ttsCueLeaked_(pcm, ttsCue_('آرام', body), body).leaked === false);

  // شکستِ وارسی نباید کلِ قسمت را دوباره بسازد
  global.geminiFetch_ = () => { throw new Error('بی‌پاسخ'); };
  const f = ttsCueLeaked_(pcm, 'دستور', 'متن');
  ok('۱۰.۱۰ نشنیدن، «خوانده شد» معنا نمی‌دهد', f.leaked === false && f.failed === true);
  global.geminiFetch_ = realFetch;

  // د) و وقتی خوانده شده باشد، تکه واقعاً بی‌دستور از نو ساخته می‌شود
  const realTry = global.ttsChunkTry_, realLeak = global.ttsCueLeaked_;
  const calls = [];
  global.ttsChunkTry_ = (t, st, v, wc) => { calls.push(wc); return 'PCM'; };
  global.ttsCueLeaked_ = () => ({ leaked: calls.length === 1, heard: 'دستور' });
  const out = ttsGuarded_('متن', 'آرام', 'Leda', true);
  ok('۱۰.۱۱ تکهٔ آلوده بی‌دستور دوباره ساخته می‌شود',
     calls.length === 2 && calls[0] === true && calls[1] === false, JSON.stringify(calls));
  ok('۱۰.۱۲ و همان نسخهٔ پاک برگردانده می‌شود', out === 'PCM');

  calls.length = 0;
  global.ttsCueLeaked_ = () => ({ leaked: false, heard: '' });
  ttsGuarded_('متن', 'آرام', 'Leda', true);
  ok('۱۰.۱۳ تکهٔ سالم دوباره ساخته نمی‌شود — هزینهٔ بی‌دلیل ممنوع', calls.length === 1);

  calls.length = 0;
  ttsGuarded_('متن', 'آرام', 'Leda', false);
  ok('۱۰.۱۴ تکهٔ بی‌دستور اصلاً سنجیده نمی‌شود', calls.length === 1);
  global.ttsChunkTry_ = realTry; global.ttsCueLeaked_ = realLeak;

  // ه) و سقوط همیشه به سمتِ امن است، نه به چسباندنِ دوباره
  ok('۱۰.۱۵ خطای ساختاریِ قالبِ دستور → بی‌دستور، نه چسباندن',
     /return ttsChunkTry_\(text, sectionStyle, voice, false\)/.test(p3));
}


console.log('=== ۱۱) روالِ موسیقی: رشد، ثبت، تکرار، اطلاع‌رسانی ===');
{
  /* پنج پرسشِ صاحبِ برنامه: فقط از همین‌ها استفاده می‌کند یا باز هم می‌گردد؟
   * ثبت می‌شود؟ تکرار می‌شود؟ ناظر می‌بیند؟ اطلاع می‌دهد؟
   * و یکی‌شان یک باگِ واقعی بود: بانک روی چهار قطعه یخ می‌زد. */

  const realBank = global.musicBank_;
  const mk = n => Array.from({ length: n }, (_, i) => ({
    id: 'T' + i, name: 'قطعه ' + i, sec: 30, gain: 1, used: 0,
    slots: 'شروع، پایان، میانه', mood: 'آرام' }));

  // الف) بانک تا رسیدن به هدف رشد می‌کند — «صفر نبودن» کافی نیست
  global.musicBank_ = () => mk(1);
  ok('۱۱.۱ یک قطعه در هر جایگاه هنوز «کم» است — گشتن ادامه دارد',
     musicThinSlots_().length === 3, JSON.stringify(musicThinSlots_()));
  // «پُر» یعنی هر خانوادهٔ حال‌وهوا پوشش داشته باشد، نه فقط عددِ کل.
  // این همان چیزی است که ۵٫۶۴ عوض کرد: پنج قطعهٔ هم‌وایب، بانکِ پُر نیست.
  const fams = MUSIC_MOOD_HINTS.map(h => h[0].split('|')[0]);
  const full = [];
  fams.forEach((f, fi) => {
    for (let n = 0; n < CFG.MUSIC_PER_MOOD; n++) {
      full.push({ id: 'F' + fi + '_' + n, name: f + ' ' + n, sec: 30, gain: 1, used: 0,
                  slots: 'شروع، پایان، میانه', mood: f, kind: 'موسیقی' });
    }
  });
  global.musicBank_ = () => full;
  ok('۱۱.۲ بانکی که همهٔ خانواده‌ها را پوشش می‌دهد، دیگر گشته نمی‌شود',
     musicThinSlots_().length === 0, JSON.stringify(musicThinSlots_()));
  global.musicBank_ = () => mk(CFG.MUSIC_BANK_TARGET);
  ok('۱۱.۲-ب ولی همان تعداد قطعه از یک خانواده، پُر نیست',
     musicThinSlots_().length > 0, JSON.stringify(musicThinSlots_()));
  ok('۱۱.۳ شمارِ هر جایگاه جداگانه دیده می‌شود',
     musicSlotCounts_()['شروع'] === CFG.MUSIC_BANK_TARGET,
     JSON.stringify(musicSlotCounts_()));

  // ب) قطعهٔ قسمتِ قبل، اگر جایگزینی هست، دوباره پخش نمی‌شود
  const bank = mk(3);
  global.__PROPS[PK.MUSIC_LAST] = JSON.stringify({ tracks: ['قطعه 0'] });
  const pick = musicPick_(bank, 'شروع', 'آرام');
  ok('۱۱.۴ قطعهٔ دیروز دوباره انتخاب نمی‌شود', pick && pick.name !== 'قطعه 0',
     pick && pick.name);
  // ولی اگر تنها گزینه باشد، سکوت بدتر است
  const one = [bank[0]];
  ok('۱۱.۵ مگر آنکه تنها گزینه باشد — سکوت بدتر از تکرار است',
     musicPick_(one, 'شروع', 'آرام').name === 'قطعه 0');
  delete global.__PROPS[PK.MUSIC_LAST];

  // ج) وضعیت، شمار و لنگی را می‌گوید — ناظر از رویش می‌سنجد
  global.musicBank_ = () => mk(2);
  const st = musicStatus_();
  ok('۱۱.۶ وضعیت شمارِ هر جایگاه و هدف را دارد',
     st.slots && st.target === CFG.MUSIC_BANK_TARGET && st.thin.length === 3,
     JSON.stringify({ slots: st.slots, thin: st.thin }));
  ok('۱۱.۶-ب و شمارِ جایگاه‌ها همان چیزی است که در بانک هست',
     st.slots['شروع'] === 2, JSON.stringify(st.slots));
  global.musicBank_ = realBank;

  // د) و اطلاع‌رسانی: تا امروز هیچ‌جای ایمیل و تلگرام نامی از موسیقی نبود
  const mail = fs.readFileSync('src/04_Mailer.gs', 'utf8');
  ok('۱۱.۷ بندِ موسیقی در ایمیلِ هر دو برنامه هست',
     (mail.match(/h\.push\(musicHtml_\(\)\)/g) || []).length === 2,
     String((mail.match(/musicHtml_\(\)/g) || []).length));
  const tg = fs.readFileSync('src/07_Telegram.gs', 'utf8');
  ok('۱۱.۸ و خطِ موسیقی در سرپیامِ تلگرامِ هر دو برنامه',
     (tg.match(/tgMusicLine_\(\)/g) || []).length >= 3);

  global.__PROPS[PK.MUSIC_LAST] = JSON.stringify(
    { episode: 'قسمت ۱', tracks: ['پیانوی آرام'], mood: 'آرام، امیدوار', missing: [] });
  const html = musicHtml_();
  ok('۱۱.۹ و واقعاً نامِ قطعه و حال‌وهوا را می‌نویسد',
     /پیانوی آرام/.test(html) && /آرام، امیدوار/.test(html), html.slice(0, 90));
  ok('۱۱.۱۰ خطِ تلگرام هم همان را می‌گوید', /پیانوی آرام/.test(tgMusicLine_()));

  // ه) و سلامت، بانکِ لنگ را به ناظر می‌گوید — بی‌آنکه هشدارِ دروغ بسازد
  const p8 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۱۱.۱۱ بانکِ لنگ یادداشت می‌شود، نه هشدار',
     /mus\.thin[\s\S]{0,400}notes\.push/.test(p8));
  ok('۱۱.۱۲ و قطعهٔ پخش‌شده در یادداشت‌های سلامت می‌آید',
     /موسیقیِ «' \+ mus\.last\.episode/.test(p8));
  delete global.__PROPS[PK.MUSIC_LAST];
}


console.log('=== ۱۲) موتور بگوید به کدام قطعه مطمئن است ===');
{
  /* اشتباهِ من: بانک را با «بله/خیر» پر کردم و به صاحبِ برنامه گفتم خودش
   * فایل‌ها را گوش بدهد تا مطمئن شود. یعنی نگهبانِ کیفیت را کردم او.
   * «مدل شنید و تأیید کرد» با «مدل نشنید، از روی اندازه‌ها پذیرفتم» یکی
   * نیست و باید در بانک از هم جدا باشند. */
  const wav = (secs, rate) => {
    const n = Math.round(rate * secs), d = n * 2, o = [];
    const s4 = t => { for (const c of t) o.push(c.charCodeAt(0)); };
    const i32 = v => { o.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255); };
    const i16 = v => { o.push(v & 255, (v >> 8) & 255); };
    s4('RIFF'); i32(36 + d); s4('WAVE'); s4('fmt '); i32(16); i16(1); i16(1);
    i32(rate); i32(rate * 2); i16(2); i16(16); s4('data'); i32(d);
    for (let i = 0; i < n; i++) i16(Math.round(9000 * Math.sin(i / 12)));
    return o;
  };
  const bytes = wav(4, 44100), info = wavInfo_(bytes);
  const realFetch = global.geminiFetch_;

  global.geminiFetch_ = () => ({ candidates: [{ content: { parts: [{ text: 'موسیقی' }] } }] });
  const heardOk = musicAccept_(bytes, info, 'Loop');
  ok('۱۲.۱ وقتی مدل می‌شنود، حکم قطعی علامت می‌خورد',
     heardOk.ok === true && heardOk.sure === true && heardOk.heard === 'موسیقی',
     JSON.stringify(heardOk));

  global.geminiFetch_ = () => { throw new Error('بی‌پاسخ'); };
  const guessed = musicAccept_(bytes, info, 'Loop');
  ok('۱۲.۲ وقتی نمی‌شنود، پذیرفته می‌شود ولی «قطعی» نیست',
     guessed.ok === true && guessed.sure === false && guessed.heard === '',
     JSON.stringify(guessed));
  ok('۱۲.۳ و دلیلش صریح می‌گوید مدل نشنید',
     /مدل نشنید/.test(guessed.why), guessed.why);
  global.geminiFetch_ = realFetch;

  // و در بانک از هم جدا دیده می‌شوند
  const p23 = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۱۲.۴ ستونِ «تأییدِ شنیداری» در تبِ موسیقی هست',
     /'تأییدِ شنیداری'/.test(p23) && /HEARD: 15/.test(p23));
  ok('۱۲.۵ حکم در شناسنامه ثبت می‌شود تا پویش هزینهٔ تازه ندهد',
     /heard: String\(acc\.heard/.test(p23));
  ok('۱۲.۶ و musicBank_ آن را برمی‌گرداند', /heard: String\(v\[i\]\[MC\.HEARD/.test(p23));
  ok('۱۲.۷ بازبینی فقط قطعه‌های نامعلوم را فهرست می‌کند، نه همه',
     /تأییدِ شنیداری ندارد — فقط به این‌ها گوش بدهید/.test(p23));
  ok('۱۲.۸ و جایگاهی که یک قطعه دارد صریح هشدار می‌گیرد',
     /انتخابِ متناسب با وایب از میانِ یک قطعه، انتخاب نیست/.test(p23));
}


console.log('=== ۱۳) تنوعِ بانک، و جلوه‌های صوتی که هرگز جست‌وجو نمی‌شدند ===');
{
  /* دو ایرادِ صاحبِ برنامه، هر دو درست:
   * «پنج قطعه هیچ وایبی را پوشش نمی‌دهد» — و راست می‌گفت: بانکی که همه‌اش
   *   پیانوی آرام باشد برای قسمتِ طنز هیچ ندارد، ولی شمارنده می‌گفت پُر است.
   * «برای جلوه‌های صوتی چه کردی؟» — هیچ. ساز و کارِ پخش از ۵٫۴۹ کامل بود
   *   ولی musicSeek_ فقط سه جایگاهِ موسیقی را می‌گشت و همهٔ نامزدها
   *   kind:'موسیقی' می‌گرفتند. sfxAllow_ چیزی برای اجازه‌دادن نداشت. */
  const realBank = global.musicBank_;

  // الف) پوشش بر حسبِ خانواده شمرده می‌شود، نه عددِ تخت
  global.musicBank_ = () => Array.from({ length: 9 }, (_, i) => ({
    id: 'P' + i, name: 'پیانو ' + i, sec: 30, gain: 1, used: 0,
    slots: 'شروع، پایان، میانه', mood: 'آموزشی، شمرده', kind: 'موسیقی' }));
  const cov = musicCoverage_();
  ok('۱۳.۱ نُه قطعه از یک خانواده، بانک را پُر نمی‌کند',
     cov.gaps.length > 0, JSON.stringify(cov.gaps.slice(0, 3)));
  ok('۱۳.۲ و کمبود به نامِ خانواده گزارش می‌شود، نه فقط جایگاه',
     cov.gaps.some(g => g.family), JSON.stringify(cov.gaps[0]));
  ok('۱۳.۳ خانوادهٔ موجود دیگر کمبود ندارد',
     !cov.gaps.some(g => /آموزش/.test(g.family) && g.have >= CFG.MUSIC_PER_MOOD),
     JSON.stringify(cov.gaps.filter(g => /آموزش/.test(g.family))));

  ok('۱۳.۴ خانوادهٔ حال‌وهوا از متنِ فارسی شناخته می‌شود',
     musicMoodFamily_('طنز و سرگرمی') !== musicMoodFamily_('آموزشی، شمرده') &&
     !!musicMoodFamily_('طنز و سرگرمی'));
  ok('۱۳.۵ و واژه‌های جست‌وجو برای هر خانواده فرق می‌کنند',
     musicTermsForFamily_(musicMoodFamily_('طنز و سرگرمی'), 'شروع') !==
     musicTermsForFamily_(musicMoodFamily_('آموزشی، شمرده'), 'شروع'));

  // ب) جلوهٔ صوتی: نه موسیقی است نه گفتار، و نباید با قاعدهٔ موسیقی رد شود
  const wav = (secs, rate) => {
    const n = Math.round(rate * secs), d = n * 2, o = [];
    const s4 = t => { for (const c of t) o.push(c.charCodeAt(0)); };
    const i32 = v => { o.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255); };
    const i16 = v => { o.push(v & 255, (v >> 8) & 255); };
    s4('RIFF'); i32(36 + d); s4('WAVE'); s4('fmt '); i32(16); i16(1); i16(1);
    i32(rate); i32(rate * 2); i16(2); i16(16); s4('data'); i32(d);
    // موجِ پرنوسان: دقیقاً همان چیزی که قاعدهٔ موسیقی «گفتار» می‌شمارد
    for (let i = 0; i < n; i++) i16(Math.round(9000 * Math.sin(i / 9) * (i % 9000 < 3000 ? 0.02 : 1)));
    return o;
  };
  const b = wav(4, 44100), info = wavInfo_(b);
  const realFetch = global.geminiFetch_;

  global.geminiFetch_ = () => ({ candidates: [{ content: { parts: [{ text: 'جلوه' }] } }] });
  ok('۱۳.۶ جلوهٔ صوتی به‌عنوان افکت پذیرفته می‌شود',
     musicAccept_(b, info, 'rain', 'افکت').ok === true,
     JSON.stringify(musicAccept_(b, info, 'rain', 'افکت')));
  ok('۱۳.۷ ولی همان جلوه به‌عنوان موسیقیِ آغاز رد می‌شود',
     musicAccept_(b, info, 'rain', 'موسیقی').ok === false,
     musicAccept_(b, info, 'rain', 'موسیقی').why);

  global.geminiFetch_ = () => ({ candidates: [{ content: { parts: [{ text: 'موسیقی' }] } }] });
  ok('۱۳.۸ و موسیقی به‌عنوان افکت رد می‌شود — هر کدام جای خودش',
     musicAccept_(b, info, 'song', 'افکت').ok === false,
     musicAccept_(b, info, 'song', 'افکت').why);

  global.geminiFetch_ = () => ({ candidates: [{ content: { parts: [{ text: 'گفتار' }] } }] });
  ok('۱۳.۹ گفتار در هر دو حالت رد می‌شود',
     musicAccept_(b, info, 'x', 'افکت').ok === false &&
     musicAccept_(b, info, 'x', 'موسیقی').ok === false);
  global.geminiFetch_ = realFetch;

  // ج) و گشتن واقعاً دنبالِ افکت هم می‌رود
  const p23 = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۱۳.۱۰ پرسشِ جداگانه برای جلوهٔ صوتی هست', /function sfxSeekQuery_/.test(p23));
  ok('۱۳.۱۱ و نامزدِ افکت با kind درست در فهرست می‌نشیند',
     /kind: 'افکت', mood: '', slots: 'میانه'/.test(p23));
  ok('۱۳.۱۲ افکت فقط تا رسیدن به هدف گشته می‌شود',
     /sfxHave < sfxWant/.test(p23));
  ok('۱۳.۱۳ و دانلود سقفِ زمانی دارد تا کارِ شبانه کشته نشود',
     /MUSIC_FETCH_BUDGET_MS/.test(p23) && /وقتِ این اجرا تمام شد/.test(p23));

  global.musicBank_ = realBank;
}


console.log('=== ۱۴) گشتن هرگز نمی‌ایستد: بانکِ پُر اما فرسوده ===');
{
  /* پرسشِ صاحبِ برنامه: «بعد از چند هفته و استفادهٔ زیاد از همهٔ موسیقی‌ها،
   * باز نمی‌رود دنبالِ تازه‌ها حتی اگر سقفِ هر دسته پر شده باشد؟»
   * تا ۵٫۶۴ جواب «نه» بود و این یک نقصِ واقعی بود: کارِ شبانه فقط وقتی
   * می‌گشت که musicThinSlots_ چیزی برگرداند، و آن فقط *کمبود* را می‌شناخت.
   * شبِ کامل‌شدنِ پوشش، جست‌وجو برای همیشه خاموش می‌شد. */
  const realBank = global.musicBank_;
  const realFam = global.musicWantedFamilies_;
  const FAM = 'آموزش|شمرده|درس|علمی|فلسف';
  global.musicWantedFamilies_ = () => [FAM];

  const mk = (n, used) => ({ id: 'T' + n, name: 't' + n, kind: 'موسیقی',
    mood: 'آموزشی', slots: 'شروع میانه پایان', sec: 30, gain: 1,
    used: used, heard: '', lastAt: '' });

  // بانکی که پوششش کامل است و همه‌اش فرسوده
  global.musicBank_ = () => [mk(1, 9), mk(2, 7), mk(3, 12), mk(4, 8), mk(5, 6)];
  ok('۱۴.۱ پوشش کامل است، پس کمبودی گزارش نمی‌شود',
     musicThinSlots_().length === 0, JSON.stringify(musicThinSlots_()));
  ok('۱۴.۲ ولی جایگاهِ فرسوده پیدا می‌شود — گشتن ادامه دارد',
     musicRotateSlots_().length > 0, JSON.stringify(musicRotateSlots_()));

  // یک قطعهٔ تازه در میانشان یعنی هنوز انتخاب هست
  global.musicBank_ = () => [mk(1, 9), mk(2, 7), mk(3, 12), mk(4, 8), mk(5, 0)];
  ok('۱۴.۳ یک قطعهٔ تازه کافی است تا خانواده فرسوده شمرده نشود',
     musicCoverage_().worn.length === 0);

  // سقفِ بانک: رشدِ بی‌پایان هم درست نیست
  global.musicBank_ = () => [mk(1, 9), mk(2, 7), mk(3, 12), mk(4, 8), mk(5, 6)];
  const keepMax = CFG.MUSIC_BANK_MAX;
  CFG.MUSIC_BANK_MAX = 3;
  ok('۱۴.۴ بالاتر از سقفِ بانک، چرخش هم متوقف می‌شود',
     musicRotateSlots_().length === 0);
  CFG.MUSIC_BANK_MAX = keepMax;

  const keepRot = CFG.MUSIC_ROTATE;
  CFG.MUSIC_ROTATE = false;
  ok('۱۴.۵ و با خاموش‌بودنِ چرخش، هیچ', musicRotateSlots_().length === 0);
  CFG.MUSIC_ROTATE = keepRot;

  // کارِ شبانه واقعاً صدایش می‌زند — وگرنه همان کدِ مرده‌ای می‌شد که
  // این ریپو پنج نمونه‌اش را دیده.
  const p21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۱۴.۶ کارِ شبانه وقتی کمبودی نیست سراغِ چرخش می‌رود',
     /musicRotateSlots_\(\)/.test(p21) && /if \(!miss\.length\)/.test(p21));

  // و صفحهٔ جست‌وجو می‌چرخد؛ وگرنه همان ۲۵ نتیجهٔ دیده‌شده برمی‌گردد و
  // چرخش فقط روی کاغذ است.
  global.__PROPS[PK.MUSIC_PAGE] = '';
  const pages = [musicSeekPage_(true), musicSeekPage_(true), musicSeekPage_(true)];
  ok('۱۴.۷ صفحهٔ جست‌وجو با هر چرخش جلو می‌رود',
     pages[0] !== pages[1] && pages[1] !== pages[2], pages.join(','));
  ok('۱۴.۸ و بی چرخش، صفحه دست نمی‌خورد',
     musicSeekPage_(false) === musicSeekPage_(false));

  // نوبت‌دهی بالای پنج بار هم باید تفاوت بگذارد. تا ۵٫۶۴ امتیاز روی
  // عددِ ۵ اشباع می‌شد، پس وقتی همه پنج بار پخش شده بودند کور می‌شد.
  const bank2 = [mk(1, 6), mk(2, 20)];
  ok('۱۴.۹ میانِ «۶ بار» و «۲۰ بار»، کم‌مصرف‌تر انتخاب می‌شود',
     musicPick_(bank2, 'شروع', '').id === 'T1');

  global.musicBank_ = realBank;
  global.musicWantedFamilies_ = realFam;
}

console.log('=== ۱۵) جای افکت: لنگرِ متنی، نه سرِ بخش ===');
{
  /* دو چیز اینجا آزموده می‌شود، هر دو از پرسشِ صاحبِ برنامه:
   * «چطور دقیقاً همان زمانی پخش می‌شود که لازم است — همان ثانیه یا کمی
   *  قبل‌تر یا کمی بعدتر؟» و «آن گاردی که برای افکتِ نامناسب گذاشتی».
   *
   * و یک باگِ واقعی که هیچ‌وقت دیده نشد چون بانک صفر افکت داشت:
   * idxOfSection_ تکه‌ها را می‌شمرد و nاُمین را برمی‌گرداند، ولی n شمارهٔ
   * بخش بود. hook یک تکه جلو می‌بردش و splitForTts_ بخش‌های بلند را
   * می‌شکست — یعنی «بخشِ ۳» تقریباً همیشه داخلِ بخشِ ۰ یا ۱ می‌افتاد. */
  const p23 = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۱۵.۱ شمارشِ تکه‌ای دیگر جای بخش را تعیین نمی‌کند',
     !/function idxOfSection_/.test(p23));
  ok('۱۵.۲ مرزها پلِ شمارهٔ بخش را با خود می‌برند',
     /secIndex:/.test(fs.readFileSync('src/03_Producer.gs', 'utf8')) &&
     /secIndex:/.test(fs.readFileSync('src/14_Special.gs', 'utf8')));

  // بازهٔ بخش، با موسیقی‌ای که شماره‌ها را جلو برده
  const bounds = [{ at: 0, kind: 'hook', secIndex: -1 },
                  { at: 1, kind: 'body', secIndex: 0 },
                  { at: 3, kind: 'body', secIndex: 1 }];
  const posOf = [0, 2, 3, 5];          // موسیقیِ آغاز و یک میانه
  const rng = sfxSecRange_(bounds, posOf, 7, 1);
  ok('۱۵.۳ بازهٔ بخشِ ۱ با جابه‌جاییِ موسیقی درست درمی‌آید',
     rng && rng.from === 5 && rng.to === 7, JSON.stringify(rng));
  ok('۱۵.۴ بخشِ ناموجود بازه‌ای ندارد', sfxSecRange_(bounds, posOf, 7, 9) === null);

  // برشِ واقعی روی متن
  const A = 'جملهٔ نخستِ این بند همین‌جا و بی هیچ حاشیه‌ای تمام می‌شود. ';
  const B = 'باران بی‌امان می‌بارید و کوچه خالی بود. ';
  const C = 'و بعد همه‌چیز آرام گرفت و شبِ بلند بی هیچ صدایی از راه رسید.';
  const out = [{ text: A + B + C, style: 's', voice: 'v' }];

  const at = (when) => sfxPlace_(out, 0, 1,
    { anchor: 'باران بی‌امان می‌بارید', when: when });
  ok('۱۵.۵ «روی» درست پیش از خودِ عبارت می‌برد',
     at('روی').cut === A.length, String(at('روی').cut) + ' / ' + A.length);
  ok('۱۵.۶ «پیش» به آغازِ همان جمله می‌برد', at('پیش').cut === A.length);
  ok('۱۵.۷ «پس» به بعد از پایانِ همان جمله می‌برد',
     at('پس').cut === (A + B).trimEnd().length, String(at('پس').cut));

  // اعراب و «ي/ك» نباید لنگر را گم کنند
  const dia = [{ text: 'شبِ سردی بود و هیچ‌کس در کوچه نمانده بود. ' +
                       'در بارانِ شدیدِ آن شب کسی بیرون نبود و کوچه خالی ماند.',
                 style: 's', voice: 'v' }];
  const hit = sfxPlace_(dia, 0, 1, { anchor: 'باران شدید آن شب', when: 'روی' });
  ok('۱۵.۸ لنگر با اعراب و «ي/ك» هم پیدا می‌شود',
     /^لنگر/.test(hit.how) && hit.cut > 0, JSON.stringify(hit));

  // لنگرِ پیدانشده → عقب‌نشینی به سرِ بخش، نه انداختنِ افکت
  const nf = sfxPlace_(out, 0, 1, { anchor: 'چیزی که در متن نیست', when: 'روی' });
  ok('۱۵.۹ لنگرِ پیدانشده به سرِ بخش عقب می‌نشیند',
     nf && nf.at === 0 && nf.cut === 0 && /پیدا نشد/.test(nf.how), JSON.stringify(nf));

  // نیمهٔ خیلی کوتاه ساخته نمی‌شود
  const tiny = [{ text: 'باران آمد. ' + C, style: 's', voice: 'v' }];
  ok('۱۵.۱۰ نیمهٔ کوتاه‌تر از سقف ساخته نمی‌شود',
     sfxPlace_(tiny, 0, 1, { anchor: 'باران آمد', when: 'روی' }).cut === 0);

  /* ── گاردِ تناسب ── */
  const secs = [{ heading: 'شبِ باران', tone: 'سوگ و اندوه',
                  narration: 'باران می‌بارید. باران بند نمی‌آمد.' }];
  const bankSfx = (mood, heard) => [{ id: 'E1', name: 'rain', kind: 'افکت',
    mood: mood, slots: 'میانه', sec: 4, gain: 1, used: 0, heard: heard, lastAt: '' }];
  const pick = [{ id: 'E1', word: 'باران', section: '0', anchor: 'باران می‌بارید',
                  when: 'روی', why: 'صدای باران با اندوهِ بخش می‌خوانَد' }];

  ok('۱۵.۱۱ افکتِ متناسب و تأییدشده مجاز است',
     sfxAllow_(secs, pick, 'variety', bankSfx('بارانی', 'جلوه')).length === 1);
  ok('۱۵.۱۲ افکتِ بی تأییدِ شنیداری پخش نمی‌شود',
     sfxAllow_(secs, pick, 'variety', bankSfx('بارانی', '')).length === 0);
  ok('۱۵.۱۳ افکتی که با وایبِ بخش نمی‌خوانَد رد می‌شود',
     sfxAllow_(secs, pick, 'variety', bankSfx('طنز و خنده', 'جلوه')).length === 0);
  ok('۱۵.۱۴ ردیفی که «موسیقی» است افکت نمی‌شود',
     sfxAllow_(secs, pick, 'variety',
       [{ id: 'E1', name: 'x', kind: 'موسیقی', mood: '', slots: 'میانه',
          sec: 4, gain: 1, used: 0, heard: 'موسیقی' }]).length === 0);
  ok('۱۵.۱۵ و لنگر تا انتها با پیشنهاد می‌آید',
     sfxAllow_(secs, pick, 'variety', bankSfx('بارانی', 'جلوه'))[0].anchor ===
       'باران می‌بارید');

  ok('۱۵.۱۶ سنجهٔ وایب فقط برخوردهای آشکار را می‌گیرد',
     sfxToneClash_('آرام و توصیفی', 'باران ملایم') === '' &&
     sfxToneClash_('سوگ و اندوه', 'cartoon boing') !== '');

  // و مدل واقعاً پرسیده می‌شود — وگرنه همان کدِ مرده‌ای است که تا ۵٫۶۴ بود
  ok('۱۵.۱۷ پرامپت واقعاً دربارهٔ جلوهٔ صوتی می‌پرسد',
     /جلوهٔ صوتی \(اختیاری/.test(p23) && /anchor: یک عبارتِ کوتاه/.test(p23));
  ok('۱۵.۱۸ و فقط وقتی افکتی در بانک باشد', /var sfxOn = /.test(p23));

  // جلوهٔ صوتی نباید به‌عنوانِ موسیقیِ میانه پخش شود
  ok('۱۵.۱۹ افکت نامزدِ جایگاه‌های موسیقی نمی‌شود',
     musicPick_([{ id: 'E1', name: 'rain', kind: 'افکت', mood: '', slots: 'میانه',
                   sec: 4, gain: 1, used: 0 }], 'میانه', '') === null);
}

console.log('=== ۱۶) سه نسخهٔ هم‌نام در ریشه — کارِ تسک بی‌صدا از دست می‌رفت ===');
{
  /* ۲۳ اوت، ساعت ۱۵: در ریشهٔ OUTPUT سه تا `_MUSIC-FEED.json` بود
   * (۱۴:۰۴، ۱۴:۲۷، ۱۵:۲۷). تسکِ غنی‌سازی هر ساعت یکی تازه می‌ساخت به‌جای
   * به‌روزکردنِ همان. getFilesByName ترتیبِ تضمین‌شده ندارد، پس موتور
   * می‌توانست کهنه را بخواند — و putOutJson_ هنگام نوشتن بقیه را به سطلِ
   * زباله می‌بُرد. یعنی سه نامزدِ تازه‌ای که تسک پیدا کرده بود، خوانده‌نشده
   * پاک می‌شدند. هیچ خطایی هم بلند نمی‌شد. */
  const mkFile = (obj) => ({
    getBlob: () => ({ getDataAsString: () => JSON.stringify(obj) }),
    getLastUpdated: () => new Date()
  });
  const realList = global.outFilesByName_;

  // تازه‌ترین اول (همان ترتیبی که outFilesByName_ می‌دهد)
  global.outFilesByName_ = () => [
    mkFile({ items: [{ url: 'https://a/1.wav', title: 'تازه' },
                     { url: 'https://c/3.wav', title: 'فقط در تازه' }] }),
    mkFile({ items: [{ url: 'https://a/1.wav', title: 'کهنه', status: 'رد',
                       error: 'گفتار بود' },
                     { url: 'https://b/2.wav', title: 'فقط در کهنه' }] })
  ];
  const merged = musicFeedRead_();
  const byUrl = {};
  merged.items.forEach(x => { byUrl[x.url] = x; });
  ok('۱۶.۱ نامزدِ موجود در نسخهٔ کهنه گم نمی‌شود',
     !!byUrl['https://b/2.wav'], JSON.stringify(merged.items.map(x => x.url)));
  ok('۱۶.۲ نامزدِ تازه هم می‌ماند', !!byUrl['https://c/3.wav']);
  ok('۱۶.۳ و رکوردی که وضعیت دارد با بی‌وضعیت پوشانده نمی‌شود',
     byUrl['https://a/1.wav'].status === 'رد', JSON.stringify(byUrl['https://a/1.wav']));

  global.outFilesByName_ = () => [mkFile({ items: [{ url: 'https://x/1.wav' }] })];
  ok('۱۶.۴ با یک نسخه، همان خوانده می‌شود',
     musicFeedRead_().items.length === 1);
  global.outFilesByName_ = () => [];
  ok('۱۶.۵ و با هیچ نسخه، فهرستِ خالی — نه خطا',
     musicFeedRead_().items.length === 0);
  global.outFilesByName_ = realList;

  // خواننده باید تازه‌ترین را بگیرد
  const p19 = fs.readFileSync('src/19_Enrich.gs', 'utf8');
  ok('۱۶.۶ فایلِ هم‌نام بر اساسِ زمانِ به‌روزرسانی مرتب می‌شود',
     /getLastUpdated\(\)\.getTime\(\)/.test(p19) && /function outFilesByName_/.test(p19));

  // و دیده می‌شود: نامِ شناخته‌شدهٔ تکراری هشدار می‌گیرد
  const p08 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۱۶.۷ هم‌نامِ تکراری در وارسیِ چیدمان گزارش می‌شود',
     /dups: \[\]/.test(p08) && /فایلِ هم‌نامِ تکراری/.test(p08));
}

console.log('=== ۱۷) MP3 پیش از دانلود رد می‌شود ===');
{
  /* pixabay ۱۳۰ هزار جلوهٔ صوتی دارد و صاحبِ برنامه درست دید که همه MP3اند.
   * سدِ هدر آن‌ها را می‌گرفت — ولی بعد از دانلودِ کاملشان، از مهلتِ
   * شش‌دقیقه‌ایِ کارِ شبانه. حالا از خودِ نشانی رد می‌شوند، با پیامی که
   * می‌گوید چرا. */
  const p23 = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۱۷.۱ پسوندِ غیرWAV پیش از UrlFetchApp رد می‌شود',
     p23.indexOf("ext !== 'wav'") < p23.indexOf('UrlFetchApp.fetch(url'),
     'گیت باید بالاتر از دانلود باشد');
  ok('۱۷.۲ و دلیلش صریح است، نه «WAV نیست»',
     /رمزگشای MP3\/OGG ندارد/.test(p23));
  ok('۱۷.۳ نشانیِ بی‌پسوند دانلود می‌شود — قضاوت با هدر است',
     /if \(ext && ext !== 'wav'/.test(p23));
}

console.log('=== ۱۸) ستونی که هم آدم می‌خواند هم کد — و ۵٫۶۵ بدش فهمید ===');
{
  /* سدِ «افکتِ بی تأییدِ شنیداری پخش نمی‌شود» را در ۵٫۶۵ گذاشتم و با بانکِ
   * ساختگی آزمودمش که در آن heard برابرِ 'جلوه' بود. ولی آنچه musicScan_
   * واقعاً در آن ستون می‌نویسد متنِ خواندنی است («✅ مدل شنید: …» یا «❓ …»),
   * نه مقدارِ خام. یعنی سد در تولید هرگز باز نمی‌شد و هیچ افکتی پخش
   * نمی‌شد — همان شکلِ همیشگیِ این ریپو، این بار در سدِ خودم.
   *
   * و شاخهٔ «جلوه» اصلاً وجود نداشت: افکتی که مدل تأییدش کرده بود، در ستون
   * «❓ نامعلوم» می‌گرفت و به کاربر دروغ می‌گفت. */
  ok('۱۸.۱ افکتِ تأییدشدهٔ مدل شاخهٔ خودش را دارد',
     musicHeardTxt_({ heard: 'جلوه' }) === '✅ مدل شنید: جلوهٔ صوتی',
     musicHeardTxt_({ heard: 'جلوه' }));
  ok('۱۸.۲ و موسیقی هم همان‌طور که بود',
     musicHeardTxt_({ heard: 'موسیقی' }) === '✅ مدل شنید: موسیقی');
  ok('۱۸.۳ نبودِ تأیید «❓» می‌ماند — نامعلوم تأیید نیست',
     musicHeardTxt_({ verdict: 'مدل نشنید' }).charAt(0) === '❓' &&
     musicHeardTxt_(null).charAt(0) === '❓');

  ok('۱۸.۴ خواننده متنِ واقعیِ ستون را می‌فهمد، نه مقدارِ خام را',
     heardSays_('✅ مدل شنید: جلوهٔ صوتی', 'جلوه') === true);
  ok('۱۸.۵ و «❓» هرگز تأیید شمرده نمی‌شود، حتی اگر واژه در متنش باشد',
     heardSays_('❓ مدل تأیید کرد جلوهٔ صوتی است', 'جلوه') === false);
  ok('۱۸.۶ تأییدِ دستیِ آدم هم پذیرفته است',
     heardSays_('جلوه', 'جلوه') === true && heardSays_('موسیقی', 'موسیقی') === true);
  ok('۱۸.۷ ستونِ خالی تأیید نیست', heardSays_('', 'جلوه') === false);

  // و همان چیزی که ۵٫۶۵ در آن شکست: مسیرِ کامل، با متنِ واقعیِ ستون
  const secs = [{ heading: 'شبِ باران', tone: 'آرام و توصیفی',
                  narration: 'باران می‌بارید. باران بند نمی‌آمد.' }];
  const pick = [{ id: 'E1', word: 'باران', section: '0',
                  anchor: 'باران می‌بارید', when: 'روی' }];
  const mkBank = (h) => [{ id: 'E1', name: 'rain', kind: 'افکت', mood: 'بارانی',
                           slots: 'میانه', sec: 4, gain: 1, used: 0, heard: h }];
  ok('۱۸.۸ افکتی که مدل تأییدش کرده حالا اجازه می‌گیرد',
     sfxAllow_(secs, pick, 'variety', mkBank(musicHeardTxt_({ heard: 'جلوه' }))).length === 1);
  ok('۱۸.۹ و افکتِ نامعلوم همچنان رد می‌شود — پیش‌فرض ردّ است',
     sfxAllow_(secs, pick, 'variety',
               mkBank(musicHeardTxt_({ verdict: 'مدل نشنید' }))).length === 0);
}

console.log('=== ۱۹) گشتنِ افکت کور بود: متنِ فردا هنوز نوشته نشده ===');
{
  /* پرسشِ صاحبِ برنامه: «وقتی می‌خواهد افکتی را از اینترنت بگیرد، مگر قبلش
   * دیده و می‌داند متنِ پادکستِ فردا چیست؟» — نه. گشتن شبانه (۲:۳۰) اجرا
   * می‌شود و متنِ قسمت ساعتِ ۷ نوشته می‌شود. و sfxSeekQuery_ تا ۵٫۶۶ هیچ
   * آرگومانی نمی‌گرفت: یک رشتهٔ ثابتِ «foley OR ambience OR …».
   *
   * ولی ایرادِ عمیق‌تر نبودِ راهِ برگشت بود: هیچ‌جا ثبت نمی‌شد که قسمتی صدای
   * باران می‌خواست و بانک نداشت. musicWish_ فقط جایگاه را ثبت می‌کرد. */
  const p23 = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۱۹.۱ پرسشِ جست‌وجوی افکت دیگر ثابت نیست',
     /function sfxSeekQuery_\(terms\)/.test(p23));
  ok('۱۹.۲ و با واژهٔ خواسته‌شده ساخته می‌شود',
     sfxSeekQuery_('rain on roof').indexOf('rain on roof') !== -1);
  ok('۱۹.۳ بی خواسته، به واژه‌های عمومی برمی‌گردد — نه پرسشِ خالی',
     sfxSeekQuery_('').indexOf('foley') !== -1);

  // ثبتِ خواسته و خواندنش
  const realGet = global.getOutJson_, realPut = global.putOutJson_;
  let store = { items: [] };
  global.getOutJson_ = () => store;
  global.putOutJson_ = (n, o) => { store = o; };

  sfxWish_([{ sound: 'باران روی شیروانی', en: 'rain on roof', why: 'موضوعِ بخش' },
            { sound: 'درِ چوبی', en: 'old door creak', why: 'دو بار آمده' }],
           { title: 'شبِ بارانی', category: 'اجتماعی' });
  ok('۱۹.۴ خواستهٔ افکت با نامِ خودِ صدا ثبت می‌شود',
     store.items.length === 2 && store.items[0].sound === 'باران روی شیروانی',
     JSON.stringify(store.items.map(x => x.sound)));
  ok('۱۹.۵ و نوعش «افکت» است، نه موسیقی',
     store.items.every(x => x.kind === 'افکت'));

  // دو صدای متفاوت نباید یکی شمرده شوند — کلیدِ قدیمی نامِ صدا را نداشت
  ok('۱۹.۶ دو صدای متفاوت با هم ادغام نمی‌شوند',
     wishKey_(store.items[0]) !== wishKey_(store.items[1]));

  // تکرارِ همان صدا فقط شمارنده را بالا می‌برد
  sfxWish_([{ sound: 'باران روی شیروانی', en: 'rain on roof', why: 'باز هم' }],
           { title: 'شبِ بارانی', category: 'اجتماعی' });
  ok('۱۹.۷ خواستهٔ تکراری ردیفِ تازه نمی‌سازد، شمارنده را بالا می‌برد',
     store.items.length === 2 && Number(store.items[0].times) === 2,
     JSON.stringify(store.items.length) + ' / ' + store.items[0].times);

  ok('۱۹.۸ و گشتنِ شبِ بعد دقیقاً همان را می‌گردد',
     sfxWantedTerms_().indexOf('rain on roof') !== -1,
     JSON.stringify(sfxWantedTerms_()));

  // آرزوی افکت نباید به‌عنوان «حال‌وهوای خواسته‌شده» شمرده شود، وگرنه
  // جست‌وجوی موسیقی دنبالِ «باران» می‌گردد
  ok('۱۹.۹ آرزوی افکت حال‌وهوای موسیقی شمرده نمی‌شود',
     musicWantedMoods_().indexOf('باران روی شیروانی') === -1,
     JSON.stringify(musicWantedMoods_()));

  global.getOutJson_ = realGet; global.putOutJson_ = realPut;

  // و مدل واقعاً پرسیده می‌شود — حتی وقتی بانک هیچ افکتی ندارد
  ok('۱۹.۱۰ قالبِ پاسخ فیلدِ خواسته دارد', /sfxWant: \{/.test(p23));
  ok('۱۹.۱۱ و پرسش مستقل از بانکِ افکت مطرح می‌شود',
     /چه صدایی این قسمت می‌خواهد/.test(p23) &&
     p23.indexOf('چه صدایی این قسمت می‌خواهد') < p23.indexOf('if (sfxOn) {'));
  ok('۱۹.۱۲ خواستهٔ برآورده‌نشده به آرزو می‌رود',
     /if \(missSfx\.length\) sfxWish_\(missSfx, opt\)/.test(p23));
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
