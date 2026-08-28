/**
 * 15_Board.gs — تختهٔ مجموعه‌های آموزشی
 *
 * یک پنجرهٔ تصویری که از منوی خودِ شیت باز می‌شود و سه کار می‌کند:
 *   ۱) مجموعه‌ها را ذیل دستهٔ مرتبطشان فهرست می‌کند، به همان ترتیبِ اولویت
 *      (مقدماتی ← پیشرفته) که برنامهٔ درسی تعیین کرده.
 *   ۲) پیشرفت را نشان می‌دهد: نمودار دایره‌ای برای کلِ کار و نمودار میله‌ای
 *      برای هر مجموعه — چند درصدِ قطعه‌هایش به پادکست تبدیل شده.
 *   ۳) اجازه می‌دهد یک مجموعه یا یک دسته را دستی انتخاب کنید («سنجاق»). از آن
 *      لحظه موتور روی همان کار می‌کند و به ترتیب جلو می‌رود؛ همین که تمامش کرد،
 *      سنجاق خودش برداشته می‌شود و موتور به مجموعه‌ای که قبلاً نیمه‌کاره
 *      گذاشته بود برمی‌گردد — مگر شما دوباره چیز دیگری سنجاق کنید.
 *
 * نمودارها SVG‌ی خالص‌اند و در همان اسکریپت ساخته می‌شوند؛ هیچ کتابخانه یا
 * منبع بیرونی لازم نیست (که در پنجره‌های Apps Script هم مسدود است).
 */

// ------------------------------------------------------------ داده

/**
 * وضعیتِ کاملِ همهٔ مجموعه‌ها، گروه‌شده بر اساس دسته و مرتب بر اساس اولویت.
 * همین ساختار هم به پنجره می‌رود و هم در آزمون‌ها سنجیده می‌شود.
 */
function seriesBoardData_(hub) {
  hub = hub || getHub_();
  var reg = readSeriesReg_(hub);
  var parts = readSeriesParts_(hub);
  var pin = seriesPin_();
  var current = null, planInfo = { pinExhausted: false };
  try {
    planInfo = pickSeriesPlan_(hub, reg, parts);
    current = planInfo.rec;
  } catch (e) { current = null; planInfo = { pinExhausted: false }; }
  var curKey = current ? current.key : '';

  // نقشه‌ها باید بی‌نیا باشند: سلولی که مقدارش «constructor» یا «toString» است
  // در شیءِ سادهٔ جاوااسکریپت «موجود» به نظر می‌رسد و کلِ تخته را می‌شکست.
  var levelRank = Object.create(null);
  levelRank['مقدماتی'] = 0; levelRank['میانی'] = 1; levelRank['پیشرفته'] = 2;
  var lvRank = function (x) {
    return Object.prototype.hasOwnProperty.call(levelRank, x) ? levelRank[x] : 1;
  };
  /* بخشِ ۲۶ جلوتر از این است، پس try/catch: در فایلِ سرِهم‌شده hoisting
     نجاتش می‌دهد، ولی بارگذارِ جزئیِ آزمون‌ها با ReferenceError می‌شکند و
     نباید کلِ تخته را زمین بزند. */
  var hoMap = Object.create(null), hoDue = Object.create(null);
  try { hoMap = handoutBoardMap_(hub); } catch (eH) {}
  try { hoDue = handoutDueByKey_(); } catch (eH2) {}
  /* و مرورِ بزرگ — بخشِ ۳۰، باز هم جلوتر، باز هم try/catch. رجیستری همین‌جا
     خوانده شده، پس دوباره خوانده نمی‌شود. */
  var rcMap = Object.create(null);
  try { rcMap = recapBoardMap_(hub, reg); } catch (eR) {}
  /* وارسیِ ترتیب — همان‌جایی که مجموعه انتخاب می‌شود. هشداری که در ایمیل
     بماند و کنارِ دکمهٔ «کار روی این» نباشد، سرِ بزنگاه دیده نمی‌شود. */
  var ordMap = Object.create(null);
  try {
    var ordAll = seriesOrderCheck_(hub, reg, parts);
    for (var oi = 0; oi < (ordAll.series || []).length; oi++) {
      ordMap[ordAll.series[oi].key] = ordAll.series[oi];
    }
  } catch (eO) {}

  var rows = [];
  for (var i = 0; i < reg.rows.length; i++) {
    var v = reg.rows[i].vals;
    var key = reg.rows[i].key;
    var list = parts.byKey[key] || [];
    var totChunks = 0, doneChunks = 0, donePartsN = 0, partRows = [];
    for (var p = 0; p < list.length; p++) {
      var pv = list[p].vals;
      var n = Number(pv[SP.CHUNKS - 1]) || 0;
      // مکان‌نما می‌تواند کسری باشد (قطعهٔ نیمه‌برش‌خورده)
      var d = Math.min(n, Math.max(0, Number(pv[SP.DONE_TO - 1]) || 0));
      totChunks += n; doneChunks += d;
      if (n > 0 && d >= n) donePartsN++;
      partRows.push({ file: String(pv[SP.FILE - 1] || ''),
                      name: String(pv[SP.NAME - 1] || ''),
                      seq: Number(pv[SP.SEQ - 1]) || 0,
                      chunks: n, done: d,
                      pct: n ? Math.round((d / n) * 100) : 0,
                      episodes: String(pv[SP.EPISODES - 1] || '').trim(),
                      link: String(pv[SP.LINK - 1] || '') });
    }
    partRows.sort(function (a, b) { return a.seq - b.seq || (a.name < b.name ? -1 : 1); });
    var st = String(v[SC.STATUS - 1] || SST.NEW);
    // ستون می‌تواند یک تاریخِ چسبیده داشته باشد؛ شمردنِ واژه‌ها ۲۲ می‌داد
    // جایی که ۱۳ شماره بود. (توضیحِ کامل کنارِ epNumsOf_ در بخشِ ۱۳.)
    var epList = epNumsOf_(v[SC.EPISODES - 1]);
    rows.push({
      key: key,
      name: String(v[SC.NAME - 1] || key),
      cat: seriesCatOf_(v),
      level: String(v[SC.LEVEL - 1] || '').trim(),
      levelRank: lvRank(String(v[SC.LEVEL - 1] || '').trim()),
      topic: String(v[SC.TOPIC - 1] || ''),
      order: Number(v[SC.ORDER - 1]) || 999,
      // ── تنظیمِ دستیِ شما ──
      morder: isFinite(seriesMOrder_(v)) ? seriesMOrder_(v) : null,
      mcat: String(v[SC.MCAT - 1] || '').trim(),
      msub: seriesSubOf_(v),
      locked: seriesManualLock_(v),
      status: st,
      kind: String(v[SC.KIND - 1] || ''),
      src: String(v[SC.SRC - 1] || ''),
      parts: Number(v[SC.PARTS - 1]) || list.length,
      donePartsN: donePartsN,
      chunks: totChunks || (Number(v[SC.CHUNKS - 1]) || 0),
      doneChunks: doneChunks,
      pct: totChunks ? Math.round((doneChunks / totChunks) * 100)
                     : (st === SST.DONE ? 100 : 0),
      episodes: epList.length,
      lastEpAt: String(v[SC.LAST_EP_AT - 1] || ''),
      note: String(v[SC.NOTE - 1] || ''),
      related: String(v[SC.RELATED - 1] || ''),
      isCurrent: key === curKey,
      isPinned: !!(pin && pin.kind === 'series' && pin.value === key),
      // ── داوریِ محتوایی ──
      about: String(v[SC.ABOUT - 1] || '').trim(),
      why: String(v[SC.WHY - 1] || '').trim(),
      cscore: Number(v[SC.CSCORE - 1]) || 0,
      judgedAt: String(v[SC.JUDGED - 1] || '').trim(),
      manual: String(v[SC.MANUAL - 1] || '').trim(),
      isCourse: seriesIsCourse_(v),                  // true / false / null
      // داوریِ بی‌مدل: در تخته صریح گفته می‌شود که این تصمیم از قاعده‌های خودیِ
      // موتور آمده، نه از مدل — تا حرفِ ماشین با حرفِ مدل قاتی نشود.
      byRule: String(v[SC.WHY - 1] || '').indexOf(JUDGE_LOCAL_MARK) !== -1,
      unsure: String(v[SC.IS_COURSE - 1] || '') === SJ.UNSURE &&
              !String(v[SC.MANUAL - 1] || '').trim(),
      // «کارِ ناتمام دارد؟» — دکمهٔ انتخاب بر همین تکیه می‌کند، نه بر درصد.
      // ردیفِ «نادیده گرفته شد» هرگز نوبت تولید نمی‌گیرد، پس هرچقدر هم قطعهٔ
      // نساخته داشته باشد، انتخابش بی‌اثر است و دکمه‌اش باید خاموش باشد؛ وگرنه
      // کاربر انتخاب می‌کرد، بنر می‌گفت «فعال است» و موتور چیز دیگری می‌ساخت.
      // حالِ جزوه — از تبِ «کاربردِ جزوه»، یک خواندن برای کلِ تخته
      handout: hoMap[key] || null,
      handoutDue: hoDue[key] || 0,
      recap: rcMap[key] || null,
      /* `orderWarn` و نه `order`: ردیفِ تخته از قبل کلیدِ `order` دارد —
         رتبهٔ اولویت، یک عدد. نشستنِ یک شیء رویش هیچ خطایی نمی‌داد و فقط
         مرتب‌سازیِ تخته را بی‌صدا خراب می‌کرد. */
      orderWarn: ordMap[key] || null,
      hasWork: (function () {
        if (st === SST.SKIPPED) return false;
        for (var w = 0; w < partRows.length; w++) {
          if (!partRows[w].chunks) return true;
          if (partRows[w].done < partRows[w].chunks) return true;
        }
        return false;
      })(),
      partRows: partRows
    });
  }

  // ── جدا کردنِ «آموزشی» از «آموزشی نیست» ──
  // خواستهٔ صریح: چیزی که آموزشی نیست نباید در فهرستِ انتخاب قاطی شود، ولی دور
  // هم ریخته نشود؛ پایین با دلیلش دیده می‌شود و می‌توان دستی نظر را عوض کرد.
  var excluded = [];
  var live = [];
  for (var e0 = 0; e0 < rows.length; e0++) {
    // مجموعه‌ای که خودتان انتخابش کرده‌اید هرگز به بخشِ کنارگذاشته‌ها نمی‌رود:
    // انتخابِ دستیِ شما بالاتر از داوری است و همان لحظه هم تولید می‌شود، پس
    // دیدنش در فهرستِ «آموزشی نیست» فقط گیج‌کننده بود.
    // ردیفِ قفل‌شده با تنظیمِ دستی هم مثل سنجاق‌شده در فهرستِ زنده می‌ماند:
    // موتور می‌سازدش (قفل یعنی واجدِ شرط)، پس نمایشش در «آموزشی نیست» تناقضِ
    // روی یک صفحه بود. یک استثنا: «آموزشی نیست»ِ دستیِ خودِ شما (SMAN.NO) از
    // قفل هم بالاتر است — همان‌طور که در seriesEligible_ هم وتوی شماست.
    var vetoed = rows[e0].manual === SMAN.NO;
    if (rows[e0].isCourse === false && !rows[e0].isPinned &&
        (!rows[e0].locked || vetoed)) {
      excluded.push(rows[e0]);
    } else live.push(rows[e0]);
  }
  excluded.sort(function (a, b) {
    if (a.cscore !== b.cscore) return b.cscore - a.cscore;
    return a.name < b.name ? -1 : 1;
  });

  // گروه‌بندی بر اساس دسته، و درونِ هر دسته ترتیبِ اولویت
  var byCat = Object.create(null), catOrder = [];
  for (var r = 0; r < live.length; r++) {
    var c = live[r].cat;
    if (!byCat[c]) { byCat[c] = []; catOrder.push(c); }
    byCat[c].push(live[r]);
  }
  var groups = [];
  for (var g = 0; g < catOrder.length; g++) {
    var arr = byCat[catOrder[g]];
    arr.sort(function (a, b) {
      // «در حال تولید» همیشه بالای دسته، بعد شمارهٔ دستیِ شما، بعد ترتیبِ
      // برنامهٔ درسی، بعد سطح
      var ra = a.status === SST.ACTIVE ? 0 : 1, rb = b.status === SST.ACTIVE ? 0 : 1;
      if (ra !== rb) return ra - rb;
      var ma = a.morder !== null ? a.morder - 1000000 : a.order;
      var mb = b.morder !== null ? b.morder - 1000000 : b.order;
      if (ma !== mb) return ma - mb;
      if (a.levelRank !== b.levelRank) return a.levelRank - b.levelRank;
      return a.name < b.name ? -1 : 1;
    });
    var tc = 0, dc = 0, eps = 0;
    for (var q = 0; q < arr.length; q++) { tc += arr[q].chunks; dc += arr[q].doneChunks;
                                          eps += arr[q].episodes; }
    groups.push({
      cat: catOrder[g], series: arr,
      chunks: tc, doneChunks: dc, episodes: eps,
      pct: tc ? Math.round((dc / tc) * 100) : 0,
      // کم‌ترین اولویتِ واقعیِ دسته، نه اولویتِ ردیفِ اول. ردیفِ اول بعد از
      // مرتب‌سازیِ «در حال تولید اول» می‌آید، پس می‌توانست اولویت ۵۰ باشد در
      // حالی که همان دسته مجموعهٔ اولویت ۱ هم داشت — و ترتیبِ دسته‌ها برعکس شود.
      minOrder: (function () {
        var m = 999;
        for (var z = 0; z < arr.length; z++) {
          var o = arr[z].morder !== null ? arr[z].morder - 1000000 : arr[z].order;
          if (o < m) m = o;
        }
        return m;
      })(),
      // مقدماتی‌ترین سطح و بهترین امتیازِ داوری در این دسته — برای مرتب‌کردنِ
      // خودِ دسته‌ها وقتی همه‌شان مجموعهٔ شمارهٔ ۱ دارند.
      minLevel: (function () {
        var m = 9;
        for (var z2 = 0; z2 < arr.length; z2++) if (arr[z2].levelRank < m) m = arr[z2].levelRank;
        return m;
      })(),
      bestScore: (function () {
        var m = 0;
        for (var z3 = 0; z3 < arr.length; z3++) if (arr[z3].cscore > m) m = arr[z3].cscore;
        return m;
      })(),
      hasWork: arr.some(function (x) { return x.hasWork; }),
      pinned: !!(pin && pin.kind === 'cat' && pin.value === catOrder[g]),
      hasCurrent: arr.some(function (x) { return x.isCurrent; })
    });
  }
  // دسته‌ای که موتور الان در آن کار می‌کند اول می‌آید، بعد بر پایهٔ اولویت
  groups.sort(function (a, b) {
    if (a.hasCurrent !== b.hasCurrent) return a.hasCurrent ? -1 : 1;
    if (a.minOrder !== b.minOrder) return a.minOrder - b.minOrder;
    if (a.minLevel !== b.minLevel) return a.minLevel - b.minLevel;
    if (a.bestScore !== b.bestScore) return b.bestScore - a.bestScore;
    return a.cat < b.cat ? -1 : 1;
  });

  var tot = { series: rows.length, done: 0, active: 0, queued: 0, reopened: 0, skipped: 0,
              chunks: 0, doneChunks: 0, episodes: 0 };
  for (var t = 0; t < rows.length; t++) {
    var x = rows[t];
    if (x.status === SST.DONE) tot.done++;
    else if (x.status === SST.ACTIVE) tot.active++;
    else if (x.status === SST.REOPENED) tot.reopened++;
    else if (x.status === SST.SKIPPED) tot.skipped++;
    else tot.queued++;
    tot.chunks += x.chunks; tot.doneChunks += x.doneChunks; tot.episodes += x.episodes;
  }
  tot.pct = tot.chunks ? Math.round((tot.doneChunks / tot.chunks) * 100) : 0;

  var spEps = 0;
  try {
    var sh = hub.getSheetByName(CFG.SPECIAL_TAB);
    if (sh && sh.getLastRow() >= 2) spEps = sh.getLastRow() - 1;
  } catch (eS) {}

  // نامِ خواندنیِ انتخاب دستی (نه کلیدِ درونی) — برای نمایش در پنجره و در هشدارها
  var pinShow = pin ? { kind: pin.kind, value: String(pin.value || ''),
                        name: pinLabel_(hub, pin, reg), at: pin.at || '',
                        // کارِ سنجاق تمام شده و در اجرای بعد خودش برداشته می‌شود.
                        // بی این نشان، بنر می‌گفت «موتور سراغ چیز دیگری نمی‌رود» و
                        // درست زیرش می‌نوشت «الان روی این کار می‌شود: مجموعهٔ دیگر».
                        exhausted: !!planInfo.pinExhausted } : null;

  var jsum = { course: 0, notCourse: excluded.length, unjudged: 0, unsure: 0, byRule: 0 };
  for (var jj = 0; jj < live.length; jj++) {
    // «مشکوک» داوری شده است، فقط قطعی نیست. شمردنش در «داوری‌نشده» باعث می‌شد
    // بنرِ بالای تخته بگوید هیچ‌کاری انجام نشده.
    if (live[jj].unsure) jsum.unsure++;
    else if (live[jj].isCourse === null) jsum.unjudged++;
    else jsum.course++;
    if (live[jj].byRule) jsum.byRule++;
  }
  for (var jx = 0; jx < excluded.length; jx++) if (excluded[jx].byRule) jsum.byRule++;

  return {
    groups: groups, totals: tot, pin: pinShow,
    excluded: excluded, judge: jsum,
    judgedAt: String(props_().getProperty(PK.JUDGE_AT) || ''),
    current: current ? { key: curKey, name: String(current.vals[SC.NAME - 1] || curKey),
                         cat: String(current.vals[SC.CAT - 1] || MISC_TITLE),
                         status: String(current.vals[SC.STATUS - 1] || '') } : null,
    scannedAt: String(props_().getProperty(PK.SERIES_SCAN_AT) || ''),
    rescanHours: CFG.SERIES_RESCAN_HOURS,
    version: String(CFG.CODE_VERSION || ''),
    episodesMade: spEps,
    enabled: !!CFG.SPECIAL_ENABLED,
    specialHour: CFG.SPECIAL_HOUR,
    now: nowStr_()
  };
}

