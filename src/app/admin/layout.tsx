'use client'

import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { useEffect } from 'react'
import { setupRealtimeNotifications, requestNotificationPermission } from '@/lib/notifications'
import { supabase } from '@/lib/supabase'
import PWAManagerAdmin from '@/components/admin/PWAManagerAdmin'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Solicitar permissão para notificações
    requestNotificationPermission()

    // Configurar notificações em tempo real
    const cleanup = setupRealtimeNotifications(supabase)

    return cleanup
  }, [])

  return (
    <AdminAuthProvider>
      <PWAManagerAdmin />
      {children}
    </AdminAuthProvider>
  )
}

