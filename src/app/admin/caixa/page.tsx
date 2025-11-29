'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wallet, Plus, Minus, DollarSign, User, ShoppingCart, Fuel, Megaphone,
  ArrowDownCircle, ArrowUpCircle, MoreHorizontal, RefreshCw, Lock, Unlock,
  TrendingUp, TrendingDown, History, FileText, X, Search, ChevronRight,
  Receipt, Check, Clock, Smartphone, CreditCard, Coins, Wrench, CheckCircle2,
  Download, BarChart3, Truck, Package, Store
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ProtectedRoute from '@/components/admin/ProtectedRoute'
import AdminLayout from '@/components/admin/AdminLayout'
import ModalNotificacao from '@/components/ModalNotificacao'
import { useCaixa } from '@/lib/useCaixa'
import { 
  ModalAbrirCaixa, 
  ModalFecharCaixa, 
  ModalNovaMovimentacao,
  ModalDetalhesCaixa 
} from '@/components/admin/caixa'
import { gerarPdfCaixa } from '@/lib/gerarPdfCaixa'
import type { Caixa } from '@/lib/tipos-caixa'
import Link from 'next/link'

const iconesPorNome: Record<string, React.ComponentType<{ className?: string }>> = {
  'dollar-sign': DollarSign, 'user': User, 'shopping-cart': ShoppingCart,
  'fuel': Fuel, 'megaphone': Megaphone, 'arrow-down-circle': ArrowDownCircle,
  'arrow-up-circle': ArrowUpCircle, 'more-horizontal': MoreHorizontal, 'circle': MoreHorizontal,
  'smartphone': Smartphone, 'credit-card': CreditCard, 'wallet': Wallet,
  'wrench': Wrench, 'coins': Coins, 'trending-up': TrendingUp
}

