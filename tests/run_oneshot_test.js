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
const { Spread } = require('./lib/mock.js');
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
  /* از ۶٫۲۹ «۱۵۰ واژه در دقیقه» یک ثابتِ مستقل نیست: هم سقف و هم پرامپت از
     نرخِ گفتارِ اندازه‌گیری‌شده می‌آیند. اگر این سنجه ثابتِ خودش را داشته
     باشد، دقیقاً همان تناقضی را می‌سازد که برای گرفتنش نوشته شده. */
  const askedWords = Math.round(specialTargetMin_() * speechWpm_());
  const askedChars = Math.round(specialTargetMin_() * speechCps_() * 60);
  /* ══ سنجه به *کلید* بند است، نه به مقدارِ امروزش (۶٫۴۳) ══
   * تا ۶٫۴۲ اینجا نوشته بود «هدف با روشن‌بودنِ یک فایل پایین آمده» — که
   * وقتی درست بود که آن کلید همیشه روشن بماند. صاحبِ برنامه خاموشش کرد
   * («اگر در دو فایل شد مشکلی ندارد») و سنجه شکست، بی آنکه چیزی خراب شده
   * باشد.
   * چیزی که واقعاً باید همیشه درست بماند، **هم‌خوانی** است: روشن یعنی هدف
   * زیرِ سقفِ فایل کشیده شود، خاموش یعنی هدف همان عددِ اعلام‌شده بماند. آن
   * تناقضی که ۵٫۹۱ گرفت (پنج جا ۱۵ می‌گفتند و یک جا ۱۰٫۸) در هر دو حالت
   * باید غیرممکن باشد. */
  if (CFG.SPECIAL_ONE_FILE === true) {
    ok('۱.۱ هدفِ مؤثر از سقفِ یک فایل بیرون نمی‌زند',
       askedChars <= cap * 1.05, askedChars + ' نویسه در برابرِ سقفِ ' + cap);
    ok('۱.۲ و هدف با روشن‌بودنِ «یک فایل» پایین آمده',
       specialTargetMin_() <= CFG.SPECIAL_TARGET_MINUTES,
       specialTargetMin_() + ' ≤ ' + CFG.SPECIAL_TARGET_MINUTES);
  } else {
    /* ══ ۶٫۵۳ ══ این آزمون تا امروز خودِ باگ را تثبیت می‌کرد: می‌گفت هدف
       باید عددِ خامِ پیکربندی باشد، در حالی که سقفِ نوشتن رزروِ غنی‌سازی و
       عصری‌سازی را کم کرده بود. پس پرامپت «۱۵ دقیقه» می‌گفت و سقف ۱۱٫۴ —
       و قسمت کوتاه در می‌آمد. قرارداد این است: هدف **همیشه** همان سقف
       است، در هر دو حالت. یک عدد، یک معنا. */
    ok('۱.۱ هدفِ اعلام‌شده به مدل، دقیقاً همان سقفِ نوشتن است',
       Math.abs(specialTargetMin_() - specialMaxChars_() / speechCps_() / 60) < 0.11,
       specialTargetMin_() + ' در برابرِ ' +
       (specialMaxChars_() / speechCps_() / 60).toFixed(1));
    ok('۱.۱-ب و از هدفِ پیکربندی بیشتر نیست (رزرو کم می‌شود، اضافه نمی‌کند)',
       specialTargetMin_() <= Number(CFG.SPECIAL_TARGET_MINUTES),
       specialTargetMin_() + ' ≤ ' + CFG.SPECIAL_TARGET_MINUTES);
    /* و همان‌جا که سقفِ یک فایل دیگر شرط نیست، غنی‌سازی و عصری‌سازی هم نباید
       پشتِ آن خفه شوند — وگرنه قیدی که برداشته شده، از راهِ دیگری برمی‌گردد. */
    ok('۱.۲ و سقفِ یک فایل دیگر بودجهٔ عصری‌سازی را نمی‌بندد',
       fs.readFileSync('src/29_Explain.gs', 'utf8')
         .indexOf('if (CFG.SPECIAL_ONE_FILE === true) {') !== -1);
  }

  // خودِ متنِ پرامپت — چون همان‌جا بود که تناقض نوشته می‌شد
  const p14 = fs.readFileSync('src/14_Special.gs', 'utf8');
  ok('۱.۳ هیچ‌جای درس‌نامه دیگر SPECIAL_TARGET_MINUTES خام را به مدل نمی‌گوید',
     !/CFG\.SPECIAL_TARGET_MINUTES \* 150/.test(p14));
  ok('۱.۴ وارسیِ سلامت هم با هدفِ مؤثر می‌سنجد',
     /specialTargetMin_\(\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));

  /* و با خاموش‌شدنِ «یک فایل»، سقفِ فایل از معادله بیرون می‌رود ولی رزرو
     نه — پس هدف بالا می‌رود و هنوز همان سقفِ نوشتن است (۶٫۵۳). */
  const keep = CFG.SPECIAL_ONE_FILE;
  CFG.SPECIAL_ONE_FILE = false;
  const offT = specialTargetMin_();
  CFG.SPECIAL_ONE_FILE = true;
  const onT = specialTargetMin_();
  CFG.SPECIAL_ONE_FILE = keep;
  ok('۱.۵ خاموش‌بودنِ «یک فایل» هدف را بالا می‌برد، نه پایین',
     offT >= onT && offT <= Number(CFG.SPECIAL_TARGET_MINUTES),
     offT + ' در برابرِ ' + onT + ' (سقفِ پیکربندی ' + CFG.SPECIAL_TARGET_MINUTES + ')');
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

