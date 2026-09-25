/* ==========================================================================
   وِردي — تبويب «الإعدادات»: المظهر، التنبيهات، التثبيت، والبيانات
   ========================================================================== */

import { h, icon, arNum, toast, sheet, confirmDialog, numberField } from '../ui/dom.js';
import { store, todayKey } from '../store.js';

export function renderSettings(ctx) {
  const root = h('div', { class: 'view' });
  const s = store.state.settings;

  /* ------------------------------ شرائح ------------------------------ */
  function seg(options, current, onPick) {
    return h('div', { class: 'seg' }, ...options.map((o) => h('button', {
      type: 'button', 'aria-pressed': String(o.id === current),
      onclick: () => { onPick(o.id); ctx.rerender(); },
    }, o.name)));
  }

  function sw(checked, onToggle, label) {
    return h('button', {
      class: 'switch', role: 'switch', 'aria-checked': String(!!checked), 'aria-label': label || '',
      onclick: () => { onToggle(!checked); ctx.rerender(); },
    });
  }

  function settingRow(label, hint, ctrl) {
    return h('div', { class: 'setting' },
      h('div', {}, h('div', { class: 'setting__label', text: label }),
        hint ? h('div', { class: 'setting__hint', text: hint }) : null),
      h('div', { class: 'setting__ctrl' }, ctrl),
    );
  }

  /* ------------------------------ المظهر ------------------------------ */
  const appearance = h('section', { class: 'card' },
    settingRow('المظهر', 'الوضع الداكن مريح للعين ليلًا', seg(
      [{ id: 'dark', name: 'داكن' }, { id: 'light', name: 'فاتح' }, { id: 'auto', name: 'تلقائي' }],
      s.theme,
      (v) => { store.setSetting('theme', v); },
    )),
    settingRow('حجم النص', 'لقراءة أسهل للأذكار والقرآن', h('input', {
      type: 'range', min: '0.9', max: '1.4', step: '0.05', value: String(s.fontScale),
      oninput: (e) => {
        store.state.settings.fontScale = Number(e.target.value);
        applyPrefs();
        store.save();
      },
    })),
    settingRow('التشكيل', 'إظهار الحركات على الحروف', sw(s.tashkeel, (v) => store.setSetting('tashkeel', v), 'التشكيل')),
    settingRow('تقليل الحركة', 'إيقاف التأثيرات الحركية', sw(s.reduceMotion, (v) => store.setSetting('reduceMotion', v), 'تقليل الحركة')),
  );

  /* ------------------------------ الوقت ------------------------------ */
  const timeCard = h('section', { class: 'card' },
    settingRow('عرض الأذكار', 'اختر وِرد الصباح أو المساء يدويًا، أو اتركه تلقائيًا حسب الساعة', seg(
      [{ id: 'auto', name: 'تلقائي' }, { id: 'morning', name: 'صباح' }, { id: 'evening', name: 'مساء' }],
      s.timeMode,
      (v) => store.setSetting('timeMode', v),
    )),
  );

  /* ------------------------------ التنبيهات ------------------------------ */
  const timeInput = (value, onChange) => {
    const inp = h('input', { type: 'time', value, 'aria-label': 'وقت التنبيه' });
    inp.addEventListener('change', () => onChange(inp.value));
    return inp;
  };

  const notifyRow = settingRow(
    'تذكيرات يومية',
    'إشعار لطيف يذكّرك بأذكار الصباح والمساء (يعمل والتطبيق مفتوح أو مثبّتًا)',
    sw(s.reminders.enabled, (v) => {
      store.setSetting('reminders', { ...s.reminders, enabled: v });
      if (v) askNotifyPermission();
    }, 'التذكيرات'),
  );

  const notifCard = h('section', { class: 'card' },
    notifyRow,
    s.reminders.enabled ? settingRow('وقت أذكار الصباح', null,
      timeInput(s.reminders.morning, (v) => store.setSetting('reminders', { ...store.state.settings.reminders, morning: v }))) : null,
    s.reminders.enabled ? settingRow('وقت أذكار المساء', null,
      timeInput(s.reminders.evening, (v) => store.setSetting('reminders', { ...store.state.settings.reminders, evening: v }))) : null,
    s.reminders.enabled ? settingRow('صلاحية الإشعارات', 'قد تحتاج إلى السماح من إعدادات المتصفح', h('button', {
      class: 'btn btn--sm btn--ghost',
      onclick: async () => {
        const p = await askNotifyPermission();
        toast(p === 'granted' ? 'تم السماح بالإشعارات' : 'لم يُسمح بالإشعارات', { icon: p === 'granted' ? 'bell' : 'info' });
      },
    }, icon('bell', 16), 'اختبار')) : null,
    s.reminders.enabled ? h('p', { class: 'small muted', style: { padding: '0 .95rem .9rem', lineHeight: '1.9' } },
      'تنبيه: إشعارات الويب لا تعمل إذا كان التطبيق مغلقًا تمامًا على أندرويد/iOS، لكنها تعمل عند فتحه أو تركه في الخلفية.') : null,
  );

  /* ------------------------------ القرآن ------------------------------ */
  const quranCard = h('section', { class: 'card' },
    settingRow('وِرد القرآن اليومي', 'عدد الصفحات التي تريد قراءتها كل يوم',
      numberField({
        value: s.quranPages, min: 1, max: 60, width: '80px', label: 'وِرد القرآن اليومي',
        onCommit: (v) => { store.setSetting('quranPages', v); ctx.rerender(); },
      })),
    settingRow('بداية الورد', 'الصفحة التي تبدأ منها قراءتك',
      numberField({
        value: s.quranStartPage, min: 1, max: 604, width: '80px', label: 'بداية الورد',
        onCommit: (v) => store.setSetting('quranStartPage', v),
      })),
  );

  /* ------------------------------ التفاعل ------------------------------ */
  const feelCard = h('section', { class: 'card' },
    settingRow('الاهتزاز', 'اهتزاز خفيف عند كل عدّ', sw(s.vibrate, (v) => store.setSetting('vibrate', v), 'الاهتزاز')),
    settingRow('نغمة العدّ', 'صوت لطيف عند إتمام العدد', sw(s.sound, (v) => store.setSetting('sound', v), 'الصوت')),
  );

  /* ------------------------------ التثبيت ------------------------------ */
  const installCard = h('section', { class: 'card card--pad stack' },
    h('h2', { class: 'section__title' }, icon('download', 17), 'ثبّت التطبيق على جهازك'),
    h('p', { class: 'small muted', style: { lineHeight: '1.9' } },
      'يعمل «وِردي» كتطبيق مستقل بأيقونته الخاصة (PWA). ثبّته ليظهر بين تطبيقاتك ويعمل بدون إنترنت.'),
    h('div', { class: 'row row--wrap' },
      h('button', {
        class: 'btn btn--primary',
        onclick: async () => {
          if (ctx.installPrompt) {
            ctx.installPrompt.prompt();
            const res = await ctx.installPrompt.userChoice;
            if (res.outcome === 'accepted') toast('تم التثبيت، بارك الله فيك', { icon: 'checkCircle' });
            ctx.installPrompt = null;
          } else {
            installHelp();
          }
        },
      }, icon('download', 17), 'تثبيت الآن'),
      h('button', { class: 'btn btn--ghost', onclick: installHelp }, icon('info', 17), 'كيف أثبّته؟'),
    ),
  );

  /* ------------------------------ البيانات ------------------------------ */
  const dataCard = h('section', { class: 'card card--pad stack' },
    h('h2', { class: 'section__title' }, icon('lock', 17), 'بياناتك'),
    h('p', { class: 'small muted', style: { lineHeight: '1.9' } },
      'كل شيء محفوظ في جهازك فقط: لا حساب، ولا سيرفر، ولا إرسال لأي بيانات.'),
    h('div', { class: 'row row--wrap' },
      h('button', { class: 'btn btn--sm btn--ghost', onclick: () => exportData() }, icon('download', 16), 'تصدير نسخة'),
      h('button', { class: 'btn btn--sm btn--ghost', onclick: () => importData(ctx) }, icon('upload', 16), 'استيراد'),
      h('span', { class: 'spacer' }),
      h('button', {
        class: 'btn btn--sm btn--danger',
        onclick: async () => {
          const ok = await confirmDialog({
            title: 'حذف كل البيانات؟',
            message: 'سيُمحى كل تقدّمك وسجلّك نهائيًا من هذا الجهاز. لا يمكن التراجع.',
            ok: 'حذف الكل', danger: true,
          });
          if (ok) { store.wipe(); ctx.rerender(); toast('تم حذف كل البيانات', { icon: 'trash' }); }
        },
      }, icon('trash', 16), 'حذف الكل'),
    ),
    h('div', { class: 'hr' }),
    h('button', {
      class: 'btn btn--ghost btn--sm', onclick: async () => {
        const ok = await confirmDialog({ title: 'تحديث التطبيق؟', message: 'سيُعاد تحميل الملفات المخزّنة للنسخة الأحدث.', ok: 'تحديث' });
        if (ok) ctx.updateApp?.();
      },
    }, icon('refresh', 16), 'تحديث نسخة التطبيق'),
  );

  /* ------------------------------ حول ------------------------------ */
  const aboutCard = h('section', { class: 'card card--pad stack' },
    h('h2', { class: 'section__title' }, icon('seal', 17), 'حول التطبيق'),
    h('p', { class: 'small muted', style: { lineHeight: '2' } },
      '«وِردي» تطبيق أذكار عصري: يتابع أعدادك، يحفظ مكانك في كل جولة، ويقسّم أذكارك حسب الوقت، مع بيان فائدة كل ذكر ومصدره.'),
    h('p', { class: 'small muted', style: { lineHeight: '2' } },
      'المصادر: صحيح البخاري ومسلم والسنن، وكتاب «حصن المسلم»، والنص القرآني برسم عثماني. يُنصح بمراجعة أهل العلم في الأعداد والفوائد.'),
    h('div', { class: 'row row--wrap' },
      h('span', { class: 'badge', text: `الإصدار ${store.state.version}.1` }),
      h('span', { class: 'badge', text: `آخر تحديث للبيانات: ${todayKey()}` }),
    ),
  );

  root.append(
    h('div', { class: 'section' },
      h('h2', { class: 'section__title' }, h('span', { class: 'dot' }), 'الإعدادات'),
    ),
    appearance, timeCard, notifCard, quranCard, feelCard, installCard, dataCard, aboutCard,
  );
  return root;
}

