/* run_voices_test.js — نقش‌گزینیِ گویندگان و لحن، بر پایهٔ محتوا.
 *
 * خواستهٔ کاربر: چندصدایی خوب است، ولی نه «تخصصی = زن، متنوع = مرد». هر دفعه
 * تنوع، و تنوع درونِ هر قسمت هم؛ و لحن و انتخابِ صدا باید از سرشتِ متن بیاید —
 * احساسی، علمی، مذهبی، تاریخی…
 */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const L = require('./lib/probe_r4_lib.js');
const { ok, summary, quiet } = L;

function mkEp(sections, hook, outro) {
  return { title: 'ت', hook: hook || 'آغاز برنامه.', outro: outro || 'پایان برنامه.',
           summary: 'خ', sections: sections };
}
const sec = (h, n, tone) => ({ heading: h, narration: n, tone: tone || '' });

// ═════════ 1. یک برنامه دیگر جنسیتِ ثابت ندارد ═════════
console.log('\n=== 1. جنسیتِ گوینده به برنامه گره نخورده است ===');
{
  const leadsV = [], leadsS = [], gV = [], gS = [];
  for (let ep = 1; ep <= 14; ep++) {
    const c1 = castEpisode_('variety', ep, 'طنز و سرگرمی', voiceRegister_('طنز و سرگرمی', '', 'شوخی و خنده'));
    const c2 = castEpisode_('special', ep, 'علمی و آموزشی', voiceRegister_('علمی و آموزشی', '', 'تعریف و مثال'));
    leadsV.push(c1.lead); leadsS.push(c2.lead);
    gV.push(c1.leadGender); gS.push(c2.leadGender);
    rememberLead_('variety', c1.lead); rememberLead_('special', c2.lead);
  }
  console.log('   متنوع :', leadsV.join(', '));
  console.log('   درس‌نامه:', leadsS.join(', '));
  ok('1.1 گویندهٔ اصلیِ برنامهٔ متنوع همیشه یکی نیست',
     new Set(leadsV).size >= 2, [...new Set(leadsV)].join('/'));
  ok('1.2 گویندهٔ اصلیِ درس‌نامه همیشه یکی نیست',
     new Set(leadsS).size >= 2, [...new Set(leadsS)].join('/'));
  ok('1.3 هیچ قسمتی گویندهٔ اصلیِ قسمتِ قبلِ همان برنامه را تکرار نمی‌کند',
     leadsV.every((v, i) => i === 0 || v !== leadsV[i - 1]) &&
     leadsS.every((v, i) => i === 0 || v !== leadsS[i - 1]),
     'variety=' + leadsV.slice(0, 4).join('>') + ' special=' + leadsS.slice(0, 4).join('>'));
  ok('1.4 درس‌نامه به یک جنسیت گره نخورده',
     new Set(gS).size === 2, gS.join(''));
  ok('1.5 برنامهٔ متنوع هم نه', new Set(gV).size === 2, gV.join(''));
}

// ═════════ 2. انتخاب از رویِ سرشتِ متن است ═════════
console.log('\n=== 2. سرشتِ متن، انتخاب را عوض می‌کند ===');
{
  const cases = [
    ['مذهبی و معنوی', 'تفسیر آیه و بحث الهیات', ['مذهبی', 'باوقار', 'معنوی']],
    ['احساسی و نوستالژی', 'یادِ درگذشتِ پدر و غمِ فراق', ['احساسی', 'آرام', 'ملایم']],
    ['علمی و آموزشی', 'تعریفِ مفهوم فیزیک و مثال', ['علمی', 'دقیق', 'شفاف']],
    ['مالی، ترید و اقتصاد', 'نقدینگی و تورم و بورس', ['مالی', 'محکم', 'دقیق']],
    ['طنز و سرگرمی', 'شوخی و خنده و کمدی', ['طنز', 'سرزنده', 'سبک']],
    ['فرهنگی، تاریخی و ادبی', 'تاریخِ باستان و شعر حافظ', ['تاریخی', 'روایت', 'پخته']],
    ['هشدار و پیش‌بینی', 'خطرِ بحران و کلاهبرداری', ['هشدار', 'قاطع', 'پرانرژی']]
  ];
  let bad = [];
  cases.forEach(([cat, txt, want]) => {
    const reg = voiceRegister_(cat, '', txt);
    want.forEach(w => { if (reg.indexOf(w) === -1) bad.push(cat + ' ← ' + w); });
  });
  ok('2.1 هر دسته سرشتِ درستِ خودش را می‌گیرد', bad.length === 0, bad.join(' | ') || 'همه درست');

  const leads = {};
  cases.forEach(([cat, txt]) => {
    leads[cat] = castEpisode_('variety', 7, cat, voiceRegister_(cat, '', txt)).lead;
  });
  console.log('   ' + Object.keys(leads).map(k => k.split('،')[0] + '→' + leads[k]).join('  '));
  ok('2.2 دسته‌های متفاوت، گویندگانِ متفاوت می‌گیرند',
     new Set(Object.values(leads)).size >= 4,
     [...new Set(Object.values(leads))].join('/'));

  const styles = cases.map(([cat, txt]) => styleForRegister_(voiceRegister_(cat, '', txt)));
  ok('2.3 دستورِ لحن هم با سرشت عوض می‌شود', new Set(styles).size === cases.length,
     new Set(styles).size + ' لحنِ متفاوت از ' + cases.length);
  ok('2.4 لحنِ سوگ آرام است و لحنِ هشدار قاطع',
     styles[1].indexOf('آهسته') !== -1 && styles[6].indexOf('قاطع') !== -1);
}

