/* ==========================================================================
   وِردي — تبويب «اليوم»: وِردك ومكانك بالضبط
   ========================================================================== */

import { h, icon, arNum, toast, sheet, confirmDialog, celebrate } from '../ui/dom.js';
import { progressRing, dhikrCard, openTour, openInfoSheet, PERIOD_LABEL } from '../ui/widgets.js';
import { store, formatGregorian, formatHijri, todayKey, isSteps, isTracker, addDays, fromDayKey } from '../store.js';

const PARTICLES = {
  morning: ['أصبحنا وأصبح الملك لله', 'اللهم بك أصبحنا', 'سبحان الله وبحمده'],
  evening: ['أمسينا وأمسى الملك لله', 'اللهم بك أمسينا', 'سبحان الله وبحمده'],
  all: ['الحمد لله', 'لا حول ولا قوة إلا بالله', 'سبحان الله وبحمده'],
};

export function renderToday(ctx) {
  const { go } = ctx;
  const root = h('div', { class: 'view' });
  const state = store.state;
  const periods = store.activePeriods;
  const mainPeriod = periods[0];
  const st = store.wirdStatus();

  /* ------------------------------ الترويسة ------------------------------ */
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'صباح الخير' : (greetingHour < 17 ? 'نهارك مبارك' : 'مساء الخير');
  const hijri = formatHijri();
  const nextLabel = mainPeriod === 'morning' ? 'وِرد المساء' : 'وِرد الصباح';
  const manualView = state.settings.timeMode !== 'auto'; // عرضٌ يدوي لا يتبع الساعة

  const ringHost = h('div', { class: 'hero__ring' });
  const doneLbl = h('b', { text: `${arNum(st.completeCount)}/${arNum(st.total)}` });
  const barFill = h('div', { class: 'bar__fill', style: { width: `${Math.round(st.pct * 100)}%` } });
  const totalBadge = h('span', { class: 'badge' }, icon('target', 12), `إجمالي اليوم: ${arNum(st.done)}`);

  function paintHeroProgress() {
    const s = store.wirdStatus();
    ringHost.replaceChildren(progressRing({
      size: 78, stroke: 7, value: s.pct,
      label: `${arNum(Math.round(s.pct * 100))}%`,
    }));
    doneLbl.textContent = `${arNum(s.completeCount)}/${arNum(s.total)}`;
    barFill.style.width = `${Math.round(s.pct * 100)}%`;
    totalBadge.lastChild.textContent = `إجمالي اليوم: ${arNum(s.done)}`;
  }
  paintHeroProgress();

  // حدّث الحلقة فور أي تقدّم دون إعادة بناء الصفحة
  const onProg = (e) => {
    if (!document.body.contains(ringHost)) {
      window.removeEventListener('wirdi:progress', onProg);
      return;
    }
    if (e.detail?.soft) paintHeroProgress();
  };
  window.addEventListener('wirdi:progress', onProg);

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero__top' },
      ringHost,
      h('div', {},
        h('h1', { class: 'hero__hi', text: `${greeting} 🌿` }),
        h('p', { class: 'hero__date', text: `${formatGregorian()}${hijri ? ' • ' + hijri : ''}` }),
        h('p', { class: 'hero__date' },
          'الوقت الآن: ', h('b', { text: PERIOD_LABEL[mainPeriod] }),
          ' • أُنجز ', doneLbl, ' من وِردك'),
      ),
      h('span', { class: 'spacer' }),
      h('button', {
        class: `icon-btn${manualView ? ' is-on' : ''}`,
        'aria-label': manualView ? 'العودة للعرض التلقائي حسب الساعة' : 'تبديل الوقت',
        title: manualView ? 'عرضٌ يدوي مفعّل — اضغط للعودة للتلقائي حسب الساعة' : 'عرض وِرد الصباح/المساء',
        onclick: () => {
          const cur = state.settings.timeMode;
          const next = cur === 'auto' ? (mainPeriod === 'morning' ? 'evening' : 'morning') : 'auto';
          store.setSetting('timeMode', next);
          ctx.rerender();
          toast(next === 'auto' ? 'عرض تلقائي حسب الوقت' : `عرض ${PERIOD_LABEL[next]}`, { icon: 'refresh' });
        },
      }, icon(mainPeriod === 'morning' ? 'sunrise' : 'sunset', 20)),
    ),
    h('div', { class: 'bar' }, barFill),
    h('div', { class: 'row row--wrap' },
      h('span', { class: 'badge badge--accent' }, icon('fire', 12), `السلسلة: ${arNum(state.stats.streak)} يوم`),
      totalBadge,
      h('span', { class: 'spacer' }),
      h('button', {
        class: 'btn btn--sm btn--ghost', onclick: () => openAddItem(ctx),
      }, icon('plus', 16), 'أضف ذكرًا'),
    ),
  );

  /* ------------------------------ أزرار سريعة ------------------------------ */
  const quick = h('div', { class: 'chiprow' });
  const qids = store.state.wird.filter((id) => isSteps(store.getItem(id)) || isTracker(store.getItem(id)));
  for (const id of qids.slice(0, 4)) {
    const item = store.getItem(id);
    const done = store.itemStatus(id).complete;
    quick.append(h('button', {
      class: `chip${done ? ' is-on' : ''}`,
      onclick: () => {
        if (isTracker(item)) go('quran');
        else openTour(item, store.activePeriods[0], { onFinish: ctx.rerender });
      },
    }, icon(done ? 'checkCircle' : (item.id.includes('morning') ? 'sunrise' : item.id.includes('evening') ? 'sunset' : 'layers'), 15),
      item.title, done ? ' ✓' : ''));
  }
  quick.append(h('button', { class: 'chip', onclick: () => go('library') }, icon('grid', 15), 'المكتبة'));

  /* ------------------------------ قائمة الورد ------------------------------ */
  const listHead = h('div', { class: 'section' },
    h('h2', { class: 'section__title' }, h('span', { class: 'dot' }), 'وِردك اليوم'),
    h('span', { class: 'spacer' }),
    h('button', { class: 'btn btn--sm btn--ghost', onclick: () => confirmReset(ctx) }, icon('refresh', 15), 'تصفير اليوم'),
  );

  const list = h('div', { class: 'flow' });
  const wirdItems = state.wird.map((id) => store.getItem(id)).filter(Boolean);

  const active = [];
  const others = [];
  for (const item of wirdItems) {
    (isRelevantNow(item, periods) ? active : others).push(item);
  }
  active.sort((a, b) => (a.pin || 99) - (b.pin || 99));
  others.sort((a, b) => (a.pin || 99) - (b.pin || 99));

  const cardCtx = {
    go,
    onOpenTour: (item, p) => openTour(item, p, { onFinish: ctx.rerender }),
    onInfo: (item) => openInfoSheet(item, { onChange: ctx.rerender }),
  };

  if (!wirdItems.length) {
    list.append(h('div', { class: 'card card--pad empty' },
      icon('sparkles', 40),
      h('p', { text: 'وِردك فارغ الآن. أضف أذكارك المفضّلة من المكتبة أو أنشئ ذكرًا خاصًا بك.' }),
      h('button', { class: 'btn btn--primary', onclick: () => go('library') }, icon('grid', 17), 'تصفّح المكتبة'),
    ));
  } else {
    for (const item of active) list.append(dhikrCard(item, cardCtx));
  }

  /* ------------------------------ لوحة الأذكار القادمة ------------------------------ */
  let nextCard = null;
  if (others.length) {
    nextCard = h('section', { class: 'card card--pad' },
      h('div', { class: 'row' },
        h('h2', { class: 'section__title', style: { fontSize: '.92rem' } },
          icon(nextLabel === 'وِرد الصباح' ? 'sunrise' : 'sunset', 17), nextLabel),
        h('span', { class: 'spacer' }),
        h('span', { class: 'small muted', text: `${arNum(others.length)} ذكرًا` }),
      ),
      h('p', { class: 'small muted', style: { margin: '.4rem 0 .7rem' },
        text: `هذه أذكار ${mainPeriod === 'morning' ? 'المساء' : 'الصباح'}. عدّادها منفصل عن عدّاد وقتك الحالي.` }),
      h('div', { class: 'stack' }, ...others.map((item) => dhikrCard(item, cardCtx))),
    );
  }

  /* ------------------------------ لمسة اليوم ------------------------------ */
  const particles = PARTICLES[state.settings.timeMode === 'auto' ? 'all' : mainPeriod] || PARTICLES.all;
  const tip = particles[new Date().getDate() % particles.length];
  const tipCard = h('section', { class: 'card card--pad', style: { textAlign: 'center' } },
    h('div', { class: 'small muted', text: 'لمسة اليوم' }),
    h('div', { class: 'dhikr-text', style: { marginTop: '.5rem' }, text: `«${tip}»` }),
  );

  /* ------------------------------ بطاقة القرآن ------------------------------ */
  const pages = state.settings.quranPages;
  const donePages = store.quranPagesIn();
  const qCard = h('section', { class: 'card card--pad' },
    h('div', { class: 'row' },
      progressRing({
        size: 54, stroke: 6, gold: true,
        value: Math.min(1, donePages / pages),
        label: `${arNum(donePages)}`,
        sub: `/ ${arNum(pages)}`,
      }),
      h('div', {},
        h('h2', { class: 'section__title', style: { fontSize: '.92rem' } }, icon('book', 17), 'وِرد القرآن'),
        h('p', { class: 'small muted', style: { margin: '.2rem 0 0' },
          text: donePages >= pages
            ? 'أتممت وِرد اليوم. تقبّل الله.'
            : `صفحتك الحالية: ${arNum(state.quran.page)}` }),
      ),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn--sm btn--primary', onclick: () => go('quran') },
        donePages >= pages ? 'تصفّح' : 'أكمل القراءة'),
    ),
  );

  root.append(hero, quick, listHead, list, qCard, nextCard, tipCard, footerNote(ctx));
  return root;
}

