// ساعتِ آزمون را قفل می‌کند. بی این، مجموعهٔ آزمون به ساعتِ اجرا وابسته است:
// دروازهٔ غنی‌سازی پیش از ساعت هفت «صبر کن» می‌گوید و ده‌ها آزمونِ انتشار
// می‌شکنند — نه به‌خاطر ایرادِ کد، به‌خاطر اینکه صبح اجرایشان کرده‌ایم.
const H = Number(process.env.FAKE_UTC_HOUR || 12);
const base = new Date();
const target = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), H, 0, 0);
const delta = target - base.getTime();
const RealDate = Date;
function FakeDate(...a) {
  if (!(this instanceof FakeDate)) return new FakeDate().toString();
  return a.length ? new RealDate(...a) : new RealDate(FakeDate.now());
}
FakeDate.prototype = RealDate.prototype;
Object.setPrototypeOf(FakeDate, RealDate);
// آزمون‌ها می‌توانند ساعت را جلو ببرند: global.__SKEW_MS += 3600000
global.__SKEW_MS = 0;
FakeDate.now = () => RealDate.now() + delta + (global.__SKEW_MS || 0);
FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
global.Date = FakeDate;
