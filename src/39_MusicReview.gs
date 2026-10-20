/* ═══════════════════════════════════════════════════════════════════════════
 * ۳۹ — بازبینیِ موسیقی در تلگرام (۹.۷۵)
 *
 * صاحبِ برنامه: «روزی حدودِ ده تا موسیقی … رو کم‌کم بفرستی رو تلگرام و من بتونم از طریقِ خودِ تلگرام … ستاره بدم …
 * وایبش رو … تأیید کنم … اونهایی که جواب نمیدم فعلاً معلق بمونن و اونهایی که تأیید نمی‌کنم برای همیشه رد بشن … موقعِ رد
 * کردن توضیح هم بدم … و ریشهٔ این مشکل رو هم بگیری … چیزی رو به عنوانِ موسیقی فرستادی و … این موسیقی نیست».
 *
 * تا امروز ربات فقط **می‌فرستاد**؛ هیچ دری برای شنیدنِ جوابِ او نبود. این بخش آن در است:
 *   • `tgPollTick` (تریگرِ چنددقیقه‌ای) با `getUpdates` دکمه‌ها و پاسخ‌ها را می‌خوانَد — بی webhook، چون پاسخِ ۳۰۲ِ
 *     Apps Script را تلگرام خطا می‌شمارد. وقتی او همین حالا در حالِ بازبینی است («داغ»)، همان اجرا چند بار long-poll
 *     می‌کند تا دکمه‌ها کم‌وبیش همان لحظه جواب بدهند؛ در سکوت، هر اجرا چند میلی‌ثانیه است.
 *   • هر قطعه یک پیامِ صوتی با دکمه: ستاره، وایب (از فهرست یا نوشتنی)، جایگاه، تأیید، رد (با دسته یا توضیح).
 *   • **داوریِ او بر هر داوریِ دیگری مقدم است** — در `musicBank_`/`musicPick_`: ردشده هرگز پخش نمی‌شود، تأییدشده بی
 *     سدِ شنیدنِ مدل و جلوتر از همه، با جایگاه و وایبی که او گفت. بی‌جواب همان قاعدهٔ پیشین را دارد (معلق).
 *   • همه‌چیز در دو تب: «بازبینیِ موسیقی» (یک ردیف برای هر قطعه، وضعِ امروز) و «بازخوردِ موسیقی» (هر کلیک، با زمان).
 *   • ریشه: ردِ «موسیقی نیست» برای قطعه‌ای که مدل «آهنگ» شنیده بود، خطای شنونده است، نه سلیقه — از دومی یافتهٔ کد
 *     می‌سازد و همان لحظه به او می‌گوید. بی‌جوابیِ طولانی و «همه را رد کردم» هم همان لحظه گفته می‌شود.
 * ═══════════════════════════════════════════════════════════════════════════ */

var MR_HEADERS = ['شناسهٔ فایل', 'نام', 'فرستاده‌شده', 'داوری', 'ستاره', 'وایب', 'جایگاه', 'علتِ رد', 'دستهٔ رد',
                  'آخرین تغییر', 'شناسهٔ پیام', 'شنیدنِ مدل'];
var MRC = { ID: 1, NAME: 2, SENT: 3, VERD: 4, STAR: 5, VIBE: 6, SLOTS: 7, WHY: 8, WHYK: 9, AT: 10, MSG: 11, HEARD: 12 };
var MRL_HEADERS = ['زمان', 'شناسهٔ فایل', 'نام', 'کار', 'مقدار', 'توضیح'];

/** دسته‌های رد — `nm` همان است که ریشه‌یابی می‌خواهد. */
var MR_WHY = [{ k: 'nm', t: 'موسیقی نیست / ناهنجار' }, { k: 'vb', t: 'حس و وایب بد' }, { k: 'q', t: 'کیفیتِ بد' }];
var MR_SLOTS = [{ k: 's', t: 'شروع', ic: '🎬' }, { k: 'm', t: 'میانه', ic: '🔀' }, { k: 'e', t: 'پایان', ic: '🏁' }];

function mrOn_() { return CFG.MR_ON !== false && tgEnabled_(); }

function mrState_() {
  var s = {};
  try { s = JSON.parse(props_().getProperty(PK.MR_STATE) || '{}') || {}; } catch (e) { s = {}; }
  return s;
}
function mrSave_(s) { try { props_().setProperty(PK.MR_STATE, JSON.stringify(s)); } catch (e) {} }

function mrVibes_() { return (CFG.MR_VIBES && CFG.MR_VIBES.length) ? CFG.MR_VIBES : ['آرام', 'شاد', 'گرم و صمیمی', 'متفکر', 'رازآلود', 'پرانرژی', 'حماسی', 'غمگین', 'نوستالژیک', 'دلهره‌آور']; }

