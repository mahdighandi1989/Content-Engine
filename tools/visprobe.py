#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سنجشِ منابعِ تصویر و ویدئوی آزاد — پیش از آن که چیزی بر رویشان ساخته شود.

══ چرا این فایل وجود دارد ══
طرحِ «تصویر و ویدئو برای درس‌نامه» (`docs/lesson_visuals_plan.md`) دو لایهٔ
مجانی دارد، و لایهٔ دومش به منابعِ با مجوزِ آزاد تکیه می‌کند. از کانتینرِ
کلاد نمی‌شود این را سنجید: پروکسی `commons.wikimedia.org` و
`api.openverse.org` و `archive.org` را با ۴۰۳ روی CONNECT می‌بندد (سنجیده
شد، ۳۰ سپتامبر). پس همان تقسیمِ کارِ `_YT-RENDER.json`: **موتور تصمیم
می‌گیرد، اکشن کار می‌کند** — و این‌جا اکشن فقط *می‌پرسد*.

══ و درسی که اجرای اولِ خودِ این ابزار داد (۳۰ سپتامبر، ۰۶:۱۷) ══
نسخهٔ اول مجوز را **می‌خواند و رویش تصمیم نمی‌گرفت**. نتیجه: تنها «منبعِ
قابلِ استفاده»ای که پیدا کرد `youtube-rHrhBzqJenw` بود — یک بازنشرِ یوتیوب
در آرشیو، **۵۱۰ مگابایت، با مجوزِ خالی** — و ابزار آن را ✅ شمرد و سبز تمام
شد. یک سنجشِ سبز که معنایش صفر بود.

سه سد از همان‌جا آمد، و هر سه **پیش از دانلود**:
  ۱) **مجوزِ خالی = ردّ.** «نمی‌دانیم مجوزش چیست» با «آزاد است» یکی نیست.
     برای کانالی که قرار است درآمد داشته باشد، تصویرِ بی‌مجوز از تصویرِ
     نداشته بدتر است.
  ۲) **سقفِ اندازه.** ۵۱۰ مگابایت برای یک کلیپِ چندثانیه‌ای یعنی این نامزد
     چیزِ دیگری است.
  ۳) **بازنشرِ یوتیوب = ردّ، با نام.** `youtube-*` در آرشیو به‌حکمِ ساختار
     یک پرسشِ حق‌نشر است، هرچه در فرادَیش نوشته باشد.

و «n=0» بی‌جواب رها نمی‌شود: پرسشِ **سادهٔ تک‌واژه** هم امتحان می‌شود و
خطا/هشدارِ خودِ API چاپ می‌شود — چون «منبع چیزی ندارد» و «پرسشِ من تنگ بود»
دو چیزِ متفاوت با دو درمانِ متفاوت‌اند، و نتیجه‌گیریِ اولی از دومی کلِ لایهٔ
دوم را بی‌دلیل کنار می‌گذارد.

قاعدهٔ اصلیِ بخشِ ۲۳ (موسیقی) این‌جا عیناً همان قاعده است و تمامِ دلیلِ
انتخابِ این منابع است: **باید بتوان یک نامزد را پیش از دانلود رد کرد.**
آرشیو برای موسیقی انتخاب شد چون endpointِ `metadata` قالب و اندازه و مجوزِ
هر فایل را می‌گوید؛ همه‌جای دیگر باید دانلود کنی تا بفهمی. همان پرسش،
این‌بار برای تصویر: **آیا مجوز و اندازه و قالب، پیش از دانلود، در جوابِ
جست‌وجو هست؟** جوابِ «نه» یعنی آن منبع برای این کار مناسب نیست، هر چقدر هم
تصویرِ خوب داشته باشد.

و قاعدهٔ دومِ همان بخش: **بایت‌ها را باور کن، نه نام و نه Content-Type را.**
یک صفحهٔ خطا هم بایت برمی‌گرداند و ۲۰۰ می‌دهد. پس یک نامزد واقعاً دانلود
می‌شود و سرآیندش خوانده می‌شود، نه پسوندش.

هیچ چیزی نصب نمی‌کند (فقط کتابخانهٔ استاندارد)، هیچ کلیدی لازم ندارد، هیچ
چیزی در درایو یا ریپو نمی‌نویسد، و هیچ آموزشی راه نمی‌اندازد. خروجی‌اش یک
گزارشِ متنی در لاگِ اکشن است و بس.

اجرا:
    VISPROBE_Q='معرفت‌شناسی' python3 tools/visprobe.py
