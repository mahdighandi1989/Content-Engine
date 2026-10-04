/* ۸.۴۰ — حالت‌ها و نشانه‌های لحن در **هر** قسمت، با هر گوینده.
 *
 * او پرسید: «متن‌های پادکست‌ها چی؟ … همه متن‌ها نشانه‌گذاری بشن، حالت‌ها
 * توجیه بشن، و ثبت بشن … و اتوماسیون زیر نظر باشه و ببینه دقیق و کامل
 * داره انجام می‌شه و اگر نه هم گزارش بده و هم اقدام کنه».
 *
 * این مجموعه از همان دری وارد می‌شود که تولید وارد می‌شود: `produceEpisode`
 * و `produceEpisodeContinue` تا پایان، و بعد می‌پرسد حالت‌ها **کجا نشستند**
 * — در صدا، در `_times.json`، در کارنامه، در ایمیل و در تلگرام. سنجیدنِ
 * تک‌تکِ تابع‌ها فقط تابع را ثابت می‌کند، نه راه را (۷.۶۲).
 */
const { outPath } = require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs'); const { Spread } = require('./lib/mock.js');
const F = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs','05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs','33_VoiceIntake.gs','34_Search.gs','35_Embed.gs','36_VoiceBridge.gs'];
let src = ''; for (const f of F) src += '\n' + fs.readFileSync('src/' + f, 'utf8'); (0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d !== undefined ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

/* ── منابعِ ساختگی، همان شکلِ run_v4_tests ── */
const VH = ['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','d','e','متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی','f','تحلیل محتوا (JSON)','g','h','i','خلاصه اجرایی','وضعیت'];
const PH = ['تاریخ پردازش','File ID','a','b','لینک دسترسی','c','استخراج متن (JSON)','d','e','تحلیل محتوا (JSON)','f','g','فضا و وایب','خلاصه اجرایی','موارد ویژه','وضعیت'];
function mk(id, h, rows) { const ss = new Spread('s', id); const sh = ss.insertSheet('S1'); sh._d.push(h.slice()); rows.forEach(r => sh._d.push(r)); sh._max = Math.max(1000, sh._d.length + 10); global.__SS[id] = ss; return ss; }
const WORDS = ['مداحی','روضه','دعا','زیارت','مسجد','هیئت','نوحه','مرثیه','قرآن','تفسیر','نماز','روزه','صدقه','توسل','شفاعت','معنویت','اخلاص','توبه','یاد','ذکر','سکوت','اشک','محراب','منبر','امام','زائر','عزادار','پرچم','علم','چراغ'];
function vary(i, n) { const o = []; for (let k = 0; k < n; k++) {
  const a = WORDS[(i * 7 + k * 3) % WORDS.length], b = WORDS[(i * 11 + k * 5 + 4) % WORDS.length], c = WORDS[(i * 13 + k * 2 + 9) % WORDS.length];
  o.push('در این بخش ' + a + ' با ' + b + ' همراه می‌شود و ' + c + ' شمارهٔ ' + (i * 100 + k) + ' را می‌سازد.'); }
  return o.join(' '); }
const V = [], P = [];
for (let i = 0; i < 120; i++) V.push([`10/18/2025 ${String(i % 24).padStart(2, '0')}:00:00`, 'V' + i, 'o', 'n', 'https://drive.google.com/file/d/V' + i + '/view', '[]', '{}', '{}', vary(i, 4), 'وایب', 'تخصصی', '{}', JSON.stringify({ Genre: 'مذهبی، مداحی', Main_Topic: 'موضوع ویدیو ' + i, Key_Message: 'پیام کلیدی طولانی برای گرفتن امتیاز کافی ' + i }), '', '', '', vary(i + 900, 5), 'SUCCESS']);
for (let i = 0; i < 120; i++) P.push([`10/21/2025 ${String(i % 24).padStart(2, '0')}:00:00`, 'P' + i, 'o', 'n', 'https://drive.google.com/file/d/P' + i + '/view', '{}', JSON.stringify({ Original_Text: vary(i + 2000, 4) }), '[]', '[]', JSON.stringify({ Category: 'مذهبی، معنوی', Main_Subject: 'موضوع عکس ' + i, Key_Message: 'پیام عکس با طول کافی ' + i, Notable_Elements: 'ن' }), '{}', '[]', 'وایب', vary(i + 3000, 5), 'ویژه', 'SUCCESS']);
mk(CFG.VIDEO_SHEET_ID, VH, V); mk(CFG.PHOTO_SHEET_ID, PH, P);
for (const s of CFG.SOURCES) if (!global.__SS[s.id]) { const ss = new Spread('s', s.id); ss.insertSheet('S1'); global.__SS[s.id] = ss; }
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS['TELEGRAM_BOT_TOKEN'] = '1:FAKE'; global.__PROPS['TELEGRAM_CHAT_ID'] = '-100';

/* ── بدَل‌ها ── */
const PIN = CFG.TTS_MODEL_PIN || 'gemini-3.1-flash-tts-preview';
const tg = []; const plannerPrompts = []; const ttsBodies = []; let listens = 0;
/* پاسخِ برنامه‌ریزِ حالت: شماره‌ها از خودِ پرامپت می‌آیند، پس جوابی که بیرون
   از متن باشد ساخته نمی‌شود. «لبخند» عمداً هست — منوی قسمت باید ردش کند. */
let plannerMode = 'ok';
function plannerReply(t) {
  const nums = [...t.matchAll(/^\[(\d+)\]/gm)].map(m => Number(m[1]));
  const n = nums.length ? Math.max(...nums) : 0;
  if (plannerMode === 'fail') return null;
  const S = [];
  if (n >= 3) S.push({ from: '3', to: '3', k: 'آرام', why: 'نرم' });
  if (n >= 6) S.push({ from: '6', k: 'مکث', why: 'ضربه' });
  if (n >= 9) S.push({ from: '8', to: '9', k: 'کشیده', why: 'نتیجه' });
  if (n >= 12) S.push({ from: '12', k: 'لبخند', why: 'شوخی' });
  if (n >= 15) S.push({ from: '15', k: 'تند', why: 'فهرست' });
  /* از مرزِ دو بخش می‌گذرد (۱۶ آخرِ بخشِ صفر، ۱۷ سرِ بخشِ یک) — باید بریده شود. */
  if (n >= 30) S.push({ from: '16', to: '17', k: 'سنگین', why: 'حکم' });
  if (n >= 30) S.push({ from: '30', k: 'بلند', why: 'اوج' });
  return { spans: S };
}
global.__STUB = function (url, body) {
  if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/' + PIN, supportedGenerationMethods: ['generateContent'] }] } };
  if (url.indexOf('api.telegram.org') !== -1) { tg.push({ m: url.split('/').pop(), body }); return { code: 200, json: { ok: true, result: { username: 'b' } } }; }
  const t = body.contents ? body.contents[0].parts[0].text : '';
  if (body.contents && body.contents[0].parts.some(x => x.inlineData)) {
    listens++;
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: 'متنِ سالمِ برنامه' }] } }] } };
  }
  if (t.indexOf('سردبیرِ یک برنامهٔ رادیویی') !== -1) {
    const cand = [...t.matchAll(/- id: (\S+) \| نامزد/g)].map(m => m[1]);
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
      threads: [{ thread: 'نخ اول', strength: 'محکم', memberIds: cand.slice(0, 10) }],
      theme: 'پیوندِ آزمایشی', connection: 'واژهٔ مشترک',
      chosen: cand.slice(0, 10).map(id => ({ id, role: 'نمونهٔ عینی' })),
      referenceIds: [], rejected: cand.slice(10, 18) }) }] } }] } };
  }
  if (url.indexOf('tts') !== -1) {
    ttsBodies.push(body);
    const b = Buffer.alloc(240000); for (let i = 0; i < b.length; i += 2) b.writeInt16LE(((i / 2) % 40) < 20 ? 3000 : -3000, i);
    return { code: 200, json: { candidates: [{ content: { parts: [{ inlineData: { data: b.toString('base64') } }] } }] } };
  }
  if (t.indexOf('اعراب‌گذاریِ کامل') !== -1 && t.indexOf('فیلد v') !== -1) {
    const piece = t.split('\n\n').slice(1).join('\n\n').replace(/\n\nیادآوری:[\s\S]*$/, '');
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ v: piece.replace(/([آ-يٮ-ە])/g, '$1َ') }) }] } }] } };
  }
  if (t.indexOf('بازبینیِ نشانه‌گذاریِ متنِ صوتی') !== -1) {
    const vv = t.split('── علامت‌گذاری‌شده ──\n')[1] || '';
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ v: vv, n: '۰' }) }] } }] } };
  }
  if (t.indexOf('فقط نشانه‌گذاریِ لحن') !== -1) {
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ t: '' }) }] } }] } };
  }
  if (t.indexOf('آیا جایی در آن هست که یک **صدای کوتاه**') !== -1) {
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ wants: [] }) }] } }] } };
  }
  if (t.indexOf('کدام جمله‌ها حالِ خاصی می‌خواهند') !== -1) {
    plannerPrompts.push(t);
    const r = plannerReply(t);
    /* «internal» نه «quota»: پیامِ سهمیه موتور را ۲۴ ساعت به ردهٔ پایین‌تر
       می‌بَرد و بقیهٔ این مجموعه روی مدلِ دیگری می‌دوید. */
    if (!r) return { code: 500, json: { error: { message: 'internal' } } };
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] } };
  }
  const ids = [...t.matchAll(/شناسه: (\S+)/g)].map(m => m[1]);
  return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'قسمتِ آزمونِ حالت',
    hook: 'سلام. امروز روزِ آزمون است. و بعد قلاب.',
    sections: [0, 1, 2, 3].map(i => ({ heading: 'بخش ' + i,
      narration: Array.from({ length: 12 }, (_, k) => 'جملهٔ شمارهٔ ' + (k + 1) + ' در بخشِ ' + i + ' گفته می‌شود.').join(' '),
      tone: 'آرام و همدلانه', sourceIds: ids.slice(i * 2, i * 2 + 2) })),
    outro: 'پایان.', summary: 'خ.', tags: ['الف'] }) }] } }] } };
};
let g0 = 0; while (g0++ < 30) { syncCatalog(); if (parseInt(global.__PROPS['CURSOR_PHOTO'] || '0', 10) >= 120) break; }
const hub = getHub_();
/* مدلِ سنجاق «دستور را نمی‌پذیرد» — همان حالِ امروزِ هر مدلِ صوتی (۷٫۸۹). */
global.__PROPS[PK.TTS_CUE_BAD] = JSON.stringify({ [PIN]: nowStr_() });
CFG.MAX_WAV_BYTES = 4000000;
CFG.MUSIC_ENABLED = false;

