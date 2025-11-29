'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Unlock, Check, Receipt, Edit3, Calendar, RefreshCw } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Funcionario } from '@/lib/tipos-caixa'
import type { PedidoDia } from '@/lib/useCaixa'

type Props = {
  aberto: boolean
  funcionarios: Funcionario[]
  pedidosHoje: PedidoDia[]
  totalPedidosHoje: number
  onFechar: () => void
  onConfirmar: (valor: number, responsavel: string, dataReferencia?: Date) => Promise<boolean>
}

export default function ModalAbrirCaixa({ 
  aberto, funcionarios, pedidosHoje, totalPedidosHoje, onFechar, onConfirmar 
}: Props) {
  const [modoValor, setModoValor] = useState<'manual' | 'pedidos'>('manual')
  const [valor, setValor] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [processando, setProcessando] = useState(false)
  
  // Estados para data específica
  const [usarDataEspecifica, setUsarDataEspecifica] = useState(false)
  const [dataSelecionada, setDataSelecionada] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [pedidosDataSelecionada, setPedidosDataSelecionada] = useState<PedidoDia[]>([])
  const [totalPedidosData, setTotalPedidosData] = useState(0)
  const [carregandoPedidos, setCarregandoPedidos] = useState(false)

  // Carregar pedidos da data selecionada
  const carregarPedidosData = async (data: string) => {
    setCarregandoPedidos(true)
    try {
      const inicio = startOfDay(new Date(data + 'T00:00:00'))
      const fim = endOfDay(new Date(data + 'T23:59:59'))

      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('id, nome_cliente, total, forma_pagamento, status, created_at')
        .gte('created_at', inicio.toISOString())
        .lte('created_at', fim.toISOString())
        .eq('status', 'entregue')
        .order('created_at', { ascending: false })

      if (error) throw error

      const pedidosFormatados = (pedidos || []).map(p => ({
        ...p,
        total: Number(p.total)
      })) as PedidoDia[]

      setPedidosDataSelecionada(pedidosFormatados)
      const total = pedidosFormatados.reduce((sum, p) => sum + p.total, 0)
      setTotalPedidosData(total)

      if (modoValor === 'pedidos') {
        setValor(total.toFixed(2))
      }
    } catch (erro) {
      console.error('Erro ao carregar pedidos:', erro)
      setPedidosDataSelecionada([])
      setTotalPedidosData(0)
    } finally {
      setCarregandoPedidos(false)
    }
  }

  // Atualizar valor quando mudar modo ou total
  useEffect(() => {
    if (modoValor === 'pedidos') {
      if (usarDataEspecifica) {
        setValor(totalPedidosData.toFixed(2))
      } else {
        setValor(totalPedidosHoje.toFixed(2))
      }
    }
  }, [modoValor, totalPedidosHoje, totalPedidosData, usarDataEspecifica])

  // Carregar pedidos quando mudar data
  useEffect(() => {
    if (usarDataEspecifica && dataSelecionada) {
      carregarPedidosData(dataSelecionada)
    }
  }, [dataSelecionada, usarDataEspecifica])

  const handleConfirmar = async () => {
    if (!valor || !responsavel) return
    
    setProcessando(true)
    const dataRef = usarDataEspecifica ? new Date(dataSelecionada + 'T12:00:00') : undefined
    const sucesso = await onConfirmar(parseFloat(valor), responsavel, dataRef)
    setProcessando(false)
    
    if (sucesso) {
      resetarFormulario()
      onFechar()
    }
  }

  const resetarFormulario = () => {
    setValor('')
    setResponsavel('')
    setModoValor('manual')
    setUsarDataEspecifica(false)
    setDataSelecionada(format(new Date(), 'yyyy-MM-dd'))
    setPedidosDataSelecionada([])
    setTotalPedidosData(0)
  }

  const handleFechar = () => {
    if (!processando) {
      resetarFormulario()
      onFechar()
    }
  }

  // Pedidos a exibir (hoje ou data selecionada)
  const pedidosExibir = usarDataEspecifica ? pedidosDataSelecionada : pedidosHoje
  const totalExibir = usarDataEspecifica ? totalPedidosData : totalPedidosHoje
  const pedidosEntregues = pedidosExibir.filter(p => p.status === 'entregue')

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
            className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <Unlock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Abrir Caixa
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Informe o valor inicial e o responsável
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Opção de data específica */}
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Registrar caixa de outra data
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUsarDataEspecifica(!usarDataEspecifica)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    usarDataEspecifica ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    usarDataEspecifica ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Seletor de data */}
              {usarDataEspecifica && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Data de Referência
                  </label>
                  <input
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => setDataSelecionada(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    disabled={processando}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                             dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white
                             focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Modo de valor */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Valor Inicial
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setModoValor('manual'); setValor('') }}
                    disabled={processando}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                      modoValor === 'manual'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm font-medium">Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoValor('pedidos')}
                    disabled={processando || (usarDataEspecifica ? totalPedidosData === 0 : totalPedidosHoje === 0)}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                      modoValor === 'pedidos'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                    } ${(usarDataEspecifica ? totalPedidosData === 0 : totalPedidosHoje === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {carregandoPedidos ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Receipt className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">Pedidos do Dia</span>
                  </button>
                </div>

                {modoValor === 'pedidos' && pedidosEntregues.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-3">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-2">
                      {pedidosEntregues.length} pedido(s) entregue(s){usarDataEspecifica ? ' nesta data' : ' hoje'}:
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {pedidosEntregues.slice(0, 5).map(p => (
                        <div key={p.id} className="flex justify-between text-xs text-green-600 dark:text-green-500">
                          <span>{p.nome_cliente} ({p.forma_pagamento})</span>
                          <span>R$ {Number(p.total).toFixed(2)}</span>
                        </div>
                      ))}
                      {pedidosEntregues.length > 5 && (
                        <p className="text-xs text-green-500">+{pedidosEntregues.length - 5} mais...</p>
                      )}
                    </div>
                    <div className="border-t border-green-200 dark:border-green-700 mt-2 pt-2 flex justify-between font-bold text-green-700 dark:text-green-400">
                      <span>Total:</span>
                      <span>R$ {totalExibir.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {modoValor === 'pedidos' && pedidosEntregues.length === 0 && !carregandoPedidos && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Nenhum pedido entregue encontrado{usarDataEspecifica ? ' nesta data' : ' hoje'}.
                    </p>
                  </div>
                )}

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  disabled={processando || modoValor === 'pedidos'}
                  className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                           dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white text-lg
                           focus:ring-2 focus:ring-green-500 focus:border-transparent
                           disabled:opacity-50 ${modoValor === 'pedidos' ? 'cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Responsável pela Abertura *
                </label>
                <select
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  disabled={processando}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                           dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white
                           focus:ring-2 focus:ring-green-500 focus:border-transparent
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
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white 
                         rounded-xl font-medium transition-colors flex items-center 
                         justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processando ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Abrir Caixa
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
