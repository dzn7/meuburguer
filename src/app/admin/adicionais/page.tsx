'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  RefreshCw, 
  Plus, 
  DollarSign, 
  Camera, 
  Crop, 
  Trash2,
  ImageIcon
} from 'lucide-react'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import ModalNotificacao from '@/components/ModalNotificacao'
import ModalRecorteImagem from '@/components/admin/ModalRecorteImagem'
import { validarArquivoImagem, arquivoParaUrl } from '@/lib/recorteImagem'

type Adicional = {
  id: string
  nome: string
  preco: number
  imagem_url?: string
  disponivel: boolean
}

type EstadoRecorte = {
  aberto: boolean
  imagemUrl: string
  adicionalId: string | null
}

export default function AdicionaisPage() {
  const [adicionais, setAdicionais] = useState<Adicional[]>([])
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
    adicionalId: null
  })
  const [enviandoImagem, setEnviandoImagem] = useState<string | null>(null)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [adicionalSelecionadoParaUpload, setAdicionalSelecionadoParaUpload] = useState<string | null>(null)

  useEffect(() => {
    carregarAdicionais()
  }, [])

  const carregarAdicionais = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('adicionais')
        .select('*')
        .order('nome', { ascending: true })

      if (error) throw error
      setAdicionais(data || [])
    } catch (error) {
      console.error('Erro ao carregar adicionais:', error)
    } finally {
      setLoading(false)
    }
  }

  const atualizarAdicional = async (id: string, campo: string, valor: any) => {
    setSalvando(id)
    try {
      const { error } = await supabase
        .from('adicionais')
        .update({ [campo]: valor })
        .eq('id', id)

      if (error) throw error

      setAdicionais(adicionais.map(a => 
        a.id === id ? { ...a, [campo]: valor } : a
      ))
    } catch (error) {
      console.error('Erro ao atualizar adicional:', error)
      setModalNotificacao({
        aberto: true,
        tipo: 'erro',
        titulo: 'Erro ao Atualizar',
        mensagem: 'Não foi possível atualizar o adicional. Tente novamente.'
      })
    } finally {
      setSalvando(null)
    }
  }

  // Função para iniciar o processo de upload de imagem
  const iniciarUploadImagem = useCallback((adicionalId: string) => {
    setAdicionalSelecionadoParaUpload(adicionalId)
    inputFileRef.current?.click()
  }, [])

  // Função para processar o arquivo selecionado
  const aoSelecionarArquivo = useCallback(async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = evento.target.files?.[0]
    if (!arquivo || !adicionalSelecionadoParaUpload) return

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
        adicionalId: adicionalSelecionadoParaUpload
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

    evento.target.value = ''
  }, [adicionalSelecionadoParaUpload])

  // Função para abrir o recorte de uma imagem existente
  const abrirRecorteImagemExistente = useCallback((adicional: Adicional) => {
    if (!adicional.imagem_url) return

    setEstadoRecorte({
      aberto: true,
      imagemUrl: adicional.imagem_url,
      adicionalId: adicional.id
    })
  }, [])

  // Função para fazer upload da imagem recortada
  const enviarImagemRecortada = useCallback(async (base64: string, blob: Blob) => {
    if (!estadoRecorte.adicionalId) return

    setEnviandoImagem(estadoRecorte.adicionalId)
    setEstadoRecorte(prev => ({ ...prev, aberto: false }))

    try {
      const nomeArquivo = `adicionais/${estadoRecorte.adicionalId}_${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('imagens')
        .upload(nomeArquivo, blob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('imagens')
        .getPublicUrl(nomeArquivo)

      const novaUrlImagem = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('adicionais')
        .update({ imagem_url: novaUrlImagem })
        .eq('id', estadoRecorte.adicionalId)

      if (updateError) throw updateError

      setAdicionais(prev => prev.map(a => 
        a.id === estadoRecorte.adicionalId 
          ? { ...a, imagem_url: novaUrlImagem }
          : a
      ))

      setModalNotificacao({
        aberto: true,
        tipo: 'sucesso',
        titulo: 'Imagem Atualizada',
        mensagem: 'A imagem do adicional foi atualizada com sucesso!'
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

  // Função para remover a imagem
  const removerImagem = useCallback(async (adicionalId: string) => {
    setSalvando(adicionalId)
    try {
      const { error } = await supabase
        .from('adicionais')
        .update({ imagem_url: null })
        .eq('id', adicionalId)

      if (error) throw error

      setAdicionais(prev => prev.map(a => 
        a.id === adicionalId ? { ...a, imagem_url: undefined } : a
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

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                <Plus className="w-8 h-8 text-amber-600" />
                Gerenciar Adicionais
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Edite preços e nomes dos adicionais
              </p>
            </div>
            <button
              onClick={carregarAdicionais}
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
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="grid gap-4">
                {adicionais.map((adicional) => (
                  <div
                    key={adicional.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 
                             rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    {/* Imagem com controles de edição */}
                    <div className="md:col-span-2 flex flex-col items-center justify-center gap-2">
                      <div className="relative group">
                        {adicional.imagem_url ? (
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                            <Image
                              src={adicional.imagem_url}
                              alt={adicional.nome}
                              fill
                              className="object-cover"
                            />
                            {/* Overlay com ações */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
                                          transition-opacity flex items-center justify-center gap-1">
                              <button
                                onClick={() => abrirRecorteImagemExistente(adicional)}
                                className="p-1.5 bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                                title="Recortar imagem"
                                aria-label="Recortar imagem"
                              >
                                <Crop className="w-3.5 h-3.5 text-white" />
                              </button>
                              <button
                                onClick={() => removerImagem(adicional.id)}
                                className="p-1.5 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                title="Remover imagem"
                                aria-label="Remover imagem"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-zinc-400" />
                          </div>
                        )}
                        {/* Indicador de upload em progresso */}
                        {enviandoImagem === adicional.id && (
                          <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      {/* Botão de upload */}
                      <button
                        onClick={() => iniciarUploadImagem(adicional.id)}
                        disabled={enviandoImagem === adicional.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium 
                                 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 
                                 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 
                                 transition-colors disabled:opacity-50"
                      >
                        <Camera className="w-3 h-3" />
                        {adicional.imagem_url ? 'Trocar' : 'Adicionar'}
                      </button>
                    </div>

                    {/* Nome */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Nome do Adicional
                      </label>
                      <input
                        type="text"
                        value={adicional.nome}
                        onChange={(e) => atualizarAdicional(adicional.id, 'nome', e.target.value)}
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
                          value={adicional.preco}
                          onChange={(e) => atualizarAdicional(adicional.id, 'preco', parseFloat(e.target.value))}
                          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 
                                   dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-white
                                   focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2 flex items-end">
                      {salvando === adicional.id ? (
                        <div className="flex items-center gap-2 text-amber-600 text-sm">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Salvando...
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adicional.disponivel}
                            onChange={(e) => atualizarAdicional(adicional.id, 'disponivel', e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            Disponível
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
          titulo="Ajustar Imagem do Adicional"
        />

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
