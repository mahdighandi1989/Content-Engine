/**
 * 02_Sync.gs — همگام‌سازی افزایشی و دسته‌بندی
 *
 * شیت‌های منبع فقط خوانده می‌شوند. نوشتن صرفاً در CONTENT-HUB انجام می‌شود.
 * پردازش «ادامه‌پذیر» است: هر اجرا از جایی که دفعه قبل رها شده ادامه می‌دهد،
 * پس آرشیو ده‌ها هزار ردیفی هم بدون برخورد با محدودیت ۶ دقیقه‌ای کامل می‌شود.
 */

// ---------------------------------------------------------------- شیت مقصد

function getHub_() {
  var id = props_().getProperty(PK.HUB_ID);
  if (id) {
    try {
      var open = SpreadsheetApp.openById(id);
      ensureAllTabs_(open);       // ارتقای خودکار شیت‌های ساخته‌شده با نسخهٔ قدیمی
      return open;
    } catch (e) { /* حذف شده؛ دوباره می‌سازیم */ }
  }
  var folder = DriveApp.getFolderById(CFG.OUTPUT_FOLDER_ID);

  // اگر قبلاً ساخته شده ولی شناسه‌اش گم شده، همان را پیدا کن
  var it = folder.getFilesByName(CFG.HUB_FILE_NAME);
  if (it.hasNext()) {
    var f = it.next();
    props_().setProperty(PK.HUB_ID, f.getId());
    var found = SpreadsheetApp.openById(f.getId());
    ensureAllTabs_(found);
    return found;
  }

  var ss = SpreadsheetApp.create(CFG.HUB_FILE_NAME);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  ss.setSpreadsheetTimeZone(CFG.TIMEZONE);
  props_().setProperty(PK.HUB_ID, ss.getId());

  ensureAllTabs_(ss);

  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('برگه1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  return ss;
}

function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    if (headers === HUB_HEADERS) {   // تاریخ باید متن بماند تا شیت آن را به Date تبدیل نکند
      sh.getRange(1, COL.DATE, sh.getMaxRows(), 1).setNumberFormat('@');
    }
  } else {
    // ارتقای شیتی که با نسخهٔ قبلی ساخته شده.
    // شرطِ قبلی «تعداد ستون کمتر از سرستون‌های تازه» بود و یک حالت را جا
    // می‌گذاشت: نسخه‌ای که *همان تعداد* ستون داشت ولی معنایشان عوض شده بود.
    // داشبورد دقیقاً همین بود — نسخهٔ قدیمی ۱۳ ستون داشت
    // (… جمع | استفاده‌شده | باقی‌مانده | واجد شرایط | واجد ویدیو | واجد عکس …)
    // و نسخهٔ تازه هم ۱۳ ستون دارد
    // (… صدا | سند | جمع | استفاده‌شده | باقی‌مانده | واجد شرایط …).
    // پس ۱۳ < ۱۳ غلط بود، سرستون‌ها بازنویسی نمی‌شد، و دادهٔ درستِ تازه زیر
    // برچسب‌های قدیمی نشسته بود: ستونِ «صدا» عنوانِ «جمع» را داشت.
    // حالا خودِ متنِ سرستون‌ها سنجیده می‌شود، نه فقط تعدادشان.
    if (sh.getMaxColumns() < headers.length) {
      sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
    }
    var cur = [];
    try { cur = sh.getRange(1, 1, 1, headers.length).getValues()[0] || []; } catch (eH) { cur = []; }
    var same = cur.length >= headers.length;
    for (var h = 0; same && h < headers.length; h++) {
      if (String(cur[h] || '').trim() !== String(headers[h]).trim()) same = false;
    }
    if (!same) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
      logLine_('سرستون‌های تب «' + name + '» با نسخهٔ تازه به‌روز شد.');
    }
  }
  return sh;
}

/**
 * ساخت/ارتقای همهٔ تب‌های لازم. یک‌بار در هر اجرا کافی است.
 * همین باعث می‌شود شیتی که با نسخهٔ قدیمی‌تر ساخته شده، خودش به‌روز شود.
 */
var _tabsChecked = false;
function ensureAllTabs_(ss) {
  if (_tabsChecked) return;
  _tabsChecked = true;                     // پیش از کار، تا بازگشت بی‌نهایت رخ ندهد
  ensureTab_(ss, CFG.TAB_INDEX, INDEX_HEADERS);
  ensureTab_(ss, CFG.TAB_PODCASTS, PODCAST_HEADERS);
  ensureTab_(ss, CFG.TAB_LOG, ['زمان', 'رویداد']);
  ensurePronTab_(ss);
  ensureTab_(ss, CFG.CHUNK_TAB, CHUNK_HEADERS);
  ensureTab_(ss, CFG.SRC_ERR_TAB, SRC_ERR_HEADERS);
  ensureTab_(ss, CFG.PULSE_TAB, PULSE_HEADERS);
  ensureTab_(ss, CFG.REPORT_TAB, REPORT_HEADERS);
  ensureTab_(ss, CFG.SERIES_TAB, SERIES_HEADERS);
  ensureTab_(ss, CFG.SERIES_PART_TAB, SPART_HEADERS);
  ensureTab_(ss, CFG.SPECIAL_TAB, SPECIAL_HEADERS);
  for (var i = 0; i < TAXONOMY.length; i++) ensureTab_(ss, TAXONOMY[i].title, HUB_HEADERS);
  ensureTab_(ss, MISC_TITLE, HUB_HEADERS);
}

