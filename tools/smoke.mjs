/**
 * اختبار دخان (smoke test) بدون متصفح:
 * يهيّئ محاكيًا مبسّطًا لـ DOM ويستدعي كل مسارات العرض والعمليات الأساسية
 * ليكشف أخطاء التنفيذ مبكرًا.
 *
 *   node tools/smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------ محاكي DOM ------------------------------ */
class Node {
  constructor(tag) {
    this.tagName = String(tag || '').toUpperCase();
    this.children = [];
    this.attrs = {};
    this.style = {};
    this.dataset = {};
    this.listeners = {};
    this.parentNode = null;
    this._text = '';
    this._html = '';
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text || this.children.map((c) => c.textContent).join(''); }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  set className(v) { this.attrs.class = v; }
  get className() { return this.attrs.class || ''; }
  get classList() {
    const self = this;
    return {
      add: (...cs) => { self.attrs.class = [...new Set([...(self.attrs.class || '').split(/\s+/), ...cs])].join(' ').trim(); },
      remove: (...cs) => { self.attrs.class = (self.attrs.class || '').split(/\s+/).filter((c) => c && !cs.includes(c)).join(' '); },
      toggle: (c, force) => {
        const has = (self.attrs.class || '').split(/\s+/).includes(c);
        const on = force === undefined ? !has : force;
        if (on) self.classList.add(c); else self.classList.remove(c);
        return on;
      },
      contains: (c) => (self.attrs.class || '').split(/\s+/).includes(c),
    };
  }
  append(...nodes) {
    for (const n of nodes.flat(4)) {
      if (n === null || n === undefined) continue;
      if (n instanceof Node) { n.parentNode = this; this.children.push(n); } else this._text += String(n);
    }
  }
  appendChild(n) { this.append(n); return n; }
  replaceChildren(...nodes) { this.children = []; this._text = ''; this.append(...nodes); }
  replaceWith(...nodes) { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); this.parentNode.children.splice(i, 1, ...nodes.filter((n) => n instanceof Node)); } }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  removeEventListener(t, fn) { this.listeners[t] = (this.listeners[t] || []).filter((f) => f !== fn); }
  dispatch(t, ev = {}) { for (const f of this.listeners[t] || []) f({ target: this, currentTarget: this, ...ev }); }
  dispatchEvent(ev) { this.dispatch(ev.type, ev); }
  click() { this.dispatch('click', {}); }
  focus() {}
  select() {}
  querySelector(sel) {
    const first = sel.split(',')[0].trim();
    const tag = first.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const walk = (node) => {
      for (const c of node.children) {
        if (tag && c.tagName.toLowerCase() === tag) return c;
        const r = walk(c);
        if (r) return r;
      }
      return null;
    };
    return walk(this);
  }
  querySelectorAll(sel) {
    const tag = sel.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const out = [];
    const walk = (node) => {
      for (const c of node.children) {
        if (!tag || c.tagName.toLowerCase() === tag) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  closest(sel) {
    const tag = sel.replace(/[^a-zA-Z]/g, '').toLowerCase();
    let n = this;
    while (n) { if (n.tagName.toLowerCase() === tag) return n; n = n.parentNode; }
    return null;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }; }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  get offsetWidth() { return 100; }
  get files() { return []; }
  get value() { return this._value ?? ''; }
  set value(v) { this._value = v; }
  get checked() { return !!this._checked; }
  set checked(v) { this._checked = v; }
}

const documentShim = {
  createElement: (t) => new Node(t),
  createElementNS: (ns, t) => new Node(t),
  createTextNode: (t) => { const n = new Node('#text'); n.textContent = t; return n; },
  createDocumentFragment: () => new Node('#fragment'),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  body: new Node('body'),
  documentElement: new Node('html'),
  visibilityState: 'visible',
};

const windowShim = {
  document: documentShim,
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  scrollY: 0,
  innerWidth: 420,
  innerHeight: 900,
  devicePixelRatio: 2,
  location: { hash: '', search: '', protocol: 'http:', reload: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
  requestAnimationFrame: (fn) => setTimeout(() => fn(performance.now()), 0),
  cancelAnimationFrame: () => {},
  setTimeout,
  clearTimeout,
  getSelection: () => ({ toString: () => '' }),
  AudioContext: class { constructor() { this.currentTime = 0; this.destination = {}; } createOscillator() { return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }), start() {}, stop() {} }; } createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }) }; } },
};

