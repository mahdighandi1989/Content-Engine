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
}
class Spread {
  constructor(name, id) { this._n = name; this._id = id || 'SS' + SHEET_SEQ++; this._s = []; }
  getId() { return this._id; }
  getUrl() { return 'https://docs.google.com/spreadsheets/d/' + this._id + '/edit'; }
  getSheets() { return this._s; }
  getSheetByName(n) { return this._s.find(s => s._n === n) || null; }
  insertSheet(n) { const s = new Sheet(n); this._s.push(s); return s; }
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
      deleteProperty: k => { delete global.__PROPS[k]; }
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

// ------------------------------------------------------------- UrlFetchApp
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
    const r = global.__STUB(url, body);
    // پاسخ می‌تواند json بدهد یا متنِ خام (برای شبیه‌سازیِ خطاهای واقعیِ API)
    const txt = (r && typeof r.text === 'string') ? r.text : JSON.stringify(r && r.json);
    // پاسخِ دودویی (دانلودِ موسیقی): اگر بایت داده شده باشد، getBlob هم هست
    return { getResponseCode: () => r.code,
             getBlob: () => (r && r.bytes
               ? global.Utilities.newBlob(r.bytes, r.mime || 'audio/wav', 'x')
               : global.Utilities.newBlob(txt || '', 'text/plain', 'x')),
             getContentText: () => (txt === undefined ? '' : txt) };
  }
};

module.exports = { Spread, Sheet, DFolder };
