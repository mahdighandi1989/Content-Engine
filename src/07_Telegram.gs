/**
 * 07_Telegram.gs — ارسال قسمت به ربات تلگرام
 *
 * دو مقدار را در Project Settings ← Script Properties بگذارید:
 *   TELEGRAM_BOT_TOKEN   توکن رباتی که از BotFather گرفته‌اید
 *   TELEGRAM_CHAT_ID     شناسهٔ عددی چت/گروه، یا نام کانال مثل ‎@mychannel
 * اگر خالی باشند، این بخش بی‌صدا رد می‌شود و بقیهٔ کارها انجام می‌شود.
 */

function tgToken_() { return (props_().getProperty(PK.TG_TOKEN) || '').trim(); }
function tgChat_()  { return (props_().getProperty(PK.TG_CHAT) || '').trim(); }
function tgEnabled_() { return !!(tgToken_() && tgChat_()); }

function tgApi_(method, payload) {
  var url = 'https://api.telegram.org/bot' + tgToken_() + '/' + method;
  var opt = { method: 'post', muteHttpExceptions: true };
  var hasBlob = false;
  for (var k in payload) {
    if (payload.hasOwnProperty(k) && payload[k] && typeof payload[k] === 'object' &&
        typeof payload[k].getBytes === 'function') { hasBlob = true; break; }
  }
  if (hasBlob) {
    opt.payload = payload;                 // UrlFetchApp خودش multipart می‌سازد
  } else {
    opt.contentType = 'application/json';
    opt.payload = JSON.stringify(payload);
  }

  /* ── چرا حلقه دورِ fetch یک try لازم دارد (۵٫۸۴) ──
     `UrlFetchApp.fetch` وقتی خودِ اتصال برقرار نشود (DNS، شبکه) **پرتاب**
     می‌کند، نه اینکه کدِ خطا برگرداند. تا ۵٫۸۳ این پرتاب از همان تلاشِ اول
     بیرونِ حلقه می‌پرید — یعنی حلقهٔ سه‌تلاشی برای این حالت اصلاً وجود
     نداشت. در تولیدِ دستیِ ۲۴ اوت همین شد: «تلگرام: ۴ ارسال، ۲ ناموفق —
     متن: Address unavailable». یک لحظه شبکه، و متنِ کاملِ قسمت برای همیشه
     نرفت؛ صاحبِ برنامه گفت «متنِ پادکست توی تلگرام نیومده».
     یک قطعیِ گذرا باید تکرار شود، نه اینکه پیام را ببلعد. */
  var last = '';
  var attempts = Math.max(1, Number(CFG.TG_ATTEMPTS) || 4);
  for (var attempt = 0; attempt < attempts; attempt++) {
    var res, code, txt;
    try {
      res = UrlFetchApp.fetch(url, opt);
      code = res.getResponseCode();
      txt = res.getContentText();
    } catch (eNet) {
      last = 'شبکه: ' + String((eNet && eNet.message) || eNet).slice(0, 200);
      if (attempt < attempts - 1) { Utilities.sleep(2000 * (attempt + 1)); continue; }
      break;
    }
    if (code === 200) {
      // تلگرام خطاهای منطقی را هم با کد ۲۰۰ و ok:false برمی‌گرداند (مثلاً
      // چت پیدا نشد، ربات بلاک شده). بی این وارسی، فرستنده «ارسال شد» ثبت
      // می‌کرد در حالی که پیامی نرفته بود.
      var body = null;
      try { body = JSON.parse(txt); } catch (e) { return { ok: true }; }
      if (body && body.ok === false) {
        last = 'ok:false — ' + String(body.description || '').slice(0, 200);
        if (body.parameters && body.parameters.retry_after) {
          Utilities.sleep(Math.min((body.parameters.retry_after * 1000) + 500, 30000));
          continue;
        }
        break;                             // خطای منطقی؛ تکرار فایده ندارد
      }
      return body || { ok: true };
    }
    last = 'HTTP ' + code + ': ' + txt.slice(0, 300);
    if (code === 429) {                    // احترام به محدودیت نرخ تلگرام
      var wait = 3000;
      try { wait = (JSON.parse(txt).parameters.retry_after || 3) * 1000 + 500; } catch (e2) {}
      Utilities.sleep(Math.min(wait, 30000));
      continue;
    }
    if (code >= 400 && code < 500) break;  // خطای ساختاری؛ تکرار فایده ندارد
    Utilities.sleep(2000 * (attempt + 1));
  }
  throw new Error('تلگرام: ' + last);
}

