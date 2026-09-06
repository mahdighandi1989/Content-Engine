/**
 * 32_Persona.gs — «صداها»: یک گویندهٔ مهمان کنارِ بقیه، نه به‌جای بقیه
 *
 * ══ خواستهٔ صاحبِ برنامه، عیناً ══
 *
 * «وقتی متصل شد نمی‌خوام همش صدای رضوی باشه و می‌خوام مثل یه صدا کنار
 * صداهای دیگه باشه و دوره‌ای باشه و ثبت بشه و بشه حذف کرد … حسب وایب و
 * فضا و موضوع.»
 *
 * پس این بخش یک جدول است، نه یک کلید. هر ردیف یک «شخصیتِ خواندن» است:
 * فعال یا نه، برای کدام برنامه‌ها، هر چند قسمت یک بار، با چه دستوری، و
 * با چه حالت‌هایی. حذفش هم یعنی همان ردیف را خاموش کنی.
 *
 * ══ این بخش رنگِ صدا را عوض نمی‌کند — و آن را صریح می‌نویسیم ══
 *
 * چیزی که اینجا اعمال می‌شود **شیوهٔ خواندن** است: مکث، طولِ عبارت،
 * دامنه، کشش. رنگِ صدا (تیمبر) کارِ مدلِ تبدیل است و Apps Script نه
 * می‌تواند اجرایش کند و نه کتابخانه‌اش را دارد — دقیقاً همان دیواری که
 * بخشِ ۲۷ برای ویدئو به آن خورد. اگر روزی رنگِ صدا هم لازم شد، راهش
 * همان است: پرونده‌ای مثل `_YT-RENDER.json` که بیرون از موتور پردازش
 * شود. اینجا هیچ ادعایی دربارهٔ تیمبر نمی‌شود.
 *
 * ══ چرا متنِ دستور در خودِ شیت است ══
 *
 * چون تنها کسی که می‌تواند بگوید «این خوب درنیامد» صاحبِ برنامه است، و
 * دری که آدم نتواند بازش کند دروازه نیست. کارت‌های سبک را آزمایشگاهِ
 * صدا از روی صوتِ واقعی می‌سازد (هر جمله‌اش یک عدد پشتش دارد)، ولی
 * جایی که اجرا می‌شود همین سلول است و ویرایشش با اوست.
 *
 * ══ و چرا پیش‌فرضْ خاموش است ══
 *
 * «تقویمِ تولید» پیش‌فرضش روشن است چون خاموشی‌اش رفتار را عوض می‌کرد.
 * اینجا برعکس: روشن بودنِ یک ردیفِ تازه یعنی همان شبی که کد نصب شد،
 * خوانشِ هر قسمت عوض می‌شود بی آنکه کسی خواسته باشد. ردیف ساخته
 * می‌شود، خبرش داده می‌شود، و روشن کردنش با اوست.
 */

var PERSONA_HEADERS = ['کلید', 'نام', 'فعال', 'برنامه‌ها', 'هر چند قسمت',
                       'دستورِ سبک', 'حالت‌ها', 'آخرین تصمیم', 'آخرین استفاده'];

/** شمارهٔ ستون‌ها (۱-بنیان) — همان الگوی `CC` در بخشِ ۲۵. */
var PC = { KEY: 1, NAME: 2, ON: 3, SHOWS: 4, EVERY: 5, STYLE: 6, MODES: 7,
           LAST: 8, USED: 9 };

/**
 * ردیف‌های جدول، بی سرصفحه — با همان اصطلاحی که بقیهٔ موتور می‌خوانَد.
 *
 * `getDataRange` وسوسه‌انگیز است ولی ستون‌های ناخواسته را هم می‌آورد و
 * در آزمونِ محلی اصلاً وجود ندارد. `getLastRow` + بازهٔ صریح همان چیزی
 * است که `calBoardData_` می‌کند.
 */
function personaRows_(sh) {
  var s = sh || personaTab_();
  var last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2, 1, last - 1, PERSONA_HEADERS.length).getValues();
}


function personaTab_(hub) {
  return ensureTab_(hub || getHub_(), CFG.PERSONA_TAB || 'صداها',
                    PERSONA_HEADERS);
}

