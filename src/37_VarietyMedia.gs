/* ═══════════════ بخشِ ۳۷ — «از همه جا از همه رنگ» با رسانه‌های خودِ منبع (۸.۹۶) ═══════════════
 *
 * خواستهٔ صاحبِ برنامه، ۱۴ اکتبر: «پادکست‌های از همه جا هم از شکلِ صرفاً صوتی و یه عکسِ پس‌زمینهٔ
 * خشک و خالی دربیاد … فرقش با درس‌نامه اینه که برای درس‌نامه عکس رو مدل تولید می‌کنه … ولی برای
 * از همه جا این محتوا تو خودِ کلیپ‌های منبع هست. همون‌ها رو باید در حینِ اینکه می‌گه … کات بزنه،
 * هم زمان‌بندی کات بزنه هم از نظرِ هم‌سایز بودن با کادر برش بزنه».
 *
 * پس هیچ مسیرِ تازه‌ای برای ویدئو ساخته نمی‌شود: همان صحنه‌های درس‌نامه (`scenekit.build`) — نشان و
 * شناسهٔ کانال، نوشتهٔ برداری، نشاندنِ مرز روی مکث، سنجشِ قاب و شنیدنِ هم‌زمانی — فقط تصویرِ هر صحنه
 * به‌جای نقاشیِ ساخته‌شده، **خودِ رسانهٔ منبع** است. دو مسیر برای یک کار همان چیزی است که این مخزن
 * بارها تاوانش را داده.
 *
 * مرزها، همه در کد:
 *   • شیت‌ها و پوشه‌های منبع **فقط خوانده** می‌شوند. رونوشت در زیرپوشهٔ خودِ قسمت (`VM_FOLDER`) و
 *     اشتراکِ موقت فقط روی رونوشت — هرگز روی فایلِ منبع (`setSharing` نوشتن است).
 *   • زیرپوشه، نه خودِ پوشهٔ قسمت: `ytVideoIn_` هر mp4ِ پوشهٔ قسمت را «ویدئوی ساخته‌شده» می‌گیرد،
 *     پس کلیپِ منبعی که آن‌جا بنشیند **به‌جای قسمت آپلود می‌شود**.
 *   • زمان را کد می‌دهد، نه مدل: مدل شمارهٔ جمله می‌گوید و ثانیه از `_times.json` می‌آید.
 *   • شناسه‌ای که مدل ساخت و در قسمت نبود، دور ریخته می‌شود؛ بخشی که رسانه داشت و مدل جا انداخت،
 *     رسانه‌اش را سرِ نخستین جملهٔ خودش می‌گیرد — «محتوای تصویری حیف نشود».
 *   • «لحظه» (کلیپ با صدای خودش، گوینده ساکت) سقف دارد و هرگز روی موسیقی نمی‌نشیند.
 *   • نشد ⇒ همان ویدئوی پیشین، **با علت** (`VM_LAST`). ویدئوی ساده از ویدئوی نیامده بهتر است.
 */

function vmOn_(show) {
  try {
    if (CFG.VM_ENABLED === false) return false;
    var list = CFG.VM_SHOWS || ['variety'];
    for (var i = 0; i < list.length; i++) if (String(list[i]) === String(show)) return true;
    return false;
  } catch (e) { return false; }
}

function vmName_() { return CFG.VM_FILE || '_media.json'; }

function vmRead_(folder) {
  try {
    var it = folder.getFilesByName(vmName_());
    if (!it.hasNext()) return null;
    var d = JSON.parse(it.next().getBlob().getDataAsString());
    return (d && typeof d === 'object') ? d : null;
  } catch (e) { return null; }
}

function vmWrite_(folder, d) {
  try {
    var body = JSON.stringify(d);
    var it = folder.getFilesByName(vmName_());
    if (it.hasNext()) { it.next().setContent(body); return true; }
    folder.createFile(Utilities.newBlob(body, 'application/json', vmName_()));
    return true;
  } catch (e) { try { logLine_('`' + vmName_() + '` نوشته نشد: ' + e.message); } catch (e2) {} return false; }
}

/**
 * تکه‌های متنِ گفتارِ «از همه جا» — همان تکه‌های صداسازی، بی نقش‌گزینی و موسیقی (که فقط
 * صدا را می‌سازند). دوقلوی `specialTextChunks_`؛ هر دو از `speakSegPieces_` می‌خورند، پس شمارِ
 * تکه‌ها با `_times.json` می‌خوانَد.
 */
function varietyTextChunks_(ep, cat) {
  var segs = episodeSegments_(ep, cat);
  var out = [];
  for (var i = 0; i < segs.length; i++) {
    var plainS = speakSanitize_(String(segs[i].text || ''));
    var spoken = speakSanitize_(speakTextOf_(ep, i, plainS));
    var pieces = speakSegPieces_(ep, i, spoken);
    for (var j = 0; j < pieces.length; j++) {
      out.push({ text: pieces[j].t, seg: i, kind: String(segs[i].kind || 'body'),
                 secIndex: (segs[i].secIndex === undefined ? -1 : Number(segs[i].secIndex)) });
    }
  }
  return out;
}

/**
 * تکه‌ها با ثانیهٔ واقعی + بازه‌های موسیقی. همان هم‌ترازیِ درس‌نامه (`lvAlignTimes_`)؛
 * بازه‌های موسیقی از نوعِ ثبت‌شدهٔ هر زمان (`k: 'm'`) می‌آیند، نه از حدس.
 */
function vmReplay_(folder, meta) {
  var out = { chunks: [], secs: 0, music: [], how: '', why: '' };
  var tj = epTimesRead_(folder);
  if (!tj) { out.why = '`_times.json` در پوشهٔ قسمت نبود'; return out; }
  var tc = null;
  try { tc = varietyTextChunks_((meta && meta.ep) || {}, (meta && meta.cat) || ''); }
  catch (e) { out.why = 'تکه‌های گفتار دوباره ساخته نشد: ' + e.message; return out; }
  if (!tc || !tc.length) { out.why = 'تکه‌های گفتار دوباره ساخته نشد'; return out; }
  var secs = Number(tj.secs) || 0;
  var T = (tj.times || []).slice().sort(function (a, b) { return Number(a.i) - Number(b.i); });
  for (var m = 0; m < T.length; m++) {
    if (T[m] && T[m].k === 'm') {
      var a0 = Number(T[m].at) || 0, b0 = (m + 1 < T.length) ? Number(T[m + 1].at) : secs;
      if (b0 > a0) out.music.push([Math.round(a0 * 10) / 10, Math.round(b0 * 10) / 10]);
    }
  }
  var al = lvAlignTimes_(tc, tj.times, secs);
  if (al.map) {
    for (var k = 0; k < tc.length; k++) {
      var ti = al.map[k];
      var a = Number(T[ti].at) || 0;
      var b = (ti + 1 < T.length) ? Number(T[ti + 1].at) : secs;
      out.chunks.push({ text: tc[k].text, seg: tc[k].seg, secIndex: tc[k].secIndex, at: a, end: Math.max(a, b) });
    }
    out.secs = secs; out.how = al.how;
    return out;
  }
  /* ══ افکتی که تکه را دو نیم کرد (۸.۹۶ — از دادهٔ واقعیِ قسمتِ ۷۲) ══
     `musicWrap_` افکت را **وسطِ** یک تکهٔ گفتار می‌نشاند و آن را دو تکه می‌کند؛ پس `_times.json` یک
     زمانِ گفتارِ بیشتر دارد و هم‌ترازیِ «شمار به شمار» (`lvAlignTimes_`) نمی‌خوانَد: «۱۹ در برابرِ ۱۸».
     بازسازیِ جای دقیقِ افکت یعنی بازپخشِ کلِ نقشهٔ موسیقی؛ به‌جایش این‌جا یک تکهٔ متن می‌تواند روی دو
     یا سه زمانِ گفتارِ پشتِ‌هم بنشیند؛ کدام، از ناجوریِ مدت و طولِ متن (نرخِ گفتار تقریباً ثابت است). */
  var sp = vmAlignSplit_(tc, T, secs);
  if (!sp) { out.why = al.why + ' (' + tc.length + ' تکه، ' + T.length + ' زمان)'; return out; }
  out.chunks = sp; out.secs = secs; out.how = 'نیم‌شده';
  return out;
}

