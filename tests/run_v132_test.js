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

/* ── ۵) «خ» نرم در خودِ صدا (۱۳.۳) — نه وصلهٔ جمینای ── */
{
  const py5 = require('child_process').execFileSync('python3', ['-c', `
import sys, json, numpy as np
sys.path.insert(0, "tools"); import voicebridge as v
sr = 16000; rng = np.random.default_rng(1)
t = np.arange(sr * 6) / sr
voice = 0.3 * np.sin(2 * np.pi * 140 * t) + 0.15 * np.sin(2 * np.pi * 280 * t)
src = voice + 0.003 * rng.standard_normal(len(t))
out = voice.copy()
noise = np.fft.irfft(np.fft.rfft(rng.standard_normal(len(t))) * ((np.fft.rfftfreq(len(t), 1/sr) > 1500) & (np.fft.rfftfreq(len(t), 1/sr) < 5000)), len(t))
bursts = np.zeros(len(t))
for c in (1.0, 2.5, 4.0):
    a = int(c * sr); bursts[a:a + int(0.08 * sr)] = 1.0
out = out + 0.8 * noise * bursts
src2 = src * 0.0 + 0.3 * np.sin(2 * np.pi * 900 * t)        # مبدأیی آشکارا دیگر: اگر وارد شود، دیده می‌شود
v.writeMono("/tmp/h_out.wav", out.astype(np.float32), sr); v.writeMono("/tmp/h_src.wav", src.astype(np.float32), sr)
v.writeMono("/tmp/h_src2.wav", src2.astype(np.float32), sr)
r = v.fricSplice("/tmp/h_out.wav", "/tmp/h_src.wav", "/tmp/h_soft.wav", mode="soft")
z, _ = v.readMono("/tmp/h_soft.wav"); y, _ = v.readMono("/tmp/h_out.wav")
def band(x, a, b):
    seg = x[int(a * sr):int(b * sr)]; F = np.abs(np.fft.rfft(seg)) ** 2; f = np.fft.rfftfreq(len(seg), 1/sr)
    return float(10 * np.log10(F[(f > 1500) & (f < 5000)].sum() + 1e-12))
drop = band(y, 1.0, 1.08) - band(z, 1.0, 1.08)
same = float(np.max(np.abs(z[int(3.2*sr):int(3.6*sr)] - y[int(3.2*sr):int(3.6*sr)])))
F = np.abs(np.fft.rfft(z[int(1.0*sr):int(1.08*sr)])); f = np.fft.rfftfreq(int(0.08*sr), 1/sr)
r2 = v.fricSplice("/tmp/h_out.wav", "/tmp/h_src2.wav", "/tmp/h_soft2.wav", mode="soft")
z2, _ = v.readMono("/tmp/h_soft2.wav")
seg2 = z2[int(1.0*sr):int(1.08*sr)]; F2 = np.abs(np.fft.rfft(seg2)); f2 = np.fft.rfftfreq(len(seg2), 1/sr)
p900 = float(F2[(f2 > 850) & (f2 < 950)].max() / (F2.max() + 1e-12))
print(json.dumps({"ok": r.get("ok"), "mode": r.get("mode"), "frames": r.get("frames"), "drop": round(drop, 1), "same": same, "p900": round(p900, 4)}))
`]).toString();
  const H = JSON.parse(py5.trim().split('\n').pop());
  ok('۵.۱ حالتِ soft: سایشِ افزوده در همان قاب‌ها دست‌کم ۸ دسی‌بل پایین می‌آید', H.ok === true && H.mode === 'soft' && H.drop >= 8, JSON.stringify(H));
  ok('۵.۲ بیرون از قاب‌ها دست نمی‌خورد', H.same < 0.002, JSON.stringify(H));
  ok('۵.۳ هیچ چیزی از مبدأ وارد نمی‌شود (مبدأیی با ۹۰۰ هرتزِ آشکار در خروجی دیده نمی‌شود)', H.p900 < 0.05, JSON.stringify(H));
  const vb5 = fs.readFileSync('tools/voicebridge.py', 'utf8'), s365 = fs.readFileSync('src/36_VoiceBridge.gs', 'utf8');
  ok('۵.۴ رانر: «soft» بی VBR_HX اجرا می‌شود؛ «splice» هنوز پشتِ VBR_HX', /if it\.get\("hx"\) and \(HX_SPLICE_ON or hxSoft\):/.test(vb5) && /HX_SPLICE_ON = os\.environ\.get\("VBR_HX"\) == "1"/.test(vb5));
  ok('۵.۵ موتور «soft» را از بذر تا ردیف می‌برد', /row\.hx = \(o\.hx === 'soft'\) \? 'soft' : true/.test(s365) && /seedHx\[sk\] = se\.hx === 'soft' \? 'soft' : true/.test(s365) &&
     /hx: seedHx\[k\] === 'soft' \? 'soft' : !!seedHx\[k\]/.test(s365) && /tagO\.hx = pick\.hx === 'soft' \? 'soft' : true/.test(s365));
  const sd = (CFG.VOICE_SOUL_SEED || []).filter((x) => x.hx === 'soft' && !x.pitchAlt);
  ok('۵.۶ بذرِ تازه: گلدوز، درسِ ۷۴، Charon خام + «خ» نرم؛ برچسبِ یکتا', sd.length === 1 && sd[0].speaker === 'spk-1g0r95d' && String(sd[0].ep) === '74' &&
     sd[0].voice === 'Charon' && sd[0].pitchFix === '0' && /نرم‌شده/.test(sd[0].tag) &&
     (CFG.VOICE_SOUL_SEED || []).filter((x) => x.tag === sd[0].tag).length === 1);
}

