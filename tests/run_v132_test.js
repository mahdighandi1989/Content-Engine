/* ══ آزمونِ ۱۳.۲ — گشتنِ موسیقی که «وقت نماند» می‌خورد، شبه‌علم که «آموزشیِ مطمئن» بود، و لرزشی که سنجه نمی‌دید ══
 * هماهنگ‌کننده: «music.seekLast … ran=false، وقتِ کارِ شبانه نماند … گشتن را جلو بیندازید یا سهمِ تضمینی بگذارید … هر شب نتیجه در
 * ایمیلِ ۱۰ … Financial Astrology و Gann آموزشی/بله خورده‌اند … معیارِ لرزش تقریباً غیرتفکیک‌کننده است (رضوی 0.118 در برابرِ گلدوز 0.121).»
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;

/* ── ۱) لرزشِ بلندی: سنجهٔ تازه با ساختگی، ابطال‌پذیر ── */
const py = require('child_process').execFileSync('python3', ['-c', `
import sys, json, numpy as np
sys.path.insert(0, "tools"); import voicebridge as v
sr = 16000
def tone(am_db):
    t = np.arange(int(sr * 8)) / sr
    ph = 2 * np.pi * 150 * t
    g = 10 ** ((am_db * np.sin(2 * np.pi * 7 * t)) / 20.0)
    return (0.3 * g * (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph))).astype(np.float32)
res = {}
for name, db in (("steady", 0.0), ("trem", 5.0)):
    p = "/tmp/q132_%s.wav" % name
    v.writeMono(p, tone(db), sr)
    q = v.qualityScan(p)
    res[name] = {"s": q["shimmerDb"], "j": q["jitterSt"], "bad": v.qualityBad(q)}
print(json.dumps(res))
`]).toString();
const R = JSON.parse(py.trim().split('\n').pop());
ok('۱.۱ صدای صاف: لرزشِ بلندی نزدیکِ صفر، سالم', R.steady.s < 0.5 && !R.steady.bad, JSON.stringify(R.steady));
ok('۱.۲ لرزشِ بلندیِ ۷ هرتز (±۵ دسی‌بل) با زیروبمِ صاف ⇒ رد با علتِ «لرزشِ بلندی» — همان که لرزشِ زیروبم نمی‌دید',
   R.trem.s > 2.8 && /لرزشِ بلندی/.test(R.trem.bad) && R.trem.j < 0.18, JSON.stringify(R.trem));