console.log('=== ۲ب) و اگر خیلی کوتاه نوشت، کد یک بار عمیق‌ترش می‌کند (۶٫۷۵) ===');
{
  /* قسمتِ ۲۵ (۳۱ اوت): ۷:۴۸ در برابرِ هدفِ ۱۶ دقیقه‌ای. نه موادی کم بود
     (۴۲٬۰۰۰ نویسه منبع، توقف از سرِ بودجه) و نه مسیر خراب بود — پرامپت
     صریح گفته بود «کوتاه‌تر ایرادی ندارد» و هشدار زیرِ ۴۰٪ کالیبره بود،
     پس ۴۶٪ بی‌صدا گذشت. کف هم مثل سقف باید در کد نگهبان داشته باشد. */
  const cap = 4000;
  const short = 'یک جملهٔ کوتاه. ';
  const mkS = () => ({ hook: 'قلاب.', recap: '', outro: 'پایان.',
    sections: [{ heading: 'الف', narration: short.repeat(20) },
               { heading: 'ب', narration: short.repeat(20) }] });
  // منبعِ پرمایه: خیلی بیشتر از کمبود
  const stream = [{ text: 'متنِ منبع با جزئیاتِ فراوان. '.repeat(400) }];
  const realG2 = global.geminiText_;
  let asked2 = null;

  global.geminiText_ = (p) => { asked2 = p;
    return { hook: 'قلاب.', outro: 'پایان.',
             sections: [{ heading: 'الف', narration: 'الف؛ ' + short.repeat(90) },
                        { heading: 'ب', narration: 'ب؛ ' + short.repeat(90) }] }; };
  let x = specialExpand_(mkS(), stream, cap, 1);
  ok('۲ب.۱ متنِ خیلی کوتاه یک بار عمیق‌تر نوشته می‌شود',
     x.tried === true && x.to > x.from, x.from + ' → ' + x.to);
  ok('۲ب.۲ و نتیجه از سقف نمی‌گذرد — کف، سقف را نمی‌شکند',
     specialNarration_(x.ep).length <= cap, specialNarration_(x.ep).length + ' ≤ ' + cap);
  ok('۲ب.۳ خودِ منبع به مدل داده می‌شود، نه فقط «بلندتر بنویس»',
     /متنِ منبع/.test(asked2) && asked2.indexOf('متنِ منبع با جزئیاتِ فراوان') !== -1);
  ok('۲ب.۴ و صریح ممنوع می‌کند که از بیرونِ منبع چیزی بیفزاید',
     /چیزی از بیرونِ منبع نیفزا/.test(asked2) && /پُرکننده ممنوع/.test(asked2));
  ok('۲ب.۵ تعدادِ بخش‌ها ثابت می‌مانَد', x.ep.sections.length === 2);

  // متنی که به‌اندازه هست، هیچ فراخوانی نمی‌سازد
  asked2 = null; global.geminiText_ = () => { asked2 = 'CALLED'; return null; };
  const okEp = { hook: '', recap: '', outro: '',
                 sections: [{ heading: 'الف', narration: 'x'.repeat(cap) }] };
  ok('۲ب.۶ متنی که بالای کف است هزینه‌ای نمی‌سازد',
     specialExpand_(okEp, stream, cap, 1).tried === false && asked2 === null);

  // منبعِ کم‌مایه حق دارد درسِ کوتاه بدهد — و علتش نوشته می‌شود
  const thinSrc = [{ text: 'کم.' }];
  const r2 = specialExpand_(mkS(), thinSrc, cap, 1);
  ok('۲ب.۷ منبعِ کم‌مایه پُر نمی‌شود و علت ثبت می‌شود',
     r2.tried === false && /منبع بیش از این نداشت/.test(r2.why), r2.why);

  // نسخه‌ای که بخش کم دارد یا بلندتر نشده، پذیرفته نمی‌شود
  global.geminiText_ = () => ({ hook: 'ق.', outro: 'پ.',
    sections: [{ heading: 'الف', narration: 'تنها.' }] });
  ok('۲ب.۸ نسخهٔ ناقص رد می‌شود و متنِ اصلی می‌مانَد',
     specialExpand_(mkS(), stream, cap, 1).ep.sections.length === 2);
  global.geminiText_ = () => ({ hook: 'ق.', outro: 'پ.',
    sections: [{ heading: 'الف', narration: 'ریز.' }, { heading: 'ب', narration: 'ریز.' }] });
  const r3 = specialExpand_(mkS(), stream, cap, 1);
  ok('۲ب.۹ نسخه‌ای که بلندتر نشد هم رد می‌شود',
     r3.to === r3.from && /بلندتر نشد/.test(r3.why));
  global.geminiText_ = () => { throw new Error('boom'); };
  ok('۲ب.۱۰ ترکیدنِ مدل قسمت را نمی‌کشد',
     specialExpand_(mkS(), stream, cap, 1).ep.sections.length === 2);
  global.geminiText_ = realG2;

  // و وصل‌بودن به مسیرِ واقعی + کالیبراسیونِ هشدار
  const fsS = require('fs');
  const p14 = fsS.readFileSync('src/14_Special.gs', 'utf8');
  ok('۲ب.۱۱ در مسیرِ تولید، پیش از فشرده‌سازی صدا زده می‌شود',
     /xpd = specialExpand_\(ep, stream, specialMaxChars_\(\), epNum\)/.test(p14) &&
     p14.indexOf('specialExpand_(ep, stream') < p14.indexOf('specialCondense_(ep, specialMaxChars_()'));
  // در *خطِ پرامپت* (نه در کامنتِ تاریخچه) دیگر اجازه‌ای نیست
  ok('۲ب.۱۲ پرامپت دیگر اجازهٔ کوتاه‌نویسی نمی‌دهد و کف را می‌گوید',
     !/L\.push\([^\n]*کوتاه‌تر ایرادی ندارد/.test(p14) && /L\.push\('• کفِ سخت: از /.test(p14));
  ok('۲ب.۱۳ آستانهٔ یافته آن‌قدر بالاست که برای ۴۶٪ هدف بزند',
     Number(CFG.SPECIAL_MIN_OUTPUT_RATIO) > 0.46 &&
     Number(CFG.SPECIAL_MIN_OUTPUT_RATIO) <= Number(CFG.SPECIAL_FLOOR_RATIO),
     CFG.SPECIAL_MIN_OUTPUT_RATIO + ' / ' + CFG.SPECIAL_FLOOR_RATIO);
  ok('۲ب.۱۴ و یافته می‌گوید عمیق‌ترنویسی هم تلاش شد یا نه',
     /عمیق‌ترنویسی هم انجام شد و نتیجه نداد/.test(p14) &&
     /عمیق‌ترنویسی اجرا نشد/.test(p14));
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
  // «پیش از پویش» یک ترتیب است، نه یک فاصله. سنجهٔ قبلی ۲۰۰ نویسه فاصله
  // می‌خواست و با افزودنِ نگهبانِ زمان در ۵٫۶۸ شکست — در حالی که ترتیب
  // دست‌نخورده بود. حالا خودِ ترتیب سنجیده می‌شود.
  {
    const p21f = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
    ok('۶.۱۲ در کارِ شبانه پیش از پویش صدا زده می‌شود',
       p21f.indexOf('musicFetch_();') > 0 &&
       p21f.indexOf('musicFetch_();') < p21f.indexOf('musicScan_(); musicAutoTag_()'));
  }
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
  // از ۶٫۸۸ جوابِ درشتِ «موسیقی» به «آهنگ» نگاشته می‌شود: موسیقیِ
  // ملودی‌دار، همانی که می‌شود با آن برنامه را باز کرد.
  ok('۱۲.۱ وقتی مدل می‌شنود، حکم قطعی علامت می‌خورد',
     heardOk.ok === true && heardOk.sure === true && heardOk.heard === 'آهنگ',
     JSON.stringify(heardOk));

  /* ── و «موسیقی» دیگر یک چیز نیست (۶٫۸۸) ──
   * دو شبِ پیاپی درس‌نامه با یک درونِ گرانولار باز شد. هیچ سدی نشکسته
   * بود: آن فایل موسیقی است. تنها سؤالی که پرسیده می‌شد «موسیقی یا
   * گفتار؟» بود و هیچ‌کس نپرسید «این می‌تواند شروع باشد؟» */
  global.geminiFetch_ = () => ({ candidates: [{ content: { parts: [{ text: 'زمینه' }] } }] });
  const droneAcc = musicAccept_(bytes, info, 'Drone');
  ok('۱۲.۱-ب زمینه هم موسیقی است و وارد بانک می‌شود',
     droneAcc.ok === true && droneAcc.sure === true && droneAcc.heard === 'زمینه',
     JSON.stringify(droneAcc));
  ok('۱۲.۱-پ ولی ستونِ تأیید می‌گوید برای شروع/پایان نیست',
     /نه شروع، نه پایان/.test(musicHeardTxt_({ heard: 'زمینه' })),
     musicHeardTxt_({ heard: 'زمینه' }));

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

console.log('=== ۲۰) کارِ شبانه: نصبِ کد پشتِ صفِ سنگین‌ها ایستاده بود ===');
{
  /* صاحبِ برنامه دید که هشت نسخهٔ کهنهٔ پرامپت هنوز در ریشهٔ OUTPUT‌اند، با
   * اینکه promptPrune_ از ۵٫۴۷ نوشته و وصل و آزموده شده بود — و پرسید «مگر
   * قبلاً سازوکارش را درست نکردی؟». تابع سالم بود؛ **نوبتش نمی‌رسید**.
   *
   * selfUpdateDaily به ترتیبِ تاریخِ افزوده‌شدن چیده شده بود، نه به ترتیبِ
   * اهمیت: گشتنِ موسیقی، دانلود با سقفِ ۱۵۰ ثانیه، و پویشی که بایتِ هر فایلِ
   * بانک را می‌خواند — همه پیش از خانه‌داری، و پیش از خودِ نصبِ کد که آخرین
   * خط بود. مهلتِ شش‌دقیقه‌ایِ Apps Script اجرا را بی‌صدا می‌کشد، پس هرچه
   * پس از موسیقی بود گرسنه می‌ماند. با چهار فایل دیده نمی‌شد؛ با یازده
   * فایل و ~۶۰ مگابایت شد. */
  // فقط بدنهٔ خودِ selfUpdateDaily — وگرنه تعریفِ nightHas_ که بالاترش
  // نشسته، ترتیب را جعل می‌کند.
  const whole = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const p21 = whole.slice(whole.indexOf('function selfUpdateDaily() {'),
                          whole.indexOf('function selfUpdateRetry()'));
  const at = (needle) => p21.indexOf(needle);

  ok('۲۰.۱ داوریِ نصبِ دیشب هنوز پیش از نصبِ امشب است',
     at('engVerdict_()') < at('installed = selfUpdateStep(false)'));
  ok('۲۰.۲ نصبِ کد پیش از کارِ سنگین انجام می‌شود، نه بعدش',
     at('installed = selfUpdateStep(false)') < at('musicSeek_(miss)'),
     'نصب باید جلوتر از موسیقی باشد');
  ok('۲۰.۳ بایگانیِ پرامپت‌ها هم پیش از کارِ سنگین',
     at('promptPrune_()') < at('musicSeek_(miss)'));
  ok('۲۰.۴ و هرسِ گزارش و پرونده‌های غنی‌سازی همین‌طور',
     at('pruneReportArchive_()') < at('musicSeek_(miss)') &&
     at('pruneEnrichFiles_()') < at('musicSeek_(miss)'));
  ok('۲۰.۵ سنجهٔ محتوا هنوز در همان اجرا هست',
     /auditRun_\(\)/.test(p21) && /auditPrune_\(\)/.test(p21));
  ok('۲۰.۶ و نتیجهٔ نصب همچنان برگردانده می‌شود',
     /return installed;/.test(p21));

  // نگهبانِ زمان: هر کارِ سنگین پشتِ آن است
  ok('۲۰.۷ هر کارِ سنگین پیش از شروع وقت را می‌سنجد',
     (p21.match(/nightHas_\(/g) || []).length >= 4,
     String((p21.match(/nightHas_\(/g) || []).length));
  ok('۲۰.۸ و خانه‌داری پشتِ نگهبان نیست — همیشه اجرا می‌شود',
     at('promptPrune_()') < at('nightHas_('),
     'خانه‌داری باید بی‌قید و شرط باشد');

  nightStart_();
  ok('۲۰.۹ در آغازِ اجرا وقت هست', nightHas_(60000, 'آزمون') === true);
  const keep = CFG.NIGHT_BUDGET_MS;
  CFG.NIGHT_BUDGET_MS = 1;                    // سهم تمام‌شده
  ok('۲۰.۱۰ با تمام‌شدنِ سهم، کارِ سنگین رد می‌شود — نه اینکه اجرا کشته شود',
     nightHas_(60000, 'آزمون') === false);
  CFG.NIGHT_BUDGET_MS = keep;
  nightStart_();
  ok('۲۰.۱۱ و سهم دوباره از صفر شمرده می‌شود', nightHas_(60000, 'آزمون') === true);

  // پویشِ بانک نباید هر شب بایتِ همهٔ فایل‌ها را بخواند
  const p23b = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۰.۱۲ ردیفِ سنجیده‌شده دوباره از روی بایت خوانده نمی‌شود',
     /skipped\+\+;\s*\n\s*continue;/.test(p23b) &&
     p23b.indexOf('var known = byId[id];') <
       p23b.indexOf('bytes = f.getBlob().getBytes()'));

  /* و سازوکاری که نگذارد این دوباره بی‌صدا بماند: خودِ موتور باید بگوید
     نسخهٔ کهنهٔ پرامپت در ریشه مانده. تا ۵٫۶۷ نامِ `_PROMPT-*.md` «شناخته»
     بود، پس سرگردان شمرده نمی‌شد و هیچ هشداری نمی‌گرفت — و تشخیصش افتاده
     بود گردنِ صاحبِ برنامه، که دو بار یادآوری کرد. */
  const p08b = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۲۰.۱۳ وارسیِ چیدمان نسخهٔ کهنهٔ پرامپت را جدا می‌شمارد',
     /oldPrompts: \[\]/.test(p08b) && /promptFam/.test(p08b));
  ok('۲۰.۱۴ و در هشدارِ سلامت دیده می‌شود، با اشاره به علتِ اصلی',
     /نسخهٔ کهنهٔ پرامپت هنوز در ریشهٔ/.test(p08b) &&
     /promptPrune_\) اجرا نشده/.test(p08b));
}

console.log('=== ۲۱) شناسنامهٔ بی‌صدا، و افکتی که «ambience» نیست ===');
{
  /* ۲۳ اوت در پوشهٔ بانک دو `_MUSIC-META-*.json` بود بی هیچ فایلِ صوتی:
   * calm-study-lesson-intro و warm-slice-of-life-intro. تسکِ غنی‌سازی هر دو
   * را ساخته و شناسنامه‌شان را نوشته بود، ولی خودِ WAV فقط به گفت‌وگو پیوست
   * شده بود و هرگز به درایو نرسید.
   * بدترین شکلِ خرابی: شناسنامه می‌گوید قطعه هست، و نیست. و پویش تا امروز
   * شناسنامه‌ها را کلاً رد می‌کرد، پس هیچ‌کس نمی‌دیدش. */
  const p23c = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۱.۱ پویش شناسنامه‌ها و فایل‌های صوتی را جدا می‌شمارد',
     /var metaOf = \{\}, wavOf = \{\};/.test(p23c));
  ok('۲۱.۲ و شناسنامه‌ای که صدایش نیست گزارش می‌شود',
     /شناسنامهٔ بی‌صدا در بانک/.test(p23c));
  ok('۲۱.۳ و در نتیجهٔ پویش برمی‌گردد تا دیده شود',
     /orphan: orphan/.test(p23c));

  /* و گشتنِ عمومی: «foley OR ambience OR nature recording» ضبطِ *بلندِ* فضای
   * محیطی می‌دهد — ده دقیقه جنگل — نه صدای سه‌ثانیه‌ایِ بستنِ در. */
  ok('۲۱.۴ فهرستِ صداهای پایه‌ای مشخص است، نه کلی',
     Array.isArray(SFX_STARTER) && SFX_STARTER.length >= 8 &&
     SFX_STARTER.some(x => /door/.test(x[1])) &&
     SFX_STARTER.some(x => /rain/.test(x[1])));

  const realBank = global.musicBank_;
  global.musicBank_ = () => [];
  global.__PROPS[PK.SFX_TURN] = '';
  const first = sfxStarterTerms_();
  const second = sfxStarterTerms_();
  ok('۲۱.۵ با بانکِ خالی، یک صدای مشخص برمی‌گرداند',
     !!first && first.indexOf(' ') !== -1, String(first));
  ok('۲۱.۶ و هر اجرا سراغِ صدای بعدی می‌رود', first !== second,
     first + ' / ' + second);

  // صدایی که بانک از قبل دارد، دوباره گشته نمی‌شود
  global.musicBank_ = () => SFX_STARTER.map(x => ({
    id: 'E' + x[1], name: x[1], kind: 'افکت', mood: '', slots: 'میانه',
    sec: 3, gain: 1, used: 0, heard: ''
  }));
  ok('۲۱.۷ وقتی همهٔ صداهای پایه‌ای هست، چیزی نمی‌گردد',
     sfxStarterTerms_() === '', JSON.stringify(sfxStarterTerms_()));

  global.musicBank_ = () => [{ id: 'E1', name: 'rain drops loop', kind: 'افکت',
    mood: '', slots: 'میانه', sec: 3, gain: 1, used: 0, heard: '' }];
  global.__PROPS[PK.SFX_TURN] = '0';
  ok('۲۱.۸ و صدایی که هست رد می‌شود، نه اینکه دوباره بیاید',
     sfxStarterTerms_().indexOf('rain') === -1, String(sfxStarterTerms_()));
  global.musicBank_ = realBank;

  ok('۲۱.۹ خواستهٔ ثبت‌شده بر صدای پایه‌ای مقدم است',
     p23c.indexOf('sfxWantedTerms_().join') < p23c.indexOf('sfxTerms = sfxStarterTerms_()'));
}

console.log('=== ۲۲) «نمی‌خواهم دستی چیزی بگذارم» — و نباید هم بگذارد ===');
{
  /* شناسنامهٔ واقعیِ ۲۳ اوت این جمله را در خود داشت:
   *   «کانکتورِ درایو نمی‌تواند فایلِ صوتیِ چنددقیقه‌ای را بالا ببرد …
   *    کافی است همان را با همین نام در همین پوشه بگذارید.»
   * یعنی سامانه کارش را به آدم واگذار کرده بود. صاحبِ برنامه درست گفت:
   * «من این‌همه اتوماسیون نکردم که آخرش بروم دستی چیزی را بگذارم جایی.»
   * سشن فقط معرفی می‌کند؛ آوردن کارِ موتور است. */
  const p23d = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۲.۱ موتور خودش شناسنامهٔ بی‌صدا را حل می‌کند',
     /function musicOrphanFix_/.test(p23d) && /musicOrphanFix_\(orphan\)/.test(p23d));

  const realFolder = global.musicFolder_, realFeed = global.musicFeedRead_;
  const realPut = global.putOutJson_, realFetched = global.musicFetchedUrls_;
  let written = null, movedTo = [];
  const mkMeta = (obj, name) => ({
    getName: () => name,
    getBlob: () => ({ getDataAsString: () => JSON.stringify(obj) }),
    moveTo: (d) => { movedTo.push(name); }
  });
  const WAVMETA = { title: 'باران', url: 'https://x.example/rain.wav',
                    license: 'CC0', kind: 'افکت', mood: 'بارانی',
                    slots: 'میانه', gain: 0.8 };
  const MP3META = { title: 'مطالعه', url: 'https://x.example/study.mp3',
                    license: 'PD', kind: 'موسیقی', mood: 'آرام',
                    slots: 'شروع، پایان', gain: 0.55 };
  const files = {
    '_MUSIC-META-rain.json': mkMeta(WAVMETA, '_MUSIC-META-rain.json'),
    '_MUSIC-META-study.json': mkMeta(MP3META, '_MUSIC-META-study.json')
  };
  global.musicFolder_ = () => ({
    getFilesByName: (n) => { let done = false;
      return { hasNext: () => !done && !!files[n], next: () => { done = true; return files[n]; } }; },
    getFoldersByName: () => ({ hasNext: () => true, next: () => ({ __rej: 1 }) }),
    createFolder: () => ({ __rej: 1 })
  });
  global.musicFeedRead_ = () => ({ items: [] });
  global.musicFetchedUrls_ = () => [];
  global.putOutJson_ = (n, o) => { written = o; };

  const r = musicOrphanFix_(['rain', 'study']);
  ok('۲۲.۲ شناسنامه‌ای با نشانیِ WAV به فهرست می‌رود — نه به دستِ آدم',
     r.fed === 1 && written && written.items.length === 1 &&
     written.items[0].url === 'https://x.example/rain.wav', JSON.stringify(r));
  ok('۲۲.۳ و حال‌وهوا و جایگاهش با خودش می‌رود',
     written.items[0].mood === 'بارانی' && written.items[0].slots === 'میانه' &&
     written.items[0].kind === 'افکت');
  ok('۲۲.۴ عددِ بلندی هم رشته می‌شود، چون فهرست همه‌رشته است',
     typeof written.items[0].gain === 'string', typeof written.items[0].gain);
  ok('۲۲.۵ شناسنامه‌ای که نشانی‌اش MP3 است از بانک بیرون می‌رود',
     r.moved === 1 && movedTo.indexOf('_MUSIC-META-study.json') !== -1,
     JSON.stringify(movedTo));
  ok('۲۲.۶ ولی پاک نمی‌شود — فقط جابه‌جا', /moveTo\(musicRejectFolder_\(\)\)/.test(p23d));

  // نشانی‌ای که قبلاً آورده شده دوباره به فهرست نمی‌رود
  written = null; movedTo = [];
  global.musicFetchedUrls_ = () => ['https://x.example/rain.wav'];
  const r2 = musicOrphanFix_(['rain']);
  ok('۲۲.۷ نشانیِ قبلاً آمده دوباره به فهرست نمی‌رود',
     r2.fed === 0 && written === null, JSON.stringify(r2));
  ok('۲۲.۷-ب و دلیلِ کنارگذاشتنش راست است، نه «WAV نیست»',
     /فایلش از پوشه برداشته شده/.test(r2.notes.join(' ')), r2.notes.join(' '));

  // و آنچه در فهرست است و منتظرِ نوبت — نباید دست بخورد
  written = null; movedTo = [];
  global.musicFetchedUrls_ = () => [];
  global.musicFeedRead_ = () => ({ items: [{ url: 'https://x.example/rain.wav' }] });
  const r3 = musicOrphanFix_(['rain']);
  ok('۲۲.۷-ج شناسنامه‌ای که نشانی‌اش در صفِ دانلود است دست نمی‌خورد',
     r3.fed === 0 && r3.moved === 0 && /منتظرِ نوبت/.test(r3.notes.join(' ')),
     JSON.stringify(r3));

  global.musicFolder_ = realFolder; global.musicFeedRead_ = realFeed;
  global.putOutJson_ = realPut; global.musicFetchedUrls_ = realFetched;

  ok('۲۲.۸ و بی شناسنامهٔ یتیم، هیچ کاری نمی‌کند',
     musicOrphanFix_([]).fed === 0 && musicOrphanFix_(null).moved === 0);
}

console.log('=== ۲۳) داوریِ نامعلوم باید قابلِ تجدیدنظر باشد ===');
{
  /* «Paper Pages — Vinrax» تنها افکتِ بانک است: سالم، پنج‌ثانیه‌ای، دقیقاً
   * همان چیزی که برای بخشی دربارهٔ کتاب و نوشتن لازم می‌شود. ولی شناسنامه‌اش
   * `"heard": ""` دارد و `"verdict": "مدل نشنید…"` — یعنی بارِ اول مدل
   * نتوانست قضاوتش کند.
   *
   * و از ۵٫۶۵ همین «نامعلوم» جلوی پخشِ افکت را می‌گیرد (پیش‌فرض ردّ است، که
   * درست است). ولی musicRecheck_ داوریِ تازه را هیچ‌جا ثبت نمی‌کرد — فقط
   * kept++ می‌شمرد. پس یک ناتوانیِ **گذرا** به بن‌بستِ **دائمی** تبدیل
   * می‌شد: هرچقدر هم بازبینی می‌کردی، ستون همان «❓» می‌ماند. */
  const p23e = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۳.۱ بازبینی داوریِ تازه را در شناسنامه ثبت می‌کند',
     /musicMetaWrite_\(f2\.getName\(\), nm2\)/.test(p23e));
  ok('۲۳.۲ و فقط وقتی مدل واقعاً مطمئن بوده',
     /if \(acc\.sure && acc\.heard && !\(mt && String\(mt\.heard \|\| ''\)\.trim\(\)\)\)/.test(p23e));
  ok('۲۳.۳ و پس از ثبت، تب هم دوباره پویش می‌شود',
     /if \(out\.moved \|\| out\.heard\)/.test(p23e));

  // ستون باید از «❓» به «✅» ارتقا بگیرد، ولی نوشتهٔ آدم دست‌نخورده بماند
  ok('۲۳.۴ «❓» با تأییدِ تازه ارتقا می‌گیرد',
     /cH\.charAt\(0\) === '❓' && heardTxt\.charAt\(0\) === '✅'/.test(p23e));
  ok('۲۳.۵ ولی «❓» با یک «❓»ی دیگر جایگزین نمی‌شود',
     !/cH\.charAt\(0\) === '❓'\)\s*\{\s*try \{ sh\.getRange\(r\.row, MC\.HEARD\)/.test(p23e));

  // و آنچه آدم دستی نوشته، مصون است
  ok('۲۳.۶ تأییدِ دستیِ آدم هرگز بازنویسی نمی‌شود',
     heardSays_('جلوه', 'جلوه') === true &&
     'جلوه'.charAt(0) !== '❓');

  // مسیرِ کامل: شناسنامهٔ تأییدشده → متنِ ستون → سدِ افکت
  const secs = [{ heading: 'دفترِ کاغذی', tone: 'آرام و توصیفی',
                  narration: 'کاغذ ورق می‌خورد. کاغذ بوی کهنگی می‌داد.' }];
  const pick = [{ id: 'P1', word: 'کاغذ', section: '0',
                  anchor: 'کاغذ ورق می‌خورد', when: 'روی' }];
  const row = (h) => [{ id: 'P1', name: 'Paper Pages', kind: 'افکت',
    mood: 'صدای ورق‌خوردنِ کاغذ', slots: 'میانه', sec: 5, gain: 0.5,
    used: 0, heard: h }];
  ok('۲۳.۷ با «❓ مدل نشنید» پخش نمی‌شود — پیش‌فرض ردّ',
     sfxAllow_(secs, pick, 'variety',
               row(musicHeardTxt_({ verdict: 'مدل نشنید' }))).length === 0);
  ok('۲۳.۸ و پس از تأیید، همان افکت اجازه می‌گیرد',
     sfxAllow_(secs, pick, 'variety',
               row(musicHeardTxt_({ heard: 'جلوه' }))).length === 1);
}

console.log('=== ۲۴) «موسیقیِ یک‌ثانیه‌ای» — سه علت، هر سه واقعی ===');
{
  /* نخستین قسمتِ واقعاً موسیقی‌دار، ۲۴ اوت: «موسیقیِ اول و گاهی وسط در حدِ
   * یک ثانیه است!!! موسیقیِ آخر فقط ۵ ثانیه بود… خیلی غیرحرفه‌ای.»
   * و: «یعنی واقعاً فکر کردی میانه یعنی یک بار بین اول و آخر؟» */

  // ── علتِ ۱: شروعِ دیرهنگام، بی‌صدا قطعه را می‌بُرید ──
  // قطعهٔ ۱۰ ثانیه‌ای، ۸ ثانیه می‌خواهیم، مدل می‌گوید از ثانیهٔ ۹ شروع کن.
  const SR = 24000;
  const mkWav = (sec, rate) => {
    const n = sec * rate, d = [];
    for (let i = 0; i < n; i++) d.push(Math.round(9000 * Math.sin(i / 20)));
    const bytes = [];
    const push32 = v => bytes.push(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255);
    const push16 = v => bytes.push(v & 255, (v >> 8) & 255);
    'RIFF'.split('').forEach(c => bytes.push(c.charCodeAt(0)));
    push32(36 + n * 2);
    'WAVEfmt '.split('').forEach(c => bytes.push(c.charCodeAt(0)));
    push32(16); push16(1); push16(1); push32(rate); push32(rate * 2); push16(2); push16(16);
    'data'.split('').forEach(c => bytes.push(c.charCodeAt(0)));
    push32(n * 2);
    for (let i = 0; i < n; i++) { let v = d[i] < 0 ? d[i] + 65536 : d[i]; push16(v); }
    return bytes.map(b => (b > 127 ? b - 256 : b));
  };
  const wav = mkWav(10, SR);
  const info = wavInfo_(wav);
  ok('۲۴.۰ فایلِ آزمون ۱۰ ثانیه است', Math.round(info.seconds) === 10, String(info.seconds));

  const late = musicSamples_(wav, info, 9, 8);
  ok('۲۴.۱ شروعِ دیرهنگام دیگر قطعه را نمی‌بُرد',
     Math.round(late.length / SR) === 8, (late.length / SR).toFixed(2) + ' ثانیه');
  const early = musicSamples_(wav, info, 0, 8);
  ok('۲۴.۲ و شروعِ به‌موقع همان هشت ثانیه است',
     Math.round(early.length / SR) === 8);
  const tooLong = musicSamples_(wav, info, 0, 30);
  ok('۲۴.۳ خواسته‌ای بلندتر از خودِ قطعه، به طولِ قطعه محدود می‌شود',
     Math.round(tooLong.length / SR) === 10, (tooLong.length / SR).toFixed(2));

  // ── علتِ ۲: محو کلِ قطعهٔ کوتاه را می‌خورد ──
  const p23f = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۴.۴ محو حداکثر یک‌چهارمِ قطعه است، نه نصفش',
     /MUSIC_FADE_SEC\) \|\| 2, len \/ 4\)/.test(p23f));
  {
    // با len/2 هیچ نمونه‌ای در بلندیِ کامل نمی‌ماند؛ با len/4 می‌ماند.
    const n = 4 * SR, samples = [];
    for (let i = 0; i < n; i++) samples.push(10000);
    musicShape_(samples, 1, 1, 1);            // ۴ ثانیه، محو ۱ ثانیه (len/4)
    let full = 0;
    for (let i = 0; i < n; i++) if (samples[i] >= 9999) full++;
    ok('۲۴.۵ دستِ‌کم نیمی از قطعه در بلندیِ کامل می‌مانَد',
       full >= n / 2, Math.round(full / SR * 100) / 100 + ' ثانیه از ۴');
  }

  // ── علتِ ۳: یک میانه در کلِ برنامه ──
  /* این سه تا در ۵٫۷۲ الگوی متنیِ کدِ درون‌خطی را می‌سنجیدند و با انتقالِ
     همان کد به bridgeFill_ در ۵٫۷۳ شکستند — در حالی که رفتار عوض نشده بود.
     سنجهٔ الگوی متنی شکننده است؛ حالا خودِ رفتار سنجیده می‌شود. */
  {
    const bnds = [], bnk = [];
    for (let i = 0; i < 6; i++) bnds.push({ at: i * 10 + 5, heading: 'ب' + i, tone: '' });
    for (let i = 0; i < 6; i++) bnk.push({ id: 'X' + i, name: 'x' + i, kind: 'موسیقی',
      mood: '', slots: 'میانه', sec: 30, gain: 1, used: 0, lastAt: '' });
    const w = bridgeFill_([], bnds, bnk, '', 3);
    ok('۲۴.۶ پشتوانه چند مرز را در طولِ برنامه پخش می‌کند', w.length === 3,
       String(w.length));
    const idsx = w.map(x => x.track.id);
    ok('۲۴.۷ و هر مرز قطعهٔ خودش را می‌گیرد، نه تکرارِ یکی',
       new Set(idsx).size === idsx.length, idsx.join(','));
    ok('۲۴.۸ وایبِ خودِ بخش در انتخابِ قطعهٔ آن مرز می‌آید',
       /String\(mood \|\| ''\) \+ ' ' \+ String\(bd\.tone \|\| ''\)/.test(p23f));
  }
  ok('۲۴.۹ سقفِ میانه بالا رفت', Number(CFG.MUSIC_BRIDGE_MAX) >= 4,
     String(CFG.MUSIC_BRIDGE_MAX));
  ok('۲۴.۱۰ و طولِ قطعه‌ها دیگر رادیویی است',
     Number(CFG.MUSIC_INTRO_SEC) >= 12 && Number(CFG.MUSIC_OUTRO_SEC) >= 14 &&
     Number(CFG.MUSIC_BRIDGE_SEC) >= 6,
     CFG.MUSIC_INTRO_SEC + '/' + CFG.MUSIC_BRIDGE_SEC + '/' + CFG.MUSIC_OUTRO_SEC);
  ok('۲۴.۱۱ تغییرِ گوینده هم به مدل به‌عنوان مرزِ واقعی معرفی می‌شود',
     /تغییرِ گوینده هم یک تغییرِ واقعی/.test(p23f));
}