/** یک ردیف برای هر قطعه؛ خواندن یک‌بار. ⇒ {id: {row, verdict, stars, vibe, slots, why, whyK, sent, msg, name}} */
function mrMap_(hub) {
  var out = {};
  try {
    var sh = (hub || getHub_()).getSheetByName(CFG.MR_TAB || 'بازبینیِ موسیقی');
    if (!sh || sh.getLastRow() < 2) return out;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, MR_HEADERS.length).getValues();
    for (var i = 0; i < v.length; i++) {
      var id = String(v[i][MRC.ID - 1] || '').trim();
      if (!id) continue;
      out[id] = { row: i + 2, name: String(v[i][MRC.NAME - 1] || ''), sent: String(v[i][MRC.SENT - 1] || ''),
                  verdict: String(v[i][MRC.VERD - 1] || '').trim(), stars: Number(v[i][MRC.STAR - 1]) || 0,
                  vibe: String(v[i][MRC.VIBE - 1] || ''), slots: String(v[i][MRC.SLOTS - 1] || ''),
                  why: String(v[i][MRC.WHY - 1] || ''), whyK: String(v[i][MRC.WHYK - 1] || ''),
                  msg: String(v[i][MRC.MSG - 1] || ''), at: String(v[i][MRC.AT - 1] || '') };
    }
  } catch (e) {}
  return out;
}

/** داوریِ او روی ردیفِ بانک: ردشده ⇒ null (بیرون)، بقیه با `rev`. یک تعریف برای `musicBank_`. */
function mrApply_(b, r) {
  if (!r) return b;
  if (r.verdict === 'رد') return null;
  b.rev = { ok: r.verdict === 'تأیید', stars: r.stars || 0, vibe: r.vibe || '', slots: r.slots || '' };
  if (r.vibe) b.mood = r.vibe + (b.mood ? '، ' + b.mood : '');
  if (r.slots) b.slots = r.slots;
  return b;
}

function mrSet_(hub, id, patch) {
  var sh = ensureTab_(hub, CFG.MR_TAB || 'بازبینیِ موسیقی', MR_HEADERS);
  var m = mrMap_(hub), r = m[id];
  var row = r ? r.row : sh.getLastRow() + 1;
  var cur = r ? sh.getRange(row, 1, 1, MR_HEADERS.length).getValues()[0] : MR_HEADERS.map(function () { return ''; });
  cur[MRC.ID - 1] = id;
  var keys = { name: MRC.NAME, sent: MRC.SENT, verdict: MRC.VERD, stars: MRC.STAR, vibe: MRC.VIBE, slots: MRC.SLOTS,
               why: MRC.WHY, whyK: MRC.WHYK, msg: MRC.MSG, heard: MRC.HEARD };
  for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k) && keys[k]) cur[keys[k] - 1] = patch[k];
  cur[MRC.AT - 1] = nowStr_();
  sh.getRange(row, 1, 1, MR_HEADERS.length).setValues([cur]);
  return mrMap_(hub)[id];
}

function mrLog_(hub, id, name, op, val, why) {
  try {
    var sh = ensureTab_(hub, CFG.MR_LOG_TAB || 'بازخوردِ موسیقی', MRL_HEADERS);
    sh.appendRow([nowStr_(), id, name || '', op, String(val == null ? '' : val), String(why || '')]);
  } catch (e) {}
}

/* ───── کارت ───── */

function mrKeyboard_(id, r) {
  r = r || {};
  var cb = function (op, a) { return 'm|' + id + '|' + op + (a == null ? '' : '|' + a); };
  var rows = [];
  var st = [];
  for (var s = 1; s <= 5; s++) st.push({ text: (r.stars === s ? '●' : '') + '⭐' + faDigitsOut_(String(s)), callback_data: cb('s', s) });
  rows.push(st);
  var vb = mrVibes_(), have = String(r.vibe || '').split(/[،,]\s*/);
  for (var i = 0; i < vb.length; i += 4) {
    rows.push(vb.slice(i, i + 4).map(function (t, j) {
      return { text: (have.indexOf(t) !== -1 ? '✓ ' : '') + t, callback_data: cb('v', i + j) };
    }));
  }
  rows.push([{ text: '✍️ وایبِ دیگر', callback_data: cb('vx') }]);
  rows.push(MR_SLOTS.map(function (x) {
    return { text: (String(r.slots || '').indexOf(x.t) !== -1 ? '✓ ' : '') + x.ic + ' ' + x.t, callback_data: cb('o', x.k) };
  }));
  if (r.verdict === 'رد') {
    rows.push([{ text: '↩️ برگرداندن (معلق)', callback_data: cb('u') }]);
  } else {
    rows.push([{ text: (r.verdict === 'تأیید' ? '✓ ' : '') + '✅ تأیید', callback_data: cb('a') },
               { text: '⏳ بعداً', callback_data: cb('u') }]);
    rows.push(MR_WHY.map(function (w) { return { text: '❌ ' + w.t, callback_data: cb('r', w.k) }; }));
    rows.push([{ text: '✍️ رد با توضیح', callback_data: cb('rx') }]);
  }
  return { inline_keyboard: rows };
}

