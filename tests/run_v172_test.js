/* ══ آزمونِ ۱۷.۲ — فایلِ جانبیِ تلگرام بی قفل، با کلیدِ «خیر» در شیت و ستونِ ایراد ══ */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
ok('۱.۱ قفل برداشته شد؛ جایگزینی و زیروبمِ تکه‌ها خاموش و کفِ ۹۲ سرِ جایش', CFG.VBR_EP_HOLD === false && CFG.VBR_REPLACE === false && CFG.VBR_SEG_PITCH === false && CFG.VBR_EP_FLOOR.special === 92 && CFG.VBR_EP_FLOOR.variety === 92);
ok('۱.۲ دو ستونِ تازه در تبِ «صداها»', PERSONA_HEADERS[PC.SIDE - 1].indexOf('فایلِ جانبیِ تلگرام') === 0 && PERSONA_HEADERS[PC.SIDE_NOTE - 1].indexOf('ایرادِ فایلِ جانبی') === 0 && PERSONA_HEADERS.length === 14);
const row = (key, side, note) => { const v = new Array(PERSONA_HEADERS.length).fill(''); v[PC.KEY - 1] = key; v[PC.NAME - 1] = key; v[PC.ON - 1] = 'بله'; v[PC.SHOWS - 1] = 'از همه جا از همه رنگ'; v[PC.EVERY - 1] = 1; v[PC.STYLE - 1] = 'سبک'; v[PC.SIDE - 1] = side || ''; v[PC.SIDE_NOTE - 1] = note || ''; return v; };
const show = knownShows_()[0].key;
ok('۲.۱ خالی ⇒ روشن', vbrSpeakerPick_([row('g', '')], show, '94').key === 'g');
ok('۲.۲ «خیر» ⇒ هیچ فایلِ خودکاری برای او', vbrSpeakerPick_([row('g', 'خیر')], show, '94').key === '');
ok('۲.۳ «خیر» فقط همان ردیف؛ ردیفِ دیگر ادامه می‌دهد', vbrSpeakerPick_([row('g', 'خیر'), row('r', 'بله')], show, '94').key === 'r');
ok('۲.۴ «خیر» به شیوهٔ خواندنِ قسمتِ اصلی کاری ندارد (فقط در پل خوانده می‌شود)', !/PC\.SIDE\b/.test(require('fs').readFileSync('src/32_Persona.gs', 'utf8').replace(/PC = \{[^}]*\}/, '')));

const sent = [], found = [];
const keep = { logSelfFinding_, tgSend_, tgEnabled_, logLine_ };
global.logSelfFinding_ = (h, f) => found.push(f); global.tgSend_ = (t) => sent.push(t); global.tgEnabled_ = () => true; global.logLine_ = () => {};
const notes = { setNote() { return this; } };
const sh = { getRange: () => notes };
let r = vbrSideNotes_([row('g', '', 'قسمت ۹۴ دقیقهٔ ۳: «ناگهان» را noagahan گفت')], sh);
ok('۳.۱ ایرادِ تازه ⇒ یک یافتهٔ «کد» و یک «دریافت شد» در تلگرام', r.fresh === 1 && found.length === 1 && found[0].owner === 'کد' && /ناگهان/.test(found[0].detail) && sent.length === 1);
r = vbrSideNotes_([row('g', '', 'قسمت ۹۴ دقیقهٔ ۳: «ناگهان» را noagahan گفت')], sh);
ok('۳.۲ همان متن دوباره ثبت نمی‌شود', r.fresh === 0 && found.length === 1);
r = vbrSideNotes_([row('g', '', 'متنِ دیگر')], sh);
ok('۳.۳ متنِ تازه دوباره ثبت می‌شود', r.fresh === 1 && found.length === 2);
Object.keys(keep).forEach(k => { global[k] = keep[k]; });
ok('۳.۴ سیم: کارِ شبانهٔ پل ایرادها را می‌خوانَد', /out\.sideNotes = vbrSideNotes_\(\)/.test(require('fs').readFileSync('src/36_VoiceBridge.gs', 'utf8')));
summary('۱۷.۲');
