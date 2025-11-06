// Sistema de notificações PWA para Admin

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  // Verifica se está no navegador
  if (typeof window === 'undefined') {
    return 'denied'
  }

  if (!('Notification' in window)) {
    console.warn('[Notificações] Este navegador não suporta notificações')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    console.log('[Notificações] Permissão já concedida')
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    console.warn('[Notificações] Permissão negada pelo usuário')
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    console.log('[Notificações] Permissão solicitada:', permission)
    return permission
  } catch (error) {
    console.error('[Notificações] Erro ao solicitar permissão:', error)
    return 'denied'
  }
}

export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  try {
    const permission = await requestNotificationPermission()

    if (permission !== 'granted') {
      console.warn('[Notificações] Permissão não concedida')
      return
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      
      const notificationOptions = {
        icon: '/assets/favicon/android-chrome-192x192.png',
        badge: '/assets/favicon/android-chrome-192x192.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        ...options
      } as any
      
      await registration.showNotification(title, notificationOptions)
      console.log('[Notificações] Notificação exibida:', title)
    } else {
      // Fallback para notificação nativa
      new Notification(title, options)
      console.log('[Notificações] Notificação nativa exibida:', title)
    }
  } catch (error) {
    console.error('[Notificações] Erro ao exibir notificação:', error)
  }
}

export async function notificarNovoPedido(pedidoId: string, nomeCliente: string): Promise<void> {
  try {
    await showNotification('🍔 Novo Pedido Recebido!', {
      body: `Cliente: ${nomeCliente}\nClique para ver detalhes`,
      tag: `pedido-${pedidoId}`,
      data: {
        url: `/admin/pedidos/${pedidoId}`
      },
      actions: [
        {
          action: 'view',
          title: 'Ver Pedido',
          icon: '/assets/favicon/android-chrome-192x192.png'
        },
        {
          action: 'close',
          title: 'Fechar'
        }
      ]
    } as any)

    // Tocar som de notificação
    playNotificationSound()
  } catch (error) {
    console.error('[Notificações] Erro ao notificar novo pedido:', error)
  }
}

export async function notificarPedidoAtualizado(
  pedidoId: string,
  status: string
): Promise<void> {
  try {
    const statusMessages: { [key: string]: string } = {
      confirmado: '✅ Pedido Confirmado',
      preparando: '👨‍🍳 Pedido em Preparo',
      pronto: '🎉 Pedido Pronto',
      entregue: '🚚 Pedido Entregue',
      cancelado: '❌ Pedido Cancelado'
    }

    const title = statusMessages[status] || 'Pedido Atualizado'

    await showNotification(title, {
      body: `Status do pedido foi alterado`,
      tag: `pedido-update-${pedidoId}`,
      data: {
        url: `/admin/pedidos/${pedidoId}`
      }
    } as any)
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
    .channel('pedidos-notifications')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'pedidos' },
      async (payload: any) => {
        console.log('[Notificações] Novo pedido detectado:', payload.new.id)
        
        // Verifica se usuário tem notificações habilitadas
        const hasPermission = await checkNotificationPreferences(supabase)
        if (hasPermission) {
          notificarNovoPedido(payload.new.id, payload.new.nome_cliente)
        }
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
            notificarPedidoAtualizado(payload.new.id, payload.new.status)
          }
        }
      }
    )
    .subscribe((status: string) => {
      console.log('[Notificações] Status da inscrição:', status)
    })

  // Retorna função de cleanup
  return () => {
    console.log('[Notificações] Removendo monitoramento')
    supabase.removeChannel(channel)
  }
}