/* ── ۶) کارنامهٔ قابلیت‌ها: شاهدِ «وضعِ لحظه» دیگر «نامعلوم» نیست (۱۳.۳) ── */
{
  const st = {};
  CFG.CAPABILITIES.forEach((c) => { st[c.at] = { at: '2026-10-26 10:00' }; });
  st.calendar = { enabled: true, shows: [{ key: 'variety', on: true }] };
  st.seriesOrder = { ok: false, line: 'ترتیبِ قسمت‌ها: ۳ مشکوک' };
  st.triggerNames = { count: 14, names: ['a'] };
  const c = capStatus_(st);
  const row = (k) => c.rows.find((r) => r.key === k);
  ok('۶.۱ تقویم و زمان‌بندی‌ها بی تاریخ ⇒ «سالم (وضعِ امروز)»، نه «نامعلوم»', row('calendar').verdict === 'سالم (وضعِ امروز)' && row('triggers').verdict === 'سالم (وضعِ امروز)', JSON.stringify(row('calendar')));
  ok('۶.۲ شاهدی که خودش ok=false می‌گوید ⇒ «ایراد» با خطِ خودش، و در خطِ کارنامه نام برده می‌شود',
     row('series-order').verdict === 'ایراد (وضعِ امروز)' && /۳ مشکوک/.test(row('series-order').why) && /با ایراد در وضعِ امروز: series-order/.test(c.line), c.line);
  ok('۶.۳ «نامعلوم» برای این نُه دیگر نمی‌آید', c.unknown.length === 0, JSON.stringify(c.unknown));
  st.recap = { due: 1 };    // بی snap: همان رفتارِ پیشین
  ok('۶.۴ قابلیتی که snap ندارد، بی تاریخ هنوز «نامعلوم» است (ابطال‌پذیر)', capStatus_(st).rows.find((r) => r.key === 'recap').verdict === 'نامعلوم');
}

