/* ==========================================================================
   وِردي — تبويب «تقدّمي»: السلسلة، الإحصاءات، الأوسمة
   ========================================================================== */

import { h, icon, arNum, toast, sheet } from '../ui/dom.js';
import { progressRing, statBox, PERIOD_LABEL } from '../ui/widgets.js';
import { store, todayKey, addDays, fromDayKey, formatGregorian } from '../store.js';

const AR_SHORT_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export function renderStats(ctx) {
  const root = h('div', { class: 'view' });
  const state = store.state;
  const t = todayKey();
  const st = store.wirdStatus();
  const streak = store.computeStreak(t);

  /* ---------- الترويسة ---------- */
  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero__top' },
      progressRing({ size: 74, stroke: 7, value: st.pct, label: `${arNum(Math.round(st.pct * 100))}%` }),
      h('div', {},
        h('h1', { class: 'hero__hi', text: `سلسلتك: ${arNum(streak)} ${streak > 10 ? 'يومًا' : 'أيام'} 🔥` }),
        h('p', { class: 'hero__date', text: `${formatGregorian()} • أفضل سلسلة: ${arNum(state.stats.best || 0)}` }),
      ),
    ),
    h('div', { class: 'stats' },
      statBox(arNum(state.stats.daysActive || 0), 'أيام النشاط'),
      statBox(arNum(state.stats.totalDhikr || 0), 'إجمالي الأذكار'),
      statBox(arNum(state.tasbeeh.total || 0), 'عدّاد المسبحة'),
      statBox(arNum(Object.values(state.quran.log).reduce((a, b) => a + b, 0)), 'صفحات القرآن'),
    ),
  );

  /* ---------- آخر ١٤ يومًا ---------- */
  const days = 14;
  const bars = h('div', { class: 'bars' });
  for (let i = days - 1; i >= 0; i--) {
    const key = addDays(t, -i);
    const daySt = store.wirdStatus(key);
    const pct = Math.round(daySt.pct * 100);
    const d = fromDayKey(key);
    bars.append(h('div', {
      class: 'bars__col', dataset: { done: daySt.complete ? '1' : '0' },
      title: `${key} — ${arNum(pct)}%`,
    },
      h('div', { class: 'bars__bar', style: { height: `${Math.max(3, pct)}%` } }),
      h('div', { class: 'bars__lbl', text: AR_SHORT_DAYS[d.getDay()].slice(0, 3) }),
    ));
  }

  const chartCard = h('section', { class: 'card card--pad' },
    h('div', { class: 'row' },
      h('h2', { class: 'section__title', style: { fontSize: '.95rem' } }, icon('chart', 17), 'آخر ١٤ يومًا'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'small muted', text: 'نسبة إتمام الورد' }),
    ),
    bars,
  );

  /* ---------- خريطة السنة ---------- */
  const heatDays = 84;
  const heat = h('div', { class: 'heat' });
  for (let i = heatDays - 1; i >= 0; i--) {
    const key = addDays(t, -i);
    const daySt = store.wirdStatus(key);
    const pct = daySt.pct;
    const level = pct === 0 ? 0 : pct < 0.34 ? 1 : pct < 0.67 ? 2 : pct < 1 ? 3 : 4;
    heat.append(h('i', {
      dataset: { l: String(level) },
      class: key === t ? 'is-today' : '',
      title: `${key} — ${arNum(Math.round(pct * 100))}% • ${arNum(daySt.completeCount)}/${arNum(daySt.total)}`,
    }));
  }
  const heatCard = h('section', { class: 'card card--pad' },
    h('div', { class: 'row' },
      h('h2', { class: 'section__title', style: { fontSize: '.95rem' } }, icon('calendar', 17), 'خريطة الالتزام'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'small muted', text: '١٢ أسبوعًا' }),
    ),
    h('div', { style: { marginTop: '.7rem' } }, heat),
  );

  /* ---------- تفصيل الأذكار ---------- */
  const rows = [];
  for (const id of state.wird) {
    const item = store.getItem(id);
    if (!item) continue;
    const itemSt = store.itemStatus(id);
    const periods = Object.keys(item.periods || {});
    rows.appendRow?.(item);
    rows.push(h('div', { class: 'list-row' },
      icon(item.type === 'steps' ? 'layers' : (item.accent === 'gold' ? 'sparkles' : 'target'), 18),
      h('div', {},
        h('div', { class: 'list-row__t', text: item.title }),
        h('div', { class: 'list-row__s', text: periods.map((p) => `${PERIOD_LABEL[p]}: ${arNum(store.count(id, p))}/${arNum(item.periods[p])}`).join(' • ') }),
      ),
      h('span', { class: 'spacer' }),
      itemSt.complete
        ? h('span', { class: 'badge badge--accent' }, icon('check', 12), 'تام')
        : h('span', { class: 'badge', text: `${arNum(Math.round(itemSt.pct * 100))}%` }),
    ));
  }

  const detailCard = h('section', { class: 'card card--pad' },
    h('div', { class: 'row' },
      h('h2', { class: 'section__title', style: { fontSize: '.95rem' } }, icon('chart', 17), 'تفصيل وِردك اليوم'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'badge', text: `${arNum(st.completeCount)} / ${arNum(st.total)}` }),
    ),
    h('div', { class: 'stack', style: { marginTop: '.6rem' } }, ...rows),
  );

  /* ---------- الأوسمة ---------- */
  const totalDhikr = state.stats.totalDhikr || 0;
  const badges = [
    { id: 'first', name: 'البداية المباركة', desc: 'أتممت وِردك يومًا كاملًا', got: (state.stats.lastCompleteDay || state.stats.daysActive) && totalDhikr > 0, icon: 'sparkles' },
    { id: 'streak3', name: 'ثلاثة أيام', desc: 'سلسلة ٣ أيام متتالية', got: (state.stats.best || 0) >= 3, icon: 'fire' },
    { id: 'streak7', name: 'أسبوع كامل', desc: 'سلسلة ٧ أيام متتالية', got: (state.stats.best || 0) >= 7, icon: 'seal' },
    { id: 'streak30', name: 'شهر من الذكر', desc: 'سلسلة ٣٠ يومًا', got: (state.stats.best || 0) >= 30, icon: 'victory' },
    { id: 'dhikr1000', name: 'ألف ذكر', desc: '١٠٠٠ ذكر مسجّل', got: totalDhikr >= 1000, icon: 'beads' },
    { id: 'dhikr10000', name: 'عشرة آلاف', desc: '١٠٠٠٠ ذكر مسجّل', got: totalDhikr >= 10000, icon: 'star' },
    { id: 'quran7', name: 'وِرد القرآن أسبوعًا', desc: '٧ أيام بورد قرآن مكتمل', got: Object.keys(state.quran.log).filter((k) => state.quran.log[k] >= state.settings.quranPages).length >= 7, icon: 'book' },
    { id: 'tahleel', name: 'المئة تهليلة', desc: '١٠٠ «لا إله إلا الله» في يوم', got: (state.progress[t]?.['tahleel-100']?.day || 0) >= 100, icon: 'target' },
  ];

  const badgeGrid = h('div', { class: 'heat', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: '.5rem' } });
  for (const b of badges) {
    badgeGrid.append(h('div', {
      class: 'stat', style: {
        opacity: b.got ? '1' : '.42',
        borderColor: b.got ? 'color-mix(in srgb, var(--gold) 40%, transparent)' : 'var(--line)',
        cursor: 'help',
      },
      title: b.desc,
      onclick: () => toast(b.got ? `أُنجز: ${b.name} — ${b.desc}` : `لم يُنجز بعد: ${b.desc}`, { icon: b.got ? 'victory' : 'lock' }),
    },
      h('div', { style: { display: 'grid', placeItems: 'center', color: b.got ? 'var(--gold)' : 'var(--muted)' } }, icon(b.icon, 22)),
      h('div', { class: 'stat__k', style: { marginTop: '.3rem' }, text: b.name }),
    ));
  }

  const badgeCard = h('section', { class: 'card card--pad' },
    h('h2', { class: 'section__title', style: { fontSize: '.95rem' } }, icon('seal', 17), 'الأوسمة'),
    h('div', { style: { marginTop: '.7rem' } }, badgeGrid),
  );

  /* ---------- سجل الأيام ---------- */
  const logRows = [];
  for (let i = 0; i < 14; i++) {
    const key = addDays(t, -i);
    const daySt = store.wirdStatus(key);
    if (daySt.done === 0 && !daySt.complete) continue;
    logRows.push(h('div', { class: 'list-row' },
      h('span', { class: 'list-row__t', text: key === t ? 'اليوم' : formatGregorian(fromDayKey(key)).replace(/\s\d{4}$/, '') }),
      h('span', { class: 'spacer' }),
      h('span', { class: 'badge', text: `${arNum(daySt.done)} ذكرًا` }),
      h('span', { class: `badge${daySt.complete ? ' badge--accent' : ''}`, text: `${arNum(Math.round(daySt.pct * 100))}%` }),
      h('span', { class: 'badge', text: `${arNum(store.state.quran.log[key] || 0)} صفحة` }),
    ));
  }

  root.append(
    hero, chartCard, heatCard, badgeCard, detailCard,
    logRows.length ? h('section', { class: 'card card--pad' },
      h('h2', { class: 'section__title', style: { fontSize: '.95rem' } }, icon('calendar', 17), 'آخر أيامك'),
      h('div', { class: 'stack', style: { marginTop: '.6rem' } }, ...logRows),
    ) : null,
    h('div', { class: 'row', style: { marginTop: '1rem' } },
      h('button', { class: 'btn btn--ghost btn--sm', onclick: () => exportData() }, icon('download', 16), 'تصدير نسخة'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn--ghost btn--sm', onclick: () => ctx.go('settings') }, icon('gear', 16), 'الإعدادات'),
    ),
  );

  return root;
}

function exportData() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `wirdi-backup-${todayKey()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('تم تصدير نسخة من بياناتك', { icon: 'download' });
}

export { sheet };
