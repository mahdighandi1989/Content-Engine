/* Status file + health alerting */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs', '33_VoiceIntake.gs', '34_Search.gs', '35_Embed.gs', '36_VoiceBridge.gs'];
let src=''; for (const f of FILES) src += '\n'+fs.readFileSync('src/'+f,'utf8');
(0,eval)(src);
const VH=['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','d','e','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی','f','تحلیل محتوا (JSON)','g','h','i','خلاصه اجرایی','وضعیت'];
const PH=['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','استخراج متن (JSON)','d','e','تحلیل محتوا (JSON)','f','g','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];
function mk(id,h,rows){const ss=new Spread('s',id);const sh=ss.insertSheet('S1');sh._d.push(h.slice());rows.forEach(r=>sh._d.push(r));sh._max=Math.max(1000,sh._d.length+10);global.__SS[id]=ss;return ss;}
// تاریخ‌ها باید «تازه» باشند، وگرنه دیدبانِ منابع درست تشخیص می‌دهد که شیت راکد است
const D0 = new Date();
const recent = i => {
  const d = new Date(D0.getTime() - (59 - i) * 3600 * 1000);   // یک ردیف در ساعت
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
};
const V=[],P=[];
for(let i=0;i<60;i++)V.push([recent(i),'V'+i,'o','n','https://drive.google.com/file/d/V'+i+'/view','[]','{}','{}','متن گفتار طولانی. '.repeat(6),'وایب','تخصصی','{}',JSON.stringify({Genre:'کمدی، طنز',Main_Topic:'م'+i,Key_Message:'پیام کلیدی طولانی برای امتیاز '+i}),'','','','خلاصهٔ طولانی برای امتیاز. '.repeat(6),'SUCCESS']);
for(let i=0;i<60;i++)P.push([recent(i),'P'+i,'o','n','https://drive.google.com/file/d/P'+i+'/view','{}',JSON.stringify({Original_Text:'متن استخراجی نسبتاً بلند. '.repeat(4)}),'[]','[]',JSON.stringify({Category:'طنز، میم',Main_Subject:'ع'+i,Key_Message:'پیام عکس طولانی '+i,Notable_Elements:'ن'}),'{}','[]','وایب','خلاصهٔ عکس نسبتاً بلند و پرجزئیات. '.repeat(5),'ویژه','SUCCESS']);
mk(CFG.VIDEO_SHEET_ID,VH,V); mk(CFG.PHOTO_SHEET_ID,PH,P);
// __AUTO_SOURCES__ : شیت‌های تازه در این آزمون خالی‌اند
for (const __s of CFG.SOURCES) if (!global.__SS[__s.id]) { const __ss = new Spread('s', __s.id); __ss.insertSheet('S1'); global.__SS[__s.id] = __ss; }
global.__PROPS['GEMINI_API_KEY']='TEST';
global.__STUB=function(url,body){
  if(url.indexOf('/v1beta/models?')!==-1) return {code:200,json:{models:[
    {name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']},
    {name:'models/gemini-2.5-flash-preview-tts',supportedGenerationMethods:['generateContent']}]}};
  const t=body.contents?body.contents[0].parts[0].text:'';
  if(t.indexOf('سردبیرِ یک برنامهٔ رادیویی')!==-1){const c=[...t.matchAll(/- id: (\S+) \|/g)].map(m=>m[1]);
    return {code:200,json:{candidates:[{content:{parts:[{text:JSON.stringify({theme:'ت',chosen:c.slice(0,12).map(id=>({id})),rejected:[]})}]}}]}};}
  if(url.indexOf('tts')!==-1){const b=Buffer.alloc(60000);return {code:200,json:{candidates:[{content:{parts:[{inlineData:{data:b.toString('base64')}}]}}]}};}
  const ids=[...t.matchAll(/شناسه: (\S+)/g)].map(m=>m[1]);
  return {code:200,json:{candidates:[{content:{parts:[{text:JSON.stringify({title:'ت',hook:'ق.',sections:[{heading:'ب',narration:'متن.',tone:'آرام',sourceIds:ids.slice(0,2)}],outro:'پ.',summary:'خ.',tags:[]})}]}}]}};
};
let g=0; while(g++<20){syncCatalog(); if(parseInt(global.__PROPS['CURSOR_PHOTO']||'0',10)>=60) break;}
const hub=getHub_();
console.log('=== ۱) فایل وضعیت ===');
const st=writeStatus_(hub,'آزمون');
const f=global.__ROOT_FOLDER._files.find(x=>x.getName()==='_STATUS.json');
console.log('  فایل ساخته شد:',!!f);
const parsed=JSON.parse(f.getBlob().getDataAsString());
console.log('  اندازه:',f.getBlob().getDataAsString().length,'نویسه — قابل خواندن از بیرون ✅');
console.log('  کلیدها:',Object.keys(parsed).join(', '));
console.log('  دسته‌های واجد شرایط:',parsed.bank.categories.filter(c=>c.elig>0).map(c=>c.cat+':'+c.elig).join(' | '));
if(!parsed.bank||!parsed.sync||!('recentLog' in parsed)) throw new Error('status incomplete');

console.log('\n=== ۲) سلامت وقتی هیچ قسمتی نیست → باید هشدار بدهد ===');
global.__MAIL.length=0;
let h=healthCheck();
console.log('  ایرادها:',h.problems.length,'| ایمیل هشدار:',global.__MAIL.length, h.problems.length&&global.__MAIL.length?'✅':'❌');
if(!h.problems.length||!global.__MAIL.length) throw new Error('should have alerted');
console.log('  نمونه:',h.problems[0].slice(0,80));
const stAfter=JSON.parse(global.__ROOT_FOLDER._files.find(x=>x.getName()==='_STATUS.json').getBlob().getDataAsString());
console.log('  فهرستِ ایرادها در _STATUS.json آمد:',stAfter.health&&stAfter.health.problems.length===h.problems.length?'✅':'❌');
if(!stAfter.health||stAfter.health.problems.length!==h.problems.length) throw new Error('health snapshot missing/mismatched in status file');
if(stAfter.health.problems[0]!==h.problems[0]) throw new Error('health snapshot content mismatch');

console.log('\n=== ۲-ب) سینکِ بعدی نباید health را پاک کند ===');
writeStatus_(hub,'همگام‌سازی کامل شد');
const stAfterSync=JSON.parse(global.__ROOT_FOLDER._files.find(x=>x.getName()==='_STATUS.json').getBlob().getDataAsString());
console.log('  health بعد از یک writeStatus_ نامرتبط سرِ جایش ماند:',stAfterSync.health&&stAfterSync.health.problems.length===h.problems.length?'✅':'❌');
if(!stAfterSync.health||stAfterSync.health.problems.length!==h.problems.length) throw new Error('health snapshot wiped by unrelated writeStatus_ call');

console.log('\n=== ۳) بعد از تولید قسمت → نباید هشدار بدهد ===');
/* «سالم» یعنی زمان‌بندی هم نصب است. از ۵٫۹۵ نبودنِ زمان‌بندی خودش یک ایرادِ
   گزارش‌شدنی است — و درست هم هست: پروژه‌ای بی تریگر هیچ کاری نمی‌کند و تا
   امروز هیچ‌کس خبردار نمی‌شد. پس سناریوی سالم باید واقعاً سالم باشد. */
installTriggers();
let r=produceEpisode(); let d=0;
while(global.__PROPS['PENDING_EPISODE']&&d++<80) produceEpisodeContinue();
global.__MAIL.length=0;
/* این سناریو دربارهٔ «سکوت یعنی سلامت» است، نه دربارهٔ یافته‌های از پیش
   موجود. از ۶٫۴۷ که همهٔ شیت‌های منبع اسکن می‌شوند، خودِ فیکسچر یک یافتهٔ
   بی‌ربط (src-tab-unknown) می‌سازد و آن، این سنجه را — که موضوعش چیزِ
   دیگری است — به سنجهٔ آن یافته تبدیل می‌کرد. */
(function () {
  const rt = hub.getSheetByName(CFG.REPORT_TAB || 'گزارش‌های نظارت');
  if (rt && rt.getLastRow() > 1) {
    const n = rt.getLastRow() - 1, w = REPORT_HEADERS.length;
    rt.getRange(2, 1, n, w).setValues(Array.from({ length: n }, () => new Array(w).fill('')));
  }
})();
/* صفِ پل: شناسه در تنظیمات به فایلِ واقعیِ درایو سنجاق است. اینجا باید به
   فایلِ همین محیط سنجاق شود، وگرنه «شناسه عوض شده» — که ایرادِ واقعیِ
   دیگری است — این سناریو را که موضوعش «سکوت یعنی سلامت» است می‌شکند. */
vbrQueueEnsure_();
CFG.VBR_QUEUE_ID = outFolder_().getFilesByName(vbrFileName_()).next().getId();
h=healthCheck();
console.log('  ایرادها:',h.problems.length, h.problems.length?('→ '+h.problems.join(' | ').slice(0,160)):'هیچ');
console.log('  ایمیل هشدار:',global.__MAIL.length, global.__MAIL.length===0?'✅ سکوت یعنی سلامت':'❌');
if(global.__MAIL.length) throw new Error('should be silent when healthy');
console.log('  یادداشت‌ها:',h.notes.join(' | ').slice(0,120));

console.log('\n=== ۴) فایل وضعیت پس از قسمت ===');
const st2=JSON.parse(global.__ROOT_FOLDER._files.find(x=>x.getName()==='_STATUS.json').getBlob().getDataAsString());
console.log('  آخرین قسمت:',st2.lastEpisode.number,'|',st2.lastEpisode.title,'| ویدیو',st2.lastEpisode.videos,'عکس',st2.lastEpisode.photos);
console.log('  وضعیت ایمیل:',st2.lastEpisode.email);
console.log('  فایل‌های صوتی:',st2.lastEpisode.audioLinks.length);
console.log('  یک فایل _STATUS.json ماند (بازنویسی، نه تکرار):',
  global.__ROOT_FOLDER._files.filter(x=>x.getName()==='_STATUS.json').length===1?'✅':'❌');

console.log('\n=== ۵) قسمت نیمه‌تمامِ بدون تریگر → هشدار + بازیابی ===');
global.__PROPS['PENDING_EPISODE']=JSON.stringify({epNum:9,folderId:'X',podRow:2,chunkIdx:3,partNo:2,files:[{}]});
global.__MAIL.length=0;
h=healthCheck();
const stalled=h.problems.some(p=>p.indexOf('نیمه‌تمام')!==-1);
console.log('  ایراد قسمت نیمه‌تمام گزارش شد:',stalled?'✅':'❌','| ایمیل:',global.__MAIL.length);
if(!stalled) throw new Error('stalled episode not reported');
/* نقطه‌های کورِ نظارت.

   درس‌نامه دو تکه آمد و هیچ گزارشی ثبت نشد. علتش این نبود که سنجه‌ای شکست
   خورد — سنجه‌ای وجود نداشت، و بدتر: خودِ داده هم به فایلِ وضعیت نمی‌رسید.
   «از همه جا از همه رنگ» مدت و تعدادِ فایل را داشت، درس‌نامه هیچ‌کدام را.
   وارسیِ سلامت هم فقط «فایل صوتی ندارد» را می‌دید، نه «دو تا شد».           */
console.log('\n=== نقطه‌های کورِ نظارت ===');
{
  let pass = 0;
  const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); pass++; };
  ok('طولِ طبیعی هشدار نمی‌سازد', epTooLong_('10:21', 10) === 0);
  ok('قسمتِ ۱۴ دقیقه‌ای در برابرِ هدفِ ۱۰ گرفته می‌شود',
     epTooLong_('14:15', 10) > 25, epTooLong_('14:15', 10) + '٪');
  ok('کمی بلندتر (۱۲:۳۰) هشدار نمی‌دهد — سنجه محافظه‌کار است',
     epTooLong_('12:30', 10) === 0);
  ok('درس‌نامهٔ ۲۰ دقیقه‌ای در برابرِ هدفِ ۱۵ گرفته می‌شود', epTooLong_('20:00', 15) > 25);
  ok('کوتاه‌تر از هدف هشدار نیست', epTooLong_('9:00', 10) === 0);
  ok('مدتِ خالی یا نامفهوم هشدار نمی‌سازد',
     epTooLong_('', 10) === 0 && epTooLong_('نامعلوم', 10) === 0);
  ok('هدفِ صفر یا نامعتبر هم امن است', epTooLong_('14:15', 0) === 0);

  /* شمارِ لینک‌ها معیارِ «چند فایل تحویل شد» نیست.
     ستونِ لینک هم فایلِ یکجا را دارد هم بخش‌های خام: قسمتِ ۱۴ امروز شش لینک
     داشت و فقط یک فایلِ یکجا. سنجه‌ای که روی شمارِ لینک بنشیند هر روز بی‌خود
     شلیک می‌کند — همان هشدارِ دروغی که خودمان دربارهٔ درس‌نامه گفتیم بد است. */
  const many = { number: 14, audioLinks: new Array(6).fill('u') };
  const oneWhole = { lastEpisodeAudio: { episode: 14, files: 1, parts: 5 } };
  const twoWhole = { lastEpisodeAudio: { episode: 14, files: 2, parts: 7 } };
  const flags = (st, ep) => {
    const epa = st.lastEpisodeAudio;
    return !!(epa && Number(epa.files) > 1 && String(epa.episode) === String(ep.number));
  };
  ok('شش لینک با یک فایلِ یکجا هشدار نمی‌سازد', flags(oneWhole, many) === false);
  ok('دو فایلِ یکجا هشدار می‌سازد', flags(twoWhole, many) === true);
  ok('اگر شمارش مالِ قسمتِ دیگری باشد، نادیده گرفته می‌شود',
     flags({ lastEpisodeAudio: { episode: 13, files: 3 } }, many) === false);
  ok('نبودِ شمارش هشدار نمی‌سازد', flags({}, many) === false);
}


