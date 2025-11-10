'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Minus, Plus, Send, ShoppingBag } from 'lucide-react'
import Image from 'next/image'
import { useCarrinho } from '@/contexts/CarrinhoContext'
import { supabase } from '@/lib/supabase'
import ModalAlerta from './ModalAlerta'
import SugestaoBebidas from './SugestaoBebidas'

type ModalCarrinhoProps = {
  aberto: boolean
  onFechar: () => void
}

type Alerta = {
  aberto: boolean
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info'
  titulo: string
  mensagem: string
}

export default function ModalCarrinho({ aberto, onFechar }: ModalCarrinhoProps) {
  const { itens, removerItem, atualizarQuantidade, limparCarrinho, total } = useCarrinho()
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'entrega' | 'retirada'>('entrega')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [alerta, setAlerta] = useState<Alerta>({
    aberto: false,
    tipo: 'info',
    titulo: '',
    mensagem: '',
  })
  const [mostrarSugestaoBebida, setMostrarSugestaoBebida] = useState(false)

  const taxaEntrega = tipoEntrega === 'entrega' ? 2.0 : 0
  const totalFinal = total + taxaEntrega

  // Bloqueia scroll do body quando modal está aberto
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = '0px' // Evita shift de layout
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [aberto])

  useEffect(() => {
    if (aberto && itens.length > 0) {
      const temBebida = itens.some(item => item.produto.categoria === 'Bebidas')
      const temComida = itens.some(item => item.produto.categoria !== 'Bebidas')
      
      if (temComida && !temBebida) {
        setMostrarSugestaoBebida(true)
      } else {
        setMostrarSugestaoBebida(false)
      }
    }
  }, [aberto, itens])

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 11) {
      return numeros
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1')
    }
    return telefone
  }

  const mostrarAlerta = (tipo: 'sucesso' | 'erro' | 'aviso' | 'info', titulo: string, mensagem: string) => {
    setAlerta({ aberto: true, tipo, titulo, mensagem })
  }

  const enviarPedido = async () => {
    if (!nomeCliente.trim()) {
      mostrarAlerta('aviso', 'Nome obrigatório', 'Por favor, informe seu nome completo')
      return
    }

    if (tipoEntrega === 'entrega' && !endereco.trim()) {
      mostrarAlerta('aviso', 'Endereço obrigatório', 'Por favor, informe o endereço de entrega')
      return
    }

    if (!formaPagamento) {
      mostrarAlerta('aviso', 'Forma de pagamento', 'Por favor, selecione a forma de pagamento')
      return
    }

    setEnviando(true)

    try {
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          nome_cliente: nomeCliente,
          telefone: telefone,
          endereco: tipoEntrega === 'entrega' ? endereco : null,
          tipo_entrega: tipoEntrega,
          forma_pagamento: formaPagamento,
          subtotal: total,
          taxa_entrega: taxaEntrega,
          total: totalFinal,
          observacoes: observacoes || null,
          status: 'pendente',
        })
        .select()
        .single()

      if (pedidoError) throw pedidoError

      for (const item of itens) {
        const { data: itemPedido, error: itemError } = await supabase
          .from('itens_pedido')
          .insert({
            pedido_id: pedido.id,
            nome_produto: item.produto.nome,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco,
            subtotal: item.subtotal,
            observacoes: item.observacoes || null,
          })
          .select()
          .single()

        if (itemError) throw itemError

        for (const adicional of item.adicionais) {
          await supabase.from('item_adicionais').insert({
            item_pedido_id: itemPedido.id,
            adicional_id: adicional.id,
            nome_adicional: adicional.nome,
            preco: adicional.preco,
          })
        }
      }

      // Gerar mensagem e URL do WhatsApp
      const mensagemWhatsApp = gerarMensagemWhatsApp(pedido.id)
      const numeroWhatsApp = '5586988414326'
      const whatsappUrl = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagemWhatsApp)}`

      // Limpar carrinho e formulário ANTES de abrir WhatsApp
      limparCarrinho()
      setNomeCliente('')
      setTelefone('')
      setEndereco('')
      setTipoEntrega('retirada')
      setFormaPagamento('')
      setObservacoes('')
      
      onFechar()
      
      // Tentar abrir WhatsApp - múltiplas estratégias para garantir abertura
      try {
        // Estratégia 1: Tentar window.open (funciona na maioria dos casos)
        const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
        
        // Estratégia 2: Se bloqueado, usar window.location.href (força abertura)
        if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
          console.log('[WhatsApp] Pop-up bloqueado, usando location.href')
          // Aguardar um pouco para garantir que o pedido foi salvo
          setTimeout(() => {
            window.location.href = whatsappUrl
          }, 100)
        } else {
          console.log('[WhatsApp] Aberto com sucesso via window.open')
        }
      } catch (error) {
        // Estratégia 3: Fallback final - forçar redirecionamento
        console.error('[WhatsApp] Erro ao abrir, usando fallback:', error)
        window.location.href = whatsappUrl
      }
      
      mostrarAlerta('sucesso', 'Pedido enviado!', 'Redirecionando para o WhatsApp...')
    } catch (error) {
      console.error('Erro ao enviar pedido:', error)
      mostrarAlerta('erro', 'Erro ao enviar', 'Não foi possível enviar o pedido. Por favor, tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const gerarMensagemWhatsApp = (pedidoId: string) => {
    let mensagem = `*NOVO PEDIDO - MEU BURGUER*\n\n`
    mensagem += `*Pedido:* #${pedidoId.substring(0, 8)}\n`
    mensagem += `*Nome:* ${nomeCliente}\n`
    if (telefone) mensagem += `*Telefone:* ${telefone}\n`
    mensagem += `*Tipo:* ${tipoEntrega === 'entrega' ? 'Entrega' : 'Retirada'}\n`
    if (tipoEntrega === 'entrega') mensagem += `*Endereço:* ${endereco}\n`
    mensagem += `*Pagamento:* ${formaPagamento}\n\n`

    mensagem += `*ITENS:*\n`
    itens.forEach((item, index) => {
      mensagem += `\n${index + 1}. *${item.produto.nome}* (${item.quantidade}x)\n`
      mensagem += `   R$ ${item.produto.preco.toFixed(2)}\n`
      if (item.adicionais.length > 0) {
        mensagem += `   Adicionais:\n`
        item.adicionais.forEach((ad) => {
          mensagem += `   - ${ad.nome} (+R$ ${ad.preco.toFixed(2)})\n`
        })
      }
      if (item.observacoes) {
        mensagem += `   Obs: ${item.observacoes}\n`
      }
      mensagem += `   Subtotal: R$ ${item.subtotal.toFixed(2)}\n`
    })

    mensagem += `\n*RESUMO:*\n`
    mensagem += `Subtotal: R$ ${total.toFixed(2)}\n`
    if (taxaEntrega > 0) {
      mensagem += `Taxa de Entrega: R$ ${taxaEntrega.toFixed(2)}\n`
    }
    mensagem += `*TOTAL: R$ ${totalFinal.toFixed(2)}*\n`

    if (observacoes) {
      mensagem += `\n*Observações:* ${observacoes}\n`
    }

    return mensagem
  }

  if (!aberto) return null

  return (
    <>
      <ModalAlerta
        aberto={alerta.aberto}
        tipo={alerta.tipo}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        onFechar={() => setAlerta({ ...alerta, aberto: false })}
      />
      <div
        className="modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onFechar()
        }}
      >
      <div className="modal-content max-w-2xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-dourado-600 dark:text-dourado-500" />
            <span className="text-gradient">Seu Carrinho</span>
          </h3>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {itens.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">Seu carrinho está vazio</p>
            </div>
          ) : (
            <>
              <SugestaoBebidas 
                mostrar={mostrarSugestaoBebida} 
                onFechar={() => setMostrarSugestaoBebida(false)}
              />

              <div className="space-y-4 mb-6">
                {itens.map((item) => (
                  <div
                    key={item.id}
                    className="relative bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 
                             rounded-xl p-4 pr-12 sm:pr-16 flex gap-4 items-start
                             border border-gray-200/50 dark:border-gray-700/50
                             hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden 
                                  bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
                                  shadow-inner group">
                      <Image
                        src={item.produto.imagem_url}
                        alt={item.produto.nome}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        sizes="80px"
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                        {item.produto.nome}
                      </h4>
                      {item.adicionais.length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {item.adicionais.map((ad) => ad.nome).join(', ')}
                        </div>
                      )}
                      {item.observacoes && (
                        <div className="text-sm text-gray-500 dark:text-gray-500 italic mb-2">
                          &quot;{item.observacoes}&quot;
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1">
                          <button
                            onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                            className="w-8 h-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold">{item.quantidade}</span>
                          <button
                            onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                            className="w-8 h-8 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-bold text-gradient">
                          R$ {item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => removerItem(item.id)}
                      className="absolute top-3 right-3 text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-transform duration-200 p-2 rounded-full hover:bg-red-50/70 dark:hover:bg-red-500/10 hover:-translate-y-0.5"
                      aria-label="Remover item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={limparCarrinho}
                className="w-full py-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 
                         font-medium text-sm transition-colors mb-6"
              >
                Limpar Carrinho
              </button>

              <div className="space-y-4 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md">
                <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-4">
                  Dados do Pedido
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Seu nome completo"
                    className="input-campo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="input-campo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Entrega *
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTipoEntrega('entrega')}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-300 ${
                        tipoEntrega === 'entrega'
                          ? 'border-dourado-600 bg-dourado-50 dark:bg-dourado-950/20 text-dourado-700 dark:text-dourado-400'
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      Entrega (+R$ 2,00)
                    </button>
                    <button
                      onClick={() => setTipoEntrega('retirada')}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-300 ${
                        tipoEntrega === 'retirada'
                          ? 'border-dourado-600 bg-dourado-50 dark:bg-dourado-950/20 text-dourado-700 dark:text-dourado-400'
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      Retirada
                    </button>
                  </div>
                </div>

                {tipoEntrega === 'entrega' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Endereço de Entrega *
                    </label>
                    <textarea
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Rua, número, bairro, referência..."
                      rows={3}
                      className="input-campo resize-none"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Forma de Pagamento *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['PIX', 'Dinheiro', 'Cartão'].map((forma) => (
                      <button
                        key={forma}
                        onClick={() => setFormaPagamento(forma)}
                        className={`py-3 px-4 rounded-xl border-2 transition-all duration-300 text-sm ${
                          formaPagamento === forma
                            ? 'border-dourado-600 bg-dourado-50 dark:bg-dourado-950/20 text-dourado-700 dark:text-dourado-400'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {forma}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Alguma observação adicional?"
                    rows={2}
                    className="input-campo resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {itens.length > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
              {taxaEntrega > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {taxaEntrega.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-300 dark:border-gray-700">
                <span>Total:</span>
                <span className="text-gradient">R$ {totalFinal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={enviarPedido}
              disabled={enviando}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Pedido via WhatsApp
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

