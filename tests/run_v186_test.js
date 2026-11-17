/* ══ آزمونِ ۱۸.۶ — «🎓 کارگاه‌ها»: فهرست از درایو، کارگاهِ فعالِ هر چت، kb در JSON، رسید با نام ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const fs = require('fs');
const keepLog = global.logLine_; global.logLine_ = () => {};
const keep = {}; const stub = (n, f) => { if (!(n in keep)) keep[n] = global[n]; global[n] = f; };
const restore = () => { for (const k of Object.keys(keep)) global[k] = keep[k]; };

const ENGINE = { id: -100123, type: 'supergroup' }, DM = { id: 777, type: 'private' }, OTHER = { id: 999, type: 'private' };
stub('mrChatOk_', (c) => !!c && String(c.id) === String(ENGINE.id));
const calls = [];
stub('tgApi_', (m, p) => { calls.push([m, p]); return { ok: true, result: { message_id: 5 } }; });
PropertiesService.getScriptProperties().deleteProperty('DT_ACTIVE');

/* درایو: DeepTutor ⟵ صندوق */
const parent = DriveApp.__register('DT_PARENT_TEST', 'DeepTutor');
const inbox = DriveApp.__register('DT_INBOX_186', '08 - صندوق ورودی کارگاه');
parent._subs.push(inbox);
const keepF = CFG.DT_INBOX_FOLDER; CFG.DT_INBOX_FOLDER = 'DT_INBOX_186';

/* ۱ — دکمه */
ok('۱.۱ دکمهٔ «🎓 کارگاه‌ها» در منوی ثابت', [].concat.apply([], MR_MENU_KB).indexOf('🎓 کارگاه‌ها') >= 0);
ok('۱.۲ دکمه‌های قبلیِ منو همه سرِ جایشان', ['🎵 منوی موسیقی', '⏳ معلق‌ها', '⭐ پسندیده‌ها', '❌ ردشده‌ها', '🔊 جلوه‌ها', '🔎 بر اساسِ وایب', '📝 یادداشت‌دارها', '✂️ بازه‌دارها', '➕ ۵ تای بعدی', '❓ راهنما'].every(t => [].concat.apply([], MR_MENU_KB).indexOf(t) >= 0));
ok('۱.۳ راهنما خطِ کارگاه‌ها را دارد', MR_HELP.indexOf('🎓 کارگاه‌ها — دیدن و انتخاب کارگاه فعال (نویسندگی، سیر تکامل ذهن و کارگاه‌های بعدی)') >= 0);

/* ۲ — فهرست: نبودِ فایل ⇒ دو کارگاه */
let ws = dtWorkshops_();
ok('۲.۱ فایل نیست ⇒ همان دو کارگاه', ws.length === 2 && ws[0].name === 'کارگاه نویسندگی' && ws[1].name === 'سیر تکامل ذهن');
calls.length = 0; dtMenu_(ENGINE.id);
let kb = JSON.parse(calls[0][1].reply_markup).inline_keyboard;
ok('۲.۲ منو: یک دکمه برای هر کارگاه، بی ✅ وقتی چیزی انتخاب نشده', kb.length === 2 && kb.every(r => !/✅/.test(r[0].text)) && /هنوز کارگاهی انتخاب نشده/.test(calls[0][1].text));
parent.createFile(Utilities.newBlob(JSON.stringify({ workshops: [
  { name: 'کارگاه نویسندگی', hashtag: '#کارگاه نویسندگی', words: ['نوشتن'], default: true },
  { name: 'سیر تکامل ذهن', hashtag: '#کارگاه ذهن' },
  { name: 'کارگاه تازه‌ای با نامی بسیار بسیار بلند برای آزمودنِ سقفِ داده', hashtag: '#کارگاه تازه' }] }), 'application/json', 'workshops.json'));
ws = dtWorkshops_();
ok('۲.۳ فایل هست ⇒ فهرست از فایل (کارگاهِ تازه هم)', ws.length === 3 && /تازه/.test(ws[2].name));
calls.length = 0; dtMenu_(DM.id);
kb = JSON.parse(calls[0][1].reply_markup).inline_keyboard;
ok('۲.۴ داده‌ی هر دکمه ≤ ۶۴ بایت', kb.length === 3 && kb.every(r => Buffer.byteLength(r[0].callback_data, 'utf8') <= 64 && /^dk\|\d+\|/.test(r[0].callback_data)));