console.log('=== ۱۲) دیده‌بان: کی ناظر را می‌پاید (۶٫۱۱) ===');
{
  /* ══ جوابِ صادقانه تا ۶٫۱۰ «نه» بود ══
     سه کارگر بیرون از موتور کار می‌کنند و هیچ‌کدام دیده‌بان نداشتند. اگر
     می‌خوابیدند، موتور همچنان «همه‌چیز درست است» می‌گفت — و lastReportAt
     از مدت‌ها پیش حساب می‌شد و هیچ‌جا خوانده نمی‌شد. */
  const T = (name, cond, extra) => {
    if (!cond) throw new Error(name + (extra ? ' — ' + extra : ''));
    console.log('  ✅ ' + name);
  };

  /* ══ از ۸٫۱۷ ورودیِ این ردیف `monChecks.repAt` است، نه `reports.lastReportAt` ══
     آن یکی تازه‌ترین تاریخِ **هر** ردیفِ تبِ گزارش‌هاست و `logSelfFinding_` هم
     همان تب را می‌نویسد، پس یافته‌های خودِ موتور زنگ را خاموش می‌کردند. این دو
     سنجه باورِ پیش از ۸٫۱۷ را رمز کرده بودند؛ **دوباره نشانه‌گیری شدند، نه
     حذف** (۷٫۶۸) — ادعایشان همان است، ورودی‌شان همان چیزی که تولید می‌خوانَد.
     و خودِ جابه‌جایی را ۹.۶ نگه می‌دارد. */
  const P = [], N = [];
  watchdog_({ monChecks: { repAt: '1400/01/01 00:00' } }, P, N);
  T('۱۲.۱ ناظرِ خوابیده ایراد می‌شود، نه یادداشت',
    P.some(x => x.indexOf('ناظرِ روزانه') !== -1), P.join(' | ').slice(0, 120));
  T('۱۲.۲ و چاره‌اش گفته می‌شود، نه فقط خبرش', P.some(x => x.indexOf('Cowork') !== -1));
  T('۱۲.۳ و کارِ صاحبِ برنامه علامت می‌خورد', P.every(x => x.indexOf(HY_) === 0), P[0]);

  const P2 = [], N2 = [];
  const today = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  watchdog_({ monChecks: { repAt: today } }, P2, N2);
  T('۱۲.۴ ناظرِ سالم هیچ ایرادی نمی‌سازد',
    !P2.some(x => x.indexOf('ناظرِ روزانه') !== -1), P2.join(' | '));

  const sp = healthSplit_([HY_ + 'الف', 'ب', HY_ + 'پ', 'ت']);
  T('۱۲.۵ ایرادها دو دسته می‌شوند', sp.yours.length === 2 && sp.mine.length === 2);
  T('۱۲.۶ و علامت پیش از نمایش برداشته می‌شود',
    sp.yours[0] === 'الف' && sp.yours.every(x => x.indexOf(HY_) === -1));
  /* پیش‌فرض باید «کارِ موتور» باشد: برعکسش یعنی هر ایرادِ تازه‌ای که کسی
     یادش برود علامت بزند، بی‌خود سرِ صاحبِ برنامه خراب می‌شود — و همان
     چیزی است که این ایمیل را نخواندنی می‌کند. */
  T('۱۲.۷ پیش‌فرض «کارِ موتور» است، نه «کارِ شما»',
    healthSplit_(['یک ایرادِ بی‌علامت']).yours.length === 0);

  const src08 = fs.readFileSync('src/08_Health.gs', 'utf8');
  T('۱۲.۸ تیترِ ایمیل از روی «کارِ شما» ساخته می‌شود، نه شمارِ کلِ ایرادها',
    src08.indexOf('کاری از شما لازم نیست') !== -1 &&
    src08.indexOf("bad + ' ایراد</h2>'") === -1);
  T('۱۲.۹ و موضوعِ ایمیل هم',
    src08.indexOf("'⚠️ موتور محتوا: ' + sp.yours.length") !== -1);
  T('۱۲.۱۰ تکرارِ انبوه از یادداشت به ایراد ارتقا می‌یابد',
    src08.indexOf('حلقهٔ گزارش←اقدام بسته نمی‌شود') !== -1 &&
    src08.indexOf('CFG.REPEAT_ALERT') !== -1);
}

console.log('=== ۱۳) داوریِ تعویضِ مدل (۶٫۱۶) ===');
{
  const T = (name, cond, extra) => {
    if (!cond) throw new Error(name + (extra ? ' — ' + extra : ''));
    console.log('  ✅ ' + name);
  };

  /* ══ چرا این لازم بود ══
     کشفِ مدلِ بهتر و کنارگذاشتنِ مدلِ مرده از قبل کار می‌کرد. آنچه نبود،
     چیزی است که بخشِ ۲۲ برای کدِ تحلیلگرها دارد و برای مدل نداشت: داوریِ
     بعد از تغییر. مدلِ متنی روی هر جملهٔ هر قسمت اثر می‌گذارد. */
  delete global.__PROPS[PK.MODEL_SWAP];
  delete global.__PROPS[PK.MODEL_BAD];
  T('۱۳.۱ تعویضِ مدل ثبت و خبر می‌شود', modelSwapNote_('قدیمی', 'تازه') === true);
  T('۱۳.۲ و پایه پیش از تغییر گرفته می‌شود، نه بعدش',
    !!(modelSwapRead_() || {}).base);
  T('۱۳.۳ تعویضِ الکی (همان مدل) خبر نمی‌سازد',
    modelSwapNote_('یکی', 'یکی') === false);

  /* پیش از رسیدنِ مهلت، هیچ رأیی داده نمی‌شود. */
  T('۱۳.۴ زودتر از مهلت داوری نمی‌کند', modelVerdict_().ran === false);

  /* حالا پنجره را باز می‌کنیم و پایه را بد جلوه می‌دهیم تا «بدتر» دربیاید. */
  const rec = modelSwapRead_();
  rec.at = '1400/01/01 00:00';
  rec.base = { badNights: 0, errors24h: 0, ok: true };
  global.__PROPS[PK.MODEL_SWAP] = JSON.stringify(rec);
  global.__PROPS[PK.AUDIT_BAD + '_special'] = '5';
  const v = modelVerdict_();
  T('۱۳.۵ بدترشدن تشخیص داده می‌شود', v.ran === true && v.verdict === 'بدتر', v.verdict);
  T('۱۳.۶ و علتش با عدد گفته می‌شود، نه یک جملهٔ کلی',
    v.why.indexOf('۵') !== -1 || /\d/.test(v.why), v.why);
  /* و مهم‌تر از رأی: مدلِ بد نباید هفتهٔ بعد دوباره انتخاب شود، وگرنه
     داوری فقط یک گزارشِ تکراری است. */
  T('۱۳.۷ مدلِ بد به فهرستِ ردشده‌ها می‌رود',
    modelBadList_().indexOf('تازه') !== -1, JSON.stringify(modelBadList_()));
  T('۱۳.۸ و دو بار داوری نمی‌شود', modelVerdict_().ran === false);

  /* «بی‌تفاوت» نباید برگشت بدهد — وگرنه نوسانِ بی‌پایان میانِ دو مدل. */
  delete global.__PROPS[PK.MODEL_BAD];
  delete global.__PROPS[PK.AUDIT_BAD + '_special'];
  modelSwapNote_('الف', 'ب');
  const r2 = modelSwapRead_(); r2.at = '1400/01/01 00:00';
  r2.base = { badNights: 3, errors24h: 0, ok: true };
  global.__PROPS[PK.MODEL_SWAP] = JSON.stringify(r2);
  const v2 = modelVerdict_();
  T('۱۳.۹ مدلی که بدتر نشده برگشت نمی‌خورد',
    v2.verdict !== 'بدتر' && modelBadList_().indexOf('ب') === -1, v2.verdict);

  const src21 = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  T('۱۳.۱۰ و داوری واقعاً در کارِ شبانه صدا زده می‌شود',
    src21.indexOf('modelVerdict_()') !== -1);
}

