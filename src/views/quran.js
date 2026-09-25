/* ==========================================================================
   وِردي — تبويب «القرآن»: متابع الورد مع حفظ الصفحة وموضع الآية
   ========================================================================== */

import { h, icon, arNum, toast, sheet, celebrate, vibrate, numberField, toLatinNum } from '../ui/dom.js';
import { progressRing } from '../ui/widgets.js';
import { store, todayKey, addDays, fromDayKey } from '../store.js';

const API = 'https://api.alquran.cloud/v1';
const TOTAL_PAGES = 604;
const JUZ_PAGES = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
const SURAH_KEY = 'wirdi.surahs';

const pageCache = new Map();

async function api(path) {
  const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== 200) throw new Error('API');
  return json.data;
}

export async function getPage(page, edition = 'quran-uthmani') {
  const key = `${edition}:${page}`;
  if (pageCache.has(key)) return pageCache.get(key);
  const data = await api(`/page/${page}/${edition}`);
  pageCache.set(key, data);
  return data;
}

export async function getSurahs() {
  try {
    const cached = JSON.parse(localStorage.getItem(SURAH_KEY) || 'null');
    if (Array.isArray(cached) && cached.length === 114) return cached;
  } catch { /* تجاهل */ }
  try {
    const list = await api('/surah');
    try { localStorage.setItem(SURAH_KEY, JSON.stringify(list)); } catch { /* تجاهل */ }
    return list;
  } catch {
    return [];
  }
}

const juzOfPage = (p) => JUZ_PAGES.filter((s) => s <= p).length;

