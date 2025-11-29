'use client'

import { useEffect } from 'react'

export default function EntregadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Registrar Service Worker específico do entregador
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw-entregador.js', { scope: '/entregador' })
        .then((registration) => {
          console.log('[Entregador] SW registrado:', registration.scope)

          // Verificar atualizações
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[Entregador] Nova versão disponível')
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                  window.location.reload()
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[Entregador] Erro ao registrar SW:', error)
        })
    }
  }, [])

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MB Entregas" />
        <link rel="manifest" href="/manifest-entregador.json" />
        <link rel="apple-touch-icon" href="/assets/favicon/apple-touch-icon.png" />
        <title>Meu Burguer - Entregas</title>
      </head>
      <body className="bg-zinc-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
