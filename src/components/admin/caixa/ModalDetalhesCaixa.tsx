'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, X, TrendingUp, TrendingDown, Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Caixa } from '@/lib/tipos-caixa'

type Props = {
  caixa: Caixa | null
  onFechar: () => void
}

export default function ModalDetalhesCaixa({ caixa, onFechar }: Props) {
  if (!caixa) return null

  const totalMovimentado = (caixa.total_entradas || 0) + (caixa.total_saidas || 0)
  const lucroLiquido = (caixa.total_entradas || 0) - (caixa.total_saidas || 0)

  return (
    <AnimatePresence>
      {caixa && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onFechar}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    caixa.status === 'aberto' 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                    {caixa.status === 'aberto' ? (
                      <Unlock className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <Lock className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      Detalhes do Caixa
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {format(new Date(caixa.data_abertura), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onFechar}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className={`p-4 rounded-xl ${
                caixa.status === 'aberto'
                  ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                  : 'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    caixa.status === 'aberto'
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    Status: {caixa.status === 'aberto' ? 'Aberto' : 'Fechado'}
                  </span>
                  {caixa.diferenca !== null && caixa.diferenca !== 0 && (
                    <span className={`text-sm font-bold ${
                      caixa.diferenca > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {caixa.diferenca > 0 ? '+' : ''}R$ {caixa.diferenca.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-500 uppercase">Abertura</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">
                    {format(new Date(caixa.data_abertura), "HH:mm", { locale: ptBR })}
                  </p>
                  {caixa.responsavel_abertura && (
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {caixa.responsavel_abertura}
                    </p>
                  )}
                </div>

                {caixa.data_fechamento && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-500 uppercase">Fechamento</span>
                    </div>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">
                      {format(new Date(caixa.data_fechamento), "HH:mm", { locale: ptBR })}
                    </p>
                    {caixa.responsavel_fechamento && (
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {caixa.responsavel_fechamento}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Valores */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Valor de Abertura</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    R$ {Number(caixa.valor_abertura).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Total Entradas
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    + R$ {(caixa.total_entradas || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Total Saídas
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    - R$ {(caixa.total_saidas || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Saldo Esperado</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    R$ {(caixa.saldo_esperado || 0).toFixed(2)}
                  </span>
                </div>

                {caixa.valor_fechamento !== null && (
                  <div className="flex justify-between items-center py-3 bg-amber-50 dark:bg-amber-950/20 
                                rounded-xl px-4 -mx-4">
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      Valor Final em Caixa
                    </span>
                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      R$ {caixa.valor_fechamento.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Resumo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Total Movimentado
                  </p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    R$ {totalMovimentado.toFixed(2)}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${
                  lucroLiquido >= 0 
                    ? 'bg-green-50 dark:bg-green-950/20' 
                    : 'bg-red-50 dark:bg-red-950/20'
                }`}>
                  <p className={`text-xs font-medium mb-1 ${
                    lucroLiquido >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    Lucro Líquido
                  </p>
                  <p className={`text-lg font-bold ${
                    lucroLiquido >= 0 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    R$ {lucroLiquido.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Observações */}
              {caixa.observacoes && (
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase mb-2">Observações</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{caixa.observacoes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={onFechar}
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 
                         dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-200 
                         dark:hover:bg-zinc-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
