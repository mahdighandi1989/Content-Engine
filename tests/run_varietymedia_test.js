/* «از همه جا» با رسانه‌های خودِ منبع (بخشِ ۳۷، ۸.۹۶).
 *
 * سنجه‌ها خودِ توابع را می‌دوانند. مهم‌ترین‌ها مرزها هستند، نه شکلِ خروجی:
 *   ۲) فایلِ منبع فقط خوانده می‌شود — هیچ نوشتن، هیچ اشتراک؛ رونوشت در **زیرپوشه**.
 *   ۳) کلیپِ منبع هرگز «ویدئوی قسمت» گرفته نمی‌شود (`ytVideoIn_`).
 *   ۱) زمان از کد، شناسهٔ ساختگی دور، بخشِ جاافتاده پر، لحظه هرگز روی موسیقی.
 */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
/* ۱۱.۰: انتشارِ «از همه جا» در یوتیوب خاموش است (YT_SHOWS_OFF)، ولی سازوکارِ ویدئویش برای کانالِ آینده سالم می‌ماند — پس
   این مجموعه همان سازوکار را با برنامهٔ روشن می‌سنجد؛ حالتِ خاموش در run_owner110_test ۲.۶. */
CFG.YT_SHOWS_OFF = [];

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 220) : ''));
};

const sents = [];
for (let i = 0; i < 20; i++) sents.push({ t: i * 5, text: 'جملهٔ شمارهٔ ' + (i + 1), sec: i < 2 ? 0 : (i < 10 ? 1 : 2) });
const items = [
  { id: 'V1', kind: 'video', fileId: 'FV1', sec: [1], topic: '', summary: '', words: 'سخنِ کلیپ اول', vibe: '' },
  { id: 'P1', kind: 'photo', fileId: 'FP1', sec: [1], topic: '', summary: '', words: '', vibe: '' },
  { id: 'V2', kind: 'video', fileId: 'FV2', sec: [2], topic: '', summary: '', words: 'سخنِ کلیپ دوم', vibe: '' },
  { id: 'P2', kind: 'photo', fileId: 'FP2', sec: [2], topic: '', summary: '', words: '', vibe: '' }
];

console.log('=== ۱) نقشهٔ مدل ⇒ صحنه‌ها: مرزها در کد ===');
{
  const raw = { placements: [
    { item: 'V1', from: '۳', clipQuote: 'سخن کلیپ اول', moment: 'بله', momentAfter: '4', ov: 'headline', ovTitle: 'نامِ گوینده' },
    { item: 'XX', from: '5' },                               // ساختگی
    { item: 'P1', from: '99' },                              // بیرون از جمله‌ها
    { item: 'V1', from: '4' },                               // همان رسانه پشتِ‌هم
    { item: 'V2', from: '12', clipQuote: 'سخن کلیپ دوم', moment: 'بله', momentAfter: '13' }
  ], cover: 'A lighthouse in a storm' };
  const music = [[63, 67]];          // لحظهٔ دوم سرِ آغازِ جملهٔ ۱۴ (ثانیهٔ ۶۵) ⇒ روی موسیقی
  const r = vmScenes_(raw, sents, items, 100, music);
  const ids = r.scenes.map(x => x.id);
  ok('۱.۱ شناسهٔ ساختگی و جملهٔ بیرون از بازه دور ریخته می‌شوند', ids.indexOf('XX') === -1 && r.dropped >= 2, JSON.stringify(ids));
  ok('۱.۲ همان رسانه پشتِ‌هم یک صحنه است', ids.filter(x => x === 'V1').length === 1, JSON.stringify(ids));
  ok('۱.۳ رسانه‌ای که مدل جا انداخت، وسطِ بلندترین صحنهٔ بخشِ خودش می‌آید — نه سرِ آغازِ صحنهٔ دیگر',
     ids.indexOf('P1') !== -1 && ids.indexOf('P2') !== -1 && r.added === 2 &&
     r.scenes.find(x => x.id === 'P1').sn > 3 && r.scenes.find(x => x.id === 'P1').sn < 12, JSON.stringify(r.scenes.map(x => [x.id, x.sn])));
  ok('۱.۴ زمان از جمله‌ها می‌آید، نه از مدل', r.scenes.find(x => x.id === 'V1').t0 === 10, JSON.stringify(r.scenes[0]));
  ok('۱.۵ صحنه‌ها به ترتیبِ زمان و شماره‌گذاریِ پیوسته',
     r.scenes.every((x, i) => x.n === i + 1 && (!i || x.t0 > r.scenes[i - 1].t0)), JSON.stringify(r.scenes.map(x => [x.n, x.t0])));
  ok('۱.۶ لحظهٔ روی موسیقی کنار می‌رود؛ لحظهٔ سالم پس از جملهٔ خودش', r.moments.length === 1 &&
     r.moments[0].id === 'V1' && r.moments[0].at === 20, JSON.stringify(r.moments));
  ok('۱.۷ نوشتهٔ برداری با نوعِ مجاز می‌ماند', r.scenes.find(x => x.id === 'V1').ov &&
     r.scenes.find(x => x.id === 'V1').ov.kind === 'headline');
  ok('۱.۸ ایدهٔ کاور می‌آید', /lighthouse/.test(r.cover));
  ok('۱.۹ عکس clipQuote نمی‌گیرد', r.scenes.filter(x => x.kind === 'photo').every(x => !x.quote));
  /* ۹.۱۹: avsync ده ثانیه از صحنه را می‌شنود؛ `say` باید گفتارِ همان بازه باشد، نه فقط تیترِ نخستش. */
  {
    const v1 = r.scenes.find(x => x.id === 'V1'), k = r.scenes.indexOf(v1);
    const end = k + 1 < r.scenes.length ? r.scenes[k + 1].t0 : 100;
    const inSpan = sents.filter(s => s.t >= v1.t0 && s.t < end).map(s => s.text);
    ok('۱.۹-ب `say`ِ صحنه از جملهٔ آغازش است و جمله‌های بعدیِ **همان** صحنه را هم دارد، نه جملهٔ صحنهٔ بعد',
       inSpan.length >= 2 && v1.say === inSpan.join(' ').slice(0, 240) && v1.say.indexOf('جملهٔ شمارهٔ 3 ') === 0,
       JSON.stringify(r.scenes.map(x => [x.t0, x.say])));
  }

  // سقفِ لحظه‌ها و فاصله‌شان
  const many = { placements: [] };
  for (let k = 0; k < 6; k++) many.placements.push({ item: k % 2 ? 'V2' : 'V1', from: String(3 + k * 3),
    clipQuote: 'سخن', moment: 'بله', momentAfter: String(3 + k * 3) });
  const sentsLong = [];
  for (let i = 0; i < 40; i++) sentsLong.push({ t: i * 12, text: 'ج' + i, sec: 1 });
  const r2 = vmScenes_(many, sentsLong, items, 480, []);
  ok('۱.۱۰ لحظه‌ها حداکثر VM_MOMENT_MAX و دست‌کم ۳۰ ثانیه از هم', r2.moments.length <= CFG.VM_MOMENT_MAX &&
     r2.moments.every((m, i) => !i || m.at - r2.moments[i - 1].at >= 30), JSON.stringify(r2.moments.map(m => m.at)));
  ok('۱.۱۱ لحظه بی clipQuote نیست', vmScenes_({ placements: [{ item: 'V1', from: '3', moment: 'بله', momentAfter: '5' }] },
     sents, items, 100, []).moments.length === 0);

  // صحنهٔ خیلی بلند با رسانهٔ دیگرِ همان بخش ⇒ نصف
  const one = { placements: [{ item: 'V1', from: '1' }] };
  const sentsS = [];
  for (let i = 0; i < 30; i++) sentsS.push({ t: i * 4, text: 'ج' + i, sec: 1 });
  const itemsS = [items[0], Object.assign({}, items[1])];
  const r3 = vmScenes_(one, sentsS, itemsS, 120, []);
  ok('۱.۱۲ صحنهٔ بلندتر از سقف با رسانهٔ دیگرِ همان بخش نصف می‌شود', r3.scenes.length >= 2 &&
     r3.scenes[1].id === 'P1', JSON.stringify(r3.scenes.map(x => [x.id, x.t0])));
}

console.log('=== ۲) منبع فقط خوانده می‌شود؛ رونوشت در زیرپوشه ===');
{
  const srcF = DriveApp.__register('SRCFOLDER', 'منبع');
  const mk = (id, name, bytes) => {
    const f = srcF.createFile(Utilities.newBlob('x'.repeat(bytes || 10), 'video/mp4', name));
    global.__FILES_BY_ID[id] = f;
    const writes = [];
    ['setSharing', 'setContent', 'setName', 'setTrashed', 'moveTo'].forEach(m => {
      const o = f[m].bind(f); f[m] = (...a) => { writes.push(m); return o(...a); };
    });
    f.__writes = writes;
    return f;
  };
  const sv = mk('FV1', 'clip.mp4'), sp = mk('FP1', 'p.jpg');
  const ep = DriveApp.__register('EPFOLD', 'قسمت ۷۲');
  const r = vmCopy_(ep, [{ id: 'V1', kind: 'video', fileId: 'FV1' }, { id: 'P1', kind: 'photo', fileId: 'FP1' }]);
  ok('۲.۱ هر دو رونوشت شدند', r.made === 2 && r.map.V1 && r.map.P1, JSON.stringify(r));
  ok('۲.۲ هیچ نوشتنی روی فایلِ منبع نیست (اشتراک، محتوا، نام، جابه‌جایی، سطل)',
     sv.__writes.length === 0 && sp.__writes.length === 0, JSON.stringify([sv.__writes, sp.__writes]));
  const sub = ep.getFoldersByName(CFG.VM_FOLDER).next();
  ok('۲.۳ رونوشت در زیرپوشه است، نه در خودِ پوشهٔ قسمت', sub.getFilesByName('کلیپ-V1').hasNext() &&
     !ep.getFiles().hasNext());
  const r2 = vmCopy_(ep, [{ id: 'V1', kind: 'video', fileId: 'FV1' }]);
  ok('۲.۴ دوباره‌اجرا رونوشتِ تکراری نمی‌سازد', r2.made === 0 && r2.map.V1 === r.map.V1);
  const kMax = CFG.VM_MAX_MB;
  mk('FBIG', 'big.mp4', 10);
  global.__FILES_BY_ID.FBIG.getSize = () => 900 * 1024 * 1024;
  const r3 = vmCopy_(ep, [{ id: 'BIG', kind: 'video', fileId: 'FBIG' }]);
  ok('۲.۵ بزرگ‌تر از سقف ⇒ کنار، با علت', !r3.map.BIG && /سقف/.test((r3.skipped[0] || {}).why), JSON.stringify(r3));
  CFG.VM_MAX_MB = kMax;
}

