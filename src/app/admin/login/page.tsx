'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAdminAuth } from '@/contexts/AdminAuthContext'
import { Input } from '@/components/ui/input-aceternity'
import { Label } from '@/components/ui/label-aceternity'
import { Lock, User, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAdminAuth()
  const router = useRouter()

  // Carregar credenciais salvas ao montar
  useEffect(() => {
    const savedUsername = localStorage.getItem('admin_saved_username')
    const savedPassword = localStorage.getItem('admin_saved_password')
    const savedRemember = localStorage.getItem('admin_remember_me')
    
    if (savedRemember === 'true' && savedUsername && savedPassword) {
      setUsername(savedUsername)
      setPassword(savedPassword)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      const success = login(username, password)
      if (success) {
        // Salvar credenciais se "Lembrar de mim" estiver marcado
        if (rememberMe) {
          localStorage.setItem('admin_saved_username', username)
          localStorage.setItem('admin_saved_password', password)
          localStorage.setItem('admin_remember_me', 'true')
        } else {
          // Limpar credenciais salvas se desmarcado
          localStorage.removeItem('admin_saved_username')
          localStorage.removeItem('admin_saved_password')
          localStorage.removeItem('admin_remember_me')
        }
        
        router.push('/admin/dashboard')
      } else {
        setError('Credenciais inválidas. Tente novamente.')
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Image
                src="/assets/meuburger.png"
                alt="Meu Burguer"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Painel Administrativo
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Faça login para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 
                         text-dourado-600 focus:ring-dourado-500 focus:ring-2 
                         bg-white dark:bg-gray-800 cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
              >
                Lembrar de mim
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-dourado-600 to-dourado-700 hover:from-dourado-700 hover:to-dourado-800 
                       text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl 
                       transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 
                       disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </form>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>Acesso restrito à administradores</p>
          </div>
        </div>
      </div>
    </div>
  )
}

