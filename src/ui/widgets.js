/* ==========================================================================
   وِردي — عناصر واجهة مشتركة: حلقة التقدّم، بطاقة الذكر، جولة الأذكار
   ========================================================================== */

import { h, icon, arNum, toast, sheet, celebrate, vibrate, chime, copyText, numberField } from './dom.js';
import { store, todayKey, isSteps, isTracker } from '../store.js';

export const PERIOD_LABEL = { morning: 'الصباح', evening: 'المساء', day: 'اليوم' };
export const PERIOD_ICON = { morning: 'sunrise', evening: 'sunset', day: 'calendar' };

/* ------------------------------ حلقة التقدّم ------------------------------ */
export function progressRing({ size = 62, stroke = 6, value = 0, label = '', sub = '', gold = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.innerHTML = `
    <circle class="ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="ring__bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - v)).toFixed(2)}"/>`;
  const wrap = h('div', {
    class: `ring${v >= 1 ? ' is-done' : ''}${gold ? ' ring--gold' : ''}`,
    style: gold && v >= 1 ? { filter: 'saturate(1.1)' } : {},
  }, svg);
  if (label) {
    wrap.append(h('div', { class: 'ring__label' },
      h('span', {}, label, sub ? h('br') : null, sub ? h('small', { text: sub }) : null)));
  }
  return wrap;
}

/* ------------------------------ أزرار الأوقات ------------------------------ */
function slotPill(id, period) {
  const target = store.targetOf(id, period) || 0;
  const done = store.count(id, period);
  const isDone = target > 0 && done >= target;
  const item = store.getItem(id);
  const tour = isSteps(item);
  const body = tour
    ? `${PERIOD_LABEL[period]} ${isDone ? '✓' : ''}`
    : `${PERIOD_LABEL[period]} <b>${arNum(done)}</b>/${arNum(target)}`;
  return h('span', {
    class: `slot-pill${isDone ? ' is-done' : ''}`,
    html: `${body}${tour && !isDone ? '' : ''}`,
  }, icon(PERIOD_ICON[period], 13));
}

/* ------------------------------ بطاقة الذكر ------------------------------ */
export function dhikrCard(item, ctx = {}) {
  const { onInfo, onOpenTour, go } = ctx;
  const periods = Object.keys(item.periods || {});
  const status = store.itemStatus(item.id);
  const activePeriods = store.activePeriods;
  const cur = periods.find((p) => activePeriods.includes(p) && store.count(item.id, p) < (item.periods[p] || 0))
    || periods.find((p) => activePeriods.includes(p))
    || periods[0];

  const card = h('article', {
    class: `dhikr${status.complete ? ' is-done' : ''}`,
    dataset: { id: item.id, accent: item.accent || 'accent' },
  });

  /* الرأس */
  const head = h('div', { class: 'dhikr__head' });
  const title = h('h3', { class: 'dhikr__title' }, icon(item.icon || (item.type === 'steps' ? 'layers' : 'sparkles'), 16),
    h('span', { text: item.title }));
  head.append(title);
  head.append(h('span', { class: 'spacer' }));
  if (status.complete) head.append(h('span', { class: 'badge badge--accent' }, icon('check', 12), 'تمّ'));
  head.append(h('button', {
    class: 'icon-btn', style: { width: '36px', height: '36px' },
    'aria-label': `تفاصيل ${item.title}`,
    onclick: () => onInfo?.(item),
  }, icon('info', 18)));

  /* النص */
  const textNode = h('div', {
    class: 'dhikr__body is-clamped',
    title: 'اضغط لعرض النص كاملًا',
    onclick: (e) => {
      if (window.getSelection()?.toString()) return;
      e.currentTarget.classList.toggle('is-clamped');
      card.classList.toggle('is-open');
    },
  });
  textNode.textContent = store.state.settings.tashkeel ? item.text : stripLocal(item.text);

  /* التذييل */
  const foot = h('div', { class: 'dhikr__foot' });
  for (const p of periods) foot.append(slotPill(item.id, p));
  if (item.source) foot.append(h('span', { class: 'dhikr__meta', text: `— ${item.source}` }));
  foot.append(h('span', { class: 'spacer' }));

  card.append(head, textNode, h('div', { class: 'row' }, foot, counterControl(item, cur, card, ctx)));
  return card;
}

function stripLocal(t) {
  return String(t).replace(/[\u064B-\u0652\u0670]/g, '').replace(/\u0640/g, '');
}

/* ------------------------------ عنصر العدّ ------------------------------ */
function counterControl(item, period, card, ctx) {
  if (isTracker(item)) {
    const pages = store.state.settings.quranPages;
    const donePages = store.quranPagesIn();
    const complete = donePages >= pages;
    return h('button', {
      class: `tapper${complete ? ' is-done' : ''}`,
      'aria-label': 'افتح وِرد القرآن',
      onclick: () => ctx.go?.('quran'),
    }, h('span', { style: { fontSize: '.8rem', lineHeight: '1.2' } },
      complete ? 'تمّ ✓' : `${arNum(donePages)}/${arNum(pages)}`));
  }

  if (isSteps(item)) {
    const done = store.count(item.id, period);
    const st = store.stepState(item.id);
    const started = st.i > 0 || st.c > 0;
    const inside = done >= (item.periods[period] || 1);
    return h('button', {
      class: `tapper${inside ? ' is-done' : ''}`,
      'aria-label': `ابدأ ${item.title}`,
      style: started && !inside ? { borderColor: 'var(--gold)' } : {},
      onclick: () => ctx.onOpenTour?.(item, period),
    }, h('span', { style: { fontSize: '.78rem', lineHeight: '1.15', fontWeight: '700' } },
      inside ? 'تمّ ✓' : (started ? 'تابع' : 'ابدأ')));
  }

  const target = item.periods[period] || 0;
  const count = store.count(item.id, period);
  const complete = target > 0 && count >= target;
  const num = h('span', { text: arNum(count) });
  const btn = h('button', {
    class: `tapper${complete ? ' is-done' : ''}`,
    'aria-label': `عدّ ${item.title} — ${count} من ${target}`,
    title: 'اضغط للعدّ • اضغط مطوّلًا للنقص',
  }, num);

  let holdTimer = null;
  let held = false;

  const applyCount = (next) => {
    const isDone = target > 0 && next >= target;
    const itemDone = store.itemStatus(item.id).complete;
    num.textContent = arNum(next);
    num.classList.remove('count-pop');
    void num.offsetWidth;
    num.classList.add('count-pop');
    btn.classList.toggle('is-done', isDone);
    card.classList.toggle('is-done', itemDone);
    // شارة «تمّ» في رأس البطاقة
    const head = card.querySelector('.dhikr__head');
    if (head) {
      let badge = head.querySelector('.badge--accent');
      if (itemDone && !badge) {
        const infoBtn = head.querySelector('.icon-btn');
        badge = h('span', { class: 'badge badge--accent' }, icon('check', 12), 'تمّ');
        if (infoBtn) infoBtn.before(badge);
        else head.append(badge);
      } else if (!itemDone && badge) {
        badge.remove();
      }
    }
    // حدّث شارات الأوقات
    const foot = card.querySelector('.dhikr__foot');
    if (foot) {
      const pills = [...foot.querySelectorAll('.slot-pill')];
      const periods = Object.keys(item.periods || {});
      pills.forEach((el, i) => {
        if (periods[i]) el.replaceWith(slotPill(item.id, periods[i]));
      });
    }
    try { window.dispatchEvent(new CustomEvent('wirdi:progress', { detail: { soft: true } })); } catch { /* */ }
    if (isDone) {
      card.classList.add('is-pulse');
      setTimeout(() => card.classList.remove('is-pulse'), 700);
      onTargetReached(item);
    }
  };

  const setBtn = h('button', {
    class: 'btn btn--sm btn--ghost set-count-btn',
    'aria-label': 'تعيين العدد',
    title: 'أدخل العدد الذي وصلت إليه',
    onclick: (e) => {
      e.stopPropagation();
      openSetCount(item, period, () => applyCount(store.count(item.id, period)));
    },
  }, icon('edit', 14), 'تعيين');

  const doTap = (e) => {
    if (e) {
      const rect = btn.getBoundingClientRect();
      const ripple = h('span', {
        class: 'tapper__ripple',
        style: {
          left: `${((e.clientX || rect.left + rect.width / 2) - rect.left)}px`,
          top: `${((e.clientY || rect.top + rect.height / 2) - rect.top)}px`,
          width: `${rect.width}px`, height: `${rect.width}px`,
        },
      });
      btn.append(ripple);
      setTimeout(() => ripple.remove(), 620);
    }
    const next = store.increment(item.id, period);
    const isDone = next >= target;
    vibrate(isDone ? [12, 40, 18] : 10, store.state.settings.vibrate);
    chime(isDone ? 'done' : 'tick', store.state.settings.sound);
    applyCount(next);
  };

  btn.addEventListener('pointerdown', () => {
    held = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      held = true;
      const next = store.decrement(item.id, period);
      vibrate(6, store.state.settings.vibrate);
      applyCount(next);
    }, 500);
  });
  btn.addEventListener('pointerup', (e) => {
    clearTimeout(holdTimer);
    if (!held) doTap(e);
  });
  btn.addEventListener('pointerleave', () => clearTimeout(holdTimer));
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openSetCount(item, period, () => applyCount(store.count(item.id, period)));
  });

  // غلاف: زر العدّ + زر التعيين يظهر في التذييل
  // نُلحق زر التعيين بالتذييل بعد إنشاء البطاقة
  queueMicrotask(() => {
    const foot = card.querySelector('.dhikr__foot');
    if (foot && !foot.querySelector('.set-count-btn')) foot.append(setBtn);
  });

  return btn;
}

