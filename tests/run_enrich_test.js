/* run_enrich_test.js — the Cowork enrichment handshake, end to end.
 *
 * Covers what the user actually asked for:
 *   • the prepared script is handed to Cowork BEFORE audio, for both shows
 *   • every outside addition is announced in the spoken text
 *   • every outside addition carries an exact link, and unsourced ones are refused
 *   • the original content stays dominant (the 15% ceiling is enforced)
 *   • sources land in the sheet, the attachment and Telegram, unabridged
 *   • if Cowork never answers, the podcast is still produced and says so
 */
require('./lib/root.js');   // cwd را روی ریشهٔ ریپو می‌گذارد — پیش از هر require دیگر
const L = require('./lib/probe_r4_lib.js');
const { ok, summary, quiet, buildSources, installStub, syncAll } = L;

// هر قطعه باید واژگانِ خودش را داشته باشد، وگرنه صافیِ «رونوشتِ تکراری»
// (DUP_TOKEN_OVERLAP) همه را یکی می‌شمارد و قسمت با یک آیتم ساخته نمی‌شود.
const POOL = ('نقدینگی تورم بهره ارز سهام نمودار کندل روند حجم سفارش ریسک سرمایه ' +
  'بازده پرتفوی نوسان شکست مقاومت حمایت واگرایی همگرایی الگو مثلث پرچم کانال ' +
  'میانگین متحرک شاخص قدرت نسبی مکدی استوکاستیک فیبوناچی موج شمارش تحلیل بنیادی ' +
  'ترازنامه سود زیان جریان نقدی ارزشگذاری ضریب قیمت درآمد رشد سودآوری بدهی دارایی ' +
  'گردش موجودی حسابداری بازار جهانی طلا نفت مسکن بانک بورس کالا آتی اختیار معامله').split(' ');
const LESSON = n => {
  const w = [];
  for (let i = 0; i < 260; i++) w.push(POOL[(n * 37 + i * 11) % POOL.length]);
  return 'دقیقهٔ ' + n + '. مدرس مفهوم را تعریف می‌کند و مثال می‌زند. ' + w.join(' ') + '.';
};

function reset() {
  global.__SS = {}; global.__PROPS = {}; global.__FOLDERS = {}; global.__FILES = [];
  global._ssCache = null; global.__hdrCache = null;
  clearHandshake();
}

/** پوشهٔ OUTPUT در mock یک شیءِ ماندگار است و بین بخش‌های آزمون پاک نمی‌شود.
 *  بی این پاک‌سازی، بخشِ بعدی پاسخِ بخشِ قبلی را می‌خواند و آزمون دروغ می‌گوید. */
function clearHandshake() {
  try {
    const it = outFolder_().getFiles();
    const doomed = [];
    while (it.hasNext()) {
      const f = it.next();
      if (/^_ENRICH(-REQ)?-/.test(f.getName())) doomed.push(f);
    }
    doomed.forEach(f => { try { f.setTrashed(true); } catch (e) {} });
  } catch (e) {}
}

/** the OUTPUT folder the engine reads and writes handshake files in.
 *  عمداً از خودِ کمک‌تابعِ موتور استفاده می‌کنیم تا آزمون و موتور دقیقاً به یک
 *  پوشه نگاه کنند؛ ثبتِ جداگانه در mock یک پوشهٔ دیگر می‌ساخت و آزمون
 *  الکی سبز/سرخ می‌شد. */
function outFolder() { return outFolder_(); }
function readReq(show, ep) {
  const it = outFolder().getFilesByName(enrichReqName_(show, ep));
  return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null;
}
function writeAns(show, ep, obj) {
  const name = enrichAnsName_(show, ep);
  const f = outFolder().getFilesByName(name);
  const body = JSON.stringify(obj);
  if (f.hasNext()) { f.next().setContent(body); return; }
  outFolder().createFile(Utilities.newBlob(body, 'application/json', name));
}

