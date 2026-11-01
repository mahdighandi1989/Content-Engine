#!/usr/bin/env python3
"""جداسازیِ گفتار از موسیقی در صدای یک «لحظه» (۱۵.۲).

صاحبِ کانال: «جداسازی موسیقی از گفتار در صدای کلیپ را بساز». ۸۶ و ۸۸ هر لحظه‌شان را به سدِ موسیقیِ ۱۴.۱ باختند
(کلیپِ اینستاگرامی زیرِ حرفش آهنگ دارد و Content-ID همان آهنگ را می‌گیرد). این‌جا demucs (htdemucs، دوشاخه: vocals)
گفتار را جدا می‌کند؛ رانر بعد **دوباره** با `musicgate.py` می‌شنود — جداسازی ادعا نیست، فقط وقتی پذیرفته است که
سنجه هم دیگر موسیقی نشنود. هر خطا ⇒ خروجیِ خالی با علت، و لحظه مثلِ پیش کنار می‌رود.

ورودی: argv[1] = wav، argv[2] = خروجی. stdout (خطِ آخر): {"ok": bool, "why": str, "sec": float}
وابستگی‌ها فقط وقتی نصب می‌شوند که لازم شوند (torch CPU + demucs) — قسمتی که لحظهٔ آهنگ‌دار ندارد هزینه‌ای نمی‌دهد.
"""
import json, os, shutil, subprocess, sys, tempfile, time

def ensure():
    try:
        import demucs  # noqa: F401
        return ''
    except Exception:
        pass
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', 'torch', 'torchaudio',
                        '--index-url', 'https://download.pytorch.org/whl/cpu'], check=True, timeout=600)
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', 'demucs', 'soundfile'], check=True, timeout=600)
        return ''
    except Exception as e:
        return 'نصبِ demucs نشد: ' + str(e)[:80]

def main():
    src, dst = sys.argv[1], sys.argv[2]
    t0 = time.time()
    why = ensure()
    if why:
        print(json.dumps({'ok': False, 'why': why, 'sec': 0}, ensure_ascii=False)); return
    out = tempfile.mkdtemp(prefix='vsep-')
    try:
        subprocess.run([sys.executable, '-m', 'demucs.separate', '-n', os.environ.get('VSEP_MODEL', 'htdemucs'),
                        '--two-stems=vocals', '-d', 'cpu', '-o', out, src], check=True, timeout=900,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        stem = os.path.splitext(os.path.basename(src))[0]
        cand = [os.path.join(dp, f) for dp, _, fs in os.walk(out) for f in fs if f == 'vocals.wav' and stem in dp]
        if not cand:
            print(json.dumps({'ok': False, 'why': 'خروجیِ گفتار پیدا نشد', 'sec': round(time.time() - t0, 1)}, ensure_ascii=False)); return
        shutil.copyfile(cand[0], dst)
        print(json.dumps({'ok': True, 'why': '', 'sec': round(time.time() - t0, 1)}, ensure_ascii=False))
    except subprocess.CalledProcessError as e:
        err = (e.stderr or b'').decode('utf-8', 'ignore').strip().splitlines()
        print(json.dumps({'ok': False, 'why': 'جداسازی نشد: ' + (err[-1] if err else str(e))[:100], 'sec': round(time.time() - t0, 1)}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'ok': False, 'why': 'جداسازی نشد: ' + str(e)[:100], 'sec': round(time.time() - t0, 1)}, ensure_ascii=False))
    finally:
        shutil.rmtree(out, ignore_errors=True)

if __name__ == '__main__':
    main()