"""

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = 'Content-Engine-visprobe/2.0 (+https://github.com/mahdighandi1989/Content-Engine)'
TIMEOUT = 25
HEAD_BYTES = 4096          # برای داوریِ سرآیند، چند کیلوبایت کافی است
IMG_MAX_MB = 25            # عکسِ بزرگ‌تر از این، برای یک اسلاید چیزِ دیگری است
VID_MAX_MB = 120           # و کلیپِ بزرگ‌تر از این هم

# مجوزهایی که می‌شود رویشان حساب کرد. NC و ND عمداً نیستند: کانال قرار است
# درآمد داشته باشد، و ویدئو خودش اثرِ اشتقاقی است.
# اوپن‌ورس کدِ خالی می‌دهد (`by-sa 2.0`, `pdm 1.0`) و کامنز نامِ کامل
# (`CC BY-SA 3.0`). هر دو شکل باید شناخته شود، وگرنه یک منبعِ کامل بی‌دلیل
# کنار می‌رود — که در اجرای ۳۰ سپتامبر ۰۶:۵۰ دقیقاً همین شد.
LIC_OK = [r'\bcc0\b', r'\bpublic\s*domain\b', r'\bpdm\b', r'\bpd\b', r'\bpd-',
          r'\bzero\b',
          r'(?:\bcc[\s\-]?)?\bby\b', r'(?:\bcc[\s\-]?)?\bby[\s\-]?sa\b',
          r'creativecommons\.org/licenses/by(-sa)?/',
          r'creativecommons\.org/publicdomain/']
LIC_NO = [r'all\s*rights\s*reserved', r'\bnc\b', r'non-?commercial', r'\bnd\b',
          r'no-?deriv', r'\bfair\s*use\b', r'\bcopyright(ed)?\b']

# سرآیندهای شناخته — نه پسوند، نه Content-Type
MAGIC = [
    (b'\x89PNG\r\n\x1a\n', 'PNG'),
    (b'\xff\xd8\xff', 'JPEG'),
    (b'GIF87a', 'GIF'), (b'GIF89a', 'GIF'),
    (b'\x1a\x45\xdf\xa3', 'Matroska/WebM'),
    (b'OggS', 'Ogg'),
    (b'%PDF', 'PDF'),
]


def sniff(b):
    """قالبِ واقعیِ بایت‌ها. WEBP و MP4 چهار بایتِ اولشان طول است، پس جدا."""
    for sig, name in MAGIC:
        if b.startswith(sig):
            return name
    if len(b) >= 12 and b[0:4] == b'RIFF' and b[8:12] == b'WEBP':
        return 'WEBP'
    if len(b) >= 12 and b[4:8] == b'ftyp':
        return 'ISO-BMFF (MP4/MOV)'
    if b[:1] == b'<':
        return 'HTML/XML — یعنی فایل نرسید، صفحه رسید'
    return 'ناشناخته'


def licOk_(t):
    """
    مجوز، پیش از دانلود. **خالی یعنی ردّ.**

    «نمی‌دانیم مجوزش چیست» با «آزاد است» یکی نیست، و همین تفاوت فرقِ کانالی
    است که درآمد دارد با کانالی که ادعای حق‌نشر می‌گیرد. نسخهٔ اولِ همین ابزار
    این سد را نداشت و یک بازنشرِ یوتیوبِ بی‌مجوز را ✅ شمرد.
    """
    t = ' ' + re.sub(r'\s+', ' ', str(t or '')).strip().lower() + ' '
    if not t.strip():
        return False, 'مجوز خالی است — «نمی‌دانیم» با «آزاد» یکی نیست'
    for bad in LIC_NO:
        if re.search(bad, t):
            return False, 'مجوز اجازه نمی‌دهد: ' + t.strip()[:40]
    for good in LIC_OK:
        if re.search(good, t):
            return True, ''
    return False, 'مجوزِ ناشناخته: ' + t.strip()[:40]


def sizeOk_(b, kind):
    cap = (VID_MAX_MB if kind == 'video' else IMG_MAX_MB) * 1024 * 1024
    if not b:
        return True, ''                    # اندازهٔ نامعلوم، خودش ردّ نیست
    if int(b) > cap:
        return False, '%d مگابایت، از سقفِ %d گذشت' % (int(b) // 1048576, cap // 1048576)
    return True, ''


MIN_W = 800                # زیرِ این عرض، برای یک اسلایدِ ۱۰۸۰p قابلِ استفاده نیست


def judge(c, kind):
    """سه سد، همه پیش از دانلود. مجوز اول — فایلِ بی‌مجوز هر چقدر مناسب
       باشد استفاده‌شدنی نیست."""
    if kind == 'video' and re.match(r'^youtube-', str(c.get('name') or '')):
        return False, 'بازنشرِ یوتیوب — پرسشِ حق‌نشر است، هرچه فرادَیش بگوید'
    ok, why = licOk_(c.get('license'))
    if not ok:
        return False, why
    ok, why = sizeOk_(c.get('bytes'), kind)
    if not ok:
        return False, why
    # ابعادِ نامعلوم ردّ نیست (۷٫۴۰)؛ ابعادِ **کوچکِ معلوم** هست. اجرای ۰۶:۵۰
    # یک ویدئوی ۳۲۰×۲۴۰ را تنها نامزدِ مجوزدارِ ویدئو داد — که برای ۱۰۸۰p
    # چیزی نیست.
    w = int(c.get('w') or 0)
    if w and w < MIN_W:
        return False, '%d پیکسل عرض — برای اسلایدِ ۱۰۸۰p کوچک است' % w
    return True, ''


def apiNote_(d):
    """خطا/هشدارِ خودِ API — بی این، «n=0» و «پرسشم تنگ بود» یکی می‌شوند."""
    if not isinstance(d, dict):
        return ''
    bits = []
    if d.get('error'):
        bits.append('error: ' + json.dumps(d['error'], ensure_ascii=False)[:110])
    if d.get('warnings'):
        bits.append('warnings: ' + json.dumps(d['warnings'], ensure_ascii=False)[:110])
    return ' · '.join(bits)


def get(url, want_json=True, limit=None):
    """یک درخواستِ GET. خطا برنمی‌گرداند؛ (ok, data|bytes, why) می‌دهد."""
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            code = r.getcode()
            raw = r.read(limit) if limit else r.read()
            ctype = r.headers.get('Content-Type', '')
            clen = r.headers.get('Content-Length', '')
    except urllib.error.HTTPError as e:
        return False, None, 'HTTP %s' % e.code
    except Exception as e:                                    # شبکه، TLS، DNS
        return False, None, '%s: %s' % (type(e).__name__, str(e)[:90])
    if code != 200:
        return False, None, 'کدِ %s' % code
    if not want_json:
        return True, {'bytes': raw, 'ctype': ctype, 'clen': clen}, ''
    try:
        return True, json.loads(raw.decode('utf-8', 'replace')), ''
    except Exception as e:
        return False, None, 'بدنه JSON نبود (%s): %s' % (ctype, raw[:70])


# ─────────────────────────── منبع‌ها ───────────────────────────
# هر تابع یک dict برمی‌گرداند:
#   ok, n, why, note, cands[{license,mime,w,h,bytes,url,name}]
# داوری در `judge` می‌افتد نه این‌جا — یک جا تصمیم می‌گیرد، نه سه جا.

def src_commons(q, kind='bitmap'):
    """ویکی‌مدیا کامنز. `extmetadata` مجوز را می‌دهد و `iiurlwidth` تصویرِ
       اندازه‌شده — یعنی لازم نیست یک فایلِ ۲۰ مگابایتی را برداریم تا
       ۱۹۲۰ پیکسل بخواهیم."""
    p = {
        'action': 'query', 'format': 'json', 'formatversion': '2',
        'generator': 'search', 'gsrsearch': 'filetype:%s %s' % (kind, q),
        'gsrnamespace': '6', 'gsrlimit': '8',
        'prop': 'imageinfo',
        'iiprop': 'url|size|mime|extmetadata',
        'iiurlwidth': '1920',
        'iiextmetadatafilter': 'LicenseShortName|License|UsageTerms|Artist',
    }
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(p)
    ok, d, why = get(url)
    if not ok:
        return {'ok': False, 'why': why, 'cands': []}
    pages = ((d or {}).get('query') or {}).get('pages') or []
    out = {'ok': True, 'n': len(pages), 'why': '', 'note': apiNote_(d), 'cands': []}
    for pg in pages:
        ii = (pg.get('imageinfo') or [{}])[0]
        em = ii.get('extmetadata') or {}
        lic = (em.get('LicenseShortName') or {}).get('value') or \
              (em.get('License') or {}).get('value') or \
              (em.get('UsageTerms') or {}).get('value') or ''
        out['cands'].append({
            'license': lic, 'mime': ii.get('mime', ''),
            'w': ii.get('thumbwidth') or ii.get('width') or 0,
            'h': ii.get('thumbheight') or ii.get('height') or 0,
            'bytes': ii.get('size', 0),
            # ویدئو: نشانیِ **خودِ فایل**. `thumburl` برای ویدئو یک فریمِ
            # JPEG است، و اجرای ۰۶:۵۰ دقیقاً همان را «✅ JPEG» گزارش کرد
            # برای یک `.webm` — یعنی ادعای «ویدئو کار می‌کند» روی یک عکسِ
            # ساکن سنجیده شده بود.
            'url': (ii.get('url') if kind == 'video'
                    else (ii.get('thumburl') or ii.get('url'))) or '',
            'name': pg.get('title', '')})
    return out


def src_openverse(q):
    """اوپن‌ورس. یک API روی چند بانکِ تصویر؛ مجوز و ابعاد را در همان جواب
       می‌دهد. بی کلید کار می‌کند ولی سهمیه‌اش تنگ است — اگر ۴۰۱/۴۲۹ داد،
       همان جوابِ سنجش است، نه خطای ما."""
    p = {'q': q, 'page_size': '8', 'license_type': 'commercial'}
    url = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode(p)
    ok, d, why = get(url)
    if not ok:
        return {'ok': False, 'why': why, 'cands': []}
    res = (d or {}).get('results') or []
    out = {'ok': True, 'n': (d or {}).get('result_count', len(res)), 'why': '',
           'note': apiNote_(d), 'cands': []}
    for r in res:
        out['cands'].append({
            'license': ('%s %s' % (r.get('license', ''),
                                   r.get('license_version', ''))).strip(),
            'mime': r.get('filetype', ''), 'w': r.get('width', 0),
            'h': r.get('height', 0), 'bytes': r.get('filesize') or 0,
            'url': r.get('url') or '', 'name': (r.get('title') or '')[:60]})
    return out


def src_archive(q, mediatype='image'):
    """آرشیو. همان منبعی که موتور از ۵٫۵۶ برای موسیقی می‌خوانَد، پس شبکه‌اش
       از Apps Script آزموده است. دو مرحله دارد: جست‌وجو، بعد `metadata`
       که فهرستِ فایل‌ها را با قالب و اندازه می‌دهد."""
    p = {'q': 'mediatype:(%s) AND %s' % (mediatype, q), 'rows': '8', 'output': 'json',
         'fl[]': 'identifier'}
    url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(p, doseq=True)
    ok, d, why = get(url)
    if not ok:
        return {'ok': False, 'why': why, 'cands': []}
    docs = (((d or {}).get('response') or {}).get('docs')) or []
    out = {'ok': True, 'n': len(docs), 'why': '', 'note': '', 'cands': []}
    for doc in docs[:5]:
        ident = str(doc.get('identifier') or '')
        if not ident:
            continue
        ok2, md, why2 = get('https://archive.org/metadata/' + urllib.parse.quote(ident))
        if not ok2:
            out['note'] = 'metadata: ' + why2
            continue
        meta = md.get('metadata') or {}
        lic = meta.get('licenseurl') or meta.get('rights') or meta.get('license') or ''
        for f in (md.get('files') or []):
            fm = str(f.get('format', ''))
            if mediatype == 'image' and fm not in ('JPEG', 'PNG', 'JPEG 2000'):
                continue
            if mediatype == 'movies' and fm not in ('MPEG4', 'h.264', 'Ogg Video',
                                                    'WebM', 'h.264 IA'):
                continue
            out['cands'].append({
                'license': lic, 'mime': fm, 'w': 0, 'h': 0,
                'bytes': int(f.get('size') or 0),
                'url': 'https://archive.org/download/%s/%s'
                       % (urllib.parse.quote(ident),
                          urllib.parse.quote(str(f.get('name', '')))),
                'name': ident})
            break
    return out


# منابعی که **کلید لازم دارند** — این‌جا سنجیده نمی‌شوند، ولی نوشته می‌شوند
# تا بعداً کشف نشوند. (قاعدهٔ ۷٫۴۵: نگفتنِ نیمهٔ دوم، همان سکوت است.)
NEED_KEY = [
    ('Pexels', 'api.pexels.com', 'کلیدِ مجانی، عکس و ویدئو، مجوزِ خودش'),
    ('Pixabay', 'pixabay.com/api', 'کلیدِ مجانی، عکس و ویدئو'),
    ('Unsplash', 'api.unsplash.com', 'کلیدِ مجانی، فقط عکس'),
]


def report(tag, r, kind, test_bytes=True):
    """برمی‌گرداند: آیا این منبع **یک نامزدِ مجوزدار** داد؟"""
    if not r.get('ok'):
        print('  %-26s ❌ %s' % (tag, r.get('why', '')))
        return False
    cands = r.get('cands') or []
    if not cands:
        print('  %-26s ⚠️  رسید، نامزدی نداد (n=%s)%s'
              % (tag, r.get('n', 0), (' — ' + r['note']) if r.get('note') else ''))
        return False

    passed, first, rejected = [], None, []
    for c in cands:
        ok, why = judge(c, kind)
        if ok:
            passed.append(c)
            if first is None:
                first = c
        else:
            # ردّ **با دلیل** جمع می‌شود، وگرنه «۸ نامزد، ۰ قبول» بی‌معناست.
            # و **پس از** سرتیترِ منبعِ خودش چاپ می‌شود: در اجرای ۰۶:۵۰
            # ردّهای اوپن‌ورس زیرِ ✅ی کامنز نشستند و گزارش خودش گمراه‌کننده شد.
            rejected.append('     ✗ %-32s %s' % ((c.get('name') or '?')[:32], why))

    if not passed:
        print('  %-26s ❌ %d نامزد آمد و هیچ‌کدام از سدها نگذشت'
              % (tag, len(cands)))
        for ln in rejected:
            print(ln)
        return False

    print('  %-26s ✅ %d از %d نامزد از سدها گذشت (n=%s)'
          % (tag, len(passed), len(cands), r.get('n', 0)))
    for ln in rejected:
        print(ln)
    print('     نامزد: %s' % ((first.get('name') or '—')[:62]))
    print('     مجوز=%s  قالب=%s  %sx%s  %s کیلوبایت'
          % ((first['license'] or '—')[:32], (first['mime'] or '—')[:14],
             first['w'] or '?', first['h'] or '?',
             (first['bytes'] // 1024) if first['bytes'] else '?'))
    if not test_bytes or not first.get('url'):
        return True
    ok, got, why = get(first['url'], want_json=False, limit=HEAD_BYTES)
    if not ok:
        print('     بایت‌ها: ❌ %s' % why)
        return False
    fmt = sniff(got['bytes'])
    good = 'HTML' not in fmt and fmt != 'ناشناخته'
    print('     بایت‌ها: %s %s (Content-Type گفت: %s)'
          % ('✅' if good else '❌', fmt, got['ctype'] or '—'))
    return good


def main():
    q = (os.environ.get('VISPROBE_Q') or '').strip() or 'epistemology knowledge'
    # «پرسشِ من تنگ بود» با «منبع چیزی ندارد» یکی نیست، و اولی با یک واژه
    # معلوم می‌شود. اجرای اول با چهار واژه همه‌جا n=0 داد؛ بی این تفکیک،
    # نتیجه‌گیری «منابعِ مجانی جواب نمی‌دهند» بود که ممکن است اصلاً غلط باشد.
    words = [w for w in re.split(r'\s+', q) if len(w) > 3]
    q2 = words[0] if words and words[0] != q else ''

    print('پرسشِ آزمون: «%s»' % q)
    if q2:
        print('و پرسشِ سادهٔ دوم: «%s» — برای تفکیکِ «منبع خالی است» از '
              '«پرسشم تنگ بود»' % q2)
    print('')
    print('سه سد، همه پیش از دانلود: مجوز · اندازه · بازنشرِ یوتیوب.')
    print('**مجوزِ خالی = ردّ** — «نمی‌دانیم» با «آزاد» یکی نیست.')

    good = 0
    for qq in ([q, q2] if q2 else [q]):
        print('')
        print('══ پرسش: «%s» ══' % qq)
        print('── تصویر ──')
        good += report('Wikimedia Commons', src_commons(qq, 'bitmap'), 'image')
        good += report('Openverse', src_openverse(qq), 'image')
        good += report('archive.org', src_archive(qq, 'image'), 'image')
        print('── ویدئو ──')
        good += report('Wikimedia Commons (video)', src_commons(qq, 'video'), 'video')
        good += report('archive.org (movies)', src_archive(qq, 'movies'), 'video')

    print('')
    print('── منابعی که کلید لازم دارند (سنجیده نشدند، فقط ثبت) ──')
    for nm, host, note in NEED_KEY:
        print('  %-26s 🔑 %s — %s' % (nm, host, note))

    print('')
    print('منبعِ **مجوزدارِ** قابلِ استفاده در این اجرا: %d' % good)
    # یک اجرای سبزِ بی‌جواب، بدترین حالت است — همان قاعدهٔ `render.js`.
    if good == 0:
        print('هیچ منبعی نامزدِ مجوزدار نداد. یعنی لایهٔ دومِ طرح روی این '
              'پرسش‌ها جواب نمی‌دهد و راهش یا عوض‌کردنِ پرسش‌سازی است، یا '
              'منبعِ کلیددار (Pexels/Pixabay)، یا لایهٔ سومِ پولی.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