console.log('\n=== وارسیِ سلامت: بودجه و ردِ پا ===');
{
  const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); };
  /* ══ دو روز پیاپی، ۱۰ صبح، هیچ (۶٫۳۸) ══
   * `health.checkedAt` دو روز مالِ *دیروز* ماند در حالی که تریگرش سرِ جایش
   * بود. یعنی اجرا شروع می‌شد و به آخر نمی‌رسید — و چون مُهر و ایمیل هر دو
   * در انتهای تابع‌اند، هر بار همه‌چیز با هم می‌رفت: ایمیلِ روزانه، هشدارِ
   * گیرکردنِ یوتیوب، سطرِ صفِ داوری، دورِ ۱۰ صبحِ انتشار. */
  const src = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('ردِ پا ثبت می‌شود — اجرای کشته‌شده باید بگوید کجا ایستاد',
     src.indexOf('function healthStep_') !== -1 &&
     src.indexOf("props_().setProperty(PK.HEALTH_STEP") !== -1);
  ok('و کارِ اختیاری پشتِ نگهبانِ زمان است',
     (src.match(/healthHas_\(/g) || []).length >= 6,
     (src.match(/healthHas_\(/g) || []).length + ' مورد');
  /* و نگهبان باید *پیش از* مُهر و ایمیل باشد، وگرنه بی‌فایده است. */
  /* `indexOf` تعریفِ تابع را پیدا می‌کند نه فراخوانش — و تعریف بالاتر از
     همه‌چیز است. مقایسه باید با *فراخوانِ* پایانی باشد. */
  const iGuard = src.lastIndexOf('healthHas_(');
  /* پیشوند، نه فراخوانِ کامل: از ۸.۳۲ آرگومانِ سومی (ایرادهای مزمن) دارد و
     نامِ کامل این سنجه را بی‌دلیل سرخ می‌کرد — پرسش ترتیب است، نه امضا. */
  const iStamp = src.lastIndexOf('saveHealthSnapshot_(problems, notes');
  ok('نگهبان‌ها پیش از مُهرِ پایانی‌اند', iGuard > 0 && iGuard < iStamp,
     iGuard + ' < ' + iStamp);

  /* و کارِ جامانده گفته می‌شود. سطری که بی‌صدا نیاید، خواننده را به این
     نتیجه می‌رساند که آن زیرسامانه ساکت و سالم است. */
  ok('بخشِ جامانده در ایرادها اعلام می‌شود',
     src.indexOf('وارسیِ سلامت وقت کم آورد') !== -1);

  // و در اجرای واقعی، با بودجهٔ عادی، هیچ چیزی جا نمی‌مانَد
  delete global.__PROPS[PK.HEALTH_STEP];
  const h2 = healthCheck();
  ok('با بودجهٔ عادی هیچ بخشی جا نمی‌مانَد',
     !h2.problems.some(x => String(x).indexOf('وقت کم آورد') !== -1),
     h2.problems.filter(x => String(x).indexOf('وقت کم') !== -1)[0] || 'هیچ');
  ok('و ردِ پا «تمام» را ثبت می‌کند',
     String(global.__PROPS[PK.HEALTH_STEP] || '').indexOf('تمام') === 0,
     String(global.__PROPS[PK.HEALTH_STEP] || ''));

  /* و با بودجهٔ تنگ، کارِ اختیاری می‌رود ولی مُهر و ایمیل می‌مانند — همان
     چیزی که دو روز از دست رفت. */
  const keepB = CFG.HEALTH_BUDGET_MS;
  CFG.HEALTH_BUDGET_MS = 60000;
  const t0 = Date.now();
  const realNow = Date.now;
  Date.now = () => realNow() + 300000;      // انگار پنج دقیقه گذشته
  global.__PROPS[PK.HEALTH_STEP] = '';
  const h3 = healthCheck();
  Date.now = realNow;
  CFG.HEALTH_BUDGET_MS = keepB;
  ok('با وقتِ کم، بخش‌های اختیاری اعلام می‌شوند نه اینکه بی‌صدا بیفتند',
     h3.problems.some(x => String(x).indexOf('وقت کم آورد') !== -1),
     h3.problems.filter(x => String(x).indexOf('وقت کم') !== -1)[0] || 'هیچ');
  ok('ولی مُهرِ پایانی باز هم زده می‌شود',
     String(global.__PROPS[PK.HEALTH_STEP] || '').indexOf('تمام') === 0,
     String(global.__PROPS[PK.HEALTH_STEP] || ''));
}

/* ══════════════════════════════════════════════════════════════════════
 * ۱۱) تبِ موسیقی یک بار خوانده می‌شود، نه دو بار (۷٫۷۲)
 *
 * گزارشِ ۲۷ سپتامبر: «وارسیِ سلامت وقت کم آورد و این بخش‌ها امروز اجرا
 * نشدند: … (کلِ اجرا ۳۲۰ ثانیه)». و ۷٫۶۸ — مالِ من، یک روز پیش‌تر — دو
 * چیز را با هم عوض کرده بود: `musicStatus_` از خواندنِ یک **ستون** به
 * خواندنِ **کلِ تب** رفت (برای شمردنِ «شنیده‌نشده»)، و من همان تابع را
 * در `healthCheck` **دوباره** صدا زدم، در حالی که `writeStatus_` همان
 * شیء را ساخته بود.
 *
 * دقیقاً اشتباهِ ۷٫۶۳، یک نسخه پس از نوشتنِ خودش.
 *
 * و سنجه **تعدادِ خواندن** را می‌شمارد، نه زمان را: بدَل هیچ شیتِ
 * ۲۹ مگابایتی ندارد، پس زمان اینجا چیزی نمی‌سنجد (۷٫۶۰).
 * ══════════════════════════════════════════════════════════════════════ */
console.log('\n══ ۱۱) وارسیِ سلامت تبِ موسیقی را دوبار نمی‌خواند ══');
{
  const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); };
  const realBank = global.musicBank_;
  let reads = 0;
  global.musicBank_ = function (hub) { reads++; return realBank(hub); };
  try { healthCheck(); } catch (e) {}
  global.musicBank_ = realBank;
  ok('۱۱.۱ در یک وارسیِ سلامت، بانکِ موسیقی یک بار خوانده می‌شود',
     reads <= 1, 'خواندن: ' + reads +
     ' — هر خواندن یعنی کلِ تبِ موسیقی از هابِ ۲۹ مگابایتی');
}



console.log('\n══ ۱۴) دو جملهٔ متناقض در یک ایمیل (۷٫۸۸) ══');
/* نامهٔ ۲۹ سپتامبر هم «دستورِ لحن: **خاموش**» داشت و هم «مدل عوض شد تا لحن
   برگردد» — دربارهٔ یک چیز، در یک ایمیل. علتش ترتیب بود: سطرِ وضعیت از
   عکسِ **پیش از** تعویض می‌آمد. و خوانندهٔ دو جملهٔ متناقض یاد می‌گیرد
   هیچ‌کدام را باور نکند (۷٫۵۷/۷٫۷۹). */
{
  const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); };

  /* ── ۱۴.۱ ترتیب: تعویض، بعد سطرِ وضعیت ──
     اینجا عمداً **متنِ کد** خوانده می‌شود، چون چیزی که گزارش می‌شود خودِ
     ترتیبِ دو فراخوان در همین تابع است؛ سنجهٔ رفتاری در این ماک ممکن نیست،
     چون فهرستِ مدل‌های صوتیِ ماک یکی است و هیچ تعویضی شدنی نیست. */
  {
    const src8 = fs.readFileSync('src/08_Health.gs', 'utf8');
    const iH = src8.indexOf('function healthCheck');
    const iSw = src8.indexOf('ttsCueSwitch_()', iH);
    const iSt = src8.indexOf('var tcS = ttsCueStatus_()', iH);
    ok('۱۴.۱ سطرِ وضعیت پس از تعویض خوانده می‌شود، نه پیش از آن',
       iH > 0 && iSw > 0 && iSt > iSw,
       'تعویض @ ' + iSw + ' · وضعیت @ ' + iSt +
       ' — وگرنه یک ایمیل هم «خاموش» می‌گوید و هم «عوض شد»');
  }

  /* ── ۱۴.۲ و سطر از نقشه می‌آید، نه از خانهٔ تکیِ پیش از ۷٫۴۷ ──
     مدلِ زنده در نقشه است و خانهٔ تکی **کسِ دیگری** را نگه می‌دارد. کدِ پیش
     از ۷٫۸۸ اینجا می‌گفت «در نوبتِ امتحانِ دوباره» — یعنی سالم — و همان
     `ok` سدی است که `runVoiceSoulTest` به آن تکیه می‌کند (۷٫۷۹). */
  {
    delete global.__PROPS[PK.TTS_CUE_BAD];
    resolveModels_(true);
    const liveH = ttsModel_();
    ttsCueBadAdd_(liveH, nowStr_());
    global.__PROPS[PK.TTS_CUE_OFF] = 'gemini-some-other-tts';
    global.__PROPS[PK.TTS_CUE_OFF_AT] = '2020-01-01 00:00';
    global.__MAIL = [];
    try { healthCheck(); } catch (e) {}
    const txt = global.__MAIL.map((m) => String((m && (m.body || m.htmlBody)) || '')).join('\n');
    /* ══ ۷٫۸۹: دیگر «خاموش» نیست، ولی ادعای اصلی همان است ══
       آنچه این سنجه از ۷٫۸۸ محافظت می‌کرد، **کدام مدل نام برده می‌شود**
       بود: نقشه، نه خانهٔ تکیِ پیش از ۷٫۴۷. آن ادعا سرِ جایش می‌مانَد؛
       فقط واژهٔ «خاموش» جایش را به نامِ مسیرِ تازه می‌دهد، چون لحن حالا
       از راهِ پیشوندِ متن می‌رود و گفتنِ «خاموش» دروغ می‌شد. */
    ok('۱۴.۲ سطرِ لحن مدلِ زندهٔ واقعی را نام می‌برد، نه خانهٔ تکی',
       txt.indexOf('پیشوندِ متن') !== -1 &&
       txt.indexOf('«' + liveH + '» قالبِ فیلددار را نپذیرفت') !== -1 &&
       txt.indexOf('gemini-some-other-tts') === -1,
       'مدلِ زنده: ' + liveH);
    delete global.__PROPS[PK.TTS_CUE_OFF];
    delete global.__PROPS[PK.TTS_CUE_OFF_AT];
    delete global.__PROPS[PK.TTS_CUE_BAD];
    resolveModels_(true);
  }

  /* ── ۱۴.۳ دوگانه‌ای که همان اجرا درستش کرده، گزارش نمی‌شود ──
     `lay` از `writeStatus_` می‌آید که سرِ همین اجرا دویده، و موتور در فاصلهٔ
     همان اجرا هم‌نام‌ها را یکی می‌کند. نامهٔ ۲۹ سپتامبر «۲ نسخه» گفت و روی
     دیسک یکی بود. */
  {
    const realLay = global.outLayoutCheck_;
    global.outLayoutCheck_ = function () {
      return { files: 1, folders: 0, strays: [], stale: [], oldPrompts: [],
               openFolders: [], readme: null, error: '',
               dups: [{ name: '_MUSIC-FEED.json', count: 2 }] };
    };
    global.__MAIL = [];
    try { healthCheck(); } catch (e) {}
    global.outLayoutCheck_ = realLay;
    const t2 = global.__MAIL.map((m) => String((m && (m.body || m.htmlBody)) || '')).join('\n');
    ok('۱۴.۳ دوگانهٔ برطرف‌شده در گزارش نمی‌آید',
       t2.indexOf('هم‌نامِ تکراری') === -1,
       'عکسِ کهنه ۲ نسخه گفت؛ روی دیسک یکی است');
  }
}

console.log('\n✅ آزمون سلامت گذشت.');