console.log('=== ۳) کلیپِ منبع هرگز «ویدئوی قسمت» نیست ===');
{
  const ep = DriveApp.__register('EPFOLD3', 'قسمت ۷۳');
  const srcF = DriveApp.__register('SRC3', 'منبع');
  const f = srcF.createFile(Utilities.newBlob('vv', 'video/mp4', 'x.mp4'));
  global.__FILES_BY_ID.FV9 = f;
  vmCopy_(ep, [{ id: 'V9', kind: 'video', fileId: 'FV9' }]);
  ok('۳.۱ پس از رونوشت، ytVideoIn_ هنوز ویدئویی در پوشهٔ قسمت نمی‌بیند', ytVideoIn_(ep) === null);
  /* و اگر کسی نامِ رونوشت را mp4 کند یا آن را در خودِ پوشه بگذارد، همین سنجه سرخ می‌شود: */
  const bad = ep.createFile(Utilities.newBlob('vv', 'video/mp4', 'کلیپ-V9.mp4'));
  ok('۳.۲ (شاهدِ خودِ سنجه) mp4ِ درونِ پوشهٔ قسمت همان دم ویدئوی قسمت گرفته می‌شود', ytVideoIn_(ep) === bad);
  bad.setTrashed(true);
}

console.log('=== ۴) زمانِ فصل‌ها پس از «لحظه»ها جلو می‌رود ===');
{
  const desc = 'خلاصه\n\n0:00 شروع\n1:30 بخشِ یک\n4:05 بخشِ دو\n12:40 بخشِ سه\nپایان 4:05 در متن';
  const out = vmShiftDesc_(desc, [{ at: 120, d: 10 }, { at: 400, d: 8 }]);
  ok('۴.۱ ۰:۰۰ سرِ جایش؛ پیش از لحظه دست نمی‌خورد', /\n0:00 شروع\n1:30 بخشِ یک/.test(out), out);
  ok('۴.۲ پس از لحظهٔ اول +۱۰، پس از دومی +۱۸', /\n4:15 بخشِ دو\n12:58 بخشِ سه/.test(out), out);
  ok('۴.۳ زمانی که وسطِ سطر است دست نمی‌خورد', /پایان 4:05 در متن/.test(out));
  ok('۴.۴ بی لحظه، متن عیناً همان', vmShiftDesc_(desc, []) === desc);
}

console.log('=== ۵) صف: رسانه، لحظه و بازه‌های موسیقی به رانر می‌رسند؛ اشتراک فقط روی رونوشت ===');
{
  const hub = new Spread('هاب-رسانه');
  global.__SS = { [CFG.HUB_ID || 'HUB']: hub };
  global.getHub_ = () => hub;
  const ep = DriveApp.__register('EPQ', 'قسمت ۷۴');
  const wav = ep.createFile(Utilities.newBlob('RIFF', 'audio/wav', 'a.wav'));
  const c1 = ep.createFile(Utilities.newBlob('c', 'video/mp4', 'c1'));
  const p1 = ep.createFile(Utilities.newBlob('p', 'image/jpeg', 'p1'));
  global.__FILES_BY_ID[wav.getId()] = wav; global.__FILES_BY_ID[c1.getId()] = c1; global.__FILES_BY_ID[p1.getId()] = p1;
  const asked = ytRenderAsk_({ show: 'variety', ep: '74', title: 'ت', folderId: ep.getId(), visuals: [],
    scenes: [{ n: 1, t0: 0, fileId: c1.getId(), say: 'الف', media: { kind: 'video', quote: 'سخن' } },
             { n: 2, t0: 9, fileId: p1.getId(), say: 'ب', media: { kind: 'photo', quote: '' } },
             { n: 3, t0: 20, fileId: c1.getId(), say: 'پ', media: { kind: 'video', quote: '' } }],
    media: true, moments: [{ at: 15, fileId: c1.getId(), quote: 'سخن', max: 12 }], mute: [[30, 34]],
    audio: [{ id: wav.getId(), name: 'a.wav' }], outName: 'out' });
  const row = ytRenderRead_().items.find(x => x.key === 'variety:74');
  ok('۵.۱ ردیف ساخته شد و حالتِ صحنه + رسانه دارد', asked && row && row.mode === 'scenes' && row.media === true,
     JSON.stringify(row && { mode: row.mode, media: row.media }));
  ok('۵.۲ رسانهٔ هر صحنه (نوع و تکهٔ گفتار) می‌رسد', row.scenes[0].media.kind === 'video' &&
     row.scenes[0].media.quote === 'سخن' && row.scenes[1].media.kind === 'photo', JSON.stringify(row.scenes[0]));
  ok('۵.۳ لحظه‌ها با نشانی و بازه‌های موسیقی می‌رسند', row.moments.length === 1 && /^https:/.test(row.moments[0].url) &&
     row.mute.length === 1, JSON.stringify([row.moments, row.mute]));
  ok('۵.۴ نشان و شناسهٔ کانال روی همین ردیف هم هست (مثلِ درس‌نامه)', row.mark && /^@/.test(String(row.mark.handle || '')),
     JSON.stringify(row.mark));
  ok('۵.۵ رونوشت‌ها برای رانر باز شدند — هر کدام یک بار', c1.getSharingAccess() === 'ANYONE_WITH_LINK' &&
     p1.getSharingAccess() === 'ANYONE_WITH_LINK');
  ytRenderShare_(row, false);
  ok('۵.۶ و بسته می‌شوند', c1.getSharingAccess() === 'PRIVATE' && p1.getSharingAccess() === 'PRIVATE');
}

console.log('=== ۶) سدِ انتشار: حالتِ رسانه شمارِ تأییدِ خودش را دارد ===');
{
  /* ۹.۳۷: صاحبِ برنامه سبک را تأیید کرد و `YT_MEDIA_APPROVE` صفر شد؛ سازوکارِ شمار همچنان سنجیده می‌شود، با ۲ِ همین آزمون. */
  const shippedApprove = CFG.YT_MEDIA_APPROVE;
  delete global.__PROPS[PK.YT_MEDIA_OK];
  YT_APPROVED_ = {};
  ok('۶.۰ (۹.۳۷) با تنظیمِ تحویلی، نخستین ویدئوی رسانه‌ایِ سالم عمومی می‌شود؛ سنجشِ رانرِ رد هنوز نه',
     shippedApprove === 0 && ytPublicGate_('variety:75', { mode: 'media', qa: { ok: true } }).ok &&
     !ytPublicGate_('variety:75', { mode: 'media', qa: { ok: false, why: 'قابِ خالی' } }).ok);
  CFG.YT_MEDIA_APPROVE = 2;
  global.__PROPS[PK.YT_SCENES_OK] = '9';             // درس‌نامه از سد گذشته
  delete global.__PROPS[PK.YT_MEDIA_OK];
  YT_APPROVED_ = {};
  const g1 = ytPublicGate_('variety:75', { mode: 'media', qa: { ok: true } });
  ok('۶.۱ ویدئوی رسانه‌ای نخستین ⇒ منتظرِ تأیید، حتی اگر درس‌نامه از سد گذشته', !g1.ok && g1.approval &&
     /رسانه/.test(g1.why), JSON.stringify(g1));
  YT_APPROVED_ = { 'variety:75': true };
  ok('۶.۲ کلیدِ تأییدشده ⇒ عمومی', ytPublicGate_('variety:75', { mode: 'media', qa: { ok: true } }).ok);
  YT_APPROVED_ = {};
  ok('۶.۳ سنجشِ رانر رد ⇒ نه', !ytPublicGate_('variety:76', { mode: 'media', qa: { ok: false, why: 'قابِ خالی' } }).ok);
  ytScenesOkAdd_('media'); ytScenesOkAdd_('media');
  ok('۶.۴ پس از دو انتشار، شمارِ حالتِ رسانه بالا رفته و شمارِ درس‌نامه نه',
     global.__PROPS[PK.YT_MEDIA_OK] === '2' && global.__PROPS[PK.YT_SCENES_OK] === '9');
  ok('۶.۵ و دیگر تأیید نمی‌خواهد', ytPublicGate_('variety:77', { mode: 'media', qa: { ok: true } }).ok);
  ok('۶.۶ حالتِ کاور (بی رندرِ صحنه) مثلِ قبل آزاد است', ytPublicGate_('variety:78', { mode: 'cover' }).ok);
  CFG.YT_MEDIA_APPROVE = shippedApprove;
}

