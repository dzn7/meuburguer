'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  FileText,
  RefreshCw,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
  Truck,
  Store,
  Package,
  MapPin
} from 'lucide-react'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { gerarPdfRelatorios } from '@/lib/gerarPdfRelatorios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

type DadosRelatorio = {
  vendasPorDia: { data: string; total: number; quantidade: number }[]
  produtosMaisVendidos: { nome: string; quantidade: number; receita: number }[]
  vendasPorCategoria: { categoria: string; quantidade: number; receita: number }[]
  estatisticas: {
    receitaTotal: number
    pedidosTotal: number
    ticketMedio: number
    crescimento: number
  }
  horariosPico: { hora: number; quantidade: number }[]
  faturamentoPorPagamento: { forma: string; total: number; quantidade: number }[]
  // Estatísticas por tipo de pedido
  pedidosPorTipo: {
    entregas: { total: number; quantidade: number }
    retiradas: { total: number; quantidade: number }
    local: { total: number; quantidade: number }
  }
  // Entregas por período
  entregasPorPeriodo: {
    hoje: number
    semana: number
    mes: number
  }
}

type FormaPagamentoConfig = { nome: string; icone: typeof Banknote; cor: string; bgCor: string; chartCor: string }

const FORMAS_PAGAMENTO_CONFIG: Record<string, FormaPagamentoConfig> = {
  dinheiro: { nome: 'Dinheiro', icone: Banknote, cor: 'text-green-600', bgCor: 'bg-green-100 dark:bg-green-900/30', chartCor: 'rgba(34, 197, 94, 0.8)' },
  pix: { nome: 'PIX', icone: Smartphone, cor: 'text-purple-600', bgCor: 'bg-purple-100 dark:bg-purple-900/30', chartCor: 'rgba(168, 85, 247, 0.8)' },
  credito: { nome: 'Crédito', icone: CreditCard, cor: 'text-blue-600', bgCor: 'bg-blue-100 dark:bg-blue-900/30', chartCor: 'rgba(59, 130, 246, 0.8)' },
  debito: { nome: 'Débito', icone: CreditCard, cor: 'text-amber-600', bgCor: 'bg-amber-100 dark:bg-amber-900/30', chartCor: 'rgba(245, 158, 11, 0.8)' },
  vale_refeicao: { nome: 'Vale Refeição', icone: Wallet, cor: 'text-red-600', bgCor: 'bg-red-100 dark:bg-red-900/30', chartCor: 'rgba(239, 68, 68, 0.8)' },
}

