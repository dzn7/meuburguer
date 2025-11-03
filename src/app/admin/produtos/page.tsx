'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, RefreshCw, Package, DollarSign, Percent } from 'lucide-react'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import ModalNotificacao from '@/components/ModalNotificacao'

type Produto = {
  id: string
  nome: string
  descricao?: string
  preco: number
  preco_original?: number | null
  desconto?: number | null
  categoria: string
  imagem_url?: string
  disponivel: boolean
  tabela?: string
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [modalNotificacao, setModalNotificacao] = useState<{
    aberto: boolean
    tipo: 'sucesso' | 'erro' | 'aviso' | 'info' | 'confirmacao'
    titulo: string
    mensagem: string
  }>({
    aberto: false,
    tipo: 'info',
    titulo: '',
    mensagem: ''
  })

  useEffect(() => {
    carregarProdutos()
  }, [])

  const carregarProdutos = async () => {
    setLoading(true)
    try {
      // Carregar produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nome', { ascending: true })

      if (produtosError) throw produtosError

      // Carregar bebidas
      const { data: bebidasData, error: bebidasError } = await supabase
        .from('bebidas')
        .select('*')
        .order('nome', { ascending: true })

      if (bebidasError) throw bebidasError

      // Formatar bebidas para o mesmo formato de produtos
      const bebidasFormatadas = (bebidasData || []).map(bebida => ({
        id: bebida.id,
        nome: bebida.nome + (bebida.tamanho ? ` - ${bebida.tamanho}` : ''),
        preco: Number(bebida.preco),
        preco_original: bebida.preco_original ? Number(bebida.preco_original) : null,
        desconto: bebida.desconto,
        categoria: 'Bebidas',
        imagem_url: bebida.imagem_url,
        disponivel: bebida.disponivel,
        tabela: 'bebidas' // Identificador para saber qual tabela atualizar
      }))

      // Combinar produtos e bebidas
      const todosProdutos = [
        ...(produtosData || []).map(p => ({ ...p, tabela: 'produtos' })),
        ...bebidasFormatadas
      ]

      setProdutos(todosProdutos)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const atualizarProduto = async (id: string, campo: string, valor: any) => {
    setSalvando(id)
    try {
      const produto = produtos.find(p => p.id === id)
      const tabela = produto?.tabela || 'produtos'

      const { error } = await supabase
        .from(tabela)
        .update({ [campo]: valor })
        .eq('id', id)

      if (error) throw error

      // Atualizar localmente
      setProdutos(produtos.map(p => 
        p.id === id ? { ...p, [campo]: valor } : p
      ))
    } catch (error) {
      console.error('Erro ao atualizar produto:', error)
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Erro ao Atualizar',
        mensagem: 'Não foi possível atualizar o produto. Tente novamente.'
      })
    } finally {
      setSalvando(null)
    }
  }

  const aplicarDesconto = async (id: string, desconto: number) => {
    const produto = produtos.find(p => p.id === id)
    if (!produto) return

    setSalvando(id)
    try {
      const tabela = produto.tabela || 'produtos'
      const precoOriginal = produto.preco_original || produto.preco
      const novoPreco = desconto > 0 
        ? precoOriginal * (1 - desconto / 100)
        : precoOriginal

      const { error } = await supabase
        .from(tabela)
        .update({ 
          preco: novoPreco,
          preco_original: precoOriginal,
          desconto: desconto > 0 ? desconto : null
        })
        .eq('id', id)

      if (error) throw error

      setProdutos(produtos.map(p => 
        p.id === id 
          ? { ...p, preco: novoPreco, preco_original: precoOriginal, desconto: desconto > 0 ? desconto : null }
          : p
      ))
    } catch (error) {
      console.error('Erro ao aplicar desconto:', error)
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Erro ao Aplicar Desconto',
        mensagem: 'Não foi possível aplicar o desconto. Tente novamente.'
      })
    } finally {
      setSalvando(null)
    }
  }

  const categorias = Array.from(new Set(produtos.map(p => p.categoria)))

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                <Package className="w-8 h-8 text-amber-600" />
                Gerenciar Produtos
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Edite preços, nomes e aplique descontos em tempo real
              </p>
            </div>
            <button
              onClick={carregarProdutos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white 
                       rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {categorias.map((categoria) => (
                <motion.div
                  key={categoria}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
                >
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-amber-600 rounded-full"></span>
                    {categoria}
                  </h2>

                  <div className="grid gap-4">
                    {produtos
                      .filter(p => p.categoria === categoria)
                      .map((produto) => (
                        <div
                          key={produto.id}
                          className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 
                                   rounded-lg border border-zinc-200 dark:border-zinc-700"
                        >
                          {/* Imagem */}
                          <div className="md:col-span-2 flex items-center justify-center">
                            {produto.imagem_url ? (
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                                <Image
                                  src={produto.imagem_url}
                                  alt={produto.nome}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                                <Package className="w-8 h-8 text-zinc-400" />
                              </div>
                            )}
                          </div>

                          {/* Nome */}
                          <div className="md:col-span-4">
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                              Nome do Produto
                            </label>
                            <input
                              type="text"
                              value={produto.nome}
                              onChange={(e) => atualizarProduto(produto.id, 'nome', e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 
                                       dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white
                                       focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          {/* Preço */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                              Preço (R$)
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <input
                                type="number"
                                step="0.01"
                                value={produto.preco}
                                onChange={(e) => atualizarProduto(produto.id, 'preco', parseFloat(e.target.value))}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 
                                         dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white
                                         focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>

                          {/* Desconto */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                              Desconto (%)
                            </label>
                            <div className="relative">
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={produto.desconto || 0}
                                onChange={(e) => aplicarDesconto(produto.id, parseFloat(e.target.value) || 0)}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 
                                         dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white
                                         focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>

                          {/* Status */}
                          <div className="md:col-span-2 flex items-end">
                            {salvando === produto.id ? (
                              <div className="flex items-center gap-2 text-amber-600 text-sm">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Salvando...
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 w-full">
                                {produto.desconto && produto.desconto > 0 && (
                                  <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                    {produto.desconto}% OFF
                                  </span>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={produto.disponivel}
                                    onChange={(e) => atualizarProduto(produto.id, 'disponivel', e.target.checked)}
                                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                                  />
                                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Disponível
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <ModalNotificacao
          aberto={modalNotificacao.aberto}
          tipo={modalNotificacao.tipo}
          titulo={modalNotificacao.titulo}
          mensagem={modalNotificacao.mensagem}
          onFechar={() => setModalNotificacao({ ...modalNotificacao, aberto: false })}
        />
      </AdminLayout>
    </ProtectedRoute>
  )
}