/** همان واژه‌های «بله/خیر» که تقویم می‌فهمد — دو فهرست یعنی دو رفتار. */
function personaOn_(v) {
  return calOn_(v);
}

/**
 * «برنامه‌ها» را بخوان: «همه» یا فهرستی با کاما.
 *
 * نامِ برنامه در شیت همان نامی است که آدم می‌نویسد، و آدم «درس‌نامه» را
 * گاهی «درس نامه» می‌نویسد. پس مقایسه روی نامِ فشرده (بی فاصله و بی
 * نیم‌فاصله) انجام می‌شود، وگرنه یک نیم‌فاصله ردیف را بی‌صدا از کار
 * می‌اندازد.
 */
function personaShowOk_(cell, show, key) {
  var t = String(cell == null ? '' : cell).trim();
  if (!t || t === 'همه' || t === '*') return true;
  var norm = function (s) {
    return String(s || '').replace(/[\s‌]+/g, '');
  };
  var want = [norm(show), norm(key)];
  var parts = t.split(/[،,]/);
  for (var i = 0; i < parts.length; i++) {
    var p = norm(parts[i]);
    if (!p) continue;
    if (want.indexOf(p) !== -1) return true;
  }
  return false;
}

/**
 * نوبتِ این صداست یا نه.
 *
 * «هر چند قسمت» یعنی هر nاُمین قسمت. خالی یا ۱ یعنی همیشه. شمارهٔ قسمت
 * مبناست، نه تاریخ و نه شمارنده‌ای که خودمان نگه داریم: شمارهٔ قسمت
 * چیزی است که هم در نام پوشه هست و هم در ردیفِ شیت، پس «چرا امروز این
 * صدا؟» جوابِ قابلِ وارسی دارد.
 */
function personaTurn_(every, epNum) {
  var n = Math.floor(Number(every) || 0);
  if (!(n > 1)) return true;
  var e = Math.floor(Number(epNum) || 0);
  if (!(e > 0)) return false;   // شمارهٔ نامعلوم، نوبتِ نامعلوم
  return (e % n) === 0;
}

/**
 * حالت‌های یک صدا، از سلولِ «حالت‌ها».
 *
 * هر خط:  نام | کلیدواژه‌ها با کاما | دستور
 * خطِ ناقص کنار گذاشته می‌شود، نه اینکه کلِ سلول را باطل کند — یک
 * غلطِ تایپی در حالتِ سوم نباید حالتِ اول را هم از بین ببرد.
 */
function personaModes_(cell) {
  var out = [];
  var lines = String(cell == null ? '' : cell).split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (!t) continue;
    var p = t.split('|');
    if (p.length < 3) continue;
    var name = p[0].trim();
    var cue = p.slice(2).join('|').trim();
    if (!name || !cue) continue;
    var keys = [];
    var ks = p[1].split(/[،,]/);
    for (var j = 0; j < ks.length; j++) {
      var k = ks[j].trim();
      if (k) keys.push(k);
    }
    out.push({ name: name, keys: keys, cue: cue });
  }
  return out;
}

/**
 * کدام حالت به این بخش می‌خورَد.
 *
 * ورودی `tone` همان چیزی است که نویسندهٔ قسمت برای هر بخش نوشته — یعنی
 * وایبِ همان بخش، که خواستهٔ صریحِ صاحبِ برنامه بود. اگر هیچ کلیدواژه‌ای
 * نخورد، **هیچ حالتی انتخاب نمی‌شود** و دستورِ پایه اجرا می‌شود؛ حالتِ
 * تصادفی بدتر از نبودِ حالت است.
 */
function personaModePick_(modes, tone) {
  var t = String(tone || '');
  if (!t || !modes || !modes.length) return null;
  var best = null, bestN = 0;
  for (var i = 0; i < modes.length; i++) {
    var n = 0;
    for (var j = 0; j < modes[i].keys.length; j++) {
      if (t.indexOf(modes[i].keys[j]) !== -1) n++;
    }
    if (n > bestN) { bestN = n; best = modes[i]; }
  }
  return best;
}

