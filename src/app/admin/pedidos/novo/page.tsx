'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Save,
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  Split,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'

type ProdutoSelecionado = {
  id: string
  nome: string
  preco: number
  quantidade: number
  observacoes: string
  adicionais: Adicional[]
}

type Produto = {
  id: string
  nome: string
  preco: number
  categoria: string
}

type Adicional = {
  id: string
  nome: string
  preco: number
}

type Pagamento = {
  id: string
  forma: string
  valor: number
}

const FORMAS_PAGAMENTO = [
  { id: 'dinheiro', nome: 'Dinheiro', icone: Banknote, cor: 'text-green-600' },
  { id: 'pix', nome: 'PIX', icone: Smartphone, cor: 'text-purple-600' },
  { id: 'credito', nome: 'Crédito', icone: CreditCard, cor: 'text-blue-600' },
  { id: 'debito', nome: 'Débito', icone: CreditCard, cor: 'text-amber-600' },
  { id: 'vale_refeicao', nome: 'Vale Refeição', icone: CreditCard, cor: 'text-red-600' },
]

export default function NovoPedidoPage() {
  const [nomeCliente, setNomeCliente] = useState('')
  const [endereco, setEndereco] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('entrega')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [pagamentoDividido, setPagamentoDividido] = useState(false)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [novoPagamentoForma, setNovoPagamentoForma] = useState('')
  const [novoPagamentoValor, setNovoPagamentoValor] = useState('')
  const [status, setStatus] = useState('confirmado')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoSelecionado[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [buscaProduto, setBuscaProduto] = useState('')
  const [mostrarProdutos, setMostrarProdutos] = useState(false)
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([])
  const [produtoSelecionadoParaAdicional, setProdutoSelecionadoParaAdicional] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    carregarProdutosEBebidas()
    carregarAdicionais()
  }, [])

  const carregarProdutosEBebidas = async () => {
    try {
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria')
        .eq('disponivel', true)
        .order('nome')

      console.log('Produtos carregados:', produtosData, produtosError)

      const { data: bebidasData, error: bebidasError } = await supabase
        .from('bebidas')
        .select('id, nome, preco, tamanho')
        .eq('disponivel', true)
        .order('nome')

      console.log('Bebidas carregadas:', bebidasData, bebidasError)

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

      const todosProdutos = [...produtosFormatados, ...bebidasFormatadas]
      console.log('Todos produtos:', todosProdutos)
      setProdutos(todosProdutos)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoadingProdutos(false)
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
      console.log('[Novo Pedido] Adicionais carregados:', data?.length || 0, data)
      setAdicionaisDisponiveis(data || [])
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error)
    }
  }

  const adicionarProduto = (produto: Produto) => {
    const jaExiste = produtosSelecionados.find((p) => p.id === produto.id)

    if (jaExiste) {
      setProdutosSelecionados(
        produtosSelecionados.map((p) =>
          p.id === produto.id ? { ...p, quantidade: p.quantidade + 1 } : p
        )
      )
    } else {
      setProdutosSelecionados([
        ...produtosSelecionados,
        { ...produto, quantidade: 1, observacoes: '', adicionais: [] },
      ])
    }
    setBuscaProduto('')
    setMostrarProdutos(false)
  }

  const removerProduto = (id: string) => {
    setProdutosSelecionados(produtosSelecionados.filter((p) => p.id !== id))
  }

  const atualizarQuantidade = (id: string, quantidade: number) => {
    if (quantidade < 1) return
    setProdutosSelecionados(
      produtosSelecionados.map((p) => (p.id === id ? { ...p, quantidade } : p))
    )
  }

  const atualizarObservacoes = (id: string, observacoes: string) => {
    setProdutosSelecionados(
      produtosSelecionados.map((p) => (p.id === id ? { ...p, observacoes } : p))
    )
  }

  const adicionarAdicional = (produtoId: string, adicional: Adicional) => {
    setProdutosSelecionados(
      produtosSelecionados.map((p) => {
        if (p.id === produtoId) {
          const jaTemAdicional = p.adicionais.find((a) => a.id === adicional.id)
          if (jaTemAdicional) return p
          return { ...p, adicionais: [...p.adicionais, adicional] }
        }
        return p
      })
    )
  }

  const removerAdicional = (produtoId: string, adicionalId: string) => {
    setProdutosSelecionados(
      produtosSelecionados.map((p) => {
        if (p.id === produtoId) {
          return { ...p, adicionais: p.adicionais.filter((a) => a.id !== adicionalId) }
        }
        return p
      })
    )
  }

  const calcularTotal = () => {
    const subtotal = produtosSelecionados.reduce((acc, p) => {
      const precoBase = p.preco * p.quantidade
      const precoAdicionais = p.adicionais.reduce((sum, a) => sum + a.preco, 0) * p.quantidade
      return acc + precoBase + precoAdicionais
    }, 0)
    const taxaEntrega = tipoEntrega === 'entrega' ? 2 : 0
    return subtotal + taxaEntrega
  }

  const adicionarPagamento = () => {
    if (!novoPagamentoForma || !novoPagamentoValor) return
    const valor = parseFloat(novoPagamentoValor)
    if (isNaN(valor) || valor <= 0) return
    
    // Validar se não ultrapassa o total
    const totalAtual = pagamentos.reduce((acc, p) => acc + p.valor, 0)
    const total = calcularTotal()
    
    if (totalAtual + valor > total) {
      alert(`Valor excede o total do pedido. Máximo permitido: R$ ${(total - totalAtual).toFixed(2)}`)
      return
    }
    
    setPagamentos([...pagamentos, {
      id: Date.now().toString(),
      forma: novoPagamentoForma,
      valor
    }])
    setNovoPagamentoForma('')
    setNovoPagamentoValor('')
  }

  const removerPagamento = (id: string) => {
    setPagamentos(pagamentos.filter(p => p.id !== id))
  }

  const totalPagamentos = pagamentos.reduce((acc, p) => acc + p.valor, 0)
  const valorRestante = calcularTotal() - totalPagamentos

  const salvarPedido = async () => {
    if (!nomeCliente || produtosSelecionados.length === 0) {
      alert('Preencha o nome do cliente e adicione pelo menos um produto')
      return
    }

    // Validar pagamento
    if (pagamentoDividido) {
      if (pagamentos.length === 0) {
        alert('Adicione pelo menos uma forma de pagamento')
        return
      }
      if (Math.abs(valorRestante) > 0.01) {
        alert('O valor dos pagamentos deve ser igual ao total do pedido')
        return
      }
    } else if (!formaPagamento) {
      alert('Selecione uma forma de pagamento')
      return
    }

    setLoading(true)
    try {
      const subtotal = produtosSelecionados.reduce((acc, p) => {
        const precoBase = p.preco * p.quantidade
        const precoAdicionais = p.adicionais.reduce((sum, a) => sum + a.preco, 0) * p.quantidade
        return acc + precoBase + precoAdicionais
      }, 0)
      const taxaEntrega = tipoEntrega === 'entrega' ? 2 : 0
      const total = subtotal + taxaEntrega

      // Determinar forma de pagamento principal
      const formaPagamentoPrincipal = pagamentoDividido 
        ? 'Dividido' 
        : formaPagamento

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          nome_cliente: nomeCliente,
          endereco: endereco || null,
          tipo_entrega: tipoEntrega,
          forma_pagamento: formaPagamentoPrincipal,
          subtotal: subtotal,
          taxa_entrega: taxaEntrega,
          total: total,
          status,
        })
        .select()
        .single()

      if (pedidoError) throw pedidoError

      // Inserir pagamentos divididos
      if (pagamentoDividido && pagamentos.length > 0) {
        const pagamentosParaInserir = pagamentos.map(p => ({
          pedido_id: pedido.id,
          forma_pagamento: p.forma,
          valor: p.valor
        }))

        const { error: pagamentosError } = await supabase
          .from('pagamentos_pedido')
          .insert(pagamentosParaInserir)

        if (pagamentosError) throw pagamentosError
      } else {
        // Inserir pagamento único
        const formaNormalizada = formaPagamento === 'Dinheiro' ? 'dinheiro' 
          : formaPagamento === 'PIX' ? 'pix'
          : formaPagamento === 'Cartão de Crédito' ? 'credito'
          : formaPagamento === 'Cartão de Débito' ? 'debito'
          : 'dinheiro'

        await supabase
          .from('pagamentos_pedido')
          .insert({
            pedido_id: pedido.id,
            forma_pagamento: formaNormalizada,
            valor: total
          })
      }

      // Inserir itens e seus adicionais
      for (const p of produtosSelecionados) {
        const precoAdicionais = p.adicionais.reduce((sum, a) => sum + a.preco, 0)
        const subtotalItem = (p.preco + precoAdicionais) * p.quantidade

        const { data: item, error: itemError } = await supabase
          .from('itens_pedido')
          .insert({
            pedido_id: pedido.id,
            nome_produto: p.nome,
            quantidade: p.quantidade,
            preco_unitario: p.preco,
            subtotal: subtotalItem,
            observacoes: p.observacoes || null,
          })
          .select()
          .single()

        if (itemError) throw itemError

        // Inserir adicionais do item
        if (p.adicionais.length > 0) {
          const adicionaisParaInserir = p.adicionais.map((a) => ({
            item_pedido_id: item.id,
            adicional_id: a.id,
            nome_adicional: a.nome,
            preco: a.preco,
          }))

          const { error: adicionaisError } = await supabase
            .from('item_adicionais')
            .insert(adicionaisParaInserir)

          if (adicionaisError) throw adicionaisError
        }
      }

      // Se for entrega, criar registro na tabela de entregas automaticamente
      if (tipoEntrega === 'entrega') {
        try {
          await supabase.from('entregas').insert({
            pedido_id: pedido.id,
            endereco_entrega: endereco || null,
            taxa_entrega: taxaEntrega,
            status: 'pendente'
          })
          console.log('[Entrega] Entrega criada automaticamente para pedido:', pedido.id)
        } catch (entregaError) {
          console.error('[Entrega] Erro ao criar entrega:', entregaError)
        }
      }

      router.push('/admin/pedidos')
    } catch (error) {
      console.error('Erro ao salvar pedido:', error)
      alert('Erro ao salvar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  )

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-900 dark:text-white" />
            </button>
            <div>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Novo Pedido</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Registrar pedido presencial
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Dados do Cliente e Produtos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dados do Cliente */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
              >
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
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
                      placeholder="Digite o nome"
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                               dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                               placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 
                               focus:border-transparent"
                    />
                  </div>
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
                  {tipoEntrega === 'entrega' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Endereço de Entrega *
                      </label>
                      <textarea
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        placeholder="Rua, número, bairro..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 
                                 focus:border-transparent resize-none"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Forma de Pagamento *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPagamentoDividido(!pagamentoDividido)
                          if (!pagamentoDividido) {
                            setFormaPagamento('')
                          } else {
                            setPagamentos([])
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          pagamentoDividido 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                        }`}
                      >
                        <Split className="w-3.5 h-3.5" />
                        Dividir
                      </button>
                    </div>

                    {!pagamentoDividido ? (
                      <select
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                                 cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="PIX">PIX</option>
                        <option value="Vale Refeição">Vale Refeição</option>
                      </select>
                    ) : (
                      <div className="space-y-3">
                        {/* Lista de pagamentos adicionados */}
                        {pagamentos.length > 0 && (
                          <div className="space-y-2">
                            {pagamentos.map((pag) => {
                              const forma = FORMAS_PAGAMENTO.find(f => f.id === pag.forma)
                              const Icone = forma?.icone || CreditCard
                              return (
                                <div key={pag.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <Icone className={`w-4 h-4 ${forma?.cor || 'text-zinc-500'}`} />
                                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                      {forma?.nome || pag.forma}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-600">R$ {pag.valor.toFixed(2)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removerPagamento(pag.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Adicionar novo pagamento */}
                        <div className="flex gap-2">
                          <select
                            value={novoPagamentoForma}
                            onChange={(e) => setNovoPagamentoForma(e.target.value)}
                            className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                     dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm
                                     focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">Forma...</option>
                            {FORMAS_PAGAMENTO.map(f => (
                              <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={valorRestante > 0 ? valorRestante : 0}
                            value={novoPagamentoValor}
                            onChange={(e) => setNovoPagamentoValor(e.target.value)}
                            placeholder={valorRestante > 0 ? `Máx: ${valorRestante.toFixed(2)}` : '0.00'}
                            disabled={valorRestante <= 0}
                            className="w-32 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                                     dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm
                                     focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={adicionarPagamento}
                            disabled={!novoPagamentoForma || !novoPagamentoValor || valorRestante <= 0}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg 
                                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Valor restante */}
                        <div className={`text-sm font-medium text-right ${
                          Math.abs(valorRestante) < 0.01 
                            ? 'text-green-600' 
                            : valorRestante > 0 
                              ? 'text-amber-600' 
                              : 'text-red-600'
                        }`}>
                          {Math.abs(valorRestante) < 0.01 
                            ? '✓ Pagamento completo' 
                            : valorRestante > 0 
                              ? `Falta: R$ ${valorRestante.toFixed(2)}`
                              : `Excesso: R$ ${Math.abs(valorRestante).toFixed(2)}`
                          }
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                               dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                               cursor-pointer"
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
              </motion.div>

              {/* Adicionar Produtos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
              >
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                  Adicionar Produtos
                </h3>
                
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="text"
                    value={buscaProduto}
                    onChange={(e) => {
                      setBuscaProduto(e.target.value)
                      setMostrarProdutos(e.target.value.length > 0)
                    }}
                    onFocus={() => setMostrarProdutos(buscaProduto.length > 0)}
                    placeholder="Buscar produto ou bebida..."
                    className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
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
                          onClick={() => adicionarProduto(produto)}
                          className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 
                                   transition-colors border-b border-zinc-200 dark:border-zinc-800 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-zinc-900 dark:text-white">{produto.nome}</p>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">{produto.categoria}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                R$ {produto.preco.toFixed(2)}
                              </span>
                              <Plus className="w-4 h-4 text-zinc-400" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lista de Produtos Selecionados */}
                {produtosSelecionados.length > 0 && (
                  <div className="space-y-3">
                    {produtosSelecionados.map((produto) => (
                      <div
                        key={produto.id}
                        className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 
                                 dark:border-zinc-700"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-zinc-900 dark:text-white">{produto.nome}</h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              R$ {produto.preco.toFixed(2)} cada
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => atualizarQuantidade(produto.id, produto.quantidade - 1)}
                              disabled={produto.quantidade <= 1}
                              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-900 
                                       border border-zinc-200 dark:border-zinc-700 rounded-lg
                                       hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold text-zinc-900 dark:text-white">
                              {produto.quantidade}
                            </span>
                            <button
                              onClick={() => atualizarQuantidade(produto.id, produto.quantidade + 1)}
                              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-900 
                                       border border-zinc-200 dark:border-zinc-700 rounded-lg
                                       hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removerProduto(produto.id)}
                              className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 
                                       rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {/* Adicionais */}
                        {produto.adicionais.length > 0 && (
                          <div className="mb-3 space-y-1">
                            {produto.adicionais.map((adicional) => (
                              <div key={adicional.id} className="flex items-center justify-between text-xs">
                                <span className="text-amber-600 dark:text-amber-400">
                                  + {adicional.nome} (R$ {adicional.preco.toFixed(2)})
                                </span>
                                <button
                                  onClick={() => removerAdicional(produto.id, adicional.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Botão adicionar adicionais */}
                        {adicionaisDisponiveis.length > 0 && (
                          <button
                            onClick={() => setProdutoSelecionadoParaAdicional(
                              produtoSelecionadoParaAdicional === produto.id ? null : produto.id
                            )}
                            className="mb-3 px-3 py-2 text-sm bg-amber-50 dark:bg-amber-950/20 text-amber-600 
                                     dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/30 
                                     border border-amber-200 dark:border-amber-800 rounded-lg font-medium 
                                     transition-colors w-full"
                          >
                            {produtoSelecionadoParaAdicional === produto.id ? '- Ocultar adicionais' : '+ Adicionar adicionais'}
                          </button>
                        )}

                        {/* Lista de adicionais disponíveis */}
                        {produtoSelecionadoParaAdicional === produto.id && (
                          <div className="mb-3 grid grid-cols-2 gap-2">
                            {adicionaisDisponiveis.length > 0 ? (
                              adicionaisDisponiveis.map((adicional) => {
                                const jaAdicionado = produto.adicionais.find((a) => a.id === adicional.id)
                                return (
                                  <button
                                    key={adicional.id}
                                    onClick={() => adicionarAdicional(produto.id, adicional)}
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
                            value={produto.observacoes}
                            onChange={(e) => atualizarObservacoes(produto.id, e.target.value)}
                            placeholder="Observações (ex: sem cebola)"
                            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 
                                     dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white
                                     placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 
                                     focus:border-transparent mr-3"
                          />
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            R$ {((produto.preco + produto.adicionais.reduce((sum, a) => sum + a.preco, 0)) * produto.quantidade).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {produtosSelecionados.length === 0 && !buscaProduto && (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-1">Nenhum produto adicionado</p>
                    <p className="text-sm">Use a busca acima para adicionar produtos ao pedido</p>
                  </div>
                )}
                
                {produtosSelecionados.length === 0 && buscaProduto && produtosFiltrados.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum produto adicionado</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Resumo */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:sticky lg:top-24"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                  Resumo do Pedido
                </h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Itens:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {produtosSelecionados.reduce((acc, p) => acc + p.quantidade, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      R$ {produtosSelecionados.reduce((acc, p) => {
                        const precoBase = p.preco * p.quantidade
                        const precoAdicionais = p.adicionais.reduce((sum, a) => sum + a.preco, 0) * p.quantidade
                        return acc + precoBase + precoAdicionais
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  {tipoEntrega === 'entrega' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Taxa de Entrega:</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        R$ 2.00
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900 dark:text-white">Total:</span>
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        R$ {calcularTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={salvarPedido}
                  disabled={loading || produtosSelecionados.length === 0 || !nomeCliente || (!pagamentoDividido && !formaPagamento) || (pagamentoDividido && (pagamentos.length === 0 || Math.abs(valorRestante) > 0.01))}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 
                           hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar Pedido
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