const vb = fs.readFileSync('tools/voicebridge.py', 'utf8'), s36 = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
ok('۱.۳ سیم: سقف از CFG به ردیف و به رانر؛ در امتیازِ ساختِ دوباره و خطِ تلگرام',
   CFG.VBR_Q_SHIMMER_DB === 2.8 && /row\.params\.qShimmerDb = String\(CFG\.VBR_Q_SHIMMER_DB/.test(s36) &&
   /pr\.get\("qShimmerDb", 2\.8\)/.test(vb) && /q\.get\("shimmerDb", 0\)\s*$/m.test(vb) && /لرزشِ بلندی ' \+ qo\.shimmerDb/.test(s36));
ok('۱.۴ تولید دست نخورد: VBR_EP_HOLD روشن، VBR_SEG_PITCH خاموش', CFG.VBR_EP_HOLD === true && CFG.VBR_SEG_PITCH === false);

/* ── ۲) شبه‌علم ── */
const W = SERIES_HEADERS.length;
const row = (key, f) => { const v = new Array(W).fill(''); v[SC.KEY - 1] = key; v[SC.NAME - 1] = key; Object.keys(f || {}).forEach((c) => { v[Number(c) - 1] = f[c]; }); return v; };
const writes = [];
const fakeReg = (rows) => ({ rows: rows.map((v, i) => ({ key: v[SC.KEY - 1], row: i + 2, vals: v })), sheet: { getRange: (r) => ({ setValues: () => { writes.push(r); } }) } });
const verdict = (o) => Object.assign({ isCourse: 'true', courseSure: '90', score: '80', about: 'درس', topic: 'درس', category: 'علمی و آموزشی', catSure: '85',
  level: 'میانی', form: 'درسِ کلاسی', audience: 'عمومی', evidence: 'در این درس', why: 'منظم یاد می‌دهد' }, o);
{
  const fa = row('fin-astro', { [SC.NAME]: 'Financial Astrology', [SC.STATUS]: SST.NEW });
  const reg = fakeReg([fa]);
  applyVerdict_(reg, reg.rows[0], verdict({ about: 'پیش‌بینیِ بازار با چرخهٔ سیاره‌ها', topic: 'آسترولوژیِ مالی' }), { text: 'x'.repeat(2000), partNames: [], name: 'Financial Astrology' }, true);
  ok('۲.۱ «Financial Astrology» با داوریِ مطمئنِ «آموزشی» ⇒ «مشکوک» و «نیازمند بازبینی: احتمالاً شبه‌علم»',
     fa[SC.IS_COURSE - 1] === SJ.UNSURE && /نیازمند بازبینی: احتمالاً شبه‌علم/.test(fa[SC.WHY - 1]) && seriesJudgeState_(fa) === 'نیازمند بازبینی', fa[SC.WHY - 1]);
  const gn = row('gann', { [SC.NAME]: 'درس‌های زاویه‌های گان', [SC.STATUS]: SST.NEW });
  const r2 = fakeReg([gn]);
  applyVerdict_(r2, r2.rows[0], verdict({ pseudo: 'شبه‌علم', about: 'تحلیلِ تکنیکال با زاویه‌ها و چرخه‌های زمانی' }), { text: 'x'.repeat(2000), partNames: [] }, true);
  ok('۲.۲ برچسبِ خودِ داور («شبه‌علم») بی نشانه در نام هم کافی است', gn[SC.IS_COURSE - 1] === SJ.UNSURE && /داور: شبه‌علم/.test(gn[SC.WHY - 1]), gn[SC.WHY - 1]);
  const math = row('thinking-math', { [SC.NAME]: 'Thinking Mathematically', [SC.STATUS]: SST.NEW });
  const r3 = fakeReg([math]);
  applyVerdict_(r3, r3.rows[0], verdict({ pseudo: 'علمی', about: 'استدلالِ ریاضی و حلِ مسئله برای فعالانِ آموزش' }), { text: 'x'.repeat(2000), partNames: [] }, true);
  ok('۲.۳ ریاضی (و «فعالان» که «فال» درونش است) دست نمی‌خورد', math[SC.IS_COURSE - 1] === SJ.YES && !/شبه‌علم/.test(math[SC.WHY - 1]), math[SC.WHY - 1]);
  ok('۲.۴ آموزشِ «دربارهٔ» تاریخ یا نقدِ این‌ها در پرامپت «علمی» است', /آموزشِ \*\*دربارهٔ\*\* تاریخ یا نقدِ این‌ها «علمی» است/.test(judgePrompt_([], ['x'])) && JUDGE_SCHEMA.properties.verdicts.items.properties.pseudo.type === 'string');
}
{
  writes.length = 0;
  const yesAstro = row('gann2', { [SC.NAME]: 'Gann Square of Nine', [SC.IS_COURSE]: SJ.YES, [SC.STATUS]: SST.NEW, [SC.WHY]: 'منظم' });
  const manual = row('astro-man', { [SC.NAME]: 'Astrology history', [SC.IS_COURSE]: SJ.YES, [SC.MANUAL]: SMAN.YES, [SC.WHY]: 'دستی' });
  const skipped = row('tarot', { [SC.NAME]: 'Tarot', [SC.IS_COURSE]: SJ.YES, [SC.STATUS]: SST.SKIPPED });
  const fine = row('logic', { [SC.NAME]: 'منطق', [SC.IS_COURSE]: SJ.YES, [SC.STATUS]: SST.NEW });
  const r = judgePseudoSweep_(fakeReg([yesAstro, manual, skipped, fine]));
  ok('۲.۵ جاروی شبانه: فقط ردیفِ غیردستیِ «بله» با نشانه؛ ردیفِ دستی و «نادیده» و منطق دست نمی‌خورند؛ فقط همان یک ردیف نوشته شد',
     r.flagged === 1 && r.keys[0] === 'gann2' && yesAstro[SC.IS_COURSE - 1] === SJ.UNSURE && manual[SC.IS_COURSE - 1] === SJ.YES &&
     skipped[SC.IS_COURSE - 1] === SJ.YES && fine[SC.IS_COURSE - 1] === SJ.YES && writes.length === 1, JSON.stringify(r));
  const again = judgePseudoSweep_(fakeReg([yesAstro]));
  ok('۲.۶ و دوباره نمی‌نویسد', again.flagged === 0);
  ok('۲.۷ در کارِ شبانه صدا زده می‌شود', /nightHas_\(15000, 'نشانِ شبه‌علم'\)\) \{ try \{ judgePseudoSweep_\(\);/.test(fs.readFileSync('src/21_SelfUpdate.gs', 'utf8')));
}

/* ── ۳) گشتنِ موسیقی ── */
{
  const P = global.__PROPS;
  const today = nowStr_().slice(0, 10);
  P[PK.MUSIC_SEEK_LAST] = JSON.stringify({ at: '2026-01-01 02:41', ran: false, skip: 'وقتِ کارِ شبانه نماند (nightHas_)' });
  ok('۳.۱ دیشب نرفت ⇒ امشب بدهی است و اول می‌رود', musicNightDue_() === true);
  P[PK.MUSIC_SEEK_LAST] = JSON.stringify({ at: '2026-01-01 02:41', ran: false, skip: '30 قطعهٔ شنیده‌نشده (سقف 25)' });
  ok('۳.۲ ردِ عمدی (انبارِ شنیده‌نشده) بدهی نیست', musicNightDue_() === false);
  P[PK.MUSIC_SEEK_LAST] = JSON.stringify({ at: today + ' 02:41', ran: true });
  ok('۳.۳ امروز رفته ⇒ جای همیشگی دوباره نمی‌رود', musicNightToday_() === true && musicNightDue_() === false);
  /* اجرای ادامه که بلوک را «انجام‌شده» می‌بیند، شاهدِ واقعی را بازنویسی نمی‌کند — همان بازنویسیِ «وقت نماند». */
  const prev = JSON.stringify({ at: '2026-01-01 02:35', ran: true, looked: 7, added: 2 });
  P[PK.MUSIC_SEEK_LAST] = prev;
  const sv = { s: _nightSkipTo, m: _nightMore, k: _nightKiller };
  _nightSkipTo = 'بلوکِ بعدی'; _nightMore = ''; _nightKiller = null;
  const rr = musicNight_('گشتن و آوردنِ موسیقی');
  ok('۳.۴ اجرای ادامه: بلوکِ انجام‌شده ⇒ شاهد دست نمی‌خورد', rr === false && P[PK.MUSIC_SEEK_LAST] === prev, P[PK.MUSIC_SEEK_LAST]);
  _nightSkipTo = null; _nightMore = 'بلوکِ قبلی';
  musicNight_('گشتن و آوردنِ موسیقی');
  const w = JSON.parse(P[PK.MUSIC_SEEK_LAST]);
  ok('۳.۵ این اجرا وقتش تمام شد ⇒ «در اجرای ادامهٔ همین شب»، نه «وقت نماند»', w.ran === false && /ادامهٔ همین شب/.test(w.skip), w.skip);
  _nightSkipTo = sv.s; _nightMore = sv.m; _nightKiller = sv.k;
  delete P[PK.MUSIC_SEEK_LAST];
  const su = fs.readFileSync('src/21_SelfUpdate.gs', 'utf8');
  ok('۳.۶ بدهی پیش از بلوک‌های سنگین؛ زمانِ گشتن و آوردن از باقی‌ماندهٔ همین اجرا', su.indexOf("if (musicNightDue_()) musicNight_(") > su.indexOf("پایانِ کارهای ارزان؛ این‌ها فقط در نخستین اجرای هر شب") &&
     su.indexOf("if (musicNightDue_()) musicNight_(") < su.indexOf("nightHas_(25000, 'گویندهٔ تازه')") &&
     /musicFetch_\(\{ budget: Math\.max\(20000, Math\.min\(.*nightLeft_\(\) - 15000\)\) \}\)/.test(su) && /musicSeek_\(miss, false, \{ ms:/.test(su));
  ok('۳.۷ ایمیلِ ۱۰: شبی که گشتن نرفت در «مسئله‌ها»', /problems\.push\('🎵 گشتنِ موسیقیِ دیشب اجرا نشد: '/.test(fs.readFileSync('src/08_Health.gs', 'utf8')));
}

/* ── ۴) داوری روی کارِ شبانه قفل نمی‌گیرد ── */
{
  const svF = Utilities.formatDate;
  const at = (hh, mm) => { Utilities.formatDate = (d, tz, f) => (f === 'HH' ? hh : f === 'mm' ? mm : svF(d, tz, f)); return judgeTickQuiet_(); };
  ok('۴.۱ ۰۲:۴۵ و ۰۷:۰۰ ساکت؛ ۰۱:۳۰ و ۱۲:۰۰ کار', at('02', '45') === true && at('07', '00') === true && at('01', '30') === false && at('12', '00') === false);
  Utilities.formatDate = svF;
}

summary('۱۳.۲');
