/* ==========================================================================
   وِردي — تبويب «المسبحة»: عدّاد ذكي مع حفظ تلقائي
   ========================================================================== */

import { h, icon, arNum, toast, sheet, vibrate, chime, celebrate, numberField } from '../ui/dom.js';
import { progressRing } from '../ui/widgets.js';
import { store, todayKey } from '../store.js';

export const TASBEEH_PRESETS = [
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
  'لَا إِلَهَ إِلَّا اللَّهُ',
  'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
  'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
  'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
  'سُبْحَانَ اللَّهِ',
  'الْحَمْدُ لِلَّهِ',
  'اللَّهُ أَكْبَرُ',
  'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
  'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
];

const TARGETS = [33, 100, 500, 1000];

export function renderTasbeeh(ctx) {
  const root = h('div', { class: 'view' });
  const state = store.state;
  let target = Number(state.tasbeeh.target || 33);

  const textEl = h('div', {
    class: 'tasbeeh__text',
    title: 'اضغط لتغيير الذكر',
    onclick: () => pickText(ctx),
  });
  textEl.textContent = state.tasbeeh.session.text;

  const numEl = h('div', { class: 'dial__num' });
  const subEl = h('div', { class: 'dial__sub' });
  const hintEl = h('div', { class: 'dial__hint', text: 'اضغط للعدّ' });
  const ringHost = h('div', {});

  const dial = h('button', {
    class: 'dial', 'aria-label': 'عدّاد التسبيح',
    onclick: (e) => tick(e),
  }, numEl, subEl, hintEl);

  const dialWrap = h('div', { style: { position: 'relative', display: 'grid', placeItems: 'center' } },
    h('div', { style: { position: 'absolute', inset: '-14px', display: 'grid', placeItems: 'center', pointerEvents: 'none' } }, ringHost),
    dial,
  );

  function paint() {
    const c = state.tasbeeh.session.count || 0;
    numEl.textContent = arNum(c);
    subEl.textContent = `من ${arNum(target)}`;
    dial.classList.toggle('is-done', c >= target);
    hintEl.textContent = c >= target ? 'أتممت العدد ✨' : 'اضغط للعدّ';
    ringHost.replaceChildren(progressRing({
      size: 340, stroke: 6, value: Math.min(1, c / target), gold: c >= target,
    }));
  }

  function tick(e) {
    const c = store.tasbeehTick(1);
    vibrate(c >= target ? [12, 40, 18] : 9, state.settings.vibrate);
    chime(c >= target ? 'done' : 'tick', state.settings.sound);
    numEl.textContent = arNum(c);
    numEl.classList.remove('count-pop');
    void numEl.offsetWidth;
    numEl.classList.add('count-pop');
    dial.classList.toggle('is-done', c >= target);
    subEl.textContent = `من ${arNum(target)}`;
    hintEl.textContent = c >= target ? 'أتممت العدد ✨' : 'اضغط للعدّ';
    ringHost.firstChild?.replaceWith(progressRing({
      size: 340, stroke: 6, value: Math.min(1, c / target), gold: c >= target,
    }));
    if (c === target) {
      celebrate(0.8);
      toast(`أتممت ${arNum(target)} من التسبيح`, { icon: 'victory' });
    }
    void e;
  }

  /* النقر في أي مكان */
  const tapLayer = h('button', {
    class: 'tap-layer hidden', 'aria-label': 'عدّاد',
    style: { position: 'fixed', inset: '0', zIndex: '1', background: 'transparent', border: '0' },
    onclick: (e) => { if (e.target === tapLayer) tick(e); },
  });

  const targetRow = h('div', { class: 'chiprow', style: { justifyContent: 'center' } },
    ...TARGETS.map((t) => h('button', {
      class: 'chip', 'aria-pressed': String(target === t),
      onclick: () => { target = t; store.state.tasbeeh.target = t; store.save(); paint(); ctx.rerender(); },
    }, arNum(t))),
    h('button', {
      class: 'chip',
      onclick: () => {
        let picked = target;
        const inp = numberField({
          value: target, min: 1, max: 100000, width: '120px', label: 'عدد مخصص',
          onCommit: (v) => { picked = v; },
        });
        const s = sheet({
          title: 'عدد مخصص',
          body: h('div', { class: 'stack' }, inp, h('p', { class: 'small muted', text: 'اكتب العدد الذي تريد العدّ إليه، مثل ١٠٠ أو ١٠٠٠.' })),
          footer: h('button', {
            class: 'btn btn--primary btn--block',
            onclick: () => {
              target = picked;
              store.state.tasbeeh.target = target;
              store.save();
              s.close();
              paint();
            },
          }, 'تحديد'),
        });
      },
    }, icon('sliders', 14), 'مخصص'),
  );

  root.append(
    h('div', { class: 'section' },
      h('h2', { class: 'section__title' }, h('span', { class: 'dot' }), 'المسبحة'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'icon-btn', 'aria-label': 'تصفير الجلسة', onclick: () => { store.tasbeehReset(true); paint(); toast('صُفّرت الجلسة', { icon: 'refresh' }); } }, icon('refresh', 19)),
    ),
    h('div', { class: 'tasbeeh' }, textEl, dialWrap, targetRow),
    h('div', { class: 'stats', style: { marginTop: '1.1rem' } },
      h('div', { class: 'stat' }, h('div', { class: 'stat__v', text: arNum(state.tasbeeh.today) }), h('div', { class: 'stat__k', text: 'اليوم' })),
      h('div', { class: 'stat' }, h('div', { class: 'stat__v', text: arNum(state.tasbeeh.total) }), h('div', { class: 'stat__k', text: 'الإجمالي' })),
      h('div', { class: 'stat' }, h('div', { class: 'stat__v', text: arNum(state.stats.totalDhikr) }), h('div', { class: 'stat__k', text: 'كل الأذكار' })),
    ),
    h('div', { class: 'row row--wrap', style: { marginTop: '.8rem' } },
      h('button', {
        class: 'btn btn--sm',
        onclick: () => {
          store.addCustom({
            title: textEl.textContent.slice(0, 40),
            text: textEl.textContent,
            target,
            benefit: 'ذكر من مسبحتك',
          });
          toast('أُضيف إلى وِردك بهذا العدد', { icon: 'plus' });
          ctx.refreshTabbar?.();
        },
      }, icon('plus', 16), 'أضف للوِرد'),
      h('button', {
        class: 'btn btn--sm btn--ghost',
        onclick: () => { store.setTasbeehText(textEl.textContent); store.tasbeehReset(true); paint(); toast('بدأت جلسة جديدة', { icon: 'play' }); },
      }, icon('play', 16), 'جلسة جديدة'),
      h('span', { class: 'spacer' }),
      h('span', {
        class: 'small muted',
        text: state.settings.tapAnywhere ? 'العدّ بالنقر على الزر فقط للحفاظ على دقة اللمس' : '',
      }),
    ),
    tapLayer,
  );

  paint();
  return root;
}

function pickText(ctx) {
  const body = h('div', { class: 'stack' },
    h('p', { class: 'small muted', text: 'اختر ذكرًا جاهزًا أو اكتب ذكرًا خاصًا:' }),
    ...TASBEEH_PRESETS.map((t) => h('button', {
      class: 'list-row', style: { textAlign: 'start' },
      onclick: () => {
        store.setTasbeehText(t);
        s.close();
        ctx.rerender();
        toast('تم التغيير', { icon: 'checkCircle' });
      },
    }, icon('beads', 18), h('span', { style: { fontFamily: 'var(--font-display)', fontSize: '1.05rem' }, text: t }))),
  );
  const custom = h('input', { type: 'text', placeholder: 'اكتب ذكرًا خاصًا…', 'aria-label': 'ذكر خاص' });
  const s = sheet({
    title: 'اختيار الذكر',
    body: h('div', { class: 'stack' }, body, h('div', { class: 'hr' }), custom),
    footer: h('button', {
      class: 'btn btn--primary btn--block',
      onclick: () => {
        if (!custom.value.trim()) return;
        store.setTasbeehText(custom.value.trim());
        s.close();
        ctx.rerender();
      },
    }, 'تعيين'),
  });
  void todayKey;
}
