'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function PWAManagerAdmin() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      // Desregistra service workers antigos
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        if (reg.scope.includes('/admin') || !reg.scope.endsWith('/admin/')) {
          console.log('[PWA Admin] Desregistrando SW antigo:', reg.scope)
          await reg.unregister()
        }
      }

      // Registra novo service worker específico para admin
      const reg = await navigator.serviceWorker.register('/sw-admin.js', {
        scope: '/admin/',
        updateViaCache: 'none'
      })

      console.log('[PWA Admin] Service Worker registrado:', reg.scope)
      setRegistration(reg)

      // Força atualização imediata
      await reg.update()

      // Verifica atualizações a cada 30 segundos
      setInterval(() => {
        reg.update()
      }, 30000)

      // Listener para atualizações
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA Admin] Nova versão disponível')
              setUpdateAvailable(true)
            }
          })
        }
      })

    } catch (error) {
      console.error('[PWA Admin] Erro ao registrar Service Worker:', error)
    }
  }

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Aguarda o novo SW assumir controle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }

  const clearCache = async () => {
    if (registration) {
      registration.active?.postMessage({ type: 'CLEAR_CACHE' })
      
      // Aguarda um pouco e recarrega
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }

  // Banner de atualização
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[10001] 
                    bg-gradient-to-r from-dourado-600 to-dourado-500 text-white rounded-xl shadow-2xl p-4 
                    border border-dourado-400 animate-slide-up">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-bold mb-1 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Nova versão disponível!
            </h4>
            <p className="text-sm text-dourado-100">
              Atualize para ter acesso às últimas melhorias.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-white text-dourado-600 rounded-lg font-medium 
                       hover:bg-dourado-50 transition-colors whitespace-nowrap text-sm"
            >
              Atualizar
            </button>
            <button
              onClick={clearCache}
              className="px-4 py-1.5 bg-dourado-700 text-white rounded-lg font-medium 
                       hover:bg-dourado-800 transition-colors whitespace-nowrap text-xs"
            >
              Limpar Cache
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
