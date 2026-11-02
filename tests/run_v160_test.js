/* ══ آزمونِ ۱۶.۰ — «نمونهٔ مقایسه از «ب» بهتر بود؛ مبنا همان» و «فایلِ ب را سبک‌تر بفرست» ══ */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

const keepG = {};
['props_', 'tgEnabled_', 'tgApi_', 'tgSend_', 'UrlFetchApp', 'DriveApp', 'mailQueue_', 'ytRenderDocFetch_', 'mrPrevWant_',
 'vbrRead_', 'vbrSave_', 'vbrMapCached_', 'vbrModel_', 'personaPitch_', 'vbrAudio_', 'vbrSegs_', 'driveShareOn_', 'ytDlUrl_', 'ghKick_', 'vbrStyleHz_']
  .forEach(k => { keepG[k] = global[k]; });
const store = {};
global.props_ = () => ({ getProperty: k => (k in store ? store[k] : null), setProperty: (k, v) => { store[k] = String(v); }, deleteProperty: k => { delete store[k]; } });

/* ۱) MP3 از رانر */
const sent = [], sharing = [], wanted = [];
let prev = {};
global.tgEnabled_ = () => true;
global.mailQueue_ = () => true;
global.tgApi_ = (m, p) => { sent.push(m + ':' + p.title); return {}; };
global.tgSend_ = () => { sent.push('link'); };
global.ytRenderDocFetch_ = () => ({ musicPrev: prev });
global.mrPrevWant_ = ids => { wanted.push(...ids); return true; };
global.UrlFetchApp = Object.assign({}, keepG.UrlFetchApp, { fetch: () => ({ getResponseCode: () => 200, getBlob: () => ({ getBytes: () => new Array(10), setName: function () { return this; } }) }) });
global.DriveApp = Object.assign({}, keepG.DriveApp, { Access: { ANYONE_WITH_LINK: 'A', PRIVATE: 'P' }, Permission: { VIEW: 'V', NONE: 'N' },
  getFileById: id => ({ setSharing: (a) => sharing.push(id + ':' + a), getBlob: () => { throw new Error('WAVِ بزرگ نباید برود'); } }) });
const keepSet = CFG.VBR_RESEND_SET;
CFG.VBR_RESEND_SET = { tag: 'm1', items: [{ name: 'ب.mp3', driveId: 'D9', mp3: true }] };
let lg = vbrResendSet_();
const it0 = lg.items[0];
ok('۱.۱ بی MP3: «منتظر»، نه «فرستاده»؛ اشتراکِ با‌پیوند و صفِ رانر', !it0.ok && /منتظرِ MP3/.test(it0.why) && sharing.includes('D9:A') && wanted.includes('D9') && !sent.length && !lg.done, JSON.stringify(lg));
prev = { D9: { url: 'https://r/mprev-d9.mp3', bytes: 6200000 } };
lg = vbrResendSet_();
ok('۱.۲ MP3 رسید ⇒ همان با sendAudio، با اندازه در رسید', lg.done && /sendAudio \(MP3، 5\.9 مگابایت\)/.test(lg.items[0].how) && sent[0] === 'sendAudio:ب.mp3', JSON.stringify(lg));
ok('۱.۳ پس از ارسال، اشتراکِ فایل بسته می‌شود', sharing.includes('D9:P'));
ok('۱.۴ کامل ⇒ دیگر نمی‌فرستد', vbrResendSet_() === null && sent.length === 1);
ok('۱.۵ فهرستِ تازه: همان فایلِ ب، MP3', CFG === CFG && keepSet.tag === 'b-golduz-mp3-1102' && keepSet.items.length === 1 && keepSet.items[0].mp3 === true && keepSet.items[0].driveId === '1U4Khva6hTQSTogTq7DLNoZffh3c6BoKg');
CFG.VBR_RESEND_SET = keepSet;

/* ۲) مبنای گلدوز */
let saved = null;
global.vbrRead_ = () => ({ items: [] });
global.vbrSave_ = d => { saved = d; return true; };
global.vbrMapCached_ = () => ({});
global.vbrModel_ = () => ({ ok: true, pth: 'p', index: 'i' });
global.personaPitch_ = () => ({ pitch: '-2', src: 'هدفِ هرتزی', targetHz: '158' });
global.vbrAudio_ = () => [{ id: 'A1', name: 'a.wav' }];
global.vbrSegs_ = () => [];
global.driveShareOn_ = () => true;
global.ytDlUrl_ = id => 'u/' + id;
global.ghKick_ = () => true;
global.vbrStyleHz_ = () => '';
const r1 = vbrAsk_('special', 99, 'F', 'spk-1g0r95d', 'آزمون');
const row = (saved && saved.items[0]) || {};
ok('۲.۱ قسمتِ گلدوز با مبنای ۲۷ اکتبر: گامِ ۰، بی گامِ خودکار', r1.ok && row.params.pitch === '0' && row.params.targetHz === undefined && /۲۷ اکتبر/.test(row.base), JSON.stringify(row.params));
ok('۲.۲ «خ» نرم و دستورِ آرام از مبنا؛ بی باندِ بالای «ب»', row.hx === 'soft' && row.cueFix === GOLDUZ_STEADY_CUE2 && !row.variants);
saved = null;
vbrAsk_('special', 98, 'F', 'spk-1g0r95d', 'آزمون', { pitchFix: '-1' });
ok('۲.۳ بذرِ صریح بر مبنا مقدم است', saved.items[0].params.pitch === '-1');
saved = null;
vbrAsk_('variety', 97, 'F', 'razavi', 'آزمون');
ok('۲.۴ گویندهٔ بی‌مبنا دست نمی‌خورد', saved.items[0].params.targetHz === '158' && !saved.items[0].hx && !saved.items[0].base);
ok('۲.۵ سدِ قسمت‌ها سرِ جایش (VBR_EP_HOLD)', CFG.VBR_EP_HOLD === true);

Object.keys(keepG).forEach(k => { global[k] = keepG[k]; });
summary('۱۶.۰');