function mrCaption_(b, r) {
  r = r || {};
  var d = function (x) { return faDigitsOut_(String(x)); };
  var L = ['🎵 <b>' + tgEsc_(String(b.name || '').replace(/\.wav$/i, '')) + '</b>',
           d(Math.round(b.sec || 0)) + ' ثانیه' + (b.used ? ' · ' + d(b.used) + ' بار پخش شده' : ' · هنوز پخش نشده') +
           (b.lastAt ? ' · آخرین: ' + tgEsc_(String(b.lastAt).slice(0, 10)) : ''),
           'شنیدنِ مدل: ' + tgEsc_(String(b.heard || '—').slice(0, 120)),
           'برچسبِ فعلی: ' + tgEsc_((String(b.mood || '—') + ' · ' + String(b.slots || '—')).slice(0, 160)), ''];
  var vd = r.verdict === 'تأیید' ? '✅ تأییدشده' : r.verdict === 'رد' ? '❌ رد — دیگر هرگز پخش نمی‌شود' : '⏳ معلق';
  L.push('<b>داوریِ شما:</b> ' + vd + (r.stars ? ' · ' + new Array(r.stars + 1).join('⭐') : '') +
         (r.vibe ? '\nوایب: ' + tgEsc_(r.vibe) : '') + (r.slots ? '\nجایگاه: ' + tgEsc_(r.slots) : '') +
         (r.verdict === 'رد' && r.why ? '\nعلت: ' + tgEsc_(r.why) : ''));
  if (!r.verdict) L.push('<i>ستاره، وایب و جایگاه را بزنید و بعد تأیید یا رد. «✍️» یعنی خودتان بنویسید.</i>');
  var c = L.join('\n');
  return c.length > 1000 ? c.slice(0, 1000) : c;
}

/** کارتِ یک قطعه ⇒ شناسهٔ پیام یا ''. صوت اگر زیرِ سقف است، وگرنه پیوندِ درایو با همان دکمه‌ها. */
function mrSendOne_(b, r) {
  var kb = JSON.stringify(mrKeyboard_(b.id, r)), cap = mrCaption_(b, r), res = null;
  var maxB = Math.max(1, Number(CFG.MR_MAX_MB) || 45) * 1048576, f = null;
  try { f = DriveApp.getFileById(b.id); } catch (e) { f = null; }
  if (f && f.getSize() <= maxB) {
    try {
      res = tgApi_('sendAudio', { chat_id: tgChat_(), audio: f.getBlob(), caption: cap, parse_mode: 'HTML',
                                  title: String(b.name || '').replace(/\.wav$/i, '').slice(0, 60), reply_markup: kb });
    } catch (eA) { res = null; }
    /* `sendAudio` رسماً MP3/M4A است؛ WAVی که نپذیرد، به‌صورتِ فایل همان‌جا پخش می‌شود — پیش از افتادن به پیوند. */
    if (!res || !res.result) {
      try { res = tgApi_('sendDocument', { chat_id: tgChat_(), document: f.getBlob(), caption: cap, parse_mode: 'HTML', reply_markup: kb }); }
      catch (eD) { res = null; }
    }
  }
  if (!res || !res.result) {
    res = tgApi_('sendMessage', { chat_id: tgChat_(), text: cap + '\n\n' + musicUrl_(b.id), parse_mode: 'HTML',
                                  disable_web_page_preview: true, reply_markup: kb });
  }
  return res && res.result ? String(res.result.message_id) : '';
}

/** کارت را با وضعِ تازه بازمی‌نویسد (پیامِ صوتی ⇒ caption، پیامِ متنی ⇒ text). */
function mrRefresh_(chatId, msgId, b, r, isText) {
  var kb = JSON.stringify(mrKeyboard_(b.id, r)), cap = mrCaption_(b, r);
  try {
    if (isText) tgApi_('editMessageText', { chat_id: chatId, message_id: Number(msgId), text: cap + '\n\n' + musicUrl_(b.id),
                                           parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb });
    else tgApi_('editMessageCaption', { chat_id: chatId, message_id: Number(msgId), caption: cap, parse_mode: 'HTML', reply_markup: kb });
  } catch (e) {}
}

/* ───── فرستادن، روزانه ───── */

/** نوبتِ ارسال: آنچه بیشتر پخش شده جلوتر (روی شنونده اثرِ بیشتری دارد)، بی افکت، بی آنچه قبلاً فرستاده یا داوری شده. */
function mrQueue_(bank, map) {
  return (bank || []).filter(function (b) {
    if (String(b.kind || '') === 'افکت') return false;
    var r = map[b.id];
    return !(r && (r.sent || r.verdict));
  }).sort(function (a, b) { return (b.used || 0) - (a.used || 0) || String(a.name).localeCompare(String(b.name)); });
}

