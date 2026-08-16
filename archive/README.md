# archive/ — بایگانی

این پوشه **منبعِ حقیقت نیست**. هرگز از این فایل‌ها build یا test نکن و هیچ‌کدام را
مرجعِ کد حساب نکن. اینجا فقط برای این است که چیزی پاک نشود.

قاعده: هر فایلِ کهنه/تکراری که در ریشهٔ ریپو ظاهر شد → به همین‌جا منتقل می‌شود
(نه پاک، نه در ریشه ماندن).

## محتویات

| فایل | چرا اینجاست |
|------|-------------|
| `_CODE-v5.11.gs` | نسخهٔ قدیمیِ موتور؛ جایش را `engine.gs` نسخهٔ ۵٫۱۲ گرفته |
| `probe_pin_common.js`, `probe_r1_lib.js`, `probe_r2_lib.js`, `probe_r3_lib.js`, `probe_r5_lib.js`, `probe_r6_lib.js` | فیکسچرهای دورهای قدیمیِ بازبینی؛ هیچ `run_*.js` بارشان نمی‌کند (فقط `probe_r4_lib.js` زنده است و در `tests/lib/` نشسته) |
| `A_raw.md`, `A_parsed.json`, `B_raw.md`, `B_parsed.json`, `general.xlsx` | واسط‌های استخراجِ یک‌بارمصرف؛ فیکسچرِ زندهٔ تست `tests/fixtures/newsheets.json` است |
| `ep1.json`, `sample_episode.json`, `sample_items.json`, `real_report.json`, `test_report.txt` | نماگرفت‌های قدیمیِ خروجی و گزارش |
| `fixtime.js` | ابزارِ یک‌بارمصرف؛ جایی فراخوانده نمی‌شود |

## مجموعهٔ کاریِ واقعی (بیرون از این پوشه)

```
engine.gs · manifest.json · README.md · CLAUDE.md   ← ریشه (موتور از raw می‌خواندشان)
src/            ۲۲ بخشِ کد
tools/          build.js · build_header.txt
tests/          run_*.js  +  lib/{root,mock,probe_r4_lib}.js  +  fixtures/
docs/           monitor_prompt_current.txt
```