// ═════════ 3. تنوع درونِ خودِ قسمت ═════════
console.log('\n=== 3. تنوع درونِ هر قسمت ===');
{
  const ep = mkEp([
    sec('مفهوم', 'تعریفِ علمیِ مسئله با مثال و تمرین.', 'دقیق'),
    sec('خاطره', 'یادِ روزهای سختِ گذشته و غمِ آن سال‌ها.', 'احساسی'),
    sec('عدد', 'نقدینگی و تورم و نرخِ بهره در بازار.', 'محکم'),
    sec('پایانِ بحث', 'جمع‌بندیِ درس با یک نکتهٔ تاریخی.', 'روایت')
  ]);
  const un = quiet();
  const chunks = buildChunks_(ep, 'علمی و آموزشی', 3);
  un();
  const voices = [...new Set(chunks.map(c => c.voice))];
  console.log('   صداهای این قسمت:', voices.join(', '));
  console.log('   ', ep.__cast.note);
  ok('3.1 دست‌کم دو صدا در یک قسمت شنیده می‌شود', voices.length >= 2, voices.join('/'));
  ok('3.2 همهٔ تکه‌ها صدا دارند', chunks.every(c => !!c.voice), chunks.length + ' تکه');
  ok('3.3 گویندهٔ اصلی بیشترِ قسمت را می‌گوید', (function () {
    const by = {};
    chunks.forEach(c => { by[c.voice] = (by[c.voice] || 0) + c.text.length; });
    const total = Object.values(by).reduce((a, b) => a + b, 0);
    return by[ep.__cast.lead] / total >= 0.4;
  })(), JSON.stringify(ep.__cast));
  ok('3.4 آغاز و پایان با گویندهٔ اصلی است',
     chunks[0].voice === ep.__cast.lead &&
     chunks[chunks.length - 1].voice === ep.__cast.lead);
  ok('3.5 لحنِ هر بخش با سرشتِ خودش نوشته شده',
     chunks.some(c => c.style.indexOf('آهسته') !== -1) &&
     chunks.some(c => c.style.indexOf('دقیق') !== -1));
  ok('3.6 خلاصهٔ نقش‌گزینی برای پیوست ساخته می‌شود',
     ep.__cast.note.indexOf('گویندگانِ این قسمت') === 0, ep.__cast.note);
}

// ═════════ 4. درس‌نامه هم همین‌طور ═════════
console.log('\n=== 4. درس‌نامه هم چندصدایی می‌شود ===');
{
  const ep = mkEp([
    sec('درس', 'تعریفِ قاعده و مثالِ عملی و تمرین.', 'معلم‌وار'),
    sec('نکتهٔ تاریخی', 'پیشینهٔ این مفهوم در تاریخِ علم.', 'روایت'),
    sec('هشدار', 'اشتباهِ رایج و خطرِ آن در عمل.', 'جدی')
  ], 'آغازِ درس.', 'پایانِ درس.');
  const un = quiet();
  const chunks = buildSpecialChunks_(ep, 5, 'علمی و آموزشی');
  un();
  const voices = [...new Set(chunks.map(c => c.voice))];
  console.log('   صداهای درس‌نامه:', voices.join(', '), '|', ep.__cast.note);
  ok('4.1 درس‌نامه هم چند صدا دارد', voices.length >= 2, voices.join('/'));
  ok('4.2 و صدای ثابتِ قدیمی دیگر تنها صدا نیست',
     !(voices.length === 1 && voices[0] === CFG.TTS_VOICE_SPECIAL), voices.join('/'));
}