/* ══ نگهبانِ غنی‌سازی باید شهادت بدهد، نه فقط حکم (۷٫۳۲) ══
   ۲۱ سپتامبر گفت «تسک ۸ روز است کاری نکرده» در حالی که پاسخِ همان روز در
   ریشه بود. علت پیدا نشد — پس از این به بعد عدد با شاهدش می‌آید: نامِ
   تازه‌ترین پاسخی که دیده، و شمارِ کلِ پاسخ‌هایی که شمرده. */
{
  const okE = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); };
  const d = whNewestEnrich_(true);
  okE('۹.۱ شهادت شکلِ درست دارد',
      d && typeof d === 'object' && 'at' in d && 'seen' in d && 'name' in d,
      JSON.stringify(d));
  okE('۹.۲ و بی آرگومان همان رشتهٔ قبلی را می‌دهد — سازگاری نشکسته',
      typeof whNewestEnrich_() === 'string');
  const rows = watchdogHeartbeats_({});
  const er = rows.filter(r => r.key === 'enrich')[0];
  okE('۹.۳ ردیفِ تسکِ غنی‌سازی شاهد دارد',
      !!er && typeof er.evidence === 'string',
      er ? er.evidence : 'ردیف نبود');
  /* نگارشِ پیشینِ این سنجه یک **عبارتِ امروز** را پین کرده بود
     («تازه‌ترین پاسخی که دیده شد»)، پس با بهتر شدنِ متن سرخ شد بی آنکه
     چیزی خراب شده باشد — همان شکلی که ۸.۰۳ سه بار دید. ادعا این است که
     راهنما **مدرکِ مشخص** با خودش می‌آورد، نه یک جملهٔ کلی. */
  okE('۹.۴ و متنِ راهنماش مدرکِ مشخص می‌برد، نه فقط «روتین را وارسی کنید»',
      !!er && /از \d+ فایل/.test(er.fix) && /مصرف/.test(er.fix),
      er ? er.fix.slice(0, 110) : '');

  /* ══ ۹.۵ — **دو شاهد**، و تازه‌ترینشان برنده است (۸.۰۶) ══
     پیمایشِ پوشه فقط پاسخ‌های **مصرف‌نشده** را می‌بیند، چون
     `trashEnrichFiles_` هر پاسخ را پس از ادغام پاک می‌کند. یعنی آن عدد
     انبارِ عقب‌افتاده را می‌سنجید و نامش «آخرین کارِ تسک» بود — و نتیجه‌اش
     این بود که خطِ لوله‌ای که سریع‌تر مصرف می‌کند خراب‌تر به نظر می‌رسد.
     ۳۰ سپتامبر هر دو شاهد در یک ایمیل چاپ شدند و با هم مخالف بودند:
     پیمایش ۲۲ سپتامبر، مهرِ مصرف ۳۰ سپتامبر. */
  {
    const oldAt = global.__PROPS[PK.ENRICH_AT];
    global.__PROPS[PK.ENRICH_AT] = '2026-09-30 08:35';
    const ev = whNewestEnrich_(true);
    okE('۹.۵ مهرِ «قسمتی با منبعِ بیرونی منتشر شد» هم شاهد است، نه فقط فایلِ روی دیسک',
        ev.at === '2026-09-30 08:35' && ev.via.indexOf('منتشر') !== -1,
        ev.at + ' · ' + ev.via);
    /* و هرگز تاریخ را **عقب** نمی‌بَرد. نگارشِ اولِ این سنجه در حالتی سنجید
       که هیچ فایلی در ریشه نبود، پس از راهِ `|| scanAt === ''` سبز می‌شد و
       ادعایش را اصلاً نمی‌آزمود: باید پیمایش **تازه** باشد و مهر **کهنه**. */
    putOutJson_('_ENRICH-variety-099.json', { ok: 1 });   // فایلِ تازه در ریشه
    global.__PROPS[PK.ENRICH_AT] = '2020-01-01 00:00';
    const ev2 = whNewestEnrich_(true);
    okE('۹.۵-ب و شاهدِ قدیمی‌تر تاریخ را عقب نمی‌بَرد',
        !!ev2.scanAt && ev2.at === ev2.scanAt && ev2.at > '2020-01-01 00:00',
        ev2.at + ' (پیمایش: ' + (ev2.scanAt || 'هیچ') + ' · مهر: ' + ev2.usedAt + ')');
    /* ══ ۹.۵-پ — و دو حقیقت یکی نمی‌شوند ══
       نگارشِ اولِ ۸.۰۶ بزرگ‌ترِ دو شاهد را از **هر دو** راه برمی‌گرداند، و
       همان جدایی‌ای را پس گرفت که ۷٫۳۲ بابتش نسخه داد: «تازه‌ترین پاسخی که
       روی دیسک دیده شد» و «آخرین قسمتی که با منبعِ بیرونی منتشر شد» دو
       واقعیتِ متفاوت‌اند. سنجهٔ قدیمیِ `run_reports_test.js` همان شب سرخ شد
       و درست هم بود. تقسیمِ کار: جمله‌ها دو عدد را جدا نشان می‌دهند، زنگ
       تازه‌ترین را می‌گیرد. */
    global.__PROPS[PK.ENRICH_AT] = '2026-09-30 08:35';
    const evD = whNewestEnrich_(true), evS = whNewestEnrich_();
    okE('۹.۵-پ زنگ تازه‌ترین شاهد را می‌گیرد، ولی جمله‌ها دو عدد را جدا نگه می‌دارند',
        evD.at === '2026-09-30 08:35' && evS === evD.scanAt && evS !== evD.at,
        'زنگ: ' + evD.at + ' · جمله: ' + (evS || 'هیچ'));
    if (oldAt === undefined) delete global.__PROPS[PK.ENRICH_AT];
    else global.__PROPS[PK.ENRICH_AT] = oldAt;
  }

  /* ══ ۹.۶ — زنگِ «ناظر نمی‌دود» با نوشتهٔ خودِ موتور ساکت نشود (۸٫۱۷) ══
     `reports.lastReportAt` تازه‌ترین تاریخِ **هر** ردیفِ تبِ گزارش‌هاست، و
     `logSelfFinding_` هم همان تب را با `nowStr_()` می‌نویسد. پس تا ۸٫۱۶ اگر
     ناظر می‌مُرد، اولین یافتهٔ خودیِ موتور این زنگ را خاموش می‌کرد. حالتِ زیر
     دقیقاً همان است: ردیفِ تبْ امروز، گزارشِ روزانه نُه روز پیش. */
  {
    const fmt = (t) => Utilities.formatDate(new Date(t), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
    const today = fmt(Date.now()), nine = fmt(Date.now() - 9 * 86400000);
    const mrow = (st2) => watchdogHeartbeats_(st2).filter(r => r.key === 'monitor')[0];
    const mix = mrow({ reports: { lastReportAt: today }, monChecks: { repAt: nine } });
    okE('۹.۶ ردیفِ ناظر از گزارشِ روزانه می‌خواند، نه از تازه‌ترین ردیفِ تب',
        !!mix && mix.days >= 9 && mix.at === nine,
        mix ? ('days=' + mix.days + ' at=' + mix.at + ' | تب=' + today) : 'ردیف نبود');
    okE('۹.۶-ب و هر دو عدد در مدرک هست، پس اختلافشان پنهان نمی‌مانَد (۷٫۳۲)',
        !!mix && String(mix.evidence || '').indexOf(nine) !== -1 &&
        String(mix.evidence || '').indexOf(today) !== -1,
        mix ? String(mix.evidence || '') : '');
    /* و جهتِ مخالف: شاهدی که نیست زنگ نمی‌زند. `watchdog_` برای `days < 0`
       فقط یادداشت می‌گذارد — «نمی‌دانیم» با «نرفت» یکی نیست (۷٫۶۳). */
    const pr = [], nt = [];
    watchdog_({ reports: { lastReportAt: today } }, pr, nt);
    const hit = (a) => a.filter(x => String(x).indexOf('ناظرِ روزانه') !== -1).length;
    okE('۹.۶-پ و نبودِ آن شاهد زنگ نمی‌زند، فقط یادداشت می‌شود (۷٫۶۳)',
        hit(pr) === 0 && hit(nt) === 1,
        'مسئله=' + hit(pr) + ' یادداشت=' + hit(nt));
    /* ثبت می‌شود، نه ادعا (۷٫۷۴): شکستنِ همین قاعده — `problems` به‌جای
       `notes` برای `days < 0` — روی سنجهٔ قدیمی‌ترِ «should be silent when
       healthy» می‌نشیند، چون آن پیش از §۹ می‌دود. و همان هم خودش جواب است:
       اگر شاهدِ نبوده را «هرگز ندوید» بخوانیم، موتورِ تازه‌نصب هر روز شکایت
       می‌کند (۷٫۶۳). ۹.۶-پ این مرز را در خودِ این ردیف نگه می‌دارد.
       و شکستنِ B1 (بازگرداندنِ منبع به `lastReportAt`) روی ۱۲.۱ می‌نشیند،
       چون §۱۲ زودتر می‌دود؛ ۹.۶ با همان رگرسیونی سنجیده شد که واقعاً
       نگهبانش است: گرفتنِ **تازه‌ترینِ** دو شاهد به‌جای شاهدِ درست. */
    /* ══ ۹.۶-ت — مرزی که نگذاشتنش همین تعمیر را باطل می‌کرد ══
       از امروز روتین‌های دیگر هم `_REPORT-<kind>-<date>.json` می‌نویسند. اگر
       `monChecksIngest_` ضربانِ ناظر را با **هر** گزارشی مهر می‌زد، همان
       حفره از درِ تازه برمی‌گشت — و `checks`ِ همان فایل باید ثبت شود. */
    /* مهر را **از قبل** می‌نشانیم، چون حالتی که تولید در آن ایستاده همین است:
       گزارشِ روزانه دیروز خورده. با مهرِ خالی، «نزد» از «زد ولی خالی» جدا
       نمی‌شد و ادعا نیمه‌خالی می‌مانْد (۷٫۸۶). */
    const seeded = '2026-08-17 12:00';
    const m0 = monChecksLoad_(); m0.__rep = { firstAt: seeded, lastAt: seeded };
    monChecksSave_(m0);
    const before = (monChecksLoad_().__rep || {}).lastAt || '';
    monChecksIngest_({ checks: [{ key: 'tts-model-scan', verdict: 'سالم', note: 'ن' }] },
                     '_REPORT-tts-20270101.json');
    const after = (monChecksLoad_().__rep || {}).lastAt || '';
    okE('۹.۶-ت گزارشی که نامش روزانه نیست ضربانِ ناظر را تازه نمی‌کند',
        after === before && after === seeded && !!monChecksLoad_()['tts-model-scan'],
        JSON.stringify({ before: before, after: after }));
  }
}

