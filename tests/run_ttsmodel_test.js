/* ══ آزمونِ مدلِ صوتی (۸.۳۹) ══
 *
 * خواستهٔ صریح، ۴ اکتبر: «اگر این مدلِ گوینده دوباره آپدیت بشه به مدلی که
 * اخیراً نمونه‌کارش شنیدم و خوشم نیومد چی؟ … و اگر قفلش کنی و بعداً اکسپایر
 * بشه هم که یه افتضاحِ دیگه‌ست … باید ببینی این مدل‌ها چه ویژگی‌هایی دارن که
 * اگر خواست به‌روزرسانی بشه، روی مدلِ جدیدی بره که همین ویژگی‌ها رو داره.»
 *
 * مدل‌های ساختگیِ این مجموعه همان سه حالتِ واقعی‌اند، با عددهای سنجیده روی
 * فایل‌های ۴ اکتبر: سنجاق (مرجع)، جانشینِ هم‌خوان (۲٪ کندتر)، و 3.8-flash
 * (۱۵٪ تندتر و ~۲ نیم‌پرده بم‌تر) — که امتیازش از همه بالاتر است، پس بی
 * داوری همان انتخاب می‌شد.
 *
 * همهٔ سنجه‌ها از درِ تولید می‌روند: `ttsAuditionLater` (تریگرِ واقعی)،
 * `resolveModels_` و `ttsModel_` (که تولید از آن مدل می‌گیرد)،
 * `ttsModelGates_` (که `healthCheck` صدا می‌زند) — نه با ساختنِ دستیِ حالت.
 */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

global.__PROPS[PK.API_KEY] = global.__PROPS[PK.API_KEY] || 'TEST-KEY';
const SR = 24000;
const PIN = String(CFG.TTS_MODEL_PIN);
const FIT = 'gemini-2.5-flash-preview-tts';
const BAD = 'gemini-3.8-flash-tts';

/* ── صوتِ ساختگی با تندی و زیروبمِ معلوم ── */
function synth(chunks, voicedEach, f0, gap) {
  const out = [];
  const push = (y) => { const v = Math.round(y) & 0xffff; out.push(v & 255, (v >> 8) & 255); };
  for (let c = 0; c < chunks; c++) {
    const n = Math.round(voicedEach * SR);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      push(9000 * Math.sin(2 * Math.PI * f0 * t) + 4500 * Math.sin(4 * Math.PI * f0 * t) +
           2000 * Math.sin(6 * Math.PI * f0 * t));
    }
    if (c < chunks - 1) for (let i = 0; i < Math.round(gap * SR); i++) push(0);
  }
  return out.map((b) => (b > 127 ? b - 256 : b));
}
const le32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const asWav = (pcm) => {
  const str = (t) => Array.from(Buffer.from(t, 'latin1'));
  const fmt = str('fmt ').concat(le32(16), [1, 0, 1, 0], le32(SR), le32(SR * 2), [2, 0, 16, 0]);
  const c2 = str('C2PA').concat(le32(6014), new Array(6014).fill(65));
  const body = str('WAVE').concat(fmt, str('data'), le32(pcm.length), pcm.map((b) => b & 255), c2);
  return str('RIFF').concat(le32(body.length), body);
};

