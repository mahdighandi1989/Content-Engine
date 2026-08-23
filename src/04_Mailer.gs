/**
 * 04_Mailer.gs — رندر HTML قسمت و ارسال ایمیل
 * هر قسمت با متن کامل، جدول منابع (لینک مستقیم هر ویدیو و عکس) و لینک فایل صوتی ارسال می‌شود.
 */

function esc_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

var CSS_ = [
  'body{font-family:Tahoma,"Segoe UI",Arial,sans-serif;direction:rtl;text-align:right;',
  'background:#f4f6fa;color:#1a2233;margin:0;padding:24px;line-height:1.95}',
  '.wrap{max-width:760px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;',
  'box-shadow:0 2px 14px rgba(20,30,60,.09)}',
  '.hd{background:linear-gradient(135deg,#1f3864,#2e5cb8);color:#fff;padding:26px 30px}',
  '.hd h1{margin:0 0 6px;font-size:22px;line-height:1.5}',
  '.hd .meta{opacity:.85;font-size:13px}',
  '.bd{padding:26px 30px}',
  '.pill{display:inline-block;background:#e8eefc;color:#1f3864;border-radius:20px;',
  'padding:3px 13px;font-size:12px;margin:0 0 0 6px}',
  '.audio{background:#eef7ee;border:1px solid #cfe6cf;border-radius:10px;padding:14px 18px;margin:18px 0}',
  '.audio a{color:#166534;font-weight:bold;text-decoration:none}',
  'h2{font-size:17px;color:#1f3864;margin:26px 0 8px;padding-bottom:6px;border-bottom:2px solid #e8eefc}',
  'p{margin:0 0 13px;text-align:justify}',
  'table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}',
  'th{background:#1f3864;color:#fff;padding:9px;text-align:right;font-weight:normal}',
  'td{border-bottom:1px solid #e6e9f0;padding:9px;vertical-align:top}',
  'tr:nth-child(even) td{background:#fafbfe}',
  '.k{display:inline-block;min-width:44px;font-size:11px;border-radius:4px;padding:2px 7px;color:#fff;text-align:center}',
  '.kv{background:#2e5cb8}.kp{background:#8a6d1f}.ka{background:#1f7a5a}.kd{background:#6b3f8a}',
  '.ft{background:#f4f6fa;padding:18px 30px;font-size:12px;color:#5a6478;border-top:1px solid #e6e9f0}',
  'a{color:#2e5cb8}'
].join('');

/** رنگِ برچسبِ نوع در جدول منابع. */
function kindCss_(kind) {
  if (kind === 'ویدیو') return 'kv';
  if (kind === 'صدا') return 'ka';
  if (kind === 'سند') return 'kd';
  return 'kp';
}

/**
 * جعبهٔ «مشاهدهٔ ضروری» — درخواستِ صریحِ کاربر: هر جا صوت و متن نمی‌توانند
 * منبع را کامل منتقل کنند (نمودار، حرکتِ تصویری، جدول...)، باید دقیق گفته
 * شود «کجای کدام منبع را ببین، چرا، و دیدنش چه می‌دهد». نویسنده این را در
 * فیلد mustSee هر بخش می‌گذارد و این تابع همان را کنارِ همان بخش می‌نشاند.
 * itemsOpt اگر باشد، شناسه به لینکِ مستقیمِ همان منبع گره می‌خورد.
 */
function mustSeeHtml_(sec, itemsOpt) {
  var list = (sec && sec.mustSee) || [];
  if (!list.length) return '';
  var h = ['<div style="border:1px solid #b45309;border-radius:8px;padding:10px 12px;' +
           'margin:10px 0;background:#fff8f0">'];
  h.push('<b>🎯 مشاهدهٔ ضروری</b> <span style="font-size:12px;color:#5a6478">' +
         '(این بخش را صوت و متن به‌تنهایی کامل منتقل نمی‌کنند)</span>');
  for (var i = 0; i < list.length; i++) {
    var m = list[i] || {};
    var it = itemsOpt ? findItem_(itemsOpt, m.source) : null;
    var name = it ? ((it.kind ? it.kind + ': ' : '') + String(it.topic || '').slice(0, 90))
                  : ('منبع ' + esc_(String(m.source || '')));
    var link = it && it.link && String(it.link).indexOf('http') === 0
      ? ' — <a href="' + esc_(it.link) + '">باز کردن منبع</a>' : '';
    h.push('<div style="margin-top:8px;font-size:13px">');
    h.push('<b>' + (it ? esc_(name) : name) + '</b>' + link);
    if (m.where) h.push('<br>📍 کجا: ' + esc_(String(m.where)));
    if (m.why) h.push('<br>چرا دیدنش لازم است: ' + esc_(String(m.why)));
    if (m.benefit) h.push('<br>چه چیزی نصیبتان می‌شود: ' + esc_(String(m.benefit)));
    h.push('</div>');
  }
  h.push('</div>');
  return h.join('');
}

