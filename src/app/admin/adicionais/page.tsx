'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, RefreshCw, Plus, DollarSign } from 'lucide-react'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import ModalNotificacao from '@/components/ModalNotificacao'

type Adicional = {
  id: string
  nome: string
  preco: number
  imagem_url?: string
  disponivel: boolean
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
                    {/* Imagem */}
                    <div className="md:col-span-2 flex items-center justify-center">
                      {adicional.imagem_url ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={adicional.imagem_url}
                            alt={adicional.nome}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                          <Plus className="w-8 h-8 text-zinc-400" />
                        </div>
                      )}
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