/* ۳ — callback */
calls.length = 0;
dtOnPick_(kb[1][0].callback_data, DM.id, 91);
const ed = calls.find(c => c[0] === 'editMessageText');
ok('۳.۱ انتخاب ⇒ کارگاهِ فعالِ همین چت در Script Properties', JSON.parse(PropertiesService.getScriptProperties().getProperty('DT_ACTIVE'))[String(DM.id)] === 'سیر تکامل ذهن');
ok('۳.۲ پاسخ با متنِ خواسته‌شده', ed && ed[1].text === '✅ کارگاه فعال: «سیر تکامل ذهن». از این به بعد هر پیامی که با #کارگاه شروع شود (یا پاسخ به پیام 🎓) به همین کارگاه می‌رود. برای کارگاه دیگر دوباره «🎓 کارگاه‌ها» را بزن.');
const kb2 = JSON.parse(ed[1].reply_markup).inline_keyboard;
ok('۳.۳ زیرِ همان پیام، فقط کارگاهِ فعال ✅ دارد', kb2[1][0].text === '✅ سیر تکامل ذهن' && !/✅/.test(kb2[0][0].text) && !/✅/.test(kb2[2][0].text));
dtOnPick_(kb[2][0].callback_data, DM.id, 91);
ok('۳.۴ نامِ بلند با دادهٔ بریده هم درست پیدا می‌شود', dtActive_(DM.id) === ws[2].name);
dtOnPick_(kb[1][0].callback_data, DM.id, 91);
ok('۳.۵ کارگاهِ فعال برای هر چت جداست', dtActive_(ENGINE.id) === '' && dtActive_(DM.id) === 'سیر تکامل ذهن');
calls.length = 0; dtOnPick_('dk|9|ناموجود', DM.id, 91);
ok('۳.۶ دکمهٔ کهنه (کارگاهی که دیگر نیست) ⇒ منوی تازه، بی تغییرِ کارگاهِ فعال', dtActive_(DM.id) === 'سیر تکامل ذهن' && calls.some(c => c[0] === 'sendMessage' && /^🎓 کارگاه‌ها/.test(c[1].text)));
ok('۳.۷ رسیدِ دکمه', mrAckText_('dk|1|x') === '🎓 کارگاه فعال شد');

/* ۴ — kb و رسید */
const recOf = (id) => JSON.parse(inbox._files.find(f => new RegExp('_' + id + '\\.json$').test(f.getName())).getBlob().getDataAsString());
const lastReceipt = () => calls.filter(c => c[0] === 'sendMessage').pop()[1].text;
calls.length = 0;
dtInbox_({ chat: DM, message_id: 51, date: 1, text: '#کارگاه تمرینِ امروز' }, { text: 'تمرینِ امروز' });
let r = recOf(51);
ok('۴.۱ kb = کارگاهِ فعال، متن مثلِ قبل', r.kb === 'سیر تکامل ذهن' && r.text === 'تمرینِ امروز');
ok('۴.۲ رسید نامِ کارگاهِ فعال را می‌گوید', lastReceipt() === '🎓 رسید به کارگاه «سیر تکامل ذهن». وقتی کامپیوتر روشن باشد، مربی بررسی می‌کند و نتیجه همین‌جا می‌آید.');
dtInbox_({ chat: DM, message_id: 52, date: 1, text: '#کارگاه نویسندگی یک بند' }, { text: 'نویسندگی یک بند' });
r = recOf(52);
ok('۴.۳ نامِ نوشته‌شده در متن ⇒ رسید با همان، متن دست‌نخورده، kb همچنان کارگاهِ فعال', /«کارگاه نویسندگی»/.test(lastReceipt()) && r.text === 'نویسندگی یک بند' && r.kb === 'سیر تکامل ذهن');
dtInbox_({ chat: ENGINE, message_id: 53, date: 1, text: '#کارگاه سلام' }, { text: 'سلام' });
r = recOf(53);
ok('۴.۴ چتی که کارگاهی انتخاب نکرده ⇒ بی فیلدِ kb، رسید با «کارگاه نویسندگی»', !('kb' in r) && /«کارگاه نویسندگی»/.test(lastReceipt()));
dtInbox_({ chat: ENGINE, message_id: 54, date: 1, text: '#کارگاه ذهن پرسشی دارم' }, { text: 'ذهن پرسشی دارم' });
ok('۴.۵ «#کارگاه ذهن …» ⇒ رسید «سیر تکامل ذهن»', /«سیر تکامل ذهن»/.test(lastReceipt()) && !('kb' in recOf(54)));