/** ما يحدث عند إتمام عدد ذكر */
export function onTargetReached(item) {
  const st = store.wirdStatus();
  if (st.complete) {
    celebrate(1);
    toast('ما شاء الله! أتممت وِرد اليوم كاملًا 🌿', { icon: 'victory' });
  } else if (store.itemStatus(item.id).complete) {
    toast(`تمّ: ${item.title}`, { icon: 'checkCircle' });
  }
}

/* ------------------------------ لوحة الفوائد ------------------------------ */
export function openInfoSheet(item, { onEdit, onChange } = {}) {
  const status = store.itemStatus(item.id);
  const periods = Object.keys(item.periods || {});
  const isCounter = item.type !== 'tracker' && item.type !== 'steps';

  const rows = [];
  if (item.benefit) {
    rows.push(h('div', { class: 'benefit' },
      h('b', {}, icon('seal', 13), 'الفائدة والفضل'),
      h('span', { text: item.benefit }),
    ));
  }
  if (item.source) {
    rows.push(h('div', { class: 'benefit' },
      h('b', {}, icon('book', 13), 'المصدر'),
      h('span', { text: item.source }),
    ));
  }

  const notifyHome = () => {
    onTargetReached(item);
    if (onChange) onChange();
    else {
      try {
        window.dispatchEvent(new CustomEvent('wirdi:progress', { detail: { soft: false } }));
      } catch { /* تجاهل */ }
    }
  };

  const counts = h('div', { class: 'stack' });
  for (const p of periods) {
    const t = item.periods[p];
    const c = store.count(item.id, p);
    const badge = h('span', { class: `badge${c >= t ? ' badge--accent' : ''}`, text: `${arNum(c)} / ${arNum(t)}` });

    const actions = [
      h('button', {
        class: 'btn btn--sm btn--ghost', style: { padding: '.3rem .55rem' },
        'aria-label': `وسم ${PERIOD_LABEL[p]} كمكتمل`,
        title: 'وسم كمكتمل (إن كنت أكملته دون العدّ هنا)',
        onclick: () => {
          store.setCount(item.id, p, t);
          badge.textContent = `${arNum(t)} / ${arNum(t)}`;
          badge.classList.add('badge--accent');
          toast('تم وسمه كمكتمل ✔', { icon: 'checkCircle' });
          notifyHome();
        },
      }, icon('check', 15)),
      h('button', {
        class: 'btn btn--sm btn--ghost', style: { padding: '.3rem .55rem' },
        'aria-label': `تصفير ${PERIOD_LABEL[p]}`,
        onclick: () => {
          store.setCount(item.id, p, 0);
          badge.textContent = `0 / ${arNum(t)}`;
          badge.className = 'badge';
          toast('تم التصفير', { icon: 'refresh' });
          notifyHome();
        },
      }, icon('refresh', 15)),
    ];

    // إدخال يدوي للعدد الذي وصلت إليه (للأذكار ذات العدّاد)
    if (isCounter && t > 1) {
      actions.unshift(h('button', {
        class: 'btn btn--sm btn--ghost', style: { padding: '.3rem .55rem' },
        'aria-label': `تعيين عدد ${PERIOD_LABEL[p]}`,
        title: 'أدخل العدد الذي وصلت إليه',
        onclick: () => openSetCount(item, p, () => {
          const nc = store.count(item.id, p);
          badge.textContent = `${arNum(nc)} / ${arNum(t)}`;
          badge.className = `badge${nc >= t ? ' badge--accent' : ''}`;
          notifyHome();
        }),
      }, icon('edit', 15)));
    }

    const row = h('div', { class: 'list-row' },
      icon(PERIOD_ICON[p], 18),
      h('div', {},
        h('div', { class: 'list-row__t', text: PERIOD_LABEL[p] }),
        h('div', { class: 'list-row__s', text: `العدد المطلوب: ${arNum(t)}` }),
      ),
      h('span', { class: 'spacer' }),
      badge,
      ...actions,
    );
    counts.append(row);
  }

  const body = h('div', { class: 'stack' },
    item.type !== 'tracker' ? h('div', { class: 'dhikr-text dhikr-text--sm', text: item.text }) : null,
    counts,
    isCounter ? h('p', { class: 'small muted', style: { lineHeight: '1.8' },
      text: 'إن ذكرت خارج التطبيق، اضغط أيقونة التعديل لإدخال العدد الذي وصلت إليه، أو ✓ لوسم الذكر مكتملًا.' }) : null,
    ...rows,
    status.complete ? h('div', { class: 'banner' }, icon('checkCircle', 20), h('span', { text: 'أتممت هذا الذكر اليوم. تقبّل الله.' })) : null,
  );

  const footer = [
    h('button', {
      class: 'btn btn--ghost btn--block', type: 'button',
      onclick: async () => { await copyText(item.text); toast('تم نسخ النص', { icon: 'copy' }); },
    }, icon('copy', 17), 'نسخ'),
  ];
  if (item.custom && onEdit) {
    footer.push(h('button', {
      class: 'btn btn--ghost btn--block',
      onclick: () => { onEdit(item); },
    }, icon('edit', 17), 'تعديل'));
  }
  footer.push(h('button', {
    class: 'btn btn--primary btn--block',
    onclick: (e) => {
      if (item.type === 'tracker') { location.hash = '#quran'; }
      e.currentTarget.closest('.sheet')?.dispatchEvent(new CustomEvent('close'));
      document.querySelector('.sheet-backdrop')?.click();
      // أعد رسم الرئيسية فقط إن تغيّر شيء (onChange يتكفّل بذلك)
      onChange?.();
    },
  }, 'حسنًا'));

  sheet({ title: item.title, body, footer });
}

