/* End-to-end execution of the real engine against the real archive rows. */
const fs = require('fs');
const { Spread, Sheet } = require('./mock.js');

// ---- load the actual .gs sources ----
const DIR = 'src/';
const FILES = ['00_Config.gs', '01_Taxonomy.gs', '02_Sync.gs', '03_Producer.gs', '04_Mailer.gs', '05_Setup.gs'];
let src = '';
src = fs.readFileSync('engine.gs','utf8');
(0, eval)(src);

// ---- build source spreadsheets from the real extracted rows ----
const rd = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const vids = rd('videos.jsonl');
const phos = rd('photos.jsonl');

function mkSheet(id, headers, rows) {
  const ss = new Spread('src', id);
  const sh = ss.insertSheet('Sheet1');
  sh._d.push(headers.slice());
  rows.forEach(r => sh._d.push(r));
  global.__SS[id] = ss;
  return ss;
}
const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی',
  'اشخاص شناسایی شده (JSON)','🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)','متن پیاده‌سازی شده',
  'فضا و وایب','تحلیل تخصصی','مشخصات فنی (JSON)','تحلیل محتوا (JSON)','تحلیل صوتی','تحلیل بصری',
  'نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی',
  'اطلاعات پایه تصویر (JSON)','استخراج متن (JSON)','اشخاص شناسایی شده (JSON)','مکان‌های شناسایی شده (JSON)',
  'تحلیل محتوا (JSON)','تحلیل فنی (JSON)','کاربردهای توصیه شده (JSON)','فضا و وایب','خلاصه اجرایی',
  'موارد ویژه','وضعیت'];

mkSheet(CFG.VIDEO_SHEET_ID, VH, vids.map(v => ([
  v.date, v.fileId, 'orig.mp4', 'new.mp4', v.link, '[]', '{}', '{}', v.transcript,
  v.vibe, v.expert, '{}',
  JSON.stringify({ Genre: v.genre, Main_Topic: v.mainTopic, Key_Message: v.keyMessage, Target_Audience: v.audience }),
  '', '', '', v.summary, v.status])));

mkSheet(CFG.PHOTO_SHEET_ID, PH, phos.map(p => ([
  p.date, p.fileId, 'orig.jpg', 'new.jpg', p.link, '{}',
  JSON.stringify({ Original_Text: p.text }), '[]', '[]',
  JSON.stringify({ Category: p.category, Main_Subject: p.mainSubject, Key_Message: p.keyMessage, Notable_Elements: p.notable }),
  '{}', '[]', p.vibe, p.summary, p.special, p.status])));

// ---- stub Gemini ----
const SECTIONS = 5;
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__STUB = function (url, body) {
  if (url.indexOf(':generateContent') !== -1 && url.indexOf('-tts') === -1) {
    const ep = {
      title: 'وقتی آرشیو حرف می‌زند',
      hook: 'یک قلاب کوتاه برای شروع قسمت. جملهٔ دوم قلاب. جملهٔ سوم.',
      sections: [], outro: 'جمع‌بندی پایانی قسمت.',
      summary: 'خلاصهٔ سه‌خطی.', tags: ['الف', 'ب', 'ج']
    };
    // pull real ids out of the prompt so sourceIds resolve
    const ids = (body.contents[0].parts[0].text.match(/شناسه: (\S+)/g) || [])
                  .map(s => s.replace('شناسه: ', ''));
    for (let i = 0; i < SECTIONS; i++) {
      ep.sections.push({
        heading: 'بخش ' + (i + 1),
        narration: ('این یک جملهٔ روایت است. '.repeat(40)).trim(),
        sourceIds: ids.slice(i * 2, i * 2 + 2)
      });
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(ep) }] } }] } };
  }
  // TTS: return plausible PCM of a length proportional to the text
  const chars = (body.contents ? body.contents[0].parts[0].text : body.input).length;
  const nbytes = chars * 900;                      // ~ realistic bytes/char at 24kHz
  const buf = Buffer.alloc(nbytes + (nbytes % 2));
  for (let i = 0; i < buf.length; i += 2) buf.writeInt16LE(Math.round(3000 * Math.sin(i / 30)), i);
  return { code: 200, json: { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: buf.toString('base64') } }] } }] } };
};

