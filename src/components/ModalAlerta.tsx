'use client'

import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect } from 'react'

type TipoAlerta = 'sucesso' | 'erro' | 'aviso' | 'info'

type ModalAlertaProps = {
  aberto: boolean
  tipo: TipoAlerta
  titulo: string
  mensagem: string
  onFechar: () => void
}

export default function ModalAlerta({ aberto, tipo, titulo, mensagem, onFechar }: ModalAlertaProps) {
  useEffect(() => {
    if (aberto) {
      const timer = setTimeout(() => {
        onFechar()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  const configs = {
    sucesso: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-500',
      iconColor: 'text-green-600 dark:text-green-500',
      titleColor: 'text-green-900 dark:text-green-100',
    },
    erro: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-500',
      iconColor: 'text-red-600 dark:text-red-500',
      titleColor: 'text-red-900 dark:text-red-100',
    },
    aviso: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-600 dark:text-blue-500',
      titleColor: 'text-blue-900 dark:text-blue-100',
    },
  }

  const config = configs[tipo]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4 pointer-events-none">
      <div
        className={`${config.bgColor} ${config.borderColor} border-l-4 rounded-lg shadow-2xl p-6 max-w-md w-full pointer-events-auto animate-slideInDown`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <Icon className={`w-6 h-6 flex-shrink-0 ${config.iconColor}`} />
          <div className="flex-1">
            <h3 className={`font-bold text-lg mb-1 ${config.titleColor}`}>{titulo}</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">{mensagem}</p>
          </div>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

