#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voicelab.py — آزمایشگاهِ صدا. گامِ صفرِ «شبیه‌سازیِ صدا».

══ این فایل چه چیزی را می‌سنجد و چرا ══

خواستهٔ صاحبِ برنامه: پادکست با صدای یک گویندهٔ مشخص خوانده شود. راهی که
اول به ذهن می‌رسد — «فرکانس‌ها را دربیاور و به مدل بگو» — بن‌بست است: کلِ
صداسازیِ موتور از `ttsPayloads_` می‌گذرد و آنجا فقط یک **نام** فرستاده
می‌شود (`prebuiltVoiceConfig.voiceName`)، از فهرستِ ۲۲تاییِ آماده. هیچ
فیلدی برای نمونهٔ صوتی وجود ندارد. پس مدلِ دیگری باید صدا را بسازد.

و دو خانوادهٔ متفاوت از مدل‌ها این کار را می‌کنند — که فرقشان برای ما
تعیین‌کننده است:

  الف) **TTS با کلونینگ** (xtts, f5, chatterbox): متن + نمونهٔ صدا را
       می‌گیرد و از صفر می‌خواند. اشکالش این است که باید **فارسی بلد
       باشد**، و فارسی در فهرستِ رسمیِ بیشترشان نیست.

  ب) **تبدیلِ صدا** (seedvc): یک صوتِ آماده را می‌گیرد و رنگِ صدایش را به
       نمونه نزدیک می‌کند. **این برای ما بهتر است**، چون صوتِ آماده‌مان
       خروجیِ Gemini است که فارسی را با اعرابِ درست می‌خواند. یعنی درستیِ
       فارسی از مسیرِ امروزی می‌آید و فقط رنگِ صدا عوض می‌شود.

══ قاعدهٔ این فایل ══
هیچ ادعایی نمی‌کند. هر موتور یا کار می‌کند و خروجی می‌دهد، یا خطایش
**عیناً** در گزارش می‌آید. اجرایی که همهٔ موتورها در آن شکست بخورند هم
اجرای موفقی است — چون جوابِ «کدام‌ها اصلاً کار می‌کنند» را می‌دهد.