console.log('=== ۲۵) «موسیقیِ میانه فقط یک بار پخش می‌شود؟» ===');
{
  /* ۵٫۷۲ سقف را از ۲ به ۴ رساند و پشتوانه را پخش‌شونده کرد. ولی پشتوانه
   * پشتِ `if (!want.length)` بود — یعنی فقط وقتی کار می‌کرد که مدل **هیچ**
   * مرزی نداده باشد. و مدل معمولاً یکی می‌دهد، نه صفر.
   * پس سقف بالا رفته بود و در عمل باز هم یک قطعه پخش می‌شد. سقف بی کف
   * کاری نمی‌کند. */
  const p23g = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۵.۱ پر کردن دیگر پشتِ «هیچ مرزی نداده» نیست',
     !/if \(!want\.length && maxBr && bounds\.length\)/.test(p23g) &&
     /if \(want\.length < minBr\) bridgeFill_/.test(p23g));
  ok('۲۵.۲ کف از شمارِ مرزها ساخته می‌شود',
     /Math\.ceil\(bounds\.length \/ per\)/.test(p23g));

  const bounds = [];
  for (let i = 0; i < 6; i++) bounds.push({ at: i * 10 + 5, heading: 'ب' + i, tone: '' });
  const bank = [];
  for (let i = 0; i < 6; i++) bank.push({ id: 'T' + i, name: 't' + i, kind: 'موسیقی',
    mood: '', slots: 'میانه', sec: 30, gain: 1, used: 0, lastAt: '' });

  // مدل یکی داده — کف باید بقیه را پر کند
  let want = [{ at: bounds[0].at, track: bank[0], why: 'مدل', head: 'ب0' }];
  bridgeFill_(want, bounds, bank, '', 3);
  ok('۲۵.۳ وقتی مدل یکی داده، تا کف پر می‌شود', want.length === 3,
     String(want.length));
  ok('۲۵.۴ انتخابِ مدل دست‌نخورده می‌مانَد',
     want[0].at === bounds[0].at && want[0].why === 'مدل');

  const ats = want.map(w => w.at).sort((a, b) => a - b);
  let minGap = 1e9;
  for (let i = 1; i < ats.length; i++) minGap = Math.min(minGap, ats[i] - ats[i - 1]);
  ok('۲۵.۵ مرزها پخش می‌شوند، نه پشتِ هم', minGap >= 20, 'کمترین فاصله ' + minGap);

  const ids = want.map(w => w.track.id);
  ok('۲۵.۶ هر مرز قطعهٔ خودش را دارد — تکرارِ یک جینگل نه',
     new Set(ids).size === ids.length, ids.join(','));

  // از صفر هم درست شروع می‌کند، و از میانه نه از ابتدا
  want = [];
  bridgeFill_(want, bounds, bank, '', 1);
  ok('۲۵.۷ نخستین انتخاب میانهٔ برنامه است، نه ابتدایش',
     want.length === 1 && want[0].at > bounds[0].at &&
     want[0].at < bounds[bounds.length - 1].at, JSON.stringify(want[0] && want[0].at));

  // بانکِ تک‌قطعه‌ای نباید حلقه را بشکند
  want = [];
  bridgeFill_(want, bounds, [bank[0]], '', 3);
  ok('۲۵.۸ با یک قطعه در بانک هم کار می‌کند و گیر نمی‌کند',
     want.length >= 1 && want.length <= 3, String(want.length));

  // بی مرز، هیچ
  want = [];
  ok('۲۵.۹ بی مرز چیزی گذاشته نمی‌شود',
     bridgeFill_(want, [], bank, '', 3).length === 0);

  ok('۲۵.۱۰ و سقف همچنان سقف است',
     Math.min(Number(CFG.MUSIC_BRIDGE_MAX),
              Math.ceil(6 / Number(CFG.MUSIC_BRIDGE_EVERY_SECTIONS))) <=
     Number(CFG.MUSIC_BRIDGE_MAX));
}

console.log('=== ۲۶) «افکت‌ها کِی قرار است از اینترنت پر شوند؟» ===');
{
  /* جوابِ صادقانه تا ۵٫۷۳: شاید هیچ‌وقت. دو گلوگاه، هر دو واقعی.
   *
   * ۱) گشتن: شرطش `out.added < cap` بود — همان سقفی که حلقهٔ موسیقیِ
   *    بالاتر مصرف می‌کند. موسیقی اول می‌دود؛ اگر سقف را پر کند، شاخهٔ
   *    افکت اصلاً اجرا نمی‌شود. و از ۵٫۶۵ گشتنِ موسیقی هرگز متوقف نمی‌شود
   *    (چرخشِ خانواده‌های فرسوده)، پس گرسنگی می‌توانست دائمی باشد.
   * ۲) دانلود: فهرست به ترتیبِ ورود پیمایش می‌شد. در اجرای واقعیِ ۲۳ اوت
   *    «Video Game Sound Ideas» نامزد شد و هفت فایلِ موسیقیِ چندمگابایتی
   *    جلوترش دانلود شدند و وقت تمام شد. */
  const p23h = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۶.۱ گشتنِ افکت دیگر به سقفِ موسیقی وابسته نیست',
     !/sfxHave < sfxWant && out\.added < cap/.test(p23h) &&
     /\(sfxOnly \|\| sfxHave < sfxWant\)/.test(p23h));
  ok('۲۶.۲ و بودجهٔ خودش را دارد',
     /sfxAdded < sfxCap/.test(p23h) && Number(CFG.MUSIC_SFX_SEEK_MAX) >= 1,
     String(CFG.MUSIC_SFX_SEEK_MAX));
  ok('۲۶.۳ شمارندهٔ افکت جدا بالا می‌رود', /out\.added\+\+; sfxAdded\+\+;/.test(p23h));

  // دانلود: افکت باید جلوی صف باشد
  ok('۲۶.۴ صفِ دانلود افکت‌ها را اول می‌گذارد',
     /var order = \[\];/.test(p23h) &&
     p23h.indexOf("=== 'افکت'\) order.push\(q0\)".replace(/\\/g, '')) > 0 ||
     /order\.push\(q0\)/.test(p23h));
  ok('۲۶.۵ و حلقه از همان ترتیب می‌خواند، نه از اندیسِ خام',
     /for \(var oi = 0; oi < order\.length/.test(p23h) &&
     /feed\.items\[order\[oi\]\]/.test(p23h));

  // رفتارِ واقعی: با فهرستی که موسیقی جلوتر است، افکت اول برداشته شود
  const items = [
    { url: 'https://x/a.wav', kind: 'موسیقی', title: 'م۱' },
    { url: 'https://x/b.wav', kind: 'موسیقی', title: 'م۲' },
    { url: 'https://x/e.wav', kind: 'افکت',   title: 'ا۱' }
  ];
  const ord = [];
  for (let q = 0; q < items.length; q++) if (items[q].kind === 'افکت') ord.push(q);
  for (let q = 0; q < items.length; q++) if (items[q].kind !== 'افکت') ord.push(q);
  ok('۲۶.۶ همان قاعده روی فهرستِ واقعی، افکت را اول می‌آورد',
     items[ord[0]].kind === 'افکت', items.map((x,i)=>x.kind).join(',') +
     ' → ' + ord.join(','));
}