const runEpisode = () => {
  let r = produceEpisode({ manual: true }), d = 0;
  while (global.__PROPS['PENDING_EPISODE'] && d++ < 120) { const x = produceEpisodeContinue(); if (x) r = x; }
  return r;
};
const lastFolder = () => {
  const js = global.__FILES.filter(f => f.getName() === '_episode.json');
  return js[js.length - 1];
};

console.log('\n=== ۱) یک قسمتِ واقعی، از درِ تولید ===');
global.__MAIL.length = 0;
const listens0 = listens;
runEpisode();
const epFile = lastFolder();
const meta = JSON.parse(epFile.getBlob().getDataAsString());
const M = meta.ep && meta.ep.__moods;
ok('۱.۱ نقشهٔ حالت‌ها در پروندهٔ قسمت نوشته شد', !!(M && M.done && M.segs && M.segs.length),
   M ? 'پرسش ' + M.asked + ' · حالت ' + M.got : 'نیست');
ok('۱.۲ یک بار پرسیده شد — نه در هر ازسرگیریِ صداسازی', plannerPrompts.length === 1, plannerPrompts.length);
const pr = plannerPrompts[0] || '';
ok('۱.۳ پرسش جمله‌ها را شماره‌دار و مرزِ بخش‌ها را بی‌شماره می‌فرستد',
   /^\[1\] /m.test(pr) && /— بخشِ تازه —/.test(pr) && !/\[\d+\] — بخشِ تازه —/.test(pr) &&
   /منتشرشدنی/.test(pr), pr.slice(0, 60));
