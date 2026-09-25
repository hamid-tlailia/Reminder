/* عامل الخدمة (Service Worker) لتطبيق «وِردي»
   - يخزّن هيكل التطبيق ليعمل بدون إنترنت بعد أول زيارة
   - يخزّن صفحات القرآن المُحمَّلة (stale-while-revalidate)
*/
const VERSION = 'wirdi-v2';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const QURAN = `${VERSION}-quran`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles/main.css',
  './src/app.js',
  './src/store.js',
  './src/data/adhkar.js',
  './src/data/quran-meta.js',
  './src/ui/dom.js',
  './src/ui/widgets.js',
  './src/views/today.js',
  './src/views/library.js',
  './src/views/tasbeeh.js',
  './src/views/quran.js',
  './src/views/stats.js',
  './src/views/settings.js',
  './assets/icons/favicon-32.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // نص القرآن: من الكاش أولًا مع تحديث في الخلفية
  if (url.hostname.endsWith('alquran.cloud')) {
    event.respondWith(
      caches.open(QURAN).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || new Response(
          JSON.stringify({ code: 503, status: 'OFFLINE' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // طلبات التنقل: هيكل التطبيق
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // الأصول الثابتة (صور/خطوط): كاش أولًا ثم الشبكة
  const isStatic = /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/i.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => cached || Response.error()))
    );
    return;
  }

  // بقية أصول التطبيق (JS/CSS/HTML): الشبكة أولًا مع الرجوع للكاش —
  // يضمن الحصول على آخر نسخة أثناء التطوير، ويعمل بدون إنترنت بعده.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('./index.html')))
  );
});
