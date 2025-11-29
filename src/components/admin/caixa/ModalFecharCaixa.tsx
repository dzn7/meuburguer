'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { Funcionario, Caixa, EstatisticasCaixa } from '@/lib/tipos-caixa'

type Props = {
  aberto: boolean
  caixa: Caixa | null
  funcionarios: Funcionario[]
  estatisticas: EstatisticasCaixa
  onFechar: () => void
  onConfirmar: (valor: number, responsavel: string, observacoes?: string) => Promise<boolean>
}

export default function ModalFecharCaixa({ 
  aberto, caixa, funcionarios, estatisticas, onFechar, onConfirmar 
}: Props) {
  const [valor, setValor] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [processando, setProcessando] = useState(false)

  const valorFloat = parseFloat(valor) || 0
  const diferenca = valorFloat - estatisticas.saldoAtual

  const handleConfirmar = async () => {
    if (!valor || !responsavel) return
    
    setProcessando(true)
    const sucesso = await onConfirmar(parseFloat(valor), responsavel, observacoes)
    setProcessando(false)
    
    if (sucesso) {
      setValor('')
      setResponsavel('')
      setObservacoes('')
      onFechar()
    }
  }

  const handleFechar = () => {
    if (!processando) {
      setValor('')
      setResponsavel('')
      setObservacoes('')
      onFechar()
    }
  }

  if (!caixa) return null

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleFechar}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                  <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Fechar Caixa
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Confira os valores e feche o caixa
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Resumo do Caixa */}
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Valor de Abertura:</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    R$ {Number(caixa.valor_abertura).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">Total Entradas:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    + R$ {estatisticas.totalEntradas.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600 dark:text-red-400">Total Saídas:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    - R$ {estatisticas.totalSaidas.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-white">Saldo Esperado:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-lg">
                    R$ {estatisticas.saldoAtual.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Valor em Caixa (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  disabled={processando}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                           dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-lg
                           focus:ring-2 focus:ring-red-500 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {valor && (
                  <p className={`mt-2 text-sm font-medium ${
                    diferenca === 0
                      ? 'text-green-600 dark:text-green-400'
                      : diferenca > 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {diferenca === 0
                      ? '✓ Valores conferem!'
                      : diferenca > 0
                      ? `↑ Sobra de R$ ${diferenca.toFixed(2)}`
                      : `↓ Falta de R$ ${Math.abs(diferenca).toFixed(2)}`
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Responsável pelo Fechamento *
                </label>
                <select
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  disabled={processando}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                           dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white
                           focus:ring-2 focus:ring-red-500 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o responsável</option>
                  {funcionarios.map((func) => (
                    <option key={func.id} value={func.nome}>
                      {func.nome} - {func.cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Alguma observação sobre o fechamento..."
                  rows={3}
                  disabled={processando}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                           dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white resize-none
                           focus:ring-2 focus:ring-red-500 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
              <button
                onClick={handleFechar}
                disabled={processando}
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 
                         dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-200 
                         dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!valor || !responsavel || processando}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white 
                         rounded-xl font-medium transition-colors flex items-center 
                         justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processando ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Fechar Caixa
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
