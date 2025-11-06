'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function PWAManager() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // Listener para quando o novo SW assumir controle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Novo Service Worker ativado')
        // Recarrega apenas uma vez quando o controle mudar
        if (!isUpdating) {
          window.location.reload()
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

  const handleUpdate = async () => {
    if (!registration?.waiting) {
      console.warn('[PWA] Nenhuma atualização disponível')
      setUpdateAvailable(false)
      return
    }

    try {
      setIsUpdating(true)
      console.log('[PWA] Iniciando atualização...')
      
      // Envia mensagem para o SW waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // O reload será feito pelo listener 'controllerchange'
    } catch (error) {
      console.error('[PWA] Erro ao atualizar:', error)
      setIsUpdating(false)
      // Em caso de erro, força reload
      window.location.reload()
    }
  }

  // Banner de atualização
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[10001] 
                    bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl shadow-2xl p-4 
                    border border-amber-400 animate-slide-up">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-bold mb-1 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Atualizando...' : 'Nova versão disponível!'}
            </h4>
            <p className="text-sm text-amber-100">
              {isUpdating 
                ? 'Aguarde, estamos aplicando as melhorias...' 
                : 'Clique em atualizar para ter acesso às últimas melhorias.'}
            </p>
          </div>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap
                     ${isUpdating 
                       ? 'bg-amber-300 text-amber-700 cursor-not-allowed opacity-75' 
                       : 'bg-white text-amber-600 hover:bg-amber-50 hover:shadow-lg'}`}
          >
            {isUpdating ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Atualizando
              </span>
            ) : (
              'Atualizar'
            )}
          </button>
        </div>
      </div>
    )
  }

  return null
}
