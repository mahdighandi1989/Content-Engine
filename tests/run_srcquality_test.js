/* نظارتِ کیفیِ استخراج (بخشِ ۲۸).
 *
 * سنجه‌ها عمداً توابع را می‌دوانند، نه متنِ کد را می‌خوانند: خواستهٔ این بخش
 * «قضاوت» است و قضاوتی که فقط در متنِ کد دیده شود، اجرا نشده است.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
  '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs',
  '10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs',
  '15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs',
  '21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs',
  '26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs'];
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync(DIR + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

global.__PROPS['GEMINI_API_KEY'] = 'TEST';

console.log('=== ۱) مدل و پرامپت از کدِ زندهٔ تحلیلگر خوانده می‌شوند ===');
{
  /* پرسشی که این بخش را ساخت: «مگر خودِ موتور کدِ اسکریپت‌های منبع را
     نمی‌بیند؟» می‌بیند — auditSourceScripts هر شب کلِ کدِ زنده را می‌گیرد.
     پس نامِ مدل و متنِ پرامپت همان‌جا در دسترس‌اند. */
  const js = 'var M = "gemini-1.5-flash";\n' +
             'var P = "تو تحلیلگرِ محتوا هستی. متنِ ورودی را بخوان و نکاتِ کلیدی، ' +
             'خلاصه و موضوعِ اصلی را استخراج کن. خروجی را به‌صورت JSON بده و از ' +
             'حدس‌زدن پرهیز کن؛ فقط آنچه در متن هست.";\n' +
             'function go(){ return M + P; }';
  ok('۱.۱ شناسهٔ مدل از کد بیرون کشیده می‌شود',
     sqModelsIn_(js)[0] === 'gemini-1.5-flash', JSON.stringify(sqModelsIn_(js)));
  const pr = sqPromptsIn_(js);
  ok('۱.۲ و متنِ پرامپت هم', pr.length === 1 && pr[0].indexOf('تحلیلگرِ محتوا') !== -1);
  /* نشانی و base64 پرامپت نیستند و نباید به داور داده شوند. */
  ok('۱.۳ ولی نشانی و دادهٔ دودویی پرامپت شمرده نمی‌شوند',
     sqPromptsIn_('var u="https://example.com/' + 'a'.repeat(200) + '";').length === 0);
}

console.log('=== ۲) حکمِ مدل: مرده، کهنه، تازه ===');
{
  global.__PROPS[PK.MODELS] = JSON.stringify({
    text: 'gemini-3.0-pro', tts: 'x', at: new Date().getTime(),
    textAll: ['gemini-3.0-pro', 'gemini-2.5-flash'], ttsAll: ['x'] });

  const dead = sqModelCheck_('var m="gemini-1.0-nano";');
  ok('۲.۱ مدلی که در فهرستِ حساب نیست «مرده» است', dead.verdict === 'مرده', dead.verdict);
  ok('۲.۲ و علتش می‌گوید فراخوان‌ها رد می‌شوند',
     dead.why.indexOf('رد می‌شود') !== -1, dead.why);

  const old = sqModelCheck_('var m="gemini-2.5-flash";');
  ok('۲.۳ مدلِ سالم ولی پایین‌تر «کهنه» است', old.verdict === 'کهنه', old.verdict);
  ok('۲.۴ و جایگزینِ پیشنهادی را نام می‌برد', old.why.indexOf('gemini-3.0-pro') !== -1);

  const fresh = sqModelCheck_('var m="gemini-3.0-pro";');
  ok('۲.۵ بالاترین مدل «تازه» است و ایرادی نمی‌سازد', fresh.verdict === 'تازه');

  /* بی فهرست، حکم نمی‌دهد — نه اینکه «مرده» بگوید. */
  delete global.__PROPS[PK.MODELS];
  const stub = global.__STUB;
  global.__STUB = () => ({ code: 500, json: {} });
  /* فهرستی که از پیش‌فرض آمده «آنچه هست» نیست، «آنچه حدس زده‌ایم» است —
     و داوری در برابرِ حدس، داوری نیست. این را خودِ همین سنجه بیرون کشید. */
  const r26 = sqModelCheck_('var m="gemini-2.5-flash";');
  ok('۲.۶ بی فهرستِ واقعی، حکمی صادر نمی‌شود', r26.verdict === 'نامعلوم', r26.verdict);
  ok('۲.۷ و صریح می‌گوید چرا', r26.why.indexOf('پیش‌فرض') !== -1, r26.why);
  global.__STUB = stub;
}