// ------------------------------------------------------------ نمودارها

function bEsc_(s) {
  // نویسهٔ سطر تازه هم باید کدگذاری شود: مرورگر داخلِ attribute، CR را به LF
  // تبدیل می‌کند و آن‌وقت رشته‌ای که از data-key برمی‌گردد دیگر با کلیدِ واقعی
  // یکی نیست — دکمه برای همیشه بی‌اثر می‌ماند.
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\r/g, '&#13;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');
}

/** حلقهٔ دایره‌ای پیشرفت: چند درصدِ کلِ قطعه‌های آموزشی به پادکست تبدیل شده. */
function donutSvg_(pct, label, sub) {
  var R = 54, C = 2 * Math.PI * R;
  var p = Number(pct);
  if (!isFinite(p)) p = 0;
  var on = Math.max(0, Math.min(100, p)) / 100 * C;
  return '' +
    '<svg viewBox="0 0 140 140" width="140" height="140" role="img">' +
    '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#e6e9f0" stroke-width="16"/>' +
    '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#2e5cb8" stroke-width="16"' +
    ' stroke-linecap="round" stroke-dasharray="' + on.toFixed(1) + ' ' + (C - on).toFixed(1) + '"' +
    ' transform="rotate(-90 70 70)"/>' +
    '<text x="70" y="66" text-anchor="middle" font-size="26" font-weight="bold" fill="#1f3864">' +
    faNum_(Math.round(p)) + '٪</text>' +
    '<text x="70" y="88" text-anchor="middle" font-size="11" fill="#5a6478">' +
    bEsc_(label) + '</text>' +
    (sub ? '<text x="70" y="104" text-anchor="middle" font-size="10" fill="#8a93a5">' +
           bEsc_(sub) + '</text>' : '') +
    '</svg>';
}

/** دایرهٔ سهم‌بندیِ وضعیت مجموعه‌ها (تمام‌شده / در حال تولید / در نوبت / …). */
function pieSvg_(slices) {
  var total = 0, i;
  for (i = 0; i < slices.length; i++) {
    var sv = Number(slices[i].n);
    if (isFinite(sv) && sv > 0) total += sv;
  }
  if (!total) {
    return '<svg viewBox="0 0 140 140" width="140" height="140">' +
           '<circle cx="70" cy="70" r="54" fill="#e6e9f0"/></svg>';
  }
  var out = ['<svg viewBox="0 0 140 140" width="140" height="140" role="img">'];
  var a0 = -Math.PI / 2;
  for (i = 0; i < slices.length; i++) {
    var sn = Number(slices[i].n);
    if (!isFinite(sn) || sn <= 0) continue;
    var frac = sn / total;
    var a1 = a0 + frac * 2 * Math.PI;
    if (frac >= 0.9999) {
      out.push('<circle cx="70" cy="70" r="54" fill="' + slices[i].color + '"/>');
      break;
    }
    var x0 = (70 + 54 * Math.cos(a0)).toFixed(2), y0 = (70 + 54 * Math.sin(a0)).toFixed(2);
    var x1 = (70 + 54 * Math.cos(a1)).toFixed(2), y1 = (70 + 54 * Math.sin(a1)).toFixed(2);
    out.push('<path d="M70,70 L' + x0 + ',' + y0 + ' A54,54 0 ' +
             (frac > 0.5 ? 1 : 0) + ',1 ' + x1 + ',' + y1 + ' Z" fill="' + slices[i].color +
             '"><title>' + bEsc_(slices[i].label + ': ' + slices[i].n) + '</title></path>');
    a0 = a1;
  }
  out.push('<circle cx="70" cy="70" r="26" fill="#fff"/>');
  out.push('</svg>');
  return out.join('');
}

/** میلهٔ افقیِ پیشرفتِ یک مجموعه. */
function barSvg_(pct, w, color) {
  w = Number(w) || 150;
  var p = Number(pct);
  if (!isFinite(p)) p = 0;
  var on = Math.max(0, Math.min(100, p)) / 100 * w;
  return '<svg viewBox="0 0 ' + w + ' 12" width="' + w + '" height="12" role="img">' +
         '<rect x="0" y="2" width="' + w + '" height="8" rx="4" fill="#e6e9f0"/>' +
         (on > 0 ? '<rect x="0" y="2" width="' + on.toFixed(1) + '" height="8" rx="4" fill="' +
                   (color || '#2e5cb8') + '"/>' : '') +
         '</svg>';
}

/** رقم فارسی، برای اینکه اعداد پنجره با بقیهٔ برنامه یکدست باشند. */
function faNum_(n) {
  var d = '۰۱۲۳۴۵۶۷۸۹';
  var v = (n === null || n === undefined || (typeof n === 'number' && !isFinite(n))) ? 0 : n;
  return String(v).replace(/[0-9]/g, function (c) { return d.charAt(Number(c)); });
}

// ------------------------------------------------------------ پنجره

var BOARD_CSS =
  'body{font-family:Tahoma,"Segoe UI",Arial,sans-serif;direction:rtl;text-align:right;' +
  'background:#f4f6fa;color:#1a2233;margin:0;padding:14px;line-height:1.7;font-size:13px}' +
  '.hd{background:linear-gradient(135deg,#1f3864,#2e5cb8);color:#fff;border-radius:12px;' +
  'padding:14px 18px;margin-bottom:12px}' +
  '.hd h1{margin:0 0 4px;font-size:17px}.hd .s{opacity:.85;font-size:12px}' +
  '.card{background:#fff;border-radius:12px;padding:14px 16px;margin-bottom:12px;' +
  'box-shadow:0 1px 6px rgba(20,30,60,.07)}' +
  '.row{display:flex;gap:14px;align-items:center;flex-wrap:wrap}' +
  '.tile{flex:1;min-width:96px;background:#f7f9fd;border-radius:10px;padding:9px 11px}' +
  '.tile b{display:block;font-size:19px;color:#1f3864}' +
  '.tile span{font-size:11px;color:#5a6478}' +
  '.lg{font-size:11px;color:#5a6478;margin-top:6px}' +
  '.lg i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-left:4px}' +
  'h2{font-size:14px;color:#1f3864;margin:16px 0 6px;padding-bottom:5px;' +
  'border-bottom:2px solid #e8eefc;display:flex;justify-content:space-between;align-items:center}' +
  'table{width:100%;border-collapse:collapse;font-size:12px}' +
  'th{background:#eef2fb;color:#1f3864;padding:6px 8px;text-align:right;font-weight:normal;' +
  'font-size:11px}' +
  'td{border-bottom:1px solid #eef0f5;padding:6px 8px;vertical-align:middle}' +
  '.now{background:#eaf6ec!important}.pinned{background:#fff6e5!important}' +
  '.bdg{display:inline-block;border-radius:20px;padding:1px 9px;font-size:10px;color:#fff}' +
  '.b-act{background:#166534}.b-done{background:#5a6478}.b-new{background:#2e5cb8}' +
  '.b-re{background:#b45309}.b-skip{background:#9ca3af}.b-man{background:#7c3aed}' +
  '.abt{font-size:11px;color:#cbd5e1;margin-top:2px;line-height:1.6}' +
  '.exc{opacity:.85}.exc td{background:#241f1f}' +
  '.lvl{font-size:10px;color:#5a6478}' +
  /* فهرستِ درس‌ها برای انتخابِ دامنهٔ مرور (۶٫۴۰): جعبه‌ای که خودش می‌پیچد،
     چون یک مجموعه می‌تواند بیست درس داشته باشد و خانهٔ جدول باریک است. */
  '.rcLes{display:block;font-size:11px;line-height:1.7;white-space:nowrap;' +
  'overflow:hidden;text-overflow:ellipsis}' +
  '.rcEpsBox{max-height:150px;overflow-y:auto;border:1px solid #dfe5f2;' +
  'border-radius:6px;padding:4px 6px;background:#fafbff}' +
  'button{font-family:inherit;font-size:11px;border:1px solid #2e5cb8;background:#fff;' +
  'color:#2e5cb8;border-radius:7px;padding:4px 10px;cursor:pointer}' +
  'button:hover{background:#eef2fb}button[disabled]{opacity:.45;cursor:default}' +
  'button.pin{background:#2e5cb8;color:#fff}' +
  '.warn{background:#fff6e5;border:1px solid #f0d9a8;border-radius:10px;padding:10px 12px;' +
  'font-size:12px;margin-bottom:12px}' +
  '.ok{background:#eaf6ec;border:1px solid #c7e4cd;border-radius:10px;padding:10px 12px;' +
  'font-size:12px;margin-bottom:12px}' +
  '.sub{font-size:11px;color:#5a6478}' +
  '#msg{position:sticky;top:0;z-index:9}';

function badgeOf_(st) {
  if (st === SST.ACTIVE) return '<span class="bdg b-act">در حال تولید</span>';
  if (st === SST.DONE) return '<span class="bdg b-done">تمام‌شده</span>';
  if (st === SST.REOPENED) return '<span class="bdg b-re">قسمت تازه</span>';
  if (st === SST.SKIPPED) return '<span class="bdg b-skip">نادیده</span>';
  return '<span class="bdg b-new">در نوبت</span>';
}

/**
 * ساختِ HTML پنجره. تابعِ خالص است (فقط از داده می‌سازد) تا در آزمون هم
 * قابل سنجش باشد.
 */
