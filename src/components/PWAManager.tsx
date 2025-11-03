'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PWAManager() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('[PWA] Service Worker registrado:', reg.scope)
      setRegistration(reg)

      // Verificar atualizações a cada 60 segundos
      setInterval(() => {
        reg.update()
      }, 60000)

      // Listener para atualizações
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nova versão disponível')
              setUpdateAvailable(true)
            }
          })
        }
      })

      // Solicitar permissão para notificações (apenas admin)
      if (isAdmin && 'Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        console.log('[PWA] Permissão de notificação:', permission)
      }

    } catch (error) {
      console.error('[PWA] Erro ao registrar Service Worker:', error)
    }
  }

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  // Banner de atualização
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[10001] 
                    bg-amber-600 text-white rounded-lg shadow-2xl p-4 animate-slide-up">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="font-bold mb-1">Nova versão disponível!</h4>
            <p className="text-sm text-amber-100">
              Atualize para ter acesso às últimas melhorias.
            </p>
          </div>
          <button
            onClick={handleUpdate}
            className="px-4 py-2 bg-white text-amber-600 rounded-lg font-medium 
                     hover:bg-amber-50 transition-colors whitespace-nowrap"
          >
            Atualizar
          </button>
        </div>
      </div>
    )
  }

  return null
}
