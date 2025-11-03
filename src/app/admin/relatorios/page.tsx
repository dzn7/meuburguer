'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

      console.log('[Relatórios] Estatísticas:', estatisticas)
      console.log('[Relatórios] Vendas por dia:', vendasPorDia)

      setDados({
        vendasPorDia,
        produtosMaisVendidos,
        vendasPorCategoria,
        estatisticas,
        horariosPico
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

  const exportarPDF = () => {
    window.print()
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
                <Download className="w-4 h-4" />
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
