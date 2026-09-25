/* ==========================================================================
   وِردي — إدارة الحالة والحفظ التلقائي
   كل تقدّمك (الأعداد، مكانك في الجولات، صفحة القرآن، السبحة) يُحفظ تلقائيًا
   في الجهاز نفسه، ولا يُرسل إلى أي مكان.
   ========================================================================== */

import { ADHKAR, getDhikr, DEFAULT_WIRD_IDS } from './data/adhkar.js';

const KEY = 'wirdi.state.v1';
const VERSION = 1;

/* ------------------------- التخزين (مع بديل آمن) ------------------------- */
const memoryStore = new Map();
const storage = (() => {
  try {
    const t = '__wirdi_test__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return {
      getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
      setItem: (k, v) => memoryStore.set(k, v),
      removeItem: (k) => memoryStore.delete(k),
    };
  }
})();

/* ------------------------------ أدوات التاريخ ------------------------------ */
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function todayKey() {
  return dayKey(new Date());
}

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export function formatGregorian(d = new Date()) {
  return `${AR_DAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatHijri(d = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const out = fmt.format(d);
    return /هـ/.test(out) ? out : null;
  } catch {
    return null;
  }
}

export function formatTime(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ------------------------------ الحالة الأولية ------------------------------ */
function initialState() {
  return {
    version: VERSION,
    createdAt: Date.now(),
    settings: {
      theme: 'dark',            // dark | light | auto
      timeMode: 'auto',         // auto | morning | evening
      fontScale: 1,             // 0.9 – 1.35
      tashkeel: true,
      tapAnywhere: true,
      vibrate: true,
      sound: false,
      reminders: { enabled: false, morning: '05:30', evening: '17:30', lastKey: '' },
      quranPages: 2,
      quranStartPage: 1,
      reduceMotion: false,
    },
    wird: [...DEFAULT_WIRD_IDS],
    custom: [],
    progress: {},   // { 'YYYY-MM-DD': { dhikrId: { morning, evening, day } } }
    steps: {},      // { 'YYYY-MM-DD': { dhikrId: { i, c } } }
    quran: {
      page: 1, pos: 0, updatedAt: null,
      log: {},      // { 'YYYY-MM-DD': pagesRead }
    },
    tasbeeh: { total: 0, today: 0, day: todayKey(), session: { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 0 } },
    stats: { streak: 0, best: 0, lastCompleteDay: null, totalDhikr: 0, daysActive: 0 },
    ui: { tab: 'today' },
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base };
  for (const k of Object.keys(base)) {
    const sv = saved[k];
    if (sv === undefined || sv === null) continue;
    if (Array.isArray(base[k])) out[k] = Array.isArray(sv) ? sv : base[k];
    else if (typeof base[k] === 'object') out[k] = { ...base[k], ...sv };
    else out[k] = sv;
  }
  out.version = VERSION;
  return out;
}

/* ------------------------------ المتجر ------------------------------ */
export const store = {
  state: initialState(),
  listeners: new Set(),
  saveTimer: null,

  init() {
    let saved = null;
    try {
      saved = JSON.parse(storage.getItem(KEY) || 'null');
    } catch {
      saved = null;
    }
    this.state = merge(initialState(), saved);
    if (!this.state.settings.quranPages) this.state.settings.quranPages = 2;
    this.rollover();
    return this.state;
  },

  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        storage.setItem(KEY, JSON.stringify(this.state));
      } catch (err) {
        console.warn('تعذّر الحفظ', err);
      }
    }, 120);
  },

  saveNow() {
    clearTimeout(this.saveTimer);
    try {
      storage.setItem(KEY, JSON.stringify(this.state));
    } catch { /* تجاهل */ }
  },

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  emit() {
    this.save();
    for (const fn of this.listeners) fn(this.state);
  },

  /** إعادة ضبط «اليوم» للسبحة عند تغيّر اليوم */
  rollover() {
    const t = todayKey();
    if (this.state.tasbeeh.day !== t) {
      this.state.tasbeeh.day = t;
      this.state.tasbeeh.today = 0;
    }
    const last = this.state.stats.lastCompleteDay;
    if (last) {
      const today = todayKey();
      if (last !== today && addDays(last, 1) !== today) {
        this.state.stats.streak = 0;
      }
    }
  },

  /* ------------------------- الإعدادات ------------------------- */
  setSetting(path, value) {
    if (path.includes('.')) {
      const [a, b] = path.split('.');
      this.state.settings[a] = { ...this.state.settings[a], [b]: value };
    } else {
      this.state.settings[path] = value;
    }
    this.emit();
  },

  get activePeriods() {
    const mode = this.state.settings.timeMode;
    if (mode === 'morning') return ['morning'];
    if (mode === 'evening') return ['evening'];
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    const t = h * 60 + m;
    // الصباح: من الفجر (٥:٠٠) إلى ١٢:٠٠ — المساء: من ١٢:٠٠ إلى ٥:٠٠
    return t >= 300 && t < 720 ? ['morning'] : ['evening'];
  },

  get nextPeriod() {
    return this.activePeriods[0] === 'morning' ? 'evening' : 'morning';
  },

  /* ------------------------- الورد ------------------------- */
  inWird(id) {
    return this.state.wird.includes(id);
  },

  toggleWird(id) {
    const i = this.state.wird.indexOf(id);
    if (i >= 0) this.state.wird.splice(i, 1);
    else this.state.wird.push(id);
    this.emit();
  },

  setWird(ids) {
    this.state.wird = [...new Set(ids)];
    this.emit();
  },

  allItems() {
    return [...ADHKAR, ...this.state.custom];
  },

  getItem(id) {
    return getDhikr(id) || this.state.custom.find((c) => c.id === id) || null;
  },

  addCustom({ title, text, target, benefit }) {
    const id = `custom-${Date.now().toString(36)}`;
    this.state.custom.push({
      id, title, text, benefit: benefit || '',
      category: 'custom', custom: true,
      periods: { day: Number(target) || 1 },
      type: 'counter', accent: 'violet',
    });
    this.state.wird.push(id);
    this.emit();
    return id;
  },

  updateCustom(id, patch) {
    const item = this.state.custom.find((c) => c.id === id);
    if (!item) return;
    Object.assign(item, patch);
    if (patch.target) item.periods = { day: Number(patch.target) || 1 };
    this.emit();
  },

  removeCustom(id) {
    this.state.custom = this.state.custom.filter((c) => c.id !== id);
    this.state.wird = this.state.wird.filter((w) => w !== id);
    this.emit();
  },

  /* ------------------------- التقدّم ------------------------- */
  dayProgress(day = todayKey()) {
    if (!this.state.progress[day]) this.state.progress[day] = {};
    return this.state.progress[day];
  },

  count(id, period, day = todayKey()) {
    return this.state.progress[day]?.[id]?.[period] || 0;
  },

  setCount(id, period, value, day = todayKey()) {
    const dp = this.dayProgress(day);
    if (!dp[id]) dp[id] = {};
    const target = this.targetOf(id, period);
    const val = Math.max(0, Math.min(value, target || 9999));
    const before = dp[id][period] || 0;
    dp[id][period] = val;
    if (val > before) this.state.stats.totalDhikr += val - before;
    this.touchStats();
    this.emit();
    return dp[id][period];
  },

  increment(id, period, delta = 1, day = todayKey()) {
    const cur = this.count(id, period, day);
    const target = this.targetOf(id, period);
    const next = Math.min(cur + delta, target || 1e6);
    const dp = this.dayProgress(day);
    if (!dp[id]) dp[id] = {};
    dp[id][period] = Math.max(0, next);
    if (next > cur) this.state.stats.totalDhikr += next - cur;
    this.touchStats();
    this.emit();
    return dp[id][period];
  },

  decrement(id, period) {
    return this.increment(id, period, -1);
  },

  /** الهدف المطلوب لذكر معيّن في وقت معيّن */
  targetOf(id, period) {
    const item = this.getItem(id);
    if (!item || !item.periods) return 0;
    return item.periods[period] || 0;
  },

  /** ملخّص إتمام ذكر في يوم */
  itemStatus(id, day = todayKey()) {
    const item = this.getItem(id);
    if (!item) return { done: 0, target: 0, complete: false, pct: 0 };
    const periods = Object.keys(item.periods || {});
    let done = 0, target = 0;
    for (const p of periods) {
      const t = item.periods[p];
      const c = this.count(id, p, day);
      target += t;
      done += Math.min(c, t);
    }
    return { done, target, complete: target > 0 && done >= target, pct: target ? done / target : 0 };
  },

  /** حالة كل أذكار الورد في يوم */
  wirdStatus(day = todayKey()) {
    let done = 0, target = 0, completeCount = 0;
    for (const id of this.state.wird) {
      const st = this.itemStatus(id, day);
      done += st.done;
      target += st.target;
      if (st.complete) completeCount += 1;
    }
    return {
      done, target, completeCount,
      total: this.state.wird.length,
      pct: target ? done / target : 0,
      complete: this.state.wird.length > 0 && completeCount === this.state.wird.length,
    };
  },

  /** السلسلة: عدد الأيام المتتالية التي أُكمل فيها الورد */
  touchStats() {
    const day = todayKey();
    const st = this.wirdStatus(day);
    const stats = this.state.stats;
    const complete = st.complete && st.total > 0;
    if (complete && stats.lastCompleteDay !== day) {
      stats.streak = stats.lastCompleteDay === addDays(day, -1) ? stats.streak + 1 : 1;
      stats.best = Math.max(stats.best || 0, stats.streak);
      stats.lastCompleteDay = day;
    }
    if (!complete && stats.lastCompleteDay === day) {
      const yesterday = addDays(day, -1);
      stats.lastCompleteDay = null;
      stats.streak = this.isDayComplete(yesterday) ? Math.max(1, this.computeStreak(yesterday)) : 0;
    }
    const activeDays = Object.keys(this.state.progress).filter((d) =>
      Object.values(this.state.progress[d]).some((per) => Object.values(per).some((v) => v > 0))
    ).length;
    stats.daysActive = activeDays;
  },

  isDayComplete(day) {
    const ids = this.state.wird;
    if (!ids.length) return false;
    return ids.every((id) => this.itemStatus(id, day).complete);
  },

  computeStreak(fromDate = todayKey()) {
    let n = 0;
    let cursor = fromDate;
    while (this.isDayComplete(cursor) && n < 3650) {
      n += 1;
      cursor = addDays(cursor, -1);
    }
    return n;
  },

  resetItem(id, day = todayKey()) {
    const dp = this.state.progress[day];
    if (dp) delete dp[id];
    if (this.state.steps[day]) delete this.state.steps[day][id];
    this.touchStats();
    this.emit();
  },

  resetDay(day = todayKey()) {
    delete this.state.progress[day];
    delete this.state.steps[day];
    this.touchStats();
    this.emit();
  },

  /* ------------------------- الجولات (الخطوات) ------------------------- */
  stepState(id, day = todayKey()) {
    const s = this.state.steps[day]?.[id];
    return { i: s?.i || 0, c: s?.c || 0, rounds: s?.rounds || 0 };
  },

  stepSet(id, patch, day = todayKey()) {
    if (!this.state.steps[day]) this.state.steps[day] = {};
    const cur = this.state.steps[day][id] || { i: 0, c: 0, rounds: 0 };
    this.state.steps[day][id] = { ...cur, ...patch };
    this.touchStats();
    this.emit();
  },

  /* ------------------------- القرآن ------------------------- */
  quranSet(page, pos = 0) {
    const q = this.state.quran;
    q.page = Math.max(1, Math.min(604, Number(page) || 1));
    q.pos = Math.max(0, Number(pos) || 0);
    q.updatedAt = Date.now();
    this.emit();
  },

  quranLogPages(n = 1, day = todayKey()) {
    const q = this.state.quran;
    q.log[day] = (q.log[day] || 0) + n;
    this.emit();
  },

  quranPagesIn(day = todayKey()) {
    return this.state.quran.log[day] || 0;
  },

  /* ------------------------- السبحة ------------------------- */
  tasbeehTick(delta = 1) {
    const t = this.state.tasbeeh;
    if (t.day !== todayKey()) { t.day = todayKey(); t.today = 0; }
    t.today = Math.max(0, t.today + delta);
    t.total = Math.max(0, t.total + delta);
    t.session.count = Math.max(0, (t.session.count || 0) + delta);
    this.state.stats.totalDhikr = Math.max(0, this.state.stats.totalDhikr + delta);
    this.emit();
    return t.session.count;
  },

  tasbeehReset(keepTotal = true) {
    const t = this.state.tasbeeh;
    t.session.count = 0;
    if (!keepTotal) { t.today = 0; }
    this.emit();
  },

  setTasbeehText(text) {
    this.state.tasbeeh.session.text = text;
    this.state.tasbeeh.session.count = 0;
    this.emit();
  },

  /* ------------------------- التصدير والاستيراد ------------------------- */
  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw new Error('ملف غير صالح');
    this.state = merge(initialState(), data);
    this.touchStats();
    this.emit();
    this.saveNow();
  },

  wipe() {
    this.state = initialState();
    this.emit();
    this.saveNow();
  },
};

/* ------------------------------ مشتقات مساعدة ------------------------------ */
/** هل هذا الذكر مطلوب في الوقت الحالي؟ */
export function isRelevant(item, periods) {
  if (!item.periods) return false;
  return Object.keys(item.periods).some((p) => p === 'day' || periods.includes(p));
}

/** إجمالي الأعداد في ذكر */
export function totalTarget(item) {
  if (!item?.periods) return 0;
  return Object.values(item.periods).reduce((a, b) => a + b, 0);
}

export const isSteps = (item) => item?.type === 'steps';
export const isTracker = (item) => item?.type === 'tracker';