function mrSendDue_(hub, st, budgetMs) {
  var t0 = Date.now(), out = { sent: 0, why: '' };
  var today = String(nowStr_()).slice(0, 10);
  if (st.day !== today) { st.day = today; st.dayN = 0; }
  var cap = st.first ? (Number(CFG.MR_PER_DAY) || 10) : (Number(CFG.MR_FIRST_BATCH) || 25);
  if ((Number(st.dayN) || 0) >= cap) { out.why = 'سهمِ امروز (' + cap + ') فرستاده شد'; return out; }
  var map = mrMap_(hub), q = mrQueue_(musicBank_(hub), map);
  if (!q.length) { st.left = 0; out.why = 'همهٔ قطعه‌ها فرستاده یا داوری شده‌اند'; return out; }
  var per = Math.max(1, Number(CFG.MR_PER_RUN) || 4);
  for (var i = 0; i < q.length && out.sent < per && (st.dayN || 0) < cap; i++) {
    if (Date.now() - t0 > budgetMs) break;
    var b = q[i], mid = '';
    try { mid = mrSendOne_(b, null); } catch (e) { out.why = 'ارسال نشد: ' + String(e.message || e).slice(0, 80); break; }
    if (!mid) continue;
    mrSet_(hub, b.id, { name: b.name, sent: nowStr_(), msg: mid, heard: String(b.heard || '').slice(0, 200) });
    mrLog_(hub, b.id, b.name, 'فرستاده شد', mid, '');
    out.sent++; st.dayN = (Number(st.dayN) || 0) + 1;
  }
  if (out.sent && (st.dayN || 0) >= cap) st.first = 1;
  st.left = Math.max(0, q.length - out.sent);
  return out;
}

/* ───── شنیدنِ جواب ───── */

function mrChatOk_(chat) {
  var want = String(tgChat_() || '');
  if (!chat) return false;
  if (/^@/.test(want)) return ('@' + String(chat.username || '')).toLowerCase() === want.toLowerCase();
  return String(chat.id) === want;
}

function mrBankItem_(hub, id) {
  var bank = [];
  try { var sh = (hub || getHub_()).getSheetByName(CFG.MUSIC_TAB || 'موسیقی'); } catch (e) {}
  /* ردشده‌ها از `musicBank_` بیرون‌اند؛ برای کارتِ خودشان ردیفِ خام لازم است. */
  try {
    var v = sh && sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues() : [];
    for (var i = 0; i < v.length; i++) if (String(v[i][MC.ID - 1]) === String(id)) {
      return { id: String(id), name: String(v[i][MC.NAME - 1] || ''), kind: String(v[i][MC.KIND - 1] || ''),
               mood: String(v[i][MC.MOOD - 1] || ''), slots: String(v[i][MC.SLOTS - 1] || ''),
               sec: Number(v[i][MC.SEC - 1]) || 0, used: Number(v[i][MC.USED - 1]) || 0,
               lastAt: String(v[i][MC.LAST - 1] || ''), heard: String(v[i][MC.HEARD - 1] || ''), src: String(v[i][MC.SRC - 1] || '') };
    }
  } catch (e2) {}
  return { id: String(id), name: '', sec: 0, used: 0, heard: '', mood: '', slots: '' };
}

/** یک دکمه ⇒ {text} برای answerCallbackQuery. */
function mrOnButton_(hub, st, data, chatId, msgId, isText) {
  var p = String(data || '').split('|');
  if (p[0] !== 'm' || !p[1]) return { text: '' };
  var id = p[1], op = p[2], a = p[3];
  var b = mrBankItem_(hub, id), r = mrMap_(hub)[id] || {};
  var patch = {}, logOp = '', logVal = '', reply = '';
  if (op === 's') { patch.stars = Math.max(1, Math.min(5, Number(a) || 0)); logOp = 'ستاره'; logVal = patch.stars; }
  else if (op === 'v') {
    var t = mrVibes_()[Number(a)] || '', have = String(r.vibe || '').split(/[،,]\s*/).filter(Boolean);
    var k = have.indexOf(t);
    if (k === -1) have.push(t); else have.splice(k, 1);
    patch.vibe = have.join('، '); logOp = 'وایب'; logVal = patch.vibe;
  }
  else if (op === 'o') {
    var sl = (MR_SLOTS.filter(function (x) { return x.k === a; })[0] || {}).t || '';
    var hs = String(r.slots || '').split(/[،,]\s*/).filter(Boolean), j = hs.indexOf(sl);
    if (j === -1) hs.push(sl); else hs.splice(j, 1);
    patch.slots = hs.join('، '); logOp = 'جایگاه'; logVal = patch.slots;
  }
  else if (op === 'a') { patch.verdict = 'تأیید'; patch.why = ''; patch.whyK = ''; logOp = 'تأیید'; reply = 'تأیید شد'; }
  else if (op === 'u') { patch.verdict = ''; logOp = 'معلق'; reply = 'معلق ماند'; }
  else if (op === 'r') {
    var w = (MR_WHY.filter(function (x) { return x.k === a; })[0] || { k: a, t: a });
    patch.verdict = 'رد'; patch.whyK = w.k; patch.why = w.t; logOp = 'رد'; logVal = w.t; reply = 'رد شد — دیگر پخش نمی‌شود';
  }
  else if (op === 'vx' || op === 'rx') {
    var ask = op === 'vx' ? 'وایبِ این قطعه را بنویسید' : 'علتِ رد را بنویسید (قطعه رد می‌شود)';
    var askTxt = '✍️ ' + ask + ' — «' + String(b.name || r.name || '').replace(/\.wav$/i, '') +
                 '»\nدر پاسخ (Reply) به همین پیام بنویسید.\n#m:' + id + ':' + op;
    /* force_reply در کانال پذیرفته نیست — همان پیام بی آن، و پاسخ (Reply) همان کار را می‌کند. */
    try { tgApi_('sendMessage', { chat_id: chatId, text: askTxt, reply_markup: JSON.stringify({ force_reply: true, selective: true }) }); }
    catch (eFr) { tgApi_('sendMessage', { chat_id: chatId, text: askTxt }); }
    st.hotUntil = Date.now() + (Number(CFG.MR_HOT_MIN) || 10) * 60000;
    return { text: 'منتظرِ نوشتهٔ شما' };
  }
  else return { text: '' };
  var r2 = mrSet_(hub, id, Object.assign({ name: b.name || r.name }, patch));
  mrLog_(hub, id, b.name || r.name, logOp, logVal, '');
  if (msgId) mrRefresh_(chatId, msgId, b, r2, isText);
  if (patch.verdict === 'رد') { mrRootCause_(hub, st, b, r2); mrRejectStreak_(hub, st); }
  st.answeredAt = Date.now();
  st.hotUntil = Date.now() + (Number(CFG.MR_HOT_MIN) || 10) * 60000;
  return { text: reply || (logOp ? logOp + ' ثبت شد' : '') };
}