══ پروانه (license) ══
پروانهٔ *کد* با پروانهٔ *وزن‌های مدل* یکی نیست و این تلهٔ واقعی است:
`coqui-tts` کدش MPL است ولی وزن‌های XTTS-v2 زیرِ CPML و **غیرتجاری**‌اند.
کانالِ ما قرار است درآمد داشته باشد، پس هر موتور پروانهٔ هر دو را در
گزارش می‌آورد.
"""

import argparse, io, json, math, os, re, shutil, subprocess, sys, tempfile, time, traceback, types

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fa2latin

# ══ آماده‌سازیِ دیتاست ══
# منطقش در `dsprep.py` است، نه اینجا: همان کد در نوت‌بوکِ Colab هم
# اجرا می‌شود و دو نسخه از یک متن، همان شکستی است که این ریپو بارها
# خورده. اینجا فقط موتورِ آزمایشگاه می‌مانَد که گزارش می‌نویسد.
from dsprep import *                                        # noqa: F401,F403
from dsprep import (DS_SR, VAD_SR, DS_GAP_MIN, DS_SEG_MIN, DS_SEG_MAX,
                    DS_SAMPLE_SEC, DS_GAP_REL_DB, DS_FLOOR_REL_DB,
                    dbOf_, dsDecode_, dsSpeech_, dsSlice_, dsGaps_,
                    dsFloorDb_, dsCap_, dsRuns_, dsSegments_,
                    dsWriteCuts_, dsJoin_, dsPick_, buildDataset_,
                    DS_TOTAL_MAX, DS_DEPS, DS_SPK_MIN, dsSegOk_)

# متنِ آزمون: یک جملهٔ واقعیِ اعراب‌دار از خودِ زنجیرهٔ ما. اعراب عمدی است —
# سدِ `speak`/`speak2` موتور همین را تولید می‌کند و ورودیِ واقعیِ هر موتورِ
# صدا همین خواهد بود، نه متنِ بی‌اعراب.
DEFAULT_TEXT = (
    "دَر بَررَسیِ مَعرِفَت‌شِناسیِ اِدراک، پِیوَندِ میانِ حِس و باوَر اَز اَهَمیَتی "
    "بُنیادی بَرخوردار اَست. تَجرُبهٔ دیداری به خودیِ خود می‌تَوانَد پایه‌ای "
    "اُستوار بَرایِ شِکل‌گیریِ شِناخت باشَد."
)

# ══ آنچه سنجیده شد و بسته است — تا دوباره دنبالش نرویم ══
#
# پس از سی‌وسه اجرا، معماری روشن است و مدل هنوز نه:
#
#   جمینای واژه‌ها را با **لحن و تلفظِ درست** می‌سازد  →  یک مبدلِ صدا
#   فقط رنگِ صدا را عوض می‌کند. لحن بازتولید نمی‌شود، پس دست‌نخورده
#   می‌مانَد. این را صاحبِ برنامه با گوش تأیید کرد.
#
# بهترین مبدل تا امروز OpenVoice v2 است: پروانهٔ MIT (صریحاً تجاری‌مجاز)،
# و سرعتش روی CPU **کمتر از بلادرنگ** — شش ثانیه برای دوازده ثانیه صوت،
# یعنی حدودِ ده دقیقه برای یک قسمتِ نوزده‌دقیقه‌ای، بی هیچ موازی‌سازی.
# شباهتِ رنگِ صدا: حدودِ ۷۰٪.
#
# چهار اهرم برای بالابردنِ آن ۷۰٪ سنجیده شد. یکی کمک کرد، سه تا نه:
#   ✔ یک نمونه ← میانگینِ همهٔ نمونه‌ها      «۴ بهتر بود»
#   ✘ هم‌جنس‌بودنِ مبدأ (زن/مرد)             «باز هم زیر ۴۰٪» (ChatterboxVC)
#   ✘ tau: ۰٫۳ در برابرِ ۰٫۰۵                «مثل هم بودن»
#   ✘ تمیزکردنِ ضبط‌های مرجع                 «فرقی احساس نکردم»
#
# پس ۷۰٪ سقفِ zero-shot است با آنچه در دست است. اهرمِ بعدی دیگر تنظیم
# نیست، **آموزش** است (RVC روی خودِ صدای گوینده) — که یک‌بار GPU لازم
# دارد. کسی که تنظیمِ پنجم را امتحان کند، وقتش را خرج می‌کند نه کیفیت را.
#
# و موتورهایی که از دور خارج شدند، با دلیل:
#   • MOSS-TTS-Realtime — شاهدِ بی‌وصله هم صدای زن داد. خودِ مدلِ پایه
#     کلون نمی‌کند؛ «صوتِ مرجع» را زمینهٔ مکالمه می‌فهمد، نه صدای هدف.
#   • KiaBush (f5/IPA) — درست می‌خوانَد ولی بی‌روح، و پروانه‌اش غیرتجاری.
#   • OmniVoice — رنگِ صدا عالی، ولی غلط می‌خوانَد و پروانهٔ وزنش نامعلوم.
#   • Thomcles/Chatterbox فارسی — غیرتجاری. Qwen3-TTS — فارسی ندارد.
#   • xtts — نه فارسی، نه وزنِ تجاری.

ENGINES = {
    # ══ چرا این اول آمد (اجرای #۲) ══
    # اجرای دوم دو چیز را با هم ثابت کرد: Chatterbox رنگِ صدای مرجع را از
    # ۲۰ ثانیه **گرفت** («نزدیک به صدای رضوی»)، ولی واژه‌ها بی‌معنا بودند.
    # علتش را از داخلِ خودِ بسته درآوردم: `SUPPORTED_LANGUAGES` بیست‌وسه
    # زبان دارد و فارسی در آن **نیست** (عربی و عبری و ترکی هست).
    # یعنی نیمهٔ سختِ کار — گرفتنِ صدا — جواب داده و فقط نیمهٔ زبان مانده.
    # و همان بسته کلاسِ `ChatterboxVC` را دارد: تبدیلِ صدا. واژه‌ها را از
    # صوتِ مبدأ می‌گیرد (خروجیِ Gemini، فارسیِ درست) و فقط رنگِ صدا را عوض
    # می‌کند. پس مسئلهٔ زبان اصلاً پیش نمی‌آید.
    "chatterboxvc": {
        "family": "تبدیلِ صدا (رنگِ صدا عوض می‌شود، واژه‌ها نه)",
        "pip": ["chatterbox-tts"],
        "code_license": "MIT",
        "needs_src": True,
        "persian": "زبان‌مستقل — واژه‌ها از صوتِ مبدأ می‌آیند",
        "note": "خروجی واترمارکِ نامحسوسِ Perth می‌گیرد (داخلِ خودِ کتابخانه)",
    },
    # ══ نه موتورِ صدا، آماده‌سازیِ خوراکِ آموزش ══
    # ضبط‌های بلندِ داستان‌خوانی تیزر و میان‌برنامه دارند، و موسیقی در
    # دادهٔ آموزش سم است. خروجی‌اش تکه‌های تمیز است، به‌علاوهٔ **دو فایلِ
    # شنیدنی**: آنچه نگه داشته و آنچه دور ریخته.
    "dataset": {
        "family": "آماده‌سازیِ دیتاست (خروجی تکه‌های صوتی و دو نمونهٔ داوری)",
        # فهرست از `dsprep` می‌آید، همان که نوت‌بوک هم نصبش می‌کند —
        # وگرنه روزی یکی‌شان بسته‌ای اضافه می‌کند و آن‌یکی نه.
        "pip": list(DS_DEPS),
        "code_license": "MIT (silero-vad — از LICENSE مخزنشان)",
        "needs_src": False,
        "persian": "زبان‌مستقل — هیچ متنی خوانده نمی‌شود",
        "note": "حکم صادر نمی‌کند؛ شواهدِ شنیدنی می‌دهد",
    },
    # ══ نه یک موتور، یک اثبات ══
    # این چیزی تولید نمی‌کند که بشنوی. کلِ زنجیرهٔ آموزشِ RVC را روی CPU
    # یک بار تا آخر می‌بَرد تا وقتی کاربر در Colab دکمه را می‌زند، مسیر
    # از پیش پیموده شده باشد. خروجی‌اش یک فایلِ مدل است، نه صوت.
    "rvcsmoke": {
        "family": "اثباتِ زنجیرهٔ آموزش (خروجی مدل است، نه صوت)",
        # ══ torchaudio عمداً نیست، و گاردِ ۱۶ همین را پرسید ══
        # اولش نوشته بودمش. بخشِ ۱۶ِ خودآزما اعتراض کرد («torchaudio بی
        # torchcodec») و جوابِ آسان این بود که torchcodec هم اضافه کنم.
        # ولی سؤالِ درست این است که اصلاً لازم است یا نه — و سورس می‌گوید
        # نه: در `infer/audio.py` واردکردنِ torchaudio داخلِ try/except است
        # و فقط برای انتخابِ مسیرِ سریعِ **CUDA** وجود دارد، و خودِ
        # `preprocess.py` پیش از واردکردنش `RVC_AUDIO_FORCE_CPU=1` می‌گذارد
        # که کلِ آن بلوک را رد می‌کند. پس روی CPU هرگز به کار نمی‌رود.
        # گاردی که وادارت کند وابستگی را **برداری**، بهتر از گاردی است که
        # وادارت کند یکی دیگر اضافه کنی.
        "pip": ["torch"],
        "code_license": "MIT (کد و وزن‌ها — اسکنِ #۳۵)",
        "needs_src": False,
        "persian": "بی‌ربط — اینجا هیچ متنی خوانده نمی‌شود",
        "note": "دو دوره روی CPU؛ کیفیتش بی‌معنی است و عمداً چنین است",
    },
    "seedvc": {
        "family": "تبدیلِ صدا (رنگِ صدا عوض می‌شود، واژه‌ها نه)",
        # ══ اجرای #۵: همان خطا، چون اشتباهی را نصفه فهمیدم ══
        # اجرای #۳ گفت «TorchCodec is required». من آن را «ffmpeg نیست»
        # خواندم و از apt نصبش کردم — و f5 با همان اصلاح باز شد، که
        # تأییدِ دروغینی به من داد. ولی برای seedvc پیامْ *واقعاً* همان
        # چیزی بود که نوشته بود: بستهٔ پایتونیِ torchcodec اصلاً نصب
        # نبود. یک خطا دو علتِ ممکن داشت و من زودتر از موعد یکی را
        # انتخاب کردم.
        "pip": ["seed-vc", "torchcodec"],
        "code_license": "GPL",
        "needs_src": True,
        "persian": "زبان‌مستقل — واژه‌ها را نمی‌سازد، پس فارسی برایش موضوع نیست",
    },
    "chatterbox": {
        "family": "TTS با کلونینگ",
        "pip": ["chatterbox-tts"],
        "code_license": "MIT",
        "needs_src": False,
        "persian": "باید سنجیده شود — فهرستِ زبان‌هایش را همین اجرا چاپ می‌کند",
    },
    "f5": {
        "family": "TTS با کلونینگ",
        # بستهٔ دومی برای مسیرِ IPA: راهِ رسمیِ خودِ سازندهٔ چک‌پوینت.
        # `f5-tts==1.1.22` را خودش پین می‌کند — که همان نسخه‌ای است که
        # تا امروز با آن کار کرده‌ایم، پس تکرارپذیری هم بالا می‌رود.
        "pip": ["f5-tts", "persian-ipa-to-speech-f5"],
        "code_license": "MIT (کد)",
        "needs_src": False,
        "persian": "چک‌پوینتِ پایه انگلیسی/چینی است؛ فارسی باید سنجیده شود",
    },
    # ══ چرا این آخر آمد، و چرا شاید اول باشد (پس از اجرای #۱۸) ══
    # نویسندهٔ MOSS-TTS-Nano — همان مدلی که داشتم برایش موتور می‌ساختم —
    # در «محدودیت‌های شناخته‌شده»ی مخزنِ خودش نوشته است: «برای فارسیِ
    # بلند، مدلِ بزرگِ غیرِخودبازگشتی مثلِ OmniVoice یک متنِ کامل را در
    # یک فراخوان می‌سازد و ابزارِ بهتری است». وقتی سازندهٔ یک مدل دربارهٔ
    # کارِ خودش این را بنویسد، حرفش را باید جدی گرفت.
    #
    # چهار چیز را از **خودِ بستهٔ ۰٫۲٫۱** خواندم، نه از کارتِ مدل:
    #   • واژه‌سازِ واقعیِ HF — تلهٔ «نویسهٔ ناشناخته → فاصله»ی f5 اینجا نیست
    #   • اعراب در بودجهٔ زمان وزنِ **صفر** دارند (`"mark": 0.0`)
    #   • تکه‌کردنِ متنِ بلند داخلِ خودش است (بالای ۳۰ ثانیه → تکه‌های ۱۵ثانیه‌ای)
    #   • با ref_text دادن، صوتِ مرجع **بریده نمی‌شود**
    # و فارسی: ۳۶۶ ساعت، رتبهٔ ۴۶ از ۶۴۶ زبان.
    #
    # آنچه هنوز نمی‌دانیم و فقط اجرا می‌گوید: سرعت روی CPU. عددهای مخزن
    # همه روی H100 است و ماشینِ ما GPU ندارد. همان سؤالی که seedvc را
    # (۱۲۵ برابرِ بلادرنگ) از دور خارج کرد.
    "omnivoice": {
        "family": "TTS با کلونینگ (مدلِ انتشاریِ غیرِخودبازگشتی)",
        "pip": ["omnivoice"],
        "code_license": "Apache-2.0 (کد) · وزن‌ها: از کارتِ مدل خوانده و گزارش می‌شود",
        "needs_src": False,
        "persian": "فارسی در ۶۴۶ زبانش هست — ۳۶۶ ساعت، رتبهٔ ۴۶",
    },
    # ══ گزینهٔ دومِ صاحبِ برنامه، پس از اجراهای #۲۰ و #۲۱ ══
    # f5 درست می‌خوانَد ولی بی‌روح؛ OmniVoice رنگِ صدا را عالی می‌گیرد ولی
    # غلط می‌خوانَد. این تنها نامزدی است که در کارتِ خودش **لحن** را هدف
    # اعلام کرده — «pronunciation، ezafe voicing و conversational
    # register» — و روی GPTInformal-Persian آموزش دیده که پیکرهٔ گفتارِ
    # محاوره است، نه جمله‌خوانی.
    # و هر دو نیمه‌اش Apache-2.0 است: برخلافِ KiaBush و Thomcles که هر دو
    # غیرتجاری‌اند، این یکی برای کانالی که قرار است درآمد داشته باشد بسته
    # نیست.
    "moss": {
        "family": "TTS با کلونینگ (خودبازگشتی، ۱٫۷ میلیارد پارامتر)",
        # کدش روی PyPI نیست — در خودِ اجرا از گیت‌هاب کلون می‌شود.
        # ══ و `torchcodec` — همان علتی که این ریپو سه بار خورد ══
        # اجرای #۳: f5 با «libavutil.so.56 نیست» افتاد و seedvc سرِ ذخیره
        # با «TorchCodec is required». هر دو یک چیز بودند: torchaudioی
        # تازه خواندن و نوشتنِ صوت را به `torchcodec` سپرده. آن روز فهمیدم،
        # در ENGINES["seedvc"] نوشتمش، و برای این موتور **از نو فراموش
        # کردم** — اجرای MOSS با دقیقاً همان پیام افتاد.
        # دانستنی که در یک ردیف نوشته شود و در ردیفِ بعدی نباشد، دانسته
        # نیست. آزمونِ ۱۶ حالا این را قاعده می‌کند: هر موتوری که
        # torchaudio دارد، torchcodec هم باید داشته باشد.
        # ══ transformers **دقیقاً** ۵٫۰٫۰ ══
        # سدِ سوم: «create_causal_mask() got an unexpected keyword argument
        # 'input_embeds'». امضای آن تابع در نسخه‌های بعدیِ transformers عوض
        # شده. و این را باید از اول می‌دانستم: `pyproject.toml` خودِ مخزن
        # `transformers==5.0.0` را پین کرده و READMEشان صریح می‌گوید
        # «محیطِ ایزوله با Transformers 5.0.0». من کارتِ مدل را برای API
        # خواندم و pyproject را برای وابستگی‌ها **نخواندم**.
        "pip": ["torch", "torchaudio", "torchcodec", "transformers==5.0.0",
                "peft", "accelerate"],
        "code_license": "Apache-2.0 (پایه و وصله، هر دو)",
        "needs_src": False,
        "persian": "وصلهٔ فارسیِ اختصاصی روی MOSS-TTS-Realtime",
    },
    # ══ پس از دو دادهٔ روشن از ChatterboxVC ══
    # مبدأ زن → «کمی شبیه»؛ مبدأ مرد → «زیر ۴۰٪». پس مشکل جنسیت نبود،
    # خودِ آن مدل ضعیف است. و OmniVoice با همان یک نمونه رنگِ رضوی را
    # «خیلی خیلی خوب» درآورد — یعنی نمونه خوب است و ایراد در انتقال.
    # معماریِ OpenVoice دقیقاً برای همین ساخته شده: رنگِ صدا را از بقیه
    # جدا می‌کند و فقط همان را عوض می‌کند.
    # پروانه MIT، و README صریح: «Free for both commercial and research
    # use» — برخلافِ KiaBush و Thomcles که غیرتجاری‌اند.
    "openvoice": {
        "family": "تبدیلِ صدا (رنگِ صدا عوض می‌شود، واژه‌ها نه)",
        # `setup.py`شان numpy==1.22 و gradio==3.48 را پین کرده که هیچ‌کدام
        # برای ToneColorConverter لازم نیست. کد کلون می‌شود و فقط
        # وابستگی‌های واقعی نصب — همان الگوی MOSS.
        "pip": ["torch", "torchaudio", "torchcodec", "librosa", "soundfile",
                "unidecode", "inflect", "eng_to_ipa", "pypinyin", "cn2an",
                "jieba", "langid", "huggingface_hub"],
        "code_license": "MIT (کد و وزن‌ها، صریحاً تجاری‌مجاز)",
        "needs_src": True,
        "persian": "زبان‌مستقل — واژه‌ها از صوتِ مبدأ می‌آیند",
    },
    "xtts": {
        "family": "TTS با کلونینگ",
        # اجرای #۲: «Coqui TTS requires PyTorch … but they were not found».
        # coqui-tts عمداً تورچ را وابستگیِ خودش نمی‌گذارد (نسخه‌اش به
        # سخت‌افزار بستگی دارد)، پس باید صریح نصب شود.
        # اجرای #۳: «cannot import name 'isin_mps_friendly' from
        # transformers.pytorch_utils» — coqui-tts با transformersِ تازه
        # نمی‌سازد. سقف می‌گذاریم. (این موتور کم‌ارزش‌ترین است چون وزن‌هایش
        # غیرتجاری‌اند؛ فقط برای کامل‌شدنِ تصویر می‌ماند.)
        # torchcodec: همان قاعده‌ای که آزمونِ ۱۶ می‌سنجد. این موتور هنوز
        # اجرا نشده بود که به این سد بخورد؛ قاعده پیش از شکست گرفتش.
        "pip": ["torch", "torchaudio", "torchcodec", "transformers<4.50",
                "coqui-tts"],
        "code_license": "MPL-2.0 (کد) · وزن‌ها: CPML — **غیرتجاری**",
        "needs_src": False,
        "persian": "فارسی در فهرستِ رسمیِ ۱۷ زبانِ XTTS-v2 **نیست**",
    },
}


# چقدر از هر نمونه بررسی شود، و مهلتش. ده دقیقه برای پیداکردنِ یک پنجرهٔ
# سی‌ثانیه‌ایِ خوب بیش از کافی است، و سقف را از «هرچه باشد» درمی‌آورد.
SURVEY_SEC = 600
SURVEY_TIMEOUT = 240

# بودجهٔ یک اجرای OmniVoice. سقفِ خودِ کار ۱۰۰ دقیقه است؛ این عدد نصفِ آن
# است تا برای بارگذاری، رونویس و بایگانیِ خروجی جا بماند.
OMNI_BUDGET_SEC = 2700

# ══ بودجهٔ اجرای دودیِ RVC ══
# هدفِ این اعداد کیفیت نیست؛ هدف این است که هر پنج قدم **یک بار** تا آخر
# برود. دو دوره روی چند دقیقه صدا مدلی می‌سازد که به هیچ درد نمی‌خورد —
# و دقیقاً همان چیزی است که می‌خواهیم بدانیم ساخته می‌شود یا نه.
RVC_SMOKE_SECONDS = 90      # از هر ضبط، سقفِ این‌قدر
RVC_SMOKE_EPOCHS = 2
RVC_STEP_TIMEOUT = 2400     # هر قدم مهلتِ خودش را دارد (درسِ اجرای #۱۱)


def sh(cmd, timeout=None, **kw):
    """
    اجرای فرمان با خروجیِ زنده — تا در سیاههٔ اکشن دیده شود.

    ══ چرا مهلت (اجرای #۱۱) ══
    یک فراخوانِ ffmpeg دو ساعت و نیم روی **یک** فایل ماند و کلِ کار سرِ
    سقفِ زمان لغو شد. فرمانی که مهلت ندارد، سقفِ زمانِ کلِ کار را مهلتِ
    خودش می‌کند — و آن‌وقت هزینهٔ یک ورودیِ بدقلق، کلِ آزمایش است.
    """
    print("$ " + " ".join(cmd), flush=True)
    try:
        return subprocess.run(cmd, check=False, timeout=timeout, **kw)
    except subprocess.TimeoutExpired:
        class _T(object):
            returncode = 124
            stdout = b""
            stderr = ("مهلتِ %ss تمام شد" % timeout).encode("utf-8")
        print("مهلت تمام شد (%ss): %s" % (timeout, cmd[0]), flush=True)
        return _T()


def shTail_(cmd, tailLines=40, **kw):
    """فرمان را اجرا کن، خروجی‌اش را نگه دار، و دُمش را برگردان.

    `sh` خروجی را زنده به لاگ می‌دهد که برای کارِ طولانی خوب است، ولی
    چیزی برای **گزارش** باقی نمی‌گذارد. اینجا هر دو: در فایل جمع می‌شود،
    آخرش دُمش هم چاپ می‌شود هم در گزارش می‌نشیند.
    """
    print("$ " + " ".join(cmd), flush=True)
    path = os.path.join(tempfile.mkdtemp(), "out.txt")
    with io.open(path, "wb") as f:
        try:
            r = subprocess.run(cmd, check=False, stdout=f,
                               stderr=subprocess.STDOUT, **kw)
            code = r.returncode
        except subprocess.TimeoutExpired:
            code = 124
    txt = io.open(path, encoding="utf-8", errors="replace").read()
    return "\n".join(txt.splitlines()[-tailLines:]), code


# نشانه‌هایی که «علتِ واقعی» را حمل می‌کنند. ترتیب مهم است: آخرین
# استثنا معمولاً گویاتر از اولی است.
ERR_MARKS_ = ("Error:", "Exception:", "error:", "No module named",
              "Traceback (most recent call last)")


def errGist_(tail):
    """از دُمِ خروجی، گویاترین خط را بیرون بکش.

    پیامِ «کد ۱» به کسی نمی‌گوید چه شد. یک خطِ درست — مثلاً
    `ModuleNotFoundError: No module named 'infer'` — تفاوتِ یک اجرای
    دیگر با یک اصلاحِ درست است.
    """
    lines = [ln.strip() for ln in (tail or "").splitlines() if ln.strip()]
    for ln in reversed(lines):
        if any(m in ln for m in ERR_MARKS_):
            return ln[:300]
    return lines[-1][:300] if lines else "خروجی‌ای نبود"


def ffmpeg():
    """
    مسیرِ ffmpeg — اول از خودِ سیستم، بعد از PyPI.

    ══ اجرای #۴، و شکلِ آشنای اشتباه ══
    اجرای #۳ نشان داد torchcodec به کتابخانه‌های اشتراکیِ ffmpeg نیاز دارد،
    پس در گردش‌کار از `imageio-ffmpeg` (باینریِ استاتیک) به `apt` رفتم. و
    همان‌جا خطِ نصبِ imageio-ffmpeg را برداشتم — در حالی که این تابع هنوز
    از آن می‌پرسید. نتیجه: هر پنج کار با
    `ModuleNotFoundError: No module named 'imageio_ffmpeg'` افتادند، پیش از
    آنکه هیچ مدلی امتحان شود.

    درسش همان درسِ همیشگیِ این ریپوست، این بار روی خودم: **وقتی سازوکاری
    را عوض می‌کنی، دنبالِ هر چیزی بگرد که به سازوکارِ قبلی وابسته بود.**
    حالا هیچ‌کدام تنها راه نیست: اگر `ffmpeg` روی PATH باشد همان، وگرنه
    باینریِ PyPI. هر دو محیط کار می‌کند.
    """
    import shutil
    p = shutil.which("ffmpeg")
    if p:
        return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def to_wav(src, dst, seconds=None, rate=24000):
    """
    نرمال‌سازیِ نمونه: تک‌کاناله، ۲۴ کیلوهرتز، بی سکوتِ ابتدا و انتها.

    ۲۴ کیلوهرتز عمدی است: خروجیِ Gemini TTS در همین پروژه دقیقاً همین است
    (`CFG.SAMPLE_RATE`)، پس هر چیزی که بسازیم بی تبدیلِ دوباره کنارِ بقیهٔ
    صدا می‌نشیند. و `silenceremove` چون سکوتِ ابتدای فایل، به‌اندازهٔ نویز
    کیفیتِ نمونه‌برداری را خراب می‌کند.
    """
    f = ffmpeg()
    cmd = [f, "-y", "-nostdin", "-i", src, "-ac", "1", "-ar", str(rate),
           "-af", "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-45dB,"
                  "areverse,silenceremove=start_periods=1:start_silence=0.1:start_threshold=-45dB,areverse,"
                  "loudnorm=I=-18:TP=-2"]
    if seconds:
        cmd += ["-t", str(seconds)]
    cmd += [dst]
    r = sh(cmd, capture_output=True, timeout=SURVEY_TIMEOUT)
    if r.returncode != 0:
        raise RuntimeError("ffmpeg: " + r.stderr.decode("utf-8", "replace")[-800:])
    return dst


def frames_(path, win=0.02):
    """قاب‌بندیِ RMS. audioop اگر بود (سریع، C)، وگرنه پایتونِ خالص."""
    import wave, array, math
    w = wave.open(path, "rb")
    rate, n = w.getframerate(), w.getnframes()
    raw = w.readframes(n)
    w.close()
    N = int(rate * win) * 2          # ۲ بایت بر نمونه
    out = []
    try:
        import audioop
        for i in range(0, len(raw) - N, N):
            out.append(audioop.rms(raw[i:i + N], 2))
    except Exception:
        a = array.array("h"); a.frombytes(raw)
        M = N // 2
        for i in range(0, len(a) - M, M):
            t = 0
            for x in a[i:i + M]:
                t += x * x
            out.append(math.sqrt(t / M))
    return out, win, rate, n / float(rate)


def srcInfo_(path):
    """
    این فایل چقدر است و چه قالبی دارد — **پیش** از هر پردازشی.

    اجرای #۱۱ روی یک فایل دو ساعت و نیم ماند و در گزارش هیچ نشانی از
    اینکه آن فایل چه بود نمانده. طولِ ورودی ارزان‌ترین عددِ ممکن است و
    گران‌ترین تصمیم را روشن می‌کند.
    """
    r = sh([ffmpeg(), "-hide_banner", "-nostdin", "-i", path], capture_output=True,
           timeout=60)
    log = (r.stderr or b"").decode("utf-8", "replace")
    out = {"raw": ""}
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", log)
    if m:
        out["seconds"] = round(int(m.group(1)) * 3600 + int(m.group(2)) * 60
                               + float(m.group(3)), 1)
    m = re.search(r"Audio:\s*([^\n]+)", log)
    if m:
        out["raw"] = m.group(1).strip()[:120]
    return out


def refScore_(path):
    """
    یک نمونهٔ صدا چقدر برای کلونینگ خوب است — و کجایش.

    ══ چرا سنجیدن، نه شنیدن ══
    سه فایل رسید و سؤال «کدام؟» است. من نمی‌توانم بشنوم و صاحبِ برنامه
    هم نمی‌داند مدل به چه حساس است. ولی سه چیزی که تعیین‌کننده‌اند، عدد
    دارند:

    ۱) **کفِ سکوت.** در گفتارِ تمیز، مکث‌ها به سکوتِ واقعی می‌رسند. اگر
       زیرِ صدا موسیقی یا فضاسازی باشد، کف هرگز پایین نمی‌آید. مدل آن
       بستر را هم بخشی از «صدای گوینده» می‌گیرد و در خروجی بازتولیدش
       می‌کند — یعنی یک نمونهٔ موزیک‌دار، هر قسمت را آلوده می‌کند. این
       تنها معیارِ **ردکننده** است، نه ترجیحی.

    ۲) **مکث‌ها.** `cutAtPause_` باید جایی برای بریدن داشته باشد، و خودِ
       f5 هم نمونه را سرِ سکوت می‌شکند. پنجره‌ای بی هیچ مکث، یعنی برشِ
       کور.

    ۳) **پیوستگیِ تراز.** اگر بلندیِ صدا در پنجره بالا و پایین بپرد
       (تدوین، دو راوی، جلوه)، مدل میانگینِ چیزی را می‌گیرد که وجود ندارد.

    خروجی: بهترین پنجرهٔ سی‌ثانیه‌ای و نمرهٔ آن، با دلیل — تا انتخاب قابلِ
    بازبینی باشد، نه یک عددِ سربسته.
    """
    import math
    rms, win, rate, dur = frames_(path)
    if not rms:
        return {"error": "قاب‌بندی نشد", "score": -99}
    db = [20 * math.log10((v or 1e-9) / 32768.0) for v in rms]
    peak = max(db)
    quiet = sorted(db)[:max(1, len(db) // 10)]
    floor = sum(quiet) / len(quiet) - peak      # کفِ سکوت نسبت به بلندترین
    thr = peak - 32

    def window(a, b):
        seg = db[a:b]
        voiced = [d > thr for d in seg]
        if not voiced:
            return None
        # ══ کفِ سکوت باید مالِ همین پنجره باشد، نه کلِ فایل ══
        # آزمونِ محلی این را لو داد: فایلی که ده دقیقه‌اش موسیقی دارد و سه
        # دقیقه‌اش پاک است، روی کلِ فایل کفِ پاک نشان می‌دهد (چون
        # ساکت‌ترین قاب‌ها از همان تکهٔ پاک می‌آیند) و بعد پنجره‌ای از
        # وسطِ موسیقی انتخاب می‌شود. سنجه‌ای که در سطحِ تصمیم حساب نشود،
        # تصمیم را نمی‌سازد — همان اشتباهی که در این ریپو بارها تکرار
        # شده: تحلیل نوشته می‌شود و به دروازه وصل نمی‌شود.
        q = sorted(seg)[:max(1, len(seg) // 10)]
        wf = sum(q) / len(q) - peak
        pauses, run = [], 0
        for v in voiced:
            if not v:
                run += 1
            else:
                if run:
                    pauses.append(run * win)
                run = 0
        if run:
            pauses.append(run * win)
        good = [p for p in pauses if 0.35 <= p <= 2.0]
        dead = [p for p in pauses if p > 2.5]
        lv = [d for d, v in zip(seg, voiced) if v]
        spread = (max(lv) - min(lv)) if lv else 99
        frac = sum(voiced) / float(len(voiced))
        sc = 0.0
        sc += min(len(good), 8) * 3.0                     # مکثِ قابلِ برش
        sc -= len(dead) * 6.0                             # سکوتِ مرده
        sc -= abs(frac - 0.66) * 40.0                     # نه پُرگو، نه خالی
        sc -= max(0.0, spread - 24.0) * 0.8               # ترازِ ناپیوسته
        if wf > -34:
            sc -= 40
        return {"score": round(sc, 1), "speech_pct": round(100 * frac),
                "pauses": len(good), "dead": len(dead),
                "level_spread_db": round(spread, 1),
                "window_floor_db": round(wf, 1)}

    W = int(30.0 / win)
    best, bestAt = None, 0.0
    step = int(5.0 / win)
    for a in range(0, max(1, len(db) - W), step):
        r = window(a, a + W)
        if r and (best is None or r["score"] > best["score"]):
            best, bestAt = r, a * win
    if best is None:
        best, bestAt = window(0, len(db)) or {"score": -99}, 0.0
    # کفِ کلِ فایل هم می‌مانَد — ولی فقط به‌عنوان زمینه، نه تصمیم. اگر کفِ
    # پنجره پاک باشد و کفِ فایل نه، یعنی همین‌جا را درست پیدا کرده‌ایم.
    best["floor_db"] = round(floor, 1)
    best["at_second"] = round(bestAt, 1)
    best["duration"] = round(dur, 1)
    best["rate"] = rate
    wf = best.get("window_floor_db", floor)
    if wf > -34:
        best["reject"] = ("کفِ سکوتِ بهترین پنجره %.0f دسی‌بل است — یعنی زیرِ "
                          "گفتار چیزی هست (موسیقی/فضاسازی) و جای پاکی در این "
                          "فایل پیدا نشد. مدل آن بستر را هم صدای گوینده "
                          "می‌گیرد و در هر قسمت بازتولیدش می‌کند." % wf)
    return best


def refAudition_(paths, out, seconds, tag="reference"):
    """
    از میانِ نمونه‌ها یکی را انتخاب کن، و از داخلش بهترین پنجره را.

    یک نمونه هم که باشد، همین مسیر می‌رود — چون «کجای فایل» به‌اندازهٔ
    «کدام فایل» مهم است و تا امروز همیشه از ثانیهٔ صفر برمی‌داشتیم، که
    هیچ دلیلی نداشت جز اینکه اولین جا بود.
    """
    rows = []
    f = ffmpeg()
    # ══ نامزدها میانی‌اند، پس در پوشهٔ خروجی نمی‌نشینند ══
    # هر نامزد تا ده دقیقه صوتِ خام است. با کلیپ‌های کوتاه بی‌ضرر بود، ولی
    # اجرای #۴۲ چهار ضبطِ نیم‌ساعته گرفت و بایگانی ۹۸ مگابایت شد — برای
    # فایل‌هایی که محصول نیستند و کسی برنمی‌داردشان. محصول دو تاست:
    # `<tag>.wav` و `<tag>-chosen-window.wav`. بقیه موقت‌اند.
    mid = tempfile.mkdtemp(prefix="audition-")
    for i, src in enumerate(paths):
        full = os.path.join(mid, "%s-cand%d.wav" % (tag, i + 1))
        try:
            info = srcInfo_(src)
            print("نمونهٔ %d: %s" % (i + 1, json.dumps(info, ensure_ascii=False)),
                  flush=True)
            # ══ چرا اینجا زنجیرهٔ نرمال‌سازی اجرا **نمی‌شود** (اجرای #۱۱) ══
            # `to_wav` برای آماده‌کردنِ نمونهٔ نهایی است: silenceremove،
            # دو `areverse` و loudnorm. و `areverse` کلِ جریان را در حافظه
            # نگه می‌دارد. من آن را روی **کلِ** فایل‌های خام صدا زدم؛ روی یک
            # فایلِ بلند، دو ساعت و نیم دوید و ۱۴۲ ثانیه صوت نوشت.
            #
            # برای *سنجیدن* هیچ‌کدامِ اینها لازم نیست — فقط ترازِ خام لازم
            # است. پس اینجا تبدیلِ ساده، و نرمال‌سازی فقط روی همان سی
            # ثانیه‌ای که انتخاب می‌شود.
            r = sh([f, "-y", "-nostdin", "-t", str(SURVEY_SEC), "-i", src,
                    "-ac", "1", "-ar", "24000", full],
                   capture_output=True, timeout=SURVEY_TIMEOUT)
            if r.returncode != 0 or not os.path.exists(full):
                raise RuntimeError((r.stderr or b"").decode("utf-8", "replace")[-300:])
            r = refScore_(full)
            r["source"] = info
            if info.get("seconds", 0) > SURVEY_SEC:
                r["surveyed"] = ("فقط %d ثانیهٔ اولِ این فایل بررسی شد (طولش %s)"
                                 % (SURVEY_SEC, info.get("seconds")))
        except Exception as e:
            r = {"error": str(e)[:300], "score": -99}
        r["file"] = os.path.basename(src)
        r["_full"] = full
        rows.append(r)
        print("نمونهٔ %d (%s): %s" % (i + 1, r["file"],
              json.dumps({k: v for k, v in r.items() if not k.startswith("_")},
                         ensure_ascii=False)), flush=True)
    rows.sort(key=lambda x: -x.get("score", -99))
    win = rows[0]
    # ══ نامِ خروجی باید از فراخوان بیاید ══
    # این نام‌ها ثابت بودند. وقتی همین تابع را برای صوتِ **مبدأ** هم صدا
    # زدم، دومین فراخوان `reference.wav` را — که نمونهٔ صدای انتخاب‌شده بود
    # — روی خودش می‌نوشت و آزمایش با صوتِ اشتباه جلو می‌رفت، بی هیچ خطایی.
    dst = os.path.join(out, "%s.wav" % tag)
    cut = os.path.join(out, "%s-chosen-window.wav" % tag)
    r = sh([f, "-y", "-nostdin", "-ss", "%.2f" % win.get("at_second", 0),
            "-i", win["_full"], "-t", str(seconds), "-c", "copy", cut],
           capture_output=True, timeout=120)
    # نرمال‌سازیِ سنگین حالا روی یک فایلِ سی‌ثانیه‌ای می‌نشیند، نه روی
    # کلِ ضبط — همان جایی که از اول برایش نوشته شده بود.
    try:
        to_wav(cut if r.returncode == 0 else win["_full"], dst, seconds=seconds)
    except Exception as e:
        print("نرمال‌سازی نشد؛ با برشِ خام ادامه: %s" % str(e)[:200], flush=True)
        shutil.copyfile(cut if r.returncode == 0 else win["_full"], dst)
    for x in rows:
        x.pop("_full", None)
    OPT["audition" if tag == "reference" else tag + "_audition"] = {
        "chosen": win.get("file"), "at_second": win.get("at_second"), "all": rows}
    return dst


def cutAtPause_(src, dst, max_sec=11.5, min_sec=4.0):
    """
    برشِ نمونه سرِ یک **مکث**، زیرِ سقفِ دوازده‌ثانیه‌ایِ f5.

    ══ چرا (سؤالِ صاحبِ برنامه: «می‌شود ۱۸ ثانیه؟») ══
    نه — و دلیلش سلیقهٔ من نیست، در خودِ کدِ f5 است:

        if len(aseg) > 12000:
            aseg = aseg[:12000]

    هرچه بدهیم، بیش از دوازده ثانیه‌اش را خودش می‌بُرد. ولی نکتهٔ مهم‌تر
    این است که *چطور* می‌بُرد: اول با `split_on_silence` دنبالِ مکث
    می‌گردد و سرِ یک پاسِ طبیعی می‌بُرد، نه وسطِ واژه.

    یعنی برشِ ده‌ثانیه‌ایِ من — که کورکورانه سرِ ثانیهٔ ده قیچی می‌کرد — از
    کارِ خودِ f5 **بدتر** بود. آن را «بهبود» نامیده بودم.

    و خواستهٔ او هم درست است: ده ثانیه برای شنیدنِ رنگِ یک صدا کم است.
    پس تا نزدیکِ سقف می‌رویم و سرِ آخرین مکثِ پیش از آن می‌بُریم — هم
    بلندترین نمونهٔ ممکن، هم برشِ تمیز، و هم f5 دیگر لازم نیست خودش
    ببُرد، پس متنِ مرجعی که دستی داده شود دقیقاً به همین تکه می‌خورَد.
    """
    f = ffmpeg()
    r = sh([f, "-hide_banner", "-nostdin", "-i", src, "-af",
            "silencedetect=noise=-38dB:d=0.22", "-f", "null", "-"],
           capture_output=True, timeout=120)
    log = (r.stderr or b"").decode("utf-8", "replace")
    starts = []
    for m in re.finditer(r"silence_start:\s*([0-9.]+)", log):
        try: starts.append(float(m.group(1)))
        except ValueError: pass
    good = [t for t in starts if min_sec <= t <= max_sec]
    cut = max(good) if good else max_sec
    r2 = sh([f, "-y", "-nostdin", "-i", src, "-t", "%.3f" % cut, "-c", "copy", dst],
            capture_output=True, timeout=120)
    if r2.returncode != 0:
        raise RuntimeError("برش نشد: " + r2.stderr.decode("utf-8", "replace")[-400:])
    print("برشِ نمونه: %.2f ثانیه (%s)" %
          (cut, "سرِ مکث" if good else "سکوتی پیدا نشد؛ سرِ سقف"), flush=True)
    return dst, cut, len(starts)


def probe(path):
    """
    چند ثانیه است و چند هرتز — عدد، نه حدس.

    اجرای #۲: chatterbox صوتِ سالم ساخت و همین تابع با «unknown format: 3»
    ترکید، چون `wave`ی پایتون WAVِ ممیزشناور (قالبِ ۳) را نمی‌خواند. یعنی
    سنجه‌ای که برای *گزارش* نوشته شده بود، خودش را جای *نتیجه* جا زد و یک
    موفقیت را خطا نشان داد. هر دو قالب خوانده می‌شود، و اگر باز هم نشد،
    «نمی‌دانم» برمی‌گردد نه استثنا.
    """
    try:
        import soundfile as sf
        i = sf.info(path)
        return {"seconds": round(i.duration, 2), "rate": i.samplerate,
                "channels": i.channels, "format": i.subtype}
    except Exception:
        pass
    try:
        import wave
        with wave.open(path, "rb") as w:
            return {"seconds": round(w.getnframes() / float(w.getframerate()), 2),
                    "rate": w.getframerate(), "channels": w.getnchannels()}
    except Exception as e:
        return {"unknown": str(e)[:120]}


# ───────────────────────── موتورها ─────────────────────────
# هر کدام یا فایل می‌سازد یا استثنا می‌دهد. هیچ‌کدام «تقریباً موفق» ندارد.

def patch_bigvgan():
    """
    ══ وصلهٔ امضای کهنه در bigvganِ بسته‌بندی‌شده (اجرای #۱) ══

    اجرای اول اینجا شکست خورد:

        TypeError: BigVGAN._from_pretrained() missing 2 required
        keyword-only arguments: 'proxies' and 'resume_download'

    یعنی `huggingface_hub` دیگر این دو را به `_from_pretrained` پاس
    نمی‌دهد، ولی نسخهٔ bigvganی که داخلِ seed-vc بسته‌بندی شده هنوز
    بی‌مقدار‌پیش‌فرض می‌خواهدشان.

    **پین‌کردنِ نسخه چاره نیست**: خودِ `seed-vc 0.4.3` صریح
    `huggingface-hub>=0.28.1` را لازم دارد، پس پایین‌بردنش یعنی جنگیدن با
    وابستگی‌ها و شکستنِ جای دیگر. راهِ درست، وصله‌زدنِ همان یک امضاست:
    دو پارامتر مقدارِ پیش‌فرض می‌گیرند و هرچه هم پاس داده نشود، کار می‌کند.

    وصله در گزارش ثبت می‌شود — وصله‌ای که بی‌صدا بزنیم، فردا کسی نمی‌داند
    چرا کد با بالادست فرق دارد.
    """
    import re
    info = {"patched": False, "files": []}
    try:
        import seed_vc
    except Exception as e:
        info["error"] = "seed_vc وارد نشد: %s" % e
        return info
    base = os.path.dirname(seed_vc.__file__)
    for root, _dirs, files in os.walk(base):
        for fn in files:
            if not fn.endswith(".py"):
                continue
            fp = os.path.join(root, fn)
            try:
                txt = open(fp, encoding="utf-8").read()
            except Exception:
                continue
            if "_from_pretrained" not in txt or "proxies" not in txt:
                continue
            new_txt = txt
            # فقط داخلِ امضا، و فقط همان دو نامی که خطا شکایتشان را کرد.
            new_txt = re.sub(r"(\n\s*)proxies(\s*:\s*[^,\n=]+)?(\s*),",
                             lambda m: "%sproxies%s = None%s," %
                                       (m.group(1), m.group(2) or "", m.group(3)),
                             new_txt)
            new_txt = re.sub(r"(\n\s*)resume_download(\s*:\s*[^,\n=]+)?(\s*),",
                             lambda m: "%sresume_download%s = False%s," %
                                       (m.group(1), m.group(2) or "", m.group(3)),
                             new_txt)
            if new_txt != txt:
                open(fp, "w", encoding="utf-8").write(new_txt)
                info["patched"] = True
                info["files"].append(os.path.relpath(fp, base))
    return info


def run_seedvc(ref, src, text, out):
    """تبدیلِ صدا: صوتِ Gemini + نمونهٔ گوینده → همان واژه‌ها با رنگِ صدای او."""
    if not src:
        raise RuntimeError("این موتور به یک صوتِ مبدأ نیاز دارد (خروجیِ Gemini). "
                           "src_id را در ورودیِ اکشن بدهید.")
    dst = os.path.join(out, "seedvc.wav")
    # اجرای #۲ سرِ پنجاه دقیقه کشته شد. روی CPU، سی قدمِ انتشار برای ۱۷
    # ثانیه صوت گران است — و این خودش خبرِ مهمی برای *تولید* است، نه فقط
    # برای آزمایش. با ده قدم می‌شود فهمید مسئله محاسبه است یا دانلودِ مدل.
    r = sh([sys.executable, "-m", "seed_vc.inference",
            "--source", src, "--target", ref, "--output", out,
            "--diffusion-steps", "10", "--f0-condition", "False"],
           capture_output=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).decode("utf-8", "replace")[-1500:])
    # ══ ورودی را به‌جای خروجی گزارش کردم (اجرای #۶) ══
    # اینجا «هر wavی جز dst» را خروجی می‌گرفتم، و پوشه سه wav داشت:
    # reference و source-gemini که خودم ساخته بودمشان، و خروجیِ واقعی.
    # `os.listdir` ترتیب قول نمی‌دهد، پس source-gemini انتخاب شد و گزارش
    # گفت «خروجی: source-gemini.wav» — یعنی سنجهٔ سرعت روی ورودی حساب شد.
    # قاعده‌اش همان قاعدهٔ همیشگی است: خروجی را با **نامش** بشناس، نه با
    # «هرچه ماند».
    known = {"reference.wav", "source-gemini.wav", os.path.basename(dst)}
    made = sorted(f for f in os.listdir(out)
                  if f.endswith(".wav") and f not in known)
    if os.path.exists(dst):
        return dst
    if made:
        return os.path.join(out, made[0])
    raise RuntimeError("موتور تمام شد ولی هیچ فایلِ تازه‌ای نساخت")


def run_chatterbox(ref, src, text, out):
    import torch
    from chatterbox.tts import ChatterboxTTS
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", dev, flush=True)
    m = ChatterboxTTS.from_pretrained(device=dev)
    wav = m.generate(text, audio_prompt_path=ref)
    import torchaudio
    dst = os.path.join(out, "chatterbox.wav")
    torchaudio.save(dst, wav, m.sr)
    return dst


def f5Resolve_(ckpt, vocab):
    """
    شناسهٔ مخزن → نشانیِ دقیقِ فایل.

    اسکنِ اجرای #۶ نشان داد `Lumos675/F5_TTS_Persian` وجود دارد. ولی برای
    دادنش به f5 باید نامِ **فایلِ** داخلش را دانست، و آن یک رفت‌وبرگشتِ
    دیگر با صاحبِ برنامه بود. شبکهٔ این ماشین باز است، پس خودش می‌پرسد:
    کافی است «Lumos675/F5_TTS_Persian» نوشته شود.

    اگر نشانیِ کامل (`hf://…`) داده شود، دست نمی‌خورد.
    """
    if not ckpt or ckpt.startswith("hf://") or "/" not in ckpt or ckpt.count("/") > 1:
        return ckpt, vocab
    import json as _j, urllib.request
    url = "https://huggingface.co/api/models/" + ckpt
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "voicelab"})
        with urllib.request.urlopen(req, timeout=45) as r:
            info = _j.loads(r.read().decode("utf-8"))
    except Exception as e:
        print("فهرستِ فایل‌های مخزن گرفته نشد: %s" % str(e)[:200], flush=True)
        return ckpt, vocab
    files = [x.get("rfilename", "") for x in (info.get("siblings") or [])]
    print("فایل‌های مخزن:", files[:40], flush=True)
    # وزن‌ها: safetensors بر pt مقدم است؛ در هر دو، تازه‌ترین/بزرگ‌ترین گام.
    weights = [f for f in files if f.endswith((".safetensors", ".pt"))]
    weights.sort(key=lambda f: (f.endswith(".safetensors"), f))
    got = "hf://%s/%s" % (ckpt, weights[-1]) if weights else ckpt
    if not vocab:
        vocs = [f for f in files if f.endswith(".txt") and "vocab" in f.lower()]
        if vocs:
            vocab = "hf://%s/%s" % (ckpt, vocs[0])
    print("چک‌پوینت:", got, "| واژگان:", vocab or "(پیش‌فرض)", flush=True)
    return got, vocab


# نویسه‌های اعراب — یک تعریف، چون سه جا لازم می‌شود و دو تعریف یعنی یکی
# روزی کهنه می‌شود.
TASHKIL_ = "".join(chr(c) for c in list(range(0x064B, 0x0653)) + [0x0670, 0x0640])


def noTash_(t):
    return "".join(ch for ch in (t or "") if ch not in TASHKIL_)


def vocabAudit_(vocab, texts):
    """
    آیا واژگانِ این چک‌پوینت، نویسه‌های متنِ ما را **دارد**؟

    ══ چرا این سؤال، سؤالِ درجه‌یک است ══

    از خودِ کدِ f5 (`model/utils.py`):

        vocab_char_map.get(c, 0)
        assert vocab_char_map[" "] == 0, "0 is used for unknown char"

    یعنی هر نویسهٔ ناشناخته **فاصله** می‌شود — نه حذف، نه نویسهٔ خاص:
    فاصله. اگر اعراب در واژگان نباشد، «دَر» به «د ر» تبدیل می‌شود و مدل
    به‌جای یک واژه، دو حرفِ جدا می‌بیند. آن‌وقت رنگِ صدا (که از صوتِ مرجع
    می‌آید) درست می‌مانَد و **واژه‌ها خراب** می‌شوند — که دقیقاً همان چیزی
    است که شنیده شد.

    این را نمی‌شود حدس زد و نمی‌شود از روی کیفیتِ خروجی فهمید. یک فایلِ
    متنیِ چندکیلوبایتی جواب را قطعی می‌دهد.
    """
    out = {"vocab": vocab or "(پیش‌فرض — انگلیسی/چینی)"}
    if not vocab:
        # واژگانِ پیش‌فرضِ f5 روی Emilia ZH-EN ساخته شده و اصلاً حرفِ فارسی
        # ندارد؛ گفتنش بهتر از دانلودِ بی‌فایده است.
        out["ok"] = False
        out["note"] = "واژگانِ سفارشی داده نشده — پیش‌فرضِ f5 حرفِ فارسی ندارد."
        return out
    src = vocab
    if vocab.startswith("hf://"):
        pr = vocab[5:].split("/")
        if len(pr) >= 3:
            src = "https://huggingface.co/%s/%s/resolve/main/%s" % (
                pr[0], pr[1], "/".join(pr[2:]))
    try:
        if src.startswith("http"):
            import urllib.request
            req = urllib.request.Request(src, headers={"User-Agent": "voicelab"})
            with urllib.request.urlopen(req, timeout=90) as r:
                raw = r.read().decode("utf-8", "replace")
        else:
            raw = io.open(src, encoding="utf-8").read()
    except Exception as e:
        out["ok"] = False
        out["error"] = str(e)[:200]
        out["source"] = src
        return out
    # ══ پایانِ سطر: تلهٔ کوچکی که یک حکمِ بزرگ ساخت (اجرای #۱۴) ══
    # این تابع فایل را از شبکه می‌گیرد و خام رمزگشایی می‌کند، پس اگر فایل
    # CRLF باشد هر مدخل «x\r» می‌شود و هیچ نویسه‌ای پیدا نمی‌شود — گزارش
    # می‌گوید «۱۰۰٪ ناشناخته» و آن حکم دربارهٔ خودِ مدل خوانده می‌شود، نه
    # دربارهٔ خوانندهٔ من. خودِ f5 فایل را در حالتِ متنی باز می‌کند و پایتون
    # همان‌جا CRLF را به LF تبدیل می‌کند، پس این ایراد فقط مالِ اینجاست.
    lines = raw.splitlines()
    chars = set(lines)
    # و اگر مدخل‌ها تک‌نویسه نباشند، اصلاً «نویسه‌به‌نویسه» سنجیدن بی‌معناست.
    lens = {}
    for ln in lines[:4000]:
        lens[len(ln)] = lens.get(len(ln), 0) + 1
    out["entry_lengths"] = dict(sorted(lens.items())[:6])
    out["sample"] = [repr(x) for x in lines[:40]]
    out["ok"] = True
    out["size"] = len(lines)
    out["source"] = src
    miss = {}
    for name, t in (texts or {}).items():
        bad = sorted(set(c for c in (t or "") if c not in chars))
        if bad:
            miss[name] = {
                "chars": ["U+%04X %s" % (ord(c), c) for c in bad][:30],
                "count": sum(1 for c in (t or "") if c not in chars),
                "pct": round(100.0 * sum(1 for c in (t or "") if c not in chars)
                             / max(1, len(t or "")), 1),
            }
    out["missing"] = miss
    out["tashkil_in_vocab"] = {"U+%04X" % ord(c): (c in chars) for c in TASHKIL_}
    out["tashkil_supported"] = all(out["tashkil_in_vocab"].values())
    out["zwnj_in_vocab"] = ("\u200c" in chars)
    return out


def f5SpeedFit_(refText, genText):
    """
    اصلاحِ **بودجهٔ زمانِ** تولید — عددی که مستقیم از فرمولِ خودِ f5 درمی‌آید.

    `infer_batch_process` طولِ خروجی را این‌طور می‌سازد:

        ref_text_len = len(ref_text.encode("utf-8"))
        gen_text_len = len(gen_text.encode("utf-8"))
        duration = ref_audio_len + int(ref_audio_len / ref_text_len
                                       * gen_text_len / local_speed)

    یعنی «چند ثانیه حرف بزن» را از نسبتِ **بایت‌ها** حساب می‌کند. متنِ ما
    اعراب دارد و متنِ مرجع (رونویسِ ویسپر) ندارد — و هر اعراب دو بایت است.
    برای متنِ آزمونِ ما این نسبت ۱٫۲۴ است: مدل ۲۴٪ زمانِ بیشتر از آنچه
    واژه‌ها لازم دارند می‌گیرد و ناچار است پُرش کند — کِش‌دادن، مکث‌های
    نابه‌جا، و گاهی هجای اضافه.

    و اندازه‌گیریِ خروجیِ اجرای #۹ همین را نشان داد: نمونهٔ رضوی ۶۴٪ گفتار
    بود و خروجیِ ما ۷۷٪ — یعنی پیوسته‌تر و کِش‌دارتر، نه شبیه‌تر.

    پس `--speed` را دقیقاً به همان نسبت بالا می‌بریم تا بودجه با واژه‌ها
    بخوانَد. اگر متنِ مرجع هم اعراب داشته باشد، این عدد خودبه‌خود ۱ می‌شود.
    """
    def b(t):
        return len((t or "").encode("utf-8"))
    a = b(genText) / float(max(1, b(noTash_(genText))))
    c = b(noTash_(refText)) / float(max(1, b(refText)))
    return round(a * c, 3)


# نام‌هایی که ورودیِ اجرا هستند نه یافتهٔ آن — این‌ها جای دیگری در گزارش
# می‌آیند و تکرارشان فقط شلوغی است.
REP_SKIP_ = {"f5_ckpt", "f5_vocab", "f5_ref_text", "f5_nfe", "alphabet",
             "ref_text", "omni_model"}


def saveRep_():
    """
    گزارش را **همین حالا** روی دیسک بنویس، نه در پایان.

    اجرای #۹ سرِ پنجاه دقیقه لغو شد و چون گزارش فقط در پایان نوشته می‌شد،
    دو چیزی که کلِ آن اجرا برای دیدنشان بود — جای برشِ نمونه و آنچه
    رونویس شنید — هرگز دیده نشدند. تشخیصی که فقط در صورتِ موفقیت به دست
    بیاید، دقیقاً وقتی نیست که لازمش داری.
    """
    rep, out = OPT.get("_rep"), OPT.get("_out")
    if not isinstance(rep, dict) or not out:
        return
    # ══ فهرستِ دستیِ «چه چیزی گزارش شود» کهنه می‌شود ══
    # این حلقه سیزده نامِ دست‌نویس داشت. هر یافتهٔ تازه‌ای که موتورِ بعدی
    # پیدا می‌کرد، تا وقتی نامش به آن فهرست اضافه نمی‌شد، **بی‌صدا** از
    # گزارش می‌افتاد — نه خطایی، نه جای خالی‌ای. همان شکلی که در خودِ موتور
    # `removeTriggers` داشت و سه زمان‌بندی را جا گذاشت.
    # پس وارونه‌اش می‌کنیم: هرچه در OPT هست گزارش می‌شود، مگر آنچه صریحاً
    # درونی است. یافتهٔ تازه به‌طورِ پیش‌فرض دیده می‌شود، نه به‌شرطِ یادآوری.
    for k, v in OPT.items():
        if k.startswith("_") or k in REP_SKIP_ or v is None:
            continue
        rep["ref_text_heard" if k == "heard" else k] = v
    try:
        with io.open(os.path.join(out, "report-%s.json" % rep.get("engine", "x")),
                     "w", encoding="utf-8") as f:
            f.write(json.dumps(rep, ensure_ascii=False, indent=1))
    except Exception as e:
        print("گزارش ذخیره نشد: %s" % str(e)[:200], flush=True)




# ══ نشانه‌گذاریِ تایپوگرافیک که در واژگانِ مدل نیست ══
# واژگانِ KiaBush ۲۵۴۷ نماد دارد و نشانه‌های ASCII همه در آن‌اند، ولی
# «—» و «…» نه. و بستهٔ رسمی پیش از تولید می‌سنجد و **خطا می‌دهد** — که
# رفتارِ درستی است، ولی یعنی متنِ واقعیِ یک قسمت (که پر از خط‌تیره و سه‌نقطه
# است) اصلاً ساخته نمی‌شود.
# متنِ آزمونِ ما فقط «,» و «.» داشت، پس این هرگز دیده نشد. جای درستِ
# اصلاح، پیش از رسیدن به مدل است — و نگاشت آوایی انتخاب شده، نه املایی:
# خط‌تیره مکثی به‌اندازهٔ ویرگول است و سه‌نقطه مکثی به‌اندازهٔ نقطه.
IPA_PUNCT_ = {"—": ",", "–": ",", "…": ".", "«": '"', "»": '"',
              "”": '"', "“": '"', "’": "'", "‘": "'", "٫": ",", "٬": ","}


def ipaSafe_(t):
    """نشانه‌های بیرونِ واژگان را به نزدیک‌ترین معادلِ آوایی‌شان ببر."""
    for a, b in IPA_PUNCT_.items():
        t = t.replace(a, b)
    return t

def f5ipaRun_(ref, rt, text, out):
    """
    مسیرِ IPA — با بستهٔ **خودِ سازندهٔ مدل**، نه با CLIِ عمومیِ f5.

    ══ چرا این تابع نوشته شد: یک اندازه‌گیری، نه یک حدس ══

    اجرای #۱۷ اولین «خیلی بهتر شده بود» را داد و همان‌جا «باز نواقصی هم
    داشت» را هم. علتش را در بستهٔ رسمیِ همان مدل پیدا کردم
    (`persian-ipa-to-speech-f5`): آنجا `convert_char_to_pinyin` را عمداً
    با تابعِ همانی جایگزین می‌کنند، با یادداشتِ «Preserve IPA».

    ما از CLI استفاده می‌کردیم، که آن تابع را همیشه اجرا می‌کند. نتیجه‌اش
    را روی متنِ آزمونِ خودمان اندازه گرفتم:

        فرستادیم:  … bæɾɾæsiːje mæʔɾefætʃenɒːsiːje ʔedɾɒːk …
        مدل گرفت:  … bæɾɾæ siː je mæʔɾ efætʃ enɒː siː je ʔ edɾɒːk …

        ۱۳ فاصله → ۲۷ فاصله. چهارده مرزِ واژهٔ ساختگی در یک جملهٔ ۱۱۶
        نویسه‌ای. یک واژه سه واژه خوانده می‌شود.

    و مهم است که این فقط برای الفبای لاتین/IPA رخ می‌دهد: همان تابع روی
    متنِ **فارسی** هیچ کاری نمی‌کند (۱۳ فاصله → ۱۳). پس همهٔ اجراهای
    فارسی‌مان سالم بودند و فقط مسیرِ IPA خراب بود — که دقیقاً همان مسیری
    است که بهترین نتیجه را داده بود.

    بستهٔ رسمی دو چیزِ دیگر هم می‌کند که CLI نمی‌کند:
      • هر نویسهٔ IPA را **پیش از تولید** با واژگانِ مدل می‌سنجد و اگر
        نبود همان‌جا خطا می‌دهد. بیست‌وپنج دقیقه محاسبه برای فهمیدنِ
        اینکه یک نویسه ناشناخته بوده، گران‌ترین راهِ ممکن است.
      • به متنِ مرجع فقط یک فاصله می‌افزاید، نه «. » — که کارِ f5 است.

    ══ و متغیرِ دوم: برگردانِ من در برابرِ G2Pِ خودشان ══
    `fa2latin` را من نوشتم و در برابرِ دو نمونهٔ منتشرشدهٔ خودشان ۶۱٪ و
    ۸۸٪ هم‌پوشانیِ واژه داشت. یعنی تا چهل درصدِ واژه‌ها ممکن است فرق کند.
    خودشان `KiaBush/persian-text-to-ipa-byt5` را دارند — مدلی که برای
    همین کار آموزش دیده. پس هر دو اجرا می‌شوند و کنارِ هم می‌آیند: این
    تنها راهِ فهمیدنِ اینکه نقصِ باقی‌مانده از برگردان است یا از مدل.
    """
    from persian_ipa_to_speech_f5 import PersianIPAToSpeechF5

    ck = str(OPT.get("f5_ckpt") or "").strip()
    repo = ck if ck and "/" in ck and not ck.endswith((".safetensors", ".pt")) \
        else "KiaBush/Persian-IPA-to-Speech-F5"
    nfe = str(OPT.get("f5_nfe") or "").strip()
    nfe = int(nfe) if nfe.isdigit() else 32

    print("مسیرِ رسمیِ IPA — مخزن: %s" % repo, flush=True)
    tts = PersianIPAToSpeechF5(model_id=repo, device="cpu")

    # ── دو نسخه از همان متن، از دو مسیرِ برگردان ──
    faText = OPT.get("text_fa") or ""
    faRef = OPT.get("ref_text_fa") or ""
    text, rt = ipaSafe_(text), ipaSafe_(rt)
    runs = [("raw", text, rt, "برگردانِ fa2latin — همان که اجرای #۱۷ کرد")]
    if faText and faRef:
        try:
            from persian_ipa_to_speech_f5 import PersianTextToIPA
            # ══ اجرای #۲۰: g2p «اصلا خوب نبود» — و علتش دیدنی است ══
            # هر «ــَـ» به `iː` بدل شده بود، به‌طورِ نظام‌مند:
            #   کَلَنجار kælændʒɒːɾ → kiːliːndʒɒːɾ · کَم kæm → kiːm
            #   بَررَسی bæɾɾæsiː  → bæɾɾiːsiː    · باشَد bɒːʃæd → bɒːʃiːd
            # و «بنیادی» دو بار تکرار شد و همهٔ نشانه‌گذاری افتاد.
            # این الگو یعنی مدل نویسهٔ اعراب را ندیده و چیزی نزدیک به «ی»
            # حدس زده — که با ByT5 (بایت‌به‌بایت) و پیکرهٔ فارسیِ **بی‌اعراب**
            # کاملاً جور درمی‌آید. پس ورودیِ درستش متنِ بی‌اعراب است، نه
            # اینکه مدل بد باشد. اجرای دوباره با همان ورودیِ غلط، همان
            # جواب را می‌دهد — و بیست دقیقه خرج می‌کند.
            g = PersianTextToIPA(device="cpu")
            gText, gRef = (ipaSafe_(g.convert(noTash_(faText))),
                           ipaSafe_(g.convert(noTash_(faRef))))
            OPT["g2p_compare"] = {
                "mine_gen": text, "official_gen": gText,
                "mine_ref": rt, "official_ref": gRef,
                "same": gText == text,
            }
            saveRep_()
            print("G2Pِ رسمی:\n  %s" % gText[:300], flush=True)
            if gText != text:
                runs.append(("g2p", gText, gRef,
                             "G2Pِ خودِ مدل، این‌بار با ورودیِ بی‌اعراب — "
                             "همان چیزی که رویش آموزش دیده"))
            else:
                OPT["one_run_why"] = ("اجرای دوم نیامد: برگردانِ من و G2Pِ رسمی "
                                      "نویسه‌به‌نویسه یکی شد.")
        except Exception as eg:
            OPT["g2p_error"] = str(eg)[:500]
            print("G2Pِ رسمی نشد: %s" % str(eg)[:300], flush=True)
            saveRep_()
    else:
        OPT["g2p_error"] = "متنِ فارسیِ اصلی در دسترس نبود (متن یا مرجع)."

    made, variants = None, []
    for name, gen, rref, why in runs:
        dst = os.path.join(out, "f5ipa-%s.wav" % name)
        t1 = time.time()
        try:
            tts.synthesize(gen, reference_audio=ref, reference_ipa=rref,
                           output=dst, nfe_step=nfe, seed=42, verbose=True)
            took = round(time.time() - t1)
            info = probe(dst)
            sec = float(info.get("seconds") or 0)
            variants.append({
                "name": name, "why": why, "file": os.path.basename(dst),
                "ipa_sent": gen[:400], "ref_ipa": rref[:200],
                "info": info, "seconds_taken": took,
                "realtime_factor": (round(took / sec, 1) if sec else None),
            })
            made = made or dst
            print("%s: %ss صوت در %ss" % (name, info.get("seconds"), took), flush=True)
        except Exception as e:
            # ══ خطای واژگان اینجا **مفید** است، نه شکست ══
            # بسته پیش از تولید می‌سنجد، پس این پیام نامِ دقیقِ نویسه‌ای
            # را می‌دهد که برگردانِ من ساخته و مدل نمی‌شناسد — چیزی که با
            # CLI فقط به‌شکلِ صدای بد شنیده می‌شد.
            variants.append({"name": name, "why": why, "error": str(e)[:600],
                             "ipa_sent": gen[:400]})
            print("%s شکست خورد: %s" % (name, str(e)[:400]), flush=True)
        OPT["variants"] = variants
        saveRep_()

    if not made:
        raise RuntimeError("هیچ‌کدام از اجراهای IPA خروجی نداد")
    return made

def run_f5(ref, src, text, out):
    """
    ══ چرا این موتور تنها امیدِ واقعیِ باقی‌مانده است ══

    پنج اجرا ثابت کرد هیچ چک‌پوینتِ پایه‌ای فارسی نمی‌داند. ولی از خودِ
    کدِ f5 (`infer_cli.py`) این را خواندم:

        elif ckpt_file.startswith("hf://"):
            ckpt_file = str(cached_path(ckpt_file))

    یعنی می‌شود چک‌پوینتِ **دیگری** به آن داد، مستقیم از Hugging Face، با
    دو آرگومان و بی هیچ تغییرِ دیگری. مدل‌های آماده‌اش (F5TTS_Base،
    F5TTS_v1_Base، E2TTS_Base) همه انگلیسی/چینی‌اند — ولی اگر کسی f5 را
    روی فارسی تنظیمِ دقیق کرده باشد، آن‌وقت **هم فارسی داریم هم کلونِ
    صدا**، که هیچ‌کدام از موتورهای دیگر با هم ندارند.

    آیا چنین چیزی هست؟ کارِ `scan` جوابش را می‌دهد. این تابع فقط در را
    باز نگه می‌دارد تا آن جواب، یک کلیک با شنیدن فاصله داشته باشد.
    """
    ck, vo = f5Resolve_(str(OPT.get("f5_ckpt") or "").strip(),
                        str(OPT.get("f5_vocab") or "").strip())
    OPT["resolved"] = {"ckpt": ck, "vocab": vo}
    nfe = str(OPT.get("f5_nfe") or "").strip()

    """
    ══ سه علتِ ساختاری، همه از خودِ کدِ f5 — نه حدس (پس از اجرای #۹) ══

    اجرای #۹ لغو شد ولی خروجی‌اش شنیده شد و حکم روشن بود: «صدا مثل همونه
    ولی کلمات به شدت بد میخونه و اعراب و لحن اصلاً خوب نیست.» یعنی نیمهٔ
    سختِ کار — گرفتنِ رنگِ صدا — جواب داده و چیزی در **متن** خراب است.
    منبعِ f5 را خواندم؛ سه چیز پیدا شد که هر سه همین را می‌سازند:

    ۱) **نویسهٔ ناشناخته، فاصله می‌شود.** `vocab_char_map.get(c, 0)` و
       `assert vocab_char_map[" "] == 0`. اگر اعراب در واژگانِ این
       چک‌پوینت نباشد، «دَر» می‌شود «د ر»: مدل واژه نمی‌بیند، حرفِ جدا
       می‌بیند. `vocabAudit_` این را با یک فایلِ متنی قطعی می‌کند.

    ۲) **بودجهٔ زمان از نسبتِ بایت‌ها می‌آید.** متنِ ما اعراب دارد و
       رونویسِ مرجع ندارد، پس بودجه ۲۴٪ بیش از نیازِ واژه‌هاست و مدل
       ناچار است پُرش کند. `f5SpeedFit_` همان نسبت را از `--speed` پس
       می‌گیرد. اندازه‌گیریِ خروجیِ #۹ همین را تأیید کرد: ۷۷٪ گفتار در
       برابرِ ۶۴٪ در نمونهٔ رضوی.

    ۳) **خودِ f5 نمونه را دوباره می‌بُرد** — `split_on_silence` با
       `keep_silence=1000` و شرطِ «اگر با تکهٔ بعدی از ۱۲ ثانیه گذشت،
       بایست». برشِ تمیزِ ۱۰٫۹ ثانیه‌ایِ ما می‌تواند همان‌جا به ~۶ ثانیه
       آب برود، بی هیچ خطایی. آن‌وقت متنِ مرجع دو برابرِ صوتِ مرجع است و
       بودجه نصف می‌شود. پس این مرحله را **خودمان** اجرا می‌کنیم، فایلش
       را نگه می‌داریم (`reference-used.wav`) و رونویس را از **همان**
       می‌گیریم — تا متن و صوتِ مرجع هرگز از هم نیفتند.
    """
    # ── ۱. برشِ سرِ مکث (کارِ ما) ──
    try:
        ref, cutSec, nSil = cutAtPause_(ref, os.path.join(out, "reference-cut.wav"))
        OPT["ref_cut"] = {"seconds": round(cutSec, 2), "silences_found": nSil}
    except Exception as eC:
        print("برشِ سرِ مکث نشد؛ با همان نمونه ادامه: %s" % str(eC)[:200], flush=True)
    saveRep_()

    # ── ۲. همان آماده‌سازی‌ای که f5 خودش می‌کند، ولی جلوی چشم ──
    rt = str(OPT.get("f5_ref_text") or "").strip()
    try:
        from f5_tts.infer.utils_infer import preprocess_ref_audio_text, transcribe
        # متنِ ساختگی می‌دهیم تا این فراخوان فقط **صوت** را ببُرد و
        # رونویس را خودمان با زبانِ صریح بگیریم.
        used, _ = preprocess_ref_audio_text(ref, "…")
        keep = os.path.join(out, "reference-used.wav")
        try:
            shutil.copyfile(used, keep)
            used = keep
        except Exception:
            pass
        info = probe(used)
        OPT["ref_used"] = {"file": os.path.basename(used), "info": info}
        cut = float((OPT.get("ref_cut") or {}).get("seconds") or 0)
        sec = float((info or {}).get("seconds") or 0)
        if cut and sec and sec < cut - 1.0:
            OPT["ref_used"]["warning"] = (
                "f5 نمونه را از %.2f به %.2f ثانیه کوتاه کرد — متنِ مرجع "
                "باید فقط همین تکه باشد." % (cut, sec))
            print("::warning::" + OPT["ref_used"]["warning"], flush=True)
        ref = used
        saveRep_()
        # زبان را صریح می‌گوییم: ویسپر بی‌راهنما فارسی را گاهی عربی یا
        # اردو تشخیص می‌دهد و آن‌وقت متنِ مرجع اصلاً زبانِ دیگری است.
        heard = str(transcribe(ref, language="fa") or "").strip()
        OPT["heard"] = heard
        print("\n── آنچه رونویس از نمونهٔ به‌کاررفته شنید ──\n%s\n"
              % heard[:400], flush=True)
    except Exception as e:
        OPT["heard"] = "رونویس/آماده‌سازی انجام نشد: %s" % str(e)[:300]
        print(OPT["heard"], flush=True)
    if rt:
        OPT["ref_text_source"] = "دستیِ شما"
        print("── و آنچه شما دادید ──\n%s\n" % rt[:400], flush=True)
    else:
        # ══ چرا این هشدار، و چرا بلند (اجرای #۱۲) ══
        # رونویسِ خودکار از «پیرمرد و دریا» این درآمد: «علق می ریخد … مغز
        # استخانش … دارت کم کم بالا می آید … ریسمان رفت رفت شد می شد».
        # شش واژه از سی غلط. f5 متنِ مرجع و متنِ تولید را در **یک** رشته به
        # مدل می‌دهد؛ متنِ مرجعِ غلط یعنی مدل نگاشتِ غلطی از متن به صدا
        # می‌گیرد و همان را در خروجی بازتولید می‌کند — رنگِ صدا درست، واژه‌ها
        # خراب. این تنها ورودی‌ای است که هیچ کدی نمی‌تواند جایش را بگیرد.
        print("::warning::متنِ مرجع دستی داده نشده و از رونویسِ خودکار "
              "استفاده شد. اگر خروجی واژه‌ها را بد می‌خوانَد، مظنونِ اولْ "
              "همین است: به reference-used.wav گوش بدهید و متنش را در "
              "f5_ref_text بنویسید.", flush=True)
        OPT["ref_text_warning"] = (
            "متنِ مرجع رونویسِ خودکار است، نه نوشتهٔ شما — و رونویسِ فارسی "
            "معمولاً چند واژه را غلط می‌شنود. f5 متنِ مرجع و متنِ تولید را "
            "یکجا به مدل می‌دهد، پس متنِ مرجعِ غلط تلفظِ خروجی را خراب "
            "می‌کند. مظنونِ شمارهٔ یک.")
        h = OPT.get("heard") or ""
        rt = h if h and not h.startswith("رونویس") else ""
        OPT["ref_text_source"] = "رونویسِ خودکار (صریحاً پاس داده شد)"
    # ══ متنِ مرجع باید هم‌الفبای متنِ تولید باشد ══
    # f5 هر دو را در **یک** رشته به مدل می‌دهد (`[ref_text + gen_text]`).
    # یک نیمه فارسی و نیمهٔ دیگر لاتین یعنی مدل وسطِ کار الفبا عوض
    # می‌کند — که هیچ‌جا در آموزشش ندیده.
    alp = str(OPT.get("alphabet") or "fa")
    if alp != "fa" and rt:
        OPT["ref_text_fa"] = rt
        # ══ سنجه‌ای که فقط روی نیمی از کار اجرا می‌شد ══
        # `coverage` از اول نوشته شده بود و در `main` روی **متنِ تولید**
        # اجرا می‌شد. روی **متنِ مرجع** هیچ‌وقت اجرا نشد — با اینکه f5 هر
        # دو را در یک رشته به مدل می‌دهد و مرجعِ خراب تلفظِ خروجی را خراب
        # می‌کند. یعنی همان شکلِ همیشگی: تحلیل نوشته شد و به تصمیم وصل نشد.
        #
        # و این سنجه برای اینجا از هرجای دیگر مهم‌تر است: برگردانِ من
        # مصوت‌ها را از **اعراب** می‌خوانَد. متنِ مرجعِ بی‌اعراب به خوشهٔ
        # همخوان بدل می‌شود («ریسمان» → rismân درست، ولی «رفته» بی‌اعراب
        # → rfth) و مدل چیزی می‌بیند که در هیچ زبانی نیست.
        cov = fa2latin.coverage(rt)
        OPT["ref_coverage"] = cov
        # کلید `vowelless_words` است. اولین‌بار `dry` نوشتم — نامِ متغیرِ
        # درونیِ خودِ تابع، نه کلیدِ خروجی‌اش — و هشدار هرگز بلند نمی‌شد.
        # دقیقاً همان «کدِ نوشته‌شده که هیچ‌وقت اجرا نمی‌شود»؛ این‌بار پیش
        # از ارسال گرفته شد چون روی متنِ واقعیِ صاحبِ برنامه امتحانش کردم.
        if cov.get("vowelless_words"):
            OPT["ref_text_warning"] = (
                "متنِ مرجع اعراب ندارد (یا کم دارد): %s. برگردانِ من مصوت‌ها "
                "را از اعراب می‌خوانَد، پس این واژه‌ها به خوشهٔ همخوان بدل "
                "می‌شوند. اجرای g2p — که مدلِ آموزش‌دیدهٔ خودشان است — این "
                "مشکل را ندارد؛ پس اگر آن یکی بهتر بود، علتش همین است."
                % ", ".join(cov["vowelless_words"][:6]))
            print("::warning::" + OPT["ref_text_warning"], flush=True)
        rt = fa2latin.convert(rt, alp)
        OPT["ref_text_source"] += " · برگردانده به %s" % alp
    OPT["ref_text_final"] = rt
    saveRep_()

    # ── ۳. واژگان: آیا اعرابِ ما اصلاً نویسهٔ شناخته‌شده است؟ ──
    noTash = noTash_(text)
    aud = vocabAudit_(vo, {"با اعراب": text, "بی اعراب": noTash, "متنِ مرجع": rt})
    OPT["vocab_audit"] = aud
    print("واژگان:", json.dumps(aud, ensure_ascii=False)[:900], flush=True)
    saveRep_()

    # اگر واژگان خوانده شد و اعراب در آن نبود، فرستادنِ اعراب یعنی
    # فاصله‌پاشیدن وسطِ واژه‌ها. اگر خوانده نشد، رفتارِ پیشین می‌مانَد —
    # «نمی‌دانم» نباید تصمیمِ تازه بسازد.
    tashOk = (not aud.get("ok")) or aud.get("tashkil_supported")
    sendText = text if tashOk else noTash
    fit = f5SpeedFit_(rt, sendText) if rt else 1.0
    OPT["speed_fit"] = {"speed": fit, "text": "با اعراب" if sendText is text else "بی اعراب",
                        "why": "اعراب در واژگان هست" if tashOk else
                               "اعراب در واژگان نیست؛ بی‌اعراب فرستاده شد"}
    saveRep_()

    # ── ۳٫۵. الفبای لاتین؟ پس CLI نه ──
    # ══ چرا این انشعاب اینجاست و نه یک موتورِ جدا ══
    # همان مدل، همان وزن‌ها، همان نمونهٔ صدا — فقط راهِ رسیدنِ متن به مدل
    # فرق می‌کند. اگر موتورِ جدایی می‌ساختم، مقایسه با اجراهای پیشین
    # می‌شکست و هر دو گزارش شکلِ متفاوتی می‌گرفت.
    if alp == "ipa":
        return f5ipaRun_(ref, rt, text, out)

    # ── ۴. دو اجرا: تشخیص، و شاهد ──
    # شاهد همان چیزی است که اجرای #۹ کرد (متنِ اعراب‌دار، سرعتِ ۱). بدونِ
    # شاهد، «بهتر شد» فقط یک احساس است.
    # ══ `is` هویت را می‌سنجد، نه مقدار را (اجرای #۱۷) ══
    # در حالتِ ipa، متن پیش از رسیدن به اینجا به IPA برگردانده شده و
    # `noTash_` روی IPA چیزی عوض نمی‌کند — پس دو رشته **برابر**اند ولی دو
    # شیء جدا. شرطِ `is not` این را «فرق دارند» خواند و شاهدی ساخت که
    # واژه‌به‌واژه و سرعت‌به‌سرعت همان اجرای اول بود: ۲۵ دقیقه محاسبه برای
    # چیزی که هیچ متغیری را نمی‌سنجید.
    # و بدتر از هدررفتِ وقت: صاحبِ برنامه دو فایل شنید و یکی را بهتر یافت،
    # در حالی که تفاوتشان فقط تصادفِ نمونه‌برداری بود — یعنی آزمایش داشت
    # به یک نتیجهٔ کاذب هدایت می‌شد.
    runs = [("fit", sendText, fit, "متن و بودجهٔ زمانِ اصلاح‌شده")]
    if sendText != text or abs(fit - 1.0) > 0.02:
        runs.append(("asis", text, 1.0, "همان که اجرای پیشین کرد — شاهد"))
    else:
        OPT["one_run_why"] = ("شاهد اجرا نشد: با این تنظیم، متن و سرعتِ شاهد "
                              "دقیقاً همان اجرای اول می‌شد.")
    made, notes = None, []
    for name, txt, spd, why in runs:
        fn = "f5-%s.wav" % name
        cmd = ["f5-tts_infer-cli", "--ref_audio", ref, "--ref_text", rt,
               "--gen_text", txt, "--output_dir", out, "--output_file", fn,
               "--speed", "%.3f" % spd]
        if nfe:
            cmd += ["--nfe_step", nfe]
        if ck:
            cmd += ["--ckpt_file", ck]
        if vo:
            cmd += ["--vocab_file", vo]
        # بودجه‌ای که فرمولِ f5 می‌دهد — تا بشود با طولِ واقعیِ خروجی سنجید.
        refSec = float(((OPT.get("ref_used") or {}).get("info") or {}).get("seconds") or 0)
        want = 0.0
        if refSec and rt:
            want = refSec * len(txt.encode("utf-8")) / float(
                max(1, len(rt.encode("utf-8")))) / spd
        print("\n=== %s — %s (سرعت %.3f) ===\n%s\n"
              % (name, why, spd, txt[:160]), flush=True)
        r = sh(cmd, capture_output=True)
        path = os.path.join(out, fn)
        row = {"name": name, "why": why, "speed": spd, "chars": len(txt),
               "expected_seconds": round(want, 2)}
        if r.returncode == 0 and os.path.exists(path):
            row["ok"] = True
            row["info"] = probe(path)
            made = made or path
        else:
            row["ok"] = False
            row["error"] = (r.stderr or r.stdout).decode("utf-8", "replace")[-500:]
        notes.append(row)
        OPT["variants"] = notes
        saveRep_()
    if not made:
        raise RuntimeError("هیچ اجرایی خروجی نداد: " +
                           json.dumps(notes, ensure_ascii=False)[:1200])
    return made


def run_xtts(ref, src, text, out):
    """
    فارسی در فهرستِ زبان‌های XTTS-v2 نیست. عمداً هم `fa` و هم `ar` امتحان
    می‌شود: اگر `fa` رد شد، عربی نزدیک‌ترین الفبای موجود است و دستِ‌کم
    می‌فهمیم خروجی چقدر بد است — «نمی‌شود» را باید شنید، نه فرض کرد.
    """
    from TTS.api import TTS
    os.environ["COQUI_TOS_AGREED"] = "1"
    t = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    made = None
    for lang in ("fa", "ar"):
        dst = os.path.join(out, "xtts_%s.wav" % lang)
        try:
            t.tts_to_file(text=text, speaker_wav=ref, language=lang, file_path=dst)
            made = made or dst
            print("xtts: زبانِ %s پذیرفته شد" % lang, flush=True)
        except Exception as e:
            print("xtts: زبانِ %s رد شد — %s" % (lang, str(e)[:300]), flush=True)
    if not made:
        raise RuntimeError("نه fa پذیرفته شد نه ar")
    return made


def run_chatterboxvc(ref, src, text, out):
    """
    تبدیلِ صدا با همان بسته‌ای که در اجرای #۲ نصبش ۱۱۰ ثانیه طول کشید و
    صدای مرجع را درست گرفت. متن اینجا اصلاً به کار نمی‌رود — و همین نکته‌اش
    است: واژه‌ها از `src` می‌آیند، که خروجیِ فارسیِ خودِ موتور است.
    """
    if not src:
        raise RuntimeError("این موتور به صوتِ مبدأ نیاز دارد (خروجیِ Gemini).")
    import torch, torchaudio
    from chatterbox.vc import ChatterboxVC
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    print("device:", dev, flush=True)
    m = ChatterboxVC.from_pretrained(device=dev)
    wav = m.generate(src, target_voice_path=ref)
    dst = os.path.join(out, "chatterboxvc.wav")
    torchaudio.save(dst, wav, m.sr)
    return dst



# ZWNJ (نیم‌فاصله) — نویسه‌ای که دیده نمی‌شود و خوانده هم نمی‌شود.
ZWNJ_ = "‌"


def durAudit_(refText, genText, refFrames):
    """
    بودجهٔ زمانِ OmniVoice را بسنج — و جایی که برای فارسی غلط می‌زند.

    ══ چرا این تابع پیش از هر اجرایی نوشته شد ══
    در f5 بودجهٔ زمان از `len(utf8)` می‌آمد، و هر اعراب دو بایت است. یعنی
    متنِ اعراب‌دارِ ما ۲۷٪ بلندتر برآورد می‌شد و مدل ناچار بود کِش بدهد.
    آن را بعد از دو اجرای تلف‌شده فهمیدم. اینجا **پیش از** اجرا سنجیدمش،
    از روی خودِ `RuleDurationEstimator`:

      • اعراب وزنِ **صفر** دارند («mark»: 0.0). یعنی آن اشکال اینجا نیست.
      • ولی ZWNJ در بازهٔ کدیِ «kana» می‌افتد و وزنِ **۲٫۲** می‌گیرد —
        بیشتر از یک حرفِ فارسیِ کامل (۱٫۵)، برای نویسه‌ای که اصلاً صدا
        ندارد. در یک بندِ واقعیِ درس‌نامه این یعنی ~۵٫۶٪ برآوردِ اضافه.

    پس عدد را خودمان درست حساب می‌کنیم و با `duration=` به مدل می‌دهیم.
    گزارش هر دو را می‌آورد تا «چقدر فرق کرد» حدس نباشد.
    """
    from omnivoice.utils.duration import RuleDurationEstimator
    e = RuleDurationEstimator()
    w = e.calculate_total_weight
    raw = e.estimate_duration(genText, refText, refFrames)
    fixed = e.estimate_duration(genText.replace(ZWNJ_, ""),
                                refText.replace(ZWNJ_, ""), refFrames)
    return {
        "zwnj_in_text": genText.count(ZWNJ_),
        "zwnj_weight": w(ZWNJ_),
        "tashkil_weight": w("َ"),
        "frames_default": round(raw, 1),
        "frames_zwnj_free": round(fixed, 1),
        "overestimate_pct": (round(100 * (raw / fixed - 1), 1) if fixed else None),
    }


def tokAudit_(tok, text):
    """
    ممیزیِ واژگان — همان کاری که برای f5 کردیم، برای یک واژه‌سازِ واقعی.

    ══ چرا این سنجه و نه ایمانِ به «چندزبانه» ══
    f5 واژگانش یک فایلِ متنیِ تک‌نویسه‌ای بود و `vocab_char_map.get(c, 0)`
    هر نویسهٔ ناشناخته را به **فاصله** بدل می‌کرد — یعنی متنِ فارسی بی هیچ
    خطایی به سکوت تبدیل می‌شد. اینجا واژه‌ساز از خودِ HF می‌آید، پس این
    شکلِ خرابی نباید ممکن باشد. «نباید» را می‌سنجیم.

    سه عدد: نویسهٔ ناشناخته (باید صفر باشد)، رفت‌وبرگشتِ بی‌تلفات، و
    نسبتِ توکن به نویسه (که هزینهٔ فارسی را در برابرِ انگلیسی نشان می‌دهد).
    """
    ids = tok(text, add_special_tokens=False).input_ids
    back = tok.decode(ids)
    unk = getattr(tok, "unk_token_id", None)
    return {
        "tokens": len(ids),
        "chars": len(text),
        "tokens_per_char": round(len(ids) / max(1, len(text)), 3),
        "unknown_tokens": (sum(1 for i in ids if i == unk) if unk is not None else 0),
        "roundtrip_ok": back.replace(" ", "") == text.replace(" ", ""),
        "roundtrip_sample": back[:200],
    }


def run_omnivoice(ref, src, text, out):
    """
    ══ چرا این موتور، بعد از اینکه f5 بالاخره «خیلی بهتر» شد ══

    مسیرِ MOSS-TTS-Nano را می‌ساختم که README خودش جلویم را گرفت. سه چیز
    را نویسنده‌اش دربارهٔ مدلِ خودش نوشته بود: «سقفِ عملیِ هر گفته حدودِ
    پنج ثانیه است»، «خروجی از نظرِ حس تخت است»، و در پایان — دربارهٔ کارِ
    خودش — «برای فارسیِ بلند، مدلِ بزرگِ غیرِخودبازگشتی مثلِ OmniVoice
    ابزارِ بهتری است». پادکستِ ما نوزده دقیقه است، نه پنج ثانیه.

    پس OmniVoice را از **خودِ بسته‌اش** خواندم، نه از تبلیغش. چهار چیز که
    آن را از f5 جدا می‌کند و هر چهار از کد درآمده‌اند، نه از ادعا:

      ۱. واژه‌سازش `AutoTokenizer` است، نه فهرستِ تک‌نویسه‌ایِ دست‌ساز. آن
         تلهٔ «نویسهٔ ناشناخته → فاصله» که فارسی را بی‌صدا خراب می‌کرد،
         اینجا ساختاراً وجود ندارد. با این حال `tokAudit_` می‌سنجدش.
      ۲. بودجهٔ زمان از وزنِ آوایی می‌آید، و اعراب وزنِ **صفر** دارند.
         همان چیزی که در f5 دو اجرا خرجش شد، اینجا از پیش درست است.
      ۳. تکه‌کردنِ متنِ بلند **داخلِ خودش** است: هر چه برآوردش از ۳۰ ثانیه
         بگذرد به تکه‌های ۱۵ ثانیه‌ای می‌شکند و همه را با همان یک مرجع
         می‌خوانَد. یعنی یک قسمتِ کامل یک فراخوان است.
      ۴. اگر `ref_text` را **ما** بدهیم، صوتِ مرجع را نمی‌بُرد. f5 در هر
         حال به ۱۲ ثانیه می‌بُرید و همین بود که متنِ دست‌نویسِ صاحبِ برنامه
         را با صوت ناهم‌خوان می‌کرد.

    و فارسی در فهرستِ زبان‌هایش هست: ۳۶۶ ساعت، رتبهٔ ۴۶ از ۶۴۶ زبان.
    پروانهٔ کد Apache-2.0 است؛ پروانهٔ **وزن‌ها** را همین اجرا از کارتِ
    مدل می‌خوانَد و در گزارش می‌آورد — چون KiaBush دقیقاً همین‌جا
    غیرتجاری از آب درآمد.
    """
    import numpy as np
    import torch
    import soundfile as sf
    from omnivoice import OmniVoice

    repo = OPT.get("omni_model") or "k2-fsa/OmniVoice"
    steps = OPT.get("f5_nfe")
    steps = int(steps) if str(steps or "").strip().isdigit() else 32

    # ── ۱. مدل: مسیرش را جدا حل کن تا کارتِ مدل خوانده شود ──
    # پروانهٔ وزن‌ها در کارتِ مدل است، نه در LICENSEِ گیت‌هاب. این تفاوت
    # همان چیزی است که XTTS و KiaBush را از دور خارج کرد.
    from huggingface_hub import snapshot_download
    t0 = time.time()
    path = repo if os.path.isdir(repo) else snapshot_download(repo)
    facts = {"repo": repo, "download_seconds": round(time.time() - t0)}
    card = os.path.join(path, "README.md")
    if os.path.exists(card):
        head = io.open(card, encoding="utf-8", errors="replace").read()[:1500]
        facts["model_card_head"] = head[:900]
        m = re.search(r"^license:\s*(.+)$", head, re.M)
        facts["weights_license"] = (m.group(1).strip() if m else "در کارتِ مدل نیامد")
    OPT["model_facts"] = facts
    saveRep_()
    print("پروانهٔ وزن‌ها:", facts.get("weights_license"), flush=True)

    print("بارگذاری روی CPU (fp32) …", flush=True)
    model = OmniVoice.from_pretrained(path, device_map="cpu", dtype=torch.float32)
    facts["params_millions"] = round(
        sum(p.numel() for p in model.parameters()) / 1e6, 1)
    facts["sampling_rate"] = int(model.sampling_rate)
    facts["frame_rate"] = float(model.audio_tokenizer.config.frame_rate)
    facts["load_seconds"] = round(time.time() - t0)
    OPT["model_facts"] = facts
    saveRep_()
    print("مدل:", json.dumps(facts, ensure_ascii=False)[:400], flush=True)

    # ── ۲. ممیزیِ واژگان، پیش از هر تولیدی ──
    OPT["vocab_audit"] = tokAudit_(model.text_tokenizer, text)
    saveRep_()
    print("واژگان:", json.dumps(OPT["vocab_audit"], ensure_ascii=False), flush=True)

    # ── ۳. نمونهٔ مرجع ──
    # ══ چرا همان برشِ f5 و نه سقفِ ۱۰ ثانیه‌ایِ توصیه‌شده ══
    # بسته ۳ تا ۱۰ ثانیه را توصیه می‌کند. اول همان را گذاشتم — و بعد دیدم
    # چه چیزی می‌شکند: متنِ مرجعِ دست‌نویسِ صاحبِ برنامه برای برشِ ۱۱٫۵۷
    # ثانیه‌ایِ f5 نوشته شده. با سقفِ ده ثانیه، چند واژهٔ آخرِ آن متن هیچ
    # صدایی پشتش ندارد — همان ناهم‌خوانیِ متن و صوت که سه اجرا خرجش شد.
    #
    # و سودِ دوم مهم‌تر است: با برشِ یکسان، دو موتور **یک** مرجع و **یک**
    # متن دارند، پس تفاوتِ خروجی واقعاً تفاوتِ موتور است. مقایسه‌ای که
    # دو متغیر داشته باشد، جواب نمی‌دهد.
    # ۱۱٫۵ کمی بالای توصیه است، نه نزدیکِ سقفِ هشدارِ بسته (۲۰). این در
    # گزارش نوشته می‌شود تا اگر کلونِ صدا ضعیف بود، فرضیهٔ بعدی باشد.
    cut = os.path.join(out, "omni-ref-cut.wav")
    cutAtPause_(ref, cut)
    OPT["ref_cut_note"] = ("برش با همان تنظیمِ f5 (سقف ۱۱٫۵ ثانیه) تا متنِ "
                           "مرجعِ دست‌نویس برای هر دو موتور معتبر بماند؛ "
                           "توصیهٔ خودِ بسته ۳ تا ۱۰ ثانیه است.")
    OPT["ref_cut"] = probe(cut)
    saveRep_()

    given = (OPT.get("ref_text") or "").strip()
    if given:
        # ══ متنِ دست‌نویس فقط وقتی درست است که با **همین** برش بخواند ══
        # چون ref_text را ما می‌دهیم، بسته صوت را نمی‌بُرد — پس ناهم‌خوانی
        # را چیزی نمی‌گیرد جز خودمان. رونویس هم گرفته می‌شود، نه برای
        # استفاده، برای **مقایسه**؛ ناهم‌خوانی در گزارش می‌آید.
        OPT["ref_text_source"] = "دست‌نویسِ صاحبِ برنامه"
        refText = given
    else:
        OPT["ref_text_source"] = "رونویسِ خودکار (Whisper) از روی همین برش"
        refText = None
    try:
        model.load_asr_model()
        heard = model.transcribe(cut)
        OPT["heard"] = heard
        if given:
            gw, hw = len(given.split()), len(heard.split())
            if hw and abs(gw - hw) > max(3, 0.35 * hw):
                OPT["ref_text_warning"] = (
                    "متنِ داده‌شده %d واژه دارد و آنچه از این برش شنیده شد %d — "
                    "احتمالاً متن برای برشِ دیگری نوشته شده." % (gw, hw))
        if refText is None:
            refText = heard
    except Exception as e:
        OPT["asr_error"] = str(e)[:400]
        if refText is None:
            raise RuntimeError("رونویس نشد و متنِ مرجع هم داده نشده: %s" % str(e)[:200])
    OPT["ref_text_final"] = refText
    saveRep_()
    print("متنِ مرجع:", refText[:200], flush=True)

    prompt = model.create_voice_clone_prompt(ref_audio=cut, ref_text=refText)
    refFrames = int(prompt.ref_audio_tokens.shape[-1])
    OPT["ref_used"] = {"frames": refFrames,
                       "seconds": round(refFrames / facts["frame_rate"], 2),
                       "ref_text_after_punct": prompt.ref_text[:200]}
    saveRep_()

    # ── ۴. بودجهٔ زمان ──
    OPT["speed_fit"] = durAudit_(prompt.ref_text, text, refFrames)
    saveRep_()
    print("بودجهٔ زمان:", json.dumps(OPT["speed_fit"], ensure_ascii=False), flush=True)
    fixSec = OPT["speed_fit"]["frames_zwnj_free"] / facts["frame_rate"]

    # ── ۵. اجراها ──
    # ══ دو اجرا، و هر کدام سؤالِ خودش ══
    # اجرای #۱۷ یک «شاهد» ساخت که با اجرای آزمون **یکسان** بود، ۲۵ دقیقه
    # خرج کرد و مقایسه‌ای دروغین به دست داد. پس هر اجرا اینجا سؤالِ جدا
    # دارد: اولی «چقدر خوب می‌خواند»، دومی «ارزانش چقدر بد است» — و
    # عددِ سرعت است که تصمیمِ تولید را می‌گیرد، نه کیفیت.
    # ══ ارزان اول، و گران فقط اگر جا باشد ══
    # اجرای #۱۱ صد و پنجاه دقیقه را کامل خرج کرد و **هیچ** خروجی نداشت.
    # درسش این بود که سقفِ کار مهلتِ هیچ کاری نیست. اینجا همان درس به
    # ترتیبِ اجراها بدل شده: نسخهٔ ارزان اول می‌آید، پس اگر بعدی از بودجه
    # بگذرد دستِ‌کم یک صوت شنیدنی داریم — و از روی زمانِ واقعیِ همان
    # اجرای اول، زمانِ دومی **برآورد** می‌شود، نه امید.
    # ══ متغیرِ دوم: اعراب، نه گام‌ها ══
    # اول «۱۶ گام در برابرِ ۳۲» گذاشته بودم، برای سنجشِ هزینه. ولی هزینه
    # با گام تقریباً خطی است — نسبتِ سرعتِ یک اجرا، هزینهٔ نصفِ گام‌ها را
    # هم می‌گوید. یک اجرای بیست‌دقیقه‌ای برای عددی که از حساب درمی‌آید،
    # همان اشتباهِ «شاهدی که با آزمون یکی است» در اجرای #۱۷ است.
    #
    # سؤالی که حساب جوابش را نمی‌دهد این است: مرحلهٔ `speak` موتور متنِ
    # **اعراب‌دار** بیرون می‌دهد و ورودیِ واقعیِ ما همان است. بودجهٔ زمانِ
    # OmniVoice اعراب را صفر می‌شمارد (سنجیدمش) — ولی واژه‌سازش چیزِ
    # دیگری است، و فارسیِ کاملاً اعراب‌دار در هیچ پیکرهٔ آموزشیِ بزرگی
    # فراوان نیست. اگر اعراب خروجی را بدتر کند، باید بی‌اعراب بفرستیم و
    # این را فقط با شنیدنِ هر دو می‌شود فهمید.
    plain = noTash_(text)
    runs = [("tashkil", text, "متنِ اعراب‌دار — همان که موتور تولید می‌کند")]
    if plain != text:
        runs.append(("plain", plain, "همان متن، بی اعراب — آیا بهتر می‌خوانَد؟"))
    else:
        OPT["one_run_why"] = "اجرای دوم نیامد: متن اصلاً اعراب نداشت."

    # ══ بودجه برای کلِ کار است، نه برای هر فراخوان ══
    # نسخهٔ اول می‌پرسید «آیا اجرای بعدی از بودجه بیشتر است؟». غلط بود:
    # اگر اولی چهل دقیقه برده باشد و بودجه چهل‌وپنج، دومی «۴۰ < ۴۵» را
    # می‌گذراند و مجموع می‌شود هشتاد — یعنی همان مرگِ اجرای #۱۱ با یک
    # حسابِ آرام‌کننده. پرسشِ درست «گذشته + برآوردِ بعدی» است.
    made, variants, lastRt = None, [], None
    tAll = time.time()
    for name, gen, why in runs:
        if lastRt is not None:
            spent = time.time() - tAll
            if spent + lastRt > OMNI_BUDGET_SEC:
                variants.append({"name": name, "why": why,
                                 "skipped": "تا اینجا %ds رفته و اجرای بعدی ~%ds "
                                            "می‌بَرد؛ بودجه %ds است — اجرا نشد تا "
                                            "خروجیِ موجود از دست نرود."
                                            % (round(spent), round(lastRt),
                                               OMNI_BUDGET_SEC)})
                OPT["variants"] = variants
                saveRep_()
                print("%s اجرا نشد: %ds رفته + ~%ds > %ds."
                      % (name, spent, lastRt, OMNI_BUDGET_SEC), flush=True)
                continue
        dst = os.path.join(out, "omnivoice_%s.wav" % name)
        t1 = time.time()
        try:
            audio = model.generate(
                text=gen,
                language="fa",
                voice_clone_prompt=prompt,
                duration=fixSec,
                num_step=steps,
            )
            sf.write(dst, audio[0], model.sampling_rate)
            took = round(time.time() - t1)
            info = probe(dst)
            # ══ نسبتِ سرعت برای **هر** اجرا، نه یکی برای همه ══
            # اجرای #۱۰ زمانِ دو خروجی را به حسابِ یکی نوشت و عدد را دو
            # برابر گزارش کرد. عددِ سرِ جمع همان اشتباه است وقتی دو اجرا
            # عمداً تنظیمِ متفاوت دارند.
            sec = float(info.get("seconds") or 0)
            variants.append({
                "name": name, "num_step": steps, "why": why,
                "file": os.path.basename(dst), "sent": gen[:300],
                "info": info, "seconds_taken": took,
                "realtime_factor": (round(took / sec, 1) if sec else None),
                "episode_hours_19min": (round(took / sec * 19 * 60 / 3600.0, 1)
                                        if sec else None),
            })
            made = made or dst
            lastRt = took
            print("%s: %ss صوت در %ss" % (name, info.get("seconds"), took), flush=True)
        except Exception as e:
            variants.append({"name": name, "num_step": steps, "why": why,
                             "sent": gen[:300], "error": str(e)[:600]})
            print("%s شکست خورد: %s" % (name, str(e)[:300]), flush=True)
        OPT["variants"] = variants
        saveRep_()

    if not made:
        raise RuntimeError("هیچ‌کدام از اجراها خروجی نداد")
    return made



MOSS_REPO_ = "https://github.com/OpenMOSS/MOSS-TTS"
MOSS_BASE_ = "OpenMOSS-Team/MOSS-TTS-Realtime"
MOSS_CODEC_ = "OpenMOSS-Team/MOSS-Audio-Tokenizer"
MOSS_LORA_ = "hamidfzm/MOSS-TTS-Realtime-Persian-lora"



def mossPins_(repo):
    """
    آنچه مخزن پین کرده، در برابرِ آنچه واقعاً نصب است.

    ══ چرا این تابع بعد از سه شکست نوشته شد ══
    torchcodec نبود · نوعِ عددی یکی نبود · نسخهٔ transformers یکی نبود.
    هیچ‌کدام ربطی به فارسی نداشت و هیچ‌کدام پیامِ روشنی نداد — آخری
    «create_causal_mask() got an unexpected keyword argument» بود، که
    نمی‌گوید «نسخه‌ات غلط است».
    کدی که از یک مخزنِ گیت می‌آید (نه از PyPI) وابستگی‌هایش را در
    `pyproject.toml` خودش نوشته. پس خوانده می‌شود، نه به یاد آورده.
    """
    import re as _re
    out = {"pinned": {}, "installed": {}, "mismatch": {}}
    path = os.path.join(repo, "pyproject.toml")
    if not os.path.exists(path):
        out["note"] = "pyproject.toml در مخزن نبود"
        return out
    txt = io.open(path, encoding="utf-8", errors="replace").read()
    for m in _re.finditer(r'"([A-Za-z0-9_.\-]+)\s*==\s*([0-9][^"]*)"', txt):
        out["pinned"][m.group(1).lower()] = m.group(2).strip()
    try:
        from importlib import metadata as _md
        for name in out["pinned"]:
            try:
                out["installed"][name] = _md.version(name)
            except Exception:
                out["installed"][name] = "(نصب نیست)"
    except Exception as e:
        out["note"] = str(e)[:200]
        return out
    for name, want in out["pinned"].items():
        got = out["installed"].get(name)
        if got and got != "(نصب نیست)" and got != want:
            out["mismatch"][name] = {"مخزن می‌خواهد": want, "نصب است": got}
    return out

def mossLora_(model):
    """
    آیا وصلهٔ فارسی **واقعاً** روی مدل نشسته؟

    ══ چرا نسخهٔ اولِ این سنجه بی‌ارزش بود ══
    اولش قدرمطلقِ چهل پارامترِ **اول** را پیش و پس از وصله جمع می‌زدم و
    اختلاف را «نشست» می‌خواندم. ولی `PeftModel` مدل را در لایه‌های تازه
    می‌پیچد، پس ترتیبِ `parameters()` عوض می‌شود — «چهل پارامترِ اول»
    دیگر همان تانسورها نیستند. عددِ متفاوت، تفاوتِ **ترتیب** را نشان
    می‌داد نه تفاوتِ وزن را. گزارش «changed: true» داد و هیچ چیزی را
    ثابت نکرد؛ همان شکلِ «تحلیلی که به تصمیم وصل نیست» با لباسِ بدتر:
    تحلیلی که اصلاً چیزی را نمی‌سنجد.

    سنجهٔ درست ابهام ندارد: پارامترهای LoRA **نام** دارند.
    """
    names = [n for n, _ in model.named_parameters() if "lora_" in n.lower()]
    nz = 0
    for n, t in model.named_parameters():
        if "lora_" in n.lower() and float(t.detach().float().abs().sum().item()) > 0:
            nz += 1
    return {"lora_params": len(names), "nonzero": nz,
            "sample": names[:3],
            "attached": len(names) > 0 and nz > 0}

def run_moss(ref, src, text, out):
    """
    MOSS-TTS-Realtime + وصلهٔ فارسیِ `hamidfzm` — گزینهٔ دومِ صاحبِ برنامه.

    ══ چرا این، بعد از دو موتوری که هرکدام نیمی از کار را کردند ══
    f5 درست می‌خوانَد ولی بی‌روح؛ OmniVoice رنگِ صدا را عالی می‌گیرد ولی
    غلط می‌خوانَد. این تنها نامزدی است که در کارتِ خودش **لحن** را هدف
    اعلام کرده: «pronunciation، ezafe voicing و conversational register»
    — و روی `GPTInformal-Persian` آموزش دیده که پیکرهٔ گفتارِ محاوره است،
    نه جمله‌خوانیِ Common Voice.

    و پروانه‌اش Apache-2.0 است، هم پایه هم وصله. یعنی برخلافِ KiaBush
    (غیرتجاری) و Thomcles (غیرتجاری)، برای کانالی که قرار است درآمد
    داشته باشد بسته نیست.

    ══ سه چیزی که این موتور را از دو تای دیگر متفاوت می‌کند ══
      ۱. کدش روی PyPI نیست؛ در مخزنِ گیت‌هابِ OpenMOSS است. پس کلون
         می‌شود و `sys.path` دستی تنظیم می‌شود.
      ۲. سه بارِ جدا از Hugging Face می‌آید: مدلِ پایه، کُدِک صوت، و
         وصلهٔ فارسی.
      ۳. روی CPU باید `eager` و `float32` باشد. نمونهٔ خودِ کارتِ مدل
         `torch_dtype=torch.bfloat16` را حتی در شاخهٔ CPU هم می‌فرستد
         (متغیرِ `dtype` را حساب می‌کند و به کار نمی‌برد) — روی CPU این
         یا کند است یا می‌شکند.
    """
    import torch, torchaudio
    from transformers import AutoTokenizer, AutoModel

    # ── ۱. کد ──
    repo = os.path.join(out, "MOSS-TTS")
    if not os.path.isdir(repo):
        r = sh(["git", "clone", "--depth", "1", MOSS_REPO_, repo],
               capture_output=True, timeout=600)
        if r.returncode != 0:
            raise RuntimeError("کلونِ مخزنِ MOSS نشد: %s"
                               % (r.stderr or b"").decode("utf-8", "replace")[-400:])
    # ══ پین‌های خودِ مخزن را با آنچه نصب شده بسنج ══
    # سه سدِ پیاپی و هر سه از محیط بود، نه از فارسی. آخری‌اش
    # (`create_causal_mask`) خطایی داد که هیچ نمی‌گفت مشکل از نسخه است.
    # مخزن `pyproject.toml` دارد و پین‌هایش را همان‌جا نوشته؛ پس به‌جای
    # اینکه یادم بماند بخوانمش، اجرا خودش می‌خوانَد و اختلاف را گزارش
    # می‌کند. خطای رمزی به دادهٔ خوانا بدل می‌شود.
    OPT["pins"] = mossPins_(repo)
    saveRep_()
    if OPT["pins"].get("mismatch"):
        print("::warning::نسخه‌های ناهم‌خوان با پینِ مخزن: %s"
              % json.dumps(OPT["pins"]["mismatch"], ensure_ascii=False), flush=True)

    sys.path.insert(0, os.path.join(repo, "moss_tts_realtime"))
    from mossttsrealtime.modeling_mossttsrealtime import MossTTSRealtime
    from inferencer import MossTTSRealtimeInference

    facts = {"repo": MOSS_REPO_, "base": MOSS_BASE_, "lora": MOSS_LORA_}
    OPT["model_facts"] = facts
    saveRep_()

    # ── ۲. وزن‌ها ──
    print("بارگذاری روی CPU (eager · fp32) …", flush=True)
    t0 = time.time()
    model = MossTTSRealtime.from_pretrained(
        MOSS_BASE_, attn_implementation="eager", torch_dtype=torch.float32).eval()
    tok = AutoTokenizer.from_pretrained(MOSS_BASE_)
    # ══ روی CPU همه‌چیز باید **یک** نوعِ عددی باشد ══
    # اجرای دوم افتاد با «expected m1 and m2 to have the same dtype, but
    # got: float != c10::BFloat16». علتش این است که هر تکه نوعِ عددیِ
    # ذخیره‌شدهٔ خودش را نگه می‌دارد: مدلِ پایه را fp32 خواستم، ولی کُدِک
    # پیش‌فرضِ خودش را دارد و وصلهٔ LoRA روی یک ۴۰۷۰Ti با bf16 آموزش دیده،
    # پس bf16 ذخیره شده. CPU ضرب دو نوعِ مختلف را انجام نمی‌دهد.
    # `torch_dtype` هنگامِ بارگذاری کافی نیست چون peft بعدش می‌آید؛ پس
    # **پس از** همهٔ سرِهم‌بندی، یک بار صریح fp32 می‌کنیم.
    codec = AutoModel.from_pretrained(
        MOSS_CODEC_, trust_remote_code=True, torch_dtype=torch.float32).float().eval()
    facts["params_millions"] = round(
        sum(p.numel() for p in model.parameters()) / 1e6, 1)
    facts["load_seconds"] = round(time.time() - t0)

    # ── ۳. وصلهٔ فارسی — و مدلِ پایه که نگه داشته می‌شود ──
    # هر دو لازم‌اند: بی شاهدِ بی‌وصله نمی‌شود گفت خرابی از وصله است یا
    # از خودِ پایه.
    base, withLora = model, None
    try:
        from peft import PeftModel
        withLora = PeftModel.from_pretrained(model, MOSS_LORA_)
        # وصله با bf16 آموزش دیده و با همان ذخیره شده؛ اینجا به fp32
        # می‌آید تا با مدلِ پایه هم‌نوع شود.
        withLora = withLora.float().eval()
        facts["lora"] = mossLora_(withLora)
        facts["lora"]["id"] = MOSS_LORA_
        if not facts["lora"]["attached"]:
            OPT["lora_warning"] = (
                "وصلهٔ فارسی بارگذاری شد ولی هیچ پارامترِ LoRAیی پیدا نشد "
                "(یا همه صفرند) — یعنی خروجی، خروجیِ مدلِ پایه است.")
            print("::warning::" + OPT["lora_warning"], flush=True)
    except Exception as e:
        facts["lora_error"] = str(e)[:500]
        print("وصلهٔ فارسی نشست نکرد: %s" % str(e)[:300], flush=True)
    if withLora is None:
        withLora = base
        base = None
    OPT["model_facts"] = facts
    saveRep_()
    print("مدل:", json.dumps(facts, ensure_ascii=False)[:400], flush=True)

    def mkInf_(m):
        return MossTTSRealtimeInference(m, tok, max_length=5000, codec=codec,
                                        codec_sample_rate=24000,
                                        codec_encode_kwargs={"chunk_duration": 8})

    # ── ۴. نمونهٔ مرجع ──
    # کارتِ وصله ۱۰ تا ۳۰ ثانیه می‌خواهد؛ برشِ یازده‌ونیم‌ثانیه‌ایِ ما در
    # همان بازه است و **همانی** است که دو موتورِ دیگر گرفتند. تفاوتِ
    # خروجی باید تفاوتِ موتور باشد، نه تفاوتِ مرجع.
    cut = os.path.join(out, "moss-ref-cut.wav")
    cutAtPause_(ref, cut)
    OPT["ref_cut"] = probe(cut)
    saveRep_()

    # ══ آیا مرجع اصلاً به کدهای صوتی تبدیل شد؟ ══
    # دو اجرای پیشین صدای **زن** دادند با نمونهٔ مرجعِ مردانه. یعنی یا
    # مرجع تزریق نشده، یا اثر نکرده. این دو را نمی‌شود با گوش جدا کرد،
    # ولی با یک عدد می‌شود: کدهای صوتیِ مرجع چه شکلی دارند. اگر تهی یا
    # تک‌قابی باشند، «پرامپتِ تیمبر» عملاً خالی است.
    try:
        _codes = mkInf_(withLora)._encode_reference_audio(cut, device="cpu")
        OPT["ref_codes"] = {"shape": list(getattr(_codes, "shape", [])),
                            "frames": (int(_codes.shape[-1])
                                       if getattr(_codes, "shape", None) else 0)}
        print("کدهای مرجع:", json.dumps(OPT["ref_codes"], ensure_ascii=False),
              flush=True)
    except Exception as e:
        OPT["ref_codes"] = {"error": str(e)[:300]}
    saveRep_()

    # ── ۵. دو اجرا: با اعراب و بی اعراب ──
    # همان پرسشِ OmniVoice، و به همان دلیل: مرحلهٔ `speak` متنِ اعراب‌دار
    # بیرون می‌دهد، ولی این وصله ادعا می‌کند «هیچ front-endِ آوایی لازم
    # نیست» — یعنی روی متنِ **عادی** آموزش دیده. کدام بهتر است، فقط با
    # شنیدن معلوم می‌شود.
    # ══ متغیرِ دوم دیگر اعراب نیست ══
    # هر دو اجرای پیشین «صدای زن» دادند، با اینکه نمونهٔ مرجع مردانه بود
    # — یعنی کلونِ صدا اصلاً اعمال نشد و پرسشِ «اعراب یا بی‌اعراب» موضوعیت
    # ندارد وقتی هیچ‌کدام صدای درست را نمی‌دهد.
    # پرسشِ درست این است: **وصله** کلونینگ را خراب کرده، یا خودِ مدلِ
    # پایه هم کلون نمی‌کند؟ این دو، دو کارِ کاملاً متفاوت را لازم دارند،
    # و فقط یک شاهدِ بی‌وصله جدایشان می‌کند.
    runs = [("lora", withLora, "با وصلهٔ فارسی")]
    if base is not None:
        runs.append(("base", base, "بی وصله — شاهد: آیا خودِ مدلِ پایه کلون می‌کند؟"))
    else:
        OPT["one_run_why"] = "شاهدِ بی‌وصله ساخته نشد."

    made, variants, tAll, last = None, [], time.time(), None
    gen = noTash_(text)
    for name, mdl, why in runs:
        if last is not None and (time.time() - tAll) + last > OMNI_BUDGET_SEC:
            variants.append({"name": name, "why": why,
                             "skipped": "گذشته + برآوردِ بعدی از بودجهٔ %ds گذشت."
                                        % OMNI_BUDGET_SEC})
            OPT["variants"] = variants
            saveRep_()
            continue
        dst = os.path.join(out, "moss_%s.wav" % name)
        t1 = time.time()
        try:
            res = mkInf_(mdl).generate(text=[gen], reference_audio_path=[cut],
                               temperature=0.8, top_p=0.6, top_k=30,
                               repetition_penalty=1.1, repetition_window=50,
                               device="cpu")
            toks = torch.tensor(res[0])
            dec = codec.decode(toks.permute(1, 0), chunk_duration=8)
            torchaudio.save(dst, dec["audio"][0].cpu().detach(), 24000)
            took = round(time.time() - t1)
            info = probe(dst)
            sec = float(info.get("seconds") or 0)
            variants.append({
                "name": name, "why": why, "file": os.path.basename(dst),
                "sent": gen[:300], "info": info, "seconds_taken": took,
                "realtime_factor": (round(took / sec, 1) if sec else None),
                "episode_hours_19min": (round(took / sec * 19 * 60 / 3600.0, 1)
                                        if sec else None)})
            made, last = (made or dst), took
            print("%s: %ss صوت در %ss" % (name, info.get("seconds"), took), flush=True)
        except Exception as e:
            variants.append({"name": name, "why": why, "sent": gen[:300],
                             "error": str(e)[:600]})
            print("%s شکست خورد: %s" % (name, str(e)[:400]), flush=True)
        OPT["variants"] = variants
        saveRep_()

    if not made:
        raise RuntimeError("هیچ‌کدام از اجراهای MOSS خروجی نداد")
    return made



OV_REPO_ = "https://github.com/myshell-ai/OpenVoice"
OV_CKPT_ = "myshell-ai/OpenVoiceV2"



def refClean_(src, out, tag, floorMax=-45.0, speechMin=55):
    """
    از یک ضبطِ مرجع، فقط تکه‌های تمیزش را نگه دار.

    ══ چرا این، پس از رسیدن به سقفِ ۷۰٪ ══
    `extract_se` بردارِ گوینده را روی هرچه بدهیم میانگین می‌گیرد. ما
    فایل‌های **کامل** می‌دادیم — با موسیقیِ آغازین، افکت، و هر تکهٔ
    نویزی‌ای که در یک ضبطِ کتابِ صوتی هست. آن‌ها هم وارد میانگین می‌شوند
    و بردار را از صدای خودِ گوینده دور می‌کنند.
    `refScore_` از اول همین را می‌سنجید — ولی فقط برای **انتخابِ یک
    پنجره** به کار می‌رفت. اینجا همان سنجه روی همهٔ تکه‌ها اجرا می‌شود و
    هرچه از سد گذشت می‌ماند. باز همان الگو: تحلیلی که بود و به این تصمیم
    وصل نشده بود.

    ══ و هرگز تهی برنمی‌گردد ══
    اگر هیچ تکه‌ای از سد نگذرد، یعنی سد غلط بوده، نه ضبط بی‌فایده. در آن
    حال بهترین تکه می‌ماند. (همان قاعده‌ای که در خودِ موتور هست: پالایه‌ای
    که می‌تواند همه‌چیز را بیندازد، اول باید به خودش شک کند.)
    """
    f = ffmpeg()
    info = probe(src)
    dur = float(info.get("seconds") or 0)
    if dur < 45:
        return src, {"file": os.path.basename(src), "kept": "کوتاه‌تر از آن بود که تکه شود"}
    keep, scored = [], []
    for i in range(int(dur // 30)):
        ch = os.path.join(out, "%s-chunk%02d.wav" % (tag, i))
        r = sh([f, "-y", "-nostdin", "-ss", str(i * 30), "-t", "30",
                "-i", src, "-ac", "1", "-ar", "24000", ch],
               capture_output=True, timeout=120)
        if r.returncode != 0:
            continue
        sc = refScore_(ch)
        scored.append({"at": i * 30, "floor": sc.get("window_floor_db"),
                       "speech": sc.get("speech_pct")})
        if (sc.get("window_floor_db") is not None
                and sc["window_floor_db"] < floorMax
                and (sc.get("speech_pct") or 0) >= speechMin):
            keep.append((ch, sc))
    if not keep and scored:
        best = max(range(len(scored)),
                   key=lambda k: (scored[k]["floor"] or -999))
        ch = os.path.join(out, "%s-chunk%02d.wav" % (tag, best))
        if os.path.exists(ch):
            keep = [(ch, scored[best])]
    if not keep:
        return src, {"file": os.path.basename(src), "kept": "تکه‌ای ساخته نشد"}
    lst = os.path.join(out, "%s-list.txt" % tag)
    with io.open(lst, "w", encoding="utf-8") as fh:
        for ch, _ in keep:
            fh.write("file '%s'\n" % os.path.abspath(ch))
    dst = os.path.join(out, "%s-clean.wav" % tag)
    r = sh([f, "-y", "-nostdin", "-f", "concat", "-safe", "0", "-i", lst,
            "-c", "copy", dst], capture_output=True, timeout=180)
    if r.returncode != 0 or not os.path.exists(dst):
        return src, {"file": os.path.basename(src), "kept": "چسباندن نشد"}
    return dst, {"file": os.path.basename(src),
                 "chunks_total": len(scored), "chunks_kept": len(keep),
                 "seconds": round(probe(dst).get("seconds") or 0, 1),
                 "scored": scored[:12]}


def refsPrepare_(paths, out, prefix, seconds=None, rate=24000):
    """هر ورودیِ مرجع را به wav تبدیل می‌کند و **می‌شمارد**.

    ══ چرا شمردنش مهم است ══
    در اجرای اوپن‌وویس چهار شناسهٔ درایو داده شد و سه مرجع به مدل رسید.
    خطا چاپ شده بود و در گزارش هیچ نبود — یعنی همان شکلی که در تمامِ
    این ریپو دنبالش می‌گردیم: کاری که کمتر از خواسته انجام شده و
    خودش را موفق نشان می‌دهد. «شنیدم، ۷۰٪ شبیه بود» با سه مرجع و با
    چهار مرجع دو چیزِ متفاوت است، و بدونِ این عدد نمی‌شود فهمید کدام.

    گزارش همیشه نوشته می‌شود، حتی وقتی همه سالم‌اند: نبودنِ هشدار باید
    یعنی «سنجیده شد و درست بود»، نه «کسی نگاه نکرد».
    """
    ready, failed = [], []
    for i, p in enumerate(paths):
        try:
            ready.append(to_wav(p, os.path.join(out, "%s%d.wav" % (prefix, i + 1)),
                                seconds=seconds, rate=rate))
        except Exception as e:
            failed.append({"index": i + 1, "input": str(p)[:120],
                           "error": str(e)[:200]})
            print("نمونهٔ %d آماده نشد: %s" % (i + 1, str(e)[:200]), flush=True)
    rep = {"asked": len(paths), "ready": len(ready)}
    if failed:
        rep["failed"] = failed
        rep["warning"] = ("از %d نمونه فقط %d به مدل رسید — نتیجه با آنچه "
                          "خواسته شده بود سنجیده نمی‌شود."
                          % (len(paths), len(ready)))
        print("هشدار: " + rep["warning"], flush=True)
    OPT["ref_prepare"] = rep
    saveRep_()
    return ready


def run_openvoice(ref, src, text, out):
    """
    OpenVoice v2 — تبدیلِ صدا، این‌بار با مدلی که کارش فقط همین است.

    ══ چرا این، بعد از ChatterboxVC ══
    دو داده داریم و هر دو یک چیز می‌گویند:
      • مبدأ زن  → «فقط کمی شبیه رضوی»
      • مبدأ مرد → «زیر ۴۰٪»
    یعنی فرضیهٔ «تبدیلِ زن به مرد سخت است» رد شد؛ خودِ ChatterboxVC ضعیف
    است. و شاهدِ قاطعش این است که OmniVoice با **همان یک نمونهٔ صوتی**
    رنگِ رضوی را «خیلی خیلی خوب» درآورد — پس نمونه‌مان خوب است و ایراد
    در انتقال است، نه در ورودی.

    OpenVoice معماری‌اش دقیقاً برای همین است: `ToneColorConverter` رنگِ
    صدا را از بقیهٔ چیزها جدا می‌کند و فقط همان را عوض می‌کند. لحن و
    واژه‌ها اصلاً بازتولید نمی‌شوند.

    ══ سه چیزی که از خودِ مخزنشان درآمد، نه از حدس ══
      ۱. پروانه MIT است و README صریح می‌گوید «Free for both commercial
         and research use» — برخلافِ KiaBush و Thomcles که هر دو
         غیرتجاری‌اند، و برخلافِ OmniVoice که پروانهٔ وزنش هنوز روشن نیست.
      ۲. `setup.py`شان `numpy==1.22.0` و `gradio==3.48.0` را پین کرده —
         نصبِ کاملش روی پایتونِ ۳٫۱۱ یا می‌شکند یا ساعت‌ها کامپایل می‌کند.
         ولی `ToneColorConverter` هیچ‌کدام را لازم ندارد. پس مثلِ MOSS
         کلون می‌شود و فقط وابستگی‌های واقعی‌اش نصب می‌شوند.
      ۳. نشانیِ چک‌پوینت در سندشان (S3) **مرده است — ۴۰۴**. از Hugging
         Face می‌آید، و چون چیدمانش ممکن است فرق کند، کد فایل‌ها را
         **می‌گردد** و اگر پیدا نکرد فهرستِ آنچه آمده را گزارش می‌کند —
         نه اینکه با خطای «فایل نیست» بمیرد.

    ══ و یک اهرمِ کیفیت که فقط این موتور دارد ══
    `extract_se` یک **فهرست** می‌گیرد و بردارهای گوینده را میانگین
    می‌گیرد. f5 و OmniVoice هر کدام روی یک برش شرط می‌شوند؛ اینجا هر
    چهار ضبطِ رضوی می‌تواند با هم بردارِ هدف را بسازد. پس همین را
    می‌سنجیم: یک نمونه در برابرِ همه.
    """
    import numpy as np
    import torch

    if not src:
        raise RuntimeError("این موتور به صوتِ مبدأ نیاز دارد (خروجیِ Gemini).")

    # ── ۱. کد ──
    repo = os.path.join(out, "OpenVoice")
    if not os.path.isdir(repo):
        r = sh(["git", "clone", "--depth", "1", OV_REPO_, repo],
               capture_output=True, timeout=600)
        if r.returncode != 0:
            raise RuntimeError("کلونِ OpenVoice نشد: %s"
                               % (r.stderr or b"").decode("utf-8", "replace")[-400:])
    sys.path.insert(0, repo)
    from openvoice.api import ToneColorConverter

    # ── ۲. چک‌پوینت ──
    from huggingface_hub import snapshot_download
    t0 = time.time()
    ck = snapshot_download(OV_CKPT_, allow_patterns=["converter/*"])
    cfg = pth = None
    found = []
    for root, _dirs, files in os.walk(ck):
        for f in files:
            found.append(os.path.relpath(os.path.join(root, f), ck))
            if f.endswith(".json") and cfg is None:
                cfg = os.path.join(root, f)
            if f.endswith((".pth", ".ckpt", ".safetensors")) and pth is None:
                pth = os.path.join(root, f)
    facts = {"repo": OV_REPO_, "ckpt_repo": OV_CKPT_,
             "files": sorted(found)[:20],
             "download_seconds": round(time.time() - t0)}
    OPT["model_facts"] = facts
    saveRep_()
    if not cfg or not pth:
        raise RuntimeError("در چک‌پوینت config یا وزن پیدا نشد. آنچه آمد: %s"
                           % ", ".join(sorted(found)[:20]))
    facts["config"] = os.path.basename(cfg)
    facts["weights"] = os.path.basename(pth)

    # ══ واترمارک خاموش ══
    # `enable_watermark=True` بستهٔ `wavmark` را می‌خواهد و یک واترمارکِ
    # دومِ نامحسوس روی صوت می‌گذارد. برای آزمایش هیچ‌کدام لازم نیست، و یک
    # وابستگیِ کمتر یعنی یک جای شکستِ کمتر.
    # ══ واترمارک: دو بار اشتباه کردم، و هر دو بار جوابش در همان دو خط بود ══
    # کدشان این است:
    #     def __init__(self, *args, **kwargs):
    #         super().__init__(*args, **kwargs)
    #         if kwargs.get('enable_watermark', True):
    #             import wavmark
    # بارِ اول پس از ساخت `watermark_model = None` گذاشتم — دیر بود، چون
    # `import` در خودِ سازنده است. بارِ دوم `enable_watermark=False` را
    # پاس دادم — ولی همان سازنده **همهٔ** kwargs را به کلاسِ پایه می‌دهد
    # و آن، این پرچم را نمی‌شناسد. یعنی پرچمی که خودشان می‌خوانند، اصلاً
    # قابلِ فرستادن نیست: باگِ آن‌هاست، نه انتخابِ ما.
    #
    # پس ماژول را پیش از ساخت بدل می‌کنیم و بلافاصله مدل را تهی. نه
    # دانلودی لازم است نه وابستگی‌ای، و `add_watermark` با مدلِ تهی صوت
    # را دست‌نخورده برمی‌گرداند.
    if "wavmark" not in sys.modules:
        _wm = types.ModuleType("wavmark")
        _wm.load_model = lambda *a, **kw: types.SimpleNamespace(
            to=lambda *a2, **k2: None)
        sys.modules["wavmark"] = _wm
    tcc = ToneColorConverter(cfg, device="cpu")
    tcc.watermark_model = None
    tcc.load_ckpt(pth)
    facts["load_seconds"] = round(time.time() - t0)
    OPT["model_facts"] = facts
    saveRep_()
    print("مدل:", json.dumps(facts, ensure_ascii=False)[:400], flush=True)

    # ── ۳. بردارِ گویندهٔ مبدأ (جمینای) ──
    srcSe = tcc.extract_se(src)

    # ── ۴. دو بردارِ هدف: یک نمونه، و همهٔ نمونه‌ها ──
    allRefs = refsPrepare_(OPT.get("ref_inputs") or [], out, "ovref")
    # ══ متغیرِ تازه: `tau` ══
    # «همه» از «یکی» بهتر بود، پس آن پرسش بسته شد و همیشه همهٔ ضبط‌ها
    # می‌روند. متغیرِ بعدی از خودِ کدشان درآمد:
    #     z, m_q, logs_q, _ = self.enc_q(y, y_lengths, g=g_src, tau=tau)
    # یعنی `tau` نویزی است که به بازنماییِ **محتوا** تزریق می‌شود
    # (`z = m + randn·exp(logs)·tau`). پیش‌فرضِ خودِ مدل ۱٫۰ است و بستهٔ
    # آن‌ها آن را روی ۰٫۳ آورده — پس پایین‌تر بردنش فرضیهٔ طبیعیِ بعدی
    # است: نویزِ کمتر یعنی تبدیلِ باثبات‌تر و تمیزتر.
    # مرجع در هر دو اجرا **یکی** است تا فقط همین یک چیز عوض شود.
    # ══ `tau` اهرم نبود ══
    # ۰٫۳ و ۰٫۰۵ خروجیِ تقریباً یکسان دادند («مثل هم بودن»). پس آن پرسش
    # بسته است و روی پیش‌فرض می‌ماند.
    #
    # متغیرِ تازه: **تمیزیِ خودِ مرجع**. تا حالا فایل‌های کامل می‌رفتند،
    # با موسیقیِ آغازین و هر تکهٔ نویزی. `extract_se` روی همه میانگین
    # می‌گیرد، پس آن‌ها بردار را از صدای گوینده دور می‌کنند.
    refs = allRefs if len(allRefs) > 1 else [ref]
    cleaned, cleanLog = [], []
    for i, p in enumerate(refs):
        try:
            c, log = refClean_(p, out, "ovclean%d" % (i + 1))
        except Exception as e:
            c, log = p, {"file": os.path.basename(p), "error": str(e)[:200]}
        cleaned.append(c)
        cleanLog.append(log)
    OPT["ref_clean"] = cleanLog
    saveRep_()
    print("تمیزکاریِ مرجع:", json.dumps(cleanLog, ensure_ascii=False)[:600],
          flush=True)

    runs = [("whole", refs, 0.3, "ضبط‌های کامل — همان که ۷۰٪ شد (شاهد)"),
            ("clean", cleaned, 0.3, "فقط تکه‌های تمیزِ همان ضبط‌ها")]

    made, variants = None, []
    for name, refs_, tau, why in runs:
        dst = os.path.join(out, "openvoice_%s.wav" % name)
        t1 = time.time()
        try:
            tgtSe = tcc.extract_se(refs_)
            tcc.convert(audio_src_path=src, src_se=srcSe, tgt_se=tgtSe,
                        output_path=dst, tau=tau)
            took = round(time.time() - t1)
            info = probe(dst)
            sec = float(info.get("seconds") or 0)
            variants.append({
                "name": name, "why": why, "file": os.path.basename(dst),
                "tau": tau, "refs": [os.path.basename(x) for x in refs_],
                "info": info, "seconds_taken": took,
                "realtime_factor": (round(took / sec, 1) if sec else None),
                "episode_hours_19min": (round(took / sec * 19 * 60 / 3600.0, 1)
                                        if sec else None)})
            made = made or dst
            print("%s: %ss صوت در %ss" % (name, info.get("seconds"), took), flush=True)
        except Exception as e:
            variants.append({"name": name, "why": why, "error": str(e)[:600]})
            print("%s شکست خورد: %s" % (name, str(e)[:400]), flush=True)
        OPT["variants"] = variants
        saveRep_()

    if not made:
        raise RuntimeError("هیچ‌کدام از اجراهای OpenVoice خروجی نداد")
    return made


def run_rvcsmoke(ref, src, text, out):
    """
    اجرای دودیِ زنجیرهٔ آموزشِ RVC روی CPU — برای اثبات، نه برای کیفیت.

    ══ چرا این هست ══
    آموزشِ واقعی روی GPU و در Colab انجام می‌شود، یعنی **دستِ کاربر**.
    یک شکستِ ساده وسطِ آن، وقتِ او را می‌خورد و اعتمادش را — و او در آن
    محیط ابزارِ عیب‌یابی ندارد. پس همان زنجیره یک بار اینجا، روی CPU، با
    چند دقیقه صدا و دو دوره اجرا می‌شود. سرعت و کیفیتش بی‌معنی است؛ چیزی
    که ثابت می‌کند این است: مسیرها درست‌اند، دارایی‌ها می‌آیند، ترتیبِ
    آرگومان‌ها درست است، و **فایلِ مدل واقعاً ساخته می‌شود**.

    این تفاوتِ «فکر می‌کنم کار می‌کند» با «یک بار کار کرد» است — همان
    تفاوتی که در این ریپو سه بار به شکلِ «رفعِ باگی که رفع نشده بود»
    ظاهر شد.

    ══ چرا CPU اصلاً ممکن است ══
    از خودِ `train/train.py` خوانده شد: اگر کارتی نباشد `n_gpus` را ۱
    می‌گذارد، backend را `gloo` می‌کند (نه nccl) و هر تماسِ cuda را پشتِ
    `torch.cuda.is_available()` گارد کرده. پس هر پنج قدم پوشش داده
    می‌شود، نه چهارتا.
    """
    import shutil
    import rvcpipe as P

    # ══ کارگاه بیرون از پوشهٔ خروجی ══
    # بارِ اول مخزن را داخلِ `out` کلون کردم و آرتیفکت ۵۵۹ مگابایت و ۳۰۰
    # فایل شد — یعنی بیست ثانیه آپلودِ چیزی که هیچ‌کس نمی‌خواهدش، روی
    # ریپویی که عمومی است. آنچه باید بایگانی شود گزارش است، نه کلِ RVC.
    # و مسیرِ **یکتا**، نه ثابت: `git clone` روی پوشهٔ ناتهی می‌افتد، پس
    # یک نامِ ثابت یعنی اجرای دوم روی همان ماشین بی‌دلیل شکست می‌خورد.
    work = tempfile.mkdtemp(prefix="rvcwork-")
    root = os.path.abspath(os.path.join(work, "rvc"))
    ds = os.path.abspath(os.path.join(work, "ds"))
    exp, sr = "smoke", "40k"
    os.makedirs(ds, exist_ok=True)
    facts = {"repo": P.RVC_REPO, "weights": P.HF_WEIGHTS, "sr": sr,
             "device": "cpu", "purpose": "اثباتِ مسیر، نه کیفیت",
             "work_dir": work}
    OPT["rvc"] = facts
    saveRep_()

    # ── ۱. کد ──
    t0 = time.time()
    r = sh(["git", "clone", "--depth", "1", P.RVC_REPO, root], timeout=900)
    if r.returncode != 0:
        raise RuntimeError("کلونِ RVC ناموفق بود")
    facts["clone_seconds"] = round(time.time() - t0)

    # ── ۲. وابستگی‌ها ──
    # از `rvcpipe.TRAIN_DEPS` — همان فهرستی که نوت‌بوک هم می‌خوانَد، تا
    # اینجا و آنجا نتوانند از هم جدا بیفتند.
    t0 = time.time()
    r = sh([sys.executable, "-m", "pip", "install", "--quiet"] + P.TRAIN_DEPS,
           timeout=2400)
    if r.returncode != 0:
        raise RuntimeError("نصبِ وابستگی‌های آموزش ناموفق بود")
    facts["deps_seconds"] = round(time.time() - t0)
    facts["deps"] = P.TRAIN_DEPS

    # ── ۳. دارایی‌ها ──
    # نامِ فرمانِ huggingface_hub عوض شده (`huggingface-cli` → `hf`) و
    # کدام‌یک روی PATH بنشیند به نسخه بستگی دارد. حدس‌زدنش یعنی شکستی که
    # فقط می‌گوید «command not found».
    t0 = time.time()
    # `huggingface_hub` از همان `TRAIN_DEPS` آمده و پین دارد؛ ارتقای
    # موردی‌اش همان چیزی بود که transformers را شکست (اجرای #۳۹).
    # و در نسخه‌های زیرِ ۱٫۰ نامِ فرمان `huggingface-cli` است نه `hf` —
    # پس همان تشخیصِ دو-نامی که از اول گذاشته بودم اینجا به کار می‌آید.
    hf = shutil.which("hf") or shutil.which("huggingface-cli")
    if not hf:
        raise RuntimeError("فرمانِ hf پیدا نشد (نه hf نه huggingface-cli)")
    facts["hf_bin"] = os.path.basename(hf)
    for cmd in P.assetCmds_(py=sys.executable, sr=sr, hf=hf):
        if cmd[:3] == [sys.executable, "-m", "pip"]:
            continue                      # همین بالا انجام شد
        r = sh(cmd, cwd=root, timeout=2400)
        if r.returncode != 0:
            raise RuntimeError("دانلودِ دارایی ناموفق بود: %s" % " ".join(cmd[-3:]))
    facts["assets_seconds"] = round(time.time() - t0)
    # آنچه واقعاً روی دیسک نشست — نه آنچه خواسته شد.
    facts["assets_on_disk"] = dict(
        (rel, round(os.path.getsize(os.path.join(root, rel)) / 1048576.0, 1))
        for rel in ("assets/hubert_base/pytorch_model.bin",
                    "assets/rmvpe/rmvpe.pt",
                    "assets/" + P.PRETRAINED % ("G", sr),
                    "assets/" + P.PRETRAINED % ("D", sr))
        if os.path.exists(os.path.join(root, rel)))
    facts["mute_ok"] = os.path.isdir(os.path.join(root, "logs", "mute"))
    saveRep_()

    # ── ۴. دیتاست ──
    # چند دقیقه بس است: هدف اثباتِ مسیر است. هر ضبط سقفِ خودش را دارد تا
    # یک فایلِ بلند کلِ بودجه را نخورد.
    made = refsPrepare_(OPT.get("ref_inputs") or [ref], ds, "seg",
                        seconds=RVC_SMOKE_SECONDS, rate=40000)
    if not made:
        raise RuntimeError("هیچ صوتی برای دیتاست آماده نشد")
    facts["dataset_files"] = len(made)
    facts["dataset_seconds"] = sum(
        (probe(m).get("seconds") or 0) for m in made)

    # ── ۵. پنج قدم ──
    steps = P.steps(exp, ds, root, sr=sr, f0method="rmvpe",
                    epochs=RVC_SMOKE_EPOCHS, save_every=1, version="v2",
                    gpus="", n_p=1, batch=1, py=sys.executable)
    envv = P.env(root)
    # پوشهٔ تجربه و لاگ‌های خالی، پیش از هر قدمی — اسکریپت‌ها بازشان
    # می‌کنند ولی نمی‌سازندشان (اجرای #۳۸).
    P.preLog_(root, exp)
    log = []
    for name, cmd in steps:
        if name == "train":
            # `config.json` و `filelist.txt` فقط وقتی ساختنی‌اند که
            # استخراج تمام شده باشد — پس اینجا، نه اول.
            facts["pre_train"] = P.preTrain_(root, exp, sr=sr, version="v2")
            saveRep_()
            print("پیش از آموزش:",
                  json.dumps(facts["pre_train"], ensure_ascii=False),
                  flush=True)
            if not facts["pre_train"]["from_dataset"]:
                raise RuntimeError(
                    "فهرستِ آموزش از دیتاست خالی است — استخراج چیزی نساخت")
        t = time.time()
        # ══ چرا خروجی گرفته می‌شود، نه فقط جاری ══
        # بارِ اول فقط `code: 1` در گزارش نشست و علت هیچ‌جا نبود جز وسطِ
        # هزار خط لاگ. یعنی گزارشی که نمی‌شود از آن فهمید چه شد — همان
        # چیزی که این ریپو یک بخشِ کامل دربارهٔ بدتر بودنش از سکوت دارد.
        tail, code = shTail_(cmd, cwd=root, env=envv,
                             timeout=RVC_STEP_TIMEOUT)
        row = {"step": name, "code": code, "seconds": round(time.time() - t)}
        if code != 0:
            row["output_tail"] = tail
        log.append(row)
        OPT["rvc_steps"] = log
        saveRep_()
        print("قدمِ %s: کد %s در %ss" % (name, code, row["seconds"]), flush=True)
        if code != 0:
            print("── آخرین خطوطِ قدمِ «%s» ──\n%s" % (name, tail), flush=True)
            raise RuntimeError("قدمِ «%s» شکست خورد (کد %s) — %s"
                               % (name, code, errGist_(tail)))

    # ── ۶. آیا واقعاً چیزی ساخته شد؟ ──
    # قدمی که کدِ صفر برگرداند ولی فایلی نساخته باشد، همان شکلِ شکستی است
    # که این ریپو بیش از همه از آن خورده. پس خروجی **دیده** می‌شود.
    o = P.outputs(exp, root)
    model = o["model"]
    idx = [f for f in os.listdir(o["index_dir"])
           if f.endswith(".index")] if os.path.isdir(o["index_dir"]) else []
    facts["model_mb"] = (round(os.path.getsize(model) / 1048576.0, 2)
                         if os.path.exists(model) else None)
    facts["index_files"] = idx
    saveRep_()
    if not os.path.exists(model):
        raise RuntimeError("آموزش بی‌خطا تمام شد ولی مدلی در %s نیست" % model)
    if not idx:
        raise RuntimeError("ایندکسِ بازیابی ساخته نشد")
    return model




def run_dataset(ref, src, text, out):
    """
    از ضبط‌های بلند، دیتاستِ تمیزِ آموزش بساز — و **نشان بده** چه کردی.

    ══ مسئله دو تاست، نه یکی ══
    ۱. موسیقیِ تنها (تیزر، میان‌برنامه، تیتراژ) — گفتاری رویش نیست.
    ۲. موسیقی **زیرِ** روایت — گفتار هست، پس هیچ VADی دورش نمی‌ریزد.

    دومی مهم‌تر است: RVC رنگِ صدا را از هرچه در فایل باشد یاد می‌گیرد، پس
    «صدا + موسیقی» را یاد می‌گیرد و بعد همان را تولید می‌کند.

    ══ و یک ابزار هر دو را جواب می‌دهد ══
    جایی که گفتار نیست ولی صدا بلند است، یعنی چیزی پخش است. برای حالتِ
    اول این فاصله‌های بینِ جمله‌هاست، برای حالتِ دوم مکث‌های ریزِ بینِ
    خودِ کلمه‌ها. هر دو نسبت به سطحِ گفتارِ همان فایل سنجیده می‌شوند.

    خودِ منطق در `dsprep.py` است، چون نوت‌بوکِ Colab هم همان را اجرا
    می‌کند. اینجا فقط گزارش‌نویسیِ آزمایشگاه است.
    """
    srcs = list(OPT.get("ref_inputs") or ([ref] if ref else []))
    if not srcs:
        raise RuntimeError("هیچ ضبطی داده نشد.")

    # ══ تکه‌ها بیرونِ پوشهٔ خروجی ══
    # اجرای #۴۰: ۳۱۸ تکه داخلِ `out` نشستند و بایگانی ۲۴۲ مگابایت شد،
    # روی ریپویی که عمومی است، برای چیزی که کسی از آنجا برنمی‌دارد —
    # تکه‌ها در Colab دوباره ساخته می‌شوند. محصولِ این اجرا داوری است،
    # نه دیتاست.
    segDir = tempfile.mkdtemp(prefix="segs-")

    def onFile(files):
        OPT["dataset"] = {"files": files}
        saveRep_()

    segs, rep = buildDataset_(srcs, segDir, sampleDir=out, onFile=onFile)
    heard = {}
    for k, path in (rep.get("samples") or {}).items():
        if path:
            heard[k] = probe(path)
    rep["samples"] = heard
    OPT["dataset"] = rep
    saveRep_()
    if not segs:
        raise RuntimeError("هیچ تکه‌ای نماند — آستانه‌ها یا ورودی را ببین")
    return (rep.get("samples") and
            os.path.join(out, "SAMPLE-kept.wav")) or segs[0]


RUNNERS = {"chatterboxvc": run_chatterboxvc, "seedvc": run_seedvc,
           "chatterbox": run_chatterbox, "f5": run_f5, "xtts": run_xtts,
           "omnivoice": run_omnivoice,
           "moss": run_moss,
           "openvoice": run_openvoice,
           "rvcsmoke": run_rvcsmoke,
           "dataset": run_dataset}

# تنظیماتِ اجرا که موتورها می‌خوانند. یک دیکشنریِ ساده، چون امضای
# RUNNERها یکی است و نباید برای یک موتور عوض شود.
OPT = {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", required=True, choices=sorted(ENGINES))
    # ══ چند نمونه، نه یکی ══
    # سه فایل رسید و «کدام؟» سؤالی است که با شنیدن جواب داده نمی‌شود وقتی
    # معیارها عددی‌اند. پس همه را بده؛ خودش می‌سنجد و انتخاب می‌کند.
    ap.add_argument("--ref", required=True, action="append",
                    help="نمونهٔ صدای گوینده (چند بار قابلِ تکرار)")
    ap.add_argument("--src", default="", help="صوتِ فارسیِ Gemini (برای تبدیلِ صدا)")
    ap.add_argument("--text", default=DEFAULT_TEXT)
    ap.add_argument("--out", default="voicelab-out")
    # این «چقدر مواد بده» است، نه «چقدر استفاده کن»: برشِ نهایی را
    # cutAtPause_ سرِ یک مکث و زیرِ سقفِ دوازده‌ثانیه‌ایِ f5 انجام می‌دهد.
    # هرچه سخاوتمندتر، انتخابِ مکث بهتر.
    ap.add_argument("--ref-seconds", type=int, default=30)
    # آزمایشی که ارزان نباشد، دو بار انجام نمی‌شود.
    ap.add_argument("--src-seconds", type=int, default=12)
    # چک‌پوینتِ سفارشیِ f5 — «hf://کاربر/مخزن/فایل» یا مسیرِ محلی
    ap.add_argument("--f5-ckpt", default="")
    ap.add_argument("--f5-vocab", default="")
    # متنِ دقیقِ نمونهٔ مرجع. خالی یعنی f5 خودش با ASR پیاده‌اش کند — و
    # پیاده‌سازیِ غلط، تلفظِ غلط می‌سازد.
    # نامِ f5 روی این دو مانده چون خانه‌های فرم همین نام را دارند؛ ولی
    # هر دو مفهومِ عمومی‌اند (متنِ مرجع · گام‌های کیفیت) و OmniVoice هم
    # همان‌ها را می‌خوانَد. نامِ عمومی به‌عنوانِ مترادف اضافه شد تا فرم
    # دست‌نخورده بماند و کد دروغ نگوید.
    ap.add_argument("--f5-ref-text", "--ref-text", dest="f5_ref_text", default="")
    ap.add_argument("--f5-nfe", "--steps", dest="f5_nfe", default="")
    # مخزنِ OmniVoice — خالی یعنی k2-fsa/OmniVoice
    ap.add_argument("--omni-model", default="")
    # ══ ایدهٔ صاحبِ برنامه: الفبا را عوض کن، نه مدل را ══
    # «برای مدل‌هایی که فارسی نمی‌فهمند ولی انگلیسی می‌فهمند، فارسی را
    # فینگلیش بنویسیم — و برای تلفظ از نشانه‌گذاریِ دیکشنری‌ها.»
    # این را نمی‌شود با استدلال جواب داد، چون سؤالش «چطور به گوش می‌آید»
    # است. پس یک پرچم، و همان مسیرِ موجود.
    ap.add_argument("--alphabet", default="fa",
                    choices=["fa"] + sorted(fa2latin.MODES))
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    OPT["f5_ckpt"] = a.f5_ckpt
    OPT["f5_vocab"] = a.f5_vocab
    OPT["f5_ref_text"] = a.f5_ref_text
    # نامِ عمومی، چون دو موتور می‌خوانندش
    OPT["ref_text"] = a.f5_ref_text
    OPT["omni_model"] = a.omni_model
    OPT["f5_nfe"] = a.f5_nfe
    OPT["alphabet"] = a.alphabet
    # برگردان اینجا انجام می‌شود، نه در run_f5: این آزمایشِ **متن** است، نه
    # آزمایشِ f5. Chatterbox و XTTS هم انگلیسی می‌دانند و فارسی نه — یعنی
    # دقیقاً همان مدل‌هایی که این ایده برایشان طرح شده.
    if a.alphabet != "fa":
        cov = fa2latin.coverage(a.text)
        # ══ اصل را نگه دار ══
        # برگردانِ من یک حدس است؛ خودِ مدل G2Pِ آموزش‌دیدهٔ خودش را دارد
        # (`KiaBush/persian-text-to-ipa-byt5`) و ورودیِ آن **فارسی** است.
        # اگر اینجا اصل را دور بیندازم، دیگر نمی‌شود آن دو را سنجید.
        OPT["text_fa"] = a.text
        a.text = fa2latin.convert(a.text, a.alphabet)
        OPT["alphabet_note"] = {"mode": a.alphabet, "coverage": cov,
                                "sent": a.text[:400]}
        print("متن به %s برگردانده شد:\n%s\n" % (a.alphabet, a.text[:300]),
              flush=True)
    meta = ENGINES[a.engine]
    rep = {"engine": a.engine, "at": time.strftime("%Y-%m-%d %H:%M"),
           "family": meta["family"], "code_license": meta["code_license"],
           "persian_note": meta["persian"], "ok": False}
    if a.engine == "f5" and (a.f5_ckpt or a.f5_vocab):
        rep["custom_checkpoint"] = {"ckpt": a.f5_ckpt, "vocab": a.f5_vocab}
    # از این لحظه، هر گامِ مهم گزارش را روی دیسک می‌نویسد — نه فقط پایان.
    OPT["_rep"], OPT["_out"] = rep, a.out
    saveRep_()

    # ── آماده‌سازیِ نمونه ──
    # ══ چرا فهرستِ خام هم نگه داشته می‌شود ══
    # `refAudition_` یکی را برمی‌دارد، که برای f5 و OmniVoice درست است
    # (هر دو روی یک برش شرط می‌شوند). ولی OpenVoice بردارِ گوینده را روی
    # **چند** ضبط میانگین می‌گیرد؛ برای آن، دور انداختنِ سه ضبطِ دیگر
    # دور انداختنِ کیفیت است.
    OPT["ref_inputs"] = list(a.ref)
    ref = refAudition_(a.ref, a.out, a.ref_seconds)
    rep["reference"] = probe(ref)
    src = ""
    if a.src:
        # ══ صوتِ مبدأ هم از ثانیهٔ صفر برداشته می‌شد ══
        # قسمت‌های واقعیِ ما با موسیقیِ آغازین شروع می‌شوند. دوازده ثانیهٔ
        # اولِ یک قسمت یعنی دوازده ثانیه موسیقی — و تبدیلِ صدا رویش هیچ
        # چیزی دربارهٔ خوانشِ فارسی نمی‌گوید. همان اشتباهِ «کجای فایل» که
        # برای نمونهٔ مرجع اصلاح شد و اینجا جا مانده بود.
        # `refAudition_` همین را می‌سنجد: پنجره‌ای با کفِ سکوتِ پایین
        # (یعنی بی موسیقیِ زیرِ گفتار) و مکث‌های واقعی.
        src = refAudition_([a.src], a.out, a.src_seconds, tag="source-gemini")
        rep["source"] = probe(src)
    if meta["needs_src"] and not src:
        rep["error"] = "این موتور به صوتِ مبدأ نیاز دارد و داده نشد."
    else:
        # ── نصب ──
        t0 = time.time()
        r = sh([sys.executable, "-m", "pip", "install", "--quiet"] + meta["pip"])
        rep["install_seconds"] = round(time.time() - t0)
        if r.returncode != 0:
            rep["error"] = "نصبِ %s ناموفق بود" % ", ".join(meta["pip"])
        else:
            # ══ نامِ نقطهٔ ورود را حدس زده‌ام؛ پس واقعیتش را چاپ کن ══
            # اگر حدسم غلط باشد، این چند خط تفاوتِ «اجرا شکست خورد» با
            # «اجرا شکست خورد و نامِ درست این است» را می‌سازد — و اجرای
            # بعدی را از یک حدسِ دیگر بی‌نیاز می‌کند.
            for pkg in meta["pip"]:
                q = sh([sys.executable, "-m", "pip", "show", "-f", pkg],
                       capture_output=True)
                txt = (q.stdout or b"").decode("utf-8", "replace")
                tops, bins = set(), set()
                for ln in txt.splitlines():
                    ln = ln.strip()
                    if ln.endswith(".py") and "/" in ln:
                        tops.add(ln.split("/")[0])
                    if ln.startswith("../../../bin/"):
                        bins.add(ln.rsplit("/", 1)[-1])
                rep.setdefault("packages", {})[pkg] = {
                    "modules": sorted(m for m in tops if not m.startswith(("_", "."))) [:12],
                    "commands": sorted(bins)[:12],
                }
            print("بسته‌ها:", json.dumps(rep.get("packages", {}), ensure_ascii=False), flush=True)
            # ── اجرا ──
            if a.engine == "seedvc":
                rep["patch"] = patch_bigvgan()
                print("وصله:", json.dumps(rep["patch"], ensure_ascii=False), flush=True)
            t1 = time.time()
            try:
                made = RUNNERS[a.engine](ref, src, a.text, a.out)
                if not made or not os.path.exists(made):
                    raise RuntimeError("موتور بی‌خطا تمام شد ولی فایلی نساخت")
                rep["ok"] = True
                rep["output"] = os.path.basename(made)
                rep["output_info"] = probe(made)
            except Exception as e:
                rep["error"] = str(e)[:2000]
                rep["traceback"] = traceback.format_exc()[-1500:]
            rep["run_seconds"] = round(time.time() - t1)
            # ورودیِ خام را ثبت می‌کردم؛ آنچه واقعاً به مدل رفت چیزِ دیگری
            # است (شناسهٔ مخزن به نشانیِ فایل حل می‌شود). گزارشی که ورودی
            # را جای اجرا بگذارد، همان اشتباهِ اجرای #۶ است.
            if a.engine == "f5":
                rep["ref_text_given"] = bool(a.f5_ref_text)
                rep["nfe_step"] = a.f5_nfe or "(پیش‌فرض ۳۲)"
            # ══ عددی که تصمیمِ *تولید* را می‌گیرد، نه کیفیت ══
            # seedvc در اجرای #۳ تبدیل را انجام داد — ۱۵۶۶ ثانیه برای ۱۲
            # ثانیه صوت. یعنی یک قسمتِ نوزده‌دقیقه‌ای روی همین ماشین از
            # چهل ساعت می‌گذرد. کیفیتِ عالی هم این را نجات نمی‌دهد، پس
            # این نسبت باید در گزارش باشد نه در ذهن.
            try:
                # ══ عدد را روی همهٔ چیزی که ساخته شد بشمار، نه یکی ══
                # اجرای #۱۰ «۲۱۰ برابرِ بلادرنگ» گزارش کرد و ۶۷ ساعت برای یک
                # قسمت. ولی آن اجرا **دو** فایل ساخت و کلِ زمان به حسابِ
                # اولی نوشته شد. عددِ درست ۹۴ است. گزارشی که هزینهٔ دو کار را
                # به یکی ببندد، همان اشتباهِ «ورودی را خروجی گزارش کردن» است
                # با لباسِ دیگر — و این عدد است که تصمیمِ تولید را می‌گیرد.
                sec = 0.0
                for v in (OPT.get("variants") or []):
                    sec += float(((v or {}).get("info") or {}).get("seconds") or 0)
                if not sec:
                    sec = float((rep.get("output_info") or {}).get("seconds") or 0)
                rep["generated_seconds_total"] = round(sec, 2)
                if sec > 0:
                    rep["realtime_factor"] = round(rep["run_seconds"] / sec, 1)
                    rep["episode_hours_19min"] = round(
                        rep["realtime_factor"] * 19 * 60 / 3600.0, 1)
            except Exception:
                pass

    saveRep_()
    print("\n=== گزارش ===")
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    # شکستِ یک موتور، شکستِ آزمایش نیست: خودِ خبر همان چیزی است که می‌خواستیم.
    return 0


if __name__ == "__main__":
    sys.exit(main())
