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
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = 'Content-Engine-visprobe/1.0 (+https://github.com/mahdighandi1989/Content-Engine)'
TIMEOUT = 25
HEAD_BYTES = 4096          # برای داوریِ سرآیند، چند کیلوبایت کافی است

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
#   ok, n, why, pre {license,mime,w,h,bytes}  ← آنچه **پیش از دانلود** معلوم است
#   url ← نشانیِ یک نامزد، برای آزمونِ سرآیند

def src_commons(q, kind='bitmap'):
    """ویکی‌مدیا کامنز. `extmetadata` مجوز را می‌دهد و `iiurlwidth` تصویرِ
       اندازه‌شده — یعنی لازم نیست یک فایلِ ۲۰ مگابایتی را برداریم تا
       ۱۹۲۰ پیکسل بخواهیم."""
    p = {
        'action': 'query', 'format': 'json', 'formatversion': '2',
        'generator': 'search', 'gsrsearch': 'filetype:%s %s' % (kind, q),
        'gsrnamespace': '6', 'gsrlimit': '5',
        'prop': 'imageinfo',
        'iiprop': 'url|size|mime|extmetadata',
        'iiurlwidth': '1920',
        'iiextmetadatafilter': 'LicenseShortName|License|UsageTerms|Artist',
    }
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(p)
    ok, d, why = get(url)
    if not ok:
        return {'ok': False, 'why': why}
    pages = ((d or {}).get('query') or {}).get('pages') or []
    out = {'ok': True, 'n': len(pages), 'why': '', 'pre': None, 'url': '', 'name': ''}
    for pg in pages:
        ii = (pg.get('imageinfo') or [{}])[0]
        em = ii.get('extmetadata') or {}
        lic = (em.get('LicenseShortName') or {}).get('value') or \
              (em.get('UsageTerms') or {}).get('value') or ''
        out['pre'] = {'license': lic, 'mime': ii.get('mime', ''),
                      'w': ii.get('width', 0), 'h': ii.get('height', 0),
                      'bytes': ii.get('size', 0)}
        out['url'] = ii.get('thumburl') or ii.get('url') or ''
        out['name'] = pg.get('title', '')
        break
    return out


def src_openverse(q):
    """اوپن‌ورس. یک API روی چند بانکِ تصویر؛ مجوز و ابعاد را در همان جواب
       می‌دهد. بی کلید کار می‌کند ولی سهمیه‌اش تنگ است — اگر ۴۰۱/۴۲۹ داد،
       همان جوابِ سنجش است، نه خطای ما."""
    p = {'q': q, 'page_size': '5', 'license_type': 'commercial'}
    url = 'https://api.openverse.org/v1/images/?' + urllib.parse.urlencode(p)
    ok, d, why = get(url)
    if not ok:
        return {'ok': False, 'why': why}
    res = (d or {}).get('results') or []
    out = {'ok': True, 'n': (d or {}).get('result_count', len(res)), 'why': '',
           'pre': None, 'url': '', 'name': ''}
    for r in res:
        out['pre'] = {'license': '%s %s' % (r.get('license', ''), r.get('license_version', '')),
                      'mime': r.get('filetype', ''), 'w': r.get('width', 0),
                      'h': r.get('height', 0), 'bytes': r.get('filesize', 0) or 0}
        out['url'] = r.get('url') or ''
        out['name'] = (r.get('title') or '')[:70]
        break
    return out


def src_archive(q, mediatype='image'):
    """آرشیو. همان منبعی که موتور از ۵٫۵۶ برای موسیقی می‌خوانَد، پس شبکه‌اش
       از Apps Script آزموده است. دو مرحله دارد: جست‌وجو، بعد `metadata`
       که فهرستِ فایل‌ها را با قالب و اندازه می‌دهد."""
    p = {'q': 'mediatype:(%s) AND %s' % (mediatype, q), 'rows': '4', 'output': 'json',
         'fl[]': 'identifier'}
    url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(p, doseq=True)
    ok, d, why = get(url)
    if not ok:
        return {'ok': False, 'why': why}
    docs = (((d or {}).get('response') or {}).get('docs')) or []
    out = {'ok': True, 'n': len(docs), 'why': '', 'pre': None, 'url': '', 'name': ''}
    for doc in docs:
        ident = doc.get('identifier') or ''
        if not ident:
            continue
        ok2, md, why2 = get('https://archive.org/metadata/' + urllib.parse.quote(ident))
        if not ok2:
            out['why'] = 'metadata: ' + why2
            continue
        lic = (md.get('metadata') or {}).get('licenseurl') or \
              (md.get('metadata') or {}).get('rights') or ''
        for f in (md.get('files') or []):
            fm = str(f.get('format', ''))
            if mediatype == 'image' and fm not in ('JPEG', 'PNG', 'JPEG 2000'):
                continue
            if mediatype == 'movies' and fm not in ('MPEG4', 'h.264', 'Ogg Video', 'WebM'):
                continue
            out['pre'] = {'license': lic, 'mime': fm, 'w': 0, 'h': 0,
                          'bytes': int(f.get('size') or 0)}
            out['url'] = 'https://archive.org/download/%s/%s' % (
                urllib.parse.quote(ident), urllib.parse.quote(str(f.get('name', ''))))
            out['name'] = ident
            break
        if out['url']:
            break
    return out


