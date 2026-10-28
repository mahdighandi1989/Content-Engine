/* ══ آزمونِ ۱۴.۴ — ۸۲ از نو بی کلیپ‌های سریال، و قسمت‌های قدیمیِ «از همه جا» با برشِ سریال/فیلم خصوصی ══
 * ۱) vmStripMedia_: هر کلیپ ⇒ کاورِ قسمت در همان زمان و با همان کارت؛ لحظه‌هایش کنار؛ بی کاور ⇒ نه
 * ۲) جایگزینی با strip: شکستِ کنار گذاشتن ⇒ ایست، ویدئوی قبلی سرِ جایش؛ موفق ⇒ قبلی کنار و صف
 * ۳) کنار گذاشتنِ حقِ تصویر: خصوصی + ردیف در دفترِ انتشار با دلیل؛ پیام «تکراری» نمی‌گوید
 * ۴) جای پلی‌لیست کنارگذاشته را نمی‌شمارد
 * ۵) فهرست‌های گیت‌هاب همان تصمیمِ صاحبِ کانال‌اند
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const src = n => fs.readFileSync('src/' + fs.readdirSync('src').find(f => f.indexOf(String(n).slice(0, 3)) === 0), 'utf8');

const media82 = () => ({ v: 1, key: 'variety:82', phase: 'ready', secs: 427,
  scenes: [
    { id: 'c1', kind: 'video', fileId: 'c1', sn: 7, t0: 41, quote: 'q1', say: 'برره', ov: { kind: 'headline', title: 'خواستگاری عجیب' }, n: 1 },
    { id: 'p1', kind: 'photo', fileId: 'p1', sn: 10, t0: 90, quote: '', say: 'عکس', ov: null, n: 2 },
    { id: 'c2', kind: 'video', fileId: 'c2', sn: 16, t0: 130.7, quote: 'q2', say: 'حمید آقا', ov: { kind: 'quote', title: 'x' }, n: 3 }],
  moments: [{ id: 'c1', at: 45.3 }, { id: 'c2', at: 141.3 }, { id: 'p1', at: 99 }],
  copies: { c1: 'cc1', p1: 'cp1', c2: 'cc2' }, cover: { fileId: 'COV', why: '' } });

console.log('\n=== ۱) کنار گذاشتنِ کلیپ‌ها از نقشهٔ آماده ===');
{
  const keepR = global.vmRead_, keepW = global.vmWrite_;
  let disk = media82();
  global.vmRead_ = () => JSON.parse(JSON.stringify(disk));
  global.vmWrite_ = (f, d) => { disk = d; return true; };
  const r = vmStripMedia_({}, 'video', 'Content-ID');
  const sc = disk.scenes;
  ok('۱.۱ دو کلیپ کنار؛ جای هر کدام کاورِ قسمت، در همان زمان، با همان کارت', r.ok && r.n === 2 &&
     sc[0].kind === 'photo' && sc[0].fileId === 'COV' && sc[0].t0 === 41 && sc[0].ov.title === 'خواستگاری عجیب' && sc[0].was === 'c1' &&
     disk.copies[sc[0].id] === 'COV' && sc[2].fileId === 'COV' && sc[2].t0 === 130.7, JSON.stringify(r));
  ok('۱.۲ عکس دست نمی‌خورد و لحظه‌های کلیپ‌ها (صدای خودِ کلیپ) کنار می‌روند', sc[1].id === 'p1' && sc[1].fileId === 'p1' &&
     disk.moments.length === 1 && disk.moments[0].id === 'p1' && JSON.stringify(disk.stripped.ids) === '["c1","c2"]');
  ok('۱.۳ هیچ کلیپی در نقشهٔ نهایی نمی‌ماند', !sc.some(s => s.kind === 'video'));
  disk = media82();
  const r2 = vmStripMedia_({}, ['c2'], '');
  ok('۱.۴ فهرستِ شناسه فقط همان را کنار می‌گذارد', r2.ok && r2.n === 1 && disk.scenes[0].kind === 'video' && disk.scenes[2].kind === 'photo');
  disk = media82(); disk.cover = { fileId: '', why: 'نشد' };
  const before = JSON.stringify(disk);
  const r3 = vmStripMedia_({}, 'video', '');
  ok('۱.۵ بی کاور ⇒ نه، و فایل دست نمی‌خورد', !r3.ok && /کاور/.test(r3.why) && JSON.stringify(disk) === before, r3.why);
  disk = media82(); disk.phase = 'copy';
  ok('۱.۶ نقشهٔ ناتمام ⇒ نه', !vmStripMedia_({}, 'video', '').ok);
  global.vmRead_ = keepR; global.vmWrite_ = keepW;
}

console.log('\n=== ۲) جایگزینی با strip ===');
{
  const keep = {};
  ['ytOn_', 'ytReplaceList_', 'ytPublished_', 'ytItemOff_', 'ytHandsOff_', 'ytRenderRead_', 'ytReplaceAside_',
   'ytReplaceScenes_', 'vmStripMedia_', 'readSeriesReg_', 'ytDueList_', 'ytDueSave_', 'getHub_'].forEach(k => { keep[k] = global[k]; });
  const keepDrive = global.DriveApp;
  let aside = 0, due = [];
  global.ytOn_ = () => true;
  global.ytReplaceList_ = () => ({ 'variety:82': { tag: 'r1-14.4', strip: 'video', why: 'w' } });
  global.ytPublished_ = () => ({ 'variety:82': { videoId: 'OLD82', url: 'u', series: '' } });
  global.ytItemOff_ = () => false; global.ytHandsOff_ = () => false;
  global.ytRenderRead_ = () => ({ items: [{ key: 'variety:82', folderId: 'F82' }] });
  global.DriveApp = Object.assign({}, keepDrive, { getFolderById: () => ({}) });
  global.ytReplaceAside_ = () => { aside++; return 1; };
  global.ytReplaceScenes_ = () => '';
  global.readSeriesReg_ = () => ({ rows: [] });
  global.ytDueList_ = () => due.slice(); global.ytDueSave_ = l => { due = l; return l.length; };
  global.getHub_ = () => ({});
  props_().deleteProperty(PK.YT_REPL);
  global.vmStripMedia_ = () => ({ ok: false, n: 0, why: 'کاورِ قسمت نیست' });
  ytReplaceTick_(60000, {});
  const s1 = ytReplState_()['variety:82'] || {};
  ok('۲.۱ کنار گذاشتن نشد ⇒ «نشد» با علت، ویدئوی قبلی کنار نمی‌رود و صفی ساخته نمی‌شود',
     s1.phase === 'fail' && /کاور/.test(s1.why) && aside === 0 && due.length === 0, JSON.stringify(s1));
  props_().deleteProperty(PK.YT_REPL);
  let stripArgs = null;
  global.vmStripMedia_ = (f, strip, why) => { stripArgs = [strip, why]; return { ok: true, n: 4, why: '' }; };
  ytReplaceTick_(60000, {});
  const s2 = ytReplState_()['variety:82'] || {};
  ok('۲.۲ کنار گذاشته شد ⇒ قبلی به «پیشین»، صف با همان tag، و قبلی تا عمومی‌شدنِ تازه می‌مانَد',
     s2.phase === 'build' && s2.oldVid === 'OLD82' && aside === 1 && stripArgs[0] === 'video' &&
     due.length === 1 && due[0].replace === 'r1-14.4', JSON.stringify({ s2, due }));
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
  global.DriveApp = keepDrive;
  props_().deleteProperty(PK.YT_REPL);
  ok('۲.۳ کنار گذاشتن پیش از کنار رفتنِ ویدئوی قبلی می‌آید (ترتیبِ کد)',
     src('27_').indexOf('vmStripMedia_(folder, list[key].strip') < src('27_').indexOf('var aside = ytReplaceAside_(folder);'));
}

console.log('\n=== ۳) کنار گذاشتنِ حقِ تصویر ===');
{
  const keep = {};
  ['ytOn_', 'ytRetireList_', 'ytPublished_', 'ytSvc_', 'ytPlMap_', 'ytPlItems_', 'ytQuotaTake_', 'ytLog_', 'mailQueue_',
   'getHub_', 'tgEnabled_'].forEach(k => { keep[k] = global[k]; });
  const upd = [], rm = [], logs = [], mails = [];
  global.ytOn_ = () => true;
  global.ytRetireList_ = () => ({ 'variety:79': { why: 'صحنهٔ ۳: «شب‌های برره»', keep: '', dup: [], keepVid: '' } });
  global.ytPublished_ = () => ({ 'variety:79': { videoId: 'V79', url: 'https://youtu.be/V79', series: '', title: 't79' } });
  global.ytSvc_ = () => ({ PlaylistItems: { remove: id => rm.push(id) }, Videos: { update: b => upd.push(b) } });
  global.ytPlMap_ = () => ({ v: { id: 'PLV' } });
  global.ytPlItems_ = () => [{ id: 'it79', videoId: 'V79', position: 5 }, { id: 'it80', videoId: 'V80', position: 6 }];
  global.ytQuotaTake_ = () => true;
  global.ytLog_ = (h, r) => { logs.push(r); return true; };
  global.mailQueue_ = (a, b, c) => { mails.push(b + ' ' + c); return true; };
  global.getHub_ = () => ({}); global.tgEnabled_ = () => false;
  props_().deleteProperty(PK.YT_RETIRE);
  const o = ytRetireTick_(30000, {});
  ok('۳.۱ خصوصی شد و فقط از همان پلی‌لیست‌آیتم بیرون آمد (پاک نه)', o.done === 1 && upd.length === 1 &&
     upd[0].id === 'V79' && upd[0].status.privacyStatus === 'private' && rm.join() === 'it79', JSON.stringify({ o, upd, rm }));
  ok('۳.۲ ردیف در دفترِ انتشار با همان شناسه، حریمِ private و دلیل', logs.length === 1 && logs[0].videoId === 'V79' &&
     logs[0].privacy === 'private' && /کنار رفت/.test(logs[0].result) && /شب‌های برره/.test(logs[0].note), JSON.stringify(logs));
  ok('۳.۳ پیام «تکراری» نمی‌گوید و دلیل را دارد', mails.length === 1 && !/تکراری/.test(mails[0]) && /برره/.test(mails[0]), mails[0]);
  const n0 = upd.length;
  ytRetireTick_(30000, {});
  ok('۳.۴ بارِ دوم کاری نمی‌کند', upd.length === n0);
  ok('۳.۵ خطِ روزانه کنارگذاشته را نشان می‌دهد', /variety:79: کنار رفت/.test(ytRetireLine_()) && /حقِ تصویر/.test(ytRetireLine_()));
  props_().deleteProperty(PK.YT_RETIRE);
  Object.keys(keep).forEach(k => { global[k] = keep[k]; });
}

console.log('\n=== ۴) جایِ پلی‌لیست ===');
{
  const keepD = global.ytRetireDone_;
  const pub = { 'variety:75': { videoId: 'a' }, 'variety:79': { videoId: 'b' }, 'variety:81': { videoId: 'c' } };
  global.ytRetireDone_ = () => ({ 'variety:79': 1 });
  ok('۴.۱ کنارگذاشته (۷۹) در شمارِ جلوتری‌های ۸۶ نیست', ytWantPos_(pub, { show: 'variety', ep: 86 }, '') === 2);
  global.ytRetireDone_ = () => ({});
  ok('۴.۲ بی کنارگذاشته همان شمارِ قبلی', ytWantPos_(pub, { show: 'variety', ep: 86 }, '') === 3);
  global.ytRetireDone_ = keepD;
}

console.log('\n=== ۵) فهرست‌های گیت‌هاب ===');
{
  const rp = JSON.parse(fs.readFileSync('docs/yt-replace.json', 'utf8')).items;
  const rt = JSON.parse(fs.readFileSync('docs/yt-retire.json', 'utf8')).items;
  ok('۵.۱ ۸۲ از نو بی هیچ کلیپ', rp['variety:82'] && rp['variety:82'].strip === 'video' && !!rp['variety:82'].tag);
  const want = ['variety:75', 'variety:76', 'variety:78', 'variety:79', 'variety:80'];
  ok('۵.۲ پنج قسمتِ قدیمی با دلیل در فهرستِ کنار گذاشتن، هیچ‌کدام «ماندنی»/«تکراری» ندارد',
     want.every(k => rt[k] && String(rt[k].why).length > 40 && !rt[k].keepVid && !rt[k].dup));
  ok('۵.۳ ۸۲ کنار گذاشته نمی‌شود (جایگزین می‌شود)', !rt['variety:82']);
}

summary('۱۴.۴');
