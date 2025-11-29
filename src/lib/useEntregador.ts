'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import type { Funcionario } from './tipos-caixa'

// Tipos específicos do painel do entregador
export type EntregaParaEntregador = {
  id: string
  pedido_id: string
  status: 'pendente' | 'em_rota' | 'entregue' | 'cancelada'
  endereco_entrega: string | null
  bairro: string | null
  taxa_entrega: number
  tempo_estimado: number | null
  tempo_real: number | null
  observacoes: string | null
  data_saida: string | null
  data_entrega: string | null
  created_at: string
  pedido: {
    id: string
    nome_cliente: string
    telefone: string | null
    endereco: string | null
    total: number
    forma_pagamento: string
    observacoes: string | null
  } | null
}

export type EstatisticasEntregador = {
  pendentes: number
  emRota: number
  concluidas: number
  totalHoje: number
  ganhoHoje: number
}

type NotificacaoEntregador = {
  id: string
  tipo: 'nova_entrega' | 'cancelamento' | 'info'
  titulo: string
  mensagem: string
  timestamp: Date
  lida: boolean
}

export function useEntregador(entregadorId: string | null) {
  const [entregas, setEntregas] = useState<EntregaParaEntregador[]>([])
  const [entregador, setEntregador] = useState<Funcionario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [estatisticas, setEstatisticas] = useState<EstatisticasEntregador>({
    pendentes: 0,
    emRota: 0,
    concluidas: 0,
    totalHoje: 0,
    ganhoHoje: 0
  })
  const [notificacoes, setNotificacoes] = useState<NotificacaoEntregador[]>([])
  const [notificacoesPermitidas, setNotificacoesPermitidas] = useState(false)

  const entregasRef = useRef<EntregaParaEntregador[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Manter ref atualizada
  useEffect(() => {
    entregasRef.current = entregas
  }, [entregas])

  // Inicializar áudio para notificações
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notificacao.mp3')
      audioRef.current.volume = 0.7
    }
  }, [])

  // Verificar permissão de notificações
  const verificarPermissaoNotificacao = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('[Entregador] Notificações não suportadas')
      return false
    }

    if (Notification.permission === 'granted') {
      setNotificacoesPermitidas(true)
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      const permitido = permission === 'granted'
      setNotificacoesPermitidas(permitido)
      return permitido
    }

    return false
  }, [])

  // Enviar notificação push
  const enviarNotificacaoPush = useCallback(async (titulo: string, corpo: string, tag?: string) => {
    if (!notificacoesPermitidas) return

    try {
      // Tenta via Service Worker primeiro (funciona em background)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(titulo, {
          body: corpo,
          icon: '/assets/meuburger.png',
          badge: '/assets/meuburger.png',
          tag: tag || 'entrega-' + Date.now(),
          requireInteraction: true,
          data: { url: '/entregador' }
        } as NotificationOptions)
      } else {
        // Fallback para notificação local
        new Notification(titulo, {
          body: corpo,
          icon: '/assets/meuburger.png',
          tag: tag || 'entrega-' + Date.now(),
        })
      }

      // Tocar som
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      }
    } catch (error) {
      console.error('[Entregador] Erro ao enviar notificação:', error)
    }
  }, [notificacoesPermitidas])

  // Adicionar notificação interna
  const adicionarNotificacao = useCallback((
    tipo: NotificacaoEntregador['tipo'],
    titulo: string,
    mensagem: string
  ) => {
    const novaNotificacao: NotificacaoEntregador = {
      id: Date.now().toString(),
      tipo,
      titulo,
      mensagem,
      timestamp: new Date(),
      lida: false
    }
    setNotificacoes(prev => [novaNotificacao, ...prev].slice(0, 50))
  }, [])

  // Marcar notificação como lida
  const marcarNotificacaoLida = useCallback((id: string) => {
    setNotificacoes(prev => 
      prev.map(n => n.id === id ? { ...n, lida: true } : n)
    )
  }, [])

  // Limpar notificações lidas
  const limparNotificacoesLidas = useCallback(() => {
    setNotificacoes(prev => prev.filter(n => !n.lida))
  }, [])

  // Carregar dados do entregador
  const carregarEntregador = useCallback(async () => {
    if (!entregadorId) return

    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('id', entregadorId)
        .single()

      if (error) throw error
      setEntregador(data)
    } catch (erro) {
      console.error('[Entregador] Erro ao carregar dados:', erro)
    }
  }, [entregadorId])

  // Carregar entregas
  const carregarEntregas = useCallback(async () => {
    try {
      // Buscar entregas do dia (ou pendentes/em rota de dias anteriores)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('entregas')
        .select(`
          *,
          pedido:pedidos(id, nome_cliente, telefone, endereco, total, forma_pagamento, observacoes)
        `)
        .or(`created_at.gte.${hoje.toISOString()},status.in.(pendente,em_rota)`)
        .order('created_at', { ascending: false })

      if (error) throw error

      setEntregas(data || [])
      calcularEstatisticas(data || [])
    } catch (erro) {
      console.error('[Entregador] Erro ao carregar entregas:', erro)
    }
  }, [])

  // Calcular estatísticas
  const calcularEstatisticas = useCallback((listaEntregas: EntregaParaEntregador[]) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const entregasHoje = listaEntregas.filter(e => 
      new Date(e.created_at) >= hoje
    )

    const stats: EstatisticasEntregador = {
      pendentes: listaEntregas.filter(e => e.status === 'pendente').length,
      emRota: listaEntregas.filter(e => e.status === 'em_rota').length,
      concluidas: entregasHoje.filter(e => e.status === 'entregue').length,
      totalHoje: entregasHoje.length,
      ganhoHoje: entregasHoje
        .filter(e => e.status === 'entregue')
        .reduce((acc, e) => acc + (e.taxa_entrega || 0), 0)
    }

    setEstatisticas(stats)
  }, [])

  // Iniciar entrega (mudar para em_rota)
  const iniciarEntrega = useCallback(async (entregaId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({
          status: 'em_rota',
          data_saida: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', entregaId)

      if (error) throw error

      await carregarEntregas()
      return true
    } catch (erro) {
      console.error('[Entregador] Erro ao iniciar entrega:', erro)
      return false
    }
  }, [carregarEntregas])

  // Concluir entrega
  const concluirEntrega = useCallback(async (entregaId: string): Promise<boolean> => {
    try {
      const entrega = entregas.find(e => e.id === entregaId)
      if (!entrega) return false

      // Calcular tempo real se tiver data de saída
      let tempoReal = null
      if (entrega.data_saida) {
        const saida = new Date(entrega.data_saida)
        const agora = new Date()
        tempoReal = Math.round((agora.getTime() - saida.getTime()) / 60000) // em minutos
      }

      const { error } = await supabase
        .from('entregas')
        .update({
          status: 'entregue',
          data_entrega: new Date().toISOString(),
          tempo_real: tempoReal,
          updated_at: new Date().toISOString()
        })
        .eq('id', entregaId)

      if (error) throw error

      // Atualizar status do pedido também
      if (entrega.pedido_id) {
        await supabase
          .from('pedidos')
          .update({ status: 'entregue', updated_at: new Date().toISOString() })
          .eq('id', entrega.pedido_id)
      }

      await carregarEntregas()
      return true
    } catch (erro) {
      console.error('[Entregador] Erro ao concluir entrega:', erro)
      return false
    }
  }, [entregas, carregarEntregas])

  // Carregar dados iniciais
  const carregarDados = useCallback(async () => {
    setCarregando(true)
    await Promise.all([
      carregarEntregador(),
      carregarEntregas(),
      verificarPermissaoNotificacao()
    ])
    setCarregando(false)
  }, [carregarEntregador, carregarEntregas, verificarPermissaoNotificacao])

  // Configurar Realtime
  useEffect(() => {
    carregarDados()

    // Subscrever a mudanças na tabela de entregas
    const channel = supabase
      .channel('entregador-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entregas' },
        async (payload) => {
          console.log('[Entregador] Nova entrega:', payload)
          
          // Buscar dados completos da entrega
          const { data: novaEntrega } = await supabase
            .from('entregas')
            .select(`
              *,
              pedido:pedidos(id, nome_cliente, telefone, endereco, total, forma_pagamento, observacoes)
            `)
            .eq('id', payload.new.id)
            .single()

          if (novaEntrega) {
            setEntregas(prev => [novaEntrega, ...prev])
            calcularEstatisticas([novaEntrega, ...entregasRef.current])

            // Notificar
            const nomeCliente = novaEntrega.pedido?.nome_cliente || 'Cliente'
            const endereco = novaEntrega.endereco_entrega || novaEntrega.pedido?.endereco || 'Endereço não informado'
            
            adicionarNotificacao(
              'nova_entrega',
              '🛵 Nova Entrega!',
              `${nomeCliente} - ${endereco}`
            )

            enviarNotificacaoPush(
              '🛵 Nova Entrega Disponível!',
              `${nomeCliente}\n${endereco}`,
              `entrega-${novaEntrega.id}`
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'entregas' },
        async (payload) => {
          console.log('[Entregador] Entrega atualizada:', payload)
          await carregarEntregas()
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'entregas' },
        async (payload) => {
          console.log('[Entregador] Entrega removida:', payload)
          setEntregas(prev => prev.filter(e => e.id !== payload.old.id))
          calcularEstatisticas(entregasRef.current.filter(e => e.id !== payload.old.id))
        }
      )
      .subscribe((status) => {
        console.log('[Entregador] Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [carregarDados, carregarEntregas, calcularEstatisticas, adicionarNotificacao, enviarNotificacaoPush])

  return {
    entregas,
    entregador,
    estatisticas,
    notificacoes,
    notificacoesPermitidas,
    carregando,
    carregarDados,
    iniciarEntrega,
    concluirEntrega,
    verificarPermissaoNotificacao,
    marcarNotificacaoLida,
    limparNotificacoesLidas
  }
}
