/* Faithful-enough Apps Script mock so the real .gs engine can be executed and
   inspected in Node against the actual archive rows. */
const fs = require('fs');

// ---------------------------------------------------------------- Utilities
function b64encode(bytes) {
  const buf = Buffer.from(bytes.map(b => (b < 0 ? b + 256 : b)));
  return buf.toString('base64');
}
function b64decode(s) {
  const buf = Buffer.from(s, 'base64');
  return Array.from(buf).map(b => (b > 127 ? b - 256 : b));
}
global.Utilities = {
  base64Encode: b64encode,
  base64Decode: b64decode,
  newBlob(bytes, mime, name) {
    const data = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') :
                 Buffer.from(bytes.map(b => (b < 0 ? b + 256 : b)));
    return {
      _data: data, _mime: mime, _name: name,
      getName() { return this._name; },
      setName(n) { this._name = n; return this; },
      getBytes() { return Array.from(this._data); },
      getDataAsString() { return this._data.toString('utf8'); },
      // Blobِ واقعیِ Apps Script این را دارد؛ نبودنش در ماک یعنی کدی که
      // درست از آن استفاده می‌کند، در آزمون می‌شکند و در واقعیت نه.
      getContentType() { return this._mime; },
      setContentType(m) { this._mime = m; return this; },
      copyBlob() { return global.Utilities.newBlob(Array.from(this._data), this._mime, this._name); }
    };
  },
  formatDate(d, tz, fmt) {
    const p = n => String(n).padStart(2, '0');
    return fmt.replace('yyyy', d.getUTCFullYear()).replace('MM', p(d.getUTCMonth() + 1))
              .replace('dd', p(d.getUTCDate())).replace('HH', p(d.getUTCHours()))
              .replace('mm', p(d.getUTCMinutes())).replace('ss', p(d.getUTCSeconds()));
  },
  sleep() {},
  DigestAlgorithm: { SHA_256: 'SHA_256', MD5: 'MD5' },
  Charset: { UTF_8: 'UTF_8', US_ASCII: 'US_ASCII' },
  computeDigest(alg, value, cs) {
    const crypto = require('crypto');
    const h = crypto.createHash(alg === 'MD5' ? 'md5' : 'sha256')
                    .update(Buffer.from(String(value), 'utf8')).digest();
    // Apps Script بایت‌های علامت‌دار برمی‌گرداند (‎-128..127)
    return Array.from(h).map(b => (b > 127 ? b - 256 : b));
  }
};

