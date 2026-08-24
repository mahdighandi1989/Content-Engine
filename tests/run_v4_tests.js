/* v3.3: spoken date, thread-first curation with callbacks, single merged audio */
const { outPath } = require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs=require('fs');const{Spread}=require('./lib/mock.js');
const F=['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs','05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs'];
let src='';for(const f of F)src+='\n'+fs.readFileSync('src/'+f,'utf8');(0,eval)(src);
const VH=['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','d','e','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی','f','تحلیل محتوا (JSON)','g','h','i','خلاصه اجرایی','وضعیت'];
const PH=['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','استخراج متن (JSON)','d','e','تحلیل محتوا (JSON)','f','g','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];
function mk(id,h,rows){const ss=new Spread('s',id);const sh=ss.insertSheet('S1');sh._d.push(h.slice());rows.forEach(r=>sh._d.push(r));sh._max=Math.max(1000,sh._d.length+10);global.__SS[id]=ss;return ss;}
const V=[],P=[];
// هر آیتم باید حرفِ خودش را داشته باشد، وگرنه حذف تکراریِ محتوایی درست عمل
// می‌کند و همه را یکی می‌شمارد (همان‌طور که در دادهٔ واقعی هم باید بکند).
const WORDS=['مداحی','روضه','دعا','زیارت','مسجد','هیئت','نوحه','مرثیه','قرآن','تفسیر',
 'نماز','روزه','صدقه','توسل','شفاعت','معنویت','اخلاص','توبه','یاد','ذکر','سکوت','اشک',
 'محراب','منبر','امام','زائر','عزادار','پرچم','علم','چراغ'];
function vary(i,n){const o=[];for(let k=0;k<n;k++){
 const a=WORDS[(i*7+k*3)%WORDS.length],b=WORDS[(i*11+k*5+4)%WORDS.length],c=WORDS[(i*13+k*2+9)%WORDS.length];
 o.push('در این بخش '+a+' با '+b+' همراه می‌شود و '+c+' شمارهٔ '+(i*100+k)+' را می‌سازد.');}
 return o.join(' ');}
for(let i=0;i<120;i++)V.push([`10/18/2025 ${String(i%24).padStart(2,'0')}:00:00`,'V'+i,'o','n','https://drive.google.com/file/d/V'+i+'/view','[]','{}','{}',vary(i,4),'وایب','تخصصی','{}',JSON.stringify({Genre:'مذهبی، مداحی',Main_Topic:'موضوع ویدیو '+i,Key_Message:'پیام کلیدی طولانی برای گرفتن امتیاز کافی '+i}),'','','',vary(i+900,5),'SUCCESS']);
for(let i=0;i<120;i++)P.push([`10/21/2025 ${String(i%24).padStart(2,'0')}:00:00`,'P'+i,'o','n','https://drive.google.com/file/d/P'+i+'/view','{}',JSON.stringify({Original_Text:vary(i+2000,4)}),'[]','[]',JSON.stringify({Category:'مذهبی، معنوی',Main_Subject:'موضوع عکس '+i,Key_Message:'پیام عکس با طول کافی '+i,Notable_Elements:'ن'}),'{}','[]','وایب',vary(i+3000,5),'ویژه','SUCCESS']);
mk(CFG.VIDEO_SHEET_ID,VH,V); mk(CFG.PHOTO_SHEET_ID,PH,P);
// __AUTO_SOURCES__ : شیت‌های تازه در این آزمون خالی‌اند
for (const __s of CFG.SOURCES) if (!global.__SS[__s.id]) { const __ss = new Spread('s', __s.id); __ss.insertSheet('S1'); global.__SS[__s.id] = __ss; }
global.__PROPS['GEMINI_API_KEY']='TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN']='1:FAKE'; global.__PROPS['TELEGRAM_CHAT_ID']='-100';
const tg=[]; let curatorPrompts=[], writerPrompts=[];
global.__STUB=function(url,body){
  if(url.indexOf('/v1beta/models?')!==-1)return{code:200,json:{models:[{name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-2.5-flash-preview-tts',supportedGenerationMethods:['generateContent']}]}};
  if(url.indexOf('api.telegram.org')!==-1){tg.push({m:url.split('/').pop(),body});return{code:200,json:{ok:true,result:{username:'b'}}};}
  const t=body.contents?body.contents[0].parts[0].text:'';
  if (body.contents && body.contents[0].parts.some(x => x.inlineData)) {
    return { code: 200, json: { candidates: [{ content: { parts: [{
      text: 'متنِ سالمِ برنامه' }] } }] } };
  }
  if(t.indexOf('سردبیرِ یک برنامهٔ رادیویی')!==-1){
    curatorPrompts.push(t);
    const cand=[...t.matchAll(/- id: (\S+) \| نامزد/g)].map(m=>m[1]);
    const refs=[...t.matchAll(/- id: (\S+) \| پخش‌شده/g)].map(m=>m[1]);
    return{code:200,json:{candidates:[{content:{parts:[{text:JSON.stringify({
      threads:[{thread:'نخ اول',strength:'محکم',memberIds:cand.slice(0,10)}],
      theme:'پیوندِ آزمایشی', connection:'واژهٔ مشترکِ «راه»',
      chosen:cand.slice(0,10).map(id=>({id,role:'نمونهٔ عینی'})),
      referenceIds:refs.slice(0,3), rejected:cand.slice(10,18)})}]}}]}};}
  if(url.indexOf('tts')!==-1){const b=Buffer.alloc(500000);for(let i=0;i<b.length;i+=2)b.writeInt16LE(700,i);
    return{code:200,json:{candidates:[{content:{parts:[{inlineData:{data:b.toString('base64')}}]}}]}};}
  if(t.indexOf('اعراب‌گذاریِ کامل')!==-1&&t.indexOf('فیلد v')!==-1){
    const piece=t.split('\n\n').slice(1).join('\n\n').replace(/\n\nیادآوری:[\s\S]*$/,'');
    return{code:200,json:{candidates:[{content:{parts:[{text:JSON.stringify({v:piece.replace(/([\u0622-\u064A\u066E-\u06D5])/g,'$1َ')})}]}}]}};}
  // پرسشِ «این متن چه صدایی می‌خواهد؟» (۵٫۷۵) نباید در فهرستِ پرامپتِ
  // نویسنده بنشیند — همان تلهٔ اعراب‌گذاری، این بار برای افکت.
  if(t.indexOf('آیا جایی در آن هست که یک **صدای کوتاه**')!==-1){
    return{code:200,json:{candidates:[{content:{parts:[{text:JSON.stringify({wants:[]})}]}}]}};}
  writerPrompts.push(t);
  const ids=[...t.matchAll(/شناسه: (\S+)/g)].map(m=>m[1]);
  return{code:200,json:{candidates:[{content:{parts:[{text:JSON.stringify({title:'قسمت آزمایشی',
    hook:'سلام. امروز '+todayWords_().weekday+' است، '+todayWords_().jalali+'. و بعد قلاب.',
    sections:[0,1,2,3].map(i=>({heading:'ب'+i,narration:'جملهٔ روایی برای آزمون. '.repeat(20).trim(),tone:'آرام و همدلانه',sourceIds:ids.slice(i*2,i*2+2)})),
    outro:'پایان.',summary:'خ.',tags:['الف']})}]}}]}};
};
const say=(...a)=>console.log(...a);
let g=0;while(g++<30){syncCatalog();if(parseInt(global.__PROPS['CURSOR_PHOTO']||'0',10)>=120)break;}
const hub=getHub_();

say('=== ۱) تاریخ به حروف ===');
const w=todayWords_();
say('  ',w.spoken);
if(/[0-9۰-۹]/.test(w.spoken)) throw new Error('date contains digits');
say('  بدون هیچ رقم ✅');

say('\n=== ۲) قسمت اول: نخ + سهم عکس + تاریخ در قلاب ===');
CFG.MAX_WAV_BYTES = 600000;   // هر تکه یک بخش شود تا ادغام واقعاً آزمایش شود
let r=produceEpisode(); let d=0;
while(global.__PROPS['PENDING_EPISODE']&&d++<90){const x=produceEpisodeContinue(); if(x)r=x;}
const pod=hub.getSheetByName(CFG.TAB_PODCASTS);
let row=pod.getRange(pod.getLastRow(),1,1,PODCAST_HEADERS.length).getValues()[0];
say('  ویدیو',row[4],'عکس',row[5],'| مدت',row[6]);
if(Number(row[5])<CFG.MIN_PHOTO_ITEMS) throw new Error('photo quota broken');
const wp=writerPrompts[0];
say('  تاریخ در پرامتِ نویسنده:',wp.indexOf(w.jalali)!==-1?'✅':'❌');
say('  قاعدهٔ «چسبِ کلامی ممنوع»:',wp.indexOf('چسبِ کلامی ممنوع')!==-1?'✅':'❌');
say('  نخ و پیوند به نویسنده رسید:',wp.indexOf('پیوندِ آزمایشی')!==-1&&wp.indexOf('واژهٔ مشترکِ «راه»')!==-1?'✅':'❌');
if(wp.indexOf(w.jalali)===-1||wp.indexOf('پیوندِ آزمایشی')===-1) throw new Error('date/theme not in writer prompt');

say('\n=== ۳) فایل صوتی یکجا ===');
const wavs=global.__FILES.filter(f=>f.getName().endsWith('.wav'));
const whole=wavs.filter(f=>f.getName().indexOf('کامل')!==-1);
const parts=wavs.filter(f=>f.getName().indexOf('بخش')!==-1);
say('  بخش‌ها:',parts.length,'| فایل یکجا:',whole.length, whole.length===1?'✅':'❌');
if(whole.length!==1) throw new Error('merged file missing');
const sumParts=parts.reduce((a,f)=>a+f._b._data.length-54,0);
const wholeData=whole[0]._b._data.length-54;
say('  جمع دادهٔ بخش‌ها:',sumParts,'| دادهٔ فایل یکجا:',wholeData, sumParts===wholeData?'✅ بدون از دست رفتن یک بایت':'❌');
if(sumParts!==wholeData) throw new Error('merge lost data');
const dd=whole[0]._b._data;
if(dd.slice(0,4).toString()!=='RIFF'||dd.readUInt32LE(4)!==dd.length-8) throw new Error('merged wav invalid');
say('  RIFF معتبر و اندازه درست ✅');
fs.writeFileSync(outPath('out_merged.wav'), dd);

say('\n=== ۴) تلگرام: یک فایل، نه چند تکه ===');
const audioCalls=tg.filter(c=>c.m==='sendAudio'||c.m==='sendDocument').filter(c=>{
  const f=c.body.audio||c.body.document; return f&&/\.wav$/i.test(f.getName());});
say('  فایل صوتی ارسالی به تلگرام:',audioCalls.length, audioCalls.length===1?'✅ یکجا':'❌');
if(audioCalls.length!==1) throw new Error('telegram got parts, not one file');
say('  نامش:',(audioCalls[0].body.audio||audioCalls[0].body.document).getName());

say('\n=== ۵) قسمت دوم: ارجاع به محتوای قبلاً پخش‌شده ===');
// force the same category again so the used pool is non-empty
global.__PROPS['LAST_CATEGORIES']='';
r=produceEpisode(); d=0;
while(global.__PROPS['PENDING_EPISODE']&&d++<90){const x=produceEpisodeContinue(); if(x)r=x;}
const cp=curatorPrompts[curatorPrompts.length-1];
const refsOffered=(cp.match(/\| پخش‌شده \|/g)||[]).length;
say('  آیتم‌های پخش‌شده که به سردبیر عرضه شد:',refsOffered, refsOffered>0?'✅':'❌');
if(!refsOffered) throw new Error('no reference pool offered');
const wp2=writerPrompts[writerPrompts.length-1];
say('  بخش «قبلاً پخش‌شده» در پرامتِ نویسنده:',wp2.indexOf('قبلاً پخش‌شده (فقط برای پیوند)')!==-1?'✅':'❌');
if(wp2.indexOf('قبلاً پخش‌شده (فقط برای پیوند)')===-1) throw new Error('refs not passed to writer');
// ref counter must have incremented, and those rows must NOT be marked as used-again
let refCount=0;
for(const t2 of TAXONOMY.map(x=>x.title)){const sh=hub.getSheetByName(t2); if(!sh||sh.getLastRow()<2)continue;
  refCount+=sh.getRange(2,COL.REFS,sh.getLastRow()-1,1).getValues().filter(x=>Number(x[0])>0).length;}
say('  آیتم‌های علامت‌خوردهٔ «ارجاع در قسمت‌ها»:',refCount, refCount>0?'✅':'❌');
if(!refCount) throw new Error('ref counter not incremented');
say('\n✅ همهٔ آزمون‌های نسخهٔ ۳٫۳ گذشت.');