/* ── ۷) چرا special:81 هنوز unlisted بود: سه ویدئوی خصوصیِ او همیشه سه نوبتِ شبانه را می‌گرفتند (۱۳.۳) ── */
{
  const sv = { pub: global.ytPublished_, redo: global.ytRedoOne_, on: global.ytOn_, hub: global.getHub_, appr: global.ytApprovedSafe_ };
  global.ytOn_ = () => true; global.getHub_ = () => ({}); global.ytApprovedSafe_ = () => ({});
  global.ytPublished_ = () => ({
    'variety:74': { videoId: 'P74', privacy: 'private', at: '2026-10-01 05:00' },
    'variety:78': { videoId: 'P78', privacy: 'private', at: '2026-10-02 05:00' },
    'variety:79': { videoId: 'P79', privacy: 'private', at: '2026-10-03 05:00' },
    'special:81': { videoId: 'S81', privacy: 'unlisted', at: '2026-10-24 05:00' } });
  const seen = [];
  global.ytRedoOne_ = (show, ep) => { seen.push(show + ':' + ep); return { ok: false, changed: [], why: 'ویدئو خصوصی است — به خواستِ شما دست نخورد' }; };
  global.__PROPS[PK.YT_OWNER_PRIVATE] = JSON.stringify(['P74', 'P78', 'P79']);
  const svMax = CFG.YT_REDO_MAX_PER_NIGHT; CFG.YT_REDO_MAX_PER_NIGHT = 3;
  ytRedoStuckNightly_(120000);
  ok('۷.۱ درسِ گیرکرده پیش از ویدئوهای خصوصیِ صاحبِ کانال نوبت می‌گیرد', seen[0] === 'special:81' && seen.length === 3, seen.join(' | '));
  global.__PROPS[PK.YT_OWNER_PRIVATE] = '[]'; seen.length = 0;
  ytRedoStuckNightly_(120000);
  ok('۷.۲ بی دفترِ خصوصی همان ترتیبِ قدیمی‌ترین‌اول (ابطال‌پذیر: نشان می‌دهد چرا ۸۱ نوبت نمی‌گرفت)', seen.indexOf('special:81') === -1, seen.join(' | '));
  CFG.YT_REDO_MAX_PER_NIGHT = svMax; delete global.__PROPS[PK.YT_OWNER_PRIVATE];
  global.ytPublished_ = sv.pub; global.ytRedoOne_ = sv.redo; global.ytOn_ = sv.on; global.getHub_ = sv.hub; global.ytApprovedSafe_ = sv.appr;
}

/* ── ۸) دفترِ درخواست‌ها: سهمِ امروزِ ناظر، نه صد و چهل ردیف (۱۳.۳) ── */
{
  const sv = { d: global.reqDefs_, l: global.reqLoad_ };
  const list = [];
  for (let i = 1; i <= 20; i++) list.push({ id: 'R-20261001-' + String(i).padStart(2, '0'), ask: 'خواستهٔ ' + i, ver: '9.0', at: '2026-10-01' });
  list.push({ id: 'R-20261002-01', ask: 'کارِ او', ver: '9.0', at: '2026-10-02', owner: true });
  global.reqDefs_ = () => ({ ok: true, list });
  global.reqLoad_ = () => ({ 'R-20261001-15': { v: 'نادرست', ev: 'دیده شد', okDays: 0, at: '2026-10-20 10:00' },
                             'R-20261001-03': { v: 'درست', ev: 'x', okDays: 1, at: '2026-10-20 10:00' },
                             'R-20261001-04': { v: 'درست', ev: 'x', okDays: 2, at: '2026-10-20 10:00' } });
  const r = reqStatus_();
  ok('۸.۱ سهمِ امروز: حداکثر REQ_DAY_MAX، اول «نادرست»، بعد «روزِ دوم مانده»، بعد سنجیده‌نشده‌ها؛ نه «انجام‌شده» و نه «کارِ شما»',
     r.today.length === CFG.REQ_DAY_MAX && r.today[0] === 'R-20261001-15' && r.today[1] === 'R-20261001-03' &&
     r.today.indexOf('R-20261001-04') === -1 && r.today.indexOf('R-20261002-01') === -1, JSON.stringify(r.today));
  ok('۸.۲ در خطِ ایمیل و در _STATUS (کش)', /سهمِ سنجشِ امروزِ ناظر: R-20261001-15/.test(r.line) &&
     reqStatusSave_(r) && (reqStatusCached_() || {}).today && reqStatusCached_().today[0] === 'R-20261001-15');
  global.reqDefs_ = sv.d; global.reqLoad_ = sv.l;
  const pr = fs.readFileSync('docs/prompts/_PROMPT-monitor-v114.md', 'utf8');
  ok('۸.۳ پرامپتِ ناظرِ ۱۱۴ برای موتورِ ۱۳.۳: سهمِ امروز، و یادداشتِ ۱۰۹ به تاریخچه رفت (نه گم)',
     /برای نسخهٔ موتور: 13\.3/.test(pr) && /برای \*\*هر\*\* ردیفِ `requests\.today`/.test(pr) && !/تغییرِ نسخهٔ ۱۰۹/.test(pr.split('── ترتیبِ ریلز')[0]) &&
     /تغییرِ نسخهٔ ۱۰۹/.test(fs.readFileSync('docs/prompts/monitor_history.md', 'utf8')));
}

summary('۱۳.۳');