console.log('=== ۷) سرتاسری: نقشه ⇒ رونوشت ⇒ کاور ⇒ صحنه‌های صف ===');
{
  const epObj = { title: 'قسمتِ آزمون', hook: 'سلام، این قسمتِ آزمون است.',
    sections: [
      { heading: 'یک', narration: 'دربارهٔ کلیپِ اول حرف می‌زنیم. این کلیپ از یک سخنرانی است. گوینده چیزِ مهمی می‌گوید.', tone: '', sourceIds: ['V1', 'P1'] },
      { heading: 'دو', narration: 'حالا عکسِ دوم را می‌بینیم. این عکس یک منظره است. و کلیپِ دوم هم هست.', tone: '', sourceIds: ['V2', 'P2'] }
    ], outro: 'خداحافظ.' };
  const metaItems = [
    { id: 'V1', kind: 'video', fileId: 'SV1aaaaaaaaaaaaaaaaaaaaaaaa', body: 'سخنِ کلیپِ اول', summary: 'سخنرانی' },
    { id: 'P1', kind: 'photo', fileId: 'SP1aaaaaaaaaaaaaaaaaaaaaaaa', body: '', summary: 'عکس' },
    { id: 'V2', kind: 'video', fileId: 'SV2aaaaaaaaaaaaaaaaaaaaaaaa', body: 'سخنِ کلیپِ دوم', summary: 'کلیپ' },
    { id: 'P2', kind: 'photo', fileId: 'SP2aaaaaaaaaaaaaaaaaaaaaaaa', body: '', summary: 'منظره' },
    { id: 'T1', kind: 'text', fileId: '', body: 'متن' }
  ];
  const srcF = DriveApp.__register('SRC7', 'منبع');
  for (const it of metaItems) if (it.fileId) {
    global.__FILES_BY_ID[it.fileId] = srcF.createFile(Utilities.newBlob('bytes', it.kind === 'video' ? 'video/mp4' : 'image/jpeg', it.id));
  }
  const ep = DriveApp.__register('EP7', 'قسمت ۷۹');
  const tc = varietyTextChunks_(epObj, '');
  const times = []; let t = 0, i = 0;
  tc.forEach((c, k) => {
    if (k && c.seg !== tc[k - 1].seg) { times.push({ i: i++, at: t, k: 'm' }); t += 4; }
    times.push({ i: i++, at: t, k: 't' }); t += Math.max(3, c.text.length / 12);
  });
  epTimesSave_(ep, times, t);
  let asks = 0;
  global.__STUB = function (url, body) {
    if (url.indexOf(':generateContent') !== -1 && /تدوین‌گرِ ویدئوی/.test(JSON.stringify(body || {}))) {
      asks++;
      return { code: 200, json: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        placements: [{ item: 'V1', from: '2', clipQuote: 'سخن کلیپ اول', moment: 'خیر' },
                     { item: 'V2', from: '6', clipQuote: 'سخن کلیپ دوم' }],
        rights: ['V1', 'P1', 'V2', 'P2'].map(x => ({ item: x, broadcast: 'نه' })),   // ۱۴.۲: «نه»ِ صریح برای هر رسانه
        cover: 'A quiet harbor at dawn' }) }] } }] } };
    }
    return { code: 200, json: { candidates: [{ content: { parts: [{ text: '{}' }] } }] } };
  };
  const kGen = CFG.VM_COVER_GEN; CFG.VM_COVER_GEN = false;     // کاور در سنجهٔ ۸ جدا
  const meta = { ep: epObj, items: metaItems, cat: '' };
  const ctx = { show: 'variety', epRaw: '79', showName: 'از همه جا' };
  let r = vmBuild_(ep, meta, {}, ctx);
  for (let k = 0; k < 4 && r.active && !r.done && !r.fallback; k++) r = vmBuild_(ep, meta, {}, ctx);
  ok('۷.۱ پس از چند دور آماده است و به مسیرِ ساده نیفتاد', r.done && !r.fallback, r.why);
  ok('۷.۲ مدل یک بار پرسیده شد (دورهای بعد از `_media.json` می‌خوانند)', asks === 1, String(asks));
  const kinds = r.items.map(x => x.media.kind);
  ok('۷.۳ کلیپ‌ها و عکس‌ها هر دو صحنه شدند (عکس‌های جاافتاده هم)', kinds.filter(k => k === 'video').length === 2 &&
     kinds.filter(k => k === 'photo').length === 2, JSON.stringify(r.items.map(x => [x.n, x.t0, x.media.kind])));
  ok('۷.۴ مورد متنی رسانه حساب نشد', r.info.items === 4, JSON.stringify(r.info));
  ok('۷.۵ بازه‌های موسیقیِ `_times.json` (هر زمانِ k:m) به صف می‌رسند', r.music.length === times.filter(x => x.k === 'm').length &&
     r.music.length >= 2, JSON.stringify(r.music));
  ok('۷.۶ fileIdِ صحنه‌ها رونوشت است، نه منبع', r.items.every(x => ['SV1aaaaaaaaaaaaaaaaaaaaaaaa', 'SP1aaaaaaaaaaaaaaaaaaaaaaaa', 'SV2aaaaaaaaaaaaaaaaaaaaaaaa', 'SP2aaaaaaaaaaaaaaaaaaaaaaaa'].indexOf(x.fileId) === -1));
  const last = JSON.parse(global.__PROPS[PK.VM_LAST]);
  ok('۷.۷ آخرین نتیجه بیرون از هاب ثبت شد', last.ok === true && last.scenes === 4 && last.clips === 2, JSON.stringify(last));
  ok('۷.۸ خطِ روزانه همان را می‌گوید', /۴ صحنه، ۲ کلیپ/.test(vmStatus_().line), vmStatus_().line);

  // بی رسانه ⇒ مسیرِ ساده با علت
  const ep2 = DriveApp.__register('EP8', 'قسمت ۸۰');
  const r2 = vmBuild_(ep2, { ep: epObj, items: [metaItems[4]], cat: '' }, {}, { show: 'variety', epRaw: '80' });
  ok('۷.۹ قسمتِ بی کلیپ و عکس ⇒ ویدئوی ساده، با علت', r2.fallback && /ندارد/.test(r2.why), r2.why);
  /* ۹.۶۰: قسمتِ ۷۷ (۱۹ اکتبر) فقط صدا داشت و یافتهٔ «جدی»ِ vm-fallback ساخت — برای چیزی که هیچ کدی عوضش نمی‌کند. */
  ok('۷.۱۰ قسمتِ بی رسانهٔ تصویری: خطِ روزانه علت را می‌گوید ولی ❌ و «ناسالم» نیست',
     !/❌/.test(vmStatus_().line) && /نداشت/.test(vmStatus_().line) && vmStatus_().ok === true && vmStatus_().none === true,
     vmStatus_().line);
  const pr0 = [], nt0 = [];
  vmHealth_(pr0, nt0);
  ok('۷.۱۰-ب و سلامتِ روزانه: خط در یادداشت‌ها، بی مسئله و بی یافته', nt0.some(x => /🎞/.test(x)) && !pr0.some(x => /🎞/.test(x)),
     JSON.stringify([pr0, nt0]));
  vmNote_('variety:81', { ok: false, why: 'زمانِ تکه‌ها با متنِ گفتار جور نشد' });   // افتادنِ واقعی
  ok('۷.۱۰-پ افتادنِ واقعی همچنان ❌ با علت', /❌/.test(vmStatus_().line) && /جور نشد/.test(vmStatus_().line) && vmStatus_().ok === false);
  const pr = [], nt = [];
  vmHealth_(pr, nt);
  ok('۷.۱۱ سلامتِ روزانه: خط در یادداشت‌ها و افتادن در مسئله‌ها', nt.some(x => /🎞/.test(x)) && pr.some(x => /🎞/.test(x)),
     JSON.stringify([pr, nt]));
  ok('۷.۱۲ نمایشِ درس‌نامه از این راه نمی‌رود', vmBuild_(ep2, meta, {}, { show: 'special', epRaw: '1' }).active === false);
  CFG.VM_COVER_GEN = kGen;
}

console.log('=== ۹) شکلِ **واقعیِ** ذخیره‌شده (قسمتِ ۷۲، ۱۴ اکتبر) ===');
{
  /* `_episode.json`ِ واقعی: kind فارسی، بی fileId، شناسهٔ مورد همان شناسهٔ فایل. نگارشِ اولِ این بخش
     video/photo و fileId فرض کرده بود و هر قسمت «کلیپ یا عکس ندارد» می‌خورد — سنجه‌ها سبز بودند چون
     شکلِ آسان را می‌ساختند. */
  const real = { ep: { sections: [{ sourceIds: ['16lZYiiEihQv1jnqAoz8_76PdYCSTrM7w', '1UEooNK26td9H1Yn-6utSBg4Hfnig3yrz'] }] },
    items: [
      { id: '16lZYiiEihQv1jnqAoz8_76PdYCSTrM7w', kind: 'ویدیو', link: 'https://drive.google.com/file/d/16lZYiiEihQv1jnqAoz8_76PdYCSTrM7w/view', body: 'گفتار', summary: 'خلاصه' },
      { id: '1UEooNK26td9H1Yn-6utSBg4Hfnig3yrz', kind: 'عکس', link: 'https://drive.google.com/file/d/1UEooNK26td9H1Yn-6utSBg4Hfnig3yrz/view' },
      { id: '1jCbZ_NIqfCt4rUQEXe3u81GeYpFkNV6l', kind: 'صدا', link: 'https://drive.google.com/file/d/1jCbZ_NIqfCt4rUQEXe3u81GeYpFkNV6l/view' },
      { id: 'row-12', kind: 'ویدیو', link: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123/view' }
    ] };
  const its = vmItems_(real);
  ok('۹.۱ «ویدیو» و «عکس» رسانه‌اند؛ «صدا» نه', its.length === 3 && its.filter(x => x.kind === 'video').length === 2 &&
     its.filter(x => x.kind === 'photo').length === 1, JSON.stringify(its.map(x => [x.kind, x.fileId])));
  ok('۹.۲ شناسهٔ فایل از خودِ شناسه یا از link — و بخشِ منبع درست', its[0].fileId === '16lZYiiEihQv1jnqAoz8_76PdYCSTrM7w' &&
     its[0].sec[0] === 1 && its[2].fileId === '1AbCdEfGhIjKlMnOpQrStUvWxYz0123');

  /* تکه‌ای که افکت نصفش کرد: ۳ تکهٔ متن، ۴ زمانِ گفتار، و ۱۲ ثانیه صدا وسطِ تکهٔ دوم (همان شکلِ قسمتِ ۷۲). */
  const tc = [{ text: 'الف '.repeat(60), seg: 0, secIndex: -1 }, { text: 'ب '.repeat(400), seg: 1, secIndex: 0 },
              { text: 'پ '.repeat(120), seg: 1, secIndex: 0 }];
  const T = [{ i: 0, at: 0, k: 'm' }, { i: 1, at: 5, k: 't' }, { i: 2, at: 22, k: 'm' }, { i: 3, at: 30, k: 't' },
             { i: 4, at: 45, k: 'm' }, { i: 5, at: 57, k: 't' }, { i: 6, at: 105, k: 't' }];
  ok('۹.۳ هم‌ترازیِ شمار‌به‌شمار این را نمی‌خوانَد (شاهدِ خودِ سنجه)', !lvAlignTimes_(tc, T, 125).map);
  const sp = vmAlignSplit_(tc, T, 125);
  ok('۹.۴ هم‌ترازیِ نیم‌شده: تکهٔ دوم روی دو زمانِ گفتار، دو سوی آن ۱۲ ثانیه', sp && sp.length === 4 &&
     sp[1].at === 30 && sp[1].end === 45 && sp[2].at === 57 && sp[3].at === 105,
     JSON.stringify(sp && sp.map(x => [x.at, x.end, x.text.length])));
  ok('۹.۵ پاره‌ها سرِ فاصله بریده شدند و چیزی از متن گم نشد', sp && sp[1].text.replace(/ /g, '').length +
     sp[2].text.replace(/ /g, '').length === 400 && !/^\S*ب\S+ب/.test(sp[2].text.slice(0, 1)));
}

console.log('=== ۱۰) نمونهٔ یک‌باره روی قسمتِ منتشرشده (۸.۹۷) ===');
{
  const keep = {};
  for (const f of ['ytEpisodeMeta_', 'ytAudioParts_', 'ytSecondsOf_', 'ytPlan_', 'vmBuild_', 'ytRenderMapCached_', 'tgEnabled_', 'tgApi_'])
    keep[f] = global[f];
  const ep = DriveApp.__register('EPS', 'قسمت ۷۲');
  const wav = ep.createFile(Utilities.newBlob('RIFF', 'audio/wav', 'a — کامل.wav'));
  global.__FILES_BY_ID[wav.getId()] = wav;
  const kSample = CFG.VM_SAMPLE;
  CFG.VM_SAMPLE = { ep: '72', folderId: 'EPS' };
  delete global.__PROPS[PK.VM_SAMPLE];
  let built = 0, tg = [];
  global.ytEpisodeMeta_ = () => ({ ep: { title: 'هجو', sections: [] }, items: [], cat: 'طنز' });
  global.ytAudioParts_ = () => ({ parts: [wav], kind: 'کامل', why: '' });
  global.ytSecondsOf_ = () => 600;
  global.ytPlan_ = () => ({ coverTitle: 'هجوِ خطوطِ قرمز', coverKicker: 'از همه جا' });
  global.vmBuild_ = (f, m, p, c) => { built++; return { active: true, done: true, fallback: false,
    items: [{ n: 1, t0: 0, fileId: wav.getId(), media: { kind: 'video', quote: '' } }], cover: null, moments: [], music: [], info: { media: true },
    ctxKey: c.show + ':' + c.epRaw }; };
  global.ytRenderMapCached_ = () => ({});
  global.tgEnabled_ = () => true; global.tgApi_ = (m, b) => { tg.push(b.text); return {}; };
  const due0 = JSON.stringify(ytDueList_());
  const r1 = vmSampleTick_();
  const row = ytRenderRead_().items.find(x => x.key === 'variety:72-نمونه');
  ok('۱۰.۱ درخواستِ رندر با کلیدِ جدا و حالتِ رسانه گذاشته شد', r1 && r1.asked && row && row.media === true &&
     row.mode === 'scenes', JSON.stringify(r1));
  ok('۱۰.۲ فهرستِ انتشارِ یوتیوب دست نخورد — نمونه هرگز منتشر نمی‌شود', JSON.stringify(ytDueList_()) === due0);
  ok('۱۰.۳ دورِ بعد (هنوز ساخته نشده) دوباره نمی‌سازد', vmSampleTick_() === null && built === 1);
  global.ytRenderMapCached_ = () => ({ 'variety:72-نمونه': { url: 'https://x/variety-72-.mp4', thumb: 'https://x/c.jpg',
    mode: 'media', scenes: 9, media: { clips: 6, photos: 3 }, inserts: [{ at: 100, d: 8 }], qa: { ok: true } } });
  const r2 = vmSampleTick_();
  ok('۱۰.۴ ساخته شد ⇒ نشانی به تلگرام و ردیف «رسید»', r2 && r2.told && tg.length === 1 && /variety-72-\.mp4/.test(tg[0]) &&
     ytRenderRead_().items.find(x => x.key === 'variety:72-نمونه').status === 'رسید', tg[0]);
  ok('۱۰.۵ و یک بار — نه هر ساعت', vmSampleTick_() === null && tg.length === 1);
  CFG.VM_SAMPLE = { ep: '72', folderId: 'EPS', rev: 2 };
  const r3 = vmSampleTick_();
  const row3 = ytRenderRead_().items.find(x => x.key === 'variety:72-2-نمونه');
  ok('۱۰.۹ نمونهٔ دوم (rev) با کلیدِ تازه دوباره ساخته می‌شود، و برداشت هنوز ردش می‌کند (پایانِ «-نمونه»)',
     r3 && r3.asked && built === 2 && row3 && row3.media === true && /-نمونه$/.test(row3.key) &&
     ytRenderRead_().items.find(x => x.key === 'variety:72-نمونه').status === 'رسید', JSON.stringify(r3));
  CFG.VM_SAMPLE = null;
  ok('۱۰.۶ تنظیمِ خالی ⇒ هیچ', vmSampleTick_() === null);
  CFG.VM_SAMPLE = kSample;
  for (const f in keep) global[f] = keep[f];
  const vb = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
  const y27 = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۱۰.۸ برداشتِ ویدئوها ردیفِ نمونه را برنمی‌دارد (mp4ِ دوم در پوشهٔ قسمتِ منتشرشده نمی‌نشیند)',
     /if \(\/-نمونه\$\/\.test\(String\(pend\[i\]\.key \|\| ''\)\)\) continue;\s*\n\s*var rec = ytRenderBuilt_/.test(y27));
  ok('۱۰.۷ درِ ساعتی صدایش می‌زند', /try \{ vmSampleTick_\(\); \}/.test(vb));
}

