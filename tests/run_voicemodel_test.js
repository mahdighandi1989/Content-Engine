/* ۸.۴۱ — مدلِ گویندهٔ تازه خودکار از گیت‌هاب به درایو، و نمونهٔ آزمونِ خودکار.
 *
 * او پرسید «یعنی من دارم چی رو بعد از سی روز از دست میدم؟». جواب: مدلِ هر
 * گویندهٔ تازه، اگر کسی دستی به درایو نبردش. این مجموعه از همان درهایی وارد
 * می‌شود که تولید وارد می‌شود — تریگرِ ساعتی، اجرای جدای برداشت، صف، کارِ
 * شبانه — و بعد می‌پرسد فایل **با همان بایت‌ها** در «مدل‌های صدا» نشست یا نه.
 * سمتِ گیت‌هاب (`tools/voicemodel.py`) هم اجرا می‌شود، نه خوانده.
 */
const { outPath } = require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const fs = require('fs'); const cp = require('child_process'); const os = require('os');
const crypto = require('crypto'); const path = require('path');
require('./lib/mock.js');
const F = ['00_Config.gs','01_Taxonomy.gs','02_Sync.gs','03_Producer.gs','04_Mailer.gs','05_Setup.gs','06_Models.gs','07_Telegram.gs','08_Health.gs','09_DateWords.gs','10_Sources.gs','11_SourceHealth.gs','12_Reports.gs','13_Series.gs','14_Special.gs','15_Board.gs','16_Curate.gs','17_Backup.gs','18_Files.gs','19_Enrich.gs','20_Voices.gs','21_SelfUpdate.gs','22_SourceScripts.gs','23_Music.gs','24_ContentAudit.gs','25_Calendar.gs','26_Handout.gs','27_YouTube.gs','28_SourceQuality.gs','29_Explain.gs','30_Recap.gs','31_Bridge.gs','32_Persona.gs','33_VoiceIntake.gs','34_Search.gs','35_Embed.gs','36_VoiceBridge.gs'];
let src = ''; for (const f of F) src += '\n' + fs.readFileSync('src/' + f, 'utf8'); (0, eval)(src);

let pass = 0;
const ok = (n, c, d) => { console.log('  ' + (c ? '✅' : '❌') + ' ' + n + (d !== undefined ? ' — ' + d : ''));
  if (!c) throw new Error('FAILED: ' + n); pass++; };

global.__PROPS['TELEGRAM_BOT_TOKEN'] = '1:FAKE'; global.__PROPS['TELEGRAM_CHAT_ID'] = '-100';
const sha = b => crypto.createHash('sha256').update(Buffer.from(b)).digest('hex');
const bytesOf = (n, seed) => { const b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = (i * 31 + seed) & 255; return b; };

/* ── گیت‌هاب و درایوِ ساختگی ──
   هر تحویل: تکه‌ها با نشانیِ خودشان. بارگذاریِ ازسرگیری‌پذیر همان پروتکلِ
   درایو: POST ⇒ `Location`، PUTها با `Content-Range` ⇒ ۳۰۸، آخری ⇒ ۲۰۰ و فایل. */