// JSON برای جاسازی امن داخلِ یک تگِ <script>: نویسه‌های < و > و جداکننده‌های
// خطِّ یونیکد را escape می‌کند تا نه از تگ بیرون بزند (</script>) و نه جاوااسکریپت
// را بشکند. مقدار در زمانِ اجرا دقیقاً همان رشتهٔ اصلی می‌ماند.
function jsonScript_(o) {
  return JSON.stringify(o)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function seriesBoardHtml_(d) {
  var H = [];
  // فهرستِ دسته‌های موجود، برای فرمِ تنظیمِ دستی: هم دسته‌های استانداردِ
  // تاکسونومی، هم هر دسته‌ای که همین حالا روی تخته هست.
  var catList = [], seenC = Object.create(null);
  try {
    for (var ci = 0; ci < TAXONOMY.length; ci++) {
      var ct = String(TAXONOMY[ci].title || '');
      if (ct && !seenC[ct]) { seenC[ct] = 1; catList.push(ct); }
    }
  } catch (eTx) {}
  for (var gi = 0; gi < d.groups.length; gi++) {
    var gc = String(d.groups[gi].cat || '');
    if (gc && gc !== MISC_TITLE && !seenC[gc]) { seenC[gc] = 1; catList.push(gc); }
  }

  H.push('<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">');
  H.push('<style>' + BOARD_CSS + '</style></head><body>');
  H.push('<script>var MO_CATS=' + jsonScript_(catList) + ';</script>');
  H.push('<div id="msg"></div>');

  // ── فرمِ تنظیمِ دستی (یکجا؛ جای سه پنجرهٔ پشتِ‌هم) ──
  H.push(
    '<div id="moOv" data-key="" style="display:none;position:fixed;inset:0;' +
    'background:rgba(0,0,0,.55);z-index:60">' +
    '<div style="max-width:470px;margin:6% auto;background:#fff;color:#1a2030;' +
    'border-radius:12px;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.3)">' +
    '<div id="moTitle" style="font-weight:bold;font-size:15px;margin-bottom:12px"></div>' +
    '<div style="margin:10px 0"><div style="font-size:12px;color:#5a6478;margin-bottom:3px">' +
    'شمارهٔ دستی (۱ = اولِ صف؛ خالی = بی‌شماره)</div>' +
    '<input id="moNum" type="text" inputmode="numeric" style="width:100%;box-sizing:border-box;' +
    'padding:8px;border:1px solid #cbd5e1;border-radius:7px;font:inherit"></div>' +
    '<div style="margin:10px 0"><div style="font-size:12px;color:#5a6478;margin-bottom:3px">دسته</div>' +
    '<select id="moCat" onchange="moCatChange()" style="width:100%;box-sizing:border-box;' +
    'padding:8px;border:1px solid #cbd5e1;border-radius:7px;font:inherit"></select>' +
    '<input id="moNew" placeholder="نامِ دستهٔ نو" style="display:none;width:100%;box-sizing:border-box;' +
    'margin-top:6px;padding:8px;border:1px solid #cbd5e1;border-radius:7px;font:inherit"></div>' +
    '<div style="margin:10px 0"><div style="font-size:12px;color:#5a6478;margin-bottom:3px">' +
    'زیردسته (اختیاری)</div>' +
    '<input id="moSub" type="text" style="width:100%;box-sizing:border-box;padding:8px;' +
    'border:1px solid #cbd5e1;border-radius:7px;font:inherit"></div>' +
    '<div style="font-size:11.5px;color:#5a6478;margin-top:8px">با ثبت، این مجموعه برای داوریِ ' +
    'خودکار قفل می‌شود، پوشهٔ درایوش زیرِ دسته می‌رود و شماره/دسته برای قسمت‌های قبلی هم عقب‌گرد می‌خورد.</div>' +
    '<div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-start">' +
    '<button onclick="moSave()" style="background:#166534;color:#fff;border:0;padding:8px 16px;' +
    'border-radius:7px;cursor:pointer;font:inherit">ثبت</button>' +
    '<button onclick="moCancel()" style="padding:8px 16px;border:1px solid #cbd5e1;' +
    'border-radius:7px;background:#fff;cursor:pointer;font:inherit">انصراف</button></div>' +
    '</div></div>');

  H.push('<div class="hd"><h1>مجموعه‌های آموزشی — «' + bEsc_(CFG.SPECIAL_SHOW_NAME) + '»</h1>');
  H.push('<div class="s">' +
         (d.enabled ? 'تولید روزانه ساعت ' + faNum_(d.specialHour) + ' صبح'
                    : '⚠️ تولید تخصصی خاموش است') +
         '  ·  اسکن خودکار هر ' + faNum_(d.rescanHours) + ' ساعت' +
         (d.scannedAt ? '  ·  آخرین اسکن: ' + bEsc_(d.scannedAt) : '') +
         (d.version ? '  ·  نسخهٔ کد: ' + bEsc_(d.version) : '') + '</div></div>');

  // ── تقویمِ تولید ──
  // خواستهٔ صاحبِ برنامه: کنترلِ توقف و روزها باید همین‌جا باشد، نه گزینه‌ای
  // جدا در منو. مدلِ داده همان تبِ «تقویمِ تولید» است و calGate_ دست نخورده؛
  // این فقط سطحِ نمایش است. پس اگر این پنل بشکند، تولید نمی‌شکند.
  H.push(calPanelHtml_());
  H.push(handoutPanelHtml_(d));
  H.push(recapPanelHtml_(d));

  // ── جست‌وجو — خواستهٔ صریح: این فهرست باید «حتماً» قابلِ جست‌وجو باشد ──
  H.push('<div class="card" style="position:sticky;top:0;z-index:5">' +
         '<input id="q" type="search" placeholder="جست‌وجو در مجموعه‌ها، درس‌ها، دسته‌ها…" ' +
         'style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #cbd5e1;' +
         'border-radius:8px;font:inherit" oninput="doSearch()">' +
         '<div id="qn" class="sub" style="margin-top:4px"></div></div>');

  // ── وضعیت انتخاب ──
  if (d.pin && d.pin.exhausted) {
    H.push('<div class="ok"><b>انتخاب دستی تمام شد:</b> ' +
           (d.pin.kind === 'cat' ? 'دستهٔ «' : 'مجموعهٔ «') + bEsc_(d.pin.name || d.pin.value) +
           '» کارِ ساخته‌نشده‌ای ندارد.' +
           '<br>در اجرای بعد خودش برداشته می‌شود و موتور ' +
           (d.current
              ? 'به مجموعه‌ای که نیمه‌کاره گذاشته بود برمی‌گردد — همان که پایین با نشانِ ' +
                '«الان روی این کار می‌شود» دیده می‌شود.'
              : 'سراغ مجموعهٔ بعدی می‌رود؛ ولی الان هیچ مجموعهٔ ناتمامی در فهرست نیست.') +
           ' &nbsp; <button onclick="clearPin()">همین حالا بردار</button></div>');
  } else if (d.pin) {
    H.push('<div class="warn"><b>انتخاب دستی فعال است:</b> ' +
           (d.pin.kind === 'cat' ? 'دستهٔ «' : 'مجموعهٔ «') + bEsc_(d.pin.name || d.pin.value) + '»' +
           (d.pin.at ? ' <span class="sub">(از ' + bEsc_(d.pin.at) + ')</span>' : '') +
           '<br>تا این کار تمام نشود، موتور سراغ چیز دیگری نمی‌رود. همین که تمام شد، ' +
           'انتخاب دستی خودش برداشته می‌شود و موتور به مجموعه‌ای که نیمه‌کاره گذاشته بود ' +
           'برمی‌گردد. &nbsp; <button onclick="clearPin()">برداشتن انتخاب دستی</button></div>');
  }
  if (d.judge && (d.judge.unjudged || !d.judgedAt)) {
    H.push('<div class="warn"><b>' + (d.judge.unjudged ? faNum_(d.judge.unjudged) +
           ' مجموعه هنوز داوری نشده' : 'داوریِ محتوایی هنوز انجام نشده') + '.</b> ' +
           'تا داوری نشوند، دسته و سطح و اولویتشان قطعی نیست. داوری خودش پیش از هر ' +
           'تولید انجام می‌شود، ولی می‌توانید همین حالا هم بزنیدش:' +
           ' &nbsp; <button onclick="judgeNow()">داوری و مرتب‌سازی همین حالا</button></div>');
  }
  if (d.judge && d.judge.byRule) {
    // شفافیت: کاربر باید بداند کدام تصمیم‌ها از مدل آمده و کدام‌ها از
    // قاعده‌های خودیِ موتور — وگرنه به هر دو یک‌جور اعتماد می‌کند.
    H.push('<div class="warn"><b>' + faNum_(d.judge.byRule) +
           ' مجموعه با قاعده‌های خودیِ موتور دسته‌بندی شده‌اند، نه با مدل.</b> ' +
           'این وقتی پیش می‌آید که مدلِ داوری جواب نمی‌دهد؛ کارش این است که فهرست ' +
           'بی‌نظم و بی‌دسته نماند. دقتش کمتر است و در دورهای بعد خودش با مدل ' +
           'بازبینی می‌شود. در ستونِ دلیل با نشانهٔ «' + bEsc_(JUDGE_LOCAL_MARK) +
           '» مشخص‌اند.</div>');
  }
  if (d.current) {
    H.push('<div class="ok"><b>الان روی این کار می‌شود:</b> ' + bEsc_(d.current.name) +
           ' <span class="sub">(دستهٔ ' + bEsc_(d.current.cat) + ')</span>' +
           '<br><span class="sub">دکمهٔ «ساخت یک قسمت همین حالا» هم همین را ادامه می‌دهد — ' +
           'مگر مجموعهٔ دیگری را دستی انتخاب کنید.</span></div>');
  } else {
    H.push('<div class="warn">هیچ مجموعه‌ای برای تولید در نوبت نیست. اگر تازه شیت تازه‌ای ' +
           'اضافه کرده‌اید، «اسکن مجموعه‌های آموزشی» را بزنید.</div>');
  }

  // ── نمودارها ──
  var t = d.totals;
  H.push('<div class="card"><div class="row">');
  H.push('<div style="text-align:center">' +
         donutSvg_(t.pct, 'از کلِ درس‌ها', faNum_(Math.round(t.doneChunks)) + ' از ' + faNum_(t.chunks) +
                   ' قطعه') + '</div>');
  H.push('<div style="text-align:center">' +
         pieSvg_([{ n: t.done, color: '#5a6478', label: 'تمام‌شده' },
                  { n: t.active, color: '#166534', label: 'در حال تولید' },
                  { n: t.reopened, color: '#b45309', label: 'قسمت تازه' },
                  { n: t.queued, color: '#2e5cb8', label: 'در نوبت' },
                  { n: t.skipped, color: '#9ca3af', label: 'نادیده' }]) +
         '<div class="lg">' +
         '<i style="background:#166534"></i>در حال تولید ' + faNum_(t.active) +
         ' &nbsp;<i style="background:#2e5cb8"></i>در نوبت ' + faNum_(t.queued) +
         ' &nbsp;<i style="background:#b45309"></i>قسمت تازه ' + faNum_(t.reopened) +
         ' &nbsp;<i style="background:#5a6478"></i>تمام‌شده ' + faNum_(t.done) +
         '</div></div>');
  H.push('<div class="tile"><b>' + faNum_(t.series) + '</b><span>مجموعهٔ آموزشی</span></div>');
  H.push('<div class="tile"><b>' + faNum_(d.episodesMade) + '</b><span>قسمتِ ساخته‌شده</span></div>');
  H.push('<div class="tile"><b>' + faNum_(Math.max(0, Math.round(t.chunks - t.doneChunks))) +
         '</b><span>قطعهٔ باقی‌مانده</span></div>');
  if (d.judge) {
    H.push('<div class="tile"><b>' + faNum_(d.judge.notCourse) +
           '</b><span>آموزشی نبود</span></div>');
    if (d.judge.unjudged) {
      H.push('<div class="tile"><b>' + faNum_(d.judge.unjudged) +
             '</b><span>داوری‌نشده</span></div>');
    }
  }
  H.push('</div></div>');

  // ── فهرست، ذیل هر دسته ──
  if (!d.groups.length) {
    H.push('<div class="card">هنوز هیچ مجموعه‌ای شناسایی نشده است.</div>');
  }
  for (var g = 0; g < d.groups.length; g++) {
    var grp = d.groups[g];
    H.push('<div class="grp" data-cat="' + bEsc_(grp.cat) + '">');
    H.push('<h2><span>' + bEsc_(grp.cat) +
           (grp.hasCurrent ? ' &nbsp;<span class="bdg b-act">دستهٔ جاری</span>' : '') +
           (grp.pinned ? ' &nbsp;<span class="bdg b-re">انتخاب دستی</span>' : '') +
           '</span><span class="sub">' + faNum_(grp.pct) + '٪ &nbsp; ' +
           faNum_(grp.series.length) + ' مجموعه &nbsp; ' + faNum_(grp.episodes) + ' قسمت' +
           '</span></h2>');
    H.push('<div class="card"><div style="margin-bottom:8px">' +
           barSvg_(grp.pct, 260, grp.hasCurrent ? '#166534' : '#2e5cb8') +
           ' &nbsp;<button ' + (grp.pinned ? 'class="pin" ' : '') +
           'data-cat="' + bEsc_(grp.cat) + '" ' +
           'data-act="' + (grp.pinned ? 'unpin' : 'pin') + '" ' +
           (grp.pinned || grp.hasWork ? '' :
             'disabled title="مجموعه‌های این دسته تمام شده‌اند یا نادیده گرفته شده‌اند؛ چیزی برای ساختن نمانده" ') +
           'onclick="pinCat(this)">' +
           (grp.pinned ? 'انتخاب‌شده — کلیک برای برداشتن' : 'کار روی این دسته') +
           '</button></div>');
    H.push('<table><tr><th>اولویت</th><th>مجموعه</th><th>سطح</th><th>قسمت</th>' +
           '<th>پیشرفت</th><th>وضعیت</th><th>قسمت‌های ساخته‌شده</th>' +
           '<th>جزوه</th><th>مرورِ بزرگ</th><th></th></tr>');
    for (var i = 0; i < grp.series.length; i++) {
      var x = grp.series[i];
      var clsName = (x.isPinned ? 'pinned ' : (x.isCurrent ? 'now ' : '')) + 'srow';
      // متنِ جست‌وجو: نام، موضوع، شرح، دسته، زیر‌دسته و نامِ همهٔ درس‌ها
      var hay = [x.name, x.topic, x.about, grp.cat, x.msub, x.level, x.key]
        .concat(x.partRows.map(function (pr) { return pr.name; })).join(' ');
      H.push('<tr class="' + clsName + '" data-hay="' + bEsc_(hay) + '">');
      H.push('<td>' +
             (x.morder !== null
                ? faNum_(x.morder) + ' <span class="bdg b-man">دستی</span>'
                : (x.order >= 999 ? '—' : faNum_(x.order))) + '</td>');
      H.push('<td><b>' + bEsc_(x.name) + '</b>' +
             (x.isCurrent ? ' ◀ <span class="sub">همین حالا</span>' : '') +
             (x.manual === SMAN.YES ? ' <span class="bdg b-man">نظرِ شما</span>' : '') +
             (x.locked ? ' <span class="bdg b-man">🔒 تنظیمِ دستی — داوریِ خودکار بی‌اثر</span>' : '') +
             (!x.locked && x.isCourse === null ? ' <span class="bdg b-new">داوری نشده</span>' : '') +
             (!x.locked && x.unsure ? ' <span class="bdg b-re">مشکوک</span>' : '') +
             (x.msub ? ' <span class="sub">زیر‌دسته: ' + bEsc_(x.msub) + '</span>' : '') +
             // شرحِ یک‌خطیِ محتوا: برای فایل‌هایی که از نامشان چیزی فهمیده نمی‌شود
             (x.about ? '<div class="abt">' + bEsc_(x.about) + '</div>'
                      : (x.topic ? '<div class="sub">' + bEsc_(x.topic) + '</div>' : '')) +
             orderWarnHtml_(x.orderWarn) +
             '</td>');
      H.push('<td class="lvl">' + bEsc_(x.level || '—') + '</td>');
      H.push('<td>' + faNum_(x.donePartsN) + '/' + faNum_(x.parts) + '</td>');
      H.push('<td>' + barSvg_(x.pct, 110, x.isCurrent ? '#166534' : '#2e5cb8') +
             '<div class="sub">' + faNum_(x.pct) + '٪ — ' + faNum_(Math.round(x.doneChunks)) + ' از ' +
             faNum_(x.chunks) + ' قطعه</div></td>');
      H.push('<td>' + (x.status === SST.ACTIVE && !x.hasWork
                         ? '<span class="bdg b-done">تمام شد — بسته می‌شود</span>'
                         : badgeOf_(x.status)) +
             (x.lastEpAt ? '<div class="sub">' + bEsc_(x.lastEpAt) + '</div>' : '') + '</td>');
      H.push('<td>' + faNum_(x.episodes) + '</td>');
      H.push(handoutCell_(x));
      H.push(recapCell_(x));
      H.push('<td><button ' + (x.isPinned ? 'class="pin" ' : '') +
             'data-key="' + bEsc_(x.key) + '" ' +
             'data-act="' + (x.isPinned ? 'unpin' : 'pin') + '" ' +
             (x.isPinned || x.hasWork ? '' :
               'disabled title="' + (x.status === SST.SKIPPED ?
                 'این مجموعه نادیده گرفته شده (ردیفش در شیت‌های منبع پیدا نمی‌شود)' :
                 'کارِ این مجموعه تمام شده؛ قطعهٔ ساخته‌نشده‌ای ندارد') + '" ') +
             'onclick="pinSeries(this)">' +
             (x.isPinned ? 'انتخاب‌شده — کلیک برای برداشتن' : 'کار روی این') + '</button>' +
             '<br><button style="margin-top:4px" data-key="' + bEsc_(x.key) + '" ' +
             'data-name="' + bEsc_(x.name) + '" ' +
             'data-mo="' + (x.morder === null ? '' : x.morder) + '" ' +
             'data-mc="' + bEsc_(x.mcat) + '" data-msu="' + bEsc_(x.msub) + '" ' +
             'onclick="setManual(this)">شماره و دستهٔ دستی</button>' +
             (x.locked ? '<br><button style="margin-top:4px" data-key="' + bEsc_(x.key) + '" ' +
                         'onclick="clearManual(this)">برداشتنِ تنظیمِ دستی</button>' : '') +
             '</td>');
      H.push('</tr>');

      // قسمت‌های همان مجموعه، به ترتیب، با جای ایستادن
      if (x.partRows.length) {
        H.push('<tr class="' + clsName.replace('srow', 'sdetail') + '"><td></td>' +
               '<td colspan="9"><table style="font-size:11px">');
        for (var p = 0; p < x.partRows.length; p++) {
          var pr = x.partRows[p];
          H.push('<tr><td style="width:34px">' + faNum_(pr.seq || (p + 1)) + '</td>' +
                 '<td>' + bEsc_(pr.name) + '</td>' +
                 '<td style="width:120px">' + barSvg_(pr.pct, 90,
                    pr.pct >= 100 ? '#5a6478' : '#8ab4f8') + '</td>' +
                 '<td style="width:120px" class="sub">قطعهٔ ' + faNum_(Math.round(pr.done)) +
                 ' از ' + faNum_(pr.chunks) + '</td>' +
                 '<td class="sub">' + (pr.episodes ? 'قسمت ' + bEsc_(pr.episodes) : '—') +
                 '</td></tr>');
        }
        H.push('</table></td></tr>');
      }
    }
    H.push('</table></div>');
    H.push('</div>');   // .grp — مرزِ جست‌وجو
  }

  // ── بخشِ «آموزشی تشخیص داده نشد» ──
  if (d.excluded && d.excluded.length) {
    H.push('<h2><span>آموزشی تشخیص داده نشد ' +
           '<span class="bdg b-skip">' + faNum_(d.excluded.length) + '</span></span>' +
           '<span class="sub">در «' + bEsc_(CFG.SHOW_NAME) + '» استفاده می‌شوند</span></h2>');
    H.push('<div class="card"><div class="sub" style="margin-bottom:8px">' +
           'این‌ها از فهرستِ «' + bEsc_(CFG.SPECIAL_SHOW_NAME) + '» کنار گذاشته شده‌اند چون ' +
           'داوریِ محتوایی — با خواندنِ متنِ واقعیِ خودشان، نه نامشان — تشخیص داده که ' +
           'آموختنِ منظم در آن‌ها نیست. <b>دور ریخته نشده‌اند:</b> در برنامهٔ «' +
           bEsc_(CFG.SHOW_NAME) + '» عیناً استفاده می‌شوند. اگر با داوری موافق نیستید، ' +
           'دکمهٔ «آموزشی است» را بزنید تا از این پس در فهرستِ درس‌نامه بیاید.' +
           '</div>');
    H.push('<table><tr><th>مجموعه</th><th>چه چیزی است</th><th>امتیاز</th>' +
           '<th>قسمت</th><th></th></tr>');
    for (var xx = 0; xx < d.excluded.length; xx++) {
      var ex = d.excluded[xx];
      H.push('<tr class="exc">');
      H.push('<td><b>' + bEsc_(ex.name) + '</b>' +
             (ex.manual === SMAN.NO ? ' <span class="bdg b-man">نظرِ شما</span>' : '') +
             (ex.about ? '<div class="abt">' + bEsc_(ex.about) + '</div>' : '') + '</td>');
      H.push('<td class="sub">' + bEsc_(ex.why || '—') + '</td>');
      H.push('<td>' + faNum_(ex.cscore) + '</td>');
      H.push('<td>' + faNum_(ex.parts) + ' / ' + faNum_(ex.chunks) + ' قطعه</td>');
      H.push('<td><button data-key="' + bEsc_(ex.key) + '" data-act="course" ' +
             'onclick="setCourse(this)">آموزشی است</button>' +
             // اگر همین ردیف تنظیمِ دستی دارد (وتوی SMAN.NO بر قفل چربیده)،
             // دکمهٔ دیدن/برداشتنِ آن هم باید همین‌جا باشد، نه گم.
             (ex.locked ? '<br><button style="margin-top:4px" data-key="' + bEsc_(ex.key) + '" ' +
                          'onclick="clearManual(this)">برداشتنِ تنظیمِ دستی</button>' : '') +
             '</td>');
      H.push('</tr>');
    }
    H.push('</table></div>');
  }

  H.push('<div class="card sub">' +
         'ترتیب هر دسته از «برنامهٔ درسی» می‌آید: مقدماتی‌ترین مجموعه اولویت ۱ می‌گیرد و ' +
         'موتور به همان ترتیب جلو می‌رود. تا یک مجموعه تمام نشود سراغ بعدی نمی‌رود. ' +
         'اگر مجموعه‌ای را دستی انتخاب کنید، اولویت‌ها موقتاً کنار می‌روند تا کارِ آن تمام شود.' +
         '</div>');

  // ── ارتباط با سرور ──
  H.push('<script>');
  H.push('function say(t,ok){var m=document.getElementById("msg");' +
         'm.innerHTML=\'<div class="\'+(ok?"ok":"warn")+\'">\'+t+\'</div>\';' +
         'window.scrollTo(0,0);}');
  H.push('function busy(){document.querySelectorAll("button").forEach(function(b){' +
         'b.disabled=true;});}');
  H.push('function done(r){say(r&&r.message?r.message:"انجام شد.",true);' +
         'setTimeout(function(){google.script.run.withSuccessHandler(function(h){' +
         'document.open();document.write(h);document.close();})' +
         '.uiBoardHtml();},700);}');
  H.push('function fail(e){say("خطا: "+(e&&e.message?e.message:e),false);' +
         'document.querySelectorAll("button").forEach(function(b){b.disabled=false;});}');
  // کلیدها با data-attribute می‌آیند، نه داخل رشتهٔ جاوااسکریپت — تا هیچ نویسه‌ای
  // (کوتیشن، بک‌اسلش، خطِ تازه) نتواند دکمه را بشکند یا کدی تزریق کند.
  // «کنش» هم از خودِ دکمه می‌آید (pin / unpin) تا دکمهٔ کهنه، انتخابِ برداشته‌شده را برنگرداند.
  H.push('function pinSeries(b){var k=b.dataset.key,a=b.dataset.act||"pin";' +
         'busy();say("ثبت انتخاب…",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiPinSeries(k,a);}');
  H.push('function pinCat(b){var c=b.dataset.cat,a=b.dataset.act||"pin";' +
         'busy();say("ثبت انتخاب…",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiPinCategory(c,a);}');
  H.push('function clearPin(){busy();say("برداشتن انتخاب…",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail).uiClearPin();}');
  /* جزوه: ساختش یک فراخوانِ مدل است و می‌تواند ده‌ها ثانیه طول بکشد، پس
     پیام «چند لحظه صبر کنید» لازم است — دکمه‌ای که بی‌خبر ساکت بماند، از
     دکمه‌ای که کار نکند فرق نمی‌کند. */
  H.push('function handoutSeries(b){var k=b.dataset.key;' +
         'busy();say("ساختِ جزوه… این کار چند ده ثانیه طول می‌کشد",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiHandoutSeries(k);}');
  /* مرورِ بزرگ: تیک‌ها از خودِ جدول جمع می‌شوند، پس هیچ حالتِ دومی نگه داشته
     نمی‌شود که با جدول ناهم‌خوان شود. `rcDefault` همان قاعدهٔ سرور است — و
     عمداً از `data-*`ِ خودِ تیک می‌آید، نه از یک کپیِ جداگانه در جاوااسکریپت. */
  /* `rcSay` و نه `getElementById(...).textContent` مستقیم: جعبهٔ مرور وقتی
     هیچ مجموعه‌ای قسمت نداشته باشد اصلاً رندر نمی‌شود، و آن‌وقت این سطرها
     روی `null` می‌افتادند. استثنا در دیالوگِ Apps Script هیچ‌جا دیده نمی‌شود —
     دکمه فقط بی‌صدا کاری نمی‌کند، همان بدترین شکلِ خرابی در این پنجره. */
  H.push('function rcSay(t){var e=document.getElementById("rcMsg");if(e)e.textContent=t;}');
  H.push('function rcBoxes(){return [].slice.call(' +
         'document.querySelectorAll("input.rcChk"));}');
  H.push('function recapNone(){rcBoxes().forEach(function(b){if(!b.disabled)b.checked=false;});' +
         'rcSay("همهٔ تیک‌ها برداشته شد.");}');
  H.push('function recapDefault(){rcBoxes().forEach(function(b){' +
         'if(!b.disabled)b.checked=(b.dataset.def==="1");});' +
         'rcModes().forEach(function(s){s.value="all";rcModeChange(s);});' +
         '[].slice.call(document.querySelectorAll("input.rcEp")).forEach(function(x){' +
         'x.checked=false;});' +
         'rcSay("تیکِ پیش‌فرض برگشت — دامنهٔ همه هم.");}');
  /* ── دامنه (۶٫۳۹) ──────────────────────────────────────────────────
     جعبهٔ شماره‌ها فقط در حالتِ «انتخابی» دیده می‌شود. جعبه‌ای که همیشه باز
     باشد، در حالتی که کاری نمی‌کند هم پر می‌شود — و آدم بعداً باور می‌کند
     چیزی که نوشته اثر داشته. `data-key` مقایسه می‌شود و در selector نمی‌رود:
     کلیدِ مجموعه می‌تواند هر نویسه‌ای داشته باشد و یک querySelector شکسته
     در این پنجره هیچ خطایی نشان نمی‌دهد، فقط بی‌صدا کار نمی‌کند. */
  H.push('function rcModes(){return [].slice.call(' +
         'document.querySelectorAll("select.rcMode"));}');
  H.push('function rcModeChange(s){var k=s.dataset.key;' +
         '[].slice.call(document.querySelectorAll("div.rcEpsBox")).forEach(function(x){' +
         'if(x.dataset.key===k)x.style.display=(s.value==="pick")?"":"none";});}');
  /* درس‌ها تیک می‌خورند، تایپ نمی‌شوند (۶٫۴۰): «چرا تایپ کنم؟ مگه نمی‌شه
     درس‌ها رو بتونم تیک بزنم؟». پس اینجا هیچ رشته‌ای تجزیه نمی‌شود — آرایهٔ
     عددها مستقیم می‌رود. و «همه/هیچ» هست چون بیست تیک زدن هم یک تایپِ دیگر
     است. */
  H.push('function rcEpsAll(b,on){var k=b.dataset.key;' +
         '[].slice.call(document.querySelectorAll("input.rcEp")).forEach(function(x){' +
         'if(x.dataset.key===k)x.checked=!!on;});}');
  H.push('function rcEpsPicked(k){var o=[];' +
         '[].slice.call(document.querySelectorAll("input.rcEp")).forEach(function(x){' +
         'if(x.dataset.key===k&&x.checked)o.push(Number(x.value));});return o;}');
  H.push('function rcScopes(){var m={};' +
         'rcModes().forEach(function(s){var k=s.dataset.key;' +
         'm[k]={mode:s.value,eps:rcEpsPicked(k)};});return m;}');
  H.push('function recapRun(b){var k=rcBoxes().filter(function(x){' +
         'return x.checked&&!x.disabled;}).map(function(x){return x.dataset.key;});' +
         'if(!k.length){rcSay("هیچ مجموعه‌ای تیک نخورده.");return;}' +
         'var sc=rcScopes(),bad=[];' +
         'k.forEach(function(x){var o=sc[x];' +
         'if(o&&o.mode==="pick"&&!(o.eps&&o.eps.length))bad.push(x);});' +
         'if(bad.length){rcSay("برای «فقط درس‌هایی که تیک می‌زنم» باید دستِ‌کم یک درس ' +
         'تیک بخورد — هنوز ' + '"+bad.length+"' + ' مجموعه خالی است.");return;}' +
         'busy();say("ساختِ مرور… نوشتنِ متن چند ده ثانیه طول می‌کشد",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiRecapQueue(k,sc);}');
  H.push('function handoutAll(){busy();' +
         'say("واردکردنِ قسمت‌های گذشته و ساختِ جزوه‌ها… چند لحظه صبر کنید",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiHandoutAll();}');
  H.push('function setCourse(b){var k=b.dataset.key,a=b.dataset.act||"course";' +
         'busy();say("ثبت نظر…",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiSetCourse(k,a);}');
  H.push('function judgeNow(){busy();say("داوریِ محتوایی… چند لحظه صبر کنید",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail).uiJudgeNow();}');
  // ── تنظیمِ دستی: یک فرمِ واحد (شماره + دسته + زیردسته با هم) ──
  // چرا فرم و نه سه پنجرهٔ prompt: در نسخهٔ قبل سه پنجرهٔ پشتِ‌هم می‌آمد و
  // کاربر فقط اولی (شماره) را می‌دید و فکر می‌کرد دسته اصلاً قابلِ تغییر نیست.
  H.push('function moFill(cur){var s=document.getElementById("moCat");s.innerHTML="";' +
         'var o0=document.createElement("option");o0.value="";' +
         'o0.textContent="— بی‌دسته (دسته را خودکار بگذار) —";s.appendChild(o0);' +
         'MO_CATS.forEach(function(c){var o=document.createElement("option");' +
         'o.value=c;o.textContent=c;s.appendChild(o);});' +
         'var on=document.createElement("option");on.value="__new";' +
         'on.textContent="+ دستهٔ نو…";s.appendChild(on);' +
         'var hit=false,i;for(i=0;i<s.options.length;i++){if(s.options[i].value===cur){' +
         's.selectedIndex=i;hit=true;break;}}' +
         'var nw=document.getElementById("moNew");' +
         'if(cur&&!hit){s.value="__new";nw.style.display="block";nw.value=cur;}' +
         'else{nw.style.display="none";nw.value="";}}');
  H.push('function setManual(b){' +
         'document.getElementById("moOv").dataset.key=b.dataset.key;' +
         'document.getElementById("moTitle").textContent="تنظیمِ دستی: "+(b.dataset.name||"");' +
         'document.getElementById("moNum").value=b.dataset.mo||"";' +
         'document.getElementById("moSub").value=b.dataset.msu||"";' +
         'moFill(b.dataset.mc||"");' +
         'document.getElementById("moOv").style.display="block";}');
  H.push('function moCatChange(){var v=document.getElementById("moCat").value;' +
         'document.getElementById("moNew").style.display=(v==="__new")?"block":"none";}');
  H.push('function moCancel(){document.getElementById("moOv").style.display="none";}');
  H.push('function moSave(){var k=document.getElementById("moOv").dataset.key;' +
         'var num=document.getElementById("moNum").value;' +
         'var cv=document.getElementById("moCat").value;' +
         'var cat=(cv==="__new")?document.getElementById("moNew").value:cv;' +
         'var sub=document.getElementById("moSub").value;' +
         'document.getElementById("moOv").style.display="none";' +
         'busy();say("ثبتِ تنظیمِ دستی و اصلاحِ قسمت‌های قبلی…",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiSetManual(k,num,cat,sub);}');
  H.push('function clearManual(b){if(!confirm("تنظیمِ دستی برداشته شود و این مجموعه ' +
         'دوباره به داوری و ترتیبِ خودکار برگردد؟"))return;' +
         'busy();say("برداشتنِ تنظیمِ دستی…",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiClearManual(b.dataset.key);}');
  // ── جست‌وجو ──
  H.push('function doSearch(){var q=(document.getElementById("q").value||"")' +
         '.trim().replace(/\\u200c/g," ").toLowerCase();' +
         'var rows=document.querySelectorAll("tr.srow");var n=0,tot=0;' +
         'rows.forEach(function(r){tot++;' +
         'var hay=(r.dataset.hay||"").replace(/\\u200c/g," ").toLowerCase();' +
         'var hit=!q||hay.indexOf(q)!==-1;' +
         'r.style.display=hit?"":"none";if(hit)n++;' +
         'var d=r.nextElementSibling;' +
         'if(d&&d.classList.contains("sdetail"))d.style.display=hit?"":"none";});' +
         'document.querySelectorAll(".grp").forEach(function(g){' +
         'var any=false;g.querySelectorAll("tr.srow").forEach(function(r){' +
         'if(r.style.display!=="none")any=true;});' +
         'g.style.display=any?"":"none";});' +
         'var qn=document.getElementById("qn");' +
         'qn.textContent=q?("نمایش "+n+" از "+tot+" مجموعه"):"";}');
  // ── تقویم ──
  H.push('function calSave(b){var box=document.getElementById(b.dataset.box);' +
         'var key=box.dataset.key;' +
         'var on=box.querySelector(".calOn").checked;' +
         'var days=[];box.querySelectorAll(".calDay").forEach(function(c){' +
         'days[Number(c.dataset.d)]=c.checked;});' +
         'var exc=box.querySelector(".calExc").value;' +
         'busy();say("ثبتِ تقویم…",true);' +
         'google.script.run.withSuccessHandler(done).withFailureHandler(fail)' +
         '.uiCalSave(key,on,days,exc);}');
  H.push('</script></body></html>');
  return H.join('\n');
}

/**
 * پنلِ تقویم در تخته — یک ردیف برای هر برنامه.
 *
 * بخشِ ۲۵ بالاتر از ۱۵ است، پس فراخوان‌ها در try/catch‌اند: بارگذارِ جزئیِ
 * آزمون‌ها نباید کلِ تخته را زمین بزند (همان قاعدهٔ همیشگیِ این ریپو).
 */
/* ═══════════ جزوه، ذیلِ همان مجموعه‌ای که مالِ اوست (۵٫۸۷) ═══════════

   صاحبِ برنامه: «بهتره که این پیشرفتِ جزوات و برخی کنترل‌هاش خودش رو تو این
   قسمت هم ذیلِ اون مجموعه نشون بده؟» — بله، و همان درسی است که ۵٫۶۱ برای
   تقویم داد: **کنترلی که جای دیگری از کاری که کنترل می‌کند بنشیند، پیدا
   نمی‌شود.** تا امروز حالِ جزوه فقط در `_STATUS.json` و یک تب بود؛ کسی که
   تختهٔ مجموعه‌ها را باز می‌کند تا ببیند این مجموعه کجاست، هیچ نشانی از
   جزوه‌اش نمی‌دید.

   و مثلِ ۵٫۶۱، **هیچ‌چیز در مدلِ داده عوض نمی‌شود**: این ستون فقط می‌خواند
   (از تبِ «کاربردِ جزوه»، یک بار برای کلِ تخته) و دکمه‌اش همان
   `handoutOneSeries_` را صدا می‌زند که از قبل هست و سنجه دارد. اگر این
   پنجره بشکند، ساختِ جزوه نمی‌شکند. */

/** خانهٔ «جزوه» در ردیفِ هر مجموعه. */
function handoutCell_(x) {
  var h = x && x.handout;
  var due = (x && x.handoutDue) || 0;
  if (!h || !h.totCh) {
    // مجموعه‌ای که هنوز قسمتی نساخته، جزوه هم لازم ندارد — و دکمهٔ خاموش
    // بهتر از دکمه‌ای است که زده شود و هیچ نکند.
    if (!x.episodes) return '<td class="sub">—</td>';
    return '<td><span class="bdg b-new">ساخته نشده</span>' +
           (due ? '<div class="sub">' + faNum_(due) + ' درس در صف</div>' : '') +
           '<div><button style="margin-top:4px" data-key="' + bEsc_(x.key) + '" ' +
           'onclick="handoutSeries(this)">ساختِ جزوه</button></div></td>';
  }
  /* مخرج باید حقیقت باشد، نه حدسِ ستون. `h.produced` از پیمایشِ واقعیِ
     پوشه در آخرین به‌روزرسانی می‌آید؛ ستونِ «قسمت‌های پادکست» هم تاریخ
     قاطی‌اش می‌شود و هم قسمت‌های پیش از شروعِ ثبت را ندارد. */
  var made = Number(h.produced) || Number(x.episodes) || 0;
  var behind = Math.max(0, made - (h.lessons || 0));
  return '<td>' +
    (h.url ? '<a href="' + bEsc_(h.url) + '" target="_blank">باز کردنِ جزوه</a>'
           : '<span class="sub">بی لینک</span>') +
    '<div class="sub">' + faNum_(h.totCh) + ' فصل · ' + faNum_(h.totSec) + ' بخش · ' +
    faNum_(h.totRef) + ' ارجاع</div>' +
    '<div class="sub">' + faNum_(h.lessons || 0) + ' از ' + faNum_(made) +
    ' درس' + (h.amend ? ' · ' + faNum_(h.amend) + ' تکمیلِ درسِ قبلی' : '') + '</div>' +
    (behind ? '<div class="sub" style="color:#8a6d1f">' + faNum_(behind) +
              ' درس هنوز وارد نشده</div>' : '') +
    (h.abandoned ? '<div class="sub" style="color:#8a2f2f">' + faNum_(h.abandoned) +
                   ' درس رهاشده — دکمه را بزنید تا از نو امتحان شود</div>' : '') +
    (h.result && h.result !== 'به‌روز شد'
       ? '<div class="sub" style="color:#8a2f2f">آخرین تلاش: ' + bEsc_(h.result) + '</div>'
       : '') +
    (due ? '<div class="sub">' + faNum_(due) + ' در صف</div>' : '') +
    '<div><button style="margin-top:4px" data-key="' + bEsc_(x.key) + '" ' +
    'onclick="handoutSeries(this)">به‌روزرسانیِ جزوه</button></div></td>';
}

/**
 * ══ ستونِ «مرورِ بزرگ» — و تیکی که پیش‌فرضش را خودش می‌داند (۶٫۳۰) ══
 *
 * خواستهٔ صاحبِ برنامه، عیناً: «ببینم برای هر مجموعه مرورش تا کجا تولید شده
 * … و به‌صورت پیش‌فرض هم خودش انتخاب کرده باشه که اون‌هایی که مرور نشدن تیک
 * خورده باشه (البته در صورتی که پادکستش قبلاً تولید شده باشه) ولی خودمم
 * بتونم تیک بقیه رو بزنم.»
 *
 * پس سه حالت، و هر سه باید از هم دیده شوند:
 *   • هیچ درسی ساخته نشده  → تیکِ خاموش و **غیرفعال**. مرورِ چیزی که وجود
 *     ندارد یک قسمتِ خالی است، و تیکی که کار نکند بدتر از تیکِ نبودن است،
 *     پس دلیلش هم روی خودِ خانه نوشته می‌شود.
 *   • ساخته ولی مرور نشده  → **تیک‌خورده، پیش‌فرض**. این همان چیزی است که
 *     صاحبِ برنامه معمولاً می‌خواهد؛ کاری که «معمولاً درست است» نباید هر بار
 *     دستی انتخاب شود.
 *   • مرور شده             → تیکِ خاموش، ولی **قابلِ زدن** — با نوشتنِ اینکه
 *     تا کدام درس پوشش داده و چند درس از آن موقع اضافه شده. ۵٫۹۵: گیتی که
 *     آدم نتواند بازش کند، همان شکلی است که این ریپو مدام به آن می‌خورد.
 */
function recapCell_(x) {
  var r = x && x.recap;
  var key = bEsc_(x.key);
  if (!r || !r.made) {
    return '<td class="sub"><label style="opacity:.5"><input type="checkbox" ' +
           'class="rcChk" data-key="' + key + '" disabled> مرور</label>' +
           '<div class="sub">هنوز قسمتی ساخته نشده</div></td>';
  }
  /* ══ پیش‌فرض: «مرور نشده» **و** به کفِ خودکار رسیده ══
   * خواسته این بود که «اون‌هایی که مرور نشدن تیک خورده باشه، در صورتی که
   * پادکستش قبلاً تولید شده باشه». تحتِ‌اللفظی یعنی هر مجموعه با یک درس هم
   * تیک بخورد — ولی ۲۶۴ مجموعه هست و فشردنِ دکمه آن‌وقت ده‌ها مرورِ
   * تک‌درسی سفارش می‌داد: هرکدام یک فراخوانِ مدل و یک قسمت در پلی‌لیست.
   * پس پیش‌فرض کفِ خودِ موتور (RECAP_MIN_PARTS) را هم رعایت می‌کند، و
   * مجموعهٔ زیرِ کف **همچنان تیک‌زدنی است** — فقط از پیش تیک نخورده، و
   * دلیلش روی همان خانه نوشته شده. تصمیم دستِ آدم می‌ماند؛ چیزی که عوض
   * می‌شود فقط «حدسِ اولیه» است.
   *
   * `data-def` همان پیش‌فرضِ سرور است، روی خودِ تیک. دکمهٔ «بازگرداندنِ تیکِ
   * پیش‌فرض» از همین می‌خواند — نه از یک کپیِ دوم در جاوااسکریپت، که همان
   * الگویی است که در این ریپو همیشه یکی‌اش کهنه می‌شود. */
  var on = !r.done && r.ripe;
  var chk = '<label><input type="checkbox" class="rcChk" data-key="' + key + '"' +
            ' data-def="' + (on ? '1' : '0') + '"' + (on ? ' checked' : '') + '> ' +
            (r.done ? 'دوباره بساز' : 'بساز') + '</label>';
  var body;
  if (!r.done) {
    body = '<div class="sub">ساخته نشده — ' + faNum_(r.made) + ' درس آماده' +
           (r.ripe ? '' : '<br>زیرِ کفِ ' + faNum_(Number(CFG.RECAP_MIN_PARTS) || 8) +
                          ' درس؛ از پیش تیک نخورده، ولی می‌توانید بزنید') + '</div>';
  } else {
    /* «چند فصل گفته شد از چند» — نه «چند فصل در دست بود». تا ۶٫۳۲ اینجا
       عددِ کلِ فصل‌های جزوه می‌نشست و ادعای پوششِ کامل می‌کرد؛ ناظر متنِ
       قسمت ۱۹ را خواند و دید سه فصل هیچ ردی در آن ندارند. */
    /* ══ پرونده‌های کهنه: «نامعلوم» بنویس، نه «تا درسِ ۰» (۶٫۳۹) ══ */
    var upto;
    if (r.unknown) upto = 'تا کجا: نامعلوم (مرورِ پیش از این نسخه)';
    else if (r.mode === 'pick') {
      upto = 'دامنه: درس‌های انتخابی' +
             (((r.done.eps || []).length) ? ' (' +
                bEsc_((r.done.eps || []).slice(0, 8).map(faNum_).join('، ')) + ')' : '');
    } else {
      /* برآورد را «برآورد» بنویس. عددی که از استنتاج آمده و مثلِ عددِ
         ثبت‌شده نمایش داده شود، همان ادعایی است که ۶٫۳۳ از پوششِ فصل‌ها
         برداشت. */
      upto = 'تا درسِ ' + faNum_(r.upto || r.covered) +
             (r.uptoFrom === 'برآورد' ? ' (از شمارهٔ قسمتش حساب شد)' : '');
    }
    body = '<div><span class="bdg b-done">قسمت ' + faNum_(Number(r.done.ep) || 0) + '</span></div>' +
           '<div class="sub">' + upto +
           (r.chAll ? ' · ' + faNum_(r.chOk) + ' مبحث از ' + faNum_(r.chAll) : '') +
           (r.done.at ? '<br>' + bEsc_(String(r.done.at)) : '') + '</div>' +
           (r.chGap ? '<div class="sub" style="color:#8a6d1f">' + faNum_(r.chGap) +
                      ' مبحث ردی در متنِ مرور ندارد' +
                      ((r.done.miss || []).length ? '<br>' +
                        bEsc_((r.done.miss || []).slice(0, 2).join('، ')) : '') +
                      '</div>' : '') +
           (r.behind ? '<div class="sub" style="color:#8a6d1f">' + faNum_(r.behind) +
                       ' درسِ تازه پس از آن</div>' : '');
  }
  /* ══ «خب الان رو چی بزنم؟ خودکار ساخته می‌شه؟» (۶٫۴۱) ══
   * جعبهٔ بالای تخته سازوکارِ صف را توضیح می‌داد، ولی جوابِ سؤالی که آدم
   * جلوی یک ردیفِ مشخص دارد آنجا نبود: **برای همین مجموعه، اگر هیچ نکنم چه
   * می‌شود؟** و جوابش برای دو حالت متضاد است — مجموعه‌ای که هنوز مرور
   * نگرفته خودش شبانه نوبت می‌گیرد، ولی مجموعه‌ای که یک بار مرور گرفته
   * **هرگز** دوباره خودکار نمی‌گیرد (`recapCandidates_` رد می‌کندش). بدونِ
   * این جمله، آدم منتظرِ چیزی می‌ماند که قرار نیست بیاید. */
  var idle;
  if (r.queued) {
    idle = '<div class="sub" style="color:#166534">در صف (' + faNum_(r.queued) +
           ') — امشب یا شب‌های بعد خودش ساخته می‌شود</div>';
  } else if (!r.done) {
    idle = r.ripe
      ? '<div class="sub">اگر کاری نکنید، خودش شبانه نوبت می‌گیرد</div>'
      : '<div class="sub">خودکار سراغش نمی‌رود (زیرِ کف)؛ فقط با تیک و دکمه</div>';
  } else {
    idle = '<div class="sub">خودکار دیگر سراغش نمی‌رود — فقط با تیک و دکمه</div>';
  }
  return '<td>' + body + idle + recapScopePick_(r, key) +
         '<div style="margin-top:4px">' + chk + '</div></td>';
}

/**
 * سه انتخابِ دامنه، روی خودِ خانه (۶٫۳۹) — و درس‌ها **تیک می‌خورند**، نه
 * تایپ (۶٫۴۰).
 *
 * ══ گزارشِ صاحبِ برنامه، دو بار ══
 * (۱) «می‌خوام خودم انتخاب کنم رو کدوم درس‌ها باشه؛ یا همهٔ درس‌ها از ابتدا،
 *     یا صرفاً درس‌های انتخاب‌شده، یا صرفاً درس‌های بعد از آخرین مرور. ولی
 *     این نمی‌فهمم چی می‌گه، خیلی گیج‌کننده‌ست.»
 * (۲) «بعد چرا تایپ کنم؟ مگه نمی‌شه جوری باشه درس‌ها رو بتونم تیک بزنم که
 *     مرورش تولید کنه؟»
 *
 * تا ۶٫۳۸ تیک فقط می‌گفت «بساز» و رفتار همیشه یکی بود. ۶٫۳۹ سه دامنه ساخت
 * ولی برای «انتخابی» یک جعبهٔ متن گذاشت — یعنی از آدم می‌خواست شمارهٔ درس‌ها
 * را از حفظ بنویسد. **شمارهٔ درس چیزی نیست که کسی به یاد داشته باشد**، و
 * ابزاری که یادآوریِ آن را به گردنِ آدم بیندازد، کارِ خودش را به او سپرده:
 * فهرستِ درس‌ها همین حالا در دستِ کد است، از همان یک خواندنِ تب.
 *
 * پس فهرستِ درس‌ها با شماره و عنوان تیک‌خور است، با دو دکمهٔ «همه/هیچ» —
 * چون بیست تیک زدن هم خودش یک تایپِ دیگر است.
 *
 * **گزینه‌ها روی خودِ ردیفِ مجموعه‌اند، نه در جعبهٔ بالا** — همان قاعدهٔ ۵٫۶۱
 * و ۵٫۸۷: کنترل، کنارِ کاری که به آن مربوط است.
 *
 * «پس از آخرین مرور» فقط وقتی نشان داده می‌شود که مروری بوده باشد —
 * گزینه‌ای که معنایش خالی است، خودش یک گیجیِ تازه است.
 */
function recapScopePick_(r, key) {
  var L = (r.lessons || []);
  var opts = ['<option value="all">همهٔ درس‌ها از ابتدا</option>'];
  /* «پس از مرورِ قبلی» به یک مرزِ قابلِ‌استفاده نیاز دارد، نه به اینکه آن مرز
     حتماً *ثبت* شده باشد (۶٫۴۱) — برآوردِ قطعی از شمارهٔ قسمت هم کار می‌کند.
     ولی پس از یک مرورِ «انتخابی» این گزینه نمی‌آید: اگر درس‌های ۳ و ۹ مرور
     شده باشند، «پس از ۹» درس‌های ۴ تا ۸ را بی‌صدا می‌اندازد — درس‌هایی که
     هرگز مرور نشده‌اند. */
  if (r.done && r.upto > 0 && r.mode !== 'pick') {
    opts.push('<option value="since">فقط درس‌های پس از مرورِ قبلی ' +
              '(بعد از درسِ ' + faNum_(r.upto) + ')</option>');
  }
  opts.push('<option value="pick">فقط درس‌هایی که تیک می‌زنم</option>');

  /* سقف روی شمارِ تیک‌ها هست چون تخته ۲۶۴ ردیف دارد و این جعبه برای هر
     مجموعه‌ای که درسی ساخته رندر می‌شود. ولی بریدنِ بی‌اعلام یعنی درسی که
     دیده نمی‌شود انگار وجود ندارد — پس بریده‌شدن **نوشته** می‌شود. */
  var cap = Math.max(10, Number(CFG.RECAP_PICK_MAX) || 60);
  var items = [];
  for (var i = 0; i < L.length && i < cap; i++) {
    var t = String(L[i].title || '');
    if (t.length > 46) t = t.slice(0, 46) + '…';
    // مقدارِ تیک عددِ خام است (سرور با آن کار می‌کند)؛ رقمِ فارسی فقط
    // چیزی است که آدم می‌خوانَد.
    items.push('<label class="rcLes"><input type="checkbox" class="rcEp" data-key="' + key +
               '" value="' + Number(L[i].n) + '"> درسِ ' + faNum_(L[i].n) +
               (t ? ' — ' + bEsc_(t) : '') + '</label>');
  }
  var list = items.length
    ? ('<div style="margin-bottom:3px">' +
       '<button type="button" data-key="' + key + '" onclick="rcEpsAll(this,1)">همه</button> ' +
       '<button type="button" data-key="' + key + '" onclick="rcEpsAll(this,0)">هیچ</button>' +
       '</div>' + items.join('') +
       (L.length > cap ? '<div class="sub">و ' + faNum_(L.length - cap) +
                         ' درسِ دیگر که در این فهرست جا نشد</div>' : ''))
    : '<div class="sub">درسی برای انتخاب نیست</div>';

  return '<div class="sub" style="margin-top:4px">' +
         '<select class="rcMode" data-key="' + key + '" ' +
         'onchange="rcModeChange(this)" style="max-width:100%">' +
         opts.join('') + '</select>' +
         '<div class="rcEpsBox" data-key="' + key + '" style="display:none;margin-top:3px">' +
         list + '</div></div>';
}

/** جعبهٔ بالای تخته برای مرور: خلاصه + دکمه‌ای که تیک‌ها را می‌فرستد. */
function recapPanelHtml_(d) {
  var rows = [];
  var gs = (d && d.groups) || [];
  for (var g = 0; g < gs.length; g++) rows = rows.concat(gs[g].series || []);
  var ready = 0, made = 0, behind = 0, queued = 0, none = 0, def = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i].recap;
    if (!r || !r.made) continue;
    ready++;
    if (r.queued) queued++;
    if (!r.done && r.ripe) def++;
    if (r.done) { made++; if (r.behind) behind++; } else none++;
  }
  if (!ready) return '';
  /* ══ چرا این متن کوتاه شد (۶٫۳۹) ══
   * متنِ پیشین چهار پاراگراف بود دربارهٔ سازوکارِ صف و کفِ خودکار — یعنی
   * دربارهٔ کارِ *موتور*. صاحبِ برنامه گفت «نمی‌فهمم چی می‌گه، خیلی
   * گیج‌کننده‌ست»، و حق داشت: او دنبالِ پاسخِ «چه‌کار کنم» بود و متن پاسخِ
   * «چطور کار می‌کند» می‌داد. حالا سه جمله: چه‌کار کن، سه گزینه چیستند،
   * و چرا فقط اولی همین حالا ساخته می‌شود. */
  return '<h2><span>مرورِ بزرگ</span>' +
    '<span class="sub">یک قسمتِ جمع‌بندی برای هر مجموعه، با صدای همان یک نفر</span></h2>' +
    '<div class="card"><div class="sub" style="margin-bottom:8px">' +
    '<b>چه‌کار کنید:</b> مجموعه‌ها را تیک بزنید و برای هرکدام جلوی همان ردیف ' +
    'انتخاب کنید مرور روی کدام درس‌ها باشد. سه گزینه هست:' +
    '<div style="margin:4px 0 4px 0">' +
    '• <b>همهٔ درس‌ها از ابتدا</b> — کلِ مجموعه، از درسِ یک.<br>' +
    '• <b>فقط درس‌های پس از مرورِ قبلی</b> — فقط درس‌هایی که بعد از آخرین ' +
    'مرورِ همین مجموعه اضافه شده‌اند (اگر قبلاً مرور نگرفته، این گزینه نمی‌آید).<br>' +
    '• <b>فقط درس‌هایی که تیک می‌زنم</b> — فهرستِ درس‌های همان مجموعه باز ' +
    'می‌شود و هرکدام را خواستید تیک می‌زنید (با دکمهٔ «همه»/«هیچ»).</div>' +
    'بعد دکمهٔ <b>«همین حالا بساز»</b> را بزنید: مجموعهٔ اول همان لحظه نوشته ' +
    'می‌شود و بقیه شب‌به‌شب پشتِ سرش — چون هر بار فقط یک درس‌نامه می‌تواند در ' +
    'حالِ صداگذاری باشد.' +
    /* ══ «آیا می‌افتد رو دورِ خودکار تا تیکش را بردارم؟» (۶٫۴۱) ══
       نه — و این باید *نوشته* شود، نه از رفتار استنباط. تیک‌ها هیچ‌جا ذخیره
       نمی‌شوند (هر بار از نو حساب می‌شوند) و هر مجموعه به‌محضِ ساخته‌شدنِ
       مرورش از صف بیرون می‌رود. ترسِ «یک تیکِ فراموش‌شده که هر شب یک قسمت
       می‌سازد» ترسِ بی‌جایی نیست؛ فقط جوابش جایی نوشته نشده بود. */
    '<div style="margin-top:4px"><b>تکرار نمی‌شود:</b> تیک‌ها ذخیره نمی‌شوند و ' +
    'هر مجموعه پس از ساخته‌شدنِ مرورش از صف بیرون می‌رود. مجموعه‌ای که یک بار ' +
    'مرور گرفته، دیگر خودکار مرور نمی‌گیرد — فقط اگر خودتان دوباره تیکش بزنید.</div>' +
    '<div style="margin-top:4px">تیکِ پیش‌فرض روی مجموعه‌هایی است که مرور ' +
    'نگرفته‌اند و دستِ‌کم ' + faNum_(Number(CFG.RECAP_MIN_PARTS) || 8) +
    ' درس دارند؛ بقیه را خودتان می‌توانید بزنید.</div></div>' +
    '<div><b>' + faNum_(made) + '</b> مجموعه مرور دارد · ' +
    '<b>' + faNum_(none) + '</b> هنوز نه · ' +
    '<b>' + faNum_(def) + '</b> از پیش تیک خورده' +
    (behind ? ' · <span style="color:#8a6d1f">' + faNum_(behind) +
              ' مرورِ عقب‌افتاده (درسِ تازه پس از مرور)</span>' : '') +
    (queued ? ' · <span style="color:#166534">' + faNum_(queued) + ' در صف</span>' : '') +
    '</div>' +
    '<div style="margin-top:8px">' +
    '<button onclick="recapRun(this)">همین حالا بساز (مجموعه‌های تیک‌خورده)</button> ' +
    '<button onclick="recapNone()">برداشتنِ همهٔ تیک‌ها</button> ' +
    '<button onclick="recapDefault()">بازگرداندنِ تیکِ پیش‌فرض</button></div>' +
    '<div class="sub" id="rcMsg" style="margin-top:6px"></div></div>';
}

