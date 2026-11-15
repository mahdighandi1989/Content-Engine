/* ══ آزمونِ ۱۸.۲ — «#کارگاه» در تلگرام ⇒ صندوقِ ورودیِ DeepTutor؛ پیام‌های دیگر مثلِ قبل ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const fs = require('fs');
const keepLog = global.logLine_; global.logLine_ = () => {};
const keep = {}; const stub = (n, f) => { keep[n] = global[n]; global[n] = f; };
const restore = () => { for (const k of Object.keys(keep)) global[k] = keep[k]; };

const ENGINE = { id: -100123, type: 'supergroup' }, DM = { id: 777, type: 'private' }, OTHER = { id: 999, type: 'private' };
stub('mrChatOk_', (c) => !!c && String(c.id) === String(ENGINE.id));
const st = { ownerDm: '777' };

/* ۱ — تشخیص */
let h = dtMatch_({ chat: ENGINE, text: '#کارگاه این تمرینِ امروز است' }, st);
ok('۱.۱ «#کارگاه» در آغازِ متن ⇒ کارگاه، بی پیشوند', h && h.text === 'این تمرینِ امروز است');
h = dtMatch_({ chat: DM, text: '/dt سؤالی دارم' }, st);
ok('۱.۲ «/dt» از چتِ خصوصیِ مالک ⇒ کارگاه', h && h.text === 'سؤالی دارم');
h = dtMatch_({ chat: ENGINE, text: '/dt@MyBot' }, st);
ok('۱.۳ «/dt@ربات» تنها ⇒ کارگاه با متنِ خالی', h && h.text === '');
h = dtMatch_({ chat: ENGINE, photo: [{ file_id: 'a' }], caption: '  #کارگاه دست‌نوشته' }, st);
ok('۱.۴ زیرنویسِ عکس با «#کارگاه» ⇒ کارگاه', h && h.text === 'دست‌نوشته');
h = dtMatch_({ chat: ENGINE, text: 'پاسخِ من', reply_to_message: { from: { is_bot: true }, text: '🎓 نکتهٔ مربی' } }, st);
ok('۱.۵ پاسخ به پیامِ «🎓»ِ ربات ⇒ کارگاه، متن کامل', h && h.text === 'پاسخِ من');
ok('۱.۶ پاسخ به پیامِ معمولیِ ربات ⇒ نه', !dtMatch_({ chat: ENGINE, text: 'باشه', reply_to_message: { from: { is_bot: true }, text: '🎵 کارت' } }, st));
ok('۱.۷ «#کارگاهی» (واژهٔ دیگر) ⇒ نه', !dtMatch_({ chat: ENGINE, text: '#کارگاهی' }, st));
ok('۱.۸ «/dtx» ⇒ نه', !dtMatch_({ chat: ENGINE, text: '/dtx سلام' }, st));
ok('۱.۹ «#کارگاه» وسطِ متن ⇒ نه', !dtMatch_({ chat: ENGINE, text: 'دربارهٔ #کارگاه' }, st));
ok('۱.۱۰ چتِ ناشناس ⇒ نه (همان سدِ چت)', !dtMatch_({ chat: OTHER, text: '#کارگاه سلام' }, st));
ok('۱.۱۱ متنِ معمولی و دکمهٔ منو ⇒ نه', !dtMatch_({ chat: ENGINE, text: '🎵 منوی موسیقی' }, st) && !dtMatch_({ chat: ENGINE, text: '/start rabc_1_2_k' }, st));
const keepOn = CFG.DT_ON; CFG.DT_ON = false;
ok('۱.۱۲ کلیدِ خاموش ⇒ نه', !dtMatch_({ chat: ENGINE, text: '#کارگاه' }, st));
CFG.DT_ON = keepOn;

/* ۲ — صندوق */
const inbox = DriveApp.__register('DT_INBOX_TEST', 'صندوق');
const folderId = inbox.getId(); const keepF = CFG.DT_INBOX_FOLDER; CFG.DT_INBOX_FOLDER = folderId;
const calls = [];
stub('tgApi_', (m, p) => { calls.push([m, p]); if (m === 'getFile') return { ok: true, result: { file_path: 'photos/file_9.jpg' } }; return { ok: true }; });
stub('tgToken_', () => 'TOKEN');
const keepUF = global.UrlFetchApp;
global.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getBlob: () => Utilities.newBlob([1, 2, 3], 'image/jpeg', 'x') }) };
dtInbox_({ chat: ENGINE, message_id: 42, date: 1700000000, photo: [{ file_id: 's', file_size: 10 }, { file_id: 'L', file_size: 900 }], caption: '#کارگاه x' }, { text: 'x' });
const names = inbox._files.map(f => f.getName());
const jf = inbox._files.find(f => /\.json$/.test(f.getName()));
const rec = JSON.parse(jf.getBlob().getDataAsString());
ok('۲.۱ JSON با نامِ tg_<زمان>_<شناسه>.json', /^tg_\d+_42\.json$/.test(jf.getName()));
ok('۲.۲ فیلدها: text/date/chat_id/message_id/kind/file_name', rec.text === 'x' && rec.date === 1700000000 && rec.chat_id === ENGINE.id && rec.message_id === 42 && rec.kind === 'photo' && /^tg_\d+_42\.jpg$/.test(rec.file_name));
ok('۲.۳ بزرگ‌ترین عکس دانلود شد و کنارِ JSON با همان پیشوند نشست', calls.some(c => c[0] === 'getFile' && c[1].file_id === 'L') && names.indexOf(rec.file_name) >= 0);
const rc = calls.find(c => c[0] === 'sendMessage');
ok('۲.۴ رسید در همان چت', rc && rc[1].chat_id === ENGINE.id && /^🎓 رسید به کارگاه/.test(rc[1].text));
calls.length = 0;
dtInbox_({ chat: DM, message_id: 43, date: 1, document: { file_id: 'D', file_size: 30 * 1048576, file_name: 'big.pdf' } }, { text: '' });
const rec2 = JSON.parse(inbox._files.find(f => /_43\.json$/.test(f.getName())).getBlob().getDataAsString());
ok('۲.۵ بزرگ‌تر از ۲۰ مگ ⇒ too_large و بی دانلود', rec2.too_large === true && rec2.kind === 'document' && !calls.some(c => c[0] === 'getFile'));
dtInbox_({ chat: DM, message_id: 44, date: 1, text: '#کارگاه سلام' }, { text: 'سلام' });
const rec3 = JSON.parse(inbox._files.find(f => /_44\.json$/.test(f.getName())).getBlob().getDataAsString());
ok('۲.۶ متنِ خالی از پیوست ⇒ kind=text', rec3.kind === 'text' && rec3.file_name === '');
dtInbox_({ chat: DM, message_id: 45, date: 1, voice: { file_id: 'V', file_size: 100 } }, { text: '' });
const rec4 = JSON.parse(inbox._files.find(f => /_45\.json$/.test(f.getName())).getBlob().getDataAsString());
ok('۲.۷ صدا ⇒ kind=voice', rec4.kind === 'voice');
global.UrlFetchApp = keepUF; CFG.DT_INBOX_FOLDER = keepF;