globalThis.Node = Node;
globalThis.document = documentShim;
globalThis.window = windowShim;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { vibrate: () => true, userAgent: 'node', clipboard: { writeText: async () => {} }, serviceWorker: null },
    configurable: true, writable: true,
  });
} catch (err) { void err; }
globalThis.location = windowShim.location;
globalThis.matchMedia = windowShim.matchMedia;
globalThis.requestAnimationFrame = windowShim.requestAnimationFrame;
globalThis.cancelAnimationFrame = () => {};
globalThis.localStorage = (() => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), clear: () => m.clear() };
})();
globalThis.Blob = class { constructor(p) { this.parts = p; } };
globalThis.URL.createObjectURL = () => 'blob:mock';
globalThis.URL.revokeObjectURL = () => {};
globalThis.Notification = class { static permission = 'granted'; constructor() {} };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ code: 200, data: { ayahs: [{ numberInSurah: 1, text: 'بِسْمِ اللَّهِ', page: 1, surah: { number: 1, name: 'سُورَةُ الفَاتِحَةِ' } }] } }) });

/* ------------------------------ التشغيل ------------------------------ */
const results = [];
const errors = [];
function step(name, fn) {
  try {
    const r = fn();
    results.push(`✓ ${name}`);
    return r;
  } catch (err) {
    errors.push(`✗ ${name}\n    ${err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n    ') : err}`);
    return null;
  }
}

const { store } = await import(path.join(ROOT, 'src/store.js'));
const { ADHKAR, CATEGORIES, DEFAULT_WIRD_IDS } = await import(path.join(ROOT, 'src/data/adhkar.js'));
const widgets = await import(path.join(ROOT, 'src/ui/widgets.js'));
const today = await import(path.join(ROOT, 'src/views/today.js'));
const library = await import(path.join(ROOT, 'src/views/library.js'));
const tasbeeh = await import(path.join(ROOT, 'src/views/tasbeeh.js'));
const quran = await import(path.join(ROOT, 'src/views/quran.js'));
const stats = await import(path.join(ROOT, 'src/views/stats.js'));
const settings = await import(path.join(ROOT, 'src/views/settings.js'));

const ctx = { go: () => {}, rerender: () => {}, refreshTabbar: () => {}, installPrompt: null, updateApp: () => {} };

