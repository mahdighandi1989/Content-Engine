/* ══ آزمونِ ۱۳.۷ — سه خواستهٔ تأییدشدهٔ صاحبِ کانال ══
 * ۱) نشانیِ درایوِ ویدئو در ستونِ «فایل تصویری» (بلند، ریلز، شورتز) + پرکردنِ قسمت‌های پیشین بی دست‌زدن به فایل‌ها
 * ۲) پنج ردیفِ پرتکرارِ صفِ کد از ریشه: monitor-check-silent، monitor-check-skipped، audit-queue-stuck،
 *    chronic-7df6bcbc (شمارِ «تکرارشده»)، tts-pin-drift
 * ۳) دفترِ EXT-NOTEBOOKLM-STATE هر شب فقط خوانده می‌شود؛ مجموعه‌اش ریلز و شورتزِ موتور نمی‌گیرد؛ هیچ نوشتنی در آن
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const src = n => fs.readFileSync('src/' + n, 'utf8');
const fnBody = (code, name) => {
  const i = code.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let d = 0, j = code.indexOf('{', i);
  for (let k = j; k < code.length; k++) { if (code[k] === '{') d++; else if (code[k] === '}') { d--; if (!d) return code.slice(i, k + 1); } }
  return '';
};

console.log('\n=== ۱) «فایل تصویری» ===');
{
  const m1 = vidLinkMerge_('', 'ویدئو', 'U1');
  const m2 = vidLinkMerge_(vidLinkMerge_('یادداشتِ دستی\nریلز: R0', 'شورتز', 'S1'), 'ویدئو', 'U2');
  const m3 = vidLinkMerge_(m2, 'ریلز', 'R1');
  ok('۱.۱ سطرِ همان نوع جایگزین، بقیه سرِ جا، ترتیب ثابت (ویدئو، ریلز، شورتز، دستی)',
     m1 === 'ویدئو: U1' && m3 === 'ویدئو: U2\nریلز: R1\nشورتز: S1\nیادداشتِ دستی', JSON.stringify(m3));
  ok('۱.۲ برچسبِ بخش: «ریلز ۲»', vidLinkKind_('ریلز', 2) === 'ریلز ۲' && vidLinkKind_('شورتز', 1) === 'شورتز');

  const hub = getHub_();
  const sp = ensureTab_(hub, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
  sp.appendRow([12, '2026-10-01', 'Audi', 'درس ۳']);
  sp.appendRow([13, '2026-10-02', 'Audi', 'درس ۴']);
  const pod = ensureTab_(hub, CFG.TAB_PODCASTS, PODCAST_HEADERS);
  pod.appendRow([40, '2026-10-01', 'عنوان', 'دسته', 0, 0, '—', '', '', '', 'ارسال شد']);
  const r1 = vidLinkNote_(ENRICH_SHOW_SPECIAL, 12, 'ویدئو', 'https://drive/v12');
  const col = vidLinkCol_(sp, false);
  ok('۱.۳ تبِ درس‌نامه ستونِ «فایل تصویری» می‌گیرد (ته) و خانهٔ همان قسمت پر می‌شود',
     r1.ok && col === SPECIAL_HEADERS.length + 1 && sp.getRange(2, col).getValue() === 'ویدئو: https://drive/v12',
     JSON.stringify({ r1, col, v: sp.getRange(2, col).getValue() }));
  vidLinkNote_(ENRICH_SHOW_VARIETY, 40, 'ویدئو', 'https://drive/v40');
  ok('۱.۴ Podcasts: همان ستونِ دهمِ از پیش موجود («فایل تصویری»)، نه ستونِ تازه',
     pod.getRange(2, 10).getValue() === 'ویدئو: https://drive/v40' && vidLinkCol_(pod, false) === 10);
  const r2 = vidLinkNote_(ENRICH_SHOW_SPECIAL, 99, 'ویدئو', 'x');
  ok('۱.۵ قسمتی که ردیف ندارد ⇒ ok=false با علت، بی ساختنِ ردیف', !r2.ok && /ردیف/.test(r2.why) && sp.getLastRow() === 3);

  /* پرکردنِ پیشین: پوشهٔ قسمتِ ۱۳ با ویدئوی بلند، دو بخشِ ریلز و شورتز، و ویدئوی جایگزین‌شده در زیرپوشه */
  const ep13 = global.__ROOT_FOLDER.createFolder('قسمت 13');
  ep13.createFile(Utilities.newBlob('x', 'video/mp4', 'قسمت 13 — ویدئو.mp4'));
  const aside = ep13.createFolder('ویدئوی پیشین — جایگزین‌شده');
  aside.createFile(Utilities.newBlob('x', 'video/mp4', 'قسمت 13 — ویدئو.mp4'));
  const ig1 = ep13.createFolder('اینستاگرام'), ig2 = ep13.createFolder('اینستاگرام ۲');
  ig1.createFile(Utilities.newBlob('x', 'video/mp4', 'ریلز — درس ۴.mp4'));
  ig1.createFile(Utilities.newBlob('x', 'video/mp4', 'شورتز — درس ۴.mp4'));
  ig1.createFile(Utilities.newBlob('x', 'image/jpeg', 'ریلز — کاور.jpg'));
  ig2.createFile(Utilities.newBlob('x', 'video/mp4', 'ریلز — درس ۴ب.mp4'));
  const keepF = global.ytFolderOf_;
  const asked = [];
  global.ytFolderOf_ = (show, ep, series) => { asked.push(show + ':' + ep + ':' + series); return show === ENRICH_SHOW_SPECIAL && ep === 13 ? ep13 : null; };
  const before = JSON.stringify([ep13._files.map(f => f.getName()), aside._files.length, ig1._files.length, ig2._files.length]);
  delete global.__PROPS[PK.VIDLINK_BF];
  const b1 = vidLinkBackfill_(60000);
  const cell13 = String(sp.getRange(3, col).getValue());
  const lines = cell13.split('\n');
  ok('۱.۶ پرکردنِ پیشین: ویدئوی بلندِ خودِ پوشه (نه جایگزین‌شده)، ریلز و شورتزِ بخشِ ۱، ریلزِ بخشِ ۲',
     lines.length === 4 && /^ویدئو: /.test(lines[0]) && lines[0].indexOf(ep13._files[0].getId()) !== -1 &&
     /^ریلز: /.test(lines[1]) && /^ریلز ۲: /.test(lines[2]) && /^شورتز: /.test(lines[3]), cell13);
  ok('۱.۷ ردیفی که «ویدئو» و «ریلز» را دارد بی هیچ پرسشِ درایو رد می‌شود؛ پوشه با نامِ مجموعه پرسیده می‌شود',
     asked.indexOf('special:12:Audi') !== -1 && asked.indexOf('special:13:Audi') !== -1, asked.join(' | '));
  const after = JSON.stringify([ep13._files.map(f => f.getName()), aside._files.length, ig1._files.length, ig2._files.length]);
  ok('۱.۸ هیچ فایلی ساخته، جابه‌جا یا پاک نشد', before === after, after);
  ok('۱.۹ دور تمام شد و خاموش است (Podcasts هم پیموده شد)', b1.done === true && vidLinkBackfill_(60000).done === true &&
     /تمام شد/.test(vidLinkStatus_().line), JSON.stringify(b1) + ' ' + vidLinkStatus_().line);
  global.__PROPS[PK.VIDLINK_BF] = JSON.stringify({ ver: '0', done: true });
  const b2 = vidLinkBackfill_(60000);
  ok('۱.۱۰ بالا رفتنِ VIDLINK_BF_VER دورِ تازه می‌سازد', b2.done === true && b2.rows >= 1, JSON.stringify(b2));
  global.ytFolderOf_ = keepF;

  const yt = src('27_YouTube.gs'), ig = src('38_Instagram.gs');
  ok('۱.۱۱ ویدئوی بلند همان لحظهٔ رسیدن نشانی‌اش را می‌نویسد (ytRenderFetch_)',
     /vidLinkNote_\(item\.show, item\.ep, 'ویدئو', made\.getUrl\(\)\)/.test(fnBody(yt, 'ytRenderFetch_')));
  const got = fnBody(ig, 'igStepGot_');
  ok('۱.۱۲ ریلز و شورتز هم، با برچسبِ بخش؛ و کدِ پاسخِ غیرِ ۲۰۰ دیگر بی‌صدا نیست',
     /vidLinkKind_\('ریلز', it\.part\)/.test(got) && /vidLinkKind_\('شورتز', it\.part\)/.test(got) &&
     (got.match(/else miss\.push/g) || []).length === 3, got.length);
  const nightly = src('21_SelfUpdate.gs');
  ok('۱.۱۳ شبانه پشتِ nightHas_ و typeof', /nightHas_\(45000, 'نشانیِ ویدئوها در شیت'\)/.test(nightly) &&
     /typeof vidLinkBackfill_ === 'function'/.test(nightly));
}