ok('۱.۴ امروز دستور به مدلِ صوتی نمی‌رسد ⇒ «لبخند» در منو نیست و پیشنهادش رد شد',
   pr.indexOf('«لبخند»') === -1 && M.cue === 0 && M.drop['بیرون از منو'] === 1,
   JSON.stringify(M.drop));
const all = [].concat(...M.segs.map(x => x.s));
ok('۱.۵ هیچ حالتی از مرزِ بخش نگذشت و همه در محدودهٔ بخشِ خودشان‌اند',
   M.segs.every(sg => sg.s.every(x => x.a >= 1 && x.b >= x.a && x.b <= sg.n)), JSON.stringify(all));

/* ۱.۶ — آنچه به گفتارساز رفت: متنِ «آرام» با «…» تمام می‌شود و نامِ هیچ حالتی
   وارد متن نشد (همان مرزِ ۸.۲۴: گوینده هرگز نشانه را نمی‌بیند). */
const said = ttsBodies.map(b => JSON.stringify(b.contents || b.input || b));
const leak = said.filter(t => SPEAK_SPANS.some(d => t.indexOf('«' + d.k + '»') !== -1));
ok('۱.۶ نامِ هیچ حالتی به گفتارساز نرفت', leak.length === 0, leak.length);

const timesF = global.__FILES.filter(f => f.getName() === (CFG.EP_TIMES_FILE || '_times.json')).pop();
const times = JSON.parse(timesF.getBlob().getDataAsString()).times;
const moodT = times.filter(x => x.mo), pauseT = times.filter(x => x.p > 0);
ok('۱.۷ حالت‌ها در `_times.json` نشستند، با «چطور»ِ هر کدام',
   moodT.length >= 3 && moodT.every(x => ['دستور', 'صدا', 'نشانه', 'نشد'].indexOf(x.h) !== -1),
   moodT.map(x => x.mo + ':' + x.h).join(' · '));
