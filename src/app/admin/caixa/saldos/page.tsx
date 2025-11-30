'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wallet, TrendingUp, TrendingDown, Calendar, Download, 
  ArrowUpCircle, ArrowDownCircle, Clock, FileText, 
  ChevronLeft, ChevronRight, Filter, Search, Eye,
  DollarSign, CreditCard, Banknote, RefreshCw, Plus, Minus, X
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/admin/AdminLayout'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import Link from 'next/link'

type Caixa = {
  id: string
  data_abertura: string
  data_fechamento: string | null
  valor_abertura: number
  valor_fechamento: number | null
  total_entradas: number
  total_saidas: number
  saldo_esperado: number
  diferenca: number | null
  responsavel_abertura: string
  responsavel_fechamento: string | null
  status: 'aberto' | 'fechado'
  observacoes: string | null
}

type Movimentacao = {
  id: string
  caixa_id: string
  tipo: 'entrada' | 'saida'
  valor: number
  descricao: string | null
  forma_pagamento: string | null
  created_at: string
  categoria: { nome: string; cor: string; icone: string } | null
  funcionario: { nome: string } | null
}

type ResumoSaldos = {
  saldoAtual: number
  totalEntradas: number
  totalSaidas: number
  totalCaixasFechados: number
  mediaFaturamentoDiario: number
  maiorFaturamento: number
  menorFaturamento: number
}

