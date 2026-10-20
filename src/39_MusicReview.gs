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
                  'آخرین تغییر', 'شناسهٔ پیام', 'شنیدنِ مدل', 'بازهٔ استفاده (ثانیه)', 'برداشت از توضیحِ شما', 'یادداشتِ شما'];
var MRC = { ID: 1, NAME: 2, SENT: 3, VERD: 4, STAR: 5, VIBE: 6, SLOTS: 7, WHY: 8, WHYK: 9, AT: 10, MSG: 11, HEARD: 12, RANGE: 13, READ: 14, NOTE: 15 };
var MRL_HEADERS = ['زمان', 'شناسهٔ فایل', 'نام', 'کار', 'مقدار', 'توضیح'];

/** دسته‌های رد — `nm` همان است که ریشه‌یابی می‌خواهد. */
var MR_WHY = [{ k: 'nm', t: 'موسیقی نیست / ناهنجار' }, { k: 'vb', t: 'حس و وایب بد' }, { k: 'q', t: 'کیفیتِ بد' }];
/* افکت (۹.۷۹): «موسیقی نیست» برایش بی‌معناست؛ پرسشِ درست این است که صدا با **نامِ کتابخانه‌اش** می‌خواند یا نه. */
var MR_WHY_SFX = [{ k: 'wl', t: 'با نامش نمی‌خواند' }, { k: 'ug', t: 'ناخوشایند' }, { k: 'q', t: 'کیفیتِ بد' }];
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
                  msg: String(v[i][MRC.MSG - 1] || ''), at: String(v[i][MRC.AT - 1] || ''),
                  heard: String(v[i][MRC.HEARD - 1] || ''), range: String(v[i][MRC.RANGE - 1] || ''),
                  read: String(v[i][MRC.READ - 1] || ''), note: String(v[i][MRC.NOTE - 1] || '') };
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
  /* «فلان ثانیه‌ها و دقیقه‌ها رو در نظر بگیره و بقیه رو نه» (۹.۸۱) — برش فقط از همین بازه. */
  var rg = mrRangeParse_(r.range);
  if (rg) b.range = rg;
  if (r.note) b.ownerNote = r.note;   // ۹.۸۲: هر بار که این قطعه انتخاب می‌شود خوانده می‌شود
  return b;
}

/* ───── سلیقه از ستاره‌ها (۹.۷۸) ─────
 * «وقتی ستاره تعیین می‌کنم … باید تأثیر داشته باشن که بفهمی بعداً چه چیزایی رو دوست دارم یا ندارم، حتی اگر موسیقی باشن.»
 * ستاره فقط امتیازِ همان قطعه نبود و نباید باشد: از وایب‌هایی که زده و از شنیدنِ مدل (ساز، سبک، حال) یک نیم‌رخ ساخته
 * می‌شود — هر واژه با وزنِ (ستاره − ۳)، تأیید +۱، رد −۲ — و همان نیم‌رخ قطعه‌های **داوری‌نشده** را هم جلو یا عقب می‌برد،
 * به مدلِ انتخاب گفته می‌شود، و جست‌وجوی قطعهٔ تازه را جهت می‌دهد. */
var MR_TASTE_STOP = ['آهنگ', 'موسیقی', 'قطعه', 'با', 'و', 'در', 'از', 'به', 'که', 'یک', 'است', 'این', 'برای', 'بی', 'کمی', 'خیلی'];

function mrTokens_(txt) {
  var seen = {}, out = [];
  String(txt || '').split(/[\s،,؛;:\-—–|()«»\.\/]+/).forEach(function (w) {
    w = w.trim();
    if (w.length < 2 || MR_TASTE_STOP.indexOf(w) !== -1 || /^[\d۰-۹]+$/.test(w) || seen[w]) return;
    seen[w] = 1; out.push(w);
  });
  return out;
}

function mrTasteOf_(map) {
  var t = {}, n = 0;
  Object.keys(map || {}).forEach(function (k) {
    var r = map[k], w = (r.stars ? r.stars - 3 : 0) + (r.verdict === 'تأیید' ? 1 : 0) + (r.verdict === 'رد' ? -2 : 0);
    if (!w) return;
    n++;
    mrTokens_(r.vibe + ' ' + r.heard + ' ' + (r.note || '')).forEach(function (x) { t[x] = (t[x] || 0) + w; });
  });
  return { w: t, n: n };
}

/** چقدر این قطعه به آنچه او دوست دارد می‌ماند — میانگینِ وزنِ واژه‌های مشترک، در بازهٔ ‎−۵ تا ‎+۵. */
function mrLike_(taste, b) {
  if (!taste || !taste.n) return 0;
  var toks = mrTokens_((b.mood || '') + ' ' + (b.heard || '')), sum = 0, hit = 0;
  toks.forEach(function (x) { if (taste.w[x]) { sum += taste.w[x]; hit++; } });
  if (!hit) return 0;
  return Math.max(-5, Math.min(5, sum / Math.sqrt(hit)));
}

/** برای خواندنِ آدم و مدل: بیشترین مثبت‌ها و منفی‌ها. */
function mrTasteWords_(taste, k) {
  var e = Object.keys((taste && taste.w) || {}).map(function (x) { return [x, taste.w[x]]; });
  k = k || 6;
  return { like: e.filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, k).map(function (x) { return x[0]; }),
           dislike: e.filter(function (x) { return x[1] < 0; }).sort(function (a, b) { return a[1] - b[1]; }).slice(0, k).map(function (x) { return x[0]; }) };
}

function mrTasteLine_(taste) {
  var tw = mrTasteWords_(taste);
  if (!tw.like.length && !tw.dislike.length) return '';
  return (tw.like.length ? 'دوست دارد: ' + tw.like.join('، ') : '') + (tw.like.length && tw.dislike.length ? ' · ' : '') +
         (tw.dislike.length ? 'دوست ندارد: ' + tw.dislike.join('، ') : '');
}

