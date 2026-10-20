/* بازبینیِ موسیقی در تلگرام (۹.۷۵، بخشِ ۳۹) — کارت، دکمه، پاسخِ نوشتاری، اثر بر انتخاب، ریشه‌یابی و یادآوری. */
require('./lib/root.js');
const fs = require('fs');
const { Spread } = require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);
global.__PROPS['GEMINI_API_KEY'] = 'TEST';
global.__PROPS[PK.TG_TOKEN] = 'BOT';
global.__PROPS[PK.TG_CHAT] = '777';

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 220) : ''));
};
const hub = new Spread('HUB');
global.getHub_ = () => hub;
const said = [], findings = [];
global.tgSend_ = m => { said.push(m); return true; };
global.logSelfFinding_ = (h, f) => { findings.push(f); return true; };

/* بانک: سه قطعه — یکی بسیار پخش‌شده، یکی شنیده‌نشده (مدل داوری نکرده)، یکی «آهنگ». */
const mk = (name) => global.__ROOT_FOLDER.createFile(Utilities.newBlob(new Array(400).fill(1), 'audio/wav', name));
const fA = mk('A.wav'), fB = mk('B.wav'), fC = mk('C.wav'), fD = mk('D.wav');
const mus = ensureTab_(hub, CFG.MUSIC_TAB, MUSIC_HEADERS);
const row = (f, name, used, heard, slots) => {
  const r = MUSIC_HEADERS.map(() => '');
  r[MC.ID - 1] = f.getId(); r[MC.NAME - 1] = name; r[MC.KIND - 1] = 'موسیقی'; r[MC.MOOD - 1] = 'آرام'; r[MC.SLOTS - 1] = slots;
  r[MC.SEC - 1] = 30; r[MC.FMT - 1] = 'WAV'; r[MC.USED - 1] = used; r[MC.HEARD - 1] = heard; r[MC.SRC - 1] = 'archive.org/netlabels';
  return r;
};
mus.getRange(2, 1, 4, MUSIC_HEADERS.length).setValues([row(fA, 'A.wav', 9, 'آهنگ — پیانو', 'شروع، میانه، پایان'),
  row(fB, 'B.wav', 1, '', 'میانه'), row(fC, 'C.wav', 5, 'آهنگ — گیتار', 'میانه'), row(fD, 'D.wav', 3, 'آهنگ — سنتور', 'میانه')]);

/* تلگرام: هر فراخوان ثبت می‌شود؛ getUpdates از صف. */
const tg = [], ups = [];
let mid = 100;
global.__STUB = (url, body) => {
  const m = /api\.telegram\.org\/bot[^/]+\/(\w+)/.exec(url);
  if (!m) return { code: 404, json: {} };
  tg.push({ m: m[1], b: body });
  if (m[1] === 'getUpdates') { const r = ups.splice(0); return { code: 200, json: { ok: true, result: r } }; }
  if (/^send/.test(m[1])) return { code: 200, json: { ok: true, result: { message_id: ++mid } } };
  return { code: 200, json: { ok: true, result: true } };
};
const calls = (m) => tg.filter(x => x.m === m);

console.log('=== ۱) کارت‌های امروز ===');
{
  CFG.MR_PER_RUN = 3;
  const out = tgPollTick();
  const aud = calls('sendAudio');
  const map = mrMap_(hub);
  ok('۱.۱ بیشترپخش‌شده اول (A، C، D) — هر کدام صوت با دکمه، و ردیفِ «فرستاده‌شده» با شناسهٔ پیام',
     out.sent === 3 && aud.length === 3 && map[fA.getId()].msg && map[fC.getId()].sent && !map[fB.getId()],
     JSON.stringify(Object.keys(map).map(k => map[k].name)));
  const kb = JSON.parse(aud[0].b.reply_markup).inline_keyboard, flat = [].concat.apply([], kb);
  ok('۱.۲ دکمه‌ها: پنج ستاره، وایب‌ها و «✍️ وایبِ دیگر»، سه جایگاه، تأیید، سه دستهٔ رد و «رد با توضیح»',
     kb[0].length === 5 && flat.some(x => x.text === '✍️ وایبِ دیگر') && flat.filter(x => /شروع|میانه|پایان/.test(x.text)).length === 3 &&
     flat.some(x => /✅ تأیید/.test(x.text)) && flat.filter(x => /^❌/.test(x.text)).length === 3 && flat.some(x => x.text === '✍️ رد با توضیح'));
  ok('۱.۳ هر callback_data زیرِ سقفِ ۶۴ بایتِ تلگرام', flat.every(x => Buffer.byteLength(x.callback_data) <= 64), flat[0].callback_data);
  ok('۱.۴ کپشن: نام، بارِ پخش، شنیدنِ مدل و «معلق»', /A<\/b>/.test(aud[0].b.caption) && /بار پخش شده/.test(aud[0].b.caption) && /⏳ معلق/.test(aud[0].b.caption));
  CFG.MR_FIRST_BATCH = 3;
  tg.length = 0; tgPollTick();
  ok('۱.۵ سهمِ روز پر ⇒ کارتِ تازه نه', calls('sendAudio').length === 0 && /سهمِ امروز/.test(mrState_().sendWhy), mrState_().sendWhy);
}