/**
 * بندِ موسیقیِ ایمیل — «چه پخش شد، کجا، و چرا».
 *
 * تا ۵٫۶۰ هیچ‌جای ایمیل و تلگرام نامی از موسیقی نبود. یعنی برای فهمیدنِ
 * اینکه امروز چه قطعه‌ای سرِ برنامه پخش شده، باید شیت باز می‌شد. تصمیمی که
 * دیده نشود، بازبینی هم نمی‌شود.
 */
function musicHtml_() {
  try {
    var st = musicStatus_();
    if (!st) return '';
    var L = ['<div class="audio" style="background:#f5f3ff;border-color:#ddd6fe">',
             '🎵 <b>موسیقی:</b><br>'];
    var last = st.last;
    if (last && last.tracks && last.tracks.length) {
      L.push('پخش‌شده: ' + esc_(last.tracks.join(' · ')) + '<br>');
      if (last.mood) L.push('حال‌وهوا: ' + esc_(last.mood) + '<br>');
    } else if (st.tracks) {
      L.push('این قسمت بی‌موسیقی ساخته شد (بانک ' + st.tracks + ' قطعه دارد).<br>');
    } else {
      L.push('بانکِ موسیقی خالی است؛ قسمت بی‌موسیقی ساخته شد.<br>');
    }
    if (last && last.missing && last.missing.length) {
      L.push('<span style="color:#b45309">برای این جایگاه‌ها قطعه‌ای نبود: ' +
             esc_(last.missing.join('، ')) + '</span><br>');
    }
    if (st.slots) {
      var bits = [];
      for (var k in st.slots) if (st.slots.hasOwnProperty(k)) bits.push(k + ': ' + st.slots[k]);
      L.push('<span style="color:#666;font-size:12px">بانک — ' + esc_(bits.join(' · ')) +
             ' (هدف ' + st.target + ' در هر جایگاه)</span>');
    }
    L.push('</div>');
    return L.join('');
  } catch (e) { return ''; }
}