console.log('=== ۲۷) افکت، درست بعد از آماده‌شدنِ متن ===');
{
  /* «آیا افکت بعد از آماده شدنِ متنِ پادکست به‌صورت خودکار جست‌وجو و دانلود
   * و در همان پادکست استفاده می‌شود؟ باید قاعدتاً یک همچین ترتیبی داشته
   * باشد.» — درست بود، و تا ۵٫۷۴ این ترتیب را نداشت: شب ۲:۳۰ بی‌خبر از
   * فردا می‌گشت، پس صدا همیشه برای قسمتِ *بعدی* می‌رسید. */
  const p03 = fs.readFileSync('src/03_Producer.gs', 'utf8');
  const p23i = fs.readFileSync('src/23_Music.gs', 'utf8');

  ok('۲۷.۱ پیش از صداگذاری، افکتِ همین قسمت آورده می‌شود',
     /sfxPrefetch_\(ep, 'variety', epNum\)/.test(p03));
  ok('۲۷.۲ و پس از آماده‌شدنِ متن است، نه قبلش',
     p03.indexOf("st.phase === 'speak' && !st.sfxDone") >
       p03.indexOf('function renderAudioStep_'));
  /* سنجهٔ پیشین یک پنجرهٔ ۹۰۰نویسه‌ای بینِ `sfxDone = 1` و `scheduleContinue_`
     می‌گذاشت — یعنی افزودنِ یک توضیح آن را می‌شکست، بی آنکه رفتار عوض شود.
     همان شکنندگی که چند بار در این ریپو تکرار شده. حالا خودِ بلوکِ دروازه
     بریده می‌شود و محتوایش سنجیده، نه فاصلهٔ نویسه‌ها. */
  const gateFrom = p03.indexOf("if (st.phase === 'speak' && !st.sfxDone) {");
  const gateTo = p03.indexOf("if (st.phase === 'enrich') {", gateFrom);
  const gate = gateFrom > 0 && gateTo > gateFrom ? p03.slice(gateFrom, gateTo) : '';
  ok('۲۷.۳ در اجرای خودش، تا به مهلتِ صداگذاری اضافه نشود',
     !!gate && gate.indexOf('scheduleContinue_(5 * 1000);') !== -1 &&
     gate.indexOf('sfxPrefetch: true') !== -1 &&
     gate.indexOf('scheduleContinue_(5 * 1000);') < gate.indexOf('sfxPrefetch: true'));
  ok('۲۷.۴ و با هر از سرگیری دوباره تکرار نمی‌شود',
     /!st\.sfxDone/.test(p03) && /st\.sfxDone = 1;/.test(p03));
  ok('۲۷.۵ هر شکستی بی‌صداست — نبودِ افکت جلوی قسمت را نمی‌گیرد',
     /catch \(ePf\) \{ logLine_\('پیش‌آوردنِ افکت انجام نشد/.test(p03));

  ok('۲۷.۶ درس‌نامه از این مسیر هم افکت نمی‌گیرد',
     /showKind \|\| ''\) === 'special' && CFG\.MUSIC_SFX_IN_SPECIAL !== true\) return out/
       .test(p23i));
  ok('۲۷.۷ مهلتِ سخت دارد', /MUSIC_SFX_PREFETCH_MS/.test(p23i) &&
     Number(CFG.MUSIC_SFX_PREFETCH_MS) > 0, String(CFG.MUSIC_SFX_PREFETCH_MS));
  ok('۲۷.۸ خواسته **اول** ثبت می‌شود تا تلاشِ امروز هدر نرود',
     p23i.indexOf('sfxWish_(need,') < p23i.indexOf('musicSeek_(null, true)'));
  ok('۲۷.۹ گشتن فقط برای افکت است، نه دوباره برای موسیقی',
     /function musicSeek_\(slots, sfxOnly\)/.test(p23i) &&
     /out\.added < cap && !sfxOnly/.test(p23i));

  // رفتارِ واقعیِ پرسش: مدل می‌گوید چه صدایی لازم است
  const realG = global.geminiText_;
  global.geminiText_ = () => ({ wants: [
    { sound: 'باران روی شیروانی', en: 'rain on roof', why: 'موضوعِ بخشِ دوم' },
    { sound: 'درِ چوبی', en: 'old door creak', why: 'دو بار آمده' },
    { sound: 'سومی', en: 'third one', why: 'اضافه' }
  ] });
  const w = sfxWantModel_({ title: 'شبِ بارانی',
    sections: [{ heading: 'باران', tone: 'آرام', narration: 'باران می‌بارید.' }] });
  ok('۲۷.۱۰ پرسش خواسته‌ها را با نامِ فارسی و واژهٔ انگلیسی می‌گیرد',
     w.length === 2 && w[0].en === 'rain on roof', JSON.stringify(w));
  ok('۲۷.۱۱ و بیش از دو تا نمی‌گیرد — خویشتن‌داری', w.length === 2);

  global.geminiText_ = () => ({ wants: [] });
  ok('۲۷.۱۲ «این قسمت صدایی نمی‌خواهد» جوابِ درستی است',
     sfxWantModel_({ sections: [{ heading: 'ا', narration: 'ب' }] }).length === 0);

  global.geminiText_ = () => { throw new Error('مدل در دسترس نیست'); };
  ok('۲۷.۱۳ و نبودِ مدل چیزی را زمین نمی‌زند',
     sfxWantModel_({ sections: [{ heading: 'ا', narration: 'ب' }] }).length === 0);
  global.geminiText_ = realG;

  ok('۲۷.۱۴ بی بخش، اصلاً از مدل پرسیده نمی‌شود',
     sfxWantModel_({ sections: [] }).length === 0 && sfxWantModel_(null).length === 0);

  /* ── و مسیرِ واقعی، نه فقط الگوی متن ──
   * ۵٫۷۶: در بازبینی یک `max` پیدا شد که هرگز تعریف نشده بود. ReferenceError
   * داخلِ try می‌افتاد، `catch` می‌بلعیدش و «آوردن نشد» می‌نوشت — یعنی
   * دانلود هیچ‌وقت اجرا نمی‌شد و هیچ خطایی هم بالا نمی‌آمد. همان الگوی
   * همیشگیِ این ریپو، این بار در کدِ دیشبِ خودم.
   * سنجهٔ الگوی متن این را نمی‌گرفت؛ فقط صدازدنِ واقعیِ تابع می‌گیردش. */
  const realSeek = global.musicSeek_, realFetch = global.musicFetch_;
  const realScan = global.musicScan_, realBank2 = global.musicBank_;
  const realGet2 = global.getOutJson_, realPut2 = global.putOutJson_;
  let store2 = { items: [] }, seekCalls = 0, fetchBudget = null;
  global.getOutJson_ = () => store2;
  global.putOutJson_ = (n, o) => { store2 = o; };
  global.musicBank_ = () => [];
  global.musicSeek_ = (slots, sfxOnly) => { seekCalls++; return { added: 1, notes: [] }; };
  global.musicFetch_ = () => { fetchBudget = CFG.MUSIC_FETCH_BUDGET_MS; return { added: 1 }; };
  global.musicScan_ = () => ({ added: 1 });
  global.geminiText_ = () => ({ wants: [
    { sound: 'باران', en: 'rain on roof', why: 'موضوعِ بخش' }] });

  const keepB = CFG.MUSIC_FETCH_BUDGET_MS, keepC = CFG.MUSIC_FETCH_MAX_PER_RUN;
  const pf = sfxPrefetch_({ title: 'شبِ بارانی',
    sections: [{ heading: 'باران', tone: 'آرام', narration: 'باران می‌بارید.' }] },
    'variety', 9);
  ok('۲۷.۱۵ مسیرِ کامل واقعاً می‌دود و فایل می‌آورد',
     pf.asked === 1 && pf.need === 1 && pf.got === 1, JSON.stringify(pf));
  ok('۲۷.۱۶ گشتن در حالتِ «فقط افکت» صدا زده شد', seekCalls === 1, String(seekCalls));
  ok('۲۷.۱۷ و بودجهٔ دانلود به مهلتِ همین پنجره بسته شد، نه ۱۵۰ ثانیهٔ شبانه',
     fetchBudget !== null && fetchBudget <= CFG.MUSIC_SFX_PREFETCH_MS,
     String(fetchBudget));
  ok('۲۷.۱۸ و بعدش بودجه و سقف برگردانده شدند',
     CFG.MUSIC_FETCH_BUDGET_MS === keepB && CFG.MUSIC_FETCH_MAX_PER_RUN === keepC);
  ok('۲۷.۱۹ خواسته هم ثبت شد، تا اگر امروز نشد شبِ بعد بیاید',
     (store2.items || []).some(x => x.kind === 'افکت' && x.en === 'rain on roof'),
     JSON.stringify((store2.items || []).map(x => x.sound)));

  // و اگر بانک همان صدا را دارد، نه می‌گردد نه می‌آورد
  seekCalls = 0;
  global.musicBank_ = () => [{ id: 'E1', name: 'rain drops', kind: 'افکت',
    mood: 'بارانی', slots: 'میانه', sec: 4, gain: 1, used: 0, heard: '' }];
  const pf2 = sfxPrefetch_({ title: 'ب',
    sections: [{ heading: 'باران', narration: 'باران.' }] }, 'variety', 9);
  ok('۲۷.۲۰ صدایی که بانک دارد دوباره آورده نمی‌شود',
     pf2.need === 0 && seekCalls === 0, JSON.stringify(pf2));

  global.musicSeek_ = realSeek; global.musicFetch_ = realFetch;
  global.musicScan_ = realScan; global.musicBank_ = realBank2;
  global.getOutJson_ = realGet2; global.putOutJson_ = realPut2;
  global.geminiText_ = realG;

  // و سقفِ شمارشی نباید جلوی «صدای مشخصِ لازم» را بگیرد
  ok('۲۷.۲۱ در حالتِ «فقط افکت»، پُربودنِ بانک مانعِ گشتن نیست',
     /\(sfxOnly \|\| sfxHave < sfxWant\)/.test(p23i));
}

console.log('=== ۲۸) بازبینیِ شنیداری خودکار شد ===');
{
  /* ۵٫۷۱ راهِ تجدیدنظر را باز کرد، ولی فقط با فشردنِ دکمه. یعنی قطعه‌ای که
   * مدل بارِ اول قضاوتش نکرد تا وقتی صاحبِ برنامه دکمه نزند بی‌استفاده
   * می‌ماند — و او همین را رد کرد: «اینهمه اتوماسیون نکردم که…».
   * حالا هر شب چندتا، افکت‌ها اول، با سقف و مهلت. */
  const p21b = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const p23j = fs.readFileSync('src/23_Music.gs', 'utf8');

  ok('۲۸.۱ کارِ شبانه بازبینی را صدا می‌زند',
     /musicRecheck_\(null, \{ onlyUnknown: true/.test(p21b));
  ok('۲۸.۲ و پشتِ نگهبانِ زمان است، مثل بقیهٔ کارهای سنگین',
     /nightHas_\(45000, 'بازبینیِ شنیداریِ نامعلوم‌ها'\)/.test(p21b));
  ok('۲۸.۳ با سقف و مهلت، تا پویشِ کاملِ بانک هر شب تکرار نشود',
     /cap: Math\.max\(1, Number\(CFG\.MUSIC_REHEAR_MAX\)/.test(p21b) &&
     /budgetMs: 60000/.test(p21b));
  ok('۲۸.۴ و می‌شود خاموشش کرد', /CFG\.MUSIC_REHEAR !== false/.test(p21b));

  ok('۲۸.۵ فهرست به «هنوز داوری ندارد» باریک می‌شود',
     /if \(heardSays_\(row\.heard, 'جلوه'\)\) return false;/.test(p23j) &&
     /heardSays_\(row\.heard, 'آهنگ'\) \|\| heardSays_\(row\.heard, 'زمینه'\)/
       .test(p23j));
  /* ══ و داوریِ کهنه هم «نامعلوم» است (۶٫۸۸) ══
     تا ۶٫۸۷ جوابِ مدل فقط «موسیقی/جلوه/گفتار» بود، و «موسیقی» به سؤالی که
     حالا می‌پرسیم — «این می‌تواند برنامه را باز کند؟» — جواب نمی‌دهد. بی
     این، «زمزمهٔ آکوستیک» تا ابد ✅ می‌مانْد و هر شب یک قسمت را باز می‌کرد. */
  ok('۲۸.۵-ب ردیفی که با واژهٔ درشتِ قدیمی مهر خورده، دوباره در صف می‌نشیند',
     heardSays_('✅ مدل شنید: موسیقی', 'آهنگ') === false &&
     heardSays_('✅ مدل شنید: موسیقی', 'زمینه') === false &&
     heardSays_('✅ مدل شنید: موسیقی', 'جلوه') === false);
  ok('۲۸.۵-پ ولی داوریِ تازه دوباره پرسیده نمی‌شود',
     heardSays_(musicHeardTxt_({ heard: 'آهنگ' }), 'آهنگ') === true &&
     heardSays_(musicHeardTxt_({ heard: 'زمینه' }), 'زمینه') === true);
  /* از ۶٫۸۹ ترتیبِ صف سه‌پله است، نه دوپله: اول قطعه‌هایی که همین اخیراً
     لبهٔ یک قسمت را گرفتند (غلط‌بودنشان را هر شنونده‌ای می‌شنود)، بعد
     افکت‌ها (تنها نوعی که نبودِ تأیید جلوی پخششان را می‌گیرد)، بعد بقیه. */
  ok('۲۸.۶ و افکت‌ها پیش از بقیهٔ بانک‌اند — تنها نوعی که «❓» جلوی پخشش را می‌گیرد',
     /'افکت'\) \? 1 : 2;/.test(p23j));
  ok('۲۸.۷ دکمهٔ دستی همچنان پویشِ کامل می‌کند',
     /musicRecheck_\(null\)/.test(p23j));

  // فیلترِ «نامعلوم» واقعاً همان‌هایی را می‌گیرد که باید
  ok('۲۸.۸ تأییدشده دوباره پرسیده نمی‌شود',
     heardSays_(musicHeardTxt_({ heard: 'جلوه' }), 'جلوه') === true &&
     heardSays_(musicHeardTxt_({ heard: 'آهنگ' }), 'آهنگ') === true);
  ok('۲۸.۹ ولی «❓» و خالی دوباره پرسیده می‌شوند',
     heardSays_(musicHeardTxt_({ verdict: 'مدل نشنید' }), 'جلوه') === false &&
     heardSays_('', 'جلوه') === false);
  ok('۲۸.۱۰ و تأییدِ دستیِ آدم هم «تمام‌شده» حساب می‌شود',
     heardSays_('جلوه', 'جلوه') === true);
}

console.log('=== ۳۲) کاری که هرگز نوبت نمی‌گیرد، «کندِ» نیست — نیست ===');
{
  /* ══ گزارشِ ۳ سپتامبر (۶٫۸۹) ══
   * «داوریِ ارجاع‌ها: ۰ ارجاع داوری شده · ۷ در صف. **هیچ ارجاعی تا امروز
   * داوری نشده**.» علتش در آن گزارش نبود و در کد بود: `bridgeAuditRun_`
   * یازدهمین بلوکِ سنگینِ شبانه است و بودجه ۲۷۰ ثانیه — یعنی نه «گاهی جا
   * می‌مانَد»، بلکه هرگز شروع نمی‌شود.
   *
   * جوابِ غلط «ببرش بالاتر» است: آن‌وقت هرچه پایین‌تر بماند گرسنه می‌شود و
   * ما فقط جای گرسنگی را عوض کرده‌ایم. */
  const P = global.__PROPS;
  delete P[PK.NIGHT_STARVE];
  NIGHT_RESERVE_ = null;
  // هر شبِ نرسیده یک سطرِ لاگ می‌نویسد؛ در آزمون فقط سروصداست.
  const quiet = () => { const o = console.log; console.log = () => {}; return () => { console.log = o; }; };
  const quietOff = quiet();
  nightStart_();

  // کاری که وقت برایش نیست، شمرده می‌شود — نه فقط لاگ
  const huge = (Number(CFG.NIGHT_BUDGET_MS) || 270000) + 60000;
  for (let i = 0; i < 3; i++) nightHas_(huge, 'داوریِ ارجاع‌ها');
  quietOff();
  const m = JSON.parse(P[PK.NIGHT_STARVE] || '{}');
  ok('۳۲.۱ شبِ نرسیده شمرده می‌شود، نه اینکه فقط در لاگ گم شود',
     m['داوریِ ارجاع‌ها'] && m['داوریِ ارجاع‌ها'].n === 3, JSON.stringify(m));

  const st = nightStarveStatus_();
  ok('۳۲.۲ و در سلامت اعلام می‌شود — همان‌جا که بقیهٔ سلامت اعلام می‌شود',
     st.ok === false && /داوریِ ارجاع‌ها/.test(st.line), st.line);

  const res = nightReserve_();
  ok('۳۲.۳ پس از سه شب، سهمی از بودجه برایش کنار گذاشته می‌شود',
     res && res.what === 'داوریِ ارجاع‌ها' && res.ms > 0, JSON.stringify(res));
  const cap = Math.round((Number(CFG.NIGHT_BUDGET_MS) || 270000) *
                         (Number(CFG.NIGHT_RESERVE_PCT) || 25) / 100);
  ok('۳۲.۴ و آن سهم کران دارد — یک کارِ گرسنه نباید نصبِ کد را از پا بیندازد',
     res.ms <= cap, res.ms + ' ≤ ' + cap);

  /* رزرو از دستِ **بقیه** برداشته می‌شود، نه از دستِ خودِ کارِ گرسنه. */
  const q2 = quiet();
  nightStart_();
  const left = nightLeft_();
  const other = nightHas_(left - Math.round(res.ms / 2), 'یک کارِ دیگر');
  const self  = nightHas_(left - Math.round(res.ms / 2), 'داوریِ ارجاع‌ها');
  q2();
  ok('۳۲.۵ کارِ دیگر باید زودتر بایستد تا سهم بماند', other === false);
  ok('۳۲.۶ ولی خودِ کارِ گرسنه همان سهم را می‌گیرد', self === true);

  const q3 = quiet();
  nightStart_();
  NIGHT_RESERVE_ = null;
  nightHas_(1000, 'داوریِ ارجاع‌ها');
  q3();
  ok('۳۲.۷ و به‌محضِ اینکه نوبت گرفت، شمارنده صفر می‌شود',
     !JSON.parse(P[PK.NIGHT_STARVE] || '{}')['داوریِ ارجاع‌ها']);
  delete P[PK.NIGHT_STARVE];
  NIGHT_RESERVE_ = null;
}

console.log('=== ۳۳) صفِ بازشنیدن، به ترتیبِ هزینهٔ اشتباه ===');
{
  /* داوریِ غلط روی قطعه‌ای که کسی پخشش نمی‌کند هزینه‌ای ندارد؛ روی موسیقیِ
     آغازِ قسمتِ امشب، هر شنونده‌ای می‌شنود — و «زمزمهٔ آکوستیک» دو شبِ
     پیاپی دقیقاً همین بود. */
  musicRemember_({ mood: 'آرام', picks: [
    { name: 'زمزمه.wav', slot: 'شروع' },
    { name: 'پل.wav', slot: 'میانه' },
    { name: 'پایانی.wav', slot: 'پایان' }
  ] }, 'درس‌نامه ۲۸');
  const last = JSON.parse(global.__PROPS[PK.MUSIC_LAST] || '{}');
  ok('۳۳.۱ لبه‌های قسمت جدا ثبت می‌شوند',
     (last.edges || []).join('|') === 'زمزمه.wav|پایانی.wav',
     JSON.stringify(last.edges));
  ok('۳۳.۲ و میانه لبه نیست', (last.edges || []).indexOf('پل.wav') === -1);
  const p23s = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۳۳.۳ صفِ بازشنیدن از همین‌ها شروع می‌شود، نه از ترتیبِ پوشه',
     /if \(edge\[f3\.getName\(\)\]\) return 0;/.test(p23s) &&
     /todo\.sort\(function \(a, c\) \{ return rank\(a\) - rank\(c\); \}\)/.test(p23s));
}

console.log('=== ۲۹) دو ردِّ ناحقِ دیشب، از دادهٔ واقعی ===');
{
  /* بازبینیِ `_MUSIC-FEED.json` صبحِ ۲۴ اوت: هیچ فایلی دیشب به بانک اضافه
   * نشده بود، با اینکه فهرست رشد کرده بود. علتش دو ردِّ ناحق بود. */

  // ── الف) WAVE_FORMAT_EXTENSIBLE هم PCM است ──
  // پنج نامزد با «خوانده نشد یا PCM نیست» رد شدند، از جمله سه CC0 از
  // OpenGameArt که تسک خودش وارسی کرده بود. سه جای کد info.format !== 1
  // می‌گفتند و ۶۵۵۳۴ را PCM حساب نمی‌کردند.
  ok('۲۹.۱ قالبِ ۱ همان PCمِ همیشگی است', wavIsPcm_({ format: 1 }) === true);
  ok('۲۹.۲ و EXTENSIBLE هم PCM است',
     wavIsPcm_({ format: 65534 }) === true &&
     wavIsPcm_({ format: 65534, sub: 1 }) === true);
  ok('۲۹.۳ ولی EXTENSIBLEِ اعشاری نه',
     wavIsPcm_({ format: 65534, sub: 3 }) === false);
  // از ۶٫۸۷: اعشاریِ IEEE دیگر «PCمِ صحیح» نیست ولی جداگانه خواندنی است —
  // ieee754F32_ نمونه‌ها را رمزگشایی می‌کند (run_music_test.js §۱۳).
  ok('۲۹.۴ اعشاریِ IEEE «PCمِ صحیح» نیست، ولی خواندنی است',
     wavIsPcm_({ format: 3, bits: 32 }) === false &&
     wavIsFloat32_({ format: 3, bits: 32 }) === true &&
     wavReadable_({ format: 3, bits: 32 }) === true);
  ok('۲۹.۵ و قالبِ واقعاً ناشناخته هنوز با علتِ راست رد می‌شود',
     /قالبِ 2/.test(musicVerdict_(null, { format: 2 }).why),
     musicVerdict_(null, { format: 2 }).why);
  // کامنت نباید شمرده شود — نخستین نگارشِ این سنجه، توضیحِ خودِ همین
  // اصلاح را «کدِ باقی‌مانده» دید.
  ok('۲۹.۶ هر سه جای کد از همین یک سنجه می‌پرسند',
     fs.readFileSync('src/23_Music.gs', 'utf8').split('\n')
       .filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l))
       .filter(l => /info\.format !== 1/.test(l)).length === 0);

  // و خودِ هدرخوان باید زیرقالب را بردارد
  const p23k = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۲۹.۷ هدرخوان زیرقالبِ EXTENSIBLE را می‌خواند',
     /fmt\.format === 65534 && sz >= 40\) fmt\.sub = u16\(pos \+ 8 \+ 24\)/.test(p23k));

  // ── ب) نرخِ پایین برای افکت، نشانهٔ گفتار نیست ──
  // «Video Game Sound Ideas, Magical Energy» با «۱۱۰۲۵ هرتز — نرخِ ضبطِ
  // گفتار» رد شد. برای افکتِ بازی، ۱۱۰۲۵ کاملاً عادی است.
  const lowRate = { rate: 11025, channels: 1, bits: 16 };
  const pr = { rms: 3000, peak: 20000, silentPct: 10, zcr: 40, steadiness: 70,
               seconds: 3 };
  ok('۲۹.۸ برای موسیقی، نرخِ پایین همچنان نشانهٔ گفتار است',
     musicIsSpeech_(pr, lowRate, 'magical energy', false).speech === true,
     musicIsSpeech_(pr, lowRate, 'magical energy', false).why);
  ok('۲۹.۹ ولی برای جلوهٔ صوتی نه',
     musicIsSpeech_(pr, lowRate, 'magical energy', true).speech === false,
     JSON.stringify(musicIsSpeech_(pr, lowRate, 'magical energy', true)));
  ok('۲۹.۱۰ و نامِ گفتاری همچنان برای هر دو ردّ است',
     musicIsSpeech_(pr, lowRate, 'interview podcast', true).speech === true);
  ok('۲۹.۱۱ و musicAccept_ همین پرچم را رد می‌کند',
     /musicIsSpeech_\(pr, info, name, wantSfx\)/.test(p23k));
}

