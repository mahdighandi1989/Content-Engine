/* Status file + health alerting */
const fs = require('fs');
const { Spread } = require('./mock.js');
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs'];
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

console.log('\n=== ۳) بعد از تولید قسمت → نباید هشدار بدهد ===');
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
console.log('\n✅ آزمون سلامت گذشت.');
