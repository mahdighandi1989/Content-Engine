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
  ok('۷.۱۰ و خطِ روزانه ❌ با علت می‌گوید', /❌/.test(vmStatus_().line) && /ندارد/.test(vmStatus_().line));
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

console.log('=== ۸) سیم‌کشی: هر دو در و یک تعریف ===');
{
  const y = fs.readFileSync('src/27_YouTube.gs', 'utf8');
  const up = y.slice(y.indexOf('function ytUploadOne_'), y.indexOf('function ytUploadOne_') + 60000);
  ok('۸.۱ ytUploadOne_ پیش از صحنه‌های درس‌نامه vmBuild_ را صدا می‌زند',
     up.indexOf('vmBuild_(folder, meta, plan, ctx)') !== -1 &&
     up.indexOf('vmBuild_(folder, meta, plan, ctx)') < up.indexOf('lvScenesBuild_(folder, meta, plan, ctx)'));
  ok('۸.۲ هر دو درِ انتشار متنِ توضیح را از ytDescFinal_ می‌گیرند',
     (y.match(/description: ytDescFinal_\(/g) || []).length === 1 && /var desc = ytDescFinal_\(/.test(y));
  const h = fs.readFileSync('src/08_Health.gs', 'utf8');
  ok('۸.۳ سلامتِ روزانه vmHealth_ را جدا از lvHealth_ صدا می‌زند', /vmHealth_\(problems, notes\)/.test(h));
  ok('۸.۴ و _STATUS کلیدِ varietyMedia دارد', /varietyMedia: \(function \(\) \{ try \{ return vmStatus_\(\)/.test(h));
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ رسانه‌های منبع گذشت.');