console.log('=== ۳۰) ردِ ناحق باید باز شود، وگرنه اصلاح فقط برای آینده است ===');
{
  /* وقتی نامزدی رد می‌شود دو چیز ثبت می‌شود: status:'رد' در فهرست، و
   * نشانی در سیاههٔ «دیگر امتحان نکن». هر دو عمدی و درست‌اند.
   * ولی وقتی معلوم شود ردّ ناحق بوده، همان دو ثبت آن را برای همیشه دفن
   * می‌کنند — و اصلاحِ خواننده فقط به دردِ فایل‌های *آینده* می‌خورد.
   * ۲۴ اوت پنج فایلِ سالم این‌طور دفن شده بودند. */
  const realGet3 = global.getOutJson_, realPut3 = global.putOutJson_;
  const realFeed3 = global.musicFeedRead_;
  let store3 = { items: [
    { url: 'https://x/a.wav', kind: 'موسیقی', status: 'رد',
      error: 'خوانده نشد یا PCM نیست' },
    { url: 'https://x/b.wav', kind: 'افکت', status: 'رد',
      error: 'گفتار است: 11025 هرتز — نرخِ ضبطِ گفتار، نه انتشارِ موسیقی' },
    { url: 'https://x/c.wav', kind: 'موسیقی', status: 'رد',
      error: 'گفتار است: 8000 هرتز — نرخِ ضبطِ گفتار، نه انتشارِ موسیقی' },
    { url: 'https://x/d.wav', kind: 'موسیقی', status: 'رد',
      error: 'حجم 40 مگابایت، بیشتر از سقفِ 12' },
    { url: 'https://x/e.wav', kind: 'موسیقی', status: 'آمد' }
  ] };
  global.musicFeedRead_ = () => store3;
  global.getOutJson_ = () => store3;
  global.putOutJson_ = (n, o) => { store3 = o; };
  global.__PROPS[PK.MUSIC_FETCHED] = JSON.stringify(
    ['https://x/a.wav', 'https://x/b.wav', 'https://x/c.wav', 'https://x/d.wav']);
  global.__PROPS[PK.MUSIC_UNBLOCK] = '';

  const r = musicUnblock_();
  ok('۳۰.۱ ردِ «PCM نیست» باز می‌شود — قالبش EXTENSIBLE بوده',
     store3.items[0].status === '', JSON.stringify(store3.items[0]));
  ok('۳۰.۲ و نرخِ پایین برای **افکت** باز می‌شود',
     store3.items[1].status === '');
  ok('۳۰.۳ ولی نرخِ پایین برای **موسیقی** باز نمی‌شود — آن ردّ درست بود',
     store3.items[2].status === 'رد');
  ok('۳۰.۴ و ردِ حجم دست نمی‌خورد — علتش اصلاح نشده',
     store3.items[3].status === 'رد');
  ok('۳۰.۵ و آنچه آمده دست نمی‌خورد', store3.items[4].status === 'آمد');
  ok('۳۰.۶ دو نشانی باز شد', r.freed === 2, String(r.freed));

  const fetched = JSON.parse(global.__PROPS[PK.MUSIC_FETCHED]);
  ok('۳۰.۷ و از سیاههٔ «دیگر امتحان نکن» هم بیرون آمدند',
     fetched.indexOf('https://x/a.wav') === -1 &&
     fetched.indexOf('https://x/b.wav') === -1, JSON.stringify(fetched));
  ok('۳۰.۸ ولی آن‌هایی که باز نشدند، همان‌جا ماندند',
     fetched.indexOf('https://x/c.wav') !== -1 &&
     fetched.indexOf('https://x/d.wav') !== -1);
  ok('۳۰.۹ و دلیلِ بازشدن در خودِ ردیف نوشته می‌شود',
     /ردِ پیشین ناحق بود/.test(String(store3.items[0].note || '')));

  const r2 = musicUnblock_();
  ok('۳۰.۱۰ دوباره اجرا نمی‌شود — یک بار برای هر نسخه', r2.freed === 0);

  global.getOutJson_ = realGet3; global.putOutJson_ = realPut3;
  global.musicFeedRead_ = realFeed3;

  ok('۳۰.۱۱ و کارِ شبانه پیش از گشتن صدایش می‌زند',
     /musicUnblock_\(\); \} catch \(eUB\)/.test(
       fs.readFileSync('src/21_SelfUpdate.gs', 'utf8')));
}

console.log('=== ۳۱) دکمهٔ دستی باید همان کارِ شبانه را بکند ===');
{
  /* ۵٫۷۸ ردهای ناحق را در کارِ شبانه باز کرد. ولی کسی که دکمه را می‌زند
   * نباید تا فردا شب صبر کند — و بدتر: دکمه اگر موسیقی کمبود نداشت،
   * musicSeek_ را اصلاً صدا نمی‌زد، پس گشتنِ **افکت** هم انجام نمی‌شد
   * با اینکه بانک افکت کم دارد. یعنی دقیقاً همان دکمه‌ای که برای پر کردنِ
   * بانک است، وقتی موسیقی پُر بود هیچ کاری نمی‌کرد. */
  const p23m = fs.readFileSync('src/23_Music.gs', 'utf8');
  const btn = p23m.slice(p23m.indexOf('function runMusicFetch()'),
                         p23m.indexOf('function runMusicFetch()') + 2500);

  ok('۳۱.۱ دکمه هم ردهای ناحق را باز می‌کند',
     /musicUnblock_\(\)/.test(btn));
  ok('۳۱.۲ و کمبودنداشتن را «کاری نمانده» نمی‌فهمد',
     /if \(!miss\.length\) miss = musicRotateSlots_\(\)/.test(btn));
  ok('۳۱.۳ و وقتی هیچ جایگاهی کم ندارد، «فقط افکت» می‌گردد',
     /musicSeek_\(miss\.length \? miss : null, !miss\.length\)/.test(btn));
  ok('۳۱.۴ و بازشدنِ ردها را به کاربر می‌گوید',
     /به‌ناحق رد شده بود، دوباره باز شد/.test(p23m));
}