/* ══ ۱۰) شاهدی برای خودِ وارسیِ سلامت (۷٫۶۳) ══
   ۲۵ سپتامبر `healthCheck` سرِ ۱۰:۰۴ شروع شد و به آخر نرسید. `lastStep` —
   ردِ پای ۶٫۳۸ — درست کار کرد و گفت کجا ایستاد؛ ولی **زنگی نبود**، پس
   ایمیلِ روز نرفت و با آن همهٔ درهای دومی که ۷٫۲۷ تا ۷٫۵۷ روی همین تابع
   گذاشته‌اند. تحلیل نوشته شد و به تصمیم وصل نشد — چندمین بار.
   و کانالش عمداً `mailQueue_` نیست: آن صف را همان تابعی خالی می‌کند که
   مُرده است، پس خبر در همان صف می‌ماند و هرگز نمی‌رسد. */
{
  const okH = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); };
  console.log('\n══ ۱۰) گزارشِ روزانه نرفت ══');

  const OUTF = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  const dayStr = (back) => new Date(new Date(nightDay_() + 'T00:00:00Z').getTime()
                                    - back * 86400000).toISOString().slice(0, 10);
  // مهر را در همان فایلی می‌نشانیم که `readExistingHealth_` می‌خواند.
  const stamp = (at, step) => {
    const body = JSON.stringify({ health: at === null ? {} : { checkedAt: at, problemCount: 1 } });
    const it = OUTF.getFilesByName(STATUS_FILE);
    if (it.hasNext()) it.next().setContent(body);
    else OUTF.createFile(STATUS_FILE, body, 'application/json');
    if (step === null) delete global.__PROPS[PK.HEALTH_STEP];
    else global.__PROPS[PK.HEALTH_STEP] = step;
  };

  stamp(dayStr(1) + ' 10:08', 'پایان @ 41ث');
  const fresh = healthStale_();
  okH('۱۰.۱ مهرِ دیروز سالم است — سرِ ۰۲:۳۰ وارسیِ امروز هنوز نیامده',
      fresh.stale === false && fresh.days === 1, String(fresh.days) + ' روز');

  stamp(dayStr(2) + ' 10:08', 'شروع @ ' + dayStr(0) + ' 10:04');
  const dead = healthStale_();
  okH('۱۰.۲ دو روز یعنی یک روزِ کاملِ بی‌گزارش ⇒ زنگ',
      dead.stale === true && dead.ok === false && dead.days === 2, dead.line.slice(0, 80));
  okH('۱۰.۳ و «کجا ایستاد» در همان جمله می‌آید، نه در لاگی دیگر',
      dead.line.indexOf('شروع @') !== -1, dead.line.slice(-60));

  /* شک، در را نمی‌بندد (۷٫۵۷): مهری که هرگز نوشته نشده می‌تواند موتورِ
     تازه‌نصب باشد، و زنگ برای حالتِ سالم زنگی است که یاد می‌گیرند نشنوند. */
  stamp(null, null);
  const unknown = healthStale_();
  okH('۱۰.۴ مهرِ نبوده زنگ نمی‌زند — «نمی‌دانیم» با «نرفت» یکی نیست',
      unknown.stale === false && unknown.days === null, unknown.line.slice(0, 70));

  /* ══ ۱۰.۵ رسیدنِ کد به این وارسی ══
     هیچ مجموعه‌ای `selfUpdateDaily()` را **اجرا** نمی‌کند (خیلی سنگین
     است)، پس این یکی ساختاری است و همین را می‌گوید، نه بیشتر: آنچه
     دیشب ۷٫۶۲ را خرج کرد، دروازه‌ای بود که کد را رد می‌کرد — و دقیقاً
     همان دو تله اینجا سنجیده می‌شود. نیمهٔ سومش در
     `run_wiring_test.js` ۸٫۲ است: اگر کسی این فراخوان را داخلِ بلوکِ
     «نخستین اجرا» ببرد، آن سنجه قرمز می‌شود. */
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const body21 = su.slice(su.indexOf('function selfUpdateDaily() {'),
                          su.indexOf('function selfUpdateRetry()'));
  const after = body21.slice(body21.indexOf('پایانِ کارهای ارزان'));
  okH('۱۰.۵ کارِ شبانه خودش صداش می‌زند، بیرونِ بلوکِ «نخستین اجرا»',
      body21.indexOf('healthDeadCheck_(') !== -1 &&
      after.indexOf('healthDeadCheck_(') !== -1,
      'وگرنه شبی که نسخه نصب می‌شود اجرا نمی‌شود — ۷٫۲۹');
  okH('۱۰.۶ و پشتِ هیچ نگهبانِ زمانی نیست',
      after.indexOf('healthDeadCheck_(') < after.indexOf('nightHas_('),
      'شبی که وقت کم می‌آید همان شبی است که «گزارشی نرفته» باید گفته شود');

  /* ══ رفتارش، با اجرا ══ */
  stamp(dayStr(3) + ' 10:08', 'شروع @ ' + dayStr(0) + ' 10:04');
  delete global.__PROPS[PK.HEALTH_DEAD_AT];
  const mail0 = global.__MAIL.length;
  healthDeadCheck_(null);
  const sent = global.__MAIL.slice(mail0)
    .filter((m) => /گزارشِ روزانه/.test(String(m.subject || '')));
  okH('۱۰.۷ ایمیلِ فوری می‌رود', sent.length === 1,
      sent.length + ' ایمیل · ' + (sent[0] ? sent[0].subject : '—'));
  /* ══ و کانالش صفِ خبرها نیست ══
     نخستین شکلِ این سنجه شمارِ صف را می‌سنجید و **قرمز شد** — چون
     `logSelfFinding_` خودش برای یافتهٔ تازه یک خبر در صف می‌گذارد، که
     درست است و ربطی به کانالِ هشدار ندارد. سنجه‌ای که چیزِ دیگری را
     بسنجد از نبودنش بدتر است، پس ادعا را همان‌جوری که هست می‌سنجیم:
     **اگر صف از کار بیفتد، هشدار باز هم می‌رسد.** صفِ خبرها را همان
     `healthCheck` خالی می‌کند، و او همان چیزی است که مُرده. */
  {
    delete global.__PROPS[PK.HEALTH_DEAD_AT];
    const realQ = global.mailQueue_;
    global.mailQueue_ = function () { throw new Error('صفِ خراب'); };
    const m2 = global.__MAIL.length;
    let threw = '';
    try { healthDeadCheck_(null); } catch (e) { threw = e.message; }
    global.mailQueue_ = realQ;
    okH('۱۰.۸ با صفِ خبرهای خراب هم هشدار می‌رسد — کانالش صف نیست',
        threw === '' && global.__MAIL.slice(m2)
          .filter((m) => /گزارشِ روزانه/.test(String(m.subject || ''))).length === 1,
        threw ? ('پرتاب: ' + threw) : 'ایمیلِ فوری رفت');
  }
  const row = loadReportRows_(getHub_()).rows
    .filter((r) => String(r.vals[RC.TITLE - 1] || '').indexOf('وارسیِ سلامت') !== -1);
  okH('۱۰.۹ و یافته‌ای ثبت می‌شود — جملهٔ یک ایمیل را فردا جایش می‌گیرد',
      row.length >= 1 && String(row[0].vals[RC.STATUS - 1]) === RST.NEEDS_CODE,
      row.length ? String(row[0].vals[RC.STATUS - 1]) : 'ردیفی نیست');

  // دو اجرا در یک شب (شبِ نصبِ کد) یعنی یک خبر، نه دو.
  const mail1 = global.__MAIL.length;
  healthDeadCheck_(null);
  okH('۱۰.۱۰ در یک روز دو بار خبر نمی‌دهد',
      global.__MAIL.slice(mail1)
        .filter((m) => /گزارشِ روزانه/.test(String(m.subject || ''))).length === 0);

  /* و بیانیه‌ای که این کلید را نام ببرد، تا وقتی خودِ وضعیت می‌گوید «هنوز
     هست»، ردیف را نمی‌بندد (۷٫۵۷). */
  /* `known` همین که مدخل در نقشه باشد true است — پس ادعای «شک در را
     نمی‌بندد» را باید روی `still` سنجید، نه `known`. نخستین شکلِ این
     سنجه همین را اشتباه گرفت و قرمز شد. */
  okH('۱۰.۱۱ سنجندهٔ `health-silent` وصل است و شرط را می‌بیند',
      selfVerifyOne_('health-silent', { healthStale: { ok: false } }).still === true &&
      selfVerifyOne_('health-silent', { healthStale: { ok: true } }).still === false &&
      selfVerifyOne_('health-silent', {}).still === null,
      'و وضعیتِ نبوده «هنوز هست» نیست — شک در را نمی‌بندد');

  /* ══ و کلیدِ تازه هیچ خواندنِ درایویی اضافه نکرده (۷٫۶۰) ══
     نخستین شکلش `readExistingHealth_()` را خودش صدا می‌زد، یعنی در هر
     `writeStatus_` یک خواندنِ **دومِ** ۱۲۶ کیلوبایتیِ `_STATUS.json` —
     و `writeStatus_` سرِ خودِ `healthCheck` صدا زده می‌شود، همان تابعی که
     امروز سرِ هزینه مُرد. آنچه گران بود **شمارِ خواندن** است، نه زمان
     (که در ماک بی‌معناست)، پس همان شمرده می‌شود. */
  {
    const real = global.readExistingHealth_;
    let n = 0;
    global.readExistingHealth_ = function () { n++; return real.apply(null, arguments); };
    let st = null;
    try { st = writeStatus_(getHub_(), 'آزمون'); } catch (e) {}
    global.readExistingHealth_ = real;
    okH('۱۰.۱۲ `healthStale` بی خواندنِ تازه ساخته می‌شود — یک بار، نه دو',
        n === 1 && !!st && !!st.healthStale, 'شمارِ خواندن: ' + n);
  }

  stamp(dayStr(1) + ' 10:08', 'پایان @ 41ث');
}

console.log('\n══ ۱۵) ستونِ سبکِ تصویر — از همان دری که تولید وارد می‌شود (۷.۹۶) ══');
{
  const okS = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); };
  /* ══ چرا این بند این‌جاست و نه در مجموعهٔ یوتیوب ══
   * §۵۵-ب آن‌جا `lvStyleAudit_` را مستقیم صدا می‌زند — اتاق را می‌سنجد، نه
   * در را. برداشتنِ فراخوانش از `healthCheck` هیچ سنجه‌ای را قرمز نکرد.
   * این‌جا تنها جایی است که `healthCheck` **واقعاً اجرا می‌شود**، پس مرزِ
   * «آیا وارسیِ سبک در دورِ ۱۰ صبح انجام می‌شود» فقط همین‌جا سنجیدنی است
   * (۷.۶۲). */
  const hubS = getHub_();
  const regS = ensureTab_(hubS, CFG.SERIES_TAB, SERIES_HEADERS);
  const vS = new Array(SERIES_HEADERS.length).fill('');
  vS[SC.KEY - 1] = 'kSty'; vS[SC.NAME - 1] = 'سیرهٔ نبوی';
  vS[SC.CAT - 1] = 'تاریخ اسلام';
  regS.getRange(regS.getLastRow() + 1, 1, 1, SERIES_HEADERS.length).setValues([vS]);
  const rowS = regS.getLastRow();

  const hS = healthCheck();
  const cell = String(regS.getRange(rowS, SC.LVSTYLE).getValue() || '');
  /* ══ از ۸٫۱۸ مقدارِ پرشده «خودکار» است، نه یک سبکِ منجمد ══
     ادعا همان است (دورِ ۱۰ صبح خانهٔ خالی را پر می‌کند)، ولی تا ۸٫۱۷ همان
     پرکردن درِ «خودکار» را بی‌صدا می‌بست: پیشنهادِ regex شبِ اول می‌نشست و
     برای همیشه می‌ماند، پس انتخابِ مدل هرگز به مجموعه‌ای که او دستش نزده
     نمی‌رسید. دوباره نشانه‌گیری شد، نه حذف (۷٫۶۸). */
  okS('۱۵.۱ دورِ ۱۰ صبح خانهٔ خالیِ سبک را «خودکار» می‌کند، نه یک سبکِ منجمد',
      cell === 'خودکار', 'خانه: «' + cell + '»');
  /* ══ ادعا را بسنج، نه نثرِ نویسنده را (۷٫۶۹) ══
     نگارشِ قبلی عبارتِ «سبکِ تصویر برای» را پین کرده بود، پس وقتی ۸٫۱۸ متن را
     **درست‌تر** کرد روی کدِ سالم سرخ شد. ادعای واقعی این است: این خبر در
     **یادداشت‌ها** می‌آید نه در مسئله‌ها، و شمارش را با خودش می‌برد. */
  const lvNote = (hS.notes || []).filter(x => String(x).indexOf('سبکِ تصویر') !== -1);
  okS('۱۵.۲ و در یادداشت‌های همان گزارش اعلامش می‌کند — وگرنه کسی نمی‌فهمد چه شد',
      lvNote.length === 1 && /[۰-۹]/.test(lvNote[0]) &&
      !(hS.problems || []).some(x => String(x).indexOf('سبکِ تصویر') !== -1 &&
                                     String(x).indexOf('خوانده نشد') === -1),
      (lvNote[0] || 'یادداشتی نبود').slice(0, 90));

  /* و خانهٔ دستِ آدم در همان دور هم دست نمی‌خورد. */
  regS.getRange(rowS, SC.LVSTYLE).setValue('آبرنگِ گرم');
  healthCheck();
  okS('۱۵.۳ و خانهٔ دست‌نویس در دورِ بعدی هم دست نمی‌خورد',
      String(regS.getRange(rowS, SC.LVSTYLE).getValue()) === 'آبرنگِ گرم');

  /* ۱۵.۴ — **«ارتقایی داد گزارش بده»، از همان دری که تولید وارد می‌شود.**
   * §۵۶ مجموعهٔ یوتیوب `lvUpgrade_` را مستقیم صدا می‌زند — اتاق را می‌سنجد،
   * نه در را — پس برداشتنِ فراخوانش از `healthCheck` هیچ‌چیز را قرمز نکرد.
   * این خط باید **هر روز** در یادداشت‌های همان گزارش باشد، و باید صریح
   * بگوید ایراد نیست، وگرنه اعتمادِ خواننده به مسئله‌های واقعی را می‌خورد. */
  const hU = healthCheck();
  const up = (hU.notes || []).filter(x => String(x).indexOf('فرصتِ ارتقا') !== -1);
  okS('۱۵.۴ خطِ «فرصتِ ارتقا» در یادداشت‌های همان گزارشِ ۱۰ صبح می‌آید',
      up.length === 1 && up[0].indexOf('ایراد نیست') !== -1,
      up.length ? up[0].slice(0, 90) : 'نیامد');
  okS('۱۵.۵ و در مسئله‌ها نمی‌آید — فرصت، خرابی نیست',
      (hU.problems || []).every(x => String(x).indexOf('فرصتِ ارتقا') === -1));
}