/**
 * هم‌ترازیِ تکه‌های متن با زمان‌های گفتار وقتی افکت تکه‌ای را نصف کرده. برنامه‌ریزیِ پویا: هر تکهٔ متن
 * ۱ تا ۳ زمانِ گفتارِ پشتِ‌هم می‌گیرد؛ هزینه = ناجوریِ مدت با طولِ متن، و کمی برای هر پاره و هر صدای
 * بلندِ میانِ پاره‌ها. تکهٔ چندپاره به نسبتِ مدتِ پاره‌ها، سرِ نزدیک‌ترین فاصله، بخش می‌شود.
 * @return {Array<{text, seg, secIndex, at, end}>|null}
 */
function vmAlignSplit_(tc, T, secs) {
  var ti = [];
  for (var i = 0; i < T.length; i++) if (T[i] && T[i].k === 't') ti.push(i);
  if (!ti.length || T.some(function (x) { return !x || (x.k !== 't' && x.k !== 'm'); })) return null;
  var N = ti.length, M = tc.length;
  if (N < M || N > M * 3) return null;
  var at = function (j) { return Number(T[ti[j]].at) || 0; };
  var endOf = function (j) { var q = ti[j] + 1; return q < T.length ? Number(T[q].at) : Number(secs) || at(j); };
  var dur = [];
  for (var j0 = 0; j0 < N; j0++) dur.push(Math.max(0.1, endOf(j0) - at(j0)));
  var L = tc.map(function (c) { return Math.max(1, String(c.text || '').replace(/[ً-ْٰ]/g, '').length); });
  var r = dur.reduce(function (p, q) { return p + q; }, 0) / L.reduce(function (p, q) { return p + q; }, 0);
  var INF = 1e9, C = [], B = [];
  for (var k = 0; k <= M; k++) { C.push([]); B.push([]); for (var j = 0; j <= N; j++) { C[k].push(INF); B[k].push(0); } }
  C[0][0] = 0;
  for (var k2 = 0; k2 < M; k2++) for (var j2 = 0; j2 < N; j2++) {
    if (C[k2][j2] >= INF) continue;
    var d = 0;
    for (var g = 1; g <= 3 && j2 + g <= N; g++) {
      /* صدای میانِ دو پاره هزینه دارد، نه دیوار: قسمتِ ۷۲ میانِ دو پارهٔ بخشِ یک ۱۲ ثانیه صدا داشت و
         سقفِ سختِ «۶ ثانیه» هم‌ترازی را به جای غلط هل داد (۳٫۸ و ۲۰٫۶ نویسه بر ثانیه، به‌جای ~۱۳). */
      var gap = g > 1 ? Math.max(0, at(j2 + g - 1) - endOf(j2 + g - 2)) : 0;
      d += dur[j2 + g - 1];
      var c = C[k2][j2] + Math.abs(Math.log(d / (L[k2] * r))) + 0.25 * (g - 1) + (gap > 6 ? 0.15 : 0);
      if (c < C[k2 + 1][j2 + g]) { C[k2 + 1][j2 + g] = c; B[k2 + 1][j2 + g] = g; }
    }
  }
  if (C[M][N] >= INF) return null;
  var groups = [], jj = N;
  for (var kk = M; kk > 0; kk--) { var gg = B[kk][jj]; groups.unshift([jj - gg, gg]); jj -= gg; }
  var out = [];
  for (var q = 0; q < M; q++) {
    var st = groups[q][0], n = groups[q][1], txt = String(tc[q].text || '');
    if (n === 1) {
      out.push({ text: txt, seg: tc[q].seg, secIndex: tc[q].secIndex, at: at(st), end: endOf(st) });
      continue;
    }
    var tot = 0;
    for (var a1 = 0; a1 < n; a1++) tot += dur[st + a1];
    var pos = 0;
    for (var a2 = 0; a2 < n; a2++) {
      var cut = a2 === n - 1 ? txt.length : Math.round(txt.length * (pos + dur[st + a2]) / tot);
      if (a2 < n - 1) {                                    // سرِ نزدیک‌ترین فاصله، نه وسطِ واژه
        var back = txt.lastIndexOf(' ', cut), fwd = txt.indexOf(' ', cut);
        cut = (fwd < 0 || (back >= 0 && cut - back <= fwd - cut)) ? Math.max(back, 0) : fwd;
      }
      var from = a2 === 0 ? 0 : out[out.length - 1].__to;
      out.push({ text: txt.slice(from, cut).trim(), seg: tc[q].seg, secIndex: tc[q].secIndex,
                 at: at(st + a2), end: endOf(st + a2), __to: cut });
      pos += dur[st + a2];
    }
  }
  for (var z = 0; z < out.length; z++) delete out[z].__to;
  return out.filter(function (x) { return x.text; });
}

/**
 * رسانه‌های این قسمت: فقط کلیپ و عکس، با `fileId`، و بخش‌هایی که هر کدام منبعشان است.
 * آنچه در `sourceIds`ِ هیچ بخشی نیست هم می‌آید (`sec` خالی) — بخش‌ها را مدل نوشته و ممکن است
 * شناسه‌ای را جا انداخته باشد؛ رسانه‌ای که در خودِ قسمت هست، حیف است.
 */
function vmItems_(meta) {
  var items = (meta && meta.items) || [], ep = (meta && meta.ep) || {};
  var secOf = {};
  for (var s = 0; s < (ep.sections || []).length; s++) {
    var ids = ep.sections[s].sourceIds || [];
    for (var k = 0; k < ids.length; k++) {
      var id0 = String(ids[k]);
      (secOf[id0] = secOf[id0] || []).push(s + 1);
    }
  }
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var kind = vmKind_(it.kind);
    var fid = vmFileId_(it);
    if (!kind || !fid) continue;
    var id = String(it.id || fid);
    out.push({ id: id, kind: kind, fileId: fid, sec: secOf[id] || [],
               topic: String(it.topic || '').slice(0, 160),
               summary: String(it.summary || '').slice(0, 420),
               words: String(it.body || '').replace(/\s+/g, ' ').slice(0, kind === 'video' ? 900 : 400),
               vibe: String(it.vibe || '').slice(0, 160) });
  }
  return out;
}

