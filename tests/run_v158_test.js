/* ══ آزمونِ ۱۵.۸ — ارسالِ دوبارهٔ نمونه‌های «ب» با رسیدِ هر فایل ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const store = {};
const keepP = global.props_;
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } });
const keep = { tgEnabled_: global.tgEnabled_, tgApi_: global.tgApi_, tgSend_: global.tgSend_, UrlFetchApp: global.UrlFetchApp, DriveApp: global.DriveApp, mailQueue_: global.mailQueue_ };
const sent = [];
const blob = n => ({ getBytes: () => [1], setName: function () { return this; } });
global.tgEnabled_ = () => true;
global.mailQueue_ = () => true;
global.tgApi_ = (m, p) => { if (m === 'sendAudio' && /همه‌جا/.test(p.title)) throw new Error('Bad Request: wrong file type'); sent.push(m); return {}; };
global.tgSend_ = () => { sent.push('link'); };
global.UrlFetchApp = Object.assign({}, keep.UrlFetchApp, { fetch: u => ({ getResponseCode: () => (/gone/.test(u) ? 404 : 200), getBlob: () => blob() }) });
global.DriveApp = Object.assign({}, keep.DriveApp, { getFileById: () => ({ getBlob: () => blob() }) });
const keepSet = CFG.VBR_RESEND_SET;
CFG.VBR_RESEND_SET = { tag: 't1', items: [
  { name: 'الف.wav', url: 'https://x/a.wav' }, { name: 'همه‌جا.wav', url: 'https://x/b.wav' },
  { name: 'درایو.wav', driveId: 'D1' }, { name: 'رفته.wav', url: 'https://x/gone.wav' }] };
const log = vbrResendSet_();
const by = n => (log.items || []).find(x => x.name === n) || {};
ok('۱.۱ هر فایل رسید دارد: ساعت، روش', log.items.length === 4 && log.items.every(x => x.at && x.how), JSON.stringify(log.items));
ok('۱.۲ sendAudio رد شد ⇒ sendDocument، و علتِ ردِ تلگرام ثبت شد', by('همه‌جا.wav').how === 'sendDocument' && /wrong file type/.test(by('همه‌جا.wav').why));
ok('۱.۳ فایلِ درایو از درایو می‌رود', by('درایو.wav').how === 'sendAudio');
ok('۱.۴ نشانیِ مرده ⇒ علت (۴۰۴) و پیوند', by('رفته.wav').how === 'پیوند' && /404/.test(by('رفته.wav').why));
ok('۱.۵ کامل ⇒ دیگر نمی‌فرستد', log.done === true && vbrResendSet_() === null && sent.length === 4, sent.join());
const st = JSON.parse(store[PK.VBR_RESEND_LOG]);
ok('۱.۶ رسید در Properties (و _STATUS.tgResend از همان)', st.tag === 't1' && /tgResend: \(function \(\) \{ try \{ return JSON\.parse\(props_\(\)\.getProperty\(PK\.VBR_RESEND_LOG\)/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
ok('۱.۷ سیم: در نوبتِ ساعتی', /try \{ vbrResendSet_\(\); \}/.test(fs.readFileSync('src/36_VoiceBridge.gs', 'utf8')));
CFG.VBR_RESEND_SET = keepSet;
Object.keys(keep).forEach(k => { global[k] = keep[k]; });
global.props_ = keepP;
summary('۱۵.۸');