/**
 * هشدارِ ترتیب، چسبیده به نامِ همان مجموعه.
 *
 * ══ چرا اینجا و نه فقط در ایمیل ══
 * لحظه‌ای که این هشدار به کار می‌آید، لحظه‌ای است که آدم دارد مجموعه‌ای را
 * برای تولید انتخاب می‌کند. همان قاعدهٔ ۵٫۶۱ (تقویم) و ۵٫۸۷ (جزوه): کنترل و
 * خبر، کنارِ کاری که به آن مربوط‌اند.
 */
function orderWarnHtml_(o) {
  if (!o) return '';
  var w = [];
  if (o.flat) w.push('هیچ قسمتی شمارهٔ قسمت ندارد — ترتیب از ردیفِ شیت می‌آید');
  if (o.dup && o.dup.length) w.push('شمارهٔ تکراری: ' + o.dup.map(faNum_).join('، '));
  if (o.gaps && o.gaps.length) w.push('جای خالی: ' + o.gaps.map(faNum_).join('، '));
  if (o.unnamed) w.push(faNum_(o.unnamed) + ' قسمتِ بی‌نام');
  if (o.alien && o.alien.length) {
    w.push(faNum_(o.alien.length) + ' قسمت با نامِ مجموعهٔ دیگر («' +
           bEsc_(String(o.alien[0].stem || '')) + '»)');
  }
  if (!w.length) return '';
  var col = o.severe ? '#8a1f1f' : '#8a6d1f';
  return '<div class="sub" style="color:' + col + ';margin-top:3px">' +
         (o.severe ? '⚠ ترتیب: ' : 'ترتیب: ') + bEsc_(w.join(' · ')) + '</div>';
}