/** إدخال يدوي للعدد الذي وصلت إليه */
function openSetCount(item, period, onDone) {
  const target = item.periods[period] || 0;
  const current = store.count(item.id, period);
  let picked = current;
  const inp = numberField({
    value: current, min: 0, max: target || 99999, width: '140px',
    label: 'العدد الذي وصلت إليه',
    onCommit: (v) => { picked = v; },
  });
  const presets = [0, Math.floor(target / 4), Math.floor(target / 2), Math.floor(target * 0.75), target]
    .filter((v, i, a) => a.indexOf(v) === i && v >= 0);
  const s = sheet({
    title: `تعيين العدد — ${PERIOD_LABEL[period] || ''}`,
    body: h('div', { class: 'stack' },
      h('p', { class: 'small muted', text: `الهدف: ${arNum(target)}. أدخل ما وصلت إليه دون العدّ داخل التطبيق.` }),
      h('div', { class: 'row', style: { justifyContent: 'center' } }, inp),
      h('div', { class: 'chiprow', style: { justifyContent: 'center', flexWrap: 'wrap' } },
        ...presets.map((v) => h('button', {
          class: 'chip',
          onclick: () => { picked = v; inp.value = String(v); },
        }, arNum(v))),
      ),
    ),
    footer: h('button', {
      class: 'btn btn--primary btn--block',
      onclick: () => {
        store.setCount(item.id, period, picked);
        s.close();
        toast(`تم تعيين العدد: ${arNum(picked)} / ${arNum(target)}`, { icon: 'checkCircle' });
        onDone?.();
      },
    }, 'حفظ'),
  });
  setTimeout(() => inp.focus?.(), 80);
}