// ------------------------------------------------------------ Spreadsheet
let SHEET_SEQ = 1;
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  // TextFinder یک Range برمی‌گرداند و کدِ جست‌وجو از آن فقط شماره‌ردیف
  // می‌خواهد. نبودنِ این سه، مسیرِ واقعی را در آزمون بی‌صدا از کار می‌انداخت.
  getRow() { return this.r; }
  getColumn() { return this.c; }
  getSheet() { return this.sh; }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) {
        const rr = this.sh._d[this.r - 1 + i] || [];
        row.push(rr[this.c - 1 + j] === undefined ? '' : rr[this.c - 1 + j]);
      }
      out.push(row);
    }
    return out;
  }
  setValues(v) {
    if (v.length !== this.nr) throw new Error(`setValues rows ${v.length} != range ${this.nr}`);
    for (let i = 0; i < v.length; i++) {
      if (v[i].length !== this.nc) throw new Error(`setValues cols ${v[i].length} != range ${this.nc} (row ${i})`);
      const ri = this.r - 1 + i;
      this.sh._d[ri] = this.sh._d[ri] || [];
      for (let j = 0; j < v[i].length; j++) this.sh._d[ri][this.c - 1 + j] = v[i][j];
    }
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
  getValue() { return this.getValues()[0][0]; }
  clearContent() {
    for (let i = 0; i < this.nr; i++) {
      const ri = this.r - 1 + i;
      if (!this.sh._d[ri]) continue;
      for (let j = 0; j < this.nc; j++) this.sh._d[ri][this.c - 1 + j] = '';
    }
    return this;
  }
  setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; }
  setNumberFormat() { return this; }
}
class Sheet {
  constructor(name) { this._n = name; this._d = []; this._id = SHEET_SEQ++; this._max = 1000; }
  getName() { return this._n; }
  getSheetId() { return this._id; }
  getLastRow() { let m = 0; this._d.forEach((r, i) => { if (r && r.some(c => c !== '' && c != null)) m = i + 1; }); return m; }
  getLastColumn() { let m = 0; this._d.forEach(r => { if (r) m = Math.max(m, r.length); }); return m; }
  getRange(r, c, nr, nc) {
    nr = nr === undefined ? 1 : nr; nc = nc === undefined ? 1 : nc;
    if (nr < 1) throw new Error('The number of rows in the range must be at least 1');
    if (r + nr - 1 > this._max) throw new Error('The coordinates or dimensions of the range are invalid.');
    return new Range(this, r, c, nr, nc);
  }
  appendRow(v) { this._d[this.getLastRow()] = v.slice(); return this; }
  setFrozenRows() { return this; } setRightToLeft() { return this; } autoResizeColumns() { return this; }
  getMaxRows() { return this._max; }
  insertRowsAfter(after, n) { this._max += n; return this; }
  getMaxColumns() { return this._maxc || (this._maxc = 26); }
  insertColumnsAfter(after, n) { this._maxc = this.getMaxColumns() + n; return this; }
  setColumnWidth() { return this; }
  getParent() { return this._p || null; }
  /* ══ چرا TextFinder در ماک هست ══
     بخشِ ۳۴ روی همین می‌گردد، و دلیلش اندازه است: پنج شیتِ منبع روی هم
     ~۱۱۲ مگابایت‌اند و `getValues` هرگز از پسشان برنمی‌آید. اگر ماک این را
     نداشته باشد، هر آزمونِ جست‌وجو یا باید مسیرِ واقعی را دور بزند (که یعنی
     چیزی را نمی‌سنجد) یا بی‌صدا هیچ نتیجه‌ای نگیرد و سبز بماند — همان
     «نگهبانی که یک در را نمی‌بیند». */
  createTextFinder(q) {
    const sheet = this;
    let re = null, useRe = false, caseS = false, whole = false;
    const build = () => {
      const flags = caseS ? 'g' : 'gi';
      if (useRe) { try { return new RegExp(q, flags + 'u'); } catch (e) { return new RegExp(q, flags); } }
      return new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    };
    let idx = 0, hits = null;
    const scan = () => {
      re = build(); hits = [];
      for (let r = 0; r < sheet._d.length; r++) {
        const row = sheet._d[r]; if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const v = row[c]; if (v === '' || v == null) continue;
          const t = String(v);
          re.lastIndex = 0;
          const ok = whole ? (caseS ? t === q : t.toLowerCase() === String(q).toLowerCase())
                           : re.test(t);
          if (ok) hits.push(new Range(sheet, r + 1, c + 1, 1, 1));
        }
      }
    };
    const api = {
      useRegularExpression(v) { useRe = !!v; hits = null; return api; },
      matchCase(v) { caseS = !!v; hits = null; return api; },
      matchEntireCell(v) { whole = !!v; hits = null; return api; },
      ignoreDiacritics() { return api; },
      matchFormulaText() { return api; },
      findAll() { if (!hits) scan(); return hits.slice(); },
      findNext() { if (!hits) { scan(); idx = 0; } return idx < hits.length ? hits[idx++] : null; }
    };
    return api;
  }
}
class Spread {
  constructor(name, id) { this._n = name; this._id = id || 'SS' + SHEET_SEQ++; this._s = []; }
  getId() { return this._id; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this._id + '/edit'; }
  getSheets() { return this._s; }
  getSheetByName(n) { return this._s.find(s => s._n === n) || null; }
  insertSheet(n) { const s = new Sheet(n); s._p = this; this._s.push(s); return s; }
  deleteSheet(s) { this._s = this._s.filter(x => x !== s); }
  setSpreadsheetTimeZone() {}
}
global.__SS = {};
global.SpreadsheetApp = {
  openById(id) { if (!global.__SS[id]) throw new Error('no such spreadsheet ' + id); return global.__SS[id]; },
  create(name) { const s = new Spread(name); global.__SS[s._id] = s; return s; },
  getUi() { return global.__UI || null; }
};

