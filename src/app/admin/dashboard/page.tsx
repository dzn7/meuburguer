'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, DollarSign, TrendingUp, Clock, Eye, Edit2, FileText, Trash2, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import { gerarPDFPedido } from '@/lib/pdf-generator'
import ModalEditarPedido from '@/components/admin/ModalEditarPedido'
import ModalNotificacao from '@/components/ModalNotificacao'
import ModalWhatsApp from '@/components/admin/ModalWhatsApp'
import ModalDetalhesPedido from '@/components/admin/ModalDetalhesPedido'

type Estatisticas = {
  totalPedidos: number
  pedidosHoje: number
  receitaTotal: number
  receitaHoje: number
}

type ItemPedido = {
  id: string
  produto_nome?: string
  nome_produto?: string
  quantidade: number
  preco_unitario: number
  subtotal: number
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

export default function Dashboard() {
  const [estatisticas, setEstatisticas] = useState<Estatisticas>({
    totalPedidos: 0,
    pedidosHoje: 0,
    receitaTotal: 0,
    receitaHoje: 0,
  })
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [modalWhatsAppAberto, setModalWhatsAppAberto] = useState(false)
  const [pedidoWhatsApp, setPedidoWhatsApp] = useState<Pedido | null>(null)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [pedidoDetalhesId, setPedidoDetalhesId] = useState<string | null>(null)
  const [novosPedidosIds, setNovosPedidosIds] = useState<Set<string>>(new Set())
  const [modalNotificacao, setModalNotificacao] = useState<{
    aberto: boolean
    tipo: 'sucesso' | 'erro' | 'aviso' | 'info' | 'confirmacao'
    titulo: string
    mensagem: string
    onConfirmar: () => void
  }>({
    aberto: false,
    tipo: 'info',
    titulo: '',
    mensagem: '',
    onConfirmar: () => {}
  })
  const router = useRouter()

  useEffect(() => {
    carregarDados()

    // Polling a cada 5 segundos para garantir atualização em tempo real
    const pollingInterval = setInterval(() => {
      console.log('[Dashboard] Polling - verificando novos pedidos...')
      carregarDados()
    }, 5000)

    // Configurar realtime subscription como backup
    const channel = supabase
      .channel('dashboard-pedidos')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        async (payload) => {
          console.log('[Dashboard] Realtime - Novo pedido detectado:', payload.new)
          // Adicionar novo pedido à lista
          const novoPedido = payload.new as any
          const { data: itens } = await supabase
            .from('itens_pedido')
            .select('id, nome_produto, quantidade, preco_unitario, subtotal')
            .eq('pedido_id', novoPedido.id)
          
          setPedidos(prev => {
            // Evita duplicatas
            if (prev.some(p => p.id === novoPedido.id)) {
              return prev
            }
            return [{ ...novoPedido, itens: itens || [] }, ...prev.slice(0, 11)]
          })
          
          // Marcar como novo
          setNovosPedidosIds(prev => new Set(prev).add(novoPedido.id))
          
          // Remover marcação após 5 segundos
          setTimeout(() => {
            setNovosPedidosIds(prev => {
              const newSet = new Set(prev)
              newSet.delete(novoPedido.id)
              return newSet
            })
          }, 5000)
          
          // Atualizar estatísticas
          setEstatisticas(prev => ({
            ...prev,
            totalPedidos: prev.totalPedidos + 1,
            pedidosHoje: prev.pedidosHoje + 1,
            receitaTotal: prev.receitaTotal + novoPedido.total,
            receitaHoje: prev.receitaHoje + novoPedido.total
          }))
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        (payload) => {
          console.log('[Dashboard] Realtime - Pedido atualizado:', payload.new)
          // Atualizar pedido na lista
          setPedidos(prev => prev.map(p => 
            p.id === payload.new.id ? { ...p, ...payload.new } : p
          ))
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pedidos' },
        (payload) => {
          console.log('[Dashboard] Realtime - Pedido removido:', payload.old)
          // Remover pedido da lista
          setPedidos(prev => prev.filter(p => p.id !== payload.old.id))
        }
      )
      .subscribe((status) => {
        console.log('[Dashboard] Realtime subscription status:', status)
      })

    // Cleanup
    return () => {
      console.log('[Dashboard] Limpando polling e subscription')
      clearInterval(pollingInterval)
      supabase.removeChannel(channel)
    }
  }, [])

  const carregarDados = async () => {
    try {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const { data: todosPedidos, error: errorTodos } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })

      if (errorTodos) throw errorTodos

      const { data: pedidosHoje, error: errorHoje } = await supabase
        .from('pedidos')
        .select('*')
        .gte('created_at', hoje.toISOString())
        .order('created_at', { ascending: false })

      if (errorHoje) throw errorHoje

      const receitaTotal = todosPedidos?.reduce((acc, pedido) => acc + Number(pedido.total), 0) || 0
      const receitaHoje = pedidosHoje?.reduce((acc, pedido) => acc + Number(pedido.total), 0) || 0

      setEstatisticas({
        totalPedidos: todosPedidos?.length || 0,
        pedidosHoje: pedidosHoje?.length || 0,
        receitaTotal,
        receitaHoje,
      })

      // Carregar itens para os primeiros 12 pedidos
      const pedidosParaExibir = todosPedidos?.slice(0, 12) || []
      const pedidosComItens = await Promise.all(
        pedidosParaExibir.map(async (pedido) => {
          try {
            const { data: itensData } = await supabase
              .from('itens_pedido')
              .select('*')
              .eq('pedido_id', pedido.id)
              .order('created_at')

            return {
              ...pedido,
              itens: itensData || [],
            }
          } catch (error) {
            console.error(`Erro ao carregar itens do pedido ${pedido.id}:`, error)
            return { ...pedido, itens: [] }
          }
        })
      )

      setPedidos(pedidosComItens)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGerarPDF = async (pedidoId: string) => {
    try {
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .single()

      if (pedidoError) throw pedidoError

      const { data: itens, error: itensError } = await supabase
        .from('itens_pedido')
        .select('*')
        .eq('pedido_id', pedidoId)

      if (itensError) throw itensError

      const pedidoCompleto = {
        ...pedido,
        itens: itens.map((item) => ({
          nome_produto: item.nome_produto || item.produto_nome || 'Produto',
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
          adicionais: item.adicionais,
          observacoes: item.observacoes,
        })),
      }

      gerarPDFPedido(pedidoCompleto)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
    }
  }

  const handleExcluirPedido = async (pedidoId: string) => {
    setModalNotificacao({
      aberto: true,
      tipo: 'confirmacao',
      titulo: 'Confirmar Exclusão',
      mensagem: 'Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.',
      onConfirmar: async () => {
        try {
          const { error: itensError } = await supabase
            .from('itens_pedido')
            .delete()
            .eq('pedido_id', pedidoId)

          if (itensError) throw itensError

          const { error: pedidoError } = await supabase
            .from('pedidos')
            .delete()
            .eq('id', pedidoId)

          if (pedidoError) throw pedidoError

          carregarDados()
          setModalNotificacao({
            aberto: true,
            tipo: 'sucesso',
            titulo: 'Pedido Excluído',
            mensagem: 'O pedido foi excluído com sucesso.',
            onConfirmar: () => {}
          })
        } catch (error) {
          console.error('Erro ao excluir pedido:', error)
          setModalNotificacao({
            aberto: true,
            tipo: 'erro',
            titulo: 'Erro ao Excluir',
            mensagem: 'Não foi possível excluir o pedido. Tente novamente.',
            onConfirmar: () => {}
          })
        }
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'Em Preparo':
        return 'bg-zinc-100 text-zinc-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'Pronto':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'Entregue':
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-400'
      case 'Cancelado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-400'
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-screen">
            <div className="w-12 h-12 border-4 border-dourado-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Dashboard</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Visão geral do seu negócio
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <ShoppingCart className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Pedidos Hoje</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{estatisticas.pedidosHoje}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Receita Hoje</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">R$ {estatisticas.receitaHoje.toFixed(2)}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total de Pedidos</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{estatisticas.totalPedidos}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">R$ {estatisticas.receitaTotal.toFixed(2)}</p>
              </div>
            </motion.div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Pedidos Recentes</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Últimos pedidos realizados</p>
              </div>
            </div>

            {pedidos.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
                <ShoppingCart className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                <p className="text-zinc-500 dark:text-zinc-400">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pedidos.map((pedido, index) => {
                  const isNovo = novosPedidosIds.has(pedido.id)
                  return (
                  <motion.div
                    key={pedido.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white dark:bg-zinc-900 rounded-xl border hover:shadow-lg transition-all duration-300 overflow-hidden group relative ${
                      isNovo 
                        ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 animate-pulse' 
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {isNovo && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="px-2 py-1 text-xs font-bold bg-amber-500 text-white rounded-full animate-bounce">
                          NOVO
                        </span>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-zinc-900 dark:text-white text-base mb-1">
                            {pedido.nome_cliente}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            #{pedido.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pedido.status)}`}>
                          {pedido.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium">Tel:</span>
                          <span>{pedido.telefone}</span>
                        </div>
                        {pedido.endereco && (
                          <div className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">End:</span>
                            <span className="flex-1 line-clamp-2">{pedido.endereco}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            pedido.tipo_entrega === 'entrega' 
                              ? 'bg-zinc-100 text-zinc-800 dark:bg-blue-900/20 dark:text-blue-400' 
                              : pedido.tipo_entrega === 'local'
                              ? 'bg-zinc-100 text-zinc-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-400'
                          }`}>
                            {pedido.tipo_entrega === 'entrega' ? 'Entrega' : pedido.tipo_entrega === 'local' ? 'No Local' : 'Retirada'}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400">
                            {format(new Date(pedido.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      {/* Itens do Pedido */}
                      {pedido.itens && pedido.itens.length > 0 && (
                        <div className="mb-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Itens:</p>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {pedido.itens.slice(0, 3).map((item, idx) => (
                              <div key={item.id || idx} className="flex items-center justify-between text-xs">
                                <span className="flex-1 text-zinc-600 dark:text-zinc-400 truncate">
                                  {item.quantidade}x {item.produto_nome || item.nome_produto || 'Produto'}
                                </span>
                                <span className="text-zinc-500 dark:text-zinc-500 ml-2">
                                  R$ {item.subtotal.toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {pedido.itens.length > 3 && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                                +{pedido.itens.length - 3} mais
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total:</span>
                          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                            R$ {pedido.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          <button
                            onClick={() => {
                              setPedidoDetalhesId(pedido.id)
                              setModalDetalhesAberto(true)
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium 
                                     text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-blue-950/30 
                                     dark:hover:bg-blue-950/50 dark:text-blue-400 rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setPedidoSelecionado(pedido)
                              setModalEditarAberto(true)
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium 
                                     text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 
                                     dark:hover:bg-amber-950/50 dark:text-amber-400 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setPedidoWhatsApp(pedido)
                              setModalWhatsAppAberto(true)
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium 
                                     text-white bg-green-500 hover:bg-green-600 dark:bg-green-600 
                                     dark:hover:bg-green-700 rounded-lg transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleGerarPDF(pedido.id)}
                            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium 
                                     text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 
                                     dark:hover:bg-purple-950/50 dark:text-purple-400 rounded-lg transition-colors"
                            title="Gerar PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExcluirPedido(pedido.id)}
                            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium 
                                     text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 
                                     dark:hover:bg-red-950/50 dark:text-red-400 rounded-lg transition-colors"
                            title="Excluir pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <ModalEditarPedido
          pedido={pedidoSelecionado}
          aberto={modalEditarAberto}
          onFechar={() => {
            setModalEditarAberto(false)
            setPedidoSelecionado(null)
          }}
          onSucesso={() => {
            carregarDados()
          }}
        />

        <ModalDetalhesPedido
          pedidoId={pedidoDetalhesId}
          aberto={modalDetalhesAberto}
          onFechar={() => {
            setModalDetalhesAberto(false)
            setPedidoDetalhesId(null)
          }}
          onEditar={(pedido) => {
            setPedidoSelecionado(pedido)
            setModalEditarAberto(true)
          }}
          onGerarPDF={(pedido) => {
            handleGerarPDF(pedido.id)
          }}
        />

        <ModalWhatsApp
          pedido={pedidoWhatsApp}
          aberto={modalWhatsAppAberto}
          onFechar={() => {
            setModalWhatsAppAberto(false)
            setPedidoWhatsApp(null)
          }}
        />

        <ModalNotificacao
          aberto={modalNotificacao.aberto}
          tipo={modalNotificacao.tipo}
          titulo={modalNotificacao.titulo}
          mensagem={modalNotificacao.mensagem}
          onFechar={() => setModalNotificacao({ ...modalNotificacao, aberto: false })}
          onConfirmar={modalNotificacao.onConfirmar}
          textoBotaoConfirmar="Excluir"
          textoBotaoCancelar="Cancelar"
        />
      </AdminLayout>
    </ProtectedRoute>
  )
}