/** پاسخِ نوشتاری به «✍️» ⇒ وایبِ آزاد یا ردِ با توضیح. */
function mrOnText_(hub, st, msg) {
  var rt = msg && msg.reply_to_message && String(msg.reply_to_message.text || '');
  var m = /#m:([A-Za-z0-9_-]+):(vx|rx)/.exec(rt || '');
  var txt = String((msg && msg.text) || '').trim();
  if (m && txt) {
    var id = m[1], b = mrBankItem_(hub, id), r = mrMap_(hub)[id] || {}, patch = {};
    if (m[2] === 'vx') {
      var have = String(r.vibe || '').split(/[،,]\s*/).filter(Boolean);
      if (have.indexOf(txt) === -1) have.push(txt);
      patch.vibe = have.join('، ');
    } else { patch.verdict = 'رد'; patch.why = txt.slice(0, 300); patch.whyK = mrWhyKind_(txt); }
    var r2 = mrSet_(hub, id, Object.assign({ name: b.name || r.name }, patch));
    mrLog_(hub, id, b.name || r.name, m[2] === 'vx' ? 'وایبِ نوشتاری' : 'رد با توضیح', txt.slice(0, 300), patch.whyK || '');
    if (r2 && r2.msg) mrRefresh_(msg.chat.id, r2.msg, b, r2, false);
    if (patch.verdict === 'رد') { mrRootCause_(hub, st, b, r2); mrRejectStreak_(hub, st); }
    tgApi_('sendMessage', { chat_id: msg.chat.id, text: m[2] === 'vx' ? '✓ وایب ثبت شد: ' + txt : '✓ رد شد و علتش ثبت شد — دیگر پخش نمی‌شود.',
                            reply_to_message_id: msg.message_id });
    st.answeredAt = Date.now();
    return true;
  }
  if (/^\/(music|موسیقی)/.test(txt) || txt === 'موسیقی') { mrMenu_(hub, msg.chat.id); return true; }
  return false;
}

/** «موسیقی نیست» در توضیحِ آزاد هم همان دسته است — ریشه‌یابی نباید به دکمه بند باشد. */
function mrWhyKind_(t) {
  t = String(t || '');
  if (/موسیقی نیست|آهنگ نیست|صدا(ی)? (ناهنجار|عجیب|زشت)|نویز|سر و صدا|گفتار|حرف می‌زن|سخنرانی|خش/.test(t)) return 'nm';
  if (/وایب|حس|حال|غمگین|شاد|نمی‌خوره|نمی‌خورد/.test(t)) return 'vb';
  if (/کیفیت|ضبط|بی‌کیفیت|خراب|قطع/.test(t)) return 'q';
  return 'x';
}

/**
 * ریشه، نه فقط این قطعه: «موسیقی نیست» برای قطعه‌ای که مدل «آهنگ» شنیده بود یعنی شنونده (`musicListen_`) اشتباه کرده —
 * همان دری که «چیزهای خیلی زشت» را به پل‌ها رساند (۹.۵۷). یکی ثبت می‌شود؛ از دومی یافتهٔ کد، و همان لحظه به او گفته می‌شود
 * چه کسی مقصر است، و منبعِ قطعه‌ها کنارش — تا الگو (یک مجموعهٔ archive.org، یک کوتاهیِ مشترک) دیده شود.
 */
