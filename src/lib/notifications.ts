// Sistema de notificações PWA para Admin

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission
  }

  return Notification.permission
}

export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission()

  if (permission !== 'granted') {
    console.warn('Permissão de notificação negada')
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
  } else {
    // Fallback para notificação nativa
    new Notification(title, options)
  }
}

export async function notificarNovoPedido(pedidoId: string, nomeCliente: string): Promise<void> {
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
  })

  // Tocar som de notificação
  playNotificationSound()
}

export async function notificarPedidoAtualizado(
  pedidoId: string,
  status: string
): Promise<void> {
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
  })
}

function playNotificationSound(): void {
  try {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(err => {
      console.warn('Não foi possível tocar o som:', err)
    })
  } catch (error) {
    console.warn('Erro ao tocar som:', error)
  }
}

// Hook para monitorar novos pedidos em tempo real
export function setupRealtimeNotifications(supabase: any): () => void {
  const channel = supabase
    .channel('pedidos-notifications')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'pedidos' },
      (payload: any) => {
        console.log('[Notificação] Novo pedido:', payload)
        notificarNovoPedido(payload.new.id, payload.new.nome_cliente)
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pedidos' },
      (payload: any) => {
        console.log('[Notificação] Pedido atualizado:', payload)
        if (payload.old.status !== payload.new.status) {
          notificarPedidoAtualizado(payload.new.id, payload.new.status)
        }
      }
    )
    .subscribe()

  // Retorna função de cleanup
  return () => {
    supabase.removeChannel(channel)
  }
}
