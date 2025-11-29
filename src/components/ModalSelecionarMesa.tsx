'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, CheckCircle, RefreshCw, Clock } from 'lucide-react'
import IconeMesa from '@/components/icons/IconeMesa'
import { supabase } from '@/lib/supabase'

type Mesa = {
  id: string
  numero: number
  status: 'livre' | 'ocupada'
  nome_cliente: string | null
  ocupada_em: string | null
}

type ModalSelecionarMesaProps = {
  aberto: boolean
  onFechar: () => void
  onSelecionarMesa: (mesaNumero: number) => void
  nomeCliente: string
}

export default function ModalSelecionarMesa({ 
  aberto, 
  onFechar, 
  onSelecionarMesa,
  nomeCliente 
}: ModalSelecionarMesaProps) {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [ocupando, setOcupando] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregarMesas = useCallback(async () => {
    try {
      setErro(null)
      // Limpar mesas expiradas primeiro
      await supabase.rpc('limpar_mesas_expiradas')

      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .order('numero', { ascending: true })

      if (error) throw error
      setMesas(data || [])
    } catch (error) {
      console.error('Erro ao carregar mesas:', error)
      setErro('Não foi possível carregar as mesas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (aberto) {
      setLoading(true)
      carregarMesas()

      // Configurar realtime
      const channel = supabase
        .channel('mesas-cliente-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'mesas' },
          () => {
            carregarMesas()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [aberto, carregarMesas])

  const selecionarMesa = async (mesa: Mesa) => {
    if (mesa.status === 'ocupada') return
    if (!nomeCliente.trim()) {
      setErro('Por favor, informe seu nome antes de selecionar a mesa.')
      return
    }

    setOcupando(mesa.numero)
    setErro(null)

    try {
      const { error } = await supabase
        .from('mesas')
        .update({
          status: 'ocupada',
          nome_cliente: nomeCliente.trim(),
          ocupada_em: new Date().toISOString()
        })
        .eq('id', mesa.id)
        .eq('status', 'livre') // Garantir que ainda está livre

      if (error) throw error

      onSelecionarMesa(mesa.numero)
      onFechar()
    } catch (error) {
      console.error('Erro ao ocupar mesa:', error)
      setErro('Esta mesa já foi ocupada. Por favor, escolha outra.')
      carregarMesas()
    } finally {
      setOcupando(null)
    }
  }

  const mesasLivres = mesas.filter(m => m.status === 'livre').length

  if (!aberto) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onFechar}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-amber-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <IconeMesa className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Escolha sua Mesa</h2>
                <p className="text-amber-100 text-xs">
                  {mesasLivres} {mesasLivres === 1 ? 'mesa disponível' : 'mesas disponíveis'}
                </p>
              </div>
            </div>
            <button
              onClick={onFechar}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
            {/* Mensagem de Erro */}
            {erro && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 
                         rounded-xl text-red-700 dark:text-red-400 text-sm"
              >
                {erro}
              </motion.div>
            )}

            {/* Aviso sobre o tempo */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 
                          rounded-xl flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                A mesa ficará reservada por até <strong>3 horas</strong>. Após esse período, 
                ela será automaticamente liberada.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">Carregando mesas...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mesas.map((mesa) => {
                  const ocupada = mesa.status === 'ocupada'
                  const selecionando = ocupando === mesa.numero

                  return (
                    <motion.button
                      key={mesa.id}
                      whileHover={!ocupada ? { scale: 1.03 } : {}}
                      whileTap={!ocupada ? { scale: 0.98 } : {}}
                      onClick={() => selecionarMesa(mesa)}
                      disabled={ocupada || selecionando}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                        ocupada
                          ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60'
                          : selecionando
                          ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400'
                          : 'bg-white dark:bg-zinc-800 border-green-400 dark:border-green-500 hover:border-green-500 hover:shadow-lg cursor-pointer'
                      }`}
                    >
                      {/* Indicador de Status */}
                      <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${
                        ocupada ? 'bg-red-500' : 'bg-green-500'
                      }`} />

                      {/* Número da Mesa */}
                      <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center 
                                     text-xl font-bold ${
                        ocupada
                          ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {selecionando ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          mesa.numero
                        )}
                      </div>

                      {/* Status */}
                      <div className="text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          ocupada
                            ? 'text-zinc-500 dark:text-zinc-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {ocupada ? (
                            <>
                              <Users className="w-3 h-3" />
                              Ocupada
                            </>
                          ) : selecionando ? (
                            'Selecionando...'
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Livre
                            </>
                          )}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}

            {/* Botão Atualizar */}
            <button
              onClick={() => {
                setLoading(true)
                carregarMesas()
              }}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 
                       bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700
                       text-zinc-700 dark:text-zinc-300 rounded-xl font-medium transition-colors
                       disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Mesas
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
