'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Truck, MapPin, Phone, Clock, CheckCircle2, AlertCircle, 
  Navigation, RefreshCw, Bell, BellOff, User, DollarSign,
  ChevronRight, X, Package, Timer, Bike, Check, Play,
  Menu, Home, History, Settings
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEntregador, type EntregaParaEntregador } from '@/lib/useEntregador'
import { supabase } from '@/lib/supabase'
import type { Funcionario } from '@/lib/tipos-caixa'

type AbaAtiva = 'pendentes' | 'em_rota' | 'concluidas'

export default function PainelEntregadorPage() {
  const [entregadorSelecionado, setEntregadorSelecionado] = useState<string | null>(null)
  const [entregadores, setEntregadores] = useState<Funcionario[]>([])
  const [carregandoEntregadores, setCarregandoEntregadores] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('pendentes')
  const [entregaExpandida, setEntregaExpandida] = useState<string | null>(null)
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false)
  const [processando, setProcessando] = useState<string | null>(null)

  const {
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
    marcarNotificacaoLida
  } = useEntregador(entregadorSelecionado)

  // Carregar lista de entregadores
  useEffect(() => {
    async function carregarEntregadores() {
      try {
        const { data } = await supabase
          .from('funcionarios')
          .select('*')
          .eq('ativo', true)
          .or('cargo.ilike.%entregador%,cargo.ilike.%motoboy%,cargo.ilike.%delivery%')
          .order('nome')

        setEntregadores(data || [])

        // Verificar se há entregador salvo no localStorage
        const salvo = localStorage.getItem('entregador_id')
        if (salvo && data?.find(e => e.id === salvo)) {
          setEntregadorSelecionado(salvo)
        }
      } catch (erro) {
        console.error('Erro ao carregar entregadores:', erro)
      } finally {
        setCarregandoEntregadores(false)
      }
    }

    carregarEntregadores()
  }, [])

  // Salvar entregador selecionado
  const selecionarEntregador = (id: string) => {
    setEntregadorSelecionado(id)
    localStorage.setItem('entregador_id', id)
  }

  // Filtrar entregas por aba
  const entregasFiltradas = useMemo(() => {
    switch (abaAtiva) {
      case 'pendentes':
        return entregas.filter(e => e.status === 'pendente')
      case 'em_rota':
        return entregas.filter(e => e.status === 'em_rota')
      case 'concluidas':
        return entregas.filter(e => e.status === 'entregue')
      default:
        return entregas
    }
  }, [entregas, abaAtiva])

  // Notificações não lidas
  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length

  // Handler para iniciar entrega
  const handleIniciarEntrega = async (entregaId: string) => {
    setProcessando(entregaId)
    const sucesso = await iniciarEntrega(entregaId)
    setProcessando(null)
    if (sucesso) {
      setAbaAtiva('em_rota')
    }
  }

  // Handler para concluir entrega
  const handleConcluirEntrega = async (entregaId: string) => {
    setProcessando(entregaId)
    const sucesso = await concluirEntrega(entregaId)
    setProcessando(null)
    if (sucesso) {
      setEntregaExpandida(null)
    }
  }

  // Abrir navegação
  const abrirNavegacao = (endereco: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`
    window.open(url, '_blank')
  }

  // Ligar para cliente
  const ligarParaCliente = (telefone: string) => {
    window.open(`tel:${telefone}`, '_self')
  }

  // Tela de seleção de entregador
  if (!entregadorSelecionado) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Header */}
        <header className="bg-zinc-900 border-b border-zinc-800 p-4 safe-area-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Meu Burguer</h1>
              <p className="text-xs text-zinc-400">Painel do Entregador</p>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 p-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 mt-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-600/20 flex items-center justify-center">
                <User className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Bem-vindo!</h2>
              <p className="text-zinc-400">Selecione seu perfil para continuar</p>
            </div>

            {carregandoEntregadores ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-green-500 animate-spin" />
              </div>
            ) : entregadores.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400">Nenhum entregador cadastrado</p>
                <p className="text-zinc-500 text-sm mt-1">
                  Cadastre entregadores no painel admin
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {entregadores.map((e) => (
                  <motion.button
                    key={e.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selecionarEntregador(e.id)}
                    className="w-full flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 
                             rounded-xl hover:border-green-600 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                      <Bike className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white">{e.nome}</p>
                      <p className="text-sm text-zinc-400">{e.cargo}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Versão */}
        <footer className="p-4 text-center">
          <p className="text-xs text-zinc-600">Versão 1.0.0</p>
        </footer>
      </div>
    )
  }

  // Tela de carregamento
  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Carregando entregas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 safe-area-top sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">{entregador?.nome || 'Entregador'}</h1>
              <p className="text-xs text-zinc-400">Meu Burguer Entregas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de notificações */}
            <button
              onClick={() => setMostrarNotificacoes(true)}
              className="relative p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <Bell className="w-5 h-5 text-zinc-400" />
              {notificacoesNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs 
                               rounded-full flex items-center justify-center font-bold">
                  {notificacoesNaoLidas}
                </span>
              )}
            </button>

            {/* Botão de atualizar */}
            <button
              onClick={carregarDados}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-zinc-400" />
            </button>

            {/* Trocar entregador */}
            <button
              onClick={() => {
                localStorage.removeItem('entregador_id')
                setEntregadorSelecionado(null)
              }}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <User className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Cards de estatísticas */}
      <div className="p-4 grid grid-cols-4 gap-2">
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <p className="text-2xl font-bold text-amber-500">{estatisticas.pendentes}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Pendentes</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <p className="text-2xl font-bold text-blue-500">{estatisticas.emRota}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Em Rota</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <p className="text-2xl font-bold text-green-500">{estatisticas.concluidas}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Concluídas</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <p className="text-lg font-bold text-green-500">R$ {estatisticas.ganhoHoje.toFixed(0)}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Ganho</p>
        </div>
      </div>

      {/* Botão para ativar notificações */}
      {!notificacoesPermitidas && (
        <div className="px-4 pb-3">
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              const permitido = await verificarPermissaoNotificacao()
              if (permitido) {
                // Feedback visual de sucesso
                alert('✅ Notificações ativadas com sucesso!')
              }
            }}
            className="w-full flex items-center justify-center gap-3 p-4 bg-green-600 hover:bg-green-700 
                     text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-600/20"
          >
            <Bell className="w-5 h-5" />
            <span>Ativar Notificações</span>
          </motion.button>
        </div>
      )}

      {/* Abas */}
      <div className="px-4 flex gap-2">
        {[
          { id: 'pendentes' as AbaAtiva, label: 'Pendentes', count: estatisticas.pendentes, cor: 'amber' },
          { id: 'em_rota' as AbaAtiva, label: 'Em Rota', count: estatisticas.emRota, cor: 'blue' },
          { id: 'concluidas' as AbaAtiva, label: 'Concluídas', count: estatisticas.concluidas, cor: 'green' },
        ].map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-sm transition-all ${
              abaAtiva === aba.id
                ? aba.cor === 'amber' 
                  ? 'bg-amber-600 text-white'
                  : aba.cor === 'blue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-600 text-white'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
            }`}
          >
            {aba.label}
            {aba.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                abaAtiva === aba.id ? 'bg-white/20' : 'bg-zinc-800'
              }`}>
                {aba.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de entregas */}
      <main className="flex-1 p-4 overflow-auto pb-20">
        <AnimatePresence mode="popLayout">
          {entregasFiltradas.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">
                {abaAtiva === 'pendentes' && 'Nenhuma entrega pendente'}
                {abaAtiva === 'em_rota' && 'Nenhuma entrega em rota'}
                {abaAtiva === 'concluidas' && 'Nenhuma entrega concluída hoje'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {entregasFiltradas.map((entrega) => (
                <motion.div
                  key={entrega.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-zinc-900 rounded-xl border overflow-hidden ${
                    entrega.status === 'pendente' 
                      ? 'border-amber-600/50' 
                      : entrega.status === 'em_rota'
                        ? 'border-blue-600/50'
                        : 'border-green-600/50'
                  }`}
                >
                  {/* Cabeçalho do card */}
                  <button
                    onClick={() => setEntregaExpandida(
                      entregaExpandida === entrega.id ? null : entrega.id
                    )}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            entrega.status === 'pendente'
                              ? 'bg-amber-500/20 text-amber-400'
                              : entrega.status === 'em_rota'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-green-500/20 text-green-400'
                          }`}>
                            {entrega.status === 'pendente' && 'Aguardando'}
                            {entrega.status === 'em_rota' && 'Em Rota'}
                            {entrega.status === 'entregue' && 'Entregue'}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {format(new Date(entrega.created_at), 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <p className="font-semibold text-white truncate">
                          {entrega.pedido?.nome_cliente || 'Cliente'}
                        </p>
                        <p className="text-sm text-zinc-400 truncate">
                          {entrega.endereco_entrega || entrega.pedido?.endereco || 'Endereço não informado'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500">
                          R$ {(entrega.pedido?.total || 0).toFixed(2)}
                        </p>
                        {entrega.taxa_entrega > 0 && (
                          <p className="text-xs text-zinc-500">
                            Taxa: R$ {entrega.taxa_entrega.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Detalhes expandidos */}
                  <AnimatePresence>
                    {entregaExpandida === entrega.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-800"
                      >
                        <div className="p-4 space-y-3">
                          {/* Endereço completo */}
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-zinc-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-zinc-300">
                                {entrega.endereco_entrega || entrega.pedido?.endereco || 'Endereço não informado'}
                              </p>
                              {entrega.bairro && (
                                <p className="text-xs text-zinc-500">{entrega.bairro}</p>
                              )}
                            </div>
                          </div>

                          {/* Telefone */}
                          {entrega.pedido?.telefone && (
                            <div className="flex items-center gap-3">
                              <Phone className="w-5 h-5 text-zinc-500" />
                              <p className="text-sm text-zinc-300">{entrega.pedido.telefone}</p>
                            </div>
                          )}

                          {/* Forma de pagamento */}
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-zinc-500" />
                            <p className="text-sm text-zinc-300">
                              {entrega.pedido?.forma_pagamento || 'Não informado'}
                            </p>
                          </div>

                          {/* Observações */}
                          {(entrega.observacoes || entrega.pedido?.observacoes) && (
                            <div className="p-3 bg-zinc-800 rounded-lg">
                              <p className="text-xs text-zinc-400 mb-1">Observações:</p>
                              <p className="text-sm text-zinc-300">
                                {entrega.observacoes || entrega.pedido?.observacoes}
                              </p>
                            </div>
                          )}

                          {/* Tempo */}
                          {entrega.status === 'em_rota' && entrega.data_saida && (
                            <div className="flex items-center gap-3">
                              <Timer className="w-5 h-5 text-zinc-500" />
                              <p className="text-sm text-zinc-300">
                                Saiu às {format(new Date(entrega.data_saida), 'HH:mm')}
                              </p>
                            </div>
                          )}

                          {/* Botões de ação */}
                          <div className="flex gap-2 pt-2">
                            {/* Botão de navegação */}
                            <button
                              onClick={() => abrirNavegacao(
                                entrega.endereco_entrega || entrega.pedido?.endereco || ''
                              )}
                              className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 
                                       hover:bg-zinc-700 rounded-xl transition-colors"
                            >
                              <Navigation className="w-5 h-5 text-blue-400" />
                              <span className="text-sm font-medium text-white">Navegar</span>
                            </button>

                            {/* Botão de ligar */}
                            {entrega.pedido?.telefone && (
                              <button
                                onClick={() => ligarParaCliente(entrega.pedido!.telefone!)}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 
                                         hover:bg-zinc-700 rounded-xl transition-colors"
                              >
                                <Phone className="w-5 h-5 text-green-400" />
                                <span className="text-sm font-medium text-white">Ligar</span>
                              </button>
                            )}
                          </div>

                          {/* Botão principal de ação */}
                          {entrega.status === 'pendente' && (
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleIniciarEntrega(entrega.id)}
                              disabled={processando === entrega.id}
                              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 
                                       hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
                            >
                              {processando === entrega.id ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                <>
                                  <Play className="w-5 h-5" />
                                  <span className="font-semibold">Iniciar Entrega</span>
                                </>
                              )}
                            </motion.button>
                          )}

                          {entrega.status === 'em_rota' && (
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleConcluirEntrega(entrega.id)}
                              disabled={processando === entrega.id}
                              className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 
                                       hover:bg-green-700 disabled:opacity-50 rounded-xl transition-colors"
                            >
                              {processando === entrega.id ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-5 h-5" />
                                  <span className="font-semibold">Confirmar Entrega</span>
                                </>
                              )}
                            </motion.button>
                          )}

                          {entrega.status === 'entregue' && entrega.tempo_real && (
                            <div className="text-center py-2">
                              <p className="text-sm text-zinc-400">
                                Entregue em <span className="text-green-400 font-medium">
                                  {entrega.tempo_real} minutos
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal de notificações */}
      <AnimatePresence>
        {mostrarNotificacoes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setMostrarNotificacoes(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[80vh] bg-zinc-900 rounded-t-3xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Notificações</h2>
                <button
                  onClick={() => setMostrarNotificacoes(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="overflow-auto max-h-[60vh]">
                {notificacoes.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {notificacoes.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => marcarNotificacaoLida(notif.id)}
                        className={`w-full p-4 text-left transition-colors ${
                          notif.lida ? 'bg-zinc-900' : 'bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            notif.tipo === 'nova_entrega' 
                              ? 'bg-green-500/20' 
                              : notif.tipo === 'cancelamento'
                                ? 'bg-red-500/20'
                                : 'bg-blue-500/20'
                          }`}>
                            {notif.tipo === 'nova_entrega' && <Truck className="w-5 h-5 text-green-500" />}
                            {notif.tipo === 'cancelamento' && <X className="w-5 h-5 text-red-500" />}
                            {notif.tipo === 'info' && <Bell className="w-5 h-5 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white">{notif.titulo}</p>
                            <p className="text-sm text-zinc-400 truncate">{notif.mensagem}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                              {format(notif.timestamp, 'HH:mm', { locale: ptBR })}
                            </p>
                          </div>
                          {!notif.lida && (
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