/* هر مدل چه می‌خوانَد — همان سه حالتِ واقعی */
const VOICE = {};
VOICE[PIN] = () => synth(8, 1.50, 120, 0.4);
VOICE[FIT] = () => synth(8, 1.53, 121, 0.4);       // ۲٪ کندتر — هم‌خوان
VOICE[BAD] = () => synth(8, 1.30, 105, 0.3);       // ۱۵٪ تندتر و ۲٫۳ نیم‌پرده بم‌تر
let LISTED = [PIN, FIT, BAD];
const bodies = [];
const realFetch = global.geminiFetch_;
global.geminiFetch_ = function (url, body) {
  const m = /models\/([^:]+):generateContent/.exec(url);
  if (!m) throw new Error('HTTP 404 — not found');
  const model = m[1];
  /* مثلِ گوگل: مدلی که در حساب نیست ۴۰۴ می‌دهد */
  if (LISTED.indexOf(model) === -1) throw new Error('HTTP 404 — models/' + model + ' is not found');
  bodies.push({ model, body });
  const pcm = VOICE[model] ? VOICE[model]() : synth(4, 1, 140, 0.4);
  // 3.8 مثلِ واقعیت بستهٔ WAV با C2PA می‌دهد (۸.۳۸)؛ بقیه PCMِ خام
  const data = (model === BAD) ? Buffer.from(asWav(pcm).map((b) => b & 255)).toString('base64')
                               : Buffer.from(pcm.map((b) => b & 255)).toString('base64');
  return { candidates: [{ content: { parts: [{ inlineData: {
    mimeType: model === BAD ? 'audio/wav' : 'audio/L16;codec=pcm;rate=24000', data } }] } }] };
};
const textModels = ['gemini-2.5-flash'];
global.listModels_ = function () {
  return LISTED.concat(textModels).map((id) => ({ name: 'models/' + id,
    supportedGenerationMethods: ['generateContent'] }));
};
let tgSent = [];
global.tgSend_ = function (t) { tgSent.push(String(t)); return true; };
let findings = [];
const realFind = global.logSelfFinding_;
global.logSelfFinding_ = function (hub, f) { findings.push(f); };
const reset = () => {
  for (const k of [PK.TTS_PROFILE, PK.TTS_AUDITS, PK.TTS_AUDIT_ARM, PK.TTS_PIN_TOLD, PK.MODELS,
                   PK.TTS_CUE_BAD, PK.TTS_CUE_OFF]) delete global.__PROPS[k];
  findings = []; tgSent = []; bodies.length = 0;
};
const ageAudit = (model, days) => {
  const au = JSON.parse(global.__PROPS[PK.TTS_AUDITS] || '{}');
  const d = new Date(Date.now() - days * 86400000);
  const pad = (n) => (n < 10 ? '0' : '') + n;
  au[model].at = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' 09:00';
  global.__PROPS[PK.TTS_AUDITS] = JSON.stringify(au);
};

/* ═══ ۱) سه عدد از خودِ صوت ═══ */
{
  const letters = 600;
  const p = ttsPcmProfile_(synth(8, 1.5, 120, 0.4), SR, letters);
  ok('۱.۱ گفتارِ واقعی بی سکوت‌ها شمرده می‌شود (۸ × ۱٫۵ = ۱۲ ثانیه)',
     Math.abs(p.voiced - 12) < 0.1, JSON.stringify(p));
  ok('۱.۲ تندی = حرف بر ثانیهٔ گفتار، نه بر کلِ زمان', Math.abs(p.rate - letters / p.voiced) < 0.05 &&
     p.secs > p.voiced + 2, 'rate ' + p.rate + ' · secs ' + p.secs);
  ok('۱.۳ زیروبمِ میانه همان ۱۲۰ هرتز است (نه یک اکتاو پایین‌تر)', Math.abs(p.f0 - 120) < 3, String(p.f0));
  ok('۱.۴ هفت مکثِ ۰٫۴ ثانیه‌ای شمرده می‌شود', Math.abs(p.ppm - 7 / p.secs * 60) < 0.2,
     'ppm ' + p.ppm);
  const q = ttsPcmProfile_(synth(6, 1.0, 95, 0.4), SR, letters);
  ok('۱.۵ زیروبمِ دیگر هم درست (۹۵ هرتز)', Math.abs(q.f0 - 95) < 3, String(q.f0));
  /* ══ صدای خِرخِری: چرخه‌های یکی‌درمیان با دامنهٔ متفاوت ══
     در صدایی مثلِ رضوی، دوره‌ی دوبرابر گاهی همبستگیِ **بیشتری** از دوره‌ی
     درست دارد؛ بیشینهٔ خام آن‌وقت یک اکتاو پایین‌تر را برمی‌دارد (۶۵ به‌جای
     ۱۳۰). سدِ «نخستین قله‌ای که به ۹۰٪ِ بیشینه می‌رسد» برای همین است، و با
     سیگنالِ تمیزِ ۱.۳ هیچ‌وقت سنجیده نمی‌شد — شکستنش سبز ماند. */
  const creak = (() => {
    const out = [], f0 = 130, n = Math.round(1.2 * SR), per = SR / f0;
    for (let i = 0; i < n; i++) {
      const cyc = Math.floor(i / per), amp = (cyc % 2) ? 0.55 : 1.0;
      const t = i / SR, y = amp * (9000 * Math.sin(2 * Math.PI * f0 * t) + 4500 * Math.sin(4 * Math.PI * f0 * t));
      const v = Math.round(y) & 0xffff; out.push(v & 255, (v >> 8) & 255);
    }
    return out.map((b) => (b > 127 ? b - 256 : b));
  })();
  const cr = ttsPcmProfile_(creak, SR, letters);
  ok('۱.۷ صدای خِرخِری یک اکتاو پایین‌تر خوانده نمی‌شود (۱۳۰، نه ۶۵)', Math.abs(cr.f0 - 130) < 4, String(cr.f0));
  const z = ttsPcmProfile_(new Array(2000).fill(0), SR, letters);
  ok('۱.۶ صوتِ خالی تندیِ صفر می‌دهد، نه بی‌نهایت', z.rate === 0, JSON.stringify(z));
}