step('تحميل المتجر وتهيئته', () => store.init());
step(`وجود ${ADHKAR.length} ذكرًا`, () => {
  if (ADHKAR.length < 30) throw new Error('عدد الأذكار قليل');
});
step('كل ذكر له حقل صحيح', () => {
  const ids = new Set();
  for (const d of ADHKAR) {
    if (!d.id || ids.has(d.id)) throw new Error(`معرّف مكرر أو ناقص: ${d.id}`);
    ids.add(d.id);
    if (!d.title || !d.text) throw new Error(`بيانات ناقصة: ${d.id}`);
    if (!CATEGORIES.some((c) => c.id === d.category)) throw new Error(`تصنيف مجهول: ${d.category}`);
    if (d.type === 'steps' && (!Array.isArray(d.steps) || !d.steps.length)) throw new Error(`جولة بلا خطوات: ${d.id}`);
    if (d.type === 'steps') for (const s of d.steps) if (!s.text || !s.target) throw new Error(`خطوة ناقصة في ${d.id}`);
    if (d.type !== 'steps' && (!d.periods || !Object.keys(d.periods).length)) throw new Error(`بلا أوقات: ${d.id}`);
  }
});
step('كل الأذكار الافتراضية موجودة', () => {
  for (const id of DEFAULT_WIRD_IDS) if (!store.getItem(id)) throw new Error(`مفقود: ${id}`);
});
step('عرض «اليوم»', () => today.renderToday(ctx));
step('عرض «المكتبة»', () => library.renderLibrary(ctx));
step('عرض «المسبحة»', () => tasbeeh.renderTasbeeh(ctx));
step('عرض «القرآن»', () => quran.renderQuran(ctx));
step('عرض «تقدّمي»', () => stats.renderStats(ctx));
step('عرض «الإعدادات»', () => settings.renderSettings(ctx));
step('كل الأذكار تُبنى كبطاقات', () => {
  for (const item of store.allItems()) widgets.dhikrCard(item, ctx);
});
step('بطاقة الصلاة على النبي عند الإتمام تبقى سليمة', () => {
  store.setCount('salah-nabi-am', 'morning', 10);
  const item = store.getItem('salah-nabi-am');
  const card = widgets.dhikrCard(item, ctx);
  if (!card.classList.contains('is-done')) throw new Error('لم تُعلَّم مكتملة');
  const find = (n, cls) => {
    if (!n || !n.attrs) return null;
    if ((n.attrs.class || '').split(/\s+/).includes(cls)) return n;
    for (const c of n.children || []) {
      const r = find(c, cls);
      if (r) return r;
    }
    return null;
  };
  const controls = find(card, 'dhikr__controls');
  if (!controls) throw new Error('غلاف العدّاد مفقود');
  if (!find(controls, 'set-count-btn')) throw new Error('زر التعيين خرج من البطاقة');
  if (!find(controls, 'tapper')?.classList.contains('is-done')) throw new Error('العدّاد ليس في حالة الإتمام');
  const head = find(card, 'dhikr__head');
  const badge = find(head, 'dhikr__done');
  const info = find(head, 'dhikr__info');
  if (!badge || !info) throw new Error('شارة تمّ أو زر التفاصيل مفقود عند الإتمام');
  if (badge.parentNode !== info.parentNode) throw new Error('الشارة ليست في رأس البطاقة');
  const foot = find(card, 'dhikr__foot');
  if (find(foot, 'set-count-btn')) throw new Error('زر التعيين ما زال يُلحق بالتذييل');
  // الضغط بعد الإتمام لا يتجاوز الهدف ولا يرمي خطأ
  const tapper = find(controls, 'tapper');
  tapper.dispatch('pointerup', { clientX: 10, clientY: 10 });
  if (store.count('salah-nabi-am', 'morning') !== 10) throw new Error('تجاوز العدّاد بعد الإتمام');
});
step('العدّاد يزيد ويصل للهدف', () => {
  const id = 'tasbih-100';
  store.setCount(id, 'day', 0);
  for (let i = 0; i < 100; i++) store.increment(id, 'day');
  const st = store.itemStatus(id);
  if (st.done !== 100 || !st.complete) throw new Error(`الحالة: ${JSON.stringify(st)}`);
});
step('لا يتجاوز العدّاد الهدف', () => {
  store.increment('tasbih-100', 'day', 5);
  if (store.count('tasbih-100', 'day') !== 100) throw new Error('تجاوز الهدف');
});
step('اليوم السابق مستقل عن اليوم', () => {
  const y = '2026-01-01';
  store.setCount('tahleel-100', 'day', 20, y);
  const before = store.count('tahleel-100', 'day');
  if (before === 20) throw new Error('اختلطت الأيام');
});
step('الفترة تتبع الساعة تلقائيًا ويثبّتها الوضع اليدوي', () => {
  const auto = store.autoPeriod;
  if (auto !== 'morning' && auto !== 'evening') throw new Error(`فترة غير معروفة: ${auto}`);
  store.setSetting('timeMode', 'auto');
  if (store.activePeriods[0] !== auto) throw new Error('الوضع التلقائي لا يتبع الساعة');
  store.setSetting('timeMode', 'evening');
  if (store.activePeriods[0] !== 'evening') throw new Error('التثبيت اليدوي على المساء لا يعمل');
  store.setSetting('timeMode', 'morning');
  if (store.activePeriods[0] !== 'morning') throw new Error('التثبيت اليدوي على الصباح لا يعمل');
  store.setSetting('timeMode', 'auto');
  if (store.activePeriods[0] !== store.autoPeriod) throw new Error('لم يعد للوضع التلقائي');
});
step('حساب الورد والسلسلة', () => {
  const st = store.wirdStatus();
  if (typeof st.pct !== 'number' || Number.isNaN(st.pct)) throw new Error('نسبة غير صالحة');
  store.computeStreak();
  store.touchStats();
});
step('حالة خطوات الجولة', () => {
  store.stepSet('morning-set', { i: 2, c: 3, rounds: 0 });
  const s = store.stepState('morning-set');
  if (s.i !== 2 || s.c !== 3) throw new Error('لم تُحفظ الخطوة');
});
step('إضافة ذكر خاص', () => {
  const id = store.addCustom({ title: 'ذكر تجريبي', text: 'سُبْحَانَ اللَّهِ', target: 7, benefit: 'تجربة' });
  if (!store.inWird(id)) throw new Error('لم يُضف للورد');
  store.removeCustom(id);
  if (store.getItem(id)) throw new Error('لم يُحذف');
});
step('تبديل الورد', () => {
  store.toggleWird('sleep-qini');
  if (!store.inWird('sleep-qini')) throw new Error('لم يُضف');
  store.toggleWird('sleep-qini');
  if (store.inWird('sleep-qini')) throw new Error('لم يُزل');
});
step('السبحة تعدّ وتصفّر', () => {
  store.tasbeehReset(true);
  for (let i = 0; i < 33; i++) store.tasbeehTick();
  if (store.state.tasbeeh.session.count !== 33) throw new Error('عدّ خاطئ');
  store.tasbeehReset(true);
  if (store.state.tasbeeh.session.count !== 0) throw new Error('لم تصفّر');
});
step('وِرد القرآن يُسجّل ويحفظ الموضع', () => {
  store.quranSet(5, 12);
  store.quranLogPages(2);
  if (store.state.quran.page !== 5 || store.state.quran.pos !== 12) throw new Error('لم يُحفظ الموضع');
  if (store.quranPagesIn() < 2) throw new Error('لم يُسجّل الصفحات');
});
step('التصدير والاستيراد', () => {
  const json = store.exportJSON();
  store.importJSON(json);
  if (!store.state.wird.length) throw new Error('فقد الورد بعد الاستيراد');
});
step('تصفير اليوم', () => {
  store.resetDay();
  if (store.count('tasbih-100', 'day') !== 0) throw new Error('لم يُصفّر');
});
step('لوحة الفوائد تُفتح', () => {
  const sheet = widgets.openInfoSheet(ADHKAR[0]);
  sheet?.close?.();
});
step('جولة الأذكار تُفتح', () => {
  const s = widgets.openTour(ADHKAR.find((d) => d.type === 'steps'), 'morning');
  s?.close?.();
});
step('الصفحة الرئيسية في القرآن', async () => quran.getPage(1));
step('حلقة التقدّم تُبنى', () => widgets.progressRing({ value: 0.5, label: '٥٠%' }));

/* ------------------------------ النتيجة ------------------------------ */
await new Promise((r) => setTimeout(r, 400));
console.log(results.join('\n'));
if (errors.length) {
  console.log('\n' + errors.join('\n'));
  console.log(`\nفشل ${errors.length} اختبارًا من ${results.length + errors.length}`);
  process.exit(1);
} else {
  console.log(`\nنجحت كل الاختبارات (${results.length})`);
}