/**
 * نوعِ رسانه از **شکلِ ذخیره‌شده**، نه از شکلی که آسان است. `_episode.json`ِ واقعیِ قسمتِ ۷۲ (۱۴ اکتبر)
 * «ویدیو» و «عکس» و «صدا» داشت، نه video/photo — نگارشِ اولِ این بخش و آزمونش هر دو video/photo
 * فرض کرده بودند و **هر** قسمت «کلیپ یا عکسِ منبع ندارد» می‌خورد. «صدا» تصویری ندارد ⇒ کنار.
 */
function vmKind_(k) {
  var s = String(k || '').trim().toLowerCase();
  if (s === 'video' || s === 'ویدیو' || s === 'ویدئو' || s === 'فیلم' || s === 'کلیپ') return 'video';
  if (s === 'photo' || s === 'image' || s === 'عکس' || s === 'تصویر') return 'photo';
  return '';
}

/** شناسهٔ فایلِ درایو: `fileId`، یا `id`ِ خودِ مورد (در قسمت‌های واقعی همان شناسهٔ فایل است)، یا از `link`. */
function vmFileId_(it) {
  var c = [it && it.fileId, it && it.id];
  for (var i = 0; i < c.length; i++) {
    var v = String(c[i] || '').trim();
    if (/^[A-Za-z0-9_\-]{20,}$/.test(v)) return v;
  }
  var m = String((it && it.link) || '').match(/\/d\/([A-Za-z0-9_\-]{20,})/) ||
          String((it && it.link) || '').match(/[?&]id=([A-Za-z0-9_\-]{20,})/);
  return m ? m[1] : '';
}

var VM_SCHEMA = {
  type: 'OBJECT',
  properties: {
    placements: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      item: { type: 'STRING' }, from: { type: 'STRING' },
      clipQuote: { type: 'STRING' },
      moment: { type: 'STRING' }, momentAfter: { type: 'STRING' },
      ov: { type: 'STRING' }, ovTitle: { type: 'STRING' }, ovLines: { type: 'STRING' } },
      required: ['item', 'from'] } },
    cover: { type: 'STRING' }
  },
  required: ['placements']
};

function vmPrompt_(sents, items, ctx) {
  var L = [];
  L.push('تو تدوین‌گرِ ویدئوی یک پادکستِ فارسی هستی: «' + String(ctx.showName || CFG.SHOW_NAME || '') + '».');
  L.push('صدای قسمت آماده است. تصویرِ ویدئو **خودِ رسانه‌های منبع** است — همان کلیپ‌ها و عکس‌هایی که گوینده');
  L.push('درباره‌شان حرف می‌زند. کارِ تو: بگو هر رسانه از کدام جمله روی صفحه بیاید.');
  L.push('');
  L.push('قاعده‌ها:');
  L.push('۱) هر رسانه را از همان جمله‌ای بیاور که گوینده **شروع** می‌کند درباره‌اش حرف بزند — نه زودتر، نه دیرتر.');
  L.push('   تصویر باید دقیقاً همان چیزی باشد که در آن لحظه گفته می‌شود.');
  L.push('۲) فقط شناسه‌های فهرستِ پایین. هر رسانه‌ای که گوینده درباره‌اش حرف می‌زند باید بیاید؛ اگر یک بخش');
  L.push('   دربارهٔ چند رسانه است، هر کدام سرِ جملهٔ خودش.');
  L.push('۳) clipQuote فقط برای کلیپی که گفتار دارد: تکه‌ای **عیناً** از «گفتارِ کلیپ» (۴ تا ۱۵ واژه) که با همان');
  L.push('   چیزی که گوینده می‌گوید می‌خوانَد — تا همان تکهٔ کلیپ نشان داده شود. نبود ⇒ خالی.');
  L.push('۴) moment = «بله» فقط وقتی صدای خودِ کلیپ چیزی می‌دهد که روایت نمی‌تواند (جملهٔ کلیدیِ خودِ گوینده‌اش،');
  L.push('   اوجِ یک اجرا، یک واکنش). در کلِ قسمت حداکثر ' + (Number(CFG.VM_MOMENT_MAX) || 3) + ' لحظه. momentAfter = شمارهٔ');
  L.push('   جمله‌ای که پس از آن گوینده ساکت می‌شود و کلیپ با صدایش پخش می‌شود (همان clipQuote را می‌شنویم) —');
  L.push('   جایی که شنیدنش طبیعی است، معمولاً پس از معرفیِ آن، نه وسطِ یک فکر. برای لحظه clipQuote لازم است.');
  L.push('۵) ov (حداکثر ' + (Number(CFG.VM_OV_MAX) || 6) + ' در کلِ قسمت): نوشتهٔ کوتاهِ برداری کنارِ رسانه. رسانهٔ عمودی در یک');
  L.push('   سوی قاب می‌نشیند و سوی دیگر جای همین نوشته است، پس برای بیشترِ رسانه‌ها یکی بنویس — به شرطِ اینکه چیزی');
  L.push('   بیفزاید: نامِ آدمِ روی صفحه، یک عدد، یک نقل‌قولِ کوتاه، تیترِ همان ماجرا. نوع: headline | quote | points. ovTitle تا ۶۰');
  L.push('   نویسه؛ ovLines برای points سه سطرِ کوتاه با « | » جدا. نوشتهٔ تکراریِ همان چیزی که روی تصویر هست، نه.');
  L.push('۶) cover: یک جملهٔ انگلیسی برای **کاورِ** این قسمت — صحنه‌ای نمادین و چشم‌گیر از کلِ حالِ قسمت؛');
  L.push('   بی هیچ نوشته، بی هیچ آدمِ واقعیِ شناختنی، بی نشان و آرم. (تنها تصویری که ساخته می‌شود همین است.)');
  L.push('');
  L.push('جمله‌های گفتار (شماره · ثانیه · بخش):');
  for (var i = 0; i < sents.length; i++) {
    L.push('[' + (i + 1) + '] (' + Math.round(sents[i].t) + 's · بخش ' + (sents[i].sec || '-') + ') ' +
           String(sents[i].text || '').slice(0, 220));
  }
  L.push('');
  L.push('رسانه‌ها:');
  for (var j = 0; j < items.length; j++) {
    var it = items[j];
    L.push('— شناسه: ' + it.id + ' · ' + (it.kind === 'video' ? 'کلیپ' : 'عکس') +
           (it.sec.length ? ' · منبعِ بخش ' + it.sec.join('،') : '') +
           (it.topic ? ' · موضوع: ' + it.topic : ''));
    if (it.summary) L.push('  خلاصه: ' + it.summary);
    if (it.words) L.push('  ' + (it.kind === 'video' ? 'گفتارِ کلیپ: ' : 'متنِ روی عکس: ') + it.words);
  }
  return L.join('\n');
}

function vmNum_(v) {
  var s = String(v === undefined || v === null ? '' : v)
    .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[^0-9]/g, '');
  var n = Number(s);
  return isFinite(n) && s ? n : 0;
}

function vmInMusic_(t, music) {
  for (var i = 0; i < (music || []).length; i++) {
    if (t > music[i][0] - 0.3 && t < music[i][1] + 0.3) return true;
  }
  return false;
}

