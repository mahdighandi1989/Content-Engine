/* ظاهر از **محتوا** درمی‌آید، نه یک تمِ ثابت. ورودی: دستهٔ مجموعه، نامش،
   و لحنِ بخش‌ها (هر بخش `tone` دارد و از روزِ اول داشته). خروجی: پالت،
   بافت، و وزنِ حرکت. کد فقط خوانایی و یکدستیِ درونِ یک قسمت را تضمین
   می‌کند؛ انتخاب با محتواست. */
'use strict';
const LOOKS = [
  { key: 'کاغذِ آرام', re: /فلسف|کلام|معرفت|منطق|اعتقاد/,
    pal: { bg: '#F4F1EA', ink: '#23262E', accent: '#B4531F', mark: '#F2D06B', card: '#FFFFFF', grain: 0.10, vig: 0.08 } },
  { key: 'چاپِ قدیمی', re: /تاریخ|ادبیات|سند|سیره|رجال/,
    pal: { bg: '#F1E8D6', ink: '#2B2116', accent: '#8C5A2B', mark: '#DCC28C', card: '#FBF6EA', grain: 0.16, vig: 0.10, rule: true } },
  { key: 'کاغذِ شطرنجی', re: /علم|فیزیک|شیمی|زیست|فنی|مهندس|ریاضی|آمار/,
    pal: { bg: '#F7F9FA', ink: '#12212E', accent: '#1F6FB2', mark: '#BEE3F7', card: '#FFFFFF', grain: 0.05, vig: 0.05, grid: 64 } },
  { key: 'آبرنگِ گرم', re: /عرفان|اخلاق|روای|داستان|زندگی|سبک زندگی|اجتماع/,
    pal: { bg: '#FFF6EC', ink: '#3A2312', accent: '#D2601A', mark: '#FBD9A5', card: '#FFFDFA', grain: 0.12, vig: 0.09, wash: true } },
  { key: 'تختهٔ درس', re: /آموزش|گام|فرایند|روش|مهارت/,
    pal: { bg: '#FAFAF6', ink: '#1F2937', accent: '#0E8F63', mark: '#B7F0D8', card: '#FFFFFF', grain: 0.07, vig: 0.06, grid: 96 } }
];
function lookFor(cat, name, tones) {
  const hay = [cat, name].concat(tones || []).join(' · ');
  for (const L of LOOKS) if (L.re.test(hay)) return L;
  return LOOKS[0];
}
module.exports = { LOOKS, lookFor };