// برنامهٔ متنوع از ردیف‌های «هر ردیف یک فایل» تغذیه می‌شود و درس‌نامه از
// ردیف‌های قطعه‌قطعه. پس هر دو را می‌کاریم، وگرنه یکی از دو مسیر آزمون نمی‌شود.
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const VH = ['تاریخ پردازش','File ID','نام اصلی فایل','نام جدید فایل','لینک دسترسی',
  'اشخاص شناسایی شده (JSON)','🎵 تحلیل موسیقی (JSON)','اطلاعات زمانی (JSON)',
  'متن پیاده‌سازی شده','فضا و وایب','تحلیل تخصصی','مشخصات فنی (JSON)','تحلیل محتوا (JSON)',
  'تحلیل صوتی','تحلیل بصری','نکات حرفه‌ای','خلاصه اجرایی','وضعیت'];
const VIDS = fs.readFileSync('tests/fixtures/videos.jsonl', 'utf8')
                .trim().split('\n').map(l => JSON.parse(l));

function seedVariety() {
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const v = VIDS[i % VIDS.length];
    rows.push(['10/18/2025 ' + String(i % 24).padStart(2, '0') + ':' +
               String(i % 60).padStart(2, '0') + ':00',
      'VID' + i, 'o', 'n', 'https://drive.google.com/file/d/VID' + i + '/view',
      '[]', '{}', '{}', v.transcript + ' ' + LESSON(i), v.vibe, v.expert, '{}',
      JSON.stringify({ Genre: 'مالی، ترید', Main_Topic: 'موضوعِ شمارهٔ ' + i,
                       Key_Message: 'پیامِ کلیدیِ به‌قدر کافی بلندِ شمارهٔ ' + i +
                                    ' برای گرفتنِ امتیازِ لازم در سنجه‌ها.' }),
      '', '', '', ('خلاصهٔ اجراییِ شمارهٔ ' + i + ' با جزئیاتِ کافی. ').repeat(3), 'SUCCESS']);
  }
  const ss = new Spread('s', CFG.VIDEO_SHEET_ID);
  const sh = ss.insertSheet('S1');
  sh._d.push(VH.slice()); rows.forEach(r => sh._d.push(r));
  sh._max = Math.max(1000, sh._d.length + 10);
  global.__SS[CFG.VIDEO_SHEET_ID] = ss;
}

/** متنِ قسمتِ ساختگی باید هم‌اندازهٔ متنِ واقعی باشد (حدود ده‌هزار نویسه)،
 *  وگرنه سهمیهٔ ۱۵٪ چند ده نویسه می‌شود و هر افزوده‌ای بریده می‌شود — یعنی
 *  آزمون چیزی را می‌سنجد که در واقعیت پیش نمی‌آید. */
function installBigStub() {
  installStub();
  const base = global.__STUB;
  global.__STUB = function (url, body) {
    const t = (body && body.contents) ? body.contents[0].parts[0].text : '';
    const isText = t.indexOf('یک داوری بده') === -1 && url.indexOf('tts') === -1 &&
                   url.indexOf('/v1beta/models?') === -1 &&
                   url.indexOf('api.telegram.org') === -1;
    const r = base(url, body);
    if (!isText || !r || !r.json) return r;
    try {
      const parsed = JSON.parse(r.json.candidates[0].content.parts[0].text);
      if (parsed && parsed.sections) {
        parsed.sections.forEach((sec, i) => {
          sec.narration = 'بخشِ ' + (i + 1) + '. ' +
            ('روایتِ کاملِ این بخش با جزئیات و توضیحِ گام‌به‌گامِ همان محتوای منبع. ')
              .repeat(30);
        });
        r.json.candidates[0].content.parts[0].text = JSON.stringify(parsed);
      }
    } catch (e) {}
    return r;
  };
}

function seed() {
  buildSources([
    { fid: 'A', name: 'MabaniTahlilBazar_Ostad', parts: 3, chunks: 11, textFn: LESSON },
    { fid: 'B', name: 'دورهٔ نویسندگی', parts: 3, chunks: 10, textFn: LESSON }
  ]);
  seedVariety();
  installBigStub();
  const un = quiet(); syncAll(60); un();
}