function episodeHtml_(epNum, ep, items, cat, audioLinks) {
  var h = [];
  h.push('<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8">');
  h.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  h.push('<title>' + esc_(ep.title) + '</title><style>' + CSS_ + '</style></head><body><div class="wrap">');

  h.push('<div class="hd"><h1>قسمت ' + epNum + ' — ' + esc_(ep.title) + '</h1>');
  h.push('<div class="meta">' + esc_(nowStr_()) + ' &nbsp;·&nbsp; دستهٔ «' + esc_(cat) + '» &nbsp;·&nbsp; ' +
         items.length + ' منبع</div></div>');
  h.push('<div class="bd">');

  if (ep.tags && ep.tags.length) {
    h.push('<div>');
    for (var t = 0; t < ep.tags.length; t++) h.push('<span class="pill">' + esc_(ep.tags[t]) + '</span>');
    h.push('</div>');
  }
  if (ep.summary) h.push('<p style="margin-top:14px"><b>خلاصه:</b> ' + esc_(ep.summary) + '</p>');

  if (audioLinks && audioLinks.length) {
    h.push('<div class="audio">🎧 <b>فایل صوتی:</b><br>');
    for (var a = 0; a < audioLinks.length; a++) {
      h.push('<a href="' + esc_(audioLinks[a].url) + '">' + esc_(audioLinks[a].name) + '</a>' +
             (audioLinks[a].whole ? ' <span style="color:#166534;font-size:12px">' +
                                    '(کل قسمت در یک فایل)</span>' : '') + '<br>');
    }
    h.push('</div>');
  }
  h.push(musicHtml_());

  h.push('<h2>متن قسمت</h2>');
  h.push('<p><i>' + esc_(ep.hook) + '</i></p>');
  for (var s = 0; s < ep.sections.length; s++) {
    h.push('<h2>' + esc_(ep.sections[s].heading) + '</h2>');
    var paras = String(ep.sections[s].narration || '').split(/\n+/);
    for (var p = 0; p < paras.length; p++) if (paras[p].trim()) h.push('<p>' + esc_(paras[p]) + '</p>');
    var ids = ep.sections[s].sourceIds || [];
    if (ids.length) {
      var links = [];
      for (var i2 = 0; i2 < ids.length; i2++) {
        var it = findItem_(items, ids[i2]);
        if (it) links.push('<a href="' + esc_(it.link) + '">' +
                           esc_(it.kind || 'منبع') + ' ' + (i2 + 1) + '</a>');
      }
      if (links.length) h.push('<p style="font-size:12px;color:#5a6478">منبع این بخش: ' +
                               links.join(' &nbsp;|&nbsp; ') + '</p>');
    }
    h.push(mustSeeHtml_(ep.sections[s], items));
  }
  h.push('<p><b>' + esc_(ep.outro) + '</b></p>');

  h.push('<h2>منابع این قسمت</h2>');
  h.push('<table><tr><th>#</th><th>نوع</th><th>موضوع</th><th>امتیاز</th><th>لینک</th></tr>');
  for (var r = 0; r < items.length; r++) {
    var x = items[r];
    h.push('<tr><td>' + (r + 1) + '</td>' +
           '<td><span class="k ' + kindCss_(x.kind) + '">' + esc_(x.kind) + '</span>' +
           (x.isRef ? '<div style="color:#5b6577;font-size:11px">ارجاع به قسمت گذشته</div>' : '') + '</td>' +
           '<td>' + esc_(String(x.topic).slice(0, 160)) +
           (x.parts ? '<div style="color:#5b6577;font-size:11px">' + esc_(String(x.parts)) +
                      ' — خلاصه از سراسر فایل</div>' : '') + '</td>' +
           '<td>' + x.score + '</td>' +
           '<td>' + (x.link && String(x.link).indexOf('http') === 0
                      ? '<a href="' + esc_(x.link) + '">باز کردن فایل</a>' : '—') +
           (x.flag ? '<div style="color:#b45309;font-size:11px">⚠ این فایل در شیت منبع ' +
                     'چند بار پردازش شده و ردیف‌های مشابه دارد.</div>' : '') +
           '</td></tr>');
  }
  h.push('</table></div>');
  // منابعِ بیرونی — بعد از منابعِ اصلی، چون اصل، محتوای خودِ آرشیو است.
  var extH = extSourcesHtml_(ep);
  if (extH) h.push('<div class="wrap"><div class="bd">' + extH + '</div></div>');
  // این جملهٔ پایانی باید راست بگوید. تا دیروز همیشه می‌نوشت «چیزی افزوده نشده»؛
  // از امروز که ممکن است مطلبِ بیرونی افزوده شده باشد، دروغ می‌شد.
  var addedAny = ep && ep.__enrich && ep.__enrich.applied;
  h.push('<div class="ft">تولیدشده به‌صورت خودکار از آرشیو شخصی شما · ' +
         (addedAny
            ? 'بدنهٔ اصلی برگرفته از همان ویدیوها و عکس‌هاست؛ ' +
              'افزوده‌های بیرونی در متن علامت خورده‌اند و منابعشان بالا آمده.'
            : 'همهٔ محتوا برگرفته از همان ویدیوها و عکس‌هاست و چیزی به آن افزوده نشده است.') +
         '</div>');
  h.push('</div></body></html>');
  return h.join('');
}

function findItem_(items, id) {
  for (var i = 0; i < items.length; i++) if (String(items[i].id) === String(id)) return items[i];
  return null;
}

