#!/usr/bin/env python3
"""جای یک عبارت در گفتارِ یک کلیپ (۸.۹۶) — «همون قسمتی که ازش می‌گه منتشر بشه».

موتور برای هر کلیپ تکه‌ای **عیناً** از گفتارِ آن را می‌گوید (همان متنی که تحلیل‌گرِ منبع از کلیپ
نوشته). این‌جا کلیپ با faster-whisper و زمانِ هر واژه شنیده می‌شود و پنجره‌ای از واژه‌های شنیده‌شده
که بیشترین هم‌پوشانی را با آن عبارت دارد پیدا می‌شود. زیرِ آستانه ⇒ «پیدا نشد»، نه یک حدس: کلیپی
که از جای غلط شروع شود بدتر از کلیپی است که از آغازش.

ورودی: argv[1] = فایلِ JSON: [{file, quote}]. خروجی (stdout، خطِ آخر): [{found, from, to, score, why}].
صوت را خودمان می‌خوانیم (wave + numpy)، همان راهِ avsync.py (۸.۸۶): مسیرِ PyAVِ faster-whisper روی
رانر خطا داد.
"""
import json, os, re, subprocess, sys, tempfile

def norm(t):
    t = re.sub(r'[ً-ْٰـ]', '', str(t or ''))
    t = t.replace('ي', 'ی').replace('ك', 'ک').replace('‌', ' ')
    t = re.sub(r'[^\w\s]', ' ', t)
    return [w for w in t.split() if len(w) > 1]

def read_wav(path):
    import wave
    import numpy as np
    with wave.open(path, 'rb') as w:
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

def _sim(a, b):
    from difflib import SequenceMatcher
    return SequenceMatcher(None, a, b).ratio()

def _score(win, q):
    """هم‌پوشانیِ **نزدیک**، نه عینی (۸.۹۸). نمونهٔ ۷۲: whisperِ small روی صدای پرسروصدا «باید
    بپذیرم بخش بسیاری از جامعه» را «باید ببزیرن بخشر بسیاریات جامه» شنید — جای درست، واژه‌های کج.
    شمارشِ واژهٔ عینی ۰٫۱۱ داد و «پیدا نشد» شد؛ هر شش کلیپِ نمونه همین‌طور، و هر سه لحظه با آن‌ها.
    هر واژهٔ عبارت با نزدیک‌ترین واژهٔ پنجره، به نسبتِ نویسه‌ای (زیرِ ۰٫۶ صفر)، وزن‌دار به درازای واژه.
    سنجیده روی پنج کلیپِ واقعی: عبارتِ درست ۰٫۶۶ تا ۰٫۷۸ در برابرِ ۰٫۲۴ تا ۰٫۲۹ جاهای دیگرِ همان کلیپ؛
    جملهٔ ساختگی تا ۰٫۴۷ (در کلیپِ ۴۶۱ ثانیه‌ای — هرچه کلیپ درازتر، کفِ نویز بالاتر). مقایسهٔ نویسه‌ایِ
    کلِ پنجره هم آزموده شد و کنار رفت: ساختگی را تا ۰٫۴۶ می‌بُرد."""
    ws = [w for w, _, _ in win]
    tot = 0.0
    W = 0.0
    for t in q:
        wt = max(1, len(t) - 1)                 # «با» و «که» همه‌جا جورند؛ واژهٔ بلند شاهدِ بیشتری است
        W += wt
        b = max(_sim(t, w) for w in ws)
        tot += wt * b if b >= 0.6 else 0.0
    return tot / W

def best_window(words, quote):
    """words: [(w, start, end)] · بهترین پنجرهٔ هم‌طولِ عبارت (±۳۰٪)، و **دومین** پنجرهٔ بی‌هم‌پوشانی.
    بازگشت: (score, start, end, second) یا None."""
    q = norm(quote)
    if not q or not words:
        return None
    n = len(q)
    cand = []
    for L in sorted(set([max(2, int(n * 0.7)), n, int(n * 1.3) + 1])):
        for i in range(0, max(1, len(words) - L + 1)):
            win = words[i:i + L]
            cand.append((_score(win, q), win[0][1], win[-1][2]))
    cand.sort(key=lambda c: -c[0])
    best = cand[0]
    second = 0.0
    for c in cand[1:]:
        if c[2] <= best[1] or c[1] >= best[2]:
            second = c[0]
            break
    return (best[0], best[1], best[2], second)

def accept(bw):
    """پذیرش: ≥ ۰٫۵۵ **و** آشکارا بهتر از هر جای دیگرِ کلیپ (۱٫۵ برابرِ دومی) — یا آن‌قدر روشن (≥ ۰٫۷)
    که تکرارِ همان جمله در کلیپ (ترجیع‌بند) مانعش نشود. جای غلط بدتر از آغازِ کلیپ است: کلیپِ آرشیوی
    که بهترینش روی جای غلط افتاده بود، و کلیپِ ۴۶۱ ثانیه‌ای که جای درستش ۰٫۵۴ و جای دیگرش ۰٫۴۷ بود، هر دو
    رد می‌شوند — «از آغاز» با یادداشت، نه حدس."""
    if not bw:
        return False
    s, second = bw[0], bw[3]
    return s >= 0.55 and (s >= 1.5 * second or s >= 0.7)