ok('۱.۸ دستور نرسید ⇒ سرعت در خودِ صدا («آرام»، «کشیده»، «تند»)، نه ادعای «دستور»',
   moodT.every(x => x.h !== 'دستور') && moodT.some(x => x.h === 'صدا'), moodT.map(x => x.h).join(','));
ok('۱.۹ «مکث» سکوتِ واقعی پیش از جمله است، با طولِ پیش‌فرض',
   pauseT.length === 1 && Math.abs(pauseT[0].p - (CFG.SPEAK_PAUSE_SEC || 0.9)) < 1e-9, JSON.stringify(pauseT));
ok('۱.۱۰ نوعِ تکه‌ها همان «t»/«m» ماند — همگام‌سازیِ ویدئو همان‌طور می‌شمارد',
   times.every(x => x.k === 't' || x.k === 'm') && lvAlignTimes_(times.filter(x => x.k === 't').map(() => ({ text: 'x' })), times, 100).how === 'نوع');

/* ۱.۱۱ — دستوری که نرفت، شنیده نمی‌شود: پیش از ۸.۴۰ هر تکهٔ دستوردار، حتی
   وقتی دستور انداخته شده بود، شش ثانیه‌اش به مدلِ شنونده می‌رفت. */
ok('۱.۱۱ برای دستورِ انداخته‌شده هیچ فراخوانِ شنیدنی نرفت', listens === listens0, listens - listens0);

const L = JSON.parse(global.__PROPS[PK.SPEAK_MOODS] || '[]');
const rec = L[L.length - 1] || {};
ok('۱.۱۲ کارنامه: برنامه‌ریزی‌شده = نشسته، با شمارِ «چطور»',
   rec.plan > 0 && rec.got === rec.plan && rec.lost === 0 && !rec.fault && (rec.how['صدا'] || 0) >= 1 &&
   rec.how['سکوت'] === 1, JSON.stringify({ plan: rec.plan, got: rec.got, how: rec.how }));
ok('۱.۱۳ سطرِ جاها ثانیه دارد («آرام ۰:…»)', /آرام [۰-۹]+:[۰-۹]{2}/.test(rec.line || ''), (rec.line || '').split('\n')[0]);

const mail = global.__MAIL.find(m => /^🎧/.test(String(m.subject || '')));
ok('۱.۱۴ ایمیلِ قسمت سطرِ 🎭 حالت‌ها را دارد', !!(mail && mail.htmlBody.indexOf('🎭') !== -1 &&
   mail.htmlBody.indexOf('حالت‌ها') !== -1), mail ? 'هست' : 'ایمیل نرفت');
const tgHead = tg.filter(c => c.m === 'sendMessage').map(c => String(c.body.text || '')).find(x => x.indexOf('🎧') !== -1) || '';
ok('۱.۱۵ سرپیامِ تلگرام هم — او همان‌جا می‌شنود', tgHead.indexOf('🎭') !== -1, tgHead.split('\n').filter(x => x.indexOf('🎭') !== -1)[0] || 'نیست');

const sk = JSON.parse(global.__PROPS[PK.SPEAK_SKIP] || '[]').pop() || {};
ok('۱.۱۶ چگالیِ نشانه‌های لحنِ همان متن ثبت شد (پیش از ۸.۴۰ هیچ‌جا نبود)',
   typeof sk.pr === 'number' && typeof sk.pk === 'number', JSON.stringify({ pr: sk.pr, pk: sk.pk }));

console.log('\n=== ۲) سطرِ روزانه، کارنامهٔ قابلیت، و وارسیِ سلامت ===');
{
  const ms = speakMoodStatus_();
  ok('۲.۱ سطر هر روز هست و نامِ قسمت و شمارِ حالت را می‌گوید',
     ms.on && /حالت‌ها، قسمتِ آخر/.test(ms.line) && /نشانه‌های لحن/.test(ms.line), ms.line);
  const st = { speakMoods: ms };
  const row = capStatus_(st).rows.find(r => r.key === 'speak-moods');
  ok('۲.۲ کارنامهٔ قابلیت سیم‌کشی‌شده است و تاریخ دارد', !!(row && row.verdict !== 'سیم‌کشی' && row.did),
     row ? row.verdict + ' · ' + row.did : 'نیست');
  const h = healthCheck();
  const all2 = (h.notes || []).concat(h.problems || []);
  ok('۲.۳ وارسیِ سلامتِ ۱۰ صبح همین سطر را می‌آورد', all2.some(x => /حالت‌ها، قسمتِ آخر/.test(x)),
     all2.filter(x => /حالت‌ها/.test(x))[0]);
  const stF = JSON.parse(global.__ROOT_FOLDER._files.find(x => x.getName() === '_STATUS.json').getBlob().getDataAsString());
  ok('۲.۴ و `_STATUS.json` کلیدِ `speakMoods` را دارد — ناظر از همین‌جا می‌خوانَد',
     !!(stF.speakMoods && stF.speakMoods.last && stF.speakMoods.last.plan > 0), stF.speakMoods ? 'هست' : 'نیست');
}