console.log('\n=== ۳) دفترِ NotebookLM — فقط خواندن ===');
{
  const ext = new (SpreadsheetApp.create('EXT').constructor)('EXT-NOTEBOOKLM-STATE', CFG.EXT_NLM_SHEET);
  global.__SS[CFG.EXT_NLM_SHEET] = ext;
  const sr = ext.insertSheet('منابع');
  [['منبع / کتاب', 'کلید در CONTENT-HUB', 'مسیر', 'فاز', 'جریان', 'واحدهای برنامه‌ریزی‌شده', 'قطعه‌ها', 'وضعیت متن', 'یادداشت'],
   ['Are Your Lights On?', 'vdoc pub are your lights on', 'الف', '۱', 'جریان ۱', 40, 25, 'در شیت هست', ''],
   ['پولیا — How to Solve It', 'polya how to solve it', 'الف', '۱', 'جریان ۱', 147, 30, 'در شیت هست', ''],
   ['Logic and Design', '—', 'الف', '۱', '', 0, '—', 'در انتظار متن', '']].forEach(r => sr.appendRow(r));
  const su = ext.insertSheet('واحدها');
  [['کلید مجموعه (CONTENT-HUB)', 'جریان', 'شناسهٔ واحد', 'عنوان', 'مفهوم', 'قطعه‌ها', 'ردیف‌ها', 'وضعیت'],
   ['vdoc pub are your lights on', '۱', 'AYLO-001', 'x', 'y', '02,03', '102,103', 'منتشرشده ۲۶ اکتبر'],
   ['vdoc pub are your lights on', '۱', 'AYLO-002', 'x', 'y', '3', '103', 'زمان‌بندی‌شده: یوتیوب ۲۹ اکتبر'],
   ['vdoc pub are your lights on', '۱', 'AYLO-003', 'x', 'y', '3', '103', 'برنامه‌ریزی‌شده']].forEach(r => su.appendRow(r));
  const snap = () => JSON.stringify(ext._s.map(s => [s._n, s._d]));
  const s0 = snap();
  delete global.__PROPS[PK.EXT_NLM];
  const r = extNlmSync_();
  ok('۳.۱ خوانده شد: دو مجموعه («در انتظار متن» بیرون)، ۳ واحد و ۲ منتشر/زمان‌بندی',
     r.ok && r.series.length === 2 && r.series.reduce((a, x) => a + x.u, 0) === 3 && r.series.reduce((a, x) => a + x.p, 0) === 2,
     JSON.stringify(r.series));
  ok('۳.۲ **هیچ چیزی در آن شیت نوشته نشد** (همهٔ تب‌ها بایت‌به‌بایت همان)', snap() === s0 && ext._s.length === 2);
  const mem = extNlmMem_();
  ok('۳.۳ هم‌خوانی: «Are Your Lights On?» و «How to Solve It» بله؛ «Audi (2011) Epistemology» و «Logic and Design» نه',
     !!extNlmCovers_(mem, 'Are Your Lights On?', '') && !!extNlmCovers_(mem, 'How to Solve It', '') &&
     !!extNlmCovers_(mem, 'هر نامی', 'polya how to solve it') &&
     !extNlmCovers_(mem, 'Audi (2011) Epistemology', 'audi epistemology') && !extNlmCovers_(mem, 'Logic and Design', ''));

  const st = { done: '', inflight: [], fails: {}, failAt: {} };
  const order = [{ name: 'Are Your Lights On?', eps: [{ ep: 5, recap: 0, lesson: 1 }] },
                 { name: 'Audi (2011) Epistemology', eps: [{ ep: 6, recap: 0, lesson: 1 }] }];
  const pub = { 'special:5': { videoId: 'a', privacy: 'public', url: 'u5', title: 't5' },
                'special:6': { videoId: 'b', privacy: 'public', url: 'u6', title: 't6' } };
  const nx = igNextEp_(pub, st, order);
  ok('۳.۴ صفِ ریلز مجموعهٔ بیرونی را رد می‌کند (نه «گیر»، نه «جاافتاده») و به مجموعهٔ بعدی می‌رسد',
     nx && nx.ep === 6 && st.extSkip.join() === 'Are Your Lights On?' && !(st.gaps || []).length, JSON.stringify({ nx, st }));
  igStateSave_(Object.assign(igState_(), { extSkip: st.extSkip }));   // در تولید فراخوانِ igNextEp_ حالت را ذخیره می‌کند
  const line = extNlmStatus_().line;
  ok('۳.۵ خطِ وضعیت می‌گوید چه خوانده شد و کدام مجموعه کنار رفت', /فقط خواندن/.test(line) && /Are Your Lights On/.test(line), line);

  /* شکستِ خواندن حافظه را پاک نمی‌کند */
  delete global.__SS[CFG.EXT_NLM_SHEET];
  const r2 = extNlmSync_();
  ok('۳.۶ «نتوانستم بخوانم» ⇒ همان فهرستِ دیشب با علت، نه «هیچ مجموعهٔ بیرونی»',
     r2.series.length === 2 && /باز نشد/.test(String(r2.why)) && /خواندنِ آخر نشد/.test(extNlmStatus_().line), JSON.stringify(r2).slice(0, 200));
  global.__SS[CFG.EXT_NLM_SHEET] = ext;

  const body = ['extNlmNorm_', 'extNlmVals_', 'extNlmColOf_', 'extNlmRead_', 'extNlmSync_', 'extNlmMem_', 'extNlmCovers_', 'extNlmRegKeys_', 'extNlmStatus_']
    .map(n => fnBody(src('38_Instagram.gs'), n)).join('\n');
  ok('۳.۷ در کدِ این بخش هیچ متدِ نوشتن روی آن دفتر نیست',
     body.length > 2000 && !/\.(setValue|setValues|appendRow|insertSheet|deleteRow|deleteSheet|clear|insertRow|setName)\w*\(/.test(body));
  ok('۳.۸ هر شب، پشتِ nightHas_', /nightHas_\(20000, 'دفترِ NotebookLM'\)/.test(src('21_SelfUpdate.gs')));
}

console.log('\n=== ۲) پنج ردیفِ پرتکرارِ صفِ کد ===');
{
  /* monitor-check-silent: کلِ گزارش نیامده ⇒ نه یافتهٔ «ساکت» */
  const days = n => Utilities.formatDate(new Date(Date.now() - n * 86400000), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm');
  const m = { __rep: { firstAt: days(20), lastAt: days(3) } };
  (CFG.MONITOR_CHECKS || []).forEach(w => { m[w.key] = { at: days(3), verdict: 'سالم' }; });
  global.__PROPS[PK.MON_CHECKS] = JSON.stringify(m);
  const keep = global.logSelfFinding_, logged = [];
  global.logSelfFinding_ = (h, f) => { logged.push(f); };
  const a = monChecksStatus_(null, true);
  ok('۲.۱ گزارشِ روزانه سه روز نیامده ⇒ هیچ وارسی «ساکت» نیست و یافتهٔ monitor-check-silent ساخته نمی‌شود؛ خط علت را می‌گوید',
     a.repMissing === true && !a.silent.length && !logged.some(f => f.key === 'monitor-check-silent') && /دیده‌بان/.test(a.line), a.line);
  m.__rep.lastAt = days(0);
  const k0 = CFG.MONITOR_CHECKS[0].key;
  delete m[k0];
  global.__PROPS[PK.MON_CHECKS] = JSON.stringify(m);
  logged.length = 0;
  const b = monChecksStatus_(null, true);
  ok('۲.۲ گزارش رسیده و یک کلید در آن نیست ⇒ همان یک کلید «ساکت» و یافته ساخته می‌شود',
     !b.repMissing && b.silent.length === CFG.MONITOR_CHECKS.length && logged.some(f => f.key === 'monitor-check-silent'),
     b.silent.length + ' / ' + b.line.slice(0, 120));
  global.logSelfFinding_ = keep;
  const vS = selfVerifyOne_('monitor-check-silent', { monChecks: { ok: false, silent: [], skipped: [{ key: 'instagram' }] } });
  ok('۲.۳ سنجندهٔ «ساکت» فقط silent را می‌بیند — «نشد»ِ یک وارسی دیگر بستنش را نمی‌بندد', vS.known && vS.still === false, JSON.stringify(vS));

  /* monitor-check-skipped: گوشِ موتور برای لحن و ریلز */
  const sch = JSON.stringify(TTS_LB_SCHEMA_);
  ok('۲.۴ شنونده در همان فراخوان لحن را هم می‌شنود (pros، همه رشته)', /"pros"/.test(sch) && !/"(integer|number|boolean)"/.test(sch));
  delete global.__PROPS[PK.TTS_PROS];
  ttsProsNote_({ q: 'صاف', mark: 'نه', jump: 'نه', mood: 'بله' }, 'این درست است؟', 'آرام');
  ttsProsNote_({ q: 'بالا', mark: 'بله: «گیومه» خوانده شد', jump: 'نه', mood: 'نه: تند بود' }, 'آیا «این» درست است؟', 'آرام');
  ttsProsNote_({ q: 'صاف', mark: 'نه', jump: 'نه', mood: '' }, 'جملهٔ خبری.', '');
  const ps = ttsListenStatus_();
  ok('۲.۵ شمارِ روز: پرسشِ صاف فقط از تکه‌ای که «؟» دارد؛ نشانه، حالت؛ و خطِ آماده برای ناظر',
     ps.pros.n === 3 && ps.pros.qAsk === 2 && ps.pros.qFlat === 1 && ps.pros.mark === 1 && ps.pros.moodN === 2 && ps.pros.moodNo === 1 &&
     /۱ از ۲ پرسش/.test(ps.prosLine) && /گیومه/.test(ps.prosLine), ps.prosLine);
  const pr = src('03_Producer.gs');
  ok('۲.۶ شنیدنِ لحن هیچ تکه‌ای را از نو نمی‌سازد (فقط ttsProsNote_ پس از v1)',
     /var v1 = ttsListenCheck_\(b64, text, sectionStyle\);[\s\S]{0,200}ttsProsNote_\(v1\.pros, text, sectionStyle\)/.test(pr));
  delete global.__PROPS[PK.IG_EAR];
  igEarNote_('ig:special:84', { at: '2026-10-27 09:00', failed: false, n: 1, w: ['باور←باوری'], pros: { q: 'بالا', mark: 'نه', jump: 'نه' } });
  const ear = igEarStatus_();
  ok('۲.۷ گوشِ ریلز: آخرین شنیده با واژهٔ بدخوانده در خط', /84/.test(ear.line) && /باور/.test(ear.line), ear.line);
  ok('۲.۸ گوشِ ریلز فقط شنیدن است — صدای ریلز دوباره ساخته نمی‌شود', (() => {
    const b2 = fnBody(src('38_Instagram.gs'), 'igStepVoice_');
    const i = b2.indexOf('ttsListenCheck_(');
    return i > 0 && b2.slice(i, i + 700).indexOf('ttsChunk') === -1 && /plan\.earFor !== plan\.audioId/.test(b2);
  })());
  const v115 = fs.readFileSync('docs/prompts/_PROMPT-monitor-v115.md', 'utf8');
  ok('۲.۹ دستورِ ناظر v115: «شنیدن» از ttsListen.prosLine و instagram.ear، برای نسخهٔ موتور 13.7',
     /> برای نسخهٔ موتور: 13\.7/.test(v115) && /ttsListen\.prosLine/.test(v115) && /instagram\.ear/.test(v115) && v115.length < 160000);

  /* audit-queue-stuck: عمرِ قدیمی‌ترین */
  const keepP = global.auditPending_;
  const fakeF = h => ({ getDateCreated: () => new Date(Date.now() - h * 3600000), getName: () => '_AUDIT-x' });
  global.auditPending_ = () => [fakeF(3), fakeF(14), fakeF(20), fakeF(27)];
  const q1 = auditQueueStatus_(null);
  ok('۲.۱۰ صفِ ثابتِ روان (قدیمی‌ترین ۲۷ ساعت) «گیر» نیست — هرچقدر هم روزها همان عدد', q1.ok === true && q1.days === 1, JSON.stringify(q1));
  global.auditPending_ = () => [fakeF(3), fakeF(55)];
  const q2 = auditQueueStatus_(null);
  ok('۲.۱۱ قسمتی که دو شب مانده ⇒ گیر، هرچند صف کوتاه است', q2.ok === false && q2.days === 2 && /قدیمی‌ترینش/.test(q2.line), JSON.stringify(q2));
  global.auditPending_ = keepP;

  /* chronic-7df6bcbc: «تکرارشده» بی ردیف‌های صفِ کد */
  const keepL = global.loadReportRows_, keepS = global.codeRowSatisfied_;
  const row = (st, seen, instr) => { const v = new Array(REPORT_HEADERS.length).fill(''); v[RC.STATUS - 1] = st; v[RC.SEEN - 1] = seen; v[RC.INSTR - 1] = instr; v[RC.AT - 1] = '2026-10-20'; v[RC.TITLE - 1] = 't'; v[RC.ID - 1] = 'i'; return { vals: v, row: 2 }; };
  global.loadReportRows_ = () => ({ rows: [row(RST.NEEDS_CODE, 9, 'x'), row(RST.NEEDS_CODE, 4, 'x'), row(RST.NEW, 3, 'کن'), row(RST.NEW, 1, 'کن')] });
  global.codeRowSatisfied_ = () => false;
  const sm = reportSummary_(null);
  ok('۲.۱۲ «تکرارشده» فقط دستورهای باز را می‌شمارد (۱)، صفِ کد جدا (repeatedCode ۲)',
     sm.repeated === 1 && sm.repeatedCode === 2 && sm.needsCode === 2, JSON.stringify({ r: sm.repeated, c: sm.repeatedCode }));
  global.loadReportRows_ = keepL; global.codeRowSatisfied_ = keepS;

  /* tts-pin-drift */
  const pin = CFG.TTS_MODEL_PIN;
  global.__PROPS[PK.MODELS] = JSON.stringify({ ttsAvail: [pin], tts: pin });
  global.__PROPS[PK.TTS_PROFILE] = JSON.stringify({ model: pin, ver: Number(CFG.TTS_PROFILE_VER) || 1, at: '2026-10-05 02:36', rate: 9.79, f0: 100, drift: 3, driftWhy: '۴٫۴ نیم‌پرده زیرتر' });
  global.__PROPS[PK.TTS_AUDITS] = JSON.stringify({ [pin]: { at: '2026-10-24 02:34', rate: 9.8, f0: 129, clip: 'https://drive/clip' } });
  const ts = ttsModelStatus_();
  const selfA = ts.audits.find(x => x.self);
  ok('۲.۱۳ ردیفِ خودِ سنجاق عددِ واقعیِ آخرین آزمون را نشان می‌دهد (۴٫۴ نیم‌پرده)، نه «هم‌خوان ۰/۰»',
     selfA && selfA.fit === false && Math.abs(selfA.dF0 - 4.4) < 0.11 && ts.liveFit === true, JSON.stringify(selfA));
  const keepT = global.tgSend_, sent = [];
  global.tgSend_ = t => { sent.push(t); return true; };
  logged.length = 0;
  global.logSelfFinding_ = (h, f) => { logged.push(f); };
  delete global.__PROPS[PK.TTS_DRIFT_TOLD];
  ttsModelGates_(null, ts); ttsModelGates_(null, ts);
  const fd = logged.find(f => f.key === 'tts-pin-drift');
  ok('۲.۱۴ یافته مالِ «کاربر» (از صفِ کد بیرون) و بی دستور (به پرامپتِ نویسنده تزریق نمی‌شود)؛ پرسش در detail',
     fd && fd.owner === 'کاربر' && fd.instruction === '' && /مرجعِ صدا تازه شود/.test(fd.detail), JSON.stringify(fd || {}).slice(0, 200));
  ok('۲.۱۵ نمونه یک بار برای هر دورِ دگرگونی به تلگرام می‌رود، با پیوندِ نمونه', sent.length === 1 && /drive\/clip/.test(sent[0]), sent.length);
  global.logSelfFinding_ = keep; global.tgSend_ = keepT;
  const mdl = src('06_Models.gs');
  ok('۲.۱۶ برداشتِ دور از مرجع همان‌جا یک بار دیگر گرفته و نزدیک‌تر داوری می‌شود',
     /ftP\.fit === false && new Date\(\)\.getTime\(\) - t0 < budget/.test(mdl) && /ft2\.fit === true \|\| ft2\.dist < ftP\.dist/.test(mdl));

  /* ردیفِ قدیمیِ صفِ کد با صاحبِ تازه بیرون می‌رود */
  const hub = getHub_();
  logSelfFinding_(hub, { priority: 'جدی', category: 'مدلِ صوتی', key: 'tts-pin-drift', title: 'مدلِ صوتیِ سنجاق‌شده دیگر مثلِ مرجعش نمی‌خوانَد',
                         detail: 'd', instruction: 'به صاحبِ برنامه برسان', owner: 'کد' });
  const st0 = loadReportRows_(hub);
  const r0 = st0.rows.find(x => /tts-pin-drift/.test(String(x.vals[RC.ID - 1])));
  logSelfFinding_(hub, { priority: 'جدی', category: 'مدلِ صوتی', key: 'tts-pin-drift', title: 'مدلِ صوتیِ سنجاق‌شده دیگر مثلِ مرجعش نمی‌خوانَد — تصمیمِ شما',
                         detail: 'd2', instruction: '', owner: 'کاربر' });
  const st1 = loadReportRows_(hub);
  const r1 = st1.rows.find(x => /tts-pin-drift/.test(String(x.vals[RC.ID - 1])));
  ok('۲.۱۷ همان ردیف (نه ردیفِ تازه) از «نیازمند تعویض کد» بیرون آمد', r0 && String(r0.vals[RC.STATUS - 1]) === RST.NEEDS_CODE &&
     r1 && String(r1.vals[RC.STATUS - 1]) !== RST.NEEDS_CODE && String(r1.vals[RC.OWNER - 1]) !== ROWNER_CODE &&
     st1.rows.filter(x => /tts-pin-drift/.test(String(x.vals[RC.ID - 1]))).length === 1,
     r1 ? String(r1.vals[RC.STATUS - 1]) + ' / ' + String(r1.vals[RC.OWNER - 1]) : 'نبود');
  logSelfFinding_(hub, { priority: 'جدی', category: 'x', key: 'tts-pin-drift', title: 't', detail: 'd3', instruction: 'کن', owner: 'کد' });
  const st2 = loadReportRows_(hub);
  const r2b = st2.rows.find(x => /tts-pin-drift/.test(String(x.vals[RC.ID - 1])));
  ok('۲.۱۸ فقط یک جهت: صاحبِ «کد» ردیفِ بیرون‌رفته را به صفِ کد برنمی‌گرداند (ورود فقط از reportRow_)',
     String(r2b.vals[RC.STATUS - 1]) !== RST.NEEDS_CODE, String(r2b.vals[RC.STATUS - 1]));
}

summary('۱۳.۷');
