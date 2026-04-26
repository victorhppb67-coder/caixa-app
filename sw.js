const CACHE_NAME = 'caixa-app-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Instalação do service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache aberto');
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        console.log('[SW] Alguns arquivos não puderam ser cacheados');
      });
    })
  );
  self.skipWaiting();
});

// Ativação do service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar requisições de outros domínios
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        console.log('[SW] Retornando do cache:', request.url);
        return response;
      }

      return fetch(request).then((response) => {
        // Não cachear respostas não-sucesso
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clonar a resposta
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Retornar página offline se existir
        console.log('[SW] Offline - retornando do cache');
        return caches.match(request);
      });
    })
  );
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