console.log('\n=== ۳) گوینده با کارتِ سنجیده: «کجا» از متن، «چطور» از او ===');
{
  ok('۳.۱ مکث از «میانِ بندها»ی کارتِ خودِ او',
     speakMoodPause_({ name: 'گلدوز', cue: 'در دلِ جمله 0.30 ثانیه، میانِ دو جمله 0.60، و میانِ بندها 1.1.' }).sec === 1.1);
  ok('۳.۱-ب رقمِ فارسی و ممیزِ فارسی هم', speakMoodPause_({ name: 'ر', cue: 'میانِ بندها ۱٫۴ ثانیه' }).sec === 1.4);
  const out1 = speakMoodPause_({ name: 'ر', cue: 'میانِ بندها 7.5' });
  ok('۳.۱-پ عددِ پرت هدف نمی‌سازد', out1.sec === (CFG.SPEAK_PAUSE_SEC || 0.9) && out1.src === 'پیش‌فرض', JSON.stringify(out1));
  ok('۳.۱-ت بی گوینده، پیش‌فرض', speakMoodPause_(null).src === 'پیش‌فرض');

  /* همان شکلِ ذخیره‌شده‌ای که `personaFor_` می‌سازد، نه شکلِ دلخواه (درسِ `recapCast_`). */
  const card = 'متعادل بخوان: هر عبارت حدودِ 1.5 ثانیه و بعد مکث؛ در دلِ جمله 0.30 ثانیه، ' +
               'میانِ دو جمله 0.60، و میانِ بندها 1.1. تأکید را با مکث و کشش بساز، نه با بلند کردنِ صدا.';
  /* چهل جمله: سقفِ حالت از طولِ متن می‌آید (یکی برای هر `SPEAK_SPAN_EP_EVERY`)،
     پس متنِ کوتاه فقط یک حالت می‌گیرد — و «مکث» باید جا داشته باشد. */
  const segs = [{ text: Array.from({ length: 40 }, (_, k) => 'جملهٔ ' + (k + 1) + ' از متنِ آزمون است.').join(' '), style: 'پایه' }];
  const ep = { __persona: { key: 'spk-1g0r95d', name: 'محمد تقی پور گلدوز', cue: card, once: false, modes: [] } };
  const n0 = plannerPrompts.length;
  const r = speakMoodsStep_(ep, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 99);
  const p3 = plannerPrompts[n0] || '';
  ok('۳.۲ پرسشِ حالت کارتِ او را با نامش می‌برد', r.done && p3.indexOf('محمد تقی پور گلدوز') !== -1 &&
     p3.indexOf('تأکید را با مکث و کشش بساز') !== -1, p3.slice(p3.indexOf('این متن را «'), p3.indexOf('این متن را «') + 50));
  ok('۳.۳ و نقشه گوینده و مکثِ خودش را ثبت می‌کند', ep.__moods.by === 'محمد تقی پور گلدوز' &&
     ep.__moods.pause === 1.1 && /گلدوز/.test(ep.__moods.pauseSrc), JSON.stringify({ by: ep.__moods.by, pz: ep.__moods.pause }));
  const sp = speakSanitize_(speakTextOf_(ep, 0, speakSanitize_(segs[0].text)));
  const pcs = speakSegPieces_(ep, 0, sp);
  const pre = pcs.filter(x => x.pre > 0);
  ok('۳.۴ «مکث» در صدا همان ۱٫۱ ثانیهٔ اوست، نه ۰٫۹', pre.length === 1 && pre[0].pre === 1.1, JSON.stringify(pre.map(x => x.pre)));
  /* «کجا» مالِ متن است: همان متن بی گوینده همان جاها را می‌گیرد (پاسخِ بدَل
     یکی است) — تفاوت فقط در پرسش و در طولِ مکث است. */
  const ep2 = { __persona: null };
  speakMoodsStep_(ep2, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 99);
  ok('۳.۵ بی گوینده، پرسش نامی از هیچ‌کس نمی‌بَرد و مکث پیش‌فرض است',
     plannerPrompts[plannerPrompts.length - 1].indexOf('این متن را «') === -1 && ep2.__moods.by === '' &&
     ep2.__moods.pause === (CFG.SPEAK_PAUSE_SEC || 0.9));
  ok('۳.۶ نشانه‌ها و اعراب مالِ متن‌اند: تکه‌ها جز طولِ مکث یکی‌اند',
     JSON.stringify(speakSegPieces_(ep2, 0, sp).map(x => [x.t, x.k])) === JSON.stringify(pcs.map(x => [x.t, x.k])));
}