/* ------------------------------ جولة الأذكار (خطوات) ------------------------------ */
export function openTour(item, period = 'day', { onFinish } = {}) {
  const steps = item.steps || [];
  if (!steps.length) return;
  const state = store.stepState(item.id);
  let idx = Math.min(state.i || 0, steps.length - 1);
  let count = state.c || 0;
  const dayTarget = item.periods?.[period] || 1;
  let rounds = store.count(item.id, period);

  const dots = h('div', { class: 'stepdots' });
  const label = h('div', { class: 'small muted', text: '' });
  const textEl = h('div', { class: 'flow__step' });
  const numEl = h('span', { text: '0' });
  const targetEl = h('small', { text: '' });
  const big = h('button', { class: 'flow__big' }, numEl, targetEl);
  const roundLbl = h('span', { class: 'badge', text: '' });

  function paint() {
    const step = steps[idx];
    dots.replaceChildren(...steps.map((_, i) => h('i', {
      class: i === idx ? 'is-current' : (i < idx ? 'is-done' : ''),
    })));
    label.textContent = `الخطوة ${arNum(idx + 1)} من ${arNum(steps.length)} — ${PERIOD_LABEL[period]}`;
    textEl.style.animation = 'none';
    void textEl.offsetWidth;
    textEl.style.animation = '';
    textEl.textContent = store.state.settings.tashkeel ? step.text : stripLocal(step.text);
    const shownCount = Math.min(count, step.target);
    numEl.textContent = arNum(shownCount);
    targetEl.textContent = `من ${arNum(step.target)} • ${step.label || ''}`;
    big.classList.toggle('is-done', shownCount >= step.target);
    roundLbl.textContent = `الجولة ${arNum(rounds)} / ${arNum(dayTarget)}`;
    roundLbl.className = `badge${rounds >= dayTarget ? ' badge--accent' : ''}`;
    store.stepSet(item.id, { i: idx, c: count, rounds });
  }

  function saveStep() {
    store.stepSet(item.id, { i: idx, c: count, rounds });
  }

  function next() {
    if (idx < steps.length - 1) {
      idx += 1;
      count = 0;
      saveStep();
      paint();
    } else {
      finishRound();
    }
  }

  function prev() {
    if (idx > 0) {
      idx -= 1;
      count = 0;
      saveStep();
      paint();
    }
  }

  function finishRound() {
    rounds = Math.min(rounds + 1, dayTarget);
    store.setCount(item.id, period, rounds);
    store.stepSet(item.id, { i: 0, c: 0, rounds });
    idx = 0;
    count = 0;
    paint();
    celebrate(1);
    vibrate([14, 40, 22], store.state.settings.vibrate);
    setTimeout(() => {
      close();
      toast(`تمّت جولة: ${item.title} ✔`, { icon: 'victory' });
      onFinish?.();
      onTargetReached(item);
    }, 520);
  }

  big.addEventListener('pointerup', (e) => {
    const step = steps[idx];
    if (count >= step.target) return;
    count += 1;
    vibrate(9, store.state.settings.vibrate);
    chime(count >= step.target ? 'done' : 'tick', store.state.settings.sound);
    numEl.textContent = arNum(count);
    numEl.classList.remove('count-pop');
    void numEl.offsetWidth;
    numEl.classList.add('count-pop');
    if (count >= step.target) {
      big.classList.add('is-done');
      if (step.benefit) toast(step.benefit.slice(0, 90) + (step.benefit.length > 90 ? '…' : ''), { icon: 'seal', ms: 3200 });
      setTimeout(next, 520);
    }
    saveStep();
    void e;
  });

  const body = h('div', { class: 'flow' },
    h('div', { class: 'flow__bar' }, roundLbl, h('span', { class: 'spacer' }), dots),
    label,
    textEl,
    h('div', { class: 'flow__counter' }, big),
    steps[idx]?.benefit ? h('p', { class: 'tafsir-note center', text: steps[idx].benefit }) : null,
    h('div', { class: 'flow__nav' },
      h('button', { class: 'btn btn--ghost', onclick: prev, disabled: idx === 0 }, icon('chevronRight', 18), 'السابق'),
      h('button', { class: 'btn btn--primary btn--block', onclick: () => { saveStep(); close(); } }, 'حفظ والخروج'),
      h('button', { class: 'btn btn--ghost', onclick: next }, 'التالي', icon('chevronLeft', 18)),
    ),
  );

  const s = sheet({ title: item.title, body });
  const close = s.close;
  paint();
  return s;
}

/* ------------------------------ بطاقة إحصاء ------------------------------ */
export function statBox(value, key, extra) {
  return h('div', { class: 'stat' },
    h('div', { class: 'stat__v', text: value }),
    h('div', { class: 'stat__k', text: key }),
    extra || null,
  );
}

export { todayKey };
