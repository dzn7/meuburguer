// Service Worker com versionamento inteligente
const CACHE_VERSION = 'v1.0.0'
const CACHE_NAME = `meu-burguer-${CACHE_VERSION}`
const ADMIN_CACHE_NAME = `meu-burguer-admin-${CACHE_VERSION}`

// Arquivos para cache do cliente
const CLIENT_ASSETS = [
  '/',
  '/offline.html',
]

// Arquivos para cache do admin
const ADMIN_ASSETS = [
  '/admin/dashboard',
  '/admin/pedidos',
  '/admin/produtos',
]

// Estratégia de cache
const CACHE_STRATEGIES = {
  NETWORK_FIRST: 'network-first',
  CACHE_FIRST: 'cache-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
}

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versão:', CACHE_VERSION)
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Cache cliente criado')
        return cache.addAll(CLIENT_ASSETS)
      }),
      caches.open(ADMIN_CACHE_NAME).then((cache) => {
        console.log('[SW] Cache admin criado')
        return cache.addAll(ADMIN_ASSETS)
      })
    ]).then(() => {
      // Força ativação imediata
      return self.skipWaiting()
    })
  )
})

// Ativar Service Worker e limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando versão:', CACHE_VERSION)
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remove caches de versões antigas
          if (cacheName !== CACHE_NAME && cacheName !== ADMIN_CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Toma controle de todas as páginas imediatamente
      return self.clients.claim()
    })
  )
})

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições de outras origens
  if (url.origin !== location.origin) {
    return
  }

  // Ignora requisições do Supabase (sempre busca da rede)
  if (url.hostname.includes('supabase')) {
    return event.respondWith(fetch(request))
  }

  // Determina estratégia baseada no tipo de requisição
  if (url.pathname.startsWith('/admin')) {
    event.respondWith(networkFirst(request, ADMIN_CACHE_NAME))
  } else if (url.pathname.startsWith('/_next/static')) {
    event.respondWith(cacheFirst(request, CACHE_NAME))
  } else if (url.pathname.startsWith('/api')) {
    event.respondWith(networkOnly(request))
  } else {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME))
  }
})

// Estratégia: Network First (tenta rede primeiro, fallback para cache)
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, usando cache:', request.url)
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Retorna página offline se disponível
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }
    
    throw error
  }
}

// Estratégia: Cache First (usa cache primeiro, fallback para rede)
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Falha ao buscar:', request.url)
    throw error
  }
}

// Estratégia: Stale While Revalidate (retorna cache e atualiza em background)
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request)
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.ok) {
      try {
        const cache = await caches.open(cacheName)
        // Clone antes de usar
        await cache.put(request, networkResponse.clone())
      } catch (error) {
        console.warn('[SW] Erro ao cachear:', error)
      }
    }
    return networkResponse
  }).catch((error) => {
    console.warn('[SW] Fetch falhou:', error)
    return cachedResponse
  })
  
  return cachedResponse || fetchPromise
}

// Estratégia: Network Only (sempre busca da rede)
async function networkOnly(request) {
  return fetch(request)
}

// Listener para mensagens (atualização forçada)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      })
    )
  }
})

// Push Notifications para Admin
self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido:', event)
  
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Novo Pedido!'
  const options = {
    body: data.body || 'Você tem um novo pedido',
    icon: '/assets/favicon/android-chrome-192x192.png',
    badge: '/assets/favicon/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'novo-pedido',
    requireInteraction: true,
    data: {
      url: data.url || '/admin/pedidos'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver Pedido'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event)
  
  event.notification.close()
  
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data.url
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Verifica se já existe uma janela aberta
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Abre nova janela
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
    )
  }
})