/** جعبهٔ بالای تخته: حالِ کلیِ جزوه‌ها و یک دکمه برای همه. */
function handoutPanelHtml_(d) {
  /* ردیف‌ها زیرِ `groups[].series` هستند، نه در `d.rows`. نوشتنِ `d.rows`
     هیچ خطایی نمی‌داد — فقط آرایهٔ خالی و جعبه‌ای که بی‌صدا رندر نمی‌شد.
     همان «ظاهرِ درست، رفتارِ هیچ» که این ریپو بارها گرفته. */
  var rows = [];
  var gs = (d && d.groups) || [];
  for (var g = 0; g < gs.length; g++) rows = rows.concat(gs[g].series || []);
  var made = 0, lessons = 0, produced = 0, due = 0, behind = 0;
  for (var i = 0; i < rows.length; i++) {
    var x = rows[i];
    var mk = Number(x.handout && x.handout.produced) || Number(x.episodes) || 0;
    if (!mk) continue;
    produced += mk;
    due += (x.handoutDue || 0);
    if (x.handout && x.handout.totCh) {
      made++; lessons += (x.handout.lessons || 0);
      if (mk > (x.handout.lessons || 0)) behind++;
    } else behind++;
  }
  if (!produced) return '';
  return '<h2><span>جزوهٔ مجموعه‌ها</span>' +
    '<span class="sub">هر مجموعه یک جزوه، در پوشهٔ خودش</span></h2>' +
    '<div class="card"><div class="sub" style="margin-bottom:8px">' +
    'جزوه با هر قسمتِ تازه خودکار به‌روز می‌شود؛ مطلبی که تکمیلِ درسِ قبلی ' +
    'باشد در همان‌جا می‌نشیند، نه ته جزوه. تاریخچهٔ کامل در تبِ «' +
    bEsc_(CFG.HANDOUT_TAB || 'کاربردِ جزوه') + '».</div>' +
    '<div><b>' + faNum_(made) + '</b> جزوه ساخته شده · ' +
    '<b>' + faNum_(lessons) + '</b> از <b>' + faNum_(produced) + '</b> درس وارد شده' +
    (behind ? ' · <span style="color:#8a6d1f">' + faNum_(behind) +
              ' مجموعه عقب است</span>' : '') +
    (due ? ' · ' + faNum_(due) + ' درس در صف' : '') + '</div>' +
    '<div style="margin-top:8px"><button onclick="handoutAll(this)">' +
    'واردکردنِ قسمت‌های گذشته و ساختِ جزوه‌ها</button></div>' +
    '<div class="sub" id="hoMsg" style="margin-top:6px"></div></div>';
}