/** نشانِ نوع منبع در فهرست تلگرام. */
/** یک خطِ کوتاهِ موسیقی برای سرپیامِ تلگرام. خالی، اگر چیزی پخش نشده. */
function tgMusicLine_() {
  try {
    var st = musicStatus_();
    var last = st && st.last;
    if (last && last.tracks && last.tracks.length) {
      return '🎵 ' + tgEsc_(last.tracks.join(' · ')) +
             (last.mood ? '  ·  ' + tgEsc_(last.mood) : '') + '\n';
    }
    if (st && !st.tracks) return '🎵 ' + tgEsc_('بی‌موسیقی — بانک خالی است') + '\n';
    return '🎵 ' + tgEsc_('بی‌موسیقی') + '\n';
  } catch (e) { return ''; }
}

/* خطِ جزوه در سرپیامِ درس‌نامه. خواستهٔ صاحبِ برنامه بود که «اطلاع‌رسانی
   بشه» — و جای طبیعی‌اش همان‌جاست که خودِ قسمت اعلام می‌شود، نه یک گزارشِ
   جدا که باید سراغش رفت. بخشِ ۲۶ جلوتر است، پس try/catch. */
function tgHandoutLine_(seriesName) {
  try {
    var h = handoutLineFull_(seriesName);
    if (!h || !h.text) return '';
    return '📘 ' + tgEsc_(h.text) +
           (h.url ? ' <a href="' + tgEsc_(h.url) + '">باز کردنِ جزوه</a>' : '') + '\n';
  } catch (e) { return ''; }
}

function tgKindIcon_(kind) {
  if (kind === 'ویدیو') return '🎬';
  if (kind === 'صدا') return '🎧';
  if (kind === 'سند') return '📄';
  return '🖼';
}

