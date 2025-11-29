'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Clock, 
  RefreshCw, 
  Trash2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import IconeMesa from '@/components/icons/IconeMesa'
import { format, differenceInMinutes, differenceInHours } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import ModalNotificacao from '@/components/ModalNotificacao'

type Mesa = {
  id: string
  numero: number
  status: 'livre' | 'ocupada'
  nome_cliente: string | null
  ocupada_em: string | null
  updated_at: string
}

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState<number | null>(null)
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

  const carregarMesas = useCallback(async () => {
    try {
      // Primeiro, limpar mesas expiradas
      await supabase.rpc('limpar_mesas_expiradas')

      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .order('numero', { ascending: true })

      if (error) throw error
      setMesas(data || [])
    } catch (error) {
      console.error('Erro ao carregar mesas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarMesas()

    // Atualizar a cada 30 segundos para verificar mesas expiradas
    const intervalo = setInterval(carregarMesas, 30000)

    // Configurar realtime
    const channel = supabase
      .channel('mesas-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mesas' },
        (payload) => {
          console.log('[Mesas] Atualização recebida:', payload)
          if (payload.eventType === 'UPDATE') {
            setMesas(prev => prev.map(m => 
              m.id === payload.new.id ? payload.new as Mesa : m
            ))
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(intervalo)
      supabase.removeChannel(channel)
    }
  }, [carregarMesas])

  const liberarMesa = async (mesa: Mesa) => {
    setModalNotificacao({
      aberto: true,
      tipo: 'confirmacao',
      titulo: 'Liberar Mesa',
      mensagem: `Deseja liberar a Mesa ${mesa.numero}? O cliente "${mesa.nome_cliente}" será removido.`,
      onConfirmar: async () => {
        setAtualizando(mesa.numero)
        try {
          const { error } = await supabase
            .from('mesas')
            .update({
              status: 'livre',
              nome_cliente: null,
              ocupada_em: null
            })
            .eq('id', mesa.id)

          if (error) throw error

          setModalNotificacao({
            aberto: true,
            tipo: 'sucesso',
            titulo: 'Mesa Liberada',
            mensagem: `Mesa ${mesa.numero} foi liberada com sucesso!`,
            onConfirmar: () => {}
          })
          
          carregarMesas()
        } catch (error) {
          console.error('Erro ao liberar mesa:', error)
          setModalNotificacao({
            aberto: true,
            tipo: 'erro',
            titulo: 'Erro',
            mensagem: 'Não foi possível liberar a mesa. Tente novamente.',
            onConfirmar: () => {}
          })
        } finally {
          setAtualizando(null)
        }
      }
    })
  }

  const calcularTempoRestante = (ocupadaEm: string) => {
    const inicio = new Date(ocupadaEm)
    const agora = new Date()
    const limite = new Date(inicio.getTime() + 3 * 60 * 60 * 1000) // 3 horas
    
    const minutosRestantes = differenceInMinutes(limite, agora)
    
    if (minutosRestantes <= 0) return { texto: 'Expirando...', porcentagem: 100, urgente: true }
    
    const horas = Math.floor(minutosRestantes / 60)
    const minutos = minutosRestantes % 60
    
    const porcentagem = ((180 - minutosRestantes) / 180) * 100
    
    if (horas > 0) {
      return { 
        texto: `${horas}h ${minutos}min restantes`, 
        porcentagem,
        urgente: minutosRestantes < 30 
      }
    }
    return { 
      texto: `${minutos}min restantes`, 
      porcentagem,
      urgente: minutosRestantes < 30 
    }
  }

  const mesasLivres = mesas.filter(m => m.status === 'livre').length
  const mesasOcupadas = mesas.filter(m => m.status === 'ocupada').length

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400">Carregando mesas...</p>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                <IconeMesa className="w-8 h-8 text-amber-500" />
                Mesas do Restaurante
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Gerencie as mesas em tempo real
              </p>
            </div>
            <button
              onClick={() => carregarMesas()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 
                       text-white rounded-xl font-medium transition-colors self-start sm:self-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Mesas Livres</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                    {mesasLivres}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Mesas Ocupadas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {mesasOcupadas}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Grid de Mesas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {mesas.map((mesa, index) => {
                const ocupada = mesa.status === 'ocupada'
                const tempoInfo = ocupada && mesa.ocupada_em 
                  ? calcularTempoRestante(mesa.ocupada_em)
                  : null

                return (
                  <motion.div
                    key={mesa.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative bg-white dark:bg-zinc-900 rounded-2xl border-2 overflow-hidden
                              transition-all duration-300 hover:shadow-lg ${
                      ocupada 
                        ? tempoInfo?.urgente
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-amber-400 dark:border-amber-500'
                        : 'border-green-400 dark:border-green-500 hover:border-green-500'
                    }`}
                  >
                    {/* Indicador de Status no Topo */}
                    <div className={`h-1.5 ${
                      ocupada 
                        ? tempoInfo?.urgente
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                        : 'bg-green-500'
                    }`} />

                    <div className="p-4">
                      {/* Número da Mesa */}
                      <div className="text-center mb-3">
                        <span className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 
                                        rounded-full text-xl sm:text-2xl font-bold ${
                          ocupada 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        }`}>
                          {mesa.numero}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div className="text-center mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          ocupada 
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        }`}>
                          {ocupada ? (
                            <>
                              <Users className="w-3 h-3" />
                              Ocupada
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Livre
                            </>
                          )}
                        </span>
                      </div>

                      {/* Informações do Cliente */}
                      {ocupada && mesa.nome_cliente && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white text-center truncate">
                            {mesa.nome_cliente}
                          </p>
                          
                          {mesa.ocupada_em && (
                            <div className="text-center">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Desde {format(new Date(mesa.ocupada_em), 'HH:mm', { locale: ptBR })}
                              </p>
                            </div>
                          )}

                          {/* Barra de Progresso do Tempo */}
                          {tempoInfo && (
                            <div className="space-y-1">
                              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${tempoInfo.porcentagem}%` }}
                                  className={`h-full rounded-full transition-colors ${
                                    tempoInfo.urgente 
                                      ? 'bg-red-500' 
                                      : 'bg-amber-500'
                                  }`}
                                />
                              </div>
                              <p className={`text-xs text-center font-medium ${
                                tempoInfo.urgente 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-zinc-600 dark:text-zinc-400'
                              }`}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {tempoInfo.texto}
                              </p>
                            </div>
                          )}

                          {/* Botão Liberar */}
                          <button
                            onClick={() => liberarMesa(mesa)}
                            disabled={atualizando === mesa.numero}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 
                                     bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 
                                     rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/50
                                     transition-colors disabled:opacity-50"
                          >
                            {atualizando === mesa.numero ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Liberar Mesa
                          </button>
                        </div>
                      )}

                      {/* Mesa Livre - Indicador */}
                      {!ocupada && (
                        <div className="text-center py-2">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Disponível para clientes
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Mesa Livre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Mesa Ocupada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Tempo Expirando</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Limite: 3 horas</span>
            </div>
          </div>
        </div>

        <ModalNotificacao
          aberto={modalNotificacao.aberto}
          tipo={modalNotificacao.tipo}
          titulo={modalNotificacao.titulo}
          mensagem={modalNotificacao.mensagem}
          onFechar={() => setModalNotificacao({ ...modalNotificacao, aberto: false })}
          onConfirmar={modalNotificacao.onConfirmar}
          textoBotaoConfirmar="Liberar"
          textoBotaoCancelar="Cancelar"
        />
      </AdminLayout>
    </ProtectedRoute>
  )
}