function mrRootCause_(hub, st, b, r) {
  if (!r || r.whyK !== 'nm') return false;
  st.nm = st.nm || [];
  st.nm.push({ id: b.id, name: b.name, heard: String(b.heard || '').slice(0, 80), src: String(b.src || '').slice(0, 80), at: nowStr_() });
  st.nm = st.nm.slice(-30);
  var fp = st.nm.filter(function (x) { return heardSays_(x.heard, 'آهنگ'); });
  if (fp.length >= Math.max(1, Number(CFG.MR_NM_FINDING) || 2) && fp.length !== st.nmTold) {
    st.nmTold = fp.length;
    var det = fp.slice(-6).map(function (x) { return '«' + x.name + '» (مدل: ' + x.heard + (x.src ? '؛ منبع: ' + x.src : '') + ')'; }).join(' · ');
    try {
      logSelfFinding_(hub, { priority: 'جدی', category: 'موسیقی', key: 'music-not-music',
        title: 'صاحبِ برنامه ' + fp.length + ' قطعه را «موسیقی نیست» رد کرد که شنوندهٔ مدل «آهنگ» شنیده بود',
        detail: det,
        instruction: 'ریشه در شنیدن است، نه سلیقه: `musicListen_`/`musicAccept_` در src/23_Music.gs. تب‌های «بازبینیِ موسیقی» و ' +
                     '«بازخوردِ موسیقی» را بخوان، همین قطعه‌ها را با `musicProbe_` بسنج و الگوی مشترک (منبع، نرخِ نمونه، سکوت، ' +
                     'یکنواختی) را به سد تبدیل کن؛ قطعه‌های هم‌الگوی تأییدنشده را دوباره بشنو.', owner: ROWNER_CODE });
    } catch (eF) {}
    try { tgSend_('🎵 ' + fp.length + ' قطعه را «موسیقی نیست» رد کردید که مدل «آهنگ» شنیده بود — یعنی خطا از شنوندهٔ مدل است. ' +
                  'یافتهٔ کد ثبت شد تا ریشه‌اش درست شود:\n' + det); } catch (eT) {}
  }
  return true;
}

/* ───── منو (فهرست و آمار) ───── */

/** `withBank` فقط برای منوی تلگرام — وضعیت و سلامت بانک را دوباره نمی‌خوانند (هابِ ۲۹ مگابایتی؛ run_health ۱۱.۱). */
function mrSummary_(hub, withBank) {
  var map = mrMap_(hub), n = { ok: 0, no: 0, wait: 0, unsent: null };
  Object.keys(map).forEach(function (k) { var v = map[k].verdict; if (v === 'تأیید') n.ok++; else if (v === 'رد') n.no++; else if (map[k].sent) n.wait++; });
  if (withBank) { try { n.unsent = mrQueue_(musicBank_(hub), map).length; } catch (e) { n.unsent = null; } }
  else n.unsent = mrState_().left == null ? null : Number(mrState_().left);
  return n;
}

function mrMenu_(hub, chatId) {
  var n = mrSummary_(hub, true), d = function (x) { return faDigitsOut_(String(x)); };
  tgApi_('sendMessage', { chat_id: chatId,
    text: '🎵 بانکِ موسیقی\n✅ تأییدشده: ' + d(n.ok) + '\n❌ ردشده: ' + d(n.no) + '\n⏳ فرستاده و بی‌جواب: ' + d(n.wait) +
          '\n📭 هنوز فرستاده نشده: ' + (n.unsent == null ? '؟' : d(n.unsent)),
    reply_markup: JSON.stringify({ inline_keyboard: [[{ text: '۵ تای بعدی را بفرست', callback_data: 'mm|more' }]] }) });
}

/* ───── تریگر ───── */

/**
 * هر چند دقیقه: جواب‌ها را بخوان، کارت‌های امروز را بفرست، و اگر او در حالِ بازبینی است، کمی بیشتر گوش بده.
 * در سکوت فقط یک `getUpdates`ِ بی‌انتظار.
 */
function tgPollTick() {
  if (!mrOn_()) return null;
  /* شاهدِ اجرا (۸.۱۱) — هر تریگرِ زمان‌بندی‌شده؛ کشته‌شدنش در «اجرای ناتمام» دیده می‌شود. */
  runEnter_('tgPollTick');
  try { return tgPollRun_(); } finally { runExit_('tgPollTick'); }
}

/**
 * «دکمه‌ها رو می‌زنم هیچ تأثیری نداره» (۹.۷۷): این‌جا قفلِ **مشترکِ پروژه** گرفته می‌شد — همان قفلی که ساختِ صدا،
 * پل، جاسازی و همگام‌سازی چند دقیقه نگهش می‌دارند. هر بار یکی از آن‌ها می‌دوید، این تابع بی‌صدا `null` برمی‌گرداند
 * و کلیک‌ها در صفِ تلگرام می‌ماندند. حالا یک اجاره (lease) فقط میانِ خودِ همین تریگر — جز خودش با کسی برخورد ندارد.
 */