// ═══════════════ 1. the request is written before any audio ═══════════════
console.log('\n=== 1. متن پیش از صدا برای Cowork گذاشته می‌شود ===');
{
  reset(); seed();
  CFG.ENRICH_ENABLED = true;
  CFG.EPISODE_HOUR = 23;                    // so "is it worth waiting?" is true now
  const un = quiet(); const r = produceEpisode(); un();
  console.log('  ', JSON.stringify(r).slice(0, 120));
  const st = JSON.parse(global.__PROPS['PENDING_EPISODE'] || '{}');
  ok('1.1 قسمت در مرحلهٔ «انتظارِ غنی‌سازی» ایستاده، نه صدا', st.phase === 'enrich', st.phase);
  const req = readReq(ENRICH_SHOW_VARIETY, r.episode);
  ok('1.2 پروندهٔ درخواست نوشته شده', !!req, req ? req.contract : 'NONE');
  ok('1.3 متنِ همهٔ بخش‌ها در درخواست هست',
     req && req.sections.length >= 3 && req.sections.every(s => s.narration.length > 50),
     req ? req.sections.length + ' بخش' : '-');
  ok('1.4 منابعِ اصلی با لینک در درخواست هست',
     req && req.originalSources.length > 0 &&
     req.originalSources.some(s => /^https?:/.test(s.link)),
     req ? req.originalSources.length + ' منبع' : '-');
  ok('1.5 سهمیه صریح اعلام شده',
     req && req.limits.maxOutsideChars > 0 &&
     req.limits.maxOutsideChars <= Math.round(req.limits.originalNarrationChars * 0.16),
     req ? req.limits.maxOutsideChars + ' از ' + req.limits.originalNarrationChars : '-');
  ok('1.6 نامِ فایلِ پاسخ و مهلت در درخواست آمده',
     req && /^_ENRICH-variety-\d+\.json$/.test(req.answerFileName) && !!req.deadline,
     req ? req.answerFileName + ' تا ' + req.deadline : '-');
  ok('1.7 هنوز هیچ فایل صوتی ساخته نشده',
     global.__FILES.filter(f => /\.wav$/.test(f.getName())).length === 0,
     String(global.__FILES.filter(f => /\.wav$/.test(f.getName())).length));
  global.__EP1 = r.episode;
  global.__REQ1 = req;
}

