'use client'

import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { useEffect } from 'react'
import { setupRealtimeNotifications, requestNotificationPermission } from '@/lib/notifications'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Solicitar permissão para notificações
    requestNotificationPermission()

    // Configurar notificações em tempo real
    const cleanup = setupRealtimeNotifications(supabase)

    return cleanup
  }, [])

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest-admin.json" />
      </Head>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </>
  )
}