/* ۳ — سیم در tgPollRun_: پیش از همهٔ شاخه‌ها، با try جدا، و شاخه‌های قبلی دست‌نخورده */
const src = fs.readFileSync('src/39_MusicReview.gs', 'utf8');
const body = src.slice(src.indexOf('function tgPollRun_('), src.indexOf('function tgPollRun_(') + 6000);
const iDt = body.indexOf('if (dtHit) {'), iStart = body.indexOf("else if (um && /^\\/start\\s+r/"), iUp = body.indexOf('mrOnUpload_('), iTxt = body.indexOf('mrOnText_(');
ok('۳.۱ شاخهٔ کارگاه اول است و بقیه «else»ِ آن‌اند', iDt > 0 && iStart > iDt && iUp > iStart && iTxt > iUp);
ok('۳.۲ خطای کارگاه حلقه را نمی‌شکند (try/catch و st.lastWhy)', /if \(dtHit\) \{ try \{[^\n]*catch \(eDt\) \{ st\.lastWhy = 'dt: '/.test(body));
ok('۳.۳ راهنمای ربات خطِ «#کارگاه» را دارد', /#کارگاه …» — فرستادن تمرین، عکس دست‌نوشته یا سؤال به مربی نویسندگی DeepTutor/.test(src.slice(src.indexOf('var MR_HELP'), src.indexOf('var MR_HELP') + 3000)));

/* ۴ — اجرای واقعیِ tgPollRun_: پیامِ کارگاه به کارگاه، پیام‌های معمولی به همان شاخه‌های قبلی */
const routed = [];
let served = false;
stub('mrLease_', () => true); stub('mrSave_', () => {}); stub('mrState_', () => ({ ownerDm: '777', kbVer: String(CFG.CODE_VERSION), prev986: 1, why981: 1, audLeft: 0, day: String(nowStr_()).slice(0, 10), dayN: 999, first: 1 }));
stub('dtInbox_', (um) => { routed.push(['dt', um.message_id]); return true; });
stub('mrStartRange_', (h2, s2, um) => { routed.push(['start', um.message_id]); return true; });
stub('mrUpOf_', (um) => !!um.audio);
stub('mrOnUpload_', (h2, s2, um) => { routed.push(['upload', um.message_id]); return true; });
stub('mrOnText_', (h2, s2, um) => { routed.push(['text', um.message_id]); return true; });
stub('mrPrevSync_', () => {}); stub('mrUpPoll_', () => {}); stub('getHub_', () => ({}));
stub('tgApi_', (m) => {
  if (m !== 'getUpdates' || served) return { ok: true, result: [] };
  served = true;
  return { ok: true, result: [
    { update_id: 1, message: { message_id: 1, chat: ENGINE, text: '#کارگاه تمرین' } },
    { update_id: 2, message: { message_id: 2, chat: DM, audio: { file_id: 'A' }, caption: '#کارگاه این آهنگ نیست، تمرین است' } },
    { update_id: 3, message: { message_id: 3, chat: ENGINE, text: '⏳ معلق‌ها' } },
    { update_id: 4, message: { message_id: 4, chat: DM, audio: { file_id: 'B' }, caption: 'وایب آرام' } },
    { update_id: 5, message: { message_id: 5, chat: OTHER, text: '/start rabc_1_2_k' } } ] };
});
try { tgPollRun_(); } catch (e) { routed.push(['throw', String(e.message || e)]); }
const got = routed.map(r => r.join(':')).join(',');
ok('۴.۱ کارگاه: متن و زیرنویسِ صوتی با «#کارگاه» ⇒ فقط کارگاه (نه بانکِ موسیقی)', /dt:1/.test(got) && /dt:2/.test(got) && !/upload:2/.test(got));
ok('۴.۲ پیام‌های معمولی مثلِ قبل: منو ⇒ متن، صوت ⇒ بانک، /start r ⇒ بازه', /text:3/.test(got) && /upload:4/.test(got) && /start:5/.test(got) && !/dt:[345]/.test(got));
if (/throw/.test(got)) console.log('   ', got);
restore(); global.logLine_ = keepLog;
summary('۱۸.۲');