function tgEsc_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** شکستن متن بلند روی مرز پاراگراف/جمله زیر سقف ۴۰۹۶ نویسه‌ای تلگرام */
function tgSplit_(text, limit) {
  limit = limit || 3800;
  var paras = String(text).split(/\n{2,}/);
  var out = [], cur = '';
  for (var i = 0; i < paras.length; i++) {
    var p = paras[i].trim();
    if (!p) continue;
    if (p.length > limit) {                       // پاراگراف غول‌پیکر: روی جمله بشکن
      if (cur) { out.push(cur); cur = ''; }
      var sents = [], acc = '';
      for (var c = 0; c < p.length; c++) {
        acc += p.charAt(c);
        if ('.!?؟…'.indexOf(p.charAt(c)) !== -1 && (c + 1 >= p.length || p.charAt(c + 1) === ' ')) {
          sents.push(acc.trim()); acc = '';
        }
      }
      if (acc.trim()) sents.push(acc.trim());
      if (sents.length <= 1) sents = p.match(new RegExp('[\\s\\S]{1,' + limit + '}', 'g')) || [p];
      // برشِ کور می‌تواند وسطِ یک تگِ HTML بیفتد و تلگرام کلِ پیام را با ۴۰۰ رد کند.
      // اگر تکه‌ای با «<»ِ بازِ بی‌بسته تمام شد، همان دنبالهٔ ناقص به تکهٔ بعد می‌رود.
      for (var q = 0; q < sents.length - 1; q++) {
        var lt = sents[q].lastIndexOf('<'), gt = sents[q].lastIndexOf('>');
        if (lt > gt) {
          sents[q + 1] = sents[q].slice(lt) + sents[q + 1];
          sents[q] = sents[q].slice(0, lt);
        }
      }
      for (var j = 0; j < sents.length; j++) {
        if ((cur + ' ' + sents[j]).length > limit && cur) { out.push(cur); cur = sents[j]; }
        else cur = (cur ? cur + ' ' : '') + sents[j];
      }
      continue;
    }
    if ((cur + '\n\n' + p).length > limit && cur) { out.push(cur); cur = p; }
    else cur = (cur ? cur + '\n\n' : '') + p;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function tgSend_(text) {
  return tgApi_('sendMessage', {
    chat_id: tgChat_(), text: text, parse_mode: 'HTML', disable_web_page_preview: true
  });
}

/** متن سادهٔ قسمت برای پیوست .txt */
function episodePlainText_(epNum, ep, items, cat) {
  var L = [];
  L.push('قسمت ' + epNum + ' — ' + ep.title);
  L.push('دسته: ' + cat + '  ·  ' + nowStr_());
  L.push(''); L.push('— خلاصه —'); L.push(ep.summary || '');
  L.push(''); L.push('— متن قسمت —'); L.push(''); L.push(ep.hook || '');
  for (var i = 0; i < ep.sections.length; i++) {
    L.push(''); L.push('▍ ' + ep.sections[i].heading); L.push(ep.sections[i].narration);
  }
  L.push(''); L.push(ep.outro || '');
  L.push(''); L.push('— منابع —');
  for (var r = 0; r < items.length; r++) {
    L.push((r + 1) + '. [' + items[r].kind + '] ' + String(items[r].topic).slice(0, 140));
    L.push('   ' + items[r].link);
  }
  return L.join('\n');
}

/**
 * ارسال کامل یک قسمت به ربات: سرپیام، متن کامل، منابع، همهٔ فایل‌های صوتی و پیوست‌ها.
 * @return {string} گزارش کوتاه برای ثبت در شیت
 */
/** پیامِ منابعِ بیرونی و وضعیتِ غنی‌سازی — با لینکِ کاملِ هر منبع، بی خلاصه‌کاری. */
/** پیامِ «مشاهدهٔ ضروری» — همان جعبه‌ای که در سند هست، به زبانِ تلگرام. */
function tgMustSeeBlock_(ep, itemsOpt) {
  var rows = [];
  var secs = (ep && ep.sections) || [];
  for (var s = 0; s < secs.length; s++) {
    var list = (secs[s] && secs[s].mustSee) || [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i] || {};
      if (!m.why && !m.where) continue;
      var it = itemsOpt ? findItem_(itemsOpt, m.source) : null;
      var name = it ? ((it.kind ? it.kind + ' — ' : '') + String(it.topic || '').slice(0, 80))
                    : String(m.source || 'منبع');
      var link = it && it.link && String(it.link).indexOf('http') === 0 ? String(it.link) : '';
      rows.push('• ' + (link ? '<a href="' + tgEsc_(link) + '">' + tgEsc_(name) + '</a>'
                             : tgEsc_(name)) +
                (m.where ? '\n  📍 ' + tgEsc_(String(m.where)) : '') +
                (m.why ? '\n  چرا: ' + tgEsc_(String(m.why)) : '') +
                (m.benefit ? '\n  فایده: ' + tgEsc_(String(m.benefit)) : ''));
    }
  }
  if (!rows.length) return 0;
  var sent = 0;
  try {
    var parts = tgSplit_('🎯 <b>مشاهدهٔ ضروری</b>\n' +
                         '<i>این بخش‌ها را صوت و متن کامل منتقل نمی‌کنند؛ خودِ منبع را ببینید.</i>\n\n' +
                         rows.join('\n\n'), 3800);
    for (var p = 0; p < parts.length; p++) { tgSend_(parts[p]); sent++; Utilities.sleep(1200); }
  } catch (e) {}
  return sent;
}

function tgEnrichBlock_(ep) {
  var note = enrichNote_(ep);
  var list = (ep && ep.__extSources) || [];
  if (!note && !list.length) return 0;
  var sent = 0;
  try {
    var L = ['🌐 <b>غنی‌سازیِ اینترنتی</b>'];
    if (note) L.push(tgEsc_(note));
    if (list.length) {
      L.push('');
      L.push('<b>منابع:</b>');
      for (var i = 0; i < list.length; i++) {
        var s = list[i];
        L.push((i + 1) + '. ' + tgEsc_(s.title || s.url) +
               (s.publisher ? ' — ' + tgEsc_(s.publisher) : '') +
               (s.date ? ' (' + tgEsc_(s.date) + ')' : '') +
               '\n' + tgEsc_(s.url));
      }
    }
    var parts = tgSplit_(L.join('\n'), 3800);
    for (var p = 0; p < parts.length; p++) {
      tgSend_(parts[p]); sent++;
      Utilities.sleep(1200);
    }
  } catch (e) {}
  return sent;
}

function sendTelegramEpisode_(epNum, ep, items, cat, audioFiles, docBlob, dur, folder) {
  if (!tgEnabled_()) return 'تنظیم نشده';
  var sent = 0, failed = 0, notes = [];

  try {
    // هشتگ‌ها با نامِ برنامه شروع می‌شوند تا در تلگرام بشود دو برنامه را
    // از هم جدا جست‌وجو کرد.
    var tags = varietyTags_(ep, cat, epNum).join(' ');
    var head = '🎧 <b>' + tgEsc_(CFG.SHOW_NAME) + ' — قسمت ' + epNum + '</b>\n' +
               '<b>' + tgEsc_(ep.title) + '</b>\n' +
               '📂 ' + tgEsc_(cat) + '  ·  ⏱ ' + tgEsc_(dur) + '  ·  📎 ' + items.length + ' منبع\n\n' +
               (ep.summary ? tgEsc_(ep.summary) + '\n\n' : '') +
               (tags ? tgEsc_(tags) + '\n' : '') +
               tgMusicLine_() +
               '<a href="' + tgEsc_(folder.getUrl()) + '">پوشهٔ قسمت در درایو</a>';
    tgSend_(head); sent++;
  } catch (e) { failed++; notes.push('سرپیام: ' + e.message); }

  // متن کامل، تکه‌تکه
  try {
    var body = episodeNarration_(ep);
    var parts = tgSplit_(body, 3800);
    for (var i = 0; i < parts.length; i++) {
      tgSend_('<b>متن قسمت' + (parts.length > 1 ? ' (' + (i + 1) + '/' + parts.length + ')' : '') +
              '</b>\n\n' + tgEsc_(parts[i]));
      sent++;
      Utilities.sleep(1200);                     // زیر سقف نرخ تلگرام بمانیم
    }
  } catch (e2) { failed++; notes.push('متن: ' + e2.message); }

  sent += tgEnrichBlock_(ep);
  sent += tgMustSeeBlock_(ep, items);

  // فهرست منابع با لینک مستقیم
  try {
    var lines = ['<b>منابع این قسمت</b>'];
    for (var r = 0; r < items.length; r++) {
      var x = items[r];
      var label = tgEsc_(String(x.topic).slice(0, 90) || 'بدون عنوان');
      var link = String(x.link || '');
      lines.push((r + 1) + '. ' + tgKindIcon_(x.kind) + ' ' +
                 (link.indexOf('http') === 0 ? '<a href="' + tgEsc_(link) + '">' + label + '</a>' : label) +
                 (x.parts ? ' <i>(' + tgEsc_(String(x.parts)) + ')</i>' : '') +
                 (x.isRef ? ' <i>(ارجاع به قسمت گذشته)</i>' : '') +
                 (x.flag ? ' <i>(تکرار پردازش)</i>' : ''));
    }
    var srcParts = tgSplit_(lines.join('\n'), 3800);
    for (var s2 = 0; s2 < srcParts.length; s2++) { tgSend_(srcParts[s2]); sent++; Utilities.sleep(1000); }
  } catch (e3) { failed++; notes.push('منابع: ' + e3.message); }

  // فایل‌های صوتی
  for (var a = 0; a < (audioFiles || []).length; a++) {
    var f = audioFiles[a];
    try {
      var blob = DriveApp.getFileById(f.id).getBlob();
      var cap = '🎧 ' + tgEsc_(ep.title) + (audioFiles.length > 1 ?
                ' — بخش ' + (a + 1) + ' از ' + audioFiles.length : ' (کل قسمت)');
      try {
        tgApi_('sendAudio', {
          chat_id: tgChat_(), audio: blob, caption: cap, parse_mode: 'HTML',
          title: ep.title + (audioFiles.length > 1 ? ' — بخش ' + (a + 1) : ''),
          performer: 'پادکست آرشیو'
        });
      } catch (inner) {                          // بعضی فرمت‌ها را تلگرام به‌عنوان صوت نمی‌پذیرد
        tgApi_('sendDocument', { chat_id: tgChat_(), document: blob, caption: cap, parse_mode: 'HTML' });
      }
      sent++;
      Utilities.sleep(1500);
    } catch (e4) { failed++; notes.push('صوت ' + (a + 1) + ': ' + e4.message); }
  }

  // پیوست‌ها: نسخهٔ HTML و نسخهٔ متنی
  try {
    tgApi_('sendDocument', {
      chat_id: tgChat_(),
      document: docBlob.copyBlob().setName('قسمت-' + epNum + '.html'),
      caption: '📄 متن کامل قسمت با لینک منابع'
    });
    sent++;
    Utilities.sleep(1200);
    var txt = Utilities.newBlob(episodePlainText_(epNum, ep, items, cat), 'text/plain',
                                'قسمت-' + epNum + '.txt');
    tgApi_('sendDocument', { chat_id: tgChat_(), document: txt, caption: '📝 نسخهٔ متنی' });
    sent++;
  } catch (e5) { failed++; notes.push('پیوست: ' + e5.message); }

  var report = failed ? ('تلگرام: ' + sent + ' ارسال، ' + failed + ' ناموفق — ' + notes.join(' | ').slice(0, 200))
                      : ('تلگرام: ' + sent + ' مورد ارسال شد');
  logLine_(report);
  return report;
}

/** آزمون از منو */
function testTelegram() {
  var ui = ui_();
  if (!tgEnabled_()) {
    var miss = 'برای فعال‌شدن تلگرام، در Project Settings ← Script Properties این دو را اضافه کنید:\n\n' +
               'TELEGRAM_BOT_TOKEN\nTELEGRAM_CHAT_ID\n\n' +
               'وضعیت فعلی — توکن: ' + (tgToken_() ? 'ثبت شده' : 'خالی') +
               ' · شناسهٔ چت: ' + (tgChat_() ? 'ثبت شده' : 'خالی');
    if (ui) ui.alert('تلگرام', miss, ui.ButtonSet.OK); else console.log(miss);
    return;
  }
  var msg;
  try {
    var me = tgApi_('getMe', {});
    tgSend_('✅ <b>اتصال برقرار است.</b>\nموتور محتوای آرشیو از این پس قسمت‌ها را همین‌جا می‌فرستد.');
    var uname = (me.result && me.result.username) ? '@' + me.result.username : 'نامشخص';
    msg = 'ارسال شد.\n\nربات: ' + uname + '\nچت: ' + tgChat_() +
          '\n\nیک پیام آزمایشی در ربات ببینید.';
  } catch (e) {
    msg = 'ناموفق: ' + e.message + '\n\nمعمولاً یعنی توکن غلط است، یا هنوز در ربات ' +
          '/start را نزده‌اید، یا شناسهٔ چت اشتباه است.';
  }
  if (ui) ui.alert('آزمون تلگرام', msg, ui.ButtonSet.OK); else console.log(msg);
}

/** متن سادهٔ قسمت تخصصی برای پیوست .txt */
function specialPlainText_(meta) {
  var ep = meta.ep || {};
  var L = [];
  L.push(CFG.SPECIAL_SHOW_NAME + ' — قسمت ' + meta.epNum);
  L.push('مجموعه: ' + meta.seriesName);
  L.push('پوشش: ' + coverShortText_(meta));
  L.push(meta.recap ? 'این مرورِ پایانیِ مجموعه است.'
                    : (meta.more ? 'ادامه دارد.' : 'این قسمتِ درس تمام شد.'));
  L.push('');
  if (ep.goal) {
    L.push('— هدف و انتظار —');
    L.push('چه مشکلی را حل می‌کند: ' + (ep.goal.problem || ''));
    L.push('چه کاری را متفاوت انجام بدهم: ' + (ep.goal.behavior || ''));
    L.push('پیام اصلی: ' + (ep.goal.message || ''));
    L.push('');
  }
  L.push('— متن قسمت —'); L.push('');
  if (ep.hook) L.push(ep.hook);
  if (ep.recap) { L.push(''); L.push('[مرور قسمت‌های قبل] ' + ep.recap); }
  for (var i = 0; i < (ep.sections || []).length; i++) {
    L.push(''); L.push('▍ ' + (ep.sections[i].heading || ''));
    L.push(ep.sections[i].narration || '');
  }
  L.push(''); L.push(ep.outro || '');
  if (meta.enrich && meta.enrich.length) {
    L.push(''); L.push('— موادِ مکمل، خارج از درس —');
    for (var e = 0; e < meta.enrich.length; e++) {
      L.push((e + 1) + '. [' + meta.enrich[e].kind + '] ' +
             String(meta.enrich[e].topic).slice(0, 140));
      L.push('   ' + meta.enrich[e].link);
    }
  }
  return L.join('\n');
}

/**
 * ارسال یک قسمت درس‌نامه به ربات.
 * ساختارش عمداً با برنامهٔ متنوع فرق دارد: سرپیام می‌گوید کدام مجموعه و کدام
 * بخشِ درس، و هشتگ‌ها با «#درس‌نامه» شروع می‌شوند تا دو برنامه در تلگرام
 * جداگانه قابل جست‌وجو باشند.
 */
function sendTelegramSpecial_(meta, audioFiles, docBlob, dur, folder, tags) {
  if (!tgEnabled_()) return 'تنظیم نشده';
  var ep = meta.ep || {};
  var sent = 0, failed = 0, notes = [];

  try {
    var head = '📚 <b>' + tgEsc_(CFG.SPECIAL_SHOW_NAME) + ' — قسمت ' + meta.epNum + '</b>\n' +
               '<b>' + tgEsc_(ep.title || '') + '</b>\n' +
               '🎓 مجموعهٔ «' + tgEsc_(meta.seriesName) + '»\n' +
               '📖 ' + tgEsc_(coverShortText_(meta)) + '\n' +
               '⏱ ' + tgEsc_(dur) +
               (meta.enrich && meta.enrich.length
                  ? '  ·  ➕ ' + meta.enrich.length + ' منبع مکمل (خارج از درس)' : '') + '\n' +
               (meta.more ? '↪️ ادامه دارد\n' : '✅ این قسمتِ درس تمام شد\n') +
               tgMusicLine_() + '\n' +
               tgHandoutLine_(meta.seriesName) +
               (ep.summary ? tgEsc_(ep.summary) + '\n\n' : '') +
               (ep.goal && ep.goal.message ? '🎯 ' + tgEsc_(ep.goal.message) + '\n\n' : '') +
               tgEsc_((tags || []).join(' ')) + '\n' +
               '<a href="' + tgEsc_(folder.getUrl()) + '">پوشهٔ قسمت در درایو</a>';
    tgSend_(head); sent++;
  } catch (e) { failed++; notes.push('سرپیام: ' + e.message); }

  try {
    var parts = tgSplit_(specialNarration_(ep), 3800);
    for (var i = 0; i < parts.length; i++) {
      tgSend_('<b>متن درس‌نامه' + (parts.length > 1 ? ' (' + (i + 1) + '/' + parts.length + ')' : '') +
              '</b>\n\n' + tgEsc_(parts[i]));
      sent++;
      Utilities.sleep(1200);
    }
  } catch (e2) { failed++; notes.push('متن: ' + e2.message); }

  sent += tgEnrichBlock_(meta.ep || {});
  sent += tgMustSeeBlock_(meta.ep || {}, null);

  if (meta.enrich && meta.enrich.length) {
    try {
      var lines = ['<b>موادِ مکمل — خارج از درس</b>',
                   '<i>این‌ها بخشی از خودِ درس نیستند؛ برای تعمیق و تکمیل آمده‌اند.</i>'];
      for (var r = 0; r < meta.enrich.length; r++) {
        var x = meta.enrich[r];
        var label = tgEsc_(String(x.topic).slice(0, 90) || 'بدون عنوان');
        var link = String(x.link || '');
        lines.push((r + 1) + '. ' + tgKindIcon_(x.kind) + ' ' +
                   (link.indexOf('http') === 0
                      ? '<a href="' + tgEsc_(link) + '">' + label + '</a>' : label) +
                   ' <i>(' + tgEsc_(x.cat) + ')</i>');
      }
      var sp = tgSplit_(lines.join('\n'), 3800);
      for (var s2 = 0; s2 < sp.length; s2++) { tgSend_(sp[s2]); sent++; Utilities.sleep(1000); }
    } catch (e3) { failed++; notes.push('مکمل: ' + e3.message); }
  }

  for (var a = 0; a < (audioFiles || []).length; a++) {
    var f = audioFiles[a];
    try {
      var blob = DriveApp.getFileById(f.id).getBlob();
      var cap = '📚 ' + tgEsc_(CFG.SPECIAL_SHOW_NAME) + ' — ' + tgEsc_(ep.title || '') +
                (audioFiles.length > 1 ? ' — بخش ' + (a + 1) + ' از ' + audioFiles.length
                                       : ' (کل قسمت)') +
                '\n' + tgEsc_((tags || []).slice(0, 6).join(' '));
      try {
        tgApi_('sendAudio', {
          chat_id: tgChat_(), audio: blob, caption: cap, parse_mode: 'HTML',
          title: CFG.SPECIAL_SHOW_NAME + ' ' + meta.epNum + ' — ' + String(ep.title || ''),
          performer: String(meta.seriesName || CFG.SPECIAL_SHOW_NAME)
        });
      } catch (inner) {
        tgApi_('sendDocument', { chat_id: tgChat_(), document: blob, caption: cap, parse_mode: 'HTML' });
      }
      sent++;
      Utilities.sleep(1500);
    } catch (e4) { failed++; notes.push('صوت ' + (a + 1) + ': ' + e4.message); }
  }

  try {
    tgApi_('sendDocument', {
      chat_id: tgChat_(),
      document: docBlob.copyBlob().setName('درس‌نامه-' + meta.epNum + '.html'),
      caption: '📄 متن کامل درس‌نامه با جدول پوشش'
    });
    sent++;
    Utilities.sleep(1200);
    var txt = Utilities.newBlob(specialPlainText_(meta), 'text/plain',
                                'درس‌نامه-' + meta.epNum + '.txt');
    tgApi_('sendDocument', { chat_id: tgChat_(), document: txt, caption: '📝 نسخهٔ متنی' });
    sent++;
  } catch (e5) { failed++; notes.push('پیوست: ' + e5.message); }

  var msg = sent + ' مورد ارسال شد' + (failed ? ' · ' + failed + ' ناموفق: ' + notes.join(' | ') : '');
  logLine_('تلگرام درس‌نامه: ' + msg);
  return msg.slice(0, 400);
}