console.log('\n=== ۱۶) کارنامهٔ قابلیت‌ها: «روشن است» با «کار می‌کند» یکی نیست (۸.۰۵) ===');
{
  let p16 = 0;
  const ok16 = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); p16++; };

  /* ══ چرا این بند هست ══
   * «حتی ممکن خیلی گزینه‌های که اضافه کردی استفاده نکنم تا مدت‌ها، ولی ناظر
   * باید به عملکردش توجه کنه و فقط کدها رو نبینه و اجرا کنه و ببینه همه
   * سیم‌کشی‌ها و گزینه‌ها و قابلیت‌ها درست کار می‌کنه یا نه» — و بعد:
   * «فقط حرفم برای این ویدیو و .. نبود بلکه همه موارد توی پروژه.» */

  /* ۱۶.۱ — **سیم‌کشیِ خودِ کارنامه** اول سنجیده می‌شود، چون این همان عیبی
     بود که در نگارشِ اولِ همین جدول واقعاً افتاد: `EMB_ENABLED` نوشته بودم و
     کلیدِ واقعی `EMB_ON` است. بی این وارسی، آن قابلیت برای همیشه «خاموش»
     گزارش می‌شد و هیچ‌جا صدا درنمی‌آمد — بدترین شکلِ خرابی در این پرونده:
     نامی درست، جایی درست، و هیچ سنجشی. */
  const stC = writeStatus_(hub, 'کارنامه');
  const cap0 = stC.capabilities;
  ok16('۱۶.۱ سیم‌کشیِ هر ردیفِ کارنامه درست است — کلیدِ CFG و کلیدِ شاهد هر دو وجود دارند',
       !!cap0 && cap0.wiring.length === 0,
       cap0 ? (cap0.wiring.join(' | ') || 'بی‌عیب') : 'کارنامه ساخته نشد');

  ok16('۱۶.۱-ب و کارنامه واقعاً در _STATUS.json می‌نشیند، نه فقط حساب می‌شود',
       (function () {
         const ff = global.__ROOT_FOLDER._files.find(x => x.getName() === '_STATUS.json');
         const pj = JSON.parse(ff.getBlob().getDataAsString());
         return !!pj.capabilities && pj.capabilities.n === (CFG.CAPABILITIES || []).length;
       })(), 'n=' + (cap0 && cap0.n));

  /* ۱۶.۲ — و کلیدی که در `CFG` نیست **به نام** گزارش می‌شود، نه به‌عنوان
     «خاموش». این مرز کلِ ارزشِ جدول است. */
  {
    const keep = CFG.CAPABILITIES;
    CFG.CAPABILITIES = [{ key: 'ghost', name: 'قابلیتِ خیالی', at: 'music', sw: 'NO_SUCH_KEY' }];
    const c = capStatus_(stC);
    ok16('۱۶.۲ کلیدِ نبوده در CFG «سیم‌کشی» است، نه «خاموش»',
         c.wiring.length === 1 && c.off === 0 &&
         c.wiring[0].indexOf('NO_SUCH_KEY') !== -1 && c.ok === false,
         c.rows[0].verdict + ' — ' + (c.wiring[0] || ''));

    CFG.CAPABILITIES = [{ key: 'ghost2', name: 'شاهدِ خیالی', at: 'noSuchStatusKey' }];
    const c2 = capStatus_(stC);
    ok16('۱۶.۲-ب شاهدِ نبوده در _STATUS.json هم «سیم‌کشی» است و نامش گفته می‌شود',
         c2.wiring.length === 1 && c2.wiring[0].indexOf('noSuchStatusKey') !== -1 &&
         c2.ok === false, c2.wiring[0] || 'نگفت');

    /* ۱۶.۳ — و «شاهد خوانده نشد» (`null`) با «شاهد وجود ندارد» یکی نیست:
       اولی نامعلوم است و ایراد نیست؛ دومی سیم‌کشیِ خراب است و ایراد است.
       قاطی کردنشان یعنی یک شاهدِ خراب کلِ جدول را بی‌اعتبار می‌کند (۷٫۵۷). */
    const stNull = { music: null };
    CFG.CAPABILITIES = [{ key: 'g3', name: 'شاهدِ خوانده‌نشده', at: 'music' }];
    const c3 = capStatus_(stNull);
    ok16('۱۶.۳ «شاهد خوانده نشد» نامعلوم است، نه سیم‌کشیِ خراب — و ok را پایین نمی‌آورد',
         c3.unknown.length === 1 && c3.wiring.length === 0 && c3.ok === true,
         c3.rows[0].verdict);
    CFG.CAPABILITIES = keep;
  }

  /* ══ ۱۶.۳-ب — «کاری نرسیده» با «کار نمی‌کند» یکی نیست (۸.۳۵) ══
     مرورِ مجموعه یک بار در عمرِ هر مجموعه ساخته می‌شود. با آخرین اثرِ ۲۵ روز
     پیش و صفِ خالی، «سالم» است؛ همان آخرین اثر با یک مرورِ منتظر در صف،
     «بی‌اثر» است. شاهد همان شیئی است که `recapStatus_` می‌سازد. */
  {
    const keep = CFG.CAPABILITIES;
    const row = (CFG.CAPABILITIES || []).filter(x => x.key === 'recap')[0];
    CFG.CAPABILITIES = [row];
    const old = '2026-01-01 10:00';
    const cIdle = capStatus_({ recap: { line: 'مرور', ok: true, n: 2, queued: 0, at: old } });
    const cDue = capStatus_({ recap: { line: 'مرور', ok: true, n: 2, queued: 1, at: old } });
    ok16('۱۶.۳-ب مرور با صفِ خالی «کاری نرسیده» است و ok را پایین نمی‌آورد؛ با کارِ منتظر «بی‌اثر» است',
         !!row && row.due === 'queued' &&
         cIdle.rows[0].verdict === 'کاری نرسیده' && cIdle.ok === true && cIdle.idle.length === 0 &&
         cDue.rows[0].verdict === 'روشن ولی بی‌اثر' && cDue.ok === false,
         cIdle.rows[0].verdict + ' / ' + cDue.rows[0].verdict);
    CFG.CAPABILITIES = keep;
  }

  /* ══ ۱۶.۴ — سه حالتِ جدا: خاموش / کار می‌کند / روشن ولی بی‌اثر ══
     و «خاموش» **نباید** `ok` را پایین بیاورد: هشداری که برای تصمیمِ خودِ
     صاحبِ برنامه بزند، هشداری است که یاد می‌گیرند نخوانند. */
  {
    const keep = CFG.CAPABILITIES, keepSw = CFG.MUSIC_AUTO;
    const now = nowStr_();
    const old = (function () {
      const d = new Date(Date.now() - 40 * 86400000);
      const p = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' 03:00';
    })();
    const stF = { fresh: { at: now }, stale: { at: old } };

    CFG.CAPABILITIES = [{ key: 'w', name: 'تازه', at: 'fresh' },
                        { key: 's', name: 'کهنه', at: 'stale' }];
    const c = capStatus_(stF);
    ok16('۱۶.۴ شاهدِ تازه «کار می‌کند» و شاهدِ ۴۰روزه «روشن ولی بی‌اثر»',
         c.working === 1 && c.idle.length === 1 && c.ok === false,
         c.rows.map(r => r.name + '=' + r.verdict).join(' · '));

    CFG.MUSIC_AUTO = false;
    CFG.CAPABILITIES = [{ key: 's', name: 'کهنه ولی خاموش', at: 'stale', sw: 'MUSIC_AUTO' }];
    const c2 = capStatus_(stF);
    ok16('۱۶.۴-ب همان شاهدِ کهنه، وقتی کلیدش پایین است، «خاموش (تصمیم)» است و ایراد نیست',
         c2.off === 1 && c2.idle.length === 0 && c2.ok === true,
         c2.rows[0].verdict);
    CFG.MUSIC_AUTO = keepSw;

    /* ══ ۱۶.۴-پ — کفِ «موتورِ تازه‌نصب» ══
       نگارشِ اول این را با شاهدِ **امروز** می‌سنجید و باری نداشت: در آن حالت
       سدِ `days > idleDays` خودش جلو را گرفته، پس برداشتنِ کف هیچ چیزی را
       عوض نمی‌کرد. (و شکستنِ عمدی‌اش روی سنجهٔ قدیمیِ «روزِ سالم باید ساکت
       باشد» نشست، چون کلِ کارنامهٔ ۳۰تایی بی‌اثر می‌شد — که خودش گواهِ
       محکم‌تری است، ولی گواهِ این سنجه نیست.)
       آنچه کف واقعاً از آن محافظت می‌کند، سقفِ **بدتنظیم‌شده** است: کسی
       `CAP_IDLE_DAYS` را صفر بگذارد و موتور هر شاهدِ دیروزی را «بی‌اثر»
       بخواند. آن حالت این‌جا ساخته می‌شود. */
    const keepIdle = CFG.CAP_IDLE_DAYS;
    /* عدد **۱** است نه ۰، و دلیلش خودش یک تلهٔ ثبت‌شدهٔ همین پرونده است:
       `Number(CFG.CAP_IDLE_DAYS) || 7` صفر را می‌خورَد و ۷ می‌دهد، پس
       تنظیمِ ۰ هیچ اثری ندارد و سنجه بی‌آنکه بفهمی توخالی می‌شود — همان
       چیزی که ۷٫۲۸ با `EMB_SHARD_ROWS` و ۷٫۸۱ با `Number('')` دید.
       و روزِ شاهد **۲** است، چون کف تنها وقتی معنا دارد که سقف از کف
       کوچک‌تر شده باشد و سنِ شاهد میانِ آن دو بیفتد. */
    CFG.CAP_IDLE_DAYS = 1;                       // < CAP_FRESH_DAYS (۲)
    const y = (function () {
      const d = new Date(Date.now() - 2 * 86400000);
      const p = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' 03:00';
    })();
    CFG.CAPABILITIES = [{ key: 'w', name: 'دوروزه', at: 'y' }];
    const cY = capStatus_({ y: { at: y } });
    ok16('۱۶.۴-پ با سقفِ بدتنظیم هم، شاهدِ تازه «بی‌اثر» شمرده نمی‌شود',
         cY.rows[0].days === 2 && cY.working === 1 && cY.idle.length === 0 && cY.ok === true,
         cY.rows[0].verdict + ' · ' + cY.rows[0].days + ' روز');
    CFG.CAP_IDLE_DAYS = keepIdle;
    CFG.CAPABILITIES = keep;
  }

  /* ══ ۱۶.۴-ت — **دو قالبِ تاریخ**، نه یکی ══
     `nowStr_` می‌دهد `yyyy-MM-dd HH:mm`؛ `speakRevLog_` و `recapLog_` مستقیم
     `toISOString()` می‌نویسند که با `T` جدا می‌کند. نگارشِ اول فقط اولی را
     می‌شناخت، پس شاهدِ آن قابلیت‌ها **دیده نمی‌شد** و از بیرون شبیهِ «آن
     قابلیت کار نمی‌کند» بود. و شکستنِ عمدیِ این در محیطِ آزمون هیچ عددی را
     عوض نکرد — چون کارنامه‌های مربوطه در ماک خالی‌اند — پس این سنجه لازم
     است، وگرنه آن نیمه از تعمیر هیچ نگهبانی ندارد. */
  {
    const keep = CFG.CAPABILITIES;
    const iso = new Date().toISOString();
    CFG.CAPABILITIES = [{ key: 'i', name: 'شاهدِ ISO', at: 'i' }];
    const cI = capStatus_({ i: { at: iso } });
    ok16('۱۶.۴-ت تاریخِ ISO (با T) هم شاهد شمرده می‌شود، نه فقط قالبِ nowStr_',
         cI.working === 1 && cI.unknown.length === 0,
         cI.rows[0].verdict + ' · ' + cI.rows[0].did);

    /* ۱۶.۴-ث — و **درِ دومِ شاهد**: کارنامه‌ای که تابعِ وضعیت بیرون نمی‌دهد،
       از خودِ Script Property خوانده می‌شود. بی این، چهار قابلیت برای همیشه
       «نامعلوم» می‌ماندند در حالی که تاریخشان همان‌جا کنارِ دست بود. */
    const oldRev = global.__PROPS[PK.SPEAK_REV];
    global.__PROPS[PK.SPEAK_REV] = JSON.stringify([{ at: iso, ep: 'ت', seen: 1 }]);
    CFG.CAPABILITIES = [{ key: 'sr', name: 'با درِ دوم', at: 'i', pk: 'SPEAK_REV' }];
    const cP = capStatus_({ i: { note: 'بی هیچ تاریخی' } });
    ok16('۱۶.۴-ث شاهدی که تابعِ وضعیت بیرون نمی‌دهد، از کارنامهٔ خودش خوانده می‌شود',
         cP.working === 1 && cP.unknown.length === 0,
         cP.rows[0].verdict + ' · ' + cP.rows[0].did);
    /* و بی آن کارنامه، همان ردیف «نامعلوم» است — یعنی درِ دوم واقعاً باری
       برمی‌دارد و سنجهٔ بالا از پیش سبز نبوده. */
    delete global.__PROPS[PK.SPEAK_REV];
    ok16('۱۶.۴-ث-ب و با کارنامهٔ خالی همان ردیف «نامعلوم» است',
         capStatus_({ i: { note: 'بی هیچ تاریخی' } }).unknown.length === 1);
    if (oldRev !== undefined) global.__PROPS[PK.SPEAK_REV] = oldRev;
    CFG.CAPABILITIES = keep;
  }

  /* ۱۶.۵ — و خط **هر روز** می‌آید، حتی روزِ کاملاً سالم: سکوت را نمی‌شود
     از مرگِ سامانه تشخیص داد (۵٫۹۰). */
  {
    const hC = healthCheck();
    const all = (hC.notes || []).concat(hC.problems || []);
    const line = all.filter(x => String(x).indexOf('کارنامهٔ قابلیت‌ها') !== -1);
    ok16('۱۶.۵ خطِ کارنامه در گزارشِ ۱۰ صبح هست — در هر حالت، حتی سالم',
         line.length === 1, line[0] ? line[0].slice(0, 120) : 'نیامد');
    ok16('۱۶.۵-ب و شمارِ «کار می‌کند از کل» را می‌گوید، نه یک برچسبِ بی‌عدد',
         /\d+ از \d+/.test(line[0] || ''), line[0] ? line[0].slice(0, 60) : '');
    /* ۱۶.۵-پ — و قابلیتِ نامعلوم **نام برده می‌شود**. عددِ تنها دنبال‌کردنی
       نیست؛ همان درسی که ۸.۰۴ برای واژه‌های بی‌اعراب داد، یک بخش آن‌طرف‌تر. */
    ok16('۱۶.۵-پ قابلیتِ بی‌شاهد نام برده می‌شود، نه فقط شمرده',
         (function () {
           const c = capStatus_(stC);
           if (!c.unknown.length) return true;          // همه شاهد دارند: ادعایی نیست
           const first = c.rows.filter(r => r.verdict === 'نامعلوم')[0];
           return c.line.indexOf(first.name) !== -1;
         })(), (line[0] || '').slice(-80));
  }

  /* ══ ۱۶.۶ — و یافته، نه فقط جمله ══
     جمله‌ای در نامهٔ فردا عوض می‌شود؛ یافته نه. و کلید **به‌ازای هر قابلیت**
     است، نه یکی برای همه — وگرنه تکرار به‌عنوان تکرار دیده نمی‌شود. */
  {
    const keep = CFG.CAPABILITIES;
    const old = (function () {
      const d = new Date(Date.now() - 40 * 86400000);
      const p = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' 03:00';
    })();
    const stF = { a: { at: old }, b: { at: old } };
    CFG.CAPABILITIES = [{ key: 'aa', name: 'یکی', at: 'a' }, { key: 'bb', name: 'دومی', at: 'b' }];
    const c = capStatus_(stF);
    const n = capFindings_(hub, c);
    const sh = hub.getSheetByName(CFG.REPORT_TAB);
    const vals = sh.getLastRow() < 2 ? []
      : sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues();
    const keys = vals.map(r => r.join(' ')).filter(x => x.indexOf('capability-idle-') !== -1);
    ok16('۱۶.۶ هر قابلیتِ بی‌اثر ردیفِ خودش را دارد، نه یک ردیفِ «چند تا بی‌اثرند»',
         n === 2 && keys.length === 2, n + ' یافته · ' + keys.length + ' ردیف');
    ok16('۱۶.۶-ب و دستورش «دوباره ثبتش کن» نیست — علت خواسته می‌شود',
         keys.join(' ').indexOf('نه اینکه دوباره ثبتش کنی') !== -1);
    /* ۱۶.۶-پ — و ردیف واقعاً در صفِ `NEEDS_CODE` می‌نشیند. نگارشِ اولِ
       `capFindings_` فقط `category: 'کد'` می‌داد و ردیف با «موتور / تازه»
       می‌نشست: بیرونِ همان صفی که نسخهٔ بعدیِ کد از آن ساخته می‌شود، یعنی
       یافته‌ای که کسی را به کاری موظف نمی‌کرد (۷٫۱۸/۷٫۱۹). */
    ok16('۱۶.۶-پ ردیف در صفِ «نیازمند تعویضِ کد» می‌نشیند، نه در «تازه»',
         keys.every(x => x.indexOf(RST.NEEDS_CODE) !== -1),
         keys[0] ? keys[0].slice(0, 70) : '');
    CFG.CAPABILITIES = keep;
  }

  console.log('  ✅ بندِ ۱۶: ' + p16 + ' سنجه');
}