function calPanelHtml_() {
  var d = null;
  try { d = calBoardData_(); } catch (e) { return ''; }
  if (!d) return '';

  var H = ['<div class="card"><div style="font-weight:700;margin-bottom:6px">' +
           '📅 تقویمِ تولید</div>' +
           '<div class="sub" style="margin-bottom:10px">' +
           'اینجا تعیین می‌کنید هر برنامه کدام روزها ساخته شود. ' +
           'ستونِ «آخرین تصمیم» را خودِ موتور می‌نویسد — تنها راهِ مطمئن‌شدن از ' +
           'اینکه تنظیم واقعاً اعمال شده.' +
           (d.today ? ' امروز: ' + bEsc_(d.today.fa) + '، ' + bEsc_(d.today.weekday) : '') +
           '</div>'];

  if (!d.enabled) {
    H.push('<div class="warn">تقویم در تنظیماتِ کد خاموش است (CAL_ENABLED)؛ ' +
           'همهٔ برنامه‌ها هر روز ساخته می‌شوند و تنظیمِ زیر اثری ندارد.</div>');
  }
  if (!d.shows.length) {
    H.push('<div class="sub">هنوز برنامه‌ای ثبت نشده.</div></div>');
    return H.join('');
  }

  for (var i = 0; i < d.shows.length; i++) {
    var sx = d.shows[i];
    var id = 'cal' + i;
    H.push('<div id="' + id + '" data-key="' + bEsc_(sx.key) + '" ' +
           'style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:8px">');
    H.push('<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
           '<label style="font-weight:700"><input type="checkbox" class="calOn"' +
           (sx.on ? ' checked' : '') + '> ' + bEsc_(sx.name) + '</label>' +
           '<span class="sub">' + (sx.on ? 'روشن' : '⏸ متوقف') + '</span></div>');

    H.push('<div style="margin-top:8px">روزهای تولید: ');
    for (var w = 0; w < FA_WEEKDAYS.length; w++) {
      H.push('<label style="margin-left:10px;white-space:nowrap">' +
             '<input type="checkbox" class="calDay" data-d="' + w + '"' +
             (sx.days[w] ? ' checked' : '') + '> ' + bEsc_(FA_WEEKDAYS[w]) + '</label>');
    }
    H.push('</div>');

    H.push('<div style="margin-top:8px">' +
           '<div class="sub">استثناها — هر خط یکی. نمونه (فقط نمونهٔ قالب است، ' +
           'نه تنظیمِ شما):<br>' +
           '<code>۱۴۰۵/۰۶/۱۰ تا ۱۴۰۵/۰۶/۱۵ = تعطیل</code> &nbsp; ' +
           '<code>۱۴۰۵/۰۶/۲۰ = فعال</code></div>' +
           '<textarea class="calExc" rows="2" style="width:100%;box-sizing:border-box;' +
           'margin-top:4px;padding:6px;border:1px solid #cbd5e1;border-radius:6px;' +
           'font:inherit">' + bEsc_(sx.exceptions) + '</textarea></div>');

    H.push('<div style="margin-top:8px;display:flex;align-items:center;gap:10px;' +
           'flex-wrap:wrap">' +
           '<button onclick="calSave(this)" data-box="' + id + '">ذخیرهٔ این برنامه</button>' +
           '<span class="sub">آخرین تصمیمِ موتور: ' +
           bEsc_(sx.last || 'هنوز اجرا نشده') + '</span></div>');
    H.push('</div>');
  }

  H.push('<div class="sub">اجرای دستی از منو هیچ‌وقت مسدود نمی‌شود، و قسمتی که ' +
         'صداگذاری‌اش شروع شده تا آخر تمام می‌شود.</div>');
  H.push('</div>');
  return H.join('');
}