# منابعی که **کلید لازم دارند** — این‌جا سنجیده نمی‌شوند، ولی نوشته می‌شوند
# تا بعداً کشف نشوند. (قاعدهٔ ۷٫۴۵: نگفتنِ نیمهٔ دوم، همان سکوت است.)
NEED_KEY = [
    ('Pexels', 'api.pexels.com', 'کلیدِ مجانی، عکس و ویدئو، مجوزِ خودش'),
    ('Pixabay', 'pixabay.com/api', 'کلیدِ مجانی، عکس و ویدئو'),
    ('Unsplash', 'api.unsplash.com', 'کلیدِ مجانی، فقط عکس'),
]


def line(tag, r, test_bytes=True):
    if not r.get('ok'):
        print('  %-26s ❌ %s' % (tag, r.get('why', '')))
        return False
    pre = r.get('pre')
    if not pre:
        print('  %-26s ⚠️  رسید ولی نامزدی نداد (n=%s) %s'
              % (tag, r.get('n', 0), r.get('why', '')))
        return False
    print('  %-26s ✅ n=%-6s مجوز=%-22s قالب=%-12s %sx%s  %s کیلوبایت'
          % (tag, r.get('n', 0), (pre['license'] or '—')[:22], (pre['mime'] or '—')[:12],
             pre['w'] or '?', pre['h'] or '?',
             (pre['bytes'] // 1024) if pre['bytes'] else '?'))
    print('     نامزد: %s' % (r.get('name', '') or '—'))
    if not test_bytes or not r.get('url'):
        return True
    ok, got, why = get(r['url'], want_json=False, limit=HEAD_BYTES)
    if not ok:
        print('     بایت‌ها: ❌ %s' % why)
        return False
    fmt = sniff(got['bytes'])
    print('     بایت‌ها: %s %s (Content-Type گفت: %s)'
          % ('✅' if 'HTML' not in fmt and fmt != 'ناشناخته' else '❌',
             fmt, got['ctype'] or '—'))
    return True


def main():
    q = os.environ.get('VISPROBE_Q', '').strip() or 'epistemology knowledge'
    print('پرسشِ آزمون: «%s»' % q)
    print('')
    print('«پیش از دانلود چه می‌دانیم؟» — این ستون تمامِ دلیلِ این سنجش است:')
    print('')

    good = 0
    print('── تصویر ──')
    good += line('Wikimedia Commons', src_commons(q, 'bitmap'))
    good += line('Openverse', src_openverse(q))
    good += line('archive.org', src_archive(q, 'image'))
    print('')
    print('── ویدئو ──')
    good += line('Wikimedia Commons (video)', src_commons(q, 'video'))
    good += line('archive.org (movies)', src_archive(q, 'movies'))
    print('')
    print('── منابعی که کلید لازم دارند (سنجیده نشدند، فقط ثبت) ──')
    for nm, host, note in NEED_KEY:
        print('  %-26s 🔑 %s — %s' % (nm, host, note))

    print('')
    print('منبعِ قابلِ استفاده در این اجرا: %d' % good)
    # یک اجرای سبزِ بی‌جواب، بدترین حالت است — همان قاعدهٔ `render.js`.
    if good == 0:
        print('هیچ منبعی جواب نداد. یعنی لایهٔ دومِ طرح (عکس و ویدئوی آزاد) '
              'روی این رانر شدنی نیست و باید راهِ دیگری برایش پیدا شود.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
