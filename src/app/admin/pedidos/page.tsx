'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Eye,
  Edit2,
  FileText,
  RefreshCw,
  Plus,
  Search,
  Filter,
  X,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import { gerarPDFPedido } from '@/lib/pdf-generator'
import ModalEditarPedido from '@/components/admin/ModalEditarPedido'
import ModalNotificacao from '@/components/ModalNotificacao'

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

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
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
    carregarPedidos()

    // Configurar realtime subscription
    const channel = supabase
      .channel('pedidos-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        async (payload) => {
          console.log('Novo pedido:', payload.new)
          // Adicionar novo pedido à lista
          const novoPedido = payload.new as any
          const { data: itens } = await supabase
            .from('itens_pedido')
            .select('id, nome_produto, quantidade, preco_unitario, subtotal')
            .eq('pedido_id', novoPedido.id)
            .limit(10)
          
          setPedidos(prev => [{ ...novoPedido, itens: itens || [] }, ...prev])
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        (payload) => {
          console.log('Pedido atualizado:', payload.new)
          // Atualizar pedido na lista
          setPedidos(prev => prev.map(p => 
            p.id === payload.new.id ? { ...p, ...payload.new } : p
          ))
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pedidos' },
        (payload) => {
          console.log('Pedido removido:', payload.old)
          // Remover pedido da lista
          setPedidos(prev => prev.filter(p => p.id !== payload.old.id))
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const carregarPedidos = async () => {
    setLoading(true)
    try {
      // Carregar apenas campos necessários para a listagem
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, nome_cliente, telefone, endereco, tipo_entrega, status, subtotal, taxa_entrega, total, created_at')
        .order('created_at', { ascending: false })
        .limit(50) // Limitar quantidade inicial

      if (error) throw error

      // Carregar itens apenas para os pedidos visíveis
      const pedidosComItens = await Promise.all(
        (data || []).map(async (pedido) => {
          const { data: itens } = await supabase
            .from('itens_pedido')
            .select('id, nome_produto, quantidade, preco_unitario, subtotal')
            .eq('pedido_id', pedido.id)
            .limit(10)

          return { ...pedido, itens: itens || [] }
        })
      )

      setPedidos(pedidosComItens)
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
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

          carregarPedidos()
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

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchStatus = filtroStatus === 'todos' || pedido.status === filtroStatus
    const matchTipo = filtroTipo === 'todos' || pedido.tipo_entrega === filtroTipo
    const matchBusca =
      busca === '' ||
      pedido.nome_cliente.toLowerCase().includes(busca.toLowerCase()) ||
      pedido.telefone.includes(busca) ||
      pedido.id.toLowerCase().includes(busca.toLowerCase())

    return matchStatus && matchTipo && matchBusca
  })

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

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                Gerenciar Pedidos
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {pedidosFiltrados.length} pedidos encontrados
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={carregarPedidos}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 
                         bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 
                         rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={() => router.push('/admin/pedidos/novo')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white 
                         bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Novo Pedido
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone ou ID..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 
                           border border-zinc-200 dark:border-zinc-700 rounded-lg
                           text-zinc-900 dark:text-white placeholder-zinc-500
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                {busca && (
                  <button
                    onClick={() => setBusca('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 
                           border border-zinc-200 dark:border-zinc-700 rounded-lg
                           text-zinc-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           appearance-none cursor-pointer"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Preparo">Em Preparo</option>
                  <option value="Pronto">Pronto</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 
                           border border-zinc-200 dark:border-zinc-700 rounded-lg
                           text-zinc-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           appearance-none cursor-pointer"
                >
                  <option value="todos">Todos os Tipos</option>
                  <option value="Online">Online</option>
                  <option value="Presencial">Presencial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Search className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                Nenhum pedido encontrado
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Tente ajustar os filtros ou criar um novo pedido
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pedidosFiltrados.map((pedido, index) => (
                <motion.div
                  key={pedido.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 
                           hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-zinc-900 dark:text-white text-base mb-1 truncate">
                          {pedido.nome_cliente}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          #{pedido.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(pedido.status)}`}>
                        {pedido.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium min-w-[60px]">Telefone:</span>
                        <span className="truncate">{pedido.telefone}</span>
                      </div>
                      {pedido.endereco && (
                        <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium min-w-[60px] flex-shrink-0">Endereço:</span>
                          <span className="line-clamp-2 text-xs">{pedido.endereco}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          pedido.tipo_entrega === 'entrega' 
                            ? 'bg-zinc-100 text-zinc-800 dark:bg-blue-900/20 dark:text-blue-400' 
                            : pedido.tipo_entrega === 'local'
                            ? 'bg-zinc-100 text-zinc-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-400'
                        }`}>
                          {pedido.tipo_entrega === 'entrega' ? 'Entrega' : pedido.tipo_entrega === 'local' ? 'No Local' : 'Retirada'}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {format(new Date(pedido.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
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
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => router.push(`/admin/pedidos/${pedido.id}`)}
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
                          onClick={() => handleGerarPDF(pedido.id)}
                          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium 
                                   text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 
                                   dark:hover:bg-green-950/50 dark:text-green-400 rounded-lg transition-colors"
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
              ))}
            </div>
          )}
        </div>

        <ModalEditarPedido
          pedido={pedidoSelecionado}
          aberto={modalEditarAberto}
          onFechar={() => {
            setModalEditarAberto(false)
            setPedidoSelecionado(null)
          }}
          onSucesso={() => {
            carregarPedidos()
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
