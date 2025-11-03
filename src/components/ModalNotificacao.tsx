'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

type TipoNotificacao = 'sucesso' | 'erro' | 'aviso' | 'info' | 'confirmacao'

type ModalNotificacaoProps = {
  aberto: boolean
  tipo: TipoNotificacao
  titulo: string
  mensagem: string
  onFechar: () => void
  onConfirmar?: () => void
  textoBotaoConfirmar?: string
  textoBotaoCancelar?: string
}

export default function ModalNotificacao({
  aberto,
  tipo,
  titulo,
  mensagem,
  onFechar,
  onConfirmar,
  textoBotaoConfirmar = 'Confirmar',
  textoBotaoCancelar = 'Cancelar',
}: ModalNotificacaoProps) {
  const getIcone = () => {
    switch (tipo) {
      case 'sucesso':
        return <CheckCircle className="w-12 h-12 text-green-600" />
      case 'erro':
        return <AlertCircle className="w-12 h-12 text-red-600" />
      case 'aviso':
        return <AlertTriangle className="w-12 h-12 text-yellow-600" />
      case 'confirmacao':
        return <AlertTriangle className="w-12 h-12 text-amber-600" />
      default:
        return <Info className="w-12 h-12 text-blue-600" />
    }
  }

  const getCorBorda = () => {
    switch (tipo) {
      case 'sucesso':
        return 'border-green-200 dark:border-green-800'
      case 'erro':
        return 'border-red-200 dark:border-red-800'
      case 'aviso':
        return 'border-yellow-200 dark:border-yellow-800'
      case 'confirmacao':
        return 'border-amber-200 dark:border-amber-800'
      default:
        return 'border-blue-200 dark:border-blue-800'
    }
  }

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFechar}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border-2 
                     ${getCorBorda()} w-full max-w-md overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-4">
                {getIcone()}
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {titulo}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                    {mensagem}
                  </p>
                </div>
              </div>
              <button
                onClick={onFechar}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Footer com botões */}
            <div className="flex items-center justify-end gap-3 p-6 bg-zinc-50 dark:bg-zinc-800/50">
              {tipo === 'confirmacao' ? (
                <>
                  <button
                    onClick={onFechar}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 
                             bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 
                             rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {textoBotaoCancelar}
                  </button>
                  <button
                    onClick={() => {
                      onConfirmar?.()
                      onFechar()
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 
                             hover:bg-red-700 rounded-lg transition-colors"
                  >
                    {textoBotaoConfirmar}
                  </button>
                </>
              ) : (
                <button
                  onClick={onFechar}
                  className="px-6 py-2 text-sm font-medium text-white bg-amber-600 
                           hover:bg-amber-700 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