/* ------------------------------ العرض ------------------------------ */
export function renderQuran(ctx) {
  const root = h('div', { class: 'view' });
  const state = store.state;
  const q = state.quran;
  const target = state.settings.quranPages;
  const pagesToday = store.quranPagesIn();
  const done = pagesToday >= target;

  const positionCard = h('section', { class: 'card card--pad' });
  const historyCard = h('section', { class: 'card card--pad' });

  const pageInput = numberField({
    value: q.page, min: 1, max: TOTAL_PAGES, label: 'رقم الصفحة',
    onCommit: (v) => { store.quranSet(v, store.state.quran.pos); paintPosition(); },
  });
  const posInput = numberField({
    value: q.pos || 0, min: 0, max: 286, label: 'رقم الآية',
    onCommit: (v) => { store.quranSet(store.state.quran.page, v); },
  });

  const surahLine = h('p', { class: 'small muted', style: { margin: '.3rem 0 0', lineHeight: '1.9' } },
    'جارٍ تحديد موضعك من المصحف…');

  async function paintPosition() {
    const p = store.state.quran.page;
    const pos = store.state.quran.pos;
    try {
      const data = await getPage(p);
      const first = data.ayahs[0];
      const last = data.ayahs[data.ayahs.length - 1];
      const sameSurah = first.surah.number === last.surah.number;
      const range = sameSurah
        ? `سورة ${first.surah.name.replace('سُورَةُ ', '')} — الآيات ${arNum(first.numberInSurah)} إلى ${arNum(last.numberInSurah)}`
        : `من سورة ${first.surah.name.replace('سُورَةُ ', '')} (آية ${arNum(first.numberInSurah)}) إلى سورة ${last.surah.name.replace('سُورَةُ ', '')} (آية ${arNum(last.numberInSurah)})`;
      surahLine.textContent = `📖 ${range} • الجزء ${arNum(juzOfPage(p))}`;
      if (pos > 0 && first.surah.number === (data.ayahs.find((a) => a.numberInSurah === pos)?.surah?.number)) {
        // لا شيء إضافي — الموضع محفوظ
      }
    } catch {
      surahLine.textContent = `الصفحة ${arNum(p)} — الجزء ${arNum(juzOfPage(p))} (تعذّر جلب اسم السورة بدون إنترنت)`;
    }
    surahLine.dataset.ready = '1';
  }

  async function advancePage(logIt = true) {
    const p = store.state.quran.page;
    if (logIt) store.quranLogPages(1);
    const next = Math.min(TOTAL_PAGES, p + 1);
    store.quranSet(next, 0);
    vibrate(12, state.settings.vibrate);
    if (store.quranPagesIn() >= target) {
      celebrate(1);
      toast('أتممت وِرد القرآن اليوم 🌿', { icon: 'victory' });
    } else {
      toast(`أحسنت — الصفحة ${arNum(next)}`, { icon: 'checkCircle' });
    }
    ctx.rerender();
  }

  positionCard.append(
    h('div', { class: 'row' },
      progressRing({
        size: 62, stroke: 6, gold: true,
        value: Math.min(1, pagesToday / target),
        label: `${arNum(pagesToday)}`, sub: `/ ${arNum(target)}`,
      }),
      h('div', {},
        h('h2', { class: 'section__title' }, icon('book', 17), 'موقعك في الورد'),
        h('p', { class: 'small muted', style: { margin: '.2rem 0 0' }, text: 'يُحفظ تلقائيًا كلما تقدّمت' }),
      ),
      h('span', { class: 'spacer' }),
      h('button', {
        class: 'btn btn--sm btn--ghost',
        onclick: () => { store.quranSet(store.state.settings.quranStartPage, 0); ctx.rerender(); toast('عدنا إلى بداية الورد', { icon: 'arrowRight' }); },
      }, icon('arrowRight', 16), 'بداية الورد'),
    ),
    h('div', { class: 'hr' }),
    h('div', { class: 'row row--wrap' },
      h('label', { class: 'row' }, h('span', { class: 'small muted', text: 'الصفحة' }), pageInput),
      h('label', { class: 'row' }, h('span', { class: 'small muted', text: 'موضع الآية' }), posInput),
      h('span', { class: 'spacer' }),
      h('button', { class: 'chip', onclick: () => step(-1, pageInput) }, icon('chevronRight', 15), 'صفحة'),
      h('button', { class: 'chip', onclick: () => step(1, pageInput) }, 'صفحة', icon('chevronLeft', 15)),
    ),
    surahLine,
    h('div', { class: 'row row--wrap', style: { marginTop: '.8rem' } },
      h('button', { class: 'btn btn--primary', onclick: () => openReader(store.state.quran.page, ctx) },
        icon('book', 17), 'اقرأ هذه الصفحة'),
      h('button', { class: 'btn btn--gold', onclick: () => advancePage(true) },
        icon('check', 17), 'أنهيت الصفحة'),
      h('button', {
        class: 'btn btn--ghost',
        onclick: () => jumpSheet(ctx),
      }, icon('layers', 17), 'الأجزاء'),
      done ? h('span', { class: 'badge badge--accent' }, icon('checkCircle', 13), 'وِرد اليوم تام') : null,
    ),
  );

  /* السجل */
  const days = 28;
  const heat = h('div', { class: 'heat' });
  const t = todayKey();
  const start = addDays(t, -(days - 1));
  for (let i = 0; i < days; i++) {
    const key = addDays(start, i);
    const n = store.state.quran.log[key] || 0;
    const level = n === 0 ? 0 : n >= target ? 4 : n >= target * 0.5 ? 3 : n >= 2 ? 2 : 1;
    heat.append(h('i', {
      dataset: { l: String(level) },
      class: key === t ? 'is-today' : '',
      title: `${key}: ${arNum(n)} صفحة`,
    }));
  }

  const totalPagesRead = Object.values(store.state.quran.log).reduce((a, b) => a + b, 0);
  historyCard.append(
    h('div', { class: 'row' },
      h('h2', { class: 'section__title', style: { fontSize: '.95rem' } }, icon('calendar', 17), 'سجل الورد'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'badge', text: `إجمالي: ${arNum(totalPagesRead)} صفحة` }),
    ),
    h('p', { class: 'small muted', style: { margin: '.5rem 0 .7rem' }, text: 'آخر ٤ أسابيع' }),
    heat,
    h('div', { class: 'row row--wrap', style: { marginTop: '.9rem' } },
      h('label', { class: 'row' }, h('span', { class: 'small muted', text: 'وِردي اليومي' }),
        numberField({
          value: target, min: 1, max: 20, width: '70px', label: 'وِرد القرآن اليومي',
          onCommit: (v) => { store.setSetting('quranPages', v); ctx.rerender(); },
        }), h('span', { class: 'small muted', text: 'صفحة' })),
      h('span', { class: 'spacer' }),
      h('button', {
        class: 'btn btn--sm btn--ghost',
        onclick: () => { store.state.quran.log[todayKey()] = 0; store.emit(); ctx.rerender(); toast('صُفّر وِرد اليوم', { icon: 'refresh' }); },
      }, icon('refresh', 15), 'تصفير اليوم'),
    ),
  );

  root.append(
    h('div', { class: 'section' },
      h('h2', { class: 'section__title' }, h('span', { class: 'dot' }), 'وِرد القرآن'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'section__hint', text: `${arNum(TOTAL_PAGES)} صفحة` }),
    ),
    positionCard,
    historyCard,
    h('p', { class: 'small muted center', style: { marginTop: '1rem', lineHeight: '1.9' } },
      'النص القرآني يُعرض برسم عثماني من مصدر موثوق (alquran.cloud). بدون إنترنت يبقى عدّاد الصفحات وموضعك محفوظين.'),
  );

  paintPosition();
  return root;
}