// --------------------------------------------------------- توابع منو و پنجره

/** منو: نمایش تختهٔ مجموعه‌ها. */
function showSeriesBoard() {
  var ui = ui_();
  var html = uiBoardHtml();
  if (!ui) { console.log(html.slice(0, 400)); return html; }
  var out = HtmlService.createHtmlOutput(html).setWidth(1000).setHeight(680);
  ui.showModalDialog(out, 'مجموعه‌های آموزشی و پیشرفت تولید');
}

/** همان HTML، برای بازخوانیِ پنجره بعد از هر انتخاب. */
function uiBoardHtml() {
  var hub = getHub_();
  // اگر رجیستری کهنه است، همین‌جا تازه‌اش کن تا فهرست همیشه به‌روز دیده شود
  var scanned = null;
  try { scanned = scanSeries(false); } catch (e) {}
  // مجموعهٔ تازه‌کشف‌شده اولویت ندارد و در فهرست «—» دیده می‌شد. اگر اسکن
  // واقعاً چیزی تازه کرد، همین‌جا ترتیبِ درسی را هم به‌روز می‌کنیم تا آنچه
  // می‌بینید همان چیزی باشد که موتور بر پایه‌اش تصمیم می‌گیرد.
  // فقط وقتی ردیفِ بی‌اولویت داریم — وگرنه هر بار بازکردنِ پنجره یک فراخوانِ
  // مدل می‌شد و پنجره چند ثانیه معلق می‌ماند.
  if (scanned && !scanned.skipped) {
    try {
      var rg0 = readSeriesReg_(hub), needPlan = false;
      for (var z = 0; z < rg0.rows.length; z++) {
        if (String(rg0.rows[z].vals[SC.STATUS - 1] || '') === SST.SKIPPED) continue;
        if (!String(rg0.rows[z].vals[SC.ORDER - 1] || '').toString().trim()) { needPlan = true; break; }
      }
      if (needPlan) rankWithinCategories_(hub, rg0);
    } catch (eP) {}
  }
  return seriesBoardHtml_(seriesBoardData_(hub));
}

/**
 * ذخیرهٔ تقویمِ یک برنامه از تخته.
 *
 * کارِ واقعی در بخشِ ۲۵ است (calBoardSave_) و همان‌جا روی همان تبی می‌نویسد
 * که calGate_ می‌خواند. اینجا فقط پوسته است: پیام برای پنجره، و try/catch
 * چون بخشِ ۲۵ بالاتر از ۱۵ است.
 */
/* ── دکمه‌های جزوه ──
   کارِ واقعی در بخشِ ۲۶ است و همان‌جا سنجه دارد؛ اینجا فقط پوسته است، تا
   اگر پنجره بشکند ساختِ جزوه نشکند (همان مرزی که ۵٫۶۱ برای تقویم گذاشت). */
function uiHandoutSeries(key) {
  try {
    var r = handoutOneSeries_(key, Math.max(1, Number(CFG.HANDOUT_MAX_PER_RUN) || 2));
    var msg = 'جزوه: ' + r.done + ' درس ساخته شد' +
              (r.reset ? '، ' + r.reset + ' درسِ رهاشده از نو امتحان شد' : '') +
              (r.queued ? '، ' + r.queued + ' درسِ گذشته به صف رفت' : '') +
              (r.left ? '، ' + r.left + ' در صف مانده (کارِ شبانه ادامه می‌دهد)' : '') + '.';
    if (r.notes && r.notes.length) msg += ' — ' + r.notes.slice(0, 3).join(' · ');
    // قالبِ پاسخ همانِ بقیهٔ دکمه‌هاست: {message}. رشتهٔ خالی یعنی پنجره
    // «انجام شد.» می‌گوید و همهٔ جزئیات را دور می‌ریزد.
    return { ok: true, message: msg };
  } catch (e) { return { ok: false, message: 'جزوه ساخته نشد: ' + e.message }; }
}

/* ── دکمه‌های مرورِ بزرگ ──
   همان مرزِ همیشگی: کارِ واقعی در بخشِ ۳۰ است و آنجا سنجه دارد؛ اینجا فقط
   پوسته است، تا پنجرهٔ شکسته ساختِ مرور را نشکند. */
function uiRecapQueue(keys, scopes) {
  try {
    /* رشته‌ای که آدم تایپ کرده، همین‌جا به عدد تبدیل می‌شود — و با فهرستِ
       درس‌های موجود سنجیده. تجزیه در بخشِ ۳۰ است چون سنجه‌اش آنجاست؛ اینجا
       فقط شکلِ ورودی درست می‌شود. */
    var sc = {}, raw = scopes || {};
    for (var k in raw) if (Object.prototype.hasOwnProperty.call(raw, k)) {
      var o = raw[k] || {};
      sc[k] = { mode: String(o.mode || 'all'), eps: recapParseEps_(o.eps || '') };
    }
    var q = recapQueueSet_(keys || [], getHub_(), sc);
    if (!q.n) {
      return { ok: false, message: 'هیچ مجموعهٔ معتبری تیک نخورده بود ' +
        '(مجموعه‌ای که هنوز قسمتی از آن ساخته نشده مرور نمی‌گیرد؛ و «فقط ' +
        'درس‌هایی که تیک می‌زنم» بدونِ حتی یک درسِ تیک‌خورده، سفارشِ خالی است).' };
    }
    var r = recapRunNext_();
    var head = 'مرورِ بزرگ: ' + faDigitsOut_(String(q.n)) + ' مجموعه سفارش داده شد';
    if (r && r.ok) {
      return { ok: true, message: head + '. «' + r.series + '» همین حالا نوشته شد ' +
        '(قسمت ' + faDigitsOut_(String(r.episode)) + '، ' +
        faDigitsOut_(String(r.sections)) + ' بخش' +
        (r.scope ? '، دامنه: ' + r.scope : '') +
        ') و صداگذاری‌اش در اجرای بعد شروع می‌شود' +
        (r.queueLeft ? '؛ ' + faDigitsOut_(String(r.queueLeft)) +
                       ' مجموعه در صف ماند و شب‌به‌شب ساخته می‌شوند' : '') + '.' };
    }
    var why = {
      busy: 'درس‌نامهٔ دیگری در حالِ صداگذاری است؛ صف سرِ جایش می‌ماند و کارِ شبانه ادامه می‌دهد.',
      'no-handout': 'متنِ جمع‌شدهٔ درس‌های آن مجموعه هنوز آماده نیست؛ هر شب خودش ' +
                    'ساخته می‌شود، فردا دوباره امتحان کنید.',
      write: 'مدل متنی برنگرداند؛ کارِ شبانه دوباره امتحان می‌کند.',
      'scope-empty': 'درس‌هایی که تیک زدید هیچ متنی برای مرور ندارند.',
      none: 'مجموعهٔ معتبری پیدا نشد.',
      off: 'قابلیت خاموش است (RECAP_ENABLED).'
    }[r && r.reason] || String((r && r.reason) || 'نامعلوم');
    return { ok: true, message: head + '، ولی همین حالا شروع نشد — ' + why };
  } catch (e) { return { ok: false, message: 'سفارشِ مرور ثبت نشد: ' + e.message }; }
}

function uiHandoutAll() {
  try {
    var b = handoutBackfill_(Number(CFG.HANDOUT_SCAN_MAX) || 25);
    var r = handoutRunDue_(Math.max(1, Number(CFG.HANDOUT_MANUAL_MAX) || 12),
                           Number(CFG.HANDOUT_MANUAL_MS) || 210000);
    var left = 0;
    try { left = handoutDueList_().length; } catch (e2) {}
    return { ok: true, message:
      'جزوه: ' + b.queued + ' درسِ گذشته از ' + b.series + ' مجموعه به صف رفت، ' +
      r.done + ' همین حالا ساخته شد، ' + left + ' در صف مانده' +
      (left ? (r.ranOut ? ' (وقتِ این اجرا تمام شد — دوباره بزنید یا بگذارید کارِ شبانه ادامه دهد)'
                        : ' (کارِ شبانه ادامه می‌دهد)') : '') +
      (b.wrapped ? ' · کاوشِ همهٔ مجموعه‌ها یک دور کامل شد' : '') + '.' };
  } catch (e) { return { ok: false, message: 'جزوه‌ها ساخته نشدند: ' + e.message }; }
}

function uiCalSave(key, on, days, exc) {
  try {
    var r = calBoardSave_(key, !!on, days || [], exc || '');
    var msg = 'تقویم ذخیره شد — ' + (r.on ? 'روشن' : '⏸ متوقف') + ' · ' + r.days + '.';
    if (r.note) msg += ' (' + r.note + ')';
    return { ok: true, message: msg };
  } catch (e) {
    return { ok: false, message: 'ذخیرهٔ تقویم انجام نشد: ' + e.message };
  }
}

/** انتخاب دستیِ یک مجموعه. `act` از خودِ دکمه می‌آید: 'pin' یا 'unpin'.
    اگر خالی باشد (پنجرهٔ کهنه) همان رفتارِ کلید‌گردانِ قبلی را دارد. */
function uiPinSeries(key, act) {
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  var rec = Object.prototype.hasOwnProperty.call(reg.byKey, String(key))
              ? reg.byKey[String(key)] : null;
  if (!rec) return { ok: false, message: 'مجموعه پیدا نشد. پنجره را ببندید و «اسکن مجموعه‌های آموزشی» را بزنید.' };
  var nm = String(rec.vals[SC.NAME - 1] || key);
  var pin = seriesPin_();
  var isPinned = !!(pin && pin.kind === 'series' && pin.value === String(key));
  var a = String(act || '');
  if (a !== 'pin' && a !== 'unpin') a = isPinned ? 'unpin' : 'pin';   // سازگاری با پنجرهٔ کهنه

  if (a === 'unpin') {
    if (!isPinned) {
      // دکمهٔ کهنه: این مجموعه دیگر انتخابِ دستی نیست. چیزی را برنمی‌داریم.
      return { ok: true, message: 'این مجموعه از قبل انتخابِ دستی نبود؛ چیزی تغییر نکرد.' };
    }
    clearSeriesPin_();
    logLine_('انتخاب دستی برداشته شد (مجموعهٔ «' + nm + '»).');
    return { ok: true, message: 'انتخاب دستی برداشته شد. موتور به ترتیبِ خودکار برمی‌گردد.' };
  }

  // ردیفِ «نادیده گرفته شد» هیچ‌وقت نوبت نمی‌گیرد؛ پس انتخابش را نمی‌پذیریم
  if (String(rec.vals[SC.STATUS - 1] || '') === SST.SKIPPED) {
    return { ok: false, message: 'مجموعهٔ «' + nm + '» در فهرست «نادیده گرفته شد» است ' +
      '(ردیفش دیگر در شیت‌های منبع پیدا نمی‌شود). انتخاب دستی ثبت نشد. ' +
      'اگر فایل‌هایش برگشته‌اند، «اسکن مجموعه‌های آموزشی» را بزنید تا دوباره زنده شود.' };
  }

  // ── نگهبان: مجموعه‌ای که قطعهٔ ساخته‌نشده ندارد، انتخابِ دستی نمی‌شود ──
  // وگرنه سنجاق ثبت می‌شد، هیچ قسمتی ساخته نمی‌شد و همان مجموعه بی‌جهت
  // «تمام‌شده» علامت می‌خورد.
  if (!seriesHasWork_(hub, String(key))) {
    return { ok: false, message: 'مجموعهٔ «' + nm + '» قطعهٔ ساخته‌نشده‌ای ندارد؛ ' +
      'کارش تمام شده است. انتخاب دستی ثبت نشد و موتور به کارِ فعلی‌اش ادامه می‌دهد. ' +
      'اگر قسمتِ تازه‌ای به این مجموعه اضافه کرده‌اید، اول «اسکن مجموعه‌های آموزشی» را بزنید.' };
  }

  setSeriesPin_('series', String(key));
  logLine_('انتخاب دستی: از این پس روی مجموعهٔ «' + nm + '» کار می‌شود.');
  return { ok: true, message: 'انتخاب شد: «' + nm + '». ' +
    'قسمتِ بعدی — چه خودکار و چه با دکمهٔ دستی — از همین مجموعه ساخته می‌شود و به ترتیب ' +
    'جلو می‌رود. همین که تمام شد، موتور خودش به مجموعهٔ قبلی برمی‌گردد.' };
}