const cq = (data, msgId, chat) => ({ update_id: ++mid, callback_query: { id: 'q' + mid, data: data,
  message: { message_id: msgId, chat: { id: chat || 777 }, audio: {} } } });

console.log('=== ۲) دکمه‌ها ===');
{
  const idA = fA.getId(), mA = Number(mrMap_(hub)[idA].msg);
  tg.length = 0;
  ups.push(cq('m|' + idA + '|s|4', mA), cq('m|' + idA + '|v|0', mA), cq('m|' + idA + '|o|s', mA), cq('m|' + idA + '|a', mA));
  tgPollTick();
  const r = mrMap_(hub)[idA];
  ok('۲.۱ ستاره ۴، وایبِ «آرام»، جایگاهِ «شروع»، تأیید — همه در تبِ «بازبینیِ موسیقی»', r.stars === 4 && r.vibe === 'آرام' && r.slots === 'شروع' && r.verdict === 'تأیید', JSON.stringify(r));
  const lsh = hub.getSheetByName(CFG.MR_LOG_TAB), log = lsh.getRange(1, 1, lsh.getLastRow(), 6).getValues().map(x => x[3]);
  ok('۲.۲ هر کلیک یک ردیف در «بازخوردِ موسیقی»', ['ستاره', 'وایب', 'جایگاه', 'تأیید'].every(k => log.indexOf(k) !== -1), log.join(','));
  ok('۲.۳ کارت با وضعِ تازه بازنویسی شد و هر دکمه جواب گرفت', calls('editMessageCaption').length === 4 &&
     /✅ تأییدشده/.test(calls('editMessageCaption')[3].b.caption) && calls('answerCallbackQuery').length === 4);
  ups.push(cq('m|' + idA + '|o|s', mA));
  tgPollTick();
  ok('۲.۴ جایگاه دوباره زده شود برمی‌گردد (تیک)', mrMap_(hub)[idA].slots === '');
  ups.push(cq('m|' + idA + '|o|s', mA));
  tgPollTick();
  tg.length = 0;
  ups.push(cq('m|' + idA + '|s|1', mA, 999));
  tgPollTick();
  ok('۲.۵ کلیک از چتِ دیگر نادیده', mrMap_(hub)[idA].stars === 4 && calls('answerCallbackQuery').length === 0);
}

console.log('=== ۳) اثر بر انتخاب ===');
{
  const idA = fA.getId(), idB = fB.getId(), idC = fC.getId();
  mrSet_(hub, idB, { name: 'B.wav', verdict: 'تأیید', stars: 5, slots: 'میانه' });
  mrSet_(hub, idC, { name: 'C.wav', verdict: 'رد', whyK: 'vb', why: 'حس بد' });
  const bank = musicBank_(hub);
  ok('۳.۱ ردشده از بانک بیرون — دیگر هرگز', bank.every(b => b.id !== idC) && bank.length === 3, bank.map(b => b.name).join(','));
  const pB = musicPick_(bank, 'میانه', 'شاد', null);
  ok('۳.۲ تأییدشده با ستارهٔ ۵ جلوتر از همه — حتی بی داوریِ مدل', pB && pB.id === idB, pB && pB.name);
  const pA = musicPick_(bank, 'شروع', 'غمگین', null);
  ok('۳.۳ جایگاهی که او زد بر جایگاهِ قبلی مقدم: A فقط «شروع»', pA && pA.id === idA && musicPick_(bank, 'پایان', '', null) === null,
     pA && pA.slots);
  ok('۳.۴ وایبِ او جلوی حال‌وهوا', bank.filter(b => b.id === idA)[0].mood.indexOf('آرام') === 0);
}