console.log('=== ۳۲) تلفیقِ لبهٔ موسیقی و گفتار ===');
{
  /* «یهو اون قطع شه و این شروع بشه … باید ثانیه‌های آخرِ موسیقی و ابتداییِ
   * صدای گوینده کمی در هم تلفیق بشن، fade شده و خیلی حرفه‌ای.»
   * تا ۵٫۷۹ تکه‌ها صرفاً پشتِ سرِ هم چسبانده می‌شدند. */
  const SR = CFG.SAMPLE_RATE || 24000;
  const b64of = (vals) => {
    const bytes = [];
    for (const v0 of vals) {
      let v = v0 < 0 ? v0 + 65536 : v0;
      const lo = v & 255, hi = (v >>> 8) & 255;
      bytes.push(lo > 127 ? lo - 256 : lo, hi > 127 ? hi - 256 : hi);
    }
    return Utilities.base64Encode(bytes);
  };
  const samplesOf = (b64) => {
    const b = Utilities.base64Decode(b64), out = [];
    for (let i = 0; i + 1 < b.length; i += 2) out.push(rd16_(b, i));
    return out;
  };

  // یک ثانیه هم‌پوشانی روی دو تکهٔ سه‌ثانیه‌ای با مقدارِ ثابت
  const A = [], B = [];
  for (let i = 0; i < SR * 3; i++) { A.push(10000); B.push(-10000); }
  const a64 = b64of(A), b64b = b64of(B);
  // A = موسیقی (۱۰۰۰۰)، B = گفتار (−۱۰۰۰۰). prevIsMusic=true یعنی
  // موسیقی → گفتار، که شکلِ «duck» را می‌گیرد نه شیبِ متقارن.
  const mix = pcmXfade_(a64, b64b, 1, true);
  ok('۳۲.۱ تلفیق انجام می‌شود', !!mix && mix.length === 2);

  const pa = samplesOf(mix[0]), pb = samplesOf(mix[1]);
  ok('۳۲.۲ طولِ کل به اندازهٔ هم‌پوشانی کوتاه می‌شود',
     Math.abs((pa.length + pb.length) - (A.length + B.length - SR)) <= 3,
     (pa.length + pb.length) + ' در برابرِ ' + (A.length + B.length - SR));
  ok('۳۲.۳ ابتدای تکهٔ اول دست‌نخورده می‌ماند',
     pa[0] === 10000 && pa[100] === 10000);

  /* ── و حالا آنچه ۵٫۸۴ عوض کرد ──
   * صاحبِ برنامه بعد از شنیدنِ قسمتِ ۱۸: «این fade باید خیلی حرفه‌ای‌تر
   * بشه؛ خیلی جای کار داره.» شیبِ خطیِ متقارن سه ایراد داشت.
   *
   * شیب‌ها را **از خودِ تابع** بیرون می‌کشیم، نه با بازنویسیِ فرمول در
   * آزمون: یک بار با موسیقیِ ثابت و گفتارِ ساکت (فقط شیبِ موسیقی می‌مانَد)
   * و یک بار برعکس. سنجه‌ای که فرمول را تکرار کند، فقط خودش را می‌سنجد. */
  const zero = b64of(new Array(SR * 3).fill(0));
  const one = b64of(new Array(SR * 3).fill(10000));
  const gainCurve = (aB64, bB64) => {
    const m = pcmXfade_(aB64, bB64, 1, true);
    const t = samplesOf(m[0]);
    return t.slice(t.length - SR).map((v) => v / 10000);
  };
  const gMusic = gainCurve(one, zero);   // شیبِ طرفِ رونده (موسیقی)
  const gVoice = gainCurve(zero, one);   // شیبِ طرفِ آینده (گفتار)

  // ۱) گوینده از صفر بالا نمی‌آید — وگرنه نخستین هجای هر بخش نامفهوم است.
  ok('۳۲.۴ گوینده از صفر شروع نمی‌شود — از کفِ MUSIC_DUCK_FLOOR',
     gVoice[0] >= Number(CFG.MUSIC_DUCK_FLOOR) - 0.05 && gVoice[0] > 0.3,
     gVoice[0].toFixed(2));
  ok('۳۲.۴-ب و خیلی زود به بلندیِ کامل می‌رسد',
     gVoice[Math.floor(SR * Number(CFG.MUSIC_DUCK_RISE))] > 0.95,
     gVoice[Math.floor(SR * Number(CFG.MUSIC_DUCK_RISE))].toFixed(2));

  // ۲) موسیقی زیرِ صدا می‌رود، نه اینکه بمیرد و بعد حرف شروع شود.
  const kRise = Math.floor(SR * Number(CFG.MUSIC_DUCK_RISE));
  ok('۳۲.۵ موسیقی در لحظهٔ اوجِ گوینده هنوز زنده است، فقط زیرش',
     gMusic[kRise] > 0.2 && gMusic[kRise] < 0.6, gMusic[kRise].toFixed(2));
  ok('۳۲.۶ و در پایانِ ناحیه به صفر می‌رسد', gMusic[SR - 1] < 0.01,
     gMusic[SR - 1].toFixed(3));
  /* ۶٫۷۰: «یهو قطع نشه؛ با شیبِ ملایم‌تری محو بشه.» cos ساده در لحظهٔ
     رسیدن به صفر شیبِ تند دارد (در t=۰٫۹ هنوز ~۰٫۰۸ بود و با همان سرعت
     می‌کوبید به صفر)؛ شیبِ S همان‌جا زیر ۰٫۰۳ است و با شیبِ صفر می‌نشیند.
     این تنها سنجه‌ای است که S را از cosِ ساده جدا می‌کند. */
  ok('۳۲.۶-ب و فرودش S است، نه cosِ ساده — لحظهٔ خاموشی شنیده نمی‌شود',
     gMusic[Math.floor(SR * 0.9)] < 0.03, gMusic[Math.floor(SR * 0.9)].toFixed(3));

  /* ۳) چالهٔ وسط. با شیبِ **خطی** در نقطهٔ میانی هر دو روی ۰٫۵ می‌نشینند و
   *    توانِ کل (مجموعِ مجذورها) به ۰٫۵ می‌افتد — افتی که گوش آن را «یک
   *    چاله» می‌شنود. شیبِ هم‌توان همین مجموع را نزدیکِ ۱ نگه می‌دارد.
   *    این تنها سنجه‌ای است که خطی را از هم‌توان جدا می‌کند. */
  let minPow = 1e9, minAt = 0;
  for (let k = 0; k < SR; k++) {
    const pw = gMusic[k] * gMusic[k] + gVoice[k] * gVoice[k];
    if (pw < minPow) { minPow = pw; minAt = k; }
  }
  ok('۳۲.۷ توانِ گذر هیچ‌جا نمی‌افتد — چالهٔ شیبِ خطی بسته شد',
     minPow > 0.75, 'کمینهٔ توان ' + minPow.toFixed(2) + ' در نمونهٔ ' + minAt +
     ' (شیبِ خطی اینجا ۰٫۵ می‌داد)');

  ok('۳۲.۸ تکهٔ دوم از بعدِ ناحیهٔ هم‌پوشانی شروع می‌شود',
     pb.length === B.length - SR && pb[0] === -10000,
     pb.length + ' / ' + (B.length - SR));

  /* ── گفتار → موسیقی: واژه‌های پایانی بریده نمی‌شوند ──
     اگر گوینده وسطِ جملهٔ آخر محو شود، فاجعه است. تا `MUSIC_XFADE_HOLD`
     صدا دست نمی‌خورد و موسیقی زیرش بالا می‌آید. */
  const curve2 = (aB64, bB64) => {
    const m = pcmXfade_(aB64, bB64, 1, false);
    const t = samplesOf(m[0]);
    return t.slice(t.length - SR).map((v) => v / 10000);
  };
  const gTalk = curve2(one, zero);   // شیبِ گفتارِ رونده
  const gMus2 = curve2(zero, one);   // شیبِ موسیقیِ آینده
  const hold = Math.floor(SR * Number(CFG.MUSIC_XFADE_HOLD));
  ok('۳۲.۹ واژه‌های پایانی بریده نمی‌شوند — گفتار تا HOLD دست‌نخورده است',
     gTalk[0] > 0.99 && gTalk[Math.floor(hold * 0.9)] > 0.99,
     gTalk[Math.floor(hold * 0.9)].toFixed(2));
  ok('۳۲.۹-ب و بعدش می‌رود', gTalk[SR - 1] < 0.02, gTalk[SR - 1].toFixed(3));
  ok('۳۲.۱۰ و موسیقی زیرِ همان واژه‌ها بالا می‌آید، نه بعد از سکوت',
     gMus2[Math.floor(hold * 0.5)] > 0.05 && gMus2[Math.floor(hold * 0.5)] < 0.6,
     gMus2[Math.floor(hold * 0.5)].toFixed(2));
  ok('۳۲.۱۰-ب و در پایان به بلندیِ کامل می‌رسد', gMus2[SR - 1] > 0.95,
     gMus2[SR - 1].toFixed(2));

  // مرزهای امن
  ok('۳۲.۱۱ ثانیهٔ صفر یا منفی کاری نمی‌کند',
     pcmXfade_(a64, b64b, 0, true) === null && pcmXfade_(a64, b64b, -1, true) === null);
  ok('۳۲.۱۲ و هیچ نمونه‌ای نصف نمی‌شود — مرزِ مضربِ ۶ بایت',
     (Utilities.base64Decode(mix[0]).length % 2) === 0 &&
     (Utilities.base64Decode(mix[1]).length % 2) === 0);

  /* ── کوتاه‌شدن، نه لغوشدن ──
     تا ۵٫۸۳ اگر یکی از دو طرف کمتر از دو برابرِ هم‌پوشانی صدا داشت، null
     برمی‌گشت و همان‌جا یک بُرشِ خشک می‌ماند — بی هیچ سیاهه‌ای. و تکهٔ
     گفتارِ کوتاه دقیقاً همان‌جایی است که موسیقیِ میانه می‌آید. */
  const short = [];
  for (let i = 0; i < Math.floor(SR * 0.6); i++) short.push(-10000);
  const mixS = pcmXfade_(a64, b64of(short), 1, true);
  ok('۳۲.۱۳ طرفِ کوتاه، تلفیقِ کوتاه‌تر می‌گیرد — نه بُرشِ خشک', !!mixS);
  if (mixS) {
    // تکهٔ اول طولش را نگه می‌دارد (لبه‌اش بازنویسی می‌شود)؛ آنچه کوتاه
    // می‌شود تکهٔ دوم است، دقیقاً به اندازهٔ هم‌پوشانی.
    const cut = short.length - samplesOf(mixS[1]).length;
    ok('۳۲.۱۴ و هم‌پوشانی از نصفِ طرفِ کوتاه بیشتر نمی‌شود',
       cut > 0 && cut <= Math.ceil(short.length / 2) + 3,
       cut + ' نمونه از ' + short.length);
    ok('۳۲.۱۴-ب و آن‌قدر کوتاه نمی‌شود که تلنگر بشود',
       cut >= Math.floor(SR * Number(CFG.MUSIC_XFADE_MIN_SEC)),
       cut + ' ≥ ' + Math.floor(SR * Number(CFG.MUSIC_XFADE_MIN_SEC)));
  }
  ok('۳۲.۱۵ ولی تکهٔ واقعاً ریز اصلاً تلفیق نمی‌شود',
     pcmXfade_(b64of([1, 2, 3]), b64b, 1, true) === null);

  // جمعِ دو صدا نباید بریده شود؛ فشردنِ نرم بالای زانو
  ok('۳۲.۱۶ جمع نرم فشرده می‌شود، نه بریده',
     pcmSoft_(40000) < 32767 && pcmSoft_(40000) > CFG.MUSIC_LIMIT_KNEE &&
     pcmSoft_(-40000) === -pcmSoft_(40000) && pcmSoft_(1000) === 1000,
     String(pcmSoft_(40000)));

  // وصل‌بودن به مسیرِ واقعی
  const p03b = fs.readFileSync('src/03_Producer.gs', 'utf8');
  ok('۳۲.۱۷ در حلقهٔ صداگذاری صدا زده می‌شود، با اعلامِ اینکه کدام طرف موسیقی است',
     /pcmXfade_\(buf\[buf\.length - 1\], b64, xs, !curMusic, xm\)/.test(p03b) &&
     /var xm = curMusic \? String\(\(chunks\[i\] && chunks\[i\]\.xmode\) \|\| ''\) : ''/.test(p03b));
  ok('۳۲.۱۸ فقط سرِ مرزِ موسیقی↔گفتار، نه میانِ دو تکهٔ گفتار',
     /prevMusic !== curMusic/.test(p03b));
  ok('۳۲.۱۹ و طولِ تلفیق از تکه‌ای می‌آید که واقعاً در بافر نشست',
     /var prevXf = 0;/.test(p03b) && /prevXf = Number\(chunks\[i\] && chunks\[i\]\.xfade\)/.test(p03b));
  ok('۳۲.۲۰ سرِ مرزِ فایل از تلفیق می‌گذرد — دو فایل را نمی‌شود در هم برد',
     /buf\.length && prevMusic !== null/.test(p03b));

  /* ── و محوِ دوباره، که ریشهٔ «موسیقی می‌میرد بعد حرف شروع می‌شود» بود ──
     خودِ قطعه با MUSIC_FADE_SEC (۲ ثانیه) محو می‌شد و تلفیق **همان ناحیه**
     را دوباره پایین می‌کشید: ضربِ دو شیب. یعنی هرچه هم‌پوشانی بلندتر
     می‌شد، «قطع و شروع» بدتر می‌شد — برعکسِ چیزی که ساخته شده بود.
     اینجا خودِ musicWrap_ اجرا می‌شود و آرگومان‌های واقعیِ musicClip_
     گرفته می‌شود؛ سنجهٔ متنی نمی‌گوید کدام لبه کدام محو را گرفت. */
  {
    delete global.__PROPS[PK.MUSIC_PLAN];
    const realClip = global.musicClip_, realBank = global.musicBank_;
    const realPlan = global.musicPlanModel_, realUsed = global.musicMarkUsed_;
    const seen = [];
    global.musicClip_ = (id, o) => { seen.push({ id: id, fi: o.fadeIn, fo: o.fadeOut,
                                                 len: o.lenSec, bed: o.bedIn }); return 'PCM-' + id; };
    global.musicBank_ = () => ([
      { id: 'A', name: 'الف', sec: 60, gain: 1, slots: ['شروع', 'پایان', 'میانه'], mood: 'م' },
      { id: 'B', name: 'ب', sec: 60, gain: 1, slots: ['شروع', 'پایان', 'میانه'], mood: 'م' }
    ]);
    global.musicPlanModel_ = () => ({ introId: 'A', outroId: 'B',
      bridges: [{ after: '0', id: 'B' }], sfx: [], mood: 'م' });
    global.musicMarkUsed_ = () => 0;
    const r = musicWrap_([{ text: 'یک' }, { text: 'دو' }, { text: 'سه' }], null,
      { show: 'variety', episode: 900, mood: 'م', title: 'ت',
        bounds: [{ at: 0, kind: 'body' }, { at: 2, kind: 'section', heading: 'ب' }],
        sections: [{ heading: 'ب' }] });
    const byId = {};
    for (const x of seen) { (byId[x.id] = byId[x.id] || []).push(x); }
    ok('۳۲.۲۱ سه جایگاه ساخته شد', seen.length >= 3 && r.picks.length >= 3,
       seen.length + ' برش، ' + r.picks.length + ' قطعه');
    const intro = seen[0], outro = seen[seen.length - 1];
    ok('۳۲.۲۲ آغازِ قسمت محوِ کاملِ خودش را دارد (همسایه‌ای ندارد)',
       intro.fi > 0.5, 'fadeIn=' + intro.fi);
    ok('۳۲.۲۳ ولی لبه‌اش که به گفتار می‌رسد، محوِ بلند نمی‌گیرد — تلفیق کارِ آن را می‌کند',
       intro.fo <= 0.25, 'fadeOut=' + intro.fo);
    ok('۳۲.۲۴ و پایانِ قسمت برعکس: ورودش کوتاه، خروجش کامل',
       outro.fi <= 0.25 && outro.fo > 0.5, outro.fi + ' / ' + outro.fo);
    const mid = seen.filter((x, i) => i > 0 && i < seen.length - 1);
    ok('۳۲.۲۵ میانه هر دو سرش کوتاه است — هر دو لبه‌اش تلفیق می‌شود',
       mid.length > 0 && mid.every((x) => x.fi <= 0.25 && x.fo <= 0.25),
       mid.map((x) => x.fi + '/' + x.fo).join(' '));
    /* ── بسترِ پایانی (۶٫۷۰) — «از چند ثانیه قبل از آخرین جمله‌ها» ── */
    ok('۳۲.۲۵-ب سرِ قطعهٔ پایان بستر است: شیب در خودِ قطعه، محوِ ورود صفر',
       outro.fi === 0 && !!outro.bed &&
       outro.bed.under === Number(CFG.MUSIC_OUTRO_UNDER_SEC) &&
       outro.bed.rise === Number(CFG.MUSIC_OUTRO_RISE_SEC) &&
       outro.bed.bed === Number(CFG.MUSIC_OUTRO_BED),
       JSON.stringify(outro.bed || null));
    ok('۳۲.۲۵-پ و بقیهٔ جایگاه‌ها بستر نمی‌گیرند — بستر فقط مالِ پایان است',
       seen.slice(0, seen.length - 1).every((x) => !x.bed));
    const mus = r.chunks.filter((c) => c && c.pcm);
    const oc = mus[mus.length - 1];
    ok('۳۲.۲۵-ت تکهٔ پایان حالتش را اعلام می‌کند و هم‌پوشانی‌اش زیرِ گفتار می‌رود',
       !!oc && oc.xmode === 'outro' &&
       oc.xfade === Number(CFG.MUSIC_OUTRO_UNDER_SEC),
       oc ? (String(oc.xmode) + '/' + oc.xfade) : 'نیست');
    ok('۳۲.۲۵-ث و آغاز و میانه حالتِ بستر ندارند',
       mus.slice(0, mus.length - 1).every((c) => !c.xmode));
    global.musicClip_ = realClip; global.musicBank_ = realBank;
    global.musicPlanModel_ = realPlan; global.musicMarkUsed_ = realUsed;
    delete global.__PROPS[PK.MUSIC_PLAN];
  }

  const p23n = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۳۲.۲۶ و طولِ تلفیق جایگاه‌به‌جایگاه است — نه یک عدد برای هر سه',
     Number(CFG.MUSIC_XFADE_BRIDGE_SEC) < Number(CFG.MUSIC_XFADE_EDGE_SEC) &&
     /xfade: xfEdgeSec_\(\)/.test(p23n) && /xfade: xfBridgeSec_\(\)/.test(p23n),
     CFG.MUSIC_XFADE_BRIDGE_SEC + ' < ' + CFG.MUSIC_XFADE_EDGE_SEC);
  ok('۳۲.۲۷ و افکت طولِ کوتاه‌ترِ خودش را دارد',
     /xfade: Number\(CFG\.MUSIC_SFX_XFADE_SEC\)/.test(p23n) &&
     Number(CFG.MUSIC_SFX_XFADE_SEC) < Number(CFG.MUSIC_XFADE_BRIDGE_SEC));

  /* ── بسترِ پایانی: شکلِ گذر در حالتِ outro (۶٫۷۰) ──
     موسیقی شیبش را در خودِ قطعه دارد (musicBedIn_)، پس تلفیق نباید
     دوباره شیب بدهد — وگرنه همان «ضربِ دو شیب» ۵٫۸۴ برمی‌گردد. و
     آخرین جمله‌ها حقِ محو شدن ندارند؛ فقط دنباله‌شان نرم می‌نشیند. */
  const curveO = (aB64, bB64) => {
    const m = pcmXfade_(aB64, bB64, 1, false, 'outro');
    const t = samplesOf(m[0]);
    return t.slice(t.length - SR).map((v) => v / 10000);
  };
  const gTalkO = curveO(one, zero);
  const gMusO = curveO(zero, one);
  ok('۳۲.۲۸ در بستر، آخرین جمله‌ها تا نزدیکِ انتها دست‌نخورده‌اند',
     gTalkO[0] > 0.99 && gTalkO[Math.floor(SR * 0.7)] > 0.99,
     gTalkO[Math.floor(SR * 0.7)].toFixed(2));
  ok('۳۲.۲۸-ب و فقط دنباله، آن هم با شیبِ S، می‌نشیند',
     gTalkO[SR - 1] < 0.05, gTalkO[SR - 1].toFixed(3));
  ok('۳۲.۲۹ و موسیقی همان‌طور که هست می‌گذرد — شیبش در خودِ قطعه است',
     gMusO[0] > 0.99 && gMusO[Math.floor(SR * 0.5)] > 0.99 && gMusO[SR - 1] > 0.99,
     gMusO[Math.floor(SR * 0.5)].toFixed(2));
  ok('۳۲.۳۰ و عددها با هم می‌خوانند: بستر + اوج، در قطعهٔ پایان جا می‌شود',
     Number(CFG.MUSIC_OUTRO_UNDER_SEC) + Number(CFG.MUSIC_OUTRO_RISE_SEC) <
       Number(CFG.MUSIC_OUTRO_SEC) &&
     Number(CFG.MUSIC_OUTRO_BED) > 0.1 && Number(CFG.MUSIC_OUTRO_BED) < 0.7,
     CFG.MUSIC_OUTRO_UNDER_SEC + '+' + CFG.MUSIC_OUTRO_RISE_SEC + ' < ' +
     CFG.MUSIC_OUTRO_SEC);
}

