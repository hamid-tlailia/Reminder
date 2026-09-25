/* ==========================================================================
   وِردي — أدوات الواجهة: عناصر، أيقونات، نوافذ، تنبيهات، احتفال
   ========================================================================== */

/* ------------------------------ إنشاء العناصر ------------------------------ */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list' && typeof v !== 'object') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat(4)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const frag = (...children) => {
  const f = document.createDocumentFragment();
  for (const c of children.flat(4)) if (c) f.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return f;
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ------------------------------ الأيقونات ------------------------------ */
const S = (d, extra = '') => `<path d="${d}" ${extra}/>`;
const SVG_OPEN = (size = 24) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;

export const ICONS = {
  home: `<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>`,
  sunrise: `<circle cx="12" cy="13.5" r="3.7"/><path d="M12 4.5v3M5.6 8.1l1.6 1.6M18.4 8.1l-1.6 1.6M3 20.5h18"/>`,
  sunset: `<circle cx="12" cy="13.5" r="3.7"/><path d="M12 7.5v-3M5.6 8.1l1.6 1.6M18.4 8.1l-1.6 1.6M3 20.5h18M9 20.5l3-2.6 3 2.6"/>`,
  sparkles: `<path d="M11 4.2 12.6 8.6 17 10.2l-4.4 1.6L11 16.2 9.4 11.8 5 10.2l4.4-1.6z"/><path d="M17.6 15.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>`,
  cloud: `<path d="M7.2 18.5h9.3a3.9 3.9 0 0 0 .4-7.8A5.8 5.8 0 0 0 5.8 11.4a3.5 3.5 0 0 0 1.4 7.1z"/>`,
  heart: `<path d="M12 20.6S4.2 15.4 4.2 9.9A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.8 2.2c0 5.5-7.8 10.7-7.8 10.7z"/>`,
  book: `<path d="M4.5 5.6A2.6 2.6 0 0 1 7.1 3H19v14.5H7.1a2.6 2.6 0 0 0-2.6 2.6z"/><path d="M19 17.5V21H7.1a2.6 2.6 0 0 1-2.6-2.6"/>`,
  moon: `<path d="M20.4 14.6A8.6 8.6 0 1 1 9.6 3.8a6.7 6.7 0 0 0 10.8 10.8z"/>`,
  mosque: `<path d="M12 3c3.2 3.6 4.6 5.2 4.6 7.7 0 2.6-2.1 3.8-4.6 3.8s-4.6-1.2-4.6-3.8C7.4 8.2 8.8 6.6 12 3z"/><path d="M6 21v-6.4h12V21M3.5 21h17"/>`,
  drop: `<path d="M12 3.4s6 6.3 6 10.1a6 6 0 0 1-12 0c0-3.8 6-10.1 6-10.1z"/>`,
  cup: `<path d="M6 4h11v5a5.5 5.5 0 0 1-11 0z"/><path d="M17 5h1.8a2.6 2.6 0 0 1 0 5.2H17M5 20.5h13"/>`,
  compass: `<circle cx="12" cy="12" r="8.6"/><path d="M15.8 8.2l-2.4 5.2-5.2 2.4 2.4-5.2z"/>`,
  shield: `<path d="M12 3.2 5.4 6v6.1c0 4.3 2.9 7.8 6.6 8.7 3.7-.9 6.6-4.4 6.6-8.7V6z"/>`,
  leaf: `<path d="M5.2 19c0-8 5.2-13.4 14-13.4C19.2 13.6 14 19 5.2 19z"/><path d="M5.2 19c2-2.1 4.6-3.7 7.3-4.8"/>`,
  star: `<path d="M12 3.6 14.5 9l5.9.9-4.3 4.2 1 5.9L12 17.2 6.9 20l1-5.9L3.6 9.9 9.5 9z"/>`,
  beads: `<circle cx="12" cy="12" r="8.2" stroke-dasharray="1.4 3.9"/><circle cx="12" cy="20.4" r="1.7" fill="currentColor" stroke="none"/>`,
  chart: `<path d="M4 20.5h16"/><path d="M7 20.5V13M12 20.5V6M17 20.5v-5"/>`,
  gear: `<path d="M4 6.5h9M17.5 6.5H20M4 12h4.5M12.5 12H20M4 17.5h9.5M17.5 17.5H20"/><circle cx="15" cy="6.5" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="15" cy="17.5" r="2.2"/>`,
  check: `<path d="M20 6.5 9.2 17.3 4 12.1"/>`,
  checkCircle: `<circle cx="12" cy="12" r="8.8"/><path d="m8.3 12.4 2.5 2.5 4.9-5.3"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  x: `<path d="M18 6 6 18M6 6l12 12"/>`,
  chevronLeft: `<path d="m14.5 18.5-6.5-6.5 6.5-6.5"/>`,
  chevronRight: `<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>`,
  chevronDown: `<path d="m6 9.5 6 6 6-6"/>`,
  arrowLeft: `<path d="M19 12H5m0 0 6-6m-6 6 6 6"/>`,
  arrowRight: `<path d="M5 12h14m0 0-6-6m6 6-6 6"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4-4"/>`,
  bell: `<path d="M18 16.5v-5a6 6 0 1 0-12 0v5l-1.8 2h15.6z"/><path d="M10 20.4a2.2 2.2 0 0 0 4 0"/>`,
  info: `<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.2M12 7.9h.01"/>`,
  refresh: `<path d="M20.2 12a8.2 8.2 0 1 1-2.4-5.8"/><path d="M20.4 4.4v4.8h-4.8"/>`,
  download: `<path d="M12 3.8v11.4m0 0 4.2-4.2M12 15.2 7.8 11M4.5 20.2h15"/>`,
  upload: `<path d="M12 15.2V3.8m0 0 4.2 4.2M12 3.8 7.8 8M4.5 20.2h15"/>`,
  copy: `<rect x="9" y="9" width="11.5" height="11.5" rx="2.4"/><path d="M5.5 15H4.6A1.6 1.6 0 0 1 3 13.4V4.6A1.6 1.6 0 0 1 4.6 3h8.8A1.6 1.6 0 0 1 15 4.6v.9"/>`,
  calendar: `<rect x="3.4" y="5" width="17.2" height="15.6" rx="3"/><path d="M8 3v4M16 3v4M3.4 11h17.2"/>`,
  fire: `<path d="M12 3.2s5 4.6 5 9a5 5 0 0 1-10 0c0-1.7.8-3.1 1.8-4.3C9.6 9.2 12 7.3 12 3.2z"/>`,
  edit: `<path d="M4.2 20h4l9.6-9.6-4-4L4.2 16z"/><path d="m14 6.4 4 4"/>`,
  trash: `<path d="M4.5 7h15M9.5 7V5h5v2M6.6 7l1 13.2h8.8L17.4 7"/>`,
  target: `<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`,
  grid: `<rect x="3.5" y="3.5" width="7.4" height="7.4" rx="2.2"/><rect x="13.1" y="3.5" width="7.4" height="7.4" rx="2.2"/><rect x="3.5" y="13.1" width="7.4" height="7.4" rx="2.2"/><rect x="13.1" y="13.1" width="7.4" height="7.4" rx="2.2"/>`,
  layers: `<path d="m12 3.4 8.4 4.4L12 12.2 3.6 7.8z"/><path d="m3.6 12.4 8.4 4.4 8.4-4.4"/><path d="m3.6 16.6 8.4 4.4 8.4-4.4"/>`,
  pause: `<path d="M9.5 5.5v13M14.5 5.5v13"/>`,
  play: `<path d="M7.5 5.2 18.5 12l-11 6.8z"/>`,
  sliders: `<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.4"/><circle cx="15" cy="17" r="2.4"/>`,
  seal: `<path d="m12 3.4 2.4 1.8 3-.4 1 2.9 2.4 1.8-1 2.9 1 2.9-2.4 1.8-1 2.9-3-.4L12 21.4l-2.4-1.9-3 .4-1-2.9L3.2 15.2l1-2.9-1-2.9L5.6 7.6l1-2.9 3 .4z"/><path d="m9 12.3 2 2 4-4.4"/>`,
  lock: `<rect x="4.5" y="10.5" width="15" height="10.2" rx="3"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5"/>`,
  victory: `<path d="M7 4.5h10v4.4a5 5 0 0 1-10 0z"/><path d="M7 6H4.6a2.4 2.4 0 0 0 2.4 4M17 6h2.4a2.4 2.4 0 0 1-2.4 4"/><path d="M12 14.2V18M9 20.5h6"/>`,
};

