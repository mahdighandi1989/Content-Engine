/* run_mergegroup_test.js — قسمتِ بلند باید «کم‌ترین شمارِ فایل» بشود، نه تکه‌تکه.
 *
 * واقعیتی که این آزمون از آن آمد: درس‌نامهٔ قسمت ۲ با غنی‌سازی به ۴۵ مگابایت
 * رسید، از سقفِ ۴۶ میلیون بایت گذشت، ادغام کلاً کنار رفت و پنج تکهٔ کوتاه به
 * تلگرام رفت. سیاههٔ واقعی: «ادغام صدا انجام نشد: حجم کل 45 مگابایت از سقف
 * بیشتر است.»
 */
const L = require('./probe_r4_lib.js');
const { ok, summary, quiet } = L;

function folderStub() {
  const made = [];
  return {
    made: made,
    createFile(blob) {
      const f = { _n: blob.getName(), _b: blob,
        getId: () => 'M' + made.length, getName() { return this._n; },
        getUrl() { return 'https://drive.google.com/file/d/M' + made.indexOf(this) + '/view'; },
        getBlob() { return this._b; } };
      made.push(f);
      return f;
    }
  };
}

/** فایل‌های بخش‌بخشِ ساختگی، با همان هدرِ ۵۴ بایتیِ واقعی. */
function parts(n, bytesEach) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const data = Buffer.concat([Buffer.from(wavHeader54_(bytesEach)),
                                Buffer.alloc(bytesEach, 1)]);
    const id = 'P' + i;
    global.__FILESBYID = global.__FILESBYID || {};
    global.__FILESBYID[id] = {
      getBlob: () => ({ getBytes: () => Array.prototype.slice.call(data) })
    };
    out.push({ id: id, name: 'بخش ' + (i + 1) + '.wav', url: 'u' + i, bytes: bytesEach });
  }
  return out;
}

const realGetFileById = global.DriveApp.getFileById;
global.DriveApp.getFileById = function (id) {
  if (global.__FILESBYID && global.__FILESBYID[id]) return global.__FILESBYID[id];
  return realGetFileById.call(global.DriveApp, id);
};

const MIN = 2880000;          // ~یک دقیقه صدا: 24000 نمونه × ۲ بایت × ۶۰

// ═════ 1. قسمتِ کوتاه: همان یک فایلِ «کامل» ═════
console.log('\n=== 1. قسمتِ کوتاه (۱۰ دقیقه) → یک فایلِ کامل ===');
{
  const f = folderStub();
  const un = quiet();
  const r = mergeGroups_(parts(3, 3 * MIN), 'قسمت آزمایشی', f);
  un();
  ok('1.1 یک فایل برگشت', r && r.length === 1, r ? r.length + ' فایل' : 'null');
  ok('1.2 نامش «کامل» است', r && /— کامل\.wav$/.test(r[0].name), r ? r[0].name : '-');
  ok('1.3 حجمش جمعِ بخش‌هاست', r && r[0].bytes === 9 * MIN,
     r ? r[0].bytes + ' در برابر ' + 9 * MIN : '-');
}

// ═════ 2. همان قسمتِ واقعیِ ۴۵ مگابایتی ═════
console.log('\n=== 2. قسمتِ ۱۶٫۴ دقیقه‌ای (۴۷ مگابایت) → دو فایل، نه پنج تکه ===');
{
  const f = folderStub();
  const five = parts(5, 9437184);          // ۵ × ۹ مگابایت = ۴۷٫۲ مگابایت
  const un = quiet();
  const r = mergeGroups_(five, 'درس‌نامه — قسمت 002', f);
  un();
  console.log('   →', r ? r.map(x => x.name + ' (' + Math.round(x.bytes / 1048576) + 'MB)').join('  |  ') : 'null');
  ok('2.1 ادغام کنار نرفت', !!r && r.length >= 1, r ? r.length + ' فایل' : 'NULL — همان ایرادِ قبلی');
  ok('2.2 کم‌ترین شمارِ ممکن: دو فایل', r && r.length === 2, r ? r.length + '' : '-');
  ok('2.3 هیچ فایلی از سقف نگذشت',
     r && r.every(x => x.bytes <= CFG.MERGE_MAX_BYTES),
     r ? r.map(x => x.bytes).join(',') + ' (سقف ' + CFG.MERGE_MAX_BYTES + ')' : '-');
  ok('2.4 مجموعِ ثانیه‌ها دست‌نخورده ماند',
     r && r.reduce((a, x) => a + x.bytes, 0) === 5 * 9437184,
     r ? r.reduce((a, x) => a + x.bytes, 0) + ' در برابر ' + 5 * 9437184 : '-');
  ok('2.5 نامشان شمارهٔ فایل را می‌گوید',
     r && /یکجا 1 از 2/.test(r[0].name) && /یکجا 2 از 2/.test(r[1].name),
     r ? r.map(x => x.name).join(' | ') : '-');
  ok('2.6 هر دو «whole» علامت خورده‌اند تا به تلگرام بروند',
     r && r.every(x => x.whole === true));
}