// ═════════ 5. قابلیت را می‌توان خاموش کرد و صدا کنار گذاشت ═════════
console.log('\n=== 5. خاموش‌کردن و کنار گذاشتنِ یک صدا ===');
{
  CFG.TTS_CAST_ENABLED = false;
  let un = quiet();
  const ep = mkEp([sec('یک', 'متنِ آزمایشی به قدر کافی بلند.', '')]);
  const chunks = buildSpecialChunks_(ep, 1, 'علمی و آموزشی');
  un();
  ok('5.1 با خاموش‌بودن، همان صدای پشتیبان استفاده می‌شود',
     chunks.every(c => c.voice === CFG.TTS_VOICE_SPECIAL), chunks[0].voice);
  CFG.TTS_CAST_ENABLED = true;

  global.__PROPS[PK.VOICE_BLOCK] = 'Kore,Charon,Aoede';
  const c = castEpisode_('variety', 2, 'علمی و آموزشی', ['علمی', 'دقیق']);
  ok('5.2 صدای کنارگذاشته‌شده انتخاب نمی‌شود',
     c.all.indexOf('Kore') === -1 && c.all.indexOf('Charon') === -1 &&
     c.all.indexOf('Aoede') === -1, c.all.join('/'));
  delete global.__PROPS[PK.VOICE_BLOCK];

  // همهٔ صداها کنار گذاشته شوند: باید بازگردد، نه بشکند
  global.__PROPS[PK.VOICE_BLOCK] = TTS_VOICES.map(v => v.n).join(',');
  let threw = '';
  try { const c2 = castEpisode_('variety', 3, '', ['رسا']);
        ok('5.3 با کنار گذاشتنِ همهٔ صداها هم انتخاب می‌کند', !!c2.lead, c2.lead); }
  catch (e) { threw = e.message; ok('5.3 با کنار گذاشتنِ همهٔ صداها هم انتخاب می‌کند', false, threw); }
  delete global.__PROPS[PK.VOICE_BLOCK];
}

// ═════════ 6. صدای ردشده، قسمت را زمین نمی‌زند ═════════
console.log('\n=== 6. اگر API نامِ صدا را نپذیرد ===');
{
  global.__PROPS['GEMINI_API_KEY'] = 'TEST';
  let calls = [];
  global.__STUB = function (url, body) {
    if (url.indexOf('/v1beta/models?') !== -1) return { code: 200, json: { models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] }] } };
    const v = (((body || {}).generationConfig || {}).speechConfig || {})
                .voiceConfig?.prebuiltVoiceConfig?.voiceName ||
              (((body || {}).generation_config || {}).speech_config || [{}])[0].voice;
    calls.push(v);
    if (v === 'Gacrux') {
      return { code: 400, text: JSON.stringify({ error: {
        message: 'Invalid value for voice: Gacrux', code: 'invalid_request' } }) };
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{
      inlineData: { data: Buffer.alloc(12000).toString('base64') } }] } }] } };
  };
  const un = quiet();
  const b64 = ttsChunk_('متنِ آزمایشی برای گفتارسازی.', 'آرام', 'Gacrux');
  un();
  ok('6.1 با صدای پشتیبان خوانده شد، نه اینکه قسمت بیفتد',
     !!b64 && b64.length > 100, 'bytes(b64)=' + String(b64).length);
  ok('6.2 صدای بد به فهرستِ کنارگذاشته‌ها رفت',
     String(global.__PROPS[PK.VOICE_BLOCK] || '').indexOf('Gacrux') !== -1,
     String(global.__PROPS[PK.VOICE_BLOCK]));
  ok('6.3 و تلاشِ دوم با صدای پشتیبان بود',
     calls[calls.length - 1] === CFG.TTS_VOICE, calls.join('>'));
  delete global.__PROPS[PK.VOICE_BLOCK];
}

