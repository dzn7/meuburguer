'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Truck, MapPin, Clock, User, Phone, DollarSign, CheckCircle2,
  XCircle, Play, RefreshCw, BarChart3, Calendar, TrendingUp,
  Package, Timer, Route, Users
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
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
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import ModalNotificacao from '@/components/ModalNotificacao'
import { useEntregas } from '@/lib/useEntregas'
import type { StatusEntrega } from '@/lib/tipos-entregas'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, Filler
)

type Periodo = '7dias' | '30dias' | 'mes' | 'semana' | 'hoje'
type Aba = 'entregas' | 'relatorios'

const statusConfig: Record<StatusEntrega, { label: string; cor: string; bg: string }> = {
  pendente: { label: 'Pendente', cor: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  em_rota: { label: 'Em Rota', cor: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  entregue: { label: 'Entregue', cor: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  cancelada: { label: 'Cancelada', cor: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
}

export default function EntregasPage() {
  const {
    entregas, entregadores, estatisticas, carregando, notificacao,
    carregarDados, atualizarStatusEntrega, excluirEntrega, mostrarNotificacao, fecharNotificacao
  } = useEntregas()

  const [abaAtiva, setAbaAtiva] = useState<Aba>('entregas')
  const [periodo, setPeriodo] = useState<Periodo>('7dias')
  const [filtroStatus, setFiltroStatus] = useState<StatusEntrega | 'todos'>('todos')

  // Calcular datas do período
  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = new Date()
    let inicio: Date
    let fim: Date = hoje

    switch (periodo) {
      case 'hoje':
        inicio = new Date(hoje.setHours(0, 0, 0, 0))
        fim = new Date()
        break
      case '7dias':
        inicio = subDays(hoje, 7)
        break
      case '30dias':
        inicio = subDays(hoje, 30)
        break
      case 'mes':
        inicio = startOfMonth(hoje)
        fim = endOfMonth(hoje)
        break
      case 'semana':
        inicio = startOfWeek(hoje, { locale: ptBR })
        fim = endOfWeek(hoje, { locale: ptBR })
        break
      default:
        inicio = subDays(hoje, 7)
    }

    return { dataInicio: inicio, dataFim: fim }
  }, [periodo])

  // Filtrar entregas por período
  const entregasFiltradas = useMemo(() => {
    return entregas.filter(e => {
      const dataEntrega = new Date(e.created_at)
      const dentroPerido = isWithinInterval(dataEntrega, { start: dataInicio, end: dataFim })
      const statusOk = filtroStatus === 'todos' || e.status === filtroStatus
      return dentroPerido && statusOk
    })
  }, [entregas, dataInicio, dataFim, filtroStatus])

  // Estatísticas do período
  const estatisticasPeriodo = useMemo(() => {
    const concluidas = entregasFiltradas.filter(e => e.status === 'entregue')
    const temposReais = concluidas.filter(e => e.tempo_real).map(e => e.tempo_real!)
    
    return {
      total: entregasFiltradas.length,
      pendentes: entregasFiltradas.filter(e => e.status === 'pendente').length,
      emRota: entregasFiltradas.filter(e => e.status === 'em_rota').length,
      concluidas: concluidas.length,
      canceladas: entregasFiltradas.filter(e => e.status === 'cancelada').length,
      tempoMedio: temposReais.length > 0 
        ? Math.round(temposReais.reduce((a, b) => a + b, 0) / temposReais.length) 
        : 0,
      totalTaxas: entregasFiltradas.reduce((acc, e) => acc + (e.taxa_entrega || 0), 0),
      taxaSucesso: entregasFiltradas.length > 0 
        ? Math.round((concluidas.length / entregasFiltradas.length) * 100) 
        : 0
    }
  }, [entregasFiltradas])

  // Dados para gráfico de entregas por dia
  const dadosEntregasDia = useMemo(() => {
    const dias = eachDayOfInterval({ start: dataInicio, end: dataFim })
    
    const entregasPorDia = dias.map(dia => {
      return entregasFiltradas.filter(e => {
        const dataE = new Date(e.created_at)
        return format(dataE, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd') && e.status === 'entregue'
      }).length
    })

    return {
      labels: dias.map(d => format(d, 'dd/MM', { locale: ptBR })),
      datasets: [{
        label: 'Entregas',
        data: entregasPorDia,
        backgroundColor: '#22c55e',
        borderRadius: 6
      }]
    }
  }, [entregasFiltradas, dataInicio, dataFim])

  // Dados para gráfico de entregas por entregador
  const dadosPorEntregador = useMemo(() => {
    const porEntregador: Record<string, number> = {}
    
    entregasFiltradas.filter(e => e.status === 'entregue' && e.entregador).forEach(e => {
      const nome = e.entregador?.nome || 'Sem entregador'
      porEntregador[nome] = (porEntregador[nome] || 0) + 1
    })

    const sorted = Object.entries(porEntregador).sort((a, b) => b[1] - a[1])

    return {
      labels: sorted.map(([nome]) => nome),
      datasets: [{
        label: 'Entregas',
        data: sorted.map(([, qtd]) => qtd),
        backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
        borderRadius: 6
      }]
    }
  }, [entregasFiltradas])

  // Dados para gráfico de status
  const dadosStatus = useMemo(() => {
    return {
      labels: ['Pendentes', 'Em Rota', 'Entregues', 'Canceladas'],
      datasets: [{
        data: [
          estatisticasPeriodo.pendentes,
          estatisticasPeriodo.emRota,
          estatisticasPeriodo.concluidas,
          estatisticasPeriodo.canceladas
        ],
        backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'],
        borderWidth: 0
      }]
    }
  }, [estatisticasPeriodo])

  // Dados para gráfico de tempo médio por dia
  const dadosTempoMedio = useMemo(() => {
    const dias = eachDayOfInterval({ start: dataInicio, end: dataFim })
    
    const tempoPorDia = dias.map(dia => {
      const entregasDia = entregasFiltradas.filter(e => {
        const dataE = new Date(e.created_at)
        return format(dataE, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd') && e.tempo_real
      })
      if (entregasDia.length === 0) return 0
      return Math.round(entregasDia.reduce((acc, e) => acc + (e.tempo_real || 0), 0) / entregasDia.length)
    })

    return {
      labels: dias.map(d => format(d, 'dd/MM', { locale: ptBR })),
      datasets: [{
        label: 'Tempo Médio (min)',
        data: tempoPorDia,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    }
  }, [entregasFiltradas, dataInicio, dataFim])

  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  }

  const opcoesPizza = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' as const } }
  }

  const confirmarExclusao = (id: string) => {
    mostrarNotificacao('confirmacao', 'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta entrega?',
      () => excluirEntrega(id)
    )
  }

  if (carregando) {
    return (
      <ProtectedRoute><AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <RefreshCw className="w-10 h-10 text-green-600 animate-spin" />
          <p className="text-zinc-600 dark:text-zinc-400">Carregando entregas...</p>
        </div>
      </AdminLayout></ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute><AdminLayout>
      <div className="space-y-4 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Truck className="w-6 h-6 text-green-600 flex-shrink-0" />
                Entregas
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                Gerenciamento de entregas
              </p>
            </div>
            <button onClick={carregarDados} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <RefreshCw className="w-4 h-4 text-zinc-600" />
            </button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-zinc-500">Pendentes</span>
            </div>
            <p className="text-lg font-bold text-amber-600">{estatisticas.entregasPendentes}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-zinc-500">Em Rota</span>
            </div>
            <p className="text-lg font-bold text-blue-600">{estatisticas.entregasEmRota}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-zinc-500">Concluídas</span>
            </div>
            <p className="text-lg font-bold text-green-600">{estatisticas.entregasConcluidas}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-zinc-500">Tempo Médio</span>
            </div>
            <p className="text-lg font-bold text-purple-600">{estatisticas.tempoMedioEntrega} min</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button 
            onClick={() => setAbaAtiva('entregas')} 
            className={`flex-1 px-3 py-2.5 font-medium text-sm transition-colors relative ${abaAtiva === 'entregas' ? 'text-green-600' : 'text-zinc-600'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <Truck className="w-4 h-4" />
              Entregas
            </span>
            {abaAtiva === 'entregas' && <motion.div layoutId="tabEntregas" className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
          </button>
          <button 
            onClick={() => setAbaAtiva('relatorios')} 
            className={`flex-1 px-3 py-2.5 font-medium text-sm transition-colors relative ${abaAtiva === 'relatorios' ? 'text-green-600' : 'text-zinc-600'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </span>
            {abaAtiva === 'relatorios' && <motion.div layoutId="tabEntregas" className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {abaAtiva === 'entregas' ? (
            <motion.div key="entregas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Filtro de Status */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {(['todos', 'pendente', 'em_rota', 'entregue', 'cancelada'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFiltroStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      filtroStatus === status
                        ? 'bg-green-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {status === 'todos' ? 'Todos' : statusConfig[status].label}
                  </button>
                ))}
              </div>

              {/* Lista de Entregas */}
              {entregasFiltradas.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                  <Truck className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                  <p className="text-zinc-600 dark:text-zinc-400">Nenhuma entrega encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entregasFiltradas.slice(0, 20).map((entrega, i) => (
                    <motion.div
                      key={entrega.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {entrega.pedido?.nome_cliente || 'Cliente'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[entrega.status].bg} ${statusConfig[entrega.status].cor}`}>
                              {statusConfig[entrega.status].label}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                            {entrega.pedido?.telefone || '-'}
                          </p>
                        </div>
                        <p className="font-bold text-green-600 whitespace-nowrap">
                          R$ {entrega.pedido?.total?.toFixed(2) || '0.00'}
                        </p>
                      </div>

                      {(entrega.endereco_entrega || entrega.pedido?.endereco) && (
                        <div className="flex items-start gap-2 text-xs text-zinc-500 mb-2">
                          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="truncate">{entrega.endereco_entrega || entrega.pedido?.endereco}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          {entrega.entregador && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entrega.entregador.nome}
                            </span>
                          )}
                          {entrega.tempo_real && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {entrega.tempo_real} min
                            </span>
                          )}
                          {entrega.taxa_entrega > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              R$ {entrega.taxa_entrega.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1">
                          {entrega.status === 'pendente' && (
                            <button
                              onClick={() => atualizarStatusEntrega(entrega.id, 'em_rota')}
                              className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"
                              title="Iniciar Entrega"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {entrega.status === 'em_rota' && (
                            <button
                              onClick={() => atualizarStatusEntrega(entrega.id, 'entregue')}
                              className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"
                              title="Marcar como Entregue"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(entrega.status === 'pendente' || entrega.status === 'em_rota') && (
                            <button
                              onClick={() => atualizarStatusEntrega(entrega.id, 'cancelada')}
                              className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                              title="Cancelar"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="relatorios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Filtro de Período */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Período:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { valor: 'hoje', label: 'Hoje' },
                    { valor: '7dias', label: '7 dias' },
                    { valor: '30dias', label: '30 dias' },
                    { valor: 'semana', label: 'Semana' },
                    { valor: 'mes', label: 'Mês' }
                  ].map(p => (
                    <button
                      key={p.valor}
                      onClick={() => setPeriodo(p.valor as Periodo)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        periodo === p.valor
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })} até {format(dataFim, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              {/* Cards de Estatísticas do Período */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-zinc-500">Total</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">{estatisticasPeriodo.total}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-zinc-500">Taxa Sucesso</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{estatisticasPeriodo.taxaSucesso}%</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-zinc-500">Tempo Médio</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600">{estatisticasPeriodo.tempoMedio} min</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-zinc-500">Total Taxas</span>
                  </div>
                  <p className="text-lg font-bold text-amber-600">R$ {estatisticasPeriodo.totalTaxas.toFixed(2)}</p>
                </div>
              </div>

              {/* Gráficos */}
              <div className="space-y-3">
                {/* Entregas por Dia */}
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Entregas por Dia</h3>
                  <div className="h-40">
                    <Bar data={dadosEntregasDia} options={opcoesGrafico} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Por Entregador */}
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Por Entregador</h3>
                    <div className="h-32">
                      {dadosPorEntregador.labels.length > 0 ? (
                        <Bar data={dadosPorEntregador} options={opcoesGrafico} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                          Sem dados
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Por Status</h3>
                    <div className="h-32">
                      <Doughnut data={dadosStatus} options={opcoesPizza} />
                    </div>
                  </div>
                </div>

                {/* Tempo Médio por Dia */}
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Tempo Médio por Dia</h3>
                  <div className="h-40">
                    <Line data={dadosTempoMedio} options={{ ...opcoesGrafico, plugins: { legend: { display: true } } }} />
                  </div>
                </div>
              </div>

              {/* Ranking de Entregadores */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    Ranking de Entregadores
                  </h3>
                </div>
                {dadosPorEntregador.labels.length > 0 ? (
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {dadosPorEntregador.labels.map((nome, i) => (
                      <div key={nome} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-amber-100 text-amber-700' :
                            i === 1 ? 'bg-zinc-200 text-zinc-700' :
                            i === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-medium text-zinc-900 dark:text-white text-sm">{nome}</span>
                        </div>
                        <span className="font-bold text-green-600">{dadosPorEntregador.datasets[0].data[i]} entregas</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-zinc-500 text-sm">
                    Nenhum entregador com entregas no período
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de Notificação */}
      <ModalNotificacao
        aberto={!!notificacao}
        tipo={notificacao?.tipo || 'info'}
        titulo={notificacao?.titulo || ''}
        mensagem={notificacao?.mensagem || ''}
        onFechar={fecharNotificacao}
        onConfirmar={notificacao?.onConfirm}
      />
    </AdminLayout></ProtectedRoute>
  )
}