/**
 * پاسخِ مدل ⇒ صحنه‌ها و لحظه‌ها. **تابعِ خالص**: همهٔ مرزها این‌جاست و آزمون رویش می‌نشیند.
 *   sents: [{t, text, sec}] · items: vmItems_ · secs: مدتِ صوت · music: [[a,b]]
 */
function vmScenes_(raw, sents, items, secs, music, opt) {
  opt = opt || {};
  var out = { scenes: [], moments: [], dropped: 0, added: 0, why: '' };
  var byId = {};
  for (var i = 0; i < items.length; i++) byId[items[i].id] = items[i];
  var S = sents.length, pl = [];
  var ovLeft = Math.max(0, Number(CFG.VM_OV_MAX) || 6);
  var list = (raw && Array.isArray(raw.placements)) ? raw.placements : [];
  for (var p = 0; p < list.length; p++) {
    var x = list[p] || {};
    var id = String(x.item || '').trim();
    var n = vmNum_(x.from);
    if (!byId[id] || n < 1 || n > S) { out.dropped++; continue; }
    pl.push({ id: id, n: n, quote: String(x.clipQuote || '').replace(/\s+/g, ' ').trim().slice(0, 160),
              moment: /^(بله|آری|yes|true)$/i.test(String(x.moment || '').trim()),
              after: vmNum_(x.momentAfter), ov: String(x.ov || '').trim(),
              ovTitle: String(x.ovTitle || '').trim(), ovLines: String(x.ovLines || '') });
  }
  pl.sort(function (a, b) { return a.n - b.n; });
  /* همان رسانه پشتِ‌هم ⇒ یک صحنه. دو رسانه سرِ یک جمله ⇒ دومی جملهٔ بعد (اگر هست). */
  var sc = [];
  var mk = function (itm, sn, quote) {
    return { id: itm.id, kind: itm.kind, fileId: itm.fileId, sn: sn,
             t0: Math.round(Number(sents[sn - 1].t) * 10) / 10,
             quote: itm.kind === 'video' ? (quote || '') : '',
             say: String(sents[sn - 1].text || '').slice(0, 240), ov: null };
  };
  for (var k = 0; k < pl.length; k++) {
    var c = pl[k];
    if (sc.length && sc[sc.length - 1].id === c.id) continue;
    if (sc.length && c.n <= sc[sc.length - 1].sn) {
      if (sc[sc.length - 1].sn + 1 > S) { out.dropped++; continue; }
      c.n = sc[sc.length - 1].sn + 1;
    }
    var itm = byId[c.id];
    var s0 = mk(itm, c.n, c.quote);
    var kind = ['headline', 'quote', 'points'].indexOf(c.ov) !== -1 ? c.ov : '';
    if (kind && ovLeft > 0 && c.ovTitle) {
      var lines = c.ovLines.split('|').map(function (z) { return z.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
      if (kind !== 'points' || lines.length) {
        s0.ov = { kind: kind, title: c.ovTitle.slice(0, kind === 'quote' ? 140 : 60), lines: lines.slice(0, 3) };
        ovLeft--;
      }
    }
    sc.push(s0);
    if (c.moment && itm.kind === 'video' && c.quote) {
      var aft = c.after >= 1 && c.after <= S ? c.after : c.n;
      var T = aft < S ? Number(sents[aft].t) : Number(secs) || 0;
      out.moments.push({ id: c.id, at: Math.round(T * 10) / 10, quote: c.quote, sn: aft });
    }
  }
  var total = Number(secs) || 0;
  var endOf = function (z) { return z + 1 < sc.length ? sc[z + 1].t0 : total; };
  /* جمله‌ای نزدیک به وسطِ صحنهٔ z، درونِ همان صحنه؛ نبود ⇒ -1. */
  var midSent = function (z) {
    var end = endOf(z), mid = sc[z].t0 + (end - sc[z].t0) / 2, best = -1;
    for (var y = sc[z].sn; y < S; y++) {
      if (Number(sents[y].t) >= end) break;
      if (best < 0 || Math.abs(Number(sents[y].t) - mid) < Math.abs(Number(sents[best].t) - mid)) best = y;
    }
    return best;
  };
  /* ══ رسانه‌ای که مدل جا انداخت — «محتوای تصویری حیف نشود» ══
     سرِ آغازِ صحنهٔ دیگری نمی‌نشیند (نگارشِ اول همین کرد و کلیپِ مدل دو تکه شد): بلندترین صحنهٔ
     **همان بخش** از وسط نصف می‌شود؛ بخشی که هیچ صحنه‌ای ندارد، سرِ نخستین جملهٔ خودش. */
  var secOfSn = function (sn) { return sents[sn - 1].sec; };
  for (var r = 0; r < items.length; r++) {
    var it = items[r];
    var usedAlready = false;
    for (var u = 0; u < sc.length; u++) if (sc[u].id === it.id) usedAlready = true;
    if (usedAlready || !it.sec.length) continue;
    var secNo = it.sec[0], bestZ = -1, bestLen = 0;
    for (var z0 = 0; z0 < sc.length; z0++) {
      if (secOfSn(sc[z0].sn) !== secNo) continue;
      var len = endOf(z0) - sc[z0].t0;
      if (len > bestLen) { bestLen = len; bestZ = z0; }
    }
    var at1 = -1;
    if (bestZ >= 0 && bestLen >= 8) {
      var ms = midSent(bestZ);
      if (ms >= 0) at1 = ms + 1;
    } else if (bestZ < 0) {
      for (var q = 0; q < S && at1 < 0; q++) if (sents[q].sec === secNo) at1 = q + 1;
      for (var q2 = 0; q2 < sc.length && at1 > 0; q2++) if (sc[q2].sn === at1) at1 = -1;
    }
    if (at1 < 1) continue;
    sc.push(mk(it, at1, ''));
    sc.sort(function (a, b) { return a.sn - b.sn; });
    out.added++;
  }
  /* لحظه‌ها: سقف، فاصله، و هرگز روی موسیقی یا ته قسمت. */
  var mm = [], cap = Math.max(0, Number(CFG.VM_MOMENT_MAX) || 3);
  out.moments.sort(function (a, b) { return a.at - b.at; });
  for (var m = 0; m < out.moments.length && mm.length < cap; m++) {
    var mo = out.moments[m];
    if (vmInMusic_(mo.at, music)) { out.dropped++; continue; }
    if (mo.at < 5 || mo.at > total - 5) { out.dropped++; continue; }
    if (mm.length && mo.at - mm[mm.length - 1].at < 30) { out.dropped++; continue; }
    mo.max = Math.max(3, Number(CFG.VM_MOMENT_SEC) || 12);
    mm.push(mo);
  }
  out.moments = mm;
  /* صحنهٔ خیلی بلند: اگر رسانهٔ دیگری از همان بخش هست — ترجیحاً یکی که هنوز دیده نشده — نیمهٔ
     دومش با آن؛ هرگز همان رسانهٔ صحنهٔ قبل یا بعد (دو قابِ یکسان پشتِ‌هم). */
  var maxSec = Math.max(10, Number(CFG.VM_SCENE_MAX_SEC) || 28);
  for (var z = 0; z < sc.length; z++) {
    if (endOf(z) - sc[z].t0 <= maxSec * 1.6) continue;
    var sNo = secOfSn(sc[z].sn), alt = null, altSeen = null;
    var nextId = z + 1 < sc.length ? sc[z + 1].id : '';
    for (var w = 0; w < items.length; w++) {
      var cand = items[w];
      if (cand.id === sc[z].id || cand.id === nextId || cand.sec.indexOf(sNo) === -1) continue;
      var seenC = false;
      for (var v = 0; v < sc.length; v++) if (sc[v].id === cand.id) seenC = true;
      if (!seenC && !alt) alt = cand;
      if (seenC && !altSeen) altSeen = cand;
    }
    alt = alt || altSeen;
    if (!alt) continue;
    var best = midSent(z);
    if (best < 0) continue;
    sc.splice(z + 1, 0, mk(alt, best + 1, ''));
    z++;
  }
  for (var e = 0; e < sc.length; e++) sc[e].n = e + 1;
  out.scenes = sc;
  out.cover = String((raw && raw.cover) || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  return out;
}

/** زیرپوشهٔ رسانه‌های همین قسمت — ساخته می‌شود اگر نیست. */
function vmSubFolder_(folder) {
  var nm = CFG.VM_FOLDER || 'رسانه‌های منبع';
  var it = folder.getFoldersByName(nm);
  return it.hasNext() ? it.next() : folder.createFolder(nm);
}

/**
 * رونوشتِ رسانه‌ها در زیرپوشهٔ قسمت. فایلِ منبع فقط **خوانده** می‌شود (`makeCopy`)؛ هیچ تغییری
 * در آن نمی‌نشیند. دوباره‌اجرا رونوشتِ تکراری نمی‌سازد (نامِ ثابت). بزرگ‌تر از سقف ⇒ کنار، با علت.
 */
function vmCopy_(folder, need, deadline) {
  var out = { map: {}, skipped: [], made: 0, more: false };
  var sub = vmSubFolder_(folder);
  var cap = Math.max(5, Number(CFG.VM_MAX_MB) || 200) * 1024 * 1024;
  for (var i = 0; i < need.length; i++) {
    var x = need[i];
    var nm = (x.kind === 'video' ? 'کلیپ-' : 'عکس-') + String(x.id).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 60);
    try {
      var had = sub.getFilesByName(nm);
      if (had.hasNext()) { out.map[x.id] = had.next().getId(); continue; }
      if (deadline && new Date().getTime() > deadline) { out.more = true; break; }
      var src = DriveApp.getFileById(String(x.fileId));
      var size = Number(src.getSize()) || 0;
      if (size > cap) { out.skipped.push({ id: x.id, why: Math.round(size / 1048576) + ' مگابایت — بیش از سقف' }); continue; }
      var cp = src.makeCopy(nm, sub);
      out.map[x.id] = cp.getId(); out.made++;
    } catch (e) {
      out.skipped.push({ id: x.id, why: String(e.message).slice(0, 120) });
    }
  }
  return out;
}

/** کاورِ این قسمت — تنها تصویرِ ساخته‌شده. نشد ⇒ کاورِ کارتیِ قبلی، با علت. */
function vmCover_(folder, idea, ctx) {
  var out = { fileId: '', why: '' };
  if (CFG.VM_COVER_GEN === false) { out.why = 'ساختِ کاور خاموش است'; return out; }
  if (!idea) { out.why = 'مدل ایدهٔ کاور نداد'; return out; }
  try {
    var nm = '_cover-art.png';
    var sub = vmSubFolder_(folder);
    var had = sub.getFilesByName(nm);
    if (had.hasNext()) { out.fileId = had.next().getId(); return out; }
    if (!lvGenOn_()) { out.why = 'مدلِ تصویر در دسترس نیست'; return out; }
    var model = (lvGenModel_() || {}).id;
    if (!model) { out.why = 'مدلِ تصویر انتخاب نشد'; return out; }
    if (lvGenRoom_(model) < 1) { out.why = 'سقفِ ماهانهٔ تصویر جا ندارد'; return out; }
    var prompt = 'Cinematic, professional podcast episode cover art, 16:9. ' + idea +
                 ' Strong single focal point, rich color and depth, editorial photography or high-end illustration. ' +
                 'Absolutely no text, letters, numbers, logos or watermarks. No identifiable real person.';
    var g = lvGenOne_(model, prompt, { aspect: '16:9' });
    if (!g.blob) { out.why = 'تصویرِ کاور ساخته نشد: ' + g.why; return out; }
    g.blob.setName(nm);
    out.fileId = sub.createFile(g.blob).getId();
    out.usd = g.usd;
    return out;
  } catch (e) { out.why = String(e.message).slice(0, 140); return out; }
}

/** آخرین نتیجه، بیرون از هاب — برای خطِ روزانه و یافته. */
function vmNote_(key, rec) {
  try {
    var r = Object.assign({ key: key, at: nowStr_() }, rec || {});
    props_().setProperty(PK.VM_LAST, JSON.stringify(r).slice(0, 2000));
  } catch (e) {}
}

/** آغازِ ویدئو، پیش از نخستین رسانه‌ای که گوینده درباره‌اش حرف می‌زند (۸.۹۸).
 * نمونهٔ قسمتِ ۷۲ نشان داد: نخستین رسانه سرِ ثانیهٔ ۵۹٫۷ بود و تمامِ آن یک دقیقه فقط کاور ماند —
 * تصویرِ ثابت، درست همان‌جا که بیننده تصمیم می‌گیرد بماند یا برود. حالا کاور حداکثر `VM_INTRO_SEC`
 * و باقی‌اش پیش‌نمایشی از **رسانه‌های خودِ همین قسمت** است، به ترتیبِ آمدن و پخش در کلِ قسمت،
 * هر کدام ~`VM_TEASER_SEC`. کلیپِ پیش‌نمایش `teaser` دارد تا رانر از میانه‌اش بِبُرد، نه از همان جایی
 * که صحنهٔ اصلی‌اش بعداً نشان می‌دهد — یک تکه دو بار دیده نشود. چیزی ساخته نمی‌شود؛ فقط همان رسانه‌ها. */
function vmLead_(ready, coverId) {
  if (!ready.length) return [];
  var first = Number(ready[0].t0) || 0;
  if (first <= 4) return [];
  var out = [];
  var introEnd = 0;
  if (coverId) {
    introEnd = Math.min(first, Math.max(3, Number(CFG.VM_INTRO_SEC) || 10));
    out.push({ t0: 0, fileId: coverId, caption: '', say: '', media: { kind: 'photo', quote: '', intro: true } });
  }
  var gap = first - introEnd, per = Math.max(3, Number(CFG.VM_TEASER_SEC) || 6);
  if (gap < per + 2) {
    if (!coverId) return [];
    return out;                               // فاصلهٔ کوتاه: همان کاور تا نخستین رسانه
  }
  var seen = {}, pool = [];
  for (var i = 0; i < ready.length; i++) {
    if (seen[ready[i].fileId]) continue;
    seen[ready[i].fileId] = 1;
    pool.push(ready[i]);
  }
  var n = Math.max(1, Math.min(pool.length, Math.floor(gap / per)));
  var slot = gap / n;
  for (var k = 0; k < n; k++) {
    var src = pool[Math.floor(k * pool.length / n)];
    out.push({ t0: Math.round((introEnd + k * slot) * 10) / 10, fileId: src.fileId, caption: '', say: '',
               media: { kind: src.media.kind, quote: '', teaser: true } });
  }
  return out;
}

/**
 * سازندهٔ رسانه‌های یک قسمت — چنداجرایی، با حالت در `_media.json`:
 *   plan ⇒ (مدل، یک بار) · copy ⇒ (رونوشت‌ها، شاید در چند اجرا) · cover ⇒ ready.
 * @return {active, done, fallback, why, items, cover, moments, music, info}
 */
function vmBuild_(folder, meta, plan, ctx) {
  var out = { active: false, done: false, fallback: false, why: '', items: [], cover: null,
              moments: [], music: [], info: null };
  if (!vmOn_(ctx && ctx.show)) return out;
  out.active = true;
  var key = String(ctx.show) + ':' + String(ctx.epRaw || '');
  var t0 = new Date().getTime();
  var deadline = t0 + 150000;
  if (typeof _ytRunDeadline !== 'undefined' && _ytRunDeadline > t0) deadline = Math.min(deadline, _ytRunDeadline);
  var left = function () { return deadline - new Date().getTime(); };
  var failMax = Math.max(1, Number(CFG.VM_FAIL_MAX) || 3);
  var gapMs = Math.max(1, Number(CFG.VM_RETRY_MIN) || 45) * 60000;
  var d = vmRead_(folder);
  var fail = function (w) {
    out.fallback = true; out.why = w;
    vmNote_(key, { ok: false, why: w });
    try { logLine_('رسانه‌های منبعِ ' + key + ' نشد — ' + w + ' — ویدئو با مسیرِ قبلی می‌رود.'); } catch (e) {}
    return out;
  };
  var planFail = function (w, final) {
    var n1 = ((d && Number(d.failed)) || 0) + 1;
    if (final) n1 = Math.max(n1, failMax);
    vmWrite_(folder, { v: 1, key: key, at: nowStr_(), phase: 'plan', failed: n1, why: w, scenes: [] });
    if (n1 >= failMax) return fail(w + ' (' + n1 + ' بار)');
    out.why = 'نقشهٔ رسانه نشد (' + n1 + ' از ' + failMax + '): ' + w + ' — دوباره پس از ' + Math.round(gapMs / 60000) + ' دقیقه';
    return out;
  };
  if (d && d.phase === 'plan' && Number(d.failed) >= failMax) return fail(String(d.why || 'نقشهٔ رسانه نشد'));
  if (d && d.phase === 'plan' && Number(d.failed) > 0) {
    var lastF = parseWhen_(String(d.at || ''));
    if (!isNaN(lastF) && new Date().getTime() - lastF < gapMs) {
      out.why = 'نقشهٔ رسانه ' + d.failed + ' بار نشد (' + String(d.why || '') + ') — منتظرِ تلاشِ بعد';
      return out;
    }
  }

  /* نمونهٔ تازه با `replan` (۹.۰۰): نقشه از نو — تا قاعده‌های تازهٔ نقشه (نوشتهٔ برداریِ بیشتر، لحظهٔ بلندتر)
     در نمونه دیده شوند — ولی رونوشت‌ها و کاور همان می‌مانند (نه رونوشتِ دوباره، نه تصویرِ تازه). */
  var keepCp = null;
  if (d && ctx.replan && d.key !== key && d.phase !== 'plan') {
    keepCp = { copies: d.copies || {}, cover: d.cover || { fileId: '', why: '' }, skipped: d.skipped || [] };
    d = null;
  }
  // ── ۱) نقشه ──
  if (!d || d.phase === 'plan') {
    var items = vmItems_(meta);
    if (!items.length) return fail('این قسمت کلیپ یا عکسِ منبع ندارد');
    if (left() < 70000) { out.why = 'وقتِ این دور برای نقشهٔ رسانه کم است؛ دورِ بعد'; return out; }
    var rp = vmReplay_(folder, meta);
    if (!rp.chunks.length) return planFail(rp.why || 'زمانِ تکه‌ها با متنِ گفتار جور نشد', true);
    var sents = lvSceneSents_(rp.chunks);
    if (sents.length < 3) return planFail('جمله‌ای برای صحنه نماند', true);
    var raw = null;
    try {
      raw = geminiText_(vmPrompt_(sents, items, ctx), VM_SCHEMA,
                        Math.max(2048, Number(CFG.VM_PLAN_TOKENS) || 12288), { exact: true });
    } catch (eA) { return planFail('مدل جواب نداد: ' + String(eA.message).slice(0, 120)); }
    var vs = vmScenes_(raw, sents, items, rp.secs, rp.music);
    if (vs.scenes.length < Math.max(1, Number(CFG.VM_MIN_SCENES) || 3)) {
      return planFail('فقط ' + vs.scenes.length + ' صحنه از ' + items.length + ' رسانه درآمد');
    }
    d = { v: 1, key: key, at: nowStr_(), phase: 'copy', failed: 0, secs: rp.secs, align: rp.how,
          scenes: vs.scenes, moments: vs.moments, music: rp.music, coverIdea: vs.cover,
          dropped: vs.dropped, added: vs.added, items: items.length, copies: {}, skipped: [],
          cover: { fileId: '', why: '' } };
    if (keepCp) { d.copies = keepCp.copies; d.cover = keepCp.cover; d.skipped = keepCp.skipped; }
    vmWrite_(folder, d);
  }

  // ── ۲) رونوشت‌ها ──
  if (d.phase === 'copy') {
    var need = [], seen = {};
    for (var i = 0; i < d.scenes.length; i++) {
      var s = d.scenes[i];
      if (seen[s.id] || (d.copies || {})[s.id]) continue;
      seen[s.id] = true;
      need.push({ id: s.id, kind: s.kind, fileId: s.fileId });
    }
    var cp = vmCopy_(folder, need, deadline - 20000);
    d.copies = d.copies || {};
    for (var k in cp.map) if (Object.prototype.hasOwnProperty.call(cp.map, k)) d.copies[k] = cp.map[k];
    d.skipped = (d.skipped || []).concat(cp.skipped).slice(-30);
    if (cp.more) { vmWrite_(folder, d); out.why = 'رونوشتِ رسانه‌ها ادامه دارد (' + Object.keys(d.copies).length + ' از ' + need.length + ')'; return out; }
    d.phase = 'cover';
    vmWrite_(folder, d);
  }

  // ── ۳) کاور ──
  if (d.phase === 'cover') {
    if (left() < 40000) { out.why = 'وقتِ این دور برای کاور کم است؛ دورِ بعد'; return out; }
    var cv = vmCover_(folder, d.coverIdea, ctx);
    d.cover = { fileId: cv.fileId || '', why: cv.why || '' };
    d.phase = 'ready';
    vmWrite_(folder, d);
  }

  // ── ۴) آماده ⇒ صحنه‌های صف ──
  var ready = [];
  for (var j = 0; j < d.scenes.length; j++) {
    var sj = d.scenes[j], cid = (d.copies || {})[sj.id];
    if (!cid) continue;                         // رونوشت نشد ⇒ صحنه به قبلی می‌پیوندد (رانر)
    var r0 = { n: ready.length + 1, t0: sj.t0, fileId: cid, caption: '', say: sj.say,
               media: { kind: sj.kind, quote: sj.quote || '' } };
    if (sj.ov) r0.ov = sj.ov;
    ready.push(r0);
  }
  var lead = vmLead_(ready, d.cover && d.cover.fileId);
  if (lead.length) {
    ready = lead.concat(ready);
    for (var r = 0; r < ready.length; r++) ready[r].n = r + 1;
  }
  if (ready.length < Math.max(1, Number(CFG.VM_MIN_SCENES) || 3)) {
    return fail('فقط ' + ready.length + ' رسانه رونوشت شد' +
                ((d.skipped || []).length ? ' (' + d.skipped.map(function (x) { return x.why; }).slice(0, 2).join('؛ ') + ')' : ''));
  }
  var okIds = {};
  for (var q = 0; q < d.scenes.length; q++) if ((d.copies || {})[d.scenes[q].id]) okIds[d.scenes[q].id] = (d.copies || {})[d.scenes[q].id];
  var moments = (d.moments || []).filter(function (m) { return !!okIds[m.id]; })
    .map(function (m) { return { at: m.at, fileId: okIds[m.id], quote: m.quote, max: m.max }; });
  var nClip = ready.filter(function (x) { return x.media.kind === 'video'; }).length;
  out.done = true;
  out.items = ready;
  out.cover = d.cover && d.cover.fileId ? { fileId: d.cover.fileId } : null;
  out.moments = moments;
  out.music = d.music || [];
  out.info = { media: true, scenes: ready.length, clips: nClip, photos: ready.length - nClip,
               moments: moments.length, ov: ready.filter(function (x) { return !!x.ov; }).length,
               items: Number(d.items) || 0, dropped: Number(d.dropped) || 0, added: Number(d.added) || 0,
               skipped: (d.skipped || []).length, cover: d.cover && d.cover.fileId ? 'ساخته شد' : String((d.cover || {}).why || 'نه'),
               align: String(d.align || '') };
  vmNote_(key, { ok: true, why: '', scenes: ready.length, clips: nClip, moments: moments.length,
                 cover: !!(d.cover && d.cover.fileId), skipped: (d.skipped || []).length });
  return out;
}

/** خطِ روزانه (بی درایو). */
function vmStatus_() {
  var r = null;
  try { r = JSON.parse(props_().getProperty(PK.VM_LAST) || 'null'); } catch (e) { r = null; }
  if (!vmOn_('variety')) return { on: false, ok: true, line: '' };
  if (!r) return { on: true, ok: true, last: null,
                   line: '🎞 «از همه جا» با رسانه‌های منبع: روشن — هنوز هیچ قسمتی از این راه نرفته.' };
  var line = r.ok
    ? '🎞 «از همه جا» با رسانه‌های منبع — آخرین (' + r.key + '، ' + r.at + '): ' + faDigitsOut_(String(r.scenes || 0)) +
      ' صحنه، ' + faDigitsOut_(String(r.clips || 0)) + ' کلیپ، ' + faDigitsOut_(String(r.moments || 0)) +
      ' لحظهٔ با صدای کلیپ، کاور ' + (r.cover ? 'ساخته شد' : 'کارتی') +
      (r.skipped ? ' · ' + faDigitsOut_(String(r.skipped)) + ' رسانه رونوشت نشد' : '') + '.'
    : '🎞 ❌ «از همه جا» (' + r.key + ') با رسانهٔ منبع ساخته نشد و ویدئوی ساده رفت — علت: ' + String(r.why || 'بی علت');
  return { on: true, ok: !!r.ok, last: r, line: line };
}

/**
 * «لحظه»ها ویدئو را بلندتر از صوت می‌کنند؛ زمانِ فصل‌های توضیح پس از هر لحظه جلو می‌رود.
 * فقط سطرهایی که با زمان شروع می‌شوند عوض می‌شوند. `inserts`: [{at, d}] از رانر.
 */
function vmShiftDesc_(desc, inserts) {
  var ins = (inserts || []).filter(function (x) { return x && Number(x.d) > 0; })
    .map(function (x) { return { at: Number(x.at) || 0, d: Number(x.d) || 0 }; });
  if (!ins.length) return String(desc || '');
  var toSec = function (s) {
    var p = s.split(':').map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  };
  return String(desc || '').split('\n').map(function (line) {
    var m = line.match(/^(\s*)((?:\d+:)?\d{1,2}:\d{2})(\s.*)?$/);
    if (!m) return line;
    var t = toSec(m[2]);
    if (!t) return line;                       // ۰۰:۰۰ همیشه سرِ جایش
    var add = 0;
    for (var i = 0; i < ins.length; i++) if (ins[i].at <= t) add += ins[i].d;
    return add ? m[1] + ytTime_(t + add) + (m[3] || '') : line;
  }).join('\n');
}

/** سلامتِ روزانهٔ این بخش — جدا از `lvHealth_` که بی وضعیتِ درس‌نامه زود برمی‌گردد. */
function vmHealth_(problems, notes) {
  /* «از همه جا» با رسانه‌های منبع (۸.۹۶): خطِ روزانه **همیشه** — حتی وقتی سالم است، چون سکوت با
     «هیچ قسمتی از این راه نرفت» یکی است. افتادن به ویدئوی ساده ⇒ مسئلهٔ روز و یافتهٔ کد. */
  try {
    var vmS = vmStatus_();
    if (vmS.on && vmS.line) notes.push(vmS.line);
    if (vmS.on && !vmS.ok && vmS.last) {
      problems.push('🎞 قسمتِ ' + vmS.last.key + ' بی رسانه‌های منبع (ویدئوی ساده) ساخته شد: ' + vmS.last.why);
      logSelfFinding_(getHub_(), {
        priority: 'جدی', category: 'ویدئوی از همه جا', key: 'vm-fallback',
        title: 'ویدئوی «از همه جا» با رسانه‌های منبع ساخته نشد',
        detail: vmS.last.key + ' (' + vmS.last.at + '): ' + vmS.last.why,
        instruction: 'علت در جزئیات است (vmBuild_ ⇒ fail/planFail در src/37_VarietyMedia.gs). «`_times.json` نبود» یا ' +
                     '«زمانِ تکه‌ها جور نشد» یعنی varietyTextChunks_ با تکه‌های صداسازی نمی‌خوانَد. «رونوشت نشد» یعنی ' +
                     'vmCopy_ (سقفِ VM_MAX_MB یا دسترسی). `_media.json`ِ پوشهٔ همان قسمت را بخوان.',
        owner: ROWNER_CODE
      });
    }
  } catch (eVmS) {}
}

/* ══ نمونهٔ یک‌باره روی قسمتِ منتشرشده (۸.۹۷) ══
 * صاحبِ برنامه: «رو یه پادکستِ از قبل منتشرشده یه نسخه درست کن، دقیقاً همون شکلی که قراره رو بعدی‌ها کار کنی …
 * کاور، همه‌چیز … که اگه ایرادی بود منتظرِ فردا نشم». پس نمونه را **خودِ موتور** می‌سازد، با همان توابع: پروندهٔ
 * قسمت، صوتِ همان قسمت، `_yt.json`ِ همان قسمت، `vmBuild_` (مدل، رونوشت، کاور) و `ytRenderAsk_` (رانر). فقط کلید
 * جداست (`<show>:<ep>-نمونه`) و **در فهرستِ انتشار نیست** — پس هیچ‌چیز به یوتیوب نمی‌رود. ساخته که شد، نشانی به
 * تلگرام و ایمیل می‌رود و ردیفِ صف «رسید» می‌شود تا هشدارِ «رندرِ بی‌جواب» نسازد.
 * `CFG.VM_SAMPLE` = { ep, folderId } یا خالی. هر نمونه یک بار (`PK.VM_SAMPLE`).
 */
function vmSampleTick_() {
  var spec = CFG.VM_SAMPLE || null;
  if (!spec || !spec.ep || !spec.folderId) return null;
  /* `rev` (۸.۹۸): نمونهٔ دوم پس از اصلاح، کلیدِ تازه می‌گیرد — کلیدِ پیشین «خبر داده شد» است و نشانیِ
     ویدئوی قبلی در نقشه می‌ماند تا هر دو کنارِ هم دیده شوند. پایانِ «-نمونه» عمداً ثابت است: برداشتِ
     ویدئوها با همان پایان ردیف را رد می‌کند (۱۰.۸). */
  var tag = String(spec.ep) + (Number(spec.rev) > 1 ? '-' + Number(spec.rev) : '') + '-نمونه';
  var key = 'variety:' + tag;
  var st = {};
  try { st = JSON.parse(props_().getProperty(PK.VM_SAMPLE) || '{}') || {}; } catch (e0) { st = {}; }
  if (st.key === key && st.told) return null;
  // ── ساخته شده؟ ⇒ خبر، و ردیف «رسید» ──
  var m = null;
  try { m = (ytRenderMapCached_() || {})[key] || null; } catch (eM) { m = null; }
  if (m && m.url) {
    var md = m.media || {};
    var txt = '🎞 نمونهٔ «از همه جا» (قسمتِ ' + faDigitsOut_(String(spec.ep)) + ') با رسانه‌های منبع ساخته شد — ' +
              'همان راهی که قسمت‌های بعدی می‌روند؛ به یوتیوب نرفته.\n' +
              'ویدئو: ' + m.url + '\n' + (m.thumb ? 'کاور: ' + m.thumb + '\n' : '') +
              'حالت: ' + String(m.mode || '') + ' · ' + (Number(m.scenes) || 0) + ' صحنه · ' + (Number(md.clips) || 0) +
              ' کلیپ، ' + (Number(md.photos) || 0) + ' عکس · لحظهٔ صدای کلیپ: ' + ((m.inserts || []).length) +
              ' · سنجشِ قاب: ' + (m.qa && m.qa.ok ? 'سالم' : 'ایراد — ' + String((m.qa && m.qa.why) || ''));
    try {
      var row0 = (ytRenderRead_().items || []).filter(function (x) { return String(x.key) === key; })[0];
      ytRenderDone_('variety', tag);
      if (row0) ytRenderShare_(row0, false);           // رونوشت‌ها و صوت دوباره خصوصی
    } catch (eD) {}
    try { if (tgEnabled_()) tgApi_('sendMessage', { chat_id: tgChat_(), text: txt, disable_web_page_preview: false }); } catch (eT) {}
    try { mailQueue_('یوتیوب', 'نمونهٔ ویدئوی «از همه جا» با رسانه‌های منبع', txt); } catch (eQ) {}
    st = { key: key, told: true, at: nowStr_(), url: m.url };
    try { props_().setProperty(PK.VM_SAMPLE, JSON.stringify(st)); } catch (eS) {}
    return st;
  }
  if (st.key === key && st.asked) return null;          // منتظرِ رانر
  // ── ساختِ درخواست، با همان توابعِ انتشار ──
  /* درِ ساعتی هاب نمی‌خوانَد (۷٫۶۳؛ `run_bridge_voice_test` ۲۶.۳ همین را گرفت): شکستِ بی‌درمان فقط در
     Properties و تلگرام گفته می‌شود و **یک بار** — هر ساعت دوباره‌پرسیدنِ پوشه‌ای که نیست، هزینهٔ بی‌حاصل است. */
  var stop = function (why) {
    var s1 = { key: key, told: true, at: nowStr_(), why: String(why) };
    try { props_().setProperty(PK.VM_SAMPLE, JSON.stringify(s1)); } catch (eP) {}
    try { if (tgEnabled_()) tgApi_('sendMessage', { chat_id: tgChat_(), text: '🎞 ❌ نمونهٔ «از همه جا» ساخته نشد — ' + why }); } catch (eT) {}
    return s1;
  };
  var folder = null;
  try { folder = DriveApp.getFolderById(String(spec.folderId)); } catch (eF) { return stop('پوشهٔ قسمت پیدا نشد'); }
  var meta = ytEpisodeMeta_(folder);
  if (!meta || !meta.ep) return stop('پروندهٔ قسمت در پوشه نبود');
  var ep = meta.ep;
  var aud = ytAudioParts_(folder);
  if (aud.why) return stop(aud.why);
  var totalSec = ytSecondsOf_(aud.parts);
  var ctx = { show: 'variety', epRaw: tag, replan: !!spec.replan, showName: CFG.SHOW_NAME,
              tagline: CFG.SHOW_TAGLINE, seriesName: '', epNum: faDigitsOut_(String(spec.ep)), lesson: '',
              recap: false, title: String(ep.title || ''), cat: String(meta.cat || ''),
              duration: ytTime_(totalSec), headings: (ep.sections || []).map(function (x) { return String(x.heading || ''); }),
              hook: String(ep.hook || ''), summary: String(ep.summary || ''), sources: (ep.__extSources || []),
              castSpans: ((ep.__cast || {}).spans) || [], sections: ep.sections || [], totalSec: totalSec };
  var plan = ytPlan_(folder, ctx, false) || {};
  var r = vmBuild_(folder, meta, plan, ctx);
  if (!r.active || r.fallback) return stop(String(r.why || 'خاموش'));
  if (!r.done) {
    try { props_().setProperty(PK.VM_SAMPLE, JSON.stringify({ key: key, at: nowStr_(), why: String(r.why || 'ادامه در دورِ بعد') })); } catch (eS4) {}
    return null;
  }
  var asked = ytRenderAsk_({ show: 'variety', ep: tag, title: String(ep.title || ''),
                 folderId: folder.getId(), visuals: [],
                 scenes: r.items, sceneCover: r.cover, sceneInfo: r.info,
                 media: true, moments: r.moments, mute: r.music,
                 coverTitle: String(plan.coverTitle || ep.title || ''),
                 coverKicker: String(plan.coverKicker || CFG.SHOW_NAME || ''),
                 coverFoot: 'قسمت ' + faDigitsOut_(String(spec.ep)),
                 audio: aud.parts.map(function (f) { return { id: f.getId(), name: f.getName() }; }),
                 audioKind: aud.kind, coverFileId: '', outName: 'نمونه — ' + ytVideoName_(String(folder.getName())) });
  st = { key: key, asked: !!asked, at: nowStr_(), scenes: r.items.length, moments: r.moments.length };
  try { props_().setProperty(PK.VM_SAMPLE, JSON.stringify(st)); } catch (eS3) {}
  return st;
}