// ═════════ 7. دستورِ گفتار: کوتاه، یک‌سطری، و هرگز «خواندنی» نه ═════════
// (بازنویسی‌شده برای نسخهٔ ۵٫۹: دستورِ بلندِ چندبندیِ قبلی دو بار در صوتِ
// واقعی «خودش» خوانده شد. حالا قرارداد برعکس است: دستور باید آن‌قدر کوتاه
// باشد که حتی اگر خوانده شود، یک سطرِ نیم‌ثانیه‌ای است — و درست‌خوانی از
// اعرابِ خودِ متن می‌آید، نه از دستور.)
console.log('\n=== 7. دستورِ گفتارِ کوتاه (پادزهرِ «پرامپت‌خوانی») ===');
{
  const cue = ttsCue_('آرام و همدلانه، با مکث بیشتر',
    'یک متن ساده و نسبتا بلند بدون هیچ نشانه‌ای از اعراب که چند جمله دارد و معیار واقعی است.');
  ok('7.1 یک سطر است، بی هیچ سرِ خط', cue.indexOf('\n') === -1);
  ok('7.2 کوتاه است (زیر سقفِ ' + CFG.TTS_CUE_MAX + ')',
     cue.length <= CFG.TTS_CUE_MAX + 40, cue.length + ' نویسه');
  ok('7.3 با «:» تمام می‌شود تا مرزِ دستور و متن روشن باشد', /:$/.test(cue));
  ok('7.4 هیچ ردی از دستورِ چندبندیِ قدیم ندارد',
     cue.indexOf('•') === -1 && cue.indexOf('قاعدهٔ شمارهٔ') === -1);
  ok('7.5 متنِ بی‌اعراب یادآورِ کوتاهِ صدای کوتاه می‌گیرد',
     cue.indexOf('زیر و زبر') !== -1, cue);
  const vowelled = 'اِین یِک مَتنِ آزمایشیِ اِعراب‌دار اَست که بایَد تَشخیص داده شَوَد. ' +
                   'هَمهٔ واژه‌ها زیر و زِبَر دارَند و چگالیِ نِشانه‌ها بالاست.';
  ok('7.6 متنِ اعراب‌دار همان یادآور را نمی‌گیرد (متن خودش راهنماست)',
     ttsCue_('آرام', vowelled).indexOf('زیر و زبر') === -1);
  // ولی لهجه فرق دارد: اعراب هیچ‌جا نمی‌گوید «ا» ایرانی باشد یا افغانی، پس
  // این یکی باید در هر دو حالت برود. خاموش‌ماندنش همان چیزی بود که «بابا» را
  // baawbaaw می‌کرد.
  ok('7.6-ب دستورِ لهجه در هر دو حالت می‌رود',
     /افغانی/.test(cue) && /افغانی/.test(ttsCue_('آرام', vowelled)));
  // مهم‌تر از همه: در بستهٔ نهایی، دستور فقط سطرِ اول است و متن غالب است
  const p = ttsPayloads_('این متنِ اصلیِ برنامه است. '.repeat(20), null, 'آرام', 'Kore');
  const sent = p.generateContent.body.contents[0].parts[0].text;
  // ۵٫۵۹: دستور دیگر سطرِ اولِ متن نیست، چون اصلاً در متن نیست.
  const line1 = p.generateContent.body.systemInstruction.parts[0].text;
  ok('7.7 دستورِ کوتاه در systemInstruction است، نه سطرِ اولِ متن',
     /فقط این متن را اجرا کن:$/.test(line1) && sent.indexOf(line1) === -1);
  ok('7.8 و بسته عیناً خودِ متن است، از نویسهٔ اول',
     sent.indexOf('این متنِ اصلیِ برنامه است.') === 0);
  ok('7.9 سهمِ دستور از کلِ بسته کم است (متن غالب است)',
     line1.length < sent.length * 0.4,
     line1.length + ' از ' + sent.length);
  ok('7.10 hasTashkil_ اعراب‌دار را می‌شناسد و ساده را نه',
     hasTashkil_(vowelled) === true && hasTashkil_('یک متن ساده بدون هیچ نشانه‌ای از اعراب که بلند هم هست') === false);
}

