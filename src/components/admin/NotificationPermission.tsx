'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, X, Check, Volume2, VolumeX } from 'lucide-react'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  testNotification,
} from '@/lib/push-notifications'
import { supabase } from '@/lib/supabase'

type NotificationPreferences = {
  notifications_enabled: boolean
  push_enabled: boolean
  sound_enabled: boolean
  new_order_notifications: boolean
  status_change_notifications: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notifications_enabled: false,
  push_enabled: false,
  sound_enabled: true,
  new_order_notifications: true,
  status_change_notifications: true,
}

/**
 * Componente único de permissões e preferências de notificações
 * Responsável por solicitar, salvar preferências e emitir teste
 */
export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showIndicator, setShowIndicator] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)

  const notificationsActive = permission === 'granted' && preferences.notifications_enabled
  const isPermissionDenied = permission === 'denied'
  const isActionPending = loading || savingPreferences

  const openPanel = () => setIsPanelOpen(true)
  const closePanel = () => {
    if (isActionPending) return
    setIsPanelOpen(false)
  }

  const toggleSound = async () => {
    await savePreferences({
      ...preferences,
      sound_enabled: !preferences.sound_enabled,
    })
  }

  const handleDisableNotifications = async () => {
    await savePreferences({
      ...preferences,
      notifications_enabled: false,
      push_enabled: false,
    })
    setShowIndicator(false) // Não mostrar indicador após desabilitar
    setShowSuccessMessage(false)
    setIsPanelOpen(false)
  }

  const handleFloatingButtonClick = () => {
    if (isActionPending) return
    setShowBanner(false)
    openPanel()
  }

  useEffect(() => {
    console.log('[NotificationPermission] Inicializando componente')
    const supported = isNotificationSupported()
    setIsSupported(supported)

    if (!supported) {
      console.log('[NotificationPermission] Notificações não suportadas neste navegador')
      return
    }

    const currentPermission = getNotificationPermission()
    setPermission(currentPermission)
    console.log('[NotificationPermission] Permissão atual:', currentPermission)

    let timer: ReturnType<typeof setTimeout> | undefined

    const storedUserId = localStorage.getItem('admin_user_id')
    if (storedUserId) {
      setUserId(storedUserId)
    } else {
      const newUserId = `admin_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
      localStorage.setItem('admin_user_id', newUserId)
      setUserId(newUserId)
    }

    const hasAsked = localStorage.getItem('notification-permission-asked')
    console.log('[NotificationPermission] Já foi perguntado?', hasAsked)

    // Não mostrar indicador se já tiver permissão
    if (currentPermission === 'granted') {
      console.log('[NotificationPermission] Permissão granted - escondendo indicador')
      setShowIndicator(false)
    } else if (currentPermission === 'default') {
      // Só mostrar indicador se não tiver sido perguntado ainda
      const shouldShow = !hasAsked
      console.log('[NotificationPermission] Permissão default - mostrar indicador?', shouldShow)
      setShowIndicator(shouldShow)
    } else {
      console.log('[NotificationPermission] Permissão negada - escondendo indicador')
      setShowIndicator(false)
    }

    if (currentPermission === 'default' && !hasAsked) {
      timer = setTimeout(() => {
        console.log('[NotificationPermission] Mostrando banner após 3s')
        setShowBanner(true)
      }, 3000)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [])

  const loadPreferences = useCallback(async (uid: string) => {
    try {
      console.log('[NotificationPermission] Carregando preferências para userId:', uid)
      const { data, error } = await supabase
        .from('notification_preferences')
        .select(
          'notifications_enabled, push_enabled, sound_enabled, new_order_notifications, status_change_notifications'
        )
        .eq('user_id', uid)
        .single()

      const currentPermission = getNotificationPermission()
      setPermission(currentPermission)
      console.log('[NotificationPermission] Preferências carregadas:', { data, currentPermission })

      if (error && (error as any).code !== 'PGRST116') {
        console.error('[Notificações] Erro ao carregar preferências:', error)
        setPreferences(DEFAULT_PREFERENCES)
        // Em caso de erro, só mostrar se for default e não foi perguntado
        if (currentPermission === 'default') {
          const hasAsked = localStorage.getItem('notification-permission-asked')
          setShowIndicator(!hasAsked)
        } else {
          setShowIndicator(false)
        }
        return
      }

      if (data) {
        const mergedPreferences: NotificationPreferences = {
          ...DEFAULT_PREFERENCES,
          ...data,
        }
        setPreferences(mergedPreferences)

        // Só mostrar indicador se:
        // 1. Permissão granted mas notificações desabilitadas
        // 2. Permissão default e nunca foi perguntado
        if (currentPermission === 'granted') {
          setShowIndicator(!mergedPreferences.notifications_enabled)
        } else if (currentPermission === 'default') {
          const hasAsked = localStorage.getItem('notification-permission-asked')
          setShowIndicator(!hasAsked)
        } else {
          setShowIndicator(false)
        }
      } else {
        setPreferences(DEFAULT_PREFERENCES)
        // Mesma lógica para quando não há dados
        if (currentPermission === 'granted') {
          setShowIndicator(false) // Se granted mas sem preferências, não mostrar
        } else if (currentPermission === 'default') {
          const hasAsked = localStorage.getItem('notification-permission-asked')
          setShowIndicator(!hasAsked)
        } else {
          setShowIndicator(false)
        }
      }
    } catch (error) {
      console.error('[Notificações] Erro inesperado ao carregar preferências:', error)
    }
  }, [])

  const savePreferences = useCallback(
    async (newPreferences: NotificationPreferences) => {
      if (!userId) return

      try {
        setSavingPreferences(true)
        const { error } = await supabase
          .from('notification_preferences')
          .upsert({
            user_id: userId,
            ...newPreferences,
          })

        if (error) throw error

        setPreferences(newPreferences)
      } catch (error) {
        console.error('[Notificações] Erro ao salvar preferências:', error)
      } finally {
        setSavingPreferences(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    if (!userId || !isSupported) return
    void loadPreferences(userId)
  }, [userId, isSupported, loadPreferences])

  useEffect(() => {
    if (!showSuccessMessage) return

    const timeout = setTimeout(() => {
      setShowSuccessMessage(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [showSuccessMessage])

  useEffect(() => {
    if (!isSupported) return

    console.log('[NotificationPermission] useEffect - permission/preferences mudou:', {
      permission,
      notifications_enabled: preferences.notifications_enabled,
      showIndicator
    })

    // Só atualizar indicador se a permissão for granted
    // Para 'default', deixar a lógica inicial do primeiro useEffect
    if (permission === 'granted') {
      const shouldShow = !preferences.notifications_enabled
      console.log('[NotificationPermission] Permissão granted - atualizar indicador para:', shouldShow)
      setShowIndicator(shouldShow)
    }
  }, [permission, preferences.notifications_enabled, isSupported])

  const handleRequestPermission = async () => {
    setLoading(true)
    try {
      const granted = await requestNotificationPermission()
      localStorage.setItem('notification-permission-asked', 'true')

      if (granted) {
        setPermission('granted')

        const updatedPreferences: NotificationPreferences = {
          ...preferences,
          notifications_enabled: true,
          push_enabled: true,
        }

        await savePreferences(updatedPreferences)

        setShowBanner(false)
        setShowIndicator(false)
        setShowSuccessMessage(true)
        openPanel()

        await testNotification()
        setTimeout(() => {
          setIsPanelOpen(false)
        }, 3200)
      } else {
        setPermission('denied')
        setShowBanner(false)
        setShowIndicator(false)

        if (preferences.notifications_enabled) {
          await savePreferences({
            ...preferences,
            notifications_enabled: false,
            push_enabled: false,
          })
        }
      }
    } catch (error) {
      console.error('[Notificações] Erro ao solicitar permissão:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setShowIndicator(false) // Esconder indicador também
    localStorage.setItem('notification-permission-asked', 'true')
  }

  // Só mostrar botão flutuante se não estiver com painel aberto e não tiver indicador
  const shouldShowFloatingButton = !isPanelOpen && !showIndicator

  const floatingButtonClass = notificationsActive
    ? 'fixed bottom-6 right-6 z-[9998] px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full shadow-2xl hover:shadow-amber-500/40 transition-all duration-300 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
    : isPermissionDenied
    ? 'fixed bottom-6 right-6 z-[9998] px-4 py-3 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 transition-all duration-300 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
    : 'fixed bottom-6 right-6 z-[9998] px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 flex items-center gap-2 animate-pulse disabled:opacity-60 disabled:cursor-not-allowed'

  const floatingButtonLabel = notificationsActive
    ? 'Notificações'
    : isPermissionDenied
    ? 'Permissão negada'
    : 'Ativar notificações'

  return (
    <>
      {shouldShowFloatingButton && notificationsActive && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: isActionPending ? 1 : 1.05 }}
          whileTap={{ scale: isActionPending ? 1 : 0.97 }}
          onClick={handleFloatingButtonClick}
          disabled={isActionPending || !isSupported}
          className={floatingButtonClass}
        >
          <Bell className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-medium">{floatingButtonLabel}</span>
        </motion.button>
      )}

      <AnimatePresence>
        {showBanner && !isPanelOpen && permission !== 'denied' && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[10000] sm:w-full sm:max-w-md"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-1 sm:mb-2">
                    Ativar notificações?
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-3 sm:mb-4">
                    Receba alertas de novos pedidos, mesmo com o dashboard minimizado.
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleRequestPermission}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 
                               bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed
                               text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      {loading ? 'Ativando...' : 'Ativar'}
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2.5 border border-zinc-300 dark:border-zinc-700 
                               hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIndicator && permission !== 'denied' && !isPanelOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[9998]"
          >
            <button
              onClick={handleFloatingButtonClick}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 flex items-center gap-2 animate-pulse"
              title="Ativar notificações"
            >
              <Bell className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Ativar notificações</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-4 z-[9999]"
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl shadow-lg">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Notificações ativadas com sucesso!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Painel de Configurações */}
      <AnimatePresence>
        {isPanelOpen && notificationsActive && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md mx-4"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Bell className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">Notificações Ativas</h3>
                    </div>
                    <button
                      onClick={closePanel}
                      className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-green-50 text-sm">
                    Você está recebendo alertas em tempo real
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Sistema Ativo
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Recebendo notificações de novos pedidos
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {preferences.sound_enabled ? (
                          <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-zinc-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            Som das Notificações
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {preferences.sound_enabled ? 'Ativado' : 'Desativado'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={toggleSound}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                 ${preferences.sound_enabled ? 'bg-amber-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                   ${preferences.sound_enabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleDisableNotifications}
                    disabled={loading}
                    className="w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400
                             bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30
                             rounded-xl transition-colors flex items-center justify-center gap-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BellOff className="w-4 h-4" />
                    Desativar Notificações
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
