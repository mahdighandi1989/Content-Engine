/* Version 2 tests: model auto-selection, retired-model self-healing,
   pronunciation table, and Telegram delivery. */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const DIR = 'src/';
const FILES = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs',
               '05_Setup.gs','06_Models.gs','07_Telegram.gs'];
let src = fs.readFileSync('engine.gs','utf8');
(0, eval)(src);

const rd = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const vids = rd('tests/fixtures/videos.jsonl');
const phos = rd('tests/fixtures/photos.jsonl');
const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اشخاص شناسایی شده (JSON)',
  '🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی',
  'مشخصات فنی (JSON)','تحلیل محتوا (JSON)','تحلیل صوتی','تحلیل بصری','نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی','اطلاعات پایه تصویر (JSON)',
  'استخراج متن (JSON)','اشخاص شناسایی شده (JSON)','مکان‌های شناسایی شده (JSON)','تحلیل محتوا (JSON)',
  'تحلیل فنی (JSON)','کاربردهای توصیه شده (JSON)','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];
function mk(id, h, rows) {
  const ss = new Spread('s', id); const sh = ss.insertSheet('S1');
  sh._d.push(h.slice()); rows.forEach(r => sh._d.push(r));
  sh._max = Math.max(1000, sh._d.length + 10); global.__SS[id] = ss; return ss;
}
mk(CFG.VIDEO_SHEET_ID, VH, vids.map(v => [v.date, v.fileId,'o','n', v.link,'[]','{}','{}',
  v.transcript, v.vibe, v.expert,'{}',
  JSON.stringify({Genre:v.genre,Main_Topic:v.mainTopic,Key_Message:v.keyMessage}),'','','', v.summary, v.status]));
mk(CFG.PHOTO_SHEET_ID, PH, phos.map(p => [p.date, p.fileId,'o','n', p.link,'{}',
  JSON.stringify({Original_Text:p.text}),'[]','[]',
  JSON.stringify({Category:p.category,Main_Subject:p.mainSubject,Key_Message:p.keyMessage,Notable_Elements:p.notable}),
  '{}','[]', p.vibe, p.summary, p.special, p.status]));

global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = '123456:FAKE';
global.__PROPS['TELEGRAM_CHAT_ID'] = '-1001234567890';

// ---- fake model catalogue, deliberately messy -----------------------------
let MODEL_CATALOG = [
  'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro',
  'gemini-3.1-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash-lite',
  'gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview',
  'gemini-embedding-001', 'imagen-4.0-generate', 'gemma-3-27b',
  'gemini-2.5-flash-image', 'gemini-live-2.5-flash'
];
let RETIRED = new Set();
const tgCalls = [];
let ttsCalls = 0;

global.__STUB = function (url, body) {
  // models.list
  if (url.indexOf('/v1beta/models?') !== -1) {
    return { code: 200, json: { models: MODEL_CATALOG.filter(m => !RETIRED.has(m)).map(m => ({
      name: 'models/' + m,
      supportedGenerationMethods: /embedding/.test(m) ? ['embedContent'] : ['generateContent']
    })) } };
  }
  // telegram
  if (url.indexOf('api.telegram.org') !== -1) {
    const method = url.split('/').pop();
    tgCalls.push({ method, body });
    return { code: 200, json: { ok: true, result: { username: 'test_bot' } } };
  }
  // which model was addressed?
  const mm = url.match(/models\/([^:]+):generateContent/);
  const model = mm ? mm[1] : '';
  if (RETIRED.has(model)) {
    return { code: 404, json: { error: { code: 404, status: 'NOT_FOUND',
      message: 'models/' + model + ' is not found for API version v1beta' } } };
  }
  if (url.indexOf('tts') !== -1) {
    ttsCalls++;
    const buf = Buffer.alloc(300000);
    for (let i = 0; i < buf.length; i += 2) buf.writeInt16LE(500, i);
    return { code: 200, json: { candidates: [{ content: { parts: [{ inlineData: { data: buf.toString('base64') } }] } }] } };
  }
  const ids = (JSON.stringify(body).match(/شناسه: (\S+?)\\n/g) || []).map(s => s.slice(7, -2));
  const secs = [];
  for (let i = 0; i < 4; i++) secs.push({ heading: 'بخش ' + (i + 1),
    narration: 'اسرائیل و مؤثر و قدر. یک جملهٔ روایی نسبتاً بلند برای آزمون. '.repeat(12).trim(),
    sourceIds: ids.slice(i, i + 2) });
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
    title: 'قسمت آزمایشی نسخهٔ دو', hook: 'قلاب آغازین.', sections: secs,
    outro: 'پایان.', summary: 'خلاصه.', tags: ['الف','ب'] }) }] } }] } };
};

const say = (...a) => console.log(...a);

say('=== ۱) انتخاب خودکار بالاترین مدل ===');
CFG.MODEL_POLICY = 'highest';
let m = resolveModels_(true);
say('  سیاست highest → متن:', m.text, '| صوت:', m.tts);
if (m.text !== 'gemini-3.1-pro-preview') throw new Error('❌ مدل متنی اشتباه: ' + m.text);
if (m.tts !== 'gemini-3.1-flash-tts-preview') throw new Error('❌ مدل صوتی اشتباه: ' + m.tts);
say('  ✅ بالاترین ردهٔ تازه‌ترین نسخه انتخاب شد؛ embedding/imagen/gemma/live کنار گذاشته شدند');