def sentence_end(spans, start, to, min_len=6.0, max_len=20.0):
    """پایانِ طبیعیِ «لحظه» (۹.۰۰): نه آخرین واژهٔ عبارت، بلکه پایانِ جملهٔ گوینده.
    صاحبِ برنامه نمونهٔ دوم را دید: «وقتی صدای کلیپ پخش می‌شد یه قسمتِ خیلی کوتاه بود و سریع هم قطع
    می‌شد». لحظه درست سرِ آخرین واژهٔ عبارت بریده می‌شد — وسطِ نفسِ گوینده. حالا تا پایانِ بخشِ گفتاریِ
    whisper که عبارت در آن تمام شد، و اگر کوتاه‌تر از `min_len` بود، بخش‌های بعدی هم، تا سقفِ `max_len`.
    مکث میانِ بخش‌ها جای طبیعیِ بریدن است."""
    end = to
    for a, b in spans:
        if a <= to + 0.05 and b >= to - 0.05:
            end = max(end, b)
            break
    for a, b in spans:
        if a < end - 0.05:
            continue
        if end - start >= min_len:
            break
        if b - start > max_len:
            break
        end = b
    return min(end, start + max_len)

def main_part(spans, near=None, min_len=6.0, max_len=20.0, gap=0.6):
    """بخشِ اصلیِ گفتارِ کلیپ، وقتی عبارتِ مدل دقیق پیدا نشد (۹.۰۴).
    صاحبِ برنامه: «اولین کلیپ رو که اصلاً پخش هم نکرد چه برسه که بخواد با صدا هم باشه». در دو نمونهٔ آخر از هر
    شش کلیپ دو تا به‌خاطرِ «عبارت پیدا نشد» (۰٫۵۷ در برابرِ ۰٫۴۶) بی‌صدا ماندند — یعنی برای یک نقلِ نه‌چندان دقیق،
    کلِ صدای کلیپ دور ریخته شد. حالا: اگر بهترین پنجره دست‌کم «احتمالی» است (`near`)، همان بخشِ گفتاری؛ وگرنه
    بلندترین بخشِ پیوستهٔ گفتار. پایان مثلِ «لحظه»: پایانِ جملهٔ گوینده، ۶ تا ۲۰ ثانیه."""
    if not spans:
        return None
    runs = []
    for a, b in sorted(spans):
        if runs and a - runs[-1][1] <= gap:
            runs[-1][1] = max(runs[-1][1], b)
        else:
            runs.append([a, b])
    pick, how = None, 'longest'
    if near is not None:
        for r in runs:
            if r[0] - 0.3 <= near <= r[1] + 0.3:
                pick, how = r, 'probable'
                break
    if pick is None:
        pick = max(runs, key=lambda r: r[1] - r[0])
    start = pick[0]
    if how == 'probable':
        # آغازِ همان جملهٔ گوینده (بخشِ whisper) که پنجرهٔ احتمالی در آن است — نه آغازِ کلِ گفتارِ پیوسته،
        # که می‌تواند ده ثانیه زودتر باشد.
        for a, b in sorted(spans):
            if a - 0.3 <= near <= b + 0.3:
                start = a
                break
    end = sentence_end(spans, start, start + 0.1, min_len, max_len)
    return {'from': round(start, 2), 'end': round(end, 2), 'how': how}

def main():
    reqs = json.load(open(sys.argv[1], encoding='utf-8'))
    out = [{'found': False, 'why': 'شنیده نشد'} for _ in reqs]
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(os.environ.get('AVSYNC_MODEL', 'small'), device='cpu', compute_type='int8')
    except Exception as e:
        print(json.dumps([{'found': False, 'why': 'مدلِ شنیدن بارگذاری نشد: ' + str(e)[:80]} for _ in reqs],
                         ensure_ascii=False))
        return
    cache = {}
    for i, r in enumerate(reqs):
        f, quote = r.get('file'), r.get('quote') or ''
        if not f or not quote.strip():
            out[i] = {'found': False, 'why': 'عبارتی نبود'}
            continue
        try:
            if f not in cache:
                tmp = tempfile.mktemp(suffix='.wav')
                subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', f, '-vn',
                                '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', tmp], check=True)
                segs, _ = model.transcribe(read_wav(tmp), language='fa', word_timestamps=True,
                                           vad_filter=True, beam_size=1)
                words = []
                spans = []
                for s in segs:
                    spans.append((float(s.start), float(s.end)))
                    for w in (s.words or []):
                        for t in norm(w.word):
                            words.append((t, float(w.start), float(w.end)))
                cache[f] = words
                cache[f + '#spans'] = spans
                try: os.remove(tmp)
                except Exception: pass
            bw = best_window(cache[f], quote)
            if not bw:
                out[i] = {'found': False, 'why': 'گفتاری در کلیپ شنیده نشد'}
            elif not accept(bw):
                out[i] = {'found': False, 'score': round(bw[0], 2), 'second': round(bw[3], 2),
                          'why': 'عبارت در گفتارِ کلیپ پیدا نشد (' + str(round(bw[0], 2)) + ' در برابرِ ' + str(round(bw[3], 2)) + ')',
                          'main': main_part(cache[f + '#spans'], bw[1] if bw[0] >= 0.45 else None)}
            else:
                out[i] = {'found': True, 'from': round(bw[1], 2), 'to': round(bw[2], 2), 'score': round(bw[0], 2),
                          'second': round(bw[3], 2), 'end': round(sentence_end(cache[f + '#spans'], bw[1], bw[2]), 2),
                          'why': ''}
        except Exception as e:
            out[i] = {'found': False, 'why': 'شنیدن نشد: ' + str(e)[:80]}
    print(json.dumps(out, ensure_ascii=False))

if __name__ == '__main__':
    main()
