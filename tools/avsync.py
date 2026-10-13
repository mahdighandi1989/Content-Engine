#!/usr/bin/env python3
"""هم‌زمانیِ گفتار و تصویر، از خودِ ویدئو (۸.۸۰).

ناظرِ روزانه این وارسی را چهار روز پیاپی «نشد» زد. این‌جا، کنارِ ساختِ همان ویدئو، سه
نقطه (حدودِ ۲۵٪، ۵۰٪ و ۷۵٪ِ ویدئو) شنیده می‌شود: صوتِ همان بازه با faster-whisper به متن
درمی‌آید و با گفتارِ صحنهٔ خودش و دو همسایه‌اش مقایسه می‌شود. همان منطقِ `qa`ِ تصویر:
شنیده‌شده باید به صحنهٔ خودش نزدیک‌تر باشد تا به همسایه‌ها.

ورودی: argv[1] = ویدئو، argv[2] = فایلِ JSONِ صحنه‌ها [{n,t0,say}], argv[3] = مدتِ صوت.
خروجی (stdout): JSON {n, ok, points:[...], why, model}. هر خطا ⇒ {ok:null, why} — «نشنیدم»
با «ناهم‌زمان بود» یکی نیست.

۸.۸۶: صوت را خودمان می‌خوانیم (`wave` + numpy) و آرایه به `transcribe` می‌دهیم. با مسیرِ فایل،
faster-whisper آن را با PyAV باز می‌کند و `av.open(..., metadata_errors=...)` روی نسخهٔ PyAVِ رانر
خطا داد — ۱۲ و ۱۳ اکتبر هر سه نقطه «شنیده نشد» و همان را «با تصویرش نمی‌خواند» نوشتیم. و نقطه‌ای که
شنیده نشد دیگر در داوری شمرده نمی‌شود: کمتر از دو نقطهٔ شنیده‌شده ⇒ ok:null، نه false.
"""
import json, re, subprocess, sys, tempfile, os

def norm(t):
    t = re.sub(r'[ً-ْٰـ]', '', str(t or ''))
    t = t.replace('ي', 'ی').replace('ك', 'ک').replace('‌', ' ')
    t = re.sub(r'[^\w\s]', ' ', t)
    return [w for w in t.split() if len(w) > 1]

def overlap(heard, said):
    h, s = set(norm(heard)), set(norm(said))
    if not h or not s:
        return 0.0
    return len(h & s) / float(min(len(h), len(s)))

def read_wav(path):
    """صوتِ ۱۶ کیلوهرتزِ تک‌کانالهٔ ffmpeg را بی PyAV می‌خواند (float32 در [-1, 1])."""
    import wave
    import numpy as np
    with wave.open(path, 'rb') as w:
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

def main():
    video, scenes_file, dur = sys.argv[1], sys.argv[2], float(sys.argv[3] or 0)
    scenes = [x for x in json.load(open(scenes_file, encoding='utf-8')) if x.get('say')]
    out = {'n': 0, 'ok': None, 'points': [], 'why': '', 'model': ''}
    if len(scenes) < 3:
        out['why'] = 'صحنه با گفتار کمتر از سه'
        print(json.dumps(out, ensure_ascii=False)); return
    scenes.sort(key=lambda x: float(x.get('t0') or 0))
    for i, x in enumerate(scenes):
        x['t1'] = float(scenes[i + 1]['t0']) if i + 1 < len(scenes) else dur
    pick = []
    for q in (0.25, 0.5, 0.75):
        i = min(len(scenes) - 1, max(0, int(len(scenes) * q)))
        while i < len(scenes) - 1 and (scenes[i]['t1'] - float(scenes[i]['t0'])) < 5:
            i += 1
        if i not in pick:
            pick.append(i)
    try:
        from faster_whisper import WhisperModel
        name = os.environ.get('AVSYNC_MODEL', 'small')
        model = WhisperModel(name, device='cpu', compute_type='int8')
        out['model'] = name
    except Exception as e:  # noqa: BLE001
        out['why'] = 'مدلِ شنیدن بالا نیامد: ' + str(e)[:120]
        print(json.dumps(out, ensure_ascii=False)); return
    good = 0
    heard_n = 0
    for i in pick:
        x = scenes[i]
        t0 = float(x['t0']) + 0.8
        span = max(4.0, min(10.0, x['t1'] - float(x['t0']) - 1.0))
        wav = tempfile.mktemp(suffix='.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(t0), '-t', str(span), '-i', video,
                        '-vn', '-ac', '1', '-ar', '16000', wav], check=False)
        heard = ''
        failed = False
        try:
            segs, _ = model.transcribe(read_wav(wav), language='fa', beam_size=1)
            heard = ' '.join(s.text for s in segs).strip()
        except Exception as e:  # noqa: BLE001
            heard = ''
            failed = True
            out['why'] = 'شنیدنِ صحنهٔ %s نشد: %s' % (x.get('n'), str(e)[:80])
        finally:
            try:
                os.remove(wav)
            except OSError:
                pass
        own = overlap(heard, x['say'])
        nb = max([overlap(heard, scenes[j]['say']) for j in (i - 1, i + 1) if 0 <= j < len(scenes)] or [0])
        if failed:
            # نشنیدن، ناهم‌زمانی نیست: این نقطه در داوری شمرده نمی‌شود.
            out['points'].append({'n': x.get('n'), 't': round(t0, 1), 'own': 0, 'nb': 0,
                                  'ok': None, 'heard': ''})
            continue
        heard_n += 1
        ok = bool(heard) and own >= 0.2 and (own > nb or nb == 0)
        good += 1 if ok else 0
        out['points'].append({'n': x.get('n'), 't': round(t0, 1), 'own': round(own, 2), 'nb': round(nb, 2),
                              'ok': ok, 'heard': heard[:120]})
    out['n'] = len(out['points'])
    out['ok'] = good >= max(1, heard_n - 1) if heard_n >= 2 else None
    if out['ok'] is None and out['n'] and not out['why']:
        out['why'] = 'کمتر از دو نقطه شنیده شد'
    if out['ok'] is False:
        bad = [str(p['n']) for p in out['points'] if p['ok'] is False]
        out['why'] = (out['why'] + ' · ' if out['why'] else '') + 'گفتارِ صحنهٔ ' + '، '.join(bad) + ' با تصویرش نمی‌خواند'
    print(json.dumps(out, ensure_ascii=False))

if __name__ == '__main__':
    main()
