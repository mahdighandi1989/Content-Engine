/* پشتیبانِ شبانه دیگر اسکریپتِ چسبیدهٔ تحلیلگرها را رونوشت نمی‌کند (۱۴ اکتبر).
 *
 * صاحبِ برنامه در Apps Script هر روز یک «Untitled project» تازه دید. `makeCopy` روی شیتی که
 * اسکریپتِ چسبیده دارد، اسکریپت را هم رونوشت می‌کند؛ دو شیتِ تحلیلگر (`CFG.SOURCE_SCRIPTS`)
 * همین‌اند. حالا این دو تب‌به‌تب در شیتِ تازه رونوشت می‌شوند و بقیه مثلِ قبل.
 */
require('./lib/root.js');
const fs = require('fs');
require('./lib/mock.js');
const FILES = fs.readdirSync('src').filter(f => f.endsWith('.gs')).sort();
let src = ''; for (const f of FILES) src += '\n' + fs.readFileSync('src/' + f, 'utf8');
(0, eval)(src);

let pass = 0;
const ok = (n, c, info) => {
  if (!c) { console.log('  ❌ ' + n + (info ? ' — ' + info : '')); throw new Error('FAILED: ' + n); }
  pass++; console.log('  ✅ ' + n + (info ? ' — ' + String(info).slice(0, 200) : ''));
};
global.logLine_ = () => {};

const bound = CFG.SOURCE_SCRIPTS[0].sheetId, plain = CFG.SOURCES.find(s => !backupBoundIds_()[s.id]).id;
const mk = (id, tabs) => {
  const ss = new (SpreadsheetApp.create('x').constructor)('SRC', id);
  tabs.forEach(([n, rows]) => { const sh = ss.insertSheet(n); sh._d = rows.map(r => r.slice()); });
  global.__SS[id] = ss; return ss;
};
const srcSS = mk(bound, [['RESULT', [['a', 'b'], ['1', '2']]], ['Log', [['x']]]]);
const before = JSON.stringify(srcSS._s.map(s => [s._n, s._d]));
const folder = DriveApp.__register('BAKTEST', 'BAK');

console.log('=== ۱) شیتِ تحلیلگر: تب‌به‌تب، بی اسکریپت ===');
const rec = {};
const f = backupCopyOf_({ id: bound, title: 'RESULT-PHOTO' }, 'RESULT-PHOTO — پشتیبان', folder, rec);
const dst = global.__SS[f.getId()];
ok('۱.۱ رونوشت از راهِ تب‌ها، نه makeCopy', /^tabs:2$/.test(rec.how) && dst && dst !== srcSS, rec.how);
ok('۱.۲ همهٔ تب‌ها با نام و دادهٔ خودشان؛ برگهٔ پیش‌فرض نماند',
   JSON.stringify(dst._s.map(s => [s._n, s._d])) === before, JSON.stringify(dst._s.map(s => s._n)));
ok('۱.۳ مبدأ دست نخورد', JSON.stringify(srcSS._s.map(s => [s._n, s._d])) === before);

console.log('=== ۲) شیتِ بی اسکریپت: همان makeCopy ===');
mk(plain, [['T', [['q']]]]);
const rec2 = {};
const f2 = backupCopyOf_({ id: plain, title: 'P' }, 'P — پشتیبان', folder, rec2);
ok('۲.۱ makeCopy، چون اسکریپتی نیست که رونوشت شود', rec2.how === 'makeCopy' && f2._copyOf === plain);

console.log('=== ۳) راهِ تب‌ها شکست خورد ⇒ پشتیبانِ کامل، و علت ثبت می‌شود ===');
const keep = srcSS._s[1].copyTo;
srcSS._s[1].copyTo = () => { throw new Error('quota'); };
const rec3 = {};
const f3 = backupCopyOf_({ id: bound, title: 'RESULT-PHOTO' }, 'R3', folder, rec3);
srcSS._s[1].copyTo = keep;
ok('۳.۱ به makeCopy برگشت و گفت چرا', f3._copyOf === bound && /تب‌به‌تب نشد: quota/.test(rec3.how), rec3.how);

console.log('=== ۴) در مسیرِ واقعیِ پشتیبان ===');
const b = fs.readFileSync('src/17_Backup.gs', 'utf8');
ok('۴.۱ runBackupStep از backupCopyOf_ رونوشت می‌گیرد، نه makeCopy مستقیم روی منبع',
   /var copy = backupCopyOf_\(t, /.test(b) && !/var copy = src\.makeCopy/.test(b));

console.log('\n✅ همهٔ ' + pass + ' سنجهٔ پشتیبانِ بی‌اسکریپت گذشت.');