console.log('\n=== ۴) ازسرگیری و شکست: یک بار حساب، هرگز دوباره ===');
{
  const keepB = CFG.SPEAK_SPAN_EP_BLOCK; CFG.SPEAK_SPAN_EP_BLOCK = 20;
  try {
    const segs = [0, 1, 2].map(i => ({ text: Array.from({ length: 18 }, (_, k) => 'بخشِ ' + i + ' جملهٔ ' + (k + 1) + ' است.').join(' ') }));
    /* یک‌نفس */
    const A = { __persona: null };
    speakMoodsStep_(A, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 7);
    /* با مهلتی که پس از بندِ اول تمام می‌شود */
    const B = { __persona: null }; let saves = 0;
    const r1 = speakMoodsStep_(B, segs, Date.now() + 39000, () => { saves++; }, ENRICH_SHOW_VARIETY, 7);
    ok('۴.۱ مهلت که تمام شود، ناتمام برمی‌گردد و ذخیره می‌کند', !r1.done && B.__moods.bi === 1 && saves >= 1,
       JSON.stringify({ done: r1.done, bi: B.__moods.bi }));
    const asked = plannerPrompts.length;
    const r2 = speakMoodsStep_(B, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 7);
    ok('۴.۲ اجرای بعد از همان بند ادامه می‌دهد و نتیجه همان است که یک‌نفس',
       r2.done && B.__moods.nb === 3 && plannerPrompts.length === asked + 2 &&
       JSON.stringify(B.__moods.segs) === JSON.stringify(A.__moods.segs), B.__moods.nb + ' بند');
    const asked2 = plannerPrompts.length;
    speakMoodsStep_(B, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 7);
    ok('۴.۳ نقشهٔ تمام‌شده دوباره پرسیده نمی‌شود', plannerPrompts.length === asked2);

    /* مدل جواب نداد: یک بار دوباره، بعد «رهاشده» با علت — نه حلقهٔ بی‌پایان. */
    plannerMode = 'fail';
    const C = { __persona: null };
    const f1 = speakMoodsStep_(C, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 7);
    ok('۴.۴ پرسشِ ناموفق ⇒ «دوباره در اجرای بعد»', !f1.done && f1.retry && C.__moods.tries === 1);
    let f2 = null, k = 0;
    while (k++ < 10) { f2 = speakMoodsStep_(C, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 7); if (f2.done) break; }
    ok('۴.۵ و پس از سقف رها می‌شود، با علت، و تمام', f2.done && C.__moods.got === 0 &&
       C.__moods.why.length === 3 && /جواب نداد/.test(C.__moods.why[0]) && k <= 4, C.__moods.why[0]);
    const rc = speakMoodRecord_(C, [], 'آزمونِ شکست');
    ok('۴.۶ کارنامه آن را ایراد می‌شمارد (رد شد/جواب نداد)، نه «مدل حالتی نخواست»', rc.fault === 1 && /جواب نداد/.test(rc.why), rc.why);
  } finally { CFG.SPEAK_SPAN_EP_BLOCK = keepB; plannerMode = 'ok'; }
}

