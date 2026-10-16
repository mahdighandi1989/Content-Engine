#!/usr/bin/env python3
"""زمانِ هر واژهٔ متنِ ریلز در صدای خودش (۹.۲۶).

صاحبِ برنامه: «نوشته‌های توی عکس … همه‌ش تو یه کادر بودن». نوشتهٔ عبارت‌به‌عبارت (دو تا چهار واژه، درشت، هم‌زمان با
گفتن) زمانِ **واژه** می‌خواهد، و از ۹.۲۶ کلِ متن یک‌جا خوانده می‌شود (تا حالت و روح داشته باشد) — پس زمانِ جمله‌ها هم
دیگر از طولِ صدای جدای هر جمله نمی‌آید. این‌جا صدا با faster-whisper و زمانِ هر واژه شنیده می‌شود و واژه‌های **متنِ
ما** به ترتیب روی واژه‌های شنیده‌شده نشانده می‌شوند — با نسبتِ نویسهٔ انباشته، نه تطبیقِ عینی: whisper واژه را کج
می‌نویسد ولی ترتیب و درازا را نگه می‌دارد. نشد ⇒ نسبتِ نویسه روی کلِ بازهٔ گفتار (همان پشتیبانی که موتور هم دارد)،
و این **گفته می‌شود** (`how`).

ورودی: argv[1] wav، argv[2] فایلِ JSON: {words:[...], t0, t1}. خروجی (stdout، خطِ آخر): {how, times:[[a,b],...]}
صوت را خودمان می‌خوانیم (wave + numpy) — همان راهِ clipfind/avsync.
"""
import json, re, sys


def norm(w):
    w = re.sub(r'[ً-ْٰـ‌]', '', str(w or ''))
    return re.sub(r'[^\w]', '', w.replace('ي', 'ی').replace('ك', 'ک'))


def proportional(words, t0, t1):
    L = [max(1, len(norm(w))) for w in words]
    tot = float(sum(L)) or 1.0
    out, acc = [], 0
    for n in L:
        a = t0 + (t1 - t0) * acc / tot
        acc += n
        out.append([round(a, 3), round(t0 + (t1 - t0) * acc / tot, 3)])
    return out


def align(words, heard):
    """words: واژه‌های ما؛ heard: [(start, end, text)]. نسبتِ نویسهٔ انباشته ⇒ نزدیک‌ترین واژهٔ شنیده‌شده."""
    if not heard:
        return None
    Lw = [max(1, len(norm(w))) for w in words]
    Lh = [max(1, len(norm(h[2]))) for h in heard]
    tw, th = float(sum(Lw)), float(sum(Lh))
    cum_h, acc = [], 0
    for n in Lh:
        cum_h.append((acc / th, (acc + n) / th))
        acc += n
    out, acc, j = [], 0, 0
    for n in Lw:
        mid = (acc + n / 2.0) / tw
        acc += n
        while j + 1 < len(heard) and cum_h[j][1] < mid:
            j += 1
        h = heard[j]
        frac = (mid - cum_h[j][0]) / max(1e-6, cum_h[j][1] - cum_h[j][0])
        frac = min(1.0, max(0.0, frac))
        c = h[0] + (h[1] - h[0]) * frac
        out.append(c)
    # مرکزها ⇒ بازه‌ها: هر واژه از نیمه‌راهِ قبلی تا نیمه‌راهِ بعدی
    spans = []
    for i, c in enumerate(out):
        a = heard[0][0] if i == 0 else (out[i - 1] + c) / 2.0
        b = heard[-1][1] if i == len(out) - 1 else (c + out[i + 1]) / 2.0
        spans.append([round(a, 3), round(max(a + 0.05, b), 3)])
    return spans


def main():
    wav, req = sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8'))
    words, t0, t1 = req.get('words') or [], float(req.get('t0') or 0), float(req.get('t1') or 0)
    res = {'how': 'نسبتِ نویسه', 'times': proportional(words, t0, t1)}
    try:
        import wave
        import numpy as np
        from faster_whisper import WhisperModel
        with wave.open(wav, 'rb') as w:
            sr, ch = w.getframerate(), w.getnchannels()
            raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        if ch > 1:
            raw = raw.reshape(-1, ch).mean(axis=1)
        if sr != 16000:
            idx = np.arange(0, len(raw), sr / 16000.0)
            raw = np.interp(idx, np.arange(len(raw)), raw).astype(np.float32)
        m = WhisperModel('small', device='cpu', compute_type='int8')
        segs, _ = m.transcribe(raw, language='fa', word_timestamps=True, vad_filter=False, beam_size=1)
        heard = [(float(x.start), float(x.end), x.word) for s in segs for x in (s.words or [])
                 if float(x.start) >= t0 - 0.3 and float(x.end) <= t1 + 0.3]
        sp = align(words, heard) if len(heard) >= max(3, len(words) // 3) else None
        if sp:
            res = {'how': 'faster-whisper', 'times': sp, 'heard': len(heard)}
        else:
            res['why'] = 'واژهٔ شنیده‌شده کم بود (%d از %d)' % (len(heard), len(words))
    except Exception as e:
        res['why'] = str(e)[:160]
    print(json.dumps(res, ensure_ascii=False))


if __name__ == '__main__':
    main()