// ================================ RUN ================================
const out = [];
const log = (...a) => { out.push(a.join(' ')); console.log(...a); };

log('=== ۱) syncCatalog ===');
syncCatalog();
const hub = getHub_();
let totV = 0, totP = 0;
const names = TAXONOMY.map(t => t.title).concat([MISC_TITLE]);
for (const n of names) {
  const sh = hub.getSheetByName(n);
  if (!sh || sh.getLastRow() < 2) continue;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, HUB_HEADERS.length).getValues();
  const nv = v.filter(r => r[1] === 'ویدیو').length;
  totV += nv; totP += v.length - nv;
  log(`  ${n.padEnd(28)} ویدیو=${String(nv).padStart(3)} عکس=${String(v.length - nv).padStart(3)}`);
}
log(`  جمع: ویدیو=${totV} عکس=${totP} (انتظار: ${vids.length} و ${phos.length})`);
if (totV !== vids.length || totP !== phos.length) throw new Error('!! تعداد نمی‌خواند');

log('\n=== ۲) idempotency: اجرای دوباره نباید چیزی اضافه کند ===');
syncCatalog();
let again = 0;
for (const n of names) { const sh = hub.getSheetByName(n); if (sh && sh.getLastRow() > 1) again += sh.getLastRow() - 1; }
log('  مجموع ردیف‌ها پس از اجرای دوم:', again, again === totV + totP ? '✅' : '❌ تکراری ایجاد شد');
if (again !== totV + totP) throw new Error('!! duplicates');

log('\n=== ۳) داشبورد ===');
const idx = hub.getSheetByName(CFG.TAB_INDEX);
log('  ردیف‌های داشبورد:', idx.getLastRow() - 1);
log('  ردیف جمع کل:', JSON.stringify(idx.getRange(idx.getLastRow() - 1, 1, 1, 6).getValues()[0]));

log('\n=== ۴) produceEpisode ===');
const r = produceEpisode();
log('  نتیجه:', JSON.stringify(r));
const pod = hub.getSheetByName(CFG.TAB_PODCASTS);
const prow = pod.getRange(2, 1, 1, PODCAST_HEADERS.length).getValues()[0];
PODCAST_HEADERS.forEach((h, i) => log('   ' + h + ': ' + String(prow[i]).replace(/\n/g, ' | ').slice(0, 110)));

log('\n=== ۵) فایل‌های تولیدشده ===');
global.__FILES.forEach(f => log('  ' + f.getName() + '  (' + f._b._data.length + ' bytes)'));

// write the wav + html out for real inspection
global.__FILES.forEach(f => {
  const safe = f.getName().replace(/[\/\\]/g, '_');
  fs.writeFileSync('out_' + safe, f._b._data);
});

log('\n=== ۶) علامت‌گذاری استفاده‌شده‌ها ===');
let used = 0;
for (const n of names) {
  const sh = hub.getSheetByName(n);
  if (!sh || sh.getLastRow() < 2) continue;
  used += sh.getRange(2, COL.USED_EP, sh.getLastRow() - 1, 1).getValues().filter(x => x[0]).length;
}
log('  آیتم‌های علامت‌خورده:', used, used === CFG.ITEMS_PER_EPISODE ? '✅' : '❌');

log('\n=== ۷) ایمیل ===');
log('  تعداد ایمیل:', global.__MAIL.length);
if (global.__MAIL.length) {
  const m = global.__MAIL[0];
  log('  to:', m.to);
  log('  subject:', m.subject);
  log('  htmlBody bytes:', m.htmlBody.length, '| attachments:', m.attachments.length);
  fs.writeFileSync('out_email.html', m.htmlBody);
  const dl = (m.htmlBody.match(/https:\/\/drive\.google\.com\/file\/d\//g) || []).length;
  log('  لینک درایو داخل ایمیل:', dl);
}

log('\n=== ۸) دومین قسمت باید دستهٔ متفاوتی بگیرد ===');
const r2 = produceEpisode();
log('  قسمت دوم:', JSON.stringify(r2));
log('  دستهٔ قسمت ۱ vs ۲:', pod.getRange(2, 4).getValues()[0][0], '|', pod.getRange(3, 4).getValues()[0][0]);

fs.writeFileSync('test_report.txt', out.join('\n'));
log('\n✅ همهٔ مراحل بدون خطا اجرا شد.');