// ═════════ 8. پایداریِ نقش‌گزینی در طولِ صداگذاریِ چندمرحله‌ای ═════════
// این مهم‌ترین آزمونِ این بخش است. صداگذاریِ یک قسمت چند اجرا طول می‌کشد و در
// هر اجرا تکه‌ها از نو ساخته می‌شوند. اگر نقش‌گزینی هم از نو انجام شود، نیمی از
// فایل با یک گوینده و نیمِ دیگر با گویندهٔ دیگر خوانده می‌شود.
console.log('\n=== 8. نقش‌گزینی وسطِ صداگذاری عوض نمی‌شود ===');
{
  const fs = require('fs');
  const { Spread } = require('./lib/mock.js');
  global.__SS = {}; global.__PROPS = {}; global.__FOLDERS = {}; global.__FILES = [];
  global._ssCache = null; global.__hdrCache = null;
  const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی',
    'اشخاص شناسایی شده (JSON)','🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)',
    'متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی','مشخصات فنی (JSON)','تحلیل محتوا (JSON)',
    'تحلیل صوتی','تحلیل بصری','نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
  const VIDS = fs.readFileSync('tests/fixtures/videos.jsonl', 'utf8')
                 .trim().split('\n').map(l => JSON.parse(l));
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const v = VIDS[i % VIDS.length];
    rows.push(['10/18/2025 ' + String(i % 24).padStart(2, '0') + ':' +
               String(i % 60).padStart(2, '0') + ':00',
      'V' + i, 'o', 'n', 'https://drive.google.com/file/d/V' + i + '/view',
      '[]', '{}', '{}', v.transcript + ' واژه' + i, v.vibe, v.expert, '{}',
      JSON.stringify({ Genre: 'علمی', Main_Topic: 'موضوع ' + i,
        Key_Message: 'پیامِ کلیدیِ بلندِ شمارهٔ ' + i + ' برای گرفتنِ امتیاز.' }),
      '', '', '', ('خلاصهٔ ' + i + ' با جزئیات. ').repeat(3), 'SUCCESS']);
  }
  const ss = new Spread('s', CFG.VIDEO_SHEET_ID);
  const sh = ss.insertSheet('S1');
  sh._d.push(VH.slice()); rows.forEach(r => sh._d.push(r)); sh._max = 2000;
  global.__SS[CFG.VIDEO_SHEET_ID] = ss;
  L.buildSources([{ fid: 'A', name: 'dore', parts: 3, chunks: 10,
    textFn: n => 'متنِ درس ' + n + '. ' + 'تعریف و مثال و تمرین. '.repeat(40) }]);
  L.installStub();
  const keepEnrich = CFG.ENRICH_ENABLED, keepRt = CFG.MAX_RUNTIME_MS;
  CFG.ENRICH_ENABLED = false;
  let un = quiet(); L.syncAll(60); un();
  CFG.MAX_RUNTIME_MS = 1;                     // یک تکه در هر اجرا — مثل قسمتِ بلندِ واقعی
  un = quiet(); produceEpisode(); un();
  const fid = JSON.parse(global.__PROPS['PENDING_EPISODE']).folderId;
  const readCast = () => {
    try {
      const m = JSON.parse(DriveApp.getFolderById(fid).getFilesByName('_episode.json')
                             .next().getBlob().getDataAsString());
      return m.ep.__cast || null;
    } catch (e) { return null; }
  };
  const c0 = readCast();
  ok('8.1 نقش‌گزینی در همان مرحلهٔ آماده‌سازی ذخیره می‌شود',
     !!(c0 && c0.lead && c0.all && c0.all.length), JSON.stringify(c0));
  const leads = [];
  let runs = 0;
  while (global.__PROPS['PENDING_EPISODE'] && runs < 60) {
    const u = quiet(); produceEpisodeContinue(); u(); runs++;
    const c = readCast();
    if (c) leads.push(c.lead);
  }
  console.log('   ' + runs + ' اجرا، گویندهٔ اصلی:', [...new Set(leads)].join(', '));
  ok('8.2 گویندهٔ اصلی در هیچ اجرایی عوض نشد',
     new Set(leads).size === 1 && leads[0] === c0.lead,
     [...new Set(leads)].join('>') + ' (آغاز: ' + c0.lead + ')');
  ok('8.3 قسمت منتشر شد', !global.__PROPS['PENDING_EPISODE'], runs + ' اجرا');
  CFG.ENRICH_ENABLED = keepEnrich; CFG.MAX_RUNTIME_MS = keepRt;
}

