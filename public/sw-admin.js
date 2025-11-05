// Service Worker EXCLUSIVO para Admin Dashboard
const CACHE_VERSION = 'admin-v1.0.1'
const CACHE_NAME = `meu-burguer-admin-${CACHE_VERSION}`

// Cache mínimo - apenas essenciais
const ESSENTIAL_ASSETS = [
  '/admin/dashboard',
  '/offline.html',
]

// Tempo máximo de cache (5 minutos)
const MAX_CACHE_AGE = 5 * 60 * 1000

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW Admin] Instalando versão:', CACHE_VERSION)
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW Admin] Cache criado')
        return cache.addAll(ESSENTIAL_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Ativar e limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW Admin] Ativando versão:', CACHE_VERSION)
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Remove TODOS os caches antigos do admin
            if (cacheName.includes('admin') && cacheName !== CACHE_NAME) {
              console.log('[SW Admin] Removendo cache antigo:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Interceptar requisições - NETWORK FIRST sempre
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições de outras origens
  if (url.origin !== location.origin) {
    return
  }

  // Apenas processa requisições do /admin
  if (!url.pathname.startsWith('/admin')) {
    return
  }

  // Ignora requisições do Supabase (sempre rede)
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api')) {
    return event.respondWith(fetch(request))
  }

  // SEMPRE tenta rede primeiro para admin
  event.respondWith(networkFirstWithTimeout(request))
})

// Network First com timeout curto
async function networkFirstWithTimeout(request) {
  const TIMEOUT = 3000 // 3 segundos

  try {
    // Tenta buscar da rede com timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

    const networkResponse = await fetch(request, {
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // Se sucesso, atualiza cache
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      
      // Adiciona timestamp ao cache
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
    console.log('[SW Admin] Rede falhou, tentando cache:', request.url)

    // Busca do cache
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      // Verifica idade do cache
      const cacheTime = cachedResponse.headers.get('sw-cache-time')
      if (cacheTime) {
        const age = Date.now() - parseInt(cacheTime)
        if (age > MAX_CACHE_AGE) {
          console.log('[SW Admin] Cache expirado, removendo')
          const cache = await caches.open(CACHE_NAME)
          cache.delete(request)
          throw new Error('Cache expirado')
        }
      }

      return cachedResponse
    }

    // Retorna página offline para navegação
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
    }

    throw error
  }
}

// Listener para mensagens (forçar atualização)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW Admin] Forçando atualização')
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW Admin] Limpando cache')
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes('admin')) {
              return caches.delete(cacheName)
            }
          })
        )
      })
    )
  }
})

// Listener para notificações
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Admin] Notificação clicada:', event.notification.tag)
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/admin/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Tenta focar em janela existente
        for (const client of clientList) {
          if (client.url.includes('/admin') && 'focus' in client) {
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