// ------------------------------------------------------------------- Drive
global.__FILES = [];
global.__FILES_BY_ID = {};
class DFile {
  constructor(blob, folder) { this._b = blob; this._f = folder; this._id = 'F' + (SHEET_SEQ++);
    global.__FILES_BY_ID[this._id] = this; }
  getName() { return this._name || this._b.getName(); }
  setName(n) { this._name = n; if (this._b && this._b.setName) this._b.setName(n); return this; }
  getBlob() { return this._b; }
  // فایلِ واقعیِ درایو این را دارد. نبودنش در ماک یعنی کدی که اندازه را
  // می‌سنجد (مثلِ مدتِ صوت یا سقفِ آپلود) در آزمون بی‌صدا صفر می‌گیرد.
  getSize() { return this._b && this._b.getBytes ? this._b.getBytes().length : 0; }
  getUrl() { return 'https://drive.google.com/file/d/' + this._id + '/view'; }
  getId() { return this._id; }
  moveTo(folder) {
    if (this._f && this._f._files) this._f._files = this._f._files.filter(x => x !== this);
    if (folder && folder._files) { folder._files.push(this); this._f = folder; }
    return this;
  }
  getDateCreated() { return this._created || (this._created = new Date()); }
  getLastUpdated() { return this._updated || this.getDateCreated(); }
  setContent(t) {
    this._b = global.Utilities.newBlob(String(t), this._b && this._b.getContentType ?
      this._b.getContentType() : 'text/plain', this.getName());
    this._updated = new Date();
    return this;
  }
  getAs() { return this._b; }
  // اشتراک — حالتش نگه داشته می‌شود تا آزمون بتواند بپرسد چه چیزی باز شد و
  // مهم‌تر: چه چیزی دوباره بسته شد.
  /* ══ و بدَلی که سهل‌گیرتر از اصل باشد هیچ‌چیز را ثابت نمی‌کند (۷٫۲۴) ══
   * درایو اجازه نمی‌دهد فرزندی بسته‌تر از پوشه‌اش باشد: اگر پوشهٔ بالادست
   * «هرکس با لینک» باشد، `setSharing(PRIVATE)` روی فایل «Access denied:
   * DriveApp» پرت می‌کند. تا ۷٫۴۵ این بدَل قبولش می‌کرد، پس باگی که چهار
   * شب در سیاههٔ واقعی نشسته بود در هیچ مجموعه‌ای دیده نمی‌شد. */
  setSharing(access, perm) {
    if (String(access) === 'PRIVATE') {
      let p = this._f;
      while (p) {
        if (p.getSharingAccess && p.getSharingAccess() !== 'PRIVATE') {
          throw new Error('Access denied: DriveApp');
        }
        const it = p.getParents ? p.getParents() : null;
        p = (it && it.hasNext()) ? it.next() : null;
      }
    }
    this._share = { access, perm }; return this;
  }
  /* و خواندنش هم ارثی است، چون در درایو هست: فایلی که در پوشهٔ باز نشسته
     «هرکس با لینک» گزارش می‌شود، حتی اگر خودش هیچ اجازهٔ مستقیمی نداشته
     باشد. شاهدش «صدا — Umbriel (مرد).wav» بود که موتور هرگز به اشتراک
     نگذاشته بود و `anyone: reader` داشت. بدَلی که این را نشان ندهد،
     `driveShareOpen_` را در هر آزمونی بی‌صدا `false` می‌کند. */
  getSharingAccess() {
    const own = (this._share || {}).access;
    if (own && own !== 'PRIVATE') return own;
    let p = this._f;
    while (p) {
      const a = (p._share || {}).access;
      if (a && a !== 'PRIVATE') return a;
      const it = p.getParents ? p.getParents() : null;
      p = (it && it.hasNext()) ? it.next() : null;
    }
    return own || 'PRIVATE';
  }
  getSharingPermission() { return (this._share || {}).perm || 'NONE'; }
  getParents() {
    const arr = this._f ? [this._f] : []; let i = 0;
    return { hasNext: () => i < arr.length, next: () => arr[i++] };
  }
  makeCopy(name, folder) {
    const b = global.Utilities.newBlob(this._b ? this._b.getDataAsString() : '',
                                      'application/octet-stream', name || this.getName());
    const tgt = folder || this._f || global.__ROOT_FOLDER;
    const f = new DFile(b, tgt);
    f._name = name || this.getName();
    tgt._files.push(f); global.__FILES.push(f);
    return f;
  }
  setTrashed(t) { this._trashed = !!t; if (t && this._f) this._f._files = this._f._files.filter(x => x !== this); return this; }
}
global.__FOLDERS = {};
class DFolder {
  constructor(name) { this._n = name; this._files = []; this._subs = [];
    this._id = 'FOLD' + (SHEET_SEQ++); global.__FOLDERS[this._id] = this; }
  getId() { return this._id; }
  getName() { return this._n; }
  setName(n) { this._n = String(n); return this; }
  getUrl() { return 'https://drive.google.com/drive/folders/' + this._id; }
  createFolder(n) { const f = new DFolder(n); this._subs.push(f); return f; }
  getFoldersByName(n) {
    const hits = this._subs.filter(f => f.getName() === n); let i = 0;
    return { hasNext: () => i < hits.length, next: () => hits[i++] };
  }
  getFolders() { const arr = this._subs.slice(); let i = 0;
    return { hasNext: () => i < arr.length, next: () => arr[i++] }; }
  createFile(a, b, c) {
    const blob = (typeof a === 'string') ? global.Utilities.newBlob(b, c || 'text/plain', a) : a;
    const f = new DFile(blob, this); this._files.push(f); global.__FILES.push(f); return f;
  }
  getFiles() { const arr = this._files.slice(); let i = 0;
    return { hasNext: () => i < arr.length, next: () => arr[i++] }; }
  getFilesByName(n) {
    const hits = this._files.filter(f => f.getName() === n); let i = 0;
    return { hasNext: () => i < hits.length, next: () => hits[i++] };
  }
  getDateCreated() { return this._created || (this._created = new Date()); }
  getLastUpdated() { return this._updated || this.getDateCreated(); }
  // پوشه هم اشتراک دارد — و تا ۷٫۴۵ نداشت، پس `driveFolderOpen_` در هر
  // مجموعه‌ای بی‌صدا `false` می‌داد و نگهبانِ تازه هیچ‌وقت نمی‌توانست قرمز شود.
  setSharing(access, perm) { this._share = { access, perm }; return this; }
  getSharingAccess() { return (this._share || {}).access || 'PRIVATE'; }
  getSharingPermission() { return (this._share || {}).perm || 'NONE'; }
  moveTo(dest) {
    for (const k of Object.keys(global.__FOLDERS)) {
      const p = global.__FOLDERS[k];
      if (p && p._subs) p._subs = p._subs.filter(x => x !== this);
    }
    if (global.__ROOT_FOLDER && global.__ROOT_FOLDER._subs)
      global.__ROOT_FOLDER._subs = global.__ROOT_FOLDER._subs.filter(x => x !== this);
    if (dest && dest._subs) dest._subs.push(this);
    this._updated = new Date();
    return this;
  }
  getParents() {
    const parents = [];
    for (const k of Object.keys(global.__FOLDERS)) {
      const p = global.__FOLDERS[k];
      if (p && p._subs && p._subs.indexOf(this) !== -1) parents.push(p);
    }
    let i = 0;
    return { hasNext: () => i < parents.length, next: () => parents[i++] };
  }
  setTrashed(t) {
    this._trashed = !!t;
    if (t) {
      for (const k of Object.keys(global.__FOLDERS)) {
        const p = global.__FOLDERS[k];
        if (p && p._subs) p._subs = p._subs.filter(x => x !== this);
      }
      if (global.__ROOT_FOLDER && global.__ROOT_FOLDER._subs) {
        global.__ROOT_FOLDER._subs = global.__ROOT_FOLDER._subs.filter(x => x !== this);
      }
    }
    return this;
  }
}
global.__ROOT_FOLDER = new DFolder('OUTPUT');
global.DriveApp = {
  Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', PRIVATE: 'PRIVATE' },
  Permission: { VIEW: 'VIEW', NONE: 'NONE' },
  getFolderById(id) { return global.__FOLDERS[id] || global.__ROOT_FOLDER; },
  // آزمون‌ها می‌توانند یک پوشهٔ مستقل با شناسهٔ دلخواه ثبت کنند
  __register(id, name) {
    const f = new DFolder(name || ('FOLDER:' + id));
    delete global.__FOLDERS[f._id];
    f._id = id; global.__FOLDERS[id] = f;
    return f;
  },
  getFileById(id) {
    if (global.__FILES_BY_ID[id]) return global.__FILES_BY_ID[id];
    // شیت‌ها هم فایل‌اند: makeCopy روی آن‌ها باید کار کند
    if (global.__SS && global.__SS[id]) {
      const ss = global.__SS[id];
      return {
        getId: () => id,
        getName: () => ss.getName ? ss.getName() : ('SHEET:' + id),
        getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
        getDateCreated: () => new Date(),
        moveTo() { return this; },
        getBlob: () => global.Utilities.newBlob('sheet', 'text/plain', 'sheet'),
        makeCopy(name, folder) {
          const tgt = folder || global.__ROOT_FOLDER;
          const b = global.Utilities.newBlob('copy-of:' + id, 'application/vnd.google-apps.spreadsheet',
                                             name || ('SHEET:' + id));
          const f2 = new DFile(b, tgt);
          f2._name = name || ('SHEET:' + id);
          f2._copyOf = id;
          tgt._files.push(f2); global.__FILES.push(f2);
          return f2;
        }
      };
    }
    return { moveTo() {}, getBlob: () => null,
             makeCopy() { throw new Error('فایل پیدا نشد: ' + id); } };
  }
};