function sendEpisodeEmail_(epNum, ep, items, cat, audioLinks, docBlob, dur, folder) {
  try {
    var html = episodeHtml_(epNum, ep, items, cat, audioLinks);
    var intro = [
      '<div class="wrap" style="margin-bottom:14px"><div class="bd">',
      '<p style="margin:0"><b>مدت:</b> ', esc_(dur), ' &nbsp;·&nbsp; ',
      '<b>پوشهٔ قسمت:</b> <a href="', esc_(folder.getUrl()), '">باز کردن در درایو</a> &nbsp;·&nbsp; ',
      '<b>بانک محتوا:</b> <a href="', esc_(getHub_().getUrl()), '">CONTENT-HUB</a></p>',
      '</div></div>'
    ].join('');

    var body = html.replace('<div class="wrap">', intro + '<div class="wrap">');

    MailApp.sendEmail({
      to: CFG.EMAIL_TO,
      subject: '🎧 قسمت ' + epNum + ' — ' + ep.title + ' (' + cat + ')',
      htmlBody: body,
      attachments: [docBlob.copyBlob().setName('قسمت-' + epNum + '.html')],
      name: 'موتور محتوای آرشیو'
    });
    return true;
  } catch (e) {
    logLine_('خطای ارسال ایمیل: ' + e.message);
    return false;
  }
}

// ================================================================ درس‌نامه

/**
 * سندِ HTML قسمت تخصصی. تفاوتش با قسمتِ متنوع در سه چیز است: بلوکِ «هدف دوره»،
 * جدولِ پوشش (چه قطعه‌هایی از کدام قسمت آمد و چه چیزی مانده)، و جداییِ صریحِ
 * «موادِ مکمل خارج از درس» از خودِ درس.
 */
function specialHtml_(meta, audioLinks, dur, tags) {
  var ep = meta.ep || {};
  var h = [];
  h.push('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">');
  h.push('<title>' + esc_(ep.title || '') + '</title><style>' + CSS_ + '</style>');
  h.push('<div class="wrap"><div class="hd">');
  h.push('<div style="opacity:.75;font-size:13px">' + esc_(CFG.SPECIAL_SHOW_NAME) + ' — ' +
         esc_(CFG.SPECIAL_TAGLINE) + '</div>');
  h.push('<h1>قسمت ' + meta.epNum + ' — ' + esc_(ep.title || '') + '</h1>');
  h.push('<div style="opacity:.85">مجموعهٔ «' + esc_(meta.seriesName) + '» · ' +
         esc_(dur) + ' · ' + esc_(nowStr_()) + '</div>');
  h.push('</div><div class="bd">');

  // پوشش: دقیقاً چه چیزی از درس در این قسمت آمد
  h.push('<h2>پوششِ این قسمت</h2>');
  h.push('<table><tr><th>مجموعه</th><th>قسمتِ درس</th><th>قطعه‌ها</th><th>ادامه دارد؟</th></tr>');
  var cvs = meta.covers && meta.covers.length ? meta.covers
    : [{ partSeq: meta.partSeq, partName: meta.partName, fromNo: meta.fromNo,
         toNo: meta.toNo, totalChunks: meta.totalChunks, more: meta.more }];
  for (var cq = 0; cq < cvs.length; cq++) {
    var cx = cvs[cq];
    h.push('<tr><td>' + (cq === 0 ? esc_(meta.seriesName) : '↳') + '</td>' +
           '<td>' + esc_('قسمت ' + cx.partSeq + ' — ' + cx.partName) + '</td>' +
           '<td>' + esc_(cx.fromNo + ' تا ' + cx.toNo + ' از ' + cx.totalChunks) + '</td>' +
           '<td>' + (cx.more ? 'بله، ادامه در قسمت بعد' : 'خیر، این قسمتِ درس تمام شد') +
           '</td></tr>');
  }
  h.push('</table>');
  if (ep.coverage) h.push('<p>' + esc_(ep.coverage) + '</p>');
  h.push(musicHtml_());

  // هدف و انتظارِ دوره
  if (ep.goal) {
    h.push('<h2>هدف و انتظارِ این آموزش</h2>');
    h.push('<table>');
    h.push('<tr><th>چه مشکلی را حل می‌کند</th><td>' + esc_(ep.goal.problem || '') + '</td></tr>');
    h.push('<tr><th>چه کاری را متفاوت انجام بدهم</th><td>' + esc_(ep.goal.behavior || '') + '</td></tr>');
    h.push('<tr><th>پیام اصلی در یک جمله</th><td>' + esc_(ep.goal.message || '') + '</td></tr>');
    h.push('</table>');
  }

  if (audioLinks && audioLinks.length) {
    h.push('<h2>فایل صوتی</h2><ul>');
    for (var a = 0; a < audioLinks.length; a++) {
      h.push('<li><a href="' + esc_(audioLinks[a].url) + '">' + esc_(audioLinks[a].name) + '</a>' +
             (audioLinks[a].whole ? ' <b>(کل قسمت، یکجا)</b>' : '') + '</li>');
    }
    h.push('</ul>');
  }

  h.push('<h2>متن قسمت</h2>');
  if (ep.hook) h.push('<p><i>' + esc_(ep.hook) + '</i></p>');
  if (ep.recap) h.push('<div class="audio"><b>مرورِ قسمت‌های قبل:</b> ' + esc_(ep.recap) + '</div>');
  for (var s = 0; s < (ep.sections || []).length; s++) {
    var sec = ep.sections[s];
    h.push('<h2>' + esc_(sec.heading || '') + '</h2>');
    var paras = String(sec.narration || '').split(/\n+/);
    for (var p = 0; p < paras.length; p++) if (paras[p].trim()) h.push('<p>' + esc_(paras[p]) + '</p>');
    var refs = [];
    if (sec.chunkNos && sec.chunkNos.length) refs.push('قطعهٔ ' + sec.chunkNos.join('، '));
    if (sec.enrichIds && sec.enrichIds.length) refs.push('مکمل: ' + sec.enrichIds.join('، '));
    if (refs.length) h.push('<p style="font-size:12px;color:#5a6478">' + esc_(refs.join('  |  ')) + '</p>');
    h.push(mustSeeHtml_(sec, null));
  }
  if (ep.outro) h.push('<p><b>' + esc_(ep.outro) + '</b></p>');

  // موادِ مکمل، جدا و با برچسبِ صریح
  if (meta.enrich && meta.enrich.length) {
    h.push('<h2>موادِ مکمل — خارج از درس</h2>');
    h.push('<p style="font-size:13px;color:#5a6478">این‌ها بخشی از خودِ درس نیستند؛ ' +
           'برای تعمیق و تکمیل از سایر فایل‌های آرشیو آمده‌اند.</p>');
    h.push('<table><tr><th>#</th><th>نوع</th><th>موضوع</th><th>دسته</th><th>لینک</th></tr>');
    for (var e = 0; e < meta.enrich.length; e++) {
      var x = meta.enrich[e];
      h.push('<tr><td>' + (e + 1) + '</td>' +
             '<td><span class="k ' + kindCss_(x.kind) + '">' + esc_(x.kind) + '</span></td>' +
             '<td>' + esc_(String(x.topic).slice(0, 160)) + '</td>' +
             '<td>' + esc_(x.cat) + '</td>' +
             '<td><a href="' + esc_(x.link) + '">باز کردن</a></td></tr>');
    }
    h.push('</table>');
  }

  var extSp = extSourcesHtml_(meta.ep || {});
  if (extSp) h.push(extSp);

  if (tags && tags.length) {
    h.push('<h2>برچسب‌ها</h2><p>' + esc_(tags.join('  ')) + '</p>');
  }
  h.push('</div></div></html>');
  return h.join('\n');
}