/* ═══ ۲) داوری ═══ */
{
  const p = { rate: 10, f0: 120 };
  ok('۲.۱ ۱۲٪ تندتر ⇒ ناهم‌خوان، با علتِ نام‌دار',
     ttsFitOf_({ rate: 11.2, f0: 120 }, p).fit === false && /تندتر/.test(ttsFitOf_({ rate: 11.2, f0: 120 }, p).why));
  ok('۲.۲ ۳٪ تندتر ⇒ هم‌خوان', ttsFitOf_({ rate: 10.3, f0: 121 }, p).fit === true);
  ok('۲.۳ ۲ نیم‌پرده بم‌تر ⇒ ناهم‌خوان', ttsFitOf_({ rate: 10, f0: 107 }, p).fit === false);
  ok('۲.۴ بی مرجع «نمی‌دانیم» است، نه «ناهم‌خوان»', ttsFitOf_({ rate: 13, f0: 100 }, null).fit === null);
}

/* ═══ ۳) آزمون از درِ خودِ تریگر ═══ */
reset();
{
  const modeBefore = global.__PROPS[PK.TTS_MODE];
  const note = ttsAuditionLater();
  const prof = JSON.parse(global.__PROPS[PK.TTS_PROFILE] || 'null');
  const au = JSON.parse(global.__PROPS[PK.TTS_AUDITS] || '{}');
  ok('۳.۱ مرجع از خودِ سنجاق گرفته شد', prof && prof.model === PIN && prof.rate > 0,
     JSON.stringify(prof) + ' · ' + note);
  ok('۳.۲ هر سه مدل آزموده شدند', [PIN, FIT, BAD].every((m) => au[m] && au[m].rate > 0),
     Object.keys(au).join('، '));
  ok('۳.۳ صوتِ 3.8 (بستهٔ WAV با C2PA) باز شد و تندی‌اش ۱۵٪ بالاتر است',
     au[BAD] && Math.abs((au[BAD].rate - prof.rate) / prof.rate * 100 - 15.4) < 2,
     au[BAD] ? String(au[BAD].rate) : '—');
  const bodyTexts = bodies.map((b) => JSON.stringify(b.body));
  ok('۳.۴ آزمون بی دستورِ لحن و با متنِ ثابت رفت (هیچ پیشوند و فیلدی)',
     bodies.length === 3 && bodies.every((b) => !b.body.systemInstruction && !b.body.instructions) &&
     bodyTexts.every((t) => t.indexOf(CFG.TTS_AUDITION_TEXT.slice(0, 40)) !== -1),
     bodies.length + ' درخواست');
  ok('۳.۵ قالبِ ترجیحیِ تولید دست نخورد', global.__PROPS[PK.TTS_MODE] === modeBefore,
     String(global.__PROPS[PK.TTS_MODE]));
  ok('۳.۶ هر آزمون نمونهٔ شنیدنی دارد', [PIN, FIT, BAD].every((m) => au[m] && au[m].clip),
     [PIN, FIT, BAD].map((m) => au[m] && au[m].clip ? '✓' : '✗').join(''));

  const st = ttsModelStatus_();
  ok('۳.۷ سطرِ روزانه: سنجاق، مرجع، جانشینِ هم‌خوان، و ناهم‌خوان به نام',
     st.ok && st.fitAlt[0] && st.fitAlt[0].model === FIT && st.unfit.some((u) => u.model === BAD) &&
     st.line.indexOf(FIT) !== -1 && st.line.indexOf(BAD) !== -1 && /تندتر/.test(st.line), st.line);
  ok('۳.۸ با سنجاقِ زنده، مدلِ تولید همان سنجاق است', ttsModel_() === PIN, ttsModel_());
}