// ------------------------------------------------------- Properties / Lock
global.__PROPS = {};
global.PropertiesService = {
  getScriptProperties() {
    return {
      getProperty: k => (k in global.__PROPS ? global.__PROPS[k] : null),
      setProperty: (k, v) => { global.__PROPS[k] = String(v); },
      deleteProperty: k => { delete global.__PROPS[k]; },
      // نبودنش یعنی هر کدی که با getProperties کلیدها را می‌پیماید — مثلِ
      // شمارشِ شب‌های بدِ سنجهٔ محتوا — در آزمون بی‌صدا هیچ‌چیز پیدا نمی‌کرد
      // و هرگز واقعاً آزموده نشد.
      getProperties: () => Object.assign({}, global.__PROPS)
    };
  }
};
global.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) };
/* تریگرها واقعاً ثبت می‌شوند، نه اینکه بی‌صدا دور ریخته شوند.
   بی این، هیچ آزمونی نمی‌توانست بپرسد «آیا حذفِ زمان‌بندی همان چیزی را
   برداشت که نصبِ زمان‌بندی گذاشته بود؟» — و دقیقاً همان سؤالی بود که سه
   تریگرِ جامانده را پنهان نگه داشته بود. فهرست از خالی شروع می‌شود، پس
   رفتارِ آزمون‌هایی که تریگر نمی‌سازند عوض نمی‌شود. */
