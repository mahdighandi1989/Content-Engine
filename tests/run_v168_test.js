/* ══ آزمونِ ۱۶.۸ — MP3ِ سبکِ فایلِ جانبی در تلگرام، و کفِ شمارهٔ دورِ خودکارِ پل ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

// ۱) کف
ok('۱.۱ درس‌نامه ۹۱ زیرِ کف است', vbrEpFloorOk_('special', '91') === false);
ok('۱.۲ ۹۲ و «۹۳» بالای کف', vbrEpFloorOk_('special', '92') === true && vbrEpFloorOk_('variety', '۹۳') === true);
ok('۱.۳ برنامهٔ بی‌کف آزاد است', vbrEpFloorOk_('unknown', '1') === true);

// ۲) دورِ خودکار با قفلِ برداشته: قدیمی‌ها خواسته نمی‌شوند
const keep = { vbrSpeakerRows_, vbrSpeakerAny_, vbrSpeakerPick_, ytRenderRead_, vbrAsk_, vbrAskPicked_ };
const hold = CFG.VBR_EP_HOLD; CFG.VBR_EP_HOLD = false;
const asked = [];
global.vbrSpeakerRows_ = () => [];
global.vbrSpeakerAny_ = () => true;
global.vbrAskPicked_ = () => 0;
global.vbrSpeakerPick_ = () => ({ key: 'spk', why: 'دائم' });
global.ytRenderRead_ = () => ({ items: [
  { show: 'variety', ep: '74', folderId: 'f74' }, { show: 'variety', ep: '90', folderId: 'f90' },
  { show: 'special', ep: '91', folderId: 's91' }, { show: 'variety', ep: '92', folderId: 'f92' },
  { show: 'special', ep: '92', folderId: 's92' } ] });
global.vbrAsk_ = (show, ep) => { asked.push(show + ':' + ep); return { ok: ep !== '92' }; };   // ۹۲ها «قبلاً خواسته شده»
vbrAskDue_(null, {});
ok('۲.۱ دور به قدیمی‌ها نمی‌رسد: فقط ۹۲ها دیده شدند، نه ۷۴/۹۰/۹۱', asked.length === 2 && asked.every(k => /:92$/.test(k)));
CFG.VBR_EP_HOLD = hold; Object.keys(keep).forEach(k => { global[k] = keep[k]; });

// ۳) تلگرام: MP3 اگر هست
const sent = [];
const kt = { tgEnabled_, tgChat_, tgApi_, driveLink_, UrlFetchApp: global.UrlFetchApp };
global.tgEnabled_ = () => true; global.tgChat_ = () => '1'; global.driveLink_ = () => 'L';
global.tgApi_ = (m, o) => { sent.push({ m, o }); return {}; };
const mkBlob = () => { const b = { _n: '', _t: '', getBytes: () => new Array(17000000), setName(n) { b._n = n; return b; }, setContentType(t) { b._t = t; return b; } }; return b; };
global.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getBlob: mkBlob }) };
const r1 = vbrTgTell_({ ep: '92', speaker: 'spk' }, 'گلدوز', { id: 'w1', ids: ['w1', 'w2'], mp3: { url: 'https://x/a.mp3', bytes: 17000000 } });
ok('۳.۱ یک sendAudio با MP3', r1.sent && /^MP3/.test(r1.how) && sent.length === 1 && sent[0].m === 'sendAudio' && /\.mp3$/.test(sent[0].o.audio._n) && sent[0].o.audio._t === 'audio/mpeg');
sent.length = 0;
global.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 404, getBlob: mkBlob }) };
const r2 = vbrTgTell_({ ep: '92', speaker: 'spk' }, 'گلدوز', { id: 'w1', ids: [], mp3: { url: 'https://x/a.mp3', bytes: 1 } });
ok('۳.۲ MP3 نرسید ⇒ همان پله‌های قبلی، نه سکوت', r2.sent === true && !/^MP3/.test(r2.how));
Object.keys(kt).forEach(k => { global[k] = kt[k]; });

// ۴) رانر MP3 را می‌سازد و در نقشه می‌نویسد
const py = fs.readFileSync('tools/voicebridge.py', 'utf8');
ok('۴.۱ رانر: libmp3lame و rec["mp3"]', /libmp3lame/.test(py.split('rec = {"urls"')[0].slice(-2500)) && /rec\["mp3"\] = mp3/.test(py));
ok('۴.۲ برداشت: mp3ِ نقشه به تلگرام می‌رسد', /hit\.mp3 && r\) r\.mp3 = hit\.mp3/.test(fs.readFileSync('src/36_VoiceBridge.gs', 'utf8')));
summary('۱۶.۸');
