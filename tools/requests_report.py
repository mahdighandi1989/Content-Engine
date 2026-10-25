#!/usr/bin/env python3
"""docs/requests_report.md را از docs/requests.json و تاریخچهٔ git می‌سازد (۱۱.۸).

«یک جدولِ همهٔ درخواست‌های نقشهٔ راه از ابتدا ← کامیت/فایل ← تست ← وضعیت». وضعِ «سنجیده» را موتور از داوری‌های ناظر
حساب می‌کند (reqStatus_) و در ایمیلِ روزانه می‌آید؛ این‌جا فقط «کجا اجرا شد» و آنچه از کد معلوم است.
اجرا: python3 tools/requests_report.py
"""
import json, re, subprocess, collections

# وضعی که از کد/گفت‌وگو معلوم است و در ستون‌های فایل نیست. «؟» = مطمئن نیستم خواسته را درست فهمیده‌ام.
STATUS = {
    'R-20261025-11': '⚠️ اشتباه منتقل/فهمیده شد — در ۱۱.۱ برگشت (‎R-20261025-18)',
    'R-20261025-14': 'بخشی: ریلز و شورتز بی بلوکِ صدا؛ ویدئوی بلند با بلوک تا تأییدِ او (‎-19، YT_DESC_CAST)',
    'R-20261025-17': 'ناقص در ۱۱.۰ (فقط ویدئوهای بلند) — کامل در ۱۱.۶ (‎-33)',
    'R-20261025-21': 'ثبت شد؛ حدسِ او با کد جور بود ⇒ ‎-25',
    'R-20261025-25': 'منتظرِ او: شنیدنِ نمونه و تأیید (VBR_SEG_PITCH خاموش)',
    'R-20261025-27': 'منتظرِ تحلیلِ رقبا',
    'R-20261025-29': 'منتظرِ او: کلیدِ متا با pages_manage_posts و تیکِ فیسبوک',
    'R-20261025-32': 'زیرساخت؛ منتظرِ تیکِ او · ؟ «موازی» = یک‌درمیان در روز، نه دو قسمت',
    'R-20261025-35': '؟ پیامد: بی مجموعهٔ دسته‌دستیِ در نوبت، مجموعهٔ تازه شروع نمی‌شود',
    'R-20261025-36': 'پس از نصبِ ۱۱.۷ — تب و فایلِ تلگرام در وارسیِ ۱۰ صبح',
    'R-20261025-39': 'طرح؛ منتظرِ متنِ بیوها و تصمیمِ او',
    'R-20261025-43': 'سنجش روشن؛ نتیجه در ایمیل و تلگرام — تغییری بی تأیید نه',
    'R-20261025-44': 'طرح؛ منتظرِ تصمیمِ او',
}

def commits():
    out = subprocess.run(['git', 'log', '--format=%h %s'], capture_output=True, text=True).stdout
    m = {}
    for line in out.splitlines():
        h, _, s = line.partition(' ')
        g = re.match(r'(?:v)?(\d+\.\d+)\s*[:—-]', s)
        if g and g.group(1) not in m:
            m[g.group(1)] = h
    return m

def main():
    d = json.load(open('docs/requests.json', encoding='utf-8'))
    cm = commits()
    L = ['# همهٔ درخواست‌های صاحبِ کانال — از دفترِ درخواست‌ها', '',
         '> ساخته‌شده با `python3 tools/requests_report.py` از `docs/requests.json` و تاریخچهٔ git. دفترِ درخواست‌ها از ۸.۹۲',
         '> (۱۳ اکتبر ۲۰۲۶) شروع شد؛ درخواست‌های پیش از آن فقط در `docs/claude_history.md` و جدولِ تغییراتِ `README.md` هستند.',
         '> «اجراشده» یعنی کد در آن نسخه نصب‌شدنی است؛ «سنجیده» را موتور از داوری‌های ناظر حساب می‌کند و در ایمیلِ ۱۰ صبح می‌آید.',
         '> «؟» یعنی مطمئن نیستم خواسته را درست فهمیده‌ام.', '',
         '| # | شناسه | خواسته (خلاصه) | نسخه · کامیت | تست / شاهد | وضعیت |', '|---|---|---|---|---|---|']
    n = 0
    rows = sorted(d['requests'], key=lambda r: (r['id'][2:10], r['id']))
    for r in rows:
        n += 1
        ask = re.sub(r'\s+', ' ', r['ask']).replace('|', '¦')
        ask = ask if len(ask) <= 220 else ask[:217] + '…'
        how = re.sub(r'\s+', ' ', r.get('how', '')).replace('|', '¦')
        test = '; '.join(re.findall(r'tests/run_\w+\.js[^;·،]*', how))[:140] or how[:140]
        ver = str(r.get('ver', ''))
        st = STATUS.get(r['id']) or ('بسته: ' + r.get('closedWhy', '') if r.get('closed') else
                                     'کارِ صاحبِ کانال' if r.get('owner') else 'اجراشده')
        L.append('| %d | %s | %s | %s · `%s` | %s | %s |' % (n, r['id'], ask, ver, cm.get(ver, '—'), test, st))
    L += ['', '## مخزن', '', '- ریپو: `mahdighandi1989/Content-Engine` (عمومی) — https://github.com/mahdighandi1989/Content-Engine',
          '- شاخه‌ها: `main` (موتور هر شب ۲:۳۰ دبی از همین نصب می‌کند) و `claude/content-engine-setup-vmqf0h` (آینهٔ کارِ سشن)',
          '- دفتر: `docs/requests.json` · تاریخچهٔ هر نسخه: `docs/claude_history.md` · جدولِ تغییرات: `README.md`', '']
    open('docs/requests_report.md', 'w', encoding='utf-8').write('\n'.join(L))
    print(n, 'rows')

if __name__ == '__main__':
    main()
