/* Status file + health alerting */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs'];
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

  const P = [], N = [];
  watchdog_({ reports: { lastReportAt: '1400/01/01 00:00' } }, P, N);
  T('۱۲.۱ ناظرِ خوابیده ایراد می‌شود، نه یادداشت',
    P.some(x => x.indexOf('ناظرِ روزانه') !== -1), P.join(' | ').slice(0, 120));
  T('۱۲.۲ و چاره‌اش گفته می‌شود، نه فقط خبرش', P.some(x => x.indexOf('Cowork') !== -1));
  T('۱۲.۳ و کارِ صاحبِ برنامه علامت می‌خورد', P.every(x => x.indexOf(HY_) === 0), P[0]);

  const P2 = [], N2 = [];
  const today = Utilities.formatDate(new Date(), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  watchdog_({ reports: { lastReportAt: today } }, P2, N2);
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

console.log('\n✅ آزمون سلامت گذشت.');