global.__TRIGGERS = [];
global.ScriptApp = {
  getScriptId: () => 'SCRIPT_ID_TEST',
  getOAuthToken: () => 'TOKEN_TEST',
  getProjectTriggers: () => global.__TRIGGERS.slice(),
  newTrigger: (fn) => ({
    _fn: String(fn || ''),
    timeBased: function () { return this; }, forSpreadsheet: function () { return this; },
    everyHours: function () { return this; }, atHour: function () { return this; },
    nearMinute: function () { return this; }, everyDays: function () { return this; },
    inTimezone: function () { return this; }, onOpen: function () { return this; },
    after: function () { return this; },
    create: function () {
      const fnName = this._fn;
      const t = { getHandlerFunction: () => fnName };
      global.__TRIGGERS.push(t); return t;
    }
  }),
  deleteTrigger(t) {
    const i = global.__TRIGGERS.indexOf(t);
    if (i >= 0) global.__TRIGGERS.splice(i, 1);
  }
};
global.__HTML = [];
global.HtmlService = {
  createHtmlOutput(h) {
    const o = { _h: String(h), getContent: () => o._h,
                setWidth() { return o; }, setHeight() { return o; },
                setTitle() { return o; } };
    global.__HTML.push(o); return o;
  }
};
global.__MAIL = [];
global.MailApp = { sendEmail(o) { global.__MAIL.push(o); } };
global.console = console;

// --------------------------------------------------------------- SlidesApp
/* ══ چرا این بدَل تا ۷٫۹۳ نبود، و چه چیزی را نامرئی کرده بود ══
 * `SlidesApp` در این ماک **وجود نداشت**. پس `ytCoverCard_` در هر مجموعه‌ای
 * با ReferenceError داخلِ try/catchِ خودش می‌افتاد و `null` برمی‌گرداند — و
 * سنجه‌ها ناچار بودند *متنِ کد* را بخوانند («آیا `SlidesApp.create` در فایل
 * هست؟»). یعنی کارتِ کاور، که تصویرِ هر ویدئوی این کانال است، یک بار هم در
 * هیچ آزمونی کشیده نشده بود: همان شکلِ ۷٫۴۳ — نگهبان یک لایه بالاتر از جایی
 * که چیز می‌شکند.
 *
 * این بدَل چیدمانِ کشیده‌شده را نگه می‌دارد تا سنجه بتواند بپرسد «متنِ درشتِ
 * این کارت همان `cardTitle` است؟» و «نمودار چند جعبه دارد؟» — یعنی پرسشی
 * دربارهٔ خروجی، نه دربارهٔ کد.
 *
 * `global.__PRES_LAST` همیشه به تازه‌ترین ارائه اشاره می‌کند، و
 * `global.__PRES[id]` به آنچه با آن شناسه باز شده.
 */