/** تب «تلفظ»: هر واژه‌ای که گوینده غلط خواند، اینجا اضافه کنید تا اصلاح شود. */
function ensurePronTab_(ss) {
  var existed = !!ss.getSheetByName(CFG.TAB_PRON);
  var sh = ensureTab_(ss, CFG.TAB_PRON, PRON_HEADERS);
  if (!existed) {
    sh.getRange(2, 1, PRON_SEED.length, 3).setValues(PRON_SEED);
    sh.getRange(PRON_SEED.length + 3, 1).setValue(
      'راهنما: ستون اول واژه‌ای که اشتباه خوانده می‌شود، ستون دوم همان واژه با اعراب یا ' +
      'املای آوایی درست، ستون سوم «بله» یا «خیر». پیش از ساخت هر پادکست اعمال می‌شود.');
    sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 320);
  }
  return sh;
}

// ------------------------------------------------------- نگاشت ستون‌های منبع

function normHeader_(h) {
  return String(h || '')
    .replace(/\(JSON\)/gi, '')
    .replace(/[‌‎‏]/g, '')
    .replace(/[^؀-ۿa-zA-Z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
}

/** پیدا کردن ایندکس ستون بر اساس نام سرستون؛ در صورت نیافتن، ایندکس پیش‌فرض. */
function findCol_(headers, needle, fallbackIdx) {
  var n = normHeader_(needle);
  for (var i = 0; i < headers.length; i++) {
    var h = normHeader_(headers[i]);
    if (h === n) return i;
  }
  for (var j = 0; j < headers.length; j++) {
    if (normHeader_(headers[j]).indexOf(n) !== -1) return j;
  }
  return fallbackIdx;
}

function videoMap_(headers) {
  return {
    date:    findCol_(headers, 'تاریخ پردازش', 0),
    fileId:  findCol_(headers, 'File ID', 1),
    link:    findCol_(headers, 'لینک دسترسی', 4),
    people:  findCol_(headers, 'اشخاص شناسایی شده', 5),
    body:    findCol_(headers, 'متن پیاده سازی شده', 8),
    vibe:    findCol_(headers, 'فضا و وایب', 9),
    expert:  findCol_(headers, 'تحلیل تخصصی', 10),
    content: findCol_(headers, 'تحلیل محتوا', 12),
    summary: findCol_(headers, 'خلاصه اجرایی', 16),
    status:  findCol_(headers, 'وضعیت', 17)
  };
}

function photoMap_(headers) {
  return {
    date:    findCol_(headers, 'تاریخ پردازش', 0),
    fileId:  findCol_(headers, 'File ID', 1),
    link:    findCol_(headers, 'لینک دسترسی', 4),
    text:    findCol_(headers, 'استخراج متن', 6),
    people:  findCol_(headers, 'اشخاص شناسایی شده', 7),
    content: findCol_(headers, 'تحلیل محتوا', 9),
    vibe:    findCol_(headers, 'فضا و وایب', 12),
    summary: findCol_(headers, 'خلاصه اجرایی', 13),
    special: findCol_(headers, 'موارد ویژه', 14),
    status:  findCol_(headers, 'وضعیت', 15)
  };
}

function jparse_(v) {
  if (v === null || v === undefined) return {};
  var s = String(v).trim();
  if (!s) return {};
  // JSON.parse('null') خودِ null برمی‌گرداند، نه شیء. بی این وارسی، سلولی که
  // فقط «null» در آن نوشته شده باعث TypeError می‌شد و چون خطا در حلقهٔ سینک
  // گرفته می‌شود، کلِ آن ردیف بی‌صدا دور ریخته می‌شد — با اینکه خلاصه و متنش سالم بود.
  try {
    var o = JSON.parse(s);
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

/**
 * تاریخ را به یک شکل واحد درمی‌آورد.
 * لازم است چون Google Sheets رشتهٔ تاریخ را هنگام نوشتن به مقدار Date تبدیل می‌کند؛
 * بدون این یکسان‌سازی، کلید یکتاییِ «شناسه + تاریخ» بین دو اجرا هرگز برابر نمی‌شد
 * و همه‌چیز دوباره اضافه می‌شد.
 */
function canonDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return '';
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    var p = function (x) { x = String(x); return x.length < 2 ? '0' + x : x; };
    return m[3] + '-' + p(m[1]) + '-' + p(m[2]) + ' ' + p(m[4]) + ':' + m[5] + ':' + (m[6] || '00');
  }
  return s;
}

/**
 * زمان را از سلول می‌خواند، چه رشته باشد چه مقدار Date.
 * (شیت رشتهٔ تاریخ را خودش به Date تبدیل می‌کند، پس هر دو حالت ممکن است.)
 */
/**
 * بازکردنِ شیتِ منبع با حافظهٔ کوچک در سطحِ همین اجرا.
 * SpreadsheetApp.openById برای شیت‌های بزرگ گران است و در یک اجرا ده‌ها بار
 * برای همان شناسه صدا زده می‌شود.
 */
var _ssCache = null;
function openCached_(id) {
  if (!_ssCache) _ssCache = Object.create(null);
  var k = String(id);
  if (!Object.prototype.hasOwnProperty.call(_ssCache, k)) {
    _ssCache[k] = SpreadsheetApp.openById(k);
  }
  return _ssCache[k];
}

function parseWhen_(v) {
  if (v instanceof Date) return v.getTime();
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return NaN;
  var t = Date.parse(s.replace(' ', 'T'));
  if (!isNaN(t)) return t;
  return Date.parse(s);
}

function cell_(row, idx) {
  if (idx === null || idx === undefined || idx < 0 || idx >= row.length) return '';
  var v = row[idx];
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
  return v === null || v === undefined ? '' : String(v);
}

// --------------------------------------------------------------- رکوردسازی

function buildVideoRec_(row, m) {
  var c = jparse_(cell_(row, m.content));
  var body = cell_(row, m.body);
  var rec = {
    kind: 'video',
    fileId: cell_(row, m.fileId),
    date: canonDate_(row[m.date]),
    link: cell_(row, m.link),
    rawLabel: c.Genre || '',
    topic: c.Main_Topic || '',
    keyMessage: c.Key_Message || '',
    body: body,
    vibe: cell_(row, m.vibe),
    summary: cell_(row, m.summary),
    status: cell_(row, m.status)
  };
  var cls = txClassify(rec.rawLabel, rec.topic, rec.keyMessage,
                       rec.summary + ' ' + rec.vibe + ' ' + cell_(row, m.expert));
  rec.cat = cls.title; rec.sub = cls.secondTitle;
  rec.score = txPriority(rec);
  return rec;
}

function buildPhotoRec_(row, m) {
  var c = jparse_(cell_(row, m.content));
  var t = jparse_(cell_(row, m.text));
  var rec = {
    kind: 'photo',
    fileId: cell_(row, m.fileId),
    date: canonDate_(row[m.date]),
    link: cell_(row, m.link),
    rawLabel: c.Category || '',
    topic: c.Main_Subject || '',
    keyMessage: c.Key_Message || '',
    body: t.Original_Text || t.Persian_Translation || '',
    vibe: cell_(row, m.vibe),
    summary: cell_(row, m.summary),
    status: cell_(row, m.status)
  };
  var cls = txClassify(rec.rawLabel, rec.topic, rec.keyMessage,
                       rec.summary + ' ' + rec.vibe + ' ' + (c.Notable_Elements || ''));
  rec.cat = cls.title; rec.sub = cls.secondTitle;
  rec.score = txPriority(rec);
  return rec;
}

function recToRow_(r) {
  return [r.fileId, kindLabel_(r.kind), r.date, r.sub || '',
          String(r.topic).slice(0, 600), String(r.keyMessage).slice(0, 900),
          String(r.summary).slice(0, 1800), String(r.body).slice(0, 1500),
          String(r.vibe).slice(0, 400), String(r.rawLabel).slice(0, 250),
          r.score, r.link, '', '', r.flag || '', '', nowStr_(), '',
          r.parts ? ('ترکیب ' + r.parts + ' قطعه' + (r.total ? ' از ' + r.total : '')) : '',
          // دو ستونِ نشانِ درس‌نامه: خالی متولد می‌شوند و فقط برنامهٔ تخصصی
          // پرشان می‌کند. طولِ ردیف باید دقیقاً با HUB_HEADERS جور باشد،
          // وگرنه setValues کلِ نوشتنِ آن دسته را رد می‌کند.
          '', ''];
}

/**
 * وضعیت در شیت‌های تازه فقط 'SUCCESS' نیست: قطعه‌ها 'CHUNK_7' و جمع‌بندی
 * 'COMPLETED' می‌گیرند و بعضی ردیف‌ها وضعیت خالی دارند. پس شرط، «نبودِ خطا»
 * است نه «بودنِ SUCCESS» — وگرنه هیچ ردیفی از این سه شیت پذیرفته نمی‌شد.
 */
function badStatus_(s) {
  var t = String(s || '').toUpperCase();
  return t.indexOf('ERROR') !== -1 || t.indexOf('FAIL') !== -1 ||
         t.indexOf('خطا') !== -1 || t.indexOf('ناموفق') !== -1;
}

/**
 * مکان‌نمای هر (منبع، تب). دو منبع اول کلید قدیمی خودشان را نگه می‌دارند تا
 * با ارتقای موتور، آرشیوِ همگام‌شده دوباره از صفر اسکن نشود.
 */
function srcCursorKey_(srcKey, tabName) {
  if (srcKey === 'video') return PK.CUR_VIDEO;
  if (srcKey === 'photo') return PK.CUR_PHOTO;
  // زیرخط و خط‌تیره حفظ می‌شوند تا دو تب با نام‌های نزدیک (Video_Analysis و
  // Video-Analysis) کلید یکسان نگیرند و مکان‌نمای هم را خراب نکنند.
  return PK.CUR_PREFIX + srcKey + '_' +
         String(tabName).replace(/[^0-9a-zA-Z_\-؀-ۿ ]/g, '').replace(/\s+/g, '·').slice(0, 60);
}

// ----------------------------------------------------------- حلقه اصلی سینک

/**
 * کلید یکتایی «شناسهٔ فایل + تاریخ پردازش» است، نه فقط شناسهٔ فایل.
 * دلیلش: در شیت منبعِ عکس، یک شناسهٔ فایل واحد برای چندین ردیفِ کاملاً متفاوت
 * تکرار شده است. اگر فقط با شناسه یکتاسازی می‌کردیم، بخش بزرگی از محتوا
 * بی‌سروصدا حذف می‌شد. با این کلید هیچ ردیفی گم نمی‌شود و در عوض
 * ردیف‌هایی که لینکشان مشترک است با پرچم مشخص می‌شوند.
 */
function loadSeen_(hub) {
  var seen = {}, idCount = {};
  var names = TAXONOMY.map(function (t) { return t.title; }).concat([MISC_TITLE]);
  for (var i = 0; i < names.length; i++) {
    var sh = hub.getSheetByName(names[i]);
    if (!sh) continue;
    var last = sh.getLastRow();
    if (last < 2) continue;
    var vals = sh.getRange(2, COL.ID, last - 1, COL.DATE - COL.ID + 1).getValues();
    for (var j = 0; j < vals.length; j++) {
      var id = vals[j][0], dt = canonDate_(vals[j][COL.DATE - COL.ID]);
      if (!id) continue;
      seen[String(id) + '|' + String(dt)] = true;
      idCount[String(id)] = (idCount[String(id)] || 0) + 1;
    }
  }
  return { seen: seen, idCount: idCount };
}

function syncCatalogContinue() { syncCatalog(); }

function syncCatalog() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { console.log('اجرای موازی؛ رد شد.'); return; }
  var t0 = new Date().getTime();

  try {
    var hub = getHub_();
    var st = loadSeen_(hub);
    var seen = st.seen, idCount = st.idCount;
    var ck = loadChunkKeys_(hub);
    var chunkKeys = ck.keys, chunkCnt = ck.counts;
    var buffers = {};      // نام تب -> آرایه ردیف‌ها
    var chunkBuf = [];     // ردیف‌های انبارِ قطعه‌ها
    var errBuf = [];       // ردیف‌هایی که خط لولهٔ منبع در آن‌ها خطا نوشته
    var errSeen = loadSrcErrKeys_(hub);   // یک خرابی، یک بار — نه یک بار به ازای هر ردیف
    var marks = {};        // کلید مکان‌نما -> ردیفی که هنوز ذخیره نشده
    var added = 0, scanned = 0, pending = 0, shared = 0, staged = 0, sampledOut = 0;
    var srcErrs = 0, srcErrRows = 0, more = false;
    var skippedTabs = [];

    /** یک رکوردِ آماده را در بافرِ دستهٔ خودش می‌گذارد. */
    var emit = function (rec, oncePerFile) {
      if (!rec || !rec.fileId) return false;
      if (oncePerFile) {
        if (idCount[rec.fileId]) return false;         // برای این فایل آیتم داریم
      } else {
        var key = rec.fileId + '|' + rec.date;
        if (seen[key]) return false;
        seen[key] = true;
        if (idCount[rec.fileId]) { rec.flag = FLAG_SHARED; shared++; }
      }
      idCount[rec.fileId] = (idCount[rec.fileId] || 0) + 1;
      var tab = rec.cat || MISC_TITLE;
      (buffers[tab] = buffers[tab] || []).push(recToRow_(rec));
      added++; pending++;
      return true;
    };

    for (var s = 0; s < CFG.SOURCES.length && !more; s++) {
      var src = CFG.SOURCES[s];
      var ss;
      try { ss = SpreadsheetApp.openById(src.id); }
      catch (eOpen) { logLine_('منبع «' + src.title + '» باز نشد: ' + eOpen.message); continue; }

      var legacy = (src.schema === 'legacy-video' || src.schema === 'legacy-photo');
      var tabs = legacy ? [ss.getSheets()[0]] : ss.getSheets();

      for (var ti = 0; ti < tabs.length && !more; ti++) {
        var sh = tabs[ti], tabName = sh.getName();
        var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
        if (lastRow < 2 || lastCol < 2) continue;

        var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
        var m, kind, chunked = false, batch = CFG.SYNC_CHUNK;

        if (src.schema === 'legacy-video') { m = videoMap_(headers); kind = 'legacy-video'; }
        else if (src.schema === 'legacy-photo') { m = photoMap_(headers); kind = 'legacy-photo'; }
        else {
          var det = srcDetect_(headers);
          if (!det) { skippedTabs.push(tabName); continue; }
          m = srcMap_(headers); kind = det.kind; chunked = det.chunked;
          batch = CFG.SYNC_CHUNK_WIDE;
        }

        var ckey = srcCursorKey_(src.key, tabName);
        var cursor = parseInt(props_().getProperty(ckey) || '1', 10);
        if (cursor >= lastRow) continue;

        while (cursor < lastRow) {
          if (new Date().getTime() - t0 > CFG.MAX_RUNTIME_MS) { more = true; break; }
          var n = Math.min(batch, lastRow - cursor);
          var vals = sh.getRange(cursor + 1, 1, n, lastCol).getValues();

          for (var r = 0; r < vals.length; r++) {
            scanned++;
            var rec;
            var srcRowNo = cursor + r + 1;      // شمارهٔ ردیف در خودِ شیت منبع
            var eHitSeen = false;

            // دیدبانیِ منبع: همین‌جا که ردیف در دست است، وارسی می‌شود که خط
            // لولهٔ شما در آن پیام خطا ننوشته باشد. شیت منبع فقط خوانده می‌شود.
            try {
              var eHit = srcErrorOf_(vals[r], m,
                           (m.status !== undefined && m.status >= 0) ? cell_(vals[r], m.status) : '');
              if (eHit) {
                var eid = (m.fileId !== undefined && m.fileId >= 0) ? cell_(vals[r], m.fileId) : '';
                srcErrRows++; eHitSeen = true;
                var ekey = srcErrKey_(src.title, tabName, eid, eHit.type, srcRowNo, nowStr_());
                if (!errSeen[ekey]) {
                  errSeen[ekey] = true;
                  errBuf.push([nowStr_(), src.title, tabName, srcRowNo, eid,
                               eHit.type, eHit.text, eid ? driveLink_(eid) : '']);
                  srcErrs++;
                }
              }
            } catch (eScan) { /* دیدبانی هرگز نباید همگام‌سازی را متوقف کند */ }

            if (kind === 'legacy-video' || kind === 'legacy-photo') {
              try {
                rec = (kind === 'legacy-video') ? buildVideoRec_(vals[r], m)
                                                : buildPhotoRec_(vals[r], m);
              } catch (e) { continue; }
              if (!rec.fileId) continue;
              // رفتار آزمودهٔ دو شیت اول دست‌نخورده می‌ماند
              if (rec.status && String(rec.status).toUpperCase().indexOf('SUCCESS') === -1) {
                // srcErrorOf_ ممکن است همین ردیف را شمرده باشد؛ دوباره نشمار
                if (!eHitSeen) srcErrRows++;
                var lkey = srcErrKey_(src.title, tabName, rec.fileId, 'وضعیت ناموفق',
                                      srcRowNo, nowStr_());
                if (!errSeen[lkey]) {
                  errSeen[lkey] = true;
                  errBuf.push([nowStr_(), src.title, tabName, srcRowNo, rec.fileId,
                               'وضعیت ناموفق', String(rec.status).slice(0, 300),
                               rec.link || driveLink_(rec.fileId)]);
                  srcErrs++;
                }
                continue;
              }
              emit(rec, false);
              continue;
            }

            try { rec = buildAutoRec_(vals[r], m, kind, src.hint); } catch (e2) { continue; }
            if (!rec.fileId) continue;
            if (badStatus_(rec.status)) continue;

            if (!chunked) { emit(classifyRec_(rec), false); continue; }

            // ---- تب‌های قطعه‌دار ----
            if (idCount[rec.fileId]) continue;          // آیتمِ این فایل ساخته شده
            var ci = chunkOf_(vals[r], m);

            if (ci.isChunk) {
              // اگر «شماره قطعه» خالی یا خراب بود، شمارهٔ ردیفِ منبع جایش
              // می‌نشیند. بدون این، همهٔ قطعه‌های آن فایل شمارهٔ یک می‌گرفتند،
              // کلیدشان یکی می‌شد و از قطعهٔ دوم به بعد بی‌صدا دور ریخته می‌شدند
              // — و چون مکان‌نما جلو می‌رود، هرگز دوباره خوانده نمی‌شدند.
              var cno = ci.no > 0 ? ci.no : (cursor + r + 1);
              var grp = chunkGroupKey_(src.key, tabName, rec.fileId);
              // سقف سختِ تعداد قطعه در هر فایل — حتی وقتی «تعداد کل قطعات» خالی است
              if ((chunkCnt[grp] || 0) >= (CFG.CHUNK_MAX_PER_FILE || 60)) { sampledOut++; continue; }
              // وقتی تعداد کل معلوم است، نمونه‌برداریِ یکنواخت از سراسرِ فایل
              if (ci.no > 0 && !chunkSampled_(cno, ci.total)) { sampledOut++; continue; }
              var gk = grp + '§' + cno;
              if (chunkKeys[gk]) continue;
              chunkKeys[gk] = true;
              chunkCnt[grp] = (chunkCnt[grp] || 0) + 1;
              chunkBuf.push(chunkRow_(src.key, tabName, rec, cno, ci.total));
              staged++;
              continue;
            }

            // ردیف جمع‌بندی (یا ردیفی که اصلاً قطعه نشده)
            if (isStubRollup_(rec)) {
              // فقط نشانگرِ «تمام شد» است؛ محتوا از قطعه‌ها ساخته می‌شود.
              var mk = chunkGroupKey_(src.key, tabName, rec.fileId) + '§0';
              if (!chunkKeys[mk]) {
                chunkKeys[mk] = true;
                chunkBuf.push(chunkRow_(src.key, tabName, rec, 0, ci.total));
              }
              continue;
            }
            emit(classifyRec_(rec), true);              // ردیف جمع‌بندیِ غنی
          }

          cursor += n;
          marks[ckey] = cursor;
          // مکان‌نما فقط بعد از نوشتنِ موفق ذخیره می‌شود. اگر برعکس بود و نوشتن
          // خطا می‌داد، آن ردیف‌ها هرگز دوباره خوانده نمی‌شدند.
          if (pending >= 300 || chunkBuf.length >= 200 || errBuf.length >= 100) {
            buffers = commit_(hub, buffers, marks, chunkBuf, errBuf);
            chunkBuf = []; errBuf = []; pending = 0;
          }
        }
      }
    }

    // بافر باید خالی شود؛ وگرنه نوشتنِ بعدی (پس از ترکیب قطعه‌ها) همان
    // ردیف‌ها را دوباره می‌نوشت و هر آیتمِ دستهٔ آخر دو بار می‌آمد.
    buffers = commit_(hub, buffers, marks, chunkBuf, errBuf);
    chunkBuf = []; errBuf = [];

    // ترکیبِ قطعه‌ها: هر فایلی که همهٔ قطعه‌هایش رسیده (یا جمع‌بندی‌اش آمده)
    // به یک آیتم واحد تبدیل می‌شود. اگر وقتِ این اجرا تمام شده، به اجرای
    // بعدی می‌ماند — قطعه‌ها در انبار محفوظند.
    var joined = 0;
    if (!more) {
      try {
        var asm = assembleChunks_(hub, idCount);
        for (var ai = 0; ai < asm.items.length; ai++) if (emit(asm.items[ai], true)) joined++;
        buffers = commit_(hub, buffers, marks, [], []);
        // فقط حالا که آیتم‌ها نوشته شده‌اند، قطعه‌هایشان از انبار برداشته می‌شوند
        purgeChunks_(hub, asm.keep);
        if (asm.pending) logLine_('قطعه‌های در انتظارِ تکمیل: ' + asm.pending + ' فایل.');
        if (asm.forced) logLine_('هشدار: ' + asm.forced + ' فایل بدون رسیدنِ ردیف جمع‌بندی و ' +
                                 'پس از ' + CFG.CHUNK_WAIT_HOURS + ' ساعت بی‌حرکتی، با قطعه‌های ' +
                                 'موجود ساخته شد — ممکن است ناقص باشد.');
      } catch (eAsm) { logLine_('ترکیب قطعه‌ها ناموفق: ' + eAsm.message); }
    }

    rebuildIndex_(hub);

    logLine_('سینک: ' + scanned + ' ردیف بررسی شد، ' + added + ' آیتم جدید افزوده شد' +
             (joined ? ' (' + joined + ' مورد از ترکیب قطعه‌ها)' : '') +
             (staged ? '، ' + staged + ' قطعه انبار شد' : '') +
             (sampledOut ? ' (' + sampledOut + ' قطعه از فایل‌های بسیار بزرگ نمونه‌برداری نشد)' : '') +
             (shared ? '، ' + shared + ' مورد با «تکرار پردازش» علامت خورد' : '') +
             (srcErrRows ? '، ' + srcErrRows + ' ردیفِ خطادار در شیت منبع دیده شد' +
                (srcErrs !== srcErrRows ? ' (' + srcErrs + ' خرابیِ یکتا ثبت شد)' : '') : '') + '.' +
             (more ? ' (ادامه دارد)' : ' (کامل)'));
    if (skippedTabs.length) {
      var uniqT = [];
      for (var u = 0; u < skippedTabs.length; u++)
        if (uniqT.indexOf(skippedTabs[u]) === -1) uniqT.push(skippedTabs[u]);
      logLine_('تب‌های بدون محتوای مستقل رد شدند: ' + uniqT.join('، '));
    }

    clearContinuation_();
    if (more) {
      ScriptApp.newTrigger('syncCatalogContinue').timeBased()
        .after(CFG.CONTINUE_DELAY_MIN * 60 * 1000).create();
    } else {
      // زمان‌بندی‌های لازم را وارسی کن. اگر قابلیتی تریگر نداشته باشد (مثلاً
      // «درس‌نامه» یا «پشتیبان» که در نسخه‌های بعدی اضافه شدند و کاربر «نصب
      // زمان‌بندی» را دوباره نزده باشد)، همین‌جا خودش نصب می‌شود — وگرنه آن
      // قابلیت در سکوتِ کامل هرگز اجرا نمی‌شود.
      try { ensureScheduledTriggers_(); } catch (eTg) {}
      // آرشیو به‌روز است؛ فرصت خوبی است برای وارسی قسمت‌های نیمه‌تمام
      try { resumeStalledEpisode_(); } catch (e) {}
      try { resumeStalledSpecial_(); } catch (e) {}
      // رجیستری مجموعه‌های آموزشی را تازه کن (خودش هر چند ساعت یک‌بار کار می‌کند)
      try { scanSeries(false); } catch (e) { logLine_('اسکن مجموعه‌ها ناموفق: ' + e.message); }
      // گزارش‌های تازهٔ ناظر را بردار و نسخهٔ کد را بسنج.
      // مهلت می‌دهیم: این‌جا انتهای یک اجرای طولانی است و هشدارهای تلگرام
      // می‌توانند دقیقه‌ها طول بکشند؛ بی مهلت، وارسیِ نسخهٔ کد و فایل وضعیت
      // که بعدش می‌آیند هرگز اجرا نمی‌شدند.
      var repDeadline = new Date().getTime() +
        Math.max(20000, Math.min(90000, CFG.MAX_RUNTIME_MS + 60000 - (new Date().getTime() - t0)));
      try { ingestReports_(hub, repDeadline); }
      catch (e) { logLine_('برداشت گزارش‌ها ناموفق: ' + e.message); }
      try { checkCodeUpdate_(hub); } catch (e) {}
      try { writeStatus_(hub, 'همگام‌سازی کامل شد'); } catch (e) {}
    }
  } catch (err) {
    logLine_('خطای سینک: ' + err.message);
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function flushBuffers_(hub, buffers) {
  for (var tab in buffers) {
    if (!buffers.hasOwnProperty(tab)) continue;
    var rows = buffers[tab];
    if (!rows.length) continue;
    var sh = ensureTab_(hub, tab, HUB_HEADERS);
    var start = sh.getLastRow() + 1;
    // شیت تازه فقط ۱۰۰۰ ردیف دارد و getRange خودش شبکه را بزرگ نمی‌کند؛
    // بدون این خط، اولین دسته‌ای که از هزار ردیف بگذرد خطا می‌دهد.
    var need = (start + rows.length - 1) - sh.getMaxRows();
    if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
    sh.getRange(start, 1, rows.length, HUB_HEADERS.length).setValues(rows);
  }
}

/** ردیف‌های انبارِ قطعه‌ها را اضافه می‌کند (شیت منبع دست‌نخورده می‌ماند). */
function flushChunks_(hub, rows) {
  if (!rows || !rows.length) return;
  var sh = ensureTab_(hub, CFG.CHUNK_TAB, CHUNK_HEADERS);
  var start = sh.getLastRow() + 1;
  var need = (start + rows.length - 1) - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
  sh.getRange(start, 1, rows.length, CHUNK_HEADERS.length).setValues(rows);
}

/** ردیف‌ها را می‌نویسد و تنها در صورت موفقیت مکان‌نماها را ذخیره می‌کند. */
function commit_(hub, buffers, marks, chunkRows, errRows) {
  flushBuffers_(hub, buffers);
  flushChunks_(hub, chunkRows);
  try { flushSrcErrors_(hub, errRows); } catch (e) { console.log('ثبت خطای منبع نشد: ' + e.message); }
  for (var k in marks) {
    if (marks.hasOwnProperty(k)) props_().setProperty(k, String(marks[k]));
  }
  for (var k2 in marks) if (marks.hasOwnProperty(k2)) delete marks[k2];
  return {};
}

function clearContinuation_() {
  var ts = ScriptApp.getProjectTriggers();
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'syncCatalogContinue') ScriptApp.deleteTrigger(ts[i]);
  }
}

// ------------------------------------------------------------------ داشبورد

/**
 * بازسازی داشبورد.
 * فقط ستون‌های باریک خوانده می‌شوند (نوع، تاریخ، امتیاز تا تاریخ‌افزوده‌شدن).
 * خواندنِ همهٔ هفده ستون — که شامل خلاصه‌های هزار‌و‌هشتصد نویسه‌ای است —
 * روی آرشیو چهل‌ودو هزارتایی از سقف شش‌دقیقه‌ای رد می‌شد.
 */
function rebuildIndex_(hub) {
  hub = hub || getHub_();
  var sh = ensureTab_(hub, CFG.TAB_INDEX, INDEX_HEADERS);
  var names = TAXONOMY.map(function (t) { return t.title; }).concat([MISC_TITLE]);
  var out = [], totU = 0, totF = 0, totE = 0, totFresh = 0, totAll = 0;
  var totK = { 'ویدیو': 0, 'عکس': 0, 'صدا': 0, 'سند': 0 };
  var url = hub.getUrl();
  var now = new Date().getTime();
  var W = COL.ADDED - COL.SCORE + 1;
  var IX_USED = COL.USED_EP - COL.SCORE, IX_REJ = COL.REJECT - COL.SCORE,
      IX_ADD = COL.ADDED - COL.SCORE;

  for (var i = 0; i < names.length; i++) {
    var t = hub.getSheetByName(names[i]);
    if (!t) continue;
    var last = t.getLastRow();
    if (last < 2) { out.push([names[i], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '']); continue; }
    var n = last - 1;
    var head = t.getRange(2, COL.KIND, n, 2).getValues();        // نوع، تاریخ منبع
    var meta = t.getRange(2, COL.SCORE, n, W).getValues();       // امتیاز … تاریخ افزوده‌شدن

    var byK = { 'ویدیو': 0, 'عکس': 0, 'صدا': 0, 'سند': 0 };
    var used = 0, sum = 0, flagged = 0, elig = 0, fresh = 0;
    for (var j = 0; j < n; j++) {
      var k = String(head[j][0] || '');
      if (byK[k] === undefined) k = 'عکس';        // نوعِ ناشناخته را مثل عکس بشمار
      byK[k]++;
      var score = Number(meta[j][0]) || 0;
      sum += score;
      if (meta[j][COL.FLAG - COL.SCORE]) flagged++;
      if (meta[j][IX_USED]) { used++; continue; }
      if ((Number(meta[j][IX_REJ]) || 0) >= CFG.MAX_REJECTIONS) continue;
      if (score < floorFor_(k, CFG.MIN_PRIORITY)) continue;
      elig++;
      // تاریخِ افزوده‌شدن؛ اگر خالی بود (ردیف‌های نسخه‌های قبل) از تاریخ منبع استفاده کن
      var when = parseWhen_(meta[j][IX_ADD]);
      if (isNaN(when)) when = parseWhen_(head[j][1]);
      if (!isNaN(when) && (now - when) / 86400000 <= CFG.FRESH_WINDOW_DAYS) fresh++;
    }
    for (var kk in byK) if (byK.hasOwnProperty(kk)) totK[kk] += byK[kk];
    totU += used; totF += flagged; totE += elig; totFresh += fresh; totAll += n;
    out.push([names[i], byK['ویدیو'], byK['عکس'], byK['صدا'], byK['سند'], n,
              used, n - used, elig, fresh, Math.round(sum / n), flagged,
              '=HYPERLINK("' + url + '#gid=' + t.getSheetId() + '","باز کردن")']);
  }
  out.push(['— جمع کل —', totK['ویدیو'], totK['عکس'], totK['صدا'], totK['سند'],
            totAll, totU, totAll - totU, totE, totFresh, '', totF, '']);

  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, INDEX_HEADERS.length).clearContent();
  if (out.length) sh.getRange(2, 1, out.length, INDEX_HEADERS.length).setValues(out);

  var bl = chunkBacklog_(hub);
  var stamp = 'آخرین به‌روزرسانی: ' + nowStr_() +
              (bl.files ? '   |   قطعه‌های در انتظار ترکیب: ' + bl.rows +
                          ' قطعه از ' + bl.files + ' فایل' : '');
  sh.getRange(out.length + 3, 1).setValue(stamp);
  sh.autoResizeColumns(1, 6);
  return { videos: totK['ویدیو'], photos: totK['عکس'],
           audio: totK['صدا'], docs: totK['سند'], used: totU };
}

