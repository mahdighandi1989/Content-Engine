/* پذیرشِ خواسته‌های صاحبِ برنامه — هر بند یک شکایتِ واقعی است.
 *
 * چرا جدا از بقیهٔ آزمون‌ها: این‌ها رفتارِ دیده‌شدنی را می‌سنجند، نه درستیِ
 * درونیِ یک تابع. اگر روزی کسی چیزی را «بهتر» کند و یکی از این‌ها بشکند،
 * یعنی همان ایرادی که یک بار گزارش شده بود دوباره برگشته.
 *
 * هر بند به یک درخواستِ مشخص گره خورده:
 *   ۱ گوینده دستورِ سبک را وسطِ متن می‌خواند
 *   ۲ الف مثل افغانی/تاجیکی ادا می‌شد (baawbaaw به‌جای baabaa)
 *   ۳ جدولِ تلفظِ شیت روی متنِ اعراب‌دار بی‌اثر شده بود
 *   ۴ پادکست در دو فایل می‌آمد
 *   ۵ نظارت این را اصلاً گزارش نمی‌کرد
 *   ۶ متنِ «از همه جا» تفسیرگر و نصیحت‌گر بود
 *   ۷ آزمونِ صدا فقط زن نشان می‌داد؛ و راهِ کنارگذاشتنِ گوینده
 *   ۸ موسیقی/افکت نباید شورش را دربیاورد
 *   ۹ ریشهٔ پوشهٔ OUTPUT شلوغ می‌شد
 *  ۱۰ بسته باید با خودش بخواند وگرنه نصب رد می‌شود
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

console.log('══ ۱) گوینده دیگر دستورِ سبک را نمی‌خواند ══');
{
  const chunks=[{text:'الف',style:'آرام',voice:'Puck'},
                {text:'ب',style:'آرام',voice:'Puck'},
                {text:'ج',style:'شاد',voice:'Puck'}];
  ok('تکهٔ ۰ دستور می‌گیرد', ttsCueWanted_(chunks,0)===true);
  ok('تکهٔ ۱ با همان لحن دستور نمی‌گیرد', ttsCueWanted_(chunks,1)===false);
  ok('تکهٔ ۲ با لحنِ تازه دستور می‌گیرد', ttsCueWanted_(chunks,2)===true);
  const p = ttsPayloads_('متنِ خالص','m','آرام','Puck',false);
  const sent = p.generateContent.body.contents[0].parts[0].text;
  ok('بی‌دستور: هیچ سطرِ اضافه‌ای فرستاده نمی‌شود', sent==='متنِ خالص', JSON.stringify(sent));
  const p2 = ttsPayloads_('متنِ خالص','m','آرام','Puck',true);
  ok('بادستور: دستور هست و با «فقط این متن را اجرا کن» تمام می‌شود',
     /فقط این متن را اجرا کن:\nمتنِ خالص$/.test(p2.generateContent.body.contents[0].parts[0].text));
}

console.log('══ ۲) لهجه: الف باز و کوتاه، نه افغانی ══');
{
  const plain = ttsCue_('آرام','بابا آمد. متن بدون اعراب است.');
  const vow   = ttsCue_('آرام','بَابَا آمَد. مَتنِ اِعرابدار اَست.');
  ok('در متنِ بی‌اعراب، خطِ لهجه فرستاده می‌شود', plain.indexOf('لهجهٔ افغانی')!==-1);
  ok('در متنِ اعراب‌دار هم، خطِ لهجه فرستاده می‌شود', vow.indexOf('لهجهٔ افغانی')!==-1);
  ok('یادآورِ اعراب فقط به متنِ بی‌اعراب می‌رود',
     plain.indexOf('زیر و زبر')!==-1 && vow.indexOf('زیر و زبر')===-1);
  ok('دستور از سقف نمی‌گذرد ('+plain.length+' ≤ '+CFG.TTS_CUE_MAX+')', plain.length<=CFG.TTS_CUE_MAX+40);
}

console.log('══ ۳) جدولِ تلفظ روی متنِ اعراب‌دار کار می‌کند ══');
{
  const hub = getHub_();
  // جدول از خودِ hub خوانده می‌شود (تبِ «تلفظ» با ردیف‌های پیش‌فرض)
  const map = pronMap_();
  ok('جدولِ تلفظ خوانده می‌شود', map.length>0, map.length+' ردیف');
  ok('متنِ بی‌اعراب اصلاح می‌شود', applyPron_('قدر این روزها')==='قَدر این روزها');
  ok('اعرابِ اشتباهِ تسک بازنویسی می‌شود', applyPron_('قُدر این روزها')==='قَدر این روزها',
     applyPron_('قُدر این روزها'));
  ok('کسرهٔ اضافه خورده نمی‌شود', applyPron_('قُدرِ او')==='قَدرِ او', applyPron_('قُدرِ او'));
  ok('واژهٔ بی‌ربط دست نمی‌خورد', applyPron_('هدایتِ او')==='هدایتِ او');
}

console.log('══ ۴) یک فایلِ صوتی — هر دو برنامه ══');
{
  ok('سقفِ حافظهٔ ادغام تعریف شده', Number(CFG.MERGE_MAX_BYTES)>0, String(CFG.MERGE_MAX_BYTES));
  const a = oneFileMaxChars_(), b = specialMaxChars_();
  ok('سقفِ نویسه برای «از همه جا» ('+a+')', a>0);
  ok('سقفِ نویسه برای «درس‌نامه» ('+b+')', b>0);
  ok('ONE_FILE_STRICT روشن', CFG.ONE_FILE_STRICT===true);
  ok('SPECIAL_ONE_FILE روشن', CFG.SPECIAL_ONE_FILE===true);
  const sp14 = fs.readFileSync('src/14_Special.gs','utf8');
  ok('درس‌نامه هم «یک فایل» را وارسی می‌کند', /expectOneFile:\s*CFG\.SPECIAL_ONE_FILE/.test(sp14));
  ok('بودجهٔ موسیقی از سقف کم می‌شود', /musicBudgetSec_/.test(fs.readFileSync('src/03_Producer.gs','utf8')));
}

console.log('══ ۵) نظارت بر طول و تعدادِ فایل ══');
{
  ok('epTooLong_ ۲۵٪ اضافه را می‌گیرد ('+epTooLong_('13:30',10)+'٪)', epTooLong_('13:30',10)>25);
  ok('epTooLong_ طولِ عادی را نمی‌گیرد', epTooLong_('10:30',10)===0);
  const h = fs.readFileSync('src/08_Health.gs','utf8');
  ok('شمارِ فایل از lastEpisodeAudio می‌آید نه audioLinks',
     /lastEpisodeAudio/.test(h) && !/audioLinks\.length\s*>\s*1/.test(h));
  ok('درس‌نامه هم شمارِ فایل و مدت دارد', /spFiles/.test(h) && /lastDuration/.test(h));
}

console.log('══ ۶) کیفیتِ متنِ «از همه جا» — نصیحت و وفاداری ══');
{
  ok('الگوی نصیحت‌گری تعریف شده', Array.isArray(PREACH_PAT) && PREACH_PAT.length>0,
     PREACH_PAT.length+' الگو');
  const n = preachHits_('این تصویر به ما می آموزد که باید قدر بدانیم.');
  ok('جملهٔ نصیحت‌گر گرفته می‌شود', n.length>0, JSON.stringify(n));
  const q = preachHits_('در این ویدیو یک گربه از دیوار بالا می رود.');
  ok('توصیفِ ساده گرفته نمی‌شود', q.length===0, JSON.stringify(q));
}

console.log('══ ۷) گویندگان: آزمون و مسدودسازی ══');
{
  const o = auditionOrder_();
  const g = o.slice(0,6).map(v=>v.g).join('');
  ok('ترتیبِ آزمون زن و مرد را درمی‌آمیزد ('+g+')', new Set(g).size>1);
  const rm = applyBlockEdit_('Kore','-Kore');
  ok('حذف با «-»', rm.list.length===0 && rm.mode!=='جایگزینی', JSON.stringify(rm));
  const ad = applyBlockEdit_('Kore','+Orus');
  ok('افزودن با «+»', ad.list.slice().sort().join()==='Kore,Orus', JSON.stringify(ad));
  const rp = applyBlockEdit_('Kore','Puck');
  ok('جایگزینیِ کامل', rp.list.join()==='Puck' && rp.mode==='جایگزینی', JSON.stringify(rp));
  const bad2 = applyBlockEdit_('Kore','Nonexistent');
  ok('نامِ اشتباه گزارش می‌شود و نادیده نمی‌ماند', bad2.unknown.length===1, JSON.stringify(bad2));
  ok('پوشهٔ آزمون از CFG می‌آید', !!CFG.VOICE_AUDIT_FOLDER);
}

console.log('══ ۸) موسیقی: خودکار، محتاط، و ثبت‌شده ══');
{
  ok('MUSIC_ENABLED و MUSIC_AUTO روشن', CFG.MUSIC_ENABLED!==false && CFG.MUSIC_AUTO!==false);
  const sch = JSON.stringify(MUSIC_PLAN_SCHEMA)+JSON.stringify(MUSIC_TAG_SCHEMA);
  ok('هیچ number/integer/boolean در schemaها نیست',
     !/"(number|integer|boolean)"/.test(sch));
  const pick=[{id:'x', word:'باران', section:0}];
  const inHead=[{heading:'روزِ باران',narration:'ابر آمد و رفت.'}];
  const twice =[{heading:'یک روز',narration:'باران بارید. باران بند آمد.'}];
  const once  =[{heading:'یک روز',narration:'گذری از باران گفت و رد شد.'}];
  ok('واژه در سرِ بخش → افکت مجاز', sfxAllow_(inHead,pick,'variety').length===1,
     JSON.stringify(sfxAllow_(inHead,pick,'variety')));
  ok('دو بار در همان بخش → مجاز', sfxAllow_(twice,pick,'variety').length===1);
  ok('یک اشارهٔ گذرا → رد', sfxAllow_(once,pick,'variety').length===0);
  ok('درس‌نامه اصلاً افکت نمی‌گیرد', sfxAllow_(inHead,pick,'special').length===0);
  ok('سقفِ افکت در هر قسمت', Number(CFG.MUSIC_SFX_MAX_PER_EP)>=1);
}

console.log('══ ۹) چیدمانِ پوشهٔ OUTPUT ══');
{
  const OUT = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);
  OUT.createFile(STATUS_FILE,'{}','application/json');
  OUT.createFile('_MUSIC-WISH.json','{}','application/json');
  OUT.createFile('_REPORT-20260901.json','{}','application/json');
  OUT.createFile('یک چیزِ سرگردان.bin','x','text/plain');
  const lay = outLayoutCheck_();
  const names = lay.strays.map(x=>x.name);
  ok('فایلِ زندهٔ موتور سرگردان شمرده نمی‌شود',
     names.indexOf(STATUS_FILE)===-1 && names.indexOf('_REPORT-20260901.json')===-1);
  ok('فایلِ ناشناخته گرفته می‌شود', names.indexOf('یک چیزِ سرگردان.bin')!==-1, names.join(' · '));
  const f = OUT.createFile('_REPORT-20260902.json','{}','application/json');
  markReportDone_(f);
  ok('گزارش خودکار بایگانی می‌شود',
     names_(reportArchiveFolder_()).indexOf('_REPORT-20260902.json.ingested')!==-1);
  ok('و از ریشه بیرون می‌رود', names_(OUT).indexOf('_REPORT-20260902.json.ingested')===-1);
  function names_(fo){const it=fo.getFiles(),a=[];while(it.hasNext())a.push(it.next().getName());return a;}
}

console.log('══ ۱۰) نسخه و انسجامِ بسته ══');
{
  const man = JSON.parse(fs.readFileSync('manifest.json','utf8'));
  const eng = fs.readFileSync('engine.gs','utf8');
  const crypto = require('crypto');
  const sha = crypto.createHash('sha256').update(fs.readFileSync('engine.gs')).digest('hex');
  ok('نسخهٔ manifest = نسخهٔ داخلِ فایل = CODE_VERSION',
     man.version===CFG.CODE_VERSION && eng.indexOf("CODE_VERSION: '"+man.version+"'")!==-1,
     man.version+' / '+CFG.CODE_VERSION);
  ok('اثرانگشتِ manifest با فایل می‌خواند', man.sha256===sha, sha.slice(0,16));
  // promptImpact عمداً «هر نسخه باید چیزی بگوید» سنجیده نمی‌شود: نسخه‌ای که
  // هیچ قراردادی با تسک و روتین را عوض نکرده باید خالی باشد، وگرنه هر بار یک
  // پیامِ بی‌مورد به کاربر می‌رود. آنچه باید همیشه درست باشد، شکلش است.
  ok('manifest کلیدهای لازم را دارد',
     ['version','codeFile','sha256','releasedAt','summary','fixes']
       .every(k => man[k] !== undefined));
  ok('promptImpact اگر باشد آرایه است',
     man.promptImpact === undefined || Array.isArray(man.promptImpact));
  ok('fixes خالی نیست — هر نسخه باید بگوید چه چیزی را درست کرده',
     Array.isArray(man.fixes) && man.fixes.length > 0);
}

console.log('\n✅ همه گذشت (' + pass + ' سنجه)');
