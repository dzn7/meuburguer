'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { 
  Funcionario, CategoriaCaixa, Caixa, MovimentacaoCaixa, 
  EstatisticasCaixa, EstatisticasPedidosDia, NotificacaoCaixa 
} from '@/lib/tipos-caixa'

export type PedidoDia = {
  id: string
  nome_cliente: string
  total: number
  forma_pagamento: string
  status: string
  tipo_entrega?: string
  created_at: string
  sincronizado: boolean
}

export function useCaixa() {
  const [caixaAtual, setCaixaAtual] = useState<Caixa | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [categorias, setCategorias] = useState<CategoriaCaixa[]>([])
  const [historicoCaixas, setHistoricoCaixas] = useState<Caixa[]>([])
  const [pedidosDia, setPedidosDia] = useState<PedidoDia[]>([])
  const [pedidosHoje, setPedidosHoje] = useState<PedidoDia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [estatisticas, setEstatisticas] = useState<EstatisticasCaixa>({
    saldoAtual: 0, totalEntradas: 0, totalSaidas: 0, quantidadeMovimentacoes: 0
  })
  const [estatisticasPedidos, setEstatisticasPedidos] = useState<EstatisticasPedidosDia>({
    entregas: { quantidade: 0, total: 0 },
    retiradas: { quantidade: 0, total: 0 },
    local: { quantidade: 0, total: 0 },
    totalPedidos: 0,
    totalFaturamento: 0
  })
  const [notificacao, setNotificacao] = useState<NotificacaoCaixa>({
    aberto: false, tipo: 'info', titulo: '', mensagem: ''
  })
  
  const canalRealtimeRef = useRef<RealtimeChannel | null>(null)
  const caixaAtualRef = useRef<Caixa | null>(null)
  const categoriasRef = useRef<CategoriaCaixa[]>([])
  
  // Manter refs atualizadas
  useEffect(() => {
    caixaAtualRef.current = caixaAtual
  }, [caixaAtual])
  
  useEffect(() => {
    categoriasRef.current = categorias
  }, [categorias])

  const mostrarNotificacao = useCallback((
    tipo: NotificacaoCaixa['tipo'], 
    titulo: string, 
    mensagem: string, 
    onConfirmar?: () => void
  ) => {
    setNotificacao({ aberto: true, tipo, titulo, mensagem, onConfirmar })
  }, [])

  const fecharNotificacao = useCallback(() => {
    setNotificacao(prev => ({ ...prev, aberto: false }))
  }, [])

  const calcularEstatisticas = useCallback((movs: MovimentacaoCaixa[], caixa: Caixa | null) => {
    const totalEntradas = movs.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + Number(m.valor), 0)
    const totalSaidas = movs.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + Number(m.valor), 0)
    const saldoAtual = (caixa?.valor_abertura || 0) + totalEntradas - totalSaidas
    setEstatisticas({ saldoAtual, totalEntradas, totalSaidas, quantidadeMovimentacoes: movs.length })
  }, [])

  const carregarMovimentacoes = useCallback(async (caixaId: string, caixa: Caixa | null) => {
    try {
      const { data } = await supabase
        .from('movimentacoes_caixa')
        .select('*, categoria:categorias_caixa(*), funcionario:funcionarios(*)')
        .eq('caixa_id', caixaId)
        .order('created_at', { ascending: false })
      
      if (data) {
        setMovimentacoes(data)
        calcularEstatisticas(data, caixa)
      }
    } catch (erro) {
      console.error('Erro ao carregar movimentações:', erro)
    }
  }, [calcularEstatisticas])

  // Calcular estatísticas por tipo de pedido
  const calcularEstatisticasPedidos = useCallback((pedidos: PedidoDia[]) => {
    const stats: EstatisticasPedidosDia = {
      entregas: { quantidade: 0, total: 0 },
      retiradas: { quantidade: 0, total: 0 },
      local: { quantidade: 0, total: 0 },
      totalPedidos: 0,
      totalFaturamento: 0
    }

    pedidos.forEach(pedido => {
      const tipo = pedido.tipo_entrega?.toLowerCase() || 'local'
      const valor = Number(pedido.total) || 0

      if (tipo === 'entrega') {
        stats.entregas.quantidade++
        stats.entregas.total += valor
      } else if (tipo === 'retirada') {
        stats.retiradas.quantidade++
        stats.retiradas.total += valor
      } else {
        stats.local.quantidade++
        stats.local.total += valor
      }

      stats.totalPedidos++
      stats.totalFaturamento += valor
    })

    setEstatisticasPedidos(stats)
    return stats
  }, [])

  const carregarPedidosHoje = useCallback(async () => {
    try {
      // Buscar pedidos de hoje (desde meia-noite)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, nome_cliente, total, forma_pagamento, status, tipo_entrega, created_at')
        .gte('created_at', hoje.toISOString())
        .in('status', ['entregue', 'pronto', 'preparando', 'confirmado', 'pendente'])
        .order('created_at', { ascending: false })

      const pedidosFormatados = (pedidos || []).map(p => ({
        ...p,
        sincronizado: false
      }))

      setPedidosHoje(pedidosFormatados)
      return pedidosFormatados
    } catch (erro) {
      console.error('Erro ao carregar pedidos de hoje:', erro)
      return []
    }
  }, [])

  const carregarPedidosDia = useCallback(async (caixa: Caixa | null) => {
    if (!caixa) {
      setPedidosDia([])
      setEstatisticasPedidos({
        entregas: { quantidade: 0, total: 0 },
        retiradas: { quantidade: 0, total: 0 },
        local: { quantidade: 0, total: 0 },
        totalPedidos: 0,
        totalFaturamento: 0
      })
      return []
    }

    try {
      // Usar a data de abertura do caixa como início do período
      // Pedidos do caixa = pedidos criados APÓS a abertura do caixa
      const dataAbertura = new Date(caixa.data_abertura)
      
      // Fim do período: 02:00 do dia seguinte (para incluir pedidos da madrugada)
      const fimDia = new Date(dataAbertura)
      fimDia.setDate(fimDia.getDate() + 1)
      fimDia.setHours(2, 0, 0, 0)
      
      // Se o caixa ainda está aberto, usar a data atual como limite
      const agora = new Date()
      const limiteData = caixa.status === 'aberto' ? agora : (caixa.data_fechamento ? new Date(caixa.data_fechamento) : fimDia)

      // Buscar pedidos criados APÓS a abertura do caixa
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, nome_cliente, total, forma_pagamento, status, tipo_entrega, created_at')
        .gte('created_at', dataAbertura.toISOString())
        .lte('created_at', limiteData.toISOString())
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false })

      // Buscar movimentações já sincronizadas com pedidos
      const { data: movsSincronizadas } = await supabase
        .from('movimentacoes_caixa')
        .select('pedido_id')
        .eq('caixa_id', caixa.id)
        .not('pedido_id', 'is', null)

      const pedidosSincronizados = new Set(movsSincronizadas?.map(m => m.pedido_id) || [])

      const pedidosComStatus = (pedidos || []).map(p => ({
        ...p,
        sincronizado: pedidosSincronizados.has(p.id)
      }))

      setPedidosDia(pedidosComStatus)
      
      // Calcular estatísticas por tipo de pedido
      calcularEstatisticasPedidos(pedidosComStatus)
      
      return pedidosComStatus
    } catch (erro) {
      console.error('Erro ao carregar pedidos:', erro)
      return []
    }
  }, [calcularEstatisticasPedidos])

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      const [funcRes, catRes, caixaRes, histRes] = await Promise.all([
        supabase.from('funcionarios').select('*').eq('ativo', true).order('nome'),
        supabase.from('categorias_caixa').select('*').eq('ativo', true).order('ordem'),
        supabase.from('caixas').select('*').eq('status', 'aberto').order('data_abertura', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('caixas').select('*').order('data_abertura', { ascending: false }).limit(30)
      ])

      if (funcRes.data) setFuncionarios(funcRes.data)
      if (catRes.data) setCategorias(catRes.data)
      if (histRes.data) setHistoricoCaixas(histRes.data)

      // Sempre carregar pedidos de hoje
      await carregarPedidosHoje()

      if (caixaRes.data) {
        setCaixaAtual(caixaRes.data)
        await carregarMovimentacoes(caixaRes.data.id, caixaRes.data)
        await carregarPedidosDia(caixaRes.data)
        
        // Não sincroniza automaticamente - isso será feito manualmente pelo usuário
        // A sincronização automática causava bugs quando o caixa era aberto com "Pedidos do Dia"
      } else {
        setCaixaAtual(null)
        setMovimentacoes([])
        setPedidosDia([])
        setEstatisticas({ saldoAtual: 0, totalEntradas: 0, totalSaidas: 0, quantidadeMovimentacoes: 0 })
      }
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível carregar os dados do caixa.')
    } finally {
      setCarregando(false)
    }
  }, [carregarMovimentacoes, carregarPedidosDia, carregarPedidosHoje, mostrarNotificacao])

  const abrirCaixa = async (
    valorAbertura: number, 
    responsavel: string, 
    dataReferencia?: Date,
    modoAbertura?: 'manual' | 'pedidos'
  ) => {
    try {
      // Se tiver data de referência, usar ela como data de abertura
      const dataAbertura = dataReferencia ? dataReferencia.toISOString() : new Date().toISOString()
      
      // Se modo for 'pedidos', o valor de abertura é 0 e os pedidos serão registrados como entradas
      // Isso evita duplicação: valor inicial = 0, pedidos = entradas
      const valorInicialReal = modoAbertura === 'pedidos' ? 0 : valorAbertura
      
      const { data, error } = await supabase.from('caixas').insert({
        data_abertura: dataAbertura,
        valor_abertura: valorInicialReal,
        responsavel_abertura: responsavel,
        status: 'aberto',
        total_entradas: 0,
        total_saidas: 0,
        saldo_esperado: valorInicialReal
      }).select().single()

      if (error) throw error

      setCaixaAtual(data)
      setMovimentacoes([])
      
      // Se abriu com pedidos, sincronizar os pedidos do período como movimentações
      if (modoAbertura === 'pedidos' && data) {
        // Buscar pedidos do período
        const inicioDia = new Date(dataAbertura)
        inicioDia.setHours(0, 0, 0, 0)
        
        const fimDia = new Date(inicioDia)
        fimDia.setDate(fimDia.getDate() + 1)
        fimDia.setHours(2, 0, 0, 0)

        const { data: pedidosDoPeriodo } = await supabase
          .from('pedidos')
          .select('id, nome_cliente, total, forma_pagamento, status')
          .gte('created_at', inicioDia.toISOString())
          .lte('created_at', fimDia.toISOString())
          .neq('status', 'cancelado')

        // Inserir todos os pedidos como movimentações em batch (mais rápido)
        if (pedidosDoPeriodo && pedidosDoPeriodo.length > 0) {
          const mapaCategorias: Record<string, string> = {
            'Dinheiro': 'Pedido - Dinheiro',
            'PIX': 'Pedido - PIX',
            'Cartão de Débito': 'Pedido - Cartão Débito',
            'Cartão de Crédito': 'Pedido - Cartão Crédito',
            'Cartão Débito': 'Pedido - Cartão Débito',
            'Cartão Crédito': 'Pedido - Cartão Crédito'
          }

          // Preparar todas as movimentações para inserção em batch
          const movimentacoesParaInserir = pedidosDoPeriodo.map(pedido => {
            const nomeCategoria = mapaCategorias[pedido.forma_pagamento] || 'Vendas do Dia'
            const categoria = categoriasRef.current.find(c => c.nome === nomeCategoria) || 
                              categoriasRef.current.find(c => c.nome === 'Vendas do Dia')

            return {
              caixa_id: data.id,
              categoria_id: categoria?.id,
              tipo: 'entrada',
              valor: Number(pedido.total),
              descricao: `Pedido de ${pedido.nome_cliente} - ${pedido.forma_pagamento}`,
              forma_pagamento: pedido.forma_pagamento,
              pedido_id: pedido.id
            }
          }).filter(m => m.categoria_id) // Filtrar apenas os que têm categoria válida

          // Inserir todas as movimentações de uma vez
          if (movimentacoesParaInserir.length > 0) {
            await supabase.from('movimentacoes_caixa').insert(movimentacoesParaInserir)
          }
        }
        
        setEstatisticas({ 
          saldoAtual: valorAbertura, 
          totalEntradas: valorAbertura, 
          totalSaidas: 0, 
          quantidadeMovimentacoes: pedidosDoPeriodo?.length || 0 
        })
      } else {
        setEstatisticas({ 
          saldoAtual: valorAbertura, 
          totalEntradas: 0, 
          totalSaidas: 0, 
          quantidadeMovimentacoes: 0 
        })
      }
      
      const mensagem = dataReferencia 
        ? `Caixa aberto para ${dataReferencia.toLocaleDateString('pt-BR')}!`
        : 'O caixa foi aberto com sucesso!'
      mostrarNotificacao('sucesso', 'Caixa Aberto', mensagem)
      
      // Recarregar dados
      await carregarDados()
      
      return true
    } catch (erro) {
      console.error('Erro ao abrir caixa:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível abrir o caixa.')
      return false
    }
  }

  const fecharCaixa = async (valorFechamento: number, responsavel: string, observacoes?: string) => {
    if (!caixaAtual) return false

    const saldoEsperado = (caixaAtual.valor_abertura || 0) + estatisticas.totalEntradas - estatisticas.totalSaidas
    const diferenca = valorFechamento - saldoEsperado

    try {
      const { error } = await supabase.from('caixas').update({
        data_fechamento: new Date().toISOString(),
        valor_fechamento: valorFechamento,
        total_entradas: estatisticas.totalEntradas,
        total_saidas: estatisticas.totalSaidas,
        saldo_esperado: saldoEsperado,
        diferenca,
        responsavel_fechamento: responsavel,
        observacoes: observacoes || null,
        status: 'fechado'
      }).eq('id', caixaAtual.id)

      if (error) throw error

      setCaixaAtual(null)
      setMovimentacoes([])
      setEstatisticas({ saldoAtual: 0, totalEntradas: 0, totalSaidas: 0, quantidadeMovimentacoes: 0 })
      
      const msgDiferenca = diferenca !== 0 ? ` Diferença: R$ ${diferenca.toFixed(2)}` : ''
      mostrarNotificacao('sucesso', 'Caixa Fechado', `Caixa fechado com sucesso!${msgDiferenca}`)
      carregarDados()
      return true
    } catch (erro) {
      console.error('Erro ao fechar caixa:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível fechar o caixa.')
      return false
    }
  }

  const registrarMovimentacao = async (
    tipo: 'entrada' | 'saida',
    valor: number,
    categoriaId: string,
    funcionarioId?: string,
    descricao?: string,
    formaPagamento?: string
  ) => {
    if (!caixaAtual) {
      mostrarNotificacao('aviso', 'Caixa fechado', 'Abra o caixa antes de registrar movimentações.')
      return false
    }

    try {
      const { error } = await supabase.from('movimentacoes_caixa').insert({
        caixa_id: caixaAtual.id,
        categoria_id: categoriaId || null,
        funcionario_id: funcionarioId || null,
        tipo,
        valor,
        descricao: descricao || null,
        forma_pagamento: formaPagamento || null
      })

      if (error) throw error

      const tipoTexto = tipo === 'entrada' ? 'Entrada' : 'Saída'
      mostrarNotificacao('sucesso', 'Registrado', `${tipoTexto} de R$ ${valor.toFixed(2)} registrada!`)
      await carregarMovimentacoes(caixaAtual.id, caixaAtual)
      return true
    } catch (erro) {
      console.error('Erro ao registrar movimentação:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível registrar a movimentação.')
      return false
    }
  }

  const excluirMovimentacao = async (movimentacaoId: string) => {
    try {
      const { error } = await supabase.from('movimentacoes_caixa').delete().eq('id', movimentacaoId)
      if (error) throw error

      if (caixaAtual) {
        await Promise.all([
          carregarMovimentacoes(caixaAtual.id, caixaAtual),
          carregarPedidosDia(caixaAtual)
        ])
      }
      mostrarNotificacao('sucesso', 'Excluído', 'Movimentação excluída com sucesso!')
      return true
    } catch (erro) {
      console.error('Erro ao excluir movimentação:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível excluir a movimentação.')
      return false
    }
  }

  const excluirCaixa = async (caixaId: string) => {
    try {
      // Primeiro excluir as movimentações do caixa
      await supabase.from('movimentacoes_caixa').delete().eq('caixa_id', caixaId)
      
      // Depois excluir o caixa
      const { error } = await supabase.from('caixas').delete().eq('id', caixaId)
      if (error) throw error

      // Atualizar histórico
      setHistoricoCaixas(prev => prev.filter(c => c.id !== caixaId))
      mostrarNotificacao('sucesso', 'Excluído', 'Caixa excluído com sucesso!')
      return true
    } catch (erro) {
      console.error('Erro ao excluir caixa:', erro)
      mostrarNotificacao('erro', 'Erro', 'Não foi possível excluir o caixa.')
      return false
    }
  }

  const sincronizarPedido = async (
    pedidoId: string, 
    pedidoTotal: number, 
    formaPagamento: string, 
    nomeCliente: string,
    silencioso: boolean = false
  ) => {
    if (!caixaAtual) {
      if (!silencioso) mostrarNotificacao('aviso', 'Caixa fechado', 'Abra o caixa antes de sincronizar pedidos.')
      return false
    }

    // Verificar se o pedido já foi sincronizado para evitar duplicação
    const { data: jaExiste } = await supabase
      .from('movimentacoes_caixa')
      .select('id')
      .eq('caixa_id', caixaAtual.id)
      .eq('pedido_id', pedidoId)
      .maybeSingle()

    if (jaExiste) {
      // Pedido já sincronizado, apenas atualizar lista sem notificar
      return true
    }

    // Mapear forma de pagamento para categoria
    const mapaCategorias: Record<string, string> = {
      'Dinheiro': 'Pedido - Dinheiro',
      'PIX': 'Pedido - PIX',
      'Cartão de Débito': 'Pedido - Cartão Débito',
      'Cartão de Crédito': 'Pedido - Cartão Crédito',
      'Cartão Débito': 'Pedido - Cartão Débito',
      'Cartão Crédito': 'Pedido - Cartão Crédito'
    }

    const nomeCategoria = mapaCategorias[formaPagamento] || 'Vendas do Dia'
    const categoria = categoriasRef.current.find(c => c.nome === nomeCategoria) || 
                      categoriasRef.current.find(c => c.nome === 'Vendas do Dia')

    if (!categoria) {
      if (!silencioso) mostrarNotificacao('erro', 'Erro', 'Categoria de pagamento não encontrada.')
      return false
    }

    try {
      const { error } = await supabase.from('movimentacoes_caixa').insert({
        caixa_id: caixaAtual.id,
        categoria_id: categoria.id,
        tipo: 'entrada',
        valor: pedidoTotal,
        descricao: `Pedido de ${nomeCliente} - ${formaPagamento}`,
        forma_pagamento: formaPagamento,
        pedido_id: pedidoId
      })

      if (error) throw error

      // Atualizar dados silenciosamente
      await Promise.all([
        carregarMovimentacoes(caixaAtual.id, caixaAtual),
        carregarPedidosDia(caixaAtual)
      ])
      return true
    } catch (erro) {
      console.error('Erro ao sincronizar pedido:', erro)
      if (!silencioso) mostrarNotificacao('erro', 'Erro', 'Não foi possível sincronizar o pedido.')
      return false
    }
  }

  const sincronizarTodosPedidos = async () => {
    if (!caixaAtual) {
      mostrarNotificacao('aviso', 'Caixa fechado', 'Abra o caixa antes de sincronizar pedidos.')
      return false
    }

    const pedidosNaoSincronizados = pedidosDia.filter(p => !p.sincronizado && p.status !== 'cancelado')
    
    if (pedidosNaoSincronizados.length === 0) {
      mostrarNotificacao('info', 'Nada a sincronizar', 'Todos os pedidos já estão no caixa.')
      return true
    }

    let sucesso = 0
    for (const pedido of pedidosNaoSincronizados) {
      const resultado = await sincronizarPedido(
        pedido.id, 
        Number(pedido.total), 
        pedido.forma_pagamento, 
        pedido.nome_cliente,
        true // silencioso - não mostrar notificação individual
      )
      if (resultado) sucesso++
    }

    // Apenas uma notificação no final
    if (sucesso > 0) {
      mostrarNotificacao('sucesso', 'Sincronização completa', 
        `${sucesso} pedido(s) sincronizado(s) com sucesso!`)
    }
    return sucesso === pedidosNaoSincronizados.length
  }

  // Função para sincronizar pedido automaticamente (usada pelo realtime)
  const sincronizarPedidoAutomatico = useCallback(async (
    pedidoId: string, 
    pedidoTotal: number, 
    formaPagamento: string, 
    nomeCliente: string
  ) => {
    const caixa = caixaAtualRef.current
    const cats = categoriasRef.current
    
    if (!caixa) return false

    // Verificar se já foi sincronizado
    const { data: jaExiste } = await supabase
      .from('movimentacoes_caixa')
      .select('id')
      .eq('pedido_id', pedidoId)
      .eq('caixa_id', caixa.id)
      .maybeSingle()

    if (jaExiste) return false

    // Mapear forma de pagamento para categoria
    const mapaCategorias: Record<string, string> = {
      'Dinheiro': 'Pedido - Dinheiro',
      'PIX': 'Pedido - PIX',
      'Cartão de Débito': 'Pedido - Cartão Débito',
      'Cartão de Crédito': 'Pedido - Cartão Crédito',
      'Cartão Débito': 'Pedido - Cartão Débito',
      'Cartão Crédito': 'Pedido - Cartão Crédito',
      'Espécie': 'Pedido - Dinheiro'
    }

    const nomeCategoria = mapaCategorias[formaPagamento] || 'Vendas do Dia'
    const categoria = cats.find(c => c.nome === nomeCategoria) || cats.find(c => c.nome === 'Vendas do Dia')

    if (!categoria) return false

    try {
      await supabase.from('movimentacoes_caixa').insert({
        caixa_id: caixa.id,
        categoria_id: categoria.id,
        tipo: 'entrada',
        valor: pedidoTotal,
        descricao: `Pedido de ${nomeCliente} - ${formaPagamento}`,
        forma_pagamento: formaPagamento,
        pedido_id: pedidoId
      })

      return true
    } catch (erro) {
      console.error('Erro ao sincronizar pedido automaticamente:', erro)
      return false
    }
  }, [])

  // Configurar Realtime
  useEffect(() => {
    carregarDados()

    // Configurar canal Realtime para pedidos
    const canal = supabase
      .channel('caixa-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        async (payload) => {
          const caixa = caixaAtualRef.current
          
          // Atualizar lista de pedidos de hoje
          await carregarPedidosHoje()
          
          if (!caixa) return
          
          // Se o caixa está aberto, verificar se precisa sincronizar
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const pedido = payload.new as { 
              id: string
              nome_cliente: string
              total: number
              forma_pagamento: string
              status: string
              created_at: string
            }
            
            // Verificar se o pedido foi criado após a abertura do caixa
            const pedidoData = new Date(pedido.created_at)
            const caixaAbertura = new Date(caixa.data_abertura)
            
            // Sincronizar automaticamente se não for cancelado (silenciosamente)
            if (pedidoData >= caixaAbertura && pedido.status !== 'cancelado') {
              await sincronizarPedidoAutomatico(
                pedido.id,
                Number(pedido.total),
                pedido.forma_pagamento,
                pedido.nome_cliente
              )
              // Não mostrar notificação - sincronização silenciosa em realtime
            }
            
            // Se foi cancelado, remover a movimentação correspondente
            if (pedido.status === 'cancelado') {
              await supabase
                .from('movimentacoes_caixa')
                .delete()
                .eq('pedido_id', pedido.id)
                .eq('caixa_id', caixa.id)
            }
            
            // Recarregar dados
            await carregarMovimentacoes(caixa.id, caixa)
            await carregarPedidosDia(caixa)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movimentacoes_caixa' },
        async () => {
          const caixa = caixaAtualRef.current
          if (caixa) {
            await carregarMovimentacoes(caixa.id, caixa)
            await carregarPedidosDia(caixa)
          }
        }
      )
      .subscribe()

    canalRealtimeRef.current = canal

    return () => {
      if (canalRealtimeRef.current) {
        supabase.removeChannel(canalRealtimeRef.current)
      }
    }
  }, [carregarDados, carregarMovimentacoes, carregarPedidosDia, carregarPedidosHoje, mostrarNotificacao, sincronizarPedidoAutomatico])

  // Calcular total dos pedidos de hoje (entregues)
  const totalPedidosHoje = pedidosHoje
    .filter(p => p.status === 'entregue')
    .reduce((acc, p) => acc + Number(p.total), 0)

  return {
    caixaAtual,
    movimentacoes,
    funcionarios,
    categorias,
    historicoCaixas,
    pedidosDia,
    pedidosHoje,
    totalPedidosHoje,
    estatisticas,
    estatisticasPedidos,
    carregando,
    notificacao,
    carregarDados,
    abrirCaixa,
    fecharCaixa,
    registrarMovimentacao,
    excluirMovimentacao,
    excluirCaixa,
    sincronizarPedido,
    sincronizarTodosPedidos,
    mostrarNotificacao,
    fecharNotificacao
  }
}