/* ترتیبِ آزمونِ شنیداری: یکی در میان زن و مرد.

   فهرست ده زن دارد و بعد دوازده مرد، و آزمون بودجهٔ زمانی دارد. اجرای اول
   دقیقاً ده صدای زن ساخت و ایستاد — و به نظر رسید مردها اصلاً وجود ندارند.
   پیامِ «۱۲ مانده» را می‌گفت، ولی کسی که ده فایلِ زن می‌بیند نتیجه‌اش را از
   فایل‌ها می‌گیرد نه از پیام.                                                */
{
  const o = auditionOrder_();
  ok('هیچ گوینده‌ای از قلم نیفتاد', o.length === TTS_VOICES.filter(v => v && v.n).length,
     o.length + ' از ' + TTS_VOICES.length);
  const first10 = o.slice(0, 10);
  ok('در ده تای اول هر دو جنس هست',
     first10.some(v => v.g === 'f') && first10.some(v => v.g !== 'f'),
     first10.map(v => v.g).join(''));
  ok('و تقریباً نصف‌نصف است',
     Math.abs(first10.filter(v => v.g === 'f').length - 5) <= 1);
  let maxRun = 0, run = 0, prev = null;
  for (const v of o) { run = (v.g === prev) ? run + 1 : 1; prev = v.g; if (run > maxRun) maxRun = run; }
  ok('پشتِ سرِ هم از یک جنس، جز در ته فهرست، پیش نمی‌آید', maxRun <= 2, 'بیشترین رشته: ' + maxRun);
  const names = o.map(v => v.n);
  ok('هیچ نامی تکرار نشده', new Set(names).size === names.length);
}


/* ویرایشِ فهرستِ گویندگانِ کنارگذاشته‌شده.

   کادر همیشه «جایگزین» می‌کرد: برای برگرداندنِ یک نفر باید نامِ همهٔ بقیه از نو
   نوشته می‌شد، و یک قلم‌افتادگی یعنی برگشتنِ ناخواستهٔ یک صدای بد. حالا «-» و
   «+» هم هست، ولی رفتارِ قدیم باید دست‌نخورده بماند وگرنه هر کسی که فهرستِ
   کامل می‌نویسد غافلگیر می‌شود.                                                */
{
  const base = 'Autonoe, Aoede, Kore, Sulafat, Orus';
  const j = r => r.list.join(',');

  const rep = applyBlockEdit_(base, 'Autonoe, Aoede');
  ok('فهرستِ بی‌پیشوند همچنان جایگزین می‌کند',
     j(rep) === 'Autonoe,Aoede' && rep.mode === 'جایگزینی', j(rep));

  const del = applyBlockEdit_(base, '-Kore');
  ok('«-» یک نفر را برمی‌گرداند و بقیه دست‌نخورده می‌مانند',
     j(del) === 'Autonoe,Aoede,Sulafat,Orus', j(del));

  const add = applyBlockEdit_(base, '+Charon');
  ok('«+» یک نفر را اضافه می‌کند', j(add) === base.split(', ').join(',') + ',Charon', j(add));

  const both = applyBlockEdit_(base, '-Kore, +Charon');
  ok('«-» و «+» با هم کار می‌کنند',
     j(both) === 'Autonoe,Aoede,Sulafat,Orus,Charon', j(both));

  const clear = applyBlockEdit_(base, '');
  ok('کادرِ خالی همه را برمی‌گرداند', clear.list.length === 0);

  const typo = applyBlockEdit_(base, 'Kore, Koreh');
  ok('نامِ اشتباه وارد فهرست نمی‌شود', j(typo) === 'Kore', j(typo));
  ok('و جدا گزارش می‌شود تا بی‌صدا نماند',
     typo.unknown.length === 1 && typo.unknown[0] === 'Koreh');

  const typo2 = applyBlockEdit_(base, '-Koreh');
  ok('«-»ی اشتباه هم فهرست را دست نمی‌زند',
     j(typo2) === base.split(', ').join(',') && typo2.unknown.length === 1, j(typo2));

  const noop = applyBlockEdit_(base, '-Puck');
  ok('برگرداندنِ کسی که مسدود نبوده، بی‌اثر است',
     j(noop) === base.split(', ').join(','), j(noop));

  const dup = applyBlockEdit_(base, '+Kore');
  ok('افزودنِ کسی که از قبل هست، تکراری نمی‌سازد',
     j(dup) === base.split(', ').join(','), j(dup));

  // و آنچه ماند باید واقعاً در نقش‌گزینی به کار برود
  global.__PROPS[PK.VOICE_BLOCK] = del.list.join(',');
  const ep = { sections: [{ heading: 'a', narration: 'م' }, { heading: 'b', narration: 'م' }] };
  const cast = ensureCast_(ep, 'special', 21, 'علمی و آموزشی');
  ok('گویندهٔ برگردانده‌شده دوباره قابلِ انتخاب است (مسدود نمی‌ماند)',
     del.list.indexOf('Kore') === -1 &&
     (cast.all || []).every(v => del.list.indexOf(v) === -1),
     (cast.all || []).join(', '));
  global.__PROPS[PK.VOICE_BLOCK] = '';
}


process.exit(summary('نقش‌گزینیِ گویندگان و تلفظ') ? 1 : 0);
