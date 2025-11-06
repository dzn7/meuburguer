'use client'

import { useEffect, useState, useRef } from 'react'
import { RefreshCw } from 'lucide-react'

// Flag global para prevenir múltiplos reloads
let isReloading = false

export default function PWAManagerAdmin() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const controllerChangeHandledRef = useRef(false)
  const updateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Previne execução no servidor
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Verifica se já está recarregando
    const reloadFlag = sessionStorage.getItem('pwa_reloading')
    if (reloadFlag === 'true') {
      console.log('[PWA Admin] Reload em progresso, aguardando...')
      sessionStorage.removeItem('pwa_reloading')
      return
    }

    registerServiceWorker()

    // Cleanup ao desmontar
    return () => {
      if (updateCheckIntervalRef.current) {
        clearInterval(updateCheckIntervalRef.current)
      }
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      console.log('[PWA Admin] Iniciando registro do Service Worker')

      // Registra o service worker
      const reg = await navigator.serviceWorker.register('/sw-admin.js', {
        scope: '/admin/',
        updateViaCache: 'none'
      })

      console.log('[PWA Admin] Service Worker registrado com sucesso')
      setRegistration(reg)

      // Verifica se já existe uma atualização esperando
      if (reg.waiting) {
        console.log('[PWA Admin] Atualização já disponível')
        setUpdateAvailable(true)
      }

      // Listener para novas atualizações encontradas
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        console.log('[PWA Admin] Nova atualização encontrada')
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('[PWA Admin] Estado do novo SW:', newWorker.state)
            
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA Admin] Nova versão instalada e pronta')
              setUpdateAvailable(true)
            }
          })
        }
      })

      // Listener único para mudança de controller
      // Usa addEventListener apenas uma vez
      const handleControllerChange = () => {
        console.log('[PWA Admin] Controller mudou')
        
        // Previne múltiplas execuções
        if (controllerChangeHandledRef.current || isReloading) {
          console.log('[PWA Admin] Controller change já tratado, ignorando')
          return
        }

        controllerChangeHandledRef.current = true
        isReloading = true
        
        // Marca no sessionStorage para prevenir loops
        sessionStorage.setItem('pwa_reloading', 'true')
        
        console.log('[PWA Admin] Recarregando página após atualização...')
        
        // Pequeno delay para garantir que o novo SW assumiu controle
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }

      // Remove listener anterior se existir
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      // Adiciona novo listener
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

      // Verifica atualizações periodicamente (60 segundos)
      updateCheckIntervalRef.current = setInterval(() => {
        console.log('[PWA Admin] Verificando atualizações...')
        reg.update().catch(err => {
          console.warn('[PWA Admin] Erro ao verificar atualização:', err)
        })
      }, 60000)

    } catch (error) {
      console.error('[PWA Admin] Erro ao registrar Service Worker:', error)
    }
  }

  const handleUpdate = async () => {
    if (!registration?.waiting) {
      console.warn('[PWA Admin] Nenhum SW esperando')
      setUpdateAvailable(false)
      return
    }

    try {
      setIsUpdating(true)
      console.log('[PWA Admin] Enviando SKIP_WAITING para o SW')
      
      // Envia mensagem para o SW waiting pular a espera
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // O reload será automático via controllerchange
    } catch (error) {
      console.error('[PWA Admin] Erro ao atualizar:', error)
      setIsUpdating(false)
      setUpdateAvailable(false)
    }
  }

  const clearCache = async () => {
    if (isClearingCache || isReloading) {
      console.log('[PWA Admin] Já está limpando cache ou recarregando')
      return
    }

    try {
      setIsClearingCache(true)
      isReloading = true
      console.log('[PWA Admin] Iniciando limpeza de cache...')
      
      // Limpa todos os caches do admin
      const cacheNames = await caches.keys()
      const adminCaches = cacheNames.filter(name => name.includes('admin'))
      
      console.log('[PWA Admin] Caches a remover:', adminCaches)
      
      await Promise.all(
        adminCaches.map(cacheName => {
          console.log('[PWA Admin] Removendo cache:', cacheName)
          return caches.delete(cacheName)
        })
      )
      
      // Envia mensagem para o SW limpar cache também
      if (registration?.active) {
        registration.active.postMessage({ type: 'CLEAR_CACHE' })
      }
      
      console.log('[PWA Admin] Cache limpo com sucesso')
      
      // Marca reload e recarrega
      sessionStorage.setItem('pwa_reloading', 'true')
      
      setTimeout(() => {
        window.location.reload()
      }, 300)
      
    } catch (error) {
      console.error('[PWA Admin] Erro ao limpar cache:', error)
      setIsClearingCache(false)
      isReloading = false
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
