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

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