CFG.MODEL_POLICY = 'stable';
let ms = resolveModels_(true);
say('  سیاست stable  → متن:', ms.text, '| صوت:', ms.tts);
if (ms.text !== 'gemini-3.1-flash') throw new Error('❌ stable مدل اشتباه: ' + ms.text);
if (ms.tts !== 'gemini-3.1-flash-tts-preview') throw new Error('❌ stable صوت باید همان بماند');
say('  ✅ در حالت پایدار، پیش‌نمایش کنار رفت ولی چون همهٔ مدل‌های صوتی پیش‌نمایش‌اند، صوت حفظ شد');
CFG.MODEL_POLICY = 'highest';

say('\n=== ۲) وقتی مدل تازه‌تری منتشر شود، خودش سراغش می‌رود ===');
MODEL_CATALOG.push('gemini-4.0-pro');
m = resolveModels_(true);
say('  متن:', m.text, m.text === 'gemini-4.0-pro' ? '✅' : '❌');
if (m.text !== 'gemini-4.0-pro') throw new Error('did not upgrade');

say('\n=== ۳) وقتی مدل بازنشسته شود، بدون خطا جانشین می‌گیرد ===');
RETIRED.add('gemini-4.0-pro');
const res = geminiText_('آزمون', { type:'object', properties:{ title:{type:'string'} } }, 2048);
say('  پاسخ گرفته شد با مدل جانشین:', resolveModels_(false).text);
if (resolveModels_(false).text === 'gemini-4.0-pro') throw new Error('❌ هنوز روی مدل مرده است');
say('  ✅ بدون هیچ خطایی ادامه داد');

say('\n=== ۴) همگام‌سازی + جدول تلفظ ===');
let g = 0; while (g++ < 30) { syncCatalog(); if (parseInt(global.__PROPS['CURSOR_PHOTO']||'0',10) >= 153) break; }
const hub = getHub_();
const pron = hub.getSheetByName(CFG.TAB_PRON);
say('  تب تلفظ ساخته شد:', !!pron, '| ردیف‌های نمونه:', pron ? pron.getLastRow() - 1 : 0);
_pronCache = null;
const before = 'اسرائیل و مؤثر و قدر هستند.';
const after = applyPron_(before);
say('  پیش از اصلاح:', before);
say('  پس از اصلاح :', after);
if (after === before) throw new Error('❌ جدول تلفظ اعمال نشد');
say('  ✅ جایگزینی تلفظ کار می‌کند');

say('\n=== ۵) ستون تازهٔ «وضعیت تلگرام» به شیت موجود اضافه می‌شود ===');
const pod = hub.getSheetByName(CFG.TAB_PODCASTS);
say('  سرستون‌ها:', pod.getRange(1,1,1,PODCAST_HEADERS.length).getValues()[0].join(' | '));

say('\n=== ۶) تولید کامل + ارسال به تلگرام ===');
let r = produceEpisode();
let guard2 = 0;
while (r && r.pending && guard2++ < 40) r = produceEpisodeContinue() || r;
while (global.__PROPS['PENDING_EPISODE'] && guard2++ < 60) produceEpisodeContinue();
say('  نتیجه:', JSON.stringify(r && r.telegram ? {ok:r.ok,ep:r.episode,dur:r.duration,tg:r.telegram} : r));

const byMethod = {};
tgCalls.forEach(c => byMethod[c.method] = (byMethod[c.method]||0)+1);
say('  فراخوانی‌های تلگرام:', JSON.stringify(byMethod));
if (!byMethod.sendMessage) throw new Error('❌ هیچ پیامی به تلگرام نرفت');
if (!byMethod.sendAudio && !byMethod.sendDocument) throw new Error('❌ فایلی به تلگرام نرفت');

const audioCalls = tgCalls.filter(c => c.method === 'sendAudio');
say('  فایل صوتی ارسالی:', audioCalls.length,
    '| هر کدام Blob واقعی:', audioCalls.every(c => c.body.audio && typeof c.body.audio.getBytes === 'function') ? '✅' : '❌');
const docs = tgCalls.filter(c => c.method === 'sendDocument');
say('  پیوست‌ها:', docs.map(d => d.body.document && d.body.document.getName()).join(' , '));

const msgs = tgCalls.filter(c => c.method === 'sendMessage');
const tooLong = msgs.filter(c => (c.body.text||'').length > 4096);
say('  پیام‌های متنی:', msgs.length, '| بلندتر از سقف ۴۰۹۶:', tooLong.length, tooLong.length ? '❌' : '✅');
if (tooLong.length) throw new Error('telegram message over limit');

const podRow = pod.getRange(pod.getLastRow(), 1, 1, PODCAST_HEADERS.length).getValues()[0];
say('  وضعیت ایمیل:', podRow[10]);
say('  وضعیت تلگرام:', podRow[12]);
if (!String(podRow[12]).length) throw new Error('❌ وضعیت تلگرام ثبت نشد');

say('\n=== ۷) پیام درست وقتی قفل گرفته است ===');
const realLock = global.LockService;
global.LockService = { getScriptLock: () => ({ tryLock: () => false, releaseLock(){} }) };
const busy = produceEpisode();
say('  خروجی:', JSON.stringify(busy), busy && busy.reason === 'busy' ? '✅ علت درست گزارش شد' : '❌');
if (!busy || busy.reason !== 'busy') throw new Error('busy reason missing');
global.LockService = realLock;

say('\n✅ همهٔ آزمون‌های نسخهٔ ۲ گذشت.');
