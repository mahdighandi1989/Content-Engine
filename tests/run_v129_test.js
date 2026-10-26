/* ══ آزمونِ ۱۲.۹ — سه نمونهٔ «بی پردازش»ِ گلدوز پس از «بغض و لرزش»ِ نمونه‌های سقفِ اوج ══
 * صاحبِ کانال: «دو سه نمونهٔ بدونِ پیچ‌شیفت و بدونِ پردازشِ اضافه، با صدای پایهٔ پایدارتر و دستورِ سبکِ «آرام، روشن، بدونِ لرزش،
 * لحنِ گرم و ثابت» … تا تأییدِ او هیچ‌چیزِ تولیدی عوض نشود.»
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

/* ۱۳.۱: سه بذرِ ۱۲.۹ پیش از ساخته شدن جایشان را به دو نمونهٔ خام با دستورِ تازهٔ او دادند — شکلِ «بی پردازش» همان ماند. */
const seeds = (CFG.VOICE_SOUL_SEED || []).filter((x) => x.pitchFix !== undefined && x.hx !== 'soft');   // ۱۳.۳: بذرِ «خ نرم» در run_v132
ok('۱ نمونه‌های گلدوز روی درسِ ۷۴، هر کدام مبدأِ مردانهٔ دیگر، Charon در میانشان', seeds.length >= 2 && seeds.every((x) => x.speaker === 'spk-1g0r95d' && String(x.ep) === '74') &&
   new Set(seeds.map((x) => x.voice)).size === seeds.length && seeds.some((x) => x.voice === 'Charon'));
ok('۲ هیچ پردازشی: گامِ ۰، بی سقفِ اوج، بی رنگ، بی زیروبمِ هر تکه، بی «آرام»ِ کارتِ سبک، بی حالت‌ها', seeds.every((x) => x.pitchFix === '0' && !x.f0cap && !x.colour && !x.segPitch && !x.calm && !x.hx && x.nospans === true));
ok('۳ دستورِ سبک عینِ خواستهٔ او (۱۳.۱: دستورِ تازه)', seeds.every((x) => x.cueFix === 'آرام، پایدار، بدونِ لرزش، با پایان‌بندیِ طبیعی'));
ok('۴ برچسب‌ها یکتا (هر نمونه جدا ساخته می‌شود) و هر کدام «خام» و «گامِ ۰» می‌گوید', new Set(seeds.map((x) => x.tag)).size === seeds.length &&
   seeds.every((x) => /خام/.test(x.tag) && /گامِ ۰/.test(x.tag)));
ok('۵ سقفِ روزانهٔ بذر جا دارد', (Number(CFG.VOICE_SOUL_SEED_MAX_DAY) || 0) >= seeds.length);

const s36 = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
ok('۶ دستورِ آماده جای کارتِ سبک، و کششِ مکث با آن نیست', /var cueUse = pick\.cueFix \? pick\.cueFix :/.test(s36) && /if \(!pick\.plain && !pick\.cueFix\) \{/.test(s36));
ok('۷ گامِ ثابت فقط از بذر به ردیف: گام = همان، هدفِ هرتز برداشته', /if \(o\.pitchFix != null && String\(o\.pitchFix\) !== ''\) \{\s*row\.params\.pitch = String\(o\.pitchFix\);\s*delete row\.params\.targetHz;/.test(s36) &&
   /if \(pick\.pitchFix !== '' && pick\.pitchFix != null\) tagO\.pitchFix = pick\.pitchFix;/.test(s36));
ok('۸ تولید دست نخورد: VBR_EP_HOLD روشن، VBR_SEG_PITCH خاموش', CFG.VBR_EP_HOLD === true && CFG.VBR_SEG_PITCH === false);

/* رانر: بی هدفِ هرتز، سدِ «خروجی دور از هدف» چیزی رد نمی‌کند — وگرنه نمونهٔ گامِ ۰ (۱۲۸ هرتز در برابرِ ۱۵۸) هرگز نمی‌رسید. */
const py = require('child_process').execFileSync('python3', ['-c',
  'import sys,json;sys.path.insert(0,"tools");import voicebridge as v\n' +
  'print(json.dumps([v.pitchGateErr({"medianHz":128.0}, None), v.pitchGateErr({"medianHz":128.0}, {"targetHz":158.0,"pitch":0})]))']).toString();
const G = JSON.parse(py);
ok('۹ رانر: بی هدف ⇒ سد باز؛ با هدف ⇒ همان سدِ پیشین بسته (ابطال‌پذیر)', !G[0] && !!G[1], py);

summary();