function isRelevantNow(item, periods) {
  if (!item.periods) return false;
  const keys = Object.keys(item.periods);
  const hasTimed = keys.some((k) => k !== 'day');
  if (!hasTimed) return true;
  return keys.some((k) => periods.includes(k));
}

export function footerNote() {
  return h('p', { class: 'small muted center', style: { marginTop: '1.4rem', lineHeight: '1.9' } },
    'يُحفظ تقدّمك تلقائيًا في جهازك — بلا حساب ولا إنترنت.');
}

/* ------------------------------ إضافة ذكر ------------------------------ */
export function openAddItem(ctx) {
  const title = h('input', { type: 'text', placeholder: 'اسم الذكر (مثال: أذكار النوم)', 'aria-label': 'اسم الذكر' });
  const text = h('textarea', { rows: 4, placeholder: 'نص الذكر…', 'aria-label': 'نص الذكر' });
  const target = h('input', { type: 'number', value: '10', min: '1', max: '10000', 'aria-label': 'العدد' });
  const benefit = h('input', { type: 'text', placeholder: 'الفائدة أو المصدر (اختياري)', 'aria-label': 'الفائدة' });

  const body = h('div', { class: 'stack' },
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'الاسم' }), title),
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'النص' }), text),
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'العدد اليومي' }), target),
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'الفائدة' }), benefit),
    h('p', { class: 'small muted', text: 'سيُضاف الذكر إلى وِردك اليومي ويمكنك تعديله أو حذفه لاحقًا.' }),
  );

  const save = h('button', {
    class: 'btn btn--primary btn--block',
    onclick: () => {
      if (!title.value.trim() || !text.value.trim()) {
        toast('الاسم والنص مطلوبان', { icon: 'info' });
        return;
      }
      store.addCustom({
        title: title.value.trim(),
        text: text.value.trim(),
        target: target.value,
        benefit: benefit.value.trim(),
      });
      s.close();
      toast('أُضيف إلى وِردك', { icon: 'checkCircle' });
      ctx.rerender();
    },
  }, 'حفظ');

  const s = sheet({ title: 'ذكر جديد', body, footer: save });
}

async function confirmReset(ctx) {
  const ok = await confirmDialog({
    title: 'تصفير وِرد اليوم؟',
    message: 'سيُصفَّر عدّاد كل أذكار اليوم، ويبقى سجلّ الأيام السابقة محفوظًا.',
    ok: 'تصفير',
    danger: true,
  });
  if (!ok) return;
  store.resetDay();
  ctx.rerender();
  toast('تم تصفير اليوم', { icon: 'refresh' });
}

/* ------------------------------ أدوات مساعدة للاستخدام في تقرير الأيام ------------------------------ */
export function dayLabel(key) {
  const d = fromDayKey(key);
  const diff = Math.round((fromDayKey(todayKey()) - d) / 86400000);
  if (diff === 0) return 'اليوم';
  if (diff === 1) return 'أمس';
  if (diff === 2) return 'قبل يومين';
  return formatGregorian(d).replace(/\s\d{4}$/, '');
}

export { addDays, isTracker, isSteps, celebrate };
