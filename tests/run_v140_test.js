/* ══ آزمونِ ۱۴.۰ — افزودن به پلی‌لیست که از ۲۶ اکتبر هر بار «نشد» بود ══
 * ۱) متنِ خطا دیگر با بُرشِ ۶۰ نویسه‌ایِ همان پیشوند گم نمی‌شود
 * ۲) پلی‌لیستی که `position` نمی‌پذیرد ⇒ ویدئو به ته می‌رود و ترتیب را همگام‌سازی می‌چیند
 * ۳) ویدئوهای جامانده (۸۳ تا ۸۵) در دورِ ترتیب افزوده می‌شوند، یک بار
 */
require('./lib/root.js');
const fs = require('fs');
const L = require('./lib/probe_r4_lib.js');
const { ok, summary } = L;
const src = n => fs.readFileSync('src/' + fs.readdirSync('src').find(f => f.indexOf(String(n).slice(0, 3)) === 0), 'utf8');

const PREFIX = 'API call to youtube.playlistItems.insert failed with error: ';
function fakeYt(opts) {
  const lists = {}, calls = [];
  return {
    calls, lists,
    PlaylistItems: {
      insert(body) {
        calls.push(JSON.parse(JSON.stringify(body)));
        const sn = body.snippet;
        if (opts.refuseAll) throw new Error(PREFIX + 'Forbidden');
        if (sn.position != null && opts.noPosition) throw new Error(PREFIX + 'Precondition check failed. (manualSortRequired)');
        (lists[sn.playlistId] = lists[sn.playlistId] || []).push(sn.resourceId.videoId);
        return {};
      },
      update() { return {}; },
      list(part, q) {
        const ids = lists[q.playlistId] || [];
        return { items: ids.map((v, i) => ({ id: 'it-' + v, snippet: { position: i, resourceId: { videoId: v } } })) };
      }
    }
  };
}

console.log('\n=== ۱) متنِ خطا ===');
{
  ok('۱.۱ پیشوندِ ثابت کنار می‌رود و علت می‌ماند', ytErrWhy_(new Error(PREFIX + 'Precondition check failed.')) === 'Precondition check failed.');
  ok('۱.۲ خطای بی پیام هم چیزی می‌گوید', ytErrWhy_(new Error(PREFIX)) === 'بی پیام');
  ok('۱.۳ هیچ‌جای بخشِ ۲۷ دیگر خطای پلی‌لیست را ۶۰ نویسه نمی‌بُرد',
     !/PlaylistItems[\s\S]{0,400}String\(e2?\.message\)\.slice\(0, 60\)/.test(src('27_')) && /plPos = 'نشد: ' \+ ytErrWhy_\(eP\)/.test(src('27_')));
}

