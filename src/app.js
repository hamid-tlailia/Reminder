/* ==========================================================================
   وِردي — نقطة البداية: الهيكل، التنقّل، الثيم، التنبيهات، التثبيت
   ========================================================================== */

import { store, todayKey, formatTime, formatHijri } from './store.js';
import { h, icon, $, toast } from './ui/dom.js';
import { renderToday } from './views/today.js';
import { renderLibrary } from './views/library.js';
import { renderTasbeeh } from './views/tasbeeh.js';
import { renderQuran } from './views/quran.js';
import { renderStats } from './views/stats.js';
import { renderSettings, applyPrefs, sendNotification, askNotifyPermission } from './views/settings.js';
import { PERIOD_LABEL } from './ui/widgets.js';

const TABS = [
  { id: 'today', name: 'اليوم', icon: 'sparkles' },
  { id: 'library', name: 'المكتبة', icon: 'grid' },
  { id: 'tasbeeh', name: 'المسبحة', icon: 'beads', fab: true },
  { id: 'quran', name: 'القرآن', icon: 'book' },
  { id: 'stats', name: 'تقدّمي', icon: 'chart' },
];

const app = {
  installPrompt: null,
  swReg: null,
};

/* ------------------------------ الثيم ------------------------------ */
function applyTheme() {
  const mode = store.state.settings.theme;
  let theme = mode;
  if (mode === 'auto') {
    const hh = new Date().getHours();
    theme = hh >= 6 && hh < 18 ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f6f2e8' : '#06110C');
  applyPrefs();
  if (store.state.settings.reduceMotion) document.documentElement.dataset.reduce = '1';
}

/* ------------------------------ التنقّل ------------------------------ */
function currentTab() {
  const hash = location.hash.replace('#', '');
  if (TABS.some((t) => t.id === hash)) return hash;
  if (hash === 'settings') return 'settings';
  const params = new URLSearchParams(location.search);
  const qtab = params.get('tab');
  if (TABS.some((t) => t.id === qtab)) return qtab;
  return store.state.ui.tab && TABS.some((t) => t.id === store.state.ui.tab) ? store.state.ui.tab : 'today';
}

function go(tab) {
  if (location.hash === `#${tab}`) { render(); return; }
  location.hash = tab;
}

const ctx = {
  go,
  installPrompt: null,
  rerender: () => render(),
  refreshTabbar: () => paintNav(),
  updateApp: () => {
    app.swReg?.active?.postMessage('skip-waiting');
    navigator.serviceWorker?.getRegistration().then((r) => {
      r?.waiting?.postMessage('skip-waiting');
      setTimeout(() => location.reload(), 500);
    });
  },
};

/* ------------------------------ الهيكل ------------------------------ */
function buildShell() {
  const defs = h('div', { html: `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#21c79c"/><stop offset="1" stop-color="#35e0b4"/>
      </linearGradient>
      <linearGradient id="ringGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e7c77e"/><stop offset="1" stop-color="#fff0c9"/>
      </linearGradient>
    </defs></svg>` });

  const subtitle = h('p', { class: 'appbar__sub' });
  const appbar = h('header', { class: 'appbar' },
    h('div', { class: 'appbar__brand' },
      h('img', { class: 'appbar__logo', src: 'assets/icons/icon-192.png', alt: '', width: 38, height: 38 }),
      h('div', { class: 'appbar__titles' },
        h('h1', { class: 'appbar__title', text: 'وِردي' }),
        subtitle,
      ),
    ),
    h('div', { class: 'appbar__actions' },
      h('button', {
        class: 'icon-btn', 'aria-label': 'تبديل المظهر', title: 'المظهر',
        onclick: () => {
          const order = ['dark', 'light', 'auto'];
          const cur = store.state.settings.theme;
          const next = order[(order.indexOf(cur) + 1) % order.length];
          store.setSetting('theme', next);
          applyTheme();
          toast(next === 'dark' ? 'الوضع الداكن' : next === 'light' ? 'الوضع الفاتح' : 'حسب الوقت', { icon: next === 'light' ? 'sun' : 'moon' });
        },
      }, icon('sun', 20)),
      h('button', {
        class: 'icon-btn', 'aria-label': 'الإعدادات',
        onclick: () => go('settings'),
      }, icon('gear', 20)),
    ),
  );

  const main = h('main', { class: 'main', id: 'main' });
  const nav = h('nav', { class: 'nav', 'aria-label': 'التنقّل الرئيسي' }, h('div', { class: 'nav__inner', id: 'navInner' }));
  const el = h('div', { class: 'app' }, defs, appbar, main, nav);

  const onScroll = () => appbar.classList.toggle('is-stuck', window.scrollY > 6);
  window.addEventListener('scroll', onScroll, { passive: true });

  return { el, main, subtitle };
}

let shell = null;

function paintNav() {
  const inner = $('#navInner');
  if (!inner) return;
  const tab = currentTab();
  const st = store.wirdStatus();
  inner.replaceChildren(...TABS.map((t) => h('button', {
    class: `nav__item${t.fab ? ' nav__item--fab' : ''}`,
    'aria-current': t.id === tab ? 'page' : null,
    onclick: () => go(t.id),
  },
    t.fab
      ? h('span', { class: 'fab' }, icon(t.icon, 26))
      : icon(t.icon, 22),
    h('span', { text: t.name }),
  )));

  const subtitle = shell?.subtitle;
  if (subtitle) {
    const period = store.activePeriods[0];
    subtitle.textContent = `${PERIOD_LABEL[period]} • أُنجز ${st.completeCount}/${st.total} (${Math.round(st.pct * 100)}%)`;
  }
  void tab;
}

/* ------------------------------ العرض ------------------------------ */
function render() {
  const tab = currentTab();
  store.state.ui.tab = tab;
  store.save();

  const view = (() => {
    switch (tab) {
      case 'library': return renderLibrary(ctx);
      case 'tasbeeh': return renderTasbeeh(ctx);
      case 'quran': return renderQuran(ctx);
      case 'stats': return renderStats(ctx);
      case 'settings': return renderSettings(ctx);
      default: return renderToday(ctx);
    }
  })();

  shell.main.replaceChildren(view);
  paintNav();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  applyTheme();
}

/* ------------------------------ التنبيهات ------------------------------ */
function checkReminders() {
  const r = store.state.settings.reminders;
  const period = store.activePeriods[0];
  const now = new Date();
  const hm = formatTime(now);
  const [nh, nm] = hm.split(':').map(Number);
  const mins = nh * 60 + nm;
  const label = PERIOD_LABEL[period];
  const [th, tm] = (period === 'morning' ? r.morning : r.evening).split(':').map(Number);
  const target = th * 60 + tm;
  const key = `${todayKey()}:${period}`;

  if (!r || !r.enabled) return;
  const st = store.wirdStatus();
  if (st.complete) return;
  if (r.lastKey === key) return;
  if (mins < target || mins > target + 45) return;

  const sent = sendNotification('وِردي — تذكير', `حان وقت أذكار ${label}. أُنجز ${st.completeCount}/${st.total} من وِردك 🌿`);
  if (sent || Notification.permission === 'denied') {
    store.setSetting('reminders', { ...store.state.settings.reminders, lastKey: key });
    toast(`تذكير: أذكار ${label}`, { icon: 'bell', ms: 4000 });
  }
}

function watchMidnight() {
  let last = todayKey();
  setInterval(() => {
    const t = todayKey();
    if (t !== last) {
      last = t;
      store.rollover();
      render();
      toast('يوم جديد، وِرد جديد 🌅', { icon: 'sunrise' });
    }
    checkReminders();
  }, 30000);
}

/* ------------------------------ التهيئة ------------------------------ */
function boot() {
  store.init();
  applyTheme();
  shell = buildShell();
  const host = $('#app');
  host.replaceChildren(shell.el);
  host.hidden = false;
  ctx.installPrompt = null;

  window.addEventListener('hashchange', render);
  render();
  watchMidnight();

  // شاشة البدء
  requestAnimationFrame(() => {
    document.body.classList.remove('boot');
    const splash = $('#splash');
    if (splash) {
      splash.classList.add('is-hidden');
      setTimeout(() => splash.remove(), 600);
    }
  });

  // تثبيت التطبيق (PWA)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    app.installPrompt = e;
    ctx.installPrompt = e;
    toast('يمكنك تثبيت «وِردي» كتطبيق من الإعدادات', { icon: 'download', ms: 3600 });
  });

  window.addEventListener('appinstalled', () => {
    app.installPrompt = null;
    ctx.installPrompt = null;
    toast('تم تثبيت التطبيق، بارك الله فيك', { icon: 'checkCircle' });
  });

  // عامل الخدمة (للعمل بدون إنترنت)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .then((reg) => {
        app.swReg = reg;
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw?.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              toast('نسخة أحدث جاهزة — حدّثها من الإعدادات', { icon: 'refresh', ms: 4200 });
            }
          });
        });
      })
      .catch(() => { /* لا شيء */ });
  } else {
    ctx.installPrompt = ctx.installPrompt || null;
  }

  // اختصارات لوحة المفاتيح
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    const map = { 1: 'today', 2: 'library', 3: 'tasbeeh', 4: 'quran', 5: 'stats' };
    if (map[e.key]) go(map[e.key]);
    if (e.key === 'Escape' && location.hash === '#settings') go('today');
  });

  // تحديث الحالة عند الرجوع للتطبيق
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      store.rollover();
      checkReminders();
    }
  });

  // إشعار تجريبي عند أول تشغيل إن كانت مطلوبة الصلاحية
  if (store.state.settings.reminders.enabled && Notification?.permission === 'default') {
    askNotifyPermission();
  }

  void formatHijri;
}

boot();
