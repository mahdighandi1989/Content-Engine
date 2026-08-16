/**
 * 09_DateWords.gs — تاریخ و روز، به حروف
 *
 * گوینده باید بتواند تاریخ را بخواند، پس عدد به او نمی‌دهیم؛ حروف می‌دهیم.
 * (اگر رقم بدهیم، مدل گفتار آن را انگلیسی یا غلط می‌خواند.)
 */

var FA_ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
var FA_TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
var FA_TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
var FA_HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];

/** عدد ۰ تا ۹۹۹۹ به حروف فارسی */
function faNumber_(n) {
  n = Math.floor(Number(n) || 0);
  if (n === 0) return 'صفر';
  var parts = [];
  if (n >= 1000) {
    var th = Math.floor(n / 1000);
    parts.push(th === 1 ? 'هزار' : faNumber_(th) + ' هزار');
    n = n % 1000;
  }
  if (n >= 100) { parts.push(FA_HUNDREDS[Math.floor(n / 100)]); n = n % 100; }
  if (n >= 20) { parts.push(FA_TENS[Math.floor(n / 10)]); n = n % 10; }
  else if (n >= 10) { parts.push(FA_TEENS[n - 10]); n = 0; }
  if (n > 0) parts.push(FA_ONES[n]);
  return parts.join(' و ');
}

/** روزِ ماه به‌صورت ترتیبی: ۱ → یکم، ۳۱ → سی‌ویکم */
var FA_ORDINAL_DAY = ['', 'یکم', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم',
  'یازدهم', 'دوازدهم', 'سیزدهم', 'چهاردهم', 'پانزدهم', 'شانزدهم', 'هفدهم', 'هجدهم', 'نوزدهم', 'بیستم',
  'بیست‌ویکم', 'بیست‌ودوم', 'بیست‌وسوم', 'بیست‌وچهارم', 'بیست‌وپنجم', 'بیست‌وششم', 'بیست‌وهفتم',
  'بیست‌وهشتم', 'بیست‌ونهم', 'سی‌ام', 'سی‌ویکم'];

var FA_JMONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
var FA_GMONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
                  'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
// getDay(): ۰ = یکشنبه
var FA_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

/** میلادی → شمسی (الگوریتم متعارف jalali_cal) */
function toJalali_(gy, gm, gd) {
  var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  var jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  var gy2 = (gm > 2) ? (gy + 1) : gy;
  var days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
             Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy: jy, jm: jm, jd: jd };
}

/**
 * تاریخ امروز، آمادهٔ خوانده‌شدن.
 * @return {{weekday:string, jalali:string, gregorian:string, spoken:string, iso:string}}
 */
function todayWords_(d) {
  d = d || new Date();
  // تاریخ را در منطقهٔ زمانی خودِ کاربر می‌خوانیم، نه منطقهٔ سرور
  var ymd = Utilities.formatDate(d, CFG.TIMEZONE, 'yyyy-MM-dd').split('-');
  var gy = parseInt(ymd[0], 10), gm = parseInt(ymd[1], 10), gd = parseInt(ymd[2], 10);
  // روز هفته را خودمان از همان تاریخِ محلی حساب می‌کنیم تا به قالب‌بندی وابسته نباشد
  var dow = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay();   // ۰ = یکشنبه
  var weekday = FA_WEEKDAYS[dow];

  var j = toJalali_(gy, gm, gd);
  var jalali = FA_ORDINAL_DAY[j.jd] + ' ' + FA_JMONTHS[j.jm - 1] + ' ' + faNumber_(j.jy);
  var greg = FA_ORDINAL_DAY[gd] + ' ' + FA_GMONTHS[gm - 1] + ' ' + faNumber_(gy);

  return {
    weekday: weekday,
    jalali: jalali,
    gregorian: greg,
    iso: ymd.join('-'),
    spoken: weekday + '، ' + jalali + '، برابر با ' + greg
  };
}
