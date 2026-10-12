#!/usr/bin/env python3
"""هم‌زمانیِ گفتار و تصویر، از خودِ ویدئو (۸.۸۰).

ناظرِ روزانه این وارسی را چهار روز پیاپی «نشد» زد. این‌جا، کنارِ ساختِ همان ویدئو، سه
نقطه (حدودِ ۲۵٪، ۵۰٪ و ۷۵٪ِ ویدئو) شنیده می‌شود: صوتِ همان بازه با faster-whisper به متن
درمی‌آید و با گفتارِ صحنهٔ خودش و دو همسایه‌اش مقایسه می‌شود. همان منطقِ `qa`ِ تصویر:
شنیده‌شده باید به صحنهٔ خودش نزدیک‌تر باشد تا به همسایه‌ها.

ورودی: argv[1] = ویدئو، argv[2] = فایلِ JSONِ صحنه‌ها [{n,t0,say}], argv[3] = مدتِ صوت.
خروجی (stdout): JSON {n, ok, points:[...], why, model}. هر خطا ⇒ {ok:null, why} — «نشنیدم»
با «ناهم‌زمان بود» یکی نیست.
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
    for i in pick:
        x = scenes[i]
        t0 = float(x['t0']) + 0.8
        span = max(4.0, min(10.0, x['t1'] - float(x['t0']) - 1.0))
        wav = tempfile.mktemp(suffix='.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(t0), '-t', str(span), '-i', video,
                        '-vn', '-ac', '1', '-ar', '16000', wav], check=False)
        heard = ''
        try:
            segs, _ = model.transcribe(wav, language='fa', beam_size=1)
            heard = ' '.join(s.text for s in segs).strip()
        except Exception as e:  # noqa: BLE001
            heard = ''
            out['why'] = 'شنیدنِ صحنهٔ %s نشد: %s' % (x.get('n'), str(e)[:80])
        own = overlap(heard, x['say'])
        nb = max([overlap(heard, scenes[j]['say']) for j in (i - 1, i + 1) if 0 <= j < len(scenes)] or [0])
        ok = bool(heard) and own >= 0.2 and (own > nb or nb == 0)
        good += 1 if ok else 0
        out['points'].append({'n': x.get('n'), 't': round(t0, 1), 'own': round(own, 2), 'nb': round(nb, 2),
                              'ok': ok, 'heard': heard[:120]})
    out['n'] = len(out['points'])
    out['ok'] = good >= max(1, out['n'] - 1) if out['n'] else None
    if out['ok'] is False:
        bad = [str(p['n']) for p in out['points'] if not p['ok']]
        out['why'] = (out['why'] + ' · ' if out['why'] else '') + 'گفتارِ صحنهٔ ' + '، '.join(bad) + ' با تصویرش نمی‌خواند'
    print(json.dumps(out, ensure_ascii=False))

if __name__ == '__main__':
    main()
