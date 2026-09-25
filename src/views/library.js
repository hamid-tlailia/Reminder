/* ==========================================================================
   وِردي — تبويب «المكتبة»: كل الأذكار، البحث، الفوائد والمصادر
   ========================================================================== */

import { h, icon, arNum, toast, sheet, confirmDialog, debounce } from '../ui/dom.js';
import { openInfoSheet, openTour, PERIOD_LABEL } from '../ui/widgets.js';
import { store, isSteps, isTracker } from '../store.js';
import { CATEGORIES, CATEGORY_MAP } from '../data/adhkar.js';

export function renderLibrary(ctx) {
  const root = h('div', { class: 'view' });
  const state = store.state;

  let category = 'all';
  let query = '';
  let onlyWird = false;

  const searchInput = h('input', {
    type: 'search', placeholder: 'ابحث في الأذكار… (مثال: نوم، استغفار، مطر)',
    'aria-label': 'بحث',
    oninput: debounce((e) => { query = e.target.value.trim(); paint(); }, 160),
  });

  const chips = h('div', { class: 'chiprow' });
  const chipDefs = [
    { id: 'all', name: 'الكل', icon: 'layers' },
    { id: 'wird-only', name: 'وِردي', icon: 'checkCircle' },
    { id: 'custom', name: 'أذكاري الخاصة', icon: 'sparkles' },
    ...CATEGORIES.filter((c) => c.id !== 'daily'),
  ];

  const listHost = h('div', { class: 'stack' });

  function paintChips() {
    chips.replaceChildren(...chipDefs.map((c) => h('button', {
      class: 'chip',
      'aria-pressed': String(category === c.id),
      onclick: () => { category = c.id; onlyWird = false; paint(); },
    }, icon(c.icon || 'sparkles', 15), c.name)));
  }

  function matches(item) {
    if (category === 'wird-only') { if (!store.inWird(item.id)) return false; }
    else if (category === 'custom') { if (!item.custom) return false; }
    else if (category !== 'all') { if (item.category !== category) return false; }
    if (!query) return true;
    const hay = [item.title, item.text, item.benefit, item.source, item.tags, CATEGORY_MAP[item.category]?.name]
      .filter(Boolean).join(' ').toLowerCase();
    return query.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  }

  function itemRow(item, { featured = false } = {}) {
    const inWird = store.inWird(item.id);
    const st = store.itemStatus(item.id);
    const periods = Object.keys(item.periods || {});
    const total = Object.values(item.periods || {}).reduce((a, b) => a + b, 0);

    const bodyText = h('div', { class: 'lib-item__text is-clamped' });
    bodyText.textContent = store.state.settings.tashkeel ? item.text : item.text.replace(/[\u064B-\u0652]/g, '');

    return h('article', {
      class: `card card--pad${st.complete ? ' is-done' : ''}`,
      style: st.complete ? { borderColor: 'color-mix(in srgb, var(--accent) 40%, transparent)' } : {},
      dataset: { id: item.id },
    },
      h('div', { class: 'row' },
        h('h3', { class: 'dhikr__title' }, icon(item.icon || CATEGORY_MAP[item.category]?.icon || 'sparkles', 16), item.title),
        h('span', { class: 'spacer' }),
        item.custom ? h('span', { class: 'badge badge--gold', text: 'خاص' }) : null,
        h('span', { class: 'badge', text: `${arNum(total)}×` }),
      ),
      h('div', { class: 'lib-item' },
        bodyText,
        item.benefit ? h('div', { class: 'benefit' },
          h('b', {}, icon('seal', 13), 'الفائدة'),
          h('span', { text: item.benefit }),
        ) : null,
        h('div', { class: 'row row--wrap' },
          ...periods.map((p) => h('span', { class: 'slot-pill' }, icon(p === 'morning' ? 'sunrise' : p === 'evening' ? 'sunset' : 'calendar', 13),
            `${PERIOD_LABEL[p]}: ${arNum(item.periods[p])}`)),
          item.source ? h('span', { class: 'dhikr__meta', text: `— ${item.source}` }) : null,
        ),
      ),
      h('div', { class: 'row row--wrap' },
        h('button', {
          class: `btn btn--sm ${inWird ? 'btn--ghost' : 'btn--primary'}`,
          onclick: () => {
            store.toggleWird(item.id);
            toast(inWird ? 'أُزيل من وِردك' : 'أُضيف إلى وِردك', { icon: inWird ? 'x' : 'plus' });
            paint();
            ctx.refreshTabbar?.();
          },
        }, icon(inWird ? 'check' : 'plus', 16), inWird ? 'في وِردي' : 'أضف لوِردي'),
        isSteps(item) ? h('button', {
          class: 'btn btn--sm btn--gold',
          onclick: () => openTour(item, store.activePeriods[0], { onFinish: ctx.rerender }),
        }, icon('play', 16), 'ابدأ الجولة') : null,
        isTracker(item) ? h('button', {
          class: 'btn btn--sm btn--gold', onclick: () => ctx.go('quran'),
        }, icon('book', 16), 'افتح الورد') : null,
        h('button', { class: 'btn btn--sm btn--ghost', onclick: () => openInfoSheet(item, { onEdit: (it) => editCustom(it, ctx) }) },
          icon('info', 16), 'التفاصيل'),
        item.custom ? h('button', {
          class: 'btn btn--sm btn--danger',
          onclick: async () => {
            const ok = await confirmDialog({ title: 'حذف الذكر؟', message: item.title, ok: 'حذف', danger: true });
            if (ok) { store.removeCustom(item.id); paint(); toast('تم الحذف', { icon: 'trash' }); }
          },
        }, icon('trash', 16)) : null,
        h('span', { class: 'spacer' }),
        h('button', {
          class: 'btn btn--sm btn--ghost',
          onclick: () => {
            const node = bodyText;
            node.classList.toggle('is-clamped');
          },
        }, 'عرض النص'),
      ),
      featured ? null : null,
    );
  }

  function paint() {
    paintChips();
    const items = store.allItems().filter(matches);
    const featured = [];
    if (category === 'all' && !query) {
      for (const id of store.state.wird) {
        const it = store.getItem(id);
        if (it && isSteps(it)) featured.push(it);
      }
    }
    const nodes = [];
    if (featured.length && category === 'all' && !query) {
      nodes.push(h('div', { class: 'section' }, h('h2', { class: 'section__title' }, h('span', { class: 'dot' }), 'جولات وِردك')));
      nodes.push(...featured.slice(0, 2).map((it) => itemRow(it)));
    }
    nodes.push(h('div', { class: 'section' },
      h('h2', { class: 'section__title' }, h('span', { class: 'dot' }), 'الأذكار'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'section__hint', text: `${arNum(items.length)} نتيجة` }),
    ));
    if (items.length) nodes.push(...items.map((it) => itemRow(it)));
    else nodes.push(h('div', { class: 'empty' }, icon('search', 40), h('p', { text: 'لا نتائج مطابقة… جرّب كلمة أخرى.' })));
    listHost.replaceChildren(...nodes);
  }

  root.append(
    h('div', { class: 'section' },
      h('h2', { class: 'section__title' }, h('span', { class: 'dot' }), 'المكتبة'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn--sm btn--primary', onclick: () => import('../views/today.js').then((m) => m.openAddItem(ctx)) },
        icon('plus', 16), 'ذكر جديد'),
    ),
    h('div', { class: 'search' }, icon('search', 18), searchInput),
    chips,
    listHost,
  );

  paint();
  return root;
}

function editCustom(item, ctx) {
  const title = h('input', { type: 'text', value: item.title, 'aria-label': 'الاسم' });
  const text = h('textarea', { rows: 4, value: item.text, 'aria-label': 'النص' });
  const target = h('input', { type: 'number', value: String(item.periods?.day || 1), min: '1', 'aria-label': 'العدد' });
  const benefit = h('input', { type: 'text', value: item.benefit || '', 'aria-label': 'الفائدة' });
  const body = h('div', { class: 'stack' },
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'الاسم' }), title),
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'النص' }), text),
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'العدد اليومي' }), target),
    h('label', { class: 'stack' }, h('span', { class: 'setting__label', text: 'الفائدة' }), benefit),
  );
  const s = sheet({
    title: 'تعديل الذكر',
    body,
    footer: h('button', {
      class: 'btn btn--primary btn--block',
      onclick: () => {
        store.updateCustom(item.id, {
          title: title.value.trim(), text: text.value.trim(),
          target: target.value, benefit: benefit.value.trim(),
        });
        s.close();
        ctx.rerender();
        toast('تم التحديث', { icon: 'checkCircle' });
      },
    }, 'حفظ'),
  });
}