// ═══════════════ 2. a good answer is merged, announced and sourced ════════
console.log('\n=== 2. پاسخِ درست: ادغام، اعلامِ بیرونی‌بودن، و ثبتِ منبع ===');
{
  const ep = global.__EP1, req = global.__REQ1;
  writeAns(ENRICH_SHOW_VARIETY, ep, {
    contract: 'enrich-v1', show: 'variety', episode: ep,
    items: [
      { targetSection: 0, type: 'outside', priority: 1,
        spokenLeadIn: 'یک نکته که بیرون از محتوای اصلی است و از جست‌وجوی اینترنتی آمد:',
        text: 'بانک مرکزی در گزارشِ خودش همین قاعده را تأیید کرده است.',
        spokenLeadOut: 'برگردیم به خودِ فایل.',
        sources: [{ title: 'گزارش سالانهٔ بانک مرکزی ۱۴۰۳ — فصل نقدینگی',
                    publisher: 'بانک مرکزی', date: '۱۴۰۳/۱۲/۰۱',
                    url: 'https://www.cbi.ir/page/annual-1403.aspx',
                    quote: 'نسبت نقدینگی به تولید ناخالص داخلی…' }] },
      // این یکی اعلام ندارد — موتور باید خودش اعلام را اضافه کند
      { targetSection: 1, type: 'outside', priority: 2,
        spokenLeadIn: 'و یک آمار تازه:',
        text: 'در سال گذشته این شاخص دو برابر شد.',
        sources: [{ title: 'Iran statistical yearbook 2025',
                    publisher: 'SCI', date: '2025-06',
                    url: 'https://www.amar.org.ir/yearbook-2025' }] },
      // این یکی لینک ندارد — باید رد شود
      { targetSection: 1, type: 'outside', priority: 3,
        spokenLeadIn: 'شنیده‌ام که',
        text: 'ادعایی بی هیچ منبع.', sources: [] },
      // و این توصیفِ خودِ محتوای اصلی است
      { targetSection: 2, type: 'inside', priority: 2,
        spokenLeadIn: 'برای روشن‌شدنِ همین نکته، یک مثال:',
        text: 'فرض کنید نموداری دارید که سه بار به یک سطح رسیده است.' }
    ],
    notes: 'دو منبعِ معتبر پیدا شد.'
  });
  let un2x = quiet(); const r = produceEpisodeContinue(); un2x();
  let st = JSON.parse(global.__PROPS['PENDING_EPISODE'] || '{}');
  ok('2.1 بعد از ادغام، مرحله به «متنِ صوتی» رفت (اعراب‌گذاری پیش از صدا)',
     st.phase === 'speak', st.phase);
  for (let sp = 0; sp < 4 && st.phase === 'speak'; sp++) {
    un2x = quiet(); produceEpisodeContinue(); un2x();
    st = JSON.parse(global.__PROPS['PENDING_EPISODE'] || '{}');
  }
  ok('2.1-ب بعد از اعراب‌گذاری، مرحله به صدا رفت', st.phase === 'audio', st.phase);

  // the merged text must be on disk, not just in memory
  const fid = st.folderId;
  const meta = JSON.parse(DriveApp.getFolderById(fid).getFilesByName('_episode.json')
                            .next().getBlob().getDataAsString());
  const merged = meta.ep;
  const all = merged.sections.map(s => s.narration).join('\n');
  ok('2.2 متنِ ادغام‌شده ذخیره شد (نه فقط در حافظه)',
     all.indexOf('بانک مرکزی در گزارشِ خودش') !== -1, String(all.length) + ' نویسه');
  ok('2.3 افزودهٔ بی‌منبع رد شد',
     all.indexOf('ادعایی بی هیچ منبع') === -1 && merged.__enrich.dropped >= 1,
     'dropped=' + merged.__enrich.dropped);
  ok('2.4 هر افزودهٔ بیرونی در گفتار اعلام شده',
     enrichDiscloses_('یک نکته که بیرون از محتوای اصلی است') &&
     merged.__enrich.forcedDisclosure === 1 &&
     all.indexOf('بیرون از محتوای اصلی') !== -1,
     'forced=' + merged.__enrich.forcedDisclosure);
  ok('2.5 توصیفِ محتوای اصلی هم آمد',
     all.indexOf('فرض کنید نموداری دارید') !== -1);
  ok('2.6 سهمِ بیرونی زیر سقف ماند',
     merged.__enrich.pctOutside <= CFG.ENRICH_MAX_OUTSIDE_PCT,
     merged.__enrich.pctOutside + '٪ (سقف ' + CFG.ENRICH_MAX_OUTSIDE_PCT + '٪)');
  ok('2.7 هر دو منبع با لینکِ کامل ثبت شد',
     merged.__extSources.length === 2 &&
     merged.__extSources.every(s => /^https:\/\//.test(s.url)) &&
     merged.__extSources[0].title.indexOf('گزارش سالانهٔ بانک مرکزی') === 0,
     merged.__extSources.map(s => s.url).join(' , '));
  ok('2.8 لینک کوتاه یا خلاصه نشده',
     merged.__extSources[0].url === 'https://www.cbi.ir/page/annual-1403.aspx',
     merged.__extSources[0].url);

  // در واقعیت، دروازهٔ «نه پیش از ساعتِ مقرر» تا ساعت ۲۳ صبر می‌کند. این‌جا
  // ساعت را جلو می‌زنیم تا بقیهٔ مسیر سنجیده شود. (خودِ آن دروازه در بخش ۱۰
  // جداگانه آزمون می‌شود.)
  const stNow = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  delete stNow.notBeforeHour;
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify(stNow);

  // finish the episode and check delivery surfaces
  let runs = 0;
  while (global.__PROPS['PENDING_EPISODE'] && runs < 80) {
    const u2 = quiet(); produceEpisodeContinue(); u2(); runs++;
  }
  ok('2.9 قسمت تا آخر ساخته و منتشر شد', !global.__PROPS['PENDING_EPISODE'], runs + ' اجرا');
  const sh = getHub_().getSheetByName(CFG.EXTSRC_TAB);
  const rows = sh ? sh.getLastRow() - 1 : 0;
  ok('2.10 منابع در تبِ «' + CFG.EXTSRC_TAB + '» ثبت شد', rows === 2, rows + ' ردیف');
  if (sh) {
    const v = sh.getRange(2, 1, rows, EXTSRC_HEADERS.length).getValues();
    ok('2.11 ردیفِ منبع، لینکِ دقیق و نقلِ مستقیم دارد',
       v.some(r => String(r[8]) === 'https://www.cbi.ir/page/annual-1403.aspx' &&
                   String(r[9]).indexOf('نسبت نقدینگی') === 0),
       v.map(r => r[8]).join(' , '));
  }
  const html = episodeHtml_(meta.epNum, merged, meta.items, meta.cat, []);
  ok('2.12 پیوستِ قسمت منابعِ بیرونی را نشان می‌دهد',
     html.indexOf('منابعِ بیرونی و غنی‌سازی') !== -1 &&
     html.indexOf('https://www.amar.org.ir/yearbook-2025') !== -1);
  ok('2.13 جملهٔ پایانیِ پیوست دیگر نمی‌گوید «چیزی افزوده نشده»',
     html.indexOf('چیزی به آن افزوده نشده') === -1 &&
     html.indexOf('افزوده‌های بیرونی در متن علامت خورده‌اند') !== -1);
}

// ═══════════════ 3. the ceiling really bites ═══════════════════════════════
console.log('\n=== 3. سهمیه واقعاً می‌بُرد: محتوای اصلی غالب می‌مانَد ===');
{
  reset(); seed();
  CFG.ENRICH_ENABLED = true; CFG.EPISODE_HOUR = 23;
  let un = quiet(); const r = produceEpisode(); un();
  const req = readReq(ENRICH_SHOW_VARIETY, r.episode);
  const items = [];
  for (let i = 0; i < 12; i++) {
    // متنِ هر افزوده باید متفاوت باشد، وگرنه صافیِ «افزودهٔ تکراری» می‌گیردش و
    // این بخش به‌جای سهمیه، تکراری‌بودن را می‌سنجد.
    items.push({ targetSection: i % req.sections.length, type: 'outside', priority: i + 1,
      spokenLeadIn: 'بیرون از محتوای اصلی:',
      text: 'یافتهٔ شمارهٔ ' + i + '. ' + ('ح' + i).repeat(340),
      sources: [{ title: 'منبع ' + i, url: 'https://example.org/a' + i }] });
  }
  writeAns(ENRICH_SHOW_VARIETY, r.episode, { items: items });
  un = quiet(); produceEpisodeContinue(); un();
  const st = JSON.parse(global.__PROPS['PENDING_EPISODE'] || '{}');
  const meta = JSON.parse(DriveApp.getFolderById(st.folderId)
                            .getFilesByName('_episode.json').next().getBlob().getDataAsString());
  const e = meta.ep.__enrich;
  console.log('   ', JSON.stringify({ applied: e.applied, dropped: e.dropped,
                                      pctOutside: e.pctOutside }));
  ok('3.1 بیشترشان بریده شد', e.dropped >= 8 && e.applied >= 1,
     'applied=' + e.applied + ' dropped=' + e.dropped);
  ok('3.2 سهمِ بیرونی از سقف نگذشت', e.pctOutside <= CFG.ENRICH_MAX_OUTSIDE_PCT,
     e.pctOutside + '٪');
  ok('3.3 مهم‌ترین‌ها ماندند، نه تصادفی‌ها',
     e.applied >= 1 && meta.ep.__extSources[0].title === 'منبع 0',
     meta.ep.__extSources.map(s => s.title).join(','));
  ok('3.4 دلیلِ بریدن در سیاههٔ خودِ قسمت هست',
     e.reasons.some(x => x.indexOf('سهمیه') !== -1), e.reasons[0]);
}

// ═══════════════ 4. Cowork never answers → podcast still ships ════════════
console.log('\n=== 4. اگر Cowork جواب نداد، پادکست از دست نمی‌رود ===');
{
  reset(); seed();
  CFG.ENRICH_ENABLED = true; CFG.EPISODE_HOUR = 23; CFG.ENRICH_WAIT_MIN = 90;
  let un = quiet(); const r = produceEpisode(); un();
  let st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  ok('4.1 منتظر است', st.phase === 'enrich', st.phase);
  // one poll while still inside the window: must keep waiting
  un = quiet(); const w = produceEpisodeContinue(); un();
  st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  ok('4.2 داخل مهلت، صبر می‌کند و صدا نمی‌سازد',
     st.phase === 'enrich' && global.__FILES.filter(f => /\.wav$/.test(f.getName())).length === 0,
     st.phase);
  // now pretend the window expired
  st.enrichAt = '2020-01-01 00:00';
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify(st);
  un = quiet(); produceEpisodeContinue(); un();
  st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  ok('4.3 بعد از مهلت، بی‌غنی‌سازی جلو می‌رود', st.phase === 'speak', st.phase);
  un = quiet(); produceEpisodeContinue(); un();       // speak → audio
  const meta = JSON.parse(DriveApp.getFolderById(st.folderId)
                            .getFilesByName('_episode.json').next().getBlob().getDataAsString());
  ok('4.4 دلیلش در خودِ قسمت ثبت شده',
     !!meta.ep.__enrichSkipped && meta.ep.__enrichSkipped.indexOf('نرسید') !== -1,
     meta.ep.__enrichSkipped);
  ok('4.5 و در ایمیل/پیوست هم گفته می‌شود',
     enrichNote_(meta.ep).indexOf('انجام نشد') !== -1, enrichNote_(meta.ep));
  const st4 = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  delete st4.notBeforeHour;
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify(st4);
  let runs = 0;
  while (global.__PROPS['PENDING_EPISODE'] && runs < 80) {
    const u2 = quiet(); produceEpisodeContinue(); u2(); runs++;
  }
  const pod = getHub_().getSheetByName(CFG.TAB_PODCASTS);
  const row = pod.getRange(pod.getLastRow(), 1, 1, PODCAST_HEADERS.length).getValues()[0];
  ok('4.6 قسمت منتشر شد', String(row[10]).indexOf('ارسال شد') !== -1, String(row[10]));
}

// ═══════════════ 5. an empty answer is accepted, not waited on ════════════
console.log('\n=== 5. پاسخِ «چیزی پیدا نشد» هم پاسخ است ===');
{
  reset(); seed();
  CFG.ENRICH_ENABLED = true; CFG.EPISODE_HOUR = 23;
  let un = quiet(); const r = produceEpisode(); un();
  writeAns(ENRICH_SHOW_VARIETY, r.episode, { items: [], notes: 'موضوع خیلی خاص بود.' });
  un = quiet(); produceEpisodeContinue(); un();
  let st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  ok('5.1 بی‌معطلی جلو رفت (مرحلهٔ متنِ صوتی)', st.phase === 'speak', st.phase);
  un = quiet(); produceEpisodeContinue(); un();
  st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  const meta = JSON.parse(DriveApp.getFolderById(st.folderId)
                            .getFilesByName('_episode.json').next().getBlob().getDataAsString());
  ok('5.2 و یادداشتِ Cowork حفظ شد',
     String(meta.ep.__enrichSkipped).indexOf('موضوع خیلی خاص') !== -1,
     meta.ep.__enrichSkipped);
}

// ═══════════════ 6. the specialist show does the same ═════════════════════
console.log('\n=== 6. درس‌نامه هم همین مسیر را می‌رود ===');
{
  reset(); seed();
  CFG.ENRICH_ENABLED = true; CFG.SPECIAL_HOUR = 23;
  /* متنِ ساختگیِ این آزمون بلندتر از یک قسمتِ واقعی است، و از ۵٫۹۶ سقفِ
     «یک فایل» جای غنی‌سازی را از سقفِ واقعیِ فایل حساب می‌کند. پس این‌جا
     سقفِ فایل بالا برده می‌شود تا موضوعِ همین بلوک — «درس‌نامه هم همان مسیر
     را می‌رود» — سنجیده شود، نه سقف. خودِ سقف بلوکِ ۱۰ را دارد. */
  const _mergeWas = CFG.MERGE_MAX_BYTES;
  CFG.MERGE_MAX_BYTES = 120000000;
  let un = quiet();
  judgeSeries(false, Date.now() + 60000);
  const r = produceSpecialEpisode();
  un();
  console.log('  ', JSON.stringify(r).slice(0, 130));
  const st = JSON.parse(global.__PROPS['SPECIAL_PENDING'] || '{}');
  ok('6.1 درس‌نامه هم پیش از صدا می‌ایستد', st.phase === 'enrich', st.phase);
  const req = readReq(ENRICH_SHOW_SPECIAL, r.episode);
  ok('6.2 درخواستش نامِ مجموعه و سطح و محدودهٔ قطعه‌ها را دارد',
     req && !!req.seriesName && req.fromChunk >= 1,
     req ? req.seriesName + ' · قطعهٔ ' + req.fromChunk + '–' + req.toChunk : 'NONE');
  writeAns(ENRICH_SHOW_SPECIAL, r.episode, { items: [
    { targetSection: 0, type: 'outside', priority: 1,
      spokenLeadIn: 'این را از بیرونِ آرشیو اضافه می‌کنم:',
      text: 'همین روش امروز در منابعِ درسی هم توصیه می‌شود.',
      sources: [{ title: 'Investopedia — Technical Analysis Basics',
                  publisher: 'Investopedia', date: '2025-01-10',
                  url: 'https://www.investopedia.com/technical-analysis-4689657' }] }
  ] });
  un = quiet(); produceSpecialContinue(); un();
  let st2 = JSON.parse(global.__PROPS['SPECIAL_PENDING'] || '{}');
  ok('6.3 ادغام شد و به «متنِ صوتی» رفت', st2.phase === 'speak', st2.phase);
  for (let sp2 = 0; sp2 < 4 && st2.phase === 'speak'; sp2++) {
    un = quiet(); produceSpecialContinue(); un();
    st2 = JSON.parse(global.__PROPS['SPECIAL_PENDING'] || '{}');
  }
  ok('6.3-ب و بعدش به صدا', st2.phase === 'audio', st2.phase);
  const meta = JSON.parse(DriveApp.getFolderById(st2.folderId)
                            .getFilesByName('_special.json').next().getBlob().getDataAsString());
  ok('6.4 اعلامِ بیرونی‌بودن در گفتارِ درس‌نامه هست',
     meta.ep.sections[0].narration.indexOf('از بیرونِ آرشیو') !== -1);
  ok('6.5 منبعِ غیرفارسی با لینکِ اصلی ثبت شد',
     meta.ep.__extSources.length === 1 &&
     meta.ep.__extSources[0].url.indexOf('investopedia.com') !== -1,
     meta.ep.__extSources[0].url);
  CFG.MERGE_MAX_BYTES = _mergeWas;
}

// ═══════════════ 7. late preparation must not delay the podcast ═══════════
console.log('\n=== 7. آماده‌سازیِ دیر، پادکست را عقب نمی‌اندازد ===');
{
  reset(); seed();
  CFG.ENRICH_ENABLED = true;
  CFG.EPISODE_HOUR = 1;                  // publish hour already passed today
  const un = quiet(); const r = produceEpisode(); un();
  const st = JSON.parse(global.__PROPS['PENDING_EPISODE'] || '{}');
  ok('7.1 وقتی وقت نیست، اصلاً منتظرِ غنی‌سازی نمی‌شود',
     st.phase !== 'enrich', String(st.phase));
  ok('7.2 و درخواستی هم بی‌جهت نمی‌گذارد',
     !readReq(ENRICH_SHOW_VARIETY, r.episode), 'no request');
}

// ═══════════════ 8. the disclosure detector ══════════════════════════════
console.log('\n=== 8. تشخیصِ «اعلامِ بیرونی‌بودن» — بی قالبِ ثابت ===');
{
  const yes = ['این نکته بیرون از محتوای اصلی است',
               'خارج از فایل‌های خودتان، یک آمار هم هست',
               'این را از اینترنت پیدا کردم',
               'در خودِ آرشیو نیست ولی مهم است',
               'یک افزودهٔ بیرونی:',
               'از بیرونِ این مجموعه یک تأیید هم دارد',
               'جست‌وجوی وب یک نکتهٔ تازه داد'];
  const no = ['و بعد مدرس ادامه می‌دهد',
              'این نکته در فایلِ سومِ همین دوره آمده',
              'حالا برگردیم به مثالِ قبلی'];
  let bad = [];
  yes.forEach(s => { if (!enrichDiscloses_(s)) bad.push('نگرفت: ' + s); });
  no.forEach(s => { if (enrichDiscloses_(s)) bad.push('اشتباه گرفت: ' + s); });
  ok('8.1 هفت شکلِ متفاوتِ اعلام شناخته می‌شود و جمله‌های عادی نه',
     bad.length === 0, bad.join(' | ') || 'همه درست');
}

// ═══════════════ 9. adversarial answers must not break anything ═══════════
console.log('\n=== 9. پاسخِ خراب، موتور را نمی‌شکند ===');
{
  const bad = [
    { items: [null, undefined, 5, 'x'] },
    { items: [{ targetSection: 999, type: 'outside', text: 'x',
                sources: [{ url: 'javascript:alert(1)' }] }] },
    { items: [{ targetSection: -3, type: 'inside', text: 'y' }] },
    { items: [{ targetSection: '__proto__', type: 'outside', text: 'z',
                sources: [{ url: 'https://a.example/1' }] }] },
    { items: [{ targetSection: 0, type: 'constructor', text: 'w' }] },
    { items: [{ targetSection: 0, type: 'outside', text: 'q',
                sources: [{ url: 'https://a.example/2', title: { deep: [1, 2] } }] }] }
  ];
  let threw = '';
  bad.forEach((a, i) => {
    const ep = { title: 't', sections: [{ heading: 'h', narration: 'n'.repeat(500) },
                                        { heading: 'h2', narration: 'm'.repeat(500) }] };
    try { const u = quiet(); applyEnrichment_(ep, a, 'variety', 1); u(); }
    catch (e) { threw += '#' + i + ': ' + e.message + ' '; }
  });
  ok('9.1 هیچ‌کدام استثنا نداد', !threw, threw || 'پاک');
  ok('9.2 پروتوتایپ آلوده نشد',
     ({}).deep === undefined && [].deep === undefined && ''.deep === undefined);
  const ep2 = { title: 't', sections: [{ heading: 'h', narration: 'n'.repeat(500) }] };
  const u = quiet();
  applyEnrichment_(ep2, { items: [{ targetSection: 0, type: 'outside', text: 'x',
    spokenLeadIn: 'بیرون از محتوای اصلی:',
    sources: [{ url: 'javascript:alert(1)' }, { url: 'ftp://x/y' },
              { url: 'https://ok.example/p' }] }] }, 'variety', 1);
  u();
  ok('9.3 فقط لینکِ http(s) پذیرفته می‌شود',
     ep2.__extSources.length === 1 && ep2.__extSources[0].url === 'https://ok.example/p',
     ep2.__extSources.map(s => s.url).join(','));
}

// ═══════════════ 10. the clock gate: enrichment must not shift delivery ═══
console.log('\n=== 10. غنی‌سازیِ زود، ساعتِ رسیدنِ پادکست را جلو نمی‌اندازد ===');
{
  reset(); seed();
  CFG.ENRICH_ENABLED = true; CFG.EPISODE_HOUR = 23;
  let un = quiet(); const r = produceEpisode(); un();
  writeAns(ENRICH_SHOW_VARIETY, r.episode, { items: [] });
  un = quiet(); produceEpisodeContinue(); un();       // enrich → speak
  let st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  ok('10.1 مرحله به «متنِ صوتی» رفت', st.phase === 'speak', st.phase);
  st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  for (let sp3 = 0; sp3 < 4 && st.phase === 'speak'; sp3++) {
    un = quiet(); produceEpisodeContinue(); un();
    st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  }
  un = quiet(); const g = produceEpisodeContinue(); un();
  ok('10.2 ولی صدا پیش از ساعتِ مقرر شروع نمی‌شود',
     global.__FILES.filter(f => /\.wav$/.test(f.getName())).length === 0,
     'wav=' + global.__FILES.filter(f => /\.wav$/.test(f.getName())).length);
  ok('10.3 و برای همان ساعت دوباره زمان‌بندی می‌کند',
     g && g.waitingClock === true, JSON.stringify(g));
  // once the hour arrives, it proceeds
  st = JSON.parse(global.__PROPS['PENDING_EPISODE']);
  st.notBeforeHour = 1;
  global.__PROPS['PENDING_EPISODE'] = JSON.stringify(st);
  un = quiet(); produceEpisodeContinue(); un();
  ok('10.4 با رسیدنِ ساعت، صداگذاری شروع می‌شود',
     global.__FILES.filter(f => /\.wav$/.test(f.getName())).length > 0,
     'wav=' + global.__FILES.filter(f => /\.wav$/.test(f.getName())).length);
}

process.exit(summary('غنی‌سازی با Cowork') ? 1 : 0);
