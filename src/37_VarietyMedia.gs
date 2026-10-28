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
               allWords: kind === 'video' ? String(it.body || '').replace(/\s+/g, ' ').slice(0, 4000) : '',
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
    rights: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      item: { type: 'STRING' }, broadcast: { type: 'STRING' }, what: { type: 'STRING' } },
      required: ['item', 'broadcast'] } },
    cover: { type: 'STRING' }
  },
  required: ['placements', 'rights']
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
  L.push('۴) moment = «بله» برای هر کلیپی که صدای خودش چیزی می‌دهد که روایت نمی‌تواند — جملهٔ کلیدیِ گوینده‌اش، نقطهٔ');
  L.push('   اوجِ طنز یا اجرا، یک واکنش. بیننده می‌خواهد **خودِ کلیپ** را بشنود، نه فقط تعریفش را؛ پس برای بیشترِ کلیپ‌های');
  L.push('   گفتاردار یکی بگذار. در کلِ قسمت حداکثر ' + (Number(CFG.VM_MOMENT_MAX) || 3) + ' لحظه. momentAfter = شمارهٔ');
  L.push('   جمله‌ای که پس از آن گوینده ساکت می‌شود و کلیپ با صدایش پخش می‌شود (همان clipQuote را می‌شنویم) —');
  L.push('   جایی که شنیدنش طبیعی است، معمولاً پس از معرفیِ آن، نه وسطِ یک فکر. برای لحظه clipQuote لازم است.');
  L.push('۵) ov (حداکثر ' + (Number(CFG.VM_OV_MAX) || 6) + ' در کلِ قسمت): نوشتهٔ کوتاهِ برداری کنارِ رسانه. رسانهٔ عمودی در یک');
  L.push('   سوی قاب می‌نشیند و سوی دیگر جای همین نوشته است، پس برای بیشترِ رسانه‌ها یکی بنویس — به شرطِ اینکه چیزی');
  L.push('   بیفزاید: نامِ آدمِ روی صفحه، یک عدد، یک نقل‌قولِ کوتاه، تیترِ همان ماجرا. نوع: headline | quote | points. ovTitle تا ۶۰');
  L.push('   نویسه؛ ovLines برای points سه سطرِ کوتاه با « | » جدا. نوشتهٔ تکراریِ همان چیزی که روی تصویر هست، نه.');
  L.push('۷) rights: برای **هر** رسانهٔ فهرست — چه جایش دادی چه نه — یک ردیف {item, broadcast, what}. broadcast = «بله» برای هر رسانه‌ای که **برش یا قابی از اثرِ تولیدِ حرفه‌ای** است: سریال، فیلم، برنامهٔ تلویزیونی یا');
  L.push('   خبرِ شبکه، موزیک‌ویدئو، کلیپِ تبلیغاتیِ برند، مستندِ شبکه — حتی اگر کسی آن را در اینستاگرام دوباره گذاشته باشد. نشانه‌ها:');
  L.push('   نامِ سریال/فیلم/شبکه در خلاصه یا گفتار، شخصیت‌های داستانی، بازیگرِ شناخته، آرمِ شبکه، دیالوگِ نمایشی. what = نامِ همان اثر');
  L.push('   اگر پیداست. کلیپی که خودِ یک آدم با گوشی ساخته (ولاگ، آموزش، واکنش، گفت‌وگوی خیابانی) «نه» است. شک ⇒ «بله».');
  L.push('   (یوتیوب تصویرِ این آثار را با Content-ID می‌شناسد و ویدئو را مسدود می‌کند — «از همه جا» ۸۲ با «متهم گریخت» همین شد.)');
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

/* ══ «دو بار شنیده می‌شود» (۹.۱۴) ══
 * نمونهٔ سومِ ۷۳: گوینده دیالوگِ کلیپ را جمله‌به‌جمله بازگو کرد («زن داد می‌زند: بدبخت! … مرد گوشش را می‌گیرد
 * و می‌گوید: بله»)، بعد خودِ کلیپ همان را با صدایش پخش کرد، و پس از کلیپ گوینده بقیهٔ همان دیالوگ را خواند.
 * صاحبِ برنامه: «اون دوبار شنیدن درست کن». هم‌زمانی درست بود؛ چیدن غلط بود — لحظه **کنارِ** بازگویی می‌نشست.
 * حالا لحظه **جای** آن جمله‌ها می‌نشیند: جمله‌هایی که واژه‌هایشان در گفتارِ خودِ کلیپ هست (`vmReciteSpan_`)،
 * در ویدئو بریده می‌شوند و کلیپ با صدای خودش آن‌جا پخش می‌شود. صوتِ پادکست دست نمی‌خورد — شنونده‌ای که
 * تصویر ندارد، بازگویی را لازم دارد. */