console.log('\n=== ۱۷) شاهدِ اجرا: تریگری که ترکید و هیچ‌جا صدا درنیامد (۸.۱۱) ===');
/* صاحبِ برنامه ۱ اکتبر سطرِ قرمزِ `ytPublishTick` را **شانسی** در صفحهٔ
   Executions دید و پرسید «اگه نمی‌دیدم چی؟ ناظر پس چی کار می‌کنه؟».
   جوابِ راست آن روز: هیچ. Apps Script از درون راهی برای خواندنِ تاریخچهٔ
   اجراهای خودش نمی‌دهد، پس یک تریگرِ ترکیده هیچ ردی در موتور نمی‌گذارد.
   ۷.۴۴ این شاهد را فقط برای کارِ شبانه ساخت.

   و شاهد عمداً در Script Properties است، نه در تبِ سیاهه: چیزی که آن روز
   شکست، **خودِ شیت** بود. */
{
  let p17 = 0;
  const ok17 = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); p17++; };

  const P = () => PropertiesService.getScriptProperties();
  P().deleteProperty(PK.RUN_AT);
  P().deleteProperty(PK.RUN_LAST);

  /* ۱۷.۱ — مهر **پیش از** کار نوشته می‌شود. این تمامِ نکته است: اجرایی که
     گوگل سرِ شش دقیقه بکُشد به هیچ خطِ پایانی نمی‌رسد، پس شاهدی که در
     پایان نوشته شود دقیقاً در حالتی که لازم است وجود ندارد (۷.۴۴). */
  runEnter_('fakeTrigger');
  const mid = JSON.parse(P().getProperty(PK.RUN_AT) || '{}');
  ok17('۱۷.۱ مهر پیش از کار نوشته می‌شود، پس از کشته‌شدنِ اجرا جان به در می‌برد',
       !!mid.fakeTrigger && !!mid.fakeTrigger.ts,
       JSON.stringify(mid));

  /* ۱۷.۲ — و تا وقتی اجرا زنده است، هشدار نمی‌دهد. */
  const fresh = runStuck_();
  ok17('۱۷.۲ اجرای تازه «ناتمام» شمرده نمی‌شود — هشدار برای حالتِ سالم خوانده نمی‌شود',
       fresh.items.length === 0 && fresh.line.indexOf('✅') === 0, fresh.line);

  /* ۱۷.۳ — پایانِ تمیز مهر را برمی‌دارد. */
  runExit_('fakeTrigger', 'تمام');
  ok17('۱۷.۳ پایانِ تمیز مهر را برمی‌دارد',
       runStuck_().items.length === 0 &&
       !!JSON.parse(P().getProperty(PK.RUN_LAST) || '{}').fakeTrigger);

  /* ۱۷.۴ — و اجرایی که مُرد، دیده می‌شود. مرز از سقفِ خودِ گوگل می‌آید:
     شش دقیقه حداکثرِ یک اجراست، پس ۱۵ دقیقه یعنی قطعاً مرده. */
  runEnter_('deadTrigger');
  const dead = runStuck_(new Date().getTime() +
                         (Number(CFG.RUN_STUCK_MIN) + 1) * 60000);
  ok17('۱۷.۴ اجرایی که شروع شد و تمام نشد، به نام گزارش می‌شود',
       dead.items.length === 1 && dead.items[0].fn === 'deadTrigger' &&
       dead.line.indexOf('deadTrigger') !== -1 && dead.line.indexOf('❌') === 0,
       dead.line);

  /* ۱۷.۵ — **و از درِ تولید دیده می‌شود، نه با صدا زدنِ خودِ تابع** (۷.۶۲).
     ادعا این است که `healthCheck` خودش این را در مسئله‌ها می‌آورد. */
  {
    const keepNow = global.runStuck_;
    global.runStuck_ = function () {
      return { items: [{ fn: 'ytPublishTick', at: '2026-10-01 08:57', mins: 99 }],
               line: '❌ اجرای ناتمام: ytPublishTick (۹۹ دقیقه پیش شروع شد و تمام نشد)' };
    };
    const hh = healthCheck();
    global.runStuck_ = keepNow;
    ok17('۱۷.۵ healthCheck خودش اجرای ناتمام را در مسئله‌ها می‌آورد',
         (hh.problems || []).some(x => String(x).indexOf('ytPublishTick') !== -1),
         JSON.stringify((hh.problems || []).filter(x => String(x).indexOf('ناتمام') !== -1)));

    const sh = hub.getSheetByName(CFG.REPORT_TAB);
    const vals = sh.getLastRow() < 2 ? []
      : sh.getRange(2, 1, sh.getLastRow() - 1, REPORT_HEADERS.length).getValues();
    const rows = vals.map(r => r.join(' ')).filter(x => x.indexOf('run-died') !== -1);
    ok17('۱۷.۵-ب و یافته‌اش در صفِ «نیازمند تعویضِ کد» می‌نشیند — یک جملهٔ ایمیل فردا عوض می‌شود، یافته نه',
         rows.length >= 1 && rows[0].indexOf(RST.NEEDS_CODE) !== -1,
         rows[0] ? rows[0].slice(0, 80) : 'ردیفی ننشست');
  }

  /* ۱۷.۶ — و سطرِ سالم **هر روز** گفته می‌شود: سکوت را نمی‌شود از کوری
     تشخیص داد (۵.۹۱). */
  P().deleteProperty(PK.RUN_AT);
  const hOk = healthCheck();
  ok17('۱۷.۶ روزی که همه‌چیز سالم است هم یک سطر دارد',
       (hOk.notes || []).some(x => String(x).indexOf('هیچ اجرای ناتمامی نیست') !== -1),
       JSON.stringify((hOk.notes || []).filter(x => String(x).indexOf('ناتمام') !== -1)));

  /* ۱۷.۷ — و تریگرهای واقعی همه مهر می‌زنند. فهرست از `wantedTriggers_`
     خوانده می‌شود، نه دست‌نویس: تریگرِ بعدی که اضافه شود، همین‌جا گرفته
     می‌شود (۵.۹۵ — فهرستِ دست‌نویس کهنه می‌شود). */
  {
    const src = fs.readdirSync('src').filter(f => /\.gs$/.test(f))
      .map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
    /* بدنه با تطبیقِ آکولاد برداشته می‌شود، نه با یک پنجرهٔ ثابت: نگارشِ اول
       ۲۶۰۰ نویسه می‌خواند و پنج تریگرِ بلند را «بی‌شاهد» می‌دید — یعنی سنجه
       برای کدِ **درست** سرخ می‌شد، و ارزان‌ترین راهِ سبزکردنش بزرگ‌کردنِ
       همان عددِ دل‌بخواهی بود (۷.۵۹). */
    const bodyOf = (src, fn) => {
      const i = src.indexOf('function ' + fn + '(');
      if (i === -1) return '';
      const ob = src.indexOf('{', i);
      let d = 0;
      for (let j = ob; j < src.length; j++) {
        if (src[j] === '{') d++;
        else if (src[j] === '}') { d--; if (!d) return src.slice(ob, j + 1); }
      }
      return '';
    };
    const miss = wantedTriggers_().map(t => t.fn).filter(function (fn) {
      const body = bodyOf(src, fn);
      return !body ||
             body.indexOf("runEnter_('" + fn + "')") === -1 ||
             body.indexOf("runExit_('" + fn + "')") === -1;
    });
    ok17('۱۷.۷ هر تریگرِ زمان‌بندی‌شده شاهدِ خودش را دارد',
         miss.length === 0, miss.length ? ('بی‌شاهد: ' + miss.join('، ')) : 'همه');
  }

  /* ══ ۱۷.۸ — «نتوانستم بخوانم» با «پاک شده» یکی گرفته شده بود ══
     ۱ اکتبر سه بار `Service Spreadsheets timed out` افتاد. `getHub_` هر
     خطایی را «حذف شده؛ دوباره می‌سازیم» می‌خواند — یعنی یک وقفهٔ گذرای
     سرویس موتور را به مسیرِ ساختنِ هابِ **تازه** می‌فرستاد. آن روز نجات
     پیدا کرد چون فایل در پوشه پیدا شد؛ اگر درایو هم کند بود، ۲۹ مگابایت
     داده رها می‌شد و `PK.HUB_ID` به یک هابِ خالی می‌رفت — بی هیچ خطایی.

     این شکستن اولین بار **هیچ‌جا ننشست**، یعنی سنجه‌ای نداشت. */
  {
    const realOpen = SpreadsheetApp.openById;
    const madeBefore = (global.__ROOT_FOLDER._files || []).length;
    let tries = 0;
    SpreadsheetApp.openById = function () {
      tries++;
      throw new Error('Service Spreadsheets timed out while accessing document with id X');
    };
    let threw = '';
    try { getHub_(); } catch (e) { threw = String(e.message || e); }
    SpreadsheetApp.openById = realOpen;
    ok17('۱۷.۸ خطای گذرای شیت پرتاب می‌شود — هابِ تازه ساخته نمی‌شود',
         /timed out/i.test(threw) &&
         (global.__ROOT_FOLDER._files || []).length === madeBefore,
         'پرتاب: ' + (threw || '—') + ' · فایل‌ها: ' + madeBefore + ' ⇒ ' +
         (global.__ROOT_FOLDER._files || []).length);
    ok17('۱۷.۸-ب و پیش از تسلیم چند بار تلاش می‌کند',
         tries === Math.max(1, Number(CFG.SHEETS_RETRY) || 3),
         tries + ' تلاش برای سقفِ ' + CFG.SHEETS_RETRY);

    /* و مرزِ مقابل: خطای **واقعی** فوراً بالا می‌رود و تلاشِ دوباره نمی‌خورد —
       وگرنه هر شناسهٔ غلط سه برابر وقت می‌گیرد و علت پنهان می‌شود. */
    let hard = 0;
    SpreadsheetApp.openById = function () { hard++; throw new Error('Access denied'); };
    try { getHub_(); } catch (e) {}
    SpreadsheetApp.openById = realOpen;
    ok17('۱۷.۸-پ ولی خطای واقعی تلاشِ دوباره نمی‌خورد',
         hard === 1, hard + ' تلاش');
  }

  console.log('  ✅ بندِ ۱۷: ' + p17 + ' سنجه');
}

