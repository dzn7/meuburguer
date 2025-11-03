'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Loader2, Plus, Minus, Trash2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
}

type ItemPedido = {
  id: string
  produto_nome?: string
  nome_produto?: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  observacoes?: string
  adicionais?: { id: string; nome_adicional: string; preco: number }[]
}

type Produto = {
  id: string
  nome: string
  preco: number
  categoria: string
}

type ModalEditarPedidoProps = {
  pedido: Pedido | null
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
}

export default function ModalEditarPedido({ pedido, aberto, onFechar, onSucesso }: ModalEditarPedidoProps) {
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('')
  const [status, setStatus] = useState('')
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [mostrarProdutos, setMostrarProdutos] = useState(false)
  const [carregandoItens, setCarregandoItens] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<{ id: string; nome: string; preco: number }[]>([])
  const [itemSelecionadoParaAdicional, setItemSelecionadoParaAdicional] = useState<string | null>(null)

  useEffect(() => {
    if (pedido) {
      setNomeCliente(pedido.nome_cliente)
      setTelefone(pedido.telefone)
      setEndereco(pedido.endereco || '')
      setTipoEntrega(pedido.tipo_entrega)
      setStatus(pedido.status)
      carregarItensPedido()
      carregarProdutos()
      carregarAdicionais()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido])

  const carregarItensPedido = async () => {
    if (!pedido) return
    setCarregandoItens(true)
    try {
      const { data: itensData, error } = await supabase
        .from('itens_pedido')
        .select('*')
        .eq('pedido_id', pedido.id)
        .order('created_at')

      if (error) throw error

      // Carregar adicionais de cada item
      const itensComAdicionais = await Promise.all(
        (itensData || []).map(async (item) => {
          const { data: adicionais } = await supabase
            .from('item_adicionais')
            .select('id, nome_adicional, preco')
            .eq('item_pedido_id', item.id)

          return { ...item, adicionais: adicionais || [] }
        })
      )

      setItens(itensComAdicionais)
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
    } finally {
      setCarregandoItens(false)
    }
  }

  const carregarProdutos = async () => {
    try {
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria')
        .eq('disponivel', true)
        .order('nome')

      const { data: bebidasData, error: bebidasError } = await supabase
        .from('bebidas')
        .select('id, nome, preco, tamanho')
        .eq('disponivel', true)
        .order('nome')

      const produtosFormatados = (produtosData || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
        categoria: p.categoria,
      }))

      const bebidasFormatadas = (bebidasData || []).map((b) => ({
        id: b.id,
        nome: `${b.nome}${b.tamanho ? ` - ${b.tamanho}` : ''}`,
        preco: Number(b.preco),
        categoria: 'Bebidas',
      }))

      setProdutos([...produtosFormatados, ...bebidasFormatadas])
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }

  const carregarAdicionais = async () => {
    try {
      const { data, error } = await supabase
        .from('adicionais')
        .select('id, nome, preco')
        .eq('disponivel', true)
        .order('nome')

      if (error) throw error
      setAdicionaisDisponiveis(data || [])
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error)
    }
  }

  const adicionarAdicionalAoItem = (itemId: string, adicional: { id: string; nome: string; preco: number }) => {
    setItens(
      itens.map((item) => {
        if (item.id === itemId) {
          const jaTemAdicional = item.adicionais?.find((a) => a.id === adicional.id)
          if (jaTemAdicional) return item
          
          const novosAdicionais = [...(item.adicionais || []), { ...adicional, nome_adicional: adicional.nome }]
          const precoAdicionais = novosAdicionais.reduce((sum, a) => sum + Number(a.preco), 0)
          const novoSubtotal = (item.preco_unitario + precoAdicionais) * item.quantidade
          
          return { 
            ...item, 
            adicionais: novosAdicionais,
            subtotal: novoSubtotal
          }
        }
        return item
      })
    )
  }

  const removerAdicionalDoItem = (itemId: string, adicionalId: string) => {
    setItens(
      itens.map((item) => {
        if (item.id === itemId) {
          const novosAdicionais = (item.adicionais || []).filter((a) => a.id !== adicionalId)
          const precoAdicionais = novosAdicionais.reduce((sum, a) => sum + Number(a.preco), 0)
          const novoSubtotal = (item.preco_unitario + precoAdicionais) * item.quantidade
          
          return { 
            ...item, 
            adicionais: novosAdicionais,
            subtotal: novoSubtotal
          }
        }
        return item
      })
    )
  }

  const adicionarItem = (produto: Produto) => {
    const novoItem: ItemPedido = {
      id: `temp-${Date.now()}`,
      nome_produto: produto.nome,
      produto_nome: produto.nome,
      quantidade: 1,
      preco_unitario: produto.preco,
      subtotal: produto.preco,
      observacoes: '',
    }
    setItens([...itens, novoItem])
    setBuscaProduto('')
    setMostrarProdutos(false)
  }

  const removerItem = (itemId: string) => {
    setItens(itens.filter((item) => item.id !== itemId))
  }

  const atualizarQuantidade = (itemId: string, quantidade: number) => {
    if (quantidade < 1) return
    setItens(
      itens.map((item) => {
        if (item.id === itemId) {
          const subtotal = item.preco_unitario * quantidade
          return { ...item, quantidade, subtotal }
        }
        return item
      })
    )
  }

  const atualizarObservacoes = (itemId: string, observacoes: string) => {
    setItens(
      itens.map((item) => (item.id === itemId ? { ...item, observacoes } : item))
    )
  }

  const calcularTotal = () => {
    const subtotalItens = itens.reduce((acc, item) => acc + item.subtotal, 0)
    const taxaEntrega = tipoEntrega === 'entrega' ? 2 : 0
    return subtotalItens + taxaEntrega
  }

  const getTaxaEntrega = () => {
    return tipoEntrega === 'entrega' ? 2 : 0
  }

  const salvarAlteracoes = async () => {
    if (!pedido || !nomeCliente || !telefone) {
      return
    }

    setSalvando(true)
    try {
      // Calcular valores
      const subtotal = itens.reduce((acc, item) => acc + item.subtotal, 0)
      const taxaEntrega = tipoEntrega === 'entrega' ? 2 : 0
      const totalFinal = subtotal + taxaEntrega

      // Atualizar dados do pedido
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({
          nome_cliente: nomeCliente,
          telefone,
          endereco: endereco || null,
          tipo_entrega: tipoEntrega,
          status,
          subtotal: subtotal,
          taxa_entrega: taxaEntrega,
          total: totalFinal,
        })
        .eq('id', pedido.id)

      if (pedidoError) throw pedidoError

      // Remover itens antigos
      const { error: deleteError } = await supabase
        .from('itens_pedido')
        .delete()
        .eq('pedido_id', pedido.id)

      if (deleteError) throw deleteError

      // Inserir itens atualizados
      const itensParaInserir = itens.map((item) => ({
        pedido_id: pedido.id,
        nome_produto: item.nome_produto || item.produto_nome || 'Produto',
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
        observacoes: item.observacoes || null,
      }))

      const { error: insertError } = await supabase
        .from('itens_pedido')
        .insert(itensParaInserir)

      if (insertError) throw insertError

      onSucesso()
      onFechar()
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      // Erro será tratado pelo componente pai
    } finally {
      setSalvando(false)
    }
  }

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'pendente':
        return 'bg-amber-50 text-amber-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-amber-200 dark:border-yellow-800'
      case 'confirmado':
        return 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'preparando':
        return 'bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      case 'pronto':
        return 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'entregue':
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800'
      case 'cancelado':
        return 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800'
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800'
    }
  }

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  )

  return (
    <AnimatePresence>
      {aberto && pedido && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
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
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 
                     dark:border-zinc-800 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Editar Pedido</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  #{pedido.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={onFechar}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Dados do Cliente */}
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    Dados do Cliente
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Nome do Cliente *
                      </label>
                      <input
                        type="text"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Telefone *
                      </label>
                      <input
                        type="tel"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Endereço
                      </label>
                      <textarea
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                                 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Status e Tipo */}
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    Informações do Pedido
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Tipo de Pedido
                      </label>
                      <select
                        value={tipoEntrega}
                        onChange={(e) => setTipoEntrega(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                                 cursor-pointer"
                      >
                        <option value="entrega">Entrega</option>
                        <option value="retirada">Retirada</option>
                        <option value="local">Consumir no Local</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Status do Pedido
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg font-medium
                                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                                 cursor-pointer ${getStatusColor(status)}`}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="preparando">Preparando</option>
                        <option value="pronto">Pronto</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    Itens do Pedido
                  </h3>

                  {/* Buscar Produtos */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="text"
                      value={buscaProduto}
                      onChange={(e) => {
                        setBuscaProduto(e.target.value)
                        setMostrarProdutos(e.target.value.length > 0)
                      }}
                      onFocus={() => setMostrarProdutos(buscaProduto.length > 0)}
                      placeholder="Buscar produto para adicionar..."
                      className="w-full pl-11 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                               dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                               placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 
                               focus:border-transparent"
                    />
                    
                    {mostrarProdutos && produtosFiltrados.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 
                                    dark:border-zinc-800 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {produtosFiltrados.map((produto) => (
                          <button
                            key={produto.id}
                            onClick={() => adicionarItem(produto)}
                            className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 
                                     transition-colors border-b border-zinc-200 dark:border-zinc-800 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-zinc-900 dark:text-white">{produto.nome}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{produto.categoria}</p>
                              </div>
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                R$ {produto.preco.toFixed(2)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lista de Itens */}
                  {carregandoItens ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                    </div>
                  ) : itens.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 border border-zinc-200 
                                  dark:border-zinc-800 rounded-lg">
                      <p className="text-sm">Nenhum item no pedido</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {itens.map((item) => (
                        <div
                          key={item.id}
                          className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 
                                   dark:border-zinc-700"
                        >
                          <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-zinc-900 dark:text-white">
                              {item.produto_nome || item.nome_produto || 'Produto'}
                            </h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              R$ {item.preco_unitario.toFixed(2)} cada
                            </p>
                            {item.adicionais && item.adicionais.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {item.adicionais.map((adicional) => (
                                  <div key={adicional.id} className="flex items-center justify-between text-xs">
                                    <span className="text-amber-600 dark:text-amber-400">
                                      + {adicional.nome_adicional} (R$ {Number(adicional.preco).toFixed(2)})
                                    </span>
                                    <button
                                      onClick={() => removerAdicionalDoItem(item.id, adicional.id)}
                                      className="text-red-600 hover:text-red-700 ml-2"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                                disabled={item.quantidade <= 1}
                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-900 
                                         border border-zinc-200 dark:border-zinc-700 rounded-lg
                                         hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-semibold text-zinc-900 dark:text-white">
                                {item.quantidade}
                              </span>
                              <button
                                onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-900 
                                         border border-zinc-200 dark:border-zinc-700 rounded-lg
                                         hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removerItem(item.id)}
                                className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 
                                         rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Botão adicionar adicionais */}
                          {adicionaisDisponiveis.length > 0 && (
                            <button
                              onClick={() => setItemSelecionadoParaAdicional(
                                itemSelecionadoParaAdicional === item.id ? null : item.id
                              )}
                              className="mb-3 px-3 py-2 text-sm bg-amber-50 dark:bg-amber-950/20 text-amber-600 
                                       dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/30 
                                       border border-amber-200 dark:border-amber-800 rounded-lg font-medium 
                                       transition-colors w-full"
                            >
                              {itemSelecionadoParaAdicional === item.id ? '- Ocultar adicionais' : '+ Adicionar adicionais'}
                            </button>
                          )}

                          {/* Lista de adicionais disponíveis */}
                          {itemSelecionadoParaAdicional === item.id && (
                            <div className="mb-3 grid grid-cols-2 gap-2">
                              {adicionaisDisponiveis.length > 0 ? (
                                adicionaisDisponiveis.map((adicional) => {
                                  const jaAdicionado = item.adicionais?.find((a) => a.id === adicional.id)
                                  return (
                                    <button
                                      key={adicional.id}
                                      onClick={() => adicionarAdicionalAoItem(item.id, adicional)}
                                      disabled={!!jaAdicionado}
                                      className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 
                                               dark:border-zinc-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 
                                               hover:border-amber-500 transition-colors disabled:opacity-50 
                                               disabled:cursor-not-allowed text-left"
                                    >
                                      <div className="font-medium text-zinc-900 dark:text-white">{adicional.nome}</div>
                                      <div className="text-amber-600 dark:text-amber-400">+ R$ {adicional.preco.toFixed(2)}</div>
                                    </button>
                                  )
                                })
                              ) : (
                                <div className="col-span-2 text-center text-sm text-zinc-500 py-4">
                                  Nenhum adicional disponível
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={item.observacoes || ''}
                              onChange={(e) => atualizarObservacoes(item.id, e.target.value)}
                              placeholder="Observações (ex: sem cebola)"
                              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 
                                       dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                       placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 
                                       focus:border-transparent mr-3"
                            />
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              R$ {item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                      <span>Subtotal:</span>
                      <span>R$ {itens.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)}</span>
                    </div>
                    {tipoEntrega === 'entrega' && (
                      <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                        <span>Taxa de Entrega:</span>
                        <span>R$ 2.00</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800">
                      <span className="text-lg font-semibold text-zinc-900 dark:text-white">Total:</span>
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        R$ {calcularTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={onFechar}
                disabled={salvando}
                className="px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 
                         bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 
                         rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAlteracoes}
                disabled={salvando || !nomeCliente || !telefone || itens.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white 
                         bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