/* ۵ — اجرای واقعیِ tgPollRun_: دکمهٔ کارگاه‌ها و callback، و همهٔ شاخه‌های قبلی مثلِ قبل */
const routed = [];
let served = false;
stub('mrLease_', () => true); stub('mrSave_', () => {}); stub('mrState_', () => ({ ownerDm: '777', kbVer: String(CFG.CODE_VERSION), prev986: 1, why981: 1, audLeft: 0, day: String(nowStr_()).slice(0, 10), dayN: 999, first: 1 }));
stub('dtInbox_', (um) => { routed.push('dt:' + um.message_id); return true; });
stub('dtMenu_', (c) => { routed.push('menu:' + c); return true; });
stub('dtOnPick_', (d, c) => { routed.push('pick:' + c); return true; });
stub('mrStartRange_', (h2, s2, um) => { routed.push('start:' + um.message_id); return true; });
stub('mrUpOf_', (um) => !!um.audio);
stub('mrOnUpload_', (h2, s2, um) => { routed.push('upload:' + um.message_id); return true; });
stub('mrOnText_', (h2, s2, um) => { routed.push('text:' + um.message_id); return true; });
stub('mrOnMenuButton_', (h2, s2, d) => { routed.push('mbtn:' + d); return true; });
stub('mrOnUpLic_', (h2, d) => { routed.push('lic:' + d); return true; });
stub('mrOnButton_', (h2, s2, d) => { routed.push('btn:' + d); return true; });
stub('mrPrevSync_', () => {}); stub('mrUpPoll_', () => {}); stub('getHub_', () => ({})); stub('getHub', () => ({}));
stub('tgApi_', (m) => {
  if (m !== 'getUpdates' || served) return { ok: true, result: [] };
  served = true;
  return { ok: true, result: [
    { update_id: 1, message: { message_id: 1, chat: ENGINE, text: '🎓 کارگاه‌ها' } },
    { update_id: 2, message: { message_id: 2, chat: DM, text: '🎓 کارگاه‌ها' } },
    { update_id: 3, message: { message_id: 3, chat: OTHER, text: '🎓 کارگاه‌ها' } },
    { update_id: 4, callback_query: { id: 'q1', data: 'dk|1|سیر', message: { message_id: 9, chat: DM } } },
    { update_id: 5, callback_query: { id: 'q2', data: 'dk|1|سیر', message: { message_id: 9, chat: OTHER } } },
    { update_id: 6, callback_query: { id: 'q3', data: 'mm|menu', message: { message_id: 9, chat: ENGINE } } },
    { update_id: 7, callback_query: { id: 'q4', data: 'mu|abc|own', message: { message_id: 9, chat: ENGINE } } },
    { update_id: 8, callback_query: { id: 'q5', data: 'r1|x|s|4', message: { message_id: 9, chat: ENGINE } } },
    { update_id: 9, message: { message_id: 10, chat: ENGINE, text: '#کارگاه تمرین' } },
    { update_id: 10, message: { message_id: 11, chat: ENGINE, text: '⏳ معلق‌ها' } },
    { update_id: 11, message: { message_id: 12, chat: DM, audio: { file_id: 'B' }, caption: 'وایب آرام' } },
    { update_id: 12, message: { message_id: 13, chat: OTHER, text: '/start rabc_1_2_k' } } ] };
});
try { tgPollRun_(); } catch (e) { routed.push('throw:' + String(e.message || e)); }
const got = routed.join(',');
ok('۵.۱ دکمهٔ کارگاه‌ها از چتِ موتور و چتِ مالک ⇒ منو؛ چتِ ناشناس ⇒ نه', /menu:-100123/.test(got) && /menu:777/.test(got) && !/menu:999/.test(got) && !/text:1\b/.test(got));
ok('۵.۲ callbackِ کارگاه ⇒ انتخاب؛ از چتِ ناشناس ⇒ نه', /pick:777/.test(got) && !/pick:999/.test(got));
ok('۵.۳ دکمه‌های قبلی مثلِ قبل (منو، مجوز، کارت)', /mbtn:mm\|menu/.test(got) && /lic:mu\|abc\|own/.test(got) && /btn:r1\|x\|s\|4/.test(got));
ok('۵.۴ پیام‌های قبلی مثلِ قبل (#کارگاه، منو، صوت، /start)', /dt:10/.test(got) && /text:11/.test(got) && /upload:12/.test(got) && /start:13/.test(got));
if (/throw/.test(got)) console.log('   ', got);

const src = fs.readFileSync('src/39_MusicReview.gs', 'utf8');
ok('۶.۱ هیچ نامِ کارگاهی جز پیش‌فرض‌ها در کد نیست', (src.match(/سیر تکامل ذهن/g) || []).length === 2);

restore(); CFG.DT_INBOX_FOLDER = keepF; global.logLine_ = keepLog;
PropertiesService.getScriptProperties().deleteProperty('DT_ACTIVE');
summary('۱۸.۶');
