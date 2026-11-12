/* ══ آزمونِ ۱۸.۱ — پایانِ درس‌نامه جزوه را به اجرای خودش می‌سپارد، و بدهیِ یوتیوب پیش از آن ══
   شاهدِ ۱۲ نوامبر: produceSpecialContinue ۰۸:۵۸ سرِ «مرحلهٔ deliver» کشته شد (درس‌نامهٔ ۱۰۳ ساعتِ ۰۹:۰۱ کامل شده بود)؛
   بدهیِ جزوهٔ همان درس ۰۹:۲۷ در handoutCatchUp پرداخت شد، و special:103 فقط با پیمایشِ پشتیبان به صفِ یوتیوب رسید. */
require('./lib/root.js');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const fs = require('fs');
const P = PropertiesService.getScriptProperties();

// ۱ — handoutDeferArm_ رفتاری
global.__TRIGGERS.length = 0;
P.setProperty(PK.HANDOUT_DUE, '[]');
ok('۱.۱ بی بدهی ⇒ تریگری ساخته نمی‌شود', handoutDeferArm_() === false && global.__TRIGGERS.length === 0);
P.setProperty(PK.HANDOUT_DUE, JSON.stringify([{ key: 'k', ep: 103 }]));
P.setProperty(PK.HANDOUT_CATCHUP_AT, String(Date.now() - 60000));   // تیکِ ساعتیِ دقیقه‌ای پیش — سدِ سه‌ساعته جلوی این را نمی‌گیرد
ok('۱.۲ با بدهی ⇒ مسلح شد، حتی یک دقیقه پس از تیکِ ساعتی', handoutDeferArm_() === true);
const n1 = global.__TRIGGERS.filter(t => t.getHandlerFunction() === 'handoutCatchUp').length;
ok('۱.۳ یک تریگرِ handoutCatchUp', n1 === 1, n1);
handoutDeferArm_();
const n2 = global.__TRIGGERS.filter(t => t.getHandlerFunction() === 'handoutCatchUp').length;
ok('۱.۴ بارِ دوم تکراری نمی‌سازد', n2 === 1, n2);
const ntWas = ScriptApp.newTrigger;
ScriptApp.newTrigger = () => { throw new Error('This script has too many triggers'); };
ok('۱.۵ سقفِ بیست تریگر ⇒ false (فراخوان درجا می‌سازد)', handoutDeferArm_() === false);
ScriptApp.newTrigger = ntWas;
CFG.HANDOUT_DEFER = false;
ok('۱.۶ کلیدِ خاموش ⇒ false', handoutDeferArm_() === false);
CFG.HANDOUT_DEFER = true;
global.__TRIGGERS.length = 0; P.setProperty(PK.HANDOUT_DUE, '[]');

// ۲ — سیم‌کشی در تحویلِ درس‌نامه
const sp = fs.readFileSync('src/14_Special.gs', 'utf8');
const iYt = sp.indexOf('ytDueAdd_(ENRICH_SHOW_SPECIAL'), iDue = sp.indexOf('handoutDueAdd_(meta.seriesKey, epNum)'),
      iArm = sp.indexOf('handoutDeferArm_()'), iRun = sp.indexOf('handoutRunDue_(1)'),
      iSt = sp.indexOf("statusAfterRun_(hub, 'درس‌نامه '");
ok('۲.۱ بدهیِ یوتیوب پیش از جزوه', iYt > 0 && iYt < iDue, iYt + '/' + iDue);
ok('۲.۲ اول بدهیِ جزوه، بعد سپردن، بعد (فقط در نبودِ تریگر) ساختِ درجا', iDue < iArm && iArm < iRun, [iDue, iArm, iRun].join('/'));
ok('۲.۳ ساختِ درجا فقط وقتی تریگر ساخته نشد', /if \(hdArmed\)[\s\S]{0,200}else if \(leftMs >/.test(sp));
ok('۲.۴ مرحله‌های تحویل نام دارند (کجا مُرد دیده شود)',
   sp.includes("runStage_('تحویل: جزوه')") && sp.includes("runStage_('تحویل: بدهیِ یوتیوب')") &&
   sp.includes("runStage_('تحویل: نوشتنِ وضعیت')") && sp.indexOf("runStage_('تحویل: نوشتنِ وضعیت')") < iSt);
ok('۲.۵ فراخوانِ رو به جلو (۱۴ ← ۲۶) در try', /try \{ hdArmed = handoutDeferArm_\(\); \} catch/.test(sp));

// ۳ — خطِ «از همه جا» عددِ رانر را می‌گوید، نه عددِ نقشه (variety:100: نقشه ۴، ساخته ۰)
const vmOnWas = global.vmOn_, offWas = global.ytShowOff_;
global.vmOn_ = () => true; global.ytShowOff_ = () => false;
P.setProperty(PK.VM_LAST, JSON.stringify({ key: 'variety:100', at: '2026-11-12 09:44', ok: true, scenes: 25, clips: 11, moments: 4, cover: true }));
ok('۳.۱ پیش از رسیدنِ ویدئو: «در نقشه»', /۴ لحظهٔ با صدای کلیپ در نقشه/.test(vmStatus_().line), vmStatus_().line);
ok('۳.۲ کلیدِ دیگر مهر را عوض نمی‌کند', vmRenderSeen_('variety:99', { media: { moments: { made: 3 } } }) === false);
ok('۳.۳ رکوردِ بی media ⇒ false', vmRenderSeen_('variety:100', { url: 'x' }) === false);
ok('۳.۴ رانر: ۰ ساخته، ۳ موسیقی', vmRenderSeen_('variety:100', { media: { moments: { asked: 4, placed: 4, made: 0, music: 3 } } }) === true);
const ln = vmStatus_().line;
ok('۳.۵ خط: «۰ از ۴ … ساخته شد» و علتِ موسیقی', /۰ از ۴ لحظهٔ با صدای کلیپ ساخته شد/.test(ln) && /۳ به‌خاطرِ موسیقی/.test(ln) && !/۴ لحظهٔ با صدای کلیپ،/.test(ln), ln);
const yt = fs.readFileSync('src/27_YouTube.gs', 'utf8');
ok('۳.۶ برداشتِ ویدئو عدد را می‌نشاند (در try)', /try \{ vmRenderSeen_\(pend\[i\]\.key, rec\); \} catch/.test(yt));
global.vmOn_ = vmOnWas; global.ytShowOff_ = offWas; P.deleteProperty(PK.VM_LAST);

summary('۱۸.۱');