export function icon(name, size = 24) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] || ICONS.sparkles;
  return svg;
}

export function iconHTML(name, size = 24) {
  return `${SVG_OPEN(size)}${ICONS[name] || ICONS.sparkles}</svg>`;
}

/* ------------------------------ الأرقام ------------------------------ */
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export function arNum(n) {
  return String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
}
export function arCount(n) {
  return arNum(Number(n || 0).toLocaleString('en-US'));
}

/** تحويل الأرقام العربية-الهندية إلى لاتينية (لقراءة حقول الإدخال) */
export function toLatinNum(str) {
  return String(str)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[^\d.-]/g, '');
}

/** حقل رقمي بأرقام عربية-هندية */
export function numberField({ value = 0, min = 0, max = 1e9, width = '86px', onCommit, label = '' } = {}) {
  const el = h('input', {
    type: 'text', inputmode: 'numeric', value: arNum(value),
    style: { width, textAlign: 'center' }, 'aria-label': label,
  });
  const commit = () => {
    const n = Number(toLatinNum(el.value));
    const v = Math.max(min, Math.min(max, Number.isFinite(n) ? n : value));
    el.value = arNum(v);
    onCommit?.(v);
  };
  el.addEventListener('change', commit);
  el.addEventListener('blur', commit);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
  return el;
}