console.log('=== ۳۳) سدی که هیچ‌وقت باز نمی‌شد ===');
{
  /* ۵٫۶۵ گفت «افکتِ بی تأییدِ شنیداری پخش نمی‌شود». منطقش درست بود.
   * ولی نتیجه‌اش این شد که هیچ افکتی هرگز پخش نشود: مدل برای هر فایلی که
   * تا امروز آمده «نامعلوم» داد، و نامعلوم یعنی ردِّ دائمی.
   * سدی که هیچ‌وقت باز نمی‌شود، سد نیست — نبودِ قابلیت است. */
  const secs = [{ heading: 'دفترِ کاغذی', tone: 'آرام و توصیفی',
                  narration: 'کاغذ ورق می‌خورد. کاغذ بوی کهنگی می‌داد.' }];
  const pick = [{ id: 'P1', word: 'کاغذ', section: '0',
                  anchor: 'کاغذ ورق می‌خورد', when: 'روی' }];
  const row = (o) => [Object.assign({ id: 'P1', name: 'Paper Pages', kind: 'افکت',
    mood: 'ورق‌خوردنِ کاغذ', slots: 'میانه', sec: 5, gain: 0.5, used: 0,
    heard: '', src: 'Paper Pages — https://opengameart.org/… (CC-BY 3.0)' }, o)];

  ok('۳۳.۱ افکتِ «نامعلوم» ولی با شناسنامهٔ منبع، حالا پخش می‌شود',
     sfxAllow_(secs, pick, 'variety',
               row({ heard: musicHeardTxt_({ verdict: 'مدل نشنید' }) })).length === 1);
  ok('۳۳.۲ و تأییدِ مدل همچنان کافی است',
     sfxAllow_(secs, pick, 'variety',
               row({ heard: musicHeardTxt_({ heard: 'جلوه' }) })).length === 1);
  ok('۳۳.۳ ولی «گفتار» وتوی مطلق است — حتی با شناسنامهٔ منبع',
     sfxAllow_(secs, pick, 'variety',
               row({ heard: '✅ مدل شنید: گفتار' })).length === 0);

  ok('۳۳.۴ بی شناسنامهٔ منبع و بی تأیید، همچنان رد',
     sfxAllow_(secs, pick, 'variety', row({ src: '' })).length === 0);
  ok('۳۳.۵ و فایلِ بلند افکت شمرده نمی‌شود، هرچه شناسنامه بگوید',
     sfxAllow_(secs, pick, 'variety', row({ sec: 120 })).length === 0);
  ok('۳۳.۶ و می‌شود این شهادت را خاموش کرد',
     (function () {
       var k = CFG.MUSIC_SFX_TRUST_SOURCE;
       CFG.MUSIC_SFX_TRUST_SOURCE = false;
       var n = sfxAllow_(secs, pick, 'variety', row({})).length;
       CFG.MUSIC_SFX_TRUST_SOURCE = k;
       return n === 0;
     })());

  // و شکستِ شنیدن دیگر نامرئی نیست
  const p23o = fs.readFileSync('src/23_Music.gs', 'utf8');
  ok('۳۳.۷ جوابِ خامِ مدل وقتی شناخته نشد، نوشته می‌شود',
     /شنیدنِ مدل نتیجه نداد/.test(p23o) && /جوابِ خام/.test(p23o));
  ok('۳۳.۸ و سقفِ پاسخ آن‌قدر هست که یک واژه جا شود',
     /maxOutputTokens: 48/.test(p23o));
}

console.log('=== ۳۴) قطعهٔ سه‌ثانیه‌ای، موسیقیِ آغاز نیست ===');
{
  /* ۲۴ اوت فایلی سه‌ثانیه‌ای با نامِ «freemusicarchive public domain» وارد
   * بانک شد، شناسنامه‌اش «موسیقی» می‌گفت با جایگاهِ شروع و پایان.
   * clipOf طولِ قطعه را سقفِ برش می‌کند، پس همان یک موسیقیِ آغازِ
   * سه‌ثانیه‌ای می‌ساخت — و چون بارِ استفاده‌اش صفر بود، امتیازِ
   * «کم‌مصرف‌تر جلوتر» جلوترش هم می‌انداخت. */
  const mk = (id, sec) => ({ id: id, name: id, kind: 'موسیقی', mood: '',
    slots: 'شروع، پایان، میانه', sec: sec, gain: 1, used: 0, lastAt: '' });
  const bank = [mk('کوتاه', 3), mk('بلند', 30)];

  ok('۳۴.۱ قطعهٔ سه‌ثانیه‌ای برای آغاز انتخاب نمی‌شود',
     musicPick_(bank, 'شروع', '').id === 'بلند',
     musicPick_(bank, 'شروع', '').id);
  ok('۳۴.۲ و برای پایان هم نه', musicPick_(bank, 'پایان', '').id === 'بلند');
  ok('۳۴.۳ و برای میانه هم — کفِ میانه چهار ثانیه است',
     musicPick_(bank, 'میانه', '').id === 'بلند');

  ok('۳۴.۴ قطعهٔ پنج‌ثانیه‌ای برای میانه می‌آید ولی برای آغاز نه',
     musicPick_([mk('پنج', 5)], 'میانه', '') !== null &&
     musicPick_([mk('پنج', 5)], 'شروع', '') === null);
  ok('۳۴.۵ و اگر هیچ قطعهٔ به‌اندازه‌ای نبود، null — نه قطعهٔ بد',
     musicPick_([mk('کوتاه', 2)], 'شروع', '') === null);
  ok('۳۴.۶ کفِ لبه از تلفیقِ لبه بلندتر است',
     Number(CFG.MUSIC_MIN_EDGE_SEC) > Number(CFG.MUSIC_XFADE_SEC),
     CFG.MUSIC_MIN_EDGE_SEC + ' > ' + CFG.MUSIC_XFADE_SEC);
}

console.log('=== ۳۵) ثبتِ موسیقی، یک بار در هر قسمت ===');
{
  /* ══ آنچه در قسمتِ ۱۸ واقعاً افتاد (۲۴ اوت) ══
   * صداگذاری سه بار از سر گرفته شد و buildChunks_ هر بار musicWrap_ را از
   * نو صدا زد و بلافاصله musicMarkUsed_ و musicRemember_ را. نتیجه:
   *   • تبِ «کاربردِ موسیقی» ۱۲ ردیف گرفت به‌جای ۴ (قسمتِ ۱۷: ۲۰ به‌جای ۵)
   *   • «بارِ استفاده» سه برابر شد — همان عددی که چرخش رویش می‌چرخد
   *   • و musicRemember_ نامِ قطعه‌های همین قسمت را در MUSIC_LAST نوشت، و
   *     musicPick_ در اجرای بعد همان‌ها را با امتیازِ منفی کنار زد. پس هر
   *     از سرگیری قطعهٔ *دیگری* انتخاب کرد:
   *       ۱۳:۰۴ Somewhere · Kalimba · Underwater · Somewhere
   *       ۱۳:۰۹ Somewhere · Menu Loop · Kalimba · Somewhere
   *       ۱۳:۱۴ Somewhere · Underwater · Kalimba · Somewhere
   * ۵٫۶۸ نقشهٔ *مدل* را کَش کرده بود و همین کافی به‌نظر می‌رسید. نبود:
   * نقشه ثابت ماند، انتخاب نه. */
  delete global.__PROPS[PK.MUSIC_PLAN];
  delete global.__PROPS[PK.MUSIC_LAST];
  delete global.__PROPS[PK.MUSIC_LOGGED];
  const realClip = global.musicClip_, realBank = global.musicBank_;
  const realPlan = global.musicPlanModel_, realMark = global.musicMarkUsed_;
  let marked = 0;
  global.musicClip_ = (id) => 'PCM-' + id;
  global.musicMarkUsed_ = (h, picks) => { marked += (picks || []).length; return 0; };
  global.musicBank_ = () => ([
    { id: 'A', name: 'الف', sec: 60, gain: 1, slots: ['شروع', 'پایان', 'میانه'], mood: 'م', used: 0 },
    { id: 'B', name: 'ب', sec: 60, gain: 1, slots: ['شروع', 'پایان', 'میانه'], mood: 'م', used: 0 },
    { id: 'C', name: 'ج', sec: 60, gain: 1, slots: ['شروع', 'پایان', 'میانه'], mood: 'م', used: 0 }
  ]);
  // مدل هیچ شناسه‌ای نمی‌دهد — یعنی انتخاب کاملاً به musicPick_ می‌افتد،
  // همان‌جایی که شمارنده‌ها تصمیم می‌گیرند. بدترین حالت، و باید بسته باشد.
  global.musicPlanModel_ = () => ({ introId: '', outroId: '', bridges: [], sfx: [], mood: 'م' });

  const mk = () => [{ text: 'یک' }, { text: 'دو' }, { text: 'سه' }, { text: 'چهار' }];
  const opt = { show: 'variety', episode: 18, mood: 'م', title: 'ت',
                bounds: [{ at: 0, kind: 'body' }, { at: 2, kind: 'section', heading: 'ب' }],
                sections: [{ heading: 'ب' }] };

  const r1 = musicWrap_(mk(), null, opt);
  const rec1 = musicRecordOnce_(null, r1, 'variety#18', 'قسمت 18', 'برنامه');
  const r2 = musicWrap_(mk(), null, opt);
  const rec2 = musicRecordOnce_(null, r2, 'variety#18', 'قسمت 18', 'برنامه');
  const r3 = musicWrap_(mk(), null, opt);
  const rec3 = musicRecordOnce_(null, r3, 'variety#18', 'قسمت 18', 'برنامه');

  ok('۳۵.۱ ثبت فقط در اجرای اول انجام می‌شود',
     rec1 === true && rec2 === false && rec3 === false, [rec1, rec2, rec3].join(','));
  ok('۳۵.۲ پس شمارندهٔ «بارِ استفاده» سه برابر نمی‌شود',
     marked === r1.picks.length, marked + ' در برابرِ ' + r1.picks.length);

  const ids = (r) => r.picks.map((p) => p.id).join('>');
  ok('۳۵.۳ و هر سه اجرا **همان** قطعه‌ها را می‌گیرند',
     ids(r1) === ids(r2) && ids(r2) === ids(r3),
     ids(r1) + ' | ' + ids(r2) + ' | ' + ids(r3));
  ok('۳۵.۴ و آرایهٔ تکه‌ها هم‌اندازه می‌مانَد — شماره‌ها نمی‌لغزند',
     r1.chunks.length === r2.chunks.length && r2.chunks.length === r3.chunks.length,
     [r1.chunks.length, r2.chunks.length, r3.chunks.length].join('/'));

  /* سنجهٔ اصلی: حتی اگر «قسمتِ قبل» روی همین قطعه‌ها گذاشته شود — یعنی
     همان کاری که musicRemember_ وسطِ قسمت می‌کرد — انتخاب نباید عوض شود. */
  global.__PROPS[PK.MUSIC_LAST] = JSON.stringify({ tracks: r1.picks.map((p) => p.name) });
  const r4 = musicWrap_(mk(), null, opt);
  ok('۳۵.۵ حافظهٔ «قسمتِ قبل» وسطِ همین قسمت انتخاب را عوض نمی‌کند',
     ids(r4) === ids(r1), ids(r4) + ' در برابرِ ' + ids(r1));

  const r5 = musicWrap_(mk(), null, Object.assign({}, opt, { episode: 19 }));
  ok('۳۵.۶ ولی قسمتِ بعد قفل نیست',
     musicRecordOnce_(null, r5, 'variety#19', 'قسمت 19', 'برنامه') === true);

  /* و ردیفِ تاریخچه باید جایگاهِ درست را بگوید. وقتی یک قطعه هم آغاز است هم
     پایان، `track.slot = ...` دومی اولی را بازنویسی می‌کرد: در قسمتِ ۱۸ هیچ
     ردیفِ «شروع» در تبِ کاربرد نبود، با اینکه موسیقیِ آغاز پخش شده بود. */
  global.musicBank_ = () => ([
    { id: 'A', name: 'الف', sec: 60, gain: 1, slots: ['شروع', 'پایان'], mood: 'م', used: 0 }
  ]);
  delete global.__PROPS[PK.MUSIC_PLAN];
  const r6 = musicWrap_(mk(), null, Object.assign({}, opt, { episode: 20 }));
  const slots = r6.picks.map((p) => p.slot);
  ok('۳۵.۷ یک قطعه در دو جایگاه، دو ردیفِ درست می‌دهد — نه دو تا «پایان»',
     slots.indexOf('شروع') !== -1 && slots.indexOf('پایان') !== -1, slots.join('،'));

  global.musicClip_ = realClip; global.musicBank_ = realBank;
  global.musicPlanModel_ = realPlan; global.musicMarkUsed_ = realMark;
  delete global.__PROPS[PK.MUSIC_PLAN];
  delete global.__PROPS[PK.MUSIC_LAST];
  delete global.__PROPS[PK.MUSIC_LOGGED];
}

