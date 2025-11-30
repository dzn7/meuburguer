// Service Worker EXCLUSIVO para Painel do Entregador
const CACHE_VERSION = 'entregador-v1.1.0'
const CACHE_NAME = `meu-burguer-entregador-${CACHE_VERSION}`

// Assets essenciais para funcionamento offline
const ESSENTIAL_ASSETS = [
  '/entregador',
  '/offline-entregador.html',
  '/assets/meuburger.png',
]

// Tempo máximo de cache (3 minutos - mais curto para dados em tempo real)
const MAX_CACHE_AGE = 3 * 60 * 1000

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW Entregador] Instalando versão:', CACHE_VERSION)
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW Entregador] Cache criado')
        return cache.addAll(ESSENTIAL_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW Entregador] Ativando versão:', CACHE_VERSION)
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes('entregador') && cacheName !== CACHE_NAME) {
              console.log('[SW Entregador] Removendo cache antigo:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Interceptar requisições - Network First para dados em tempo real
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições de outras origens
  if (url.origin !== location.origin) {
    return
  }

  // Apenas processa requisições do /entregador
  if (!url.pathname.startsWith('/entregador')) {
    return
  }

  // Requisições do Supabase sempre vão direto para rede
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api')) {
    return event.respondWith(fetch(request))
  }

  // Network First com timeout curto
  event.respondWith(networkFirstWithTimeout(request))
})

// Network First com timeout
async function networkFirstWithTimeout(request) {
  const TIMEOUT = 3000

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

    const networkResponse = await fetch(request, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      const responseToCache = networkResponse.clone()
      const headers = new Headers(responseToCache.headers)
      headers.append('sw-cache-time', Date.now().toString())
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      })
      
      cache.put(request, modifiedResponse)
    }

    return networkResponse
  } catch (error) {
    console.log('[SW Entregador] Rede falhou, tentando cache:', request.url)

    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      const cacheTime = cachedResponse.headers.get('sw-cache-time')
      if (cacheTime) {
        const age = Date.now() - parseInt(cacheTime)
        if (age > MAX_CACHE_AGE) {
          console.log('[SW Entregador] Cache expirado')
          const cache = await caches.open(CACHE_NAME)
          cache.delete(request)
        } else {
          return cachedResponse
        }
      } else {
        return cachedResponse
      }
    }

    if (request.mode === 'navigate') {
      return caches.match('/offline-entregador.html')
    }

    throw error
  }
}

// Listener para mensagens
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW Entregador] Forçando atualização')
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW Entregador] Limpando cache')
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes('entregador')) {
              return caches.delete(cacheName)
            }
          })
        )
      })
    )
  }
})

// Listener para push notifications
self.addEventListener('push', (event) => {
  console.log('[SW Entregador] Push recebido:', event)
  
  let data = {
    title: '🛵 Nova Entrega!',
    body: 'Você tem uma nova entrega disponível',
    icon: '/assets/meuburger.png',
    badge: '/assets/meuburger.png',
    tag: 'nova-entrega',
    data: { url: '/entregador' }
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = { ...data, ...payload }
    } catch (e) {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: data.data
    })
  )
})

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Entregador] Notificação clicada:', event.notification.tag)
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/entregador'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Tenta focar em janela existente
        for (const client of clientList) {
          if (client.url.includes('/entregador') && 'focus' in client) {
            client.navigate(urlToOpen)
            return client.focus()
          }
        }
        // Abre nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Fechar notificação
self.addEventListener('notificationclose', (event) => {
  console.log('[SW Entregador] Notificação fechada:', event.notification.tag)
})