global.__PRES = {};
global.__PRES_LAST = null;
global.__PRES_SIZE = { w: 960, h: 540 };   // نقطه (pt) — واحدِ خودِ Slides
class SlText {
  constructor(t) { this._t = String(t == null ? '' : t); this.style = {}; this.para = {}; }
  asString() { return this._t; }
  getLength() { return this._t.length; }
  setText(t) { this._t = String(t == null ? '' : t); return this; }
  appendText(t) { this._t += String(t == null ? '' : t); return this; }
  appendParagraph(t) { this._t += (this._t ? '\n' : '') + String(t == null ? '' : t); return this; }
  clear() { this._t = ''; return this; }
  getTextStyle() {
    const st = this.style, api = {
      setFontSize(n) { st.size = Number(n); return api; },
      setForegroundColor(c) { st.color = String(c); return api; },
      setBold(b) { st.bold = !!b; return api; },
      setItalic(b) { st.italic = !!b; return api; },
      setFontFamily(f) { st.font = String(f); return api; }
    };
    return api;
  }
  getParagraphStyle() {
    const ps = this.para, api = {
      setParagraphAlignment(a) { ps.align = String(a); return api; },
      setLineSpacing(n) { ps.line = Number(n); return api; },
      setSpaceBelow(n) { ps.below = Number(n); return api; },
      setSpaceAbove(n) { ps.above = Number(n); return api; }
    };
    return api;
  }
}
class SlEl {
  constructor(slide, role, shape, l, t, w, h, txt) {
    this._s = slide; this.role = role; this.shape = String(shape);
    this.left = Number(l) || 0; this.top = Number(t) || 0;
    this.width = Number(w) || 0; this.height = Number(h) || 0;
    this._text = new SlText(txt); this.fill = {}; this.line = {};
    this._id = 'EL' + (SHEET_SEQ++);
  }
  getObjectId() { return this._id; }
  getText() { return this._text; }
  getLeft() { return this.left; } getTop() { return this.top; }
  getWidth() { return this.width; } getHeight() { return this.height; }
  setLeft(v) { this.left = Number(v); return this; }
  setTop(v) { this.top = Number(v); return this; }
  getFill() {
    const f = this.fill, api = {
      /* آلفا هم ضبط می‌شود: `setSolidFill(color, alpha)` شکلِ واقعیِ
         SlidesApp است و لایهٔ تیرهٔ روی پس‌زمینهٔ ساخته‌شده از آن استفاده
         می‌کند. بدَلی که آرگومانِ دوم را بیندازد، نمی‌گذارد سنجه بپرسد
         «آیا لایهٔ خوانایی گذاشته شد». */
      setSolidFill(c, a) { f.color = String(c); f.transparent = false;
        if (a !== undefined) f.alpha = Number(a); return api; },
      setTransparent() { f.color = ''; f.transparent = true; return api; }
    };
    return api;
  }
  getBorder() {
    const b = this.line, api = {
      setTransparent() { b.transparent = true; return api; },
      setWeight(n) { b.weight = Number(n); return api; },
      setDashStyle(d) { b.dash = String(d); return api; },
      getLineFill: () => ({ setSolidFill(c) { b.color = String(c); return api; },
                            setTransparent() { b.transparent = true; return api; } })
    };
    return api;
  }
  setRotation(d) { this.rotation = Number(d); return this; }
  sendToBack() { const a = this._s._els; this._s._els = [this].concat(a.filter(x => x !== this)); return this; }
  bringToFront() { this._s._els = this._s._els.filter(x => x !== this).concat([this]); return this; }
  remove() { this._s._els = this._s._els.filter(x => x !== this); return this; }
}
class SlSlide {
  constructor(pres) { this._p = pres; this._els = []; this._id = 'PG' + (SHEET_SEQ++); }
  getObjectId() { return this._id; }
  getPageElements() { return this._els.slice(); }
  getShapes() { return this._els.filter(x => x.role === 'shape'); }
  insertShape(type, l, t, w, h) {
    const e = new SlEl(this, 'shape', type, l, t, w, h, ''); this._els.push(e); return e;
  }
  insertTextBox(txt, l, t, w, h) {
    const e = new SlEl(this, 'text', 'TEXT_BOX', l, t, w, h, txt); this._els.push(e); return e;
  }
  insertImage(src, l, t, w, h) {
    const e = new SlEl(this, 'image', 'IMAGE', l, t, w, h, ''); e.src = src; this._els.push(e); return e;
  }
  remove() { this._p._slides = this._p._slides.filter(x => x !== this); return this; }
}
class SlPres {
  constructor(title, w, h) {
    this._title = String(title == null ? '' : title);
    this._w = Number(w) || 960; this._h = Number(h) || 540;
    this._slides = [new SlSlide(this)];
    this._id = 'PRES' + (SHEET_SEQ++);
    global.__PRES[this._id] = this; global.__PRES_LAST = this;
  }
  getId() { return this._id; }
  getName() { return this._title; }
  setName(n) { this._title = String(n); return this; }
  getPageWidth() { return this._w; }
  getPageHeight() { return this._h; }
  getSlides() { return this._slides.slice(); }
  appendSlide(layout) { const s = new SlSlide(this); s.layout = String(layout || ''); this._slides.push(s); return s; }
  saveAndClose() { this._closed = true; return this; }
}
global.SlidesApp = {
  create(title) { return new SlPres(title, global.__PRES_SIZE.w, global.__PRES_SIZE.h); },
  /* ارائه‌ای که با `presentations.create`ِ HTTP ساخته شده در این دنیا شیئی
     ندارد، پس همان‌جا ساخته می‌شود — با **اندازه‌ای که واقعاً درخواست شده
     بود** (که `UrlFetchApp` ضبطش می‌کند). یک بدَل که همیشه ۹۶۰×۵۴۰ بدهد،
     چیدمانی که کسری از W و H است را بی‌صدا درست نشان می‌دهد. */
  openById(id) {
    const p = new SlPres(global.__PRES_TITLE || '', global.__PRES_SIZE.w, global.__PRES_SIZE.h);
    delete global.__PRES[p._id];
    p._id = String(id); global.__PRES[String(id)] = p;
    /* و یک **فایلِ درایو** با همان شناسه، چون یک ارائهٔ Slides در واقعیت یک
       فایلِ درایو است: کدی که `DriveApp.getFileById(presId).moveTo(...)`
       می‌کند (کاور و کارت‌ها هر دو) باید بتواند پیدایش کند. بی این، بدَل از
       تولید تنگ‌تر است و آن جابه‌جایی در هیچ سنجه‌ای دیده نمی‌شود. */
    if (!global.__FILES_BY_ID[String(id)]) {
      const b = global.Utilities.newBlob('', 'application/vnd.google-apps.presentation',
                                         p._title || String(id));
      const f = new DFile(b, global.__ROOT_FOLDER);
      delete global.__FILES_BY_ID[f._id];
      f._id = String(id); global.__FILES_BY_ID[String(id)] = f;
      global.__ROOT_FOLDER._files.push(f); global.__FILES.push(f);
      p._file = f;
    } else { p._file = global.__FILES_BY_ID[String(id)]; }
    return p;
  },
  ShapeType: {
    RECTANGLE: 'RECTANGLE', ROUND_RECTANGLE: 'ROUND_RECTANGLE', ELLIPSE: 'ELLIPSE',
    LEFT_ARROW: 'LEFT_ARROW', RIGHT_ARROW: 'RIGHT_ARROW', TRIANGLE: 'TRIANGLE',
    DIAMOND: 'DIAMOND', TEXT_BOX: 'TEXT_BOX', PARALLELOGRAM: 'PARALLELOGRAM'
  },
  ParagraphAlignment: { START: 'START', CENTER: 'CENTER', END: 'END', JUSTIFIED: 'JUSTIFIED' },
  ContentAlignment: { TOP: 'TOP', MIDDLE: 'MIDDLE', BOTTOM: 'BOTTOM' },
  PredefinedLayout: { BLANK: 'BLANK', TITLE_ONLY: 'TITLE_ONLY', TITLE_AND_BODY: 'TITLE_AND_BODY' }
};