console.log('=== ۳) عددهایی که مدل لازم ندارند ===');
{
  /* مدلی که از کار افتاده یا خالی برمی‌گرداند یا همان یک جواب را برای همه.
     هیچ داوریِ مدلی به این دوتا نمی‌رسد. */
  const good = sqStats_([['تحلیلِ اول و مفصل', 'نکاتِ کلیدیِ یک'],
                         ['تحلیلِ دوم و متفاوت', 'نکاتِ کلیدیِ دو'],
                         ['تحلیلِ سوم و تازه', 'نکاتِ کلیدیِ سه']]);
  ok('۳.۱ خروجیِ سالم نه خالی است نه تکراری',
     good.emptyPct === 0 && good.dupPct === 0, JSON.stringify(good));

  const empty = sqStats_([['', ''], ['', 'ب'], ['', '']]);
  ok('۳.۲ خالی‌بودن شمرده می‌شود', empty.emptyPct >= 80, String(empty.emptyPct));

  const dup = sqStats_([['همان جواب', 'همان'], ['همان جواب', 'همان'],
                        ['همان جواب', 'همان'], ['یک چیزِ دیگر', 'متفاوت']]);
  ok('۳.۳ تکرارِ عینی شمرده می‌شود', dup.dupPct >= 50, String(dup.dupPct));
  /* ردیفِ عملاً خالی نباید «تکراری» شمرده شود، وگرنه یک شیتِ خالی صددرصد
     تکراری گزارش می‌شود و دو ایرادِ متفاوت قاطی می‌شوند. */
  const both = sqStats_([['', ''], ['', ''], ['', '']]);
  ok('۳.۴ ولی ردیفِ خالی «تکراری» شمرده نمی‌شود', both.dupPct === 0, String(both.dupPct));
  ok('۳.۵ و بی ردیف، عددی ساخته نمی‌شود', sqStats_([]).n === 0);
}

console.log('=== ۴) داور بی نمونه، رأی می‌دهد نه شهادت ===');
{
  ok('۴.۱ بی پرامپت داوری نمی‌شود', sqJudge_('x', '', [['a']]) === null);
  ok('۴.۲ و بی نمونه هم', sqJudge_('x', 'پرامپتِ بلند', []) === null);
}

console.log('=== ۵) یافته‌ها: کلیدِ ثابت، و پیگیریِ تغییر ===');
{
  const hub = new Spread('hub', 'HUBQ');
  global.__SS['HUBQ'] = hub;
  const s = { key: 'photo', name: 'تحلیلگرِ عکس' };

  let n = sqFindings_(hub, s, { modelVerdict: 'مرده', modelWhy: 'نیست', n: 0 }, null, 'js');
  ok('۵.۱ مدلِ مرده یافته می‌سازد', n === 1);

  n = sqFindings_(hub, s, { modelVerdict: 'تازه', n: 12, emptyPct: 90, dupPct: 0 }, null, 'js');
  ok('۵.۲ خالی‌بودنِ انبوه یافته می‌سازد', n === 1);
  n = sqFindings_(hub, s, { modelVerdict: 'تازه', n: 12, emptyPct: 0, dupPct: 80 }, null, 'js');
  ok('۵.۳ تکرارِ انبوه هم', n === 1);
  /* آستانه‌ها عمداً بلندند: هشداری که برای نوسانِ عادی فیره کند، همان
     هشداری است که آدم یاد می‌گیرد نبیند. */
  n = sqFindings_(hub, s, { modelVerdict: 'تازه', n: 12, emptyPct: 5, dupPct: 5 }, null, 'js');
  ok('۵.۴ ولی خروجیِ سالم هیچ یافته‌ای نمی‌سازد', n === 0);

  /* پیگیری: کد عوض شده؟ پس بسنج بهتر شد یا بدتر — همان قاعده‌ای که
     srcVerdict_ و modelVerdict_ دارند. */
  const prev = { sha: 'SHA-OLD', emptyPct: 5, dupPct: 5 };
  n = sqFindings_(hub, s, { modelVerdict: 'تازه', n: 12, emptyPct: 60, dupPct: 5 }, prev, 'NEW');
  ok('۵.۵ تغییرِ کد که بدتر کرده، یافتهٔ خودش را دارد', n >= 1);
  const tab = hub.getSheetByName(CFG.REPORT_TAB);
  const txt = tab ? tab._d.map(r => r.join('|')).join('\n') : '';
  ok('۵.۶ و صریح می‌گوید بدتر شد', txt.indexOf('بدتر شد') !== -1);
  ok('۵.۷ و کلیدها به تحلیلگر گره خورده‌اند، نه یک کلیدِ مشترک',
     txt.indexOf('sq-empty-photo') !== -1 || txt.indexOf('photo') !== -1);
}

console.log('=== ۶) دیده‌شدن ===');
{
  ok('۶.۱ بی هیچ دوری هم یک جملهٔ فارسی می‌دهد، نه خطا',
     typeof sqStatus_().line === 'string' && sqStatus_().line.length > 5, sqStatus_().line);
  const h8 = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۶.۲ و هر روز در یادداشت‌های سلامت می‌آید', h8.indexOf('sqStatus_()') !== -1);
  ok('۶.۳ و در _STATUS.json هم — تنها فایلی که ناظر می‌خواند',
     h8.indexOf('srcQuality:') !== -1);
  const s21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۶.۴ و کارِ شبانه واقعاً صدایش می‌زند', s21.indexOf('sqRun_(') !== -1);
  const s05 = fs.readFileSync('src/05_Setup.gs', 'utf8');
  ok('۶.۵ و یک دکمهٔ دستی هم دارد', s05.indexOf('runSourceQuality') !== -1);
  /* هفتگی، نه هر شب: کیفیت در بیست‌وچهار ساعت عوض نمی‌شود. */
  global.__PROPS[PK.SQ_AT] = nowStr_();
  ok('۶.۶ دو بار در یک هفته نمی‌دود', sqDue_() === false);
  delete global.__PROPS[PK.SQ_AT];
  ok('۶.۷ ولی بارِ اول می‌دود', sqDue_() === true);
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ کیفیتِ استخراج گذشت.');