console.log('=== ۴) ردِ «موسیقی نیست» ⇒ ریشه، نه فقط این قطعه ===');
{
  const idD = fD.getId(), mD = Number(mrMap_(hub)[idD].msg), idC = fC.getId();
  mrSet_(hub, idC, { verdict: '' });
  ups.push(cq('m|' + idD + '|r|nm', mD));
  tgPollTick();
  ok('۴.۱ یکی ثبت می‌شود، یافته هنوز نه', mrMap_(hub)[idD].verdict === 'رد' && mrMap_(hub)[idD].whyK === 'nm' && findings.length === 0);
  /* دومی با پاسخِ نوشتاری: «✍️ رد با توضیح» ⇒ پیامِ force_reply ⇒ پاسخِ او. */
  const mC = Number(mrMap_(hub)[idC].msg);
  tg.length = 0;
  ups.push(cq('m|' + idC + '|rx', mC));
  tgPollTick();
  const ask = calls('sendMessage')[0];
  ok('۴.۲ «✍️» یک پیامِ پاسخ‌خواه با برچسبِ همان قطعه', ask && /#m:/.test(ask.b.text) && /force_reply/.test(ask.b.reply_markup));
  ups.push({ update_id: ++mid, message: { message_id: 555, chat: { id: 777 }, text: 'این اصلاً موسیقی نیست، یه صدای ناهنجاره',
             reply_to_message: { text: ask.b.text } } });
  tgPollTick();
  const rC = mrMap_(hub)[idC];
  ok('۴.۳ پاسخِ نوشتاری ⇒ رد با علتِ خودش، و دستهٔ «موسیقی نیست» از متن', rC.verdict === 'رد' && /ناهنجار/.test(rC.why) && rC.whyK === 'nm', JSON.stringify(rC));
  ok('۴.۴ دومین «موسیقی نیست» برای «آهنگ»ِ مدل ⇒ یافتهٔ کد و خبرِ همان لحظه', findings.length === 1 && findings[0].key === 'music-not-music' &&
     findings[0].owner === ROWNER_CODE && said.some(s => /شنوندهٔ مدل/.test(s)), findings[0] && findings[0].title);
}

console.log('=== ۵) یادآوری، منو، تریگر، وضعیت ===');
{
  const st = mrState_(); st.lastSentAt = Date.now() - 30 * 3600000; st.answeredAt = st.lastSentAt - 1000; st.nagAt = 0; mrSave_(st);
  said.length = 0;
  mrNag_(st);
  ok('۵.۱ بیش از ۲۴ ساعت بی‌جواب ⇒ همان لحظه در تلگرام، و یک بار', said.length === 1 && /جوابی نداده‌اید/.test(said[0]) && (mrNag_(st), said.length === 1));
  tg.length = 0;
  ups.push({ update_id: ++mid, message: { message_id: 9, chat: { id: 777 }, text: '/music' } });
  tgPollTick();
  ok('۵.۲ «/music» آمارِ بانک را می‌دهد', calls('sendMessage').some(x => /بانکِ موسیقی/.test(x.b.text) && /ردشده/.test(x.b.text)));
  const w = wantedTriggers_().filter(x => x.fn === 'tgPollTick')[0];
  ok('۵.۳ تریگرِ چنددقیقه‌ای در همان فهرستی که نصب و وارسی می‌شود', w && w.kind === 'minutes' && trigMinutes_(w.every) === 5 &&
     trigMinutes_(7) === 10 && (fs.readFileSync('src/05_Setup.gs', 'utf8').match(/everyMinutes\(trigMinutes_/g) || []).length === 2);
  const s = mrStatus_();
  ok('۵.۴ وضعیت و سلامت', s.line && /بازبینیِ موسیقی/.test(s.line) && /musicReview: \(function/.test(fs.readFileSync('src/08_Health.gs', 'utf8')) &&
     /mrHealth_\(problems, notes\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')), s.line);
  props_().setProperty(PK.MUSIC_LAST, JSON.stringify({ tracks: ['A.wav', 'B.wav'], ids: [fA.getId(), ''], slots: ['شروع', 'میانه'] }));
  const ml = tgMusicLine_();
  ok('۵.۵ موسیقیِ پخش‌شده در متنِ تلگرام: پیوندِ فایل و جایگاه', /<a href="https:\/\/drive\.google\.com\/file\/d\//.test(ml) && /\(شروع\)/.test(ml) && /B \(میانه\)/.test(ml), ml);
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ بازبینیِ موسیقی گذشت.');
