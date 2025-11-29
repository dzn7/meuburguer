'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import type { Entrega, NovaEntrega, StatusEntrega, EstatisticasEntregas } from './tipos-entregas'
import type { Funcionario } from './tipos-caixa'

type TipoNotificacao = 'sucesso' | 'erro' | 'aviso' | 'info' | 'confirmacao'

export function useEntregas() {
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [entregadores, setEntregadores] = useState<Funcionario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [notificacao, setNotificacao] = useState<{
    tipo: TipoNotificacao
    titulo: string
    mensagem: string
    onConfirm?: () => void
  } | null>(null)

  const entregasRef = useRef<Entrega[]>([])

  useEffect(() => {
    entregasRef.current = entregas
  }, [entregas])

  const mostrarNotificacao = useCallback((
    tipo: TipoNotificacao,
    titulo: string,
    mensagem: string,
    onConfirm?: () => void
  ) => {
    setNotificacao({ tipo, titulo, mensagem, onConfirm })
  }, [])

  const fecharNotificacao = useCallback(() => {
    setNotificacao(null)
  }, [])

  // Carregar entregas
  const carregarEntregas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('entregas')
        .select(`
          *,
          entregador:funcionarios(*),
          pedido:pedidos(id, nome_cliente, telefone, total, forma_pagamento, status, tipo_entrega, endereco)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setEntregas(data || [])
    } catch (erro) {
      console.error('Erro ao carregar entregas:', erro)
    }
  }, [])

  // Carregar entregadores (funcionários com cargo de entregador)
  const carregarEntregadores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('ativo', true)
        .or('cargo.ilike.%entregador%,cargo.ilike.%motoboy%,cargo.ilike.%delivery%')

      if (error) throw error
      setEntregadores(data || [])
    } catch (erro) {
      console.error('Erro ao carregar entregadores:', erro)
    }
  }, [])

  // Carregar dados iniciais
  const carregarDados = useCallback(async () => {
    setCarregando(true)
    await Promise.all([carregarEntregas(), carregarEntregadores()])
    setCarregando(false)
  }, [carregarEntregas, carregarEntregadores])

  // Registrar nova entrega
  const registrarEntrega = useCallback(async (dados: NovaEntrega): Promise<boolean> => {
    try {
      // Verificar se já existe entrega para este pedido
      const { data: existente } = await supabase
        .from('entregas')
        .select('id')
        .eq('pedido_id', dados.pedido_id)
        .single()

      if (existente) {
        mostrarNotificacao('aviso', 'Atenção', 'Já existe uma entrega registrada para este pedido.')
        return false
      }

      const { error } = await supabase.from('entregas').insert({
        pedido_id: dados.pedido_id,
        entregador_id: dados.entregador_id || null,
        endereco_entrega: dados.endereco_entrega || null,
        bairro: dados.bairro || null,
        taxa_entrega: dados.taxa_entrega || 0,
        tempo_estimado: dados.tempo_estimado || null,
        distancia_km: dados.distancia_km || null,
        observacoes: dados.observacoes || null,
        status: 'pendente'
      })

      if (error) throw error

      await carregarEntregas()
      mostrarNotificacao('sucesso', 'Sucesso', 'Entrega registrada com sucesso!')
      return true
    } catch (erro) {
      console.error('Erro ao registrar entrega:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível registrar a entrega.')
      return false
    }
  }, [carregarEntregas, mostrarNotificacao])

  // Atualizar status da entrega
  const atualizarStatusEntrega = useCallback(async (
    entregaId: string,
    novoStatus: StatusEntrega,
    entregadorId?: string
  ): Promise<boolean> => {
    try {
      const atualizacao: Record<string, unknown> = {
        status: novoStatus,
        updated_at: new Date().toISOString()
      }

      if (entregadorId) {
        atualizacao.entregador_id = entregadorId
      }

      if (novoStatus === 'em_rota') {
        atualizacao.data_saida = new Date().toISOString()
      }

      if (novoStatus === 'entregue') {
        atualizacao.data_entrega = new Date().toISOString()
        
        // Calcular tempo real
        const entrega = entregasRef.current.find(e => e.id === entregaId)
        if (entrega?.data_saida) {
          const saida = new Date(entrega.data_saida)
          const chegada = new Date()
          const tempoMinutos = Math.round((chegada.getTime() - saida.getTime()) / 60000)
          atualizacao.tempo_real = tempoMinutos
        }
      }

      const { error } = await supabase
        .from('entregas')
        .update(atualizacao)
        .eq('id', entregaId)

      if (error) throw error

      await carregarEntregas()
      
      const mensagens: Record<StatusEntrega, string> = {
        'pendente': 'Entrega marcada como pendente',
        'em_rota': 'Entregador saiu para entrega',
        'entregue': 'Entrega concluída com sucesso!',
        'cancelada': 'Entrega cancelada'
      }
      
      mostrarNotificacao('sucesso', 'Atualizado', mensagens[novoStatus])
      return true
    } catch (erro) {
      console.error('Erro ao atualizar entrega:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível atualizar a entrega.')
      return false
    }
  }, [carregarEntregas, mostrarNotificacao])

  // Excluir entrega
  const excluirEntrega = useCallback(async (entregaId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('entregas')
        .delete()
        .eq('id', entregaId)

      if (error) throw error

      setEntregas(prev => prev.filter(e => e.id !== entregaId))
      mostrarNotificacao('sucesso', 'Excluído', 'Entrega excluída com sucesso!')
      return true
    } catch (erro) {
      console.error('Erro ao excluir entrega:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível excluir a entrega.')
      return false
    }
  }, [mostrarNotificacao])

  // Calcular estatísticas
  const estatisticas: EstatisticasEntregas = {
    totalEntregas: entregas.length,
    entregasPendentes: entregas.filter(e => e.status === 'pendente').length,
    entregasEmRota: entregas.filter(e => e.status === 'em_rota').length,
    entregasConcluidas: entregas.filter(e => e.status === 'entregue').length,
    entregasCanceladas: entregas.filter(e => e.status === 'cancelada').length,
    tempoMedioEntrega: (() => {
      const entregues = entregas.filter(e => e.tempo_real)
      if (entregues.length === 0) return 0
      return Math.round(entregues.reduce((acc, e) => acc + (e.tempo_real || 0), 0) / entregues.length)
    })(),
    taxaMediaEntrega: (() => {
      const comTaxa = entregas.filter(e => e.taxa_entrega > 0)
      if (comTaxa.length === 0) return 0
      return comTaxa.reduce((acc, e) => acc + e.taxa_entrega, 0) / comTaxa.length
    })(),
    totalTaxas: entregas.reduce((acc, e) => acc + (e.taxa_entrega || 0), 0)
  }

  // Configurar Realtime
  useEffect(() => {
    carregarDados()

    const channel = supabase
      .channel('entregas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregas' },
        (payload) => {
          console.log('[Entregas] Realtime:', payload.eventType)
          carregarEntregas()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        async (payload) => {
          console.log('[Entregas] Pedido Realtime:', payload.eventType, payload.new)
          // Quando um pedido for marcado como entrega, criar entrega automaticamente
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const pedido = payload.new as { id: string; tipo_entrega?: string; endereco?: string; taxa_entrega?: number }
            if (pedido.tipo_entrega === 'entrega') {
              // Verificar se já existe entrega
              const { data: existente } = await supabase
                .from('entregas')
                .select('id')
                .eq('pedido_id', pedido.id)
                .single()

              if (!existente) {
                console.log('[Entregas] Criando entrega para pedido:', pedido.id)
                await supabase.from('entregas').insert({
                  pedido_id: pedido.id,
                  endereco_entrega: pedido.endereco || null,
                  taxa_entrega: pedido.taxa_entrega || 0,
                  status: 'pendente'
                })
                // Recarregar entregas
                carregarEntregas()
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Entregas] Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [carregarDados, carregarEntregas])

  return {
    entregas,
    entregadores,
    estatisticas,
    carregando,
    notificacao,
    carregarDados,
    registrarEntrega,
    atualizarStatusEntrega,
    excluirEntrega,
    mostrarNotificacao,
    fecharNotificacao
  }
}