console.log('=== ۱۱) آغازِ ویدئو: کاورِ کوتاه و پیش‌نمایش از رسانه‌های خودِ قسمت (۸.۹۸) ===');
{
  /* نمونهٔ واقعیِ قسمتِ ۷۲: نخستین رسانه سرِ ۵۹٫۷ و تمامِ آن یک دقیقه فقط کاور ماند. */
  const R = [
    { t0: 59.7, fileId: 'A', media: { kind: 'video', quote: 'x' } },
    { t0: 174.6, fileId: 'B', media: { kind: 'video', quote: 'y' } },
    { t0: 309.9, fileId: 'C', media: { kind: 'photo', quote: '' } },
    { t0: 335.8, fileId: 'A', media: { kind: 'video', quote: '' } },
    { t0: 396.8, fileId: 'D', media: { kind: 'video', quote: '' } }];
  const L = vmLead_(R, 'COV');
  ok('۱۱.۱ کاور از صفر، و حداکثر VM_INTRO_SEC', L[0].fileId === 'COV' && L[0].t0 === 0 && L[0].media.intro &&
     L[1].t0 === CFG.VM_INTRO_SEC, JSON.stringify(L.slice(0, 2)));
  const T = L.slice(1);
  ok('۱۱.۲ باقیِ پیش از نخستین رسانه پیش‌نمایش است، هر کدام از رسانه‌های همین قسمت و نشان‌دار',
     T.length >= 4 && T.every(x => x.media.teaser && x.media.quote === '' && 'ABCD'.indexOf(x.fileId) !== -1) &&
     T[T.length - 1].t0 < 59.7, JSON.stringify(T));
  ok('۱۱.۳ هر رسانه یک بار در پیش‌نمایش (A دو بار در قسمت است)', new Set(T.map(x => x.fileId)).size === T.length);
  ok('۱۱.۴ هیچ صحنهٔ پیش‌نمایش کوتاه‌تر از VM_TEASER_SEC نیست',
     T.every((x, i) => ((i + 1 < T.length ? T[i + 1].t0 : 59.7) - x.t0) >= CFG.VM_TEASER_SEC - 0.05));
  ok('۱۱.۵ فاصلهٔ کوتاه ⇒ فقط کاور', JSON.stringify(vmLead_([{ t0: 12, fileId: 'A', media: { kind: 'video' } }], 'COV').map(x => x.fileId)) === '["COV"]');
  ok('۱۱.۶ آغازِ زودهنگام ⇒ هیچ', vmLead_([{ t0: 3, fileId: 'A', media: { kind: 'video' } }], 'COV').length === 0);
  ok('۱۱.۷ بی کاور هم پیش‌نمایش از صفر', (function () { const z = vmLead_(R, ''); return z[0].t0 === 0 && z[0].media.teaser; })());
  /* ۹.۱۴: «طولِ تیزر به همان اندازهٔ توضیحاتِ ابتدایی» — نخستین رسانه سرِ پایانِ hook، نه چند جمله بعد. */
  const R2 = R.map(x => Object.assign({}, x, { media: Object.assign({}, x.media) }));
  const L2 = vmLead_(R2, 'COV', 24.3);
  const T2 = L2.filter(x => x.media.teaser);
  ok('۱۱.۷-ب پیش‌نمایش سرِ پایانِ آغاز (۲۴٫۳) می‌ایستد و نخستین رسانه از همان‌جا می‌آید، نه از ۵۹٫۷',
     R2[0].t0 === 24.3 && T2.length >= 1 && T2.every(x => x.t0 < 24.3) && T2.length <= 2, JSON.stringify(L2.map(x => [x.t0, x.fileId])));
  ok('۱۱.۷-پ hook بلندتر از نخستین رسانه ⇒ دست نمی‌خورد', (function () { const R3 = [{ t0: 20, fileId: 'A', media: { kind: 'video' } }]; vmLead_(R3, 'COV', 40); return R3[0].t0 === 20; })());
  const vsrc15 = fs.readFileSync('src/37_VarietyMedia.gs', 'utf8');
  ok('۱۱.۷-ت پایانِ hook در نقشه ثبت و به vmLead_ داده می‌شود', /hookEnd: \(function \(\)/.test(vsrc15) && /vmLead_\(ready, d\.cover && d\.cover\.fileId, Number\(d\.hookEnd\) \|\| 0\)/.test(vsrc15));
  const sk = fs.readFileSync('tools/scenekit.js', 'utf8'), rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۱۱.۸ scenekit نشانِ teaser را نگه می‌دارد و رانر کلیپِ پیش‌نمایش را از میانه می‌بُرد',
     /teaser: !!v\.teaser/.test(sk) && /s\.media && s\.media\.teaser\) \{[\s\S]{0,200}g\.info\.dur \* 0\.45/.test(rj));
  ok('۱۱.۹ vmBuild_ آغاز را از vmLead_ می‌گیرد', /var lead = vmLead_\(ready, d\.cover && d\.cover\.fileId, Number\(d\.hookEnd\) \|\| 0\);/.test(fs.readFileSync('src/37_VarietyMedia.gs', 'utf8')));
}