function step(dir, input) {
  const cur = Number(store.state.quran.page) || 1;
  const next = Math.max(1, Math.min(TOTAL_PAGES, cur + dir));
  store.quranSet(next, 0);
  input.value = arNum(next);
  input.dispatchEvent(new Event('change'));
}

/* ------------------------------ الانتقال للأجزاء ------------------------------ */
function jumpSheet(ctx) {
  const grid = h('div', { class: 'chiprow', style: { flexWrap: 'wrap', overflow: 'visible' } },
    ...JUZ_PAGES.map((p, i) => h('button', {
      class: 'chip',
      onclick: () => {
        store.quranSet(p, 0);
        toast(`الجزء ${arNum(i + 1)} — الصفحة ${arNum(p)}`, { icon: 'book' });
        s.close();
        ctx.rerender();
      },
    }, `الجزء ${arNum(i + 1)}`)),
  );

  const search = h('input', { type: 'search', placeholder: 'ابحث عن سورة…', 'aria-label': 'بحث السور' });
  const results = h('div', { class: 'stack' });
  let surahs = [];

  function surahRow(s) {
    const info = h('div', {},
      h('div', { class: 'list-row__t', text: `${arNum(s.number)}. ${s.name}` }),
      h('div', { class: 'list-row__s', text: `${arNum(s.numberOfAyahs)} آية` }));
    const btn = h('button', {
      class: 'list-row', style: { textAlign: 'start' },
      onclick: async () => {
        toast('جارٍ تحديد الصفحة…', { icon: 'search' });
        try {
          const data = await api(`/surah/${s.number}/quran-uthmani`);
          const page = data.ayahs[0].page;
          store.quranSet(page, data.ayahs[0].numberInSurah);
          await getPage(page);
          s2.close();
          ctx.rerender();
          toast(`سورة ${s.name} — الصفحة ${arNum(page)}`, { icon: 'book' });
        } catch {
          toast('يحتاج إنترنت لتحديد الصفحة', { icon: 'info' });
        }
      },
    }, icon('book', 18), info);
    return btn;
  }

  function paintResults() {
    const qq = search.value.trim();
    if (!qq) { results.replaceChildren(); return; }
    const found = surahs
      .filter((s) => s.name.includes(qq) || String(s.number) === qq)
      .slice(0, 8)
      .map(surahRow);
    if (found.length) results.replaceChildren(...found);
    else results.replaceChildren(h('p', { class: 'small muted center', text: surahs.length ? 'لا نتائج' : 'جارٍ تحميل قائمة السور…' }));
  }

  search.addEventListener('input', paintResults);

  const s2 = sheet({
    title: 'الانتقال في المصحف',
    body: h('div', { class: 'stack' },
      h('p', { class: 'small muted', text: 'انتقل مباشرة إلى بداية أي جزء:' }),
      grid,
      h('div', { class: 'hr' }),
      h('p', { class: 'small muted', text: 'أو ابحث عن سورة (يحتاج إنترنت أول مرة):' }),
      search, results,
    ),
  });

  getSurahs().then((list) => {
    surahs = list;
    paintResults();
  });
}

