'use client'

import { useState, ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Receipt, 
  PlusCircle, 
  Package, 
  BarChart3, 
  LogOut, 
  Moon, 
  Sun, 
  Menu, 
  X 
} from 'lucide-react'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { NotificationPermission } from './NotificationPermission'

type AdminLayoutProps = {
  children: ReactNode
}

const menuItems = [
  { text: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { text: 'Pedidos', icon: Receipt, path: '/admin/pedidos' },
  { text: 'Novo Pedido', icon: PlusCircle, path: '/admin/pedidos/novo' },
  { text: 'Produtos', icon: Package, path: '/admin/produtos' },
  { text: 'Adicionais', icon: PlusCircle, path: '/admin/adicionais' },
  { text: 'Relatórios', icon: BarChart3, path: '/admin/relatorios' },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { logout } = useAdminAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getPageTitle = () => {
    if (pathname === '/admin/dashboard') return 'Dashboard'
    if (pathname === '/admin/pedidos') return 'Gerenciar Pedidos'
    if (pathname === '/admin/pedidos/novo') return 'Novo Pedido'
    if (pathname?.includes('/admin/pedidos/') && pathname?.includes('/editar')) return 'Editar Pedido'
    if (pathname?.includes('/admin/pedidos/')) return 'Detalhes do Pedido'
    if (pathname === '/admin/produtos') return 'Produtos'
    if (pathname === '/admin/adicionais') return 'Adicionais'
    if (pathname === '/admin/relatorios') return 'Relatórios'
    return 'Admin'
  }

  const SidebarContent = () => (
    <div className="h-full bg-white dark:bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 group">
        <div className="relative">
          <div className="absolute inset-0 bg-dourado-400/15 dark:bg-dourado-500/15 rounded-full blur-lg 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-150" />
          <div className="relative w-10 h-10 transform transition-all duration-200 
                        group-hover:scale-105">
            <Image
              src="/assets/meuburger.png"
              alt="Meu Burguer"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
        </div>
        <div className="flex flex-col">
          <h1 className="font-bold text-zinc-900 dark:text-white text-base">
            Meu Burguer
          </h1>
          <span className="text-[9px] text-dourado-600 dark:text-dourado-500 
                         font-semibold tracking-wider uppercase opacity-70">
            Painel Admin
          </span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 font-medium text-sm',
                isActive
                  ? 'bg-dourado-100 dark:bg-dourado-900/30 text-dourado-700 dark:text-dourado-400'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0',
                isActive
                  ? 'text-dourado-600 dark:text-dourado-400'
                  : 'text-zinc-600 dark:text-zinc-400'
              )} />
              <span className="truncate">{item.text}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )

  if (!mounted) return null

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-200 dark:border-zinc-800">
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 md:hidden border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-200">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-white">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Meu Burguer Admin
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Image
                  src="/assets/dono.png"
                  alt="Admin"
                  width={36}
                  height={36}
                  className="rounded-full border-2 border-dourado-200 dark:border-dourado-700"
                />
              </button>

              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1 z-50">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Notification Permission */}
      <NotificationPermission />
    </div>
  )
}