// ═════ 3. قسمتِ خیلی بلند ═════
console.log('\n=== 3. قسمتِ ۴۵ دقیقه‌ای → کم‌ترین شمارِ ممکن ===');
{
  const f = folderStub();
  const un = quiet();
  const r = mergeGroups_(parts(13, 9437184), 'قسمتِ بلند', f);  // ۱۲۲ مگابایت
  un();
  // کم‌ترین شمارِ ممکن، با توجه به اینکه هر بخش ۹ مگابایت است و بیش از چهار
  // بخش در یک فایلِ ۴۶ مگابایتی جا نمی‌شود: ⌈۱۳÷۴⌉ = ۴
  const floorPer = Math.floor(CFG.MERGE_MAX_BYTES / 9437184);
  const least = Math.ceil(13 / floorPer);
  ok('3.1 کم‌ترین شمارِ ممکن (' + least + ' فایل)', r && r.length === least,
     r ? r.length + ' (کم‌ترین ممکن ' + least + ')' : '-');
  ok('3.2 همه زیر سقف', r && r.every(x => x.bytes <= CFG.MERGE_MAX_BYTES),
     r ? r.map(x => Math.round(x.bytes / 1048576) + 'MB').join(',') : '-');
  ok('3.3 چیزی گم نشد', r && r.reduce((a, x) => a + x.bytes, 0) === 13 * 9437184);
}

// ═════ 4. مرزها ═════
console.log('\n=== 4. مرزها ===');
{
  const f = folderStub();
  const un = quiet();
  ok('4.1 یک بخش → ادغام لازم نیست', mergeGroups_(parts(1, MIN), 'x', f) === null);
  ok('4.2 بی‌بخش → null', mergeGroups_([], 'x', f) === null);
  ok('4.3 null → null', mergeGroups_(null, 'x', f) === null);
  // یک بخشِ تنها که خودش از سقف بزرگ‌تر است: نباید بی‌صدا گم شود
  const big = mergeGroups_(parts(2, 40000000), 'x', f);
  un();
  ok('4.4 دو بخشِ بزرگ‌تر از سقف، هر کدام فایلِ خودش می‌ماند (بی رونوشتِ بی‌فایده)',
     big && big.length === 2 && big.every(x => x.whole === true),
     big ? big.map(x => x.name).join(' | ') : '-');
  ok('4.5 و آن دو، همان فایل‌های اصلی‌اند نه فایلِ تازه',
     big && big[0].id === 'P0' && big[1].id === 'P1',
     big ? big.map(x => x.id).join(',') : '-');
}

// ═════ 5. سازگاری با وضعیتِ نیمه‌تمامِ نسخهٔ قبل ═════
console.log('\n=== 5. mergedList_ با هر دو شکلِ حالتِ ذخیره‌شده ===');
{
  ok('5.1 آرایه', mergedList_([{ url: 'a' }, { url: 'b' }]).length === 2);
  ok('5.2 شیءِ تنها (نسخهٔ قبل)', mergedList_({ url: 'a', name: 'n' }).length === 1);
  ok('5.3 null', mergedList_(null).length === 0);
  ok('5.4 آرایهٔ خالی', mergedList_([]).length === 0);
  ok('5.5 شیءِ بی‌لینک نادیده گرفته می‌شود', mergedList_({ name: 'n' }).length === 0);
  ok('5.6 عضوِ خرابِ آرایه هم', mergedList_([null, { url: 'a' }, 5]).length === 1);
}

process.exit(summary('ادغام گروهیِ صدا') ? 1 : 0);
