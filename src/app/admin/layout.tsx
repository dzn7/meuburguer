'use client'

import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { useEffect } from 'react'
import { setupRealtimeNotifications } from '@/lib/notifications'
import { supabase } from '@/lib/supabase'
import PWAManagerAdmin from '@/components/admin/PWAManagerAdmin'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Configurar notificações em tempo real
    // A permissão agora é solicitada pelo NotificationButton
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