function vmNorm_(s) {
  return String(s || '').replace(/[ً-ْٰـ]/g, '').replace(/‌/g, ' ')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/[أإآ]/g, 'ا')
    .replace(/[^؀-ۿa-zA-Z0-9]+/g, ' ').trim();
}
var VM_STOP = ' و به از که را با در این آن می هم یک تا بر اگر یا ما تو من او هر ای ی ها شد شده است هست بود ';
function vmToks_(s) {
  return vmNorm_(s).split(/\s+/).filter(function (w) { return w.length >= 2 && VM_STOP.indexOf(' ' + w + ' ') === -1; });
}
/** نزدیکیِ دو واژه به نسبتِ نویسه — «بدبخت»/«بدبخته» و «خودتو»/«خودِتو» یکی‌اند. */
function vmWordSim_(a, b) {
  if (a === b) return 1;
  var m = a.length, n = b.length;
  if (Math.abs(m - n) > Math.max(m, n) * 0.4) return 0;
  var prev = [], cur = [];
  for (var j = 0; j <= n; j++) prev[j] = j;
  for (var i = 1; i <= m; i++) {
    cur = [i];
    for (var k = 1; k <= n; k++) {
      cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + (a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}
/** سهمِ واژه‌های جمله که در گفتارِ کلیپ هست؛ نقل‌قولِ پس از «:» جدا هم سنجیده می‌شود. */
function vmReciteScore_(text, clipSet) {
  var part = function (t) {
    var w = vmToks_(t);
    if (!w.length) return 0;
    var hit = 0;
    for (var i = 0; i < w.length; i++) {
      if (clipSet[w[i]]) { hit++; continue; }
      for (var c in clipSet) {
        if (Object.prototype.hasOwnProperty.call(clipSet, c) && vmWordSim_(w[i], c) >= 0.75) { hit++; break; }
      }
    }
    return hit / w.length;
  };
  var whole = part(text), ix = String(text || '').search(/[:：«]/);
  var q = ix >= 0 ? part(String(text).slice(ix + 1)) : 0;
  return Math.max(whole, q);
}
/**
 * بازهٔ بازگویی: پیوسته‌ترین دنبالهٔ جمله‌هایی کنارِ لحظه که دیالوگِ کلیپ را بازمی‌گویند (یک جملهٔ میانیِ
 * صحنه‌آرایی مجاز است — «زن دوباره ژست می‌گیرد»). فقط درونِ همان بخش، و فقط اگر واقعاً بازگویی است
 * (دست‌کم دو جمله یا شش ثانیه). تابعِ خالص. ⇒ {a, b} اندیسِ صفرپایه، یا null.
 */
function vmReciteSpan_(sents, k, clipWords, secs, secHint) {
  var S = sents.length;
  if (k < 0 || k > S || !clipWords) return null;
  var set = {};
  vmToks_(clipWords).forEach(function (w) { set[w] = 1; });
  if (Object.keys(set).length < 4) return null;
  /* بخشِ خودِ کلیپ (صحنه‌اش)، نه بخشِ جملهٔ k: نمونهٔ چهارمِ ۷۳ — مدل لحظهٔ کلیپِ اداری را «پس از» آخرین جملهٔ
     بخش گذاشت، پس جملهٔ k آغازِ بخشِ بعد بود و هیچ بازگویی‌ای در آن بخش نبود. */
  var sec = secHint !== undefined && secHint !== null ? secHint : sents[Math.min(k, S - 1)].sec;
  var lo = Math.max(0, k - 12), hi = Math.min(S - 1, k + 10);
  var th = Math.max(0.3, Number(CFG.VM_RECITE_MIN) || 0.5);
  var hitAt = {};
  /* ۹.۲۷: نخستین جملهٔ بخش تیترِ آن است، نه بازگویی — «نشستِ خبریِ حلِ بحران با دستِ خالی» با گفتارِ کاملِ کلیپ
     درست ۰٫۵ می‌گرفت و لحظهٔ کلیپِ سخنگو از تیتر آغاز می‌شد، ۱۵ ثانیه پس از لحظهٔ قبلی، و سدِ فاصله دورش انداخت. */
  var head = function (j) { return j <= 0 || sents[j - 1].sec !== sec; };
  for (var i = lo; i <= hi; i++) {
    if (sents[i].sec !== sec || head(i)) continue;
    hitAt[i] = vmReciteScore_(sents[i].text, set) >= th;
  }
  /* دنباله‌ای که از k می‌گذرد یا **پیش از آن** تمام شده: مدل لحظه را اغلب پس از پایانِ بازگویی می‌گذارد
     («… و در نهایت یک صندلی پرتاب می‌شود» ⇒ کلیپ) — نمونهٔ چهارمِ ۷۳ هر دو لحظه‌اش همین بود و بی این، نزدیک‌ترین
     بازگویی دو تا پنج جمله عقب‌تر بود و دیده نمی‌شد. پیش از k تا چهار جمله؛ پس از k فقط یکی. */
  var seed = hitAt[k] ? k : (hitAt[k + 1] ? k + 1 : -1);
  for (var bk = k - 1; seed < 0 && bk >= Math.max(lo, k - 4); bk--) if (hitAt[bk]) seed = bk;
  if (seed < 0) return null;
  var a = seed, b = seed;
  while (a - 1 >= lo && sents[a - 1].sec === sec && (hitAt[a - 1] || (hitAt[a - 2] && sents[a - 2].sec === sec))) a -= hitAt[a - 1] ? 1 : 2;
  while (b + 1 <= hi && sents[b + 1].sec === sec && (hitAt[b + 1] || (hitAt[b + 2] && sents[b + 2].sec === sec))) b += hitAt[b + 1] ? 1 : 2;
  var endT = b + 1 < S ? Number(sents[b + 1].t) : Number(secs) || 0;
  var dur = endT - Number(sents[a].t);
  if ((b - a + 1 < 2 && dur < 6) || dur <= 0 || dur > Math.max(20, Number(CFG.VM_RECITE_MAX_SEC) || 90)) return null;
  return { a: a, b: b, at: Math.round(Number(sents[a].t) * 10) / 10, cut: Math.round(dur * 10) / 10 };
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
      var mo0 = { id: c.id, at: Math.round(T * 10) / 10, quote: c.quote, sn: aft };
      /* ۹.۱۴: اگر گوینده همین دیالوگ را بازگو می‌کند، لحظه جای بازگویی می‌نشیند (نه کنارش). */
      var rs = vmReciteSpan_(sents, aft, itm.allWords || itm.words, secs, sents[c.n - 1].sec);
      if (rs && rs.at >= s0.t0 - 0.05) { mo0.at = rs.at; mo0.cut = rs.cut; mo0.sn = rs.a; mo0.recite = rs.b - rs.a + 1; }
      out.moments.push(mo0);
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
  /* ══ هر کلیپی که گوینده دیالوگش را بازمی‌گوید، صدای خودش را دارد — از کد، نه به انتخابِ مدل (۹.۲۳) ══
     نمونهٔ ۶ِ ۷۳: «کلیپِ دوم صداش یک ذره هم پخش نشد». مدل برای کلیپِ ۱، ۳ و ۴ لحظه گذاشت و برای کلیپِ سخنگو نه —
     در حالی که بخشِ دوم سراسر بازگوییِ همان دیالوگ بود («کلاغ‌نیوز؟ … اولاً ما بحران نداریم …»). لحظه فقط از
     پیشنهادِ مدل می‌آمد؛ یعنی شنیده‌شدنِ کلیپ شانسی بود. حالا هر کلیپِ گفتاریِ نشسته که هنوز لحظه ندارد، درونِ
     بخشِ خودش دنبالِ بازگویی گشته می‌شود (`vmReciteSpan_`، همان سنجه‌ای که جای بازگویی را می‌گیرد) و لحظه‌اش
     همان‌جا می‌نشیند؛ نقل‌قول = پرامتیازترین جملهٔ بازگفته (بعد از «:»)، تا `clipfind` همان تکه را در کلیپ بیابد. */
  if (CFG.VM_MOMENT_AUTO !== false) {
    var hasMo = {};
    for (var hm = 0; hm < out.moments.length; hm++) hasMo[out.moments[hm].id] = 1;
    for (var az = 0; az < sc.length; az++) {
      var sv = sc[az], iv = byId[sv.id];
      if (!iv || iv.kind !== 'video' || hasMo[sv.id]) continue;
      var words = iv.allWords || iv.words;
      if (!words) continue;
      hasMo[sv.id] = 1;
      var secA = secOfSn(sv.sn), span = null;
      for (var kk = sv.sn - 1; kk < S && !span; kk++) {
        if (sents[kk].sec !== secA) break;
        span = vmReciteSpan_(sents, kk, words, secs, secA);
      }
      if (!span || span.at < sv.t0 - 0.05) continue;
      var cset = {}, bestQ = '', bestS = -1;
      vmToks_(words).forEach(function (w0) { cset[w0] = 1; });
      for (var qs = span.a; qs <= span.b; qs++) {
        var tx = String(sents[qs].text || ''), ixq = tx.search(/[:：«]/), qx = ixq >= 0 ? tx.slice(ixq + 1) : tx;
        var scq = vmReciteScore_(qx, cset);
        if (scq > bestS) { bestS = scq; bestQ = qx; }
      }
      out.moments.push({ id: sv.id, at: span.at, quote: bestQ.replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160),
                         sn: span.a, cut: span.cut, recite: span.b - span.a + 1, auto: true });
      out.autoMoments = (out.autoMoments || 0) + 1;
    }
  }
  /* لحظه‌ها: سقف، فاصله، و هرگز روی موسیقی یا ته قسمت. */
  var mm = [], cap = Math.max(0, Number(CFG.VM_MOMENT_MAX) || 3);
  out.moments.sort(function (a, b) { return a.at - b.at; });
  for (var m = 0; m < out.moments.length && mm.length < cap; m++) {
    var mo = out.moments[m];
    if (vmInMusic_(mo.at, music)) { out.dropped++; continue; }
    if (mo.at < 5 || mo.at > total - 5) { out.dropped++; continue; }
    /* بازگویی‌ای که تا پس از آغازِ یک پلِ موسیقی کشیده شده، سرِ موسیقی می‌ایستد — پل جای بخش‌عوض‌کردن است و
       نباید همراهِ بازگویی از ویدئو بریده شود (۹.۲۷). */
    for (var mu = 0; mu < (music || []).length && mo.cut > 0; mu++) {
      var m0 = Number(music[mu][0]);
      if (m0 > mo.at + 1 && m0 < mo.at + Number(mo.cut)) mo.cut = Math.round((m0 - mo.at) * 10) / 10;
    }
    var gapNeed = Math.max(8, Number(CFG.VM_MOMENT_GAP) || 30);
    var prevEnd = mm.length ? mm[mm.length - 1].at + (Number(mm[mm.length - 1].cut) || 0) : -1e9;
    /* ۹.۲۷: لحظه‌ای که جای بازگویی می‌نشیند و آغازش به لحظهٔ قبلی نزدیک است، دور انداخته نمی‌شود — آغازش تا
       نخستین جملهٔ همان بازگویی که فاصله را نگه می‌دارد جلو می‌رود (پایانِ بازگویی همان می‌ماند). کلیپِ سخنگوی
       ۷۳ در نمونهٔ ۷ همین‌جا افتاد و «صداش پخش نشد» دوباره شد. */
    if (mo.at - prevEnd < gapNeed && mo.cut > 0 && mo.sn >= 0) {
      var endR = mo.at + Number(mo.cut);
      for (var qg = mo.sn + 1; qg < S && Number(sents[qg].t) < endR - 6; qg++) {
        if (Number(sents[qg].t) - prevEnd >= gapNeed) {
          var tq = Math.round(Number(sents[qg].t) * 10) / 10;
          if (mo.recite) mo.recite = Math.max(1, mo.recite - (qg - mo.sn));
          mo.cut = Math.round((endR - tq) * 10) / 10; mo.at = tq; mo.sn = qg; mo.shifted = true;
          break;
        }
      }
    }
    if (mm.length && mo.at - prevEnd < gapNeed) { out.dropped++; (out.momentDrops = out.momentDrops || []).push(mo.id + '@' + mo.at + ': فاصله'); continue; }
    mo.max = Math.max(3, Number(CFG.VM_MOMENT_SEC) || 12);
    mo.whole = Math.max(mo.max, Number(CFG.VM_MOMENT_WHOLE) || 0);
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
    /* ۹.۰۱: رسانهٔ **دیده‌شده** دیگر برنمی‌گردد — «چیزی که توضیح داده شده و دیده شده بارها باز
       می‌آید و سریع می‌رود». نبودِ رسانهٔ تازه ⇒ این صحنه را `vmCards_` با کارتِ نوشته نصف می‌کند. */
    if (!alt) continue;
    var best = midSent(z);
    if (best < 0) continue;
    sc.splice(z + 1, 0, mk(alt, best + 1, ''));
    z++;
  }
  for (var e = 0; e < sc.length; e++) sc[e].n = e + 1;
  /* ══ `say` = گفتارِ کلِ صحنه، از جملهٔ آغازش (۹.۱۹) ══ تا این‌جا فقط جملهٔ نخست بود — و نخستین جملهٔ
     صحنهٔ رسانه‌ای اغلب تیترِ دوسه‌واژه‌ایِ آیتم است («بازرسِ امورِ تحتانی.»). `tools/avsync.py` از ۰٫۸
     ثانیه پس از آغاز تا ده ثانیه می‌شنود و با همین `say` می‌سنجد؛ پس جمله‌های بعدیِ **همان** صحنه را
     می‌شنید و «۰٪ خودش» می‌داد: variety:74 دو نقطه از سه «با تصویرش نمی‌خواند» گرفت در حالی که با
     faster-whisper روی خودِ ویدئو هر دو درست بودند (کلیپِ ماساژ زیرِ «انیمیشنِ بعدی…»، کلیپِ تیرکمان
     زیرِ «از اداره که بگذریم…»). جملهٔ آغاز همچنان اولِ `say` است. */
  for (var q = 0; q < sc.length; q++) {
    var qEnd = endOf(q), said = [];
    for (var y = sc[q].sn - 1; y < S; y++) {
      if (y > sc[q].sn - 1 && Number(sents[y].t) >= qEnd - 0.05) break;
      said.push(String(sents[y].text || '').trim());
      if (said.join(' ').length >= 240) break;
    }
    sc[q].say = said.join(' ').slice(0, 240);
  }
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
                 'Absolutely no text, letters, numbers, logos or watermarks. No identifiable real person. ' +
                 (typeof LV_HOLY_EN === 'string' ? LV_HOLY_EN : '');
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
function vmLead_(ready, coverId, hookEnd) {
  if (!ready.length) return [];
  /* ══ پیش‌نمایش فقط به اندازهٔ آغازِ گوینده (۹.۱۴) ══
     «طولِ تیزر به همان اندازهٔ توضیحاتِ ابتدایی پیش از شروعِ اولین محتوا باشد»: در نمونهٔ سومِ ۷۳ نخستین
     رسانه چند جمله پس از آغازِ بخشِ یک نشست، پس کلاژ ادامه داشت در حالی که گوینده ماجرای آیتمِ یک را
     می‌گفت — «هی تکرار می‌شود». حالا پیش‌نمایش سرِ پایانِ hook می‌ایستد و رسانهٔ نخستین از همان‌جا می‌آید. */
  var hE = Number(hookEnd) || 0;
  if (hE > 4 && Number(ready[0].t0) > hE + 1) ready[0].t0 = Math.round(hE * 10) / 10;
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
 * کارتِ نوشته روی کاورِ محو — جایی که رسانهٔ تازه‌ای برای نشان دادن نیست (۹.۰۱). تابعِ خالص.
 *
 * نمونهٔ چهارمِ قسمتِ ۷۲ را صاحبِ برنامه دید و سه چیز گفت که هر سه از یک ریشه بود: صحنه تا رسانهٔ
 * **بعدی** می‌ماند، هر چه گوینده بگوید. پس:
 *   • «آخرِ کار که موسیقیِ پایانی می‌زند هنوز یک کلیپ اجرا می‌شود» — صحنهٔ ۱۲ از ۶۰۴ تا ۶۵۶ بود و
 *     موسیقیِ پایانی از ۶۲۶٫۹. حالا سرِ موسیقیِ پایانی کاور می‌آید.
 *   • «بینِ دو کلیپ که صحبت می‌کند هنوز قبلی پخش می‌شود» — صحنهٔ ۱ از ۵۹٫۷ تا ۱۷۴٫۶ (۱۱۵ ثانیه) یک
 *     کلیپ بود که ۴۰ ثانیه روی آخرین قابش ماند. حالا صحنه‌ای که از `VM_SCENE_MAX_SEC`×۱٫۶ بلندتر است
 *     سرِ جملهٔ میانه‌اش کارت می‌گیرد: همان جمله‌ای که گوینده آن لحظه می‌گوید، نوشتهٔ برداری روی کاورِ
 *     محو — «حالت برداری کم استفاده شده بود».
 *   • ۹.۰۳: کارت کوتاه است و پس از آن همان کلیپ از جایی که ایستاد ادامه می‌یابد؛ پل‌های میانه کاور نمی‌گیرند.
 * کاور نبود ⇒ همان صحنه‌ها، دست‌نخورده.
 */
function vmCards_(ready, sents, music, secs, coverId) {
  var out = { scenes: ready.slice(), added: 0 };
  if (!coverId || CFG.VM_CARDS === false || !ready.length) return out;
  var total = Number(secs) || 0;
  var cardSec = Math.max(4, Number(CFG.VM_CARD_SEC) || 7);
  var plain = function (t) {
    return String(t || '').replace(/[ً-ْٰ]/g, '').replace(/\s+/g, ' ').trim();
  };
  /* ۹.۰۴: کارت عکس‌نوشتهٔ متحرک است، نه یک نقلِ ثابت — تیترِ همان ماجرا و جملهٔ گوینده در سه پاره که یکی‌یکی
     می‌آیند (`points`، همان سازوکارِ مرحله‌ایِ `overlay.js`)؛ رانر زمینه‌اش را تصویرِ محوِ **همان رسانه** می‌گذارد. */
  var card = function (t0, text, title) {
    var w = plain(text).split(' ').filter(Boolean), lines = [];
    var per = w.length <= 7 ? w.length : Math.ceil(w.length / Math.min(3, Math.ceil(w.length / 7)));
    for (var i0 = 0; i0 < w.length && lines.length < 3; i0 += per) {
      var ln = w.slice(i0, i0 + per).join(' ');
      if (ln.length > 60) ln = ln.slice(0, 57).replace(/\s+\S*$/, '') + '…';
      lines.push(ln);
    }
    if (lines.length === 3 && w.length > per * 3) lines[2] = lines[2].replace(/…?$/, '…');
    return { t0: Math.round(t0 * 10) / 10, fileId: coverId, caption: '', say: '',
             media: { kind: 'photo', quote: '', card: true },
             ov: { kind: 'points', title: plain(title || '').slice(0, 60), lines: lines } };
  };
  var sc = out.scenes;
  /* فقط موسیقیِ **پایانی** کاور می‌گیرد. نسخهٔ ۹.۰۱ سرِ پل‌های میانه هم کاور می‌گذاشت و پس از پل کارت — و
     نمونهٔ پنجم نشان داد این وقتِ خودِ کلیپ را می‌خورد: کلیپِ ۵۹٫۷ فقط ۱۷ ثانیه دیده شد و ۱۰۰ ثانیه کاور بود. */
  var mus = (music || []).slice().sort(function (a, b) { return a[0] - b[0]; });
  for (var i = 0; i < mus.length; i++) {
    var a0 = Number(mus[i][0]), b0 = Number(mus[i][1]);
    if (!(b0 > a0) || a0 < 1) continue;
    if (total && b0 >= total - 1) {
      sc.push({ t0: Math.round(a0 * 10) / 10, fileId: coverId, caption: '', say: '', media: { kind: 'photo', quote: '', outro: true } });
      out.added++;
    }
  }
  sc.sort(function (p, q) { return p.t0 - q.t0; });
  /* صحنهٔ بلند: کارتی **کوتاه** (`VM_CARD_SEC`) سرِ جملهٔ میانه، و بعد **همان رسانه ادامه می‌یابد** (`cont`):
     رانر کلیپ را از جایی که صحنهٔ پیشینش ایستاد پی می‌گیرد — نه از نو، نه کاورِ طولانی. */
  var maxSec = Math.max(10, Number(CFG.VM_SCENE_MAX_SEC) || 28) * 1.6;
  for (var guard = 0; guard < 40; guard++) {
    var hit = -1;
    for (var z = 0; z < sc.length; z++) {
      var m0 = sc[z].media || {};
      if (m0.intro || m0.teaser || m0.outro || m0.card || m0.long) continue;
      var end = z + 1 < sc.length ? sc[z + 1].t0 : total;
      if (end - sc[z].t0 > maxSec) { hit = z; break; }
    }
    if (hit < 0) break;
    var st = sc[hit].t0, en = hit + 1 < sc.length ? sc[hit + 1].t0 : total, mid = st + (en - st) / 2, best = null;
    for (var y = 0; y < sents.length; y++) {
      var ty = Number(sents[y][0]);
      if (ty < st + 8 || ty > en - 8 - cardSec) continue;
      /* کارت روی موسیقیِ میانه نمی‌نشیند: نوشتهٔ جملهٔ گوینده وقتی گوینده ساکت است، معنا ندارد. */
      var onMus = false;
      for (var mz = 0; mz < mus.length; mz++) if (ty < Number(mus[mz][1]) && ty + cardSec > Number(mus[mz][0])) onMus = true;
      if (onMus) continue;
      if (!best || Math.abs(ty - mid) < Math.abs(best.t - mid)) best = { t: ty, text: sents[y][1] };
    }
    if (!best || !plain(best.text)) { sc[hit].media = Object.assign({}, sc[hit].media, { long: true }); continue; }
    var back = null;
    for (var y2 = 0; y2 < sents.length; y2++) {
      var t2 = Number(sents[y2][0]);
      if (t2 >= best.t + cardSec - 0.5 && t2 <= en - 6) { back = t2; break; }
    }
    if (back === null) back = Math.min(en - 6, best.t + cardSec);
    var cont = { t0: Math.round(back * 10) / 10, fileId: sc[hit].fileId, caption: '', say: '',
                 media: { kind: sc[hit].media.kind, quote: '', cont: true } };
    sc.splice(hit + 1, 0, card(best.t, best.text, sc[hit].ov && sc[hit].ov.title), cont);
    out.added += 2;
  }
  for (var n = 0; n < sc.length; n++) {
    sc[n].n = n + 1;
    if (sc[n].media && sc[n].media.long) delete sc[n].media.long;
  }
  return out;
}

/**
 * سازندهٔ رسانه‌های یک قسمت — چنداجرایی، با حالت در `_media.json`:
 *   plan ⇒ (مدل، یک بار) · copy ⇒ (رونوشت‌ها، شاید در چند اجرا) · cover ⇒ ready.
 * @return {active, done, fallback, why, items, cover, moments, music, info}
 */
/**
 * ۱۴.۲ — رسانه‌هایی که مدل در `rights` «broadcast» گفته — یا اصلاً داوری نکرده — از فهرست و از نقشه بیرون. {items, dropped, what}.
 * `rights` برای همهٔ رسانه‌هاست، جداگانه از جای‌دادن: رسانه‌ای که مدل جایش نداد هنوز به صحنه برمی‌گردد (`vmScenes_`)، پس داوری
 * باید مستقل از placement باشد. «نه»ِ صریح لازم است.
 */
function vmBroadcastSplit_(raw, items) {
  var rt = (raw && raw.rights) || [], verdict = {}, what = [];
  for (var i = 0; i < rt.length; i++) {
    var id = String((rt[i] && rt[i].item) || ''), b = String((rt[i] && rt[i].broadcast) || '').trim();
    if (!id) continue;
    var yes = !/^(نه|خیر|no)$/i.test(b);
    verdict[id] = verdict[id] === true ? true : yes;   // یک «بله» برای یک رسانه کافی است
    var w = String((rt[i] && rt[i].what) || '').trim();
    if (yes && w && what.indexOf(w) === -1) what.push(w.slice(0, 60));
  }
  var keep = [], dropped = [];
  for (var j = 0; j < items.length; j++) {
    if (verdict[items[j].id] === false) keep.push(items[j]); else dropped.push(items[j].id);
  }
  if (raw && raw.placements) raw.placements = raw.placements.filter(function (p) { return verdict[String((p && p.item) || '')] === false; });
  return { items: keep, dropped: dropped, what: what };
}

/**
 * ۱۴.۴ — رسانه‌هایی که نباید دیده شوند از نقشهٔ **آمادهٔ** یک قسمتِ منتشرشده بیرون، برای ساختِ دوباره و جایگزینی.
 * «قسمت ۸۲: ساختِ دوبارهٔ ویدئو بدونِ هر چهار کلیپِ سریال/فیلم (با همان صوت، کاور و کارت)». جای هر کلیپ کاورِ همان
 * قسمت می‌نشیند — همان زمان، همان کارت (`ov`) — و لحظه‌هایش (صدای خودِ کلیپ) کنار می‌روند؛ صوتِ پادکست دست نمی‌خورد.
 * کاور نباشد ⇒ نه: صحنه‌ای که چیزی ندارد به قبلی می‌پیوندد و کلیپِ قبلی می‌توانست همان‌جا بماند.
 * strip: 'video' (همهٔ کلیپ‌ها) یا فهرستِ شناسه‌ها. ⇒ {ok, n, why}
 */
function vmStripMedia_(folder, strip, why) {
  var d = vmRead_(folder);
  if (!d || d.phase !== 'ready' || !d.scenes || !d.scenes.length) return { ok: false, n: 0, why: '`' + vmName_() + '` آماده نیست' };
  var cov = String((d.cover || {}).fileId || '');
  if (!cov) return { ok: false, n: 0, why: 'کاورِ قسمت نیست؛ جای کلیپ‌ها چیزی نمی‌ماند' };
  var all = String(strip) === 'video';
  var ids = all ? [] : [].concat(strip || []).map(String);
  var gone = {}, n = 0;
  d.copies = d.copies || {};
  for (var i = 0; i < d.scenes.length; i++) {
    var s = d.scenes[i];
    if (!(all ? s.kind === 'video' : ids.indexOf(String(s.id)) !== -1)) continue;
    gone[s.id] = 1;
    var nid = 'cover-' + (i + 1);
    d.scenes[i] = { id: nid, kind: 'photo', fileId: cov, sn: s.sn, t0: s.t0, quote: '', say: s.say,
                    ov: s.ov || null, n: s.n, was: String(s.id) };
    d.copies[nid] = cov;
    n++;
  }
  if (!n) return { ok: true, n: 0, why: '' };
  d.moments = (d.moments || []).filter(function (m) { return !gone[m.id]; });
  d.stripped = { at: nowStr_(), ids: Object.keys(gone), why: String(why || '').slice(0, 300) };
  if (!vmWrite_(folder, d)) return { ok: false, n: 0, why: 'نوشتنِ `' + vmName_() + '` نشد' };
  return { ok: true, n: n, why: '' };
}

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
    /* ۹.۶۰: قسمتی که منبعش فقط صدا یا متن است (قسمتِ ۷۷، ۱۹ اکتبر: ۴ صدا، ۰ ویدیو، ۰ عکس) چیزی برای نشان دادن
       ندارد؛ ویدئوی ساده همان پاسخِ درست است، نه خرابی. `none` تا خطِ روزانه آن را از افتادنِ واقعی جدا کند و
       یافتهٔ «جدی»ِ کد برای چیزی که هیچ کدی عوضش نمی‌کند ساخته نشود. */
    if (!items.length) {
      out.fallback = true; out.none = true; out.why = 'این قسمت کلیپ یا عکسِ منبع ندارد';
      vmNote_(key, { ok: false, none: true, why: out.why });
      try { logLine_('رسانه‌های منبعِ ' + key + ': منبعِ تصویری ندارد — ویدئوی ساده، همان که باید.'); } catch (eN) {}
      return out;
    }
    if (left() < 70000) { out.why = 'وقتِ این دور برای نقشهٔ رسانه کم است؛ دورِ بعد'; return out; }
    var rp = vmReplay_(folder, meta);
    /* ۹.۶۵: نبودنِ `_times.json` **منتظرماندنی** است، نه نهایی — صدا ممکن است هنوز در ساخت باشد (special:76). */
    if (!rp.chunks.length) return planFail(rp.why || 'زمانِ تکه‌ها با متنِ گفتار جور نشد', !/_times\.json/.test(String(rp.why || '')));
    var sents = lvSceneSents_(rp.chunks);
    if (sents.length < 3) return planFail('جمله‌ای برای صحنه نماند', true);
    var raw = null;
    try {
      raw = geminiText_(vmPrompt_(sents, items, ctx), VM_SCHEMA,
                        Math.max(2048, Number(CFG.VM_PLAN_TOKENS) || 12288), { exact: true });
    } catch (eA) { return planFail('مدل جواب نداد: ' + String(eA.message).slice(0, 120)); }
    /* ══ تصویرِ اثرِ حرفه‌ای هرگز در ویدئو (۱۴.۲) ══ «از همه جا» ۸۲ در یوتیوب «Video blocked globally» شد با ادعای **تصویری**
       «Motaham Gorikht E22»: هر چهار کلیپش برش از سریال و فیلم بود (شب‌های برره، متهم گریخت، …) که در اینستاگرام دوباره گذاشته شده
       بودند. رسانهٔ «broadcast» نه صحنه می‌شود نه لحظه — `vmScenes_` رسانهٔ جامانده را خودش به صحنه برمی‌گرداند، پس از خودِ فهرست
       بیرون می‌رود؛ صوتِ پادکست دست نمی‌خورد. خطای مدل یا جوابِ بی این فیلد ⇒ آن رسانه کنار (شک یعنی نه). */
    var bc = vmBroadcastSplit_(raw, items);
    items = bc.items;
    if (!items.length) {
      out.fallback = true; out.none = true; out.why = 'همهٔ رسانه‌های این قسمت برش از سریال/فیلم/شبکه بودند (' + bc.what.join('، ') + ') — ویدئوی ساده';
      vmNote_(key, { ok: false, none: true, broadcast: bc.dropped.length, why: out.why });
      try { logLine_('رسانه‌های منبعِ ' + key + ': ' + out.why); } catch (eBc) {}
      return out;
    }
    var vs = vmScenes_(raw, sents, items, rp.secs, rp.music);
    if (vs.scenes.length < Math.max(1, Number(CFG.VM_MIN_SCENES) || 3)) {
      return planFail('فقط ' + vs.scenes.length + ' صحنه از ' + items.length + ' رسانه درآمد');
    }
    d = { v: 1, key: key, at: nowStr_(), phase: 'copy', failed: 0, secs: rp.secs, align: rp.how,
          scenes: vs.scenes, moments: vs.moments, music: rp.music, coverIdea: vs.cover,
          dropped: vs.dropped, added: vs.added, broadcast: bc.dropped, broadcastWhat: bc.what, autoMoments: vs.autoMoments || 0, momentDrops: vs.momentDrops || [], items: items.length, copies: {}, skipped: [],
          cover: { fileId: '', why: '' },
          sents: sents.map(function (z) { return [Math.round(Number(z.t) * 10) / 10, String(z.text || '').slice(0, 160)]; }),
          hookEnd: (function () { for (var h = 0; h < sents.length; h++) if (Number(sents[h].sec) >= 1) return Number(sents[h].t) || 0; return 0; })() };
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
  var lead = vmLead_(ready, d.cover && d.cover.fileId, Number(d.hookEnd) || 0);
  if (lead.length) {
    ready = lead.concat(ready);
    for (var r = 0; r < ready.length; r++) ready[r].n = r + 1;
  }
  var cards = vmCards_(ready, d.sents || [], d.music || [], Number(d.secs) || 0, d.cover && d.cover.fileId);
  ready = cards.scenes;
  if (ready.length < Math.max(1, Number(CFG.VM_MIN_SCENES) || 3)) {
    return fail('فقط ' + ready.length + ' رسانه رونوشت شد' +
                ((d.skipped || []).length ? ' (' + d.skipped.map(function (x) { return x.why; }).slice(0, 2).join('؛ ') + ')' : ''));
  }
  var okIds = {};
  for (var q = 0; q < d.scenes.length; q++) if ((d.copies || {})[d.scenes[q].id]) okIds[d.scenes[q].id] = (d.copies || {})[d.scenes[q].id];
  var moments = (d.moments || []).filter(function (m) { return !!okIds[m.id]; })
    .map(function (m) {
      var o = { at: m.at, fileId: okIds[m.id], quote: m.quote, max: m.max };
      /* ۹.۱۴: `whole` (۹.۱۱) تا امروز این‌جا و در ردیفِ صف دور ریخته می‌شد — کلِ کلیپ هرگز نمی‌رسید. */
      if (m.whole) o.whole = m.whole;
      if (Number(m.cut) > 0) o.cut = Number(m.cut);
      return o; });
  var nClip = ready.filter(function (x) { return x.media.kind === 'video'; }).length;
  out.done = true;
  /* ۹.۱۵: ژانر **یک‌جا** حساب می‌شود و هر درِ صفِ رندر همین را می‌برد. ۹.۱۴ آن را فقط به درِ انتشار داد؛ نمونهٔ
     چهارمِ ۷۳ از درِ نمونه (`vmSampleTick_`) رفت و کارت‌هایش همان لباسِ درس را گرفتند — دوقلویی که یک بار درست شد. */
  try {
    var em = (meta && meta.ep && meta.ep.mode) || varietyMode_((meta && meta.items) || [], String((meta && (meta.cat || meta.category)) || ''));
    out.genre = em === 'mixed' ? '' : String(em || '');
  } catch (eG) { out.genre = ''; }
  out.items = ready;
  out.cover = d.cover && d.cover.fileId ? { fileId: d.cover.fileId } : null;
  out.moments = moments;
  out.music = d.music || [];
  out.info = { media: true, scenes: ready.length, clips: nClip, photos: ready.length - nClip,
               moments: moments.length, ov: ready.filter(function (x) { return !!x.ov; }).length,
               items: Number(d.items) || 0, dropped: Number(d.dropped) || 0, added: Number(d.added) || 0,
               skipped: (d.skipped || []).length, cover: d.cover && d.cover.fileId ? 'ساخته شد' : String((d.cover || {}).why || 'نه'),
               cards: cards.added,
               align: String(d.align || '') };
  vmNote_(key, { ok: true, why: '', scenes: ready.length, clips: nClip, moments: moments.length, broadcast: (d.broadcast || []).length,
                 cover: !!(d.cover && d.cover.fileId), skipped: (d.skipped || []).length });
  return out;
}

/** خطِ روزانه (بی درایو). */
function vmStatus_() {
  var r = null;
  try { r = JSON.parse(props_().getProperty(PK.VM_LAST) || 'null'); } catch (e) { r = null; }
  if (!vmOn_('variety')) return { on: false, ok: true, line: '' };
  /* ۱۱.۰: انتشارِ «از همه جا» در یوتیوب به خواستِ او متوقف است — ویدئویی ساخته نمی‌شود و این «افتادن» نیست. */
  try {
    if (ytShowOff_('variety')) return { on: false, off: true, ok: true, last: r,
      line: '🎞 «از همه جا» با رسانه‌های منبع: ویدئو ساخته نمی‌شود چون انتشارش در یوتیوب متوقف است (' +
            (CFG.YT_SHOWS_OFF_WHY || 'به خواستِ شما') + ') — ایراد نیست؛ تنظیماتش دست‌نخورده است.' };
  } catch (eOff) {}
  if (!r) return { on: true, ok: true, last: null,
                   line: '🎞 «از همه جا» با رسانه‌های منبع: روشن — هنوز هیچ قسمتی از این راه نرفته.' };
  if (!r.ok && r.none) return { on: true, ok: true, none: true, last: r,
    line: '🎞 «از همه جا» (' + r.key + '، ' + r.at + '): منبعِ این قسمت کلیپ یا عکس نداشت (فقط صدا/متن) — ' +
          'ویدئوی ساده رفت و درست همین است؛ ایراد نیست.' };
  var line = r.ok
    ? '🎞 «از همه جا» با رسانه‌های منبع — آخرین (' + r.key + '، ' + r.at + '): ' + faDigitsOut_(String(r.scenes || 0)) +
      ' صحنه، ' + faDigitsOut_(String(r.clips || 0)) + ' کلیپ، ' + faDigitsOut_(String(r.moments || 0)) +
      ' لحظهٔ با صدای کلیپ، کاور ' + (r.cover ? 'ساخته شد' : 'کارتی') +
      (r.skipped ? ' · ' + faDigitsOut_(String(r.skipped)) + ' رسانه رونوشت نشد' : '') +
      (r.broadcast ? ' · ' + faDigitsOut_(String(r.broadcast)) + ' رسانهٔ برش از سریال/فیلم کنار رفت (Content-ID)' : '') + '.'
    : '🎞 ❌ «از همه جا» (' + r.key + ') با رسانهٔ منبع ساخته نشد و ویدئوی ساده رفت — علت: ' + String(r.why || 'بی علت');
  return { on: true, ok: !!r.ok, last: r, line: line };
}

/**
 * «لحظه»ها ویدئو را بلندتر از صوت می‌کنند؛ زمانِ فصل‌های توضیح پس از هر لحظه جلو می‌رود.
 * فقط سطرهایی که با زمان شروع می‌شوند عوض می‌شوند. `inserts`: [{at, d}] از رانر.
 */
function vmShiftDesc_(desc, inserts) {
  var ins = (inserts || []).filter(function (x) { return x && Number(x.d) > 0; })
    .map(function (x) { return { at: Number(x.at) || 0, d: Number(x.d) || 0, cut: Math.max(0, Number(x.cut) || 0) }; })
    .sort(function (a, b) { return a.at - b.at; });
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
    /* ۹.۱۴: لحظه‌ای که جای بازگویی نشست (`cut`) گفتارِ [at, at+cut) را برداشته: پس از آن فقط d−cut جابه‌جا
       می‌شود، و فصلی که درونِ همان بازه شروع می‌شد پس از کلیپ می‌آید. */
    var shift = 0, nt = -1;
    for (var i = 0; i < ins.length && nt < 0; i++) {
      var I = ins[i];
      if (I.at > t) break;
      if (I.cut && t < I.at + I.cut) nt = I.at + shift + I.d;
      else shift += I.d - I.cut;
    }
    var newT = Math.round(nt >= 0 ? nt : t + shift);
    return newT !== t ? m[1] + ytTime_(newT) + (m[3] || '') : line;
  }).join('\n');
}

/** سلامتِ روزانهٔ این بخش — جدا از `lvHealth_` که بی وضعیتِ درس‌نامه زود برمی‌گردد. */
function vmHealth_(problems, notes) {
  /* «از همه جا» با رسانه‌های منبع (۸.۹۶): خطِ روزانه **همیشه** — حتی وقتی سالم است، چون سکوت با
     «هیچ قسمتی از این راه نرفت» یکی است. افتادن به ویدئوی ساده ⇒ مسئلهٔ روز و یافتهٔ کد. */
  try {
    var vmS = vmStatus_();
    if ((vmS.on || vmS.off) && vmS.line) notes.push(vmS.line);
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
      if (row0) ytRenderShare_(row0, false, ytShareKeep_(ytRenderRead_(), key));   // رونوشت‌ها و صوت دوباره خصوصی — جز آنچه ردیفِ در انتظارِ دیگری لازم دارد (۹.۰۲)
    } catch (eD) {}
    try { if (tgEnabled_()) tgApi_('sendMessage', { chat_id: tgChat_(), text: txt, disable_web_page_preview: false }); } catch (eT) {}
    try { mailQueue_('یوتیوب', 'نمونهٔ ویدئوی «از همه جا» با رسانه‌های منبع', txt); } catch (eQ) {}
    st = { key: key, told: true, at: nowStr_(), url: m.url };
    try { props_().setProperty(PK.VM_SAMPLE, JSON.stringify(st)); } catch (eS) {}
    return st;
  }
  if (st.key === key && st.asked) {
    /* منتظرِ رانر — و هر ساعت اشتراکِ همین ردیف دوباره برقرار می‌شود (۹.۰۲): پس‌گرفتنِ اشتراکِ ردیفِ دیگری
       (یا دستِ کسی) صوتِ همین نمونه را بسته بود و رانر یک صفحهٔ HTML به‌جای WAV گرفت. */
    try {
      var rowW = (ytRenderRead_().items || []).filter(function (x) { return String(x.key) === key; })[0];
      if (rowW && String(rowW.status || '') === 'در انتظار') ytRenderShare_(rowW, true);
    } catch (eW) {}
    return null;
  }
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
                 media: true, moments: r.moments, mute: r.music, genre: r.genre,
                 coverTitle: String(plan.coverTitle || ep.title || ''),
                 coverKicker: String(plan.coverKicker || CFG.SHOW_NAME || ''),
                 coverFoot: 'قسمت ' + faDigitsOut_(String(spec.ep)),
                 audio: aud.parts.map(function (f) { return { id: f.getId(), name: f.getName() }; }),
                 audioKind: aud.kind, coverFileId: '', outName: 'نمونه — ' + ytVideoName_(String(folder.getName())) });
  st = { key: key, asked: !!asked, at: nowStr_(), scenes: r.items.length, moments: r.moments.length };
  try { props_().setProperty(PK.VM_SAMPLE, JSON.stringify(st)); } catch (eS3) {}
  return st;
}

