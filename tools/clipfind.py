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

def best_window(words, quote):
    """words: [(w, start, end)] · بهترین پنجرهٔ هم‌طولِ عبارت (±۳۰٪) با بیشترین واژهٔ مشترک."""
    q = norm(quote)
    if not q or not words:
        return None
    qs = set(q)
    n = len(q)
    best = None
    for L in sorted(set([max(2, int(n * 0.7)), n, int(n * 1.3) + 1])):
        for i in range(0, max(1, len(words) - L + 1)):
            win = words[i:i + L]
            hit = len(set(w for w, _, _ in win) & qs)
            score = hit / float(len(qs))
            if best is None or score > best[0]:
                best = (score, win[0][1], win[-1][2])
    return best

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
                for s in segs:
                    for w in (s.words or []):
                        for t in norm(w.word):
                            words.append((t, float(w.start), float(w.end)))
                cache[f] = words
                try: os.remove(tmp)
                except Exception: pass
            bw = best_window(cache[f], quote)
            if not bw:
                out[i] = {'found': False, 'why': 'گفتاری در کلیپ شنیده نشد'}
            elif bw[0] < 0.5:
                out[i] = {'found': False, 'score': round(bw[0], 2), 'why': 'عبارت در گفتارِ کلیپ پیدا نشد'}
            else:
                out[i] = {'found': True, 'from': round(bw[1], 2), 'to': round(bw[2], 2), 'score': round(bw[0], 2), 'why': ''}
        except Exception as e:
            out[i] = {'found': False, 'why': 'شنیدن نشد: ' + str(e)[:80]}
    print(json.dumps(out, ensure_ascii=False))

if __name__ == '__main__':
    main()