console.log('=== ۸) سیم‌کشی: هر دو در و یک تعریف ===');
{
  const y = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const up = y.slice(y.indexOf('function ytUploadOne_'), y.indexOf('function ytUploadOne_') + 60000);
  ok('۸.۱ ytUploadOne_ پیش از صحنه‌های درس‌نامه vmBuild_ را صدا می‌زند',
     up.indexOf('vmBuild_(folder, meta, plan, ctx)') !== -1 &&
     up.indexOf('vmBuild_(folder, meta, plan, ctx)') < up.indexOf('lvScenesBuild_(folder, meta, plan, ctx)'));
  ok('۸.۲ هر دو درِ انتشار متنِ توضیح را از ytDescFinal_ می‌گیرند',
     /* ۱۱.۶: درِ بازسازی از `descOut` می‌گذرد (متنِ موتور، مگر توضیحِ ویرایش‌شدهٔ Studio که دست نمی‌خورد) */
     /var desc = ytDescFinal_\(/.test(y) && /var descOut = ytDescFinal_\(/.test(y) && /description: descOut,/.test(y));
  const h = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۸.۳ سلامتِ روزانه vmHealth_ را جدا از lvHealth_ صدا می‌زند', /vmHealth_\(problems, notes\)/.test(h));
  ok('۸.۴ و _STATUS کلیدِ varietyMedia دارد', /varietyMedia: \(function \(\) \{ try \{ return vmStatus_\(\)/.test(h));
}

console.log('=== ۱۲) نمونهٔ چهارم، همان عددها (۹.۰۱): کلیپ زیرِ موسیقیِ پایانی، صحنهٔ ۱۱۵ ثانیه‌ای، رسانهٔ تکراری ===');
{
  /* صحنه‌ها و موسیقیِ واقعیِ `_media.json`ِ variety:72-4 (۱۴ اکتبر). */
  const T = [59.7, 174.6, 309.9, 335.8, 374.9, 396.8, 438.6, 460.9, 488.4, 522.6, 544.8, 604.1];
  const ready = T.map((t, i) => ({ n: i + 1, t0: t, fileId: 'F' + i, caption: '', say: '', media: { kind: i % 3 ? 'video' : 'photo', quote: '' } }));
  const music = [[0, 18], [47.8, 57], [76.4, 88.4], [286.3, 298.3], [470.4, 478.9], [626.9, 656]];
  const sl = []; for (let t = 1; t < 656; t += 6.5) sl.push([Math.round(t * 10) / 10, 'جملهٔ گوینده در ثانیهٔ ' + Math.round(t) + ' دَربارهٔ همین ماجرا']);
  const r = vmCards_(ready, sl, music, 655.98, 'COVER');
  const sc = r.scenes;
  const at = t => sc.filter(x => x.t0 <= t).pop();
  ok('۱۲.۱ سرِ موسیقیِ پایانی (۶۲۶٫۹) کاور است، نه کلیپِ صحنهٔ ۱۲', at(640).fileId === 'COVER' && at(640).media.outro, JSON.stringify(at(640)));
  const ci = sc.findIndex(x => x.media.card && x.t0 > 70 && x.t0 < 165);
  ok('۱۲.۲ صحنهٔ ۱۱۵ ثانیه‌ای (۵۹٫۷ → ۱۷۴٫۶): کارتِ نوشته در میانه، **کوتاه**، و بعد همان کلیپ ادامه می‌یابد (۹.۰۳)',
     ci > 0 && sc[ci].ov && sc[ci].ov.kind === 'points' && sc[ci].ov.lines.length >= 1 && sc[ci].ov.lines.length <= 3 &&
     sc[ci].ov.lines.every(l => l.length <= 60) &&
     sc[ci + 1].fileId === sc[ci - 1].fileId && sc[ci + 1].media.cont === true &&
     sc[ci + 1].t0 - sc[ci].t0 >= 8 && sc[ci + 1].t0 - sc[ci].t0 <= 16,
     ci > 0 ? JSON.stringify([sc[ci - 1].t0, sc[ci].t0, sc[ci + 1] && sc[ci + 1].t0, sc[ci + 1] && sc[ci + 1].media]) : 'کارت نبود');
  const coverSec = sc.reduce((a, x, i) => a + (x.fileId === 'COVER' && !x.media.outro ? (i + 1 < sc.length ? sc[i + 1].t0 : 655.98) - x.t0 : 0), 0);
  ok('۱۲.۲-ب کاور (جز پایان) روی‌هم کمتر از ۱۵٪ِ زمان — نمونهٔ پنجم بیش از ۴۰٪ بود', coverSec < 0.15 * 655.98, coverSec.toFixed(0) + ' ثانیه');
  const lens = sc.map((x, i) => [x, (i + 1 < sc.length ? sc[i + 1].t0 : 655.98) - x.t0]);
  ok('۱۲.۳ هیچ صحنه‌ای از ۴۵ ثانیه بلندتر نماند', lens.every(([x, d]) => d <= 28 * 1.6 + 0.01),
     lens.filter(([x, d]) => d > 44.8).map(([x, d]) => x.t0 + ':' + d.toFixed(0)).join(','));
  ok('۱۲.۴ پلِ موسیقیِ میانه (۲۸۶٫۳) کاور نمی‌گیرد — کلیپِ همان بخش زیرِ موسیقی می‌ماند (۹.۰۳)', at(290).fileId !== 'COVER', JSON.stringify(at(290)));
  ok('۱۲.۵ نوشتهٔ کارت بی اعراب است (برای چشم، نه گوش)', sc.filter(x => x.ov && x.media.card).every(x => !/[\u064B-\u0652]/.test(x.ov.title + x.ov.lines.join(''))));
  /* ۹.۰۴: تیترِ کارت = تیترِ همان ماجرا (ovِ صحنه‌ای که نصف شد)؛ جملهٔ بلند در سه پاره، پاره‌ها به ترتیبِ جمله. */
  const rdy2 = ready.map(x => Object.assign({}, x, x.t0 === 59.7 ? { ov: { kind: 'headline', title: 'طنز خط ۱۱۳ و پرونده‌سازی', lines: [] } } : {}));
  const sl2 = sl.map(z => [z[0], 'دَر آغازِ مَسیر با یِک ویدیویِ طَنز روبِه‌رو می‌شَویم کِه بِه هَجوِ سازوکارِ گُزارِش‌دِهیِ اَمنیَّتی وُ پَروَندِه‌سازی پَرداختِه اَست']);
  const c2 = vmCards_(rdy2, sl2, music, 655.98, 'COVER').scenes.filter(x => x.media.card && x.t0 > 70 && x.t0 < 165)[0];
  ok('۱۲.۵-ب کارت: تیترِ همان ماجرا + سه پارهٔ پیاپی از جملهٔ گوینده', c2 && c2.ov.title === 'طنز خط ۱۱۳ و پرونده‌سازی' &&
     c2.ov.lines.length === 3 && c2.ov.lines[0].indexOf('در آغاز') === 0, JSON.stringify(c2 && c2.ov));
  ok('۱۲.۶ شماره‌ها پیاپی و ترتیب زمانی', sc.every((x, i) => x.n === i + 1 && (i === 0 || sc[i - 1].t0 <= x.t0)));
  ok('۱۲.۷ بی کاور ⇒ دست‌نخورده', vmCards_(ready, sl, music, 655.98, '').scenes.length === ready.length);
  ok('۱۲.۸ جمله‌ای نیست ⇒ حلقه بی‌پایان نمی‌شود و صحنه می‌ماند', vmCards_(ready, [], music, 655.98, 'COVER').scenes.length > ready.length);
  /* بلندترین صحنه با رسانهٔ دیده‌شده نصف نمی‌شود — همان «دیده‌شده بارها باز می‌آید». */
  const its = [{ id: 'A', kind: 'video', fileId: 'FA', sec: [1] }, { id: 'B', kind: 'photo', fileId: 'FB', sec: [1] }];
  const ss = []; for (let i = 0; i < 40; i++) ss.push({ t: i * 5, text: 'ج' + i, sec: 1 });
  const vs = vmScenes_({ placements: [{ item: 'B', from: '1' }, { item: 'A', from: '3' }, { item: 'B', from: '30' }] }, ss, its, 200, []);
  ok('۱۲.۹ صحنهٔ بلند با رسانه‌ای که قبلاً دیده شده نصف نمی‌شود', vs.scenes.filter(x => x.id === 'A').length === 1 &&
     vs.scenes.filter(x => x.id === 'B').length <= 2, JSON.stringify(vs.scenes.map(x => x.id + '@' + x.t0)));
  const e = fs.readFileSync('src/37_VarietyMedia.gs', 'utf8');
  ok('۱۲.۱۰ vmBuild_ کارت‌ها را بعد از آغاز می‌چیند', /var cards = vmCards_\(ready, d\.sents \|\| \[\], d\.music \|\| \[\], Number\(d\.secs\) \|\| 0, d\.cover && d\.cover\.fileId\);/.test(e) &&
     /sents: sents\.map\(function \(z\)/.test(e));
  ok('۱۲.۱۱ لحظه‌ها: سقفِ ۸ و ۴۵ ثانیه، کلیپِ تا ۶۰ ثانیه کامل (۹.۱۱)', CFG.VM_MOMENT_MAX === 8 && CFG.VM_MOMENT_SEC === 45 && CFG.VM_MOMENT_WHOLE === 60 && CFG.VM_MOMENT_GAP === 20);
}

console.log('=== ۱۳) پس‌گرفتنِ اشتراک صوتِ ردیفِ در انتظار را نمی‌بندد (۹.۰۲) ===');
{
  /* رانرِ ۲۳:۲۳ (۱۴ اکتبر): «variety:72-5-نمونه — بخشِ 1 واقعاً WAV نیست (921458 بایت)». ردیف‌های ۷۲-۲ تا ۷۲-۵ یک صوت
     دارند؛ ردیفِ «رسید»ِ ۷۲-۴ پس گرفته شد و صوتِ ۷۲-۵ هم بسته شد. */
  const now = nowStr_();
  const d = { items: [
    { key: 'variety:72-4-نمونه', status: 'رسید', shared: true, sharedAt: now, audio: [{ id: 'AUD' }], scenes: [{ fileId: 'C4' }] },
    { key: 'variety:72-5-نمونه', status: 'در انتظار', shared: true, sharedAt: now, audio: [{ id: 'AUD' }], scenes: [{ fileId: 'C5' }] }
  ] };
  const keepRead = global.ytRenderRead_, keepSave = global.ytRenderSave_, kOn = global.ytShareOn_, kOff = global.ytShareOff_;
  const off = [], on = [];
  global.ytRenderRead_ = () => d; global.ytRenderSave_ = () => {};
  global.ytShareOff_ = id => { off.push(id); return true; }; global.ytShareOn_ = id => { on.push(id); return true; };
  try {
    ytShareSweep_();
    ok('۱۳.۱ صوتِ مشترک بسته نشد، فقط فایلِ خودِ ردیفِ رسیده', off.indexOf('AUD') === -1 && off.indexOf('C4') !== -1, JSON.stringify(off));
    ok('۱۳.۲ ردیفِ در انتظار دست نخورد', d.items[1].shared === true && off.indexOf('C5') === -1);
    d.items[1].status = 'رسید'; off.length = 0;
    ytShareSweep_();
    ok('۱۳.۳ وقتی دیگر کسی لازمش ندارد، بسته می‌شود', off.indexOf('AUD') !== -1 && off.indexOf('C5') !== -1, JSON.stringify(off));
  } finally {
    global.ytRenderRead_ = keepRead; global.ytRenderSave_ = keepSave; global.ytShareOn_ = kOn; global.ytShareOff_ = kOff;
  }
  const e = fs.readFileSync('src/37_VarietyMedia.gs', 'utf8');
  ok('۱۳.۴ نمونهٔ منتظر هر ساعت اشتراکِ ردیفِ خودش را دوباره برقرار می‌کند', /if \(rowW && String\(rowW\.status \|\| ''\) === 'در انتظار'\) ytRenderShare_\(rowW, true\);/.test(e) &&
     /ytRenderShare_\(row0, false, ytShareKeep_\(ytRenderRead_\(\), key\)\)/.test(e));
}

console.log('=== ۱۴) هر پرچمی که رانر می‌خوانَد از صف می‌گذرد (۹.۰۳) ===');
{
  /* نمونهٔ پنجم: ytRenderAsk_ فقط intro را رد می‌کرد؛ card و teaser دور ریخته شدند و کاورِ خام به‌جای کارت آمد. */
  const sk = fs.readFileSync('tools/scenekit.js', 'utf8');
  const m = /function mediaOf\(v\) \{[\s\S]*?return \{([\s\S]*?)\};/.exec(sk);
  const runnerFlags = m ? (m[1].match(/(\w+): !!v\.\w+/g) || []).map(x => x.split(':')[0]).sort() : [];
  ok('۱۴.۱ YT_MEDIA_FLAGS همان پرچم‌های mediaOf است', runnerFlags.length >= 5 && JSON.stringify(runnerFlags) === JSON.stringify(YT_MEDIA_FLAGS.slice().sort()),
     JSON.stringify(runnerFlags) + ' / ' + JSON.stringify(YT_MEDIA_FLAGS));
  const keepR = global.ytRenderRead_, keepS = global.ytRenderSave_, keepSh = global.ytRenderShare_, keepM = global.ytRenderMapCached_;
  let saved = null;
  global.ytRenderRead_ = () => ({ items: [] }); global.ytRenderSave_ = d => { saved = d; }; global.ytRenderShare_ = () => 1;
  global.ytRenderMapCached_ = () => ({});
  try {
    ytRenderAsk_({ show: 'variety', ep: '99', title: 't', folderId: 'F', media: true, moments: [], mute: [],
      scenes: [{ n: 1, t0: 0, fileId: 'A', media: { kind: 'photo', quote: '', card: true } },
               { n: 2, t0: 9, fileId: 'B', media: { kind: 'video', quote: '', teaser: true } },
               { n: 3, t0: 20, fileId: 'C', media: { kind: 'video', quote: '', cont: true } },
               { n: 4, t0: 40, fileId: 'D', media: { kind: 'photo', quote: '', outro: true } }],
      audio: [{ id: 'AU', name: 'a' }] });
    const rs = ((saved && saved.items[0]) || {}).scenes || [];
    ok('۱۴.۲ ردیفِ صف card/teaser/cont/outro را دارد', rs.length === 4 && rs[0].media.card && rs[1].media.teaser && rs[2].media.cont && rs[3].media.outro,
       JSON.stringify(rs.map(x => x.media)));
  } finally { global.ytRenderRead_ = keepR; global.ytRenderSave_ = keepS; global.ytRenderShare_ = keepSh; global.ytRenderMapCached_ = keepM; }
  const rj = fs.readFileSync('tools/render.js', 'utf8');
  ok('۱۴.۴ کارت روی تصویرِ محوِ همان رسانه‌ای که پیشش بود، نه کاور (۹.۰۴)',
     /const prevImg = isCard && i > 0 \? imgs\[String\(scenes\[i - 1\]\.n\)\] : '';/.test(rj) &&
     /(?:const|let) srcImg = prevImg && fs\.existsSync\(prevImg\) \? prevImg : g\.file;/.test(rj) &&   // ۱۰.۸: let — پس از عکس یا زمینهٔ یکدست، خودِ عکس
    
     /MKIT\.photoClip\(FF, srcImg, out \+ '\.mp4', want, \{ layout: layOf\[s\.n\], card: isCard \}\)/.test(rj));
  ok('۱۴.۳ رانر صحنهٔ cont را از جایی که صحنهٔ پیشینِ همان کلیپ ایستاد ادامه می‌دهد',
     /const cont = !!\(s\.media && s\.media\.cont\) && usedTo\[s\.url\] !== undefined;/.test(rj) &&
     /usedTo\[s\.url\] = Math\.max\(usedTo\[s\.url\] \|\| 0, from \+ \(c\.played \|\| c\.len\)/.test(rj));   // ۹.۱۰: «ادامه» از آنچه واقعاً پخش شد، نه از طولِ صحنهٔ پُرشده
}

console.log('\n=== ۱۵) «دو بار شنیده می‌شود»: لحظه جای بازگوییِ دیالوگ (۹.۱۴، نمونهٔ سومِ ۷۳) ===');
{
  /* جمله‌های واقعیِ بخشِ اولِ قسمتِ ۷۳ (متنِ صوتی، بی اعراب) و گفتارِ کلیپ به همان شکلی که در شیتِ تحلیل است. */
  const hook = 'از همه جا از همه رنگ، برنامهٔ روزانهٔ آرشیو! سلام! امروز پنجشنبه است. تصور کنید یک دعوای خانوادگی به ارتباط زنده تلویزیونی تبدیل شود!';
  const sec1 = 'دعوای خانوادگی با آداب پخش زنده. ماجرا از یک خانه شروع می‌شود؛ جایی که زن و شوهر هر دو خبرنگارند. میان فریادها، ناگهان دست روی گوش می‌رود، انگار ارتباط استودیویی برقرار شده است. زن داد می‌زند: بدبخت! تو هر چی داری صدقه سر من و خانواده‌مه! مرد گوشش را می‌گیرد و با لحن رسمی می‌گوید: بله. جمع کن خودتو بابا، مگه چیکار کردید برای من؟ زن دوباره ژست می‌گیرد: بله! من اگه تو رو جمعت نمی‌کردم، کسی تو رو آدم حساب می‌کرد؟ بچه خوشگل! معطل اون بابای معتادت! مرد باز هم بی‌اختیار می‌گوید: بله! کثافت آشغال، صد دفعه بهت گفتم اسم بابای منو... و در نهایت یک صندلی پرتاب می‌شود. این حرکت بدنی و لمس مداوم هندزفری دقیقاً همان تصویری است که باید دید.';
  const sec2 = 'نشست خبری حل بحران با دست خالی. وقتی زبان اداری از زندگی خصوصی فراتر می‌رود، به پشت تریبون سخنگو می‌رسد. سخنگو پشت میز می‌نشیند و اعلام می‌کند در خدمت خبرنگاران محترم هستم.';
  const body = 'بدبخت تو هرچی داری صدقه سر من و خانوادمه. بله. جمع کن خودتو بابا مگه چیکار کردید برای من. بله. من اگه تو رو جمعت نمی‌کردم کسی تو رو آدم حساب می‌کرد بچه خوشگل معطل اون بابای معتادت. بله. کثافت آشغال صد دفعه بهت گفتم اسم بابای منو';
  const sents = []; let t = 0;
  for (const [txt, sec] of [[hook, 0], [sec1, 1], [sec2, 2]]) for (const x of speakSentSplit_(txt)) { sents.push({ t: Math.round(t * 10) / 10, text: x, sec: sec }); t += x.length / 14; }
  const total = Math.round(t);
  const rs = vmReciteSpan_(sents, 10, body, total);
  ok('۱۵.۱ بازگوییِ دیالوگ پیدا می‌شود: از «زن داد می‌زند: بدبخت!» تا «… اسم بابای منو»، نه معرفیِ پیش و نه «صندلی پرتاب می‌شود»',
     rs && /بدبخت/.test(sents[rs.a].text) && /بابای منو/.test(sents[rs.b].text) && rs.cut > 15, JSON.stringify(rs));
  ok('۱۵.۲ جملهٔ صحنه‌آرایی میانِ دیالوگ («زن دوباره ژست می‌گیرد: بله!») جزوِ همان بازه است',
     rs && sents.findIndex(x => /دوباره ژست/.test(x.text)) > rs.a && sents.findIndex(x => /دوباره ژست/.test(x.text)) < rs.b);
  ok('۱۵.۳ لحظه‌ای که کنارِ بازگویی نیست (معرفیِ ماجرا) بازه نمی‌گیرد', vmReciteSpan_(sents, 5, body, total) === null);
  ok('۱۵.۴ گفتارِ کلیپِ دیگر (بی ربط) هیچ بازه‌ای نمی‌دهد',
     vmReciteSpan_(sents, 10, 'آتش سوزی جنگل مردم محلی با بیل و کلنگ بروند کمک لباس گرم بپوشن', total) === null);
  ok('۱۵.۵ بازه هرگز از بخشِ خودش بیرون نمی‌رود', rs && sents[rs.a].sec === 1 && sents[rs.b].sec === 1);
  /* از پاسخِ مدل تا لحظه: momentAfter = «مرد گوشش را می‌گیرد …: بله.» */
  const nAfter = sents.findIndex(x => /گوشش را/.test(x.text)) + 1;
  const items = [{ id: 'C1', kind: 'video', fileId: 'F'.repeat(25), sec: [1], topic: 'دعوا', summary: '', words: body.slice(0, 900), allWords: body },
                 { id: 'C2', kind: 'video', fileId: 'G'.repeat(25), sec: [2], topic: 'نشست', summary: '', words: 'سخنگو بلبل نیوز', allWords: 'سخنگو بلبل نیوز بفرمایید' }];
  const firstSec1 = sents.findIndex(x => x.sec === 1) + 1;
  const vs = vmScenes_({ placements: [{ item: 'C1', from: String(firstSec1), clipQuote: 'جمع کن خودتو بابا', moment: 'بله', momentAfter: String(nAfter) },
                                       { item: 'C2', from: String(sents.findIndex(x => x.sec === 2) + 1) }] }, sents, items, total, []);
  const mo = vs.moments[0];
  ok('۱۵.۶ لحظه از آغازِ بازگویی می‌نشیند و `cut` همان بازه است', mo && mo.at === rs.at && mo.cut === rs.cut && mo.recite >= 8, JSON.stringify(mo));
  const ins = [{ at: 30, d: 25, cut: 20 }];
  const desc = '00:00 آغاز\n00:20 پیش از لحظه\n00:40 وسطِ بازگویی\n01:20 پس از آن';
  const sh = vmShiftDesc_(desc, ins).split('\n');
  ok('۱۵.۷ زمانِ فصل‌ها: پیش از لحظه دست‌نخورده، فصلِ درونِ بازه پس از کلیپ (۳۰+۲۵)، پس از بازه فقط d−cut (۵ ثانیه)',
     sh[0] === '00:00 آغاز' && sh[1] === '00:20 پیش از لحظه' && /^0?0?:?0?0?:?55 /.test(sh[2].replace(/^0:/, '00:')) &&
     ytTime_(55) === sh[2].split(' ')[0] && ytTime_(85) === sh[3].split(' ')[0], sh.join(' | '));
  const vsrc = fs.readFileSync('src/37_VarietyMedia.gs', 'utf8'), ysrc = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  ok('۱۵.۸ `cut` و `whole` تا ردیفِ صف می‌رسند (۹.۱۱ `whole` را دو جا دور می‌ریخت)',
     /if \(m\.whole\) o\.whole = m\.whole;/.test(vsrc) && /if \(Number\(m\.cut\) > 0\) o\.cut/.test(vsrc) &&
     /whole: Number\(m\.whole\) \|\| 0, cut: Math\.max\(0, Number\(m\.cut\) \|\| 0\)/.test(ysrc));
}

console.log('\n=== ۱۶) دادهٔ واقعیِ نمونهٔ چهارم: مدل لحظه را «پس از» بازگویی گذاشت (۹.۱۵) ===');
{
  /* نمونهٔ چهارمِ ۷۳ بی هیچ `cut` ساخته شد: لحظهٔ اول پس از «… صندلی پرتاب می‌شود» (یک جمله پس از پایانِ دیالوگ) و
     لحظهٔ دوم پس از آخرین جملهٔ بخش (جملهٔ k در بخشِ بعدی بود). سنجهٔ §۱۵ لحظه را وسطِ دیالوگ گذاشته بود — حالتِ آسان. */
  const fx = JSON.parse(fs.readFileSync('tests/fixtures/vm73_rev4.json', 'utf8'));
  const sents = fx.sents.map(x => ({ t: x[0], text: x[1], sec: x[2] }));
  const at = t => sents.findIndex(x => x.t === t);
  const m1 = fx.moments[0], m2 = fx.moments[1];
  const r1 = vmReciteSpan_(sents, m1.momentAfter, fx.clipWords[m1.clip], fx.secs, sents[m1.sceneSn - 1].sec);
  ok('۱۶.۱ دعوای خانوادگی: با اعراب و با لحظه‌ای که یک جمله پس از پایانِ دیالوگ است، همان دیالوگ (۶۱٫۱ تا ۹۰٫۶) پیدا می‌شود',
     r1 && r1.a === at(61.1) && r1.b === at(85.8) && r1.at === 61.1 && Math.abs(r1.cut - 29.5) < 0.05, JSON.stringify(r1));
  const r2 = vmReciteSpan_(sents, m2.momentAfter, fx.clipWords[m2.clip], fx.secs, sents[m2.sceneSn - 1].sec);
  ok('۱۶.۲ نقش‌های اداره: لحظه پس از آخرین جملهٔ بخش، باز بازگوییِ همان بخش پیدا می‌شود و از بخشش بیرون نمی‌رود',
     r2 && sents[r2.a].sec === 3 && sents[r2.b].sec === 3 && r2.a <= at(198.4) && r2.b >= at(237.3) && r2.at + r2.cut <= 252.5 + 0.01,
     JSON.stringify(r2));
  ok('۱۶.۳ و معرفیِ ماجرا («ماجرا از یک خانه شروع می‌شود») و جملهٔ «همین منطقِ عجیب …» جزوِ بازه نیستند',
     r1.a > at(49.3) && r2.a > at(191.6));
  const items = [{ id: 'F', kind: 'video', fileId: 'F'.repeat(25), sec: [1], topic: '', summary: '', words: '', allWords: fx.clipWords.family },
                 { id: 'O', kind: 'video', fileId: 'O'.repeat(25), sec: [3], topic: '', summary: '', words: '', allWords: fx.clipWords.office }];
  const vs = vmScenes_({ placements: [
    { item: 'F', from: String(m1.sceneSn), clipQuote: 'بدبخت', moment: 'بله', momentAfter: String(m1.momentAfter) },
    { item: 'O', from: String(m2.sceneSn), clipQuote: 'هاندس بیا اینجا', moment: 'بله', momentAfter: String(m2.momentAfter) }] },
    sents, items, fx.secs, []);
  ok('۱۶.۴ از پاسخِ واقعیِ مدل تا لحظه: هر دو لحظه `cut` دارند', vs.moments.length === 2 && vs.moments.every(m => m.cut > 10),
     JSON.stringify(vs.moments.map(m => [m.at, m.cut])));
}

console.log('=== ۱۷) کلیپی که بازگو می‌شود، صدای خودش را دارد — از کد (۹.۲۳، نمونهٔ ۶ِ ۷۳) ===');
{
  /* جمله‌ها و زمان‌ها عیناً از _media.jsonِ نمونهٔ ۶ِ ۷۳ (بخشِ ۱ تا ۳). مدل برای کلیپِ سخنگو (بخشِ ۲) لحظه نگذاشت
     و صاحبِ برنامه شنید: «کلیپِ دوم صداش یک ذره هم پخش نشد». گفتارِ کلیپ از خودِ دیالوگ. */
  const T = [[46.6,'دعوایِ خانوادگی با آدابِ پخشِ زنده.',1],[49.4,'ماجرا از یک خانه شروع می‌شود؛ جایی که زن و شوهر هر دو خَبَرنِگارَند.',1],
    [61.2,'زن داد می‌زند: بدبخت!',1],[62.9,'تو هر چی داری صَدَقِه سرِ من و خانواده‌مه!',1],[66.2,'مَرد گوشش را می‌گیرد و با لحنِ رسمی می‌گوید: بله.',1],
    [70.1,'جمع کن خودتو بابا، مگه چیکار کردید برایِ من؟',1],[90.6,'و در نهایت یک صندلی پرتاب می‌شود.',1],
    [105.9,'نشست خبریِ حل بحران با دست خالی.',2],[109,'وقتی زبان اداری از زندگی خصوصی فراتر می‌رود، به پشت تریبون سخنگو می‌رسد.',2],
    [115.7,'سخنگو پشت میز می‌نشیند و اعلام می‌کند در خدمت خبرنگاران محترم هستم، سؤالاتتان را یکی‌یکی بفرمایید.',2],
    [124.9,'خبرنگار می‌گوید: از خبرگزاری کلاغ‌نیوز هستم، می‌خواستم...',2],[130.2,'سخنگو بلافاصله حرفش را قطع می‌کند: کلاغ‌نیوز؟',2],
    [134.5,'اجازه بدید شما، فعلاً شما اجازه...',2],[137.7,'سپس به خبرنگار دیگری اشاره می‌کند: بلبل‌نیوز بفرمایید سؤالتونو.',2],
    [143.6,'سؤال دربارهٔ بحران کم‌آبی است.',2],
    [146.5,'سخنگو پاسخ می‌دهد: درباره بحران کم‌آبی، اولاً ما بحران نداریم، بعد همه مردم باید به کمک ما بیان، کمتر آب بخورن، مصرف آبشون رو در منازل کم کنن، تنها راهش همینه.',2],
    [161.3,'برای زمستان و گاز هم راهکار یکسان است: مردم باید به کمک ما بیان مجدداً، لباس گرم بپوشن و وسایل گرمایشی رو خاموش کنن.',2],
    [172.1,'آتش‌سوزی جنگل چطور؟',2],[174,'مردم محلی با بیل و کلنگ بروند کمک.',2],
    [189.2,'نقش‌های آشنا در راهروهای اداره.',3],[191.6,'همین منطقِ عجیب در راهروهای شرکت‌ها هم تکرار می‌شود.',3]];
  const sents = T.map(x => ({ t: x[0], text: x[1], sec: x[2] }));
  const its = [
    { id: 'FAM', kind: 'video', fileId: 'FAM', sec: [1], words: 'بدبخت تو هر چی داری صدقه سر من و خانوادمه بله جمع کن خودتو بابا مگه چیکار کردید برای من' },
    { id: 'SPK', kind: 'video', fileId: 'SPK', sec: [2], words: 'در خدمت خبرنگاران محترم هستم سوالاتتون رو یکی یکی بفرمایید از خبرگزاری کلاغ نیوز هستم میخواستم کلاغ نیوز اجازه بدید شما فعلا شما اجازه بلبل نیوز بفرمایید سوالتونو درباره بحران کم آبی اولا ما بحران نداریم بعد همه مردم باید به کمک ما بیان کمتر آب بخورن مصرف آبشون رو در منازل کم کنن تنها راهش همینه برای زمستون و گاز هم مردم باید به کمک ما بیان مجددا لباس گرم بپوشن وسایل گرمایشی رو خاموش کنن' },
    { id: 'OFF', kind: 'video', fileId: 'OFF', sec: [3], words: '' }
  ];
  const raw = { placements: [
    { item: 'FAM', from: '1', clipQuote: 'بدبخت! تو هر چی داری صدقه سر من و خانواده‌مه!', moment: 'بله', momentAfter: '7' },
    { item: 'SPK', from: '8', clipQuote: 'درباره بحران کم‌آبی، اولاً ما بحران نداریم' },          // مدل لحظه نگذاشت — همان نمونهٔ ۶
    { item: 'OFF', from: '20' } ] };
  const r = vmScenes_(raw, sents, its, 200, [[177.2, 189.2]]);
  const spk = r.moments.find(m => m.id === 'SPK');
  ok('۱۷.۱ کلیپِ سخنگو لحظهٔ خودش را دارد، هرچند مدل نگذاشت', !!spk && spk.auto === true, JSON.stringify(r.moments));
  ok('۱۷.۲ لحظه جای بازگوییِ دیالوگ می‌نشیند (درونِ بخشِ ۲، پیش از موسیقیِ ۱۷۷)، با `cut` و نقل‌قولی از همان دیالوگ',
     spk && spk.at >= 115 && spk.at <= 125 && spk.cut > 30 && spk.at + spk.cut <= 177.3 && /بحران|کلاغ|خبرنگاران/.test(spk.quote),
     JSON.stringify(spk));
  ok('۱۷.۳ لحظهٔ مدل سرِ جایش (کلیپِ خانوادگی) و کلیپِ بی‌گفتار لحظهٔ ساختگی نمی‌گیرد',
     r.moments.filter(m => m.id === 'FAM').length === 1 && !r.moments.some(m => m.id === 'OFF') && r.autoMoments === 1, JSON.stringify(r.moments.map(m => m.id)));
  const r4 = vmScenes_(
     { placements: [{ item: 'SPK', from: '20' }] }, sents.map(x => Object.assign({}, x, { sec: x.sec === 2 ? 9 : x.sec })), its, 200, []);
  ok('۱۷.۴ کلیپی که بازگو نمی‌شود لحظهٔ ساختگی نمی‌گیرد (بازگویی شرط است)', !r4.moments.some(m => m.id === 'SPK') && r4.moments.some(m => m.id === 'FAM'), JSON.stringify(r4.moments) + ' ' + JSON.stringify(r4.scenes.map(x=>[x.id,x.sn])));
  CFG.VM_MOMENT_AUTO = false;
  ok('۱۷.۵ کلیدِ خاموش ⇒ همان رفتارِ پیشین (فقط لحظهٔ مدل)', !vmScenes_(raw, sents, its, 200, [[177.2, 189.2]]).moments.some(m => m.id === 'SPK'));
  delete CFG.VM_MOMENT_AUTO;
}

console.log('=== ۱۸) نمونهٔ ۷ِ ۷۳: لحظهٔ کلیپِ سخنگو از تیتر آغاز شد و سدِ فاصله دورش انداخت (۹.۲۷) ===');
{
  /* دادهٔ واقعی: جمله‌ها و زمان‌ها از _media.jsonِ نمونهٔ ۷، گفتارِ کاملِ کلیپ از _episode.json (body، همان
     allWords که تولید می‌سازد). تیترِ بخش با گفتارِ کامل درست ۰٫۵ می‌گرفت ⇒ لحظه از ۱۰۵٫۹، پانزده ثانیه پس از
     پایانِ لحظهٔ کلیپِ خانوادگی (۶۱٫۲ + ۲۹٫۴) ⇒ «فاصله» ⇒ dropped:1 و کلیپِ دوم باز بی‌صدا. */
  const BODY = "خب من در خدمت خبرنگاران محترم هستم. سؤالاتتون رو یکی‌یکی بفرمایید. از خبرگزاری کلاغ نیوز هستم. می‌خواستم... کلاغ نیوز؟ اجازه بدید شما شما فعلاً شما اجازه... شما... از خبرگزاری بلبل نیوز هستم. بلبل نیوز بفرمایید سؤالتونو. می‌خواستم درباره بحران کم‌آبی چه... درباره بحران کم‌آبی، اولاً ما بحران نداریم. بعد همه مردم باید به کمک ما بیان، کمتر آب بخورن، مصرف آبشون رو در منازل کم کنن. تنها راهش همینه. با توجه به نزدیک شدن فصل زمستان چه تدابیری برای... درباره گاز، مردم باید به کمک ما بیان مجدداً. لباس گرم بپوشن و وسایل گرمایشی رو خاموش کنن. در خصوص مهار آتش‌سوزی جنگل اگه می‌شه... مردم محلی همون منطقه درخواست کردیم که بیان حالا با هر ابزاری که دارن بیل و کلنگ و هرچیزی درخواست کردیم که به کمک ما بیان. با توجه به بالا بودن هزینه‌های درمان، شما چه تدابیری... ببینید، اگه مردم یاد بگیرن که خود مراقبتی کنن، الان مشکل اینه که هر کی هر جور دوست داره داره زندگی می‌کنه. مردم اگه به سلامتشون فکر کنن، بیمارستانمون خالی خواهند شد. درباره شایعه افزایش قیمت بنزین... ببینید، اگه مردم ما از وسایل نقلیه عمومی استفاده کنن، اتوبوس، مترو اینا همه جا هست. من خودم صبح‌ها با مترو میام. و اینکه حالا مسافرتی دارن، سعی کنن که خانواده چند خانواده باشن از یک ماشین استفاده کنن. بفرمایید. درباره افزایش آلودگی هوا که بیماری‌های تنفسی و قلبی‌مون زیاد شده... متاسفانه تعداد تنفس مردم بالا رفته. یعنی مردم نسبت به بازه زمانی سال قبل بیشتر نفس کشیدن. بازم از مردم عزیزمون خواهش می‌کنیم که واقعاً اگر ضروری هست از ورود اکسیژن به داخل ریه‌هاشون استفاده کنن. درباره افزایش قیمت کالاها اگه می‌شه بفرمایید. کمتر بخورن، کمتر بپوشن،";
  const T = [[46.6,'دعوایِ خانوادگی با آدابِ پخشِ زنده.',1],[49.4,'ماجرا از یک خانه شروع می‌شود؛ جایی که زن و شوهر هر دو خَبَرنِگارَند.',1],
    [54.7,'میانِ فَریادها، ناگهان دست روی گوش می‌رود.',1],
    [61.2,'زن داد می‌زند: بدبخت!',1],[62.9,'تو هر چی داری صَدَقِه سرِ من و خانواده‌مه!',1],[66.2,'مَرد گوشش را می‌گیرد و با لحنِ رسمی می‌گوید: بله.',1],
    [70.1,'جمع کن خودتو بابا، مگه چیکار کردید برایِ من؟',1],[90.6,'و در نهایت یک صندلی پرتاب می‌شود.',1],[93.9,'این حرکتِ بدنی دقیقاً همان تصویری است که باید دید.',1],
    [105.9,'نشست خبریِ حل بحران با دست خالی.',2],[109,'وقتی زبان اداری از زندگی خصوصی فراتر می‌رود، به پشت تریبون سخنگو می‌رسد.',2],
    [115.7,'سخنگو پشت میز می‌نشیند و اعلام می‌کند در خدمت خبرنگاران محترم هستم، سؤالاتتان را یکی‌یکی بفرمایید.',2],
    [124.9,'خبرنگار می‌گوید: از خبرگزاری کلاغ‌نیوز هستم، می‌خواستم...',2],[130.2,'سخنگو بلافاصله حرفش را قطع می‌کند: کلاغ‌نیوز؟',2],
    [134.5,'اجازه بدید شما، فعلاً شما اجازه...',2],[137.7,'سپس به خبرنگار دیگری اشاره می‌کند: بلبل‌نیوز بفرمایید سؤالتونو.',2],
    [143.6,'سؤال دربارهٔ بحران کم‌آبی است.',2],
    [146.5,'سخنگو پاسخ می‌دهد: درباره بحران کم‌آبی، اولاً ما بحران نداریم، بعد همه مردم باید به کمک ما بیان، کمتر آب بخورن، مصرف آبشون رو در منازل کم کنن، تنها راهش همینه.',2],
    [161.3,'برای زمستان و گاز هم راهکار یکسان است: مردم باید به کمک ما بیان مجدداً، لباس گرم بپوشن و وسایل گرمایشی رو خاموش کنن.',2],
    [172.1,'آتش‌سوزی جنگل چطور؟',2],[174,'مردم محلی با بیل و کلنگ بروند کمک.',2],
    [189.2,'نقش‌های آشنا در راهروهای اداره.',3],[191.6,'همین منطقِ عجیب در راهروهای شرکت‌ها هم تکرار می‌شود.',3]];
  const sents = T.map(x => ({ t: x[0], text: x[1], sec: x[2] }));
  const fam = 'بدبخت تو هر چی داری صدقه سر من و خانوادمه بله جمع کن خودتو بابا مگه چیکار کردید برای من بله من اگه تو رو جمعت نمیکردم کسی تو رو آدم حساب میکرد';
  const its = [{ id: 'FAM', kind: 'video', fileId: 'FAM', sec: [1], words: fam, allWords: fam },
               { id: 'SPK', kind: 'video', fileId: 'SPK', sec: [2], words: BODY.slice(0, 900), allWords: BODY }];
  const spanH = vmReciteSpan_(sents, 10, BODY, 200, 2);
  ok('۱۸.۱ تیترِ بخش جزوِ بازگویی نیست، حتی وقتی با گفتارِ کاملِ کلیپ به آستانه می‌رسد', spanH && sents[spanH.a].t === 115.7, JSON.stringify(spanH));
  const spanK = vmReciteSpan_(sents, 9, BODY, 200, 2);
  ok('۱۸.۱-ب جست‌وجویی که از خودِ تیتر آغاز شود هم از تیتر شروع نمی‌کند', !spanK || sents[spanK.a].t !== 105.9, JSON.stringify(spanK));
  const raw = { placements: [
    { item: 'FAM', from: '1', clipQuote: 'بدبخت! تو هر چی داری صدقه سر من و خانواده‌مه!', moment: 'بله', momentAfter: '8' },
    { item: 'SPK', from: '10', clipQuote: 'درباره بحران کم‌آبی، اولاً ما بحران نداریم' } ] };
  const r = vmScenes_(raw, sents, its, 200, [[177.2, 189.2]]);
  const spk = r.moments.find(m => m.id === 'SPK'), famM = r.moments.find(m => m.id === 'FAM');
  ok('۱۸.۲ همان نقشهٔ نمونهٔ ۷: کلیپِ سخنگو لحظه دارد (پیش‌تر dropped:1)', !!spk && !!famM && r.dropped === 0, JSON.stringify(r.moments) + ' drops=' + JSON.stringify(r.momentDrops));
  ok('۱۸.۳ و لحظه با فاصلهٔ کافی پس از لحظهٔ قبلی، درونِ بازگویی، پیش از موسیقی',
     spk && spk.at - (famM.at + famM.cut) >= 20 && spk.at >= 115 && spk.at + spk.cut <= 177.3 && spk.cut > 30, JSON.stringify(spk));
  CFG.VM_MOMENT_GAP = 30;
  const r3 = vmScenes_(raw, sents, its, 200, [[177.2, 189.2]]);
  const s3 = r3.moments.find(m => m.id === 'SPK'), f3 = r3.moments.find(m => m.id === 'FAM');
  ok('۱۸.۵ آغازِ نزدیک ⇒ لحظه دور نمی‌افتد؛ آغازش درونِ همان بازگویی جلو می‌رود و پایانش همان می‌ماند',
     s3 && s3.shifted && s3.at - (f3.at + f3.cut) >= 30 && Math.abs(s3.at + s3.cut - (spk.at + spk.cut)) < 0.2, JSON.stringify(s3));
  delete CFG.VM_MOMENT_GAP;
  /* سدِ فاصله خودش هنوز کار می‌کند: بازگویی‌ای که هیچ جملهٔ دورتری ندارد، باز دور می‌افتد و علتش ثبت می‌شود. */
  CFG.VM_MOMENT_GAP = 200;
  const r2 = vmScenes_(raw, sents, its, 200, [[177.2, 189.2]]);
  ok('۱۸.۴ فاصلهٔ ناممکن ⇒ باز دور می‌افتد، و `momentDrops` می‌گوید چرا', !r2.moments.some(m => m.id === 'SPK') && /SPK@.*فاصله/.test((r2.momentDrops || []).join(' ')), JSON.stringify(r2.momentDrops));
  delete CFG.VM_MOMENT_GAP;
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ رسانه‌های منبع گذشت.');