/* ══════════ ورودیِ «از همه جا» فقط از مجموعه‌های علمیِ مطمئن (۱۳.۴) ══════════
 * قسمتِ ۸۴ (۲۶ اکتبر) هشت فایلِ صوتی داشت، هر هشت از دورهٔ «نویسندگیِ خلاق» — و اولی بازخوردِ اداریِ کلاس بود
 * («نتایج را تا پایانِ هفته اعلام خواهد کرد»). ریشه: دستهٔ هر ردیف را `txClassify` با **شمردنِ واژه‌های همان ردیف**
 * می‌دهد («دوره، آموزش، کلاس» ⇒ «علمی و آموزشی»)، و داوریِ مفهومیِ ۱۳.۰ فقط به تختهٔ مجموعه‌ها رسیده بود؛ همان دوره در
 * تخته «فرهنگی، تاریخی و ادبی» است و تکه‌هایش در «از همه جا» هنوز «علمی». صاحبِ کانال تأیید کرد:
 *   الف) فقط از مجموعه‌هایی که «آموزشی = بله» (دستی یا داوریِ مطمئن) و دسته‌شان در قفلِ دسته‌های علمی است، و فقط
 *       بخش‌های محتوایی — فیلترِ دولایهٔ «مقدماتی/اداریِ کلاس»: نشانه‌ها در کد (`vgAdmin_`)، و قاعدهٔ صریح در داور؛
 *   ب) نویسندگی و زبان‌آموزی بیرون، با فهرستِ استثنایی که **فقط او** پر می‌کند (تبِ `VG_ALLOW_TAB`؛ موتور فقط سرستون
 *       می‌سازد و هرگز ردیف نمی‌نویسد)؛
 *   ج) منبع و قطعه‌های هر قسمتِ تازه در ایمیلِ ۱۰ و تلگرام.
 * ردیفِ بی‌مجموعه (کلیپ و عکسِ تک) داوریِ مجموعه ندارد: داورِ سیرِ قسمت با همان قاعدهٔ «علمی و محتوایی» تصمیم می‌گیرد،
 * و **نامطمئن یعنی بیرون** — نه «بله»ی پیش‌فرض (`curateJudge_`؛ داوری که نشد یعنی همه‌شان بیرون).
 * داوری دستی همیشه مقدم است: «آموزشی است/نیست» و «دستهٔ دستی» از همان `seriesIsCourse_`/`seriesCatOf_` خوانده می‌شوند.
 */