/* ------------------------------ مساعدات ------------------------------ */
export async function askNotifyPermission() {
  try {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return 'error';
  }
}

export function sendNotification(title, body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const opts = { body, icon: 'assets/icons/icon-192.png', badge: 'assets/icons/favicon-48.png', dir: 'rtl', lang: 'ar' };
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, opts));
    } else {
      // eslint-disable-next-line no-new
      new Notification(title, opts);
    }
    return true;
  } catch {
    return false;
  }
}

function installHelp() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const steps = isIOS
    ? ['افتح التطبيق في سفاري', 'اضغط زر المشاركة ⬆️', 'اختر «إضافة إلى الشاشة الرئيسية»', 'سمِّه «وِردي» واضغط إضافة']
    : isAndroid
      ? ['افتح التطبيق في كروم', 'اضغط القائمة ⋮ أعلى اليمين', 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»']
      : ['افتح التطبيق في كروم أو إيدج', 'اضغط أيقونة التثبيت في شريط العنوان', 'أو من القائمة: تثبيت التطبيق'];
  sheet({
    title: 'تثبيت وِردي',
    body: h('div', { class: 'stack' },
      h('img', { src: 'assets/icons/icon-192.png', width: 84, height: 84, style: { borderRadius: '20px', margin: '0 auto' }, alt: 'أيقونة وِردي' }),
      h('p', { class: 'small muted center', text: 'سيظهر التطبيق بأيقونته الخاصة وبدون شريط المتصفح.' }),
      ...steps.map((s, i) => h('div', { class: 'list-row' },
        h('span', { class: 'badge badge--gold', text: arNum(i + 1) }),
        h('span', { text: s }))),
    ),
  });
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

function importData(ctx) {
  const input = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  document.body.append(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      store.importJSON(await file.text());
      toast('تم استيراد بياناتك', { icon: 'checkCircle' });
      ctx.rerender();
    } catch (err) {
      toast(`تعذّر الاستيراد: ${err.message}`, { icon: 'info' });
    }
    input.remove();
  });
  input.click();
}

function applyPrefs() {
  const s = store.state.settings;
  document.documentElement.style.setProperty('--fs', String(s.fontScale || 1));
}

export { applyPrefs };
