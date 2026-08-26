require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs=require('fs');
const {Spread}=require('./lib/mock.js');
const DIR='src/';
const F=['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs','05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs'];
let s='';for(const f of F)s+='\n'+fs.readFileSync(DIR+f,'utf8');(0,eval)(s);
// a 500-chunk file must stage ~60 evenly spread parts and still assemble once
const HDR=['Timestamp','File_ID','File_Name','New_Name','File_Link','Is_Chunk','Chunk_Number','Total_Chunks','Chunk_Range','Full_Transcription','Speaker_Diarization','Content_Summary','Key_Points','Executive_Summary','Status','Domain_Detected','Content_Type','Main_Subject'];
const ix=n=>HDR.indexOf(n);
const rows=[];
for(let n=1;n<=500;n++){
  const r=new Array(HDR.length).fill('');
  r[ix('Timestamp')]='2026-06-01 08:00:00'; r[ix('File_ID')]='BIG'; r[ix('File_Name')]='big.mp3';
  r[ix('Is_Chunk')]='بله'; r[ix('Chunk_Number')]=n; r[ix('Total_Chunks')]=500;
  r[ix('Domain_Detected')]='آموزشی، علمی'; r[ix('Main_Subject')]='درس شمارهٔ '+n+' از یک دورهٔ بسیار بلند';
  r[ix('Key_Points')]=JSON.stringify(['نکتهٔ کلیدی قطعهٔ '+n+' که به‌قدر کافی بلند است تا شمرده شود.']);
  r[ix('Executive_Summary')]='خلاصهٔ قطعهٔ '+n+'. متن توضیحی به‌قدر کافی بلند برای سنجه‌ها. ';
  r[ix('Full_Transcription')]='گفتار قطعهٔ '+n;
  r[ix('Status')]='CHUNK_'+n;
  rows.push(r);
}
function mk(id,tabs){const ss=new Spread('s',id);tabs.forEach(t=>{const sh=ss.insertSheet(t.name);sh._d.push(t.hdr.slice());t.rows.forEach(r=>sh._d.push(r.slice()));sh._max=Math.max(1000,sh._d.length+10);});global.__SS[id]=ss;}
mk(CFG.VIDEO_SHEET_ID,[{name:'S1',hdr:['تاریخ پردازش','File ID'],rows:[]}]);
mk(CFG.PHOTO_SHEET_ID,[{name:'S1',hdr:['تاریخ پردازش','File ID'],rows:[]}]);
for (const s2 of CFG.SOURCES) if(!global.__SS[s2.id]){const ss=new Spread('s',s2.id);ss.insertSheet('S1');global.__SS[s2.id]=ss;}
mk('BIGSHEET',[{name:'Audio Analysis',hdr:HDR,rows:rows}]);
CFG.SOURCES.push({key:'big',id:'BIGSHEET',title:'فایل بسیار بزرگ',schema:'auto'});
global.__PROPS['GEMINI_API_KEY']='TEST';
const nolog=console.log; console.log=()=>{};
let g=0; while(g++<80) syncCatalog();
console.log=nolog;
const hub=getHub_();
console.log('گام نمونه‌برداری برای ۵۰۰ قطعه:', chunkStride_(500), '| قطعهٔ منتظره:', chunkExpected_(500));
let found=null;
for(const n of TAXONOMY.map(t=>t.title).concat([MISC_TITLE])){
  const sh=hub.getSheetByName(n); if(!sh||sh.getLastRow()<2) continue;
  const v=sh.getRange(2,1,sh.getLastRow()-1,HUB_HEADERS.length).getValues();
  for(const r of v) if(r[COL.ID-1]==='BIG') found={cat:n,r:r};
}
if(!found) throw new Error('❌ فایل ۵۰۰ قطعه‌ای آیتم نشد');
console.log('آیتم ساخته شد → دسته:',found.cat,'| قطعات:',found.r[COL.PARTS-1]);
console.log('  خلاصه:',String(found.r[COL.SUMMARY-1]).length,'نویسه | پیام:',String(found.r[COL.MSG-1]).length);
const sm=String(found.r[COL.SUMMARY-1]);
const first=sm.indexOf('قطعهٔ ۱')!==-1||sm.indexOf('قطعهٔ 1')!==-1;
const last=/قطعهٔ 500|قطعهٔ ۵۰۰/.test(sm);
console.log('  پوشش سراسر فایل — قطعهٔ اول در خلاصه:',first?'✅':'—','| قطعهٔ آخر:',last?'✅':'—');
const bl=chunkBacklog_(hub);
console.log('  انبار پس از ترکیب:',bl.rows,'ردیف');
if(bl.rows!==0) throw new Error('❌ انبار خالی نشد');
console.log('✅ سقف نمونه‌برداری کار کرد و فایل غول‌آسا یک آیتم شد.');
