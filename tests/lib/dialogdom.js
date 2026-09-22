/* یک DOM و یک `google.script.run` جعلی — فقط آن‌قدر که بشود دکمه را
 * **واقعاً فشار داد**.
 *
 * ══ چرا لازم شد (۷٫۴۴) ══
 * ۲۲ سپتامبر صاحبِ برنامه گفت پنجرهٔ جست‌وجو هیچ نمی‌کند. درست بود، و
 * تختهٔ گویندگان هم از روزِ ساختش همین‌طور بود. نگهبانِ موجود
 * (`run_wiring_test.js` ۵٫۲) می‌پرسید «تابعِ سرور وجود دارد؟» — یعنی کد
 * را **می‌خواند**. و صاحبِ برنامه سرِ ساختِ همان‌ها تأکید کرده بود که
 * «بازبین‌ها کد را فقط نبینند، اجرا کنند».
 *
 * پس اینجا اجرا می‌شود: اسکریپتِ پنجره در یک بستهٔ `vm` دویده می‌شود، و
 * بعد هر `onclick` در همان بسته اجرا می‌شود. آنچه به `google.script.run`
 * می‌رسد ضبط می‌شود.
 *
 * عمداً کوچک است. یک DOM کامل یعنی یک وابستگیِ تازه و یک لایهٔ تازه برای
 * خراب شدن؛ چیزی که این سنجه لازم دارد فقط همین چند متد است.
 */
const vm = require('vm');

function el(attrs) {
  attrs = attrs || {};
  const node = {
    id: attrs.id || '', className: attrs.class || '', dataset: attrs.dataset || {},
    tag: attrs.tag || 'div', value: attrs.value || '', checked: !!attrs.checked,
    innerHTML: '', textContent: '', disabled: false, style: {}, children: [],
    getAttribute(k) { return attrs[k] == null ? null : String(attrs[k]); },
    setAttribute(k, v) { attrs[k] = v; },
    appendChild(c) { this.children.push(c); },
    focus() {}, blur() {}, click() {},
    addEventListener() {}, removeEventListener() {},
    /* در صفحهٔ واقعی، فرزندان یک جعبه همان‌هایی‌اند که در HTML داخلش
       نوشته شده‌اند. اینجا به تقریبِ «هر گرهی با آن کلاس در صفحه» بسنده
       می‌شود — برای این سنجه کافی است، چون آنچه می‌خواهد بگیرد این است
       که کلاس/شناسه **اصلاً در صفحه وجود دارد یا نه**. */
    querySelector(sel) { return (node.__find(sel)[0]) || null; },
    querySelectorAll(sel) { return node.__find(sel); },
    __find() { return []; }
  };
  return node;
}

/**
 * گره‌های صفحه را از خودِ HTML بردار.
 *
 * ══ چرا نه یک DOM جعلیِ همه‌چیزپذیر ══
 * اگر `getElementById` برای هر نامی یک گره بسازد، دکمه‌ای که شناسهٔ
 * اشتباه صدا می‌زند هم سبز می‌شود — یعنی ابزار دقیقاً همان دسته باگی را
 * نمی‌بیند که برای دیدنش ساخته شده. پس شناسه‌ها و کلاس‌ها از خودِ صفحه
 * خوانده می‌شوند و شناسهٔ ناموجود `null` می‌گیرد، همان‌طور که مرورگر
 * می‌دهد.
 */
function parseNodes(html) {
  const byId = {}, byClass = {}, all = [];
  const tagRe = /<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)\/?>/g;
  let m;
  while ((m = tagRe.exec(String(html)))) {
    const raw = m[2] || '';
    const attrs = { tag: m[1].toLowerCase(), dataset: {} };
    const aRe = /([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"/g;
    let a;
    while ((a = aRe.exec(raw))) {
      const k = a[1], v = a[2];
      if (k.indexOf('data-') === 0) {
        const camel = k.slice(5).replace(/-([a-z])/g, (x, c) => c.toUpperCase());
        attrs.dataset[camel] = v;
      } else attrs[k] = v;
    }
    if (attrs.type === 'checkbox') attrs.checked = raw.indexOf('checked') !== -1;
    const node = el(attrs);
    all.push(node);
    if (attrs.id) byId[attrs.id] = node;
    String(attrs.class || '').split(/\s+/).forEach((c) => {
      if (!c) return;
      (byClass[c] = byClass[c] || []).push(node);
    });
  }
  all.forEach((n) => {
    n.__find = function (sel) {
      const s = String(sel || '').trim();
      if (s.charAt(0) === '.') return (byClass[s.slice(1)] || []).slice();
      if (s.charAt(0) === '#') return byId[s.slice(1)] ? [byId[s.slice(1)]] : [];
      return all.filter((x) => x.tag === s.toLowerCase());
    };
  });
  return { byId, byClass, all };
}

function makeCtx(opts) {
  opts = opts || {};
  const calls = [];
  const errors = [];
  const dom = parseNodes(opts.html || '');
  const extra = {};

  const get = (id) => {
    if (dom.byId[id]) return dom.byId[id];
    if (extra[id]) return extra[id];
    return null;                 // همان چیزی که مرورگر می‌دهد
  };
  Object.keys(opts.values || {}).forEach((k) => {
    const n = get(k); if (n) n.value = opts.values[k];
  });
  Object.keys(opts.checked || {}).forEach((k) => {
    const n = get(k); if (n) n.checked = !!opts.checked[k];
  });

  const document = {
    getElementById: get,
    getElementsByClassName(c) { return (dom.byClass[c] || []).slice(); },
    getElementsByTagName(t) { return dom.all.filter((x) => x.tag === String(t).toLowerCase()); },
    querySelector(sel) { return (dom.all[0] ? dom.all[0].__find(sel)[0] : null) || null; },
    querySelectorAll(sel) { return dom.all[0] ? dom.all[0].__find(sel) : []; },
    createElement(t) { return el({ tag: t }); },
    body: el({ tag: 'body' }),
    addEventListener() {}
  };

  const runner = {};
  const handlers = ['withSuccessHandler', 'withFailureHandler', 'withUserObject'];
  const scriptRun = new Proxy(runner, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (handlers.indexOf(prop) !== -1) return function () { return scriptRun; };
      return function () {
        calls.push({ fn: prop, args: Array.prototype.slice.call(arguments) });
        return scriptRun;
      };
    }
  });

  const ctx = {
    document: document,
    google: { script: { run: scriptRun, host: { close() {}, setHeight() {} } } },
    console: { log() {}, warn() {}, error() {} },
    alert() {}, confirm() { return true; }, prompt() { return ''; },
    scrollTo() {}, scrollBy() {},
    setTimeout(f) { try { f(); } catch (e) { errors.push(e); } return 0; },
    clearTimeout() {}, encodeURIComponent, decodeURIComponent,
    JSON, Math, Date, String, Number, Array, Object, RegExp, isNaN, parseInt, parseFloat
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  return { ctx, calls, dom, errors, get };
}

/** بلوک‌های <script> یک صفحه. */
function scripts(html) {
  return (String(html).match(/<script>[\s\S]*?<\/script>/g) || [])
    .map((b) => b.replace(/^<script>/, '').replace(/<\/script>$/, ''));
}

/** هر onclick، همان‌طور که مرورگر می‌بیندش (گریزهای HTML باز شده). */
function onclicks(html) {
  const out = [];
  const re = /onclick="([^"]*)"/g;
  let m;
  while ((m = re.exec(String(html)))) {
    out.push(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                 .replace(/\\'/g, "'"));
  }
  return out;
}

module.exports = { makeCtx, scripts, onclicks, vm };