/**
 * صدای این قسمت — یا هیچ.
 *
 * ══ چرا باز شکست می‌خورد (fail open) ══
 * خواندنِ یک شیت نباید قسمت را بکشد. اگر جدول خوانده نشود، قسمت با
 * خوانشِ عادیِ خودش ساخته می‌شود و خطا در سیاهه می‌نشیند — همان قاعدهٔ
 * `calGate_`. یک قسمتِ عادی از یک قسمتِ نساخته بهتر است.
 *
 * ══ و چرا تصمیم در همان ردیف نوشته می‌شود ══
 * «آخرین تصمیم» تنها جوابِ صادق به «تنظیمِ من واقعاً اثر کرد؟» است.
 * نبودِ تصمیم برای امروز یعنی این کد اصلاً اجرا نشده، که خبرِ دیگری
 * است — و بدتر.
 */
function personaFor_(show, epNum) {
  if (CFG.PERSONA_ENABLED === false) return null;
  var sh, rows;
  try {
    sh = personaTab_();
    rows = personaRows_(sh);
  } catch (e) {
    logLine_('جدولِ صداها خوانده نشد؛ قسمت با خوانشِ عادی ادامه یافت: '
             + e.message);
    return null;
  }
  var picked = null, pickedRow = 0, notes = [];
  for (var i = 0; i < rows.length; i++) {
    var v = rows[i];
    var key = String(v[PC.KEY - 1] || '').trim();
    if (!key) continue;
    var name = String(v[PC.NAME - 1] || '').trim() || key;
    var rowNo = i + 2;                       // ردیفِ ۱ سرصفحه است
    if (!personaOn_(v[PC.ON - 1])) { notes.push([rowNo, 'خاموش']); continue; }
    if (!personaShowOk_(v[PC.SHOWS - 1], show, show)) {
      notes.push([rowNo, 'برای این برنامه نیست']); continue;
    }
    if (!personaTurn_(v[PC.EVERY - 1], epNum)) {
      notes.push([rowNo, 'نوبتش نیست (هر ' +
                  (Math.floor(Number(v[PC.EVERY - 1])) || 1) + ' قسمت)']);
      continue;
    }
    var cue = String(v[PC.STYLE - 1] || '').trim();
    if (!cue) { notes.push([rowNo, 'دستورِ سبک خالی است']); continue; }
    if (!picked) {
      picked = { key: key, name: name, cue: cue,
                 modes: personaModes_(v[PC.MODES - 1]) };
      pickedRow = rowNo;
    } else {
      notes.push([rowNo, 'صدای دیگری زودتر انتخاب شد']);
    }
  }
  // تصمیمِ هر ردیف در خودِ ردیف — چه انتخاب شده باشد چه نه.
  try {
    var stamp = (typeof calToday_ === 'function') ? calToday_().fa : '';
    for (var n = 0; n < notes.length; n++) {
      sh.getRange(notes[n][0], PC.LAST).setValue(stamp + ' — ' + notes[n][1]);
    }
    if (pickedRow) {
      sh.getRange(pickedRow, PC.LAST).setValue(stamp + ' — انتخاب شد');
      sh.getRange(pickedRow, PC.USED).setValue(
        stamp + ' — ' + String(show || '') + ' ' + String(epNum || ''));
    }
  } catch (eW) {}
  if (picked) {
    logLine_('صدای مهمانِ این قسمت: ' + picked.name +
             ' (' + picked.modes.length + ' حالت)');
  }
  return picked;
}

/**
 * دستورِ سبکِ این بخش — پایه، به‌علاوهٔ حالتی که به وایبِ بخش می‌خورَد.
 *
 * ══ چرا اول می‌آید و نه آخر ══
 * `ttsCue_` کلِ دستور را سرِ ۳۲۰ نویسه می‌بُرد. هرچه آخر باشد اول قربانی
 * می‌شود — و اگر شخصیتِ خواندن آخر بنشیند، در بلندترین بخش‌ها بی‌صدا
 * حذف می‌شود و کسی نمی‌فهمد چرا آن قسمت «رضوی‌جور» نبود.
 */
