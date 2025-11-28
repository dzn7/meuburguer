'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  RefreshCw, 
  Package, 
  DollarSign, 
  Percent, 
  Camera, 
  Crop, 
  Upload,
  Trash2,
  ImageIcon,
  Plus,
  X,
  Save
} from 'lucide-react'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import ModalNotificacao from '@/components/ModalNotificacao'
import ModalRecorteImagem from '@/components/admin/ModalRecorteImagem'
import { validarArquivoImagem, arquivoParaUrl } from '@/lib/recorteImagem'

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

type EstadoRecorte = {
  aberto: boolean
  imagemUrl: string
  produtoId: string | null
  tabela: string
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

  // Estados para o recorte de imagem
  const [estadoRecorte, setEstadoRecorte] = useState<EstadoRecorte>({
    aberto: false,
    imagemUrl: '',
    produtoId: null,
    tabela: 'produtos'
  })
  const [enviandoImagem, setEnviandoImagem] = useState<string | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [produtoSelecionadoParaUpload, setProdutoSelecionadoParaUpload] = useState<{
    id: string
    tabela: string
  } | null>(null)

  // Estados para o modal de novo produto
  const [modalNovoProduto, setModalNovoProduto] = useState(false)
  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: 'Linha Artesanal',
  })
  const [imagemNovoProduto, setImagemNovoProduto] = useState<string | null>(null)
  const [blobNovoProduto, setBlobNovoProduto] = useState<Blob | null>(null)
  const [salvandoNovoProduto, setSalvandoNovoProduto] = useState(false)
  const inputFileNovoProdutoRef = useRef<HTMLInputElement>(null)
  const [recorteNovoProduto, setRecorteNovoProduto] = useState(false)
  const [imagemParaRecorte, setImagemParaRecorte] = useState('')

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

      // Validar valores numéricos antes de atualizar
      if (campo === 'preco' && (isNaN(valor) || valor === null || valor === undefined || valor === '')) {
        setSalvando(null)
        return // Não atualiza se o valor for inválido
      }

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

  // Função para iniciar o processo de upload de imagem
  const iniciarUploadImagem = useCallback((produtoId: string, tabela: string) => {
    setProdutoSelecionadoParaUpload({ id: produtoId, tabela })
    inputFileRef.current?.click()
  }, [])

  // Função para processar o arquivo selecionado
  const aoSelecionarArquivo = useCallback(async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0]
    if (!arquivo || !produtoSelecionadoParaUpload) return

    // Valida o arquivo
    const validacao = validarArquivoImagem(arquivo)
    if (!validacao.valido) {
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Arquivo Inválido',
        mensagem: validacao.erro || 'O arquivo selecionado não é válido.'
      })
      evento.target.value = ''
      return
    }

    try {
      const urlImagem = await arquivoParaUrl(arquivo)
      setEstadoRecorte({
        aberto: true,
        imagemUrl: urlImagem,
        produtoId: produtoSelecionadoParaUpload.id,
        tabela: produtoSelecionadoParaUpload.tabela
      })
    } catch (erro) {
      console.error('Erro ao ler arquivo:', erro)
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Erro ao Ler Arquivo',
        mensagem: 'Não foi possível ler o arquivo selecionado.'
      })
    }

    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    evento.target.value = ''
  }, [produtoSelecionadoParaUpload])

  // Função para abrir o recorte de uma imagem existente
  const abrirRecorteImagemExistente = useCallback((produto: Produto) => {
    if (!produto.imagem_url) return

    setEstadoRecorte({
      aberto: true,
      imagemUrl: produto.imagem_url,
      produtoId: produto.id,
      tabela: produto.tabela || 'produtos'
    })
  }, [])

  // Função para fazer upload da imagem recortada para o Supabase Storage
  const enviarImagemRecortada = useCallback(async (base64: string, blob: Blob) => {
    if (!estadoRecorte.produtoId) return

    setEnviandoImagem(estadoRecorte.produtoId)
    setEstadoRecorte(prev => ({ ...prev, aberto: false }))

    try {
      // Gera um nome único para o arquivo
      const nomeArquivo = `${estadoRecorte.tabela}/${estadoRecorte.produtoId}_${Date.now()}.jpg`

      // Faz upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagens')
        .upload(nomeArquivo, blob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtém a URL pública da imagem
      const { data: urlData } = supabase.storage
        .from('imagens')
        .getPublicUrl(nomeArquivo)

      const novaUrlImagem = urlData.publicUrl

      // Atualiza o registro no banco de dados
      const { error: updateError } = await supabase
        .from(estadoRecorte.tabela)
        .update({ imagem_url: novaUrlImagem })
        .eq('id', estadoRecorte.produtoId)

      if (updateError) {
        throw updateError
      }

      // Atualiza o estado local
      setProdutos(prev => prev.map(p => 
        p.id === estadoRecorte.produtoId 
          ? { ...p, imagem_url: novaUrlImagem }
          : p
      ))

      setModalNotificacao({
        aberto: true,
        tipo: 'sucesso',
        titulo: 'Imagem Atualizada',
        mensagem: 'A imagem do produto foi atualizada com sucesso!'
      })
    } catch (erro) {
      console.error('Erro ao enviar imagem:', erro)
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Erro ao Enviar Imagem',
        mensagem: 'Não foi possível enviar a imagem. Verifique se o bucket "imagens" existe no Supabase Storage.'
      })
    } finally {
      setEnviandoImagem(null)
    }
  }, [estadoRecorte])

  // Função para remover a imagem de um produto
  const removerImagem = useCallback(async (produtoId: string, tabela: string) => {
    setSalvando(produtoId)
    try {
      const { error } = await supabase
        .from(tabela)
        .update({ imagem_url: null })
        .eq('id', produtoId)

      if (error) throw error

      setProdutos(prev => prev.map(p => 
        p.id === produtoId ? { ...p, imagem_url: undefined } : p
      ))

      setModalNotificacao({
        aberto: true,
        tipo: 'sucesso',
        titulo: 'Imagem Removida',
        mensagem: 'A imagem foi removida com sucesso.'
      })
    } catch (erro) {
      console.error('Erro ao remover imagem:', erro)
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Erro ao Remover',
        mensagem: 'Não foi possível remover a imagem.'
      })
    } finally {
      setSalvando(null)
    }
  }, [])

  // Funções para o novo produto
  const abrirModalNovoProduto = () => {
    setNovoProduto({ nome: '', descricao: '', preco: '', categoria: 'Linha Artesanal' })
    setImagemNovoProduto(null)
    setBlobNovoProduto(null)
    setModalNovoProduto(true)
  }

  const selecionarImagemNovoProduto = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return

    const validacao = validarArquivoImagem(arquivo)
    if (!validacao.valido) {
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Arquivo Inválido',
        mensagem: validacao.erro || 'O arquivo selecionado não é válido.'
      })
      evento.target.value = ''
      return
    }

    try {
      const urlImagem = await arquivoParaUrl(arquivo)
      setImagemParaRecorte(urlImagem)
      setRecorteNovoProduto(true)
    } catch (erro) {
      console.error('Erro ao ler arquivo:', erro)
    }
    evento.target.value = ''
  }

  const confirmarRecorteNovoProduto = (base64: string, blob: Blob) => {
    setImagemNovoProduto(base64)
    setBlobNovoProduto(blob)
    setRecorteNovoProduto(false)
  }

  const salvarNovoProduto = async () => {
    if (!novoProduto.nome || !novoProduto.preco) {
      setModalNotificacao({
        aberto: true,
        tipo: 'aviso',
        titulo: 'Campos Obrigatórios',
        mensagem: 'Preencha o nome e o preço do produto.'
      })
      return
    }

    setSalvandoNovoProduto(true)
    try {
      const isBebida = novoProduto.categoria === 'Bebidas'
      const tabela = isBebida ? 'bebidas' : 'produtos'
      
      // Dados para inserção
      const dadosInsercao = isBebida 
        ? {
            nome: novoProduto.nome,
            tamanho: novoProduto.descricao || null,
            preco: parseFloat(novoProduto.preco),
            disponivel: true,
          }
        : {
            nome: novoProduto.nome,
            descricao: novoProduto.descricao || null,
            preco: parseFloat(novoProduto.preco),
            categoria: novoProduto.categoria,
            disponivel: true,
          }

      const { data: produtoCriado, error: erroCriacao } = await supabase
        .from(tabela)
        .insert(dadosInsercao)
        .select()
        .single()

      if (erroCriacao) throw erroCriacao

      // Se tem imagem, faz upload
      if (blobNovoProduto && produtoCriado) {
        const nomeArquivo = `${tabela}/${produtoCriado.id}_${Date.now()}.jpg`
        
        const { error: uploadError } = await supabase.storage
          .from('imagens')
          .upload(nomeArquivo, blobNovoProduto, {
            contentType: 'image/jpeg',
            upsert: true
          })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('imagens')
            .getPublicUrl(nomeArquivo)

          await supabase
            .from(tabela)
            .update({ imagem_url: urlData.publicUrl })
            .eq('id', produtoCriado.id)
        }
      }

      setModalNotificacao({
        aberto: true,
        tipo: 'sucesso',
        titulo: isBebida ? 'Bebida Criada' : 'Produto Criado',
        mensagem: `${isBebida ? 'A bebida' : 'O produto'} foi cadastrado com sucesso!`
      })

      setModalNovoProduto(false)
      carregarProdutos()
    } catch (erro) {
      console.error('Erro ao criar produto:', erro)
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Erro ao Criar',
        mensagem: 'Não foi possível criar o produto. Tente novamente.'
      })
    } finally {
      setSalvandoNovoProduto(false)
    }
  }

  const categorias = Array.from(new Set(produtos.map(p => p.categoria)))
  const categoriasDisponiveis = ['Linha Artesanal', 'Linha Industrial', 'Bebidas']

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 sm:gap-3">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
                Gerenciar Produtos
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 hidden sm:block">
                Edite preços, nomes e aplique descontos em tempo real
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={abrirModalNovoProduto}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 
                         bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="sm:inline">Novo</span>
              </button>
              <button
                onClick={carregarProdutos}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 
                         text-white rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
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
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-6 overflow-hidden"
                >
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-amber-600 rounded-full"></span>
                    {categoria}
                  </h2>

                  <div className="space-y-3">
                    {produtos
                      .filter(p => p.categoria === categoria)
                      .map((produto) => (
                        <div
                          key={produto.id}
                          className="bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 md:p-4"
                        >
                          {/* Layout Mobile: Imagem + Info lado a lado */}
                          <div className="flex gap-3 md:hidden">
                            {/* Imagem Mobile */}
                            <div className="flex-shrink-0">
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                                {produto.imagem_url ? (
                                  <Image
                                    src={produto.imagem_url}
                                    alt={produto.nome}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                                  </div>
                                )}
                                {enviandoImagem === produto.id && (
                                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Info Mobile */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                                {produto.nome}
                              </h3>
                              <p className="text-amber-600 font-bold text-lg">
                                R$ {produto.preco.toFixed(2)}
                              </p>
                              {produto.desconto && produto.desconto > 0 && (
                                <span className="text-xs font-bold text-green-600">-{produto.desconto}% OFF</span>
                              )}
                            </div>
                            
                            {/* Toggle Disponível Mobile */}
                            <div className="flex-shrink-0">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={produto.disponivel}
                                  onChange={(e) => atualizarProduto(produto.id, 'disponivel', e.target.checked)}
                                  className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                />
                              </label>
                            </div>
                          </div>
                          
                          {/* Botões de ação Mobile - Sempre visíveis */}
                          <div className="flex gap-2 mt-3 md:hidden">
                            <button
                              onClick={() => iniciarUploadImagem(produto.id, produto.tabela || 'produtos')}
                              disabled={enviandoImagem === produto.id}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium 
                                       bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 
                                       rounded-lg active:bg-amber-200 disabled:opacity-50"
                            >
                              <Camera className="w-4 h-4" />
                              {produto.imagem_url ? 'Trocar Foto' : 'Adicionar Foto'}
                            </button>
                            {produto.imagem_url && (
                              <>
                                <button
                                  onClick={() => abrirRecorteImagemExistente(produto)}
                                  className="px-3 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 
                                           rounded-lg active:bg-blue-200"
                                  title="Recortar"
                                >
                                  <Crop className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removerImagem(produto.id, produto.tabela || 'produtos')}
                                  className="px-3 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 
                                           rounded-lg active:bg-red-200"
                                  title="Remover"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Layout Desktop */}
                          <div className="hidden md:grid md:grid-cols-12 gap-4">
                            {/* Imagem Desktop */}
                            <div className="col-span-2 flex flex-col items-center justify-center gap-2">
                              <div className="relative group">
                                {produto.imagem_url ? (
                                  <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                                    <Image
                                      src={produto.imagem_url}
                                      alt={produto.nome}
                                      fill
                                      className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                                                  transition-opacity flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => abrirRecorteImagemExistente(produto)}
                                        className="p-2 bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                                        title="Recortar imagem"
                                      >
                                        <Crop className="w-4 h-4 text-white" />
                                      </button>
                                      <button
                                        onClick={() => removerImagem(produto.id, produto.tabela || 'produtos')}
                                        className="p-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                        title="Remover imagem"
                                      >
                                        <Trash2 className="w-4 h-4 text-white" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-zinc-400" />
                                  </div>
                                )}
                                {enviandoImagem === produto.id && (
                                  <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                                    <RefreshCw className="w-5 h-5 text-white animate-spin" />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => iniciarUploadImagem(produto.id, produto.tabela || 'produtos')}
                                disabled={enviandoImagem === produto.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium 
                                         bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 
                                         rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 
                                         transition-colors disabled:opacity-50"
                              >
                                <Camera className="w-3 h-3" />
                                {produto.imagem_url ? 'Trocar' : 'Adicionar'}
                              </button>
                            </div>

                            {/* Nome Desktop */}
                            <div className="col-span-4">
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Nome do Produto
                              </label>
                              <input
                                type="text"
                                value={produto.nome}
                                onChange={(e) => atualizarProduto(produto.id, 'nome', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 
                                         dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm
                                         focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            {/* Preço Desktop */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Preço (R$)
                              </label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={produto.preco}
                                  onBlur={(e) => {
                                    const valor = e.target.value
                                    if (valor === '' || valor === null) {
                                      e.target.value = produto.preco.toString()
                                      return
                                    }
                                    const numero = parseFloat(valor)
                                    if (!isNaN(numero) && numero >= 0) {
                                      atualizarProduto(produto.id, 'preco', numero)
                                    } else {
                                      e.target.value = produto.preco.toString()
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur()
                                    }
                                  }}
                                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 
                                           dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm
                                           focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>

                            {/* Desconto Desktop */}
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Desconto (%)
                              </label>
                              <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={produto.desconto || 0}
                                  onChange={(e) => {
                                  const valor = e.target.value
                                  if (valor === '' || valor === null) return // Permite apagar sem erro
                                  const numero = parseFloat(valor)
                                  if (!isNaN(numero) && numero >= 0 && numero <= 100) {
                                    aplicarDesconto(produto.id, numero)
                                  }
                                }}
                                onBlur={(e) => {
                                  // Ao sair do campo, se estiver vazio, define como 0
                                  if (e.target.value === '' || e.target.value === null) {
                                    aplicarDesconto(produto.id, 0)
                                  }
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 
                                           dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white text-sm
                                           focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>

                            {/* Status Desktop */}
                            <div className="col-span-2 flex items-end">
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
                        </div>
                      ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Input oculto para seleção de arquivo */}
        <input
          ref={inputFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={aoSelecionarArquivo}
          className="hidden"
          aria-hidden="true"
        />

        {/* Modal de recorte de imagem */}
        <ModalRecorteImagem
          aberto={estadoRecorte.aberto}
          imagemUrl={estadoRecorte.imagemUrl}
          onFechar={() => setEstadoRecorte(prev => ({ ...prev, aberto: false }))}
          onConfirmar={enviarImagemRecortada}
          proporcaoInicial={1}
          titulo="Ajustar Imagem do Produto"
        />

        {/* Modal de recorte para novo produto */}
        <ModalRecorteImagem
          aberto={recorteNovoProduto}
          imagemUrl={imagemParaRecorte}
          onFechar={() => setRecorteNovoProduto(false)}
          onConfirmar={confirmarRecorteNovoProduto}
          proporcaoInicial={1}
          titulo="Ajustar Imagem do Novo Produto"
        />

        {/* Modal de novo produto */}
        {modalNovoProduto && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setModalNovoProduto(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  Novo Produto
                </h2>
                <button
                  onClick={() => setModalNovoProduto(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Imagem */}
                <div className="flex flex-col items-center gap-3">
                  <div 
                    onClick={() => inputFileNovoProdutoRef.current?.click()}
                    className="w-32 h-32 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 
                             flex items-center justify-center cursor-pointer hover:border-amber-500 transition-colors
                             overflow-hidden bg-zinc-50 dark:bg-zinc-800"
                  >
                    {imagemNovoProduto ? (
                      <img src={imagemNovoProduto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-zinc-400 mx-auto mb-1" />
                        <span className="text-xs text-zinc-500">Adicionar foto</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={inputFileNovoProdutoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={selecionarImagemNovoProduto}
                    className="hidden"
                  />
                  <p className="text-xs text-zinc-500">Máximo 1MB após compressão</p>
                </div>

                {/* Categoria primeiro para mudar labels dinamicamente */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={novoProduto.categoria}
                    onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg
                             bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {categoriasDisponiveis.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {novoProduto.categoria === 'Bebidas' ? 'Nome da Bebida' : 'Nome do Produto'} *
                  </label>
                  <input
                    type="text"
                    value={novoProduto.nome}
                    onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                    placeholder={novoProduto.categoria === 'Bebidas' ? 'Ex: Coca-Cola' : 'Ex: X-Burguer Especial'}
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg
                             bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Descrição / Tamanho */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {novoProduto.categoria === 'Bebidas' ? 'Tamanho' : 'Descrição'}
                  </label>
                  {novoProduto.categoria === 'Bebidas' ? (
                    <input
                      type="text"
                      value={novoProduto.descricao}
                      onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                      placeholder="Ex: 350ml, 600ml, 2L"
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg
                               bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  ) : (
                    <textarea
                      value={novoProduto.descricao}
                      onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                      placeholder="Descreva os ingredientes..."
                      rows={2}
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg
                               bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  )}
                </div>

                {/* Preço */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoProduto.preco}
                    onChange={(e) => setNovoProduto({ ...novoProduto, preco: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg
                             bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setModalNovoProduto(false)}
                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg
                             text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800
                             transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarNovoProduto}
                    disabled={salvandoNovoProduto}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 
                             hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {salvandoNovoProduto ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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
