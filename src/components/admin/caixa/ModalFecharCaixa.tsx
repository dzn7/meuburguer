'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Edit3, Check } from 'lucide-react'
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
  const [modoEdicao, setModoEdicao] = useState(false)
  const [valorManual, setValorManual] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [processando, setProcessando] = useState(false)

  // Valor calculado automaticamente (saldo esperado)
  const valorCalculado = estatisticas.saldoAtual
  
  // Valor final a ser usado (manual se editando, senão calculado)
  const valorFinal = modoEdicao ? (parseFloat(valorManual) || 0) : valorCalculado
  
  // Diferença entre valor informado e esperado
  const diferenca = valorFinal - valorCalculado

  // Resetar modo edição quando abrir o modal
  useEffect(() => {
    if (aberto) {
      setModoEdicao(false)
      setValorManual(valorCalculado.toFixed(2))
    }
  }, [aberto, valorCalculado])

  const handleConfirmar = async () => {
    if (!responsavel) return
    
    setProcessando(true)
    const sucesso = await onConfirmar(valorFinal, responsavel, observacoes)
    setProcessando(false)
    
    if (sucesso) {
      resetarFormulario()
      onFechar()
    }
  }

  const resetarFormulario = () => {
    setModoEdicao(false)
    setValorManual('')
    setResponsavel('')
    setObservacoes('')
  }

  const handleFechar = () => {
    if (!processando) {
      resetarFormulario()
      onFechar()
    }
  }

  const ativarEdicao = () => {
    setValorManual(valorCalculado.toFixed(2))
    setModoEdicao(true)
  }

  const confirmarEdicao = () => {
    setModoEdicao(false)
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

              {/* Valor de Fechamento - Calculado automaticamente */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Valor de Fechamento
                  </label>
                  {!modoEdicao ? (
                    <button
                      type="button"
                      onClick={ativarEdicao}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg text-amber-600 
                               hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={confirmarEdicao}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg text-green-600 
                               hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Confirmar
                    </button>
                  )}
                </div>

                {modoEdicao ? (
                  <input
                    type="number"
                    step="0.01"
                    value={valorManual}
                    onChange={(e) => setValorManual(e.target.value)}
                    placeholder="0,00"
                    disabled={processando}
                    autoFocus
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-amber-500 
                             rounded-xl text-zinc-900 dark:text-white text-lg
                             focus:ring-2 focus:ring-amber-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                ) : (
                  <div className={`w-full px-4 py-3 rounded-xl text-2xl font-bold text-center ${
                    valorCalculado >= 0 
                      ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-2 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800'
                  }`}>
                    R$ {valorFinal.toFixed(2)}
                  </div>
                )}

                {/* Mostrar diferença se estiver editando */}
                {modoEdicao && diferenca !== 0 && (
                  <p className={`mt-2 text-sm font-medium ${
                    diferenca > 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {diferenca > 0
                      ? `↑ Sobra de R$ ${diferenca.toFixed(2)}`
                      : `↓ Falta de R$ ${Math.abs(diferenca).toFixed(2)}`
                    }
                  </p>
                )}

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Calculado: Abertura ({Number(caixa.valor_abertura).toFixed(2)}) + Entradas ({estatisticas.totalEntradas.toFixed(2)}) - Saídas ({estatisticas.totalSaidas.toFixed(2)})
                </p>
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
                disabled={!responsavel || processando}
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