function personaStyle_(p, tone) {
  if (!p) return '';
  var m = personaModePick_(p.modes, tone);
  var s = String(p.cue || '').trim();
  if (m && m.cue) s += (s ? ' ' : '') + String(m.cue).trim();
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * ردیفِ یک صدای تازه — با شواهدِ اندازه‌گیری‌شده، و **خاموش**.
 *
 * عددهای درونِ متن از آزمایشگاهِ صدا می‌آیند: ۶۰ دقیقه از چهار ضبطِ
 * بهروز رضوی، ۱۰۹ بند، دو حالت که خودِ صاحبِ برنامه با گوش تأییدشان
 * کرد («۱ بریده‌بریده و پرتوقف، ۲ روان‌تر و کشیده‌تر»).
 */
function personaSeed_() {
  var sh = personaTab_();
  var rows = personaRows_(sh);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][PC.KEY - 1] || '').trim() === 'razavi') return false;
  }
  sh.appendRow([
    'razavi', 'بهروز رضوی', 'خیر', 'همه', 3,
    'آرام و روایی بخوان: حدودِ ۶۰ درصدِ زمان حرف بزن و بقیه را سکوت. هر ' +
    'عبارت حدودِ ۱٫۷ ثانیه و بعد مکث؛ در دلِ جمله ۰٫۳ ثانیه، میانِ دو ' +
    'جمله ۰٫۷، و پیش از جملهٔ کلیدی ۱٫۳ ثانیه سکوت. تأکید را با مکث و ' +
    'کشش بساز، نه با بلند کردنِ صدا.',
    'بریده‌بریده و باطمأنینه | سوگ, معنوی, مذهبی, تعلیق, هشدار | ' +
    'جمله‌ها را کوتاه بشکن و بایست؛ حدودِ ۲۳ مکث در دقیقه.\n' +
    'روان و کشیده | روایت, تاریخی, داستان, فرهنگی, مستند | ' +
    'بلندتر یک‌نفس برو و کمتر بایست (حدودِ ۱۵ مکث در دقیقه)؛ ' +
    'گاهی یک عبارت را بیشتر بکش.',
    '', '']);
  return true;
}

/**
 * تصمیمِ صدا **یک بار** گرفته می‌شود و در پروندهٔ قسمت می‌مانَد.
 *
 * ══ چرا، و این درس از کجا آمد ══
 * `renderAudioStep_` با هر از سرگیری `buildChunks_` را دوباره می‌سازد.
 * اگر انتخابِ صدا هر بار از شیت خوانده شود، ویرایشِ صاحبِ برنامه وسطِ
 * ساختِ یک قسمت، نیمهٔ دومِ همان قسمت را با دستورِ دیگری می‌خوانَد —
 * بی هیچ خطایی، فقط شنیدنی. `musicWrap_` دقیقاً همین را داشت.
 *
 * `null` هم یک تصمیم است و ذخیره می‌شود: «امروز صدای مهمانی نبود».
 */
function personaEnsure_(ep, show, epNum) {
  if (!ep) return null;
  if (typeof ep.__persona !== 'undefined') return ep.__persona;
  var p = null;
  try {
    p = personaFor_(show, epNum);
  } catch (e) {
    logLine_('انتخابِ صدای مهمان انجام نشد: ' + e.message);
    p = null;
  }
  ep.__persona = p || null;
  return ep.__persona;
}

/**
 * دستورِ شخصیت را جلوی دستورِ هر بخش بگذار.
 *
 * جلو، نه پشت: `ttsCue_` سرِ ۳۲۰ نویسه می‌بُرد و هرچه آخر باشد اول
 * قربانی می‌شود. و `hook` و `outro` هم می‌گیرندش — قابِ رادیوییِ قسمت
 * هم بخشی از خوانش است، نه استثنای آن.
 */
function personaApply_(segs, p) {
  if (!p || !segs || !segs.length) return 0;
  var n = 0;
  for (var i = 0; i < segs.length; i++) {
    var add = personaStyle_(p, segs[i].tone);
    if (!add) continue;
    segs[i].style = add + ' ' + String(segs[i].style || '');
    n++;
  }
  return n;
}
