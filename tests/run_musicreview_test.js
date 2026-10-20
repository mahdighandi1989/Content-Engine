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
  const aud = calls('sendDocument');   // ۹.۷۹: WAV مستقیم به sendDocument — sendAudio نمی‌پذیردش
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
  ok('۱.۵ سهمِ روز پر ⇒ کارتِ تازه نه', calls('sendDocument').length === 0 && /سهمِ امروز/.test(mrState_().sendWhy), mrState_().sendWhy);
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
  ok('۵.۲ «/music» آمارِ بانک را می‌دهد', calls('sendMessage').some(x => /بانکِ موسیقی/.test(x.b.text) && /ردشده/.test(x.b.reply_markup || '')));
  const w = wantedTriggers_().filter(x => x.fn === 'tgPollTick')[0];
  ok('۵.۳ تریگرِ چنددقیقه‌ای در همان فهرستی که نصب و وارسی می‌شود', w && w.kind === 'minutes' && trigMinutes_(w.every) === 1 &&
     trigMinutes_(7) === 10 && (fs.readFileSync('src/05_Setup.gs', 'utf8').match(/everyMinutes\(trigMinutes_/g) || []).length === 2);
  const s = mrStatus_();
  ok('۵.۴ وضعیت و سلامت', s.line && /بازبینیِ موسیقی/.test(s.line) && /musicReview: \(function/.test(fs.readFileSync('src/08_Health.gs', 'utf8')) &&
     /mrHealth_\(problems, notes\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')), s.line);
  props_().setProperty(PK.MUSIC_LAST, JSON.stringify({ tracks: ['A.wav', 'B.wav'], ids: [fA.getId(), ''], slots: ['شروع', 'میانه'] }));
  const ml = tgMusicLine_();
  ok('۵.۵ موسیقیِ پخش‌شده در متنِ تلگرام: پیوندِ فایل و جایگاه', /<a href="https:\/\/drive\.google\.com\/file\/d\//.test(ml) && /\(شروع\)/.test(ml) && /B \(میانه\)/.test(ml), ml);
}

console.log('=== ۵-ب) تلگرامِ واقعی: WAVِ ردشده از sendAudio، و چتِ کانال ===');
{
  const keep = global.__STUB;
  let audioCalls = 0;
  global.__STUB = (url, body) => {
    if (/\/sendAudio$/.test(url)) { audioCalls++; return { code: 400, json: { ok: false, description: 'Bad Request: wrong file type' } }; }
    return keep(url, body);
  };
  tg.length = 0;
  const fM = global.__ROOT_FOLDER.createFile(Utilities.newBlob(new Array(400).fill(1), 'audio/mpeg', 'M.mp3'));
  const midD = mrSendOne_({ id: fM.getId(), name: 'M.mp3', sec: 30, used: 3, heard: 'آهنگ' }, null);
  const docAfterMp3 = calls('sendDocument').length;
  tg.length = 0; audioCalls = 0;
  const midW = mrSendOne_({ id: fD.getId(), name: 'D.wav', sec: 30, used: 3, heard: 'آهنگ' }, null);
  global.__STUB = keep;
  ok('۵-ب.۰ WAV یک بار بارگذاری می‌شود، مستقیم با sendDocument (۹.۷۹)', audioCalls === 0 && !!midW && calls('sendDocument').length === 1);
  ok('۵-ب.۱ غیرِ WAV: sendAudio رد کرد ⇒ همان فایل با sendDocument و همان دکمه‌ها، نه پیوندِ خالی', !!midD && docAfterMp3 === 1 &&
     /inline_keyboard/.test(calls('sendDocument')[0].b.reply_markup) && calls('sendMessage').length === 0);
  tg.length = 0;
  ups.push({ update_id: ++mid, channel_post: { message_id: 10, chat: { id: 777 }, text: '/music' } });
  tgPollTick();
  ok('۵-ب.۲ نوشته در کانال (channel_post) هم شنیده می‌شود', calls('sendMessage').some(x => /بانکِ موسیقی/.test(x.b.text)) &&
     JSON.stringify(calls('getUpdates')[0].b.allowed_updates).indexOf('channel_post') !== -1);
}

console.log('=== ۶) نصبِ دستی: تریگرِ تازه همان ساعت ساخته می‌شود، تکراری‌ها کنار (۹.۷۶) ===');
{
  /* حالتِ واقعیِ ۲۰ اکتبر: کد دستی جای‌گذاری شد، tgPollTick نبود، selfUpdateRetry چهار بار. */
  global.__TRIGGERS.length = 0;
  delete global.__PROPS[PK.SCHED_OFF];
  wantedTriggers_().filter(w => w.fn !== 'tgPollTick').forEach(w => ScriptApp.newTrigger(w.fn).timeBased().create());
  for (let i = 0; i < 4; i++) ScriptApp.newTrigger('selfUpdateRetry').timeBased().after(1).create();
  delete global.__PROPS[PK.TRIG_VER];
  const kRead = global.readCodeManifest_;
  global.readCodeManifest_ = () => ({ info: { version: CFG.CODE_VERSION } });
  delete global.__PROPS[PK.AUTOUPDATE_HOURLY_AT];
  try { selfUpdateHourly_(); } finally { global.readCodeManifest_ = kRead; }
  const names = global.__TRIGGERS.map(x => x.getHandlerFunction());
  ok('۶.۱ گذرِ ساعتیِ بعد از نصبِ دستی tgPollTick را می‌سازد', names.indexOf('tgPollTick') !== -1, names.join(','));
  ok('۶.۲ و تکراری‌ها را کنار می‌گذارد (selfUpdateRetry ×4 ⇒ ۱)', names.filter(n => n === 'selfUpdateRetry').length === 1 &&
     new Set(names).size === names.length, names.join(','));
  const before = global.__TRIGGERS.length;
  ok('۶.۳ یک بار برای هر نسخه — گذرِ بعدی دست نمی‌زند', trigEnsureForVersion_() === false && global.__TRIGGERS.length === before);
}

console.log('=== ۷) «دکمه‌ها رو می‌زنم هیچ تأثیری نداره» (۹.۷۷) ===');
{
  /* علتِ واقعی: قفلِ مشترکِ پروژه — ساختِ صدا و پل چند دقیقه نگهش می‌دارند و کلیک‌ها بی‌صدا در صف می‌ماندند. */
  const body = String(tgPollRun_);
  const realLock = LockService.getScriptLock;
  LockService.getScriptLock = () => ({ tryLock: () => false, waitLock: () => { throw new Error('busy'); }, releaseLock: () => {}, hasLock: () => false });
  const idA = fA.getId(), mA = Number(mrMap_(hub)[idA].msg);
  tg.length = 0;
  ups.push(cq('m|' + idA + '|s|2', mA));
  let out;
  try { out = tgPollTick(); } finally { LockService.getScriptLock = realLock; }
  ok('۷.۱ وقتی کارِ سنگینی قفلِ پروژه را دارد، کلیک باز هم خوانده و ثبت می‌شود', out && out.got === 1 && mrMap_(hub)[idA].stars === 2 &&
     !/getScriptLock/.test(body), JSON.stringify(out));
  ok('۷.۲ و اجاره پس از اجرا آزاد است (اجرای بعدی بسته نمی‌ماند)', !global.__PROPS['MUSIC_REVIEW_LEASE']);
  global.__PROPS['MUSIC_REVIEW_LEASE'] = String(Date.now());
  ok('۷.۳ دو اجرای هم‌زمانِ خودِ همین تریگر نه (offset یکی است)', tgPollTick() === null);
  delete global.__PROPS['MUSIC_REVIEW_LEASE'];

  /* جوابِ دکمه پیش از هر خواندنِ هاب: چرخشِ دکمه همان لحظه می‌ایستد. */
  const order = [], kHub = global.getHub_, kStub = global.__STUB;
  global.getHub_ = () => { order.push('hub'); return hub; };
  global.__STUB = (url, b) => { if (/answerCallbackQuery/.test(url)) order.push('ack:' + b.text); return kStub(url, b); };
  ups.push(cq('m|' + idA + '|r|vb', mA));
  try { tgPollTick(); } finally { global.getHub_ = kHub; global.__STUB = kStub; }
  ok('۷.۴ answerCallbackQuery پیش از بازکردنِ هاب، با متنِ همان کار', /^ack:❌ رد شد/.test(order[0]) && order.indexOf('hub') > 0, order.join(' → '));
  mrSet_(hub, idA, { verdict: 'تأیید' });

  /* تریگرِ دقیقه‌ای ارزان: سهمِ پر یا تلاشِ اخیر ⇒ هاب باز نمی‌شود. */
  let opened = 0;
  global.getHub_ = () => { opened++; return hub; };
  const st = mrState_(); st.day = String(nowStr_()).slice(0, 10); st.dayN = 99; mrSave_(st);
  try { tgPollTick(); } finally { global.getHub_ = kHub; }
  ok('۷.۵ دقیقهٔ بی‌کلیک با سهمِ پر ⇒ هیچ بازکردنِ هاب', opened === 0 && /سهمِ امروز/.test(mrState_().sendWhy), mrState_().sendWhy);
  const st2 = mrState_(); st2.dayN = 0; st2.sendTry = Date.now(); mrSave_(st2);
  global.getHub_ = () => { opened++; return hub; };
  try { tgPollTick(); } finally { global.getHub_ = kHub; }
  ok('۷.۶ تلاشِ فرستادنِ کمتر از ده دقیقه پیش ⇒ باز هم نه', opened === 0);

  /* تریگرِ پنج‌دقیقه‌ایِ موجود ⇒ نسخهٔ تازه برش می‌دارد و یک‌دقیقه‌ای می‌سازد. */
  global.__TRIGGERS.length = 0;
  ScriptApp.newTrigger('tgPollTick').timeBased().everyMinutes(5).create();
  const tOld = global.__TRIGGERS[0];
  delete global.__PROPS[PK.TRIG_VER]; delete global.__PROPS[PK.TRIG_POLL];
  trigEnsureForVersion_();
  const polls = global.__TRIGGERS.filter(t => t.getHandlerFunction() === 'tgPollTick');
  ok('۷.۷ فاصلهٔ تازه ⇒ تریگرِ قدیم برداشته و تازه ساخته شد', polls.length === 1 && polls[0] !== tOld && global.__PROPS[PK.TRIG_POLL] === '1',
     polls.length + ' / ' + global.__PROPS[PK.TRIG_POLL]);
}

console.log('=== ۸) «دیر و نامشخص و نامفهوم» و «ستاره‌ها باید بفهمی چی دوست دارم» (۹.۷۸) ===');
{
  const kb = mrKeyboard_('X', { stars: 3 }).inline_keyboard[0].map(x => x.text);
  ok('۸.۱ ستاره‌ها تا همان‌جا که زده روشن، بقیه خالی', /^⭐/.test(kb[0]) && /^⭐/.test(kb[2]) && /^☆/.test(kb[3]) && /^☆/.test(kb[4]), kb.join(' '));
  ok('۸.۲ جوابِ همان لحظهٔ دکمهٔ ستاره خودِ ستاره‌ها را می‌گوید', mrAckText_('m|X|s|4') === '⭐⭐⭐⭐ ثبت شد', mrAckText_('m|X|s|4'));

  const fE = mk('E.wav'), fF = mk('F.wav'), fG = mk('G.wav'), fH = mk('H.wav');
  const base = mus.getLastRow();
  mus.getRange(base + 1, 1, 4, MUSIC_HEADERS.length).setValues([row(fE, 'E.wav', 0, 'آهنگ — پیانو ملایم', 'میانه'),
    row(fF, 'F.wav', 0, 'آهنگ — گیتار الکتریک تند', 'میانه'), row(fG, 'G.wav', 0, 'آهنگ — پیانو', 'میانه'), row(fH, 'H.wav', 0, 'آهنگ — گیتار الکتریک', 'میانه')]);
  mrSet_(hub, fE.getId(), { name: 'E.wav', stars: 5, heard: 'آهنگ — پیانو ملایم', vibe: 'آرام' });
  mrSet_(hub, fF.getId(), { name: 'F.wav', stars: 1, heard: 'آهنگ — گیتار الکتریک تند' });
  const bank = musicBank_(hub), G = bank.filter(b => b.id === fG.getId())[0], H = bank.filter(b => b.id === fH.getId())[0];
  ok('۸.۳ ستاره‌ها به قطعه‌های داوری‌نشده هم می‌رسند: شبیهِ پنج‌ستاره بالا، شبیهِ یک‌ستاره پایین', G.like > 0 && H.like < 0, G.like + ' / ' + H.like);
  const pick = musicPick_([H, G], 'میانه', '', null);
  ok('۸.۴ و انتخاب را جابه‌جا می‌کند (هر دو بی‌داوری و هم‌بار)', pick && pick.id === fG.getId(), pick && pick.name);

  tg.length = 0;
  ups.push({ update_id: ++mid, message: { message_id: 19, chat: { id: 777 }, text: '/music' } });
  tgPollTick();
  const menu = calls('sendMessage').filter(x => /بانکِ موسیقی/.test(x.b.text))[0];
  ok('۸.۵ «/music» سلیقه‌ای را که فهمیده نشان می‌دهد', menu && /دوست دارد: [^\n]*پیانو/.test(menu.b.text) && /دوست ندارد: [^\n]*گیتار/.test(menu.b.text), menu && menu.b.text.slice(-160));

  let asked = '';
  const kG = global.geminiText_, kW = global.musicWantedMoods_;
  global.geminiText_ = (p) => { asked = p; return { terms: 'calm piano' }; };
  global.musicWantedMoods_ = () => ['آرام'];
  try { musicSeekTerms_('میانه'); } finally { global.geminiText_ = kG; global.musicWantedMoods_ = kW; }
  ok('۸.۶ جست‌وجوی قطعهٔ تازه هم سلیقه را می‌داند', /دوست دارد: [^\n]*پیانو/.test(asked) && /دوست ندارد[^\n]*گیتار/.test(asked));

  /* نصبِ دستی: تریگرِ پنج‌دقیقه‌ای همان اجرای بعدی‌اش یک‌دقیقه‌ای می‌شود — بی انتظار برای گذرِ ساعتی. */
  global.__TRIGGERS.length = 0;
  ScriptApp.newTrigger('tgPollTick').timeBased().everyMinutes(5).create();
  const old = global.__TRIGGERS[0];
  delete global.__PROPS[PK.TRIG_VER]; delete global.__PROPS[PK.TRIG_POLL];
  tgPollTick();
  const polls = global.__TRIGGERS.filter(t => t.getHandlerFunction() === 'tgPollTick');
  ok('۸.۷ نخستین اجرای تریگرِ کهنه پس از نصبِ دستی ⇒ تریگرِ یک‌دقیقه‌ای', polls.length === 1 && polls[0] !== old && global.__PROPS[PK.TRIG_POLL] === '1');
}

console.log('=== ۹) «فقط ۲۶ جلوه در دو ماه … باید بیش از هزار جمع می‌کرد … بر اساسِ اسمی که تو اون کتابخونه‌ها داره» (۹.۷۹) ===');
{
  ok('۹.۱ هدفِ بانکِ افکت دیگر ۸ نیست — گشتنِ عمومی با ۲۶ افکت می‌ایستاد', CFG.MUSIC_SFX_TARGET >= 1000 && CFG.MUSIC_SFX_SEEK_MAX >= 20, CFG.MUSIC_SFX_TARGET);

  /* archive.org: یک اثرِ کتابخانهٔ جلوه با چند فایل، عنوانِ هر فایل در شناسنامه. */
  const keep = global.__STUB, asked = [];
  global.__STUB = (url, body) => {
    if (/advancedsearch\.php/.test(url)) { asked.push(decodeURIComponent(url)); return { code: 200, json: { response: { docs: [{ identifier: 'bbc-sfx-1', title: 'Sound Effects Library', licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/' }] } } }; }
    if (/\/metadata\/bbc-sfx-1/.test(url)) return { code: 200, json: { metadata: { title: 'Sound Effects Library', subject: ['foley', 'weather'], licenseurl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
      files: [{ name: 'rain_roof_01.wav', size: 400000, title: 'Rain on tin roof' }, { name: 'door_creak.wav', size: 300000, title: 'Old wooden door creak' },
              { name: 'thunder.wav', size: 500000 }, { name: 'album_full.wav', size: 90000000, title: 'Full album' }, { name: 'notes.txt', size: 100 }] } };
    return keep(url, body);
  };
  const before = (musicFeedRead_().items || []).length;
  try { musicSeek_(null, true); } finally { global.__STUB = keep; }
  const items = (musicFeedRead_().items || []).slice(before).filter(x => x.kind === 'افکت');
  const byT = t => items.filter(x => x.title === t)[0];
  ok('۹.۲ از یک اثر چند فایل، نه فقط کوچک‌ترین؛ فایلِ آلبومیِ ۹۰ مگابایتی نه', items.length === 3 && !items.some(x => /album/i.test(x.url)), items.map(x => x.title).join(' | '));
  ok('۹.۳ نامِ هر جلوه همان عنوانِ کتابخانه است و دسته از همان می‌آید', byT('Rain on tin roof') && /^باران/.test(byT('Rain on tin roof').mood) &&
     byT('Old wooden door creak') && /^در/.test(byT('Old wooden door creak').mood) && byT('thunder') && /رعد/.test(byT('thunder').mood) &&
     byT('Rain on tin roof').lib === 'Sound Effects Library', JSON.stringify(items.map(x => [x.title, x.mood])));
  ok('۹.۴ و پرسشِ جست‌وجو بی خواسته هم چند دسته را با هم می‌گردد', asked.length && (asked[0].match(/\) OR \(/g) || []).length >= 1, asked[0] && asked[0].slice(-140));

  /* اجرای جدای افکت فقط افکت می‌آورد. */
  const feed = musicFeedRead_();
  feed.items.push({ url: 'https://example.org/song.wav', title: 'song', kind: 'موسیقی' });
  putOutJson_(MUSIC_FEED_(), feed);
  const got = [];
  const keep2 = global.__STUB;
  global.__STUB = (url, body) => { if (/example\.org|archive\.org\/download/.test(url)) { got.push(url); return { code: 404, json: {} }; } return keep2(url, body); };
  try { musicFetch_({ only: 'افکت', cap: 10 }); } finally { global.__STUB = keep2; }
  ok('۹.۵ musicFetch_({only:"افکت"}) موسیقی را دست نمی‌زند', got.length >= 3 && !got.some(u => /song\.wav/.test(u)), got.join(' , '));

  /* زنگِ اجرای جدا: هر دو ساعت، تا وقتی بانک به هدف نرسیده. */
  global.__TRIGGERS.length = 0;
  delete global.__PROPS[PK.SFX_BULK];
  global.engineBusyForSwap_ = () => false;
  const a1 = sfxBulkArm_(), t1 = global.__TRIGGERS.filter(t => t.getHandlerFunction() === 'sfxBulkRun').length;
  global.__TRIGGERS.length = 0;
  global.__PROPS[PK.SFX_BULK] = JSON.stringify({ at: Date.now() - 10 * 60000, have: 30 });
  const a2 = sfxBulkArm_();
  global.__PROPS[PK.SFX_BULK] = JSON.stringify({ at: 0, have: 5000 });
  const a3 = sfxBulkArm_();
  ok('۹.۶ اجرای جدا: زده می‌شود، ده دقیقه بعد نه، و پس از رسیدن به هدف هرگز', a1 === true && t1 === 1 && a2 === false && a3 === false);
  ok('۹.۷ و از تریگرِ ساعتی صدا زده می‌شود', /sfxBulkArm_\(\)/.test(fs.readFileSync('src/36_VoiceBridge.gs', 'utf8')));

  /* کارتِ تلگرام برای افکت. */
  const map = {}, q = mrQueue_([{ id: 'm1', name: 'a', kind: 'موسیقی', used: 3 }, { id: 'm2', name: 'b', kind: 'موسیقی', used: 2 }, { id: 'm3', name: 'c', kind: 'موسیقی', used: 1 },
    { id: 'm4', name: 'd', kind: 'موسیقی', used: 0 }, { id: 's1', name: 'rain', kind: 'افکت', used: 0 }, { id: 's2', name: 'door', kind: 'افکت', used: 0 }], map);
  ok('۹.۸ افکت‌ها هم در صفِ کارت، هر چهارمی یکی', q.map(x => x.id).join(',') === 'm1,m2,m3,s2,m4,s1', q.map(x => x.id).join(','));
  const kbS = [].concat.apply([], mrKeyboard_('s1', {}, 'افکت').inline_keyboard).map(x => x.text).join(' ');
  const capS = mrCaption_({ id: 's1', name: 'Rain on tin roof.wav', kind: 'افکت', sec: 4, mood: 'باران · rain on tin roof' }, {});
  ok('۹.۹ کارتِ افکت: 🔊، دسته و نامِ کتابخانه؛ بی وایب و جایگاه', /🔊/.test(capS) && /دسته و نامِ کتابخانه: باران/.test(capS) && !/وایبِ دیگر/.test(kbS) && !/شروع/.test(kbS) && /✅ تأیید/.test(kbS) &&
     /با نامش نمی‌خواند/.test(kbS) && !/موسیقی نیست/.test(kbS), kbS);

  /* «داستانی … درست سرِ جای خودش؟» — یک خبرِ داستانی با باران؛ افکتِ تأییدشده بی شنیدنِ مدل و بی شناسنامه. */
  const secs = [{ heading: 'شبِ بارانی', tone: 'رازآلود', narration: 'آن شب باران می‌بارید. زیرِ باران قدم می‌زد و صدای باران روی سقف می‌آمد. ناگهان در باز شد.' }];
  const sfxB = { id: 'S1', name: 'Rain on tin roof', kind: 'افکت', mood: 'باران · rain on tin roof', heard: '', src: '', sec: 4 };
  const pick = [{ section: 0, word: 'باران', id: 'S1', anchor: 'صدای باران روی سقف', when: 'روی' }];
  const off = sfxAllow_(secs, pick, 'variety', [sfxB]);
  const on = sfxAllow_(secs, pick, 'variety', [Object.assign({}, sfxB, { rev: { ok: true } })]);
  ok('۹.۱۰ بی شنیدن و بی شناسنامه نه؛ با تأییدِ شما در کارت، بله — با لنگرِ همان جمله', off.length === 0 && on.length === 1 && on[0].anchor === 'صدای باران روی سقف' && on[0].when === 'روی', JSON.stringify(on));
  const spec = sfxAllow_(secs, pick, 'special', [Object.assign({}, sfxB, { rev: { ok: true } })]);
  ok('۹.۱۱ درس‌نامه همچنان بی‌جلوه', spec.length === 0);
}

console.log('=== ۱۰) «۵ تای بعدی رو زدم و ده دقیقه گذشته» و «غیرقانونی نباشه … یوتیوب ممنوع نکنه» و «۹۰ نباید اکتفا بشه» (۹.۷۹) ===');
{
  /* حالتِ واقعی: دستهٔ اولِ ۲۵تایی رفته؛ دکمه سقف را ۱۰ می‌کرد و dayN ۲۰ می‌ماند ⇒ هیچ. */
  const fX = [1, 2, 3, 4, 5, 6].map(i => mk('X' + i + '.wav'));
  const b0 = mus.getLastRow();
  mus.getRange(b0 + 1, 1, 6, MUSIC_HEADERS.length).setValues(fX.map((f, i) => row(f, 'X' + i + '.wav', 0, 'آهنگ — ویولن', 'میانه')));
  const st = mrState_(); st.day = String(nowStr_()).slice(0, 10); st.dayN = 25; st.first = 0; st.sendTry = Date.now(); mrSave_(st);
  CFG.MR_FIRST_BATCH = 25; CFG.MR_PER_DAY = 10; CFG.MR_PER_RUN = 4;
  tg.length = 0;
  ups.push({ update_id: ++mid, callback_query: { id: 'qm', data: 'mm|more', message: { message_id: 1, chat: { id: 777 } } } });
  tgPollTick();
  const n1 = calls('sendDocument').length;
  tg.length = 0; tgPollTick();
  const n2 = calls('sendDocument').length;
  ok('۱۰.۱ «۵ تای بعدی» پس از دستهٔ اول واقعاً می‌فرستد: چهار همین اجرا، پنجمی اجرای بعد — بی انتظارِ ده‌دقیقه‌ای', n1 === 4 && n2 === 1 && !mrState_().more, n1 + ' + ' + n2);

  ok('۱۰.۲ مجوز: NC و ND ممنوع، CC0 و BY مجاز (BY با ذکرِ نام)، بی‌نشان نامعلوم',
     musicLicense_('x (https://creativecommons.org/licenses/by-nc/3.0/)').ok === false && musicLicense_('https://creativecommons.org/licenses/by-nd/4.0/').ok === false &&
     musicLicense_('https://creativecommons.org/publicdomain/zero/1.0/').ok === true && musicLicense_('https://creativecommons.org/licenses/by/3.0/').credit === true &&
     musicLicense_('http://creativecommons.org/licenses/by-sa/3.0/').ok === true && musicLicense_('').ok === null);
  const fN = mk('NC.wav'), fB2 = mk('BY.wav');
  const b1 = mus.getLastRow();
  const rN = row(fN, 'NC.wav', 0, 'آهنگ — پیانو', 'میانه'); rN[MC.SRC - 1] = 'Song — https://archive.org/details/x (https://creativecommons.org/licenses/by-nc-sa/3.0/)';
  const rB = row(fB2, 'BY.wav', 0, 'آهنگ — پیانو', 'میانه'); rB[MC.SRC - 1] = 'Nice Song — https://archive.org/details/nice (https://creativecommons.org/licenses/by/3.0/)';
  mus.getRange(b1 + 1, 1, 2, MUSIC_HEADERS.length).setValues([rN, rB]);
  const bank = musicBank_(hub);
  ok('۱۰.۳ قطعهٔ NC که پیش از این سد آمده بود هم دیگر پخش نمی‌شود', !bank.some(b => b.id === fN.getId()) && bank.some(b => b.id === fB2.getId() && b.licCredit));
  ok('۱۰.۴ جست‌وجو هم NC/ND را نمی‌آورد (موسیقی و افکت)', (fs.readFileSync('src/23_Music.gs', 'utf8').match(/musicLicense_\((s?lic)\)\.ok === false\) continue/g) || []).length === 2);

  /* ذکرِ نام در توضیحِ یوتیوب برای قطعهٔ CC BY که در همان قسمت پخش شده. */
  musicMarkUsed_(hub, [{ row: b1 + 2, id: fB2.getId(), name: 'BY.wav', kind: 'موسیقی', slot: 'میانه', used: 0, mood: '', gain: 1, sec: 30 }], 'درس‌نامه 78', CFG.SPECIAL_SHOW_NAME);
  const d = ytDescFinal_('special:78', 'توضیح');
  ok('۱۰.۵ توضیحِ یوتیوب نام و منبعِ قطعهٔ CC BY را می‌آورد، و نه پیوندِ درایو', /🎵 موسیقی:/.test(d) && /Nice Song/.test(d) && /archive\.org\/details\/nice/.test(d) && !/drive\.google/.test(d), d);
  ok('۱۰.۶ و برای قسمتی که این قطعه را نداشت، نه', !/Nice Song/.test(ytDescFinal_('special:79', 'توضیح')) && !/Nice Song/.test(ytDescFinal_('variety:78', 'توضیح')));
  ok('۱۰.۷ بانک سقفِ ۹۰تایی ندارد — رشد ادامه دارد', !CFG.MUSIC_BANK_MAX);
}

console.log('=== ۱۱) «رد با توضیح … بهش حتماً توجه بشه» و «فلان ثانیه‌ها رو در نظر بگیره، بقیه رو نه» (۹.۸۱) ===');
{
  const ok11 = (t, f, to) => { const r = mrRangeParse_(t); return r && r.from === f && r.to === to; };
  ok('۱۱.۱ بازه از نوشتهٔ آزاد — ثانیه، دقیقه، «:»، رقمِ فارسی و لاتین',
     ok11('از ثانیهٔ ۱۰ تا ۴۰', 10, 40) && ok11('۰:۳۰ تا ۱:۲۰', 30, 80) && ok11('دقیقهٔ ۱ تا ۲', 60, 120) && ok11('از 15 ثانیه تا دقیقه 2', 15, 120) && !mrRangeParse_('بد بود'));

  /* حالتِ واقعی: جلوه‌ای با کارتِ موسیقی، «رد با توضیح» با «این جلوهٔ صوتی است … قبولش دارم». */
  const fS = mk('Whoosh.wav'), b0 = mus.getLastRow();
  mus.getRange(b0 + 1, 1, 1, MUSIC_HEADERS.length).setValues([row(fS, 'Whoosh.wav', 0, 'آهنگ — گذر', 'میانه')]);
  const mS = Number(mrSendOne_({ id: fS.getId(), name: 'Whoosh.wav', kind: 'موسیقی', sec: 3, used: 0 }, null));
  mrSet_(hub, fS.getId(), { name: 'Whoosh.wav', sent: nowStr_(), msg: String(mS) });
  tg.length = 0;
  ups.push(cq('m|' + fS.getId() + '|rx', mS));
  tgPollTick();
  const ask = calls('sendMessage').filter(x => /#m:/.test(x.b.text))[0];
  ups.push({ update_id: ++mid, message: { message_id: 600, chat: { id: 777 }, text: 'این جلوهٔ صوتیه و به‌عنوانِ جلوه قبولش دارم، ولی ممکنه بعداً با موسیقی اشتباه گرفته بشه',
             reply_to_message: { text: ask.b.text } } });
  tgPollTick();
  const rS = mrMap_(hub)[fS.getId()];
  const kindNow = mus.getRange(2, 1, mus.getLastRow() - 1, MUSIC_HEADERS.length).getValues().filter(x => x[MC.ID - 1] === fS.getId())[0][MC.KIND - 1];
  ok('۱۱.۲ «جلوهٔ صوتیه … قبولش دارم» ⇒ نه رد: نوعش «افکت» شد و پذیرفته ماند', rS.verdict === 'تأیید' && kindNow === 'افکت' && /جلوهٔ صوتی/.test(rS.read), JSON.stringify(rS));
  ok('۱۱.۳ و همان لحظه به او گفته شد چه فهمیدم', calls('sendMessage').some(x => /فهمیدم: این جلوهٔ صوتی است/.test(x.b.text)));
  const bk = musicBank_(hub).filter(b => b.id === fS.getId())[0];
  ok('۱۱.۴ در بانک: افکت است، پس هرگز به‌عنوانِ موسیقی انتخاب نمی‌شود', bk && bk.kind === 'افکت' && musicPick_([bk], 'میانه', '', null) === null);

  /* بازه: از دکمهٔ «✂️ بازهٔ استفاده» و از نوشتهٔ رد. */
  const fR = mk('Long.wav'), b1 = mus.getLastRow();
  const rr = row(fR, 'Long.wav', 0, 'آهنگ — پیانو', 'شروع، میانه، پایان'); rr[MC.SEC - 1] = 180;
  mus.getRange(b1 + 1, 1, 1, MUSIC_HEADERS.length).setValues([rr]);
  mrSet_(hub, fR.getId(), { name: 'Long.wav', sent: nowStr_(), msg: '901' });
  const kbR = [].concat.apply([], mrKeyboard_(fR.getId(), {}).inline_keyboard).map(x => x.text);
  ok('۱۱.۵ کارت دکمهٔ «⌨️ بازه با نوشتن» دارد (موسیقی و افکت)', kbR.indexOf('⌨️ بازه با نوشتن') !== -1 &&
     [].concat.apply([], mrKeyboard_('x', {}, 'افکت').inline_keyboard).some(x => x.text === '⌨️ بازه با نوشتن'));
  tg.length = 0;
  ups.push(cq('m|' + fR.getId() + '|ux', 901));
  tgPollTick();
  const askU = calls('sendMessage').filter(x => /#m:.*:ux/.test(x.b.text))[0];
  ups.push({ update_id: ++mid, message: { message_id: 601, chat: { id: 777 }, text: 'از ثانیهٔ ۳۰ تا دقیقهٔ ۱', reply_to_message: { text: askU.b.text } } });
  tgPollTick();
  ok('۱۱.۶ نوشتهٔ «از ثانیهٔ ۳۰ تا دقیقهٔ ۱» ⇒ بازهٔ ۳۰–۶۰ در تب', mrMap_(hub)[fR.getId()].range === '30-60', mrMap_(hub)[fR.getId()].range);
  const bR = musicBank_(hub).filter(b => b.id === fR.getId())[0];
  ok('۱۱.۷ بانک بازه را می‌شناسد', bR && bR.range && bR.range.from === 30 && bR.range.to === 60);
  const clipSrc = String(musicWrap_);
  ok('۱۱.۸ و برشِ قطعه درونِ همان بازه است (شروع و طول)', /b\.range && b\.range\.to > b\.range\.from/.test(clipSrc) && /st0 = b\.range\.from/.test(clipSrc) && /len = Math\.max\(1, Math\.min\([^;]*b\.range\.to - b\.range\.from\)\)/.test(clipSrc));

  const rw = mrReadWhy_('صدای زشتیه، اصلاً موسیقی نیست', { kind: 'موسیقی' });
  ok('۱۱.۹ ردِ واقعی رد می‌ماند', rw.act === 'رد');

  /* ردهای با توضیحِ پیشین یک بار بازخوانده می‌شوند. */
  const fO = mk('Old.wav'), b2 = mus.getLastRow();
  mus.getRange(b2 + 1, 1, 1, MUSIC_HEADERS.length).setValues([row(fO, 'Old.wav', 0, 'آهنگ — طبل', 'میانه')]);
  mrSet_(hub, fO.getId(), { name: 'Old.wav', verdict: 'رد', why: 'این افکته نه موسیقی، به عنوان جلوه خوبه', whyK: 'x' });
  said.length = 0;
  const stO = mrState_(); delete stO.why981; mrSave_(stO);
  tgPollTick();
  ok('۱۱.۱۰ ردِ نوشتاریِ قبلی خوانده و اجرا شد، و خبرش رسید', mrMap_(hub)[fO.getId()].verdict === 'تأیید' && said.some(x => /دوباره خوانده شدند/.test(x) && /Old/.test(x)), said.join(' | '));
}

console.log('=== ۱۲) «منوی ثابت … دسترسی‌هاش وسیع»، «توضیحات حتی اگر تأیید یا معلق»، «معلق‌ها یادت بمونه» (۹.۸۲) ===');
{
  /* منوی ثابت، یک بار برای هر نسخه */
  const st0 = mrState_(); delete st0.kbVer; mrSave_(st0);
  tg.length = 0; tgPollTick();
  const kbMsg = calls('sendMessage').filter(x => /keyboard/.test(x.b.reply_markup || '') && /is_persistent/.test(x.b.reply_markup || ''))[0];
  ok('۱۲.۱ منوی ثابت پایینِ صفحه و فهرستِ دستورهای ربات', kbMsg && calls('setMyCommands').length === 1, kbMsg && kbMsg.b.reply_markup.slice(0, 80));
  tg.length = 0; tgPollTick();
  ok('۱۲.۲ و فقط یک بار (اجرای بعد دوباره نمی‌فرستد)', !calls('sendMessage').some(x => /is_persistent/.test(x.b.reply_markup || '')));
  /* کانال: صفحه‌کلید پذیرفته نیست ⇒ همان منو سنجاق می‌شود */
  const keep = global.__STUB;
  global.__STUB = (url, body) => { if (/sendMessage$/.test(url) && /is_persistent/.test(body.reply_markup || '')) return { code: 400, json: { ok: false, description: 'Bad Request: reply keyboard not allowed' } }; return keep(url, body); };
  const st1 = mrState_(); delete st1.kbVer; mrSave_(st1);
  tg.length = 0;
  try { tgPollTick(); } finally { global.__STUB = keep; }
  ok('۱۲.۳ اگر چت صفحه‌کلید نپذیرفت، منو سنجاق می‌شود — بی‌منو نمی‌ماند', calls('pinChatMessage').length === 1);

  ok('۱۲.۴ هیچ دکمهٔ مرده‌ای در منوی ثابت نیست', [].concat.apply([], MR_MENU_KB).every(t => { tg.length = 0; return mrOnMenuText_(hub, mrState_(), t, 777) === true && tg.length > 0; }));

  /* معلق‌ها: هر چه فرستاده شده و بی‌جواب مانده — بیش از یک صفحه */
  const P = [];
  for (let i = 0; i < 10; i++) { const f = mk('P' + i + '.wav'); P.push(f); const r0 = mus.getLastRow(); mus.getRange(r0 + 1, 1, 1, MUSIC_HEADERS.length).setValues([row(f, 'P' + i + '.wav', 0, 'آهنگ — نی', 'میانه')]); mrSet_(hub, f.getId(), { name: 'P' + i + '.wav', sent: nowStr_(), msg: String(700 + i) }); }
  const allP = mrFilter_(mrRows_(hub), 'p');
  tg.length = 0;
  mrOnMenuText_(hub, mrState_(), '⏳ معلق‌ها', 777);
  const list = calls('sendMessage').slice(-1)[0], kbL = JSON.parse(list.b.reply_markup).inline_keyboard;
  ok('۱۲.۵ «⏳ معلق‌ها» همهٔ معلق‌ها را می‌شمارد و صفحهٔ اول با دکمهٔ هر قطعه و «بعدی»', allP.length >= 10 && new RegExp(faDigitsOut_(String(allP.length))).test(list.b.text) &&
     kbL.filter(r => /^mc\|/.test(r[0].callback_data)).length === MR_PAGE && kbL.some(r => r.some(x => /بعدی/.test(x.text))), list.b.text);
  tg.length = 0;
  ups.push({ update_id: ++mid, callback_query: { id: 'qb', data: 'mb|p|1', message: { message_id: 4242, chat: { id: 777 } } } });
  tgPollTick();
  ok('۱۲.۶ ورق زدن همان پیام را عوض می‌کند، نه پیامِ تازه', calls('editMessageText').some(x => x.b.message_id === 4242 && /صفحهٔ ۲/.test(x.b.text)));
  const idP = P[3].getId();
  tg.length = 0;
  ups.push({ update_id: ++mid, callback_query: { id: 'qc', data: 'mc|' + idP, message: { message_id: 4242, chat: { id: 777 } } } });
  tgPollTick();
  ok('۱۲.۷ زدنِ یک قطعه کارتش را دوباره می‌فرستد و شناسهٔ پیامِ تازه در تب می‌نشیند', calls('sendDocument').length === 1 && mrMap_(hub)[idP].msg !== '703');

  /* همهٔ فیلترهای منو و وایب‌ها بی‌خطا */
  tg.length = 0;
  const fs2 = Object.keys(MR_FILTERS).concat(mrVibes_().map((_, i) => 'v' + i));
  ok('۱۲.۸ هر فهرستِ منو (و هر وایب) باز می‌شود', fs2.every(f => mrBrowse_(hub, 777, f, 0) === true) && mrMenu_(hub, 777) && mrVibeMenu_(hub, 777));

  /* یادداشت روی کارتِ تأییدشده */
  const idA = fA.getId(), mA = Number(mrMap_(hub)[idA].msg);
  mrSet_(hub, idA, { verdict: 'تأیید' });
  tg.length = 0;
  ups.push(cq('m|' + idA + '|nx', mA));
  tgPollTick();
  const askN = calls('sendMessage').filter(x => /#m:.*:nx/.test(x.b.text))[0];
  ups.push({ update_id: ++mid, message: { message_id: 700, chat: { id: 777 }, text: 'برای داستان‌های ترسناک عالیه، برای طنز نه؛ فقط از ثانیهٔ ۵ تا ۲۵', reply_to_message: { text: askN.b.text } } });
  tgPollTick();
  const rA = mrMap_(hub)[idA];
  ok('۱۲.۹ یادداشت روی تأییدشده: داوری همان می‌ماند، یادداشت و بازه ثبت می‌شود', rA.verdict === 'تأیید' && /ترسناک/.test(rA.note) && rA.range === '5-25', JSON.stringify(rA).slice(0, 200));
  ok('۱۲.۱۰ و پاسخ و کارت هر دو یادداشت را نشان می‌دهند', calls('sendMessage').some(x => /یادداشت ثبت شد/.test(x.b.text)) && calls('editMessageCaption').some(x => /📝 یادداشتِ شما/.test(x.b.caption)));
  const bA = musicBank_(hub).filter(b => b.id === idA)[0];
  let asked = '';
  const kG = global.geminiText_;
  global.geminiText_ = (prompt) => { asked = asked || prompt; return null; };
  try { musicPlanModel_(musicBank_(hub), { bounds: [], sections: [], show: 'variety', title: 'x' }); } catch (e) {} finally { global.geminiText_ = kG; }
  ok('۱۲.۱۱ هر بار که موسیقی انتخاب می‌شود، یادداشتِ او در پرسش هست', bA && /ترسناک/.test(bA.ownerNote) && /یادداشتِ صاحبِ برنامه: «[^»]*ترسناک/.test(asked));
  ok('۱۲.۱۲ کارت دکمهٔ «📝 یادداشت» دارد — حتی ردشده', [].concat.apply([], mrKeyboard_('x', { verdict: 'رد' }).inline_keyboard).some(x => /📝 یادداشت/.test(x.text)));
}

console.log('=== ۱۳) «بازه رو از روی خودِ موسیقی و پلیر انتخاب کنم جای تایپ» (۹.۸۳) ===');
{
  global.__PROPS['TG_BOT_USERNAME'] = 'TestBot';
  const fX = mk('Pick.wav'), b0 = mus.getLastRow();
  const rx = row(fX, 'Pick.wav', 0, 'آهنگ — سنتور', 'میانه'); rx[MC.SEC - 1] = 95;
  mus.getRange(b0 + 1, 1, 1, MUSIC_HEADERS.length).setValues([rx]);
  tg.length = 0;
  const mX = mrSendOne_({ id: fX.getId(), name: 'Pick.wav', kind: 'موسیقی', sec: 95, used: 0 }, {});
  mrSet_(hub, fX.getId(), { name: 'Pick.wav', sent: nowStr_(), msg: String(mX) });
  const kb = JSON.parse(calls('sendDocument')[0].b.reply_markup).inline_keyboard, btn = [].concat.apply([], kb).filter(x => x.url)[0];
  ok('۱۳.۱ کارت دکمهٔ «✂️ بازه با پخش‌کننده» دارد که صفحهٔ پخش را با شناسه، طول، ربات و کلید باز می‌کند',
     btn && /range\.html\?/.test(btn.url) && btn.url.indexOf('id=' + fX.getId()) !== -1 && /bot=TestBot/.test(btn.url) && /d=95/.test(btn.url) && /k=[0-9a-f]{6}/.test(btn.url), btn && btn.url);
  ok('۱۳.۲ صفحه در ریپو هست، پخش از درایو، و «ثبت» پیامِ start با همان قالب می‌سازد', fs.existsSync('docs/webapp/range.html') &&
     /uc\?export=download&id=/.test(fs.readFileSync('docs/webapp/range.html', 'utf8')) && /\?start=' \+ p/.test(fs.readFileSync('docs/webapp/range.html', 'utf8')));

  /* همان محاسبهٔ صفحه، این‌جا: شروع ۱۲٫۵، پایان ۴۷ */
  const k = /k=([0-9a-f]{6})/.exec(btn.url)[1];
  const payload = 'r' + fX.getId() + '_' + Math.round(12.5 * 10).toString(36) + '_' + Math.round(47 * 10).toString(36) + '_' + k;
  const longId = '1' + 'x'.repeat(43), worst = 'r' + longId + '_' + Math.round(599.9 * 10).toString(36) + '_' + Math.round(1800 * 10).toString(36) + '_' + k;
  ok('۱۳.۳ پیامِ start زیرِ سقفِ ۶۴ نویسهٔ تلگرام، حتی با شناسهٔ ۴۴ نویسه‌ای و بازهٔ نیم‌ساعته، و فقط با نویسه‌های مجاز',
     worst.length <= 64 && /^[A-Za-z0-9_-]+$/.test(payload) && /^[A-Za-z0-9_-]+$/.test(worst), worst.length);
  tg.length = 0;
  ups.push({ update_id: ++mid, message: { message_id: 800, chat: { id: 555, type: 'private' }, text: '/start ' + payload } });
  tgPollTick();
  const rX = mrMap_(hub)[fX.getId()];
  ok('۱۳.۴ بازگشت از صفحه ⇒ بازهٔ ۱۲٫۵–۴۷ در تب، حتی از چتِ خصوصیِ ربات', rX.range === '12.5-47', rX.range);
  ok('۱۳.۵ و پاسخ با زمانِ دقیق، و کارت عوض شد', calls('sendMessage').some(x => x.b.chat_id === 555 && /بازه ثبت شد: از ۰:۱۲٫?۵ تا ۰:۴۷/.test(x.b.text.replace('.', '٫'))) &&
     calls('editMessageCaption').some(x => /✂️ فقط ثانیهٔ/.test(x.b.caption)), (calls('sendMessage').filter(x => x.b.chat_id === 555)[0] || {}).b);
  ok('۱۳.۶ بانک همان بازه را می‌گیرد', (musicBank_(hub).filter(b => b.id === fX.getId())[0] || {}).range.to === 47);
  /* کلیدِ جعلی */
  tg.length = 0;
  ups.push({ update_id: ++mid, message: { message_id: 801, chat: { id: 999, type: 'private' }, text: '/start r' + fX.getId() + '_0_10_abcdef' } });
  tgPollTick();
  ok('۱۳.۷ کلیدِ نادرست ⇒ هیچ تغییری، فقط پیامِ «معتبر نیست»', mrMap_(hub)[fX.getId()].range === '12.5-47' && calls('sendMessage').some(x => /معتبر نیست/.test(x.b.text)));
  /* «بی‌بازه» */
  ups.push({ update_id: ++mid, message: { message_id: 802, chat: { id: 555, type: 'private' }, text: '/start r' + fX.getId() + '_0_0_' + k } });
  tgPollTick();
  ok('۱۳.۸ «بی‌بازه» ⇒ برمی‌گردد به تشخیصِ خودکار', mrMap_(hub)[fX.getId()].range === '' && !(musicBank_(hub).filter(b => b.id === fX.getId())[0] || {}).range);
}

console.log('=== ۱۴) موسیقیِ خودِ صاحبِ برنامه از تلگرام، هر قالب (۹.۸۵) ===');
{
  const mkWav = (rate, sec) => {
    const n = Math.floor(rate * sec), b = [], str = x => { for (const c of x) b.push(c.charCodeAt(0)); };
    const u32 = v => b.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255), u16 = v => b.push(v & 255, (v >>> 8) & 255);
    str('RIFF'); u32(36 + n * 2); str('WAVE'); str('fmt '); u32(16); u16(1); u16(1); u32(rate); u32(rate * 2); u16(2); u16(16);
    str('data'); u32(n * 2);
    for (let i = 0; i < n; i++) { const v = Math.round(8000 * Math.sin(i / 9)), u = v < 0 ? v + 65536 : v; b.push(u & 255, (u >>> 8) & 255); }
    return b;
  };
  const WAV = mkWav(8000, 3), MP3 = [0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0].concat(new Array(500).fill(7));
  const files = { 'f-wav': { path: 'music/a.wav', bytes: WAV }, 'f-mp3': { path: 'music/b.mp3', bytes: MP3 } };
  let rmap = { items: {} }, getFiles = 0, conv = WAV;
  const old = global.__STUB;
  global.__STUB = (url, body, opt) => {
    if (/api\.telegram\.org\/file\/bot/.test(url)) { const f = Object.keys(files).map(k => files[k]).filter(x => url.endsWith(x.path))[0]; return f ? { code: 200, bytes: f.bytes, mime: 'application/octet-stream' } : { code: 404, json: {} }; }
    if (/api\.telegram\.org\/bot[^/]+\/getFile/.test(url)) { getFiles++; tg.push({ m: 'getFile', b: body }); const f = files[body.file_id]; return { code: 200, json: { ok: true, result: f ? { file_path: f.path } : {} } }; }
    if (/renders\.json/.test(url)) return { code: 200, text: JSON.stringify(rmap) };
    if (/github\.com\/.*music-.*\.wav/.test(url)) return { code: 200, bytes: conv, mime: 'audio/wav' };
    if (/api\.github\.com/.test(url)) return { code: 204, json: {} };
    return old(url, body, opt);
  };
  const musRows = () => { const sh = hub.getSheetByName(CFG.MUSIC_TAB); return sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues(); };
  const rowOf = id => musRows().filter(r => String(r[MC.ID - 1]) === String(id))[0];
  const n0 = musRows().length;
  tg.length = 0;
  ups.push({ update_id: ++mid, message: { message_id: 900, chat: { id: 777 }, caption: 'آرام و نوستالژیک، از ثانیهٔ ۵ تا ۱۵',
    document: { file_id: 'f-wav', file_unique_id: 'U1', file_name: 'Rain Piano.wav', mime_type: 'audio/x-wav', file_size: WAV.length } } });
  tgPollTick();
  const S1 = mrUpState_().items.U1 || {}, r1 = rowOf(S1.wav) || [];
  ok('۱۴.۱ WAVِ فرستاده ⇒ فایل در پوشهٔ موسیقی و ردیفِ تازه در «موسیقی» با نام، مدت و «✅ صاحبِ برنامه فرستاد»',
     S1.state === 'done' && musRows().length === n0 + 1 && r1[MC.NAME - 1] === 'Rain Piano.wav' && r1[MC.SEC - 1] === 3 && /^✅ صاحبِ برنامه فرستاد/.test(r1[MC.HEARD - 1]) &&
     musicFolder_().getFilesByName('Rain Piano.wav').hasNext(), JSON.stringify(r1));
  const rv1 = mrMap_(hub)[S1.wav] || {};
  ok('۱۴.۲ نوشتهٔ زیرِ فایل خوانده شد: وایبِ «آرام، نوستالژیک»، بازهٔ ۵–۱۵، یادداشت؛ و داوریِ «تأیید»',
     rv1.verdict === 'تأیید' && rv1.vibe === 'آرام، نوستالژیک' && rv1.range === '5-15' && /از ثانیهٔ/.test(rv1.note), JSON.stringify(rv1));
  const licAsk = calls('sendMessage').filter(x => /حقِ پخش/.test(x.b.text))[0];
  const lkb = licAsk && [].concat.apply([], JSON.parse(licAsk.b.reply_markup).inline_keyboard);
  ok('۱۴.۳ مجوز پرسیده شد با سه دکمه، و کارتش برگشت (sendDocument) با پیامِ «در بانک نشست»',
     lkb && lkb.length === 3 && lkb.every(x => /^mu\|U1\|(own|free|unk)$/.test(x.callback_data)) &&
     calls('sendDocument').some(x => /Rain Piano/.test(x.b.caption)) && calls('sendMessage').some(x => /در بانک نشست: «Rain Piano»/.test(x.b.text)));
  ok('۱۴.۴ تا مجوز گفته نشده، پخش نمی‌شود (بیرون از بانک)', !musicBank_(hub).some(b => b.id === S1.wav));
  tg.length = 0;
  ups.push(cq('mu|U1|own', 905));
  tgPollTick();
  const bk = musicBank_(hub).filter(b => b.id === S1.wav)[0];
  ok('۱۴.۵ «ساختهٔ خودم» ⇒ ستونِ منبع عوض شد، در بانک است با همان بازه، و دکمه همان لحظه جواب گرفت',
     bk && /ساختهٔ خودِ صاحبِ برنامه/.test(bk.lic) && bk.mood.split('آرام').length === 2 && bk.range && bk.range.from === 5 && bk.range.to === 15 &&
     calls('answerCallbackQuery').some(x => /مجوز ثبت شد/.test(x.b.text)) && calls('editMessageText').some(x => /پخش می‌شود/.test(x.b.text)), JSON.stringify(bk));
  /* MP3 از چتِ خصوصیِ ربات (همان که پیوندِ امضاشدهٔ بازه را باز کرد، ۱۳.۴) */
  tg.length = 0;
  ups.push({ update_id: ++mid, message: { message_id: 910, chat: { id: 555, type: 'private' }, caption: 'این جلوهٔ صوتی است',
    audio: { file_id: 'f-mp3', file_unique_id: 'U2', file_name: 'door knock.mp3', mime_type: 'audio/mpeg', file_size: MP3.length } } });
  tgPollTick();
  const S2 = mrUpState_().items.U2 || {}, q = getOutJson_(ytRenderName_()) || {};
  const orig = S2.orig ? DriveApp.getFileById(S2.orig) : null;
  ok('۱۴.۶ MP3 ⇒ اصل در زیرپوشهٔ «' + CFG.MR_UP_FOLDER + '» با اشتراکِ پیوندی، و درخواستِ تبدیل در صفِ رانر',
     S2.state === 'conv' && orig && orig.getName() === 'door knock.mp3' && orig._share && orig._share.access === DriveApp.Access.ANYONE_WITH_LINK &&
     (q.musicConv || []).length === 1 && q.musicConv[0].id === S2.orig && q.musicConv[0].sig === S2.sig &&
     calls('sendMessage').some(x => x.b.chat_id === 555 && /رسید: «door knock»/.test(x.b.text) && /جلوهٔ صوتی/.test(x.b.text)), JSON.stringify(q.musicConv));
  const R = require('../tools/render.js');
  ok('۱۴.۷ رانر همان درخواست را «کار» می‌بیند؛ پس از پاسخ نه', R.musicConvTodo(q, { items: {} }).length === 1 &&
     R.musicConvTodo(q, { items: {}, musicConv: { [S2.orig]: { req: S2.sig } } }).length === 0 && R.probeWork(q, { items: {} }, {}, new Date()) === '1');
  rmap = { items: {}, musicConv: { [S2.orig]: { req: S2.sig, url: 'https://github.com/x/releases/download/renders/music-a.wav', sec: 3 } } };
  const st2 = mrState_(); st2.upPollAt = 0; mrSave_(st2);
  tg.length = 0;
  tgPollTick();
  const S2b = mrUpState_().items.U2 || {}, r2 = rowOf(S2b.wav) || [];
  ok('۱۴.۸ WAVِ رانر برداشته شد ⇒ «door knock.wav» در بانک به‌عنوانِ جلوه، اصل خصوصی شد، صف خالی',
     S2b.state === 'done' && r2[MC.NAME - 1] === 'door knock.wav' && r2[MC.KIND - 1] === 'افکت' && orig._share.access === DriveApp.Access.PRIVATE &&
     ((getOutJson_(ytRenderName_()) || {}).musicConv || []).length === 0, JSON.stringify(S2b));
  /* نادرست‌ها */
  tg.length = 0; getFiles = 0;
  ups.push({ update_id: ++mid, message: { message_id: 920, chat: { id: 777 }, audio: { file_id: 'f-mp3', file_unique_id: 'U3', file_name: 'big.flac', file_size: 30 * 1048576 } } },
           { update_id: ++mid, message: { message_id: 921, chat: { id: 4242 }, audio: { file_id: 'f-mp3', file_unique_id: 'U4', file_name: 'x.mp3', file_size: 100 } } },
           { update_id: ++mid, message: { message_id: 922, chat: { id: 777 }, document: { file_id: 'f-wav', file_unique_id: 'U1', file_name: 'Rain Piano.wav', mime_type: 'audio/x-wav', file_size: 10 } } },
           { update_id: ++mid, message: { message_id: 923, chat: { id: 777 }, document: { file_id: 'f-pdf', file_unique_id: 'U5', file_name: 'notes.pdf', mime_type: 'application/pdf', file_size: 10 } } });
  tgPollTick();
  ok('۱۴.۹ بیش از ۲۰ مگ ⇒ علت با عدد؛ چتِ ناشناس ⇒ هیچ؛ همان فایل دوباره ⇒ «قبلاً»؛ PDF ⇒ صوت نیست — و هیچ getFileی',
     getFiles === 0 && calls('sendMessage').some(x => /فقط فایلِ تا ۲۰ مگابایت/.test(x.b.text) && /۳۰ مگ/.test(x.b.text)) &&
     calls('sendMessage').some(x => /قبلاً در بانک نشسته: «Rain Piano»/.test(x.b.text)) && !calls('sendMessage').some(x => x.b.chat_id === 4242) && !mrUpState_().items.U5);
  ups.push(cq('mu|U2|unk', 930));
  tgPollTick();
  ok('۱۴.۱۰ «نمی‌دانم» ⇒ پخش نمی‌شود', !musicBank_(hub).some(b => b.id === S2b.wav) && musicLicense_(mrUpLicTag_('unk')).ok === false && musicLicense_(mrUpLicTag_('free')).ok === true);
  ok('۱۴.۱۱ توکنِ ربات در هیچ پیامی نیست', tg.every(x => JSON.stringify(x.b || {}).indexOf('botBOT') === -1));
  global.__STUB = old;
}

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ بازبینیِ موسیقی گذشت.');