/* ═══ ۴) سنجاق رفت: جانشین با گوش، نه با امتیاز ═══ */
{
  LISTED = [FIT, BAD];
  /* شاهدِ اینکه داوری کار را کرد: بی مرجع، همان امتیاز 3.8 را برمی‌داشت */
  const keepProf = global.__PROPS[PK.TTS_PROFILE];
  delete global.__PROPS[PK.TTS_PROFILE];
  const blind = resolveModels_(true).tts;
  global.__PROPS[PK.TTS_PROFILE] = keepProf;
  ok('۴.۰ (پایه) بی داوری، مدلِ پرامتیاز 3.8 انتخاب می‌شد', blind === BAD, blind);

  const m = resolveModels_(true);
  ok('۴.۱ سنجاق که رفت، جانشینِ هم‌خوان نشست نه پرامتیاز', m.tts === FIT && m.ttsVet === 'هم‌خوان',
     m.tts + ' · ' + m.ttsVet);
  ok('۴.۲ و مدلِ تولید همان جانشین است', ttsModel_() === FIT, ttsModel_());
  const st = ttsModelStatus_();
  ok('۴.۳ وضعیت: «سنجاق رفته»، جانشین هم‌خوان، و پیوندِ نمونه در سطر',
     st.pinMissing && st.liveFit === true && st.ok && /⚠/.test(st.line) && /نمونه: /.test(st.line),
     st.line);
  ttsModelGates_(null, st);
  ttsModelGates_(null, ttsModelStatus_());
  const f = findings.filter((x) => x.key === 'tts-pin-missing');
  ok('۴.۴ یافتهٔ «tts-pin-missing» با مسئولِ کد', f.length >= 1 && f[0].owner === 'کد' &&
     f[0].priority === 'متوسط', JSON.stringify(f[0] || null).slice(0, 120));
  ok('۴.۵ تلگرام فقط یک بار برای همین جابه‌جایی', tgSent.length === 1, tgSent.length + ' پیام');
  const vm = selfVerifyMap_()['tts-pin-missing'];
  ok('۴.۶ سنجندهٔ یافته همان وضعیت را می‌بیند', vm && vm.still({ ttsModel: st }) === true &&
     vm.still({ ttsModel: { pinMissing: false } }) === false && vm.still({}) === null);
}

/* ═══ ۴-ب) آزمون خودش رفتنِ سنجاق را می‌فهمد ═══
   کشِ هفت‌روزه هنوز می‌گوید سنجاق هست؛ گوگل ۴۰۴ می‌دهد. بی این، نخستین خبرش
   خطای صداسازیِ قسمتِ فردا بود. */
{
  LISTED = [FIT, BAD];
  global.__PROPS[PK.MODELS] = JSON.stringify({ text: 'gemini-2.5-flash', tts: PIN, at: Date.now(),
    textAll: ['gemini-2.5-flash'], ttsAll: [PIN, FIT, BAD], ttsAvail: [PIN, FIT, BAD], pinned: PIN });
  ageAudit(PIN, 10);
  ttsAuditionLater();
  const c = JSON.parse(global.__PROPS[PK.MODELS]);
  ok('۴.۷ آزمونِ سنجاقِ رفته جانشین را همان لحظه می‌نشانَد', c.tts === FIT && c.pinMissing === PIN &&
     ttsModel_() === FIT, c.tts + ' · ' + c.pinMissing);
}