console.log('\n=== ۵) کلیدِ خاموش، و جدولِ تلفظی که جمله را می‌شکند ===');
{
  const segs = [{ text: Array.from({ length: 14 }, (_, k) => 'جملهٔ ' + (k + 1) + ' اینجا گفته می‌شود.').join(' ') }];
  const E = { __persona: null };
  speakMoodsStep_(E, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 5);
  const sp = speakSanitize_(speakTextOf_(E, 0, speakSanitize_(segs[0].text)));
  ok('۵.۰ با نقشه، تکه‌ها حالت دارند', speakSegPieces_(E, 0, sp).some(x => x.k));
  const keep = CFG.SPEAK_SPANS_EP; CFG.SPEAK_SPANS_EP = false;
  try {
    const off = speakSegPieces_(E, 0, sp);
    ok('۵.۱ خاموش ⇒ همان لحظه دقیقاً تکه‌های دیروز، حتی با نقشهٔ ذخیره‌شده',
       JSON.stringify(off.map(x => x.t)) === JSON.stringify(splitForTts_(applyPron_(sp))) && off.every(x => !x.k && !x.pre));
    const F0 = { __persona: null };
    ok('۵.۲ خاموش ⇒ مرحلهٔ متن هیچ پرسشی نمی‌کند', speakMoodsStep_(F0, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_VARIETY, 5).off === true && !F0.__moods);
  } finally { CFG.SPEAK_SPANS_EP = keep; }
  /* جدولِ تلفظی که «.» بیاورد شمارِ جمله را عوض می‌کند؛ «آرام» روی جملهٔ کناری
     می‌نشست. بی‌حالت، و کارنامه کمبود را می‌شمارد. */
  const realPron = global.applyPron_;
  global.applyPron_ = function (t) { return String(t).replace('جملهٔ ۲', 'جملهٔ. ۲').replace('جملهٔ 2', 'جملهٔ. 2'); };
  try {
    const bad = speakSegPieces_(E, 0, sp);
    ok('۵.۳ شمارِ جملهٔ عوض‌شده ⇒ بی‌حالت، نه حالتِ جابه‌جا', bad.every(x => !x.k && !x.pre), bad.length);
  } finally { global.applyPron_ = realPron; }
  const rl = speakMoodRecord_(E, [], 'آزمونِ گم‌شدن');
  ok('۵.۴ برنامه‌ریزی‌شده‌ای که هیچ‌جا ننشست ⇒ ایراد، با شمارِ گم‌شده', rl.fault === 1 && rl.lost === rl.plan && rl.plan > 0,
     JSON.stringify({ plan: rl.plan, lost: rl.lost }));
}

console.log('\n=== ۶) درس‌نامه: دوقلوی صدا و متنِ ویدئو با حالت‌ها هم یکی‌اند ===');
{
  const ep = { title: 'درسِ آزمون', hook: 'سلام. امروز درسی تازه داریم.',
    sections: [0, 1].map(i => ({ heading: 'فصل ' + i,
      narration: Array.from({ length: 10 }, (_, k) => 'گزارهٔ ' + (k + 1) + ' از فصلِ ' + i + ' را می‌خوانیم.').join(' '),
      tone: 'شمرده' })), outro: 'تا درسِ بعد.', __persona: null };
  const segs = specialSegments_(ep, '');
  speakMoodsStep_(ep, segs, Date.now() + 600000, () => {}, ENRICH_SHOW_SPECIAL, 70);
  const keepM = CFG.MUSIC_ENABLED; CFG.MUSIC_ENABLED = false;
  let audio, text;
  try {
    audio = buildSpecialChunks_(ep, 70, '').filter(c => !c.pcm);
    text = specialTextChunks_(ep, '');
  } finally { CFG.MUSIC_ENABLED = keepM; }
  ok('۶.۱ همان شمار و همان متنِ تکه‌ها — کارت‌های ویدئو جابه‌جا نمی‌شوند',
     audio.length === text.length && audio.every((c, i) => c.text === text[i].text), audio.length + ' / ' + text.length);
  ok('۶.۲ و صداسازیِ درس‌نامه هم حالت و مکث می‌گیرد', audio.some(c => c.mood) && audio.some(c => c.pre > 0),
     audio.filter(c => c.mood).map(c => c.mood).join(','));
}