export default function SaldosPage() {
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [resumo, setResumo] = useState<ResumoSaldos>({
    saldoAtual: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    totalCaixasFechados: 0,
    mediaFaturamentoDiario: 0,
    maiorFaturamento: 0,
    menorFaturamento: 0
  })
  const [carregando, setCarregando] = useState(true)
  const [periodoFiltro, setPeriodoFiltro] = useState<'7dias' | '30dias' | 'mes' | 'todos'>('30dias')
  const [caixaSelecionado, setCaixaSelecionado] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  
  // Modal de ajuste de saldo
  const [modalAjuste, setModalAjuste] = useState(false)
  const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'saida'>('entrada')
  const [valorAjuste, setValorAjuste] = useState('')
  const [descricaoAjuste, setDescricaoAjuste] = useState('')
  const [processandoAjuste, setProcessandoAjuste] = useState(false)
  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null)

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      // Calcular datas do filtro
      let dataInicio: Date | null = null
      const hoje = new Date()

      switch (periodoFiltro) {
        case '7dias':
          dataInicio = subDays(hoje, 7)
          break
        case '30dias':
          dataInicio = subDays(hoje, 30)
          break
        case 'mes':
          dataInicio = startOfMonth(hoje)
          break
        case 'todos':
          dataInicio = null
          break
      }

      // Buscar caixas
      let queryCaixas = supabase
        .from('caixas')
        .select('*')
        .order('data_abertura', { ascending: false })

      if (dataInicio) {
        queryCaixas = queryCaixas.gte('data_abertura', dataInicio.toISOString())
      }

      const { data: caixasData } = await queryCaixas

      // Buscar movimentações
      let queryMovs = supabase
        .from('movimentacoes_caixa')
        .select('*, categoria:categorias_caixa(*), funcionario:funcionarios(*)')
        .order('created_at', { ascending: false })

      if (dataInicio) {
        queryMovs = queryMovs.gte('created_at', dataInicio.toISOString())
      }

      const { data: movsData } = await queryMovs

      const caixasFormatados = (caixasData || []).map(c => ({
        ...c,
        valor_abertura: Number(c.valor_abertura),
        valor_fechamento: c.valor_fechamento ? Number(c.valor_fechamento) : null,
        total_entradas: Number(c.total_entradas || 0),
        total_saidas: Number(c.total_saidas || 0),
        saldo_esperado: Number(c.saldo_esperado || 0),
        diferenca: c.diferenca ? Number(c.diferenca) : null
      }))

      const movsFormatadas = (movsData || []).map(m => ({
        ...m,
        valor: Number(m.valor)
      }))

      setCaixas(caixasFormatados)
      setMovimentacoes(movsFormatadas)

      // Calcular resumo
      const caixasFechados = caixasFormatados.filter(c => c.status === 'fechado')
      const totalEntradas = movsFormatadas.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0)
      const totalSaidas = movsFormatadas.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.valor, 0)
      
      // Saldo atual = soma de todos os saldos esperados dos caixas fechados + valor do caixa aberto
      const caixaAberto = caixasFormatados.find(c => c.status === 'aberto')
      const saldoCaixasFechados = caixasFechados.reduce((acc, c) => acc + (c.valor_fechamento || c.saldo_esperado), 0)
      const saldoAtual = caixaAberto 
        ? caixaAberto.valor_abertura + totalEntradas - totalSaidas
        : saldoCaixasFechados

      const faturamentos = caixasFechados.map(c => c.total_entradas)
      const mediaFaturamento = faturamentos.length > 0 
        ? faturamentos.reduce((a, b) => a + b, 0) / faturamentos.length 
        : 0

      setResumo({
        saldoAtual,
        totalEntradas,
        totalSaidas,
        totalCaixasFechados: caixasFechados.length,
        mediaFaturamentoDiario: mediaFaturamento,
        maiorFaturamento: Math.max(...faturamentos, 0),
        menorFaturamento: faturamentos.length > 0 ? Math.min(...faturamentos) : 0
      })

    // Verificar se há caixa aberto
      const caixaAbertoEncontrado = caixasData?.find(c => c.status === 'aberto') || null
      setCaixaAberto(caixaAbertoEncontrado as Caixa | null)

    } catch (erro) {
      console.error('Erro ao carregar dados:', erro)
    } finally {
      setCarregando(false)
    }
  }, [periodoFiltro])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Função para registrar ajuste de saldo
  const registrarAjuste = async () => {
    if (!caixaAberto || !valorAjuste || !descricaoAjuste) return

    setProcessandoAjuste(true)
    try {
      // Buscar categoria "Ajuste de Saldo" ou criar uma genérica
      const { data: categorias } = await supabase
        .from('categorias_caixa')
        .select('id')
        .eq('nome', 'Ajuste de Saldo')
        .maybeSingle()

      let categoriaId = categorias?.id

      // Se não existir, buscar "Outros" ou a primeira categoria disponível
      if (!categoriaId) {
        const { data: outrasCategorias } = await supabase
          .from('categorias_caixa')
          .select('id')
          .eq('ativo', true)
          .limit(1)
          .single()
        categoriaId = outrasCategorias?.id
      }

      // Inserir movimentação de ajuste
      const { error } = await supabase.from('movimentacoes_caixa').insert({
        caixa_id: caixaAberto.id,
        categoria_id: categoriaId,
        tipo: tipoAjuste,
        valor: Math.abs(parseFloat(valorAjuste)),
        descricao: `Ajuste de Saldo: ${descricaoAjuste}`,
        forma_pagamento: 'Ajuste'
      })

      if (error) throw error

      // Fechar modal e recarregar dados
      setModalAjuste(false)
      setValorAjuste('')
      setDescricaoAjuste('')
      carregarDados()
    } catch (erro) {
      console.error('Erro ao registrar ajuste:', erro)
    } finally {
      setProcessandoAjuste(false)
    }
  }

  const abrirModalAjuste = (tipo: 'entrada' | 'saida') => {
    setTipoAjuste(tipo)
    setModalAjuste(true)
  }

  // Filtrar movimentações por caixa selecionado e busca
  const movimentacoesFiltradas = movimentacoes.filter(m => {
    const passaCaixa = !caixaSelecionado || m.caixa_id === caixaSelecionado
    const passaBusca = !busca || 
      m.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      m.categoria?.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.funcionario?.nome.toLowerCase().includes(busca.toLowerCase())
    return passaCaixa && passaBusca
  })

  // Agrupar movimentações por data
  const movimentacoesAgrupadas = movimentacoesFiltradas.reduce((acc, mov) => {
    const data = format(parseISO(mov.created_at), 'yyyy-MM-dd')
    if (!acc[data]) {
      acc[data] = []
    }
    acc[data].push(mov)
    return acc
  }, {} as Record<string, Movimentacao[]>)

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  if (carregando) {
    return (
      <ProtectedRoute><AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <RefreshCw className="w-10 h-10 text-amber-600 animate-spin" />
          <p className="text-zinc-600 dark:text-zinc-400">Carregando saldos...</p>
        </div>
      </AdminLayout></ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute><AdminLayout>
      <div className="space-y-6 overflow-x-hidden">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/admin/caixa"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-7 h-7 text-amber-600" />
                Extrato de Saldos
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Visão consolidada de todos os caixas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {caixaAberto && (
              <>
                <button
                  onClick={() => abrirModalAjuste('entrada')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Entrada</span>
                </button>
                <button
                  onClick={() => abrirModalAjuste('saida')}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <Minus className="w-4 h-4" />
                  <span className="hidden sm:inline">Saída</span>
                </button>
              </>
            )}
            <button
              onClick={carregarDados}
              className="p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Aviso se não há caixa aberto */}
        {!caixaAberto && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-amber-700 dark:text-amber-400 text-sm">
              <strong>Atenção:</strong> Não há caixa aberto. Abra um caixa para poder registrar ajustes de saldo.
            </p>
          </div>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Saldo Atual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-2 sm:col-span-1 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-100 text-xs sm:text-sm font-medium">Saldo Atual</span>
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-green-200" />
            </div>
            <p className="text-xl sm:text-2xl font-bold truncate">{formatarMoeda(resumo.saldoAtual)}</p>
            <p className="text-green-200 text-xs mt-1 hidden sm:block">Consolidado</p>
          </motion.div>

          {/* Total Entradas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">Entradas</span>
              <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-600 truncate">{formatarMoeda(resumo.totalEntradas)}</p>
          </motion.div>

          {/* Total Saídas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">Saídas</span>
              <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-red-600 truncate">{formatarMoeda(resumo.totalSaidas)}</p>
          </motion.div>

          {/* Média Diária */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">Média/Dia</span>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-600 truncate">{formatarMoeda(resumo.mediaFaturamentoDiario)}</p>
            <p className="text-zinc-500 text-xs mt-1 hidden sm:block">{resumo.totalCaixasFechados} caixas</p>
          </motion.div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3">
          {/* Período */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 overflow-x-auto">
            {[
              { valor: '7dias', label: '7d' },
              { valor: '30dias', label: '30d' },
              { valor: 'mes', label: 'Mês' },
              { valor: 'todos', label: 'Todos' }
            ].map(({ valor, label }) => (
              <button
                key={valor}
                onClick={() => setPeriodoFiltro(valor as typeof periodoFiltro)}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-1 sm:flex-none ${
                  periodoFiltro === valor
                    ? 'bg-white dark:bg-zinc-700 text-amber-600 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar movimentação..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm
                       border-0 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Lista de Caixas */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Histórico de Caixas
            </h2>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
            {caixas.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                Nenhum caixa encontrado no período selecionado
              </div>
            ) : (
              caixas.map((caixa) => (
                <motion.div
                  key={caixa.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                    caixaSelecionado === caixa.id ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                  }`}
                  onClick={() => setCaixaSelecionado(caixaSelecionado === caixa.id ? null : caixa.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        caixa.status === 'aberto' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}>
                        <Calendar className={`w-5 h-5 ${
                          caixa.status === 'aberto' ? 'text-green-600' : 'text-zinc-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {format(parseISO(caixa.data_abertura), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {caixa.responsavel_abertura} • {caixa.status === 'aberto' ? 'Em aberto' : 'Fechado'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold ${
                        caixa.status === 'aberto' ? 'text-green-600' : 'text-zinc-900 dark:text-white'
                      }`}>
                        {formatarMoeda(caixa.valor_fechamento || caixa.saldo_esperado)}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600">+{formatarMoeda(caixa.total_entradas)}</span>
                        <span className="text-red-600">-{formatarMoeda(caixa.total_saidas)}</span>
                      </div>
                      {caixa.diferenca !== null && caixa.diferenca !== 0 && (
                        <p className={`text-xs ${caixa.diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Diferença: {formatarMoeda(caixa.diferenca)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Extrato de Movimentações */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-600" />
              Extrato Detalhado
              {caixaSelecionado && (
                <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg">
                  Filtrado por caixa
                </span>
              )}
            </h2>
            <span className="text-sm text-zinc-500">
              {movimentacoesFiltradas.length} movimentações
            </span>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {Object.keys(movimentacoesAgrupadas).length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                Nenhuma movimentação encontrada
              </div>
            ) : (
              Object.entries(movimentacoesAgrupadas).map(([data, movs]) => (
                <div key={data}>
                  {/* Cabeçalho da data */}
                  <div className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      {format(parseISO(data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Movimentações do dia */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {movs.map((mov) => (
                      <div key={mov.id} className="p-4 flex items-center gap-4">
                        {/* Ícone */}
                        <div className={`p-2 rounded-xl ${
                          mov.tipo === 'entrada' 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {mov.tipo === 'entrada' ? (
                            <ArrowUpCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>

                        {/* Detalhes */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white truncate">
                            {mov.categoria?.nome || 'Sem categoria'}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {mov.descricao || 'Sem descrição'}
                            {mov.funcionario && ` • ${mov.funcionario.nome}`}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {format(parseISO(mov.created_at), 'HH:mm')}
                            {mov.forma_pagamento && ` • ${mov.forma_pagamento}`}
                          </p>
                        </div>

                        {/* Valor */}
                        <div className="text-right">
                          <p className={`font-bold ${
                            mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {mov.tipo === 'entrada' ? '+' : '-'}{formatarMoeda(mov.valor)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ajuste de Saldo */}
      <AnimatePresence>
        {modalAjuste && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => !processandoAjuste && setModalAjuste(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className={`p-6 border-b border-zinc-200 dark:border-zinc-800 ${
                tipoAjuste === 'entrada' 
                  ? 'bg-green-50 dark:bg-green-950/20' 
                  : 'bg-red-50 dark:bg-red-950/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      tipoAjuste === 'entrada'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {tipoAjuste === 'entrada' ? (
                        <Plus className={`w-6 h-6 text-green-600`} />
                      ) : (
                        <Minus className={`w-6 h-6 text-red-600`} />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                        {tipoAjuste === 'entrada' ? 'Adicionar ao Saldo' : 'Retirar do Saldo'}
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Ajuste manual no caixa atual
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalAjuste(false)}
                    disabled={processandoAjuste}
                    className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorAjuste}
                    onChange={(e) => setValorAjuste(e.target.value)}
                    placeholder="0,00"
                    disabled={processandoAjuste}
                    autoFocus
                    className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 rounded-xl 
                             text-zinc-900 dark:text-white text-lg font-bold
                             focus:ring-2 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed ${
                               tipoAjuste === 'entrada'
                                 ? 'border-green-300 focus:ring-green-500'
                                 : 'border-red-300 focus:ring-red-500'
                             }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Descrição / Motivo *
                  </label>
                  <textarea
                    value={descricaoAjuste}
                    onChange={(e) => setDescricaoAjuste(e.target.value)}
                    placeholder="Ex: Troco inicial, Sangria, Correção de valor..."
                    rows={3}
                    disabled={processandoAjuste}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 
                             dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white resize-none
                             focus:ring-2 focus:ring-amber-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {caixaAberto && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-sm">
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Caixa: <span className="font-medium text-zinc-900 dark:text-white">
                        {format(parseISO(caixaAberto.data_abertura), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      Responsável: <span className="font-medium text-zinc-900 dark:text-white">
                        {caixaAberto.responsavel_abertura}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                <button
                  onClick={() => setModalAjuste(false)}
                  disabled={processandoAjuste}
                  className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 
                           dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-200 
                           dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarAjuste}
                  disabled={!valorAjuste || !descricaoAjuste || processandoAjuste}
                  className={`flex-1 px-4 py-3 text-white rounded-xl font-medium 
                           transition-colors flex items-center justify-center gap-2 
                           disabled:opacity-50 disabled:cursor-not-allowed ${
                             tipoAjuste === 'entrada'
                               ? 'bg-green-600 hover:bg-green-700'
                               : 'bg-red-600 hover:bg-red-700'
                           }`}
                >
                  {processandoAjuste ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {tipoAjuste === 'entrada' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                      {tipoAjuste === 'entrada' ? 'Adicionar' : 'Retirar'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout></ProtectedRoute>
  )
}