/* ═══ ۵) سنجاق رفت و فقط ناهم‌خوان ماند ═══ */
{
  LISTED = [BAD];
  findings = []; tgSent = [];
  const m = resolveModels_(true);
  ok('۵.۱ بی هیچ جانشینِ هم‌خوان، باز هم یکی هست (بی مدلِ صوتی هیچ قسمتی ساخته نمی‌شود)',
     m.tts === BAD && m.ttsVet === 'ناهم‌خوان', m.tts + ' · ' + m.ttsVet);
  const st = ttsModelStatus_();
  ok('۵.۲ و این ایراد است، نه یادداشت', st.ok === false && /ناهم‌خوان/.test(st.line), st.line);
  ttsModelGates_(null, st);
  const f = findings.filter((x) => x.key === 'tts-pin-missing');
  ok('۵.۳ یافته «جدی» است', f.length === 1 && f[0].priority === 'جدی', JSON.stringify(f[0] || null).slice(0, 80));
  ok('۵.۴ و جابه‌جاییِ تازه یک خبرِ تازه دارد', tgSent.length === 1, tgSent.length + ' پیام');
}

/* ═══ ۶) دگرگونیِ خودِ سنجاق: گفته می‌شود، خودکار عوض نمی‌شود ═══ */
{
  LISTED = [PIN, FIT, BAD];
  resolveModels_(true);
  findings = [];
  const prof0 = JSON.parse(global.__PROPS[PK.TTS_PROFILE]);
  VOICE[PIN] = () => synth(8, 1.28, 120, 0.4);       // همان مدل، حالا ۱۷٪ تندتر
  ageAudit(PIN, 10); ttsAuditionLater();
  const p1 = JSON.parse(global.__PROPS[PK.TTS_PROFILE]);
  ok('۶.۱ یک آزمونِ دور هنوز یافته نیست (یک شبِ بد، شبِ بد می‌مانَد)',
     p1.drift === 1 && ttsModelStatus_().ok === true, 'drift ' + p1.drift);
  ageAudit(PIN, 10); ttsAuditionLater();
  const p2 = JSON.parse(global.__PROPS[PK.TTS_PROFILE]);
  const st = ttsModelStatus_();
  ok('۶.۲ دو آزمونِ پیاپی ⇒ ایراد با علتِ نام‌دار', p2.drift === 2 && st.ok === false &&
     /دگرگون/.test(st.line) && /تندتر/.test(st.line), st.line);
  ok('۶.۳ مرجع بی‌صدا تازه نشد — همان عددِ پسندیده ماند', p2.rate === prof0.rate && p2.at === prof0.at,
     prof0.rate + ' ⇒ ' + p2.rate);
  ok('۶.۴ و مدلِ تولید عوض نشد: تصمیمِ گوشِ اوست', ttsModel_() === PIN, ttsModel_());
  ttsModelGates_(null, st);
  ok('۶.۵ یافتهٔ «tts-pin-drift»', findings.some((x) => x.key === 'tts-pin-drift' && x.owner === 'کد'),
     findings.map((x) => x.key).join('، '));
  const vd = selfVerifyMap_()['tts-pin-drift'];
  ok('۶.۶ سنجنده‌اش', vd && vd.still({ ttsModel: st }) === true &&
     vd.still({ ttsModel: { drift: 0 } }) === false);
  VOICE[PIN] = () => synth(8, 1.50, 120, 0.4);
  ageAudit(PIN, 10); ttsAuditionLater();
  ok('۶.۷ برگشتنِ مدل به حالتِ خودش زنجیره را می‌بُرد',
     JSON.parse(global.__PROPS[PK.TTS_PROFILE]).drift === 0 && ttsModelStatus_().ok === true);

  /* درِ آگاهانهٔ گرفتنِ دوبارهٔ مرجع */
  const keepVer = CFG.TTS_PROFILE_VER;
  CFG.TTS_PROFILE_VER = Number(keepVer) + 1;
  VOICE[PIN] = () => synth(8, 1.40, 120, 0.4);
  ttsAuditionLater();
  const p3 = JSON.parse(global.__PROPS[PK.TTS_PROFILE]);
  ok('۶.۸ بالا بردنِ TTS_PROFILE_VER مرجع را از نو از سنجاق می‌گیرد',
     p3.ver === CFG.TTS_PROFILE_VER && p3.rate > prof0.rate, prof0.rate + ' ⇒ ' + p3.rate);
  CFG.TTS_PROFILE_VER = keepVer;
  VOICE[PIN] = () => synth(8, 1.50, 120, 0.4);
}

