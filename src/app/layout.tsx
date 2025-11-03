import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/providers/ThemeProvider'
import { CarrinhoProvider } from '@/contexts/CarrinhoContext'
import PWAManager from '@/components/PWAManager'
import Script from 'next/script'

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Meu Burguer - Os Melhores Hambúrgueres de Porto-PI',
  description: 'Delicie-se com nossos hambúrgueres artesanais. Entrega rápida em Porto-PI!',
  keywords: 'hamburguer, burger, lanche, comida, delivery, Porto-PI, Piauí',
  authors: [{ name: 'Meu Burguer' }],
  creator: 'Meu Burguer',
  publisher: 'Meu Burguer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#030712' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/assets/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon/favicon-16x16.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Meu Burguer" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={poppins.className}>
        <ThemeProvider>
          <CarrinhoProvider>
            <PWAManager />
            {children}
          </CarrinhoProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