// ------------------------------------------------------------- UrlFetchApp
/** شیء را از روی schema صافی می‌کند: کلیدِ تعریف‌نشده می‌افتد، همان‌طور که
 *  مدلِ واقعی هرگز نمی‌نویسدش. نوعِ ناسازگار هم می‌افتد (آرایه به‌جای رشته). */
function schemaPrune(v, sc) {
  if (!sc || typeof sc !== 'object') return v;
  const t = String(sc.type || '').toLowerCase();
  if (t === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
    if (!sc.properties) return v;
    const o = {};
    for (const k of Object.keys(v)) {
      if (!Object.prototype.hasOwnProperty.call(sc.properties, k)) continue;
      const x = schemaPrune(v[k], sc.properties[k]);
      if (x !== undefined) o[k] = x;
    }
    return o;
  }
  if (t === 'array') {
    if (!Array.isArray(v)) return undefined;
    return v.map(x => schemaPrune(x, sc.items)).filter(x => x !== undefined);
  }
  if (t === 'string') return (typeof v === 'string' || typeof v === 'number') ? String(v) : undefined;
  return v;
}
function schemaStrict(r, body) {
  try {
    const sc = body && body.generationConfig && body.generationConfig.responseSchema;
    if (!sc || !r || !r.json || !Array.isArray(r.json.candidates)) return r;
    const parts = (((r.json.candidates[0] || {}).content || {}).parts) || [];
    if (!parts.length || typeof parts[0].text !== 'string') return r;
    let obj;
    try { obj = JSON.parse(parts[0].text); } catch (e) { return r; }
    const pruned = schemaPrune(obj, sc);
    if (pruned === undefined) return r;
    const json = JSON.parse(JSON.stringify(r.json));
    json.candidates[0].content.parts[0].text = JSON.stringify(pruned);
    return Object.assign({}, r, { json: json });
  } catch (e) { return r; }
}
global.__schemaPrune = schemaPrune;
global.__FETCHES = [];
global.__STUB = null;
global.UrlFetchApp = {
  fetch(url, opt) {
    opt = opt || {};
    let body = {};
    if (typeof opt.payload === 'string') { try { body = JSON.parse(opt.payload); } catch (e) { body = {}; } }
    else if (opt.payload && typeof opt.payload === 'object') body = opt.payload;   // multipart
    global.__FETCHES.push({ url, method: opt.method || 'get', body,
                            contentType: opt.contentType || '', payload: opt.payload });
    /* اندازهٔ صفحه‌ای که واقعاً خواسته شد را نگه می‌داریم تا
       `SlidesApp.openById` همان را بدهد — چیدمانِ کارت کسری از W و H است و
       بدَلی که همیشه پیش‌فرض بدهد، هیچ‌وقت نسبتِ غلط را نشان نمی‌دهد. */
    if (url === 'https://slides.googleapis.com/v1/presentations' && body) {
      if (body.title) global.__PRES_TITLE = String(body.title);
    }
    if (url === 'https://slides.googleapis.com/v1/presentations' && body && body.pageSize) {
      const g = (o) => Math.round((Number(((o || {}).magnitude)) || 0) / 12700);
      const pw = g(body.pageSize.width), ph = g(body.pageSize.height);
      if (pw > 0 && ph > 0) global.__PRES_SIZE = { w: pw, h: ph };
    }
    /* ══ خروجیِ PNGِ اسلایدز را خودِ بدَل جواب می‌دهد، نه `__STUB` ══
     * این نشانی نقطهٔ پایانیِ خودِ گوگل است، نه APIِ این برنامه — درست مثلِ
     * `DriveApp`. و اگر بگذاریم به استابِ هر مجموعه برسد، یکی از پاسخ‌های
     * مدل را می‌خورد و **هر پاسخِ بعدی یک خانه جابه‌جا می‌شود**: همان تلهٔ
     * ۷٫۶۶ که سه مجموعه را با هم قرمز کرد.
     * `global.__PNG_FAIL` برای سنجهٔ «صادرات شکست خورد» است. */
    if (/docs\.google\.com\/presentation\/.*\/export\/png/.test(String(url))) {
      if (global.__PNG_FAIL) return { getResponseCode: () => Number(global.__PNG_FAIL),
        getBlob: () => global.Utilities.newBlob('', 'text/plain', 'x'),
        getContentText: () => 'export failed' };
      const w = Math.round(global.__PRES_SIZE.w * (4 / 3));
      const h = Math.round(global.__PRES_SIZE.h * (4 / 3));
      const b = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
        (w >> 24) & 255, (w >> 16) & 255, (w >> 8) & 255, w & 255,
        (h >> 24) & 255, (h >> 16) & 255, (h >> 8) & 255, h & 255,
        8, 6, 0, 0, 0];
      const blob = global.Utilities.newBlob(b, 'image/png', 'x.png');
      return { getResponseCode: () => 200, getBlob: () => blob,
               getContentText: () => 'PNG' };
    }
    let r = global.__STUB(url, body, opt);
    /* ══ بدَلِ مدل به اندازهٔ مدلِ واقعی سخت‌گیر است (۸.۲۶) ══
       مدلِ ساختاریافته **فقط فیلدهای schemaی فرستاده‌شده** را می‌تواند
       بنویسد. بدَلی که هر فیلدی را برگرداند، قراردادی را سبز نشان می‌دهد که
       تولید هرگز نمی‌تواند پر کند — دقیقاً همان که درس‌های ۵۷ و ۵۸ را با یک
       تصویر فرستاد: پرامپت `cardTitle` می‌خواست، schema نداشتش، و بدَلِ
       `run_youtube_test.js` همان `cardTitle` را تحویل می‌داد. */
    if (global.__SCHEMA_STRICT !== false) r = schemaStrict(r, body);
    // پاسخ می‌تواند json بدهد یا متنِ خام (برای شبیه‌سازیِ خطاهای واقعیِ API)
    const txt = (r && typeof r.text === 'string') ? r.text : JSON.stringify(r && r.json);
    // پاسخِ دودویی (دانلودِ موسیقی): اگر بایت داده شده باشد، getBlob هم هست
    /* سرآیندها (۸.۴۱): بارگذاریِ ازسرگیری‌پذیرِ درایو نشانیِ نشست را در
       `Location` می‌دهد. بدَلی که سرآیند نداشته باشد، آن مسیر را هرگز
       نمی‌پیماید. */
    const hdr = (r && r.headers) || {};
    return { getResponseCode: () => r.code,
             getAllHeaders: () => hdr, getHeaders: () => hdr,
             getBlob: () => (r && r.bytes
               ? global.Utilities.newBlob(r.bytes, r.mime || 'audio/wav', 'x')
               : global.Utilities.newBlob(txt || '', 'text/plain', 'x')),
             getContentText: () => (txt === undefined ? '' : txt) };
  }
};

module.exports = { Spread, Sheet, DFolder };