var VG_ALLOW_HEADERS = ['کلید مجموعه', 'نام مجموعه', 'یادداشت (اختیاری)'];

/** نشانه‌ها با شروعِ واژه، روی متنِ یکسان‌شده (همان شیوهٔ `judgePseudoSign_`). ⇒ فهرستِ نشانه‌های دیده‌شده. */
function vgSigns_(txt, signs) {
  var t = ' ' + txNorm(String(txt || '')).replace(/ٔ/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
  var out = [];
  for (var i = 0; i < (signs || []).length; i++) {
    var sg = txNorm(String(signs[i] || '')).replace(/ٔ/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (sg && t.indexOf(' ' + sg) !== -1 && out.indexOf(sg) === -1) out.push(sg);
  }
  return out;
}

/** لایهٔ اولِ «مقدماتی/اداریِ کلاس»: دست‌کم `VG_ADMIN_MIN` نشانهٔ جدا در موضوع/پیام/خلاصه/آغازِ متن. ⇒ دلیل یا ''. */
function vgAdmin_(it) {
  var txt = [it && it.topic, it && it.msg, it && it.summary, String((it && it.body) || '').slice(0, 900)].join(' ');
  var hits = vgSigns_(txt, CFG.VG_ADMIN_SIGNS);
  return hits.length >= Math.max(1, Number(CFG.VG_ADMIN_MIN) || 2) ? 'اداری/مقدماتیِ کلاس (' + hits.slice(0, 3).join('، ') + ')' : '';
}

/** ب) مجموعهٔ نویسندگی یا زبان‌آموزی؟ از نام، موضوع، شرحِ داور، دسته و قالب. ⇒ نشانه یا ''. */
function vgExcluded_(vals) {
  if (!vals) return '';
  var txt = [vals[SC.NAME - 1], vals[SC.TOPIC - 1], vals[SC.ABOUT - 1], vals[SC.CAT - 1], vals[SC.MCAT - 1],
             String(vals[SC.WHY - 1] || '').slice(0, 160)].join(' ');
  return vgSigns_(txt, CFG.VG_EXCL_SIGNS)[0] || '';
}

/** فهرستِ استثنای صاحبِ کانال: کلید یا نامِ دقیقِ مجموعه. موتور فقط سرستون را می‌سازد. ⇒ {keys, names} */
function vgAllowList_(hub) {
  var out = { keys: Object.create(null), names: Object.create(null), n: 0 };
  try {
    var sh = ensureTab_(hub, CFG.VG_ALLOW_TAB || 'استثناهای «از همه جا»', VG_ALLOW_HEADERS);
    if (sh.getLastRow() < 2) return out;
    var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < v.length; i++) {
      var k = String(v[i][0] || '').trim(), nm = String(v[i][1] || '').trim();
      if (k) out.keys[k] = 1;
      if (nm) out.names[nm] = 1;
      if (k || nm) out.n++;
    }
  } catch (e) { logLine_('تبِ استثناهای «از همه جا» خوانده نشد: ' + String(e.message).slice(0, 100)); }
  return out;
}

/** الف + ب برای یک ردیفِ رجیستری. استثنای صاحبِ کانال هر دو را باز می‌کند (فیلترِ اداری همچنان می‌ماند). ⇒ {ok, why} */
function vgSeriesOk_(rec, allow) {
  var v = rec.vals, name = String(v[SC.NAME - 1] || '').trim();
  if (allow && (allow.keys[rec.key] || (name && allow.names[name]))) return { ok: true, why: 'استثنای شما' };
  var ex = vgExcluded_(v);
  if (ex) return { ok: false, why: 'نویسندگی/زبان‌آموزی («' + ex + '»)' };
  var c = seriesIsCourse_(v);
  if (c !== true) return { ok: false, why: c === false ? 'مجموعه آموزشی نیست' : 'آموزشی‌بودنِ مجموعه مطمئن نیست' };
  var cat = seriesCatOf_(v), lock = [];
  try { lock = catLockList_(); } catch (eL) { lock = (CFG.CAT_LOCK || []).slice(); }
  if (lock.indexOf(cat) === -1) return { ok: false, why: 'دستهٔ مجموعه «' + cat + '» در دسته‌های علمی نیست' };
  return { ok: true, why: '' };
}

/** خواندنِ یک‌بارهٔ رجیستری و نگاشتِ فایل⇐مجموعه (در هر اجرا یک بار). */
var VG_CTX_ = null;
function vgCtx_(hub) {
  if (VG_CTX_) return VG_CTX_;
  var c = { parts: null, reg: null, allow: null, err: '' };
  try { c.parts = readSeriesParts_(hub); c.reg = readSeriesReg_(hub); c.allow = vgAllowList_(hub); }
  catch (e) { c.err = String(e.message || e).slice(0, 120); }
  VG_CTX_ = c;
  return c;
}

/**
 * دروازه، پیش از سردبیر. ردیفِ مجموعه‌دار یا می‌ماند یا با دلیل بیرون می‌رود؛ ردیفِ بی‌مجموعه `vgLoose` می‌گیرد و
 * تصمیمش با داورِ سیر است. رجیستری خوانده نشد ⇒ همه «بی‌مجموعه» (پس فقط با «بله»ی داور)، نه «همه مجاز». ⇒ {keep, out[]}
 */
function vgGate_(hub, items) {
  var res = { keep: [], out: [] };
  if (CFG.VG_ON === false) { res.keep = (items || []).slice(); return res; }
  var ctx = vgCtx_(hub);
  if (ctx.err) logLine_('«از همه جا»: رجیستریِ مجموعه‌ها خوانده نشد (' + ctx.err + ')؛ همهٔ نامزدها فقط با داور.');
  for (var i = 0; i < (items || []).length; i++) {
    var it = items[i];
    if (!it) continue;
    var adm = vgAdmin_(it);
    if (adm) { res.out.push({ item: it, why: adm }); continue; }
    var pr = ctx.parts && ctx.parts.byFile[String(it.id || '').trim()];
    var rec = pr && ctx.reg && ctx.reg.byKey[pr.key];
    if (rec) {
      var g = vgSeriesOk_(rec, ctx.allow);
      it.vgSeries = { key: rec.key, name: String(rec.vals[SC.NAME - 1] || ''), cat: seriesCatOf_(rec.vals), allow: g.why === 'استثنای شما' };
      if (!g.ok) { res.out.push({ item: it, why: g.why + ' — «' + it.vgSeries.name + '»' }); continue; }
      it.vgLoose = false;
    } else {
      it.vgLoose = true;
    }
    res.keep.push(it);
  }
  return res;
}

/** ثبتِ کنارگذاشته‌های این قسمت، برای گزارش (ج). */
var VG_OUT_ = [];
function vgFilter_(hub, items, where) {
  var g = vgGate_(hub, items);
  for (var i = 0; i < g.out.length; i++) {
    var id = String(g.out[i].item.id || '');
    if (!VG_OUT_.some(function (x) { return x.id === id; })) VG_OUT_.push({ id: id, why: g.out[i].why, where: where || '' });
  }
  if (g.out.length) logLine_('«از همه جا» — دروازهٔ منبع (' + (where || '') + '): ' + g.out.length + ' از ' + (items || []).length +
                             ' بیرون (' + g.out.slice(0, 3).map(function (x) { return x.why; }).join(' · ') + ').');
  return g.keep;
}

/** دسته‌هایی که امروز پس از دروازه قسمت نساختند — تا جبرانِ خودکار (`epCatchUp_`) سراغِ دستهٔ علمیِ بعدی برود. */
function vgSkipToday_() {
  try {
    var r = JSON.parse(props_().getProperty(PK.VG_SKIP) || 'null');
    return r && r.day === String(nowStr_()).slice(0, 10) && Array.isArray(r.cats) ? r.cats : [];
  } catch (e) { return []; }
}
function vgSkipAdd_(cat) {
  var a = vgSkipToday_();
  if (cat && a.indexOf(cat) === -1) a.push(String(cat));
  try { props_().setProperty(PK.VG_SKIP, JSON.stringify({ day: String(nowStr_()).slice(0, 10), cats: a })); } catch (e) {}
  return a;
}

/**
 * ج) گزارشِ منبع و قطعه‌های قسمتِ تازه — ایمیلِ ۱۰ و تلگرام، و `_STATUS.varietyGate`. هر عضو با مجموعه‌اش (یا «بی‌مجموعه،
 * با داور»)، دسته، نوع و موضوع؛ بعد کنارگذاشته‌ها با دلیل. ⇒ متن.
 */
function vgReport_(epNum, title, items, dropped) {
  var fa = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
  var L = [];
  for (var i = 0; i < (items || []).length; i++) {
    var it = items[i];
    L.push(fa(i + 1) + ') ' + String(it.kind || '') + ' · ' +
      (it.vgSeries ? 'مجموعهٔ «' + it.vgSeries.name + '» (' + it.vgSeries.cat + (it.vgSeries.allow ? '، استثنای شما' : '') + ')'
                   : 'بی‌مجموعه — داور: علمی و محتوایی') +
      ' · ' + String(it.topic || it.summary || '').replace(/\s+/g, ' ').slice(0, 70) + ' · ' + String(it.id || '').slice(0, 12));
  }
  var out = (dropped || []).concat(VG_OUT_);
  var body = 'منبع و قطعه‌های قسمتِ ' + fa(epNum) + ' «' + String(title || '') + '»:\n' + L.join('\n') +
    (out.length ? '\nکنار گذاشته (' + fa(out.length) + '): ' + out.slice(0, 8).map(function (x) {
      return String(x.why || '').slice(0, 70); }).join(' · ') : '\nهیچ نامزدی کنار گذاشته نشد.');
  var rec = { at: nowStr_(), ep: epNum, title: String(title || '').slice(0, 80), n: (items || []).length,
              series: (items || []).filter(function (x) { return x.vgSeries; }).length,
              loose: (items || []).filter(function (x) { return x.vgLoose; }).length, out: out.length,
              outWhy: out.slice(0, 6).map(function (x) { return String(x.why || '').slice(0, 70); }) };
  try { props_().setProperty(PK.VG_LAST, JSON.stringify(rec)); } catch (eP) {}
  try { mailQueue_('variety-source', 'منبعِ قسمتِ ' + fa(epNum) + ' «' + CFG.SHOW_NAME + '»', body); } catch (eM) {}
  try { if (tgEnabled_()) tgSend_('🧭 <b>' + tgEsc_('منبعِ قسمتِ ' + fa(epNum) + ' «' + CFG.SHOW_NAME + '»') + '</b>\n' + tgEsc_(body).slice(0, 3500)); } catch (eT) {}
  return body;
}

/** برای `_STATUS.json`: آخرین گزارش + آنچه امروز کنار رفت. */
function vgStatus_() {
  var r = null;
  try { r = JSON.parse(props_().getProperty(PK.VG_LAST) || 'null'); } catch (e) { r = null; }
  var h = ytOwnerHoldMap_();
  return { on: CFG.VG_ON !== false, last: r, skipToday: vgSkipToday_(), hold: Object.keys(h).map(function (k) { return { key: k, why: h[k] }; }),
           line: vgLine_(r, h) };
}

function vgLine_(r, h) {
  var fa = function (x) { try { return faDigitsOut_(String(x)); } catch (e) { return String(x); } };
  var head = CFG.VG_ON === false ? '🧭 دروازهٔ منبعِ «' + CFG.SHOW_NAME + '»: خاموش (VG_ON)' :
    '🧭 منبعِ «' + CFG.SHOW_NAME + '»: فقط مجموعه‌های علمیِ مطمئن و بخش‌های محتوایی؛ نویسندگی و زبان‌آموزی بیرون (مگر در تبِ «' +
    (CFG.VG_ALLOW_TAB || 'استثناهای «از همه جا»') + '»)؛ بی‌مجموعه فقط با «بله»ی داور';
  var last = r ? ' — آخرین قسمت (' + fa(r.ep) + '، ' + r.at + '): ' + fa(r.n) + ' عضو، ' + fa(r.series) + ' از مجموعه، ' +
                 fa(r.loose) + ' بی‌مجموعه، ' + fa(r.out) + ' کنار رفت' : ' — هنوز قسمتی با این دروازه ساخته نشده';
  var hk = Object.keys(h || {});
  var hold = hk.length ? '\n⏸ کنار گذاشته از صفِ یوتیوب (پاک نشده): ' + hk.map(function (k) { return k + ' — ' + h[k]; }).join(' · ') : '';
  return head + last + '.' + hold;
}

/**
 * ۲) ویدئوهای صفِ یوتیوب که از مجموعهٔ نویسندگی/زبان‌آموزی آمده‌اند — کنار، نه حذف. variety:84 صریحاً در
 * `CFG.YT_OWNER_HOLD` است؛ این‌جا بقیه پیدا می‌شوند: «شناسه منابع»ِ هر قسمت در تبِ پادکست‌ها ⇐ مجموعه ⇐ `vgExcluded_`.
 * روزی یک بار، از دورِ انتشار (`ytRunDue_`) — همان‌جا که هاب از قبل باز است. استثنای صاحبِ کانال این‌جا هم معتبر است.
 * ⇒ {checked, held[]}
 */
function vgHoldSweep_(hub) {
  var out = { checked: 0, held: [] };
  if (CFG.VG_ON === false) return out;
  var day = String(nowStr_()).slice(0, 10);
  if (String(props_().getProperty(PK.VG_HOLD_AT) || '') === day) return out;
  var cand = ytDueList_().concat(ytDueParked_()).filter(function (x) { return x && String(x.show) === ENRICH_SHOW_VARIETY; });
  var map = {};
  try { map = JSON.parse(props_().getProperty(PK.YT_OWNER_HOLD) || '{}') || {}; } catch (eJ) { map = {}; }
  if (cand.length) {
    var pod = hub.getSheetByName(CFG.TAB_PODCASTS);
    var ctx = vgCtx_(hub);
    if (!pod || pod.getLastRow() < 2 || ctx.err) return out;
    var v = pod.getRange(2, 1, pod.getLastRow() - 1, 12).getValues(), ids = {};
    for (var r = 0; r < v.length; r++) ids[String(parseInt(String(v[r][0]), 10))] = String(v[r][11] || '');
    for (var i = 0; i < cand.length; i++) {
      var ep = String(parseInt(String(cand[i].ep || '').replace(/[^\d]/g, ''), 10)), key = String(cand[i].key || (ENRICH_SHOW_VARIETY + ':' + ep));
      if (!ids[ep] || map[key]) continue;
      out.checked++;
      var names = [];
      ids[ep].split(/[,،\s]+/).filter(Boolean).forEach(function (fid) {
        var pr = ctx.parts.byFile[fid], rec = pr && ctx.reg.byKey[pr.key];
        if (!rec) return;
        var nm = String(rec.vals[SC.NAME - 1] || '');
        if (ctx.allow.keys[rec.key] || (nm && ctx.allow.names[nm])) return;
        if (vgExcluded_(rec.vals) && names.indexOf(nm) === -1) names.push(nm);
      });
      if (names.length) { map[key] = 'منبعش از مجموعهٔ نویسندگی/زبان‌آموزی است («' + names[0].slice(0, 50) + '»)'; out.held.push(key); }
    }
  }
  try {
    props_().setProperty(PK.YT_OWNER_HOLD, JSON.stringify(map));
    props_().setProperty(PK.VG_HOLD_AT, day);
  } catch (eS) {}
  YT_HOLD_CACHE_ = null;
  if (out.held.length) {
    logLine_('«از همه جا»: ' + out.held.length + ' ویدئوی صف از مجموعهٔ نویسندگی/زبان‌آموزی کنار رفت (پاک نشد): ' + out.held.join('، '));
    try { mailQueue_('variety-hold', 'کنار گذاشته از صفِ یوتیوب', out.held.map(function (k) { return k + ' — ' + map[k]; }).join('\n')); } catch (eM) {}
  }
  return out;
}
