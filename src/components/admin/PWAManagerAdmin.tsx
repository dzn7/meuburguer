'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function PWAManagerAdmin() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)

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

      // Listener para quando o novo SW assumir controle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA Admin] Novo Service Worker ativado')
        // Recarrega apenas uma vez quando o controle mudar
        if (!isUpdating) {
          window.location.reload()
        }
      })

    } catch (error) {
      console.error('[PWA Admin] Erro ao registrar Service Worker:', error)
    }
  }

  const handleUpdate = async () => {
    if (!registration?.waiting) {
      console.warn('[PWA Admin] Nenhuma atualização disponível')
      setUpdateAvailable(false)
      return
    }

    try {
      setIsUpdating(true)
      console.log('[PWA Admin] Ativando nova versão...')
      
      // Envia mensagem para o SW waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // O reload será feito pelo listener 'controllerchange'
    } catch (error) {
      console.error('[PWA Admin] Erro ao atualizar:', error)
      setIsUpdating(false)
      // Em caso de erro, força reload
      window.location.reload()
    }
  }

  const clearCache = async () => {
    try {
      setIsClearingCache(true)
      console.log('[PWA Admin] Limpando cache...')
      
      // Limpa todos os caches
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.includes('admin')) {
            console.log('[PWA Admin] Removendo cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
      
      // Envia mensagem para o SW
      if (registration?.active) {
        registration.active.postMessage({ type: 'CLEAR_CACHE' })
      }
      
      // Aguarda um pouco e recarrega
      setTimeout(() => {
        console.log('[PWA Admin] Cache limpo, recarregando...')
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('[PWA Admin] Erro ao limpar cache:', error)
      setIsClearingCache(false)
      window.location.reload()
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
              <RefreshCw className={`w-4 h-4 ${isUpdating || isClearingCache ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Atualizando...' : isClearingCache ? 'Limpando cache...' : 'Nova versão disponível!'}
            </h4>
            <p className="text-sm text-dourado-100">
              {isUpdating 
                ? 'Aguarde, estamos aplicando as melhorias...' 
                : isClearingCache
                ? 'Removendo arquivos em cache...'
                : 'Atualize para ter acesso às últimas melhorias.'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating || isClearingCache}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm
                       ${isUpdating || isClearingCache
                         ? 'bg-dourado-300 text-dourado-700 cursor-not-allowed opacity-75' 
                         : 'bg-white text-dourado-600 hover:bg-dourado-50 hover:shadow-lg'}`}
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
            <button
              onClick={clearCache}
              disabled={isUpdating || isClearingCache}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap text-xs
                       ${isUpdating || isClearingCache
                         ? 'bg-dourado-800 text-dourado-300 cursor-not-allowed opacity-75' 
                         : 'bg-dourado-700 text-white hover:bg-dourado-800 hover:shadow-lg'}`}
            >
              {isClearingCache ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Limpando
                </span>
              ) : (
                'Limpar Cache'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