/** انتخاب دستیِ یک دسته. `act`: 'pin' یا 'unpin'. */
function uiPinCategory(cat, act) {
  var hub = getHub_();
  var c = String(cat === null || cat === undefined ? '' : cat).trim();
  var pin = seriesPin_();
  var isPinned = !!(pin && pin.kind === 'cat' && String(pin.value).trim() === c);
  var a = String(act || '');
  if (a !== 'pin' && a !== 'unpin') a = isPinned ? 'unpin' : 'pin';

  if (a === 'unpin') {
    if (!isPinned) return { ok: true, message: 'این دسته از قبل انتخابِ دستی نبود؛ چیزی تغییر نکرد.' };
    clearSeriesPin_();
    logLine_('انتخاب دستی برداشته شد (دستهٔ «' + c + '»).');
    return { ok: true, message: 'انتخاب دستی برداشته شد.' };
  }

  // نگهبان: دسته‌ای که هیچ مجموعهٔ ناتمامی ندارد، انتخابِ دستی نمی‌شود
  var reg = readSeriesReg_(hub);
  var parts = readSeriesParts_(hub);
  var found = false, live = 0, skipped = 0;
  for (var i = 0; i < reg.rows.length; i++) {
    var r = reg.rows[i];
    if (seriesCatOf_(r.vals) !== c) continue;
    found = true;
    if (String(r.vals[SC.STATUS - 1] || '') === SST.SKIPPED) { skipped++; continue; }
    // موردی که داوری «آموزشی نیست» تشخیص داده، با سنجاقِ دسته هم ساخته نمی‌شود؛
    // پس نباید در شمارشِ «مجموعهٔ ناتمام» بیاید و وعدهٔ الکی بدهد.
    if (!seriesEligible_(r.vals, r.key, null)) continue;
    if (seriesHasWork_(hub, r.key, parts)) live++;
  }
  if (!found) return { ok: false, message: 'دستهٔ «' + c + '» در فهرست نیست. ' +
    'پنجره را ببندید و دوباره باز کنید.' };
  if (!live) return { ok: false, message: (skipped && live === 0 && skipped >= 1 ?
      'مجموعه‌های دستهٔ «' + c + '» یا تمام شده‌اند یا «نادیده گرفته شد» علامت خورده‌اند' :
      'همهٔ مجموعه‌های دستهٔ «' + c + '» تمام شده‌اند') +
    '؛ قطعهٔ ساخته‌نشده‌ای برای تولید نمانده. انتخاب دستی ثبت نشد و موتور به کارِ فعلی‌اش ادامه می‌دهد.' };

  setSeriesPin_('cat', c);
  logLine_('انتخاب دستی: از این پس روی دستهٔ «' + c + '» کار می‌شود.');
  return { ok: true, message: 'دستهٔ «' + c + '» انتخاب شد (' + faNum_(live) + ' مجموعهٔ ناتمام). ' +
    'موتور مقدماتی‌ترین مجموعهٔ همین دسته را برمی‌دارد و به ترتیب جلو می‌رود.' };
}

/** نظرِ دستیِ شما: «این آموزشی است» یا «آموزشی نیست». */
function uiSetCourse(key, act) {
  var hub = getHub_();
  var a = String(act || 'course');
  var dec = (a === 'notcourse') ? SMAN.NO : (a === 'auto' ? '' : SMAN.YES);
  var r = setSeriesManual_(hub, key, dec);
  if (!r.ok) return r;
  if (dec === SMAN.YES) {
    return { ok: true, message: 'ثبت شد: «' + r.name + '» از این پس آموزشی حساب می‌شود و ' +
      'ذیل دستهٔ خودش در نوبتِ درس‌نامه می‌آید. داوریِ خودکار دیگر رویش دست نمی‌گذارد.' };
  }
  if (dec === SMAN.NO) {
    return { ok: true, message: 'ثبت شد: «' + r.name + '» از فهرستِ درس‌نامه کنار رفت. ' +
      'در برنامهٔ «' + CFG.SHOW_NAME + '» عیناً استفاده می‌شود.' };
  }
  return { ok: true, message: '«' + r.name + '» به داوریِ خودکار برگشت.' };
}

/**
 * ثبتِ شماره و دسته و زیر‌دستهٔ دستیِ یک مجموعه — و اصلاحِ گذشته.
 *
 * سه قاعدهٔ خواسته‌شده:
 *   ۱) این تنظیم بر همهٔ سازوکارهای خودکار مقدم است و آن ردیف را برای داوری
 *      و مرتب‌سازیِ خودکار «قفل» می‌کند (seriesManualLock_).
 *   ۲) قسمت‌های قبلاً ساخته‌شدهٔ همان مجموعه هم به‌روز می‌شوند: نامِ
 *      شماره‌دارِ پوشهٔ مجموعه در درایو، و پروندهٔ وضعیتِ هر قسمت.
 *   ۳) هیچ چیزی در شیت‌های منبع دست نمی‌خورد — همهٔ این‌ها در CONTENT-HUB و
 *      پوشهٔ OUTPUT است.
 */
function uiSetManual(key, numStr, cat, sub) {
  var hub = getHub_();
  var reg = readSeriesReg_(hub);
  var rec = Object.prototype.hasOwnProperty.call(reg.byKey, String(key))
              ? reg.byKey[String(key)] : null;
  if (!rec) return { ok: false, message: 'مجموعه پیدا نشد.' };

  var raw = faDigits_(String(numStr === null || numStr === undefined ? '' : numStr)).trim();
  var num = '';
  if (raw) {
    var n = Number(raw);
    if (!isFinite(n) || n < 1 || n !== Math.floor(n) || n > 9999) {
      return { ok: false, message: 'شماره باید یک عددِ صحیحِ از ۱ به بالا باشد (یا خالی).' };
    }
    num = String(n);
  }
  var c = String(cat === null || cat === undefined ? '' : cat).trim().slice(0, 60);
  var su = String(sub === null || sub === undefined ? '' : sub).trim().slice(0, 60);
  if (su && !c && !String(rec.vals[SC.CAT - 1] || '').trim()) {
    return { ok: false, message: 'زیر‌دسته بدونِ دسته معنا ندارد؛ اول دسته را بدهید.' };
  }

  rec.vals[SC.MORDER - 1] = num;
  rec.vals[SC.MCAT - 1] = c;
  rec.vals[SC.MSUB - 1] = su;
  rec.vals[SC.UPDATED - 1] = nowStr_();
  var lockOn = !!(num || c);
  var revived = false;
  // ردیفی که صافیِ ساختاری «نادیده» کرده بود، با قفلِ دستی زنده می‌شود؛
  // وگرنه پیامِ «ساخته می‌شود» دروغ بود — انتخاب‌کننده ردیفِ نادیده را
  // پیش از هر شرطی کنار می‌گذارد.
  if (lockOn && String(rec.vals[SC.STATUS - 1] || '') === SST.SKIPPED) {
    rec.vals[SC.STATUS - 1] = SST.NEW;
    rec.vals[SC.NOTE - 1] = 'با تنظیمِ دستی به فهرست برگشت (' + nowStr_() + ')';
    revived = true;
  }
  try { reg.sheet.getRange(rec.row, 1, 1, SERIES_HEADERS.length).setValues([rec.vals]); }
  catch (e) { return { ok: false, message: 'نوشتن ناموفق: ' + e.message }; }

  var nm = String(rec.vals[SC.NAME - 1] || key);
  var fixed = [];
  try { fixed = applyManualSeriesPast_(reg, rec); }
  catch (eP) { fixed = ['اصلاحِ گذشته ناقص ماند: ' + eP.message]; }

  logLine_('تنظیمِ دستیِ مجموعهٔ «' + nm + '»: ' +
           (num ? 'شماره ' + num : 'بی‌شماره') +
           (c ? '، دسته «' + c + '»' : '') + (su ? '، زیر‌دسته «' + su + '»' : '') +
           (revived ? '، و از «نادیده» به فهرست برگشت' : '') +
           (fixed.length ? ' — ' + fixed.join('؛ ') : '') + '.');
  // پیام واردِ innerHTML پنجره می‌شود؛ هر چه از کاربر یا درایو آمده esc می‌شود
  return { ok: true, message: 'ثبت شد: «' + bEsc_(nm) + '»' +
           (num ? ' — شمارهٔ ' + num + ' (در نوبت‌دهی پیش از همهٔ ترتیب‌های خودکار می‌نشیند؛ ' +
                  'فقط مجموعه‌ای که همین حالا نیمه‌کاره در حال تولید است، اول تمام می‌شود)' : '') +
           (c ? ' — دستهٔ «' + bEsc_(c) + '»' + (su ? ' / «' + bEsc_(su) + '»' : '') : '') +
           (revived ? ' — و از «نادیده گرفته شد» به فهرست برگشت' : '') +
           (lockOn ? '. این مجموعه از این پس برای داوری و مرتب‌سازیِ خودکار قفل است.'
                   : '. تنظیمِ دستی برداشته شد.') +
           (fixed.length ? '<br>' + fixed.map(bEsc_).join('<br>') : '') };
}

function uiClearManual(key) {
  return uiSetManual(key, '', '', '');
}

/**
 * اصلاحِ ردپای گذشتهٔ یک مجموعه پس از تنظیمِ دستی. برمی‌گرداند فهرستِ
 * خواناییِ کارهایی که واقعاً انجام شد.
 *
 * چه چیزهایی شماره/دسته را حمل می‌کنند و باید عوض شوند:
 *   • نامِ پوشهٔ مجموعه در درایو: «NN — نام» — شماره‌اش از ترتیبِ برنامه
 *     می‌آمد؛ حالا از شمارهٔ دستی.
 *   • پروندهٔ «_special.json» هر قسمتِ ساخته‌شده: فیلد seriesCat.
 * نامِ فایل‌های صوتی و اسناد، شماره و دسته ندارند (فقط نامِ مجموعه و شمارهٔ
 * قسمت را دارند که هیچ‌کدام عوض نشده)، پس سالم‌اند و دست نمی‌خورند.
 */
function applyManualSeriesPast_(reg, rec) {
  var out = [];
  var folderId = String(rec.vals[SC.FOLDER - 1] || '');
  if (!folderId) return out;
  var folder = null;
  try { folder = DriveApp.getFolderById(folderId); }
  catch (e) { return out; }

  var cat = seriesCatOf_(rec.vals);

  // ── جای پوشه: زیرِ دستهٔ خودش ──
  // این همان خواستهٔ صریح است که دسته هم مثلِ شماره در درایو اثر بگذارد و
  // برای قسمت‌های قبلی هم عقب‌گرد بخورد.
  try {
    var target = seriesCatFolder_(cat);
    var already = false;
    try {
      var ps = folder.getParents();
      while (ps.hasNext()) { if (ps.next().getId() === target.getId()) { already = true; break; } }
    } catch (ePP) { already = true; }   // نتوانستیم والد را بخوانیم؟ جابه‌جا نکن
    if (!already) {
      folder.moveTo(target);
      out.push('پوشهٔ مجموعه زیرِ دستهٔ «' +
               (cat && cat !== MISC_TITLE ? cat : 'بی‌دسته') + '» منتقل شد');
    }
  } catch (eMv) { out.push('انتقالِ پوشه به دسته نشد: ' + eMv.message); }

  // ── نامِ شماره‌دارِ پوشه ──
  try {
    var mo = seriesMOrder_(rec.vals);
    var order = isFinite(mo) ? mo : (Number(rec.vals[SC.ORDER - 1]) || 0);
    if (order > 0) {
      var want = seriesFolderNo_(order) + ' — ' +
                 String(rec.vals[SC.NAME - 1] || rec.key).slice(0, 70);
      if (folder.getName() !== want) {
        var was = folder.getName();
        folder.setName(want);
        out.push('نامِ پوشه از «' + was + '» به «' + want + '» شد');
      }
    }
  } catch (eN) { out.push('تغییرنامِ پوشه نشد: ' + eN.message); }

  // ── پروندهٔ وضعیتِ قسمت‌های قبلی ──
  try {
    var subs = folder.getFolders(), patched = 0;
    var guard = 0;
    while (subs.hasNext() && guard++ < 400) {
      var epF = subs.next();
      var itJ = epF.getFilesByName('_special.json');
      if (!itJ.hasNext()) continue;
      var fJ = itJ.next();
      try {
        var meta = JSON.parse(fJ.getBlob().getDataAsString());
        if (String(meta.seriesKey || '') && String(meta.seriesKey) !== String(rec.key)) continue;
        if (String(meta.seriesCat || '') === cat) continue;
        meta.seriesCat = cat;
        fJ.setContent(JSON.stringify(meta));
        patched++;
      } catch (eOne) {}
    }
    if (patched) out.push('دستهٔ ' + patched + ' قسمتِ قبلی در پروندهٔ وضعیتشان به‌روز شد');
  } catch (eJ) {}
  return out;
}

/** داوریِ محتوایی از داخلِ پنجره. */
function uiJudgeNow() {
  var r;
  try { r = judgeSeries(false, new Date().getTime() + 180 * 1000); }
  catch (e) { return { ok: false, message: 'داوری ناموفق: ' + e.message }; }
  var msg = 'داوری شد: ' + (r.judged || 0) + ' مجموعه' +
            (r.left ? ' · ' + r.left + ' مجموعه ماند (دوباره بزنید)' : ' — چیزی نمانده') + '.';
  return { ok: true, message: msg };
}

function uiClearPin() {
  clearSeriesPin_();
  logLine_('انتخاب دستی برداشته شد.');
  return { ok: true, message: 'انتخاب دستی برداشته شد. موتور به ترتیبِ خودکار برمی‌گردد.' };
}