export default function GestaoCaixaPage() {
  const {
    caixaAtual, movimentacoes, funcionarios, categorias, historicoCaixas,
    pedidosDia, pedidosHoje, totalPedidosHoje, estatisticas, estatisticasPedidos,
    carregando, notificacao, carregarDados, abrirCaixa, fecharCaixa, 
    registrarMovimentacao, excluirMovimentacao, excluirCaixa, sincronizarPedido, 
    sincronizarTodosPedidos, mostrarNotificacao, fecharNotificacao
  } = useCaixa()

  const [abaAtiva, setAbaAtiva] = useState<'pedidos' | 'movimentacoes' | 'historico'>('pedidos')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [busca, setBusca] = useState('')
  
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false)
  const [modalMovimentacao, setModalMovimentacao] = useState(false)
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'entrada' | 'saida'>('entrada')
  const [caixaDetalhes, setCaixaDetalhes] = useState<Caixa | null>(null)

  const movimentacoesFiltradas = movimentacoes.filter(mov => {
    const passaTipo = filtroTipo === 'todos' || mov.tipo === filtroTipo
    const passaBusca = !busca || 
      mov.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      mov.categoria?.nome.toLowerCase().includes(busca.toLowerCase()) ||
      mov.funcionario?.nome.toLowerCase().includes(busca.toLowerCase())
    return passaTipo && passaBusca
  })

  const obterIcone = (nome: string) => iconesPorNome[nome] || MoreHorizontal

  const confirmarExclusaoMovimentacao = (id: string) => {
    mostrarNotificacao('confirmacao', 'Confirmar Exclusão', 
      'Tem certeza que deseja excluir esta movimentação?',
      () => excluirMovimentacao(id)
    )
  }

  const confirmarExclusaoCaixa = (id: string, status: string) => {
    if (status === 'aberto') {
      mostrarNotificacao('aviso', 'Não permitido', 'Não é possível excluir um caixa aberto. Feche-o primeiro.')
      return
    }
    mostrarNotificacao('confirmacao', 'Confirmar Exclusão', 
      'Tem certeza que deseja excluir este caixa e todas as suas movimentações?',
      () => excluirCaixa(id)
    )
  }

  if (carregando) {
    return (
      <ProtectedRoute><AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <RefreshCw className="w-10 h-10 text-amber-600 animate-spin" />
          <p className="text-zinc-600 dark:text-zinc-400">Carregando gestão de caixa...</p>
        </div>
      </AdminLayout></ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute><AdminLayout>
      <div className="space-y-4 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-amber-600 flex-shrink-0" />
              Gestão de Caixa
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
              Controle de entradas e saídas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href="/admin/caixa/relatorios" className="p-2.5 sm:px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </Link>
            {caixaAtual && (
              <button 
                onClick={() => gerarPdfCaixa({ caixa: caixaAtual, movimentacoes, estatisticas })} 
                className="p-2.5 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}
            <button onClick={carregarDados} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            {!caixaAtual ? (
              <button onClick={() => setModalAbrirCaixa(true)} className="px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                <Unlock className="w-4 h-4" />
                <span className="hidden xs:inline">Abrir</span>
              </button>
            ) : (
              <button onClick={() => setModalFecharCaixa(true)} className="px-3 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" />
                <span className="hidden xs:inline">Fechar</span>
              </button>
            )}
          </div>
        </div>

        {/* Status do Caixa */}
        <div className={`p-3 rounded-xl border-2 ${caixaAtual ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {caixaAtual ? <Unlock className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" /> : <Lock className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />}
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${caixaAtual ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {caixaAtual ? 'Caixa Aberto' : 'Caixa Fechado'}
                </p>
                {caixaAtual && (
                  <p className="text-xs text-green-600 dark:text-green-500 truncate">
                    {format(new Date(caixaAtual.data_abertura), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    {caixaAtual.responsavel_abertura && ` • ${caixaAtual.responsavel_abertura}`}
                  </p>
                )}
              </div>
            </div>
            {caixaAtual && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-zinc-500">Inicial</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">R$ {Number(caixaAtual.valor_abertura).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {caixaAtual && (
          <div className="grid grid-cols-2 gap-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs text-zinc-500">Saldo Atual</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">R$ {estatisticas.saldoAtual.toFixed(2)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-zinc-500">Total Entradas</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">R$ {estatisticas.totalEntradas.toFixed(2)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xs text-zinc-500">Total Saídas</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">R$ {estatisticas.totalSaidas.toFixed(2)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-zinc-500">Movimentações</p>
              </div>
              <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{estatisticas.quantidadeMovimentacoes}</p>
            </motion.div>
          </div>
        )}

        {/* Estatísticas por Tipo de Pedido */}
        {caixaAtual && estatisticasPedidos.totalPedidos > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Pedidos do Dia por Tipo
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Entregas */}
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-lg font-bold text-green-600">{estatisticasPedidos.entregas.quantidade}</p>
                <p className="text-[10px] text-zinc-500">Entregas</p>
                <p className="text-xs font-medium text-green-600">R$ {estatisticasPedidos.entregas.total.toFixed(2)}</p>
              </div>

              {/* Retiradas */}
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-lg font-bold text-blue-600">{estatisticasPedidos.retiradas.quantidade}</p>
                <p className="text-[10px] text-zinc-500">Retiradas</p>
                <p className="text-xs font-medium text-blue-600">R$ {estatisticasPedidos.retiradas.total.toFixed(2)}</p>
              </div>

              {/* Local */}
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Store className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-lg font-bold text-purple-600">{estatisticasPedidos.local.quantidade}</p>
                <p className="text-[10px] text-zinc-500">No Local</p>
                <p className="text-xs font-medium text-purple-600">R$ {estatisticasPedidos.local.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Total do dia */}
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Total do dia:</span>
              <span className="font-bold text-amber-600">
                {estatisticasPedidos.totalPedidos} pedidos • R$ {estatisticasPedidos.totalFaturamento.toFixed(2)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Botões de Ação */}
        {caixaAtual && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setTipoMovimentacao('entrada'); setModalMovimentacao(true) }} className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors group">
              <div className="p-1.5 rounded-full bg-green-500 text-white group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-semibold text-green-700 dark:text-green-400 text-sm">Entrada</span>
            </button>
            <button onClick={() => { setTipoMovimentacao('saida'); setModalMovimentacao(true) }} className="flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-xl hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors group">
              <div className="p-1.5 rounded-full bg-red-500 text-white group-hover:scale-110 transition-transform">
                <Minus className="w-4 h-4" />
              </div>
              <span className="font-semibold text-red-700 dark:text-red-400 text-sm">Saída</span>
            </button>
          </div>
        )}

        {/* Abas */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 -mx-1">
          <button onClick={() => setAbaAtiva('pedidos')} className={`flex-1 px-2 py-2.5 font-medium text-xs sm:text-sm transition-colors relative ${abaAtiva === 'pedidos' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
            <span className="flex items-center justify-center gap-1">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
              {pedidosDia.filter(p => !p.sincronizado && p.status === 'entregue').length > 0 && (
                <span className="px-1 py-0.5 text-xs bg-amber-500 text-white rounded-full min-w-[18px]">
                  {pedidosDia.filter(p => !p.sincronizado && p.status === 'entregue').length}
                </span>
              )}
            </span>
            {abaAtiva === 'pedidos' && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />}
          </button>
          <button onClick={() => setAbaAtiva('movimentacoes')} className={`flex-1 px-2 py-2.5 font-medium text-xs sm:text-sm transition-colors relative ${abaAtiva === 'movimentacoes' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
            <span className="flex items-center justify-center gap-1"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Movimentações</span></span>
            {abaAtiva === 'movimentacoes' && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />}
          </button>
          <button onClick={() => setAbaAtiva('historico')} className={`flex-1 px-2 py-2.5 font-medium text-xs sm:text-sm transition-colors relative ${abaAtiva === 'historico' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
            <span className="flex items-center justify-center gap-1"><History className="w-4 h-4" /><span className="hidden sm:inline">Histórico</span></span>
            {abaAtiva === 'historico' && <motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />}
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <AnimatePresence mode="wait">
          {abaAtiva === 'pedidos' ? (
            <motion.div key="pedidos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {!caixaAtual ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
                  <Lock className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">O caixa está fechado</p>
                  <p className="text-sm text-zinc-500">Abra o caixa para ver os pedidos do dia</p>
                </div>
              ) : pedidosDia.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
                  <Receipt className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400">Nenhum pedido desde a abertura do caixa</p>
                </div>
              ) : (
                <>
                  {/* Botão sincronizar todos */}
                  {pedidosDia.filter(p => !p.sincronizado && p.status === 'entregue').length > 0 && (
                    <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-400">
                          {pedidosDia.filter(p => !p.sincronizado && p.status === 'entregue').length} pedido(s) aguardando sincronização
                        </p>
                        <p className="text-sm text-amber-600 dark:text-amber-500">
                          Total: R$ {pedidosDia.filter(p => !p.sincronizado && p.status === 'entregue').reduce((acc, p) => acc + Number(p.total), 0).toFixed(2)}
                        </p>
                      </div>
                      <button 
                        onClick={sincronizarTodosPedidos}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Sincronizar Todos
                      </button>
                    </div>
                  )}

                  {/* Resumo de pedidos por status */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-zinc-600 dark:text-zinc-400">
                        {pedidosDia.filter(p => p.status === 'pendente').length}
                      </p>
                      <p className="text-[10px] text-zinc-500">Pendentes</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {pedidosDia.filter(p => ['confirmado', 'preparando'].includes(p.status)).length}
                      </p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-500">Em preparo</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {pedidosDia.filter(p => p.status === 'pronto').length}
                      </p>
                      <p className="text-[10px] text-blue-700 dark:text-blue-500">Prontos</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {pedidosDia.filter(p => p.status === 'entregue').length}
                      </p>
                      <p className="text-[10px] text-green-700 dark:text-green-500">Entregues</p>
                    </div>
                  </div>
                  <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2 text-center">
                    <p className="text-xs text-amber-600 dark:text-amber-500">Total do Dia</p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      R$ {pedidosDia.reduce((acc, p) => acc + Number(p.total), 0).toFixed(2)}
                    </p>
                  </div>

                  {/* Lista de pedidos */}
                  <div className="space-y-3">
                    {pedidosDia.map((pedido, i) => (
                      <motion.div 
                        key={pedido.id} 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.03 }}
                        className={`bg-white dark:bg-zinc-900 rounded-xl border p-4 transition-all ${
                          pedido.sincronizado 
                            ? 'border-green-200 dark:border-green-800 opacity-75' 
                            : 'border-zinc-200 dark:border-zinc-800 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`p-3 rounded-xl ${
                              pedido.status === 'entregue' ? 'bg-green-100 dark:bg-green-900/30' :
                              pedido.status === 'pronto' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              pedido.status === 'pendente' ? 'bg-zinc-100 dark:bg-zinc-800' :
                              'bg-amber-100 dark:bg-amber-900/30'
                            }`}>
                              {pedido.status === 'entregue' ? (
                                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                              ) : pedido.status === 'pronto' ? (
                                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              ) : pedido.status === 'pendente' ? (
                                <Clock className="w-5 h-5 text-zinc-500" />
                              ) : (
                                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-zinc-900 dark:text-white">{pedido.nome_cliente}</p>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                  pedido.status === 'entregue' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                  pedido.status === 'pronto' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                                  pedido.status === 'pendente' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400' :
                                  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                }`}>
                                  {pedido.status === 'entregue' ? 'Entregue' : 
                                   pedido.status === 'pronto' ? 'Pronto' : 
                                   pedido.status === 'preparando' ? 'Preparando' : 
                                   pedido.status === 'pendente' ? 'Pendente' : 'Confirmado'}
                                </span>
                                {pedido.sincronizado && (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> No caixa
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {pedido.forma_pagamento} • {format(new Date(pedido.created_at), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                              R$ {Number(pedido.total).toFixed(2)}
                            </p>
                            {!pedido.sincronizado && pedido.status === 'entregue' && (
                              <button 
                                onClick={() => sincronizarPedido(pedido.id, Number(pedido.total), pedido.forma_pagamento, pedido.nome_cliente)}
                                className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                                title="Adicionar ao caixa"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          ) : abaAtiva === 'movimentacoes' ? (
            <motion.div key="movimentacoes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Filtros */}
              {caixaAtual && movimentacoes.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input type="text" placeholder="Buscar movimentação..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="flex gap-2">
                    {(['todos', 'entrada', 'saida'] as const).map((tipo) => (
                      <button key={tipo} onClick={() => setFiltroTipo(tipo)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${filtroTipo === tipo ? tipo === 'entrada' ? 'bg-green-600 text-white' : tipo === 'saida' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                        {tipo === 'todos' ? 'Todos' : tipo === 'entrada' ? 'Entradas' : 'Saídas'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Movimentações */}
              {!caixaAtual ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
                  <Lock className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">O caixa está fechado</p>
                  <p className="text-sm text-zinc-500">Abra o caixa para registrar movimentações</p>
                </div>
              ) : movimentacoesFiltradas.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400">{busca || filtroTipo !== 'todos' ? 'Nenhuma movimentação encontrada' : 'Nenhuma movimentação registrada'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {movimentacoesFiltradas.map((mov, i) => {
                    const Icone = mov.categoria ? obterIcone(mov.categoria.icone) : MoreHorizontal
                    return (
                      <motion.div key={mov.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl" style={{ backgroundColor: mov.categoria?.cor ? `${mov.categoria.cor}20` : mov.tipo === 'entrada' ? '#22c55e20' : '#ef444420' }}>
                            <Icone className="w-5 h-5" style={{ color: mov.categoria?.cor || (mov.tipo === 'entrada' ? '#22c55e' : '#ef4444') }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-zinc-900 dark:text-white">{mov.categoria?.nome || (mov.tipo === 'entrada' ? 'Entrada' : 'Saída')}</p>
                              {mov.funcionario && <span className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">{mov.funcionario.nome}</span>}
                            </div>
                            {mov.descricao && <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{mov.descricao}</p>}
                            <p className="text-xs text-zinc-500 mt-1">{format(new Date(mov.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}{mov.forma_pagamento && ` • ${mov.forma_pagamento}`}</p>
                          </div>
                          <p className={`text-lg font-bold whitespace-nowrap ${mov.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {mov.tipo === 'entrada' ? '+' : '-'} R$ {Number(mov.valor).toFixed(2)}
                          </p>
                          <button onClick={() => confirmarExclusaoMovimentacao(mov.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors" title="Excluir">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="historico" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {historicoCaixas.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
                  <History className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400">Nenhum histórico encontrado</p>
                </div>
              ) : (
                historicoCaixas.map((caixa, i) => (
                  <motion.div key={caixa.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setCaixaDetalhes(caixa)}>
                        <div className={`p-3 rounded-xl ${caixa.status === 'aberto' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                          {caixa.status === 'aberto' ? <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" /> : <Lock className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-zinc-900 dark:text-white">{format(new Date(caixa.data_abertura), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${caixa.status === 'aberto' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>{caixa.status === 'aberto' ? 'Aberto' : 'Fechado'}</span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {format(new Date(caixa.data_abertura), "HH:mm")}
                            {caixa.data_fechamento && ` - ${format(new Date(caixa.data_fechamento), "HH:mm")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right cursor-pointer" onClick={() => setCaixaDetalhes(caixa)}>
                          <p className="text-sm text-zinc-500">Saldo Final</p>
                          <p className="text-lg font-bold text-zinc-900 dark:text-white">R$ {(caixa.valor_fechamento ?? caixa.saldo_esperado ?? 0).toFixed(2)}</p>
                          {caixa.diferenca !== null && caixa.diferenca !== 0 && (
                            <p className={`text-xs ${caixa.diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>{caixa.diferenca > 0 ? '+' : ''}{caixa.diferenca.toFixed(2)}</p>
                          )}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); confirmarExclusaoCaixa(caixa.id, caixa.status) }}
                          className={`p-2 rounded-lg transition-colors ${caixa.status === 'aberto' ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'}`}
                          title={caixa.status === 'aberto' ? 'Feche o caixa para excluir' : 'Excluir caixa'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors cursor-pointer" onClick={() => setCaixaDetalhes(caixa)} />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modais */}
      <ModalAbrirCaixa aberto={modalAbrirCaixa} funcionarios={funcionarios} pedidosHoje={pedidosHoje} totalPedidosHoje={totalPedidosHoje} onFechar={() => setModalAbrirCaixa(false)} onConfirmar={abrirCaixa} />
      <ModalFecharCaixa aberto={modalFecharCaixa} caixa={caixaAtual} funcionarios={funcionarios} estatisticas={estatisticas} onFechar={() => setModalFecharCaixa(false)} onConfirmar={fecharCaixa} />
      <ModalNovaMovimentacao aberto={modalMovimentacao} tipo={tipoMovimentacao} funcionarios={funcionarios} categorias={categorias} onFechar={() => setModalMovimentacao(false)} onConfirmar={registrarMovimentacao} />
      <ModalDetalhesCaixa caixa={caixaDetalhes} onFechar={() => setCaixaDetalhes(null)} />
      
      <ModalNotificacao
        aberto={notificacao.aberto}
        tipo={notificacao.tipo}
        titulo={notificacao.titulo}
        mensagem={notificacao.mensagem}
        onFechar={fecharNotificacao}
        onConfirmar={notificacao.onConfirmar}
        textoBotaoConfirmar="Confirmar"
        textoBotaoCancelar="Cancelar"
      />
    </AdminLayout></ProtectedRoute>
  )
}