export default function RelatoriosPage() {
  const [dados, setDados] = useState<DadosRelatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(7) // dias
  const hoje = new Date()
  const [dataInicio, setDataInicio] = useState(format(subDays(hoje, 7), 'yyyy-MM-dd'))
  const [dataFim, setDataFim] = useState(format(hoje, 'yyyy-MM-dd'))

  useEffect(() => {
    carregarDados()

    // Configurar Realtime para atualizar automaticamente
    const channel = supabase
      .channel('relatorios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        console.log('[Relatórios] Pedido atualizado - recarregando dados')
        carregarDados()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos_pedido' }, () => {
        console.log('[Relatórios] Pagamento atualizado - recarregando dados')
        carregarDados()
      })
      .subscribe((status) => {
        console.log('[Relatórios] Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim])

  const carregarDados = async () => {
    setLoading(true)
    try {
      // Criar datas no timezone local e converter para ISO
      const inicio = new Date(dataInicio + 'T00:00:00')
      const fim = new Date(dataFim + 'T23:59:59.999')
      
      const inicioStr = inicio.toISOString()
      const fimStr = fim.toISOString()

      console.log('[Relatórios] Buscando pedidos de', dataInicio, 'até', dataFim)
      console.log('[Relatórios] Range ISO:', inicioStr, 'até', fimStr)

      // Buscar pedidos do período
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('*')
        .gte('created_at', inicioStr)
        .lte('created_at', fimStr)
        .order('created_at', { ascending: true })

      if (pedidosError) {
        console.error('[Relatórios] Erro ao buscar pedidos:', pedidosError)
        throw pedidosError
      }

      console.log('[Relatórios] Pedidos encontrados:', pedidos?.length || 0)

      // Buscar itens de cada pedido
      const pedidosComItens = await Promise.all(
        (pedidos || []).map(async (pedido) => {
          const { data: itens } = await supabase
            .from('itens_pedido')
            .select('*')
            .eq('pedido_id', pedido.id)
          
          return { ...pedido, itens_pedido: itens || [] }
        })
      )

      console.log('[Relatórios] Pedidos com itens:', pedidosComItens)

      // Processar dados
      const vendasPorDia = processarVendasPorDia(pedidosComItens || [])
      const produtosMaisVendidos = await processarProdutosMaisVendidos(pedidosComItens || [])
      const vendasPorCategoria = await processarVendasPorCategoria(pedidosComItens || [])
      const estatisticas = calcularEstatisticas(pedidosComItens || [])
      const horariosPico = processarHorariosPico(pedidosComItens || [])
      const faturamentoPorPagamento = await processarFaturamentoPorPagamento(inicioStr, fimStr)
      const pedidosPorTipo = processarPedidosPorTipo(pedidosComItens || [])
      const entregasPorPeriodo = await calcularEntregasPorPeriodo()

      console.log('[Relatórios] Estatísticas:', estatisticas)
      console.log('[Relatórios] Pedidos por tipo:', pedidosPorTipo)

      setDados({
        vendasPorDia,
        produtosMaisVendidos,
        vendasPorCategoria,
        estatisticas,
        horariosPico,
        faturamentoPorPagamento,
        pedidosPorTipo,
        entregasPorPeriodo
      })
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    } finally {
      setLoading(false)
    }
  }

  const processarVendasPorDia = (pedidos: any[]) => {
    const vendas: { [key: string]: { total: number; quantidade: number } } = {}

    pedidos.forEach(pedido => {
      const data = format(new Date(pedido.created_at), 'dd/MM')
      if (!vendas[data]) {
        vendas[data] = { total: 0, quantidade: 0 }
      }
      vendas[data].total += pedido.total
      vendas[data].quantidade += 1
    })

    return Object.entries(vendas).map(([data, valores]) => ({
      data,
      ...valores
    }))
  }

  const processarProdutosMaisVendidos = async (pedidos: any[]) => {
    const produtos: { [key: string]: { quantidade: number; receita: number } } = {}

    pedidos.forEach(pedido => {
      pedido.itens_pedido?.forEach((item: any) => {
        const nome = item.produto_nome || item.nome_produto || 'Produto'
        if (!produtos[nome]) {
          produtos[nome] = { quantidade: 0, receita: 0 }
        }
        produtos[nome].quantidade += item.quantidade
        produtos[nome].receita += item.subtotal
      })
    })

    return Object.entries(produtos)
      .map(([nome, valores]) => ({ nome, ...valores }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)
  }

  const processarVendasPorCategoria = async (pedidos: any[]) => {
    const categorias: { [key: string]: { quantidade: number; receita: number } } = {}

    // Buscar produtos para mapear categorias
    const { data: produtos } = await supabase.from('produtos').select('nome, categoria')

    const mapaCategorias: { [key: string]: string } = {}
    produtos?.forEach(p => {
      mapaCategorias[p.nome] = p.categoria
    })

    pedidos.forEach(pedido => {
      pedido.itens_pedido?.forEach((item: any) => {
        const nome = item.produto_nome || item.nome_produto || 'Produto'
        const categoria = mapaCategorias[nome] || 'Outros'
        
        if (!categorias[categoria]) {
          categorias[categoria] = { quantidade: 0, receita: 0 }
        }
        categorias[categoria].quantidade += item.quantidade
        categorias[categoria].receita += item.subtotal
      })
    })

    return Object.entries(categorias).map(([categoria, valores]) => ({
      categoria,
      ...valores
    }))
  }

  const calcularEstatisticas = (pedidos: any[]) => {
    const receitaTotal = pedidos.reduce((sum, p) => sum + p.total, 0)
    const pedidosTotal = pedidos.length
    const ticketMedio = pedidosTotal > 0 ? receitaTotal / pedidosTotal : 0

    // Calcular crescimento (comparar com período anterior)
    const metadePeriodo = Math.floor(pedidos.length / 2)
    const primeiraMetade = pedidos.slice(0, metadePeriodo)
    const segundaMetade = pedidos.slice(metadePeriodo)
    
    const receitaPrimeira = primeiraMetade.reduce((sum, p) => sum + p.total, 0)
    const receitaSegunda = segundaMetade.reduce((sum, p) => sum + p.total, 0)
    
    const crescimento = receitaPrimeira > 0 
      ? ((receitaSegunda - receitaPrimeira) / receitaPrimeira) * 100 
      : 0

    return { receitaTotal, pedidosTotal, ticketMedio, crescimento }
  }

  const processarHorariosPico = (pedidos: any[]) => {
    const horarios: { [key: number]: number } = {}

    pedidos.forEach(pedido => {
      const hora = new Date(pedido.created_at).getHours()
      horarios[hora] = (horarios[hora] || 0) + 1
    })

    return Object.entries(horarios)
      .map(([hora, quantidade]) => ({ hora: Number(hora), quantidade }))
      .sort((a, b) => a.hora - b.hora)
  }

  // Processar pedidos por tipo (entrega, retirada, local)
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

  // Calcular entregas por período (hoje, semana, mês)
  const calcularEntregasPorPeriodo = async () => {
    const agora = new Date()
    
    // Início de hoje
    const inicioHoje = new Date(agora)
    inicioHoje.setHours(0, 0, 0, 0)
    
    // Início da semana (domingo)
    const inicioSemana = new Date(agora)
    inicioSemana.setDate(agora.getDate() - agora.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    
    // Início do mês
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    inicioMes.setHours(0, 0, 0, 0)

    // Buscar de duas fontes: tabela entregas E tabela pedidos
    const [entregasRes, pedidosRes] = await Promise.all([
      // 1. Tabela entregas (entregas registradas no sistema de entregas)
      supabase
        .from('entregas')
        .select('id, created_at, pedido_id')
        .eq('status', 'entregue'),
      
      // 2. Tabela pedidos (pedidos com tipo_entrega = 'entrega' e status = 'entregue')
      supabase
        .from('pedidos')
        .select('id, created_at')
        .eq('tipo_entrega', 'entrega')
        .eq('status', 'entregue')
    ])

    // Usar Set para evitar duplicatas (pedido pode estar nas duas tabelas)
    const entregasUnicas = new Map<string, Date>()

    // Adicionar entregas da tabela entregas
    if (entregasRes.data) {
      entregasRes.data.forEach((e: any) => {
        const id = e.pedido_id || e.id
        entregasUnicas.set(id, new Date(e.created_at))
      })
    }

    // Adicionar pedidos de entrega (se não existir ainda)
    if (pedidosRes.data) {
      pedidosRes.data.forEach((p: any) => {
        if (!entregasUnicas.has(p.id)) {
          entregasUnicas.set(p.id, new Date(p.created_at))
        }
      })
    }

    let hoje = 0, semana = 0, mes = 0

    entregasUnicas.forEach((dataEntrega) => {
      if (dataEntrega >= inicioHoje) {
        hoje++
      }
      if (dataEntrega >= inicioSemana) {
        semana++
      }
      if (dataEntrega >= inicioMes) {
        mes++
      }
    })

    return { hoje, semana, mes }
  }

  const processarFaturamentoPorPagamento = async (inicioStr: string, fimStr: string) => {
    const agrupado: Record<string, { total: number; quantidade: number }> = {}

    // Função para normalizar forma de pagamento
    const normalizarForma = (formaPagamento: string): string => {
      let forma = formaPagamento?.toLowerCase() || 'outros'
      
      // Mapear formas antigas para novas
      if (forma === 'cartão' || forma === 'cartao' || forma === 'cartão de crédito' || forma === 'cartao de credito' || forma === 'credito') {
        return 'credito'
      } else if (forma === 'cartão de débito' || forma === 'cartao de debito' || forma === 'debito') {
        return 'debito'
      } else if (forma === 'vale refeição' || forma === 'vale refeicao') {
        return 'vale_refeicao'
      } else if (forma === 'pix') {
        return 'pix'
      } else if (forma === 'dinheiro') {
        return 'dinheiro'
      }
      return forma
    }

    // 1. Buscar pagamentos da tabela pagamentos_pedido (novos pedidos com pagamento dividido)
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

    // 2. Buscar pedidos que NÃO têm pagamento dividido (usar forma_pagamento da tabela pedidos)
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, forma_pagamento, total')
      .gte('created_at', inicioStr)
      .lte('created_at', fimStr)
      .neq('status', 'cancelado')

    if (pedidos && pedidos.length > 0) {
      pedidos.forEach((pedido: any) => {
        // Ignorar pedidos que já têm pagamento dividido
        if (pedidosComPagamentoDividido.has(pedido.id)) return
        // Ignorar pedidos marcados como "Dividido"
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

  const exportarPDF = () => {
    if (!dados) return
    gerarPdfRelatorios(dados, dataInicio, dataFim, 'Meu Burguer')
  }

  const aplicarPeriodoRapido = (dias: number) => {
    setPeriodo(dias)
    const agora = new Date()
    setDataInicio(format(subDays(agora, dias), 'yyyy-MM-dd'))
    setDataFim(format(agora, 'yyyy-MM-dd'))
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex flex-col items-center justify-center h-screen gap-4">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            <p className="text-zinc-600 dark:text-zinc-400">Carregando relatórios...</p>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  if (!dados) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex flex-col items-center justify-center h-screen gap-4">
            <p className="text-zinc-600 dark:text-zinc-400">Nenhum dado disponível</p>
            <button
              onClick={carregarDados}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
            >
              Tentar Novamente
            </button>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-amber-600" />
                Relatórios e Analytics
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Análise completa de vendas e desempenho
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportarPDF}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 
                         text-white rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Exportar PDF
              </button>
              <button
                onClick={carregarDados}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 
                         text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Período Rápido
                </label>
                <div className="flex gap-2">
                  {[7, 15, 30, 90].map(dias => (
                    <button
                      key={dias}
                      onClick={() => aplicarPeriodoRapido(dias)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        periodo === dias
                          ? 'bg-amber-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {dias} dias
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                           dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                           dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8" />
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  Total
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                R$ {dados.estatisticas.receitaTotal.toFixed(2)}
              </h3>
              <p className="text-green-100 text-sm">Receita Total</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <ShoppingCart className="w-8 h-8" />
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  Pedidos
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                {dados.estatisticas.pedidosTotal}
              </h3>
              <p className="text-blue-100 text-sm">Total de Pedidos</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white"
            >
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8" />
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  Média
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                R$ {dados.estatisticas.ticketMedio.toFixed(2)}
              </h3>
              <p className="text-amber-100 text-sm">Ticket Médio</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-gradient-to-br ${
                dados.estatisticas.crescimento >= 0
                  ? 'from-purple-500 to-purple-600'
                  : 'from-red-500 to-red-600'
              } rounded-xl p-6 text-white`}
            >
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8" />
                <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  Período
                </span>
              </div>
              <h3 className="text-3xl font-bold mb-1">
                {dados.estatisticas.crescimento >= 0 ? '+' : ''}
                {dados.estatisticas.crescimento.toFixed(1)}%
              </h3>
              <p className="text-purple-100 text-sm">Crescimento</p>
            </motion.div>
          </div>

          {/* Estatísticas por Tipo de Pedido e Entregas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pedidos por Tipo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                Pedidos por Tipo
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Entregas */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{dados.pedidosPorTipo.entregas.quantidade}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Entregas</p>
                  <p className="text-sm font-medium text-green-600 mt-1">
                    R$ {dados.pedidosPorTipo.entregas.total.toFixed(2)}
                  </p>
                </div>

                {/* Retiradas */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{dados.pedidosPorTipo.retiradas.quantidade}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Retiradas</p>
                  <p className="text-sm font-medium text-blue-600 mt-1">
                    R$ {dados.pedidosPorTipo.retiradas.total.toFixed(2)}
                  </p>
                </div>

                {/* Local */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Store className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{dados.pedidosPorTipo.local.quantidade}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">No Local</p>
                  <p className="text-sm font-medium text-purple-600 mt-1">
                    R$ {dados.pedidosPorTipo.local.total.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Gráfico de Pizza */}
              <div className="h-48 mt-4">
                <Doughnut
                  data={{
                    labels: ['Entregas', 'Retiradas', 'No Local'],
                    datasets: [{
                      data: [
                        dados.pedidosPorTipo.entregas.quantidade,
                        dados.pedidosPorTipo.retiradas.quantidade,
                        dados.pedidosPorTipo.local.quantidade
                      ],
                      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(168, 85, 247, 0.8)'],
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </div>
            </motion.div>

            {/* Entregas por Período */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-600" />
                Entregas Realizadas
              </h3>
              <div className="space-y-4">
                {/* Hoje */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">Hoje</p>
                      <p className="text-xs text-zinc-500">Entregas concluídas</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{dados.entregasPorPeriodo.hoje}</p>
                </div>

                {/* Semana */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">Esta Semana</p>
                      <p className="text-xs text-zinc-500">Desde domingo</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{dados.entregasPorPeriodo.semana}</p>
                </div>

                {/* Mês */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">Este Mês</p>
                      <p className="text-xs text-zinc-500">Desde o dia 1</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{dados.entregasPorPeriodo.mes}</p>
                </div>
              </div>

              {/* Média diária */}
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">Média diária (mês)</span>
                  <span className="font-bold text-amber-600">
                    {dados.entregasPorPeriodo.mes > 0 
                      ? (dados.entregasPorPeriodo.mes / new Date().getDate()).toFixed(1)
                      : '0'
                    } entregas/dia
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Vendas por Dia */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Vendas por Dia
              </h3>
              <Bar
                data={{
                  labels: dados.vendasPorDia.map(v => v.data),
                  datasets: [
                    {
                      label: 'Receita (R$)',
                      data: dados.vendasPorDia.map(v => v.total),
                      backgroundColor: 'rgba(245, 158, 11, 0.8)',
                      borderColor: 'rgba(245, 158, 11, 1)',
                      borderWidth: 2,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `R$ ${(context.parsed.y || 0).toFixed(2)}`
                      }
                    }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>

            {/* Horários de Pico */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Horários de Pico
              </h3>
              <Line
                data={{
                  labels: dados.horariosPico.map(h => `${h.hora}h`),
                  datasets: [
                    {
                      label: 'Pedidos',
                      data: dados.horariosPico.map(h => h.quantidade),
                      borderColor: 'rgba(59, 130, 246, 1)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      fill: true,
                      tension: 0.4,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>
          </div>

          {/* Faturamento por Forma de Pagamento */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Faturamento por Forma de Pagamento
            </h3>
            
            {dados.faturamentoPorPagamento.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {dados.faturamentoPorPagamento.map((item) => {
                  const config = FORMAS_PAGAMENTO_CONFIG[item.forma] || { 
                    nome: item.forma, 
                    icone: CreditCard, 
                    cor: 'text-zinc-600', 
                    bgCor: 'bg-zinc-100 dark:bg-zinc-800',
                    chartCor: 'rgba(113, 113, 122, 0.8)'
                  }
                  const Icone = config.icone
                  const percentual = dados.estatisticas.receitaTotal > 0 
                    ? (item.total / dados.estatisticas.receitaTotal * 100).toFixed(1) 
                    : '0'
                  
                  return (
                    <motion.div
                      key={item.forma}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`${config.bgCor} rounded-xl p-4`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg bg-white dark:bg-zinc-900 ${config.cor}`}>
                          <Icone className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{config.nome}</p>
                          <p className="text-xs text-zinc-500">{item.quantidade} transações</p>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className={`text-2xl font-bold ${config.cor}`}>
                          R$ {item.total.toFixed(2)}
                        </p>
                        <span className="text-sm font-medium text-zinc-500">{percentual}%</span>
                      </div>
                      {/* Barra de progresso */}
                      <div className="mt-2 h-1.5 bg-white/50 dark:bg-zinc-900/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentual}%`,
                            backgroundColor: config.chartCor
                          }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum pagamento registrado no período</p>
              </div>
            )}

            {/* Gráfico de Pizza */}
            {dados.faturamentoPorPagamento.length > 0 && (
              <div className="h-64">
                <Doughnut
                  data={{
                    labels: dados.faturamentoPorPagamento.map(p => 
                      FORMAS_PAGAMENTO_CONFIG[p.forma]?.nome || p.forma
                    ),
                    datasets: [{
                      data: dados.faturamentoPorPagamento.map(p => p.total),
                      backgroundColor: dados.faturamentoPorPagamento.map(p => 
                        FORMAS_PAGAMENTO_CONFIG[p.forma]?.chartCor || 'rgba(113, 113, 122, 0.8)'
                      ),
                      borderWidth: 2,
                      borderColor: '#fff'
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const label = context.label || ''
                            const value = context.parsed || 0
                            return `${label}: R$ ${value.toFixed(2)}`
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtos Mais Vendidos */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Top 10 Produtos
              </h3>
              <div className="space-y-3">
                {dados.produtosMaisVendidos.map((produto, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-amber-100 dark:bg-amber-900/30 
                                     text-amber-600 dark:text-amber-400 rounded-full text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {produto.nome}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {produto.quantidade}x
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        R$ {produto.receita.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendas por Categoria */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Vendas por Categoria
              </h3>
              <Doughnut
                data={{
                  labels: dados.vendasPorCategoria.map(c => c.categoria),
                  datasets: [
                    {
                      data: dados.vendasPorCategoria.map(c => c.receita),
                      backgroundColor: [
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                      ],
                      borderWidth: 2,
                      borderColor: '#fff'
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const label = context.label || ''
                          const value = context.parsed || 0
                          return `${label}: R$ ${value.toFixed(2)}`
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