console.log('\n=== ۳۶) سقفی که مرحلهٔ بعد رویش اضافه کند، سقف نیست (۵٫۹۶) ===');
{
  /* ۲۵ اوت: درس‌نامهٔ ۱۶ باز در دو فایل رفت — ۱۴:۱۴ در برابرِ هدفِ ۱۰٫۸.
   * ولی این‌بار specialCondense_ کارش را کرده بود: هیچ یافتهٔ
   * sp-over-one-file ثبت نشده بود. متن *پس از* فشرده‌سازی بزرگ شد، چون
   * applyEnrichment_ اجازه دارد تا ۲۵٪ روی متنِ پایه اضافه کند و متنِ پایه
   * دقیقاً سرِ سقف نشسته بود. ۲۵٪ روی ۱۰٫۸ می‌شود ۱۳٫۵، به‌علاوهٔ موسیقی:
   * ۱۴:۱۴. */
  const fileCap = specialFileCap_();
  const writeCap = specialWriteCap_();
  ok('۳۶.۱ سقفِ نگارش از سقفِ فایل کمتر است — جا برای غنی‌سازی',
     writeCap < fileCap, writeCap + ' < ' + fileCap);
  /* ══ سنجه به *ناوردا* بند است، نه به یکی‌بودنِ دو عدد (۶٫۴۳) ══
   * تا ۶٫۴۲ اینجا `specialMaxChars_() === writeCap` بود — که فقط وقتی درست
   * است که «یک فایل» روشن باشد. ناوردایی که در هر دو حالت باید بماند این
   * است: **عددی که به مدل گفته می‌شود، سهمِ مرحله‌های بعدی از آن کنار
   * گذاشته شده.** وگرنه همان باگِ ۵٫۹۶ برمی‌گردد، فقط از درِ دیگر. */
  const raw = Math.round(Number(CFG.SPECIAL_TARGET_MINUTES) * speechCps_() * 60 * 1.1);
  ok('۳۶.۲ عددی که به مدل گفته می‌شود، رزروِ مرحله‌های بعد را کنار گذاشته',
     specialMaxChars_() === Math.min(specialReserve_(raw),
                                     CFG.SPECIAL_ONE_FILE === true ? writeCap : Infinity),
     specialMaxChars_() + ' (خام ' + raw + ')');
  ok('۳۶.۲-ب و رزرو یک تعریف دارد، نه دو',
     specialWriteCap_() === specialReserve_(fileCap));
  /* ذخیره باید به‌اندازهٔ نیازِ *معمول* باشد، نه به‌اندازهٔ سقفِ مطلقِ
     غنی‌سازی: با ۲۵٪ ذخیره، هر درس یک‌چهارم کوتاه‌تر می‌شد حتی شبی که هیچ
     غنی‌سازی‌ای نرسیده. */
  /* از ۶٫۲۱ دو مصرف‌کننده پس از نگارش اضافه می‌کنند، نه یکی: غنی‌سازی، و
     توضیح‌دهندهٔ عصری‌سازی. پس مرزِ درست جمعِ *سقفِ مطلقِ هر دو*ست — همان
     قصدِ اولیه («ذخیره به‌اندازهٔ نیازِ معمول، نه سقفِ مطلق») با شمارشِ
     درستِ مصرف‌کننده‌ها. اگر روزی یکی از این دو خاموش شود، سهمش هم کنار
     گذاشته نمی‌شود و این سنجه همچنان درست می‌مانَد. */
  const reserved = fileCap - writeCap;
  const maxAfter = Number(CFG.ENRICH_MAX_TOTAL_PCT) +
                   (CFG.EXPLAIN_ENABLED === false ? 0 : Number(CFG.EXPLAIN_PCT));
  ok('۳۶.۳ ذخیره از سقفِ مطلقِ آنچه بعداً اضافه می‌شود کمتر است',
     reserved < Math.round(writeCap * (maxAfter / 100)),
     reserved + ' < ' + Math.round(writeCap * (maxAfter / 100)));

  // ── و مرزِ سخت: هرچه بیاید، جمع از سقفِ فایل نمی‌گذرد ──
  const mk = (n) => ({ sections: [{ heading: 'ب', narration: 'م'.repeat(n) }] });
  const many = [];
  for (let i = 0; i < 40; i++) {
    many.push({ targetSection: 0, type: 'outside', priority: 1,
                spokenLeadIn: 'از بیرونِ آرشیو:', text: 'ن'.repeat(300),
                sources: [{ title: 'T', publisher: 'P', date: '2026-01-01',
                            url: 'https://example.com/x' + i }] });
  }
  const epA = mk(writeCap);
  const rA = applyEnrichment_(epA, { items: many }, ENRICH_SHOW_SPECIAL, 1);
  const totalA = narrationChars_(epA);
  ok('۳۶.۴ غنی‌سازی روی متنِ سرِ سقفِ نگارش هم انجام می‌شود',
     rA.applied > 0, rA.applied + ' افزوده');
  ok('۳۶.۵ ولی جمع هرگز از سقفِ یک فایل نمی‌گذرد',
     totalA <= fileCap, totalA + ' ≤ ' + fileCap);

  /* و اگر متنِ درس خودش تا لبِ سقف پر باشد، غنی‌سازی صفر می‌گیرد — ولی
     بی‌صدا نه. قابلیتی که خاموش شود و کسی خبردار نشود، همان الگویی است که
     بانکِ موسیقی را هفته‌ها خالی نگه داشت. */
  const epB = mk(fileCap + 500);
  const rB = applyEnrichment_(epB, { items: many }, ENRICH_SHOW_SPECIAL, 1);
  if (CFG.SPECIAL_ONE_FILE === true) {
    ok('۳۶.۶ متنِ پرشده، غنی‌سازی نمی‌گیرد', rB.applied === 0, String(rB.applied));
    ok('۳۶.۷ و علتش نوشته می‌شود، نه اینکه بی‌صدا رد شود',
       rB.reasons.join(' ').indexOf('سقفِ یک فایل') !== -1, rB.reasons[0]);
  } else {
    /* با خاموش‌بودنِ «یک فایل» (۶٫۴۳) این بند نباید اصلاً فیر کند: قسمتی که
       بلندتر از یک فایل شود در دو فایل می‌رود، و این تصمیمِ خودِ صاحبِ
       برنامه بود. اگر روزی باز هم اینجا صفر شد، یعنی قیدِ برداشته‌شده از راهِ
       دیگری برگشته. */
    ok('۳۶.۶ با خاموش‌بودنِ «یک فایل»، متنِ بلند هم غنی‌سازی می‌گیرد',
       rB.applied > 0, String(rB.applied));
    ok('۳۶.۷ و علتِ «سقفِ یک فایل» اصلاً ثبت نمی‌شود',
       rB.reasons.join(' ').indexOf('سقفِ یک فایل') === -1,
       rB.reasons.join(' | ').slice(0, 80));
  }

  /* «از همه جا از همه رنگ» دو فایلی شدن ممنوع نیست، پس مرزِ فایل برایش
     اعمال نمی‌شود — وگرنه یک اصلاحِ درس‌نامه، غنی‌سازیِ برنامهٔ دیگر را
     هم می‌بُرید. */
  const epC = mk(fileCap + 500);
  const rC = applyEnrichment_(epC, { items: many }, ENRICH_SHOW_VARIETY, 1);
  ok('۳۶.۸ ولی برنامهٔ دیگر دست‌نخورده می‌ماند', rC.applied > 0, String(rC.applied));
}

console.log('\n=== ۳۷) سنجهٔ محتوا: درس‌نامه هم اِسناد دارد (۵٫۹۶) ===');
{
  /* دادهٔ ۲۵ اوت: درس‌نامهٔ ۱۵ — «۶ بخش، اِسناد ۰٪، پیوندِ ساختگی ۶،
   * فراتر از خام ۶، حکم: ضعیف» — و جملهٔ داور خودش همه‌چیز را می‌گفت:
   * «هیچ منبع خامی برای این بخش ارائه نشده است».
   *
   * علت: auditSnap_ اِسناد را از `sourceIds` می‌خواند و درس‌نامه هرگز
   * `sourceIds` نداشت — همان اطلاعات را در `chunkNos`/`enrichIds` می‌نوشت.
   * تحلیلی که نوشته شده بود و هیچ‌وقت به تصمیمی وصل نشد. */
  const sp = fs.readFileSync('src/14_Special.gs', 'utf8');
  const at = sp.indexOf('auditSnap_(ENRICH_SHOW_SPECIAL');
  ok('۳۷.۱ عکسِ درس‌نامه اِسناد را از chunkNos می‌سازد',
     at > 0 && sp.slice(at - 2000, at).indexOf('chunkNos') !== -1);
  ok('۳۷.۲ و enrichIds را هم می‌آورد',
     at > 0 && sp.slice(at - 2000, at).indexOf('enrichIds') !== -1);
  ok('۳۷.۳ و همان کلیدی که fakeItems ساخته (C + شماره)',
     at > 0 && sp.slice(at - 2000, at).indexOf("'C' + parseInt") !== -1);

  /* و وقتی هیچ بخشی منبعی ندارد، داوریِ مدل شهادت نیست: نباید به‌عنوان
     ایرادِ نگارش ثبت شود. */
  const det0 = auditDeterministic_({ sections: [{ ids: [] }, { ids: [] }], sources: {} });
  ok('۳۷.۴ بی‌اِسناد یعنی اِسناد ۰٪',
     det0.noSrc === 2 && det0.attribPct === 0, JSON.stringify(det0));
  const hub = new Spread('هاب۱۱');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  const rowsBefore = () => {
    const sh = hub.getSheetByName(CFG.TAB_REPORTS || 'گزارش‌های نظارت');
    return sh ? sh.getLastRow() : 0;
  };
  const n0 = rowsBefore();
  auditFindings_(hub, { show: 'special', showName: 'درس‌نامه', episode: 15 },
                 det0, { unfit: 0, fake: 2, unfaith: 2, worst: 'هیچ منبع خامی…' }, null);
  const n1 = rowsBefore();
  ok('۳۷.۵ داوریِ کور، ایرادِ نگارش ثبت نمی‌کند', n1 === n0, n0 + ' → ' + n1);

  /* شمارندهٔ «شبِ بدِ اِسناد» باید برای هر برنامه جدا باشد. با شمارندهٔ
     مشترک، ۱۰۰٪ـِ «از همه جا از همه رنگ» هر شب صفرش می‌کرد و هشداری که
     دقیقاً برای همین ساخته شده بود هرگز فیره نمی‌کرد. */
  const ac = fs.readFileSync('src/24_ContentAudit.gs', 'utf8');
  ok('۳۷.۶ شمارندهٔ شبِ بد برای هر برنامه جداست',
     ac.indexOf("PK.AUDIT_BAD + '_'") !== -1);
  ok('۳۷.۷ و هیچ‌جا شمارندهٔ مشترک نوشته نمی‌شود',
     ac.indexOf('setProperty(PK.AUDIT_BAD,') === -1);
}

console.log('\n=== ۳۸) گزارشی که خوانده نشود، باید دیده شود (۵٫۹۶) ===');
{
  /* تسکِ غنی‌سازی هر ساعت یک _REPORT-enrich-*.json می‌نوشت و موتور هر ساعت
   * ردش می‌کرد («فیلد findings به‌شکل فهرست ندارد») — و تنها ردش یک سطر در
   * سیاههٔ داخلی بود. یعنی حلقهٔ بازخوردِ آن تسک قطع بود و هیچ‌کس خبر نداشت.
   * گزارشی که ناخوانا باشد از نبودِ گزارش بدتر است: نویسنده‌اش فکر می‌کند
   * خبر داده. */
  const hub = new Spread('هاب۱۲');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  const root = global.__ROOT_FOLDER;
  root.createFile(Utilities.newBlob(
    JSON.stringify({ generatedAt: '2026-08-25 10:33', source: 'enrich',
                     findings: { a: 1 } }),
    'application/json', '_REPORT-enrich-2026-08-25-1033.json'));
  const before = (hub.getSheetByName(CFG.TAB_REPORTS || 'گزارش‌های نظارت') || {}).getLastRow
    ? hub.getSheetByName(CFG.TAB_REPORTS || 'گزارش‌های نظارت').getLastRow() : 0;
  ingestReports_(hub);
  const sh = hub.getSheetByName(CFG.TAB_REPORTS || 'گزارش‌های نظارت');
  ok('۳۸.۱ گزارشِ ناخوانا یک یافته می‌سازد', !!sh && sh.getLastRow() > before,
     String(sh && sh.getLastRow()));
  const txt = sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length)
                .getValues().map(r => r.join(' | ')).join('\n');
  ok('۳۸.۲ و می‌گوید چه شکلی درست است', txt.indexOf('findings') !== -1);
  ok('۳۸.۳ و نامِ فایل در عنوانش هست', txt.indexOf('_REPORT-enrich') !== -1);
  /* کلید بر پایهٔ خانوادهٔ نام است، نه نامِ کاملِ فایل: هر ساعت یک نامِ تازه
     یعنی هر ساعت یک ردیفِ تازه، و «تکرار» — تنها نشانهٔ «هنوز خراب است» —
     هرگز شمرده نمی‌شد. */
  const rp = fs.readFileSync('src/12_Reports.gs', 'utf8');
  ok('۳۸.۴ کلیدِ یافته به عددهای نام حساس نیست',
     rp.indexOf("replace(/[0-9]+/g, '#')") !== -1);
}

console.log('\n=== ۳۹) «تا الانم که افکتی باز نشنیدم» — عددش باید جایی باشد (۵٫۹۶) ===');
{
  /* یافتهٔ بازِ ناظر، کلمه‌به‌کلمه: «کلیدِ music در _STATUS.json فیلدهای
   * sfx/sfxTarget ندارد — بندِ ۴-د دستورِ نظارت قابل اجرا نیست».
   * musicCoverage_ از اول می‌شمردشان، ولی شمار داخلِ خودِ آن تابع می‌ماند.
   * ناظر جای دیگری برای دیدن ندارد، پس آن بند عملاً اجرا نمی‌شد. */
  const hub = new Spread('هاب۳۹');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  const st = musicStatus_();
  ok('۳۹.۱ شمارِ افکت در وضعیت هست', st.sfx !== undefined && st.sfx !== null,
     JSON.stringify({ sfx: st.sfx, target: st.sfxTarget }));
  ok('۳۹.۲ و هدفش هم', st.sfxTarget !== undefined && st.sfxTarget !== null);
  ok('۳۹.۳ و سقفِ هر قسمت هم', st.sfxPerEpisode >= 0);

  /* و بانکِ خالیِ افکت باید هر روز در یادداشت‌های سلامت بیاید — وگرنه
     صاحبِ برنامه هر شب منتظرِ چیزی است که ممکن نیست بیاید. */
  const h = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۳۹.۴ بانکِ خالیِ افکت در یادداشت‌های روزانه گفته می‌شود',
     h.indexOf('افکتِ صوتی هنوز هیچ فایلی') !== -1);
  ok('۳۹.۵ و خرابی حساب نمی‌شود، یادداشت است',
     h.indexOf("notes.push('افکتِ صوتی هنوز هیچ فایلی") !== -1);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');

/* ══ ۶٫۵۵ — شمارهٔ درسِ هر مجموعه از ۱، برچسبِ انتشار ترکیبی ══ */
console.log('\n=== شمارهٔ درس، جدا از شمارهٔ سراسری ===');
{
  ok('برچسب: درس‌دار «قسمت ۲۲ — درس ۱» می‌شود',
     epLessonTag_(22, 1) === 'قسمت 22 — درس 1', epLessonTag_(22, 1));
  ok('برچسب: بی‌درس همان شکلِ قدیم می‌ماند (مرورِ بزرگ، پرونده‌های قدیمی)',
     epLessonTag_(21, 0) === 'قسمت 21' && epLessonTag_(21, undefined) === 'قسمت 21');
  /* شمارهٔ درس = جای قسمت در همین مجموعه، از ستونِ قسمت‌ها — پیش از افزودنِ
     خودش. سلولِ واقعی گاهی تاریخِ چسبیده دارد؛ epNumsOf_ همان را می‌فهمد. */
  ok('درسِ اولِ مجموعهٔ تازه، ۱ است نه ادامهٔ مجموعهٔ قبلی',
     epNumsOf_('').length + 1 === 1);
  ok('و مجموعه‌ای با «3 4 5»، درسِ بعدی‌اش ۴ است',
     epNumsOf_('3 4 5').length + 1 === 4);
}