console.log('\n=== ۷) دو قسمتِ پیاپیِ ناقص ⇒ یافتهٔ کد؛ یکی ⇒ هیچ ===');
{
  const save = global.__PROPS[PK.SPEAK_MOODS];
  /* از همان خواننده‌ای که صفِ کد را می‌سازد — نه با حدسِ نامِ تب. */
  const findings = () => loadReportRows_(getHub_()).rows
    .filter(r => String(r.vals.join('|')).indexOf('speak-moods-fault') !== -1);
  try {
    global.__PROPS[PK.SPEAK_MOODS] = JSON.stringify([{ at: nowStr_(), l: 'الف', on: 1, plan: 5, got: 5, fault: 0 },
                                                      { at: nowStr_(), l: 'ب', on: 1, plan: 5, got: 0, lost: 5, fault: 1, why: 'x' }]);
    const before = findings().length;
    ok('۷.۱ یک قسمتِ بد هیچ یافته‌ای نمی‌سازد', speakMoodGates_(null) === false && findings().length === before);
    /* نشانه‌ها **بالای** کف، تا فقط حالتِ ناقص `ok` را پایین بیاورد — وگرنه
       دو قفل یکدیگر را می‌پوشانند (۷٫۴۱؛ شکستنِ عمدیِ قفلِ حالت سبز ماند). */
    const saveSk = global.__PROPS[PK.SPEAK_SKIP];
    global.__PROPS[PK.SPEAK_SKIP] = JSON.stringify([{ l: 'ب', pr: 9, pk: 4 }]);
    let ms;
    try { ms = speakMoodStatus_(); }
    finally { if (saveSk === undefined) delete global.__PROPS[PK.SPEAK_SKIP]; else global.__PROPS[PK.SPEAK_SKIP] = saveSk; }
    ok('۷.۲ ولی سطرِ روزانه همان روز ⚠️ می‌گوید و ok پایین است — از خودِ حالت، نه از نشانه‌ها',
       ms.ok === false && ms.prOk === true && /^⚠️/.test(ms.line), ms.line.slice(0, 90));
    global.__PROPS[PK.SPEAK_SKIP] = JSON.stringify([{ l: 'ب', pr: 1, pk: 1 }]);
    global.__PROPS[PK.SPEAK_MOODS] = JSON.stringify([{ at: nowStr_(), l: 'ب', on: 1, plan: 5, got: 5, fault: 0 }]);
    let ms2;
    try { ms2 = speakMoodStatus_(); }
    finally { if (saveSk === undefined) delete global.__PROPS[PK.SPEAK_SKIP]; else global.__PROPS[PK.SPEAK_SKIP] = saveSk; }
    ok('۷.۲-ب و نشانه‌گذاریِ زیرِ کف به‌تنهایی هم ⚠️ است', ms2.ok === false && /زیرِ کف/.test(ms2.line), ms2.line.slice(0, 90));
    global.__PROPS[PK.SPEAK_MOODS] = JSON.stringify([{ at: nowStr_(), l: 'الف', on: 1, plan: 5, got: 5, fault: 0 },
                                                      { at: nowStr_(), l: 'ب', on: 1, plan: 5, got: 0, lost: 5, fault: 1, why: 'x' }]);
    global.__PROPS[PK.SPEAK_MOODS] = JSON.stringify([{ at: nowStr_(), l: 'الف', on: 1, plan: 5, got: 0, lost: 5, fault: 1, why: 'x' },
                                                      { at: nowStr_(), l: 'ب', on: 1, plan: 0, got: 0, fault: 1, why: 'مدل جواب نداد: quota' }]);
    ok('۷.۳ دو قسمتِ پیاپیِ بد ⇒ یافتهٔ «speak-moods-fault» در صفِ کد', speakMoodGates_(null) === true && findings().length > before,
       findings().length);
  } finally { if (save === undefined) delete global.__PROPS[PK.SPEAK_MOODS]; else global.__PROPS[PK.SPEAK_MOODS] = save; }
}

console.log('\n=== ۹) بازبینی خاموش، حالت‌ها نه ===');
{
  /* `speak2` دو کار دارد. تا ۸.۳۹ خاموش‌کردنِ بازبینی این مرحله را حذف می‌کرد؛
     اگر همان بماند، حالت‌ها هم بی‌صدا حذف می‌شوند. */
  const keep = CFG.SPEAK_REVIEW; CFG.SPEAK_REVIEW = false;
  const n0 = plannerPrompts.length;
  try { runEpisode(); } finally { CFG.SPEAK_REVIEW = keep; }
  const m9 = JSON.parse(lastFolder().getBlob().getDataAsString()).ep.__moods;
  ok('۹.۱ بازبینیِ خاموش، حالت‌ها را خاموش نکرد', !!(m9 && m9.done) && plannerPrompts.length === n0 + 1,
     m9 ? 'پرسش ' + m9.asked : 'نقشه نیست');
}

console.log('\n=== ۸) سیم‌کشی و ناظر ===');
{
  ok('۸.۱ کلیدِ ناظر ثبت است', (CFG.MONITOR_CHECKS || []).some(x => x.key === 'speak-moods'));
  const dir = 'docs/prompts';
  const latest = fs.readdirSync(dir).filter(f => /^_PROMPT-monitor-v\d+\.md$/.test(f))
    .sort((a, b) => Number(a.match(/v(\d+)/)[1]) - Number(b.match(/v(\d+)/)[1])).pop();
  const body = fs.readFileSync(dir + '/' + latest, 'utf8');
  ok('۸.۲ پرامپتِ ناظر وظیفهٔ حالت‌ها را دارد (§۴٫۱۶) و `speakMoods` را می‌خوانَد',
     /§۴٫۱۶/.test(body) && body.indexOf('speakMoods') !== -1 && body.indexOf('speak-moods') !== -1, latest);
  ok('۸.۳ پرامپتِ ناظر برای همین نسخهٔ موتور است', body.indexOf('برای نسخهٔ موتور: ' + CFG.CODE_VERSION) !== -1, latest);
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ حالت‌ها گذشت.');