let DOC = { speakers: {} };
const PIECES = {};
const tg = [], puts = [], inits = [];
let sessions = {}, sessSeq = 0, metaLie = '', initCode = 200, pieceCode = 200, shaMissing = false, sizeLie = 0;
let hubCalls = 0;
function mkDrop(key, name, at, pthBytes, idxBytes) {
  const mk = (kind, buf) => {
    const parts = [], P = 7;
    for (let o = 0, i = 0; o < buf.length; o += P, i++) {
      const piece = buf.slice(o, Math.min(buf.length, o + P));
      const url = 'https://github.com/x/releases/download/voice-model-drop/' + key + '-' + at.replace(/\W/g, '') + '.' + kind + '.p' + i;
      PIECES[url] = piece;
      parts.push({ url, size: piece.length, sha256: sha(piece) });
    }
    return { name: key + '.' + kind, size: buf.length, sha256: sha(buf), parts };
  };
  const md = { v: 1, at, state: 'منتظرِ موتور', expireH: 72, pth: mk('pth', pthBytes) };
  if (idxBytes) md.index = mk('index', idxBytes);
  DOC.speakers[key] = Object.assign(DOC.speakers[key] || {}, { name, stage: 'آماده', modelDrop: md });
  return md;
}
global.__STUB = function (url, body, opt) {
  opt = opt || {};
  if (url.indexOf('api.telegram.org') !== -1) { tg.push({ m: url.split('/').pop(), body }); return { code: 200, json: { ok: true, result: {} } }; }
  if (url.indexOf('raw.githubusercontent.com') !== -1 && url.indexOf('docs/voices.json') !== -1) {
    return { code: 200, text: JSON.stringify(DOC) };
  }
  if (PIECES[url]) {
    if (pieceCode !== 200) return { code: pieceCode, text: 'not found' };
    return { code: 200, bytes: Array.from(PIECES[url]).map(x => x > 127 ? x - 256 : x), mime: 'application/octet-stream' };
  }
  if (url.indexOf('/upload/drive/v3/files?uploadType=resumable') !== -1) {
    inits.push({ url, body, opt });
    if (initCode !== 200) return { code: initCode, text: '{"error":"insufficientPermissions"}' };
    const id = 'S' + (++sessSeq);
    sessions[id] = { meta: body, total: Number(opt.headers['X-Upload-Content-Length']), got: [] };
    return { code: 200, json: {}, headers: { Location: 'https://www.googleapis.com/upload/drive/v3/files?upload_id=' + id } };
  }
  if (url.indexOf('upload_id=') !== -1) {
    const id = url.split('upload_id=')[1];
    const s = sessions[id];
    const range = String((opt.headers || {})['Content-Range'] || '');
    const blob = opt.payload;
    const b = Buffer.from((blob.getBytes ? blob.getBytes() : []).map(x => x & 255));
    puts.push({ range, n: b.length, follow: opt.followRedirects, method: opt.method });
    const m = range.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
    const have = s.got.reduce((a, x) => a + x.length, 0);
    if (!m || Number(m[1]) !== have || Number(m[2]) - Number(m[1]) + 1 !== b.length) return { code: 400, text: 'bad range ' + range };
    s.got.push(b);
    const now = have + b.length;
    if (now < s.total) return { code: 308, text: '' };
    const all = Buffer.concat(s.got);
    const fold = DriveApp.getFolderById(s.meta.parents[0]);
    const f = fold.createFile(Utilities.newBlob(Array.from(all).map(x => x > 127 ? x - 256 : x), 'application/octet-stream', s.meta.name));
    f.__sha = metaLie ? 'f'.repeat(64) : sha(all);
    return { code: 200, json: { id: f.getId(), name: s.meta.name } };
  }
  const mm = url.match(/drive\/v3\/files\/([^?]+)\?fields=size,sha256Checksum/);
  if (mm) {
    const f = global.__FILES_BY_ID[decodeURIComponent(mm[1])];
    if (!f) return { code: 404, text: '' };
    const j = { size: String(f.getSize() + sizeLie) };
    if (!shaMissing) j.sha256Checksum = f.__sha;
    return { code: 200, json: j };
  }
  return { code: 404, text: 'no stub: ' + url };
};
const realHub = getHub_;
global.getHub_ = function () { hubCalls++; return realHub.apply(this, arguments); };
getHub_();
const trig = n => global.__TRIGGERS.filter(t => t.getHandlerFunction() === n).length;
const clearTrig = () => { global.__TRIGGERS.length = 0; };
const modelsFolder = () => vbrFolder_();
const fileIn = name => modelsFolder()._files.filter(f => f.getName() === name);
const bytesOfFile = f => Buffer.from(f.getBlob().getBytes().map(x => x & 255));
/* صفِ گویندگان، همان‌طور که شبانه ساخته می‌شود — تا «رسید» در آن بنشیند. */
putOutJson_(String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json'), { rev: 3, at: 'x', speakers: [] });
const queue = () => JSON.parse(outFolder_().getFilesByName(String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json')).next().getBlob().getDataAsString());

console.log('\n=== ۱) تحویلِ تازه: تریگرِ ساعتی فقط زمان‌بندی می‌کند ===');
const P1 = bytesOf(40, 3), I1 = bytesOf(23, 9);
mkDrop('spk-new1', 'نفرِ تازه', '2026-10-04T10:00:00Z', P1, I1);
DOC.speakers['spk-old'] = { name: 'قدیمی', stage: 'آماده', modelDrop: { state: 'برداشته شد', pth: { parts: [] } } };
ok('۱.۱ فقط تحویلِ «منتظرِ موتور» با تکه شمرده می‌شود', vbrModelDrops_(DOC).map(d => d.key).join(',') === 'spk-new1');
clearTrig(); hubCalls = 0;
const fetches0 = global.__FETCHES.length;
vbrCollectHourly();
ok('۱.۲ تریگرِ ساعتی اجرای جدای برداشت را زمان‌بندی کرد', trig('runVoiceModelFetch') === 1);
ok('۱.۳ و خودش هیچ تکه‌ای برنداشت و هیچ بارگذاری‌ای نکرد (کارِ سنگین جای خودش است)',
   global.__FETCHES.slice(fetches0).every(x => !PIECES[x.url] && x.url.indexOf('/upload/') === -1));

console.log('\n=== ۲) اجرای جدا: بارگذاریِ ازسرگیری‌پذیر، اثرانگشت، صف، نمونه، خبر ===');
tg.length = 0; global.__MAIL.length = 0;
const r2 = runVoiceModelFetch();
const pf = fileIn('spk-new1.pth'), xf = fileIn('spk-new1.index');
ok('۲.۱ هر دو فایل با نامِ دقیقِ کلید در «مدل‌های صدا» نشستند', pf.length === 1 && xf.length === 1,
   modelsFolder()._files.map(f => f.getName()).join(' | '));
ok('۲.۲ با همان بایت‌ها، نه فقط همان اندازه', bytesOfFile(pf[0]).equals(P1) && bytesOfFile(xf[0]).equals(I1));
const pPuts = puts.filter((p, i) => i < 6);
ok('۲.۳ تکه‌ها پشتِ‌هم با `Content-Range` درست، بی دنبال‌کردنِ ۳۰۸',
   puts.length === 6 + 4 && puts.every(p => p.method === 'put' && p.follow === false) &&
   pPuts[0].range === 'bytes 0-6/40' && pPuts[5].range === 'bytes 35-39/40', pPuts.map(p => p.range).join(' '));
const have = JSON.parse(global.__PROPS['VMODEL_HAVE'] || '{}');
ok('۲.۴ برداشت با زمانِ **همان** تحویل ثبت شد', have['spk-new1'] && have['spk-new1'].ok && have['spk-new1'].drop === '2026-10-04T10:00:00Z',
   JSON.stringify(have['spk-new1']));
const q2 = queue();
ok('۲.۵ «رسید» همین حالا در صفِ گویندگان نشست — گیت‌هاب تکه‌ها را پاک می‌کند',
   q2.models && q2.models['spk-new1'] && q2.models['spk-new1'].ok === true && q2.models['spk-new1'].drop === '2026-10-04T10:00:00Z' &&
   q2.rev === 4, JSON.stringify(q2.models));
ok('۲.۶ و صف «هرکس با لینک» ماند', outFolder_().getFilesByName(String(CFG.VOICE_QUEUE_FILE || '_VOICE-QUEUE.json')).next().getSharingAccess() === 'ANYONE_WITH_LINK');
const seeds = vbrSoulSeeds_();
ok('۲.۷ گوینده بی هیچ نسخهٔ کد یا تیکی به فهرستِ نمونهٔ خودکار رفت',
   seeds.some(s => s.speaker === 'spk-new1' && s.tag === VBR_AUTO_SEED_TAG && s.text === 'ساعت‌ساز'),
   seeds.map(s => s.speaker + (s.auto ? '(خودکار)' : '')).join(','));
const tgT = tg.filter(c => c.m === 'sendMessage').map(c => String(c.body.text || '')).join('\n');
ok('۲.۸ در تلگرام گفته شد — با «نمونه می‌آید» و «روشن‌کردن تصمیمِ شماست»',
   /خودکار از گیت‌هاب به درایو آمد/.test(tgT) && /نمونهٔ آزمونش/.test(tgT) && /تصمیمِ شماست/.test(tgT));
ok('۲.۹ و `vbrModel_` حالا مدل را پیدا می‌کند — پل همان را می‌خوانَد', vbrModel_('spk-new1').ok === true);
ok('۲.۱۰ نتیجهٔ اجرا هم همین را می‌گوید', r2.length === 1 && r2[0].ok === true);

console.log('\n=== ۳) تکرار هزینه ندارد ===');
clearTrig();
vbrModelDropDue_();
ok('۳.۱ تحویلی که برداشته شده دوباره زمان‌بندی نمی‌شود', trig('runVoiceModelFetch') === 0);
const nI = inits.length;
runVoiceModelFetch();
ok('۳.۲ و اجرای دستیِ دوباره هم چیزی بارگذاری نمی‌کند', inits.length === nI);
clearTrig();
vbrSoulSeedDue_();
ok('۳.۳ زمان‌بندِ نمونه همان گویندهٔ تازه را برمی‌دارد', trig('runVoiceSoulSeed') === 1);
/* و انتخاب‌گر هم — همان تعریف. زمان‌بندی که زمان‌بندی کند و انتخاب‌گری که
   نشناسدش، هر روز یک اجرای بی‌حاصل است بی هیچ خطا (۷٫۸۶). شکستنِ همین
   (B22) در دورِ اولِ سوئیپ سبز ماند. ردیفِ «صداها» همان شکلی است که
   `personaAddFromCard_` برای گویندهٔ تازه می‌سازد: خاموش، با کارتِ سبک. */
{
  const pt = personaTab_(getHub_());
  const row = new Array(PERSONA_HEADERS.length).fill('');
  row[PC.KEY - 1] = 'spk-new1'; row[PC.NAME - 1] = 'نفرِ تازه'; row[PC.ON - 1] = 'خیر';
  row[PC.STYLE - 1] = 'میانِ دو جمله 0.60، و میانِ بندها 1.1.';
  pt.getRange(pt.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  const pk = vbrSoulPick_();
  ok('۳.۴ انتخاب‌گرِ نمونه همان بذرِ خودکار را برمی‌دارد — متنِ آزمون، برچسبِ خودکار',
     pk.ok && pk.key === 'spk-new1' && pk.seeded && pk.tag === VBR_AUTO_SEED_TAG && pk.item && pk.item.text === 'ساعت‌ساز',
     JSON.stringify({ ok: pk.ok, key: pk.key, tag: pk.tag, why: pk.why }));
}

console.log('\n=== ۴) فایلِ موجود با همان اندازه: بی بارگذاری ===');
const P4 = bytesOf(30, 5);
modelsFolder().createFile(Utilities.newBlob(Array.from(P4).map(x => x > 127 ? x - 256 : x), 'application/octet-stream', 'spk-hand.pth'));
mkDrop('spk-hand', 'دستی', '2026-10-04T11:00:00Z', P4, null);
const nI4 = inits.length;
runVoiceModelFetch();
ok('۴.۱ مدلی که دستی گذاشته شده بود دوباره بالا نرفت، ولی «رسید» ثبت شد',
   inits.length === nI4 && JSON.parse(global.__PROPS['VMODEL_HAVE'])['spk-hand'].ok === 1 && fileIn('spk-hand.pth').length === 1);

console.log('\n=== ۵) آموزشِ دوباره: فایلِ قدیم فقط پس از وارسیِ تازه کنار می‌رود ===');
const P5 = bytesOf(33, 11);
mkDrop('spk-new1', 'نفرِ تازه', '2026-10-05T09:00:00Z', P5, null);
runVoiceModelFetch();
const f5 = fileIn('spk-new1.pth');
ok('۵.۱ تحویلِ تازه با زمانِ تازه دوباره برداشته شد و قدیمی به سطل رفت', f5.length === 1 && bytesOfFile(f5[0]).equals(P5),
   f5.map(f => f.getSize()).join(','));
ok('۵.۲ و «رسید» مالِ تحویلِ تازه است', JSON.parse(global.__PROPS['VMODEL_HAVE'])['spk-new1'].drop === '2026-10-05T09:00:00Z');

console.log('\n=== ۶) اثرانگشتِ ناهمخوان: مدلِ خراب «موجود» شمرده نمی‌شود ===');
const P6 = bytesOf(20, 1);
mkDrop('spk-bad', 'خراب', '2026-10-04T12:00:00Z', P6, null);
metaLie = 'yes'; tg.length = 0;
try {
  runVoiceModelFetch();
  ok('۶.۱ فایلِ ناهمخوان به سطل رفت و هیچ مدلی نماند', fileIn('spk-bad.pth').length === 0);
  const fl = JSON.parse(global.__PROPS['VMODEL_FAIL'] || '{}')['spk-bad'];
  ok('۶.۲ شکست با علت شمرده شد، «رسید» ثبت نشد', fl && fl.n === 1 && /اثرانگشت/.test(fl.why) &&
     !JSON.parse(global.__PROPS['VMODEL_HAVE'])['spk-bad'], fl && fl.why);
  ok('۶.۳ و صف «رسید»ِ آن را ندارد — تکه‌ها نباید پاک شوند', !queue().models['spk-bad']);
  ok('۶.۴ یک شکست هنوز پیامِ دستی نمی‌فرستد', !tg.some(c => /به درایو نیامد/.test(String(c.body.text || ''))));
  runVoiceModelFetch(); runVoiceModelFetch();
  const rows = loadReportRows_(getHub_()).rows || [];
  const fnd = rows.filter(r => String((r.vals || []).join('|')).indexOf('#vmodel-spk-bad') !== -1);
  ok('۶.۵ سه شکستِ پیاپی ⇒ یافتهٔ کد، با کلیدی که در شناسهٔ ردیف می‌مانَد (بسته‌شدنی با `answers`)',
     fnd.length === 1 && String(fnd[0].vals.join('|')).indexOf(ROWNER_CODE) !== -1, fnd.length);
  const tgBad = tg.filter(c => c.m === 'sendMessage').map(c => String(c.body.text || '')).find(x => /به درایو نیامد/.test(x)) || '';
  ok('۶.۶ و پیامی با راهِ دستی و نامِ دقیقِ دو فایل', /«spk-bad\.pth»/.test(tgBad) && /«spk-bad\.index»/.test(tgBad), tgBad.split('\n')[1]);
  const vs = vbrStatus_();
  ok('۶.۷ خطِ روزانهٔ پل همین را می‌گوید و `ok` پایین است', /هنوز از گیت‌هاب به درایو نیامده/.test(vs.line) && vs.ok === false);
} finally { metaLie = ''; }

console.log('\n=== ۷) خطاهای راه، با نام ===');
{
  mkDrop('spk-403', 'بی‌اسکوپ', '2026-10-04T13:00:00Z', bytesOf(9, 2), null);
  initCode = 403;
  try {
    const r = vbrModelFetchOne_({ key: 'spk-403', name: 'x', md: DOC.speakers['spk-403'].modelDrop });
    ok('۷.۱ ۴۰۳ِ درایو نام برده می‌شود — «اسکوپِ درایو؟»', !r.ok && /HTTP 403/.test(r.why) && /اسکوپِ درایو/.test(r.why), r.why);
  } finally { initCode = 200; }
  pieceCode = 404;
  try {
    const r = vbrModelFetchOne_({ key: 'spk-403', name: 'x', md: DOC.speakers['spk-403'].modelDrop });
    ok('۷.۲ تکه‌ای که از گیت‌هاب نیامد (پاک شده؟) با شماره‌اش', !r.ok && /تکهٔ ۱|تکهٔ 1/.test(r.why) && /404/.test(r.why), r.why);
  } finally { pieceCode = 200; }
  const bad = JSON.parse(JSON.stringify(DOC.speakers['spk-403'].modelDrop));
  bad.pth.size = 999;
  const r3 = vbrResumableUpload_(modelsFolder().getId(), 'z.pth', bad.pth);
  ok('۷.۳ جمعِ تکه‌ها ≠ اندازه ⇒ پیش از هر بارگذاری رد', !r3.ok && /جمعِ تکه‌ها/.test(r3.why));
  shaMissing = true;
  try {
    const r4 = vbrResumableUpload_(modelsFolder().getId(), 'z2.pth', DOC.speakers['spk-403'].modelDrop.pth);
    ok('۷.۴ اثرانگشتی که درایو هنوز نداده رد نیست، ولی گفته می‌شود (`shaChecked`)', r4.ok && r4.shaChecked === false);
    /* و درست به همین دلیل اندازه جدا سنجیده می‌شود: بی اثرانگشت، تنها شاهد
       همان است. شکستنِ این سد در دورِ اولِ سوئیپ سبز ماند (B31). */
    sizeLie = 1;
    const n0 = fileIn('z3.pth').length;
    const r5 = vbrResumableUpload_(modelsFolder().getId(), 'z3.pth', DOC.speakers['spk-403'].modelDrop.pth);
    ok('۷.۵ اندازهٔ نشستهٔ ناهمخوان ⇒ رد و سطل، حتی وقتی اثرانگشتی نیست', !r5.ok && /اندازهٔ نشسته/.test(r5.why) &&
       fileIn('z3.pth').length === n0, r5.why);
  } finally { shaMissing = false; sizeLie = 0; }
}

console.log('\n=== ۸) شبانه: مدلی که **دستی** گذاشته شد هم نمونهٔ خودکار می‌گیرد ===');
{
  const D = { speakers: {
    'spk-m': { name: 'دستی‌گذار', stage: 'آماده' },
    'spk-nomodel': { name: 'بی‌مدل', stage: 'آماده' },
    'spk-pre': { name: 'قدیمی', stage: 'آماده', preexisting: true },
    'spk-1g0r95d': { name: 'گلدوز', stage: 'آماده' },
    'spk-train': { name: 'در آموزش', stage: 'آموزش' } } };
  for (const k of ['spk-m', 'spk-pre', 'spk-1g0r95d', 'spk-train']) {
    modelsFolder().createFile(Utilities.newBlob('m', 'application/octet-stream', k + '.pth'));
  }
  const n = vbrSoulAutoScan_(D);
  const auto = JSON.parse(global.__PROPS['VSOUL_AUTO'] || '{}');
  ok('۸.۱ آماده + مدل در درایو ⇒ به فهرست', !!auto['spk-m']);
  ok('۸.۲ بی مدل، پیش‌ساخته، در آموزش، یا بذرِ دستیِ CFG ⇒ نه — فقط یکی افزوده شد',
     n === 1 && !auto['spk-nomodel'] && !auto['spk-pre'] && !auto['spk-train'] && !auto['spk-1g0r95d'], Object.keys(auto).join(','));
  const s1 = vbrSoulSeeds_().filter(s => s.speaker === 'spk-1g0r95d');
  ok('۸.۳ بذرِ دستی برنده است: گلدوز یک بذر دارد، با برچسبِ خودِ CFG', s1.length === 1 && !s1[0].auto);
  ok('۸.۴ برچسبِ بذرهای دستی «مکث به اندازهٔ خودش» را دارد — نمونهٔ تازه ساخته می‌شود (۷٫۸۶)',
     (CFG.VOICE_SOUL_SEED || []).every(s => /مکث به اندازهٔ خودش/.test(String(s.tag || ''))));
  const k0 = CFG.VOICE_SOUL_AUTO; CFG.VOICE_SOUL_AUTO = false;
  try { ok('۸.۵ کلیدِ خاموش یعنی فقط بذرهای دستی', vbrSoulSeeds_().every(s => !s.auto)); }
  finally { CFG.VOICE_SOUL_AUTO = k0; }
}

console.log('\n=== ۸-ب) گویندهٔ آماده‌ای که مدلش نه در درایو است نه در راه ===');
{
  global.__PROPS['VMODEL_FAIL'] = '{}';
  const D = { speakers: {
    'spk-gone': { name: 'جامانده', stage: 'آماده', modelDrop: { state: 'منقضی', at: 'x', closedAt: '2026-10-07T00:00:00Z' } },
    'spk-none': { name: 'بی‌تحویل', stage: 'آماده' },
    'spk-wait': { name: 'در راه', stage: 'آماده' },
    'spk-pre2': { name: 'قدیمی', stage: 'آماده', preexisting: true },
    'spk-m': { name: 'دستی‌گذار', stage: 'آماده' } } };
  const miss = vbrModelMissingScan_(D, [{ key: 'spk-wait' }]);
  ok('۸-ب.۱ منقضی و بی‌تحویل شمرده شدند؛ در راه، پیش‌ساخته و دارای مدل نه',
     Object.keys(miss).sort().join(',') === 'spk-gone,spk-none', Object.keys(miss).join(','));
  const vs = vbrStatus_();
  ok('۸-ب.۲ خطِ روزانه هر دو را با راهِ دستی و نامِ فایل‌ها می‌گوید، و `ok` پایین است',
     /«جامانده» آماده است ولی مدلش/.test(vs.line) && /منقضی شد/.test(vs.line) && /«spk-none\.pth»/.test(vs.line) && vs.ok === false);
  global.__PROPS['VMODEL_MISSING'] = '{}';
}

console.log('\n=== ۹) کارِ شبانه: صفِ بازنویسی‌شده «رسید» را نگه می‌دارد ===');
{
  const m = vintModelsForQueue_(null);
  ok('۹.۱ «رسید»ها از Script Properties، بی هیچ خواندنِ درایو', m['spk-new1'] && m['spk-new1'].ok === true && !m['spk-bad']);
  const body = fs.readFileSync('src/33_VoiceIntake.gs', 'utf8');
  const q = body.slice(body.indexOf('function vintQueue_('), body.indexOf('function vintQueue_(') + 9000);
  ok('۹.۲ `vintQueue_` پیش از نوشتن `models` را می‌گذارد', /q\.models = vintModelsForQueue_\(null\);\s*putOutJson_/.test(q));
  clearTrig(); hubCalls = 0;
  const nb = vbrNightly_(getHub_());
  ok('۹.۳ کارِ شبانه هم می‌پرسد', nb.models && typeof nb.models.pending === 'number', JSON.stringify(nb.models));
  /* «spk-old» آماده است، تحویلش بسته شده و مدلش در درایو نیست — همان حالتی
     که بی شمارش، سکوتش «سالم» خوانده می‌شد. */
  const miss9 = JSON.parse(global.__PROPS['VMODEL_MISSING'] || '{}');
  ok('۹.۵ کارِ شبانه گویندهٔ آماده‌ای را که مدلش نه در درایو است نه در راه، می‌شمارد',
     !!miss9['spk-old'] && !miss9['spk-new1'] && !miss9['spk-bad'], Object.keys(miss9).join(','));
  global.__PROPS['VMODEL_MISSING'] = '{}';
  const k1 = CFG.VBR_MODEL_AUTO; CFG.VBR_MODEL_AUTO = false;
  try { ok('۹.۴ کلیدِ خاموش ⇒ همان راهِ دستیِ قبل', /خاموش/.test(vbrModelDropDue_().why)); }
  finally { CFG.VBR_MODEL_AUTO = k1; }
}

console.log('\n=== ۱۰) هزینه روی تریگرِ ساعتی ===');
{
  clearTrig(); hubCalls = 0;
  vbrModelDropDue_();
  ok('۱۰.۱ زمان‌بند هیچ‌وقت هاب را باز نمی‌کند (۷٫۶۳/۷٫۸۴)', hubCalls === 0, hubCalls);
}

console.log('\n=== ۱۱) سمتِ گیت‌هاب: `voicemodel.py` اجرا می‌شود، نه خوانده ===');
{
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-'));
  fs.mkdirSync(T + '/tools'); fs.mkdirSync(T + '/docs'); fs.mkdirSync(T + '/bin');
  for (const f of ['voicemodel.py', 'voiceintake.py']) fs.copyFileSync('tools/' + f, T + '/tools/' + f);
  fs.writeFileSync(T + '/docs/voices.json', JSON.stringify({ rev: 1, at: '', speakers: { 'spk-z': { name: 'زد', stage: 'سنجش' } } }));
  /* curlِ ساختگی: هر فراخوان ثبت، و برای Release و آپلود جوابِ شکل‌دار. */
  const LOG = T + '/curl.log';
  fs.writeFileSync(T + '/bin/curl', `#!/usr/bin/env python3
import sys, json
a = sys.argv[1:]
open(${JSON.stringify(LOG)}, "a").write(json.dumps(a) + "\\n")
url = [x for x in a if x.startswith("http")][-1]
if "uploads.github.com" in url:
    nm = url.split("name=")[1]
    print(json.dumps({"browser_download_url": "https://gh/dl/" + nm}))
elif "/releases/tags/" in url:
    print(json.dumps({"id": 7, "assets": []}))
else:
    print("{}")
`);
  fs.chmodSync(T + '/bin/curl', 0o755);
  const pthBytes = bytesOf(700 * 1024, 4);
  fs.writeFileSync(T + '/model.pth', pthBytes);
  fs.writeFileSync(T + '/model.index', bytesOf(100, 1));
  const env = Object.assign({}, process.env, { PATH: T + '/bin:' + process.env.PATH, GH_TOKEN: 't',
                                              VM_PIECE_KB: '256', GITHUB_REPOSITORY: 'o/r' });
  const r = cp.spawnSync('python3', ['tools/voicemodel.py', '--drop', 'spk-z', 'model.pth', 'model.index'],
                         { cwd: T, env, encoding: 'utf8' });
  ok('۱۱.۱ `--drop` اجرا شد', r.status === 0, (r.stderr || r.stdout || '').slice(-200));
  const st = JSON.parse(fs.readFileSync(T + '/docs/voices.json', 'utf8'));
  const md = st.speakers['spk-z'].modelDrop;
  ok('۱۱.۲ تحویل با همان شکلی که موتور می‌خوانَد', md && md.state === 'منتظرِ موتور' && vbrModelDrops_(st).length === 1,
     JSON.stringify({ state: md && md.state, parts: md && md.pth.parts.length }));
  ok('۱۱.۳ جمعِ تکه‌ها = اندازه، اثرانگشتِ کل = sha256ِ فایل',
     md.pth.parts.reduce((a, p) => a + p.size, 0) === pthBytes.length && md.pth.sha256 === sha(pthBytes));
  ok('۱۱.۴ همهٔ تکه‌ها جز آخری مضربِ ۲۵۶ کیلوبایت — قاعدهٔ بارگذاریِ درایو',
     md.pth.parts.slice(0, -1).every(p => p.size % (256 * 1024) === 0) && md.pth.parts.length === 3,
     md.pth.parts.map(p => p.size).join(','));
  ok('۱۱.۵ نامِ دارایی فقط ASCII', md.pth.parts.every(p => /^[\x21-\x7e]+$/.test(p.url)));
  ok('۱۱.۶ تکه‌های موقتِ روی دیسک پاک شدند', !fs.readdirSync(T).some(f => /\.part\d+$/.test(f)));
  /* ── `--clean`: با گوینده‌های گوناگون ── */
  /* ساعتِ واقعی، نه ساعتِ بدَل: بدَلِ این مخزن `Date` را روی ۱۸ اوت نگه
     می‌دارد و پایتون ساعتِ دستگاه را می‌خوانَد — «تازه»ِ یکی «کهنه»ِ دیگری بود. */
  const now = new Date(Number(cp.execSync('date -u +%s').toString().trim()) * 1000);
  const iso = d => d.toISOString().replace(/\.\d+Z$/, 'Z');
  const old = iso(new Date(now.getTime() - 80 * 3600 * 1000)), fresh = iso(now);
  const mkMd = (at, nm) => ({ v: 1, at, state: 'منتظرِ موتور', expireH: 72,
    pth: { size: 3, sha256: 'x', parts: [{ url: 'https://gh/dl/' + nm, size: 3, sha256: 'y' }] } });
  fs.writeFileSync(T + '/docs/voices.json', JSON.stringify({ rev: 1, at: '', speakers: {
    a: { modelDrop: mkMd(fresh, 'a.p1') },        // تأییدشده
    b: { modelDrop: mkMd(fresh, 'b.p1') },        // تازه، بی‌تأیید ⇒ بماند
    c: { modelDrop: mkMd(old, 'c.p1') },          // منقضی
    d: { modelDrop: mkMd(fresh, 'd.p1') } } }));  // تأییدِ تحویلِ دیگری ⇒ بماند
  const drv = T + '/drv.py';
  fs.writeFileSync(drv, `import sys, json
sys.path.insert(0, "tools")
import voiceintake, voicemodel as vm
voiceintake.STATE = "docs/voices.json"
calls = []
def gh(a):
    calls.append(a)
    if "/releases/tags/" in a[-1]:
        return json.dumps({"id": 7, "assets": [{"id": i, "name": n} for i, n in enumerate(["a.p1", "b.p1", "c.p1", "d.p1", "orphan.p9"])]})
    return "{}"
vm.gh = gh
q = {"models": {"a": {"ok": True, "drop": ${JSON.stringify(fresh)}}, "d": {"ok": True, "drop": "2020-01-01T00:00:00Z"}}}
ch = vm.clean(q)
print(json.dumps({"changed": ch, "deleted": sorted(int(x[-1].rsplit("/", 1)[-1]) for x in calls if x[:2] == ["-X", "DELETE"])}))
`);
  const r2 = cp.spawnSync('python3', [drv], { cwd: T, env, encoding: 'utf8' });
  let out = {};
  try { out = JSON.parse(r2.stdout.trim().split('\n').pop()); } catch (e) { out = {}; }
  const st2 = JSON.parse(fs.readFileSync(T + '/docs/voices.json', 'utf8')).speakers;
  /* شناسه‌ها: a=0، b=1، c=2، d=3، orphan=4 */
  ok('۱۱.۷ `--clean`: تأییدشده و منقضی و بی‌صاحب پاک شدند؛ تازهٔ بی‌تأیید و تأییدِ تحویلِ دیگر ماندند',
     r2.status === 0 && JSON.stringify(out.deleted) === JSON.stringify([0, 2, 4]), (r2.stderr || '').slice(-200) + ' ' + JSON.stringify(out));
  ok('۱۱.۸ و حالت‌ها در voices.json: «برداشته شد» / «منقضی» / بی‌تغییر',
     st2.a.modelDrop.state === 'برداشته شد' && st2.c.modelDrop.state === 'منقضی' &&
     st2.b.modelDrop.state === 'منتظرِ موتور' && st2.d.modelDrop.state === 'منتظرِ موتور' && out.changed === true);
  ok('۱۱.۹ تحویلِ بسته‌شده نشانیِ عمومی‌اش را دیگر نگه نمی‌دارد', !JSON.stringify(st2.a.modelDrop).includes('https://'));
  const r3 = cp.spawnSync('python3', ['tools/voicemodel.py', '--drop', 'spk-z'], { cwd: T, env, encoding: 'utf8' });
  ok('۱۱.۱۰ کاربردِ ناقص با پیام، نه با Traceback', r3.status !== 0 && !/Traceback/.test(r3.stderr || ''));
  const r4 = cp.spawnSync('python3', ['tools/voicemodel.py', '--drop', 'spk-z', 'model.pth'],
                          { cwd: T, env: Object.assign({}, env, { VM_PIECE_KB: '100' }), encoding: 'utf8' });
  ok('۱۱.۱۱ تکهٔ آزمونی هم باید مضربِ ۲۵۶ باشد — آزمون قاعدهٔ درایو را نمی‌شکند', r4.status !== 0 && /مضربِ ۲۵۶/.test(r4.stderr + r4.stdout));
}

console.log('\n=== ۱۲) سیم‌کشیِ گردش‌کار ===');
{
  const y = fs.readFileSync('.github/workflows/voice-intake.yml', 'utf8');
  const planJob = y.slice(y.indexOf('\n  plan:'), y.indexOf('\n  style:'));
  const measJob = y.slice(y.indexOf('\n  measure:'));
  ok('۱۲.۱ `--clean` در کارِ plan، با توکن و شناسهٔ صف، و کامیتش به خروجیِ خودش بند است',
     /voicemodel\.py --clean/.test(planJob) && /id: mclean/.test(planJob) && /GH_TOKEN/.test(planJob.slice(planJob.indexOf('mclean'))) &&
     /VOICE_QUEUE_ID/.test(planJob.slice(planJob.indexOf('mclean'))) && /steps\.mclean\.outputs\.changed == 'true'/.test(planJob));
  const iDrop = measJob.indexOf('voicemodel.py --drop'), iRec = measJob.indexOf('name: ثبتِ نتیجه'), iSim = measJob.indexOf('id: sim');
  ok('۱۲.۲ `--drop` در کارِ measure: پس از سنجش و پیش از ثبت (یک کامیت)', iDrop > iSim && iDrop < iRec && iSim > 0);
  const qid = (y.match(/VOICE_QUEUE_ID: '([^']+)'/g) || []).map(x => x.split("'")[1]);
  ok('۱۲.۳ هر دو گام همان شناسهٔ صف را دارند', qid.length >= 2 && qid.every(x => x === qid[0]));
  const vm = fs.readFileSync('tools/voicemodel.py', 'utf8');
  const piece = 32 * 1024 * 1024;
  ok('۱۲.۴ اندازهٔ تکه: مضربِ ۲۵۶ کیلوبایت و زیرِ سقفِ ۵۰ مگابایتیِ UrlFetchApp',
     /PIECE = 32 \* 1024 \* 1024/.test(vm) && piece % (256 * 1024) === 0 && piece < 50 * 1024 * 1024);
  ok('۱۲.۵ واژه‌های حالت در دو زبان یکی‌اند', vm.indexOf('"' + VBR_MD_WAIT + '"') !== -1);
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ مدلِ خودکار گذشت.');