function sendSpecialEmail_(meta, audioLinks, docBlob, dur, folder, tags) {
  try {
    var ep = meta.ep || {};
    var html = specialHtml_(meta, audioLinks, dur, tags);
    var intro = [
      '<div class="wrap" style="margin-bottom:14px"><div class="bd">',
      '<p style="margin:0"><b>مدت:</b> ', esc_(dur), ' &nbsp;·&nbsp; ',
      '<b>پوشهٔ قسمت:</b> <a href="', esc_(folder.getUrl()), '">باز کردن در درایو</a> &nbsp;·&nbsp; ',
      '<b>بانک محتوا:</b> <a href="', esc_(getHub_().getUrl()), '">CONTENT-HUB</a></p>',
      '</div></div>'
    ].join('');
    MailApp.sendEmail({
      to: CFG.EMAIL_TO,
      subject: '📚 ' + CFG.SPECIAL_SHOW_NAME + ' ' + meta.epNum + ' — ' +
               String(meta.seriesName).slice(0, 40) + ' — ' + String(ep.title || '').slice(0, 60),
      htmlBody: html.replace('<div class="wrap">', intro + '<div class="wrap">'),
      attachments: [docBlob.copyBlob().setName('درس‌نامه-' + meta.epNum + '.html')],
      name: 'موتور محتوای آرشیو'
    });
    return true;
  } catch (e) {
    logLine_('خطای ارسال ایمیل درس‌نامه: ' + e.message);
    return false;
  }
}