function mrLease_(take) {
  var p = props_(), k = 'MUSIC_REVIEW_LEASE', now = Date.now();
  if (!take) { try { p.deleteProperty(k); } catch (e) {} return true; }
  var held = Number(p.getProperty(k)) || 0;
  if (held && now - held < ((Number(CFG.MR_HOT_RUN_SEC) || 50) + 40) * 1000) return false;
  p.setProperty(k, String(now));
  return true;
}

/** جوابِ فوریِ دکمه — پیش از هر خواندنِ هاب، تا چرخشِ دکمه همان لحظه بایستد. */
function mrAckText_(data) {
  var p = String(data || '').split('|');
  if (p[0] === 'mm') return 'تا چند دقیقهٔ دیگر';
  return ({ s: '⭐ ستاره ثبت شد', v: 'وایب ثبت شد', o: 'جایگاه ثبت شد', a: '✅ تأیید شد', u: 'معلق ماند',
            r: '❌ رد شد — دیگر پخش نمی‌شود', vx: 'منتظرِ نوشتهٔ شما', rx: 'منتظرِ نوشتهٔ شما' })[p[2]] || '';
}

function tgPollRun_() {
  if (!mrLease_(true)) return null;
  var st = mrState_(), out = { got: 0, sent: 0 };
  try {
    var t0 = Date.now(), hub = null;
    var getHub = function () { return hub || (hub = getHub_()); };
    var hot = function () { return Number(st.hotUntil) > Date.now(); };
    var maxRun = Math.max(20, Number(CFG.MR_HOT_RUN_SEC) || 50) * 1000;
    do {
      var wait = hot() ? Math.min(20, Math.max(0, Math.floor((maxRun - (Date.now() - t0)) / 1000) - 5)) : 0;
      var res = null, tCall = Date.now();
      try { res = tgApi_('getUpdates', { offset: Number(st.offset) || 0, timeout: wait, allowed_updates: ['callback_query', 'message', 'channel_post'] }); }
      catch (eU) { st.pollWhy = String(eU.message || eU).slice(0, 120); break; }
      st.pollWhy = '';
      var ups = (res && res.result) || [];
      /* پاسخِ خالیِ بی‌درنگ یعنی long-poll کار نکرده — بی این، حلقهٔ «داغ» تا سقفِ اجرا بی‌وقفه می‌چرخید. */
      var idle = !ups.length && Date.now() - tCall < 1000;
      for (var i = 0; i < ups.length; i++) {
        var u = ups[i];
        st.offset = Number(u.update_id) + 1;
        try {
          if (u.callback_query) {
            var cq = u.callback_query, m = cq.message || {};
            if (!mrChatOk_(m.chat)) continue;
            try { tgApi_('answerCallbackQuery', { callback_query_id: cq.id, text: mrAckText_(cq.data) }); } catch (eA) {}
            st.hotUntil = Date.now() + (Number(CFG.MR_HOT_MIN) || 10) * 60000;
            if (String(cq.data || '') === 'mm|more') { st.dayN = Math.max(0, (Number(st.dayN) || 0) - 5); st.first = 1; st.sendTry = 0; }
            else mrOnButton_(getHub(), st, cq.data, m.chat.id, m.message_id, !m.audio && !m.document);
            st.clickAt = Date.now();
            out.got++;
          } else {
            /* چتِ موتور ممکن است کانال باشد: آنجا نوشتهٔ او `channel_post` است، نه `message`. */
            var um = u.message || u.channel_post;
            if (um && mrChatOk_(um.chat) && mrOnText_(getHub(), st, um)) out.got++;
          }
        } catch (eH) { st.lastWhy = String(eH.message || eH).slice(0, 120); }
      }
      mrSave_(st);
      if (idle) break;
    } while (hot() && Date.now() - t0 < maxRun - 8000);
    /* تریگر هر دقیقه است (۹.۷۷)؛ بازکردنِ هابِ ۲۹ مگابایتی هر دقیقه سهمیهٔ روزانهٔ اجرا را می‌خورد. پس فرستادن فقط
       وقتی سهمِ امروز پر نیست و ده دقیقه از تلاشِ قبلی گذشته — و سهمِ پر بی هیچ خواندنی دانسته می‌شود. */
    var today = String(nowStr_()).slice(0, 10);
    if (st.day !== today) { st.day = today; st.dayN = 0; }
    var cap = st.first ? (Number(CFG.MR_PER_DAY) || 10) : (Number(CFG.MR_FIRST_BATCH) || 25);
    if ((Number(st.dayN) || 0) >= cap) st.sendWhy = 'سهمِ امروز (' + cap + ') فرستاده شد';
    else if (Date.now() - t0 < maxRun && Date.now() - (Number(st.sendTry) || 0) > 10 * 60000) {
      st.sendTry = Date.now();
      var sd = mrSendDue_(getHub(), st, 40000);
      out.sent = sd.sent; st.sendWhy = sd.why;
      if (sd.sent) st.lastSentAt = Date.now();
    }
    mrNag_(st);
    st.polledAt = Date.now();
    mrSave_(st);
  } catch (e) {
    st.lastWhy = String(e.message || e).slice(0, 140); mrSave_(st);
  } finally { mrLease_(false); }
  return out;
}