/* ═══ ۷) زمان‌بندی: یک بار در روز، و فقط وقتی لازم است ═══ */
reset();
{
  global.__TRIGGERS.length = 0;
  ok('۷.۱ کشِ پیش از ۸.۳۹ (بی ttsAvail) ⇒ آزمون لازم است', ttsAuditDue_() === true);
  const a1 = ttsAuditArm_();
  const a2 = ttsAuditArm_();
  const n = global.__TRIGGERS.filter((t) => t.getHandlerFunction() === 'ttsAuditionLater').length;
  ok('۷.۲ یک تریگرِ یک‌باره، و بارِ دوم در همان روز هیچ', a1 === true && a2 === false && n === 1,
     a1 + ' / ' + a2 + ' · ' + n);
  ttsAuditionLater();
  ok('۷.۳ پس از آزمونِ کامل، فردا کاری نیست', ttsAuditDue_() === false);
  ok('۷.۴ تریگرِ یک‌باره خودش را پاک کرد',
     !global.__TRIGGERS.some((t) => t.getHandlerFunction() === 'ttsAuditionLater'));
}

/* ═══ ۸) وضعیت بی شبکه ═══ */
{
  let calls = 0;
  const f0 = global.geminiFetch_, u0 = global.UrlFetchApp.fetch;
  global.geminiFetch_ = function () { calls++; return f0.apply(null, arguments); };
  global.UrlFetchApp.fetch = function () { calls++; return u0.apply(global.UrlFetchApp, arguments); };
  try { ttsModelStatus_(); ttsAuditDue_(); }
  finally { global.geminiFetch_ = f0; global.UrlFetchApp.fetch = u0; }
  ok('۸.۱ سطرِ وضعیت و وارسیِ «لازم است؟» هیچ فراخوانِ شبکه ندارند (۷٫۶۳)', calls === 0, calls + ' فراخوان');
}

/* ═══ ۹) درِ ۱۰ صبح ═══ */
{
  const src = require('fs').readFileSync('src/08_Health.gs', 'utf8');
  const i = src.indexOf('function healthCheck()');
  let d = 0, j = src.indexOf('{', i), e = j;
  for (; e < src.length; e++) { if (src[e] === '{') d++; else if (src[e] === '}' && --d === 0) break; }
  const body = src.slice(i, e);
  ok('۹.۱ healthCheck سطر را می‌گوید، یافته را می‌سازد و آزمون را زمان‌بندی می‌کند',
     /ttsModelStatus_\(\)/.test(body) && /ttsModelGates_\(hub, tmS\)/.test(body) && /ttsAuditArm_\(\)/.test(body));
  const night = require('fs').readFileSync('src/21_SelfUpdate.gs', 'utf8');
  const k = night.indexOf('function selfUpdateDaily()');
  ok('۹.۲ و کارِ شبانه درِ دوم است', night.indexOf('ttsAuditArm_()', k) > k);
}

global.geminiFetch_ = realFetch;
global.logSelfFinding_ = realFind;
process.exit(summary('آزمونِ مدلِ صوتی (۸.۳۹)') ? 1 : 0);