function mrSet_(hub, id, patch) {
  var sh = ensureTab_(hub, CFG.MR_TAB || 'بازبینیِ موسیقی', MR_HEADERS);
  var m = mrMap_(hub), r = m[id];
  var row = r ? r.row : sh.getLastRow() + 1;
  var cur = r ? sh.getRange(row, 1, 1, MR_HEADERS.length).getValues()[0] : MR_HEADERS.map(function () { return ''; });
  cur[MRC.ID - 1] = id;
  var keys = { name: MRC.NAME, sent: MRC.SENT, verdict: MRC.VERD, stars: MRC.STAR, vibe: MRC.VIBE, slots: MRC.SLOTS,
               why: MRC.WHY, whyK: MRC.WHYK, msg: MRC.MSG, heard: MRC.HEARD, range: MRC.RANGE, read: MRC.READ, note: MRC.NOTE };
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

function mrKeyboard_(id, r, kind, rangeUrl) {
  r = r || {};
  var isSfx = String(kind || '') === 'افکت';
  var cb = function (op, a) { return 'm|' + id + '|' + op + (a == null ? '' : '|' + a); };
  var rows = [];
  var st = [];
  /* ۹.۷۸: «به اندازهٔ همون ستاره‌ای که می‌زنم تا اونجا روشن باشه» — ستاره‌های زده‌شده پر، بقیه خالی. */
  for (var s = 1; s <= 5; s++) st.push({ text: (s <= (r.stars || 0) ? '⭐' : '☆') + faDigitsOut_(String(s)), callback_data: cb('s', s) });
  rows.push(st);
  var vb = isSfx ? [] : mrVibes_(), have = String(r.vibe || '').split(/[،,]\s*/);   // افکت وایب و جایگاه ندارد؛ جایش را واژه تعیین می‌کند
  for (var i = 0; i < vb.length; i += 4) {
    rows.push(vb.slice(i, i + 4).map(function (t, j) {
      return { text: (have.indexOf(t) !== -1 ? '✅ ' : '') + t, callback_data: cb('v', i + j) };
    }));
  }
  if (!isSfx) rows.push([{ text: '✍️ وایبِ دیگر', callback_data: cb('vx') }]);
  rows.push([{ text: '📝 یادداشت' + (r.note ? ' (+)' : ''), callback_data: cb('nx') }, { text: '⌨️ بازه با نوشتن', callback_data: cb('ux') }]);
  /* ۹.۸۳: بازه از روی خودِ پخش — صفحهٔ پخش‌کننده؛ نشانی نیست (ربات یا صفحه نامعلوم) ⇒ فقط نوشتن. */
  if (rangeUrl) rows.push([{ text: '✂️ بازه با پخش‌کننده' + (r.range ? ' (✓)' : ''), url: rangeUrl }]);
  if (!isSfx) rows.push(MR_SLOTS.map(function (x) {
    return { text: (String(r.slots || '').indexOf(x.t) !== -1 ? '✅ ' : '') + x.ic + ' ' + x.t, callback_data: cb('o', x.k) };
  }));
  if (r.verdict === 'رد') {
    rows.push([{ text: '↩️ برگرداندن (معلق)', callback_data: cb('u') }]);
  } else {
    rows.push([{ text: r.verdict === 'تأیید' ? '✅ تأیید شد' : '✅ تأیید', callback_data: cb('a') },
               { text: '⏳ بعداً', callback_data: cb('u') }]);
    rows.push((isSfx ? MR_WHY_SFX : MR_WHY).map(function (w) { return { text: '❌ ' + w.t, callback_data: cb('r', w.k) }; }));
    rows.push([{ text: '✍️ رد با توضیح', callback_data: cb('rx') }]);
  }
  return { inline_keyboard: rows };
}

function mrCaption_(b, r) {
  r = r || {};
  var d = function (x) { return faDigitsOut_(String(x)); };
  var sfx = String(b.kind || '') === 'افکت';
  var L = [(sfx ? '🔊 جلوهٔ صوتی · ' : '🎵 ') + '<b>' + tgEsc_(String(b.name || '').replace(/\.wav$/i, '')) + '</b>',
           d(Math.round(b.sec || 0)) + ' ثانیه' + (b.used ? ' · ' + d(b.used) + ' بار پخش شده' : ' · هنوز پخش نشده') +
           (b.lastAt ? ' · آخرین: ' + tgEsc_(String(b.lastAt).slice(0, 10)) : ''),
           'شنیدنِ مدل: ' + tgEsc_(String(b.heard || '—').slice(0, 120)),
           /* ۹.۷۹: «باید بررسی شه و برچسب بخوره از نظرِ اینکه مجازه یا نه» */
           '⚖️ مجوز: ' + tgEsc_(b.lic || (typeof musicLicense_ === 'function' ? musicLicense_(String(b.src || '') + ' ' + String(b.note || '')).label : '—')),
           (sfx ? 'دسته و نامِ کتابخانه: ' + tgEsc_(String(b.mood || '—').slice(0, 160))
                : 'برچسبِ فعلی: ' + tgEsc_((String(b.mood || '—') + ' · ' + String(b.slots || '—')).slice(0, 160))), ''];
  var vd = r.verdict === 'تأیید' ? '✅ تأییدشده' : r.verdict === 'رد' ? '❌ رد — دیگر هرگز پخش نمی‌شود' : '⏳ معلق';
  L.push('<b>داوریِ شما:</b> ' + vd + (r.stars ? ' · ' + new Array(r.stars + 1).join('⭐') : '') +
         (r.vibe ? '\nوایب: ' + tgEsc_(r.vibe) : '') + (r.slots ? '\nجایگاه: ' + tgEsc_(r.slots) : '') +
         (r.verdict === 'رد' && r.why ? '\nعلت: ' + tgEsc_(r.why) : '') +
         (r.range ? '\n✂️ فقط ثانیهٔ ' + tgEsc_(faDigitsOut_(String(r.range).replace('-', ' تا '))) : '') +
         (r.read ? '\n🧠 برداشت: ' + tgEsc_(String(r.read).slice(0, 160)) : '') +
         (r.note ? '\n📝 یادداشتِ شما: ' + tgEsc_(String(r.note).slice(-220)) : ''));
  if (!r.verdict) L.push('<i>ستاره، وایب و جایگاه را بزنید و بعد تأیید یا رد. «✍️» یعنی خودتان بنویسید.</i>');
  var c = L.join('\n');
  return c.length > 1000 ? c.slice(0, 1000) : c;
}

/** کارتِ یک قطعه ⇒ شناسهٔ پیام یا ''. صوت اگر زیرِ سقف است، وگرنه پیوندِ درایو با همان دکمه‌ها. */
function mrSendOne_(b, r) {
  var ru = ''; try { ru = mrRangeUrl_(b, r, true); } catch (eRu) { ru = ''; }
  var kb = JSON.stringify(mrKeyboard_(b.id, r, b.kind, ru)), cap = mrCaption_(b, r), res = null;
  var maxB = Math.max(1, Number(CFG.MR_MAX_MB) || 45) * 1048576, f = null;
  try { f = DriveApp.getFileById(b.id); } catch (e) { f = null; }
  /* ۹.۷۹: «چند بار ۵ تای بعدی رو زدم و ده دقیقه گذشته» — هر کارتِ WAV دو بار بارگذاری می‌شد: یک بار به sendAudio که
     WAV را نمی‌پذیرد، و دوباره به sendDocument. فایلِ ده‌مگابایتی دو بار یعنی سهمِ ۴۰ ثانیه‌ایِ هر اجرا برای یکی‌دو کارت. */
  var isWav = f && /\.wav$/i.test(String(f.getName() || b.name || ''));
  if (f && f.getSize() <= maxB && !isWav) {
    try {
      res = tgApi_('sendAudio', { chat_id: tgChat_(), audio: f.getBlob(), caption: cap, parse_mode: 'HTML',
                                  title: String(b.name || '').replace(/\.wav$/i, '').slice(0, 60), reply_markup: kb });
    } catch (eA) { res = null; }
    /* `sendAudio` رسماً MP3/M4A است؛ WAVی که نپذیرد، به‌صورتِ فایل همان‌جا پخش می‌شود — پیش از افتادن به پیوند. */
  }
  if (f && f.getSize() <= maxB) {
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
  var ru = ''; try { ru = mrRangeUrl_(b, r, false); } catch (eRu) { ru = ''; }
  var kb = JSON.stringify(mrKeyboard_(b.id, r, b.kind, ru)), cap = mrCaption_(b, r);
  try {
    if (isText) tgApi_('editMessageText', { chat_id: chatId, message_id: Number(msgId), text: cap + '\n\n' + musicUrl_(b.id),
                                           parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kb });
    else tgApi_('editMessageCaption', { chat_id: chatId, message_id: Number(msgId), caption: cap, parse_mode: 'HTML', reply_markup: kb });
  } catch (e) {}
}

/* ───── فرستادن، روزانه ───── */

/** نوبتِ ارسال: آنچه بیشتر پخش شده جلوتر (روی شنونده اثرِ بیشتری دارد)، بی افکت، بی آنچه قبلاً فرستاده یا داوری شده. */
function mrQueue_(bank, map) {
  var open = (bank || []).filter(function (b) { var r = map[b.id]; return !(r && (r.sent || r.verdict)); });
  var by = function (a, b) { return (b.used || 0) - (a.used || 0) || String(a.name).localeCompare(String(b.name)); };
  var mus = open.filter(function (b) { return String(b.kind || '') !== 'افکت'; }).sort(by);
  /* ۹.۷۹: جلوه‌های صوتی هم با همان کارت — هر چهارمین کارت یکی، تا بانکِ هزارتاییِ افکت صفِ موسیقی را نبلعد. */
  var sfx = open.filter(function (b) { return String(b.kind || '') === 'افکت'; }).sort(by);
  var out = [];
  while (mus.length || sfx.length) {
    for (var k = 0; k < 3 && mus.length; k++) out.push(mus.shift());
    if (sfx.length) out.push(sfx.shift());
    if (!mus.length) { out = out.concat(sfx); sfx = []; }
  }
  return out;
}

function mrSendDue_(hub, st, budgetMs) {
  var t0 = Date.now(), out = { sent: 0, why: '' };
  var today = String(nowStr_()).slice(0, 10);
  if (st.day !== today) { st.day = today; st.dayN = 0; }
  var cap = st.first ? (Number(CFG.MR_PER_DAY) || 10) : (Number(CFG.MR_FIRST_BATCH) || 25);
  /* «۵ تای بعدی» (۹.۷۹) از سقفِ روز جداست. تا ۹.۷۸ دکمه `dayN` را پنج‌تا کم می‌کرد و هم‌زمان `first` را می‌زد — سقف از ۲۵ به
     ۱۰ می‌افتاد و `dayN`ِ ۲۰ همچنان بالای آن بود، پس دکمه هیچ کارتی نمی‌فرستاد. */
  var more = Number(st.more) || 0;
  if ((Number(st.dayN) || 0) >= cap && !more) { out.why = 'سهمِ امروز (' + cap + ') فرستاده شد'; return out; }
  var map = mrMap_(hub), q = mrQueue_(musicBank_(hub), map);
  if (!q.length) { st.left = 0; out.why = 'همهٔ قطعه‌ها فرستاده یا داوری شده‌اند'; return out; }
  var per = Math.max(1, Number(CFG.MR_PER_RUN) || 4);
  for (var i = 0; i < q.length && out.sent < per && ((st.dayN || 0) < cap || out.sent < more); i++) {
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

/* ═══ توضیحِ صاحبِ برنامه خوانده می‌شود، نه فقط بایگانی (۹.۸۱) ═══
 * «وقتی رد با توضیح می‌زنم بهش حتماً توجه بشه» — او جلوه‌ای را که کارتِ موسیقی گرفته بود رد کرد و نوشت که جلوهٔ صوتی است
 * و قبولش دارد، ولی نمی‌خواهد با موسیقی اشتباه گرفته شود. تا ۹.۸۰ هر «رد با توضیح» یعنی «رد»، و آن قطعه برای همیشه از هر
 * دو بانک بیرون می‌رفت — خلافِ آنچه نوشته بود. حالا توضیح خوانده و اجرا می‌شود: جلوه ⇒ بانکِ جلوه، پذیرفته · موسیقی ⇒
 * بانکِ موسیقی · بازهٔ زمانی ⇒ فقط همان تکه · رد ⇒ رد. و «فهمیدم: …» به خودش گفته می‌شود تا اگر غلط فهمیدم، همان لحظه ببیند. */

/** «از ثانیهٔ ۱۰ تا ۴۰»، «۰:۳۰ تا ۱:۲۰»، «دقیقهٔ ۱ تا ۲»، «از 15 ثانیه تا دقیقه 2» ⇒ {from, to} به ثانیه؛ وگرنه null. */
function mrRangeParse_(txt) {
  var t = String(txt || '').replace(/[۰-۹]/g, function (d) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
    .replace(/[٠-٩]/g, function (d) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }).replace(/٫/g, '.');
  var m = /(ثانیه|دقیقه)?[ٔه‌ی\s]*(\d+(?::\d{1,2})?(?:\.\d+)?)\s*(ثانیه|دقیقه|sec|min)?[ٔه‌ی\s]*(?:تا|-|–|—|to)\s*(ثانیه|دقیقه)?[ٔه‌ی\s]*(\d+(?::\d{1,2})?(?:\.\d+)?)\s*(ثانیه|دقیقه|sec|min)?/i.exec(t);
  if (!m) return null;
  var sec = function (v, u) {
    if (/:/.test(v)) { var q = v.split(':'); return Number(q[0]) * 60 + Number(q[1]); }
    return Number(v) * (/^(دقیقه|min)$/i.test(u || '') ? 60 : 1);
  };
  /* واحدِ هر سر: آنچه کنارش آمده؛ وگرنه واحدِ سرِ دیگر («دقیقهٔ ۱ تا ۲»)؛ وگرنه ثانیه. */
  var u1 = m[1] || m[3] || '', u2 = m[4] || m[6] || '';
  var from = sec(m[2], u1 || u2), to = sec(m[5], u2 || u1);
  if (!(to > from) || from < 0) return null;
  return { from: Math.round(from * 10) / 10, to: Math.round(to * 10) / 10 };
}

/** برداشت از توضیح: {act: 'رد'|'جلوه'|'موسیقی'|'بازه', range, say}. قاعده اول؛ مدل فقط برای آنچه قاعده نمی‌فهمد. */
function mrReadWhy_(txt, b) {
  var t = String(txt || ''), isSfx = String((b && b.kind) || '') === 'افکت';
  var rg = mrRangeParse_(t), act = '';
  var saysSfx = /(جلوه|افکت|sfx|sound ?effect)/i.test(t) && !/(جلوه|افکت)[^.،]{0,12}(نیست|نمی)/.test(t);
  var saysMusic = /(آهنگه|آهنگ است|موسیقیه|موسیقی است|به عنوانِ? موسیقی قبول)/.test(t) && !/موسیقی نیست/.test(t);
  var keep = /(قبول|خوبه|خوب است|خوب بود|مشکلی نداره|نگه ?دار|دوست دارم)/.test(t);
  if (!isSfx && saysSfx) act = 'جلوه';
  else if (isSfx && saysMusic) act = 'موسیقی';
  else if (rg && !/(اصلاً|کلاً|به هیچ)/.test(t)) act = 'بازه';
  if (!act && keep && CFG.MUSIC_AUTO !== false) {
    try {
      var r = geminiText_('صاحبِ یک پادکست زیرِ یک قطعهٔ ' + (isSfx ? 'جلوهٔ صوتی' : 'موسیقی') + ' دکمهٔ «رد با توضیح» را زد و نوشت:\n«' + t +
        '»\nمنظورش کدام است؟ فقط یکی: «رد» (اصلاً نمی‌خواهد)، «جلوه» (به‌عنوانِ جلوهٔ صوتی می‌خواهد)، «موسیقی» (به‌عنوانِ موسیقی می‌خواهد)، ' +
        '«بازه» (فقط تکه‌ای از آن را می‌خواهد).',
        { type: 'object', properties: { act: { type: 'string' } }, required: ['act'] }, 64);
      var a = String((r && r.act) || '').trim();
      if (/^(رد|جلوه|موسیقی|بازه)$/.test(a)) act = a;
    } catch (e) {}
  }
  act = act || 'رد';
  if (act === 'بازه' && !rg) act = 'رد';
  var rgTxt = rg ? 'فقط از ثانیهٔ ' + faDigitsOut_(String(rg.from)) + ' تا ' + faDigitsOut_(String(rg.to)) : '';
  var say = act === 'جلوه' ? 'این جلوهٔ صوتی است، نه موسیقی — از بانکِ موسیقی بیرون رفت و در بانکِ جلوه‌ها پذیرفته ماند'
          : act === 'موسیقی' ? 'این موسیقی است، نه جلوهٔ صوتی — به بانکِ موسیقی رفت و پذیرفته ماند'
          : act === 'بازه' ? rgTxt + ' استفاده می‌شود؛ بقیه نه'
          : 'رد شد و دیگر پخش نمی‌شود';
  if (rg && (act === 'جلوه' || act === 'موسیقی')) say += '؛ و ' + rgTxt;
  return { act: act, range: rg, say: say };
}

/** نوعِ قطعه در تبِ «موسیقی» — همان ستونی که `musicBank_` و `sfxAllow_` می‌خوانند. */
function mrSetKind_(hub, id, kind) {
  var sh = (hub || getHub_()).getSheetByName(CFG.MUSIC_TAB || 'موسیقی');
  if (!sh || sh.getLastRow() < 2) return false;
  var ids = sh.getRange(2, MC.ID, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) {
    sh.getRange(i + 2, MC.KIND).setValue(kind);
    if (kind === 'افکت') sh.getRange(i + 2, MC.SLOTS).setValue('میانه');
    return true;
  }
  return false;
}

/** توضیح را اجرا کن ⇒ وصلهٔ تبِ بازبینی. */
function mrActOnWhy_(hub, id, b, txt) {
  var rd = mrReadWhy_(txt, b);
  var patch = { why: String(txt).slice(0, 300), whyK: mrWhyKind_(txt), read: rd.say.slice(0, 200) };
  if (rd.range) patch.range = rd.range.from + '-' + rd.range.to;
  if (rd.act === 'جلوه') { mrSetKind_(hub, id, 'افکت'); patch.verdict = 'تأیید'; patch.whyK = 'sfx'; patch.slots = ''; }
  else if (rd.act === 'موسیقی') { mrSetKind_(hub, id, 'موسیقی'); patch.verdict = 'تأیید'; patch.whyK = 'mus'; }
  else if (rd.act === 'بازه') { patch.verdict = 'تأیید'; patch.whyK = 'rng'; }
  else patch.verdict = 'رد';
  return { patch: patch, read: rd };
}

/** ردهای نوشتاریِ پیشین که هنوز «برداشت» ندارند ⇒ دوباره خوانده و اجرا، و یک پیامِ جمع‌بندی. */
function mrRereadWhys_(hub, st) {
  var map = mrMap_(hub), said = [];
  Object.keys(map).forEach(function (id) {
    var r = map[id];
    if (r.verdict !== 'رد' || r.read || !r.why) return;
    if (MR_WHY.concat(MR_WHY_SFX).some(function (w) { return w.t === r.why; })) return;   // دکمه، نه نوشته
    var b = mrBankItem_(hub, id), ac = mrActOnWhy_(hub, id, b, r.why);
    var r2 = mrSet_(hub, id, ac.patch);
    mrLog_(hub, id, b.name || r.name, 'بازخوانیِ توضیح', r.why.slice(0, 200), ac.patch.read);
    if (ac.patch.verdict !== 'رد' && r2 && r2.msg) mrRefresh_(tgChat_(), r2.msg, mrBankItem_(hub, id), r2, false);
    said.push('• «' + String(b.name || r.name || '').replace(/\.wav$/i, '') + '»: ' + ac.patch.read);
  });
  if (said.length) { try { tgSend_('🧠 ردهای با توضیحِ قبلی دوباره خوانده شدند:\n' + said.slice(0, 15).join('\n')); } catch (e) {} }
  return said.length;
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
    var w = (MR_WHY.concat(MR_WHY_SFX).filter(function (x) { return x.k === a; })[0] || { k: a, t: a });
    patch.verdict = 'رد'; patch.whyK = w.k; patch.why = w.t; logOp = 'رد'; logVal = w.t; reply = 'رد شد — دیگر پخش نمی‌شود';
  }
  else if (op === 'vx' || op === 'rx' || op === 'ux' || op === 'nx') {
    var ask = op === 'vx' ? 'وایبِ این قطعه را بنویسید'
            : op === 'nx' ? 'یادداشت دربارهٔ این قطعه — هر چیزی (کجا به کار بیاید، کجا نه، چه حسی دارد). داوری عوض نمی‌شود؛ هر بار که انتخاب شود خوانده می‌شود'
            : op === 'ux' ? 'کدام تکه استفاده شود؟ مثلاً «از ثانیهٔ ۱۰ تا ۴۰» یا «۰:۳۰ تا ۱:۲۰»'
            : 'توضیح بدهید — خوانده می‌شود و همان کار انجام می‌شود (مثلاً «این جلوهٔ صوتی است» یا «فقط ثانیهٔ ۵ تا ۲۰»؛ وگرنه رد)';
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
  var m = /#m:([A-Za-z0-9_-]+):(vx|rx|ux|nx)/.exec(rt || '');
  var txt = String((msg && msg.text) || '').trim();
  if (m && txt) {
    var id = m[1], b = mrBankItem_(hub, id), r = mrMap_(hub)[id] || {}, patch = {};
    if (m[2] === 'vx') {
      var have = String(r.vibe || '').split(/[،,]\s*/).filter(Boolean);
      if (have.indexOf(txt) === -1) have.push(txt);
      patch.vibe = have.join('، ');
      var rgV = mrRangeParse_(txt);   // بازه در متنِ وایب هم شنیده می‌شود
      if (rgV) { patch.range = rgV.from + '-' + rgV.to; patch.read = 'فقط از ثانیهٔ ' + faDigitsOut_(String(rgV.from)) + ' تا ' + faDigitsOut_(String(rgV.to)); }
    } else if (m[2] === 'nx') {
      /* یادداشت (۹.۸۲): داوری را عوض نمی‌کند؛ ولی اگر بازه یا «جلوه/موسیقی است» گفته باشد، همان اجرا می‌شود. */
      var rdN = mrReadWhy_(txt, b);
      patch.note = (r.note ? r.note + ' | ' : '') + String(nowStr_()).slice(0, 10) + ': ' + txt.slice(0, 300);
      if (rdN.range) patch.range = rdN.range.from + '-' + rdN.range.to;
      if (rdN.act === 'جلوه') mrSetKind_(hub, id, 'افکت'); else if (rdN.act === 'موسیقی' && String(b.kind || '') === 'افکت') mrSetKind_(hub, id, 'موسیقی');
      patch.read = 'یادداشت ثبت شد؛ هر بار که این قطعه انتخاب شود خوانده می‌شود' +
                   (rdN.range ? '؛ و فقط از ثانیهٔ ' + faDigitsOut_(String(rdN.range.from)) + ' تا ' + faDigitsOut_(String(rdN.range.to)) : '') +
                   (rdN.act === 'جلوه' ? '؛ و این جلوهٔ صوتی شمرده می‌شود' : '');
    } else if (m[2] === 'ux') {
      var rgU = mrRangeParse_(txt);
      if (rgU) { patch.range = rgU.from + '-' + rgU.to; patch.read = 'فقط از ثانیهٔ ' + faDigitsOut_(String(rgU.from)) + ' تا ' + faDigitsOut_(String(rgU.to)); }
      else patch.read = 'بازه‌ای در این نوشته پیدا نشد';
    } else { var ac = mrActOnWhy_(hub, id, b, txt); patch = ac.patch; }
    var r2 = mrSet_(hub, id, Object.assign({ name: b.name || r.name }, patch));
    mrLog_(hub, id, b.name || r.name, m[2] === 'vx' ? 'وایبِ نوشتاری' : m[2] === 'ux' ? 'بازهٔ استفاده' : m[2] === 'nx' ? 'یادداشت' : 'رد با توضیح', txt.slice(0, 300),
           String(patch.read || patch.whyK || '').slice(0, 200));
    if ((patch.verdict === 'تأیید' && (patch.whyK === 'sfx' || patch.whyK === 'mus')) || m[2] === 'nx') b = mrBankItem_(hub, id);   // نوعِ تازه روی کارت
    if (r2 && r2.msg) mrRefresh_(msg.chat.id, r2.msg, b, r2, false);
    if (patch.verdict === 'رد') { mrRootCause_(hub, st, b, r2); mrRejectStreak_(hub, st); }
    tgApi_('sendMessage', { chat_id: msg.chat.id, text: m[2] === 'vx' ? '✓ وایب ثبت شد: ' + txt + (patch.read ? '\n✓ ' + patch.read : '')
                                                       : '✓ فهمیدم: ' + (patch.read || 'ثبت شد') + '.\nاگر منظورتان این نبود، دوباره بنویسید.',
                            reply_to_message_id: msg.message_id });
    st.answeredAt = Date.now();
    return true;
  }
  if (mrOnMenuText_(hub, st, txt, msg.chat.id)) return true;
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


/* ═══ بازه با خودِ پخش‌کننده (۹.۸۳) ═══
 * «این قسمتِ برش … جوری باشه که بتونم با زدنش از رو خودِ اون موسیقی و پلیرِ تلگرام بازه رو انتخاب کنم جای تایپ کردن.»
 * پخش‌کنندهٔ تلگرام جای پخش را به ربات نمی‌دهد، پس دکمه یک صفحهٔ پخش‌کننده باز می‌کند (`docs/webapp/range.html`): «شروع اینجا»،
 * «پایان اینجا»، پیش‌نمایشِ همان بازه، و «ثبت» — که با پیوندِ `t.me/<ربات>?start=…` یک پیام به ربات می‌فرستد و همان مسیرِ
 * همیشگی آن را می‌خوانَد. پیام با کلیدی از شناسهٔ فایل امضا شده است (`mrRangeKey_`)، پس فقط پیوندِ کارتِ خودِ او کار می‌کند. */
function mrRangeKey_(id) {
  var sig = Utilities.computeHmacSha256Signature(String(id), String(tgToken_() || 'k'));
  var h = '';
  for (var i = 0; i < 3; i++) { var b = (sig[i] + 256) % 256; h += (b < 16 ? '0' : '') + b.toString(16); }
  return h;
}

function mrBotName_() {
  var P = props_(), u = P.getProperty('TG_BOT_USERNAME');
  if (u) return u;
  try { var r = tgApi_('getMe', {}); u = r && r.result && r.result.username; } catch (e) { u = ''; }
  if (u) P.setProperty('TG_BOT_USERNAME', u);
  return u || '';
}

/** نشانیِ صفحهٔ پخش‌کننده برای یک قطعه؛ '' اگر ربات یا صفحه معلوم نیست. `share` فایل را با پیوند قابلِ پخش می‌کند (فقط پوشهٔ موسیقیِ خودمان). */
function mrRangeUrl_(b, r, share) {
  var page = String(CFG.MR_RANGE_PAGE || ''), bot = mrBotName_();
  if (!page || !bot || !b || !b.id) return '';
  if (share) { try { DriveApp.getFileById(b.id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (eS) {} }
  var rg = mrRangeParse_((r || {}).range);
  var q = { id: b.id, n: String(b.name || '').replace(/\.wav$/i, '').slice(0, 60), d: Math.round(Number(b.sec) || 0), bot: bot, k: mrRangeKey_(b.id) };
  if (rg) { q.s = rg.from; q.e = rg.to; }
  return page + '?' + Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
}

/** «/start r<id>_<از>_<تا>_<کلید>» از صفحهٔ پخش‌کننده ⇒ بازه در تب، کارت عوض و پاسخ. از هر چتی، چون امضا دارد. */
function mrStartRange_(hub, st, msg) {
  var m = /^\/start\s+r([A-Za-z0-9_-]+)$/.exec(String((msg && msg.text) || '').trim());
  if (!m) return false;
  var parts = m[1].split('_');
  if (parts.length < 4) return false;
  var k = parts.pop(), e = parseInt(parts.pop(), 36) / 10, s = parseInt(parts.pop(), 36) / 10, id = parts.join('_');
  if (k !== mrRangeKey_(id) || !(s >= 0) || !(e >= 0)) {
    try { tgApi_('sendMessage', { chat_id: msg.chat.id, text: 'این پیوند معتبر نیست — از دکمهٔ «✂️ بازه با پخش‌کننده» روی همان کارت باز کنید.' }); } catch (eX) {}
    return true;
  }
  var r = mrMap_(hub)[id] || {}, b = mrBankItem_(hub, id), clear = !(e > s);
  var rangeTxt = clear ? '' : s + '-' + e;
  var say = clear ? 'بازه برداشته شد — از این به بعد مثلِ قبل، به تشخیصِ خودِ موتور'
                  : 'بازه ثبت شد: از ' + mrClock_(s) + ' تا ' + mrClock_(e) + ' (' + faDigitsOut_(String(Math.round((e - s) * 10) / 10)) + ' ثانیه) — فقط همین تکه پخش می‌شود';
  var r2 = mrSet_(hub, id, { name: b.name || r.name, range: rangeTxt, read: say });
  mrLog_(hub, id, b.name || r.name, 'بازه با پخش‌کننده', rangeTxt || 'برداشته شد', '');
  if (r2 && r2.msg) mrRefresh_(tgChat_(), r2.msg, b, r2, false);
  try { tgApi_('sendMessage', { chat_id: msg.chat.id, text: '✂️ «' + String(b.name || r.name || '').replace(/\.wav$/i, '') + '»: ' + say + '.' }); } catch (eR) {}
  st.answeredAt = Date.now();
  return true;
}

function mrClock_(t) {
  var m = Math.floor(t / 60), s = Math.round((t - m * 60) * 10) / 10;
  return faDigitsOut_(m + ':' + (s < 10 ? '0' : '') + s);
}

/* ═══ منوی ثابت، مرورِ بانک، و یادداشت روی هر کارت (۹.۸۲) ═══
 * «یه منوی ثابت زیرش بذاره تا هی مجبور به تایپِ دستورها نشم … دسترسی‌هاش وسیع باشه و تنوع زیاد داشته باشه»؛
 * «اگر تأیید هم می‌زنم یا معلق می‌ذارم، باز توضیحاتی بدم که ثبت بشه و بعداً که می‌خواد معرفی کنه با توجه به توضیحاتم باشه»؛
 * «اونایی که معلق می‌مونه و پیامش می‌ره بالا باید یادت بمونه». هر کدام از همان تبِ «بازبینیِ موسیقی» خوانده می‌شود — حافظهٔ
 * دوم نیست؛ دکمهٔ هر فهرست کارتِ همان قطعه را دوباره می‌فرستد تا بشنود و ویرایش کند. */

var MR_MENU_KB = [['🎵 منوی موسیقی', '⏳ معلق‌ها'], ['⭐ پسندیده‌ها', '❌ ردشده‌ها'], ['🔊 جلوه‌ها', '🔎 بر اساسِ وایب'],
                  ['📝 یادداشت‌دارها', '✂️ بازه‌دارها'], ['➕ ۵ تای بعدی', '❓ راهنما']];
var MR_FILTERS = { p: '⏳ معلق (فرستاده و بی‌جواب)', a: '✅ تأییدشده', r: '❌ ردشده', s4: '⭐ چهار ستاره و بالاتر', s2: '☆ یک و دو ستاره',
                   x: '🔊 جلوه‌های صوتی', m: '🎵 همهٔ موسیقی‌ها', g: '✂️ دارای بازه', n: '📝 دارای یادداشت', u: '📭 هنوز فرستاده‌نشده' };
var MR_PAGE = 8;

/** همهٔ ردیف‌های تبِ «موسیقی» با داوریِ هر کدام — ردشده‌ها هم (بانک آن‌ها را ندارد). */
function mrRows_(hub) {
  var sh = (hub || getHub_()).getSheetByName(CFG.MUSIC_TAB || 'موسیقی'), map = mrMap_(hub), out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, MUSIC_HEADERS.length).getValues().forEach(function (v) {
    var id = String(v[MC.ID - 1] || '');
    if (!id) return;
    out.push({ id: id, name: String(v[MC.NAME - 1] || ''), kind: String(v[MC.KIND - 1] || 'موسیقی'), mood: String(v[MC.MOOD - 1] || ''),
               sec: Number(v[MC.SEC - 1]) || 0, used: Number(v[MC.USED - 1]) || 0, r: map[id] || {} });
  });
  return out;
}

function mrFilter_(rows, f) {
  var vb = mrVibes_();
  return rows.filter(function (x) {
    var r = x.r;
    if (f === 'p') return r.sent && !r.verdict;
    if (f === 'a') return r.verdict === 'تأیید';
    if (f === 'r') return r.verdict === 'رد';
    if (f === 's4') return Number(r.stars) >= 4;
    if (f === 's2') return Number(r.stars) > 0 && Number(r.stars) <= 2;
    if (f === 'x') return x.kind === 'افکت';
    if (f === 'm') return x.kind !== 'افکت';
    if (f === 'g') return !!r.range;
    if (f === 'n') return !!r.note;
    if (f === 'u') return !r.sent && !r.verdict;
    var mv = /^v(\d+)$/.exec(f);
    if (mv) { var t = vb[Number(mv[1])] || '~'; return String(r.vibe || '').indexOf(t) !== -1 || String(x.mood || '').indexOf(t) !== -1; }
    return false;
  }).sort(function (a, b) { return (Number(b.r.stars) || 0) - (Number(a.r.stars) || 0) || b.used - a.used || a.name.localeCompare(b.name); });
}

function mrFilterTitle_(f) {
  var mv = /^v(\d+)$/.exec(f);
  return mv ? '🔎 وایبِ «' + (mrVibes_()[Number(mv[1])] || '') + '»' : (MR_FILTERS[f] || f);
}

/** منوی اصلی: شمارِ هر فهرست، هر کدام یک دکمه. */
function mrMenu_(hub, chatId, editId) {
  var rows = mrRows_(hub), d = function (x) { return faDigitsOut_(String(x)); };
  var cnt = function (f) { return mrFilter_(rows, f).length; };
  var btn = function (f) { return { text: MR_FILTERS[f] + ' (' + d(cnt(f)) + ')', callback_data: 'mb|' + f + '|0' }; };
  var taste = ''; try { taste = mrTasteLine_(mrTasteOf_(mrMap_(hub))); } catch (e) {}
  var text = '🎵 بانکِ موسیقی و جلوه — ' + d(rows.length) + ' قطعه\nهر دکمه فهرستش را باز می‌کند؛ زدنِ هر قطعه کارتش را دوباره می‌فرستد تا بشنوید و ویرایش کنید.' +
             (taste ? '\n\n🧭 سلیقه‌ای که از ستاره‌ها و داوری‌هایتان فهمیده‌ام — ' + taste : '');
  var kb = [[btn('p'), btn('u')], [btn('a'), btn('r')], [btn('s4'), btn('s2')], [btn('m'), btn('x')], [btn('n'), btn('g')],
            [{ text: '🔎 بر اساسِ وایب', callback_data: 'mm|vibes' }, { text: '➕ ۵ تای بعدی را بفرست', callback_data: 'mm|more' }]];
  return mrShow_(chatId, editId, text, kb);
}

function mrVibeMenu_(hub, chatId, editId) {
  var rows = mrRows_(hub), vb = mrVibes_(), kb = [];
  for (var i = 0; i < vb.length; i += 2) {
    kb.push(vb.slice(i, i + 2).map(function (t, j) {
      return { text: t + ' (' + faDigitsOut_(String(mrFilter_(rows, 'v' + (i + j)).length)) + ')', callback_data: 'mb|v' + (i + j) + '|0' };
    }));
  }
  kb.push([{ text: '↩️ منوی موسیقی', callback_data: 'mm|menu' }]);
  return mrShow_(chatId, editId, '🔎 کدام وایب؟', kb);
}

/** یک صفحه از یک فهرست — هر قطعه یک دکمه، با ستاره و داوری؛ ورق زدن در همان پیام. */
function mrBrowse_(hub, chatId, f, page, editId) {
  var L = mrFilter_(mrRows_(hub), f), n = L.length, pages = Math.max(1, Math.ceil(n / MR_PAGE));
  page = Math.max(0, Math.min(pages - 1, Number(page) || 0));
  var d = function (x) { return faDigitsOut_(String(x)); };
  var kb = L.slice(page * MR_PAGE, page * MR_PAGE + MR_PAGE).map(function (x) {
    var r = x.r, mark = r.verdict === 'تأیید' ? '✅' : r.verdict === 'رد' ? '❌' : r.sent ? '⏳' : '📭';
    var stars = r.stars ? ' ' + new Array(Number(r.stars) + 1).join('⭐') : '';
    var extra = (r.note ? ' 📝' : '') + (r.range ? ' ✂️' : '') + (x.kind === 'افکت' ? ' 🔊' : '');
    return [{ text: (mark + stars + ' ' + x.name.replace(/\.wav$/i, '') + extra).slice(0, 60), callback_data: 'mc|' + x.id }];
  });
  var nav = [];
  if (page > 0) nav.push({ text: '◀️ قبلی', callback_data: 'mb|' + f + '|' + (page - 1) });
  if (page < pages - 1) nav.push({ text: 'بعدی ▶️', callback_data: 'mb|' + f + '|' + (page + 1) });
  if (nav.length) kb.push(nav);
  kb.push([{ text: '↩️ منوی موسیقی', callback_data: 'mm|menu' }]);
  var text = mrFilterTitle_(f) + ' — ' + d(n) + ' قطعه' + (pages > 1 ? ' · صفحهٔ ' + d(page + 1) + ' از ' + d(pages) : '') +
             (n ? '\nروی هر قطعه بزنید تا کارتش برای شنیدن و ویرایش بیاید.' : '\nچیزی در این فهرست نیست.');
  return mrShow_(chatId, editId, text, kb);
}

/** پیامِ فهرست: اگر از دکمه آمده، همان پیام عوض می‌شود (فهرستِ تازه زیرِ فهرستِ کهنه نمی‌نشیند). */
function mrShow_(chatId, editId, text, kb) {
  var rm = JSON.stringify({ inline_keyboard: kb });
  if (editId) {
    try { tgApi_('editMessageText', { chat_id: chatId, message_id: Number(editId), text: text, reply_markup: rm }); return true; } catch (e) {}
  }
  tgApi_('sendMessage', { chat_id: chatId, text: text, reply_markup: rm });
  return true;
}

/** کارتِ یک قطعه، دوباره — شناسهٔ پیامِ تازه جای قبلی می‌نشیند تا دکمه‌هایش کارتِ تازه را عوض کنند. */
function mrResend_(hub, id) {
  var b = mrBankItem_(hub, id), r = mrMap_(hub)[id] || {};
  if (!b.name && !r.name) return false;
  var mid = mrSendOne_(b, r);
  if (mid) mrSet_(hub, id, { name: b.name || r.name, msg: mid, sent: r.sent || nowStr_() });
  return !!mid;
}

/** منوی ثابت زیرِ چت (یک بار برای هر نسخه) — و اگر چت آن را نپذیرفت (کانال)، همان منو سنجاق می‌شود. */
function mrFixedMenu_(st) {
  var chat = tgChat_();
  try {
    tgApi_('setMyCommands', { commands: [{ command: 'music', description: 'منوی موسیقی و جلوه' },
                                         { command: 'pending', description: 'قطعه‌های معلق' },
                                         { command: 'help', description: 'راهنما' }] });
  } catch (eC) {}
  var ok = false;
  try {
    var r = tgApi_('sendMessage', { chat_id: chat, text: '🎛 منوی ثابت پایینِ صفحه آماده است — دیگر لازم نیست دستوری تایپ کنید.',
                                    reply_markup: JSON.stringify({ keyboard: MR_MENU_KB.map(function (row) { return row.map(function (t) { return { text: t }; }); }),
                                                                   resize_keyboard: true, is_persistent: true }) });
    ok = !!(r && r.result);
  } catch (eK) { ok = false; }
  if (!ok) {
    try {
      var m = tgApi_('sendMessage', { chat_id: chat, text: '🎛 منوی موسیقی (سنجاق‌شده)',
        reply_markup: JSON.stringify({ inline_keyboard: [[{ text: '🎵 منوی موسیقی', callback_data: 'mm|menu' }, { text: '⏳ معلق‌ها', callback_data: 'mb|p|0' }],
                                                         [{ text: '🔎 بر اساسِ وایب', callback_data: 'mm|vibes' }, { text: '➕ ۵ تای بعدی', callback_data: 'mm|more' }]] }) });
      if (m && m.result) tgApi_('pinChatMessage', { chat_id: chat, message_id: m.result.message_id, disable_notification: true });
      st.kbPinned = 1;
    } catch (eP) { st.lastWhy = 'منوی ثابت: ' + String(eP.message || eP).slice(0, 100); }
  }
  st.kbVer = String(CFG.CODE_VERSION);
  return ok;
}

var MR_HELP = ['❓ راهنمای بانکِ موسیقی',
  '• هر روز چند کارت می‌آید؛ زیرِ هر کارت: ستاره، وایب، جایگاه، تأیید، «⏳ بعداً»، رد.',
  '• «📝 یادداشت» روی هر کارت — تأییدشده، معلق یا ردشده — هر بار که آن قطعه برای قسمتی انتخاب می‌شود خوانده می‌شود.',
  '• «✂️ بازه با پخش‌کننده»: صفحه‌ای باز می‌شود؛ پخش کنید، «شروع اینجا» و «پایان اینجا» را بزنید، بعد «ثبت» (و در تلگرام «Start»). فقط همان تکه پخش می‌شود.',
  '• «⌨️ بازه با نوشتن»، یا در یادداشت و توضیحِ رد: «از ثانیهٔ ۱۰ تا ۴۰». قطعهٔ بی‌بازه مثلِ قبل به تشخیصِ موتور بریده می‌شود.',
  '• «✍️ رد با توضیح» خوانده می‌شود: «این جلوهٔ صوتی است» یعنی به بانکِ جلوه برود، نه دور ریخته شود.',
  '• دکمه‌های پایینِ صفحه هر فهرست را باز می‌کنند؛ روی هر قطعه بزنید تا کارتش دوباره بیاید.'].join('\n');

/** متنِ دکمه‌های منوی ثابت ⇒ کار. */
function mrOnMenuText_(hub, st, txt, chatId) {
  var t = String(txt || '').trim();
  if (/^\/(music|موسیقی)\b/.test(t) || t === 'موسیقی' || t === '🎵 منوی موسیقی') { mrMenu_(hub, chatId); return true; }
  if (/^\/pending\b/.test(t) || t === '⏳ معلق‌ها') { mrBrowse_(hub, chatId, 'p', 0); return true; }
  if (t === '⭐ پسندیده‌ها') { mrBrowse_(hub, chatId, 's4', 0); return true; }
  if (t === '❌ ردشده‌ها') { mrBrowse_(hub, chatId, 'r', 0); return true; }
  if (t === '🔊 جلوه‌ها') { mrBrowse_(hub, chatId, 'x', 0); return true; }
  if (t === '📝 یادداشت‌دارها') { mrBrowse_(hub, chatId, 'n', 0); return true; }
  if (t === '✂️ بازه‌دارها') { mrBrowse_(hub, chatId, 'g', 0); return true; }
  if (t === '🔎 بر اساسِ وایب') { mrVibeMenu_(hub, chatId); return true; }
  if (t === '➕ ۵ تای بعدی') {
    st.dayN = Math.max(0, (Number(st.dayN) || 0) - 5); st.first = 1; st.sendTry = 0; st.more = (Number(st.more) || 0) + 5;
    tgApi_('sendMessage', { chat_id: chatId, text: '➕ پنج کارتِ تازه تا یکی‌دو دقیقهٔ دیگر.' });
    return true;
  }
  if (/^\/(help|start)\b/.test(t) || t === '❓ راهنما') { tgApi_('sendMessage', { chat_id: chatId, text: MR_HELP }); return true; }
  return false;
}

/** دکمه‌های منو و فهرست (mm|… و mb|… و mc|…). */
function mrOnMenuButton_(hub, st, data, chatId, msgId) {
  var p = String(data || '').split('|');
  if (p[0] === 'mm' && p[1] === 'more') { st.dayN = Math.max(0, (Number(st.dayN) || 0) - 5); st.first = 1; st.sendTry = 0; st.more = (Number(st.more) || 0) + 5; return true; }
  if (p[0] === 'mm' && p[1] === 'menu') return mrMenu_(hub, chatId, msgId);
  if (p[0] === 'mm' && p[1] === 'vibes') return mrVibeMenu_(hub, chatId, msgId);
  if (p[0] === 'mb') return mrBrowse_(hub, chatId, p[1], p[2], msgId);
  if (p[0] === 'mc') return mrResend_(hub, p[1]);
  return false;
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
  /* نصبِ دستی (۹.۷۸): تا گذرِ ساعتی صبر نکن — تریگرِ پنج‌دقیقه‌ایِ کهنه همین‌جا یک‌دقیقه‌ای می‌شود. یک خواندنِ ویژگی وقتی کاری نیست. */
  try { if (typeof trigEnsureForVersion_ === 'function') trigEnsureForVersion_(); } catch (eTv) {}
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
  if (p[0] === 'mm') return p[1] === 'more' ? 'تا چند دقیقهٔ دیگر' : '';
  if (p[0] === 'mb') return '';
  if (p[0] === 'mc') return 'کارتش همین الان می‌آید';
  if (p[2] === 's') { var n = Math.max(1, Math.min(5, Number(p[3]) || 1)); return new Array(n + 1).join('⭐') + ' ثبت شد'; }
  return ({ s: '⭐ ستاره ثبت شد', v: 'وایب ثبت شد', o: 'جایگاه ثبت شد', a: '✅ تأیید شد', u: 'معلق ماند',
            r: '❌ رد شد — دیگر پخش نمی‌شود', vx: 'منتظرِ نوشتهٔ شما', rx: 'منتظرِ نوشتهٔ شما', ux: 'منتظرِ نوشتهٔ شما', nx: 'منتظرِ نوشتهٔ شما' })[p[2]] || '';
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
            if (/^m[mbc]\|/.test(String(cq.data || ''))) mrOnMenuButton_(getHub(), st, cq.data, m.chat.id, m.message_id);
            else mrOnButton_(getHub(), st, cq.data, m.chat.id, m.message_id, !m.audio && !m.document);
            st.clickAt = Date.now();
            out.got++;
          } else {
            /* چتِ موتور ممکن است کانال باشد: آنجا نوشتهٔ او `channel_post` است، نه `message`. */
            var um = u.message || u.channel_post;
            /* بازه از صفحهٔ پخش‌کننده (۹.۸۳): از چتِ خصوصیِ ربات می‌آید، نه لزوماً چتِ موتور — امضای پیام جای سدِ چت است. */
            if (um && /^\/start\s+r/.test(String(um.text || ''))) { if (mrStartRange_(getHub(), st, um)) out.got++; }
            else if (um && mrChatOk_(um.chat) && mrOnText_(getHub(), st, um)) out.got++;
          }
        } catch (eH) { st.lastWhy = String(eH.message || eH).slice(0, 120); }
      }
      mrSave_(st);
      if (idle) break;
    } while (hot() && Date.now() - t0 < maxRun - 8000);
    /* ۹.۸۱، یک بار: ردهای با توضیحی که پیش از این نسخه نوشته شده‌اند هم خوانده می‌شوند. */
    if (st.kbVer !== String(CFG.CODE_VERSION)) { try { mrFixedMenu_(st); } catch (eKb) { st.kbVer = String(CFG.CODE_VERSION); } }
    if (!st.why981) { try { mrRereadWhys_(getHub(), st); } catch (eRw) { st.lastWhy = 'why981: ' + String(eRw.message || eRw).slice(0, 100); } st.why981 = 1; }
    /* تریگر هر دقیقه است (۹.۷۷)؛ بازکردنِ هابِ ۲۹ مگابایتی هر دقیقه سهمیهٔ روزانهٔ اجرا را می‌خورد. پس فرستادن فقط
       وقتی سهمِ امروز پر نیست و ده دقیقه از تلاشِ قبلی گذشته — و سهمِ پر بی هیچ خواندنی دانسته می‌شود. */
    var today = String(nowStr_()).slice(0, 10);
    if (st.day !== today) { st.day = today; st.dayN = 0; }
    var cap = st.first ? (Number(CFG.MR_PER_DAY) || 10) : (Number(CFG.MR_FIRST_BATCH) || 25);
    /* «۵ تای بعدی» (۹.۷۹): تا آن پنج‌تا برسند، نه سقفِ روز جلویشان را می‌گیرد نه فاصلهٔ ده‌دقیقه‌ای. */
    var more = Number(st.more) || 0;
    if ((Number(st.dayN) || 0) >= cap && !more) st.sendWhy = 'سهمِ امروز (' + cap + ') فرستاده شد';
    else if (Date.now() - t0 < maxRun && (more || Date.now() - (Number(st.sendTry) || 0) > 10 * 60000)) {
      st.sendTry = Date.now();
      var sd = mrSendDue_(getHub(), st, 40000);
      out.sent = sd.sent; st.sendWhy = sd.why;
      if (sd.sent) st.lastSentAt = Date.now();
      if (more) st.more = Math.max(0, more - (sd.sent || 0));
      if (sd.why && /همهٔ قطعه‌ها/.test(sd.why)) st.more = 0;
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