/* ------------------------------ الاهتزاز والصوت ------------------------------ */
export function vibrate(pattern, enabled = true) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch { /* غير مدعوم */ }
}

let audioCtx = null;
export function chime(kind = 'tick', enabled = false) {
  if (!enabled) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const freq = kind === 'done' ? 880 : 1180;
    osc.frequency.setValueAtTime(freq, now);
    if (kind === 'done') osc.frequency.exponentialRampToValueAtTime(1320, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'done' ? 0.42 : 0.12));
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (kind === 'done' ? 0.45 : 0.14));
  } catch { /* تجاهل */ }
}

/* ------------------------------ التنبيهات ------------------------------ */
export function toast(message, { icon: ic = 'checkCircle', ms = 2600 } = {}) {
  let host = $('.toasts');
  if (!host) {
    host = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const el = h('div', { class: 'toast' }, icon(ic, 18), h('span', { text: message }));
  host.append(el);
  setTimeout(() => el.remove(), ms);
}

/* ------------------------------ الأوراق السفلية ------------------------------ */
export function sheet({ title, body, footer, onClose } = {}) {
  const backdrop = h('div', { class: 'sheet-backdrop' });
  const el = h('div', {
    class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'نافذة',
  },
    h('div', { class: 'sheet__grab' }),
    title ? h('div', { class: 'sheet__head' },
      h('h3', { class: 'sheet__title', text: title }),
      h('button', { class: 'icon-btn spacer', 'aria-label': 'إغلاق', onclick: () => close() }, icon('x', 20)),
    ) : null,
    h('div', { class: 'sheet__body' }, body || ''),
    footer ? h('div', { class: 'sheet__foot' }, footer) : null,
  );

  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    document.removeEventListener('keydown', onKey);
    el.classList.add('is-closing');
    backdrop.classList.add('is-closing');
    setTimeout(() => {
      el.remove();
      backdrop.remove();
      onClose?.();
    }, 260);
  }

  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop, el);
  el.querySelector('button, [tabindex]')?.focus?.({ preventScroll: true });
  return { el, close };
}

export function confirmDialog({ title, message, ok = 'تأكيد', cancel = 'إلغاء', danger = false } = {}) {
  return new Promise((resolve) => {
    const okBtn = h('button', { class: `btn btn--block ${danger ? 'btn--danger' : 'btn--primary'}`, text: ok });
    const cancelBtn = h('button', { class: 'btn btn--ghost', text: cancel });
    const s = sheet({
      title,
      body: h('p', { class: 'dim', text: message || '' }),
      footer: [cancelBtn, okBtn],
      onClose: () => resolve(false),
    });
    let decided = false;
    okBtn.addEventListener('click', () => { decided = true; s.close(); resolve(true); });
    cancelBtn.addEventListener('click', () => { decided = true; s.close(); resolve(false); });
    s.el.addEventListener('click', (e) => {
      if (e.target.closest('.sheet__head')) { /* لا شيء */ }
    });
    void decided;
  });
}

/* ------------------------------ احتفال ------------------------------ */
export function celebrate(intensity = 1) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = h('canvas', { class: 'confetti' });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const colors = ['#e7c77e', '#fff0c9', '#35e0b4', '#21c79c', '#c2923c', '#a8f0dc'];
  const parts = [];
  const count = Math.round(70 * intensity);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 3 + Math.random() * 8;
    parts.push({
      x: W / 2, y: H * 0.42,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
      r: 2.4 + Math.random() * 4,
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
      life: 1, square: Math.random() > 0.4,
    });
  }

  let raf = 0;
  const start = performance.now();
  (function frame(now) {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.16;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - t / 2.1);
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.square) ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (t < 2.2) raf = requestAnimationFrame(frame);
    else { cancelAnimationFrame(raf); canvas.remove(); }
  })(performance.now());

  setTimeout(() => canvas.remove(), 3000);
}

/* ------------------------------ الحواف ------------------------------ */
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = h('textarea', { value: text, style: { position: 'fixed', opacity: '0' } });
  document.body.append(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}