console.log('\n=== ۲) پلی‌لیستی که position نمی‌پذیرد ===');
{
  const keepS = global.ytSvc_, keepQ = global.ytQuotaTake_;
  global.ytQuotaTake_ = () => true;
  const y1 = fakeYt({ noPosition: true });
  global.ytSvc_ = () => y1;
  const r1 = ytPlPlace_('PL1', 'v85', 60, []);
  ok('۲.۱ بارِ اول با جایگاه رد ⇒ بارِ دوم بی جایگاه، ویدئو در پلی‌لیست', /^افزوده شد \(ته/.test(r1) && y1.lists.PL1.join() === 'v85' &&
     y1.calls.length === 2 && y1.calls[0].snippet.position === 60 && !('position' in y1.calls[1].snippet), r1);
  ok('۲.۲ علتِ ردِ جایگاه در نتیجه دیده می‌شود (نه پیشوند)', /manualSortRequired/.test(r1) && !/API call/.test(r1), r1);
  const y2 = fakeYt({ refuseAll: true });
  global.ytSvc_ = () => y2;
  const r2 = ytPlPlace_('PL1', 'v86', 3, []);
  ok('۲.۳ هر دو رد ⇒ «نشد» با هر دو علت، نه ادعای افزوده', /^نشد: Forbidden · بی جایگاه هم: Forbidden$/.test(r2), r2);
  const y3 = fakeYt({});
  global.ytSvc_ = () => y3;
  ok('۲.۴ پلی‌لیستِ عادی: یک فراخوان، با جایگاه', ytPlPlace_('PL2', 'v1', 0, []) === 'افزوده شد' && y3.calls.length === 1 && y3.calls[0].snippet.position === 0);
  global.ytSvc_ = keepS; global.ytQuotaTake_ = keepQ;
}

console.log('\n=== ۳) جامانده‌ها در دورِ ترتیب ===');
{
  const hub = getHub_();
  const sh = ensureTab_(hub, CFG.YT_TAB, YT_HEADERS);
  const row = (show, ep, vid, pl, pos) => { const r = new Array(YT_HEADERS.length).fill(''); r[YU.AT - 1] = '2026-10-28 2:58'; r[YU.SHOW - 1] = show;
    r[YU.EP - 1] = ep; r[YU.VID - 1] = vid; r[YU.PL - 1] = pl; r[YU.POS - 1] = pos; r[YU.PRIV - 1] = 'public'; sh.appendRow(r); };
  const T = 'Audi — درس‌نامه';
  row('درس‌نامه', 82, 'v82', T, 'افزوده شد');
  row('درس‌نامه', 83, 'v83', T, 'نشد: ' + PREFIX);
  row('درس‌نامه', 84, 'v84', T, 'نشد: ' + PREFIX);
  row('درس‌نامه', 85, 'v85', T, 'نشد: ' + PREFIX);
  row('درس‌نامه', 81, 'v81', T, 'نشد: x'); row('درس‌نامه', 81, 'v81', T, 'سرِ جایش');   // بعداً درست شد ⇒ جامانده نیست
  YT_PL_MISS_ = null;
  const miss = ytPlMissingOf_(hub);
  ok('۳.۱ فقط «نشد»هایی که بعدش درست نشدند، یکتا', JSON.stringify(miss[T]) === '["v83","v84","v85"]', JSON.stringify(miss));

  const keepS = global.ytSvc_, keepQ = global.ytQuotaTake_, keepM = global.ytPlMap_, keepI = global.ytPlItems_;
  global.ytQuotaTake_ = () => true;
  const y = fakeYt({ noPosition: true });
  y.lists.PLA = ['v82'];
  global.ytSvc_ = () => y;
  global.ytPlMap_ = () => ({ 'audi': { id: 'PLA', title: T } });
  global.ytPlItems_ = id => (y.lists[id] || []).map((v, i) => ({ id: 'it-' + v, videoId: v, position: i }));
  YT_PL_MISS_ = null;
  const o = ytPlOrderFix_(60000, hub);
  ok('۳.۲ سه ویدئوی جامانده به ته افزوده شدند و دورِ ترتیب ادامه داد', o.added === 3 && o.addFail === 0 && y.lists.PLA.join() === 'v82,v83,v84,v85' && o.checked === 1,
     JSON.stringify({ o: { added: o.added, addFail: o.addFail, why: o.why }, l: y.lists.PLA }));
  const n0 = y.calls.length;
  ytPlOrderFix_(60000, hub);
  ok('۳.۳ بارِ دوم چیزی دوباره افزوده نمی‌شود (در پلی‌لیست هست)', y.calls.length === n0 && y.lists.PLA.length === 4);
  ok('۳.۴ سقفِ هر دور از پیکربندی', Number(CFG.YT_PL_MISSING_MAX) === 10 && /out\.added < Math\.max\(1, Number\(CFG\.YT_PL_MISSING_MAX\)/.test(src('27_')));
  global.ytSvc_ = keepS; global.ytQuotaTake_ = keepQ; global.ytPlMap_ = keepM; global.ytPlItems_ = keepI;
}

summary('۱۴.۰');