/* ------------------------------ قارئ الصفحة ------------------------------ */
export async function openReader(page, ctx) {
  const target = store.state.settings.quranPages;
  const holder = h('div', { class: 'stack' },
    h('div', { class: 'center muted', style: { padding: '2rem 0' } }, icon('refresh', 30), h('p', { text: 'جارٍ تحميل الصفحة…' })),
  );

  const bar = h('div', { class: 'row row--wrap' },
    h('button', {
      class: 'btn btn--sm btn--ghost',
      onclick: async () => { s.close(); await openReader(Math.max(1, page - 1), ctx); },
    }, icon('chevronRight', 16), 'السابقة'),
    h('span', { class: 'spacer' }),
    h('span', { class: 'badge', text: `الصفحة ${arNum(page)}` }),
    h('span', { class: 'spacer' }),
    h('button', {
      class: 'btn btn--sm btn--ghost',
      onclick: async () => { s.close(); await openReader(Math.min(TOTAL_PAGES, page + 1), ctx); },
    }, 'التالية', icon('chevronLeft', 16)),
  );

  const doneBtn = h('button', {
    class: 'btn btn--gold btn--block',
    onclick: async () => {
      store.quranLogPages(1);
      store.quranSet(Math.min(TOTAL_PAGES, page + 1), 0);
      vibrate(12, store.state.settings.vibrate);
      const n = store.quranPagesIn();
      if (n >= target) {
        celebrate(1);
        toast('أتممت وِرد القرآن اليوم 🌿', { icon: 'victory' });
        s.close();
        ctx.rerender();
      } else {
        toast(`أحسنت! ${arNum(n)} من ${arNum(target)}`, { icon: 'checkCircle' });
        s.close();
        ctx.rerender();
      }
    },
  }, icon('check', 17), 'أنهيت هذه الصفحة');

  const s = sheet({ title: 'المصحف', body: holder, footer: doneBtn });

  try {
    const data = await getPage(page);
    const ayahs = data.ayahs;
    const first = ayahs[0];
    const cur = store.state.quran;

    const flow = h('div', { class: 'quran-text' });
    const surahHead = h('div', { class: 'center', style: { marginBottom: '.6rem' } },
      h('span', { class: 'badge badge--gold', text: first.surah.name.replace('سُورَةُ ', 'سورة ') }),
      h('span', { class: 'badge', text: `الجزء ${arNum(juzOfPage(page))}` }),
    );

    let lastSurah = null;
    for (const a of ayahs) {
      if (lastSurah !== a.surah.number) {
        if (lastSurah !== null) {
          flow.append(h('div', { class: 'center', style: { margin: '1rem 0 .4rem' } },
            h('span', { class: 'badge badge--gold', text: a.surah.name.replace('سُورَةُ ', 'سورة ') })));
        }
        lastSurah = a.surah.number;
      }
      const isPos = cur.page === page && Number(cur.pos) === a.numberInSurah;
      const span = h('span', {
        class: 'ayah',
        dataset: { n: String(a.numberInSurah) },
        style: isPos ? {
          background: 'var(--accent-soft)',
          borderRadius: '10px',
          boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent)',
        } : {},
        title: `سورة ${a.surah.name} — آية ${a.numberInSurah}`,
        onclick: () => {
          store.quranSet(page, a.numberInSurah);
          flow.querySelectorAll('.ayah').forEach((n) => { n.style.background = ''; n.style.boxShadow = ''; });
          span.style.background = 'var(--accent-soft)';
          span.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent)';
          toast(`حفظنا موضعك: آية ${arNum(a.numberInSurah)}`, { icon: 'target' });
        },
      }, a.text, ' ', h('span', { class: 'ayah-num', text: `﴿${arNum(a.numberInSurah)}﴾` }));
      flow.append(span, ' ');
    }

    holder.replaceChildren(surahHead, flow, h('div', { class: 'hr' }), bar,
      h('p', { class: 'small muted center', text: 'اضغط على أي آية لحفظ موضعك عندها.' }));
  } catch {
    holder.replaceChildren(
      h('div', { class: 'banner' }, icon('info', 20),
        h('span', { text: 'تعذّر تحميل نص الصفحة — تأكد من الاتصال بالإنترنت. يبقى عدّاد الصفحات وموضعك محفوظين في كل الأحوال.' })),
      h('button', { class: 'btn btn--ghost btn--block', onclick: () => { s.close(); openReader(page, ctx); } }, icon('refresh', 17), 'إعادة المحاولة'),
      bar,
    );
  }
}

/* ------------------------------ أدوات ------------------------------ */
export function quranDayLabel(key) {
  return fromDayKey(key).toLocaleDateString('ar', { day: 'numeric', month: 'short' });
}

export { addDays };
