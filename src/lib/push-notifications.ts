/**
 * Serviço de Notificações Push - PWA Admin
 * Sistema nativo sem Firebase - baseado em barbeariaborges
 */

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
  tag?: string
  requireInteraction?: boolean
}

/**
 * Verifica se o navegador suporta notificações
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Verifica o status da permissão de notificações
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Solicita permissão para enviar notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('[Push] Notificações não suportadas')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.warn('[Push] Permissão de notificações negada')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    console.log('[Push] Permissão:', permission)
    return permission === 'granted'
  } catch (error) {
    console.error('[Push] Erro ao solicitar permissão:', error)
    return false
  }
}

/**
 * Envia notificação local (sem service worker)
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn('[Push] Notificações não suportadas')
    return
  }

  const permission = await requestNotificationPermission()
  if (!permission) {
    console.warn('[Push] Sem permissão para notificações')
    return
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/assets/meuburger.png',
      badge: payload.badge || '/assets/meuburger.png',
      tag: payload.tag || 'default',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data,
    })

    // Auto-fechar após 10 segundos se não for requireInteraction
    if (!payload.requireInteraction) {
      setTimeout(() => notification.close(), 10000)
    }

    // Evento de clique
    notification.onclick = () => {
      window.focus()
      notification.close()
      
      // Se tiver URL nos dados, navegar
      if (payload.data?.url) {
        window.location.href = payload.data.url
      }
    }

    console.log('[Push] Notificação enviada:', payload.title)
  } catch (error) {
    console.error('[Push] Erro ao enviar notificação:', error)
  }
}

/**
 * Envia notificação via Service Worker (mais confiável)
 */
export async function showServiceWorkerNotification(
  payload: NotificationPayload
): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn('[Push] Notificações não suportadas')
    return
  }

  const permission = await requestNotificationPermission()
  if (!permission) {
    console.warn('[Push] Sem permissão para notificações')
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/assets/meuburger.png',
      badge: payload.badge || '/assets/meuburger.png',
      tag: payload.tag || 'default',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data,
    })

    console.log('[Push] Notificação SW enviada:', payload.title)
  } catch (error) {
    console.error('[Push] Erro ao enviar notificação SW:', error)
    // Fallback para notificação local
    await showLocalNotification(payload)
  }
}

/**
 * Notificação de novo pedido
 */
export async function notifyNewPedido(pedido: {
  id: string
  nome_cliente: string
  total: number
}): Promise<void> {
  await showServiceWorkerNotification({
    title: '🍔 Novo Pedido!',
    body: `${pedido.nome_cliente}\nTotal: R$ ${pedido.total.toFixed(2)}`,
    icon: '/assets/meuburger.png',
    badge: '/assets/meuburger.png',
    tag: `pedido-${pedido.id}`,
    requireInteraction: true,
    data: {
      type: 'novo_pedido',
      pedido_id: pedido.id,
      url: '/admin/dashboard',
    },
  })
}

/**
 * Notificação de atualização de status
 */
export async function notifyStatusUpdate(pedido: {
  id: string
  nome_cliente: string
  status: string
}): Promise<void> {
  await showServiceWorkerNotification({
    title: '📝 Status Atualizado',
    body: `Pedido de ${pedido.nome_cliente}\nStatus: ${pedido.status}`,
    icon: '/assets/meuburger.png',
    tag: `status-${pedido.id}`,
    requireInteraction: false,
    data: {
      type: 'status_update',
      pedido_id: pedido.id,
      url: '/admin/dashboard',
    },
  })
}

/**
 * Testa notificação - mostra aviso ao ativar
 */
export async function testNotification(): Promise<void> {
  await showServiceWorkerNotification({
    title: '✅ Notificações Ativadas!',
    body: 'Você receberá alertas de novos pedidos aqui.',
    icon: '/assets/meuburger.png',
    requireInteraction: false,
    data: {
      type: 'test',
    },
  })
}
