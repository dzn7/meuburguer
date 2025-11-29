'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  RefreshCw,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Truck,
  Store,
  Package,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import { format, subDays, addDays, startOfDay, endOfDay, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

// Tipos
type DadosDiarios = {
  data: Date
  faturamentoTotal: number
  totalPedidos: number
  ticketMedio: number
  pedidosPorTipo: {
    entregas: { total: number; quantidade: number }
    retiradas: { total: number; quantidade: number }
    local: { total: number; quantidade: number }
  }
  faturamentoPorPagamento: { forma: string; total: number; quantidade: number }[]
  horariosPico: { hora: number; quantidade: number }[]
  produtosMaisVendidos: { nome: string; quantidade: number; receita: number }[]
  comparacaoOntem: {
    faturamento: number // percentual
    pedidos: number // percentual
  }
}

type FormaPagamentoConfig = { 
  nome: string
  icone: typeof Banknote
  cor: string
  bgCor: string
  chartCor: string 
}

const FORMAS_PAGAMENTO_CONFIG: Record<string, FormaPagamentoConfig> = {
  dinheiro: { nome: 'Dinheiro', icone: Banknote, cor: 'text-green-600', bgCor: 'bg-green-100 dark:bg-green-900/30', chartCor: 'rgba(34, 197, 94, 0.8)' },
  pix: { nome: 'PIX', icone: Smartphone, cor: 'text-purple-600', bgCor: 'bg-purple-100 dark:bg-purple-900/30', chartCor: 'rgba(168, 85, 247, 0.8)' },
  credito: { nome: 'Crédito', icone: CreditCard, cor: 'text-blue-600', bgCor: 'bg-blue-100 dark:bg-blue-900/30', chartCor: 'rgba(59, 130, 246, 0.8)' },
  debito: { nome: 'Débito', icone: CreditCard, cor: 'text-amber-600', bgCor: 'bg-amber-100 dark:bg-amber-900/30', chartCor: 'rgba(245, 158, 11, 0.8)' },
  vale_refeicao: { nome: 'Vale Refeição', icone: Wallet, cor: 'text-red-600', bgCor: 'bg-red-100 dark:bg-red-900/30', chartCor: 'rgba(239, 68, 68, 0.8)' },
}

export default function AnaliseDiariaPage() {
  const [dataSelecionada, setDataSelecionada] = useState(new Date())
  const [dados, setDados] = useState<DadosDiarios | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Formatar data para exibição
  const dataFormatada = useMemo(() => {
    if (isToday(dataSelecionada)) return 'Hoje'
    if (isYesterday(dataSelecionada)) return 'Ontem'
    return format(dataSelecionada, "EEEE, dd 'de' MMMM", { locale: ptBR })
  }, [dataSelecionada])

  // Navegar entre dias
  const irParaDiaAnterior = () => setDataSelecionada(prev => subDays(prev, 1))
  const irParaProximoDia = () => {
    const amanha = addDays(dataSelecionada, 1)
    if (amanha <= new Date()) {
      setDataSelecionada(amanha)
    }
  }
  const irParaHoje = () => setDataSelecionada(new Date())

  // Carregar dados do dia
  useEffect(() => {
    carregarDadosDia()

    // Realtime para atualizar automaticamente
    const channel = supabase
      .channel('analise-diaria-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        if (isToday(dataSelecionada)) {
          carregarDadosDia()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSelecionada])

  const carregarDadosDia = async () => {
    setCarregando(true)
    try {
      const inicioDia = startOfDay(dataSelecionada)
      const fimDia = endOfDay(dataSelecionada)
      
      // Buscar pedidos do dia
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('*')
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString())
        .neq('status', 'cancelado')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Buscar itens dos pedidos
      const pedidosComItens = await Promise.all(
        (pedidos || []).map(async (pedido) => {
          const { data: itens } = await supabase
            .from('itens_pedido')
            .select('*')
            .eq('pedido_id', pedido.id)
          return { ...pedido, itens_pedido: itens || [] }
        })
      )

      // Buscar dados do dia anterior para comparação
      const inicioOntem = startOfDay(subDays(dataSelecionada, 1))
      const fimOntem = endOfDay(subDays(dataSelecionada, 1))
      
      const { data: pedidosOntem } = await supabase
        .from('pedidos')
        .select('total')
        .gte('created_at', inicioOntem.toISOString())
        .lte('created_at', fimOntem.toISOString())
        .neq('status', 'cancelado')

      // Processar dados
      const faturamentoTotal = pedidosComItens.reduce((sum, p) => sum + Number(p.total), 0)
      const totalPedidos = pedidosComItens.length
      const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0

      // Faturamento e pedidos de ontem
      const faturamentoOntem = (pedidosOntem || []).reduce((sum, p) => sum + Number(p.total), 0)
      const pedidosOntemTotal = (pedidosOntem || []).length

      // Calcular variação percentual
      const variacaoFaturamento = faturamentoOntem > 0 
        ? ((faturamentoTotal - faturamentoOntem) / faturamentoOntem) * 100 
        : faturamentoTotal > 0 ? 100 : 0
      
      const variacaoPedidos = pedidosOntemTotal > 0 
        ? ((totalPedidos - pedidosOntemTotal) / pedidosOntemTotal) * 100 
        : totalPedidos > 0 ? 100 : 0

      // Processar pedidos por tipo
      const pedidosPorTipo = processarPedidosPorTipo(pedidosComItens)
      
      // Processar faturamento por forma de pagamento
      const faturamentoPorPagamento = await processarFaturamentoPorPagamento(
        inicioDia.toISOString(), 
        fimDia.toISOString()
      )

      // Processar horários de pico
      const horariosPico = processarHorariosPico(pedidosComItens)

      // Processar produtos mais vendidos
      const produtosMaisVendidos = processarProdutosMaisVendidos(pedidosComItens)

      setDados({
        data: dataSelecionada,
        faturamentoTotal,
        totalPedidos,
        ticketMedio,
        pedidosPorTipo,
        faturamentoPorPagamento,
        horariosPico,
        produtosMaisVendidos,
        comparacaoOntem: {
          faturamento: variacaoFaturamento,
          pedidos: variacaoPedidos
        }
      })
    } catch (erro) {
      console.error('[Análise Diária] Erro ao carregar dados:', erro)
    } finally {
      setCarregando(false)
    }
  }

  // Funções de processamento
  const processarPedidosPorTipo = (pedidos: any[]) => {
    const tipos = {
      entregas: { total: 0, quantidade: 0 },
      retiradas: { total: 0, quantidade: 0 },
      local: { total: 0, quantidade: 0 }
    }

    pedidos.forEach(pedido => {
      const tipo = pedido.tipo_entrega?.toLowerCase() || 'local'
      const valor = Number(pedido.total) || 0

      if (tipo === 'entrega') {
        tipos.entregas.total += valor
        tipos.entregas.quantidade += 1
      } else if (tipo === 'retirada') {
        tipos.retiradas.total += valor
        tipos.retiradas.quantidade += 1
      } else {
        tipos.local.total += valor
        tipos.local.quantidade += 1
      }
    })

    return tipos
  }

  const processarFaturamentoPorPagamento = async (inicioStr: string, fimStr: string) => {
    const agrupado: Record<string, { total: number; quantidade: number }> = {}

    const normalizarForma = (formaPagamento: string): string => {
      const forma = formaPagamento?.toLowerCase() || 'outros'
      
      if (['cartão', 'cartao', 'cartão de crédito', 'cartao de credito', 'credito'].includes(forma)) {
        return 'credito'
      } else if (['cartão de débito', 'cartao de debito', 'debito'].includes(forma)) {
        return 'debito'
      } else if (['vale refeição', 'vale refeicao'].includes(forma)) {
        return 'vale_refeicao'
      } else if (forma === 'pix') {
        return 'pix'
      } else if (forma === 'dinheiro') {
        return 'dinheiro'
      }
      return forma
    }

    // Buscar pagamentos divididos
    const { data: pagamentos } = await supabase
      .from('pagamentos_pedido')
      .select('forma_pagamento, valor, pedido_id')
      .gte('created_at', inicioStr)
      .lte('created_at', fimStr)

    const pedidosComPagamentoDividido = new Set<string>()
    
    if (pagamentos && pagamentos.length > 0) {
      pagamentos.forEach((pag: any) => {
        pedidosComPagamentoDividido.add(pag.pedido_id)
        const forma = normalizarForma(pag.forma_pagamento)
        if (!agrupado[forma]) {
          agrupado[forma] = { total: 0, quantidade: 0 }
        }
        agrupado[forma].total += Number(pag.valor) || 0
        agrupado[forma].quantidade += 1
      })
    }

    // Buscar pedidos sem pagamento dividido
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, forma_pagamento, total')
      .gte('created_at', inicioStr)
      .lte('created_at', fimStr)
      .neq('status', 'cancelado')

    if (pedidos && pedidos.length > 0) {
      pedidos.forEach((pedido: any) => {
        if (pedidosComPagamentoDividido.has(pedido.id)) return
        if (pedido.forma_pagamento === 'Dividido') return
        
        const forma = normalizarForma(pedido.forma_pagamento)
        if (!agrupado[forma]) {
          agrupado[forma] = { total: 0, quantidade: 0 }
        }
        agrupado[forma].total += Number(pedido.total) || 0
        agrupado[forma].quantidade += 1
      })
    }

    return Object.entries(agrupado)
      .map(([forma, dados]) => ({ forma, ...dados }))
      .sort((a, b) => b.total - a.total)
  }

  const processarHorariosPico = (pedidos: any[]) => {
    const horarios: { [key: number]: number } = {}

    pedidos.forEach(pedido => {
      const hora = new Date(pedido.created_at).getHours()
      horarios[hora] = (horarios[hora] || 0) + 1
    })

    // Preencher todas as horas do dia (0-23)
    const resultado = []
    for (let h = 0; h < 24; h++) {
      resultado.push({ hora: h, quantidade: horarios[h] || 0 })
    }

    return resultado
  }

  const processarProdutosMaisVendidos = (pedidos: any[]) => {
    const produtos: { [key: string]: { quantidade: number; receita: number } } = {}

    pedidos.forEach(pedido => {
      pedido.itens_pedido?.forEach((item: any) => {
        const nome = item.nome_produto || item.produto_nome || 'Produto'
        if (!produtos[nome]) {
          produtos[nome] = { quantidade: 0, receita: 0 }
        }
        produtos[nome].quantidade += item.quantidade
        produtos[nome].receita += Number(item.subtotal) || 0
      })
    })

    return Object.entries(produtos)
      .map(([nome, valores]) => ({ nome, ...valores }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)
  }

  // Dados para gráficos
  const dadosGraficoPagamentos = useMemo(() => {
    if (!dados?.faturamentoPorPagamento) return null

    const labels = dados.faturamentoPorPagamento.map(p => 
      FORMAS_PAGAMENTO_CONFIG[p.forma]?.nome || p.forma
    )
    const valores = dados.faturamentoPorPagamento.map(p => p.total)
    const cores = dados.faturamentoPorPagamento.map(p => 
      FORMAS_PAGAMENTO_CONFIG[p.forma]?.chartCor || 'rgba(156, 163, 175, 0.8)'
    )

    return {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: cores,
        borderWidth: 0
      }]
    }
  }, [dados])

  const dadosGraficoHorarios = useMemo(() => {
    if (!dados?.horariosPico) return null

    // Filtrar apenas horários com pedidos ou horários comerciais (10h-23h)
    const horariosRelevantes = dados.horariosPico.filter(h => 
      h.quantidade > 0 || (h.hora >= 10 && h.hora <= 23)
    )

    return {
      labels: horariosRelevantes.map(h => `${h.hora}h`),
      datasets: [{
        label: 'Pedidos',
        data: horariosRelevantes.map(h => h.quantidade),
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderRadius: 4
      }]
    }
  }, [dados])

  // Componente de indicador de variação
  const IndicadorVariacao = ({ valor }: { valor: number }) => {
    if (valor === 0) {
      return <Minus className="w-4 h-4 text-zinc-400" />
    }
    if (valor > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
          <ArrowUp className="w-4 h-4" />
          {valor.toFixed(1)}%
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
        <ArrowDown className="w-4 h-4" />
        {Math.abs(valor).toFixed(1)}%
      </span>
    )
  }

  if (carregando) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            <p className="text-zinc-600 dark:text-zinc-400">Carregando análise do dia...</p>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6 pb-8">
          {/* Header com navegação de data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-7 h-7 text-amber-600" />
                Análise Diária
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                Visão detalhada do desempenho do dia
              </p>
            </div>

            {/* Navegador de data */}
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 rounded-xl p-2 border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={irParaDiaAnterior}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
              
              <button
                onClick={irParaHoje}
                className="px-4 py-2 min-w-[180px] text-center font-medium text-zinc-900 dark:text-white
                         hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors capitalize"
              >
                {dataFormatada}
              </button>
              
              <button
                onClick={irParaProximoDia}
                disabled={isToday(dataSelecionada)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Cards principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Faturamento */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <IndicadorVariacao valor={dados?.comparacaoOntem.faturamento || 0} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                R$ {(dados?.faturamentoTotal || 0).toFixed(2)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Faturamento</p>
            </motion.div>

            {/* Total de Pedidos */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <IndicadorVariacao valor={dados?.comparacaoOntem.pedidos || 0} />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dados?.totalPedidos || 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Pedidos</p>
            </motion.div>

            {/* Ticket Médio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                R$ {(dados?.ticketMedio || 0).toFixed(2)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Ticket Médio</p>
            </motion.div>

            {/* Entregas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dados?.pedidosPorTipo.entregas.quantidade || 0}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Entregas</p>
            </motion.div>
          </div>

          {/* Pedidos por Tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Entregas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="font-semibold">Entregas</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold">{dados?.pedidosPorTipo.entregas.quantidade || 0}</p>
                  <p className="text-purple-200 text-sm">pedidos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {(dados?.pedidosPorTipo.entregas.total || 0).toFixed(2)}</p>
                  <p className="text-purple-200 text-sm">faturamento</p>
                </div>
              </div>
            </motion.div>

            {/* Retiradas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <span className="font-semibold">Retiradas</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold">{dados?.pedidosPorTipo.retiradas.quantidade || 0}</p>
                  <p className="text-amber-200 text-sm">pedidos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {(dados?.pedidosPorTipo.retiradas.total || 0).toFixed(2)}</p>
                  <p className="text-amber-200 text-sm">faturamento</p>
                </div>
              </div>
            </motion.div>

            {/* Local */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Store className="w-5 h-5" />
                </div>
                <span className="font-semibold">No Local</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold">{dados?.pedidosPorTipo.local.quantidade || 0}</p>
                  <p className="text-blue-200 text-sm">pedidos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">R$ {(dados?.pedidosPorTipo.local.total || 0).toFixed(2)}</p>
                  <p className="text-blue-200 text-sm">faturamento</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Gráficos e Listas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formas de Pagamento */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800"
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Formas de Pagamento
              </h3>

              {dados?.faturamentoPorPagamento && dados.faturamentoPorPagamento.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Gráfico */}
                  <div className="h-48">
                    {dadosGraficoPagamentos && (
                      <Doughnut
                        data={dadosGraficoPagamentos}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false }
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Lista */}
                  <div className="space-y-2">
                    {dados.faturamentoPorPagamento.map((pag) => {
                      const config = FORMAS_PAGAMENTO_CONFIG[pag.forma]
                      const Icone = config?.icone || Wallet
                      return (
                        <div key={pag.forma} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${config?.bgCor || 'bg-zinc-200'}`}>
                              <Icone className={`w-4 h-4 ${config?.cor || 'text-zinc-600'}`} />
                            </div>
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {config?.nome || pag.forma}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">
                              R$ {pag.total.toFixed(2)}
                            </p>
                            <p className="text-xs text-zinc-500">{pag.quantidade} pedidos</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  Nenhum pagamento registrado
                </div>
              )}
            </motion.div>

            {/* Horários de Pico */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800"
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Pedidos por Horário
              </h3>

              {dadosGraficoHorarios && dadosGraficoHorarios.labels.length > 0 ? (
                <div className="h-64">
                  <Bar
                    data={dadosGraficoHorarios}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { stepSize: 1 }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  Nenhum pedido registrado
                </div>
              )}
            </motion.div>
          </div>

          {/* Produtos Mais Vendidos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800"
          >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              Produtos Mais Vendidos
            </h3>

            {dados?.produtosMaisVendidos && dados.produtosMaisVendidos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {dados.produtosMaisVendidos.map((produto, index) => (
                  <div
                    key={produto.nome}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                      ${index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-zinc-400' : index === 2 ? 'bg-amber-700' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-white truncate">
                        {produto.nome}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {produto.quantidade}x • R$ {produto.receita.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                Nenhum produto vendido
              </div>
            )}
          </motion.div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