console.log('\n=== ۱۸) ایرادِ مزمن: «گزارش‌شده» با «رفع‌شده» یکی نیست (۸.۳۲) ===');
{
  let p18 = 0;
  const ok18 = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d ? ' — ' + d : ''));
    if (!c) throw new Error('FAILED: ' + n); p18++; };
  /* ══ ۱ تا ۳ اکتبر ══
   * ایمیلِ ۱۰ صبح هر روز همان ایرادها را نوشت — اعراب بالای سقف، ۷۱ موسیقیِ
   * نشنیده، سه ویدئوی گیرکرده — و ناظر هر روز نوشت «یافتهٔ تازه‌ای نبود».
   * فهرستِ امروز حافظه نداشت. این بند روزها را **واقعاً** جلو می‌بَرد (ساعتِ
   * سراسری، نه رکوردِ دست‌نوشتهٔ «دیروز»: حالتی که تولید نمی‌سازد چیزی را
   * ثابت نمی‌کند — ۷.۲۲) و از درِ خودِ `healthCheck` وارد می‌شود. */
  const RealDate = Date;
  const onDay = (k, fn) => {
    const shift = k * 86400000;
    global.Date = class extends RealDate {
      constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + shift); }
      static now() { return RealDate.now() + shift; }
    };
    try { return fn(); } finally { global.Date = RealDate; }
  };
  const P = global.__PROPS;
  delete P[PK.HEALTH_CHRONIC];
  const snap = () => JSON.parse(global.__ROOT_FOLDER._files.find((x) => x.getName() === '_STATUS.json')
                                  .getBlob().getDataAsString()).health || {};

  ok18('۱۸.۱ امضا عدد را نمی‌بیند — «۷۱ قطعه» و «۷۳ قطعه» یک ایرادند',
       healthSig_('موسیقی — شنیده‌نشده: ۷۱ قطعه') === healthSig_('موسیقی — شنیده‌نشده: ۷۳ قطعه') &&
       healthSig_('آخرین پشتیبان 30 ساعت پیش — 2026-10-03 03:04') ===
       healthSig_('آخرین پشتیبان 54 ساعت پیش — 2026-10-04 03:04') &&
       healthSig_('الف ۵') !== healthSig_('ب ۵'));

  const h1 = onDay(30, () => healthCheck());
  const s1 = snap();
  ok18('۱۸.۲ روزِ اول هیچ ایرادی مزمن نیست',
       !/^ایرادهای مزمن/.test(String(h1.problems[0] || '')) && (s1.chronic || []).length === 0,
       h1.problems.length + ' ایراد · مزمن ' + (s1.chronic || []).length);
  onDay(31, () => healthCheck());
  const h3 = onDay(32, () => healthCheck());
  const s3 = snap();
  const ch3 = s3.chronic || [];
  ok18('۱۸.۳ سه روزِ پیاپی: بالای ایمیل و در `_STATUS.json`، قدیمی‌ترین اول',
       /^ایرادهای مزمن/.test(String(h3.problems[0] || '')) && ch3.length >= 1 &&
       ch3.some((c) => c.days === 3) && ch3.every((c, i) => i === 0 || String(ch3[i - 1].since) <= String(c.since)),
       auditCut_(String(h3.problems[0] || ''), 110) + ' · ' + ch3.length + ' مزمن');
  ok18('۱۸.۴ «⟨شما⟩» و خودِ سطرِ مزمن در شمارش نمی‌آیند',
       ch3.every((c) => String(c.text).indexOf(HY_) !== 0 && String(c.text).indexOf('ایرادهای مزمن') !== 0));
  const rt = getHub_().getSheetByName(CFG.REPORT_TAB);
  const rows = rt.getRange(2, 1, Math.max(1, rt.getLastRow() - 1), rt.getLastColumn()).getValues();
  const chRows = rows.filter((r) => r.join(' ').indexOf('ایرادِ مزمن (') !== -1);
  ok18('۱۸.۵ از روزِ سوم یافتهٔ کد می‌شود — در صفی که نسخهٔ بعد از آن ساخته می‌شود',
       chRows.length >= 1 && chRows.some((r) => r.join(' ').indexOf(ROWNER_CODE) !== -1),
       chRows.length + ' ردیف');

  /* اجرای دوم در همان روز یک روز است، نه دو — وگرنه هر تریگرِ دستی عدد را بالا می‌بَرد. */
  onDay(32, () => healthCheck());
  const ch3b = snap().chronic || [];
  /* هر امضا جدا سنجیده می‌شود، نه بیشینه: نگارشِ اول فقط بیشینه را می‌سنجید و
     شکستنِ عمدیِ همین سد سبز ماند — یک امضا که اتفاقی سه روز ماند، هشت امضای
     بازنشسته را پوشاند. */
  const d3 = {}; ch3.forEach((c) => { d3[c.sig] = c.days; });
  ok18('۱۸.۶ اجرای دوم در همان روز روز نمی‌شمارد — و زنجیره را هم از نو شروع نمی‌کند',
       ch3b.length === ch3.length && ch3b.every((c) => d3[c.sig] === c.days),
       ch3.map((c) => c.days).join(',') + ' ⇒ ' + ch3b.map((c) => c.days).join(','));

  /* و ردیفِ صف تکراری نمی‌شود: فردا همان کلید «تکرار» می‌خورد. */
  onDay(33, () => healthCheck());
  const rows2 = rt.getRange(2, 1, Math.max(1, rt.getLastRow() - 1), rt.getLastColumn()).getValues()
                  .filter((r) => r.join(' ').indexOf('ایرادِ مزمن (') !== -1);
  ok18('۱۸.۷ روزِ بعد ردیفِ تازه نمی‌سازد — همان ردیف تکرار می‌خورد',
       rows2.length === chRows.length, chRows.length + ' ⇒ ' + rows2.length);

  /* دو روز غیبت یعنی رفع شده؛ یک روز غیبت یعنی «سنجیده نشد» و زنجیره را نمی‌بُرد. */
  delete P[PK.HEALTH_CHRONIC];
  onDay(40, () => healthChronic_(['الف ۱', 'ب ۱']));
  onDay(42, () => healthChronic_(['الف ۲']));          // ۴۱ غایب — زنجیره نمی‌بُرد
  const g1 = onDay(43, () => healthChronic_(['الف ۳']));
  const g2 = onDay(46, () => healthChronic_(['الف ۴', 'ب ۲']));   // ۴۴ و ۴۵ غایب — بریده
  ok18('۱۸.۸ یک روز غیبت زنجیره را نگه می‌دارد؛ دو روز می‌بُرد',
       g1.list.length === 1 && g1.list[0].days === 3 && g2.n === 0 && /هیچ ایرادی/.test(g2.line),
       JSON.stringify(g1.list.map((c) => c.days)) + ' · ' + g2.line);
  delete P[PK.HEALTH_CHRONIC];
  console.log('  ✅ بندِ ۱۸: ' + p18 + ' سنجه');
}
