'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X, Check, Volume2, VolumeX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { requestNotificationPermission } from '@/lib/notifications'

type NotificationPreferences = {
  notifications_enabled: boolean
  push_enabled: boolean
  sound_enabled: boolean
  new_order_notifications: boolean
  status_change_notifications: boolean
}

export default function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notifications_enabled: false,
    push_enabled: false,
    sound_enabled: true,
    new_order_notifications: true,
    status_change_notifications: true,
  })
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    // Gera ou recupera um ID único para o usuário
    const storedUserId = localStorage.getItem('admin_user_id')
    if (storedUserId) {
      setUserId(storedUserId)
      loadPreferences(storedUserId)
    } else {
      const newUserId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('admin_user_id', newUserId)
      setUserId(newUserId)
    }

    // Verifica permissão de notificação do navegador
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  const loadPreferences = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', uid)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar preferências:', error)
        return
      }

      if (data) {
        setPreferences({
          notifications_enabled: data.notifications_enabled,
          push_enabled: data.push_enabled,
          sound_enabled: data.sound_enabled,
          new_order_notifications: data.new_order_notifications,
          status_change_notifications: data.status_change_notifications,
        })
        setNotificationsEnabled(data.notifications_enabled)
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error)
    }
  }

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...newPreferences,
        })

      if (error) throw error

      setPreferences(newPreferences)
      console.log('[Notificações] Preferências salvas com sucesso')
    } catch (error) {
      console.error('Erro ao salvar preferências:', error)
    }
  }

  const handleEnableNotifications = async () => {
    setLoading(true)
    try {
      const permission = await requestNotificationPermission()
      
      if (permission === 'granted') {
        const newPreferences = {
          ...preferences,
          notifications_enabled: true,
          push_enabled: true,
        }
        await savePreferences(newPreferences)
        setNotificationsEnabled(true)
        setShowSuccessMessage(true)
        
        // Oculta mensagem de sucesso após 3 segundos
        setTimeout(() => {
          setShowSuccessMessage(false)
          setIsOpen(false)
        }, 3000)
      } else {
        alert('Permissão de notificação negada. Por favor, habilite nas configurações do navegador.')
      }
    } catch (error) {
      console.error('Erro ao habilitar notificações:', error)
      alert('Erro ao habilitar notificações. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setLoading(true)
    try {
      const newPreferences = {
        ...preferences,
        notifications_enabled: false,
        push_enabled: false,
      }
      await savePreferences(newPreferences)
      setNotificationsEnabled(false)
      setIsOpen(false)
    } catch (error) {
      console.error('Erro ao desabilitar notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSound = async () => {
    const newPreferences = {
      ...preferences,
      sound_enabled: !preferences.sound_enabled,
    }
    await savePreferences(newPreferences)
  }

  // Se notificações já estão habilitadas, não mostra o botão
  if (notificationsEnabled && !isOpen) {
    return null
  }

  return (
    <>
      {/* Botão flutuante */}
      {!notificationsEnabled && !isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] p-4 bg-gradient-to-r from-amber-500 to-amber-600 
                   text-white rounded-full shadow-2xl hover:shadow-amber-500/50 transition-all duration-300
                   flex items-center gap-2 group"
          title="Ativar notificações"
        >
          <Bell className="w-6 h-6 animate-pulse" />
          <span className="hidden md:block text-sm font-medium pr-1">
            Ativar Notificações
          </span>
        </motion.button>
      )}

      {/* Modal de configuração */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]
                       w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl 
                       border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Bell className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">Notificações</h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-amber-50 text-sm">
                  Receba alertas em tempo real sobre novos pedidos
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {showSuccessMessage ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full 
                                  flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                      Notificações Ativadas!
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Você receberá alertas sobre novos pedidos
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {!notificationsEnabled ? (
                      <>
                        <div className="text-center">
                          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full 
                                        flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                          </div>
                          <h4 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                            Ativar Notificações Push?
                          </h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Receba alertas instantâneos quando novos pedidos chegarem, 
                            mesmo com o navegador minimizado.
                          </p>
                        </div>

                        <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Alertas em Tempo Real
                              </p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                Seja notificado instantaneamente sobre novos pedidos
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Notificações com Som
                              </p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                Ouça um alerta sonoro para não perder nenhum pedido
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Funciona em Segundo Plano
                              </p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                Receba notificações mesmo com a aba minimizada
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300
                                     bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700
                                     rounded-xl transition-colors"
                          >
                            Agora Não
                          </button>
                          <button
                            onClick={handleEnableNotifications}
                            disabled={loading}
                            className="flex-1 px-4 py-3 text-sm font-medium text-white
                                     bg-gradient-to-r from-amber-500 to-amber-600 
                                     hover:from-amber-600 hover:to-amber-700
                                     rounded-xl transition-all shadow-lg hover:shadow-xl
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Ativando...
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4" />
                                Ativar Notificações
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 
                                        rounded-xl border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3">
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <div>
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                  Notificações Ativas
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-400">
                                  Você receberá alertas sobre novos pedidos
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
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
