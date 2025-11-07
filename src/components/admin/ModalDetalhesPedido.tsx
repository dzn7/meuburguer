'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Edit2, Package, User, Phone, MapPin, Clock, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

type ItemPedido = {
  id: string
  nome_produto?: string
  produto_nome?: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  adicionais?: string
  observacoes?: string
}

type Pedido = {
  id: string
  nome_cliente: string
  telefone: string
  endereco?: string
  tipo_entrega: string
  status: string
  subtotal: number
  taxa_entrega: number
  total: number
  created_at: string
  itens?: ItemPedido[]
}

type ModalDetalhesPedidoProps = {
  pedidoId: string | null
  aberto: boolean
  onFechar: () => void
  onEditar?: (pedido: Pedido) => void
  onGerarPDF?: (pedido: Pedido) => void
}

export default function ModalDetalhesPedido({
  pedidoId,
  aberto,
  onFechar,
  onEditar,
  onGerarPDF,
}: ModalDetalhesPedidoProps) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [loading, setLoading] = useState(false)

  const carregarPedido = useCallback(async () => {
    if (!pedidoId) return
    
    setLoading(true)
    try {
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .single()

      if (pedidoError) throw pedidoError

      const { data: itensData, error: itensError } = await supabase
        .from('itens_pedido')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at')

      if (itensError) throw itensError

      setPedido(pedidoData)
      setItens((itensData || []) as ItemPedido[])
    } catch (error) {
      console.error('Erro ao carregar pedido:', error)
    } finally {
      setLoading(false)
    }
  }, [pedidoId])

  useEffect(() => {
    if (aberto && pedidoId) {
      void carregarPedido()
    }
  }, [aberto, pedidoId, carregarPedido])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendente':
        return 'bg-amber-100 text-amber-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'em preparo':
      case 'preparando':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'pronto':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'entregue':
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400'
      case 'cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400'
    }
  }

  const getTipoEntregaColor = (tipo: string) => {
    switch (tipo) {
      case 'entrega':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'retirada':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'local':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400'
    }
  }

  const nomeProduto = (item: ItemPedido) => 
    item.nome_produto || item.produto_nome || 'Produto'

  return (
    <AnimatePresence>
      {aberto && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFechar}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-4 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                     md:inset-auto z-[9999] w-auto md:w-full md:max-w-4xl 
                     bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl 
                     border border-zinc-200 dark:border-zinc-800 overflow-hidden
                     max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 md:p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold">
                    Pedido #{pedidoId?.slice(0, 8).toUpperCase()}
                  </h3>
                  {pedido && (
                    <p className="text-sm text-amber-50 mt-1">
                      {format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <button
                  onClick={onFechar}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pedido ? (
                <div className="space-y-6">
                  {/* Informações do Cliente */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-bold text-zinc-900 dark:text-white">Dados do Cliente</h4>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Nome</p>
                          <p className="font-semibold text-zinc-900 dark:text-white">{pedido.nome_cliente}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Telefone</p>
                          <p className="font-semibold text-zinc-900 dark:text-white">{pedido.telefone}</p>
                        </div>
                      </div>
                      {pedido.endereco && (
                        <div className="flex items-start gap-3 md:col-span-2">
                          <MapPin className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Endereço</p>
                            <p className="font-semibold text-zinc-900 dark:text-white">{pedido.endereco}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status e Tipo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Status</p>
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusColor(pedido.status)}`}>
                        {pedido.status}
                      </span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Tipo</p>
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium ${getTipoEntregaColor(pedido.tipo_entrega)}`}>
                        {pedido.tipo_entrega === 'entrega' ? 'Entrega' : pedido.tipo_entrega === 'retirada' ? 'Retirada' : 'No Local'}
                      </span>
                    </div>
                  </div>

                  {/* Itens do Pedido */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-bold text-zinc-900 dark:text-white">Itens do Pedido</h4>
                    </div>
                    <div className="space-y-3">
                      {itens.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-semibold text-zinc-900 dark:text-white">
                                {item.quantidade}x {nomeProduto(item)}
                              </p>
                              {item.observacoes && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic">
                                  Obs: {item.observacoes}
                                </p>
                              )}
                              {item.adicionais && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                  Adicionais: {item.adicionais}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-amber-600 dark:text-amber-400">
                                R$ {item.subtotal.toFixed(2)}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                R$ {item.preco_unitario.toFixed(2)} un.
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-bold text-zinc-900 dark:text-white">Resumo</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          R$ {pedido.subtotal.toFixed(2)}
                        </span>
                      </div>
                      {pedido.taxa_entrega > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-600 dark:text-zinc-400">Taxa de Entrega</span>
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            R$ {pedido.taxa_entrega.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-amber-300 dark:border-amber-700 flex justify-between">
                        <span className="font-bold text-zinc-900 dark:text-white">Total</span>
                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                          R$ {pedido.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-zinc-500 dark:text-zinc-400">Pedido não encontrado</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {pedido && (
              <div className="p-4 md:p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 flex-shrink-0">
                <button
                  onClick={onFechar}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300
                           bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700
                           rounded-xl transition-colors"
                >
                  Fechar
                </button>
                {onEditar && (
                  <button
                    onClick={() => {
                      onEditar(pedido)
                      onFechar()
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium 
                             text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30
                             hover:bg-amber-100 dark:hover:bg-amber-950/50 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                )}
                {onGerarPDF && (
                  <button
                    onClick={() => {
                      onGerarPDF(pedido)
                      onFechar()
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium 
                             text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