/** پاک‌سازی کامل و ساخت دوباره از صفر (فقط در صورت نیاز) */
function fullRebuild() {
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  if (ui) {
    var r = ui.alert('ساخت دوباره کامل',
      'همه تب‌های دسته در CONTENT-HUB خالی و از نو ساخته می‌شوند.\n' +
      'شیت‌های منبع دست‌نخورده می‌مانند. ادامه می‌دهید؟', ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
  }
  var hub = getHub_();
  var names = TAXONOMY.map(function (t) { return t.title; }).concat([MISC_TITLE]);
  for (var i = 0; i < names.length; i++) {
    var sh = hub.getSheetByName(names[i]);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, HUB_HEADERS.length).clearContent();
    }
  }
  var ch = hub.getSheetByName(CFG.CHUNK_TAB);
  if (ch && ch.getLastRow() > 1) {
    ch.getRange(2, 1, ch.getLastRow() - 1, CHUNK_HEADERS.length).clearContent();
  }
  // همهٔ مکان‌نماها پاک می‌شوند — هم دو کلید قدیمی، هم کلیدهای هر (منبع، تب)
  var all = props_().getProperties();
  for (var k in all) {
    if (!all.hasOwnProperty(k)) continue;
    if (k === PK.CUR_VIDEO || k === PK.CUR_PHOTO || k.indexOf(PK.CUR_PREFIX) === 0) {
      props_().deleteProperty(k);
    }
  }
  logLine_('ساخت دوباره کامل آغاز شد.');
  syncCatalog();
}
