// Sistema de notificações PWA para Admin
// Integrado com push-notifications.ts

import { supabase } from './supabase'
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  showServiceWorkerNotification,
  notifyNewPedido as pushNotifyNewPedido,
  notifyStatusUpdate as pushNotifyStatusUpdate,
} from './push-notifications'

// Re-exportar funções do push-notifications para compatibilidade
export { isNotificationSupported, requestNotificationPermission, getNotificationPermission }

export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  await showServiceWorkerNotification({
    title,
    body: options?.body || '',
    icon: options?.icon,
    badge: options?.badge,
    tag: options?.tag,
    requireInteraction: options?.requireInteraction,
    data: options?.data,
  })
}

export async function notificarNovoPedido(pedidoId: string, nomeCliente: string, total?: number): Promise<void> {
  try {
    console.log('[Notificações] Tentando notificar novo pedido:', { pedidoId, nomeCliente, total })
    
    // Verificar preferências antes de enviar
    const canNotify = await checkNotificationPreferences(supabase)
    if (!canNotify) {
      console.log('[Notificações] Notificações desabilitadas ou sem permissão')
      return
    }

    console.log('[Notificações] Permissão concedida, enviando notificação...')

    // Usar função do push-notifications
    await pushNotifyNewPedido({
      id: pedidoId,
      nome_cliente: nomeCliente,
      total: total || 0,
    })

    console.log('[Notificações] Notificação enviada com sucesso!')

    // Tocar som de notificação
    playNotificationSound()
  } catch (error) {
    console.error('[Notificações] Erro ao notificar novo pedido:', error)
  }
}

export async function notificarPedidoAtualizado(
  pedidoId: string,
  status: string,
  nomeCliente?: string
): Promise<void> {
  try {
    // Verificar preferências antes de enviar
    const canNotify = await checkNotificationPreferences(supabase)
    if (!canNotify) {
      console.log('[Notificações] Notificações desabilitadas ou sem permissão')
      return
    }

    // Usar função do push-notifications
    await pushNotifyStatusUpdate({
      id: pedidoId,
      nome_cliente: nomeCliente || 'Cliente',
      status,
    })
  } catch (error) {
    console.error('[Notificações] Erro ao notificar atualização de pedido:', error)
  }
}

async function playNotificationSound(): Promise<void> {
  try {
    // Verifica se o som está habilitado nas preferências
    const userId = localStorage.getItem('admin_user_id')
    if (!userId) return

    const { data } = await (await import('@/lib/supabase')).supabase
      .from('notification_preferences')
      .select('sound_enabled')
      .eq('user_id', userId)
      .single()

    if (!data || !data.sound_enabled) {
      console.log('[Notificações] Som desabilitado nas preferências')
      return
    }

    const audio = new Audio('/notificacao.mp3')
    audio.volume = 0.5
    audio.play().catch(err => {
      console.warn('Não foi possível tocar o som:', err)
    })
  } catch (error) {
    console.warn('Erro ao tocar som:', error)
  }
}

// Verifica se o usuário tem notificações habilitadas
async function checkNotificationPreferences(supabase: any): Promise<boolean> {
  try {
    // Se não houver permissão do navegador, retorna false
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        console.log('[Notificações] Permissão do navegador não concedida')
        return false
      }
    } else {
      return false
    }

    const userId = localStorage.getItem('admin_user_id')
    if (!userId) {
      // Se não tem userId mas tem permissão do navegador, permite notificações
      console.log('[Notificações] Sem userId, mas permissão concedida - permitindo notificações')
      return true
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('notifications_enabled, new_order_notifications, status_change_notifications')
      .eq('user_id', userId)
      .single()

    // Se não encontrou preferências, mas tem permissão do navegador, permite
    if (error || !data) {
      console.log('[Notificações] Sem preferências salvas, mas permissão concedida - permitindo notificações')
      return true
    }

    return data.notifications_enabled === true
  } catch (error) {
    console.error('[Notificações] Erro ao verificar preferências:', error)
    // Em caso de erro, se tem permissão do navegador, permite
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  }
}

// Hook para monitorar novos pedidos em tempo real
export function setupRealtimeNotifications(supabase: any): () => void {
  console.log('[Notificações] Configurando monitoramento em tempo real')
  
  const channel = supabase
    .channel('pedidos-notifications-realtime')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'pedidos' },
      async (payload: any) => {
        console.log('[Notificações] ✅ Novo pedido detectado via Realtime:', payload.new)
        
        // Aguardar um pouco para garantir que as preferências estão carregadas
        setTimeout(async () => {
          try {
            // Verifica se usuário tem notificações habilitadas
            const hasPermission = await checkNotificationPreferences(supabase)
            console.log('[Notificações] Permissão verificada:', hasPermission)
            
            if (hasPermission) {
              await notificarNovoPedido(
                payload.new.id, 
                payload.new.nome_cliente, 
                payload.new.total
              )
            } else {
              console.log('[Notificações] Notificações não habilitadas ou sem permissão')
            }
          } catch (error) {
            console.error('[Notificações] Erro ao processar novo pedido:', error)
          }
        }, 500)
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pedidos' },
      async (payload: any) => {
        if (payload.old.status !== payload.new.status) {
          console.log('[Notificações] Status alterado:', payload.old.status, '->', payload.new.status)
          
          // Verifica se usuário tem notificações habilitadas
          const hasPermission = await checkNotificationPreferences(supabase)
          if (hasPermission) {
            await notificarPedidoAtualizado(
              payload.new.id, 
              payload.new.status, 
              payload.new.nome_cliente
            )
          }
        }
      }
    )
    .subscribe((status: string) => {
      console.log('[Notificações] Status da inscrição Realtime:', status)
      if (status === 'SUBSCRIBED') {
        console.log('[Notificações] ✅ Inscrito com sucesso no canal de notificações!')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Notificações] ❌ Erro ao se inscrever no canal')
      }
    })

  // Retorna função de cleanup
  return () => {
    console.log('[Notificações] Removendo monitoramento')
    supabase.removeChannel(channel)
  }
}