/**
 * «اگر کم‌کاری کردم و یادم رفت … یا همه رو رد زدم، این رو هم باید تو تلگرام سریع و فوری بگی» — یک بار در روز برای
 * بی‌جوابی، و همان لحظه برای «بیشترِ اخیرها رد».
 */
function mrNag_(st) {
  var now = Date.now(), H = Math.max(1, Number(CFG.MR_NAG_H) || 24) * 3600000;
  var lastSent = Number(st.lastSentAt) || 0, ans = Number(st.answeredAt) || 0;
  if (lastSent && now - lastSent > H && ans < lastSent && now - (Number(st.nagAt) || 0) > H) {
    try { tgSend_('🎵 ' + faDigitsOut_(String(Math.round((now - lastSent) / 3600000))) + ' ساعت است به موسیقی‌های فرستاده جوابی نداده‌اید. ' +
                  'بی‌جواب‌ها معلق می‌مانند و موتور با همان داوریِ مدل انتخاب می‌کند. «/music» فهرست را نشان می‌دهد.'); st.nagAt = now; } catch (e) {}
  }
  return true;
}

/** «همه را رد کردم» — از تب، نه از حافظه: از ۱۰ داوریِ آخر، ۸ یا بیشتر رد ⇒ همان لحظه، یک بار برای همان ده‌تا. */
function mrRejectStreak_(hub, st) {
  var m = mrMap_(hub), L = Object.keys(m).map(function (k) { return m[k]; }).filter(function (r) { return r.verdict; })
    .sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); }).slice(-10);
  var no = L.filter(function (r) { return r.verdict === 'رد'; }).length;
  if (L.length >= 10 && no >= 8) {
    var sig = L.map(function (r) { return r.row; }).join(',');
    if (st.streakSig !== sig) {
      st.streakSig = sig;
      try { tgSend_('🎵 از ده داوریِ آخرِ شما ' + faDigitsOut_(String(no)) + ' تا رد بود. یعنی بانک بیشتر چیزی دارد که نمی‌خواهید — ' +
                    'جست‌وجوی موسیقیِ تازه از همین علت‌ها یاد می‌گیرد (تب «بازخوردِ موسیقی»).'); } catch (e) {}
      return true;
    }
  }
  return false;
}

/* ───── وضعیت و سلامت ───── */

function mrStatus_() {
  var st = mrState_(), out = { on: mrOn_(), day: st.day || '', dayN: st.dayN || 0, offset: st.offset || 0,
                               polledAt: st.polledAt ? Utilities.formatDate(new Date(st.polledAt), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm') : '',
                               clickAt: st.clickAt ? Utilities.formatDate(new Date(st.clickAt), CFG.TIMEZONE, 'yyyy-MM-dd HH:mm') : '',
                               sendWhy: st.sendWhy || '', pollWhy: st.pollWhy || '', lastWhy: st.lastWhy || '', notMusic: (st.nm || []).length };
  try {
    var n = mrSummary_(null);
    out.ok = n.ok; out.no = n.no; out.wait = n.wait; out.unsent = n.unsent;
    out.line = '🎵 بازبینیِ موسیقی در تلگرام: ' + n.ok + ' تأیید، ' + n.no + ' رد، ' + n.wait + ' بی‌جواب، ' + (n.unsent == null ? '؟' : n.unsent) + ' هنوز فرستاده‌نشده' +
               (out.notMusic ? ' · «موسیقی نیست»: ' + out.notMusic : '') + (out.pollWhy ? ' · ⚠️ خواندنِ تلگرام: ' + out.pollWhy : '');
  } catch (e) { out.line = '🎵 بازبینیِ موسیقی: ' + String(e.message || e).slice(0, 80); }
  return out;
}

function mrHealth_(problems, notes) {
  if (!mrOn_()) return null;
  var s = mrStatus_(), st = mrState_();
  if (s.line) notes.push(s.line);
  var idle = Date.now() - (Number(st.polledAt) || 0);
  if (!st.polledAt || idle > 3 * 3600000) problems.push('🎵 خواندنِ دکمه‌های تلگرام ' + (st.polledAt ? Math.round(idle / 3600000) + ' ساعت است' : 'هرگز') + ' ندویده (tgPollTick)');
  if (s.pollWhy) problems.push('🎵 تلگرام جوابِ getUpdates نداد: ' + s.pollWhy);
  return s;
}
